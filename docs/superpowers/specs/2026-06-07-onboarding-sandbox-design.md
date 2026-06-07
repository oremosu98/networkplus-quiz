# Onboarding Sandbox — Design Spec (2026-06-07)

**Goal:** Give the founder an installable, phone-framed playground to see and interact with the full onboarding flow + the new free-tier cert lock on their iPhone — today, without waiting for the App Store and without juggling real accounts/state.

**Why:** Everything is currently only visible via screenshots or by setting up real free accounts + `?onb=1` flags on prod. The founder wants to *physically tap through* the flow on their device (iPhone 13 Pro Max).

---

## Locked decisions (founder, 2026-06-07)

1. **Hybrid composition:** the cert-lock wall and first-run flow are *truly live and interactive*; the other six screens show the *approved static design mockups*, clearly labelled "design"; plus a button into the real app.
2. **Installable mini-app:** lives at a single URL the founder Adds to Home Screen; launches full-screen (standalone), feels native.
3. **Target device:** iPhone 13 Pro Max (428×926 logical, notch + home-indicator safe areas).
4. **Fast lane:** static `mockups/` page + docs only. No gated files, no version bump.

---

## Architecture

### Location & delivery
- Single self-contained file: **`mockups/onboarding-sandbox.html`**. `/mockups/` is deploy-served (per `vercel.json`), so it goes live at `https://networkplus.certanvil.com/mockups/onboarding-sandbox.html` on push to `main`.
- **Unlinked + `<meta name="robots" content="noindex">`** — no real user stumbles in; not in any nav or sitemap.
- **Loads the real shipped files** via parent-relative paths: `../dg-system.css`, `../lib/router.js`, `../lib/cert-lock.js`, `../lib/onboarding-firstrun.js`. So the live pieces are always exactly prod, never a drifting copy.

### Installable-app shell (iPhone 13 Pro Max)
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` — enables safe-area insets.
- `<meta name="apple-mobile-web-app-capable" content="yes">` + `<meta name="mobile-web-app-capable" content="yes">` — full-screen standalone on Add to Home Screen.
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` + `<meta name="apple-mobile-web-app-title" content="CertAnvil Lab">`.
- `<link rel="apple-touch-icon" ...>` — the CertAnvil monogram on a forged-bronze tile, so the home-screen icon looks right.
- All chrome respects `env(safe-area-inset-top/bottom/left/right)` so content clears the notch and home indicator.
- Layout targets a 428pt-wide column. On desktop it renders as a centered phone-framed column; on the real phone (standalone) it's full-bleed within the safe area.

### Composition (three buckets)
**🟢 Live & interactive**
- **Cert-lock wall** — a small control: "Locked to [dropdown of 8 certs] · Visiting [dropdown of 8 certs]" → "Show the wall" calls the real `window._certLock.check({ isLoggedIn:true, profile:{ role:'user', metadata:{ freeCertId:<locked> } } })` after setting `window.CURRENT_CERT = <visiting>`. The real wall renders. "Reset" removes it. (If locked === visiting, show a hint that this is the owned-cert case = no wall.)
- **First-run flow** — "Start first-run" sets `onb_mock` and calls `window.onbFirstRun.start({ certId:null, tier:'free', reason:'no-cert' })`. The founder walks lobby → pick cert → diagnostic intro → score reveal → +movement → habit → home. Runs via the module's built-in **no-engine fallback** (when `window.startDiagnostic` is absent, it jumps straight to the reveal screens with placeholder readiness), so no API key / app.js / cert pack needed.

**🎨 Design mockups (embedded, labelled "design")**
- welcome (`onboarding-native-welcome.html`), sign-up (`onboarding-signup-signin.html`), Pro upgrade sheet (`onboarding-upgrade-sheet.html`), done-for-today (`onboarding-free-capped-home.html`), You're Pro (`onboarding-pro-welcome.html`), My Certs (`onboarding-my-certs-pro.html`). Each opens in an in-page `<iframe>` filling the phone frame, with a "design mockup" tag + back button.
- (Optional extra: the rollout-flow map `onboarding-rollout-flow.html` under a "Reference" heading.)

