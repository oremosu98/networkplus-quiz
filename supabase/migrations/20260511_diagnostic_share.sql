-- ══════════════════════════════════════════════════════════════════════════
-- D.6 · Anonymous diagnostic share + email schema (v4.99.57, 2026-05-11)
-- ══════════════════════════════════════════════════════════════════════════
-- Two purposes:
--   1. Public shareable URLs · /r/{token} renders an anon's diagnostic
--      results page from a token. Token is the access gate — knowing it
--      lets you view; not knowing it = 404. 90-day expiry on share rows.
--   2. Email score reports · 10/hour/IP-hash rate limit shared between
--      share creation + email-report sends (distinct from D.3 quiz quota
--      [25/24h] + D.5 signup quota [5/hour]).
--
-- Three RPCs:
--   - diag_email_check_and_increment(ip_hash)
--   - increment_share_view(token)  — bumps view_count + last_viewed_at
--   - diag_share_purge_old()       — cleanup helper
--
-- Run once in Supabase Dashboard → SQL Editor.
-- Idempotent — IF NOT EXISTS + OR REPLACE.
-- ══════════════════════════════════════════════════════════════════════════

-- is_admin() preflight guard
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'is_admin') then
    raise exception 'is_admin() not found — apply 20260506_phase_c_prime.sql first.';
  end if;
end$$;

-- ── 1. diagnostic_share table ────────────────────────────────────────────
-- Tokens are 32+ hex chars (16 random bytes from WebCrypto in the edge
-- endpoint). Anyone holding a token can view; the URL IS the access
-- credential. We track view_count for "how viral is this share?" telemetry
-- but DO NOT include the email anywhere — fully anonymous public read.
create table if not exists diagnostic_share (
  token            text primary key,
  cert             text not null,
  results          jsonb not null,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '90 days'),
  view_count       int not null default 0,
  last_viewed_at   timestamptz
);

create index if not exists idx_diag_share_expires_at
  on diagnostic_share (expires_at);
create index if not exists idx_diag_share_created_at
  on diagnostic_share (created_at);

comment on table diagnostic_share is
  'Anonymous diagnostic results pinned to a public URL via /r/{token}. 90-day expiry. View count tracked for telemetry but no PII (no email).';

-- ── 2. diagnostic_email_rate_limit table ─────────────────────────────────
-- 10 calls/IP-hash/1h. Separate counter from D.3 (25/24h quiz Q gen) and
-- D.5 (5/hour magic-link signup). Shared between /api/diagnostic/share
-- + /api/diagnostic/email-report — both are anon write-paths that need
-- IP-level abuse control.
create table if not exists diagnostic_email_rate_limit (
  ip_hash      text primary key,
  call_count   int not null default 0,
  first_at     timestamptz not null default now(),
  last_at      timestamptz not null default now(),
  blocked_at   timestamptz
);

create index if not exists idx_diag_email_rl_last_at
  on diagnostic_email_rate_limit (last_at);

comment on table diagnostic_email_rate_limit is
  'Anon share-create + email-report rate limit · per IP-hash · 10/1h. Distinct from D.3 quiz + D.5 signup counters.';

-- ── 3. RLS ───────────────────────────────────────────────────────────────
alter table diagnostic_share enable row level security;
alter table diagnostic_email_rate_limit enable row level security;

-- diagnostic_share: public SELECT — anyone with a valid token can read.
-- Token uniqueness + entropy is the access gate, not the SELECT policy.
-- INSERT happens via service-role from the endpoint.
drop policy if exists "diag_share_public_select" on diagnostic_share;
create policy "diag_share_public_select" on diagnostic_share
  for select using (true);

drop policy if exists "diag_email_rl_admin_select" on diagnostic_email_rate_limit;
create policy "diag_email_rl_admin_select" on diagnostic_email_rate_limit
  for select using (public.is_admin());

-- ── 4. diag_email_check_and_increment(ip_hash) ───────────────────────────
-- 10 calls/IP-hash/1h. Same atomic pattern as D.3 + D.5.
create or replace function diag_email_check_and_increment(p_ip_hash text)
returns table(
  allowed boolean,
  current_count int,
  hourly_limit int,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_first_at timestamptz;
  v_limit constant int := 10;
  v_window constant interval := interval '1 hour';
begin
  select call_count, first_at
    into v_count, v_first_at
    from diagnostic_email_rate_limit
    where ip_hash = p_ip_hash
    for update;

  if v_count is null then
    insert into diagnostic_email_rate_limit (ip_hash, call_count, first_at, last_at)
      values (p_ip_hash, 1, now(), now());
    return query select true, 1, v_limit, now() + v_window;
    return;
  end if;

  if (now() - v_first_at) > v_window then
    update diagnostic_email_rate_limit
      set call_count = 1, first_at = now(), last_at = now(), blocked_at = null
      where ip_hash = p_ip_hash;
    return query select true, 1, v_limit, now() + v_window;
    return;
  end if;

  if (v_count + 1) > v_limit then
    update diagnostic_email_rate_limit
      set last_at = now(), blocked_at = coalesce(blocked_at, now())
      where ip_hash = p_ip_hash;
    return query select false, v_count, v_limit, v_first_at + v_window;
    return;
  end if;

  update diagnostic_email_rate_limit
    set call_count = call_count + 1, last_at = now()
    where ip_hash = p_ip_hash;
  return query select true, v_count + 1, v_limit, v_first_at + v_window;
end;
$$;

comment on function diag_email_check_and_increment is
  'Atomic check + increment for anon share-create + email-report rate limit. 10/hour/IP-hash. Service-role only.';

-- ── 5. increment_share_view(p_token) ─────────────────────────────────────
-- Anon viewers fire this on /r/{token} page load to bump the view_count
-- + last_viewed_at. SECURITY DEFINER lets it UPDATE despite no public
-- update policy on diagnostic_share.
create or replace function increment_share_view(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or length(p_token) < 16 then
    return;  -- silent no-op on bogus tokens (would be a bot probing)
  end if;
  update diagnostic_share
    set view_count = view_count + 1,
        last_viewed_at = now()
    where token = p_token
      and expires_at > now();  -- expired shares don't accrue views
end;
$$;

comment on function increment_share_view is
  'Bumps view_count on diagnostic_share for the given token. Anon-callable. Silent on expired/missing.';

-- Grant execute to anon — needed for the /r/{token} viewer to fire this
-- without authentication.
grant execute on function increment_share_view(text) to anon, authenticated;

-- ── 6. Cleanup helper · purges expired share rows ────────────────────────
create or replace function diag_share_purge_old()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from diagnostic_share
    where expires_at < now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function diag_share_purge_old is
  'Deletes diagnostic_share rows past their expires_at (default 90 days from creation).';

-- ══════════════════════════════════════════════════════════════════════════
-- Verify
-- ══════════════════════════════════════════════════════════════════════════
-- (as service role / admin):
-- select diag_email_check_and_increment('test-hash-001');
--   → (true, 1, 10, now() + 1h)
-- (as anon):
-- insert into diagnostic_share (token, cert, results) values ('test-token-1234567890', 'network-plus', '{}'::jsonb);  -- BLOCKED (no anon insert policy)
-- select * from diagnostic_share where token = '<token>';  -- ALLOWED (RLS open SELECT)
-- select increment_share_view('<token>');                  -- ALLOWED
