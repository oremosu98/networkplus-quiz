---
type: plan
status: shipped
cert: netplus
updated: 2026-06-29
tags: [plan, drill]
---
# Sim Lab Session Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Sim Lab from a single one-and-done PBQ into a chooseable multi-round *session* (free picks 3/5, one session a day; Pro unlimited + 10-round exam-length + cross-session weak-spot tracking), with a seamless drill entry screen, instant loading feedback + round prefetch, an end-of-session verdict summary, and a dedicated landing section.

**Architecture:** A `_slSession` object drives a round loop that reuses the existing scenario generator, step renderers, and scorer. The Home tile opens a new `gnt-shell` entry screen (rounds picker); Start runs rounds back-to-back with a loader and round-N+1 prefetch; the run ends on a new verdict page. Daily-free is reframed from per-scenario to per-session. All UI is lifted verbatim-intent from the approved concept mockups.

**Tech Stack:** Static HTML/JS/CSS, no build step. Editorial styling in `dg-system.css` (forged-bronze, per `design/brand/BRAND.md`); never edit `styles.css`. Tests: Playwright (`tests/e2e/sim-lab.spec.js`) across chromium/webkit/mobile-safari; node validation harness; UAT structural (`tests/uat.js`).

**VISUAL CONTRACT — HARD RULE:** the build IS these mockups, lifted not reinterpreted:
- `mockups/sim-lab-session-2-flow-concept.html` — entry + rounds picker (panel 1), in-session round chrome (panel 2), between-rounds loader (panel 3)
- `mockups/sim-lab-session-3-summary-concept.html` — verdict summary
- `mockups/sim-lab-session-4-landing-concept.html` — landing section

Lift layout, spacing, copy, and motion intent from these into the real app classes (`gnt-*`, `sl-*`). Do not redesign. Open each mockup before writing its task.

**Brand guardrails (every UI task):** forged-bronze tokens only (no purple, no hardcoded hex on chrome — use `var(--accent)` + `color-mix`); Fraunces display / Inter UI; eyebrows Inter 800 10-11px; easing `cubic-bezier(0.16,1,0.3,1)`; entrances `scale(0.96-0.98)` not 0; `:active{transform:scale(0.97)}`; hover gated `@media (hover:hover) and (pointer:fine)`; respect `prefers-reduced-motion`; no em-dashes (use `·`); no left-accent-border callouts (full tinted hairline). Bump `dg-system.css?v=` query on any dg-system.css edit.

---

## Reference: existing code this plan reuses

**`features/sim-lab.js`** (IIFE; lazy-loaded with the seed file via `_ensureSimLabLoaded`):
- `simLabValidateScenario(s)` → `{ok, errors}` · `simLabScoreScenario(scn, responses)` → `{perStep:{stepId:bool}, correct, total, fraction}`
- `simLabRenderStep(step, onChange)` → DOM (the 5 renderers + per-gesture `_slBindMovable`)
- `_slMountScenario(host, scn, {onSubmit})` — builds steps into `host`, exposes `window.__slActiveSubmit`; `onSubmit(result)` gets `{responses, scenario, perStep, correct, total, fraction}`
- `_slRenderFeedback(host, scn, score, {mode})` — per-scenario feedback rows (`mode:'free'|'pro'`)
- `_slStartPracticeTimer(host, {estMinutes, onNudge})` → `{stop(), elapsedMs()}`
- `_slGenerateScenario(cert, objectiveHint)` → `Promise<scenario>` (AI via `_slFetcher`, validate, else seed fallback)
- `_slPickSeed(cert)` — minute-rotation seed pick (will gain a no-repeat sibling)
- `simLabStart(opts)`, `simLabLaunch()`, `simLabExit()`, `renderSimLabDrillsCard()` — current single-scenario flow (kept for the `#page-drills` card; the Home path moves to the session flow)
- Exposed on `window`: `_simLab.*`, `simLabValidateScenario`, `simLabScoreScenario`, `simLabStart`, `simLabLaunch`, `simLabExit`, `renderSimLabDrillsCard`

**`app.js`:**
- `PBQ_FREE_DAILY_CAP = 1`, `_pbqFreeRunsToday()`, `_bumpPbqFreeRun()` (~line 7019-7039), `STORAGE.PBQ_FREE_COUNT`
- `startSimLabHome()`, `renderSimLabHomeEntry()`, `_SL_PBQ_CERTS_HOME` (~after 7039)
- `_ensureSimLabLoaded(cb)` (~line 2043) · `_slMeteredGenerate(prompt)` (~line 7044) · `_gateProOnly(feature, {title, body})` · `_quotaState` (`.tier` ∈ free/pro/admin)
- showPage hook (~line 2446): `name==='drills'` loads card; `name==='setup'` calls `renderSimLabHomeEntry()`

**`index.html`:** `#page-sim-lab` shell (lines ~1759-1768): `.sl-shell > .sl-topbar(.sl-strip 'Sim Lab · #sl-topic', #sl-timer-slot, button[data-action=simLabExit] 'Leave') + #sl-body`. Sibling pattern: `#page-gauntlet`/`#page-whynot` use `.gnt-shell > .gnt-hdr(back-btn + .gnt-hdr-title + pro-lock-pill) + .gnt-mark + .gnt-entry-title + .gnt-entry-lede + .gnt-target + .gnt-ladder-preview + .gnt-cta`.

**`landing/index.html`:** `#gauntlet` section (lines ~2270-2310): `.gauntlet-section > .gx-wrap > .gx-copy + .gx-panels(.gx-panel > .gx-panel-eyebrow + h3 + .gx-panel-line + .gx-demo(.gx-demo-k + .gx-demo-concept + .gx-rungs + .gx-seal))`. Tokens scoped to `#gauntlet` to avoid landing's legacy purple `--accent`.

---

## File structure

