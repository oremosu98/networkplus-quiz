// ══════════════════════════════════════════
// tb3d.js — Network Builder 3D View (v4.63.0 / issue #199 Phase 1)
//
// Read-only 3D visualization of tbState. Bespoke flat-shaded primitives
// for every entry in TB_DEVICE_TYPES (35 types), bezier cables, auto-
// derived VLAN floor plates, OrbitControls, click-to-inspect routed
// through the existing v4.60.0 Live Inspector popup.
//
// 2D stays source of truth. This module is dynamic-imported on first
// 3D-View click so users who never open 3D pay zero bandwidth for it.
// ══════════════════════════════════════════

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Module-level state. Reset on exit() so a second enter() is clean.
let scene, camera, renderer, labelRenderer, controls;
let animId = null;
let hostEl, canvasEl, labelEl;
let devices3D = {};    // deviceId -> { group, labelEl, type, baseEmissive }
let cables3D = [];
let plates3D = [];
let onDeviceClickCb = null;
let resizeObserver = null;
let _reducedMotion = false;

// v4.64.0 Phase 2 — trace rendering state. tb3d.js is render-only;
// app.js owns the trace state at _tbUiState.trace and pushes updates
// via setTraceState(). _currTraceState is the last snapshot we received.
let _currTraceState = null;
let _packetMesh = null;
let _packetGlowMesh = null;
let _frameBadge = null;
let _frameBadgeObj = null;
let _tracePathMeshes = [];  // highlight meshes on the visited cable paths
let _traceAnimToken = 0;    // bump to abort in-flight animations on new updates
let _prevCurrentHop = -1;

// v4.65.0 Phase 3 — OSI Layer Stack view state. tb3d.js is still render-only
// here; app.js drives entry/exit by calling enterOsiView(deviceId) /
// exitOsiView(). When active, the selected device is lifted into a 7-plane
// exploded view and other devices fade to 20% opacity. Exiting restores the
// scene and camera to pre-OSI state.
let _osiActive = false;
let _osiDeviceId = null;
let _osiLayerMeshes = [];  // THREE.Mesh array for the 7 planes
let _osiLabelObjs = [];    // CSS2DObject array for layer labels
let _osiCameraBackup = null; // { position, target } to restore on exit

// Scene scale — 2D canvas coords divided by this to map to Three.js world units.
// tb canvas is 1800x1100 units ≈ map to ~70x40 in 3D world. Tuned during
// local smoke-test so devices read clearly at in-app viewport size (~600px).
const SCALE = 25;
const GROUND_Y = 0;

// Initial camera — tuned for in-app viewport (smaller than the full-screen
// mockup). Closer + slightly lower so devices dominate the frame.
const INITIAL_CAM = new THREE.Vector3(24, 22, 32);
const INITIAL_TARGET = new THREE.Vector3(0, 2, 0);

// Device-type palette — authoritative color per type. Mirrors
// TB_DEVICE_TYPES in app.js; duplicated here to keep tb3d.js self-
// contained. If TB_DEVICE_TYPES ever changes a color, re-sync this.
const DEVICE_COLORS = {
  router:          0x7c6ff7,
  switch:          0x22c55e,
  'dmz-switch':    0xf43f5e,
  wap:             0x06b6d4,
  pc:              0xf59e0b,
  server:          0xef4444,
  firewall:        0xeab308,
  cloud:           0x60a5fa,
  'isp-router':    0x818cf8,
  'load-balancer': 0xec4899,
  ids:             0xf97316,
  wlc:             0x14b8a6,
  printer:         0xa3a3a3,
  voip:            0x0ea5e9,
  iot:             0x84cc16,
  'public-web':    0xfde047,
  'public-file':   0xfb923c,
  'public-cloud':  0x38bdf8,
  vpc:             0x8b5cf6,
  'cloud-subnet':  0xa78bfa,
  igw:             0x2dd4bf,
  'nat-gw':        0x34d399,
  tgw:             0xf472b6,
  vpg:             0xfb923c,
  'onprem-dc':     0x78716c,
  'sase-edge':     0xe879f9,
  'dns-server':    0x06b6d4,
  laptop:          0x6366f1,
  smartphone:      0x0891b2,
  'game-console':  0xd946ef,
  'smart-tv':      0x3b82f6,
  satellite:       0x06b6d4,
  'cell-tower':    0x818cf8,
  modem:           0x78716c,
  'san-array':     0x475569
};

// Zone ring — categorical color for floor plates / cable tinting based on
// the dominant VLAN or device role. Stable across renders so VLAN 10 is
// always green, VLAN 20 is always yellow, etc.
const VLAN_COLORS = [0x3fd28b, 0xf4c664, 0x6aa9f0, 0xef6a7a, 0xa99cff,
                     0x2dd4bf, 0xfb923c, 0xec4899];
function vlanColor(vlanId) {
  if (!vlanId || vlanId === 1) return null; // VLAN 1 is the "everywhere" default — no plate
  const idx = Math.abs((vlanId * 2654435761) >>> 0) % VLAN_COLORS.length;
  return VLAN_COLORS[idx];
}

// ══════════════════════════════════════════
// Public API
// ══════════════════════════════════════════

export function enter(tbState, opts = {}) {
  onDeviceClickCb = opts.onDeviceClick || null;
  _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  hostEl = document.getElementById('tb-3d-host');
  canvasEl = document.getElementById('tb-3d-canvas');
  labelEl = document.getElementById('tb-3d-labels');
  if (!hostEl || !canvasEl || !labelEl) {
    throw new Error('tb3d.enter: host elements missing');
  }

  // Build scene
  _buildScene();
  _buildGround();
  _buildPlates(tbState);
  _buildDevices(tbState);
  _buildCables(tbState);

  // Wire interactions
  _wireClick();

  // Start animation loop
  _startAnim();

  // Fire the "done" callback so the loading overlay can hide
  if (opts.onAfterEnter) opts.onAfterEnter();
}

export function exit() {
  // v4.65.0 Phase 3 — if OSI view is active when user leaves 3D mode,
  // clean it up first so no layer meshes / labels leak into the scene
  // dispose below (which would otherwise try to dispose already-removed
  // materials).
  if (_osiActive) {
    try { exitOsiView(); } catch (_) { /* tolerate */ }
  }
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  if (controls) { controls.dispose(); controls = null; }
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  // Dispose scene resources
  if (scene) {
    scene.traverse(o => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.());
        else o.material.dispose?.();
      }
    });
  }
  scene = null;
  camera = null;
  if (renderer) { renderer.dispose?.(); renderer.forceContextLoss?.(); renderer.domElement?.remove(); renderer = null; }
  if (labelRenderer) { labelRenderer.domElement?.remove(); labelRenderer = null; }
  if (canvasEl) canvasEl.innerHTML = '';
  if (labelEl) labelEl.innerHTML = '';
  devices3D = {};
  cables3D = [];
  plates3D = [];
}

export function resetCamera() {
  _tweenCamera(INITIAL_CAM.clone(), INITIAL_TARGET.clone());
}

export function topDown() {
  _tweenCamera(new THREE.Vector3(0, 60, 0.1), new THREE.Vector3(0, 0, 0));
}

