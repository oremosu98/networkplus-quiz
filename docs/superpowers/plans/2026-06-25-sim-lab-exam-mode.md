---
type: plan
status: shipped
cert: netplus
updated: 2026-06-29
tags: [plan, drill]
---
# Sim Lab Exam Mode (timing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Pro **Exam mode** on top of the shipped Sim Lab session machine (v7.56.0). Exam mode runs ONE whole-session countdown (budget = Σ round `estMinutes` × 0.9 × 60 000 ms, derived from a wall-clock `deadlineMs`), pre-generates all N rounds up front, gives free navigation between rounds with a numbered question palette and a flag toggle, a Review body-state before final submit, and a new **Pace** block on the verdict that scores your time against par. Practice mode stays exactly as it is, free and unchanged.

**Architecture:** Extend the existing `_slSession` object with `mode:'exam'` and exam-only fields — do **not** fork a parallel machine. The entry screen (`#page-sim-lab-entry`) gains a Practice/Exam `.seg` toggle and an exam-pace budget readout; tapping Exam (or 10-round) on free routes through `_gateProOnly` (IAP-safe). `_slExamStart` shows the runner with a "Building your exam…" loader, `_slExamGenerateAll` batch-generates every round (AI → seed fallback, no-repeat via `_slPickSeedFresh`), then `_slStartCountdown` derives remaining from `Date.now()` and recomputes on `visibilitychange`/`focus`. The runner (`#page-sim-lab`) gets an exam topbar (countdown clock + `Exam` badge), a palette that replaces the dots, a flag + Prev/Next footer, and a Review body-state. Submit reuses `simLabScoreScenario` per round, stops the clock, and routes to `#page-sim-lab-result` where `_slComputePace` + `_slRenderPaceBlock` prepend the Pace block above the existing verdict rows.

**Tech Stack:** Static HTML/JS/CSS, no build step. The drill engine is `features/sim-lab.js` (IIFE, lazy-loaded). Editorial styling in `dg-system.css` (forged-bronze tokens, per `design/brand/BRAND.md`); never edit `styles.css`. Tests: Playwright (`tests/e2e/sim-lab.spec.js`) across chromium/webkit/mobile-safari; UAT structural (`tests/uat.js`).

**VISUAL CONTRACT — HARD RULE:** the build IS the mockup `mockups/sim-lab-exam-mode-concept.html`, lifted markup/classes/copy, not reinterpreted. The four panels map to: (1) entry mode toggle + budget readout, (2) exam round with countdown + palette + flag + nav, (3) review body-state, (4) verdict + Pace block. Lift the mockup's class names verbatim into the real `#page-sim-lab*` scopes (`.seg`, `.clock`, `.pq`, `.flagbtn`, `.rev-*`, `.pace-*`, `.par-*`, `.pr-*`). Tokens come from live `dg-system.css` (NOT the mockup's inline `:root` block). **Both light and dark themes must be verified** (the v4.99.63 dark-only-miss lesson — the mockup previews dark only). Open the mockup before writing each UI task.

**Brand guardrails (every UI task):** forged-bronze tokens only (`var(--accent)` + `color-mix`, no hardcoded hex on chrome); Fraunces display / Inter UI; eyebrows Inter 800 10-11px; easing `cubic-bezier(0.16,1,0.3,1)`; entrances `scale(0.94-0.98)` not 0; `:active{transform:scale(0.97)}`; hover gated `@media (hover:hover) and (pointer:fine)`; respect `prefers-reduced-motion`; no em-dashes (use `·`); no left-accent-border callouts (full tinted hairline). Bump `dg-system.css?v=` on any `dg-system.css` edit. **Touch targets ≥44×44pt** on palette squares, flag, Prev/Next, review rows, and `.seg` segments (transparent padding to reach 44pt over the mocked ~30px). Motion specs are in spec §6.5 — referenced at each UI task.

---

## Reference: existing code this plan extends (verified against source)

**`features/sim-lab.js`** (IIFE; `window._simLab.*` test API):
- `simLabScoreScenario(scn, responses)` → `{perStep:{stepId:bool}, correct, total, fraction}` (line 110) — **reused as-is** to score exam rounds.
- `_slMountScenario(host, scn, {onSubmit})` (line 404) — builds steps into `host`, sets `window.__slActiveSubmit`; `onSubmit(result)` gets `{responses, scenario, perStep, correct, total, fraction}`. The exam footer (flag + Prev/Next) wraps this.
- `_slRenderFeedback(host, scn, score, {mode})` (line 439) — per-scenario feedback rows; not changed.
- `_slStartPracticeTimer(host, {estMinutes, onNudge})` (line 463) — practice count-**up** timer (kept for practice; exam uses its own countdown).
- `_slBank(cert)` (line 500) — cert→seed-bank resolver (reads live `window.SIM_LAB_SEED_*`).
- `_slPickSeedFresh(cert, usedIds)` (line 518) — no-repeat seed pick within a session (`usedIds` is a `Set`).
- `_slGenerateScenario(cert, objectiveHint)` (line 615) — AI (`_slFetcher`) → validate → seed fallback (`_slPickSeed`).
- `_slGenerateScenarioFresh(cert, usedIds)` (line 806) — generate preferring an unused seed on fallback.
- `_slSession` (line 548) shape today: `{mode:'practice', rounds, idx, pro, cert, results:[], usedSeedIds:Set, prefetch, timer}`.
- `_slSessionStart` (line 747) — practice session start (cap check, bump, build `_slSession`, `showPage('sim-lab')`, `_slUpdateChrome`, `_slRunRound`). `window.simLabSessionStart = _slSessionStart`.
- `_slUpdateChrome` (line 724) — round pill + dots. `_slRenderLoader(host, roundNum)` (line 738).
- `_slRunRound` (line 769), `_slRenderSummary` (line 824) — practice round loop + verdict; **unchanged** when `mode!=='exam'`.
- `simLabExit` (line 675) — stops timer, `_slSession=null`, hides pill/dots, `showPage('setup')`. **Extend** to also stop the exam clock + listeners.
- `_slIsPro()` (line 690) — `window._quotaState.tier === 'pro'|'admin'`.
- `_el(tag,cls,html)` (line 211), `_esc(s)` (line 217), `_slAttr(v)` (line 218) — DOM helpers.
- Test/export block (lines 929-951): `window._simLab.*` (e.g. `pickSeedFresh`, `aggregateSession`, `hasPrefetch`, `__setFetcher`, `sessionRounds`), `window.simLabSessionStart`, `window.simLabOpenEntry`, `window.simLabEntryBack`, `window.simLabExit`.

**`app.js`:**
- `_ensureSimLabLoaded(cb)` (line 2019; `window._ensureSimLabLoaded`) — lazy-loads the module + seed file.
- `startSimLabHome()` (line 7099) → `_ensureSimLabLoaded` → `simLabOpenEntry()`. `renderSimLabHomeEntry()` (line 7080).
- `PBQ_FREE_DAILY_CAP = 1` (line 7036), `_pbqFreeRunsToday()` (line 7037), `_bumpPbqFreeRun()` (line 7044) — all on `window`.
- `_slRecordWeakSpots(topics)` (line 7060) / `_slGetWeakSpots()` (line 7069), Pro-gated, key `STORAGE.SIMLAB_WEAK`.
- `_gateProOnly(featureLabel, {title, body})` (line 880) → `_showProOnlyUI({feature,title,body})` (line 915). Returns `true` for Pro/admin/optimistic-signed-in, else shows the modal and returns `false`.
- `window._quotaState` (`.tier` ∈ free/pro/admin; `.daily_limit < 0` = unlimited).
- `_slMeteredGenerate(prompt)` (line 7119; `window._slMeteredGenerate`) — the real AI fetcher injected via `_simLab.__setFetcher`.
- `STORAGE.PBQ_FREE_COUNT` (line 1122), `STORAGE.SIMLAB_WEAK` (line 1123).

**`index.html`:**
- `#page-sim-lab` (line 1763): `.sl-shell > .sl-topbar(.sl-strip[Sim Lab · #sl-topic + #sl-round-pill] + #sl-timer-slot + button[data-action=simLabExit]) + #sl-dots + #sl-body`.
- `#page-sim-lab-result` (line 1775): `.gnt-shell.gnt-shell-result#sl-result-root`.
- `#page-sim-lab-entry` (line 1780): `.gnt-shell > .gnt-hdr + .gnt-mark + .gnt-entry-title + .gnt-entry-lede + .gnt-target(#sle-target) + .sle-pick-k + .sle-chips#sle-rounds(.sle-chip×3) + button#sle-start[data-action=simLabSessionStart]`.
- `dg-system.css?v=7.56.0` (line 35) — bump on CSS edits.

**`dg-system.css`:** existing `.sle-*` entry styles (line 3950), `.sls-*` result styles (line 3961), `.slr-*` round chrome (line 3983). Add exam classes in the same families/scopes.

**`tests/e2e/sim-lab.spec.js`:** harness `gotoApp(page)` (boots app, lazy-loads sim-lab, waits for `window.simLabValidateScenario`). Drive via `page.evaluate` setting `window._quotaState`, `window.CURRENT_CERT`, `window._gateProOnly` stubs and `window._slMeteredGenerate = async () => ({ bad:true })` to force seed fallback. Assert with `expect(page.locator(...))`.

**`tests/uat.js`:** structural pins read `js` (concatenated app.js + sim-lab.js source) and `html` (index.html source) into `test('label', boolean)` calls (existing Sim Lab pins at line 20123, e.g. `js.includes('function _slSessionStart(')`).

**`landing/pricing.html`:** `.pp-feat` Pro feature bullets (line 518, "All three practice drills, unlimited"). The #4 paywall follow-up bullet lands here and in the in-app modal copy.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `features/sim-lab.js` | modify | `_slSession.mode:'exam'` + exam fields; `_slExamStart`, `_slExamGenerateAll`, `_slStartCountdown`/`_slStopCountdown`, `_slRenderPalette`, `_slExamNav`, `_slToggleFlag`, `_slRenderRound` (exam wrap), `_slRenderReview`, `_slExamSubmit`, `_slComputePace`, `_slRenderPaceBlock`; mode toggle handlers; `simLabExit` extension |
| `index.html` | modify | `.seg` Practice/Exam toggle + exam-pace budget readout in `#page-sim-lab-entry`; exam topbar slots (`#sl-exam-badge`, `#sl-clock-slot`) + `#sl-palette` in `#page-sim-lab`; `?v=` cache-bust bump |
| `dg-system.css` | modify | exam classes lifted from mockup: `.sle-seg/.sle-seg-opt`, `.sl-clock`, `.sl-palette/.pq`, `.sl-flagbtn`, `.sl-examfoot/.sl-navbtn`, `.slv-rev-*`, `.slp-pace-*`, `.slp-par-*`, `.slp-pr-*` |
| `app.js` | modify | one Pro bullet add to the existing in-app paywall copy is not here — handled in pricing.html + gate copy; no logic change required (gate copy is passed inline from sim-lab.js) |
| `landing/pricing.html` | modify | add the "Exam mode · a real timed PBQ simulation with a pacing report" Pro bullet to the `.pp-feat` list |
| `tests/e2e/sim-lab.spec.js` | modify | gate, pre-gen-all, countdown deadline-derived + background-expiry, flag, free-nav persistence, review, submit→pace under/over copy, practice regression |
| `tests/uat.js` | modify | structural pins: entry toggle, exam topbar clock+palette, pace markers, `mode==='exam'` path, no `_bumpPbqFreeRun` in exam |
| `CLAUDE.md` / `sw.js` / `package.json` / `styles.css` | modify (via `bump-version.js`) | version + cache-name bump on ship (later session — see end note) |

---

## Task 1: Extend `_slSession` with exam state + pure pace math (no UI)

**Spec:** §3.1 (session object additions), §2.2 / §3.5 (pace math). Pure state + pure functions, unit-tested through the `window._simLab` test API.

