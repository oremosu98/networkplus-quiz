---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# Feature Roadmap App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimalist, local-only browser app for capturing CertAnvil feature ideas, AI-scoring them by value + MoSCoW, ranking them, handing a chosen feature off to a Claude planning session, and manually closing it when shipped.

**Architecture:** A standalone static app (no backend, no build step) launched from a local static server. Pure logic lives in `lib.js` (unit-tested under Node); DOM/state/API wiring lives in `app.js`. State persists in `localStorage`. AI scoring/brainstorm call the Anthropic Messages API directly from the browser using the `anthropic-dangerous-direct-browser-access` header.

**Tech Stack:** Vanilla HTML/CSS/JS, `localStorage`, Anthropic Messages API, Node built-in `node:test` for unit tests, Google Fonts (Fraunces + Inter).

**Design skills (invoke during the UI tasks, Tasks 6 / 8 / 9 / 10 / 12):** `ui-ux-pro-max`, `taste-skill`, `stop-slop`, `emil-design-eng`.

**Spec:** `docs/superpowers/specs/2026-05-28-feature-roadmap-app-design.md`

---

## File Structure

App lives in its **own folder, separate from CertAnvil**:
`/Users/simioremosu/Desktop/Dev Projects/certanvil-roadmap/`

- `index.html` — markup + font links + script tags. One screen.
- `styles.css` — black & white palette, Fraunces + Inter typography.
- `lib.js` — pure functions, no DOM, no network. UMD guard: attaches to `window.RoadmapLib` in the browser and `module.exports` under Node. **This is the only unit-tested file.**
- `app.js` — DOM rendering, `localStorage` persistence, Anthropic API client, event wiring. Depends on `window.RoadmapLib`.
- `test/lib.test.js` — `node:test` unit tests for `lib.js`.

`lib.js` public surface (all functions defined across Tasks 1–5; referenced by `app.js`):
- `clamp15(n)` → integer 1–5
- `computeValueScore({reach, impact, confidence, effort})` → 0–100 integer
- `suggestMoscow(score)` → `"must" | "should" | "could" | "wont"`
- `parseAiScore(text)` → `{reach, impact, confidence, effort, rationale, suggestedMoscow}` or throws
- `parseAiBrainstorm(text)` → array of candidate objects or throws
- `slugify(title)` → filename-safe string
- `buildHandoffBrief(idea, appVersion)` → markdown string

---

## Task 0: Scaffold project

**Files:**
- Create: `certanvil-roadmap/index.html`
- Create: `certanvil-roadmap/styles.css`
- Create: `certanvil-roadmap/lib.js`
- Create: `certanvil-roadmap/app.js`
- Create: `certanvil-roadmap/test/lib.test.js`
- Create: `certanvil-roadmap/README.md`

- [ ] **Step 1: Create the folder and empty files**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects"
mkdir -p certanvil-roadmap/test
cd certanvil-roadmap
touch index.html styles.css lib.js app.js test/lib.test.js README.md
```

- [ ] **Step 2: Write the README**

`certanvil-roadmap/README.md`:

```markdown
# CertAnvil Roadmap

Personal, local-only tool to capture, AI-score, prioritize, and hand off CertAnvil feature ideas.

## Run
    python3 -m http.server 8777
Then open http://localhost:8777

