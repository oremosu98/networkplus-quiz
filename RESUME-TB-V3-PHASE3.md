# Resume TB v3 Phase 3 dogfood

**How to use this file:** open a fresh Claude Code chat tomorrow, copy the prompt block below (between the `---` lines), paste it as your first message, send.

---

```
Continuing TB v3 Phase 3 dogfood on branch `feat/tb-v3-phase3` at
`/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz/`. 30 commits
ahead of main. All Phase 3 tests pass locally (UAT 6557/6557, Playwright
chromium 133/133, all 25 scenarios load with GOALS MET). Spec at
`docs/superpowers/specs/2026-05-20-tb-v3-phase3-design.md`, plan at
`docs/superpowers/plans/2026-05-20-tb-v3-phase3.md`, dogfood at
`.superpowers/brainstorm/17327-1779282193/content/phase3-dogfood.html`.

BLOCKED on a real dogfood bug: cable mode in Free Build (Step 4). Drop a
router via palette → drop a workstation → press `c` → click both
devices → no cable appears. The 'c' keydown handler works (cursor turns
crosshair, status bar shows "Cable mode · click two devices") but the
two subsequent clicks don't produce a visible cable. Yesterday I
incorrectly attributed this to state contamination from my preview
evals; founder confirmed it still doesn't work after a clean reset.

Skills to invoke throughout: /using-superpowers, /systematic-debugging,
/stop-slop, /design-taste-skill-pack, /emil-design-eng. Discipline: do
NOT run state-mutating preview_eval scripts during a live dogfood — they
corrupt state and produce false readings. Use read-only diagnostics +
ask the founder for exact symptoms.

Start the investigation here:
1. Cable handler: `features/topology-builder-v3.js` ~line 2211
   (function _wireCableDrawing) + cable render at ~line 1810 (the bail
   on missing-device IDs is the likely render-side symptom).
2. Suspect: the device-drag mousedown handler calls _renderCanvas()
   which REPLACES device DOM nodes. The subsequent click event may land
   on a stale target, so the cable handler's
   e.target.closest('.tb3-dev') reads wrong. Verify by adding a temp
   console.log inside the cable click handler.
3. Phase 3 commits that could matter: `a8c80cc` (_autoFillIp drop
   wire), `0e83864` (drawer DOM in _renderWorkspace), `cbc0767` (pill
   click handler).
4. Ask the founder to open DevTools console + retry Step 4, share any
   JS errors AND the value of
   `window._certanvilFeatures['topology-builder-v3']._getState().cables`
   after the second click.

Once cable mode works, resume the 10-step dogfood. When all 10 pass,
execute Stage 10.2 of the plan: merge feat/tb-v3-phase3 to main, bump
v6.0.0, push, monitor CI, prod smoke.

Server: if port 3131 is dead, restart with the network-plus-quiz launch
config or `python3 -m http.server 3131` from repo root.
```

---

When Phase 3 ships clean, delete this file.
