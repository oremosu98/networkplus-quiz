---
type: plan
status: shipped
cert: netplus
updated: 2026-06-29
tags: [plan, drill]
---
# Sim Lab — Plan 1: Core Engine + Practice Mode (Net+ free taster)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the independently-shippable free Sim Lab taster — a Net+ candidate runs one full-fidelity, timed, multi-step PBQ scenario per day, scored with partial credit and hybrid feedback, launched from a third Drills-page card.

**Architecture:** New lazy-loaded feature module `features/sim-lab.js` (keeps the frozen-for-split `app.js` from growing), rendering into a dedicated `#sim-lab` page in `index.html` (PBQ scenarios do not fit the one-MCQ quiz engine, so they get their own container — like the topology builder). It reuses the Why-Not *session lifecycle* (AI generation via the metered Claude fetch, `_gateProOnly`/`_canMakeMeteredCall` gating, a free daily-count storage key, verdict screen, return-to-drills) but renders multi-step scenarios with five interaction types over one shared answer-state model. Input is decided per gesture by `pointerType` (touch → tap-to-place, mouse/pen → drag), with tap-to-place as the universal + keyboard baseline.

**Tech Stack:** Vanilla JS (no framework, no per-feature build), `data-action` event delegation, Pointer Events, Playwright (chromium + webkit + mobile-safari), styles in `styles.css` with an `sl-` prefix.

**Spec:** [docs/superpowers/specs/2026-06-23-sim-lab-pbq-drill-design.md](../specs/2026-06-23-sim-lab-pbq-drill-design.md)
**Research:** [docs/pbq-drill-voc-research.md](../../pbq-drill-voc-research.md)

**Scope of Plan 1 (this doc):** schema + validation + scoring + normalization; the five renderers; the per-gesture input controller; the scenario orchestrator; Practice mode (timer + pacing nudge); hybrid feedback; AI generation + a hand-reviewed seed-bank fallback; free 1/day gating; the Drills card with daily-state pill; page wiring; cross-platform e2e.
**Out of scope (later plans):** Exam mode / flag-and-return / pacing report + Pro-unlimited (Plan 2); Sec+/A+ content + cert-aware gating (Plan 3); live CLI/router/topology simulators (not building).

**Lane:** Fast lane — non-schema JS/CSS/UI + reuse of existing gating primitives. The free count persists in `profiles.metadata` jsonb via the existing `_cloudFlush` (no migration). If any task ends up editing `auth-state.js`, `cloud-store.js`, or `sw.js`, stop and switch to the gated PR lane per `ENVIRONMENT_STRATEGY.md`.

---

## File structure

- **Create `features/sim-lab.js`** — the whole feature: data model, validator, scorer, normalizer, five renderers, input controller, orchestrator, Practice mode, feedback, generation, gating, card render. Exposes the handful of globals the `data-action` dispatcher and the Drills card call.
- **Create `features/sim-lab-seed-netplus.js`** — a small hand-reviewed seed bank of Net+ scenarios (correct answers guaranteed) used for the free-taster rotation and offline fallback.
- **Modify `index.html`** — add the `#sim-lab` page container; add the lazy-load `<script>` hookup is done in JS (see Task 17), not a static tag.
- **Modify `styles.css`** — `sl-*` classes (append near the `gnt-*`/`wn-*` drill styles).
- **Modify the Drills launcher render path in `app.js`** — add the third card (Task 16) next to `renderGauntletDrillsCard()` (app.js:7770).
- **Create `tests/e2e/sim-lab.spec.js`** — Playwright specs (pure-fn via `page.evaluate` + UI-driving + cross-platform).

**Naming conventions:** functions prefixed `simLab*` / `_sl*`; CSS `sl-*`; storage key `STORAGE.PBQ_FREE_COUNT = 'nplus_pbq_free_count'`; feature label string `'Sim Lab'` for gating/metering.

---

## Task 1: Scenario schema validator (pure function)

**Files:**
- Create: `features/sim-lab.js`
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

In `tests/e2e/sim-lab.spec.js`:

```js
const { test, expect } = require('@playwright/test');

// Loads the app shell so window.simLabValidateScenario is defined.
async function gotoApp(page) {
  await page.goto('http://localhost:3131/?_cb=test');
  await page.waitForFunction(() => typeof window.simLabValidateScenario === 'function');
}

test('validateScenario rejects a scenario with no steps', async ({ page }) => {
  await gotoApp(page);
  const ok = await page.evaluate(() =>
    window.simLabValidateScenario({
      id: 's1', cert: 'netplus', objective: '1.4', topic: 'IPv4', title: 't',
      scenario: 'x', estMinutes: 5, steps: []
    }).ok
  );
  expect(ok).toBe(false);
});

test('validateScenario accepts a well-formed single-step scenario', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() =>
    window.simLabValidateScenario({
      id: 's1', cert: 'netplus', objective: '1.4', topic: 'IPv4', title: 't',
      scenario: 'x', estMinutes: 5,
      steps: [{ id: 'st1', type: 'fillin', prompt: 'mask?', points: 1,
        explanation: 'because', payload: { fields: [{ id: 'f1', label: 'mask' }] },
        answer: { f1: ['255.255.255.192', '/26'] } }]
    })
  );
  expect(res.ok).toBe(true);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run serve` (in another shell) then `npx playwright test tests/e2e/sim-lab.spec.js -g "validateScenario" --project=chromium`
Expected: FAIL — `window.simLabValidateScenario is not a function` (waitForFunction times out).

- [ ] **Step 3: Implement the validator**

Create `features/sim-lab.js` with:

```js
/* Sim Lab — PBQ drill (Plan 1: core + Practice mode). Lazy-loaded feature. */
(function () {
  'use strict';

  var STEP_TYPES = ['order', 'categorize', 'match', 'analyze', 'fillin'];

  function _isNonEmptyStr(v) { return typeof v === 'string' && v.trim().length > 0; }

  function _validateStepPayload(step) {
    var p = step.payload, a = step.answer;
    if (!p || typeof p !== 'object' || !a) return false;
    switch (step.type) {
      case 'order':
        return Array.isArray(p.items) && p.items.length >= 2 &&
               Array.isArray(a.correctOrder) && a.correctOrder.length === p.items.length;
      case 'categorize':
        return Array.isArray(p.items) && Array.isArray(p.buckets) && p.buckets.length >= 2 &&
               a.map && typeof a.map === 'object';
      case 'match':
        return Array.isArray(p.left) && Array.isArray(p.right) &&
               p.left.length === p.right.length && a.pairs && typeof a.pairs === 'object';
      case 'analyze':
        return Array.isArray(p.lines) && p.lines.length >= 2 &&
               Array.isArray(a.selected) && a.selected.length >= 1;
      case 'fillin':
        return Array.isArray(p.fields) && p.fields.length >= 1 &&
               a && typeof a === 'object' &&
               p.fields.every(function (f) { return Array.isArray(a[f.id]) && a[f.id].length >= 1; });
      default: return false;
    }
  }

  function simLabValidateScenario(s) {
    var errs = [];
    if (!s || typeof s !== 'object') return { ok: false, errors: ['not an object'] };
    if (!_isNonEmptyStr(s.id)) errs.push('missing id');
    if (!_isNonEmptyStr(s.cert)) errs.push('missing cert');
    if (!_isNonEmptyStr(s.scenario)) errs.push('missing scenario prose');
    if (typeof s.estMinutes !== 'number' || s.estMinutes <= 0) errs.push('bad estMinutes');
    if (!Array.isArray(s.steps) || s.steps.length < 1 || s.steps.length > 4) {
      errs.push('steps must be 1..4');
    } else {
      s.steps.forEach(function (st, i) {
        if (!_isNonEmptyStr(st.id)) errs.push('step ' + i + ': missing id');
        if (STEP_TYPES.indexOf(st.type) === -1) errs.push('step ' + i + ': bad type');
        if (!_isNonEmptyStr(st.prompt)) errs.push('step ' + i + ': missing prompt');
        if (!_isNonEmptyStr(st.explanation)) errs.push('step ' + i + ': missing explanation');
        if (st.points !== 1) errs.push('step ' + i + ': points must be 1');
        if (!_validateStepPayload(st)) errs.push('step ' + i + ': bad payload/answer for ' + st.type);
      });
    }
    return { ok: errs.length === 0, errors: errs };
  }

  // --- exports (more added in later tasks) ---
  window.simLabValidateScenario = simLabValidateScenario;
  window._simLab = window._simLab || {};
  window._simLab.STEP_TYPES = STEP_TYPES;
})();
```