(Use localhost, not file:// — clipboard and file-save APIs need a secure context.)

## Test
    node --test
```

- [ ] **Step 3: Initialize git**

```bash
git init && git add . && git commit -m "chore: scaffold certanvil-roadmap app"
```

Expected: a commit is created with 6 files.

---

## Task 1: `computeValueScore` + `clamp15`

**Files:**
- Modify: `certanvil-roadmap/lib.js`
- Test: `certanvil-roadmap/test/lib.test.js`

- [ ] **Step 1: Write the failing test**

Put this at the top of `test/lib.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const L = require('../lib.js');

test('clamp15 clamps and rounds to integer 1..5', () => {
  assert.strictEqual(L.clamp15(0), 1);
  assert.strictEqual(L.clamp15(9), 5);
  assert.strictEqual(L.clamp15(3.4), 3);
  assert.strictEqual(L.clamp15('not a number'), 1);
});

test('computeValueScore: max inputs -> 100', () => {
  assert.strictEqual(L.computeValueScore({reach:5, impact:5, confidence:5, effort:1}), 100);
});

test('computeValueScore: min inputs -> small positive', () => {
  assert.strictEqual(L.computeValueScore({reach:1, impact:1, confidence:1, effort:5}), 0);
});

test('computeValueScore: mid example is deterministic', () => {
  // (4*4*3)/2 = 24 ; 24/125*100 = 19.2 -> 19
  assert.strictEqual(L.computeValueScore({reach:4, impact:4, confidence:3, effort:2}), 19);
});

test('computeValueScore: clamps out-of-range inputs', () => {
  assert.strictEqual(L.computeValueScore({reach:99, impact:99, confidence:99, effort:0}), 100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/simioremosu/Desktop/Dev Projects/certanvil-roadmap" && node --test`
Expected: FAIL — `Cannot find module '../lib.js'` exports, or `L.clamp15 is not a function`.

- [ ] **Step 3: Write minimal implementation**

Put this in `lib.js`:

```js
(function (root, factory) {
  const lib = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.RoadmapLib = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  function clamp15(n) {
    n = Math.round(Number(n));
    if (!Number.isFinite(n)) return 1;
    return Math.min(5, Math.max(1, n));
  }

  function computeValueScore({ reach, impact, confidence, effort } = {}) {
    const r = clamp15(reach), i = clamp15(impact), c = clamp15(confidence), e = clamp15(effort);
    const raw = (r * i * c) / e;          // range 0.2 .. 125
    return Math.round(Math.min(100, (raw / 125) * 100));
  }

  return { clamp15, computeValueScore };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS (5 tests in this task green).

- [ ] **Step 5: Commit**

```bash
git add lib.js test/lib.test.js && git commit -m "feat: value score computation"
```

---

## Task 2: `suggestMoscow`

**Files:**
- Modify: `certanvil-roadmap/lib.js`
- Test: `certanvil-roadmap/test/lib.test.js`

- [ ] **Step 1: Write the failing test**

Append to `test/lib.test.js`:

```js
test('suggestMoscow maps score bands to buckets', () => {
  assert.strictEqual(L.suggestMoscow(85), 'must');
  assert.strictEqual(L.suggestMoscow(70), 'must');
  assert.strictEqual(L.suggestMoscow(69), 'should');
  assert.strictEqual(L.suggestMoscow(45), 'should');
  assert.strictEqual(L.suggestMoscow(44), 'could');
  assert.strictEqual(L.suggestMoscow(20), 'could');
  assert.strictEqual(L.suggestMoscow(19), 'wont');
  assert.strictEqual(L.suggestMoscow(0), 'wont');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — `L.suggestMoscow is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `lib.js`, add inside the factory before `return`:

```js
  function suggestMoscow(score) {
    const s = Number(score) || 0;
    if (s >= 70) return 'must';
    if (s >= 45) return 'should';
    if (s >= 20) return 'could';
    return 'wont';
  }
```

And update the return line to:

```js
  return { clamp15, computeValueScore, suggestMoscow };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib.js test/lib.test.js && git commit -m "feat: MoSCoW suggestion from score"
```

---

## Task 3: `parseAiScore`

**Files:**
- Modify: `certanvil-roadmap/lib.js`
- Test: `certanvil-roadmap/test/lib.test.js`

Parses the model's JSON reply for a single idea. Tolerates markdown fences. Throws on invalid shape so the caller can fall back to manual scoring.

- [ ] **Step 1: Write the failing test**

Append to `test/lib.test.js`:

```js
test('parseAiScore parses clean JSON', () => {
  const out = L.parseAiScore('{"reach":4,"impact":5,"confidence":3,"effort":2,"rationale":"big","suggestedMoscow":"should"}');
  assert.deepStrictEqual(out, {reach:4, impact:5, confidence:3, effort:2, rationale:'big', suggestedMoscow:'should'});
});

test('parseAiScore strips ```json fences', () => {
  const out = L.parseAiScore('```json\n{"reach":1,"impact":1,"confidence":1,"effort":1,"rationale":"x","suggestedMoscow":"wont"}\n```');
  assert.strictEqual(out.reach, 1);
});

test('parseAiScore clamps numbers and defaults rationale', () => {
  const out = L.parseAiScore('{"reach":9,"impact":0,"confidence":3,"effort":2}');
  assert.strictEqual(out.reach, 5);
  assert.strictEqual(out.impact, 1);
  assert.strictEqual(typeof out.rationale, 'string');
});

test('parseAiScore throws on non-JSON', () => {
  assert.throws(() => L.parseAiScore('the score is high'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — `L.parseAiScore is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `lib.js`, add a shared JSON-extraction helper and `parseAiScore` inside the factory:

```js
  function extractJson(text) {
    if (typeof text !== 'string') throw new Error('AI response was not text');
    let t = text.trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    const start = t.search(/[\[{]/);
    if (start === -1) throw new Error('No JSON found in AI response');
    return JSON.parse(t.slice(start));
  }

  function parseAiScore(text) {
    const o = extractJson(text);
    if (typeof o !== 'object' || Array.isArray(o) || o === null) throw new Error('Expected a JSON object');
    return {
      reach: clamp15(o.reach),
      impact: clamp15(o.impact),
      confidence: clamp15(o.confidence),
      effort: clamp15(o.effort),
      rationale: typeof o.rationale === 'string' ? o.rationale : '',
      suggestedMoscow: ['must','should','could','wont'].includes(o.suggestedMoscow) ? o.suggestedMoscow : suggestMoscow(computeValueScore(o)),
    };
  }
```

Update the return line to include `parseAiScore` and `extractJson`:

```js
  return { clamp15, computeValueScore, suggestMoscow, extractJson, parseAiScore };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib.js test/lib.test.js && git commit -m "feat: parse + validate AI score JSON"
```

---

## Task 4: `parseAiBrainstorm`

**Files:**
- Modify: `certanvil-roadmap/lib.js`
- Test: `certanvil-roadmap/test/lib.test.js`

- [ ] **Step 1: Write the failing test**

Append to `test/lib.test.js`:

```js
test('parseAiBrainstorm parses an array of candidates', () => {
  const json = '[{"title":"Dark mode","description":"d","reach":3,"impact":3,"confidence":4,"effort":2,"rationale":"r","suggestedMoscow":"could"},{"title":"Spaced repetition","description":"d2","reach":5,"impact":5,"confidence":4,"effort":3}]';
  const out = L.parseAiBrainstorm(json);
  assert.strictEqual(out.length, 2);
  assert.strictEqual(out[0].title, 'Dark mode');
  assert.strictEqual(out[1].reach, 5);
  assert.ok(['must','should','could','wont'].includes(out[1].suggestedMoscow));
});

test('parseAiBrainstorm drops entries without a title', () => {
  const out = L.parseAiBrainstorm('[{"description":"no title"},{"title":"Keep me","reach":1,"impact":1,"confidence":1,"effort":1}]');
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].title, 'Keep me');
});

test('parseAiBrainstorm throws when not an array', () => {
  assert.throws(() => L.parseAiBrainstorm('{"title":"x"}'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — `L.parseAiBrainstorm is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `lib.js`, add inside the factory:

```js
  function parseAiBrainstorm(text) {
    const arr = extractJson(text);
    if (!Array.isArray(arr)) throw new Error('Expected a JSON array of ideas');
    return arr
      .filter(o => o && typeof o.title === 'string' && o.title.trim())
      .map(o => ({
        title: o.title.trim(),
        description: typeof o.description === 'string' ? o.description : '',
        reach: clamp15(o.reach),
        impact: clamp15(o.impact),
        confidence: clamp15(o.confidence),
        effort: clamp15(o.effort),
        rationale: typeof o.rationale === 'string' ? o.rationale : '',
        suggestedMoscow: ['must','should','could','wont'].includes(o.suggestedMoscow) ? o.suggestedMoscow : suggestMoscow(computeValueScore(o)),
      }));
  }
```

Update the return line to add `parseAiBrainstorm`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib.js test/lib.test.js && git commit -m "feat: parse + validate AI brainstorm JSON"
```

---

## Task 5: `slugify` + `buildHandoffBrief`

**Files:**
- Modify: `certanvil-roadmap/lib.js`
- Test: `certanvil-roadmap/test/lib.test.js`

- [ ] **Step 1: Write the failing test**

Append to `test/lib.test.js`:

```js
test('slugify makes a filename-safe slug', () => {
  assert.strictEqual(L.slugify('Spaced Repetition!  (v2)'), 'spaced-repetition-v2');
  assert.strictEqual(L.slugify(''), 'untitled');
});

test('buildHandoffBrief includes title, scores, notes, and a kickoff line', () => {
  const idea = {
    title: 'Spaced repetition',
    description: 'Resurface missed questions over time.',
    notes: 'Founder wants this for retention.',
    moscow: 'must',
    value: { reach:5, impact:5, confidence:4, effort:3, score:67, rationale:'High retention impact.' },
  };
  const brief = L.buildHandoffBrief(idea, '7.6.0');
  assert.match(brief, /Spaced repetition/);
  assert.match(brief, /7\.6\.0/);
  assert.match(brief, /Resurface missed questions/);
  assert.match(brief, /Founder wants this/);
  assert.match(brief, /High retention impact/);
  assert.match(brief, /must/i);
  assert.match(brief, /plan/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test`
Expected: FAIL — `L.slugify is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `lib.js`, add inside the factory:

```js
  function slugify(title) {
    const s = String(title || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'untitled';
  }

  function buildHandoffBrief(idea, appVersion) {
    const v = idea.value || {};
    return [
      `# Feature plan: ${idea.title}`,
      ``,
      `Plan this feature for CertAnvil (v${appVersion}). Context below — let's plan it.`,
      ``,
      `## Description`,
      idea.description || '(none)',
      ``,
      `## Founder notes`,
      idea.notes || '(none)',
      ``,
      `## Priority & value (AI-assisted)`,
      `- MoSCoW: **${idea.moscow}**`,
      `- Value score: ${v.score}/100`,
      `- Reach ${v.reach} · Impact ${v.impact} · Confidence ${v.confidence} · Effort ${v.effort}`,
      `- Rationale: ${v.rationale || '(none)'}`,
      ``,
      `## Ask`,
      `Brainstorm the approach, then produce an implementation plan.`,
    ].join('\n');
  }
```

Update the return line to add `slugify, buildHandoffBrief`. Final return should be:

```js
  return { clamp15, computeValueScore, suggestMoscow, extractJson, parseAiScore, parseAiBrainstorm, slugify, buildHandoffBrief };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test`
Expected: PASS (all unit tests across Tasks 1–5 green).

- [ ] **Step 5: Commit**

```bash
git add lib.js test/lib.test.js && git commit -m "feat: slugify + handoff brief builder"
```

---

## Task 6: HTML shell + black-and-white styles

**Design skills:** invoke `ui-ux-pro-max`, `taste-skill`, `stop-slop`, `emil-design-eng` before finalizing this task's CSS.

**Files:**
- Modify: `certanvil-roadmap/index.html`
- Modify: `certanvil-roadmap/styles.css`

- [ ] **Step 1: Write `index.html`**

```html
<!doctype html>
<html lang="en" data-theme="bw">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CertAnvil Roadmap</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="topbar">
    <h1 class="brand">CertAnvil Roadmap</h1>
    <div class="actions">
      <button id="btn-brainstorm" class="btn">Brainstorm ideas</button>
      <button id="btn-add" class="btn">Add idea</button>
      <label class="toggle"><input type="checkbox" id="toggle-shipped"> Show shipped</label>
      <button id="btn-settings" class="btn icon" aria-label="Settings">⚙</button>
    </div>
  </header>

  <main id="board" class="board"></main>

  <!-- Modal host -->
  <div id="modal-root" class="modal-root" hidden></div>
  <div id="toast-root" class="toast-root" aria-live="polite"></div>

  <script src="lib.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `styles.css` (pure black & white, Fraunces + Inter)**

```css
:root{
  --bg:#ffffff; --ink:#000000; --muted:#666666;
  --line:#e3e3e3; --line-strong:#000000; --chip:#000000;
  --radius:12px; --gap:16px;
  --sans:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --serif:'Fraunces',Georgia,serif;
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans)}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:18px 24px;border-bottom:1px solid var(--line-strong);position:sticky;top:0;background:var(--bg);z-index:5}
.brand{font-family:var(--serif);font-weight:600;font-size:24px;letter-spacing:-.02em;margin:0}
.actions{display:flex;align-items:center;gap:12px}
.btn{font-family:var(--sans);font-weight:600;font-size:13px;background:var(--bg);color:var(--ink);
  border:1px solid var(--ink);border-radius:999px;padding:8px 14px;cursor:pointer}
.btn:hover{background:var(--ink);color:var(--bg)}
.btn.icon{padding:8px 11px;font-size:15px}
.toggle{font-size:12px;font-weight:600;color:var(--muted);display:flex;align-items:center;gap:6px}

.board{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap);padding:24px;align-items:start}
.column{display:flex;flex-direction:column;gap:12px}
.column-head{font-family:var(--sans);font-weight:700;font-size:11px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line);padding-bottom:8px}

.card{border:1px solid var(--line);border-radius:var(--radius);padding:14px;background:var(--bg)}
.card:hover{border-color:var(--ink)}
.card-title{font-family:var(--serif);font-weight:600;font-size:16px;letter-spacing:-.01em;margin:0 0 6px}
.card-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.chip{font-size:11px;font-weight:700;border:1px solid var(--ink);border-radius:999px;padding:2px 8px;
  font-variant-numeric:tabular-nums}
.badge{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);
  border:1px solid var(--line);border-radius:6px;padding:2px 6px}
.ricetstats{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
.rationale{font-size:12px;color:var(--ink);margin-top:8px;line-height:1.4}
.card-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.card-actions .btn{font-size:11px;padding:5px 10px}
.card.shipped{opacity:.55}

.modal-root{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:20;padding:24px}
.modal{background:var(--bg);border:1px solid var(--ink);border-radius:16px;max-width:560px;width:100%;
  max-height:85vh;overflow:auto;padding:24px}
.modal h2{font-family:var(--serif);font-weight:600;margin:0 0 16px}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.field label{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.field input,.field textarea,.field select{font-family:var(--sans);font-size:14px;color:var(--ink);
  background:var(--bg);border:1px solid var(--ink);border-radius:8px;padding:9px 11px}
.field textarea{min-height:72px;resize:vertical}
.row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px}

.toast-root{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;z-index:30}
.toast{background:var(--ink);color:var(--bg);font-size:13px;font-weight:600;padding:10px 16px;border-radius:8px}
.candidate{border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start}
.candidate input{margin-top:4px}
```

- [ ] **Step 3: Manual verification**

Run: `cd "/Users/simioremosu/Desktop/Dev Projects/certanvil-roadmap" && python3 -m http.server 8777`
Open `http://localhost:8777`.
Expected: white page, black "CertAnvil Roadmap" heading in Fraunces, the four buttons in Inter, an empty board area. No console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css && git commit -m "feat: HTML shell + black-and-white styling"
```

---

## Task 7: Storage layer + initial state in `app.js`

**Files:**
- Modify: `certanvil-roadmap/app.js`

- [ ] **Step 1: Write the storage + state module**

Put this at the top of `app.js`:

```js
'use strict';
const L = window.RoadmapLib;
const STORE_KEY = 'certanvil-roadmap-v1';
const APP_VERSION = '7.6.0'; // CertAnvil version referenced in handoff briefs

const defaultState = () => ({
  version: 1,
  apiKey: '',
  model: 'claude-opus-4-7',
  projectContext: '',
  ideas: [],
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    return Object.assign(defaultState(), JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    toast('Could not save — storage full?');
  }
}

function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    ('id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
}

function nowIso() { return new Date().toISOString(); }
```

- [ ] **Step 2: Manual verification**

Reload `http://localhost:8777`. In the browser console run:

```js
RoadmapLib.computeValueScore({reach:5,impact:5,confidence:5,effort:1}) // 100
localStorage.getItem('certanvil-roadmap-v1')                          // null until first save
```

Expected: first call returns `100`; no errors loading `app.js`.

- [ ] **Step 3: Commit**

```bash
git add app.js && git commit -m "feat: localStorage state layer"
```

---

## Task 8: Toasts + board rendering

**Design skills:** keep `stop-slop` / `taste-skill` in mind for spacing and hierarchy.

**Files:**
- Modify: `certanvil-roadmap/app.js`

- [ ] **Step 1: Add toast helper + render functions**

Append to `app.js`:

```js
function toast(msg) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

const MOSCOW = [
  ['must', 'Must have'],
  ['should', 'Should have'],
  ['could', 'Could have'],
  ['wont', "Won't have"],
];

function showShipped() {
  return document.getElementById('toggle-shipped').checked;
}

function render() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  for (const [key, label] of MOSCOW) {
    const col = document.createElement('section');
    col.className = 'column';
    const head = document.createElement('div');
    head.className = 'column-head';
    const ideas = state.ideas
      .filter(i => i.moscow === key)
      .filter(i => showShipped() || i.status !== 'shipped')
      .sort((a, b) => (b.value?.score || 0) - (a.value?.score || 0));
    head.textContent = `${label} (${ideas.length})`;
    col.appendChild(head);
    ideas.forEach(idea => col.appendChild(renderCard(idea)));
    board.appendChild(col);
  }
}

function renderCard(idea) {
  const v = idea.value || {};
  const card = document.createElement('article');
  card.className = 'card' + (idea.status === 'shipped' ? ' shipped' : '');
  card.innerHTML = `
    <h3 class="card-title"></h3>
    <div class="card-meta">
      <span class="chip">${v.score ?? '–'}</span>
      <span class="badge">${idea.status}</span>
      <span class="ricetstats">R${v.reach ?? '–'} I${v.impact ?? '–'} C${v.confidence ?? '–'} E${v.effort ?? '–'}</span>
    </div>
    <div class="rationale"></div>
    <div class="card-actions"></div>`;
  card.querySelector('.card-title').textContent = idea.title;
  card.querySelector('.rationale').textContent = v.rationale || idea.description || '';

  const actions = card.querySelector('.card-actions');
  actions.appendChild(mkBtn('Develop', () => handoff(idea)));
  actions.appendChild(mkBtn('Edit', () => openEditModal(idea)));
  if (idea.status !== 'shipped') actions.appendChild(mkBtn('Shipped', () => markShipped(idea)));
  actions.appendChild(mkBtn('Delete', () => deleteIdea(idea)));
  return card;
}

function mkBtn(label, onClick) {
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function markShipped(idea) {
  idea.status = 'shipped';
  idea.shippedAt = nowIso();
  idea.updatedAt = nowIso();
  saveState(); render();
  toast('Marked shipped');
}

function deleteIdea(idea) {
  if (!confirm(`Delete "${idea.title}"?`)) return;
  state.ideas = state.ideas.filter(i => i.id !== idea.id);
  saveState(); render();
}

document.getElementById('toggle-shipped').addEventListener('change', render);
render();
```

- [ ] **Step 2: Manual verification**

Reload. In console seed a card, then confirm it renders:

```js
state.ideas.push({id:'t1',title:'Test idea',description:'d',notes:'',moscow:'must',
  value:{reach:5,impact:5,confidence:4,effort:3,score:67,rationale:'why'},
  status:'backlog',source:'manual',createdAt:nowIso(),updatedAt:nowIso(),shippedAt:null});
saveState(); render();
```

Expected: a card appears under "Must have" with chip `67`, badge `backlog`, R5 I5 C4 E3, and Develop/Edit/Shipped/Delete buttons. Toggling "Show shipped" + clicking Shipped hides/shows it correctly. Delete asks for confirmation and removes it.

- [ ] **Step 3: Commit**

```bash
git add app.js && git commit -m "feat: board rendering, toasts, ship/delete"
```

---

## Task 9: Add/Edit modal with manual scoring

**Design skills:** apply `emil-design-eng` / `taste-skill` to the modal layout.

**Files:**
- Modify: `certanvil-roadmap/app.js`

- [ ] **Step 1: Add modal infrastructure + add/edit form**

Append to `app.js`:

```js
function openModal(html) {
  const root = document.getElementById('modal-root');
  root.hidden = false;
  root.innerHTML = `<div class="modal">${html}</div>`;
  root.addEventListener('click', e => { if (e.target === root) closeModal(); }, { once: true });
}
function closeModal() {
  const root = document.getElementById('modal-root');
  root.hidden = true; root.innerHTML = '';
}

function ideaFormHtml(idea) {
  const v = idea?.value || {};
  const m = idea?.moscow || 'should';
  const opt = (val, cur) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${val}</option>`;
  const num = (id, val) => `<div class="field"><label>${id[0].toUpperCase()+id.slice(1)}</label>
    <input type="number" min="1" max="5" id="f-${id}" value="${val ?? 3}"></div>`;
  return `
    <h2>${idea ? 'Edit idea' : 'Add idea'}</h2>
    <div class="field"><label>Title</label><input id="f-title" value="${idea ? escapeHtml(idea.title) : ''}"></div>
    <div class="field"><label>Description</label><textarea id="f-desc">${idea ? escapeHtml(idea.description) : ''}</textarea></div>
    <div class="field"><label>Your notes</label><textarea id="f-notes">${idea ? escapeHtml(idea.notes) : ''}</textarea></div>
    <div class="row">${num('reach',v.reach)}${num('impact',v.impact)}${num('confidence',v.confidence)}${num('effort',v.effort)}</div>
    <div class="field"><label>MoSCoW</label><select id="f-moscow">${opt('must',m)}${opt('should',m)}${opt('could',m)}${opt('wont',m)}</select></div>
    <div class="modal-actions">
      <button class="btn" id="f-cancel">Cancel</button>
      <button class="btn" id="f-save">Save</button>
    </div>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function readIdeaForm() {
  const val = id => document.getElementById(id).value;
  const reach = +val('f-reach'), impact = +val('f-impact'),
        confidence = +val('f-confidence'), effort = +val('f-effort');
  const score = L.computeValueScore({reach, impact, confidence, effort});
  return {
    title: val('f-title').trim(),
    description: val('f-desc').trim(),
    notes: val('f-notes').trim(),
    moscow: val('f-moscow'),
    value: { reach: L.clamp15(reach), impact: L.clamp15(impact),
             confidence: L.clamp15(confidence), effort: L.clamp15(effort), score, rationale: '' },
  };
}

function openAddModal() {
  openModal(ideaFormHtml(null));
  document.getElementById('f-cancel').onclick = closeModal;
  document.getElementById('f-save').onclick = () => {
    const data = readIdeaForm();
    if (!data.title) { toast('Title required'); return; }
    state.ideas.push(Object.assign({
      id: uid(), status: 'backlog', source: 'manual',
      createdAt: nowIso(), updatedAt: nowIso(), shippedAt: null,
    }, data));
    saveState(); closeModal(); render();
  };
}

function openEditModal(idea) {
  openModal(ideaFormHtml(idea));
  document.getElementById('f-cancel').onclick = closeModal;
  document.getElementById('f-save').onclick = () => {
    const data = readIdeaForm();
    if (!data.title) { toast('Title required'); return; }
    data.value.rationale = idea.value?.rationale || '';
    Object.assign(idea, data, { updatedAt: nowIso() });
    saveState(); closeModal(); render();
  };
}

document.getElementById('btn-add').addEventListener('click', openAddModal);
```

- [ ] **Step 2: Manual verification**

Reload. Click "Add idea". Enter a title, set Reach 5 / Impact 5 / Confidence 5 / Effort 1, MoSCoW must, Save.
Expected: a card appears under "Must have" with chip `100`. Click Edit, change Effort to 5, Save → chip recomputes to `40`. Empty title shows "Title required" toast.

- [ ] **Step 3: Commit**

```bash
git add app.js && git commit -m "feat: add/edit modal with manual scoring"
```

---

## Task 10: Settings modal (API key, model, project context)

**Files:**
- Modify: `certanvil-roadmap/app.js`

- [ ] **Step 1: Add the settings modal**

Append to `app.js`:

```js
function openSettingsModal() {
  openModal(`
    <h2>Settings</h2>
    <div class="field"><label>Anthropic API key</label>
      <input id="s-key" type="password" value="${escapeHtml(state.apiKey)}" placeholder="sk-ant-..."></div>
    <div class="field"><label>Model</label>
      <select id="s-model">
        <option value="claude-opus-4-7">claude-opus-4-7 (best reasoning)</option>
        <option value="claude-sonnet-4-6">claude-sonnet-4-6 (cheaper)</option>
        <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 (fastest)</option>
      </select></div>
    <div class="field"><label>Project context (sent with every AI call)</label>
      <textarea id="s-ctx" placeholder="Paste CertAnvil's CLAUDE.md or a summary...">${escapeHtml(state.projectContext)}</textarea></div>
    <div class="modal-actions">
      <button class="btn" id="s-cancel">Cancel</button>
      <button class="btn" id="s-save">Save</button>
    </div>`);
  document.getElementById('s-model').value = state.model;
  document.getElementById('s-cancel').onclick = closeModal;
  document.getElementById('s-save').onclick = () => {
    state.apiKey = document.getElementById('s-key').value.trim();
    state.model = document.getElementById('s-model').value;
    state.projectContext = document.getElementById('s-ctx').value.trim();
    saveState(); closeModal(); toast('Settings saved');
  };
}

document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
```

- [ ] **Step 2: Manual verification**

Reload. Click the gear. Enter a dummy key, pick a model, paste any context, Save → "Settings saved" toast. Reopen the gear → values persisted. Confirm in console: `state.apiKey`, `state.model`, `state.projectContext` are set; reload the page and reopen settings — still persisted.

- [ ] **Step 3: Commit**

```bash
git add app.js && git commit -m "feat: settings modal (key, model, project context)"
```

---

## Task 11: Anthropic API client + Score flow

**Files:**
- Modify: `certanvil-roadmap/app.js`

- [ ] **Step 1: Add the API client and scoring**

Append to `app.js`:

```js
async function callClaude(systemPrompt, userPrompt) {
  if (!state.apiKey) { openSettingsModal(); throw new Error('Set your API key first'); }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': state.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: state.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${detail.slice(0, 160)}`);
  }
  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('');
}

const SCORE_SYSTEM =
  'You score product feature ideas for a certification-exam study app. ' +
  'Given project context and one idea, rate Reach, Impact, Confidence, Effort each 1-5 ' +
  '(higher Effort = more costly), give a one-line rationale, and suggest a MoSCoW bucket ' +
  '(must|should|could|wont). Respond with ONLY a JSON object: ' +
  '{"reach":n,"impact":n,"confidence":n,"effort":n,"rationale":"...","suggestedMoscow":"..."} . No prose, no markdown.';

async function scoreIdea(idea) {
  const prompt = `PROJECT CONTEXT:\n${state.projectContext || '(none provided)'}\n\nIDEA:\nTitle: ${idea.title}\nDescription: ${idea.description || '(none)'}`;
  let text;
  try {
    text = await callClaude(SCORE_SYSTEM, prompt);
  } catch (e) {
    toast(e.message); return;
  }
  let parsed;
  try {
    parsed = L.parseAiScore(text);
  } catch {
    try { parsed = L.parseAiScore(await callClaude(SCORE_SYSTEM, prompt + '\n\nReturn ONLY JSON.')); }
    catch { toast('AI returned unparseable JSON — score it manually'); return; }
  }
  idea.value = {
    reach: parsed.reach, impact: parsed.impact, confidence: parsed.confidence, effort: parsed.effort,
    score: L.computeValueScore(parsed), rationale: parsed.rationale,
  };
  idea.moscow = parsed.suggestedMoscow;
  idea.updatedAt = nowIso();
  saveState(); render();
}
```

Then wire an "AI score" action into cards. In `renderCard`, add this button before the `Edit` button:

```js
  actions.appendChild(mkBtn('AI score', () => scoreIdea(idea)));
```

- [ ] **Step 2: Manual verification (uses real API + your key)**

Reload. In Settings, enter your real Anthropic key + paste a short CertAnvil description. Add an idea (title only, e.g. "Spaced repetition for missed questions"). Click **AI score** on the card.
Expected: within a few seconds the chip fills with a 0–100 score, R/I/C/E populate, a rationale appears, and the card may move to a different MoSCoW column. With a blank key, clicking AI score opens Settings instead. With a deliberately wrong key, a toast shows `API 401: ...`.

- [ ] **Step 3: Commit**

```bash
git add app.js && git commit -m "feat: Anthropic API client + AI scoring"
```

---

## Task 12: Brainstorm flow + accept/reject modal

**Design skills:** apply `ui-ux-pro-max` / `stop-slop` to the candidate list.

**Files:**
- Modify: `certanvil-roadmap/app.js`

- [ ] **Step 1: Add brainstorm generation + modal**

Append to `app.js`:

```js
const BRAINSTORM_SYSTEM =
  'You generate candidate product features for a certification-exam study app. ' +
  'Given project context and a list of existing idea titles (avoid duplicates), propose 6 new ideas. ' +
  'For each: title, one-sentence description, Reach/Impact/Confidence/Effort (1-5, higher Effort = costlier), ' +
  'a one-line rationale, and a MoSCoW suggestion. ' +
  'Respond with ONLY a JSON array of objects: ' +
  '[{"title":"...","description":"...","reach":n,"impact":n,"confidence":n,"effort":n,"rationale":"...","suggestedMoscow":"..."}] . No prose, no markdown.';

async function runBrainstorm() {
  const existing = state.ideas.map(i => i.title).join('; ') || '(none)';
  const prompt = `PROJECT CONTEXT:\n${state.projectContext || '(none provided)'}\n\nEXISTING IDEAS (do not repeat):\n${existing}`;
  let text;
  try { text = await callClaude(BRAINSTORM_SYSTEM, prompt); }
  catch (e) { toast(e.message); return; }
  let candidates;
  try { candidates = L.parseAiBrainstorm(text); }
  catch {
    try { candidates = L.parseAiBrainstorm(await callClaude(BRAINSTORM_SYSTEM, prompt + '\n\nReturn ONLY a JSON array.')); }
    catch { toast('AI returned unparseable JSON — try again'); return; }
  }
  if (!candidates.length) { toast('No new ideas generated'); return; }
  openBrainstormModal(candidates);
}

function openBrainstormModal(candidates) {
  const rows = candidates.map((c, idx) => `
    <label class="candidate">
      <input type="checkbox" data-idx="${idx}" checked>
      <span><strong>${escapeHtml(c.title)}</strong> — ${escapeHtml(c.description)}<br>
      <span class="ricetstats">R${c.reach} I${c.impact} C${c.confidence} E${c.effort} · ${c.suggestedMoscow} · ${escapeHtml(c.rationale)}</span></span>
    </label>`).join('');
  openModal(`
    <h2>Brainstormed ideas</h2>
    ${rows}
    <div class="modal-actions">
      <button class="btn" id="b-cancel">Cancel</button>
      <button class="btn" id="b-add">Add selected</button>
    </div>`);
  document.getElementById('b-cancel').onclick = closeModal;
  document.getElementById('b-add').onclick = () => {
    const boxes = [...document.querySelectorAll('.candidate input[type=checkbox]')];
    boxes.filter(b => b.checked).forEach(b => {
      const c = candidates[+b.dataset.idx];
      state.ideas.push({
        id: uid(), title: c.title, description: c.description, notes: '',
        moscow: c.suggestedMoscow,
        value: { reach: c.reach, impact: c.impact, confidence: c.confidence, effort: c.effort,
                 score: L.computeValueScore(c), rationale: c.rationale },
        status: 'backlog', source: 'ai', createdAt: nowIso(), updatedAt: nowIso(), shippedAt: null,
      });
    });
    saveState(); closeModal(); render();
    toast('Ideas added');
  };
}

document.getElementById('btn-brainstorm').addEventListener('click', runBrainstorm);
```

- [ ] **Step 2: Manual verification (real API)**

Reload. With key + context set, click "Brainstorm ideas".
Expected: after a few seconds a modal lists ~6 candidates with checkboxes pre-checked, each showing R/I/C/E + MoSCoW + rationale. Uncheck a couple, click "Add selected" → only the checked ideas appear on the board in their suggested columns with computed scores. Cancel adds nothing.

- [ ] **Step 3: Commit**

```bash
git add app.js && git commit -m "feat: AI brainstorm + accept/reject modal"
```

---

## Task 13: Handoff — clipboard + save-to-repo

**Files:**
- Modify: `certanvil-roadmap/app.js`

- [ ] **Step 1: Add the handoff action**

Append to `app.js`:

```js
async function handoff(idea) {
  const brief = L.buildHandoffBrief(idea, APP_VERSION);
  idea.status = 'building';
  idea.updatedAt = nowIso();
  saveState(); render();

  let copied = false;
  try { await navigator.clipboard.writeText(brief); copied = true; }
  catch { /* fall through to textarea */ }

  const canSave = typeof window.showSaveFilePicker === 'function';
  openModal(`
    <h2>Handoff brief${copied ? ' (copied to clipboard)' : ''}</h2>
    <div class="field"><label>Brief</label><textarea id="h-text" style="min-height:220px">${escapeHtml(brief)}</textarea></div>
    <div class="modal-actions">
      ${canSave ? '<button class="btn" id="h-save">Save to repo…</button>' : ''}
      <button class="btn" id="h-close">Close</button>
    </div>`);
  document.getElementById('h-close').onclick = closeModal;
  if (canSave) {
    document.getElementById('h-save').onclick = async () => {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `feature-brief-${L.slugify(idea.title)}.md`,
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
        });
        const w = await handle.createWritable();
        await w.write(brief); await w.close();
        toast('Saved');
      } catch (e) {
        if (e.name !== 'AbortError') toast('Save failed: ' + e.message);
      }
    };
  }
  if (!copied) toast('Clipboard blocked — copy from the textarea');
}
```

- [ ] **Step 2: Manual verification**

Reload. On any card click **Develop**.
Expected: the card's badge flips to `building`; a modal shows the full markdown brief and confirms "copied to clipboard"; paste into a scratch buffer to confirm. If running on `localhost`, a "Save to repo…" button appears — click it, navigate to CertAnvil's `docs/` folder, save, and confirm the `.md` file is written. Cancelling the file picker shows no error toast.

- [ ] **Step 3: Commit**

```bash
git add app.js && git commit -m "feat: feature handoff (clipboard + save-to-repo)"
```

---

## Task 14: Final manual QA pass

**Files:** none (verification only).

- [ ] **Step 1: Run the unit suite**

Run: `cd "/Users/simioremosu/Desktop/Dev Projects/certanvil-roadmap" && node --test`
Expected: all `lib.js` tests pass.

- [ ] **Step 2: Golden-path walkthrough**

With the server running on `http://localhost:8777`:
1. Settings → real key + CertAnvil context → Save.
2. Brainstorm ideas → add 3–4 candidates.
3. Add idea manually → AI score it.
4. Edit an idea, change sub-scores, confirm chip + column update.
5. Develop an idea → brief copied, badge `building`, optionally save to repo.
6. Mark another Shipped → hidden; toggle "Show shipped" → reappears dimmed.
7. Reload the page → all state persists.

Expected: every step behaves as described; no console errors.

- [ ] **Step 3: Error-path checks**

1. Clear the key in Settings → AI score / Brainstorm open Settings instead of failing silently.
2. Enter a bad key → API error toast with status code.

Expected: graceful messages, no crashes; ideas remain editable manually.

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "chore: QA pass — roadmap app v1 complete" || echo "nothing to commit"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** capture (Tasks 8/9), AI scoring (11), brainstorm generate+log (12), value/MoSCoW model (1/2), manual override (9), board sort by value (8), handoff clipboard+repo (13), manual Shipped (8), settings/project-context (10), B/W + Fraunces/Inter (6), error handling (11/13/14), unit tests for pure functions (1–5). All spec sections mapped.
- **Placeholder scan:** no TBD/TODO; every code step shows complete code.
- **Type consistency:** `lib.js` surface (`clamp15`, `computeValueScore`, `suggestMoscow`, `parseAiScore`, `parseAiBrainstorm`, `slugify`, `buildHandoffBrief`, `extractJson`) is defined in Tasks 1–5 and used consistently in `app.js` (Tasks 8–13). Idea object shape matches the spec data model throughout.
- **Out of scope confirmed:** no version polling / auto-deploy detection (manual Shipped only), per spec.