| File | Change | Responsibility |
|---|---|---|
| `features/sim-lab.js` | modify | `_slSession` state machine, `_slPickSeedFresh`, entry/loader/summary renderers, round loop, prefetch |
| `app.js` | modify | cap reframe (sessions), `startSimLabHome`→entry, weak-spot persistence (Pro), home subtitle |
| `index.html` | modify | `#page-sim-lab-entry`, `#page-sim-lab-result`, round-pill+dots in `#page-sim-lab` topbar |
| `dg-system.css` | modify | `.sle-*` (entry), `.slr-*` (round chrome+loader), `.sls-*` (summary) editorial styles |
| `landing/index.html` | modify | `#simlab-sec` dedicated section |
| `landing/dg-system.css` | modify | `#simlab-sec` scoped tokens + styles |
| `tests/e2e/sim-lab.spec.js` | modify | session flow, cap, gates, prefetch tests |
| `tests/uat.js` | modify | structural pins (new pages, session exports) |
| version surfaces | modify | `bump-version.js` |

---

## Task 1: Session state machine + no-repeat seed picker (pure logic, no UI)

**Files:**
- Modify: `features/sim-lab.js` (add near the generation block ~line 488, before `_slShowPage`)
- Test: `tests/e2e/sim-lab.spec.js` (new `test.describe('sim-lab session core')`)

- [ ] **Step 1: Write the failing test** — append to `tests/e2e/sim-lab.spec.js`:

```js
test('session core: builds a session, picks distinct seeds, aggregates results', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(() => {
    const S = window._simLab;
    // distinct seeds within a session
    const used = new Set();
    const a = S.pickSeedFresh('netplus', used); used.add(a.id);
    const b = S.pickSeedFresh('netplus', used); used.add(b.id);
    const distinct = a && b && a.id !== b.id;
    // aggregate: 2 passed of 3, steps 4 of 5
    const results = [
      { score: { correct: 2, total: 2, fraction: 1, perStep: {} }, passed: true },
      { score: { correct: 1, total: 2, fraction: 0.5, perStep: {} }, passed: false },
      { score: { correct: 1, total: 1, fraction: 1, perStep: {} }, passed: true },
    ];
    const agg = S.aggregateSession(results);
    return { distinct, passed: agg.passed, rounds: agg.rounds, stepsCorrect: agg.stepsCorrect, stepsTotal: agg.stepsTotal, pct: agg.pct };
  });
  expect(r.distinct).toBe(true);
  expect(r.passed).toBe(2);
  expect(r.rounds).toBe(3);
  expect(r.stepsCorrect).toBe(4);
  expect(r.stepsTotal).toBe(5);
  expect(r.pct).toBe(80);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && npx playwright test tests/e2e/sim-lab.spec.js -g "session core" --project=chromium`
Expected: FAIL — `S.pickSeedFresh is not a function`.

- [ ] **Step 3: Implement** — in `features/sim-lab.js`, add after `_slPickSeed` (~line 500):

```js
  // No-repeat seed pick within a session. Falls back to plain pick if the bank
  // is exhausted (won't happen: 50 seeds >> 10 max rounds).
  function _slPickSeedFresh(cert, usedIds) {
    var bank = (cert === 'netplus' && window.SIM_LAB_SEED_NETPLUS) ? window.SIM_LAB_SEED_NETPLUS : [];
    var fresh = bank.filter(function (s) { return !usedIds.has(s.id) && simLabValidateScenario(s).ok; });
    var pool = fresh.length ? fresh : bank.filter(function (s) { return simLabValidateScenario(s).ok; });
    if (!pool.length) return null;
    // deterministic-ish rotation without Math.random: index by used-count + minute
    var idx = (usedIds.size + (new Date().getMinutes())) % pool.length;
    return pool[idx];
  }

  // Aggregate per-round results into a session summary.
  function _slAggregateSession(results) {
    var passed = 0, stepsCorrect = 0, stepsTotal = 0;
    results.forEach(function (r) {
      if (r.passed) passed++;
      stepsCorrect += r.score.correct; stepsTotal += r.score.total;
    });
    var pct = stepsTotal ? Math.round((stepsCorrect / stepsTotal) * 100) : 0;
    return { passed: passed, rounds: results.length, stepsCorrect: stepsCorrect, stepsTotal: stepsTotal, pct: pct };
  }
```

Then expose on the test API (in the `window._simLab` block ~line 652):

```js
  window._simLab.pickSeedFresh = _slPickSeedFresh;
  window._simLab.aggregateSession = _slAggregateSession;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "session core" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): session seed no-repeat picker + result aggregation"
```

---

## Task 2: Daily cap reframe — sessions, not scenarios (TDD)

**Spec:** §2.1, §3.7. `_bumpPbqFreeRun` must fire once per *session start*, and the existing single-scenario `simLabStart` must stop bumping per-scenario (the session owns the bump).

**Files:**
- Modify: `features/sim-lab.js` (`simLabStart` ~line 620 — remove its `_bumpPbqFreeRun` call; the session will own it)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('cap: one free SESSION per day, bumped once regardless of rounds', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    localStorage.removeItem('nplus_pbq_free_count');
    const before = window._pbqFreeRunsToday();
    // simulate a 3-round session bumping once at start
    window._simLab.sessionBumpOnce();
    window._simLab.sessionBumpOnce(); // guarded: must not double-count within a session
    const after = window._pbqFreeRunsToday();
    return { before, after };
  });
  expect(r.before).toBe(0);
  expect(r.after).toBe(1);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "one free SESSION" --project=chromium`
Expected: FAIL — `sessionBumpOnce is not a function`.

- [ ] **Step 3: Implement** — in `features/sim-lab.js`, add a guarded once-per-session bump (the guard flag lives on `_slSession`, set in Task 4; for now a module flag):

```js
  var _slSessionBumped = false;
  function _slSessionBumpOnce() {
    if (_slSessionBumped) return;
    _slSessionBumped = true;
    if (typeof window._bumpPbqFreeRun === 'function') window._bumpPbqFreeRun();
  }
```

In `simLabStart`, **remove** the per-scenario bump line (currently inside the `.then` after generation: `if (!pro && typeof window._bumpPbqFreeRun === 'function') window._bumpPbqFreeRun();`). The session start owns the bump now. Expose for the test:

```js
  window._simLab.sessionBumpOnce = function () { _slSessionBumped = false; _slSessionBumpOnce(); _slSessionBumpOnce(); };
```

> Note: the real reset of `_slSessionBumped=false` happens in `_slSessionStart` (Task 4). The test wrapper resets then double-calls to prove the guard.

- [ ] **Step 4: Run to verify it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "one free SESSION" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): reframe free daily cap to one session (bump once per session)"
```

---

## Task 3: Entry screen markup + styles (lift mockup panel 1)

