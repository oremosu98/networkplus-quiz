# App Store Distribution — iOS + Mac App Store Plan

**Status**: drafted 2026-05-10 · **DEFERRED** until pre-launch trigger fires
**Trigger**: paying users imminent (Stripe Phase 4 unfreezes) AND `MOBILE_OPTIMIZATION_PLAN.md` Phases 6-10 complete
**Predecessor**: `MOBILE_OPTIMIZATION_PLAN.md` — once mobile-optimized, App Store is the distribution amplifier

> **Founder direction (2026-05-10)**: *"we also eventually as a last task — bringing this app into the iOS and Mac OS Store. We need a plan around that but this won't come until we are just about ready to launch."*

This document is the strategy + cost + effort scope for iOS App Store and Mac App Store distribution. **Don't auto-execute any of this without explicit founder direction.** The plan exists so that when the trigger fires, we can move fast.

---

## Part 1 — Why App Store at all (vs PWA-only)

The cert app already works as a PWA — A2HS install + standalone mode (v4.99.31). Why bother with App Store?

**Discovery**: 60%+ of paying cert-prep customers find apps via App Store search. PWAs are invisible to that funnel — no ASO, no Featured spots, no Editor's Choice, no Search ads.

**Trust**: "Found it on the App Store" is shorthand for "vetted by Apple/Google". Cert students paying $9.99/mo want assurance it's not a scam.

**Notifications**: iOS Web Push works only for installed PWAs (16.4+) AND only via complex VAPID setup. App Store apps get full APNs out of the box.

**Native features**: Apple Pencil annotation in Topic Deep Dive notes, ARKit for topology visualization (long-shot), HealthKit study-streak integration (long-shot), proper Siri shortcuts.

**Trade-off**: App Store apps get ~30% revenue cut on subscriptions (15% after year 1 / under $1M ARR via Small Business Program). Direct PWA pricing keeps 100% (minus Stripe 2.9% + 30¢).

**Verdict for cert app**: ship App Store as a discovery + trust amplifier, NOT as the primary purchase path. Web pricing remains the cheaper option; App Store path costs 30% but unlocks discovery.

---

## Part 2 — Distribution paths compared

### Path A: PWA wrapper via Capacitor (recommended)

**What**: Capacitor (by Ionic) wraps an existing web app in a native shell. Same `app.js` / `styles.css` / `index.html` runs inside a WKWebView (iOS) or WebView (Android). One codebase, native APIs available via plugins.

- **Effort**: ~3-4 days for first version (config, icons, splash, push setup, App Store / Play Store submission). Existing PWA work transfers ~95%.
- **Maintenance cost**: low — every code change in the web app updates the wrapper next time we rebuild.
- **Native APIs**: 60+ official plugins (camera, geolocation, push, biometric, file storage, share, haptics).
- **App Store acceptance**: Apple's 4.2 guideline ("apps must offer features beyond a website") used to reject pure PWA wrappers. Capacitor projects pass when they wire ≥1 native plugin (push notifications + biometric login = enough).
- **Cost**: Capacitor itself is free + open source. Apple Developer Program $99/year. Google Play one-time $25.

**Trade-off**: WKWebView rendering = same bugs as Safari. We've already invested in mobile Safari fixes (Phases 1-5), so this works in our favor.

### Path B: Native rewrite (NOT recommended)

**What**: Build native iOS app in Swift/SwiftUI + Android in Kotlin/Compose. Same backend + Supabase, but UI is platform-native.

- **Effort**: ~8-12 weeks per platform, ~16-24 weeks total.
- **Maintenance cost**: high — every web feature must be re-implemented twice (iOS + Android).
- **Native feel**: best possible — full SwiftUI, full Material 3, perfect platform behaviors.
- **App Store acceptance**: cleanest possible.

**Trade-off**: 4-6 months of work for a single founder. Cert app is too early-stage; we don't have the engineering bandwidth. **Skip.**

### Path C: PWABuilder (Microsoft's PWA-to-store tool)

**What**: PWABuilder.com analyzes a manifest + service worker, generates platform-specific store packages.

- **Effort**: ~1 day for first iOS package, similar Android.
- **Maintenance cost**: very low — re-run PWABuilder when we want to push an update.
- **Native APIs**: limited; relies on the PWA's own API support.
- **App Store acceptance**: variable. Apple has rejected pure PWA-builder packages historically; generally OK if we have push + offline support solid.

**Trade-off**: even less native flexibility than Capacitor. Use this only if Capacitor turns out to be too heavy.

### Path D: Trusted Web Activity / TWA (Android only)

**What**: Google's official Android-only path for "this Android app is just my PWA". Works ONLY on Android.

- **Effort**: ~1 day, follows PWABuilder TWA template.
- **Pairs with**: Path A or C for iOS coverage.

**Trade-off**: Android-only. Need a separate iOS path.

### Recommendation: Capacitor (Path A) for both iOS + Android

