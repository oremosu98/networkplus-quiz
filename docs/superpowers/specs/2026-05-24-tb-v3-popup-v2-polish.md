# TB v3 Phase 7 v2 — Polish pass design

**Status:** Locked design, mockup-approved, ready for plan
**Date:** 2026-05-24
**Prior phase shipped:** v6.4.1 (3D popup visible — z-index hotfix)
**Mockup approved:** `mockups/tb-v3-phase7-3d-popup-v2.html`

---

## §1 Goal

v6.4.0 + v6.4.1 ship a working 3D popup but the devices render as generic bronze rectangles with no labels and the topology clusters in the bottom-right corner. This polish pass turns the popup into the "great to watch + visually appealing" surface the user actually asked for:

- Each device type renders as a recognizable 3D illustration (router with antennae, switch with port LEDs, game console with controller, server with rack units, etc.)
- Device labels (hostname + IP) float visibly below each device
- Cables remain bezier ribbons but get **ambient packet motion** — small bronze dots continuously travel along every cable, emil-tuned for natural pacing
- Topology auto-centers (centroid offset) so devices stay framed regardless of canvas coordinates
- Floor grid + color-coded family accents + cable labels + Fit-to-view button + device legend chip

Visual character stays Stripe/Vercel stylized 3D — no Three.js, no WebGL, no PNG assets. Pure CSS 3D + SVG.

---

## §2 Non-goals

- **No trace integration** — packet motion is ambient (decorative), NOT tied to Trace mode. The v1 trace integration is permanently out (was the reverted overbuild).
- **No Three.js / WebGL / PNG illustrations** — every device illustration is CSS + inline SVG within the existing scoped CSS block.
- **No new modal/mode** — popup remains a transient lightbox triggered by the 3D pill.
- **No mobile/touch support** — inherits TB v3's existing desktop-only viewport gate.
- **No backward-incompatible changes** — `_open3DPopup` / `_close3DPopup` signatures unchanged, render-copy architecture unchanged, live sync hook in `_renderCanvas` unchanged.

---

## §3 Locked decisions (from mockup + Q&A)

1. **Per-device illustrations** for all device types defined in `TB_V3_DEVICE_TYPES` — Router, L3 Router, Switch, L3 Switch, Hub, Workstation, Laptop, Server, Smartphone, Smart TV, Game Console, Access Point, Wireless Controller, Firewall, IDS/IPS, VPN, Cloud, Internet.
2. **Device labels** — `<div>` below each device showing `{hostname}` in Fraunces serif + `{ip}` in mono. Counter-rotated to stay readable as scene rotates.
3. **Ambient packet motion** — small bronze dots travel along each cable's bezier path, continuous loop, staggered offsets so multiple packets per cable. emil-tuned easing + duration.
4. **Centroid offset** — `_render3DScene` computes the device centroid, every device + cable endpoint translates by `-centroid` so the topology centers around the stage origin (which sits at viewport-50/50).
5. **Floor grid** — CSS grid pattern with radial mask fading away from center.
6. **Color-coded family accents** — small accent stripe on each device's base. Families: network (warm bronze), endpoint (warm grey), security (red-bronze), cloud (blue-bronze).
7. **Fit-to-view button** — header button that auto-computes camera angle + zoom to frame all devices.
8. **Reset button** — header button that tweens camera to default angle (currently triggered by dbl-click; promote to button as well).
9. **Device legend chip** — small floating chip in bottom-right of viewport showing family color coding.
10. **Hover state** — device lifts slightly (translateZ extra) + shows tooltip with IP/MAC/port count.
11. **Cable labels** — appear on cable hover only (not always-on; reduces clutter). Show port name + link type.
12. **Improved initial camera** — lower tilt (`rotateX(42deg)` instead of 52) + slightly tighter initial zoom (1.1×) to make devices feel larger.

---

## §4 Architecture (additive to v6.4.1)

### §4.1 No state schema changes

`_3dPopup` module-scope state stays as-is (open, camera, dragState, velocityX/Y, rafHandle). Polish doesn't change the popup lifecycle or interaction model.

### §4.2 New helpers

```javascript
_TB_V3_DEVICE_FAMILY      // map: device type id → family ('network' | 'endpoint' | 'security' | 'cloud')
_TB_V3_DEVICE_3D_ILLUSTRATIONS   // map: device type id → HTML string fragment for the illustration body
_computeSceneCentroid(devices)   // returns {cx, cy} = mean of all device.x, device.y
_fitCameraToDevices(devices)     // computes optimal rotX/rotY/zoom to frame all devices; tweens camera there
_buildAmbientPacketEl(cable)     // returns SVG <g> with packet circle + animateMotion along cable path
_buildCableLabel(cable, fromDev, toDev)  // returns DOM for the hover-only label
```

