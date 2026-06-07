# Onboarding / Activation / Routing · BUILD PLAN

> Implementation plan for lifting the approved mockups to prod. Reads against `ONBOARDING_ACTIVATION_DECISIONS.md` (strategy, LOCKED) and the two approved mockups (`mockups/onboarding-first-run-concept.html`, `mockups/onboarding-batch2-concept.html`). Status: DRAFT for walkthrough, no code written.
>
> **Core framing (decision doc §6b):** this is an ON-RAMP, not a rebuild. Net-new code is small: the router, the activation gate, the first-run sequence, and the tier chrome. Quizzes / readiness / Daily Review / My Certs are reused as-is.
>
> **Build discipline (founder hard-rule):** every surface runs `/design-taste-frontend` → `/emil-design-eng` → `/humanizer`, framed throughout by `/onboarding`. Forged-bronze via scoped `dg-system.css` overrides only (never edit `styles.css`). Sec-P7: no inline `on*=`.

---

## Current state (from codebase mapping, read-only)

| Concern | Today | File anchors |
|---|---|---|
| Entry / boot | No router. `goSetup()` → `showPage('setup')` lands on `#page-setup` (cert home) | `app.js` showPage ~2205, goSetup ~2259-2300 |
| Cert resolution | `detectCert()` (subdomain → `?cert=` → localStorage → default netplus) | `app.js` 75-172, `window.CURRENT_CERT` / `CERT_PACK` |
| Auth | Supabase, cookie-backed cross-subdomain session; `getSession()` at boot; `onAuthStateChange` SIGNED_IN | `auth-state.js`, `lib/supabase.js` |
| Cloud profile | `profiles.metadata` jsonb + `quiz_history`; hydrate on SIGNED_IN; per-cert `metadata.sr.<certId>` | `cloud-store.js` |
| My Certs / switcher | Exist (landing My Certs modal + topbar cert switcher + cross-cert analytics) | `auth-state.js`, `landing/auth.js` |
| Quiz / diagnostic / readiness / Daily Review | All exist and work | `app.js` + `certs/*.js` |
| lastActiveCertId / activation flag / lobby router | **Do not exist yet** | — (this build) |

---

## What we build (the thin layer)

### Phase 0 · Foundations — the router + state (GATED LANE)
1. **Lobby router** `routeOnLaunch(session, profile)` — new `lib/router.js` (or scoped into `auth-state.js`). Runs after auth resolves on boot. Implements the decision-doc §6 order: logged out → landing; logged in → tier → current cert → `activated[certId]?` → first-run vs cert home. The app boot (`goSetup()` path) defers to this instead of always showing `#page-setup`.
2. **Per-cert activation flag** `metadata.activated.<certId>` — same shape as shipped `metadata.sr.<certId>`. Derive from "has a readiness score for this cert" or set explicitly at first-run completion. Read/write via `cloud-store.js`.
3. **`metadata.lastActiveCertId`** — written on cert switch / cert use; read by the router for Pro last-active routing. `cloud-store.js` + `auth-state.js`.
4. **Neutral boot skeleton** — a brief forged-bronze loading state so auth resolves with no flash of landing (decision-doc §6). Maps to spine mockup screen 1.
5. **Schema** — if `metadata` shape needs a migration, it carries a tested `-- ROLLBACK:` block (gated-lane rule).

### Phase 1 · First-run spine — maps to `onboarding-first-run-concept.html`
| Mockup screen | Real surface | Reuses |
|---|---|---|
| Lobby resolve | the boot skeleton (Phase 0.4) | — |
| Cert picker | new first-run screen (free auto-assigns; Pro picks) | cert packs, My Certs data |
| Diagnostic intro (+ **Skip for now**) | new framing screen | — |
| Diagnostic ~15Q | **existing** diagnostic/quiz engine, "calibration" framing | quiz engine |
| Score reveal | **existing** readiness score, first-run framing + count-up | readiness |
| +5 movement (the aha) | **existing** quiz + readiness recompute | quiz + readiness |
| Habit hook | seeds **existing** Daily Review (SR) | SR / `metadata.sr.<certId>` |

