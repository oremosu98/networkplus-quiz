# TB v3 Phase 7 v2 — Polish pass Implementation Plan (v6.4.3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the v6.4.1/v6.4.2 3D popup into the "great to watch + visually appealing" surface the user asked for — per-device 3D illustrations matching the real device type, hostname + IP labels under each device, ambient packet motion along cables, auto-centered scene, floor grid, color-coded family accents, Fit-to-view button, legend chip, improved camera.

**Architecture:** Additive to v6.4.2 `features/topology-builder-v3.js` IIFE. New helpers (`_TB_V3_DEVICE_FAMILY`, `_TB_V3_DEVICE_3D_ILLUSTRATIONS`, `_computeSceneCentroid`, `_fitCameraToDevices`, `_buildAmbientPacketEl`, `_buildCableLabel`). Replace flat `_build3DDeviceEl` body with per-type illustration dispatch. Single explicit `_renderCanvas` tail-call hook unchanged. CSS 3D transforms only — no Three.js / WebGL / PNG assets.

**Tech Stack:** Vanilla JS IIFE in `features/topology-builder-v3.js`, inline SVG illustrations per device type, scoped CSS in `features/topology-builder-v3.css`, SVG `<animateMotion>` for ambient packets, requestAnimationFrame for camera tween + centroid auto-fit, `@media (prefers-reduced-motion)` gate, Node UAT suite, Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-05-24-tb-v3-popup-v2-polish.md` (note: spec was written when 21 devices existed; v6.4.2 V1-parity added 16 more — full 37-device set is the authoritative target).

**Branch:** `feat/tb-v3-popup-v2-polish` (rebased onto post-v6.4.2 main; spec doc at SHA `47d7046`)

**Cumulative test targets at end of phase:** UAT 6794 → ~6810 (+~16). Playwright 169 → ~172 (+3).

**Subagent model defaults:** Sonnet unless explicitly Opus. **Opus for Stage 2 batches** (illustration density × design judgment) and **Stage 5** (motion engine — emil-tuned ambient packets).

**Skills invoked:** Stage 2 batches use **ui-ux-pro-max** for material/shape recommendations. Stage 5 uses **emil-design-eng** for motion choreography. Stage 8 uses **stop-slop** for locked copy validation.

---

## Full 37-device authoritative list (post-v6.4.2)

| Family | Types |
|---|---|
| **network** | router, l3-router, isp-router, switch, l3-switch, dmz-switch, hub, bridge, onprem-dc, mpls-core |
| **endpoint** | pc, laptop, server, smartphone, smart-tv, game-console, printer, voip, iot, dns-server |
| **wireless** | wap, wlc |
| **security** | firewall, ids, vpg, sase-edge |
| **cloud** | cloud, internet, load-balancer, public-web, public-file, public-cloud, vpc, cloud-subnet, igw, nat-gw, tgw |

37 total. Family assignment per the spec §3.1.

---

## File structure

- Modify: `features/topology-builder-v3.js` — ~+700 LOC JS:
  - `_TB_V3_DEVICE_FAMILY` map
  - `_TB_V3_DEVICE_3D_ILLUSTRATIONS` map (37 entries × ~30-50 LOC each = ~1100 LOC of HTML strings — kept compact via shared templates where possible)
  - `_computeSceneCentroid` helper
  - `_build3DDeviceEl` rewrite with sceneCx/sceneCy params + family + illustration dispatch + label
  - `_build3DCableEl` centroid-offset signature update
  - `_buildAmbientPacketEl` helper
  - `_buildCableLabel` helper
  - `_fitCameraToDevices` + button handler
  - `_3dPopup.camera` default tweaks (rotX 52→42, zoom 1→1.1)
  - Legend chip DOM in `_open3DPopup`
- Modify: `features/topology-builder-v3.css` — ~+800 LOC:
  - Phase 7 v2.1 §1: family accent CSS (4 colors)
  - Phase 7 v2.1 §2: per-illustration CSS (37 variants, body shell + per-type details)
  - Phase 7 v2.1 §3: floor grid + ambient packet visuals + cable labels + legend chip
  - Phase 7 v2.1 §4: hover state lift + tooltip
  - Phase 7 v2.1 §5: reduced-motion expanded
- Modify: `tests/uat.js` — ~+18 UAT structural guards
- Modify: `tests/e2e/app.spec.js` — ~+3 Playwright tests (62-64)

---

## Stage 0: CSS rev bump r14 → r15 + branch hygiene

**Subagent model:** Sonnet

**Goal:** Bump rev so users get fresh CSS after polish ships. Verify branch state.

### Task 0.1: bump TB3_CSS_REV r14 → r15

- [ ] **Step 1:** Verify branch + state:

```bash
cd '/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz'
git branch --show-current
git status --short
```

Expected: branch `feat/tb-v3-popup-v2-polish`. Untracked unrelated files only.

- [ ] **Step 2:** Bump in `features/topology-builder-v3.js`:

```javascript
// BEFORE (line ~110)
  var TB3_CSS_REV = 'r14'; // r14: V1 parity — new device icons + ports + scenarios + title-case

// AFTER
  var TB3_CSS_REV = 'r15'; // r15: Polish pass — per-device 3D illustrations + labels + centroid + ambient packets
```

- [ ] **Step 3:** UAT baseline:

```bash
node tests/uat.js 2>&1 | tail -3
```
Expected: `UAT: 6794/6794 ALL PASS ✓`

- [ ] **Step 4:** Commit:

```bash
git add features/topology-builder-v3.js
git commit -m "$(cat <<'EOF'
chore(tb-v3-popup-polish): bump TB3_CSS_REV r14 → r15 (Stage 0)

Cache-bust so users get fresh CSS after the polish pass ships
(per-device 3D illustrations + labels + ambient packets +
centroid + floor grid + new UI affordances).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Stage 1: `_TB_V3_DEVICE_FAMILY` map + color-family accent CSS

**Subagent model:** Sonnet

