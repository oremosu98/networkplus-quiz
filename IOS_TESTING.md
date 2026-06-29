---
type: process
status: active
cert: all
updated: 2026-06-29
tags: [mobile]
---
# iOS Testing Guide

Shipped as part of `MOBILE_IOS_PLAN.md` Phase 3 (v4.99.29). Two complementary testing surfaces for catching iOS-specific bugs **before** they hit your testers.

## Quick reference

| Test surface | What it catches | Speed | Setup cost |
|---|---|---|---|
| `npm run test:webkit` | ~95% of Safari behavior; engine-level | Fast (local) | Already wired |
| `npm run test:mobile-safari` | iPhone 14 viewport + touch + WebKit | Fast (local) | Already wired |
| iPhone via Mac Develop menu | Real device, real iOS, full DevTools | Slow but truth | 10 min one-time |

---

## Part 1 — Playwright WebKit + Mobile Safari (the "fast loop")

The `playwright.config.js` defines three projects:

- **chromium** (default, gating in CI)
- **webkit** (Desktop Safari engine simulation)
- **mobile-safari** (iPhone 14 viewport + WebKit)

### Local commands

```bash
# Gating Chromium suite (same as CI)
npm run test:e2e

# WebKit only — desktop Safari simulation
npm run test:webkit

# Mobile Safari only — iPhone 14 viewport
npm run test:mobile-safari

# Both iOS surfaces together
npm run test:ios

# Everything (3 projects in parallel) — slowest, most thorough
npm run test:e2e:all
```

### One-time setup

```bash
# Install WebKit + Mobile Safari binaries (~150 MB each)
npx playwright install webkit
```

(Chromium is already installed for the gating suite.)

### When to use which

- **Touched anything visual / CSS / responsive** → run `npm run test:mobile-safari` before pushing. Catches viewport / touch / iOS-CSS-quirk regressions.
- **Touched auth / cookies / cross-subdomain** → run `npm run test:webkit`. Safari's cookie + storage rules differ from Chromium.
- **Touched service worker** → run BOTH iOS projects. iOS Safari SW lifecycle is the most divergent.
- **Pure logic / data changes** → Chromium gating suite is sufficient.

### Why these aren't gating in CI yet

The Chromium suite has pre-existing failing tests (37 of 99 as of 2026-05-10) that need triage first. Adding WebKit + Mobile Safari to the gating path would compound the noise. Approach: catalog iOS-specific failures separately, fix in batches, **then** promote to gating in CI by removing the `--project=chromium` filter in `.github/workflows/ci.yml`.

---

## Part 2 — Real iPhone via Mac Develop menu (the "truth loop")

Playwright's WebKit project is ~95% accurate to actual iOS Safari, but the remaining 5% (real device sensors, iOS-specific notifications, push, App Store privacy prompts, real cellular timing) only show up on a real device.

**Required**: Mac + iPhone + USB or wireless connection.

### One-time setup (10 min)

**On the iPhone:**
1. Settings → Safari → Advanced → **Web Inspector: ON**

**On the Mac:**
1. Safari → Preferences → Advanced → **"Show Develop menu in menu bar"**: ON

**Connection:**
- Wired: Connect iPhone via USB cable. Trust the computer if prompted.
- Wireless: After first successful USB connection, you can enable wireless inspection: Mac Safari → Develop → [iPhone Name] → Connect via Network.

### Inspecting a live page

1. On the iPhone, open Safari and navigate to `certanvil.com` or `networkplus.certanvil.com`.
2. On the Mac, open Safari → Develop menu → [iPhone Name] → [page URL].
3. A full Web Inspector opens with:
   - Console (errors, logs, network)
   - Elements (DOM inspector)
   - Network (requests, timing)
   - Storage (localStorage, cookies, IndexedDB)
   - Audit (Lighthouse-style mobile audit)

This is the **gold standard** for iOS debugging. Anything Playwright misses surfaces here.

### When to use it

- **Pre-launch on every release**: 1-2 minute smoke test on a real iPhone before declaring "shippable on iOS".
- **Reproducing a tester report**: when a friend says "broken on my iPhone," reproduce on your iPhone with Web Inspector open to capture the actual error + stack.
- **Service worker debugging**: SW lifecycle on iOS Safari is genuinely different from desktop; only real iPhone shows it accurately.
- **PWA testing**: "Add to Home Screen" + standalone-mode behavior only verifiable on a real device.

### Alternative: BrowserStack

For testing on **other** iOS versions / Android devices without owning each one: [BrowserStack](https://browserstack.com) offers automated cross-device testing at $39/mo (Live + Automate plans).

**Recommendation**: defer this until paying-customer threshold (50+ users) or a specific iOS-version regression report. Until then, your iPhone + Playwright WebKit covers most cases.

---

## Part 3 — Workflow integration

### Before any push that touches UI / CSS / responsive

```bash
# 1. Run the iOS Playwright projects locally
npm run test:ios

# 2. If anything fails, triage:
#    - Real bug on iOS → fix it before push
#    - WebKit-specific (won't repro on real iPhone) → log to issue tracker
#    - Test bug (timing, race condition) → fix the test

# 3. Optional: real iPhone smoke if change is significant
#    - Open localhost:3131 on iPhone (use Mac IP if testing locally)
#    - Walk the happy path
#    - Web Inspector on Mac for any console errors
```

### Before any cert-app prod deploy that affects mobile

```bash
# 1. Standard SHIP_CHECKLIST.md walk
# 2. Phase 3.2 of SHIP_CHECKLIST: Live-verify in Chrome MCP
# 3. NEW for v4.99.29: also run npm run test:mobile-safari before push
# 4. NEW for v4.99.29: post-deploy, smoke on real iPhone via Develop menu
```

---

## Open question — when to gate iOS in CI

The trigger to promote WebKit + Mobile Safari to **required** in CI:

1. Existing Chromium suite is triaged + green (37 failing tests addressed)
2. WebKit suite passes consistently (likely 5-10 iOS-specific failures to fix first)
3. Mobile Safari suite passes consistently

Estimate: 2-4 hours of test triage. Schedule as a Thursday tech-debt slot.

When ready, the change is one line in `.github/workflows/ci.yml`:

```yaml
- name: Run Playwright E2E tests (all projects)
  run: npx playwright test
```

(Remove the `--project=chromium` filter.)

---

*Drafted 2026-05-10 alongside v4.99.29 ship. Maintained as iOS testing reference for the team.*
