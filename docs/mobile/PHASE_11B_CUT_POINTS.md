---
type: mobile
status: active
cert: all
updated: 2026-06-29
tags: [mobile]
---
# Phase 11b — Feature Module Extraction Cut-Points

**Status**: surveyed 2026-05-10 14:30 BST · awaiting first extraction session
**Predecessor**: `MOBILE_OPTIMIZATION_PLAN.md` Part 4, Phase 11. `MOBILE_BASELINE.md` for the perf data motivating this work.
**Successor**: actual extraction sessions starting Wednesday May 13.

The Phase 11a defer ship (v4.99.35) cut render-blocking time to zero but didn't reduce JS payload. **Phase 11b is the actual win**: extract 6 Pro-only features into separate lazy-loaded files, cutting the shell from 614 KB → 250-300 KB.

---

## Total scope

| Metric | Current | Post-extraction (target) |
|---|---:|---:|
| `app.js` shell size | 614 KB transferred | ~250-300 KB |
| First-paint unused JS | ~399 KB (64% of shell) | ~50 KB |
| Lighthouse Performance | 65 | 85+ (App Store submission gate) |
| Combined extracted LOC | — | ~24,400 LOC |

**App Store deadline math**: launch end of June (founder holiday July 2). Phase 11b lands the perf score above the gate. ~10-15 hours of work across 2-3 sessions, well within the 7-week runway.

---

## Risk-ordered extraction roster

### 1️⃣ Network Analysis Drill (NA) — Wednesday session #1

| | |
|---|---|
| **Lines** | 12093-12395 |
| **LOC** | ~300 |
| **Risk** | 🟢 LOW |
| **Entry points** | `startNetworkAnalysisDrill()`, `naOpenLesson()`, `naSetTab()`, `naRenderDashboard()` |
| **STORAGE keys** | `NA_MASTERY`, `NA_LESSONS` |
| **Shared reads** | `showPage`, `showErrorToast`, `_gateActivityForQuota`, `GT_SCENARIOS` |
| **Coupling** | None significant — pure render + STORAGE pattern |
| **DOM deps** | `#page-network-analysis` (single page container) |
| **Cleanup needs** | None — no timers / event listeners |

**Why first**: smallest, cleanest, lowest risk. Validates the lazy-load pattern before committing to bigger extractions.

### 2️⃣ Phishing Triage Lab (PHT) — Wednesday session #2

| | |
|---|---|
| **Lines** | 36013-36800 (+ `_pht*` helpers) |
| **LOC** | ~1,187 |
| **Risk** | 🟡 MEDIUM |
| **Entry points** | `phtStartScenario()`, `phtRenderHome()`, `phtRenderDashboard()`, `phtOpenAiGenerator()` |
| **STORAGE keys** | `PHT_MASTERY` |
| **Shared reads** | `showPage`, `_gateActivityForQuota`, `PHT_SCENARIOS` const |
| **Shared writes** | `_phtAiGenState` global (AI generator state) |
| **Coupling** | AI generator modal → external Claude API; multi-channel clients (email/SMS/voice/QR) |
| **DOM deps** | `#page-pht` |
| **Cleanup needs** | Modal cleanup on page exit |

**Why second**: bigger than NA but same overall pattern. AI generator integration tests the async-import-then-Claude-call flow that IRW will also need.

### 3️⃣ Packet Trace (PT) — Wednesday session #3 OR Friday session #1

| | |
|---|---|
| **Lines** | 29724-34891 |
| **LOC** | ~5,170 |
| **Risk** | 🟡 MEDIUM |
| **Entry points** | `ptStartTimer()`, `ptOpenLesson()`, `ptRenderDashboard()` |
| **STORAGE keys** | `PORT_*`, `AB_*`, `OS_*`, `CTS_*`, `SAB_*`, `AMM_*`, `PT_RESUME` (interleaved drill keys) |
| **Shared reads** | `showPage`, `_gateActivityForQuota`, `_cloudFlush`, `GT_PORT_PROTOCOLS`, `_ptCatByProto`, `PT_CATEGORIES` |
| **Coupling** | Timed challenge mode (`ptTimerInterval` global), 6 nested lesson types interleaved |
| **DOM deps** | `#page-ports`, `#page-port-lessons` (two pages) |
| **Cleanup needs** | **Critical**: clear `ptTimerInterval` on page exit |

