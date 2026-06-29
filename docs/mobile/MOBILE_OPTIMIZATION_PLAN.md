---
type: mobile
status: active
cert: all
updated: 2026-06-29
tags: [mobile, plan]
---
# Mobile Optimization — Cross-Platform Plan of Action

**Status**: founder-approved 2026-05-10 13:00 BST · Phase 6 starting now
**Scope**: iOS phone + iPad + mobile general (incl. PWA standalone) · Android **DEFERRED post-launch** per founder direction
**App Store target**: end of June 2026 (founder holiday July 2 — must be live before)
**Predecessor**: `MOBILE_IOS_PLAN.md` Phases 1-5 — all shipped today (v4.99.27 → v4.99.31)
**App Store distribution**: separate plan in `APP_STORE_DISTRIBUTION.md` · target trigger: end of June 2026

## Founder decisions (locked 2026-05-10)

1. **Code-split #55 + #138 → un-gated**. Pre-launch is the right time. Phase 11 fires.
2. **Android polish → deferred** until post-launch when revenue justifies the device matrix. iOS-only mobile focus through end of June.
3. **iPad smoke → confirmed** — founder owns one, real-device smoke runs locally.
4. **Web Vitals destination → Supabase function** (own data, no new vendor, leverages existing infra).
5. **Pacing → multi-day chunks**, not all-in-one-day compress. End-of-June App Store target gives ~7 weeks of breathing room.

> **Founder direction (2026-05-10)**: *"the next scope of our app is Mobile Optimization. We need to optimize UI, Performance and General Day-to-day use for mobile. This needs to be mapped across iOS, Android, TabletOS and mobile in general."*

The iOS-only plan was the right starting point — most paying users will arrive via iPhone Safari or A2HS PWA — but it left Android, tablets, and general mobile UX unmapped. This document closes that gap.

---

## Part 1 — Where we are (what's shipped today)

| Phase | Ship | Outcome |
|---|---|---|
| iOS Phase 1 | v4.99.27 | SW network-first for HTML+JS + visible "New version available" banner. Deploys propagate to iPhone within seconds. |
| iOS Phase 2 | v4.99.28 | 5 mobile UX fixes: 16px input fonts (no zoom-on-focus), 44×44 chip touch targets, 100dvh body, focus-visible on btn/chip/sb-item. |
| iOS Phase 3 | v4.99.29 | Playwright WebKit + Mobile Safari test projects + IOS_TESTING.md doc + Chromium-only CI gating until iOS suite triaged. |
| iOS Phase 4 | v4.99.30 | Cert-pack lazy-load (saves 510-610 KB on first paint) + CSS preload hint + critical inline body-bg. |
| iOS Phase 5 | v4.99.31 | A2HS banner (Android `beforeinstallprompt` + iOS share-sheet hint), standalone-mode body class + display-mode media query, web push SW handlers (subscribe deferred). |
| Triage | v4.99.32 | Playwright 37→0 failures via auth-state stub `beforeEach` + 5 test fixes. Suite green in 1.5 min. |
| Hotfix | v4.99.33-34 | BYOK gate fix for signed-in mobile users (founder-caught on iPhone): `window._certanvilSignedIn` flag wired through `auth-state.js`. |

