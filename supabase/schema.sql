-- ══════════════════════════════════════════════════════════════════════════
-- CertAnvil Supabase Schema (Phase A — initial migration)
-- ══════════════════════════════════════════════════════════════════════════
-- Run this once in Supabase Dashboard → SQL Editor → New Query.
-- Idempotent: safe to re-run if you need to re-apply (uses IF NOT EXISTS).
--
-- Tables created:
--   public.profiles            — user profile metadata (1:1 with auth.users)
--   public.quiz_history        — per-quiz session record
--   public.cert_entitlements   — free/pro/lifetime tier per cert
--   public.waitlist            — notify-me signups (replaces localStorage backup)
--
-- Security model:
--   - RLS enabled on every table
--   - Users can only read/write their OWN data (auth.uid() = user_id)
--   - Waitlist is INSERT-only for the public; admin reads via service_role
--   - Auto-create profile row on signup (trigger on auth.users)
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Profiles table ──────────────────────────────────────────────────────
-- Extends auth.users with our own metadata. 1:1 relationship.
-- auth.users is managed by Supabase Auth and shouldn't be modified directly.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  active_cert TEXT DEFAULT 'netplus',     -- 'netplus' | 'secplus' | future
  exam_date DATE,                         -- planned exam date
  metadata JSONB DEFAULT '{}'::jsonb,     -- flexible field for future features
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users read/update their own profile only.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile row when a new auth.users row is inserted.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update profile.updated_at on UPDATE
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ── 2. Quiz history table ─────────────────────────────────────────────────
-- One row per quiz/exam/drill session. The cert app currently writes this
-- to localStorage; Phase D will start mirror-writing to this table for
-- cross-device sync. Schema mirrors localStorage 'nplus_history' shape.
CREATE TABLE IF NOT EXISTS public.quiz_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cert TEXT NOT NULL,                      -- 'netplus' | 'secplus' | future
  topic TEXT,                              -- e.g., 'Subnetting & IP Addressing'
  difficulty TEXT,                         -- 'Foundational' | 'Exam Level' | 'Hard'
  mode TEXT,                               -- 'quiz' | 'exam' | 'drill' | 'diagnostic'
  score INT NOT NULL,                      -- correct count
  total INT NOT NULL,                      -- question count
  duration_ms INT,                         -- ms taken
  metadata JSONB DEFAULT '{}'::jsonb,      -- per-mode extras (q-types, retries, exam batch info)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.quiz_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_history_select_own" ON public.quiz_history;
CREATE POLICY "quiz_history_select_own" ON public.quiz_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_history_insert_own" ON public.quiz_history;
CREATE POLICY "quiz_history_insert_own" ON public.quiz_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for fast "my recent history per cert" queries (the dominant access pattern)
CREATE INDEX IF NOT EXISTS quiz_history_user_cert_created_idx
  ON public.quiz_history (user_id, cert, created_at DESC);


-- ── 3. Cert entitlements table ────────────────────────────────────────────
-- Tracks free/pro/lifetime access per cert per user. Foundation for Stripe
-- paywall later (Phase G). On signup, every user gets a free entitlement
-- for Network+ (current customer-facing cert).
CREATE TABLE IF NOT EXISTS public.cert_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cert TEXT NOT NULL,                      -- 'netplus' | 'secplus' | future
  tier TEXT NOT NULL DEFAULT 'free',       -- 'free' | 'pro' | 'lifetime'
  expires_at TIMESTAMPTZ,                  -- NULL = forever (free or lifetime)
  metadata JSONB DEFAULT '{}'::jsonb,      -- Stripe subscription ID, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, cert)
);

ALTER TABLE public.cert_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entitlements_select_own" ON public.cert_entitlements;
CREATE POLICY "entitlements_select_own" ON public.cert_entitlements
  FOR SELECT USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS entitlements_touch_updated_at ON public.cert_entitlements;
CREATE TRIGGER entitlements_touch_updated_at
  BEFORE UPDATE ON public.cert_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-grant free Network+ entitlement on signup
CREATE OR REPLACE FUNCTION public.grant_default_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cert_entitlements (user_id, cert, tier)
  VALUES (NEW.id, 'netplus', 'free')
  ON CONFLICT (user_id, cert) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_grant_default ON auth.users;
CREATE TRIGGER on_auth_user_grant_default
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_default_entitlement();


-- ── 4. Waitlist table ─────────────────────────────────────────────────────
-- Replaces the existing localStorage 'certanvil_notify_signups' backup.
-- Anonymous users hit the notify-me modal; their email + cert + source
-- get inserted here. Idempotent: same email + same cert = single row.
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  cert TEXT NOT NULL,                      -- 'AZ-900' | 'CCNA' | 'AWS SAA' | future
  source TEXT,                             -- 'certanvil-landing' | 'twitter' | 'reddit'
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email, cert)
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT (signup is a public action). Nobody (except service_role)
-- can SELECT — admin reads via service_role from /api/notify edge function.
DROP POLICY IF EXISTS "waitlist_insert_anonymous" ON public.waitlist;
CREATE POLICY "waitlist_insert_anonymous" ON public.waitlist
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS waitlist_cert_created_idx
  ON public.waitlist (cert, created_at DESC);


-- ══════════════════════════════════════════════════════════════════════════
-- DONE. To verify:
--   SELECT * FROM information_schema.tables WHERE table_schema = 'public';
-- Expected output: profiles, quiz_history, cert_entitlements, waitlist
-- ══════════════════════════════════════════════════════════════════════════
