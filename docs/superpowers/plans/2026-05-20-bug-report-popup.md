# Bug-Report Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an in-app bug-report drawer that captures user-reported issues with auto-attached context, posts to GitHub Issues via the existing BYOK token, and gracefully queues + retries on failure.

**Architecture:** Lazy-loaded feature module (`features/reports.js`) following the established `_loadFeature` contract. Drawer portal-to-body on open to escape `#page-setup`'s transform-based containing block. New `STORAGE.BUG_REPORTS` key for the retry queue, drained once per `DOMContentLoaded`. Three layers: drawer UI → pure pipeline functions (build/render/classify/enqueue) → GitHub Issues API. Failure paths route through `classifyError()` to choose toast tone + queue action + terminal flag.

**Tech Stack:** Vanilla JS (no framework, no build step), `fetch` for GitHub API, `localStorage` via the existing `STORAGE` wrapper, CSS in `dg-system.css` (the rebrand stylesheet — scoped to `#bug-report-drawer`), Playwright + jsdom for tests. Existing `_loadFeature` shell helper at `app.js:1673`.

**Source spec:** [`docs/superpowers/specs/2026-05-20-bug-report-popup-design.md`](../specs/2026-05-20-bug-report-popup-design.md)

**Concept mockups (locked visual targets):**
- Light: `.superpowers/brainstorm/83364-1779232215/content/components-light-v4-final.html`
- Dark: `.superpowers/brainstorm/83364-1779232215/content/components.html`

**Branch discipline:** Feature branch only. No version-bump, no PR, no main push until the founder gives the ship signal. Pre-commit hook runs UAT — every commit must pass.

**One spec deviation:** The spec said `STORAGE.REPORTS` + key `nplus_reports`, but `STORAGE.REPORTS` is already taken by the existing bad-quiz-question reporter (used by `reportIssue()` at `app.js:13008`). This plan uses **`STORAGE.BUG_REPORTS`** → key **`nplus_bug_reports`** instead. Spec section 5.3 stands; only the key name changes.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `features/reports.js` | **Create** | Feature module IIFE. All pure functions, drawer render, queue logic, Settings panel render. Registers on `window._certanvilFeatures.reports`. |
| `app.js` | **Modify** | (1) Add `STORAGE.BUG_REPORTS` key. (2) Add topbar bug iconbtn click handler that lazy-loads `reports` + opens drawer. (3) Add `DOMContentLoaded` queue-drain hook. (4) Add Settings → Reports section render hook. |
| `index.html` | **Modify** | Add `.topbar-iconbtn#topbar-bug-report` between settings + theme toggle. |
| `dg-system.css` | **Modify** | Append `#bug-report-drawer` block with light + dark theme variants. Match v4-final mockup exactly. |
| `tests/uat.js` | **Modify** | Add 4 behavioral fixtures (buildPayload / renderIssueBody / classifyError / enqueueReport) + structural guards. |
| `tests/e2e/app.spec.js` | **Modify** | Add 9 Playwright tests in a `bug-report` describe block. |

---

## Stage 0: Branch + scaffolding

### Task 0.1: Create feature branch

**Files:** none

- [ ] **Step 1: Verify clean working tree**

Run: `git status`
Expected: working tree clean (or only the untracked files listed in the spec commit — those stay untracked).

- [ ] **Step 2: Create + switch to feature branch**

Run: `git checkout -b feat/bug-report-popup`
Expected: `Switched to a new branch 'feat/bug-report-popup'`

- [ ] **Step 3: Verify the branch tracks no remote**

Run: `git branch -vv | grep '^\*'`
Expected: line with `* feat/bug-report-popup <sha> docs(spec): bug-report popup...` and NO `[origin/...]` tracking. Founder explicitly requested no push until ship signal.

---

### Task 0.2: Add `STORAGE.BUG_REPORTS` key

**Files:**
- Modify: `app.js` (the STORAGE table around lines 64–103)

- [ ] **Step 1: Locate the STORAGE table**

Run: `grep -n "REPORTS:" app.js | head -3`
Expected: one match (existing `REPORTS: 'nplus_reports'`).

- [ ] **Step 2: Add BUG_REPORTS key right below REPORTS**

Use the Edit tool. Locate the line:

```js
  REPORTS: 'nplus_reports',
```

Add a new line directly below:

```js
  REPORTS: 'nplus_reports',
  BUG_REPORTS: 'nplus_bug_reports', // v5.6.x bug-report drawer retry queue
```

- [ ] **Step 3: Run UAT to confirm no regression**

Run: `node tests/uat.js | tail -5`
Expected: all assertions pass (count goes up by 0 — this is a config addition).

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat(bug-report): add STORAGE.BUG_REPORTS key"
```

Expected: pre-commit UAT runs and passes; commit lands.

---

### Task 0.3: Create `features/reports.js` skeleton (IIFE + registration)

**Files:**
- Create: `features/reports.js`

- [ ] **Step 1: Create the skeleton**

Use Write tool to create `features/reports.js`:

```js
// features/reports.js — v5.6.x bug-report drawer + retry queue
// Lazy-loaded via _loadFeature('reports') from the topbar bug iconbtn
// and from DOMContentLoaded (queue drain). Self-contained: zero deps
// on other feature modules.

(function () {
  'use strict';

  // ───────────────────────────────────────────────────────────
  // PURE FUNCTIONS (testable in isolation via vm-sandbox)
  // ───────────────────────────────────────────────────────────

  function buildPayload(form, ctx) { return null; /* TASK 1.2 */ }
  function renderIssueBody(payload) { return ''; /* TASK 1.4 */ }
  function classifyError(resp) { return null; /* TASK 1.6 */ }
  function enqueueReport(rpt, store) { return store; /* TASK 1.8 */ }

  // ───────────────────────────────────────────────────────────
  // DRAWER UI (TASK 2.x)
  // ───────────────────────────────────────────────────────────

  function openDrawer() { /* TASK 2.3 */ }
  function closeDrawer() { /* TASK 2.3 */ }

  // ───────────────────────────────────────────────────────────
  // SUBMIT + RETRY (TASK 5.x, 6.x)
  // ───────────────────────────────────────────────────────────

  async function submitReport(payload) { /* TASK 5.1 */ }
  async function drainQueue() { /* TASK 6.1 */ }

  // ───────────────────────────────────────────────────────────
  // SETTINGS PANEL (TASK 7.x)
  // ───────────────────────────────────────────────────────────

  function renderSettingsReportsPanel(host) { /* TASK 7.1 */ }

  // Register on the standard feature-modules contract
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures.reports = {
    // Pure (exposed for testing)
    buildPayload: buildPayload,
    renderIssueBody: renderIssueBody,
    classifyError: classifyError,
    enqueueReport: enqueueReport,
    // UI
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    // Pipeline
    submitReport: submitReport,
    drainQueue: drainQueue,
    // Settings
    renderSettingsReportsPanel: renderSettingsReportsPanel,
  };
})();
```

- [ ] **Step 2: Verify load contract**

Run: `node -e "const mod = require('fs').readFileSync('features/reports.js','utf8'); console.log(mod.includes('window._certanvilFeatures.reports') ? 'OK' : 'MISSING'); console.log('braces:', (mod.match(/\{/g)||[]).length, '/', (mod.match(/\}/g)||[]).length);"`
Expected: `OK` + balanced braces.

- [ ] **Step 3: Commit**

```bash
git add features/reports.js
git commit -m "feat(bug-report): scaffold features/reports.js IIFE + registration"
```

---

## Stage 1: Pure functions (TDD)

> **Behavioral fixture pattern:** UAT loads `features/reports.js` source, extracts each function body via `_fnBody`, runs it in a `vm.runInNewContext` sandbox with deterministic inputs, asserts the output shape. This matches the proven Subnet-Trainer / Port-Drill UAT pattern.

### Task 1.1: Write failing test for `buildPayload()`

**Files:**
- Modify: `tests/uat.js` (append a new section near other feature-module tests)

- [ ] **Step 1: Locate an existing fn-extraction precedent**

Run: `grep -n "_fnBody.*'[a-z]" tests/uat.js | head -5`
Expected: examples of `_fnBody(src, 'someFunctionName')` calls in the file. Pattern those.

- [ ] **Step 2: Append the buildPayload fixture block**

Add to `tests/uat.js` (near the end, before the final `process.exit` block):

```js
// ────────────────────────────────────────────────────────────
// v5.6.x · Bug-Report Pure Functions (4 fixtures)
// ────────────────────────────────────────────────────────────
(function _reportFixtures() {
  const reportsSrc = fs.readFileSync(path.join(__dirname,'..','features','reports.js'),'utf8');

  // ── 1. buildPayload(form, ctx) ───────────────────────────
  const buildPayloadBody = _fnBody(reportsSrc, 'buildPayload');
  assert(buildPayloadBody, 'buildPayload exists');

  const sandbox = { result: null };
  const code = `
    function buildPayload(form, ctx) { ${buildPayloadBody} }
    result = buildPayload(
      { title: '  streak issue  ', desc: 'detail', steps: null },
      { cert: 'netplus-N10-009', theme: 'light', version: 'v5.5.12',
        page: '#page-setup', viewport: '1440x900',
        last_quiz: { topic: 'subnetting', score: '7/10', minutes_ago: 2 },
        wrong_bank_size: 4 }
    );
  `;
  vm.runInNewContext(code, sandbox);
  const p = sandbox.result;
  assert(p && typeof p === 'object', 'buildPayload returns object');
  assert(/^rpt_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}_[a-f0-9]{4}$/.test(p.id), 'id format rpt_<iso-no-colons>_<4hex>');
  assert(p.title === 'streak issue', 'title trimmed');
  assert(p.description === 'detail', 'description present');
  assert(p.steps === null, 'steps null passes through');
  assert(p.context && p.context.version === 'v5.5.12', 'context.version');
  assert(p.context.cert === 'netplus-N10-009', 'context.cert');
  assert(p.context.last_quiz && p.context.last_quiz.score === '7/10', 'context.last_quiz nested');
  assert(p.context.wrong_bank_size === 4, 'context.wrong_bank_size');
  assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(p.submitted_at), 'submitted_at ISO Z');
  assert(p.attempt_count === 1, 'attempt_count starts at 1');
})();
```

- [ ] **Step 3: Run UAT — expect failure**

Run: `node tests/uat.js | tail -10`
Expected: assertion fails on `buildPayload returns object` (current skeleton returns `null`).

- [ ] **Step 4: Commit just the failing test**

```bash
git add tests/uat.js
git commit -m "test(bug-report): buildPayload fixture (failing, awaits impl)"
```

Note: pre-commit will FAIL because UAT fails. Use `--no-verify` for this one-step commit ONLY because TDD red-stage commits are an established pattern. Or fold it into Task 1.2 (write test + impl in one commit). Prefer fold to avoid hook bypass.

**Adjustment:** rather than committing red, run Task 1.2 immediately so the commit goes green. Skip step 4 here; instead proceed to Task 1.2 and commit both together.

---

### Task 1.2: Implement `buildPayload()`

**Files:**
- Modify: `features/reports.js`

- [ ] **Step 1: Replace the stub**

In `features/reports.js`, replace the buildPayload stub:

```js
  function buildPayload(form, ctx) {
    // ISO-no-colons + 4-char hex random for stable ID across retries
    var iso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); // strip ms
    var idIso = iso.replace(/:/g, '-');
    var hex = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    var id = 'rpt_' + idIso.replace(/Z$/, '') + '_' + hex;

    function trim(s) { return (s == null ? '' : String(s)).trim(); }

    return {
      id: id,
      title: trim(form && form.title),
      description: trim(form && form.desc),
      steps: form && form.steps ? trim(form.steps) : null,
      context: {
        version: (ctx && ctx.version) || 'unknown',
        page: (ctx && ctx.page) || 'unknown',
        cert: (ctx && ctx.cert) || 'unknown',
        theme: (ctx && ctx.theme) || 'unknown',
        viewport: (ctx && ctx.viewport) || 'unknown',
        last_quiz: (ctx && ctx.last_quiz) || null,
        wrong_bank_size: (ctx && typeof ctx.wrong_bank_size === 'number') ? ctx.wrong_bank_size : 0,
      },
      submitted_at: iso,
      attempt_count: 1,
    };
  }
