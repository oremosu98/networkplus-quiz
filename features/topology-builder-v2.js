// ════════════════════════════════════════════════════════════════════
// features/topology-builder-v2.js — Topology Builder V2
// ════════════════════════════════════════════════════════════════════
//
// Ground-up rebuild of the Network Builder UI to the locked mockups:
// · mockups/network-builder-revamp-concept.html (canvas bible)
// · mockups/network-builder-modes-concept.html (modes bible)
//
// Ship #1: Visual shell — layout, modebar, palette, scenario rail.
// Ship #2: Design mode canvas — reads tbState via V1 bridge getters,
//   draws devices + cables on the V2 SVG canvas.
// Ship #3: Device interaction — drag, palette add, delete, cable wiring,
//   selection, double-click config. Mutations via V1 bridge functions.
//
// ARCHITECTURE:
// · V2 has its own render layer (this file) + CSS (topology-builder-v2.css)
// · V2 calls into the existing TB engine functions (window-exposed)
//   for state management — no state duplication
// · V1 stays live as fallback until V2 is feature-complete
// · V2 lazy-loads via _loadFeature('topology-builder-v2')
// ════════════════════════════════════════════════════════════════════

(function() {
  "use strict";

  // ── CSS injection (one-shot) ──────────────────────────────────────
  let _cssLoaded = false;
  function _ensureCss() {
    if (_cssLoaded) return;
    _cssLoaded = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/features/topology-builder-v2.css';
    document.head.appendChild(link);
  }

  // ── Constants ─────────────────────────────────────────────────────
  var HALF_W = 48, HALF_H = 36;  // device rect half-dimensions (matches V1)

  // ── Device palette data ───────────────────────────────────────────
  // Mirrors the mockup's categorized device list. Each device has a
  // monoline SVG icon (matching tbPaletteLineIcon from V1 + the locked
  // mockup's exact icon paths).
  var PALETTE = [
    { cat: 'Infrastructure', devices: [
      { type: 'router',     label: 'Router',       icon: '<rect x="3" y="9" width="18" height="6" rx="2" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="12" r="1" fill="currentColor"/><circle cx="11" cy="12" r="1" fill="currentColor"/>' },
      { type: 'switch',     label: 'Switch',       icon: '<rect x="3" y="9" width="18" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 9V6M11 9V6M15 9V6M19 9V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
      { type: 'firewall',   label: 'Firewall',     icon: '<rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 10h14M9 4v6M15 4v6" stroke="currentColor" stroke-width="1.3"/>' },
      { type: 'wap',        label: 'Access Point',  icon: '<path d="M12 3c3 2 6 5 6 9a6 6 0 0 1-12 0c0-4 3-7 6-9z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="13" r="2" stroke="currentColor" stroke-width="1.5"/>' },
      { type: 'ids',        label: 'IDS / IPS',    icon: '<rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M12 9v4M10 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
      { type: 'load-balancer', label: 'Load Balancer', icon: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
    ]},
    { cat: 'Endpoints', devices: [
      { type: 'pc',         label: 'PC',           icon: '<rect x="4" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 20h8M12 16v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
      { type: 'server',     label: 'Server',       icon: '<rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M3 7h18M7 17h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
      { type: 'laptop',     label: 'Laptop',       icon: '<rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M10 18h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
      { type: 'printer',    label: 'Printer',      icon: '<rect x="6" y="10" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M6 14H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2M8 4h8v4H8z" stroke="currentColor" stroke-width="1.5"/>' },
      { type: 'voip',       label: 'VoIP Phone',   icon: '<rect x="5" y="6" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M9 10h6M9 13h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' },
      { type: 'iot',        label: 'IoT Device',   icon: '<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' },
    ]},
    { cat: 'Cloud', devices: [
      { type: 'cloud',      label: 'Cloud',        icon: '<path d="M6 18h12a4 4 0 0 0 0-8 5 5 0 0 0-10 0 3 3 0 0 0 0 6" stroke="currentColor" stroke-width="1.5" fill="none"/>' },
      { type: 'vpc',        label: 'VPC',          icon: '<rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 2"/>' },
      { type: 'igw',        label: 'Internet GW',  icon: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M4 12h16M12 4c2 2.7 3 5.3 3 8s-1 5.3-3 8c-2-2.7-3-5.3-3-8s1-5.3 3-8z" stroke="currentColor" stroke-width="1.3"/>' },
      { type: 'isp-router', label: 'ISP Router',   icon: '<rect x="3" y="9" width="18" height="6" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 9V5M17 9V5M7 5h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' },
    ]},
  ];

  // ── Modebar pills ─────────────────────────────────────────────────
  // SVG paths from the locked mockup (network-builder-revamp-concept.html)
  var MODES = [
    { id: 'design',   label: 'Design',   icon: '<path d="M4 20l4-1L19 8a2.8 2.8 0 0 0-4-4L4 15l-1 4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' },
    { id: 'simulate', label: 'Simulate', icon: '<path d="M8 5v14l11-7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' },
    { id: 'trace',    label: 'Trace',    icon: '<path d="M4 12h5l2-5 4 10 2-5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' },
    { id: 'labs',     label: 'Labs',     icon: '<path d="M9 3v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' },
    { id: 'threed',   label: '3D',       icon: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' },
    { id: '_sep' },
    { id: 'coach',    label: 'Coach',    icon: '<circle cx="12" cy="9" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
    { id: 'grade',    label: 'Grade',    icon: '<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
    { id: 'export',   label: 'Export',   icon: '<path d="M12 4v10M8 10l4 4 4-4M5 20h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' },
  ];

  // ── Scenario categories (static for shell — will read TB_SCENARIOS later) ──
  var SCENARIO_GROUPS = [
    { label: 'Sandbox', rows: [
      { name: 'Free Build', meta: 'any', active: true },
    ]},
    { label: 'Campus', count: 5, rows: [
      { name: 'Home network', meta: '7 dev' },
      { name: 'Small office', meta: '7 dev' },
      { name: 'DMZ with screened subnet', meta: '9 dev' },
      { name: 'Enterprise with IDS', meta: '12 dev' },
      { name: 'Branch office', meta: '11 dev' },
    ]},
    { label: 'WAN', count: 4, rows: [
      { name: 'Leased line', meta: '8 dev' },
      { name: 'Hub and spoke', meta: '13 dev' },
      { name: 'Full mesh', meta: '12 dev' },
      { name: 'SD-WAN', meta: '12 dev' },
    ]},
  ];

  // ── Active mode state ─────────────────────────────────────────────
  var _activeMode = 'design';
  var _engineLoaded = false;
  var _selectedCableType = 'cat6';

  // ── Interaction state (Ship #3) ───────────────────────────────────
  var _dragging = null;     // { id, offsetX, offsetY, moved, startX, startY }
  var _lastClickDevId = null;
  var _lastClickTime = 0;
  var DOUBLE_CLICK_MS = 400;
  var TB_CANVAS_W = 1800, TB_CANVAS_H = 1100;

  // ── Escaping ──────────────────────────────────────────────────────
  function _esc(s) {
    return String(s).replace(/[&<>"']/g, function(m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
  }

  // ── Edge-point calculation (matches V1's tbEdgePoint) ─────────────
  // Returns the point on the device rect perimeter closest to the
  // target point — so cables connect at the edge, not the center.
  function _edgePoint(cx, cy, tx, ty) {
    var dx = tx - cx, dy = ty - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    var absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (absDx * HALF_H > absDy * HALF_W) {
      var sign = dx > 0 ? 1 : -1;
      return { x: cx + sign * HALF_W, y: cy + dy * HALF_W / absDx };
    } else {
      var sign2 = dy > 0 ? 1 : -1;
      return { x: cx + dx * HALF_H / absDy, y: cy + sign2 * HALF_H };
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // CANVAS RENDER — Ship #2
  // Reads tbState via V1 bridge getters and draws devices + cables
  // on the V2 SVG canvas. This is a one-way read — V2 never mutates
  // tbState directly (that's what V1's exposed functions are for).
  // ════════════════════════════════════════════════════════════════════

  function _renderCanvas() {
    if (!_engineLoaded) return;

    var state = window.tbGetState();
    var selectedId = window.tbGetSelectedId ? window.tbGetSelectedId() : null;
    var pendingFrom = window.tbGetPendingCableFrom ? window.tbGetPendingCableFrom() : null;
    var deviceTypes = window.tbGetDeviceTypes ? window.tbGetDeviceTypes() : {};
    var cableTypes = window.tbGetCableTypes ? window.tbGetCableTypes() : {};
    if (!state) return;

    var svg = document.getElementById('tbv2-canvas-svg');
    if (!svg) return;

    // Get or create the cable and device layers
    var cabLayer = document.getElementById('tbv2-cables-layer');
    var devLayer = document.getElementById('tbv2-devices-layer');
    if (!cabLayer) {
      cabLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      cabLayer.id = 'tbv2-cables-layer';
      svg.appendChild(cabLayer);
    }
    if (!devLayer) {
      devLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      devLayer.id = 'tbv2-devices-layer';
      svg.appendChild(devLayer);
    }

    var isLight = document.documentElement.getAttribute('data-theme') === 'light';

    // ── Cables (drawn under devices) ──────────────────────────────
    var cabHtml = '';
    for (var ci = 0; ci < state.cables.length; ci++) {
      var c = state.cables[ci];
      var from = null, to = null;
      for (var di = 0; di < state.devices.length; di++) {
        if (state.devices[di].id === c.from) from = state.devices[di];
        if (state.devices[di].id === c.to) to = state.devices[di];
      }
      if (!from || !to) continue;

      var selected = selectedId === c.id ? ' v2-cable-selected' : '';
      var p1 = _edgePoint(from.x, from.y, to.x, to.y);
      var p2 = _edgePoint(to.x, to.y, from.x, from.y);
      var cType = c.type || 'cat6';
      var meta = cableTypes[cType] || cableTypes.cat6 || { color: '#a78bfa', width: 7, dash: '' };

      // Quadratic curve with 16px sag (matches V1)
      var mx = (p1.x + p2.x) / 2;
      var my = (p1.y + p2.y) / 2 + 16;
      var dAttr = 'M ' + p1.x + ' ' + p1.y + ' Q ' + mx + ' ' + my + ' ' + p2.x + ' ' + p2.y;
      var dashAttr = meta.dash ? ' stroke-dasharray="' + meta.dash + '"' : '';

      // Cable health status
      var cableStatus = '';
      var fromIfc = from.interfaces ? from.interfaces.find(function(i) { return i.cableId === c.id; }) : null;
      var toIfc = to.interfaces ? to.interfaces.find(function(i) { return i.cableId === c.id; }) : null;
      var fromHasIp = (fromIfc && fromIfc.ip) || from.type === 'switch' || from.type === 'dmz-switch' || from.type === 'cloud';
      var toHasIp = (toIfc && toIfc.ip) || to.type === 'switch' || to.type === 'dmz-switch' || to.type === 'cloud';
      if (fromHasIp && toHasIp) cableStatus = ' v2-cable-healthy';
      else if (fromHasIp || toHasIp) cableStatus = ' v2-cable-partial';

      // Three-layer render: sheath (shadow) + conductor + hitbox
      cabHtml += '<path class="v2-cable-sheath" d="' + dAttr + '" stroke="#0b1020" stroke-width="' + (meta.width + 5) + '" stroke-linecap="round" fill="none" opacity="0.7" pointer-events="none"/>';
      cabHtml += '<path class="v2-cable v2-cable-' + cType + selected + cableStatus + '" d="' + dAttr + '" stroke="' + meta.color + '" stroke-width="' + meta.width + '" stroke-linecap="round" fill="none"' + dashAttr + ' pointer-events="none"/>';
      cabHtml += '<path class="v2-cable-hit" data-v2-cable="' + c.id + '" d="' + dAttr + '" stroke="transparent" stroke-width="20" stroke-linecap="round" fill="none" style="cursor:pointer"/>';
    }
    cabLayer.innerHTML = cabHtml;

    // ── Devices ───────────────────────────────────────────────────
    var devHtml = '';
    for (var i = 0; i < state.devices.length; i++) {
      var d = state.devices[i];
      var dmeta = deviceTypes[d.type];
      if (!dmeta) continue;

      var selCls = selectedId === d.id ? ' v2-device-selected' : '';
      var pendCls = pendingFrom === d.id ? ' v2-device-pending' : '';

      // Health badge logic (matches V1)
      var isEndpoint = ['pc','laptop','smartphone','game-console','smart-tv','server','printer','voip','iot'].indexOf(d.type) !== -1;
      var isRoutable = ['router','firewall','isp-router'].indexOf(d.type) !== -1;
      var isSwitch = d.type === 'switch' || d.type === 'dmz-switch';
      var hasCable = state.cables.some(function(cab) { return cab.from === d.id || cab.to === d.id; });
      var hasIp = d.interfaces ? d.interfaces.some(function(ifc) { return ifc.ip; }) : false;
      var hasGw = d.interfaces ? d.interfaces.some(function(ifc) { return ifc.gateway; }) : false;

      var healthColor = '';
      if (hasCable && ((isEndpoint && hasIp && hasGw) || (isRoutable && hasIp) || (isSwitch && hasCable) || (!isEndpoint && !isRoutable && !isSwitch))) {
        healthColor = '#22c55e';
      } else if (hasCable && (hasIp || isSwitch)) {
        healthColor = '#f59e0b';
      } else if (hasCable) {
        healthColor = '#ef4444';
      }

      var labelFill = isLight ? '#1e293b' : '#e2e8f0';
      var badgeStroke = isLight ? '#ffffff' : '#0f172a';
      var healthBadge = healthColor
        ? '<circle cx="40" cy="-28" r="5" fill="' + healthColor + '" stroke="' + badgeStroke + '" stroke-width="1.5" class="v2-health-badge"/>'
        : '';

      // Device icon — reuse V1's tbDeviceIcon if available, else fallback
      var iconSvg = '';
      if (typeof window.tbDeviceIcon === 'function') {
        iconSvg = window.tbDeviceIcon(d.type, dmeta.color);
      } else {
        // Fallback: simple colored rect with type abbreviation
        iconSvg = '<rect x="-16" y="-16" width="32" height="32" rx="4" fill="' + dmeta.color + '" fill-opacity="0.3"/>'
          + '<text text-anchor="middle" dy="5" font-size="12" font-weight="700" fill="' + dmeta.color + '">' + _esc(dmeta.short || '?') + '</text>';
      }

      devHtml += '<g class="v2-device' + selCls + pendCls + '" data-v2-device="' + d.id + '" transform="translate(' + d.x + ', ' + d.y + ')">'
        + '<rect class="v2-device-bg" x="-48" y="-36" width="96" height="72" rx="10" ry="10"'
        + ' fill="' + dmeta.color + '" fill-opacity="' + (isLight ? '0.12' : '0.18') + '"'
        + ' stroke="' + dmeta.color + '" stroke-width="2"/>'
        + '<g transform="scale(0.72) translate(0, 4)">' + iconSvg + '</g>'
        + '<text class="v2-device-label" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="' + labelFill + '">' + _esc(d.hostname || dmeta.label) + '</text>'
        + healthBadge
        + '</g>';
    }
    devLayer.innerHTML = devHtml;

    // ── Empty state toggle ────────────────────────────────────────
    var emptyEl = document.getElementById('tbv2-empty');
    if (emptyEl) {
      emptyEl.style.display = state.devices.length > 0 ? 'none' : '';
    }

    // ── Device count pill ─────────────────────────────────────────
    var countPill = document.getElementById('tbv2-device-count');
    if (countPill) {
      countPill.textContent = state.devices.length + ' device' + (state.devices.length !== 1 ? 's' : '');
    }
  }

  // Expose render so it can be called externally (e.g., after engine mutations)
  window.tbv2RenderCanvas = _renderCanvas;

  // ════════════════════════════════════════════════════════════════════
  // CANVAS INTERACTION — Ship #3
  // Device drag, palette add, selection, cable wiring, delete,
  // double-click config. All mutations flow through V1 bridge fns.
  // ════════════════════════════════════════════════════════════════════

  // ── SVG coordinate transform ──────────────────────────────────────
  function _clientToSvg(svg, clientX, clientY) {
    var pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    var ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    var r = pt.matrixTransform(ctm.inverse());
    return {
      x: Math.max(75, Math.min(TB_CANVAS_W - 75, r.x)),
      y: Math.max(60, Math.min(TB_CANVAS_H - 60, r.y))
    };
  }

  // ── Device mousedown — selection + drag start + dblclick detect ───
  function _onDeviceMouseDown(e) {
    if (_activeMode !== 'design') return;
    var g = e.target.closest('[data-v2-device]');
    if (!g) return;
    e.stopPropagation();
    e.preventDefault();
    var id = g.getAttribute('data-v2-device');

    // Double-click detection (manual — DOM recreation kills native dblclick)
    var now = Date.now();
    if (_lastClickDevId === id && now - _lastClickTime < DOUBLE_CLICK_MS) {
      _lastClickDevId = null;
      _lastClickTime = 0;
      _dragging = null;
      if (typeof window.tbOpenConfigPanel === 'function') {
        window.tbOpenConfigPanel(id);
      }
      return;
    }
    _lastClickDevId = id;
    _lastClickTime = now;

    var state = window.tbGetState ? window.tbGetState() : null;
    if (!state) return;
    var dev = null;
    for (var i = 0; i < state.devices.length; i++) {
      if (state.devices[i].id === id) { dev = state.devices[i]; break; }
    }
    if (!dev) return;

    // Cable wiring: if pending from another device, complete the cable
    var pendingFrom = window.tbGetPendingCableFrom ? window.tbGetPendingCableFrom() : null;
    if (pendingFrom && pendingFrom !== id) {
      // Sync cable type to V1 before adding
      if (typeof window.tbSetSelectedCableType === 'function') {
        window.tbSetSelectedCableType(_selectedCableType);
      }
      if (typeof window.tbAddCable === 'function') {
        window.tbAddCable(pendingFrom, id);
      }
      if (typeof window.tbSetPendingCableFrom === 'function') {
        window.tbSetPendingCableFrom(null);
      }
      if (typeof window.tbSetSelectedId === 'function') {
        window.tbSetSelectedId(null);
      }
      _renderCanvas();
      _updateStatus('Cable drawn. Keep building.');
      return;
    }

    // Start drag
    var svg = document.getElementById('tbv2-canvas-svg');
    if (!svg) return;
    var svgPt = _clientToSvg(svg, e.clientX, e.clientY);
    _dragging = {
      id: id,
      offsetX: svgPt.x - dev.x,
      offsetY: svgPt.y - dev.y,
      moved: false,
      startX: dev.x,
      startY: dev.y
    };

    // Select device
    if (typeof window.tbSetSelectedId === 'function') {
      window.tbSetSelectedId(id);
    }
    _renderCanvas();
  }

  // ── Mouse move — drag device ──────────────────────────────────────
  function _onMouseMove(e) {
    if (!_dragging) return;
    var svg = document.getElementById('tbv2-canvas-svg');
    if (!svg) return;
    var svgPt = _clientToSvg(svg, e.clientX, e.clientY);
    var state = window.tbGetState ? window.tbGetState() : null;
    if (!state) return;
    var dev = null;
    for (var i = 0; i < state.devices.length; i++) {
      if (state.devices[i].id === _dragging.id) { dev = state.devices[i]; break; }
    }
    if (!dev) return;

    var nx = Math.round(svgPt.x - _dragging.offsetX);
    var ny = Math.round(svgPt.y - _dragging.offsetY);
    if (Math.abs(nx - _dragging.startX) > 3 || Math.abs(ny - _dragging.startY) > 3) {
      _dragging.moved = true;
    }
    dev.x = Math.max(55, Math.min(TB_CANVAS_W - 55, nx));
    dev.y = Math.max(45, Math.min(TB_CANVAS_H - 45, ny));
    _renderCanvas();
  }

  // ── Mouse up — end drag or start cable pending ────────────────────
  function _onMouseUp(e) {
    if (!_dragging) return;
    var id = _dragging.id;
    var moved = _dragging.moved;
    _dragging = null;

    if (moved) {
      // Device was dragged — save the new position
      var state = window.tbGetState ? window.tbGetState() : null;
      if (state) state.updated = Date.now();
      if (typeof window.tbSaveDraft === 'function') window.tbSaveDraft();
      _updateStatus('Moved. Click another device to wire a cable.');
    } else {
      // Click without drag — toggle cable pending mode
      var pending = window.tbGetPendingCableFrom ? window.tbGetPendingCableFrom() : null;
      if (pending === id) {
        // Click same device again — cancel pending
        if (typeof window.tbSetPendingCableFrom === 'function') window.tbSetPendingCableFrom(null);
        _updateStatus('Cable cancelled.');
      } else {
        // Start pending cable from this device
        if (typeof window.tbSetPendingCableFrom === 'function') window.tbSetPendingCableFrom(id);
        _updateStatus('Click a second device to draw the cable, or click again to cancel.');
      }
      _renderCanvas();
    }
  }

  // ── Canvas click (empty area) — deselect ──────────────────────────
  function _onCanvasClick(e) {
    if (_activeMode !== 'design') return;
    // Only deselect if clicking empty canvas area (not on a device or cable)
    if (e.target.closest('[data-v2-device]') || e.target.closest('[data-v2-cable]')) return;
    if (typeof window.tbSetSelectedId === 'function') window.tbSetSelectedId(null);
    if (typeof window.tbSetPendingCableFrom === 'function') window.tbSetPendingCableFrom(null);
    _renderCanvas();
  }

  // ── Cable click — select cable ────────────────────────────────────
  function _onCableClick(e) {
    if (_activeMode !== 'design') return;
    var hit = e.target.closest('[data-v2-cable]');
    if (!hit) return;
    e.stopPropagation();
    var cableId = hit.getAttribute('data-v2-cable');
    if (typeof window.tbSetSelectedId === 'function') window.tbSetSelectedId(cableId);
    if (typeof window.tbSetPendingCableFrom === 'function') window.tbSetPendingCableFrom(null);
    _renderCanvas();
  }

  // ── Palette click — add device at canvas center ───────────────────
  function _onPaletteDeviceClick(e) {
    if (_activeMode !== 'design') return;
    var btn = e.target.closest('.dev-btn[data-type]');
    if (!btn) return;
    var type = btn.getAttribute('data-type');
    if (!type) return;

    // Place at a staggered position near center to avoid stacking
    var state = window.tbGetState ? window.tbGetState() : null;
    var count = state ? state.devices.length : 0;
    var cx = TB_CANVAS_W / 2 + ((count % 5) - 2) * 120;
    var cy = TB_CANVAS_H / 2 + (Math.floor(count / 5) % 3 - 1) * 100;

    if (typeof window.tbAddDevice === 'function') {
      window.tbAddDevice(type, cx, cy);
    }
    _renderCanvas();
    _updateStatus(_esc(type) + ' added. Drag to position, click to wire cables.');
  }

  // ── Cable chip click — select cable type ──────────────────────────
  function _onCableChipClick(e) {
    var chip = e.target.closest('.cable-chip[data-cable]');
    if (!chip) return;
    _selectedCableType = chip.getAttribute('data-cable');
    // Sync to V1 engine
    if (typeof window.tbSetSelectedCableType === 'function') {
      window.tbSetSelectedCableType(_selectedCableType);
    }
    // Update chip active state
    var chips = document.querySelectorAll('#tbv2-palette-list .cable-chip');
    for (var i = 0; i < chips.length; i++) {
      if (chips[i].getAttribute('data-cable') === _selectedCableType) {
        chips[i].classList.add('on');
      } else {
        chips[i].classList.remove('on');
      }
    }
  }

  // ── Keyboard — Delete / Backspace / Escape ────────────────────────
  var _keyHandlerAttached = false;
  function _attachKeyHandler() {
    if (_keyHandlerAttached) return;
    _keyHandlerAttached = true;
    window.addEventListener('keydown', function(e) {
      var page = document.getElementById('page-topology-v2');
      if (!page || !page.classList.contains('active')) return;
      // Don't hijack if user is typing in an input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        var selId = window.tbGetSelectedId ? window.tbGetSelectedId() : null;
        if (selId) {
          e.preventDefault();
          if (typeof window.tbDeleteSelected === 'function') window.tbDeleteSelected();
          _renderCanvas();
        }
      } else if (e.key === 'Escape') {
        if (typeof window.tbSetSelectedId === 'function') window.tbSetSelectedId(null);
        if (typeof window.tbSetPendingCableFrom === 'function') window.tbSetPendingCableFrom(null);
        _renderCanvas();
        _updateStatus('Cancelled.');
      }
    });
  }

  // ── Status line helper ────────────────────────────────────────────
  function _updateStatus(msg) {
    var label = document.getElementById('tbv2-mode-label');
    if (!label) return;
    if (_activeMode === 'design') {
      label.innerHTML = '<b>Design</b> mode -- ' + msg;
    }
  }

  // ── Wire all interaction listeners ────────────────────────────────
  function _wireInteraction() {
    var svg = document.getElementById('tbv2-canvas-svg');
    if (!svg) return;

    // Device mousedown (event delegation on devices layer)
    svg.addEventListener('mousedown', _onDeviceMouseDown);

    // Global mousemove/mouseup for drag (attach to window for smooth drag)
    window.addEventListener('mousemove', _onMouseMove);
    window.addEventListener('mouseup', _onMouseUp);

    // Canvas click for deselect
    svg.addEventListener('click', _onCanvasClick);

    // Cable hitbox click
    svg.addEventListener('click', _onCableClick);

    // Palette device clicks (event delegation)
    var paletteList = document.getElementById('tbv2-palette-list');
    if (paletteList) {
      paletteList.addEventListener('click', _onPaletteDeviceClick);
      paletteList.addEventListener('click', _onCableChipClick);
    }

    // Keyboard handler
    _attachKeyHandler();
  }

  // ── Build the palette HTML ────────────────────────────────────────
  function _renderPalette(el) {
    var html = '';
    for (var ci = 0; ci < PALETTE.length; ci++) {
      var cat = PALETTE[ci];
      html += '<div class="cat">';
      html += '<div class="cat-h">' + _esc(cat.cat) + '</div>';
      for (var di = 0; di < cat.devices.length; di++) {
        var dev = cat.devices[di];
        html += '<button class="dev-btn" type="button" data-type="' + _esc(dev.type) + '">'
          + '<svg viewBox="0 0 24 24" fill="none">' + dev.icon + '</svg>'
          + _esc(dev.label)
          + '</button>';
      }
      html += '</div>';
    }
    // Cable type section
    html += '<div class="cable-section">';
    html += '<h3>Cable type</h3>';
    html += '<button class="cable-chip on" data-cable="cat6"><span class="dot"></span>Cat6</button>';
    html += '<button class="cable-chip" data-cable="fiber"><span class="dot"></span>Fiber</button>';
    html += '<button class="cable-chip" data-cable="coax"><span class="dot"></span>Coax</button>';
    html += '<button class="cable-chip" data-cable="console"><span class="dot"></span>Console</button>';
    html += '</div>';
    el.innerHTML = html;
  }

  // ── Build the modebar HTML ────────────────────────────────────────
  function _renderModebar(el) {
    var html = '';
    for (var i = 0; i < MODES.length; i++) {
      var m = MODES[i];
      if (m.id === '_sep') {
        html += '<span class="mb-sep"></span>';
        continue;
      }
      var cls = m.id === _activeMode ? ' on' : '';
      html += '<button class="mb' + cls + '" type="button" data-mode="' + m.id + '">'
        + '<svg viewBox="0 0 24 24" fill="none">' + m.icon + '</svg>'
        + _esc(m.label)
        + '</button>';
    }
    el.innerHTML = html;
  }

  // ── Build the scenario rail HTML ──────────────────────────────────
  function _renderScenarios(el) {
    var html = '<div class="palette-head"><h2>Scenarios</h2><p>Select to auto-populate.</p></div>';
    html += '<div class="scn">';
    for (var gi = 0; gi < SCENARIO_GROUPS.length; gi++) {
      var g = SCENARIO_GROUPS[gi];
      html += '<div class="scn-g">';
      html += '<div class="scn-gh">' + _esc(g.label);
      if (g.count) html += ' <span class="n">' + g.count + '</span>';
      html += '</div>';
      for (var ri = 0; ri < g.rows.length; ri++) {
        var r = g.rows[ri];
        var cls = r.active ? ' on' : '';
        html += '<button class="scn-row' + cls + '" type="button">'
          + '<span>' + _esc(r.name) + '</span>'
          + '<span class="dv">' + _esc(r.meta) + '</span>'
          + '</button>';
      }
      html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // ── Build the empty-state canvas ──────────────────────────────────
  function _renderEmptyState(canvasEl) {
    var el = document.createElement('div');
    el.className = 'empty-state';
    el.id = 'tbv2-empty';
    el.innerHTML = '<div class="empty-card">'
      + '<div class="empty-title">Start building</div>'
      + '<div class="empty-sub">Drag a device from the palette, select a scenario, or generate with AI.</div>'
      + '<div style="display:flex;gap:8px;justify-content:center;">'
      + '<button class="empty-btn primary" type="button">AI Generate</button>'
      + '<button class="empty-btn" type="button">Pick scenario</button>'
      + '</div>'
      + '<div class="empty-kbd"><kbd>D</kbd> to add device  ·  <kbd>C</kbd> to connect</div>'
      + '</div>';
    canvasEl.appendChild(el);
  }

  // ── Mode switching ────────────────────────────────────────────────
  function _setMode(modeId) {
    _activeMode = modeId;
    // Update modebar active state
    var bar = document.getElementById('tbv2-modebar');
    if (bar) {
      var btns = bar.querySelectorAll('.mb');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].dataset.mode === modeId) btns[i].classList.add('on');
        else btns[i].classList.remove('on');
      }
    }
    // Update mode label
    var label = document.getElementById('tbv2-mode-label');
    if (label) {
      var descriptions = {
        design: '<b>Design</b> mode · drag, connect, configure',
        simulate: '<b>Simulate</b> mode · run L2/L3 simulation',
        trace: '<b>Trace</b> mode · packet path analysis',
        labs: '<b>Labs</b> mode · guided topology exercises',
        threed: '<b>3D</b> mode · immersive view',
        coach: '<b>Coach</b> mode · AI topology review',
        grade: '<b>Grade</b> mode · scenario scoring',
        export: '<b>Export</b> mode · save and share',
      };
      label.innerHTML = descriptions[modeId] || '';
    }
    // Re-render canvas (future: mode-specific overlays)
    _renderCanvas();
  }
  // Expose for onclick
  window.tbv2SetMode = _setMode;

  // ── Load the V1 engine (lazy) ─────────────────────────────────────
  // V2 needs V1's engine for state + device icons + simulation.
  // _loadFeature is defined in app.js shell.
  function _ensureEngine() {
    return new Promise(function(resolve) {
      // Already loaded?
      if (typeof window.tbGetState === 'function') {
        _engineLoaded = true;
        resolve();
        return;
      }
      // Load V1 module (this also exposes tbGetState etc.)
      if (typeof window._loadFeature === 'function') {
        window._loadFeature('topology-builder').then(function() {
          _engineLoaded = true;
          resolve();
        }).catch(function() {
          // Engine load failed — V2 will render empty shell
          console.warn('TB V2: engine load failed, running in shell-only mode');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // ── Enter / Exit ──────────────────────────────────────────────────
  function enter() {
    _ensureCss();

    var paletteList = document.getElementById('tbv2-palette-list');
    var modebar = document.getElementById('tbv2-modebar');
    var scenarioRail = document.getElementById('tbv2-scenarios');
    var canvasWrap = document.querySelector('#page-topology-v2 .canvas');

    if (paletteList) _renderPalette(paletteList);
    if (modebar) {
      _renderModebar(modebar);
      // Wire mode switching via event delegation
      modebar.addEventListener('click', function(e) {
        var btn = e.target.closest('.mb[data-mode]');
        if (btn) _setMode(btn.dataset.mode);
      });
    }
    if (scenarioRail) _renderScenarios(scenarioRail);
    if (canvasWrap) _renderEmptyState(canvasWrap);

    // Wire palette search filter
    var searchInput = document.getElementById('tbv2-palette-search');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        var q = this.value.toLowerCase().trim();
        var btns = document.querySelectorAll('#tbv2-palette-list .dev-btn');
        for (var i = 0; i < btns.length; i++) {
          var match = !q || btns[i].textContent.toLowerCase().indexOf(q) !== -1;
          btns[i].style.display = match ? '' : 'none';
        }
        // Hide category headers if all children hidden
        var cats = document.querySelectorAll('#tbv2-palette-list .cat');
        for (var j = 0; j < cats.length; j++) {
          var visible = cats[j].querySelectorAll('.dev-btn:not([style*="display: none"])');
          cats[j].style.display = visible.length > 0 ? '' : 'none';
        }
      });
    }

    // Load the V1 engine, then render the canvas + wire interaction
    _ensureEngine().then(function() {
      _renderCanvas();
      _wireInteraction();
    });
  }

  function exit() {
    // Cleanup if needed when navigating away
  }

  // ── Module registration ───────────────────────────────────────────
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures['topology-builder-v2'] = { enter: enter, exit: exit };

  // Expose for sidebar handler
  window.openTopologyBuilderV2 = function() { enter(); };
})();
