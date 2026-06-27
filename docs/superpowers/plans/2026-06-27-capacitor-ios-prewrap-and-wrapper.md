# Capacitor iOS Pre-Wrap + Wrapper Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing CertAnvil web app as an installable iOS app using Capacitor, configured to run on the real `https://certanvil.com` origin (Option A), so login, API calls, payments-routing, and cert-switching keep working with no auth rebuild.

**Architecture:** Capacitor puts the existing static site inside a native WKWebView shell (bundle `com.certanvil.app`). The webview is configured to serve as the `https://certanvil.com` origin so the cookie-scoped Supabase session (`Domain=.certanvil.com`) and cross-origin `certanvil.com/api/*` calls keep working unchanged. Pre-wrap fixes neutralise the service worker, keep internal navigations inside the webview, send genuinely-external links to the system browser, handle WKWebView safe-area/keyboard, and add one native plugin to satisfy Apple Guideline 4.2.

**The view being wrapped already exists — this is not new UI.** The WKWebView the iOS Simulator has been previewing (the `npm run ios:real` workflow) **IS this exact view** — the simulator was already rendering the CertAnvil site inside a WKWebView. Wrapping does not build a new iOS interface; it turns that already-previewed view into a real installable app, pins it to the Option A origin, and adds the native plugins. There is **no from-scratch native rebuild** in this plan. The visual result on device should match what you have already seen in the simulator (the additions are: correct origin, safe-area insets, status-bar theming, splash, and haptics).

