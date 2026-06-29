---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# Topology Builder V3 — Walkthrough Feature (Phase 8) Design Spec

**Date:** 2026-05-25
**Status:** Spec — awaiting user review before plan
**Parent feature area:** Topology Builder V3 (post-v6.4.3)

---

## Summary

Walkthroughs are guided educational tours through pre-built V3 scenarios. A walkthrough explains what each device does, how devices communicate, why the topology is designed this way, and how it maps to the cert exam. Tours render in both 2D canvas mode and 3D popup mode from a single source of truth. A floating step card lives on the canvas and animates from device to device as the learner advances. V1 ships the engine plus 5 hand-authored walkthroughs across 4 scenarios.

## Vision (user-stated)

> "Walkthrough = guided educational tour of the topology that's already on the canvas. Teaches what each device is for, how they communicate, why this design exists, and how it maps to exam objectives. Not a 'build this' tutorial — an 'understand this' lesson. A step card must be present and must move on the canvas to the relevant device the step is talking about. One topology can have multiple walkthroughs if there's relevant info that works for it. Works in both 2D and 3D mode."

The shipped feature must serve this vision literally.

## Locked decisions (from brainstorming Q&A)

| # | Question | Decision |
|---|---|---|
| Q1 | Unit model | Walkthroughs reference scenarios (1:N). New `_TB_V3_WALKTHROUGHS` collection; each walkthrough has `scenarioId` + `steps[]`. One scenario can have multiple walkthroughs. |
| Q2 | Step format | Hybrid, observe-and-continue dominant. Steps are primarily comprehension (text + Continue). Interactive triggers are optional v1.x — not in v1. |
| Q3 | Placement | Originally right-rail tabs. **Refined during design:** rail simplifies to **Catalog only**; step UI moves to a floating card on the canvas. |
| Q4 | Catalog shape | Grouped by exam domain. Focus-and-dim accordion: clicking a scenario activates it (other scenarios at ~30% opacity); active scenario's walkthroughs nest below. |
| Q5 | AI runtime | None. Pure static authored content. (Coach is parked; no runtime AI in v1.) |
| Q6 | Step primitives | Three on day one: **Narrate**, **Highlight**, **Animated flow**. Interactive / explicit camera / exam-tip overlay are v1.x. |
| — | Launch scope | Pilot: 5 hand-authored walkthroughs across 4 scenarios across 3 exam domains. |
| — | Cross-mode | 2D + 3D parity. Same step description renders into both modes via a shared highlight engine. |

---

## Section 1 — Architecture

Four layers, top to bottom:

**UI surfaces**
- Right rail · Catalog tab (single tab; focus-dim accordion of scenarios with nested walkthroughs and per-walk completion badges)
- 2D canvas (existing) plus a new overlay: floating step card with tail/connector
- 3D popup (existing) plus the same floating step card positioned via projected world coordinates

**Engine**
- `walkthrough runner` — lifecycle (`walkStart`, `walkNext`, `walkBack`, `walkExit`, `walkComplete`); owns `state.activeWalkthroughId` and `state.walkStepIdx`
- `step primitive engine` — dispatches each step by `type` to the appropriate renderer call
- `highlight engine` — translates a `HighlightTarget` into 2D pulse / 3D glow + camera focus
- `flow engine` — packet-pellet animation along a path; 2D as DOM/SVG sprites, 3D as Bezier-curved meshes
- `card anchor engine` — projects target device position to screen space, picks a non-occluding side, tweens between steps

**Data + state**
- `_TB_V3_SCENARIOS` (existing, unchanged) — 42 topology snapshots
- `_TB_V3_WALKTHROUGHS` (NEW) — array of walkthrough definitions; lives in a new sibling file
- `state` (existing, extended) — adds `activeWalkthroughId`, `walkStepIdx`, `walkMode`, `walkCardAnchor`; `intent` union gains `'walk'`
- `STORAGE.TB_V3_DRAFT` (existing, extended) — persists the new state fields
- `STORAGE.TB_V3_WALK_PROGRESS` (NEW) — per-walkthrough `{ stepIdx, completedAt, lastViewedAt }`

### File layout