Surfaces: `index.html` (new first-run page structures), `app.js` (first-run state machine wiring the existing engines), `dg-system.css` (lift forged-bronze from the mockup). Diagnostic is FREE/uncounted and SKIPPABLE (decision-doc §2).

### Phase 2 · Tier chrome — maps to `onboarding-batch2-concept.html`
| Mockup screen | Real surface | Reuses |
|---|---|---|
| Free home (quota 5+15, no switcher, +Add a cert·Pro) | `#page-setup` cert home + tier chrome | cert home |
| Pro home (switcher, unlimited) | `#page-setup` + promoted switcher | cert home + existing switcher |
| Switcher sheet ("Your exams", per-cert readiness, Take-diagnostic) | existing My Certs promoted into topbar | My Certs + activation flag |
| Upgrade: daily cap | new sheet, **tier/quota STUBBED** | — |
| Upgrade: add a 2nd exam ($9.99/mo · $89/yr) | new sheet, links to pricing; **no Stripe yet** | `landing/pricing.html` |
| Coachmark | new lightweight component, `metadata.tours.<surfaceId>` + "skip all tips" Settings toggle | — |

Surfaces: `index.html` (home chrome, sheets, coachmark), `app.js` (tier logic stubs, quota display, switcher promotion), `dg-system.css`.

---

## Tier / entitlements = STUBBED (saas-gated #136)

The routing skeleton + chrome can be built now; the **real** tier checks are frozen until the paid-SaaS pivot. Stubs:
- `profile.tier` → `'free' | 'pro'` read from profile, stubbed (default free, or a dev override) until #136.
- Quota (5 review + 15 new) → display + soft counters stubbed; hard enforcement gated.
- Upgrade CTAs → point at `landing/pricing.html`; no Stripe (that is `phase_4_stripe_architecture`, separate).

---

## Build order

1. **Phase 0** — router + activation gate + lastActiveCert + boot skeleton. Invisible plumbing, independently testable (route a logged-in user correctly; no first-run regressions for existing users).
2. **Phase 1** — first-run spine (the activation path), wiring existing diagnostic/readiness/SR.
3. **Phase 2** — tier chrome (homes, switcher, upgrades, coachmark) with tier stubbed.

Each phase: build → `/design-taste-frontend` → `/emil-design-eng` → `/humanizer`, then the Ship checklist + post-deploy live-verify.

---

## Gated-lane process (CLAUDE.md / ENVIRONMENT_STRATEGY.md)

Touches `auth-state.js`, `cloud-store.js`, `lib/supabase.js`, possibly `sw.js` + a migration → **gated lane**: feature branch → PR (auto Supabase branch DB + Vercel preview + CI) → smoke-test preview → squash-merge. NOT a fast-lane push. Migrations dated ≥ 2026-05-12 carry a tested `-- ROLLBACK:`.

---

## Open risks / coordination

1. **`auth-state.js` overlap with in-flight `feat/mobile-fit2`** — that branch has uncommitted edits to `auth-state.js` (+ `app.js`, `index.html`). Building routing in parallel on the same file risks a painful merge. **Resolve before cutting the routing branch** (land/commit mobile-fit2 first, or accept careful manual merge).
2. **Native shell (Capacitor) packaging** — the Option B lobby must work inside the webview; entangled with the PWA-vs-IPA decision and OAuth (~July). The router is shell-agnostic (decides destination), but verify the start-URL behavior when the native shell lands.
3. **Tier entitlements frozen (#136)** — confirm with founder before wiring any live tier/quota enforcement.
4. **Mockups + decision doc are untracked** — commit them (fast-lane, docs/mockups) so the build references a committed baseline.

---

**Next:** walk this plan, settle the `auth-state.js` / branch question, then build Phase 0 on an isolated branch.
