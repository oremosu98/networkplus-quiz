---
type: process
status: active
cert: all
updated: 2026-06-29
tags: [convention]
---
# CertAnvil Environment Strategy

**Status:** 🟢 Adopted 2026-05-12. Supersedes the old "trunk-based until a trigger fires" stance in CLAUDE.md — two of the three triggers (paying users imminent · backend DB migrations) have now fired.

**One-line summary:** 3 right-sized tiers, GitHub as the control plane, a **risk-tiered gate** so the ~90% low-risk fast lane stays trunk-based and frictionless while the ~10% brand-killers (DB / money / auth / service-worker) go through an isolated preview stack before they can touch prod.

---

## Why this exists

CertAnvil is pre-launch with paying users + an App Store target imminent. A critical production bug — especially a bad database migration against live user data — could kill the brand before it begins. But a solo founder cannot staff a 5-tier enterprise pipeline (local→dev→stage→preprod→prod); it would rot into theater and slow every ship.

The honest observation: **risk is not uniform.**

| Layer | Risk | Why |
|---|---|---|
| Static frontend (HTML/JS/CSS) | 🟢 Low | Vercel preview deploys · UAT gates every push · Playwright E2E in CI · **one-click instant rollback** to any prior deploy. A bad frontend deploy is reversible in ~10s. |
| Supabase database | 🔴 **HIGH** | Migrations historically ran via SQL Editor straight against prod with real user data + no test target. A bad `ALTER`/`DROP`/RLS misconfig corrupts or exposes live data. **This is the brand-killer.** |
| Stripe (payments) | 🟡 Medium | Stripe has built-in test/live separation — needs key + webhook discipline, not a new environment. |

The strategy pours its discipline into the database layer (the real exposure) and keeps the already-well-de-risked frontend on the fast lane.

---

## The 3 tiers

```
┌─ LOCAL ──────────────┐  python3 -m http.server 3131  +  node tests/uat.js
│  frontend + content  │  (no DB needed — diagnostic uses inline fallback;
│                      │   cert-app auth reads prod Supabase; NEVER write
│                      │   nplus_* localStorage on a prod URL — see CLAUDE.md
│                      │   data-safety rule)
└──────────┬───────────┘
           │  git push feature branch + open PR
           ▼
┌─ PREVIEW (per-PR) ───┐  Vercel preview deploy  ⇄  Supabase BRANCH DB
│  = dev + stage + UAT │  Ephemeral. Auto-created when the PR opens, auto-
│  collapsed into ONE  │  destroyed when it merges/closes. Migrations in
│  ephemeral stack     │  supabase/migrations/ apply HERE first. Smoke-test
│                      │  against isolated data with zero prod blast radius.
└──────────┬───────────┘
           │  PR squash-merged to main
           ▼
┌─ PRODUCTION ─────────┐  main → Vercel prod  ⇄  Supabase prod (PITR on)
│  real users + money  │  Frontend: one-click Vercel rollback.
│                      │  Database: Point-In-Time Recovery (7-day window).
└──────────────────────┘
```

The enterprise "dev / stage / preprod" tiers **collapse into the per-PR preview** because Supabase branching makes every PR a full isolated stack automatically — no environment to staff, $0 when idle.

---

## GitHub is the spine (not a tier)

The branch your code is on **is** which environment it's in. The PR **is** the gate.

```
            ┌──────────── GITHUB (control plane) ────────────┐
feature ───►│ branch + PR ─┬─► Supabase GH integ ─► branch DB │
branch      │              ├─► Vercel GH integ ───► preview   │
            │              ├─► GitHub Actions ────► UAT+PW+TD  │
            │              └─► branch protection ─► gate merge │
main ──────►│ merge ───────┬─► Supabase ──────────► PROD migrate│
            │              └─► Vercel ────────────► PROD deploy │
            └────────────────────────────────────────────────┘
```

| GitHub job | Role |
|---|---|
| Branch = environment selector | `main` = prod. Any other branch + PR = the ephemeral preview stack. No "deploy to staging" button — opening the PR **is** the deploy. |
| PR = risk gate | Gated-lane changes physically happen at the PR. Opening it triggers the Supabase branch DB + Vercel preview. Merge = promote-to-prod. |
| Actions = automated test tier | `UAT + Playwright + tech-debt.js` on every push. This is why no separate QA env is needed. |
| Branch protection = enforcement | `main` requires the `UAT + Playwright` status check (strict). Force-push blocked. `enforce_admins: false` is **intentional** — see note below. |

### Branch-protection settings (verified 2026-05-12 · do not "fix")

