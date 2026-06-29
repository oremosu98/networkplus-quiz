---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# TB v3 Phase 7 — 3D popup design (v2)

**Status:** Locked design, ready for plan
**Date:** 2026-05-24
**Brainstorm:** 5 shape-of-solution decisions resolved (modal vs mode, render-copy vs canvas-transform, interaction model, visual ambition, sync mechanism)
**Prior phase shipped:** v6.3.0 (Phase 6 OSI mode)
**Reverted attempt:** v6.4.0 (Phase 7 v1 — peer-mode + trace/OSI integration) reverted at commit `c114b7f` because it overbuilt the original ask.

---

## §1 Goal

Add a 3D popup that opens as a modal lightbox showing the current canvas topology in a stylized 3D scene. Drag rotates the scene (both axes), scroll-wheel zooms, the scene live-syncs with canvas edits while the popup is open. Closes via Esc, backdrop click, or X button.

Visual character: **Stripe/Vercel-style stylized 3D** — multi-face boxes with layered shadows and soft directional lighting, cohesive with the existing forged-bronze editorial palette. Realistic enough to be "great to watch + visually appealing"; not photoreal. CSS 3D transforms only — no Three.js, no WebGL, no `vendor/three/*`.

## §2 Non-goals (what Phase 7 v2 is NOT)

- **Not a peer mode** — `state.mode` is NOT modified; popup is transient, mode stays whatever it was.
- **Not a perspective transformation of the existing canvas** — the popup renders a separate DOM mirror; the 2D canvas underneath is unchanged.
- **No trace, OSI, or sim integration** — popup is mode-agnostic; shows only devices + cables, no packet, no layer cascade, no failure UX.
- **No floating control strip** — interactions live in the modal viewport itself (drag, scroll, keyboard).
- **No Three.js / WebGL** — CSS 3D transforms only.
- **No new mode value in the state.mode enum** — `'3d'` remains pre-reserved but unused at the state level.
- **No mobile/touch support** — inherits TB v3's existing desktop-only viewport gate (`#tb-mobile-nudge`).
- **No idle animation** — when no one's interacting, the scene is static.
- **No cross-rail mutex extension** — popup is not a panel; opening it doesn't close inspector/picker/diagnostic/simulate panels.
- **No new lazy-loaded module** — additive inside the existing `features/topology-builder-v3.js` IIFE.

---

## §3 Locked shape-of-solution decisions

Resolved via 5 Q&A rounds:

1. **Modal vs mode:** Modal overlay (lightbox). Activated by the existing 3D modebar pill but does NOT change `state.mode` or add a body class that acts as a mode marker.
2. **Render-copy vs transform-existing:** The popup renders a SEPARATE 3D DOM mirror of the canvas content. The existing `#tb3-canvas-svg` is not touched.
3. **Interaction:** Drag-X + Drag-Y orbital rotation + scroll-wheel zoom (center-anchored). Constraints: `rotX ∈ [15°, 75°]`, `rotY` unconstrained, `zoom ∈ [0.5, 2.0]`. Double-click resets camera.
4. **Visual ambition:** Stylized 3D, Stripe/Vercel illustration vibe, CSS 3D transforms only.
5. **Live sync:** Explicit hook in the existing canvas render function — `if (_3dPopup.open) _render3DScene();` appended to the existing render path. No MutationObserver magic.

---

## §4 Architecture

### §4.1 Module-scope state

```javascript
var _3dPopup = {
  open: false,
  camera: { rotX: 52, rotY: -18, zoom: 1 },
  dragState: { active: false, startX: 0, startY: 0, startRotX: 0, startRotY: 0 },
  velocityX: 0,
  velocityY: 0,
  rafHandle: null
};
```

ALL Phase 7 v2 state lives in `_3dPopup`. No additions to `state` (the persisted source of truth), no additions to `_traceState`, `_simState`, etc. Clean separation.

### §4.2 Lifecycle

