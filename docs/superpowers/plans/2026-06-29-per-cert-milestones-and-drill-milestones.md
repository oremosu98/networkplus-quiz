# Per-Cert Milestones + Drill Milestones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all CertAnvil milestones per-certification (no cross-cert transfer), add ~15 milestones for the 5 flagship drills (Sim Lab, Decision Lab, Why-Not, Packet Trace, Gauntlet) with the in-session celebration pop-up + analytics display, and remove the ~15 orphaned milestones left by deleted drills.

**Architecture:** The milestone engine in `app.js` is data-driven: `MILESTONE_DEFS` (display) + `MILESTONE_CHECKS` ([{id, check(ctx)}]) evaluated by `evaluateMilestones()`, which calls `unlockMilestone(id)`; storage is a flat `STORAGE.MILESTONES = nplus_milestones` map cloud-synced via `_cloudFlush`. We change the storage to a per-cert nested map `{cert: {id: ts}}` (Approach ①), add a per-cert `DRILL_STATS` counter, add drill defs/checks/progress, wire each drill's completion to evaluate+celebrate, remove orphan defs, and run the visual surfaces through the mockup-first + 4-stage-skill + BRAND.md workflow.

**Tech Stack:** Vanilla JS (no framework/build), localStorage + Supabase cloud-canonical, `tests/uat.js` (node assertions), Playwright (chromium/webkit/mobile-safari), `dg-system.css` editorial overlay.

**Reference:** Spec at `docs/superpowers/specs/2026-06-29-per-cert-milestones-and-drill-milestones-design.md`. Read it before starting.

---

## Pre-flight

- [ ] **P1: Read the spec and the current milestone engine.** Open `app.js` and read in full: `getMilestones`/`unlockMilestone` (~11564), `MILESTONE_DEFS` (~11576), `MILESTONE_CHECKS` (~11851), `evaluateMilestones`/`_buildMilestoneCtx`/`_buildMilestoneDrillCtx`, `MILESTONE_PROGRESS` (~18620), `_renderAnaMilestones` (~18700), the celebration call sites in `finish()` (~10100) and exam-results (~10589), and `detectCert()` (~34). Confirm exact line numbers (the file changes; never trust a stale number).
- [ ] **P2: Confirm the live-drill audit.** Verify via the graphify map + page-ids that Acronym Blitz / OSI Sorter / Cable ID / Fix This Network have NO entry point (orphaned) and that Guided Labs (`page-guided-lab`), Port Drill, Subnet are LIVE (keep). Re-run: `grep -oE 'id="page-[a-z-]+"' index.html | sort -u`.
- [ ] **P3: Branch decision.** This is **fast-lane** if changes stay in `app.js` + `features/*` + `dg-system.css`. If Task 1's hydrate-ordering fix requires editing `cloud-store.js` / `auth-state.js`, switch to **gated-lane** (feature branch + PR + Supabase preview) per `ENVIRONMENT_STRATEGY.md`. Decide after Task 1's investigation step.

---

## Task 1: Per-cert milestone storage + migration

**Files:**
- Modify: `app.js` — `getMilestones()` / `unlockMilestone()` (~11564-11572)
- Test: `tests/uat.js` (add milestone-storage assertions block)

- [ ] **Step 1: Write failing UAT assertions.** In `tests/uat.js`, add a block that requires the new cert-scoped helpers to exist and behave per-cert. Add:

```js
// --- Per-cert milestone storage ---
assert(/function _certKey\s*\(/.test(APP_JS), 'M1: _certKey() helper exists');
assert(/function _migrateMilestoneShape\s*\(/.test(APP_JS), 'M1: _migrateMilestoneShape() exists');
// getMilestones must read a per-cert submap, not the flat root
assert(/getMilestones\s*\([^)]*\)\s*\{[\s\S]*?_certKey\(\)/.test(APP_JS), 'M1: getMilestones reads current cert submap');
// unlockMilestone must write under the current cert
assert(/unlockMilestone[\s\S]*?_certKey\(\)/.test(APP_JS), 'M1: unlockMilestone writes under current cert');
```

- [ ] **Step 2: Run UAT to verify failure.**
Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"; node tests/uat.js 2>&1 | grep -i "M1:"`
Expected: M1 assertions FAIL (helpers not defined).

