// features/topology-builder-v3.js — v6.x Network Builder revamp
//
// Lazy-loaded via _loadFeature('topology-builder-v3') from the sidebar entry.
// Replaces v1 (features/topology-builder.js) and v2 (features/topology-builder-v2.js).
//
// 3 intents (Free Build / Lab / PBQ) × 5 action modes (Design / Simulate / Trace / OSI / 3D)
// + Export pinned right. Infinite canvas with pan/zoom/minimap. Forged-bronze editorial.
//
// Phase 1 ships: Free Build intent + Design mode + canvas + palette + save state + PNG export.
// Phases 2-9 layer on Scenarios / Simulate / Trace / OSI / 3D / Coach / PBQ / retire-v1-v2.

(function () {
  'use strict';

  // ───────────────────────────────────────────────────────────
  // STATE (single source of truth, serialised to STORAGE.TB_V3_DRAFT)
  // ───────────────────────────────────────────────────────────

  var state = {
    devices: [],           // [{id, type, x, y, label, config}]
    cables: [],            // [{id, fromId, fromPort, toId, toPort}]
    viewport: { x: 0, y: 0, zoom: 1 }, // pan offset + zoom
    intent: 'free-build',  // 'free-build' | 'lab' | 'pbq'
    mode: 'design',        // 'design' | 'simulate' | 'trace' | 'osi' | '3d'
    selectedId: null,      // currently-selected device id (or null)
  };

  // ───────────────────────────────────────────────────────────
  // CSS LOADING (single-call from enter())
  // ───────────────────────────────────────────────────────────

  function _ensureCss() {
    if (document.querySelector('link[href*="topology-builder-v3.css"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/features/topology-builder-v3.css?v=' + (window.APP_VERSION || 'dev');
    document.head.appendChild(link);
  }

  // ───────────────────────────────────────────────────────────
  // ENTRY POINT (called by sidebar handler)
  // ───────────────────────────────────────────────────────────

  function openTopologyBuilderV3() {
    _ensureCss();
    _loadState();
    _renderWorkspace();
  }

  // ───────────────────────────────────────────────────────────
  // PURE FUNCTIONS (testable in isolation via vm-sandbox)
  // ───────────────────────────────────────────────────────────

  function buildDevice(type, x, y) {
    return {
      id: 'dev_' + Date.now().toString(36) + '_' + Math.floor(Math.random()*1296).toString(36).padStart(2,'0'),
      type: type,
      x: x,
      y: y,
      label: '',
      config: {},
    };
  }

  function buildCable(fromId, fromPort, toId, toPort) {
    return {
      id: 'cbl_' + Date.now().toString(36) + '_' + Math.floor(Math.random()*1296).toString(36).padStart(2,'0'),
      fromId: fromId,
      fromPort: fromPort || 0,
      toId: toId,
      toPort: toPort || 0,
    };
  }

  function serialiseState(s) {
    return JSON.stringify({
      devices: s.devices,
      cables: s.cables,
      viewport: s.viewport,
      intent: s.intent,
      mode: s.mode,
    });
  }

  function parseState(json) {
    try {
      var parsed = JSON.parse(json || '{}');
      return {
        devices: Array.isArray(parsed.devices) ? parsed.devices : [],
        cables: Array.isArray(parsed.cables) ? parsed.cables : [],
        viewport: (parsed.viewport && typeof parsed.viewport === 'object')
          ? { x: parsed.viewport.x || 0, y: parsed.viewport.y || 0, zoom: parsed.viewport.zoom || 1 }
          : { x: 0, y: 0, zoom: 1 },
        intent: parsed.intent || 'free-build',
        mode: parsed.mode || 'design',
        selectedId: null,
      };
    } catch (e) {
      return { devices: [], cables: [], viewport: { x: 0, y: 0, zoom: 1 }, intent: 'free-build', mode: 'design', selectedId: null };
    }
  }

  // ───────────────────────────────────────────────────────────
  // SAVE / LOAD (TASK 6.x)
  // ───────────────────────────────────────────────────────────

  var _saveTimer = null;
  function _saveState() { /* TASK 6.2 */ }
  function _loadState() { /* TASK 6.3 */ }

  // ───────────────────────────────────────────────────────────
  // WORKSPACE RENDER (TASK 1.x)
  // ───────────────────────────────────────────────────────────

  function _renderWorkspace() {
    var host = document.getElementById('page-topology-builder-v3');
    if (!host) return;

    host.innerHTML =
      // Strip header
      '<div class="tb3-strip">' +
        '<span class="tb3-eyb">Net+ &middot; N10-009</span>' +
        '<span class="tb3-title">Network <em>builder.</em></span>' +
        '<div class="tb3-strip-r">' +
          '<span id="tb3-device-count">0 devices &middot; 0 cables</span>' +
          '<span id="tb3-theme-toggle" class="tb3-rrail-btn" style="width:28px;height:28px;border:1px solid var(--tb3-border-soft)" title="Toggle theme">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke-linecap="round"/></svg>' +
          '</span>' +
        '</div>' +
      '</div>' +

      // Mode bar
      '<div class="tb3-bar">' +
        '<div class="tb3-intent" id="tb3-intent-chip">' +
          '<span class="tb3-intent-dot"></span>' +
          '<div style="display:flex;flex-direction:column;gap:2px">' +
            '<span class="tb3-intent-lbl">Intent</span>' +
            '<span class="tb3-intent-name" id="tb3-intent-name">Free Build</span>' +
          '</div>' +
          '<span style="margin-left:auto;color:var(--tb3-text-dim);font-size:10px">&#9662;</span>' +
        '</div>' +
        '<div class="tb3-modes" id="tb3-modes-row">' +
          // Modes injected by _renderModeBar (Task 7.1)
        '</div>' +
        '<div class="tb3-bar-r">' +
          '<div class="tb3-mode" id="tb3-export-btn">' +
            '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3v12M5 10l7 7 7-7M5 21h14"/></svg>' +
            'Export' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Body
      '<div class="tb3-body" id="tb3-body">' +
        '<div class="tb3-palette" id="tb3-palette"></div>' +
        '<div class="tb3-canvas-wrap" id="tb3-canvas-wrap">' +
          '<svg class="tb3-canvas-svg" id="tb3-canvas-svg"></svg>' +
          '<div class="tb3-canvas-chip" id="tb3-canvas-chip"></div>' +
          '<div class="tb3-canvas-zoom">' +
            '<div class="tb3-zoom-btn" id="tb3-zoom-out">&minus;</div>' +
            '<div class="tb3-zoom-pct" id="tb3-zoom-pct">100%</div>' +
            '<div class="tb3-zoom-btn" id="tb3-zoom-in">+</div>' +
          '</div>' +
          '<div class="tb3-minimap" id="tb3-minimap">' +
            '<div class="tb3-minimap-inner" id="tb3-minimap-inner"></div>' +
          '</div>' +
        '</div>' +
        '<div class="tb3-rrail" id="tb3-rrail">' +
          '<div class="tb3-rrail-btn locked" title="Inspector (active when device selected)">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>' +
          '</div>' +
          '<div class="tb3-rrail-btn locked" title="Scenarios (Phase 2)">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 5v14"/></svg>' +
          '</div>' +
          '<div class="tb3-rrail-btn locked" title="Coach (Phase 7)">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z"/></svg>' +
          '</div>' +
        '</div>' +
        '<div class="tb3-inspector" id="tb3-inspector"></div>' +
      '</div>' +

      // Status bar
      '<div class="tb3-status">' +
        '<span id="tb3-status-intent">Free Build</span>' +
        '<span id="tb3-status-mode" class="accent">Design</span>' +
        '<span id="tb3-status-save" class="pass">&middot; saved</span>' +
        '<span class="stat-r">' +
          '<span>space + drag &middot; pan</span>' +
          '<span>scroll &middot; zoom</span>' +
          '<span>del &middot; remove</span>' +
        '</span>' +
      '</div>';

    _renderModeBar();   // Task 7.1
    _renderPalette();   // Task 3.1
    _renderCanvas();    // Task 2.1
    _wirePanZoom();     // Task 2.3
    _renderMinimap();   // Task 2.5
    _wireDragToCanvas();// Task 3.3
    _wireCableDrawing();// Task 4.1
    _wireGlobalKeys();  // Task 5.3
    _wireExport();      // Task 8.2
  }

  function _updateDeviceCount() {
    var el = document.getElementById('tb3-device-count');
    if (el) {
      el.textContent = state.devices.length + ' device' + (state.devices.length === 1 ? '' : 's') +
                       ' · ' + state.cables.length + ' cable' + (state.cables.length === 1 ? '' : 's');
    }
  }

  // ───────────────────────────────────────────────────────────
  // CANVAS (TASK 2.x)
  // ───────────────────────────────────────────────────────────

  function _renderCanvas() {
    var svg = document.getElementById('tb3-canvas-svg');
    if (!svg) return;

    var wrap = document.getElementById('tb3-canvas-wrap');
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;

    // The viewBox tracks pan + zoom. Logical canvas is infinite; we just shift
    // the viewBox origin and scale to zoom in/out.
    var v = state.viewport;
    var vbW = w / v.zoom;
    var vbH = h / v.zoom;
    svg.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + vbW + ' ' + vbH);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);

    // Grid pattern — repeats every 40 logical px
    svg.innerHTML =
      '<defs>' +
        '<pattern id="tb3-grid" width="40" height="40" patternUnits="userSpaceOnUse">' +
          '<path d="M 40 0 L 0 0 0 40" fill="none" stroke="color-mix(in oklab, var(--tb3-text) 6%, transparent)" stroke-width="1"/>' +
        '</pattern>' +
      '</defs>' +
      '<rect class="tb3-canvas-grid" x="' + (v.x - 200) + '" y="' + (v.y - 200) + '" width="' + (vbW + 400) + '" height="' + (vbH + 400) + '" fill="url(#tb3-grid)"/>';

    // Render cables FIRST so they appear behind devices
    state.cables.forEach(function (cbl) {
      var fromDev = state.devices.find(function (d) { return d.id === cbl.fromId; });
      var toDev = state.devices.find(function (d) { return d.id === cbl.toId; });
      if (!fromDev || !toDev) return;
      var fx = fromDev.x + 38, fy = fromDev.y + 38; // device center (76/2)
      var tx = toDev.x + 38, ty = toDev.y + 38;
      var midX = (fx + tx) / 2, midY = (fy + ty) / 2;
      // Bezier with control points offset toward each end for organic curves
      var d = 'M ' + fx + ' ' + fy + ' Q ' + midX + ' ' + midY + ' ' + tx + ' ' + ty;
      svg.innerHTML += '<path class="tb3-cable" data-cable-id="' + cbl.id + '" d="' + d + '"/>';
    });

    // Render devices
    state.devices.forEach(function (dev) {
      var selected = state.selectedId === dev.id;
      svg.innerHTML +=
        '<g class="tb3-dev' + (selected ? ' selected' : '') + '" data-device-id="' + dev.id + '" transform="translate(' + dev.x + ',' + dev.y + ')">' +
          '<rect class="tb3-dev-rect" x="0" y="0" width="76" height="76" rx="9"/>' +
          '<text class="tb3-dev-label" x="38" y="50" font-family="Inter">' + (dev.label || dev.id.slice(-4)) + '</text>' +
          '<text class="tb3-dev-type" x="38" y="66" font-family="Inter">' + dev.type + '</text>' +
        '</g>';
    });
  }

  function _updateZoomDisplay() {
    var el = document.getElementById('tb3-zoom-pct');
    if (el) el.textContent = Math.round(state.viewport.zoom * 100) + '%';
  }

  function _wirePanZoom() {
    var wrap = document.getElementById('tb3-canvas-wrap');
    if (!wrap) return;

    var spaceDown = false;
    var panning = false;
    var panStartX = 0, panStartY = 0;
    var viewStartX = 0, viewStartY = 0;

    // Space key toggles pan mode (cursor changes via CSS .panning class)
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && !spaceDown && document.getElementById('page-topology-builder-v3').classList.contains('active')) {
        spaceDown = true;
        wrap.classList.add('panning');
        e.preventDefault();
      }
    });
    document.addEventListener('keyup', function (e) {
      if (e.code === 'Space') {
        spaceDown = false;
        wrap.classList.remove('panning');
        wrap.classList.remove('grabbing');
      }
    });

    // Pan: mousedown when space is down → drag
    wrap.addEventListener('mousedown', function (e) {
      if (!spaceDown) return;
      panning = true;
      wrap.classList.add('grabbing');
      panStartX = e.clientX;
      panStartY = e.clientY;
      viewStartX = state.viewport.x;
      viewStartY = state.viewport.y;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!panning) return;
      var dx = (e.clientX - panStartX) / state.viewport.zoom;
      var dy = (e.clientY - panStartY) / state.viewport.zoom;
      state.viewport.x = viewStartX - dx;
      state.viewport.y = viewStartY - dy;
      _renderCanvas();
      _renderMinimap();
    });
    document.addEventListener('mouseup', function () {
      if (panning) {
        panning = false;
        wrap.classList.remove('grabbing');
        _saveState();
      }
    });

    // Zoom: scroll wheel
    wrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      var oldZoom = state.viewport.zoom;
      var delta = -e.deltaY * 0.001;
      var newZoom = Math.max(0.5, Math.min(4, oldZoom * (1 + delta)));
      if (newZoom === oldZoom) return;

      // Zoom toward cursor: keep the logical point under the cursor stationary
      var rect = wrap.getBoundingClientRect();
      var cx = e.clientX - rect.left;
      var cy = e.clientY - rect.top;
      var lx = state.viewport.x + cx / oldZoom;
      var ly = state.viewport.y + cy / oldZoom;
      state.viewport.zoom = newZoom;
      state.viewport.x = lx - cx / newZoom;
      state.viewport.y = ly - cy / newZoom;

      _renderCanvas();
      _renderMinimap();
      _updateZoomDisplay();
      _saveState();
    }, { passive: false });

    // Zoom buttons
    var btnIn = document.getElementById('tb3-zoom-in');
    var btnOut = document.getElementById('tb3-zoom-out');
    if (btnIn) btnIn.addEventListener('click', function () { _zoomStep(1.2); });
    if (btnOut) btnOut.addEventListener('click', function () { _zoomStep(1/1.2); });
  }

  function _zoomStep(factor) {
    var oldZoom = state.viewport.zoom;
    var newZoom = Math.max(0.5, Math.min(4, oldZoom * factor));
    if (newZoom === oldZoom) return;
    // Zoom from canvas centre
    var wrap = document.getElementById('tb3-canvas-wrap');
    var cx = wrap.clientWidth / 2;
    var cy = wrap.clientHeight / 2;
    var lx = state.viewport.x + cx / oldZoom;
    var ly = state.viewport.y + cy / oldZoom;
    state.viewport.zoom = newZoom;
    state.viewport.x = lx - cx / newZoom;
    state.viewport.y = ly - cy / newZoom;
    _renderCanvas();
    _renderMinimap();
    _updateZoomDisplay();
    _saveState();
  }

  function _renderMinimap() {
    var inner = document.getElementById('tb3-minimap-inner');
    var wrap = document.getElementById('tb3-canvas-wrap');
    if (!inner || !wrap) return;

    // Compute bounding box of all devices (or default if empty)
    var bb = { minX: -500, minY: -500, maxX: 500, maxY: 500 };
    if (state.devices.length > 0) {
      bb.minX = bb.maxX = state.devices[0].x;
      bb.minY = bb.maxY = state.devices[0].y;
      state.devices.forEach(function (d) {
        if (d.x < bb.minX) bb.minX = d.x;
        if (d.x + 76 > bb.maxX) bb.maxX = d.x + 76;
        if (d.y < bb.minY) bb.minY = d.y;
        if (d.y + 76 > bb.maxY) bb.maxY = d.y + 76;
      });
      // Pad so devices aren't at the edge
      var padX = (bb.maxX - bb.minX) * 0.2 + 100;
      var padY = (bb.maxY - bb.minY) * 0.2 + 100;
      bb.minX -= padX; bb.maxX += padX;
      bb.minY -= padY; bb.maxY += padY;
    }

    var bbW = bb.maxX - bb.minX;
    var bbH = bb.maxY - bb.minY;
    var mmW = inner.clientWidth;
    var mmH = inner.clientHeight;

    // Render device dots
    var dots = '';
    state.devices.forEach(function (d) {
      var px = ((d.x + 38 - bb.minX) / bbW) * 100;
      var py = ((d.y + 38 - bb.minY) / bbH) * 100;
      dots += '<div class="tb3-minimap-dot" style="left:' + px + '%;top:' + py + '%"></div>';
    });

    // Render current viewport rect
    var vp = state.viewport;
    var vpW = wrap.clientWidth / vp.zoom;
    var vpH = wrap.clientHeight / vp.zoom;
    var vx = ((vp.x - bb.minX) / bbW) * 100;
    var vy = ((vp.y - bb.minY) / bbH) * 100;
    var vw = (vpW / bbW) * 100;
    var vh = (vpH / bbH) * 100;

    inner.innerHTML = dots +
      '<div class="tb3-minimap-viewport" style="left:' + vx + '%;top:' + vy + '%;width:' + vw + '%;height:' + vh + '%"></div>';
  }

  // ───────────────────────────────────────────────────────────
  // PALETTE (TASK 3.x)
  // ───────────────────────────────────────────────────────────

  // Device catalog — lifted from v1's TB_DEVICE_TYPES + TB_PALETTE_GROUPS
  // (features/topology-builder.js lines 39 + 82). Same set, scoped to v3.
  var TB_V3_DEVICE_TYPES = {
    // Routers
    'router':         { label: 'Router', icon: _icoRouter() },
    'l3-router':      { label: 'Layer 3 Router', icon: _icoL3Router() },
    // Switches
    'switch':         { label: 'Switch', icon: _icoSwitch() },
    'l3-switch':      { label: 'Layer 3 Switch', icon: _icoL3Switch() },
    'hub':            { label: 'Hub', icon: _icoHub() },
    // Endpoints
    'desktop':        { label: 'Desktop', icon: _icoDesktop() },
    'laptop':         { label: 'Laptop', icon: _icoLaptop() },
    'server':         { label: 'Server', icon: _icoServer() },
    'smartphone':     { label: 'Smartphone', icon: _icoSmartphone() },
    'smart-tv':       { label: 'Smart TV', icon: _icoSmartTv() },
    'game-console':   { label: 'Game Console', icon: _icoGameConsole() },
    // Wireless
    'ap':             { label: 'Access Point', icon: _icoAp() },
    'wlc':            { label: 'Wireless Controller', icon: _icoWlc() },
    // Security
    'firewall':       { label: 'Firewall', icon: _icoFirewall() },
    'ids-ips':        { label: 'IDS / IPS', icon: _icoIds() },
    // Cloud & WAN
    'cloud':          { label: 'Cloud', icon: _icoCloud() },
    'internet':       { label: 'Internet', icon: _icoInternet() },
    'isp-modem':      { label: 'ISP Modem', icon: _icoModem() },
    'mpls-core':      { label: 'MPLS Core', icon: _icoMpls() },
    'vpn-gateway':    { label: 'VPN Gateway', icon: _icoVpn() },
    'load-balancer':  { label: 'Load Balancer', icon: _icoLb() },
  };

  var TB_V3_PALETTE_GROUPS = [
    { name: 'Routers', items: ['router', 'l3-router'] },
    { name: 'Switches', items: ['switch', 'l3-switch', 'hub'] },
    { name: 'Endpoints', items: ['desktop', 'laptop', 'server', 'smartphone', 'smart-tv', 'game-console'] },
    { name: 'Wireless', items: ['ap', 'wlc'] },
    { name: 'Security', items: ['firewall', 'ids-ips'] },
    { name: 'Cloud & WAN', items: ['cloud', 'internet', 'isp-modem', 'mpls-core', 'vpn-gateway', 'load-balancer'] },
  ];

  // Icon helpers — each returns SVG markup. Lift-and-shift from v1's tbPaletteLineIcon
  // (features/topology-builder.js — search for tbPaletteLineIcon) IF that source is
  // preferred. For Phase 1 we inline minimal monoline SVGs:
  function _icoRouter() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M8 4l-2 4M8 20l-2-4M16 4l2 4M16 20l2-4"/></svg>'; }
  function _icoL3Router() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>'; }
  function _icoSwitch() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8V5M11 8V5M15 8V5M7 19v-3M11 19v-3M15 19v-3"/></svg>'; }
  function _icoL3Switch() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="8" width="18" height="8" rx="1"/><circle cx="8" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="16" cy="12" r="1"/></svg>'; }
  function _icoHub() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="10" width="18" height="4" rx="1"/></svg>'; }
  function _icoDesktop() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="13" rx="1"/><path d="M2 21h20M8 17v4M16 17v4"/></svg>'; }
  function _icoLaptop() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="11" rx="1"/><path d="M2 20h20"/></svg>'; }
  function _icoServer() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="12" cy="6" r="1"/><circle cx="12" cy="12" r="3"/></svg>'; }
  function _icoSmartphone() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="2" width="10" height="20" rx="2"/><circle cx="12" cy="18" r="1"/></svg>'; }
  function _icoSmartTv() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="20" height="13" rx="1"/><path d="M8 21h8"/></svg>'; }
  function _icoGameConsole() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="9" width="18" height="9" rx="3"/><circle cx="8" cy="13" r="1"/><circle cx="16" cy="13" r="1"/></svg>'; }
  function _icoAp() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="20" r="1"/><path d="M3 13a13 13 0 0 1 18 0M6 16a8 8 0 0 1 12 0M9 19a3 3 0 0 1 6 0"/></svg>'; }
  function _icoWlc() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="8" width="18" height="8" rx="1"/><circle cx="18" cy="12" r="1"/><path d="M14 12a2 2 0 0 1 4 0"/></svg>'; }
  function _icoFirewall() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l8 4v6c0 5-3.5 9-8 10C7.5 21 4 17 4 12V6l8-4z"/></svg>'; }
  function _icoIds() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16h.01"/></svg>'; }
  function _icoCloud() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M17 18a4 4 0 1 0-3.5-6.5A5 5 0 0 0 4 13a3 3 0 0 0 3 5h10z"/></svg>'; }
  function _icoInternet() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>'; }
  function _icoModem() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="10" width="18" height="8" rx="1"/><circle cx="8" cy="14" r="1"/><circle cx="12" cy="14" r="1"/><path d="M3 10v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/></svg>'; }
  function _icoMpls() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/></svg>'; }
  function _icoVpn() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'; }
  function _icoLb() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18"/></svg>'; }

  function _renderPalette() {
    var pal = document.getElementById('tb3-palette');
    if (!pal) return;

    var html = '';
    TB_V3_PALETTE_GROUPS.forEach(function (grp) {
      html += '<div class="tb3-palette-grp">';
      html += '<div class="tb3-palette-grp-h">' + grp.name + '</div>';
      grp.items.forEach(function (typeKey) {
        var def = TB_V3_DEVICE_TYPES[typeKey];
        if (!def) return;
        html += '<div class="tb3-palette-item" draggable="true" data-device-type="' + typeKey + '">';
        html += def.icon;
        html += '<span>' + def.label + '</span>';
        html += '</div>';
      });
      html += '</div>';
    });

    pal.innerHTML = html;
  }

  function _wireDragToCanvas() {
    var canvas = document.getElementById('tb3-canvas-wrap');
    if (!canvas) return;

    var draggedType = null;

    // Listen to dragstart on the palette items (delegated)
    document.addEventListener('dragstart', function (e) {
      var item = e.target.closest('.tb3-palette-item');
      if (!item) return;
      draggedType = item.getAttribute('data-device-type');
      e.dataTransfer.effectAllowed = 'copy';
    });

    canvas.addEventListener('dragover', function (e) {
      if (!draggedType) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    canvas.addEventListener('drop', function (e) {
      if (!draggedType) return;
      e.preventDefault();
      // Convert client coords to logical canvas coords
      var rect = canvas.getBoundingClientRect();
      var cx = e.clientX - rect.left;
      var cy = e.clientY - rect.top;
      var lx = state.viewport.x + cx / state.viewport.zoom - 38; // device half-width
      var ly = state.viewport.y + cy / state.viewport.zoom - 38;
      // Snap to 40px grid
      lx = Math.round(lx / 40) * 40;
      ly = Math.round(ly / 40) * 40;

      var dev = buildDevice(draggedType, lx, ly);
      dev.label = draggedType.toUpperCase().slice(0, 4);
      state.devices.push(dev);
      state.selectedId = dev.id;
      _renderCanvas();
      _renderMinimap();
      _updateDeviceCount();
      _renderInspector();
      _saveState();
      draggedType = null;
    });

    // Drag a device that's ALREADY on the canvas to reposition
    var movingDev = null;
    var moveStartX = 0, moveStartY = 0;
    var moveDevStartX = 0, moveDevStartY = 0;

    canvas.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return; // left click only
      // Find a device group ancestor
      var g = e.target.closest('.tb3-dev');
      if (!g) return;
      // Don't drag if space is held (that's panning)
      if (canvas.classList.contains('panning')) return;
      var id = g.getAttribute('data-device-id');
      var dev = state.devices.find(function (d) { return d.id === id; });
      if (!dev) return;
      movingDev = dev;
      moveStartX = e.clientX;
      moveStartY = e.clientY;
      moveDevStartX = dev.x;
      moveDevStartY = dev.y;
      state.selectedId = id;
      _renderCanvas();
      _renderInspector();
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!movingDev) return;
      var dx = (e.clientX - moveStartX) / state.viewport.zoom;
      var dy = (e.clientY - moveStartY) / state.viewport.zoom;
      movingDev.x = Math.round((moveDevStartX + dx) / 40) * 40;
      movingDev.y = Math.round((moveDevStartY + dy) / 40) * 40;
      _renderCanvas();
      _renderMinimap();
    });

    document.addEventListener('mouseup', function () {
      if (movingDev) {
        movingDev = null;
        _saveState();
      }
    });
  }

  // ───────────────────────────────────────────────────────────
  // CABLES (TASK 4.x)
  // ───────────────────────────────────────────────────────────

  function _wireCableDrawing() { /* TASK 4.1 */ }
  function _renderCables() { /* TASK 4.2 */ }

  // ───────────────────────────────────────────────────────────
  // SELECTION + INSPECTOR (TASK 5.x)
  // ───────────────────────────────────────────────────────────

  function _selectDevice(id) { /* TASK 5.1 */ }
  function _deleteSelected() { /* TASK 5.3 */ }
  function _renderInspector() { /* TASK 5.4 */ }
  function _wireGlobalKeys() { /* TASK 5.3 — Delete + Escape + Space-pan */ }

  // ───────────────────────────────────────────────────────────
  // MODE BAR + INTENT CHIP (TASK 7.x)
  // ───────────────────────────────────────────────────────────

  function _renderModeBar() { /* TASK 7.1 */ }

  // ───────────────────────────────────────────────────────────
  // EXPORT (TASK 8.x)
  // ───────────────────────────────────────────────────────────

  function _exportPng() { /* TASK 8.1 */ }
  function _wireExport() { /* TASK 8.2 — Export button click handler */ }

  // Register on the standard feature-modules contract
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures['topology-builder-v3'] = {
    // Entry
    openTopologyBuilderV3: openTopologyBuilderV3,
    // Pure (exposed for testing)
    buildDevice: buildDevice,
    buildCable: buildCable,
    serialiseState: serialiseState,
    parseState: parseState,
    // State access (for tests)
    _getState: function () { return state; },
    _setState: function (s) { state = s; },
  };

  // Also expose openTopologyBuilderV3 directly on window for the sidebar handler
  window.openTopologyBuilderV3 = openTopologyBuilderV3;
})();
