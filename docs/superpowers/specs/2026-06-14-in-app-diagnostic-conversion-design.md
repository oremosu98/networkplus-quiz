---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# In-app diagnostic: conversion ending, account-page home, and plan-to-practice

**Date:** 2026-06-14
**Status:** Design approved (Simi), pending spec review
**Mockup:** `mockups/diagnostic-conversion/index.html`
**Platforms:** desktop, Safari, iOS (one responsive PWA build)

---

## 1. Goal

Give the **in-app** Baseline Diagnostic a complete ending and afterlife:

1. After the Pass Plan, a soft moment that moves a new user toward a **free account** (primary) or **Pro** (waitlist).
2. A **permanent home** for the saved plan on the account page, differing by tier.
3. A path from a saved plan **into practice** on the exact weak topics.
4. A working way to **re-run** the diagnostic (same cert, or another cert on Pro).

All of it honours the **free daily limit** so nothing dead-ends.

## 2. Scope: which diagnostic this is

There are two diagnostics in the codebase. This spec is **only** about the **in-app** one (the cert-app PWA: `startDiagnostic()` → `completeDiagnostic()` → `#page-diagnostic-result`). The separate **landing** funnel (`certanvil.com/diagnostic/*`) already has its own conversion and is out of scope here.

## 3. Hard constraints

- **App Store safety:** an iOS app may not link out to web checkout for a digital subscription. The Pro path is a **waitlist teaser with no purchase link** until StoreKit in-app purchase ships (Phase G). The existing in-app "Upgrade" buttons that link to `certanvil.com/pricing` must NOT be reused inside this flow.
- **Free tier:** **15 new questions/day** plus a **separate 5 daily reviews** (spaced repetition). The 15 is the pool the Custom Quiz builder caps against; the 5 reviews are untouched.
- **Cert access:** Free = **one cert** (cert-lock). Pro = **all certs**. Certs are separate subdomains ("Pattern A"); cross-cert state aggregates through the cloud profile.
- **Brand:** forged-bronze (the `dg-system` tokens, never the legacy purple `--accent`), Fraunces + Inter, dual-theme with light as the founder-primary, full tinted hairlines (no left-accent-border callouts), symmetric radius. **Zero emoji, zero em-dashes.**
- **No new quiz engine.** Reuse the existing Custom Quiz builder and drill paths.

## 4. Surfaces

### 4.1 Conversion moment (bottom of `#page-diagnostic-result`)
Inline (not a bottom sheet — decided). The full Pass Plan stays as-is; this replaces the lone "Start today's session" button. State-adaptive:

| State | What shows |
|---|---|
| **Anonymous** | Bronze-tinted save panel: headline *"Don't lose your Pass Plan"* (loss-aversion), inline email + **Save it free**, micro: *"Just your email. No password · no card · 15 questions a day"*, plus a line that it lands on the account page. Below: a **Pro at launch** waitlist teaser ($9.99/mo, no purchase link). Below: a quiet *"Start today's session without saving"* escape. |
| **Signed-in Free** | Green *"Saved to your account"* + *"View it on your account page"* link + **Start today's session** + one soft Pro line. No signup nag. |
| **Pro** | *"Pro · synced and unlimited"* + **Start today's session**. Nothing sold. |

Free is primary; the escape keeps it soft.

### 4.2 Account-page home for the Pass Plan
A new "Your Pass Plan(s)" surface on the cert-app account/settings page. Responsive (the same surface reflows to desktop).

- **Free:** one plan card (cert, pass probability ring, taken date, score, weakest domains, **View full plan** + **Retake**). Below it, an upsell panel *"A plan for every cert"* showing the other certs as locked chips with **Get Pro at launch · $9.99/mo**. The one-cert limit becomes the pitch at the moment they would want more.
- **Pro:** a **list** of plans, one per cert run (cert, readiness-coloured ring, taken date, weakest), each opening its full plan, plus **Diagnose another cert**.

### 4.3 Plan → practice
Opening a saved plan shows the full Pass Plan. The **weakest topics are tappable**. Tapping one (or **Drill all weak topics**) opens the **existing Custom Quiz builder** (`#custom-quiz-section`) **pre-loaded** with those topics. The user confirms difficulty and count, then builds the quiz on exactly those topics.