- [ ] **Step 3: Implement cert-scoped storage + migration.** Replace the existing `getMilestones`/`unlockMilestone` (and add helpers). The all-milestones map is `{cert: {id: ts}}`; `getMilestones()` returns the current cert's submap; migration-on-read wraps the legacy flat shape under `netplus` AND prunes ids no longer in `MILESTONE_DEFS`.

```js
// Canonical cert key for namespacing (falls back to 'netplus' = legacy cert).
function _certKey() {
  try { return (window.CURRENT_CERT || CURRENT_CERT || 'netplus'); } catch (_) { return 'netplus'; }
}

// Read the whole {cert:{id:ts}} map, migrating the legacy flat shape on the fly.
function _allMilestones() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(STORAGE.MILESTONES) || '{}'); } catch { raw = {}; }
  return _migrateMilestoneShape(raw);
}

// Old shape = {id: ISOstring}. New shape = {cert: {id: ISOstring}}.
// Detect old shape: at least one value is a string (timestamps), not an object.
// Idempotent: a value that is an object is already new-shape and passes through.
function _migrateMilestoneShape(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const vals = Object.values(raw);
  const isOldFlat = vals.length > 0 && vals.every(v => typeof v === 'string');
  let map = isOldFlat ? { netplus: raw } : raw;
  // Prune earned ids that no longer exist in MILESTONE_DEFS (orphan cleanup).
  if (typeof MILESTONE_DEFS !== 'undefined') {
    const liveIds = new Set(MILESTONE_DEFS.map(d => d.id));
    Object.keys(map).forEach(cert => {
      const sub = map[cert];
      if (sub && typeof sub === 'object') {
        Object.keys(sub).forEach(id => { if (!liveIds.has(id)) delete sub[id]; });
      }
    });
  }
  return map;
}

// Current cert's earned-milestone submap.
function getMilestones() {
  const all = _allMilestones();
  return all[_certKey()] || {};
}

function unlockMilestone(key) {
  const all = _allMilestones();
  const cert = _certKey();
  const sub = all[cert] || (all[cert] = {});
  if (sub[key]) return false;
  sub[key] = new Date().toISOString();
  try { localStorage.setItem(STORAGE.MILESTONES, JSON.stringify(all)); _cloudFlush(STORAGE.MILESTONES); } catch {}
  return true;
}
```

> **Hydrate-ordering note (cross-platform §4.H):** `unlockMilestone` only ever WRITES on an explicit unlock event (drill/quiz completion), which happens after hydrate — so it cannot clobber cloud with an empty pre-hydrate map. `getMilestones`/`_allMilestones` are read-only (no flush). Verify no code path calls `setItem(STORAGE.MILESTONES, ...)` before `cloudStore.hydrate()`. If one exists, gate it behind a `_milestonesHydrated` flag (gated-lane: set in `cloud-store.js` hydrate).

- [ ] **Step 4: Run UAT to verify pass.**
Run: `node tests/uat.js 2>&1 | grep -i "M1:"`
Expected: all M1 assertions PASS.

- [ ] **Step 5: Commit.**
```bash
git add app.js tests/uat.js
git commit -m "feat(milestones): per-cert storage + legacy-flat migration + orphan prune"
```

---

## Task 2: Remove orphaned milestones (dead drills)

**Files:**
- Modify: `app.js` — `MILESTONE_DEFS` (~11576), `MILESTONE_CHECKS` (~11851), `MILESTONE_PROGRESS` (~18620)
- Test: `tests/uat.js` — `EXPECTED_MILESTONES` / `newMilestones`

- [ ] **Step 1: Write failing assertion that orphans are gone.** In `tests/uat.js`:

```js
// --- Orphaned milestones removed (Acronym Blitz, OSI Sorter, Cable ID, Fix This Network) ---
['ab_first','ab_50','ab_all_seen','ab_streak_15',
 'os_first','os_50','os_all_seen','os_streak_10',
 'cb_first','cb_50','cb_all_seen','cb_streak_10',
 'fix_first','fix_5','fix_all_easy'].forEach(id => {
  assert(!new RegExp("id:\\s*'"+id+"'").test(APP_JS), 'M2: orphan milestone '+id+' removed from defs');
});
```

