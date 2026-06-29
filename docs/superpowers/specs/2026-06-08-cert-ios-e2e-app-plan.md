---
type: spec
status: active
cert: all
updated: 2026-06-29
tags: [spec, mobile]
---
# CertAnvil iOS E2E Dummy App — Build Plan

**Status:** Plan approved for execution (not yet built)
**Date:** 2026-06-08
**Branch (to create):** `feat/cert-ios-e2e` off `origin/main`
**Author:** planning session

---

## 0. One-paragraph summary

Stitch the existing `cert-ios-*` mockups into a single live, navigable, real-time
iOS app flow that is a **1:1 carbon copy** of those mockups — no reinterpretation.
Build it as a lightweight **SPA shell** (browser + Mobile Safari first), then **wrap
it with Capacitor** to run on the iOS Simulator and bridge toward the App Store. Add a
clean, removable **Pro-user demo bypass** so the full paywalled flow can be walked end
to end. Fill the four screens the E2E flow needs but the mockups don't yet have
(paywall, Sign in with Apple, splash/empty/error, account) via the standard 4-pass
design pipeline. This becomes the visual source of truth for the later Desktop +
Mobile Safari rebuild (UI uniformity) and the entry point for cross-platform
Apple-credentials login.

---

## 1. What already exists (grounding — verified against `origin/main`)

**Mockups (source of truth, on `origin/main` under `mockups/`):**
- `cert-ios-home.html` — home / readiness, pass-celebration state, theme toggle
- `cert-ios-hub.html` — cert hub with free/Pro **cert-switch gate**
- `cert-ios-exam.html` — exam: selection, flagging, submit modal → routes to results
- `cert-ios-exam-results.html` / `cert-ios-results.html` — scaled score + domain breakdown
- `cert-ios-quiz.html` / `cert-ios-custom-quiz.html` — quiz modes
- `cert-ios-progress.html` — swipe-paged progress
- `cert-ios-analytics.html` — swipe-paged analytics, dynamic visualizations
- `cert-ios-report.html` — report-an-issue flow
- `cert-ios-cross-cert.html` — cross-cert view
- `cert-ios-settings.html` — settings, theme toggle
- All screens carry the in-app **dark/light theme toggle** (localStorage-persisted)

**Full Apple-compliant onboarding / IAP / account suite (also on `main`, registered in
`onboarding-sandbox.html`):** this is a complete first-run-to-subscription lifecycle —
NOT a gap. Screens:
- `onboarding-native-welcome.html` — launch / splash
- `onboarding-signup-signin.html` — Sign in with Apple / account step
- `onboarding-magic-link-sent.html` — magic-link sent
- `onboarding-welcome-back.html` — returning-user sign-in
- `onboarding-plan-picker-concept.html` — plan picker
- `onboarding-free-cert-picker.html` — free cert selection
- `onboarding-free-home-day0.html` — day-0 free home
- `onboarding-first-run-diagnostic.html` — first-run diagnostic
- `onboarding-free-capped-home.html` — free cap reached (paywall trigger)
- `onboarding-pro-iap.html` — Apple In-App Purchase moment
- `onboarding-upgrade-sheet.html` — Pro upgrade sheet
- `onboarding-pro-welcome.html` — post-purchase Pro welcome
- `onboarding-my-certs-pro.html` — Pro: all certs unlocked
- `onboarding-restore-purchase.html` — Apple-required restore path
- `onboarding-manage-subscription.html` — manage subscription (Apple)
- `onboarding-notifications-prime.html` — notifications priming
- `onboarding-account-deletion.html` — Apple-required account deletion
- `onboarding-error-states.html` — error states
- `onboarding-loading-states.html` — loading/empty states
- `onboarding-rollout-flow.html` — rollout/first-run routing
- `onboarding-sandbox.html` — the hub that registers/links all the above via JS `data-act`

**The real app lives in the same repo (NOT greenfield):**
- `index.html`, `app.js` — production cert app
- `lib/router.js` → `window.certanvilRouter` with `getTier(profile)` → `free|pro|admin`,
  `certHost(certId)`
- `lib/cert-lock.js` → `window._certLock.check()` drops a full-screen upsell wall when a
  free user opens a non-owned cert. **Fails open.**