**Goal:** Define the family classification map (network / endpoint / wireless / security / cloud) for all 37 device types. Add `data-family` attribute to `_build3DDeviceEl` output. Add scoped CSS for the family accent stripe (small color-coded bar on each device's base).

### Task 1.1: add family map

- [ ] **Step 1:** Find a good location (near `TB_V3_DEVICE_TYPES`). Add:

```javascript
  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 7 v2 Polish (v6.4.3): device family map.
  // Used by the 3D popup to apply color-coded family accents per device.
  // ═══════════════════════════════════════════════════════════════════════════
  var _TB_V3_DEVICE_FAMILY = {
    // network
    'router': 'network', 'l3-router': 'network', 'isp-router': 'network',
    'switch': 'network', 'l3-switch': 'network', 'dmz-switch': 'network',
    'hub': 'network', 'bridge': 'network', 'onprem-dc': 'network',
    'mpls-core': 'network',
    // endpoint
    'pc': 'endpoint', 'laptop': 'endpoint', 'server': 'endpoint',
    'smartphone': 'endpoint', 'smart-tv': 'endpoint', 'game-console': 'endpoint',
    'printer': 'endpoint', 'voip': 'endpoint', 'iot': 'endpoint',
    'dns-server': 'endpoint',
    // wireless
    'wap': 'wireless', 'wlc': 'wireless',
    // security
    'firewall': 'security', 'ids': 'security', 'vpg': 'security',
    'sase-edge': 'security',
    // cloud
    'cloud': 'cloud', 'internet': 'cloud', 'load-balancer': 'cloud',
    'public-web': 'cloud', 'public-file': 'cloud', 'public-cloud': 'cloud',
    'vpc': 'cloud', 'cloud-subnet': 'cloud',
    'igw': 'cloud', 'nat-gw': 'cloud', 'tgw': 'cloud'
  };
```

### Task 1.2: extend `_build3DDeviceEl` with `data-family`

- [ ] **Step 1:** Find `_build3DDeviceEl`. Add `data-family` attribute after `data-device-id`:

```javascript
  function _build3DDeviceEl(dev) {
    // ... existing iconHtml + label setup ...
    var family = _TB_V3_DEVICE_FAMILY[dev.type] || 'network';

    var el = document.createElement('div');
    el.className = 'tb3-3d-dev';
    el.setAttribute('data-device-id', _escAttr(dev.id));
    el.setAttribute('data-family', family);   // NEW Stage 1
    // ... rest unchanged ...
  }
```

### Task 1.3: append scoped CSS for family accents

- [ ] **Step 1:** Append to `features/topology-builder-v3.css` after the existing Phase 7 v2 §7 block (the reduced-motion block):

```css

/* ═══════════════════════════════════════════════════════════════════════════
   PHASE 7 v2 POLISH (v6.4.3)
   §1 family accents + §2 per-illustration + §3 floor/packets/labels/legend
   §4 hover + §5 reduced-motion expanded
   Spec: docs/superpowers/specs/2026-05-24-tb-v3-popup-v2-polish.md
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Phase 7 v2.1 §1: Family accent stripe ── */
:root {
  --tb3-3d-accent-network:  #c47340;  /* warm bronze */
  --tb3-3d-accent-endpoint: #8a7e6c;  /* warm grey */
  --tb3-3d-accent-wireless: #6b8aa0;  /* cool blue-grey */
  --tb3-3d-accent-security: #a73e29;  /* red-bronze */
  --tb3-3d-accent-cloud:    #4a6a82;  /* blue-bronze */
}

.tb3-3d-dev-accent-stripe {
  position: absolute;
  bottom: -3px;
  left: 8px;
  right: 8px;
  height: 3px;
  border-radius: 0 0 3px 3px;
  transform: translateZ(-1px);
  pointer-events: none;
}

.tb3-3d-dev[data-family="network"]  .tb3-3d-dev-accent-stripe { background: var(--tb3-3d-accent-network); }
.tb3-3d-dev[data-family="endpoint"] .tb3-3d-dev-accent-stripe { background: var(--tb3-3d-accent-endpoint); }
.tb3-3d-dev[data-family="wireless"] .tb3-3d-dev-accent-stripe { background: var(--tb3-3d-accent-wireless); }
.tb3-3d-dev[data-family="security"] .tb3-3d-dev-accent-stripe { background: var(--tb3-3d-accent-security); }
.tb3-3d-dev[data-family="cloud"]    .tb3-3d-dev-accent-stripe { background: var(--tb3-3d-accent-cloud); }
```

### Task 1.4: append accent stripe element to device DOM

- [ ] **Step 1:** Find `_build3DDeviceEl`. Inside the innerHTML, add the accent stripe element AFTER the existing bottom face:

```javascript
    el.innerHTML =
      '<div class="tb3-3d-dev-top">' + iconHtml + labelHtml + '</div>' +
      '<div class="tb3-3d-dev-bottom"></div>' +
      '<div class="tb3-3d-dev-side-n"></div>' +
      '<div class="tb3-3d-dev-side-s"></div>' +
      '<div class="tb3-3d-dev-side-e"></div>' +
      '<div class="tb3-3d-dev-side-w"></div>' +
      '<div class="tb3-3d-dev-accent-stripe"></div>';   // NEW Stage 1
```

### Task 1.5: 3 UAT guards

- [ ] **Step 1:** Open `tests/uat.js`. Find the V1-parity fixture IIFE (`_tbv3V1ParityFixtures`). Immediately AFTER its `})();` closing, add:

```javascript
// ══════════════════════════════════════════
// TB v3 Phase 7 v2 Polish UAT fixtures
// ══════════════════════════════════════════
(function _tbv3PolishFixtures() {
  const fs = require('fs');
  const path = require('path');
  const tbv3SrcPo = fs.readFileSync(path.join(__dirname, '..', 'features', 'topology-builder-v3.js'), 'utf8');
  const tbv3CssPo = fs.readFileSync(path.join(__dirname, '..', 'features', 'topology-builder-v3.css'), 'utf8');

  // ---- Stage 1: device family map + accent CSS ----
  test('POLISH: _TB_V3_DEVICE_FAMILY defined with 37 entries',
    (function () {
      var m = tbv3SrcPo.match(/_TB_V3_DEVICE_FAMILY\s*=\s*\{([^}]+)\}/);
      if (!m) return false;
      var entries = (m[1].match(/'[a-z0-9-]+'\s*:/g) || []).length;
      return entries >= 37;
    })()
  );
  test('POLISH: _build3DDeviceEl emits data-family attribute',
    /function\s+_build3DDeviceEl[\s\S]{0,1500}setAttribute\(['"]data-family['"]/.test(tbv3SrcPo)
  );
  test('POLISH: family accent CSS defines all 5 color variables',
    /--tb3-3d-accent-network/.test(tbv3CssPo) &&
    /--tb3-3d-accent-endpoint/.test(tbv3CssPo) &&
    /--tb3-3d-accent-wireless/.test(tbv3CssPo) &&
    /--tb3-3d-accent-security/.test(tbv3CssPo) &&
    /--tb3-3d-accent-cloud/.test(tbv3CssPo)
  );
```

(Note: don't close the IIFE here — leave it open. Subsequent stages append more guards before final `})();`.)

### Task 1.6: verify + commit

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6797/6797 ALL PASS ✓` (Stage 0 cumulative 6794 + 3 new).

If UAT fails because the IIFE isn't closed yet: close it temporarily with `})();` at the end, run UAT, then re-open before continuing. Or just close it at end of THIS stage and re-open in Stage 2.

Better: close the IIFE here so UAT runs, then Stage 2 starts a NEW IIFE block. Let me do that — append `})();` to close the polish IIFE.

Commit:

```bash
git add features/topology-builder-v3.js features/topology-builder-v3.css tests/uat.js
git commit -m "$(cat <<'EOF'
feat(tb-v3-popup-polish): device family map + accent CSS (Stage 1)

- _TB_V3_DEVICE_FAMILY map: 37 entries (network/endpoint/wireless/
  security/cloud)
- _build3DDeviceEl adds data-family attribute
- Phase 7 v2.1 §1 CSS: 5 family accent color vars + stripe element

+3 POLISH UAT guards (6794 → 6797).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Stage 2: Per-device 3D illustrations (37 types in 5 batches)

**Subagent model:** **Opus** for batches 2A-2E (design judgment + density). Each batch invokes **ui-ux-pro-max** for visual recommendations.

**Goal:** Build `_TB_V3_DEVICE_3D_ILLUSTRATIONS` map with one entry per device type. Each entry is an HTML string fragment that goes INSIDE the `.tb3-3d-dev-body` element. The body shell + accent stripe stays the same; the per-type illustration adds family-specific visual features (antennae, port LEDs, controller buttons, etc.).

### Architecture per illustration

Each `.tb3-3d-dev-body` will contain:
- The existing 5-face body shell (top/bottom/4 sides) — UNCHANGED, stays as Stage 1 baseline
- A NEW per-type illustration overlay rendered ON TOP of the top face (using `translateZ(15px)` to lift above the face)
- The accent stripe at the bottom edge (Stage 1)

The illustration HTML strings are kept type-specific but use shared CSS classes where possible (e.g., `.tb3-3d-illust-led`, `.tb3-3d-illust-antenna`).

### Task 2.1: rewrite `_build3DDeviceEl` to dispatch on type

- [ ] **Step 1:** Update `_build3DDeviceEl`:

```javascript
  function _build3DDeviceEl(dev) {
    var iconHtml = (TB_V3_DEVICE_TYPES && TB_V3_DEVICE_TYPES[dev.type] && TB_V3_DEVICE_TYPES[dev.type].icon)
      ? TB_V3_DEVICE_TYPES[dev.type].icon
      : '';
    var labelHtml = '<span class="tb3-3d-dev-label">' + _escAttr(dev.label || dev.hostname || dev.type) + '</span>';
    var family = _TB_V3_DEVICE_FAMILY[dev.type] || 'network';
    var illust = (_TB_V3_DEVICE_3D_ILLUSTRATIONS && _TB_V3_DEVICE_3D_ILLUSTRATIONS[dev.type])
      ? _TB_V3_DEVICE_3D_ILLUSTRATIONS[dev.type]
      : '';   // default = no overlay, just plain body

    var el = document.createElement('div');
    el.className = 'tb3-3d-dev';
    el.setAttribute('data-device-id', _escAttr(dev.id));
    el.setAttribute('data-device-type', _escAttr(dev.type));
    el.setAttribute('data-family', family);
    var x = (typeof dev.x === 'number' ? dev.x : 0);
    var y = (typeof dev.y === 'number' ? dev.y : 0);
    el.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
    el.innerHTML =
      '<div class="tb3-3d-dev-top">' + iconHtml + labelHtml + '</div>' +
      '<div class="tb3-3d-dev-bottom"></div>' +
      '<div class="tb3-3d-dev-side-n"></div>' +
      '<div class="tb3-3d-dev-side-s"></div>' +
      '<div class="tb3-3d-dev-side-e"></div>' +
      '<div class="tb3-3d-dev-side-w"></div>' +
      '<div class="tb3-3d-dev-illust">' + illust + '</div>' +
      '<div class="tb3-3d-dev-accent-stripe"></div>';
    return el;
  }
```

### Task 2.2: declare empty `_TB_V3_DEVICE_3D_ILLUSTRATIONS` map

- [ ] **Step 1:** Right after `_TB_V3_DEVICE_FAMILY`, add the empty illustrations map (subsequent batches fill it in):

```javascript
  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 7 v2 Polish: device 3D illustration overlays.
  // Each entry is an HTML string fragment rendered above the device's top face.
  // Filled in across batches 2A-2E.
  // ═══════════════════════════════════════════════════════════════════════════
  var _TB_V3_DEVICE_3D_ILLUSTRATIONS = {};
```

### Task 2.3: shared base CSS for illustrations

- [ ] **Step 1:** Append to v3.css after Phase 7 v2.1 §1:

```css

/* ── Phase 7 v2.1 §2: Per-device illustration overlays ── */

.tb3-3d-dev-illust {
  position: absolute;
  inset: 0;
  transform: translateZ(15px);
  pointer-events: none;
  /* Each .illust-* sub-class below positions itself relative to this. */
}

/* Shared sub-elements that multiple illustrations use */
.tb3-3d-illust-led {
  position: absolute;
  width: 3px; height: 3px;
  border-radius: 99px;
  background: #f5c25c;
  box-shadow: 0 0 4px rgba(245, 194, 92, .6);
}
.tb3-3d-illust-led.off {
  background: rgba(0,0,0,.18);
  box-shadow: none;
}

.tb3-3d-illust-antenna {
  position: absolute;
  width: 2px;
  background: linear-gradient(to bottom, color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 60%, white 40%), var(--tb3-bronze, #8b5a3c));
  border-radius: 1px;
  transform-origin: bottom center;
}

.tb3-3d-illust-port {
  position: absolute;
  background: color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 55%, black 45%);
  border-radius: 1px;
}

.tb3-3d-illust-vent {
  position: absolute;
  background-image: repeating-linear-gradient(
    0deg,
    rgba(0,0,0,.35) 0 1px,
    transparent 1px 3px
  );
  border-radius: 2px;
}
```

(Batches 2A-2E add per-type CSS classes.)

### Task 2.4: Batch 2A — Network devices (10 types)

**Subagent model:** Opus (invokes ui-ux-pro-max)

Build illustration HTML + CSS for: `router`, `l3-router`, `isp-router`, `switch`, `l3-switch`, `dmz-switch`, `hub`, `bridge`, `onprem-dc`, `mpls-core`.

