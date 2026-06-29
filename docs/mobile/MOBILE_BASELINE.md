---
type: mobile
status: active
cert: all
updated: 2026-06-29
tags: [mobile]
---
# Mobile Performance Baseline — v4.99.34

**Captured**: 2026-05-10 13:15 BST
**Tool**: Lighthouse 12 mobile preset (412×823 viewport, simulate throttling)
**Target URL**: https://networkplus.certanvil.com (prod, anonymous user)
**Why**: pre-flight for `MOBILE_OPTIMIZATION_PLAN.md` Phases 7-11. Establishes the floor we're optimizing from.

---

## Lighthouse category scores

| Category | Score | Verdict |
|---|---:|---|
| **Performance** | **64** | ⚠️ Below 75 target — Phase 11 code-split unblocks this |
| **Accessibility** | **94** | ✅ Strong; ~5 minor a11y items to fix in Phase 8 |
| **Best Practices** | **100** | ✅ Perfect |
| **SEO** | **100** | ✅ Perfect |

## Core Web Vitals

| Metric | Score | Target (good) | Verdict |
|---|---:|---:|---|
| First Contentful Paint (FCP) | **5.6 s** | < 1.8 s | ❌ Critical |
| Largest Contentful Paint (LCP) | **5.9 s** | < 2.5 s | ❌ Critical |
| Speed Index | **6.1 s** | < 3.4 s | ❌ Critical |
| Time to Interactive (TTI) | **5.9 s** | < 3.8 s | ❌ Critical |
| Cumulative Layout Shift (CLS) | **0.002** | < 0.1 | ✅ Excellent |
| Total Blocking Time (TBT) | **20 ms** | < 200 ms | ✅ Excellent |

**The story**: render-blocking on the critical path is the entire problem. Once the page paints, JS execution + interactivity are fast (TBT 20ms is great). The 5.9-second wait to first paint is the user pain point — phones on cellular feel like the app is dead.

---

## Top render-blocking resources (Lighthouse opportunity #1, 3,626ms savings)

| Resource | Size | Wasted ms | Notes |
|---|---:|---:|---|
| `app.js` | 614 KB | 3,150 ms | **THE bottleneck.** 64% unused on first paint. |
| `lib/supabase-umd.min.js` | 50 KB | 300 ms | 82% unused on first paint. Loaded synchronously in critical path. |
| `styles.css` | 138 KB | (preloaded since v4.99.30) | Already preload-hinted; remaining cost is parse time |

## Top unused JS (Lighthouse opportunity #2, 2,100ms savings)

| Resource | Total | Unused | % wasted |
|---|---:|---:|---:|
| `app.js` | 614 KB | 399 KB | 64% |
| `supabase-umd.min.js` | 50 KB | 41 KB | 82% |

## Total page weight

**1,010 KiB** transferred on first load. Breakdown:

| Resource | Size | Type |
|---|---:|---|
| `app.js` | 614 KB | Script |
| `certs/netplus.js` | 145 KB | Script (active cert only since v4.99.30) |
| `styles.css` | 138 KB | Stylesheet |
| `lib/supabase-umd.min.js` | 50 KB | Script |
| `index.html` | 41 KB | Document |
| `auth-state.js` + `cloud-store.js` + `migration.js` | 17 KB | Script (Phase C′) |
| `lib/supabase.js` | 3 KB | Script |
| `manifest.json` | 1 KB | PWA manifest |

---

## Diagnostics flagged

