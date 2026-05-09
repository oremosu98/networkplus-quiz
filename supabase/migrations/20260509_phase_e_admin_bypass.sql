-- ══════════════════════════════════════════════════════════════════════════
-- Phase E.4 migration — admin role bypasses quota (treated as Pro)
-- Date: 2026-05-09
-- ══════════════════════════════════════════════════════════════════════════
-- Run this once in Supabase Dashboard → SQL Editor → New Query.
-- Idempotent: uses CREATE OR REPLACE so safe to re-run.
--
-- Why:
-- v4.99.0/E.0 created is_pro(uid) which only returns true if the user has an
-- active row in subscriptions with tier='pro'. That's correct for Stripe-
-- driven Pro upgrades, but admins (profiles.role='admin') were being treated
-- as Free tier — capped at 20 questions/day with the standard quota wall.
-- They should bypass the wall entirely.
--
-- What this changes:
-- is_pro() now returns true for users matching EITHER of two conditions:
--   1. Active 'pro' tier subscription (existing v4.99.0 behavior)
--   2. profiles.role = 'admin'
-- Both is_pro() callers (consume_daily_quota + get_daily_quota_usage) auto-
-- pick up the change — admins now see the chip render as the "Pro" variant
-- (purple, no fraction) and quota writes still log for analytics but never
-- gate the request.
--
-- Phase 4 (Stripe) implication: admin status becomes a "Pro override" that's
-- independent of subscription state. Useful for support roles, internal
-- testing, founder use, etc. Admins who later become paying customers don't
-- get double-counted — is_pro() is OR'd, not summed.
-- ══════════════════════════════════════════════════════════════════════════

create or replace function is_pro(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from subscriptions
    where user_id = uid
      and tier = 'pro'
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  ) or exists (
    -- Phase E.4: admin role bypasses Pro paywall entirely
    select 1 from profiles
    where id = uid
      and role = 'admin'
  );
$$;

comment on function is_pro is
  'Returns true if the user has an active Pro subscription OR is an admin. Used by RLS policies and the AI proxy to gate Pro features. Admins are treated as Pro for quota + paywall purposes (Phase E.4).';

-- ══════════════════════════════════════════════════════════════════════════
-- Verify with:
--   select is_pro(auth.uid());                        -- should return true if admin
--   select * from get_daily_quota_usage(auth.uid());  -- should show daily_limit=-1, tier=pro
-- ══════════════════════════════════════════════════════════════════════════