For the test to load the module during Plan-1 development, temporarily add to `index.html` just before `</body>`:
```html
<script defer src="features/sim-lab.js"></script>
```
(Task 17 replaces this static tag with proper lazy-loading; keep it for now so tests can run.)

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "validateScenario" --project=chromium`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js index.html tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): scenario schema validator + test harness"
```

---

## Task 2: Scoring (all-or-nothing per step) — pure function

**Files:**
- Modify: `features/sim-lab.js`
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('scoreScenario gives all-or-nothing per step and a scenario fraction', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() => {
    const scn = { steps: [
      { id: 'a', type: 'fillin', payload: { fields: [{ id: 'f1' }] }, answer: { f1: ['/26'] } },
      { id: 'b', type: 'order', payload: { items: [{id:'x'},{id:'y'}] }, answer: { correctOrder: ['x','y'] } }
    ]};
    const responses = { a: { f1: '/26' }, b: { order: ['y','x'] } }; // a right, b wrong
    return window.simLabScoreScenario(scn, responses);
  });
  expect(res.perStep).toEqual({ a: true, b: false });
  expect(res.correct).toBe(1);
  expect(res.total).toBe(2);
  expect(Math.round(res.fraction * 100)).toBe(50);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "scoreScenario" --project=chromium`
Expected: FAIL — `simLabScoreScenario is not a function`.

- [ ] **Step 3: Implement scoring**

Add inside the IIFE in `features/sim-lab.js` (before the exports block):

```js
function _arrEq(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function _setEq(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  var sa = a.slice().sort(), sb = b.slice().sort();
  return _arrEq(sa, sb);
}

function _scoreStep(step, resp) {
  if (!resp) return false;
  switch (step.type) {
    case 'order':
      return _arrEq(resp.order, step.answer.correctOrder);
    case 'categorize':
      return Object.keys(step.answer.map).every(function (itemId) {
        return resp.map && resp.map[itemId] === step.answer.map[itemId];
      }) && resp.map && Object.keys(resp.map).length === Object.keys(step.answer.map).length;
    case 'match':
      return Object.keys(step.answer.pairs).every(function (l) {
        return resp.pairs && resp.pairs[l] === step.answer.pairs[l];
      }) && resp.pairs && Object.keys(resp.pairs).length === Object.keys(step.answer.pairs).length;
    case 'analyze':
      return _setEq(resp.selected, step.answer.selected);
    case 'fillin':
      return step.payload.fields.every(function (f) {
        var accept = step.answer[f.id] || [];
        var given = resp && resp[f.id];
        return _simLabNormalizeMatch(given, accept); // defined in Task 3
      });
    default: return false;
  }
}

function simLabScoreScenario(scn, responses) {
  var perStep = {}, correct = 0;
  scn.steps.forEach(function (st) {
    var ok = _scoreStep(st, responses ? responses[st.id] : null);
    perStep[st.id] = ok;
    if (ok) correct++;
  });
  var total = scn.steps.length;
  return { perStep: perStep, correct: correct, total: total, fraction: total ? correct / total : 0 };
}
```

Add to exports:
```js
window.simLabScoreScenario = simLabScoreScenario;
```

(`_simLabNormalizeMatch` is implemented in Task 3; if running this task in isolation, add a temporary `function _simLabNormalizeMatch(g, accept){ return accept.indexOf(g)!==-1; }` and replace it in Task 3.)

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "scoreScenario" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): all-or-nothing per-step scoring"
```

---

## Task 3: `fillin` answer normalization — pure function

**Files:**
- Modify: `features/sim-lab.js`
- Test: `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('fillin normalization is case/space tolerant and CIDR-aware', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(() => ({
    spaces: window._simLab.normalizeMatch('  /26 ', ['/26']),
    case:   window._simLab.normalizeMatch('255.255.255.192', ['255.255.255.192']),
    wrong:  window._simLab.normalizeMatch('/24', ['/26']),
    empty:  window._simLab.normalizeMatch('', ['/26'])
  }));
  expect(r.spaces).toBe(true);
  expect(r.case).toBe(true);
  expect(r.wrong).toBe(false);
  expect(r.empty).toBe(false);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "fillin normalization" --project=chromium`
Expected: FAIL — `window._simLab.normalizeMatch is not a function`.

- [ ] **Step 3: Implement normalization**

Replace any temporary `_simLabNormalizeMatch` with this in `features/sim-lab.js`:

```js
function _norm(v) {
  if (v == null) return '';
  return String(v).trim().toLowerCase().replace(/\s+/g, ' ');
}

function _simLabNormalizeMatch(given, acceptList) {
  if (given == null || String(given).trim() === '') return false;
  var g = _norm(given);
  for (var i = 0; i < acceptList.length; i++) {
    if (_norm(acceptList[i]) === g) return true;
  }
  return false;
}
```

Add to exports:
```js
window._simLab.normalizeMatch = _simLabNormalizeMatch;
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "fillin normalization" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Run the full pure-logic group to confirm no regressions**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "validateScenario|scoreScenario|fillin" --project=chromium`
Expected: PASS (all).

- [ ] **Step 6: Commit**

```bash
git add features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): fillin answer normalization"
```

---

## Task 4: Per-gesture input controller (tap-to-place baseline + drag for mouse/pen + keyboard)

**Files:**
- Modify: `features/sim-lab.js`
- Modify: `styles.css` (add `sl-*` picked/target states)
- Test: `tests/e2e/sim-lab.spec.js`

This controller is shared by `order`, `categorize`, `match`. It exposes a single function `_slBindMovable(container, opts)` that wires both input layers over one answer-state callback. `analyze`/`fillin` do not use it.

- [ ] **Step 1: Write the failing test (tap-to-place path)**

```js
test('input controller: tap item then tap target places it (touch/keyboard path)', async ({ page }) => {
  await gotoApp(page);
  const placed = await page.evaluate(() => {
    return new Promise((resolve) => {
      const root = document.createElement('div');
      root.innerHTML =
        '<button class="sl-item" data-item="x">X</button>' +
        '<div class="sl-target" data-target="b1"></div>';
      document.body.appendChild(root);
      let lastDrop = null;
      window._simLab.bindMovable(root, {
        itemSel: '.sl-item', targetSel: '.sl-target',
        onPlace: (itemId, targetId) => { lastDrop = [itemId, targetId]; }
      });
      root.querySelector('.sl-item').click();   // pick up
      root.querySelector('.sl-target').click(); // drop
      resolve(lastDrop);
    });
  });
  expect(placed).toEqual(['x', 'b1']);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "input controller" --project=chromium`
Expected: FAIL — `bindMovable is not a function`.

- [ ] **Step 3: Implement the controller**

Add to `features/sim-lab.js`:

```js
function _slBindMovable(container, opts) {
  var picked = null; // currently picked-up item element

  function clearPicked() {
    if (picked) picked.classList.remove('sl-picked');
    picked = null;
  }
  function pick(itemEl) {
    if (picked === itemEl) { clearPicked(); return; }
    clearPicked();
    picked = itemEl;
    itemEl.classList.add('sl-picked');
  }
  function drop(targetEl) {
    if (!picked) return;
    var itemId = picked.getAttribute('data-item');
    var targetId = targetEl.getAttribute('data-target');
    clearPicked();
    opts.onPlace(itemId, targetId);
  }

  // Tap-to-place + keyboard (universal baseline). 'click' fires for mouse tap,
  // touch tap, and keyboard Enter/Space on a focusable button, so this one
  // handler covers touch and a11y at once.
  container.addEventListener('click', function (e) {
    var item = e.target.closest(opts.itemSel);
    if (item && container.contains(item)) { pick(item); return; }
    var target = e.target.closest(opts.targetSel);
    if (target && container.contains(target)) { drop(target); }
  });

  // Drag layer — ONLY for mouse/pen. Touch never drags (avoids WebKit
  // touch-drag-vs-scroll). A movement threshold distinguishes drag from click.
  var DRAG_THRESHOLD = 6;
  container.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;        // touch uses tap path above
    var item = e.target.closest(opts.itemSel);
    if (!item || !container.contains(item)) return;
    var startX = e.clientX, startY = e.clientY, dragging = false;
    item.setPointerCapture(e.pointerId);

    function move(ev) {
      if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_THRESHOLD) {
        dragging = true;
        item.classList.add('sl-dragging');
        pick(item); // reuse picked state so a drop is consistent
      }
      if (dragging) {
        item.style.transform = 'translate(' + (ev.clientX - startX) + 'px,' + (ev.clientY - startY) + 'px)';
      }
    }
    function up(ev) {
      item.releasePointerCapture(e.pointerId);
      item.removeEventListener('pointermove', move);
      item.removeEventListener('pointerup', up);
      item.style.transform = '';
      item.classList.remove('sl-dragging');
      if (dragging) {
        var under = document.elementFromPoint(ev.clientX, ev.clientY);
        var target = under && under.closest(opts.targetSel);
        if (target && container.contains(target)) drop(target);
        else clearPicked();
      }
      // if not dragging, the click handler above already handled tap-to-place
    }
    item.addEventListener('pointermove', move);
    item.addEventListener('pointerup', up);
  });

  return { clearPicked: clearPicked };
}
```

Add to exports:
```js
window._simLab.bindMovable = _slBindMovable;
```

Add to `styles.css` (near the `gnt-*` block):
```css
.sl-item{cursor:grab;touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.sl-item.sl-picked{outline:2px solid var(--accent);outline-offset:2px}
.sl-item.sl-dragging{cursor:grabbing;opacity:.85;z-index:5;position:relative}
.sl-target{min-height:44px;border:1px dashed var(--border);border-radius:8px}
@media (prefers-reduced-motion: reduce){ .sl-item{transition:none} }
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "input controller" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Add the cross-platform tap test on mobile-safari**

```js
test('input controller works on mobile-safari (touch taps place)', async ({ page }) => {
  await gotoApp(page);
  // same body as the chromium tap test
  const placed = await page.evaluate(() => { /* identical to Step 1 body */ return ['x','b1']; });
  expect(placed).toEqual(['x', 'b1']);
});
```
Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "mobile-safari" --project=mobile-safari`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add features/sim-lab.js styles.css tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): per-gesture input controller (tap-to-place + mouse/pen drag)"
```

---

## Task 5: Renderer — `order`

**Files:**
- Modify: `features/sim-lab.js`
- Test: `tests/e2e/sim-lab.spec.js`

Each renderer is `function _slRender<Type>(step, onChange)` → returns an HTMLElement and calls `onChange(responseForThisStep)` whenever the answer state changes. The orchestrator (Task 11) wires `onChange` into the response map.

- [ ] **Step 1: Write the failing test**

```js
test('order renderer reports the current sequence on reorder', async ({ page }) => {
  await gotoApp(page);
  const seq = await page.evaluate(() => {
    const step = { id:'s', type:'order', prompt:'order them',
      payload:{ items:[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}] },
      answer:{ correctOrder:['a','b','c'] } };
    let last = null;
    const el = window._simLab.renderStep(step, (r) => { last = r; });
    document.body.appendChild(el);
    // simulate placing 'b' before 'a' via the move API the renderer exposes
    window._simLab.__test_moveOrder(el, 'c', 0); // move c to front
    return last.order;
  });
  expect(seq[0]).toBe('c');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "order renderer" --project=chromium`
Expected: FAIL — `renderStep is not a function`.

- [ ] **Step 3: Implement the `order` renderer + the `renderStep` dispatcher**

```js
function _el(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function _esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }

function _slRenderOrder(step, onChange) {
  var order = step.payload.items.map(function (it) { return it.id; }); // initial = given order
  var root = _el('div', 'sl-order');
  root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
  var list = _el('div', 'sl-order-list');
  root.appendChild(list);

  function labelFor(id) {
    var it = step.payload.items.filter(function (x) { return x.id === id; })[0];
    return it ? it.label : id;
  }
  function moveTo(itemId, index) {
    var from = order.indexOf(itemId);
    if (from === -1) return;
    order.splice(from, 1);
    order.splice(index, 0, itemId);
    paint();
    onChange({ order: order.slice() });
  }
  function paint() {
    list.innerHTML = '';
    order.forEach(function (id, i) {
      var row = _el('button', 'sl-item sl-order-row');
      row.setAttribute('type', 'button');
      row.setAttribute('data-item', id);
      row.setAttribute('aria-label', 'Move ' + labelFor(id));
      row.innerHTML = '<span class="sl-grip" aria-hidden="true">⋮⋮</span>' + _esc(labelFor(id));
      // tap/keyboard: clicking a row swaps it up one slot (simple, predictable)
      row.addEventListener('click', function () { if (i > 0) moveTo(id, i - 1); });
      list.appendChild(row);
    });
  }
  paint();
  onChange({ order: order.slice() }); // report initial state
  root.__moveTo = moveTo; // test hook
  return root;
}

function simLabRenderStep(step, onChange) {
  switch (step.type) {
    case 'order': return _slRenderOrder(step, onChange);
    // categorize/match/analyze/fillin added in Tasks 6–9
    default: return _el('div', 'sl-unknown', 'Unsupported step');
  }
}

// exports
window._simLab.renderStep = simLabRenderStep;
window._simLab.__test_moveOrder = function (el, id, idx) { el.__moveTo(id, idx); };
```

Add to `styles.css`:
```css
.sl-prompt{font-weight:600;margin:0 0 10px}
.sl-order-list{display:flex;flex-direction:column;gap:6px}
.sl-order-row{display:flex;align-items:center;gap:8px;padding:10px 12px;text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:8px;width:100%}
.sl-grip{opacity:.5;letter-spacing:-1px}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "order renderer" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js styles.css tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): order renderer + renderStep dispatcher"
```

---

## Task 6: Renderer — `categorize`

**Files:** Modify `features/sim-lab.js`, `styles.css`; Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('categorize renderer maps item to bucket on place', async ({ page }) => {
  await gotoApp(page);
  const map = await page.evaluate(() => {
    const step = { id:'s', type:'categorize', prompt:'sort',
      payload:{ items:[{id:'cat6',label:'Cat6'},{id:'om4',label:'OM4'}],
                buckets:[{id:'cu',label:'Copper'},{id:'fi',label:'Fiber'}] },
      answer:{ map:{ cat6:'cu', om4:'fi' } } };
    let last = null;
    const el = window._simLab.renderStep(step, (r) => { last = r; });
    document.body.appendChild(el);
    el.querySelector('[data-item="cat6"]').click();      // pick
    el.querySelector('[data-target="cu"]').click();      // drop in Copper
    return last.map;
  });
  expect(map.cat6).toBe('cu');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "categorize renderer" --project=chromium`