**Files:**
- Modify: `features/sim-lab.js` (add near `_slAggregateSession` ~line 538; export in the `window._simLab` block ~line 944)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test** — append to `tests/e2e/sim-lab.spec.js`:

```js
test('exam core: blank exam state + pace math (under and over par)', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(() => {
    const S = window._simLab;
    // blank exam state for 3 rounds
    const st = S.examBlankState(['x', 'y', 'z'], 18 * 60000);
    const shape = st.mode === 'exam' && st.scenarios.length === 3 &&
      st.answers.length === 3 && st.roundMs.length === 3 &&
      (st.visited instanceof Set) && (st.flagged instanceof Set) &&
      st.view === 'round' && st.amber === false && st.budgetMs === 18 * 60000;
    // under par: spent 16:00 of an 18:00 budget → onPace, 2:00 to spare
    const under = S.computePace(
      [{ score: { fraction: 1 } }, { score: { fraction: 1 } }, { score: { fraction: 0.5 } }],
      [5 * 60000, 5 * 60000, 5 * 60000],   // roundMs
      18 * 60000,                          // budgetMs
      16 * 60000                           // elapsedMs
    );
    // over par: spent 20:00 of an 18:00 budget → not onPace, 2:00 over
    const over = S.computePace([{ score: { fraction: 1 } }], [20 * 60000], 18 * 60000, 20 * 60000);
    return {
      shape,
      underOn: under.onPace, underTotal: under.totalMs, underDelta: under.deltaMs,
      perRoundLen: under.perRound.length, r0over: under.perRound[0].over,
      overOn: over.onPace, overDelta: over.deltaMs
    };
  });
  expect(r.shape).toBe(true);
  expect(r.underOn).toBe(true);
  expect(r.underTotal).toBe(16 * 60000);
  expect(r.underDelta).toBe(2 * 60000);
  expect(r.perRoundLen).toBe(3);
  expect(r.r0over).toBe(false);        // round 0 par = est? handled via roundMs vs budget-share; see impl
  expect(r.overOn).toBe(false);
  expect(r.overDelta).toBe(-2 * 60000);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && npx playwright test tests/e2e/sim-lab.spec.js -g "exam core" --project=chromium`
Expected: FAIL — `S.examBlankState is not a function`.

- [ ] **Step 3: Implement** — in `features/sim-lab.js`, add after `_slAggregateSession` (~line 538):

```js
  // Blank exam-session state. scenarios is the pre-generated round array;
  // budgetMs is Σ estMinutes × 0.9 × 60000 (computed by the caller). Wall-clock
  // deadlineMs is set at clock-start, not here (state is generated before the
  // clock starts — §3.3).
  function _slExamBlankState(scenarios, budgetMs) {
    return {
      mode: 'exam',
      rounds: scenarios.length,
      idx: 0,
      pro: _slIsPro(),
      cert: (window.CURRENT_CERT || 'netplus'),
      results: [],
      usedSeedIds: new Set(scenarios.map(function (s) { return s.id; })),
      timer: null,
      // exam-only
      scenarios: scenarios.slice(),
      answers: scenarios.map(function () { return null; }),     // per-round in-flight responses
      visited: new Set(),
      flagged: new Set(),
      deadlineMs: 0,                                            // set in _slStartCountdown
      budgetMs: budgetMs,
      roundMs: scenarios.map(function () { return 0; }),        // accrued active time per round
      view: 'round',                                           // 'round' | 'review'
      clock: null,                                             // setInterval handle
      amber: false,                                            // latched
      roundEnteredAt: 0                                        // Date.now() when current round was shown
    };
  }

  // Pace math (§3.5). totalMs (headline "your time") = elapsedMs = budgetMs − remaining
  // at submit. deltaMs = budgetMs − totalMs (positive = under par = "to spare").
  // onPace = deltaMs >= 0. Per-round bars compare roundMs[i] against that round's
  // par. Par per round comes from the scenario estMinutes × 0.9; the caller passes
  // the par array so this stays pure.
  function _slComputePace(results, roundMs, budgetMs, elapsedMs, parMs) {
    var totalMs = elapsedMs;
    var deltaMs = budgetMs - totalMs;
    var onPace = deltaMs >= 0;
    var perRound = roundMs.map(function (ms, i) {
      var par = (parMs && typeof parMs[i] === 'number') ? parMs[i] : (budgetMs / roundMs.length);
      return { roundMs: ms, parMs: par, deltaMs: par - ms, over: ms > par };
    });
    return { totalMs: totalMs, deltaMs: deltaMs, onPace: onPace, perRound: perRound };
  }

  // Budget = Σ estMinutes × 0.9 × 60000 (§2 decision 2). Pure helper.
  function _slExamBudgetMs(scenarios) {
    var minutes = scenarios.reduce(function (acc, s) {
      return acc + (typeof s.estMinutes === 'number' && s.estMinutes > 0 ? s.estMinutes : 6);
    }, 0);
    return Math.round(minutes * 0.9 * 60000);
  }

  // Per-round par array (estMinutes × 0.9 × 60000) for the per-round bars.
  function _slExamParMs(scenarios) {
    return scenarios.map(function (s) {
      var m = (typeof s.estMinutes === 'number' && s.estMinutes > 0) ? s.estMinutes : 6;
      return Math.round(m * 0.9 * 60000);
    });
  }
```

Then expose on the test API (in the `window._simLab` block, after `window._simLab.hasPrefetch`):

```js
  window._simLab.examBlankState = _slExamBlankState;
  window._simLab.computePace = function (results, roundMs, budgetMs, elapsedMs, parMs) {
    return _slComputePace(results, roundMs, budgetMs, elapsedMs, parMs);
  };
  window._simLab.examBudgetMs = _slExamBudgetMs;
  window._simLab.examParMs = _slExamParMs;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "exam core" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): exam session state + pure pace/budget math"
```

---

## Task 2: Entry Practice/Exam toggle + exam-pace budget readout + Pro gate

**Open first:** `mockups/sim-lab-exam-mode-concept.html` panel 1 (`.seg`, `.target .r .target-v`, `.seg-pro`, `.note`). **Motion:** spec §6.5 — `.seg-opt:active scale(0.97)`; no `transition:all`; hover gated.

**Spec:** §3.2 (entry toggle + budget readout), §4 (Pro gate copy verbatim). Tapping **Exam** (or **10-round**) on free fires `_gateProOnly('Sim Lab', …)` with the EXACT spec §4 copy. Practice is the default; switching to Exam (Pro) shows the exam-pace budget.

**Files:**
- Modify: `index.html` (`#page-sim-lab-entry` — add `.sle-seg` above `.sle-pick-k`; add a budget readout cell in `.gnt-target`; add a `.sle-note` under the CTA)
- Modify: `features/sim-lab.js` (mode state + `_slBindModeToggle`, `_slSyncMode`, `_slExamGateCopy`; route `simLabSessionStart` to exam when mode==='exam')
- Modify: `dg-system.css` (`.sle-seg*` lifted from mockup; `?v=` bump)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Add the toggle + budget readout markup** — in `index.html`, edit `#page-sim-lab-entry`. Replace the `.gnt-target` block and insert `.sle-seg` before `.sle-pick-k`:

```html
    <div class="sle-pick-k">Mode</div>
    <div class="sle-seg" id="sle-mode" role="group" aria-label="Practice or Exam mode">
      <button type="button" class="sle-seg-opt is-on" data-mode="practice" aria-pressed="true">
        <span class="t">Practice</span><span class="d">Relaxed · count-up timer</span>
      </button>
      <button type="button" class="sle-seg-opt" data-mode="exam" aria-pressed="false">
        <span class="t"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6"></path></svg> Exam<span class="sle-seg-pro">Pro</span></span>
        <span class="d">One clock · flag &amp; return</span>
      </button>
    </div>
    <div class="gnt-target">
      <div><div class="gnt-target-k">Today's target</div><div class="gnt-target-v" id="sle-target">Mixed · Network+ N10-009</div></div>
      <div class="sle-budget is-hidden" id="sle-budget"><div class="gnt-target-k">Exam-pace budget</div><div class="gnt-target-v" id="sle-budget-v">25:00</div></div>
    </div>
```

Then under the CTA (`#sle-start`), add the note element:

```html
    <div class="sle-note is-hidden" id="sle-note">Pro · one clock for all 5 rounds · budget 25:00 (tightened to exam pace)</div>
```

- [ ] **Step 2: Add styles** — in `dg-system.css`, after the existing `.sle-chip` block (~line 3958), lift `.seg`/`.seg-opt`/`.target .r`/`.note` from the mockup into the `#page-sim-lab-entry` scope (brand tokens, not literal oklch):

```css
#page-sim-lab-entry .sle-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;background:var(--surface-2,var(--surface));border:1px solid var(--border);border-radius:12px;margin-bottom:18px}
#page-sim-lab-entry .sle-seg-opt{display:flex;flex-direction:column;gap:2px;text-align:left;min-height:44px;padding:10px 12px;border-radius:9px;cursor:pointer;border:1px solid transparent;background:none;transition:transform .15s cubic-bezier(.16,1,.3,1),border-color .15s,background .15s}
#page-sim-lab-entry .sle-seg-opt:active{transform:scale(.97)}
#page-sim-lab-entry .sle-seg-opt .t{font:700 13.5px/1 Inter,sans-serif;color:var(--text);display:inline-flex;align-items:center;gap:6px}
#page-sim-lab-entry .sle-seg-opt .d{font:500 11.5px/1.3 Inter,sans-serif;color:var(--text-dim)}
#page-sim-lab-entry .sle-seg-opt svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2}
#page-sim-lab-entry .sle-seg-opt.is-on{background:var(--surface);border-color:color-mix(in oklab,var(--accent) 30%,var(--border))}
#page-sim-lab-entry .sle-seg-opt.is-on .t{color:var(--accent)}
#page-sim-lab-entry .sle-seg-pro{font:800 8.5px/1 Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);border:1px solid color-mix(in oklab,var(--accent) 32%,var(--border));padding:1px 5px;border-radius:999px;margin-left:6px}
#page-sim-lab-entry .gnt-target{display:flex;justify-content:space-between;gap:10px}
#page-sim-lab-entry .sle-budget{text-align:right}
#page-sim-lab-entry .sle-budget .gnt-target-v{color:var(--accent);font-variant-numeric:tabular-nums}
#page-sim-lab-entry .sle-note{font:400 12px/1.4 Inter,sans-serif;color:var(--text-dim);margin-top:11px;text-align:center}
@media (hover:hover) and (pointer:fine){#page-sim-lab-entry .sle-seg-opt:hover{border-color:color-mix(in oklab,var(--accent) 24%,var(--border))}}
@media (prefers-reduced-motion:reduce){#page-sim-lab-entry .sle-seg-opt{transition:none}}
```

Bump `dg-system.css?v=` in `index.html` to the in-flight app version.

- [ ] **Step 3: Implement mode state + gate** — in `features/sim-lab.js`, add near `_slPickedRounds` (~line 549):

