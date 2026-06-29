---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec, mobile]
---
# Restore Purchases — Design Spec (reconciled to built mockup)

**Date:** 2026-06-16
**Status:** Design built; documents the existing mockup. Lift + wiring is Phase G (and `saas-gated`).
**Scope:** Apple/iOS IAP only. No web/Stripe restore path.
**Built artifact:** [`mockups/onboarding-restore-purchase.html`](../../../mockups/onboarding-restore-purchase.html) (Jun 14). Sibling: [`mockups/onboarding-manage-subscription.html`](../../../mockups/onboarding-manage-subscription.html).

> **Reconciliation note.** An earlier draft of this spec proposed a *Settings-row + bottom-sheet* form. That was wrong — a complete dedicated-screen mockup already existed and is better resolved. This version documents the **actual built design** so nobody lifts the wrong thing. The two corrections: (1) form factor is a full screen with a sticky per-state footer, not a sheet; (2) placement is paywall + sign-in, not a Settings row (Settings has its own `manage-subscription` screen).

---

## 1. Purpose

Apple App Store review **auto-rejects** any app selling a non-consumable / subscription IAP that lacks a reachable "Restore Purchases" control. CertAnvil's Pro is sold via Apple IAP (`onboarding-pro-iap.html`). Restore lets a user who already bought Pro re-activate it after reinstalling, switching devices, or clearing local data — without paying again. Entitlement lives with the Apple ID, so restore is a StoreKit operation, not an account-login operation.

**Web is out of scope.** On web, Pro entitlement is tied to account login (Stripe); "restoring" = signing in. No separate control needed.

---

## 2. Form factor (as built)

- A **full dedicated screen** in a phone frame: status bar → header (back + "Restore purchases") → scrollable body → **sticky footer that swaps its action(s) per state**. NOT a bottom sheet, NOT a settings row.
- **Four states**, swapped in place (mockup uses `.state-chips` to preview them): `idle` · `checking` · `success` · `empty`.
- Design system: forged-bronze oklch token block matching `dg-system.css`; Fraunces serif headings, Inter body; light/dark aware via `[data-theme]`.
- Defining trait: **calm + honest tone.** No alarmist language, no fake spinner. Copy repeatedly reassures ("Nothing is charged again", "We never see your card details", "Restore is honest: it only confirms what Apple already has on file").

---

## 3. Placement (as built)

Per the mockup's own framing: *"reachable from the paywall and from sign-in (a returning Pro user on a new device)."*

- **A. Paywall / upgrade sheet** — restore reachable at the point of purchase (reviewers look for it there).
- **B. Sign-in** — a returning Pro user on a new device hits restore after authenticating.
- **Settings** is handled by the **separate `manage-subscription` screen** (Settings → Subscription: current plan, annual↔monthly switch, Apple billing/cancellation handoff). Restore is not a Settings row in the built design.

---

## 4. States (as built — copy is verbatim from the mockup)

### 4.1 Idle (`#state-idle`)
- Hero: circular-restore-arrow icon (`M21 12a9 9 0 1 1-3-6.7` + `M21 4v4h-4`), title **"Already bought Pro?"**
- Sub: *"Bought Pro on another device? Restore it here with the **same Apple ID** you used to buy it. Nothing is charged again."*
- Footer: primary **"Restore purchases"** + legal note *"CertAnvil checks with Apple. We never see your card details."*

### 4.2 Checking (`#state-checking`)
- Hero title **"Checking with Apple"**, sub *"Looking for a Pro subscription on **you@icloud.com**. This usually takes a moment."*
- A `.checking` card with a clock icon, **"Checking with Apple…"**, *"Confirming your purchase history."*, and a **calm indeterminate progress strip** — a sweeping `.ck-fill` bar, **deliberately not a spinner**. Reduced-motion: static 55%-width bar (no sweep).
- Footer: disabled **"Checking…"** button + same legal note.

### 4.3 Restored / success (`#state-success`)
- `.outcome.ok` card (pass-green accent), check icon, **"Pro restored. Welcome back."**
- Body: *"Your **Pro Annual** plan is active on this device. Every exam is unlocked and the daily cap is gone."*
- Footer: primary **"Continue to CertAnvil"**.

### 4.4 Not found / empty (`#state-empty`)
- `.outcome` card, search icon, **"No subscription found on this Apple ID."**
- Body: *"Make sure you're signed in with the **same Apple ID** you used to buy Pro. You can check it in Settings, at the top of the screen."*
- Footer: primary **"Try again"** + link **"Never bought Pro? Start Pro"** (the empty-state → upgrade nudge).

---

## 5. Behaviour (mockup-level)

- The idle **"Restore purchases"** button previews the flow: `idle → checking → (1600ms) → success`.
- The four chips outside the phone are a *preview affordance only* — they do not ship; they let a reviewer flip states without a live StoreKit call.
- Theme toggle swaps `[data-theme]` and is local to the mockup.

---

## 6. Gaps vs. a production-complete flow (for Phase G — NOT yet designed)

The built mockup is content-complete for the happy paths but does **not** cover:

1. **No distinct network/StoreKit-error state.** There is `empty` (nothing found) but no "Couldn't reach the App Store" state. Today the `empty` state's "Try again" is the only retry affordance. **Phase G must add a real connection-error state** (or explicitly decide to fold transient failures into the empty/Try-again path — but that conflates "no purchase" with "couldn't check", which is a worse user signal). Recommended: add a dedicated `error` state before submission.
2. **Deferred / Ask-to-Buy (family approval) outcome** is not represented.
3. The **"you@icloud.com"** in the checking state is placeholder copy — wire to the real device Apple ID or drop the address.

---

## 7. Wiring notes (Phase G — `saas-gated`, see CLAUDE.md #136)

When this is lifted into live `app.js` + the Capacitor StoreKit bridge:

- Idle "Restore" → Capacitor IAP bridge → StoreKit `AppStore.sync()` / `restoreCompletedTransactions`.
- On **success**, write entitlement and call the **same `is_pro()` / entitlement-refresh path the purchase flow uses**, so dependent UI updates without reload: quota chip (`.pro-lock-pill`), Gauntlet free-tier daily pill (`.gnt-daily-pill`) / drills-card CTA, any `is_pro()`-gated drill.
- **Entitlements + tier quotas are `saas-gated` (issue #136)** — frozen until the paid-SaaS pivot. The restore *lift* is part of that gated work; do not pull it without explicit pivot direction. It also lands in the **gated branching lane** (touches entitlements/auth) per `ENVIRONMENT_STRATEGY.md`.
- At Apple submission, remember the **onboarding go-live SQL flip** (`app_config.onboarding_enabled`) per `docs/mobile/APP_STORE_DISTRIBUTION.md`.

### Edge cases (copy already handles)
- **Different Apple ID than the CertAnvil login:** StoreKit reflects the *device's* Apple ID. The empty-state copy correctly says "none found on *this* Apple ID" rather than "you don't have Pro."
- **Already Pro:** restore re-confirms; show the success state. Harmless.

---

## 8. Out of scope (deliberately deferred)
- Web/Stripe restore affordance (web = sign in).
- The StoreKit / Capacitor bridge implementation and server-side receipt validation (Phase G).
- The network-error and deferred-purchase states (flagged in §6 as Phase G additions).
