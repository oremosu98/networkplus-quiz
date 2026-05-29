-- ══════════════════════════════════════════════════════════════════════════
-- Security Phase 1 · AI-proxy abuse rate-limit (2026-05-29)
-- ══════════════════════════════════════════════════════════════════════════
-- Hard server-side ceilings for /api/ai/generate so a signed-in user cannot
-- use the proxy as an uncapped Claude relay on the billing key (audit C1/H1).
--
-- Keyed by an opaque `key`:
--   user:<auth.uid>        — per-user daily ceiling (500/day)
--   ip:<sha256-16>         — per-IP hourly ceiling (200/hour); raw IP NEVER stored
--   global:daily           — global daily kill-switch (bounds worst-case spend)
--
-- These are ABUSE ceilings, separate from the product free-tier 20/day question
-- quota (consume_daily_quota). No legit studier approaches them; a scripted
-- attacker does thousands → stopped cold.
--
-- Run once in Supabase Dashboard → SQL Editor. Idempotent (IF NOT EXISTS / OR REPLACE).
-- Mirrors the proven 20260511_diagnostic_rate_limit.sql pattern, generalised so
-- one RPC serves per-user, per-IP, and global windows via parameters.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. ai_proxy_rate_limit table ──────────────────────────────────────────
create table if not exists ai_proxy_rate_limit (
  key           text primary key,                      -- 'user:<uid>' | 'ip:<hash>' | 'global:daily'
  call_count    int not null default 0,
  window_start  timestamptz not null default now(),
  last_at       timestamptz not null default now(),
  blocked_at    timestamptz                            -- set when this key first trips its cap in-window
);

create index if not exists idx_ai_rl_last_at
  on ai_proxy_rate_limit (last_at);

comment on table ai_proxy_rate_limit is
  'AI-proxy abuse rate limiting · keyed by user:/ip:/global: · raw IP never stored (SHA-256 truncated). Separate from the product 20/day question quota.';

-- ── 2. is_admin() guard (from Phase C′) ───────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'is_admin') then
    raise exception 'is_admin() not found — apply 20260506_phase_c_prime.sql first.';
  end if;
end$$;

-- ── 3. RLS · admin-only read; writes only via the SECURITY DEFINER fn ──────
alter table ai_proxy_rate_limit enable row level security;

drop policy if exists "ai_rl_admin_select" on ai_proxy_rate_limit;
create policy "ai_rl_admin_select" on ai_proxy_rate_limit
  for select using (public.is_admin());

-- No insert/update/delete policies for clients — the DEFINER fn below does all writes.

-- ── 4. ai_rl_check_and_increment(key, limit, window, increment) ────────────
-- Atomic check + upsert. Parameterised limit/window so ONE function serves the
-- per-user (500/1 day), per-IP (200/1 hour), and global (.../1 day) checks.
-- Returns (allowed, current_count, resets_at) for the caller's 429 response.
create or replace function ai_rl_check_and_increment(
  p_key       text,
  p_limit     int,
  p_window    interval,
  p_increment int default 1
)
returns table(
  allowed       boolean,
  current_count int,
  resets_at     timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_start timestamptz;
begin
  -- Lock the row for the check + update
  select call_count, window_start
    into v_count, v_start
    from ai_proxy_rate_limit
    where key = p_key
    for update;

  -- Fresh key: insert + allow
  if v_count is null then
    insert into ai_proxy_rate_limit (key, call_count, window_start, last_at)
      values (p_key, p_increment, now(), now());
    return query select true, p_increment, now() + p_window;
    return;
  end if;

  -- Window expired: reset counter
  if (now() - v_start) > p_window then
    update ai_proxy_rate_limit
      set call_count = p_increment, window_start = now(), last_at = now(), blocked_at = null
      where key = p_key;
    return query select true, p_increment, now() + p_window;
    return;
  end if;

  -- Within window, over cap: deny
  if (v_count + p_increment) > p_limit then
    update ai_proxy_rate_limit
      set last_at = now(), blocked_at = coalesce(blocked_at, now())
      where key = p_key;
    return query select false, v_count, v_start + p_window;
    return;
  end if;

  -- Within window, under cap: increment + allow
  update ai_proxy_rate_limit
    set call_count = call_count + p_increment, last_at = now()
    where key = p_key;
  return query select true, v_count + p_increment, v_start + p_window;
end;
$$;

comment on function ai_rl_check_and_increment is
  'Atomic check + increment for AI-proxy abuse limits. Returns (allowed, current_count, resets_at). Called by /api/ai/generate as the authenticated user (anon key + JWT).';

-- The proxy verifies the user JWT first, then calls this as the authenticated
-- role (anon key + bearer token), so EXECUTE must be granted to authenticated.
grant execute on function ai_rl_check_and_increment(text, int, interval, int) to authenticated;

-- ── 5. Cleanup helper · purges rows older than 7 days ──────────────────────
create or replace function ai_rl_purge_old()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from ai_proxy_rate_limit
    where last_at < (now() - interval '7 days');
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function ai_rl_purge_old is
  'Deletes ai_proxy_rate_limit rows whose last_at is more than 7 days old. Safe to run via cron.';

-- ══════════════════════════════════════════════════════════════════════════
-- ROLLBACK:
--   drop function if exists ai_rl_purge_old();
--   drop function if exists ai_rl_check_and_increment(text, int, interval, int);
--   drop policy if exists "ai_rl_admin_select" on ai_proxy_rate_limit;
--   drop table if exists ai_proxy_rate_limit cascade;
-- ══════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- Verify
-- ══════════════════════════════════════════════════════════════════════════
-- select ai_rl_check_and_increment('user:test-001', 500, interval '1 day');
--   → (true, 1, now()+1d)
-- select ai_rl_check_and_increment('ip:abcd', 200, interval '1 hour');
--   → (true, 1, now()+1h)
-- select * from ai_proxy_rate_limit;   -- as admin
-- select ai_rl_purge_old();            -- as admin → 0 fresh