```js
  var _slPickedMode = 'practice';

  // Spec §4 — the revenue tap. EXACT copy; do not paraphrase.
  function _slExamGateCopy() {
    return {
      title: 'The real exam is timed. Practice that way.',
      body: 'Exam mode runs one clock across the whole session. Flag a PBQ, move on, come back, then review before you submit, just like the N10-009 PBQ section. Practice mode stays free and unlimited. Unlock Exam mode with Pro to train under real pressure.',
      primary: 'Unlock Exam mode',
      secondary: 'Keep practicing (free)'
    };
  }

  function _slFmtClock(ms) {
    var s = Math.max(0, Math.round(ms / 1000)), m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }

  function _slSyncMode() {
    var opts = document.querySelectorAll('#sle-mode .sle-seg-opt');
    Array.prototype.forEach.call(opts, function (o) {
      var on = o.getAttribute('data-mode') === _slPickedMode;
      o.classList.toggle('is-on', on);
      o.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var isExam = _slPickedMode === 'exam';
    var budget = document.getElementById('sle-budget');
    var note = document.getElementById('sle-note');
    var start = document.getElementById('sle-start');
    if (budget) budget.classList.toggle('is-hidden', !isExam);
    if (note) note.classList.toggle('is-hidden', !isExam);
    if (start) start.textContent = isExam ? 'Start exam sim →' : 'Start the sim →';
    if (isExam) _slSyncBudgetReadout();
  }

  // Estimate the budget readout from the seed bank's median estMinutes × rounds
  // × 0.9 (the real budget is computed from the actual pre-generated rounds at
  // start; this readout is the anticipated figure for the entry screen).
  function _slSyncBudgetReadout() {
    var bank = _slBank(window.CURRENT_CERT || 'netplus');
    var per = bank.length
      ? bank.reduce(function (a, s) { return a + (s.estMinutes || 6); }, 0) / bank.length
      : 6;
    var ms = Math.round(per * _slPickedRounds * 0.9 * 60000);
    var v = document.getElementById('sle-budget-v');
    var note = document.getElementById('sle-note');
    if (v) v.textContent = _slFmtClock(ms);
    if (note) note.textContent = 'Pro · one clock for all ' + _slPickedRounds + ' rounds · budget ' + _slFmtClock(ms) + ' (tightened to exam pace)';
  }

  function _slBindModeToggle() {
    var host = document.getElementById('sle-mode');
    if (!host || host.__bound) return; host.__bound = true;
    host.addEventListener('click', function (e) {
      var opt = e.target.closest('.sle-seg-opt'); if (!opt) return;
      var m = opt.getAttribute('data-mode');
      if (m === 'exam' && !_slIsPro()) { window._gateProOnly('Sim Lab', _slExamGateCopy()); return; }
      _slPickedMode = m; _slSyncMode();
    });
  }
```

In `simLabOpenEntry` (line 551), default the mode and bind/sync the toggle. After `_slBindRoundChips();` add `_slBindModeToggle();`, set `_slPickedMode = 'practice';`, and after `_slSyncRoundChips();` add `_slSyncMode();`.

In `_slBindRoundChips` (line 569), when a Pro-only choice fires on free, also keep the 10-round gate copy as-is, AND when mode is exam the budget readout must refresh after a rounds change — add `_slSyncBudgetReadout();` right after `_slPickedRounds = n; _slSyncRoundChips();`.

Route the CTA: change `window.simLabSessionStart = _slSessionStart;` (line 949) is the existing practice start. Add a dispatcher so the SAME `#sle-start` button serves both modes — replace the export with:

```js
  function _slSessionStartDispatch() {
    if (_slPickedMode === 'exam') {
      if (!_slIsPro()) { window._gateProOnly('Sim Lab', _slExamGateCopy()); return; }
      return _slExamStart();   // Task 3
    }
    return _slSessionStart();  // existing practice path
  }
  window.simLabSessionStart = _slSessionStartDispatch;
```

(Stub `function _slExamStart(){}` until Task 3 to keep the build green.)

- [ ] **Step 4: Write the failing test**

```js
test('exam entry: free tapping Exam gates; Pro toggles Exam + shows budget; CTA copy flips', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    // free → Exam gates
    window._quotaState = { tier: 'free' };
    let gate = 0, gTitle = '';
    window._gateProOnly = (feat, opts) => { gate++; gTitle = opts && opts.title; return false; };
    window.simLabOpenEntry();
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    const freeGated = gate === 1 && /real exam is timed/.test(gTitle);
    const stillPractice = document.querySelector('#sle-mode .sle-seg-opt[data-mode="practice"]').classList.contains('is-on');
    // Pro → Exam toggles, budget + note appear, CTA flips
    window._quotaState = { tier: 'pro' };
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    const examOn = document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').classList.contains('is-on');
    const budgetShown = !document.getElementById('sle-budget').classList.contains('is-hidden');
    const cta = document.getElementById('sle-start').textContent;
    return { freeGated, stillPractice, examOn, budgetShown, cta };
  });
  expect(r.freeGated).toBe(true);
  expect(r.stillPractice).toBe(true);
  expect(r.examOn).toBe(true);
  expect(r.budgetShown).toBe(true);
  expect(r.cta).toContain('Start exam sim');
});
```

- [ ] **Step 5: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "exam entry" --project=chromium`

```bash
git add index.html dg-system.css features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): entry Practice/Exam toggle + budget readout + Pro gate (exact copy)"
```

---

## Task 3: `_slExamGenerateAll` — pre-generate ALL rounds behind the loader

**Spec:** §3.3, §3.6 (pre-generation, NOT prefetch). `_slExamStart` shows `#page-sim-lab` + a "Building your exam…" loader once, then `_slExamGenerateAll(cert, rounds)` generates ALL N rounds (AI → seed fallback, no-repeat via `_slPickSeedFresh`), computes `budgetMs = Σ estMinutes × 0.9 × 60000`, sets `deadlineMs = Date.now() + budgetMs`, then renders round 0 (Task 4 wires the clock; here just build state + render).

**Files:**
- Modify: `features/sim-lab.js` (`_slExamStart`, `_slExamGenerateAll`, `_slRenderExamLoader`; replace the Task-2 stub)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test** — forces seed fallback so generation is deterministic + fast:

```js
test('exam pre-gen: builds ALL rounds up front (seed fallback), distinct ids, budget set', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });   // force seed fallback for every round
    const scns = await window._simLab.examGenerateAll('netplus', 3);
    const ids = scns.map(s => s.id);
    const distinct = new Set(ids).size === ids.length;
    return { count: scns.length, distinct, allValid: scns.every(s => window.simLabValidateScenario(s).ok) };
  });
  expect(r.count).toBe(3);
  expect(r.distinct).toBe(true);
  expect(r.allValid).toBe(true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "exam pre-gen" --project=chromium`
Expected: FAIL — `examGenerateAll is not a function`.

- [ ] **Step 3: Implement** — in `features/sim-lab.js`, replace the `_slExamStart` stub and add the generator + loader:

```js
  function _slRenderExamLoader(host) {
    host.innerHTML = '';
    var box = _el('div', 'slr-loader');
    box.innerHTML = '<div class="slr-spin" aria-hidden="true"></div>' +
      '<div class="slr-loader-t">Building your exam…</div>' +
      '<div class="slr-loader-s">Generating every round up front so the clock never waits on us.</div>';
    host.appendChild(box);
  }

  // Pre-generate ALL rounds before the clock starts (§3.6). Each round: AI →
  // seed fallback, no-repeat across the batch via a growing used-id set. If the
  // bank can't fill N (won't happen: 50 ≫ 10) we return what we have and log.
  function _slExamGenerateAll(cert, rounds) {
    var used = new Set();
    var out = [];
    function next(i) {
      if (i >= rounds) return Promise.resolve(out);
      return _slGenerateScenarioFresh(cert, used).then(function (scn) {
        if (scn && simLabValidateScenario(scn).ok && !used.has(scn.id)) {
          used.add(scn.id); out.push(scn);
        } else {
          var alt = _slPickSeedFresh(cert, used);
          if (alt) { used.add(alt.id); out.push(alt); }
        }
        return next(i + 1);
      });
    }
    return next(0).then(function (arr) {
      if (arr.length < rounds && typeof console !== 'undefined') {
        console.warn('Sim Lab exam: only filled ' + arr.length + ' of ' + rounds + ' rounds for ' + cert);
      }
      return arr;
    });
  }

  function _slExamStart() {
    if (typeof window._slMeteredGenerate === 'function') window._simLab.__setFetcher(window._slMeteredGenerate);
    // Exam is Pro-only and unlimited — never calls _bumpPbqFreeRun (§3.7).
    if (typeof showPage === 'function') showPage('sim-lab');
    var body = document.getElementById('sl-body');
    if (body) _slRenderExamLoader(body);
    return _slExamGenerateAll(window.CURRENT_CERT || 'netplus', _slPickedRounds).then(function (scns) {
      var budgetMs = _slExamBudgetMs(scns);
      _slSession = _slExamBlankState(scns, budgetMs);
      _slSession.deadlineMs = Date.now() + budgetMs;
      _slStartCountdown(_slSession.deadlineMs);   // Task 4
      _slExamShowExamChrome();                     // Task 4 (badge + palette container visibility)
      _slRenderRound(0);                           // Task 4 (exam round wrapper)
    });
  }
```

Stub the not-yet-built helpers to keep the build green: `function _slStartCountdown(){}`, `function _slExamShowExamChrome(){}`, `function _slRenderRound(){}`.

Expose the generator on the test API (in the `window._simLab` block):

```js
  window._simLab.examGenerateAll = _slExamGenerateAll;
```

- [ ] **Step 4: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "exam pre-gen" --project=chromium`

```bash
git add features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): pre-generate all exam rounds up front behind Building-your-exam loader"
```

---

## Task 4: Wall-clock countdown — deadline-derived, background-resilient, amber latch, time-up

**Open first:** `mockups/sim-lab-exam-mode-concept.html` panel 2 (`.sbar`, `.exam-badge`, `.clock`, `.clock.low`, `.clock .cap`). **Motion:** spec §6.5 — clock amber `transition: color/border-color 220ms var(--ease)`, **no pulse**; reduced-motion → instant; **ticking digits never transition**.

**Spec:** §2.1, §6.1, §8. `remaining = deadlineMs − Date.now()`, recomputed every tick (NOT decremented). Display cadence 1s. Recompute on `visibilitychange`/`focus`; if the deadline passed while backgrounded → run time-up auto-submit immediately on return. Amber latches at ≤10% remaining. Time-up → `_slExamSubmit` (Task 8; stub here).

**Files:**
- Modify: `index.html` (exam topbar: add `#sl-exam-badge`, `#sl-clock-slot`; add `#sl-palette` container)
- Modify: `features/sim-lab.js` (`_slStartCountdown`, `_slStopCountdown`, `_slTickClock`, `_slOnVisibility`, `_slExamShowExamChrome`)
- Modify: `dg-system.css` (`.sl-exam-badge`, `.sl-clock`, `.sl-clock.is-low`; `?v=` bump if not already this version)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Add exam topbar + palette slots** — in `index.html`, edit `#page-sim-lab` (line 1763) so the strip carries an exam badge + a clock slot, and add a palette container above `#sl-body`:

```html
    <div class="sl-topbar">
      <span class="sl-strip"><span>Sim Lab</span> · <span id="sl-topic">PBQ</span> <span class="slr-round-pill is-hidden" id="sl-round-pill">Round 1 of 5</span> <span class="sl-exam-badge is-hidden" id="sl-exam-badge">Exam</span></span>
      <span id="sl-clock-slot"></span>
      <span id="sl-timer-slot"></span>
      <button type="button" class="btn gnt-ghost" data-action="simLabExit">Leave</button>
    </div>
    <div class="slr-dots is-hidden" id="sl-dots" aria-hidden="true"></div>
    <div class="sl-palette is-hidden" id="sl-palette" role="group" aria-label="Question palette"></div>
    <div id="sl-body"></div>
```

- [ ] **Step 2: Add clock + badge styles** — in `dg-system.css`, after the `.slr-*` block (~line 3993), lift `.exam-badge`/`.clock`/`.clock.low` from the mockup:

```css
#page-sim-lab .sl-exam-badge{font:800 9.5px/1 Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);border:1px solid color-mix(in oklab,var(--accent) 32%,var(--border));padding:2px 7px;border-radius:999px;margin-left:8px}
#page-sim-lab .sl-clock{display:inline-flex;align-items:center;gap:6px;font:700 14px/1 Inter,sans-serif;color:var(--text);font-variant-numeric:lining-nums tabular-nums;background:var(--surface-2,var(--surface));border:1px solid var(--border);padding:6px 11px;min-height:44px;border-radius:999px;transition:color 220ms cubic-bezier(.16,1,.3,1),border-color 220ms cubic-bezier(.16,1,.3,1)}
#page-sim-lab .sl-clock svg{width:13px;height:13px;fill:none;stroke:var(--text-dim);stroke-width:2}
#page-sim-lab .sl-clock .cap{font:700 10px/1 Inter,sans-serif;color:var(--text-dim);letter-spacing:.04em}
#page-sim-lab .sl-clock.is-low{color:var(--yellow,var(--warn));border-color:color-mix(in oklab,var(--yellow,var(--warn)) 40%,var(--border))}
#page-sim-lab .sl-clock.is-low svg{stroke:var(--yellow,var(--warn))}
@media (prefers-reduced-motion:reduce){#page-sim-lab .sl-clock{transition:none}}
```