// v4.64.0 Phase 2 — render-only trace bridge. app.js calls this on every
// `_tbUiState.trace` mutation (start, tick, step, end). Pass null to
// clear. traceState shape matches _tbUiState.trace:
//   { active, trace: {hops, success, path}, currentHop, playing, speedMs, srcId, dstIp }
export function setTraceState(traceState) {
  if (!scene) return; // Exited; nothing to render against.
  _currTraceState = traceState && traceState.active ? traceState : null;

  _updateHopStrip();
  _updateTraceHud();
  _updatePlaybackControls();
  _updateDeviceHighlights();
  _updateCableHighlights();

  if (!_currTraceState) {
    _clearPacket();
    _prevCurrentHop = -1;
    return;
  }

  // Animate packet for the NEW current hop (if advanced). Skip animation
  // on reduced-motion: jump to target + refresh badge.
  const hopIdx = _currTraceState.currentHop | 0;
  if (hopIdx !== _prevCurrentHop) {
    _prevCurrentHop = hopIdx;
    _animateCurrentHop(hopIdx);
  }
}

// ══════════════════════════════════════════
// Scene setup
// ══════════════════════════════════════════

function _buildScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0f1a, 60, 180);

  const w = canvasEl.clientWidth || 800;
  const h = canvasEl.clientHeight || 600;

  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 500);
  camera.position.copy(INITIAL_CAM);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasEl.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(w, h);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelEl.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !_reducedMotion;
  controls.dampingFactor = 0.08;
  controls.minDistance = 20;
  controls.maxDistance = 120;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.copy(INITIAL_TARGET);

  // Lighting
  scene.add(new THREE.AmbientLight(0xa99cff, 0.38));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(22, 36, 20);
  key.castShadow = true;
  key.shadow.mapSize.width = 1024;
  key.shadow.mapSize.height = 1024;
  key.shadow.camera.left = -40; key.shadow.camera.right = 40;
  key.shadow.camera.top = 40; key.shadow.camera.bottom = -40;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x7c6ff7, 0.35);
  fill.position.set(-18, 12, -12);
  scene.add(fill);

  // Resize observer
  resizeObserver = new ResizeObserver(() => _resize());
  resizeObserver.observe(canvasEl);
}

function _buildGround() {
  const grid = new THREE.GridHelper(120, 60, 0x222a44, 0x151a2c);
  grid.position.y = 0;
  scene.add(grid);
}

// ══════════════════════════════════════════
// VLAN floor plates (auto-derived)
// ══════════════════════════════════════════

function _buildPlates(tbState) {
  // Group devices by their first-interface VLAN. Also segregate out
  // "zone" devices (internet, cloud, public-*, onprem-dc) onto role-based
  // plates rather than VLAN-based.
  const byVlan = {};
  const zoneDevices = { internet: [], dmz: [] };

  for (const dev of tbState.devices) {
    // Zone-first classification
    if (dev.type === 'cloud' || dev.type === 'isp-router' || dev.type === 'onprem-dc') {
      zoneDevices.internet.push(dev);
      continue;
    }
    if (dev.type.startsWith('public-')) {
      zoneDevices.dmz.push(dev);
      continue;
    }
    // VLAN-based
    const firstIface = dev.interfaces && dev.interfaces[0];
    const vlan = firstIface ? (firstIface.vlan || 1) : 1;
    if (vlan === 1) continue; // default VLAN → no plate
    (byVlan[vlan] = byVlan[vlan] || []).push(dev);
  }

  // Build zone plates
  if (zoneDevices.internet.length) _makePlate(zoneDevices.internet, 0x6aa9f0, 'INTERNET', '');
  if (zoneDevices.dmz.length) _makePlate(zoneDevices.dmz, 0xef6a7a, 'DMZ', '10.0.0.0/24');

  // Build VLAN plates
  for (const vlanId in byVlan) {
    const devs = byVlan[vlanId];
    if (devs.length < 2) continue; // single-device VLAN → skip plate (ugly)
    const color = vlanColor(Number(vlanId)) || 0x3fd28b;
    const subnet = _guessSubnetForVlan(devs);
    _makePlate(devs, color, `VLAN ${vlanId}`, subnet);
  }
}

function _guessSubnetForVlan(devs) {
  // Sniff the first interface IP → derive /24
  for (const dev of devs) {
    for (const ifc of (dev.interfaces || [])) {
      if (ifc.ip && /^\d+\.\d+\.\d+\.\d+$/.test(ifc.ip)) {
        const parts = ifc.ip.split('.');
        return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
      }
    }
  }
  return '';
}

function _makePlate(devs, color, label, subnet) {
  // Compute 3D bounding box of devices
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const d of devs) {
    const x = (d.x - 900) / SCALE;  // 900 = canvas center-x
    const z = (d.y - 550) / SCALE;  // 550 = canvas center-y
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const padding = 4;
  const w = Math.max(maxX - minX + padding * 2, 8);
  const d = Math.max(maxZ - minZ + padding * 2, 8);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;

  const group = new THREE.Group();

  // Plate
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.16, side: THREE.DoubleSide
  });
  const plate = new THREE.Mesh(geo, mat);
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(cx, 0.04, cz);
  group.add(plate);

  // Border
  const edges = new THREE.EdgesGeometry(geo);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
    color, transparent: true, opacity: 0.65
  }));
  line.rotation.x = -Math.PI / 2;
  line.position.set(cx, 0.05, cz);
  group.add(line);

  // Label
  const labelDiv = document.createElement('div');
  labelDiv.className = 'tb-3d-vlan-label';
  labelDiv.style.borderLeftColor = '#' + color.toString(16).padStart(6, '0');
  labelDiv.innerHTML = `${label}${subnet ? `<span class="subnet">${subnet}</span>` : ''}`;
  const labelObj = new CSS2DObject(labelDiv);
  labelObj.position.set(cx - w / 2 + 2, 0.15, cz + d / 2 - 0.8);
  group.add(labelObj);

  scene.add(group);
  plates3D.push({ group, color });
}

// ══════════════════════════════════════════
// Device primitives (35 bespoke types)
// ══════════════════════════════════════════

function _buildDevices(tbState) {
  for (const dev of tbState.devices) {
    const color = DEVICE_COLORS[dev.type] || 0x7c6ff7;
    const group = _makeDevicePrimitive(dev.type, color);
    // Map 2D canvas coords → 3D world coords (centered on 900x550 canvas)
    group.position.set((dev.x - 900) / SCALE, 0, (dev.y - 550) / SCALE);
    group.userData = { deviceId: dev.id, selectable: true, type: dev.type };
    // Shadow-cast every mesh in the group
    group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(group);

    // Label: hostname + first-interface IP
    const ip = dev.interfaces?.[0]?.ip || '';
    const labelDiv = document.createElement('div');
    labelDiv.className = 'tb-3d-node-label';
    labelDiv.dataset.deviceId = dev.id;
    labelDiv.innerHTML = `${_esc(dev.hostname || dev.type)}${ip ? `<span class="ip">${_esc(ip)}</span>` : ''}`;
    const labelObj = new CSS2DObject(labelDiv);
    labelObj.position.set(0, _labelHeight(dev.type), 0);
    group.add(labelObj);

    devices3D[dev.id] = { group, labelEl: labelDiv, type: dev.type };
  }
}