- `features/topology-builder-v3.js` — runner, engines, UI bindings. Existing file; gains the walkthrough code.
- `features/topology-builder-v3-walkthroughs.js` — **NEW**. Exports `_TB_V3_WALKTHROUGHS`. Keeps walkthrough content separate from engine code so authoring/QA only touches one file.
- `features/topology-builder-v3.css` — existing; gains rules for step card, focus-dim accordion, completion badges.

### Exam domain lookup

`features/topology-builder-v3.js` adds a small constant + helper:

```js
const _TB_V3_EXAM_DOMAINS = {
  '1': 'Networking Concepts',
  '2': 'Network Implementation',
  '3': 'Network Operations',
  '4': 'Network Security',
  '5': 'Network Troubleshooting',
};

function domainsForRefs(objectiveRefs) {
  return [...new Set(
    objectiveRefs.map(r => _TB_V3_EXAM_DOMAINS[r.split('.')[0]] || 'Other')
  )];
}
```

When `walkthrough.domainTags` is unset, inherit by computing `domainsForRefs(scenario.objectiveRefs)` and use the first result for catalog grouping. When `walkthrough.domainTags` is set, use it verbatim — this is the override path (e.g., a "Common attack vectors" walkthrough of a Networking Concepts scenario explicitly tags `['Network Security']`).

---

## Section 2 — Data model

### Walkthrough

```js
{
  id:           string,    // unique slug, e.g. 'home-network-comms'
  scenarioId:   string,    // references _TB_V3_SCENARIOS[].id
  title:        string,    // learner-facing
  brief:        string,    // 1-sentence preview shown before start
  durationMin:  number,    // estimated minutes
  domainTags:   string[],  // for catalog grouping; default = inherit scenario.objectiveRefs
  steps:        Step[],
}
```

### Step — discriminated union by `type`

```js
{
  id:    string,
  type:  'narrate' | 'highlight' | 'flow',
  title: string,           // step header
  body:  string,           // markdown-light explanation

  // type === 'highlight'
  target?:     HighlightTarget,
  cameraIn3D?: 'auto' | 'none',  // default 'auto'

  // type === 'flow'
  flow?: {
    from:       string,       // deviceId
    to:         string,
    via?:       string[],     // optional intermediate hops
    direction?: 'forward' | 'forward-back',
    speed?:     'slow' | 'normal' | 'fast',
  },
}
```

### HighlightTarget — three kinds

```js
| { kind: 'device',  id: string }
| { kind: 'devices', ids: string[] }
| { kind: 'cable',   deviceA: string, deviceB: string }
```

Semantics: `device` pulses one node and (in 3D) focuses the camera; `devices` pulses several together with no camera focus; `cable` pulses the link between two endpoints.

### Authoring guarantee

If a step references a missing device or cable, the engine logs a developer warning and falls back to `narrate` rendering. Authors get loud feedback during development; learners never see a broken effect.

---

## Section 3 — Step primitives engine + 2D/3D bridge

The bridge translates a single step description into renderer calls based on the active mode.

### Runner API

```
walkStart(walkthroughId)   // loads scenario starting state if not loaded, runs step 0
walkNext()                 // stepIdx++, runs new step
walkBack()                 // stepIdx--, runs prev step
walkExit()                 // clears effects, resets intent, returns to catalog
walkComplete()             // marks complete in STORAGE.TB_V3_WALK_PROGRESS

// Internal — both renderers subscribe to "current step changed"
runStep(step, mode)              // dispatches on step.type
applyHighlight(target, mode)     // translates target → 2D pulse or 3D glow+camera
animateFlow(flow, mode)          // pellets along path; 2D = DOM/SVG, 3D = Bezier mesh
clearEffects(mode)               // strips all walk effects before next step renders
```

### How a highlight step renders

Step data: `{ type: 'highlight', target: { kind: 'device', id: 'router-1' }, cameraIn3D: 'auto' }`

- 2D: the `router-1` device gets a CSS class adding an amber pulse animation; cables to/from it are unchanged
- 3D: the `router-1` mesh's emissive color animates to amber; camera tweens to focus on its world position
- Card anchor engine positions the step card near the device (see Section 4)

### How a flow step renders

Step data: `{ type: 'flow', flow: { from: 'laptop-1', to: 'modem-1', via: ['router-1'], direction: 'forward-back' } }`