```

- [ ] **Step 2: Run UAT — expect pass**

Run: `node tests/uat.js | tail -3`
Expected: all assertions pass.

- [ ] **Step 3: Commit test + impl together**

```bash
git add tests/uat.js features/reports.js
git commit -m "feat(bug-report): buildPayload + fixture"
```

---

### Task 1.3: Write failing test for `renderIssueBody()`

**Files:**
- Modify: `tests/uat.js`

- [ ] **Step 1: Append the renderIssueBody fixture**

Add inside the same `_reportFixtures` IIFE in `tests/uat.js`, after the buildPayload block:

```js
  // ── 2. renderIssueBody(payload) ──────────────────────────
  const renderBodyBody = _fnBody(reportsSrc, 'renderIssueBody');
  assert(renderBodyBody, 'renderIssueBody exists');

  const rbSandbox = { result: null };
  const rbCode = `
    function renderIssueBody(payload) { ${renderBodyBody} }
    result = renderIssueBody({
      id: 'rpt_2026-05-20T14-32-07_a3f9',
      title: 'streak does not update',
      description: 'finished a 10-q session, streak stale',
      steps: null,
      context: { version: 'v5.5.12', page: '#page-setup', cert: 'netplus-N10-009',
                 theme: 'light', viewport: '1440x900',
                 last_quiz: { topic: 'subnetting', score: '7/10', minutes_ago: 2 },
                 wrong_bank_size: 4 },
      submitted_at: '2026-05-20T14:32:07Z',
      attempt_count: 1
    });
  `;
  vm.runInNewContext(rbCode, rbSandbox);
  const md = sandbox.result = rbSandbox.result;
  assert(typeof md === 'string', 'renderIssueBody returns string');
  assert(md.indexOf('## What happened') > -1, 'has What happened section');
  assert(md.indexOf('finished a 10-q session') > -1, 'has description text');
  assert(md.indexOf('## Steps to reproduce') > -1, 'has Steps section');
  assert(md.indexOf('_not provided_') > -1, 'null steps render as italic not provided');
  assert(md.indexOf('<details>') > -1, 'auto-context collapsible');
  assert(md.indexOf('Auto-attached context') > -1, 'summary text');
  assert(md.indexOf('| version | v5.5.12 |') > -1, 'context table row');
  assert(md.indexOf('| cert | netplus-N10-009 |') > -1, 'cert row');
  assert(md.indexOf('rpt_2026-05-20T14-32-07_a3f9') > -1, 'footer id');
```

---

### Task 1.4: Implement `renderIssueBody()`

**Files:**
- Modify: `features/reports.js`

- [ ] **Step 1: Replace the stub**

```js
  function renderIssueBody(payload) {
    var p = payload || {};
    var c = p.context || {};
    var lq = c.last_quiz;
    var lqLine = lq ? (lq.topic + ' · ' + lq.score + ' · ' + lq.minutes_ago + 'm ago') : 'none';
    var stepsBlock = p.steps ? p.steps : '_not provided_';

    var out = [];
    out.push('## What happened');
    out.push('');
    out.push(p.description || '');
    out.push('');
    out.push('## Steps to reproduce');
    out.push('');
    out.push(stepsBlock);
    out.push('');
    out.push('<details>');
    out.push('<summary>Auto-attached context</summary>');
    out.push('');
    out.push('| field | value |');
    out.push('|---|---|');
    out.push('| version | ' + (c.version || '') + ' |');
    out.push('| page | ' + (c.page || '') + ' |');
    out.push('| cert | ' + (c.cert || '') + ' |');
    out.push('| theme | ' + (c.theme || '') + ' |');
    out.push('| viewport | ' + (c.viewport || '') + ' |');
    out.push('| last quiz | ' + lqLine + ' |');
    out.push('| wrong-bank | ' + (typeof c.wrong_bank_size === 'number' ? c.wrong_bank_size : 0) + ' |');
    out.push('');
    out.push('</details>');
    out.push('');
    out.push('---');
    out.push('_Filed via in-app reporter · id: ' + (p.id || '') + '_');
    return out.join('\n');
  }
```

- [ ] **Step 2: UAT + commit**

Run: `node tests/uat.js | tail -3`
Expected: pass.

```bash
git add tests/uat.js features/reports.js
git commit -m "feat(bug-report): renderIssueBody + fixture"
```

---

### Task 1.5: Write failing test for `classifyError()`

**Files:**
- Modify: `tests/uat.js`

- [ ] **Step 1: Append the classifyError fixture**

```js
  // ── 3. classifyError(resp) ───────────────────────────────
  const classifyBody = _fnBody(reportsSrc, 'classifyError');
  assert(classifyBody, 'classifyError exists');

  function callClassify(input) {
    var s = { result: null };
    vm.runInNewContext(
      'function classifyError(resp) { ' + classifyBody + ' } result = classifyError(' + JSON.stringify(input) + ');',
      s
    );
    return s.result;
  }

  var c201 = callClassify({ status: 201 });
  assert(c201.type === 'success' && c201.queueAction === 'clear' && c201.terminal === false, '201 → success/clear');

  var cOff = callClassify({ status: 0, network: true });
  assert(cOff.type === 'offline' && cOff.queueAction === 'enqueue' && cOff.terminal === false, 'offline → enqueue transient');

  var c5xx = callClassify({ status: 503 });
  assert(c5xx.type === 'server' && c5xx.queueAction === 'enqueue' && c5xx.terminal === false, '503 → transient');

  var cRl = callClassify({ status: 403, ratelimit_remaining: 0, ratelimit_reset: 1716200000 });
  assert(cRl.type === 'ratelimit' && cRl.queueAction === 'requeue' && cRl.terminal === false, '403 + rl:0 → requeue');

  var cScope = callClassify({ status: 403 });
  assert(cScope.type === 'scope' && cScope.queueAction === 'enqueue' && cScope.terminal === true, '403 no rl → scope, terminal');

  var c401 = callClassify({ status: 401 });
  assert(c401.type === 'auth' && c401.queueAction === 'enqueue' && c401.terminal === true, '401 → auth, terminal');

  var c422 = callClassify({ status: 422, body: { message: 'validation' } });
  assert(c422.type === 'payload' && c422.queueAction === 'enqueue' && c422.terminal === true, '422 → payload, terminal');