- [ ] **Step 1:** Invoke ui-ux-pro-max:

```
Skill: ui-ux-pro-max
args: design 3D illustration overlays for 10 network device types in a stylized 3D popup. Each device renders as a thick "playing card" (88x60x14 box) with the illustration overlay sitting on top face at translateZ(15px). Devices: router (rack-style, antennae on top), l3-router (router + L3 stamp), isp-router (router with ISP/WAN port emphasis), switch (long flat box, 24 port LEDs in 2 rows), l3-switch (switch + L3 stamp), dmz-switch (switch + DMZ red accent rail), hub (simple box, "HUB" badge), bridge (two-port relay shape), onprem-dc (mini rack chassis with status LEDs), mpls-core (multi-port carrier router with WAN badges). Recommend specific shape descriptions (line-art-feel, not photoreal) using CSS positioning + tiny div elements (LEDs, antennae, vents). Goal: 5-second recognition from any rotation angle. No code — shape recipes.
```

Apply recommendations to the HTML strings below (adjust positioning/decorations per ui-ux-pro-max).

- [ ] **Step 2:** Add 10 entries to `_TB_V3_DEVICE_3D_ILLUSTRATIONS`:

```javascript
  _TB_V3_DEVICE_3D_ILLUSTRATIONS['router'] =
    '<div class="illust-rack-bar"></div>' +
    '<div class="illust-antenna" style="left:18px;top:-18px;height:18px;"></div>' +
    '<div class="illust-antenna" style="left:50%;top:-22px;height:22px;margin-left:-1px;"></div>' +
    '<div class="illust-antenna" style="right:18px;top:-18px;height:18px;transform:rotate(10deg);"></div>' +
    '<div class="illust-led-row"><span class="led"></span><span class="led off"></span><span class="led"></span><span class="led"></span></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['l3-router'] =
    _TB_V3_DEVICE_3D_ILLUSTRATIONS['router'] +
    '<div class="illust-badge illust-badge-l3">L3</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['isp-router'] =
    '<div class="illust-rack-bar"></div>' +
    '<div class="illust-antenna" style="left:14px;top:-18px;height:16px;transform:rotate(-15deg);"></div>' +
    '<div class="illust-antenna" style="right:14px;top:-18px;height:16px;transform:rotate(15deg);"></div>' +
    '<div class="illust-wan-cluster">' +
      '<span class="led-wan"></span><span class="led-wan"></span>' +
    '</div>' +
    '<div class="illust-badge illust-badge-isp">ISP</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['switch'] =
    '<div class="illust-port-grid switch-ports">' +
      // 24 ports in 2 rows of 12
      Array.from({ length: 24 }).map(function (_, i) {
        return '<span class="port' + (i % 3 === 0 ? ' lit' : '') + '"></span>';
      }).join('') +
    '</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['l3-switch'] =
    _TB_V3_DEVICE_3D_ILLUSTRATIONS['switch'] +
    '<div class="illust-badge illust-badge-l3">L3</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['dmz-switch'] =
    '<div class="illust-port-grid switch-ports dmz">' +
      Array.from({ length: 24 }).map(function (_, i) {
        return '<span class="port' + (i % 4 === 0 ? ' lit' : '') + '"></span>';
      }).join('') +
    '</div>' +
    '<div class="illust-dmz-rail"></div>' +
    '<div class="illust-badge illust-badge-dmz">DMZ</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['hub'] =
    '<div class="illust-hub-spokes">' +
      Array.from({ length: 6 }).map(function () { return '<span></span>'; }).join('') +
    '</div>' +
    '<div class="illust-badge illust-badge-hub">HUB</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['bridge'] =
    '<div class="illust-bridge-arc"></div>' +
    '<div class="illust-port" style="left:6px;top:50%;width:8px;height:4px;transform:translateY(-50%);"></div>' +
    '<div class="illust-port" style="right:6px;top:50%;width:8px;height:4px;transform:translateY(-50%);"></div>' +
    '<div class="illust-badge illust-badge-bridge">BR</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['onprem-dc'] =
    '<div class="illust-rack-chassis">' +
      Array.from({ length: 4 }).map(function () { return '<span class="rack-unit"><span class="led"></span></span>'; }).join('') +
    '</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['mpls-core'] =
    '<div class="illust-rack-bar"></div>' +
    '<div class="illust-port-grid mpls-ports">' +
      Array.from({ length: 8 }).map(function (_, i) {
        return '<span class="port-wan' + (i < 6 ? ' lit' : '') + '"></span>';
      }).join('') +
    '</div>' +
    '<div class="illust-badge illust-badge-mpls">MPLS</div>';
```

- [ ] **Step 3:** Append CSS for these 10 illustrations to v3.css:

```css

/* ── Phase 7 v2.1 §2 Batch 2A: Network device illustrations ── */

/* Shared bits */
.tb3-3d-dev-illust .illust-rack-bar {
  position: absolute;
  top: 4px; left: 50%; transform: translateX(-50%);
  width: 60%; height: 2px;
  background: color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 60%, black 40%);
  border-radius: 1px;
}
.tb3-3d-dev-illust .illust-antenna {
  /* base styles in shared block; positioning per-instance via inline style */
}
.tb3-3d-dev-illust .illust-led-row {
  position: absolute;
  top: 10px; left: 12px;
  display: flex; gap: 4px;
}
.tb3-3d-dev-illust .illust-led-row .led {
  width: 3px; height: 3px; border-radius: 99px;
  background: #f5c25c;
  box-shadow: 0 0 3px rgba(245,194,92,.6);
}
.tb3-3d-dev-illust .illust-led-row .led.off {
  background: rgba(0,0,0,.2);
  box-shadow: none;
}

.tb3-3d-dev-illust .illust-badge {
  position: absolute;
  bottom: 4px; right: 4px;
  font: 600 7px/1 -apple-system, system-ui;
  letter-spacing: .04em;
  background: rgba(255,255,255,.85);
  color: var(--tb3-ink, #1a1a1a);
  padding: 2px 4px;
  border-radius: 3px;
  text-transform: uppercase;
}
.tb3-3d-dev-illust .illust-badge-l3   { color: #c47340; }
.tb3-3d-dev-illust .illust-badge-isp  { color: #4a6a82; }
.tb3-3d-dev-illust .illust-badge-dmz  { color: #a73e29; }
.tb3-3d-dev-illust .illust-badge-mpls { color: #4a6a82; }

.tb3-3d-dev-illust .illust-port-grid {
  position: absolute;
  inset: 12px 12px 10px 12px;
  display: grid;
  gap: 2px;
}
.tb3-3d-dev-illust .switch-ports {
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(2, 1fr);
}
.tb3-3d-dev-illust .switch-ports .port {
  background: color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 50%, black 50%);
  border-radius: 1px;
}
.tb3-3d-dev-illust .switch-ports .port.lit {
  background: linear-gradient(to bottom, color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 50%, black 50%) 60%, #f5c25c 60%, #f5c25c);
}
.tb3-3d-dev-illust .switch-ports.dmz .port.lit {
  background: linear-gradient(to bottom, color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 50%, black 50%) 60%, var(--tb3-3d-accent-security) 60%, var(--tb3-3d-accent-security));
}

.tb3-3d-dev-illust .illust-dmz-rail {
  position: absolute;
  top: 4px; left: 4px; right: 4px; height: 2px;
  background: var(--tb3-3d-accent-security);
  border-radius: 1px;
}

.tb3-3d-dev-illust .illust-wan-cluster {
  position: absolute;
  top: 16px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 4px;
}
.tb3-3d-dev-illust .illust-wan-cluster .led-wan {
  width: 6px; height: 4px;
  background: #4a6a82;
  border-radius: 1px;
  box-shadow: 0 0 4px rgba(74,106,130,.5);
}

.tb3-3d-dev-illust .illust-hub-spokes {
  position: absolute;
  inset: 8px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 4px;
}
.tb3-3d-dev-illust .illust-hub-spokes span {
  background: color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 55%, black 45%);
  border-radius: 99px;
}

.tb3-3d-dev-illust .illust-bridge-arc {
  position: absolute;
  top: 8px; left: 12px; right: 12px; height: 30px;
  border: 1.5px solid color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 65%, black 35%);
  border-bottom: none;
  border-radius: 50% 50% 0 0;
}

.tb3-3d-dev-illust .illust-rack-chassis {
  position: absolute;
  inset: 6px;
  display: flex; flex-direction: column;
  gap: 2px;
}
.tb3-3d-dev-illust .illust-rack-chassis .rack-unit {
  flex: 1;
  background: linear-gradient(180deg, color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 50%, black 50%), color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 40%, black 60%));
  border: 1px solid color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 40%, black 60%);
  border-radius: 1px;
  position: relative;
}
.tb3-3d-dev-illust .illust-rack-chassis .rack-unit .led {
  position: absolute;
  left: 4px; top: 50%; transform: translateY(-50%);
  width: 2px; height: 2px; border-radius: 99px;
  background: #f5c25c;
  box-shadow: 0 0 2px rgba(245,194,92,.5);
}

.tb3-3d-dev-illust .mpls-ports {
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: 1fr;
  bottom: 16px;
}
.tb3-3d-dev-illust .mpls-ports .port-wan {
  background: color-mix(in oklab, #4a6a82 50%, black 50%);
  border-radius: 1px;
}
.tb3-3d-dev-illust .mpls-ports .port-wan.lit {
  background: linear-gradient(to bottom, color-mix(in oklab, #4a6a82 50%, black 50%) 60%, #4a6a82 60%, #4a6a82);
  box-shadow: 0 0 4px rgba(74,106,130,.4);
}
```

- [ ] **Step 4:** Add 1 UAT guard inside `_tbv3PolishFixtures` (re-open the IIFE if you closed it in Stage 1):

