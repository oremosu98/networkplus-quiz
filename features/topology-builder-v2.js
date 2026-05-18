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
    // Labs mode: compute highlight IDs once outside the loop
    var _labHL = (function() {
      if (_activeMode !== 'labs') return [];
      var al = window.tbV2GetActiveLab ? window.tbV2GetActiveLab() : null;
      return (al && al._highlightIds) ? al._highlightIds : [];
    })();
    var devHtml = '';
    for (var i = 0; i < state.devices.length; i++) {
      var d = state.devices[i];
      var dmeta = deviceTypes[d.type];
      if (!dmeta) continue;

      var selCls = selectedId === d.id ? ' v2-device-selected' : '';
      var pendCls = pendingFrom === d.id ? ' v2-device-pending' : '';
      var labTargetCls = (_labHL.length && _labHL.indexOf(d.id) !== -1) ? ' v2-lab-target' : '';

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

      devHtml += '<g class="v2-device' + selCls + pendCls + labTargetCls + '" data-v2-device="' + d.id + '" transform="translate(' + d.x + ', ' + d.y + ')">'
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
      var page = document.getElementById('page-topology-builder-v2');
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
    } else if (_activeMode === 'simulate') {
      label.innerHTML = '<b>Simulate</b> mode -- ' + msg;
    } else if (_activeMode === 'trace') {
      label.innerHTML = '<b>Trace</b> mode -- ' + msg;
    } else if (_activeMode === 'labs') {
      label.innerHTML = '<b>Labs</b> mode -- ' + msg;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // SIMULATE MODE — Ship #4
  // Dialog for source/dest device selection + protocol buttons (Ping,
  // ARP, DHCP). Log panel shows timestamped simulation results.
  // All sim calls go through V1 bridge: tbV2SimPing / tbV2SimARP /
  // tbV2SimDHCP. Packet animation via tbV2AnimatePacket.
  // ════════════════════════════════════════════════════════════════════

  var _simLogEntries = [];
  var _simStartTime = 0;
  var _simDialogWired = false;

  // ── Sim timestamp helper ──────────────────────────────────────────
  function _simTimestamp() {
    if (!_simStartTime) _simStartTime = Date.now();
    var elapsed = (Date.now() - _simStartTime) / 1000;
    var mins = Math.floor(elapsed / 60);
    var secs = (elapsed % 60).toFixed(1);
    return (mins > 0 ? String(mins).padStart(2, '0') + ':' : '00:')
      + (secs.length < 4 ? '0' + secs : secs);
  }

  // ── Build device options for sim dropdowns ────────────────────────
  function _buildDeviceOptions() {
    var state = window.tbGetState ? window.tbGetState() : null;
    if (!state || !state.devices || state.devices.length === 0) {
      return '<option value="">No devices</option>';
    }
    var html = '';
    for (var i = 0; i < state.devices.length; i++) {
      var d = state.devices[i];
      var ip = '';
      if (d.interfaces) {
        for (var j = 0; j < d.interfaces.length; j++) {
          if (d.interfaces[j].ip) { ip = d.interfaces[j].ip; break; }
        }
      }
      var label = _esc(d.hostname || d.type);
      if (ip) label += ' (' + _esc(ip) + ')';
      html += '<option value="' + _esc(d.id) + '">' + label + '</option>';
    }
    return html;
  }

  // ── Render the simulate dialog ────────────────────────────────────
  function _renderSimDialog() {
    var panels = document.getElementById('tbv2-panels');
    if (!panels) return;

    // Remove old dialog if exists
    var old = document.getElementById('tbv2-sim-dialog');
    if (old) old.remove();

    var deviceOpts = _buildDeviceOptions();
    var div = document.createElement('div');
    div.id = 'tbv2-sim-dialog';
    div.className = 'v2-sim-overlay';
    div.innerHTML =
      '<div class="v2-sim-card">'
      + '<div class="v2-sim-head">'
      +   '<div>'
      +     '<div class="v2-sim-eyebrow">Network simulation</div>'
      +     '<div class="v2-sim-title">Test connectivity</div>'
      +   '</div>'
      +   '<button class="v2-sim-close" type="button" id="tbv2-sim-close">'
      +     '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      +   '</button>'
      + '</div>'
      + '<div class="v2-sim-body">'
      +   '<div class="v2-sim-field">'
      +     '<label class="v2-sim-label">Source device</label>'
      +     '<select class="v2-sim-select" id="tbv2-sim-src">' + deviceOpts + '</select>'
      +   '</div>'
      +   '<div class="v2-sim-field">'
      +     '<label class="v2-sim-label">Destination</label>'
      +     '<select class="v2-sim-select" id="tbv2-sim-dst">' + deviceOpts + '</select>'
      +   '</div>'
      +   '<div class="v2-sim-proto-label">Protocol</div>'
      +   '<div class="v2-sim-actions">'
      +     '<button class="v2-sim-btn primary" type="button" data-proto="ping">'
      +       '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      +       'Ping'
      +     '</button>'
      +     '<button class="v2-sim-btn" type="button" data-proto="arp">'
      +       '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12h5l2-5 4 10 2-5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      +       'ARP request'
      +     '</button>'
      +     '<button class="v2-sim-btn" type="button" data-proto="dhcp">'
      +       '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3c3 2 6 5 6 9a6 6 0 0 1-12 0c0-4 3-7 6-9z" stroke="currentColor" stroke-width="1.5"/></svg>'
      +       'DHCP discover'
      +     '</button>'
      +   '</div>'
      + '</div>'
      + '</div>';
    panels.appendChild(div);
  }

  // ── Render the simulation log panel ───────────────────────────────
  function _renderSimLog() {
    var canvasWrap = document.querySelector('#page-topology-builder-v2 .canvas');
    if (!canvasWrap) return;

    var old = document.getElementById('tbv2-sim-log');
    if (old) old.remove();

    var div = document.createElement('div');
    div.id = 'tbv2-sim-log';
    div.className = 'v2-sim-log';
    div.innerHTML =
      '<div class="v2-sim-log-head">'
      + '<span class="v2-sim-log-title">Simulation log</span>'
      + '<button class="v2-sim-log-clear" type="button" id="tbv2-sim-log-clear">Clear</button>'
      + '</div>'
      + '<div class="v2-sim-log-body" id="tbv2-sim-log-body">'
      + '<div class="v2-sim-log-empty">Run a simulation to see results here.</div>'
      + '</div>';
    canvasWrap.appendChild(div);
  }

  // ── Append a log entry ────────────────────────────────────────────
  function _appendLogEntry(protocol, message, status) {
    var ts = _simTimestamp();
    var statusCls = status === 'ok' ? 'v2-sim-ok' : status === 'fail' ? 'v2-sim-fail' : 'v2-sim-info';
    var protoCls = protocol === 'ARP' ? 'v2-sim-arp' : protocol === 'DHCP' ? 'v2-sim-dhcp' : '';
    var entry = { ts: ts, protocol: protocol, message: message, statusCls: statusCls, protoCls: protoCls };
    _simLogEntries.push(entry);

    var body = document.getElementById('tbv2-sim-log-body');
    if (!body) return;

    // Remove empty placeholder
    var empty = body.querySelector('.v2-sim-log-empty');
    if (empty) empty.remove();

    var div = document.createElement('div');
    div.className = 'v2-sim-entry';
    div.innerHTML = '<span class="v2-sim-ts">' + _esc(ts) + '</span> '
      + '<span class="' + statusCls + (protoCls ? ' ' + protoCls : '') + '">' + _esc(protocol) + '</span> '
      + _esc(message);
    body.appendChild(div);

    // Auto-scroll to bottom
    body.scrollTop = body.scrollHeight;
  }

  // ── Parse sim result log lines into entries ───────────────────────
  function _parseSimLog(logLines, protocol) {
    if (!logLines || !logLines.length) return;
    for (var i = 0; i < logLines.length; i++) {
      var line = logLines[i];
      var status = 'ok';
      if (/unreachable|fail|no route|unknown|dropped|expired/i.test(line)) status = 'fail';
      else if (/ARP/i.test(line)) status = 'info';
      _appendLogEntry(protocol, line, status);
    }
  }

  // ── Get destination IP from device ID ─────────────────────────────
  function _getDeviceIp(deviceId) {
    var state = window.tbGetState ? window.tbGetState() : null;
    if (!state) return '';
    for (var i = 0; i < state.devices.length; i++) {
      var d = state.devices[i];
      if (d.id === deviceId && d.interfaces) {
        for (var j = 0; j < d.interfaces.length; j++) {
          if (d.interfaces[j].ip) return d.interfaces[j].ip;
        }
      }
    }
    return '';
  }

  // ── Run Ping ──────────────────────────────────────────────────────
  function _runPing() {
    var srcEl = document.getElementById('tbv2-sim-src');
    var dstEl = document.getElementById('tbv2-sim-dst');
    if (!srcEl || !dstEl) return;

    var srcId = srcEl.value;
    var dstId = dstEl.value;
    if (!srcId || !dstId) {
      _appendLogEntry('SYS', 'Select source and destination devices.', 'fail');
      return;
    }
    if (srcId === dstId) {
      _appendLogEntry('SYS', 'Source and destination must be different.', 'fail');
      return;
    }

    var dstIp = _getDeviceIp(dstId);
    if (!dstIp) {
      _appendLogEntry('SYS', 'Destination device has no IP address configured.', 'fail');
      return;
    }

    _appendLogEntry('ICMP', 'Ping ' + dstIp + ' from ' + (srcEl.options[srcEl.selectedIndex].text || srcId), 'ok');

    if (typeof window.tbV2SimPing === 'function') {
      var result = window.tbV2SimPing(srcId, dstIp);
      if (result && result.log) _parseSimLog(result.log, 'ICMP');
      // Animate packet on canvas
      if (result && result.path && typeof window.tbV2AnimatePacket === 'function') {
        window.tbV2AnimatePacket(result.path, result.success ? '#22c55e' : '#ef4444', 'ICMP');
      }
      _updateStatus(result && result.success ? 'Ping successful.' : 'Ping failed — check routing.');
    } else {
      _appendLogEntry('SYS', 'Simulation engine not loaded.', 'fail');
    }
  }

  // ── Run ARP ───────────────────────────────────────────────────────
  function _runARP() {
    var srcEl = document.getElementById('tbv2-sim-src');
    var dstEl = document.getElementById('tbv2-sim-dst');
    if (!srcEl || !dstEl) return;

    var srcId = srcEl.value;
    var dstId = dstEl.value;
    if (!srcId || !dstId) {
      _appendLogEntry('SYS', 'Select source and destination devices.', 'fail');
      return;
    }

    var dstIp = _getDeviceIp(dstId);
    if (!dstIp) {
      _appendLogEntry('SYS', 'Destination device has no IP address configured.', 'fail');
      return;
    }

    _appendLogEntry('ARP', 'ARP request: who has ' + dstIp + '?', 'info');

    if (typeof window.tbV2SimARP === 'function') {
      var result = window.tbV2SimARP(srcId, dstIp);
      if (result && result.log) _parseSimLog(result.log, 'ARP');
      if (result && result.path && typeof window.tbV2AnimatePacket === 'function') {
        window.tbV2AnimatePacket(result.path, '#3b82f6', 'ARP');
      }
      _updateStatus(result && result.success ? 'ARP resolved.' : 'ARP failed — no reply.');
    } else {
      _appendLogEntry('SYS', 'Simulation engine not loaded.', 'fail');
    }
  }

  // ── Run DHCP ──────────────────────────────────────────────────────
  function _runDHCP() {
    var srcEl = document.getElementById('tbv2-sim-src');
    if (!srcEl) return;

    var srcId = srcEl.value;
    if (!srcId) {
      _appendLogEntry('SYS', 'Select a client device.', 'fail');
      return;
    }

    _appendLogEntry('DHCP', 'DHCP discover from ' + (srcEl.options[srcEl.selectedIndex].text || srcId), 'info');

    if (typeof window.tbV2SimDHCP === 'function') {
      var result = window.tbV2SimDHCP(srcId);
      if (result && result.log) _parseSimLog(result.log, 'DHCP');
      _updateStatus(result && result.success ? 'DHCP lease obtained.' : 'DHCP failed — no server found.');
    } else {
      _appendLogEntry('SYS', 'Simulation engine not loaded.', 'fail');
    }
  }

  // ── Clear sim log ─────────────────────────────────────────────────
  function _clearSimLog() {
    _simLogEntries = [];
    _simStartTime = 0;
    var body = document.getElementById('tbv2-sim-log-body');
    if (body) {
      body.innerHTML = '<div class="v2-sim-log-empty">Run a simulation to see results here.</div>';
    }
  }

  // ── Show / hide simulate UI ───────────────────────────────────────
  function _showSimulateUI() {
    _renderSimDialog();
    _renderSimLog();
    _wireSimDialog();

    var dialog = document.getElementById('tbv2-sim-dialog');
    var log = document.getElementById('tbv2-sim-log');
    if (dialog) dialog.classList.add('v2-sim-visible');
    if (log) log.classList.add('v2-sim-visible');
  }

  function _hideSimulateUI() {
    var dialog = document.getElementById('tbv2-sim-dialog');
    var log = document.getElementById('tbv2-sim-log');
    if (dialog) { dialog.classList.remove('v2-sim-visible'); dialog.remove(); }
    if (log) { log.classList.remove('v2-sim-visible'); log.remove(); }
  }

  // ── Wire simulate dialog event handlers ───────────────────────────
  function _wireSimDialog() {
    // Close button
    var closeBtn = document.getElementById('tbv2-sim-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        _setMode('design');
      });
    }

    // Protocol buttons (event delegation)
    var dialog = document.getElementById('tbv2-sim-dialog');
    if (dialog) {
      dialog.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-proto]');
        if (!btn) return;
        var proto = btn.getAttribute('data-proto');
        if (proto === 'ping') _runPing();
        else if (proto === 'arp') _runARP();
        else if (proto === 'dhcp') _runDHCP();
      });
    }

    // Clear log button
    var clearBtn = document.getElementById('tbv2-sim-log-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', _clearSimLog);
    }

    // Overlay click to close
    var overlay = document.getElementById('tbv2-sim-dialog');
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) _setMode('design');
      });
    }
  }

  // ── Refresh sim dropdowns (called on mode enter) ──────────────────
  function _refreshSimDropdowns() {
    var srcEl = document.getElementById('tbv2-sim-src');
    var dstEl = document.getElementById('tbv2-sim-dst');
    var opts = _buildDeviceOptions();
    if (srcEl) srcEl.innerHTML = opts;
    if (dstEl) dstEl.innerHTML = opts;
    // Auto-select second device for destination if available
    if (dstEl && dstEl.options.length > 1) dstEl.selectedIndex = 1;
  }

  // ════════════════════════════════════════════════════════════════════
  // TRACE MODE — Ship #5
  // Trace initiation panel (replaces V1's browser prompt() dialog).
  // Source + destination device pickers with icons, protocol toggle
  // (Ping/Traceroute/HTTP/DNS), cancel + begin trace buttons.
  // Trace execution delegates to V1 bridge: tbV2StartTrace.
  // ════════════════════════════════════════════════════════════════════

  var _traceProtocol = 'ping';

  // ── Build device picker row (icon + name + IP) ────────────────────
  function _buildDevicePickerHtml(devices, selectedIndex) {
    if (!devices || devices.length === 0) {
      return '<div class="v2-ti-pick v2-ti-pick-empty">No devices with IPs</div>';
    }
    var d = devices[selectedIndex] || devices[0];
    var ip = '';
    if (d.interfaces) {
      for (var j = 0; j < d.interfaces.length; j++) {
        if (d.interfaces[j].ip) { ip = d.interfaces[j].ip; break; }
      }
    }
    // Device icon from V1's tbDeviceIcon or fallback
    var iconSvg = '';
    var deviceTypes = window.tbGetDeviceTypes ? window.tbGetDeviceTypes() : {};
    var meta = deviceTypes[d.type];
    if (typeof window.tbDeviceIcon === 'function' && meta) {
      iconSvg = window.tbDeviceIcon(d.type, meta.color);
    }
    if (!iconSvg) {
      // Fallback monoline icon based on type
      iconSvg = '<rect x="4" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>'
        + '<path d="M8 20h8M12 16v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
    }
    return '<div class="v2-ti-pick selected">'
      + '<div class="v2-ti-pick-icon"><svg viewBox="0 0 40 40" fill="none">' + iconSvg + '</svg></div>'
      + '<div class="v2-ti-pick-info">'
      + '<div class="v2-ti-pick-name">' + _esc(d.hostname || d.type) + '</div>'
      + '<div class="v2-ti-pick-ip">' + _esc(ip || 'No IP') + '</div>'
      + '</div>'
      + '<select class="v2-ti-select" data-role="device-select">' + _buildDeviceOptions() + '</select>'
      + '</div>';
  }

  // ── Get devices with IPs ──────────────────────────────────────────
  function _getDevicesWithIp() {
    var state = window.tbGetState ? window.tbGetState() : null;
    if (!state || !state.devices) return [];
    return state.devices.filter(function(d) {
      return d.interfaces && d.interfaces.some(function(ifc) { return ifc.ip; });
    });
  }

  // ── Render trace initiation panel ─────────────────────────────────
  function _renderTracePanel() {
    var panels = document.getElementById('tbv2-panels');
    if (!panels) return;

    var old = document.getElementById('tbv2-trace-panel');
    if (old) old.remove();

    var devices = _getDevicesWithIp();

    var div = document.createElement('div');
    div.id = 'tbv2-trace-panel';
    div.className = 'v2-trace-init';
    div.innerHTML =
      '<div class="v2-ti-head">'
      + '<div class="v2-ti-eyebrow">Packet trace</div>'
      + '<div class="v2-ti-title">Trace a path</div>'
      + '<div class="v2-ti-sub">Select source and destination, choose a protocol, then begin the trace. The packet path will animate hop-by-hop.</div>'
      + '</div>'
      + '<div class="v2-ti-body">'
      +   '<div class="v2-ti-field">'
      +     '<div class="v2-sim-label">Source</div>'
      +     '<div id="tbv2-trace-src-pick">' + _buildDevicePickerHtml(devices, 0) + '</div>'
      +   '</div>'
      +   '<div class="v2-ti-arrow">&darr;</div>'
      +   '<div class="v2-ti-field">'
      +     '<div class="v2-sim-label">Destination</div>'
      +     '<div id="tbv2-trace-dst-pick">' + _buildDevicePickerHtml(devices, devices.length > 1 ? 1 : 0) + '</div>'
      +   '</div>'
      +   '<div class="v2-sim-label" style="margin-top:12px;">Protocol</div>'
      +   '<div class="v2-ti-type-row">'
      +     '<button class="v2-ti-type on" type="button" data-trace-proto="ping">Ping</button>'
      +     '<button class="v2-ti-type" type="button" data-trace-proto="traceroute">Traceroute</button>'
      +     '<button class="v2-ti-type" type="button" data-trace-proto="http">HTTP</button>'
      +     '<button class="v2-ti-type" type="button" data-trace-proto="dns">DNS</button>'
      +   '</div>'
      + '</div>'
      + '<div class="v2-ti-foot">'
      +   '<button class="v2-ti-cancel" type="button">Cancel</button>'
      +   '<button class="v2-ti-begin" type="button">Begin trace</button>'
      + '</div>';
    panels.appendChild(div);
  }

  // ── Wire trace panel events ───────────────────────────────────────
  function _wireTracePanel() {
    var panel = document.getElementById('tbv2-trace-panel');
    if (!panel) return;

    // Protocol toggle
    panel.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-trace-proto]');
      if (btn) {
        _traceProtocol = btn.getAttribute('data-trace-proto');
        var allBtns = panel.querySelectorAll('[data-trace-proto]');
        for (var i = 0; i < allBtns.length; i++) {
          allBtns[i].classList.toggle('on', allBtns[i] === btn);
        }
      }
    });

    // Device select change — update the picker card visuals
    panel.addEventListener('change', function(e) {
      var sel = e.target.closest('[data-role="device-select"]');
      if (!sel) return;
      var deviceId = sel.value;
      var devices = _getDevicesWithIp();
      var idx = 0;
      for (var i = 0; i < devices.length; i++) {
        if (devices[i].id === deviceId) { idx = i; break; }
      }
      var pickContainer = sel.closest('#tbv2-trace-src-pick, #tbv2-trace-dst-pick');
      if (pickContainer) {
        pickContainer.innerHTML = _buildDevicePickerHtml(devices, idx);
        // Re-select the chosen option in the new select
        var newSel = pickContainer.querySelector('[data-role="device-select"]');
        if (newSel) newSel.value = deviceId;
      }
    });

    // Cancel button
    var cancelBtn = panel.querySelector('.v2-ti-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        _setMode('design');
      });
    }

    // Begin trace button
    var beginBtn = panel.querySelector('.v2-ti-begin');
    if (beginBtn) {
      beginBtn.addEventListener('click', function() {
        var srcSel = panel.querySelector('#tbv2-trace-src-pick [data-role="device-select"]');
        var dstSel = panel.querySelector('#tbv2-trace-dst-pick [data-role="device-select"]');
        if (!srcSel || !dstSel) return;

        var srcId = srcSel.value;
        var dstId = dstSel.value;
        if (!srcId || !dstId) {
          _updateStatus('Select source and destination devices.');
          return;
        }
        if (srcId === dstId) {
          _updateStatus('Source and destination must be different.');
          return;
        }

        var dstIp = _getDeviceIp(dstId);
        if (!dstIp) {
          _updateStatus('Destination has no IP configured.');
          return;
        }

        // Start the trace via V1 bridge
        if (typeof window.tbV2StartTrace === 'function') {
          window.tbV2StartTrace(srcId, dstIp);
          _updateStatus('Tracing packet path...');
          // Hide the init panel once trace starts
          var initPanel = document.getElementById('tbv2-trace-panel');
          if (initPanel) initPanel.classList.add('v2-trace-running');
        } else {
          _updateStatus('Trace engine not loaded.');
        }
      });
    }
  }

  // ── Show / hide trace UI ──────────────────────────────────────────
  function _showTraceUI() {
    _renderTracePanel();
    _wireTracePanel();
    var panel = document.getElementById('tbv2-trace-panel');
    if (panel) panel.classList.add('v2-trace-visible');
  }

  function _hideTraceUI() {
    var panel = document.getElementById('tbv2-trace-panel');
    if (panel) { panel.classList.remove('v2-trace-visible'); panel.remove(); }
    // End any active trace
    if (typeof window.tbV2EndTrace === 'function') {
      var traceState = window.tbV2GetTraceState ? window.tbV2GetTraceState() : null;
      if (traceState && traceState.active) window.tbV2EndTrace();
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // LABS MODE — Ship #6
  // Editorial picker → step panel → completion card.
  // All state owned by V1 (tbActiveLab). V2 reads via bridge getters
  // and writes via bridge mutators (tbV2StartLab / tbV2LabNext /
  // tbV2LabSkip / tbV2LabHint / tbV2ExitLab). Never touches tbState
  // directly — same strangler-fig contract as Ships #4 and #5.
  // ════════════════════════════════════════════════════════════════════

  var _labFilterCat = 'all';
  var _labStartTime = 0;

  // Convert **bold** and `code` markdown into safe HTML.
  function _parseMd(text) {
    var esc = _esc(text);
    return esc
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="v2-ls-code">$1</code>');
  }

  // Find a lab definition by id from V1's TB_LABS array.
  function _findLab(labId) {
    var labs = window.tbV2GetAllLabs ? window.tbV2GetAllLabs() : [];
    for (var i = 0; i < labs.length; i++) {
      if (labs[i].id === labId) return labs[i];
    }
    return null;
  }

  // ── Lab Picker ────────────────────────────────────────────────────
  function _renderLabPicker() {
    var cats = window.tbV2GetLabCategories ? window.tbV2GetLabCategories() : {};
    var allLabs = window.tbV2GetAllLabs ? window.tbV2GetAllLabs() : [];
    var catNames = Object.keys(cats);

    // Filter tabs: All + each category
    var tabsHtml = '<button class="v2-lp-tab' + (_labFilterCat === 'all' ? ' on' : '') + '" data-lp-cat="all">All</button>';
    for (var t = 0; t < catNames.length; t++) {
      var catN = catNames[t];
      tabsHtml += '<button class="v2-lp-tab' + (_labFilterCat === catN ? ' on' : '') + '" data-lp-cat="' + _esc(catN) + '">' + _esc(catN) + '</button>';
    }

    // Lab rows grouped by category
    var rowsHtml = '';
    for (var g = 0; g < catNames.length; g++) {
      var catKey = catNames[g];
      if (_labFilterCat !== 'all' && _labFilterCat !== catKey) continue;
      var labIds = cats[catKey];
      rowsHtml += '<div class="v2-lp-group">'
        + '<div class="v2-lp-grp-head">' + _esc(catKey)
        + ' <span class="v2-lp-grp-count">' + labIds.length + '</span></div>';
      for (var r = 0; r < labIds.length; r++) {
        var lab = null;
        for (var m = 0; m < allLabs.length; m++) {
          if (allLabs[m].id === labIds[r]) { lab = allLabs[m]; break; }
        }
        if (!lab) continue;
        var diffCls = lab.difficulty ? ' v2-lp-diff-' + lab.difficulty.toLowerCase() : '';
        rowsHtml += '<button class="v2-lp-row" data-lp-start="' + _esc(lab.id) + '">'
          + '<span class="v2-lp-row-title">' + _esc(lab.title) + '</span>'
          + '<span class="v2-lp-row-meta">'
          + '<span class="v2-lp-diff' + diffCls + '">' + _esc(lab.difficulty || '') + '</span>'
          + ' · ' + _esc(lab.duration || '')
          + '</span></button>';
      }
      rowsHtml += '</div>';
    }

    var canvasEl = document.querySelector('#page-topology-builder-v2 .canvas');
    if (!canvasEl) return;
    var existing = document.getElementById('tbv2-lab-picker');
    if (existing) existing.remove();

    var el = document.createElement('div');
    el.id = 'tbv2-lab-picker';
    el.className = 'v2-lp-overlay';
    el.innerHTML = '<div class="v2-lp-card">'
      + '<div class="v2-lp-head"><div>'
      + '<span class="v2-lp-eyebrow">Labs</span>'
      + '<h3>Guided Topology Exercises</h3></div>'
      + '<button class="v2-lp-close" id="tbv2-lp-close">×</button></div>'
      + '<div class="v2-lp-tabs">' + tabsHtml + '</div>'
      + '<div class="v2-lp-list">' + rowsHtml + '</div>'
      + '</div>';
    canvasEl.appendChild(el);
    _wireLabPicker();
  }

  function _wireLabPicker() {
    var overlay = document.getElementById('tbv2-lab-picker');
    if (!overlay) return;
    overlay.addEventListener('click', function(e) {
      if (e.target.closest('#tbv2-lp-close')) { _hideLabsUI(); _setMode('design'); return; }
      var tabBtn = e.target.closest('[data-lp-cat]');
      if (tabBtn) { _labFilterCat = tabBtn.dataset.lpCat; _renderLabPicker(); return; }
      var startBtn = e.target.closest('[data-lp-start]');
      if (startBtn) { _labStart(startBtn.dataset.lpStart); return; }
    });
  }

  // ── Lab Step Panel ────────────────────────────────────────────────
  function _renderLabStep(feedbackMsg) {
    var active = window.tbV2GetActiveLab ? window.tbV2GetActiveLab() : null;
    if (!active) return;
    var labDef = _findLab(active.labId);
    if (!labDef || !labDef.steps) return;
    var step = labDef.steps[active.stepIdx];
    if (!step) return;

    var totalSteps = labDef.steps.length;
    var stepIdx = active.stepIdx;
    var isLast = stepIdx >= totalSteps - 1;
    var pct = Math.round(((stepIdx + 1) / totalSteps) * 100);

    // Progress dots
    var dotsHtml = '';
    for (var di = 0; di < totalSteps; di++) {
      dotsHtml += '<span class="v2-ls-dot'
        + (di === stepIdx ? ' on' : (di < stepIdx ? ' done' : '')) + '"></span>';
    }

    // Hint
    var hintShown = (active.hintsUsed || 0) > 0;
    var hintHtml = step.hint
      ? '<div class="v2-ls-hint-row">'
        + '<button class="v2-ls-hint-btn" id="tbv2-lab-hint-btn">' + (hintShown ? 'Hide hint' : 'Show hint') + '</button>'
        + (hintShown ? '<p class="v2-ls-hint-text">' + _parseMd(step.hint) + '</p>' : '')
        + '</div>'
      : '';

    // Inline feedback (from failed check)
    var feedbackHtml = feedbackMsg
      ? '<p class="v2-ls-feedback">' + _esc(feedbackMsg) + '</p>'
      : '';

    var canvasEl = document.querySelector('#page-topology-builder-v2 .canvas');
    if (!canvasEl) return;
    var existing = document.getElementById('tbv2-lab-step');
    if (existing) existing.remove();

    var el = document.createElement('div');
    el.id = 'tbv2-lab-step';
    el.className = 'v2-lab-step';
    el.innerHTML = '<div class="v2-ls-header">'
      + '<div class="v2-ls-dots">' + dotsHtml + '</div>'
      + '<div class="v2-ls-pbar"><div class="v2-ls-pbar-fill" style="width:' + pct + '%"></div></div>'
      + '<div class="v2-ls-meta"><span class="v2-ls-lab-title">' + _esc(labDef.title) + '</span>'
      + ' · Step <strong>' + (stepIdx + 1) + '</strong> of ' + totalSteps + '</div>'
      + '</div>'
      + '<div class="v2-ls-body">'
      + '<p class="v2-ls-step-title">' + _esc(step.title || '') + '</p>'
      + '<p class="v2-ls-instruction">' + _parseMd(step.instruction || '') + '</p>'
      + hintHtml + feedbackHtml
      + '</div>'
      + '<div class="v2-ls-foot">'
      + '<button class="v2-ls-btn v2-ls-skip" id="tbv2-lab-skip-btn">Skip</button>'
      + '<button class="v2-ls-btn v2-ls-next" id="tbv2-lab-next-btn">'
      + (isLast ? 'Finish ✓' : 'Next →') + '</button>'
      + '</div>';
    canvasEl.appendChild(el);
    _wireLabStep();
  }

  function _wireLabStep() {
    var el = document.getElementById('tbv2-lab-step');
    if (!el) return;
    el.addEventListener('click', function(e) {
      if (e.target.closest('#tbv2-lab-hint-btn')) { _labStepHint(); return; }
      if (e.target.closest('#tbv2-lab-skip-btn')) { _labStepSkip(); return; }
      if (e.target.closest('#tbv2-lab-next-btn')) { _labStepNext(); return; }
    });
  }

  // ── Lab Completion Card ───────────────────────────────────────────
  function _renderLabComplete(labDef, hintsUsed) {
    var stepEl = document.getElementById('tbv2-lab-step');
    if (stepEl) stepEl.remove();

    var canvasEl = document.querySelector('#page-topology-builder-v2 .canvas');
    if (!canvasEl) return;
    var existing = document.getElementById('tbv2-lab-complete');
    if (existing) existing.remove();

    var elapsed = Math.round((Date.now() - _labStartTime) / 1000);
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    var timeStr = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
    var totalSteps = labDef ? (labDef.steps || []).length : 0;

    var el = document.createElement('div');
    el.id = 'tbv2-lab-complete';
    el.className = 'v2-lab-complete';
    el.innerHTML = '<div class="v2-lc-inner">'
      + '<div class="v2-lc-check">✓</div>'
      + '<p class="v2-lc-eyebrow">Lab complete</p>'
      + '<h3 class="v2-lc-title">' + _esc(labDef ? labDef.title : 'Lab') + '</h3>'
      + '<div class="v2-lc-stats">'
      + '<div class="v2-lc-stat"><span class="v2-lc-stat-n">' + timeStr + '</span><span class="v2-lc-stat-l">Time</span></div>'
      + '<div class="v2-lc-stat"><span class="v2-lc-stat-n">' + totalSteps + '</span><span class="v2-lc-stat-l">Steps</span></div>'
      + '<div class="v2-lc-stat"><span class="v2-lc-stat-n">' + (hintsUsed || 0) + '</span><span class="v2-lc-stat-l">Hints</span></div>'
      + '</div>'
      + '<div class="v2-lc-foot">'
      + '<button class="v2-lc-btn v2-lc-back" id="tbv2-lc-back-btn">Back to Labs</button>'
      + '</div></div>';
    canvasEl.appendChild(el);
    _wireLabComplete();
  }

  function _wireLabComplete() {
    var el = document.getElementById('tbv2-lab-complete');
    if (!el) return;
    el.addEventListener('click', function(e) {
      if (e.target.closest('#tbv2-lc-back-btn')) {
        el.remove();
        _labFilterCat = 'all';
        _renderLabPicker();
      }
    });
  }

  // ── Lab Action Handlers ───────────────────────────────────────────
  function _labStart(labId) {
    var picker = document.getElementById('tbv2-lab-picker');
    if (picker) picker.remove();
    _labStartTime = Date.now();
    if (window.tbV2StartLab) window.tbV2StartLab(labId);
    _renderLabStep();
    _renderCanvas();
  }

  function _labStepNext() {
    var active = window.tbV2GetActiveLab ? window.tbV2GetActiveLab() : null;
    if (!active) return;
    var labDef = _findLab(active.labId);
    if (!labDef || !labDef.steps) return;
    var step = labDef.steps[active.stepIdx];
    if (!step) return;
    var state = window.tbGetState ? window.tbGetState() : null;
    if (!state) return;

    var isLast = active.stepIdx >= labDef.steps.length - 1;
    var checkPassed = step.check(state);

    if (!checkPassed && !isLast) {
      // Show inline feedback — do not advance
      var msg = (typeof step.feedback === 'function' && step.feedback(state)) || 'Complete this step first.';
      _renderLabStep(msg);
      return;
    }

    var hintsUsed = active.hintsUsed || 0;

    if (isLast) {
      // Complete the lab: capture data before tbEndLab nulls tbActiveLab
      if (window.tbV2ExitLab) window.tbV2ExitLab();
      _renderLabComplete(labDef, hintsUsed);
      _renderCanvas();
    } else {
      // Advance to next step via V1 bridge (V1 handles stepIdx++ + tbRenderLabStep)
      if (window.tbV2LabNext) window.tbV2LabNext();
      _renderLabStep();
      _renderCanvas();
    }
  }

  function _labStepHint() {
    if (window.tbV2LabHint) window.tbV2LabHint();
    _renderLabStep(); // Re-render to expose/hide hint
  }

  function _labStepSkip() {
    if (window.tbV2LabSkip) window.tbV2LabSkip();
    var activeAfter = window.tbV2GetActiveLab ? window.tbV2GetActiveLab() : null;
    if (!activeAfter) {
      // Last step was skipped — go back to picker
      var stepEl = document.getElementById('tbv2-lab-step');
      if (stepEl) stepEl.remove();
      _labFilterCat = 'all';
      _renderLabPicker();
    } else {
      _renderLabStep();
      _renderCanvas();
    }
  }

  // ── Labs Show / Hide ──────────────────────────────────────────────
  function _showLabsUI() {
    _labFilterCat = 'all';
    _ensureEngine().then(function() {
      _renderLabPicker();
    });
  }

  function _hideLabsUI() {
    var picker = document.getElementById('tbv2-lab-picker');
    if (picker) picker.remove();
    var stepEl = document.getElementById('tbv2-lab-step');
    if (stepEl) stepEl.remove();
    var completeEl = document.getElementById('tbv2-lab-complete');
    if (completeEl) completeEl.remove();
    // Exit any active lab cleanly
    if (window.tbV2ExitLab && window.tbV2GetActiveLab && window.tbV2GetActiveLab()) {
      window.tbV2ExitLab();
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
    // ── Mode-specific UI ─────────────────────────────────────────
    if (modeId === 'simulate') {
      _showSimulateUI();
    } else {
      _hideSimulateUI();
    }
    if (modeId === 'trace') {
      _showTraceUI();
    } else {
      _hideTraceUI();
    }
    if (modeId === 'labs') {
      _showLabsUI();
    } else {
      _hideLabsUI();
    }

    // Re-render canvas
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
    var canvasWrap = document.querySelector('#page-topology-builder-v2 .canvas');

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