**🔗 The real thing**
- A button that opens `/?onb=1` (the live app) in a new tab for the genuine home chrome.

### Menu / control UX
- The sandbox "home" is a phone-framed menu: a CertAnvil header, a global **light/dark toggle** (applies `data-theme` to drive the live pieces' tokens), then tappable cards grouped under the three buckets above with the 🟢/🎨/🔗 affordances.
- Every screen has a persistent "← Menu" affordance (respecting the top safe-area inset).
- Forged-bronze, Fraunces + Inter, matches `dg-system.css`. Reduced-motion gated. Zero em-dashes in any visible copy.

### Data flow
- Cert-lock: menu dropdowns → `window.CURRENT_CERT` + `_certLock.check(stub profile)` → real wall in the DOM. No persistence (sandbox never writes `nplus_*` to a real profile; it operates on stub objects only).
- First-run: menu → `onb_mock` flag (sandbox-local) + `onbFirstRun.start(decision)` → renders into its container. Placeholder data only.
- Mockups: menu → set `iframe.src` → static file.

---

## Prerequisite: bring 7 mockups into `main`
The session-1 design mockups exist only on `worktree-onboarding-admin-tier` (never merged). Bring these into `main` (pure static docs, zero risk) before/with the sandbox:
`onboarding-native-welcome.html`, `onboarding-signup-signin.html`, `onboarding-upgrade-sheet.html`, `onboarding-free-capped-home.html`, `onboarding-pro-welcome.html`, `onboarding-my-certs-pro.html`, `onboarding-rollout-flow.html`.
(`onboarding-batch2-concept.html` and `onboarding-first-run-concept.html` are already on `main`.)

## Error handling / graceful degradation
- Every live call is wrapped so a failure shows a small inline "couldn't load the live module" note instead of a blank screen — the rest of the sandbox keeps working.
- **Risk (known):** `onbFirstRun.start` may reference app.js globals beyond the no-engine fallback (e.g. `window.showPage`, `window.CERT_PACK`). Mitigation: provide minimal no-op stubs for any such globals the module touches; the build verifies the full first-run walk on a real device/preview. If a leg can't run standalone, that leg degrades to a labelled note and the rest still works. Determined during implementation.
- Sandbox writes nothing to real cloud/profile state; all profile objects are local stubs.

## Out of scope
- Building the six design-only screens as live interactive code (that's the deferred onboarding work).
- The live home chrome inside the sandbox (covered by the "open the real app" button).
- Auth, payments, real diagnostics.

## Surfaces touched + lane
- NEW: `mockups/onboarding-sandbox.html`. Bring over: 7 `mockups/onboarding-*.html` files. Touch-icon asset if not reusable from existing brand assets.
- **FAST LANE** — static `mockups/` + docs only, no gated files. Commit → `main` → deploy. No version bump (new unlinked page, not a precached shell asset).

## Testing
- Local: serve the worktree, open the sandbox at a 428×926 viewport (preview resize), walk each bucket: cert-lock wall renders for a wrong-cert pick and not for owned; first-run walks end to end on placeholder data; each mockup loads in its frame; theme toggle flips light/dark on the live pieces.
- Console clean (no errors) across the walk.
- Confirm the standalone meta tags are present (so Add to Home Screen launches full-screen).
- Real-device confirmation is the founder's Add-to-Home-Screen pass once the link is sent.

## Success criteria
The founder opens one URL on their iPhone 13 Pro Max, Adds to Home Screen, launches a full-screen app, and can tap through: the real cert-lock wall (any cert pairing), the real first-run flow end to end, and all six design screens — in light or dark — without any accounts, flags, or setup.