```javascript
  // ---- Stage 2 Batch 2A: Network device illustrations ----
  test('POLISH: Batch 2A — all 10 network device illustrations defined',
    /_TB_V3_DEVICE_3D_ILLUSTRATIONS\['router'\]/.test(tbv3SrcPo) &&
    /_TB_V3_DEVICE_3D_ILLUSTRATIONS\['l3-router'\]/.test(tbv3SrcPo) &&
    /_TB_V3_DEVICE_3D_ILLUSTRATIONS\['isp-router'\]/.test(tbv3SrcPo) &&
    /_TB_V3_DEVICE_3D_ILLUSTRATIONS\['switch'\]/.test(tbv3SrcPo) &&
    /_TB_V3_DEVICE_3D_ILLUSTRATIONS\['l3-switch'\]/.test(tbv3SrcPo) &&
    /_TB_V3_DEVICE_3D_ILLUSTRATIONS\['dmz-switch'\]/.test(tbv3SrcPo) &&
    /_TB_V3_DEVICE_3D_ILLUSTRATIONS\['hub'\]/.test(tbv3SrcPo) &&
    /_TB_V3_DEVICE_3D_ILLUSTRATIONS\['bridge'\]/.test(tbv3SrcPo) &&
    /_TB_V3_DEVICE_3D_ILLUSTRATIONS\['onprem-dc'\]/.test(tbv3SrcPo) &&
    /_TB_V3_DEVICE_3D_ILLUSTRATIONS\['mpls-core'\]/.test(tbv3SrcPo)
  );
```

- [ ] **Step 5:** Verify + commit:

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6798/6798 ALL PASS ✓` (Stage 1 cumulative 6797 + 1 new).

```bash
git add features/topology-builder-v3.js features/topology-builder-v3.css tests/uat.js
git commit -m "$(cat <<'EOF'
feat(tb-v3-popup-polish): Stage 2 Batch 2A — network device illustrations (Opus)

10 network device 3D illustrations: router (antennae + LEDs), l3-router
(+ L3 badge), isp-router (WAN cluster + ISP badge), switch (24 port
LEDs), l3-switch (+ L3 badge), dmz-switch (red DMZ rail), hub (spoke
grid), bridge (arc + 2 ports), onprem-dc (4 rack units with LEDs),
mpls-core (8 WAN ports + MPLS badge).

ui-ux-pro-max consulted on shape recipes.

+1 POLISH UAT guard (6797 → 6798).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### Task 2.5: Batch 2B — Endpoint devices (10 types)

**Subagent model:** Opus (invokes ui-ux-pro-max)

Build: `pc`, `laptop`, `server`, `smartphone`, `smart-tv`, `game-console`, `printer`, `voip`, `iot`, `dns-server`.

Same recipe: invoke ui-ux-pro-max → add `_TB_V3_DEVICE_3D_ILLUSTRATIONS[<type>]` entries → append CSS → add UAT guard → commit.

Per-device shape hints:
- **pc**: desktop tower (vertical rectangle) + power LED
- **laptop**: open-book wedge (top half + bottom half hinge)
- **server**: rack chassis (4 horizontal slats + 2 status LEDs)
- **smartphone**: small portrait rectangle + speaker grille + home button hint
- **smart-tv**: wide horizontal rectangle + stand
- **game-console**: short box + controller bump (D-pad + sticks + buttons)
- **printer**: paper tray + output slot + status LED
- **voip**: phone handset cradle (curved top + base)
- **iot**: small disc + radial dots (sensor pattern)
- **dns-server**: rack with .com / lookup symbol

(Use ui-ux-pro-max for exact shape recommendations. Pattern is consistent with Batch 2A.)

Commit:

```bash
git add features/topology-builder-v3.js features/topology-builder-v3.css tests/uat.js
git commit -m "feat(tb-v3-popup-polish): Stage 2 Batch 2B — endpoint device illustrations (Opus)

10 endpoint device 3D illustrations: pc, laptop, server, smartphone,
smart-tv, game-console, printer, voip, iot, dns-server. Each gets a
recognizable per-type shape (controller D-pad on game-console, sensor
disc on iot, rack chassis on dns-server, etc.).

+1 POLISH UAT guard.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

### Task 2.6: Batch 2C — Wireless + Security (6 types)

**Subagent model:** Opus

Build: `wap`, `wlc`, `firewall`, `ids`, `vpg`, `sase-edge`.

- **wap**: dome + 3 signal rings (concentric arcs)
- **wlc**: rack chassis + radio waves emanating
- **firewall**: brick-pattern wall + small fire emblem (NOT actual fire — abstract flame badge)
- **ids**: shield + eye/scope icon
- **vpg**: tunnel shape + lock badge
- **sase-edge**: shield + cloud crown (security at the edge)

Commit per same pattern.

### Task 2.7: Batch 2D — Cloud/WAN core (5 types)

**Subagent model:** Opus

Build: `cloud`, `internet`, `load-balancer`, `mpls-core` (already in 2A — SKIP if done), `vpg` (already in 2C — SKIP if done).

Wait — list correction: Stage 2's batches should NOT overlap. Let me re-divide:

- Batch 2A (network, 10): router, l3-router, isp-router, switch, l3-switch, dmz-switch, hub, bridge, onprem-dc, mpls-core ✓
- Batch 2B (endpoint, 10): pc, laptop, server, smartphone, smart-tv, game-console, printer, voip, iot, dns-server ✓
- Batch 2C (wireless + security, 6): wap, wlc, firewall, ids, vpg, sase-edge ✓
- Batch 2D (cloud generic, 3): cloud, internet, load-balancer
- Batch 2E (public cloud, 8): public-web, public-file, public-cloud, vpc, cloud-subnet, igw, nat-gw, tgw

Total: 10 + 10 + 6 + 3 + 8 = **37** ✓

For Batch 2D:
- **cloud**: cloud-shape blob (3 humps + flat bottom)
- **internet**: globe orb (3 latitude lines + 2 longitude curves)
- **load-balancer**: triangle/funnel + 3 outbound arrows

Commit.

### Task 2.8: Batch 2E — Public Cloud (8 types)

**Subagent model:** Opus

Build: `public-web`, `public-file`, `public-cloud`, `vpc`, `cloud-subnet`, `igw`, `nat-gw`, `tgw`.

- **public-web**: globe + page icon
- **public-file**: document stack + cloud silhouette behind
- **public-cloud**: large cloud + 4 sub-services dots
- **vpc**: dashed-border rectangle (a "container" feel)
- **cloud-subnet**: smaller dashed rectangle inside (subnetted)
- **igw**: gateway arch + globe
- **nat-gw**: gateway arch + translation arrows (left↔right)
- **tgw**: hub + 4 spokes (transit hub)

Commit.

---

## Stage 3: Device labels (hostname + IP) below each device

**Subagent model:** Sonnet

**Goal:** Each device renders a counter-rotated label below the device card showing hostname + IP. Counter-rotation keeps the label readable as the scene rotates.

### Task 3.1: append label DOM in `_build3DDeviceEl`

- [ ] **Step 1:** Update `_build3DDeviceEl` to append a label element:

```javascript
    var labelName = _escAttr(dev.label || dev.hostname || dev.type);
    var labelIp = dev.config && dev.config.ip ? _escAttr(dev.config.ip) : '';
    var labelBelowHtml =
      '<div class="tb3-3d-dev-label-below">' +
        '<span class="tb3-3d-dev-name">' + labelName + '</span>' +
        (labelIp ? '<span class="tb3-3d-dev-ip">' + labelIp + '</span>' : '') +
      '</div>';

    el.innerHTML =
      '<div class="tb3-3d-dev-top">' + iconHtml + labelHtml + '</div>' +
      '<div class="tb3-3d-dev-bottom"></div>' +
      '<div class="tb3-3d-dev-side-n"></div>' +
      '<div class="tb3-3d-dev-side-s"></div>' +
      '<div class="tb3-3d-dev-side-e"></div>' +
      '<div class="tb3-3d-dev-side-w"></div>' +
      '<div class="tb3-3d-dev-illust">' + illust + '</div>' +
      '<div class="tb3-3d-dev-accent-stripe"></div>' +
      labelBelowHtml;   // NEW Stage 3
```

### Task 3.2: append label CSS

- [ ] **Step 1:** Append to v3.css:

```css

/* ── Phase 7 v2.1 §3: Device labels below ── */
.tb3-3d-dev-label-below {
  position: absolute;
  top: 60px; left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  text-align: center;
  pointer-events: none;
  /* Counter-rotate: cancels the parent scene's rotateX so the label
     stays facing the camera regardless of scene tilt. rotateY counter
     handled by JS on camera change (Stage 3.3). */
}