- Path is `[from, ...via, to]` → segment pairs `[[from, via0], ..., [vian, to]]`
- 2D: pellet DOM sprites animate along each segment via CSS transitions; pellets fade in at `from`, fade out at `to`. `forward-back` reverses on completion.
- 3D: pellet meshes follow Bezier curves between each pair of device positions; camera does not move (flow needs full path visible)
- Step card anchors to the `from` device

### Mode switch mid-walk

Both renderers stay subscribed to the current step. Opening the 3D popup mid-walk re-runs the current step in the 3D renderer; closing returns rendering to 2D. The card re-anchors via the active mode's projection function.

### Reduced motion

When `prefers-reduced-motion: reduce`:
- Highlight pulse becomes a static amber ring (no animation)
- Animated flow becomes a fade-in arrow with numbered hop labels (1 → 2 → 3)
- Card transitions between steps snap instead of tween

Comprehension is preserved; motion is removed.

---

## Section 4 — Canvas step card + simplified right rail

The step UI lives on the canvas as a floating card with a tail pointing to the relevant device. Between steps it animates from one device to the next.

### Right rail

The Walk tab is removed. Only the Catalog tab remains.

- **Default state:** all scenarios in their exam-domain groups; no scenario active
- **Focused state:** one scenario active (bright amber); other scenarios at ~30% opacity; the active scenario's walkthroughs nest below (amber rows)
- **During a walk:** the running walkthrough row gets a `● Running` indicator

### Step card anatomy

```
┌──────────────────────────┐
│ × (exit)                  │
│ ●─●─●─○─○─○      3 / 6   │  ← progress dots + position
├──────────────────────────┤
│ [Highlight]               │  ← step kind chip
│ Meet the router           │  ← step.title
│ The amber device is your  │  ← step.body
│ router — the brain of...  │
├──────────────────────────┤
│ [← Back]    [Continue →] │
└─◢ (tail pointing to device)
```

### Card placement rules

- Auto-positions to a side of the target device that doesn't occlude other amber-highlighted elements
- Default: above-right of the device with the tail pointing back
- Fallback order: above-right → below-right → above-left → below-left → top-center (last resort)
- Card never extends outside the canvas viewport (clamped on all sides)
- Card is draggable; re-anchors on next step
- Click outside the card does nothing for the walkthrough — card is the only step-control surface
- Esc key exits the walkthrough (equivalent to `×`)

### Special step type rules

- **Narrate step** (no target) — card sits top-center of the viewport with no tail
- **Highlight step** — card anchors to the highlighted device
- **Flow step** — card anchors to the `from` device (lets the learner see the full path)

### 3D mode

Card is the same HTML overlay. Position is computed via `THREE.Vector3` projection from the target mesh's world position to screen-space coordinates. Re-projection runs on the same animation frame as scene re-renders, so the card tracks during camera moves.

### Z-index slots

- **2D mode** (canvas container stacking context): step card uses `z-index: 105`. Above the canvas (`z-index: 100`); below any global modals.
- **3D mode** (popup modal at root `z-index: 10001`; local stacking context inside): step card uses `z-index: 8`. Above the popup canvas / chrome elements (`z-index: 6`); below the popup tool buttons — close, fit-to-view, legend chip — at `z-index: 10`.

The card is one HTML element. On mode toggle the runner re-parents it (or swaps a class) so it picks up the right z-index for the active container. Implementation pattern (single element re-parented vs two elements one-visible) is decided in Stage 7.

### Animation between steps

- 300ms ease-out tween of card position
- Tail re-anchors at end of tween
- Card content (title, body, dots) fades through during the tween: opacity 1 → 0.4 → 1
- Reduced motion: snap to new position; opacity stays at 1

### Completion state

When the last step completes, the card transforms in place:
- Header shows a ✓ icon + "Walkthrough complete"
- Body shows "You traced the packet end-to-end. Saved to your progress."
- If the active scenario has sibling walkthroughs, they appear inline as tappable rows
- Controls become: `↺ Replay` and `Catalog`
- Card sits top-center (no specific target)

---

## Section 5 — State, storage, persistence

### Runtime state additions

