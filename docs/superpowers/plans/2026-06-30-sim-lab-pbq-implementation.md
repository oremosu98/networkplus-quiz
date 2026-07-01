---
up: "[[Drills MOC]]"
type: plan
status: active
cert: netplus, secplus
updated: 2026-06-30
tags: [plan, drill, pbq]
---
# Sim Lab PBQ Archetypes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new Sim Lab scenario archetypes — Diagram PBQ (Net+), Incident Response (Sec+), and Defense in Depth (Net+ & Sec+) — to the live Sim Lab engine, by extending it with one new step type (`configure`) and pluggable visual `reference` assets, then authoring validated seed banks.

**Architecture:** The Sim Lab engine already exists and is live in `features/sim-lab.js` (scenario model, 5 step renderers via `simLabRenderStep`, `simLabValidateScenario`, `simLabScoreScenario`, `_slMountScenario`, seed-bank picking). This feature ADDS: (1) a `configure` step type (per-slot dropdowns, per-slot partial credit), (2) three SVG `reference` renderers (`network`, `timeline`, `layered`) rendered decoupled above the steps, (3) a deterministic Net+ fidelity validator (subnetting math), and (4) seed-bank content authored through a two-agent consensus gate. The four approved concept mockups in `mockups/` are the faithful-lift source of truth for all visuals/CSS.

**Tech Stack:** Vanilla ES5-style JS (no build step, IIFE module), native `<select>` for cross-platform (Desktop/Safari/iOS Capacitor), `tests/uat.js` (behavioral UAT, ~4252 checks), forged-bronze design tokens in `dg-system.css`.

**Lane:** Fast lane (JS + content; no schema/auth/sw/money). Build on branch `feat/sim-lab-pbq-archetypes` (already created; design docs committed at 97ec573).

---

## Reference contracts (used across tasks — keep names identical)

**`configure` step:**
```js
{
  id: 'string', type: 'configure', prompt: 'string', explanation: 'string', points: 1,
  payload: { slots: [ { id: 'string', label: 'string', options: [ { id: 'string', text: 'string' } ] } ] }, // each slot: options.length >= 2
  answer:  { slots: { /* slotId: correctOptionId */ } }  // one correct option id per slot; must exist in that slot's options
}
```
Renderer reports response via `onChange({ slots: { slotId: selectedOptionId } })`.
Scoring: **per-slot** — slot correct iff `response.slots[slotId] === answer.slots[slotId]`.

**`reference` asset (optional, on `scenario.assets.reference`):**
```js
// network (Net+ Diagram; also Sec+ IR "under attack" via device.state + link.kind)
{ kind:'network', devices:[{ id,label,type,zone,ip?,mask?,gateway?,x,y,state? /* 'clean'|'affected'|'compromised' */ }],
  links:[{ from,to,kind? /* 'normal'|'attack' */ }], given?:{ networkId?, mask?, cli?:[ 'string' ] } }
// timeline (Sec+ IR attack timeline)
{ kind:'timeline', stages:[{ id, icon, label, time?, severity /* 'low'|'med'|'high'|'crit' */ }] }
// layered (Defense in Depth)
{ kind:'layered', layers:[{ id, label, control?, state /* 'present'|'missing' */ }],
  core:{ label, assets:[{ id, label, exposed? }] } }
```

**Dev-fixture rule (HARD):** Phases 1-4 use the scenarios embedded in the mockups ONLY as labeled dev fixtures for rendering/tests. NO scenario reaches a real user until it clears the Phase 5 two-agent consensus gate.

---

## Phase 1 — The `configure` step type

### Task 1: `configure` payload validation

**Files:**
- Modify: `features/sim-lab.js` (`STEP_TYPES` ~L5; `_validateStepPayload` ~L11)
- Test: `tests/uat.js` (Sim Lab validation section — locate by grep `simLabValidateScenario`)