**Tech Stack:** **Capacitor 7** (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`), **Swift Package Manager (SPM), NOT CocoaPods** (locked Forge decision for the CertAnvil iOS native build), Xcode, the existing vanilla HTML/JS/CSS app, Node 20.20.2 (nvm).

> **This is the Phase G "Stage 2 — build the iOS app" deliverable.** Hub: [`docs/planning/PHASE-G-PLAN-2026-06-11.md`](../../planning/PHASE-G-PLAN-2026-06-11.md). It is a hard prerequisite for **G-3** (RevenueCat IAP). See **Scope boundaries** below for what is explicitly NOT in this plan.

---

## Scope boundaries (read before starting)

**IN scope:** the Capacitor wrapper, the Option A origin config, and the pre-wrap fixes (SW neutralise, navigation policy, safe-area/keyboard, one native plugin, real-device verification).

**OUT of scope — do NOT build here (later Phase G stages):**
- **Go-Pro CTA rewrite / native purchase flow / RevenueCat** → **G-3** (`docs/superpowers/plans/2026-06-26-g3-ios-revenuecat-purchase-coordinator.md`). This plan leaves the existing `certanvil.com/pricing` CTAs untouched. They are a known App Store Guideline 3.1.1 blocker; the wrapper is therefore **runnable on-device and through TestFlight, but NOT App-Store-submittable until G-3 lands.**
- **Sign in with Apple / Google native flow** → **G-2**. Under Option A the *existing* magic-link web sign-in keeps working in the webview because the origin matches; native Apple/Google sign-in is a separate door added later.
- **App Store listing, screenshots, onboarding flip, submission** → **G-4 launch flips.**

**Lane:** GATED. This plan touches `sw.js`, navigation behaviour, and ships a native shell. Feature branch → PR → preview/device smoke → squash-merge. Every `sw.js`/auth-adjacent change follows gated-lane house rules per `CLAUDE.md` + `ENVIRONMENT_STRATEGY.md`.

---

## The Option A origin decision (LOCKED)

**Decision (Simi, 2026-06-27): Option A — the wrapped app runs on the `https://certanvil.com` origin.** Reuses the existing cookie-based Supabase auth + cross-origin API model rather than re-architecting auth natively (Option B). Cheapest, keeps one auth codebase, reversible later.

Two implementations of Option A exist; this plan uses **A2 (bundled-served-as-certanvil.com)** as the shippable target, with **A1 (remote-load)** used once as an early de-risking smoke test:

| Sub-option | Config | Pros | Cons |
|---|---|---|---|
| **A1 remote-load** (smoke only) | `server.url = "https://certanvil.com"` | Origin is naturally real; proves auth/API/cert-switch work in WKWebView in minutes | Pure website (Guideline 4.2 risk), no offline, not the ship target |
| **A2 bundled-as-host** (ship target) | bundled assets + `server.hostname = "certanvil.com"`, `iosScheme = "https"` | Real installable app, offline shell, native plugins, App-Store-defensible | Cross-origin API + cookie behaviour must be verified on a real device |

> ⚠️ **Confirm-at-build-time:** Capacitor's exact `server.hostname`/`iosScheme` behaviour (whether a bundled app served *as* `certanvil.com` can still reach the live `certanvil.com/api/*` over the network, and how the session cookie scopes) MUST be verified on a real device in **Task 7**. The fallback if A2's cross-origin model fails is documented there.

---

## File Structure

| File | Created/Modified | Responsibility |
|---|---|---|
| `capacitor.config.json` | Create | Capacitor app id/name, webDir, Option A `server` origin config, plugin config |
| `package.json` | Modify | Add Capacitor deps + `ios:*` npm scripts |
| `ios/` (generated dir) | Create (via `cap add ios --packagemanager SPM`) | The native Xcode project (Swift Package Manager — no CocoaPods) |
| `dist/` build inputs | Reference | `webDir` source the native app bundles (see Task 2 for what `webDir` points at in a no-build-step app) |
| `sw.js` + registration in `app.js:1959` | Modify | Neutralise the service worker when running inside Capacitor |
| `capacitor-shell.js` (new) | Create | Tiny boot shim: detect Capacitor, set the native-context flag, configure navigation/external-link policy, init native plugins |
| `index.html` | Modify | Load `capacitor-shell.js` early; add WKWebView-only `viewport-fit=cover` + safe-area handling hook |
| `styles.css` | Modify | Safe-area inset padding (`env(safe-area-inset-*)`) scoped to the native shell |
| `docs/mobile/CAPACITOR_NAV_AUDIT.md` | Create | The Task 1 navigation/external-link inventory + per-link keep-in-app vs open-Safari decision |
| `docs/mobile/APP_STORE_DISTRIBUTION.md` | Modify | Replace the Phase B placeholder steps with the as-built commands |

---

## Task 0: Feature branch + toolchain preflight

**Files:** none (environment only)

- [ ] **Step 1: Create the gated-lane feature branch**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
git checkout main && git pull
git checkout -b feat/capacitor-ios-wrapper
```

- [ ] **Step 2: Make Node available (every shell)**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node --version   # expect v20.20.2
```

- [ ] **Step 3: Verify the iOS toolchain is present**

```bash
xcodebuild -version          # expect Xcode 16+ (Capacitor 7 baseline); if "command line tools" only, install full Xcode
xcode-select -p              # expect a path inside Xcode.app, not /Library/Developer/CommandLineTools
```

Expected: Xcode 16+, `xcode-select -p` points inside `Xcode.app`.
**No CocoaPods needed** — this build uses Swift Package Manager (locked Forge decision). Capacitor 7 generates an SPM-based iOS project; there is no `pod install` step.
If Xcode is missing or only the command-line tools are installed, STOP and install full Xcode before continuing.

- [ ] **Step 4: Confirm no Capacitor scaffold exists yet (sanity)**

```bash
ls capacitor.config.* ios 2>/dev/null || echo "clean — none present (expected)"
```

Expected: "clean — none present (expected)".

---

## Task 1: Navigation + external-link audit (decision inventory)

**Files:**
- Create: `docs/mobile/CAPACITOR_NAV_AUDIT.md`

This is a read-then-decide task. No code changes. It produces the inventory the navigation-policy code in Task 4 implements. Under Option A the origin matches, so most internal navigations *keep working* — the job is to classify each as **keep-in-webview** vs **open-system-browser**, so nothing silently kicks the user out of the app.

- [ ] **Step 1: Enumerate every full-window navigation and external link**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
echo "== window.location navigations =="
grep -rn "window.location.href\s*=\|location.href\s*=\|window.location.assign\|window.open" app.js auth-state.js index.html | grep -v "//"
echo "== anchor links to certanvil + external =="
grep -rn 'href="https://' app.js auth-state.js index.html | head -60
echo "== buildSignInUrl =="
grep -rn "buildSignInUrl" app.js auth-state.js
```

- [ ] **Step 2: Write the audit doc with the confirmed inventory + a decision per entry**

Create `docs/mobile/CAPACITOR_NAV_AUDIT.md` with this exact content (line numbers verified 2026-06-27; re-confirm if files moved):

```markdown
# Capacitor navigation + external-link audit (Option A: certanvil.com origin)

Rule: under Option A the webview IS `https://certanvil.com`, so navigations to
`*.certanvil.com` resolve same-origin and load IN the webview. We only send a
link to the system browser when it is genuinely off-property AND not part of a
core flow.

## A. Keep IN the webview (internal — same property under Option A)
| Where | What | Decision |
|---|---|---|
| `app.js:8123` | sign-in: `window.location.href = 'https://certanvil.com/?action=signin&return=…'` | KEEP IN-APP. Magic-link web flow; origin matches so cookie/session works. (Native Apple/Google = G-2.) |
| `app.js:5664-5665` | `window.buildSignInUrl()` redirect | KEEP IN-APP (same flow as above). |
| `auth-state.js:27-29` | `buildSignInUrl()` builds the `certanvil.com/?action=signin` URL | KEEP IN-APP. |
| `auth-state.js:233` | cert switcher → `https://aplus.certanvil.com/?exam=…` | KEEP IN-APP (subdomain of certanvil.com; cert switch is a core flow). |
| `auth-state.js:251` | cert switcher → `https://<targetHost>/` (networkplus/secplus/azure/ai/sc900/clfc02) | KEEP IN-APP (per-cert subdomains). |
| `auth-state.js:334` | account menu → `/account` | KEEP IN-APP. |
| `auth-state.js:340` | account menu → `/?modal=my-certs` | KEEP IN-APP. |
| `auth-state.js:343` | account menu → `/?modal=analytics` | KEEP IN-APP. |
| `auth-state.js:346` | account menu → `/` ("Back to certanvil.com") | KEEP IN-APP. |
| `auth-state.js:350` | account menu (admin) → `/admin` | KEEP IN-APP. |

## B. Go-Pro CTAs — DEFERRED to G-3 (do not touch in this plan)
| Where | What | Decision |
|---|---|---|
| `app.js:611` | quota chip → `certanvil.com/pricing` (`target="_blank"`) | LEAVE AS-IS. G-3 purchase coordinator rewrites these. Guideline 3.1.1 blocker → not submittable until G-3. |
| `app.js:682` | quota-exceeded CTA → `certanvil.com/pricing` | LEAVE AS-IS (G-3). |
| `app.js:837` | drill paywall CTA → `certanvil.com/pricing` | LEAVE AS-IS (G-3). |
| `app.js:939` | drill paywall CTA → `certanvil.com/pricing` | LEAVE AS-IS (G-3). |
| `app.js:4686` | results paywall → `certanvil.com/pricing` | LEAVE AS-IS (G-3). |
| `index.html` Go-Pro CTAs | static pricing links | LEAVE AS-IS (G-3). |

## C. Open in the SYSTEM browser (genuinely external)
| Where | What | Decision |
|---|---|---|
| GitHub issue links / any non-certanvil `target="_blank"` | external docs | OPEN IN SYSTEM BROWSER via the Task 4 policy. |
| `fonts.googleapis.com` | font CSS (resource load, not navigation) | NO ACTION (resource fetch, not a click-through). |

## D. Native-sheet behaviours to confirm on device (Task 7)
| Where | What | Decision |
|---|---|---|
| `app.js:1326/1366` | `navigator.share(...)` | CONFIRM it pops the native iOS share sheet (expected to work in WKWebView). |
```

- [ ] **Step 3: Commit the audit**

```bash
git add docs/mobile/CAPACITOR_NAV_AUDIT.md
git commit -m "docs(mobile): Capacitor navigation + external-link audit (Option A)"
```

---

## Task 2: Scaffold the Capacitor wrapper (Option A origin)

**Files:**
- Modify: `package.json`
- Create: `capacitor.config.json`
- Create: `ios/` (generated)

> **`webDir` in a no-build-step app:** CertAnvil has no bundler — the deployable assets are the repo root. Do NOT point `webDir` at the repo root (it would bundle `node_modules`, tests, docs). Task 2 creates a thin `dist/` staging copy of only the shipped runtime files via a script, and `webDir` points there. (This staging copy is also what a future offline build uses.)

- [ ] **Step 1: Install Capacitor dependencies**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm install --save @capacitor/core@^7 @capacitor/cli@^7 @capacitor/ios@^7
```

Expected: three packages added to `package.json` dependencies, no peer-dep errors.

- [ ] **Step 2: Add the web-asset staging script + npm scripts to `package.json`**

Create `scripts/stage-webdir.js`:

```javascript
// Stages only the shipped runtime assets into dist/ for Capacitor to bundle.
// CertAnvil has no bundler; this is the allow-list of files the app loads at runtime.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

// Allow-list: top-level files + directories the running app actually requests.
const INCLUDE = [
  'index.html', 'app.js', 'styles.css', 'dg-system.css', 'dg-depurple.css',
  'lift-screens.css', 'lift-shell.css', 'lift-shell.js', 'analytics.js',
  'auth-state.js', 'cloud-store.js', 'migration.js', 'diagnostic-claim.js',
  'event-actions.js', 'sw.js', 'manifest.json', 'favicon.svg',
  'capacitor-shell.js',
  'lib', 'certs', 'features', 'api',
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const entry of INCLUDE) {
  const src = path.join(ROOT, entry);
  if (!fs.existsSync(src)) { console.warn('skip (missing):', entry); continue; }
  fs.cpSync(src, path.join(OUT, entry), { recursive: true });
}
console.log('staged web assets into dist/');
```

Add to `package.json` `"scripts"`:

```json
"stage:webdir": "node scripts/stage-webdir.js",
"ios:sync": "npm run stage:webdir && npx cap sync ios",
"ios:open": "npx cap open ios",
"ios:real": "npm run ios:sync && npx cap run ios"
```

- [ ] **Step 3: Add `dist/` to `.gitignore`**

```bash
grep -qxF 'dist/' .gitignore || echo 'dist/' >> .gitignore
```

- [ ] **Step 4: Run the staging script once and verify**

```bash
npm run stage:webdir
test -f dist/index.html && test -f dist/app.js && echo "dist staged OK" || echo "STAGING FAILED"
ls dist
```

Expected: "dist staged OK"; `dist/` contains `index.html`, `app.js`, `lib/`, `certs/`, etc., and NO `node_modules`/`tests`/`docs`.

- [ ] **Step 5: Create `capacitor.config.json` with the Option A origin**

```json
{
  "appId": "com.certanvil.app",
  "appName": "CertAnvil",
  "webDir": "dist",
  "server": {
    "hostname": "certanvil.com",
    "iosScheme": "https"
  },
  "ios": {
    "contentInset": "always",
    "limitsNavigationsToAppBoundDomains": false
  },
  "plugins": {
    "SplashScreen": { "launchShowDuration": 800, "backgroundColor": "#0c0c0d" }
  }
}
```

> `hostname: "certanvil.com"` + `iosScheme: "https"` is the Option A keystone — it makes the WKWebView report its origin as `https://certanvil.com` so the `Domain=.certanvil.com` cookie scopes correctly. Verified for real in Task 7.

- [ ] **Step 6: Initialise Capacitor + add the iOS platform (Swift Package Manager)**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npx cap init CertAnvil com.certanvil.app --web-dir dist   # if it prompts; config above already supplies values
npm run stage:webdir
npx cap add ios --packagemanager SPM
```

Expected: `ios/` directory created using a **Swift Package Manager** project (NOT a CocoaPods `Podfile`/`.xcworkspace`); `npx cap sync ios` reports success.
> If your Capacitor CLI version does not accept `--packagemanager SPM`, confirm the current Capacitor 7 SPM flag/flow against the docs at build time (SPM is the locked target — do not fall back to CocoaPods without revisiting the Forge decision).

- [ ] **Step 7: Commit the scaffold (exclude generated Pods if heavy)**

```bash
git add package.json package-lock.json scripts/stage-webdir.js capacitor.config.json .gitignore ios
git commit -m "feat(ios): scaffold Capacitor wrapper on certanvil.com origin (Option A)"
```

---

## Task 3: Neutralise the service worker inside the native build

**Files:**
- Create: `capacitor-shell.js`
- Modify: `index.html` (load the shim first)
- Modify: `app.js:1959` (guard SW registration)

The SW does stale-while-revalidate + auto-reload-on-deploy — wrong model in a native app (assets bundled, updates ship via App Store). Flagged CRITICAL on iOS in `docs/mobile/MOBILE_OPTIMIZATION_PLAN.md` §1B.

- [ ] **Step 1: Create `capacitor-shell.js` with the native-context flag + SW kill**

```javascript
// capacitor-shell.js — must load BEFORE app.js. Detects the Capacitor native
// shell and exposes window.IS_NATIVE_APP so the rest of the app can branch.
(function () {
  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  window.IS_NATIVE_APP = isNative;
  if (!isNative) return;

  // 1. Kill any already-registered service worker (native bundles assets itself).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    }).catch(function () {});
  }
})();
```

- [ ] **Step 2: Load the shim early in `index.html`**

Find the first app script tag in `index.html` and add `capacitor-shell.js` immediately before the Supabase/app scripts (it must run before `app.js` and before `cert` packs):

```html
<script src="capacitor-shell.js"></script>
```

- [ ] **Step 3: Guard the SW registration in `app.js`**

At `app.js:1959`, wrap the registration so it is skipped in the native app. Change:

```javascript
  navigator.serviceWorker.register('/sw.js').then((reg) => {
```

to:

```javascript
  if (window.IS_NATIVE_APP) { return; }
  navigator.serviceWorker.register('/sw.js').then((reg) => {
```

(Place the guard at the top of the same enclosing block that begins the registration; ensure it is inside the function so `return` is legal — if the registration is at top level of an `if ('serviceWorker' in navigator)` block, use `if (!window.IS_NATIVE_APP) { navigator.serviceWorker.register('/sw.js')… }` instead.)

- [ ] **Step 4: Restage + verify the guard string is present**

```bash
npm run stage:webdir
grep -n "IS_NATIVE_APP" dist/app.js dist/capacitor-shell.js
```

Expected: the guard appears in `dist/app.js` and the flag-setter in `dist/capacitor-shell.js`.

- [ ] **Step 5: Run UAT (no behaviour change for web)**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js
```

Expected: PASS (web path unchanged — `IS_NATIVE_APP` is false in the browser, SW still registers on the website).

- [ ] **Step 6: Commit**

```bash
git add capacitor-shell.js index.html app.js
git commit -m "feat(ios): native-context flag + disable service worker in Capacitor build"
```

---

## Task 4: Navigation policy — keep internal in-app, send external to the system browser

**Files:**
- Modify: `capacitor-shell.js`
- Install: `@capacitor/browser` (system-browser plugin)

Implements the Task 1 audit: `*.certanvil.com` loads in the webview (same origin under Option A), genuinely-external `target="_blank"`/`window.open` opens in the iOS system browser instead of dead-ending inside the app.

- [ ] **Step 1: Install the Browser plugin**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm install --save @capacitor/browser@^7
```

- [ ] **Step 2: Add the external-link interceptor to `capacitor-shell.js`**

Append inside the `if (!isNative) return;`-guarded block (i.e. only runs in the native app):

```javascript
  // 2. External-link policy: certanvil.com stays in-app; everything else opens
  //    in the system browser (so users never dead-end on an off-property page).
  function isInternal(url) {
    try {
      var u = new URL(url, window.location.href);
      return u.hostname === 'certanvil.com' || u.hostname.endsWith('.certanvil.com');
    } catch (e) { return false; }
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!/^https?:/i.test(href)) return;            // skip in-page anchors / mailto / etc.
    if (isInternal(href)) return;                   // internal → let it load in the webview
    e.preventDefault();
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
      window.Capacitor.Plugins.Browser.open({ url: href });
    } else {
      window.open(href, '_system');
    }
  }, true);
```

- [ ] **Step 3: Restage + sync**

```bash
npm run ios:sync
grep -n "isInternal" dist/capacitor-shell.js
```

Expected: `isInternal` present in the staged shim; `cap sync ios` succeeds.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json capacitor-shell.js ios
git commit -m "feat(ios): keep certanvil.com in-app, route external links to system browser"
```

---

## Task 5: Safe-area, keyboard, and 100dvh inside WKWebView

**Files:**
- Modify: `index.html` (viewport)
- Modify: `styles.css` (safe-area insets)
- Install: `@capacitor/keyboard`, `@capacitor/status-bar`

The mobile baseline handled this for Safari; WKWebView needs `viewport-fit=cover` + `env(safe-area-inset-*)` and explicit keyboard-resize behaviour or the layout collides with the notch / home indicator.

- [ ] **Step 1: Install keyboard + status-bar plugins**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm install --save @capacitor/keyboard@^7 @capacitor/status-bar@^7
```

- [ ] **Step 2: Ensure the viewport opts into safe areas**

In `index.html`, find the `<meta name="viewport"…>` tag and ensure it includes `viewport-fit=cover`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

- [ ] **Step 3: Add safe-area padding scoped to the native shell**

Append to `styles.css`:

```css
/* WKWebView safe-area insets — applied only when running inside the native app
   (the .is-native-app class is set by capacitor-shell.js on <html>). */
.is-native-app body { padding-top: env(safe-area-inset-top); }
.is-native-app .sidebar,
.is-native-app .app-topbar { padding-top: env(safe-area-inset-top); }
.is-native-app .app-shell,
.is-native-app body { padding-bottom: env(safe-area-inset-bottom); }
```

- [ ] **Step 4: Set the `is-native-app` class + keyboard behaviour in `capacitor-shell.js`**

Append inside the native-only block:

```javascript
  // 3. Mark the document so CSS can apply safe-area insets only in the app.
  document.documentElement.classList.add('is-native-app');

  // 4. Keyboard: resize the webview (not the whole native view) so fixed chrome
  //    stays put and inputs scroll into view.
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Keyboard) {
    window.Capacitor.Plugins.Keyboard.setResizeMode &&
      window.Capacitor.Plugins.Keyboard.setResizeMode({ mode: 'native' });
  }