```javascript
function _open3DPopup() {
  if (_3dPopup.open) return;
  _3dPopup.open = true;

  document.body.style.overflow = 'hidden';   // body scroll lock

  var modal = document.createElement('div');
  modal.className = 'tb3-3d-popup-modal';
  modal.id = 'tb3-3d-popup-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'tb3-3d-popup-title');
  modal.innerHTML = _build3DPopupHtml();   // see §4.3
  document.body.appendChild(modal);

  _render3DScene();          // initial render of devices + cables
  _apply3DCamera();          // apply initial camera state
  _attach3DInputListeners(); // mousedown / wheel / keydown / etc.

  // Tween-in: modal scales from .85 → 1.0, opacity 0 → 1, over 320ms
  requestAnimationFrame(function () {
    modal.classList.add('is-open');   // CSS handles the tween
    document.getElementById('tb3-3d-popup-close-btn').focus();
  });
}

function _close3DPopup() {
  if (!_3dPopup.open) return;
  _3dPopup.open = false;

  if (_3dPopup.rafHandle) {
    cancelAnimationFrame(_3dPopup.rafHandle);
    _3dPopup.rafHandle = null;
  }
  _detach3DInputListeners();

  var modal = document.getElementById('tb3-3d-popup-modal');
  if (modal) {
    modal.classList.remove('is-open');   // CSS tween-out (220ms)
    setTimeout(function () { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 240);
  }

  document.body.style.overflow = '';   // restore scroll
  document.querySelector('.tb3-mode[data-mode="3d"]').focus();   // restore focus to pill
}
```

### §4.3 Modal DOM structure

```html
<div class="tb3-3d-popup-modal" id="tb3-3d-popup-modal" role="dialog" aria-modal="true" aria-labelledby="tb3-3d-popup-title">
  <div class="tb3-3d-popup-backdrop"></div>
  <div class="tb3-3d-popup-card">
    <header class="tb3-3d-popup-header">
      <h2 id="tb3-3d-popup-title" class="tb3-3d-popup-title">3D view of topology</h2>
      <span class="tb3-3d-popup-counts">N devices · M cables</span>
      <button class="tb3-3d-popup-close-btn" id="tb3-3d-popup-close-btn" aria-label="Close 3D view">×</button>
    </header>
    <div class="tb3-3d-popup-viewport"
         role="img"
         aria-label="3D rendering of N devices and M cables. Use arrow keys to rotate, plus or minus to zoom, R to reset, Escape to close."
         tabindex="0">
      <div class="tb3-3d-popup-stage">
        <div class="tb3-3d-floor"></div>
        <!-- devices rendered here by _render3DScene -->
        <!-- cables rendered here by _render3DScene -->
      </div>
    </div>
  </div>
</div>
```

### §4.4 Render functions

```javascript
function _render3DScene() {
  if (!_3dPopup.open) return;
  var stage = document.querySelector('.tb3-3d-popup-stage');
  if (!stage) return;

  // Remove old devices + cables (keep .tb3-3d-floor)
  Array.from(stage.querySelectorAll('.tb3-3d-dev, .tb3-3d-cable')).forEach(function (el) {
    el.remove();
  });

  // Append devices + cables from current state
  state.devices.forEach(function (dev) {
    stage.appendChild(_build3DDeviceEl(dev));
  });
  state.cables.forEach(function (cab) {
    stage.appendChild(_build3DCableEl(cab));
  });

  // Update header counts
  var counts = document.querySelector('.tb3-3d-popup-counts');
  if (counts) counts.textContent = state.devices.length + ' devices · ' + state.cables.length + ' cables';

  // Update aria-label on viewport for SR
  var vp = document.querySelector('.tb3-3d-popup-viewport');
  if (vp) {
    vp.setAttribute('aria-label',
      '3D rendering of ' + state.devices.length + ' devices and ' + state.cables.length +
      ' cables. Use arrow keys to rotate, plus or minus to zoom, R to reset, Escape to close.');
  }
}

function _apply3DCamera() {
  var stage = document.querySelector('.tb3-3d-popup-stage');
  if (!stage) return;
  stage.style.transform = 'rotateX(' + _3dPopup.camera.rotX + 'deg) ' +
                          'rotateY(' + _3dPopup.camera.rotY + 'deg) ' +
                          'scale(' + _3dPopup.camera.zoom + ')';
}
```

### §4.5 Live sync hook

The existing canvas render path (function that paints `#tb3-canvas-svg` on state changes — `_renderCanvas` or similar, verified at implementation time) gets one new line appended:

```javascript
function _renderCanvas() {
  // ... existing 2D canvas rendering unchanged ...
  if (_3dPopup.open) _render3DScene();   // NEW Phase 7 v2 — live sync
}
```

