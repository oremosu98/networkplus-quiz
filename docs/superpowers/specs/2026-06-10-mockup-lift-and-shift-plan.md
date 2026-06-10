# Mockup Lift-and-Shift Plan — cert-ios mockups → the real app (1:1)

**Date:** 2026-06-10 · **Status:** awaiting approval · **Owner decision basis:** Forge session 2026-06-10

## Locked decisions (from the user — do not relitigate)
1. The `mockups/cert-ios-*` + `mockups/onboarding-*` screens are the **design source of truth**.
2. The lift is **one-to-one**. The real app's UI becomes the mockup UI — mobile Safari,
   desktop, and the native iOS wrap all render the **same pixels**.
3. **Desktop presentation: centered app column** (~390–430px phone-proportioned column,
   page background outside it). No desktop-specific re-layout.
4. **Excluded (stay as-is):** landing page, terms & conditions, privacy, pricing.
5. The 4 design skills (design-taste-frontend, emil-design-eng, ui-ux-pro-max, humanizer)
   are pre-authorized wherever restructuring is needed.
6. Subnet / Ports / Topology surfaces are deleted (tombstoned) — they do not participate.

## What this means structurally
The real app today is a sidebar+topbar desktop SPA with 20 `page-*` sections in
`index.html`. The mockup language is a phone column with a bottom tab bar
(Home / Drills / Progress / Account). The lift therefore has one **chrome phase**
(replace sidebar/topbar with the centered column + tab bar, app-wide) and then
**per-screen lifts** inside that chrome. App logic (app.js quiz engine, AI calls,
cloud sync, SR) is NOT rewritten — screens re-skin onto existing state and handlers.

## Mapping — mockup → real surface

### A. Direct lifts (mockup ↔ existing page)
| Mockup | Real surface | Notes |
|---|---|---|
| cert-ios-home | `page-setup` (Home) | Biggest lift; includes day-0 / returning states (`free-home-day0`, `free-capped-home` are Home states) |
| cert-ios-quiz | `page-quiz` + `page-loading` | Generating / question / answered states map to mockup's 3 states |
| cert-ios-results | `page-results` + `session-complete` | |
| cert-ios-review-answers | `page-review` | |
| cert-ios-review | `page-sr-review` | Daily Review (SR) session |
| cert-ios-exam | `page-exam` | `acl-pbq` keeps its interaction, reskinned to tokens |
| cert-ios-exam-results | `page-exam-results` | |
| cert-ios-progress | `page-progress` | Replaces the v7.15 desktop bento (accepted consequence) |
| cert-ios-analytics | `page-analytics` | Replaces the v7.16 bento (accepted consequence) |
| cert-ios-settings | `page-settings` | Incl. the new At-a-glance rows + exam-date sheet |
| cert-ios-custom-quiz | setup's custom-quiz config | Becomes its own screen as in the mockup |
| cert-ios-daily-limit | free quota wall | Restyle of the v7.10 wall |
| cert-ios-report | `.br-*` bug-report drawer | Restyle |
| onboarding-first-run-diag | `page-diagnostic-quiz` / `page-diagnostic-result` | |
| onboarding-loading-states / error-states | `page-loading`, toasts, offline bar | Pattern-level lift |

### B. Lifts in the landing Vercel project (in scope, different repo surface)
| Mockup | Real surface |
|---|---|
| cert-ios-hub / onboarding-my-certs-pro | My Certs (account hub) |
| cert-ios-cross-cert | Cross-Cert Analytics |
| onboarding-signup-signin / magic-link / welcome-back | auth screens (`landing/auth.js`) |
| cert-ios-log-result | "Log a past result" flow on My Certs |
| onboarding-manage-subscription | Manage subscription (Stripe surface) |

### C. Net-new screens (no real counterpart yet)
| Mockup | Notes |
|---|---|
| cert-ios-drills | New Drills tab + launcher (wrong-bank / weak-topics / domain drills already exist as Home actions — they get a home here) |
| onboarding-native-welcome | First-run welcome (native wrap entry) |
| onboarding-free-cert-picker | Exists partially in gated onboarding (v7.30+) — finish to mockup |
| onboarding-notifications-prime | Native permission prime — wrap-only |
| onboarding-plan-picker / pro-iap / pro-welcome / restore-purchase | **Parked with StoreKit/IAP work** — UI can land behind the existing onboarding gate; purchase wiring is its own (gated-lane) phase |
| cert-ios-pro-expired | Lapsed-sub re-entry state |
| onboarding-account-deletion | Account deletion flow |

### D. Real pages with NO mockup (gap list — needs a decision per item)
| Page | Proposal |
|---|---|
| `topic-dive` | Design a mockup in the same language (4 skills), then lift |
| `guided-lab` | Same |
| `acl-pbq` | Keep interaction, token-level reskin inside the exam lift |
| `session-transition` | Micro screen — style during core-loop lift |
| `monitor`, `web-vitals` | Dev-only — exclude |

### E. Demo-only (never lifted)
`onboarding-rollout-flow` (flow diagram), the E2E shell (`cert-ios-app.html` + HUD), sandbox.

## Phasing (each phase = fast-lane ships + Ship checklist; gated lane where flagged)
- **Phase 0 — Chrome:** centered app column + bottom tab bar replaces sidebar/topbar
  app-wide; route map for tabs; pages not yet lifted render inside the column untouched.
  This is the moment the whole app "becomes" the mockup brand.
- **Phase 1 — Core loop:** quiz → results → review-answers (+ loading/generating states).
- **Phase 2 — Home + Settings** (incl. day-0/capped/returning states, exam-date sheet).
- **Phase 3 — Progress + Analytics + SR review + Drills tab (net-new).**
- **Phase 4 — Exam + exam-results + acl-pbq reskin + session-transition.**
- **Phase 5 — Onboarding & paywall arc** behind the existing `app_config` gate
  (cert-picker, diag, daily-limit, pro-expired; IAP screens parked with StoreKit).
- **Phase 6 — Landing-project surfaces** (hub/My Certs, cross-cert, auth, log-result,
  manage-sub) — separate Vercel project, same tokens.
- **Phase 7 — Gap screens** (topic-dive, guided-lab): mock first with the 4 skills,
  user approves, then lift.

## Verification per phase
UAT + Playwright stay green; visual check on iPhone-width viewport vs the mockup
side-by-side; the cert-ios fidelity harness remains the reference imagery. Native wrap
inherits everything — final E2E sign-off (real account, real API key, real quiz) happens
on the wrap after Phase 1–2, then again before store submission.

## Execution home
This plan executes in the **main repo** (new milestone/branch off `main`), NOT the
cert-ios-e2e worktree. The worktree stays the design reference + Capacitor wrap.
Main checkout is currently on `feat/mobile-fit2` — coordinate before branching.