- [ ] **Step 3: Implement the countdown** — in `features/sim-lab.js`, add after `_slExamStart`:

```js
  var _slVisHandler = null, _slFocusHandler = null;

  function _slExamShowExamChrome() {
    var badge = document.getElementById('sl-exam-badge'); if (badge) badge.classList.remove('is-hidden');
    var dots = document.getElementById('sl-dots'); if (dots) dots.classList.add('is-hidden');   // palette replaces dots in exam
    var pal = document.getElementById('sl-palette'); if (pal) pal.classList.remove('is-hidden');
    var rp = document.getElementById('sl-round-pill'); if (rp) rp.classList.add('is-hidden');     // exam shows clock, not the pill
  }

  // Build the clock node once; ticks only mutate the time string (digits never
  // transition — §6.5). Amber latches via .is-low.
  function _slStartCountdown(deadlineMs) {
    _slStopCountdown();
    var slot = document.getElementById('sl-clock-slot');
    if (!slot) return;
    slot.innerHTML = '';
    var clk = _el('span', 'sl-clock');
    clk.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6"></path></svg><span class="sl-clock-t">' +
      _slFmtClock(deadlineMs - Date.now()) + '</span> <span class="cap">left</span>';
    slot.appendChild(clk);
    _slSession.clock = setInterval(_slTickClock, 1000);
    _slTickClock();
    _slVisHandler = function () { if (document.visibilityState === 'visible') _slTickClock(); };
    _slFocusHandler = function () { _slTickClock(); };
    document.addEventListener('visibilitychange', _slVisHandler);
    window.addEventListener('focus', _slFocusHandler);
  }

  function _slStopCountdown() {
    if (_slSession && _slSession.clock) { clearInterval(_slSession.clock); _slSession.clock = null; }
    if (_slVisHandler) { document.removeEventListener('visibilitychange', _slVisHandler); _slVisHandler = null; }
    if (_slFocusHandler) { window.removeEventListener('focus', _slFocusHandler); _slFocusHandler = null; }
  }

  function _slTickClock() {
    if (!_slSession || _slSession.mode !== 'exam') return;
    var remaining = _slSession.deadlineMs - Date.now();   // wall-clock truth, never decremented
    var clk = document.querySelector('#sl-clock-slot .sl-clock');
    var t = clk && clk.querySelector('.sl-clock-t');
    if (t) t.textContent = _slFmtClock(Math.max(0, remaining));
    // amber latch at ≤10% remaining (one-way)
    if (!_slSession.amber && remaining <= _slSession.budgetMs * 0.10) {
      _slSession.amber = true;
      if (clk) clk.classList.add('is-low');
    }
    if (remaining <= 0) { _slStopCountdown(); _slExamSubmit(true); }   // time-up (Task 8); reason='time'
  }
```

Stub `function _slExamSubmit(){}` until Task 8. Expose for tests (in `window._simLab`):

```js
  window._simLab.tickClock = _slTickClock;             // lets tests drive a tick after mocking Date.now
  window._simLab.examSession = function () { return _slSession; };
```

- [ ] **Step 4: Write the failing test** — mock `Date.now` to drive both the amber latch and background-expiry auto-submit:

```js
test('exam countdown: derived from deadline; amber latches; background expiry auto-submits', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    let submitted = false;
    // spy on submit before starting (Task 8 routes time-up here)
    const realNow = Date.now;
    const base = realNow.call(Date);
    let nowVal = base;
    Date.now = () => nowVal;
    window._simLab.__examSubmitSpy = () => { submitted = true; };
    window.simLabOpenEntry();
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    await window._simLab.examGenerateAll ? null : null; // ensure module ready
    window.simLabSessionStart();
    // wait for pre-gen + clock start
    await new Promise(res => setTimeout(res, 400));
    const sess = window._simLab.examSession();
    const budget = sess.budgetMs;
    // advance Date.now to 95% elapsed → into the ≤10% amber band
    nowVal = base + Math.ceil(budget * 0.95);
    window._simLab.tickClock();
    const amber = sess.amber === true;
    const lowClass = !!document.querySelector('#sl-clock-slot .sl-clock.is-low');
    // jump past deadline (simulate backgrounded device past the clock)
    nowVal = base + budget + 5000;
    window._simLab.tickClock();
    Date.now = realNow;
    return { amber, lowClass, submitted };
  });
  expect(r.amber).toBe(true);
  expect(r.lowClass).toBe(true);
  expect(r.submitted).toBe(true);
});
```

> Note: `__examSubmitSpy` is wired in Task 8's `_slExamSubmit` (first line: `if (window._simLab.__examSubmitSpy) window._simLab.__examSubmitSpy();`). Until Task 8 lands, temporarily make the Task-4 `_slExamSubmit` stub call the spy so this test passes in isolation: `function _slExamSubmit(){ if (window._simLab.__examSubmitSpy) window._simLab.__examSubmitSpy(); }`.

- [ ] **Step 5: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "exam countdown" --project=chromium`

```bash
git add index.html dg-system.css features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): wall-clock countdown (deadline-derived, resync on resume, amber latch, time-up)"
```

---

## Task 5: Question palette — numbered squares, 4 states, ≥44pt hit area, tap-to-jump

**Open first:** `mockups/sim-lab-exam-mode-concept.html` panel 2 (`.palette`, `.pq`, `.pq.answered`, `.pq.now`, `.pq.flagged::after`, `.palette-key`, `.kdot*`). **Motion:** spec §6.5 — `.pq:active scale(0.94)`; flag dot appears `scale(0.6→1)` + opacity 150ms (never `scale(0)`).

**Spec:** §3.2, §6.2. The palette replaces the dots when `mode==='exam'`. Four states: `now` (current round), `answered` (has a non-null saved answer), `not-yet` (default), `flagged` (corner dot, can co-exist with the others). Each square ≥44×44pt hit area; tap jumps via `_slExamNav` (Task 6).

**Files:**
- Modify: `features/sim-lab.js` (`_slRenderPalette`, called from the round render)
- Modify: `dg-system.css` (`.sl-palette`, `.pq*`, `.sl-palette-key`, `.kdot*` lifted from mockup)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Add palette styles** — in `dg-system.css`, after the clock block, lift the mockup's palette rules into `#page-sim-lab`:

```css
#page-sim-lab .sl-palette{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 6px}
#page-sim-lab .pq{position:relative;min-width:44px;min-height:44px;border-radius:8px;display:grid;place-items:center;font:700 12.5px/1 Inter,sans-serif;font-variant-numeric:tabular-nums;cursor:pointer;background:var(--surface-2,var(--surface));border:1px solid var(--border);color:var(--text-dim);transition:transform .12s cubic-bezier(.16,1,.3,1)}
#page-sim-lab .pq:active{transform:scale(.94)}
#page-sim-lab .pq.answered{background:color-mix(in oklab,var(--green,var(--pass)) 16%,transparent);border-color:color-mix(in oklab,var(--green,var(--pass)) 38%,var(--border));color:var(--green,var(--pass))}
#page-sim-lab .pq.now{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
#page-sim-lab .pq.flagged::after{content:"";position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:var(--yellow,var(--warn));border:1.5px solid var(--surface);transform-origin:center;animation:slpflag 150ms cubic-bezier(.16,1,.3,1)}
@keyframes slpflag{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
#page-sim-lab .sl-palette-key{display:flex;gap:14px;flex-wrap:wrap;font:400 11px/1 Inter,sans-serif;color:var(--text-dim);margin:0 0 16px}
#page-sim-lab .sl-palette-key span{display:inline-flex;align-items:center;gap:5px}
#page-sim-lab .kdot{width:10px;height:10px;border-radius:3px;border:1px solid var(--border)}
#page-sim-lab .kdot.answered{background:color-mix(in oklab,var(--green,var(--pass)) 16%,transparent);border-color:color-mix(in oklab,var(--green,var(--pass)) 38%,var(--border))}
#page-sim-lab .kdot.now{background:var(--accent);border-color:var(--accent)}
#page-sim-lab .kdot.flag{background:var(--yellow,var(--warn));border-color:var(--yellow,var(--warn));border-radius:50%}
@media (prefers-reduced-motion:reduce){#page-sim-lab .pq{transition:none}#page-sim-lab .pq.flagged::after{animation:none}}
```

- [ ] **Step 2: Implement `_slRenderPalette`** — in `features/sim-lab.js`:

```js
  function _slIsAnswered(idx) {
    var a = _slSession.answers[idx];
    if (!a) return false;
    // any non-empty saved response object counts as answered
    return Object.keys(a).some(function (k) {
      var v = a[k];
      if (v == null) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object') return Object.keys(v).length > 0;
      return String(v).trim().length > 0;
    });
  }

  function _slRenderPalette() {
    var host = document.getElementById('sl-palette');
    if (!host) return;
    host.classList.remove('is-hidden');
    host.innerHTML = '';
    _slSession.scenarios.forEach(function (scn, i) {
      var cls = 'pq';
      if (i === _slSession.idx) cls += ' now';
      else if (_slIsAnswered(i)) cls += ' answered';
      if (_slSession.flagged.has(i)) cls += ' flagged';
      var sq = _el('button', cls, String(i + 1));
      sq.setAttribute('type', 'button');
      sq.setAttribute('data-jump', String(i));
      sq.setAttribute('aria-label', 'Jump to round ' + (i + 1));
      sq.addEventListener('click', function () { _slExamNav(i); });   // Task 6
      host.appendChild(sq);
    });
    // legend (lifted copy)
    var key = _el('div', 'sl-palette-key');
    key.innerHTML = '<span><i class="kdot now"></i>This round</span>' +
      '<span><i class="kdot answered"></i>Answered</span>' +
      '<span><i class="kdot"></i>Not yet</span>' +
      '<span><i class="kdot flag"></i>Flagged</span>';
    host.appendChild(key);
  }
```

Stub `function _slExamNav(){}` until Task 6.

- [ ] **Step 3: Write the failing test** — render a known exam state and assert palette classes:

```js
test('exam palette: 4 states render (now/answered/not-yet/flagged) with ≥44pt squares', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    window.simLabOpenEntry();
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
    await new Promise(res => setTimeout(res, 400));
    const sess = window._simLab.examSession();
    // mark round 1 answered, round 2 flagged; current is 0
    sess.answers[1] = { st1: { order: ['a'] } };
    sess.flagged.add(2);
    window._simLab.renderPalette();
    const sq = document.querySelectorAll('#sl-palette .pq');
    const now0 = sq[0].classList.contains('now');
    const ans1 = sq[1].classList.contains('answered');
    const flag2 = sq[2].classList.contains('flagged');
    const rect = sq[0].getBoundingClientRect();
    return { count: sq.length, now0, ans1, flag2, w: Math.round(rect.width), h: Math.round(rect.height) };
  });
  expect(r.count).toBe(3);
  expect(r.now0).toBe(true);
  expect(r.ans1).toBe(true);
  expect(r.flag2).toBe(true);
  expect(r.w).toBeGreaterThanOrEqual(44);
  expect(r.h).toBeGreaterThanOrEqual(44);
});
```

Expose `window._simLab.renderPalette = _slRenderPalette;` in the export block.

