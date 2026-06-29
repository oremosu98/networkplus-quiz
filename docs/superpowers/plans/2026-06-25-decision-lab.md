---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan, drill]
---
# Decision Lab — engine / UI / schema / scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship **Decision Lab** — a NEW interactive drill for the cloud-fundamentals certs (Azure **AZ-900**, **AI-900**, **SC-900**, AWS **CLF-C02**) — as a *sibling* to the shipped CompTIA "Sim Lab" PBQ drill. It reuses the Sim Lab engine internals (step renderers, scoring, the session/exam machine, the wall-clock countdown) with its own name, entry, branding, registry, and (separately authored) seed banks. The hero round is a scenario→pick **analyze** step graded with **per-distractor reasoning** ("why each wrong option is wrong"), the differentiator plain MCQ banks lack. A shared-responsibility **categorize** sorter re-grades its boundary when the service selector changes. The verdict clusters missed look-alike **pairs** and weak service **families** ("look-alikes you still confuse"). This plan covers **only the ENGINE / UI / SCHEMA / SCAFFOLD track** — **seed-content authoring is OUT OF SCOPE** (separate content workflow; see "Seed content track (separate)" below).

**Architecture:** Decision Lab **does not fork** the Sim Lab engine — it parameterizes and shares it. We extract a shared `_seedBank(globalsRegistry, cert)` resolver out of `_slBank` (refactor, not break), add Decision Lab's own `_DL_CERTS` allowlist + `_DL_SEED_GLOBALS` registry + `_dlBank` resolver, and add an `app.js` `_DL_SEED_FILES` map + `_ensureDecisionLabLoaded` lazy-loader mirroring `_ensureSimLabLoaded`. The `analyze` step schema is extended **backward-compatibly** with per-option `why` (PBQ seeds without `why` render exactly as today). New Decision Lab pages (`#page-decision-lab-entry`, `#page-decision-lab`, `#page-decision-lab-result`) mirror the Sim Lab page shells with Decision Lab chrome. A `_dlSession` object (mode/decisions/idx/results/flags) drives the runner, reusing `_slMountScenario`, `simLabScoreScenario`, the exam wall-clock countdown (`_slStartCountdown`/`_slStopCountdown`/`_slTickClock`), and `_slAggregateSession`. A `_dlVerdictClusters(results)` helper aggregates misses → `pair`/`family` display labels. Free = 1 practice set/day (`_dlBumpFreeRun`, independent of Sim Lab's `_bumpPbqFreeRun`); Pro = unlimited + exam-style + 20-set + cross-session weak-spots (mirror `_slRecordWeakSpots`). All Pro gates route through `_gateProOnly` (IAP-safe).

**Tech Stack:** Static HTML/JS/CSS, no build step. The drill engine is `features/sim-lab.js` (IIFE, lazy-loaded, exposes `window._simLab.*` + `window.simLab*`). Decision Lab logic lands in the SAME `features/sim-lab.js` module (it reuses every internal). Editorial styling in `dg-system.css` (forged-bronze tokens, per `design/brand/BRAND.md`); never edit `styles.css`. Tests: Playwright (`tests/e2e/decision-lab.spec.js`) across chromium/webkit/mobile-safari; UAT structural (`tests/uat.js`).

**VISUAL CONTRACT — HARD RULE:** the build IS the mockup `mockups/decision-lab-concept.html`, lifted markup/classes/copy, not reinterpreted. The four panels map to: (1) entry mode toggle (Practice/Exam-style) + cert target + decisions picker (5/10/20), (2) the hero scenario→pick card graded with per-distractor reasoning, (3) the shared-responsibility sorter with the boundary-shift, (4) the verdict with "look-alikes you still confuse" + weak families. Lift the mockup's class names into the real `#page-decision-lab*` scopes (`.dl-seg`, `.dl-scn`, `.dl-opt`, `.dl-opt .why`, `.dl-teach`, `.dl-srv`, `.dl-tok`, `.dl-shift`, `.dl-score-fig`, `.dl-confrow`, `.dl-weak`). Tokens come from live `dg-system.css` — **`--surface2`/`--surface3`/`--text`/`--text-dim`/`--accent`/`--green`/`--yellow`/`--red`, NOT `--surface-2`/`--ink`** (the documented trap; the mockup's inline `:root` block is reference only). **Both light and dark themes must be verified** (light is primary; BRAND.md §3). Open the mockup before writing each UI task.

**Brand guardrails (every UI task):** forged-bronze tokens only (`var(--accent)` + `color-mix`, no hardcoded hex on chrome); Fraunces display / Inter UI; eyebrows Inter 800 10-11px; easing `cubic-bezier(0.16,1,0.3,1)`; entrances `scale(0.96-0.98)` not 0; `:active{transform:scale(0.97)}`; hover gated `@media (hover:hover) and (pointer:fine)`; respect `prefers-reduced-motion`; **no em-dashes (use `·`)**; no left-accent-border callouts (full tinted hairline); semantic ✓/✗/→ marks only. Bump `dg-system.css?v=` on any `dg-system.css` edit. **Touch targets ≥44×44pt** on options, `.dl-srv`, `.dl-tok`, flag, nav, chips, segments. **Honesty-first: never call this a "PBQ" or "hands-on"** — these exams have neither; nothing is simulated. Motion specs are in spec §7 — referenced at each UI task.

---

## Reference: existing code this plan extends (verified against source)

**`features/sim-lab.js`** (IIFE; `window._simLab.*` test API):
- `simLabScoreScenario(scn, responses)` → `{perStep:{stepId:bool}, correct, total, fraction}` (line 110) — **reused as-is** to score Decision Lab rounds. `analyze` is scored by `_scoreStep` (line 85) via `_setEq(resp.selected, step.answer.selected)` (line 98–99).
- `_slRenderAnalyze(step, onChange, initial)` (line 314) — renders `step.payload.lines[{id,text}]` as `.sl-analyze-line` buttons, single/multi select via `step.payload.multi`, reports `{selected:[id]}`. **Extended in Task 2** to render per-line `why` on grade.
- `simLabRenderStep(step, onChange, initial)` (line 444) dispatches the 5 renderers (`_slRenderOrder` 221, `_slRenderCategorize` 266, `_slRenderAnalyze` 314, `_slRenderMatch` 355, `_slRenderFillin` 408).
- `_slMountScenario(host, scn, opts)` (line 461) — builds `scn.scenario` + each step into `host`, exposes the live `window.__slResponses`, installs `window.__slActiveSubmit`; `opts.onSubmit(result)` gets `{responses, scenario, perStep, correct, total, fraction}`. `opts.initial` re-hydrates a saved round. **Reused as-is** by the Decision Lab runner.
- `_slBank(cert)` (line 563) — `var g = _SL_SEED_GLOBALS[cert]; var b = g && window[g]; return Array.isArray(b)?b:[];`. **Refactored in Task 1** to delegate to a shared `_seedBank(registry, cert)`.
- `_SL_SEED_GLOBALS` (line 557) = `{netplus:'SIM_LAB_SEED_NETPLUS', secplus:'SIM_LAB_SEED_SECPLUS', 'aplus-core1':'SIM_LAB_SEED_APLUS_CORE1', 'aplus-core2':'SIM_LAB_SEED_APLUS_CORE2'}`. `_SL_PBQ_CERTS` (line 7) = `['netplus','secplus','aplus-core1','aplus-core2']`.
- `_slPickSeed(cert)` (line 569) / `_slPickSeedFresh(cert, usedIds)` — seed pick (no-repeat). `simLabValidateScenario(scn)` — structural validator.
- `_slAggregateSession(results)` (line 593) → `{passed, rounds, stepsCorrect, stepsTotal, pct}` — **reused** for the Decision Lab verdict figure.
- Exam machine (already shipped): `_slExamBlankState(scenarios, budgetMs)` (607), `_slComputePace` (637), `_slExamBudgetMs` (649), `_slExamParMs` (657), `_slStartCountdown(deadlineMs)` (772), `_slStopCountdown()` (789), `_slTickClock()` (797). **`_slStartCountdown`/`_slStopCountdown`/`_slTickClock` are reused** by Decision Lab exam-style. NOTE: `_slTickClock` (line 797) checks `_slSession.mode !== 'exam'` and calls `_slExamSubmit(true)` on time-up — Task 6 generalizes the countdown to also drive `_dlSession` (see that task for the exact, minimal touch).
- `_slIsPro()` (line 1331) — `_quotaState.tier === 'pro'|'admin'` (also unlimited `daily_limit < 0`). `_el(tag,cls,html)` (211), `_esc(s)` (217), `_slAttr(v)` (218) — DOM helpers.
- `_slSession` (line 672), `_slPickedRounds` (673), `_slPickedMode` (674); practice path `_slSessionStart` (1388) / `_slRunRound` (1410) / `_slRenderSummary` (1465); `simLabOpenEntry` (1172); `simLabExit` (1308). Decision Lab adds parallel `_dl*` symbols; the Sim Lab path is untouched.
- Test/export block (lines 1572-1609): `window.simLabScoreScenario`, `window._simLab.*`, `window.simLabOpenEntry`, `window.simLabSessionStart`, `window.simLabExit`. Decision Lab adds `window.decisionLab*` + `window._simLab.dl*`.

**`app.js`:**
- `_ensureSimLabLoaded(cb)` (line 2019; `window._ensureSimLabLoaded`) — once-per-page lazy-loader: injects `_SL_SEED_FILES[cert]` (line 2040) then `features/sim-lab.js`. **Mirrored in Task 1** as `_ensureDecisionLabLoaded`.
- `PBQ_FREE_DAILY_CAP = 1` (7037), `_pbqFreeRunsToday()` (7038), `_bumpPbqFreeRun()` (7045; free-tier only) — Sim Lab's daily counter at `STORAGE.PBQ_FREE_COUNT` (1122). Decision Lab adds an **independent** counter (Task 9).
- `_slRecordWeakSpots(topics)` (7061) / `_slGetWeakSpots()` (7070), Pro-gated, key `STORAGE.SIMLAB_WEAK` (1123). **Mirrored in Task 8** as Decision Lab cross-session look-alike persistence.
- `_gateProOnly(featureLabel, {title, body})` (line 880) → `_showProOnlyUI` (915). Returns `true` for Pro/admin/optimistic-signed-in, else shows the modal and returns `false`. `_quotaState.tier` ∈ free/pro/admin.
- `renderSimLabHomeEntry()` (7081) gates the `#sl-home-opt` Home tile to `_SL_PBQ_CERTS_HOME` (7080). **Mirrored in Task 3** as the Decision Lab Home tile gated to `_DL_CERTS`.
- `_slMeteredGenerate(prompt)` (`window._slMeteredGenerate`) — the real AI fetcher injected via `_simLab.__setFetcher`. Decision Lab v1 is **seed-only** (no AI gen — content is curated); the runner picks from `_dlBank`.

**`index.html`:**
- `#sl-home-opt` Home tile (line 413): `<button … id="sl-home-opt" onclick="startSimLabHome()"><span class="on">Sim Lab</span><span class="od" id="sl-home-sub">…</span></button>`. The Decision Lab tile sits beside it (Task 3).
- `#page-sim-lab` (1763), `#page-sim-lab-result` (1777), `#page-sim-lab-entry` (1782). Decision Lab pages mirror these.
- `dg-system.css?v=7.57.3` (line 35) — bump on CSS edits.

**`dg-system.css`:** live tokens at `:root`/`[data-theme]` (lines 22/38/53/69) define `--surface2`/`--surface3` (NOT `--surface-2`). `.gnt-shell` (3748) is the entry/result shell. Decision Lab adds `.dl-*` classes in the same scopes.

**`tests/e2e/sim-lab.spec.js`:** harness `gotoApp(page)` (boots app at `localhost:3131/?_cb=test`, lazy-loads via `_ensureSimLabLoaded`, waits for `window.simLabValidateScenario`). Drives via `page.evaluate` setting `window._quotaState`, `window.CURRENT_CERT`, stubbing `window._gateProOnly`, forcing seed fallback. The Decision Lab spec mirrors this harness (lazy-load via `_ensureDecisionLabLoaded`) and injects a **tiny inline seed fixture** rather than depending on the (separately authored) banks.

**`tests/uat.js`:** structural pins read `js` (concatenated app.js + sim-lab.js source), `html` (index.html), and per-section `fs.readFileSync` for `dg-system.css`/`landing/pricing.html` (see the v7.57 Exam block at line 20141). Sim Lab pins live at line 20123.

**`landing/pricing.html`:** `.pp-feat` Pro bullets (list at line 516). The Sim Lab/Exam bullets are at lines 518-519. The Decision Lab bullet lands here (Task 10).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `features/sim-lab.js` | modify | Extract `_seedBank(registry, cert)`; refactor `_slBank` to delegate. Add `_DL_CERTS`, `_DL_SEED_GLOBALS`, `_dlBank`. Extend `_slRenderAnalyze` with per-option `why` (backward-compatible) + `.dl-graded` reveal. Add `_dlSession`, `_dlPickedMode`, `_dlPickedDecisions`; `decisionLabOpenEntry`, `_dlBindModeToggle`/`_dlBindDecisionChips`/`_dlSyncEntry`, `_dlGateCopy`; `_dlSessionStart`/`_dlSessionStartDispatch`, `_dlRunRound`, `_dlBuildSet`; `_dlStartExamStyle` (reuses countdown); the sorter `_dlBindServiceSelector` boundary re-grade; `_dlRenderResult`, `_dlVerdictClusters`; `decisionLabExit`; test-API exports |
| `app.js` | modify | `_DL_SEED_FILES` map + `_ensureDecisionLabLoaded(cb)` (mirror `_ensureSimLabLoaded`); `_DL_CERTS` Home gate; `renderDecisionLabHomeEntry()` + `startDecisionLabHome()`; `_dlBumpFreeRun`/`_dlFreeRunsToday` (independent counter, `STORAGE.DL_FREE_COUNT`); `_dlRecordWeakSpots`/`_dlGetWeakSpots` (Pro cross-session, `STORAGE.DL_WEAK`); `STORAGE.DL_FREE_COUNT` + `STORAGE.DL_WEAK` keys; lazy-load hook on Home/showPage |
| `index.html` | modify | `#page-decision-lab-entry` / `#page-decision-lab` / `#page-decision-lab-result` (lifted from mockup); `#dl-home-opt` Home tile beside `#sl-home-opt`; `dg-system.css?v=` bump |
| `dg-system.css` | modify | `.dl-*` classes lifted from the mockup into `#page-decision-lab*` scopes (entry seg/target/chips, scenario card + per-option `why` reveal + teach block, sorter srv/tok/cols + shift, verdict score-fig/confrow/weak); live tokens only; `?v=` bump |
| `landing/pricing.html` | modify | add the Decision Lab Pro bullet to the `.pp-feat` list |
| `tests/e2e/decision-lab.spec.js` | create | gate; set builds from tiny seed fixture; scenario→pick grades with per-option `why`; sorter boundary-shift re-grade; exam-style suppresses feedback + countdown time-up; verdict clusters look-alikes; 1/day cap; cross-cert |
| `tests/uat.js` | modify | structural pins: entry/result pages, `_DL_CERTS`, `_dlBank`, per-option-`why` render path, `_dlBumpFreeRun` (not `_bumpPbqFreeRun`), gate copy, Home tile gating; plus a no-regression note |
| `tests/e2e/sim-lab.spec.js` | run only | full sim-lab suite re-run after Task 1 + Task 2 (shared-engine refactor must not regress Sim Lab) |
| `CLAUDE.md` / `sw.js` / `package.json` / `styles.css` | modify (via `bump-version.js`) | version + cache-name bump on ship (later session — see end note) |