Single explicit hook. No MutationObserver, no event bus. State edits already call the existing render path, so the 3D mirror updates automatically. Camera transform on `.tb3-3d-popup-stage` is NOT touched by `_render3DScene` — user keeps their rotated view across edits.

### §4.6 Modebar pill wiring

The existing 3D pill click handler (currently calling the reverted `_open3D`) is rewired to `_open3DPopup`:

```javascript
// In the modebar click dispatch
if (mode === '3d') {
  _open3DPopup();
  return;
}
```

The pill does NOT highlight as "active mode" since 3D isn't a mode. It's a button that opens a modal.

---

## §5 Visual treatment (stylized 3D)

### §5.1 Scene structure

```
.tb3-3d-popup-modal (fixed, full viewport, z-index: 70)
└── .tb3-3d-popup-backdrop (full viewport, rgba(0,0,0,.45), backdrop-filter: blur(4px))
└── .tb3-3d-popup-card (centered, 88vw × 84vh, max-width 1200px, max-height 800px,
                       border-radius: 14px, box-shadow: 0 24px 80px rgba(0,0,0,.32),
                       background: var(--tb3-cream))
    ├── .tb3-3d-popup-header (h:48px, border-bottom hairline)
    └── .tb3-3d-popup-viewport (rest of card, perspective: 1400px)
        └── .tb3-3d-popup-stage (transform-style: preserve-3d, rotateX/Y/scale)
            ├── .tb3-3d-floor (rotateX:90deg plane, gradient, vignette)
            ├── .tb3-3d-cable × M
            └── .tb3-3d-dev × N
```

### §5.2 Per-device rendering — extruded cards

Each device renders as a thick "playing card" with depth, not a full 6-face cube. Five layers:

```html
<div class="tb3-3d-dev" data-device-id="..." style="transform: translate3d(Xpx, Ypx, 0);">
  <div class="tb3-3d-dev-top">
    <!-- existing device icon SVG -->
    <span class="tb3-3d-dev-label">{label}</span>
  </div>
  <div class="tb3-3d-dev-bottom"></div>
  <div class="tb3-3d-dev-side-n"></div>
  <div class="tb3-3d-dev-side-s"></div>
  <div class="tb3-3d-dev-side-e"></div>
  <div class="tb3-3d-dev-side-w"></div>
</div>
```

CSS (per spec §3 visual treatment):

```css
.tb3-3d-dev {
  position: absolute;
  width: 88px; height: 60px;
  transform-style: preserve-3d;
  filter: drop-shadow(8px 14px 16px rgba(0,0,0,.18));
}
.tb3-3d-dev-top {
  position: absolute; inset: 0;
  transform: translateZ(14px);
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--tb3-bronze) 92%, white 8%),
    var(--tb3-bronze));
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 6px;
}
.tb3-3d-dev-bottom {
  position: absolute; inset: 0;
  background: color-mix(in oklab, var(--tb3-bronze) 75%, black 25%);
  border-radius: 6px;
}
.tb3-3d-dev-side-n {
  position: absolute; left: 0; right: 0; top: 0; height: 14px;
  transform: rotateX(90deg);
  transform-origin: top;
  background: color-mix(in oklab, var(--tb3-bronze) 88%, black 12%);
}
.tb3-3d-dev-side-s {
  position: absolute; left: 0; right: 0; bottom: 0; height: 14px;
  transform: rotateX(-90deg);
  transform-origin: bottom;
  background: color-mix(in oklab, var(--tb3-bronze) 88%, black 12%);
}
.tb3-3d-dev-side-e {
  position: absolute; right: 0; top: 0; bottom: 0; width: 14px;
  transform: rotateY(-90deg);
  transform-origin: right;
  background: color-mix(in oklab, var(--tb3-bronze) 85%, black 15%);
}
.tb3-3d-dev-side-w {
  position: absolute; left: 0; top: 0; bottom: 0; width: 14px;
  transform: rotateY(90deg);
  transform-origin: left;
  background: color-mix(in oklab, var(--tb3-bronze) 85%, black 15%);
}
```

Material treatment: gradient on top face simulates light from upper-left. East/west side rims slightly darker than north/south (suggests light direction). Bottom face darkest. Per-device drop-shadow grounds the device to the floor.

### §5.3 Per-cable rendering — 3D-aware bezier ribbons

