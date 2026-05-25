// ════════════════════════════════════════════════════════════════════
// TB v3 Walkthroughs — pilot content for Phase 8
// Each entry: { id, scenarioId, title, brief, durationMin, domainTags?, steps[] }
// Step shapes:
//   { id, type: 'narrate',   title, body }
//   { id, type: 'highlight', title, body, target, cameraIn3D? }
//   { id, type: 'flow',      title, body, flow }
// See: docs/superpowers/specs/2026-05-25-tb-v3-walkthrough-design.md §2
// ════════════════════════════════════════════════════════════════════

var TB_V3_WALKTHROUGHS = [
  {
    id: 'home-network-comms',
    scenarioId: 'home-network',
    title: 'How devices communicate',
    brief: 'Follow a packet from your laptop to the internet and back through the home router.',
    durationMin: 5,
    // domainTags omitted -> inherits Networking Concepts from scenario.objectiveRefs ['1.6']
    steps: [
      {
        id: 's1',
        type: 'narrate',
        title: 'Your devices form a local network',
        body: 'Every device on the canvas shares one private subnet (192.168.0.0/24). The router stitches that subnet to the outside world. Watch how one packet moves across it.',
      },
      {
        id: 's2',
        type: 'highlight',
        title: 'Meet the router',
        body: 'The router is the traffic director for the whole house. It hands out IP addresses through DHCP and rewrites private addresses to your one public address using NAT.',
        target: { kind: 'device', id: 'sc_hn_rtr' },
      },
      {
        id: 's3',
        type: 'highlight',
        title: 'Meet the ISP link',
        body: 'The cloud node represents your ISP, where every outbound packet exits. The fiber drop from the ISP is the only path off your local subnet.',
        target: { kind: 'device', id: 'sc_hn_isp' },
      },
      {
        id: 's4',
        type: 'flow',
        title: 'A packet to the internet',
        body: 'The laptop sends a request for a website. It travels through the Wi-Fi access point, hops to the router, and the router NATs it onto the ISP link.',
        flow: {
          from: 'sc_hn_lap',
          to: 'sc_hn_isp',
          via: ['sc_hn_ap', 'sc_hn_rtr'],
        },
      },
      {
        id: 's5',
        type: 'flow',
        title: 'The reply comes back',
        body: 'The website responds. The router reverses the NAT translation, looks up the laptop on the local subnet, and forwards the reply back over Wi-Fi.',
        flow: {
          from: 'sc_hn_isp',
          to: 'sc_hn_lap',
          via: ['sc_hn_rtr', 'sc_hn_ap'],
        },
      },
      {
        id: 's6',
        type: 'narrate',
        title: 'That is the whole shape',
        body: 'Every phone, console, and smart TV on this canvas uses the same path: client to access point to router to ISP. One flat subnet, one gateway, one public address.',
      },
    ],
  },
];
