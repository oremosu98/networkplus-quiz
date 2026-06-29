# ADR-002 — RBAC admin surface + what "formalization" means here (audit Phase 5)

- **Status:** Accepted
- **Date:** 2026-05-31
- **Decider:** Founder
- **Audit ref:** `SECURITY-AUDIT-2026-05-29.md` → Phase 5 (RBAC formalization + audit logs), L4
- **Companion migration:** `supabase/migrations/20260531_phase5_admin_audit_log.sql`

## Context

The audit's Phase-5 line item was "RBAC formalization + audit logs." RBAC itself
already exists from **Phase C′** (`20260506_phase_c_prime.sql`):

- `profiles.role TEXT NOT NULL DEFAULT 'user'`, constrained `CHECK (role IN ('user','admin'))`.
- `is_admin()` — `SECURITY DEFINER STABLE`, reads the caller's `profiles.role`.
- Admin promotion is a **deliberate manual SQL action** only — there is no
  "promote to admin" UI, by design.

"Formalization" needed a concrete definition so it didn't become speculative
over-engineering.

## Decision

Formalization here means **two things, and explicitly excludes a third:**

1. **Audit logging (the substantive deliverable)** — an append-only
   `admin_audit_log` table + `SECURITY DEFINER` triggers recording every
   privilege-/entitlement-sensitive mutation. Built in the companion migration.
2. **Documenting the admin surface (this ADR)** — a single place that states
   which tables grant admin read-all, how, and what an admin can do.
3. **NOT a role-system expansion.** We deliberately do **not** introduce a
   role enum type or additional roles (`support`, `readonly`, `billing`, …).
   The app currently has **one admin** (the founder). Extra roles would be
   complexity with no consumer; revisit only when a real second role appears.

## The admin surface (policy audit)

Admin authority flows entirely through `is_admin()`. The admin-readable tables —
each via an `... OR public.is_admin()` SELECT policy:

| Table | Admin grant | Source |
|---|---|---|
| `profiles` | SELECT all rows | `20260506_phase_c_prime.sql` |
| `quiz_history` | SELECT all rows | `20260506_phase_c_prime.sql` |
| `cert_entitlements` | SELECT all rows | `20260506_phase_c_prime.sql` |
| `ai_proxy_rate_limit` | SELECT (admin-only) | `20260529_ai_proxy_rate_limit.sql` |
| `notify_rate_limit` | SELECT (admin-only) | `20260529_phase3_notify_rate_limit.sql` |
| `admin_audit_log` | SELECT (admin-only) | `20260531_phase5_admin_audit_log.sql` (this phase) |

Service-role-only tables (no admin client policy, written by webhooks/RPCs):
`subscriptions`, `stripe_events`, `diagnostic_share` (read via token-scoped
DEFINER fn).

**Privilege-escalation guard (verified):** `profiles` UPDATE is restricted to
`auth.uid() = id`, so an admin cannot edit *another* user's `role` via a direct
PostgREST UPDATE — role changes for other users would go through a service-role
path. The new `trg_audit_profiles_role` trigger now records any role change
regardless of who makes it.

**Known accepted behaviour (L4):** admin = blanket Pro bypass
(`20260509_phase_e_admin_bypass.sql`). By design — noted so that any *future*
admin grant is understood to also confer unlimited paid features. With one
admin today this is a non-issue; it is a thing to weigh before granting admin
to anyone else.

## Consequences

- The admin surface is now documented in one place; future tables that need
  admin read-all should add an `OR public.is_admin()` SELECT policy and a row to
  the table above.
- Sensitive mutations are now forensically traceable (`admin_audit_log`).
- No new role machinery to maintain. The `CHECK (role IN ('user','admin'))`
  constraint remains the single source of truth for valid roles.

## Revisit trigger

Introduce a real role enum / additional roles **only when** a concrete second
role is required (e.g. a support agent who can read but not mutate, or a
billing-only operator). At that point: migrate `role` to an enum or a dedicated
`roles`/`user_roles` table, and split `is_admin()` into capability checks.

## Related
[[ADR-001-m5-supabase-session-cookies]] · [[structure-overview]] · [[conventions]] · [[ENVIRONMENT_STRATEGY]]
