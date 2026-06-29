---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# M7 — Remove CSP `script-src 'unsafe-inline'` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `'unsafe-inline'` from the `script-src` CSP directive in `vercel.json` by migrating all ~175 inline event handlers to a central `data-action` delegation module and externalizing/hashing the 3 inline `<script>` blocks.

**Architecture:** A new external `event-actions.js` installs three delegated listeners (`click`/`change`/`input`) on `document`. Every inline `on*=` handler becomes `data-action="fnName"` (+ optional `data-args='[…]'` JSON). Existing global functions are untouched — only the DOM→function wiring changes. Work ships in 6 staged PRs; the first 5 migrate handlers under the unchanged (still-permissive) CSP so nothing breaks, and the 6th flips the CSP.

**Tech Stack:** Static HTML/JS/CSS, no build step. Vercel hosting (CSP via response header in `vercel.json`). Service worker precache (`sw.js`). UAT = `node tests/uat.js` (source-string + vm-sandbox behavioral assertions). E2E = Playwright (`tests/e2e/app.spec.js`).

**Spec:** `docs/superpowers/specs/2026-05-31-m7-csp-unsafe-inline-design.md`

---

## Conventions for this plan

- **Branch per PR**, off latest `main`: `feature/m7-<slice>`. Gated files (`sw.js`, `vercel.json`) → PR + Vercel preview smoke + squash-merge. Pure HTML/JS slices are fast-lane but still go via small PRs per the spec.
- **Version bump** only when shipping a user-facing or asset change: `node scripts/bump-version.js <new> "<desc>"` (updates app.js APP_VERSION + sw.js CACHE_NAME + index.html badge + package.json + Version-History stub). PR-1 and PR-6 bump; pure-conversion PRs (2–5) change behavior-equivalent markup and SHOULD bump (new asset hashes change the shell) — bump a patch each.
- **Baseline:** keep `MVP_BASELINE_FAILS ≤ 2700`, zero net-new fails. Verify by running `node tests/uat.js` and diffing the fail count against `main`.
- **Never** write user-state localStorage on a prod/`*.vercel.app` host (hard rule). Live-verify on `localhost:3131` or a preview deploy or incognito.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `event-actions.js` | Delegation core: 3 document listeners, `decodeArgs`, action-override map for event-needing/exotic handlers | **Create** |
| `index.html` | Replace 102 inline `on*=` with `data-action`; add `<script defer src="event-actions.js">` before app.js; externalize/keep+hash 3 inline `<script>` blocks | Modify |
| `app.js` | Replace 73 generated `onclick="fn(…)"` template strings with `data-action`/`data-args` emission | Modify |
| `bootstrap-head.js` | Extracted contents of the inline bootstrap `<script>` (index.html ~L43), if externalizable | **Create (PR-6)** |
| `sw.js` | Add `./event-actions.js` (+ any extracted bootstrap file) to `SHELL_ASSETS`; cache name bumped via bump-version | Modify |
| `vercel.json` | PR-6: remove `'unsafe-inline'` from `script-src`; add `'sha256-…'` for any remaining inline script | Modify |
| `tests/uat.js` | Add `Sec-P7` guard block | Modify |
| `tests/e2e/app.spec.js` | Add targeted click tests for thin-coverage converted surfaces | Modify |

---

## The `data-action` contract (read before any task)

**Markup:**
- Zero-arg: `<button data-action="goSetup">`
- With args: `<button data-action="setProgressFilter" data-args='["weak"]'>` (args is a JSON array; types preserved — `data-args='[50]'`, `data-args='[false, 5]'`)
- In app.js templates, build `data-args` with the existing `escAttr` helper (app.js:15722) to keep the attribute safe: `data-args="${escAttr(JSON.stringify([id]))}"`.

