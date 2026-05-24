# TB v3 Phase 7 — 3D mode design

**Status:** Locked design, ready for plan
**Date:** 2026-05-24
**Brainstorm:** 4 shape-of-solution decisions resolved (architecture, mode topology, perspective, OSI panel fate); §3–§10 sections all sign-off
**Prior phase shipped:** v6.3.0 (Phase 6 OSI mode — per-hop L1-L7 stack, locked verbs, encap/decap/intermediate motion engine)

---

## §1 Goal

Phase 7 layers a perspective-shifted 3D view on top of Phase 5's Trace substrate and Phase 6's per-layer OSI substrate. The topology renders as a tilted table-top scene; devices stand vertically from the table; the trace packet glides at table-plane height along cables during L1 transit; when entering a source or destination device, the packet rises up through the standing device and the Phase 6 7-row OSI cascade renders inside that standing device's face — same active/passive layer model as Phase 6, same locked stop-slop verbs, just inverted from a right-rail panel to a vertical stack rendered inside the standing device. Failure pins to the OSI layer that owns the fault, and the failed layer row inside the standing device pulses red (no panel; the 3D scene IS the visualization).

The pedagogical target: N10-009 questions that test wire-level topology comprehension and per-hop OSI behavior get an irreducible visual model — students see the packet as a thing that travels along cables, enters a device, gets reframed, leaves, repeats. The same physical model that explains why a router rewrites L2 headers but preserves L3 headers, why a switch only operates on L2, and why a failure at L3 (no route) traps the packet inside the routing engine rather than the cabling.

---

## §2 Non-goals

Phase 7 explicitly does NOT include:

- **No Three.js, no WebGL, no `vendor/three/*`** — the original v4.63.0 tb3d.js contract is retired; do not resurrect it. CSS 3D transforms only.
- **No new lazy-load feature module** — additive inside `topology-builder-v3.js` IIFE (mirrors Phase 5/6 cadence).
- **No user-orbital camera controls** — no mouse drag, no WASD, no preset-angle buttons. Camera is fixed at the table-top tilt.
- **No camera animation during trace** — the perspective never shifts. The packet moves, the scene does not.
- **No new `state.mode` value** — `'3d'` is already pre-reserved in the existing enum (`design | simulate | trace | osi | 3d`); no enum modification.
- **No new `_traceState` fields** — Phase 6 already added `osiAnimHandle` and `reasonCode`. Phase 7 reuses both.
- **No new user-facing copy** — reuses Phase 6's 12 locked verb templates (`_verbForLayer`) verbatim. The control strip uses existing Phase 5 button labels.
- **No `tb3d.js` revival** — the file does not exist (verified `find` returns nothing); the v4.63.0 dynamic-import / `setTraceState()` contract is historical only.
- **No Phase 6 behavior change** — the Phase 6 OSI panel still renders identically in osi mode (UAT verifies via Stage 1 zero-behavior-change refactor).
- **No Phase 5 behavior change** — Trace mode renders identically; the cancel-discipline chain just adds one more reset (`_clearPacketTransition`).
- **No keyboard remapping** — Esc closes 3D (existing pattern), Tab/Arrow keys behave identically to Phase 5/6.

---

## §3 Locked shape-of-solution decisions

Resolved via 4 Q&A rounds in brainstorm:

1. **Architecture** — Inside `topology-builder-v3.js` IIFE, CSS 3D transforms only. Zero new deps. `~+800 LOC JS`, `~+250 LOC CSS`. `TB3_CSS_REV` bumps `r11 → r12` at Stage 0.
2. **Mode topology** — Peer mode. `_open3D(payload?)` wraps `_openTrace(payload || null)`, sets `state.mode = '3d'`, adds `'3d-open'` body class. OSI cascade integrated in this same ship (matches Phase 6 §14 implication).
3. **Perspective** — Table-top tilt. Scene `rotateX(50deg)`, each device counter-rotates (`rotateX(-50deg) translateZ(28px)`, `transform-origin: 50% 100%`) to stand vertically. Cables stay on the table plane.
4. **OSI panel fate** — Right-rail trace annotation panel hides in 3D mode. Cascade renders inside the standing device face as a vertical 7-row stack. Trace controls (Start / Next / Play / End / Speed) move to a minimal floating control strip pinned to viewport bottom.