function _esc(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Per-type label Y offset (devices vary in height)
function _labelHeight(type) {
  const map = {
    router: 3.4, 'isp-router': 3.4,
    firewall: 3.8, ids: 3.8,
    switch: 2.0, 'dmz-switch': 2.0, wlc: 2.2,
    server: 3.8, 'dns-server': 3.8, 'public-web': 3.8, 'public-file': 3.8, 'public-cloud': 3.8,
    'san-array': 4.2,
    cloud: 4.4, 'onprem-dc': 3.8,
    pc: 2.4, laptop: 2.0, smartphone: 1.6, 'smart-tv': 2.6, 'game-console': 1.8,
    printer: 2.0, voip: 2.2, iot: 1.6,
    wap: 2.8, 'cell-tower': 6.0, satellite: 3.8,
    modem: 1.6, 'load-balancer': 2.8,
    vpc: 3.4, 'cloud-subnet': 2.2, igw: 2.6, 'nat-gw': 2.6, tgw: 3.0, vpg: 2.6, 'sase-edge': 3.0
  };
  return map[type] || 2.4;
}

// The big factory — bespoke geometry for every TB_DEVICE_TYPES entry.
// Organized by category for readability. Each returns a THREE.Group.
function _makeDevicePrimitive(type, color) {
  const matStd = () => new THREE.MeshStandardMaterial({
    color, roughness: 0.55, metalness: 0.22,
    emissive: color, emissiveIntensity: 0.12
  });
  const matFlat = (c) => new THREE.MeshBasicMaterial({ color: c });

  const g = new THREE.Group();

  switch (type) {
    // ── NETWORK CORE ──
    case 'router': {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), matStd());
      m.position.y = 1.6;
      g.add(m);
      return g;
    }
    case 'isp-router': {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), matStd());
      m.position.y = 1.7;
      g.add(m);
      // ISP ring — differentiates from normal router
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.6, 0.1, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.6 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.4;
      g.add(ring);
      return g;
    }
    case 'switch':
    case 'dmz-switch': {
      const core = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.6, 1.6), matStd());
      core.position.y = 0.5;
      g.add(core);
      // DMZ stripe (top) for dmz-switch to differentiate
      if (type === 'dmz-switch') {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(3.85, 0.1, 1.65),
          matFlat(0xffffff)
        );
        stripe.position.y = 0.85;
        g.add(stripe);
      }
      // Port dots along the front
      for (let i = 0; i < 8; i++) {
        const port = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.15, 0.25),
          new THREE.MeshStandardMaterial({
            color: 0x3fd28b, emissive: 0x3fd28b, emissiveIntensity: 0.8
          })
        );
        port.position.set(-1.6 + i * 0.45, 0.85, 0.8);
        g.add(port);
      }
      return g;
    }
    case 'load-balancer': {
      // Double-box (load-balanced pair aesthetic)
      const left = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1.2), matStd());
      left.position.set(-0.85, 1.0, 0);
      g.add(left);
      const right = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1.2), matStd());
      right.position.set(0.85, 1.0, 0);
      g.add(right);
      // Bridge cable between
      const bridge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8),
        matFlat(0xffffff)
      );
      bridge.rotation.z = Math.PI / 2;
      bridge.position.y = 1.6;
      g.add(bridge);
      return g;
    }

    // ── SECURITY ──
    case 'firewall': {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 1.1), matStd());
      slab.position.y = 1.6;
      g.add(slab);
      // Red accent stripe
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(2.45, 0.32, 1.15),
        new THREE.MeshStandardMaterial({ color: 0xef6a7a, emissive: 0xef6a7a, emissiveIntensity: 0.5 })
      );
      stripe.position.y = 1.6;
      g.add(stripe);
      return g;
    }
    case 'ids': {
      // Triangular "shield" shape — warning aesthetic
      const body = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.4, 4), matStd());
      body.position.y = 1.4;
      body.rotation.y = Math.PI / 4;
      g.add(body);
      // Eye indicator on top
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff9d55, emissiveIntensity: 1.0 })
      );
      eye.position.y = 2.9;
      g.add(eye);
      return g;
    }

    // ── WIRELESS ──
    case 'wap': {
      const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.4, 20), matStd());
      puck.position.y = 0.4;
      g.add(puck);
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8),
        matFlat(0x5b6383)
      );
      stem.position.y = 1.2;
      g.add(stem);
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 12),
        new THREE.MeshStandardMaterial({
          color: 0xa99cff, emissive: color, emissiveIntensity: 0.8
        })
      );
      ball.position.y = 2.0;
      g.add(ball);
      return g;
    }
    case 'wlc': {
      // Flat controller with multiple antennas — a "hub" for WAPs
      const core = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.4), matStd());
      core.position.y = 0.6;
      g.add(core);
      // 3 antennas
      for (let i = -1; i <= 1; i++) {
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8),
          matFlat(0x5b6383)
        );
        stem.position.set(i * 0.7, 1.3, 0);
        g.add(stem);
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 10),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 })
        );
        tip.position.set(i * 0.7, 1.85, 0);
        g.add(tip);
      }
      return g;
    }

    // ── ENDPOINTS — PERSONAL ──
    case 'pc': {
      // Small desktop tower + monitor
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 1.2), matStd());
      tower.position.set(-0.9, 0.7, 0);
      g.add(tower);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.1), matStd());
      screen.position.set(0.3, 1.1, 0);
      g.add(screen);
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), matStd());
      stand.position.set(0.3, 0.2, 0);
      g.add(stand);
      return g;
    }
    case 'laptop': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 1.05), matStd());
      base.position.y = 0.25;
      g.add(base);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.08), matStd());
      screen.position.set(0, 0.75, -0.5);
      screen.rotation.x = -0.35;
      g.add(screen);
      return g;
    }
    case 'smartphone': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.12), matStd());
      body.position.y = 0.7;
      g.add(body);
      // Screen indicator (brighter)
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.0, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.3 })
      );
      screen.position.set(0, 0.7, 0.07);
      g.add(screen);
      return g;
    }

    // ── ENDPOINTS — CONSUMER ──
    case 'game-console': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 1.2), matStd());
      body.position.y = 0.45;
      g.add(body);
      // Accent glow strip
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(2.02, 0.08, 1.22),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0 })
      );
      strip.position.y = 0.7;
      g.add(strip);
      return g;
    }
    case 'smart-tv': {
      const screen = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 0.1), matStd());
      screen.position.y = 1.4;
      g.add(screen);
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.5), matStd());
      stand.position.y = 0.2;
      g.add(stand);
      return g;
    }

    // ── ENDPOINTS — BUSINESS ──
    case 'printer': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.3), matStd());
      body.position.y = 0.6;
      g.add(body);
      // Output tray
      const tray = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.08, 0.5),
        matFlat(0xffffff)
      );
      tray.position.set(0, 1.1, 0.5);
      g.add(tray);
      return g;
    }
    case 'voip': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.9), matStd());
      base.position.y = 0.2;
      g.add(base);
      // Handset
      const handset = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 1.1), matStd());
      handset.position.set(-0.3, 0.45, 0);
      g.add(handset);
      // Keypad light
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.02, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.7 })
      );
      screen.position.set(0.3, 0.34, 0);
      g.add(screen);
      return g;
    }
    case 'iot': {
      // Small glowing cube
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.7),
        new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 0.6
        })
      );
      cube.position.y = 0.45;
      g.add(cube);
      return g;
    }

    // ── SERVERS ──
    case 'server':
    case 'dns-server':
    case 'public-web':
    case 'public-file':
    case 'public-cloud': {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.8, 1.3), matStd());
      rack.position.y = 1.6;
      g.add(rack);
      // Rack lines (U-slot dividers)
      for (let i = 0; i < 4; i++) {
        const line = new THREE.Mesh(
          new THREE.BoxGeometry(1.35, 0.05, 1.35),
          matFlat(0x0b0f1a)
        );
        line.position.y = 0.5 + i * 0.6;
        g.add(line);
      }
      // Status LED
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 8),
        new THREE.MeshStandardMaterial({
          color: 0x3fd28b, emissive: 0x3fd28b, emissiveIntensity: 1.0
        })
      );
      led.position.set(0.55, 2.8, 0.65);
      g.add(led);
      return g;
    }
    case 'san-array': {
      // Tall rack with storage discs visible
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.4, 1.4), matStd());
      rack.position.y = 1.9;
      g.add(rack);
      // Disc rows
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
          const disc = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.35, 0.08),
            matFlat(0x1a1f33)
          );
          disc.position.set(-0.35 + col * 0.7, 0.6 + row * 0.75, 0.72);
          g.add(disc);
        }
      }
      return g;
    }

    // ── CLOUD ──
    case 'cloud': {
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), matStd());
      s1.position.set(0, 2.2, 0);
      g.add(s1);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 12), matStd());
      s2.position.set(1.0, 2.0, 0);
      g.add(s2);
      const s3 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), matStd());
      s3.position.set(-1.0, 1.9, 0);
      g.add(s3);
      return g;
    }
    case 'vpc': {
      // Large transparent box representing VPC boundary
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 2.4, 3.4),
        new THREE.MeshStandardMaterial({
          color, transparent: true, opacity: 0.25,
          emissive: color, emissiveIntensity: 0.18
        })
      );
      frame.position.y = 1.4;
      g.add(frame);
      // Edges for clarity
      const edges = new THREE.EdgesGeometry(frame.geometry);
      const edgeLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color }));
      edgeLine.position.copy(frame.position);
      g.add(edgeLine);
      return g;
    }
    case 'cloud-subnet': {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.4, 2.2),
        new THREE.MeshStandardMaterial({
          color, transparent: true, opacity: 0.28,
          emissive: color, emissiveIntensity: 0.2
        })
      );
      frame.position.y = 0.8;
      g.add(frame);
      return g;
    }
    case 'igw': {
      // Gateway arch
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(1.0, 0.2, 12, 24, Math.PI),
        matStd()
      );
      arch.position.y = 1.0;
      arch.rotation.z = 0;
      g.add(arch);
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.2), matStd());
      base.position.y = 0.1;
      g.add(base);
      return g;
    }
    case 'nat-gw': {
      // Flipped gateway (differentiates from igw)
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(0.9, 0.18, 12, 24, Math.PI),
        matStd()
      );
      arch.position.y = 1.0;
      arch.rotation.z = Math.PI;
      arch.position.y = 1.9;
      g.add(arch);
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 1.2), matStd());
      base.position.y = 0.15;
      g.add(base);
      return g;
    }
    case 'tgw': {
      // Multi-pronged hub
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.6, 16), matStd());
      core.position.y = 0.6;
      g.add(core);
      // 4 spokes
      for (let i = 0; i < 4; i++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.15, 0.3),
          matStd()
        );
        spoke.position.y = 0.6;
        spoke.rotation.y = (i * Math.PI) / 2;
        g.add(spoke);
      }
      // Center orb
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 1.0 })
      );
      orb.position.y = 1.1;
      g.add(orb);
      return g;
    }
    case 'vpg': {
      // VPN gateway — tunnel shape
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, 1.6, 16, 1, true),
        new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 0.25, side: THREE.DoubleSide
        })
      );
      tube.position.y = 0.8;
      tube.rotation.z = Math.PI / 2;
      g.add(tube);
      return g;
    }
    case 'onprem-dc': {
      // Building (on-prem datacenter)
      const building = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 2.2), matStd());
      building.position.y = 1.4;
      g.add(building);
      // Window rows
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const win = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.3, 0.05),
            new THREE.MeshStandardMaterial({
              color: 0xffffff, emissive: 0xf4c664, emissiveIntensity: 0.8
            })
          );
          win.position.set(-0.7 + col * 0.7, 0.6 + row * 0.7, 1.13);
          g.add(win);
        }
      }
      return g;
    }
    case 'sase-edge': {
      // Multi-service hex-node
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 1.0, 1.2, 6),
        matStd()
      );
      core.position.y = 0.9;
      g.add(core);
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.0, 0.25, 6),
        new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: color, emissiveIntensity: 0.6
        })
      );
      cap.position.y = 1.6;
      g.add(cap);
      return g;
    }

    // ── WAN/TRANSPORT ──
    case 'satellite': {
      // Disc body with solar panels
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.6, 16), matStd());
      body.position.y = 2.4;
      g.add(body);
      // Dish
      const dish = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.3, 0.25, 16, 1, true),
        new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: color, emissiveIntensity: 0.4, side: THREE.DoubleSide
        })
      );
      dish.position.y = 2.9;
      g.add(dish);
      // Solar panels
      const panelL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.6), matFlat(0x1a2040));
      panelL.position.set(-1.4, 2.4, 0);
      g.add(panelL);
      const panelR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.6), matFlat(0x1a2040));
      panelR.position.set(1.4, 2.4, 0);
      g.add(panelR);
      // Support pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8),
        matFlat(0x5b6383)
      );
      pole.position.y = 1.2;
      g.add(pole);
      return g;
    }
    case 'cell-tower': {
      // Vertical tower
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), matStd());
      base.position.y = 0.15;
      g.add(base);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 4.4, 8),
        matFlat(0x5b6383)
      );
      pole.position.y = 2.5;
      g.add(pole);
      // Antenna triad
      for (let i = 0; i < 3; i++) {
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.08, 0.15),
          matStd()
        );
        arm.position.y = 4.5;
        arm.rotation.y = (i * Math.PI * 2) / 3;
        arm.translateX(0.45);
        g.add(arm);
      }
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xff6a7a, emissive: 0xff6a7a, emissiveIntensity: 1.0 })
      );
      tip.position.y = 4.8;
      g.add(tip);
      return g;
    }
    case 'modem': {
      // Small box with LED row
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 0.8), matStd());
      body.position.y = 0.3;
      g.add(body);
      // LED row
      for (let i = 0; i < 4; i++) {
        const led = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 8, 6),
          new THREE.MeshStandardMaterial({
            color: 0x3fd28b, emissive: 0x3fd28b, emissiveIntensity: 0.8
          })
        );
        led.position.set(-0.45 + i * 0.3, 0.55, 0.41);
        g.add(led);
      }
      return g;
    }

    // ── FALLBACK ──
    default: {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), matStd());
      box.position.y = 0.8;
      g.add(box);
      return g;
    }
  }
}

