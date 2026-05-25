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
    intent: 'free-build',  // 'free-build' | 'lab' | 'pbq' | 'walk'
    mode: 'design',        // 'design' | 'simulate' | 'trace' | 'osi' | '3d'
    selectedId: null,      // currently-selected device id (or null)
    activeScenarioId: null, // phase 2: id of currently-loaded scenario when intent === 'lab'
    // ── walkthrough (Phase 8) ──
    activeWalkthroughId: null,   // string|null — running walkthrough
    walkStepIdx: 0,              // number      — 0-based current step
    walkMode: '2d',              // '2d'|'3d'   — visible renderer
    walkCardAnchor: null,        // {deviceId, side}|null — last card placement
  };

  // Phase 5 helper — internal accessor mirroring the registration-object
  // _getState exposure. Lets render helpers (_renderTracePanel /
  // _renderHopList / _renderTraceAnnotation / _startTrace) reference
  // state via a fn call instead of the bare var. Without this the plan's
  // _getState() calls would ReferenceError at runtime (the registration's
  // inline function is only reachable via window._certanvilFeatures[...]).
  function _getState() { return state; }

  // Ephemeral Simulate-mode state (Phase 4) — NOT persisted, cleared on mode exit
  var _simState = {
    drillSrcId: null,        // device id
    drillDstId: null,        // device id
    drillProtocol: 'ping',   // 'ping' | 'arp' | 'dhcp'
    previewQueue: [],        // validator-preview pairs waiting
    currentPacket: null,     // in-flight animation handle for cancel
    log: [],                 // entries; max 200; FIFO trim
    playing: false,          // true while Validator Preview queue is running
  };

  // Ephemeral Trace-mode state (Phase 5) — NOT persisted, cleared on _closeTrace
  // Separate from _simState per spec §3.6 (clean mode separation).
  var _traceState = null;

  // Ephemeral 3D popup state (Phase 7 v2) — NOT persisted, cleared on _close3DPopup
  // Lives separate from state.mode (popup is transient, not a mode value).
  var _3dPopup = {
    open: false,
    camera: { rotX: 42, rotY: -18, zoom: 1.1 }, // Stage 6: lower tilt, tighter zoom
    dragState: { active: false, startX: 0, startY: 0, startRotX: 0, startRotY: 0 },
    velocityX: 0,
    velocityY: 0,
    rafHandle: null
  };

  function _initTraceState(payload) {
    _traceState = {
      // pair identity
      srcId: (payload && payload.srcId) || null,
      dstId: (payload && payload.dstId) || null,
      protocol: (payload && payload.protocol) || 'ping',

      // computed path (from Phase 3's computePath — note: result.hops NOT result.path)
      hops: [],
      reasons: {},
      failedAt: null,

      // playback
      currentHopIdx: 0,
      mode: 'idle',
      autoplayTimer: null,
      rafHandle: null,        // emil §8.6 — captured for interruptibility on rapid Next clicks
      osiAnimHandle: null,    // Phase 6 — OSI overlay animation handle (dual-timer discipline)

      // visuals
      packet: null,

      // OSI failure layer (Phase 6 — set by _startTrace from result.reason)
      reasonCode: null,

      // handoff bookkeeping (Sim→Trace re-entry)
      lastPayload: payload || null
    };
  }

  function _resetTraceState() {
    if (_traceState && _traceState.autoplayTimer) clearTimeout(_traceState.autoplayTimer);
    if (_traceState && _traceState.rafHandle) cancelAnimationFrame(_traceState.rafHandle);
    if (_traceState && _traceState.osiAnimHandle) cancelAnimationFrame(_traceState.osiAnimHandle);
    if (_traceState && _traceState.packet) _despawnPacket(_traceState.packet);
    _traceState = null;
  }

  // ───────────────────────────────────────────────────────────
  // CSS LOADING (single-call from enter())
  // ───────────────────────────────────────────────────────────

  // CSS revision counter — manually bumped after each CSS edit during dev
  // iteration. Forces SW + browser cache miss on the .css URL even when
  // APP_VERSION hasn't changed. After v3 ships in a version-bump cycle,
  // APP_VERSION will be the canonical cache key and this constant can be
  // retired (or kept at .0 forever).
  var TB3_CSS_REV = 'r15'; // r15: Polish pass — per-device 3D illustrations + labels + centroid + ambient packets

  function _ensureCss() {
    if (document.querySelector('link[href*="topology-builder-v3.css"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/features/topology-builder-v3.css?v=' + (window.APP_VERSION || 'dev') + '-' + TB3_CSS_REV;
    document.head.appendChild(link);
  }

  // ───────────────────────────────────────────────────────────
  // ENTRY POINT (called by sidebar handler)
  // ───────────────────────────────────────────────────────────

  function openTopologyBuilderV3() {
    _ensureCss();
    _loadState();
    _migrateStateTypesToV1();
    _renderWorkspace();
  }

  // ───────────────────────────────────────────────────────────
  // PURE FUNCTIONS (testable in isolation via vm-sandbox)
  // ───────────────────────────────────────────────────────────

  function _autoFillIp(dev, state) {
    var ENDPOINT_TYPES = ['pc','server','laptop','smartphone','printer','voip','iot','dns-server'];
    var L3_MULTI_TYPES = ['router','l3-switch','firewall','vpn'];
    if (ENDPOINT_TYPES.indexOf(dev.type) === -1 && L3_MULTI_TYPES.indexOf(dev.type) === -1) {
      return; // L2 / cloud / internet — no config
    }
    var devices = (state && state.devices) || [];
    // Find existing router IP to adopt its subnet
    var routerIp = null;
    for (var i = 0; i < devices.length; i++) {
      var d = devices[i];
      if (d.type === 'router' && Array.isArray(d.interfaces) && d.interfaces[0] && d.interfaces[0].ip) {
        routerIp = d.interfaces[0].ip;
        break;
      }
    }
    var subnetPrefix = '192.168.10';
    if (routerIp) {
      var parts = routerIp.split('.');
      if (parts.length === 4) subnetPrefix = parts[0] + '.' + parts[1] + '.' + parts[2];
    }
    // Find next unused .10+ in this subnet
    var used = {};
    devices.forEach(function (d) {
      if (d.config && d.config.ip) {
        var p = d.config.ip.split('.');
        if (p[0] + '.' + p[1] + '.' + p[2] === subnetPrefix) used[parseInt(p[3], 10)] = true;
      }
      if (Array.isArray(d.interfaces)) {
        d.interfaces.forEach(function (iface) {
          if (iface && iface.ip) {
            var p2 = iface.ip.split('.');
            if (p2[0] + '.' + p2[1] + '.' + p2[2] === subnetPrefix) used[parseInt(p2[3], 10)] = true;
          }
        });
      }
    });
    if (ENDPOINT_TYPES.indexOf(dev.type) !== -1) {
      var n = 10;
      while (used[n]) n++;
      dev.config = dev.config || {};
      dev.config.ip = subnetPrefix + '.' + n;
      dev.config.mask = 24;
      if (routerIp) dev.config.gateway = routerIp;
    } else if (dev.type === 'router' && !routerIp) {
      // First router becomes .1 of 192.168.10.0/24
      dev.interfaces = dev.interfaces || [];
      dev.interfaces.push({ ip: '192.168.10.1', mask: 24 });
    } else if (dev.type === 'router') {
      // Subsequent router gets a new subnet
      var subnetN = 20;
      var prefix2;
      do {
        prefix2 = '192.168.' + subnetN;
        var collision = devices.some(function (dd) {
          if (dd.config && dd.config.ip && dd.config.ip.indexOf(prefix2 + '.') === 0) return true;
          if (Array.isArray(dd.interfaces)) {
            return dd.interfaces.some(function (iface) {
              return iface && iface.ip && iface.ip.indexOf(prefix2 + '.') === 0;
            });
          }
          return false;
        });
        if (!collision) break;
        subnetN += 10;
      } while (subnetN < 250);
      dev.interfaces = dev.interfaces || [];
      dev.interfaces.push({ ip: prefix2 + '.1', mask: 24 });
    } else if (dev.type === 'l3-switch') {
      dev.interfaces = dev.interfaces || [];
      dev.interfaces.push({ ip: subnetPrefix + '.1', mask: 24 });
    } else if (dev.type === 'firewall' || dev.type === 'vpn') {
      dev.interfaces = dev.interfaces || [];
      dev.interfaces.push({ ip: '', mask: 24 });
    }
  }

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
      activeScenarioId: s.activeScenarioId || null,
      // ── walkthrough fields (Phase 8) — companion key STORAGE.TB_V3_WALK_PROGRESS holds richer progress ──
      activeWalkthroughId: s.activeWalkthroughId || null,
      walkStepIdx: s.walkStepIdx || 0,
      // NOTE: walkMode + walkCardAnchor are runtime-only, NOT persisted
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
        activeScenarioId: parsed.activeScenarioId || null,
        // ── walkthrough fields (Phase 8) ──
        activeWalkthroughId: parsed.activeWalkthroughId || null,
        walkStepIdx: typeof parsed.walkStepIdx === 'number' ? parsed.walkStepIdx : 0,
        walkMode: '2d',           // runtime-only, always reset on load
        walkCardAnchor: null,     // runtime-only, always reset on load
      };
    } catch (e) {
      return { devices: [], cables: [], viewport: { x: 0, y: 0, zoom: 1 }, intent: 'free-build', mode: 'design', selectedId: null, activeScenarioId: null, activeWalkthroughId: null, walkStepIdx: 0, walkMode: '2d', walkCardAnchor: null };
    }
  }

  // ───────────────────────────────────────────────────────────
  // REACHABILITY ENGINE (Phase 3 — subnet-aware L3 validator)
  //
  // Five pure functions: parseCidr, inSameSubnet, routeNextHop,
  // computePath, computeReachability. Synchronous, deterministic,
  // safe for vm-sandbox tests + safe for re-running on every
  // canvas mutation (wired via the existing _renderCompletionPill
  // hook from Phase 2).
  // ───────────────────────────────────────────────────────────

  function parseCidr(input) {
    if (typeof input !== 'string' || !input.length) return null;
    var parts = input.split('/');
    if (parts.length !== 2) return null;
    var mask = parseInt(parts[1], 10);
    if (!Number.isInteger(mask) || mask < 0 || mask > 32) return null;
    var octets = parts[0].split('.');
    if (octets.length !== 4) return null;
    var ip = [];
    for (var i = 0; i < 4; i++) {
      var n = parseInt(octets[i], 10);
      if (!Number.isInteger(n) || n < 0 || n > 255) return null;
      if (String(n) !== octets[i]) return null; // reject '0123', '+5', etc.
      ip.push(n);
    }
    return { ip: ip, mask: mask };
  }

  function inSameSubnet(ipA, ipB, mask) {
    if (!Array.isArray(ipA) || !Array.isArray(ipB) || ipA.length !== 4 || ipB.length !== 4) return false;
    if (mask === 0) return true;
    var fullOctets = Math.floor(mask / 8);
    var remainder = mask % 8;
    for (var i = 0; i < fullOctets; i++) {
      if (ipA[i] !== ipB[i]) return false;
    }
    if (remainder === 0) return true;
    var bitMask = (0xFF << (8 - remainder)) & 0xFF;
    return (ipA[fullOctets] & bitMask) === (ipB[fullOctets] & bitMask);
  }

  function routeNextHop(srcIp, dstIp, device) {
    if (!device) return null;
    var dstParsed = parseCidr(dstIp + '/32');
    if (!dstParsed) return null;
    var L3_MULTI = (device.type === 'router' || device.type === 'l3-switch' || device.type === 'firewall' || device.type === 'vpn' || device.type === 'cloud' || device.type === 'internet');
    if (L3_MULTI && Array.isArray(device.interfaces)) {
      for (var i = 0; i < device.interfaces.length; i++) {
        var iface = device.interfaces[i];
        if (!iface || typeof iface.ip !== 'string' || typeof iface.mask !== 'number') continue;
        var ifaceParsed = parseCidr(iface.ip + '/' + iface.mask);
        if (!ifaceParsed) continue;
        if (inSameSubnet(ifaceParsed.ip, dstParsed.ip, iface.mask)) {
          return { via: 'direct' };
        }
      }
      return null;
    }
    // Endpoint (workstation, server, laptop, smartphone, cloud, internet)
    if (!device.config || typeof device.config.ip !== 'string') return null;
    var srcParsed = parseCidr(device.config.ip + '/' + (device.config.mask || 24));
    if (!srcParsed) return null;
    if (inSameSubnet(srcParsed.ip, dstParsed.ip, srcParsed.mask)) {
      return { via: 'direct' };
    }
    if (typeof device.config.gateway === 'string' && device.config.gateway.length) {
      return { via: 'gateway', gateway: device.config.gateway };
    }
    return null;
  }

  function computePath(srcId, dstId, state) {
    if (srcId === dstId) return { ok: true, hops: [srcId] };
    var devices = (state && state.devices) || [];
    var cables = (state && state.cables) || [];
    function findDev(id) {
      for (var i = 0; i < devices.length; i++) if (devices[i].id === id) return devices[i];
      return null;
    }
    function isL3(dev) {
      return dev && (dev.type === 'router' || dev.type === 'l3-switch' || dev.type === 'firewall' || dev.type === 'vpn' || dev.type === 'cloud' || dev.type === 'internet');
    }
    function devIp(dev) {
      if (!dev) return null;
      if (isL3(dev) && Array.isArray(dev.interfaces)) {
        for (var i = 0; i < dev.interfaces.length; i++) if (dev.interfaces[i] && dev.interfaces[i].ip) return dev.interfaces[i].ip;
        return null;
      }
      return (dev.config && dev.config.ip) || null;
    }
    // BFS through L2-transparent cables, stopping at any L3 boundary unless it satisfies the predicate
    function bfsL2(startId, predicate) {
      var visited = {}; visited[startId] = true;
      var queue = [{ id: startId, path: [startId] }];
      while (queue.length) {
        var node = queue.shift();
        var nodeDev = findDev(node.id);
        if (node.id !== startId && predicate(nodeDev, node)) {
          return node.path;
        }
        // If we've hit an L3 device that's not our start and not the predicate match, stop traversing through it
        if (node.id !== startId && isL3(nodeDev)) continue;
        // L2 transparent or start node — traverse all cables
        for (var i = 0; i < cables.length; i++) {
          var c = cables[i];
          var other = null;
          if (c.fromId === node.id) other = c.toId;
          else if (c.toId === node.id) other = c.fromId;
          if (other && !visited[other]) {
            visited[other] = true;
            queue.push({ id: other, path: node.path.concat([other]) });
          }
        }
      }
      return null;
    }

    var src = findDev(srcId);
    var dst = findDev(dstId);
    if (!src) return { ok: false, reason: 'no-ip', failedAt: srcId };
    if (!dst) return { ok: false, reason: 'no-cable-path', failedAt: srcId };

    var srcIp = devIp(src);
    if (!srcIp) return { ok: false, reason: 'no-ip', failedAt: srcId };

    var dstIp = devIp(dst);
    if (!dstIp) return { ok: false, reason: 'no-ip', failedAt: dstId };

    function step(currentId, currentSrcIp, visitedRouters) {
      var current = findDev(currentId);
      var nextHop = routeNextHop(currentSrcIp, dstIp, current);
      if (!nextHop) {
        if (isL3(current)) return { ok: false, reason: 'no-route', failedAt: currentId };
        if (current.config && !current.config.gateway) return { ok: false, reason: 'no-gateway', failedAt: currentId };
        return { ok: false, reason: 'no-route', failedAt: currentId };
      }
      if (nextHop.via === 'direct') {
        var path = bfsL2(currentId, function (d) { return d && d.id === dstId; });
        if (path) return { ok: true, hops: path };
        return { ok: false, reason: 'no-cable-path', failedAt: currentId };
      }
      // via gateway — find a device whose IP matches the gateway, must be L3
      var gwIp = nextHop.gateway;
      var path2 = bfsL2(currentId, function (d) {
        if (!d) return false;
        if (isL3(d) && Array.isArray(d.interfaces)) {
          for (var i = 0; i < d.interfaces.length; i++) {
            if (d.interfaces[i] && d.interfaces[i].ip === gwIp) return true;
          }
        } else if (d.config && d.config.ip === gwIp) {
          return true;
        }
        return false;
      });
      if (!path2) return { ok: false, reason: 'no-cable-path', failedAt: currentId };
      var gwDev = findDev(path2[path2.length - 1]);
      if (!isL3(gwDev)) {
        return { ok: false, reason: 'no-router-between', failedAt: currentId };
      }
      if (visitedRouters[gwDev.id]) {
        return { ok: false, reason: 'no-route', failedAt: gwDev.id };
      }
      visitedRouters[gwDev.id] = true;
      var sub = step(gwDev.id, gwIp, visitedRouters);
      if (!sub.ok) return sub;
      return { ok: true, hops: path2.slice(0, -1).concat(sub.hops) };
    }

    return step(srcId, srcIp, {});
  }

  function computeReachability(state, completion) {
    var failures = [];
    var required = (completion && completion.requiredCables) || [];
    var devices = (state && state.devices) || [];
    var cables = (state && state.cables) || [];
    var L2_TYPES = { 'switch':1,'hub':1,'wap':1,'wlc':1 };
    var L3_MULTI_TYPES = { 'router':1,'l3-switch':1,'firewall':1,'vpn':1,'cloud':1,'internet':1 };
    function pickByType(t, excludeId) {
      for (var i = 0; i < devices.length; i++) {
        if (devices[i].type === t && devices[i].id !== excludeId) return devices[i];
      }
      return null;
    }
    function hasIp(dev) {
      if (!dev) return false;
      if (dev.config && dev.config.ip) return true;
      if (Array.isArray(dev.interfaces)) {
        for (var j = 0; j < dev.interfaces.length; j++) {
          if (dev.interfaces[j] && dev.interfaces[j].ip) return true;
        }
      }
      return false;
    }
    function l2Connected(idA, idB) {
      var visited = {}; visited[idA] = true;
      var queue = [idA];
      while (queue.length) {
        var cur = queue.shift();
        if (cur === idB) return true;
        for (var k = 0; k < cables.length; k++) {
          var c = cables[k];
          var other = null;
          if (c.fromId === cur) other = c.toId;
          else if (c.toId === cur) other = c.fromId;
          if (other && !visited[other]) { visited[other] = true; queue.push(other); }
        }
      }
      return false;
    }
    // Smart-pick: try every (a, b) device combination matching the type-pair and
    // accept the FIRST pair whose reachability succeeds. If NONE succeed, report
    // the failure from the first attempt (best-effort diagnostic).
    function pairsOfType(fromType, toType) {
      var fromDevs = devices.filter(function (d) { return d.type === fromType; });
      var toDevs = devices.filter(function (d) { return d.type === toType; });
      var pairs = [];
      for (var i = 0; i < fromDevs.length; i++) {
        for (var j = 0; j < toDevs.length; j++) {
          if (fromDevs[i].id !== toDevs[j].id) pairs.push([fromDevs[i], toDevs[j]]);
        }
      }
      return pairs;
    }
    for (var i = 0; i < required.length; i++) {
      var pair = required[i];
      // Determine if each side is a pure-L2 type (no IP) or an IP-bearing type
      var fromIsL2 = !!L2_TYPES[pair.from];
      var toIsL2   = !!L2_TYPES[pair.to];
      // Resolve the effective IP-bearing types for routing:
      //   if a side is L2, use the OTHER side's type for both ends of the L3 check
      var ipFromType = fromIsL2 ? pair.to   : pair.from;
      var ipToType   = toIsL2   ? pair.from : pair.to;
      // When BOTH sides are L2, just verify cable connectivity between them
      if (fromIsL2 && toIsL2) {
        var pairs = pairsOfType(pair.from, pair.to);
        if (pairs.length === 0) continue;
        var anyL2 = pairs.some(function (p) { return l2Connected(p[0].id, p[1].id); });
        if (!anyL2) {
          failures.push({
            from: pairs[0][0].id, to: pairs[0][1].id,
            reason: 'no-cable-path', failedAt: pairs[0][0].id,
          });
        }
        continue;
      }
      // When one or both sides are IP-bearing, determine the routing strategy:
      //   - Both sides are distinct IP-bearing types (e.g. router↔router, firewall↔server):
      //     try ALL cross-type pairs, accept if ANY succeeds (spine-leaf fix).
      //   - One side is L2 (e.g. switch↔workstation): the L2 device has no IP to route from.
      //     Instead verify that EVERY IP-bearing device of the non-L2 type can reach at
      //     least one peer — this detects a single isolated workstation even when others
      //     are mutually reachable.
      var pairs = pairsOfType(ipFromType, ipToType);
      if (pairs.length === 0) continue; // no representative — cable-shape validator handles
      var firstFail = null;
      var anyOk = false;
      if (fromIsL2 || toIsL2) {
        // L2-mixed: the L2 side has no IP — check that every IP-bearing device of the
        // non-L2 type can reach at least one peer (L3 routing or, as a fallback for
        // multi-interface devices whose computePath has trouble, direct cable-to-IP-peer).
        var ipType = fromIsL2 ? pair.to : pair.from;
        var ipDevs = devices.filter(function (d) { return d.type === ipType && hasIp(d); });
        var allOk = ipDevs.length > 0;
        for (var k = 0; k < ipDevs.length && allOk; k++) {
          var src = ipDevs[k];
          var canReachSomeone = false;
          // Try L3 routing to any same-type peer
          for (var m = 0; m < ipDevs.length; m++) {
            if (ipDevs[m].id === src.id) continue;
            var r = computePath(src.id, ipDevs[m].id, state);
            if (r.ok) { canReachSomeone = true; break; }
            if (!firstFail) firstFail = { from: src.id, to: ipDevs[m].id, reason: r.reason, failedAt: r.failedAt };
          }
          // Fallback: if L3 failed (e.g. multi-interface routing gap), accept if this device
          // is cable-connected to at least one IP-bearing device (indicates physical reachability)
          if (!canReachSomeone) {
            for (var n = 0; n < cables.length; n++) {
              var c = cables[n];
              var neighborId = null;
              if (c.fromId === src.id) neighborId = c.toId;
              else if (c.toId === src.id) neighborId = c.fromId;
              if (neighborId) {
                for (var p = 0; p < devices.length; p++) {
                  if (devices[p].id === neighborId && hasIp(devices[p])) { canReachSomeone = true; break; }
                }
              }
              if (canReachSomeone) break;
            }
          }
          if (!canReachSomeone) allOk = false;
        }
        anyOk = allOk;
      } else {
        // Both sides are IP-bearing types — any successful pair is enough
        for (var k = 0; k < pairs.length; k++) {
          var a = pairs[k][0], b = pairs[k][1];
          if (!hasIp(a) || !hasIp(b)) continue; // skip pairs where either side has no IP
          var result = computePath(a.id, b.id, state);
          if (result.ok) { anyOk = true; break; }
          if (!firstFail) firstFail = { from: a.id, to: b.id, reason: result.reason, failedAt: result.failedAt };
        }
      }
      if (!anyOk) {
        if (firstFail) failures.push(firstFail);
        // else: no IP-bearing pair found — skip silently (cable-shape will have flagged)
      }
    }
    return { complete: failures.length === 0, failures: failures };
  }

  // ── Exam domain lookup ───────────────────────────────────────────
  const _TB_V3_EXAM_DOMAINS = {
    '1': 'Networking Concepts',
    '2': 'Network Implementation',
    '3': 'Network Operations',
    '4': 'Network Security',
    '5': 'Network Troubleshooting',
  };

  function domainsForRefs(objectiveRefs) {
    if (!Array.isArray(objectiveRefs) || objectiveRefs.length === 0) {
      return ['Other'];
    }
    return [...new Set(
      objectiveRefs.map(r => {
        const major = String(r).split('.')[0];
        return _TB_V3_EXAM_DOMAINS[major] || 'Other';
      })
    )];
  }

  // ───────────────────────────────────────────────────────────
  // SCENARIOS CATALOG (Phase 2 — 8 starter; full 20-25 in Phase 2.x)
  //
  // Schema (locked from spec §9):
  //   id            slug, unique
  //   title         string
  //   category      'topology' | 'architecture' | 'wan' | 'cloud' | 'wireless' | 'security' | 'vlan'
  //   objectiveRefs string[] of N10-009 objective numbers
  //   startingState { devices:[...], cables:[...], viewport:{x,y,zoom} }
  //   brief         string (1-paragraph)
  //   examRelevance { overview, howItRoutes, keyDevices, keyConcepts, examRelevance }
  //   completion    { requiredDevices:[type], expectedCount:{type:n}, requiredCables:[{from,to}] }
  //
  // Device ids inside startingState use 'sc_<slug>_<n>' so a duplicate-load
  // doesn't collide with prior Free Build content (which uses 'dev_<hex>_<2hex>').
  // ───────────────────────────────────────────────────────────

  var TB_V3_SCENARIOS = [
    {
      id: 'star-topology',
      title: 'Star Topology With Central Switch',
      category: 'topology',
      objectiveRefs: ['1.2', '2.1'],
      startingState: {
        devices: [
          { id: 'sc_star_1', type: 'switch',      x: 600, y: 360, label: 'SW1' },
          { id: 'sc_star_2', type: 'server',      x: 360, y: 200, label: 'SRV-01', config: { ip: '192.168.10.10', mask: 24, gateway: '192.168.10.1' } },
          { id: 'sc_star_3', type: 'pc', x: 360, y: 520, label: 'WS-01',  config: { ip: '192.168.10.20', mask: 24, gateway: '192.168.10.1' } },
          { id: 'sc_star_4', type: 'pc', x: 840, y: 520, label: 'WS-02',  config: { ip: '192.168.10.21', mask: 24, gateway: '192.168.10.1' } },
          { id: 'sc_star_5', type: 'pc', x: 840, y: 200, label: 'WS-03',  config: { ip: '192.168.10.22', mask: 24, gateway: '192.168.10.1' } },
        ],
        cables: [
          { id: 'sc_star_c1', fromId: 'sc_star_1', toId: 'sc_star_2', type: 'cat6' },
          { id: 'sc_star_c2', fromId: 'sc_star_1', toId: 'sc_star_3', type: 'cat6' },
          { id: 'sc_star_c3', fromId: 'sc_star_1', toId: 'sc_star_4', type: 'cat6' },
          { id: 'sc_star_c4', fromId: 'sc_star_1', toId: 'sc_star_5', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A star topology centralises connections through a single switch. The exam expects you to recognise the failure-domain trade-off (switch down = all hosts offline) versus the wiring simplicity that makes it the default LAN shape.',
      examRelevance: {
        overview:      'Star = all endpoints home-run to one central node (switch). Today\'s dominant LAN shape.',
        howItRoutes:   'L2 forwarding via MAC table on the central switch. No routing required for intra-LAN traffic.',
        keyDevices:    'Central switch (L2) + server (broadcast member) + workstations (endpoints).',
        keyConcepts:   'Single point of failure at the central switch. Cable count = N hosts. Adds and moves do not affect peers.',
        examRelevance: 'N10-009 obj 1.2 (topology shapes) + obj 2.1 (switching). Often paired with mesh/ring contrasts on PBQs.',
      },
      completion: {
        requiredDevices: ['switch','server','pc'],
        expectedCount:   { switch:1, server:1, pc:3 },
        requiredCables:  [
          { from:'switch', to:'server' },
          { from:'switch', to:'pc' },
        ],
      },
    },
    {
      id: 'mesh-topology',
      title: 'Full Mesh Topology (4 Nodes)',
      category: 'topology',
      objectiveRefs: ['1.2'],
      startingState: {
        devices: [
          { id: 'sc_mesh_1', type: 'router', x: 360, y: 200, label: 'R1', interfaces:[{ ip:'10.0.12.1', mask:30 },{ ip:'10.0.13.1', mask:30 },{ ip:'10.0.14.1', mask:30 }] },
          { id: 'sc_mesh_2', type: 'router', x: 840, y: 200, label: 'R2', interfaces:[{ ip:'10.0.12.2', mask:30 },{ ip:'10.0.23.1', mask:30 },{ ip:'10.0.24.1', mask:30 }] },
          { id: 'sc_mesh_3', type: 'router', x: 360, y: 520, label: 'R3', interfaces:[{ ip:'10.0.13.2', mask:30 },{ ip:'10.0.23.2', mask:30 },{ ip:'10.0.34.1', mask:30 }] },
          { id: 'sc_mesh_4', type: 'router', x: 840, y: 520, label: 'R4', interfaces:[{ ip:'10.0.14.2', mask:30 },{ ip:'10.0.24.2', mask:30 },{ ip:'10.0.34.2', mask:30 }] },
        ],
        cables: [
          { id: 'sc_mesh_c1', fromId: 'sc_mesh_1', toId: 'sc_mesh_2', type: 'cat6' },
          { id: 'sc_mesh_c2', fromId: 'sc_mesh_1', toId: 'sc_mesh_3', type: 'cat6' },
          { id: 'sc_mesh_c3', fromId: 'sc_mesh_1', toId: 'sc_mesh_4', type: 'cat6' },
          { id: 'sc_mesh_c4', fromId: 'sc_mesh_2', toId: 'sc_mesh_3', type: 'cat6' },
          { id: 'sc_mesh_c5', fromId: 'sc_mesh_2', toId: 'sc_mesh_4', type: 'cat6' },
          { id: 'sc_mesh_c6', fromId: 'sc_mesh_3', toId: 'sc_mesh_4', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Full mesh wires every node to every other node — n(n-1)/2 links. Most fault-tolerant shape, most expensive to scale (link count is quadratic in node count).',
      examRelevance: {
        overview:      'Full mesh = every node has a direct link to every other node.',
        howItRoutes:   'Direct path between any pair; routing protocols choose shortest available link if multiple exist.',
        keyDevices:    'Routers or switches; node type matches deployment (core WAN, datacentre).',
        keyConcepts:   'Link count = n(n-1)/2 (here: 4 nodes = 6 links). Partial mesh is the practical compromise.',
        examRelevance: 'N10-009 obj 1.2 — recognise mesh on diagrams; calculate links; contrast with star/ring.',
      },
      completion: {
        requiredDevices: ['router'],
        expectedCount:   { router: 4 },
        requiredCables:  [
          { from:'router', to:'router' },
        ],
      },
    },
    {
      id: 'three-tier-hierarchical',
      title: '3-Tier Hierarchical (Core / Distribution / Access)',
      category: 'architecture',
      objectiveRefs: ['1.6'],
      startingState: {
        devices: [
          { id: 'sc_3tier_core1', type: 'l3-switch', x: 600, y: 160, label: 'CORE-1', interfaces:[{ ip:'10.0.12.1', mask:30 },{ ip:'10.0.13.1', mask:30 }] },
          { id: 'sc_3tier_dist1', type: 'l3-switch', x: 360, y: 340, label: 'DIST-1', interfaces:[{ ip:'10.0.12.2', mask:30 },{ ip:'192.168.10.1', mask:24 }] },
          { id: 'sc_3tier_dist2', type: 'l3-switch', x: 840, y: 340, label: 'DIST-2', interfaces:[{ ip:'10.0.13.2', mask:30 },{ ip:'192.168.20.1', mask:24 }] },
          { id: 'sc_3tier_acc1',  type: 'switch',    x: 240, y: 540, label: 'ACC-1' },
          { id: 'sc_3tier_acc2',  type: 'switch',    x: 480, y: 540, label: 'ACC-2' },
          { id: 'sc_3tier_acc3',  type: 'switch',    x: 720, y: 540, label: 'ACC-3' },
          { id: 'sc_3tier_acc4',  type: 'switch',    x: 960, y: 540, label: 'ACC-4' },
        ],
        cables: [
          { id: 'sc_3tier_c1', fromId: 'sc_3tier_core1', toId: 'sc_3tier_dist1', type: 'fiber' },
          { id: 'sc_3tier_c2', fromId: 'sc_3tier_core1', toId: 'sc_3tier_dist2', type: 'fiber' },
          { id: 'sc_3tier_c3', fromId: 'sc_3tier_dist1', toId: 'sc_3tier_acc1',  type: 'cat6' },
          { id: 'sc_3tier_c4', fromId: 'sc_3tier_dist1', toId: 'sc_3tier_acc2',  type: 'cat6' },
          { id: 'sc_3tier_c5', fromId: 'sc_3tier_dist2', toId: 'sc_3tier_acc3',  type: 'cat6' },
          { id: 'sc_3tier_c6', fromId: 'sc_3tier_dist2', toId: 'sc_3tier_acc4',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Cisco-style 3-tier separates routing (core), policy + aggregation (distribution), and end-user attach (access). The shape under most enterprise campus diagrams.',
      examRelevance: {
        overview:      'Three layers: core (fast routing), distribution (policy + uplinks), access (user attach).',
        howItRoutes:   'L3 routing happens at core + distribution. Access is L2 (or L3 with SVIs at distribution).',
        keyDevices:    'L3 switches at core + distribution, L2 switches at access.',
        keyConcepts:   'Separation of concerns. Failure domains. Why "collapsed core" merges core + distribution for smaller sites.',
        examRelevance: 'N10-009 obj 1.6 — recognise 3-tier vs collapsed core vs spine-leaf; identify tier from a diagram.',
      },
      completion: {
        requiredDevices: ['l3-switch','switch'],
        expectedCount:   { 'l3-switch': 3, switch: 4 },
        requiredCables:  [
          { from:'l3-switch', to:'l3-switch' },
          { from:'l3-switch', to:'switch' },
        ],
      },
    },
    {
      id: 'hub-and-spoke-wan',
      title: 'Hub-and-Spoke WAN With Branch Routers',
      category: 'wan',
      objectiveRefs: ['1.6', '2.1'],
      startingState: {
        devices: [
          { id: 'sc_hns_hub', type: 'router', x: 600, y: 300, label: 'HQ',   interfaces:[{ ip:'10.0.11.1', mask:30 },{ ip:'10.0.12.1', mask:30 },{ ip:'10.0.13.1', mask:30 },{ ip:'10.0.14.1', mask:30 }] },
          { id: 'sc_hns_b1',  type: 'router', x: 320, y: 200, label: 'BR-1', interfaces:[{ ip:'10.0.11.2', mask:30 }] },
          { id: 'sc_hns_b2',  type: 'router', x: 320, y: 400, label: 'BR-2', interfaces:[{ ip:'10.0.12.2', mask:30 }] },
          { id: 'sc_hns_b3',  type: 'router', x: 880, y: 200, label: 'BR-3', interfaces:[{ ip:'10.0.13.2', mask:30 }] },
          { id: 'sc_hns_b4',  type: 'router', x: 880, y: 400, label: 'BR-4', interfaces:[{ ip:'10.0.14.2', mask:30 }] },
        ],
        cables: [
          { id: 'sc_hns_c1', fromId: 'sc_hns_hub', toId: 'sc_hns_b1', type: 'fiber' },
          { id: 'sc_hns_c2', fromId: 'sc_hns_hub', toId: 'sc_hns_b2', type: 'fiber' },
          { id: 'sc_hns_c3', fromId: 'sc_hns_hub', toId: 'sc_hns_b3', type: 'fiber' },
          { id: 'sc_hns_c4', fromId: 'sc_hns_hub', toId: 'sc_hns_b4', type: 'fiber' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Hub-and-spoke centralises WAN traffic through a single HQ router. All branch-to-branch traffic transits the hub — simple to manage, single point of failure, the classic SD-WAN starting shape.',
      examRelevance: {
        overview:      'All branches connect only to the hub. Branch-to-branch goes hub → branch.',
        howItRoutes:   'Hub is the default gateway for inter-branch traffic. Static or BGP routing pinned to the hub.',
        keyDevices:    'Hub router (HQ) + branch routers. Often firewalls in the path.',
        keyConcepts:   'Hub bottleneck. Failure domain (hub down = all branches isolated from each other). Common SD-WAN underlay.',
        examRelevance: 'N10-009 obj 1.6 — WAN topology archetype. Contrast with full-mesh + partial-mesh + MPLS.',
      },
      completion: {
        requiredDevices: ['router'],
        expectedCount:   { router: 5 },
        requiredCables:  [
          { from:'router', to:'router' },
        ],
      },
    },
    {
      id: 'hybrid-cloud',
      title: 'Hybrid Cloud (On-Prem + Public Cloud)',
      category: 'cloud',
      objectiveRefs: ['1.8'],
      startingState: {
        devices: [
          { id: 'sc_hyb_onprem_sw', type: 'switch',      x: 320, y: 360, label: 'ONPREM-SW' },
          { id: 'sc_hyb_onprem_fw', type: 'firewall',    x: 520, y: 360, label: 'EDGE-FW',   interfaces:[{ ip:'192.168.10.2', mask:24 },{ ip:'10.0.99.1', mask:30 }] },
          { id: 'sc_hyb_vpn',       type: 'vpn',         x: 720, y: 360, label: 'IPSEC-VPN', interfaces:[{ ip:'10.0.99.2', mask:30 },{ ip:'10.100.0.1', mask:24 }] },
          { id: 'sc_hyb_cloud',     type: 'cloud',       x: 920, y: 360, label: 'AWS-VPC',   interfaces:[{ ip:'10.100.0.2', mask:24 }] },
          { id: 'sc_hyb_srv',       type: 'server',      x: 320, y: 180, label: 'APP-01',    config:{ ip:'192.168.10.10', mask:24, gateway:'192.168.10.2' } },
          { id: 'sc_hyb_ws',        type: 'pc', x: 320, y: 540, label: 'WS-01',     config:{ ip:'192.168.10.20', mask:24, gateway:'192.168.10.2' } },
        ],
        cables: [
          { id: 'sc_hyb_c1', fromId: 'sc_hyb_onprem_sw', toId: 'sc_hyb_srv',       type: 'cat6' },
          { id: 'sc_hyb_c2', fromId: 'sc_hyb_onprem_sw', toId: 'sc_hyb_ws',        type: 'cat6' },
          { id: 'sc_hyb_c3', fromId: 'sc_hyb_onprem_sw', toId: 'sc_hyb_onprem_fw', type: 'cat6' },
          { id: 'sc_hyb_c4', fromId: 'sc_hyb_onprem_fw', toId: 'sc_hyb_vpn',       type: 'fiber' },
          { id: 'sc_hyb_c5', fromId: 'sc_hyb_vpn',       toId: 'sc_hyb_cloud',     type: 'fiber' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Hybrid cloud extends on-prem into a public-cloud VPC via an IPsec VPN over the public internet. The model behind most enterprise cloud migrations — keep regulated workloads on-prem, burst stateless ones to AWS/Azure.',
      examRelevance: {
        overview:      'On-prem network + public-cloud VPC, joined by VPN (or Direct Connect / ExpressRoute).',
        howItRoutes:   'On-prem default route hands cloud-bound traffic to the edge firewall, which steers it through the VPN tunnel to the cloud gateway.',
        keyDevices:    'Edge firewall, VPN gateway (on-prem side), cloud VPC (which hosts its own VPN endpoint).',
        keyConcepts:   'Site-to-site VPN. Encryption boundary at the VPN gateways. VPC = cloud-side virtual network.',
        examRelevance: 'N10-009 obj 1.8 — cloud deployment models (hybrid vs public vs private vs community).',
      },
      completion: {
        requiredDevices: ['switch','firewall','vpn','cloud'],
        expectedCount:   { switch:1, firewall:1, vpn:1, cloud:1 },
        requiredCables:  [
          { from:'switch',   to:'firewall' },
          { from:'firewall', to:'vpn' },
          { from:'vpn',      to:'cloud' },
        ],
      },
    },
    {
      id: 'wireless-controller-bss-ess',
      title: 'Wireless Infrastructure (BSS + ESS) With Controller',
      category: 'wireless',
      objectiveRefs: ['2.4'],
      startingState: {
        devices: [
          { id: 'sc_wls_wlc', type: 'wlc',        x: 600, y: 180, label: 'WLC-01' },
          { id: 'sc_wls_sw',  type: 'switch',     x: 600, y: 360, label: 'CORE-SW' },
          { id: 'sc_wls_ap1', type: 'wap',         x: 360, y: 540, label: 'AP-01' },
          { id: 'sc_wls_ap2', type: 'wap',         x: 600, y: 540, label: 'AP-02' },
          { id: 'sc_wls_ap3', type: 'wap',         x: 840, y: 540, label: 'AP-03' },
          { id: 'sc_wls_cli1',type: 'smartphone', x: 280, y: 700, label: 'PHONE',  config:{ ip:'192.168.10.20', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_wls_cli2',type: 'laptop',     x: 520, y: 700, label: 'LAPTOP', config:{ ip:'192.168.10.21', mask:24, gateway:'192.168.10.1' } },
        ],
        cables: [
          { id: 'sc_wls_c1', fromId: 'sc_wls_wlc', toId: 'sc_wls_sw',  type: 'cat6' },
          { id: 'sc_wls_c2', fromId: 'sc_wls_sw',  toId: 'sc_wls_ap1', type: 'cat6' },
          { id: 'sc_wls_c3', fromId: 'sc_wls_sw',  toId: 'sc_wls_ap2', type: 'cat6' },
          { id: 'sc_wls_c4', fromId: 'sc_wls_sw',  toId: 'sc_wls_ap3', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A controller-based wireless deployment (ESS = Extended Service Set) has multiple APs sharing one SSID, coordinated by a Wireless LAN Controller. Roaming clients transition seamlessly between APs because the controller arbitrates the handoff.',
      examRelevance: {
        overview:      'ESS = multiple APs broadcasting the same SSID, controlled centrally by a WLC.',
        howItRoutes:   'APs tunnel client traffic to the controller (CAPWAP); controller forwards to wired LAN. Roaming = the controller migrates the client session.',
        keyDevices:    'WLC (controller), APs (each = its own BSS), backbone switch.',
        keyConcepts:   'BSS vs ESS, BSSID vs SSID, lightweight vs autonomous APs, roaming.',
        examRelevance: 'N10-009 obj 2.4 — wireless deployment models. Differentiate ad-hoc / infrastructure / mesh.',
      },
      completion: {
        requiredDevices: ['wlc','switch','wap'],
        expectedCount:   { wlc:1, switch:1, wap:3 },
        requiredCables:  [
          { from:'wlc',    to:'switch' },
          { from:'switch', to:'wap' },
        ],
      },
    },
    {
      id: 'dmz-screened-subnet',
      title: 'DMZ / Screened Subnet',
      category: 'security',
      objectiveRefs: ['1.6', '4.1'],
      startingState: {
        devices: [
          { id: 'sc_dmz_internet', type: 'internet', x: 600, y: 100, label: 'INTERNET', interfaces:[{ ip:'203.0.113.1', mask:30 }] },
          { id: 'sc_dmz_outerfw',  type: 'firewall', x: 600, y: 260, label: 'OUTER-FW', interfaces:[{ ip:'203.0.113.2', mask:30 },{ ip:'192.168.30.1', mask:24 }] },
          { id: 'sc_dmz_dmzsrv',   type: 'server',   x: 380, y: 400, label: 'WEB-DMZ',  config:{ ip:'192.168.30.10', mask:24, gateway:'192.168.30.1' } },
          { id: 'sc_dmz_dmzsrv2',  type: 'server',   x: 820, y: 400, label: 'MAIL-DMZ', config:{ ip:'192.168.30.11', mask:24, gateway:'192.168.30.1' } },
          { id: 'sc_dmz_innerfw',  type: 'firewall', x: 600, y: 560, label: 'INNER-FW', interfaces:[{ ip:'192.168.30.254', mask:24 },{ ip:'192.168.10.1', mask:24 }] },
          { id: 'sc_dmz_lan_sw',   type: 'switch',   x: 600, y: 720, label: 'LAN-SW' },
        ],
        cables: [
          { id: 'sc_dmz_c1', fromId: 'sc_dmz_internet', toId: 'sc_dmz_outerfw', type: 'fiber' },
          { id: 'sc_dmz_c2', fromId: 'sc_dmz_outerfw',  toId: 'sc_dmz_dmzsrv',  type: 'cat6' },
          { id: 'sc_dmz_c3', fromId: 'sc_dmz_outerfw',  toId: 'sc_dmz_dmzsrv2', type: 'cat6' },
          { id: 'sc_dmz_c4', fromId: 'sc_dmz_outerfw',  toId: 'sc_dmz_innerfw', type: 'cat6' },
          { id: 'sc_dmz_c5', fromId: 'sc_dmz_innerfw',  toId: 'sc_dmz_lan_sw',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A screened subnet (the modern name for DMZ) sits between two firewalls. Internet-facing servers live there. The outer firewall lets internet → DMZ; the inner one blocks DMZ → LAN by default. Compromise of the DMZ does not get the attacker into the LAN.',
      examRelevance: {
        overview:      'Two firewalls + a middle "screened subnet" hosting public services.',
        howItRoutes:   'Outer FW: internet ↔ DMZ. Inner FW: DMZ ↔ LAN (heavily filtered). Direct internet ↔ LAN blocked.',
        keyDevices:    'Outer firewall, DMZ-hosted servers (web/mail/DNS), inner firewall, LAN switch.',
        keyConcepts:   'Defense in depth, screened subnet, why a single firewall with 3 zones is the same idea at lower cost.',
        examRelevance: 'N10-009 obj 4.1 — network security architecture. Contrast with bastion host, zero-trust.',
      },
      completion: {
        requiredDevices: ['firewall','server','internet','switch'],
        expectedCount:   { firewall:2, server:2, internet:1, switch:1 },
        requiredCables:  [
          { from:'internet', to:'firewall' },
          { from:'firewall', to:'server' },
          { from:'firewall', to:'switch' },
        ],
      },
    },
    {
      id: 'router-on-a-stick',
      title: 'Router-on-a-Stick (Inter-VLAN Routing)',
      category: 'vlan',
      objectiveRefs: ['2.1', '2.3'],
      startingState: {
        devices: [
          { id: 'sc_roas_router', type: 'router', x: 600, y: 200, label: 'R1', interfaces:[
            { ip:'192.168.10.1', mask:24 },
            { ip:'192.168.20.1', mask:24 },
          ] },
          { id: 'sc_roas_switch', type: 'switch', x: 600, y: 380, label: 'SW1' },
          { id: 'sc_roas_v10_a',  type: 'pc', x: 320, y: 560, label: 'VLAN10-A', config:{ ip:'192.168.10.10', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_roas_v10_b',  type: 'pc', x: 480, y: 560, label: 'VLAN10-B', config:{ ip:'192.168.10.11', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_roas_v20_a',  type: 'pc', x: 720, y: 560, label: 'VLAN20-A', config:{ ip:'192.168.20.10', mask:24, gateway:'192.168.20.1' } },
          { id: 'sc_roas_v20_b',  type: 'pc', x: 880, y: 560, label: 'VLAN20-B', config:{ ip:'192.168.20.11', mask:24, gateway:'192.168.20.1' } },
        ],
        cables: [
          { id: 'sc_roas_c1', fromId: 'sc_roas_router', toId: 'sc_roas_switch', type: 'cat6' },
          { id: 'sc_roas_c2', fromId: 'sc_roas_switch', toId: 'sc_roas_v10_a',  type: 'cat6' },
          { id: 'sc_roas_c3', fromId: 'sc_roas_switch', toId: 'sc_roas_v10_b',  type: 'cat6' },
          { id: 'sc_roas_c4', fromId: 'sc_roas_switch', toId: 'sc_roas_v20_a',  type: 'cat6' },
          { id: 'sc_roas_c5', fromId: 'sc_roas_switch', toId: 'sc_roas_v20_b',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Router-on-a-stick uses a single trunked link between a switch and a router. The router carries one subinterface per VLAN — that\'s how hosts in VLAN 10 reach hosts in VLAN 20 without an L3 switch. The classic exam contrast against SVIs on an L3 switch.',
      examRelevance: {
        overview:      'One physical link between switch and router carries multiple VLANs as a trunk; router subinterfaces route between them.',
        howItRoutes:   'Switch trunks frames tagged with VLAN IDs to the router. Router subinterface per VLAN holds the gateway IP. Inter-VLAN packets hairpin through the router.',
        keyDevices:    'L2 switch (with trunk port) + router (with subinterfaces).',
        keyConcepts:   '802.1Q tagging, trunk vs access ports, subinterfaces, hairpin routing, why an L3 switch is faster.',
        examRelevance: 'N10-009 obj 2.1 (switching) + obj 2.3 (VLANs). Commonly tested against L3-switch inter-VLAN.',
      },
      completion: {
        requiredDevices: ['router','switch','pc'],
        expectedCount:   { router:1, switch:1, pc:4 },
        requiredCables:  [
          { from:'router', to:'switch' },
          { from:'switch', to:'pc' },
        ],
      },
    },
    {
      id: 'ring-topology',
      title: 'Ring Topology (5 Nodes, Closed Loop)',
      category: 'topology',
      objectiveRefs: ['1.2'],
      startingState: {
        devices: [
          { id: 'sc_ring_1', type: 'router', x: 600, y: 160, label: 'R1', interfaces:[{ ip:'10.0.51.1', mask:30 },{ ip:'10.0.12.1', mask:30 }] },
          { id: 'sc_ring_2', type: 'router', x: 840, y: 280, label: 'R2', interfaces:[{ ip:'10.0.12.2', mask:30 },{ ip:'10.0.23.1', mask:30 }] },
          { id: 'sc_ring_3', type: 'router', x: 760, y: 520, label: 'R3', interfaces:[{ ip:'10.0.23.2', mask:30 },{ ip:'10.0.34.1', mask:30 }] },
          { id: 'sc_ring_4', type: 'router', x: 440, y: 520, label: 'R4', interfaces:[{ ip:'10.0.34.2', mask:30 },{ ip:'10.0.45.1', mask:30 }] },
          { id: 'sc_ring_5', type: 'router', x: 360, y: 280, label: 'R5', interfaces:[{ ip:'10.0.45.2', mask:30 },{ ip:'10.0.51.2', mask:30 }] },
        ],
        cables: [
          { id: 'sc_ring_c1', fromId: 'sc_ring_1', toId: 'sc_ring_2', type: 'cat6' },
          { id: 'sc_ring_c2', fromId: 'sc_ring_2', toId: 'sc_ring_3', type: 'cat6' },
          { id: 'sc_ring_c3', fromId: 'sc_ring_3', toId: 'sc_ring_4', type: 'cat6' },
          { id: 'sc_ring_c4', fromId: 'sc_ring_4', toId: 'sc_ring_5', type: 'cat6' },
          { id: 'sc_ring_c5', fromId: 'sc_ring_5', toId: 'sc_ring_1', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Ring topology connects nodes in a closed loop where every device has exactly two neighbours. A single link break partitions the ring unless the protocol supports bidirectional traffic (FDDI dual ring) or self-healing arbitration. Largely a legacy LAN shape today, but the exam still tests recognition + the failure-domain trade-off.',
      examRelevance: {
        overview:      'Closed loop of N devices, each with exactly two neighbours.',
        howItRoutes:   'Traffic circulates around the ring in one direction (single-ring) or both (dual-ring); legacy variants used token passing to arbitrate access.',
        keyDevices:    'Routers or switches in the loop; no central node.',
        keyConcepts:   'Single link break partitions the ring; dual-ring (FDDI) survives one cut.',
        examRelevance: 'N10-009 obj 1.2 — recognise ring on a diagram; contrast its failure mode against star/mesh.',
      },
      completion: {
        requiredDevices: ['router'],
        expectedCount:   { router: 5 },
        requiredCables:  [
          { from:'router', to:'router' },
        ],
      },
    },
    {
      id: 'point-to-point-topology',
      title: 'Point-to-Point Topology (Single Dedicated Link)',
      category: 'topology',
      objectiveRefs: ['1.2'],
      startingState: {
        devices: [
          { id: 'sc_p2p_1', type: 'router', x: 440, y: 360, label: 'R1', interfaces:[{ ip:'10.0.12.1', mask:30 }] },
          { id: 'sc_p2p_2', type: 'router', x: 800, y: 360, label: 'R2', interfaces:[{ ip:'10.0.12.2', mask:30 }] },
        ],
        cables: [
          { id: 'sc_p2p_c1', fromId: 'sc_p2p_1', toId: 'sc_p2p_2', type: 'fiber' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Point-to-point dedicates one link between two endpoints with no intermediate device. It is the atomic WAN building block — serial links, leased lines, microwave hops, satellite uplinks all share this shape. The exam contrasts it against multi-access and point-to-multipoint topologies.',
      examRelevance: {
        overview:      'A single dedicated link between two endpoints, no intermediaries.',
        howItRoutes:   'Direct delivery; no media-access arbitration since the link has only two participants.',
        keyDevices:    'Two routers (or any endpoint pair) and one link.',
        keyConcepts:   'The atomic WAN building block; leased lines, serial circuits and microwave hops are all point-to-point.',
        examRelevance: 'N10-009 obj 1.2 — distinguish point-to-point from point-to-multipoint and broadcast LAN topologies.',
      },
      completion: {
        requiredDevices: ['router'],
        expectedCount:   { router: 2 },
        requiredCables:  [
          { from:'router', to:'router' },
        ],
      },
    },
    {
      id: 'spine-leaf-fabric',
      title: 'Spine-Leaf Fabric (2 Spines, 4 Leaves)',
      category: 'architecture',
      objectiveRefs: ['1.6'],
      startingState: {
        devices: [
          { id: 'sc_slf_s1', type: 'l3-switch', x: 480, y: 200, label: 'SPINE-1', interfaces:[{ ip:'10.0.11.1', mask:30 },{ ip:'10.0.12.1', mask:30 },{ ip:'10.0.13.1', mask:30 },{ ip:'10.0.14.1', mask:30 }] },
          { id: 'sc_slf_s2', type: 'l3-switch', x: 720, y: 200, label: 'SPINE-2', interfaces:[{ ip:'10.0.21.1', mask:30 },{ ip:'10.0.22.1', mask:30 },{ ip:'10.0.23.1', mask:30 },{ ip:'10.0.24.1', mask:30 }] },
          { id: 'sc_slf_l1', type: 'l3-switch', x: 320, y: 480, label: 'LEAF-1', interfaces:[{ ip:'10.0.11.2', mask:30 },{ ip:'10.0.21.2', mask:30 }] },
          { id: 'sc_slf_l2', type: 'l3-switch', x: 520, y: 480, label: 'LEAF-2', interfaces:[{ ip:'10.0.12.2', mask:30 },{ ip:'10.0.22.2', mask:30 }] },
          { id: 'sc_slf_l3', type: 'l3-switch', x: 720, y: 480, label: 'LEAF-3', interfaces:[{ ip:'10.0.13.2', mask:30 },{ ip:'10.0.23.2', mask:30 }] },
          { id: 'sc_slf_l4', type: 'l3-switch', x: 920, y: 480, label: 'LEAF-4', interfaces:[{ ip:'10.0.14.2', mask:30 },{ ip:'10.0.24.2', mask:30 }] },
        ],
        cables: [
          { id: 'sc_slf_c1', fromId: 'sc_slf_l1', toId: 'sc_slf_s1', type: 'fiber' },
          { id: 'sc_slf_c2', fromId: 'sc_slf_l1', toId: 'sc_slf_s2', type: 'fiber' },
          { id: 'sc_slf_c3', fromId: 'sc_slf_l2', toId: 'sc_slf_s1', type: 'fiber' },
          { id: 'sc_slf_c4', fromId: 'sc_slf_l2', toId: 'sc_slf_s2', type: 'fiber' },
          { id: 'sc_slf_c5', fromId: 'sc_slf_l3', toId: 'sc_slf_s1', type: 'fiber' },
          { id: 'sc_slf_c6', fromId: 'sc_slf_l3', toId: 'sc_slf_s2', type: 'fiber' },
          { id: 'sc_slf_c7', fromId: 'sc_slf_l4', toId: 'sc_slf_s1', type: 'fiber' },
          { id: 'sc_slf_c8', fromId: 'sc_slf_l4', toId: 'sc_slf_s2', type: 'fiber' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Spine-leaf is the dominant modern data-centre fabric. Every leaf connects to every spine, so any server pair has equal-cost paths through any spine (East-West optimised). Contrast with 3-tier hierarchy where distribution + core uplinks concentrate the bottleneck risk.',
      examRelevance: {
        overview:      'Two-tier fabric: every leaf switch connects to every spine switch.',
        howItRoutes:   'Leaves are L3 top-of-rack; spines provide equal-cost paths between leaves via ECMP routing — no STP.',
        keyDevices:    'Spine L3 switches (forwarding only) + leaf L3 switches (server-facing + L3 gateway).',
        keyConcepts:   'Predictable East-West bandwidth, single-hop leaf-to-leaf via any spine, scales by adding spines or leaves.',
        examRelevance: 'N10-009 obj 1.6 — recognise spine-leaf vs 3-tier; pick the right shape (DC fabric vs campus access).',
      },
      completion: {
        requiredDevices: ['l3-switch'],
        expectedCount:   { 'l3-switch': 6 },
        requiredCables:  [
          { from:'l3-switch', to:'l3-switch' },
        ],
      },
    },
    {
      id: 'collapsed-core',
      title: 'Collapsed Core (2 L3 + 4 Access)',
      category: 'architecture',
      objectiveRefs: ['1.6'],
      startingState: {
        devices: [
          { id: 'sc_cc_l3a',  type: 'l3-switch', x: 440, y: 240, label: 'L3-A', interfaces:[{ ip:'10.0.12.1', mask:30 },{ ip:'192.168.10.1', mask:24 }] },
          { id: 'sc_cc_l3b',  type: 'l3-switch', x: 760, y: 240, label: 'L3-B', interfaces:[{ ip:'10.0.12.2', mask:30 },{ ip:'192.168.10.2', mask:24 }] },
          { id: 'sc_cc_acc1', type: 'switch',    x: 320, y: 520, label: 'ACC-1' },
          { id: 'sc_cc_acc2', type: 'switch',    x: 480, y: 520, label: 'ACC-2' },
          { id: 'sc_cc_acc3', type: 'switch',    x: 720, y: 520, label: 'ACC-3' },
          { id: 'sc_cc_acc4', type: 'switch',    x: 880, y: 520, label: 'ACC-4' },
        ],
        cables: [
          { id: 'sc_cc_c1', fromId: 'sc_cc_l3a',  toId: 'sc_cc_l3b',  type: 'fiber' },
          { id: 'sc_cc_c2', fromId: 'sc_cc_acc1', toId: 'sc_cc_l3a',  type: 'cat6'  },
          { id: 'sc_cc_c3', fromId: 'sc_cc_acc2', toId: 'sc_cc_l3a',  type: 'cat6'  },
          { id: 'sc_cc_c4', fromId: 'sc_cc_acc2', toId: 'sc_cc_l3b',  type: 'cat6'  },
          { id: 'sc_cc_c5', fromId: 'sc_cc_acc3', toId: 'sc_cc_l3b',  type: 'cat6'  },
          { id: 'sc_cc_c6', fromId: 'sc_cc_acc4', toId: 'sc_cc_l3b',  type: 'cat6'  },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Collapsed core merges the core and distribution layers of the Cisco 3-tier model onto a single pair of L3 switches. Common in branches and SMBs where separate core + distribution hardware is overkill. Trades clean separation for lower cost and rack footprint.',
      examRelevance: {
        overview:      '3-tier hierarchy compressed: core + distribution functions live on the same L3 switch pair.',
        howItRoutes:   'L3 routing happens on the collapsed switches; access switches stay L2 with gateways on the collapsed pair (typically HSRP/VRRP).',
        keyDevices:    'Two L3 switches (collapsed core+distribution, usually HA pair) + L2 access switches.',
        keyConcepts:   'Reduced budget + footprint, HSRP/VRRP gateway redundancy, same access pattern but fewer tiers.',
        examRelevance: 'N10-009 obj 1.6 — recognise collapsed core vs full 3-tier; size hierarchy to the site.',
      },
      completion: {
        requiredDevices: ['l3-switch', 'switch'],
        expectedCount:   { 'l3-switch': 2, switch: 4 },
        requiredCables:  [
          { from:'l3-switch', to:'l3-switch' },
          { from:'l3-switch', to:'switch' },
        ],
      },
    },
    {
      id: 'soho-network',
      title: 'SOHO (Router + Switch + AP + Endpoints)',
      category: 'architecture',
      objectiveRefs: ['1.6'],
      startingState: {
        devices: [
          { id: 'sc_soho_rtr', type: 'router',      x: 520, y: 200, label: 'GATEWAY', interfaces:[{ ip:'192.168.10.1', mask:24 }] },
          { id: 'sc_soho_sw',  type: 'switch',      x: 520, y: 360, label: 'LAN-SW' },
          { id: 'sc_soho_ap',  type: 'wap',          x: 760, y: 360, label: 'AP-01' },
          { id: 'sc_soho_ws1', type: 'pc', x: 280, y: 520, label: 'WS-1',   config:{ ip:'192.168.10.10', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_soho_ws2', type: 'pc', x: 440, y: 520, label: 'WS-2',   config:{ ip:'192.168.10.11', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_soho_lap', type: 'laptop',      x: 760, y: 520, label: 'LAPTOP', config:{ ip:'192.168.10.20', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_soho_phn', type: 'smartphone',  x: 920, y: 520, label: 'PHONE',  config:{ ip:'192.168.10.21', mask:24, gateway:'192.168.10.1' } },
        ],
        cables: [
          { id: 'sc_soho_c1', fromId: 'sc_soho_rtr', toId: 'sc_soho_sw',  type: 'cat6' },
          { id: 'sc_soho_c2', fromId: 'sc_soho_sw',  toId: 'sc_soho_ws1', type: 'cat6' },
          { id: 'sc_soho_c3', fromId: 'sc_soho_sw',  toId: 'sc_soho_ws2', type: 'cat6' },
          { id: 'sc_soho_c4', fromId: 'sc_soho_sw',  toId: 'sc_soho_ap',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'SOHO networks converge gateway, DHCP, NAT and Wi-Fi onto one consumer router (or split the AP out for prosumer setups). Wired endpoints sit behind a switch; wireless clients associate to the AP and bridge onto the wired LAN. The scale floor every cert candidate sees in their own home.',
      examRelevance: {
        overview:      'Small office or home network: one router (gateway), one switch, one AP, a handful of endpoints.',
        howItRoutes:   'Router runs NAT + DHCP + DNS for the LAN; switch carries L2 frames; AP bridges wireless clients onto the wired side.',
        keyDevices:    'Edge router (often a combined router+switch+AP appliance), LAN switch, AP, wired + wireless clients.',
        keyConcepts:   'NAT + DHCP + Wi-Fi typically converged on one box; flat L2 broadcast domain; no VLANs by default.',
        examRelevance: 'N10-009 obj 1.6 — recognise the SOHO baseline; contrast its flat L2 against enterprise 3-tier.',
      },
      completion: {
        requiredDevices: ['router', 'switch', 'wap'],
        expectedCount:   { router: 1, switch: 1, wap: 1 },
        requiredCables:  [
          { from:'router', to:'switch' },
          { from:'switch', to:'wap' },
        ],
      },
    },
    {
      id: 'mpls-wan',
      title: 'MPLS WAN (Provider Any-to-Any)',
      category: 'wan',
      objectiveRefs: ['1.6'],
      startingState: {
        devices: [
          { id: 'sc_mpls_mpls', type: 'cloud',  x: 600, y: 360, label: 'MPLS-CORE', interfaces:[
            { ip:'10.0.11.1', mask:30 },
            { ip:'10.0.12.1', mask:30 },
            { ip:'10.0.13.1', mask:30 },
            { ip:'10.0.14.1', mask:30 },
            { ip:'10.0.15.1', mask:30 },
          ] },
          { id: 'sc_mpls_hq',  type: 'router', x: 600, y: 160, label: 'HQ',   interfaces:[{ ip:'10.0.11.2', mask:30 }] },
          { id: 'sc_mpls_b1',  type: 'router', x: 280, y: 280, label: 'BR-1', interfaces:[{ ip:'10.0.12.2', mask:30 }] },
          { id: 'sc_mpls_b2',  type: 'router', x: 280, y: 480, label: 'BR-2', interfaces:[{ ip:'10.0.13.2', mask:30 }] },
          { id: 'sc_mpls_b3',  type: 'router', x: 920, y: 280, label: 'BR-3', interfaces:[{ ip:'10.0.14.2', mask:30 }] },
          { id: 'sc_mpls_b4',  type: 'router', x: 920, y: 480, label: 'BR-4', interfaces:[{ ip:'10.0.15.2', mask:30 }] },
        ],
        cables: [
          { id: 'sc_mpls_c1', fromId: 'sc_mpls_hq', toId: 'sc_mpls_mpls', type: 'fiber' },
          { id: 'sc_mpls_c2', fromId: 'sc_mpls_b1', toId: 'sc_mpls_mpls', type: 'fiber' },
          { id: 'sc_mpls_c3', fromId: 'sc_mpls_b2', toId: 'sc_mpls_mpls', type: 'fiber' },
          { id: 'sc_mpls_c4', fromId: 'sc_mpls_b3', toId: 'sc_mpls_mpls', type: 'fiber' },
          { id: 'sc_mpls_c5', fromId: 'sc_mpls_b4', toId: 'sc_mpls_mpls', type: 'fiber' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'MPLS WAN puts a provider-managed L3 cloud between every site. Each branch has one link into the MPLS PE; the provider handles any-to-any reachability without the customer having to build the mesh. The classic enterprise WAN before SD-WAN started displacing it.',
      examRelevance: {
        overview:      'Customer sites connect into a provider MPLS cloud; the provider supplies inter-site reachability.',
        howItRoutes:   'CE routers peer with PE routers via BGP or static routes; the provider builds an L3VPN across the MPLS backbone.',
        keyDevices:    'Customer-edge (CE) routers + provider-edge (PE) routers + the provider MPLS core (the cloud).',
        keyConcepts:   'Any-to-any reachability without customer-managed links; CE/PE separation; QoS classes; L3VPN.',
        examRelevance: 'N10-009 obj 1.6 — recognise the MPLS provider model; contrast with hub-and-spoke and full mesh.',
      },
      completion: {
        requiredDevices: ['router', 'cloud'],
        expectedCount:   { router: 5, cloud: 1 },
        requiredCables:  [
          { from:'router', to:'cloud' },
        ],
      },
    },
    {
      id: 'partial-mesh-wan',
      title: 'Partial Mesh WAN (4 Routers, 4 Links)',
      category: 'wan',
      objectiveRefs: ['1.6'],
      startingState: {
        devices: [
          { id: 'sc_pm_a', type: 'router', x: 440, y: 240, label: 'R-A', interfaces:[{ ip:'10.0.12.1', mask:30 },{ ip:'10.0.13.1', mask:30 }] },
          { id: 'sc_pm_b', type: 'router', x: 760, y: 240, label: 'R-B', interfaces:[{ ip:'10.0.12.2', mask:30 },{ ip:'10.0.23.1', mask:30 }] },
          { id: 'sc_pm_c', type: 'router', x: 440, y: 520, label: 'R-C', interfaces:[{ ip:'10.0.13.2', mask:30 },{ ip:'10.0.23.2', mask:30 },{ ip:'10.0.34.1', mask:30 }] },
          { id: 'sc_pm_d', type: 'router', x: 760, y: 520, label: 'R-D', interfaces:[{ ip:'10.0.34.2', mask:30 }] },
        ],
        cables: [
          { id: 'sc_pm_c1', fromId: 'sc_pm_a', toId: 'sc_pm_b', type: 'fiber' },
          { id: 'sc_pm_c2', fromId: 'sc_pm_a', toId: 'sc_pm_c', type: 'fiber' },
          { id: 'sc_pm_c3', fromId: 'sc_pm_b', toId: 'sc_pm_c', type: 'fiber' },
          { id: 'sc_pm_c4', fromId: 'sc_pm_c', toId: 'sc_pm_d', type: 'fiber' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Partial mesh wires only the critical pairs between sites instead of fully meshing every router. It is the practical compromise — full mesh is N(N-1)/2 links and does not scale; partial mesh picks the high-traffic edges and lets routing protocols carry the rest through neighbours.',
      examRelevance: {
        overview:      'Some-but-not-all router pairs have direct links; the rest reach each other via intermediaries.',
        howItRoutes:   'Direct links carry their pair traffic; routing protocols (OSPF, BGP) forward across intermediate routers for unconnected pairs.',
        keyDevices:    'Routers at every site, but link count is less than N(N-1)/2.',
        keyConcepts:   'Cost vs reliability trade-off; protected pairs vs transit pairs; partial mesh is what full mesh degrades to when budget shrinks.',
        examRelevance: 'N10-009 obj 1.6 — recognise partial mesh; contrast against full mesh and hub-and-spoke.',
      },
      completion: {
        requiredDevices: ['router'],
        expectedCount:   { router: 4 },
        requiredCables:  [
          { from:'router', to:'router' },
        ],
      },
    },
    {
      id: 'dual-isp-failover',
      title: 'Dual-ISP Failover (Redundant Internet Edge)',
      category: 'wan',
      objectiveRefs: ['1.6'],
      startingState: {
        devices: [
          { id: 'sc_disp_ispa', type: 'internet', x: 440, y: 160, label: 'ISP-A',   interfaces:[{ ip:'203.0.113.1', mask:30 }] },
          { id: 'sc_disp_ispb', type: 'internet', x: 760, y: 160, label: 'ISP-B',   interfaces:[{ ip:'203.0.113.5', mask:30 }] },
          { id: 'sc_disp_rtr',  type: 'router',   x: 600, y: 320, label: 'EDGE-R',  interfaces:[{ ip:'203.0.113.2', mask:30 },{ ip:'203.0.113.6', mask:30 },{ ip:'192.168.10.1', mask:24 }] },
          { id: 'sc_disp_fw',   type: 'firewall', x: 600, y: 480, label: 'EDGE-FW', interfaces:[{ ip:'192.168.10.2', mask:24 },{ ip:'192.168.20.1', mask:24 }] },
          { id: 'sc_disp_sw',   type: 'switch',   x: 600, y: 640, label: 'LAN-SW' },
        ],
        cables: [
          { id: 'sc_disp_c1', fromId: 'sc_disp_rtr', toId: 'sc_disp_ispa', type: 'fiber' },
          { id: 'sc_disp_c2', fromId: 'sc_disp_rtr', toId: 'sc_disp_ispb', type: 'fiber' },
          { id: 'sc_disp_c3', fromId: 'sc_disp_rtr', toId: 'sc_disp_fw',   type: 'cat6'  },
          { id: 'sc_disp_c4', fromId: 'sc_disp_fw',  toId: 'sc_disp_sw',   type: 'cat6'  },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Dual-ISP failover keeps internet access alive when one provider drops. The edge router holds two upstream links and either BGP (if both ISPs support it) or default-route tracking shifts traffic onto the surviving link. The classic small-enterprise high-availability edge.',
      examRelevance: {
        overview:      'Edge router with two ISP uplinks — one preferred, the other standby (or load-balanced).',
        howItRoutes:   'BGP advertises the customer prefixes to both ISPs and prefers the primary; without BGP, IP SLA + floating static routes provide the failover trigger.',
        keyDevices:    'Edge router, two ISP handoffs, firewall, LAN switch.',
        keyConcepts:   'Active/standby vs active/active uplinks, BGP multi-homing, default-route tracking, redundancy at the edge.',
        examRelevance: 'N10-009 obj 1.6 — recognise the redundant WAN edge; classic high-availability question pattern.',
      },
      completion: {
        requiredDevices: ['router', 'internet', 'firewall', 'switch'],
        expectedCount:   { router: 1, internet: 2, firewall: 1, switch: 1 },
        requiredCables:  [
          { from:'router',   to:'internet' },
          { from:'router',   to:'firewall' },
          { from:'firewall', to:'switch' },
        ],
      },
    },
    {
      id: 'public-cloud-only',
      title: 'Public Cloud Only (No On-Prem)',
      category: 'cloud',
      objectiveRefs: ['1.8'],
      startingState: {
        devices: [
          { id: 'sc_pco_inet', type: 'internet',    x: 600, y: 160, label: 'INTERNET', interfaces:[{ ip:'203.0.113.1', mask:30 }] },
          { id: 'sc_pco_fw',   type: 'firewall',    x: 600, y: 320, label: 'CLOUD-FW', interfaces:[{ ip:'203.0.113.2', mask:30 },{ ip:'10.100.0.1', mask:24 }] },
          { id: 'sc_pco_srv1', type: 'server',      x: 380, y: 480, label: 'APP-01',   config:{ ip:'10.100.0.10', mask:24, gateway:'10.100.0.1' } },
          { id: 'sc_pco_srv2', type: 'server',      x: 600, y: 480, label: 'APP-02',   config:{ ip:'10.100.0.11', mask:24, gateway:'10.100.0.1' } },
          { id: 'sc_pco_ws',   type: 'pc', x: 820, y: 480, label: 'ADMIN-WS', config:{ ip:'10.100.0.20', mask:24, gateway:'10.100.0.1' } },
        ],
        cables: [
          { id: 'sc_pco_c1', fromId: 'sc_pco_inet', toId: 'sc_pco_fw',   type: 'fiber' },
          { id: 'sc_pco_c2', fromId: 'sc_pco_fw',   toId: 'sc_pco_srv1', type: 'cat6'  },
          { id: 'sc_pco_c3', fromId: 'sc_pco_fw',   toId: 'sc_pco_srv2', type: 'cat6'  },
          { id: 'sc_pco_c4', fromId: 'sc_pco_fw',   toId: 'sc_pco_ws',   type: 'cat6'  },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Public-cloud-only deployments live entirely inside one provider VPC. Every server, every workstation, every firewall is a cloud resource; the internet is the only path in. Contrast with hybrid (where some workloads stay on-prem) and multi-cloud (where they spread across providers).',
      examRelevance: {
        overview:      'All compute, storage and security live inside the cloud provider VPC; no on-prem footprint.',
        howItRoutes:   'Internet traffic enters via the cloud-native edge firewall or load-balancer; inter-VM traffic stays within the VPC.',
        keyDevices:    'Cloud-native firewall, server VMs, workstation (admin instance or VDI).',
        keyConcepts:   'Cloud-native architecture, VPC as the perimeter, no L2 on-prem-to-cloud bridge, full provider stack ownership.',
        examRelevance: 'N10-009 obj 1.8 — recognise public-cloud-only deployment; contrast with hybrid, private, community models.',
      },
      completion: {
        requiredDevices: ['internet', 'firewall', 'server', 'pc'],
        expectedCount:   { internet: 1, firewall: 1, server: 2, pc: 1 },
        requiredCables:  [
          { from:'internet', to:'firewall' },
          { from:'firewall', to:'server' },
          { from:'firewall', to:'pc' },
        ],
      },
    },
    {
      id: 'multi-cloud',
      title: 'Multi-Cloud (Two Providers Bridged)',
      category: 'cloud',
      objectiveRefs: ['1.8'],
      startingState: {
        devices: [
          { id: 'sc_mc_c1',  type: 'cloud',  x: 320, y: 360, label: 'AWS-VPC',   interfaces:[{ ip:'10.200.0.1', mask:30 }] },
          { id: 'sc_mc_rtr', type: 'router', x: 600, y: 360, label: 'INTER-CLOUD-VPN', interfaces:[{ ip:'10.200.0.2', mask:30 },{ ip:'10.200.0.5', mask:30 }] },
          { id: 'sc_mc_c2',  type: 'cloud',  x: 880, y: 360, label: 'AZURE-VNET', interfaces:[{ ip:'10.200.0.6', mask:30 }] },
        ],
        cables: [
          { id: 'sc_mc_c_c1', fromId: 'sc_mc_c1',  toId: 'sc_mc_rtr', type: 'fiber' },
          { id: 'sc_mc_c_c2', fromId: 'sc_mc_rtr', toId: 'sc_mc_c2',  type: 'fiber' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Multi-cloud spreads workloads across two or more public-cloud providers, joined by a VPN or cloud-to-cloud private link. Common for workload portability, vendor lock-in avoidance, and selective use of each provider strongest service. Network engineering complexity goes up — every cloud has its own naming, routing and IAM model.',
      examRelevance: {
        overview:      'Two (or more) public-cloud providers bridged by a customer-managed VPN or cloud-to-cloud private link.',
        howItRoutes:   'Each cloud has its own VPC + edge; a VPN gateway router (a customer VM, or third-party transit) carries the inter-cloud traffic.',
        keyDevices:    'Two cloud regions/providers + an inter-cloud VPN gateway router.',
        keyConcepts:   'Workload portability, vendor lock-in avoidance, transit cost asymmetry, per-cloud IAM and naming.',
        examRelevance: 'N10-009 obj 1.8 — recognise multi-cloud deployment; contrast with hybrid and single-public.',
      },
      completion: {
        requiredDevices: ['cloud', 'router'],
        expectedCount:   { cloud: 2, router: 1 },
        requiredCables:  [
          { from:'cloud', to:'router' },
        ],
      },
    },
    {
      id: 'direct-connect-private-link',
      title: 'Direct Connect (Dedicated Private Link to Cloud)',
      category: 'cloud',
      objectiveRefs: ['1.8'],
      startingState: {
        devices: [
          { id: 'sc_dc_sw',    type: 'switch', x: 320, y: 360, label: 'ONPREM-SW' },
          { id: 'sc_dc_rtr',   type: 'router', x: 600, y: 360, label: 'EDGE-R',   interfaces:[{ ip:'192.168.10.1', mask:24 },{ ip:'10.200.0.1', mask:30 }] },
          { id: 'sc_dc_cloud', type: 'cloud',  x: 880, y: 360, label: 'AWS-VPC',  interfaces:[{ ip:'10.200.0.2', mask:30 }] },
        ],
        cables: [
          { id: 'sc_dc_c1', fromId: 'sc_dc_sw',  toId: 'sc_dc_rtr',   type: 'cat6'  },
          { id: 'sc_dc_c2', fromId: 'sc_dc_rtr', toId: 'sc_dc_cloud', type: 'fiber' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Direct Connect (AWS) / ExpressRoute (Azure) creates a dedicated private circuit between on-prem and a cloud region — no internet path. Lower latency, predictable throughput, no shared-bandwidth contention. The trade-off is provisioning time (weeks for the physical cross-connect) and the higher fixed cost vs a site-to-site VPN.',
      examRelevance: {
        overview:      'Dedicated private circuit between on-prem and a cloud region; bypasses the public internet entirely.',
        howItRoutes:   'BGP peering across the dedicated link; the provider terminates the customer VLAN tag on the cloud-side VPC attachment.',
        keyDevices:    'On-prem switch, customer-edge router, cloud VPC.',
        keyConcepts:   'Dedicated bandwidth, BGP peering, no internet exposure, longer provisioning time than VPN.',
        examRelevance: 'N10-009 obj 1.8 — recognise Direct Connect / ExpressRoute pattern; contrast with site-to-site VPN over internet.',
      },
      completion: {
        requiredDevices: ['switch', 'router', 'cloud'],
        expectedCount:   { switch: 1, router: 1, cloud: 1 },
        requiredCables:  [
          { from:'switch', to:'router' },
          { from:'router', to:'cloud' },
        ],
      },
    },
    {
      id: 'wireless-mesh',
      title: 'Wireless Mesh (Radio Backhaul Between APs)',
      category: 'wireless',
      objectiveRefs: ['2.4'],
      startingState: {
        devices: [
          { id: 'sc_wm_rtr', type: 'router',     x: 520, y: 160, label: 'GATEWAY', interfaces:[{ ip:'192.168.10.1', mask:24 }] },
          { id: 'sc_wm_sw',  type: 'switch',     x: 520, y: 320, label: 'LAN-SW' },
          { id: 'sc_wm_ap1', type: 'wap',         x: 320, y: 480, label: 'AP-1 (root)' },
          { id: 'sc_wm_ap2', type: 'wap',         x: 520, y: 480, label: 'AP-2 (mesh)' },
          { id: 'sc_wm_ap3', type: 'wap',         x: 720, y: 480, label: 'AP-3 (mesh)' },
          { id: 'sc_wm_phn', type: 'smartphone', x: 920, y: 480, label: 'CLIENT',     config:{ ip:'192.168.10.20', mask:24, gateway:'192.168.10.1' } },
        ],
        cables: [
          { id: 'sc_wm_c1', fromId: 'sc_wm_rtr', toId: 'sc_wm_sw',  type: 'cat6' },
          { id: 'sc_wm_c2', fromId: 'sc_wm_sw',  toId: 'sc_wm_ap1', type: 'cat6' },
          { id: 'sc_wm_c3', fromId: 'sc_wm_ap1', toId: 'sc_wm_ap2', type: 'cat6' },
          { id: 'sc_wm_c4', fromId: 'sc_wm_ap2', toId: 'sc_wm_ap3', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Wireless mesh chains APs together via radio backhaul, with one root AP wired into the LAN switch. Mesh APs forward each other traffic without needing a wired drop at every location. Common for warehouses, outdoor coverage, and historic buildings where pulling cable is impractical.',
      examRelevance: {
        overview:      'Multiple APs share radio backhaul links to extend coverage from a single wired root AP.',
        howItRoutes:   'Mesh APs run a wireless mesh protocol (802.11s or vendor proprietary) to discover neighbours and select forwarding paths back to the root.',
        keyDevices:    'Root AP (wired uplink), mesh APs (radio backhaul), LAN switch, gateway router, wireless clients.',
        keyConcepts:   'Self-healing wireless backhaul, per-hop throughput degradation, the trade-off vs running cable to every AP.',
        examRelevance: 'N10-009 obj 2.4 — recognise wireless mesh deployment; contrast with controller-based ESS and ad-hoc.',
      },
      completion: {
        requiredDevices: ['router', 'switch', 'wap'],
        expectedCount:   { router: 1, switch: 1, wap: 3 },
        requiredCables:  [
          { from:'router', to:'switch' },
          { from:'switch', to:'wap' },
          { from:'wap',    to:'wap' },
        ],
      },
    },
    {
      id: 'wireless-bridge-p2p',
      title: 'Wireless Bridge (Point-to-Point Building Link)',
      category: 'wireless',
      objectiveRefs: ['2.4'],
      startingState: {
        devices: [
          { id: 'sc_wb_swa',  type: 'switch', x: 240, y: 480, label: 'SW-A' },
          { id: 'sc_wb_apa',  type: 'wap',     x: 440, y: 320, label: 'AP-A (bridge)' },
          { id: 'sc_wb_apb',  type: 'wap',     x: 760, y: 320, label: 'AP-B (bridge)' },
          { id: 'sc_wb_swb',  type: 'switch', x: 960, y: 480, label: 'SW-B' },
          { id: 'sc_wb_lap',  type: 'laptop', x: 240, y: 640, label: 'LAPTOP-A', config:{ ip:'192.168.10.20', mask:24 } },
        ],
        cables: [
          { id: 'sc_wb_c1', fromId: 'sc_wb_swa', toId: 'sc_wb_apa', type: 'cat6' },
          { id: 'sc_wb_c2', fromId: 'sc_wb_apa', toId: 'sc_wb_apb', type: 'cat6' },
          { id: 'sc_wb_c3', fromId: 'sc_wb_apb', toId: 'sc_wb_swb', type: 'cat6' },
          { id: 'sc_wb_c4', fromId: 'sc_wb_swa', toId: 'sc_wb_lap', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Point-to-point wireless bridge connects two buildings with line-of-sight APs in bridge mode. Replaces a fibre run or leased line for short hops (campus, warehouse-to-office). Cheaper than trenching cable; weather and line-of-sight constraints are the trade-off.',
      examRelevance: {
        overview:      'Two APs in bridge mode link two physically separated LAN segments over a wireless backhaul.',
        howItRoutes:   'The AP pair acts as a transparent L2 bridge — frames on one side appear on the other; the wireless link is invisible to clients.',
        keyDevices:    'Two APs (bridge mode), one switch per site, wireless clients on either segment.',
        keyConcepts:   'L2 bridging over wireless, line-of-sight requirement, weather sensitivity, replaces cable-pull or leased-line WAN for short hops.',
        examRelevance: 'N10-009 obj 2.4 — recognise wireless bridge use case; contrast with mesh APs and infrastructure mode.',
      },
      completion: {
        requiredDevices: ['switch', 'wap'],
        expectedCount:   { switch: 2, wap: 2 },
        requiredCables:  [
          { from:'switch', to:'wap' },
          { from:'wap',    to:'wap' },
        ],
      },
    },
    {
      id: 'zero-trust-segmented',
      title: 'Zero-Trust Microsegmentation',
      category: 'security',
      objectiveRefs: ['4.1'],
      startingState: {
        devices: [
          { id: 'sc_zt_fw',   type: 'firewall',    x: 600, y: 360, label: 'FW-POLICY', interfaces:[
            { ip:'192.168.10.1', mask:24 },
            { ip:'192.168.20.1', mask:24 },
            { ip:'192.168.30.1', mask:24 },
            { ip:'192.168.40.1', mask:24 },
            { ip:'192.168.50.1', mask:24 },
            { ip:'192.168.60.1', mask:24 },
          ] },
          { id: 'sc_zt_srv1', type: 'server',      x: 320, y: 160, label: 'SRV-1', config:{ ip:'192.168.10.10', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_zt_srv2', type: 'server',      x: 600, y: 160, label: 'SRV-2', config:{ ip:'192.168.20.10', mask:24, gateway:'192.168.20.1' } },
          { id: 'sc_zt_srv3', type: 'server',      x: 880, y: 160, label: 'SRV-3', config:{ ip:'192.168.30.10', mask:24, gateway:'192.168.30.1' } },
          { id: 'sc_zt_ws1',  type: 'pc', x: 320, y: 560, label: 'WS-1',  config:{ ip:'192.168.40.10', mask:24, gateway:'192.168.40.1' } },
          { id: 'sc_zt_ws2',  type: 'pc', x: 600, y: 560, label: 'WS-2',  config:{ ip:'192.168.50.10', mask:24, gateway:'192.168.50.1' } },
          { id: 'sc_zt_ws3',  type: 'pc', x: 880, y: 560, label: 'WS-3',  config:{ ip:'192.168.60.10', mask:24, gateway:'192.168.60.1' } },
        ],
        cables: [
          { id: 'sc_zt_c1', fromId: 'sc_zt_fw', toId: 'sc_zt_srv1', type: 'cat6' },
          { id: 'sc_zt_c2', fromId: 'sc_zt_fw', toId: 'sc_zt_srv2', type: 'cat6' },
          { id: 'sc_zt_c3', fromId: 'sc_zt_fw', toId: 'sc_zt_srv3', type: 'cat6' },
          { id: 'sc_zt_c4', fromId: 'sc_zt_fw', toId: 'sc_zt_ws1',  type: 'cat6' },
          { id: 'sc_zt_c5', fromId: 'sc_zt_fw', toId: 'sc_zt_ws2',  type: 'cat6' },
          { id: 'sc_zt_c6', fromId: 'sc_zt_fw', toId: 'sc_zt_ws3',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Zero-trust microsegmentation puts every workload in its own segment with a firewall arbitrating every flow. Lateral movement is blocked by default — the firewall is the policy enforcement point for every workload-to-workload conversation. Contrast with the classic flat LAN where any device on the subnet can reach any other freely.',
      examRelevance: {
        overview:      'Every endpoint sits in its own microsegment; a firewall arbitrates every flow.',
        howItRoutes:   'All traffic between workloads transits the firewall, which evaluates identity + context + posture before forwarding.',
        keyDevices:    'Firewall (or distributed firewall in modern fabrics), servers, workstations — each in their own segment.',
        keyConcepts:   'Never trust, always verify; deny-by-default; lateral movement prevention; identity-aware policy.',
        examRelevance: 'N10-009 obj 4.1 — recognise zero-trust segmentation; contrast with implicit-trust LAN and traditional perimeter defence.',
      },
      completion: {
        requiredDevices: ['firewall', 'server', 'pc'],
        expectedCount:   { firewall: 1, server: 3, pc: 3 },
        requiredCables:  [
          { from:'firewall', to:'server' },
          { from:'firewall', to:'pc' },
        ],
      },
    },
    {
      id: 'bastion-jump-host',
      title: 'Bastion / Jump Host (Single Controlled Admin Door)',
      category: 'security',
      objectiveRefs: ['4.1'],
      startingState: {
        devices: [
          { id: 'sc_bj_inet', type: 'internet', x: 600, y: 100, label: 'INTERNET', interfaces:[{ ip:'203.0.113.1', mask:30 }] },
          { id: 'sc_bj_fw',   type: 'firewall', x: 600, y: 240, label: 'EDGE-FW', interfaces:[{ ip:'203.0.113.2', mask:30 },{ ip:'192.168.10.1', mask:24 }] },
          { id: 'sc_bj_bas',  type: 'server',   x: 320, y: 360, label: 'BASTION',   config:{ ip:'192.168.10.10', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_bj_sw',   type: 'switch',   x: 600, y: 480, label: 'INTERNAL-SW' },
          { id: 'sc_bj_srv1', type: 'server',   x: 440, y: 640, label: 'INT-SRV-1', config:{ ip:'192.168.10.20', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_bj_srv2', type: 'server',   x: 760, y: 640, label: 'INT-SRV-2', config:{ ip:'192.168.10.21', mask:24, gateway:'192.168.10.1' } },
        ],
        cables: [
          { id: 'sc_bj_c1', fromId: 'sc_bj_inet', toId: 'sc_bj_fw',   type: 'fiber' },
          { id: 'sc_bj_c2', fromId: 'sc_bj_fw',   toId: 'sc_bj_bas',  type: 'cat6'  },
          { id: 'sc_bj_c3', fromId: 'sc_bj_fw',   toId: 'sc_bj_sw',   type: 'cat6'  },
          { id: 'sc_bj_c4', fromId: 'sc_bj_sw',   toId: 'sc_bj_srv1', type: 'cat6'  },
          { id: 'sc_bj_c5', fromId: 'sc_bj_sw',   toId: 'sc_bj_srv2', type: 'cat6'  },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A bastion (or jump) host is the single controlled door into the internal network. Admins SSH from the internet to the bastion, then hop to internal servers; every other inbound path is blocked at the firewall. One auditable, hardened host carries all inbound admin traffic — every other server stays unreachable from the outside.',
      examRelevance: {
        overview:      'A single hardened host accepts admin inbound from the internet; all other entry points are blocked.',
        howItRoutes:   'Firewall rules permit only the bastion SSH/RDP port from the internet; the bastion has internal reach to protected hosts.',
        keyDevices:    'Internet edge, firewall, bastion server, internal switch, internal servers.',
        keyConcepts:   'Single point of audit/logging for admin access; smaller attack surface vs exposing every server; MFA enforced at the bastion.',
        examRelevance: 'N10-009 obj 4.1 — recognise bastion/jump-host pattern; contrast with VPN admin access and direct exposure.',
      },
      completion: {
        requiredDevices: ['internet', 'firewall', 'server', 'switch'],
        expectedCount:   { internet: 1, firewall: 1, server: 3, switch: 1 },
        requiredCables:  [
          { from:'internet', to:'firewall' },
          { from:'firewall', to:'server' },
          { from:'firewall', to:'switch' },
          { from:'switch',   to:'server' },
        ],
      },
    },
    {
      id: 'nac-802-1x',
      title: 'NAC / 802.1X (Port-Based Authentication)',
      category: 'security',
      objectiveRefs: ['4.1'],
      startingState: {
        devices: [
          { id: 'sc_nac_rtr', type: 'router',      x: 600, y: 160, label: 'GATEWAY', interfaces:[{ ip:'192.168.10.1', mask:24 }] },
          { id: 'sc_nac_sw',  type: 'switch',      x: 600, y: 320, label: 'NAC-SW' },
          { id: 'sc_nac_srv', type: 'server',      x: 880, y: 320, label: 'RADIUS-AAA', config:{ ip:'192.168.10.10', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_nac_ws1', type: 'pc', x: 320, y: 520, label: 'WS-1', config:{ ip:'192.168.10.20', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_nac_ws2', type: 'pc', x: 600, y: 520, label: 'WS-2', config:{ ip:'192.168.10.21', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_nac_ws3', type: 'pc', x: 880, y: 520, label: 'WS-3', config:{ ip:'192.168.10.22', mask:24, gateway:'192.168.10.1' } },
        ],
        cables: [
          { id: 'sc_nac_c1', fromId: 'sc_nac_rtr', toId: 'sc_nac_sw',  type: 'cat6' },
          { id: 'sc_nac_c2', fromId: 'sc_nac_sw',  toId: 'sc_nac_srv', type: 'cat6' },
          { id: 'sc_nac_c3', fromId: 'sc_nac_sw',  toId: 'sc_nac_ws1', type: 'cat6' },
          { id: 'sc_nac_c4', fromId: 'sc_nac_sw',  toId: 'sc_nac_ws2', type: 'cat6' },
          { id: 'sc_nac_c5', fromId: 'sc_nac_sw',  toId: 'sc_nac_ws3', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Network Access Control with 802.1X gates LAN access at the switch port. Endpoints authenticate to a RADIUS server before the switch enables their port — unauthenticated devices get dropped into a quarantine VLAN or denied entirely. The most common port-based authentication pattern in enterprise wired LANs.',
      examRelevance: {
        overview:      'Switches gate ports based on 802.1X authentication against a central AAA (RADIUS) server.',
        howItRoutes:   'Supplicant (endpoint) → Authenticator (switch port) → Authentication Server (RADIUS). On success the switch enables the port; on failure it pins it to a guest/quarantine VLAN.',
        keyDevices:    'AAA server (RADIUS), 802.1X-capable switch, supplicant endpoints, gateway router.',
        keyConcepts:   '802.1X port-based authentication, EAP methods (EAP-TLS, PEAP), RADIUS, quarantine VLAN, posture assessment.',
        examRelevance: 'N10-009 obj 4.1 — recognise NAC/802.1X pattern; commonly tested alongside RADIUS, EAP, and VLAN assignment.',
      },
      completion: {
        requiredDevices: ['router', 'switch', 'server', 'pc'],
        expectedCount:   { router: 1, switch: 1, server: 1, pc: 3 },
        requiredCables:  [
          { from:'router', to:'switch' },
          { from:'switch', to:'server' },
          { from:'switch', to:'pc' },
        ],
      },
    },
    {
      id: 'l3-switch-svi',
      title: 'L3 Switch With SVIs (Inter-VLAN Routing)',
      category: 'vlan',
      objectiveRefs: ['2.1', '2.3'],
      startingState: {
        devices: [
          { id: 'sc_svi_l3',    type: 'l3-switch',   x: 600, y: 240, label: 'L3-SW', interfaces:[
            { ip:'192.168.10.1', mask:24 },
            { ip:'192.168.20.1', mask:24 },
          ] },
          { id: 'sc_svi_v10a',  type: 'pc', x: 280, y: 480, label: 'VLAN10-A', config:{ ip:'192.168.10.10', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_svi_v10b',  type: 'pc', x: 440, y: 480, label: 'VLAN10-B', config:{ ip:'192.168.10.11', mask:24, gateway:'192.168.10.1' } },
          { id: 'sc_svi_v20a',  type: 'pc', x: 760, y: 480, label: 'VLAN20-A', config:{ ip:'192.168.20.10', mask:24, gateway:'192.168.20.1' } },
          { id: 'sc_svi_v20b',  type: 'pc', x: 920, y: 480, label: 'VLAN20-B', config:{ ip:'192.168.20.11', mask:24, gateway:'192.168.20.1' } },
        ],
        cables: [
          { id: 'sc_svi_c1', fromId: 'sc_svi_l3', toId: 'sc_svi_v10a', type: 'cat6' },
          { id: 'sc_svi_c2', fromId: 'sc_svi_l3', toId: 'sc_svi_v10b', type: 'cat6' },
          { id: 'sc_svi_c3', fromId: 'sc_svi_l3', toId: 'sc_svi_v20a', type: 'cat6' },
          { id: 'sc_svi_c4', fromId: 'sc_svi_l3', toId: 'sc_svi_v20b', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Router-on-a-stick uses a single router + trunk for inter-VLAN routing. An L3 switch eliminates the router by adding SVIs (Switched Virtual Interfaces) — one virtual interface per VLAN, doing the routing at line rate on the switch ASIC. Faster, no hairpin, the standard inter-VLAN approach in modern campus networks.',
      examRelevance: {
        overview:      'An L3 switch routes between VLANs locally using one SVI per VLAN — no external router needed.',
        howItRoutes:   'Each VLAN gateway is an SVI on the switch (e.g. interface vlan 10 ip address ...); the switch routes inter-VLAN traffic in hardware via its ASIC.',
        keyDevices:    'One L3 switch (with SVIs configured) + access ports assigned to each VLAN.',
        keyConcepts:   'Switched Virtual Interface (SVI) per VLAN, hardware-accelerated inter-VLAN routing, no hairpin to a router.',
        examRelevance: 'N10-009 obj 2.1 (switching) + 2.3 (VLANs) — recognise L3-switch SVI; contrast with router-on-a-stick performance + complexity.',
      },
      completion: {
        requiredDevices: ['l3-switch', 'pc'],
        expectedCount:   { 'l3-switch': 1, pc: 4 },
        requiredCables:  [
          { from:'l3-switch', to:'pc' },
        ],
      },
    },

    // ── Batch A: Campus scenarios ─────────────────────────────────────────
    {
      id: 'small-office',
      title: 'Small Office (firewall + switch + endpoints)',
      category: 'security',
      objectiveRefs: ['1.4', '2.4', '4.1', '4.3'],
      startingState: {
        devices: [
          { id: 'sc_so_isp',   type: 'cloud',    x: 520, y: 100, label: 'ISP' },
          { id: 'sc_so_fw',    type: 'firewall',  x: 520, y: 220, label: 'Edge-FW',   interfaces: [{ ip: '203.0.113.1', mask: 24 }, { ip: '192.168.1.1', mask: 24 }] },
          { id: 'sc_so_sw',    type: 'switch',    x: 520, y: 340, label: 'LAN-SW' },
          { id: 'sc_so_pc1',   type: 'pc',        x: 280, y: 460, label: 'PC-01',     interfaces: [{ ip: '192.168.1.10', mask: 24 }] },
          { id: 'sc_so_pc2',   type: 'pc',        x: 440, y: 460, label: 'PC-02',     interfaces: [{ ip: '192.168.1.11', mask: 24 }] },
          { id: 'sc_so_pc3',   type: 'pc',        x: 600, y: 460, label: 'PC-03',     interfaces: [{ ip: '192.168.1.12', mask: 24 }] },
          { id: 'sc_so_prn',   type: 'server',    x: 760, y: 460, label: 'Printer',   interfaces: [{ ip: '192.168.1.20', mask: 24 }] },
        ],
        cables: [
          { id: 'sc_so_c1', fromId: 'sc_so_isp',  toId: 'sc_so_fw',  type: 'fiber' },
          { id: 'sc_so_c2', fromId: 'sc_so_fw',   toId: 'sc_so_sw',  type: 'cat6' },
          { id: 'sc_so_c3', fromId: 'sc_so_sw',   toId: 'sc_so_pc1', type: 'cat6' },
          { id: 'sc_so_c4', fromId: 'sc_so_sw',   toId: 'sc_so_pc2', type: 'cat6' },
          { id: 'sc_so_c5', fromId: 'sc_so_sw',   toId: 'sc_so_pc3', type: 'cat6' },
          { id: 'sc_so_c6', fromId: 'sc_so_sw',   toId: 'sc_so_prn', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A small office places a single firewall between the ISP uplink and the internal switch. The firewall is the network boundary — it enforces ACLs, performs NAT, and is the single choke point for all inbound and outbound traffic. Every endpoint reaches the internet through the firewall, so a misconfigured rule affects every user.',
      examRelevance: {
        overview:      'A firewall-at-the-edge with a flat LAN behind it is the simplest secure small-office design.',
        howItRoutes:   'PCs send all non-local traffic to the firewall gateway (192.168.1.1); the firewall performs NAT and forwards to the ISP.',
        keyDevices:    'Edge firewall (perimeter enforcement + NAT), unmanaged switch (LAN aggregation), endpoints behind the boundary.',
        keyConcepts:   'Stateful packet inspection, NAT/PAT, default-deny ACL, single-point-of-failure vs simplicity trade-off.',
        examRelevance: 'N10-009 obj 4.1 (security concepts) + 4.3 (network segmentation) — recognise firewall-as-edge vs DMZ designs.',
      },
      completion: {
        requiredDevices: ['firewall', 'switch', 'pc'],
        expectedCount:   { firewall: 1, switch: 1, pc: 3 },
        requiredCables:  [
          { from: 'cloud', to: 'firewall' },
          { from: 'firewall', to: 'switch' },
          { from: 'switch', to: 'pc' },
        ],
      },
    },

    {
      id: 'enterprise-ids-lb',
      title: 'Enterprise with IDS/IPS + Load Balancer',
      category: 'security',
      objectiveRefs: ['2.1', '4.1', '4.2'],
      startingState: {
        devices: [
          { id: 'sc_ei_isp',   type: 'cloud',         x: 520, y:  60, label: 'Internet' },
          { id: 'sc_ei_fw1',   type: 'firewall',      x: 520, y: 160, label: 'Perimeter-FW',  interfaces: [{ ip: '203.0.113.1', mask: 24 }, { ip: '10.0.0.1', mask: 24 }] },
          { id: 'sc_ei_ids',   type: 'server',        x: 340, y: 260, label: 'IDS/IPS',       interfaces: [{ ip: '10.0.0.5', mask: 24 }] },
          { id: 'sc_ei_dsw',   type: 'switch',        x: 680, y: 260, label: 'DMZ-SW' },
          { id: 'sc_ei_lb',    type: 'server',        x: 680, y: 360, label: 'App-LB',        interfaces: [{ ip: '10.0.1.1', mask: 24 }] },
          { id: 'sc_ei_web1',  type: 'server',        x: 520, y: 460, label: 'Web-01',        interfaces: [{ ip: '10.0.1.10', mask: 24 }] },
          { id: 'sc_ei_web2',  type: 'server',        x: 680, y: 460, label: 'Web-02',        interfaces: [{ ip: '10.0.1.11', mask: 24 }] },
          { id: 'sc_ei_web3',  type: 'server',        x: 840, y: 460, label: 'Web-03',        interfaces: [{ ip: '10.0.1.12', mask: 24 }] },
          { id: 'sc_ei_fw2',   type: 'firewall',      x: 520, y: 560, label: 'Internal-FW',   interfaces: [{ ip: '10.0.0.2', mask: 24 }, { ip: '172.16.0.1', mask: 24 }] },
          { id: 'sc_ei_insw',  type: 'switch',        x: 520, y: 660, label: 'Internal-SW' },
          { id: 'sc_ei_pc1',   type: 'pc',            x: 440, y: 760, label: 'PC-01',         interfaces: [{ ip: '172.16.0.10', mask: 24 }] },
          { id: 'sc_ei_pc2',   type: 'pc',            x: 600, y: 760, label: 'PC-02',         interfaces: [{ ip: '172.16.0.11', mask: 24 }] },
        ],
        cables: [
          { id: 'sc_ei_c1',  fromId: 'sc_ei_isp',  toId: 'sc_ei_fw1',  type: 'fiber' },
          { id: 'sc_ei_c2',  fromId: 'sc_ei_fw1',  toId: 'sc_ei_ids',  type: 'cat6' },
          { id: 'sc_ei_c3',  fromId: 'sc_ei_fw1',  toId: 'sc_ei_dsw',  type: 'cat6' },
          { id: 'sc_ei_c4',  fromId: 'sc_ei_dsw',  toId: 'sc_ei_lb',   type: 'cat6' },
          { id: 'sc_ei_c5',  fromId: 'sc_ei_lb',   toId: 'sc_ei_web1', type: 'cat6' },
          { id: 'sc_ei_c6',  fromId: 'sc_ei_lb',   toId: 'sc_ei_web2', type: 'cat6' },
          { id: 'sc_ei_c7',  fromId: 'sc_ei_lb',   toId: 'sc_ei_web3', type: 'cat6' },
          { id: 'sc_ei_c8',  fromId: 'sc_ei_fw1',  toId: 'sc_ei_fw2',  type: 'cat6' },
          { id: 'sc_ei_c9',  fromId: 'sc_ei_fw2',  toId: 'sc_ei_insw', type: 'cat6' },
          { id: 'sc_ei_c10', fromId: 'sc_ei_insw', toId: 'sc_ei_pc1',  type: 'cat6' },
          { id: 'sc_ei_c11', fromId: 'sc_ei_insw', toId: 'sc_ei_pc2',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'An enterprise perimeter stacks an IDS/IPS inline with the DMZ for deep-packet inspection before traffic reaches the load balancer and web farm. A second internal firewall separates the trusted network from the DMZ — even a compromised DMZ server cannot directly reach internal hosts. The load balancer distributes requests across the web tier for availability and scale.',
      examRelevance: {
        overview:      'A dual-firewall enterprise perimeter with IDS/IPS provides defence-in-depth: block at the edge, inspect in the DMZ, block again before the trusted LAN.',
        howItRoutes:   'Internet → perimeter firewall → IDS/IPS copy + DMZ switch → load balancer → web servers; trusted traffic → perimeter firewall → internal firewall → LAN.',
        keyDevices:    'Perimeter firewall (internet boundary), IDS/IPS (inline inspection), load balancer (availability), internal firewall (LAN isolation).',
        keyConcepts:   'Defence in depth, dual-firewall DMZ, IDS vs IPS placement, load balancing algorithms, network segmentation.',
        examRelevance: 'N10-009 obj 4.1 (network security architecture) + 4.2 (IDS/IPS) — recognise inline vs passive IDS and why a load balancer lives in the DMZ.',
      },
      completion: {
        requiredDevices: ['firewall', 'switch', 'server', 'pc'],
        expectedCount:   { firewall: 2, switch: 2, server: 1, pc: 2 },
        requiredCables:  [
          { from: 'cloud',    to: 'firewall' },
          { from: 'firewall', to: 'switch' },
          { from: 'switch',   to: 'server' },
          { from: 'server',   to: 'pc' },
        ],
      },
    },

    {
      id: 'branch-office-wireless',
      title: 'Branch Office with Wireless (WLC + WAPs)',
      category: 'wireless',
      objectiveRefs: ['2.4', '1.6'],
      startingState: {
        devices: [
          { id: 'sc_bw_isp',  type: 'cloud',    x: 520, y:  80, label: 'Internet' },
          { id: 'sc_bw_fw',   type: 'firewall',  x: 520, y: 180, label: 'Branch-FW',  interfaces: [{ ip: '203.0.113.2', mask: 24 }, { ip: '10.10.0.1', mask: 24 }] },
          { id: 'sc_bw_sw',   type: 'switch',    x: 520, y: 280, label: 'Branch-SW' },
          { id: 'sc_bw_wlc',  type: 'wlc',      x: 360, y: 380, label: 'WLC',         interfaces: [{ ip: '10.10.0.10', mask: 24 }] },
          { id: 'sc_bw_ap1',  type: 'wap',      x: 240, y: 500, label: 'WAP-01',      interfaces: [{ ip: '10.10.0.11', mask: 24 }] },
          { id: 'sc_bw_ap2',  type: 'wap',      x: 480, y: 500, label: 'WAP-02',      interfaces: [{ ip: '10.10.0.12', mask: 24 }] },
          { id: 'sc_bw_lap1', type: 'laptop',   x: 160, y: 640, label: 'Laptop-01',   interfaces: [{ ip: '10.10.0.50', mask: 24 }] },
          { id: 'sc_bw_lap2', type: 'laptop',   x: 320, y: 640, label: 'Laptop-02',   interfaces: [{ ip: '10.10.0.51', mask: 24 }] },
          { id: 'sc_bw_ph1',  type: 'smartphone', x: 480, y: 640, label: 'Phone-01',  interfaces: [{ ip: '10.10.0.52', mask: 24 }] },
          { id: 'sc_bw_ph2',  type: 'smartphone', x: 640, y: 640, label: 'Phone-02',  interfaces: [{ ip: '10.10.0.53', mask: 24 }] },
          { id: 'sc_bw_pc',   type: 'pc',       x: 680, y: 380, label: 'Reception',   interfaces: [{ ip: '10.10.0.20', mask: 24 }] },
        ],
        cables: [
          { id: 'sc_bw_c1', fromId: 'sc_bw_isp',  toId: 'sc_bw_fw',  type: 'fiber' },
          { id: 'sc_bw_c2', fromId: 'sc_bw_fw',   toId: 'sc_bw_sw',  type: 'cat6' },
          { id: 'sc_bw_c3', fromId: 'sc_bw_sw',   toId: 'sc_bw_wlc', type: 'cat6' },
          { id: 'sc_bw_c4', fromId: 'sc_bw_sw',   toId: 'sc_bw_pc',  type: 'cat6' },
          { id: 'sc_bw_c5', fromId: 'sc_bw_wlc',  toId: 'sc_bw_ap1', type: 'cat6' },
          { id: 'sc_bw_c6', fromId: 'sc_bw_wlc',  toId: 'sc_bw_ap2', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A branch office pairs a wireless LAN controller (WLC) with lightweight access points (LAPs). The WLC holds all the configuration — RF profiles, SSIDs, security policies — so deploying a new AP is zero-touch: it discovers the WLC via CAPWAP and downloads its config automatically. Wireless clients roam between WAP-01 and WAP-02 without re-authenticating.',
      examRelevance: {
        overview:      'A controller-based WLAN centralises management: the WLC owns the SSID config, APs are "thin" and forward all traffic through a CAPWAP tunnel back to the controller.',
        howItRoutes:   'Wireless clients associate with a WAP; the WAP tunnels the frame to the WLC; the WLC bridges it onto the wired LAN via the switch.',
        keyDevices:    'WLC (wireless LAN controller — SSID/policy engine), WAP/LAP (radio head — dumb radio, no local config), switch (wired backhaul).',
        keyConcepts:   'CAPWAP protocol, split-MAC architecture, centralized vs autonomous AP modes, seamless roaming.',
        examRelevance: 'N10-009 obj 2.4 (wireless technologies) — distinguish controller-based from autonomous APs, know CAPWAP tunnel purpose.',
      },
      completion: {
        requiredDevices: ['wlc', 'wap', 'switch'],
        expectedCount:   { wlc: 1, wap: 2, switch: 1 },
        requiredCables:  [
          { from: 'switch', to: 'wlc' },
          { from: 'wlc',   to: 'wap' },
        ],
      },
    },

    {
      id: 'home-network',
      title: 'Home Network (router + WAP + consumer devices)',
      category: 'architecture',
      objectiveRefs: ['1.6'],
      startingState: {
        devices: [
          { id: 'sc_hn_isp',  type: 'cloud',      x: 520, y:  80, label: 'ISP' },
          { id: 'sc_hn_rtr',  type: 'router',     x: 520, y: 200, label: 'Home-Router', interfaces: [{ ip: '203.0.113.3', mask: 24 }, { ip: '192.168.0.1', mask: 24 }] },
          { id: 'sc_hn_ap',   type: 'wap',        x: 520, y: 340, label: 'WiFi-AP',     interfaces: [{ ip: '192.168.0.2', mask: 24 }] },
          { id: 'sc_hn_lap',  type: 'laptop',     x: 280, y: 500, label: 'Laptop',      interfaces: [{ ip: '192.168.0.10', mask: 24 }] },
          { id: 'sc_hn_ph',   type: 'smartphone', x: 440, y: 500, label: 'Phone',       interfaces: [{ ip: '192.168.0.11', mask: 24 }] },
          { id: 'sc_hn_tv',   type: 'server',     x: 600, y: 500, label: 'Smart-TV',    interfaces: [{ ip: '192.168.0.12', mask: 24 }] },
          { id: 'sc_hn_gc',   type: 'pc',         x: 760, y: 500, label: 'Console',     interfaces: [{ ip: '192.168.0.13', mask: 24 }] },
        ],
        cables: [
          { id: 'sc_hn_c1', fromId: 'sc_hn_isp', toId: 'sc_hn_rtr', type: 'fiber' },
          { id: 'sc_hn_c2', fromId: 'sc_hn_rtr', toId: 'sc_hn_ap',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A typical SOHO home network has a consumer router (often a combo modem+router) that terminates the ISP link, performs NAT, and runs a DHCP server for the private subnet. A wireless access point provides Wi-Fi for phones, laptops, and smart home devices. All devices share a single flat /24, so a compromised device can reach every other device — there is no segmentation.',
      examRelevance: {
        overview:      'A home network is a flat SOHO design: one router does NAT + DHCP + sometimes wireless, no segmentation, all devices on the same subnet.',
        howItRoutes:   'All devices send non-local traffic to the router gateway (192.168.0.1); the router performs NAT and forwards to the ISP.',
        keyDevices:    'Router (NAT + DHCP + gateway), WAP (wireless radio), consumer endpoints (DHCP clients).',
        keyConcepts:   'NAT/PAT, DHCP, flat LAN vs segmented LAN, single point of failure, SOHO security risks.',
        examRelevance: 'N10-009 obj 1.6 (network topologies and types) — contrast SOHO flat LAN with enterprise segmented designs.',
      },
      completion: {
        requiredDevices: ['router', 'wap'],
        expectedCount:   { router: 1, wap: 1 },
        requiredCables:  [
          { from: 'cloud',  to: 'router' },
          { from: 'router', to: 'wap' },
        ],
      },
    },

    // ── Batch B: Cloud scenarios ──────────────────────────────────────────
    {
      id: 'cloud-vpc-architecture',
      title: 'Cloud VPC Architecture (public + private subnets)',
      category: 'cloud',
      objectiveRefs: ['1.8'],
      startingState: {
        devices: [
          { id: 'sc_cv_inet',  type: 'cloud',   x: 520, y:  80, label: 'Internet' },
          { id: 'sc_cv_igw',   type: 'router',  x: 520, y: 200, label: 'IGW',          interfaces: [{ ip: '203.0.113.10', mask: 24 }] },
          { id: 'sc_cv_vpc',   type: 'cloud',   x: 520, y: 320, label: 'VPC-prod' },
          { id: 'sc_cv_pub',   type: 'switch',  x: 320, y: 440, label: 'public-subnet' },
          { id: 'sc_cv_priv',  type: 'switch',  x: 720, y: 440, label: 'private-subnet' },
          { id: 'sc_cv_nat',   type: 'router',  x: 320, y: 560, label: 'NAT-GW',        interfaces: [{ ip: '10.0.1.5', mask: 24 }] },
          { id: 'sc_cv_web',   type: 'server',  x: 320, y: 680, label: 'Web-Server',    interfaces: [{ ip: '10.0.1.10', mask: 24 }] },
          { id: 'sc_cv_app',   type: 'server',  x: 640, y: 560, label: 'App-Server',    interfaces: [{ ip: '10.0.2.10', mask: 24 }] },
          { id: 'sc_cv_db',    type: 'server',  x: 800, y: 560, label: 'DB-Primary',    interfaces: [{ ip: '10.0.2.20', mask: 24 }] },
        ],
        cables: [
          { id: 'sc_cv_c1', fromId: 'sc_cv_inet', toId: 'sc_cv_igw',  type: 'fiber' },
          { id: 'sc_cv_c2', fromId: 'sc_cv_igw',  toId: 'sc_cv_vpc',  type: 'fiber' },
          { id: 'sc_cv_c3', fromId: 'sc_cv_vpc',  toId: 'sc_cv_pub',  type: 'cat6' },
          { id: 'sc_cv_c4', fromId: 'sc_cv_vpc',  toId: 'sc_cv_priv', type: 'cat6' },
          { id: 'sc_cv_c5', fromId: 'sc_cv_pub',  toId: 'sc_cv_nat',  type: 'cat6' },
          { id: 'sc_cv_c6', fromId: 'sc_cv_pub',  toId: 'sc_cv_web',  type: 'cat6' },
          { id: 'sc_cv_c7', fromId: 'sc_cv_priv', toId: 'sc_cv_app',  type: 'cat6' },
          { id: 'sc_cv_c8', fromId: 'sc_cv_priv', toId: 'sc_cv_db',   type: 'cat6' },
          { id: 'sc_cv_c9', fromId: 'sc_cv_nat',  toId: 'sc_cv_app',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A cloud VPC splits resources into a public subnet (internet-reachable) and a private subnet (no inbound internet path). An Internet Gateway (IGW) is the VPC border router for public traffic. A NAT Gateway in the public subnet lets private instances initiate outbound internet connections without exposing inbound routes — the private app and DB servers remain unreachable from the internet.',
      examRelevance: {
        overview:      'A two-tier VPC design isolates public-facing servers from backend databases using subnet routing rules, not a firewall.',
        howItRoutes:   'Internet → IGW → public subnet route table → web servers; private subnet has no IGW route, uses NAT-GW for outbound-only internet access.',
        keyDevices:    'Internet Gateway (VPC border router), NAT Gateway (outbound-only masquerade), public/private subnets (routing boundaries).',
        keyConcepts:   'VPC, subnet routing tables, IGW vs NAT Gateway, public vs private subnet, cloud security groups as stateful firewalls.',
        examRelevance: 'N10-009 obj 1.8 (cloud deployment models) — understand IGW, NAT Gateway, and public/private subnet routing.',
      },
      completion: {
        requiredDevices: ['cloud', 'router', 'switch', 'server'],
        expectedCount:   { cloud: 2, router: 2, switch: 2, server: 2 },
        requiredCables:  [
          { from: 'cloud',  to: 'router' },
          { from: 'router', to: 'switch' },
          { from: 'switch', to: 'server' },
        ],
      },
    },

    {
      id: 'multi-vpc-transit-gateway',
      title: 'Multi-VPC with Transit Gateway',
      category: 'cloud',
      objectiveRefs: ['1.8'],
      startingState: {
        devices: [
          { id: 'sc_mt_inet',  type: 'cloud',   x: 520, y:  60, label: 'Internet' },
          { id: 'sc_mt_igw',   type: 'router',  x: 520, y: 160, label: 'IGW',           interfaces: [{ ip: '203.0.113.20', mask: 24 }] },
          { id: 'sc_mt_tgw',   type: 'router',  x: 520, y: 300, label: 'Transit-GW',    interfaces: [{ ip: '100.64.0.1', mask: 24 }] },
          { id: 'sc_mt_vpcp',  type: 'cloud',   x: 280, y: 440, label: 'VPC-prod' },
          { id: 'sc_mt_vpcs',  type: 'cloud',   x: 520, y: 440, label: 'VPC-shared' },
          { id: 'sc_mt_vpcd',  type: 'cloud',   x: 760, y: 440, label: 'VPC-dev' },
          { id: 'sc_mt_subn1', type: 'switch',  x: 280, y: 560, label: 'prod-subnet',   },
          { id: 'sc_mt_subn2', type: 'switch',  x: 520, y: 560, label: 'shared-subnet', },
          { id: 'sc_mt_subn3', type: 'switch',  x: 760, y: 560, label: 'dev-subnet',    },
        ],
        cables: [
          { id: 'sc_mt_c1', fromId: 'sc_mt_inet',  toId: 'sc_mt_igw',   type: 'fiber' },
          { id: 'sc_mt_c2', fromId: 'sc_mt_igw',   toId: 'sc_mt_tgw',   type: 'fiber' },
          { id: 'sc_mt_c3', fromId: 'sc_mt_tgw',   toId: 'sc_mt_vpcp',  type: 'fiber' },
          { id: 'sc_mt_c4', fromId: 'sc_mt_tgw',   toId: 'sc_mt_vpcs',  type: 'fiber' },
          { id: 'sc_mt_c5', fromId: 'sc_mt_tgw',   toId: 'sc_mt_vpcd',  type: 'fiber' },
          { id: 'sc_mt_c6', fromId: 'sc_mt_vpcp',  toId: 'sc_mt_subn1', type: 'cat6' },
          { id: 'sc_mt_c7', fromId: 'sc_mt_vpcs',  toId: 'sc_mt_subn2', type: 'cat6' },
          { id: 'sc_mt_c8', fromId: 'sc_mt_vpcd',  toId: 'sc_mt_subn3', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'When an organisation grows beyond one VPC, a Transit Gateway (TGW) is the hub that connects multiple VPCs with a single attachment each — rather than a full mesh of VPC peering links. The TGW has its own route table and can selectively allow or deny inter-VPC routing, making it the cloud equivalent of a core router in a hub-and-spoke WAN.',
      examRelevance: {
        overview:      'A Transit Gateway simplifies multi-VPC connectivity: each VPC attaches once to the TGW hub rather than peering with every other VPC.',
        howItRoutes:   'Each VPC adds a route pointing 0.0.0.0/0 or specific CIDRs toward the TGW attachment; the TGW consults its own route table to forward between VPCs or toward the internet via the IGW.',
        keyDevices:    'Transit Gateway (hub router for VPCs), Internet Gateway (internet border), VPC (network boundary), subnet (routing zone).',
        keyConcepts:   'Hub-and-spoke vs full-mesh VPC peering, TGW route tables, VPC attachments, inter-VPC routing policy.',
        examRelevance: 'N10-009 obj 1.8 (cloud deployment models) — understand Transit Gateway as the hub-and-spoke alternative to VPC peering.',
      },
      completion: {
        requiredDevices: ['cloud', 'router', 'switch'],
        expectedCount:   { cloud: 4, router: 2, switch: 3 },
        requiredCables:  [
          { from: 'cloud',  to: 'router' },
          { from: 'router', to: 'cloud' },
          { from: 'cloud',  to: 'switch' },
        ],
      },
    },

    {
      id: 'sase-architecture',
      title: 'SASE Architecture (cloud-delivered security)',
      category: 'cloud',
      objectiveRefs: ['1.8', '4.1'],
      startingState: {
        devices: [
          { id: 'sc_sa_user1',  type: 'laptop',   x: 160, y: 160, label: 'Remote-User-01', interfaces: [{ ip: '192.168.50.10', mask: 24 }] },
          { id: 'sc_sa_user2',  type: 'laptop',   x: 160, y: 320, label: 'Remote-User-02', interfaces: [{ ip: '192.168.51.10', mask: 24 }] },
          { id: 'sc_sa_user3',  type: 'smartphone', x: 160, y: 480, label: 'Remote-User-03', interfaces: [{ ip: '192.168.52.10', mask: 24 }] },
          { id: 'sc_sa_sase',   type: 'cloud',    x: 480, y: 320, label: 'SASE-Edge PoP', interfaces: [{ ip: '100.64.1.1', mask: 24 }] },
          { id: 'sc_sa_inet',   type: 'cloud',    x: 480, y: 120, label: 'Internet' },
          { id: 'sc_sa_vpc',    type: 'cloud',    x: 760, y: 320, label: 'Corp-VPC',     interfaces: [{ ip: '10.0.0.1', mask: 16 }] },
          { id: 'sc_sa_saas',   type: 'server',   x: 760, y: 120, label: 'SaaS-App',       interfaces: [{ ip: '10.1.0.10', mask: 24 }] },
          { id: 'sc_sa_hq',     type: 'server',   x: 760, y: 520, label: 'HQ-DC',          interfaces: [{ ip: '10.2.0.1', mask: 24 }] },
        ],
        cables: [
          { id: 'sc_sa_c1', fromId: 'sc_sa_user1', toId: 'sc_sa_sase', type: 'fiber' },
          { id: 'sc_sa_c2', fromId: 'sc_sa_user2', toId: 'sc_sa_sase', type: 'fiber' },
          { id: 'sc_sa_c3', fromId: 'sc_sa_user3', toId: 'sc_sa_sase', type: 'fiber' },
          { id: 'sc_sa_c4', fromId: 'sc_sa_sase',  toId: 'sc_sa_inet', type: 'fiber' },
          { id: 'sc_sa_c5', fromId: 'sc_sa_sase',  toId: 'sc_sa_vpc',  type: 'fiber' },
          { id: 'sc_sa_c6', fromId: 'sc_sa_inet',  toId: 'sc_sa_saas', type: 'fiber' },
          { id: 'sc_sa_c7', fromId: 'sc_sa_vpc',   toId: 'sc_sa_hq',   type: 'fiber' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Secure Access Service Edge (SASE) converges SD-WAN, CASB, SWG, ZTNA, and firewall-as-a-service into a cloud-delivered service delivered from globally distributed PoPs. Instead of backhauling remote-user traffic to a corporate data centre for inspection, users connect directly to the nearest SASE PoP — security is applied in the cloud before traffic reaches its destination.',
      examRelevance: {
        overview:      'SASE eliminates the hub-and-spoke VPN model: every user connects to a cloud PoP that enforces policy, inspects traffic, and routes directly to the destination.',
        howItRoutes:   'Remote user → nearest SASE PoP (TLS tunnel) → ZTNA/CASB/SWG policy enforcement → direct route to SaaS app or corporate VPC.',
        keyDevices:    'SASE PoP (cloud-delivered policy engine), ZTNA (identity-based access, no implicit trust), CASB (cloud app visibility).',
        keyConcepts:   'SASE vs traditional VPN backhauling, zero-trust network access, cloud-delivered security, SD-WAN + security convergence.',
        examRelevance: 'N10-009 obj 1.8 (cloud) + 4.1 (security architecture) — understand SASE as the converged cloud-edge security model vs legacy hub-and-spoke VPN.',
      },
      completion: {
        requiredDevices: ['cloud', 'laptop', 'server'],
        expectedCount:   { cloud: 3, laptop: 2, server: 2 },
        requiredCables:  [
          { from: 'laptop', to: 'cloud' },
          { from: 'cloud',  to: 'server' },
        ],
      },
    },

    // ── Batch C: More Cloud + WAN scenarios ───────────────────────────────
    {
      id: 'sd-wan-network',
      title: 'SD-WAN Network (HQ + 2 branches)',
      category: 'wan',
      objectiveRefs: ['1.6', '2.1'],
      startingState: {
        devices: [
          { id: 'sc_sw_inet',  type: 'cloud',   x: 520, y:  60, label: 'Internet/MPLS', interfaces: [{ ip: '203.0.113.0', mask: 24 }] },
          { id: 'sc_sw_hqe',   type: 'router',  x: 520, y: 180, label: 'HQ-SDWAN-Edge', interfaces: [{ ip: '203.0.113.1', mask: 24 }, { ip: '10.0.0.1', mask: 24 }] },
          { id: 'sc_sw_br1e',  type: 'router',  x: 280, y: 400, label: 'Branch-1-Edge', interfaces: [{ ip: '203.0.113.2', mask: 24 }, { ip: '10.1.0.1', mask: 24 }] },
          { id: 'sc_sw_br2e',  type: 'router',  x: 760, y: 400, label: 'Branch-2-Edge', interfaces: [{ ip: '203.0.113.3', mask: 24 }, { ip: '10.2.0.1', mask: 24 }] },
          { id: 'sc_sw_hqsw',  type: 'switch',  x: 520, y: 300, label: 'HQ-SW' },
          { id: 'sc_sw_br1sw', type: 'switch',  x: 280, y: 520, label: 'Branch-1-SW' },
          { id: 'sc_sw_br2sw', type: 'switch',  x: 760, y: 520, label: 'Branch-2-SW' },
          { id: 'sc_sw_hqpc',  type: 'pc',      x: 520, y: 420, label: 'HQ-Host',      interfaces: [{ ip: '10.0.0.10', mask: 24 }] },
          { id: 'sc_sw_b1pc',  type: 'pc',      x: 160, y: 640, label: 'BR1-Host-01',  interfaces: [{ ip: '10.1.0.10', mask: 24 }] },
          { id: 'sc_sw_b1lap', type: 'laptop',  x: 320, y: 640, label: 'BR1-Laptop',   interfaces: [{ ip: '10.1.0.11', mask: 24 }] },
          { id: 'sc_sw_b2pc',  type: 'pc',      x: 680, y: 640, label: 'BR2-Host-01',  interfaces: [{ ip: '10.2.0.10', mask: 24 }] },
          { id: 'sc_sw_b2vo',  type: 'server',  x: 840, y: 640, label: 'BR2-VoIP',     interfaces: [{ ip: '10.2.0.20', mask: 24 }] },
        ],
        cables: [
          { id: 'sc_sw_c1',  fromId: 'sc_sw_inet',  toId: 'sc_sw_hqe',   type: 'fiber' },
          { id: 'sc_sw_c2',  fromId: 'sc_sw_inet',  toId: 'sc_sw_br1e',  type: 'fiber' },
          { id: 'sc_sw_c3',  fromId: 'sc_sw_inet',  toId: 'sc_sw_br2e',  type: 'fiber' },
          { id: 'sc_sw_c4',  fromId: 'sc_sw_hqe',   toId: 'sc_sw_hqsw',  type: 'cat6' },
          { id: 'sc_sw_c5',  fromId: 'sc_sw_br1e',  toId: 'sc_sw_br1sw', type: 'cat6' },
          { id: 'sc_sw_c6',  fromId: 'sc_sw_br2e',  toId: 'sc_sw_br2sw', type: 'cat6' },
          { id: 'sc_sw_c7',  fromId: 'sc_sw_hqsw',  toId: 'sc_sw_hqpc',  type: 'cat6' },
          { id: 'sc_sw_c8',  fromId: 'sc_sw_br1sw', toId: 'sc_sw_b1pc',  type: 'cat6' },
          { id: 'sc_sw_c9',  fromId: 'sc_sw_br1sw', toId: 'sc_sw_b1lap', type: 'cat6' },
          { id: 'sc_sw_c10', fromId: 'sc_sw_br2sw', toId: 'sc_sw_b2pc',  type: 'cat6' },
          { id: 'sc_sw_c11', fromId: 'sc_sw_br2sw', toId: 'sc_sw_b2vo',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'SD-WAN decouples the WAN overlay from the physical underlay. Each site has an SD-WAN edge device that can bond multiple transports (MPLS, broadband, LTE) into a single logical fabric. A centralised controller defines application-level policies — e.g. route VoIP over MPLS and bulk data over broadband — applied automatically at every edge. Branches get enterprise-grade connectivity without expensive MPLS-only circuits.',
      examRelevance: {
        overview:      'SD-WAN virtualises WAN transport: edge routers create encrypted overlays across any mix of internet, MPLS, or cellular links, policy-steered per application.',
        howItRoutes:   'Each SD-WAN edge establishes encrypted tunnels to all other edges across the underlay; the controller pushes per-app routing policies that select the best path dynamically.',
        keyDevices:    'SD-WAN edge (CPE + tunnel endpoint), SD-WAN controller (centralised policy), MPLS/internet underlay (transport).',
        keyConcepts:   'Transport independence, application-aware routing, zero-touch provisioning, SD-WAN vs MPLS-only, WAN optimisation.',
        examRelevance: 'N10-009 obj 1.6 (WAN technologies) — identify SD-WAN as the software-defined alternative to dedicated MPLS circuits.',
      },
      completion: {
        requiredDevices: ['cloud', 'router', 'switch'],
        expectedCount:   { cloud: 1, router: 3, switch: 3 },
        requiredCables:  [
          { from: 'cloud',  to: 'router' },
          { from: 'router', to: 'switch' },
        ],
      },
    },

    {
      id: 'nat-gateway-cloud',
      title: 'NAT Gateway Cloud (private outbound access)',
      category: 'cloud',
      objectiveRefs: ['1.8'],
      startingState: {
        devices: [
          { id: 'sc_ng_inet',  type: 'cloud',   x: 520, y:  80, label: 'Internet' },
          { id: 'sc_ng_igw',   type: 'router',  x: 520, y: 200, label: 'IGW',           interfaces: [{ ip: '203.0.113.30', mask: 24 }] },
          { id: 'sc_ng_vpc',   type: 'cloud',   x: 520, y: 320, label: 'VPC-prod',      interfaces: [{ ip: '10.0.0.1', mask: 16 }] },
          { id: 'sc_ng_pub',   type: 'switch',  x: 320, y: 440, label: 'public-subnet' },
          { id: 'sc_ng_priv',  type: 'switch',  x: 720, y: 440, label: 'private-subnet' },
          { id: 'sc_ng_nat',   type: 'router',  x: 320, y: 560, label: 'NAT-GW',        interfaces: [{ ip: '10.0.1.5', mask: 24 }] },
          { id: 'sc_ng_api',   type: 'server',  x: 640, y: 560, label: 'Backend-API',   interfaces: [{ ip: '10.0.2.10', mask: 24 }] },
          { id: 'sc_ng_db',    type: 'server',  x: 800, y: 560, label: 'DB-Primary',    interfaces: [{ ip: '10.0.2.20', mask: 24 }] },
        ],
        cables: [
          { id: 'sc_ng_c1', fromId: 'sc_ng_inet', toId: 'sc_ng_igw',  type: 'fiber' },
          { id: 'sc_ng_c2', fromId: 'sc_ng_igw',  toId: 'sc_ng_vpc',  type: 'fiber' },
          { id: 'sc_ng_c3', fromId: 'sc_ng_vpc',  toId: 'sc_ng_pub',  type: 'cat6' },
          { id: 'sc_ng_c4', fromId: 'sc_ng_vpc',  toId: 'sc_ng_priv', type: 'cat6' },
          { id: 'sc_ng_c5', fromId: 'sc_ng_pub',  toId: 'sc_ng_nat',  type: 'cat6' },
          { id: 'sc_ng_c6', fromId: 'sc_ng_priv', toId: 'sc_ng_api',  type: 'cat6' },
          { id: 'sc_ng_c7', fromId: 'sc_ng_priv', toId: 'sc_ng_db',   type: 'cat6' },
          { id: 'sc_ng_c8', fromId: 'sc_ng_nat',  toId: 'sc_ng_api',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A NAT Gateway enables private-subnet instances to initiate outbound internet connections (e.g. to download packages or call an API) without having a public IP address or an inbound internet route. Inbound connections from the internet are still blocked — the NAT Gateway performs source NAT on outbound packets and discards unsolicited inbound traffic. The NAT Gateway itself resides in the public subnet with an Elastic IP.',
      examRelevance: {
        overview:      'A NAT Gateway gives private instances outbound-only internet access: source NAT out, no inbound route in. The internet cannot initiate connections to private instances.',
        howItRoutes:   'Private subnet instance → private route table (0.0.0.0/0 → NAT-GW) → NAT-GW source NATs the packet → IGW → internet.',
        keyDevices:    'NAT Gateway (source NAT, Elastic IP, lives in public subnet), IGW (VPC internet border), private subnet (no IGW route).',
        keyConcepts:   'Source NAT vs DNAT, Elastic IP, private subnet routing table, outbound-only internet access, difference from IGW.',
        examRelevance: 'N10-009 obj 1.8 (cloud) — contrast NAT Gateway (outbound private) with IGW (bidirectional public) routing.',
      },
      completion: {
        requiredDevices: ['cloud', 'router', 'switch', 'server'],
        expectedCount:   { cloud: 2, router: 2, switch: 2, server: 2 },
        requiredCables:  [
          { from: 'cloud',  to: 'router' },
          { from: 'router', to: 'switch' },
          { from: 'switch', to: 'server' },
        ],
      },
    },

    {
      id: 'internet-gateway-cloud',
      title: 'Internet Gateway Cloud (public web tier + LB)',
      category: 'cloud',
      objectiveRefs: ['1.8'],
      startingState: {
        devices: [
          { id: 'sc_ig_inet',  type: 'cloud',   x: 520, y:  80, label: 'Internet' },
          { id: 'sc_ig_igw',   type: 'router',  x: 520, y: 200, label: 'IGW',         interfaces: [{ ip: '203.0.113.40', mask: 24 }] },
          { id: 'sc_ig_vpc',   type: 'cloud',   x: 520, y: 320, label: 'VPC-web',     interfaces: [{ ip: '10.3.0.1', mask: 16 }] },
          { id: 'sc_ig_pub',   type: 'switch',  x: 520, y: 440, label: 'public-subnet' },
          { id: 'sc_ig_lb',    type: 'server',  x: 520, y: 560, label: 'App-LB',      interfaces: [{ ip: '10.3.1.5', mask: 24 }] },
          { id: 'sc_ig_web1',  type: 'server',  x: 320, y: 680, label: 'Web-01',      interfaces: [{ ip: '10.3.1.10', mask: 24 }] },
          { id: 'sc_ig_web2',  type: 'server',  x: 520, y: 680, label: 'Web-02',      interfaces: [{ ip: '10.3.1.11', mask: 24 }] },
          { id: 'sc_ig_web3',  type: 'server',  x: 720, y: 680, label: 'Web-03',      interfaces: [{ ip: '10.3.1.12', mask: 24 }] },
        ],
        cables: [
          { id: 'sc_ig_c1', fromId: 'sc_ig_inet', toId: 'sc_ig_igw',  type: 'fiber' },
          { id: 'sc_ig_c2', fromId: 'sc_ig_igw',  toId: 'sc_ig_vpc',  type: 'fiber' },
          { id: 'sc_ig_c3', fromId: 'sc_ig_vpc',  toId: 'sc_ig_pub',  type: 'cat6' },
          { id: 'sc_ig_c4', fromId: 'sc_ig_pub',  toId: 'sc_ig_lb',   type: 'cat6' },
          { id: 'sc_ig_c5', fromId: 'sc_ig_lb',   toId: 'sc_ig_web1', type: 'cat6' },
          { id: 'sc_ig_c6', fromId: 'sc_ig_lb',   toId: 'sc_ig_web2', type: 'cat6' },
          { id: 'sc_ig_c7', fromId: 'sc_ig_lb',   toId: 'sc_ig_web3', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'An Internet Gateway (IGW) is the VPC component that enables bidirectional communication between VPC resources and the internet. Resources in the public subnet with public IPs (or Elastic IPs) can receive inbound connections directly through the IGW. A load balancer in the public subnet distributes incoming HTTP/HTTPS requests across the web server pool — horizontal scale plus redundancy.',
      examRelevance: {
        overview:      'The IGW is a VPC border router for public-IP resources: it performs 1-to-1 NAT between Elastic IPs and private IPs, allowing inbound and outbound internet traffic.',
        howItRoutes:   'Internet → IGW → public subnet route table → load balancer → web servers (via load balancer VIP, which maps to private IPs of the web tier).',
        keyDevices:    'Internet Gateway (1-to-1 NAT, bidirectional), Application Load Balancer (L7 routing across web tier), public subnet (IGW-routed).',
        keyConcepts:   'IGW 1-to-1 NAT vs NAT Gateway masquerade, public subnet routing table, load balancer health checks, elastic IP.',
        examRelevance: 'N10-009 obj 1.8 (cloud) — distinguish IGW (public, bidirectional, 1-to-1 NAT) from NAT Gateway (private, outbound-only, masquerade).',
      },
      completion: {
        requiredDevices: ['cloud', 'router', 'switch', 'server'],
        expectedCount:   { cloud: 2, router: 1, switch: 1, server: 4 },
        requiredCables:  [
          { from: 'cloud',  to: 'router' },
          { from: 'router', to: 'switch' },
          { from: 'switch', to: 'server' },
          { from: 'server', to: 'server' },
        ],
      },
    },

    {
      id: 'vpc-peering-cloud',
      title: 'VPC Peering (two VPCs, private connectivity)',
      category: 'cloud',
      objectiveRefs: ['1.8'],
      startingState: {
        devices: [
          { id: 'sc_vp_vpca',  type: 'cloud',   x: 280, y: 200, label: 'VPC-A',        interfaces: [{ ip: '10.10.0.1', mask: 16 }] },
          { id: 'sc_vp_vpcb',  type: 'cloud',   x: 760, y: 200, label: 'VPC-B',        interfaces: [{ ip: '10.20.0.1', mask: 16 }] },
          { id: 'sc_vp_suba',  type: 'switch',  x: 280, y: 360, label: 'app-subnet-A' },
          { id: 'sc_vp_subb',  type: 'switch',  x: 760, y: 360, label: 'db-subnet-B' },
          { id: 'sc_vp_aw1',   type: 'server',  x: 160, y: 500, label: 'App-A-Web',    interfaces: [{ ip: '10.10.1.10', mask: 24 }] },
          { id: 'sc_vp_as1',   type: 'server',  x: 360, y: 500, label: 'App-A-Svc',    interfaces: [{ ip: '10.10.1.11', mask: 24 }] },
          { id: 'sc_vp_bd1',   type: 'server',  x: 640, y: 500, label: 'DB-Primary',   interfaces: [{ ip: '10.20.1.10', mask: 24 }] },
          { id: 'sc_vp_bd2',   type: 'server',  x: 840, y: 500, label: 'DB-Replica',   interfaces: [{ ip: '10.20.1.11', mask: 24 }] },
        ],
        cables: [
          { id: 'sc_vp_c1', fromId: 'sc_vp_vpca', toId: 'sc_vp_vpcb', type: 'fiber' },
          { id: 'sc_vp_c2', fromId: 'sc_vp_vpca', toId: 'sc_vp_suba', type: 'cat6' },
          { id: 'sc_vp_c3', fromId: 'sc_vp_vpcb', toId: 'sc_vp_subb', type: 'cat6' },
          { id: 'sc_vp_c4', fromId: 'sc_vp_suba', toId: 'sc_vp_aw1',  type: 'cat6' },
          { id: 'sc_vp_c5', fromId: 'sc_vp_suba', toId: 'sc_vp_as1',  type: 'cat6' },
          { id: 'sc_vp_c6', fromId: 'sc_vp_subb', toId: 'sc_vp_bd1',  type: 'cat6' },
          { id: 'sc_vp_c7', fromId: 'sc_vp_subb', toId: 'sc_vp_bd2',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'VPC peering creates a direct private-IP routing path between two VPCs — traffic travels over the cloud backbone, never the public internet. Each VPC adds a route entry pointing the peer CIDR to the peering connection. VPC peering is non-transitive: if VPC-A peers with VPC-B and VPC-B peers with VPC-C, VPC-A cannot reach VPC-C through VPC-B (use a Transit Gateway for transitive routing).',
      examRelevance: {
        overview:      'VPC peering links two VPCs with private routing over the cloud provider backbone — no internet exposure, no VPN overhead, low latency.',
        howItRoutes:   'App server in VPC-A sends traffic to DB in VPC-B; the VPC-A route table routes 10.20.0.0/16 via the peering connection; traffic traverses the cloud backbone directly.',
        keyDevices:    'VPC (network boundary), peering connection (private routing link), subnet (routing zone), servers (workloads in each VPC).',
        keyConcepts:   'VPC peering non-transitivity, route table peering entries, private IP routing, VPC peering vs Transit Gateway.',
        examRelevance: 'N10-009 obj 1.8 (cloud) — understand VPC peering non-transitivity and when to use Transit Gateway instead.',
      },
      completion: {
        requiredDevices: ['cloud', 'switch', 'server'],
        expectedCount:   { cloud: 2, switch: 2, server: 4 },
        requiredCables:  [
          { from: 'cloud',  to: 'cloud' },
          { from: 'cloud',  to: 'switch' },
          { from: 'switch', to: 'server' },
        ],
      },
    },

    // ── Batch D: WAN + VPN ───────────────────────────────────────────────

    {
      id: 'metropolitan-area-network',
      title: 'Metropolitan Area Network (MAN)',
      category: 'wan',
      objectiveRefs: ['1.2', '1.6'],
      startingState: {
        devices: [
          { id: 'sc_man_core',  type: 'router',   x: 520, y: 180, label: 'MAN-Core',      interfaces: [{ ip: '10.1.0.1',  mask: 24 }] },
          { id: 'sc_man_site1', type: 'router',   x: 240, y: 340, label: 'Site-A-Router', interfaces: [{ ip: '10.1.1.1',  mask: 24 }] },
          { id: 'sc_man_site2', type: 'router',   x: 520, y: 400, label: 'Site-B-Router', interfaces: [{ ip: '10.1.2.1',  mask: 24 }] },
          { id: 'sc_man_site3', type: 'router',   x: 800, y: 340, label: 'Site-C-Router', interfaces: [{ ip: '10.1.3.1',  mask: 24 }] },
          { id: 'sc_man_sw1',   type: 'switch',   x: 240, y: 480, label: 'SW-SiteA' },
          { id: 'sc_man_sw2',   type: 'switch',   x: 520, y: 540, label: 'SW-SiteB' },
          { id: 'sc_man_sw3',   type: 'switch',   x: 800, y: 480, label: 'SW-SiteC' },
          { id: 'sc_man_ws1',   type: 'pc',       x: 160, y: 600, label: 'Workstation-A1' },
          { id: 'sc_man_ws2',   type: 'pc',       x: 320, y: 600, label: 'Workstation-A2' },
          { id: 'sc_man_ws3',   type: 'pc',       x: 520, y: 660, label: 'Workstation-B1' },
          { id: 'sc_man_ws4',   type: 'pc',       x: 800, y: 600, label: 'Workstation-C1' },
        ],
        cables: [
          { id: 'sc_man_c1', fromId: 'sc_man_core',  toId: 'sc_man_site1', type: 'fiber' },
          { id: 'sc_man_c2', fromId: 'sc_man_core',  toId: 'sc_man_site2', type: 'fiber' },
          { id: 'sc_man_c3', fromId: 'sc_man_core',  toId: 'sc_man_site3', type: 'fiber' },
          { id: 'sc_man_c4', fromId: 'sc_man_site1', toId: 'sc_man_sw1',   type: 'cat6' },
          { id: 'sc_man_c5', fromId: 'sc_man_site2', toId: 'sc_man_sw2',   type: 'cat6' },
          { id: 'sc_man_c6', fromId: 'sc_man_site3', toId: 'sc_man_sw3',   type: 'cat6' },
          { id: 'sc_man_c7', fromId: 'sc_man_sw1',   toId: 'sc_man_ws1',   type: 'cat6' },
          { id: 'sc_man_c8', fromId: 'sc_man_sw1',   toId: 'sc_man_ws2',   type: 'cat6' },
          { id: 'sc_man_c9', fromId: 'sc_man_sw2',   toId: 'sc_man_ws3',   type: 'cat6' },
          { id: 'sc_man_c10', fromId: 'sc_man_sw3',  toId: 'sc_man_ws4',   type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A MAN spans a city or campus, interconnecting multiple buildings or sites over a shared high-speed backbone — typically fiber. Each site has its own LAN but shares the MAN core for inter-site routing. MANs sit between a LAN (single building) and a WAN (national/global) in coverage and are common in university campuses, city government networks, and multi-site enterprises within one metro area.',
      examRelevance: {
        overview: 'A MAN covers a city or campus area, larger than a LAN but smaller than a WAN.',
        howItRoutes: 'Sites connect to a central MAN core router via fiber; inter-site traffic routes through the core.',
        keyDevices: 'MAN core router, site-edge routers, access switches, and LAN workstations.',
        keyConcepts: 'MAN vs LAN vs WAN scope, fiber backbone, hub-and-spoke topology, city-scale coverage.',
        examRelevance: 'N10-009 obj 1.2 (network topology) and 1.6 (WAN types) — know MAN as the middle tier between LAN and WAN and recognize fiber as the typical MAN transport.',
      },
      completion: {
        requiredDevices: ['router', 'switch', 'pc'],
        expectedCount:   { router: 4, switch: 3, pc: 4 },
        requiredCables:  [
          { from: 'router', to: 'router' },
          { from: 'router', to: 'switch' },
          { from: 'switch', to: 'pc' },
        ],
      },
    },

    {
      id: 'site-to-site-ipsec-vpn',
      title: 'Site-to-Site IPSec VPN',
      category: 'security',
      objectiveRefs: ['4.1', '1.6'],
      startingState: {
        devices: [
          { id: 'sc_sv_inet',  type: 'internet', x: 520, y: 160, label: 'Internet',       interfaces: [{ ip: '0.0.0.0', mask: 0 }] },
          { id: 'sc_sv_hqfw',  type: 'firewall', x: 280, y: 300, label: 'HQ-Firewall',    interfaces: [{ ip: '203.0.113.1', mask: 24 }] },
          { id: 'sc_sv_brfw',  type: 'firewall', x: 760, y: 300, label: 'Branch-Firewall', interfaces: [{ ip: '198.51.100.1', mask: 24 }] },
          { id: 'sc_sv_hqsw',  type: 'switch',   x: 200, y: 440, label: 'HQ-LAN-SW' },
          { id: 'sc_sv_brsw',  type: 'switch',   x: 840, y: 440, label: 'Branch-LAN-SW' },
          { id: 'sc_sv_hqsrv', type: 'server',   x: 120, y: 560, label: 'HQ-Server',      interfaces: [{ ip: '192.168.10.10', mask: 24 }] },
          { id: 'sc_sv_hqws',  type: 'pc',       x: 280, y: 560, label: 'HQ-PC' },
          { id: 'sc_sv_brws1', type: 'pc',       x: 760, y: 560, label: 'Branch-PC1' },
          { id: 'sc_sv_brws2', type: 'pc',       x: 920, y: 560, label: 'Branch-PC2' },
        ],
        cables: [
          { id: 'sc_sv_c1', fromId: 'sc_sv_inet',  toId: 'sc_sv_hqfw',  type: 'fiber' },
          { id: 'sc_sv_c2', fromId: 'sc_sv_inet',  toId: 'sc_sv_brfw',  type: 'fiber' },
          { id: 'sc_sv_c3', fromId: 'sc_sv_hqfw',  toId: 'sc_sv_hqsw',  type: 'cat6' },
          { id: 'sc_sv_c4', fromId: 'sc_sv_brfw',  toId: 'sc_sv_brsw',  type: 'cat6' },
          { id: 'sc_sv_c5', fromId: 'sc_sv_hqsw',  toId: 'sc_sv_hqsrv', type: 'cat6' },
          { id: 'sc_sv_c6', fromId: 'sc_sv_hqsw',  toId: 'sc_sv_hqws',  type: 'cat6' },
          { id: 'sc_sv_c7', fromId: 'sc_sv_brsw',  toId: 'sc_sv_brws1', type: 'cat6' },
          { id: 'sc_sv_c8', fromId: 'sc_sv_brsw',  toId: 'sc_sv_brws2', type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A site-to-site IPSec VPN creates an encrypted tunnel between two network firewalls over the public internet, making remote branch traffic appear as if it is on the same private LAN as headquarters. The firewalls negotiate IKE Phase 1 (ISAKMP SA — authenticating peers) and Phase 2 (IPSec SA — encrypting the data tunnel). The tunnel is always-on and transparent to end devices.',
      examRelevance: {
        overview: 'Site-to-site IPSec VPN encrypts traffic between two fixed sites over the internet.',
        howItRoutes: 'HQ and branch firewalls both connect to the internet; IPSec tunnel encrypts traffic between the two private LANs.',
        keyDevices: 'Firewall/VPN concentrators at each end, internet as the transport, LAN switches and endpoints.',
        keyConcepts: 'IKE Phase 1 vs Phase 2, ISAKMP, ESP vs AH, tunnel mode vs transport mode, pre-shared key vs certificate authentication.',
        examRelevance: 'N10-009 obj 4.1 (security concepts) and 1.6 (WAN connectivity) — know the two IKE phases, ESP for encryption, and distinguish site-to-site from remote-access VPN.',
      },
      completion: {
        requiredDevices: ['internet', 'firewall', 'switch', 'server', 'pc'],
        expectedCount:   { internet: 1, firewall: 2, switch: 2, server: 1, pc: 3 },
        requiredCables:  [
          { from: 'internet', to: 'firewall' },
          { from: 'firewall', to: 'switch' },
          { from: 'switch',   to: 'server' },
          { from: 'switch',   to: 'pc' },
        ],
      },
    },

    {
      id: 'remote-access-vpn',
      title: 'Remote Access VPN (SSL/TLS)',
      category: 'security',
      objectiveRefs: ['4.1', '1.6'],
      startingState: {
        devices: [
          { id: 'sc_rv_inet',  type: 'internet', x: 520, y: 140, label: 'Internet',        interfaces: [{ ip: '0.0.0.0', mask: 0 }] },
          { id: 'sc_rv_vpnc',  type: 'vpn',      x: 320, y: 280, label: 'VPN-Concentrator', interfaces: [{ ip: '203.0.113.10', mask: 24 }] },
          { id: 'sc_rv_fw',    type: 'firewall', x: 520, y: 280, label: 'Corp-Firewall',    interfaces: [{ ip: '10.0.0.1',    mask: 8 }] },
          { id: 'sc_rv_sw',    type: 'switch',   x: 520, y: 420, label: 'Corp-LAN-SW' },
          { id: 'sc_rv_srv',   type: 'server',   x: 400, y: 540, label: 'File-Server',      interfaces: [{ ip: '10.10.1.10',  mask: 24 }] },
          { id: 'sc_rv_app',   type: 'server',   x: 640, y: 540, label: 'App-Server',       interfaces: [{ ip: '10.10.1.20',  mask: 24 }] },
          { id: 'sc_rv_lap1',  type: 'laptop',   x: 160, y: 420, label: 'Remote-Worker-1' },
          { id: 'sc_rv_lap2',  type: 'laptop',   x: 160, y: 560, label: 'Remote-Worker-2' },
          { id: 'sc_rv_mob',   type: 'smartphone', x: 760, y: 140, label: 'Mobile-User' },
        ],
        cables: [
          { id: 'sc_rv_c1', fromId: 'sc_rv_inet', toId: 'sc_rv_vpnc',  type: 'fiber' },
          { id: 'sc_rv_c2', fromId: 'sc_rv_inet', toId: 'sc_rv_fw',    type: 'fiber' },
          { id: 'sc_rv_c3', fromId: 'sc_rv_inet', toId: 'sc_rv_mob',   type: 'fiber' },
          { id: 'sc_rv_c4', fromId: 'sc_rv_vpnc', toId: 'sc_rv_fw',    type: 'cat6' },
          { id: 'sc_rv_c5', fromId: 'sc_rv_vpnc', toId: 'sc_rv_lap1',  type: 'fiber' },
          { id: 'sc_rv_c6', fromId: 'sc_rv_vpnc', toId: 'sc_rv_lap2',  type: 'fiber' },
          { id: 'sc_rv_c7', fromId: 'sc_rv_fw',   toId: 'sc_rv_sw',    type: 'cat6' },
          { id: 'sc_rv_c8', fromId: 'sc_rv_sw',   toId: 'sc_rv_srv',   type: 'cat6' },
          { id: 'sc_rv_c9', fromId: 'sc_rv_sw',   toId: 'sc_rv_app',   type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'A remote-access VPN lets individual users connect securely to the corporate network from anywhere over the internet. SSL/TLS VPNs use port 443 and a VPN concentrator or firewall as the termination point — they work through most firewalls without special port-forwarding and require only a browser or lightweight client. The concentrator authenticates the user, assigns a virtual IP from the corporate pool, and tunnels traffic to internal resources.',
      examRelevance: {
        overview: 'Remote-access VPN gives individual road-warrior users an encrypted tunnel to the corporate LAN.',
        howItRoutes: 'Remote devices connect through the internet to a VPN concentrator, which terminates the tunnel and forwards decrypted traffic into the corp LAN.',
        keyDevices: 'VPN concentrator, corp firewall, internal servers, and remote laptops/smartphones.',
        keyConcepts: 'SSL/TLS VPN vs IPSec VPN, split tunneling vs full tunneling, user authentication (MFA), virtual IP assignment, port 443.',
        examRelevance: 'N10-009 obj 4.1 (security concepts) and 1.6 (WAN) — know the difference between remote-access VPN and site-to-site VPN, and why SSL VPN is preferred for road warriors.',
      },
      completion: {
        requiredDevices: ['internet', 'vpn', 'firewall', 'switch', 'server'],
        expectedCount:   { internet: 1, vpn: 1, firewall: 1, switch: 1, server: 2 },
        requiredCables:  [
          { from: 'internet', to: 'vpn' },
          { from: 'vpn',      to: 'firewall' },
          { from: 'firewall', to: 'switch' },
          { from: 'switch',   to: 'server' },
        ],
      },
    },

    {
      id: 'cellular-4g-5g-wan',
      title: 'Cellular 4G/5G WAN',
      category: 'wan',
      objectiveRefs: ['1.6', '2.4'],
      startingState: {
        devices: [
          { id: 'sc_cw_tower',  type: 'internet', x: 520, y: 140, label: 'Cellular-Tower', interfaces: [{ ip: '100.64.0.1', mask: 10 }] },
          { id: 'sc_cw_rtr1',   type: 'router',   x: 280, y: 300, label: 'HQ-4G-Router',  interfaces: [{ ip: '100.64.0.2', mask: 10 }] },
          { id: 'sc_cw_rtr2',   type: 'router',   x: 760, y: 300, label: 'Branch-5G-Router', interfaces: [{ ip: '100.64.0.3', mask: 10 }] },
          { id: 'sc_cw_sw1',    type: 'switch',   x: 200, y: 440, label: 'HQ-LAN-SW' },
          { id: 'sc_cw_sw2',    type: 'switch',   x: 840, y: 440, label: 'Branch-LAN-SW' },
          { id: 'sc_cw_srv',    type: 'server',   x: 120, y: 560, label: 'HQ-Server',     interfaces: [{ ip: '192.168.10.5', mask: 24 }] },
          { id: 'sc_cw_ws1',    type: 'pc',       x: 280, y: 560, label: 'HQ-PC' },
          { id: 'sc_cw_mob1',   type: 'smartphone', x: 760, y: 560, label: 'Branch-Mobile1' },
          { id: 'sc_cw_mob2',   type: 'smartphone', x: 920, y: 560, label: 'Branch-Mobile2' },
        ],
        cables: [
          { id: 'sc_cw_c1', fromId: 'sc_cw_tower', toId: 'sc_cw_rtr1',  type: 'fiber' },
          { id: 'sc_cw_c2', fromId: 'sc_cw_tower', toId: 'sc_cw_rtr2',  type: 'fiber' },
          { id: 'sc_cw_c3', fromId: 'sc_cw_rtr1',  toId: 'sc_cw_sw1',   type: 'cat6' },
          { id: 'sc_cw_c4', fromId: 'sc_cw_rtr2',  toId: 'sc_cw_sw2',   type: 'cat6' },
          { id: 'sc_cw_c5', fromId: 'sc_cw_sw1',   toId: 'sc_cw_srv',   type: 'cat6' },
          { id: 'sc_cw_c6', fromId: 'sc_cw_sw1',   toId: 'sc_cw_ws1',   type: 'cat6' },
          { id: 'sc_cw_c7', fromId: 'sc_cw_sw2',   toId: 'sc_cw_mob1',  type: 'cat6' },
          { id: 'sc_cw_c8', fromId: 'sc_cw_sw2',   toId: 'sc_cw_mob2',  type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Cellular WAN uses 4G LTE or 5G NR as the last-mile transport between a site router and the mobile carrier backbone. It is a popular backup or primary WAN option for sites where fiber or cable is unavailable — the router contains a cellular modem with a SIM card. 5G offers sub-10ms latency and multi-Gbps speeds suitable for SD-WAN or IoT-dense sites; 4G LTE is adequate for branch office traffic.',
      examRelevance: {
        overview: 'Cellular WAN uses 4G/5G mobile networks as the transport layer for site connectivity.',
        howItRoutes: 'Site routers connect to cellular towers via wireless RF; the carrier backbone forwards traffic to the internet or VPN endpoints.',
        keyDevices: 'Cellular router (with SIM), cellular tower, LAN switches, and endpoint devices.',
        keyConcepts: '4G LTE vs 5G NR speeds/latency, cellular as WAN backup or primary, SIM-based authentication, CGNAT addressing (100.64/10 range).',
        examRelevance: 'N10-009 obj 1.6 (WAN types) and 2.4 (wireless) — know cellular as a WAN option, 4G/5G characteristics, and when cellular WAN is preferred over fiber.',
      },
      completion: {
        requiredDevices: ['internet', 'router', 'switch'],
        expectedCount:   { internet: 1, router: 2, switch: 2 },
        requiredCables:  [
          { from: 'internet', to: 'router' },
          { from: 'router',   to: 'switch' },
        ],
      },
    },

    {
      id: 'satellite-wan',
      title: 'Satellite WAN',
      category: 'wan',
      objectiveRefs: ['1.6'],
      startingState: {
        devices: [
          { id: 'sc_sat_sat',  type: 'cloud',   x: 520, y: 100, label: 'Satellite',        interfaces: [{ ip: '192.0.2.1', mask: 24 }] },
          { id: 'sc_sat_hub',  type: 'router',  x: 520, y: 260, label: 'Satellite-Hub-NOC', interfaces: [{ ip: '192.0.2.10', mask: 24 }] },
          { id: 'sc_sat_inet', type: 'internet', x: 760, y: 260, label: 'Internet',         interfaces: [{ ip: '0.0.0.0', mask: 0 }] },
          { id: 'sc_sat_vsat1', type: 'router', x: 200, y: 400, label: 'VSAT-Site1',        interfaces: [{ ip: '10.99.1.1', mask: 24 }] },
          { id: 'sc_sat_vsat2', type: 'router', x: 840, y: 400, label: 'VSAT-Site2',        interfaces: [{ ip: '10.99.2.1', mask: 24 }] },
          { id: 'sc_sat_sw1',  type: 'switch',  x: 120, y: 540, label: 'Remote-SW1' },
          { id: 'sc_sat_sw2',  type: 'switch',  x: 920, y: 540, label: 'Remote-SW2' },
          { id: 'sc_sat_ws1',  type: 'pc',      x: 80,  y: 660, label: 'Remote-PC1' },
          { id: 'sc_sat_ws2',  type: 'pc',      x: 200, y: 660, label: 'Remote-PC2' },
          { id: 'sc_sat_ws3',  type: 'pc',      x: 840, y: 660, label: 'Remote-PC3' },
        ],
        cables: [
          { id: 'sc_sat_c1',  fromId: 'sc_sat_sat',   toId: 'sc_sat_hub',   type: 'fiber' },
          { id: 'sc_sat_c2',  fromId: 'sc_sat_sat',   toId: 'sc_sat_vsat1', type: 'fiber' },
          { id: 'sc_sat_c3',  fromId: 'sc_sat_sat',   toId: 'sc_sat_vsat2', type: 'fiber' },
          { id: 'sc_sat_c4',  fromId: 'sc_sat_hub',   toId: 'sc_sat_inet',  type: 'cat6' },
          { id: 'sc_sat_c5',  fromId: 'sc_sat_vsat1', toId: 'sc_sat_sw1',   type: 'cat6' },
          { id: 'sc_sat_c6',  fromId: 'sc_sat_vsat2', toId: 'sc_sat_sw2',   type: 'cat6' },
          { id: 'sc_sat_c7',  fromId: 'sc_sat_sw1',   toId: 'sc_sat_ws1',   type: 'cat6' },
          { id: 'sc_sat_c8',  fromId: 'sc_sat_sw1',   toId: 'sc_sat_ws2',   type: 'cat6' },
          { id: 'sc_sat_c9',  fromId: 'sc_sat_sw2',   toId: 'sc_sat_ws3',   type: 'cat6' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Satellite WAN is the last-resort connectivity option for remote sites with no terrestrial infrastructure — oil rigs, ships, farms, and rural branches. VSAT (Very Small Aperture Terminal) dishes at each site beam traffic up to a geostationary satellite and down to a Network Operations Centre (NOC) hub, which connects to the internet. Key trade-off: high latency (~600ms round-trip for GEO) due to the 35,786 km altitude. Low-Earth Orbit (LEO) satellites like Starlink cut this to ~20-40ms.',
      examRelevance: {
        overview: 'Satellite WAN provides connectivity to remote sites using VSAT dishes and a satellite hub.',
        howItRoutes: 'Remote VSAT routers beam traffic to the satellite, which relays to a NOC hub router connected to the internet.',
        keyDevices: 'Satellite (GEO or LEO), VSAT site routers, NOC hub router, LAN switches at remote sites.',
        keyConcepts: 'VSAT, GEO vs LEO latency (600ms vs 20-40ms), hub-and-spoke topology via satellite, last-mile for remote locations.',
        examRelevance: 'N10-009 obj 1.6 (WAN connectivity types) — know satellite WAN characteristics, especially high GEO latency and why LEO options are preferred for latency-sensitive applications.',
      },
      completion: {
        requiredDevices: ['cloud', 'router', 'internet', 'switch', 'pc'],
        expectedCount:   { cloud: 1, router: 3, internet: 1, switch: 2, pc: 3 },
        requiredCables:  [
          { from: 'cloud',    to: 'router' },
          { from: 'router',   to: 'internet' },
          { from: 'router',   to: 'switch' },
          { from: 'switch',   to: 'pc' },
        ],
      },
    },
    {
      id: 'hybrid-cloud-vpn',
      title: 'Hybrid Cloud (VPN)',
      category: 'cloud',
      objectiveRefs: ['1.8'],
      startingState: {
        devices: [
          { id: 'sc_hcvpn_dc',   type: 'switch',   x: 200,  y: 400, label: 'HQ-DC',      interfaces: [{ ip: '10.100.0.1',   mask: 24 }] },
          { id: 'sc_hcvpn_fw',   type: 'firewall', x: 400,  y: 400, label: 'DC-FW',       interfaces: [{ ip: '10.100.0.2',   mask: 24 }, { ip: '203.0.113.1', mask: 24 }] },
          { id: 'sc_hcvpn_inet', type: 'internet', x: 600,  y: 200, label: 'Internet',    interfaces: [{ ip: '0.0.0.0',      mask: 0  }] },
          { id: 'sc_hcvpn_vpg',  type: 'vpg',      x: 800,  y: 400, label: 'Cloud-VPG',   interfaces: [{ ip: '203.0.113.10', mask: 24 }] },
          { id: 'sc_hcvpn_vpc',  type: 'cloud',    x: 1000, y: 400, label: 'VPC-prod',    interfaces: [{ ip: '10.0.0.1',     mask: 16 }] },
          { id: 'sc_hcvpn_sub',  type: 'switch',   x: 1000, y: 560, label: 'app-subnet'   },
          { id: 'sc_hcvpn_app',  type: 'server',   x: 1000, y: 700, label: 'Cloud-App',   interfaces: [{ ip: '10.0.1.10',    mask: 24 }] },
        ],
        cables: [
          { id: 'sc_hcvpn_c1', fromId: 'sc_hcvpn_dc',   toId: 'sc_hcvpn_fw',   type: 'cat6'  },
          { id: 'sc_hcvpn_c2', fromId: 'sc_hcvpn_fw',   toId: 'sc_hcvpn_inet', type: 'cat6'  },
          { id: 'sc_hcvpn_c3', fromId: 'sc_hcvpn_inet', toId: 'sc_hcvpn_vpg',  type: 'fiber' },
          { id: 'sc_hcvpn_c4', fromId: 'sc_hcvpn_vpg',  toId: 'sc_hcvpn_vpc',  type: 'cat6'  },
          { id: 'sc_hcvpn_c5', fromId: 'sc_hcvpn_vpc',  toId: 'sc_hcvpn_sub',  type: 'cat6'  },
          { id: 'sc_hcvpn_c6', fromId: 'sc_hcvpn_sub',  toId: 'sc_hcvpn_app',  type: 'cat6'  },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      brief: 'Hybrid cloud connects an on-premises datacenter to a cloud VPC through an IPSec VPN tunnel. Legacy resources stay in the physical DC; newer workloads run in the cloud. Crypto parameters (encryption, hash, DH group, lifetime) must match exactly on both ends or the tunnel will not come up.',
      examRelevance: {
        overview:      'A site-to-site IPSec VPN bridges an on-prem DC and a cloud VPC, making both halves appear as one network. The VPN Gateway (VPG) is the cloud-side tunnel endpoint; the on-prem firewall terminates the tunnel on-prem.',
        howItRoutes:   'On-prem host → DC switch → firewall (IPSec encrypt, ESP tunnel mode) → internet → Cloud VPG (decrypt) → VPC → app-subnet → Cloud-App. Return path is symmetric.',
        keyDevices:    'DC Firewall (on-prem VPN endpoint, terminates IPSec tunnel), VPN Gateway — VPG (cloud-side tunnel endpoint, attached to VPC), VPC (cloud network boundary), Cloud-App server.',
        keyConcepts:   'IPSec tunnel mode (ESP), IKE Phase 1 + Phase 2 negotiation, crypto parameter matching (encryption alg, hash, DH group, lifetime), Perfect Forward Secrecy (PFS).',
        examRelevance: 'N10-009 obj 1.8 (hybrid cloud) and 4.1 (site-to-site VPN) — know that IPSec uses tunnel mode for site-to-site, that crypto params must match on both peers, and that the VPN Gateway is the cloud-side IPSec endpoint.',
      },
      completion: {
        requiredDevices: ['switch', 'firewall', 'internet', 'vpg', 'cloud', 'server'],
        expectedCount:   { switch: 2, firewall: 1, internet: 1, vpg: 1, cloud: 1, server: 1 },
        requiredCables:  [
          { from: 'switch',   to: 'firewall'  },
          { from: 'firewall', to: 'internet'  },
          { from: 'internet', to: 'vpg'       },
          { from: 'vpg',      to: 'cloud'     },
          { from: 'cloud',    to: 'switch'    },
          { from: 'switch',   to: 'server'    },
        ],
      },
    },
  ];

  function validateScenarioShape(s) {
    if (!s || typeof s !== 'object') return false;
    if (typeof s.id !== 'string' || !s.id.length) return false;
    if (typeof s.title !== 'string' || !s.title.length) return false;
    var cats = ['topology','architecture','wan','cloud','wireless','security','vlan'];
    if (cats.indexOf(s.category) === -1) return false;
    if (!Array.isArray(s.objectiveRefs)) return false;
    if (!s.startingState || typeof s.startingState !== 'object') return false;
    if (!Array.isArray(s.startingState.devices)) return false;
    if (!Array.isArray(s.startingState.cables)) return false;
    if (!s.completion || typeof s.completion !== 'object') return false;
    if (!Array.isArray(s.completion.requiredDevices)) return false;
    return true;
  }

  // Pure: returns the next state after loading a scenario.
  // Caller is responsible for re-rendering canvas + minimap + intent chip + completion pill.
  function loadScenarioOnCanvas(curState, scenario) {
    if (!validateScenarioShape(scenario)) return curState;
    var ss = scenario.startingState;
    return {
      devices: (ss.devices || []).map(function (d) {
        var dev = { id: d.id, type: d.type, x: d.x, y: d.y, label: d.label || '', config: d.config || {} };
        if (Array.isArray(d.interfaces)) dev.interfaces = d.interfaces;
        return dev;
      }),
      cables: (ss.cables || []).map(function (c) {
        return { id: c.id, fromId: c.fromId, fromPort: c.fromPort || 0, toId: c.toId, toPort: c.toPort || 0, type: c.type || 'cat6' };
      }),
      viewport: ss.viewport ? { x: ss.viewport.x || 0, y: ss.viewport.y || 0, zoom: ss.viewport.zoom || 1 } : { x: 0, y: 0, zoom: 1 },
      intent: 'lab',
      mode: 'design',
      selectedId: null,
      activeScenarioId: scenario.id,
    };
  }

  // Pure: returns { complete:boolean, missingDevices, deviceCountMismatch, missingCables }
  // 'requiredCables' is a pair list — each {from,to} matches if AT LEAST ONE cable
  // connects a device of type 'from' to a device of type 'to' (order-agnostic).
  function checkCompletion(state, completion) {
    var c = completion || {};
    var devices = state.devices || [];
    var cables = state.cables || [];

    var typeCount = {};
    devices.forEach(function (d) { typeCount[d.type] = (typeCount[d.type] || 0) + 1; });

    var missingDevices = (c.requiredDevices || []).filter(function (t) { return !typeCount[t]; });

    var deviceCountMismatch = [];
    if (c.expectedCount) {
      Object.keys(c.expectedCount).forEach(function (t) {
        if ((typeCount[t] || 0) < c.expectedCount[t]) deviceCountMismatch.push(t);
      });
    }

    var typeOfId = {};
    devices.forEach(function (d) { typeOfId[d.id] = d.type; });

    var missingCables = (c.requiredCables || []).filter(function (req) {
      var ok = cables.some(function (cb) {
        var ft = typeOfId[cb.fromId], tt = typeOfId[cb.toId];
        return (ft === req.from && tt === req.to) || (ft === req.to && tt === req.from);
      });
      return !ok;
    });
    var reachabilityFailures = [];
    if ((c.requiredCables || []).length && missingDevices.length === 0 && missingCables.length === 0) {
      if (typeof computeReachability === 'function') {
        var reach = computeReachability(state, c);
        reachabilityFailures = reach.failures || [];
      }
    }
    var complete = missingDevices.length === 0
      && deviceCountMismatch.length === 0
      && missingCables.length === 0
      && reachabilityFailures.length === 0;
    return {
      complete: complete,
      missingDevices: missingDevices,
      deviceCountMismatch: deviceCountMismatch,
      missingCables: missingCables,
      reachabilityFailures: reachabilityFailures,
    };
  }

  // Snapshot the current canvas (when intent === 'free-build') so the user
  // can load a Lab scenario without losing work. One-shot restore.
  function backupFreeBuild(s) {
    try {
      localStorage.setItem(STORAGE.TB_V3_FREEBUILD_BACKUP, serialiseState(s));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Returns the parsed prior state and clears the backup. Returns null if no backup exists.
  function restoreFreeBuild() {
    try {
      var json = localStorage.getItem(STORAGE.TB_V3_FREEBUILD_BACKUP);
      if (!json) return null;
      var parsed = parseState(json);
      localStorage.removeItem(STORAGE.TB_V3_FREEBUILD_BACKUP);
      // Force intent back to free-build (the backup IS the free-build canvas).
      parsed.intent = 'free-build';
      parsed.activeScenarioId = null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  // ───────────────────────────────────────────────────────────
  // SAVE / LOAD (TASK 6.x)
  // ───────────────────────────────────────────────────────────

  var _saveTimer = null;
  function _saveState() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE.TB_V3_DRAFT, serialiseState(state));
        _updateSaveIndicator('saved');
      } catch (e) {
        _updateSaveIndicator('error');
      }
    }, 500);
    _updateSaveIndicator('saving');
  }

  function _updateSaveIndicator(status) {
    var el = document.getElementById('tb3-status-save');
    if (!el) return;
    if (status === 'saving') {
      el.textContent = '· saving';
      el.style.color = 'var(--tb3-text-dim)';
    } else if (status === 'saved') {
      el.textContent = '· saved';
      el.style.color = 'var(--tb3-pass)';
    } else {
      el.textContent = '· save error';
      el.style.color = 'var(--tb3-red)';
    }
  }

  function _loadState() {
    try {
      var json = localStorage.getItem(STORAGE.TB_V3_DRAFT);
      if (json) {
        state = parseState(json);
      }
    } catch (e) {
      // Silent — start fresh
    }
    _renderIntentChip(); // Task 4.1 (phase 2) — restore chip after state reload
    _renderCompletionPill(); // Task 6.1 (phase 2) — restore pill after state reload
  }

  // ===========================================================================
  // Title-case helper for scenario titles. Capitalizes first letter of each
  // word except short joiners (only when not the first word). Preserves
  // acronyms (UPPERCASE words >= 2 chars stay so). Splits on whitespace and
  // hyphens so hyphenated compounds get each component capitalized.
  var _TITLE_CASE_LOWER_WORDS = new Set(['a','an','and','the','of','with','on','in','or','for','to','at','vs','via']);
  function _titleCase(str) {
    if (!str || typeof str !== 'string') return str;
    return str.split(/(\s+|-)/).map(function (part, idx) {
      if (part.match(/^\s+$/) || part === '-') return part;
      // If already all-uppercase (>=2 chars) → preserve as acronym
      if (part.length >= 2 && part === part.toUpperCase() && /[A-Z]/.test(part)) return part;
      // Lower-word check (only for non-first parts, not at start of string)
      if (idx > 0 && _TITLE_CASE_LOWER_WORDS.has(part.toLowerCase())) return part.toLowerCase();
      // Capitalize first letter, lower rest
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join('');
  }

  // ===========================================================================
  // V1 parity migration: rewrites old V3 device type ids to V1 conventions.
  // Runs once per hydration. Idempotent (safe to call multiple times).
  // ===========================================================================
  var _V1_TYPE_RENAMES = {
    'ap': 'wap',
    'workstation': 'pc',
    'vpn-gateway': 'vpg',
    'ids-ips': 'ids',
    'isp-modem': 'isp-router'
  };
  function _migrateStateTypesToV1() {
    if (!state || !Array.isArray(state.devices)) return;
    var renamed = 0;
    for (var i = 0; i < state.devices.length; i++) {
      var oldType = state.devices[i].type;
      if (_V1_TYPE_RENAMES.hasOwnProperty(oldType)) {
        state.devices[i].type = _V1_TYPE_RENAMES[oldType];
        renamed++;
      }
    }
    if (renamed > 0) {
      console.info('[tb-v3] V1 parity: migrated ' + renamed + ' device(s) to V1 type ids');
      if (typeof _saveState === 'function') _saveState();
    }
  }

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
          '<div id="tb3-completion-pill" class="tb3-completion-pill" hidden></div>' +
          '<div class="tb3-rrail-btn locked" title="Inspector (active when device selected)">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>' +
          '</div>' +
          '<div class="tb3-rrail-btn" id="tb3-rrail-scenarios" title="Scenarios — pick a lab">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 5v14"/></svg>' +
          '</div>' +
          '<div class="tb3-rrail-btn locked" title="Coach (Phase 7)">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z"/></svg>' +
          '</div>' +
        '</div>' +
        '<div class="tb3-inspector" id="tb3-inspector"></div>' +
        '<div class="tb3-picker" id="tb3-picker"></div>' +
        '<aside class="tb3-diagnostic" id="tb3-diagnostic" role="dialog" aria-labelledby="tb3-diagnostic-title"></aside>' +
        '<aside id="tb3-simulate-panel" aria-label="Simulate panel">' +
          '<div class="tb3-sim-head">' +
            '<div>' +
              '<div class="tb3-sim-eyebrow">Simulate</div>' +
              '<h3 class="tb3-sim-title">Packet drill</h3>' +
            '</div>' +
            '<button type="button" id="tb3-sim-close" aria-label="Close Simulate">&times;</button>' +
          '</div>' +
          '<div id="tb3-sim-preview-section" class="tb3-sim-section" hidden>' +
            '<div class="tb3-sim-section-h">Validator preview</div>' +
            '<button type="button" id="tb3-sim-preview-btn">Replay validator paths</button>' +
          '</div>' +
          '<div id="tb3-sim-drill-section" class="tb3-sim-section">' +
            '<div class="tb3-sim-section-h">Drill</div>' +
            '<div id="tb3-sim-drill-controls"></div>' +
          '</div>' +
          '<div id="tb3-sim-log-section" class="tb3-sim-section">' +
            '<div class="tb3-sim-section-h">Log</div>' +
            '<div id="tb3-sim-log"></div>' +
          '</div>' +
        '</aside>' +
        '<aside id="tb3-trace-panel" aria-label="Trace panel">' +
          '<div class="tb3-trace-head">' +
            '<div>' +
              '<div class="tb3-trace-eyebrow">Trace</div>' +
              '<h3 class="tb3-trace-title">Trace mode</h3>' +
            '</div>' +
            '<button type="button" id="tb3-trace-close" aria-label="Close Trace">&times;</button>' +
          '</div>' +
          '<div id="tb3-trace-controls-host" class="tb3-trace-section"></div>' +
          '<div id="tb3-trace-hops-host" class="tb3-trace-section"></div>' +
          '<div id="tb3-trace-annotation-host" class="tb3-trace-section"></div>' +
        '</aside>' +
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
    _wirePicker();      // Task 2.1 (phase 2)
    _wireDiagnosticDrawer();
    _wireGlobalKeys();  // Task 5.3
    _wireExport();      // Task 8.2
    _wireIntent();      // Task 4.1 (phase 2)
    _renderIntentChip();// Task 4.1 (phase 2)
    _renderCompletionPill(); // Task 6.1 (phase 2)
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

  // ───────────────────────────────────────────────────────────
  // STAGE 4.1 — Packet motion primitives
  // ───────────────────────────────────────────────────────────

  function _sameSubnet(devA, devB) {
    if (!devA || !devB || !devA.config || !devB.config) return false;
    var a = devA.config.ip, b = devB.config.ip, mask = devA.config.mask || devB.config.mask || 24;
    if (!a || !b) return false;
    var ipNum = function (s) {
      var p = String(s).split('.').map(Number);
      return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
    };
    var mNum = (mask === 0) ? 0 : (~0 << (32 - mask)) >>> 0;
    return (ipNum(a) & mNum) === (ipNum(b) & mNum);
  }

  function _sameSubnetDevices(srcId) {
    var src = state.devices.find(function (d) { return d.id === srcId; });
    if (!src) return [];
    return state.devices.filter(function (d) { return d.id !== srcId && _sameSubnet(src, d); });
  }

  function _devCenter(devId) {
    var dev = state.devices.find(function (d) { return d.id === devId; });
    if (!dev) return null;
    // Match _renderCanvas: device is 76x76, label group at translate(x,y)
    return { x: dev.x + 38, y: dev.y + 38 };
  }

  function _spawnPacketSvg(color) {
    var svg = document.getElementById('tb3-canvas-svg');
    if (!svg) return null;
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    el.setAttribute('r', '6');
    el.setAttribute('class', 'tb3-packet');
    el.setAttribute('fill', color);
    el.setAttribute('filter', 'drop-shadow(0 0 6px ' + color + ')');
    svg.appendChild(el);
    return el;
  }

  function _movePacket(el, fromPt, toPt, durMs, onDone) {
    if (!el) { if (onDone) onDone(); return null; }
    var start = performance.now();
    var raf;
    function tick(now) {
      var t = Math.min(1, (now - start) / durMs);
      // cubic-bezier(0.4, 0, 0.2, 1) approximation
      var ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var x = fromPt.x + (toPt.x - fromPt.x) * ease;
      var y = fromPt.y + (toPt.y - fromPt.y) * ease;
      el.setAttribute('cx', x);
      el.setAttribute('cy', y);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        _simState.currentPacket = raf;
      } else {
        _simState.currentPacket = null;
        if (onDone) onDone();
      }
    }
    raf = requestAnimationFrame(tick);
    _simState.currentPacket = raf;
    return raf;
  }

  function _despawnPacket(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function _reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

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

    // Phase 4: keep Simulate panel in sync with canvas state (dropdowns reflect new devices)
    if (state.mode === 'simulate') {
      _renderSimulatePanel();
    }

    // Phase 7 v2 Stage 6: live sync — if 3D popup is open, refresh its scene.
    // Camera transform on .tb3-3d-popup-stage is NOT touched — user keeps
    // their rotated view across edits.
    if (_3dPopup.open) _render3DScene();
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
    var panCommitted = false; // false until mouse moves > PAN_THRESHOLD px (suppresses pan on a static click)
    var panStartX = 0, panStartY = 0;
    var viewStartX = 0, viewStartY = 0;
    var PAN_THRESHOLD = 3;

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

    // Pan: space+drag (instant) OR click+drag on empty canvas (committed after PAN_THRESHOLD px)
    wrap.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return; // left click only
      if (spaceDown) {
        // Space-pan: commit immediately (matches pre-existing power-user behaviour)
        panning = true;
        panCommitted = true;
        wrap.classList.add('grabbing');
        panStartX = e.clientX;
        panStartY = e.clientY;
        viewStartX = state.viewport.x;
        viewStartY = state.viewport.y;
        e.preventDefault();
        return;
      }
      // Implicit pan: mousedown on empty canvas → candidate pan, committed after PAN_THRESHOLD movement.
      // Skip if the mousedown originated on a device (the device-drag handler owns that).
      // Skip in cable mode (cursor='crosshair' is the only signal at this scope).
      if (e.target.closest('.tb3-dev')) return;
      if (wrap.style.cursor === 'crosshair') return;
      panning = true;
      panCommitted = false; // not yet — wait for threshold in mousemove
      panStartX = e.clientX;
      panStartY = e.clientY;
      viewStartX = state.viewport.x;
      viewStartY = state.viewport.y;
    });
    document.addEventListener('mousemove', function (e) {
      if (!panning) return;
      var rawDx = e.clientX - panStartX;
      var rawDy = e.clientY - panStartY;
      if (!panCommitted) {
        if (Math.abs(rawDx) < PAN_THRESHOLD && Math.abs(rawDy) < PAN_THRESHOLD) return;
        panCommitted = true;
        wrap.classList.add('grabbing');
      }
      var dx = rawDx / state.viewport.zoom;
      var dy = rawDy / state.viewport.zoom;
      state.viewport.x = viewStartX - dx;
      state.viewport.y = viewStartY - dy;
      _renderCanvas();
      _renderMinimap();
    });
    document.addEventListener('mouseup', function () {
      if (panning) {
        var wasCommitted = panCommitted;
        panning = false;
        panCommitted = false;
        wrap.classList.remove('grabbing');
        if (wasCommitted) {
          _saveState();
          _renderCompletionPill();
        }
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
      _renderCompletionPill();
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
    _renderCompletionPill();
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
    'pc':             { label: 'PC', icon: _icoDesktop() },
    'laptop':         { label: 'Laptop', icon: _icoLaptop() },
    'server':         { label: 'Server', icon: _icoServer() },
    'smartphone':     { label: 'Smartphone', icon: _icoSmartphone() },
    'smart-tv':       { label: 'Smart TV', icon: _icoSmartTv() },
    'game-console':   { label: 'Game Console', icon: _icoGameConsole() },
    // Wireless
    'wap':            { label: 'WAP', icon: _icoAp() },
    'wlc':            { label: 'Wireless Controller', icon: _icoWlc() },
    // Security
    'firewall':       { label: 'Firewall', icon: _icoFirewall() },
    'ids':            { label: 'IDS/IPS', icon: _icoIds() },
    // Cloud & WAN
    'cloud':          { label: 'Cloud', icon: _icoCloud() },
    'internet':       { label: 'Internet', icon: _icoInternet() },
    'isp-router':     { label: 'ISP Router', icon: _icoModem() },
    'mpls-core':      { label: 'MPLS Core', icon: _icoMpls() },
    'vpg':            { label: 'VPN Gateway', icon: _icoVpn() },
    'load-balancer':  { label: 'Load Balancer', icon: _icoLb() },
    // Stage 2 V1-parity device types
    // Network
    'dmz-switch':     { label: 'DMZ Switch', icon: _icoDmzSwitch() },
    'onprem-dc':      { label: 'On-Prem DC', icon: _icoOnpremDc() },
    'bridge':         { label: 'Bridge', icon: _icoBridge() },
    // Endpoints
    'printer':        { label: 'Printer', icon: _icoPrinter() },
    'voip':           { label: 'VoIP Phone', icon: _icoVoip() },
    'iot':            { label: 'IoT Device', icon: _icoIot() },
    'dns-server':     { label: 'DNS Server', icon: _icoDnsServer() },
    // Cloud
    'public-web':     { label: 'Public Web', icon: _icoPublicWeb() },
    'public-file':    { label: 'Public File', icon: _icoPublicFile() },
    'public-cloud':   { label: 'Public Cloud', icon: _icoPublicCloud() },
    'vpc':            { label: 'VPC', icon: _icoVpc() },
    'cloud-subnet':   { label: 'Cloud Subnet', icon: _icoCloudSubnet() },
    'igw':            { label: 'Internet Gateway', icon: _icoIgw() },
    'nat-gw':         { label: 'NAT Gateway', icon: _icoNatGw() },
    'tgw':            { label: 'Transit Gateway', icon: _icoTgw() },
    // Security
    'sase-edge':      { label: 'SASE Edge', icon: _icoSaseEdge() },
  };

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

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 7 v2 Polish: device 3D illustration overlays.
  // Each entry is an HTML string fragment rendered above the device's top face.
  // Filled in across batches 2A-2E.
  // ═══════════════════════════════════════════════════════════════════════════
  var _TB_V3_DEVICE_3D_ILLUSTRATIONS = {};

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

  // ── Phase 7 v2.1 §2 Batch 2B: Endpoint device illustrations ──
  _TB_V3_DEVICE_3D_ILLUSTRATIONS['pc'] =
    '<div class="illust-pc-tower"></div>' +
    '<div class="illust-led-row" style="left:50%;transform:translateX(-50%);bottom:6px;top:auto;"><span class="led"></span></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['laptop'] =
    '<div class="illust-laptop-screen"></div>' +
    '<div class="illust-laptop-base"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['server'] =
    '<div class="illust-rack-chassis">' +
      Array.from({ length: 4 }).map(function () { return '<span class="rack-unit"><span class="led"></span></span>'; }).join('') +
    '</div>' +
    '<div class="illust-badge illust-badge-srv">SRV</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['smartphone'] =
    '<div class="illust-phone-screen"></div>' +
    '<div class="illust-phone-speaker"></div>' +
    '<div class="illust-phone-home"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['smart-tv'] =
    '<div class="illust-tv-screen"></div>' +
    '<div class="illust-tv-stand"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['game-console'] =
    '<div class="illust-console-body"></div>' +
    '<div class="illust-controller-dpad"></div>' +
    '<div class="illust-controller-stick" style="left:36px;top:10px;"></div>' +
    '<div class="illust-controller-stick" style="left:46px;top:10px;"></div>' +
    '<div class="illust-controller-btn btn-a" style="right:14px;top:6px;"></div>' +
    '<div class="illust-controller-btn btn-b" style="right:8px;top:12px;"></div>' +
    '<div class="illust-controller-btn btn-x" style="right:20px;top:12px;"></div>' +
    '<div class="illust-controller-btn btn-y" style="right:14px;top:18px;"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['printer'] =
    '<div class="illust-printer-tray"></div>' +
    '<div class="illust-printer-slot"></div>' +
    '<div class="illust-led-row" style="left:auto;right:8px;top:26px;"><span class="led"></span></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['voip'] =
    '<div class="illust-voip-mouthpiece"></div>' +
    '<div class="illust-voip-base"></div>' +
    '<div class="illust-voip-keypad"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['iot'] =
    '<div class="illust-iot-radial"></div>' +
    '<div class="illust-iot-disc"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['dns-server'] =
    '<div class="illust-rack-chassis">' +
      Array.from({ length: 4 }).map(function () { return '<span class="rack-unit"><span class="led"></span></span>'; }).join('') +
    '</div>' +
    '<div class="illust-badge illust-badge-dns">DNS</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['wap'] =
    '<div class="illust-wap-dome"></div>' +
    '<div class="illust-wap-ring illust-wap-ring-1"></div>' +
    '<div class="illust-wap-ring illust-wap-ring-2"></div>' +
    '<div class="illust-wap-ring illust-wap-ring-3"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['wlc'] =
    '<div class="illust-rack-chassis">' +
      Array.from({ length: 4 }).map(function () { return '<span class="rack-unit"><span class="led"></span></span>'; }).join('') +
    '</div>' +
    '<div class="illust-wlc-radio"></div>' +
    '<div class="illust-badge illust-badge-wlc">WLC</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['firewall'] =
    '<div class="illust-fw-brick illust-fw-brick-row-1"></div>' +
    '<div class="illust-fw-brick illust-fw-brick-row-2"></div>' +
    '<div class="illust-fw-brick illust-fw-brick-row-3"></div>' +
    '<div class="illust-fw-flame"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['ids'] =
    '<div class="illust-shield illust-shield-ids"></div>' +
    '<div class="illust-scope-ring illust-scope-ring-outer"></div>' +
    '<div class="illust-scope-ring illust-scope-ring-inner"></div>' +
    '<div class="illust-scope-dot"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['vpg'] =
    '<div class="illust-vpg-tunnel"></div>' +
    '<div class="illust-vpg-lock"></div>' +
    '<div class="illust-vpg-lock-shackle"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['sase-edge'] =
    '<div class="illust-sase-cloud"></div>' +
    '<div class="illust-shield illust-shield-sase"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['cloud'] =
    '<div class="illust-cloud-base"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['internet'] =
    '<div class="illust-globe-orb"></div>' +
    '<div class="illust-globe-lat illust-globe-lat-1"></div>' +
    '<div class="illust-globe-lat illust-globe-lat-2"></div>' +
    '<div class="illust-globe-lat illust-globe-lat-3"></div>' +
    '<div class="illust-globe-lon illust-globe-lon-l"></div>' +
    '<div class="illust-globe-lon illust-globe-lon-r"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['load-balancer'] =
    '<div class="illust-lb-funnel"></div>' +
    '<div class="illust-lb-arrow illust-lb-arrow-1"></div>' +
    '<div class="illust-lb-arrow illust-lb-arrow-2"></div>' +
    '<div class="illust-lb-arrow illust-lb-arrow-3"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['public-web'] =
    '<div class="illust-pw-globe"></div>' +
    '<div class="illust-pw-page"></div>' +
    '<div class="illust-pw-page-line illust-pw-page-line-1"></div>' +
    '<div class="illust-pw-page-line illust-pw-page-line-2"></div>' +
    '<div class="illust-pw-page-line illust-pw-page-line-3"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['public-file'] =
    '<div class="illust-pf-cloud"></div>' +
    '<div class="illust-pf-doc illust-pf-doc-3"></div>' +
    '<div class="illust-pf-doc illust-pf-doc-2"></div>' +
    '<div class="illust-pf-doc illust-pf-doc-1"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['public-cloud'] =
    '<div class="illust-cloud-base illust-cloud-large"></div>' +
    '<div class="illust-pc-dot illust-pc-dot-1"></div>' +
    '<div class="illust-pc-dot illust-pc-dot-2"></div>' +
    '<div class="illust-pc-dot illust-pc-dot-3"></div>' +
    '<div class="illust-pc-dot illust-pc-dot-4"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['vpc'] =
    '<div class="illust-container illust-container-vpc"></div>' +
    '<div class="illust-badge illust-badge-vpc">VPC</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['cloud-subnet'] =
    '<div class="illust-container illust-container-subnet"></div>' +
    '<div class="illust-badge illust-badge-subnet">SUB</div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['igw'] =
    '<div class="illust-gw-arch"></div>' +
    '<div class="illust-gw-pillar illust-gw-pillar-l"></div>' +
    '<div class="illust-gw-pillar illust-gw-pillar-r"></div>' +
    '<div class="illust-gw-globe"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['nat-gw'] =
    '<div class="illust-gw-arch"></div>' +
    '<div class="illust-gw-pillar illust-gw-pillar-l"></div>' +
    '<div class="illust-gw-pillar illust-gw-pillar-r"></div>' +
    '<div class="illust-natgw-xlate"></div>';

  _TB_V3_DEVICE_3D_ILLUSTRATIONS['tgw'] =
    '<div class="illust-tgw-hub"></div>' +
    '<div class="illust-tgw-spoke illust-tgw-spoke-1"></div>' +
    '<div class="illust-tgw-spoke illust-tgw-spoke-2"></div>' +
    '<div class="illust-tgw-spoke illust-tgw-spoke-3"></div>' +
    '<div class="illust-tgw-spoke illust-tgw-spoke-4"></div>';

  var TB_V3_PALETTE_GROUPS = [
    { name: 'Routers',     items: ['router', 'l3-router', 'isp-router'] },
    { name: 'Switches',    items: ['switch', 'l3-switch', 'hub', 'dmz-switch', 'bridge'] },
    { name: 'Endpoints',   items: ['pc', 'laptop', 'server', 'smartphone', 'smart-tv', 'game-console', 'printer', 'voip', 'iot', 'dns-server'] },
    { name: 'Wireless',    items: ['wap', 'wlc'] },
    { name: 'Security',    items: ['firewall', 'ids', 'sase-edge'] },
    { name: 'Cloud & WAN', items: ['cloud', 'internet', 'mpls-core', 'vpg', 'load-balancer', 'onprem-dc'] },
    { name: 'Public Cloud', items: ['public-web', 'public-file', 'public-cloud', 'vpc', 'cloud-subnet', 'igw', 'nat-gw', 'tgw'] },
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
  // Stage 2 V1-parity icons
  function _icoDmzSwitch() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="9" width="18" height="6" rx="1"/><circle cx="7" cy="12" r=".8" fill="currentColor"/><circle cx="11" cy="12" r=".8" fill="currentColor"/><circle cx="15" cy="12" r=".8" fill="currentColor"/><path d="M3 6h18M3 18h18" stroke-dasharray="2 2"/></svg>'; }
  function _icoPrinter() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="14" width="12" height="7" rx="1"/><path d="M6 17H3V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8h-3"/><rect x="6" y="3" width="12" height="6" rx="1"/></svg>'; }
  function _icoVoip() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 4h4l1.5 3.5-2 1.5c1 2.5 3.5 5 6 6l1.5-2L21 14.5V19a1 1 0 0 1-1 1C8 20 4 10 4 5a1 1 0 0 1 1-1z"/></svg>'; }
  function _icoIot() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M5 12a7 7 0 0 1 7-7M5 12a7 7 0 0 0 7 7M19 12a7 7 0 0 1-7 7M19 12a7 7 0 0 0-7-7M3 12h2M19 12h2M12 3v2M12 19v2"/></svg>'; }
  function _icoPublicWeb() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>'; }
  function _icoPublicFile() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>'; }
  function _icoPublicCloud() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M17 18a4 4 0 1 0-3.5-6.5A5 5 0 0 0 4 13a3 3 0 0 0 3 5h10z"/><path d="M12 18v3M9 21h6"/></svg>'; }
  function _icoVpc() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>'; }
  function _icoCloudSubnet() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/><path d="M3 9h18M9 3v18"/></svg>'; }
  function _icoIgw() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M13 8l4 4-4 4"/></svg>'; }
  function _icoNatGw() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 12h10M14 9l3 3-3 3"/></svg>'; }
  function _icoTgw() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M3 12h5M16 12h5M6 6l3.5 4M18 6l-3.5 4M6 18l3.5-4M18 18l-3.5-4"/></svg>'; }
  function _icoOnpremDc() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="6" width="20" height="12" rx="1"/><rect x="5" y="9" width="5" height="3" rx="0.5"/><rect x="14" y="9" width="5" height="3" rx="0.5"/><path d="M5 15h2M9 15h2M13 15h2M17 15h2"/></svg>'; }
  function _icoSaseEdge() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l8 4v6c0 5-3.5 9-8 10C7.5 21 4 17 4 12V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>'; }
  function _icoDnsServer() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>'; }
  function _icoBridge() { return '<svg viewBox="0 0 24 24" class="tb3-palette-ico" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 17h18M6 17v-4a6 6 0 0 1 12 0v4M6 10v3M18 10v3M6 13h12"/></svg>'; }

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
      _autoFillIp(dev, state);
      state.devices.push(dev);
      state.selectedId = dev.id;
      _renderCanvas();
      _renderMinimap();
      _updateDeviceCount();
      _renderInspector();
      _saveState();
      _renderCompletionPill();
      draggedType = null;
    });

    // Drag a device that's ALREADY on the canvas to reposition
    var movingDev = null;
    var moveStartX = 0, moveStartY = 0;
    var moveDevStartX = 0, moveDevStartY = 0;

    canvas.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return; // left click only
      // Skip in cable mode — the cable handler owns clicks on devices.
      // _renderCanvas() detaches the click target on every mousedown,
      // which would break e.target.closest('.tb3-dev') in the cable handler.
      if (canvas.style.cursor === 'crosshair') return;
      // Skip in Simulate mode — Simulate owns clicks on devices (Phase 4)
      if (state.mode === 'simulate') return;
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
        _renderCompletionPill();
      }
    });
  }

  // ───────────────────────────────────────────────────────────
  // CABLES (TASK 4.x)
  // ───────────────────────────────────────────────────────────

  function _wireCableDrawing() {
    var canvas = document.getElementById('tb3-canvas-wrap');
    if (!canvas) return;

    var pendingFromId = null;

    // Toggle cable mode by clicking a device while no movement happened
    // Heuristic: a fast click (mousedown+mouseup within 200ms, no move) starts/completes a cable.
    // (The drag handler in Task 3.3 only fires moveDev if mouse moves >0px which is fine in practice.)

    // For simplicity Phase 1: dedicated keyboard shortcut "C" enters cable mode.
    // While in cable mode: first device click sets pendingFromId, second device click creates the cable.
    var cableMode = false;

    document.addEventListener('keydown', function (e) {
      if (e.key === 'c' || e.key === 'C') {
        if (!document.getElementById('page-topology-builder-v3').classList.contains('active')) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        cableMode = !cableMode;
        pendingFromId = null;
        canvas.style.cursor = cableMode ? 'crosshair' : '';
        _updateStatus('cable-mode', cableMode ? 'cable' : 'design');
      }
      if (e.key === 'Escape') {
        cableMode = false;
        pendingFromId = null;
        canvas.style.cursor = '';
        _updateStatus('cable-mode', 'design');
      }
    });

    canvas.addEventListener('click', function (e) {
      // Simulate mode owns clicks on devices — fill drill src/dst
      if (state.mode === 'simulate') {
        var g = e.target.closest('.tb3-dev');
        if (!g) return;
        var id = g.getAttribute('data-device-id');
        if (!id) return;
        if (!_simState.drillSrcId) {
          _simState.drillSrcId = id;
        } else if (!_simState.drillDstId) {
          _simState.drillDstId = id;
        } else {
          // both filled — replace dst only
          _simState.drillDstId = id;
        }
        _renderSimulatePanel();
        return;
      }
      if (!cableMode) return;
      var g = e.target.closest('.tb3-dev');
      if (!g) return;
      var id = g.getAttribute('data-device-id');
      if (!pendingFromId) {
        pendingFromId = id;
        _updateStatus('cable-pending', 'pending');
        return;
      }
      if (pendingFromId !== id) {
        var cbl = buildCable(pendingFromId, 0, id, 0);
        state.cables.push(cbl);
        _renderCanvas();
        _renderMinimap();
        _updateDeviceCount();
        _saveState();
        _renderCompletionPill();
      }
      pendingFromId = null;
      cableMode = false;
      canvas.style.cursor = '';
      _updateStatus('cable-done', 'design');
    });
  }

  function _updateStatus(reason, mode) {
    var el = document.getElementById('tb3-status-mode');
    if (!el) return;
    if (mode === 'cable') el.textContent = 'Cable mode · click two devices';
    else if (mode === 'pending') el.textContent = 'Cable mode · click second device';
    else el.textContent = 'Design';
  }

  function _renderCables() { /* TASK 4.2 */ }

  // ───────────────────────────────────────────────────────────
  // SELECTION + INSPECTOR (TASK 5.x)
  // ───────────────────────────────────────────────────────────

  function _selectDevice(id) {
    // Exit Simulate if active (single-track UX)
    var body = document.getElementById('tb3-body');
    if (body && body.classList.contains('simulate-open')) {
      _closeSimulate();
    }
    if (body && body.classList.contains('trace-open')) {
      _closeTrace();
    }
    if (body && body.classList.contains('osi-open')) {
      _closeOSI();
    }
    state.selectedId = id;
    _renderCanvas();
    _renderInspector();
    _updateSelectionChip();
  }

  function _updateSelectionChip() {
    var chip = document.getElementById('tb3-canvas-chip');
    if (!chip) return;
    if (!state.selectedId) {
      chip.classList.remove('visible');
      chip.innerHTML = '';
      return;
    }
    var dev = state.devices.find(function (d) { return d.id === state.selectedId; });
    if (!dev) {
      chip.classList.remove('visible');
      return;
    }
    chip.classList.add('visible');
    chip.innerHTML = '<span class="k">' + (dev.label || dev.id.slice(-4)) + '</span> · selected · <span style="color:var(--tb3-text-dim)">double-click to configure</span>';
  }

  function _deleteSelected() {
    if (!state.selectedId) return;
    state.devices = state.devices.filter(function (d) { return d.id !== state.selectedId; });
    state.cables = state.cables.filter(function (c) {
      return c.fromId !== state.selectedId && c.toId !== state.selectedId;
    });
    state.selectedId = null;
    _renderCanvas();
    _renderMinimap();
    _updateDeviceCount();
    _renderInspector();
    _updateSelectionChip();
    _saveState();
    _renderCompletionPill();
  }

  function _renderInspector() {
    var body = document.getElementById('tb3-body');
    var insp = document.getElementById('tb3-inspector');
    if (!body || !insp) return;

    if (!state.selectedId) {
      body.classList.remove('inspector-open');
      insp.innerHTML = '';
      return;
    }
    var dev = state.devices.find(function (d) { return d.id === state.selectedId; });
    if (!dev) {
      body.classList.remove('inspector-open');
      insp.innerHTML = '';
      return;
    }

    body.classList.add('inspector-open');
    var def = TB_V3_DEVICE_TYPES[dev.type] || { label: dev.type };

    // Build optional IP/Mask/Gateway block (Phase 3.1)
    var ENDPOINT_TYPES = ['pc','server','laptop','smartphone','cloud','internet','printer','voip','iot','dns-server'];
    var L3_MULTI_TYPES = ['router','l3-switch','firewall','vpn'];
    var L2_TYPES = ['switch','hub','wap','wlc'];

    var ipBlock = '';
    if (ENDPOINT_TYPES.indexOf(dev.type) !== -1) {
      var cfg = dev.config || {};
      var ipVal = _escAttr(cfg.ip || '');
      var maskVal = (typeof cfg.mask === 'number') ? cfg.mask : 24;
      var gwVal = _escAttr(cfg.gateway || '');
      ipBlock =
        '<div class="tb3-insp-section">' +
          '<div class="tb3-insp-section-h">L3 configuration</div>' +
          '<label class="tb3-insp-field">' +
            '<span class="tb3-insp-field-l">IP</span>' +
            '<input type="text" class="tb3-insp-input" id="tb3-insp-ip" data-device-id="' + _escAttr(dev.id) + '" value="' + ipVal + '" placeholder="192.168.10.10" />' +
          '</label>' +
          '<label class="tb3-insp-field">' +
            '<span class="tb3-insp-field-l">Mask</span>' +
            '<select class="tb3-insp-input" id="tb3-insp-mask" data-device-id="' + _escAttr(dev.id) + '">' +
              [8,16,24,25,26,27,28,29,30,32].map(function(m){
                return '<option value="' + m + '"' + (m === maskVal ? ' selected' : '') + '>/' + m + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
          '<label class="tb3-insp-field">' +
            '<span class="tb3-insp-field-l">Gateway</span>' +
            '<input type="text" class="tb3-insp-input" id="tb3-insp-gw" data-device-id="' + _escAttr(dev.id) + '" value="' + gwVal + '" placeholder="192.168.10.1" />' +
          '</label>' +
          '<div class="tb3-insp-caption" id="tb3-insp-cap" hidden></div>' +
        '</div>';
    } else if (L3_MULTI_TYPES.indexOf(dev.type) !== -1) {
      var ifaces = Array.isArray(dev.interfaces) ? dev.interfaces : [];
      var rows = ifaces.map(function (iface, idx) {
        var ipVal = _escAttr((iface && iface.ip) || '');
        var maskVal = (iface && typeof iface.mask === 'number') ? iface.mask : 24;
        return '<div class="tb3-insp-iface-row" data-iface-idx="' + idx + '">' +
          '<div class="tb3-insp-iface-label">if' + idx + '</div>' +
          '<input type="text" class="tb3-insp-input tb3-insp-iface-ip" data-iface-idx="' + idx + '" value="' + ipVal + '" placeholder="192.168.10.1" />' +
          '<select class="tb3-insp-input tb3-insp-iface-mask" data-iface-idx="' + idx + '">' +
            [8,16,24,25,26,27,28,29,30,32].map(function(m){
              return '<option value="' + m + '"' + (m === maskVal ? ' selected' : '') + '>/' + m + '</option>';
            }).join('') +
          '</select>' +
          '<button type="button" class="tb3-insp-iface-del" data-iface-idx="' + idx + '" aria-label="Remove interface">&times;</button>' +
          '</div>';
      }).join('');
      ipBlock =
        '<div class="tb3-insp-section">' +
          '<div class="tb3-insp-section-h">L3 interfaces</div>' +
          '<div id="tb3-insp-ifaces">' + rows + '</div>' +
          '<button type="button" class="tb3-insp-iface-add" id="tb3-insp-iface-add">+ Interface</button>' +
        '</div>';
    } else if (L2_TYPES.indexOf(dev.type) !== -1) {
      ipBlock =
        '<div class="tb3-insp-section">' +
          '<div class="tb3-insp-caption tb3-insp-caption-l2">Layer-2 device — no IP configuration.</div>' +
        '</div>';
    }

    insp.innerHTML =
      '<div style="display:flex;flex-direction:column;gap:14px">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">' +
          '<div>' +
            '<div style="font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--tb3-text-dim);margin-bottom:6px">Inspector</div>' +
            '<h3 style="font-family:Fraunces,Georgia,serif;font-weight:600;font-size:18px;letter-spacing:-.01em;margin:0;color:var(--tb3-text);text-transform:none">' + def.label + '</h3>' +
          '</div>' +
          '<button type="button" id="tb3-insp-close" aria-label="Close Inspector" style="background:transparent;border:0;color:var(--tb3-text-dim);font-size:22px;line-height:1;padding:4px 8px;cursor:pointer;margin:-4px -4px 0 0">&times;</button>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
          '<label style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--tb3-text-dim)">Label</label>' +
          '<input type="text" id="tb3-insp-label" value="' + _escAttr(dev.label || '') + '" style="background:var(--tb3-surface);border:1px solid var(--tb3-border);border-radius:6px;padding:8px 10px;color:var(--tb3-text);font-size:13px;font-family:Inter">' +
        '</div>' +
        ipBlock +
        '<div style="font-size:11px;color:var(--tb3-text-dim);font-family:ui-monospace,Menlo,monospace">id: ' + dev.id + '</div>' +
        '<div style="font-size:11px;color:var(--tb3-text-dim);font-family:ui-monospace,Menlo,monospace">position: ' + dev.x + ', ' + dev.y + '</div>' +
      '</div>';

    // Wire the label edit
    var labelInput = document.getElementById('tb3-insp-label');
    if (labelInput) {
      labelInput.addEventListener('input', function () {
        dev.label = labelInput.value;
        _renderCanvas();
        _saveState();
        _renderCompletionPill();
      });
    }

    var closeBtn = document.getElementById('tb3-insp-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        state.selectedId = null;
        _renderCanvas();
        _renderInspector();
        _updateSelectionChip();
      });
    }

    // Wire IP/Mask/Gateway blur+change handlers (Phase 3.1)
    var ipInput = document.getElementById('tb3-insp-ip');
    var maskSelect = document.getElementById('tb3-insp-mask');
    var gwInput = document.getElementById('tb3-insp-gw');
    var cap = document.getElementById('tb3-insp-cap');

    function applyIpCommit() {
      var ipRaw = ipInput ? ipInput.value.trim() : '';
      var maskRaw = maskSelect ? parseInt(maskSelect.value, 10) : NaN;
      var gwRaw = gwInput ? gwInput.value.trim() : '';
      var errors = [];
      if (ipRaw && !parseCidr(ipRaw + '/32')) {
        errors.push('IP must be a dotted-quad like 192.168.10.10.');
        if (ipInput) ipInput.classList.add('is-invalid');
      } else if (ipInput) {
        ipInput.classList.remove('is-invalid');
      }
      if (gwRaw && !parseCidr(gwRaw + '/32')) {
        errors.push('Gateway must be a dotted-quad.');
        if (gwInput) gwInput.classList.add('is-invalid');
      } else if (gwInput) {
        gwInput.classList.remove('is-invalid');
      }
      if (errors.length) {
        if (cap) {
          cap.hidden = false;
          cap.classList.add('is-error');
          cap.textContent = errors.join(' ');
        }
        return;
      }
      if (cap) { cap.hidden = true; cap.classList.remove('is-error'); cap.textContent = ''; }
      dev.config = dev.config || {};
      if (ipRaw) dev.config.ip = ipRaw; else delete dev.config.ip;
      if (typeof maskRaw === 'number' && !isNaN(maskRaw)) dev.config.mask = maskRaw;
      if (gwRaw) dev.config.gateway = gwRaw; else delete dev.config.gateway;
      _saveState();
      _renderCompletionPill();
    }

    [ipInput, maskSelect, gwInput].forEach(function (el) {
      if (!el) return;
      el.addEventListener('blur', applyIpCommit);
      el.addEventListener('change', applyIpCommit);
    });

    // Wire L3 multi-interface handlers (Task 3.2)
    var addBtn = document.getElementById('tb3-insp-iface-add');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        dev.interfaces = dev.interfaces || [];
        dev.interfaces.push({ ip: '', mask: 24 });
        _renderInspector();
        _saveState();
        _renderCompletionPill();
      });
    }
    document.querySelectorAll('.tb3-insp-iface-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-iface-idx'), 10);
        if (dev.interfaces && idx >= 0 && idx < dev.interfaces.length) {
          dev.interfaces.splice(idx, 1);
          _renderInspector();
          _saveState();
          _renderCompletionPill();
        }
      });
    });
    document.querySelectorAll('.tb3-insp-iface-ip').forEach(function (input) {
      input.addEventListener('blur', function () {
        var idx = parseInt(input.getAttribute('data-iface-idx'), 10);
        var v = input.value.trim();
        if (v && !parseCidr(v + '/32')) {
          input.classList.add('is-invalid');
          return;
        }
        input.classList.remove('is-invalid');
        dev.interfaces = dev.interfaces || [];
        dev.interfaces[idx] = dev.interfaces[idx] || { ip: '', mask: 24 };
        dev.interfaces[idx].ip = v;
        _saveState();
        _renderCompletionPill();
      });
    });
    document.querySelectorAll('.tb3-insp-iface-mask').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var idx = parseInt(sel.getAttribute('data-iface-idx'), 10);
        dev.interfaces = dev.interfaces || [];
        dev.interfaces[idx] = dev.interfaces[idx] || { ip: '', mask: 24 };
        dev.interfaces[idx].mask = parseInt(sel.value, 10);
        _saveState();
        _renderCompletionPill();
      });
    });
  }

  function _escAttr(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }

  // ───────────────────────────────────────────────────────────
  // COMPLETION PILL (Task 6.1 — phase 2)
  // ───────────────────────────────────────────────────────────

  function _renderCompletionPill() {
    var pill = document.getElementById('tb3-completion-pill');
    if (!pill) return;

    if (state.intent !== 'lab' || !state.activeScenarioId) {
      pill.hidden = true;
      pill.classList.remove('on');
      pill.textContent = '';
      return;
    }

    var scen = TB_V3_SCENARIOS.find(function (s) { return s.id === state.activeScenarioId; });
    if (!scen || !scen.completion) { pill.hidden = true; return; }

    var res = checkCompletion(state, scen.completion);
    pill.hidden = false;
    if (res.complete) {
      pill.classList.add('on');
      pill.textContent = 'Goals met';
    } else {
      pill.classList.remove('on');
      var missing = (res.missingDevices.length + res.deviceCountMismatch.length + res.missingCables.length + (res.reachabilityFailures || []).length);
      pill.textContent = missing + ' to go';
    }
    pill.onclick = function () {
      if (state.intent === 'lab' && state.activeScenarioId) {
        _openDiagnostic();
      }
    };
    pill.style.cursor = 'pointer';
    // If drawer is already open, refresh its contents
    var body = document.getElementById('tb3-body');
    if (body && body.classList.contains('diagnostic-open')) {
      _renderDiagnosticDrawer();
    }
  }

  // ───────────────────────────────────────────────────────────
  // SCENARIOS PICKER PANEL (phase 2)
  //
  // 320px right-anchored slide-out, same mechanism as the Inspector.
  // The body re-grids when '.tb3-body.picker-open' is added (rrail hides,
  // picker takes the column). Scenarios grouped by spec §9 category.
  // ───────────────────────────────────────────────────────────

  var TB_V3_CATEGORY_LABELS = {
    topology:     'Topology types',
    architecture: 'Architectures',
    wan:          'WAN',
    cloud:        'Cloud',
    wireless:     'Wireless',
    security:     'Security',
    vlan:         'VLAN / routing',
  };

  function _renderPickerPanel() {
    var body = document.getElementById('tb3-body');
    var panel = document.getElementById('tb3-picker');
    if (!body || !panel) return;

    // Group scenarios by category, preserve declaration order within each group.
    var grouped = {};
    TB_V3_SCENARIOS.forEach(function (s) {
      (grouped[s.category] = grouped[s.category] || []).push(s);
    });

    var html =
      '<div style="display:flex;flex-direction:column;gap:14px;height:100%">' +
        '<div style="display:flex;align-items:baseline;justify-content:space-between">' +
          '<div>' +
            '<div style="font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--tb3-text-dim);margin-bottom:6px">Scenarios</div>' +
            '<h3 style="font-family:Fraunces,Georgia,serif;font-weight:600;font-size:18px;letter-spacing:-.01em;margin:0;color:var(--tb3-text);text-transform:none">Pick a lab</h3>' +
          '</div>' +
          '<button type="button" id="tb3-picker-close" aria-label="Close" style="background:transparent;border:0;color:var(--tb3-text-dim);font-size:18px;cursor:pointer;padding:4px 8px">&times;</button>' +
        '</div>' +
        '<div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:18px" id="tb3-picker-list">';

    Object.keys(TB_V3_CATEGORY_LABELS).forEach(function (cat) {
      var rows = grouped[cat];
      if (!rows || !rows.length) return;
      html += '<div class="tb3-picker-grp">';
      html += '<div class="tb3-picker-grp-h">' + TB_V3_CATEGORY_LABELS[cat] + '</div>';
      rows.forEach(function (s) {
        var active = (state.intent === 'lab' && state.activeScenarioId === s.id);
        html += '<div class="tb3-picker-row' + (active ? ' on' : '') + '" data-scenario-id="' + _escAttr(s.id) + '" role="button" tabindex="0">';
        html += '<div class="tb3-picker-row-t">' + _escAttr(s.title) + '</div>';
        html += '<div class="tb3-picker-row-m">' + s.objectiveRefs.map(_escAttr).join(' &middot; ') + '</div>';
        html += '</div>';
      });
      html += '</div>';
    });

    html += '</div></div>';
    panel.innerHTML = html;
  }

  function _openPicker() {
    var body = document.getElementById('tb3-body');
    if (!body) return;
    // Exit Simulate if active (single-track UX)
    if (body.classList.contains('simulate-open')) {
      _closeSimulate();
    }
    if (body.classList.contains('trace-open')) _closeTrace();
    if (body.classList.contains('osi-open')) {
      _closeOSI();
    }
    // Mutually exclusive with Inspector (only one rail panel at a time).
    body.classList.remove('inspector-open');
    body.classList.add('picker-open');
    _renderPickerPanel();
  }

  function _closePicker() {
    var body = document.getElementById('tb3-body');
    if (!body) return;
    body.classList.remove('picker-open');
  }

  function _wirePicker() {
    var btn = document.getElementById('tb3-rrail-scenarios');
    if (btn) btn.addEventListener('click', _openPicker);

    // Picker delegated handlers — close + row click + Enter on focused row.
    var panel = document.getElementById('tb3-picker');
    if (panel) {
      panel.addEventListener('click', function (e) {
        if (e.target.id === 'tb3-picker-close') { _closePicker(); return; }
        var row = e.target.closest('.tb3-picker-row');
        if (row) { _onPickerRowActivate(row.getAttribute('data-scenario-id')); }
      });
      panel.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('tb3-picker-row')) {
          e.preventDefault();
          _onPickerRowActivate(e.target.getAttribute('data-scenario-id'));
        }
      });
    }
  }

  // Stub for Stage 3 — row click handler.
  function _onPickerRowActivate(scenarioId) {
    var scenario = TB_V3_SCENARIOS.find(function (s) { return s.id === scenarioId; });
    if (!scenario) return;

    var hasContent = state.devices.length > 0 || state.cables.length > 0;
    var inFreeBuild = state.intent === 'free-build';

    if (hasContent && inFreeBuild) {
      // Confirm-then-backup-then-load. Uses confirm() for Phase 2; a custom
      // modal can replace this in Phase 2.x — keeping the surface minimal here.
      var ok = window.confirm('Load "' + scenario.title + '"? Your current Free Build canvas will be saved and you can restore it later via the intent chip.');
      if (!ok) return;
      backupFreeBuild(state);
    } else if (hasContent && state.intent === 'lab') {
      // Switching from one lab to another — no backup needed (the old lab is
      // recoverable from the scenario itself).
      var ok2 = window.confirm('Switch to "' + scenario.title + '"? The current lab will be discarded.');
      if (!ok2) return;
    }

    state = loadScenarioOnCanvas(state, scenario);
    _renderCanvas();
    _renderMinimap();
    _updateDeviceCount();
    _renderInspector();
    _renderModeBar();
    _renderIntentChip();
    _renderPickerPanel();
    _renderCompletionPill();
    _saveState();
    // Auto-close the picker after a successful load so the completion pill
    // (and the rrail in general) is immediately visible. Cancel paths
    // (early-return on user-declined confirm) leave the picker open so the
    // user can pick a different scenario without re-opening it.
    _closePicker();
  }

  // ───────────────────────────────────────────────────────────
  // DIAGNOSTIC DRAWER (Phase 3 — surfaces reachability failures)
  // 320px right-anchored slide-out, mutual-exclusion with picker/Inspector.
  // ───────────────────────────────────────────────────────────

  var REACH_REASON_TEMPLATES = {
    'no-ip':             function (ctx) { return ctx.failedLabel + ' has no IP. Set one in the Inspector.'; },
    'no-gateway':        function (ctx) { return ctx.failedLabel + ' has no default gateway.'; },
    'no-route':          function (ctx) { return ctx.failedLabel + ' has no route to ' + ctx.dstCidr + '.'; },
    'no-cable-path':     function (ctx) { return 'No cable path reaches ' + ctx.dstLabel + ' from ' + ctx.srcLabel + '.'; },
    'no-router-between': function (ctx) { return ctx.srcLabel + ' IP ' + ctx.srcCidr + ' is on a different subnet from ' + ctx.dstLabel + ' (' + ctx.dstCidr + '). No router between them.'; },
  };

  function _labelOf(deviceId) {
    var d = (state.devices || []).find(function (x) { return x.id === deviceId; });
    return d ? (d.label || d.id) : deviceId;
  }
  function _cidrOf(deviceId) {
    var d = (state.devices || []).find(function (x) { return x.id === deviceId; });
    if (!d) return '(none)';
    if (Array.isArray(d.interfaces) && d.interfaces[0]) return d.interfaces[0].ip + '/' + d.interfaces[0].mask;
    if (d.config && d.config.ip) return d.config.ip + '/' + (d.config.mask || 24);
    return '(none)';
  }

  function _failDevice(devId, reasonText) {
    var devEl = document.querySelector('.tb3-dev[data-device-id="' + devId + '"]');
    if (!devEl) return;
    if (_reducedMotion()) {
      devEl.style.filter = 'drop-shadow(0 0 6px var(--tb3-pkt-failure))';
      setTimeout(function () { devEl.style.filter = ''; }, 1500);
      return;
    }
    // Shake
    devEl.classList.add('tb3-dev-failing');
    setTimeout(function () { devEl.classList.remove('tb3-dev-failing'); }, 200);
    // Glow
    devEl.style.filter = 'drop-shadow(0 0 10px var(--tb3-pkt-failure))';
    setTimeout(function () {
      devEl.style.transition = 'filter 1.2s ease-out';
      devEl.style.filter = '';
      setTimeout(function () { devEl.style.transition = ''; }, 1200);
    }, 400);
  }

  function _reachReasonText(failedAt, reason, srcId, dstId) {
    if (typeof REACH_REASON_TEMPLATES !== 'undefined' && REACH_REASON_TEMPLATES[reason]) {
      var ctx = {
        srcLabel: _labelOf(srcId),
        dstLabel: _labelOf(dstId),
        failedLabel: _labelOf(failedAt),
        srcCidr: _cidrOf(srcId),
        dstCidr: _cidrOf(dstId),
      };
      var tpl = REACH_REASON_TEMPLATES[reason];
      if (typeof tpl === 'function') {
        return tpl(ctx);
      }
      if (typeof tpl === 'string') {
        return tpl.replace(/%(\w+)/g, function (_, k) { return ctx[k] != null ? ctx[k] : ''; });
      }
    }
    return 'Path failed at ' + failedAt + ': ' + reason;
  }

  function _renderDiagnosticDrawer() {
    var panel = document.getElementById('tb3-diagnostic');
    if (!panel) return;
    var scen = TB_V3_SCENARIOS.find(function (s) { return s.id === state.activeScenarioId; });
    var completion = scen && scen.completion;
    if (!completion) { panel.innerHTML = ''; return; }
    var result = checkCompletion(state, completion);
    var failures = result.reachabilityFailures || [];
    var bodyHtml;
    if (failures.length === 0 && result.complete) {
      bodyHtml =
        '<div class="tb3-diagnostic-empty">' +
          '<div class="tb3-diagnostic-empty-l">' +
            '<div class="tb3-diagnostic-empty-eyebrow">All paths reachable</div>' +
            '<div class="tb3-diagnostic-empty-t">Every required cable type-pair has a working route.</div>' +
            '<div class="tb3-diagnostic-empty-s">The pill flips back to N TO GO if a path breaks as you edit.</div>' +
          '</div>' +
        '</div>';
    } else {
      var rows = failures.map(function (f) {
        var template = REACH_REASON_TEMPLATES[f.reason] || function () { return 'Path failed: ' + f.reason; };
        var ctx = {
          srcLabel: _labelOf(f.from),
          dstLabel: _labelOf(f.to),
          failedLabel: _labelOf(f.failedAt),
          srcCidr: _cidrOf(f.from),
          dstCidr: _cidrOf(f.to),
        };
        return '<button type="button" class="tb3-diagnostic-row" data-device-id="' + _escAttr(f.failedAt) + '">' +
          '<div class="tb3-diagnostic-row-t">' + _escAttr(_labelOf(f.from)) + ' &rarr; ' + _escAttr(_labelOf(f.to)) + '</div>' +
          '<div class="tb3-diagnostic-row-r">' + _escAttr(template(ctx)) + '</div>' +
          '</button>';
      }).join('');
      bodyHtml = '<div class="tb3-diagnostic-list" id="tb3-diagnostic-list">' + rows + '</div>';
    }
    panel.innerHTML =
      '<div class="tb3-diagnostic-head">' +
        '<div>' +
          '<div class="tb3-diagnostic-eyebrow">Diagnostics</div>' +
          '<h2 class="tb3-diagnostic-title" id="tb3-diagnostic-title">' + (failures.length ? "Why goals aren't met" : 'Goals met') + '</h2>' +
        '</div>' +
        '<button type="button" id="tb3-diagnostic-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="tb3-diagnostic-rule"></div>' +
      bodyHtml +
      '<div class="tb3-diagnostic-foot">Updated live as you edit</div>';
  }

  function _openDiagnostic() {
    var body = document.getElementById('tb3-body');
    if (!body) return;
    // Exit Simulate if active (single-track UX)
    if (body.classList.contains('simulate-open')) {
      _closeSimulate();
    }
    if (body.classList.contains('trace-open')) _closeTrace();
    if (body.classList.contains('osi-open')) {
      _closeOSI();
    }
    body.classList.remove('picker-open');
    body.classList.remove('inspector-open');
    body.classList.add('diagnostic-open');
    _renderDiagnosticDrawer();
  }

  function _closeDiagnostic() {
    var body = document.getElementById('tb3-body');
    if (!body) return;
    body.classList.remove('diagnostic-open');
  }

  function _wireDiagnosticDrawer() {
    var panel = document.getElementById('tb3-diagnostic');
    if (!panel) return;
    panel.addEventListener('click', function (e) {
      if (e.target.id === 'tb3-diagnostic-close') { _closeDiagnostic(); return; }
      var row = e.target.closest('.tb3-diagnostic-row');
      if (row) {
        var devId = row.getAttribute('data-device-id');
        _closeDiagnostic();
        if (typeof _selectDevice === 'function') _selectDevice(devId);
      }
    });
  }

  // ───────────────────────────────────────────────────────────
  // SIMULATE PANEL (Phase 4 — open/close + render stubs)
  // ───────────────────────────────────────────────────────────

  function _openSimulate() {
    var body = document.getElementById('tb3-body');
    if (!body) return;
    // Close any other rail panel (single mutual-exclusion family).
    // _closeTrace() runs the full Phase 5 teardown (RAF cancel, packet
    // despawn, state reset) — must call it rather than just toggling
    // the class, matching the _openPicker pattern (Stage 12 §4.3).
    body.classList.remove('picker-open');
    body.classList.remove('inspector-open');
    body.classList.remove('diagnostic-open');
    if (body.classList.contains('trace-open')) _closeTrace();
    if (body.classList.contains('osi-open')) {
      _closeOSI();
    }
    body.classList.add('simulate-open');
    state.mode = 'simulate';
    _renderSimulatePanel();
    _renderModeBar();
  }

  function _closeSimulate() {
    var body = document.getElementById('tb3-body');
    if (!body) return;
    body.classList.remove('simulate-open');
    // Cancel any in-flight + drain queue + clear log
    if (_simState.currentPacket) {
      cancelAnimationFrame(_simState.currentPacket);
      _simState.currentPacket = null;
    }
    _simState.previewQueue = [];
    _simState.playing = false;
    _simState.log = [];
    _simState.drillSrcId = null;
    _simState.drillDstId = null;
    state.mode = 'design';
    _renderModeBar();
  }

  // ───────────────────────────────────────────────────────────
  // TRACE PANEL (Phase 5 — open/close + render stub)
  // ───────────────────────────────────────────────────────────

  function _openTrace(payload) {
    var body = document.getElementById('tb3-body');
    if (!body) return;
    // Close any other rail panel (single mutual-exclusion family — Phase 4 pattern)
    body.classList.remove('picker-open');
    body.classList.remove('inspector-open');
    body.classList.remove('diagnostic-open');
    body.classList.remove('simulate-open');
    body.classList.add('trace-open');
    state.mode = 'trace';
    _initTraceState(payload || null);
    _renderTracePanel();
    _renderModeBar();
  }

  function _closeTrace() {
    var body = document.getElementById('tb3-body');
    if (!body) return;
    body.classList.remove('trace-open');
    _resetTraceState();
    state.mode = 'design';
    _renderModeBar();
  }

  function _openOSI(payload) {
    // OSI is a view-toggle on Trace per spec §3.1.
    // If already in trace/osi mode, preserve _traceState (mid-trace toggle must
    // not re-init the state and destroy currentHopIdx/hops/etc).
    // If entering fresh, run the full _openTrace path (cross-rail sweep + init).
    var body = document.getElementById('tb3-body');
    if (!body) return;
    var alreadyInTrace = (state.mode === 'trace' || state.mode === 'osi');
    if (!alreadyInTrace) {
      _openTrace(payload || null);   // cross-rail sweep + _initTraceState + panel
    }
    state.mode = 'osi';
    body.classList.add('osi-open');
    _renderTracePanel();   // re-render so dispatch picks _renderOSIPanel (Stage 5)
    _renderModeBar();      // repaint so OSI pill highlights, Trace pill un-highlights
  }

  function _closeOSI() {
    var body = document.getElementById('tb3-body');
    if (body) body.classList.remove('osi-open');
    _closeTrace();   // shares teardown — clears _traceState + removes trace-open class
  }

  // ===========================================================================
  // Phase 7 v2: _open3DPopup / _close3DPopup — 3D popup lifecycle
  // 3D popup is a transient modal (NOT a mode). Does NOT modify state.mode.
  // Spec: docs/superpowers/specs/2026-05-24-tb-v3-phase7-3d-popup-design.md §4
  // ===========================================================================
  function _apply3DCamera() {
    var stage = document.getElementById('tb3-3d-popup-stage');
    if (!stage) return;
    stage.style.transform =
      'rotateX(' + _3dPopup.camera.rotX + 'deg) ' +
      'rotateY(' + _3dPopup.camera.rotY + 'deg) ' +
      'scale(' + _3dPopup.camera.zoom + ')';

    // Stage 3: counter-rotate labels so they stay camera-facing
    var labels = stage.querySelectorAll('.tb3-3d-dev-label-below');
    var counterTransform = 'translateX(-50%) rotateX(' + (-_3dPopup.camera.rotX) + 'deg) rotateY(' + (-_3dPopup.camera.rotY) + 'deg)';
    for (var i = 0; i < labels.length; i++) {
      labels[i].style.transform = counterTransform;
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 7 v2 §3: Extruded device cards
  // ---------------------------------------------------------------------------

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 7 v2 Polish: scene centroid helper.
  // Returns {cx, cy} = arithmetic mean of all device positions, so the
  // topology can be translated to center around the stage origin (viewport
  // 50/50). Returns {0,0} for empty topologies.
  // ═══════════════════════════════════════════════════════════════════════════
  function _computeSceneCentroid(devices) {
    if (!Array.isArray(devices) || devices.length === 0) return { cx: 0, cy: 0 };
    var sumX = 0, sumY = 0;
    for (var i = 0; i < devices.length; i++) {
      sumX += (typeof devices[i].x === 'number' ? devices[i].x : 0);
      sumY += (typeof devices[i].y === 'number' ? devices[i].y : 0);
    }
    return { cx: sumX / devices.length, cy: sumY / devices.length };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 7 v2 Stage 6: Fit-to-view — auto-computes optimal zoom so all devices
  // are visible, then tweens camera to that zoom over 400ms (ease-out cubic).
  // Cancel-on-new-call discipline: always cancels any in-flight rAF first.
  // ═══════════════════════════════════════════════════════════════════════════
  function _fitCameraToDevices(devices) {
    if (!Array.isArray(devices) || devices.length === 0) return;
    // Compute bounding box of device positions (canvas coords)
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < devices.length; i++) {
      var dx = typeof devices[i].x === 'number' ? devices[i].x : 0;
      var dy = typeof devices[i].y === 'number' ? devices[i].y : 0;
      if (dx < minX) minX = dx;
      if (dx > maxX) maxX = dx;
      if (dy < minY) minY = dy;
      if (dy > maxY) maxY = dy;
    }
    var spanX = (maxX - minX) || 1;
    var spanY = (maxY - minY) || 1;
    // Fit zoom so the largest axis fills ~70% of the viewport (conservative margin)
    var viewport = document.getElementById('tb3-3d-popup-viewport');
    var vpW = viewport ? viewport.offsetWidth : 900;
    var vpH = viewport ? viewport.offsetHeight : 600;
    // Approximate device footprint in stage px (each device is 80px wide)
    var DEVICE_PX = 80;
    var stageSpanX = spanX * 0.15 + DEVICE_PX; // 0.15 = canvas→stage scale approx
    var stageSpanY = spanY * 0.10 + DEVICE_PX;
    var fitZoom = Math.min((vpW * 0.7) / stageSpanX, (vpH * 0.7) / stageSpanY, 2.0);
    fitZoom = Math.max(fitZoom, 0.5);
    // Tween to fitZoom keeping rotX/rotY unchanged
    var startZoom = _3dPopup.camera.zoom;
    var targetZoom = fitZoom;
    if (_3dPopup.rafHandle) {
      cancelAnimationFrame(_3dPopup.rafHandle);
      _3dPopup.rafHandle = null;
    }
    if (_3dPopupReducedMotion()) {
      _3dPopup.camera.zoom = targetZoom;
      _apply3DCamera();
      return;
    }
    var startTs = null;
    var durationMs = 400;
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
        _3dPopup.camera.zoom = targetZoom;
        _apply3DCamera();
        _3dPopup.rafHandle = null;
      }
    }
    _3dPopup.rafHandle = requestAnimationFrame(tick);
  }

  function _build3DDeviceEl(dev, sceneCx, sceneCy) {
    sceneCx = sceneCx || 0;
    sceneCy = sceneCy || 0;
    var iconHtml = (TB_V3_DEVICE_TYPES && TB_V3_DEVICE_TYPES[dev.type] && TB_V3_DEVICE_TYPES[dev.type].icon)
      ? TB_V3_DEVICE_TYPES[dev.type].icon
      : '';
    var labelHtml = '<span class="tb3-3d-dev-label">' + _escAttr(dev.label || dev.hostname || dev.type) + '</span>';
    var family = _TB_V3_DEVICE_FAMILY[dev.type] || 'network';
    var illust = (_TB_V3_DEVICE_3D_ILLUSTRATIONS && _TB_V3_DEVICE_3D_ILLUSTRATIONS[dev.type]) ? _TB_V3_DEVICE_3D_ILLUSTRATIONS[dev.type] : '';
    // Stage 3: label below the device card (hostname + IP, counter-rotated by _apply3DCamera)
    var labelName = _escAttr(dev.label || dev.hostname || dev.type);
    var labelIp = dev.config && dev.config.ip ? _escAttr(dev.config.ip) : '';
    var labelBelowHtml =
      '<div class="tb3-3d-dev-label-below">' +
        '<span class="tb3-3d-dev-name">' + labelName + '</span>' +
        (labelIp ? '<span class="tb3-3d-dev-ip">' + labelIp + '</span>' : '') +
      '</div>';
    var el = document.createElement('div');
    el.className = 'tb3-3d-dev';
    el.setAttribute('data-device-id', _escAttr(dev.id));
    el.setAttribute('data-family', family);
    // Position card in 3D space using centroid-relative coords so the topology
    // is centered around the stage origin (viewport 50/50) regardless of its
    // raw canvas-coordinate range. Stage 4 centroid offset fix.
    var x = (typeof dev.x === 'number' ? dev.x : 0) - sceneCx;   // NEW: centroid-relative
    var y = (typeof dev.y === 'number' ? dev.y : 0) - sceneCy;
    el.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
    el.innerHTML =
      '<div class="tb3-3d-dev-top">' + iconHtml + labelHtml + '</div>' +
      '<div class="tb3-3d-dev-bottom"></div>' +
      '<div class="tb3-3d-dev-side-n"></div>' +
      '<div class="tb3-3d-dev-side-s"></div>' +
      '<div class="tb3-3d-dev-side-e"></div>' +
      '<div class="tb3-3d-dev-side-w"></div>' +
      '<div class="tb3-3d-dev-illust">' + illust + '</div>' +
      '<div class="tb3-3d-dev-accent-stripe"></div>' +
      labelBelowHtml;
    return el;
  }

  function _findDeviceById(id) {
    for (var i = 0; i < state.devices.length; i++) {
      if (state.devices[i].id === id) return state.devices[i];
    }
    return null;
  }

  function _build3DCableEl(cab, fromDev, toDev, sceneCx, sceneCy) {
    sceneCx = sceneCx || 0;
    sceneCy = sceneCy || 0;
    // Cable anchors: bottom-edge midpoint of each device card (44px from left, 60px from top).
    // Subtract centroid from each endpoint so cable bezier uses the same shifted coords
    // as the device transforms (Stage 4 centroid offset fix).
    var x1 = ((fromDev.x || 0) - sceneCx) + 44;
    var y1 = ((fromDev.y || 0) - sceneCy) + 60;
    var x2 = ((toDev.x || 0) - sceneCx) + 44;
    var y2 = ((toDev.y || 0) - sceneCy) + 60;

    // Bezier control points: midpoint X with a slight Y offset for a natural sag.
    // ui-ux-pro-max recommendation: cap sag at 70px so long cables don't droop excessively
    // (real Cat6 in a stylized 3D scene reads best around 30-60px sag).
    var midX = (x1 + x2) / 2;
    var sagY = Math.min(70, Math.max(20, Math.abs(x2 - x1) * 0.12));
    var cy1 = y1 + sagY;
    var cy2 = y2 + sagY;

    // Bounding box for the SVG container
    var minX = Math.min(x1, x2) - 20;
    var minY = Math.min(y1, y2) - 4;
    var maxX = Math.max(x1, x2) + 20;
    var maxY = Math.max(y1, y2) + sagY + 8;
    var w = maxX - minX;
    var h = maxY - minY;

    var px1 = x1 - minX, py1 = y1 - minY;
    var px2 = x2 - minX, py2 = y2 - minY;
    var pcy1 = cy1 - minY;
    var pcy2 = cy2 - minY;
    var cpX = midX - minX;

    var pathStr = 'M' + px1 + ',' + py1 +
                  ' C' + cpX + ',' + pcy1 + ' ' +
                         cpX + ',' + pcy2 + ' ' +
                         px2 + ',' + py2;

    var gradId = 'tb3-cable-grad-' + cab.id;
    var svgNs = 'http://www.w3.org/2000/svg';

    var svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('class', 'tb3-3d-cable');
    svg.setAttribute('data-cable-id', cab.id);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.style.position = 'absolute';
    svg.style.left = minX + 'px';
    svg.style.top = minY + 'px';
    svg.style.transform = 'translateZ(0)';
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';

    var defs = document.createElementNS(svgNs, 'defs');
    var grad = document.createElementNS(svgNs, 'linearGradient');
    grad.setAttribute('id', gradId);
    grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
    // ui-ux-pro-max recommendation: soften edge darken from 30% black to 18% — keeps the
    // cable feeling like metal rather than licorice. Stripe/Vercel use ~15-22% darken.
    var stop1 = document.createElementNS(svgNs, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 82%, black 18%)');
    var stop2 = document.createElementNS(svgNs, 'stop');
    stop2.setAttribute('offset', '50%');
    stop2.setAttribute('stop-color', 'var(--tb3-bronze, #8b5a3c)');
    var stop3 = document.createElementNS(svgNs, 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('stop-color', 'color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 82%, black 18%)');
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    grad.appendChild(stop3);
    defs.appendChild(grad);
    svg.appendChild(defs);

    var path = document.createElementNS(svgNs, 'path');
    path.setAttribute('d', pathStr);
    path.setAttribute('stroke', 'url(#' + gradId + ')');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);

    return svg;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 7 v2 Polish Stage 5: ambient packet motion per cable.
  // 3 staggered bronze packets traverse the cable's bezier path continuously.
  // emil-tuned: 2.6s duration, LINEAR easing (continuous-flow rhythm), 0.867s
  // stagger, dim drop-shadow glow. Reduced-motion gate hides them entirely.
  // ═══════════════════════════════════════════════════════════════════════════
  function _buildAmbientPacketEl(cab, fromDev, toDev, sceneCx, sceneCy) {
    sceneCx = sceneCx || 0;
    sceneCy = sceneCy || 0;
    var svgNs = 'http://www.w3.org/2000/svg';

    // MUST match _build3DCableEl's bezier formula exactly
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
    svg.style.transform = 'translateZ(0.5px)';
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

    // 3 staggered packets — emil-tuned 2.6s duration, linear easing
    var DURATION = '2.6s';
    var stagger = ['0s', '0.867s', '1.733s'];
    for (var i = 0; i < 3; i++) {
      var pkt = document.createElementNS(svgNs, 'circle');
      pkt.setAttribute('r', '2');
      pkt.setAttribute('fill', 'var(--tb3-bronze, #8b5a3c)');
      pkt.setAttribute('filter', 'drop-shadow(0 0 2px rgba(139, 90, 60, .55))');
      var anim = document.createElementNS(svgNs, 'animateMotion');
      anim.setAttribute('dur', DURATION);
      anim.setAttribute('repeatCount', 'indefinite');
      anim.setAttribute('begin', stagger[i]);
      // emil: drop keySplines + calcMode entirely — animateMotion defaults to linear
      var mpath = document.createElementNS(svgNs, 'mpath');
      mpath.setAttribute('href', '#' + pathId);
      anim.appendChild(mpath);
      pkt.appendChild(anim);
      svg.appendChild(pkt);
    }
    return svg;
  }

  // ===========================================================================
  // Phase 7 v2 Stage 5: Input handlers — drag rotate, scroll zoom, momentum,
  // double-click reset, Esc close. Stage 6 extends with arrows/+/-/R.
  // emil-design-eng tuned: decay 0.92, threshold 0.08, reset 400ms.
  // ===========================================================================
  var _3dPopupListeners = null;

  function _attach3DInputListeners() {
    var viewport = document.getElementById('tb3-3d-popup-viewport');
    if (!viewport) return;

    _3dPopupListeners = {
      mousedown: _on3DPopupMouseDown,
      mousemove: _on3DPopupMouseMove,
      mouseup: _on3DPopupMouseUp,
      wheel: _on3DPopupWheel,
      dblclick: _on3DPopupDblClick,
      keydown: _on3DPopupKeyDown,
      focusin: _on3DPopupFocusIn   // NEW Stage 7
    };

    viewport.addEventListener('mousedown', _3dPopupListeners.mousedown);
    document.addEventListener('mousemove', _3dPopupListeners.mousemove);
    document.addEventListener('mouseup', _3dPopupListeners.mouseup);
    viewport.addEventListener('wheel', _3dPopupListeners.wheel, { passive: false });
    viewport.addEventListener('dblclick', _3dPopupListeners.dblclick);
    document.addEventListener('keydown', _3dPopupListeners.keydown);
    document.addEventListener('focusin', _3dPopupListeners.focusin);   // NEW
  }

  function _detach3DInputListeners() {
    if (!_3dPopupListeners) return;
    var viewport = document.getElementById('tb3-3d-popup-viewport');
    if (viewport) {
      viewport.removeEventListener('mousedown', _3dPopupListeners.mousedown);
      viewport.removeEventListener('wheel', _3dPopupListeners.wheel);
      viewport.removeEventListener('dblclick', _3dPopupListeners.dblclick);
    }
    document.removeEventListener('mousemove', _3dPopupListeners.mousemove);
    document.removeEventListener('mouseup', _3dPopupListeners.mouseup);
    document.removeEventListener('keydown', _3dPopupListeners.keydown);
    document.removeEventListener('focusin', _3dPopupListeners.focusin);
    _3dPopupListeners = null;
  }

  function _on3DPopupMouseDown(e) {
    if (e.button !== 0) return;
    if (_3dPopup.rafHandle) {
      cancelAnimationFrame(_3dPopup.rafHandle);
      _3dPopup.rafHandle = null;
    }
    _3dPopup.dragState.active = true;
    _3dPopup.dragState.startX = e.clientX;
    _3dPopup.dragState.startY = e.clientY;
    _3dPopup.dragState.startRotX = _3dPopup.camera.rotX;
    _3dPopup.dragState.startRotY = _3dPopup.camera.rotY;
    _3dPopup.velocityX = 0;
    _3dPopup.velocityY = 0;
    _3dPopup.dragState._lastX = e.clientX;
    _3dPopup.dragState._lastY = e.clientY;
    e.preventDefault();
  }

  function _on3DPopupMouseMove(e) {
    if (!_3dPopup.dragState.active) return;
    var dx = e.clientX - _3dPopup.dragState.startX;
    var dy = e.clientY - _3dPopup.dragState.startY;

    var newRotY = _3dPopup.dragState.startRotY + dx * 0.4;
    var newRotX = _clamp3D(_3dPopup.dragState.startRotX - dy * 0.4, 15, 75);

    _3dPopup.velocityY = (e.clientX - _3dPopup.dragState._lastX) * 0.4;
    _3dPopup.velocityX = -(e.clientY - _3dPopup.dragState._lastY) * 0.4;
    _3dPopup.dragState._lastX = e.clientX;
    _3dPopup.dragState._lastY = e.clientY;

    _3dPopup.camera.rotY = newRotY;
    _3dPopup.camera.rotX = newRotX;
    _apply3DCamera();
  }

  function _on3DPopupMouseUp() {
    if (!_3dPopup.dragState.active) return;
    _3dPopup.dragState.active = false;
    if (_3dPopupReducedMotion()) return;   // NEW Stage 7 — no momentum
    if (Math.abs(_3dPopup.velocityX) > 0.5 || Math.abs(_3dPopup.velocityY) > 0.5) {
      _start3DMomentumDecay();
    }
  }

  function _start3DMomentumDecay() {
    function tick() {
      _3dPopup.camera.rotY += _3dPopup.velocityY;
      _3dPopup.camera.rotX = _clamp3D(_3dPopup.camera.rotX + _3dPopup.velocityX, 15, 75);
      _3dPopup.velocityX *= 0.92;
      _3dPopup.velocityY *= 0.92;
      _apply3DCamera();
      if (Math.abs(_3dPopup.velocityX) > 0.08 || Math.abs(_3dPopup.velocityY) > 0.08) {
        _3dPopup.rafHandle = requestAnimationFrame(tick);
      } else {
        _3dPopup.rafHandle = null;
      }
    }
    _3dPopup.rafHandle = requestAnimationFrame(tick);
  }

  function _on3DPopupWheel(e) {
    e.preventDefault();
    var newZoom = _3dPopup.camera.zoom * (1 - e.deltaY * 0.001);
    _3dPopup.camera.zoom = _clamp3D(newZoom, 0.5, 2.0);
    _apply3DCamera();
  }

  function _on3DPopupDblClick() {
    if (_3dPopupReducedMotion()) {
      _3dPopup.camera.rotX = 42; // Stage 6: updated default
      _3dPopup.camera.rotY = -18;
      _3dPopup.camera.zoom = 1.1; // Stage 6: updated default
      _apply3DCamera();
      return;
    }
    var startRotX = _3dPopup.camera.rotX;
    var startRotY = _3dPopup.camera.rotY;
    var startZoom = _3dPopup.camera.zoom;
    var targetRotX = 42, targetRotY = -18, targetZoom = 1.1; // Stage 6: updated defaults
    var startTs = null;
    var durationMs = 400;
    if (_3dPopup.rafHandle) {
      cancelAnimationFrame(_3dPopup.rafHandle);
      _3dPopup.rafHandle = null;
    }
    function ease(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    function tick(ts) {
      if (startTs === null) startTs = ts;
      var t = Math.min(1, (ts - startTs) / durationMs);
      var k = ease(t);
      _3dPopup.camera.rotX = startRotX + (targetRotX - startRotX) * k;
      _3dPopup.camera.rotY = startRotY + (targetRotY - startRotY) * k;
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

  function _on3DPopupKeyDown(e) {
    if (!_3dPopup.open) return;
    var step = 5;
    if (e.key === 'Escape') {
      e.preventDefault();
      _close3DPopup();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      _3dPopup.camera.rotY -= step;
      _apply3DCamera();
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      _3dPopup.camera.rotY += step;
      _apply3DCamera();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      _3dPopup.camera.rotX = _clamp3D(_3dPopup.camera.rotX - step, 15, 75);
      _apply3DCamera();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _3dPopup.camera.rotX = _clamp3D(_3dPopup.camera.rotX + step, 15, 75);
      _apply3DCamera();
      return;
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      _3dPopup.camera.zoom = _clamp3D(_3dPopup.camera.zoom * 1.1, 0.5, 2.0);
      _apply3DCamera();
      return;
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      _3dPopup.camera.zoom = _clamp3D(_3dPopup.camera.zoom / 1.1, 0.5, 2.0);
      _apply3DCamera();
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      _on3DPopupDblClick();   // reuse the 400ms tween
      return;
    }
  }

  function _3dPopupReducedMotion() {
    return (typeof _reducedMotion === 'function') ? _reducedMotion() : false;
  }

  function _on3DPopupFocusIn(e) {
    if (!_3dPopup.open) return;
    var modal = document.getElementById('tb3-3d-popup-modal');
    if (!modal) return;
    if (!modal.contains(e.target)) {
      var btn = document.getElementById('tb3-3d-popup-close-btn');
      if (btn) btn.focus();
    }
  }

  function _clamp3D(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function _render3DScene() {
    var stage = document.getElementById('tb3-3d-popup-stage');
    if (!stage) return;
    // Clear any previously-rendered cards and cables before (re-)populating.
    // .tb3-3d-cable selector is preemptively included so Stage 4's cable build
    // is cleared on re-render without needing to revisit this function.
    var existing = stage.querySelectorAll('.tb3-3d-dev, .tb3-3d-cable, .tb3-3d-ambient-packet');
    for (var i = 0; i < existing.length; i++) {
      existing[i].parentNode.removeChild(existing[i]);
    }
    var centroid = _computeSceneCentroid(state.devices);   // Stage 4: centroid offset

    for (var j = 0; j < state.devices.length; j++) {
      stage.appendChild(_build3DDeviceEl(state.devices[j], centroid.cx, centroid.cy));
    }

    // Append cables (Stage 4)
    for (var c = 0; c < state.cables.length; c++) {
      var cab = state.cables[c];
      var fromDev = _findDeviceById(cab.fromId);
      var toDev = _findDeviceById(cab.toId);
      if (!fromDev || !toDev) continue;
      stage.appendChild(_build3DCableEl(cab, fromDev, toDev, centroid.cx, centroid.cy));
      stage.appendChild(_buildAmbientPacketEl(cab, fromDev, toDev, centroid.cx, centroid.cy));
    }

    // Empty state — no devices on canvas
    var existingEmpty = stage.querySelector('.tb3-3d-popup-empty');
    if (existingEmpty) existingEmpty.remove();
    if (state.devices.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'tb3-3d-popup-empty';
      empty.textContent = 'Add devices to the canvas to see them in 3D.';
      stage.appendChild(empty);
    }

    // Update header counts so they stay in sync on every re-render.
    var counts = document.querySelector('.tb3-3d-popup-counts');
    if (counts) counts.innerHTML = state.devices.length + ' devices &middot; ' + state.cables.length + ' cables';

    // Update viewport aria-label with live counts (live sync exercised in Stage 6).
    var vp = document.getElementById('tb3-3d-popup-viewport');
    if (vp) {
      vp.setAttribute('aria-label',
        '3D rendering of ' + state.devices.length + ' devices and ' + state.cables.length +
        ' cables. Use arrow keys to rotate, plus or minus to zoom, R to reset, Escape to close.');
    }
  }

  function _open3DPopup() {
    if (_3dPopup.open) return;
    _3dPopup.open = true;

    document.body.style.overflow = 'hidden';

    var devCount = state.devices.length;
    var cabCount = state.cables.length;

    var modal = document.createElement('div');
    modal.className = 'tb3-3d-popup-modal';
    modal.id = 'tb3-3d-popup-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'tb3-3d-popup-title');
    modal.innerHTML =
      '<div class="tb3-3d-popup-backdrop" id="tb3-3d-popup-backdrop"></div>' +
      '<div class="tb3-3d-popup-card">' +
        '<header class="tb3-3d-popup-header">' +
          '<h2 id="tb3-3d-popup-title" class="tb3-3d-popup-title">3D view of topology</h2>' +
          '<span class="tb3-3d-popup-counts">' + devCount + ' devices &middot; ' + cabCount + ' cables</span>' +
          '<span class="tb3-3d-popup-header-spacer"></span>' +
          '<button class="tb3-3d-popup-tool-btn" id="tb3-3d-popup-fit-btn" aria-label="Fit topology to view" type="button" title="Fit to view">⊡</button>' +
          '<button class="tb3-3d-popup-tool-btn" id="tb3-3d-popup-reset-btn" aria-label="Reset camera to default" type="button" title="Reset camera">↺</button>' +
          '<button class="tb3-3d-popup-close-btn" id="tb3-3d-popup-close-btn" aria-label="Close 3D view" type="button">&times;</button>' +
        '</header>' +
        '<div class="tb3-3d-popup-viewport" id="tb3-3d-popup-viewport" role="img" ' +
             'aria-label="3D rendering of ' + devCount + ' devices and ' + cabCount + ' cables. Use arrow keys to rotate, plus or minus to zoom, R to reset, Escape to close." ' +
             'tabindex="0">' +
          '<div class="tb3-3d-popup-stage" id="tb3-3d-popup-stage">' +
            '<div class="tb3-3d-floor"></div>' +
          '</div>' +
          '<div class="tb3-3d-legend-chip" id="tb3-3d-legend-chip">' +
            '<div class="tb3-3d-popup-legend-title">Device families</div>' +
            '<span class="tb3-3d-legend-dot" style="background:var(--tb3-3d-accent-network,#8a6a3e)"></span><span class="tb3-3d-legend-label">Network</span>' +
            '<span class="tb3-3d-legend-dot" style="background:var(--tb3-3d-accent-endpoint,#5a8a4e)"></span><span class="tb3-3d-legend-label">Endpoint</span>' +
            '<span class="tb3-3d-legend-dot" style="background:var(--tb3-3d-accent-security,#8a4e4e)"></span><span class="tb3-3d-legend-label">Security</span>' +
            '<span class="tb3-3d-legend-dot" style="background:var(--tb3-3d-accent-cloud,#4e6a8a)"></span><span class="tb3-3d-legend-label">Cloud</span>' +
            '<span class="tb3-3d-legend-dot" style="background:var(--tb3-3d-accent-wireless,#7a5a8a)"></span><span class="tb3-3d-legend-label">Wireless</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    _render3DScene();    // populate device extruded cards (Stage 3) + cables (Stage 4)
    _apply3DCamera();    // apply initial camera (full impl arrives in Stage 5)

    // Wire X button + backdrop close (full input listeners come in Stage 5)
    document.getElementById('tb3-3d-popup-close-btn').addEventListener('click', _close3DPopup);
    document.getElementById('tb3-3d-popup-backdrop').addEventListener('click', _close3DPopup);
    // Stage 6: Fit-to-view + Reset camera tool buttons
    document.getElementById('tb3-3d-popup-fit-btn').addEventListener('click', function () { _fitCameraToDevices(state.devices); });
    document.getElementById('tb3-3d-popup-reset-btn').addEventListener('click', _on3DPopupDblClick);

    // Open tween — add .is-open after a paint to trigger CSS transitions
    requestAnimationFrame(function () {
      modal.classList.add('is-open');
      var btn = document.getElementById('tb3-3d-popup-close-btn');
      if (btn) btn.focus();
      _attach3DInputListeners();
    });
  }

  function _close3DPopup() {
    if (!_3dPopup.open) return;
    _3dPopup.open = false;
    _detach3DInputListeners();
    if (_3dPopup.rafHandle) {
      cancelAnimationFrame(_3dPopup.rafHandle);
      _3dPopup.rafHandle = null;
    }
    var modal = document.getElementById('tb3-3d-popup-modal');
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    document.body.style.overflow = '';
    var pill = document.querySelector('.tb3-mode[data-mode="3d"]');
    if (pill) pill.focus();
    // Stage 5: close animation, Stage 6: detach input listeners
  }

  function _renderTracePanel() {
    var panel = document.getElementById('tb3-trace-panel');
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'tb3-trace-panel';
      panel.className = 'tb3-rail-panel';
      panel.dataset.mode = 'trace';
      document.querySelector('.tb3-workspace').appendChild(panel);
    }

    var st = _getState();
    var hasDevices = st.devices && st.devices.length >= 2;

    // Empty-state copy per emil §8.6 fallback
    var controlsHtml = hasDevices
      ? _renderTraceControls()
      : '<section class="tb3-trace-empty"><p>Add devices to the canvas to start tracing.</p></section>';

    const hopsHtml = _renderHopList();
    const annotationHtml = (state.mode === 'osi')
      ? _renderOSIPanel()
      : _renderTraceAnnotation();

    panel.innerHTML =
      '<header class="tb3-trace-head">' +
        '<span class="tb3-trace-eyebrow">TRACE</span>' +
        '<h3 class="tb3-trace-title">Trace mode</h3>' +
        '<button class="tb3-trace-close" aria-label="Close Trace">×</button>' +
      '</header>' +
      controlsHtml +
      hopsHtml +
      annotationHtml;

    _wireTracePanel();
  }

  function _renderTraceControls() {
    var st = _getState();
    var devicesOpts = _buildDeviceOptions(st.devices, _traceState.srcId);
    var dstOpts = _buildDeviceOptions(st.devices, _traceState.dstId);
    var startEnabled = _traceState.srcId && _traceState.dstId && _traceState.srcId !== _traceState.dstId;
    var nextEnabled = _traceState.mode === 'step' && _canStepFurther();
    var endEnabled = _traceState.mode !== 'idle';
    var playLabel = _traceState.mode === 'play' ? 'Pause' : 'Play';
    var playDisabled = _traceState.mode === 'idle' || _traceState.mode === 'done';

    return '' +
      '<section class="tb3-trace-controls">' +
        '<div class="tb3-trace-pair">' +
          '<label>Source <select id="tb3-trace-src">' + devicesOpts + '</select></label>' +
          '<label>Destination <select id="tb3-trace-dst">' + dstOpts + '</select></label>' +
        '</div>' +
        '<div class="tb3-trace-protocol-row">' +
          '<button class="tb3-trace-proto on" data-proto="ping" disabled>ping</button>' +
        '</div>' +
        '<div class="tb3-trace-controls-row">' +
          '<button id="tb3-trace-start" class="tb3-trace-btn primary"' + (startEnabled ? '' : ' disabled') + '>Start trace</button>' +
          '<button id="tb3-trace-next" class="tb3-trace-btn"' + (nextEnabled ? '' : ' disabled') + '>Next hop ›</button>' +
          '<button id="tb3-trace-play" class="tb3-trace-btn"' + (playDisabled ? ' disabled' : '') + '>' + playLabel + '</button>' +
          '<button id="tb3-trace-end" class="tb3-trace-btn ghost"' + (endEnabled ? '' : ' disabled') + '>End trace</button>' +
        '</div>' +
      '</section>';
  }

  function _startTrace() {
    if (!_traceState || !_traceState.srcId || !_traceState.dstId) return;
    if (_traceState.srcId === _traceState.dstId) return;

    const state = _getState();
    const result = computePath(_traceState.srcId, _traceState.dstId, state);

    // Phase 3 schema: result is {ok, hops?, reason?, failedAt?}
    // - On success, result.hops is the device-ID path.
    // - On failure, result.hops is undefined; result.failedAt is the DEVICE ID
    //   where the path broke (NOT an index). Phase 5 normalizes: hops always
    //   carries at least [srcId] so _renderHopList has something to mark; we
    //   convert Phase 3's device-ID failedAt to an INDEX in that hops array,
    //   because _canStepFurther + _renderHopList expect a numeric index.
    // Field name discipline per spec §10: 'hops' NOT 'path'.
    if (result && Array.isArray(result.hops) && result.hops.length > 0) {
      _traceState.hops = result.hops.slice();
    } else {
      _traceState.hops = [_traceState.srcId];
    }

    if (result && result.ok === false && result.failedAt) {
      var failIdx = _traceState.hops.indexOf(result.failedAt);
      _traceState.failedAt = failIdx >= 0 ? failIdx : 0;
    } else {
      _traceState.failedAt = null;
    }

    _traceState.reasons = {};
    if (_traceState.failedAt !== null) {
      _traceState.reasons[_traceState.failedAt] = _reachReasonText(
        _traceState.failedAt,
        result.reason,
        _traceState.srcId,
        _traceState.dstId
      );
      _traceState.reasonCode = result.reason || null;
    } else {
      _traceState.reasonCode = null;
    }

    _traceState.currentHopIdx = 0;
    _traceState.mode = 'step';

    // Spawn packet at source (Phase 4 helper reuse).
    if (_traceState.packet) _despawnPacket(_traceState.packet);
    _traceState.packet = _spawnPacketSvg('amber');
    const srcPt = _devCenter(_traceState.srcId);
    if (_traceState.packet && srcPt) {
      _traceState.packet.setAttribute('cx', srcPt.x);
      _traceState.packet.setAttribute('cy', srcPt.y);
    }

    _renderTracePanel();

    // Phase 6 Stage 8: initial OSI encap cascade at source on trace start.
    if (state.mode === 'osi') {
      const srcDev = (state.devices || []).find(function (d) { return d.id === _traceState.srcId; });
      const activeLayers = _activeLayersForDev(srcDev || {});
      _animateEncap(_traceState.srcId, activeLayers, null);
    }
  }

  function _stepTrace() {
    if (!_traceState || _traceState.mode === 'idle' || _traceState.mode === 'done') return;
    if (!_canStepFurther()) return;

    // rAF cancellation discipline (emil §8.6 — interruptibility):
    // Cancel any in-flight glide before launching the next one so
    // rapid Next clicks retarget cleanly without orphan loops.
    // Dual-timer: also cancel any in-flight OSI overlay animation.
    if (_traceState.rafHandle) {
      cancelAnimationFrame(_traceState.rafHandle);
      _traceState.rafHandle = null;
    }
    if (_traceState.osiAnimHandle) {
      cancelAnimationFrame(_traceState.osiAnimHandle);
      _traceState.osiAnimHandle = null;
    }

    const fromHopIdx = _traceState.currentHopIdx;
    const toHopIdx = fromHopIdx + 1;
    const fromPt = _devCenter(_traceState.hops[fromHopIdx]);
    const toPt = _devCenter(_traceState.hops[toHopIdx]);
    if (!fromPt || !toPt || !_traceState.packet) return;

    // Glide duration per spec §8.1: 250ms cubic-bezier ease-in-out
    // (the strong custom curve, NOT default CSS easing).
    const isAutoplay = _traceState.mode === 'play';
    const durMs = isAutoplay ? 600 : 250;

    _movePacketTracked(_traceState.packet, fromPt, toPt, durMs, function() {
      _traceState.currentHopIdx = toHopIdx;
      _renderSettlePulse(_traceState.hops[toHopIdx]);
      _updateHopBadge();

      // Phase 6 Stage 8: OSI encap cascade on source role at hop arrival.
      // Runs in parallel with the settle pulse + badge update (spec §4).
      var state = _getState();
      if (state.mode === 'osi') {
        const role = _hopRole(toHopIdx);
        const hopId = _traceState.hops[toHopIdx];
        const hopDev = (state.devices || []).find(function (d) { return d.id === hopId; });
        const activeLayers = _activeLayersForDev(hopDev || {});
        if (role === 'source') {
          _animateEncap(hopId, activeLayers, function () {
            // OSI cascade complete — settle pulse + badge update already fired above
          });
        } else if (role === 'intermediate') {
          _animateIntermediate(hopId, (hopDev && hopDev.type) || 'router', null);
        } else if (role === 'dest') {
          _animateDecap(hopId, activeLayers, null);
        }
      }

      // If this hop is the failed hop, trigger the failure beat.
      // _failHop is implemented in Stage 9 — guard for now.
      if (_traceState.failedAt !== null && toHopIdx === _traceState.failedAt) {
        if (typeof _failHop === 'function') {
          _failHop(toHopIdx, _traceState.reasons[toHopIdx] || '');
        }
      }

      // If we reached the destination (no failure), mark mode = 'done'.
      if (_traceState.currentHopIdx === _traceState.hops.length - 1 && _traceState.failedAt === null) {
        _traceState.mode = 'done';
      }

      _renderTracePanel();
    });
  }

  function _renderSettlePulse(devId) {
    if (!devId) return;
    const el = document.querySelector('.tb3-dev[data-device-id="' + _escAttr(devId) + '"]');
    if (!el) return;
    // Re-trigger by removing + reflow + adding the class
    el.classList.remove('tb3-trace-settle');
    // Force reflow so the animation re-fires on rapid re-entry
    void el.offsetWidth;
    el.classList.add('tb3-trace-settle');
  }

  function _updateHopBadge() {
    if (!_traceState || _traceState.mode === 'idle' || _traceState.mode === 'done') {
      _clearHopBadges();
      return;
    }
    // Remove any existing badge first.
    _clearHopBadges();

    const idx = _traceState.currentHopIdx;
    const hopId = _traceState.hops[idx];
    if (!hopId) return;
    const isFailed = (idx === _traceState.failedAt);

    const devGroup = document.querySelector('g.tb3-dev[data-device-id="' + _escAttr(hopId) + '"]');
    if (!devGroup) return;

    // Find the device's bounding rect inside the group — the badge sits at top-right.
    const rect = devGroup.querySelector('rect') || devGroup.querySelector('image') || devGroup.firstElementChild;
    if (!rect) return;
    const rectX = parseFloat(rect.getAttribute('x') || rect.getAttribute('cx') || 0);
    const rectY = parseFloat(rect.getAttribute('y') || rect.getAttribute('cy') || 0);
    const rectW = parseFloat(rect.getAttribute('width') || 60);

    // Build the badge SVG group.
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const badge = document.createElementNS(SVG_NS, 'g');
    badge.classList.add('tb3-trace-badge');
    if (isFailed) badge.classList.add('is-failed');
    badge.setAttribute('transform', 'translate(' + (rectX + rectW - 4) + ',' + (rectY - 4) + ')');

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', '7');
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '0');
    circle.setAttribute('class', 'tb3-trace-badge-circle');

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', '0');
    text.setAttribute('y', '3');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '9');
    text.setAttribute('font-weight', '700');
    text.setAttribute('class', 'tb3-trace-badge-text');
    text.textContent = String(idx + 1);

    badge.appendChild(circle);
    badge.appendChild(text);
    devGroup.appendChild(badge);
  }

  function _clearHopBadges() {
    const badges = document.querySelectorAll('.tb3-trace-badge');
    badges.forEach(function(b) { b.parentNode.removeChild(b); });
  }

  function _movePacketTracked(el, fromPt, toPt, durMs, onDone) {
    if (!el) { if (onDone) onDone(); return; }
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / durMs);
      // cubic-bezier ease-in-out approximation per spec §8.1
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = fromPt.x + (toPt.x - fromPt.x) * ease;
      const y = fromPt.y + (toPt.y - fromPt.y) * ease;
      el.setAttribute('cx', x);
      el.setAttribute('cy', y);
      if (t < 1) {
        _traceState.rafHandle = requestAnimationFrame(step);
      } else {
        _traceState.rafHandle = null;
        if (onDone) onDone();
      }
    }
    _traceState.rafHandle = requestAnimationFrame(step);
  }

  function _canStepFurther() {
    return _traceState && Array.isArray(_traceState.hops) && _traceState.currentHopIdx < _traceState.hops.length - 1 && _traceState.failedAt === null;
  }

  function _buildDeviceOptions(devices, selectedId) {
    var opts = '<option value="">— pick —</option>';
    (devices || []).forEach(function(d) {
      var sel = (d.id === selectedId) ? ' selected' : '';
      opts += '<option value="' + _escAttr(d.id) + '"' + sel + '>' + _escAttr(d.hostname || d.id) + '</option>';
    });
    return opts;
  }

  function _renderHopList() {
    if (!_traceState || !Array.isArray(_traceState.hops) || _traceState.hops.length === 0) {
      return '';
    }
    const state = _getState();
    const total = _traceState.hops.length;
    let html = '<ol class="tb3-trace-hops">';
    _traceState.hops.forEach(function(hopId, idx) {
      const dev = (state.devices || []).find(function(d) { return d.id === hopId; });
      const label = dev ? (dev.hostname || dev.id) : hopId;
      const num = idx + 1;
      let cls = 'tb3-trace-hop';
      if (idx === _traceState.failedAt) cls += ' is-failed';
      else if (idx < _traceState.currentHopIdx) cls += ' is-done';
      else if (idx === _traceState.currentHopIdx) cls += ' is-current';
      html += '<li class="' + cls + '" data-hop-idx="' + idx + '" style="--tb3-hop-idx: ' + idx + '">' +
                '<span class="tb3-trace-hop-num">' + num + '</span>' +
                '<span class="tb3-trace-hop-label">' + _escAttr(label) + '</span>' +
              '</li>';
    });
    html += '</ol>';
    return html;
  }

  function _renderTraceAnnotation() {
    if (!_traceState || !Array.isArray(_traceState.hops) || _traceState.hops.length === 0) {
      return '';
    }
    const state = _getState();
    const idx = _traceState.currentHopIdx;
    const total = _traceState.hops.length;
    const hopId = _traceState.hops[idx];
    const dev = (state.devices || []).find(function(d) { return d.id === hopId; });
    if (!dev) return '';

    const isSrc = (idx === 0);
    const isDst = (idx === total - 1);
    const isFailed = (idx === _traceState.failedAt);

    const osiChip = _osiChipForDevice(dev, isSrc, isDst);
    const action = _actionForDevice(dev, isSrc, isDst);
    const reason = isFailed
      ? _traceState.reasons[idx]
      : _reasonForDevice(dev, isSrc, isDst, state);

    return '' +
      '<section class="tb3-trace-annotation">' +
        '<div class="tb3-trace-anno-eyebrow">Hop ' + (idx + 1) + ' of ' + total + '</div>' +
        '<div class="tb3-trace-anno-title">' + _escAttr(dev.hostname || dev.id) + '</div>' +
        '<div class="tb3-trace-anno-osi">' + _escAttr(osiChip) + '</div>' +
        '<div class="tb3-trace-anno-action">' + _escAttr(action) + '</div>' +
        '<div class="tb3-trace-anno-reason' + (isFailed ? ' is-failure' : '') + '">' + _escAttr(reason || '') + '</div>' +
      '</section>';
  }

  // ===========================================================================
  // Phase 6: _renderOSIPanel
  // Replaces _renderTraceAnnotation when state.mode === 'osi'. Per spec §3.3.
  // Empty state per spec §6 — same 7-row DOM shape, only the content varies.
  // ===========================================================================
  function _renderOSIPanel() {
    const state = _getState();
    const hasHops = _traceState && Array.isArray(_traceState.hops) && _traceState.hops.length > 0;

    if (!hasHops) {
      // Empty state — render the 7-row stack with all rows passive + placeholder
      // proto + verb copy per spec §6.
      const layerNames = { 7:'Application', 6:'Presentation', 5:'Session', 4:'Transport', 3:'Network', 2:'Data Link', 1:'Physical' };
      let rowsHtml = '';
      for (let n = 7; n >= 1; n--) {
        rowsHtml +=
          '<li class="tb3-osi-layer" data-layer="' + n + '">' +
            '<span class="tb3-osi-num">L' + n + '</span>' +
            '<div>' +
              '<span class="tb3-osi-name">' + layerNames[n] + '</span>' +
              '<span class="tb3-osi-proto">n/a</span>' +
              '<span class="tb3-osi-verb">Pick a source + destination, then Start to populate this layer</span>' +
            '</div>' +
          '</li>';
      }
      return '' +
        '<section class="tb3-osi-panel">' +
          '<div class="tb3-osi-eyebrow">PICK SOURCE + DEST</div>' +
          '<div class="tb3-osi-title">Awaiting trace</div>' +
          '<ol class="tb3-osi-stack">' + rowsHtml + '</ol>' +
        '</section>';
    }

    const idx = _traceState.currentHopIdx;
    const total = _traceState.hops.length;
    const hopId = _traceState.hops[idx];
    const dev = (state.devices || []).find(function (d) { return d.id === hopId; });
    if (!dev) return '<section class="tb3-osi-panel"><div class="tb3-osi-eyebrow">HOP ' + (idx+1) + ' OF ' + total + '</div><div class="tb3-osi-title">Unknown device</div></section>';

    const role = _hopRole(idx);
    const srcId = _traceState.srcId;
    const dstId = _traceState.dstId;
    const srcDev = (state.devices || []).find(function (d) { return d.id === srcId; });
    const dstDev = (state.devices || []).find(function (d) { return d.id === dstId; });
    const srcIp = (srcDev && srcDev.config && srcDev.config.ip) || '';
    const dstIp = (dstDev && dstDev.config && dstDev.config.ip) || '';
    const srcMac = srcId ? _genMockMac(srcId) : '';
    const dstMac = dstId ? _genMockMac(dstId) : '';

    // Next hop MAC for router-out context.
    const nextHopIdx = idx + 1;
    const nextHopId = (nextHopIdx < total) ? _traceState.hops[nextHopIdx] : null;
    const nextHopMac = nextHopId ? _genMockMac(nextHopId) : '';
    const routerMacOut = (role === 'intermediate' && nextHopId) ? _genMockMac(nextHopId) : '';

    // Cable type: read the cable touching this hop + its next neighbour from
    // state.cables (shape {id, fromId, fromPort, toId, toPort, type}). Default
    // 'cat6' per spec §7.5.
    let cableType = 'cat6';
    if (state.cables && nextHopId) {
      const cab = state.cables.find(function (c) {
        return (c.fromId === hopId && c.toId === nextHopId) ||
               (c.toId === hopId && c.fromId === nextHopId);
      });
      if (cab && cab.type) cableType = cab.type;
    }

    const ctx = {
      srcIp: srcIp,
      dstIp: dstIp,
      srcMac: srcMac,
      dstMac: dstMac,
      nextHopMac: nextHopMac,
      routerMacOut: routerMacOut,
      cableType: cableType
    };

    const stack = _buildLayerStackForHop({ dev: dev }, role, ctx);

    // If this hop is the failing hop, mark the corresponding layer's row.
    if (_traceState.failedAt !== null && _traceState.failedAt === idx) {
      const failLayer = (typeof _failedReasonToLayer === 'function')
        ? _failedReasonToLayer(_traceState.reasonCode || null)
        : 3;
      stack.forEach(function (row) {
        if (row.num === failLayer) row.failure = true;
      });
    }

    let rowsHtml = '';
    stack.forEach(function (row) {
      const cls = 'tb3-osi-layer' +
                  (row.active ? ' is-active' : ' is-passive') +
                  (row.failure ? ' is-failure' : '');
      rowsHtml +=
        '<li class="' + cls + '" data-layer="' + row.num + '">' +
          '<span class="tb3-osi-num">L' + row.num + '</span>' +
          '<div>' +
            '<span class="tb3-osi-name">' + _escAttr(row.name) + '</span>' +
            '<span class="tb3-osi-proto">' + _escAttr(row.proto) + '</span>' +
            '<span class="tb3-osi-verb">' + _escAttr(row.verb) + '</span>' +
            (row.failure && _traceState.reasons && _traceState.reasons[idx]
              ? '<span class="tb3-osi-layer-reason">' + _escAttr(_traceState.reasons[idx]) + '</span>'
              : '') +
          '</div>' +
        '</li>';
    });

    return '' +
      '<section class="tb3-osi-panel">' +
        '<div class="tb3-osi-eyebrow">HOP ' + (idx + 1) + ' OF ' + total + '</div>' +
        '<div class="tb3-osi-title">' + _escAttr(dev.hostname || dev.id) + '</div>' +
        '<ol class="tb3-osi-stack">' + rowsHtml + '</ol>' +
      '</section>';
  }

  // ===========================================================================
  // Phase 6: _setOSILayerFiring DOM helper
  // Adds .tb3-osi-layer-firing class to the matching row, triggers the 80ms
  // tb3OSILayerSettle keyframe, removes class on animationend. Reduced-motion
  // path: single 1200ms drop-shadow fade (handled by CSS @media block, JS only
  // adds + removes the class).
  // ===========================================================================
  function _setOSILayerFiring(layerNum) {
    const panel = document.getElementById('tb3-trace-panel');
    if (!panel) return;
    const row = panel.querySelector('.tb3-osi-layer[data-layer="' + layerNum + '"]');
    if (!row) return;
    row.classList.add('tb3-osi-layer-firing');
    // Use animationend (full-motion path); fallback timer for reduced-motion path
    // where the CSS sets animation:none.
    let cleared = false;
    function clear() {
      if (cleared) return;
      cleared = true;
      row.classList.remove('tb3-osi-layer-firing');
      row.removeEventListener('animationend', clear);
    }
    row.addEventListener('animationend', clear, { once: true });
    setTimeout(clear, 1400);   // reduced-motion safety net (1200ms + 200ms buffer)
  }

  // ── Stage 7: failure-reason → OSI layer mapping (spec §8) ──────────────────
  // NOTE: _failedReasonToLayer is self-contained (inlines the table) so the
  // vm-sandbox UAT fixture can extract and run it without module-scope deps.
  var _FAILED_REASON_TO_LAYER = {
    'no-link':           1,
    'no-cable-path':     1,
    'mac-not-found':     2,
    'no-l2-path':        2,
    'no-ip':             3,
    'no-gateway':        3,
    'gateway-not-found': 3,
    'different-subnet':  3,
    'not-l3':            3,
    'no-route':          3,
    'no-router-between': 3,
  };

  function _failedReasonToLayer(reason) {
    var map = {
      'no-link':           1,
      'no-cable-path':     1,
      'mac-not-found':     2,
      'no-l2-path':        2,
      'no-ip':             3,
      'no-gateway':        3,
      'gateway-not-found': 3,
      'different-subnet':  3,
      'not-l3':            3,
      'no-route':          3,
      'no-router-between': 3,
    };
    if (reason && Object.prototype.hasOwnProperty.call(map, reason)) {
      return map[reason];
    }
    return 3; // default: L3 Network
  }

  // ===========================================================================
  // Phase 6: _animateEncap
  // Per-layer cascade L7 → L1 (top-down). 80ms per ACTIVE layer with no
  // overlap (next layer fires when prior completes). Captures rAF handle on
  // _traceState.osiAnimHandle so _stepTrace + _pauseTrace + _endTrace can
  // cancel cleanly per spec §9.4. onDone callback fires after the final
  // layer's pulse completes (used by _stepTrace to chain into settle pulse +
  // badge update).
  // ===========================================================================
  function _animateEncap(srcHopId, activeLayers, onDone) {
    // Reduced-motion fast-path: light all active layers at once + skip cascade.
    if (_reducedMotion && _reducedMotion()) {
      (activeLayers || []).forEach(function (n) { _setOSILayerFiring(n); });
      if (typeof onDone === 'function') setTimeout(onDone, 80);
      return;
    }

    // Filter to layers we'll fire (active subset only, sorted top-down 7 → 1).
    var layers = (activeLayers || []).slice().sort(function (a, b) { return b - a; });
    if (layers.length === 0) {
      if (typeof onDone === 'function') onDone();
      return;
    }

    var startTs = null;
    var perLayerMs = 80;
    var totalMs = layers.length * perLayerMs;
    var fired = new Array(layers.length).fill(false);

    function tick(ts) {
      if (startTs === null) startTs = ts;
      var elapsed = ts - startTs;

      // Fire each layer at its scheduled window.
      for (var i = 0; i < layers.length; i++) {
        if (!fired[i] && elapsed >= i * perLayerMs) {
          fired[i] = true;
          _setOSILayerFiring(layers[i]);
        }
      }

      if (elapsed < totalMs) {
        _traceState.osiAnimHandle = requestAnimationFrame(tick);
      } else {
        _traceState.osiAnimHandle = null;
        if (typeof onDone === 'function') onDone();
      }
    }

    _traceState.osiAnimHandle = requestAnimationFrame(tick);
  }

  // ===========================================================================
  // Phase 6: _animateIntermediate
  // Decap-up + 100ms pause + re-encap-down cascade at router/switch/firewall/vpn.
  // Per spec §3.7. Decap-up goes L1 → relevant-layer (L2 for switch,
  // L3 for router/l3-switch/firewall/vpn). Re-encap-down mirrors back to L1.
  // Asymmetric easing per direction per spec §9.3 (handled by class-based
  // CSS keyframe — JS only fires the row class; easing rides _animateEncap's
  // existing tb3OSILayerSettle keyframe + ease tokens declared in Stage 6 CSS).
  // ===========================================================================
  function _animateIntermediate(hopId, deviceType, onDone) {
    // Determine the top-of-decap layer per device type.
    var topLayer;
    if (deviceType === 'switch' || deviceType === 'wap' || deviceType === 'wlc') {
      topLayer = 2;
    } else if (deviceType === 'router' || deviceType === 'l3-switch' || deviceType === 'firewall' || deviceType === 'vpn') {
      topLayer = 3;
    } else {
      topLayer = 3;   // fallback
    }

    // Reduced-motion fast-path: light L1..topLayer at once, skip cascade.
    if (_reducedMotion && _reducedMotion()) {
      for (var n = 1; n <= topLayer; n++) _setOSILayerFiring(n);
      if (typeof onDone === 'function') setTimeout(onDone, 80);
      return;
    }

    // Build cascade sequences:
    //   Decap-up: L1 → topLayer (ascending)
    //   Pause:    100ms
    //   Re-encap: topLayer → L1 (descending)
    var upSeq = [];
    for (var u = 1; u <= topLayer; u++) upSeq.push(u);
    var downSeq = [];
    for (var d = topLayer; d >= 1; d--) downSeq.push(d);

    var perLayerMs = 80;
    var pauseMs = 100;
    var upTotalMs = upSeq.length * perLayerMs;
    var pauseEndMs = upTotalMs + pauseMs;
    var totalMs = pauseEndMs + downSeq.length * perLayerMs;

    var startTs = null;
    var upFired = new Array(upSeq.length).fill(false);
    var downFired = new Array(downSeq.length).fill(false);

    function tick(ts) {
      if (startTs === null) startTs = ts;
      var elapsed = ts - startTs;

      // Phase A: decap-up
      if (elapsed < upTotalMs) {
        for (var i = 0; i < upSeq.length; i++) {
          if (!upFired[i] && elapsed >= i * perLayerMs) {
            upFired[i] = true;
            _setOSILayerFiring(upSeq[i]);
          }
        }
      } else if (elapsed >= pauseEndMs) {
        // Phase C: re-encap-down (Phase B is the 100ms pause — nothing fires)
        var downElapsed = elapsed - pauseEndMs;
        for (var j = 0; j < downSeq.length; j++) {
          if (!downFired[j] && downElapsed >= j * perLayerMs) {
            downFired[j] = true;
            _setOSILayerFiring(downSeq[j]);
          }
        }
      }

      if (elapsed < totalMs) {
        _traceState.osiAnimHandle = requestAnimationFrame(tick);
      } else {
        _traceState.osiAnimHandle = null;
        if (typeof onDone === 'function') onDone();
      }
    }

    _traceState.osiAnimHandle = requestAnimationFrame(tick);
  }

  // ===========================================================================
  // Phase 6: _animateDecap
  // Per-layer cascade L1 → L7 (bottom-up). Mirror of _animateEncap timing
  // (80ms per active layer, no overlap) but bottom-up. Easing rides the
  // tb3OSILayerSettle keyframe from CSS (same cubic-bezier as encap per
  // spec §9.3 — mirror).
  // ===========================================================================
  function _animateDecap(dstHopId, activeLayers, onDone) {
    if (_reducedMotion && _reducedMotion()) {
      (activeLayers || []).forEach(function (n) { _setOSILayerFiring(n); });
      if (typeof onDone === 'function') setTimeout(onDone, 80);
      return;
    }

    // Filter to layers we'll fire (active subset only, sorted bottom-up 1 → 7).
    var layers = (activeLayers || []).slice().sort(function (a, b) { return a - b; });
    if (layers.length === 0) {
      if (typeof onDone === 'function') onDone();
      return;
    }

    var startTs = null;
    var perLayerMs = 80;
    var totalMs = layers.length * perLayerMs;
    var fired = new Array(layers.length).fill(false);

    function tick(ts) {
      if (startTs === null) startTs = ts;
      var elapsed = ts - startTs;
      for (var i = 0; i < layers.length; i++) {
        if (!fired[i] && elapsed >= i * perLayerMs) {
          fired[i] = true;
          _setOSILayerFiring(layers[i]);
        }
      }
      if (elapsed < totalMs) {
        _traceState.osiAnimHandle = requestAnimationFrame(tick);
      } else {
        _traceState.osiAnimHandle = null;
        if (typeof onDone === 'function') onDone();
      }
    }

    _traceState.osiAnimHandle = requestAnimationFrame(tick);
  }

  function _osiChipForDevice(dev, isSrc, isDst) {
    if (isSrc || isDst) return 'L7 · Application';
    if (dev.type === 'switch') return 'L2 · Data Link';
    if (dev.type === 'router' || dev.type === 'l3-switch' || dev.type === 'firewall' || dev.type === 'vpn') return 'L3 · Network';
    return 'L3 · Network';  // fallback
  }

  function _actionForDevice(dev, isSrc, isDst) {
    // Locked stop-slop copy per spec §7.4. Ping-only (Phase 5).
    if (isSrc) return 'Originates ICMP echo request';
    if (isDst) return 'Receives ICMP echo, sends reply';
    if (dev.type === 'switch') return 'Forwards via MAC table';
    if (dev.type === 'router' || dev.type === 'l3-switch') return 'Forwards via routing table';
    if (dev.type === 'firewall' || dev.type === 'vpn') return 'Filters and forwards';
    return 'Forwards';
  }

  function _reasonForDevice(dev, isSrc, isDst, state) {
    // Locked stop-slop reason templates per spec §7.4.
    if (isSrc) {
      const dstId = _traceState.dstId;
      const dstDev = (state.devices || []).find(function(d) { return d.id === dstId; });
      const dstIp = (dstDev && dstDev.config && dstDev.config.ip) ? dstDev.config.ip : '?';
      const gw = (dev.config && dev.config.gateway) ? dev.config.gateway : '?';
      return 'Targets ' + dstIp + ' via default gateway ' + gw;
    }
    if (isDst) {
      const srcId = _traceState.srcId;
      const srcDev = (state.devices || []).find(function(d) { return d.id === srcId; });
      const srcIp = (srcDev && srcDev.config && srcDev.config.ip) ? srcDev.config.ip : '?';
      return 'Replies to ' + srcIp;
    }
    // Intermediate hop: find next hop IP for egress reason
    const nextIdx = (_traceState.hops || []).indexOf(dev.id) + 1;
    const nextHopId = (_traceState.hops || [])[nextIdx];
    const nextDev = (state.devices || []).find(function(d) { return d.id === nextHopId; });
    const nextIp = (nextDev && nextDev.config && nextDev.config.ip) ? nextDev.config.ip : '?';
    if (dev.type === 'switch') {
      return 'Egress port toward ' + nextIp;  // MAC info would be ideal but IP is the user-facing handle
    }
    if (dev.type === 'firewall' || dev.type === 'vpn') {
      return 'Permits per policy. Egress ' + nextIp;
    }
    return 'Egress to ' + nextIp;
  }

  // ===========================================================================
  // Phase 6: _genMockMac
  // Deterministic mock-MAC per device id. djb2 hash → 3 bytes hex →
  // 02:00:00:XX:XX:XX (locally-administered range; U/L bit set; NOT a real OUI).
  // Per spec §6 + §7.5 — one mock MAC per device (intentional pedagogical
  // simplification; the L2-vs-L3 demarcation lesson lands without per-interface
  // MAC accuracy).
  // ===========================================================================
  function _genMockMac(devId) {
    const s = (devId == null) ? '' : String(devId);
    // djb2 hash — see Phase 5 spec discussion in §6.
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    }
    // Take 3 bytes from the 32-bit hash.
    const b1 = (h >>> 16) & 0xff;
    const b2 = (h >>> 8) & 0xff;
    const b3 = h & 0xff;
    function hex2(n) {
      const r = (n & 0xff).toString(16);
      return r.length === 1 ? '0' + r : r;
    }
    return '02:00:00:' + hex2(b1) + ':' + hex2(b2) + ':' + hex2(b3);
  }

  // ===========================================================================
  // Phase 6: OSI active-layers + role + layer-stack builder
  // ===========================================================================

  function _hopRole(hopIdx) {
    if (!_traceState || !Array.isArray(_traceState.hops)) return 'intermediate';
    const last = _traceState.hops.length - 1;
    if (hopIdx === 0) return 'source';
    if (hopIdx === last) return 'dest';
    return 'intermediate';
  }

  function _activeLayersForDev(dev) {
    if (!dev || !dev.type) return [1, 2, 3];
    var endpoints = ['pc', 'server', 'laptop', 'smartphone', 'game-console', 'smart-tv'];
    if (endpoints.indexOf(dev.type) !== -1) return [1, 2, 3, 7];  // ICMP: L4 = n/a
    if (dev.type === 'switch' || dev.type === 'wap' || dev.type === 'wlc') return [1, 2];
    if (dev.type === 'router' || dev.type === 'l3-switch' || dev.type === 'firewall' || dev.type === 'vpn') return [1, 2, 3];
    if (dev.type === 'cloud' || dev.type === 'internet') return [1, 2, 3];
    return [1, 2, 3];
  }

  // Locked stop-slop verb templates per spec §7.4 (extending Phase 5's
  // _actionForDevice discipline to layer level). Returns the verb string for a
  // given {layer, role, deviceType}. Period in 'Filters per policy. Forwards
  // via routing table' is load-bearing (spec §7.4 — "period breaks the chain").
  function _verbForLayer(layerNum, role, devType) {
    if (layerNum === 7) {
      if (role === 'source') return 'Originates ICMP echo request';
      if (role === 'dest') return 'Receives ICMP echo, sends reply';
      return 'n/a — device does not examine application data';
    }
    if (layerNum === 4) return 'n/a — ICMP runs directly on IP';
    if (layerNum === 3) {
      if (role === 'source') return 'Wraps payload with source/dest IP';
      if (role === 'dest') return 'Accepts packet for own IP';
      if (devType === 'switch' || devType === 'wap' || devType === 'wlc') return 'n/a — switch does not examine IP';
      if (devType === 'firewall' || devType === 'vpn') return 'Filters per policy. Forwards via routing table';
      return 'Forwards via routing table';
    }
    if (layerNum === 2) {
      if (role === 'source') return 'Frames with source/next-hop MAC';
      if (role === 'dest') return 'Accepts frame for own MAC';
      if (devType === 'switch' || devType === 'wap' || devType === 'wlc') return 'Forwards via MAC table';
      return 'Rewrites frame with own MAC + next-hop MAC';
    }
    if (layerNum === 1) {
      if (role === 'dest') return 'Receives signal';
      return 'Encodes frame as electrical signal';
    }
    if (layerNum === 5 || layerNum === 6) return 'n/a — not engaged by ping';
    return '';
  }

  function _protoForLayer(layerNum, role, devType, ctx) {
    // ctx = { srcIp, dstIp, srcMac, nextHopMac, routerMacOut, dstMac, cableType }
    var ct = (ctx && ctx.cableType) || 'cat6';
    if (layerNum === 7) {
      if (role === 'source') return 'ICMP echo request · type=8 code=0';
      if (role === 'dest') return 'ICMP echo reply queued';
      return 'n/a';
    }
    if (layerNum === 4) return 'n/a';
    if (layerNum === 3) {
      if (role === 'source') return 'IP · src=' + (ctx.srcIp || '?') + ' · dst=' + (ctx.dstIp || '?');
      if (role === 'dest') return 'IP · dst=' + (ctx.dstIp || '?') + ' matches';
      if (devType === 'switch' || devType === 'wap' || devType === 'wlc') return 'n/a';
      return 'IP · src=' + (ctx.srcIp || '?') + ' · dst=' + (ctx.dstIp || '?') + ' · TTL decrements';
    }
    if (layerNum === 2) {
      if (role === 'source') return 'Ethernet · src=' + (ctx.srcMac || '?') + ' · dst=' + (ctx.nextHopMac || '?');
      if (role === 'dest') return 'Ethernet · dst=' + (ctx.dstMac || '?') + ' matches';
      if (devType === 'switch' || devType === 'wap' || devType === 'wlc') return 'Ethernet · forwarding table lookup';
      return 'Ethernet · src=' + (ctx.routerMacOut || '?') + ' · dst=' + (ctx.nextHopMac || '?');
    }
    if (layerNum === 1) {
      if (role === 'dest') return ct + ' · signal received';
      return ct + ' · electrical signal';
    }
    if (layerNum === 5 || layerNum === 6) return 'n/a';
    return '';
  }

  // _buildLayerStackForHop(hop, role, ctx) → array of 7 row descriptors
  //   { num, name, proto, verb, active, failure }
  // Layers always 7→1 (top-down render order). ctx as in _protoForLayer above.
  function _buildLayerStackForHop(hop, role, ctx) {
    const dev = (hop && hop.dev) || hop || {};
    const activeNums = _activeLayersForDev(dev);
    const layerNames = {
      7: 'Application',
      6: 'Presentation',
      5: 'Session',
      4: 'Transport',
      3: 'Network',
      2: 'Data Link',
      1: 'Physical'
    };
    const out = [];
    for (let n = 7; n >= 1; n--) {
      out.push({
        num: n,
        name: layerNames[n],
        proto: _protoForLayer(n, role, dev.type, ctx || {}),
        verb: _verbForLayer(n, role, dev.type),
        active: activeNums.indexOf(n) !== -1,
        failure: false   // populated in Stage 7
      });
    }
    return out;
  }

  function _playTrace() {
    if (!_traceState || _traceState.mode === 'idle' || _traceState.mode === 'done') return;
    if (!_canStepFurther()) return;

    _traceState.mode = 'play';
    _renderTracePanel();

    function tick() {
      // Check we're still in play mode (could have been paused or ended mid-cycle).
      if (!_traceState || _traceState.mode !== 'play') return;
      // Check we have somewhere to go.
      if (!_canStepFurther()) {
        _traceState.mode = 'done';
        _renderTracePanel();
        return;
      }

      _stepTrace();

      // After _stepTrace fires (which is rAF-driven 600ms in autoplay mode),
      // schedule the next tick after the hop duration + 120ms gap.
      // Note: _stepTrace's onDone callback handles the failure case (auto-pauses
      // via _failHop in Stage 9). We rely on _traceState.mode being checked
      // at the top of tick() to bail when paused/failed.
      _traceState.autoplayTimer = setTimeout(tick, 600 + 120);
    }

    // Kick off first tick after a short pre-roll (gives the user time to see
    // the hop list before motion starts).
    _traceState.autoplayTimer = setTimeout(tick, 200);
  }

  function _pauseTrace() {
    if (!_traceState) return;
    _traceState.mode = 'paused';
    if (_traceState.autoplayTimer) {
      clearTimeout(_traceState.autoplayTimer);
      _traceState.autoplayTimer = null;
    }
    if (_traceState.rafHandle) {
      cancelAnimationFrame(_traceState.rafHandle);
      _traceState.rafHandle = null;
    }
    if (_traceState.osiAnimHandle) {
      cancelAnimationFrame(_traceState.osiAnimHandle);
      _traceState.osiAnimHandle = null;
    }
    _renderTracePanel();
  }

  function _endTrace() {
    if (!_traceState) return;
    _traceState.mode = 'done';
    if (_traceState.autoplayTimer) {
      clearTimeout(_traceState.autoplayTimer);
      _traceState.autoplayTimer = null;
    }
    if (_traceState.rafHandle) {
      cancelAnimationFrame(_traceState.rafHandle);
      _traceState.rafHandle = null;
    }
    if (_traceState.osiAnimHandle) {
      cancelAnimationFrame(_traceState.osiAnimHandle);
      _traceState.osiAnimHandle = null;
    }
    if (_traceState.packet) {
      _despawnPacket(_traceState.packet);
      _traceState.packet = null;
    }
    _renderTracePanel();
  }

  function _failHop(hopIdx, reasonText) {
    if (!_traceState || typeof hopIdx !== 'number') return;
    const hopId = _traceState.hops[hopIdx];
    if (!hopId) return;

    // Re-use Phase 4's _failDevice — 200ms shake + 1.2s red glow.
    // Reduced-motion path inside _failDevice handles the gate.
    _failDevice(hopId, reasonText || '');

    // If we were autoplaying, auto-pause so the user can read the reason.
    if (_traceState.mode === 'play') {
      _traceState.mode = 'paused';
      if (_traceState.autoplayTimer) {
        clearTimeout(_traceState.autoplayTimer);
        _traceState.autoplayTimer = null;
      }
    }

    // Make sure the reason is captured on _traceState so the annotation renders it.
    // (Already populated in _startTrace from REACH_REASON_TEMPLATES; this is a safety net.)
    if (reasonText && !_traceState.reasons[hopIdx]) {
      _traceState.reasons[hopIdx] = reasonText;
    }

    _renderTracePanel();
  }

  function _wireTracePanel() {
    var panel = document.getElementById('tb3-trace-panel');
    if (!panel) return;

    // Close
    var closeBtn = panel.querySelector('.tb3-trace-close');
    if (closeBtn) closeBtn.onclick = _closeTrace;

    // Src/Dst dropdowns
    var srcSel = panel.querySelector('#tb3-trace-src');
    if (srcSel) srcSel.onchange = function(e) {
      _traceState.srcId = e.target.value || null;
      _renderTracePanel();
    };
    var dstSel = panel.querySelector('#tb3-trace-dst');
    if (dstSel) dstSel.onchange = function(e) {
      _traceState.dstId = e.target.value || null;
      _renderTracePanel();
    };

    // Buttons — Stage 4+ wire real handlers; for now just hold the references
    var startBtn = panel.querySelector('#tb3-trace-start');
    if (startBtn) startBtn.onclick = function() {
      if (typeof _startTrace === 'function') _startTrace();
    };
    var nextBtn = panel.querySelector('#tb3-trace-next');
    if (nextBtn) nextBtn.onclick = function() {
      if (typeof _stepTrace === 'function') _stepTrace();
    };
    var playBtn = panel.querySelector('#tb3-trace-play');
    if (playBtn) playBtn.onclick = function() {
      if (_traceState.mode === 'play') {
        if (typeof _pauseTrace === 'function') _pauseTrace();
      } else {
        if (typeof _playTrace === 'function') _playTrace();
      }
    };
    var endBtn = panel.querySelector('#tb3-trace-end');
    if (endBtn) endBtn.onclick = function() {
      if (typeof _endTrace === 'function') _endTrace();
    };
  }

  function _renderSimulatePanel() {
    var previewSection = document.getElementById('tb3-sim-preview-section');
    if (previewSection) {
      var inLab = (state.intent === 'lab' && state.activeScenarioId);
      previewSection.hidden = !inLab;
    }
    _renderDrillControls();
    _renderSimLog();
    _wireSimulate();
  }

  function _renderDrillControls() {
    var host = document.getElementById('tb3-sim-drill-controls');
    if (!host) return;

    var devices = state.devices || [];
    var deviceOptions = function (selectedId) {
      var opts = ['<option value="">— choose —</option>'];
      devices.forEach(function (d) {
        var sel = (d.id === selectedId) ? ' selected' : '';
        opts.push('<option value="' + _escAttr(d.id) + '"' + sel + '>' + _escAttr(d.label || d.id.slice(-4)) + '</option>');
      });
      return opts.join('');
    };

    var p = _simState.drillProtocol;

    host.innerHTML =
      '<label class="tb3-sim-field">' +
        '<span class="tb3-sim-field-l">Src</span>' +
        '<select class="tb3-sim-input" id="tb3-sim-src">' + deviceOptions(_simState.drillSrcId) + '</select>' +
      '</label>' +
      '<label class="tb3-sim-field">' +
        '<span class="tb3-sim-field-l">Dst</span>' +
        '<select class="tb3-sim-input" id="tb3-sim-dst">' + deviceOptions(_simState.drillDstId) + '</select>' +
      '</label>' +
      '<div class="tb3-sim-proto-row">' +
        '<button type="button" class="tb3-sim-proto' + (p === 'ping' ? ' on' : '') + '" data-proto="ping">ping</button>' +
        '<button type="button" class="tb3-sim-proto' + (p === 'arp'  ? ' on' : '') + '" data-proto="arp">ARP</button>' +
        '<button type="button" class="tb3-sim-proto' + (p === 'dhcp' ? ' on' : '') + '" data-proto="dhcp">DHCP</button>' +
      '</div>' +
      '<button type="button" id="tb3-sim-send" class="tb3-sim-cta">Send</button>' +
      '<div class="tb3-sim-hint">Tip · click a device on the canvas to fill the next empty slot.</div>';

    _updateSendEnabled();
  }

  function _updateSendEnabled() {
    var btn = document.getElementById('tb3-sim-send');
    if (!btn) return;
    var ok = !!(_simState.drillSrcId && _simState.drillDstId && _simState.drillSrcId !== _simState.drillDstId);
    btn.disabled = !ok;
  }

  // ───────────────────────────────────────────────────────────
  // STAGE 4.3 — Animation orchestrator + per-protocol motion stubs
  // ───────────────────────────────────────────────────────────

  function _animatePacket(spec) {
    // spec = { path: [deviceId, …], protocol: 'ping'|'arp'|'dhcp',
    //         onComplete, onFailedAt, onLog, failedAt? }
    if (!spec || !spec.path || spec.path.length < 2) {
      if (spec && spec.onComplete) spec.onComplete();
      return;
    }
    var proto = spec.protocol || 'ping';
    var motion = ({ ping: _motionPing, arp: _motionArp, dhcp: _motionDhcp })[proto];
    if (!motion) {
      if (spec.onComplete) spec.onComplete();
      return;
    }
    motion(spec);
  }

  function _motionPing(spec) {
    var path = spec.path;
    var color = 'var(--tb3-pkt-ping)';
    if (_reducedMotion()) {
      _appendLogEntry({ ts: Date.now(), protocol: 'ping', text: path[0] + ' sends ICMP echo to ' + path[path.length - 1], failure: false });
      if (spec.failedAt) {
        _failDevice(spec.failedAt, spec.failReason);
        _appendLogEntry({ ts: Date.now(), protocol: 'ping', text: _reachReasonText(spec.failedAt, spec.failReason, path[0], path[path.length - 1]), failure: true, pair: { path: path, protocol: 'ping', failedAt: spec.failedAt, failReason: spec.failReason || '' } });
      } else {
        _appendLogEntry({ ts: Date.now(), protocol: 'ping', text: path[path.length - 1] + ' reply received', failure: false });
      }
      if (spec.onComplete) spec.onComplete();
      return;
    }

    var el = _spawnPacketSvg('oklch(0.74 0.13 65)');
    if (!el) { if (spec.onComplete) spec.onComplete(); return; }

    _appendLogEntry({ ts: Date.now(), protocol: 'ping', text: path[0] + ' sends ICMP echo to ' + path[path.length - 1], failure: false });

    var hops = path.map(_devCenter).filter(Boolean);
    var hopMs = 600;
    function leg(i, dir, done) {
      if (i >= hops.length - 1 || (dir === -1 && i <= 0)) { done(); return; }
      var from = hops[i];
      var to = hops[i + dir];
      _movePacket(el, from, to, hopMs, function () { leg(i + dir, dir, done); });
    }

    function outbound() {
      leg(0, 1, function () {
        // settle pulse 80ms
        el.setAttribute('r', '9');
        setTimeout(function () {
          el.setAttribute('r', '6');
          // failure here?
          if (spec.failedAt && spec.failedAt === path[path.length - 1]) {
            _failDevice(spec.failedAt, spec.failReason);
            _appendLogEntry({
              ts: Date.now(),
              protocol: 'ping',
              text: _reachReasonText(spec.failedAt, spec.failReason, path[0], path[path.length - 1]),
              failure: true,
              pair: {
                path: path,
                protocol: 'ping',
                failedAt: spec.failedAt,
                failReason: spec.failReason || ''
              }
            });
            _despawnPacket(el);
            if (spec.onComplete) spec.onComplete();
            return;
          }
          _appendLogEntry({ ts: Date.now(), protocol: 'ping', text: path[path.length - 1] + ' echo received, replying', failure: false });
          // return leg
          leg(hops.length - 1, -1, function () {
            _despawnPacket(el);
            _appendLogEntry({ ts: Date.now(), protocol: 'ping', text: 'reply received at ' + path[0], failure: false });
            if (spec.onComplete) spec.onComplete();
          });
        }, 80);
      });
    }

    outbound();
  }
  function _motionArp(spec) {
    var srcId = spec.path[0];
    var dstId = spec.path[spec.path.length - 1];
    var srcDev = state.devices.find(function (d) { return d.id === srcId; });
    var dstDev = state.devices.find(function (d) { return d.id === dstId; });
    var dstIp = dstDev && dstDev.config && dstDev.config.ip;

    _appendLogEntry({
      ts: Date.now(),
      protocol: 'arp',
      text: srcId + ' ARPs for ' + (dstIp || dstId),
      failure: false,
    });

    if (_reducedMotion()) {
      setTimeout(function () {
        if (spec.failedAt) {
          _failDevice(spec.failedAt, spec.failReason);
          _appendLogEntry({ ts: Date.now(), protocol: 'arp', text: _reachReasonText(spec.failedAt, spec.failReason, srcId, dstId), failure: true });
        } else {
          _appendLogEntry({ ts: Date.now(), protocol: 'arp', text: dstId + ' replies: ' + dstIp + ' is at <mac>', failure: false });
        }
        if (spec.onComplete) spec.onComplete();
      }, 100);
      return;
    }

    var srcCenter = _devCenter(srcId);
    if (!srcCenter) { if (spec.onComplete) spec.onComplete(); return; }

    // Phase 1 — burst ring (200ms)
    var svg = document.getElementById('tb3-canvas-svg');
    var ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', srcCenter.x);
    ring.setAttribute('cy', srcCenter.y);
    ring.setAttribute('r', '6');
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', 'oklch(0.7 0.15 145)');
    ring.setAttribute('stroke-width', '2');
    ring.setAttribute('class', 'tb3-packet');
    svg.appendChild(ring);
    var burstStart = performance.now();
    function burstTick(now) {
      var t = Math.min(1, (now - burstStart) / 200);
      ring.setAttribute('r', String(6 + t * 90));
      ring.setAttribute('opacity', String(1 - t));
      if (t < 1) requestAnimationFrame(burstTick);
      else _despawnPacket(ring);
    }
    requestAnimationFrame(burstTick);

    // Phase 2 — fan-out dots (300ms)
    setTimeout(function () {
      var subnetDevs = _sameSubnetDevices(srcId);
      subnetDevs.forEach(function (d) {
        var to = _devCenter(d.id);
        if (!to) return;
        var dot = _spawnPacketSvg('oklch(0.7 0.15 145)');
        dot.setAttribute('r', '4');
        _movePacket(dot, srcCenter, to, 300, function () {
          // Phase 3 — settle (100ms): brief opacity flash on receiver
          var devEl = document.querySelector('.tb3-dev[data-device-id="' + d.id + '"]');
          if (devEl) { devEl.style.opacity = '0.6'; setTimeout(function () { devEl.style.opacity = '1'; }, 100); }
          _despawnPacket(dot);
        });
      });
    }, 200);

    // Phase 4 — unicast reply (300ms) from dst
    setTimeout(function () {
      if (spec.failedAt) {
        _failDevice(spec.failedAt, spec.failReason);
        _appendLogEntry({
          ts: Date.now(),
          protocol: 'arp',
          text: _reachReasonText(spec.failedAt, spec.failReason, srcId, dstId),
          failure: true,
        });
        if (spec.onComplete) spec.onComplete();
        return;
      }
      var dstCenter = _devCenter(dstId);
      if (!dstCenter) { if (spec.onComplete) spec.onComplete(); return; }
      var reply = _spawnPacketSvg('oklch(0.74 0.13 65)');
      _movePacket(reply, dstCenter, srcCenter, 300, function () {
        _despawnPacket(reply);
        _appendLogEntry({ ts: Date.now(), protocol: 'arp', text: dstId + ' replies: ' + (dstIp || '?') + ' is at <mac>', failure: false });
        if (spec.onComplete) spec.onComplete();
      });
    }, 600);
  }
  function _motionDhcp(spec) {
    var clientId = spec.path[0];
    var serverId = spec.path[spec.path.length - 1];
    var clientCenter = _devCenter(clientId);
    var serverCenter = _devCenter(serverId);
    var color = 'oklch(0.62 0.16 250)';
    if (!clientCenter || !serverCenter) { if (spec.onComplete) spec.onComplete(); return; }

    if (_reducedMotion()) {
      _appendLogEntry({ ts: Date.now(), protocol: 'dhcp', text: 'DISCOVER broadcast from ' + clientId, failure: false });
      setTimeout(function () {
        _appendLogEntry({ ts: Date.now(), protocol: 'dhcp', text: 'OFFER from ' + serverId, failure: false });
      }, 50);
      setTimeout(function () {
        _appendLogEntry({ ts: Date.now(), protocol: 'dhcp', text: 'REQUEST broadcast from ' + clientId, failure: false });
      }, 100);
      setTimeout(function () {
        _appendLogEntry({ ts: Date.now(), protocol: 'dhcp', text: 'ACK from ' + serverId + ' · lease confirmed', failure: false });
        if (spec.onComplete) spec.onComplete();
      }, 150);
      return;
    }

    function broadcastBurst(centerPt, durMs, done) {
      var svg = document.getElementById('tb3-canvas-svg');
      var ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', centerPt.x);
      ring.setAttribute('cy', centerPt.y);
      ring.setAttribute('r', '6');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', color);
      ring.setAttribute('stroke-width', '2');
      ring.setAttribute('class', 'tb3-packet');
      svg.appendChild(ring);
      var start = performance.now();
      function tick(now) {
        var t = Math.min(1, (now - start) / durMs);
        ring.setAttribute('r', String(6 + t * 90));
        ring.setAttribute('opacity', String(1 - t));
        if (t < 1) requestAnimationFrame(tick);
        else { _despawnPacket(ring); if (done) done(); }
      }
      requestAnimationFrame(tick);
    }

    function unicast(fromPt, toPt, durMs, done) {
      var dot = _spawnPacketSvg(color);
      _movePacket(dot, fromPt, toPt, durMs, function () { _despawnPacket(dot); if (done) done(); });
    }

    // D — Discover (broadcast)
    _appendLogEntry({ ts: Date.now(), protocol: 'dhcp', text: 'DISCOVER broadcast from ' + clientId, failure: false });
    broadcastBurst(clientCenter, 500, function () {
      setTimeout(function () {
        // O — Offer (unicast)
        _appendLogEntry({ ts: Date.now(), protocol: 'dhcp', text: 'OFFER from ' + serverId, failure: false });
        unicast(serverCenter, clientCenter, 500, function () {
          setTimeout(function () {
            // R — Request (broadcast)
            _appendLogEntry({ ts: Date.now(), protocol: 'dhcp', text: 'REQUEST broadcast from ' + clientId, failure: false });
            broadcastBurst(clientCenter, 500, function () {
              setTimeout(function () {
                // A — Ack (unicast)
                if (spec.failedAt) {
                  _failDevice(spec.failedAt, spec.failReason);
                  _appendLogEntry({
                    ts: Date.now(),
                    protocol: 'dhcp',
                    text: _reachReasonText(spec.failedAt, spec.failReason, clientId, serverId),
                    failure: true,
                  });
                  if (spec.onComplete) spec.onComplete();
                  return;
                }
                _appendLogEntry({ ts: Date.now(), protocol: 'dhcp', text: 'ACK from ' + serverId + ' · lease confirmed', failure: false });
                unicast(serverCenter, clientCenter, 500, function () {
                  if (spec.onComplete) spec.onComplete();
                });
              }, 120);
            });
          }, 120);
        });
      }, 120);
    });
  }

  function _appendLogEntry(entry) {
    // entry = { ts, protocol, text, failure?, pair? }
    _simState.log.push(entry);
    if (_simState.log.length > 200) _simState.log.shift();
    _renderSimLog();
  }

  function _renderSimLog() {
    var host = document.getElementById('tb3-sim-log');
    if (!host) return;
    if (_simState.log.length === 0) {
      host.innerHTML = '<div class="tb3-sim-log-empty">No packets fired yet.</div>';
      return;
    }
    // data-log-idx on each row maps back to _simState.log[idx]; rows that carry
    // a .pair field (validator-preview entries) are re-playable via the logHost
    // click handler wired in _wireSimulate (Task 9.3).
    var rows = _simState.log.map(function (entry, idx) {
      var date = new Date(entry.ts);
      var ts = ('0' + date.getHours()).slice(-2) + ':' +
               ('0' + date.getMinutes()).slice(-2) + ':' +
               ('0' + date.getSeconds()).slice(-2) + '.' +
               ('00' + date.getMilliseconds()).slice(-3);
      var cls = 'tb3-sim-log-row' + (entry.failure ? ' fail' : '');
      var prefix = entry.failure ? '✗' : '·';
      var traceChevron = (entry.failure && entry.pair)
        ? '<button class="tb3-sim-log-trace-this" data-log-idx="' + idx + '" aria-label="Trace this">→ Trace</button>'
        : '';
      return '<div class="' + cls + '" data-log-idx="' + idx + '">' +
               '<span class="tb3-sim-log-prefix">' + prefix + '</span>' +
               '<span class="tb3-sim-log-ts">' + ts + '</span>' +
               '<span class="tb3-sim-log-text">' + _escAttr(entry.text) + '</span>' +
               traceChevron +
             '</div>';
    }).join('');
    host.innerHTML = rows;
    host.scrollTop = host.scrollHeight;
  }

  function _runValidatorPreview() {
    var scen = TB_V3_SCENARIOS.find(function (s) { return s.id === state.activeScenarioId; });
    if (!scen || !scen.completion) return;

    var completion = scen.completion;
    var reach = computeReachability(state, completion);
    var failures = (reach && reach.failures) || [];

    // Build the pair queue from required cables.
    var queue = [];
    (completion.requiredCables || []).forEach(function (req, idx) {
      // Smart-pick: first device of fromType + first device of toType
      var srcDev = state.devices.find(function (d) { return d.type === req.from; });
      var dstDev = state.devices.find(function (d) { return d.type === req.to && d.id !== (srcDev && srcDev.id); });
      if (!srcDev || !dstDev) return;
      var fail = failures.find(function (f) { return f.from === srcDev.id && f.to === dstDev.id; });
      queue.push({
        idx: idx,
        pair: { fromType: req.from, toType: req.to },
        srcId: srcDev.id,
        dstId: dstDev.id,
        protocol: 'ping',
        expected: fail ? 'fail' : 'ok',
        failedAt: fail ? fail.failedAt : null,
        failReason: fail ? fail.reason : null,
      });
    });

    if (queue.length === 0) return;

    _simState.previewQueue = queue;
    _simState.playing = true;
    _setPreviewHeader('running');

    _runNextPreviewPair();
  }

  function _runNextPreviewPair() {
    if (!_simState.playing || _simState.previewQueue.length === 0) {
      _simState.playing = false;
      _setPreviewHeader('idle');
      return;
    }
    var pair = _simState.previewQueue.shift();
    var path;
    if (pair.expected === 'fail') {
      path = [pair.srcId, pair.failedAt];
    } else {
      var result = computePath(pair.srcId, pair.dstId, state);
      path = result.ok ? result.hops : [pair.srcId, pair.dstId];
    }
    _animatePacket({
      path: path,
      protocol: pair.protocol,
      failedAt: pair.expected === 'fail' ? pair.failedAt : null,
      failReason: pair.failReason,
      onLog: _appendLogEntry,
      onComplete: function () {
        _appendLogEntry({
          ts: Date.now(),
          protocol: pair.protocol,
          text: pair.expected === 'ok'
            ? (pair.srcId + ' → ' + pair.dstId + ' · ' + pair.protocol + ' reached')
            : (pair.srcId + ' → ' + pair.dstId + ' · stopped at ' + pair.failedAt),
          failure: pair.expected === 'fail',
          pair: { path: path, protocol: pair.protocol, failedAt: pair.failedAt, failReason: pair.failReason },
        });
        var gap = _reducedMotion() ? 200 : 600;
        setTimeout(_runNextPreviewPair, gap);
      },
    });
  }

  function _setPreviewHeader(state_) {
    var section = document.getElementById('tb3-sim-preview-section');
    if (!section) return;
    var btn = section.querySelector('#tb3-sim-preview-btn');
    if (!btn) return;
    if (state_ === 'running') {
      btn.textContent = 'Stop';
      btn.classList.add('is-running');
    } else {
      btn.textContent = 'Replay validator paths';
      btn.classList.remove('is-running');
    }
  }

  function _wireSimulate() {
    var panel = document.getElementById('tb3-simulate-panel');
    if (!panel) return;
    var closeBtn = panel.querySelector('#tb3-sim-close');
    if (closeBtn) closeBtn.onclick = _closeSimulate;
    var src = panel.querySelector('#tb3-sim-src');
    if (src) src.onchange = function () {
      _simState.drillSrcId = src.value || null;
      _updateSendEnabled();
    };
    var dst = panel.querySelector('#tb3-sim-dst');
    if (dst) dst.onchange = function () {
      _simState.drillDstId = dst.value || null;
      _updateSendEnabled();
    };
    panel.querySelectorAll('.tb3-sim-proto').forEach(function (btn) {
      btn.onclick = function () {
        _simState.drillProtocol = btn.getAttribute('data-proto');
        panel.querySelectorAll('.tb3-sim-proto').forEach(function (b) {
          b.classList.toggle('on', b === btn);
        });
      };
    });
    var sendBtn = panel.querySelector('#tb3-sim-send');
    if (sendBtn) sendBtn.onclick = _onDrillSend;
    var previewBtn = panel.querySelector('#tb3-sim-preview-btn');
    if (previewBtn) {
      previewBtn.onclick = function () {
        if (_simState.playing) {
          _simState.playing = false;
          _simState.previewQueue = [];
          if (_simState.currentPacket) cancelAnimationFrame(_simState.currentPacket);
          _setPreviewHeader('idle');
        } else {
          _runValidatorPreview();
        }
      };
    }
    var logHost = panel.querySelector('#tb3-sim-log');
    if (logHost) {
      logHost.onclick = function (e) {
        // Trace chevron branch — must come before the re-play branch.
        var traceBtn = e.target.closest('.tb3-sim-log-trace-this');
        if (traceBtn) {
          var idx = parseInt(traceBtn.dataset.logIdx, 10);
          var entry = _simState.log[idx];
          if (!entry || !entry.pair) return;
          var payload = {
            srcId: entry.pair.path[0],
            dstId: entry.pair.path[entry.pair.path.length - 1],
            protocol: entry.protocol
          };
          _openTrace(payload);
          return;
        }
        // Re-play the pair via _animatePacket.
        var row = e.target.closest('.tb3-sim-log-row');
        if (!row) return;
        var idx = parseInt(row.getAttribute('data-log-idx'), 10);
        if (isNaN(idx)) return;
        var entry = _simState.log[idx];
        if (!entry || !entry.pair) return;
        _animatePacket({
          path: entry.pair.path,
          protocol: entry.pair.protocol,
          failedAt: entry.pair.failedAt,
          failReason: entry.pair.failReason,
          onLog: _appendLogEntry,
        });
      };
    }
  }

  function _onDrillSend() {
    if (!_simState.drillSrcId || !_simState.drillDstId) return;
    if (_simState.drillSrcId === _simState.drillDstId) return;
    var result = computePath(_simState.drillSrcId, _simState.drillDstId, state);
    // computePath returns {ok, hops?, reason?, failedAt?} — hops is the path array
    var path = result.ok ? result.hops : (result.hops || [_simState.drillSrcId]);
    _animatePacket({
      path: path,
      protocol: _simState.drillProtocol,
      failedAt: result.ok ? null : result.failedAt,
      failReason: result.ok ? null : result.reason,
      onLog: _appendLogEntry,
    });
  }

  function _wireGlobalKeys() {
    document.addEventListener('keydown', function (e) {
      if (!document.getElementById('page-topology-builder-v3').classList.contains('active')) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedId) {
          e.preventDefault();
          _deleteSelected();
        }
      }
      if (e.key === 'Escape') {
        var body = document.getElementById('tb3-body');
        if (body && body.classList.contains('simulate-open')) {
          _closeSimulate();
          return;
        }
        if (body && body.classList.contains('osi-open')) {
          _closeOSI();
          return;
        }
        if (body && body.classList.contains('trace-open')) { _closeTrace(); return; }
        if (body && body.classList.contains('diagnostic-open')) { _closeDiagnostic(); return; }
        if (document.getElementById('tb3-body').classList.contains('picker-open')) {
          _closePicker();
          return;
        }
        if (state.selectedId) {
          state.selectedId = null;
          _renderCanvas();
          _renderInspector();
          _updateSelectionChip();
        }
      }
    });
  }

  // ───────────────────────────────────────────────────────────
  // MODE BAR + INTENT CHIP (TASK 7.x)
  // ───────────────────────────────────────────────────────────

  function _renderIntentChip() {
    var nameEl = document.getElementById('tb3-intent-name');
    var lblEl = nameEl ? nameEl.parentElement.querySelector('.tb3-intent-lbl') : null;
    var chip = document.getElementById('tb3-intent-chip');
    if (!nameEl || !chip) return;

    if (state.intent === 'lab' && state.activeScenarioId) {
      var scen = TB_V3_SCENARIOS.find(function (s) { return s.id === state.activeScenarioId; });
      nameEl.textContent = scen ? 'Lab · ' + scen.title : 'Lab';
      if (lblEl) lblEl.textContent = 'Intent';
      chip.classList.add('lab');
    } else {
      nameEl.textContent = 'Free Build';
      if (lblEl) lblEl.textContent = 'Intent';
      chip.classList.remove('lab');
    }
  }

  function _wireIntent() {
    var chip = document.getElementById('tb3-intent-chip');
    if (!chip) return;
    chip.addEventListener('click', function () {
      if (state.intent === 'lab') {
        var restored = restoreFreeBuild();
        if (restored) {
          state = restored;
        } else {
          state = {
            devices: [], cables: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            intent: 'free-build', mode: 'design',
            selectedId: null, activeScenarioId: null,
          };
        }
        _renderCanvas();
        _renderMinimap();
        _updateDeviceCount();
        _renderInspector();
        _renderIntentChip();
        _renderPickerPanel();
        _saveState();
        _renderCompletionPill();
      }
    });
  }

  function _renderModeBar() {
    var row = document.getElementById('tb3-modes-row');
    if (!row) return;
    var modes = [
      { id: 'design',   label: 'Design',   icon: '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',           locked: false },
      { id: 'simulate', label: 'Simulate', icon: '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M12 5v14"/></svg>' },
      { id: 'trace',    label: 'Trace',    icon: '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12c4 0 4-7 8-7s4 14 8 14"/></svg>' },
      { id: 'osi',      label: 'OSI',      icon: '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M3 10h18M3 14h18M3 18h18"/></svg>' },
      { id: '3d',       label: '3D',       icon: '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',                                                                                                       locked: false },
    ];
    var html = modes.map(function (m) {
      var on = (m.id === state.mode);
      return '<div class="tb3-mode' + (on ? ' on' : '') + (m.locked ? ' locked' : '') + '" data-mode="' + m.id + '" title="' + (m.locked ? m.label + ' — coming soon' : m.label) + '">' + m.icon + m.label + '</div>';
    }).join('');
    row.innerHTML = html;

    // Wire mode clicks (Phase 1 only Design works)
    row.querySelectorAll('.tb3-mode').forEach(function (el) {
      el.addEventListener('click', function () {
        if (el.classList.contains('locked')) return;
        var mode = el.getAttribute('data-mode');
        if (mode === 'simulate') {
          _openSimulate();
          return;
        }
        if (mode === 'trace') {
          _openTrace();
          return;
        }
        if (mode === 'osi') {
          _openOSI();
          return;
        }
        if (mode === '3d') {
          // Phase 7 v2: 3D is a popup, NOT a mode — do NOT modify state.mode
          _open3DPopup();
          return;
        }
        if (mode === state.mode) return;
        state.mode = mode;
        _renderModeBar();
        _updateStatus('mode-change', mode);
        _saveState();
        _renderCompletionPill();
      });
    });
  }

  // ───────────────────────────────────────────────────────────
  // EXPORT (TASK 8.x)
  // ───────────────────────────────────────────────────────────

  function _exportPng() {
    var svg = document.getElementById('tb3-canvas-svg');
    if (!svg) return;

    // Serialise SVG to string
    var serializer = new XMLSerializer();
    var svgString = serializer.serializeToString(svg);
    // Inject the computed style colors into the serialized SVG so the export
    // matches what's on screen (var(--tb3-*) won't resolve outside the page).
    // Simplest approach: compute colors from the page's CSS and substitute.
    var wrap = document.getElementById('tb3-canvas-wrap');
    var styles = getComputedStyle(wrap);
    var bg = styles.backgroundColor;
    // For Phase 1 export: rasterise via canvas, accept that backgrounds may
    // come through as transparent. Bronze accent and text colors are inherited
    // through the SVG attributes (we set fill/stroke explicitly).

    var img = new Image();
    var blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = svg.clientWidth * 2;  // 2x for retina
      canvas.height = svg.clientHeight * 2;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = bg || '#161616';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob(function (pngBlob) {
        var pngUrl = URL.createObjectURL(pngBlob);
        var a = document.createElement('a');
        a.href = pngUrl;
        a.download = 'topology-' + Date.now().toString(36) + '.png';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(pngUrl); }, 1000);
      }, 'image/png');
    };
    img.src = url;
  }

  function _wireExport() {
    var btn = document.getElementById('tb3-export-btn');
    if (!btn) return;
    btn.addEventListener('click', _exportPng);
  }

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
    // Phase 3 — IP auto-fill + reachability engine
    _autoFillIp: _autoFillIp,
    parseCidr: parseCidr,
    inSameSubnet: inSameSubnet,
    routeNextHop: routeNextHop,
    computePath: computePath,
    computeReachability: computeReachability,
    // Scenarios (phase 2)
    TB_V3_SCENARIOS: TB_V3_SCENARIOS,
    validateScenarioShape: validateScenarioShape,
    loadScenarioOnCanvas: loadScenarioOnCanvas,
    checkCompletion: checkCompletion,
    backupFreeBuild: backupFreeBuild,
    restoreFreeBuild: restoreFreeBuild,
    // State access (for tests)
    _getState: function () { return state; },
    _setState: function (s) { state = s; },
    // Exposed for Playwright tests — synthetic keydown delivery to the
    // document-level _wireGlobalKeys listener is unreliable across Chromium
    // versions, so test 07 calls this directly. Same _-prefix precedent as
    // _getState/_setState.
    _deleteSelected: function () { _deleteSelected(); },
    _loadScenario: function (id) { _onPickerRowActivate(id); },
    _openPicker: _openPicker,
    _closePicker: _closePicker,
    _renderCompletionPill: _renderCompletionPill,
    _openDiagnostic: _openDiagnostic,
    _closeDiagnostic: _closeDiagnostic,
    _renderDiagnosticDrawer: _renderDiagnosticDrawer,
    // Phase 4 — Simulate mode (exposed for Playwright tests 28-35)
    _renderCanvas: function () { _renderCanvas(); },
    _closeSimulate: function () { _closeSimulate(); },
    // Phase 5 — Trace mode
    _openTrace: _openTrace,
    _closeTrace: function () { _closeTrace(); },
    _startTrace: _startTrace,
    _stepTrace: _stepTrace,
    _playTrace: _playTrace,
    _pauseTrace: _pauseTrace,
    _endTrace: _endTrace,
    _openOSI: _openOSI,
    _closeOSI: function () { _closeOSI(); },
    // Phase 7 v2 — 3D popup test exposures
    _open3DPopup: _open3DPopup,
    _close3DPopup: function () { _close3DPopup(); },
    // Phase 6 — OSI mode test exposures
    _genMockMac: _genMockMac,
    _activeLayersForDev: _activeLayersForDev,
    _failedReasonToLayer: _failedReasonToLayer,
    _getTraceState: function () { return _traceState; },
    _setTraceSrcDst: function (srcId, dstId) {
      if (!_traceState) return;
      _traceState.srcId = srcId;
      _traceState.dstId = dstId;
    },
  };

  // Also expose openTopologyBuilderV3 directly on window for the sidebar handler
  window.openTopologyBuilderV3 = openTopologyBuilderV3;
})();