---

## §4 Architecture

**Surface.** `state.mode` adds NO new value — `'3d'` is already pre-reserved in the existing 5-value enum. The 3D modebar pill (currently locked since Phase 1) unlocks. Full mode set now active: `design | simulate | trace | osi | 3d`.

**State machine — zero new module-scope state.** `_traceState` reuses Phase 6's `osiAnimHandle` for the per-layer cascade rAF. The packet rise/fall is a one-shot CSS transition (self-cancelling by overwrite) — no new handle. Zero schema change.

**Activation handlers (mirror Phase 6 OSI pattern):**

```javascript
function _open3D(payload) {
  _openTrace(payload || null);          // cross-rail mutex sweep + lifecycle
  state.mode = '3d';                    // override mode set by _openTrace
  document.body.classList.add('3d-open');
  _renderTracePanel();                  // dispatches to floating control strip
  _renderCanvas();                      // standing devices via CSS class
  _renderModeBar();                     // 3D pill highlights
}

function _close3D() {
  document.body.classList.remove('3d-open');
  _closeTrace();                        // shares teardown with Trace/OSI
}
```

**Render dispatch — 3 touch points:**

1. `_renderTracePanel` — in `'3d'` mode, emit the floating control strip (Start/Next/Play/End/Speed only) instead of the full right-rail panel. The annotation pane is `display:none` via `body.3d-open` scoped CSS.
2. `_renderCanvas` / per-device template — each device's existing DOM root gets a new empty `<div class="tb3-3d-device-cascade">` container. Hidden in 2D modes (`display:none` via scoped CSS). In 3D mode, populated by `_render3DDeviceCascade(devId)` when that device fires.
3. New `_render3DDeviceCascade(devId, role, layerStack)` — renders the 7-row OSI stack inside the standing device face. Reuses a NEW factored-out helper `_renderOSIStack(layerStack, opts)` that returns just the row HTML.

**Reusable substrate refactor (Phase 6 backward-compatible).** Stage 1 extracts the 7-row HTML generator out of Phase 6's `_renderOSIPanel` into `_renderOSIStack(layerStack, opts)`. Phase 6 panel calls `_renderOSIStack(stack, {variant:'panel'})`. Phase 7 in-device call uses `_renderOSIStack(stack, {variant:'in-device'})` — same row DOM, different variant class for scoped CSS. Zero Phase 6 behavior change (UAT verifies row-for-row output identity).

**Cross-rail mutex (6 panels now).** Every `_open*` that calls `_closeTrace()` AND `_closeOSI()` (per Phase 6 Stage 11 forEach audit) ALSO calls `_close3D()`. New UAT forEach lock asserts `_selectDevice` / `_openPicker` / `_openDiagnostic` / `_openSimulate` all call all three. `_openTrace` / `_openOSI` / `_open3D` do NOT call each other's close (they share `_traceState` — switching is a mode flip, not a close).

**Step-through pipeline — Phase 7 motion branches.** `_stepTrace`'s onDone callback (Phase 5 Stage 6 + Phase 6 motion branch) gets a Phase 7 branch:

```javascript
if (state.mode === '3d') {
  // Phase 6 cascade still runs (now renders INTO the standing device via _render3DDeviceCascade,
  // not into the panel). Phase 7 adds the rise/fall transitions wrapping the cascade.
  _packetRise(hopId, () => {
    const role = _hopRole(_traceState.currentHopIdx);
    if (role === 'source')       _animateEncap(hopId, activeLayers, () => _packetFall(hopId, settle));
    else if (role === 'dest')    _animateDecap(hopId, activeLayers, () => _packetFall(hopId, settle));
    else                         _animateIntermediate(hopId, deviceType, () => _packetFall(hopId, settle));
  });
}
```