```

---

### Task 1.6: Implement `classifyError()`

**Files:**
- Modify: `features/reports.js`

- [ ] **Step 1: Replace stub**

```js
  function classifyError(resp) {
    var r = resp || {};
    var status = r.status;

    if (status === 200 || status === 201) {
      return { type: 'success', queueAction: 'clear', toast: { tone: 'ok', title: 'Report filed' }, terminal: false };
    }
    if (status === 0 || r.network) {
      return { type: 'offline', queueAction: 'enqueue',
        toast: { tone: 'amber', title: 'Saved offline · retries on next visit' }, terminal: false };
    }
    if (status >= 500) {
      return { type: 'server', queueAction: 'enqueue',
        toast: { tone: 'amber', title: 'GitHub error · retries on next visit' }, terminal: false };
    }
    if (status === 403 && typeof r.ratelimit_remaining === 'number' && r.ratelimit_remaining === 0) {
      return { type: 'ratelimit', queueAction: 'requeue',
        toast: { tone: 'amber', title: 'Rate-limited · retries soon' },
        next_try: r.ratelimit_reset || null, terminal: false };
    }
    if (status === 403) {
      return { type: 'scope', queueAction: 'enqueue',
        toast: { tone: 'red', title: 'Token lacks scope · update in Settings' }, terminal: true };
    }
    if (status === 401) {
      return { type: 'auth', queueAction: 'enqueue',
        toast: { tone: 'red', title: 'Token rejected · open Settings' }, terminal: true };
    }
    if (status === 422) {
      return { type: 'payload', queueAction: 'enqueue',
        toast: { tone: 'red', title: "Couldn't send · check console" }, terminal: true };
    }
    // Unknown 4xx — treat as terminal payload error
    return { type: 'unknown', queueAction: 'enqueue',
      toast: { tone: 'red', title: "Couldn't send (HTTP " + status + ')' }, terminal: true };
  }
```

- [ ] **Step 2: UAT + commit**

```bash
git add tests/uat.js features/reports.js
git commit -m "feat(bug-report): classifyError + 7-case fixture"
```

---

### Task 1.7: Write failing test for `enqueueReport()`

**Files:**
- Modify: `tests/uat.js`

- [ ] **Step 1: Append the enqueueReport fixture**

```js
  // ── 4. enqueueReport(rpt, store) ─────────────────────────
  const enqueueBody = _fnBody(reportsSrc, 'enqueueReport');
  assert(enqueueBody, 'enqueueReport exists');

  function callEnq(rpt, store) {
    var s = { result: null };
    vm.runInNewContext(
      'function enqueueReport(rpt, store) { ' + enqueueBody + ' } result = enqueueReport(' +
        JSON.stringify(rpt) + ', ' + JSON.stringify(store) + ');',
      s
    );
    return s.result;
  }

  // A: empty store + new rpt
  var sA = callEnq({ id: 'rpt_x', payload: { title: 'a' }, attempts: 1, terminal: false }, []);
  assert(sA.length === 1 && sA[0].id === 'rpt_x', 'A: empty + new → 1 entry');

  // B: store has rpt with same id → updates in-place + attempts++
  var sB = callEnq(
    { id: 'rpt_x', payload: { title: 'a' }, attempts: 2, terminal: false },
    [{ id: 'rpt_x', payload: { title: 'a' }, attempts: 1, terminal: false }]
  );
  assert(sB.length === 1 && sB[0].attempts === 2, 'B: same id → updates in place');

  // C: store at cap=25, adds new → LRU drops oldest
  var bigStore = [];
  for (var i = 0; i < 25; i++) bigStore.push({ id: 'rpt_' + i, payload: {}, attempts: 1, terminal: false });
  var sC = callEnq({ id: 'rpt_new', payload: {}, attempts: 1, terminal: false }, bigStore);
  assert(sC.length === 25, 'C: stays at cap 25');
  assert(sC.find(function(x){ return x.id === 'rpt_new'; }), 'C: new entry present');
  assert(!sC.find(function(x){ return x.id === 'rpt_0'; }), 'C: oldest (rpt_0) dropped');
})(); // close _reportFixtures IIFE
```

---

### Task 1.8: Implement `enqueueReport()`

**Files:**
- Modify: `features/reports.js`

- [ ] **Step 1: Replace stub**

```js
  function enqueueReport(rpt, store) {
    var QUEUE_CAP = 25;
    var s = (store || []).slice();
    // Update in place if same id
    var idx = -1;
    for (var i = 0; i < s.length; i++) { if (s[i].id === rpt.id) { idx = i; break; } }
    if (idx > -1) {
      s[idx] = rpt;
      return s;
    }
    // Append
    s.push(rpt);
    // LRU: drop oldest non-terminal first, else oldest period
    while (s.length > QUEUE_CAP) {
      var dropAt = -1;
      for (var j = 0; j < s.length; j++) { if (!s[j].terminal) { dropAt = j; break; } }
      if (dropAt === -1) dropAt = 0;
      s.splice(dropAt, 1);
    }
    return s;
  }
```

- [ ] **Step 2: UAT + commit**

Run: `node tests/uat.js | tail -3`
Expected: 4 fixture blocks all green.

```bash
git add tests/uat.js features/reports.js
git commit -m "feat(bug-report): enqueueReport LRU + 3-case fixture"
```

---

## Stage 2: Drawer UI shell

### Task 2.1: Drawer markup template

**Files:**
- Modify: `features/reports.js`

- [ ] **Step 1: Add `_drawerHtml()` helper**

Add inside the IIFE (after the pure functions, before `openDrawer`):

```js
  function _drawerHtml(ctx) {
    var c = ctx || {};
    var lq = c.last_quiz;
    var ctxLine =
      '<b>' + (c.version || '?') + '</b> &middot; ' +
      (c.page || '?') + ' &middot; ' +
      (c.cert || '?') + ' &middot; ' +
      (c.theme || '?') + ' &middot; ' +
      (c.viewport || '?') + ' &middot; ' +
      (lq ? 'last quiz: ' + lq.topic + ' <b>' + lq.score + '</b> ' + lq.minutes_ago + 'm ago' : 'no recent quiz') +
      ' &middot; wrong-bank: <b>' + (typeof c.wrong_bank_size === 'number' ? c.wrong_bank_size : 0) + '</b>';

    return (
      '<div class="br-backdrop" id="br-backdrop"></div>' +
      '<div class="br-drawer" id="bug-report-drawer" role="dialog" aria-modal="true" aria-labelledby="br-title">' +
        '<div class="br-head">' +
          '<div>' +
            '<div class="br-eyebrow">&sect; Report</div>' +
            '<h3 class="br-title" id="br-title">Report an issue</h3>' +
          '</div>' +
          '<button type="button" class="br-close" id="br-close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<div class="br-body">' +
          '<div class="br-field">' +
            '<label class="br-label" for="br-input-title">Title <span class="br-req">*</span></label>' +
            '<input class="br-input" id="br-input-title" type="text" maxlength="200" placeholder="What happened in one line?">' +
            '<div class="br-caption br-caption-err" id="br-title-err" hidden>Title is required</div>' +
          '</div>' +
          '<div class="br-field">' +
            '<label class="br-label" for="br-input-desc">Description <span class="br-req">*</span><span class="br-counter" id="br-desc-counter" hidden></span></label>' +
            '<textarea class="br-textarea" id="br-input-desc" maxlength="5000" placeholder="What you did, what happened, what you expected."></textarea>' +
            '<div class="br-caption br-caption-err" id="br-desc-err" hidden>Description is required</div>' +
          '</div>' +
          '<button type="button" class="br-steps-link" id="br-steps-toggle">' +
            '<span class="br-plus">+</span><span>Add steps to reproduce</span>' +
          '</button>' +
          '<div class="br-ctx">' +
            '<span class="br-ctx-h">Auto-attached</span>' +
            '<span class="br-ctx-fields">' + ctxLine + '</span>' +
          '</div>' +
          '<div class="br-no-token" id="br-no-token" hidden>' +
            '<b>Setup needed</b>' +
            '<span>Add a GitHub personal access token in <a href="#" id="br-open-settings">Settings &rsaquo; Integrations</a> to file reports.</span>' +
          '</div>' +
        '</div>' +
        '<div class="br-foot">' +
          '<button type="button" class="br-cancel" id="br-cancel">Cancel</button>' +
          '<button type="button" class="br-send" id="br-send">Send report</button>' +
        '</div>' +
      '</div>'
    );
  }
```

- [ ] **Step 2: Commit**

```bash
git add features/reports.js
git commit -m "feat(bug-report): drawer markup template"
```

---

### Task 2.2: Drawer CSS

**Files:**
- Modify: `dg-system.css` (append at end)

- [ ] **Step 1: Append the scoped block**

Append to `dg-system.css`:

```css
/* ────────────────────────────────────────────────────────────
   v5.6.x · Bug-Report Drawer (portal to <body>)
   Light + dark via existing OKLCH tokens. Mockup-faithful to
   .superpowers/brainstorm/.../components-light-v4-final.html
   ──────────────────────────────────────────────────────────── */

.br-backdrop{
  position:fixed; inset:0; z-index:9000;
  background:color-mix(in oklab, var(--text) 36%, transparent);
  opacity:0; transition:opacity 220ms cubic-bezier(0.16,1,0.3,1);
}
.br-backdrop.open{ opacity:1; }

#bug-report-drawer{
  position:fixed; top:14px; right:14px;
  width:min(540px, 49vw); max-height:calc(100vh - 28px);
  z-index:9001;
  background:linear-gradient(180deg, var(--surface), var(--surface-2));
  border:1px solid var(--border); border-radius:14px;
  box-shadow:0 1px 0 color-mix(in oklab, var(--bg) 55%, transparent),
             0 18px 40px -16px color-mix(in oklab, var(--text) 25%, transparent);
  display:flex; flex-direction:column; overflow:hidden;
  color:var(--text); font-family:Inter,sans-serif;
  transform:translateX(100%); transition:transform 220ms cubic-bezier(0.16,1,0.3,1);
}
#bug-report-drawer.open{ transform:translateX(0); }