// ══════════════════════════════════════════
// Cables — bezier curves zone-colored
// ══════════════════════════════════════════

function _buildCables(tbState) {
  for (const cable of tbState.cables) {
    const from = devices3D[cable.from];
    const to = devices3D[cable.to];
    if (!from || !to) continue;

    const fromPos = from.group.position;
    const toPos = to.group.position;
    const fromY = _cableAnchorY(from.type);
    const toY = _cableAnchorY(to.type);
    const arc = Math.max(fromY, toY) + 2.5;

    // Cubic bezier from device top → arch midpoint → destination top
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(fromPos.x, fromY, fromPos.z),
      new THREE.Vector3(fromPos.x, fromY + arc * 0.7, fromPos.z),
      new THREE.Vector3(toPos.x, toY + arc * 0.7, toPos.z),
      new THREE.Vector3(toPos.x, toY, toPos.z)
    );

    // Color: pick from the higher-VLAN endpoint's VLAN color, fall back to device color
    const color = _pickCableColor(cable, from, to) || DEVICE_COLORS[from.type] || 0x7c6ff7;

    const geo = new THREE.TubeGeometry(curve, 40, 0.1, 8, false);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.35,
      transparent: true, opacity: 0.75
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    cables3D.push({ id: cable.id, mesh, curve, color });
  }
}