| Field | Type | Default | Notes |
|---|---|---|---|
| `state.intent` | union | `'free-build'` | Existing. Add `'walk'` to `'free-build' \| 'lab' \| 'pbq' \| 'walk'`. |
| `state.activeScenarioId` | `string \| null` | `null` | Existing. Set when scenario activates in catalog. |
| `state.activeWalkthroughId` | `string \| null` | `null` | NEW. Walkthrough currently running. |
| `state.walkStepIdx` | `number` | `0` | NEW. Current step (0-based). Clamped to `steps.length - 1` on hydrate. |
| `state.walkMode` | `'2d' \| '3d'` | `'2d'` | NEW. Which renderer is visible. Not persisted. |
| `state.walkCardAnchor` | `{ deviceId, side } \| null` | `null` | NEW. Last computed card placement. Not persisted. |

### Storage shapes

**`STORAGE.TB_V3_DRAFT` — extended (existing key)**

```js
{
  devices:             [...],
  cables:              [...],
  viewport:            {...},
  intent:              'walk',
  activeScenarioId:    'home-network',
  activeWalkthroughId: 'home-network-comms',   // NEW
  walkStepIdx:         3,                       // NEW
}
```

**`STORAGE.TB_V3_WALK_PROGRESS` — NEW key**

```js
{
  'home-network-comms': {
    stepIdx:      5,              // last viewed step
    completedAt:  1779701922000,  // epoch ms; null if not yet completed
    lastViewedAt: 1779701922000,
  },
  'home-network-attacks': {
    stepIdx:      2,
    completedAt:  null,
    lastViewedAt: 1779700000000,
  },
}
```

### Lifecycle

| Event | State changes | Persistence |
|---|---|---|
| `walkStart(id)` | set `activeWalkthroughId`, `walkStepIdx=0`, `intent='walk'` | persist `DRAFT` |
| `walkNext` / `walkBack` | increment / decrement `walkStepIdx` | persist `DRAFT`; bump `PROGRESS[id].lastViewedAt` |
| `walkExit` | clear `activeWalkthroughId`, `walkStepIdx`; restore prior `intent` | persist `DRAFT` (`PROGRESS` preserved) |
| `walkComplete` | write `PROGRESS[id].completedAt = Date.now()`; clear active | persist `DRAFT` + `PROGRESS` |
| page load · hydrate | read `DRAFT`; if `activeWalkthroughId` set → auto-resume at saved `walkStepIdx` | — (card shows `↺ Restart` link on first step after resume) |
| switch scenario mid-walk | silent `walkExit`, then activate new scenario | persist `DRAFT` |

### Completion ledger in the catalog

Per-walkthrough badges:
- **✓ Done** (green) — `completedAt` is set; walk-row text dims to indicate "already seen"
- **▶ Resume** (amber) — `stepIdx > 0` and `completedAt` is null; shows "Resume · step X / Y"
- **Blank** — never started

Per-scenario summary pill replaces the "X walks" pill once any walk is started:
- **"3 / 3 done"** (green) — all walks complete
- **"1 / 2 done"** (amber) — some complete
- **"0 / 2 done"** (grey) — none started yet (only shown if `PROGRESS` has any entry for any walk in this scenario; otherwise show plain "X walks" pill)

### Edge handling

- Walkthroughs removed from `_TB_V3_WALKTHROUGHS` but still in `PROGRESS`: ignored on load; stale entries do no harm
- `walkStepIdx` greater than `steps.length` on hydrate: clamp to last step
- LocalStorage cleared: fresh start; no migration

---

## Section 6 — Pilot content (5 walkthroughs)

Scenario IDs below are placeholders pending confirmation. Step counts are estimates; final counts emerge during authoring.

| # | Scenario `id` (title) | Walkthrough | Steps | Primitives | `domainTags` · difficulty |
|---|---|---|---|---|---|
| 1 | `home-network` (Home Network Setup) | How devices communicate | ~6 | N + H + F | Networking Concepts (inherit `1.2`) · easy |
| 2 | `home-network` (Home Network Setup) | Common attack vectors | ~6 | N + H | Network Security (override) · easy-med |
| 3 | `branch-office-wireless` (Branch Office Wireless) | How wireless extends the LAN | ~5 | N + H + F | Networking Concepts (inherit `1.8`) · med |
| 4 | `dmz-screened-subnet` (DMZ with Screened Subnet) | Defense in depth | ~7 | N + H + F | Network Security (override; scenario refs `1.6` + `2.4`) · hard |
| 5 | `hub-and-spoke-wan` (Hub-and-Spoke WAN) | How branches reach HQ | ~5 | N + H + F | Network Implementation (inherit `2.1`) · med |