---

## Seed content track (separate)

**Seed-bank authoring is OUT OF SCOPE for this plan.** The four banks ship as a **separate content workflow** (author → dual-expert review → founder verification), not here:

- Files: `features/decision-lab-seed-az900.js`, `…-ai900.js`, `…-sc900.js`, `…-clfc02.js`, each exporting `window.DECISION_LAB_SEED_AZ900` / `…AI900` / `…SC900` / `…CLFC02` (~50 decision-scenarios each, ~200 total).
- **Seed schema** (same step types as the Sim Lab seeds **plus** the Decision Lab extensions):
  ```
  { id, cert, objective, topic, title, scenario, estMinutes,
    pair:'Pricing Calculator vs TCO Calculator',   // OPTIONAL display label for the look-alike cluster (spec §3.4)
    family:'Cost & pricing tools',                  // OPTIONAL display label for the weak-family cluster (spec §3.4)
    steps:[
      { type:'analyze', points:1, prompt, explanation,           // explanation = "the tell" teach block (spec §3.3)
        payload:{ multi:false, lines:[ { id, text, why } ] },    // why = "why this option is wrong" (OPTIONAL per line)
        answer:{ selected:[id] } },
      { type:'categorize'|'match'|'order'|'fillin', … }          // same Sim Lab schemas
    ] }
  ```
- This plan's tests use a **small inline/fixture seed set** defined in `tests/e2e/decision-lab.spec.js` (and, where the runner needs a registered global, injected via `window.DECISION_LAB_SEED_*` in `page.evaluate`) so the engine/UI track is verifiable independently of authored content.
- Registration: each authored bank registers in `_DL_SEED_GLOBALS` (already present) + `app.js` `_DL_SEED_FILES` (already present) and ships cert-by-cert. No engine change is needed to add a bank.

---

## Task 1: Shared seed resolver + Decision Lab registry + loader (no Sim Lab regression)

**Spec:** §3.2 (cloud cert allowlist + seed registry, mirror the Sim Lab scaffold), §3.2 refactor opportunity (`_seedBank`). Pure scaffold + resolver; unit-tested through the test API. **The `_slBank` refactor must not change Sim Lab behavior.**

**Files:**
- Modify: `features/sim-lab.js` (extract `_seedBank`; refactor `_slBank`; add `_DL_CERTS`/`_DL_SEED_GLOBALS`/`_dlBank`; export on `window._simLab`)
- Modify: `app.js` (`_DL_SEED_FILES` + `_ensureDecisionLabLoaded`)
- Test: `tests/e2e/decision-lab.spec.js` (new file), `tests/e2e/sim-lab.spec.js` (re-run)

- [ ] **Step 1: Write the failing test** — create `tests/e2e/decision-lab.spec.js` with the harness + the first test:

```js
const { test, expect } = require('@playwright/test');

// Mirror the sim-lab harness: boot the shell, lazy-load Decision Lab (which
// loads features/sim-lab.js), wait for the engine API.
async function gotoApp(page) {
  await page.goto('http://localhost:3131/?_cb=test');
  await page.waitForFunction(() =>
    typeof window._ensureDecisionLabLoaded === 'function' ||
    typeof window._ensureSimLabLoaded === 'function');
  await page.evaluate(() => {
    if (typeof window._ensureDecisionLabLoaded === 'function') window._ensureDecisionLabLoaded();
    else if (typeof window._ensureSimLabLoaded === 'function') window._ensureSimLabLoaded();
  });
  await page.waitForFunction(() => typeof window.simLabValidateScenario === 'function');
}

// A tiny inline seed fixture (the authored banks are a separate content track).
function installSeedFixture(page, globalName, count) {
  return page.evaluate(({ globalName, count }) => {
    function scn(i) {
      return {
        id: globalName + '-' + i, cert: 'az900', objective: '1.1',
        topic: 'Cost tools', title: 'Pick', scenario: 'A team needs X.',
        estMinutes: 2, pair: 'Pricing Calculator vs TCO Calculator',
        family: 'Cost & pricing tools',
        steps: [{
          type: 'analyze', points: 1, prompt: 'Pick the best service',
          explanation: 'Compare two worlds.',
          payload: { multi: false, lines: [
            { id: 'a', text: 'Pricing Calculator', why: 'No on-prem baseline.' },
            { id: 'b', text: 'TCO Calculator' },
            { id: 'c', text: 'Cost Management', why: 'Needs live Azure usage.' },
            { id: 'd', text: 'Azure Advisor', why: 'Needs deployed resources.' }
          ] },
          answer: { selected: ['b'] }
        }]
      };
    }
    window[globalName] = Array.from({ length: count }, (_, i) => scn(i + 1));
  }, { globalName, count });
}
module.exports.installSeedFixture = installSeedFixture;

test('dl scaffold: _dlBank resolves its own registry; _slBank unchanged (no regression)', async ({ page }) => {
  await gotoApp(page);
  await installSeedFixture(page, 'DECISION_LAB_SEED_AZ900', 6);
  const r = await page.evaluate(() => {
    const S = window._simLab;
    const dlAz = S.dlBank('az900');
    const dlUnknown = S.dlBank('netplus');   // netplus is NOT a Decision Lab cert
    // _slBank must still read the Sim Lab registry only (regression guard)
    window.SIM_LAB_SEED_NETPLUS = [{ id: 'x' }];
    const slNet = S.slBank('netplus');
    const slAz = S.slBank('az900');          // az900 has no Sim Lab bank
    return {
      certs: S.dlCerts(),
      dlAzLen: dlAz.length, dlUnknownLen: dlUnknown.length,
      slNetLen: slNet.length, slAzLen: slAz.length
    };
  });
  expect(r.certs).toEqual(['az900', 'ai900', 'sc900', 'clfc02']);
  expect(r.dlAzLen).toBe(6);       // _dlBank reads DECISION_LAB_SEED_AZ900
  expect(r.dlUnknownLen).toBe(0);  // netplus not in the DL registry
  expect(r.slNetLen).toBe(1);      // _slBank still reads SIM_LAB_SEED_NETPLUS
  expect(r.slAzLen).toBe(0);       // _slBank does not see DL banks
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && npx playwright test tests/e2e/decision-lab.spec.js -g "dl scaffold" --project=chromium --workers=1`
Expected: FAIL — `S.dlBank is not a function`.

- [ ] **Step 3: Implement** — in `features/sim-lab.js`, refactor `_slBank` (line 563) to delegate to a shared resolver, and add the Decision Lab registry right after it:

```js
  // Shared cert→seed-bank resolver. Reads the live window global each call so a
  // lazily injected bank is picked up without re-wiring (and tests that swap the
  // global still work). Unknown/contentless certs return [].
  function _seedBank(registry, cert) {
    var g = registry[cert];
    var b = g && window[g];
    return Array.isArray(b) ? b : [];
  }

  var _SL_SEED_GLOBALS = {
    netplus: 'SIM_LAB_SEED_NETPLUS',
    secplus: 'SIM_LAB_SEED_SECPLUS',
    'aplus-core1': 'SIM_LAB_SEED_APLUS_CORE1',
    'aplus-core2': 'SIM_LAB_SEED_APLUS_CORE2'
  };
  function _slBank(cert) { return _seedBank(_SL_SEED_GLOBALS, cert); }

  // --- Decision Lab: cloud-fundamentals cert allowlist + seed registry (spec §3.2) ---
  var _DL_CERTS = ['az900', 'ai900', 'sc900', 'clfc02'];
  var _DL_SEED_GLOBALS = {
    az900: 'DECISION_LAB_SEED_AZ900',
    ai900: 'DECISION_LAB_SEED_AI900',
    sc900: 'DECISION_LAB_SEED_SC900',
    clfc02: 'DECISION_LAB_SEED_CLFC02'
  };
  function _dlBank(cert) { return _seedBank(_DL_SEED_GLOBALS, cert); }
```

> **Refactor note:** delete the OLD `var _SL_SEED_GLOBALS = {…}` + `function _slBank(cert){…}` block (lines 557-567) and replace with the above. Keep `_slPickSeed`/`_slPickSeedFresh` calling `_slBank` exactly as before — their behavior is unchanged.

Expose on the test API (in the `window._simLab` block, after `window._simLab.aggregateSession`):

```js
  window._simLab.slBank = _slBank;
  window._simLab.dlBank = _dlBank;
  window._simLab.dlCerts = function () { return _DL_CERTS.slice(); };
```

- [ ] **Step 4: Add the app.js loader** — in `app.js`, immediately after `window._ensureSimLabLoaded = _ensureSimLabLoaded;` (line 2057), add the Decision Lab loader mirroring `_ensureSimLabLoaded`:

```js
// Decision Lab lazy-loader (mirrors _ensureSimLabLoaded). Decision Lab REUSES
// features/sim-lab.js (same engine module). Inject the current cert's Decision
// Lab seed bank (if one exists) before the engine, then the engine. Certs
// without a bank load the engine alone (set-build then shows the empty state).
const _DL_SEED_FILES = {
  az900: 'features/decision-lab-seed-az900.js',
  ai900: 'features/decision-lab-seed-ai900.js',
  sc900: 'features/decision-lab-seed-sc900.js',
  clfc02: 'features/decision-lab-seed-clfc02.js'
};
function _ensureDecisionLabLoaded(cb) {
  function _afterEngine() {
    var seedFile = _DL_SEED_FILES[window.CURRENT_CERT];
    if (!seedFile || window.__dlSeedLoaded === window.CURRENT_CERT) { if (cb) cb(); return; }
    var s = document.createElement('script');
    s.src = seedFile;
    s.onload = function () { window.__dlSeedLoaded = window.CURRENT_CERT; if (cb) cb(); };
    s.onerror = function () { if (cb) cb(); };  // never block on a missing bank
    document.head.appendChild(s);
  }
  // The engine module is shared with Sim Lab; reuse its loader to inject it once.
  if (typeof _ensureSimLabLoaded === 'function') _ensureSimLabLoaded(_afterEngine);
  else _afterEngine();
}
window._ensureDecisionLabLoaded = _ensureDecisionLabLoaded;
```

> Note: `_ensureSimLabLoaded` injects `_SL_SEED_FILES[cert]` then `features/sim-lab.js`. For a Decision Lab cert (az900 etc.) `_SL_SEED_FILES[cert]` is undefined, so it loads the engine alone — exactly what Decision Lab wants. `_afterEngine` then layers the Decision Lab bank.

- [ ] **Step 5: Run, expect PASS**

Run: `npx playwright test tests/e2e/decision-lab.spec.js -g "dl scaffold" --project=chromium --workers=1`
Expected: PASS.

- [ ] **Step 6: No-Sim-Lab-regression — run the full sim-lab suite**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && npx playwright test tests/e2e/sim-lab.spec.js --project=chromium --workers=1`
Expected: all green (the `_slBank` refactor preserves behavior). If anything regresses, the delegation is wrong — fix before committing.

- [ ] **Step 7: Commit**

```bash
git add features/sim-lab.js app.js tests/e2e/decision-lab.spec.js
git commit -m "feat(decision-lab): shared _seedBank resolver + DL registry/_dlBank + _ensureDecisionLabLoaded"
```

---

## Task 2: `analyze` per-option `why` — backward-compatible grade reveal

**Open first:** `mockups/decision-lab-concept.html` panel 2 (`.opt`, `.opt .lab`, `.opt .why`, `.opt .verdict`, `.opt.correct/.wrong/.picked-wrong`, `.opts.graded`, `.teach`/`.teach-k`/`.teach-b`). **Motion:** spec §7 — correct option border/bg crossfade 180ms `var(--ease)` + settle `scale(1→1.015→1)`; per-option `why` lines reveal via `grid-rows 0fr→1fr` + opacity + 2px rise, staggered 40ms top→bottom (≤160ms total); ✓/✗ marks `opacity+scale(0.8→1)` 160ms after the tint; teach block enters last (`opacity+translateY` 220ms); picked-wrong marks first, no shake; reduced-motion → opacity-only, no stagger.

**Spec:** §3.3. Extend the `analyze` payload to `lines:[{id,text,why}]` and have `_slRenderAnalyze` reveal each line's reasoning **on grade**: correct line shows ✓ "Best" + the step `explanation` as the teach block; wrong lines reveal their `why`; the user's pick gets `picked-wrong`. **PBQ analyze seeds without `why` must render exactly as today** (no `why` text, no teach block change). The render-on-grade is opt-in via a flag so the Sim Lab feedback path is untouched.

**Files:**
- Modify: `features/sim-lab.js` (`_slRenderAnalyze` — add an optional graded-reveal pass; add `_dlGradeAnalyze(host, step, pickedIds)` helper used by the Decision Lab runner)
- Modify: `dg-system.css` (`#page-decision-lab .dl-opt .why` / `.dl-graded` reveal + teach styles; `?v=` bump)
- Test: `tests/e2e/decision-lab.spec.js`

- [ ] **Step 1: Write the failing test** — both with-`why` and without-`why`:

```js
const { installSeedFixture } = require('./decision-lab.spec.js'); // (same file; helper is defined above)

test('dl analyze why: graded reveal shows per-option why (with) and stays clean (without)', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(() => {
    const S = window._simLab;
    // WITH why
    const withWhy = {
      type: 'analyze', points: 1, prompt: 'Pick', explanation: 'The tell.',
      payload: { multi: false, lines: [
        { id: 'a', text: 'Pricing Calculator', why: 'No on-prem baseline.' },
        { id: 'b', text: 'TCO Calculator' },
        { id: 'c', text: 'Cost Management', why: 'Needs live usage.' }
      ] },
      answer: { selected: ['b'] }
    };
    const host1 = document.createElement('div'); document.body.appendChild(host1);
    const el1 = S.renderStep(withWhy, function () {});
    host1.appendChild(el1);
    S.dlGradeAnalyze(host1, withWhy, ['c']);   // user picked C (wrong)
    const lines = host1.querySelectorAll('.sl-analyze-line, .dl-opt');
    const correct = host1.querySelector('.correct, .dl-correct');
    const pickedWrong = host1.querySelector('.picked-wrong, .dl-picked-wrong');
    const whyShown = Array.from(host1.querySelectorAll('.why, .dl-why')).filter(e => e.textContent.trim()).length;
    const teach = host1.querySelector('.teach, .dl-teach');
    // WITHOUT why (a PBQ-style analyze seed) — must render clean, no teach injected by grade
    const noWhy = {
      type: 'analyze', points: 1, prompt: 'Pick', explanation: 'Because.',
      payload: { multi: false, lines: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] },
      answer: { selected: ['a'] }
    };
    const host2 = document.createElement('div'); document.body.appendChild(host2);
    const el2 = S.renderStep(noWhy, function () {});
    host2.appendChild(el2);
    const whyNodesBefore = host2.querySelectorAll('.why, .dl-why').length;
    return {
      hasCorrect: !!correct, hasPickedWrong: !!pickedWrong,
      whyShown, hasTeach: !!teach, teachText: teach ? teach.textContent : '',
      noWhyClean: whyNodesBefore === 0
    };
  });
  expect(r.hasCorrect).toBe(true);
  expect(r.hasPickedWrong).toBe(true);
  expect(r.whyShown).toBeGreaterThanOrEqual(2);  // a + c carry why
  expect(r.hasTeach).toBe(true);
  expect(r.teachText).toContain('The tell');
  expect(r.noWhyClean).toBe(true);               // ungraded analyze without why has no .why nodes
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/decision-lab.spec.js -g "dl analyze why" --project=chromium --workers=1`
Expected: FAIL — `S.dlGradeAnalyze is not a function`.