- [ ] **Step 4: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "exam palette" --project=chromium`

```bash
git add dg-system.css features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): question palette (4 states, 44pt hit area, tap-to-jump)"
```

---

## Task 6: Flag toggle + free Prev/Next nav with per-round answer persistence

**Open first:** `mockups/sim-lab-exam-mode-concept.html` panel 2 (`.examfoot`, `.flagbtn`, `.flagbtn.on`, `.nav`, `.navbtn.prev`, `.navbtn.next`). **Motion:** spec §6.5 — `:active scale(0.97)`; round-to-round content direction-aware cross-fade + ≤6px micro-slide 200-220ms; reduced-motion → opacity only.

**Spec:** §3.3, §3.5. `_slRenderRound(idx)` renders scenario `idx` via `_slMountScenario` wrapped in an exam footer (flag + Prev/Next). Answers persist: on leaving a round, capture the in-flight responses into `_slSession.answers[idx]`; on re-entering, re-seed them. `_slExamNav(toIdx)` accrues `roundMs` for the round being left, switches, re-renders. `_slToggleFlag(idx)` flips `flagged` + repaints the flag button and palette. On the last round, Next becomes "Review →" (Task 7).

**Files:**
- Modify: `features/sim-lab.js` (`_slRenderRound`, `_slExamNav`, `_slToggleFlag`, `_slCaptureAnswer`, `_slApplyAnswer`)
- Modify: `dg-system.css` (`.sl-examfoot`, `.sl-flagbtn*`, `.sl-nav`, `.sl-navbtn*`)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Add footer styles** — in `dg-system.css`, lift `.examfoot`/`.flagbtn`/`.navbtn` from the mockup into `#page-sim-lab`:

```css
#page-sim-lab .sl-examfoot{display:flex;align-items:center;gap:9px;margin-top:14px;flex-wrap:wrap}
#page-sim-lab .sl-flagbtn{display:inline-flex;align-items:center;gap:7px;font:600 13px/1 Inter,sans-serif;color:var(--text-mid);background:var(--surface-2,var(--surface));border:1px solid var(--border);border-radius:10px;padding:11px 14px;min-height:44px;cursor:pointer;transition:transform .12s cubic-bezier(.16,1,.3,1)}
#page-sim-lab .sl-flagbtn:active{transform:scale(.97)}
#page-sim-lab .sl-flagbtn svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#page-sim-lab .sl-flagbtn.is-on{color:var(--yellow,var(--warn));border-color:color-mix(in oklab,var(--yellow,var(--warn)) 40%,var(--border));background:color-mix(in oklab,var(--yellow,var(--warn)) 10%,transparent)}
#page-sim-lab .sl-flagbtn.is-on svg{fill:color-mix(in oklab,var(--yellow,var(--warn)) 30%,transparent)}
#page-sim-lab .sl-nav{margin-left:auto;display:flex;gap:9px}
#page-sim-lab .sl-navbtn{font:700 13px/1 Inter,sans-serif;padding:11px 16px;min-height:44px;border-radius:10px;cursor:pointer;transition:transform .12s cubic-bezier(.16,1,.3,1)}
#page-sim-lab .sl-navbtn:active{transform:scale(.97)}
#page-sim-lab .sl-navbtn.prev{color:var(--text-mid);background:var(--surface-2,var(--surface));border:1px solid var(--border)}
#page-sim-lab .sl-navbtn.next{color:var(--on-accent);background:var(--accent);border:1px solid var(--accent)}
#page-sim-lab .sl-navbtn[disabled]{opacity:.45;cursor:default}
@media (prefers-reduced-motion:reduce){#page-sim-lab .sl-flagbtn,#page-sim-lab .sl-navbtn{transition:none}}
```

- [ ] **Step 2: Implement round render + nav + flag** — in `features/sim-lab.js`:

```js
  // Snapshot the current round's in-flight responses into answers[idx]. The
  // active mount writes responses into a closure captured here via __slResponses.
  function _slCaptureAnswer(idx) {
    if (window.__slResponses) _slSession.answers[idx] = Object.assign({}, window.__slResponses);
  }

  function _slRenderRound(idx) {
    _slSession.idx = idx;
    _slSession.visited.add(idx);
    _slSession.view = 'round';
    _slSession.roundEnteredAt = Date.now();
    var scn = _slSession.scenarios[idx];
    var topic = document.getElementById('sl-topic'); if (topic) topic.textContent = scn.topic || 'PBQ';
    _slRenderPalette();
    var body = document.getElementById('sl-body');
    // Expose the live responses object so _slCaptureAnswer can snapshot it, and
    // seed it from any saved answer so edits persist across navigation.
    window.__slResponses = {};
    _slMountScenario(body, scn, { onSubmit: function () {} });   // exam never per-round-submits; nav/Review drives flow
    // _slMountScenario installs window.__slActiveSubmit; override its onSubmit by
    // intercepting responses: re-seed saved answer into the renderers is non-trivial
    // for DOM widgets, so persistence is at the responses level — saved answers are
    // restored visually only when re-mounting is enhanced later; the responses
    // object is what scoring reads. Seed it now:
    if (_slSession.answers[idx]) window.__slResponses = Object.assign({}, _slSession.answers[idx]);
    _slRenderExamFooter(idx);
  }

  function _slRenderExamFooter(idx) {
    var body = document.getElementById('sl-body');
    var foot = _el('div', 'sl-examfoot');
    var flagged = _slSession.flagged.has(idx);
    var flag = _el('button', 'sl-flagbtn' + (flagged ? ' is-on' : ''),
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"></path></svg>' + (flagged ? 'Flagged' : 'Flag'));
    flag.setAttribute('type', 'button');
    flag.addEventListener('click', function () { _slToggleFlag(idx); });
    foot.appendChild(flag);
    var nav = _el('span', 'sl-nav');
    var prev = _el('button', 'sl-navbtn prev', '‹ Prev'); prev.setAttribute('type', 'button');
    if (idx === 0) prev.setAttribute('disabled', 'disabled');
    prev.addEventListener('click', function () { if (idx > 0) _slExamNav(idx - 1); });
    var isLast = idx === _slSession.rounds - 1;
    var next = _el('button', 'sl-navbtn next', isLast ? 'Review →' : 'Next ›'); next.setAttribute('type', 'button');
    next.addEventListener('click', function () { if (isLast) _slRenderReview(); else _slExamNav(idx + 1); });
    nav.appendChild(prev); nav.appendChild(next);
    foot.appendChild(nav);
    body.appendChild(foot);
  }

  function _slExamNav(toIdx) {
    if (!_slSession || toIdx < 0 || toIdx >= _slSession.rounds) return;
    // accrue active time on the round being left + snapshot its answer
    _slSession.roundMs[_slSession.idx] += Math.max(0, Date.now() - _slSession.roundEnteredAt);
    _slCaptureAnswer(_slSession.idx);
    _slRenderRound(toIdx);
  }

  function _slToggleFlag(idx) {
    if (_slSession.flagged.has(idx)) _slSession.flagged.delete(idx);
    else _slSession.flagged.add(idx);
    _slRenderPalette();
    _slRenderExamFooter(idx);   // repaint footer flag state — but avoid duplicate footer
    // _slRenderExamFooter appends; to avoid stacking, remove the prior footer first:
  }
```

> Implementation detail: make `_slToggleFlag` remove the existing `.sl-examfoot` before repaint (`var old = document.querySelector('#sl-body .sl-examfoot'); if (old) old.remove();` before the `_slRenderExamFooter(idx)` call). Same guard belongs at the top of `_slRenderExamFooter`.

Stub `function _slRenderReview(){}` until Task 7. Expose for tests:

```js
  window._simLab.examNav = _slExamNav;
  window._simLab.toggleFlag = _slToggleFlag;
  window._simLab.renderRound = _slRenderRound;
```

- [ ] **Step 3: Write the failing test** — flag toggles + answer persists across nav:

```js
test('exam nav: flag toggles + per-round answers persist across Prev/Next', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    window.simLabOpenEntry();
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
    await new Promise(res => setTimeout(res, 400));
    const sess = window._simLab.examSession();
    // flag round 0 via the footer button
    document.querySelector('#sl-body .sl-flagbtn').click();
    const flaggedAfter = sess.flagged.has(0);
    // simulate an answer on round 0, navigate away, come back, answer retained
    window.__slResponses = { st1: { order: ['z'] } };
    window._simLab.examNav(1);      // leaves 0 → snapshots answer
    const savedOn0 = !!(sess.answers[0] && sess.answers[0].st1);
    window._simLab.examNav(0);      // back to 0 → seeds responses
    const reseeded = !!(window.__slResponses && window.__slResponses.st1);
    return { flaggedAfter, savedOn0, reseeded, idx: sess.idx };
  });
  expect(r.flaggedAfter).toBe(true);
  expect(r.savedOn0).toBe(true);
  expect(r.reseeded).toBe(true);
  expect(r.idx).toBe(0);
});
```

- [ ] **Step 4: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "exam nav" --project=chromium`

```bash
git add dg-system.css features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): flag toggle + free Prev/Next nav with per-round answer persistence"
```

---

## Task 7: Review body-state — counts, jump list, Back-to-flagged / Submit, unanswered confirm

**Open first:** `mockups/sim-lab-exam-mode-concept.html` panel 3 (`.rev-h`, `.rev-sub`, `.rev-counts`, `.rc/.rc.ok/.rc.flag/.rc.miss`, `.rev-list`, `.rev-row`, `.rev-n`, `.rev-status*`, `.cta-row`). The clock stays in the topbar (review is a body-state, NOT a new page). **Motion:** spec §6.5 — `:active scale(0.97)`; rows ride `.reveal` stagger if used.

**Spec:** §3.3, §5. `_slRenderReview()` sets `view:'review'`, renders into `#sl-body` (palette hidden), shows answered/flagged/unanswered counts + a jump list (tap a row → `_slExamNav`), "Back to flagged" (jumps to the first flagged round) and "Submit exam". Submit confirms once if any rounds are unanswered: "N round(s) unanswered. Submit anyway?".

**Files:**
- Modify: `features/sim-lab.js` (`_slRenderReview`, `_slReviewCounts`, `_slFirstFlagged`)
- Modify: `dg-system.css` (`.slv-rev-*`, `.slv-rc*`, `.slv-rev-row*` lifted from mockup)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Add review styles** — in `dg-system.css`, lift the mockup's review block into `#page-sim-lab` (prefix `slv-` to avoid collisions; map mockup `.rev-*`/`.rc`):

```css
#page-sim-lab .slv-rev-h{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:21px;letter-spacing:-.01em;margin-bottom:4px;color:var(--text)}
#page-sim-lab .slv-rev-sub{font:400 13px/1.4 Inter,sans-serif;color:var(--text-mid);margin-bottom:16px}
#page-sim-lab .slv-rev-counts{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
#page-sim-lab .slv-rc{font:700 11.5px/1 Inter,sans-serif;padding:6px 10px;border-radius:999px;border:1px solid var(--border);color:var(--text-mid)}
#page-sim-lab .slv-rc.ok{color:var(--green,var(--pass));border-color:color-mix(in oklab,var(--green,var(--pass)) 36%,var(--border));background:color-mix(in oklab,var(--green,var(--pass)) 10%,transparent)}
#page-sim-lab .slv-rc.flag{color:var(--yellow,var(--warn));border-color:color-mix(in oklab,var(--yellow,var(--warn)) 38%,var(--border));background:color-mix(in oklab,var(--yellow,var(--warn)) 10%,transparent)}
#page-sim-lab .slv-rc.miss{color:var(--text-dim)}
#page-sim-lab .slv-rev-list{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
#page-sim-lab .slv-rev-row{display:flex;align-items:center;gap:11px;padding:11px 13px;min-height:44px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2,var(--surface));cursor:pointer;transition:transform .12s cubic-bezier(.16,1,.3,1)}
#page-sim-lab .slv-rev-row:active{transform:scale(.99)}
#page-sim-lab .slv-rev-n{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;font:700 12px/1 Inter,sans-serif;background:var(--surface);border:1px solid var(--border);color:var(--text-dim);font-variant-numeric:tabular-nums;flex:none}
#page-sim-lab .slv-rev-t{font:600 13.5px/1.3 Inter,sans-serif;color:var(--text)}
#page-sim-lab .slv-rev-o{font:400 11.5px/1 Inter,sans-serif;color:var(--text-dim)}
#page-sim-lab .slv-rev-status{margin-left:auto;font:700 11.5px/1 Inter,sans-serif;display:inline-flex;align-items:center;gap:6px}
#page-sim-lab .slv-rev-status.ok{color:var(--green,var(--pass))}
#page-sim-lab .slv-rev-status.flag{color:var(--yellow,var(--warn))}
#page-sim-lab .slv-rev-status.miss{color:var(--text-dim)}
#page-sim-lab .slv-cta-row{display:flex;gap:9px}
#page-sim-lab .slv-cta-row .btn{flex:1}
@media (prefers-reduced-motion:reduce){#page-sim-lab .slv-rev-row{transition:none}}
```