### 4.4 Quota-aware builder (free)
When a free user opens the builder from a plan:
- Show remaining: *"Free plan · N of 15 questions left today."*
- **Cap the count** options at N remaining; higher counts become **"Unlimited · Pro"** (locked nudge). The build button reflects the cap.
- At **0 remaining**, show the gentle back-tomorrow wall + Pro nudge instead of launching a quiz that hits the wall mid-run.
- The 5 daily reviews are a separate pool and are not affected.

### 4.5 Re-diagnostic mechanism
- **Retake (same cert):** the **Retake** action on a plan re-runs `retakeDiagnostic()`, gated by the existing 7-day cooldown (`DIAGNOSTIC_RETAKE_COOLDOWN_DAYS`). Within the cooldown the control reads "Retake in Nd."
- **Diagnose another cert (Pro):** opens a cert picker → navigates via the existing cross-subdomain cert switcher to that cert's app → starts its diagnostic.
- **Free wanting another cert:** routed to the Pro upsell (no other-cert diagnostic until Pro).

## 5. Existing machinery to reuse (no reinvention)

- Result page + flow: `#page-diagnostic-result`, `startDiagnostic()` / `completeDiagnostic()` (app.js).
- Storage: `STORAGE.DIAGNOSTIC` = `nplus_diagnostic`, `saveDiagnostic()` + `_cloudFlush`, `loadDiagnostic()`.
- Custom Quiz builder: `#custom-quiz-section` (Topic, Difficulty, Count) + `drillTopic` / `drillDomain`.
- Retake: `retakeDiagnostic()` + 7-day cooldown constants.
- Cert switching: the Pattern-A cross-subdomain switcher (auth-state.js).
- Quota: `_quotaState` (`used_today`, `daily_limit`, `tier`) for the cap and the wall.
- Free signup: the existing Supabase magic-link auth (auth-state.js / `window.certanvilSupabase`).

## 6. Decisions made

- **Inline** conversion moment (not bottom-sheet).
- Weak-topic clicks route to the **pre-loaded Custom Quiz builder** (not a blind direct-launch), single topic or full set.
- Free path uses **magic-link email** (Apple Sign In is Phase G).
- Pro is a **waitlist teaser** everywhere (App Store safe) until StoreKit.

## 7. Out of scope / Phase G dependencies

- Real StoreKit in-app purchase and Apple Sign In (Phase G).
- The landing-web diagnostic funnel (separate, already shipped).
- Any change to the free 15/day or 5-review limits themselves.

## 8. Resolved decisions (2026-06-14, with Simi)

1. **Account surface:** the Pass Plan home lives on the cert-app **account / settings page** (reuse the existing `#page-settings`/account area, not a new tab).
2. **Pro multi-plan data:** **yes, aggregate every cert's plan into one account view**, read from the cloud profile (`profiles.metadata`), reusing the cross-cert analytics aggregation path (already shipped, v7.43.0).
3. **Retake cooldown:** **keep the 7-day cooldown for all tiers** (Pro included). The wait protects score validity, it is not a paywall.
4. **Lane check:** engineering to verify during the plan (Simi delegated). UI work is fast-lane (app.js/index.html/styles); any touch of gated files (auth-state.js, cloud-store.js, RLS/migrations) for the cross-cert read or the signup trigger routes through the gated lane.

**Reuse note (verified against shipped versions):** the tier infrastructure already exists — free **15 questions + 5 reviews/day** (v7.40.0), **custom quiz already capped at 15 for free** (v7.46.0), **one-cert lock until Pro** (v7.33.0), **cross-cert analytics as a Pro feature** (v7.43.0), account/settings surfaces lifted (v7.37–7.39). This feature is mostly **new UI surfaces wired onto existing tier logic**, not new entitlement plumbing.

## 9. Build process

Mockup is done and founder-approved. On build: follow mockup-first (done) → the four audit passes (`design-taste-frontend`, `emil-design-eng`, `humanizer`, `marketing-psychology`) on the real build → **`review-feature` (4-agent) review**, since this touches accounts and the Pro path → Ship checklist → post-deploy browser verification.