.tb3-3d-dev-label-below .tb3-3d-dev-name {
  display: block;
  font: 600 11px/1.2 "Fraunces", Georgia, serif;
  color: var(--tb3-ink, #1a1a1a);
  letter-spacing: .02em;
}

.tb3-3d-dev-label-below .tb3-3d-dev-ip {
  display: block;
  font: 500 9px/1.2 -apple-system, "SF Mono", Menlo, monospace;
  color: var(--tb3-muted, #7a6e5e);
  margin-top: 2px;
}
```

### Task 3.3: counter-rotate labels on camera change

- [ ] **Step 1:** Update `_apply3DCamera` to also update label counter-rotation:

```javascript
  function _apply3DCamera() {
    var stage = document.getElementById('tb3-3d-popup-stage');
    if (!stage) return;
    stage.style.transform =
      'rotateX(' + _3dPopup.camera.rotX + 'deg) ' +
      'rotateY(' + _3dPopup.camera.rotY + 'deg) ' +
      'scale(' + _3dPopup.camera.zoom + ')';

    // Counter-rotate labels so they always face the camera
    var labels = stage.querySelectorAll('.tb3-3d-dev-label-below');
    var counterTransform = 'translateX(-50%) rotateX(' + (-_3dPopup.camera.rotX) + 'deg) rotateY(' + (-_3dPopup.camera.rotY) + 'deg)';
    for (var i = 0; i < labels.length; i++) {
      labels[i].style.transform = counterTransform;
    }
  }
```

### Task 3.4: 1 UAT guard

```javascript
  // ---- Stage 3: device labels below ----
  test('POLISH: label CSS + counter-rotation in _apply3DCamera',
    /\.tb3-3d-dev-label-below/.test(tbv3CssPo) &&
    /_apply3DCamera[\s\S]{0,1000}\.tb3-3d-dev-label-below[\s\S]{0,200}counterTransform/.test(tbv3SrcPo)
  );
```

### Task 3.5: verify + commit

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6803/6803 ALL PASS ✓` (5 batches × 1 + Stage 3 × 1 = +5 vs Stage 1 cumulative 6797 + +1 Stage 3 = 6803, OR adjust per actual count).

```bash
git add features/topology-builder-v3.js features/topology-builder-v3.css tests/uat.js
git commit -m "feat(tb-v3-popup-polish): device labels below + counter-rotation (Stage 3)

Each device renders hostname (Fraunces serif) + IP (mono) label below
its card. Labels counter-rotate against the camera so they stay
camera-facing as the scene rotates.

+1 POLISH UAT guard.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Stage 4: Centroid offset (auto-center the scene)

**Subagent model:** Sonnet

**Goal:** Fix the bottom-right cluster bug. `_render3DScene` computes the centroid of all devices in canvas coords, then every device + cable endpoint translates by `-centroid` so the topology sits centered around the stage origin (which is at viewport 50/50).

### Task 4.1: add `_computeSceneCentroid` helper

- [ ] **Step 1:** Add near other 3D helpers:

```javascript
  // ===========================================================================
  // Phase 7 v2 Polish: scene centroid helper.
  // Returns {cx, cy} = arithmetic mean of all device positions, so the topology
  // can be translated so it centers around the stage origin (which is at
  // viewport 50/50). Returns {0,0} for empty topologies.
  // ===========================================================================
  function _computeSceneCentroid(devices) {
    if (!Array.isArray(devices) || devices.length === 0) return { cx: 0, cy: 0 };
    var sumX = 0, sumY = 0;
    for (var i = 0; i < devices.length; i++) {
      sumX += (typeof devices[i].x === 'number' ? devices[i].x : 0);
      sumY += (typeof devices[i].y === 'number' ? devices[i].y : 0);
    }
    return { cx: sumX / devices.length, cy: sumY / devices.length };
  }
```

### Task 4.2: rewire `_render3DScene` + `_build3DDeviceEl` + `_build3DCableEl` with centroid offset

- [ ] **Step 1:** Update `_render3DScene` to compute centroid once and pass to builders:

```javascript
  function _render3DScene() {
    var stage = document.getElementById('tb3-3d-popup-stage');
    if (!stage) return;
    var existing = stage.querySelectorAll('.tb3-3d-dev, .tb3-3d-cable');
    for (var i = 0; i < existing.length; i++) existing[i].parentNode.removeChild(existing[i]);

    var centroid = _computeSceneCentroid(state.devices);   // NEW Stage 4

    for (var d = 0; d < state.devices.length; d++) {
      stage.appendChild(_build3DDeviceEl(state.devices[d], centroid.cx, centroid.cy));
    }
    for (var c = 0; c < state.cables.length; c++) {
      var cab = state.cables[c];
      var fromDev = _findDeviceById(cab.fromId);
      var toDev = _findDeviceById(cab.toId);
      if (!fromDev || !toDev) continue;
      stage.appendChild(_build3DCableEl(cab, fromDev, toDev, centroid.cx, centroid.cy));
    }

    // ... existing empty state + counts update + aria-label ...
  }
```

- [ ] **Step 2:** Update `_build3DDeviceEl` signature + transform to subtract centroid:

```javascript
  function _build3DDeviceEl(dev, sceneCx, sceneCy) {
    sceneCx = sceneCx || 0;
    sceneCy = sceneCy || 0;
    // ... existing iconHtml + family + illust + labelBelowHtml setup ...

    var el = document.createElement('div');
    // ... existing attrs ...
    var x = (typeof dev.x === 'number' ? dev.x : 0) - sceneCx;   // NEW: centroid-relative
    var y = (typeof dev.y === 'number' ? dev.y : 0) - sceneCy;
    el.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
    // ... existing innerHTML ...
    return el;
  }
```

- [ ] **Step 3:** Update `_build3DCableEl` signature similarly:

```javascript
  function _build3DCableEl(cab, fromDev, toDev, sceneCx, sceneCy) {
    sceneCx = sceneCx || 0;
    sceneCy = sceneCy || 0;
    // Subtract centroid from each endpoint
    var x1 = ((fromDev.x || 0) - sceneCx) + 44;
    var y1 = ((fromDev.y || 0) - sceneCy) + 60;
    var x2 = ((toDev.x || 0) - sceneCx) + 44;
    var y2 = ((toDev.y || 0) - sceneCy) + 60;
    // ... rest of bezier + SVG construction unchanged ...
  }
```

### Task 4.3: 2 UAT guards

```javascript
  // ---- Stage 4: centroid offset ----
  test('POLISH: _computeSceneCentroid defined',
    /function\s+_computeSceneCentroid\s*\(/.test(tbv3SrcPo)
  );
  test('POLISH: _build3DDeviceEl + _build3DCableEl accept sceneCx/sceneCy params',
    /function\s+_build3DDeviceEl\s*\([^)]*sceneCx[^)]*sceneCy/.test(tbv3SrcPo) &&
    /function\s+_build3DCableEl\s*\([^)]*sceneCx[^)]*sceneCy/.test(tbv3SrcPo)
  );
```

### Task 4.4: verify + commit

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6805/6805 ALL PASS ✓`

```bash
git add features/topology-builder-v3.js tests/uat.js
git commit -m "feat(tb-v3-popup-polish): centroid offset auto-centers scene (Stage 4)

Fixes the bottom-right cluster bug. _computeSceneCentroid averages all
device positions; _render3DScene passes (cx, cy) to _build3DDeviceEl
and _build3DCableEl which subtract from raw device coords. Topology
now sits centered around stage origin (viewport 50/50) regardless of
its canvas-coordinate range.

+2 POLISH UAT guards.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Stage 5: Ambient packet motion (Opus + emil-design-eng)

**Subagent model:** **Opus** (motion engine)

**Goal:** Per cable, one SVG `<g>` with a small bronze circle that traverses the cable's bezier path via `<animateMotion>`. emil-tuned for natural pacing. Reduced-motion gate removes the animation entirely.

### Task 5.1: invoke emil-design-eng

Use Skill tool:
```
args: validate ambient packet motion for cables in a 3D popup. Each cable is a bezier path between two device card endpoints. Want a small bronze circle (4px diameter, bronze fill, subtle drop-shadow glow) to traverse the path continuously. emil-tuned values needed: packet diameter, packet color/glow intensity, traversal duration (currently planned 3.2s), easing curve (currently planned ease-in-out cubic via SVG keySplines '.42 0 .58 1'), stagger (3 packets per cable, offset by 1.07s = 3.2s/3), direction (forward only — start to end, no return packets). Validate this feels natural (not too floaty, not too zippy), visually subtle (not distracting from device shapes), and "alive" (suggests electrons flowing). Recommend any tweaks. Reduced-motion: ambient packets removed entirely. No code — recommend specific values.
```

Apply emil's recommendations.

### Task 5.2: add `_buildAmbientPacketEl` helper

- [ ] **Step 1:** Add near `_build3DCableEl`:

```javascript
  function _buildAmbientPacketEl(cab, fromDev, toDev, sceneCx, sceneCy) {
    sceneCx = sceneCx || 0;
    sceneCy = sceneCy || 0;
    var svgNs = 'http://www.w3.org/2000/svg';
    // Compute same bezier path as the cable (extracted from _build3DCableEl logic)
    var x1 = ((fromDev.x || 0) - sceneCx) + 44;
    var y1 = ((fromDev.y || 0) - sceneCy) + 60;
    var x2 = ((toDev.x || 0) - sceneCx) + 44;
    var y2 = ((toDev.y || 0) - sceneCy) + 60;
    var midX = (x1 + x2) / 2;
    var sagY = Math.min(70, Math.max(20, Math.abs(x2 - x1) * 0.12));
    var cy1 = y1 + sagY;
    var cy2 = y2 + sagY;
    var minX = Math.min(x1, x2) - 20;
    var minY = Math.min(y1, y2) - 4;
    var maxX = Math.max(x1, x2) + 20;
    var maxY = Math.max(y1, y2) + sagY + 8;
    var w = maxX - minX;
    var h = maxY - minY;
    var px1 = x1 - minX, py1 = y1 - minY;
    var px2 = x2 - minX, py2 = y2 - minY;
    var cpX = midX - minX, pcy1 = cy1 - minY, pcy2 = cy2 - minY;
    var pathStr = 'M' + px1 + ',' + py1 +
                  ' C' + cpX + ',' + pcy1 + ' ' + cpX + ',' + pcy2 + ' ' + px2 + ',' + py2;
    var pathId = 'tb3-3d-amb-path-' + cab.id;

    var svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('class', 'tb3-3d-ambient-packet');
    svg.setAttribute('data-cable-id', cab.id);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.style.position = 'absolute';
    svg.style.left = minX + 'px';
    svg.style.top = minY + 'px';
    svg.style.transform = 'translateZ(0.5px)';   // sit just above cable
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';

    var defs = document.createElementNS(svgNs, 'defs');
    var path = document.createElementNS(svgNs, 'path');
    path.setAttribute('id', pathId);
    path.setAttribute('d', pathStr);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'none');
    defs.appendChild(path);
    svg.appendChild(defs);

    // 3 staggered packets per cable
    var DURATION = '3.2s';
    var stagger = ['0s', '1.07s', '2.14s'];
    for (var i = 0; i < 3; i++) {
      var pkt = document.createElementNS(svgNs, 'circle');
      pkt.setAttribute('r', '2');
      pkt.setAttribute('fill', 'var(--tb3-bronze, #8b5a3c)');
      pkt.setAttribute('filter', 'drop-shadow(0 0 3px rgba(139, 90, 60, .7))');
      var anim = document.createElementNS(svgNs, 'animateMotion');
      anim.setAttribute('dur', DURATION);
      anim.setAttribute('repeatCount', 'indefinite');
      anim.setAttribute('begin', stagger[i]);
      anim.setAttribute('keyTimes', '0;1');
      anim.setAttribute('keySplines', '.42 0 .58 1');
      anim.setAttribute('calcMode', 'spline');
      var mpath = document.createElementNS(svgNs, 'mpath');
      mpath.setAttribute('href', '#' + pathId);
      anim.appendChild(mpath);
      pkt.appendChild(anim);
      svg.appendChild(pkt);
    }
    return svg;
  }