- [ ] **Step 1: Write failing tests** — add to the Sim Lab UAT block:
```js
// configure: valid scenario passes
var _cfgStep = { id:'s1', type:'configure', prompt:'p', explanation:'e', points:1,
  payload:{ slots:[ {id:'ip', label:'IP', options:[{id:'a',text:'A'},{id:'b',text:'B'}]} ] },
  answer:{ slots:{ ip:'a' } } };
var _cfgScn = { id:'c1', cert:'netplus', scenario:'prose', estMinutes:3, steps:[_cfgStep] };
assert(simLabValidateScenario(_cfgScn).ok === true, 'configure valid scenario passes');
// configure: bad answer (option id not in slot) fails
var _bad = JSON.parse(JSON.stringify(_cfgScn)); _bad.steps[0].answer.slots.ip = 'zzz';
assert(simLabValidateScenario(_bad).ok === false, 'configure rejects unknown option id');
// configure: slot with <2 options fails
var _bad2 = JSON.parse(JSON.stringify(_cfgScn)); _bad2.steps[0].payload.slots[0].options.pop();
assert(simLabValidateScenario(_bad2).ok === false, 'configure rejects slot with <2 options');
```

- [ ] **Step 2: Run UAT, verify the new assertions FAIL**
Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node tests/uat.js`
Expected: FAIL on `configure valid scenario passes` (type rejected by `STEP_TYPES`).

- [ ] **Step 3: Add `'configure'` to `STEP_TYPES`** (~L5):
```js
var STEP_TYPES = ['order', 'categorize', 'match', 'analyze', 'fillin', 'configure'];
```

- [ ] **Step 4: Add the `configure` case to `_validateStepPayload`** (in the `switch (step.type)`):
```js
case 'configure':
  return Array.isArray(p.slots) && p.slots.length >= 1 &&
         a.slots && typeof a.slots === 'object' && !Array.isArray(a.slots) &&
         p.slots.every(function (sl) {
           return _isNonEmptyStr(sl.id) && _isNonEmptyStr(sl.label) &&
                  Array.isArray(sl.options) && sl.options.length >= 2 &&
                  sl.options.every(function (o) { return _isNonEmptyStr(o.id) && _isNonEmptyStr(o.text); }) &&
                  _isNonEmptyStr(a.slots[sl.id]) &&
                  sl.options.some(function (o) { return o.id === a.slots[sl.id]; });
         });
```

- [ ] **Step 5: Run UAT, verify the 3 new assertions PASS and total is green**
Run: `node tests/uat.js`  Expected: `NNNN/NNNN ALL PASS ✓` (count increased by 3).

- [ ] **Step 6: Commit**
```bash
git add features/sim-lab.js tests/uat.js
git commit -m "feat(sim-lab): add configure step type validation"
```

### Task 2: `configure` per-slot scoring (the spec deviation)

**Files:**
- Modify: `features/sim-lab.js` (`_scoreStep` ~L85; `simLabScoreScenario` ~L110)
- Test: `tests/uat.js`

- [ ] **Step 1: Write failing tests** — per-slot partial credit:
```js
// 2 of 3 slots correct -> scenario score 2/3 (slot-granular), not 0/1
var _scn3 = { id:'c2', cert:'netplus', scenario:'p', estMinutes:3, steps:[{
  id:'s', type:'configure', prompt:'p', explanation:'e', points:1,
  payload:{ slots:[
    {id:'a',label:'A',options:[{id:'x',text:'x'},{id:'y',text:'y'}]},
    {id:'b',label:'B',options:[{id:'x',text:'x'},{id:'y',text:'y'}]},
    {id:'c',label:'C',options:[{id:'x',text:'x'},{id:'y',text:'y'}]} ]},
  answer:{ slots:{ a:'x', b:'x', c:'x' } } }] };
var _r = simLabScoreScenario(_scn3, { s: { slots:{ a:'x', b:'x', c:'y' } } });
assert(_r.correct === 2 && _r.total === 3, 'configure scores per-slot (2/3)');
// non-configure scenarios unchanged: 1 point per step
var _ord = { id:'c3', cert:'netplus', scenario:'p', estMinutes:3, steps:[{
  id:'o', type:'order', prompt:'p', explanation:'e', points:1,
  payload:{ items:[{id:'1',label:'1'},{id:'2',label:'2'}] }, answer:{ correctOrder:['1','2'] } }] };