.br-head{
  display:flex; align-items:flex-start; justify-content:space-between; gap:14px;
  padding:22px 22px 18px; border-bottom:1px solid var(--border-soft); flex:none;
}
.br-eyebrow{
  font-family:Inter,sans-serif; font-size:10px; font-weight:700; letter-spacing:.18em;
  text-transform:uppercase; color:var(--accent); margin:0 0 12px;
  display:flex; align-items:center; gap:10px;
}
.br-eyebrow::before{ content:""; display:inline-block; width:24px; height:1px; background:var(--accent); }
.br-title{
  font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:20px;
  letter-spacing:-.012em; line-height:1.1; color:var(--text); margin:0;
}
.br-close{
  flex:none; width:30px; height:30px; border-radius:8px;
  background:none; border:0; color:var(--text-dim);
  cursor:pointer; font-size:18px; display:grid; place-items:center; line-height:1;
  transition:color .15s ease, background .15s ease;
}
.br-close:hover{ color:var(--text); background:color-mix(in oklab, var(--text) 6%, transparent); }
.br-close:active{ transform:scale(0.97); }

.br-body{
  flex:0 1 auto; overflow-y:auto;
  padding:20px 22px 22px; display:flex; flex-direction:column; gap:18px;
  background:var(--bg);
}
.br-field{ display:flex; flex-direction:column; gap:7px; }
.br-label{
  font-family:Inter,sans-serif; font-size:10.5px; font-weight:800; letter-spacing:.12em;
  text-transform:uppercase; color:var(--text-dim);
  display:flex; align-items:center;
}
.br-req{ color:var(--accent); margin-left:3px; }
.br-counter{ margin-left:auto; font-weight:600; letter-spacing:0; text-transform:none; font-size:11px;
  font-family:ui-monospace,Menlo,monospace; color:var(--text-dim); }
.br-counter.warn{ color:oklch(0.62 0.13 75); }
.br-input,.br-textarea{
  background:var(--surface); border:1px solid var(--border); border-radius:8px;
  padding:9px 12px; color:var(--text);
  font-family:Inter,sans-serif; font-size:13px; line-height:1.5;
}
.br-textarea{ min-height:78px; resize:vertical; white-space:pre-wrap; }
.br-input.err,.br-textarea.err{ border-color:oklch(0.50 0.13 25); }
.br-caption{ font-size:11px; line-height:1.4; margin-top:-2px; }
.br-caption-err{ color:oklch(0.50 0.13 25); font-weight:600; display:flex; align-items:center; gap:6px; }
.br-caption-err::before{
  content:"!"; width:14px; height:14px; border-radius:50%;
  background:oklch(0.50 0.13 25); color:#fff;
  display:grid; place-items:center; font-size:9px; font-weight:800; flex:none;
}

.br-steps-link{
  display:inline-flex; align-items:center; gap:8px; background:none; border:0; padding:2px 0;
  font-family:Inter,sans-serif; font-size:12px; font-weight:600;
  color:var(--text-mid); cursor:pointer; text-align:left; align-self:flex-start;
  border-bottom:1px solid transparent; transition:color .15s ease, border-color .15s ease;
}
.br-steps-link:hover{ color:var(--accent); border-bottom-color:var(--accent); }
.br-steps-link .br-plus{
  width:14px; height:14px; border-radius:50%; display:grid; place-items:center;
  background:color-mix(in oklab, var(--accent) 12%, transparent);
  color:var(--accent); font-size:14px; font-weight:600; line-height:1; flex:none;
}
.br-steps-link[hidden]{ display:none; }

.br-ctx{
  padding:11px 14px;
  background:color-mix(in oklab, var(--accent) 4.5%, transparent);
  border:1px solid color-mix(in oklab, var(--accent) 18%, transparent);
  border-radius:8px;
  font-size:11px; color:var(--text-mid); line-height:1.55;
  display:flex; flex-direction:column; gap:6px;
}
.br-ctx-h{
  font-weight:700; color:var(--accent); text-transform:uppercase;
  letter-spacing:.1em; font-size:9.5px;
  display:flex; align-items:center; gap:7px;
}
.br-ctx-h::after{
  content:""; flex:1; height:1px;
  background:color-mix(in oklab, var(--accent) 18%, transparent);
  max-width:80px;
}
.br-ctx-fields{ font-family:ui-monospace,Menlo,monospace; font-size:11px;
  color:var(--text-mid); line-height:1.7; word-break:break-word; }
.br-ctx-fields b{ color:var(--text); font-weight:600; }

.br-no-token{
  padding:11px 14px;
  background:color-mix(in oklab, oklch(0.50 0.13 25) 5%, transparent);
  border:1px solid color-mix(in oklab, oklch(0.50 0.13 25) 25%, transparent);
  border-radius:8px; font-size:11.5px; color:var(--text); line-height:1.5;
  display:flex; flex-direction:column; gap:5px;
}
.br-no-token b{ color:oklch(0.50 0.13 25); font-weight:700;
  text-transform:uppercase; letter-spacing:.08em; font-size:10px; }
.br-no-token a{ color:var(--accent); font-weight:600; text-decoration:none;
  border-bottom:1px solid var(--accent); }

.br-foot{
  padding:16px 22px; border-top:1px solid var(--border-soft);
  display:flex; align-items:center; justify-content:space-between; gap:14px;
  background:var(--surface-2); flex:none;
}
.br-cancel{
  background:none; border:0; color:var(--text-dim);
  font-family:Inter,sans-serif; font-size:12.5px; font-weight:600;
  cursor:pointer; padding:6px 2px; transition:color .15s ease;
}
.br-cancel:hover{ color:var(--text); }
.br-cancel:active{ transform:scale(0.97); }
.br-send{
  font-family:Inter,sans-serif; font-size:13px; font-weight:700;
  padding:10px 20px; border-radius:9px;
  background:var(--accent); color:var(--on-accent, var(--bg));
  border:1px solid var(--accent-deep, var(--accent)); cursor:pointer; letter-spacing:0;
  transition:filter .15s ease, transform .12s ease;
}
.br-send:hover{ filter:brightness(1.05); }
.br-send:active{ transform:scale(0.97); }
.br-send:disabled{ opacity:.5; cursor:not-allowed; }

/* Toast (reuse the existing sw-update banner pattern at body level) */
.br-toast{
  position:fixed; left:18px; bottom:18px; z-index:9002;
  display:flex; align-items:center; gap:11px;
  padding:11px 14px; max-width:320px;
  background:var(--surface); border:1px solid var(--border-soft);
  border-radius:11px; box-shadow:0 1px 0 color-mix(in oklab, var(--bg) 55%, transparent),
                                  0 18px 40px -16px color-mix(in oklab, var(--text) 25%, transparent);
  color:var(--text); font-family:Inter,sans-serif; font-size:12px;
  transform:translateY(120%); transition:transform 260ms cubic-bezier(0.16,1,0.3,1);
}
.br-toast.open{ transform:translateY(0); }
.br-toast.ok{ border-color:color-mix(in oklab, oklch(0.52 0.13 150) 55%, transparent); }
.br-toast.amber{ border-color:color-mix(in oklab, oklch(0.62 0.13 75) 55%, transparent); }
.br-toast.red{ border-color:color-mix(in oklab, oklch(0.50 0.13 25) 55%, transparent); }
.br-toast-i{
  width:24px; height:24px; border-radius:6px; display:grid; place-items:center;
  font-weight:800; font-size:13px; flex:none;
}
.br-toast.ok .br-toast-i{ color:oklch(0.52 0.13 150);
  background:color-mix(in oklab, oklch(0.52 0.13 150) 14%, transparent);
  border:1px solid color-mix(in oklab, oklch(0.52 0.13 150) 35%, transparent); }
.br-toast.amber .br-toast-i{ color:oklch(0.62 0.13 75);
  background:color-mix(in oklab, oklch(0.62 0.13 75) 14%, transparent);
  border:1px solid color-mix(in oklab, oklch(0.62 0.13 75) 35%, transparent); }
.br-toast.red .br-toast-i{ color:oklch(0.50 0.13 25);
  background:color-mix(in oklab, oklch(0.50 0.13 25) 14%, transparent);
  border:1px solid color-mix(in oklab, oklch(0.50 0.13 25) 35%, transparent); }
.br-toast-t{ font-weight:700; color:var(--text); }
.br-toast-l{ font-size:11px; color:var(--text-dim); }
.br-toast-l b{ color:var(--accent); }
.br-toast-link{ color:var(--accent); cursor:pointer; }

/* Topbar bug iconbtn — visible queue dot when count > 0 */
.topbar-iconbtn.has-queue::after{
  content:""; position:absolute; top:6px; right:6px;
  width:6px; height:6px; border-radius:50%; background:var(--accent);
}
#topbar-bug-report{ position:relative; }

