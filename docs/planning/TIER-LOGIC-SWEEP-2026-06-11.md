---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan, saas-gated]
---
# Free/Pro tier-logic sweep — 2026-06-11

Definitive done/not-done audit of every free-vs-pro rule discussed during the
cert-ios screen build. Sources: Forge decision log, the mockups' own design
notes (`stage-sub` annotations + `free-only`/`pro-only` markup in
`.claude/worktrees/cert-ios-e2e/mockups/`), and verification against live code
(app.js `_quotaState`/`_claudeFetch`, `api/ai/generate.js`,
`supabase/migrations/20260509_phase_e_*.sql`, `landing/lib/*`).

## ✅ Implemented and live

| # | Rule | Where it lives |
|---|------|----------------|
| A1 | Free users: daily AI question quota, enforced server-side (currently **20/day** — see GAP-1), quota chip shows remaining | `consume_daily_quota()` RPC + `api/ai/generate.js` `_metered` + app.js quota chip (Phase E.3) |
| A2 | Quota-exceeded wall with upgrade CTA + free escape hatch (Daily Review) | `#quota-exceeded-modal`, lifted to cert-ios language in v7.36 |
| A3 | Pro/admin = unlimited questions (`daily_limit = -1`) | `is_pro()` OR role=admin (Phase E.4 migration) |
| A4 | Free tier = ONE cert; others locked until Pro | v7.33.0 free-cert lock (web + native) |
| A5 | Drills are a Pro perk | app.js (~line 748) — Pro gate on drills |
| A6 | Pro-only menu items show 🔒 to free users | `body.is-pro-tier` class system (v4.99.8) |
| A7 | Locked cert rows on /account open an upsell sheet → Go Pro card (mobile) | v7.38.0 account-pages lift phase 2 |
| A8 | Go Pro pricing surfaces ($89/yr / $9.99/mo) with honest "coming soon" CTAs | v7.38 (account card + sheet) + v7.39 (manage-subscription page) |
| A9 | Free cert picker: pick locks in, switching needs Pro | v7.30–7.33, behind `onboarding_enabled` gate (OFF until launch) |
| A10 | Exam-result logging ("Mark result") + Passed badges | /account er-list (v4.93.0) — but see GAP-4 for the Pro-gating nuance |
| A11 | Account deletion (7-day grace) | /account danger zone — see GAP-6 for the Apple in-app requirement check |

## ✅ The work list — ALL DONE (2026-06-11, v7.40.0 → v7.45.0)

| # | Rule (as decided) | Shipped as |
|---|---|---|
| GAP-1 ✅ | **Free daily allowance = 15 practice questions + 5 review cards.** | v7.40.0 (PR #442, gated): migration `20260611_free_tier_15_questions.sql` + proxy `FREE_DAILY_LIMIT` + `SR_FREE_DAILY_CAP` client cap. ⚠️ Migration still needs pasting in Supabase SQL Editor (bundled with June 20). |
| GAP-2 ✅ | **Soft blocker when a free user picks a session bigger than the remaining allowance** | v7.41.0 (PR #443): `_gateSessionSizeForQuota` + daily-limit pre-block screen in startQuiz / startExam / startBulkQuiz (bulk previously had no gate at all). |
| GAP-3 ✅ | **Settings: Daily Goal + Daily Review size controls locked for free users** | v7.42.0 (PR #444): `.tier-pro-only`/`.tier-free-only` body-class system, pro-lock pills, lock-notes, Go Pro CTAs, JS guards. |
| GAP-4 ✅ | **Cross-cert analytics is a Pro feature** | v7.43.0 (PR #445): tier resolved via `get_daily_quota_usage` RPC before render; free → `#cca-pro-gate` upsell; fails open on RPC error. |
| GAP-5 ✅ | **Log-your-exam-result is a Pro feature** | v7.44.0 (PR #446): `renderExamResultsList` returns `.er-pro-lock` upsell for non-admin. Gate-vs-keep-free decided as GATE per mockup-as-spec (Simi may veto). Styling lift of the log-result screen deferred (optional). |
| GAP-6 ✅ | **Apple requires in-app account deletion** | v7.45.0 (PR #447): Settings §03 Danger Zone "Delete my account" row (signed-in only) + mockup confirm flow; same `deletion_requested_at` 7-day-grace mechanism as /account. |

## ⏸ Correctly parked (cannot be built yet — needs billing)

| # | Rule | Blocked on |
|---|---|---|
| P1 | Pro-expired / lapsed-subscription notice (drop to Free, data kept, one-tap renew) | Stripe (web) / StoreKit IAP (iOS) — Phase G |
| P2 | Actual purchase flow behind every "Go Pro" CTA | Phase G / StoreKit |
| P3 | Plan switch (Annual ⇄ Monthly) on /manage-subscription | Phase G (UI shipped inert in v7.39) |

## Proposed implementation order

1. **GAP-1** — the 15/5 caps (foundation numbers; everything else displays them)
2. **GAP-2** — the pre-emptive soft blocker (uses GAP-1's numbers)
3. **GAP-3** — Settings tier locks
4. **GAP-4** — cross-cert Pro gate
5. **GAP-5** — log-result decision + optional styling lift
6. **GAP-6** — in-app deletion check (fold into the pre-submission checklist)