var _ro = simLabScoreScenario(_ord, { o:{ order:['1','2'] } });
assert(_ro.correct === 1 && _ro.total === 1, 'non-configure unchanged (1 per step)');
```

- [ ] **Step 2: Run UAT, verify new assertions FAIL**
Run: `node tests/uat.js`  Expected: FAIL on `configure scores per-slot (2/3)`.

- [ ] **Step 3: Add a slot-scorer and a `configure` case to `_scoreStep`** (above `simLabScoreScenario`):
```js
function _scoreConfigureSlots(step, resp) {
  var ans = step.answer.slots, total = 0, correct = 0;
  Object.keys(ans).forEach(function (slotId) {
    total++;
    if (resp && resp.slots && resp.slots[slotId] === ans[slotId]) correct++;
  });
  return { total: total, correct: correct };
}
```
And in `_scoreStep`'s switch, add (so callers treating it as boolean see "fully correct"):
```js
case 'configure':
  var _sc = _scoreConfigureSlots(step, resp);
  return _sc.total > 0 && _sc.correct === _sc.total;
```

- [ ] **Step 4: Make `simLabScoreScenario` slot-aware** — replace its body:
```js
function simLabScoreScenario(scn, responses) {
  var perStep = {}, correct = 0, total = 0;
  scn.steps.forEach(function (st) {
    var resp = responses ? responses[st.id] : null;
    if (st.type === 'configure') {
      var sc = _scoreConfigureSlots(st, resp);
      perStep[st.id] = sc;            // { total, correct } breakdown for configure
      correct += sc.correct; total += sc.total;
    } else {
      var ok = _scoreStep(st, resp);
      perStep[st.id] = ok;            // boolean for existing types
      if (ok) correct++; total++;
    }
  });
  return { perStep: perStep, correct: correct, total: total, fraction: total ? correct / total : 0 };
}
```

- [ ] **Step 5: Run UAT, verify PASS (new + all existing Sim Lab scoring tests still green)**
Run: `node tests/uat.js`  Expected: `ALL PASS ✓`. If any existing Sim Lab scoring test asserts `perStep[id]` is a boolean for a non-configure step, it still holds (unchanged).

- [ ] **Step 6: Commit**
```bash
git add features/sim-lab.js tests/uat.js
git commit -m "feat(sim-lab): per-slot partial credit for configure steps"
```

### Task 3: `_slRenderConfigure` renderer + dispatch

**Files:**
- Modify: `features/sim-lab.js` (add `_slRenderConfigure` near other renderers ~L412; register in `simLabRenderStep` ~L448)
- Test: `tests/uat.js`

- [ ] **Step 1: Write failing test** (render + state reporting, jsdom-free DOM is available in UAT via the existing renderer tests — mirror how `_slRenderAnalyze` is tested; locate that test by grep `_slRenderAnalyze`):
```js
// renders one <select> per slot and reports selection through onChange
var _cap = null;
var _node = simLabRenderStep(_cfgStep, function (r) { _cap = r; });
assert(_node.querySelectorAll('select').length === 1, 'configure renders one select per slot');
var _sel = _node.querySelector('select'); _sel.value = 'b';
_sel.dispatchEvent(new Event('change'));
assert(_cap && _cap.slots && _cap.slots.ip === 'b', 'configure reports selection via onChange');
```
(Reuse `_cfgStep` from Task 1 if in scope; otherwise redefine it in this test.)

- [ ] **Step 2: Run UAT, verify FAIL** (`simLabRenderStep` has no `configure` branch → returns nothing/throws).

- [ ] **Step 3: Implement `_slRenderConfigure`** following the existing renderer contract (`_el`, `_esc`, `onChange`, `initial` re-hydration). Match the markup/classes used by the approved mockups (`.sl-cfg`, `.sl-cfg-slot`, native `<select>`):
```js
function _slRenderConfigure(step, onChange, initial) {
  var resp = (initial && initial.slots && typeof initial.slots === 'object') ? Object.assign({}, initial.slots) : {};
  var root = _el('div', 'sl-cfg');
  root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
  step.payload.slots.forEach(function (sl) {
    var wrap = _el('div', 'sl-cfg-slot');
    wrap.appendChild(_el('label', 'sl-cfg-label', _esc(sl.label)));
    var sel = document.createElement('select');
    sel.className = 'sl-cfg-select';
    sel.setAttribute('data-slot', sl.id);
    var ph = document.createElement('option'); ph.value = ''; ph.textContent = 'Choose…'; sel.appendChild(ph);
    sl.options.forEach(function (o) {
      var op = document.createElement('option'); op.value = o.id; op.textContent = o.text;
      if (resp[sl.id] === o.id) op.selected = true;
      sel.appendChild(op);
    });
    sel.addEventListener('change', function () {
      if (sel.value) resp[sl.id] = sel.value; else delete resp[sl.id];
      onChange({ slots: Object.assign({}, resp) });
    });
    wrap.appendChild(sel);
    root.appendChild(wrap);
  });
  onChange({ slots: Object.assign({}, resp) }); // report initial
  return root;
}
```

- [ ] **Step 4: Register in `simLabRenderStep`** — add a branch alongside the other `_slRenderX` dispatches:
```js
case 'configure': return _slRenderConfigure(step, onChange, initial);
```
(If `simLabRenderStep` uses an if/else or map rather than switch, match that exact structure — read ~L448 first.)

- [ ] **Step 5: Run UAT, verify PASS**  Run: `node tests/uat.js`  Expected: `ALL PASS ✓`.

- [ ] **Step 6: Commit**
```bash
git add features/sim-lab.js tests/uat.js
git commit -m "feat(sim-lab): configure step renderer (per-slot native selects)"
```

### Task 4: `configure` styling (forged-bronze, native select)

**Files:**
- Modify: `dg-system.css` (locate the Sim Lab block by grep `.sl-prompt` or `.sl-order`; add adjacent). Bump the `dg-system.css?v=` cache-bust query in `index.html` (BRAND.md §Versioning).
- Test: manual (Phase 6 live-verify); no UAT assertion for pure CSS.

- [ ] **Step 1: Add `.sl-cfg` styles** — lift the dropdown styling verbatim from `mockups/diagram-pbq-concept.html` (the `.sel`/`.sel select`/`.sel::after`/`.sel.correct`/`.sel.wrong` rules), renamed to `.sl-cfg-*`, using existing dg-system tokens (`--accent`, `--surface-2`, `--border`, `color-mix`). Native `<select>` + custom chevron; focus ring; correct/wrong graded states.

- [ ] **Step 2: Bump cache-bust** — in `index.html`, find `dg-system.css?v=X.Y.Z` and increment the patch.

- [ ] **Step 3: Run UAT** (CSS guard tests) Run: `node tests/uat.js`  Expected: `ALL PASS ✓` (no css-guard regressions).

- [ ] **Step 4: Commit**
```bash
git add dg-system.css index.html
git commit -m "style(sim-lab): forged-bronze configure dropdown styling"
```

---

## Phase 2 — Visual `reference` assets

### Task 5: `reference` asset model + validation + mount wiring

**Files:**
- Modify: `features/sim-lab.js` (`simLabValidateScenario` ~L35 to validate optional `assets.reference`; `_slMountScenario` ~L465 to render the reference panel above steps)
- Test: `tests/uat.js`

- [ ] **Step 1: Write failing tests** — reference validation + mount renders a panel:
```js
var _net = { kind:'network', devices:[{id:'d1',label:'PC',type:'pc',zone:'v10',x:10,y:10}], links:[] };
var _scnRef = JSON.parse(JSON.stringify(_cfgScn)); _scnRef.assets = { reference: _net };
assert(simLabValidateScenario(_scnRef).ok === true, 'valid network reference passes');
var _badRef = JSON.parse(JSON.stringify(_cfgScn)); _badRef.assets = { reference: { kind:'nope' } };
assert(simLabValidateScenario(_badRef).ok === false, 'unknown reference kind rejected');
```

- [ ] **Step 2: Run UAT, verify FAIL.**

- [ ] **Step 3: Add reference validation** to `simLabValidateScenario` (after the steps loop, before `return`):
```js
if (s.assets && s.assets.reference) {
  var ref = s.assets.reference, kinds = ['network', 'timeline', 'layered'];
  if (kinds.indexOf(ref.kind) === -1) errs.push('reference: bad kind');
  else if (ref.kind === 'network' && !Array.isArray(ref.devices)) errs.push('reference network: devices[] required');
  else if (ref.kind === 'timeline' && !Array.isArray(ref.stages)) errs.push('reference timeline: stages[] required');
  else if (ref.kind === 'layered' && !Array.isArray(ref.layers)) errs.push('reference layered: layers[] required');
}
```

- [ ] **Step 4: Add a reference dispatcher** `_slRenderReference(ref)` that returns a panel `<div class="sl-ref">` or null (renderers added in Tasks 6-8; stub them to return an empty `.sl-ref` for now so mount wiring is testable):
```js
function _slRenderReference(ref) {
  if (!ref || !ref.kind) return null;
  var panel = _el('div', 'sl-ref');
  if (ref.kind === 'network') panel.appendChild(_slRenderRefNetwork(ref));
  else if (ref.kind === 'timeline') panel.appendChild(_slRenderRefTimeline(ref));
  else if (ref.kind === 'layered') panel.appendChild(_slRenderRefLayered(ref));
  return panel;
}
```

- [ ] **Step 5: Wire into `_slMountScenario`** — read ~L465 first; before the steps render, if `scn.assets && scn.assets.reference`, prepend `_slRenderReference(scn.assets.reference)` to the mount root (decoupled: reference panel, then steps).

- [ ] **Step 6: Add temporary stubs** for `_slRenderRefNetwork/Timeline/Layered` returning `_el('div','sl-ref-stub')` so the build runs; Tasks 6-8 replace them.

- [ ] **Step 7: Test mount** — assert `_slMountScenario(_scnRef, …)` output contains `.sl-ref`. Run UAT → PASS.

- [ ] **Step 8: Commit**
```bash
git add features/sim-lab.js tests/uat.js
git commit -m "feat(sim-lab): pluggable reference asset model + mount wiring"
```

### Task 6: `network` reference renderer (Net+ Diagram + IR overlay)

**Files:**
- Modify: `features/sim-lab.js` (replace `_slRenderRefNetwork` stub)
- Modify: `dg-system.css` (diagram styles) + `index.html` (cache-bust)
- Test: `tests/uat.js` (renders an `<svg>` with one node per device; flagged/compromised state applies a class)

- [ ] **Step 1: Failing test:**
```js
var _net2 = { kind:'network', devices:[
  {id:'a',label:'PC-2',type:'pc',zone:'v10',ip:'192.168.20.45',x:0,y:0,state:'compromised'},
  {id:'b',label:'FS-1',type:'server',zone:'v10',x:1,y:0} ], links:[{from:'a',to:'b',kind:'attack'}] };
