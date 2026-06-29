---
type: mobile
status: active
cert: all
updated: 2026-06-29
tags: [mobile]
---
# iPhone Smoke-Test Walkthrough

The "truth loop" companion to `IOS_TESTING.md`. Use this when you want to verify a deploy actually works on real iOS hardware — not Playwright WebKit, not Chrome DevTools mobile mode, but Safari running on your iPhone with Web Inspector watching.

**When to run:** any release that touches mobile UX, the service worker, the cert lazy-load, the A2HS banner, or anything visible to the playtest group. Roughly: after every push from `ship-checklist.md` Phase 6 (post-push smoke).

**Time:** 5-8 minutes once setup is done. First-time setup adds ~10 minutes (one-time).

---

## One-time setup (skip if already done)

### iPhone side
1. Settings → Safari → Advanced → toggle **Web Inspector ON**.
2. Settings → Safari → Privacy & Security → **disable "Block All Cookies"** (already disabled by default; only check if A2HS banner doesn't show).
3. Optional: Add CertAnvil to Home Screen (Tap Share → Add to Home Screen) so you can also test standalone-mode behavior.

### Mac side
1. Safari → Settings → Advanced → toggle **"Show features for web developers" ON** (older macOS calls it **"Show Develop menu in menu bar"**).
2. Confirm the **Develop** menu now appears in Safari's top menu bar.

### Connection
- **Wired**: USB-C cable (or Lightning for older phones). Trust the computer if iOS prompts. Phone must be unlocked.
- **Wireless** (after first wired connection succeeds): Mac Safari → Develop → [iPhone Name] → toggle **"Connect via Network"** ON. Future inspections need only Wi-Fi.

---

## The smoke walkthrough

### Pre-flight (Mac)

```bash
# Confirm prod is on the version you just pushed
curl -sS "https://networkplus.certanvil.com/?nocache=$(date +%s)" | grep -oE 'v4\.99\.[0-9]+'
# Expected: matches package.json
```

If prod is still on the previous version, wait ~30s for Vercel CDN propagation and re-check. Don't proceed until prod matches the just-shipped version.

### Phase 1 — First-paint feel (60 seconds)

1. **iPhone**: Open Safari → tap address bar → type `networkplus.certanvil.com` → Go.
2. **Mac**: Safari → Develop → [iPhone Name] → `https://networkplus.certanvil.com/...` → click to open Web Inspector.
3. **Watch the iPhone screen** while the page loads. Look for:
   - ❌ White flash before content appears (would mean v4.99.30 inline-bg broke)
   - ❌ Content appearing in light theme then snapping to dark (theme detect race)
   - ❌ Error toast popping up
   - ✅ Dark background visible immediately, content fades in within ~1s
4. **Web Inspector → Console**: zero red error rows. Any Supabase auth-state warnings on first paint are fine (expected when not signed in).
5. **Web Inspector → Network**: filter to "JS" — verify only ONE of `certs/netplus.js` or `certs/secplus.js` was fetched (not both). v4.99.30 lazy-load contract.

### Phase 2 — A2HS banner (Phase 5 verification)

1. **iPhone**: Wait 8-10 seconds on the homepage. The "📲 Install CertAnvil — Tap [⎙] Share, then Add to Home Screen" banner should slide up from the bottom.
2. If you don't see it:
   - Was CertAnvil already installed to the Home Screen? Then `is-standalone` is set + banner correctly suppressed. Open in Safari (not the installed app icon) to see it.
   - Did you dismiss the banner before? `localStorage.getItem('nplus_a2hs_dismissed') === '1'` blocks future shows.
   - Recent show? The 7-day cooldown check skips re-show.
   - Reset for testing: in **Web Inspector → Storage → Local Storage**, delete the `nplus_a2hs_dismissed` and `nplus_a2hs_last_shown_at` keys, then refresh.
3. **Tap the share-sheet icon hint**: this is just hint copy in the banner — you have to actually tap iOS's Share button (bottom of Safari) to install. Walk that flow once: Share → Add to Home Screen → Add. Confirm the icon appears.
4. **Tap the new home-screen icon**: launches in standalone mode. Verify:
   - No Safari URL bar visible
   - Status bar still visible (apple-mobile-web-app-status-bar-style "black-translucent")
   - Padding-top accounts for the notch / Dynamic Island
   - **Web Inspector → Console**: type `document.body.classList.contains('is-standalone')` → should return `true`

### Phase 3 — Quiz happy path (60 seconds)

1. **iPhone, in Safari (not standalone)**: From homepage, tap **Take the Baseline Diagnostic** card.
2. Run through 2-3 questions. Verify:
   - Touch targets feel right (no mis-taps)
   - Question text is legible without zoom (16px+ font; v4.99.28 fix)
   - Multi-select / order types render correctly
   - **Web Inspector → Console**: zero errors during answer submission

### Phase 4 — Service-worker update test

This is where iOS Safari's SW lifecycle differs most from desktop. Phase 1 of the iOS plan (network-first for HTML+JS, v4.99.27) was supposed to fix it.

1. **Mac**: Make a tiny visible change locally (e.g. change a label text) but DON'T push yet.
2. Bump version locally: `node scripts/bump-version.js <next> "smoke test only"`.
3. Push: `git push origin main`. Wait for Vercel deploy (`gh run watch` or just wait 90s).
4. **iPhone**: Refresh the already-open tab via Safari's pull-down-to-refresh. NOT force-quit and reopen.
5. Watch for the "📦 New version available — Refresh to load the latest CertAnvil" banner (v4.99.27).
6. **Tap Refresh**. Verify the visible change you made now appears.

If the banner doesn't show within 10s of the deploy completing, that's a regression of v4.99.27 — file an issue with the device / iOS version / time-from-deploy.

### Phase 5 — Standalone mode + safe-area

1. From the home-screen icon, launch CertAnvil standalone.
2. **Mac, Web Inspector → Elements**: confirm `<body>` has `class="is-standalone"`.
3. Inspect `body` style → confirm `padding-top` is `env(safe-area-inset-top)` (a non-zero value on iPhone with Dynamic Island).
4. Try rotating to landscape — confirm safe-area-inset-left/right padding kicks in (none defined yet — this is FYI for Phase 6 if added).

### Phase 6 — Console error sweep

Spend 90 seconds tapping around — visit Progress, Analytics, run a quick Subnet drill, open the Topology Builder if you've shipped to it. **Web Inspector → Console** should stay clean (zero red errors). Yellow warnings about Supabase realtime are acceptable.

If any error appears: copy the message + stack into the post-deploy notes for triage.

---

## Reporting back

After the smoke is clean, drop a one-line note in chat or commit message:

```
iPhone smoke v4.99.31 ✓ — all 6 phases clean on iPhone 14 Pro / iOS 17.4
```

If something failed:

```
iPhone smoke v4.99.31 — Phase 2 A2HS banner did NOT appear after 30s on iOS 17.4
```

Then file an issue with: device model, iOS version, exact phase that failed, console errors, screenshot.

---

## Common false alarms

- **A2HS banner not appearing**: usually localStorage state from a previous test. Clear `nplus_a2hs_*` keys.
- **SW update banner missing on deploy**: if the page was loaded before the deploy completed, the network-first path will catch the new files at next navigation. Pull-to-refresh forces it.
- **"Failed to fetch" in console**: usually Supabase realtime websocket on initial connect — not a real error, harmless if it doesn't repeat.
- **Theme jump from light to dark**: only happens if you have `nplus_theme = 'light'` in localStorage but the inline detection defaulted to dark. Force `localStorage.setItem('nplus_theme', 'dark')` if you want to suppress.

---

## Why this exists

Playwright WebKit + Mobile Safari (`npm run test:ios`) cover ~95% of iOS-specific behavior. The remaining 5% is real-iOS only:

- Touch event timing on hardware (vs simulated)
- Real cellular network (vs perfect localhost)
- iOS Safari SW lifecycle (force-quit-to-update, controllerchange flakiness)
- Standalone-mode display + status bar interaction
- Push notification delivery (iOS 16.4+ standalone-only)

This walkthrough exercises that last 5%. Ship-checklist Phase 6 calls it out as a hard requirement post-deploy on any push that touches `index.html`, `app.js`, `sw.js`, `styles.css`, or anything in `certs/`.

*Drafted 2026-05-10 alongside v4.99.31 (iOS Plan Phase 5 ship). Pair with `IOS_TESTING.md` for the full iOS testing surface.*