**Open first:** `mockups/sim-lab-session-2-flow-concept.html` panel 1 (`.shell` "Entry and pick your rounds").

**Files:**
- Modify: `index.html` (add `#page-sim-lab-entry` next to `#page-sim-lab` ~line 1768)
- Modify: `dg-system.css` (add `.sle-*` block; bump `?v=` query in index.html)

- [ ] **Step 1: Add the page markup** — in `index.html` after `#page-sim-lab` closes (~line 1768), reusing `gnt-shell` chrome for seamlessness:

```html
<div id="page-sim-lab-entry" class="page">
  <div class="gnt-shell">
    <div class="gnt-hdr">
      <button type="button" class="back-btn" data-action="simLabEntryBack" aria-label="Back"><svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg><span class="back-btn-label">Back</span></button>
      <h1 class="gnt-hdr-title">Sim Lab</h1>
      <span class="pro-lock-pill tier-free-only"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>Pro</span>
    </div>
    <div class="gnt-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h10M4 17h7"></path><path d="M15 15l2.5 2.5L22 13"></path></svg></div>
    <h2 class="gnt-entry-title">Practice the hands-on <i>PBQs</i></h2>
    <p class="gnt-entry-lede">The exam opens with them. Run a few back to back and the format stops being a surprise.</p>
    <div class="gnt-target">
      <div class="gnt-target-k">Today's target</div>
      <div class="gnt-target-v" id="sle-target">Mixed · Network+ N10-009</div>
    </div>
    <div class="sle-pick-k">How many rounds</div>
    <div class="sle-chips" id="sle-rounds" role="group" aria-label="Number of rounds">
      <button type="button" class="sle-chip" data-rounds="3">3 rounds</button>
      <button type="button" class="sle-chip is-on" data-rounds="5" aria-pressed="true">5 rounds</button>
      <button type="button" class="sle-chip sle-chip-pro" data-rounds="10"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>10 · exam length</button>
    </div>
    <button type="button" class="btn btn-primary gnt-cta" id="sle-start" data-action="simLabSessionStart">Start the sim →</button>
  </div>
</div>
```

- [ ] **Step 2: Add styles** — in `dg-system.css`, lift spacing/look from the mockup `.pick-k/.chips/.chip` rules into `.sle-*` (use brand tokens, not the mockup's literal oklch — those equal the tokens):

```css
/* Sim Lab session — entry rounds picker */
#page-sim-lab-entry .sle-pick-k{font:800 10px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);margin:2px 0 9px}
#page-sim-lab-entry .sle-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
#page-sim-lab-entry .sle-chip{font:600 13px/1 Inter,sans-serif;color:var(--text-mid);background:var(--surface-2,var(--surface));border:1px solid var(--border);border-radius:9px;padding:9px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:transform .15s var(--dgh-ease,cubic-bezier(.16,1,.3,1)),border-color .15s,background .15s}
#page-sim-lab-entry .sle-chip:active{transform:scale(.97)}
#page-sim-lab-entry .sle-chip.is-on{color:var(--on-accent);background:var(--accent);border-color:var(--accent)}
#page-sim-lab-entry .sle-chip-pro{color:var(--text-dim)}
#page-sim-lab-entry .sle-chip-pro svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2}
@media (hover:hover) and (pointer:fine){#page-sim-lab-entry .sle-chip:hover{border-color:color-mix(in oklab,var(--accent) 40%,var(--border))}}
@media (prefers-reduced-motion:reduce){#page-sim-lab-entry .sle-chip{transition:none}}
```

Bump the `dg-system.css?v=` query in `index.html` (find `dg-system.css?v=` and increment to the new app version).

- [ ] **Step 3: Verify visually** — `python3 -m http.server 3131`, open `localhost:3131`, run in console `showPage('page-sim-lab-entry'.replace('page-',''))` → confirm the entry renders in the drill shell, 5 selected by default, 10 shows a lock. Compare side-by-side with the mockup panel 1.

- [ ] **Step 4: Commit**

```bash
git add index.html dg-system.css
git commit -m "feat(sim-lab): entry screen + rounds picker (gnt-shell, lifted from mockup)"
```

---

## Task 4: Entry wiring — Home tile → entry, picker selection, Start → session, 10-round Pro gate

**Spec:** §2.1, §2.2, §4. `startSimLabHome` opens the entry (instant) instead of launching generation.

**Files:**
- Modify: `app.js` (`startSimLabHome` ~after 7039)
- Modify: `features/sim-lab.js` (picker handlers + `_slSession` + `_slSessionStart` + `simLabEntryBack`)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('entry: Home tile opens entry; picking 10 on free gates to Pro; 5 starts a session', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    localStorage.removeItem('nplus_pbq_free_count');
    window.CURRENT_CERT = 'netplus';
    let gate = 0; window._gateProOnly = () => { gate++; return false; };
    await new Promise(res => window._ensureSimLabLoaded(res));
    window.startSimLabHome();
    const onEntry = document.getElementById('page-sim-lab-entry').classList.contains('active');
    // pick 10 → gate, no session
    document.querySelector('.sle-chip[data-rounds="10"]').click();
    const gatedOn10 = gate === 1 && window._simLab.sessionRounds() !== 10;
    // pick 3 → selects
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    return { onEntry, gatedOn10, rounds: window._simLab.sessionRounds() };
  });
  expect(r.onEntry).toBe(true);
  expect(r.gatedOn10).toBe(true);
  expect(r.rounds).toBe(3);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "Home tile opens entry" --project=chromium`
Expected: FAIL — entry not active (startSimLabHome still launches generation).

- [ ] **Step 3a: Repoint `startSimLabHome`** — in `app.js`, replace the body so it opens the entry page instead of launching:

```js
function startSimLabHome() {
  if (typeof _ensureSimLabLoaded !== 'function') return;
  _ensureSimLabLoaded(function () {
    if (typeof window.simLabOpenEntry === 'function') window.simLabOpenEntry();
  });
}
```

- [ ] **Step 3b: Add entry control + session start** — in `features/sim-lab.js`:

```js
  var _slSession = null;
  var _slPickedRounds = 5;

  function _slIsProNow() { return _slIsPro(); }

  function simLabOpenEntry() {
    _slPickedRounds = 5;
    var t = document.getElementById('sle-target');
    if (t) t.textContent = 'Mixed · ' + ((window.CERT_PACK && window.CERT_PACK.meta && window.CERT_PACK.meta.examName) || 'Network+ N10-009');
    _slSyncRoundChips();
    if (typeof showPage === 'function') showPage('sim-lab-entry');
  }
  function _slSyncRoundChips() {
    var chips = document.querySelectorAll('#sle-rounds .sle-chip');
    Array.prototype.forEach.call(chips, function (c) {
      var on = parseInt(c.getAttribute('data-rounds'), 10) === _slPickedRounds;
      c.classList.toggle('is-on', on);
      if (on) c.setAttribute('aria-pressed', 'true'); else c.removeAttribute('aria-pressed');
    });
  }
  function _slBindRoundChips() {
    var host = document.getElementById('sle-rounds');
    if (!host || host.__bound) return; host.__bound = true;
    host.addEventListener('click', function (e) {
      var chip = e.target.closest('.sle-chip'); if (!chip) return;
      var n = parseInt(chip.getAttribute('data-rounds'), 10);
      if (n === 10 && !_slIsProNow()) {
        window._gateProOnly('Sim Lab', {
          title: 'Exam-length runs are a Pro sim.',
          body: 'Free runs 3 or 5 rounds. Pro opens the full 10-round exam-length sim on every cert, plus weak-spot tracking across sessions.'
        });
        return;
      }
      _slPickedRounds = n; _slSyncRoundChips();
    });
  }
  function simLabEntryBack() { if (typeof showPage === 'function') showPage('setup'); }
  window.simLabOpenEntry = function () { _slBindRoundChips(); simLabOpenEntry(); };
  window.simLabEntryBack = simLabEntryBack;
  window._simLab.sessionRounds = function () { return _slPickedRounds; };