- `auth-state.js` → Supabase auth, apex cookie on `.certanvil.com`, sign-in routed through
  `certanvil.com/?action=signin&return=<url>`. `getAvailableCerts()` lists certs;
  `netplus` = free, everything else (`secplus`, `az900`, `ai900`, `sc900`, `clfc02`,
  `aplus-core1/2`) = `pro`.
- `manifest.json`, `sw.js` — it is already a PWA (multi-cert subdomains:
  `networkplus / security / azure / aplus / aws .certanvil.com`)
- Shared design tokens: `dg-system.css`, `dg-depurple.css` (reuse for uniformity)
- `playwright.config.js` — test harness already present (use for fidelity diffing)

**Implication:** tier gating has a *single source of truth* — `getTier()`. The Pro bypass
hooks there and nowhere else. The mockups are static, self-contained docs; the dummy app
is a **presentation harness over the untouched mockups**, which keeps fidelity perfect and
preserves the mockups as the design source for the later rebuild.

---

## 2. Architecture decisions (locked this session)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Shell / target | **SPA shell**, browser + Mobile Safari first; **Capacitor** wrapper on top for iOS Simulator / App Store as a later phase |
| D2 | Pro bypass | **Demo flag** overriding `getTier()`→`pro`; short-circuits `cert-lock.js` wall + flips gated mockup UI; one chokepoint, trivially removable |
| D3 | New screens now | **None needed — all screens already exist.** The full Apple onboarding/IAP/account suite is present (see §1). Scope is **pure stitching**, not screen creation. The 4-pass pipeline (`/design-taste-frontend`→`/emil-design-eng`→`/humanizer`→`/marketing-psychology`) is reserved for any genuinely new screen we spot mid-build. |
| D4 | Location | Branch `feat/cert-ios-e2e` off `origin/main`; this plan in `docs/superpowers/specs/` |
| D5 | Fidelity | **1:1 with mockups is non-negotiable** and overrides every other concern |
| D6 | Payments | Stripe parked (desktop, near launch). iOS = **StoreKit IAP** later. This phase builds paywall *UI* only — no payment wiring (same posture as Stripe). |
| D7 | Flow sequencing | **Option B — representative happy-path.** The demo force-walks only the normal new-user spine (welcome → sign-in → cert-picker → home → study → free cap → upgrade-sheet → IAP → Pro). Apple-required + rare screens (restore-purchase, manage-subscription, account-deletion, error/loading) **exist and work** but are reachable via menu/side-doors, not forced into the main path. Rationale: a real user never sees all ~19 screens in one sitting; forcing them would misrepresent the experience. |
| D8 | What "1:1" means (chrome) | **Match the app screen, drop the picture-frame.** Live app renders only the inner `.screen` contents full-bleed; the `.stage` caption + drawn `.phone` bezel are gallery scaffolding, stripped via injected shell CSS (mockup files untouched). The shell adds **no chrome** — every `.screen` carries its own notch/status bar/top bar/(tab bar on home screens). See §3a. |

---

## 3. Technical approach — the SPA shell

**Goal:** make 12 standalone HTML mockups behave as one real-time app **without editing
the mockups**, so fidelity is guaranteed by construction.

**Shell model — iframe-per-view stack (fidelity-first):**
- One shell document (`cert-ios-app.html`) owns a **view stack** and **transitions**
  (push/pop with iOS-style slide). Each view is the **untouched mockup loaded in an
  iframe** → perfect CSS/JS isolation → zero fidelity drift by construction.
- **Shared state across views via same-origin `localStorage`** (theme + `demo_pro`
  already use it, so they sync for free) plus a tiny **`postMessage` nav bridge**: a
  mockup asks the shell to navigate (`{nav:'cert-ios-exam'}`), the shell runs the
  transition and pushes the next iframe.
- The shell injects a small **runtime shim** into each iframe on load (mockups stay
  untouched on disk): the shim (a) reads `demo_pro` and overrides `getTier`, (b) flips
  gated UI to unlocked, (c) rewrites in-mockup links/`data-act` into `postMessage` nav
  calls so existing buttons drive the stack.