Cables stay on the floor plane (`translateZ: 0`) but render as 3-4px-wide ribbons (not 1px lines), with a subtle gradient along the cable's spine. Bezier-curved, not straight. Endpoints anchor to the device cards' bottom-edge midpoints.

```html
<svg class="tb3-3d-cable" style="position:absolute; left:0; top:0; ...; transform:translateZ(0);">
  <path d="M{x1},{y1} C..." stroke="url(#cable-grad)" stroke-width="3" fill="none" />
</svg>
```

Gradient `cable-grad` defined once in the modal's SVG defs: lighter bronze at the spine center, darker at the edges (suggests cross-section roundness).

### §5.4 Floor

```css
.tb3-3d-floor {
  position: absolute; inset: 0;
  transform: rotateX(90deg) translateZ(-30px);
  transform-origin: center;
  width: 2400px; height: 1600px;
  left: 50%; top: 50%;
  margin-left: -1200px; margin-top: -800px;
  background: radial-gradient(ellipse at 50% 40%,
    var(--tb3-cream) 0%,
    color-mix(in oklab, var(--tb3-cream) 70%, black 30%) 100%);
  pointer-events: none;
}
```

Floor sits 30px below the device baseline (so devices appear to hover slightly), with a soft radial vignette that fades to darker edges. No grid, no wireframe.

### §5.5 Ambient lighting simulation

Pure CSS, no real lighting. Three signals together create the "lit" feel:
1. **Gradient direction `135deg`** on all top faces (light from upper-left)
2. **Per-face hue shift** — east/west rims 3% darker than north/south (suggests sun position)
3. **Drop-shadow offset** — `8px 14px` matches light direction; `16px` blur gives soft cast

### §5.6 Initial camera + entry tween

On open:
- `rotateX(52deg)` — tilted back, gives depth without flattening
- `rotateY(-18deg)` — slightly turned, breaks dead-on symmetry
- `scale(1)` — neutral zoom