var _svg = _slRenderRefNetwork(_net2);
assert(_svg.querySelectorAll('.sl-node').length === 2, 'network renders one node per device');
assert(_svg.querySelector('.sl-node.compromised'), 'compromised state applies class');
```

- [ ] **Step 2: Run UAT → FAIL.**

- [ ] **Step 3: Implement `_slRenderRefNetwork(ref)`** — build the themed SVG by **faithful lift from `mockups/diagram-pbq-concept.html`** (the `<svg viewBox="0 0 800 500">` block: zones, links, centered-stack nodes) and the IR overlay states from `mockups/incident-response-pbq-concept.html` (`.node.compromised/.affected`, `.link.attack` animated dashes, `marker#arrow`). Drive node positions from `device.x/y` (grid units → px), zones from `device.zone`, states from `device.state`, attack links from `link.kind==='attack'`. Use `_el` + `innerHTML` for the SVG string; escape labels with `_esc`. Read-only (no interaction).

- [ ] **Step 4: Add diagram CSS** to `dg-system.css` — lift the `.vlan-zone`, `.node`, `.link`, `.link.attack`, `.glyph`, state classes verbatim from the two mockups, prefixed `.sl-` to avoid collisions; bump `dg-system.css?v=`.

- [ ] **Step 5: Run UAT → PASS.**