**Rationale:** 4 distinct scenarios (Home network has 2 walks — proves 1:N), 3 exam domains covered (Networking Concepts ×2, Network Security ×2, Network Implementation ×1), easy→hard difficulty spread, all 3 primitives exercised. Learner can complete the full pilot in roughly 30 minutes. `N` = Narrate · `H` = Highlight · `F` = Flow.

**Authoring (per Q2 decision):** Claude drafts all 5 walkthroughs' step `title` + `body` text during Stage 8. The stop-slop skill validates each walkthrough inline as it's drafted (not batched). User reviews drafted content before Stage 9 polish.

---

## Section 7 — Skills-per-stage matrix

Implementation will have ~10 stages. The marked stages invoke the relevant design skill. Engine, data, and test stages don't need design skills. This matrix is what writing-plans should cite per stage.

| # | Stage | What | ui-ux-pro-max | taste-skill | emil-design-eng | stop-slop |
|---|---|---|---|---|---|---|
| 1 | Data layer | Types, walkthroughs file, scenario→walkthrough mapping | — | — | — | — |
| 2 | Runner + state | Lifecycle, storage hydration, `intent='walk'` | — | — | — | — |
| 3 | Step primitive engine | `runStep()`, `applyHighlight()`, `animateFlow()` | — | — | — | — |
| 4 | 2D renderer | Canvas pulse, cable pulse, pellet sprites | ◆ effect recipes | — | ◆ cadence + easing | — |
| 5 | 3D renderer | Three.js glow, Bezier pellets, soft camera focus | ◆ 3D recipes | — | ◆ camera tween | — |
| 6 | Right-rail catalog | Focus-dim accordion, nested walks, completion ledger | ◆ accordion patterns | — | ◆ expand cadence | — |
| 7 | Step card UI | Floating card, tail, anchor logic, animate-between-steps | ◆ card chrome | ◆ visual style | ◆ tween polish | — |
| 8 | Pilot walkthrough authoring | Write 5 walkthrough.js definitions with step content | — | — | — | ◆ per-walk copy validation |
| 9 | Polish pass | Final motion review, copy QA, visual coherence | — | ◆ coherence | ◆ motion final | ◆ copy final |
| 10 | Tests + release | UAT, Playwright E2E, version bump, deploy | — | — | — | — |

**Precedent:** matches the per-stage skill discipline used on v6.4.3 (ui-ux-pro-max for each Stage 2 illustration batch; emil-design-eng tuned ambient packet motion to 2.6s linear; stop-slop validated the 5 locked copy strings).

---

## Section 8 — Testing strategy

### UAT (existing harness)

- Walkthrough data shape: every `scenarioId` exists in `_TB_V3_SCENARIOS`; every step `target.id` exists in the scenario's `startingState.devices`
- State transitions: `walkStart` → `walkNext × N` → `walkComplete` writes `completedAt`; `walkExit` mid-walk preserves `PROGRESS`
- Storage hydration: `DRAFT` with `activeWalkthroughId` set re-enters walk at saved `stepIdx`; `walkStepIdx` greater than `steps.length` clamps to last step
- Engine fallbacks: missing target falls back to narrate render with dev warning logged
- Card anchor: auto-position never returns coords outside the canvas viewport (test all 4 fallback corners)
- First-step / last-step button states: first step hides Back; last step shows "Finish →"

### Playwright E2E (existing suite)

- Happy path: activate scenario → start walk → step through all steps → complete → ledger updates with ✓
- Resume: walk to step 3 → reload page → card resumes at step 3 with `↺ Restart` link visible
- Mode switch mid-walk: open 3D popup → card re-anchors via projection → close popup → card back in 2D at same step
- Reduced motion: `prefers-reduced-motion: reduce` → pulse becomes static ring, card snaps not tweens, flow becomes static arrow + hop labels. **Test infra:** no existing helper in the suite. Add a `mockMatchMedia({ reducedMotion: 'reduce' })` helper for UAT (overrides `window.matchMedia` for the test block). Playwright uses its built-in `page.emulateMedia({ reducedMotion: 'reduce' })`. Both land in Stage 10.
- Catalog focus-dim: click scenario A → A active + B/C dim → click B → B active + A/C dim → click A again → focus returns
- Silent exit on scenario swap mid-walk: walkthrough state cleared, scenario activates cleanly
- Sibling walkthrough chaining: complete walk 1 → tap sibling walk 2 in completion card → card animates to walk 2's step 1