```

- [ ] **Step 5: Restage, sync, run UAT**

```bash
npm run ios:sync
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js
```

Expected: `cap sync ios` succeeds; UAT PASS (web layout unchanged — `.is-native-app` is never added in the browser).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json index.html styles.css capacitor-shell.js ios
git commit -m "feat(ios): WKWebView safe-area insets + keyboard resize handling"
```

---

## Task 6: Add the native plugin(s) for Apple Guideline 4.2

**Files:**
- Modify: `capacitor-shell.js` (init status bar + splash)
- Already installed: `@capacitor/status-bar` (Task 5); add `@capacitor/splash-screen`, `@capacitor/haptics`

Guideline 4.2 rejects "just a website in a wrapper." Shipping real native capability (status-bar theming, controlled splash, haptics on key interactions) demonstrates native integration. RevenueCat (G-3) and Apple/Google sign-in (G-2) will add more later; this task guarantees ≥1 is present now.

- [ ] **Step 1: Install splash + haptics**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npm install --save @capacitor/splash-screen@^7 @capacitor/haptics@^7
```

- [ ] **Step 2: Initialise native UI chrome in `capacitor-shell.js`**

Append inside the native-only block:

```javascript
  // 5. Native chrome: theme the status bar to match the dark shell, then hide
  //    the splash once the app has booted.
  var P = (window.Capacitor && window.Capacitor.Plugins) || {};
  if (P.StatusBar && P.StatusBar.setStyle) {
    P.StatusBar.setStyle({ style: 'DARK' });           // light text on dark bg
    P.StatusBar.setBackgroundColor && P.StatusBar.setBackgroundColor({ color: '#0c0c0d' });
  }
  window.addEventListener('load', function () {
    if (P.SplashScreen && P.SplashScreen.hide) P.SplashScreen.hide();
  });

  // 6. Haptic tap on answer selection (a genuine native touch).
  window.nativeHaptic = function () {
    if (P.Haptics && P.Haptics.impact) { try { P.Haptics.impact({ style: 'LIGHT' }); } catch (e) {} }
  };