- [ ] **Step 6: Commit**
```bash
git add features/sim-lab.js dg-system.css index.html tests/uat.js
git commit -m "feat(sim-lab): network reference renderer (diagram + incident overlay)"
```

### Task 7: `timeline` reference renderer (Sec+ IR)

**Files:** `features/sim-lab.js` (replace stub), `dg-system.css` + `index.html`, `tests/uat.js`

- [ ] **Step 1: Failing test** — `_slRenderRefTimeline({kind:'timeline',stages:[...4...]})` produces 4 `.sl-stage` rows, each with a severity class.
- [ ] **Step 2: Run UAT → FAIL.**
- [ ] **Step 3: Implement** by faithful lift of the `.timeline`/`.stage`/`.sev-*` block from `mockups/incident-response-pbq-concept.html`; severity → class `sev-low|med|high|crit`; escape `label`.
- [ ] **Step 4: CSS** lift `.timeline .stage .dot/.line/.what/.sevtag` + `.sev-*` tokens; bump cache-bust.
- [ ] **Step 5: Run UAT → PASS.**
- [ ] **Step 6: Commit** `feat(sim-lab): attack-timeline reference renderer`

### Task 8: `layered` reference renderer (Defense in Depth)

**Files:** `features/sim-lab.js` (replace stub), `dg-system.css` + `index.html`, `tests/uat.js`