- [ ] **Step 3: Implement** — in `features/sim-lab.js`, do two things.

(3a) Extend `_slRenderAnalyze` (line 314) so each rendered line carries its (hidden until graded) `why` node and a verdict slot, WITHOUT changing the ungraded appearance. Inside the `step.payload.lines.forEach` (line 321), replace the `row.textContent = ln.text;` line with structured content:

```js
      // Backward-compatible: text always renders; the `why` node is present only
      // when the seed provides it, and stays hidden until grade (CSS .dl-why is
      // display:none until the block gets .dl-graded). PBQ seeds (no why) render
      // exactly as before — no why node, no visual change.
      var lab = _el('span', 'dl-lab', _esc(ln.text));
      row.textContent = '';
      row.appendChild(lab);
      if (ln.why) { row.appendChild(_el('span', 'dl-why', _esc(ln.why))); }
      row.appendChild(_el('span', 'dl-verdict', ''));
```

(3b) Add the grade-reveal pass after `simLabSubmitScenario` (line 498):

```js
  // Decision Lab grade reveal for an analyze step (spec §3.3). Marks the correct
  // line ✓ "Best" + injects the step explanation as the teach block; marks every
  // wrong line ✗ (revealing its `why`); flags the user's pick as picked-wrong.
  // Adds .dl-graded to the line block so CSS reveals the `why` nodes (staggered).
  // No-ops on non-analyze. Safe on seeds without `why` (no why node to reveal).
  function _dlGradeAnalyze(host, step, pickedIds) {
    if (!step || step.type !== 'analyze') return;
    var block = host.querySelector('.sl-analyze-block');
    if (!block) return;
    block.classList.add('dl-graded');
    var correct = (step.answer && step.answer.selected) || [];
    var picked = pickedIds || [];
    Array.prototype.forEach.call(block.children, function (row) {
      var id = row.getAttribute('data-line');
      var isCorrect = correct.indexOf(id) !== -1;
      var wasPicked = picked.indexOf(id) !== -1;
      var v = row.querySelector('.dl-verdict');
      row.classList.add('dl-opt');
      row.setAttribute('aria-disabled', 'true');
      if (isCorrect) {
        row.classList.add('dl-correct');
        if (v) v.textContent = '✓ Best';
      } else {
        row.classList.add('dl-wrong');
        if (wasPicked) row.classList.add('dl-picked-wrong');
        if (v) v.textContent = '✗';
      }
    });
    // "the tell" teach block = the step explanation (injected once, after the block)
    if (step.explanation && !host.querySelector('.dl-teach')) {
      var teach = _el('div', 'dl-teach',
        '<div class="dl-teach-k">The tell</div><div class="dl-teach-b">' + _esc(step.explanation) + '</div>');
      block.parentNode.insertBefore(teach, block.nextSibling);
    }
  }
```

Expose: `window._simLab.dlGradeAnalyze = _dlGradeAnalyze;` in the export block.