/* Mobile bottom sheet — viewport <768px (Q1 default) */
@media (max-width: 767px){
  #bug-report-drawer{
    top:auto; right:0; left:0; bottom:0;
    width:100vw; max-width:100vw; max-height:85vh;
    border-radius:14px 14px 0 0;
    transform:translateY(100%);
  }
  #bug-report-drawer.open{ transform:translateY(0); }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .br-backdrop,#bug-report-drawer,.br-toast{ transition:none !important; }
  .br-send,.br-close,.br-cancel{ transition:none !important; }
}
```

- [ ] **Step 2: Bump `dg-system.css?v` cache-bust**

Find the `<link rel="stylesheet" href="dg-system.css?v=` in `index.html`:

Run: `grep -n 'dg-system.css?v=' index.html`

Expected: one or two matches, e.g. `dg-system.css?v=5.5.12`. Bump to `?v=5.5.13-bug-report-dev` (dev token; will normalise at ship).

- [ ] **Step 3: Commit**

```bash
git add dg-system.css index.html
git commit -m "feat(bug-report): drawer CSS (light + dark via OKLCH tokens)"
```

---

### Task 2.3: Open/close logic with portal-to-body

**Files:**
- Modify: `features/reports.js`

- [ ] **Step 1: Implement openDrawer / closeDrawer + state**

Replace the stubs:

```js
  var _drawerHost = null;
  var _drawerOpenedAt = 0;
  var _prevFocus = null;
  var _escListener = null;

  function _getCtx() {
    function safeRead(fn) { try { return fn(); } catch (e) { return null; } }
    var theme = safeRead(function(){ return document.documentElement.getAttribute('data-theme') || 'dark'; });
    var page = safeRead(function(){
      var pages = document.querySelectorAll('.page.active'); return pages.length ? '#' + pages[0].id : 'unknown';
    });
    var cert = safeRead(function(){
      // Read from CERT_PACK if available; fall back to localStorage CURRENT_CERT
      if (window.CERT_PACK && window.CERT_PACK.meta) {
        return (window.CURRENT_CERT || 'netplus') + '-' + window.CERT_PACK.meta.objectiveCode;
      }
      return (window.CURRENT_CERT || 'unknown');
    });
    var version = safeRead(function(){ return window.APP_VERSION || 'unknown'; });
    var viewport = window.innerWidth + 'x' + window.innerHeight;
    var lastQuiz = safeRead(function(){
      if (typeof loadHistory !== 'function') return null;
      var h = loadHistory();
      if (!h || !h.length) return null;
      var last = h[0];
      var minsAgo = Math.round((Date.now() - last.timestamp) / 60000);
      return { topic: last.topic, score: last.correct + '/' + last.total, minutes_ago: minsAgo };
    });
    var wrongBankSize = safeRead(function(){
      if (typeof loadWrongBank !== 'function') return 0;
      return (loadWrongBank() || []).length;
    }) || 0;

    return {
      version: version, page: page, cert: cert, theme: theme,
      viewport: viewport, last_quiz: lastQuiz, wrong_bank_size: wrongBankSize,
    };
  }

  function _hasToken() {
    try { return !!localStorage.getItem(STORAGE.GH_TOKEN); } catch (e) { return false; }
  }

  function openDrawer() {
    if (_drawerHost) return; // idempotent
    _prevFocus = document.activeElement;

    var ctx = _getCtx();
    var host = document.createElement('div');
    host.id = 'br-portal';
    host.innerHTML = _drawerHtml(ctx);
    document.body.appendChild(host);
    _drawerHost = host;
    _drawerOpenedAt = Date.now();

    // Disable token banner if token exists
    if (!_hasToken()) {
      host.querySelector('#br-no-token').hidden = false;
    }

    // Wire ESC + backdrop click + close × + cancel
    _escListener = function (e) { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', _escListener);
    host.querySelector('#br-backdrop').addEventListener('click', closeDrawer);
    host.querySelector('#br-close').addEventListener('click', closeDrawer);
    host.querySelector('#br-cancel').addEventListener('click', closeDrawer);

    // Settings deep-link
    var settingsLink = host.querySelector('#br-open-settings');
    if (settingsLink) settingsLink.addEventListener('click', function(e){
      e.preventDefault(); closeDrawer();
      if (typeof showPage === 'function') showPage('settings');
    });

    // Reveal with motion next frame (so transform transitions instead of snapping)
    requestAnimationFrame(function(){
      host.querySelector('#br-backdrop').classList.add('open');
      host.querySelector('#bug-report-drawer').classList.add('open');
      setTimeout(function(){
        var titleInput = host.querySelector('#br-input-title');
        if (titleInput) titleInput.focus();
      }, 220);
    });

    _wireForm(host); // TASK 3.x
    _wireSubmit(host); // TASK 5.x
  }

  function closeDrawer() {
    if (!_drawerHost) return;
    var host = _drawerHost;
    host.querySelector('#br-backdrop').classList.remove('open');
    var drawer = host.querySelector('#bug-report-drawer');
    drawer.classList.remove('open');
    document.removeEventListener('keydown', _escListener);
    _escListener = null;

    // Wait for transition before removing from DOM
    setTimeout(function(){
      if (host.parentNode) host.parentNode.removeChild(host);
      _drawerHost = null;
      if (_prevFocus && _prevFocus.focus) _prevFocus.focus();
      _prevFocus = null;
    }, 240);
  }

  // Stubs that later tasks will implement; provide empty bodies so openDrawer doesn't error
  function _wireForm(host) {}
  function _wireSubmit(host) {}
```

- [ ] **Step 2: UAT must still pass (no behavioural change)**

Run: `node tests/uat.js | tail -3`
Expected: 4 fixture blocks still green.

- [ ] **Step 3: Commit**

```bash
git add features/reports.js
git commit -m "feat(bug-report): drawer open/close + portal + focus management"
```

---

### Task 2.4: Topbar bug iconbtn

**Files:**
- Modify: `index.html` (line ~174, between settings and theme toggle)

- [ ] **Step 1: Insert iconbtn**

Locate the topbar block at index.html:148–177. Between the settings button (line 174) and theme toggle (line 175), insert:

```html
    <button type="button" class="topbar-iconbtn" id="topbar-bug-report" onclick="(async()=>{var m=await _loadFeature('reports');m.openDrawer();})()" aria-label="Report an issue" title="Report an issue"><svg viewBox="0 0 24 24" fill="none" width="15" height="15"><path d="M8 2v3M16 2v3M9 6h6c3.31 0 6 2.69 6 6v0c0 3.31-2.69 6-6 6h-6c-3.31 0-6-2.69-6-6v0c0-3.31 2.69-6 6-6z" stroke="currentColor" stroke-width="1.5"/><path d="M9 12h6M9 15h6M9 9h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>
```

- [ ] **Step 2: Smoke-test locally**

Run: `python3 -m http.server 3131 &` then open `http://localhost:3131` and verify the bug icon renders between settings and theme. Click → drawer should slide in from right (light theme) or appear (dark).

If anything errors in the console, fix before continuing.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(bug-report): topbar bug iconbtn + lazy-load wire"
```

---

## Stage 3: Form behavior

### Task 3.1: Required-field validation + Send gating

**Files:**
- Modify: `features/reports.js`

- [ ] **Step 1: Implement `_wireForm()`**

Replace the `function _wireForm(host) {}` stub:

```js
  function _wireForm(host) {
    var titleEl = host.querySelector('#br-input-title');
    var descEl = host.querySelector('#br-input-desc');
    var sendEl = host.querySelector('#br-send');
    var stepsToggle = host.querySelector('#br-steps-toggle');
    var counter = host.querySelector('#br-desc-counter');
    var titleErr = host.querySelector('#br-title-err');
    var descErr = host.querySelector('#br-desc-err');

    function updateSend() {
      var t = titleEl.value.trim();
      var d = descEl.value.trim();
      var ok = t.length > 0 && d.length > 0 && _hasToken();
      sendEl.disabled = !ok;
    }

    function updateCounter() {
      var len = descEl.value.length;
      if (len >= 4000) {
        counter.hidden = false;
        counter.textContent = len.toLocaleString() + ' / 5,000';
        counter.classList.toggle('warn', len >= 4000);
      } else {
        counter.hidden = true;
      }
    }

    titleEl.addEventListener('input', function(){
      titleEl.classList.remove('err'); titleErr.hidden = true; updateSend();
    });
    descEl.addEventListener('input', function(){
      descEl.classList.remove('err'); descErr.hidden = true;
      updateCounter(); updateSend();
    });

    // Steps-to-reproduce expander
    var stepsInserted = false;
    stepsToggle.addEventListener('click', function(){
      if (stepsInserted) return;
      stepsInserted = true;
      var field = document.createElement('div');
      field.className = 'br-field';
      field.innerHTML =
        '<label class="br-label" for="br-input-steps">Steps to reproduce <span style="color:var(--text-dim);font-weight:400;font-size:9.5px">(optional)</span></label>' +
        '<textarea class="br-textarea" id="br-input-steps" maxlength="2000" placeholder="1. ...&#10;2. ...&#10;3. ..."></textarea>';
      stepsToggle.parentNode.insertBefore(field, stepsToggle);
      stepsToggle.hidden = true;
      var stepsEl = host.querySelector('#br-input-steps');
      stepsEl.focus();
    });

    updateSend();
  }