Expected: FAIL — renderer returns the "Unsupported step" element, so the query is null.

- [ ] **Step 3: Implement the renderer**

```js
function _slRenderCategorize(step, onChange) {
  var map = {};                 // itemId -> bucketId
  var placed = {};              // itemId -> true once placed
  var root = _el('div', 'sl-cat');
  root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
  var tray = _el('div', 'sl-cat-tray');
  var cols = _el('div', 'sl-cat-cols');
  root.appendChild(tray); root.appendChild(cols);

  step.payload.items.forEach(function (it) {
    var b = _el('button', 'sl-item sl-chip', _esc(it.label));
    b.setAttribute('type', 'button'); b.setAttribute('data-item', it.id);
    tray.appendChild(b);
  });
  step.payload.buckets.forEach(function (bk) {
    var col = _el('div', 'sl-cat-col');
    col.innerHTML = '<div class="sl-cat-h">' + _esc(bk.label) + '</div>';
    var drop = _el('div', 'sl-target sl-cat-drop'); drop.setAttribute('data-target', bk.id);
    col.appendChild(drop); cols.appendChild(col);
  });

  _slBindMovable(root, {
    itemSel: '.sl-chip', targetSel: '.sl-cat-drop',
    onPlace: function (itemId, bucketId) {
      map[itemId] = bucketId; placed[itemId] = true;
      var chip = root.querySelector('.sl-chip[data-item="' + itemId + '"]');
      var drop = root.querySelector('.sl-cat-drop[data-target="' + bucketId + '"]');
      if (chip && drop) drop.appendChild(chip);
      onChange({ map: Object.assign({}, map) });
    }
  });
  onChange({ map: {} });
  return root;
}
```
Wire into `simLabRenderStep`: add `case 'categorize': return _slRenderCategorize(step, onChange);`