- [ ] **Step 1: Failing test** — `_slRenderRefLayered` with N layers (some `state:'missing'`) renders N layer elements and flags missing ones with a class; exposed core assets get a class.
- [ ] **Step 2: Run UAT → FAIL.**
- [ ] **Step 3: Implement** by faithful lift of the nested-frames SVG from `mockups/defense-in-depth-netplus-concept.html` (present layer + gap marker) and the multi-missing-layer + exposed-core variant from `mockups/defense-in-depth-secplus-concept.html`. Drive frames from `layers[]` (present → solid frame with `control`; missing → red dashed `.sl-misslayer`), core from `core.assets[]` (`exposed` → flagged).
- [ ] **Step 4: CSS** lift `.layer`, `.misslayer`, `.core-exposed`, `.dev` from both DID mockups; bump cache-bust.
- [ ] **Step 5: Run UAT → PASS.**
- [ ] **Step 6: Commit** `feat(sim-lab): layered defense-in-depth reference renderer`

---

## Phase 3 — Net+ deterministic fidelity validator

### Task 9: subnetting/CIDR fidelity validator

**Files:** `features/sim-lab.js` (add `simLabValidateNetworkFidelity` + CIDR helpers), `tests/uat.js`

- [ ] **Step 1: Failing tests** — given a `network` reference + the configure answer, the validator confirms the flagged device is OUT of its VLAN subnet and the correct answer puts it IN; and it rejects a scenario whose "correct" answer is itself out-of-subnet:
```js
// helpers
assert(_ipToInt('192.168.10.1') === ((192<<24)|(168<<16)|(10<<8)|1) >>> 0, 'ipToInt');
assert(_inSubnet('192.168.10.45','192.168.10.0','255.255.255.0') === true, 'inSubnet true');
assert(_inSubnet('192.168.20.45','192.168.10.0','255.255.255.0') === false, 'inSubnet false');
// fidelity: the diagram fixture from the Net+ mockup must pass (correct answer re-homes PC-2 into .10.x)
var _fx = /* the Net+ diagram fixture: network ref + configure step with correct IP/mask/gw */;
assert(simLabValidateNetworkFidelity(_fx.ref, _fx.step).ok === true, 'Net+ fixture is fidelity-sound');
```

- [ ] **Step 2: Run UAT → FAIL.**