### Manual content QA (the 5 walkthroughs)

- All 5 walks pass stop-slop end-to-end (titles, bodies, completion text)
- Manual round-trip each walk in 2D — confirm card placement reads clearly, highlight is visible against scenario topology, flow animation reads from `from` to `to`
- Manual round-trip each walk in 3D popup — confirm card projects correctly, camera focus lands on target, flow Bezier reads in perspective
- Exam-domain tag matches the walk's content
- Difficulty rating subjectively reviewed — easy walks finish in &lt;5 min, hard in 7-10 min

---

## Section 9 — Out of scope for v1

These are deliberately deferred to v1.x:

- **Interactive primitive** (step advances when learner clicks a target device)
- **Explicit camera primitive** (author-specified 3D camera moves beyond auto-focus on highlights)
- **Exam-tip overlay primitive** (callout overlay with cert objective code; v1 includes exam relevance inside step body text)
- **AI runtime features** (no "Explain differently" buttons; Coach stays parked)
- **Step jumping** (catalog allows starting a walk from step 1 only; clicking a step dot mid-walk is non-clickable for v1; linear back/next only)
- **Walkthrough authoring UI** (walkthroughs are authored in code, not via a UI; this is the right v1 tradeoff)
- **Cross-device sync** (`PROGRESS` is local-storage only; cloud sync is out of scope)
- **Difficulty filters / search** (catalog grouping by domain is the only organization in v1)
- **Walkthrough-level completion certificate** (small `✓ Done` badge is the only completion artifact in v1)

---

## Section 10 — Decision log (resolved post spec self-review)

The five open questions surfaced in the initial self-review pass were all resolved before handing to writing-plans. Recorded here for audit:

1. **Pilot scenario IDs (Q1).** Resolved via codebase recon. The 5 pilot walks now reference real `_TB_V3_SCENARIOS` IDs: `home-network` (×2), `branch-office-wireless`, `dmz-screened-subnet`, `hub-and-spoke-wan`. See Section 6.
2. **Pilot copy ownership (Q2).** Claude drafts all 5 walkthroughs' step `title` + `body` text during Stage 8. The stop-slop skill validates each walkthrough inline as it's drafted (not batched). User reviews before Stage 9 polish. Noted in Section 6.
3. **`domainTags` ↔ `objectiveRefs` mapping (Q3).** Resolved via codebase recon: `objectiveRefs` use `'X.Y'` format where `X` is the major exam domain (1-5). Mapped via the new `_TB_V3_EXAM_DOMAINS` constant + `domainsForRefs()` helper. Walkthroughs that take a different angle from the scenario's primary domain explicitly set `domainTags` to override. See Section 1 (Exam domain lookup).
4. **3D popup step card z-index (Q4).** Resolved via codebase recon: 2D card uses `z-index: 105` (above canvas at 100); 3D card uses `z-index: 8` within the popup's local stacking context (above canvas/chrome at 6; below tool buttons at 10). See Section 4 (Z-index slots).
5. **Reduced-motion test infrastructure (Q5).** Resolved via codebase recon: no existing infrastructure. New `mockMatchMedia(...)` UAT helper + Playwright's built-in `emulateMedia` land in Stage 10. See Section 8.

---

## Acceptance criteria for v1 ship

1. The 5 pilot walkthroughs are completable end-to-end in 2D
2. The 5 pilot walkthroughs are completable end-to-end in 3D popup
3. Mode switch mid-walk is seamless (no step state lost, card re-anchors correctly)
4. Page reload mid-walk auto-resumes at saved step with `↺ Restart` available
5. Completion ledger updates the catalog correctly (badges, summary pills)
6. `prefers-reduced-motion` swaps all animations to static fallbacks
7. All copy passes stop-slop
8. UAT + Playwright suites pass without regressions to existing TB V3 tests
