-- ══════════════════════════════════════════════════════════════════════════
-- CertAnvil notify-me signups · waitlist persistence (v4.99.10)
-- ══════════════════════════════════════════════════════════════════════════
-- Pre-launch persistence layer for /api/notify. Pre-this migration the API
-- relied on Vercel logs + browser localStorage for storage. Both work as
-- graceful degrade but: (1) logs aren't queryable for "give me everyone who
-- signed up for Sec+ alerts," (2) localStorage doesn't survive device
-- changes. This table makes signups survive everything.
--
-- Design notes:
--   - The edge function (landing/api/notify.js) writes here using the
--     Supabase PUBLISHABLE key — same key the browser already has via
--     landing/lib/supabase.js. The key is intentionally public and SAFE
--     to embed because RLS gates what anon can do.
--   - Anon role gets INSERT only. No SELECT policy means service-role-only
--     read — admin queries the table via Supabase SQL editor when it's
--     time to send launch emails ("select email from notify_signups
--     where cert = 'Security+';").
--   - Unique on (email, cert) so the same person clicking Notify twice on
--     the same cert tile doesn't double-insert. The edge function uses
--     PostgREST's on_conflict parameter + Prefer: resolution=merge-duplicates
--     to UPSERT instead of INSERT — second click silently refreshes the
--     created_at + user_agent without erroring.
--   - email format check in WITH CHECK gives a programmatic floor before
--     the row lands. Edge function ALSO validates upstream (defence in
--     depth).
--
-- How to apply:
--   - Open Supabase dashboard → SQL Editor (project: appmuaqwuethndvalarl)
--   - Paste this file contents → Run
--   - Verify with: select count(*) from public.notify_signups; (should be 0)
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.notify_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  cert text not null,
  source text default 'certanvil-landing',
  user_agent text,
  created_at timestamptz default now(),
  unique (email, cert)
);

-- Indexes for the two queries we'll actually run
create index if not exists idx_notify_signups_cert
  on public.notify_signups (cert);
create index if not exists idx_notify_signups_created_at
  on public.notify_signups (created_at desc);

-- RLS on. Without policies, anon can do nothing. We add one INSERT policy.
alter table public.notify_signups enable row level security;

-- Allow anon (and authenticated) to insert with basic format guards.
-- Edge function has its own validation; this is defence-in-depth in case
-- someone bypasses the function with a direct REST call.
drop policy if exists "Allow notify-me signup inserts" on public.notify_signups;
create policy "Allow notify-me signup inserts"
  on public.notify_signups
  for insert
  to anon, authenticated
  with check (
    email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and length(email) <= 254
    and length(cert) > 0
    and length(cert) <= 100
    and length(source) <= 100
  );

-- No SELECT/UPDATE/DELETE policies — only service-role can read or modify.
-- Builder runs SQL queries via the Supabase dashboard SQL editor.

comment on table public.notify_signups is
  'Waitlist signups from /api/notify. Anon insert only; service-role read. v4.99.10';

comment on column public.notify_signups.email is 'Lowercased email; unique per (email, cert).';
comment on column public.notify_signups.cert is 'Cert label (free-form), e.g. "Security+", "AZ-900", "CCNA".';
comment on column public.notify_signups.source is 'Where the signup came from (e.g. certanvil-landing, pricing-page).';
comment on column public.notify_signups.user_agent is 'Captured for debugging / spam triage; not used for tracking.';