Entry animation:
- Modal: `opacity: 0 → 1` + `scale: .85 → 1` over 320ms, `cubic-bezier(.16, 1, .3, 1)` (emil's overshoot-and-settle)
- Backdrop: `opacity: 0 → 1` over 220ms, ease-out

### §5.7 Empty state

If `state.devices.length === 0`: stage renders just the floor + a centered, small label `Add devices to the canvas to see them in 3D.` No animation. Pill click on empty canvas still opens the modal so the user discovers what the 3D view is.

---

## §6 Interaction model

### §6.1 Drag rotate

```
mousedown on .tb3-3d-popup-viewport
  → setPointerCapture
  → _3dPopup.dragState = { active: true, startX, startY,
                            startRotX: camera.rotX, startRotY: camera.rotY }
  → reset velocityX/Y to 0
  → cancel any in-flight momentum rAF

mousemove (during drag)
  → dx = currentX − startX,  dy = currentY − startY
  → camera.rotY = startRotY + (dx × 0.4)
  → camera.rotX = clamp(startRotX − (dy × 0.4), 15, 75)
  → velocityX/Y = exponential moving average of recent frame deltas
  → _apply3DCamera()  (no rAF — synchronous, no jank)

mouseup
  → releasePointerCapture, dragState.active = false
  → if (|vX| > 0.5 || |vY| > 0.5) → _startMomentumDecay()
```

### §6.2 Momentum decay

```javascript
function _startMomentumDecay() {
  function tick() {
    _3dPopup.camera.rotY += _3dPopup.velocityY;
    _3dPopup.camera.rotX = clamp(_3dPopup.camera.rotX + _3dPopup.velocityX, 15, 75);
    _3dPopup.velocityY *= 0.94;
    _3dPopup.velocityX *= 0.94;
    _apply3DCamera();
    if (Math.abs(_3dPopup.velocityX) > 0.05 || Math.abs(_3dPopup.velocityY) > 0.05) {
      _3dPopup.rafHandle = requestAnimationFrame(tick);
    } else {
      _3dPopup.rafHandle = null;
    }
  }
  _3dPopup.rafHandle = requestAnimationFrame(tick);
}
```

Decay factor `0.94` gives ~1.2-second tail. Curves feel weighted, not floaty.

### §6.3 Scroll zoom

```
wheel event on .tb3-3d-popup-viewport
  → preventDefault
  → camera.zoom *= (1 − event.deltaY × 0.001)
  → clamp(camera.zoom, 0.5, 2.0)
  → _apply3DCamera()
```

Center-anchored (zoom toward scene center). No momentum on zoom — feels direct.

### §6.4 Double-click reset

Dbl-click on viewport → camera tweens back to initial state (rotX:52, rotY:-18, zoom:1) over 320ms with `cubic-bezier(.16, 1, .3, 1)` (matches open animation). Subtle affordance, not a button.

### §6.5 Keyboard nav

When viewport has focus:
- `ArrowLeft` / `ArrowRight` — rotateY ± 5° per press
- `ArrowUp` / `ArrowDown` — rotateX ∓ 5° per press (clamped)
- `+` / `=` — zoom in 10%
- `-` / `_` — zoom out 10%
- `R` — reset camera
- `Esc` — close modal

### §6.6 Constraints

- `rotX ∈ [15°, 75°]` (no flip)
- `rotY` unconstrained (full 360° spin)
- `zoom ∈ [0.5, 2.0]`

### §6.7 Cursors

- Idle: `cursor: grab`
- Dragging: `cursor: grabbing`
- Over chrome (close button, title): `cursor: pointer` / `default`

---

## §7 Close behaviors and accessibility

### §7.1 Three close paths

| Trigger | Behavior |
|---|---|
| `Esc` keypress (document-level, while popup open) | Close immediately |
| Click on `.tb3-3d-popup-backdrop` (event.target check) | Close immediately |
| Click X button (`#tb3-3d-popup-close-btn`) | Close immediately |

### §7.2 Close teardown sequence

1. Reverse-tween: `opacity → 0`, `scale → 0.92` over 220ms, `cubic-bezier(.4, 0, 1, 1)` (ease-in)
2. After tween, remove modal DOM from body
3. Detach all event listeners (mousedown / mousemove / mouseup / wheel / keydown / blur)
4. Cancel in-flight momentum rAF
5. Restore `document.body.style.overflow`
6. Restore focus to the 3D modebar pill (round-trip to trigger)

### §7.3 Focus management

- On open: focus moves to the X button (so keyboard users can immediately Esc OR Tab through)
- Focus trap: Tab cycles X button → viewport → X button (no escape into the background page)
- On close: focus restores to the 3D modebar pill

### §7.4 Screen reader semantics

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="tb3-3d-popup-title"`
- Title: `<h2 id="tb3-3d-popup-title">3D view of topology</h2>`
- Viewport: `role="img"` with descriptive `aria-label` carrying device + cable counts and keyboard instructions
- X button: `aria-label="Close 3D view"`
- The 3D scene rotation has no semantic meaning for SR users — they get the count + instructions via aria-label and don't try to navigate the rotated DOM

### §7.5 Reduced-motion fallback

`@media (prefers-reduced-motion: reduce)`:
- Open/close animations skipped (instant appear/disappear)
- Momentum decay disabled (release stops camera dead)
- Double-click reset is instant (no tween)
- Scroll zoom has `transition: none` (no smoothing)

### §7.6 Body scroll lock

On open: `document.body.style.overflow = 'hidden'`. On close: restore to previous value. Prevents background page scroll while user drags inside the modal.

---

## §8 Stop-slop copy locks

Phase 7 v2 introduces minimal new user-facing copy. Locked templates (validated via stop-slop at Stage 8):

| Surface | Locked copy |
|---|---|
| Modal title | `3D view of topology` |
| Counts label | `{N} devices · {M} cables` (middle dot, not bullet or hyphen) |
| Empty state | `Add devices to the canvas to see them in 3D.` |
| X button aria-label | `Close 3D view` |
| Viewport aria-label (template) | `3D rendering of {N} devices and {M} cables. Use arrow keys to rotate, plus or minus to zoom, R to reset, Escape to close.` |
| 3D pill tooltip | `3D view` (unchanged from Phase 1) |

stop-slop guards against any other copy strings appearing in Phase 7 v2 changes.

---

## §9 Stage breakdown (preview — full plan via writing-plans)

Approximately **9 stages**. Sonnet default; **Opus** for the motion + interaction cluster (Stages 4, 5).

| Stage | Goal | Subagent | Skills invoked |
|---|---|---|---|
| 0 | CSS rev bump `r11 → r12` + branch hygiene + verify clean main (no v6.4.0 residue) | Sonnet | — |
| 1 | `_3dPopup` state object + `_open3DPopup` / `_close3DPopup` lifecycle + modebar pill wiring + body scroll lock | Sonnet | — |
| 2 | Modal DOM + scoped CSS — modal chrome, header, X button, backdrop, viewport, perspective host | Sonnet | — |
| 3 | `_render3DScene` — devices as extruded cards (5-face) with icon+label on top + Stripe-style gradient/shadow material | Sonnet | **ui-ux-pro-max** |
| 4 | `_render3DScene` — cables as bezier ribbons + floor plane with vignette + ambient lighting simulation | **Opus** | **ui-ux-pro-max** |
| 5 | Interaction — drag rotate (X+Y), scroll zoom, momentum decay, double-click reset + open/close tween animations | **Opus** | **emil-design-eng** |
| 6 | Live sync hook into existing canvas render path + keyboard nav (arrows, +/-, R) | Sonnet | — |
| 7 | Reduced-motion fallback + full accessibility pass (focus trap, aria, screen-reader semantics) | Sonnet | — |
| 8 | UAT structural guards + Playwright tests 54-58 + founder dogfood HTML + ship (v6.4.0 retry + CLAUDE.md row) | Sonnet | **stop-slop** |

---

## §10 Test surface

### §10.1 UAT structural guards (~+15 P7 guards; target 6753 → ~6768)

- State: `_3dPopup` module-scope object with all fields (`open`, `camera`, `dragState`, `velocityX/Y`, `rafHandle`)
- Lifecycle: `_open3DPopup` + `_close3DPopup` defined; opening sets `_3dPopup.open = true`; closing tears down DOM + restores body overflow
- Render: `_render3DScene` defined; reads `state.devices` + `state.cables`; emits `.tb3-3d-dev` + `.tb3-3d-cable` DOM
- Camera: `_apply3DCamera` writes `transform` to `.tb3-3d-popup-stage`; rotX clamped [15, 75]; zoom clamped [0.5, 2.0]
- Live sync: existing canvas render fn has a tail call to `_render3DScene` gated on `_3dPopup.open`
- Modebar: clicking 3D pill calls `_open3DPopup` (not the reverted `_open3D`); pill click does NOT mutate `state.mode`
- Reduced-motion: `@media (prefers-reduced-motion)` zeros open animation, kills momentum, disables zoom transition
- A11y: modal has `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; X button has `aria-label`; focus trap implemented
- Stop-slop: locked copy templates present verbatim (modal title, empty state, button label)

### §10.2 Playwright DOM tests (~+5 chromium; target 161 → ~166)

| # | Test |
|---|---|
| 54 | 3D pill click opens modal with `role="dialog"` + `aria-modal="true"`; X button is focused |
| 55 | Drag on viewport changes the `transform` attribute on `.tb3-3d-popup-stage` |
| 56 | Esc closes modal cleanly — no lingering DOM, body.style.overflow restored |
| 57 | Live sync — add a device while popup open → `.tb3-3d-popup-stage` gains a new `.tb3-3d-dev` element |
| 58 | Reduced-motion (browser context) — open animation skipped, momentum disabled |

### §10.3 Founder dogfood smoke (8-step, ships in `dogfood/tb-v3-phase7-popup.html`)

1. Click 3D pill on empty canvas → modal opens, empty-state label visible
2. Close, add devices, click 3D pill → devices appear as extruded cards
3. Drag on viewport → scene rotates (X+Y), release → momentum decays smoothly
4. Scroll wheel → zoom in/out, clamped at limits
5. Double-click viewport → camera resets to initial angle
6. Add a device on canvas while popup open → 3D scene gains a card in real time
7. Press Esc → modal closes cleanly, focus returns to 3D pill
8. Toggle reduced-motion → reopen → no entry animation, no momentum

---

## §11 Known limitations

- **No mobile/touch support** — inherits TB v3's existing desktop-only viewport gate. Touch users see the existing `#tb-mobile-nudge` page.
- **Center-anchored zoom** — scroll wheel zooms toward scene center, not cursor position. Cursor-anchored zoom is a future enhancement (would require adding `offsetX/Y` to camera state).
- **No persistent camera state** — closing + reopening the popup resets the camera. Camera angle is not saved across sessions.
- **No theme darkness mode** — the cream/bronze palette is fixed. If TB v3 ever adds a dark mode, Phase 7 v2 CSS needs to gain a dark variant.
- **No reflection / glass on floor** — the floor is a simple gradient, not a reflective plane. Could be added later via a duplicated, vertically-flipped stage layer with opacity blending.
- **No texture maps** — devices are colored gradient cards, not textured. The Stripe/Vercel vibe doesn't usually need textures, but if richer materiality is wanted, SVG patterns could be applied to faces.

---

## §12 Phase 8+ implications

- **Phase 8 (Coach mode)** can reference the 3D view as a teaching surface — e.g., a Coach tip could trigger the 3D popup with a specific camera angle highlighting the device under discussion. The `_open3DPopup(initialCameraOverride?)` signature can grow to accept a target camera.
- **Phase 10 (Replay mode)** if pursued, could leverage the popup's render mirror as a deterministic snapshot surface — the camera state is serializable, the render path is deterministic.
- **Future enhancement: cursor-anchored zoom** — add `offsetX/Y` to `_3dPopup.camera`, transform calculus on wheel event.
- **Future enhancement: snapshot to PNG** — `html2canvas` on `.tb3-3d-popup-stage` could export the 3D view as a static image for sharing.

---

## §13 Skills locked for execution

- **Superpowers** drives the brainstorm → spec → plan → execute → ship loop.
- **ui-ux-pro-max** routes the device-card material treatment (Stages 3, 4) — palette validation, shadow depth tuning, Stripe/Vercel pattern reference.
- **emil-design-eng** drives motion choreography (Stage 5) — entry/exit easing, drag inertia decay curves, momentum settling.
- **stop-slop** validates the locked copy templates (Stage 8) — modal title, empty state, aria labels.

---

## §14 What changes vs Phase 7 v1 (reverted)

Phase 7 v1 (v6.4.0, reverted at `c114b7f`) was a **mode-style integration** with trace + OSI cascade rendering inside standing devices, a peer-mode lifecycle, cross-rail mutex extension to 6 panels, triple-timer cancel discipline, failure UX (glow + layer pulse + trapped packet), and a floating control strip. ~+1050 LOC across two files. Overbuilt vs the actual ask.

Phase 7 v2 (this spec) is **a transient popup** — no mode, no trace, no OSI, no failure UX, no cross-rail mutex, no floating strip. ~+580 LOC across two files. Matches the actual ask: "a 3D popup of whatever topology is in the canvas. That's it."

Pieces of v1 that COULD be mined:
- Scene-level CSS 3D transforms (`perspective`, `rotateX(50deg)`, `preserve-3d` chain) — pattern reusable, exact selectors will differ since v2 uses `.tb3-3d-popup-stage` instead of `.tb3-canvas-svg`
- `_renderOSIStack` extraction refactor (Stage 1 of v1) — NOT applicable to v2; popup doesn't render OSI rows
- Mock MAC / per-hop role / failure layer mapping logic — NOT applicable to v2

Pieces that MUST NOT be mined:
- Trace state extensions / `osiAnimHandle` / `packetTimerId` — v2 owns its own `_3dPopup.rafHandle` for momentum
- Cross-rail mutex extensions — v2 popup is not a mode/panel; no mutex
- Modebar 3D pill "locked: false" flip — already in main after revert (revert undid it; v2 must re-flip)

Wait — actually, the revert undid the pill unlock too. Phase 7 v2 Stage 1 needs to re-unlock the 3D pill in the modebar `modes` array (set `locked: false`).

---

## Self-review checklist

- [x] All "TBD" placeholders resolved
- [x] No section contradicts another (architecture matches feature descriptions; interaction matches camera state shape)
- [x] Scope is single-implementation-plan-sized (~9 stages, much smaller than v1's 17)
- [x] Ambiguities made explicit (modal NOT mode, render-copy NOT transform-existing, center-anchored zoom NOT cursor-anchored)
- [x] Non-goals enumerated (§2) — guards against scope creep, especially against repeating Phase 7 v1's mistakes
- [x] Backward-compatibility called out (§14 — what changes vs v1)
- [x] Test surface concrete (~+15 UAT + 5 Playwright + 8-step dogfood)
- [x] Stage breakdown maps to skill assignments (Sonnet vs Opus, plus ui-ux-pro-max / emil-design-eng / stop-slop)
- [x] Phase 8+ implications documented (§12)
- [x] Skills locked for execution (§13)
- [x] What-NOT-to-mine from v1 documented (§14)
- [x] Pill re-unlock noted (revert undid it; v2 Stage 1 must re-do it)