```

(Call `_slBindRoundChips()` once on module load too, after the `window._simLab` block.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "Home tile opens entry" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): wire Home tile to entry, rounds picker selection + 10-round Pro gate"
```

---

## Task 5: In-session round chrome + loader + the round loop (lift mockup panels 2 & 3)

**Open first:** `mockups/sim-lab-session-2-flow-concept.html` panels 2 (round) and 3 (loader).

**Files:**
- Modify: `index.html` (`#page-sim-lab` topbar: add round pill + dots)
- Modify: `features/sim-lab.js` (`_slSessionStart`, `_slRunRound`, `_slRenderLoader`, round chrome updates)
- Modify: `dg-system.css` (`.slr-*` round pill, dots, loader)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Update the `#page-sim-lab` topbar** — in `index.html` (~line 1762), add the round pill + a dots container:

```html
    <div class="sl-topbar">
      <span class="sl-strip"><span>Sim Lab</span> <span class="slr-round-pill is-hidden" id="sl-round-pill">Round 1 of 5</span></span>
      <span id="sl-timer-slot"></span>
      <button type="button" class="btn gnt-ghost" data-action="simLabExit">Leave</button>
    </div>
    <div class="slr-dots is-hidden" id="sl-dots" aria-hidden="true"></div>
    <div id="sl-body"></div>
```

- [ ] **Step 2: Add styles** — in `dg-system.css`, lift the round-pill/dots/loader look from the mockup:

```css
#page-sim-lab .slr-round-pill{font:800 11px/1 Inter,sans-serif;letter-spacing:.06em;color:var(--accent);border:1px solid color-mix(in oklab,var(--accent) 30%,var(--border));background:color-mix(in oklab,var(--accent) 8%,transparent);padding:3px 9px;border-radius:999px;margin-left:8px}
#page-sim-lab .slr-dots{display:flex;gap:5px;margin:0 0 16px}
#page-sim-lab .slr-dot{width:22px;height:4px;border-radius:999px;background:var(--border)}
#page-sim-lab .slr-dot.done{background:var(--green,var(--pass))}
#page-sim-lab .slr-dot.now{background:var(--accent)}
#page-sim-lab .slr-loader{text-align:center;padding:40px 0}
#page-sim-lab .slr-spin{width:34px;height:34px;margin:0 auto 16px;border-radius:50%;border:3px solid color-mix(in oklab,var(--accent) 22%,transparent);border-top-color:var(--accent);animation:slrspin .8s linear infinite}
@keyframes slrspin{to{transform:rotate(360deg)}}
#page-sim-lab .slr-loader-t{font:600 15px/1.3 Inter,sans-serif}
#page-sim-lab .slr-loader-s{font:400 13px/1.4 Inter,sans-serif;color:var(--text-dim);margin-top:5px}
.is-hidden{display:none!important}
@media (prefers-reduced-motion:reduce){#page-sim-lab .slr-spin{animation:none}}
```

- [ ] **Step 3: Implement the session start + round loop** — in `features/sim-lab.js`:

```js
  function _slUpdateChrome() {
    var pill = document.getElementById('sl-round-pill');
    if (pill) { pill.textContent = 'Round ' + (_slSession.idx + 1) + ' of ' + _slSession.rounds; pill.classList.remove('is-hidden'); }
    var dotsHost = document.getElementById('sl-dots');
    if (dotsHost) {
      dotsHost.classList.remove('is-hidden');
      dotsHost.innerHTML = '';
      for (var i = 0; i < _slSession.rounds; i++) {
        var d = _el('span', 'slr-dot' + (i < _slSession.idx ? ' done' : (i === _slSession.idx ? ' now' : '')));
        dotsHost.appendChild(d);
      }
    }
  }
  function _slRenderLoader(host, roundNum) {
    host.innerHTML = '';
    var box = _el('div', 'slr-loader');
    box.innerHTML = '<div class="slr-spin" aria-hidden="true"></div>' +
      '<div class="slr-loader-t">Building round ' + roundNum + '…</div>' +
      '<div class="slr-loader-s">A fresh scenario. This takes a few seconds.</div>';
    host.appendChild(box);
  }

  function _slSessionStart() {
    var cert = window.CURRENT_CERT || 'netplus';
    var pro = _slIsPro();
    if (!pro) {
      var used = (typeof window._pbqFreeRunsToday === 'function') ? window._pbqFreeRunsToday() : 0;
      var cap = window.PBQ_FREE_DAILY_CAP || 1;
      if (used >= cap) {
        return window._gateProOnly('Sim Lab', {
          title: "That's your free session for today.",
          body: "You're in the rhythm now. Pro keeps it unlimited on every cert, with the full reasoning on every step, not just the ones you missed."
        });
      }
    }
    _slSessionBumped = false;
    if (!pro) _slSessionBumpOnce(); // consume the daily free on START
    if (typeof window._slMeteredGenerate === 'function') window._simLab.__setFetcher(window._slMeteredGenerate);
    _slSession = { mode: 'practice', rounds: _slPickedRounds, idx: 0, pro: pro, cert: cert, results: [], usedSeedIds: new Set(), prefetch: null };
    if (typeof showPage === 'function') showPage('sim-lab');
    _slUpdateChrome();
    _slRunRound();
  }
  window.simLabSessionStart = _slSessionStart;

  function _slRunRound() {
    var body = document.getElementById('sl-body');
    var topic = document.getElementById('sl-topic');
    _slUpdateChrome();
    _slRenderLoader(body, _slSession.idx + 1);
    _slGetRoundScenario().then(function (scn) {
      _slSession.usedSeedIds.add(scn.id);
      if (topic) topic.textContent = scn.topic || 'PBQ';
      var slot = document.getElementById('sl-timer-slot');
      if (slot) { slot.innerHTML = ''; _slSession.timer = _slStartPracticeTimer(slot, { estMinutes: scn.estMinutes }); }
      _slMountScenario(body, scn, {
        onSubmit: function (result) {
          if (_slSession.timer) { _slSession.timer.stop(); _slSession.timer = null; }
          var passed = result.fraction === 1;
          _slSession.results.push({ scenario: scn, score: result, passed: passed });
          _slSession.idx++;
          if (_slSession.idx >= _slSession.rounds) { _slRenderSummary(); }
          else { _slRunRound(); }
        }
      });
      _slStartPrefetch(); // Task 6
    });
  }
```

`_slGetRoundScenario()` (round-aware, prefetch-aware) is finished in Task 6; for now a minimal version:

```js
  function _slGetRoundScenario() {
    return _slGenerateScenarioFresh(_slSession.cert, _slSession.usedSeedIds);
  }
  // generation that prefers a fresh (unused) seed on fallback
  function _slGenerateScenarioFresh(cert, usedIds) {
    return _slGenerateScenario(cert).then(function (scn) {
      if (scn && usedIds.has(scn.id)) { var alt = _slPickSeedFresh(cert, usedIds); if (alt) return alt; }
      return scn;
    }).catch(function () { return _slPickSeedFresh(cert, usedIds); });
  }
  function _slStartPrefetch() {} // replaced in Task 6
```

`_slRenderSummary` is Task 7 (stub `function _slRenderSummary(){}` until then).

- [ ] **Step 4: Write a flow test**

```js
test('session: 3-round run renders rounds with loader then advances on submit', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    localStorage.removeItem('nplus_pbq_free_count');
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });   // force seed fallback
    window.simLabOpenEntry();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
  });
  await expect(page.locator('#page-sim-lab')).toHaveClass(/active/);
  await expect(page.locator('#sl-round-pill')).toContainText('Round 1 of 3');
  await expect(page.locator('#sl-dots .slr-dot')).toHaveCount(3);
  // round renders (seed) → submit → round 2
  await page.waitForSelector('[data-action="simLabSubmitScenario"]');
  await page.click('[data-action="simLabSubmitScenario"]');
  await expect(page.locator('#sl-round-pill')).toContainText('Round 2 of 3', { timeout: 8000 });
});
```

- [ ] **Step 5: Run, expect PASS, then commit**

```bash
git add index.html dg-system.css features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): in-session round chrome (pill+dots), loader, and the round loop"
```

---

## Task 6: Prefetch round N+1 during round N

**Spec:** §3.6. One prefetch in flight; advance consumes it if ready, else loader awaits it; failure/suspension falls back.

**Files:**
- Modify: `features/sim-lab.js` (replace `_slStartPrefetch`, `_slGetRoundScenario`)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Implement prefetch**

```js
  function _slStartPrefetch() {
    if (!_slSession) return;
    var nextIdx = _slSession.idx + 1;
    if (nextIdx >= _slSession.rounds) { _slSession.prefetch = null; return; }
    // one in flight; capture the used-set snapshot so the prefetched scenario is distinct
    var snapshot = new Set(_slSession.usedSeedIds);
    var p = _slGenerateScenarioFresh(_slSession.cert, snapshot).then(function (scn) {
      return scn;
    }).catch(function () { return null; });
    _slSession.prefetch = { idx: nextIdx, promise: p };
  }

  function _slGetRoundScenario() {
    var pf = _slSession.prefetch;
    if (pf && pf.idx === _slSession.idx) {
      _slSession.prefetch = null;
      return pf.promise.then(function (scn) {
        // suspended/failed prefetch (e.g. iOS background) → regenerate on demand
        if (!scn || _slSession.usedSeedIds.has(scn.id)) return _slGenerateScenarioFresh(_slSession.cert, _slSession.usedSeedIds);
        return scn;
      });
    }
    return _slGenerateScenarioFresh(_slSession.cert, _slSession.usedSeedIds);
  }
```

- [ ] **Step 2: Write the test** (assert a prefetch is created during round 1)

```js
test('prefetch: round N+1 is fetched during round N', async ({ page }) => {
  await gotoApp(page);
  const had = await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    localStorage.removeItem('nplus_pbq_free_count');
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    let calls = 0;
    window._slMeteredGenerate = async () => { calls++; return { bad: true }; };
    window.simLabOpenEntry();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
    await new Promise(r => setTimeout(r, 600));
    return window._simLab.hasPrefetch();
  });
  expect(had).toBe(true);
});
```

Expose: `window._simLab.hasPrefetch = function(){ return !!(_slSession && _slSession.prefetch); };`

- [ ] **Step 3: Run, expect PASS, then commit**

```bash
git add features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): prefetch round N+1 during round N with graceful fallback"
```

---

## Task 7: End-of-session summary (lift mockup-3)

**Open first:** `mockups/sim-lab-session-3-summary-concept.html`.