**Why third**: largest of the medium-risk batch. The 6 interleaved drill types (port + acronyms + OSI + cable + sec acronyms + attack-mitigation match) need careful extraction — they all share the file region but might be a single module each.

**Sub-decision for Wednesday**: extract PT as ONE module (5,170 LOC) OR split the 6 drills into 6 sub-modules? Recommendation: ONE module first; sub-split if size remains a problem post-Phase 11b.

### 4️⃣ Incident Response War Room (IRW) — Friday session

| | |
|---|---|
| **Lines** | 34966-35677 |
| **LOC** | ~911 |
| **Risk** | 🟡 MEDIUM |
| **Entry points** | `irwStartScenario()`, `irwRenderHome()`, `irwRenderDashboard()`, `irwOpenAiGenerator()` |
| **STORAGE keys** | `IRW_MASTERY`, `IRW_LESSONS` |
| **Shared reads** | `showPage`, `_gateActivityForQuota`, `_cloudFlush`, `IRW_SCENARIOS` |
| **Shared writes** | `_irwAiGenState` |
| **Coupling** | Pressure timer (`setInterval`), phase-based progression, AI generator (same pattern as PHT) |
| **DOM deps** | `#page-irw` |
| **Cleanup needs** | **Critical**: `_irwStopPressureTimer()` on scenario end + page exit |

### 5️⃣ ACL Builder — Friday session #2

| | |
|---|---|
| **Lines** | 3367 + 4112-39775 (heavily fragmented) |
| **LOC** | ~2,200 |
| **Risk** | 🟠 MEDIUM-HIGH |
| **Entry points** | `aclOpenScenarioPicker()`, `aclLoadScenario()` |
| **STORAGE keys** | `KEY` only (state in `aclState` global) |
| **Shared reads** | `ACL_PBQ_BANK`, `ACL_SCENARIOS`, `ACL_CATEGORIES`, `ACL_FIRST_TIME_SCENARIO`, `ACL_ANIM_*` |
| **Shared writes** | `aclState` mutable global, `__aclSidebarHandlers` table |
| **Coupling** | Distributed across 36K LOC of file (not contiguous), packet flow animation timing, sidebar handler registration pattern |
| **DOM deps** | `#page-acl` |
| **Cleanup needs** | Animation cleanup, modal cleanup, sidebar handler unregistration |

**Why higher risk**: ACL is the only feature scattered across the file rather than in a contiguous block. Constants at line 3367 + 37947 + 38720 + 39162; functions at 4112 + 38782-39775. Extraction needs to gather these into one file. The `__aclSidebarHandlers` global suggests there's a registration contract that needs a clean public API.

### 6️⃣ Topology Builder (TB) — Phase 11c (DEFER)

| | |
|---|---|
| **Lines** | 14453-28708 |
| **LOC** | ~14,250 |
| **Risk** | 🔴 HIGH |
| **Coupling** | 3D dynamic import (already lazy via tb3d.js!), `_TB_OVERLAY_REGISTRY`, `tbState` deeply mutable global, ambient packet animation loop, scenario state, lab progression, fix challenges |

**Why defer**: 14,250 LOC is bigger than the OTHER 5 features combined. The 3D view already extracted (tb3d.js v4.63.0); pulling out the rest would touch 17+ DOM IDs + the overlay registry pattern + animation loop cleanup. Phase 11b should ship NA + PT + PHT + IRW + ACL FIRST, re-measure Lighthouse, then decide if TB extraction is needed for App Store gate.