function _cableAnchorY(type) {
  const map = {
    router: 1.6, 'isp-router': 1.7,
    firewall: 2.0, ids: 2.4,
    switch: 0.9, 'dmz-switch': 0.9, wlc: 1.1,
    server: 2.4, 'dns-server': 2.4, 'public-web': 2.4, 'public-file': 2.4, 'public-cloud': 2.4,
    'san-array': 2.8,
    cloud: 2.4, 'onprem-dc': 2.6,
    pc: 1.0, laptop: 0.6, smartphone: 1.0, 'smart-tv': 1.6, 'game-console': 0.7,
    printer: 1.0, voip: 0.7, iot: 0.6,
    wap: 1.0, 'cell-tower': 3.5, satellite: 2.7,
    modem: 0.5, 'load-balancer': 1.8,
    vpc: 2.0, 'cloud-subnet': 1.2, igw: 1.2, 'nat-gw': 1.3, tgw: 1.0, vpg: 1.2, 'sase-edge': 1.8
  };
  return map[type] || 1.4;
}

function _pickCableColor(cable, from, to) {
  // Prefer VLAN color from endpoint interface
  return null; // Phase 1 simplification — use endpoint device color. VLAN-based cable tint is Phase 2.
}

// ══════════════════════════════════════════
// Click-to-inspect
// ══════════════════════════════════════════

const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

function _wireClick() {
  renderer.domElement.addEventListener('click', _onCanvasClick);
}

function _onCanvasClick(e) {
  if (!onDeviceClickCb) return;
  const rect = renderer.domElement.getBoundingClientRect();
  _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  _raycaster.setFromCamera(_pointer, camera);
  const intersects = _raycaster.intersectObjects(scene.children, true);
  for (const hit of intersects) {
    let o = hit.object;
    while (o.parent) {
      if (o.userData && o.userData.selectable) {
        // Highlight selected label
        _setSelectedLabel(o.userData.deviceId);
        onDeviceClickCb(o.userData.deviceId);
        return;
      }
      o = o.parent;
    }
  }
}

function _setSelectedLabel(deviceId) {
  for (const id in devices3D) {
    devices3D[id].labelEl.classList.toggle('is-selected', id === deviceId);
  }
}

// ══════════════════════════════════════════
// Camera helpers + animation loop
// ══════════════════════════════════════════

function _tweenCamera(toPos, toTarget) {
  if (_reducedMotion) {
    camera.position.copy(toPos);
    controls.target.copy(toTarget);
    controls.update();
    return;
  }
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  const start = performance.now();
  const duration = 600;
  function step() {
    const t = Math.min((performance.now() - start) / duration, 1);
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(fromPos, toPos, e);
    controls.target.lerpVectors(fromTarget, toTarget, e);
    controls.update();
    if (t < 1) requestAnimationFrame(step);
  }
  step();
}

function _resize() {
  const w = canvasEl.clientWidth;
  const h = canvasEl.clientHeight;
  if (w === 0 || h === 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
}

function _startAnim() {
  function loop() {
    animId = requestAnimationFrame(loop);
    controls.update();
    // v4.64.0: packet glow bob — tiny scale oscillation, gated off on reduced-motion
    if (_packetGlowMesh && _packetGlowMesh.visible && !_reducedMotion) {
      _packetGlowMesh.scale.setScalar(1 + Math.sin(performance.now() * 0.006) * 0.15);
    }
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  loop();
}

// ══════════════════════════════════════════
// v4.64.0 Phase 2 — Packet Trace Rendering
// ══════════════════════════════════════════

function _ensurePacketMeshes() {
  if (_packetMesh) return;
  _packetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffe066, emissive: 0xffe066, emissiveIntensity: 1.5
    })
  );
  _packetMesh.visible = false;
  scene.add(_packetMesh);

  _packetGlowMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.25 })
  );
  _packetGlowMesh.visible = false;
  scene.add(_packetGlowMesh);

  // Frame badge — CSS2DObject attached to the packet
  _frameBadge = document.createElement('div');
  _frameBadge.className = 'tb-3d-frame-badge';
  _frameBadge.innerHTML = '<span class="title">Frame</span>';
  _frameBadgeObj = new CSS2DObject(_frameBadge);
  _frameBadgeObj.position.set(0, 0.9, 0);
  _frameBadgeObj.visible = false;
  _packetMesh.add(_frameBadgeObj);
}

function _clearPacket() {
  if (_packetMesh) _packetMesh.visible = false;
  if (_packetGlowMesh) _packetGlowMesh.visible = false;
  if (_frameBadgeObj) _frameBadgeObj.visible = false;
  _traceAnimToken++;
}

function _positionPacketAtDevice(deviceId) {
  const dev = devices3D[deviceId];
  if (!dev) return null;
  const p = dev.group.position.clone();
  p.y = _cableAnchorY(dev.type);
  if (_packetMesh) { _packetMesh.position.copy(p); _packetMesh.visible = true; }
  if (_packetGlowMesh) { _packetGlowMesh.position.copy(p); _packetGlowMesh.visible = true; }
  return p;
}

// _cableAnchorY already defined above (Phase 1 cable factory); reused here.

function _findCableCurve(fromId, toId) {
  const cable = cables3D.find(c =>
    (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId)
  );
  if (!cable) return null;
  return { curve: cable.curve, reverse: cable.fromId === toId };
}

// Derive per-hop from→to device pair using the trace's path array
function _resolveHopEndpoints(hopIdx) {
  const s = _currTraceState;
  if (!s || !s.trace || !s.trace.hops) return null;
  const hop = s.trace.hops[hopIdx];
  if (!hop) return null;
  const path = s.trace.path || [];
  // Strategy: prefer path[hopIdx-1] → path[hopIdx]. For hop 0, use hop.deviceId alone.
  // For DELIVER hops, the packet has already arrived; we pulse the device instead.
  if (hop.layer === 'DELIVER' || hop.layer === 'FAIL') {
    return { fromId: path[hopIdx - 1] || hop.deviceId, toId: hop.deviceId, terminal: true };
  }
  if (hopIdx === 0) {
    return { fromId: hop.deviceId, toId: hop.deviceId, terminal: false, first: true };
  }
  return { fromId: path[hopIdx - 1] || hop.deviceId, toId: hop.deviceId, terminal: false };
}