- **Chrome ownership:** audit each mockup first. If a mockup already renders its own iOS
  status bar / tab bar, the shell must **not** add or duplicate chrome — it only provides
  the transition container + shared state. The shell never re-renders chrome a mockup owns.
  (This is the most common way fidelity breaks — guard it explicitly.)

### 3a. Chrome ownership — VERIFIED against the mockups (the #1 fidelity risk, now resolved)

Every mockup (both `cert-ios-*` and `onboarding-*`) shares one structure:

```
<body>
  <div class="stage">          ← page background (gallery only)
    <div class="stage-head">   ← caption/headline above the phone (gallery only)
    <div class="phone-wrap">
      <div class="phone">      ← drawn iPhone bezel (gallery only)
        <div class="screen">   ← THE APP. full-bleed target for the live app
          <div class="notch"> <div class="statusbar">9:41…  ← each screen's OWN status bar
          <div class="topbar">                              ← each screen's OWN top bar
          … content …
          <div class="tabbar">                              ← home-type screens' OWN tab bar
```

Confirmed: `cert-ios-home` and `onboarding-free-home-day0` are structurally identical
(stage → phone-wrap → phone → screen → notch → statusbar → … → tabbar). `cert-ios-exam`
has a status bar but no tab bar (focused mode — preserved as-is).

**Consequences for the shell (D8):**
- The shell renders **only `.screen`**, full-bleed in the real viewport. It strips
  `.stage-head` and neutralises the `.phone` / `.phone-wrap` bezel via an **injected
  stylesheet** — the mockup files are never edited (fidelity preserved).
- The shell adds **zero chrome**. Status bar, top bar, and tab bar are owned by each
  `.screen`. Adding shell chrome would double up and break fidelity instantly.
- `.screen` is a fixed phone size; the shell sizes/positions it to fill the device
  viewport (`position:fixed; inset:0`) rather than centring it in a bezel.
- The tab bar is per-screen, so the active-tab state is baked into each mockup. Fine for
  the demo; just don't expect a single shared tab bar to persist across views.

**Why iframe-per-view over inline-extraction:** the 1:1 guarantee is the top constraint.
Inlining each mockup's `<body>`+`<style>` into one document gives smoother transitions and
simpler shared JS but risks CSS collisions = fidelity drift. iframes render each mockup
exactly as authored. Revisit inline-extraction only if transition quality demands it, and
only behind a passing fidelity diff.

**Capacitor (later phase):** wrap the shell as a WKWebView app, run on iOS Simulator.
StoreKit IAP wiring for the paywall is deferred (parked alongside Stripe). Capacitor gives
the literal "app on a phone" feel and the App Store bridge.

---

## 4. The Pro-user demo bypass (D2)

Single chokepoint, clearly labelled, can't leak to production:

1. **Trigger:** `?pro=1` URL param OR `localStorage.demo_pro = '1'` (set via a visible
   "Demo: become Pro" control in the shell, and auto-set when the user taps *Unlock Pro*
   on the new paywall screen so the walkthrough flows naturally).
2. **Override:** the injected shim wraps `window.certanvilRouter.getTier` to return `'pro'`
   when `demo_pro` is on.
3. **Wall short-circuit:** `cert-lock.js` already exempts pro/admin via `getTier`, so the
   override alone disarms the upsell wall. No edit to `cert-lock.js`.
4. **Mockup gate UI:** the shim flips `cert-ios-hub` cert-switch from locked→unlocked and
   any "Pro" lock badges/overlays to their unlocked state.
5. **Removal:** one shim file + one shell control. Gated behind a `DEMO` constant; document
   how to strip for production. Bypass never ships in a real build.

**Documented-but-deferred alternative:** seed a fake `tier:pro` Supabase profile so the
*real* entitlement path runs end to end. Adopt when auth comes into scope.

---

## 5. Canonical E2E flow map (all existing mockups — nothing net-new)

**Free path hits the cap, then purchase/bypass unlocks Pro — the bypass is the bridge:**