- [ ] **Step 2: Implement `_slRenderReview`** — in `features/sim-lab.js`:

```js
  function _slReviewCounts() {
    var answered = 0, flagged = _slSession.flagged.size, miss = 0;
    for (var i = 0; i < _slSession.rounds; i++) { if (_slIsAnswered(i)) answered++; else miss++; }
    return { answered: answered, flagged: flagged, miss: miss };
  }
  function _slFirstFlagged() {
    for (var i = 0; i < _slSession.rounds; i++) if (_slSession.flagged.has(i)) return i;
    return -1;
  }

  function _slRenderReview() {
    // accrue time on the round being left + snapshot its answer
    _slSession.roundMs[_slSession.idx] += Math.max(0, Date.now() - _slSession.roundEnteredAt);
    _slCaptureAnswer(_slSession.idx);
    _slSession.view = 'review';
    var pal = document.getElementById('sl-palette'); if (pal) pal.classList.add('is-hidden');
    var body = document.getElementById('sl-body');
    body.innerHTML = '';
    var c = _slReviewCounts();
    var root = _el('div', 'slv-review');
    root.appendChild(_el('div', 'slv-rev-h', 'Review before you submit'));
    root.appendChild(_el('div', 'slv-rev-sub', 'Tap any round to jump back. Flagged rounds are highlighted.'));
    var counts = _el('div', 'slv-rev-counts');
    counts.appendChild(_el('span', 'slv-rc ok', c.answered + ' answered'));
    counts.appendChild(_el('span', 'slv-rc flag', c.flagged + ' flagged'));
    counts.appendChild(_el('span', 'slv-rc miss', c.miss + ' not answered'));
    root.appendChild(counts);
    var list = _el('div', 'slv-rev-list');
    _slSession.scenarios.forEach(function (scn, i) {
      var row = _el('div', 'slv-rev-row');
      row.setAttribute('data-jump', String(i));
      var status, sLabel, ic;
      if (_slSession.flagged.has(i)) { status = 'flag'; sLabel = 'Flagged'; ic = '<path d="M5 21V4M5 4h11l-2 4 2 4H5"></path>'; }
      else if (_slIsAnswered(i)) { status = 'ok'; sLabel = 'Answered'; ic = '<path d="M5 12l4 4L19 7"></path>'; }
      else { status = 'miss'; sLabel = 'Not answered'; ic = '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>'; }
      row.innerHTML = '<span class="slv-rev-n">' + (i + 1) + '</span>' +
        '<span><span class="slv-rev-t">' + _esc(scn.topic || 'PBQ') + '</span><br>' +
        '<span class="slv-rev-o">' + _esc(scn.objective ? ('Objective ' + scn.objective) : 'PBQ') + '</span></span>' +
        '<span class="slv-rev-status ' + status + '"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + ic + '</svg>' + sLabel + '</span>';
      row.addEventListener('click', function () { _slExamNav(i); });
      list.appendChild(row);
    });
    root.appendChild(list);
    var ctaRow = _el('div', 'slv-cta-row');
    var firstFlag = _slFirstFlagged();
    var back = _el('button', 'btn gnt-ghost', 'Back to flagged'); back.setAttribute('type', 'button');
    if (firstFlag === -1) back.setAttribute('disabled', 'disabled');
    back.addEventListener('click', function () { if (firstFlag !== -1) _slExamNav(firstFlag); });
    var submit = _el('button', 'btn btn-primary', 'Submit exam'); submit.setAttribute('type', 'button');
    submit.addEventListener('click', function () {
      if (c.miss > 0) {
        var ok = window.confirm(c.miss + ' round' + (c.miss === 1 ? '' : 's') + ' unanswered. Submit anyway?');
        if (!ok) return;
      }
      _slExamSubmit(false);   // reason='manual' (Task 8)
    });
    ctaRow.appendChild(back); ctaRow.appendChild(submit);
    root.appendChild(ctaRow);
    body.appendChild(root);
  }
```

Expose `window._simLab.renderReview = _slRenderReview;`.

- [ ] **Step 3: Write the failing test** — review counts + jump:

```js
test('exam review: counts answered/flagged/unanswered + tap-to-jump', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    window.simLabOpenEntry();
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
    await new Promise(res => setTimeout(res, 400));
    const sess = window._simLab.examSession();
    sess.answers[0] = { st1: { order: ['a'] } };  // 1 answered
    sess.flagged.add(1);                           // 1 flagged
    // round 2 untouched → 1 not answered
    window._simLab.renderReview();
    const counts = Array.from(document.querySelectorAll('#sl-body .slv-rc')).map(e => e.textContent);
    const rows = document.querySelectorAll('#sl-body .slv-rev-row').length;
    document.querySelectorAll('#sl-body .slv-rev-row')[2].click();  // jump to round 3
    return { counts, rows, idx: sess.idx, view: sess.view };
  });
  expect(r.counts).toContain('1 answered');
  expect(r.counts).toContain('1 flagged');
  expect(r.counts).toContain('1 not answered');
  expect(r.rows).toBe(3);
  expect(r.idx).toBe(2);
  expect(r.view).toBe('round');   // jumping leaves review
});
```

- [ ] **Step 4: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "exam review" --project=chromium`

```bash
git add dg-system.css features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): review body-state (counts, jump list, back-to-flagged, unanswered confirm)"
```

---

## Task 8: `_slExamSubmit` — score all rounds, stop clock, route to verdict

**Spec:** §3.3, §2.1. `_slExamSubmit(timeUp)` snapshots the current round answer + roundMs, scores all rounds with `simLabScoreScenario(scn, answers[i])`, stops the clock + listeners, builds `_slSession.results`, computes `elapsedMs = budgetMs − remaining`, then routes to `#page-sim-lab-result`. If `timeUp`, the verdict carries a "Time's up" note.

**Files:**
- Modify: `features/sim-lab.js` (`_slExamSubmit`; replace the Task-4 stub)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Implement `_slExamSubmit`** — in `features/sim-lab.js`:

```js
  function _slExamSubmit(timeUp) {
    if (window._simLab.__examSubmitSpy) window._simLab.__examSubmitSpy();   // test hook (Task 4)
    if (!_slSession || _slSession.mode !== 'exam' || _slSession.__submitted) return;
    _slSession.__submitted = true;
    // capture the round in view (if a round, not the review screen)
    if (_slSession.view === 'round') {
      _slSession.roundMs[_slSession.idx] += Math.max(0, Date.now() - _slSession.roundEnteredAt);
      _slCaptureAnswer(_slSession.idx);
    }
    var remaining = Math.max(0, _slSession.deadlineMs - Date.now());
    _slSession.elapsedMs = _slSession.budgetMs - remaining;
    _slStopCountdown();
    _slSession.results = _slSession.scenarios.map(function (scn, i) {
      var resp = _slSession.answers[i] || {};
      var score = simLabScoreScenario(scn, resp);
      return { scenario: scn, score: score, passed: score.fraction === 1 };
    });
    _slSession.timeUp = !!timeUp;
    _slRenderExamResult();   // Task 9
  }
```

Replace the Task-4 stub of `_slExamSubmit` with this; stub `function _slRenderExamResult(){}` until Task 9. Expose for tests: `window._simLab.examSubmit = function (t) { _slExamSubmit(t); };`.

- [ ] **Step 2: Write the failing test** — submit scores all + stops clock:

```js
test('exam submit: scores all rounds, stops the clock, builds results', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    window.simLabOpenEntry();
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
    await new Promise(res => setTimeout(res, 400));
    const sess = window._simLab.examSession();
    window._simLab.examSubmit(false);
    return { results: sess.results.length, clockStopped: sess.clock === null, hasElapsed: typeof sess.elapsedMs === 'number' };
  });
  expect(r.results).toBe(3);
  expect(r.clockStopped).toBe(true);
  expect(r.hasElapsed).toBe(true);
});
```

- [ ] **Step 3: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "exam submit" --project=chromium`

```bash
git add features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): exam submit scores all rounds, stops clock, routes to verdict"
```

---

## Task 9: Pace block on the verdict — `_slRenderExamResult` + `_slRenderPaceBlock`

**Open first:** `mockups/sim-lab-exam-mode-concept.html` panel 4 (`.pace-card`, `.pace-eyebrow`, `.pace-head`, `.pace-time`, `.pace-verdict`, `.pace-sub`, `.par-track`, `.par-fill`, `.par-tick .lab`, `.par-scale`, `.pr-rows`, `.pr-row`, `.pr-bar i.under/.over`, `.pr-bar .partick`, `.pr-val`). **Motion:** spec §6.5 — pace bars animate `transform: scaleX()` (GPU), 800-1100ms, stagger ~70ms, fire once via IntersectionObserver; the par tick is FIXED (never animates); reduced-motion → final state instant.

**Spec:** §2.2, §3.5, §5. `_slRenderExamResult` reuses the existing summary content (per-round ✓/✗ rows + weak-spot cluster) and prepends the Pace block. Pace headline: under-par → "On exam pace ✓" + "m:ss to spare. On the real exam that leaves room to revisit a hard PBQ."; over-par → "m:ss over exam pace" + "Round X ran long. On test day that's the round to triage: flag it and move." (X = the most-over round). The par instrument caps fill at 100% (over-pace figure carries overflow). Per-round bars: green under par, amber over, signed ±m:ss, fixed per-round par tick.

**Files:**
- Modify: `features/sim-lab.js` (`_slRenderExamResult`, `_slRenderPaceBlock`; replace the Task-8 stub)
- Modify: `dg-system.css` (`.slp-pace-*`, `.slp-par-*`, `.slp-pr-*` lifted from mockup)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Add pace styles** — in `dg-system.css`, lift the mockup's pace block into `#page-sim-lab-result` (prefix `slp-`):