function _animateCurrentHop(hopIdx) {
  if (!_currTraceState) return;
  _ensurePacketMeshes();
  const token = ++_traceAnimToken;

  const endpoints = _resolveHopEndpoints(hopIdx);
  if (!endpoints) return;

  const hop = _currTraceState.trace.hops[hopIdx];
  _updateFrameBadge(hop);

  // Terminal hop (DELIVER / FAIL) — pulse destination, no travel.
  if (endpoints.terminal || hop.status === 'fail') {
    _positionPacketAtDevice(endpoints.toId);
    _pulseDevice(endpoints.toId, hop.status === 'fail' ? 0xef6a7a : 0x3fd28b);
    return;
  }

  // First hop — just position at source, no animation (packet emerges here).
  if (endpoints.first) {
    _positionPacketAtDevice(endpoints.fromId);
    return;
  }

  // Travel hop — animate along the connecting cable curve (or straight line
  // fallback if no physical cable exists).
  const { fromId, toId } = endpoints;
  const fromDev = devices3D[fromId];
  const toDev = devices3D[toId];
  if (!fromDev || !toDev) return;

  const cable = _findCableCurve(fromId, toId);
  const startT = cable ? (cable.reverse ? 1 : 0) : 0;
  const endT = cable ? (cable.reverse ? 0 : 1) : 1;

  const duration = Math.max(250, (_currTraceState.speedMs || 1500) - 150);

  // Reduced-motion: jump to destination instantly.
  if (_reducedMotion) {
    _positionPacketAtDevice(toId);
    return;
  }

  const fromPos = new THREE.Vector3(fromDev.group.position.x, _cableAnchorY(fromDev.type), fromDev.group.position.z);
  const toPos = new THREE.Vector3(toDev.group.position.x, _cableAnchorY(toDev.type), toDev.group.position.z);

  const start = performance.now();
  function step() {
    if (token !== _traceAnimToken) return; // cancelled by a newer update
    const t = Math.min((performance.now() - start) / duration, 1);
    let p;
    if (cable) {
      const tt = startT + (endT - startT) * t;
      p = cable.curve.getPoint(tt);
    } else {
      p = new THREE.Vector3().lerpVectors(fromPos, toPos, t);
    }
    if (_packetMesh) { _packetMesh.position.copy(p); _packetMesh.visible = true; }
    if (_packetGlowMesh) { _packetGlowMesh.position.copy(p); _packetGlowMesh.visible = true; }
    if (t < 1) requestAnimationFrame(step);
  }
  step();
}

function _pulseDevice(deviceId, color = 0x3fd28b) {
  const dev = devices3D[deviceId];
  if (!dev) return;
  const mesh = dev.group.children.find(c => c.isMesh);
  if (!mesh || !mesh.material || !mesh.material.emissive) return;
  if (_reducedMotion) return;
  const orig = mesh.material.emissiveIntensity ?? 0.1;
  const origColor = mesh.material.emissive.getHex();
  mesh.material.emissive.setHex(color);
  let t = 0;
  function pulse() {
    t += 0.06;
    mesh.material.emissiveIntensity = orig + Math.sin(t * Math.PI) * 1.2;
    if (t >= 1) {
      mesh.material.emissiveIntensity = orig;
      mesh.material.emissive.setHex(origColor);
    } else {
      requestAnimationFrame(pulse);
    }
  }
  pulse();
}

function _updateFrameBadge(hop) {
  if (!_frameBadge || !_frameBadgeObj) return;
  if (!hop) { _frameBadgeObj.visible = false; return; }
  const meta = hop.meta || {};
  const mac = meta.srcMac || meta.newSrcMac;
  const dstMac = meta.dstMac || meta.newDstMac;
  const ttlBefore = meta.ttlBefore ?? meta.ttl;
  const ttlAfter = meta.ttlAfter;
  const fail = hop.status === 'fail';
  const layerLabel = hop.layer || 'HOP';
  let rows = '';
  if (meta.srcIp && meta.dstIp) {
    rows += `<div class="row"><strong>${_esc(meta.srcIp)}</strong> → <strong>${_esc(meta.dstIp)}</strong></div>`;
  }
  if (mac || dstMac) {
    rows += `<div class="row"><strong>${_esc(mac || '?')}</strong> → <strong>${_esc(dstMac || '?')}</strong></div>`;
  }
  if (typeof ttlBefore === 'number') {
    rows += `<div class="row">TTL <strong>${ttlBefore}${typeof ttlAfter === 'number' && ttlAfter !== ttlBefore ? ` → ${ttlAfter}` : ''}</strong></div>`;
  }
  _frameBadge.className = 'tb-3d-frame-badge' + (fail ? ' fail' : '');
  _frameBadge.innerHTML = `<span class="title">${_esc(fail ? '✗ ' + layerLabel : layerLabel)}</span>${rows}`;
  _frameBadgeObj.visible = true;
}

function _updateHopStrip() {
  const strip = document.getElementById('tb-3d-hop-strip');
  const row = document.getElementById('tb-3d-hop-strip-row');
  const title = document.getElementById('tb-3d-hop-strip-title');
  if (!strip || !row) return;

  if (!_currTraceState) {
    strip.hidden = true;
    row.innerHTML = '';
    return;
  }
  strip.hidden = false;

  const s = _currTraceState;
  const hops = s.trace?.hops || [];
  const cur = s.currentHop | 0;

  if (title) {
    const srcDev = devices3D[s.srcId];
    const srcName = srcDev ? (srcDev.labelEl?.firstChild?.textContent || s.srcId) : s.srcId;
    title.textContent = `PACKET TRACE · ${_esc(srcName)} → ${_esc(s.dstIp || '?')}`;
  }

  row.innerHTML = hops.map((h, i) => {
    let klass = 'tb-3d-hop-card';
    if (i < cur) klass += ' ' + (h.status === 'fail' ? 'tb-3d-hop-card-blocked' : 'tb-3d-hop-card-ok');
    else if (i === cur) klass += ' tb-3d-hop-card-current';
    else klass += ' tb-3d-hop-card-pending';

    const meta = h.meta || {};
    let status = (h.layer === 'DELIVER') ? 'DELIVERED' : (h.status === 'fail' ? 'BLOCKED' : 'OK');
    let deviceLine = _esc(h.device || '—');
    let detailParts = [];
    if (meta.srcIp && meta.dstIp) detailParts.push(`${_esc(meta.srcIp)} → ${_esc(meta.dstIp)}`);
    if (meta.outIface) detailParts.push(`out ${_esc(meta.outIface)}`);
    if (meta.routeMatched) detailParts.push(`route ${_esc(meta.routeMatched)}`);
    if (typeof meta.ttl === 'number' && typeof meta.ttlAfter === 'number') detailParts.push(`TTL ${meta.ttl} → ${meta.ttlAfter}`);
    else if (typeof meta.ttl === 'number') detailParts.push(`TTL ${meta.ttl}`);
    if (h.decision && detailParts.length === 0) detailParts.push(_esc(h.decision));

    return `
      <div class="${klass}">
        <div class="tb-3d-hop-card-head">
          <span class="tb-3d-hop-card-num">${i + 1}</span>
          <span class="tb-3d-hop-card-layer layer-${_esc(h.layer || 'L3')}">${_esc(h.layer || 'L3')}</span>
        </div>
        <div class="tb-3d-hop-card-devices">${deviceLine}</div>
        <div class="tb-3d-hop-card-detail">${detailParts.join(' · ') || '—'}</div>
        <span class="tb-3d-hop-card-status">${status}</span>
      </div>`;
  }).join('');
}

