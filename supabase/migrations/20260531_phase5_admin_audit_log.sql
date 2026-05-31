-- ══════════════════════════════════════════════════════════════════════════
-- Security Phase 5 · RBAC formalization + admin audit log (2026-05-31)
-- ══════════════════════════════════════════════════════════════════════════
-- Maturity layer on top of the existing RBAC (Phase C′: profiles.role +
-- is_admin()). This migration adds an APPEND-ONLY forensic trail for the three
-- privilege-/entitlement-sensitive mutations in the schema:
--
--   1. profiles.role        changes  → who became/stopped being admin, and when
--   2. subscriptions        writes    → tier/status changes (Stripe webhook is
--                                       the only legit writer; log them all)
--   3. cert_entitlements    writes    → per-cert access grants / revokes
--
-- Design:
--   • One SECURITY DEFINER trigger fn (admin_audit_record) writes every row, so
--     the insert bypasses RLS and ALWAYS lands — even for service-role writes.
--   • actor_id = auth.uid() at write time. NULL actor = service-role / system
--     (e.g. the Stripe webhook, which carries no end-user JWT).
--   • admin_audit_log is RLS-locked to admin-SELECT only, with NO insert/update/
--     delete policy for any client → immutable + append-only from outside.
--   • profiles fires ONLY on an actual role change (high-volume metadata writes
--     are NOT logged); the two rare tables log every INSERT/UPDATE/DELETE.
--
-- The companion "formalization" half — confirming every admin-readable table
-- routes through is_admin() and documenting the admin surface — lives in
-- docs/decisions/ADR-002-rbac-admin-surface.md (no schema change needed there;
-- Phase C′ already wired the policies correctly).
--
-- Run once in Supabase Dashboard → SQL Editor. Idempotent (IF NOT EXISTS /
-- OR REPLACE / DROP ... IF EXISTS). Mirrors the proven Phase-1/3 RL-migration
-- shape. Uniquely-tagged dollar quotes ($guard$ / $audit_fn$) per gated-lane
-- convention; every dollar-quoted block is uniquely tagged.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Prereq guard · is_admin() must exist (Phase C′) ─────────────────────
do $guard$
begin
  if not exists (select 1 from pg_proc where proname = 'is_admin') then
    raise exception 'is_admin() not found — apply 20260506_phase_c_prime.sql first.';
  end if;
end$guard$;

-- ── 2. admin_audit_log table (append-only forensic trail) ──────────────────
create table if not exists admin_audit_log (
  id            bigint generated always as identity primary key,
  actor_id      uuid,                       -- auth.uid() at write time; NULL = service-role / system
  action        text not null,              -- 'role_change' | 'subscription_write' | 'entitlement_write'
  target_table  text not null,              -- the mutated table (tg_table_name)
  target_op     text not null,              -- 'INSERT' | 'UPDATE' | 'DELETE'
  target_id     text,                       -- affected row id (profiles/entitlements: id; subscriptions: user_id)
  old_data      jsonb,                      -- pre-image  (UPDATE/DELETE)
  new_data      jsonb,                      -- post-image (INSERT/UPDATE)
  at            timestamptz not null default now()
);

create index if not exists idx_admin_audit_at      on admin_audit_log (at desc);
create index if not exists idx_admin_audit_actor   on admin_audit_log (actor_id);
create index if not exists idx_admin_audit_target  on admin_audit_log (target_table, target_id);

comment on table admin_audit_log is
  'Append-only audit trail of privilege/entitlement-sensitive mutations (role changes, subscription + entitlement writes). admin-SELECT only; no client write path — only the admin_audit_record() SECURITY DEFINER trigger writes. NULL actor_id = service-role/system.';

-- ── 3. RLS · admin-only read; NO client write policy (append-only) ─────────
alter table admin_audit_log enable row level security;

drop policy if exists "admin_audit_admin_select" on admin_audit_log;
create policy "admin_audit_admin_select" on admin_audit_log
  for select using (public.is_admin());

