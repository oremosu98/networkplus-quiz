# Restore Purchases — Design Spec

**Date:** 2026-06-16
**Status:** Approved for planning
**Scope:** Apple/iOS IAP only. No standalone page. No web/Stripe restore path.
**Phase context:** Pre-Phase-G. This is a mockup-first design artifact; StoreKit/Capacitor wiring lands when Phase G builds the IAP bridge.

---

## 1. Purpose

Apple App Store review **auto-rejects** any app selling a non-consumable / subscription IAP that lacks a reachable "Restore Purchases" control. CertAnvil's Pro tier is sold via Apple IAP (`onboarding-pro-iap.html` — "Go Pro · pay with Apple"), but no restore affordance exists anywhere in mockups or live code. This spec defines that control.

Restore lets a user who already bought Pro re-activate it after: reinstalling the app, getting a new device, or clearing local data — without paying again. On Apple, entitlement lives with the Apple ID, so restore is a StoreKit operation, not an account-login operation.

**Web is explicitly out of scope.** On web, Pro entitlement is tied to account login (Stripe), so "restoring" = signing in. No separate control needed there.

---

## 2. Form factor (decided)

- **NOT a standalone page.** A button + result sheet.
- Two touchpoints:
  - **A. Settings** — a "Restore purchases" row in a new "Subscription" section.
  - **B. Paywall / upgrade sheet** — a secondary "Already purchased? Restore" link under the primary CTA, because reviewers look for restore at the point of purchase.

---

## 3. Placement detail

### A. Settings → new "Subscription" section
Sits above the **Danger zone** section, below account info, in `cert-ios-settings`.

- Section label: `.sect` → **"Subscription"**
- Row: `.btn-ghost` button → **"Restore purchases"**
  - Icon: reuse the existing circular-arrow restore glyph already used for snapshot restore:
    `M3 12a9 9 0 1 0 3-6.7L3 8` + `M3 3v5h5` (24×24, stroke-based, consistent with the settings icon set).
- Helper note: `.card-note` →
  *"Already bought Pro on another device or after reinstalling? Restore it here."*

### B. Paywall / upgrade sheet
- Under the main "Go Pro" CTA in `onboarding-upgrade-sheet` / `onboarding-pro-iap`:
  - Secondary text link → **"Already purchased? Restore"**
- Triggers the identical restore flow + result sheet as the Settings row (shared component).

---

## 4. Interaction states

Tapping **Restore** invokes StoreKit via the Capacitor IAP bridge (`AppStore.sync()` / `restoreCompletedTransactions`).

| State | UI |
|---|---|
| **In-progress** | Triggering control shows an inline spinner + label **"Checking with Apple…"**, disabled for the duration. Restore can take 2–5s; never leave the control looking idle. |
| **Restored ✓** | **Result sheet** — bronze check icon. Title **"Pro restored"**. Body: *"Your CertAnvil Pro is active again — unlimited Gauntlet and every drill."* Primary action: **"Continue"** (dismiss). Side effects in §5. |
| **Nothing to restore** | **Result sheet** — neutral icon. Title **"No purchases found"**. Body: *"We didn't find a Pro purchase on this Apple ID. If you bought with a different Apple ID, sign into that one in iOS Settings."* Primary action: **"Go Pro"** (routes to paywall). Secondary: **"Close"**. |
| **Couldn't connect** | **Result sheet** — muted alert icon. Title **"Couldn't reach the App Store"**. Body: *"Check your connection and try again."* Primary action: **"Try again"** (re-runs restore). Secondary: **"Close"**. |

### Result sheet component
- Bottom sheet using the existing drawer pattern: `--ease-drawer` (`cubic-bezier(0.32,0.72,0,1)`), forged-bronze tokens, `.card`-family visual language.
- Single shared sheet; the three states differ only in icon + copy + button set.
- Dismissable via backdrop tap and the secondary/primary actions.

---

## 5. Wiring notes (for the implementation plan — NOT built in this design step)

- On **Restored**, write entitlement locally and call the **same `is_pro()` / entitlement-refresh path the purchase flow uses**, so dependent UI updates without a reload:
  - quota chip (`.pro-lock-pill`) flips to Pro,
  - Gauntlet free-tier daily pill (`.gnt-daily-pill`) / drills-card CTA re-render,
  - any `is_pro()`-gated drill unlocks.
- The restore control is a shared function called from both touchpoints (Settings row + paywall link) — one implementation, two mount points.

---

## 6. Edge cases

- **Different Apple ID than the logged-in CertAnvil account:** StoreKit restore reflects the *device's* Apple ID, which may differ from the app login. The "No purchases found" copy nudges the user to check iOS Settings rather than implying they never paid. Do **not** claim "you don't have Pro" — claim "none found on *this* Apple ID."
- **Already Pro when tapping Restore:** flow still runs; StoreKit returns the existing entitlement; show the "Pro restored" sheet. Harmless and reassuring — no special-case needed.
- **Active auto-renewing subscription mid-cycle:** restore re-confirms the current entitlement; treat identically to "Restored."
- **Pending/deferred (Ask to Buy / family approval):** out of scope for this design; if StoreKit returns deferred, fall through to "Couldn't connect"-style retry messaging. Revisit during IAP bridge build.

---

## 7. Deliverable

A new mockup: **`mockups/onboarding-restore-purchases.html`**

- Demonstrates the Settings "Subscription" section + row, and all three result-sheet states (toggleable so the states can be reviewed without a real StoreKit call).
- Built in the forged-bronze design system (oklch token block matching `dg-system.css` + the onboarding mockups), light/dark aware.
- This is the design artifact only. It gets "lifted" into live `app.js` + wired to the Capacitor StoreKit bridge during Phase G — not in this step.

---

## 8. Out of scope (deliberately deferred)

- Web/Stripe restore affordance (web = sign in).
- Standalone Restore page.
- The actual StoreKit / Capacitor bridge implementation (Phase G).
- Server-side receipt validation specifics (covered by Phase G entitlement work).
