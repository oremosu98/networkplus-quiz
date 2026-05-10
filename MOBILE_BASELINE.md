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

| Date | Phase shipped | Performance | LCP | DOM size |
|---|---|---:|---:|---:|
| 2026-05-10 | baseline | 64 | 5.9s | 1,968 |
| _TBD_ | Phase 11 | _target 85+_ | _target < 2.5s_ | _smaller via lazy-load_ |
| _TBD_ | Phase 7+8 | _target 88+_ | _target < 2.0s_ | _target < 1,500_ |
| _TBD_ | Phase 10 | _target 90+_ | _stable_ | _stable_ |

App Store submission gate: **Performance ≥ 85** AND **LCP < 2.5 s** on this measurement.

---

*Baseline JSON archived at `/tmp/lighthouse-mobile-baseline.json` (582 KB) for diff-against future runs. Maintained as the live perf-regression doc; update after each phase ship.*