- [ ] **Step 2: Run UAT to verify failure.**
Run: `node tests/uat.js 2>&1 | grep -i "M2:"`
Expected: FAIL (orphans still present).

- [ ] **Step 3: Delete the 15 orphan defs + their checks + progress entries.** In `app.js`, remove from `MILESTONE_DEFS` the 15 ids above; remove their matching entries in `MILESTONE_CHECKS`; remove any `MILESTONE_PROGRESS` keys for them; remove any now-dead helper code that only those checks used (search each id to confirm no remaining reference). Do NOT touch `first_lab`/`labs_*` (Guided Labs live), port/subnet ids (live).

- [ ] **Step 4: Update the expected-count assertion.** Find `EXPECTED_MILESTONES` / `newMilestones` in `tests/uat.js` and adjust the count: `-15` orphans (this task) and `+15` drill milestones (Task 4) — net 0 vs current, but update the explicit id list to match the new reality.

- [ ] **Step 5: Run UAT to verify pass.**
Run: `node tests/uat.js 2>&1 | grep -i "M2:"`
Expected: PASS.

- [ ] **Step 6: Commit.**
```bash
git add app.js tests/uat.js
git commit -m "chore(milestones): remove 15 orphaned milestones for deleted drills"
```

---

## Task 3: Per-drill, per-cert completion tracking (DRILL_STATS)

**Files:**
- Modify: `app.js` — `STORAGE` block (~1038), add `getDrillStats`/`bumpDrillStat`, extend `_buildMilestoneCtx`
- Test: `tests/uat.js`

- [ ] **Step 1: Write failing assertions.**

```js
assert(/DRILL_STATS:\s*'nplus_drill_stats'/.test(APP_JS), 'M3: DRILL_STATS storage key defined');
assert(/function bumpDrillStat\s*\(/.test(APP_JS), 'M3: bumpDrillStat() exists');
assert(/function getDrillStats\s*\(/.test(APP_JS), 'M3: getDrillStats() exists');
```

- [ ] **Step 2: Run UAT to verify failure.**
Run: `node tests/uat.js 2>&1 | grep -i "M3:"`
Expected: FAIL.

- [ ] **Step 3: Add the per-cert drill-stats store + ctx wiring.** Add `DRILL_STATS: 'nplus_drill_stats'` to the `STORAGE` object. Add:

```js
// {cert: {simlab:{done,perfect}, decision:{...}, whynot, packettrace, gauntlet}}
function _allDrillStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE.DRILL_STATS) || '{}'); } catch { return {}; }
}
function getDrillStats() {
  const all = _allDrillStats();
  return all[_certKey()] || {};
}
// drill: 'simlab'|'decision'|'whynot'|'packettrace'|'gauntlet'; field: 'done'|'perfect'
function bumpDrillStat(drill, field, by) {
  const all = _allDrillStats();
  const cert = _certKey();
  const sub = all[cert] || (all[cert] = {});
  const d = sub[drill] || (sub[drill] = { done: 0, perfect: 0 });
  d[field] = (d[field] || 0) + (by || 1);
  try { localStorage.setItem(STORAGE.DRILL_STATS, JSON.stringify(all)); _cloudFlush(STORAGE.DRILL_STATS); } catch {}
  return d;
}
```

Then in `_buildMilestoneCtx()`, add the drill stats to the returned context object: `drill: getDrillStats(),` (so checks can read `ctx.drill.simlab.done`, etc.).