```

- [ ] **Step 3: Fire the haptic on answer selection in `app.js`**

Find the `pick()` handler (targets `#options .option`, per the CLAUDE.md gotcha). At the start of the selection handler add:

```javascript
  if (window.IS_NATIVE_APP && window.nativeHaptic) window.nativeHaptic();
```

- [ ] **Step 4: Restage, sync, run UAT**

```bash
npm run ios:sync
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js
```

Expected: `cap sync ios` succeeds; UAT PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json capacitor-shell.js app.js ios
git commit -m "feat(ios): native status bar + splash + answer haptics (Guideline 4.2)"
```

---

## Task 7: Build to a REAL device + verify the Option A origin model

**Files:** none (verification); update `docs/mobile/CAPACITOR_NAV_AUDIT.md` §D with results

This is the make-or-break task: the Simulator does NOT honestly reproduce cookie/origin behaviour (per the review doc + CLAUDE.md). The cookie-scoped session, cross-origin API reachability, and real safe areas must be verified on hardware.

- [ ] **Step 1: Open the project in Xcode and set signing**

```bash
npm run ios:sync
npm run ios:open
```

In Xcode: select the CertAnvil target → Signing & Capabilities → set your Apple Developer Team → connect a real iPhone → select it as the run destination.

- [ ] **Step 2: Run on the device**

Press Run (or `npm run ios:real` with the device selected). Expected: the app installs and launches showing the CertAnvil home, with the dark status bar and no white notch/home-indicator collisions.

- [ ] **Step 3: Verify the origin is `https://certanvil.com` (the keystone)**

