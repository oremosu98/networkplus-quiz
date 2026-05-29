-- ══════════════════════════════════════════════════════════════════════════
-- Security Phase 2 · DB quick wins (v5.x · 2026-05-29)
-- ══════════════════════════════════════════════════════════════════════════
-- Closes four findings from SECURITY-AUDIT-2026-05-29.md. All surgical, all
-- gated-lane (touches supabase/migrations/) — applied to the branch DB + smoke-
-- tested on the preview before merge per ENVIRONMENT_STRATEGY.md.
--
--   M1 · stripe_events has RLS DISABLED (20260509_phase_e_subscriptions.sql:89).
--        Enable RLS, no client policies — service-role webhook is the only
--        accessor (it bypasses RLS). Mirrors the subscriptions / ai_usage
--        treatment in that same migration.
--
--   M2 · diagnostic_share SELECT policy is `using (true)` = world-readable.
--        Anyone holding the public anon key can `GET /rest/v1/diagnostic_share`
--        and ENUMERATE every shared diagnostic. Drop the open SELECT; serve
--        reads via a token-scoped SECURITY DEFINER fn so the token stays the
--        access gate without exposing the whole table. (Requires the two anon-
--        key readers — share-fetch.js + share-redirect.js — to call the RPC;
--        shipped in the same PR. email-report.js uses the service-role key so
--        it is unaffected.)
--
--   M4 · notify_signups INSERT policy regressed to `with check (true)` in
--        v4.99.13 (the permissive hotfix) after the v4.99.12 regex fix STILL
--        threw 42501. Restore lightweight validation (the regex_fix regex +
--        length bounds) as defence-in-depth — but NULL-safe on `source`, which
--        is the most likely cause of that unsolved 42501 (see § M4).
--
--   L3 · claim_diagnostic_results has no email-match check. Add one as defence-
--        in-depth so a leaked/guessed token can't be claimed into a different
--        account than the one the diagnostic was emailed to.
--
-- How to apply: Supabase Dashboard → SQL Editor → paste → Run. Idempotent
-- (IF EXISTS / OR REPLACE / DROP-then-CREATE). Run once per environment.
-- ══════════════════════════════════════════════════════════════════════════

-- Preflight guards — fail loud if a prerequisite migration hasn't been applied.
do $$
begin
  if not exists (select 1 from pg_class where relname = 'stripe_events') then
    raise exception 'stripe_events not found — apply 20260509_phase_e_subscriptions.sql first.';
  end if;
  if not exists (select 1 from pg_class where relname = 'diagnostic_share') then
    raise exception 'diagnostic_share not found — apply 20260511_diagnostic_share.sql first.';
  end if;
  if not exists (select 1 from pg_class where relname = 'notify_signups') then
    raise exception 'notify_signups not found — apply 20260509_notify_signups.sql first.';
  end if;
  if not exists (select 1 from pg_proc where proname = 'claim_diagnostic_results') then
    raise exception 'claim_diagnostic_results not found — apply 20260511_diagnostic_pending.sql first.';
  end if;
end$$;

-- ══════════════════════════════════════════════════════════════════════════
-- M1 · stripe_events — enable RLS, service-role-only (no client policies)
-- ══════════════════════════════════════════════════════════════════════════
-- The Stripe webhook handler is the ONLY reader/writer and it uses the service-
-- role key, which bypasses RLS entirely. With RLS off, anyone holding the
-- public anon key could read/write the idempotency log via PostgREST. Enabling
-- RLS with zero client policies = anon/authenticated can do nothing; the
-- service role still works. Same pattern as subscriptions + ai_usage in
-- 20260509_phase_e_subscriptions.sql.
alter table stripe_events enable row level security;

comment on table stripe_events is
  'Stripe webhook idempotency log. RLS enabled with NO client policies — the '
  'service-role webhook handler is the only accessor (bypasses RLS). v5.x Phase 2.';

-- ══════════════════════════════════════════════════════════════════════════
-- M2 · diagnostic_share — kill the world-readable SELECT, serve via RPC
-- ══════════════════════════════════════════════════════════════════════════
-- The original D.6 policy `diag_share_public_select using (true)` made EVERY
-- row readable to anyone with the publishable key — `GET /rest/v1/
-- diagnostic_share` with no filter dumps every shared diagnostic. The token was
-- meant to be the access gate, but an open SELECT defeats that. Drop it and
-- replace the read path with a token-scoped SECURITY DEFINER function: callers
-- must know a token to get a row, and only the matching (unexpired) row comes
-- back — no enumeration surface.
drop policy if exists "diag_share_public_select" on diagnostic_share;