**Codebase mobile-readiness audit (live):**
- 158 `@media` rules in `styles.css` (good coverage)
- 277 `max-width` / `min-width` references
- **15 breakpoints in the 760-999px "tablet zone"** — fragmented, not designed-for tablet, just incidental
- 5 touch event handlers (sparse — most interaction is click-only, mostly works on touch)
- 3 device-detection sites (`window.innerWidth < 900`)
- 0 Capacitor / Cordova / WebView wrapper code (we're a pure PWA)
- Safe-area-inset support live ✓ (since v4.99.28)
- Mobile sidebar drawer toggle live ✓ (since v4.53.0)
- Standalone-mode body class live ✓ (since v4.99.31)

**What works on mobile today (rough):**
- Setup page, Today's Plan, Weak Spots — all mobile-tested
- Practice quiz / exam — works on mobile
- Subnet Trainer practice mode — works on mobile (pre-Pro-gate)
- Port Drill — works on mobile
- Acronym Blitz / OSI Sorter / Cable ID — work on mobile

**What's broken or unverified on mobile:**
- **Topology Builder** — pure desktop UI. 1800×1100 canvas + drag-and-drop palette. Mobile users get a useless cramped view. No "use desktop" message.
- **Network Builder 3D View** — Three.js + mouse-only orbit controls. Touch gestures NOT wired. Probably hard-broken on phones.
- **ACL Builder** — complex multi-pane layout. Likely cramped on phone, untested.
- **Production Monitor** — debug surface, unverified on mobile.
- **Daily Recap modal, Milestone celebration** — animation-heavy, untested at small viewports.
- **Topic Deep Dive long-form content** — text legibility at 320px width unverified.

---

## Part 2 — Device class targets

Tier 1 (must-be-good before launch — these are the customer-acquisition surfaces):

| Class | Examples | Viewport | Browser | Priority |
|---|---|---|---|---|
| **iOS phone** | iPhone 12 Mini → 16 Pro Max | 320-440 px | Safari 16+ (Chrome iOS = WebKit) | 🔥 |
| **Android phone** | Pixel 6+, Galaxy S20+, Galaxy A series | 360-440 px | Chrome 100+, Samsung Internet 18+ | 🔥 |
| **iPad** | iPad Mini → iPad Pro 13" | 768-1024 px portrait, 1024-1366 px landscape | Safari 16+ | ⭐ |

Tier 2 (must-not-be-broken; OK if not perfect):

| Class | Examples | Viewport | Browser | Priority |
|---|---|---|---|---|
| **Android tablet** | Galaxy Tab S series, Pixel Tablet | 800-1280 px | Chrome 100+ | ⭐ |
| **Touch laptop** | Surface, Chromebook | 1024-1920 px | Edge / Chrome | 💡 |

Tier 3 (deferred):

| Class | Examples | Notes |
|---|---|---|
| Foldables | Galaxy Z Fold | One device class to consider once 1% market share — very few cert students use these |
| TV / kiosk | Apple TV, Fire TV | Out of scope; cert prep isn't a TV experience |

---

## Part 3 — Gap audit (UI × Performance × Day-to-day) per device class

### 3A. UI gaps

#### iOS phone (Tier 1 🔥)
- ✅ Touch targets ≥ 44×44 (v4.99.28)
- ✅ Inputs ≥ 16 px (v4.99.28)
- ✅ Safe-area-inset top + bottom (v4.99.28)
- ✅ Standalone-mode polish (v4.99.31)
- ❌ Pull-to-refresh: browser default (boring blue spinner) — could brand it
- ❌ Long-press / haptic feedback (`navigator.vibrate` — Safari ignores; iOS-specific Taptic via `webkit-touch-callout`)
- ❌ Bottom-of-screen CTA placement: many primary buttons are mid-screen, not in thumb zone
- ❌ Modal handling: some modals (`acl-modal`, `daily-recap-modal`) use `position: fixed` with calc-based heights; confirm they don't overflow on iPhone Mini (320 px wide × 568-812 px tall)
- ❌ Question text wrapping at 320 px width — untested
- ❌ Gesture support: swipe between questions? Currently next-button only

#### Android phone (Tier 1 🔥)
- ✅ Inherits all the iOS-shared work above (16px font, 44px targets, safe-area)
- ❓ Android-specific UA testing **never done** — we ship blind
- ❌ Material Design touch ripple (cosmetic; cheap to add)
- ❌ Web Share API (`navigator.share`) for Android share-sheet integration — not wired
- ❌ Hardware back button on Android: currently unhandled (Android "back" exits the PWA instead of navigating within)
- ❌ Samsung Internet edge cases (large user base in Asia) — never tested

#### iPad (Tier 1 ⭐)
- ❌ **No iPad-specific layout exists**. iPad in portrait at 820 px width hits the `< 900` "isMobile" threshold and gets the phone layout — wasteful of the 200 px extra width.
- ❌ Sidebar always-visible vs drawer: phones drawer + close on tap-outside; iPad could keep sidebar pinned (more like desktop)
- ❌ Two-column layouts where it makes sense (quiz panel + sidebar visible simultaneously in landscape)
- ❌ Touch targets: iPad still needs 44 px (Apple HIG applies), but spacing can be tighter than phone
- ❌ External keyboard: arrow-key nav across questions, Enter to submit, etc. — partially exists, untested on iPad
- ❌ Multi-window / Split View: when iPad is in 1/3 split (~360 px width), behave like phone

#### Android tablet (Tier 2)
- ❌ Same iPad gaps + Android quirks
- Lower priority since cert-prep students rarely use Android tablets primarily

### 3B. Performance gaps

| Metric | Current | Target | Gap |
|---|---|---|---|
| First Contentful Paint (slow 3G) | ~3.5 s estimated | < 2 s | ~40% slow on cellular |
| Time to Interactive (slow 3G) | ~5 s estimated | < 3.5 s | Need code-split |
| `app.js` size | ~2 MB minified | < 400 KB initial | Saas-gated split (#138) |
| `styles.css` size | ~485 KB | < 100 KB initial | Saas-gated split (#55) |
| Cert pack | ✅ ~530 KB lazy-loaded (one of two) | ✅ shipped v4.99.30 | done |
| Lighthouse mobile score | **never measured** | > 75 | Baseline first |
| Web Vitals (LCP / INP / CLS) | not tracked | LCP < 2.5s / INP < 200ms / CLS < 0.1 | Add measurement |
| Battery drain (long quiz) | not measured | minimal | Audit timers + animations |

#### Performance work, ordered:
1. **Lighthouse mobile baseline** — run once, capture scores. Establishes the floor.
2. **Web Vitals tracking** — `web-vitals` lib (3 KB), POST p99 LCP/INP/CLS to Supabase or PostHog. Tells us when reality diverges from synthetic.
3. **Slow-3G profile** — DevTools "Slow 3G" preset, cold load networkplus.certanvil.com, capture waterfall. Identifies per-resource bottlenecks.
4. **App.js + styles.css splits** — currently `saas-gated` (issues #55 + #138). Founder direction needed: do we un-gate now that pre-launch is days away?
5. **Connection quality detection** — `navigator.connection` (Network Information API). Show "Loading might be slow on your connection" hint when `effectiveType === 'slow-2g'` or `'2g'`.

### 3C. Day-to-day mobile use gaps

- **Visibility API**: pause exam timer when tab is backgrounded (currently keeps ticking; iPhone tester loses ~30 s if a notification interrupts)
- **Connection state**: `online` / `offline` events — show "You're offline; quiz queued" banner; resume on reconnect
- **Storage quota**: `navigator.storage.estimate()` to detect low storage; warn before localStorage write fails
- **Wake lock**: `navigator.wakeLock` to keep screen on during exam mode (90-min uninterrupted)
- **Web Share**: `navigator.share()` for "Share my passing score" — Android love this; iOS too post-Safari 12.1
- **Save-Data header**: respect `navigator.connection.saveData === true` — skip animations, don't auto-load 3D scenes, etc.
- **Reduced-data preference**: `prefers-reduced-data` media query
- **Print stylesheet**: scenario-card export, certificate-style score export — not on mobile critical path but nice
- **Autofill**: API key field (now hidden), email field on auth modal — verify autofill works correctly

### 3D. Cross-platform desktop-only feature audit

These are features built for desktop UX. Mobile users either get a broken experience or should be redirected:

| Feature | Mobile state | Recommendation |
|---|---|---|
| Topology Builder | Cramped 1800×1100 canvas, drag-and-drop fails on touch | Show "Use desktop for the Topology Builder" message at < 900 px; offer link to email-self-the-link |
| Network Builder 3D View | No touch controls for orbit / pan / zoom | Either wire OrbitControls touch events (1-2 days work), or show same desktop-redirect message |
| ACL Builder | Multi-pane complex layout | Audit at 375 px; either responsive-collapse or desktop-redirect |
| Production Monitor | Debug surface, low priority | Verify works at 375 px; not user-facing |

**Decision principle**: don't ship a half-broken mobile version of a desktop feature. Either make it work properly OR show a kind, clear "this works best on desktop" message with a link path.

---

## Part 4 — Phase 6+ ship plan

### Phase 6 — Mobile baseline measurement (Tuesday tech-debt slot, ~2 hrs)

**Goal**: know the actual numbers before we optimize further.

- 6.1: Run Lighthouse Mobile on prod from desktop Chrome DevTools. Capture Performance / Accessibility / Best Practices / SEO. **Save baseline scores in `MOBILE_BASELINE.md`.**
- 6.2: Same prod URL, throttled to "Slow 3G" + "4× CPU slowdown" preset. Capture Network waterfall + Performance trace. Identify top 3 bottleneck resources.
- 6.3: Add `web-vitals` lib (3 KB) to `app.js` boot path. POST `{ lcp, inp, cls, fcp, ttfb }` to a Supabase function `record_web_vitals` once per page load. Skip on dev/preview hosts.
- 6.4: Real-iPhone smoke via `IPHONE_SMOKE.md` to compare hardware vs Lighthouse synthetic.
- 6.5: Real-Android smoke (founder needs to borrow / acquire an Android device, OR use BrowserStack free trial).

**Deliverables**: `MOBILE_BASELINE.md` with current scores, identified bottlenecks, and a per-bottleneck recommendation.

**Ship**: not a code ship — a measurement ship. Writes baseline doc + adds web-vitals collector.

### Phase 7 — Tablet layouts (Wednesday feature day, ~3-4 hrs)

**Goal**: iPad portrait + landscape feel deliberate, not phone-stretched.

- 7.1: Add `(min-width: 768px) and (max-width: 1024px)` "tablet" media-query block to styles.css. Define:
  - Sidebar pinned (don't drawer-collapse on iPad)
  - Two-column: setup-page chip groups in 2-up grid (currently 1-up at iPhone width)
  - Larger but tighter spacing than phone; closer to desktop than mobile
- 7.2: Audit each major page (setup, quiz, exam, subnet, ports, drills, analytics) at iPad portrait (768 px) + landscape (1024 px). Document fixes needed.
- 7.3: Apply the 5-10 highest-priority fixes from the audit.
- 7.4: Real-iPad smoke (founder has access? Confirm).

**Ship**: v4.99.40-ish. UAT delta ~10 guards (tablet-specific media queries + body class for tablet).

### Phase 8 — Desktop-only feature handling (Thursday tech-debt slot, ~2 hrs)

**Goal**: Topology Builder + 3D View + ACL Builder don't show a half-broken mobile UX.

- 8.1: Add a `_isDesktopOnlyFeature(featureName)` gate that triggers at viewport < 768 px AND touch-capable.
- 8.2: For each desktop-only feature, replace the small-viewport render with a clean message: "🖥️ The [Feature Name] works best on desktop. [Email me a link to my desktop browser]" — Web Share intent or copy-link fallback.
- 8.3: Add a "👀 Preview" mini-image so users see what they're missing.

**Ship**: v4.99.41-ish. UAT delta ~6 guards.

### Phase 9 — Android-specific polish — **DEFERRED** post-launch (founder direction 2026-05-10)

**Status**: frozen until paying-user trigger fires. iOS share covers most of the cert-prep target market through end of June.

**When unfrozen** (~3 hrs):
- 9.1: Real-device test on Android (BrowserStack subscription or borrowed device).
- 9.2: Hardware back button wiring (`history.pushState` + `popstate`).
- 9.3: Web Share API for "Share my exam score" on Android share-sheet.
- 9.4: Material Design touch ripple via CSS `:active`.
- 9.5: Real-Android A2HS smoke (Phase 5 wiring untested on hardware).

### Phase 10 — Day-to-day mobile usability (Friday feature day, ~3 hrs)

**Goal**: app feels considerate of mobile reality.

- 10.1: Visibility API — pause exam timer when tab backgrounded; resume on visible.
- 10.2: Online/offline banner — `online` / `offline` event listeners, show toast.
- 10.3: Save-Data respect — `navigator.connection.saveData === true` → skip A2HS banner, skip non-essential animations.
- 10.4: Wake Lock during exam mode — `navigator.wakeLock.request('screen')` keeps screen on for 90 min. Release on submit.
- 10.5: `inputmode="numeric"` on Subnet Trainer + Port Drill numeric inputs (mobile shows number pad, not full keyboard).

**Ship**: v4.99.43-ish. UAT delta ~12 guards.

### Phase 11 — Performance code-split — **UN-GATED 2026-05-10** (founder direction)

**Goal**: app.js + styles.css split into shell + lazy chunks. Cuts first-paint cost by 70%.

- Issues **#138** (app.js split) + **#55** (styles.css split) — un-gated for pre-launch ship.
- Estimated 6-8 hours over 2 Wednesday + Friday feature days.
- Real win: pre-installed PWA users see < 1 s cold start, fresh visitors see < 2.5 s on 4G.
- Approach: extract drill modules + 3D View (already lazy) + ACL Builder + topology coach into dynamic-import chunks. Shell stays < 400 KB.
- Risk: this is the most invasive ship of Phase 6-11. Real-iPhone + real-iPad smoke per ship is non-negotiable.

### Phases 12+ — App Store distribution

See `APP_STORE_DISTRIBUTION.md`. Deferred until pre-launch (paying users imminent).

---

## Part 5 — Success criteria

By end of Phase 10, before App Store consideration:

- [ ] Lighthouse Mobile Performance ≥ 75 (currently unmeasured)
- [ ] Web Vitals: LCP < 2.5 s p75, INP < 200 ms p75, CLS < 0.1 p75 — measured from real users
- [ ] Real-iPhone smoke (`IPHONE_SMOKE.md`) passes all 6 phases
- [ ] Real-Android smoke (a parallel `ANDROID_SMOKE.md` to be drafted in Phase 9) passes
- [ ] iPad portrait + landscape layouts feel deliberate (not phone-stretched)
- [ ] No desktop-only feature shows a half-broken state on mobile — clean redirect message instead
- [ ] Visibility API + online/offline banners + Wake Lock all wired
- [ ] Web Share API live for Android (and iOS Safari 12.1+)
- [ ] Hardware back button handled on Android
- [ ] Code-split decision made (un-gate or defer to post-Stripe)

---

## Part 6 — Cadence + timeline (locked 2026-05-10)

Calendar from 2026-05-10 (Sunday) to App Store target end of June (~7 weeks):

| Week | Phase | Day-of-week slot | Effort | Ship target |
|---|---|---|---|---|
| Week 1 (May 11-17) | **Phase 6** baseline + Web Vitals collector | Sun/Mon active | 2-3 hrs | v4.99.40 |
| Week 1 | **Phase 7** tablet layouts (iPad) | Wed feature | 3-4 hrs | v4.99.41 |
| Week 1 | **Phase 8** desktop-only redirects | Thu tech-debt | 2 hrs | v4.99.42 |
| Week 2 (May 18-24) | **Phase 10** day-to-day usability | Fri feature | 3 hrs | v4.99.43 |
| Week 2-3 | **Phase 11** code-split (the big one) | Wed + Fri block | 6-8 hrs | v4.99.44-45 |
| Week 4 (Jun 1-7) | App Store: Apple Developer enrollment | founder action | 1 hr active + 48 hr wait | — |
| Week 4-5 | App Store: Capacitor setup + native plugin wiring | 2 days | 4 hrs/day | v4.99.50 (PWA still primary) |
| Week 5 (Jun 8-14) | App Store assets (icons, screenshots, descriptions) | 1 day | 4 hrs | — |
| Week 5 | App Store submission | 1 day | 2 hrs | submitted |
| Week 6-7 (Jun 15-28) | Apple review wait + address rejections | passive + reactive | — | approved |
| **Jun 28** | **Coordinate App Store release with web launch comms** | — | 1 hr | LIVE |
| **Jul 2** | Founder holiday — handover-ready | — | — | — |

**Total work**: ~26 hours across 7 weeks. Comfortable pace; 4 hrs/week average.

**Phase 9 (Android)**: deferred post-launch per founder. Reserve 3 hrs for it ~30 days after first paying users (revenue-justified).

---

## Part 7 — Founder decisions LOCKED (2026-05-10)

| Question | Decision |
|---|---|
| Code-split un-gate? | ✅ Un-gated. Phase 11 fires. |
| Android device access? | Defer Phase 9 post-launch. Don't pay BrowserStack yet. |
| iPad access? | Confirmed — founder owns one, real-device smoke runs locally. |
| Web Vitals destination? | Supabase function. New `record_web_vitals` RPC + `web_vitals` table. Owns data, no new vendor. |
| Phasing aggressiveness? | Multi-day chunks across 7 weeks. ~4 hrs/week. End-June App Store live. |

---

## Part 8 — Why this matters

Pre-launch reality check:
- ~75% of cert students browse from phone (industry average for adult learners)
- iPhone Safari + Android Chrome are the two dominant referrers we'll see in launch analytics
- A great mobile experience converts to A2HS install which converts to retention
- A broken-on-mobile experience kills founder confidence in the demos and word-of-mouth

The iOS-only plan (Phases 1-5) was the right starting move — most paying customers come via iPhone. But "mobile = iOS" is an undercount: Android global market share is 70%+ even if it's lower in the US/UK cert-prep demographic. Tablets are an underserved sweet spot — iPad users have time + intention to study + cash to spend on Pro.

This plan covers the gap between "iOS works" (today) and "the app feels considered on every device a paying customer might use" (Phase 10 done).

---

*Drafted 2026-05-10 12:45 BST. Pair with `MOBILE_IOS_PLAN.md` (Phases 1-5, all shipped) and `APP_STORE_DISTRIBUTION.md` (deferred). Maintained as the cross-platform mobile reference.*