### §4.3 `_build3DDeviceEl` rewrite

Replace the current 5-face cube with per-type illustration dispatch:

```javascript
function _build3DDeviceEl(dev, sceneCx, sceneCy) {
  var family = _TB_V3_DEVICE_FAMILY[dev.type] || 'network';
  var illustration = _TB_V3_DEVICE_3D_ILLUSTRATIONS[dev.type] || _TB_V3_DEVICE_3D_ILLUSTRATIONS['_default'];
  
  var el = document.createElement('div');
  el.className = 'tb3-3d-dev';
  el.setAttribute('data-device-id', _escAttr(dev.id));
  el.setAttribute('data-family', family);
  
  // Centroid-relative position
  var x = (dev.x || 0) - sceneCx;
  var y = (dev.y || 0) - sceneCy;
  el.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
  
  el.innerHTML =
    '<div class="tb3-3d-dev-base"></div>' +
    '<div class="tb3-3d-dev-body">' + illustration + '<div class="tb3-3d-dev-accent-stripe"></div></div>' +
    '<div class="tb3-3d-dev-label">' +
      '<span class="tb3-3d-dev-name">' + _escAttr(dev.label || dev.hostname || dev.type) + '</span>' +
      (dev.config && dev.config.ip ? '<span class="tb3-3d-dev-ip">' + _escAttr(dev.config.ip) + '</span>' : '') +
    '</div>';
  return el;
}
```

### §4.4 `_TB_V3_DEVICE_FAMILY` map

```javascript
var _TB_V3_DEVICE_FAMILY = {
  'router': 'network',
  'l3-router': 'network',
  'switch': 'network',
  'l3-switch': 'network',
  'hub': 'network',
  'access-point': 'network',
  'wireless-controller': 'network',
  'workstation': 'endpoint',
  'laptop': 'endpoint',
  'server': 'endpoint',
  'smartphone': 'endpoint',
  'smart-tv': 'endpoint',
  'game-console': 'endpoint',
  'firewall': 'security',
  'ids-ips': 'security',
  'vpn': 'security',
  'cloud': 'cloud',
  'internet': 'cloud'
};
```

### §4.5 `_TB_V3_DEVICE_3D_ILLUSTRATIONS` map

Each entry is a static HTML string (no template variables — illustration is type-specific, not device-instance-specific). All scoped under classes like `.dev-illust-router`, `.dev-illust-switch`, etc.

Patterns per family:

- **Network gear** — bronze-toned body with feature accents (antennae, port LEDs, ventilation grilles, status indicators)
- **Endpoints** — darker greys with form-factor cues (monitor + tower, laptop hinge, server rack chassis, controller, phone outline)
- **Security** — bronze-red body with security cues (firewall brick, IDS eye, VPN tunnel)
- **Cloud/Internet** — softer organic shapes (cloud bumps, globe orb)

Full illustration HTML lives in `features/topology-builder-v3.js` as a single map literal (~600 LOC of HTML strings). Full CSS for each illustration variant lives in `features/topology-builder-v3.css` Phase 7 v2.1 §3 block.

### §4.6 Centroid offset in `_render3DScene`

```javascript
function _render3DScene() {
  // ... existing stage lookup + clearing ...
  
  var centroid = _computeSceneCentroid(state.devices);
  
  for (var d = 0; d < state.devices.length; d++) {
    stage.appendChild(_build3DDeviceEl(state.devices[d], centroid.cx, centroid.cy));
  }
  for (var c = 0; c < state.cables.length; c++) {
    var cab = state.cables[c];
    var fromDev = _findDeviceById(cab.fromId);
    var toDev = _findDeviceById(cab.toId);
    if (!fromDev || !toDev) continue;
    stage.appendChild(_build3DCableEl(cab, fromDev, toDev, centroid.cx, centroid.cy));
    stage.appendChild(_buildAmbientPacketEl(cab, fromDev, toDev, centroid.cx, centroid.cy));
  }
  
  // ... existing empty state + counts update ...
}
```

### §4.7 Ambient packet motion

Per cable, one SVG `<g>` containing a small circle that animates along the cable's bezier path via `<animateMotion>`. emil-tuned for natural pacing:

- **Packet visual**: 4px diameter bronze circle (`fill: var(--tb3-bronze)`) with subtle drop-shadow for glow
- **Path**: same bezier path as the cable (reuses the path's `d` attribute via `<mpath>` reference)
- **Duration**: 3.2s per full traversal (slow enough to track, fast enough to feel alive)
- **Easing**: SVG `keyTimes` + `keySplines` for ease-in-out cubic (`0.42 0 0.58 1`)
- **Direction**: forward only (start → end). Cables don't show "return" packets — that would imply a specific flow direction the network model doesn't have
- **Staggering**: 3 packets per cable, offset by 1.07s each, creates the appearance of continuous flow
- **Reduced-motion**: ambient packets removed entirely (no animation, no static dots) under `@media (prefers-reduced-motion: reduce)`

### §4.8 Cable labels (hover-only)

CSS-only hover treatment. Cable labels exist as DOM siblings of the SVG (hidden by default, fade in on cable hover):

```css
.tb3-3d-cable-label { opacity: 0; transition: opacity 180ms; pointer-events: none; }
.tb3-3d-cable:hover ~ .tb3-3d-cable-label[data-for=cableId] { opacity: 1; }
```

Hover detection via SVG `:hover` on the cable group. Label content: `{fromPort} → {toPort} · {linkType}` (e.g., "eth0 → eth1 · Gig").

### §4.9 Fit-to-view + Reset buttons

Add two buttons to popup header (before X button):

```html
<button class="tb3-3d-popup-tool-btn" id="tb3-3d-popup-fit" title="Fit to view">
  <svg viewBox="0 0 16 16" ...>...</svg> Fit to view
</button>
<button class="tb3-3d-popup-tool-btn" id="tb3-3d-popup-reset" title="Reset camera">
  <svg viewBox="0 0 16 16" ...>...</svg> Reset
</button>
```

Fit-to-view algorithm: compute device bounding box (in centroid-relative coords), then compute zoom needed to fit that box within the viewport at the current rotX/rotY. Tween over 400ms.

Reset: same as existing double-click handler — tween to initial (`rotX:42, rotY:-18, zoom:1.1`).

### §4.10 Device legend chip

Small floating element in viewport bottom-right. Shows family color dots + labels. Collapsible (clicking the title row collapses to just the title). State stored in `_3dPopup.legendCollapsed` (boolean).

### §4.11 Hover state

`.tb3-3d-dev:hover` CSS rule: `transform: translateZ(8px)` (extra lift). Plus dynamically positioned tooltip showing IP/MAC/port count near the device. Tooltip implemented as a single DOM element that repositions based on the hovered device's bounding box.

### §4.12 Improved initial camera

Change `_3dPopup.camera` defaults:
- `rotX: 52` → `rotX: 42` (lower tilt, less extreme)
- `rotY: -18` → `rotY: -18` (unchanged)
- `zoom: 1` → `zoom: 1.1` (tighter)

Reset button + double-click + R key all tween back to these new defaults.

---

## §5 Test surface

### §5.1 UAT structural guards (~+10 net new P7v2-polish guards; brings 6779 → ~6789)

- `_TB_V3_DEVICE_FAMILY` map defined with at least 18 entries
- `_TB_V3_DEVICE_3D_ILLUSTRATIONS` map defined with entries for all device types
- `_computeSceneCentroid` defined; returns `{cx, cy}`
- `_build3DDeviceEl` accepts `sceneCx, sceneCy` params; subtracts from `dev.x, dev.y` in transform
- `_buildAmbientPacketEl` defined; emits SVG animateMotion
- `_fitCameraToDevices` defined; tweens via rafHandle
- Initial camera defaults: rotX:42, rotY:-18, zoom:1.1
- Fit-to-view + Reset buttons present in `_open3DPopup` modal HTML
- Reduced-motion CSS: ambient packets removed (`@media ... .tb3-3d-ambient-packet { display: none }`)
- Cable label CSS exists with hover-driven opacity

### §5.2 Playwright tests (~+3 chromium; brings ~166 → ~169)

| # | Test |
|---|---|
| 59 | After Fit-to-view click, camera transform changes |
| 60 | Adding 5+ devices in various positions → all visible (centroid offset works; no off-screen) |
| 61 | Ambient packet SVG elements exist for each cable; reduced-motion context removes them |

### §5.3 Founder dogfood update

Update `dogfood/tb-v3-phase7-popup.html` step list to cover the new affordances: device illustrations recognizable, labels visible, packets flowing, Fit-to-view works, legend chip visible.

---

## §6 Stop-slop copy locks

New copy in this iteration:

| Surface | Locked copy |
|---|---|
| Fit-to-view button | `Fit to view` |
| Reset button | `Reset` |
| Legend title | `Device families` |
| Legend rows (4) | `Network gear` / `Endpoints` / `Security` / `Cloud / Internet` |
| Device label format | `{label or hostname or type}` + `{ip}` if present |
| Cable label format | `{fromPort} → {toPort} · {linkType}` |

stop-slop guards no other copy slips in.

---

## §7 Stage breakdown (preview)

Approximately **8 stages**. Sonnet default; Opus for the device illustrations cluster + packet motion (Stages 2, 5).

| Stage | Goal | Subagent | Skills |
|---|---|---|---|
| 0 | TB3_CSS_REV r13 → r14 + branch hygiene | Sonnet | — |
| 1 | `_TB_V3_DEVICE_FAMILY` map + color-family accent CSS + `data-family` attr in `_build3DDeviceEl` | Sonnet | — |
| 2 | `_TB_V3_DEVICE_3D_ILLUSTRATIONS` map for all 18 device types + scoped CSS for each variant | **Opus** | **ui-ux-pro-max** |
| 3 | Device labels (hostname + IP) below each device + counter-rotation CSS | Sonnet | — |
| 4 | `_computeSceneCentroid` + `_build3DDeviceEl` / `_build3DCableEl` centroid-offset signature changes | Sonnet | — |
| 5 | `_buildAmbientPacketEl` + SVG animateMotion + reduced-motion gate | **Opus** | **emil-design-eng** |
| 6 | Floor grid CSS + improved initial camera + Fit-to-view + Reset buttons + legend chip + hover state | Sonnet | — |
| 7 | UAT structural guards + Playwright tests 59-61 + founder dogfood update + ship v6.4.2 + CLAUDE.md row | Sonnet | **stop-slop** |

---

## §8 Implementation notes

### §8.1 Performance budget

- Per-device illustration is ~10-20 DOM nodes (5 faces + extras like antennae, LEDs, ports). 20 devices = ~300-400 DOM nodes.
- Per-cable ambient packet is 1 SVG `<g>` with `<circle>` + `<animateMotion>` × 3 staggered. 20 cables = 60 animations.
- CSS 3D transforms are GPU-composited. Should stay 60fps on modern hardware.
- If performance regresses below 30fps in real-world scenes: reduce per-device DOM count, reduce packet density, or cap at N devices.

### §8.2 Reusable substrate

Per-device illustrations follow a uniform recipe:
- Outer `.dev` element (preserve-3d, positioned absolute, drop-shadow)
- `.dev-base` (the plinth — rotated horizontal plane, gradient)
- `.dev-body` (preserve-3d, holds the illustration)
- `.dev-illust-{type}` (type-specific markup — body shell, antennae, ports, etc.)
- `.dev-accent-stripe` (color-coded family stripe)
- `.dev-label` (counter-rotated label below)

This recipe is consistent across all device types — only the `.dev-illust-{type}` inner markup varies.

### §8.3 Cable visibility

Cables in v6.4.1 are bezier ribbons with a 3-stop gradient. v6.4.2 adds:
- Slightly thicker stroke (3px → 3.5px)
- Drop-shadow strengthened (4px 6px → 5px 8px) for ground-truth feel
- Pulse-style stroke-dasharray animation (subtle, separate from the ambient packets)

### §8.4 Camera tween for Fit-to-view

Bounding box of devices in centroid-relative coords. Largest device extent in X or Y determines zoom needed. Tween over 400ms with `cubic-bezier(.16, 1, .3, 1)` (matches existing entry/reset ease).

---

## §9 Known limitations

- **Per-device-instance customization**: illustrations are type-based, not instance-based. Two routers look identical. If user names them differently, only the label differs.
- **No animation per device type**: routers don't blink, switches don't flash port LEDs sequentially. Could add later but adds CPU cost.
- **Cable labels only on hover**: not always-visible (would be too cluttered for dense topologies). User has to hover to inspect.
- **Legend is collapsible but not movable**: anchored to bottom-right. Future enhancement could allow drag-positioning.

---

## §10 Skills locked for execution

- **Superpowers** drives the spec → plan → execute → ship loop.
- **ui-ux-pro-max** routes the per-device illustration material treatment (Stage 2) — palette validation, illustration recognizability, family color cohesion.
- **emil-design-eng** drives the ambient packet motion choreography (Stage 5) — easing, duration, staggering, density.
- **stop-slop** validates locked copy (Stage 7).

---

## Self-review checklist

- [x] All "TBD" placeholders resolved
- [x] No contradictions
- [x] Scope contained — 8 stages, additive to v6.4.1, no new modules
- [x] Ambiguities explicit (ambient packets only NOT trace; centroid-relative positioning; reduced-motion gate)
- [x] Non-goals enumerated (§2) — guards against scope creep
- [x] All 18 device types accounted for in §3.1 + §4.4 + §4.5
- [x] emil-design-eng + ui-ux-pro-max + stop-slop pinned to specific stages
- [x] Test surface concrete