-- Token-scoped read. SECURITY DEFINER lets anon read the one matching row
-- despite there being no client SELECT policy. Mirrors the increment_share_view
-- guard style (token length floor, expiry check). Returns 0 rows on a bad /
-- expired / unknown token — never an error, never another row.
create or replace function get_diagnostic_share(p_token text)
returns table(
  token          text,
  cert           text,
  results        jsonb,
  view_count     int,
  created_at     timestamptz,
  expires_at     timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or length(p_token) < 16 then
    return;  -- no rows on a bogus token (bot probing)
  end if;
  return query
    select s.token, s.cert, s.results, s.view_count, s.created_at, s.expires_at
      from diagnostic_share s
      where s.token = p_token
        and s.expires_at > now();  -- expired shares are not readable
end;
$$;

comment on function get_diagnostic_share is
  'Token-scoped read of a single non-expired diagnostic_share row. Replaces the '
  'old world-readable open SELECT policy (anti-enumeration). Anon-callable.';

-- anon (the publishable-key callers: share-fetch.js + share-redirect.js) needs
-- execute. authenticated too, for symmetry with the rest of the diagnostic RPCs.
grant execute on function get_diagnostic_share(text) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- M4 · notify_signups — restore NULL-safe validation (defence-in-depth)
-- ══════════════════════════════════════════════════════════════════════════
-- History: v4.99.10 shipped a WITH CHECK with the regex + length bounds; v4.99.12
-- fixed the \s POSIX bug; v4.99.13 gave up and set `with check (true)` because
-- inserts STILL threw 42501 even with the demonstrably-correct regex and the
-- root cause was never found.
--
-- The most likely culprit: `length(source) <= 100`. `source` is nullable
-- (`source text default 'certanvil-landing'`), and a direct REST insert (or any
-- payload that omits the column / sends null) makes `length(source)` evaluate to
-- NULL → `NULL <= 100` is NULL → `... and NULL` is NULL → the WITH CHECK fails
-- with 42501. That matches the "every theory tested came back negative" symptom:
-- the regex WAS correct, the failing predicate was the source-length check on a
-- NULL source. Restoring it verbatim would re-break inserts.
--
-- Fix: re-apply the validation but make the nullable `source` predicate NULL-
-- safe. email + cert are NOT NULL so they need no guard. The edge function
-- (landing/api/notify.js) still validates upstream — this is defence-in-depth
-- against a direct PostgREST insert with the publishable key.
drop policy if exists "Allow notify-me signup inserts" on public.notify_signups;

create policy "Allow notify-me signup inserts"
  on public.notify_signups
  for insert
  to anon, authenticated
  with check (
    email ~ '^[^@]+@[^@]+\.[^@]+$'
    and length(email) <= 254
    and length(cert) > 0
    and length(cert) <= 100
    and (source is null or length(source) <= 100)  -- NULL-safe: see § M4
  );

-- ══════════════════════════════════════════════════════════════════════════
-- L3 · claim_diagnostic_results — add an email-match guard
-- ══════════════════════════════════════════════════════════════════════════
-- The token is a 32-hex cryptographic one-shot sent only via the magic-link
-- email, so the threat is narrow. But as defence-in-depth, require the signed-in
-- user's authenticated email to match the email the diagnostic was sent to —
-- so a leaked / guessed / forwarded token can't be claimed into a DIFFERENT
-- account. Everything else is byte-identical to the 20260511_diagnostic_pending
-- definition; the only change is the new email-match block (marked below).
create or replace function claim_diagnostic_results(p_token text)
returns table(
  ok boolean,
  message text,
  cert text,
  scaled_score int,
  total_questions int,
  correct_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending diagnostic_pending%rowtype;
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_results jsonb;
begin
  -- Must be signed in
  if v_user_id is null then
    return query select false, 'not_signed_in'::text, null::text, null::int, null::int, null::int;
    return;
  end if;

  -- Token must be a string (basic sanity — not enforcing length/charset here,
  -- the endpoint generated it)
  if p_token is null or length(p_token) < 16 then
    return query select false, 'invalid_token'::text, null::text, null::int, null::int, null::int;
    return;
  end if;

  -- Lock + fetch pending row
  select * into v_pending
    from diagnostic_pending
    where token = p_token
    for update;

  if v_pending.token is null then
    return query select false, 'not_found'::text, null::text, null::int, null::int, null::int;
    return;
  end if;

  if v_pending.claimed_at is not null then
    return query select true, 'already_claimed'::text,
      v_pending.cert,
      (v_pending.results->>'scaledScore')::int,
      (v_pending.results->>'totalQuestions')::int,
      (v_pending.results->>'correctCount')::int;
    return;
  end if;

  if v_pending.expires_at < now() then
    return query select false, 'expired'::text,
      v_pending.cert, null::int, null::int, null::int;
    return;
  end if;

  -- ── L3 (Phase 2) · email-match guard (defence-in-depth) ──────────────────
  -- The token is the primary gate; this ensures the claiming account's email
  -- matches the email the diagnostic was emailed to. Case-insensitive.
  select email into v_user_email from auth.users where id = v_user_id;
  if v_user_email is null
     or lower(v_user_email) is distinct from lower(v_pending.email) then
    return query select false, 'email_mismatch'::text,
      v_pending.cert, null::int, null::int, null::int;
    return;
  end if;
  -- ─────────────────────────────────────────────────────────────────────────

  v_results := v_pending.results;

  -- Merge into profiles.metadata.diagnostic (latest pass plan, single object)
  -- + profiles.metadata.diagnostic_history[] (append-only history log).
  update profiles
    set metadata = jsonb_set(
      jsonb_set(
        coalesce(metadata, '{}'::jsonb),
        '{diagnostic}',
        jsonb_build_object(
          'cert', v_pending.cert,
          'diagnosticId', v_results->>'diagnosticId',
          'scaledScore', (v_results->>'scaledScore')::int,
          'passThreshold', (v_results->>'passThreshold')::int,
          'isPassing', (v_results->>'isPassing')::boolean,
          'accuracy', (v_results->>'accuracy')::float,
          'totalQuestions', (v_results->>'totalQuestions')::int,
          'correctCount', (v_results->>'correctCount')::int,
          'domainBreakdown', v_results->'domainBreakdown',
          'completedAt', (v_results->>'completedAt')::bigint,
          'durationMs', (v_results->>'durationMs')::bigint,
          'source', 'landing-diagnostic',
          'claimedAt', (extract(epoch from now()) * 1000)::bigint
        )
      ),
      '{diagnostic_history}',
      coalesce(metadata->'diagnostic_history', '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'cert', v_pending.cert,
          'diagnosticId', v_results->>'diagnosticId',
          'scaledScore', (v_results->>'scaledScore')::int,
          'totalQuestions', (v_results->>'totalQuestions')::int,
          'correctCount', (v_results->>'correctCount')::int,
          'completedAt', (v_results->>'completedAt')::bigint,
          'source', 'landing-diagnostic'
        )
      )
    )
    where id = v_user_id;

  -- Mark token claimed
  update diagnostic_pending set claimed_at = now() where token = p_token;

  return query select true, 'claimed'::text,
    v_pending.cert,
    (v_results->>'scaledScore')::int,
    (v_results->>'totalQuestions')::int,
    (v_results->>'correctCount')::int;
end;
$$;

comment on function claim_diagnostic_results is
  'Claims an anon diagnostic_pending row into the signed-in user''s profile. '
  'v5.x Phase 2 (L3): added email-match guard (auth email must equal the '
  'pending row email, case-insensitive) as defence-in-depth.';

-- ══════════════════════════════════════════════════════════════════════════
-- Verify (run manually as the relevant role)
-- ══════════════════════════════════════════════════════════════════════════
-- M1 (as anon, via PostgREST): GET /rest/v1/stripe_events → [] (RLS blocks; was
--     the full table before). As service role: still full access.
-- M2 (as anon): GET /rest/v1/diagnostic_share → []  (open SELECT gone)
--     POST /rest/v1/rpc/get_diagnostic_share {"p_token":"<valid>"} → 1 row
--     POST /rest/v1/rpc/get_diagnostic_share {"p_token":"deadbeef..."} → []
-- M4: insert {email:'a@b.co', cert:'Security+', source:null}     → ALLOWED (NULL-safe)
--     insert {email:'not-an-email', cert:'Security+'}            → BLOCKED (42501)
-- L3: claim_diagnostic_results('<token>') as the wrong email     → (false, 'email_mismatch', ...)
--     claim_diagnostic_results('<token>') as the matching email  → (true, 'claimed', ...)

-- ══════════════════════════════════════════════════════════════════════════
-- ROLLBACK  (backout plan — change-management discipline · v5.x Phase 2)
-- ══════════════════════════════════════════════════════════════════════════
-- Forward-only in prod. This block is the documented MANUAL reversal, tested on
-- the Supabase preview branch before merge. To revert, run the following in
-- Supabase Dashboard → SQL Editor (production), in this order:
--
--   -- M1: re-disable RLS on stripe_events (restores prior open state)
--   alter table stripe_events disable row level security;
--
--   -- M2: drop the token-scoped fn + restore the open SELECT policy
--   --     (NOTE: only roll this back together with reverting share-fetch.js +
--   --      share-redirect.js to direct-table reads, else those readers 404.)
--   drop function if exists get_diagnostic_share(text);
--   drop policy if exists "diag_share_public_select" on diagnostic_share;
--   create policy "diag_share_public_select" on diagnostic_share
--     for select using (true);
--
--   -- M4: restore the permissive INSERT policy (v4.99.13 state)
--   drop policy if exists "Allow notify-me signup inserts" on public.notify_signups;
--   create policy "Allow notify-me signup inserts"
--     on public.notify_signups for insert to anon, authenticated
--     with check (true);
--
--   -- L3: re-create claim_diagnostic_results WITHOUT the email-match block
--   --     (restore the verbatim body from 20260511_diagnostic_pending.sql).
--
-- If data was written after the migration applied, PITR-restore to a timestamp
-- BEFORE the migration instead, then replay good writes.
-- ══════════════════════════════════════════════════════════════════════════