- [ ] **Step 3: Implement** `_ipToInt`, `_maskToInt`, `_inSubnet(ip,netId,mask)`, and `simLabValidateNetworkFidelity(networkModel, configureStep)`:
  - For each device with `ip`+`mask`+`zone`: compute its VLAN subnet (from the zone's intended network) and check membership; gateway ∈ subnet; no duplicate IPs.
  - Apply the configure step's correct answers symbolically (the option that sets the corrected IP/mask/gw) and assert the corrected device IS in-subnet with an in-subnet gateway. Return `{ ok, errors }`.

- [ ] **Step 4: Run UAT → PASS.**

- [ ] **Step 5: Commit** `feat(sim-lab): deterministic Net+ subnetting fidelity validator`

---

## Phase 4 — Archetype wiring + Sim Lab surface entry

### Task 10: scenario `archetype` tag + cert-aware availability

**Files:** `features/sim-lab.js` (allow `scenario.archetype` ∈ `['diagram','incident','defense']`; thread through validation only — no behavior change to picking yet), `tests/uat.js`

- [ ] **Step 1: Failing test** — `simLabValidateScenario` accepts a known `archetype` and rejects an unknown one (when present).
- [ ] **Step 2: Run UAT → FAIL.**
- [ ] **Step 3: Implement** an optional `archetype` field validation (`['diagram','incident','defense']`).
- [ ] **Step 4: Run UAT → PASS.**
- [ ] **Step 5: Commit** `feat(sim-lab): scenario archetype tag`

### Task 11: render the full archetype scenario end-to-end (Net+ vertical slice)

**Files:** `features/sim-lab.js` (ensure `_slMountScenario` renders reference + configure steps + scores via the existing Practice flow), `tests/uat.js`

- [ ] **Step 1: Failing test** — mount the Net+ diagram fixture (network ref + diagnose `configure×1` + reconfigure `configure×N`), simulate selecting the correct options, and assert `simLabScoreScenario` returns `correct === total` and the mounted DOM contains `.sl-ref` + the selects.
- [ ] **Step 2: Run UAT → FAIL (if any wiring gap).**
- [ ] **Step 3: Fix wiring** so a configure-based, reference-bearing scenario renders and scores through the existing Practice path (no new mode code — reuse `_slMountScenario`/`_slRenderPracticePage`).
- [ ] **Step 4: Run UAT → PASS.**
- [ ] **Step 5: Commit** `feat(sim-lab): end-to-end diagram PBQ vertical slice (fixture)`

---

## Phase 5 — 🔒 Content authoring + TWO-AGENT CONSENSUS GATE (HARD RULE)

> **No scenario authored in this phase enters a seed bank until BOTH agents approve.** This is the project hard rule (memory: 2-agent consensus). Run per scenario. Mirrors the `review-feature` multi-agent pattern.

### Task 12: author + gate the Net+ Diagram seed bank (target ~15-20 scenarios)

**Files:** Create/extend the seed-bank source the engine reads (locate via `_slPickSeed`/`_slPickSeedFresh` — likely a per-cert bank file e.g. `certs/netplus.js` or a dedicated `certs/pbq/netplus-diagram.js`). `tests/uat.js` (bank loads + every scenario passes `simLabValidateScenario` AND `simLabValidateNetworkFidelity`).

- [ ] **Step 1:** Draft each scenario as a `configure`-based scenario with a `network` reference (use the deterministic fidelity validator as a first automatic filter — reject any draft that fails the math).
- [ ] **Step 2: TWO-AGENT GATE per scenario** — dispatch two subagents:
  - **Agent A (network engineer):** verify technical correctness (misconfig real, fix correct, addressing/VLAN sound).
  - **Agent B (CompTIA examiner):** verify exam fidelity (maps to N10-009 objective, exam-realistic, marked-correct answer is what CompTIA accepts, plausible distractors, right difficulty).
  - Reconcile: if either flags an issue, revise and re-review until **both approve**. Only consensus-approved scenarios are added to the bank.
- [ ] **Step 3:** Add approved scenarios to the bank; add a UAT test asserting every Net+ diagram scenario passes BOTH validators.
- [ ] **Step 4: Run UAT → PASS.**
- [ ] **Step 5: Commit** `content(sim-lab): Net+ Diagram seed bank (2-agent gated)`

### Task 13: author + gate the Sec+ Incident Response seed bank (≥20, coverage-matrixed)

**Files:** seed-bank source for Sec+; `tests/uat.js`.

- [ ] **Step 1:** Draft ≥20 IR scenarios across the coverage matrix (≈6-8 attack archetypes × IR lifecycle emphasis), each with a `timeline` and/or `network`-under-attack reference + `configure` (triage) + `order` (response sequence) steps.
- [ ] **Step 2: TWO-AGENT GATE per scenario** (Agent A: incident-response/security professional; Agent B: CompTIA examiner for SY0-701 Domain 4). Consensus required. (No math validator — the gate is the primary correctness check.)
- [ ] **Step 3:** Add approved scenarios; UAT asserts each passes `simLabValidateScenario`.
- [ ] **Step 4: Run UAT → PASS.**
- [ ] **Step 5: Commit** `content(sim-lab): Sec+ Incident Response seed bank (2-agent gated)`

### Task 14: author + gate the Defense-in-Depth seed banks (Net+ and Sec+)

**Files:** seed-bank source for both certs; `tests/uat.js`.

- [ ] **Step 1:** Draft DID scenarios with a `layered` reference + `diagnose` + `configure` (Net+: ~3 layer slots; Sec+: 4 slots + control-type classification slot).
- [ ] **Step 2: TWO-AGENT GATE per scenario** (Agent A: network/security architect; Agent B: CompTIA examiner — N10-009 Domain 4 for Net+, SY0-701 Domain 3 for Sec+). Consensus required.
- [ ] **Step 3:** Add approved scenarios; UAT asserts each passes `simLabValidateScenario`.
- [ ] **Step 4: Run UAT → PASS.**
- [ ] **Step 5: Commit** `content(sim-lab): Defense in Depth seed banks, Net+ & Sec+ (2-agent gated)`

---

## Phase 6 — Gating, entry point, modes, cross-platform, ship

### Task 15: free 1/day + Pro gating reuse

**Files:** `features/sim-lab.js` (confirm new archetypes ride the existing `STORAGE.PBQ_FREE_COUNT` / `_canMakeMeteredCall('Sim Lab')` / `_gateProOnly` path — no new metering), `tests/uat.js`.

- [ ] **Step 1:** Verify (test) that an archetype scenario in Practice consumes the existing free-count and that Pro gating applies; reuse, do not add new gating.
- [ ] **Step 2: Run UAT → PASS.** Commit `feat(sim-lab): archetypes ride existing free/Pro gating`.

### Task 16: cert-aware entry on the Sim Lab surface

**Files:** `features/sim-lab.js` (surface the archetypes within Sim Lab for `netplus`/`secplus`; absent for Microsoft/AWS certs), `index.html` if a page hook is needed, `tests/uat.js`.

- [ ] **Step 1:** Test that Sim Lab offers the archetypes for Net+/Sec+ and not for non-PBQ certs.
- [ ] **Step 2: Implement** cert-aware availability. Run UAT → PASS. Commit `feat(sim-lab): cert-aware PBQ archetype entry`.

### Task 17: Exam mode + pacing (reuse)

**Files:** `features/sim-lab.js` (confirm archetype scenarios work inside the existing Exam-mode block + flag-and-return), `tests/uat.js`.

- [ ] **Step 1:** Test an archetype scenario inside an Exam block scores correctly. Run UAT → PASS. Commit `feat(sim-lab): archetypes in Exam mode`.

### Task 18: cross-platform live-verify (Desktop · Safari/WebKit · iOS)

**Files:** none (verification). Per CLAUDE.md post-deploy + SHIP_CHECKLIST Phase 3.

- [ ] **Step 1:** `python3 -m http.server 3131`; drive a Net+ diagram, a Sec+ IR, and a DID scenario on `localhost` via Chrome MCP — confirm native `<select>` works, no console errors, `100dvh` stable, reflow under `md`, reduced-motion collapses the attack-path dashes. NEVER write localStorage on prod (hard rule).
- [ ] **Step 2:** `npm run test:ios` (or the documented iOS smoke). Note results.
- [ ] **Step 3:** Commit any fixes. No commit if clean.

### Task 19: final review + ship

- [ ] **Step 1:** Run full gates: `node tests/uat.js`, `node tests/tech-debt.js`, `npx playwright test`.
- [ ] **Step 2:** `node scripts/bump-version.js <next> "Sim Lab PBQ archetypes: Diagram, Incident Response, Defense in Depth"`; update UAT version pins; re-read CLAUDE.md.
- [ ] **Step 3:** Use **superpowers:finishing-a-development-branch** → open PR from `feat/sim-lab-pbq-archetypes`. Fast lane, but PR for review given size. Capture a `#decision` note at ship (Step 7 of /ship).

---

## Notes
- **Dev fixtures vs. real content:** Phases 1-4 use mockup scenarios as labeled fixtures only. Real banks come from Phase 5 (2-agent gated).
- **Mockups are the source of truth** for all SVG/CSS (faithful lift): `diagram-pbq`, `incident-response-pbq`, `defense-in-depth-netplus`, `defense-in-depth-secplus`.
- **Check overlap** with pre-existing `secplus-control-type-sorter`, `secplus-ir-war-room`, `secplus-phishing-triage` mockups before authoring Sec+ banks (Task 13).
- **CSS rule:** never edit `styles.css` for reskins — add to `dg-system.css` and bump `?v=` (BRAND.md).
