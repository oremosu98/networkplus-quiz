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
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  loop();
}