With the device connected, open Safari → Develop → [device] → CertAnvil web inspector, and in the console run:

```javascript
console.log(window.location.origin);
```

Expected: `https://certanvil.com`.
If it shows `capacitor://localhost` instead, Option A is misconfigured — recheck `server.hostname`/`iosScheme` in `capacitor.config.json` and re-sync.

- [ ] **Step 4: Verify login + session cookie**

Sign in via the magic-link flow inside the app. After return, in the device web inspector console:

```javascript
console.log(document.cookie);                 // expect the Supabase session cookie present
console.log(!!window.supabase);               // client present
```

Expected: a logged-in session that **survives an app relaunch** (kill + reopen → still signed in). This proves the `Domain=.certanvil.com` cookie scoped correctly under Option A.

- [ ] **Step 5: Verify API reachability + cert switching**

- Trigger an AI action or any `certanvil.com/api/*` call; confirm it returns (network tab in the device inspector).
- Use the in-app cert switcher; confirm it navigates **inside** the app (no jump to mobile Safari).
- Tap the share affordance (`navigator.share`); confirm the native iOS share sheet appears.

> 🔧 **Fallback if A2 fails:** if the bundled-as-host config cannot reach the live `certanvil.com/api/*` or the cookie won't scope, switch `capacitor.config.json` `server` to remote-load: replace `hostname`/`iosScheme` with `"url": "https://certanvil.com"`, re-sync, and re-run Steps 3–5. This trades offline/bundling for a guaranteed-correct origin while we decide on the long-term model. Record which config passed in the audit doc.