Single tool covers both stores. Wraps our existing PWA. Already-mobile-optimized cert app means the wrapper inherits everything Phase 6-10 polishes. Native APIs available via plugins when we want them.

---

## Part 3 — iOS App Store path (Capacitor)

### Phase A: Apple Developer enrollment (founder action, ~1 hour)

- 3.A.1: Apple ID set up with two-factor authentication.
- 3.A.2: Enroll in Apple Developer Program at developer.apple.com — **$99/year, individual or organization**. Choose individual (faster — no D-U-N-S verification).
- 3.A.3: Wait 24-48 hours for enrollment approval.

### Phase B: Capacitor setup (~4 hours)

- 3.B.1: Install Capacitor in the cert app: `npm i @capacitor/core @capacitor/ios @capacitor/android`. Bumps deps; doesn't change web build.
- 3.B.2: Run `npx cap init CertAnvil com.certanvil.app --web-dir=.` — creates `capacitor.config.ts` + `ios/` + `android/` directories.
- 3.B.3: Create app icons in all required sizes (Apple needs ~15 sizes; tools like icon.kitchen automate). 1024×1024 master from existing favicon.svg.
- 3.B.4: Create splash screens (light + dark variants for various device sizes; Capacitor's `@capacitor/splash-screen` plugin handles).
- 3.B.5: `npx cap add ios` → opens Xcode project. Build + run on simulator first.
- 3.B.6: Wire native plugins: `@capacitor/push-notifications` (for APNs), `@capacitor/share` (Web Share equivalent), `@capacitor/preferences` (better than localStorage on iOS).

### Phase C: App Store Connect submission (~4 hours)

- 3.C.1: Create app record in App Store Connect:
  - Name: CertAnvil
  - Bundle ID: com.certanvil.app
  - SKU: certanvil-ios-001
  - Primary language: English (US)
- 3.C.2: Subscriptions setup (only if ready for Phase 4 Stripe):
  - $9.99/mo Pro tier
  - $89/yr Pro Annual
  - StoreKit 2 IAP via `@capacitor/in-app-purchase` plugin OR direct StoreKit
- 3.C.3: Privacy Nutrition Labels — declare:
  - Data Used to Track You: none
  - Data Linked to You: email address (for sign-in)
  - Data Not Linked to You: usage data (Web Vitals from Phase 6)
- 3.C.4: App Tracking Transparency: not needed (no third-party tracking).
- 3.C.5: Screenshots — required at multiple sizes:
  - iPhone 6.9" (1320×2868) — primary set, 3-10 screenshots
  - iPhone 6.5" (1242×2688) — backwards compat
  - iPad Pro 13" (2064×2752)
  - Use Figma + actual app screenshots as templates
- 3.C.6: App Preview videos (optional but recommended): 15-30 sec videos showing core flows.
- 3.C.7: Marketing description, keywords, support URL, privacy policy URL.

### Phase D: Submit + handle review (~7-14 days passive)

- 3.D.1: Archive build via Xcode → upload to App Store Connect.
- 3.D.2: Submit for review.
- 3.D.3: First review typically 24-48 hours. Common rejection reasons + how to handle:
  - **4.2 Minimum Functionality** ("just a website"): show that we have native push + biometric + offline support beyond Safari capability.
  - **5.1.1 Privacy** ("describe data collection"): well-documented privacy policy + accurate Privacy Nutrition Labels.
  - **2.1 App Completeness** ("crashes on launch"): test on every supported device class first.
- 3.D.4: Once approved → "Pending Developer Release" status. Press "Release" when ready (typically same day as web launch).

---

## Part 4 — Mac App Store path

### Option 1: Mac Catalyst (recommended if iOS path goes via Capacitor)

**What**: Apple's tool that takes an iPad app + adapts it for Mac. With Capacitor's iOS app, we'd add Catalyst as a target — same codebase runs on Mac as a Mac App.

- **Effort**: ~2-3 days after iOS Capacitor app is in the store.
- **Behavior**: Mac users get a real `.app` bundle that runs the same WKWebView'd PWA but in a Mac window with Mac menu bar / shortcuts.
- **Pricing**: same Apple Developer membership covers it ($99/year).

### Option 2: Direct PWA install via Safari on macOS

**What**: macOS Sonoma (14.4+) supports "Add to Dock" for PWAs natively — Safari → Share → Add to Dock. No App Store path needed.

- **Effort**: zero (works today).
- **Trade-off**: not in Mac App Store, no discovery.
- **Recommendation**: ship this regardless of App Store decision; it's free.

### Option 3: Mac App Store via Catalyst (separate effort)

If we want a real Mac App Store presence and Catalyst (Option 1) doesn't suffice, ~5-7 days of work to package as a native Mac app.

**Recommendation**: Skip Mac App Store on first ship. Ship "Add to Dock" via Safari (free, today). Ship Catalyst once iOS + Android App Store entries are stable (~3 months later).

---

## Part 5 — Cost summary

| Item | Cost | Frequency | Notes |
|---|---|---|---|
| Apple Developer Program | $99 | annual | covers iOS + Mac App Store + Mac Catalyst |
| Google Play Developer | $25 | one-time | covers Android Play Store |
| Capacitor + plugins | $0 | — | open source |
| App icon design | $0-200 | one-time | DIY with Figma + 1024×1024 favicon, or contract |
| App Store screenshots | $0-300 | one-time | DIY in Figma using device-frame templates |
| App Preview videos | $0-500 | per major version | DIY screen recordings in QuickTime |
| Privacy policy + Terms of Service | $0-300 | one-time | Termly.io / iubenda generate from template |
| **Year 1 total** | **$124-1424** | one-time + annual | Founder-DIY case = $124. Outsourced = $1424. |

For a solo founder: realistic budget = $124 (just the developer fees) + 4-5 days of work.

---

## Part 6 — Timing — when to fire this plan

**Don't fire** until ALL these are true:
1. Stripe Phase 4 unfrozen (paying users path live)
2. `MOBILE_OPTIMIZATION_PLAN.md` Phases 6-10 complete (mobile feels considered on real devices)
3. Real-Android smoke passing (not just real-iPhone)
4. Lighthouse Mobile Performance ≥ 75
5. ≥ 1 week of stable production behavior at current quality
6. ≥ 5 paying-user-equivalent test runs (close-to-real-money signal)

When all 6 are green:
- **Day 1**: Apple Developer + Google Play enrollment (founder, ~1 hour active + 24-48 hr wait)
- **Day 2-3**: Capacitor setup + native plugin wiring
- **Day 4**: Store assets (icons, screenshots, preview video, descriptions)
- **Day 5**: Submit to both stores
- **Day 5-12**: Review wait, address any rejections
- **Day 12-14**: Approved → coordinate "Release" with web launch comms

Total: ~2 weeks from "trigger fires" to "live in stores".

---

## Part 7 — Risks + mitigations

### Risk 1: Apple rejects as "just a website wrapper" (4.2)
**Mitigation**: ensure native plugins are wired (push notifications + biometric login + offline functionality). Document in submission notes. Studies show pure-wrapper rejection rate ~10%; with native plugins it's < 2%.

### Risk 2: 30% revenue cut on App Store IAP eats into our $9.99 pricing
**Mitigation**:
- Keep web pricing as primary path (100% revenue minus Stripe).
- App Store path is for discovery — accept the 30%.
- Apple Small Business Program drops to 15% after first year if under $1M ARR (we will be).
- "Reader app" exception (Apple guideline 3.1.3(d)) may allow pointing users to web sign-up — needs legal review when we get there.

### Risk 3: Long review delays during launch
**Mitigation**: submit ≥ 2 weeks before public launch comms. Don't make App Store availability a hard launch requirement; web is always there.

### Risk 4: Capacitor abstraction leaks → iOS-specific bugs
**Mitigation**: real-iPhone smoke per `IPHONE_SMOKE.md` post-Capacitor build. Web app already mobile-Safari-tested heavily, so leaks should be small.

### Risk 5: Apple ID / Apple Developer account drama
**Mitigation**: enroll early, BEFORE we need it. The first-time enrollment friction (D-U-N-S, two-factor recovery) can take a week. Doing it during launch crunch = pain.

---

## Part 8 — Why DIY is the right call

Founder is solo. Outsourcing this would cost $1500-3000 (one-time) + a contractor relationship. Capacitor + DIY screenshots + DIY descriptions = founder learns the platform AND retains full control. Cert app's existing PWA polish means the heavy lifting is already done.

This is the kind of work where ChatGPT / Claude can substantially accelerate the boilerplate (privacy policy templates, screenshot copy, store description first drafts). Founder reviews + ships.

---

## Part 9 — Open decisions for when this plan fires

1. **Capacitor vs PWABuilder**: Capacitor recommended (Part 2), but PWABuilder is faster. Decide based on whether we want push notifications native-quality.
2. **iOS first vs both stores in parallel**: serial is safer (learn from first submission, apply to second); parallel saves 2 weeks calendar time.
3. **Mac App Store first ship or defer**: Catalyst is straightforward but adds 2-3 days. Defer recommended.
4. **In-app purchase via StoreKit vs web-only payments**: 30% Apple cut is real. Web-only payment via "Reader app" exception possible but legally murky.
5. **App name**: "CertAnvil" alone, "CertAnvil — CompTIA Cert Practice", or cert-specific ("CertAnvil for Network+")? ASO research needed when this plan fires.

---

*Drafted 2026-05-10 12:50 BST. Companion to `MOBILE_OPTIMIZATION_PLAN.md`. **DO NOT** start any of this work without explicit founder direction — the plan exists for fast execution when the trigger fires, not for autonomous progress.*
