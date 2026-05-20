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
    activeScenarioId: null, // phase 2: id of currently-loaded scenario when intent === 'lab'
  };

  // ───────────────────────────────────────────────────────────
  // CSS LOADING (single-call from enter())
  // ───────────────────────────────────────────────────────────

  // CSS revision counter — manually bumped after each CSS edit during dev
  // iteration. Forces SW + browser cache miss on the .css URL even when
  // APP_VERSION hasn't changed. After v3 ships in a version-bump cycle,
  // APP_VERSION will be the canonical cache key and this constant can be
  // retired (or kept at .0 forever).
  var TB3_CSS_REV = 'r5'; // phase 2 bumps for picker panel + intent chip CSS appended in this stage

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
      activeScenarioId: s.activeScenarioId || null,
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
      };
    } catch (e) {
      return { devices: [], cables: [], viewport: { x: 0, y: 0, zoom: 1 }, intent: 'free-build', mode: 'design', selectedId: null, activeScenarioId: null };
    }
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
      title: 'Star topology with central switch',
      category: 'topology',
      objectiveRefs: ['1.2', '2.1'],
      startingState: {
        devices: [
          { id: 'sc_star_1', type: 'switch',      x: 600, y: 360, label: 'SW1' },
          { id: 'sc_star_2', type: 'server',      x: 360, y: 200, label: 'SRV-01' },
          { id: 'sc_star_3', type: 'workstation', x: 360, y: 520, label: 'WS-01' },
          { id: 'sc_star_4', type: 'workstation', x: 840, y: 520, label: 'WS-02' },
          { id: 'sc_star_5', type: 'workstation', x: 840, y: 200, label: 'WS-03' },
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
        requiredDevices: ['switch','server','workstation'],
        expectedCount:   { switch:1, server:1, workstation:3 },
        requiredCables:  [
          { from:'switch', to:'server' },
          { from:'switch', to:'workstation' },
        ],
      },
    },
    {
      id: 'mesh-topology',
      title: 'Full mesh topology (4 nodes)',
      category: 'topology',
      objectiveRefs: ['1.2'],
      startingState: {
        devices: [
          { id: 'sc_mesh_1', type: 'router', x: 360, y: 200, label: 'R1' },
          { id: 'sc_mesh_2', type: 'router', x: 840, y: 200, label: 'R2' },
          { id: 'sc_mesh_3', type: 'router', x: 360, y: 520, label: 'R3' },
          { id: 'sc_mesh_4', type: 'router', x: 840, y: 520, label: 'R4' },
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
      title: '3-tier hierarchical (core / distribution / access)',
      category: 'architecture',
      objectiveRefs: ['1.6'],
      startingState: {
        devices: [
          { id: 'sc_3tier_core1',  type: 'l3-switch',   x: 600, y: 160, label: 'CORE-1' },
          { id: 'sc_3tier_dist1',  type: 'l3-switch',   x: 360, y: 340, label: 'DIST-1' },
          { id: 'sc_3tier_dist2',  type: 'l3-switch',   x: 840, y: 340, label: 'DIST-2' },
          { id: 'sc_3tier_acc1',   type: 'switch',      x: 240, y: 540, label: 'ACC-1' },
          { id: 'sc_3tier_acc2',   type: 'switch',      x: 480, y: 540, label: 'ACC-2' },
          { id: 'sc_3tier_acc3',   type: 'switch',      x: 720, y: 540, label: 'ACC-3' },
          { id: 'sc_3tier_acc4',   type: 'switch',      x: 960, y: 540, label: 'ACC-4' },
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
      title: 'Hub-and-spoke WAN with branch routers',
      category: 'wan',
      objectiveRefs: ['1.6', '2.1'],
      startingState: {
        devices: [
          { id: 'sc_hns_hub',  type: 'router', x: 600, y: 300, label: 'HQ' },
          { id: 'sc_hns_b1',   type: 'router', x: 320, y: 200, label: 'BR-1' },
          { id: 'sc_hns_b2',   type: 'router', x: 320, y: 400, label: 'BR-2' },
          { id: 'sc_hns_b3',   type: 'router', x: 880, y: 200, label: 'BR-3' },
          { id: 'sc_hns_b4',   type: 'router', x: 880, y: 400, label: 'BR-4' },
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
      title: 'Hybrid cloud (on-prem + public cloud)',
      category: 'cloud',
      objectiveRefs: ['1.8'],
      startingState: {
        devices: [
          { id: 'sc_hyb_onprem_sw', type: 'switch',   x: 320, y: 360, label: 'ONPREM-SW' },
          { id: 'sc_hyb_onprem_fw', type: 'firewall', x: 520, y: 360, label: 'EDGE-FW' },
          { id: 'sc_hyb_vpn',       type: 'vpn',      x: 720, y: 360, label: 'IPSEC-VPN' },
          { id: 'sc_hyb_cloud',     type: 'cloud',    x: 920, y: 360, label: 'AWS-VPC' },
          { id: 'sc_hyb_srv',       type: 'server',   x: 320, y: 180, label: 'APP-01' },
          { id: 'sc_hyb_ws',        type: 'workstation', x: 320, y: 540, label: 'WS-01' },
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
      title: 'Wireless infrastructure (BSS + ESS) with controller',
      category: 'wireless',
      objectiveRefs: ['2.4'],
      startingState: {
        devices: [
          { id: 'sc_wls_wlc', type: 'wlc',        x: 600, y: 180, label: 'WLC-01' },
          { id: 'sc_wls_sw',  type: 'switch',     x: 600, y: 360, label: 'CORE-SW' },
          { id: 'sc_wls_ap1', type: 'ap',         x: 360, y: 540, label: 'AP-01' },
          { id: 'sc_wls_ap2', type: 'ap',         x: 600, y: 540, label: 'AP-02' },
          { id: 'sc_wls_ap3', type: 'ap',         x: 840, y: 540, label: 'AP-03' },
          { id: 'sc_wls_cli1',type: 'smartphone', x: 280, y: 700, label: 'PHONE' },
          { id: 'sc_wls_cli2',type: 'laptop',     x: 520, y: 700, label: 'LAPTOP' },
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
        requiredDevices: ['wlc','switch','ap'],
        expectedCount:   { wlc:1, switch:1, ap:3 },
        requiredCables:  [
          { from:'wlc',    to:'switch' },
          { from:'switch', to:'ap' },
        ],
      },
    },
    {
      id: 'dmz-screened-subnet',
      title: 'DMZ / screened subnet',
      category: 'security',
      objectiveRefs: ['1.6', '4.1'],
      startingState: {
        devices: [
          { id: 'sc_dmz_internet', type: 'internet', x: 600, y: 100, label: 'INTERNET' },
          { id: 'sc_dmz_outerfw',  type: 'firewall', x: 600, y: 260, label: 'OUTER-FW' },
          { id: 'sc_dmz_dmzsrv',   type: 'server',   x: 380, y: 400, label: 'WEB-DMZ' },
          { id: 'sc_dmz_dmzsrv2',  type: 'server',   x: 820, y: 400, label: 'MAIL-DMZ' },
          { id: 'sc_dmz_innerfw',  type: 'firewall', x: 600, y: 560, label: 'INNER-FW' },
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
      title: 'Router-on-a-stick (inter-VLAN routing)',
      category: 'vlan',
      objectiveRefs: ['2.1', '2.3'],
      startingState: {
        devices: [
          { id: 'sc_roas_router', type: 'router', x: 600, y: 200, label: 'R1' },
          { id: 'sc_roas_switch', type: 'switch', x: 600, y: 380, label: 'SW1' },
          { id: 'sc_roas_v10_a',  type: 'workstation', x: 320, y: 560, label: 'VLAN10-A' },
          { id: 'sc_roas_v10_b',  type: 'workstation', x: 480, y: 560, label: 'VLAN10-B' },
          { id: 'sc_roas_v20_a',  type: 'workstation', x: 720, y: 560, label: 'VLAN20-A' },
          { id: 'sc_roas_v20_b',  type: 'workstation', x: 880, y: 560, label: 'VLAN20-B' },
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
        requiredDevices: ['router','switch','workstation'],
        expectedCount:   { router:1, switch:1, workstation:4 },
        requiredCables:  [
          { from:'router', to:'switch' },
          { from:'switch', to:'workstation' },
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
        return { id: d.id, type: d.type, x: d.x, y: d.y, label: d.label || '', config: d.config || {} };
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

    return {
      complete: missingDevices.length === 0 && deviceCountMismatch.length === 0 && missingCables.length === 0,
      missingDevices: missingDevices,
      deviceCountMismatch: deviceCountMismatch,
      missingCables: missingCables,
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
        _renderCompletionPill();
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
      _renderCompletionPill();
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
    insp.innerHTML =
      '<div style="display:flex;flex-direction:column;gap:14px">' +
        '<div>' +
          '<div style="font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--tb3-text-dim);margin-bottom:6px">Inspector</div>' +
          '<h3 style="font-family:Fraunces,Georgia,serif;font-weight:600;font-size:18px;letter-spacing:-.01em;margin:0;color:var(--tb3-text);text-transform:none">' + def.label + '</h3>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
          '<label style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--tb3-text-dim)">Label</label>' +
          '<input type="text" id="tb3-insp-label" value="' + _escAttr(dev.label || '') + '" style="background:var(--tb3-surface);border:1px solid var(--tb3-border);border-radius:6px;padding:8px 10px;color:var(--tb3-text);font-size:13px;font-family:Inter">' +
        '</div>' +
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
      var missing = (res.missingDevices.length + res.deviceCountMismatch.length + res.missingCables.length);
      pill.textContent = missing + ' to go';
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
    // Phase 2 backup-on-load logic lands in Stage 7. For Stage 3 we just load.
    state = loadScenarioOnCanvas(state, scenario);
    _renderCanvas();
    _renderMinimap();
    _updateDeviceCount();
    _renderInspector();
    _renderModeBar();        // re-render so intent chip can pick up state.intent (wired Stage 4)
    _renderPickerPanel();    // re-render so the picked row gets '.on'
    _renderIntentChip();     // Task 4.1 (phase 2) — update chip to Lab · {title}
    _saveState();
    _renderCompletionPill();
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
      { id: 'simulate', label: 'Simulate', icon: '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M12 5v14"/></svg>',                                                                                                                                                                       locked: true },
      { id: 'trace',    label: 'Trace',    icon: '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12c4 0 4-7 8-7s4 14 8 14"/></svg>',                                                                                                                                                          locked: true },
      { id: 'osi',      label: 'OSI',      icon: '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M3 10h18M3 14h18M3 18h18"/></svg>',                                                                                                                                                       locked: true },
      { id: '3d',       label: '3D',       icon: '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',                                                                                                       locked: true },
    ];
    var html = modes.map(function (m) {
      var on = (m.id === state.mode);
      return '<div class="tb3-mode' + (on ? ' on' : '') + (m.locked ? ' locked' : '') + '" data-mode="' + m.id + '" title="' + (m.locked ? m.label + ' — phase ' + ({'simulate':3,'trace':4,'osi':5,'3d':6}[m.id]) : m.label) + '">' + m.icon + m.label + '</div>';
    }).join('');
    row.innerHTML = html;

    // Wire mode clicks (Phase 1 only Design works)
    row.querySelectorAll('.tb3-mode').forEach(function (el) {
      el.addEventListener('click', function () {
        if (el.classList.contains('locked')) return;
        var mode = el.getAttribute('data-mode');
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
  };

  // Also expose openTopologyBuilderV3 directly on window for the sidebar handler
  window.openTopologyBuilderV3 = openTopologyBuilderV3;
})();