- [ ] **Step 4: Register DRILL_STATS for cloud sync.** Confirm `_cloudFlush` accepts arbitrary STORAGE keys (it does — it's keyed by storage key). If `cloud-store.js` hydrate has an explicit allow-list of synced keys, add `STORAGE.DRILL_STATS` to it (**gated-lane** if so). Verify by grepping `cloud-store.js` for the key list.

- [ ] **Step 5: Run UAT to verify pass.**
Run: `node tests/uat.js 2>&1 | grep -i "M3:"`
Expected: PASS.

- [ ] **Step 6: Commit.**
```bash
git add app.js tests/uat.js cloud-store.js 2>/dev/null
git commit -m "feat(milestones): per-cert DRILL_STATS tracking + milestone ctx wiring"
```

---

## Task 4: Add the 15 drill milestone defs + checks + progress

**Files:**
- Modify: `app.js` — `MILESTONE_DEFS`, `MILESTONE_CHECKS`, `MILESTONE_PROGRESS`
- Test: `tests/uat.js`

> **Copy note:** the labels/descs below are PLACEHOLDER-QUALITY structural values to make the engine work. The FINAL user-facing copy is produced in Task 7 (humanizer + marketing-psychology). Use these now; Task 7 overwrites the strings only.

- [ ] **Step 1: Write failing assertions for the 15 ids.**

```js
['simlab_first','simlab_25','simlab_ace',
 'decision_first','decision_25','decision_flawless',
 'whynot_first','whynot_25','whynot_master',
 'pt_first','pt_25','pt_master',
 'gauntlet_first','gauntlet_25','gauntlet_survivor'].forEach(id => {
  assert(new RegExp("id:\\s*'"+id+"'").test(APP_JS), 'M4: drill milestone '+id+' defined');
});
```

- [ ] **Step 2: Run UAT to verify failure.**
Run: `node tests/uat.js 2>&1 | grep -i "M4:"`
Expected: FAIL.

- [ ] **Step 3: Add defs.** Append to `MILESTONE_DEFS` (structural copy; finalised in Task 7):

```js
{ id: 'simlab_first',      label: 'Sim initiate',    desc: 'Complete your first Sim Lab PBQ' },
{ id: 'simlab_25',         label: 'Sim regular',     desc: 'Complete 25 Sim Lab PBQs' },
{ id: 'simlab_ace',        label: 'Sim ace',         desc: 'Score a perfect Sim Lab run' },
{ id: 'decision_first',    label: 'Decision rookie', desc: 'Complete your first Decision Lab set' },
{ id: 'decision_25',       label: 'Decision regular',desc: 'Complete 25 Decision Lab sets' },
{ id: 'decision_flawless', label: 'Flawless call',   desc: 'Score a perfect Decision Lab set' },
{ id: 'whynot_first',      label: 'Why-Not novice',  desc: 'Complete your first Why-Not round' },
{ id: 'whynot_25',         label: 'Why-Not regular', desc: 'Complete 25 Why-Not rounds' },
{ id: 'whynot_master',     label: 'Reasoned master', desc: 'Score a perfect Why-Not round' },
{ id: 'pt_first',          label: 'Trace tenderfoot',desc: 'Complete your first Packet Trace' },
{ id: 'pt_25',             label: 'Trace tactician', desc: 'Complete 25 Packet Traces' },
{ id: 'pt_master',         label: 'Trace master',    desc: 'Master a Packet Trace scenario' },
{ id: 'gauntlet_first',    label: 'Gauntlet runner', desc: 'Complete your first Gauntlet' },
{ id: 'gauntlet_25',       label: 'Gauntlet regular',desc: 'Complete 25 Gauntlets' },
{ id: 'gauntlet_survivor', label: 'Gauntlet survivor',desc: 'Complete a full perfect Gauntlet' },
```

- [ ] **Step 4: Add checks.** Append to `MILESTONE_CHECKS` (reads `ctx.drill` from Task 3). For Packet Trace mastery, reuse the existing `PT_MASTERY` signal rather than a new counter:

```js
{ id: 'simlab_first',      check: c => (c.drill.simlab?.done || 0) >= 1 },
{ id: 'simlab_25',         check: c => (c.drill.simlab?.done || 0) >= 25 },
{ id: 'simlab_ace',        check: c => (c.drill.simlab?.perfect || 0) >= 1 },
{ id: 'decision_first',    check: c => (c.drill.decision?.done || 0) >= 1 },
{ id: 'decision_25',       check: c => (c.drill.decision?.done || 0) >= 25 },
{ id: 'decision_flawless', check: c => (c.drill.decision?.perfect || 0) >= 1 },
{ id: 'whynot_first',      check: c => (c.drill.whynot?.done || 0) >= 1 },
{ id: 'whynot_25',         check: c => (c.drill.whynot?.done || 0) >= 25 },
{ id: 'whynot_master',     check: c => (c.drill.whynot?.perfect || 0) >= 1 },
{ id: 'pt_first',          check: c => (c.drill.packettrace?.done || 0) >= 1 },
{ id: 'pt_25',             check: c => (c.drill.packettrace?.done || 0) >= 25 },
{ id: 'pt_master',         check: c => (c.drill.packettrace?.perfect || 0) >= 1 },
{ id: 'gauntlet_first',    check: c => (c.drill.gauntlet?.done || 0) >= 1 },
{ id: 'gauntlet_25',       check: c => (c.drill.gauntlet?.done || 0) >= 25 },
{ id: 'gauntlet_survivor', check: c => (c.drill.gauntlet?.perfect || 0) >= 1 },
```

- [ ] **Step 5: Add progress entries.** Append to `MILESTONE_PROGRESS` (drives "n/25" display) for the volume ones:

```js
simlab_25:   c => ({ have: (c.drill.simlab?.done || 0),   need: 25 }),
decision_25: c => ({ have: (c.drill.decision?.done || 0), need: 25 }),
whynot_25:   c => ({ have: (c.drill.whynot?.done || 0),   need: 25 }),
pt_25:       c => ({ have: (c.drill.packettrace?.done || 0), need: 25 }),
gauntlet_25: c => ({ have: (c.drill.gauntlet?.done || 0), need: 25 }),
```
(Match the EXACT shape of an existing `MILESTONE_PROGRESS` entry — read one first; the `{have,need}` shape above is illustrative.)

- [ ] **Step 6: Run UAT to verify pass.**
Run: `node tests/uat.js 2>&1 | grep -i "M4:"`
Expected: PASS.

- [ ] **Step 7: Commit.**
```bash
git add app.js tests/uat.js
git commit -m "feat(milestones): add 15 drill milestone defs/checks/progress (structural copy)"
```

---

## Task 5: Wire each drill's completion to bump + evaluate + celebrate

**Files:**
- Modify: `app.js` and/or `features/sim-lab.js` — the 5 drill completion functions
- Test: `tests/uat.js` + Playwright

> Reuse the EXACT existing celebration pattern from `finish()` (~10100):
> ```js
> const _newlyUnlocked = evaluateMilestones();
> _newlyUnlocked.forEach((id, i) => setTimeout(() => showMilestoneCelebration(id), 500 + i * 900));
> ```

- [ ] **Step 1: Locate the 5 completion points.** Confirm exact functions (use the graphify map / grep): Sim Lab (`_slRenderExamResult` / `_slRenderSummary`), Decision Lab (`_dlRenderResult`), Why-Not (verdict/finish), Packet Trace (finish handler), Gauntlet (`_finishGauntlet`). Note whether each is "perfect" (score === max) to bump the `perfect` field.

- [ ] **Step 2: Write a failing structural assertion.** In `tests/uat.js`, assert each completion function body calls `bumpDrillStat` + `evaluateMilestones` + `showMilestoneCelebration`. Example for Sim Lab:

```js
const slBody = _fnBody(SIMLAB_JS, '_slRenderExamResult'); // or wherever completion lands
assert(/bumpDrillStat\(\s*'simlab'/.test(slBody), 'M5: sim lab bumps drill stat');
assert(/evaluateMilestones\(\)/.test(slBody) && /showMilestoneCelebration/.test(slBody), 'M5: sim lab evaluates + celebrates');
```
(Repeat per drill; mind the `_fnBody` prefix-match trap noted in CLAUDE.md — pick unique function names.)

- [ ] **Step 3: Run UAT to verify failure.**
Run: `node tests/uat.js 2>&1 | grep -i "M5:"`
Expected: FAIL.

- [ ] **Step 4: Insert the wiring at each completion point.** At the moment each drill records its result, add (Sim Lab example; adapt drill key + perfect condition per drill):

```js
try {
  bumpDrillStat('simlab', 'done', 1);
  if (/* perfect run for this drill */ score === total) bumpDrillStat('simlab', 'perfect', 1);
  const _nu = (typeof evaluateMilestones === 'function') ? evaluateMilestones() : [];
  _nu.forEach((id, i) => setTimeout(() => showMilestoneCelebration(id), 500 + i * 900));
} catch (_) {}
```
For Packet Trace `perfect`, set it from the existing `PT_MASTERY` signal rather than a fresh condition. For drills in `features/sim-lab.js`, confirm `bumpDrillStat`/`evaluateMilestones`/`showMilestoneCelebration` are reachable (they're `window`-global in `app.js`; call via `window.` if the IIFE scope requires it).

- [ ] **Step 5: Run UAT to verify pass.**
Run: `node tests/uat.js 2>&1 | grep -i "M5:"`
Expected: PASS.

- [ ] **Step 6: Commit.**
```bash
git add app.js features/sim-lab.js tests/uat.js
git commit -m "feat(milestones): fire drill milestones + celebration at each drill completion"
```

---

## Task 6: Analytics — per-cert display (auto) + verify

**Files:**
- Modify: `app.js` — `_renderAnaMilestones` (only if grouping added)
- Test: Playwright (`tests/e2e/app.spec.js`)

- [ ] **Step 1: Verify per-cert display already works.** `_renderAnaMilestones` renders `MILESTONE_DEFS` against `getMilestones()` — now cert-scoped automatically. Write a Playwright test: seed a milestone on cert A via the cert subdomain/localStorage, load Analytics, assert it shows earned; switch cert, assert it shows locked.

```js
// tests/e2e/app.spec.js (sketch)
test('milestones are per-cert in analytics', async ({ page }) => {
  // seed netplus milestone, open analytics on netplus, expect earned
  // switch to secplus, expect same milestone locked
});
```

- [ ] **Step 2: Run it to verify current behavior.**
Run: `npx playwright test -g "per-cert in analytics" --project=chromium`
Expected: PASS if storage change is correct (no code change needed for basic per-cert display).

- [ ] **Step 3 (optional grouping — defer to Task 7 mockup):** If we add the "Drills" subheading grouping, that is a VISUAL change → it goes through Task 7's mockup-first + 4-stage + BRAND.md workflow, implemented in `dg-system.css` + a small render tweak. Do NOT hand-build it here.

- [ ] **Step 4: Commit (if any test added).**
```bash
git add tests/e2e/app.spec.js
git commit -m "test(milestones): per-cert analytics display e2e"
```

---

## Task 7: VISUAL surfaces — mockup-first + 4-stage pass + BRAND.md

> Applies to: (a) the 15 milestone **labels/descriptions** (overwrite the structural copy from Task 4), (b) the **analytics "Drills" grouping** (if kept), (c) any tweak to the **celebration moment**. Engine code is untouched here. Follow spec §4.I.

- [ ] **Step 1: Concept mockup.** Create `mockups/milestone-drills-concept.html`. Seed its `<style>` from `brand/mockup-starter-tokens.css` (never freehand hex). Mock up the analytics "Drills" milestone group + a sample celebration card, in both light + dark, using editorial hairlines, Fraunces/Inter, bronze accent, the reveal/motion patterns. NO emoji, NO em-dash (`·`), NO left-accent-border callout, NO card-spam.

- [ ] **Step 2: 4-stage skill pass (in order) on the mockup + copy:**
  1. `/design-taste-frontend` — visual treatment of the drills milestone group + celebration card.
  2. `/emil-design-eng` — motion/polish: entrance stagger, press feedback, reduced-motion fallback, durations per BRAND.md §6.
  3. `/humanizer` — rewrite the 15 milestone labels + descriptions so they read human (strip AI-tells). Produce the FINAL strings.
  4. `/marketing-psychology` — tune achievement framing / progress nudges (e.g., "n/25" momentum, mastery aspiration) in copy + the celebration line.

- [ ] **Step 3: Show the mockup to the user for approval.** Confirm it's reachable at `/mockups/milestone-drills-concept.html` (deploy-served). **Do not proceed to real implementation until the user approves the mockup.**

- [ ] **Step 4: Implement the approved visuals.** Apply the FINAL copy by overwriting the label/desc strings in `MILESTONE_DEFS` (Task 4 ids unchanged). Implement any analytics-grouping CSS as scoped overrides in `dg-system.css` — **never edit `styles.css`**. Match the celebration pop-up's existing brand styling.

- [ ] **Step 5: Bump the dg-system cache-bust.** If `dg-system.css` changed, hand-bump `dg-system.css?v=X.X.X` in `index.html` (BRAND.md §10 — `bump-version.js` does NOT touch the `?v` query).

- [ ] **Step 6: Commit.**
```bash
git add app.js dg-system.css index.html mockups/milestone-drills-concept.html
git commit -m "feat(milestones): final brand copy + analytics drills group (mockup-approved, 4-stage pass)"
```

---

## Task 8: Cross-platform + migration verification

**Files:** Test only — `tests/uat.js`, `tests/e2e/app.spec.js`

- [ ] **Step 1: Migration test.** Add a UAT/Playwright test: seed the OLD flat `nplus_milestones` shape (`{first_quiz: ts}`), call the read path, assert it becomes `{netplus: {first_quiz: ts}}`, that an earned orphan id (e.g. `os_first`) is pruned, and that running migration twice is idempotent (no double-wrap).

- [ ] **Step 2: Per-cert isolation test.** Unlock a drill milestone on netplus; assert `getMilestones()` on secplus does NOT include it.

- [ ] **Step 3: WebKit + mobile-safari E2E.** Run the milestone E2E on Safari engines, not just Chromium:
Run: `npm run test:webkit && npm run test:mobile-safari`
Expected: PASS on both. Fix any WebKit-only rendering issue in the celebration pop-up (CSS-only, reduced-motion, safe-area).

- [ ] **Step 4: Manual iOS Capacitor smoke (checklist item, not automated).** In the wrapped app: earn a drill milestone → pop-up renders → relaunch → milestone persists (cloud round-trip) → confirm `detectCert()` resolved the right cert inside the wrap.

- [ ] **Step 5: Full suite + commit.**
Run: `node tests/uat.js && node tests/tech-debt.js && npx playwright test`
Expected: all green.
```bash
git add tests/
git commit -m "test(milestones): migration, per-cert isolation, cross-platform (webkit/mobile-safari)"
```

---

## Ship

- [ ] **S1: Walk `SHIP_CHECKLIST.md`** (fast-lane unless Task 1/3 touched `cloud-store.js`/`auth-state.js` → gated-lane PR + Supabase preview).
- [ ] **S2: Version bump** — `node scripts/bump-version.js <new> "per-cert milestones + 5 drill milestones + orphan cleanup"` (updates app.js/sw.js/index.html/package.json + CLAUDE.md row). Re-read CLAUDE.md after (the script rewrites it).
- [ ] **S3: Post-deploy** — drive the live prod URL per CLAUDE.md "Post-deploy verification": earn a drill milestone, confirm pop-up + analytics on a real device, both themes.

## Related
[[2026-06-29-per-cert-milestones-and-drill-milestones-design]] · [[SHIP_CHECKLIST]] · [[key-patterns]] · [[feature-subsystems]]

---

## Self-review (author checklist — completed at write time)

- **Spec coverage:** §4.A→Task 1; §4.B→Task 3; §4.C→Task 4; §4.D→Task 5; §4.E→Task 6; §4.F→Tasks 1(prune)+2; §4.G→Task 8; §4.H→Tasks 1(note)+8; §4.I→Task 7. ✅ all sections mapped.
- **Placeholder scan:** the only "placeholder" strings are the Task 4 structural labels, explicitly flagged as overwritten by Task 7 — not a gap. ✅
- **Type/name consistency:** `_certKey`, `_allMilestones`, `_migrateMilestoneShape`, `getMilestones`, `unlockMilestone`, `DRILL_STATS`, `getDrillStats`, `bumpDrillStat`, `ctx.drill.<key>.{done,perfect}`, drill keys `simlab|decision|whynot|packettrace|gauntlet`, the 15 ids — used consistently across Tasks 1, 3, 4, 5. ✅
- **Open verifications for the implementer (flagged inline):** exact line numbers (P1), the `MILESTONE_PROGRESS` entry shape (Task 4 Step 5 — read a real one), the exact drill completion functions (Task 5 Step 1), whether `cloud-store.js` has a synced-key allow-list (Tasks 1/3 → lane decision).