```
Cold launch
  └─ onboarding-native-welcome            (splash / launch)
       └─ onboarding-rollout-flow         (first-run routing)
            ├─ new user ─→ onboarding-signup-signin   (Sign in with Apple)
            │                 └─ onboarding-magic-link-sent
            └─ returning ─→ onboarding-welcome-back
                                  │
                                  ▼
                       onboarding-plan-picker-concept
                                  ▼
                       onboarding-free-cert-picker
                                  ▼
                       onboarding-free-home-day0
                                  ▼
                       onboarding-first-run-diagnostic
                                  ▼
                       onboarding-notifications-prime
                                  │
                                  ▼  ── enter the main app ──
                            cert-ios-home  ←→  cert-ios-hub
                                  │            (Pro certs shown locked)
                                  ▼
                  ┌─ study (free) ─→ cert-ios-quiz / -custom-quiz / -exam
                  │                       │ submit modal
                  │                       ▼
                  │                cert-ios-results / cert-ios-exam-results
                  │                       ▼
                  │            cert-ios-progress · cert-ios-analytics · cert-ios-report
                  │
                  └─ hit free cap / tap Pro cert
                                  ▼
                       onboarding-free-capped-home   (paywall trigger)
                                  ▼
                       onboarding-upgrade-sheet      (Pro upgrade sheet)
                                  ▼
                       onboarding-pro-iap            (Apple IAP moment)
                                  │ purchase  ── OR ──  ╔═ DEMO BYPASS: sets demo_pro ═╗
                                  ▼
                       onboarding-pro-welcome
                                  ▼
                       onboarding-my-certs-pro       (all certs unlocked)
                                  ▼
                            cert-ios-hub (UNLOCKED — switch certs freely)
                                  │
                       ┌──────────┴───────────┐
                       ▼                       ▼
                 cert-ios-cross-cert     full Pro study loop (as above)

Account / lifecycle (reachable from cert-ios-settings):
  onboarding-manage-subscription · onboarding-restore-purchase · onboarding-account-deletion

Cross-cutting states, woven in where they occur:
  onboarding-loading-states (hydration, exam load, results compute)
  onboarding-error-states   (no-network, failed purchase, failed sync)
```

---

## 6. Gap analysis — VERIFIED COMPLETE (no net-new screens needed)

**Correction (2026-06-08):** an earlier draft of this plan flagged paywall, Sign in with
Apple, splash, account, and error/loading as missing. That was wrong — it only searched
the `cert-ios-*` names. The full Apple lifecycle already exists under `onboarding-*` and is
registered in `onboarding-sandbox.html`:

| Earlier "gap" | Already exists as |
|---------------|-------------------|
| Splash / launch | `onboarding-native-welcome.html` |
| Sign in with Apple | `onboarding-signup-signin.html` + `onboarding-magic-link-sent.html` + `onboarding-welcome-back.html` |
| iOS paywall / Unlock Pro | `onboarding-free-capped-home.html` (trigger) → `onboarding-upgrade-sheet.html` → `onboarding-pro-iap.html` |
| Account / profile / subscription | `onboarding-manage-subscription.html`, `onboarding-restore-purchase.html`, `onboarding-account-deletion.html` |
| Empty / loading / error states | `onboarding-loading-states.html`, `onboarding-error-states.html` |

So the E2E build is **pure stitching of existing mockups**. The only thing the bypass
adds is the `demo_pro` shortcut *alongside* the real `onboarding-pro-iap` purchase path —
it does not replace a missing screen.

**4-pass pipeline — reserved, not currently triggered.** If we genuinely spot a new
screen/state mid-build, it goes through the mandatory order
`/design-taste-frontend` (1st) → `/emil-design-eng` (2nd) → `/humanizer` (3rd) →
`/marketing-psychology` (4th). As of now, none are needed.

---

## 7. Fidelity safeguard (the 1:1 guarantee)

- **By construction:** mockups loaded untouched in iframes → live view === mockup file.
- **By test:** Playwright visual-regression. For each screen, compare the **mockup's
  `.screen` region** (clip to that element in the gallery file) against the **live
  full-bleed `.screen`** in the shell, in **both themes**, and assert pixel-identical. Note
  the comparison target is `.screen`, NOT the whole gallery page (the bezel + caption are
  intentionally dropped per D8). Wire into the existing `playwright.config.js`. A diff =
  a release blocker.