function _updateTraceHud() {
  const hud = document.getElementById('tb-3d-trace-hud');
  const text = document.getElementById('tb-3d-trace-hud-text');
  if (!hud) return;
  if (!_currTraceState) { hud.hidden = true; return; }
  hud.hidden = false;
  if (text) {
    const srcDev = devices3D[_currTraceState.srcId];
    const srcName = srcDev ? (srcDev.labelEl?.firstChild?.textContent || _currTraceState.srcId) : _currTraceState.srcId;
    text.textContent = `Packet Trace: ${srcName} → ${_currTraceState.dstIp || '?'}`;
  }
}

function _updatePlaybackControls() {
  const container = document.getElementById('tb-3d-playback-controls');
  const playBtn = document.getElementById('tb-3d-play-btn');
  const pauseBtn = document.getElementById('tb-3d-pause-btn');
  const speedBtn = document.getElementById('tb-3d-speed-btn');
  if (!container) return;
  container.hidden = !_currTraceState;
  if (!_currTraceState) return;
  if (playBtn && pauseBtn) {
    const playing = !!_currTraceState.playing;
    playBtn.hidden = playing;
    pauseBtn.hidden = !playing;
  }
  if (speedBtn) {
    const ms = _currTraceState.speedMs || 1500;
    const label = ms <= 800 ? '2×' : ms >= 2800 ? '0.5×' : '1×';
    speedBtn.textContent = label;
  }
}

function _updateDeviceHighlights() {
  // Label-ring classes on each device label
  for (const id in devices3D) {
    const lbl = devices3D[id].labelEl;
    if (!lbl) continue;
    lbl.classList.remove('tb-3d-trace-visited', 'tb-3d-trace-current', 'tb-3d-trace-pending');
    if (!_currTraceState) continue;
    const path = _currTraceState.trace?.path || [];
    const cur = _currTraceState.currentHop | 0;
    const currentDeviceId = _currTraceState.trace?.hops?.[cur]?.deviceId;
    if (id === currentDeviceId) lbl.classList.add('tb-3d-trace-current');
    else if (path.indexOf(id) !== -1 && path.indexOf(id) < path.indexOf(currentDeviceId)) lbl.classList.add('tb-3d-trace-visited');
    else if (path.indexOf(id) !== -1) lbl.classList.add('tb-3d-trace-pending');
  }
}

function _updateCableHighlights() {
  // Reset all cables to base emissive
  for (const c of cables3D) {
    if (c.mesh?.material) {
      c.mesh.material.emissiveIntensity = 0.35;
      c.mesh.material.opacity = 0.75;
    }
  }
  if (!_currTraceState) return;
  const path = _currTraceState.trace?.path || [];
  const cur = _currTraceState.currentHop | 0;
  // Highlight cables along visited portion of the path
  for (let i = 1; i <= cur && i < path.length; i++) {
    const c = cables3D.find(cb =>
      (cb.fromId === path[i - 1] && cb.toId === path[i]) ||
      (cb.fromId === path[i] && cb.toId === path[i - 1])
    );
    if (c?.mesh?.material) {
      c.mesh.material.emissiveIntensity = 0.85;
      c.mesh.material.opacity = 1.0;
    }
  }
}

// ══════════════════════════════════════════
// v4.65.0 Phase 3 — OSI Layer Stack View
// ══════════════════════════════════════════

// Layer metadata — 7 layers with colors matching the CSS border-left-color
// (layer-1 through layer-7). Ordered bottom-up (L1 at ground level).
const _OSI_LAYERS = [
  { n: 1, name: 'Physical',     pdu: 'Bits',    protos: 'Ethernet cable · Wi-Fi · Fiber · Coax',      hex: 0xef6a7a },
  { n: 2, name: 'Data Link',    pdu: 'Frame',   protos: 'Ethernet · MAC · ARP · VLAN · STP',         hex: 0xf97316 },
  { n: 3, name: 'Network',      pdu: 'Packet',  protos: 'IP · ICMP · IPsec · Routing',                hex: 0xf4c664 },
  { n: 4, name: 'Transport',    pdu: 'Segment', protos: 'TCP · UDP · Port numbers',                   hex: 0x3fd28b },
  { n: 5, name: 'Session',      pdu: 'Data',    protos: 'NetBIOS · RPC · SMB · Session tokens',       hex: 0x2dd4bf },
  { n: 6, name: 'Presentation', pdu: 'Data',    protos: 'TLS · SSL · Compression · Encoding',         hex: 0x6aa9f0 },
  { n: 7, name: 'Application',  pdu: 'Data',    protos: 'HTTP · HTTPS · DNS · SSH · FTP · SMTP',      hex: 0xa99cff }
];

