# CertAnvil iOS E2E — Capacitor wrap (Phase 6)

Wraps the clickable E2E shell (`mockups/cert-ios-app.html` + the `cert-ios-*` /
`onboarding-*` mockups) as a Capacitor **WKWebView** app so it runs on the iOS
Simulator / a device — the "app on a phone" feel and the App Store bridge.

**Status:** ✅ **COMPLETE (2026-06-10)** — the app builds and runs on the iOS
Simulator (iPhone 17 Pro, iOS 26.5) via **Swift Package Manager — no CocoaPods**.
Verified on-device: shell boots, screens navigate, Pro toggle + dark/light theme
work (HUD-driven). The native `ios/` project is committed.

---

## What's already wired (committed)
- `@capacitor/{core,cli,ios}` (all **v7**, lockstep) in `devDependencies`.
- `capacitor.config.json` — `appId: com.certanvil.e2e`, `appName: CertAnvil E2E`,
  `webDir: capacitor-www`.
- **webDir assembly** — `npm run ios:www` copies `mockups/` → `capacitor-www/` and
  copies the shell to `capacitor-www/index.html` (Capacitor always loads
  `index.html`). Everything in the shell is sibling-relative (`e2e/shell.js` + bare
  `*.html`), so the copy "just works". `capacitor-www/` is git-ignored (build artifact).
  Verified: the assembled bundle boots (window.E2E present, screens render).
- npm scripts: `ios:www`, `ios:add`, `ios:sync`, `ios:open`, `ios:run`.

## Prerequisites (one-time — done on this machine)
1. **Xcode** in `/Applications`, selected + license accepted (done: Xcode 26.6 on macOS 26.5.1).
2. **CocoaPods: NOT needed.** We use Capacitor's **SPM** mode. CocoaPods was
   abandoned because macOS 26 ships Ruby 2.6.10 and CocoaPods' modern deps
   (`ffi`, `securerandom`, …) require Ruby 3.x — `sudo gem install cocoapods`
   fails identically (sudo doesn't change the Ruby).
3. iOS Simulator runtime (came with Xcode 26: iOS 26.5 + iPhone 17 family).

## How it was wrapped (SPM) + how to redo it
```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd ".claude/worktrees/cert-ios-e2e"

npm run ios:add     # assembles capacitor-www, then `cap add ios --packagemanager SPM`
npm run ios:run     # assembles + `cap sync ios` + builds + launches on the Simulator
# or: npm run ios:open  → open in Xcode and Run (⌘R) to pick a device
```

### ⚠️ Known bug in @capacitor/cli 7.6.6 (`cap add` only)
`cap add ios --packagemanager SPM` **lowercases the flag before comparing it to
`'SPM'`** (cli `index.ts` line ~305: `packagemanager?.toLowerCase()` vs `=== 'SPM'`),
so it wrongly keeps `Cocoapods` as package manager → runs the CocoaPods presence
check and a `pod install` step even though it extracts the **SPM template** correctly
(that branch compares the raw flag). 7.6.6 is the last v7 release; the bug is moot in
v8 (SPM is the default). Workaround used here, only needed if you ever delete `ios/`
and re-add:
1. Put a stub `pod` on PATH so the check passes:
   `mkdir -p /tmp/podstub && printf '#!/bin/sh\n[ "$1" = "--version" ] && echo "1.16.2"\nexit 0\n' > /tmp/podstub/pod && chmod +x /tmp/podstub/pod && export PATH="/tmp/podstub:$PATH"`
2. Run `npm run ios:add` — it extracts the SPM template, then **fails at the
   `pod install` step with "ENOENT … Podfile". That failure is expected and harmless**
   (the SPM template has no Podfile).
3. Run `npx cap sync ios` (no stub needed) — Capacitor auto-detects SPM from the
   `ios/App/CapApp-SPM/` directory from then on; sync/run/open all work normally.

## Re-syncing after a mockup/shell change
```bash
npm run ios:sync    # re-copies webDir + `cap sync ios`
```

## Running the REAL app in the wrap (`ios:real`)
```bash
npm run ios:real    # sync, then point WKWebView at https://networkplus.certanvil.com, then run
```
`scripts/cap-ios-real.cjs` injects `server.url` into the **generated**
`ios/App/App/capacitor.config.json` (gitignored, rewritten by every sync), so the
tracked `capacitor.config.json` keeps the bundled mockup demo as the default.
Real login, Supabase sync, and AI quizzes all work — it is the live site, so it
is your real account/data: **no destructive automated testing against it** (the
CLAUDE.md localStorage rule applies). Switch back with plain `npm run ios:run`.
Known nit: the web PWA "Install CertAnvil · Add to Home Screen" banner shows
inside the native wrap — hide it when `Capacitor.isNativePlatform()` (or UA
sniff) before any store build. Verified 2026-06-10 on the iPhone 17 Pro Simulator.

## ⚠️ Fidelity on WKWebView (the open tension — do this early)
WKWebView (what Capacitor uses) renders fonts / antialiasing / scroll-momentum /
tap-highlight differently from Mobile Safari, so a layout pixel-identical in one may
not be in the other. The Phase 5 fidelity harness
(`tests/e2e/cert-ios-fidelity.spec.js`) currently runs against **Chromium**. To catch
WKWebView deltas screen-by-screen:
- Run the app on the Simulator and eyeball each screen × both themes against the
  Chromium baselines first.
- For an automated WKWebView gate, drive Mobile-Safari/WebKit via the existing
  `webkit` / `mobile-safari` Playwright projects, or Appium against the Simulator —
  treat as a follow-up; don't block the first Simulator run on it.

## Notes
- **Demo HUD ships in this build** — it's a dummy/demo wrap, not a store submission.
  Strip `#hud` from `mockups/cert-ios-app.html` (or hide via Capacitor config) before
  any real distribution.
- **No StoreKit / Apple-auth** — paywall is UI-only (parked alongside Stripe), per D6.
- Bundle id `com.certanvil.e2e` is a demo placeholder — change before any real
  provisioning profile / App Store record.
