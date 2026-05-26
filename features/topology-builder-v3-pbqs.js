// ════════════════════════════════════════════════════════════════════
// TB v3 Phase 9 — PBQ Catalog
// Performance-Based Question lessons authored from each of the 42
// existing TB v3 walkthroughs as a 42→42 mapping. PBQs add the
// exam-format layer (Coach pedagogy mechanic) on top of the walkthrough
// catalog. v1 MVP authors only `soho-network-converged`; the remaining
// 41 ship in later phases.
//
// PBQ shape: { id, certPack, objective, difficulty, task, steps[] }
// Step shape: { id, instruction, check(state)=>bool, hints[3], aiPromptSeed }
//
// Spec: docs/superpowers/specs/2026-05-26-tb-v3-coach-design.md §3.1
// Pattern matches features/topology-builder-v3-walkthroughs.js (plain var).
// ════════════════════════════════════════════════════════════════════

var PBQ_VERSION = '1.0.0';

var TB_V3_PBQS = [
  {
    id: 'soho-network-converged',
    certPack: 'netplus',
    objective: '1.6 Common SOHO network',
    difficulty: 'beginner',
    task: 'Build a SOHO topology. One router does routing, switching, DHCP, and NAT. Connect four endpoints. The router faces the ISP link upstream.',
    steps: [
      {
        id: 's1',
        instruction: 'Place the SOHO router at the centre of the canvas.',
        check: function (state) {
          return state && state.devices && state.devices.some(function (d) {
            return d.type === 'soho-router';
          });
        },
        hints: [
          'Look in the device palette for a router.',
          'Drag the SOHO router into the centre of the canvas.',
          "You don't need a separate switch. The SOHO router is converged.",
        ],
        aiPromptSeed: 'Student is on step "place SOHO router" and stuck after 3 hints. Their canvas: {{state}}. Help them place a single router and explain SOHO convergence in 1–2 short paragraphs.',
      },
      {
        id: 's2',
        instruction: 'Add four endpoints (PCs, phone, printer) around the router.',
        check: function (state) {
          if (!state || !state.devices) return false;
          return state.devices.filter(function (d) {
            return ['pc', 'phone', 'printer', 'endpoint'].indexOf(d.type) >= 0;
          }).length >= 4;
        },
        hints: [
          'Endpoints are the devices that consume the network: PCs, phones, printers.',
          'Drag four endpoints from the palette. A mix of types is fine.',
          'They go around the router, not on top of it. Space them out.',
        ],
        aiPromptSeed: 'Student is on step "add four endpoints" and stuck after 3 hints. Canvas: {{state}}. Help them understand what counts as an endpoint and that four is the target.',
      },
      {
        id: 's3',
        instruction: "Wire each endpoint to one of the router's LAN ports.",
        check: function (state) {
          if (!state || !state.devices || !state.cables) return false;
          var router = state.devices.find(function (d) { return d.type === 'soho-router'; });
          if (!router) return false;
          return state.cables.filter(function (c) {
            return c.from === router.id || c.to === router.id;
          }).length >= 4;
        },
        hints: [
          'Click an endpoint, then click the router to draw a cable.',
          'Each cable connects one endpoint to a LAN port on the router.',
          'Four endpoints means four cables to the router.',
        ],
        aiPromptSeed: 'Student is on step "wire endpoints to router" and stuck after 3 hints. Canvas: {{state}}. Help them understand cable creation and LAN port assignment in TB v3.',
      },
      {
        id: 's4',
        instruction: 'Set the WAN link on the router to point to the ISP.',
        check: function (state) {
          if (!state || !state.devices || !state.cables) return false;
          var router = state.devices.find(function (d) { return d.type === 'soho-router'; });
          var isp = state.devices.find(function (d) { return d.type === 'isp'; });
          if (!router || !isp) return false;
          return state.cables.some(function (c) {
            return (c.from === router.id && c.to === isp.id) ||
                   (c.to === router.id && c.from === isp.id);
          });
        },
        hints: [
          'Add the ISP from the palette if it is not on the canvas yet.',
          'Draw a cable from the router to the ISP. This is the WAN side.',
          'The WAN link is the one cable that does not go to a LAN endpoint.',
        ],
        aiPromptSeed: 'Student is on step "WAN to ISP" and stuck after 3 hints. Canvas: {{state}}. Explain WAN vs LAN on a SOHO router in 1–2 short paragraphs.',
      },
      {
        id: 's5',
        instruction: 'Enable DHCP on the router so endpoints get IP addresses automatically.',
        check: function (state) {
          if (!state || !state.devices) return false;
          var router = state.devices.find(function (d) { return d.type === 'soho-router'; });
          return !!(router && router.config && router.config.dhcp === true);
        },
        hints: [
          'Click the router to open the Inspector.',
          'Find the DHCP toggle in the router config.',
          'Switch it on. The endpoints now get IPs from the router.',
        ],
        aiPromptSeed: 'Student is on step "enable DHCP" and stuck after 3 hints. Canvas: {{state}}. Explain why SOHO routers run DHCP and walk them through the toggle.',
      },
      {
        id: 's6',
        instruction: 'Enable NAT on the router so the LAN can reach the internet through the single ISP IP.',
        check: function (state) {
          if (!state || !state.devices) return false;
          var router = state.devices.find(function (d) { return d.type === 'soho-router'; });
          return !!(router && router.config && router.config.nat === true);
        },
        hints: [
          'NAT is in the router config alongside DHCP.',
          'Switch NAT on. The router rewrites LAN source IPs to the ISP IP on the way out.',
          "Without NAT, multiple LAN devices can't share one ISP IP.",
        ],
        aiPromptSeed: 'Student is on step "enable NAT" and stuck after 3 hints. Canvas: {{state}}. Explain NAT for a Network+ student in 1–2 short paragraphs.',
      },
    ],
  },
];