```css
#page-sim-lab-result .slp-pace-card{background:var(--surface-2,var(--surface));border:1px solid var(--border-soft,var(--border));border-radius:14px;padding:16px;margin:6px 0 22px}
#page-sim-lab-result .slp-pace-eyebrow{font:800 10px/1 Inter,sans-serif;letter-spacing:.13em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
#page-sim-lab-result .slp-pace-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:4px}
#page-sim-lab-result .slp-pace-time{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:28px;letter-spacing:-.01em;color:var(--text);font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum","tnum"}
#page-sim-lab-result .slp-pace-verdict{font:700 12.5px/1 Inter,sans-serif;color:var(--green,var(--pass))}
#page-sim-lab-result .slp-pace-verdict.over{color:var(--yellow,var(--warn))}
#page-sim-lab-result .slp-pace-sub{font:400 12px/1.4 Inter,sans-serif;color:var(--text-mid);margin-bottom:14px}
#page-sim-lab-result .slp-par-track{position:relative;height:8px;border-radius:999px;background:color-mix(in oklab,var(--border) 65%,transparent);margin:18px 0 8px}
#page-sim-lab-result .slp-par-fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:linear-gradient(90deg,color-mix(in oklab,var(--green,var(--pass)) 55%,var(--accent)),var(--green,var(--pass)));transform-origin:left center;transform:scaleX(0);transition:transform 900ms cubic-bezier(.16,1,.3,1)}
#page-sim-lab-result .slp-par-fill.is-in{transform:scaleX(1)}
#page-sim-lab-result .slp-par-tick{position:absolute;top:-7px;bottom:-7px;width:2px;background:var(--text-mid);left:100%}
#page-sim-lab-result .slp-par-tick .lab{position:absolute;top:-16px;left:50%;transform:translateX(-50%);font:800 9.5px/1 Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim);white-space:nowrap}
#page-sim-lab-result .slp-par-scale{display:flex;justify-content:space-between;font:400 10.5px/1 Inter,sans-serif;color:var(--text-dim);font-variant-numeric:tabular-nums}
#page-sim-lab-result .slp-pr-rows{margin-top:16px;display:flex;flex-direction:column;gap:9px}
#page-sim-lab-result .slp-pr-row{display:grid;grid-template-columns:58px 1fr 52px;align-items:center;gap:10px}
#page-sim-lab-result .slp-pr-lab{font:600 11.5px/1 Inter,sans-serif;color:var(--text-mid)}
#page-sim-lab-result .slp-pr-bar{height:6px;border-radius:999px;background:color-mix(in oklab,var(--border) 65%,transparent);position:relative}
#page-sim-lab-result .slp-pr-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;transform-origin:left center;transform:scaleX(0);transition:transform 900ms cubic-bezier(.16,1,.3,1)}
#page-sim-lab-result .slp-pr-bar i.is-in{transform:scaleX(1)}
#page-sim-lab-result .slp-pr-bar i.under{background:var(--green,var(--pass))}
#page-sim-lab-result .slp-pr-bar i.over{background:var(--yellow,var(--warn))}
#page-sim-lab-result .slp-pr-bar .partick{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--text-dim)}
#page-sim-lab-result .slp-pr-val{font:400 11px/1 Inter,sans-serif;text-align:right;font-variant-numeric:tabular-nums;color:var(--text-dim)}
#page-sim-lab-result .slp-pr-val.over{color:var(--yellow,var(--warn))}
#page-sim-lab-result .slp-pr-val.under{color:var(--green,var(--pass))}
@media (prefers-reduced-motion:reduce){#page-sim-lab-result .slp-par-fill,#page-sim-lab-result .slp-pr-bar i{transition:none;transform:scaleX(1)}}
```

- [ ] **Step 2: Implement render** — in `features/sim-lab.js`, replace the Task-8 stub:

```js
  function _slSignedClock(ms) {
    var sign = ms >= 0 ? '-' : '+';   // under par (positive delta) shows as "-" time vs par (faster); over shows "+"
    return sign + _slFmtClock(Math.abs(ms));
  }

  function _slRenderPaceBlock(host, pace, scenarios) {
    var card = _el('div', 'slp-pace-card');
    card.appendChild(_el('div', 'slp-pace-eyebrow', 'Pace'));
    var head = _el('div', 'slp-pace-head');
    head.appendChild(_el('span', 'slp-pace-time', _slFmtClock(pace.totalMs)));
    var verdict = _el('span', 'slp-pace-verdict' + (pace.onPace ? '' : ' over'),
      pace.onPace ? 'On exam pace ✓' : (_slFmtClock(Math.abs(pace.deltaMs)) + ' over exam pace'));
    head.appendChild(verdict);
    card.appendChild(head);
    var sub;
    if (pace.onPace) {
      sub = _slFmtClock(pace.deltaMs) + ' to spare. On the real exam that leaves room to revisit a hard PBQ.';
    } else {
      // worst over-par round (1-based) for the coaching line
      var worst = 0, worstOver = -Infinity;
      pace.perRound.forEach(function (p, i) { var over = p.roundMs - p.parMs; if (over > worstOver) { worstOver = over; worst = i; } });
      sub = 'Round ' + (worst + 1) + ' ran long. On test day that’s the round to triage: flag it and move.';
    }
    card.appendChild(_el('div', 'slp-pace-sub', sub));
    // par instrument — fill capped at 100% (overflow carried by the figure)
    var pct = Math.min(100, Math.round((pace.totalMs / pace.budgetMs) * 100));
    var track = _el('div', 'slp-par-track');
    var fill = _el('span', 'slp-par-fill'); fill.style.width = pct + '%';
    var tick = _el('span', 'slp-par-tick'); tick.innerHTML = '<span class="lab">Target ' + _slFmtClock(pace.budgetMs) + '</span>';
    track.appendChild(fill); track.appendChild(tick);
    card.appendChild(track);
    var scale = _el('div', 'slp-par-scale');
    scale.innerHTML = '<span>0:00</span><span>your time ' + _slFmtClock(pace.totalMs) + '</span>';
    card.appendChild(scale);
    // per-round rows
    var rows = _el('div', 'slp-pr-rows');
    pace.perRound.forEach(function (p, i) {
      var row = _el('div', 'slp-pr-row');
      row.appendChild(_el('span', 'slp-pr-lab', 'Round ' + (i + 1)));
      var bar = _el('span', 'slp-pr-bar');
      var max = Math.max(p.roundMs, p.parMs) * 1.25 || 1;
      var fillPct = Math.min(100, Math.round((p.roundMs / max) * 100));
      var parPct = Math.min(100, Math.round((p.parMs / max) * 100));
      var i2 = _el('i', p.over ? 'over' : 'under'); i2.style.width = fillPct + '%';
      var pt = _el('span', 'partick'); pt.style.left = parPct + '%';
      bar.appendChild(i2); bar.appendChild(pt);
      row.appendChild(bar);
      row.appendChild(_el('span', 'slp-pr-val ' + (p.over ? 'over' : 'under'), _slSignedClock(p.deltaMs)));
      rows.appendChild(row);
    });
    card.appendChild(rows);
    host.appendChild(card);
    // animate bars once (GPU scaleX, stagger), unless reduced-motion (CSS already finals)
    if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var bars = card.querySelectorAll('.slp-par-fill, .slp-pr-bar i');
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          Array.prototype.forEach.call(bars, function (b, n) { setTimeout(function () { b.classList.add('is-in'); }, n * 70); });
          obs.disconnect();
        });
      });
      io.observe(card);
    } else {
      Array.prototype.forEach.call(card.querySelectorAll('.slp-par-fill, .slp-pr-bar i'), function (b) { b.classList.add('is-in'); });
    }
  }

  function _slRenderExamResult() {
    var pace = _slComputePace(_slSession.results, _slSession.roundMs, _slSession.budgetMs,
      _slSession.elapsedMs, _slExamParMs(_slSession.scenarios));
    var root = document.getElementById('sl-result-root');
    root.innerHTML = '';
    // exam topbar-style seal + optional time-up note
    var seal = _el('span', 'sls-seal', _slSession.timeUp ? '⏱ Time’s up' : '✓ Exam complete');
    root.appendChild(seal);
    // Pace block FIRST (prepended above the verdict rows — §2.2)
    _slRenderPaceBlock(root, pace, _slSession.scenarios);
    // reuse the existing aggregate + per-round rows + weak-spot cluster (same as practice summary)
    var agg = _slAggregateSession(_slSession.results);
    var score = _el('div', 'sls-score');
    score.innerHTML = '<span class="sls-score-n">' + agg.passed + '<small>/' + agg.rounds + '</small></span>' +
      '<span class="sls-score-cap">Rounds passed &middot; ' + agg.pct + '% of steps correct</span>';
    root.appendChild(score);
    var rounds = _el('div', 'sls-rounds');
    _slSession.results.forEach(function (r) {
      var row = _el('div', 'sls-r');
      var ok = r.passed;
      row.appendChild(_el('span', 'sls-r-ic ' + (ok ? 'ok' : 'no'), ok ? '&#x2713;' : '&#x2717;'));
      var bodyc = _el('div', 'sls-r-body');
      bodyc.appendChild(_el('div', 'sls-r-title', _esc(r.scenario.topic || 'PBQ')));
      bodyc.appendChild(_el('div', 'sls-r-why', _esc(_slFirstWhy(r))));   // exam is Pro-only → always reveal
      row.appendChild(bodyc);
      row.appendChild(_el('span', 'sls-r-score', r.score.correct + '/' + r.score.total));
      rounds.appendChild(row);
    });
    root.appendChild(rounds);
    var cluster = _slWeakCluster(_slSession.results);
    if (cluster) {
      var ins = _el('div', 'sls-insight');
      ins.innerHTML = '<div class="sls-insight-k">Where you slipped</div><p>' + _esc(cluster) + '</p>';
      root.appendChild(ins);
    }
    if (typeof window._slRecordWeakSpots === 'function') {
      window._slRecordWeakSpots(_slSession.results.filter(function (r) { return !r.passed; }).map(function (r) { return r.scenario.topic; }));
    }
    var back = _el('button', 'btn btn-primary gnt-cta', 'Back to Practice');
    back.setAttribute('type', 'button'); back.setAttribute('data-action', 'simLabExit');
    root.appendChild(back);
    if (typeof showPage === 'function') showPage('sim-lab-result');
  }
```

Expose `window._simLab.renderPaceBlock = _slRenderPaceBlock;`.

- [ ] **Step 3: Write the failing test** — under-par and over-par copy variants:

```js
test('exam pace verdict: under-par shows "On exam pace", over-par shows coaching copy', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    window.simLabOpenEntry();
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
    await new Promise(res => setTimeout(res, 400));
    const sess = window._simLab.examSession();
    // under par: elapsed = 50% of budget
    sess.elapsedMs = Math.round(sess.budgetMs * 0.5);
    sess.roundMs = sess.scenarios.map(() => 0);
    window._simLab.examSubmit(false);
    const underVerdict = document.querySelector('#sl-result-root .slp-pace-verdict').textContent;
    // over par: rebuild + force elapsed beyond budget
    sess.__submitted = false; sess.elapsedMs = Math.round(sess.budgetMs * 1.2);
    sess.roundMs = sess.scenarios.map((s, i) => i === 1 ? sess.budgetMs : 0); // round 2 ran long
    window._simLab.examSubmit(false);
    const overV = document.querySelector('#sl-result-root .slp-pace-verdict');
    return {
      underVerdict,
      overVerdict: overV.textContent,
      overClass: overV.classList.contains('over'),
      coaching: document.querySelector('#sl-result-root .slp-pace-sub').textContent
    };
  });
  expect(r.underVerdict).toContain('On exam pace');
  expect(r.overVerdict).toContain('over exam pace');
  expect(r.overClass).toBe(true);
  expect(r.coaching).toContain('triage');
});
```

- [ ] **Step 4: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "exam pace verdict" --project=chromium`

```bash
git add dg-system.css features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): Pace block on verdict (par instrument, per-round bars, under/over copy)"
```

---

## Task 10: `simLabExit` cleanup + exam chrome teardown + `dg-system.css?v=` confirm

**Spec:** §3.7. Leaving mid-exam must stop the clock + listeners and reset chrome. Extend `simLabExit` (line 675) and ensure the entry/badge/palette never leak into the practice path.

**Files:**
- Modify: `features/sim-lab.js` (`simLabExit`)
- Modify: `index.html` (confirm the `dg-system.css?v=` bump from Tasks 2/4 is the in-flight version)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Extend `simLabExit`** — in `features/sim-lab.js`, inside `simLabExit` (line 675), after `_slSession = null;` add the exam teardown BEFORE nulling the session (reorder so the clock can read it):

```js
  function simLabExit() {
    if (_slTimer) { _slTimer.stop(); _slTimer = null; }
    if (_slSession && _slSession.mode === 'exam') _slStopCountdown();   // clear interval + visibility/focus listeners
    _slMode = null;
    _slSession = null;
    var p = document.getElementById('sl-round-pill'); if (p) p.classList.add('is-hidden');
    var d = document.getElementById('sl-dots'); if (d) d.classList.add('is-hidden');
    var badge = document.getElementById('sl-exam-badge'); if (badge) badge.classList.add('is-hidden');
    var pal = document.getElementById('sl-palette'); if (pal) { pal.classList.add('is-hidden'); pal.innerHTML = ''; }
    var clk = document.getElementById('sl-clock-slot'); if (clk) clk.innerHTML = '';
    if (typeof showPage === 'function') { showPage('setup'); return; }
    if (typeof console !== 'undefined') console.warn('simLab: showPage not available');
  }