- [ ] **Step 4: Add styles** — in `dg-system.css`, add the per-option reveal block in the `#page-decision-lab` scope (lifting the mockup's `.opt .why`/`.graded .opt .why`/`.teach`). Live tokens only:

```css
#page-decision-lab .dl-opt .dl-why{font:500 12.5px/1.45 Inter,sans-serif;color:var(--text-dim);margin-top:4px;display:block;overflow:hidden;display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .16s var(--ease,cubic-bezier(.16,1,.3,1)),opacity .16s,transform .16s;transform:translateY(2px)}
#page-decision-lab .dl-graded .dl-opt .dl-why{grid-template-rows:1fr;opacity:1;transform:none}
#page-decision-lab .dl-opt .dl-why>*{min-height:0}
#page-decision-lab .dl-opt .dl-verdict{margin-left:auto;flex:none;font:800 12px/1 Inter,sans-serif;display:none}
#page-decision-lab .dl-graded .dl-opt.dl-correct .dl-verdict{color:var(--green);display:inline}
#page-decision-lab .dl-graded .dl-opt.dl-wrong .dl-verdict{color:var(--red);display:inline}
#page-decision-lab .dl-opt.dl-correct{border-color:color-mix(in oklab,var(--green) 45%,var(--border));background:color-mix(in oklab,var(--green) 10%,transparent)}
#page-decision-lab .dl-opt.dl-picked-wrong{border-color:color-mix(in oklab,var(--red) 45%,var(--border));background:color-mix(in oklab,var(--red) 8%,transparent)}
#page-decision-lab .dl-teach{margin-top:14px;border:1px solid var(--border-soft,var(--border));background:var(--surface3);border-radius:12px;padding:13px 15px}
#page-decision-lab .dl-teach-k{font:800 10px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:6px}
#page-decision-lab .dl-teach-b{font:400 13px/1.5 Inter,sans-serif;color:var(--text-mid)}
@media (prefers-reduced-motion:reduce){#page-decision-lab .dl-opt .dl-why{transition:opacity .12s}}
```

Bump `dg-system.css?v=` in `index.html` to the in-flight app version (target `v7.59.0`).

- [ ] **Step 5: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/decision-lab.spec.js -g "dl analyze why" --project=chromium --workers=1`

```bash
git add features/sim-lab.js dg-system.css index.html tests/e2e/decision-lab.spec.js
git commit -m "feat(decision-lab): analyze per-option why (backward-compatible grade reveal + teach block)"
```

---

## Task 3: Entry page + Home tile + Pro gate (exact §4 copy)

**Open first:** `mockups/decision-lab-concept.html` panel 1 (`.shell`, `.hdr`/`.back`/`.hdr-title`/`.pro-pill`, `.mark`, `.entry-title`, `.lede`, `.pick-k`, `.seg`/`.seg-opt`/`.seg-pro`, `.target`/`.target-k`/`.target-v`, `.chips`/`.chip`, `.cta`, `.note`). **Motion:** spec §7 — `.dl-seg-opt:active scale(0.97)`; entrances `scale(0.96-0.98)`; hover gated; reduced-motion respected.

**Spec:** §3.5 (entry), §3.6 (modes), §4 (gating + EXACT gate copy), §5 (copy verbatim). Build `#page-decision-lab-entry` with the mode toggle (Practice / Exam-style `.seg`), cert target, and decisions picker (5 / 10 / 20·full set). Add the Decision Lab Home tile gated to `_DL_CERTS`. Free tapping Exam-style or the 20-set routes through `_gateProOnly('Decision Lab', …)` with the exact §4 copy.

**Files:**
- Modify: `index.html` (`#page-decision-lab-entry`; `#dl-home-opt` Home tile beside `#sl-home-opt`)
- Modify: `app.js` (`_DL_CERTS` Home gate; `renderDecisionLabHomeEntry()`; `startDecisionLabHome()`; lazy-load + Home-render hooks)
- Modify: `features/sim-lab.js` (`_dlPickedMode`/`_dlPickedDecisions`; `decisionLabOpenEntry`, `decisionLabEntryBack`, `_dlBindModeToggle`, `_dlBindDecisionChips`, `_dlSyncEntry`, `_dlGateCopy`; exports)
- Modify: `dg-system.css` (`.dl-*` entry styles; `?v=` bump if not already)
- Test: `tests/e2e/decision-lab.spec.js`

- [ ] **Step 1: Add the entry page markup** — in `index.html`, after `#page-sim-lab-entry` closes (line 1815), add (lift mockup panel 1 markup/classes/copy verbatim, with live IDs):

```html
<!-- Decision Lab — entry screen (cloud-cert scenario drill) -->
<div id="page-decision-lab-entry" class="page">
  <div class="gnt-shell">
    <div class="dl-hdr">
      <button type="button" class="back-btn" data-action="decisionLabEntryBack" aria-label="Back"><svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg><span class="back-btn-label">Back</span></button>
      <h1 class="gnt-hdr-title">Decision Lab</h1>
      <span class="pro-lock-pill tier-free-only"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>Pro</span>
    </div>
    <div class="gnt-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3v6a3 3 0 0 0 3 3h6"></path><path d="M18 9V3M15 6l3-3 3 3M18 12v9"></path></svg></div>
    <h2 class="gnt-entry-title">Make the <i>right call</i></h2>
    <p class="gnt-entry-lede">Stop getting blindsided by look-alike service questions. Three of four options look right; the buried constraint picks the winner. Practice shows the why; exam-style hides it and starts the clock.</p>
    <div class="dl-pick-k">Mode</div>
    <div class="dl-seg" id="dl-mode" role="group" aria-label="Practice or Exam-style mode">
      <button type="button" class="dl-seg-opt is-on" data-mode="practice" aria-pressed="true">
        <span class="t">Practice</span><span class="d">Why each wrong option is wrong</span>
      </button>
      <button type="button" class="dl-seg-opt" data-mode="exam" aria-pressed="false">
        <span class="t"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6"></path></svg> Exam-style<span class="dl-seg-pro">Pro</span></span>
        <span class="d">Timed · no feedback till the end</span>
      </button>
    </div>
    <div class="dl-target">
      <div class="dl-target-k">Today's target</div>
      <div class="dl-target-v" id="dl-target">Mixed · Azure AZ-900</div>
    </div>
    <div class="dl-pick-k">How many decisions</div>
    <div class="dl-chips" id="dl-decisions" role="group" aria-label="Number of decisions">
      <button type="button" class="dl-chip" data-decisions="5" aria-pressed="false">5</button>
      <button type="button" class="dl-chip is-on" data-decisions="10" aria-pressed="true">10</button>
      <button type="button" class="dl-chip dl-chip-pro" data-decisions="20" aria-pressed="false">20 · full set</button>
    </div>
    <button type="button" class="btn btn-primary gnt-cta" id="dl-start" data-action="decisionLabSessionStart">Start the drill →</button>
    <div class="dl-note">Free · 1 set a day, full reasoning on every miss. Pro · unlimited sets, exam-style timing, and weak-spots that follow you across sessions</div>
  </div>
</div>
```

- [ ] **Step 2: Add the Home tile** — in `index.html`, immediately after the `#sl-home-opt` button (line 413), add:

```html
          <button type="button" class="opt is-hidden" id="dl-home-opt" onclick="startDecisionLabHome()"><span class="on">Decision Lab</span><span class="od" id="dl-home-sub">Read the constraint, kill the look-alikes</span></button>
```

- [ ] **Step 3: Add entry styles** — in `dg-system.css`, add the `#page-decision-lab-entry` block (lift mockup `.seg`/`.target`/`.chips`/`.note`; live tokens; ≥44pt; reduced-motion):

```css
#page-decision-lab-entry .dl-hdr{display:flex;align-items:center;gap:10px;margin-bottom:14px}
#page-decision-lab-entry .dl-pick-k{font:800 10px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);margin-bottom:9px}
#page-decision-lab-entry .dl-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;background:var(--surface3);border:1px solid var(--border);border-radius:12px;margin-bottom:18px}
#page-decision-lab-entry .dl-seg-opt{display:flex;flex-direction:column;gap:2px;text-align:left;min-height:44px;padding:10px 12px;border-radius:9px;cursor:pointer;border:1px solid transparent;background:none;transition:transform .15s var(--ease,cubic-bezier(.16,1,.3,1)),border-color .15s,background .15s}
#page-decision-lab-entry .dl-seg-opt:active{transform:scale(.97)}
#page-decision-lab-entry .dl-seg-opt .t{font:700 13.5px/1 Inter,sans-serif;color:var(--text);display:inline-flex;align-items:center;gap:6px}
#page-decision-lab-entry .dl-seg-opt .d{font:500 11.5px/1.3 Inter,sans-serif;color:var(--text-dim)}
#page-decision-lab-entry .dl-seg-opt svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2}
#page-decision-lab-entry .dl-seg-opt.is-on{background:var(--surface);border-color:color-mix(in oklab,var(--accent) 30%,var(--border))}
#page-decision-lab-entry .dl-seg-opt.is-on .t{color:var(--accent)}
#page-decision-lab-entry .dl-seg-pro{font:800 8.5px/1 Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);border:1px solid color-mix(in oklab,var(--accent) 32%,var(--border));padding:1px 5px;border-radius:999px;margin-left:6px}
#page-decision-lab-entry .dl-target{background:var(--surface3);border:1px solid var(--border-soft,var(--border));border-radius:12px;padding:12px 14px;margin-bottom:18px}
#page-decision-lab-entry .dl-target-k{font:800 10px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim)}
#page-decision-lab-entry .dl-target-v{font:600 15px/1.2 Inter,sans-serif;margin-top:3px;color:var(--text)}
#page-decision-lab-entry .dl-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
#page-decision-lab-entry .dl-chip{font:600 13px/1 Inter,sans-serif;min-height:44px;color:var(--text-mid);background:var(--surface3);border:1px solid var(--border);border-radius:9px;padding:9px 14px;cursor:pointer;transition:transform .12s var(--ease,cubic-bezier(.16,1,.3,1))}
#page-decision-lab-entry .dl-chip:active{transform:scale(.97)}
#page-decision-lab-entry .dl-chip.is-on{color:var(--on-accent);background:var(--accent);border-color:var(--accent)}
#page-decision-lab-entry .dl-note{font:400 12px/1.4 Inter,sans-serif;color:var(--text-dim);margin-top:11px;text-align:center}
@media (hover:hover) and (pointer:fine){#page-decision-lab-entry .dl-seg-opt:hover{border-color:color-mix(in oklab,var(--accent) 24%,var(--border))}}
@media (prefers-reduced-motion:reduce){#page-decision-lab-entry .dl-seg-opt,#page-decision-lab-entry .dl-chip{transition:none}}
```

- [ ] **Step 4: Implement entry state + gate** — in `features/sim-lab.js`, add near `_slPickedMode` (line 674):

```js
  var _dlPickedMode = 'practice';
  var _dlPickedDecisions = 10;

  // Spec §4 — EXACT gate copy. Do not paraphrase. Keyed by the locked surface.
  var _DL_GATE = {
    exam: {
      title: 'Exam-style mode is Pro',
      body: "The real exam never explains why your pick was wrong, and never gives you the clock back. Exam-style runs a timed, no-feedback set so the first time you feel that pressure isn't on test day. Pro unlocks it, plus unlimited sets and weak-spots that follow you across sessions.",
      primary: 'Go Pro', secondary: 'Keep practicing'
    },
    full20: {
      title: 'The full 20-decision set is Pro',
      body: 'Short sets warm you up; the real exam is a marathon of back-to-back calls. The 20-set rehearses that stamina. Pro removes the cap.'
    },
    second: {
      title: "That's today's free set",
      body: 'Come back tomorrow free, or go Pro to keep drilling now while the misses are fresh. Same-day re-drill on the services you just confused is where the look-alikes stick.',
      primary: 'Continue with Pro', secondary: 'Remind me tomorrow'
    }
  };
  function _dlGateCopy(which) { return _DL_GATE[which]; }

  function _dlSyncEntry() {
    var opts = document.querySelectorAll('#dl-mode .dl-seg-opt');
    Array.prototype.forEach.call(opts, function (o) {
      var on = o.getAttribute('data-mode') === _dlPickedMode;
      o.classList.toggle('is-on', on);
      o.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var chips = document.querySelectorAll('#dl-decisions .dl-chip');
    Array.prototype.forEach.call(chips, function (c) {
      var on = parseInt(c.getAttribute('data-decisions'), 10) === _dlPickedDecisions;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function _dlBindModeToggle() {
    var host = document.getElementById('dl-mode');
    if (!host || host.__bound) return; host.__bound = true;
    host.addEventListener('click', function (e) {
      var opt = e.target.closest('.dl-seg-opt'); if (!opt) return;
      var m = opt.getAttribute('data-mode');
      if (m === 'exam' && !_slIsPro()) { window._gateProOnly('Decision Lab', _dlGateCopy('exam')); return; }
      _dlPickedMode = m; _dlSyncEntry();
    });
  }

  function _dlBindDecisionChips() {
    var host = document.getElementById('dl-decisions');
    if (!host || host.__bound) return; host.__bound = true;
    host.addEventListener('click', function (e) {
      var chip = e.target.closest('.dl-chip'); if (!chip) return;
      var n = parseInt(chip.getAttribute('data-decisions'), 10);
      if (n === 20 && !_slIsPro()) { window._gateProOnly('Decision Lab', _dlGateCopy('full20')); return; }
      _dlPickedDecisions = n; _dlSyncEntry();
    });
  }

  // Cert target label from the live pack (honest names; spec §6 — no hardcoded cert).
  function _dlTargetLabel() {
    var pack = window.CERT_PACK && window.CERT_PACK.meta;
    if (pack && pack.name) return 'Mixed · ' + pack.name + (pack.code ? ' ' + pack.code : '');
    return 'Mixed';
  }

  function decisionLabOpenEntry() {
    _dlPickedMode = 'practice';
    _dlPickedDecisions = 10;
    var tgt = document.getElementById('dl-target'); if (tgt) tgt.textContent = _dlTargetLabel();
    _dlBindModeToggle(); _dlBindDecisionChips(); _dlSyncEntry();
    if (typeof showPage === 'function') showPage('decision-lab-entry');
  }
  function decisionLabEntryBack() { if (typeof showPage === 'function') showPage('setup'); }
```

Expose in the export block: `window.decisionLabOpenEntry = decisionLabOpenEntry; window.decisionLabEntryBack = decisionLabEntryBack; window._simLab.dlGateCopy = _dlGateCopy;`. (Stub `function _dlSessionStartDispatch(){}` and `window.decisionLabSessionStart = _dlSessionStartDispatch;` until Task 4.)

- [ ] **Step 5: Implement the Home tile + loader hooks** — in `app.js`, after `window.startSimLabHome = startSimLabHome;` (line 7107), add:

```js
// Decision Lab Home entry (Home → Practice). Renders WITHOUT loading the module
// (cert/pro/daily-state live here); the module lazy-loads on click.
const _DL_CERTS = ['az900', 'ai900', 'sc900', 'clfc02'];
function renderDecisionLabHomeEntry() {
  const btn = document.getElementById('dl-home-opt');
  if (!btn) return;
  if (_DL_CERTS.indexOf(window.CURRENT_CERT) === -1) { btn.classList.add('is-hidden'); return; }
  btn.classList.remove('is-hidden');
  const sub = document.getElementById('dl-home-sub');
  if (sub) {
    const pro = !!(typeof _quotaState !== 'undefined' && _quotaState && (_quotaState.tier === 'pro' || _quotaState.tier === 'admin'));
    if (pro) { sub.textContent = 'Read the constraint, kill the look-alikes'; }
    else {
      const used = (typeof _dlFreeRunsToday === 'function') ? _dlFreeRunsToday() : 0;
      sub.textContent = used >= 1 ? 'Done today · Pro for more' : 'Read the constraint · one free set a day';
    }
  }
}
function startDecisionLabHome() {
  if (typeof _ensureDecisionLabLoaded !== 'function') return;
  _ensureDecisionLabLoaded(function () {
    if (typeof window.decisionLabOpenEntry === 'function') window.decisionLabOpenEntry();
  });
}
window.renderDecisionLabHomeEntry = renderDecisionLabHomeEntry;
window.startDecisionLabHome = startDecisionLabHome;
```

> Wire the initial paint: wherever `renderSimLabHomeEntry()` is invoked (its boot block at app.js ~line 7111 and any cert-switch re-render), add a sibling `if (typeof renderDecisionLabHomeEntry === 'function') renderDecisionLabHomeEntry();` so the tile reflects the active cert.

- [ ] **Step 6: Write the failing test**

```js
test('dl entry: tile gated to _DL_CERTS; free taps Exam-style/20 gate; Pro toggles; copy verbatim', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    // Home tile gating
    window.CURRENT_CERT = 'netplus';
    window.renderDecisionLabHomeEntry();
    const hiddenOnNet = document.getElementById('dl-home-opt').classList.contains('is-hidden');
    window.CURRENT_CERT = 'az900';
    window.CERT_PACK = { meta: { name: 'Azure Fundamentals', code: 'AZ-900' } };
    window.renderDecisionLabHomeEntry();
    const shownOnAz = !document.getElementById('dl-home-opt').classList.contains('is-hidden');
    // free → Exam-style + 20 gate
    window._quotaState = { tier: 'free' };
    let gate = 0, gTitle = '', gBody = '';
    window._gateProOnly = (feat, opts) => { gate++; gTitle = opts && opts.title; gBody = opts && opts.body; return false; };
    window.decisionLabOpenEntry();
    document.querySelector('#dl-mode .dl-seg-opt[data-mode="exam"]').click();
    const examGated = gate === 1 && gTitle === 'Exam-style mode is Pro' && /never gives you the clock back/.test(gBody);
    const stillPractice = document.querySelector('#dl-mode .dl-seg-opt[data-mode="practice"]').classList.contains('is-on');
    document.querySelector('#dl-decisions .dl-chip[data-decisions="20"]').click();
    const set20Gated = gate === 2 && gTitle === 'The full 20-decision set is Pro';
    // Pro → toggles work
    window._quotaState = { tier: 'pro' };
    document.querySelector('#dl-mode .dl-seg-opt[data-mode="exam"]').click();
    const examOn = document.querySelector('#dl-mode .dl-seg-opt[data-mode="exam"]').classList.contains('is-on');
    document.querySelector('#dl-decisions .dl-chip[data-decisions="20"]').click();
    const set20On = document.querySelector('#dl-decisions .dl-chip[data-decisions="20"]').classList.contains('is-on');
    const target = document.getElementById('dl-target').textContent;
    return { hiddenOnNet, shownOnAz, examGated, stillPractice, set20Gated, examOn, set20On, target };
  });
  expect(r.hiddenOnNet).toBe(true);
  expect(r.shownOnAz).toBe(true);
  expect(r.examGated).toBe(true);
  expect(r.stillPractice).toBe(true);
  expect(r.set20Gated).toBe(true);
  expect(r.examOn).toBe(true);
  expect(r.set20On).toBe(true);
  expect(r.target).toContain('Azure Fundamentals AZ-900');
});
```

- [ ] **Step 7: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/decision-lab.spec.js -g "dl entry" --project=chromium --workers=1`

```bash
git add index.html app.js features/sim-lab.js dg-system.css tests/e2e/decision-lab.spec.js
git commit -m "feat(decision-lab): entry page + Home tile (gated to _DL_CERTS) + Pro gate (exact copy)"
```

---

## Task 4: Runner + session reuse — `_dlSession`, build set, render a round

**Open first:** `mockups/decision-lab-concept.html` panel 2 chrome (`.sbar`/`.sbar-strip`/`.round-pill`/`.leave`, `.dots`/`.dot`/`.dot.done`/`.dot.now`, `.scn-k`, `.scn`/`.scn mark`, `.constraint`). **Motion:** spec §7 — round transitions outgoing `opacity+translateX(-12px)` 180ms / incoming `+translateX(12px→0)` 200ms; dots recolor 200ms; constraint `<mark>` clip-path wipe-in 240ms; reduced-motion → opacity only.

**Spec:** §3.5 (`#page-decision-lab` runner), §3.6 (session). Build `#page-decision-lab` (Decision Lab topbar + dots + body), a `_dlSession` machine (mode, decisions, idx, results, cert), `_dlBuildSet` (pull from `_dlBank`, cap to picked count, no-repeat), and `_dlRunRound` rendering a scenario via `_slMountScenario` and Decision Lab chrome. The CTA dispatcher routes practice vs exam-style.

**Files:**
- Modify: `index.html` (`#page-decision-lab` runner + `#page-decision-lab-result` shell)
- Modify: `features/sim-lab.js` (`_dlSession`, `_dlBuildSet`, `_dlSessionStart`, `_dlSessionStartDispatch`, `_dlRunRound`, `_dlUpdateChrome`; exports)
- Modify: `dg-system.css` (`#page-decision-lab` chrome: `.dl-sbar`/`.dl-round-pill`/`.dl-dots`/`.dl-scn`/`.dl-constraint`/`.dl-opts`/`.dl-opt`; `?v=` bump)
- Test: `tests/e2e/decision-lab.spec.js`

- [ ] **Step 1: Add the runner + result markup** — in `index.html`, after `#page-decision-lab-entry` closes, add:

```html
<div id="page-decision-lab" class="page">
  <div class="dl-shell">
    <div class="dl-sbar">
      <span class="dl-sbar-strip">Decision Lab</span>
      <span class="dl-round-pill is-hidden" id="dl-round-pill">Decision 1 of 10</span>
      <span id="dl-clock-slot"></span>
      <button type="button" class="btn gnt-ghost" data-action="decisionLabExit">Leave</button>
    </div>
    <div class="dl-dots is-hidden" id="dl-dots" aria-hidden="true"></div>
    <div id="dl-body"></div>
  </div>
</div>

<div id="page-decision-lab-result" class="page">
  <div class="gnt-shell gnt-shell-result" id="dl-result-root"></div>
</div>
```

- [ ] **Step 2: Add runner chrome styles** — in `dg-system.css`, lift the mockup's `.sbar`/`.dots`/`.scn`/`.constraint`/`.opts`/`.opt` into `#page-decision-lab` (live tokens; ≥44pt options):

```css
#page-decision-lab .dl-shell{max-width:560px;margin:0 auto;padding:18px 22px 40px}
#page-decision-lab .dl-sbar{display:flex;align-items:center;gap:10px;padding-bottom:14px;margin-bottom:16px;border-bottom:1px solid var(--border-soft,var(--border))}
#page-decision-lab .dl-sbar-strip{font:600 13px/1 Inter,sans-serif;color:var(--text-mid)}
#page-decision-lab .dl-round-pill{font:800 11px/1 Inter,sans-serif;letter-spacing:.06em;color:var(--accent);border:1px solid color-mix(in oklab,var(--accent) 30%,var(--border));background:color-mix(in oklab,var(--accent) 8%,transparent);padding:3px 9px;border-radius:999px}
#page-decision-lab .dl-sbar .gnt-ghost{margin-left:auto}
#page-decision-lab .dl-dots{display:flex;gap:5px;margin:0 0 16px}
#page-decision-lab .dl-dot{width:22px;height:4px;border-radius:999px;background:var(--border);transition:background .2s var(--ease,cubic-bezier(.16,1,.3,1))}
#page-decision-lab .dl-dot.done{background:var(--green)}
#page-decision-lab .dl-dot.now{background:var(--accent)}
#page-decision-lab .dl-scn-k{font:800 10px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px}
#page-decision-lab .dl-scn{font:500 15px/1.55 Inter,sans-serif;color:var(--text);margin-bottom:6px}
#page-decision-lab .dl-scn mark{background:color-mix(in oklab,var(--accent) 18%,transparent);color:var(--accent);font-weight:700;padding:0 3px;border-radius:4px}
#page-decision-lab .dl-constraint{display:inline-flex;align-items:center;gap:6px;font:700 11px/1 Inter,sans-serif;color:var(--accent);background:color-mix(in oklab,var(--accent) 9%,transparent);border:1px solid color-mix(in oklab,var(--accent) 26%,var(--border));padding:4px 9px;border-radius:999px;margin:6px 0 16px}
#page-decision-lab .sl-analyze-block{display:flex;flex-direction:column;gap:9px}
#page-decision-lab .sl-analyze-line{display:flex;gap:11px;align-items:flex-start;min-height:44px;padding:13px 14px;border:1px solid var(--border);border-radius:12px;background:var(--surface3);color:var(--text);cursor:pointer;text-align:left;font:600 14px/1.3 Inter,sans-serif;transition:transform .15s var(--ease,cubic-bezier(.16,1,.3,1)),border-color .15s,background .15s}
#page-decision-lab .sl-analyze-line:active{transform:scale(.97)}
#page-decision-lab .sl-analyze-line.sl-sel{border-color:color-mix(in oklab,var(--accent) 40%,var(--border));background:color-mix(in oklab,var(--accent) 8%,transparent)}
@media (prefers-reduced-motion:reduce){#page-decision-lab .dl-dot,#page-decision-lab .sl-analyze-line{transition:none}}
```

- [ ] **Step 3: Implement the session + runner** — in `features/sim-lab.js`, replace the Task-3 `_dlSessionStartDispatch` stub and add:

```js
  var _dlSession = null;

  // Build a set of `count` Decision Lab scenarios for `cert` from _dlBank,
  // no-repeat, rotating by minute so re-runs vary. Returns [] if the bank is
  // empty (the runner then shows the empty state).
  function _dlBuildSet(cert, count) {
    var bank = _dlBank(cert).filter(function (s) { return simLabValidateScenario(s).ok; });
    if (!bank.length) return [];
    var start = (new Date().getMinutes()) % bank.length;
    var out = [];
    for (var i = 0; i < bank.length && out.length < count; i++) {
      out.push(bank[(start + i) % bank.length]);
    }
    return out;
  }

  function _dlUpdateChrome() {
    var pill = document.getElementById('dl-round-pill');
    if (pill) {
      pill.classList.remove('is-hidden');
      pill.textContent = 'Decision ' + (_dlSession.idx + 1) + ' of ' + _dlSession.rounds;
    }
    var dots = document.getElementById('dl-dots');
    if (dots) {
      dots.classList.remove('is-hidden');
      dots.innerHTML = '';
      for (var i = 0; i < _dlSession.rounds; i++) {
        var cls = 'dl-dot' + (i < _dlSession.idx ? ' done' : (i === _dlSession.idx ? ' now' : ''));
        dots.appendChild(_el('span', cls));
      }
    }
  }

  function _dlSessionStart() {
    var cert = window.CURRENT_CERT || 'az900';
    var set = _dlBuildSet(cert, _dlPickedDecisions);
    _dlSession = {
      mode: _dlPickedMode, rounds: set.length, idx: 0, pro: _slIsPro(),
      cert: cert, scenarios: set, results: [],
      // exam-style fields (Task 6); present so the shared countdown can read them
      deadlineMs: 0, budgetMs: 0, clock: null, amber: false, view: 'round'
    };
    if (typeof showPage === 'function') showPage('decision-lab');
    if (!set.length) { _dlRenderEmpty(); return; }
    if (_dlSession.mode === 'exam') { _dlStartExamStyle(); return; }   // Task 6
    _dlRunRound();
  }

  function _dlRenderEmpty() {
    var body = document.getElementById('dl-body');
    if (body) body.innerHTML = '<p class="dl-scn">No decision scenarios are loaded for this cert yet.</p>';
  }

  // Render the current round: scenario→pick analyze via _slMountScenario, with
  // Decision Lab chrome. Practice grade-reveal is wired in Task 5; exam-style
  // suppression in Task 6. Here: render + advance on submit.
  function _dlRunRound() {
    _dlUpdateChrome();
    var scn = _dlSession.scenarios[_dlSession.idx];
    var body = document.getElementById('dl-body');
    body.innerHTML = '';
    _slMountScenario(body, scn, {
      onSubmit: function (result) {
        _dlSession.results.push({ scenario: scn, score: result, passed: result.fraction === 1, responses: result.responses });
        _dlSession.idx++;
        if (_dlSession.idx >= _dlSession.rounds) { _dlRenderResult(); }   // Task 8
        else { _dlRunRound(); }
      }
    });
  }

  function _dlSessionStartDispatch() {
    if (_dlPickedMode === 'exam' && !_slIsPro()) { window._gateProOnly('Decision Lab', _dlGateCopy('exam')); return; }
    if (_dlPickedDecisions === 20 && !_slIsPro()) { window._gateProOnly('Decision Lab', _dlGateCopy('full20')); return; }
    // free practice 1/day cap (Task 9) — checked here for the practice path
    if (_dlPickedMode === 'practice' && !_slIsPro() &&
        typeof window._dlFreeRunsToday === 'function' && window._dlFreeRunsToday() >= 1) {
      window._gateProOnly('Decision Lab', _dlGateCopy('second')); return;
    }
    if (_dlPickedMode === 'practice' && !_slIsPro() && typeof window._dlBumpFreeRun === 'function') window._dlBumpFreeRun();
    return _dlSessionStart();
  }
```

Stub `function _dlStartExamStyle(){ _dlRunRound(); }`, `function _dlRenderResult(){}` until Tasks 6/8. Expose: `window.decisionLabSessionStart = _dlSessionStartDispatch; window._simLab.dlBuildSet = _dlBuildSet; window._simLab.dlSession = function(){ return _dlSession; };`.

- [ ] **Step 4: Write the failing test** — build set + render round 1 chrome:

```js
test('dl runner: builds set from bank, renders Decision N of M + scenario, advances on submit', async ({ page }) => {
  await gotoApp(page);
  await installSeedFixture(page, 'DECISION_LAB_SEED_AZ900', 12);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'az900';
    window.CERT_PACK = { meta: { name: 'Azure Fundamentals', code: 'AZ-900' } };
    window.decisionLabOpenEntry();
    // pick 5 decisions, practice (default)
    document.querySelector('#dl-decisions .dl-chip[data-decisions="5"]').click();
    window.decisionLabSessionStart();
    const sess = window._simLab.dlSession();
    const onPage = document.getElementById('page-decision-lab').classList.contains('active');
    const pill = document.getElementById('dl-round-pill').textContent;
    const dots = document.querySelectorAll('#dl-dots .dl-dot').length;
    const hasScenario = !!document.querySelector('#dl-body .sl-scenario');
    return { rounds: sess.rounds, onPage, pill, dots, hasScenario };
  });
  expect(r.rounds).toBe(5);
  expect(r.onPage).toBe(true);
  expect(r.pill).toBe('Decision 1 of 5');
  expect(r.dots).toBe(5);
  expect(r.hasScenario).toBe(true);
});
```

- [ ] **Step 5: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/decision-lab.spec.js -g "dl runner" --project=chromium --workers=1`

```bash
git add index.html features/sim-lab.js dg-system.css tests/e2e/decision-lab.spec.js
git commit -m "feat(decision-lab): runner page + _dlSession + set build + round render (reuses _slMountScenario)"
```

---

## Task 5: Practice grade-reveal with per-option reasoning

**Open first:** `mockups/decision-lab-concept.html` panel 2 graded state (`.opts.graded`, `.opt.correct/.wrong/.picked-wrong`, `.opt .verdict`, `.teach`, `.cta-row`/`.cta`/`.cta.ghost`). **Motion:** spec §7 — the full grade-reveal sequence from Task 2 (crossfade + settle + staggered why + marks + teach last); §8 tall-card note — on phones the graded card grows; the "Next decision" CTA must stay reachable (scroll to it after grade).

**Spec:** §3.6 (Practice = per-round grade reveal with per-option reasoning, the hero behavior). In practice mode, the round does NOT auto-advance on the engine submit. Instead, submitting **grades in place** via `_dlGradeAnalyze` (Task 2), reveals each option's `why` + the teach block, then shows a "Next decision →" CTA that advances. Use the mockup's `.cta-row` (Flag ghost + Next).

**Files:**
- Modify: `features/sim-lab.js` (`_dlRunRound` — practice grade-in-place; `_dlAdvance`)
- Modify: `dg-system.css` (`.dl-cta-row`/`.dl-cta`/`.dl-cta.ghost`; `?v=` bump)
- Test: `tests/e2e/decision-lab.spec.js`

- [ ] **Step 1: Add CTA-row styles** — in `dg-system.css`, lift the mockup's `.cta-row` into `#page-decision-lab`:

```css
#page-decision-lab .dl-cta-row{display:flex;gap:9px;margin-top:16px}
#page-decision-lab .dl-cta{flex:1;text-align:center;font:700 15px/1 Inter,sans-serif;min-height:44px;color:var(--on-accent);background:var(--accent);border:1px solid var(--accent-deep,var(--accent));border-radius:11px;padding:13px;cursor:pointer;transition:transform .12s var(--ease,cubic-bezier(.16,1,.3,1))}
#page-decision-lab .dl-cta:active{transform:scale(.97)}
#page-decision-lab .dl-cta.ghost{color:var(--accent);background:color-mix(in oklab,var(--accent) 9%,transparent);border-color:color-mix(in oklab,var(--accent) 30%,var(--border))}
@media (prefers-reduced-motion:reduce){#page-decision-lab .dl-cta{transition:none}}
```

- [ ] **Step 2: Implement practice grade-in-place** — in `features/sim-lab.js`, rework `_dlRunRound` so practice grades in place (exam-style still auto-collects via Task 6). Replace the `onSubmit` body:

```js
  function _dlAdvance() {
    _dlSession.idx++;
    if (_dlSession.idx >= _dlSession.rounds) { _dlRenderResult(); }
    else { _dlRunRound(); }
  }

  function _dlRunRound() {
    _dlUpdateChrome();
    var scn = _dlSession.scenarios[_dlSession.idx];
    var step = scn.steps[0];   // the hero scenario→pick is a single analyze step
    var body = document.getElementById('dl-body');
    body.innerHTML = '';
    _slMountScenario(body, scn, {
      onSubmit: function (result) {
        _dlSession.results.push({ scenario: scn, score: result, passed: result.fraction === 1, responses: result.responses });
        if (_dlSession.mode === 'exam') { _dlAdvance(); return; }   // exam-style: no reveal (Task 6 overrides flow anyway)
        // Practice: grade in place with per-option reasoning, then offer Next.
        var picked = (result.responses && result.responses[step.id] && result.responses[step.id].selected) || [];
        var host = body.querySelector('.sl-scenario') || body;
        _dlGradeAnalyze(host, step, picked);
        var oldSubmit = body.querySelector('[data-action="simLabSubmitScenario"]');
        if (oldSubmit) oldSubmit.remove();
        var row = _el('div', 'dl-cta-row');
        var flag = _el('button', 'dl-cta ghost', 'Flag'); flag.setAttribute('type', 'button');
        var next = _el('button', 'dl-cta',
          _dlSession.idx + 1 >= _dlSession.rounds ? 'See results →' : 'Next decision →');
        next.setAttribute('type', 'button');
        next.addEventListener('click', _dlAdvance);
        row.appendChild(flag); row.appendChild(next);
        host.appendChild(row);
        // §8 tall-card: keep the primary CTA reachable after the reveal grows the card.
        if (next.scrollIntoView) next.scrollIntoView({ block: 'nearest' });
      }
    });
  }
```

- [ ] **Step 3: Write the failing test** — submit grades in place + reveals why + Next advances:

```js
test('dl practice grade: submitting a wrong pick reveals per-option why + teach, Next advances', async ({ page }) => {
  await gotoApp(page);
  await installSeedFixture(page, 'DECISION_LAB_SEED_AZ900', 3);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'az900';
    window.CERT_PACK = { meta: { name: 'Azure Fundamentals', code: 'AZ-900' } };
    window.decisionLabOpenEntry();
    document.querySelector('#dl-decisions .dl-chip[data-decisions="5"]').click();
    window.decisionLabSessionStart();
    // pick the wrong option C (correct is B) then submit
    const lines = document.querySelectorAll('#dl-body .sl-analyze-line');
    Array.from(lines).find(l => l.getAttribute('data-line') === 'c').click();
    document.querySelector('#dl-body [data-action="simLabSubmitScenario"]').click();
    const graded = !!document.querySelector('#dl-body .dl-graded');
    const correct = !!document.querySelector('#dl-body .dl-correct');
    const pickedWrong = !!document.querySelector('#dl-body .dl-picked-wrong');
    const teach = !!document.querySelector('#dl-body .dl-teach');
    const whyShown = document.querySelectorAll('#dl-body .dl-why').length;
    const sess = window._simLab.dlSession();
    const idxBefore = sess.idx;
    document.querySelector('#dl-body .dl-cta-row .dl-cta:not(.ghost)').click();
    return { graded, correct, pickedWrong, teach, whyShown, idxBefore, idxAfter: sess.idx };
  });
  expect(r.graded).toBe(true);
  expect(r.correct).toBe(true);
  expect(r.pickedWrong).toBe(true);
  expect(r.teach).toBe(true);
  expect(r.whyShown).toBeGreaterThanOrEqual(2);
  expect(r.idxBefore).toBe(0);
  expect(r.idxAfter).toBe(1);
});
```

- [ ] **Step 4: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/decision-lab.spec.js -g "dl practice grade" --project=chromium --workers=1`

```bash
git add features/sim-lab.js dg-system.css tests/e2e/decision-lab.spec.js
git commit -m "feat(decision-lab): practice grade-reveal in place (per-option why + teach + Next)"
```

---

## Task 6: Exam-style mode — reuse the wall-clock countdown, suppress feedback, retro-reveal at verdict

**Open first:** `mockups/decision-lab-concept.html` panel 2 sbar (no per-round feedback in exam-style) + Sim Lab's clock chrome (`.sl-clock` family). **Motion:** spec §7 — count-up/clock per Sim Lab exam mode; clock amber latch with NO pulse; reduced-motion instant. Exam-style: NO per-round grade reveal motion (deferred to verdict).

**Spec:** §3.6 (Exam-style Pro), §8 (iOS-safe wall-clock). Reuse `_slStartCountdown`/`_slStopCountdown`/`_slTickClock` (shipped). `_dlStartExamStyle` computes budget = Σ per-decision estMinutes (no tightening, v1: ×1.0), sets `deadlineMs`, starts the countdown rendered into `#dl-clock-slot`, and runs rounds with feedback suppressed (each submit auto-advances via `_dlAdvance`, no grade reveal). Time-up → auto-submit → verdict (the verdict retro-reveals reasoning per round). The shared `_slTickClock` currently early-returns unless `_slSession.mode==='exam'` and calls `_slExamSubmit` — generalize it minimally to also serve a `_dlSession` exam.

**Files:**
- Modify: `index.html` (`#dl-clock-slot` already added in Task 4)
- Modify: `features/sim-lab.js` (`_dlStartExamStyle`, `_dlExamBudgetMs`; minimal `_slTickClock`/`_slStartCountdown` generalization to read the active exam session; `_dlExamSubmit`)
- Modify: `dg-system.css` (`#page-decision-lab .dl-clock` if the Sim Lab `.sl-clock` scope doesn't apply; `?v=` bump)
- Test: `tests/e2e/decision-lab.spec.js`

- [ ] **Step 1: Generalize the countdown to the active session** — in `features/sim-lab.js`, add a tiny accessor and make the clock read it. Add near `_slStartCountdown` (line 772):

```js
  // The countdown serves whichever exam-style session is active. Sim Lab uses
  // _slSession (mode 'exam'); Decision Lab uses _dlSession (mode 'exam'). One
  // accessor keeps _slStartCountdown/_slTickClock shared (spec §3.1).
  function _activeExamSession() {
    if (_slSession && _slSession.mode === 'exam') return _slSession;
    if (_dlSession && _dlSession.mode === 'exam') return _dlSession;
    return null;
  }
```

In `_slStartCountdown(deadlineMs)` (line 772), replace the references to `_slSession` for the clock host with the active session. Specifically change the clock-slot lookup to pick the Decision Lab slot when the Decision Lab exam is active, and store the interval on the active session:

```js
  function _slStartCountdown(deadlineMs) {
    _slStopCountdown();
    var sess = _activeExamSession(); if (!sess) return;
    var slotId = (sess === _dlSession) ? 'dl-clock-slot' : 'sl-clock-slot';
    var slot = document.getElementById(slotId);
    if (!slot) return;
    slot.innerHTML = '';
    var clk = _el('span', 'sl-clock');
    clk.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6"></path></svg><span class="sl-clock-t">' +
      _slFmtClock(deadlineMs - Date.now()) + '</span> <span class="cap">left</span>';
    slot.appendChild(clk);
    sess.clock = setInterval(_slTickClock, 1000);
    _slTickClock();
    _slVisHandler = function () { if (document.visibilityState === 'visible') _slTickClock(); };
    _slFocusHandler = function () { _slTickClock(); };
    document.addEventListener('visibilitychange', _slVisHandler);
    window.addEventListener('focus', _slFocusHandler);
  }
```

In `_slStopCountdown()` (line 789), clear the interval off whichever session holds it (it already nulls `_slSession.clock`; add the Decision Lab session):

```js
  function _slStopCountdown() {
    [_slSession, _dlSession].forEach(function (s) { if (s && s.clock) { clearInterval(s.clock); s.clock = null; } });
    if (_slVisHandler) { document.removeEventListener('visibilitychange', _slVisHandler); _slVisHandler = null; }
    if (_slFocusHandler) { window.removeEventListener('focus', _slFocusHandler); _slFocusHandler = null; }
  }
```

In `_slTickClock()` (line 797), retarget to the active session + route time-up to the right submitter:

```js
  function _slTickClock() {
    var sess = _activeExamSession(); if (!sess) return;
    var remaining = sess.deadlineMs - Date.now();   // wall-clock truth
    var clk = document.querySelector('.sl-clock');
    var t = clk && clk.querySelector('.sl-clock-t');
    if (t) t.textContent = _slFmtClock(Math.max(0, remaining));
    if (!sess.amber && remaining <= sess.budgetMs * 0.10) { sess.amber = true; if (clk) clk.classList.add('is-low'); }
    if (remaining <= 0) {
      _slStopCountdown();
      if (sess === _dlSession) _dlExamSubmit(true); else _slExamSubmit(true);
    }
  }
```

> This is the minimal generalization the spec calls for (share, do not fork). Re-running the full sim-lab suite (Step 5) guards the Sim Lab exam path.

- [ ] **Step 2: Implement Decision Lab exam-style** — in `features/sim-lab.js`, replace the Task-4 `_dlStartExamStyle` stub:

```js
  // Budget = Σ per-decision estMinutes × 1.0 × 60000 (spec §3.6 — no tightening v1).
  function _dlExamBudgetMs(scenarios) {
    var minutes = scenarios.reduce(function (a, s) {
      return a + (typeof s.estMinutes === 'number' && s.estMinutes > 0 ? s.estMinutes : 3);
    }, 0);
    return Math.round(minutes * 60000);
  }

  function _dlStartExamStyle() {
    _dlSession.budgetMs = _dlExamBudgetMs(_dlSession.scenarios);
    _dlSession.deadlineMs = Date.now() + _dlSession.budgetMs;
    _slStartCountdown(_dlSession.deadlineMs);   // shared wall-clock countdown
    _dlRunRound();                               // feedback suppressed inside (mode==='exam')
  }

  // Time-up or last-round submit → score everything + route to verdict (retro-reveal lives there).
  function _dlExamSubmit(timeUp) {
    if (!_dlSession || _dlSession.__submitted) return;
    _dlSession.__submitted = true;
    _slStopCountdown();
    // any rounds not yet answered score as missed (responses absent)
    while (_dlSession.results.length < _dlSession.rounds) {
      var i = _dlSession.results.length;
      var scn = _dlSession.scenarios[i];
      var score = simLabScoreScenario(scn, {});
      _dlSession.results.push({ scenario: scn, score: score, passed: false, responses: {} });
    }
    _dlSession.timeUp = !!timeUp;
    _dlRenderResult();
  }
```

In `_dlAdvance` (Task 5), route the exam-style last round through `_dlExamSubmit` so the clock stops:

```js
  function _dlAdvance() {
    _dlSession.idx++;
    if (_dlSession.idx >= _dlSession.rounds) {
      if (_dlSession.mode === 'exam') { _dlExamSubmit(false); } else { _dlRenderResult(); }
    } else { _dlRunRound(); }
  }
```

Expose: `window._simLab.dlExamSubmit = function (t) { _dlExamSubmit(t); }; window._simLab.dlTick = _slTickClock;`.

- [ ] **Step 3: Add clock scope (if needed)** — the Sim Lab `.sl-clock` rules are scoped to `#page-sim-lab`. Add a Decision Lab copy in `dg-system.css`:

```css
#page-decision-lab .sl-clock{display:inline-flex;align-items:center;gap:6px;font:700 14px/1 Inter,sans-serif;color:var(--text);font-variant-numeric:lining-nums tabular-nums;background:var(--surface3);border:1px solid var(--border);padding:6px 11px;min-height:44px;border-radius:999px;transition:color 220ms var(--ease,cubic-bezier(.16,1,.3,1)),border-color 220ms var(--ease,cubic-bezier(.16,1,.3,1))}
#page-decision-lab .sl-clock svg{width:13px;height:13px;fill:none;stroke:var(--text-dim);stroke-width:2}
#page-decision-lab .sl-clock .cap{font:700 10px/1 Inter,sans-serif;color:var(--text-dim);letter-spacing:.04em}
#page-decision-lab .sl-clock.is-low{color:var(--yellow);border-color:color-mix(in oklab,var(--yellow) 40%,var(--border))}
#page-decision-lab .sl-clock.is-low svg{stroke:var(--yellow)}
@media (prefers-reduced-motion:reduce){#page-decision-lab .sl-clock{transition:none}}
```

- [ ] **Step 4: Write the failing test** — exam-style suppresses feedback + clock drives time-up:

```js
test('dl exam-style: suppresses per-round feedback; countdown time-up auto-submits to verdict', async ({ page }) => {
  await gotoApp(page);
  await installSeedFixture(page, 'DECISION_LAB_SEED_AZ900', 4);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'az900';
    window.CERT_PACK = { meta: { name: 'Azure Fundamentals', code: 'AZ-900' } };
    const realNow = Date.now; const base = realNow.call(Date); let nowVal = base; Date.now = () => nowVal;
    window.decisionLabOpenEntry();
    document.querySelector('#dl-mode .dl-seg-opt[data-mode="exam"]').click();
    document.querySelector('#dl-decisions .dl-chip[data-decisions="5"]').click();
    window.decisionLabSessionStart();
    const sess = window._simLab.dlSession();
    const clockShown = !!document.querySelector('#dl-clock-slot .sl-clock');
    // submit round 1 — exam-style must NOT reveal feedback
    document.querySelector('#dl-body .sl-analyze-line').click();
    document.querySelector('#dl-body [data-action="simLabSubmitScenario"]').click();
    const noReveal = !document.querySelector('#dl-body .dl-graded') && sess.idx === 1;
    // jump past the deadline + tick → auto-submit to verdict
    nowVal = base + sess.budgetMs + 5000;
    window._simLab.dlTick();
    Date.now = realNow;
    const onResult = document.getElementById('page-decision-lab-result').classList.contains('active');
    return { clockShown, noReveal, onResult, results: sess.results.length, timeUp: sess.timeUp };
  });
  expect(r.clockShown).toBe(true);
  expect(r.noReveal).toBe(true);
  expect(r.onResult).toBe(true);
  expect(r.results).toBe(5);
  expect(r.timeUp).toBe(true);
});
```

- [ ] **Step 5: Run, expect PASS + re-run the full sim-lab suite (countdown was touched)**

Run: `npx playwright test tests/e2e/decision-lab.spec.js -g "dl exam-style" --project=chromium --workers=1`
Then: `npx playwright test tests/e2e/sim-lab.spec.js --project=chromium --workers=1` (the shared countdown must still pass Sim Lab exam tests).

- [ ] **Step 6: Commit**

```bash
git add index.html features/sim-lab.js dg-system.css tests/e2e/decision-lab.spec.js
git commit -m "feat(decision-lab): exam-style mode (shared wall-clock countdown, suppressed feedback, time-up auto-submit)"
```

---

## Task 7: Shared-responsibility sorter — service selector re-grades the boundary

**Open first:** `mockups/decision-lab-concept.html` panel 3 (`.scn-k`, `.srv-sel`/`.srv`/`.srv.on`, `.tray`/`.tok`, `.cols`/`.col`/`.col-h`/`.tok.placed`, `.shift`). **Motion:** spec §7 — sorter tap-to-place + drag; token travels via FLIP 220ms; drop-zone dashed→solid accent on over; **boundary-shift re-grade (the signature)** — on service-selector change, moved tokens animate across columns via FLIP 260ms staggered 50ms with an accent tint pulse (the motion IS the lesson); grade on Submit; reduced-motion → tokens jump.

**Spec:** §7 (the boundary-shift signature). Implement a `categorize` round with a service selector above the columns. Selecting a different service re-keys which column each token belongs to (the shared-responsibility boundary shifts) and **re-grades** accordingly. Use a **fixture scenario** with a `categorize` step whose `payload` carries a `services` array, each mapping item→column; switching the active service swaps `step.answer.map` to that service's map and visibly moves placed tokens. Grade on Submit reuses `simLabScoreScenario`.

**Files:**
- Modify: `features/sim-lab.js` (`_dlBindServiceSelector(host, step)` — rebinds the categorize answer + re-places tokens on selector change; hook it in `_dlRunRound` when the round's first step is `categorize` with `payload.services`)
- Modify: `dg-system.css` (`.dl-srv-sel`/`.dl-srv`/`.dl-shift`; `?v=` bump)
- Test: `tests/e2e/decision-lab.spec.js`

- [ ] **Step 1: Add sorter styles** — in `dg-system.css`, lift the mockup's `.srv-sel`/`.srv`/`.shift` (the columns reuse the engine's categorize DOM; style its containers in the Decision Lab scope):

```css
#page-decision-lab .dl-srv-sel{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
#page-decision-lab .dl-srv{font:700 12.5px/1 Inter,sans-serif;min-height:44px;display:inline-flex;align-items:center;padding:7px 14px;border-radius:8px;border:1px solid var(--border);background:var(--surface3);color:var(--text-mid);cursor:pointer;transition:transform .12s var(--ease,cubic-bezier(.16,1,.3,1))}
#page-decision-lab .dl-srv:active{transform:scale(.97)}
#page-decision-lab .dl-srv.on{color:var(--on-accent);background:var(--accent);border-color:var(--accent)}
#page-decision-lab .dl-shift{font:500 11.5px/1.4 Inter,sans-serif;color:var(--accent);margin-top:12px;display:inline-flex;gap:6px;align-items:center}
#page-decision-lab .dl-shift svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2}
@media (prefers-reduced-motion:reduce){#page-decision-lab .dl-srv{transition:none}}
```

- [ ] **Step 2: Implement the selector re-grade** — in `features/sim-lab.js`, add the binder and hook it into `_dlRunRound`. The selector lives ABOVE the engine-rendered categorize step; switching it rewrites `step.answer.map` for the live scenario so `simLabScoreScenario` grades against the active service's boundary:

```js
  // Shared-responsibility sorter (spec §7). The step is a normal `categorize`
  // step PLUS payload.services: [{ id, label, map:{itemId:columnId} }]. Selecting
  // a service swaps the step's answer map to that service's boundary (the
  // boundary-shift) and re-grades on Submit. Placed tokens animate across columns
  // (FLIP) unless reduced-motion.
  function _dlBindServiceSelector(host, step) {
    var services = step.payload && step.payload.services;
    if (!Array.isArray(services) || !services.length) return;
    var bar = _el('div', 'dl-srv-sel');
    var active = 0;
    services.forEach(function (svc, i) {
      var b = _el('button', 'dl-srv' + (i === 0 ? ' on' : ''), _esc(svc.label));
      b.setAttribute('type', 'button'); b.setAttribute('data-svc', svc.id);
      b.addEventListener('click', function () {
        if (active === i) return;
        active = i;
        Array.prototype.forEach.call(bar.children, function (c, n) { c.classList.toggle('on', n === i); });
        // boundary-shift: swap the answer map so Submit grades the new service.
        step.answer = step.answer || {};
        step.answer.map = Object.assign({}, services[i].map);
        // visually move any placed tokens to the column the new boundary expects.
        _dlReplaceTokens(host, step, services[i].map);
      });
      bar.appendChild(b);
    });
    // initial boundary = first service
    step.answer = step.answer || {};
    step.answer.map = Object.assign({}, services[0].map);
    var stepEl = host.querySelector('.sl-categorize');
    if (stepEl && stepEl.parentNode) stepEl.parentNode.insertBefore(bar, stepEl);
    var shift = _el('div', 'dl-shift',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18M14 7l5 5-5 5"></path></svg>' +
      'Switch the service and the boundary moves. That shift is the trap.');
    host.appendChild(shift);
  }

  // Re-place already-placed tokens to match a new boundary map (FLIP-friendly:
  // the engine's categorize DOM exposes per-item placement via data attributes;
  // here we just re-fire the placement so the live response + visuals follow).
  function _dlReplaceTokens(host, step, map) {
    Object.keys(map).forEach(function (itemId) {
      var item = host.querySelector('[data-item="' + _slAttr(itemId) + '"]');
      var col = host.querySelector('[data-target="' + _slAttr(map[itemId]) + '"]');
      if (item && col && item.parentNode !== col && !host.querySelector('.sl-picked')) {
        // only auto-move tokens the learner already placed (placed tokens carry a target)
        if (item.getAttribute('data-placed') === 'true') col.appendChild(item);
      }
    });
  }
```

Hook into `_dlRunRound` — after `_slMountScenario(...)` mounts, if the first step is a categorize with services, bind the selector. Add right after the `_slMountScenario` call in `_dlRunRound`:

```js
    var first = scn.steps[0];
    if (first && first.type === 'categorize' && first.payload && first.payload.services) {
      var host2 = body.querySelector('.sl-scenario') || body;
      _dlBindServiceSelector(host2, first);
    }
```

> Implementation note for the executor: the engine's categorize renderer (`_slRenderCategorize`, line 266) sets `data-item`/`data-target` on tokens/columns. Confirm the placed-token marker attribute name during build; if it differs from `data-placed`, adjust `_dlReplaceTokens` to read the renderer's actual marker. The behavioral contract under test is: selector change rewrites `step.answer.map`, so Submit grades against the new boundary.

- [ ] **Step 3: Write the failing test** — selector change re-grades the boundary:

```js
test('dl sorter: service selector swaps the boundary and re-grades on submit', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    // a single-scenario fixture whose only step is a shared-responsibility categorize
    window.DECISION_LAB_SEED_AZ900 = [{
      id: 'sorter1', cert: 'az900', objective: '2.1', topic: 'Shared responsibility',
      title: 'Who owns it', scenario: 'Sort each task under who owns it.', estMinutes: 2,
      family: 'Shared responsibility',
      steps: [{
        type: 'categorize', points: 1, prompt: 'Who is responsible?',
        explanation: 'The service tier moves the line.',
        payload: {
          items: [{ id: 'os', label: 'Patch the guest OS' }],
          categories: [{ id: 'cust', label: 'Customer' }, { id: 'aws', label: 'AWS' }],
          services: [
            { id: 'ec2', label: 'EC2', map: { os: 'cust' } },         // EC2: customer patches the OS
            { id: 'rds', label: 'RDS (managed)', map: { os: 'aws' } }  // RDS: AWS patches the OS
          ]
        },
        answer: { map: { os: 'cust' } }
      }]
    }];
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'az900';
    window.CERT_PACK = { meta: { name: 'Azure Fundamentals', code: 'AZ-900' } };
    window.decisionLabOpenEntry();
    document.querySelector('#dl-decisions .dl-chip[data-decisions="5"]').click();
    window.decisionLabSessionStart();
    const step = window._simLab.dlSession().scenarios[0].steps[0];
    const initialMap = JSON.stringify(step.answer.map);          // EC2 boundary (os→cust)
    const srvShown = !!document.querySelector('#dl-body .dl-srv-sel');
    // switch to RDS → boundary shifts (os→aws)
    document.querySelectorAll('#dl-body .dl-srv')[1].click();
    const shiftedMap = JSON.stringify(step.answer.map);
    return { srvShown, initialMap, shiftedMap, hasShiftNote: !!document.querySelector('#dl-body .dl-shift') };
  });
  expect(r.srvShown).toBe(true);
  expect(r.initialMap).toBe('{"os":"cust"}');
  expect(r.shiftedMap).toBe('{"os":"aws"}');   // selector re-grades the boundary
  expect(r.hasShiftNote).toBe(true);
});
```

- [ ] **Step 4: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/decision-lab.spec.js -g "dl sorter" --project=chromium --workers=1`

```bash
git add features/sim-lab.js dg-system.css tests/e2e/decision-lab.spec.js
git commit -m "feat(decision-lab): shared-responsibility sorter with service-selector boundary-shift re-grade"
```

---

## Task 8: Verdict — `_dlVerdictClusters` + look-alike pairs + weak families + cross-session persist

**Open first:** `mockups/decision-lab-concept.html` panel 4 (`.sbar`, `.score-row`/`.score-fig`/`.score-fig small`/`.score-cap`, `.vsec`/`.vsec-k`, `.confrow`/`.confrow .vs`/`.confrow .tag`, `.weak`/`.weak .w`, `.cta-row`). **Motion:** spec §7 — score figure count-up 0→N over 800ms ease-out (tabular-nums), reduced-motion renders final instantly.

**Spec:** §3.4 (look-alike clustering), §5 (verdict copy). Build `#page-decision-lab-result` rendering: score figure ("Right calls"), "Look-alikes you still confuse" (missed scenarios clustered by `pair` display label, "missed ×N"), "Weak service families" (missed `family` labels), and CTAs ("Drill your 3 look-alikes →" primary + "Back to Practice"). `_dlVerdictClusters(results)` aggregates **missed** rounds → pairs + families. Pro persists across sessions (mirror `_slRecordWeakSpots` → `_dlRecordWeakSpots`); free shows the current set only. Exam-style retro-reveals reasoning here (the rounds were graded silently).

**Files:**
- Modify: `features/sim-lab.js` (`_dlVerdictClusters`, `_dlRenderResult`; replace the Task-4/6 stub)
- Modify: `app.js` (`_dlRecordWeakSpots`/`_dlGetWeakSpots` + `STORAGE.DL_WEAK`)
- Modify: `dg-system.css` (`.dl-score-fig`/`.dl-vsec`/`.dl-confrow`/`.dl-weak`; `?v=` bump)
- Test: `tests/e2e/decision-lab.spec.js`

- [ ] **Step 1: Add verdict styles** — in `dg-system.css`, lift the mockup's verdict block into `#page-decision-lab-result`:

```css
#page-decision-lab-result .dl-score-row{display:flex;align-items:baseline;gap:12px;margin-bottom:16px}
#page-decision-lab-result .dl-score-fig{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:52px;line-height:1.05;letter-spacing:-.02em;font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum","tnum";color:var(--text)}
#page-decision-lab-result .dl-score-fig small{font-size:24px;color:var(--text-dim)}
#page-decision-lab-result .dl-score-cap{font:800 11px/1 Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--text-dim)}
#page-decision-lab-result .dl-vsec{border:1px solid var(--border-soft,var(--border));border-radius:12px;padding:13px 15px;margin-top:10px;background:var(--surface3)}
#page-decision-lab-result .dl-vsec-k{font:800 10px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:9px}
#page-decision-lab-result .dl-confrow{display:flex;align-items:center;gap:9px;font:400 13px/1.3 Inter,sans-serif;color:var(--text-mid);padding:6px 0;border-bottom:1px solid var(--border-soft,var(--border))}
#page-decision-lab-result .dl-confrow:last-child{border-bottom:0}
#page-decision-lab-result .dl-confrow .vs{color:var(--text);font-weight:600}
#page-decision-lab-result .dl-confrow .tag{margin-left:auto;font:800 10.5px/1 Inter,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--red)}
#page-decision-lab-result .dl-weak{display:flex;gap:7px;flex-wrap:wrap}
#page-decision-lab-result .dl-weak .w{font:700 12px/1 Inter,sans-serif;color:var(--accent);background:color-mix(in oklab,var(--accent) 10%,transparent);border:1px solid color-mix(in oklab,var(--accent) 26%,var(--border));padding:5px 10px;border-radius:999px}
#page-decision-lab-result .dl-cta-row{display:flex;gap:9px;margin-top:18px}
#page-decision-lab-result .dl-cta-row .btn{flex:1}
```

- [ ] **Step 2: Implement clusters + verdict** — in `features/sim-lab.js`, add (replacing the `_dlRenderResult` stub):

```js
  // Aggregate MISSED rounds into look-alike pairs + weak families (spec §3.4).
  // Both fields are display labels carried on the scenario; absent → no contribution.
  function _dlVerdictClusters(results) {
    var pairs = {}, families = {};
    results.forEach(function (r) {
      if (r.passed) return;
      var scn = r.scenario || {};
      if (scn.pair) pairs[scn.pair] = (pairs[scn.pair] || 0) + 1;
      if (scn.family) families[scn.family] = (families[scn.family] || 0) + 1;
    });
    var pairList = Object.keys(pairs).map(function (k) { return { label: k, count: pairs[k] }; })
      .sort(function (a, b) { return b.count - a.count; });
    var familyList = Object.keys(families).sort(function (a, b) { return families[b] - families[a]; });
    return { pairs: pairList, families: familyList };
  }

  function _dlRenderResult() {
    if (_dlSession && _dlSession.mode === 'exam') _slStopCountdown();
    var agg = _slAggregateSession(_dlSession.results);
    var clusters = _dlVerdictClusters(_dlSession.results);
    var root = document.getElementById('dl-result-root');
    root.innerHTML = '';
    // sbar
    var sbar = _el('div', 'dl-sbar');
    sbar.innerHTML = '<span class="dl-sbar-strip">Decision Lab</span>' +
      '<span class="dl-round-pill">' + (_dlSession.timeUp ? "Time's up" : 'Set complete') + '</span>';
    root.appendChild(sbar);
    // score figure
    var scoreRow = _el('div', 'dl-score-row');
    scoreRow.innerHTML = '<span class="dl-score-fig" data-count="' + agg.passed + '">' + agg.passed +
      '<small>/' + agg.rounds + '</small></span>' +
      '<span><span class="dl-score-cap">Right calls</span></span>';
    root.appendChild(scoreRow);
    // look-alikes
    if (clusters.pairs.length) {
      var vs = _el('div', 'dl-vsec');
      vs.appendChild(_el('div', 'dl-vsec-k', 'Look-alikes you still confuse'));
      clusters.pairs.forEach(function (p) {
        var parts = String(p.label).split(' vs ');
        var row = _el('div', 'dl-confrow');
        row.innerHTML = '<span class="vs">' + _esc(parts[0] || p.label) + '</span>' +
          (parts[1] ? ' vs <span class="vs">' + _esc(parts[1]) + '</span>' : '') +
          '<span class="tag">missed &times;' + p.count + '</span>';
        vs.appendChild(row);
      });
      root.appendChild(vs);
    }
    // weak families
    if (clusters.families.length) {
      var wf = _el('div', 'dl-vsec');
      wf.appendChild(_el('div', 'dl-vsec-k', 'Weak service families'));
      var weak = _el('div', 'dl-weak');
      clusters.families.forEach(function (f) { weak.appendChild(_el('span', 'w', _esc(f))); });
      wf.appendChild(weak);
      root.appendChild(wf);
    }
    // CTAs
    var ctaRow = _el('div', 'dl-cta-row');
    var drill = _el('button', 'btn btn-primary', 'Drill your 3 look-alikes →');
    drill.setAttribute('type', 'button'); drill.setAttribute('data-action', 'decisionLabSessionStart');
    var back = _el('button', 'btn gnt-ghost', 'Back to Practice');
    back.setAttribute('type', 'button'); back.setAttribute('data-action', 'decisionLabExit');
    ctaRow.appendChild(drill); ctaRow.appendChild(back);
    root.appendChild(ctaRow);
    // Pro cross-session persistence of look-alike clusters (free = current set only)
    if (typeof window._dlRecordWeakSpots === 'function') {
      window._dlRecordWeakSpots(clusters.pairs.map(function (p) { return p.label; }));
    }
    // score count-up (reduced-motion → instant; CSS shows final already)
    if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var fig = root.querySelector('.dl-score-fig');
      if (fig) {
        var target = agg.passed, t0 = null;
        var step = function (ts) {
          if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 800);
          fig.firstChild.textContent = Math.round(p * target);
          if (p < 1) requestAnimationFrame(step); else fig.firstChild.textContent = target;
        };
        requestAnimationFrame(step);
      }
    }
    if (typeof showPage === 'function') showPage('decision-lab-result');
  }
```

Expose: `window._simLab.dlVerdictClusters = _dlVerdictClusters; window._simLab.dlRenderResult = _dlRenderResult;`.

- [ ] **Step 3: Add the cross-session persistence helpers** — in `app.js`, after `window._slGetWeakSpots = _slGetWeakSpots;` (line 7074), add (and add the `DL_WEAK` storage key near line 1123):

```js
// Decision Lab Pro cross-session look-alike persistence (mirror _slRecordWeakSpots).
// Free does not persist (the within-set cluster shows to all; persistence is Pro).
function _dlRecordWeakSpots(pairLabels) {
  if (!(_quotaState && (_quotaState.tier === 'pro' || _quotaState.tier === 'admin'))) return;
  try {
    var cur = JSON.parse(localStorage.getItem(STORAGE.DL_WEAK) || '{}');
    (pairLabels || []).forEach(function (p) { if (p) cur[p] = (cur[p] || 0) + 1; });
    localStorage.setItem(STORAGE.DL_WEAK, JSON.stringify(cur));
    if (typeof _cloudFlush === 'function') _cloudFlush(STORAGE.DL_WEAK);
  } catch (_) {}
}
function _dlGetWeakSpots() {
  try { return JSON.parse(localStorage.getItem(STORAGE.DL_WEAK) || '{}'); } catch (_) { return {}; }
}
window._dlRecordWeakSpots = _dlRecordWeakSpots;
window._dlGetWeakSpots = _dlGetWeakSpots;
```

Add to the `STORAGE` object (near line 1123, beside `SIMLAB_WEAK`): `DL_WEAK: 'nplus_dl_weak',  // Decision Lab Pro cross-session look-alike map ({pairLabel: count})`.

- [ ] **Step 4: Write the failing test** — clusters missed pairs/families + Pro persists:

```js
test('dl verdict: clusters missed look-alikes + weak families; Pro persists across sessions', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    const S = window._simLab;
    const results = [
      { passed: false, scenario: { pair: 'Pricing Calculator vs TCO Calculator', family: 'Cost & pricing tools' } },
      { passed: false, scenario: { pair: 'Pricing Calculator vs TCO Calculator', family: 'Cost & pricing tools' } },
      { passed: false, scenario: { pair: 'CloudWatch vs CloudTrail', family: 'Monitoring & logging' } },
      { passed: true,  scenario: { pair: 'IAM vs Resource policy', family: 'Identity' } }
    ];
    const clusters = S.dlVerdictClusters(results);
    // render the verdict from a forged session
    window._quotaState = { tier: 'pro' };
    localStorage.removeItem('nplus_dl_weak');
    // forge a session object the renderer can read
    window.CURRENT_CERT = 'az900';
    const sess = { mode: 'practice', rounds: 4, idx: 4, results: results, timeUp: false };
    // poke the session via the runner's accessor by starting a 0-set then overriding
    window.CERT_PACK = { meta: { name: 'Azure Fundamentals', code: 'AZ-900' } };
    window.DECISION_LAB_SEED_AZ900 = [];
    window.decisionLabOpenEntry();
    window.decisionLabSessionStart();   // empty set → empty state, session exists
    const live = window._simLab.dlSession();
    live.results = results; live.rounds = 4; live.idx = 4;
    window._simLab.dlRenderResult();
    const pairRows = document.querySelectorAll('#dl-result-root .dl-confrow').length;
    const firstTag = document.querySelector('#dl-result-root .dl-confrow .tag').textContent;
    const families = Array.from(document.querySelectorAll('#dl-result-root .dl-weak .w')).map(e => e.textContent);
    const persisted = JSON.parse(localStorage.getItem('nplus_dl_weak') || '{}');
    return {
      topPair: clusters.pairs[0].label, topPairCount: clusters.pairs[0].count,
      pairRows, firstTag, families, persistedCount: persisted['Pricing Calculator vs TCO Calculator']
    };
  });
  expect(r.topPair).toBe('Pricing Calculator vs TCO Calculator');
  expect(r.topPairCount).toBe(2);
  expect(r.pairRows).toBe(2);
  expect(r.firstTag).toContain('missed');
  expect(r.families).toContain('Cost & pricing tools');
  expect(r.families).toContain('Monitoring & logging');
  expect(r.persistedCount).toBe(1);   // Pro persisted the top pair once for this set
});
```

- [ ] **Step 5: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/decision-lab.spec.js -g "dl verdict" --project=chromium --workers=1`

```bash
git add features/sim-lab.js app.js dg-system.css tests/e2e/decision-lab.spec.js
git commit -m "feat(decision-lab): verdict clusters look-alikes + weak families + Pro cross-session persist"
```

---

## Task 9: Free 1/day cap — independent of Sim Lab's counter

**Spec:** §3.6, §4. Decision Lab's free practice cap is **1 set/day**, tracked by its **own** counter (`_dlBumpFreeRun`/`_dlFreeRunsToday`, key `STORAGE.DL_FREE_COUNT`) — independent of Sim Lab's `_bumpPbqFreeRun`. Exam-style + 2nd set + 20-set are Pro-gated (the dispatcher in Task 4 already routes these; this task adds the real counter that the dispatcher calls, and verifies the 2nd-set gate copy).

**Files:**
- Modify: `app.js` (`_dlBumpFreeRun`/`_dlFreeRunsToday` + `STORAGE.DL_FREE_COUNT`)
- Test: `tests/e2e/decision-lab.spec.js`

- [ ] **Step 1: Implement the independent counter** — in `app.js`, after `window.PBQ_FREE_DAILY_CAP = PBQ_FREE_DAILY_CAP;` (line 7057), add (and add `DL_FREE_COUNT` near the `PBQ_FREE_COUNT` storage key, line 1122):

```js
// Decision Lab free daily cap — INDEPENDENT of Sim Lab's PBQ counter (§4).
const DL_FREE_DAILY_CAP = 1;
function _dlFreeRunsToday() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE.DL_FREE_COUNT) || 'null');
    if (raw && raw.date === new Date().toISOString().slice(0, 10)) return raw.count || 0;
  } catch (_) {}
  return 0;
}
function _dlBumpFreeRun() {
  if (!(_quotaState && _quotaState.tier === 'free')) return;   // only free accrues
  try {
    localStorage.setItem(STORAGE.DL_FREE_COUNT, JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      count: _dlFreeRunsToday() + 1
    }));
  } catch (_) {}
}
window._dlFreeRunsToday = _dlFreeRunsToday;
window._dlBumpFreeRun = _dlBumpFreeRun;
window.DL_FREE_DAILY_CAP = DL_FREE_DAILY_CAP;
```

Add to `STORAGE` (line ~1122, beside `PBQ_FREE_COUNT`): `DL_FREE_COUNT: 'nplus_dl_free_count', // Decision Lab free-tier daily set runs ({date, count}) — independent of PBQ_FREE_COUNT`.