```

- [ ] **Step 2: Manual smoke-test**

Open localhost, click bug icon, verify:
- Send button is disabled while title or desc empty
- Type in title → counter doesn't appear (only on desc 4000+)
- Type 4000+ chars in desc → counter shows "4,000 / 5,000" amber
- Click "+ Add steps to reproduce" → textarea inserted, link disappears

- [ ] **Step 3: Commit**

```bash
git add features/reports.js
git commit -m "feat(bug-report): form validation + char counter + steps expander"
```

---

## Stage 4: Submit pipeline

### Task 4.1: `submitReport()` + toast helper

**Files:**
- Modify: `features/reports.js`

- [ ] **Step 1: Implement helpers and submitReport**

Add (before `_wireForm`):

```js
  var GH_OWNER = 'oremosu98';
  var GH_REPO = 'networkplus-quiz';

  function _showToast(opts) {
    var existing = document.querySelector('.br-toast');
    if (existing) existing.parentNode.removeChild(existing);
    var t = document.createElement('div');
    var tone = opts.tone || 'ok';
    t.className = 'br-toast ' + tone;
    var icon = tone === 'ok' ? '&check;' : (tone === 'amber' ? '&#8635;' : '&times;');
    t.innerHTML =
      '<div class="br-toast-i">' + icon + '</div>' +
      '<div><div class="br-toast-t">' + (opts.title || '') + '</div>' +
      (opts.sub ? '<div class="br-toast-l">' + opts.sub + '</div>' : '') + '</div>';
    if (opts.url) {
      t.classList.add('br-toast-link');
      t.addEventListener('click', function(){ window.open(opts.url, '_blank', 'noopener'); });
    }
    document.body.appendChild(t);
    requestAnimationFrame(function(){ t.classList.add('open'); });
    setTimeout(function(){
      t.classList.remove('open');
      setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, opts.duration || 5000);
  }

  function _loadQueue() {
    try { return JSON.parse(localStorage.getItem(STORAGE.BUG_REPORTS) || '[]'); }
    catch (e) { return []; }
  }
  function _saveQueue(q) {
    try { localStorage.setItem(STORAGE.BUG_REPORTS, JSON.stringify(q)); } catch (e) {}
  }

  function _certBadgeClass() {
    try { return 'cert:' + (window.CURRENT_CERT || 'unknown'); } catch (e) { return 'cert:unknown'; }
  }

  async function submitReport(payload) {
    var token;
    try { token = localStorage.getItem(STORAGE.GH_TOKEN); } catch (e) { token = null; }
    if (!token) {
      return classifyError({ status: 401 });
    }

    var body = renderIssueBody(payload);
    var labels = ['bug-report', _certBadgeClass(), 'version:' + (payload.context && payload.context.version) ];

    try {
      var resp = await fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/issues', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '[user-report] ' + payload.title,
          body: body,
          labels: labels,
        }),
      });

      var rlRem = parseInt(resp.headers.get('x-ratelimit-remaining') || '-1', 10);
      var rlReset = parseInt(resp.headers.get('x-ratelimit-reset') || '0', 10);
      if (resp.ok) {
        var json = await resp.json();
        return Object.assign(classifyError({ status: resp.status }), {
          issue_number: json.number, issue_url: json.html_url,
        });
      }
      var respBody = null;
      try { respBody = await resp.json(); } catch (e) {}
      var cls = classifyError({
        status: resp.status,
        ratelimit_remaining: rlRem >= 0 ? rlRem : undefined,
        ratelimit_reset: rlReset || undefined,
        body: respBody,
      });
      if (cls.type === 'payload') {
        try { console.error('[bug-report] 422 payload rejected:', respBody); } catch (e) {}
      }
      return cls;
    } catch (e) {
      return classifyError({ status: 0, network: true });
    }
  }

  function _wireSubmit(host) {
    host.querySelector('#br-send').addEventListener('click', async function(){
      var sendBtn = host.querySelector('#br-send');
      sendBtn.disabled = true;
      var form = {
        title: host.querySelector('#br-input-title').value,
        desc: host.querySelector('#br-input-desc').value,
        steps: (host.querySelector('#br-input-steps') || {}).value || null,
      };
      var payload = buildPayload(form, _getCtx());
      var result = await submitReport(payload);

      if (result.type === 'success') {
        _showToast({ tone: 'ok', title: 'Report filed',
          sub: 'Issue <b>#' + result.issue_number + '</b> · tap to open',
          url: result.issue_url });
        // Clear from queue if this was a retry
        var q = _loadQueue();
        _saveQueue(q.filter(function(r){ return r.id !== payload.id; }));
        closeDrawer();
        _updateTopbarDot();
        return;
      }

      // Failure paths
      if (result.queueAction === 'enqueue' || result.queueAction === 'requeue') {
        var q2 = _loadQueue();
        var record = {
          id: payload.id, payload: payload,
          attempts: 1, last_try: payload.submitted_at,
          next_try: result.next_try || null,
          terminal: !!result.terminal,
        };
        _saveQueue(enqueueReport(record, q2));
      }
      _showToast({ tone: result.toast.tone, title: result.toast.title });
      sendBtn.disabled = false;
      _updateTopbarDot();
    });
  }

  function _updateTopbarDot() {
    var btn = document.getElementById('topbar-bug-report');
    if (!btn) return;
    var q = _loadQueue();
    btn.classList.toggle('has-queue', q.length > 0);
  }
```

- [ ] **Step 2: Smoke-test happy path**

Settings → enter a real GH_TOKEN (PAT with `repo` scope on `oremosu98/networkplus-quiz`).
Click bug icon → fill title + desc → Send → should show green toast with issue #.

- [ ] **Step 3: Smoke-test offline path**

DevTools → Network → Offline → click bug icon → fill + Send → should show amber "Saved offline · retries on next visit" toast; inspect `localStorage.nplus_bug_reports` — should have 1 entry.

- [ ] **Step 4: Commit**

```bash
git add features/reports.js
git commit -m "feat(bug-report): submit pipeline + toast + queue write"
```

---

## Stage 5: Retry queue drain

### Task 5.1: `drainQueue()` on DOMContentLoaded

**Files:**
- Modify: `features/reports.js`, `app.js`

- [ ] **Step 1: Implement drainQueue in features/reports.js**

Replace the stub:

```js
  async function drainQueue() {
    var q = _loadQueue();
    if (!q.length) return;

    var keep = [];
    var landed = 0;
    for (var i = 0; i < q.length; i++) {
      var entry = q[i];
      if (entry.terminal) { keep.push(entry); continue; }
      if (entry.next_try && Date.now() < entry.next_try * 1000) {
        keep.push(entry); continue;
      }
      // One attempt
      var result = await submitReport(entry.payload);
      if (result.type === 'success') {
        landed++;
        continue; // don't keep
      }
      entry.attempts = (entry.attempts || 1) + 1;
      entry.last_try = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      entry.next_try = result.next_try || null;
      entry.terminal = !!result.terminal;
      keep.push(entry);
    }
    _saveQueue(keep);
    _updateTopbarDot();

    if (landed > 0) {
      _showToast({ tone: 'ok',
        title: 'Filed offline ' + (landed === 1 ? 'report' : 'reports'),
        sub: landed + ' queued ' + (landed === 1 ? 'report' : 'reports') + ' just landed',
      });
    }
  }
