-- ══════════════════════════════════════════════════════════════════════════
-- D.3 · Anonymous diagnostic rate-limit schema (v4.99.54, 2026-05-11)
-- ══════════════════════════════════════════════════════════════════════════
-- Tracks anonymous /api/diagnostic/generate calls per IP-hash so a single
-- IP can't burn unlimited Anthropic credits. 25 calls per 24-hour rolling
-- window (one diagnostic ≈ 20-25 Q · keeps cost ceiling ~$0.10-0.25/IP/day).
--
-- IP hashes are SHA-256 truncated to 16 chars (32-bit collision rate; fine
-- at our scale). We never store the raw IP — only the hash. Rows auto-age
-- out after 7 days via the cleanup helper below.
--
-- Run once in Supabase Dashboard → SQL Editor.
-- Idempotent — uses IF NOT EXISTS + OR REPLACE.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. diagnostic_rate_limit table ────────────────────────────────────────
create table if not exists diagnostic_rate_limit (
  ip_hash         text primary key,
  cert            text,
  call_count      int not null default 0,
  first_at        timestamptz not null default now(),
  last_at         timestamptz not null default now(),
  blocked_at      timestamptz                            -- set when an IP triggers the per-window cap
);

create index if not exists idx_diag_rl_last_at
  on diagnostic_rate_limit (last_at);

comment on table diagnostic_rate_limit is
  'Anonymous /api/diagnostic/generate rate limiting · per-IP-hash · 25 calls / 24h rolling window. IP hash is SHA-256 truncated to 16 chars · raw IP never stored.';

-- ── 2. is_admin() · already exists (from Phase C′) — verifying it ─────────
-- The 20260506_phase_c_prime.sql migration created is_admin(). Re-running
-- this migration AFTER that one is safe. If is_admin() is missing here, we
-- error loudly — that means Phase C′ hasn't been applied yet.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'is_admin') then
    raise exception 'is_admin() not found — apply 20260506_phase_c_prime.sql first.';
  end if;
end$$;

-- ── 3. RLS · service-role-only writes; admin can read for monitoring ─────
alter table diagnostic_rate_limit enable row level security;

drop policy if exists "diag_rl_admin_select" on diagnostic_rate_limit;
create policy "diag_rl_admin_select" on diagnostic_rate_limit
  for select using (public.is_admin());

-- No insert/update/delete policies for clients — the serverless endpoint
-- uses the service-role key to write directly, bypassing RLS.

-- ── 4. diag_rl_check_and_increment(ip_hash, cert, increment) ─────────────
-- Atomic check + upsert. Returns whether the call is allowed plus the
-- current counter and the daily limit so the endpoint can include them in
-- the 429 response body.
create or replace function diag_rl_check_and_increment(
  p_ip_hash text,
  p_cert text,
  p_increment int default 1
)
returns table(
  allowed boolean,
  current_count int,
  daily_limit int,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_first_at timestamptz;
  v_limit constant int := 25;
  v_window constant interval := interval '24 hours';
begin
  -- Lock the row for the duration of the check + update
  select call_count, first_at
    into v_count, v_first_at
    from diagnostic_rate_limit
    where ip_hash = p_ip_hash
    for update;

  -- Fresh IP (or row never seen): insert + allow
  if v_count is null then
    insert into diagnostic_rate_limit (ip_hash, cert, call_count, first_at, last_at)
      values (p_ip_hash, p_cert, p_increment, now(), now());
    return query select true, p_increment, v_limit, now() + v_window;
    return;
  end if;

  -- Window expired · reset counter
  if (now() - v_first_at) > v_window then
    update diagnostic_rate_limit
      set call_count = p_increment, cert = p_cert, first_at = now(), last_at = now(), blocked_at = null
      where ip_hash = p_ip_hash;
    return query select true, p_increment, v_limit, now() + v_window;
    return;
  end if;

  -- Within window · check cap
  if (v_count + p_increment) > v_limit then
    update diagnostic_rate_limit
      set last_at = now(), blocked_at = coalesce(blocked_at, now())
      where ip_hash = p_ip_hash;
    return query select false, v_count, v_limit, v_first_at + v_window;
    return;
  end if;

  -- Within window + under cap · increment
  update diagnostic_rate_limit
    set call_count = call_count + p_increment, last_at = now()
    where ip_hash = p_ip_hash;
  return query select true, v_count + p_increment, v_limit, v_first_at + v_window;
end;
$$;

comment on function diag_rl_check_and_increment is
  'Atomic check + increment for anonymous diagnostic rate limit. Returns (allowed, current_count, daily_limit, resets_at). Service-role only — clients should never call this directly.';

-- ── 5. Cleanup helper · purges rows older than 7 days ────────────────────
-- Can be wired to pg_cron later. For now, runnable manually:
--   select diag_rl_purge_old();
create or replace function diag_rl_purge_old()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from diagnostic_rate_limit
    where last_at < (now() - interval '7 days')
    returning 1 into v_deleted;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function diag_rl_purge_old is
  'Deletes diagnostic_rate_limit rows whose last_at is more than 7 days old. Safe to run via cron.';

-- ══════════════════════════════════════════════════════════════════════════
-- Verify
-- ══════════════════════════════════════════════════════════════════════════
-- select diag_rl_check_and_increment('test-hash-001', 'network-plus', 1);
--   → (true, 1, 25, now() + 24h)
-- repeat 25× quickly:
--   → after 25th call: (true, 25, 25, ...) → 26th: (false, 25, 25, ...)
-- select * from diagnostic_rate_limit limit 1;   -- as admin
-- select diag_rl_purge_old();                    -- as admin → returns 0 fresh