- [ ] **Step 2: Write the failing test** — free runs once, 2nd is gated with the exact copy; Sim Lab's counter is untouched:

```js
test('dl free cap: 1 set/day uses _dlBumpFreeRun (not _bumpPbqFreeRun); 2nd set gated', async ({ page }) => {
  await gotoApp(page);
  await installSeedFixture(page, 'DECISION_LAB_SEED_AZ900', 8);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    localStorage.removeItem('nplus_dl_free_count');
    localStorage.removeItem('nplus_pbq_free_count');
    window.CURRENT_CERT = 'az900';
    window.CERT_PACK = { meta: { name: 'Azure Fundamentals', code: 'AZ-900' } };
    const pbqBefore = window._pbqFreeRunsToday();
    window.decisionLabOpenEntry();
    document.querySelector('#dl-decisions .dl-chip[data-decisions="5"]').click();
    window.decisionLabSessionStart();                 // 1st free set → bumps DL counter
    const dlAfterFirst = window._dlFreeRunsToday();
    const pbqAfter = window._pbqFreeRunsToday();        // must stay 0 (independent)
    // 2nd attempt same day → gated with the §4 "that's today's free set" copy
    let gate = 0, gTitle = '';
    window._gateProOnly = (feat, opts) => { gate++; gTitle = opts && opts.title; return false; };
    window.decisionLabOpenEntry();
    window.decisionLabSessionStart();
    return { dlAfterFirst, pbqBefore, pbqAfter, gate, gTitle };
  });
  expect(r.dlAfterFirst).toBe(1);
  expect(r.pbqBefore).toBe(0);
  expect(r.pbqAfter).toBe(0);          // Decision Lab never touches the Sim Lab counter
  expect(r.gate).toBe(1);
  expect(r.gTitle).toBe("That's today's free set");
});
```