Phase 5's settle pulse + badge update still fire. Phase 6's `_animate*` functions remain unchanged — Phase 7 just wraps them with `_packetRise` / `_packetFall` and redirects their render target via the in-device variant of `_renderOSIStack`.

---

## §5 Visual treatment (CSS 3D transforms)

### §5.1 Scene-level transforms

Three nested transform layers on the canvas DOM:

```css
.tb3-canvas-host       { perspective: 1400px; perspective-origin: 50% 30%; }
.tb3-canvas-scene      { transform: rotateX(50deg); transform-style: preserve-3d;
                         transform-origin: 50% 50%; }
.tb3-canvas-scene > *  { transform-style: preserve-3d; }
```

- `perspective: 1400px` on the host gives the depth illusion (tuned for ~1280×800 viewport — labels stay readable, depth feels meaningful).
- `rotateX(50deg)` on the scene tilts away from the viewer.
- `preserve-3d` on the scene and children lets per-device counter-rotations stack correctly.

These rules are scoped under `body.3d-open` — they activate ONLY in 3D mode.

### §5.2 Per-device standing transforms

```css
body.3d-open .tb3-device {
  transform: rotateX(-50deg) translateZ(28px);
  transform-origin: 50% 100%;   /* bottom edge anchors to table */
}
```

Counter-rotates the parent's tilt so the device stands vertically. `transform-origin: 50% 100%` plants the bottom edge on the table plane. `translateZ(28px)` lifts the device card above the table for clean separation from cable runs.

### §5.3 Cascade DOM inside standing device

```html
<div class="tb3-device" data-dev-id="…">
  <!-- existing device label/icon stays at top -->
  <div class="tb3-3d-device-cascade">
    <!-- _renderOSIStack(layerStack, {variant:'in-device'}) -->
    <div class="tb3-osi-row tb3-osi-row--in-device" data-layer="7">…</div>
    <div class="tb3-osi-row tb3-osi-row--in-device" data-layer="6">…</div>
    <!-- L7 → L1 top-down DOM order; CSS may visually reorder per encap/decap direction -->
  </div>
</div>
```