**Files:**
- Modify: `index.html` (add `#page-sim-lab-result`)
- Modify: `features/sim-lab.js` (`_slRenderSummary`, replace the Task-5 stub)
- Modify: `dg-system.css` (`.sls-*` summary styles; Fraunces score uses lining-nums)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Add the result page** — in `index.html` after `#page-sim-lab-entry`:

```html
<div id="page-sim-lab-result" class="page">
  <div class="gnt-shell gnt-shell-result" id="sl-result-root"></div>
</div>
```

- [ ] **Step 2: Add styles** — `.sls-*` in `dg-system.css`, lifting from the mockup. Key rules (score figure follows BRAND §4 lining-nums; weak-spot is a full tinted hairline, NOT left-border):

```css
#page-sim-lab-result .sls-seal{display:inline-flex;align-items:center;gap:7px;font:800 11px/1 Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--green,var(--pass));background:color-mix(in oklab,var(--green,var(--pass)) 12%,transparent);border:1px solid color-mix(in oklab,var(--green,var(--pass)) 30%,var(--border));padding:5px 11px;border-radius:999px}
#page-sim-lab-result .sls-score-n{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:76px;line-height:1;letter-spacing:-.03em;color:var(--text);font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum","tnum"}
#page-sim-lab-result .sls-score-n small{font-size:30px;color:var(--text-dim)}
#page-sim-lab-result .sls-score-cap{margin-top:12px;font:600 13px/1 Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--text-dim)}
#page-sim-lab-result .sls-r{display:flex;align-items:center;gap:12px;padding:13px 2px;border-bottom:1px solid var(--border-soft,var(--border))}
#page-sim-lab-result .sls-r-ic{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:800 12px/1 Inter,sans-serif;flex:none}
#page-sim-lab-result .sls-r-ic.ok{color:var(--green,var(--pass));background:color-mix(in oklab,var(--green,var(--pass)) 14%,transparent)}
#page-sim-lab-result .sls-r-ic.no{color:var(--red,var(--fail));background:color-mix(in oklab,var(--red,var(--fail)) 14%,transparent)}
#page-sim-lab-result .sls-why-locked{color:color-mix(in oklab,var(--accent) 70%,var(--text-dim));display:inline-flex;align-items:center;gap:5px}
#page-sim-lab-result .sls-insight{margin:20px 0;padding:14px 16px;border:1px solid color-mix(in oklab,var(--accent) 26%,var(--border));background:color-mix(in oklab,var(--accent) 7%,transparent);border-radius:13px}
```

- [ ] **Step 3: Implement `_slRenderSummary`** — replace the stub in `features/sim-lab.js`:

```js
  function _slRenderSummary() {
    var pill = document.getElementById('sl-round-pill'); if (pill) pill.classList.add('is-hidden');
    var dots = document.getElementById('sl-dots'); if (dots) dots.classList.add('is-hidden');
    var agg = _slAggregateSession(_slSession.results);
    var pro = _slSession.pro;
    var root = document.getElementById('sl-result-root');
    root.innerHTML = '';
    root.appendChild(_el('span', 'sls-seal', '✓ Session complete'));
    var score = _el('div', 'sls-score');
    score.innerHTML = '<span class="sls-score-n">' + agg.pct + '<small>%</small></span>' +
      '<span class="sls-score-cap">' + agg.passed + ' of ' + agg.rounds + ' sims passed · ' + agg.stepsCorrect + ' of ' + agg.stepsTotal + ' steps</span>';
    root.appendChild(score);
    var rounds = _el('div', 'sls-rounds');
    _slSession.results.forEach(function (r) {
      var row = _el('div', 'sls-r');
      var ok = r.passed;
      row.appendChild(_el('span', 'sls-r-ic ' + (ok ? 'ok' : 'no'), ok ? '✓' : '✗'));
      var bodyc = _el('div', 'sls-r-body');
      bodyc.appendChild(_el('div', 'sls-r-title', _esc(r.scenario.topic || 'PBQ')));
      // free reveals "why" on missed rounds only; passed rounds locked unless pro
      var reveal = pro || !ok;
      if (reveal) bodyc.appendChild(_el('div', 'sls-r-why', _esc(_slFirstWhy(r))));
      else { var lk = _el('div', 'sls-r-why sls-why-locked'); lk.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>Pro shows the why on the ones you got right too'; bodyc.appendChild(lk); }
      row.appendChild(bodyc);
      row.appendChild(_el('span', 'sls-r-score', r.score.correct + '/' + r.score.total));
      rounds.appendChild(row);
    });
    root.appendChild(rounds);
    // weak-spot cluster (shown to all; cross-session persistence is Pro — Task 8)
    var cluster = _slWeakCluster(_slSession.results);
    if (cluster) {
      var ins = _el('div', 'sls-insight');
      ins.innerHTML = '<div class="sls-insight-k">Where you slipped</div><p>' + _esc(cluster) + '</p>';
      root.appendChild(ins);
    }
    var back = _el('button', 'btn btn-primary gnt-cta', 'Back to Practice');
    back.setAttribute('data-action', 'simLabExit');
    root.appendChild(back);
    if (!pro) {
      var up = _el('button', 'btn gnt-ghost', 'Go Pro · exam-length runs + weak-spot tracking');
      up.setAttribute('data-action', 'simLabSummaryUpsell');
      root.appendChild(up);
    }
    if (typeof showPage === 'function') showPage('sim-lab-result');
    if (typeof window.renderSimLabHomeEntry === 'function') window.renderSimLabHomeEntry(); // refresh "done today"
  }
  function _slFirstWhy(r) {
    // first wrong step's explanation, else first step's
    var steps = r.scenario.steps || [];
    for (var i = 0; i < steps.length; i++) { if (r.score.perStep[steps[i].id] === false) return steps[i].explanation; }
    return steps.length ? steps[0].explanation : '';
  }
  function _slWeakCluster(results) {
    var missed = results.filter(function (r) { return !r.passed; }).map(function (r) { return r.scenario.topic; });
    if (!missed.length) return null;
    return 'Your misses were in ' + missed.join(' and ') + '. Pro tracks this across every session and pulls your weak domains back in automatically.';
  }
  function simLabSummaryUpsell() {
    window._gateProOnly('Sim Lab', { title: 'Go Pro for the full sim.', body: 'Exam-length 10-round runs, unlimited sessions on every cert, the full reasoning on every step, and weak-spot tracking that pulls your misses back in.' });
  }
  window.simLabSummaryUpsell = simLabSummaryUpsell;
```