- [ ] **Step 3: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/decision-lab.spec.js -g "dl free cap" --project=chromium --workers=1`

```bash
git add app.js tests/e2e/decision-lab.spec.js
git commit -m "feat(decision-lab): independent free 1/day cap (_dlBumpFreeRun, not _bumpPbqFreeRun)"
```

---

## Task 10: #paywall — Decision Lab Pro bullet

**Spec:** §11. Add one Pro bullet to the `.pp-feat` list on `landing/pricing.html` (next to the Sim Lab/Exam bullets, line 518-519).

**Files:**
- Modify: `landing/pricing.html`

- [ ] **Step 1: Add the bullet** — in `landing/pricing.html`, immediately after the "Exam mode" `<li class="pp-feat">` (line 519), add:

```html
          <li class="pp-feat"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span><strong>Decision Lab</strong>: cloud-cert scenario drills with per-distractor reasoning, exam-style timing, and look-alike weak-spots</span></li>
```

- [ ] **Step 2: Verify visually** — `cd landing && python3 -m http.server 4182`, open `localhost:4182/pricing.html`, confirm the new bullet renders in the Pro list with the matching check icon and no color bleed.

- [ ] **Step 3: Commit**

```bash
git add landing/pricing.html
git commit -m "feat(pricing): add Decision Lab Pro bullet"
```

---

## Task 11: Cross-platform e2e + UAT structural pins + no-Sim-Lab-regression + both-theme

**Spec:** §10. Run the Decision Lab suite across all three projects; pin structure in UAT; re-run the FULL sim-lab suite (shared engine); verify both themes.

**Files:**
- Modify: `tests/e2e/decision-lab.spec.js` (cross-cert test)
- Modify: `tests/uat.js` (structural pins)

- [ ] **Step 1: Add a cross-cert test** — proves the runner works on a second Decision Lab cert:

```js
test('dl cross-cert: set builds on sc900 too (registry is per-cert)', async ({ page }) => {
  await gotoApp(page);
  await installSeedFixture(page, 'DECISION_LAB_SEED_SC900', 6);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'sc900';
    window.CERT_PACK = { meta: { name: 'Security, Compliance & Identity', code: 'SC-900' } };
    window.decisionLabOpenEntry();
    document.querySelector('#dl-decisions .dl-chip[data-decisions="5"]').click();
    window.decisionLabSessionStart();
    const sess = window._simLab.dlSession();
    return { rounds: sess.rounds, target: document.getElementById('dl-target').textContent, bank: window._simLab.dlBank('sc900').length };
  });
  expect(r.rounds).toBe(5);
  expect(r.bank).toBe(6);
  expect(r.target).toContain('SC-900');
});
```

- [ ] **Step 2: Run the full Decision Lab suite across all three projects**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && npx playwright test tests/e2e/decision-lab.spec.js --project=chromium --workers=1 && npx playwright test tests/e2e/decision-lab.spec.js --project=webkit --workers=1 && npx playwright test tests/e2e/decision-lab.spec.js --project=mobile-safari --workers=1`
Expected: all green.