```

### Task 5.3: wire into `_render3DScene`

- [ ] **Step 1:** After the cable build loop, add a packet build loop:

```javascript
    for (var c = 0; c < state.cables.length; c++) {
      var cab = state.cables[c];
      var fromDev = _findDeviceById(cab.fromId);
      var toDev = _findDeviceById(cab.toId);
      if (!fromDev || !toDev) continue;
      stage.appendChild(_build3DCableEl(cab, fromDev, toDev, centroid.cx, centroid.cy));
      stage.appendChild(_buildAmbientPacketEl(cab, fromDev, toDev, centroid.cx, centroid.cy));   // NEW Stage 5
    }
```

Update the existing-element cleanup at the top of `_render3DScene` to include the packet selector:

```javascript
    var existing = stage.querySelectorAll('.tb3-3d-dev, .tb3-3d-cable, .tb3-3d-ambient-packet');
```

### Task 5.4: reduced-motion CSS gate

- [ ] **Step 1:** Append to v3.css Phase 7 v2.1 §5 (or extend existing reduced-motion block):

```css
@media (prefers-reduced-motion: reduce) {
  /* Phase 7 v2 polish: kill ambient packets entirely */
  .tb3-3d-ambient-packet { display: none; }
}
```

### Task 5.5: 2 UAT guards

```javascript
  // ---- Stage 5: ambient packets ----
  test('POLISH: _buildAmbientPacketEl defined with animateMotion',
    /function\s+_buildAmbientPacketEl[\s\S]{0,3000}animateMotion[\s\S]{0,500}mpath/.test(tbv3SrcPo)
  );
  test('POLISH: reduced-motion hides ambient packets',
    /@media\s*\(prefers-reduced-motion[\s\S]{0,2000}\.tb3-3d-ambient-packet[\s\S]{0,100}display:\s*none/.test(tbv3CssPo)
  );
```

### Task 5.6: verify + commit

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6807/6807 ALL PASS ✓`

```bash
git add features/topology-builder-v3.js features/topology-builder-v3.css tests/uat.js
git commit -m "feat(tb-v3-popup-polish): ambient packet motion (Stage 5 / Opus / emil-tuned)

Per cable, one SVG group with 3 staggered bronze packet circles
traversing the cable's bezier path via <animateMotion>. 3.2s duration,
ease-in-out cubic spline, indefinite loop, 1.07s stagger (continuous
flow feel). emil-design-eng consulted on packet visual + cadence.

@media (prefers-reduced-motion: reduce) removes ambient packets
entirely — no compromise mode, just clean static cables.

+2 POLISH UAT guards.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Stage 6: Floor grid + improved camera + Fit-to-view + Reset + Legend chip + Hover

**Subagent model:** Sonnet

**Goal:** Polish the chrome — floor grid, improved initial camera, Fit-to-view + Reset header buttons, device legend chip, device hover lift.

### Task 6.1: floor grid CSS

- [ ] **Step 1:** Find the existing `.tb3-3d-floor` rule. Add grid background image:

```css
body.tb3-3d-popup-modal .tb3-3d-floor,
.tb3-3d-floor {
  /* existing: position, rotate, gradient ... */
  background-image:
    linear-gradient(0deg, color-mix(in oklab, var(--tb3-cream, #f5ede0) 70%, black 30%) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in oklab, var(--tb3-cream, #f5ede0) 70%, black 30%) 1px, transparent 1px),
    radial-gradient(ellipse at 50% 50%, var(--tb3-cream, #f5ede0) 0%, color-mix(in oklab, var(--tb3-cream, #f5ede0) 70%, black 30%) 100%);
  background-size: 60px 60px, 60px 60px, 100% 100%;
  background-position: center;
  -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
}
```

### Task 6.2: improved initial camera defaults

- [ ] **Step 1:** Change `_3dPopup.camera` defaults:

```javascript
  var _3dPopup = {
    open: false,
    camera: { rotX: 42, rotY: -18, zoom: 1.1 },   // was rotX:52, zoom:1
    // ... rest unchanged
  };
```

Also update `_on3DPopupDblClick` reset target if hardcoded:
```javascript
var targetRotX = 42, targetRotY = -18, targetZoom = 1.1;
```

### Task 6.3: Fit-to-view + Reset buttons in header

- [ ] **Step 1:** In `_open3DPopup`, update the header HTML:

```javascript
    modal.innerHTML =
      // ... backdrop, card opens ...
      '<header class="tb3-3d-popup-header">' +
        '<h2 id="tb3-3d-popup-title" class="tb3-3d-popup-title">3D view of topology</h2>' +
        '<span class="tb3-3d-popup-counts">' + devCount + ' devices &middot; ' + cabCount + ' cables</span>' +
        '<div class="tb3-3d-popup-header-spacer"></div>' +
        '<button class="tb3-3d-popup-tool-btn" id="tb3-3d-popup-fit" title="Fit to view" type="button">Fit to view</button>' +
        '<button class="tb3-3d-popup-tool-btn" id="tb3-3d-popup-reset" title="Reset camera" type="button">Reset</button>' +
        '<button class="tb3-3d-popup-close-btn" id="tb3-3d-popup-close-btn" aria-label="Close 3D view" type="button">&times;</button>' +
      '</header>' +
      // ... viewport, etc unchanged ...
```

- [ ] **Step 2:** Wire button handlers in `_open3DPopup`:

```javascript
    document.getElementById('tb3-3d-popup-fit').addEventListener('click', function () {
      _fitCameraToDevices();
    });
    document.getElementById('tb3-3d-popup-reset').addEventListener('click', function () {
      _on3DPopupDblClick();   // reuse the existing tween
    });
```

- [ ] **Step 3:** Implement `_fitCameraToDevices`:

```javascript
  function _fitCameraToDevices() {
    if (!state.devices || state.devices.length === 0) return;
    var centroid = _computeSceneCentroid(state.devices);
    var maxExt = 0;
    for (var i = 0; i < state.devices.length; i++) {
      var dx = Math.abs((state.devices[i].x || 0) - centroid.cx);
      var dy = Math.abs((state.devices[i].y || 0) - centroid.cy);
      maxExt = Math.max(maxExt, dx, dy);
    }
    // Default viewport ~1100px wide on a 1200px card. Choose zoom so maxExt fits.
    var targetZoom = Math.min(2.0, Math.max(0.5, 360 / Math.max(maxExt + 100, 100)));
    // Tween to target
    var startZoom = _3dPopup.camera.zoom;
    var startTs = null;
    var durationMs = 400;
    if (_3dPopup.rafHandle) { cancelAnimationFrame(_3dPopup.rafHandle); _3dPopup.rafHandle = null; }
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function tick(ts) {
      if (startTs === null) startTs = ts;
      var t = Math.min(1, (ts - startTs) / durationMs);
      var k = ease(t);
      _3dPopup.camera.zoom = startZoom + (targetZoom - startZoom) * k;
      _apply3DCamera();
      if (t < 1) {
        _3dPopup.rafHandle = requestAnimationFrame(tick);
      } else {
        _3dPopup.rafHandle = null;
      }
    }
    _3dPopup.rafHandle = requestAnimationFrame(tick);
  }
```

- [ ] **Step 4:** CSS for header buttons:

```css
.tb3-3d-popup-header-spacer { flex: 1; }
.tb3-3d-popup-tool-btn {
  background: transparent;
  border: 1px solid var(--tb3-hairline, rgba(0,0,0,.12));
  border-radius: 6px;
  padding: 6px 10px;
  font: 500 11px/1 -apple-system, system-ui;
  color: var(--tb3-ink, #1a1a1a);
  cursor: pointer;
  margin-right: 6px;
}
.tb3-3d-popup-tool-btn:hover { background: rgba(0,0,0,.04); }
```

### Task 6.4: device legend chip

- [ ] **Step 1:** Append legend chip to modal HTML (inside `.tb3-3d-popup-viewport`):

```javascript
        '<div class="tb3-3d-popup-legend" id="tb3-3d-popup-legend">' +
          '<div class="tb3-3d-popup-legend-title">Device families</div>' +
          '<div class="tb3-3d-popup-legend-row"><span class="dot" style="background: var(--tb3-3d-accent-network);"></span>Network</div>' +
          '<div class="tb3-3d-popup-legend-row"><span class="dot" style="background: var(--tb3-3d-accent-endpoint);"></span>Endpoints</div>' +
          '<div class="tb3-3d-popup-legend-row"><span class="dot" style="background: var(--tb3-3d-accent-wireless);"></span>Wireless</div>' +
          '<div class="tb3-3d-popup-legend-row"><span class="dot" style="background: var(--tb3-3d-accent-security);"></span>Security</div>' +
          '<div class="tb3-3d-popup-legend-row"><span class="dot" style="background: var(--tb3-3d-accent-cloud);"></span>Cloud / Internet</div>' +
        '</div>' +
```

- [ ] **Step 2:** CSS:

```css
.tb3-3d-popup-legend {
  position: absolute;
  right: 16px; bottom: 16px;
  background: color-mix(in oklab, var(--tb3-cream, #f5ede0) 92%, black 8%);
  border: 1px solid var(--tb3-hairline, rgba(0,0,0,.12));
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 11px;
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
  z-index: 5;
}
.tb3-3d-popup-legend-title {
  font: 600 10px/1 "Fraunces", Georgia, serif;
  color: var(--tb3-ink, #1a1a1a);
  text-transform: uppercase;
  letter-spacing: .08em;
  margin-bottom: 8px;
}
.tb3-3d-popup-legend-row {
  display: flex; align-items: center; gap: 6px;
  color: var(--tb3-ink, #1a1a1a);
  padding: 3px 0;
}
.tb3-3d-popup-legend-row .dot {
  width: 8px; height: 8px;
  border-radius: 99px;
  flex-shrink: 0;
}
```

### Task 6.5: hover lift

- [ ] **Step 1:** Add CSS:

```css
.tb3-3d-dev {
  transition: transform 180ms cubic-bezier(.16, 1, .3, 1);
}
.tb3-3d-dev:hover {
  transform: translate3d(var(--tb3-3d-dev-x, 0), var(--tb3-3d-dev-y, 0), 8px);
}
```

(Note: this requires changing the device's `style.transform` to use CSS custom props so the hover rule can override. Update `_build3DDeviceEl`:

```javascript
el.style.setProperty('--tb3-3d-dev-x', x + 'px');
el.style.setProperty('--tb3-3d-dev-y', y + 'px');
el.style.transform = 'translate3d(var(--tb3-3d-dev-x), var(--tb3-3d-dev-y), 0)';
```

Actually CSS custom props in transforms work but it's cleaner to use a different selector. Simpler: just add `translateZ(8px)` to hover, accepting it doesn't preserve the device's x/y. Test which approach works.)

Simpler alternative: use a child element for the lift:

```css
.tb3-3d-dev {
  transition: transform 180ms cubic-bezier(.16, 1, .3, 1);
}
.tb3-3d-dev:hover .tb3-3d-dev-top,
.tb3-3d-dev:hover .tb3-3d-dev-illust,
.tb3-3d-dev:hover .tb3-3d-dev-accent-stripe {
  transform: translateZ(8px);
}
```

Pick whichever works. Verify visually.

### Task 6.6: 4 UAT guards

```javascript
  // ---- Stage 6: chrome polish ----
  test('POLISH: floor grid CSS uses linear-gradient + radial-gradient',
    /\.tb3-3d-floor[\s\S]{0,800}linear-gradient[\s\S]{0,200}radial-gradient/.test(tbv3CssPo)
  );
  test('POLISH: initial camera rotX 42 + zoom 1.1',
    /camera:\s*\{\s*rotX:\s*42[^}]*zoom:\s*1\.1/.test(tbv3SrcPo)
  );
  test('POLISH: Fit-to-view button + _fitCameraToDevices defined',
    /tb3-3d-popup-fit/.test(tbv3SrcPo) &&
    /function\s+_fitCameraToDevices\s*\(/.test(tbv3SrcPo)
  );
  test('POLISH: device legend chip defined',
    /tb3-3d-popup-legend[\s\S]{0,500}Device families/.test(tbv3SrcPo)
  );
```

### Task 6.7: verify + commit

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6811/6811 ALL PASS ✓`

```bash
git add features/topology-builder-v3.js features/topology-builder-v3.css tests/uat.js
git commit -m "feat(tb-v3-popup-polish): floor grid + improved camera + UI affordances (Stage 6)

- Floor grid: cream-on-cream linear+radial-gradient with mask fade
- Initial camera: rotX 52 → 42 (lower tilt), zoom 1 → 1.1 (tighter)
- Header buttons: Fit-to-view (auto-zoom to frame all devices, 400ms
  tween) + Reset (reuse dblclick tween)
- Device legend chip (bottom-right): family color dots + labels
- Hover state: device top + illust + stripe lift translateZ(8px)

+4 POLISH UAT guards.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Stage 7: Reduced-motion + a11y refresh

**Subagent model:** Sonnet

**Goal:** Ensure all new polish elements respect prefers-reduced-motion. Add aria support for legend + Fit/Reset buttons.

### Task 7.1: extend reduced-motion CSS

- [ ] **Step 1:** Append to v3.css reduced-motion block:

```css
@media (prefers-reduced-motion: reduce) {
  /* polish: kill hover lift transition */
  .tb3-3d-dev,
  .tb3-3d-dev-top, .tb3-3d-dev-illust, .tb3-3d-dev-accent-stripe {
    transition: none !important;
  }
}
```

### Task 7.2: aria labels for new buttons

- [ ] **Step 1:** Update Fit-to-view + Reset buttons in `_open3DPopup` HTML:

```javascript
'<button class="tb3-3d-popup-tool-btn" id="tb3-3d-popup-fit" aria-label="Fit topology to view" type="button">Fit to view</button>' +
'<button class="tb3-3d-popup-tool-btn" id="tb3-3d-popup-reset" aria-label="Reset camera to default angle" type="button">Reset</button>' +
```

### Task 7.3: 1 UAT guard

```javascript
  // ---- Stage 7: reduced-motion + a11y refresh ----
  test('POLISH: reduced-motion kills hover-lift transitions',
    /@media\s*\(prefers-reduced-motion[\s\S]{0,3000}\.tb3-3d-dev-top[\s\S]{0,300}transition:\s*none/.test(tbv3CssPo)
  );
```

### Task 7.4: verify + commit

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6812/6812 ALL PASS ✓`

```bash
git add features/topology-builder-v3.js features/topology-builder-v3.css tests/uat.js
git commit -m "feat(tb-v3-popup-polish): reduced-motion + a11y refresh (Stage 7)

- @media prefers-reduced-motion: reduce kills hover-lift transitions
  on .tb3-3d-dev + child elements (top, illust, accent-stripe).
- Fit-to-view + Reset buttons get aria-label attributes for SR users.

+1 POLISH UAT guard.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Stage 8: Playwright tests + dogfood + ship v6.4.3

**Subagent model:** Sonnet (invokes **stop-slop** for copy validation)

**Goal:** 3 Playwright tests covering polish behavior. Update dogfood HTML. Bump v6.4.3. Expand CLAUDE.md row. Branch ready for PR (DO NOT PUSH).

### Task 8.1: stop-slop on new copy

```
args: validate locked copy templates for TB v3 popup polish (v6.4.3). New copy:
- Fit-to-view button: "Fit to view"
- Reset button: "Reset"
- Legend title: "Device families"
- Legend rows: "Network" / "Endpoints" / "Wireless" / "Security" / "Cloud / Internet"
Check for AI-tells, weasel words, redundancy. Suggest tightenings if any.
```

Apply tightenings.

### Task 8.2: Playwright tests 62-64

Open `tests/e2e/app.spec.js`. Find last V1P test:
```bash
cd '/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz'
grep -n 'TB v3 V1P — test 61' tests/e2e/app.spec.js
```

Append:

```javascript
  // ────────────────────────────────────────────────────────────
  // Polish tests (v6.4.3)
  // ────────────────────────────────────────────────────────────

  test('TB v3 POLISH — test 62: device labels render with hostname + IP', async ({ page }) => {
    await page.goto('/?cert=netplus');
    await page.waitForFunction(() => typeof window.showPage === 'function');
    await page.evaluate(async () => {
      window._gateProOnly = () => true; window._certanvilSignedIn = true;
      await window._loadFeature('topology-builder-v3');
      window.showPage('topology-builder-v3');
      if (typeof window.openTopologyBuilderV3 === 'function') window.openTopologyBuilderV3();
    });
    await page.waitForSelector('#tb3-canvas-svg', { timeout: 15000 });
    await page.evaluate(() => {
      var tb3 = window._certanvilFeatures['topology-builder-v3'];
      var s = tb3._getState();
      s.devices.push({ id: 'd1', type: 'router', x: 100, y: 100, label: 'R1', config: { ip: '10.0.0.1' } });
      s.devices.push({ id: 'd2', type: 'pc', x: 300, y: 100, label: 'PC-Alice', config: { ip: '10.0.0.50' } });
      tb3._renderCanvas();
    });
    await page.click('.tb3-mode[data-mode="3d"]');
    await page.waitForSelector('.tb3-3d-popup-stage');
    await page.waitForTimeout(300);
    var labels = await page.locator('.tb3-3d-dev-label-below').count();
    var names = await page.locator('.tb3-3d-dev-name').allTextContents();
    var ips = await page.locator('.tb3-3d-dev-ip').allTextContents();
    expect(labels).toBeGreaterThanOrEqual(2);
    expect(names.join(',')).toContain('R1');
    expect(names.join(',')).toContain('PC-Alice');
    expect(ips.join(',')).toContain('10.0.0.1');
    expect(ips.join(',')).toContain('10.0.0.50');
  });

  test('TB v3 POLISH — test 63: ambient packet SVG elements exist per cable', async ({ page }) => {
    await page.goto('/?cert=netplus');
    await page.waitForFunction(() => typeof window.showPage === 'function');
    await page.evaluate(async () => {
      window._gateProOnly = () => true; window._certanvilSignedIn = true;
      await window._loadFeature('topology-builder-v3');
      window.showPage('topology-builder-v3');
      if (typeof window.openTopologyBuilderV3 === 'function') window.openTopologyBuilderV3();
    });
    await page.waitForSelector('#tb3-canvas-svg', { timeout: 15000 });
    await page.evaluate(() => {
      var tb3 = window._certanvilFeatures['topology-builder-v3'];
      var s = tb3._getState();
      s.devices.push({ id: 'd1', type: 'router', x: 100, y: 100, label: 'R1', config: { ip: '10.0.0.1' } });
      s.devices.push({ id: 'd2', type: 'switch', x: 300, y: 100, label: 'SW1', config: {} });
      s.cables.push({ id: 'c1', fromId: 'd1', toId: 'd2', fromPort: 'Gi0', toPort: 'Fa0', type: 'ethernet' });
      tb3._renderCanvas();
    });
    await page.click('.tb3-mode[data-mode="3d"]');
    await page.waitForSelector('.tb3-3d-popup-stage');
    await page.waitForTimeout(300);
    var packets = await page.locator('.tb3-3d-ambient-packet').count();
    expect(packets).toBeGreaterThanOrEqual(1);
  });

  test('TB v3 POLISH — test 64: Fit-to-view button changes camera zoom', async ({ page }) => {
    await page.goto('/?cert=netplus');
    await page.waitForFunction(() => typeof window.showPage === 'function');
    await page.evaluate(async () => {
      window._gateProOnly = () => true; window._certanvilSignedIn = true;
      await window._loadFeature('topology-builder-v3');
      window.showPage('topology-builder-v3');
      if (typeof window.openTopologyBuilderV3 === 'function') window.openTopologyBuilderV3();
    });
    await page.waitForSelector('#tb3-canvas-svg', { timeout: 15000 });
    await page.evaluate(() => {
      var tb3 = window._certanvilFeatures['topology-builder-v3'];
      var s = tb3._getState();
      // Add some far-apart devices so Fit-to-view has work to do
      s.devices.push({ id: 'd1', type: 'router', x: 0, y: 0 });
      s.devices.push({ id: 'd2', type: 'router', x: 1500, y: 1500 });
      tb3._renderCanvas();
    });
    await page.click('.tb3-mode[data-mode="3d"]');
    await page.waitForSelector('#tb3-3d-popup-fit');
    var beforeTransform = await page.locator('.tb3-3d-popup-stage').getAttribute('style');
    await page.click('#tb3-3d-popup-fit');
    await page.waitForTimeout(500);
    var afterTransform = await page.locator('.tb3-3d-popup-stage').getAttribute('style');
    expect(afterTransform).not.toBe(beforeTransform);
  });
```

Run in isolation:
```bash
npx playwright test --project=chromium tests/e2e/app.spec.js -g "POLISH" 2>&1 | tail -15
```

Expected: 3 new tests passing.

Full Playwright:
```bash
npx playwright test --project=chromium tests/e2e/app.spec.js 2>&1 | tail -10
```

Expected: ~172 tests passing.

### Task 8.3: pre-push gate

```bash
node tests/uat.js 2>&1 | tail -3
```
Expected: `UAT: 6812/6812 ALL PASS ✓`

### Task 8.4: version bump

```bash
node scripts/bump-version.js 6.4.3 "Topology Builder v3 — Phase 7 v2 polish (illustrations + labels + centroid + ambient packets)"
```

### Task 8.5: expand CLAUDE.md row

Replace the v6.4.3 stub with this expanded version:

```markdown
| v6.4.3 | **Topology Builder v3 — Phase 7 v2 polish pass** — turns the v6.4.1/v6.4.2 popup from "shows rectangles" into "great to watch + visually appealing". **Per-device 3D illustrations** for all 37 device types (post-V1-parity). Each device renders with a recognizable shape overlay on top of the body shell: routers get antennae + LED rows, switches get 24 port LEDs with some lit, game consoles get controller buttons + D-pad + analog sticks, servers get rack-unit chassis with status LEDs, IoT gets sensor disc + radial dots, etc. **5 device families** color-coded via accent stripe at base: network (warm bronze), endpoint (warm grey), wireless (cool blue-grey), security (red-bronze), cloud (blue-bronze). Built across 5 Stage 2 batches (network 10 / endpoint 10 / wireless+security 6 / cloud-core 3 / public-cloud 8). **Device labels below** — each device renders `{hostname}` (Fraunces serif) + `{ip}` (mono) on a counter-rotated label so it stays readable as scene rotates. `_apply3DCamera` writes the counter-rotation transform on every camera change. **Centroid offset** — fixes the v6.4.1 bottom-right cluster bug. `_computeSceneCentroid` averages all device positions; `_render3DScene` subtracts centroid from each device + cable endpoint so the topology sits centered around the stage origin regardless of canvas coordinates. **Ambient packet motion** — per cable, one SVG group with 3 staggered bronze packets traversing the bezier path via `<animateMotion>` (3.2s duration, ease-in-out cubic spline, 1.07s stagger creates continuous flow feel). emil-design-eng tuned. `@media (prefers-reduced-motion: reduce)` removes ambient packets entirely. **Floor grid** — faint cream-on-cream linear+radial gradient with radial mask fade, gives spatial reference without distracting from the topology. **Improved initial camera** — `rotX 52 → 42` (lower tilt, devices feel more prominent), `zoom 1 → 1.1` (tighter framing). **Fit-to-view button** — auto-computes optimal zoom to frame all devices, 400ms ease-out cubic tween. **Reset button** — reuses dblclick tween. **Device legend chip** — bottom-right, family color dots + labels. **Hover state** — device top/illust/accent-stripe lift translateZ(8px) on hover. **Architecture** (additive to v6.4.2; no new modules; `TB3_CSS_REV` bumped `r14 → r15`): `_TB_V3_DEVICE_FAMILY` map (37 entries), `_TB_V3_DEVICE_3D_ILLUSTRATIONS` map (37 HTML-string entries built across 5 batches), `_computeSceneCentroid`, `_fitCameraToDevices`, `_buildAmbientPacketEl` (new); `_build3DDeviceEl` rewritten to accept `(dev, sceneCx, sceneCy)` and dispatch on type for illustration; `_build3DCableEl` extended with `(sceneCx, sceneCy)` params; `_render3DScene` computes centroid once and passes through. **Tests**: UAT **6794 → 6812** (+18 POLISH guards). Playwright **chromium 169 → 172** (+3 POLISH tests: labels render with hostname+IP, ambient packets exist per cable, Fit-to-view changes camera zoom). **Stages**: 9 (0-8), Sonnet default, **Opus for Stage 2 batches** (5 illustration-density batches with ui-ux-pro-max consults) and **Stage 5** (motion engine with emil-design-eng). **stop-slop** validated new copy. **Phase 8 unblocks**: Coach mode can reference the 3D scene with confidence (cohesive visual identity); 3D popup is no longer a placeholder. |
```

### Task 8.6: final commit + report

```bash
git status --short
git diff --cached --stat
git add app.js sw.js index.html package.json styles.css CLAUDE.md
git commit -m "chore(release): v6.4.3 — TB v3 Phase 7 v2 polish pass

Per-device illustrations (37 types) + labels + centroid + ambient
packets + chrome polish. UAT 6812/6812, Playwright 172/172 chromium.

See CLAUDE.md v6.4.3 row for full architecture.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

DO NOT push. Report:

> v6.4.3 polish ready on `feat/tb-v3-popup-v2-polish`. UAT 6794 → 6812 (+18), Playwright 169 → 172 (+3). 37 per-device illustrations, ambient packets, centroid auto-center, floor grid, Fit-to-view, legend, hover lift. Branch ready for PR — awaiting your push authorization.

---

## Post-ship

After user authorizes push + PR + merge:
- Watch CI on PR
- Once merged + deployed: run `tests/deploy-verify.js`
- Confirm visually on prod: 3D popup now shows recognizable per-type illustrations + labels + flowing packets

---

## Plan self-review

**1. Spec coverage:**
- §3.1-3.12 locked decisions → mapped to stages 1-7
- §4.2 new helpers → Stages 1, 4, 5, 6
- §4.3 `_build3DDeviceEl` rewrite → Stage 2.1
- §4.4 family map → Stage 1
- §4.5 illustrations map → Stage 2 (5 batches)
- §4.6 centroid offset → Stage 4
- §4.7 ambient packet motion → Stage 5
- §4.8 cable labels — DEFERRED (not in this plan; can revisit if user requests)
- §4.9 Fit + Reset → Stage 6
- §4.10 legend → Stage 6
- §4.11 hover → Stage 6
- §4.12 improved camera → Stage 6

**2. Placeholder scan:** None.

**3. Type consistency:**
- `_TB_V3_DEVICE_FAMILY[type]` returns string family name — used same way in Stages 1, 6
- `_computeSceneCentroid(devices)` returns `{cx, cy}` — consistent in Stages 4, 6
- `_build3DDeviceEl(dev, sceneCx, sceneCy)` — same signature in Stages 2.1, 4
- `_build3DCableEl(cab, fromDev, toDev, sceneCx, sceneCy)` — same in Stages 4, 5
- `_buildAmbientPacketEl(cab, fromDev, toDev, sceneCx, sceneCy)` — same as cable
- `_3dPopup.camera = {rotX, rotY, zoom}` — unchanged across stages

**4. Spec → plan additions needed:** §4.8 cable labels deferred. Add as optional Stage 6.x if user wants.

**5. Reversibility:** Each stage = clean revert point.

**6. Stage ordering:** Each stage produces working software:
- After Stage 1: devices have family attribute + accent stripe
- After Stage 2 (5 batches): per-type illustrations visible
- After Stage 3: labels render
- After Stage 4: scene centered
- After Stage 5: ambient packets flow
- After Stage 6: floor grid + Fit + Reset + Legend + hover
- After Stage 7: reduced-motion + a11y clean
- After Stage 8: ship