- [ ] **Step 6: Record results in the audit doc**

Update `docs/mobile/CAPACITOR_NAV_AUDIT.md` §D with PASS/FAIL per check and which `server` config was used (A2 bundled vs A1 remote fallback). Commit:

```bash
git add docs/mobile/CAPACITOR_NAV_AUDIT.md
git commit -m "docs(mobile): record on-device Option A verification results"
```

---

## Task 8: Update the distribution doc + open the gated-lane PR

**Files:**
- Modify: `docs/mobile/APP_STORE_DISTRIBUTION.md` (replace Phase B placeholder with as-built steps)

- [ ] **Step 1: Replace the Phase B placeholder with the real commands**

In `docs/mobile/APP_STORE_DISTRIBUTION.md`, update the Phase B section so it reflects the as-built scaffold: the `stage:webdir` step, the `capacitor.config.json` Option A `server` block, the `ios:sync`/`ios:real` scripts, the installed plugins (`browser`, `keyboard`, `status-bar`, `splash-screen`, `haptics`), and a pointer that **G-3 adds RevenueCat + the purchase coordinator before submission**.

- [ ] **Step 2: Commit the doc update**

```bash
git add docs/mobile/APP_STORE_DISTRIBUTION.md
git commit -m "docs(mobile): APP_STORE_DISTRIBUTION Phase B reflects as-built Capacitor wrapper"
```