- ✅ `required_status_checks`: `["UAT + Playwright"]`, `strict: true`
- ✅ `allow_force_pushes`: false
- ✅ `enforce_admins`: **false — intentional.** Flipping it true would force *every* trivial fast-lane change (an exemplar add, a copy tweak) through a PR + full CI wait. That kills the fast lane the whole strategy is built to protect. The founder-as-admin direct-push to `main` for fast-lane work is by design; the local pre-commit hook + CI still run UAT.
- `required_pull_request_reviews`: null — consistent with trunk-based fast lane.

**Honest limitation:** GitHub branch protection is branch-scoped, not file-path-scoped (path rules via Rulesets are impractical at solo scale). So the gated lane is **not** technically force-enforced by GitHub. It is enforced by: (1) the discipline rule below, (2) the PR template checklist, (3) the UAT migration-rollback guard. At n=1 this is the right trade — process + template + one hard technical guard beats fighting GitHub Rulesets.

---

## The risk-tier decision rule

> **Does the change touch the database schema, money, auth, or the service worker?**
> **YES** → gated lane.  **NO** → fast lane.

**Gated-lane triggers (explicit list):**
- Any file in `supabase/migrations/`
- `landing/api/stripe/*` or any Stripe handler
- `landing/api/ai/*` / `landing/api/diagnostic/*` server endpoints (quota / cost / abuse surface)
- `auth-state.js`, `cloud-store.js`, `lib/supabase.js` (session + cloud-state machine)
- `sw.js` (service worker — a bad cache rule poisons every returning user, and SW bugs are the hardest to roll back because clients hold the bad worker)
- RLS policy changes, entitlements logic, `is_pro()` / quota RPCs

**Everything else is fast lane:** exemplars, retention concepts, UI/CSS, copy, non-schema JS logic, docs, drill content, mockups.

| | Fast lane (~90% of ships) | Gated lane (~10% — brand-killers) |
|---|---|---|
| Flow | commit → `main` → push → CI UAT → Vercel prod | branch → **PR** → Supabase branch + Vercel preview + CI → smoke-test preview → self-sign-off → squash-merge → prod |
| Trigger | push to `main` | **opening the PR** |
| Speed | seconds (unchanged) | deliberate — the safety tax on the 10% that can kill the brand |
| Rollback | Vercel one-click | Vercel one-click + Supabase PITR |

### Solo-founder note on "PR review"

You're a team of one — the PR is **not** peer review. Its value is the forced pause + green checklist: open PR → preview URL + branch DB come up → CI goes green → you smoke-test the preview → you approve your own PR as the explicit "I verified this" gate → squash-merge. A self-checklist gate, not a second human. Squash-merge auto-deletes the branch → Supabase tears down the branch DB → Vercel discards the preview. Zero cleanup.

---

## Migration rollback-block convention (mandatory for gated lane)

Every migration file in `supabase/migrations/` **dated 2026-05-12 or later** MUST carry a `-- ROLLBACK:` block documenting the exact reversal SQL. This is the database equivalent of the Change Management "backout plan as approval gate" discipline (Sec+ exemplar Cycle 6, v4.99.58) — we eat our own dogfood.

**Grandfather clause:** migrations dated before 2026-05-12 predate this convention and are already applied to prod. Their recovery path is **PITR** (which is exactly why Phase A enables it). We do **not** retrofit fabricated rollback SQL onto old migrations authored before the convention — writing untested reversal SQL for a migration you didn't author is itself a risk. The UAT guard (`tests/uat.js`) enforces the 2026-05-12 cutoff automatically.

### Template — copy this block into every new migration

```sql
-- ══════════════════════════════════════════════════════════════════════════
-- ROLLBACK  (backout plan — change-management discipline · vX.Y.Z)
-- ══════════════════════════════════════════════════════════════════════════
-- Forward-only in prod. This block is the documented MANUAL reversal,
-- tested on the Supabase preview branch before merge. To revert, run the
-- following in Supabase Dashboard → SQL Editor (production):
--
--   drop function if exists <fn_name>(<args>);
--   drop policy  if exists "<policy>" on <table>;
--   drop table   if exists <table>;
--   -- ...exact inverse of every forward statement, in reverse order...
--
-- If data was written after the migration applied, PITR-restore to a
-- timestamp BEFORE the migration instead, then replay good writes.
-- ══════════════════════════════════════════════════════════════════════════
```

The UAT guard only checks that the literal `-- ROLLBACK` marker is present on dated-≥-2026-05-12 migrations. It does not (cannot) validate the SQL is correct — that's what the preview-branch test is for. **Test the rollback on the branch DB before merge, not in prod.**

---

## Rollback runbook (the brand-survival doc)

