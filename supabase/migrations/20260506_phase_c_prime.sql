-- ══════════════════════════════════════════════════════════════════════════
-- Phase C′ migration — cloud-first cert app + admin role
-- Date: 2026-05-06
-- ══════════════════════════════════════════════════════════════════════════
-- Run this once in Supabase Dashboard → SQL Editor → New Query.
-- Idempotent: safe to re-run (uses IF NOT EXISTS / ALTER ... IF EXISTS guards).
--
-- What this adds:
--   1. profiles.role TEXT — 'user' (default) or 'admin'
--   2. RLS policy update on profiles — admin can SELECT all rows; users still
--      restricted to their own row
--   3. Index on profiles.role for fast admin lookups
--   4. Helper function is_admin() — used in RLS policies of other tables
--      so admin can also read all quiz_history / cert_entitlements / etc.
--
-- The existing profiles.metadata jsonb (from initial schema) is the home for
-- per-user state that gets hydrated to localStorage on sign-in:
--   profiles.metadata = {
--     "streak":       { "current": 13, "best": 18, "last": "2026-05-05" },
--     "daily_goal":   100,
--     "wrong_bank":   [...],
--     "sr_queue":     [...],
--     "diagnostic":   { ...latest pass plan... },
--     "last_diagnostic_at": 1234567890,
--     "milestones":   [...],
--     "type_stats":   {...},
--     "drill_mastery": { "port": {...}, "subnet": {...}, ... },
--     "drill_lessons": {...},
--     "topology_state": {...},
--     "acl_state":    {...},
--     "migration_v1_at": "2026-05-06T..."  -- one-time builder import flag
--   }
-- Quiz HISTORY stays in the dedicated quiz_history table (append-only).
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Add role column to profiles ────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Constrain to known values (idempotent — drop + recreate)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- Index for fast admin lookup (RLS policies reference role frequently)
CREATE INDEX IF NOT EXISTS profiles_role_idx
  ON public.profiles (role);


-- ── 2. Helper function: is_admin() ────────────────────────────────────────
-- Returns true if the calling user has profiles.role = 'admin'.
-- Used in RLS policies on quiz_history / cert_entitlements / etc. so that
-- the admin user can read all rows, not just their own.
--
-- SECURITY DEFINER means it runs with the privileges of the function's
-- creator (postgres role), bypassing RLS for the lookup itself. Without
-- this, the function's SELECT on profiles would itself be RLS-restricted,
-- causing infinite recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN COALESCE(user_role = 'admin', false);
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;


-- ── 3. Update RLS policies to allow admin SELECT-all ──────────────────────

-- profiles: admin can read all rows; user can read own row.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

-- profiles UPDATE policy — only own row (admin still restricted to their own
-- profile UPDATEs to prevent privilege escalation by editing another user's
-- role; admin actions on other users go through the admin endpoint with
-- service-role key, not direct UPDATE).
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- quiz_history: admin can read all; user can read+insert own.
DROP POLICY IF EXISTS "quiz_history_select_own" ON public.quiz_history;
DROP POLICY IF EXISTS "quiz_history_select_own_or_admin" ON public.quiz_history;
CREATE POLICY "quiz_history_select_own_or_admin" ON public.quiz_history
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin()
  );

-- cert_entitlements: admin can read all; user can read own.
DROP POLICY IF EXISTS "entitlements_select_own" ON public.cert_entitlements;
DROP POLICY IF EXISTS "entitlements_select_own_or_admin" ON public.cert_entitlements;
CREATE POLICY "entitlements_select_own_or_admin" ON public.cert_entitlements
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin()
  );


-- ── 4. Owner setup (run AFTER first sign-up) ──────────────────────────────
-- After you sign up via the cert app for the first time, this migration won't
-- have set you as admin yet (your row gets created by the handle_new_user
-- trigger from the initial schema, defaulting to role='user'). Run this
-- ONE-LINER after first sign-up to promote yourself:
--
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'simi_oremosu@hotmail.com';
--
-- (Use whichever email you signed up with. Replace the email in the WHERE
-- clause if you used a Gmail address for the magic-link flow.)
--
-- This is a one-time manual step. The Phase C′ admin UI doesn't include a
-- "promote to admin" button (and shouldn't — admin promotion should always
-- be a deliberate SQL action, not a UI flow).


-- ══════════════════════════════════════════════════════════════════════════
-- DONE. Verify with:
--   SELECT column_name, data_type, column_default
--     FROM information_schema.columns
--     WHERE table_schema = 'public' AND table_name = 'profiles'
--     ORDER BY ordinal_position;
--   -- Expected: id, email, display_name, active_cert, exam_date, metadata,
--   --           created_at, updated_at, role
--
--   SELECT proname FROM pg_proc WHERE proname = 'is_admin';
--   -- Expected: 1 row 'is_admin'
-- ══════════════════════════════════════════════════════════════════════════