- [ ] **Step 3: Run the full gated-lane check suite before PR**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js
node tests/tech-debt.js
npx playwright test
```

Expected: all green. (These exercise the web path, which must be unchanged.)

- [ ] **Step 4: Run the review-feature skill (mandatory for this subsystem)**

This adds a native subsystem + touches `sw.js`/navigation → non-trivial, gated. Per `CLAUDE.md`, run the 4-agent `review-feature` skill on the branch before merge.

- [ ] **Step 5: Push the branch and open the PR**

```bash
git push -u origin feat/capacitor-ios-wrapper
```

Open a PR titled "iOS Capacitor wrapper (Phase G Stage 2) — Option A origin + pre-wrap fixes". In the body, link the Phase G hub and note: runnable on-device/TestFlight, NOT App-Store-submittable until G-3 (Go-Pro CTAs + RevenueCat). Let CI spin the preview; smoke the web preview; squash-merge once green + reviewed.

---

## Self-Review checklist (run after execution, before merge)

- [ ] **Origin proven on hardware:** Task 7 Step 3 showed `https://certanvil.com` (not `capacitor://localhost`).
- [ ] **Session survives relaunch:** Task 7 Step 4 — still signed in after kill+reopen.
- [ ] **Web path unchanged:** UAT + Playwright green; `IS_NATIVE_APP`/`.is-native-app` are never set in the browser.
- [ ] **Scope boundary held:** no Go-Pro CTA / RevenueCat / native-Apple-signin code in this branch (those are G-2/G-3).
- [ ] **Gated-lane discipline:** feature branch → PR → preview/device smoke → review-feature → squash-merge.
- [ ] **Phase G hub updated:** the hub's Stage 2 links this plan (done in the hub edit accompanying this plan).