Rows are ~22px tall (vs panel's ~32px) — sized for the device card footprint. Layer name + protocol abbreviation fit; full header data abbreviated (e.g., `IP src=10.0.0.5 → dst=8.8.8.8` becomes `10.0.0.5→8.8.8.8`). Hover/focus reveals full text via tooltip (`title` attribute and `aria-label`).

### §5.4 Cables stay on the table plane

Existing SVG cable paths render unchanged — they're at `translateZ(0px)` (the table surface). No 3D transform on cables; they simply appear to lie flat as the scene tilts.

### §5.5 Packet element in 3D

The trace packet (SVG circle from Phase 5) glides along the cable path at `translateZ(0px)` during L1 transit. On arrival at a device, a one-shot CSS transition lifts it to `translateZ(56px)` (vertical center of the standing device card) over ~180ms, then fades as the cascade fires. On departure, reverses.

### §5.6 Z-ordering

`preserve-3d` on the scene container makes the browser sort by computed Z naturally. No manual `z-index` needed for devices/cables/packet — depth-sort is automatic. The only manual `z-index` is the floating control strip and modebar (`z-index: 50` to float above the 3D scene).

---

## §6 Motion choreography

### §6.1 Per-hop motion sequence (4-phase)

```
1. GLIDE     — packet travels along cable at table-plane (translateZ:0)
               Phase 5's existing rafHandle drives this; unchanged.
               ~400-800ms depending on cable length + speed setting.

2. RISE      — packet lifts from cable plane up to device vertical center
               translateZ: 0 → 56px via CSS transition
               180ms, ease-out cubic-bezier(.2, .7, .2, 1)

3. CASCADE   — OSI layer-stack fires inside the standing device
               Encap (source):       L7 → L1, 80ms per layer = 560ms
               Decap (dest):         L1 → L7, 80ms per layer = 560ms
               Intermediate router:  L1→L2→L3 (240ms) + pause (200ms) + L3→L2→L1 (240ms) = 680ms
               Intermediate switch:  L1→L2 (160ms) + pause (200ms) + L2→L1 (160ms) = 520ms
               osiAnimHandle drives the rAF loop (Phase 6 mechanism unchanged).

4. FALL      — packet lifts back down to cable plane
               translateZ: 56px → 0 via CSS transition
               180ms, ease-in cubic-bezier(.8, 0, .8, .3)
```

Total per-hop: source/dest ≈ 920ms + glide; intermediate router ≈ 1040ms + glide; intermediate switch ≈ 880ms + glide.

### §6.2 Speed selector behavior

Speed selector (0.5x / 1x / 2x) applies to glide AND cascade phases. Rise/fall stay fixed at 180ms each — they're transitions, not durations, and speeding them up below 100ms feels broken.

### §6.3 rAF discipline (triple-coverage cancel)

emil §8.6 dual-timer pattern extends to three sources:

```javascript
function _stepTrace() {
  if (_traceState.rafHandle)      cancelAnimationFrame(_traceState.rafHandle);
  if (_traceState.osiAnimHandle)  cancelAnimationFrame(_traceState.osiAnimHandle);
  _clearPacketTransition();  // NEW Phase 7 — overwrite in-flight transform on packet el
  // ... proceed with next hop
}

function _clearPacketTransition() {
  const pkt = document.querySelector('.tb3-packet');
  if (pkt) {
    pkt.style.transition = 'none';
    pkt.style.transform = '';
    void pkt.offsetWidth;  // force reflow to commit reset before next transition
    pkt.style.transition = '';
  }
}
```

This is the Phase 7 addition to the cancel-discipline chain. Rapid Next (user pressing Next 5x quickly) cleanly interrupts all 3 motion streams.

### §6.4 Asymmetric easing tokens (4 new scoped tokens)

```css
:root {
  --tb3-3d-rise:    cubic-bezier(.2, .7, .2, 1);   /* lift up — anticipation feel */
  --tb3-3d-fall:    cubic-bezier(.8, 0,  .8, .3);  /* drop down — gravity feel */
  --tb3-3d-cascade: cubic-bezier(.4, 0,  .2, 1);   /* per-layer firing in standing dev */
  --tb3-3d-scene:   linear;                         /* scene tilt (locked, never animated) */
}
```

The rise/fall asymmetry mirrors Phase 6's encap/decap asymmetry (slow-out vs fast-in) — encoding "going up takes effort, coming down is gravity".

### §6.5 Failure motion

If the trace hits a failed device, the rise still completes (packet enters the device), the cascade fires up to the failing layer, the failing layer row pulses red (`tb3OSILayerFailPulse` keyframe, NEW), and the packet does NOT fall out (it stays inside the failed device until user clicks End or restarts). The entire standing device card gets a red rim glow via `tb3-3d-fail-glow` class + `tb3FailGlowPulse` keyframe (2s, ease-in-out, infinite).

---

## §7 Failure UX and accessibility

### §7.1 Three stacked failure signals

1. **Standing device card rim glow** — failed device gets `tb3-3d-fail-glow` class. Pulsing red rim via `tb3FailGlowPulse` keyframe.
2. **Failed OSI layer row pulse** — the specific layer that owns the failure (from Phase 6's `_failedReasonToLayer`) gets `tb3-osi-row--failed` + `tb3OSILayerFailPulse` keyframe (1.2s ease-in-out, repeats 3x then settles). The other 6 rows render as passive/dimmed.
3. **Packet stays inside the failed device** — does not fall back to cable. User sees the packet trapped where the failure occurred. Reset only on End / Start / mode swap.

### §7.2 Accessibility — `aria-live` floating strip

Since the right-rail panel hides, the floating control strip carries an `aria-live="polite"` status region that announces every hop transition:

- Normal: `"Hop 2 of 4 — Router R1 — encapsulating at Layer 3 Network"`
- Failure: `"Failure at Hop 2 — Router R1 — no route to destination — Layer 3 Network"`

The 7-row cascade inside each device is DOM-rendered (not pure CSS), so screen readers reach it via tab order if the user focuses the device. Each row has `aria-label` like `"Layer 7 Application — passive"` or `"Layer 3 Network — active — encapsulating"`.

### §7.3 Keyboard navigation

- **Esc** closes 3D mode (cross-rail mutex pattern).
- **Tab** cycles through: control strip buttons → modebar pills → devices (in DOM order).
- **Arrow keys** when control strip Next button is focused: Right steps forward, Left steps back (mirrors Phase 5/6).

---

## §8 Reduced-motion fallback

Wrapped in `@media (prefers-reduced-motion: reduce)`:

```css
@media (prefers-reduced-motion: reduce) {
  body.3d-open .tb3-canvas-scene        { transform: rotateX(0deg); }
  body.3d-open .tb3-device              { transform: none; }
  body.3d-open .tb3-packet              { transition: none; transform: none !important; }
  body.3d-open .tb3-osi-row--in-device  { animation: none; opacity: 1; }
  body.3d-open .tb3-3d-fail-glow        { animation: none;
                                          box-shadow: 0 0 0 2px var(--tb3-fail-border); }
}
```

In reduced-motion 3D mode: scene flattens (`rotateX(0)`), devices don't stand up, packet stays at table plane (no rise/fall), cascade rows appear instantly with all 7 visible, failure glow becomes a static red border. The 3D mode is still "open" (body class active, control strip floats, in-device cascade renders), it just renders without the 3D drama. Users with vestibular sensitivities get a functional 3D-mode UI without motion.

---

## §9 Stop-slop copy locks

Phase 7 introduces **ZERO new user-facing copy.** Reuses Phase 6's locked verb templates verbatim (`_verbForLayer`, all 12 templates from Phase 6 §7.4). The control strip uses existing Phase 5 button labels (`Start`, `Next`, `Play`, `End`, speed selector). The `aria-live` status announcements compose existing Phase 6 verbs into sentence form (e.g., `"Hop {n} of {total} — {dev} — {verb} at Layer {n} {layerName}"`). Stage 13 UAT consolidation guards against any new copy string slipping in.

---

## §10 Stage breakdown (preview — full plan via writing-plans)

Approximately **16 stages**. Sonnet default; Opus for the motion-engine cluster (Stages 8, 9, 10, 11).

| Stage | Goal | Subagent |
|---|---|---|
| 0 | CSS rev bump r11 → r12 + branch hygiene | Sonnet |
| 1 | `_renderOSIStack` extraction from Phase 6 `_renderOSIPanel` (zero-behavior-change refactor) + UAT | Sonnet |
| 2 | Modebar 3D pill unlock + `_open3D` / `_close3D` lifecycle + cross-rail mutex extension (6 panels) | Sonnet |
| 3 | Scene-level scoped CSS (perspective, rotateX, preserve-3d chain) + body.3d-open trigger | Sonnet |
| 4 | Per-device standing transform CSS + counter-rotate + transform-origin anchor | Sonnet |
| 5 | Cable + packet 3D rendering (cables on table, packet at translateZ:0 baseline) | Sonnet |
| 6 | In-device cascade DOM container in each device template + `_render3DDeviceCascade` | Sonnet |
| 7 | Floating control strip in 3D mode + render dispatch in `_renderTracePanel` | Sonnet |
| 8 | Motion engine — packet rise/fall CSS transitions + `_clearPacketTransition` cancel discipline | **Opus** |
| 9 | Motion engine — cascade firing inside standing device (encap/decap variants) | **Opus** |
| 10 | Motion engine — intermediate hop choreography (router 3-layer, switch 2-layer) | **Opus** |
| 11 | Failure UX — `tb3-3d-fail-glow` + `tb3OSILayerFailPulse` + trapped packet behavior | **Opus** |
| 12 | Reduced-motion CSS fallback + `aria-live` control-strip status region + screen-reader path | Sonnet |
| 13 | Cross-rail mutex forEach audit + UAT structural guards consolidation (~35 new) | Sonnet |
| 14 | Playwright DOM tests 54-61 + module exposures for test reach | Sonnet |
| 15 | Founder dogfood HTML (10-step smoke) | Sonnet |
| 16 | Ship — UAT/Playwright final + version bump v6.4.0 + CLAUDE.md history row + branch ready | Sonnet |

---

## §11 Test surface

### §11.1 UAT structural guards (target ~35 new; brings 6753 → ~6790)

- State enum: `'3d'` valid in `state.mode`; `_traceState` unchanged (zero new fields — guard against regression)
- Lifecycle: `_open3D` defined / calls `_openTrace` / sets mode='3d' / adds '3d-open'; 3D modebar pill no longer locked
- Render dispatch: `_renderTracePanel` emits floating control strip in 3D mode (not full panel); `_render3DDeviceCascade` defined; `_renderOSIStack` factored out and called by both Phase 6 panel and Phase 7 in-device
- Cross-rail forEach: 4 inspector-opener paths now call `_close3D()` (audit guard, like Phase 6 Stage 11)
- Motion fns: `_clearPacketTransition` defined; cancel chain in `_stepTrace` covers `rafHandle`, `osiAnimHandle`, AND packet transition
- Visual: `body.3d-open` triggers scoped CSS chain; `.tb3-canvas-scene` has `rotateX(50deg)`; `.tb3-device` has counter-rotation; cascade DOM container exists in every device template
- Reduced-motion: `@media (prefers-reduced-motion)` gates on scene tilt, device standing, packet transition, cascade animation, failure glow — 5 guards
- Stop-slop: zero new copy templates (reuses Phase 6 verbatim) — guard asserts no new verb strings introduced

### §11.2 Playwright DOM tests 54-61 (target 8 new; brings ~161 → ~169 chromium)

| # | Test |
|---|---|
| 54 | Open 3D mode from Design → 3D pill highlights, body.3d-open present, scene tilts |
| 55 | Open 3D from Trace mid-trace → trace state carries over, packet visible at expected position |
| 56 | Start trace in 3D → packet glides along cable then rises into source device |
| 57 | Cascade fires inside standing device → 7 rows visible in device DOM, active layer marked |
| 58 | Intermediate hop in 3D → router shows decap-up + pause + re-encap-down inside device |
| 59 | Failure in 3D → device gets fail-glow class, failed layer row pulses, packet trapped |
| 60 | Esc closes 3D → body class removed, scene flattens, Trace/OSI panel restored |
| 61 | Reduced-motion 3D → scene rotateX(0), no rise/fall on packet, cascade rows appear instantly |

### §11.3 Founder dogfood smoke (10-step checklist, ships in `dogfood/tb-v3-phase7.html`)

1. Click 3D modebar pill (Design state) → scene tilts, devices stand
2. Click 3D pill with existing topology → all devices visible, no overlap
3. Pick src + dst, click Start → packet glides in 3D
4. Watch source device → 7 layers cascade L7→L1 inside device card
5. Watch intermediate router → decap-up to L3 + pause + re-encap-down
6. Watch destination → 7 layers cascade L1→L7
7. Cause failure (delete cable mid-trace) → fail-glow + layer pulse + trapped packet
8. Click Esc → 3D mode closes cleanly, no lingering body class
9. Toggle prefers-reduced-motion → scene flattens, all motion removed, cascade still functional
10. Switch 3D ↔ Trace ↔ OSI via modebar pills → state preserved, no orphan animations

---

## §12 Known limitations

- **No camera animation** — fixed 50° tilt for the entire session. A user who wants to "look at the topology from another angle" cannot. By design (camera controls add complexity, motion sickness risk, and pull focus from trace pedagogy). Phase 8+ could revisit.
- **Cable label legibility under tilt** — cable labels (port names, link speed) render along the cable path on the table plane and may be hard to read at 50° tilt. Mitigation: increase font weight + add a thin background plate. If still illegible, Stage 5 may shorten labels or use abbreviation tooltips.
- **Z-fighting at extreme overlap** — if two devices overlap heavily on the canvas, the browser's depth sort may flicker. Mitigation: existing 2D mode does not allow overlap (devices snap to grid); Phase 7 inherits this constraint. UAT guards verify the grid snap is not relaxed in 3D mode.
- **In-device cascade row width** — long IP addresses or hostnames may truncate inside the 22px rows. Mitigation: tooltip on hover/focus shows full text. Screen readers get the full text via `aria-label`.
- **Mobile / touch** — 3D mode inherits the existing desktop-only viewport gate (`#tb-mobile-nudge`, < 900px). No touch-specific affordances. Phase 8+ could revisit.

---

## §13 Phase 8+ implications

Phase 7's 3D substrate becomes the foundation for:

- **Phase 8 (Coach mode)** — Tier C AI tutor can reference the visible 3D scene state in feedback (`"the packet is currently at L3 inside Router R1 — see the red glow on the third row from the top"`). The screen-reader transcript from §7.2 is reusable as the textual ground-truth for Coach prompts.
- **Phase 9 (Grade mode)** — PBQ-style questions can use 3D scene screenshots (`"Looking at this topology, which device must rewrite the L2 header?"`). The standing-device + cascade visuals are visually distinctive and PBQ-friendly.
- **Phase 10 (Replay mode)** — record + scrub a trace timeline; the 3D scene is the natural playback surface. The cancel-discipline chain from §6.3 is the foundation for scrubbing (jump-to-hop is just rapid cancel + restart at target index).

---

## §14 Skills locked for execution

- **Superpowers** drives the brainstorm → spec → plan → execute loop.
- **Taste-skill (dashboards)** routes the floating control strip + in-device cascade visual treatment — hairline rows, single accent, no card stacking.
- **Stop-slop** guards that no new copy templates slip in (Phase 7 reuses Phase 6 verbatim).
- **emil-design-eng** drives motion choreography — asymmetric rise/fall easing, 4-phase per-hop sequence, triple-coverage rAF cancel discipline, reduced-motion fallback.

---

## Self-review checklist

- [x] All "TBD" placeholders resolved
- [x] No section contradicts another (architecture matches feature descriptions; motion timing matches stage breakdown)
- [x] Scope is single-implementation-plan-sized (~16 stages, mirrors Phase 6 cadence)
- [x] Ambiguities made explicit (e.g., camera is fixed, no Three.js, in-device cascade variant is named `--in-device`)
- [x] Non-goals enumerated (§2) — guards against scope creep
- [x] Backward-compatibility called out (§4 refactor preserves Phase 6 behavior, §2 explicitly lists "no Phase 5/6 behavior change")
- [x] Test surface concrete (~35 UAT + 8 Playwright + 10-step dogfood)
- [x] Stage breakdown maps to skill assignments (Sonnet vs Opus)
- [x] Phase 8+ implications documented (§13 — feeds forward, like Phase 6 §14 did for Phase 7)