**Possible outcome**: 5-feature extract drops shell from 614 KB → 320 KB → Performance 85+ → App Store gate met without touching TB. Then TB stays in-shell for now (it's a Pro-only feature anyway, so paying users tolerate the extra shell weight).

---

## Lazy-load pattern (the contract)

Reference: `tb3d.js` (v4.63.0, issue #199). Same shape, but post-DOMContentLoaded instead of pre.

### Shell side (`app.js`):

```js
// One global registry of loaded feature modules — survives page navigation
const _featureModules = {};

async function _loadFeature(name) {
  if (_featureModules[name]) return _featureModules[name];
  // Inject <script> tag (async=false preserves order if multiple in flight)
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `features/${name}.js`;
    s.async = false;
    s.onload = () => {
      // Convention: each module sets window._certanvilFeatures[name] = { enter, leave }
      _featureModules[name] = window._certanvilFeatures[name];
      resolve(_featureModules[name]);
    };
    s.onerror = () => reject(new Error(`Failed to load feature: ${name}`));
    document.head.appendChild(s);
  });
}

// Replace existing entry-point functions with lazy-load wrappers
async function startNetworkAnalysisDrill() {
  if (!_gateActivityForQuota('Network Analysis Drill')) return;
  const mod = await _loadFeature('network-analysis');
  return mod.enter();
}
```

### Module side (`features/network-analysis.js`):

```js
// IIFE that registers itself into the shell's namespace
(function() {
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures['network-analysis'] = {
    enter: function() { /* existing startNetworkAnalysisDrill body */ },
    leave: function() { /* cleanup if needed (timers, event listeners) */ },
  };
})();
```

### Why this pattern (vs ES modules):

- **No build step**: cert app is no-bundler. ES module `import()` works in browsers, but writing `import` statements requires the modules to be ES modules + the shell to be one too. We don't want to convert app.js to a module.
- **Order-preserving**: `async=false` on dynamic script tags = same execution semantics as `defer`.
- **Cache-friendly**: feature files cached by SW (already wired in v4.99.27). First visit = slow; subsequent visits = instant.
- **Backwards-compatible**: existing entry-point function signatures preserved; callers don't change.

---

## Smoke + verify per extraction

After each module extracted (NA → PHT → PT → IRW → ACL):

1. **UAT runs green** (`npm run test:uat`)
2. **Playwright suite runs green** (`npm run test:e2e`) — auth-state stub from v4.99.32 still in place
3. **Local Claude Preview test**: navigate to extracted feature, verify it loads + runs + cleans up
4. **Lighthouse mobile re-measure**: append row to `MOBILE_BASELINE.md` re-measure cadence table
5. **Real-iPhone smoke** if feature has UI changes (Phase 11b shouldn't, but doesn't hurt)
6. **Real-iPad smoke** for the same reason
7. **Network tab check**: verify `features/<name>.js` is fetched ONLY when feature is opened

---

## Session estimates

| Session | Features | Est. effort | Tested + shipped |
|---|---|---|---|
| **Wed May 13** | NA + PHT + PT | 4-5 hours | v4.99.36-37 |
| **Fri May 15** | IRW + ACL | 3-4 hours | v4.99.38-39 |
| **Wed May 20** (re-measure + decide) | Lighthouse + smoke; TB go/no-go | 1 hour | n/a |
| _Phase 11c (deferred)_ | TB if needed | 8-12 hours | v4.99.40+ |

Total Phase 11b: **~8-9 hours across 2 sessions over 1 week**. Comfortable inside the App Store runway.

---

## Decisions still open

1. **AI generators (PHT + IRW + ACL coach)**: keep them inline in their feature module, OR extract a shared `features/_ai-helpers.js`?
   - **Recommendation**: inline first (simpler). Refactor later if duplication hurts.
2. **PT split into 6 sub-modules?** PT contains port drill + acronyms + OSI + cable + sec-acronyms + attack-mitigation in one region.
   - **Recommendation**: ONE module first. Each drill is < 1,000 LOC; sub-split is over-engineering for now.
3. **Service Worker precache strategy for feature files**:
   - Currently `SHELL_ASSETS` precaches the cert packs. Should `features/*.js` join SHELL_ASSETS, or stay runtime-cached only?
   - **Recommendation**: NOT in SHELL_ASSETS. They should fetch on-demand, get cached via the existing stale-while-revalidate path. Pre-caching would defeat the lazy-load purpose.
4. **Module file location**: `features/<name>.js` or just `<name>.js` in root?
   - **Recommendation**: `features/` subdirectory. Cleaner; matches the cert pack pattern (`certs/netplus.js`).

---

## Why we trust this scope

The Explore agent surveyed all 6 features with grep + targeted Reads, confirmed:
- **5 features are extractable with low-medium risk** (NA + PHT + PT + IRW + ACL)
- **1 feature is high-risk and deferrable** (TB) — already partially extracted via tb3d.js
- **No fundamental coupling blockers** — every feature reads STORAGE + calls a few shell helpers; no circular dependencies
- **AI generator pattern is consistent** across PHT + IRW + ACL — one solved means three solved

This is the kind of scope-clarity-before-coding that prevents Wednesday from becoming a 12-hour rabbit hole.

---

*Drafted 2026-05-10 14:30 BST. Scope deliverable for Phase 11b execution. Reference for the actual code work, not a code-touching doc itself.*
