# Resume TB v3 Phase 5 — Trace mode

> **Phase 4 (Simulate mode) shipped to prod as v6.1.0.** Phase 5 = Trace mode. Open a fresh session at the project root and follow this doc.

## Current state (post-Phase-4 ship)

| Field | Value |
|---|---|
| Production | **v6.1.0** live at networkplus.certanvil.com (CACHE_NAME `netplus-v6.1.0`, HTTP 200) |
| Main branch | `main` at `181cd77 chore(release): v6.1.0 — TB v3 Phase 4 Simulate mode` |
| Tests on main | UAT **6570/6570** · Playwright chromium **143/143** · tech-debt clean (2 pre-existing saas-gated breaches, no new) |
| Last shipped | v6.1.0 (TB v3 Phase 4) — Simulate mode: rail panel + drill controls + 3 motion fns (ping/ARP/DHCP) + Validator Preview + failure UX |
| Phase 4 branch | `feat/tb-v3-phase4` — merged to main, can be deleted (`git branch -d feat/tb-v3-phase4 && git push origin :feat/tb-v3-phase4`) |

## Phase 5 scope: Trace mode

**Goal (from CLAUDE.md v6.1.0 row + the Phase 4+ deferred list):** per-hop packet-flow visualization over the same `computePath` substrate Phase 3 + 4 already use. Where Simulate mode (Phase 4) plays one continuous animation src→dst, Trace mode breaks the same path into per-hop frames the user can step through (or autoplay) with annotations on each hop.

**Why this comes next:** Phase 4's `_motionPing` only shakes the destination on failure; mid-hop failures (e.g. router with no route) aren't acknowledged in the animation — the log row carries the truth via `REACH_REASON_TEMPLATES` but the canvas doesn't shake the failing hop. Trace mode is where mid-hop reasoning surfaces explicitly — it's the natural home for per-hop failure UX, hop-by-hop step controls, and the substrate the future Coach (Phase 8) and Grade (Phase 9) modes will lean on.

## Skills to use (founder direction, locked)

The Phase 5 design pass uses these four skills in order — **invoke each via the `Skill` tool when its turn comes, BEFORE any code:**

1. **Brainstorming skill** — `superpowers:brainstorming` — first pass. Lock the shape-of-solution decisions before any spec is written. Phase 4 locked 7 of these (lens / protocols / layout / drill initiation / signatures / teaching layer / validator preview); Phase 5's open questions to probe before writing a spec: step-through vs autoplay vs both? · how per-hop annotations render (overlay labels? pills? arrows?) · OSI layer surfacing in Trace (or save for Phase 6 OSI mode?) · failure-at-hop UX (now or defer further?) · interaction model (canvas-only click? sidebar log row click? both?) · scope vs Phase 6 (avoid bloating Trace with OSI work that has its own phase) · re-use of Simulate's animation engine (extend or new layer?). Use the visual companion pattern Phase 4 used — render each decision as a side-by-side mockup, get founder pick, lock.

2. **Taste-skill** — `taste-skill` — second pass. Master router for the UI style of Trace's per-hop overlays. Likely routes to `dashboards` (the per-hop annotations + step controls are an information layout problem, not a poster) but let the skill choose. Used to make sure Trace doesn't drift into AI-slop (no soft cards, no purple, no emoji icons, no gradient overlays).

3. **stop-slop skill** — `stop-slop` — third pass. Every user-visible string in Trace (hop labels, annotation text, step-control verbs, failure copy, the dogfood HTML, the CLAUDE.md row at ship) gets a de-slop run. Bias: short, specific, active, no rule-of-three, no em-dash overuse, no "in conclusion".

4. **Emil-design-eng skill** — `emil-design-eng` — fourth pass + ongoing. Animation choreography (step-to-step transitions, hop-highlight timing, return-to-rest cadence), invisible details (hover affordances, focus states, reduced-motion gates), and the "feels great" polish. Phase 4 used this idiom implicitly (cubic-bezier ease, 80ms settle pulses, 120ms DORA gaps); Phase 5 should use it deliberately because step-through is a more felt interaction than autoplay.

The flow is **brainstorming → taste → stop-slop → emil**, then the spec doc, then the bite-by-bite plan, then subagent-driven dev. Same rhythm as Phase 4.

