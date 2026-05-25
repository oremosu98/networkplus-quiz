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
  {
    id: 'home-network-attacks',
    scenarioId: 'home-network',
    title: 'Common attack vectors',
    brief: 'See where outside attackers reach the home, and where local attackers pivot once they are on the Wi-Fi.',
    durationMin: 7,
    domainTags: ['Network Security'],
    steps: [
      {
        id: 's1',
        type: 'narrate',
        title: 'Same threats, smaller scale',
        body: 'A home network faces the same attack classes as an enterprise: port scans, credential stuffing, ARP spoofing, rogue access points. The shapes scale up; the names stay the same.',
      },
      {
        id: 's2',
        type: 'highlight',
        title: 'The ISP edge is the front door',
        body: 'Every internet-borne probe lands on the cloud link. Botnets sweep the public IPv4 range and knock on whatever public port your modem exposes.',
        target: { kind: 'device', id: 'sc_hn_isp' },
      },
      {
        id: 's3',
        type: 'highlight',
        title: 'The router is the firewall',
        body: 'The home router runs NAT, which drops unsolicited inbound packets by default. That single rule blocks most opportunistic scans before they reach any device on the subnet.',
        target: { kind: 'device', id: 'sc_hn_rtr' },
      },
      {
        id: 's4',
        type: 'flow',
        title: 'ARP spoofing on the LAN',
        body: 'Once an attacker joins the Wi-Fi, they broadcast forged ARP replies claiming to be the router. The laptop now sends gateway traffic to the attacker, who relays it and reads everything in the clear.',
        flow: {
          from: 'sc_hn_lap',
          to: 'sc_hn_rtr',
          direction: 'forward-back',
        },
      },
      {
        id: 's5',
        type: 'narrate',
        title: 'Defense in layers',
        body: 'WPA3 stops the attacker from joining the Wi-Fi in the first place. Firmware updates patch the router itself. A guest network isolates untrusted devices from the laptop and console.',
      },
      {
        id: 's6',
        type: 'narrate',
        title: 'Same shapes on the exam',
        body: 'The objective list calls out NAT, firewalls, WPA3, and ARP poisoning. This six-device canvas is where you can see them; the enterprise diagrams on the exam are the same pattern with more nodes.',
      },
    ],
  },
  {
    id: 'branch-office-wireless-lan',
    scenarioId: 'branch-office-wireless',
    title: 'How wireless extends the LAN',
    brief: 'See how a wireless laptop reaches a wired desktop through the WAP and switch on the same /24 LAN.',
    durationMin: 5,
    // domainTags omitted -> inherits from scenario.objectiveRefs ['2.4', '1.6']
    steps: [
      {
        id: 's1',
        type: 'narrate',
        title: 'One LAN, two media',
        body: 'Wired ports and wireless radios share the same 10.10.0.0/24 subnet here. The access point is a bridge, not a router: it has no IP routing job, it just translates Wi-Fi frames into Ethernet frames.',
      },
      {
        id: 's2',
        type: 'highlight',
        title: 'The wireless access point',
        body: 'WAP-01 is the translation layer. Radio frames arrive on the 2.4 or 5 GHz channel; the same payload leaves the wired port as a standard Ethernet frame with the original source MAC preserved.',
        target: { kind: 'device', id: 'sc_bw_ap1' },
      },
      {
        id: 's3',
        type: 'highlight',
        title: 'The switch is the backbone',
        body: 'Branch-SW carries every wireless packet once it leaves the radio. The WAP backhaul, the wired PC, and the WLC all hang off this one switch, so every cross-LAN conversation rides it at least once.',
        target: { kind: 'device', id: 'sc_bw_sw' },
      },
      {
        id: 's4',
        type: 'flow',
        title: 'A wireless laptop reaches a wired server',
        body: 'Laptop-01 sends a packet to the Reception PC. The frame crosses the air to WAP-01, hops over the WLC backhaul, then traverses Branch-SW to land on the wired port.',
        flow: {
          from: 'sc_bw_lap1',
          to: 'sc_bw_pc',
          via: ['sc_bw_ap1', 'sc_bw_wlc', 'sc_bw_sw'],
          direction: 'forward',
        },
      },
      {
        id: 's5',
        type: 'narrate',
        title: 'Why this mental model matters',
        body: 'Treat the WAP as a bridge and the picture stays simple: wireless and wired clients live on one broadcast domain, and the switch is always in the path. When the exam asks where to put an ACL or a VLAN tag, the switch is almost always the answer.',
      },
    ],
  },
  {
    id: 'dmz-defense-in-depth',
    scenarioId: 'dmz-screened-subnet',
    title: 'Defense in depth',
    brief: 'See why one firewall is not enough when public web and mail servers must coexist with an internal LAN that holds private data.',
    durationMin: 8,
    domainTags: ['Network Security'],
    steps: [
      {
        id: 's1',
        type: 'narrate',
        title: 'One firewall is not enough',
        body: 'Public web and mail servers must accept connections from anyone on the internet. The accounting database on the LAN must not. Putting both behind a single firewall means one ruleset failure exposes everything, so the screened subnet splits that risk across two filtering hops.',
      },
      {
        id: 's2',
        type: 'highlight',
        title: 'The outer firewall faces the internet',
        body: 'OUTER-FW terminates the ISP link and accepts public traffic into the DMZ. Its rules can stay relatively loose because the only thing behind it is the screened subnet itself, never the internal LAN.',
        target: { kind: 'device', id: 'sc_dmz_outerfw' },
      },
      {
        id: 's3',
        type: 'highlight',
        title: 'DMZ-hosted public services',
        body: 'WEB-DMZ and MAIL-DMZ sit in the screened subnet because they must answer unsolicited requests from the internet. If an attacker compromises either box, they are still outside the LAN and still face a second firewall before reaching anything sensitive.',
        target: { kind: 'devices', ids: ['sc_dmz_dmzsrv', 'sc_dmz_dmzsrv2'] },
      },
      {
        id: 's4',
        type: 'highlight',
        title: 'The inner firewall is the strict one',
        body: 'INNER-FW guards the LAN and runs a tight ruleset. It permits only specific connections from the DMZ servers to internal services, such as a web app reaching a backend database, and blocks everything else by default.',
        target: { kind: 'device', id: 'sc_dmz_innerfw' },
      },
      {
        id: 's5',
        type: 'flow',
        title: 'A public request reaches the LAN',
        body: 'A customer hits the website. The packet enters at OUTER-FW, lands on WEB-DMZ, then crosses INNER-FW under a narrow allow rule to reach the LAN switch. The reply retraces the same two filtered hops.',
        flow: {
          from: 'sc_dmz_internet',
          to: 'sc_dmz_lan_sw',
          via: ['sc_dmz_outerfw', 'sc_dmz_dmzsrv', 'sc_dmz_innerfw'],
          direction: 'forward-back',
        },
      },
      {
        id: 's6',
        type: 'narrate',
        title: 'Why two doors beat one',
        body: 'An attacker who breaks the web server still hits a second firewall with a much stricter ruleset. They cannot pivot freely; they have to find a second exploit against a much smaller attack surface. That extra hop is the whole point.',
      },
      {
        id: 's7',
        type: 'narrate',
        title: 'Names on the exam',
        body: 'The N10-009 objectives use "screened subnet" as the current term, but DMZ and perimeter network describe the same two-firewall shape. Recognise any of the three labels on a diagram and the answer is still the segment between an outer and inner filter.',
      },
    ],
  },
];