**Dispatch rule (in `event-actions.js`):**
1. `el = e.target.closest('[data-action]')`; bail if none.
2. `name = el.dataset.action`.
3. If `name` is in the `ACTIONS` override map → call `ACTIONS[name](e, el)` (used for handlers that need the event or are exotic).
4. Else `fn = window[name]`; if a function, call `fn(...decodeArgs(el))`.

**`decodeArgs(el)`** = `el.dataset.args ? JSON.parse(el.dataset.args) : []`.

**Event-needing / exotic handlers → register in `ACTIONS`** (the only ones, from the inventory):
- `copyCmd(event, cmd)` → `ACTIONS.copyCmd = (e, el) => copyCmd(e, ...decodeArgs(el))`
- `event.stopPropagation();updateExamDate(x)` → `ACTIONS.updateExamDateStop = (e, el) => { e.stopPropagation(); updateExamDate(...decodeArgs(el)); }`
- `${p.drillBtn.onclick}` (app.js, handler string from data) → change the data source so `p.drillBtn` carries `{action, args}` not an `onclick` string; emit `data-action`/`data-args`.
- `__aclSidebarHandlers[…]` (app.js, indexed handler table) → register `ACTIONS.aclSidebar = (e, el) => __aclSidebarHandlers[el.dataset.args ? JSON.parse(el.dataset.args)[0] : el.dataset.key]?.()` and emit `data-action="aclSidebar" data-args='[<key>]'`.

---

## Task 1: Create `event-actions.js` delegation core (PR-1)

**Files:**
- Create: `event-actions.js`
- Test: `tests/uat.js` (new vm-sandbox behavioral test, in the Sec-P7 block — see Task 6)

- [ ] **Step 1: Write `event-actions.js`**

```js
/* event-actions.js — CSP-clean event delegation (M7).
   Replaces inline on*= handlers. Loaded (defer) BEFORE app.js; globals it
   dispatches to are resolved lazily at event time, so load order is safe.
   See docs/superpowers/specs/2026-05-31-m7-csp-unsafe-inline-design.md */
(function () {
  'use strict';

  function decodeArgs(el) {
    var raw = el.dataset.args;
    if (!raw) return [];
    try { return JSON.parse(raw); }
    catch (_) { return []; }   // fail safe: no args rather than throw
  }

  // Handlers that need the event object or bespoke wiring. Checked first.
  var ACTIONS = {
    copyCmd: function (e, el) { if (typeof copyCmd === 'function') copyCmd(e, decodeArgs(el)[0]); },
    updateExamDateStop: function (e, el) {
      e.stopPropagation();
      if (typeof updateExamDate === 'function') updateExamDate(decodeArgs(el)[0]);
    },
    aclSidebar: function (e, el) {
      var key = decodeArgs(el)[0];
      var t = window.__aclSidebarHandlers;
      if (t && typeof t[key] === 'function') t[key](e, el);
    }
  };

  function run(e) {
    var el = e.target.closest && e.target.closest('[data-action]');
    if (!el) return;
    var name = el.dataset.action;
    if (ACTIONS[name]) { ACTIONS[name](e, el); return; }
    var fn = window[name];
    if (typeof fn === 'function') fn.apply(null, decodeArgs(el));
  }

  document.addEventListener('click', run);
  document.addEventListener('change', run);
  document.addEventListener('input', run);

  // Expose for tests + for app.js to register additional ACTIONS if needed.
  window.__eventActions = { run: run, ACTIONS: ACTIONS, decodeArgs: decodeArgs };
})();
```

- [ ] **Step 2: Wire it into `index.html` before app.js**

Modify `index.html` — insert immediately before the `app.js` script tag (currently line 1619, after `lib/dompurify.min.js` at 1618):

```html
<script defer src="event-actions.js"></script>
<script defer src="app.js"></script>
```

- [ ] **Step 3: Add to `sw.js` SHELL_ASSETS**