## Pre-flight checklist (run at session start)

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
git checkout main && git pull origin main
git log --oneline -3                          # should top with 181cd77 v6.1.0
node tests/uat.js 2>&1 | tail -3              # expect 6570/6570
npx playwright test --project=chromium 2>&1 | tail -3   # expect 143 passed
git checkout -b feat/tb-v3-phase5             # new feature branch
```

## What to carry forward from Phase 4 (locked lessons)

- **Subagent discipline:** Sonnet default for mechanical stages, Opus for motion-engine work, **NEVER Haiku** (catastrophic file thrash). Phase 5 has motion-engine work (step-through choreography) — plan on Opus for those stages.
- **Idempotent wiring pattern:** any control in a re-rendered panel uses `.onclick = fn` / `.onchange = fn` direct assignment, NOT `addEventListener`. Phase 4's listener-accumulation bug took two passes to fully resolve — start Phase 5 with this rule already locked.
- **Schema field names** (Phase 3 surfaces Phase 4 had to adapt to — Phase 5 should know upfront):
  - `computePath(srcId, dstId, state)` returns `{ok, hops, reason?, failedAt?}` — field is **`hops`** (NOT `path`).
  - `computeReachability(state, completion)` returns `{complete, failures}` — success flag is **`complete`** (NOT `ok`); failure list is **`failures`** (NOT `gaps`).
  - `requiredCables` schema uses **`from`/`to`** (NOT `fromType`/`toType`).
- **Phase 4 known gaps Trace should close:**
  - **Mid-hop failure UX**: `_motionPing` only shakes the destination. Trace mode is where each hop carries its own failure surfacing.
  - **`_renderSimLog` rebuilds on every entry**: fine for human-paced drills but thrashes on batch playback. Phase 5's log entries (per-hop) will be denser — consider incremental `appendChild` here.
  - **Esc key in Playwright**: tests have to call exposed `_closeSimulate` because `_wireGlobalKeys` guards on the page-active class. If Trace adds its own keyboard handlers, expose the close fn the same way.
- **Test exposures locked on the feature registration:** `_getState` · `_setState` · `_deleteSelected` · `_renderCanvas` · `_closeSimulate` · `_openPicker` · `_loadScenario`. Phase 5 will likely add: `_startTrace` · `_stepTrace` · `_closeTrace`.
- **`TB3_CSS_REV` is currently `r9`.** Bump to `r10` at Stage 0 of Phase 5 (the dev-cache-bust handshake — the documented stale-SW gotcha).
- **`_simState` schema** (Phase 4 ephemeral): 8 keys. Trace state can either extend `_simState` (if Trace re-uses the Simulate animation engine) or get its own `_traceState` module-scope object. Brainstorm decision.
- **`.superpowers/brainstorm/` is gitignored** — use `git add -f` for the dogfood HTML at ship time. Phase 4's dogfood lives at `.superpowers/brainstorm/93179-1779476357/content/phase4-dogfood.html`; create a sibling Phase 5 dir.

## Phase 4 artifact index (for reference, not to modify)

| Artifact | Path |
|---|---|
| Phase 4 spec | `docs/superpowers/specs/2026-05-22-tb-v3-phase4-simulate-design.md` |
| Phase 4 plan | `docs/superpowers/plans/2026-05-22-tb-v3-phase4.md` |
| Phase 4 dogfood HTML | `.superpowers/brainstorm/93179-1779476357/content/phase4-dogfood.html` |
| Phase 4 resume doc | `RESUME-TB-V3-PHASE4.md` (this file's predecessor, can stay for history) |
| Phase 3 spec/plan (referenced by Phase 4) | `docs/superpowers/specs/2026-05-20-tb-v3-phase3-design.md` · `docs/superpowers/plans/2026-05-20-tb-v3-phase3.md` |
| Phase 4 feature module | `features/topology-builder-v3.js` (~+800 LOC vs Phase 3 head) |
| Phase 4 CSS | `features/topology-builder-v3.css` (~+200 LOC, scoped) |
| Phase 4 tests | `tests/uat.js` (+13 guards in `_tbv3Phase4Fixtures` IIFE) · `tests/e2e/app.spec.js` (+10 tests 26-35) |
| Phase 4 ship row | `CLAUDE.md` line 485 (v6.1.0) |

## Open questions deferred to brainstorming

These are the shape-of-solution questions to surface FIRST in the Phase 5 brainstorm session — don't write a spec until each one has a founder-locked answer:

- **Trigger:** how does the user enter Trace mode? Dedicated pill in the modebar? Right-click on a Simulate log row? Both?
- **Playback model:** step-through (click-to-advance), autoplay (with speed slider), or both?
- **Per-hop annotation surface:** float a label near each hop on the canvas? Or surface in a side panel (same rail-panel family as Simulate)?
- **OSI overlay:** Trace shows the path; OSI mode (Phase 6) shows the layers. Does Trace get a one-line OSI layer hint per hop, or is that fully Phase 6?
- **Failure-at-hop UX:** does the failing hop shake + glow (like Phase 4's `_failDevice`)? Does the trace pause there? Show the `REACH_REASON_TEMPLATES` copy inline?
- **State scope:** new `_traceState` module-scope object, or extend `_simState`? Implications for `_closeSimulate` teardown.
- **Animation engine re-use:** does Trace re-use `_movePacket`/`_spawnPacketSvg`/`_devCenter`, or does step-through need a new primitive (e.g. instantaneous teleport vs eased glide)?
- **Re-entry from Simulate:** if a Simulate ping fails and the user wants to investigate, does the failed log row offer a "Trace this hop" affordance?

Each of these has a real shape-of-solution lever. Lock them via the brainstorming skill's visual-companion pattern, then write the spec.

## Phase 6+ (out of scope for Phase 5)

OSI · 3D · Coach (Tier C AI) · Grade · Retire v1+v2. Each gets its own brainstorm → spec → plan → ship cycle after the prior phase ships and dogfoods clean.

---

**Founder, when you start the Phase 5 session:** open this file, run the pre-flight, invoke the brainstorming skill first. The 4-skill design pass (brainstorm → taste → stop-slop → emil-design-eng) before any code is the locked discipline this time. Sleep well.