(Update `simLabExit` to also clear `_slSession = null` and hide the pill/dots — it already returns to `setup`.)

- [ ] **Step 4: Write the summary test** (extends the 3-round flow: submit all 3, assert summary)

```js
test('session: completing all rounds shows the summary with aggregate', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(async () => {
    window._quotaState = { tier: 'free' }; localStorage.removeItem('nplus_pbq_free_count');
    window.CURRENT_CERT = 'netplus';
    await new Promise(res => window._ensureSimLabLoaded(res));
    window._slMeteredGenerate = async () => ({ bad: true });
    window.simLabOpenEntry();
    document.querySelector('.sle-chip[data-rounds="3"]').click();
    window.simLabSessionStart();
  });
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector('[data-action="simLabSubmitScenario"]', { timeout: 8000 });
    await page.click('[data-action="simLabSubmitScenario"]');
  }
  await expect(page.locator('#page-sim-lab-result')).toHaveClass(/active/, { timeout: 8000 });
  await expect(page.locator('.sls-score-n')).toBeVisible();
  await expect(page.locator('.sls-r')).toHaveCount(3);
});
```

- [ ] **Step 5: Run, expect PASS, commit**

```bash
git add index.html dg-system.css features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): end-of-session verdict summary (free/Pro why split, weak-spot cluster)"
```

---

## Task 8: Cross-session weak-spot persistence (Pro)

**Spec:** §3.5, §4. Within-session cluster shows to all (Task 7). Pro additionally *persists* missed topics and surfaces a tracked line; free does not persist.

**Files:**
- Modify: `app.js` (add `STORAGE.SIMLAB_WEAK` key + `_slRecordWeakSpots(topics)` / `_slGetWeakSpots()`, Pro-gated)
- Modify: `features/sim-lab.js` (call record on summary for Pro; show "tracked" line)
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Add storage helpers** — in `app.js` near the PBQ helpers. Add `SIMLAB_WEAK: 'nplus_simlab_weak'` to the `STORAGE` map, then:

```js
function _slRecordWeakSpots(topics) {
  if (!(_quotaState && (_quotaState.tier === 'pro' || _quotaState.tier === 'admin'))) return; // Pro-only persistence
  try {
    const cur = JSON.parse(localStorage.getItem(STORAGE.SIMLAB_WEAK) || '{}');
    topics.forEach(t => { if (t) cur[t] = (cur[t] || 0) + 1; });
    localStorage.setItem(STORAGE.SIMLAB_WEAK, JSON.stringify(cur));
    if (typeof _cloudFlush === 'function') _cloudFlush(STORAGE.SIMLAB_WEAK);
  } catch (_) {}
}
function _slGetWeakSpots() {
  try { return JSON.parse(localStorage.getItem(STORAGE.SIMLAB_WEAK) || '{}'); } catch (_) { return {}; }
}
window._slRecordWeakSpots = _slRecordWeakSpots;
window._slGetWeakSpots = _slGetWeakSpots;
```

- [ ] **Step 2: Record + surface in summary** — in `_slRenderSummary` (Task 7), after computing the cluster, for Pro record and show the tracked total:

```js
    if (pro && typeof window._slRecordWeakSpots === 'function') {
      var missedTopics = _slSession.results.filter(function (r) { return !r.passed; }).map(function (r) { return r.scenario.topic; });
      window._slRecordWeakSpots(missedTopics);
    }
```

- [ ] **Step 3: Test** — Pro records, free does not:

```js
test('weak-spots: Pro persists missed topics, free does not', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(() => {
    localStorage.removeItem('nplus_simlab_weak');
    window._quotaState = { tier: 'free' };
    window._slRecordWeakSpots(['Subnetting']);
    const afterFree = Object.keys(window._slGetWeakSpots()).length;
    window._quotaState = { tier: 'pro' };
    window._slRecordWeakSpots(['Subnetting', 'DNS records']);
    const afterPro = window._slGetWeakSpots();
    return { afterFree, sub: afterPro['Subnetting'], dns: afterPro['DNS records'] };
  });
  expect(r.afterFree).toBe(0);
  expect(r.sub).toBe(1);
  expect(r.dns).toBe(1);
});
```

- [ ] **Step 4: Run, expect PASS, commit**

```bash
git add app.js features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): Pro cross-session weak-spot persistence"
```

---

## Task 9: Pro gates audit — IAP-safe, 2nd-session gate

**Spec:** §4, §6 (Apple IAP). Verify all three Sim Lab Pro gates route through `_gateProOnly` (so iOS shows IAP, not Stripe): (a) 10-round pick (Task 4), (b) 2nd session same day (Task 5 `_slSessionStart`), (c) summary upsell (Task 7). No new gate implementation — reuse only.

**Files:**
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Test the 2nd-session gate**

```js
test('cap: a second session the same day is gated to Pro', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    window._quotaState = { tier: 'free' };
    localStorage.setItem('nplus_pbq_free_count', JSON.stringify({ date: new Date().toISOString().slice(0,10), count: 1 }));
    window.CURRENT_CERT = 'netplus';
    let gate = 0; window._gateProOnly = () => { gate++; return false; };
    await new Promise(res => window._ensureSimLabLoaded(res));
    window.simLabOpenEntry();
    window.simLabSessionStart();
    return { gate, onResult: document.getElementById('page-sim-lab').classList.contains('active') };
  });
  expect(r.gate).toBe(1);
  expect(r.onResult).toBe(false); // gated, no session page
});
```

- [ ] **Step 2: Grep-audit the gates** — confirm no Stripe/web-checkout call bypasses `_gateProOnly` in the new code:

Run: `grep -nE "stripe|checkout|_gateProOnly" features/sim-lab.js`
Expected: every Pro decision goes through `window._gateProOnly`; zero direct stripe/checkout references.

- [ ] **Step 3: Run test, expect PASS, commit**

```bash
git add tests/e2e/sim-lab.spec.js
git commit -m "test(sim-lab): 2nd-session Pro gate + IAP-safe gate audit"
```

---

## Task 10: Landing — dedicated Sim Lab section (lift mockup-4)

**Open first:** `mockups/sim-lab-session-4-landing-concept.html`. **CRITICAL:** scope tokens to `#simlab-sec` or it renders purple (landing `:root` has legacy purple `--accent`). Copy the `#gauntlet` section's scoping pattern.