Modify `sw.js` `SHELL_ASSETS` array (after `./app.js` on line 8 is fine; order in the array doesn't matter for precache):

```js
  './app.js',
  './event-actions.js',
```

- [ ] **Step 4: Bump version (updates CACHE_NAME so the new asset is precached on next load)**

Run: `node scripts/bump-version.js 7.9.0 "M7 PR-1: event-delegation scaffold (event-actions.js) — no handlers migrated yet"`
Expected: app.js APP_VERSION, sw.js CACHE_NAME (`netplus-v7.9.0`), index.html badge, package.json, and a 1-line Version-History stub all updated.

- [ ] **Step 5: Run UAT to confirm green + baseline held**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node tests/uat.js 2>&1 | tail -5`
Expected: suite passes; fail count ≤ 2700, no net-new vs `main`.

- [ ] **Step 6: Commit + PR + preview smoke (gated — touches sw.js)**

```bash
git checkout -b feature/m7-scaffold
git add event-actions.js index.html sw.js app.js package.json
git commit -m "feat(M7 PR-1): event-delegation scaffold + precache + version bump"
git push -u origin feature/m7-scaffold
gh pr create --fill
```
Then: open the Vercel preview, DevTools console, confirm `event-actions.js` loads (Network 200, no CSP error), app still works. Squash-merge when "UAT + Playwright" is green.

---

## Task 2: Add the Sec-P7 UAT guard block (PR-1, same branch as Task 1)

**Files:**
- Modify: `tests/uat.js` (append a new guard block near the Sec-P5 block, ~line 25140)

- [ ] **Step 1: Add the Sec-P7 guard block**

Mirror the existing `Sec-P5` pattern (`test(label, booleanExpr)` over file contents read with `fs.readFileSync`). Append:

```js
// ── Sec-P7: CSP script-src 'unsafe-inline' removal (M7) ──────────────────────
{
  const rd = (p) => { try { return fs.readFileSync(path.join(__dirname, '..', p), 'utf8'); } catch (_) { return ''; } };
  const ea  = rd('event-actions.js');
  const idx = rd('index.html');
  const app = rd('app.js');
  const sw  = rd('sw.js');
  const vj  = rd('vercel.json');

  // Scaffold (PR-1)
  test('Sec-P7: event-actions.js exists + installs 3 delegated listeners',
    /addEventListener\(['"]click['"]/.test(ea) &&
    /addEventListener\(['"]change['"]/.test(ea) &&
    /addEventListener\(['"]input['"]/.test(ea));
  test('Sec-P7: event-actions.js dispatch resolves data-action via closest()',
    /closest\(['"]\[data-action\]['"]\)/.test(ea) && /dataset\.action/.test(ea));
  test('Sec-P7: index.html loads event-actions.js before app.js',
    idx.indexOf('event-actions.js') > -1 &&
    idx.indexOf('event-actions.js') < idx.indexOf('src="app.js"'));
  test('Sec-P7: sw.js precaches ./event-actions.js',
    /['"]\.\/event-actions\.js['"]/.test(sw));

  // Migration progress (ratchet — tighten the ceiling as slices land; final target 0)
  const idxHandlers = (idx.match(/\son(click|change|input|keydown|keyup|submit)=/gi) || []).length;
  const appHandlers = (app.match(/onclick=\\?["']/g) || []).length;
  test('Sec-P7: index.html inline on*= count within current ceiling (target 0 by PR-5)',
    idxHandlers <= 102);   // lower this literal as each slice merges; PR-5 sets it to 0
  test('Sec-P7: app.js generated onclick count within current ceiling (target 0 by PR-5)',
    appHandlers <= 73);    // lower this literal as each slice merges; PR-5 sets it to 0

  // The flip (PR-6) — this FLIPs from escape→hard-assert when PR-6 lands.
  test('Sec-P7 FLIP: vercel.json app CSP has NO script-src unsafe-inline',
    !/script-src[^;]*'unsafe-inline'/.test(vj) || /M7-PENDING-FLIP/.test(vj));
  // NOTE: until PR-6, keep a `M7-PENDING-FLIP` marker comment in vercel.json so this
  // stays green; Task 7 Step 6 removes both the marker and the `|| …` escape.
}
```

- [ ] **Step 2: Add the `M7-PENDING-FLIP` marker so the FLIP guard stays green pre-PR-6**

Add a comment line in `vercel.json` is not valid JSON — instead, until PR-6, mark the guard pending by leaving the `|| /M7-PENDING-FLIP/.test(vj)` escape AND keeping the literal string `M7-PENDING-FLIP` inside the existing CSP value is NOT desired. Simplest: the escape evaluates the FIRST clause (`!unsafe-inline`) which is currently false, so OR with a constant `true` placeholder. Replace the FLIP test body for PR-1 with: `test('Sec-P7 FLIP (pending until PR-6): placeholder', true);` and swap to the real assertion in Task 7 Step 6.

- [ ] **Step 3: Run UAT, confirm the new guards pass**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node tests/uat.js 2>&1 | grep -iE "Sec-P7|fail" | tail -20`
Expected: all Sec-P7 tests listed as passing; total fails ≤ 2700.

- [ ] **Step 4: Commit (folds into PR-1)**

```bash
git add tests/uat.js
git commit -m "test(M7 PR-1): Sec-P7 UAT guards — scaffold + handler-count ratchet"
```

---

## Task 3: PR-2 — Migrate global-chrome handlers (sidebar/topbar/theme/nav)

**Files:**
- Modify: `index.html` (the every-page chrome handlers)

**Recipe (apply to each handler in this slice):**
- `onclick="fn()"` → `data-action="fn"`
- `onclick="fn('lit')"` → `data-action="fn" data-args='["lit"]'`
- `onclick="fn(123)"` → `data-action="fn" data-args='[123]'`
- Compound (`showPage('settings'); if(typeof renderSettingsPage…)`) → add a tiny named global wrapper (e.g. `goSettingsPage()`) in app.js and use `data-action="goSettingsPage"`.

- [ ] **Step 1: List this slice's handlers**

Run: `grep -nE 'on(click|change|input)="(toggleTheme|toggleSidebar|toggleNav|showPage|goSetup)' index.html`
Expected: the chrome handlers (sidebar toggles, theme, nav, top-level page nav). Convert exactly these.

- [ ] **Step 2: Convert each to `data-action` per the recipe**

Edit `index.html`. Example conversions:
```html
<!-- before -->            <!-- after -->
onclick="toggleTheme()"    data-action="toggleTheme"
onclick="goSetup()"        data-action="goSetup"
onclick="setProgressFilter('weak')"  data-action="setProgressFilter" data-args='["weak"]'
```

- [ ] **Step 3: Live-verify on localhost**

Run: `python3 -m http.server 3131` then load `http://localhost:3131`, open DevTools console, click sidebar/theme/nav. Expected: all chrome interactions work; zero console errors.

- [ ] **Step 4: Lower the Sec-P7 index ceiling + run UAT**

Edit `tests/uat.js`: change `idxHandlers <= 102` to the new count after this slice (run `grep -coE '\son(click|change|input)=' index.html` to get it).
Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node tests/uat.js 2>&1 | tail -5`
Expected: green, fails ≤ 2700.

- [ ] **Step 5: Bump + commit + PR + merge**

```bash
node scripts/bump-version.js 7.9.1 "M7 PR-2: global-chrome handlers → data-action"
git checkout -b feature/m7-chrome
git add index.html tests/uat.js app.js package.json sw.js
git commit -m "feat(M7 PR-2): migrate global-chrome inline handlers to data-action"
git push -u origin feature/m7-chrome && gh pr create --fill
```
Live-verify preview, squash-merge on green.

---

## Task 4: PR-3 — Migrate quiz/exam/results/review handlers

**Files:**
- Modify: `index.html` (static quiz/exam handlers), `app.js` (generated quiz/review/results handlers)

- [ ] **Step 1: List this slice's handlers**

Run:
```bash
grep -nE 'on(click|change)="(startQuiz|startExam|submitExam|nextQuestion|prevQuestion|retryQuiz|showReview|toggleFlag|examToggleFlag|goToFirstFlagged)' index.html
grep -nE 'onclick="(showReview|jumpToQuestion|retryQuiz)' app.js
```
Expected: the quiz-flow + exam-flow + results/review handlers in both files.

- [ ] **Step 2: Convert index.html static handlers** (recipe from Task 3).

- [ ] **Step 3: Convert app.js generated handlers**

In the template strings, replace `onclick="fn(${x})"` with `data-action="fn" data-args="${escAttr(JSON.stringify([x]))}"`. Example:
```js
// before
`<button onclick="jumpToQuestion(${i})">${i + 1}</button>`
// after
`<button data-action="jumpToQuestion" data-args="${escAttr(JSON.stringify([i]))}">${i + 1}</button>`

// before (2-arg)
`<button onclick="showReview(false, ${i})">Review</button>`
// after
`<button data-action="showReview" data-args="${escAttr(JSON.stringify([false, i]))}">Review</button>`
```

- [ ] **Step 4: Live-verify** — run a full quiz + a full exam on `localhost:3131`: answer, flag, next/prev, submit, view results, open review, jump to question. Console clean.

- [ ] **Step 5: Lower both Sec-P7 ceilings** (`idxHandlers`/`appHandlers` literals) to the new grep counts; run UAT (≤ 2700, green).

- [ ] **Step 6: Bump + commit + PR + merge** (`7.9.2`, branch `feature/m7-quiz-exam`).

---

## Task 5: PR-4 — Migrate activity sub-systems (diagnostic, SR review, drills, ACL PBQ, daily challenge, guided labs)

**Files:**
- Modify: `app.js` (most are generated), `index.html` (any static entry points)

- [ ] **Step 1: List handlers**

Run:
```bash
grep -nE 'onclick="(srMarkConfidence|srPickAnswer|srToggleMultiPick|srSubmitMultiPick|drillDomain|startWrongDrill|startAclPbq|aclMoveRule|submitAclPbq|openAclPbqPicker|startDiagnostic|submitDiagnosticAnswer|setDiagnosticConfidence|quitDiagnostic|startDailyChallenge|openGuidedLab|focusTopic|showTopicDeepDive)' app.js index.html
```
Expected: the activity-subsystem handlers (the bulk of the generated ones).

- [ ] **Step 2: Convert generated handlers** (recipe from Task 4 Step 3).

- [ ] **Step 3: Handle the exotic ACL case** — `__aclSidebarHandlers[…]`:
```js
// before: onclick="__aclSidebarHandlers[<key>]()" (or composed string)
// after:  data-action="aclSidebar" data-args="${escAttr(JSON.stringify([key]))}"
```
The `ACTIONS.aclSidebar` wrapper (Task 1) reads the key and invokes `window.__aclSidebarHandlers[key]`.

- [ ] **Step 4: Live-verify** each subsystem on `localhost:3131`: run a diagnostic, an SR review (incl. multi-pick), a drill, an ACL PBQ (incl. move-rule + submit), daily challenge, open a guided lab. Console clean.

- [ ] **Step 5: Lower both Sec-P7 ceilings; run UAT** (≤ 2700, green).

- [ ] **Step 6: Bump + commit + PR + merge** (`7.9.3`, branch `feature/m7-activities`).

---

## Task 6: PR-5 — Migrate settings/data/progress/analytics + remaining handlers; drive counts to ZERO

**Files:**
- Modify: `index.html`, `app.js`

- [ ] **Step 1: List remaining handlers**

Run:
```bash
grep -cnE '\son(click|change|input|keydown|keyup|submit)=' index.html
grep -cnE 'onclick="' app.js
grep -nE 'onclick="(copyCmd|updateExamDate)' app.js   # the event-needing ones
```
Expected: whatever remains — settings page, backup/export, progress filters, analytics tabs, GH-token, exam-date, copy-cmd.

- [ ] **Step 2: Convert remaining handlers**, including the event-needing ones via the `ACTIONS` map:
```js
// copyCmd(event, cmd)  →
`<button data-action="copyCmd" data-args="${escAttr(JSON.stringify([cmd]))}">Copy</button>`
// event.stopPropagation();updateExamDate(x)  →
`<button data-action="updateExamDateStop" data-args="${escAttr(JSON.stringify([x]))}">…</button>`
// ${p.drillBtn.onclick} →  change data source to {action, args}, emit data-action/data-args
```

- [ ] **Step 3: Verify ZERO inline handlers remain**

Run:
```bash
grep -cnE '\son(click|change|input|keydown|keyup|submit)=' index.html   # expect 0
grep -cnE 'onclick="' app.js                                            # expect 0
```
Expected: both **0**. If not, drop `-c` to print the offending lines and convert them.

- [ ] **Step 4: Set Sec-P7 ceilings to 0**

Edit `tests/uat.js`: `idxHandlers <= …` → `idxHandlers === 0`; `appHandlers <= …` → `appHandlers === 0`. Add:
```js
test('Sec-P7: ZERO inline on*= handlers remain in index.html', idxHandlers === 0);
test('Sec-P7: ZERO onclick="…" emitted by app.js', appHandlers === 0);
```

- [ ] **Step 5: Full-app live-verify + UAT + Playwright**

Run: `python3 -m http.server 3131` → walk every major surface. Then:
`export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node tests/uat.js 2>&1 | tail -5 && npx playwright test 2>&1 | tail -15`
Expected: UAT green (≤ 2700), Playwright green.

- [ ] **Step 6: Bump + commit + PR + merge** (`7.9.4`, branch `feature/m7-settings-rest`).

---

## Task 7: PR-6 — The flip: externalize/hash inline scripts + remove `script-src 'unsafe-inline'`

**Files:**
- Modify: `index.html` (inline `<script>` blocks), `vercel.json` (CSP), `sw.js` (if a new extracted file is added)
- Create: `bootstrap-head.js` (if the bootstrap block is externalizable)

- [ ] **Step 1: Inventory the inline scripts**

Run: `grep -nE '<script>|<script type="importmap">' index.html`
Expected: ~3 blocks (bootstrap ~L43, importmap ~L1554, tail ~L1627).

- [ ] **Step 2: Externalize what can move**

For the bootstrap (~L43) and tail (~L1627) blocks: cut the JS into `bootstrap-head.js` / fold the tail into `event-actions.js` or `app.js` as appropriate, and replace with `<script defer src="…"></script>`. The `importmap` must stay inline (browsers require it inline) → it gets a hash in Step 3.

- [ ] **Step 3: Compute SHA-256 for any remaining inline script (the importmap)**

Run (per remaining inline block — the hash must be over the exact text content of the `<script>` element, no surrounding tag or whitespace):
```bash
# extract the importmap block's INNER text to a temp file by hand, then:
openssl dgst -sha256 -binary importmap-inner.txt | openssl base64
```
Expected: a base64 hash → use as `'sha256-<hash>'`.

- [ ] **Step 4: Edit `vercel.json` — remove unsafe-inline, add hash(es)**

In the `source: "/(.*)"` block only (leave `/mockups/(.*)` untouched):
```json
"script-src 'self' 'sha256-<importmap-hash>';"
```
(was `script-src 'self' 'unsafe-inline'`). Leave `style-src 'unsafe-inline'` as-is (M7b).

- [ ] **Step 5: Add any new extracted file to sw.js SHELL_ASSETS + bump version**

Run: `node scripts/bump-version.js 7.9.5 "M7 PR-6: remove script-src unsafe-inline; externalize/hash inline scripts"`

- [ ] **Step 6: Flip the Sec-P7 FLIP guard to a hard assert**

Edit `tests/uat.js`: replace the PR-1 placeholder FLIP test with the real assertions:
```js
test('Sec-P7 FLIP: vercel.json app CSP has NO script-src unsafe-inline',
  !/script-src[^;]*'unsafe-inline'/.test(vj));
test('Sec-P7 FLIP: vercel.json app CSP still allows style-src unsafe-inline (M7b not yet done)',
  /style-src[^;]*'unsafe-inline'/.test(vj));
```

- [ ] **Step 7: PREVIEW-DEPLOY VERIFICATION (the critical gate)**

```bash
git checkout -b feature/m7-csp-flip
git add index.html vercel.json sw.js app.js package.json bootstrap-head.js tests/uat.js
git commit -m "feat(M7 PR-6): remove script-src 'unsafe-inline' (CSP flip) + externalize/hash inline scripts"
git push -u origin feature/m7-csp-flip && gh pr create --fill
```
Then on the **Vercel preview URL** with **DevTools console open**:
- Walk the FULL click-path (chrome → setup → quiz → exam → results → review → each activity → settings → backup/export → analytics).
- Watch for **`Refused to execute inline event handler because it violates … script-src`** and **`Refused to execute inline script`**. There must be **ZERO**.
- If any violation appears: note the element/handler, go back to the relevant slice, convert it, re-verify. Do **not** merge with any violation.

- [ ] **Step 8: Confirm CI green, squash-merge, post-deploy prod verify**

After merge + Vercel prod deploy: hit prod with `?_cb=7.9.5`, re-walk the critical click-path with console open, confirm zero CSP violations and full functionality. If anything is off, **one-line rollback**: restore `'unsafe-inline'` in `vercel.json` `script-src` and redeploy.

---

## Task 8: Update memory + close out M7

**Files:**
- Modify: `~/.claude/projects/-Users-simioremosu-Desktop/memory/cert_app_security_roadmap.md`, `MEMORY.md`

- [ ] **Step 1: Flip M7 status** from "DEFERRED" to shipped (squash hashes of PR-1…PR-6), and record **M7b** (`style-src 'unsafe-inline'` removal) as the new remaining deferred item.

- [ ] **Step 2: Append durable lessons** — the `data-action` delegation pattern is now the house style for ALL new interactive markup (no new inline `on*=`); note the Sec-P7 ceilings are ratchets locked at 0.

---

## Self-Review

**Spec coverage:** ✅ script-src-only scope (Task 7 leaves style-src), ✅ data-action delegation (Task 1 + contract), ✅ 6 staged PRs flip-last (Tasks 1–7 map 1:1 to PR-1…PR-6), ✅ preview+console+Playwright verification (Task 6 Step 5, Task 7 Steps 7–8), ✅ inline scripts externalize/hash (Task 7), ✅ rollback (Task 7 Step 8), ✅ M7b scope guard (Task 7 Step 4, Task 8), ✅ UAT baseline ≤2700 (every task's UAT step), ✅ sw.js precache (Task 1 Step 3).

**Placeholder scan:** No TBD/TODO. Mechanical bulk conversions intentionally use a fixed recipe + per-slice grep (the handler list is generated at execution time by the provided grep commands, not hand-enumerated) — each step shows the exact transform and example code.

**Type/name consistency:** `decodeArgs`, `ACTIONS`, `run`, `window.__eventActions`, `data-action`, `data-args`, `escAttr` (existing, app.js:15722), `updateExamDateStop`, `aclSidebar` used consistently across Task 1 and Tasks 3–7. Version numbers monotonic (7.9.0 → 7.9.5). Sec-P7 ceiling literals ratchet 102/73 → 0 across Tasks 2→6.