Print this. Memorize the top two rows.

| Failure | Recovery | Time | Notes |
|---|---|---|---|
| Bad frontend deploy (UI/logic bug in prod) | Vercel → project → Deployments → last good → **Promote to Production** | ~10 s | Instant. No build. The SW auto-update + cache-bust propagates to clients on next visit. |
| Bad migration **caught in preview** | Close the PR. Supabase branch DB auto-discarded. | instant | **Zero prod impact.** This is the entire point of the gated lane. |
| Bad migration **reached prod**, no data written yet | Run the migration's `-- ROLLBACK:` block in Supabase SQL Editor | ~minutes | Why every gated migration must carry a tested rollback block. |
| Bad migration **reached prod**, data written after | Supabase → Database → Backups → **PITR restore** to timestamp before the migration → manually replay legitimate post-migration writes | ~10–30 min | The hard case. PITR is the safety net of last resort — 7-day window on Pro. Minimize by catching in preview. |
| Stripe webhook misfire / bad event | Stripe Dashboard → Developers → Events → find event → **Resend** | ~1 min | Test-mode events never hit prod (separate keys + webhook endpoint). |
| Bad service-worker deploy (stale cache served to returning users) | Bump `sw.js` CACHE_NAME via `scripts/bump-version.js` + redeploy; the v4.89.2 controllerchange + 60s update poll force-reloads clients | ~1 deploy cycle | SW bugs are the slowest to recover — clients hold the bad worker. This is why `sw.js` is a gated-lane trigger. |
| Anthropic / Resend / Turnstile key compromised or rotated | Update env var on **every** Vercel project that uses it (see `reference_vercel_deploy_gotchas.md`), redeploy each, smoke-test, then revoke old key | ~15 min | `networkplus-quiz` serves BOTH Network+ and Security+ subdomains — one project, one update. |

---

## Setup checklist (founder dashboard actions — do BEFORE the Stripe weekend)

### Phase A — Supabase Pro + branching (~30 min)
- [ ] Upgrade the CertAnvil Supabase project to **Pro** ($25/mo)
- [ ] Enable **Point-in-Time Recovery** (Database → Backups → PITR) — 7-day window
- [ ] Connect Supabase ↔ GitHub repo (Integrations → GitHub → authorize `oremosu98/networkplus-quiz`)
- [ ] Enable **Branching** (Branches → Enable) · production branch = `main` · migrations dir = `supabase/migrations/` (already the convention — zero code change)

### Phase B — Vercel ⇄ Supabase wiring (~20 min)
- [ ] Install the official **Supabase integration** on BOTH Vercel projects (`networkplus-quiz` + `certanvil-landing`) — auto-injects per-environment DB credentials (Production scope → prod DB, Preview scope → that PR's branch DB)
- [ ] Set **Preview-scope** values for non-Supabase secrets: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY` (reuse prod or capped keys)
- [ ] Stripe: **test-mode** keys + webhook in Preview scope; **live-mode** keys + webhook in Production scope (never let a preview deploy reach live Stripe)

### Why before the Stripe weekend
Stripe is the single highest-stakes migration ever — money + a `subscriptions` table + a webhook. With branching live, the Stripe schema migration + webhook get tested on an isolated branch DB on their **first run** instead of debuting against prod. That's the difference between "oops, fix the branch" and "oops, the payments table is corrupt on launch day."

---

## Stripe environment hygiene (ties into D.7 / P4.1)

| | Preview / branch | Production |
|---|---|---|
| Stripe keys | `sk_test_…` / `pk_test_…` | `sk_live_…` / `pk_live_…` |
| Webhook endpoint | test-mode endpoint | live-mode endpoint (separate signing secret) |
| Vercel env scope | Preview | Production |
| Test cards | `4242 4242 4242 4242` etc. | real cards only |

Rule: a preview deploy must **never** be able to create a live charge. Enforced by env-var scoping — Preview scope only ever holds `sk_test_…`.

---

## Related docs

- `CLAUDE.md` → **Branching Strategy** section (the short-form risk-tier rule + pointer here)
- `SHIP_CHECKLIST.md` → **Phase 0.5** risk-tier gate
- `.github/pull_request_template.md` → the gated-lane checklist auto-populated on every PR
- `tests/uat.js` → migration rollback-block guard (date-cutoff enforced)
- memory `reference_vercel_deploy_gotchas.md` → multi-project key rotation + Resend≠Anthropic + pre-prod activation discipline
- memory `reference_infra_template.md` / `~/Desktop/Dev Projects/INFRASTRUCTURE-TEMPLATE.md` → keep in sync on infra changes (per `feedback_infra_docs.md`)