- [ ] **Step 3: No-Sim-Lab-regression — re-run the full sim-lab suite (shared engine touched in T1/T2/T6)**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && npx playwright test tests/e2e/sim-lab.spec.js --project=chromium --workers=1`
Expected: all green. Any failure means the `_slBank` refactor (T1), the `_slRenderAnalyze` extension (T2), or the countdown generalization (T6) regressed Sim Lab — fix before proceeding.

- [ ] **Step 4: Add UAT structural pins** — in `tests/uat.js`, after the v7.57 Exam block (closes line 20166), append a new Decision Lab IIFE (mirror the read pattern: `js` = app.js+sim-lab.js, `html` = index.html, plus a local read for dg-system.css/pricing):

```js
// ── v7.59: Decision Lab — structural pins ──
(function(){
  var dgCss = fs.readFileSync(path.join(ROOT, 'dg-system.css'), 'utf8');
  var pricingHtml = fs.readFileSync(path.join(ROOT, 'landing/pricing.html'), 'utf8');
  test('v7.59 Decision Lab: entry + result pages present in index.html',
    html.includes('id="page-decision-lab-entry"') && html.includes('id="page-decision-lab-result"'));
  test('v7.59 Decision Lab: runner page + Home tile present in index.html',
    html.includes('id="page-decision-lab"') && html.includes('id="dl-home-opt"'));
  test('v7.59 Decision Lab: _DL_CERTS allowlist defined (engine + app gate)',
    js.includes("_DL_CERTS = ['az900', 'ai900', 'sc900', 'clfc02']") &&
    js.includes("['az900', 'ai900', 'sc900', 'clfc02']"));
  test('v7.59 Decision Lab: _dlBank + shared _seedBank resolver defined',
    js.includes('function _dlBank(') && js.includes('function _seedBank('));
  test('v7.59 Decision Lab: per-option why render path (_dlGradeAnalyze) defined',
    js.includes('function _dlGradeAnalyze('));
  test('v7.59 Decision Lab: uses _dlBumpFreeRun, not _bumpPbqFreeRun',
    js.includes('function _dlBumpFreeRun(') &&
    !js.replace(/\/\/.*/g, '').match(/_dlSessionStartDispatch[\s\S]{0,1500}window\._bumpPbqFreeRun\(\)/));
  test('v7.59 Decision Lab: exact §4 gate copy present',
    js.includes('Exam-style mode is Pro') &&
    js.includes('The full 20-decision set is Pro') &&
    js.includes("That's today's free set"));
  test('v7.59 Decision Lab: Home tile gated to _DL_CERTS in app.js',
    js.includes('function renderDecisionLabHomeEntry(') && js.includes("_DL_CERTS.indexOf(window.CURRENT_CERT)"));
  test('v7.59 Decision Lab: verdict + sorter markers present in css',
    dgCss.includes('.dl-confrow') && dgCss.includes('.dl-srv-sel') && dgCss.includes('.dl-graded'));
  test('v7.59 Decision Lab: pricing carries the Decision Lab Pro bullet',
    pricingHtml.includes('cloud-cert scenario drills with per-distractor reasoning'));
})();
```

- [ ] **Step 5: Run UAT + tech-debt**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node tests/uat.js && node tests/tech-debt.js`
Expected: UAT all-pass (count grows by the new assertions); tech-debt within limits. If a new Decision Lab function trips the long-function threshold, split it (e.g. `_dlRenderResult` → extract `_dlRenderLookalikes(root, clusters)` + `_dlRenderFamilies(root, clusters)`).