-- Deliberately NO insert/update/delete policy. The SECURITY DEFINER trigger fn
-- below is the only writer; it bypasses RLS, so clients can never forge, edit,
-- or erase an audit row. The log is immutable from any client surface.

-- ── 4. admin_audit_record() · the single SECURITY DEFINER writer ───────────
-- Invoked by the three AFTER triggers. action label is passed as tg_argv[0].
-- Captures the calling user (auth.uid()), the operation, the target row id
-- (resolved generically so one fn serves both id- and user_id-keyed tables),
-- and full old/new jsonb images.
create or replace function admin_audit_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $audit_fn$
declare
  v_rec       jsonb;
  v_target_id text;
begin
  -- Row of interest: NEW on INSERT/UPDATE, OLD on DELETE
  if (tg_op = 'DELETE') then
    v_rec := to_jsonb(old);
  else
    v_rec := to_jsonb(new);
  end if;

  -- Generic PK resolution: profiles/cert_entitlements key on `id`, subscriptions on `user_id`
  v_target_id := coalesce(v_rec->>'id', v_rec->>'user_id');

  insert into admin_audit_log (actor_id, action, target_table, target_op, target_id, old_data, new_data)
  values (
    auth.uid(),
    tg_argv[0],
    tg_table_name,
    tg_op,
    v_target_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  -- AFTER trigger: return value is ignored, but must be a valid row
  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$audit_fn$;

comment on function admin_audit_record is
  'AFTER-trigger writer for admin_audit_log. SECURITY DEFINER so the audit insert always lands (bypasses RLS) regardless of which role triggered it. action label via tg_argv[0].';

-- ── 5. Triggers on the three sensitive tables ──────────────────────────────

-- 5a. profiles.role changes ONLY (skip the constant metadata-flush UPDATEs)
drop trigger if exists trg_audit_profiles_role on public.profiles;
create trigger trg_audit_profiles_role
  after update on public.profiles
  for each row
  when (old.role is distinct from new.role)
  execute function admin_audit_record('role_change');

-- 5b. subscriptions — every write (rare; Stripe webhook is the only legit writer)
drop trigger if exists trg_audit_subscriptions on public.subscriptions;
create trigger trg_audit_subscriptions
  after insert or update or delete on public.subscriptions
  for each row
  execute function admin_audit_record('subscription_write');

-- 5c. cert_entitlements — every write (per-cert grant / revoke)
drop trigger if exists trg_audit_entitlements on public.cert_entitlements;
create trigger trg_audit_entitlements
  after insert or update or delete on public.cert_entitlements
  for each row
  execute function admin_audit_record('entitlement_write');

-- ══════════════════════════════════════════════════════════════════════════
-- ROLLBACK:
--   drop trigger if exists trg_audit_entitlements on public.cert_entitlements;
--   drop trigger if exists trg_audit_subscriptions on public.subscriptions;
--   drop trigger if exists trg_audit_profiles_role on public.profiles;
--   drop function if exists admin_audit_record();
--   drop policy if exists "admin_audit_admin_select" on admin_audit_log;
--   drop table if exists admin_audit_log cascade;
-- ══════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- Verify (run as admin in SQL Editor)
-- ══════════════════════════════════════════════════════════════════════════
-- -- triggers present:
-- select tgname, tgrelid::regclass from pg_trigger
--   where tgname like 'trg_audit_%' order by 1;
--   -- expect: trg_audit_entitlements, trg_audit_profiles_role, trg_audit_subscriptions
--
-- -- a real role change logs one row (the WHEN gate skips no-op self-sets):
-- -- update public.profiles set role='admin' where id = auth.uid();
--
-- select id, actor_id, action, target_table, target_op, target_id, at
--   from admin_audit_log order by at desc limit 5;
-- ══════════════════════════════════════════════════════════════════════════