// Export — enterOsiView(deviceId) lifts the device into a 7-plane stack.
// exitOsiView() tears it down + restores camera. Public API invoked by
// app.js chrome button handlers.
export function enterOsiView(deviceId) {
  if (!scene || !deviceId || !devices3D[deviceId]) return false;
  if (_osiActive) exitOsiView(); // idempotent — exit any previous OSI state
  _osiActive = true;
  _osiDeviceId = deviceId;

  // Backup current camera + target
  _osiCameraBackup = {
    position: camera.position.clone(),
    target: controls.target.clone()
  };

  // Host class for CSS (dims non-focused device labels, shows title card)
  hostEl?.classList.add('tb-3d-osi-active');
  const focusLabel = devices3D[deviceId].labelEl;
  focusLabel?.classList.add('tb-3d-osi-focus');

  // Fade non-focus device meshes down to 20%
  for (const id in devices3D) {
    if (id === deviceId) continue;
    devices3D[id].group.traverse(o => {
      if (o.isMesh && o.material) {
        o.material.transparent = true;
        o.material.opacity = 0.2;
      }
    });
  }

  // Fade cables (packets look cleaner without clutter)
  for (const c of cables3D) {
    if (c.mesh?.material) {
      c.mesh.material.opacity = 0.18;
    }
  }

  // Build the 7 layer planes stacked above the focus device.
  const dev = devices3D[deviceId];
  const devPos = dev.group.position.clone();
  const planeWidth = 9;
  const planeDepth = 5;
  const gap = 3.2; // vertical spacing between layer planes
  const baseY = 4.5; // first plane above ground

  _OSI_LAYERS.forEach((layer, i) => {
    const y = baseY + i * gap;
    // Plane mesh — translucent colored rectangle
    const geo = new THREE.PlaneGeometry(planeWidth, planeDepth);
    const mat = new THREE.MeshBasicMaterial({
      color: layer.hex,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(devPos.x, y, devPos.z);
    scene.add(plane);
    _osiLayerMeshes.push(plane);

    // Edge outline (brighter color)
    const edges = new THREE.EdgesGeometry(geo);
    const edgeLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: layer.hex, transparent: true, opacity: 0.8
    }));
    edgeLine.rotation.x = -Math.PI / 2;
    edgeLine.position.copy(plane.position);
    edgeLine.position.y += 0.01;
    scene.add(edgeLine);
    _osiLayerMeshes.push(edgeLine);

    // Vertical riser — subtle line connecting this plane to the one below
    if (i > 0) {
      const riserGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(devPos.x, baseY + (i - 1) * gap, devPos.z),
        new THREE.Vector3(devPos.x, y, devPos.z)
      ]);
      const riser = new THREE.Line(riserGeo, new THREE.LineBasicMaterial({
        color: 0x7c6ff7, transparent: true, opacity: 0.3
      }));
      scene.add(riser);
      _osiLayerMeshes.push(riser);
    }

    // CSS2D label — attach to a dedicated anchor Object3D (NOT the plane,
    // since the plane's -PI/2 X-rotation messes with the label's local
    // frame). The anchor sits at the desired world position and has no
    // rotation, so CSS2DRenderer projects its matrixWorld cleanly.
    try {
      const labelDiv = document.createElement('div');
      labelDiv.className = `tb-3d-osi-label layer-${layer.n}`;
      labelDiv.innerHTML = `
        <div class="layer-num">LAYER ${layer.n}</div>
        <div class="layer-name">${_esc(layer.name)}</div>
        <div class="layer-pdu">${_esc(layer.pdu)}</div>
        <div class="layer-protos">${_esc(layer.protos)}</div>
      `;
      const anchor = new THREE.Object3D();
      anchor.position.set(devPos.x + planeWidth / 2 + 0.5, y, devPos.z);
      scene.add(anchor);
      _osiLayerMeshes.push(anchor); // include in cleanup
      const labelObj = new CSS2DObject(labelDiv);
      anchor.add(labelObj);
      // Force matrixWorld update so CSS2DRenderer sees the correct position
      // on the very first frame (important — without this, the clip-space
      // check can fail because matrixWorld is still identity).
      anchor.updateMatrixWorld(true);
      _osiLabelObjs.push(labelObj);
    } catch (e) {
      console.warn('[tb3d] OSI label creation failed for layer', layer.n, e);
    }
  });

  // Kick CSS2DRenderer to attach the newly-created label elements to the
  // DOM on the NEXT frame. Without this, a timing quirk sometimes leaves
  // them pending through the tween — one forced render right after the
  // anchor positions are set ensures the elements land in the DOM before
  // any user interaction can query them.
  setTimeout(() => {
    if (_osiActive && labelRenderer && scene && camera) {
      labelRenderer.render(scene, camera);
    }
  }, 50);

  // Update the OSI title card with device hostname + type
  const titleName = document.getElementById('tb-3d-osi-title-name');
  const titleSub = document.getElementById('tb-3d-osi-title-sub');
  if (titleName) {
    const hostname = dev.labelEl?.firstChild?.textContent || deviceId;
    titleName.textContent = hostname;
  }
  if (titleSub) {
    titleSub.textContent = `${dev.type} · 7 layers · click Exit OSI to return`;
  }

  // Camera tween — frame the stack. Position camera off to the right, angled
  // so the 7 stacked planes read clearly from bottom to top.
  const topY = baseY + 6 * gap;
  const focusPoint = new THREE.Vector3(devPos.x + 3, (baseY + topY) / 2, devPos.z);
  const camPos = new THREE.Vector3(devPos.x + 28, (baseY + topY) / 2 + 2, devPos.z + 18);
  _tweenCamera(camPos, focusPoint);

  return true;
}

export function exitOsiView() {
  if (!_osiActive || !scene) return;
  _osiActive = false;

  hostEl?.classList.remove('tb-3d-osi-active');
  if (_osiDeviceId && devices3D[_osiDeviceId]) {
    devices3D[_osiDeviceId].labelEl?.classList.remove('tb-3d-osi-focus');
  }

  // Dispose layer labels first — they're children of plane meshes, so we
  // remove them from their immediate parent (which fires the CSS2DObject
  // 'removed' event + cleans up the DOM element). Removing the parent
  // alone doesn't propagate the event.
  for (const lbl of _osiLabelObjs) {
    if (lbl.parent) lbl.parent.remove(lbl);
  }
  _osiLabelObjs = [];
  // Now dispose plane + edge + riser meshes
  for (const m of _osiLayerMeshes) {
    scene.remove(m);
    if (m.geometry) m.geometry.dispose?.();
    if (m.material) m.material.dispose?.();
  }
  _osiLayerMeshes = [];

  // Restore non-focus device opacity + cables
  for (const id in devices3D) {
    devices3D[id].group.traverse(o => {
      if (o.isMesh && o.material) {
        o.material.opacity = 1;
      }
    });
  }
  for (const c of cables3D) {
    if (c.mesh?.material) {
      c.mesh.material.opacity = 0.75;
    }
  }

  // Restore camera
  if (_osiCameraBackup) {
    _tweenCamera(_osiCameraBackup.position, _osiCameraBackup.target);
    _osiCameraBackup = null;
  }
  _osiDeviceId = null;
}

// Helper app.js can poll to know if OSI is active (for button state sync)
export function isOsiActive() { return _osiActive; }

// ══════════════════════════════════════════
// v4.66.0 Phase 4 — Scenario Tours
// Render-only primitives used by app.js's tour sequencer. app.js owns
// all tour state + step timing; tb3d provides camera tween + highlights.
// ══════════════════════════════════════════

// Tween camera to an arbitrary position + target over a custom duration.
// Arguments are plain [x, y, z] arrays so tour data is serializable.
export function tweenCameraTo(position, target, durationMs) {
  if (!camera || !controls) return;
  if (!Array.isArray(position) || !Array.isArray(target)) return;
  const toPos = new THREE.Vector3(position[0], position[1], position[2]);
  const toTarget = new THREE.Vector3(target[0], target[1], target[2]);
  if (_reducedMotion) {
    camera.position.copy(toPos);
    controls.target.copy(toTarget);
    controls.update();
    return;
  }
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  const duration = Math.max(100, durationMs || 800);
  const start = performance.now();
  function step() {
    const t = Math.min((performance.now() - start) / duration, 1);
    const e = 1 - Math.pow(1 - t, 3); // ease-out-cubic
    camera.position.lerpVectors(fromPos, toPos, e);
    controls.target.lerpVectors(fromTarget, toTarget, e);
    controls.update();
    if (t < 1) requestAnimationFrame(step);
  }
  step();
}

// Toggle the `.tb-3d-tour-highlight` class on device labels matching the
// given hostnames. Empty array = clear all. Resolves by hostname since
// device IDs are runtime-generated (tour data is authored against
// scenario hostnames).
export function highlightDevices(hostnames) {
  const targetSet = new Set((hostnames || []).map(s => String(s).toLowerCase()));
  for (const id in devices3D) {
    const dev = devices3D[id];
    const lbl = dev.labelEl;
    if (!lbl) continue;
    const hostname = (lbl.firstChild?.textContent || '').toLowerCase();
    if (targetSet.has(hostname)) lbl.classList.add('tb-3d-tour-highlight');
    else lbl.classList.remove('tb-3d-tour-highlight');
  }
}

// Debug-only: expose scene + module state for Chrome MCP smoke tests.
// Safe to ship since Phase 3 smoke-test needs internal visibility.
// Test-only debug accessor. Playwright uses this to verify OSI state without
// poking at module-private variables. Safe to ship — only exposes integers.
export function _debugState() {
  return {
    sceneChildrenCount: scene?.children.length ?? -1,
    osiActive: _osiActive,
    osiDeviceId: _osiDeviceId,
    osiLayerMeshCount: _osiLayerMeshes.length,
    osiLabelObjCount: _osiLabelObjs.length
  };
}