- [ ] **Step 6: Both-theme verification (HARD RULE)** — `python3 -m http.server 3131`; drive a full Decision Lab practice run + an exam-style run + the verdict in the browser, then toggle to light theme (`toggleTheme()`) on the entry, the graded round, the sorter, and the verdict. Confirm the graded correct/wrong tints read on ivory and charcoal, the constraint `<mark>` highlight is legible in both, the amber clock contrast holds in light (the v4.99.63 dark-only-miss lesson), and no chrome uses hardcoded hex. Fix any light-only regressions inline.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/decision-lab.spec.js tests/uat.js
git commit -m "test(decision-lab): cross-platform e2e + UAT structural pins + cross-cert + no-Sim-Lab-regression"
```

---

## Founder real-device pass (required before ship — §8)

Manual checklist (not automated). Walk it on real hardware before sign-off:

- [ ] **iPhone (Safari)** — portrait + landscape: entry toggle + chips tap cleanly (44pt); a practice round grades and the tall graded card (4 `why` lines + teach) scrolls cleanly with the "Next decision" CTA reachable; the sorter tap-to-place + service-selector boundary-shift works by touch.
- [ ] **iPad (Safari)** — portrait (stacked) + landscape (centered): entry, runner, sorter, and verdict layouts hold.
- [ ] **Exam-style background/lock** — start an exam-style set, lock the phone ~30s mid-set, unlock: the clock shows the correct reduced time immediately (deadline-derived). Let the deadline pass while locked, unlock: auto-submits to the verdict with the "Time's up" pill.
- [ ] **Apple IAP gate (§8)** — on a free account, tapping Exam-style, the 20-set, and a 2nd set show the IAP CTA via `_gateProOnly('Decision Lab', …)`, NOT web Stripe.
- [ ] **Both themes on device** — light + dark on entry, graded round, sorter, verdict.

---

## Self-review notes (writing-plans Self-Review)

- **Spec coverage:** shared seed resolver + DL registry + loader + no-regression (T1, spec §3.2) · analyze per-option `why` backward-compatible (T2, §3.3) · entry page + Home tile gated to `_DL_CERTS` + exact gate copy (T3, §3.5/§4/§5) · runner + `_dlSession` reuse via `_slMountScenario` (T4, §3.5/§3.6) · practice grade-reveal with per-option reasoning (T5, §3.6) · exam-style reusing the shipped wall-clock countdown, suppress feedback, time-up auto-submit, retro-reveal (T6, §3.6/§8) · shared-responsibility sorter boundary-shift re-grade (T7, §7) · verdict clusters look-alike pairs + weak families + Pro cross-session persist (T8, §3.4/§5) · independent free 1/day cap (T9, §3.6/§4) · paywall bullet (T10, §11) · cross-platform e2e + UAT pins + no-Sim-Lab-regression + both-theme + founder device pass (T11, §10/§8). Motion §7 referenced at T2/T4/T5/T6/T7/T8. Honesty-first (no "PBQ"/"hands-on") held in copy throughout.
- **Type/name consistency:** `_dlSession` shape `{mode:'practice'|'exam', rounds, idx, pro, cert, scenarios[], results:[{scenario, score, passed, responses}], deadlineMs, budgetMs, clock, amber, view, timeUp, __submitted}` used identically across T4/T5/T6/T8. `_dlBank(cert)`→Array; `_seedBank(registry, cert)`→Array; `_slBank(cert)` delegates. `_dlVerdictClusters(results)`→`{pairs:[{label,count}], families:[label]}`. `_dlGradeAnalyze(host, step, pickedIds)`. `_dlExamBudgetMs(scenarios)`→ms (×1.0, no tightening). Test-API names on `window._simLab`: `slBank`, `dlBank`, `dlCerts`, `dlGradeAnalyze`, `dlGateCopy`, `dlBuildSet`, `dlSession`, `dlExamSubmit`, `dlTick`, `dlVerdictClusters`, `dlRenderResult`; window globals `decisionLabOpenEntry`, `decisionLabEntryBack`, `decisionLabSessionStart`, `decisionLabExit`, `renderDecisionLabHomeEntry`, `startDecisionLabHome`, `_ensureDecisionLabLoaded`, `_dlFreeRunsToday`, `_dlBumpFreeRun`, `_dlRecordWeakSpots`, `_dlGetWeakSpots`.
- **Token consistency:** all CSS uses live `dg-system.css` tokens — `--surface2`/`--surface3`/`--text`/`--text-dim`/`--text-mid`/`--accent`/`--accent-deep`/`--on-accent`/`--green`/`--yellow`/`--red`/`--border`/`--border-soft` — NOT `--surface-2`/`--ink`. The mockup's inline `:root` is reference only. `?v=` bump called out in T2/T3/T4/T5/T6/T8.
- **Reused as-is (not re-implemented):** `simLabScoreScenario`, `_slMountScenario`, `simLabRenderStep`/`_slRenderAnalyze` (extended, not forked), `_slRenderCategorize`, `_slAggregateSession`, `_slStartCountdown`/`_slStopCountdown`/`_slTickClock` (generalized to the active exam session, minimal touch), `_gateProOnly`, `_slIsPro`, `_el`/`_esc`/`_slAttr`. The Sim Lab practice + exam paths are behaviorally untouched; T1/T6 each re-run the full sim-lab suite as the regression guard.
- **Placeholder scan:** every code step shows actual code. Stubs (`_dlSessionStartDispatch`, `_dlStartExamStyle`, `_dlRenderResult`, `_dlExamSubmit`) are introduced as no-ops/minimal in earlier tasks and completed in their own task to keep the build green between commits — each is named with its completing task. The seed banks themselves are explicitly OUT OF SCOPE (separate content track) and tests use an inline fixture.
- **IAP-safe:** every Pro decision (exam-style, 20-set, 2nd-set) routes through `window._gateProOnly('Decision Lab', …)`; zero direct Stripe/checkout calls added.

---

## Session stop

**This session ENDS after this plan is written. Do NOT implement any task.** The build (Tasks 1-11), the `bump-version.js` version + cache bump (target `v7.59.0`, `dg-system.css?v=7.59.0`), and the ship (fast lane per §11 + the founder real-device pass) happen in a later session, executed task-by-task via `superpowers:subagent-driven-development`. The 4 seed banks land separately via the content workflow (author → dual-review → founder-verify) and register cert-by-cert into `_DL_SEED_GLOBALS` + `_DL_SEED_FILES` (both already wired by this plan).