```

- [ ] **Step 2: Add DOMContentLoaded hook in app.js**

In `app.js`, near the bottom (after the existing init functions), add:

```js
// v5.6.x — Bug-report retry queue drain
window.addEventListener('DOMContentLoaded', function(){
  // Run after a 2s delay so it doesn't block first-paint
  setTimeout(function(){
    if (typeof _loadFeature !== 'function') return;
    _loadFeature('reports').then(function(m){
      if (m && typeof m.drainQueue === 'function') m.drainQueue();
    }).catch(function(){ /* silent */ });
  }, 2000);
});
```

- [ ] **Step 3: Manual smoke-test**

Seed the queue manually on localhost:
- DevTools console: `localStorage.setItem('nplus_bug_reports', JSON.stringify([{id:'rpt_test', payload:{title:'queued test', description:'from queue', steps:null, context:{version:'v5.5.12',page:'#page-setup',cert:'netplus-N10-009',theme:'light',viewport:'1440x900',last_quiz:null,wrong_bank_size:0}, submitted_at:'2026-05-20T14:32:07Z', attempt_count:1}, attempts:1, last_try:'2026-05-20T14:32:07Z', terminal:false}]))`
- Reload page
- Within ~2s, expect a green toast "Filed offline report" + queue cleared (verify `localStorage.getItem('nplus_bug_reports')` → `'[]'`)

⚠️ Run this on `localhost:3131` ONLY, never on prod. The v4.81.x data-safety rule applies.

- [ ] **Step 4: Commit**

```bash
git add features/reports.js app.js
git commit -m "feat(bug-report): retry queue drain on DOMContentLoaded"
```

---

## Stage 6: Settings → Reports panel

### Task 6.1: Render hook + panel markup

**Files:**
- Modify: `features/reports.js`, `app.js`

- [ ] **Step 1: Implement renderSettingsReportsPanel()**

Replace stub in `features/reports.js`:

```js
  function renderSettingsReportsPanel(host) {
    if (!host) return;
    var q = _loadQueue();
    var rows = q.map(function(r){
      var status = r.terminal ? 'hf' : 'tr';
      var statusLabel = r.terminal ? 'Failed' : 'Pending';
      var ago = r.last_try ? _ago(r.last_try) : '';
      return (
        '<div class="br-sp-row" data-id="' + r.id + '">' +
          '<div class="br-sp-status br-sp-' + status + '"><span class="br-sp-dot"></span>' + statusLabel + '</div>' +
          '<div class="br-sp-body"><div class="br-sp-title">' + _esc(r.payload.title) + '</div>' +
            '<div class="br-sp-sub">' + r.id + ' · ' + (r.attempts || 1) + ' attempt' + ((r.attempts || 1) === 1 ? '' : 's') + '</div></div>' +
          '<div class="br-sp-when">' + ago + '</div>' +
          '<div class="br-sp-acts">' +
            '<button class="br-sp-retry" data-id="' + r.id + '">Retry</button>' +
            '<button class="br-sp-del" data-id="' + r.id + '">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    host.innerHTML =
      '<div class="br-sp-hd"><div class="br-sp-eyb">&sect; Reports</div>' +
      '<h4>Pending reports</h4><div class="br-sp-meta">' + q.length + ' queued · drains on next page load</div></div>' +
      '<div class="br-sp-list">' + (rows || '<div class="br-sp-empty">No queued reports.</div>') + '</div>';

    // Wire retry/delete
    host.querySelectorAll('.br-sp-retry').forEach(function(b){
      b.addEventListener('click', async function(){
        var id = b.getAttribute('data-id');
        var qNow = _loadQueue();
        var entry = qNow.find(function(x){ return x.id === id; });
        if (!entry) return;
        var result = await submitReport(entry.payload);
        if (result.type === 'success') {
          _saveQueue(qNow.filter(function(x){ return x.id !== id; }));
        } else {
          entry.attempts = (entry.attempts || 1) + 1;
          entry.terminal = !!result.terminal;
          _saveQueue(qNow);
        }
        renderSettingsReportsPanel(host);
        _updateTopbarDot();
      });
    });
    host.querySelectorAll('.br-sp-del').forEach(function(b){
      b.addEventListener('click', function(){
        var id = b.getAttribute('data-id');
        _saveQueue(_loadQueue().filter(function(x){ return x.id !== id; }));
        renderSettingsReportsPanel(host);
        _updateTopbarDot();
      });
    });
  }

  function _ago(iso) {
    try {
      var t = new Date(iso).getTime(); var s = Math.floor((Date.now() - t) / 1000);
      if (s < 60) return s + 's ago';
      if (s < 3600) return Math.floor(s/60) + 'm ago';
      if (s < 86400) return Math.floor(s/3600) + 'h ago';
      return Math.floor(s/86400) + 'd ago';
    } catch (e) { return ''; }
  }
  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }
```

- [ ] **Step 2: Add CSS for the Settings panel rows**

Append to the existing dg-system.css block (after the drawer styles):

```css
/* Settings → Reports panel */
.br-sp-hd{ display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
.br-sp-eyb{ font-size:10px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--accent); display:flex; align-items:center; gap:10px; }
.br-sp-eyb::before{ content:""; display:inline-block; width:24px; height:1px; background:var(--accent); }
.br-sp-hd h4{ font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:17px; letter-spacing:-.012em; margin:0; }
.br-sp-meta{ font-size:11.5px; color:var(--text-dim); }
.br-sp-list{ display:flex; flex-direction:column; }
.br-sp-row{ padding:14px 0; border-bottom:1px solid var(--border-soft);
  display:grid; grid-template-columns:80px 1fr auto auto; gap:14px; align-items:center; }
.br-sp-row:last-child{ border-bottom:0; }
.br-sp-status{ font-size:9.5px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; display:flex; align-items:center; gap:6px; }
.br-sp-dot{ width:7px; height:7px; border-radius:50%; flex:none; }
.br-sp-tr{ color:oklch(0.62 0.13 75); } .br-sp-tr .br-sp-dot{ background:oklch(0.62 0.13 75); }
.br-sp-hf{ color:oklch(0.50 0.13 25); } .br-sp-hf .br-sp-dot{ background:oklch(0.50 0.13 25); }
.br-sp-body{ display:flex; flex-direction:column; gap:3px; }
.br-sp-title{ font-size:12.5px; font-weight:600; color:var(--text); }
.br-sp-sub{ font-size:11px; color:var(--text-dim); font-family:ui-monospace,Menlo,monospace; }
.br-sp-when{ font-size:11px; color:var(--text-dim); font-variant-numeric:tabular-nums; }
.br-sp-acts{ display:flex; gap:4px; }
.br-sp-acts button{ background:none; border:0; color:var(--text-dim); font-size:11px; font-weight:600; padding:4px 8px; border-radius:5px; cursor:pointer; border-bottom:1px solid transparent; }
.br-sp-acts button:hover{ color:var(--accent); border-bottom-color:var(--accent); }
.br-sp-empty{ padding:14px 0; color:var(--text-dim); font-size:12.5px; font-style:italic; }
```

- [ ] **Step 3: Hook into existing Settings render**

Find where the Settings page renders. Search:

Run: `grep -n "settings-group-danger\|settings-section-title" app.js | head -5`

After the existing settings-group renders (likely around the danger zone group), append a new section. The exact insertion depends on what we find — add it INSIDE the page-settings render function as a new `<section>` block, e.g.:

```js
// In the Settings render fn, after the last group:
var reportsSection = document.createElement('section');
reportsSection.className = 'card settings-section';
reportsSection.id = 'settings-reports-section';
settingsContent.appendChild(reportsSection);

// Async-load + render
if (typeof _loadFeature === 'function') {
  _loadFeature('reports').then(function(m){
    if (m && typeof m.renderSettingsReportsPanel === 'function') {
      m.renderSettingsReportsPanel(reportsSection);
    }
  }).catch(function(){});
}
```

⚠️ The exact code depends on the existing Settings render function (which I have not opened in this plan — Stage 6 requires reading the actual Settings render). Read `app.js` around the settings render entry point first; then mirror the existing pattern for adding a section.

- [ ] **Step 4: Smoke-test**

Open localhost → Settings → scroll to Reports section. Should show "Pending reports / 0 queued". Seed the queue (Stage 5 step 3), reload → should show 1 row with Retry/Delete buttons.

- [ ] **Step 5: Commit**

```bash
git add features/reports.js app.js dg-system.css
git commit -m "feat(bug-report): Settings → Reports panel"
```

---

## Stage 7: DOM tests

### Task 7.1: Playwright tests 01–04 (open/close/gating)

**Files:**
- Modify: `tests/e2e/app.spec.js`

- [ ] **Step 1: Add a `describe('bug-report drawer')` block at the end of the spec file**

```js
test.describe('bug-report drawer', () => {
  test.beforeEach(async ({ page }) => {
    // Seed a fake GH token so the form is unlocked
    await page.addInitScript(() => {
      try { localStorage.setItem('nplus_gh_token', 'ghp_test_dummy_token_value_for_e2e_only'); } catch (e) {}
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('01: opens from topbar bug icon', async ({ page }) => {
    await page.click('#topbar-bug-report');
    const drawer = page.locator('#bug-report-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('role', 'dialog');
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('#br-input-title')).toBeFocused();
  });

  test('02: closes via ESC, ×, Cancel, and backdrop click', async ({ page }) => {
    // ESC
    await page.click('#topbar-bug-report');
    await page.keyboard.press('Escape');
    await expect(page.locator('#bug-report-drawer')).toHaveCount(0);
    // ×
    await page.click('#topbar-bug-report');
    await page.click('#br-close');
    await expect(page.locator('#bug-report-drawer')).toHaveCount(0);
    // Cancel
    await page.click('#topbar-bug-report');
    await page.click('#br-cancel');
    await expect(page.locator('#bug-report-drawer')).toHaveCount(0);
    // Backdrop
    await page.click('#topbar-bug-report');
    await page.locator('#br-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#bug-report-drawer')).toHaveCount(0);
  });

  test('03: Send disabled until both required fields filled', async ({ page }) => {
    await page.click('#topbar-bug-report');
    const send = page.locator('#br-send');
    await expect(send).toBeDisabled();
    await page.fill('#br-input-title', 'a');
    await expect(send).toBeDisabled();
    await page.fill('#br-input-desc', 'b');
    await expect(send).toBeEnabled();
    await page.fill('#br-input-title', '');
    await expect(send).toBeDisabled();
  });

  test('04: char counter activates at 4,000 and hard-caps at 5,000', async ({ page }) => {
    await page.click('#topbar-bug-report');
    const counter = page.locator('#br-desc-counter');
    await expect(counter).toBeHidden();
    await page.fill('#br-input-desc', 'a'.repeat(3999));
    await expect(counter).toBeHidden();
    await page.fill('#br-input-desc', 'a'.repeat(4000));
    await expect(counter).toBeVisible();
    await page.fill('#br-input-desc', 'a'.repeat(5500));
    const actualLen = await page.inputValue('#br-input-desc').then(s => s.length);
    expect(actualLen).toBe(5000);
  });
});
```

- [ ] **Step 2: Run Playwright locally**

Run: `npx playwright test --grep="bug-report" --project=chromium`
Expected: 4/4 pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/app.spec.js
git commit -m "test(bug-report): Playwright tests 01-04 (open/close/gating/counter)"
```

---

### Task 7.2: Playwright tests 05–09 (expander/toast/queue/cross-cert)

**Files:**
- Modify: `tests/e2e/app.spec.js`

- [ ] **Step 1: Append tests inside the same `describe` block**

```js
  test('05: steps expander inserts textarea and hides link', async ({ page }) => {
    await page.click('#topbar-bug-report');
    await expect(page.locator('#br-steps-toggle')).toBeVisible();
    await expect(page.locator('#br-input-steps')).toHaveCount(0);
    await page.click('#br-steps-toggle');
    await expect(page.locator('#br-input-steps')).toBeVisible();
    await expect(page.locator('#br-steps-toggle')).toBeHidden();
  });

  test('06: queue drain seed → drains on page load', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('nplus_bug_reports', JSON.stringify([{
          id: 'rpt_test', attempts: 1, terminal: false,
          payload: {
            id: 'rpt_test', title: 'queued', description: 'q',
            steps: null, attempt_count: 1, submitted_at: '2026-05-20T14:32:07Z',
            context: { version: 'v5.5.12', page: '#page-setup', cert: 'netplus-N10-009',
                       theme: 'light', viewport: '1440x900', last_quiz: null, wrong_bank_size: 0 }
          }
        }]));
      } catch (e) {}
    });
    // Intercept the GitHub API call and return 401 (since fake token) — confirms a request was attempted
    await page.route('https://api.github.com/**', route => route.fulfill({ status: 401, body: '{}' }));
    await page.goto('/');
    await page.waitForTimeout(3500); // 2s delay + buffer
    // After drain, queue should have updated attempts (the 401 marks it terminal)
    const q = await page.evaluate(() => localStorage.getItem('nplus_bug_reports'));
    expect(q).toBeTruthy();
    const parsed = JSON.parse(q);
    expect(parsed.length).toBe(1);
    expect(parsed[0].terminal).toBe(true);
  });

  test('07: token banner shows when GH_TOKEN missing', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.removeItem('nplus_gh_token'); } catch (e) {}
    });
    await page.goto('/');
    await page.click('#topbar-bug-report');
    await expect(page.locator('#br-no-token')).toBeVisible();
    await expect(page.locator('#br-send')).toBeDisabled();
  });

  test('08: cross-cert leak filter — Sec+ active reads secplus cert', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('nplus_current_cert', 'secplus'); } catch (e) {}
    });
    await page.goto('/');
    await page.click('#topbar-bug-report');
    const ctxText = await page.locator('.br-ctx-fields').innerText();
    expect(ctxText).toContain('secplus');
    expect(ctxText).not.toContain('netplus');
  });

  test('09: topbar dot appears when queue non-empty', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('nplus_bug_reports', JSON.stringify([{
          id: 'rpt_test', attempts: 1, terminal: true,
          payload: { id:'rpt_test', title:'q', context:{} }
        }]));
      } catch (e) {}
    });
    await page.goto('/');
    // Open the drawer (which triggers _updateTopbarDot)
    await page.click('#topbar-bug-report');
    await page.click('#br-close');
    await expect(page.locator('#topbar-bug-report')).toHaveClass(/has-queue/);
  });
```

- [ ] **Step 2: Run + commit**

Run: `npx playwright test --grep="bug-report" --project=chromium`
Expected: 9/9 pass.

```bash
git add tests/e2e/app.spec.js
git commit -m "test(bug-report): Playwright tests 05-09 (expander/queue/no-token/cross-cert/dot)"
```

---

## Stage 8: UAT structural guards

### Task 8.1: Add UAT structural assertions

**Files:**
- Modify: `tests/uat.js`

- [ ] **Step 1: Append guards near the report fixtures**

```js
// ─── Bug-report structural guards ─────────────────────────
const reportsModule = fs.readFileSync(path.join(__dirname,'..','features','reports.js'),'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const appJs = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const dgCss = fs.readFileSync(path.join(__dirname,'..','dg-system.css'),'utf8');

// Topbar iconbtn exists
assert(indexHtml.includes('id="topbar-bug-report"'), 'topbar bug iconbtn exists');
assert(indexHtml.includes("_loadFeature('reports')"), 'bug iconbtn lazy-loads reports module');

// STORAGE.BUG_REPORTS key
assert(/BUG_REPORTS:\s*'nplus_bug_reports'/.test(appJs), 'STORAGE.BUG_REPORTS key registered');

// Feature module contract
assert(reportsModule.includes('window._certanvilFeatures.reports'), 'reports.js registers on _certanvilFeatures');
assert(reportsModule.includes('function buildPayload') && reportsModule.includes('function renderIssueBody') &&
       reportsModule.includes('function classifyError') && reportsModule.includes('function enqueueReport'),
       'reports.js exports all 4 pure functions');

// DOMContentLoaded drain hook in app.js
assert(/DOMContentLoaded[\s\S]{0,400}_loadFeature\('reports'\)[\s\S]{0,200}drainQueue/.test(appJs),
       'app.js drainQueue hook on DOMContentLoaded');

// CSS — drawer + toast classes present
assert(dgCss.includes('#bug-report-drawer'), 'drawer CSS scoped to #bug-report-drawer');
assert(dgCss.includes('.br-toast'), 'toast CSS exists');
assert(dgCss.includes('@media (max-width: 767px)'), 'mobile bottom-sheet breakpoint present');
assert(dgCss.includes('prefers-reduced-motion'), 'reduced-motion gate present');

// Tombstone — STORAGE.BUG_REPORTS must not collide with STORAGE.REPORTS string
assert(!/BUG_REPORTS:\s*'nplus_reports'/.test(appJs), 'BUG_REPORTS does not collide with REPORTS key');
```

- [ ] **Step 2: UAT must pass**

Run: `node tests/uat.js | tail -5`
Expected: 11 new assertions added, all pass.

- [ ] **Step 3: Commit**

```bash
git add tests/uat.js
git commit -m "test(bug-report): UAT structural guards (11 assertions)"
```

---

## Stage 9: Dogfood smoke

### Task 9.1: Run the 8-step dogfood manual checklist

**Files:** none (manual)

Follow each step from spec section 7.3. Take notes; do not commit anything unless a step fails and needs a code fix.

- [ ] **Step 1: Open drawer from topbar on local — drawer slides in, focus on title**
- [ ] **Step 2: File a real issue from local dev — toast shows # + tap opens GH; auto-context table populated**
- [ ] **Step 3: Throttle to offline — toast "Saved offline"; `nplus_bug_reports` shows entry attempts:1**
- [ ] **Step 4: Restore network + reload — queue drains within ~2s; toast green; queue empty**
- [ ] **Step 5: Break token + retry — red toast "Token rejected"; Settings → Reports shows Failed pill; restore + Retry → success**
- [ ] **Step 6: Switch Net+ → Sec+ + open drawer — `.br-ctx-fields` shows `secplus-...`, no Net+ leak**
- [ ] **Step 7: Toggle dark theme + repeat step 2 — drawer + toast adapt; no light-mode artifacts**
- [ ] **Step 8: Resize to 375×667 + repeat step 2 — drawer becomes bottom sheet; tap targets ≥44px; Send visible on empty form**

If any step fails: stop, file an inline task to fix, then re-run from step 1.

- [ ] **Step 9: All 8 pass → mark Task 9.1 complete**

---

## Final wrap-up

### Task 10.1: Final sanity check

- [ ] **Step 1: Full UAT + Playwright + tech-debt**

Run in parallel:
```bash
node tests/uat.js | tail -5
npx playwright test --project=chromium | tail -10
node tests/tech-debt.js | tail -5
```

Expected: all three green.

- [ ] **Step 2: Confirm branch state — no main, no push**

Run: `git branch -vv | grep '^\*' && git log --oneline -10`
Expected: `* feat/bug-report-popup ...` (no `[origin/...]` tracking); recent commits all `feat(bug-report)` / `test(bug-report)`.

- [ ] **Step 3: Hand off to founder**

Wait for explicit ship signal. Do not run `bump-version.js`, do not push to main, do not open a PR. The branch can sit indefinitely.

When founder gives ship signal: see Spec section 10 "Implementation handoff notes" for the activation sequence.

---

## Self-review checklist

Before declaring this plan done, walk this list:

**Spec coverage:**
- [x] Section 2 (Components): Tasks 2.1–2.4 + Task 3.1 implement the drawer (markup + CSS + open/close + form)
- [x] Section 3 (Data flow): Tasks 1.1–1.8 implement the 4 pure functions; Task 4.1 implements the GitHub API submit
- [x] Section 4 (Error handling): `classifyError` covers the 7 cases; Task 4.1 routes them to toast tone + queue action; Task 6.1 surfaces failed reports in Settings
- [x] Section 5 (Testing): Tasks 1.1–1.8 (4 fixtures), Tasks 7.1–7.2 (9 DOM tests), Task 9.1 (8-step dogfood), Task 8.1 (UAT guards)
- [x] Q1 mobile bottom-sheet: Task 2.2 CSS `@media (max-width: 767px)` block
- [x] Q2 topbar queue dot: Task 4.1 `_updateTopbarDot()` + Task 2.2 `.has-queue::after`
- [x] Q5 retry-success toast: Task 5.1 `drainQueue()` `_showToast` on success

**Placeholder scan:** zero `TBD` / `TODO` / "implement later" / "Similar to Task N" / unspecified error handling. All code present.

**Type consistency:** function signatures match across tasks. `buildPayload(form, ctx)` → `{id, title, ...}`. `renderIssueBody(payload)` → string. `classifyError(resp)` → `{type, queueAction, toast, terminal, ...}`. `enqueueReport(rpt, store)` → array. All call sites use the same names.

**One scope deviation flagged inline:** Task 6.1 step 3 says "the exact code depends on the existing Settings render function" — the engineer reads `app.js` to find the insertion point and mirrors the existing settings-group pattern. This is honest scope ambiguity, not a placeholder.

**One spec deviation called out at top:** `STORAGE.BUG_REPORTS` (not `STORAGE.REPORTS`) — the existing key is already in use by the bad-quiz reporter.