**Files:**
- Modify: `landing/index.html` (add `<section id="simlab-sec">` after the `#gauntlet` section ~line 2310)
- Modify: `landing/dg-system.css` (or a scoped `<style>` like `#gauntlet` uses) — `#simlab-sec` tokens + styles

- [ ] **Step 1: Add the section markup** — lift the `.wrap > .copy + .panel` structure from the mockup into `landing/index.html`, mapping classes to `simlab-*`. Keep the copy verbatim from the mockup (4-stage approved). Place after `#gauntlet`'s closing `</section>`.

- [ ] **Step 2: Add scoped styles** — copy the mockup's `#simlab-sec { --bg:…; --accent:oklch(0.50 0.155 55); … }` token block verbatim into `landing/dg-system.css`, then the `#simlab-sec .kicker/.panel/.rows/...` rules. Bump the landing `dg-system.css?v=` query if present.

- [ ] **Step 3: Verify** — `cd landing && python3 -m http.server 4182`, open `localhost:4182`, scroll to the section. Confirm: bronze (not purple), copy matches the mockup, the demo panel renders, collapses to single column under 820px (resize). Compare side-by-side with the mockup.

- [ ] **Step 4: Commit**

```bash
git add landing/index.html landing/dg-system.css
git commit -m "feat(landing): dedicated Sim Lab PBQ section (lifted from mockup, scoped bronze tokens)"
```

---

## Task 11: Cross-platform e2e + UAT structural pins

**Files:**
- Modify: `tests/e2e/sim-lab.spec.js` (ensure new tests are project-agnostic; the suite runs chromium/webkit/mobile-safari)
- Modify: `tests/uat.js` (structural pins)

- [ ] **Step 1: Run the full sim-lab suite across all three projects**

Run: `npx playwright test tests/e2e/sim-lab.spec.js --project=chromium --project=webkit --project=mobile-safari`
Expected: all green. Fix any mobile-safari timing flakes by widening waits (the seed-fallback path is fast; AI path is stubbed in tests).

- [ ] **Step 2: Add UAT structural pins** — in `tests/uat.js`, find the Sim Lab section (search `Sim Lab` / `simLab`) and add behavioral-smoke assertions:

```js
assert(html.includes('id="page-sim-lab-entry"'), 'v7.56 Session: entry page present');
assert(html.includes('id="page-sim-lab-result"'), 'v7.56 Session: result page present');
assert(html.includes('id="sl-round-pill"'), 'v7.56 Session: round pill present');
assert(simLabSrc.includes('_slSessionStart') && simLabSrc.includes('_slAggregateSession'), 'v7.56 Session: session core present');
assert(simLabSrc.includes('_slStartPrefetch'), 'v7.56 Session: prefetch present');
assert(appSrc.includes('_slRecordWeakSpots'), 'v7.56 Session: weak-spot persistence present');
```

(Match the file-reading pattern UAT already uses for `simLabSrc`/`appSrc`/`html`.)

- [ ] **Step 3: Run UAT + tech-debt**

Run: `node tests/uat.js && node tests/tech-debt.js`
Expected: UAT all-pass (count grows by the new assertions); tech-debt within limits. If a sim-lab function trips the long-function threshold, split it (e.g., `_slRenderSummary` → `_slRenderSummaryRows` helper).

- [ ] **Step 4: Commit**

```bash
git add tests/uat.js tests/e2e/sim-lab.spec.js
git commit -m "test(sim-lab): cross-platform session e2e + UAT structural pins"
```

---

## Task 12: Version bump, CHANGELOG, ship prep

**Files:**
- Modify (via script): `app.js`, `sw.js`, `index.html`, `styles.css`, `package.json`, `CLAUDE.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump version**

Run: `node scripts/bump-version.js 7.56.0 "Sim Lab: multi-round sessions (pick 3/5, Pro 10) + prefetch + verdict summary + landing section"`

- [ ] **Step 2: Re-read CLAUDE.md** (the script rewrote it). Trim the inline version table back to the last 3 ships, porting older rows to `CHANGELOG.md` first (confirm they're there before deleting).

- [ ] **Step 3: Re-run UAT** (version-consistency pins)

Run: `node tests/uat.js`
Expected: 4xxx/4xxx ALL PASS.

- [ ] **Step 4: Full regression**

Run: `npx playwright test tests/e2e/sim-lab.spec.js --project=chromium --project=webkit --project=mobile-safari && npx playwright test tests/e2e/app.spec.js --project=chromium`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(release): v7.56.0 — Sim Lab session mode"
```

- [ ] **Step 6: Ship via the repo `ship` skill** — walk SHIP_CHECKLIST (fast lane: drills JS + copy + landing). Live-verify on localhost first (full session: Home tile → entry → pick 3 → run 3 rounds → summary → Back to Practice), then push, then **real-device manual pass** (iPhone + iPad, portrait + landscape, IAP gate) per spec §6 before sign-off.

---

## Self-review notes (for the executor)

- **Spec coverage:** round model (T2,T4,T5,T9) · entry+picker (T3,T4) · in-session chrome+loader (T5) · prefetch (T6) · summary + why-split (T7) · weak-spot persistence (T8) · cap reframe (T2,T5) · landing (T10) · cross-platform (T11) · IAP (T9). All §2–§6 requirements map to a task.
- **Type/name consistency:** `_slSession` shape `{mode,rounds,idx,pro,cert,results[],usedSeedIds:Set,prefetch,timer}` used identically across T5/T6/T7. `_slAggregateSession`→`{passed,rounds,stepsCorrect,stepsTotal,pct}`. `_slPickSeedFresh(cert,usedIds:Set)`. Result row `{scenario,score,passed}`. Test-API names on `window._simLab`: `pickSeedFresh`, `aggregateSession`, `sessionBumpOnce`, `sessionRounds`, `hasPrefetch`.
- **The `#page-drills` single-scenario card** (`simLabLaunch`/`renderSimLabDrillsCard`) is left intact — it is a separate surface (mobile drills tab) and is not in this plan's scope.
- **Stubs:** `_slRenderSummary` and `_slStartPrefetch` are introduced as stubs in T5 and completed in T7/T6 — keep the build green between tasks.
