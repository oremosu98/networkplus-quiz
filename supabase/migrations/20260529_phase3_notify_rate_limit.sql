-- ══════════════════════════════════════════════════════════════════════════
-- Security Phase 3 · notify-me waitlist rate limit (v5.x · 2026-05-29)
-- ══════════════════════════════════════════════════════════════════════════
-- Closes M3(a) from SECURITY-AUDIT-2026-05-29.md.
--
--   M3 · landing/api/notify.js (the "Notify me" waitlist endpoint) had open
--        CORS `*` AND no rate limit, so anyone could spam-insert notify_signups
--        rows from any origin. This migration backs the per-IP-hash rate limit;
--        the CORS tightening + the RPC call ship in the SAME PR (landing/api/
--        notify.js). Migration and code MUST deploy together — the endpoint
--        fails OPEN (allows the signup) if this RPC is missing, so applying the
--        migration first is safe, and shipping the code first just means the
--        limit isn't enforced until the RPC exists.
--
-- Pattern: mirrors diagnostic_signup_rate_limit + diag_signup_check_and_increment
-- (20260511_diagnostic_pending.sql) — the closest analog (single p_ip_hash arg,
-- short rolling window). Cap chosen at 10/hour/IP-hash (vs diag_signup's 5/hour):
-- notify is LESS sensitive than the magic-link endpoint (no email is sent unless
-- Resend is configured — it's just a waitlist row), and the multi-cert tile UX
-- legitimately produces a handful of POSTs in one browsing session. 10/hour
-- leaves genuine enthusiasts unblocked while capping a single IP-hash to ~240
-- rows/day. The unique (email, cert) constraint already forces a spammer to vary
-- the email per row, so the per-IP-hash cap is the binding spam ceiling.
--
-- IP hashes are SHA-256 truncated to 16 hex chars · raw IP never stored. Rows
-- auto-age via the cleanup helper below.
--
-- How to apply: Supabase Dashboard → SQL Editor → paste WHOLE file → Run.
-- Idempotent (IF NOT EXISTS / OR REPLACE / DROP-then-CREATE). Run once per env.
-- NOTE: uses uniquely-named dollar-quote tags ($pf$ / $rl$ / $purge$) instead of
-- bare $$ so a partial/truncated paste fails loudly rather than mis-pairing.
-- ══════════════════════════════════════════════════════════════════════════

-- Preflight guards — fail loud if a prerequisite migration hasn't been applied.
do $pf$
begin
  if not exists (select 1 from pg_class where relname = 'notify_signups') then
    raise exception 'notify_signups not found — apply 20260509_notify_signups.sql first.';
  end if;
  if not exists (select 1 from pg_proc where proname = 'is_admin') then
    raise exception 'is_admin() not found — apply 20260506_phase_c_prime.sql first.';
  end if;
end
$pf$;

-- ── 1. notify_rate_limit table ────────────────────────────────────────────
-- Separate counter from D.3's diagnostic_rate_limit and D.5's
-- diagnostic_signup_rate_limit. Gates anonymous /api/notify POSTs per IP-hash.
create table if not exists notify_rate_limit (
  ip_hash      text primary key,
  call_count   int not null default 0,
  first_at     timestamptz not null default now(),
  last_at      timestamptz not null default now(),
  blocked_at   timestamptz                            -- set when an IP trips the per-window cap
);

create index if not exists idx_notify_rl_last_at
  on notify_rate_limit (last_at);

comment on table notify_rate_limit is
  'Notify-me waitlist (/api/notify) rate limiting · per-IP-hash · 10 calls / 1h rolling window. IP hash is SHA-256 truncated to 16 chars · raw IP never stored. Security Phase 3 (M3).';

-- ── 2. RLS · service-role-only writes; admin can read for monitoring ───────
alter table notify_rate_limit enable row level security;

drop policy if exists "notify_rl_admin_select" on notify_rate_limit;
create policy "notify_rl_admin_select" on notify_rate_limit
  for select using (public.is_admin());

-- No insert/update/delete policies for clients — the serverless endpoint calls
-- the SECURITY DEFINER RPC below (via the service-role key), bypassing RLS.

-- ── 3. notify_rl_check_and_increment(ip_hash) ─────────────────────────────
-- Atomic check + upsert. 10 notify-me POSTs per IP-hash per 1h rolling window.
-- Mirrors diag_signup_check_and_increment (same shape + locking) with a higher
-- cap (see header rationale). Returns (allowed, current_count, hourly_limit,
-- resets_at) so the endpoint can surface them in the 429 body.
create or replace function notify_rl_check_and_increment(
  p_ip_hash text
)
returns table(
  allowed boolean,
  current_count int,
  hourly_limit int,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $rl$
declare
  v_count int;
  v_first_at timestamptz;
  v_limit constant int := 10;
  v_window constant interval := interval '1 hour';
begin
  -- Lock the row for the duration of the check + update
  select call_count, first_at
    into v_count, v_first_at
    from notify_rate_limit
    where ip_hash = p_ip_hash
    for update;

  -- Fresh IP (or row never seen): insert + allow
  if v_count is null then
    insert into notify_rate_limit (ip_hash, call_count, first_at, last_at)
      values (p_ip_hash, 1, now(), now());
    return query select true, 1, v_limit, now() + v_window;
    return;
  end if;

  -- Window expired · reset counter
  if (now() - v_first_at) > v_window then
    update notify_rate_limit
      set call_count = 1, first_at = now(), last_at = now(), blocked_at = null
      where ip_hash = p_ip_hash;
    return query select true, 1, v_limit, now() + v_window;
    return;
  end if;

  -- Within window · cap exceeded
  if (v_count + 1) > v_limit then
    update notify_rate_limit
      set last_at = now(), blocked_at = coalesce(blocked_at, now())
      where ip_hash = p_ip_hash;
    return query select false, v_count, v_limit, v_first_at + v_window;
    return;
  end if;

  -- Within window + under cap · increment
  update notify_rate_limit
    set call_count = call_count + 1, last_at = now()
    where ip_hash = p_ip_hash;
  return query select true, v_count + 1, v_limit, v_first_at + v_window;
end
$rl$;

comment on function notify_rl_check_and_increment is
  'Atomic check + increment for the notify-me waitlist rate limit. 10/hour/IP-hash. Returns (allowed, current_count, hourly_limit, resets_at). Service-role only — clients should never call this directly. Security Phase 3 (M3).';

-- ── 4. Cleanup helper · purges rows older than 7 days ──────────────────────
-- Can be wired to pg_cron later. For now, runnable manually:
--   select notify_rl_purge_old();
create or replace function notify_rl_purge_old()
returns int
language plpgsql
security definer
set search_path = public
as $purge$
declare
  v_deleted int;
begin
  delete from notify_rate_limit
    where last_at < (now() - interval '7 days');
  get diagnostics v_deleted = row_count;
  return v_deleted;
end
$purge$;

comment on function notify_rl_purge_old is
  'Deletes notify_rate_limit rows whose last_at is more than 7 days old. Safe to run via cron.';

-- ══════════════════════════════════════════════════════════════════════════
-- Verify (run manually as the relevant role)
-- ══════════════════════════════════════════════════════════════════════════
-- select notify_rl_check_and_increment('test-hash-001'::text);
--   → (true, 1, 10, now() + 1h)
-- repeat 10× quickly:
--   → after 10th call: (true, 10, 10, ...) → 11th: (false, 10, 10, ...)
-- select * from notify_rate_limit limit 1;   -- as admin → 1 row; as anon → []
-- select notify_rl_purge_old();              -- as admin → returns 0 fresh

-- ══════════════════════════════════════════════════════════════════════════
-- ROLLBACK  (backout plan — change-management discipline · v5.x Phase 3)
-- ══════════════════════════════════════════════════════════════════════════
-- Forward-only in prod. This block is the documented MANUAL reversal, tested on
-- live before merge. To revert, run the following in Supabase Dashboard → SQL
-- Editor (production), in this order. NOTE: only roll this back together with
-- reverting landing/api/notify.js to the no-rate-limit version — the endpoint
-- fails OPEN, so dropping the RPC alone just disables enforcement (signups still
-- succeed), but leaving the endpoint calling a missing RPC means every POST logs
-- a fail-open warning.
--
--   drop function if exists notify_rl_purge_old();
--   drop function if exists notify_rl_check_and_increment(text);
--   drop policy if exists "notify_rl_admin_select" on notify_rate_limit;
--   drop table if exists notify_rate_limit;
--
-- No data migration needed — notify_rate_limit holds only ephemeral counters
-- (no signup data; that lives in notify_signups and is untouched here).
-- ══════════════════════════════════════════════════════════════════════════