- **WKWebView ≠ Mobile Safari — test the real target early.** WKWebView (Capacitor) and
  Mobile Safari render differently enough to break a hard 1:1 gate. Do **not** defer the
  Capacitor target to the end: stand up a minimal Capacitor smoke build in **Phase 1**
  (shell + 1 screen on the iOS Simulator) and run the fidelity diff against **both**
  Mobile Safari *and* WKWebView from then on. Catch render deltas screen-by-screen, not
  after the whole flow is built.
- **Chrome guard:** automated check that the shell adds no status-bar/tab-bar pixels a
  mockup already owns.
- **When a mockup lacks a state the flow needs:** do **not** improvise inside the shell —
  build the missing state as a proper new mockup through the 4-pass pipeline, then load it
  like any other. Mockups stay the single source of truth.

---

## 8. Foundation notes — desktop / Safari rebuild + Apple-credentials sync

Decisions made deliberately to keep later phases clean (not built now):
- **Mockups remain the shared design source.** The dummy app is a harness over them; the
  Desktop + Mobile Safari rebuild lifts the *same* mockup markup + `dg-system.css` tokens
  for true UI uniformity.
- **Single tier source (`getTier`)** keeps entitlement logic portable across platforms.
- **Sign in with Apple screen built now** is the seam for the eventual cross-platform login
  (web / Safari logging in with Apple credentials).
- **State keys (`theme`, `demo_pro`, exam progress)** namespaced in `localStorage` now so a
  real sync layer can later mirror them across platforms.
- **Out of scope this phase (acknowledge, don't design):** real Stripe, real StoreKit IAP,
  real Apple auth, and the 3-platform live sync engine.

---

## 9. Phased execution roadmap (next sessions — not this one)

- **Phase 0 — Setup:** create `feat/cert-ios-e2e` off `origin/main`; confirm all mockups
  present; stand up preview server.
- **Phase 1 — Shell skeleton + early WKWebView smoke:** `cert-ios-app.html` view stack +
  iOS push/pop transitions; load 2 existing mockups in iframes; postMessage nav bridge;
  shared `localStorage` state. **Also** stand up a minimal Capacitor build and run it on the
  iOS Simulator now, so WKWebView render deltas are caught from the start (see §7).
- **Phase 2 — Wire ALL existing screens:** route the `cert-ios-*` screens **and** the full
  `onboarding-*` suite into the canonical flow (§5); per-mockup chrome audit; rewire
  in-mockup buttons via the shim. (No screen creation — everything already exists.)
- **Phase 3 — Pro bypass:** shim + "Demo: become Pro" control sitting alongside the real
  `onboarding-pro-iap` path; verify wall disarmed + hub unlocked; both themes.
- **Phase 4 — Lifecycle + states pass:** wire the Apple-required paths (restore-purchase,
  manage-subscription, account-deletion) and weave `onboarding-loading-states` /
  `onboarding-error-states` into the right moments. Only invoke the 4-pass pipeline if a
  genuinely new screen surfaces here.
- **Phase 5 — Fidelity harness:** Playwright pixel-diff every screen × both themes; chrome
  guard; make it a blocking check.
- **Phase 6 — Capacitor wrap:** WKWebView app, run on iOS Simulator; verify full E2E on
  device-like target. (StoreKit/Apple-auth still stubbed.)
- **Phase 7 — Walkthrough:** record/verify the full free→paywall→bypass→Pro E2E in realtime.

---

## 10. Open questions to resolve at execution time
- ~~Do mockups render their own status/tab bar?~~ **RESOLVED → yes, all of them do** (see
  §3a + D8). Shell adds no chrome; renders `.screen` full-bleed, strips the bezel/caption.
- ~~`cert-ios-results` vs `cert-ios-exam-results`?~~ **RESOLVED → both, different paths.**
  `cert-ios-results` = practice quiz/session-complete screen; `cert-ios-exam-results` =
  scaled-score reveal after a full 90-question exam (pass/fail + domain breakdown). Flow
  map routes quiz→results, exam→exam-results.
- ~~Walk the entire lifecycle or a happy-path subset?~~ **RESOLVED → Option B** (see D7):
  happy-path spine forced; Apple-required + rare screens reachable but not forced.
- Preferred slide-transition timing to feel native (match iOS defaults).
- Confirm every `onboarding-*` screen carries the same theme toggle + iOS visual system as
  the `cert-ios-*` set (spot-check during the chrome audit).
```