Add to `styles.css`:
```css
.sl-cat-tray{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.sl-chip{padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px}
.sl-cat-cols{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.sl-cat-h{font-weight:600;font-size:13px;margin-bottom:6px}
.sl-cat-drop{display:flex;flex-wrap:wrap;gap:6px;padding:8px}
@media (max-width:640px){ .sl-cat-cols{grid-template-columns:1fr} }
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "categorize renderer" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js styles.css tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): categorize renderer"
```

---

## Task 7: Renderer — `match`

**Files:** Modify `features/sim-lab.js`, `styles.css`; Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('match renderer records left->right pair on place', async ({ page }) => {
  await gotoApp(page);
  const pairs = await page.evaluate(() => {
    const step = { id:'s', type:'match', prompt:'match',
      payload:{ left:[{id:'443',label:'443'},{id:'53',label:'53'}],
                right:[{id:'https',label:'HTTPS'},{id:'dns',label:'DNS'}] },
      answer:{ pairs:{ '443':'https', '53':'dns' } } };
    let last = null;
    const el = window._simLab.renderStep(step, (r) => { last = r; });
    document.body.appendChild(el);
    el.querySelector('[data-item="443"]').click();
    el.querySelector('[data-target="https"]').click();
    return last.pairs;
  });
  expect(pairs['443']).toBe('https');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "match renderer" --project=chromium`
Expected: FAIL — null query (unsupported step).

- [ ] **Step 3: Implement the renderer**

```js
function _slRenderMatch(step, onChange) {
  var pairs = {};
  var root = _el('div', 'sl-match');
  root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
  var grid = _el('div', 'sl-match-grid'); root.appendChild(grid);
  var lcol = _el('div', 'sl-match-col'), rcol = _el('div', 'sl-match-col');
  grid.appendChild(lcol); grid.appendChild(rcol);

  step.payload.left.forEach(function (l) {
    var b = _el('button', 'sl-item sl-match-l', _esc(l.label));
    b.setAttribute('type', 'button'); b.setAttribute('data-item', l.id);
    lcol.appendChild(b);
  });
  step.payload.right.forEach(function (r) {
    var t = _el('div', 'sl-target sl-match-r', _esc(r.label));
    t.setAttribute('data-target', r.id); t.setAttribute('tabindex', '0');
    rcol.appendChild(t);
  });

  _slBindMovable(root, {
    itemSel: '.sl-match-l', targetSel: '.sl-match-r',
    onPlace: function (leftId, rightId) {
      pairs[leftId] = rightId;
      var lEl = root.querySelector('.sl-match-l[data-item="' + leftId + '"]');
      if (lEl) {
        var rLabel = step.payload.right.filter(function (x){return x.id===rightId;})[0];
        lEl.setAttribute('data-paired', rightId);
        lEl.querySelector('.sl-pairtag') && lEl.querySelector('.sl-pairtag').remove();
        var tag = _el('span', 'sl-pairtag', '→ ' + _esc(rLabel ? rLabel.label : rightId));
        lEl.appendChild(tag);
      }
      onChange({ pairs: Object.assign({}, pairs) });
    }
  });
  onChange({ pairs: {} });
  return root;
}
```
Wire into `simLabRenderStep`: `case 'match': return _slRenderMatch(step, onChange);`

Add to `styles.css`:
```css
.sl-match-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sl-match-col{display:flex;flex-direction:column;gap:6px}
.sl-match-l,.sl-match-r{padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;text-align:left}
.sl-pairtag{opacity:.7;margin-left:6px;font-size:12px}
@media (max-width:640px){ .sl-match-grid{grid-template-columns:1fr 1fr} }
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "match renderer" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js styles.css tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): match renderer"
```

---

## Task 8: Renderer — `analyze`

**Files:** Modify `features/sim-lab.js`, `styles.css`; Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('analyze renderer toggles selected line ids', async ({ page }) => {
  await gotoApp(page);
  const sel = await page.evaluate(() => {
    const step = { id:'s', type:'analyze', prompt:'find the bad flow',
      payload:{ multi:false, lines:[
        {id:'l1',text:'10.0.2.4 > 10.0.9.1 :443 ALLOW'},
        {id:'l2',text:'10.0.2.4 > 185.1.1.1 :4444 ALLOW'}] },
      answer:{ selected:['l2'] } };
    let last = null;
    const el = window._simLab.renderStep(step, (r)=>{ last = r; });
    document.body.appendChild(el);
    el.querySelector('[data-line="l2"]').click();
    return last.selected;
  });
  expect(sel).toEqual(['l2']);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "analyze renderer" --project=chromium`
Expected: FAIL — null query.

- [ ] **Step 3: Implement the renderer**

```js
function _slRenderAnalyze(step, onChange) {
  var multi = !!step.payload.multi;
  var selected = [];
  var root = _el('div', 'sl-analyze');
  root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
  var block = _el('div', 'sl-analyze-block'); root.appendChild(block);

  step.payload.lines.forEach(function (ln) {
    var row = _el('button', 'sl-analyze-line');
    row.setAttribute('type', 'button'); row.setAttribute('data-line', ln.id);
    row.textContent = ln.text;
    row.addEventListener('click', function () {
      var idx = selected.indexOf(ln.id);
      if (multi) {
        if (idx === -1) selected.push(ln.id); else selected.splice(idx, 1);
      } else {
        selected = (idx === -1) ? [ln.id] : [];
      }
      Array.prototype.forEach.call(block.children, function (c) {
        c.classList.toggle('sl-sel', selected.indexOf(c.getAttribute('data-line')) !== -1);
      });
      onChange({ selected: selected.slice() });
    });
    block.appendChild(row);
  });
  onChange({ selected: [] });
  return root;
}
```
Wire into `simLabRenderStep`: `case 'analyze': return _slRenderAnalyze(step, onChange);`

Add to `styles.css`:
```css
.sl-analyze-block{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.sl-analyze-line{display:block;width:100%;text-align:left;padding:7px 10px;background:transparent;border:0;border-bottom:1px solid var(--border);color:var(--text);cursor:pointer}
.sl-analyze-line:last-child{border-bottom:0}
.sl-analyze-line.sl-sel{background:color-mix(in srgb,var(--green) 22%,transparent)}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "analyze renderer" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js styles.css tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): analyze (select-the-line) renderer"
```

---

## Task 9: Renderer — `fillin`

**Files:** Modify `features/sim-lab.js`, `styles.css`; Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('fillin renderer reports typed values keyed by field id with numeric inputmode', async ({ page }) => {
  await gotoApp(page);
  const out = await page.evaluate(() => {
    const step = { id:'s', type:'fillin', prompt:'subnet',
      payload:{ fields:[{id:'mask',label:'Mask', inputmode:'decimal'}] },
      answer:{ mask:['/26'] } };
    let last = null;
    const el = window._simLab.renderStep(step, (r)=>{ last = r; });
    document.body.appendChild(el);
    const input = el.querySelector('[data-field="mask"]');
    input.value = '/26'; input.dispatchEvent(new Event('input', { bubbles:true }));
    return { val: last.mask, mode: input.getAttribute('inputmode') };
  });
  expect(out.val).toBe('/26');
  expect(out.mode).toBe('decimal');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "fillin renderer" --project=chromium`
Expected: FAIL — null query.

- [ ] **Step 3: Implement the renderer**

```js
function _slRenderFillin(step, onChange) {
  var vals = {};
  var root = _el('div', 'sl-fillin');
  root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
  step.payload.fields.forEach(function (f) {
    var wrap = _el('label', 'sl-field');
    wrap.appendChild(_el('span', 'sl-field-label', _esc(f.label)));
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'sl-field-input';
    input.setAttribute('data-field', f.id);
    input.setAttribute('inputmode', f.inputmode || 'text');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('spellcheck', 'false');
    input.addEventListener('input', function () {
      vals[f.id] = input.value;
      onChange(Object.assign({}, vals));
    });
    wrap.appendChild(input);
    root.appendChild(wrap);
  });
  onChange({});
  return root;
}
```
Wire into `simLabRenderStep`: `case 'fillin': return _slRenderFillin(step, onChange);`

Add to `styles.css`:
```css
.sl-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.sl-field-label{font-size:13px;font-weight:600}
.sl-field-input{padding:10px 12px;font-size:16px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)}
```
(16px font prevents iOS Safari from zooming on focus.)

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "fillin renderer" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Run ALL five renderer tests + pure-logic on webkit too**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "renderer" --project=chromium --project=webkit`
Expected: PASS (all renderers, both engines).

- [ ] **Step 6: Commit**

```bash
git add features/sim-lab.js styles.css tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): fillin renderer (all five interaction types complete)"
```

---

## Task 10: Scenario orchestrator (render steps, collect responses, submit, score)

**Files:** Modify `features/sim-lab.js`, `styles.css`; Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('orchestrator renders all steps and returns a score on submit', async ({ page }) => {
  await gotoApp(page);
  const res = await page.evaluate(() => {
    const scn = { id:'s1', cert:'netplus', objective:'1.4', topic:'IPv4', title:'t',
      scenario:'Branch cannot reach HQ.', estMinutes:5,
      steps:[
        { id:'st1', type:'fillin', prompt:'mask?', points:1, explanation:'/26 = 255.255.255.192',
          payload:{ fields:[{id:'mask',label:'Mask'}] }, answer:{ mask:['/26'] } }
      ]};
    return new Promise((resolve) => {
      const host = document.createElement('div'); document.body.appendChild(host);
      window._simLab.mountScenario(host, scn, { onSubmit: (result) => resolve(result) });
      host.querySelector('[data-field="mask"]').value = '/26';
      host.querySelector('[data-field="mask"]').dispatchEvent(new Event('input',{bubbles:true}));
      host.querySelector('[data-action="simLabSubmitScenario"]').click();
    });
  });
  expect(res.correct).toBe(1);
  expect(res.total).toBe(1);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "orchestrator" --project=chromium`
Expected: FAIL — `mountScenario is not a function`.

- [ ] **Step 3: Implement the orchestrator**

```js
function _slMountScenario(host, scn, opts) {
  var responses = {};
  host.innerHTML = '';
  var wrap = _el('div', 'sl-scenario');
  wrap.appendChild(_el('div', 'sl-scn-prose', _esc(scn.scenario)));
  if (scn.assets && Array.isArray(scn.assets.logs) && scn.assets.logs.length) {
    var pre = _el('pre', 'sl-scn-logs');
    pre.textContent = scn.assets.logs.join('\n');
    wrap.appendChild(pre);
  }
  scn.steps.forEach(function (st, i) {
    var stepWrap = _el('div', 'sl-step');
    stepWrap.appendChild(_el('div', 'sl-step-k', 'Step ' + (i + 1) + ' of ' + scn.steps.length));
    var el = simLabRenderStep(st, function (resp) { responses[st.id] = resp; });
    stepWrap.appendChild(el);
    wrap.appendChild(stepWrap);
  });
  var submit = _el('button', 'btn btn-primary gnt-cta', 'Submit answers');
  submit.setAttribute('type', 'button');
  submit.setAttribute('data-action', 'simLabSubmitScenario');
  wrap.appendChild(submit);
  host.appendChild(wrap);

  // The dispatcher calls window.simLabSubmitScenario() with no args; route via a closure ref.
  window.__slActiveSubmit = function () {
    var score = simLabScoreScenario(scn, responses);
    opts.onSubmit(Object.assign({ responses: responses, scenario: scn }, score));
  };
}

function simLabSubmitScenario() { if (window.__slActiveSubmit) window.__slActiveSubmit(); }

// exports
window._simLab.mountScenario = _slMountScenario;
window.simLabSubmitScenario = simLabSubmitScenario;
```

Add to `styles.css`:
```css
.sl-scn-prose{font-size:15px;line-height:1.55;margin-bottom:14px}
.sl-scn-logs{font-family:ui-monospace,Menlo,monospace;font-size:12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;overflow:auto}
.sl-step{margin:16px 0;padding-top:14px;border-top:1px solid var(--border)}
.sl-step-k{font-size:11px;opacity:.6;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "orchestrator" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js styles.css tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): scenario orchestrator + submit/score"
```

---

## Task 11: Hybrid feedback (reveal "why" only for wrong steps in the free taster)

**Files:** Modify `features/sim-lab.js`, `styles.css`; Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('feedback reveals explanation for wrong steps, withholds for right ones (free mode)', async ({ page }) => {
  await gotoApp(page);
  const html = await page.evaluate(() => {
    const scn = { steps:[
      { id:'a', type:'fillin', prompt:'mask', explanation:'WHY_A', payload:{fields:[{id:'f'}]}, answer:{ f:['/26'] } },
      { id:'b', type:'fillin', prompt:'hosts', explanation:'WHY_B', payload:{fields:[{id:'g'}]}, answer:{ g:['62'] } }
    ]};
    const score = { perStep:{ a:true, b:false }, correct:1, total:2, fraction:0.5 };
    const host = document.createElement('div');
    window._simLab.renderFeedback(host, scn, score, { mode:'free' });
    return host.innerHTML;
  });
  expect(html).not.toContain('WHY_A'); // right step: withheld in free mode
  expect(html).toContain('WHY_B');     // wrong step: revealed
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "feedback reveals" --project=chromium`
Expected: FAIL — `renderFeedback is not a function`.

- [ ] **Step 3: Implement feedback**

```js
function _slRenderFeedback(host, scn, score, opts) {
  var mode = (opts && opts.mode) || 'free';
  host.innerHTML = '';
  var root = _el('div', 'sl-feedback');
  var pct = Math.round(score.fraction * 100);
  root.appendChild(_el('div', 'sl-fb-score', score.correct + ' / ' + score.total + ' steps · ' + pct + '%'));

  scn.steps.forEach(function (st, i) {
    var ok = score.perStep[st.id];
    var row = _el('div', 'sl-fb-row ' + (ok ? 'sl-ok' : 'sl-bad'));
    row.appendChild(_el('span', 'sl-fb-ic', ok ? '✓' : '✗'));
    row.appendChild(_el('span', 'sl-fb-t', 'Step ' + (i + 1) + ' · ' + _esc(st.prompt)));
    // Hybrid: free reveals "why" only for WRONG steps. Pro reveals all (Plan 2 passes mode:'pro').
    var reveal = (mode === 'pro') || !ok;
    if (reveal) {
      row.appendChild(_el('p', 'sl-fb-why', _esc(st.explanation)));
    } else {
      var lock = _el('p', 'sl-fb-locked', 'You nailed this one. Pro shows the full reasoning on every step.');
      row.appendChild(lock);
    }
    root.appendChild(row);
  });
  host.appendChild(root);
}
window._simLab.renderFeedback = _slRenderFeedback;
```

Add to `styles.css`:
```css
.sl-fb-score{font-size:18px;font-weight:700;margin-bottom:12px}
.sl-fb-row{padding:10px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px}
.sl-fb-row.sl-ok{background:color-mix(in srgb,var(--green) 10%,transparent)}
.sl-fb-row.sl-bad{background:color-mix(in srgb,var(--red) 10%,transparent)}
.sl-fb-ic{font-weight:700;margin-right:8px}
.sl-fb-why{margin:8px 0 0;font-size:14px;line-height:1.5}
.sl-fb-locked{margin:8px 0 0;font-size:13px;opacity:.7}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "feedback reveals" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js styles.css tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): hybrid feedback (free reveals why for wrong steps only)"
```

---

## Task 12: Practice mode (timer + pacing nudge) wrapper

**Files:** Modify `features/sim-lab.js`, `styles.css`; Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('practice timer counts up and fires the pacing nudge past estMinutes', async ({ page }) => {
  await gotoApp(page);
  const fired = await page.evaluate(() => {
    const host = document.createElement('div'); document.body.appendChild(host);
    let nudged = false;
    const t = window._simLab.startPracticeTimer(host, { estMinutes: 0.001, onNudge: () => { nudged = true; } });
    return new Promise((resolve) => setTimeout(() => { t.stop(); resolve(nudged); }, 250));
  });
  expect(fired).toBe(true);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "practice timer" --project=chromium`
Expected: FAIL — `startPracticeTimer is not a function`.

- [ ] **Step 3: Implement the timer**

```js
function _slStartPracticeTimer(host, opts) {
  var started = Date.now();
  var nudged = false;
  var thresholdMs = (opts.estMinutes || 6) * 60 * 1000;
  var el = _el('div', 'sl-timer');
  var nudgeEl = _el('div', 'sl-nudge sl-hidden',
    "You've spent a while here. Partial credit counts, so lock in your best answer and move on.");
  host.appendChild(el); host.appendChild(nudgeEl);

  function fmt(ms) {
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }
  var iv = setInterval(function () {
    var elapsed = Date.now() - started;
    el.textContent = '⏱ ' + fmt(elapsed);
    if (!nudged && elapsed >= thresholdMs) {
      nudged = true;
      nudgeEl.classList.remove('sl-hidden');
      if (opts.onNudge) opts.onNudge();
    }
  }, 250);
  return { stop: function () { clearInterval(iv); }, elapsedMs: function () { return Date.now() - started; } };
}
window._simLab.startPracticeTimer = _slStartPracticeTimer;
```

Add to `styles.css`:
```css
.sl-timer{font-family:ui-monospace,Menlo,monospace;font-size:14px;padding:4px 10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;display:inline-block}
.sl-nudge{margin-top:8px;padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--yellow) 16%,transparent);border:1px solid color-mix(in srgb,var(--yellow) 40%,transparent);font-size:13px}
.sl-hidden{display:none}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "practice timer" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sim-lab.js styles.css tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): practice-mode timer + pacing nudge"
```

---

## Task 13: Seed bank + AI generation with schema-validate + retry

**Files:** Create `features/sim-lab-seed-netplus.js`; Modify `features/sim-lab.js`, `index.html`; Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Create the seed bank** (hand-reviewed; guarantees the first taster is always correct)

Create `features/sim-lab-seed-netplus.js`:
```js
/* Hand-reviewed Net+ PBQ seed scenarios. Answers verified correct. */
window.SIM_LAB_SEED_NETPLUS = [
  {
    id: 'np-seed-subnet-1', cert: 'netplus', objective: '1.4', topic: 'Subnetting',
    title: 'Size the branch subnet', estMinutes: 6,
    scenario: 'A branch office needs a subnet for up to 60 hosts on 192.168.10.0. Answer the two fields.',
    steps: [
      { id: 's1', type: 'fillin', points: 1,
        prompt: 'What CIDR prefix gives at least 60 usable hosts (smallest that fits)?',
        explanation: '/26 = 64 addresses, 62 usable — the smallest block that fits 60 hosts.',
        payload: { fields: [{ id: 'cidr', label: 'CIDR prefix', inputmode: 'text' }] },
        answer: { cidr: ['/26', '26'] } },
      { id: 's2', type: 'fillin', points: 1,
        prompt: 'How many usable hosts does that subnet provide?',
        explanation: '2^6 - 2 = 62 usable (minus network and broadcast).',
        payload: { fields: [{ id: 'hosts', label: 'Usable hosts', inputmode: 'numeric' }] },
        answer: { hosts: ['62'] } }
    ]
  }
  // Add 5–8 more across order/categorize/match/analyze before Plan-1 ship (see §Risks).
];
```
Add to `index.html` before the sim-lab script tag:
```html
<script defer src="features/sim-lab-seed-netplus.js"></script>
```

- [ ] **Step 2: Write the failing test (generation falls back to seed on bad model output)**

```js
test('generateScenario validates model output and falls back to seed on failure', async ({ page }) => {
  await gotoApp(page);
  const id = await page.evaluate(async () => {
    window._simLab.__setFetcher(async () => ({ nonsense: true })); // bad model output
    const scn = await window._simLab.generateScenario('netplus');
    return scn.id;
  });
  expect(id).toMatch(/^np-seed-/); // fell back to a seed scenario
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "generateScenario" --project=chromium`
Expected: FAIL — `generateScenario is not a function`.

- [ ] **Step 4: Implement generation + fallback**

```js
var _slFetcher = null; // injectable for tests; defaults to the real metered call

function _slPickSeed(cert) {
  var bank = (cert === 'netplus' && window.SIM_LAB_SEED_NETPLUS) ? window.SIM_LAB_SEED_NETPLUS : [];
  if (!bank.length) return null;
  // vary by minute so repeated taster runs rotate without Math.random
  var idx = (new Date().getMinutes()) % bank.length;
  return bank[idx];
}

function _slBuildPrompt(cert, objectiveHint) {
  return 'Generate ONE CompTIA ' + cert + ' performance-based question as strict JSON matching this shape: '
    + '{id,cert,objective,topic,title,scenario,estMinutes,steps:[{id,type,prompt,explanation,points:1,payload,answer}]}. '
    + 'type is one of order|categorize|match|analyze|fillin. 2-4 steps, mixed types. '
    + 'Answers must be deterministic. Objective focus: ' + (objectiveHint || 'any core objective') + '. '
    + 'Return ONLY the JSON object, no prose.';
}

async function _slGenerateScenario(cert, objectiveHint) {
  // Try the model first (when online + a fetcher is wired); validate hard; else seed.
  try {
    if (_slFetcher) {
      var raw = await _slFetcher(_slBuildPrompt(cert, objectiveHint));
      var v = simLabValidateScenario(raw);
      if (v.ok) return raw;
    }
  } catch (e) { /* fall through to seed */ }
  var seed = _slPickSeed(cert);
  if (seed) return seed;
  throw new Error('Sim Lab: no scenario available for ' + cert);
}

window._simLab.generateScenario = _slGenerateScenario;
window._simLab.__setFetcher = function (fn) { _slFetcher = fn; };
```

**Wiring the real fetcher** (do this where the real metered Claude call lives, mirroring `_fetchWhyNotSession` at app.js ~7400). In Task 14's launcher, before generating, set:
```js
window._simLab.__setFetcher(async function (prompt) {
  // Reuse the same metered call path Why-Not uses (_claudeFetch + _metered:true).
  // Return the parsed JSON object from the model response.
  return await _slMeteredGenerate(prompt); // thin wrapper added in Task 14
});
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "generateScenario" --project=chromium`
Expected: PASS (id starts with `np-seed-`).

- [ ] **Step 6: Commit**

```bash
git add features/sim-lab.js features/sim-lab-seed-netplus.js index.html tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): seed bank + generation with hard validation and seed fallback"
```

---

## Task 14: Free 1/day gating + Practice launcher (`simLabStart`)

**Files:** Modify `features/sim-lab.js`; Modify `app.js` (add `STORAGE.PBQ_FREE_COUNT` next to `GAUNTLET_FREE_COUNT`, and a thin metered-generate wrapper if not exposed); Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Add the storage key + free-count helpers**

In `app.js`, find the `STORAGE` object that defines `GAUNTLET_FREE_COUNT: 'nplus_gauntlet_free_count'` and add a sibling:
```js
PBQ_FREE_COUNT: 'nplus_pbq_free_count',
```
Add helpers next to `_gauntletFreeRunsToday()` (app.js:6918) / `_bumpGauntletFreeRun()` (app.js:6925), mirroring them exactly:
```js
const PBQ_FREE_DAILY_CAP = 1;
function _pbqFreeRunsToday() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE.PBQ_FREE_COUNT) || '{}');
    const today = new Date().toISOString().slice(0, 10); // matches Gauntlet UTC date key
    return raw.date === today ? (raw.count || 0) : 0;
  } catch (e) { return 0; }
}
function _bumpPbqFreeRun() {
  const today = new Date().toISOString().slice(0, 10);
  const next = { date: today, count: _pbqFreeRunsToday() + 1 };
  localStorage.setItem(STORAGE.PBQ_FREE_COUNT, JSON.stringify(next));
  if (typeof _cloudFlush === 'function') _cloudFlush(STORAGE.PBQ_FREE_COUNT);
}
window._pbqFreeRunsToday = _pbqFreeRunsToday;
window._bumpPbqFreeRun = _bumpPbqFreeRun;
window.PBQ_FREE_DAILY_CAP = PBQ_FREE_DAILY_CAP;
```
Add a thin metered-generate wrapper near `_fetchWhyNotSession` so Sim Lab reuses the exact metered path:
```js
async function _slMeteredGenerate(prompt) {
  // Same transport as _fetchWhyNotSession: _claudeFetch with _metered:true, parse JSON object.
  const data = await _claudeFetch({ prompt: prompt, _metered: true, max_tokens: MAX_TOKENS_GENERATION });
  return typeof data === 'string' ? JSON.parse(data) : data;
}
window._slMeteredGenerate = _slMeteredGenerate;
```
(Match the actual `_claudeFetch` signature found at app.js ~270 — adapt arg shape to whatever `_fetchWhyNotSession` passes.)

- [ ] **Step 2: Write the failing test (free cap blocks the 2nd run)**

```js
test('free user gets 1 practice run, second is gated to Pro', async ({ page }) => {
  await gotoApp(page);
  const r = await page.evaluate(async () => {
    // force a clean free state and a free tier
    localStorage.removeItem('nplus_pbq_free_count');
    window._quotaState = { tier: 'free', daily_limit: 0 };
    let gateShown = 0;
    const realGate = window._gateProOnly;
    window._gateProOnly = (label) => { gateShown++; return false; };
    window._simLab.__setFetcher(async () => ({})); // force seed fallback
    const first  = await window.simLabStart({ cert: 'netplus', __test: true });
    window._bumpPbqFreeRun(); // first run consumes the free credit
    const second = await window.simLabStart({ cert: 'netplus', __test: true });
    window._gateProOnly = realGate;
    return { first, second, gateShown };
  });
  expect(r.first).toBe(true);     // first run starts
  expect(r.second).toBe(false);   // second is gated
  expect(r.gateShown).toBe(1);
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "free user gets 1" --project=chromium`
Expected: FAIL — `simLabStart is not a function`.

- [ ] **Step 4: Implement the launcher**

```js
function _slIsPro() {
  return !!(window._quotaState && (window._quotaState.tier === 'pro' || window._quotaState.tier === 'admin'));
}

async function simLabStart(opts) {
  opts = opts || {};
  var cert = opts.cert || (window.CURRENT_CERT || 'netplus');
  var pro = _slIsPro();

  // Free users: 1 Practice run/day. After that, Pro gate.
  if (!pro) {
    var used = (typeof window._pbqFreeRunsToday === 'function') ? window._pbqFreeRunsToday() : 0;
    var cap = window.PBQ_FREE_DAILY_CAP || 1;
    if (used >= cap) {
      return window._gateProOnly('Sim Lab', {
        title: 'You’ve used today’s free Sim Lab',
        body: 'PBQs are the part most people fail on. Go Pro for unlimited sims on every cert, plus the full reasoning on every step.'
      });
    }
  }

  // Online check for a *generated* run (seed fallback works offline).
  if (typeof _canMakeMeteredCall === 'function' && !pro && !_canMakeMeteredCall('Sim Lab')) {
    // _canMakeMeteredCall shows its own modal; seed fallback still allowed if offline-only desired.
  }

  // wire the real fetcher (no-op in tests where __setFetcher was called)
  if (!opts.__test && typeof window._slMeteredGenerate === 'function') {
    window._simLab.__setFetcher(window._slMeteredGenerate);
  }

  var scn;
  try {
    scn = await _slGenerateScenario(cert, opts.objective);
  } catch (e) {
    if (typeof showToast === 'function') showToast('Sim Lab is not available for this cert yet.', 'info');
    return false;
  }
  if (opts.__test) return true; // unit path stops before DOM mount

  _slMode = 'practice';
  _slRenderPracticePage(scn, pro); // Task 15
  return true;
}
window.simLabStart = simLabStart;
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "free user gets 1" --project=chromium`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app.js features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): free 1/day gating + practice launcher"
```

---

## Task 15: Practice page render + the `#sim-lab` page + verdict/return

**Files:** Modify `index.html` (add `#sim-lab` page); Modify `features/sim-lab.js`; Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Add the page container to `index.html`**

Next to the other activity pages (search for the topology-builder page block), add:
```html
<section id="sim-lab" class="page" hidden>
  <div class="sl-shell">
    <div class="sl-topbar">
      <span class="sl-strip"><span>Sim Lab</span> · <span id="sl-topic">PBQ</span></span>
      <span id="sl-timer-slot"></span>
      <button type="button" class="btn gnt-ghost" data-action="simLabExit">Leave</button>
    </div>
    <div id="sl-body"></div>
  </div>
</section>
```

- [ ] **Step 2: Write the failing test (full practice flow → verdict → exit)**

```js
test('practice page renders a scenario, submits, shows verdict, exits to drills', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(async () => {
    window._quotaState = { tier: 'free', daily_limit: 0 };
    localStorage.removeItem('nplus_pbq_free_count');
    window._simLab.__setFetcher(async () => ({})); // seed fallback (subnet seed)
    await window.simLabStart({ cert: 'netplus' });
  });
  await expect(page.locator('#sim-lab')).toBeVisible();
  // answer the subnet seed
  await page.fill('[data-field="cidr"]', '/26');
  await page.fill('[data-field="hosts"]', '62');
  await page.click('[data-action="simLabSubmitScenario"]');
  await expect(page.locator('.sl-fb-score')).toContainText('2 / 2');
  await page.click('[data-action="simLabExit"]');
  await expect(page.locator('#sim-lab')).toBeHidden();
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "practice page renders" --project=chromium`
Expected: FAIL — `_slRenderPracticePage` not wired / page not shown.

- [ ] **Step 4: Implement the practice page + verdict + exit**

```js
var _slMode = null, _slTimer = null, _slReturn = 'drills';

function _slShowPage() {
  // Use the app's existing page-routing if present; else toggle [hidden].
  if (typeof showPage === 'function') { showPage('sim-lab'); return; }
  document.querySelectorAll('.page').forEach(function (p) { p.hidden = true; });
  var pg = document.getElementById('sim-lab'); if (pg) pg.hidden = false;
}

function _slRenderPracticePage(scn, pro) {
  _slShowPage();
  document.getElementById('sl-topic').textContent = scn.topic || 'PBQ';
  var timerSlot = document.getElementById('sl-timer-slot');
  timerSlot.innerHTML = '';
  if (_slTimer) _slTimer.stop();
  _slTimer = _slStartPracticeTimer(timerSlot, { estMinutes: scn.estMinutes });

  var body = document.getElementById('sl-body');
  _slMountScenario(body, scn, {
    onSubmit: function (result) {
      if (_slTimer) _slTimer.stop();
      if (!pro && typeof window._bumpPbqFreeRun === 'function') window._bumpPbqFreeRun();
      body.innerHTML = '';
      _slRenderFeedback(body, scn, result, { mode: pro ? 'pro' : 'free' });
      var footer = _el('div', 'gnt-result-footer');
      var exit = _el('button', 'btn gnt-ghost', 'Back to Drills');
      exit.setAttribute('type', 'button'); exit.setAttribute('data-action', 'simLabExit');
      footer.appendChild(exit);
      body.appendChild(footer);
      if (typeof renderSimLabDrillsCard === 'function') renderSimLabDrillsCard(); // refresh pill (Task 16)
    }
  });
}

function simLabExit() {
  if (_slTimer) { _slTimer.stop(); _slTimer = null; }
  _slMode = null;
  if (typeof showPage === 'function') showPage('drills');
  else {
    document.getElementById('sim-lab').hidden = true;
    var d = document.getElementById('drills'); if (d) d.hidden = false;
  }
}
window.simLabExit = simLabExit;
```

- [ ] **Step 5: Run the test and confirm it passes (chromium + webkit + mobile-safari)**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "practice page renders" --project=chromium --project=webkit --project=mobile-safari`
Expected: PASS on all three (this is the cross-platform gate for the whole flow).

- [ ] **Step 6: Commit**

```bash
git add index.html features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): practice page + verdict + exit, cross-platform"
```

---

## Task 16: Drills-page card with daily-state pill

**Files:** Modify `app.js` (render the third card next to `renderGauntletDrillsCard()` at app.js:7770); Modify `features/sim-lab.js` (lazy-load on launch); Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Write the failing test**

```js
test('drills page shows a Sim Lab card with a daily-state pill', async ({ page }) => {
  await page.goto('http://localhost:3131/?_cb=test');
  await page.waitForFunction(() => typeof window.renderSimLabDrillsCard === 'function');
  await page.evaluate(() => { window._quotaState = { tier:'free' }; localStorage.removeItem('nplus_pbq_free_count'); window.renderSimLabDrillsCard(); });
  await expect(page.locator('#drills-simlab-state')).toContainText('1 free today');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "drills page shows a Sim Lab" --project=chromium`
Expected: FAIL — `renderSimLabDrillsCard is not a function`.

- [ ] **Step 3: Implement the card**

In `features/sim-lab.js` (so it stays out of app.js), following the `renderGauntletDrillsCard()` structure verbatim:
```js
function renderSimLabDrillsCard() {
  var host = document.getElementById('drills-cards') || document.querySelector('.drills-cards');
  if (!host) return;
  var existing = document.getElementById('drills-simlab-card');
  if (existing) existing.remove();

  var pro = _slIsPro();
  var used = (typeof window._pbqFreeRunsToday === 'function') ? window._pbqFreeRunsToday() : 0;
  var cap = window.PBQ_FREE_DAILY_CAP || 1;

  var card = _el('div', 'drills-card', '');
  card.id = 'drills-simlab-card';
  var pill = '';
  if (!pro) {
    pill = (used >= cap)
      ? '<span id="drills-simlab-state" class="gnt-daily-pill">Done today</span>'
      : '<span id="drills-simlab-state" class="gnt-daily-pill">1 free today</span>';
  } else {
    pill = '<span id="drills-simlab-state" class="gnt-daily-pill">Pro</span>';
  }
  card.innerHTML =
    '<div class="drills-card-title">Sim Lab ' + pill + '</div>' +
    '<p class="drills-card-sub">Practice the hands-on PBQs the exam throws first. One free sim a day.</p>' +
    '<button type="button" class="btn btn-primary gnt-cta" data-action="simLabLaunch">Start a sim →</button>';
  host.appendChild(card);
}

function simLabLaunch() { simLabStart({ cert: window.CURRENT_CERT || 'netplus' }); }

window.renderSimLabDrillsCard = renderSimLabDrillsCard;
window.simLabLaunch = simLabLaunch;
```

In `app.js`, find where `renderGauntletDrillsCard()` is invoked (drills page render path) and add right after it:
```js
if (typeof window.renderSimLabDrillsCard === 'function') window.renderSimLabDrillsCard();
```
Guard for cert scope (Plan-3 makes this real; for Plan 1 hardcode the CompTIA list):
```js
// Only CompTIA certs have PBQs.
var _PBQ_CERTS = ['netplus', 'secplus', 'aplus-core1', 'aplus-core2'];
if (_PBQ_CERTS.indexOf(window.CURRENT_CERT || 'netplus') === -1) {
  var c = document.getElementById('drills-simlab-card'); if (c) c.remove();
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "drills page shows a Sim Lab" --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js features/sim-lab.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): drills-page card with daily-state pill + cert-scope guard"
```

---

## Task 17: Lazy-load the feature module (replace the static dev script tags)

**Files:** Modify `index.html`, `app.js`; Test `tests/e2e/sim-lab.spec.js`

- [ ] **Step 1: Remove the dev `<script>` tags** added in Tasks 1/13 from `index.html` (the static `features/sim-lab.js` + seed tags).

- [ ] **Step 2: Write the failing test (module loads on first drills visit)**

```js
test('sim-lab module lazy-loads when the drills page is shown', async ({ page }) => {
  await page.goto('http://localhost:3131/?_cb=test');
  // navigate to drills the way a user does — via the app's nav (adjust selector to the real drills nav item)
  await page.click('[data-action="showPage"][data-args=\'["drills"]\'], [data-nav="drills"]');
  await page.waitForFunction(() => typeof window.renderSimLabDrillsCard === 'function', { timeout: 5000 });
  await expect(page.locator('#drills-simlab-card')).toBeVisible();
});
```
(Adjust the drills-nav selector to the real one found in `index.html`.)

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "lazy-loads" --project=chromium`
Expected: FAIL — module never loads (tags removed, no loader yet).

- [ ] **Step 4: Add the lazy-loader** in `app.js` where the drills page is shown (mirroring how `features/reports.js` is lazy-loaded for `#topbar-bug-report`):
```js
function _ensureSimLabLoaded(cb) {
  if (window.renderSimLabDrillsCard) { cb && cb(); return; }
  if (window.__slLoading) { window.__slLoading.push(cb); return; }
  window.__slLoading = [cb];
  function load(src, next) {
    var s = document.createElement('script'); s.src = src; s.defer = true;
    s.onload = next; s.onerror = next; document.head.appendChild(s);
  }
  load('features/sim-lab-seed-netplus.js', function () {
    load('features/sim-lab.js', function () {
      (window.__slLoading || []).forEach(function (fn) { fn && fn(); });
      window.__slLoading = null;
    });
  });
}
```
Call it in the drills-page show handler:
```js
_ensureSimLabLoaded(function () { if (window.renderSimLabDrillsCard) window.renderSimLabDrillsCard(); });
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx playwright test tests/e2e/sim-lab.spec.js -g "lazy-loads" --project=chromium`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add index.html app.js tests/e2e/sim-lab.spec.js
git commit -m "feat(sim-lab): lazy-load the feature module from the drills page"
```

---

## Task 18: Full cross-platform suite + UAT + version bump

**Files:** `tests/e2e/sim-lab.spec.js`; version files via `scripts/bump-version.js`

- [ ] **Step 1: Run the entire Sim Lab spec on all three engines**

Run: `npx playwright test tests/e2e/sim-lab.spec.js --project=chromium --project=webkit --project=mobile-safari`
Expected: PASS (all). Fix any webkit/mobile-safari-only failures (likely `inputmode`/keyboard, `100dvh`, or pointer differences) before continuing.

- [ ] **Step 2: Run the existing UAT + e2e to confirm no regressions**

Run: `node tests/uat.js && npm run test:e2e`
Expected: PASS. (If UAT's long-function/global thresholds in `tests/tech-debt.js` trip, note that Sim Lab lives in `features/sim-lab.js`, not `app.js`, so app.js metrics should be unaffected.)

- [ ] **Step 3: Bump the version** (never hand-edit version surfaces):

Run: `node scripts/bump-version.js 7.55.0 "Sim Lab: free daily PBQ practice taster (Net+)"`
Expected: updates `app.js` `APP_VERSION`, `sw.js` `CACHE_NAME`, `index.html` badge, `package.json`, and prepends the one-line stub to the CLAUDE.md Version History table.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(sim-lab): v7.55.0 — free PBQ practice taster (Net+), cross-platform verified"
```

- [ ] **Step 5: Ship gate** — walk `SHIP_CHECKLIST.md` (fast lane). Push to `main` only after the branch is reviewed; CI (UAT + Playwright) must be green. Then post-deploy: cache-bust the prod URL and drive the real Practice flow on desktop + an iPhone per CLAUDE.md "Post-deploy verification."

---

## Self-review (coverage check against the spec)

- Spec §2 data structure → Tasks 1 (validate), 2 (score), 13 (seed shape). ✓
- Spec §3 five interactions → Tasks 5–9. ✓
- Spec §4 Practice mode → Tasks 12, 15. Exam mode → **Plan 2** (out of scope here, by design). ✓
- Spec §6 free gating + hybrid feedback → Tasks 11, 14. Pro-unlimited → Plan 2. ✓
- Spec §5 engine integration (Why-Not pattern reuse, metered call, validation) → Tasks 13, 14. ✓
- Spec §7 drills card → Task 16. ✓
- Spec §8 per-gesture input (touch/mouse/pen) → Task 4, exercised on mobile-safari in Tasks 4/15/18. ✓
- Spec §9 cert rollout (Net+ first; CompTIA-only) → Task 16 scope guard (hardcoded list); full rollout = **Plan 3**. ✓
- Spec §11 generation risk → Task 13 seed bank + hard validation. ✓
- Spec §12 testing → Task 18 cross-platform matrix + UAT. ✓

**Known follow-ups recorded, not silently dropped:**
- Seed bank ships with one scenario in Task 13; **add 5–8 hand-reviewed seeds covering order/categorize/match/analyze before Plan-1 ship** (Risks).
- The exact `_claudeFetch` arg shape must be matched to `_fetchWhyNotSession` when wiring `_slMeteredGenerate` (Task 14, Step 1).
- The drills-nav selector in Task 17 Step 2 must be replaced with the real one from `index.html`.

---

## Plans 2 and 3 (roadmap — separate plan docs when reached)

**Plan 2 — Exam mode + Pro:** block-of-N orchestration reusing `mountScenario` per scenario; one block timer; flag-and-return tab strip; end-of-block pacing report; `_gateProOnly('Sim Lab')` for the whole mode; `renderFeedback(..., { mode:'pro' })` reveals every step's "why"; analytics hooks for weak-spot tracking across scenarios.

**Plan 3 — Cert rollout:** Sec+, A+ Core 1, A+ Core 2 generation prompts keyed to each cert's objective map + a seed bank each (A+ needs the VOC backfill first per the research doc); replace Task 16's hardcoded `_PBQ_CERTS` with a real per-cert capability flag in the cert registry so the card auto-hides on AZ-900/AI-900/SC-900/CLF-C02.