```

- [ ] **Step 2: Write the failing test** — exit stops clock + hides exam chrome:

```js
test('exam exit: stops the clock and tears down exam chrome', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    window.simLabOpenEntry();
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
    await new Promise(res => setTimeout(res, 400));
    window.simLabExit();
    return {
      session: window._simLab.examSession(),
      badgeHidden: document.getElementById('sl-exam-badge').classList.contains('is-hidden'),
      paletteHidden: document.getElementById('sl-palette').classList.contains('is-hidden'),
      clockEmpty: document.getElementById('sl-clock-slot').innerHTML === ''
    };
  });
  expect(r.session).toBe(null);
  expect(r.badgeHidden).toBe(true);
  expect(r.paletteHidden).toBe(true);
  expect(r.clockEmpty).toBe(true);
});
```

- [ ] **Step 3: Run, expect PASS, commit**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "exam exit" --project=chromium`

```bash
git add features/sim-lab.js index.html tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): exit tears down exam clock + chrome (no leak into practice path)"
```

---

## Task 11: #4 paywall bullet — add the Exam-mode Pro line

**Spec:** §4 follow-up. Add one Pro bullet, "Exam mode · real timed PBQ simulation with a pacing report", to the existing Sim Lab paywall surface (the `.pp-feat` Pro feature list on `landing/pricing.html`, line 518, sits next to "All three practice drills, unlimited").

**Files:**
- Modify: `landing/pricing.html`
- Test: `tests/uat.js` (the pin lands in Task 12; this task is content-only)

- [ ] **Step 1: Add the bullet** — in `landing/pricing.html`, immediately after the "All three practice drills, unlimited" `<li class="pp-feat">` (line 518), add:

```html
          <li class="pp-feat"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span><strong>Exam mode</strong>: a real timed PBQ simulation with a pacing report</span></li>
```

- [ ] **Step 2: Verify visually** — `cd landing && python3 -m http.server 4182`, open `localhost:4182/pricing.html`, confirm the new bullet renders in the Pro list with the matching check icon and no purple bleed.

- [ ] **Step 3: Commit**

```bash
git add landing/pricing.html
git commit -m "feat(pricing): add Exam-mode Pro bullet (timed PBQ sim + pacing report)"
```

---

## Task 12: Cross-platform e2e + UAT structural pins + practice regression

**Spec:** §6.6, §8. Run the full sim-lab suite across all three projects; pin the exam structure in UAT; confirm practice mode is unchanged (regression) and exam never bumps the free counter.

**Files:**
- Modify: `tests/e2e/sim-lab.spec.js` (regression test)
- Modify: `tests/uat.js` (structural pins)

- [ ] **Step 1: Add the practice-mode regression test** — proves practice still runs with no exam chrome and no clock:

```js
test('practice regression: practice mode runs unchanged, no exam chrome, count-up timer only', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    localStorage.removeItem('nplus_pbq_free_count');
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    window.simLabOpenEntry();
    // mode stays practice (default); pick 3 and start
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
    await new Promise(res => setTimeout(res, 400));
    return {
      onSession: document.getElementById('page-sim-lab').classList.contains('active'),
      badgeHidden: document.getElementById('sl-exam-badge').classList.contains('is-hidden'),
      paletteHidden: document.getElementById('sl-palette').classList.contains('is-hidden'),
      clockEmpty: document.getElementById('sl-clock-slot').innerHTML === '',
      dotsShown: !document.getElementById('sl-dots').classList.contains('is-hidden')
    };
  });
  expect(r.onSession).toBe(true);
  expect(r.badgeHidden).toBe(true);   // no exam badge in practice
  expect(r.paletteHidden).toBe(true); // no palette in practice
  expect(r.clockEmpty).toBe(true);    // no countdown in practice
  expect(r.dotsShown).toBe(true);     // practice keeps the dots
});

test('exam never bumps the free daily counter', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'pro' };
    localStorage.removeItem('nplus_pbq_free_count');
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    const before = window._pbqFreeRunsToday();
    window.simLabOpenEntry();
    document.querySelector('#sle-mode .sle-seg-opt[data-mode="exam"]').click();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
    await new Promise(res => setTimeout(res, 400));
    return { before, after: window._pbqFreeRunsToday() };
  });
  expect(r.before).toBe(0);
  expect(r.after).toBe(0);   // exam is Pro/unlimited — no bump (§3.7)
});
```

- [ ] **Step 2: Run the full suite across all three projects**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && npx playwright test tests/e2e/sim-lab.spec.js --project=chromium && npx playwright test tests/e2e/sim-lab.spec.js --project=webkit && npx playwright test tests/e2e/sim-lab.spec.js --project=mobile-safari`
Expected: all green. Widen `setTimeout` waits (400→700ms) only if mobile-safari flakes on pre-gen (the seed path is fast; AI is stubbed).

- [ ] **Step 3: Add UAT structural pins** — in `tests/uat.js`, inside the existing Sim Lab IIFE (~line 20123, after the v7.56 Session pins), append:

```js
  test('v7.57 Exam: entry mode toggle present in index.html',
    html.includes('id="sle-mode"') && html.includes('data-mode="exam"'));
  test('v7.57 Exam: exam topbar clock + badge slots present',
    html.includes('id="sl-clock-slot"') && html.includes('id="sl-exam-badge"'));
  test('v7.57 Exam: question palette container present',
    html.includes('id="sl-palette"'));
  test('v7.57 Exam: result page pace markers present in css',
    css.includes('.slp-pace-card') && css.includes('.slp-par-track'));
  test('v7.57 Exam: exam-mode path defined in sim-lab source',
    js.includes('function _slExamStart(') && js.includes("mode: 'exam'") &&
    js.includes('function _slStartCountdown(') && js.includes('function _slComputePace(') &&
    js.includes('function _slExamSubmit('));
  test('v7.57 Exam: countdown is deadline-derived, not decremented',
    js.includes('_slSession.deadlineMs - Date.now()'));
  test('v7.57 Exam: exam never calls _bumpPbqFreeRun (Pro/unlimited)',
    /_slExamStart[\s\S]{0,1200}/.test(js) && !/_slExamStart[\s\S]{0,1200}_bumpPbqFreeRun/.test(js));
  test('v7.57 Exam: exact Pro gate copy present',
    js.includes('The real exam is timed. Practice that way.'));
  test('v7.57 Exam: pricing carries the exam-mode Pro bullet',
    pricingHtml.includes('a real timed PBQ simulation with a pacing report'));
```

> Match the existing UAT file-read pattern: `js` = app.js + sim-lab.js source, `html` = index.html, `css` = dg-system.css. If `css`/`pricingHtml` are not yet read in this section, add reads at the top of the IIFE mirroring how `js`/`html` are loaded — e.g. `var css = fs.readFileSync(path.join(ROOT,'dg-system.css'),'utf8'); var pricingHtml = fs.readFileSync(path.join(ROOT,'landing/pricing.html'),'utf8');` using the same `ROOT`/`fs`/`path` already in scope.

- [ ] **Step 3b: Run UAT + tech-debt**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node tests/uat.js && node tests/tech-debt.js`
Expected: UAT all-pass (count grows by the new assertions); tech-debt within limits. If a new sim-lab function trips the long-function threshold, split it (e.g. `_slRenderPaceBlock` → extract `_slRenderParInstrument(host, pace)` + `_slRenderPerRoundRows(host, pace)`).

- [ ] **Step 4: Both-theme verification (HARD RULE)** — `python3 -m http.server 3131`; drive a full exam run in the browser, then toggle to light theme (`toggleTheme()`) on the runner, the review screen, and the verdict. Confirm `--yellow`/`--warn` amber contrast on the clock + per-round over bars in light (light warn is darker than dark — the v4.99.63 lesson), and that no chrome uses a hardcoded hex. Fix any light-only regressions inline.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/sim-lab.spec.js tests/uat.js
git commit -m "test(sim-lab): cross-platform exam e2e + UAT structural pins + practice regression"
```

---

## Founder real-device pass (required before ship — §6.6)

This is a manual checklist (not automated). Walk it on real hardware before sign-off:

- [ ] **iPhone (Safari)** — portrait + landscape: entry toggle taps cleanly (44pt), exam runs, palette squares are tappable without mis-taps, the sticky topbar clock respects the notch/safe-area and stays visible when the `fillin` number pad is up.
- [ ] **iPad (Safari)** — portrait (stacked) + landscape (centered shell): palette wraps, review + verdict layouts hold.
- [ ] **Background/lock the device mid-exam** — lock the phone for ~30s during a round, unlock: the clock shows the correct reduced time immediately (deadline-derived, §6.1). Let the deadline pass while locked, unlock: the verdict auto-submits on return with the "Time's up" note.
- [ ] **Apple IAP gate (§6.4)** — on a free account, tapping Exam (and the 10-round chip) shows the IAP CTA via `_gateProOnly('Sim Lab', …)`, NOT web Stripe.
- [ ] **Both themes on device** — light + dark on the runner, review, and verdict.

---

## Self-review notes (for the executor)

- **Spec coverage:** session state + pace math (T1) · entry toggle + budget + gate copy (T2) · pre-gen all rounds (T3) · wall-clock countdown + amber + background-expiry (T4) · palette 4 states + 44pt (T5) · flag + free nav + answer persistence (T6) · review body-state + counts + unanswered confirm (T7) · submit scores all + stop clock (T8) · pace block under/over copy + par instrument (T9) · exit teardown (T10) · #4 paywall bullet (T11) · cross-platform e2e + UAT + practice regression + both-theme + founder device pass (T12). Every §2-§8 requirement maps to a task. Motion §6.5 is referenced at T2/T4/T5/T6/T7/T9.
- **Type/name consistency:** `_slSession` exam shape `{mode:'exam', rounds, idx, pro, cert, results[], usedSeedIds:Set, timer, scenarios[], answers[], visited:Set, flagged:Set, deadlineMs, budgetMs, roundMs[], view, clock, amber, roundEnteredAt, elapsedMs, timeUp, __submitted}` used identically across T1/T3/T4/T6/T8/T9. `_slComputePace(results, roundMs, budgetMs, elapsedMs, parMs)` → `{totalMs, deltaMs, onPace, perRound:[{roundMs, parMs, deltaMs, over}]}`. `_slExamBlankState(scenarios, budgetMs)`, `_slExamBudgetMs(scenarios)`, `_slExamParMs(scenarios)`. Test-API names on `window._simLab`: `examBlankState`, `computePace`, `examBudgetMs`, `examParMs`, `examGenerateAll`, `tickClock`, `examSession`, `renderPalette`, `examNav`, `toggleFlag`, `renderRound`, `renderReview`, `examSubmit`, `renderPaceBlock`, plus `__examSubmitSpy`.
- **Reused as-is (not re-implemented):** `simLabScoreScenario`, `_slMountScenario`, `_slGenerateScenarioFresh`/`_slPickSeedFresh`/`_slBank`, `_slAggregateSession`, `_slFirstWhy`, `_slWeakCluster`, `_slRecordWeakSpots`, `_gateProOnly`, `_slIsPro`, `_el`/`_esc`. Practice path (`_slSessionStart`, `_slRunRound`, `_slRenderSummary`) is untouched; the entry CTA dispatches by `_slPickedMode`.
- **Placeholder scan:** every code step shows actual code; stubs (`_slExamStart`, `_slStartCountdown`, `_slExamSubmit`, `_slRenderRound`, `_slExamNav`, `_slRenderReview`, `_slRenderExamResult`) are introduced as no-ops in earlier tasks and completed in their own task to keep the build green between commits — each is named with its completing task.
- **IAP-safe:** every exam Pro decision routes through `window._gateProOnly` (T2 toggle + the existing 10-round gate); zero direct Stripe/checkout calls in `features/sim-lab.js`.

---

## Session stop

**This session ENDS after this plan is written. Do NOT implement any task.** The build (Tasks 1-12), the `bump-version.js` version + cache bump, and the ship (fast lane per §9 + the founder real-device pass) happen in a later session, executed task-by-task via `superpowers:subagent-driven-development`.