| Diagnostic | Score | Note |
|---|---:|---|
| DOM size | 0 | **1,968 elements**. Excessive. ~30 modal templates in `index.html` even though only 1 is open at a time. |
| Heading order not sequential | 0 | A11y. Some pages have `h1 → h3` skipping `h2`. |
| Color contrast | 0 | A11y. Few sub-3:1 ratio sites — likely the dim secondary text. |
| Missing source maps for large first-party JS | 0 | Could be added but low ROI; debuggable inline anyway. |
| Render-blocking requests | 0 | (Same as opportunity #1 — both flag the same items.) |

---

## Phase-by-phase impact projection

What each upcoming phase should move the Performance score by, based on these numbers:

| Phase | Change | Est. Performance score after |
|---|---|---:|
| **Baseline (today)** | — | **64** |
| Phase 7 (tablet layouts) | layout shifts may improve CLS but not LCP | 64 |
| Phase 8 (desktop-only redirects) | smaller DOM → 5-10 pt gain | 70 |
| Phase 10 (day-to-day usability) | Visibility API + Wake Lock add 0-2 KB | 70 |
| **Phase 11 (code-split)** | **slashes app.js render-block from 3,150 ms → ~600 ms** | **85+** |

The code-split is the gravity well. Everything else is rounding error compared to it. **Phase 11 is the only phase that gets us to "good".**

---

## Recommended next-phase order (revised post-baseline)

The original plan had Phase 7 → 8 → 10 → 11. With baseline data in hand, **Phase 11 should move earlier** — it's the one phase that materially changes the user experience on cellular.

**Revised order:**

1. **Phase 6b (next)**: Web Vitals collector via Supabase function. 1 ship, ~2 hrs. Lets us see real-user data (vs Lighthouse synthetic) once code-split lands.
2. **Phase 11 (next big one)**: code-split. **Wednesday + Friday block this week.** Highest ROI.
3. **Phase 7 (tablet)**: parallel-friendly with Phase 11 since it's CSS work. Could land same week.
4. **Phase 8 (desktop-only redirects)**: post-Phase 11 — smaller DOM is half the work.
5. **Phase 10 (day-to-day)**: late-week feature day, low-risk additive work.

Net: same end-of-June App Store target, but **mobile feels great by week 2 instead of week 3**.

---

## Re-measure cadence

Re-run Lighthouse after every Phase 7+ ship and update this doc. Target trajectory:

| Date | Version | Phase | Perf | FCP | LCP | SI | TBT | Render-block |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 2026-05-10 13:15 | v4.99.34 | baseline | **64** | 5.6s | 5.9s | 6.1s | 20ms | 3,450ms |
| 2026-05-10 13:35 | v4.99.35 | **11a (defer)** | **65** | 5.5s | 5.9s | **5.5s** | 60ms | **0ms ✓** |
| 2026-05-10 18:30 | v4.99.36 | **11b (NA only)** | 63 | 5.8s | 6.1s | 5.8s | 90ms | 0ms |
| 2026-05-10 19:30 | v4.99.37 | **11b (NA + PHT)** | 65 | 5.3s | 5.7s | 5.3s | 50ms | 0ms |
| 2026-05-10 21:00 | v4.99.38 | **11b (+ Port Drill)** | 65 | 5.3s | 5.7s | 5.3s | 60ms | 0ms |
| 2026-05-10 22:30 | v4.99.39 | **11b (+ IRW)** | 64 | 5.4s | 5.8s | 5.6s | 80ms | 0ms |
| 2026-05-11 11:30 | v4.99.42 | **11b (+ Subnet Trainer)** | 65 | 5.3s | 5.7s | 5.5s | 100ms | 0ms |
| 2026-05-11 12:15 | v4.99.43 | **11b (+ ACL Builder)** | 65 | 5.0s | 5.4s | 5.0s | 40ms | 0ms |
| 2026-05-11 _TBD_ | v4.99.44 | **11c (+ Topology Builder — THE score-jumper)** | _target 80+_ | _target 2.5-3.0s_ | _target 2.5-3.0s_ | — | — | 0 |
| _TBD_ | — | Phase 7+8 | _target 88+_ | _target < 1.8s_ | _target < 2.0s_ | — | — | 0 |
| _TBD_ | — | Phase 10 | _target 90+_ | _stable_ | _stable_ | — | — | 0 |

### Phase 11c (Topology Builder) — pre-Lighthouse projection (2026-05-11)

**This is the score-jumper ship.** Topology Builder is the biggest single feature in the cert app — 14,330 LOC of canvas rendering, AI generation, lab system, fix challenges, CLI dispatch, 3D View entry/exit, and 16 scenarios. It's also the one feature on the cert app that is genuinely **desktop-only** by design (the 1800×1100 canvas, multi-pane device palette, and drag-to-place workflow simply do not fit a phone viewport — even when scaled). Phase 11c bundles two complementary patterns into one ship:

1. **Lazy-load**: the module only fetches when `openTopologyBuilder()` is called.
2. **Phase 8 desktop-only redirect**: the shell stub checks `window.innerWidth < 900` BEFORE `_loadFeature` fires. Mobile users get a clear "open on a wider screen" toast and never download the module at all.

So mobile users save the full ~350-400 KB transfer of a feature they were never going to use anyway. Desktop users still get TB on first navigation, paying the (still-improved) one-time cost.

**Structural delta** (measured from git):
- app.js shell: 33,962 lines → **19,667 lines** (-14,295 lines, **-42% in one ship**)
- Cumulative trajectory: 41,021 (v4.99.34 baseline) → 19,667 (v4.99.44) = **-21,354 lines / -52%** since Phase 11 began
- features/topology-builder.js: 14,505 lines new module (IIFE-wrapped)

**Expected Lighthouse impact** (post-deploy re-measure pending):
- Perf score: 65 → **80+** (the threshold-crossing ship — likely lands at App Store gate)
- LCP: 5.4s → **2.5-3.0s** (the metric that gates "good" for both Lighthouse + Apple's App Store quality bar)
- app.js shell transfer: 508 KB → ~250-280 KB (-45%)

**The one bug caught at the wire**: post-extraction, the `await import('./tb3d.js')` inside the new IIFE silently 404'd (relative path now resolves to `/features/tb3d.js`). Symptom: clicking the 🧭 3D View pill opened it for ~50ms then auto-closed. Caught by Playwright's `tb-3d-host-active` class assertion failing across 9 tests. Fixed by changing to absolute `/tb3d.js`. UAT regression-guards both paths now. Lesson logged for future extractions: **audit dynamic-import paths during any file-relocation**.

**Why this matters for the App Store roadmap**: the v4.99.34 baseline projection had Phase 11 as the ONLY phase that materially moves LCP. Phase 11a (defer) was infrastructure. Phase 11b sessions 1-6 proved the pattern across 6 features. Phase 11c is the gravity well — combined with the per-cert pack lazy-load (Phase 5) and feature module concat (Phases 11b), this is the architecture that gets the cert app into App Store distribution at end-of-June.

### Phase 11b session 1 (NA only) honest assessment (2026-05-10)

**Pattern proven, perf needle barely moved**: extracted Network Analysis Drill (1,053 LOC, ~50 KB raw / ~17 KB transferred). Performance 65 → 63 (within run variance). LCP +200ms (regression within noise). app.js 614 KB → 597 KB.

**Why so little movement**: NA was only ~3% of the shell. The big gains live in the bigger features still in-shell — Packet Trace (5,170 LOC), ACL Builder (2,200 LOC), Phishing Triage (1,187 LOC), Incident Response (911 LOC). Combined those are 9,500 LOC vs NA's 1,000.

**What this session actually delivered**: the lazy-load *infrastructure* — `_loadFeature()` helper, `features/` directory contract, IIFE + window-exposure pattern, UAT auto-concat, Playwright stub-hardening. Each subsequent feature extraction is now mechanical (~30-60 min). Wednesday session can extract all 4 remaining features in one block.

**Re-measure expectation post Phase 11b sessions 2 + 3**: app.js 597 KB → 280-320 KB, Performance 63 → 80-85, LCP 6.1s → 2.5-3.0s. THAT is the perf-score-jumps-to-App-Store-gate moment.

### Phase 11a honest assessment (2026-05-10)

**Structural win**: render-blocking resources count went 2 → 0 (the Lighthouse opportunity #1 — "Eliminate render-blocking resources" — is now satisfied). Speed Index dropped 608ms (6.1s → 5.5s).

**Score barely moved**: Performance 64 → 65 (+1). Lighthouse synthetic run variance is ±3-5 points, so this is essentially flat.

**Why**: Phase 11a deferred *when* app.js runs but didn't reduce *how much* JS the browser has to parse + execute. LCP is gated on app.js executing all 614 KB before content paints. Defer just changed the timing curve, not the fundamental cost.

**TBT went up** (20ms → 60ms): defer concentrates JS execution into a single post-parse window, briefly saturating the main thread. Still well under the 200ms "good" threshold; noticeable only on slow phones.

**The real win is Phase 11b** — actual extraction of Pro-only features (Topology Builder, ACL Builder, IRW, PHT, Network Analysis Drill, Packet Trace) into separate lazy-loaded files. That cuts the 614 KB shell to ~250-300 KB, which IS what makes LCP drop below 2.5s. Phase 11a was the prerequisite refactor; Phase 11b is where the user feels it.

App Store submission gate: **Performance ≥ 85** AND **LCP < 2.5 s** on this measurement. Phase 11b gets us there.

---

*Baseline JSON archived at `/tmp/lighthouse-mobile-baseline.json` (582 KB) for diff-against future runs. Maintained as the live perf-regression doc; update after each phase ship.*

## Related
[[MOBILE_IOS_PLAN]] · [[APP_STORE_DISTRIBUTION]] · [[IOS_TESTING]] · [[structure-overview]]
