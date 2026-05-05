// ══════════════════════════════════════════════════════════════════════════
// CompTIA Network+ N10-009 cert pack (v4.86.0 Phase 1A engine refactor)
// ══════════════════════════════════════════════════════════════════════════
// Loaded into window.CERT_PACKS.netplus at app boot. The active cert is
// resolved by detectCert() in app.js (URL host + localStorage dev override
// + 'netplus' default). When CURRENT_CERT === 'netplus', app.js reads the
// constants below; otherwise this pack is loaded but inert.
//
// Phase 1A (this ship): cert metadata + RETENTION_GAP_CONCEPTS only.
// Phase 1B (next): TOPIC_DOMAINS, DOMAIN_WEIGHTS, topicResources, GT tables.
// Phase 2 (Week 3): QUESTION_EXEMPLARS migration + Security+ pack content.
//
// LEGAL: every entry below originates from the public N10-009 blueprint or
// publicly-known technical facts. Zero ingestion of paid-bank content
// (Jason Dion / CertMaster / Mike Myers / Kaplan) — see CLAUDE.md for the
// full discipline note.

window.CERT_PACKS = window.CERT_PACKS || {};
window.CERT_PACKS.netplus = {
  meta: {
    id: 'netplus',
    name: 'CompTIA Network+',
    code: 'N10-009',
    blueprintUrl: 'https://www.comptia.org/certifications/network',
    examPassScore: 720,        // scaled-score pass threshold
    examMaxScore: 900,         // scaled-score ceiling
    examQuestionCount: 90,     // full exam length
    examTimeSeconds: 5400,     // 90-minute timer
  },

  // ── PRIORITY RETENTION CONCEPTS (v4.62.3, Phase 3 Cycles 1+2) ─────────
  // Topics the user has recently drilled and wants solid retention on.
  // Injected as a soft tiebreaker into every question-generation prompt
  // (custom quiz, Mixed, Daily Challenge, Marathon, Exam simulator).
  // Non-invasive: a preference, not a mandate. When a single-topic quiz
  // on something unrelated is running (e.g., "Port Numbers"), these are
  // offered as tiebreakers, not forced in.
  //
  // When concepts are mastered (sustained 85%+ accuracy over 3+ sessions
  // per the weak-spot scoring), they can be retired from this list so
  // the prompt injection stays relevant. Network+ post-pass pruning is
  // queued for the engine refactor's Phase 1B.
  //
  // Empty array = no-op (the prompt block collapses to an empty string).
  retentionGapConcepts: [
    { label: 'Powerload',          parentTopic: 'Ethernet Standards',                objective: '2.3', keyword: '802.3bt PoE++ Type 3/4 power classification' },
    { label: 'NTS',                parentTopic: 'Network Naming (DNS & DHCP)',       objective: '1.6', keyword: 'NTS (Network Time Security) RFC 8915 — secure NTP replacement' },
    { label: 'NAC',                parentTopic: 'Protecting Networks',               objective: '4.3', keyword: 'NAC (Network Access Control) posture assessment — health-check before network admittance' },
    { label: 'Preaction fire system', parentTopic: 'Physical Security Controls',     objective: '4.5', keyword: 'Pre-action fire suppression (dry-then-water on double-trigger) in data centres' },
    { label: 'WAP Channels',       parentTopic: 'Wireless Networking',               objective: '2.4', keyword: '2.4 GHz non-overlapping channels 1/6/11 (only)' },
    { label: 'NMAP',               parentTopic: 'Network Troubleshooting & Tools',   objective: '5.5', keyword: 'Nmap port/service scanner — reconnaissance tool' },
    { label: 'Teredo tunneling',   parentTopic: 'IPv6',                              objective: '1.8', keyword: 'Teredo RFC 4380 — IPv6 tunnelled through IPv4 NAT' },
    { label: 'Full tunnel VPN',    parentTopic: 'SSL/TLS VPN',                       objective: '4.4', keyword: 'Full tunnel VPN — all client traffic through VPN gateway' },
    { label: 'Split tunnel VPN',   parentTopic: 'SSL/TLS VPN',                       objective: '4.4', keyword: 'Split tunnel VPN — only corporate-bound traffic goes through VPN' },
    { label: 'Site-to-site VPN',   parentTopic: 'IPsec VPN',                         objective: '4.4', keyword: 'Site-to-site IPsec VPN — connects two networks via gateway-to-gateway tunnel' },
    { label: 'Clientless VPN',     parentTopic: 'SSL/TLS VPN',                       objective: '4.4', keyword: 'Clientless SSL VPN — browser-based, no VPN software needed' },
    { label: 'Class of Service',   parentTopic: 'Network Operations',                objective: '3.2', keyword: 'CoS (802.1p) — Layer 2 QoS priority (0–7) distinct from DSCP' },
    { label: 'RAID Controller',    parentTopic: 'Business Continuity & Disaster Recovery', objective: '3.3', keyword: 'RAID levels — RAID 5 (striping + parity), RAID 1 (mirror), RAID 10 (striped mirrors)' },
    { label: 'PCAP File',          parentTopic: 'Network Troubleshooting & Tools',   objective: '5.5', keyword: 'PCAP file format — captured by tcpdump/Wireshark, used for packet forensics' },
    // ── v4.85.19 — Phase 3 Cycle 1 (Jason Dion practice test gaps, 2026-05-02) ──
    { label: 'IPv6 Anycast',       parentTopic: 'IPv6',                              objective: '1.4', keyword: 'IPv6 anycast — same address on multiple interfaces, routed to nearest by metric (NOT broadcast, NOT multicast)' },
    { label: 'Media Converter',    parentTopic: 'Cabling & Topology',                objective: '1.5', keyword: 'Media converter — Layer 1 device that bridges copper Ethernet and fiber media types' },
    { label: 'SD-WAN App-aware',   parentTopic: 'SD-WAN & SASE',                     objective: '1.2', keyword: 'SD-WAN application-aware steering — Layer 7 DPI/SaaS ID + per-app SLA-based path selection' },
    { label: 'Jumbo frames (SAN)', parentTopic: 'Data Center Architectures',         objective: '1.8', keyword: 'Jumbo frames (≈9000 byte MTU) deployed on dedicated VLAN/SAN to guarantee end-to-end MTU consistency' },
    { label: 'Band Steering',      parentTopic: 'Wireless Networking',               objective: '2.4', keyword: 'Band steering — AP/WLC pushes dual-band clients onto less-congested 5 GHz' },
    { label: 'Anomaly detection',  parentTopic: 'Network Monitoring & Observability', objective: '3.2', keyword: 'Anomaly-based detection — baseline learned, alerts on deviation; catches zero-days but more false positives than signature-based' },
    { label: 'DHCP Reservation',   parentTopic: 'Network Naming (DNS & DHCP)',       objective: '1.6', keyword: 'DHCP reservation — MAC tied to specific IP within scope; centrally managed alternative to local static config' },
    { label: 'DHCP Options',       parentTopic: 'Network Naming (DNS & DHCP)',       objective: '1.6', keyword: 'DHCP options 3=router, 6=DNS, 51=lease time, 66=TFTP server, 67=boot file (VoIP/PXE provisioning)' },
    { label: 'Separation of Duties', parentTopic: 'Protecting Networks',             objective: '4.1', keyword: 'Separation of duties — critical task split across people (initiate vs approve) so no single person can complete it alone' },
    { label: 'Non-persistent NAC', parentTopic: 'Protecting Networks',               objective: '4.3', keyword: 'Non-persistent (dissolvable) NAC agent — fetched at connect, runs posture, exits; ideal for guests/contractors' },
    { label: 'Wavelength Mismatch', parentTopic: 'Cable Issues',                     objective: '5.2', keyword: 'Optical wavelength mismatch — e.g., 1310 nm SM transceiver vs 850 nm MM transceiver fails to link, even though both are Ethernet SFPs' },
    // ── v4.85.21 — Phase 3 Cycle 2 (Jason Dion practice test #2 gaps, 2026-05-03) ──
    { label: 'RFC 1918 Private Ranges', parentTopic: 'NAT & IP Services',             objective: '1.4', keyword: 'RFC 1918 private IPv4 ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 — distinct from APIPA 169.254.0.0/16' },
    { label: 'MDF / IDF',          parentTopic: 'Cabling & Topology',                objective: '1.5', keyword: 'Main Distribution Frame (building-level termination + carrier feed) vs Intermediate Distribution Frame (per-floor/zone)' },
    { label: 'Port-side intake/exhaust', parentTopic: 'Data Centres',                objective: '3.3', keyword: 'PSI (port-side intake — front intake, rear exhaust) aligns with cold-aisle/hot-aisle containment; PSE is reverse direction' },
    { label: 'MTRJ Connector',     parentTopic: 'Cabling & Topology',                objective: '1.5', keyword: 'MTRJ — small-form-factor duplex fiber connector, 1.25mm ferrule, two fibers in one body (RJ45-like housing)' },
    { label: 'DAC Cable',          parentTopic: 'Data Center Architectures',         objective: '1.8', keyword: 'Direct Attach Copper — short-range (≤7m passive) high-speed twinax with fixed transceivers, lower cost/power/latency than fiber for top-of-rack' },
    { label: 'Switch Imaging',     parentTopic: 'Network Operations',                objective: '3.1', keyword: 'Switch imaging — loading/upgrading IOS/firmware via TFTP (DHCP options 66+67 for ZTP), zero-touch provisioning' },
    { label: 'DoH (DNS over HTTPS)', parentTopic: 'Network Naming (DNS & DHCP)',     objective: '1.6', keyword: 'DoH (RFC 8484) — DNS encrypted over TCP/443, indistinguishable from web traffic; complicates enterprise DNS filtering' },
    { label: 'PTP (IEEE 1588)',    parentTopic: 'Network Operations',                objective: '3.1', keyword: 'PTP — sub-microsecond time sync via hardware timestamping at NIC + transparent/boundary clocks; required for 5G, HFT, industrial automation (NTP is millisecond-level)' },
    { label: 'Out-of-Band Mgmt',   parentTopic: 'Network Operations',                objective: '3.1', keyword: 'OOB management — separate dedicated network OR direct console/serial; works when production data plane is broken (in-band management does not)' },
    { label: 'OTDR',               parentTopic: 'Cable Issues',                      objective: '5.2', keyword: 'OTDR — Optical Time-Domain Reflectometer pinpoints fiber breaks/splices/loss by distance; sharp drop with no continuation = break' },
    { label: 'Toner Probe',        parentTopic: 'Network Troubleshooting & Tools',   objective: '5.5', keyword: 'Tone generator + inductive probe — traces unmarked copper cables by injecting AC tone and detecting magnetic field; tone bleed in tight bundles is a known limitation' },
    { label: 'LLDP',               parentTopic: 'Network Operations',                objective: '3.1', keyword: 'LLDP (IEEE 802.1AB) — vendor-neutral L2 discovery protocol (vs Cisco-proprietary CDP); advertises system name, port, capabilities to neighbors' },
    { label: 'TCP RST flag',       parentTopic: 'TCP/IP Basics',                     objective: '1.1', keyword: 'TCP RST — abortive immediate connection termination (distinct from graceful FIN four-way close). Sent on closed-port SYN, active firewall reject, or app-side abort.' },
    // ── v4.85.23 — Phase 3 Cycle 2 Round 2 add-on (Jason Dion gaps continued, 2026-05-03) ──
    { label: 'Microwave WAN',      parentTopic: 'WAN Connectivity',                  objective: '1.2', keyword: 'Microwave point-to-point — line-of-sight wireless WAN backbone, multi-Gbps over km; rain fade above 10 GHz; needs Fresnel zone clearance' },
    { label: 'Patch Panel',        parentTopic: 'Cabling & Topology',                objective: '1.5', keyword: 'Patch panel — passive (non-powered) cable termination; in-wall horizontal cabling on rear punch-downs, RJ45 jacks on front, patch cords to active gear' },
    { label: 'Bandwidth',          parentTopic: 'Network Monitoring & Observability', objective: '3.2', keyword: 'Bandwidth — THEORETICAL maximum capacity of a link (vs throughput which is actual delivered rate)' },
    { label: 'Latency',            parentTopic: 'Network Monitoring & Observability', objective: '3.2', keyword: 'Latency — delay from source to destination; long-distance dominated by propagation delay (~5ms per 1000 km in fiber)' },
    { label: 'Jitter',             parentTopic: 'Network Monitoring & Observability', objective: '3.2', keyword: 'Jitter — variation in packet arrival timing; critical for real-time voice/video; caused by variable queueing delays + path variability' },
    { label: 'Throughput',         parentTopic: 'Network Monitoring & Observability', objective: '3.2', keyword: 'Throughput — actual measured useful data rate (always ≤ bandwidth due to overhead, congestion, errors)' },
    { label: 'Clean Agent',        parentTopic: 'Data Centres',                      objective: '3.3', keyword: 'Clean agent fire suppression (FM-200, Novec 1230, Inergen) — non-conductive gas, no water damage, no residue; needs sealed room' },
    { label: 'Wet Pipe',           parentTopic: 'Data Centres',                      objective: '3.3', keyword: 'Wet pipe sprinkler — pressurized water in pipes, immediate discharge when head opens; risks accidental water damage on live electronics' },
    { label: 'Exploit',            parentTopic: 'Network Attacks & Threats',         objective: '4.2', keyword: 'Exploit — code/technique that takes advantage of a vulnerability to compromise; vulnerability is the flaw, exploit is the weapon' },
    { label: 'Vulnerability',      parentTopic: 'Network Attacks & Threats',         objective: '4.2', keyword: 'Vulnerability — flaw/weakness/misconfiguration that could be exploited; identified by scanners, remediated by patching or compensating controls' },
    { label: 'Visual Fault Locator', parentTopic: 'Cable Issues',                    objective: '5.2', keyword: 'VFL — visible red laser injected into fiber; light leaks from breaks/sharp bends/bad connectors; short-range visual troubleshooting (vs OTDR for long-run quantitative)' },
    { label: 'Penetration Testing', parentTopic: 'Network Attacks & Threats',        objective: '4.2', keyword: 'Pentest — authorized simulated attack that EXPLOITS vulnerabilities (vs vulnerability scan which only identifies). Methods: black-box / white-box / gray-box. Always requires written authorization.' },
    { label: 'OSPF Classless',     parentTopic: 'OSPF',                              objective: '2.1', keyword: 'OSPF is a CLASSLESS link-state protocol — carries subnet masks in LSAs, supports VLSM + CIDR (vs classful RIPv1/IGRP which assume default Class A/B/C masks)' },
    { label: 'Lightweight vs Autonomous APs', parentTopic: 'Wireless Networking',    objective: '2.4', keyword: 'Autonomous AP (standalone, locally configured) vs Lightweight AP (centrally managed by WLC via CAPWAP/LWAPP) — lightweight wins at scale for unified config + RF coordination' },
    { label: 'TAP (Traffic Access Point)', parentTopic: 'Network Monitoring & Observability', objective: '3.2', keyword: 'TAP — passive inline hardware that copies link traffic to a monitoring port at full fidelity (vs SPAN which can drop under load + filters errors). Optical TAPs are passive splitters with no power on data path.' },
    { label: 'Split Horizon',      parentTopic: 'Routing Protocols',                 objective: '2.1', keyword: 'Split horizon — distance-vector loop prevention: do not advertise a route back out the interface it was learned from. Poison reverse variant advertises with infinite metric instead of silence.' }
  ],

  // ── DOMAIN WEIGHTS (CompTIA N10-009 blueprint) ────────────────────────
  // Used by computeDomainDistribution() to allocate exam questions across
  // the 5 domains per official weights. Sum = 1.00.
  domainWeights: {
    concepts:        0.23, // Domain 1.0 — Networking Concepts
    implementation:  0.20, // Domain 2.0 — Network Implementation
    operations:      0.19, // Domain 3.0 — Network Operations
    security:        0.14, // Domain 4.0 — Network Security
    troubleshooting: 0.24  // Domain 5.0 — Network Troubleshooting
  },

  // Human-readable domain labels (rendered in Analytics, Domain Mastery,
  // exam result breakdowns, etc.)
  domainLabels: {
    concepts:        'Networking Concepts',
    implementation:  'Network Implementation',
    operations:      'Network Operations',
    security:        'Network Security',
    troubleshooting: 'Network Troubleshooting'
  },

  // ── TOPIC → DOMAIN MAP (50 topics) ────────────────────────────────────
  // Drives weak-spot routing, exemplar bank picker, lottery, readiness
  // domain attribution. Topic name = primary key everywhere; domain key
  // is one of: concepts / implementation / operations / security /
  // troubleshooting.
  topicDomains: {
    // Domain 1.0 — Networking Concepts (23%)
    'Network Models & OSI':              'concepts',
    'TCP/IP Basics':                     'concepts',
    'Subnetting & IP Addressing':        'concepts',
    'TCP/IP Applications':               'concepts',
    'Network Naming (DNS & DHCP)':       'concepts',
    'IPv6':                              'concepts',
    'NAT & IP Services':                 'concepts',
    'NTP, ICMP & Traffic Types':         'concepts',
    'Port Numbers':                      'concepts',
    'Virtualisation & Cloud':            'concepts',
    'Cloud Networking & VPCs':           'concepts',
    'Network Appliances & Device Functions': 'concepts',
    'DNS Records & DNSSEC':              'concepts',
    // Domain 2.0 — Network Implementation (20%)
    'Routing Protocols':                 'implementation', // umbrella — kept for history continuity (v4.42.3)
    'OSPF':                              'implementation', // v4.42.3: split from Routing Protocols (blueprint 2.1)
    'BGP':                               'implementation', // v4.42.3: split from Routing Protocols (blueprint 2.1)
    'Switch Features & VLANs':           'implementation', // umbrella — kept for history continuity (v4.42.3)
    'VLAN Trunking':                     'implementation', // v4.42.3: split from Switch Features (blueprint 2.2)
    'STP/RSTP':                          'implementation', // v4.42.3: split from Switch Features (blueprint 2.2)
    'Wireless Networking':               'implementation',
    'Ethernet Basics':                   'implementation',
    'Ethernet Standards':                'implementation',
    'Cabling & Topology':                'implementation',
    'Integrating Networked Devices':     'implementation',
    'SDN, NFV & Automation':             'implementation',
    'Data Center Architectures':         'implementation',
    // Domain 3.0 — Network Operations (19%)
    'Network Operations':                'operations',
    'Data Centres':                      'operations',
    'WAN Connectivity':                  'operations',
    'SD-WAN & SASE':                     'operations',
    'SMB & Network File Services':       'operations',
    'Business Continuity & Disaster Recovery': 'operations',
    'Network Monitoring & Observability': 'operations',
    // Domain 4.0 — Network Security (14%)
    'Securing TCP/IP':                   'security',
    'Protecting Networks':               'security',
    'AAA & Authentication':              'security',
    'IPsec & VPN Protocols':             'security', // umbrella — kept for history continuity (v4.42.3)
    'IPsec VPN':                         'security', // v4.42.3: split from IPsec & VPN Protocols (blueprint 4.4)
    'SSL/TLS VPN':                       'security', // v4.42.3: split from IPsec & VPN Protocols (blueprint 4.4)
    'PKI & Certificate Management':      'security',
    'Firewalls, DMZ & Security Zones':   'security',
    'WPA3 & EAP Authentication':         'security',
    'Network Attacks & Threats':         'security',
    'Physical Security Controls':        'security',
    // Domain 5.0 — Network Troubleshooting (24%)
    'Network Troubleshooting & Tools':   'troubleshooting', // umbrella — kept for history continuity (v4.42.3)
    'Cable Issues':                      'troubleshooting', // v4.42.3: split — blueprint 5.2 (cabling & physical interface issues)
    'Service Issues':                    'troubleshooting', // v4.42.3: split — blueprint 5.3 (network service issues)
    'Perf Issues':                       'troubleshooting', // v4.42.3: split — blueprint 5.4 (performance issues)
    'Connection Issues':                 'troubleshooting', // v4.42.3: split — blueprint 5.5 (tool/protocol selection for connection troubleshooting)
    'CompTIA Troubleshooting Methodology': 'troubleshooting'
  },

  // ── TOPIC RESOURCES (Professor Messer YouTube search URLs + objective numbers) ──
  topicResources: {
    'Network Models & OSI': { obj: '1.1', title: 'OSI Model Overview', search: 'professor+messer+N10-009+OSI+model' },
    'TCP/IP Basics': { obj: '1.1', title: 'TCP/IP Model', search: 'professor+messer+N10-009+TCP+IP+suite' },
    'Subnetting & IP Addressing': { obj: '1.4', title: 'IP Addressing & Subnetting', search: 'professor+messer+N10-009+subnetting' },
    'Routing Protocols': { obj: '1.4', title: 'Routing Protocols', search: 'professor+messer+N10-009+routing+protocols' },
    'TCP/IP Applications': { obj: '1.5', title: 'TCP/IP Applications', search: 'professor+messer+N10-009+TCP+IP+applications' },
    'Network Naming (DNS & DHCP)': { obj: '1.6', title: 'DNS & DHCP', search: 'professor+messer+N10-009+DNS+DHCP' },
    'Securing TCP/IP': { obj: '4.1', title: 'Securing TCP/IP', search: 'professor+messer+N10-009+securing+TCP+IP' },
    'Switch Features & VLANs': { obj: '2.1', title: 'Switches & VLANs', search: 'professor+messer+N10-009+switch+VLAN' },
    'IPv6': { obj: '1.4', title: 'IPv6 Addressing', search: 'professor+messer+N10-009+IPv6' },
    'WAN Connectivity': { obj: '1.2', title: 'WAN Technologies', search: 'professor+messer+N10-009+WAN+connectivity' },
    'Wireless Networking': { obj: '2.4', title: 'Wireless Standards', search: 'professor+messer+N10-009+wireless+networking' },
    'Virtualisation & Cloud': { obj: '1.8', title: 'Virtualisation & Cloud', search: 'professor+messer+N10-009+virtualization+cloud' },
    'Data Centres': { obj: '3.3', title: 'Data Centre Infrastructure', search: 'professor+messer+N10-009+data+center' },
    'Network Operations': { obj: '3.1', title: 'Network Operations', search: 'professor+messer+N10-009+network+operations' },
    'Protecting Networks': { obj: '4.1', title: 'Network Security', search: 'professor+messer+N10-009+protecting+networks' },
    'Cabling & Topology': { obj: '1.3', title: 'Cabling & Topology', search: 'professor+messer+N10-009+cabling+topology' },
    'Ethernet Basics': { obj: '1.3', title: 'Ethernet Fundamentals', search: 'professor+messer+N10-009+ethernet+basics' },
    'Ethernet Standards': { obj: '1.3', title: 'Ethernet Standards', search: 'professor+messer+N10-009+ethernet+standards' },
    'SD-WAN & SASE': { obj: '1.2', title: 'SD-WAN & SASE', search: 'professor+messer+N10-009+SD-WAN+SASE' },
    'Integrating Networked Devices': { obj: '2.1', title: 'Networked Devices & IoT', search: 'professor+messer+N10-009+IoT+networked+devices' },
    'Network Troubleshooting & Tools': { obj: '5.1', title: 'Troubleshooting Tools', search: 'professor+messer+N10-009+troubleshooting+tools' },
    'NAT & IP Services': { obj: '1.4', title: 'NAT & IP Services', search: 'professor+messer+N10-009+NAT' },
    'AAA & Authentication': { obj: '4.1', title: 'AAA & Authentication', search: 'professor+messer+N10-009+AAA+RADIUS+TACACS' },
    'NTP, ICMP & Traffic Types': { obj: '1.5', title: 'NTP, ICMP & Traffic', search: 'professor+messer+N10-009+NTP+ICMP' },
    'IPsec & VPN Protocols': { obj: '4.4', title: 'IPsec & VPN', search: 'professor+messer+N10-009+IPsec+VPN' },
    'SMB & Network File Services': { obj: '1.5', title: 'SMB & File Services', search: 'professor+messer+N10-009+SMB+NFS+file+services' },
    'Cloud Networking & VPCs': { obj: '1.8', title: 'Cloud Networking & VPCs', search: 'professor+messer+N10-009+cloud+networking+VPC' },
    'Port Numbers': { obj: '1.5', title: 'Port Numbers', search: 'professor+messer+N10-009+port+numbers' },
    'PKI & Certificate Management': { obj: '4.3', title: 'PKI & Certificates', search: 'professor+messer+N10-009+PKI+certificates' },
    'CompTIA Troubleshooting Methodology': { obj: '5.1', title: '7-Step Methodology', search: 'professor+messer+N10-009+troubleshooting+methodology' },
    'Firewalls, DMZ & Security Zones': { obj: '4.1', title: 'Firewalls & DMZ', search: 'professor+messer+N10-009+firewall+DMZ+security+zones' },
    'WPA3 & EAP Authentication': { obj: '4.3', title: 'WPA3 & EAP', search: 'professor+messer+N10-009+WPA3+EAP+authentication' },
    'SDN, NFV & Automation': { obj: '1.8', title: 'SDN & Automation', search: 'professor+messer+N10-009+SDN+NFV+automation' },
    'Network Attacks & Threats': { obj: '4.2', title: 'Network Attacks & Threats', search: 'professor+messer+N10-009+network+attacks' },
    'Business Continuity & Disaster Recovery': { obj: '3.3', title: 'BCDR & Failover', search: 'professor+messer+N10-009+disaster+recovery+HA' },
    'Network Monitoring & Observability': { obj: '3.2', title: 'Monitoring & SNMP', search: 'professor+messer+N10-009+SNMP+network+monitoring' },
    'Network Appliances & Device Functions': { obj: '1.2', title: 'Network Appliances', search: 'professor+messer+N10-009+network+appliances' },
    'Data Center Architectures': { obj: '1.8', title: 'DC Architectures', search: 'professor+messer+N10-009+three+tier+spine+leaf+data+center' },
    'Physical Security Controls': { obj: '4.5', title: 'Physical Security', search: 'professor+messer+N10-009+physical+security' },
    'DNS Records & DNSSEC': { obj: '1.6', title: 'DNS Records & DNSSEC', search: 'professor+messer+N10-009+DNS+records+DNSSEC' },
    // ── v4.42.3: catalog expansion (blueprint-anchored splits) ────────────
    'OSPF':              { obj: '2.1', title: 'OSPF',               search: 'professor+messer+N10-009+OSPF' },
    'BGP':               { obj: '2.1', title: 'BGP',                search: 'professor+messer+N10-009+BGP' },
    'VLAN Trunking':     { obj: '2.2', title: 'VLAN Trunking',      search: 'professor+messer+N10-009+VLAN+trunking+802.1Q' },
    'STP/RSTP':          { obj: '2.2', title: 'Spanning Tree',      search: 'professor+messer+N10-009+spanning+tree+STP+RSTP' },
    'IPsec VPN':         { obj: '4.4', title: 'IPsec VPN',          search: 'professor+messer+N10-009+IPsec+VPN+IKE' },
    'SSL/TLS VPN':       { obj: '4.4', title: 'SSL/TLS VPN',        search: 'professor+messer+N10-009+SSL+TLS+client+VPN' },
    'Cable Issues':      { obj: '5.2', title: 'Cable & Physical Issues', search: 'professor+messer+N10-009+cable+physical+issues' },
    'Service Issues':    { obj: '5.3', title: 'Network Service Issues',  search: 'professor+messer+N10-009+network+service+troubleshooting' },
    'Perf Issues':       { obj: '5.4', title: 'Performance Issues', search: 'professor+messer+N10-009+network+performance+issues' },
    'Connection Issues': { obj: '5.5', title: 'Connection Troubleshooting', search: 'professor+messer+N10-009+TCP+IP+connection+troubleshooting' }
  },

  // ── GROUND TRUTH TABLES ───────────────────────────────────────────────
  // Static Network+ facts. Dual-layer pattern: used both for prompt
  // injection (Tier A) AND programmatic reject in validateQuestions().
  gt: {
    // Protocol → port number
    ports: {
      ftp: 21, ssh: 22, telnet: 23, smtp: 25, dns: 53, tftp: 69,
      http: 80, pop3: 110, ntp: 123, imap: 143, snmp: 161,
      ldap: 389, https: 443, smb: 445, syslog: 514, smtps: 465,
      ldaps: 636, ftps: 990, imaps: 993, pop3s: 995,
      rdp: 3389, mysql: 3306, sip: 5060, sqlserver: 1433,
      mssql: 1433, dhcp: 67, kerberos: 88
    },

    // Protocol → OSI layer
    osi: {
      // L7
      http: 7, https: 7, ftp: 7, sftp: 7, smtp: 7, pop3: 7, imap: 7,
      dns: 7, dhcp: 7, snmp: 7, telnet: 7, ssh: 7, ntp: 7, tftp: 7, ldap: 7,
      // L4
      tcp: 4, udp: 4,
      // L3
      ip: 3, ipv4: 3, ipv6: 3, icmp: 3, ospf: 3, bgp: 3, eigrp: 3, rip: 3, igmp: 3,
      // L2
      ethernet: 2, arp: 2, ppp: 2, stp: 2
    },

    // Wireless encryption: broken = reject if marked as secure/recommended
    wifiBroken: ['wep'],
    wifiDeprecated: ['wpa'], // original WPA (not WPA2/3)

    // Ethernet physical-layer conflation traps (v4.38.6).
    // Haiku (and occasionally Sonnet) conflate auto-negotiation with
    // Auto-MDIX because they're co-marketed on modern gear. They are
    // distinct features. Every entry here is a (topic, correct feature)
    // truth pair stuffed in as AUTHORITATIVE FACTS by the teacher prompt.
    ethernet: {
      'auto-negotiation': 'negotiates SPEED and DUPLEX only (IEEE 802.3u clause 28). It does NOT detect cable pinout or MDI/MDIX.',
      'auto-mdix': 'detects MDI/MDIX pin assignments and automatically swaps TX/RX so straight-through and crossover cables are interchangeable (IEEE 802.3ab clause 40). This is a DIFFERENT feature from auto-negotiation.',
      'mdi/mdix': 'MDI/MDIX pin assignment detection is handled by Auto-MDIX, not auto-negotiation. Auto-negotiation only handles speed and duplex.',
      'straight-through vs crossover': 'Auto-MDIX (not auto-negotiation) is the feature that lets devices work with either cable type automatically.',
      'duplex mismatch': 'A duplex mismatch causes late collisions and runt frames on the half-duplex side, and FCS/CRC errors on the full-duplex side. Fix by setting both ends to auto-negotiate or both to the same fixed duplex.',
      'PoE standards': 'PoE (802.3af) = 15.4W, PoE+ (802.3at) = 30W, PoE++ / 4PPoE (802.3bt Type 3) = 60W, 802.3bt Type 4 = 100W. All power is sourced at the PSE (switch/injector), measured at the PD minus cable loss.'
    }
  },

  // ── CURATED EXEMPLAR BANK (v4.59.0 + Phase 3 cycles, 320 entries) ─────
  // Few-shot style references injected into Haiku's prompt by
  // _pickExemplarsForTopic + _formatExemplarsForPrompt. NOT the question
  // pool — these are quality anchors that lift generation toward
  // hand-curated style. Domain distribution per CompTIA blueprint weights
  // (D1=64, D2=70, D3=83, D4=43, D5=60). Difficulty mix: ~10%/65%/25%
  // (Foundational/Exam Level/Hard). Style mix: ~40%/60% (recall/scenario).
  //
  // LEGAL: every entry is original content authored from the public N10-009
  // blueprint. Zero ingestion of paid-bank content (Jason Dion / CertMaster
  // / Mike Myers / Kaplan). Documented authorship in git history.
  questionExemplars: [
  // v4.58.1: Phase 2 started \u2014 Domain 1.0 Networking Concepts, 14 exemplars.
  // All content original. NO copying from paid question banks (Dion, CertMaster,
  // Myers, Kaplan, etc.) \u2014 see issue #193 for the full legal boundary.
  // ───── 1.0 Networking Concepts (14/14) ─────
  {
    type: 'mcq',
    question: 'Which TCP port does HTTPS use by default?',
    difficulty: 'Foundational',
    topic: 'Port Numbers',
    objective: '1.4',
    options: { A: '80', B: '443', C: '22', D: '8080' },
    answer: 'B',
    explanation: 'HTTPS uses TCP port 443 by default for encrypted web traffic. Port 80 is plain HTTP (unencrypted). Port 22 is used by SSH and SFTP. Port 8080 is a common alternative HTTP port for development servers and proxies, but it is not the default for HTTPS.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'At which OSI layer does the Address Resolution Protocol (ARP) operate?',
    difficulty: 'Exam Level',
    topic: 'Network Models & OSI',
    objective: '1.1',
    options: {
      A: 'Layer 2 \u2014 Data Link',
      B: 'Layer 3 \u2014 Network',
      C: 'Layer 4 \u2014 Transport',
      D: 'Layer 7 \u2014 Application'
    },
    answer: 'A',
    explanation: 'ARP operates at Layer 2 (Data Link) because it resolves IP addresses to MAC addresses within the same broadcast domain, using MAC-layer frames rather than routable packets. Option B is the common wrong answer \u2014 ARP involves IP addresses, but resolution stays local and cannot cross routers, which is what makes it L2 rather than L3.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator needs to subnet the 192.168.10.0/24 address space to support 6 separate departments, each requiring up to 28 usable host addresses. What is the smallest subnet mask that satisfies both the subnet-count and host-count requirements?',
    difficulty: 'Exam Level',
    topic: 'Subnetting & IP Addressing',
    objective: '1.7',
    options: { A: '/25', B: '/26', C: '/27', D: '/28' },
    answer: 'C',
    explanation: 'A /27 subnet provides 30 usable hosts (2^5 \u2212 2), satisfying the 28-host requirement, and divides a /24 into 8 subnets, satisfying the 6-department requirement. /25 (2 subnets) and /26 (4 subnets) do not yield enough departments. /28 (14 usable hosts) is too small for 28 hosts per department.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A DNS administrator wants to configure a record that allows external email servers to look up the correct server for delivering mail to their domain. Which record type should they configure?',
    difficulty: 'Hard',
    topic: 'DNS Records & DNSSEC',
    objective: '1.6',
    options: {
      A: 'A record',
      B: 'CNAME record',
      C: 'MX record',
      D: 'PTR record'
    },
    answer: 'C',
    explanation: 'An MX (Mail Exchange) record directs external SMTP servers to the mail-handling host for a domain and includes a priority value for failover. An A record maps a hostname to an IPv4 address (used by web servers, not mail routing). A CNAME creates an alias from one hostname to another but cannot be used directly as the root of an MX target in most configurations. A PTR record is used for reverse DNS lookups, not forward mail routing.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network technician is tracing an outgoing HTTP request from a client\'s web browser through each layer of the OSI model. At which layer is the data first placed into a segment with source and destination ports before being passed to the lower layers?',
    difficulty: 'Exam Level',
    topic: 'Network Models & OSI',
    objective: '1.1',
    options: {
      A: 'Layer 2 \u2014 Data Link',
      B: 'Layer 3 \u2014 Network',
      C: 'Layer 4 \u2014 Transport',
      D: 'Layer 7 \u2014 Application'
    },
    answer: 'C',
    explanation: 'Layer 4 (Transport) is where data is segmented and source/destination port numbers are added \u2014 that is what defines a "segment" in OSI terminology. Layer 3 wraps segments into packets with IP addresses. Layer 2 wraps packets into frames with MAC addresses. Layer 7 is where the HTTP request originates, but port numbers are only added once the data descends to Layer 4.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A company hosts its public-facing web application on an internal server farm. To improve performance and security, they want to place a device between internet clients and the server farm that caches static content, terminates SSL sessions, and hides the internal server topology. Which type of device best fits this requirement?',
    difficulty: 'Hard',
    topic: 'Network Appliances & Device Functions',
    objective: '1.2',
    options: {
      A: 'Forward proxy',
      B: 'Reverse proxy',
      C: 'Layer 4 load balancer',
      D: 'Transparent proxy'
    },
    answer: 'B',
    explanation: 'A reverse proxy sits between external clients and internal servers, handling SSL termination, caching, and backend-topology hiding. A forward proxy does the opposite \u2014 sits between internal clients and external servers for outbound filtering. A Layer 4 load balancer distributes connections but does not inherently cache or terminate SSL at the application layer. A transparent proxy intercepts outbound traffic without client configuration, typically for content filtering rather than server-side functions.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'What is the primary functional difference between an IDS and an IPS?',
    difficulty: 'Exam Level',
    topic: 'Network Appliances & Device Functions',
    objective: '1.2',
    options: {
      A: 'An IDS operates at Layer 2; an IPS operates at Layer 3.',
      B: 'An IDS detects and alerts on suspicious traffic; an IPS can block it in real time.',
      C: 'An IDS is hardware-based; an IPS is software-based.',
      D: 'An IDS uses signature-based detection; an IPS uses behaviour-based detection.'
    },
    answer: 'B',
    explanation: 'The defining distinction is action: an IDS (Intrusion Detection System) passively monitors and alerts, while an IPS (Intrusion Prevention System) sits inline and can actively block malicious traffic. Both can use signature-based or behaviour-based detection (D is wrong \u2014 neither is exclusive to one). Both can be implemented in hardware or software (C is wrong). A is not a meaningful distinction \u2014 both operate across multiple layers depending on their role.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'An organisation wants to deploy a custom web application. They prefer to manage the operating system and application code themselves but do not want to manage physical hardware, networking equipment, or hypervisors. Which cloud service model best fits this requirement?',
    difficulty: 'Exam Level',
    topic: 'Virtualisation & Cloud',
    objective: '1.3',
    options: {
      A: 'Infrastructure as a Service (IaaS)',
      B: 'Platform as a Service (PaaS)',
      C: 'Software as a Service (SaaS)',
      D: 'Function as a Service (FaaS)'
    },
    answer: 'A',
    explanation: 'IaaS provides virtualised compute, networking, and storage while giving the customer control over the operating system and everything above it. PaaS (B) abstracts the OS as well \u2014 the customer would only manage the application. SaaS (C) delivers a ready-to-use application, with the provider managing the entire stack. FaaS (D) executes code at the function level without any OS management \u2014 more abstracted than the scenario describes.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which of the following IP address ranges is defined by RFC 1918 as a private address space for enterprise networks?',
    difficulty: 'Foundational',
    topic: 'Subnetting & IP Addressing',
    objective: '1.7',
    options: {
      A: '10.0.0.0 \u2013 10.255.255.255',
      B: '169.254.0.0 \u2013 169.254.255.255',
      C: '127.0.0.0 \u2013 127.255.255.255',
      D: '224.0.0.0 \u2013 239.255.255.255'
    },
    answer: 'A',
    explanation: '10.0.0.0/8 is one of three RFC 1918 private ranges (along with 172.16.0.0/12 and 192.168.0.0/16). 169.254.0.0/16 is APIPA / link-local \u2014 used when DHCP fails. 127.0.0.0/8 is loopback. 224.0.0.0 \u2013 239.255.255.255 is the multicast range.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A client device boots up on a network with no static IP configuration. What is the correct order of DHCP messages exchanged between the client and DHCP server to obtain an IP address?',
    difficulty: 'Exam Level',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'Discover \u2192 Offer \u2192 Request \u2192 Acknowledgement',
      B: 'Request \u2192 Offer \u2192 Discover \u2192 Acknowledgement',
      C: 'Discover \u2192 Request \u2192 Offer \u2192 Acknowledgement',
      D: 'Offer \u2192 Discover \u2192 Acknowledgement \u2192 Request'
    },
    answer: 'A',
    explanation: 'DORA \u2014 Discover, Offer, Request, Acknowledgement. The client broadcasts a DHCPDISCOVER, an available server responds with a DHCPOFFER, the client replies with a DHCPREQUEST, and the server confirms with a DHCPACK. A request cannot precede a discover (B), and an offer cannot appear before any discover is sent (D).',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which IPv6 address prefix identifies a link-local address used only within a single network segment?',
    difficulty: 'Exam Level',
    topic: 'IPv6',
    objective: '1.8',
    options: { A: '2000::/3', B: 'fe80::/10', C: 'fc00::/7', D: 'ff00::/8' },
    answer: 'B',
    explanation: 'fe80::/10 is the link-local range \u2014 valid only within a single broadcast domain, auto-assigned to every IPv6-enabled interface at boot. 2000::/3 is the global unicast range (routable on the public IPv6 internet). fc00::/7 covers unique local addresses (RFC 4193 \u2014 the IPv6 equivalent of RFC 1918 private space). ff00::/8 is the multicast range.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'An organisation has 250 internal hosts on a 192.168.10.0/24 network that all need simultaneous internet access, but the ISP has assigned them only a single public IPv4 address. Which NAT variant enables all 250 hosts to share that single public IP?',
    difficulty: 'Exam Level',
    topic: 'NAT & IP Services',
    objective: '1.7',
    options: {
      A: 'Static NAT',
      B: 'Dynamic NAT (1:1 pool)',
      C: 'Port Address Translation (PAT) / NAT overload',
      D: 'NAT64'
    },
    answer: 'C',
    explanation: 'PAT (also called NAT overload) lets many internal hosts share a single public IP by multiplexing outbound connections using unique source port numbers. Static NAT (A) is a permanent 1:1 mapping \u2014 would require 250 public IPs. Dynamic NAT (B) draws from a pool of public IPs but is still 1:1 at any given moment. NAT64 (D) translates between IPv6 and IPv4 address families \u2014 unrelated to this scenario.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which traffic type is sent from a single source to every host on a local network segment?',
    difficulty: 'Foundational',
    topic: 'NTP, ICMP & Traffic Types',
    objective: '1.4',
    options: { A: 'Unicast', B: 'Multicast', C: 'Broadcast', D: 'Anycast' },
    answer: 'C',
    explanation: 'Broadcast traffic reaches every host on a single broadcast domain (example: ARP requests). Unicast (A) is one-to-one. Multicast (B) is one-to-a-subscribed-group. Anycast (D) is one-to-the-nearest-of-many \u2014 used by DNS root servers and IPv6 addressing.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator is deploying internal NTP servers that will synchronise with a reliable upstream time source over the internet and serve time to local clients. Their research shows that public NTP pool servers at pool.ntp.org are stratum 2. At what stratum level would their internal NTP server operate once it successfully synchronises with one of those pool servers?',
    difficulty: 'Hard',
    topic: 'NTP, ICMP & Traffic Types',
    objective: '1.6',
    options: { A: 'Stratum 0', B: 'Stratum 1', C: 'Stratum 2', D: 'Stratum 3' },
    answer: 'D',
    explanation: 'NTP stratum increases by 1 with each hop from the reference clock. Stratum 0 is the reference clock itself (atomic, GPS). Stratum 1 synchronises directly from a stratum 0 source. Stratum 2 synchronises from a stratum 1, and so on. A server syncing from a stratum 2 pool becomes stratum 3. Stratum 16 signals an unsynchronised state.',
    source: 'curated',
    addedVersion: '4.58.1',
    addedDate: '2026-04-21'
  },
  // ───── 2.0 Network Implementation (12/12) ─────
  {
    type: 'mcq',
    question: 'A network engineer is connecting two switches to carry traffic for VLAN 10, VLAN 20, and VLAN 30 simultaneously between them. The link between the switches must identify which VLAN each frame belongs to as it crosses. Which type of port configuration should the engineer apply to both ends of the inter-switch link?',
    difficulty: 'Exam Level',
    topic: 'VLAN Trunking',
    objective: '2.1',
    options: {
      A: 'Access port',
      B: 'Trunk port with 802.1Q tagging',
      C: 'PoE port',
      D: 'Mirror port (SPAN)'
    },
    answer: 'B',
    explanation: 'A trunk port with 802.1Q tagging adds a 4-byte VLAN header to each frame so the receiving switch knows which VLAN the frame belongs to. An access port (A) belongs to exactly one VLAN and strips the tag \u2014 it cannot carry multiple VLANs across the link. PoE (C) is about delivering power, not VLAN separation. A SPAN/mirror port (D) copies traffic to a monitoring port; it does not carry production traffic.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'What is the correct sequence of Spanning Tree Protocol (802.1D) port states as a port transitions from initial power-up to actively forwarding traffic?',
    difficulty: 'Exam Level',
    topic: 'STP/RSTP',
    objective: '2.1',
    options: {
      A: 'Forwarding \u2192 Learning \u2192 Listening \u2192 Blocking',
      B: 'Blocking \u2192 Listening \u2192 Learning \u2192 Forwarding',
      C: 'Learning \u2192 Listening \u2192 Blocking \u2192 Forwarding',
      D: 'Listening \u2192 Blocking \u2192 Learning \u2192 Forwarding'
    },
    answer: 'B',
    explanation: 'In classic 802.1D STP, a port starts in Blocking (discards frames, only listens to BPDUs), advances to Listening (participates in STP calculations but does not learn or forward), then Learning (populates the MAC table but still does not forward), and finally Forwarding. RSTP (802.1w) compresses this to three states \u2014 Discarding, Learning, Forwarding \u2014 but this question specifies classic 802.1D.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network is divided into four OSPF areas: Area 0, Area 10, Area 20, and Area 30. The network administrator wants to configure routers in Area 20 to communicate with routers in Area 30. What is required for this inter-area communication to function correctly?',
    difficulty: 'Hard',
    topic: 'OSPF',
    objective: '2.2',
    options: {
      A: 'Area 20 and Area 30 must be directly connected to each other.',
      B: 'Traffic between Area 20 and Area 30 must pass through Area 0 (the backbone area).',
      C: 'At least one router in Area 20 must be configured as the Area 30 Designated Router.',
      D: 'OSPF must be disabled on Area 0 to allow Area 20 and Area 30 to peer directly.'
    },
    answer: 'B',
    explanation: 'OSPF requires all non-backbone areas to connect to Area 0 (the backbone). Inter-area traffic always transits Area 0 by design \u2014 this prevents suboptimal routing and routing loops. Option A is incorrect: non-backbone areas cannot be directly connected without a virtual link. Option C conflates DR (elected per broadcast segment) with ABR (Area Border Router). Option D is backwards \u2014 disabling the backbone breaks OSPF entirely.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which Ethernet standard supports up to 1 Gbps over Cat 5e or Cat 6 copper cabling at distances up to 100 meters?',
    difficulty: 'Foundational',
    topic: 'Ethernet Standards',
    objective: '2.3',
    options: { A: '100BASE-TX', B: '1000BASE-T', C: '10GBASE-T', D: '1000BASE-SX' },
    answer: 'B',
    explanation: '1000BASE-T delivers 1 Gbps over 4 pairs of Cat 5e or better twisted-pair copper up to 100 meters. 100BASE-TX is 100 Mbps Fast Ethernet over Cat 5+. 10GBASE-T delivers 10 Gbps over copper but requires Cat 6a for the full 100 m (Cat 6 limits it to approximately 55 m). 1000BASE-SX is 1 Gbps over multi-mode fiber, not copper.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator wants to combine four 1 Gbps Ethernet links between two switches to create a single logical 4 Gbps connection that provides both increased bandwidth and automatic failover if one link fails. Which protocol should they configure on both switch ends?',
    difficulty: 'Exam Level',
    topic: 'Switch Features & VLANs',
    objective: '2.1',
    options: {
      A: 'Link Aggregation Control Protocol (LACP / 802.3ad)',
      B: 'Spanning Tree Protocol (STP / 802.1D)',
      C: 'Virtual Router Redundancy Protocol (VRRP)',
      D: 'Dynamic Host Configuration Protocol (DHCP)'
    },
    answer: 'A',
    explanation: 'LACP (IEEE 802.3ad) bundles multiple physical Ethernet links into a single logical link aggregation group (LAG or EtherChannel), providing combined bandwidth and automatic failover. STP (B) prevents loops by blocking redundant links \u2014 it would disable 3 of the 4 links, not aggregate them. VRRP (C) provides router (not switch-link) redundancy. DHCP (D) assigns IP addresses and is unrelated.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A deployment requires powering a wireless access point that draws up to 25 watts over a single Ethernet cable. Which PoE standard provides enough power for this device?',
    difficulty: 'Exam Level',
    topic: 'Ethernet Standards',
    objective: '2.3',
    options: {
      A: '802.3af (PoE)',
      B: '802.3at (PoE+)',
      C: '802.3bt Type 3 (PoE++)',
      D: '802.3x (Flow Control)'
    },
    answer: 'B',
    explanation: '802.3at (PoE+) provides up to 30 W at the source (25.5 W at the device), sufficient for a 25 W load. 802.3af (PoE) provides only up to 15.4 W at the source \u2014 insufficient. 802.3bt Type 3/4 (PoE++) delivers 60-100 W \u2014 works but is overspec for this requirement. 802.3x is Ethernet flow control, not PoE.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which 802.11 wireless standard is also known as Wi-Fi 6 and operates on both the 2.4 GHz and 5 GHz bands?',
    difficulty: 'Exam Level',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: '802.11n (Wi-Fi 4)',
      B: '802.11ac (Wi-Fi 5)',
      C: '802.11ax (Wi-Fi 6)',
      D: '802.11be (Wi-Fi 7)'
    },
    answer: 'C',
    explanation: '802.11ax is the IEEE standard branded as Wi-Fi 6, operating on both 2.4 GHz and 5 GHz (the Wi-Fi 6E extension adds 6 GHz). 802.11n (Wi-Fi 4) runs on both bands but at much lower speeds. 802.11ac (Wi-Fi 5) operates only on 5 GHz. 802.11be (Wi-Fi 7) is the newer standard but not yet heavily emphasized on N10-009.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A security audit flags that a company\u2019s wireless network uses a four-way handshake that is vulnerable to offline dictionary attacks against weak passwords. Which WPA3 feature replaces that handshake to defend against this specific attack class?',
    difficulty: 'Hard',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'Pre-Shared Key (PSK) rotation',
      B: 'Simultaneous Authentication of Equals (SAE / Dragonfly)',
      C: 'Temporal Key Integrity Protocol (TKIP)',
      D: 'RADIUS-based authentication'
    },
    answer: 'B',
    explanation: 'WPA3-Personal replaces WPA2\u2019s four-way handshake with SAE (Simultaneous Authentication of Equals, also called Dragonfly), a password-authenticated key exchange that is resistant to offline dictionary attacks \u2014 each attempt requires active network interaction, so captured traffic cannot be brute-forced offline. PSK rotation (A) is an operational workaround, not a WPA3 feature. TKIP (C) is a legacy WPA encryption protocol, deprecated. RADIUS (D) is the WPA-Enterprise authentication model, not a WPA3-Personal feature.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which statement best describes the primary advantage of using dynamic routing protocols over static routes in a large enterprise network?',
    difficulty: 'Foundational',
    topic: 'Routing Protocols',
    objective: '2.2',
    options: {
      A: 'Dynamic routing uses less memory and CPU on routers than static routing.',
      B: 'Dynamic routing automatically adapts to topology changes without manual reconfiguration.',
      C: 'Dynamic routing is more secure because it encrypts all routing updates by default.',
      D: 'Dynamic routing eliminates the need for any administrator oversight.'
    },
    answer: 'B',
    explanation: 'Dynamic routing protocols (OSPF, EIGRP, BGP, RIP) exchange routing information between routers and adjust the routing table automatically when links fail or topology changes \u2014 far more scalable than manually maintained static routes. A is backwards: dynamic routing uses MORE resources. C is incorrect: most protocols do not encrypt updates by default \u2014 MD5/HMAC authentication must be explicitly configured. D is incorrect \u2014 administrators still design, monitor, and troubleshoot dynamic-routing deployments.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'An enterprise is multihomed to two different Internet Service Providers (ISPs). They need to receive the full internet routing table from both ISPs to make intelligent path decisions for outbound traffic. Which routing protocol should they run between their edge routers and the two ISPs?',
    difficulty: 'Exam Level',
    topic: 'BGP',
    objective: '2.2',
    options: {
      A: 'Open Shortest Path First (OSPF)',
      B: 'Border Gateway Protocol (BGP)',
      C: 'Routing Information Protocol (RIPv2)',
      D: 'Enhanced Interior Gateway Routing Protocol (EIGRP)'
    },
    answer: 'B',
    explanation: 'BGP is the only protocol designed to exchange routing information between autonomous systems (ASes) \u2014 ISPs always peer with customers using BGP for multihomed internet connections. OSPF (A) and EIGRP (D) are interior gateway protocols meant for routing within a single AS. RIPv2 (C) is a small-scale IGP with a 15-hop limit, never used for internet peering.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A modern data center is being designed to maximize east-west traffic between servers and minimize latency between any two endpoints. The architecture uses two tiers of switches where every switch in the lower tier connects to every switch in the upper tier. Which data center topology does this describe?',
    difficulty: 'Exam Level',
    topic: 'Data Center Architectures',
    objective: '2.1',
    options: {
      A: 'Three-tier (core / aggregation / access)',
      B: 'Spine-leaf',
      C: 'Hub-and-spoke',
      D: 'Ring topology'
    },
    answer: 'B',
    explanation: 'Spine-leaf is a two-tier data center topology where every leaf switch (server-facing) connects to every spine switch (aggregation). Any server-to-server path is exactly two hops, which optimizes east-west (server-to-server) traffic. Three-tier (A) adds an intermediate aggregation layer, optimized for north-south (client-to-server) traffic. Hub-and-spoke (C) is a WAN topology. Ring (D) is a legacy topology rarely used in modern data centers.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which statement correctly describes the architectural distinction that defines Software-Defined Networking (SDN)?',
    difficulty: 'Hard',
    topic: 'SDN, NFV & Automation',
    objective: '1.8',
    options: {
      A: 'SDN separates the control plane from the data plane, centralizing routing decisions on a controller while distributed network devices forward traffic based on instructions from that controller.',
      B: 'SDN replaces all physical switches with virtual software switches running on servers.',
      C: 'SDN encrypts all network traffic using AES-256 by default across all connected devices.',
      D: 'SDN requires all network devices to be manufactured by the same vendor to function.'
    },
    answer: 'A',
    explanation: 'SDN\u2019s core architectural innovation is separating the control plane (where routing decisions are made) from the data plane (where packets are forwarded). A centralized SDN controller programs the data-plane devices via southbound APIs (OpenFlow, NETCONF). B conflates SDN with NFV (Network Function Virtualization). C is unrelated \u2014 SDN is not an encryption technology. D is the opposite of true \u2014 SDN was created partly to AVOID vendor lock-in through open protocols.',
    source: 'curated',
    addedVersion: '4.58.2',
    addedDate: '2026-04-21'
  },
  // ───── 3.0 Network Operations (11/11) ─────
  {
    type: 'mcq',
    question: 'Which version of SNMP introduces encryption and authentication of management traffic to address the security weaknesses of earlier versions?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: { A: 'SNMPv1', B: 'SNMPv2c', C: 'SNMPv3', D: 'SNMPv4' },
    answer: 'C',
    explanation: 'SNMPv3 adds authentication and encryption via the User-based Security Model (USM) and View-based Access Control Model (VACM). SNMPv1 and SNMPv2c both rely on community strings sent in plaintext, offering no real security. SNMPv4 does not exist; v3 is the current standard.',
    source: 'curated',
    addedVersion: '4.58.3',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator is reviewing syslog messages and sees entries with a numeric severity level of 3 (Error). They want to filter the log to capture only messages indicating more urgent system conditions than Error-level. Which severity levels should they configure as their minimum threshold?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'Severity 0, 1, and 2 (Emergency, Alert, Critical)',
      B: 'Severity 4, 5, and 6 (Warning, Notice, Informational)',
      C: 'Severity 7 (Debug) only',
      D: 'Severity 3, 4, and 5 (Error, Warning, Notice)'
    },
    answer: 'A',
    explanation: 'Syslog severity levels run inversely to urgency: 0 (Emergency) is most severe, 7 (Debug) is least. Levels 0-2 (Emergency, Alert, Critical) are all more urgent than Error (level 3). Option B selects less-urgent levels. Option C is the least severe of all. Option D includes Error itself plus two less-urgent levels.',
    source: 'curated',
    addedVersion: '4.58.3',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A company\u2019s executive team has set the following disaster recovery targets for their order-processing database: data loss of no more than 5 minutes and total downtime of no more than 1 hour during any failure event. Which two DR metrics do these targets correspond to?',
    difficulty: 'Hard',
    topic: 'Business Continuity & Disaster Recovery',
    objective: '3.3',
    options: {
      A: 'RPO = 5 minutes, RTO = 1 hour',
      B: 'RTO = 5 minutes, RPO = 1 hour',
      C: 'MTBF = 5 minutes, MTTR = 1 hour',
      D: 'SLA = 5 minutes, OLA = 1 hour'
    },
    answer: 'A',
    explanation: 'Recovery Point Objective (RPO) measures acceptable data loss \u2014 the 5-minute target means the backup/replication strategy must keep data current to within 5 minutes of any failure. Recovery Time Objective (RTO) measures acceptable downtime \u2014 the 1-hour target defines how quickly the service must be restored. Option B reverses the two metrics. MTBF/MTTR (C) measure hardware reliability, not DR targets. SLA/OLA (D) are service-level agreements, unrelated to DR metric terminology.',
    source: 'curated',
    addedVersion: '4.58.3',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'An organisation with 25 branch offices currently routes all internet traffic through their data centre via traditional MPLS links. They want to improve branch-to-cloud performance and reduce WAN costs by allowing branches to use direct internet connections while maintaining centralised security policy enforcement. Which technology best supports this requirement?',
    difficulty: 'Exam Level',
    topic: 'SD-WAN & SASE',
    objective: '3.5',
    options: {
      A: 'Site-to-site IPsec VPN mesh',
      B: 'Software-Defined WAN (SD-WAN)',
      C: 'Dedicated fibre leased lines to each branch',
      D: 'Frame Relay with burst capability'
    },
    answer: 'B',
    explanation: 'SD-WAN lets branches use multiple transports (MPLS, broadband, LTE) with centralised policy control, enabling direct-to-cloud traffic for SaaS applications while still enforcing security policies through the SD-WAN orchestrator. A site-to-site VPN mesh (A) can connect branches but lacks centralised path-selection intelligence. Dedicated fibre (C) is costly and does not inherently offer traffic-steering. Frame Relay (D) is a legacy WAN technology, largely retired.',
    source: 'curated',
    addedVersion: '4.58.3',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator wants to analyse which applications consume the most bandwidth on their internet link over a 24-hour period, including destination IP addresses, port numbers, and byte counts per flow \u2014 without capturing the actual packet payloads. Which technology best fits this requirement?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'Full packet capture (pcap)',
      B: 'NetFlow / sFlow / IPFIX',
      C: 'SNMP polling',
      D: 'Syslog aggregation'
    },
    answer: 'B',
    explanation: 'NetFlow (Cisco), sFlow, and IPFIX (RFC standard) collect flow metadata \u2014 source/destination IP, ports, protocol, byte counts \u2014 without capturing payloads. Ideal for bandwidth analysis at scale. Full packet capture (A) captures the entire payload, resource-intensive and privacy-sensitive. SNMP polling (C) provides device-level counters but not per-flow detail. Syslog (D) captures event messages, not traffic flow statistics.',
    source: 'curated',
    addedVersion: '4.58.3',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Two routers are configured as a high-availability pair at the edge of a network. Both routers are actively forwarding traffic simultaneously, sharing the load while each provides backup capacity for the other. Which high-availability model does this describe?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Active-active',
      B: 'Active-passive',
      C: 'Hot-standby',
      D: 'Cold-standby'
    },
    answer: 'A',
    explanation: 'Active-active has all redundant devices processing traffic simultaneously, providing both load sharing AND failover. Active-passive (B) keeps the secondary device idle until the primary fails. Hot-standby (C) is effectively active-passive where the standby is powered and ready but not actively passing traffic. Cold-standby (D) has the secondary device powered off, requiring manual startup on failure \u2014 the slowest option.',
    source: 'curated',
    addedVersion: '4.58.3',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which WAN technology provides a carrier-managed, any-to-any connectivity service that uses labels to forward traffic across the provider\u2019s backbone, supporting multiple customers with overlapping private IP address spaces?',
    difficulty: 'Foundational',
    topic: 'WAN Connectivity',
    objective: '3.5',
    options: {
      A: 'Metro Ethernet',
      B: 'Frame Relay',
      C: 'Multiprotocol Label Switching (MPLS)',
      D: 'Dedicated leased line (T1/E1)'
    },
    answer: 'C',
    explanation: 'MPLS attaches labels to packets at ingress Provider Edge (PE) routers and forwards them across the carrier backbone based on those labels rather than IP lookups. MPLS VPNs isolate traffic between customers even when they use overlapping private IP ranges. Metro Ethernet (A) provides Ethernet-over-WAN, typically point-to-point. Frame Relay (B) is a legacy packet-switched technology, largely retired. A leased line (D) provides dedicated point-to-point bandwidth, not any-to-any connectivity.',
    source: 'curated',
    addedVersion: '4.58.3',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator needs to remotely manage a critical core switch even when the production network is experiencing an outage. The switch has a serial console port, an Ethernet management port, and data uplinks. Which approach provides the most resilient remote-management path during an outage?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.5',
    options: {
      A: 'SSH through the data uplink',
      B: 'Telnet through the data uplink',
      C: 'Out-of-band management via the console or dedicated management port',
      D: 'HTTPS web interface through the data uplink'
    },
    answer: 'C',
    explanation: 'Out-of-band (OOB) management uses a separate physical path \u2014 a console server on the serial port or a dedicated management network \u2014 that does NOT depend on the production data network. When production links fail, in-band methods (A, B, D \u2014 all traversing the production network) become inaccessible, while OOB remains available. SSH is more secure than Telnet, but both are still in-band. HTTPS is also in-band.',
    source: 'curated',
    addedVersion: '4.58.3',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which of the following is the primary purpose of a formal change management process in enterprise network operations?',
    difficulty: 'Foundational',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'To automatically block unauthorised configuration changes at the device level.',
      B: 'To track, review, and approve proposed changes before implementation to reduce risk.',
      C: 'To encrypt all device configurations with a shared key.',
      D: 'To replace the need for network documentation.'
    },
    answer: 'B',
    explanation: 'Change management is a process discipline \u2014 proposed changes are documented, reviewed by stakeholders (Change Advisory Board), risk-assessed, and approved before implementation. This reduces outages caused by unreviewed or poorly-coordinated changes. Option A conflates change management (a process) with configuration management tools. Encryption (C) is unrelated. Documentation (D) complements change management, not replaces it.',
    source: 'curated',
    addedVersion: '4.58.3',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A vendor\u2019s specification sheet for a router states: MTBF = 200,000 hours, MTTR = 4 hours. What does this combination of values tell the operations team about the device?',
    difficulty: 'Hard',
    topic: 'Network Operations',
    objective: '3.3',
    options: {
      A: 'The device will fail every 4 hours and takes 200,000 hours to restore.',
      B: 'The device is expected to operate for approximately 200,000 hours between failures, and takes an average of 4 hours to restore when a failure does occur.',
      C: 'The device is under an SLA of 4 hours with a 200,000-hour uptime guarantee.',
      D: 'The device must be replaced every 200,000 hours regardless of failures.'
    },
    answer: 'B',
    explanation: 'MTBF (Mean Time Between Failures) measures expected operating time between failures \u2014 200,000 hours (~23 years) is a statistical projection, not a hard guarantee. MTTR (Mean Time To Repair) measures average time to restore service after a failure. Option A reverses the two metrics. Option C conflates statistical metrics with contractual SLAs. Option D misreads MTBF as a replacement schedule.',
    source: 'curated',
    addedVersion: '4.58.3',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator is establishing a baseline for their enterprise network. Which of the following metrics would be most useful to capture as part of that baseline?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'Average bandwidth utilisation per link during typical business hours',
      B: 'Number of physical devices in each data centre rack',
      C: 'Names of all network administrators with SSH access',
      D: 'Operating system versions running on user workstations'
    },
    answer: 'A',
    explanation: 'A network baseline captures normal operational metrics \u2014 bandwidth utilisation, latency, packet loss, CPU/memory on critical devices, error rates \u2014 so that deviations can be detected as incidents. Option A directly feeds this. Option B is physical inventory. Option C is access control documentation. Option D is endpoint inventory. All are valuable in their own right, but only A is a performance metric appropriate for a baseline.',
    source: 'curated',
    addedVersion: '4.58.3',
    addedDate: '2026-04-21'
  },
  // ───── 4.0 Network Security (8/8) ─────
  {
    type: 'mcq',
    question: 'Which three principles form the foundation of information security, often referred to by the acronym "CIA"?',
    difficulty: 'Foundational',
    topic: 'Securing TCP/IP',
    objective: '4.1',
    options: {
      A: 'Confidentiality, Integrity, Availability',
      B: 'Compliance, Identification, Authentication',
      C: 'Cryptography, Isolation, Authorisation',
      D: 'Certification, Inspection, Auditing'
    },
    answer: 'A',
    explanation: 'The CIA triad \u2014 Confidentiality (data is only accessible to authorised parties), Integrity (data is accurate and unmodified), and Availability (authorised users can access the data when needed) \u2014 is the foundational security model referenced throughout N10-009. Options B, C, and D are plausible-sounding distractors built from real security terms but not the canonical triad.',
    source: 'curated',
    addedVersion: '4.58.4',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A user logs into a corporate VPN using their credentials. The VPN appliance verifies the credentials against a central server, grants the user specific network access based on their role, and logs the session duration and bytes transferred. Which three AAA functions are demonstrated in this scenario, in order?',
    difficulty: 'Exam Level',
    topic: 'AAA & Authentication',
    objective: '4.1',
    options: {
      A: 'Auditing, Authorisation, Accounting',
      B: 'Authentication, Authorisation, Accounting',
      C: 'Authentication, Accreditation, Analytics',
      D: 'Access, Assignment, Assessment'
    },
    answer: 'B',
    explanation: 'AAA stands for Authentication (verifying identity), Authorisation (granting permissions based on identity/role), and Accounting (recording what was done, when, and how much). All three map exactly to the scenario. Option A swaps Authentication for Auditing (Auditing is not the first A). Options C and D use plausible-but-wrong terms not from the actual AAA framework.',
    source: 'curated',
    addedVersion: '4.58.4',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A company implements multi-factor authentication (MFA) for their VPN. Users must enter a password AND provide a fingerprint scan AND input a code from a hardware token. How many distinct authentication factor CATEGORIES are being used in this configuration?',
    difficulty: 'Exam Level',
    topic: 'AAA & Authentication',
    objective: '4.4',
    options: {
      A: 'One factor',
      B: 'Two factors',
      C: 'Three factors',
      D: 'Four factors'
    },
    answer: 'C',
    explanation: 'MFA categories are based on distinct factor types: something you KNOW (password), something you HAVE (hardware token), and something you ARE (biometric fingerprint). Three distinct categories are in use, satisfying true 3-factor authentication. If the configuration used two passwords, that would still be single-factor (both are "know"). Using a password + token alone is 2FA. Adding biometrics makes it 3FA.',
    source: 'curated',
    addedVersion: '4.58.4',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A company establishes a site-to-site IPsec VPN between two branch offices. They want the entire original IP packet \u2014 including the original source and destination IP addresses \u2014 to be encapsulated and encrypted, so that an attacker capturing traffic on the public internet cannot determine the internal private IP addresses of either branch. Which IPsec mode should they configure?',
    difficulty: 'Hard',
    topic: 'IPsec & VPN Protocols',
    objective: '4.4',
    options: {
      A: 'Transport mode with ESP',
      B: 'Tunnel mode with ESP',
      C: 'Transport mode with AH only',
      D: 'Tunnel mode with AH only'
    },
    answer: 'B',
    explanation: 'IPsec Tunnel mode encapsulates the entire original IP packet (including original headers) inside a new outer IP packet, hiding internal addressing. ESP (Encapsulating Security Payload) provides both encryption and authentication of the payload. Transport mode (A, C) only protects the payload; the original IP header remains visible. AH (Authentication Header \u2014 C and D) provides integrity but NOT encryption \u2014 attackers could still read the packet contents. Tunnel mode + ESP is the standard site-to-site VPN configuration.',
    source: 'curated',
    addedVersion: '4.58.4',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A user\u2019s web browser displays a trusted lock icon when connecting to https://bank.com. Which component of the Public Key Infrastructure (PKI) did the browser rely on to verify that the certificate presented by the bank\u2019s server is authentic?',
    difficulty: 'Exam Level',
    topic: 'PKI & Certificate Management',
    objective: '4.1',
    options: {
      A: 'The bank\u2019s private key',
      B: 'A trusted Root Certificate Authority (CA) that signed the certificate\u2019s chain of trust',
      C: 'A Certificate Revocation List (CRL) maintained by the bank',
      D: 'The browser\u2019s own self-signed certificate'
    },
    answer: 'B',
    explanation: 'Every browser ships with a pre-installed bundle of trusted Root CA certificates. When the bank\u2019s server presents its certificate, the browser walks the certificate\u2019s chain \u2014 typically Server Cert \u2192 Intermediate CA \u2192 Root CA \u2014 and verifies each signature. If the chain terminates at a trusted Root CA, the certificate is considered authentic. The bank\u2019s private key (A) is used to decrypt/sign, never shared publicly. CRLs (C) are checked for revoked certs but do not establish initial trust. Self-signed browser certificates (D) do not exist in this trust model.',
    source: 'curated',
    addedVersion: '4.58.4',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator creates the following three firewall rules in order: (1) Permit TCP 443 from ANY to 10.0.0.50; (2) Deny ALL from ANY to 10.0.0.50; (3) Permit TCP 22 from 192.168.1.100 to 10.0.0.50. An SSH connection from 192.168.1.100 to 10.0.0.50 is attempted. What happens?',
    difficulty: 'Exam Level',
    topic: 'Firewalls, DMZ & Security Zones',
    objective: '4.3',
    options: {
      A: 'The connection is permitted, because rule 3 explicitly allows SSH from that source.',
      B: 'The connection is denied, because rule 2 blocks it before rule 3 is evaluated.',
      C: 'The connection is permitted, because the source is on the trusted internal network.',
      D: 'The connection is denied, because there is no rule 0 permitting SSH.'
    },
    answer: 'B',
    explanation: 'Firewall rules are evaluated top-to-bottom with first-match-wins semantics. The SSH connection does not match rule 1 (port 443, not 22), but DOES match rule 2 (deny ALL). Evaluation stops there \u2014 rule 3 is never reached. To fix this, rule 3 must be placed ABOVE rule 2, or the deny rule needs to be more specific. This is the classic "rule order matters" principle \u2014 same pattern trained in the ACL Builder\u2019s Fix-It scenarios.',
    source: 'curated',
    addedVersion: '4.58.4',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'An attacker on the same local network segment as their target sends a crafted ARP reply claiming to be the gateway router. The target host updates its ARP cache with the attacker\u2019s MAC address and begins sending all outbound traffic to the attacker, who forwards it on to the real gateway. Which attack does this describe?',
    difficulty: 'Exam Level',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'DNS cache poisoning',
      B: 'ARP poisoning (man-in-the-middle)',
      C: 'DDoS amplification',
      D: 'SYN flood'
    },
    answer: 'B',
    explanation: 'ARP poisoning (also called ARP spoofing) manipulates the target\u2019s ARP cache so the target sends traffic intended for the gateway to the attacker instead. The attacker can then inspect, modify, or drop traffic \u2014 classic man-in-the-middle positioning. DNS cache poisoning (A) manipulates DNS resolver caches, not ARP. DDoS amplification (C) floods the target from many sources, a volumetric DoS attack. SYN flood (D) exhausts TCP connection state on the target, a DoS but not MITM.',
    source: 'curated',
    addedVersion: '4.58.4',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which of the following is an example of a physical security control rather than a logical security control?',
    difficulty: 'Foundational',
    topic: 'Physical Security Controls',
    objective: '4.5',
    options: {
      A: 'Firewall rule permitting HTTPS from specific IP ranges',
      B: 'Mantrap requiring badge scan to enter the server room',
      C: 'Password complexity policy enforced by Active Directory',
      D: 'Endpoint antivirus scanning disk reads'
    },
    answer: 'B',
    explanation: 'Physical security controls protect against unauthorised physical access to network infrastructure \u2014 mantraps, badge readers, CCTV, biometric locks, secure enclosures. Option A is a logical network control. Option C is an administrative/logical policy control. Option D is a logical endpoint control. Only Option B is a physical barrier against human access.',
    source: 'curated',
    addedVersion: '4.58.4',
    addedDate: '2026-04-21'
  },
  // ───── 5.0 Network Troubleshooting (15/15) — bank complete at 60/60 ─────
  {
    type: 'mcq',
    question: 'According to CompTIA\u2019s official 7-step troubleshooting methodology, what is the FIRST step a technician should take when responding to a user-reported network issue?',
    difficulty: 'Foundational',
    topic: 'CompTIA Troubleshooting Methodology',
    objective: '5.1',
    options: {
      A: 'Establish a theory of probable cause',
      B: 'Implement the solution or escalate',
      C: 'Identify the problem',
      D: 'Document findings and outcomes'
    },
    answer: 'C',
    explanation: 'CompTIA\u2019s methodology (N10-009 Objective 5.1) starts with Identify the problem \u2014 gather information, question users, identify symptoms, determine if anything has changed, and establish whether multiple issues might be involved. Only after identification do you move to Establish a theory (step 2), Test the theory (3), Plan of action (4), Implement (5), Verify (6), Document (7).',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A user complains that their workstation has no network connectivity. The technician finds that the Ethernet cable is connected at both the workstation NIC and the wall jack, but the NIC\u2019s link light is off. The cable is also used by a nearby workstation with working connectivity when swapped. What is the most likely cause?',
    difficulty: 'Exam Level',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'The workstation\u2019s NIC driver is outdated',
      B: 'A physical fault in the original cable (broken conductor, crimped end)',
      C: 'The switch port is in a disabled state',
      D: 'The workstation has an IP address conflict'
    },
    answer: 'B',
    explanation: 'When swapping in a known-good cable restores connectivity, the original cable is the fault \u2014 classic substitution-test result. A broken conductor inside the jacket, damaged RJ-45 crimp, or miswired pinout would all produce no link light. Driver issues (A) would not prevent the physical link from coming up. A disabled port (C) would affect BOTH cables tested on it. An IP conflict (D) would still show a link light \u2014 the failure would happen at Layer 3, not Layer 1.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A user reports they can browse websites normally but cannot access the company\u2019s internal file server at fileserver.corp.local. A ping to the file server\u2019s IP address (10.0.5.20) succeeds, but a ping to fileserver.corp.local fails with "Ping request could not find host." Which layer is the problem most likely at?',
    difficulty: 'Exam Level',
    topic: 'Connection Issues',
    objective: '5.5',
    options: {
      A: 'Layer 1 \u2014 physical cabling',
      B: 'Layer 3 \u2014 IP routing',
      C: 'Internal DNS resolution',
      D: 'Layer 4 \u2014 TCP port blocking'
    },
    answer: 'C',
    explanation: 'The IP ping works, so physical, link, and network layers are functional. But name resolution fails \u2014 the client cannot resolve the internal hostname to an IP. This points to internal DNS (often a misconfigured DNS server entry on the client, or the corp.local zone not served by the DNS the client is using). Option A would break both pings. Option B would prevent the IP ping too. Option D would block a specific service, but ping (ICMP) would succeed using the hostname if DNS worked.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Users at a branch office complain that file transfers to the headquarters server have become extremely slow over the last week. The technician runs iperf between the branch and HQ and measures 8 Mbps throughput on a link rated at 100 Mbps. A concurrent ping shows an average round-trip time of 180 ms with 0% packet loss. Which issue is most consistent with these findings?',
    difficulty: 'Hard',
    topic: 'Perf Issues',
    objective: '5.4',
    options: {
      A: 'Duplex mismatch on the branch switch port',
      B: 'TCP window size not scaled for the high-latency WAN link',
      C: 'DNS resolution failure',
      D: 'Layer 3 routing loop'
    },
    answer: 'B',
    explanation: '180 ms RTT with 0% loss rules out packet-level issues (duplex mismatch would show collisions/CRC errors and massive loss). The throughput ceiling at 8 Mbps on a 100 Mbps link, combined with high RTT, is classic TCP-window-size limitation on high-latency paths. Default TCP window (65 KB) limits throughput to ~window/RTT; 65 KB / 180 ms \u2248 2.9 Mbps per stream (scaling depends on OS). Without TCP window scaling (RFC 1323), the link is BDP-limited. Option A would show errors, not just low throughput. Option C would break the test entirely. Option D would cause loss.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A web server suddenly becomes unresponsive to client HTTP requests. The server\u2019s operating system and NIC are still reachable via ping, SSH works correctly, and CPU/RAM utilisation is normal. Other services on the same server (DNS, SMTP) respond normally. What is the most likely cause?',
    difficulty: 'Exam Level',
    topic: 'Service Issues',
    objective: '5.3',
    options: {
      A: 'Physical cable failure between server and switch',
      B: 'The HTTP service itself (web server process) has crashed or hung',
      C: 'Full storage volume preventing any I/O',
      D: 'DNS resolution failure for the server\u2019s hostname'
    },
    answer: 'B',
    explanation: 'When other services on the SAME server respond normally (including SSH, DNS, SMTP), the OS and network stack are healthy \u2014 the problem is isolated to the HTTP daemon itself. Service-specific crashes (segfault, out-of-memory in the web process, hung worker threads) are the natural diagnosis. Option A would break all services. Option C would also affect SSH login and logging. Option D is about name lookup, not the HTTP service itself.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network technician wants to identify every Layer-3 hop that a packet traverses between their workstation and a remote server at 93.184.216.34, including the round-trip time at each hop. Which command-line tool should they use?',
    difficulty: 'Exam Level',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'ping',
      B: 'nslookup',
      C: 'traceroute (or tracert on Windows)',
      D: 'netstat'
    },
    answer: 'C',
    explanation: 'traceroute (Linux/macOS) or tracert (Windows) progressively increments TTL values to discover each router along the path, reporting the IP and RTT for each hop. ping (A) tests end-to-end reachability and latency but does not reveal intermediate hops. nslookup (B) queries DNS name resolution. netstat (D) shows local connection state and listening sockets, not path information.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A technician wants to capture and inspect the actual TCP handshake (SYN, SYN-ACK, ACK) between a client and a web server to troubleshoot an intermittent connection failure. Which tool is best suited for this task?',
    difficulty: 'Exam Level',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'Wireshark (or tcpdump)',
      B: 'nslookup',
      C: 'route print',
      D: 'SNMP walk'
    },
    answer: 'A',
    explanation: 'Wireshark and tcpdump are packet capture and analysis tools that display every frame and its fields, including TCP flags, sequence numbers, and the three-way handshake. nslookup (B) is for DNS queries only. route print (C) shows the routing table, not packet contents. SNMP walk (D) queries device counters and MIB objects but does not inspect traffic in transit.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'On a Windows workstation, which command displays the current IP configuration including the assigned IP address, subnet mask, default gateway, and DNS servers?',
    difficulty: 'Exam Level',
    topic: 'Connection Issues',
    objective: '5.5',
    options: {
      A: 'ipconfig /all',
      B: 'netstat -r',
      C: 'ping 127.0.0.1',
      D: 'arp -a'
    },
    answer: 'A',
    explanation: 'ipconfig /all displays all interface details including IP, subnet mask, gateway, DNS servers, DHCP server, MAC address, and lease info. netstat -r (B) shows the routing table. ping 127.0.0.1 (C) tests the local TCP/IP stack but does not display configuration. arp -a (D) shows the local ARP cache.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A gigabit Ethernet link between a server and switch is experiencing very poor performance, with users reporting slow file transfers. The technician checks the switch interface statistics and sees a high number of late collisions and CRC errors. What is the most likely cause?',
    difficulty: 'Exam Level',
    topic: 'Perf Issues',
    objective: '5.4',
    options: {
      A: 'IP address conflict on the server',
      B: 'Duplex mismatch between the server NIC and the switch port',
      C: 'DNS resolver timing out',
      D: 'Full TCP receive window on the client'
    },
    answer: 'B',
    explanation: 'Late collisions and CRC errors on a full-duplex-expected link are the canonical signature of a duplex mismatch \u2014 one side forced to full-duplex, the other to half-duplex (or auto-negotiating to half). The full-duplex side transmits whenever it has data; the half-duplex side sees that as a collision. Option A would cause IP-layer connectivity issues, not interface-level errors. Option C affects name lookups only. Option D affects throughput but does not generate CRC/collision errors.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A workstation has an IP address of 169.254.87.112 and cannot reach any resources on the local network. What does this IP address indicate, and what is the root cause?',
    difficulty: 'Exam Level',
    topic: 'Connection Issues',
    objective: '5.5',
    options: {
      A: 'It is a private RFC 1918 address \u2014 the DHCP server assigned it correctly.',
      B: 'It is an APIPA address \u2014 the client failed to obtain a DHCP lease and self-assigned a link-local address.',
      C: 'It is a loopback address \u2014 the NIC is in diagnostic mode.',
      D: 'It is a multicast address \u2014 the workstation is incorrectly joined to a multicast group.'
    },
    answer: 'B',
    explanation: '169.254.0.0/16 is the APIPA (Automatic Private IP Addressing) range, used by Windows and other OSes when a DHCP server is unreachable. The client self-assigns a random 169.254.x.x address so it can communicate within its link-local segment, but it cannot reach anything beyond (no default gateway, no DNS). Next step: troubleshoot why DHCP is unreachable \u2014 server down, VLAN misconfigured, DHCP snooping blocking, or cable issue preventing discover from reaching the server.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which ICMP message type does the ping utility send to test end-to-end reachability?',
    difficulty: 'Foundational',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'Echo Request (Type 8)',
      B: 'Destination Unreachable (Type 3)',
      C: 'Time Exceeded (Type 11)',
      D: 'Router Solicitation (Type 10)'
    },
    answer: 'A',
    explanation: 'ping sends ICMP Echo Request (Type 8), and the destination responds with ICMP Echo Reply (Type 0) if reachable. Destination Unreachable (B, Type 3) is sent by intermediate routers when they cannot forward a packet. Time Exceeded (C, Type 11) is what traceroute uses \u2014 sent by routers when TTL reaches 0. Router Solicitation (D, Type 10) is part of IPv6 neighbor discovery.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Users report that VoIP calls to the remote office are choppy and words are being dropped, though video calls through the same path work fine. Which network metric is most likely out of acceptable range, and which is the typical upper bound for clear VoIP calls?',
    difficulty: 'Hard',
    topic: 'Perf Issues',
    objective: '5.4',
    options: {
      A: 'Latency exceeding 300 ms one-way',
      B: 'Jitter exceeding 30 ms',
      C: 'Throughput below 10 Mbps',
      D: 'MTU mismatch below 1500 bytes'
    },
    answer: 'B',
    explanation: 'VoIP is uniquely sensitive to jitter (variation in packet arrival time) because voice codecs decode samples at fixed intervals \u2014 inconsistent arrival produces choppy audio even if average latency is fine. Video tolerates more jitter because of buffering. Typical VoIP tolerance: jitter under 30 ms, latency under 150 ms one-way, packet loss under 1%. Latency (A) at 300 ms would cause noticeable delay but not choppy speech. Throughput (C) under 10 Mbps is still ample for VoIP (a G.711 call needs ~85 Kbps). MTU mismatch (D) would cause fragmentation, not choppy audio.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A DHCP server has been handing out IP leases for months without issue. This morning, newly booting clients are failing to obtain IP addresses, but clients that already have active leases continue to work normally. The DHCP server process is running and shows no error logs. What is the most likely cause?',
    difficulty: 'Exam Level',
    topic: 'Service Issues',
    objective: '5.3',
    options: {
      A: 'The DHCP server\u2019s IP address has changed',
      B: 'The DHCP scope has been exhausted (no available IP addresses to offer)',
      C: 'A routing loop between clients and the DHCP server',
      D: 'Firewall is blocking all ICMP traffic'
    },
    answer: 'B',
    explanation: 'When existing leases work but new clients fail \u2014 especially with no server-side errors \u2014 the most common cause is scope exhaustion: all available addresses in the DHCP pool are currently leased. New requests have nothing to offer. Option A would affect existing clients too during renewal. Option C would affect both new and renewing clients randomly. Option D would block ping but not DHCP (which uses UDP 67/68 broadcast).',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A technician is testing a terminated Cat 6 cable and the cable tester reports that pins 1 and 2 are crossed with pins 3 and 6 at one end compared to the other. Which cable wiring standard issue does this describe?',
    difficulty: 'Exam Level',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'Straight-through cable correctly wired to T568B on both ends',
      B: 'Crossover cable wired with T568A on one end and T568B on the other',
      C: 'Rollover cable for console connections',
      D: 'Open circuit on the cable'
    },
    answer: 'B',
    explanation: 'A crossover cable intentionally swaps the transmit pair (1,2) and receive pair (3,6) between the two ends, achieved by terminating one end with T568A and the other with T568B. This was historically required for PC-to-PC or switch-to-switch connections before Auto-MDIX became standard. Straight-through (A) has both ends identical. Rollover (C) reverses all 8 pins for Cisco console cables. Open circuit (D) would show a broken pair, not a crossover.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A technician has identified a network problem, established a theory, and verified that the theory is correct. They now need to fix the issue. According to CompTIA\u2019s methodology, what is the correct NEXT step before making any actual change?',
    difficulty: 'Exam Level',
    topic: 'CompTIA Troubleshooting Methodology',
    objective: '5.1',
    options: {
      A: 'Immediately implement the solution to restore service quickly',
      B: 'Establish a plan of action to resolve the problem and identify potential effects',
      C: 'Document findings and outcomes',
      D: 'Escalate the issue to a senior engineer'
    },
    answer: 'B',
    explanation: 'The 7-step methodology inserts "Establish a plan of action to resolve the problem and identify potential effects" BEFORE implementation (step 4 of 7). This step forces the technician to think through rollback, downtime, dependent systems, and communication before acting. Immediate implementation (A) skips the plan and risks making things worse. Documentation (C) is the final step (7). Escalation (D) can be part of the plan but is not the automatic next step.',
    source: 'curated',
    addedVersion: '4.58.5',
    addedDate: '2026-04-21'
  },
  // ═════════════════════════════════════════════════════════════════
  // PHASE 3 RECALIBRATION CYCLE 1 (v4.59.0) — gap coverage from user's
  // first real Jason Dion practice test (67/90 = 74%, 2026-04-21).
  // 14 new exemplars targeting topics the user had never seen before.
  // Bank grows 60 → 74.
  // ═════════════════════════════════════════════════════════════════
  // ───── Cluster 1: VPN tunnel types (4) ─────
  {
    type: 'mcq',
    question: 'A remote employee connects to their corporate VPN. Their VPN client is configured so that ALL traffic from their laptop \u2014 including traffic to Google, to streaming services, and to the corporate intranet \u2014 is routed through the corporate VPN gateway before exiting to the internet. Which VPN tunnel mode does this describe?',
    difficulty: 'Exam Level',
    topic: 'IPsec & VPN Protocols',
    objective: '4.4',
    options: {
      A: 'Split tunnel',
      B: 'Full tunnel',
      C: 'Clientless VPN',
      D: 'Point-to-point VPN'
    },
    answer: 'B',
    explanation: 'Full tunnel VPN (also called "forced tunnel") routes ALL client traffic through the VPN gateway. This gives the corporate security team full visibility into the user\u2019s internet activity and can enforce policies like DLP, web filtering, and malware inspection on all traffic. The trade-off is higher bandwidth consumption on the VPN link, and the user\u2019s internet traffic appears to originate from the corporate network. Split tunnel (A) is the opposite \u2014 only corporate-destined traffic uses the VPN. Clientless VPN (C) is a browser-based model, not a tunnel mode. Point-to-point (D) refers to dedicated WAN links.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A company wants to reduce bandwidth usage on their corporate VPN while still allowing remote users to access internal resources. They configure the VPN so that only traffic destined for internal subnets (10.0.0.0/8) goes through the VPN, while all other traffic (Google, SaaS apps, personal browsing) uses the user\u2019s local internet directly. Which VPN tunnel mode is in use?',
    difficulty: 'Exam Level',
    topic: 'IPsec & VPN Protocols',
    objective: '4.4',
    options: {
      A: 'Full tunnel',
      B: 'Split tunnel',
      C: 'Site-to-site IPsec',
      D: 'Clientless VPN'
    },
    answer: 'B',
    explanation: 'Split tunnel VPN routes only specific traffic (typically destined for internal corporate subnets) through the VPN, while all other traffic uses the client\u2019s normal internet connection. This reduces VPN bandwidth load and improves user experience for non-corporate traffic. Security trade-off: corporate security controls do not see the user\u2019s non-VPN traffic. Full tunnel (A) forces ALL traffic through the VPN. Site-to-site (C) connects networks. Clientless (D) is a different architecture.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A contractor needs occasional access to a company\u2019s internal web-based HR portal from their personal laptop while travelling. The company does not want to install any VPN client software on the contractor\u2019s machine, but they also need encrypted access to the internal-only HR portal. Which VPN solution best fits this requirement?',
    difficulty: 'Exam Level',
    topic: 'SSL/TLS VPN',
    objective: '4.4',
    options: {
      A: 'IPsec site-to-site VPN',
      B: 'Full-tunnel IPsec remote access VPN',
      C: 'Clientless SSL/TLS VPN (web portal access)',
      D: 'GRE tunneling'
    },
    answer: 'C',
    explanation: 'Clientless SSL/TLS VPN provides encrypted remote access to specific internal web applications through the user\u2019s standard HTTPS-capable browser \u2014 no client software installed on the endpoint. Users authenticate through a web portal, then access allowed applications through a reverse-proxy architecture. IPsec site-to-site (A) connects networks, not individual browsers. IPsec remote access (B) requires a client. GRE (D) is a tunneling protocol, not a remote-access VPN architecture.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which VPN architecture establishes a persistent, encrypted tunnel between two physical sites (such as a headquarters and a branch office) so that users at both sites can communicate as if on the same network, without requiring any VPN client on individual user endpoints?',
    difficulty: 'Exam Level',
    topic: 'IPsec & VPN Protocols',
    objective: '4.4',
    options: {
      A: 'Remote access VPN (full tunnel)',
      B: 'Remote access VPN (split tunnel)',
      C: 'Site-to-site VPN',
      D: 'Clientless SSL VPN'
    },
    answer: 'C',
    explanation: 'Site-to-site VPN connects two networks via VPN gateways at each end (typically routers or firewalls). Individual users at both sites are transparently part of the same logical network \u2014 no per-user VPN client needed. Remote access VPNs (A, B) are for individual users connecting from outside. Clientless (D) is for individual users accessing specific apps through a browser.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  // ───── Cluster 2: Rare/niche topics (5) ─────
  {
    type: 'mcq',
    question: 'Which RFC-standardized extension to NTP adds cryptographic authentication and encryption to time-synchronization traffic to prevent attackers from manipulating a target\u2019s clock?',
    difficulty: 'Hard',
    topic: 'NTP, ICMP & Traffic Types',
    objective: '1.6',
    options: {
      A: 'NTS (Network Time Security, RFC 8915)',
      B: 'NTP Authentication with shared keys (symmetric MD5)',
      C: 'NTP broadcast mode with multicast hardening',
      D: 'Authenticated NTP version 3 (RFC 1305)'
    },
    answer: 'A',
    explanation: 'NTS (Network Time Security, RFC 8915) provides TLS-based authentication and key exchange for NTPv4, protecting time-synchronization traffic from spoofing and replay attacks. This is the modern recommendation for secure NTP. Symmetric MD5 authentication (B) existed but uses pre-shared keys that do not scale and rely on weak MD5. Broadcast/multicast modes (C) are about delivery, not security. Authenticated NTPv3 (D) is legacy. NTS is the current N10-009 answer.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which IPv6 transition mechanism tunnels IPv6 traffic over IPv4 using UDP, specifically designed to work through existing IPv4 NAT devices?',
    difficulty: 'Hard',
    topic: 'IPv6',
    objective: '1.8',
    options: {
      A: '6to4 (RFC 3056)',
      B: 'Teredo (RFC 4380)',
      C: 'ISATAP',
      D: 'Dual-stack'
    },
    answer: 'B',
    explanation: 'Teredo (RFC 4380) encapsulates IPv6 packets inside UDP datagrams to traverse IPv4 NAT \u2014 NAT devices treat Teredo traffic as ordinary UDP, allowing IPv6 hosts behind NAT to communicate. 6to4 (A) does not traverse NAT directly \u2014 it uses protocol 41 which many NATs break. ISATAP (C) is for IPv6 over IPv4 within an administrative domain (intra-site). Dual-stack (D) runs both protocols natively, not a tunneling mechanism.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A security analyst wants to identify which TCP and UDP ports are open on a remote server, determine the operating system running on the host, and detect running services \u2014 without necessarily having administrative access to the target. Which tool is best suited for this task?',
    difficulty: 'Exam Level',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'Ping',
      B: 'Nmap (Network Mapper)',
      C: 'Wireshark',
      D: 'Traceroute'
    },
    answer: 'B',
    explanation: 'Nmap is the standard network discovery and port scanning tool. It enumerates open TCP/UDP ports, probes services (-sV), attempts OS fingerprinting (-O), and performs many reconnaissance functions \u2014 all without requiring target-side credentials. Ping (A) only tests reachability. Wireshark (C) captures traffic on the local interface; it observes but does not actively probe remote hosts. Traceroute (D) maps network paths but does not scan ports.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A technician uses Wireshark to capture network traffic on their segment and saves the capture for later analysis. Which file format is used to store this type of packet capture data?',
    difficulty: 'Foundational',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: '.pcap (or .pcapng)',
      B: '.log',
      C: '.csv',
      D: '.mib'
    },
    answer: 'A',
    explanation: 'PCAP (.pcap) and its successor PCAP Next Generation (.pcapng) are the standard file formats for storing packet captures. Tools like Wireshark, tcpdump, and tshark all read/write these formats. .log is a generic text-log format. .csv is tabular comma-separated values. .mib is a Management Information Base file used with SNMP.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A data center is being designed to protect expensive equipment from fire damage while minimizing the risk of accidental water release causing damage if a single sprinkler head is triggered or a pipe leaks. Which fire suppression system requires both a detection event (smoke or heat) AND a second triggering event (such as sprinkler activation) before water is released?',
    difficulty: 'Exam Level',
    topic: 'Physical Security Controls',
    objective: '4.5',
    options: {
      A: 'Wet pipe system',
      B: 'Dry pipe system',
      C: 'Pre-action system',
      D: 'Clean agent system (FM-200 / Inergen)'
    },
    answer: 'C',
    explanation: 'A pre-action fire suppression system keeps the pipes empty until BOTH a detection event occurs AND a sprinkler head is triggered. Only then does water enter the system and release at the triggered sprinkler. This prevents accidental water damage from leaks or a single sprinkler head activation. Wet pipe (A) has water in pipes at all times \u2014 single trigger releases water instantly. Dry pipe (B) uses pressurized air; water enters when a sprinkler activates. Clean agent (D) uses gas (no water) \u2014 different category for server rooms where water damage must be avoided entirely.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  // ───── Cluster 3: Blueprint coverage gaps (5) ─────
  {
    type: 'mcq',
    question: 'An organization wants to verify that every device connecting to the corporate network has up-to-date antivirus signatures, an active host firewall, and meets a minimum OS patch level before being allowed onto the production VLAN. Non-compliant devices should be placed into a quarantine VLAN with limited access. Which security technology enables this posture-based admission control?',
    difficulty: 'Exam Level',
    topic: 'AAA & Authentication',
    objective: '4.3',
    options: {
      A: 'Network Access Control (NAC)',
      B: 'Stateful firewall',
      C: 'Intrusion Detection System (IDS)',
      D: 'Network Address Translation (NAT)'
    },
    answer: 'A',
    explanation: 'Network Access Control (NAC) evaluates endpoint posture (AV status, patch level, host firewall, certificate presence) before granting network access. Non-compliant devices are placed in quarantine VLANs, given limited access, or denied entirely. NAC integrates with 802.1X for authentication and VLAN assignment. A stateful firewall (B) tracks connection state but does not evaluate endpoint posture. IDS (C) detects suspicious traffic post-admission, not posture pre-admission. NAT (D) translates addresses and is unrelated.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator wants to prioritize VoIP traffic over bulk file transfers at Layer 2 (within the local LAN) using the 3-bit priority field in the 802.1Q VLAN tag. Which QoS concept is this?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.2',
    options: {
      A: 'Differentiated Services Code Point (DSCP) at Layer 3',
      B: 'Class of Service (CoS) at Layer 2, using 802.1p',
      C: 'Type of Service (ToS) at Layer 3',
      D: 'Multi-Protocol Label Switching (MPLS)'
    },
    answer: 'B',
    explanation: 'Class of Service (CoS) uses the 3-bit Priority Code Point (PCP) field inside the 802.1Q VLAN tag to mark frames with a priority value 0-7 at Layer 2. Switches use these values to queue and prioritize traffic on local links. DSCP (A) and ToS (C) operate at Layer 3 in the IP header \u2014 useful across routers, but CoS is specifically Layer 2. MPLS (D) is a different forwarding paradigm using labels, not QoS marking.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A database server uses a RAID configuration with four 1 TB drives. The configuration stripes data across three drives for performance and stores distributed parity across all four, tolerating the failure of exactly one drive. What RAID level is this?',
    difficulty: 'Exam Level',
    topic: 'Business Continuity & Disaster Recovery',
    objective: '3.3',
    options: {
      A: 'RAID 0 (striping, no redundancy)',
      B: 'RAID 1 (mirroring)',
      C: 'RAID 5 (striping with distributed parity)',
      D: 'RAID 10 (striped mirrors)'
    },
    answer: 'C',
    explanation: 'RAID 5 stripes data and distributes parity blocks across all drives. It tolerates the loss of exactly one drive and provides both read performance and capacity efficiency (N-1 drives usable). RAID 0 (A) has no parity \u2014 any drive loss destroys data. RAID 1 (B) mirrors drives \u2014 requires two drives minimum, tolerates one failure, 50% capacity-efficient. RAID 10 (D) combines mirroring and striping \u2014 tolerates drive failures but uses 50% capacity.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A technician is deploying three wireless access points in close proximity and wants to eliminate co-channel interference while using the 2.4 GHz band. Which channel assignment provides the best non-overlapping configuration?',
    difficulty: 'Exam Level',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'Channels 1, 2, and 3',
      B: 'Channels 1, 6, and 11',
      C: 'Channels 2, 7, and 12',
      D: 'Channels 5, 10, and 15'
    },
    answer: 'B',
    explanation: 'In the 2.4 GHz band, only channels 1, 6, and 11 are truly non-overlapping in most regulatory domains. Each Wi-Fi channel is ~22 MHz wide, and the centers of channels 1, 6, and 11 are spaced 25 MHz apart \u2014 just enough to prevent interference. Options A, C, and D use channels that overlap each other, causing co-channel interference and degraded performance. (5 GHz has many more non-overlapping channels, which is why modern deployments prefer 5 GHz where possible.)',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator is reviewing PoE power classification standards. Which IEEE 802.3 standard defines Type 3 and Type 4 classifications that can deliver up to 60 W and 90-100 W respectively at the source, enabling devices like PTZ cameras and high-power wireless access points?',
    difficulty: 'Hard',
    topic: 'Ethernet Standards',
    objective: '2.3',
    options: {
      A: '802.3af (PoE, Type 1, up to 15.4 W)',
      B: '802.3at (PoE+, Type 2, up to 30 W)',
      C: '802.3bt (PoE++/4PPoE, Types 3 & 4, up to 60/100 W)',
      D: '802.3az (Energy Efficient Ethernet)'
    },
    answer: 'C',
    explanation: '802.3bt (ratified 2018) defines PoE++ classifications Type 3 (up to 60 W at source, 51 W at device) and Type 4 (up to ~90-100 W at source, ~71 W at device). It uses all 4 pairs of the cable rather than 2, hence also known as 4-Pair PoE (4PPoE). 802.3af (A) is the original PoE Type 1 at 15.4 W. 802.3at (B) is PoE+ Type 2 at 30 W (already in bank). 802.3az (D) is Energy Efficient Ethernet \u2014 unrelated to PoE power delivery.',
    source: 'curated',
    addedVersion: '4.59.0',
    addedDate: '2026-04-21'
  },
  // ═════════════════════════════════════════════════════════════════
  // PATH B — VOLUME EXPANSION BATCH 1 (v4.59.1): 20 new exemplars
  // User opted to grow the bank further with lightweight review.
  // Bank grows 74 → 94. Spread: D1 +5, D2 +4, D3 +4, D4 +3, D5 +4.
  // ═════════════════════════════════════════════════════════════════
  {
    type: 'mcq',
    question: 'A network administrator is configuring DNS records for a new web server that must be reachable by both IPv4 and IPv6 clients. Which two DNS record types should they configure for the hostname?',
    difficulty: 'Foundational',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'A record (IPv4) and AAAA record (IPv6)',
      B: 'A record (IPv4) and PTR record (IPv6)',
      C: 'MX record (IPv4) and CNAME record (IPv6)',
      D: 'NS record (IPv4) and SOA record (IPv6)'
    },
    answer: 'A',
    explanation: 'A = IPv4 (32-bit), AAAA ("quad-A") = IPv6 (128-bit). Both coexist under the same hostname, letting clients use whichever stack they support. PTR is reverse DNS. MX/CNAME/NS/SOA are real records but not for host-to-IP mapping.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator is deploying VoIP phones that require a configuration file downloaded from a TFTP server during boot. Which DHCP options should be configured on the DHCP server to provide the TFTP server address and bootfile name to the phones?',
    difficulty: 'Hard',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'Option 6 (DNS server) and Option 15 (domain name)',
      B: 'Option 66 (TFTP server) and Option 67 (bootfile name)',
      C: 'Option 3 (default gateway) and Option 51 (lease time)',
      D: 'Option 82 (relay agent) and Option 50 (requested IP)'
    },
    answer: 'B',
    explanation: 'Option 66 specifies the TFTP server name/IP; Option 67 specifies the bootfile name to retrieve from that server. Standard combo for VoIP phone provisioning (Cisco CallManager, Avaya) and PXE boot. Options 6/15 (A) are DNS-related. Options 3/51 (C) are gateway/lease. Option 82 (D) is relay agent info.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'An IPv6-enabled host joins a network. Without any DHCP server present, the host successfully obtains a global-scope IPv6 address based on a Router Advertisement message from the local router. Which IPv6 feature enables this behaviour?',
    difficulty: 'Exam Level',
    topic: 'IPv6',
    objective: '1.8',
    options: {
      A: 'DHCPv6 stateful assignment',
      B: 'Stateless Address Autoconfiguration (SLAAC)',
      C: 'Link-local tunneling',
      D: 'IPv4 DHCP fallback'
    },
    answer: 'B',
    explanation: 'SLAAC lets IPv6 hosts self-generate a global address using the prefix from Router Advertisements combined with their own interface identifier (EUI-64 or random). No DHCP server needed. DHCPv6 stateful (A) is the server-assigned alternative. Link-local tunneling (C) is not a standard term. IPv4 DHCP (D) does not apply to IPv6 configuration.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A load balancer is configured to distribute incoming HTTP traffic across four web servers. The administrator wants to ensure that each new connection goes to the server currently handling the FEWEST active connections, rather than distributing evenly in order. Which load balancing algorithm should be configured?',
    difficulty: 'Exam Level',
    topic: 'Network Appliances & Device Functions',
    objective: '1.2',
    options: {
      A: 'Round-robin',
      B: 'Least-connections',
      C: 'Weighted distribution',
      D: 'Source IP hash'
    },
    answer: 'B',
    explanation: 'Least-connections routes each new request to the server with the fewest current active connections \u2014 ideal when request durations vary significantly because server load stays balanced dynamically. Round-robin (A) distributes evenly in sequence regardless of load. Weighted distribution (C) assigns fixed ratios. Source IP hash (D) always sends the same client IP to the same server (for session affinity).',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'An organisation deploys some applications in their own on-premises data centre for regulatory compliance, while running other applications on a public cloud provider (AWS) for scalability. Integrations exist between the two environments. Which cloud deployment model does this describe?',
    difficulty: 'Exam Level',
    topic: 'Virtualisation & Cloud',
    objective: '1.3',
    options: {
      A: 'Public cloud',
      B: 'Private cloud',
      C: 'Hybrid cloud',
      D: 'Community cloud'
    },
    answer: 'C',
    explanation: 'Hybrid cloud combines on-premises (private) infrastructure with public cloud services, with integration between them. Standard model when compliance, latency, or cost require keeping some workloads on-prem while leveraging cloud elasticity for others. Public (A) is cloud-only. Private (B) is on-prem-only. Community (D) is shared between multiple organisations with common interests.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'In an OSPF broadcast network segment with five routers, which two OSPF roles are elected to reduce unnecessary LSA flooding between all neighbours?',
    difficulty: 'Hard',
    topic: 'OSPF',
    objective: '2.2',
    options: {
      A: 'Root Bridge and Secondary Root Bridge',
      B: 'Designated Router (DR) and Backup Designated Router (BDR)',
      C: 'Area Border Router and Autonomous System Boundary Router',
      D: 'Spanning Tree Root and LACP master'
    },
    answer: 'B',
    explanation: 'On multi-access segments, OSPF elects a Designated Router (DR) and Backup Designated Router (BDR) based on highest priority (default 1, tie-broken by router ID). Other routers form adjacencies with DR/BDR only, reducing the N*(N-1)/2 full mesh to 2N flooding. Root Bridge (A) is STP. ABR/ASBR (C) are OSPF roles but for inter-area/inter-AS boundaries. LACP master (D) is unrelated.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator wants to restrict each switch access port so that only the first MAC address seen on the port is allowed to communicate, but they do not want to manually type each device\u2019s MAC address. If another device plugs in, the port should automatically shut down. Which port security configuration achieves this?',
    difficulty: 'Exam Level',
    topic: 'Switch Features & VLANs',
    objective: '2.1',
    options: {
      A: '802.1X with RADIUS authentication',
      B: 'Port security with sticky MAC learning and violation mode "shutdown"',
      C: 'DHCP snooping with trust boundaries',
      D: 'BPDU Guard on all access ports'
    },
    answer: 'B',
    explanation: 'Port security with sticky MAC auto-learns the first MAC address and saves it to the config as if statically configured. The violation mode "shutdown" err-disables the port if a different MAC is seen. 802.1X (A) is stronger but requires user/device credentials. DHCP snooping (C) prevents rogue DHCP. BPDU Guard (D) disables STP-BPDU-sending devices on access ports.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network engineer is planning a fibre-optic link between two buildings 800 metres apart. The link needs to support 10 Gbps and be usable for at least the next decade without recabling. Which fibre type should they specify?',
    difficulty: 'Exam Level',
    topic: 'Cabling & Topology',
    objective: '2.3',
    options: {
      A: 'Multi-mode fibre (MMF) with OM1 specification',
      B: 'Multi-mode fibre (MMF) with OM3/OM4 specification',
      C: 'Single-mode fibre (SMF) with OS1/OS2 specification',
      D: 'Cat 6a shielded twisted pair'
    },
    answer: 'C',
    explanation: 'Single-mode fibre (SMF) uses a narrow 8-10 \u03bcm core with laser light sources, supporting distances of multiple kilometres at 10-100 Gbps. It is the right long-distance future-proof choice. MMF OM1 (A) is older and limited to ~33 m at 10G. MMF OM3/OM4 (B) supports 10G but only to ~300-400 m. Cat 6a (D) is copper, topping out at ~100 m for 10 Gbps.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which of the following features is NEW in WPA3 compared to WPA2?',
    difficulty: 'Exam Level',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'Use of AES-based encryption',
      B: 'Support for 802.1X enterprise authentication',
      C: 'Simultaneous Authentication of Equals (SAE) replacing the pre-shared key four-way handshake',
      D: 'Backward compatibility with WEP clients'
    },
    answer: 'C',
    explanation: 'WPA3 introduces SAE (also called Dragonfly) for personal-mode authentication, replacing WPA2\u2019s four-way handshake \u2014 SAE is resistant to offline dictionary attacks. AES (A) is used by both WPA2 and WPA3. 802.1X enterprise (B) exists in both. WPA3 does NOT maintain WEP backward compatibility (D) \u2014 WEP is deprecated.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator wants to guarantee that VoIP traffic is serviced first at each router\u2019s egress queue, with strict priority over all other traffic (including video and bulk data). Which QoS queuing mechanism provides this strict-priority behaviour?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.2',
    options: {
      A: 'First-In First-Out (FIFO)',
      B: 'Class-Based Weighted Fair Queuing (CBWFQ)',
      C: 'Low Latency Queuing (LLQ)',
      D: 'Random Early Detection (RED)'
    },
    answer: 'C',
    explanation: 'LLQ adds a strict-priority queue to CBWFQ specifically for latency-sensitive traffic like VoIP \u2014 packets in the priority queue are always serviced first. CBWFQ alone (B) provides bandwidth guarantees but not strict-priority. FIFO (A) is no QoS at all. RED (D) is a congestion avoidance mechanism that drops packets probabilistically, not a queuing method.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator takes a full backup every Sunday night. On Monday through Saturday, they want backups to capture only the files that have changed since the MOST RECENT backup of any type (reducing each daily backup\u2019s size). Which backup type achieves this?',
    difficulty: 'Foundational',
    topic: 'Business Continuity & Disaster Recovery',
    objective: '3.3',
    options: {
      A: 'Full backup',
      B: 'Incremental backup',
      C: 'Differential backup',
      D: 'Snapshot'
    },
    answer: 'B',
    explanation: 'Incremental backups only back up files changed since the last backup of any type (full or incremental). Smallest daily size but slowest restore (requires all incrementals back to the last full). Differential (C) backs up files changed since the last FULL backup \u2014 grows larger each day but faster restore. Full (A) backs up everything every time. Snapshots (D) are point-in-time copies.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A company is planning disaster recovery for their primary data centre. They want a secondary facility that has identical hardware, pre-loaded data kept in near-real-time sync, and the ability to take over production within minutes of a primary-site failure. Which DR site type does this describe?',
    difficulty: 'Exam Level',
    topic: 'Business Continuity & Disaster Recovery',
    objective: '3.3',
    options: {
      A: 'Cold site',
      B: 'Warm site',
      C: 'Hot site',
      D: 'Bunker site'
    },
    answer: 'C',
    explanation: 'A hot site is fully equipped and actively synchronised with the primary \u2014 failover can occur in minutes. Most expensive option but provides the fastest recovery. Cold site (A) has space and utilities only; hardware must be installed after a disaster (days/weeks recovery). Warm site (B) has hardware but no live data; recovery in hours to a day. Bunker site (D) is not a standard N10-009 term.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A data centre operations manager specifies that the facility must tolerate a complete utility power failure without ANY interruption to critical servers, even for a moment. Which combination of power protection is required?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Surge protector only',
      B: 'UPS (battery-based, seconds to minutes of runtime) combined with a diesel generator (hours to days of runtime)',
      C: 'Dual power supplies on each server',
      D: 'Redundant circuits from the same utility'
    },
    answer: 'B',
    explanation: 'A UPS bridges the brief gap (seconds to minutes) between utility failure and generator startup. The generator provides long-term power until utility is restored. This combination eliminates interruption to critical loads. A surge protector (A) only protects against voltage spikes. Dual PSUs (C) protect against PSU failure, not utility loss. Redundant circuits from the same utility (D) fail together during a utility-wide outage.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network engineer is comparing RADIUS and TACACS+ for centralised authentication. Which statement accurately describes a key difference between them?',
    difficulty: 'Exam Level',
    topic: 'AAA & Authentication',
    objective: '4.1',
    options: {
      A: 'RADIUS encrypts the entire packet; TACACS+ encrypts only the password.',
      B: 'RADIUS encrypts only the password; TACACS+ encrypts the entire packet body.',
      C: 'RADIUS uses TCP; TACACS+ uses UDP.',
      D: 'RADIUS is Cisco-proprietary; TACACS+ is an IETF standard.'
    },
    answer: 'B',
    explanation: 'RADIUS (RFC 2865, UDP 1812/1813) encrypts only the password field. TACACS+ (Cisco-originated, TCP 49) encrypts the entire packet body, making it more secure for device-admin access. The protocol types are opposite of what C states: RADIUS=UDP, TACACS+=TCP. The open-standard relationship is opposite of what D states: TACACS+ is Cisco-originated but now broadly supported, RADIUS is IETF-standard.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'An attacker sets up a rogue wireless access point in a coffee shop broadcasting the same SSID as the legitimate shop Wi-Fi, at a stronger signal. Unsuspecting customers connect to the rogue AP thinking it is the real one, giving the attacker a position to intercept their traffic. Which attack does this describe?',
    difficulty: 'Exam Level',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'Deauthentication attack',
      B: 'Evil twin attack',
      C: 'Rogue DHCP',
      D: 'ARP spoofing'
    },
    answer: 'B',
    explanation: 'An evil twin is a rogue AP that impersonates a legitimate SSID at stronger signal strength, inducing victims to associate with the attacker. Once associated, the attacker performs MITM attacks on the victim\u2019s traffic. Deauthentication (A) forces clients off a network; often a preparatory step, not the evil-twin mechanism itself. Rogue DHCP (C) hands out malicious DHCP leases. ARP spoofing (D) is wired-LAN MITM, not wireless impersonation.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A security architect is designing access controls for a new internal application. Users should be granted ONLY the specific permissions needed to perform their job function \u2014 no broader access. If a user changes roles, their permissions should be re-evaluated. Which security principle does this describe?',
    difficulty: 'Hard',
    topic: 'Securing TCP/IP',
    objective: '4.1',
    options: {
      A: 'Defence in depth',
      B: 'Principle of least privilege',
      C: 'Zero-trust architecture (assume breach)',
      D: 'Security through obscurity'
    },
    answer: 'B',
    explanation: 'Least privilege grants each user/process the minimum access needed for its function \u2014 reducing attack blast radius if the account is compromised. Permissions are reviewed when roles change. Defence in depth (A) layers multiple security controls. Zero-trust (C) is the broader philosophy that "no access is implicitly trusted" \u2014 least privilege is one implementation of it. Security through obscurity (D) is the (flawed) idea of hiding rather than securing.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A technician is tracing an unmarked network cable that runs from the wiring closet patch panel to somewhere in the building. They need to identify which wall jack the cable terminates at. Which tool combination is best suited to this task?',
    difficulty: 'Foundational',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'Cable tester for continuity',
      B: 'Tone generator (fox) connected to one end, paired with an inductive probe',
      C: 'Wireshark on the switch port',
      D: 'Multimeter for voltage testing'
    },
    answer: 'B',
    explanation: 'A tone generator injects an audible tone onto one end of a copper cable; an inductive probe detects that tone nearby without making electrical contact. The technician moves the probe near each wall jack \u2014 the jack where the probe beeps loudest is the terminated end. Cable tester (A) checks continuity and pinout but does not locate the far end. Wireshark (C) captures traffic. Multimeter (D) measures voltage/resistance, not useful for cable tracing.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which troubleshooting approach starts at the OSI Application layer (Layer 7) and works downward toward the Physical layer (Layer 1), typically starting with user-visible symptoms?',
    difficulty: 'Exam Level',
    topic: 'CompTIA Troubleshooting Methodology',
    objective: '5.1',
    options: {
      A: 'Top-down',
      B: 'Bottom-up',
      C: 'Divide and conquer',
      D: 'Follow the path'
    },
    answer: 'A',
    explanation: 'Top-down starts at Layer 7 (where the user is) and works toward the physical layer \u2014 good when the issue is known to involve a specific application. Bottom-up (B) starts at Layer 1 (cables, link lights) and works up \u2014 good when suspecting physical/link issues. Divide and conquer (C) starts at the middle (typically Layer 3) and works in the direction of symptoms. Follow-the-path traces the packet\u2019s route through the network.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A user reports a "weak wireless signal" in their office. The technician measures the signal strength at the user\u2019s laptop and reads -85 dBm. Using typical industry thresholds for Wi-Fi signal quality, how should this reading be interpreted?',
    difficulty: 'Hard',
    topic: 'Perf Issues',
    objective: '5.4',
    options: {
      A: 'Excellent signal \u2014 strong enough for video calls',
      B: 'Good signal \u2014 adequate for most business applications',
      C: 'Weak signal \u2014 likely to cause dropouts and low throughput',
      D: 'No signal \u2014 the laptop is not connected'
    },
    answer: 'C',
    explanation: 'Wi-Fi signal strength in dBm is negative \u2014 closer to zero is stronger. Typical thresholds: -30 to -50 dBm excellent, -60 to -67 good for VoIP and video, -68 to -80 acceptable for basic web browsing, -80 to -90 weak (dropouts and retransmissions likely), below -90 unusable. -85 dBm falls in the weak range. The laptop is likely still connected (D is wrong; disconnect would show no signal at all, not -85).',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'On a Cisco switch, which command displays the current status of all physical interfaces including administrative status, operational status, and error counters (CRC errors, input/output errors, collisions)?',
    difficulty: 'Exam Level',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'show interfaces',
      B: 'show running-config',
      C: 'show ip route',
      D: 'show vlan brief'
    },
    answer: 'A',
    explanation: '`show interfaces` provides comprehensive per-interface state: admin/operational status, duplex/speed, error counters (CRC, input/output errors, collisions), bytes in/out. Critical for identifying duplex mismatches and cable issues. `show running-config` (B) displays the current configuration, not interface statistics. `show ip route` (C) displays the routing table. `show vlan brief` (D) shows VLAN-to-port assignments.',
    source: 'curated',
    addedVersion: '4.59.1',
    addedDate: '2026-04-21'
  },
  // ═════════════════════════════════════════════════════════════════
  // PATH B — VOLUME EXPANSION BATCH 2 (v4.59.2): 20 new exemplars
  // Bank grows 94 → 114. Spread: D1 +5, D2 +4, D3 +4, D4 +4, D5 +3.
  // ═════════════════════════════════════════════════════════════════
  {
    type: 'mcq',
    question: 'A workstation is configured with the IP address 10.50.120.45 and subnet mask 255.255.240.0. Which network address does this host belong to?',
    difficulty: 'Exam Level',
    topic: 'Subnetting & IP Addressing',
    objective: '1.7',
    options: {
      A: '10.50.0.0',
      B: '10.50.112.0',
      C: '10.50.120.0',
      D: '10.50.128.0'
    },
    answer: 'B',
    explanation: '255.255.240.0 = /20, meaning the third octet is masked by 11110000 (value 240). To find the network portion of the third octet: 120 AND 240 = 112 (120 = 01111000; AND with 11110000 = 01110000 = 112). The network is 10.50.112.0/20 and covers hosts 10.50.112.0 through 10.50.127.255.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which protocol uses TCP port 3389 by default for remote desktop connections to Windows servers and workstations?',
    difficulty: 'Foundational',
    topic: 'Port Numbers',
    objective: '1.4',
    options: {
      A: 'SSH',
      B: 'RDP (Remote Desktop Protocol)',
      C: 'VNC',
      D: 'Telnet'
    },
    answer: 'B',
    explanation: 'RDP uses TCP port 3389. SSH (A) uses port 22. VNC (C) typically uses 5900-5902. Telnet (D) uses 23. RDP is Microsoft\u2019s proprietary remote-display protocol, widely used for Windows administration.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A DNS server delivers the same IP address (used by a content delivery network) to clients all over the world. Clients automatically connect to the geographically closest CDN node responding to that single IP. Which traffic/addressing type enables this behaviour?',
    difficulty: 'Exam Level',
    topic: 'NTP, ICMP & Traffic Types',
    objective: '1.4',
    options: {
      A: 'Unicast',
      B: 'Multicast',
      C: 'Broadcast',
      D: 'Anycast'
    },
    answer: 'D',
    explanation: 'Anycast advertises the SAME IP address from multiple geographically distributed servers. Routing protocols (BGP) direct each client\u2019s request to the topologically closest instance. Used by CDNs, DNS root servers, and DDoS-resistant services. Unicast (A) is one-to-one. Multicast (B) is one-to-subscribed-group. Broadcast (C) is local-segment only.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A company wants to establish a private, high-bandwidth, low-latency connection from their on-premises data centre directly to their cloud provider\u2019s backbone \u2014 bypassing the public internet entirely \u2014 to support latency-sensitive workloads with consistent performance. Which service best matches this requirement?',
    difficulty: 'Hard',
    topic: 'Virtualisation & Cloud',
    objective: '1.3',
    options: {
      A: 'Site-to-site IPsec VPN over the internet',
      B: 'AWS Direct Connect / Azure ExpressRoute (dedicated private connectivity)',
      C: 'Public internet with QoS tagging',
      D: 'DNS load balancing'
    },
    answer: 'B',
    explanation: 'Direct Connect (AWS) / ExpressRoute (Azure) / Cloud Interconnect (GCP) provide dedicated physical or virtual circuits from on-premises to the cloud provider\u2019s network, bypassing the public internet. Predictable latency, higher bandwidth, and better SLAs than VPN. Site-to-site VPN (A) uses the public internet and is subject to its variability. QoS over public internet (C) only prioritises within your own network, not across the internet. DNS load balancing (D) is unrelated.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'An internal web server is configured at 192.168.1.50:8080. External users must reach this server on the company\u2019s public IP 203.0.113.5 at port 80 (HTTP). Which NAT configuration enables this without changing the internal server\u2019s IP or port?',
    difficulty: 'Exam Level',
    topic: 'NAT & IP Services',
    objective: '1.7',
    options: {
      A: 'Static NAT with port forwarding (destination NAT / PAT rule mapping public 203.0.113.5:80 \u2192 internal 192.168.1.50:8080)',
      B: 'Dynamic NAT with address pool',
      C: 'NAT overload (PAT) without explicit rules',
      D: 'NAT64 with prefix translation'
    },
    answer: 'A',
    explanation: 'Static NAT with port forwarding (destination NAT on most firewalls) creates a fixed mapping from an external IP+port to an internal IP+port. The public 203.0.113.5:80 rule forwards inbound connections to 192.168.1.50:8080. Dynamic NAT (B) is for outbound traffic from internal hosts. PAT (C) handles outbound many-to-one; does not inherently publish internal services. NAT64 (D) translates between IPv6 and IPv4.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator notices that a server transferring large files over a 10 Gbps Ethernet link to an NAS is only achieving 2-3 Gbps throughput. CPU utilisation on both endpoints is high during transfers. Which Ethernet feature, if enabled on both endpoints and the switch between them, could improve throughput by reducing per-packet CPU overhead?',
    difficulty: 'Exam Level',
    topic: 'Ethernet Standards',
    objective: '2.3',
    options: {
      A: 'Full-duplex operation',
      B: 'Jumbo frames (MTU 9000)',
      C: 'PoE+ (802.3at)',
      D: '802.1X authentication'
    },
    answer: 'B',
    explanation: 'Jumbo frames (MTU 9000 bytes, vs standard 1500) reduce the per-packet overhead by fitting more data in each frame, dramatically lowering CPU-per-byte processing for large transfers. Requires support on both endpoints AND every switch in the path. Full-duplex (A) eliminates collisions but does not reduce frame overhead. PoE (C) is power, unrelated. 802.1X (D) is authentication, unrelated.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A wireless engineer wants to deploy multiple access points across a large office, centrally managing their configuration, firmware, and RF parameters from a single console. The APs themselves should be lightweight and receive their configuration from the central console at boot. Which architecture is this?',
    difficulty: 'Exam Level',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'Autonomous (fat) access points',
      B: 'Lightweight (thin) access points controlled by a Wireless LAN Controller (WLC)',
      C: 'Mesh network with peer-to-peer configuration',
      D: 'Standalone home routers with WPS'
    },
    answer: 'B',
    explanation: 'Lightweight APs (also called "thin" APs) offload configuration, security, and RF management to a central Wireless LAN Controller (WLC). They use CAPWAP (Control And Provisioning of Wireless Access Points) tunnels to exchange management traffic with the WLC. Autonomous APs (A) are fully self-contained \u2014 each individually configured. Mesh (C) is a peer topology for extending coverage. Home routers (D) are not enterprise-managed.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'An administrator configures two static routes to the same destination network with different next-hop routers. Route A has an administrative distance of 1, and Route B has an administrative distance of 5. Which route will be installed in the routing table and used for forwarding?',
    difficulty: 'Hard',
    topic: 'Routing Protocols',
    objective: '2.2',
    options: {
      A: 'Route A (AD 1) \u2014 lower AD is preferred',
      B: 'Route B (AD 5) \u2014 higher AD is preferred',
      C: 'Both routes \u2014 traffic is load-balanced',
      D: 'Neither \u2014 conflicting static routes are rejected'
    },
    answer: 'A',
    explanation: 'Administrative Distance (AD) measures trustworthiness of a route \u2014 LOWER is preferred. Static routes default to AD 1 (most trusted). When multiple routes to the same destination exist, the router picks the lowest-AD one and installs only that in the routing table. This is called "floating static routes" when using different ADs intentionally \u2014 the higher-AD route only activates if the lower-AD route fails.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A data centre network administrator notices that a particular application is generating large amounts of traffic between two web servers in the same rack, but the traffic is traversing the aggregation switches and core before returning \u2014 adding latency. Which modern design principle would reduce this latency?',
    difficulty: 'Exam Level',
    topic: 'Data Center Architectures',
    objective: '2.1',
    options: {
      A: 'Install additional aggregation layers',
      B: 'Use a spine-leaf topology where every leaf connects directly to every spine, keeping server-to-server paths to 2 hops',
      C: 'Enable more STP instances',
      D: 'Convert all links to half-duplex'
    },
    answer: 'B',
    explanation: 'Traditional three-tier (core/aggregation/access) is optimised for north-south traffic; east-west server-to-server paths can be 4-6 hops through aggregation and core. Spine-leaf flattens this: every leaf (server-facing) connects to every spine (aggregation) \u2014 server-to-server path is always exactly 2 hops (leaf \u2192 spine \u2192 leaf). Adding aggregation layers (A) adds hops. STP (C) is for loop prevention. Half-duplex (D) would dramatically WORSEN performance.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A Syslog server is configured to receive logs from all network devices. Which port does Syslog use by default, and over which transport protocol?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'TCP port 514',
      B: 'UDP port 514',
      C: 'TCP port 443',
      D: 'UDP port 161'
    },
    answer: 'B',
    explanation: 'Syslog traditionally uses UDP port 514 \u2014 chosen because logging is high-volume and UDP\u2019s lower overhead is acceptable (occasional log loss is tolerable). RFC 5424 introduced Syslog over TCP (also 514) for reliability, but UDP 514 is the default on virtually all network equipment. TCP 443 is HTTPS. UDP 161 is SNMP polls.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A security team deploys a SIEM platform that receives logs from firewalls, web servers, authentication systems, and switches. The SIEM is expected to correlate events across these sources to identify attack patterns. Which statement BEST describes SIEM\u2019s core value?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'It replaces the need for individual security tools at each device',
      B: 'It aggregates logs from multiple sources and correlates events to detect patterns that individual tools would miss',
      C: 'It automatically blocks malicious traffic at the network perimeter',
      D: 'It provides bandwidth analysis between devices'
    },
    answer: 'B',
    explanation: 'A SIEM\u2019s core value is log aggregation + correlation \u2014 combining signals from different sources (e.g., failed login + firewall block + suspicious file access) to identify patterns no single tool would catch. Option A is wrong \u2014 SIEM complements, not replaces, point security tools. Option C describes a firewall or IPS, not SIEM. Option D describes NetFlow.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Which WAN connectivity option historically provides a dedicated, always-on point-to-point link between two specific locations at a fixed bandwidth (such as 1.544 Mbps or 2.048 Mbps), billed at a flat monthly rate regardless of usage?',
    difficulty: 'Foundational',
    topic: 'WAN Connectivity',
    objective: '3.5',
    options: {
      A: 'DSL',
      B: 'Cable broadband',
      C: 'Leased line (T1 / E1)',
      D: 'Dial-up modem'
    },
    answer: 'C',
    explanation: 'A leased line (T1 = 1.544 Mbps in North America, E1 = 2.048 Mbps in Europe) is a dedicated point-to-point circuit rented from a telecom provider. Guaranteed bandwidth, always on, flat monthly cost. DSL (A) and cable (B) are shared-medium consumer broadband. Dial-up (D) is on-demand, not always-on.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A DR plan specifies that a database must be restorable to any point in time within the last 24 hours, not just to the most recent full backup. Which backup strategy achieves this requirement?',
    difficulty: 'Hard',
    topic: 'Business Continuity & Disaster Recovery',
    objective: '3.3',
    options: {
      A: 'Daily full backups only, retained for 7 days',
      B: 'Daily full backups plus continuous transaction-log archiving (point-in-time recovery)',
      C: 'Weekly full backups, retained for 4 weeks',
      D: 'Daily differential backups without any full backups'
    },
    answer: 'B',
    explanation: 'Point-in-time recovery requires a full backup (baseline) PLUS continuous capture of transaction logs (journal). To restore to any moment, you replay the full backup then apply log entries up to the target time. Option A can only restore to the moment of each full backup \u2014 not between. Option C has the same limitation. Option D is invalid \u2014 differentials require a full backup baseline to be meaningful.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A company deploys internal web applications accessible only from specific trusted internal subnets. External threats keep trying to access these apps from the internet. Which network design principle best addresses this by isolating the applications from untrusted networks?',
    difficulty: 'Exam Level',
    topic: 'Protecting Networks',
    objective: '4.3',
    options: {
      A: 'Network segmentation with VLANs and firewall policies',
      B: 'Implementing a strong password policy',
      C: 'Enabling SNMPv3',
      D: 'Deploying host-based antivirus'
    },
    answer: 'A',
    explanation: 'Network segmentation isolates workloads into distinct VLANs/subnets, enforced by firewall rules, so untrusted networks simply cannot reach the restricted apps at all. Defence-in-depth principle: limit blast radius. Password policy (B) protects access but does not prevent network-level reachability. SNMPv3 (C) is management traffic security. Antivirus (D) protects endpoints, not network isolation.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'In the 802.1X authentication framework used by WPA-Enterprise wireless networks, which role is played by the device attempting to connect (such as a laptop)?',
    difficulty: 'Exam Level',
    topic: 'WPA3 & EAP Authentication',
    objective: '4.4',
    options: {
      A: 'Supplicant',
      B: 'Authenticator',
      C: 'Authentication Server',
      D: 'Certificate Authority'
    },
    answer: 'A',
    explanation: '802.1X defines three roles: Supplicant (the client device attempting access), Authenticator (the switch/AP that controls port access and relays credentials), and Authentication Server (typically RADIUS, which validates credentials). CA (D) issues certificates if EAP-TLS is used but is not itself an 802.1X role.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A user visits https://example.com and their browser displays a warning that the certificate has been revoked. The browser determined this status by checking a specific PKI mechanism in real time. Which mechanism did the browser use?',
    difficulty: 'Hard',
    topic: 'PKI & Certificate Management',
    objective: '4.1',
    options: {
      A: 'Certificate chain validation',
      B: 'Online Certificate Status Protocol (OCSP)',
      C: 'Certificate pinning',
      D: 'Self-signed certificate check'
    },
    answer: 'B',
    explanation: 'OCSP lets a browser query a certificate authority\u2019s OCSP responder in real time to check if a certificate has been revoked. The older alternative, CRL (Certificate Revocation List), is a downloaded list updated periodically. Chain validation (A) verifies certificate authenticity via signed chain, not revocation. Certificate pinning (C) hard-codes expected certs in client apps. Self-signed checks (D) are unrelated.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'An attacker sends thousands of spoofed SYN packets to a web server without ever completing the TCP handshake. The server\u2019s connection state table fills up, and legitimate users cannot establish new connections. Which attack is this?',
    difficulty: 'Exam Level',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'ARP poisoning',
      B: 'SYN flood (a type of DoS attack)',
      C: 'Man-in-the-middle',
      D: 'SQL injection'
    },
    answer: 'B',
    explanation: 'A SYN flood exhausts the server\u2019s half-open connection table by sending SYN packets and never responding to the SYN-ACK. With the table full, legitimate clients cannot initiate new connections. This is a denial-of-service (DoS) attack at the TCP layer. ARP poisoning (A) is MITM on the local LAN. MITM (C) intercepts traffic but does not necessarily DoS. SQL injection (D) targets application-layer database queries.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A user reports that they can reach servers on their local subnet (10.0.1.0/24) but cannot reach any destinations beyond it. A traceroute to an external server shows it failing at the first hop \u2014 the user\u2019s default gateway. What is the most likely root cause?',
    difficulty: 'Exam Level',
    topic: 'Connection Issues',
    objective: '5.5',
    options: {
      A: 'DNS resolution failure',
      B: 'The default gateway is unreachable (down, misconfigured, or wrong IP)',
      C: 'HTTP proxy is required but not configured',
      D: 'TLS certificate expired'
    },
    answer: 'B',
    explanation: 'If local subnet access works but any cross-subnet traffic fails at the first hop (the gateway), the default gateway is the problem: it may be down, reachable but misconfigured for the user\u2019s traffic, or the client has the wrong gateway IP set. DNS failures (A) would still allow IP-level pings. HTTP proxy (C) affects HTTP only, not all destinations. TLS cert (D) is application-layer, would not cause ping to fail.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'A network administrator is investigating slow network performance on a switch interface. The interface statistics show a large and rapidly growing number of "input drops" and "output drops." What does this indicate?',
    difficulty: 'Exam Level',
    topic: 'Perf Issues',
    objective: '5.4',
    options: {
      A: 'Cable faults are causing CRC errors',
      B: 'The switch is discarding packets because its buffers are overflowing (congestion/microbursts)',
      C: 'The switch has been compromised by malware',
      D: 'DHCP is misconfigured'
    },
    answer: 'B',
    explanation: 'Input/output drops (also called "discards") happen when the switch\u2019s internal buffers cannot hold incoming/outgoing packets fast enough and the switch must drop them. Indicates congestion, speed mismatches (e.g., 10G flowing into 1G), or microbursts. CRC errors (A) are a separate counter, indicating Layer 1 corruption. Malware (C) usually does not manifest as interface drops. DHCP (D) is unrelated to interface performance counters.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  {
    type: 'mcq',
    question: 'Users at a branch office report intermittent VPN disconnections every 5-10 minutes. The VPN concentrator logs show "phase 2 SA renegotiation failed" messages matching the disconnect times. Which IPsec issue does this suggest?',
    difficulty: 'Hard',
    topic: 'Service Issues',
    objective: '5.3',
    options: {
      A: 'IKE Phase 1 authentication failing \u2014 pre-shared keys do not match',
      B: 'IKE Phase 2 SA (Child SA) rekey failing \u2014 mismatched transform sets or NAT-T issues',
      C: 'Layer 1 cable fault between branch and ISP',
      D: 'MTU mismatch causing SSL certificate errors'
    },
    answer: 'B',
    explanation: 'The error points specifically to IKE Phase 2 (the "Child SA" that carries actual data traffic) failing to rekey. IPsec Phase 2 rekeys periodically (often every hour or based on data volume); if mismatched transform sets, NAT traversal problems, or MTU/fragmentation issues interfere, the rekey fails and the tunnel drops. Phase 1 auth (A) would prevent the tunnel from forming at all. Layer 1 (C) would show different symptoms. SSL (D) is not involved in IPsec.',
    source: 'curated',
    addedVersion: '4.59.2',
    addedDate: '2026-04-21'
  },
  // ═════════════════════════════════════════════════════════════════
  // PATH B — VOLUME EXPANSION BATCH 3 (v4.59.3): 20 new exemplars
  // FINAL BATCH — bank grows 114 → 134 (hits user target).
  // Spread: D1 +4, D2 +4, D3 +4, D4 +4, D5 +4.
  // ═════════════════════════════════════════════════════════════════
  // ── D1-27: TCP vs UDP (1.4 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which statement correctly distinguishes TCP from UDP at the transport layer?',
    difficulty: 'Exam Level',
    topic: 'NTP, ICMP & Traffic Types',
    objective: '1.4',
    options: {
      A: 'TCP is connectionless and unreliable; UDP is connection-oriented and reliable',
      B: 'TCP is connection-oriented with a 3-way handshake and reliable delivery; UDP is connectionless with no handshake and best-effort delivery',
      C: 'TCP and UDP both perform a 3-way handshake, but only UDP retransmits lost packets',
      D: 'TCP operates at Layer 3 and UDP operates at Layer 4'
    },
    answer: 'B',
    explanation: 'TCP is connection-oriented: SYN → SYN/ACK → ACK handshake, sequence/ACK numbers, retransmission, flow control, congestion control. UDP is connectionless: send-and-forget, no handshake, no retransmission, lower overhead. Both live at Layer 4 (D is wrong). The roles are reversed in A, and C misrepresents UDP.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D1-28: TCP/IP model layer mapping (1.1 / Foundational / recall) ──
  {
    type: 'mcq',
    question: 'In the TCP/IP (DoD) model, which layer maps to the OSI Network layer?',
    difficulty: 'Foundational',
    topic: 'Network Models & OSI',
    objective: '1.1',
    options: {
      A: 'Application',
      B: 'Transport',
      C: 'Internet',
      D: 'Link (Network Access)'
    },
    answer: 'C',
    explanation: 'The TCP/IP model has 4 layers: Application (OSI L5-7), Transport (OSI L4), Internet (OSI L3 — where IP and routing live), and Link/Network Access (OSI L1-2). IP, ICMP, and routing protocols operate at the Internet layer, which is the direct analog to OSI Network.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D1-29: /23 subnet math (1.7 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'An office needs a single subnet that can accommodate 450 hosts. Which prefix length is the smallest that satisfies the requirement while minimising waste?',
    scenario: 'A branch has a single flat Layer 2 segment with ~450 connected devices. The admin wants the smallest subnet that still fits everyone, because the remaining address space will be carved up for future branches.',
    difficulty: 'Hard',
    topic: 'Subnetting & IP Addressing',
    objective: '1.7',
    options: {
      A: '/21 (2046 usable hosts)',
      B: '/22 (1022 usable hosts)',
      C: '/23 (510 usable hosts)',
      D: '/24 (254 usable hosts)'
    },
    answer: 'C',
    explanation: '/23 gives 2^9 − 2 = 510 usable hosts, which fits 450 with minimal waste. /24 (254) is too small. /22 (1022) and /21 (2046) fit but waste 500+ addresses each. CompTIA convention: pick the smallest-satisfying subnet — the largest CIDR (smallest block) that still meets the host count.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D1-30: IoT VLAN segmentation (1.2 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A hospital is adding 200 IoT medical sensors to a network that already carries clinical workstations and guest Wi-Fi. Which design most reduces the attack surface?',
    scenario: 'The security team flags that IoT devices often run unpatched firmware and cannot host endpoint agents. They must still reach a private cloud API over HTTPS, but nothing else.',
    difficulty: 'Exam Level',
    topic: 'Network Appliances & Device Functions',
    objective: '1.2',
    options: {
      A: 'Place IoT devices on the same VLAN as workstations so patch management applies uniformly',
      B: 'Create a dedicated IoT VLAN with an ACL that permits only the required outbound API destinations and denies all lateral traffic',
      C: 'Put IoT devices on the guest Wi-Fi VLAN since both need internet access',
      D: 'Give each IoT device a public IP so the firewall can inspect traffic on the edge'
    },
    answer: 'B',
    explanation: 'Segmentation + least-privilege ACLs is the N10-009 answer for untrusted endpoints like IoT. A dedicated VLAN contains any compromise; an egress ACL allowing only the API destination blocks lateral movement and data exfiltration. Mixing IoT with workstations (A) or guests (C) increases blast radius. Public IPs (D) remove defence-in-depth.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D2-23: Native VLAN mismatch (2.1 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'An administrator configures a trunk between two switches with native VLAN 1 on one side and native VLAN 99 on the other. What symptom is most likely?',
    scenario: 'Tagged VLAN traffic flows fine between the switches, but hosts in the default (untagged) VLAN cannot reach each other across the trunk. CDP also logs a native VLAN mismatch.',
    difficulty: 'Exam Level',
    topic: 'VLAN Trunking',
    objective: '2.1',
    options: {
      A: 'STP will place both switchports into a blocking state, cutting the trunk entirely',
      B: 'Untagged frames will be placed into different VLANs on each side, breaking connectivity for the native VLAN only',
      C: 'All VLAN traffic will fail, including tagged frames',
      D: 'The switches will automatically renegotiate a matching native VLAN'
    },
    answer: 'B',
    explanation: 'On an 802.1Q trunk, frames on the native VLAN are sent untagged. If one side calls native VLAN 1 and the other native VLAN 99, untagged frames from Switch A land in VLAN 99 on Switch B — a VLAN hop. Tagged VLANs still work because the tag is explicit. CDP flags the mismatch as a warning; STP does not block (A). Native VLAN is never auto-negotiated (D).',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D2-24: BPDU Guard (2.1 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'What does BPDU Guard do when a BPDU is received on a port configured for PortFast?',
    difficulty: 'Exam Level',
    topic: 'STP/RSTP',
    objective: '2.1',
    options: {
      A: 'Allows the BPDU through and continues forwarding user traffic',
      B: 'Places the port into err-disable state, stopping all traffic on that port',
      C: 'Blocks the port only for the VLAN that received the BPDU',
      D: 'Forwards the BPDU to the root bridge for validation'
    },
    answer: 'B',
    explanation: 'BPDU Guard protects PortFast edge ports (access ports for PCs/printers) from unexpected switches being plugged in. A PortFast port should never see a BPDU; if it does, BPDU Guard immediately err-disables the port, preventing a rogue switch from influencing the STP topology. The port must be manually re-enabled or recovered via errdisable recovery.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D2-25: BGP Local Preference (2.2 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'An ISP-facing edge router has two BGP peerings to different upstream providers. The network team wants outbound traffic to prefer ISP-A. Which BGP attribute should they manipulate?',
    scenario: 'Both peers advertise the same destination prefixes. Inbound routing is fine; the concern is strictly outbound path selection. The team wants a change that is local to the AS and does not rely on the upstream ISPs cooperating.',
    difficulty: 'Hard',
    topic: 'BGP',
    objective: '2.2',
    options: {
      A: 'AS Path prepending — prepend extra hops on the ISP-B route',
      B: 'Local Preference — set a higher value on routes learned from ISP-A',
      C: 'MED (Multi-Exit Discriminator) — lower the value on ISP-A',
      D: 'Weight — set a lower value on ISP-A'
    },
    answer: 'B',
    explanation: 'Local Preference is the BGP attribute that influences OUTBOUND path selection within an AS — higher wins, it is propagated to all iBGP peers, and it sits high in the BGP best-path decision (above MED and AS Path). AS Path prepending (A) influences INBOUND traffic from upstreams. MED (C) is a hint to neighboring ASes for inbound and is not local to the AS. Weight (D) is Cisco-proprietary and only local to one router, so it is wrong for AS-wide policy.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D2-26: Voice VLAN (2.1 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'An IP phone is connected to a switchport, and a PC is daisy-chained through the phone into the same port. Which switchport configuration correctly separates voice and data?',
    scenario: 'Voice quality is critical; data traffic must not be in the same broadcast domain as the SIP/RTP streams. The cabling is a single Cat6 run per desk to an access switch.',
    difficulty: 'Exam Level',
    topic: 'Switch Features & VLANs',
    objective: '2.1',
    options: {
      A: 'Configure the port as a trunk with all VLANs allowed',
      B: 'Configure an access VLAN for data and a voice VLAN (auxiliary VLAN) — the phone tags voice frames, the PC sends untagged data frames',
      C: 'Put the port in VLAN 1 and rely on QoS to separate voice and data',
      D: 'Configure two separate physical ports — one for the phone, one for the PC'
    },
    answer: 'B',
    explanation: 'Voice VLAN (Cisco) / auxiliary VLAN is the standard design: the access port carries untagged data frames for the PC and tagged frames (e.g., 802.1Q VLAN tag + 802.1p CoS) for the phone. The phone learns its voice VLAN via CDP/LLDP-MED. A full trunk (A) exposes too many VLANs. VLAN 1 with QoS alone (C) skips the segmentation. Requiring two physical ports (D) defeats the cable-savings of daisy-chaining.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D3-22: Physical network diagrams (3.1 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'A network engineer is asked to produce documentation showing the exact cabling runs, patch panel port numbers, and rack-unit positions of every switch in a data centre. Which document type is correct?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Logical network diagram',
      B: 'Physical network diagram',
      C: 'IP address management (IPAM) report',
      D: 'Rack elevation only'
    },
    answer: 'B',
    explanation: 'Physical network diagrams show real cable runs, patch panel assignments, rack positions, and port labels — how things are actually wired. Logical diagrams (A) show VLANs, subnets, and routing relationships — how traffic flows. IPAM (C) is address-tracking only. A rack elevation (D) is part of physical documentation but does not by itself capture cable runs between racks.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D3-23: ASHRAE env monitoring (3.1 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A data centre is experiencing intermittent equipment failures in one row of racks. The network admin wants to correlate failures with environmental conditions. Which monitoring layer is most relevant?',
    scenario: 'Switches and servers in row 3 have rebooted unexpectedly several times this quarter. Temperatures near the top-of-rack seem higher than the rest of the room.',
    difficulty: 'Exam Level',
    topic: 'Data Centres',
    objective: '3.1',
    options: {
      A: 'Syslog severity filtering on the affected devices',
      B: 'Environmental monitoring (temperature, humidity, airflow) compared against ASHRAE TC 9.9 thresholds',
      C: 'NetFlow top-talkers report for row 3',
      D: 'SNMP trap thresholds on CPU utilisation'
    },
    answer: 'B',
    explanation: 'ASHRAE TC 9.9 defines the recommended and allowable temperature/humidity envelopes for data centre equipment. Hot-aisle temperature, humidity, and airflow sensors correlate directly with hardware-related reboots caused by thermal events. Syslog (A), NetFlow (C), and CPU traps (D) surface software/traffic-level symptoms but would miss a pure cooling failure.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D3-24: Tabletop exercise (3.3 / Foundational / recall) ──
  {
    type: 'mcq',
    question: 'Which type of disaster recovery exercise involves team members walking through a scenario verbally in a conference room, without touching real systems?',
    difficulty: 'Foundational',
    topic: 'Business Continuity & Disaster Recovery',
    objective: '3.3',
    options: {
      A: 'Full interruption test',
      B: 'Parallel test',
      C: 'Tabletop exercise',
      D: 'Simulation test with live failover'
    },
    answer: 'C',
    explanation: 'A tabletop exercise is a discussion-based walkthrough of a DR scenario — no systems are touched, no failover occurs. It is the lowest-risk, lowest-cost way to validate that procedures, contact lists, and decision-making are sound. Parallel tests (B) run DR systems alongside prod. Full interruption (A) takes prod down and shifts to DR — highest fidelity, highest risk.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D3-25: SASE (3.5 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'A global company with 40 branches and many remote workers wants to consolidate SD-WAN, secure web gateway, cloud access security broker (CASB), and zero-trust network access (ZTNA) into one cloud-delivered service. Which architecture is this?',
    scenario: 'The goal is to replace a patchwork of point products (MPLS, on-prem firewalls, separate VPN concentrators, web filter appliances) with a single vendor-delivered security fabric at the edge.',
    difficulty: 'Hard',
    topic: 'SD-WAN & SASE',
    objective: '3.5',
    options: {
      A: 'SDN (Software-Defined Networking)',
      B: 'SASE (Secure Access Service Edge)',
      C: 'MPLS L3VPN',
      D: 'Traditional hub-and-spoke with perimeter firewalls'
    },
    answer: 'B',
    explanation: 'SASE (Gartner, 2019) converges SD-WAN with cloud-delivered security functions (SWG, CASB, ZTNA, FWaaS) into a single platform delivered from distributed PoPs near users. It is the exact model described. SDN (A) refers to control-plane/data-plane separation in switching, not edge security. MPLS L3VPN (C) is a WAN transport, not a security service. Hub-and-spoke (D) is the legacy pattern SASE replaces.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D4-22: Kerberos (4.4 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which authentication protocol uses tickets issued by a Key Distribution Center (KDC) with an Authentication Server (AS) and a Ticket Granting Server (TGS)?',
    difficulty: 'Exam Level',
    topic: 'AAA & Authentication',
    objective: '4.4',
    options: {
      A: 'RADIUS',
      B: 'TACACS+',
      C: 'Kerberos',
      D: 'LDAP'
    },
    answer: 'C',
    explanation: 'Kerberos is the ticket-based authentication protocol used in Active Directory and many UNIX single-sign-on environments. A KDC issues a Ticket Granting Ticket (TGT) via the AS on initial logon; the TGT is then presented to the TGS to get service tickets for specific resources. RADIUS/TACACS+ are AAA for network device access. LDAP is a directory lookup protocol, not a ticket-based auth protocol.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D4-23: Zero-trust principle (4.1 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A CISO is migrating the company away from a flat internal network with a hardened perimeter to a model where every request — regardless of origin — is continuously verified. Which principle best summarises this approach?',
    scenario: 'Historically, the corporate LAN was treated as trusted and the Internet as untrusted. The new model assumes the attacker may already be inside, so identity, device posture, and context must be validated for every resource access — even on the LAN.',
    difficulty: 'Exam Level',
    topic: 'Securing TCP/IP',
    objective: '4.1',
    options: {
      A: 'Defense in depth — layer security controls across the perimeter',
      B: 'Zero trust — never trust, always verify, regardless of network location',
      C: 'Least functionality — disable unused services on servers',
      D: 'Implicit allow — default-permit with exception-based blocks'
    },
    answer: 'B',
    explanation: 'Zero-trust architecture (ZTA) removes the implicit trust of network location. Every access request is authenticated, authorized, and encrypted — identity + device posture + context are all evaluated continuously, not just at the perimeter. Defense in depth (A) is a related but broader concept. Least functionality (C) is a hardening principle. Implicit allow (D) is the opposite of zero-trust.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D4-24: NGFW capabilities (4.3 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A security team wants a perimeter appliance that can identify traffic by application (not just by port), terminate TLS to inspect encrypted payloads, and integrate IPS signatures inline. Which appliance category is correct?',
    scenario: 'The legacy stateful firewall only filters by 5-tuple, so malware tunneling over port 443 is invisible. The team wants a single device that can block traffic by app identity and scan content without buying a separate IPS appliance.',
    difficulty: 'Exam Level',
    topic: 'Firewalls, DMZ & Security Zones',
    objective: '4.3',
    options: {
      A: 'Stateless packet filter',
      B: 'Traditional stateful firewall',
      C: 'Next-Generation Firewall (NGFW)',
      D: 'Proxy server (forward proxy)'
    },
    answer: 'C',
    explanation: 'NGFW is defined by app-aware filtering (identifying Facebook, BitTorrent, SSH-tunneled-over-443, etc., independent of port), integrated IPS, and TLS decryption for deep packet inspection. Stateless (A) and stateful (B) firewalls filter on 5-tuple only — they cannot see inside an HTTPS flow. A forward proxy (D) can inspect HTTP/HTTPS but is not a firewall appliance category.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D4-25: Spear phishing / BEC (4.2 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'A finance manager receives an email that appears to come from the CEO requesting an urgent $47,000 wire transfer to a new vendor. The email uses the CEOs actual name, references a real project, and arrives while the CEO is travelling. Which attack is this?',
    scenario: 'The email is well-written, targets a specific person, references internal-sounding details, and pressures urgency. It is not a mass phishing blast to thousands of addresses.',
    difficulty: 'Hard',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'Generic phishing (mass email)',
      B: 'Spear phishing / Business Email Compromise (BEC)',
      C: 'Smishing (SMS-based phishing)',
      D: 'DNS cache poisoning'
    },
    answer: 'B',
    explanation: 'Spear phishing targets a specific individual with researched personal details; Business Email Compromise (BEC) specifically impersonates executives to trigger wire transfers or gift-card purchases. Hallmarks: specific name, real project references, urgency, and a new vendor/payment destination. Generic phishing (A) is mass, not targeted. Smishing (C) is SMS-based. DNS poisoning (D) is a network-layer attack, not email content.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D5-25: telnet/nc port test (5.5 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A user reports they cannot reach an internal web application on TCP/8443. Ping to the server succeeds. Which single command-line tool most directly tests whether the specific application port is reachable from the users machine?',
    scenario: 'ICMP is allowed through the firewall, but TCP/8443 may or may not be. The admin needs a quick confirmation from the users workstation before digging into firewall rules.',
    difficulty: 'Exam Level',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'ping <server-ip>',
      B: 'tracert <server-ip>',
      C: 'telnet <server-ip> 8443  (or  nc -zv <server-ip> 8443)',
      D: 'nslookup <server-ip>'
    },
    answer: 'C',
    explanation: 'telnet or nc (netcat) to a specific port is the classic port-reachability test: if the TCP handshake completes, the port is open end-to-end (firewall and application). ping (A) only tests ICMP reachability, not TCP/8443. tracert (B) shows the path but not whether the destination port is open. nslookup (D) is DNS resolution.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D5-26: TDR (5.2 / Foundational / recall) ──
  {
    type: 'mcq',
    question: 'Which cable-testing tool sends a pulse down a copper cable and measures reflections to estimate distance to a fault such as a break or short?',
    difficulty: 'Foundational',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'Tone generator and probe',
      B: 'Time-Domain Reflectometer (TDR)',
      C: 'Loopback adapter',
      D: 'Multimeter'
    },
    answer: 'B',
    explanation: 'A TDR injects a pulse and times the reflections to localise faults (break, short, impedance mismatch) on copper runs. An OTDR does the same for fibre. Tone and probe (A) traces which cable is which but does not measure distance to a fault. A loopback (C) validates a port/NIC locally. A multimeter (D) measures voltage/resistance, not cable reflections.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D5-27: TLS 1.3 middlebox (5.3 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'After upgrading a firewall to enforce TLS 1.3 inspection, users report that some legacy apps no longer connect, showing handshake errors. What is the most likely cause?',
    scenario: 'The affected apps worked with the previous firewall doing TLS 1.2 inspection. The new TLS 1.3 flow has tighter requirements around certificate validation and supported cipher suites.',
    difficulty: 'Exam Level',
    topic: 'Service Issues',
    objective: '5.3',
    options: {
      A: 'TLS 1.3 uses fewer round trips than TLS 1.2, so handshakes always succeed',
      B: 'The legacy apps use pinned certificates or deprecated cipher suites that the new inspection proxys re-signed certificate or TLS 1.3 cipher list breaks',
      C: 'TLS 1.3 requires IPv6 and the apps are on IPv4',
      D: 'TLS 1.3 disables TCP, so the apps fail at Layer 4'
    },
    answer: 'B',
    explanation: 'TLS inspection (MITM decryption) requires the client to trust the inspection proxy CA. Apps that pin certificates will reject the re-signed cert and fail the handshake. TLS 1.3 also removes many older cipher suites and insecure algorithms; legacy apps expecting those will fail. TLS 1.3 has nothing to do with IPv6 (C) or TCP (D) — both wrong.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ── D5-28: QoS vs link upgrade (5.4 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A branch office has a 100 Mbps link that runs at 40% average utilisation but suffers from jitter and packet loss on VoIP calls during daily file-backup windows. Which fix best addresses the symptom without upgrading bandwidth?',
    scenario: 'Average utilisation is moderate, but the file-backup traffic bursts saturate the link for short intervals — exactly when VoIP traffic suffers. The team wants the cheapest fix that protects voice quality.',
    difficulty: 'Exam Level',
    topic: 'Perf Issues',
    objective: '5.4',
    options: {
      A: 'Upgrade the link to 1 Gbps',
      B: 'Apply QoS — classify VoIP traffic (e.g., DSCP EF) and give it strict priority (LLQ) over backup traffic',
      C: 'Disable the backups during business hours',
      D: 'Move VoIP to UDP to reduce overhead'
    },
    answer: 'B',
    explanation: 'Average 40% utilisation means bandwidth is not the issue — burst congestion is. QoS with LLQ (Low-Latency Queuing) classifies voice as EF and pre-empts other queues during congestion, eliminating jitter and loss without a bandwidth upgrade. Upgrading the link (A) is more expensive and wastes the existing capacity. Disabling backups (C) is operationally painful. VoIP already uses UDP (D), so the choice is nonsensical.',
    source: 'curated',
    addedVersion: '4.59.3',
    addedDate: '2026-04-21'
  },
  // ═════════════════════════════════════════════════════════════════
  // PATH B — ROAD TO 200 BATCH 4 (v4.59.4): 22 new exemplars
  // Bank grows 134 → 156. Distribution: D1+5, D2+5, D3+4, D4+3, D5+5.
  // Targets CompTIA weights by end of 3-batch expansion.
  // ═════════════════════════════════════════════════════════════════
  // ── D1-31: Anycast vs multicast vs broadcast (1.4 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'Which addressing model allows a single destination IP to resolve to the topologically-nearest server from a pool of physically-distributed servers, commonly used for DNS root servers and CDN points of presence?',
    scenario: 'The 13 DNS root server letters each correspond to hundreds of physical servers worldwide, yet clients always reach a single logical IP. The routing fabric determines which physical instance responds based on network proximity.',
    difficulty: 'Exam Level',
    topic: 'NTP, ICMP & Traffic Types',
    objective: '1.4',
    options: {
      A: 'Unicast — one sender, one receiver',
      B: 'Broadcast — one sender, all hosts on a segment',
      C: 'Multicast — one sender, a subscribed group',
      D: 'Anycast — one destination IP, many physical servers, nearest wins via routing'
    },
    answer: 'D',
    explanation: 'Anycast assigns the same IP to multiple geographically-distributed servers; BGP routes traffic to the topologically-closest instance. It is the standard for DNS root servers, public resolvers (e.g., 8.8.8.8, 1.1.1.1), and CDN points of presence. Unicast (A) is point-to-point. Broadcast (B) is segment-wide. Multicast (C) requires IGMP group membership.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D1-32: DHCP relay (1.6 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A network has one DHCP server in the data centre and 15 VLANs across branch switches. Clients in remote VLANs do not receive IP addresses. What configuration on the router interfaces fixes this?',
    scenario: 'DHCP DISCOVER packets are broadcast and do not cross routers. The admin wants a single centralised DHCP server rather than 15 separate servers per VLAN.',
    difficulty: 'Exam Level',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'Enable DHCP snooping on all switch ports',
      B: 'Configure an ip helper-address (DHCP relay agent) on each VLAN SVI pointing to the central DHCP server',
      C: 'Put every VLAN in the same broadcast domain',
      D: 'Statically assign IPs on every client'
    },
    answer: 'B',
    explanation: 'A DHCP relay agent (ip helper-address on Cisco, DHCP relay on others) converts client broadcasts into unicast packets destined for the central DHCP server. One helper address per VLAN SVI lets a single DHCP server service all 15 VLANs. DHCP snooping (A) is a security feature, not a relay. Flattening VLANs (C) defeats segmentation. Static IPs (D) are unmanageable at scale.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D1-33: RFC 1918 private IP ranges (1.7 / Foundational / recall) ──
  {
    type: 'mcq',
    question: 'Which set of IP ranges is defined as private (non-routable on the public Internet) by RFC 1918?',
    difficulty: 'Foundational',
    topic: 'Subnetting & IP Addressing',
    objective: '1.7',
    options: {
      A: '10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16',
      B: '10.0.0.0/8, 172.0.0.0/8, 192.0.0.0/16',
      C: '169.254.0.0/16, 127.0.0.0/8, 224.0.0.0/4',
      D: '100.64.0.0/10, 198.18.0.0/15, 203.0.113.0/24'
    },
    answer: 'A',
    explanation: 'RFC 1918 defines exactly three private IPv4 ranges: 10.0.0.0/8 (one Class A), 172.16.0.0/12 (16 contiguous Class Bs, 172.16 through 172.31), and 192.168.0.0/16 (256 Class Cs). B misstates the 172 and 192 ranges. C lists APIPA (169.254), loopback (127), and multicast (224) — none private per RFC 1918. D lists CGNAT (100.64), benchmark (198.18), and documentation (203.0.113) ranges — reserved for other purposes.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D1-34: NAT64 + DNS64 (1.8 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'A mobile carrier runs an IPv6-only access network, but subscribers still need to reach legacy IPv4-only Internet sites. Which transition mechanism provides this?',
    scenario: 'Subscribers have only IPv6 addresses assigned. The carrier does not want to run dual-stack on clients, but still must resolve A records and reach IPv4 destinations.',
    difficulty: 'Hard',
    topic: 'IPv6',
    objective: '1.8',
    options: {
      A: '6to4 tunneling only — encapsulates IPv6 inside IPv4',
      B: 'NAT64 (protocol translation) paired with DNS64 (synthesises AAAA from A records)',
      C: 'Teredo tunneling from the client',
      D: 'Dual-stack on every client'
    },
    answer: 'B',
    explanation: 'NAT64 translates IPv6 packets to IPv4 at a gateway. DNS64 synthesises an AAAA record from an IPv4-only A record by prepending the well-known prefix 64:ff9b::/96 to the IPv4 address, so the client believes it is talking IPv6 end-to-end. 6to4 (A) goes the other way (IPv6 over IPv4 transport). Teredo (C) is legacy and client-side, not suitable for carrier-scale translation. Dual-stack (D) is what the carrier is explicitly avoiding.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D1-35: Infrastructure as Code (1.8 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which practice defines network infrastructure (routers, firewalls, load balancers, cloud VPCs) in version-controlled declarative files that can be applied programmatically?',
    difficulty: 'Exam Level',
    topic: 'Virtualisation & Cloud',
    objective: '1.8',
    options: {
      A: 'Infrastructure as Code (IaC) — Terraform, Ansible, CloudFormation',
      B: 'Manual CLI configuration with screenshot-based backups',
      C: 'SNMP polling with OID-based modifications',
      D: 'Change advisory board (CAB) approval only, no automation'
    },
    answer: 'A',
    explanation: 'Infrastructure as Code stores infrastructure definitions in text files (HCL for Terraform, YAML for Ansible, JSON/YAML for CloudFormation) under version control, then applies them declaratively and idempotently. This is the N10-009 modern-environments topic: repeatable, reviewable, auditable. Manual CLI (B) is the anti-pattern IaC replaces. SNMP (C) is monitoring, not provisioning. CAB (D) is a governance layer, not a provisioning method.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D2-27: Rapid PVST+ vs MSTP (2.1 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'A campus has 200 VLANs across 40 switches. Rapid PVST+ runs one STP instance per VLAN — 200 instances. Which alternative reduces CPU load by mapping groups of VLANs to a smaller number of instances?',
    scenario: 'Switch CPUs are at 80% utilisation running per-VLAN spanning tree calculations. The team wants to keep STP-per-group behaviour for load balancing but cut the number of instances dramatically.',
    difficulty: 'Hard',
    topic: 'STP/RSTP',
    objective: '2.1',
    options: {
      A: 'Disable STP entirely to save CPU',
      B: 'Switch to classic STP (802.1D) with one instance for all VLANs',
      C: 'Use MSTP (802.1s) — map many VLANs to a few MST instances (e.g., 200 VLANs into 4 instances)',
      D: 'Run RSTP (802.1w) without any instance awareness'
    },
    answer: 'C',
    explanation: 'MSTP (802.1s) lets you map many VLANs to a small number of MST instances (typical design: one instance for odd VLANs, one for even, plus the internal spanning tree). 200 VLANs into 4 instances is roughly a 50x CPU reduction while keeping per-group load balancing. Disabling STP (A) invites loops. Classic STP (B) has slow convergence (30-50s). RSTP (D) is fast but per-VLAN if Cisco; MSTP adds the instance-grouping.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D2-28: EIGRP vs OSPF (2.2 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A single-vendor Cisco enterprise WAN uses unequal-cost paths with a composite metric (bandwidth, delay, reliability, load). Which interior routing protocol fits this use case best?',
    scenario: 'All routers are Cisco. The design requires traffic to load-balance across WAN links of different capacities (e.g., 100 Mbps and 40 Mbps) proportionally, not only equal-cost.',
    difficulty: 'Exam Level',
    topic: 'Routing Protocols',
    objective: '2.2',
    options: {
      A: 'RIPv2 — hop-count metric, 15-hop limit',
      B: 'OSPF — link-state, equal-cost multipath only',
      C: 'EIGRP — Cisco advanced distance-vector, composite metric, unequal-cost load balancing via variance',
      D: 'BGP — path-vector, designed for inter-AS only'
    },
    answer: 'C',
    explanation: 'EIGRP is unique in supporting unequal-cost load balancing via the variance command: it shares traffic across paths whose metric is within a configurable multiple of the best path. Combined with its composite metric (K1-K5), it fits Cisco WANs needing proportional load share. RIPv2 (A) only counts hops and caps at 15. OSPF (B) only does equal-cost multipath. BGP (D) is for inter-AS policy, not intra-enterprise load balancing. EIGRP is now open-standard (RFC 7868) but still primarily Cisco-deployed.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D2-29: Wi-Fi 6E / 6 GHz (2.4 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'What primary advantage does Wi-Fi 6E (6 GHz band) offer over Wi-Fi 6 (2.4 and 5 GHz only)?',
    difficulty: 'Exam Level',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'Longer range at the same transmit power as 2.4 GHz',
      B: 'Access to ~1200 MHz of new uncongested spectrum, including 7 non-overlapping 160 MHz channels',
      C: 'Backward compatibility with 802.11b/g clients',
      D: 'Higher PoE power delivery to access points'
    },
    answer: 'B',
    explanation: 'Wi-Fi 6E extends Wi-Fi 6 (802.11ax) into the newly-opened 6 GHz band (5.925 to 7.125 GHz in the US). That ~1200 MHz adds dozens of new 20 MHz channels, including 14 non-overlapping 80 MHz and 7 non-overlapping 160 MHz channels — enormous wide-channel capacity with almost no legacy clients to share it. Range (A) is shorter at 6 GHz than 2.4 GHz (higher frequency attenuates faster). 802.11b/g (C) is 2.4 GHz only. PoE (D) is physical-layer, unrelated to RF spectrum.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D2-30: Switch stacking (2.1 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A wiring closet has six 48-port access switches. The team wants to manage all six as a single logical switch with one IP, one config, and cross-switch LAGs for uplinks. Which technology achieves this?',
    scenario: 'The current model manages six separate switches with six IPs and six configs. Uplink failover is needed without relying on STP reconvergence.',
    difficulty: 'Exam Level',
    topic: 'Switch Features & VLANs',
    objective: '2.1',
    options: {
      A: 'Switch stacking (StackWise, IRF, or equivalent) — multiple switches operate as one logical unit via high-speed stack cables',
      B: 'VLAN Trunking Protocol (VTP) in server mode',
      C: 'Per-VLAN spanning tree with a separate BPDU per VLAN',
      D: 'Port mirroring (SPAN) between all six switches'
    },
    answer: 'A',
    explanation: 'Switch stacking connects multiple switches via high-speed proprietary stack cables (Cisco StackWise, HPE/Aruba IRF, Juniper Virtual Chassis) so they present as one logical switch: one management IP, one config, one MAC address table, and LAGs that span multiple physical switches for uplink redundancy. VTP (B) synchronises VLAN databases only. PVST (C) is STP, not unification. SPAN (D) copies traffic for monitoring, not management aggregation.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D2-31: FHRP / HSRP / VRRP / GLBP (2.2 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'Two data centre routers share a virtual IP that acts as the default gateway for servers. If the active router fails, the standby takes over in under 3 seconds without clients reconfiguring. Which category of protocol provides this?',
    scenario: 'Servers use a single static default gateway IP. The network team needs gateway failover without DHCP changes or client reconfiguration.',
    difficulty: 'Exam Level',
    topic: 'Routing Protocols',
    objective: '2.2',
    options: {
      A: 'First Hop Redundancy Protocols (FHRP) — HSRP, VRRP, or GLBP provide a virtual IP shared between two or more routers',
      B: 'Routing Information Protocol (RIP) — dynamic routing updates',
      C: 'Spanning Tree Protocol (STP) — Layer 2 loop prevention',
      D: 'Link Aggregation Control Protocol (LACP) — bonds multiple physical links'
    },
    answer: 'A',
    explanation: 'FHRPs share a single virtual IP/MAC across multiple routers. HSRP (Cisco) and VRRP (RFC 5798, standard) provide active/standby; GLBP (Cisco) load-balances across all group members. Clients use the virtual IP as a static gateway and never notice failover. RIP (B) is a routing protocol, not gateway redundancy. STP (C) is Layer 2. LACP (D) bonds physical links, not gateways.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D3-26: SNMPv3 auth + priv (3.2 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which SNMP version adds authentication (MD5/SHA) and encryption (DES/AES) for message confidentiality and integrity?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'SNMPv1 — plaintext community strings',
      B: 'SNMPv2c — plaintext community strings with 64-bit counters',
      C: 'SNMPv3 — user-based security model with authNoPriv and authPriv modes',
      D: 'All SNMP versions include encryption by default'
    },
    answer: 'C',
    explanation: 'SNMPv3 introduced the User-based Security Model (USM) with three security levels: noAuthNoPriv (no security), authNoPriv (authentication only, no encryption), and authPriv (both). Auth uses MD5 or SHA HMACs; privacy uses DES or AES encryption. SNMPv1 and SNMPv2c send community strings in plaintext (A, B). D is factually wrong — v1/v2c are plaintext.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D3-27: Traffic shaping vs policing (3.2 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A WAN link is rate-limited by the service provider to 50 Mbps. When the customer sends bursts above 50 Mbps, the ISP drops the excess. Which QoS technique at the customer edge buffers excess traffic so it conforms to the contract without drops?',
    scenario: 'The customer currently sees packet loss during bursts because their edge router sends at its full 1 Gbps capability; the ISP policer drops what exceeds 50 Mbps. The team wants to avoid drops without buying more bandwidth.',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.2',
    options: {
      A: 'Traffic policing — drops or remarks packets that exceed the rate',
      B: 'Traffic shaping — buffers and delays packets to smooth output to the contracted rate',
      C: 'Priority queuing only — strict priority for voice',
      D: 'Random Early Detection (RED) — drops before the queue fills'
    },
    answer: 'B',
    explanation: 'Traffic shaping buffers excess traffic in a queue and releases it at the contracted rate, smoothing bursts without drops. Traffic policing (A) drops or remarks at violation — which is exactly what the ISP is doing and the customer wants to avoid. Priority queuing (C) orders traffic but does not rate-limit. RED (D) is a congestion-avoidance mechanism, not a shaper.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D3-28: Change mgmt rollback (3.1 / Foundational / recall) ──
  {
    type: 'mcq',
    question: 'Which element of a formal change management process ensures that a failed change can be reverted quickly to the previous known-good state?',
    difficulty: 'Foundational',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Change request (CR) submission form',
      B: 'Documented rollback (back-out) plan with tested recovery steps',
      C: 'Post-change review meeting',
      D: 'Change advisory board (CAB) approval'
    },
    answer: 'B',
    explanation: 'A rollback plan (also called back-out plan) is a required part of every formal change: pre-tested steps and configuration snapshots that restore the prior state if the change fails. The CR (A) authorises the change; the CAB (D) approves it; post-change review (C) happens after. Only the rollback plan answers how to undo a bad change quickly.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D3-29: Asset inventory / CMDB (3.1 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'After a critical switch failure at midnight, an on-call engineer must identify the model, firmware, warranty status, installed interface cards, and connected downstream devices without physical access. Which documentation source is most useful?',
    scenario: 'The engineer is working remotely. Physical inspection is not possible. The network has ~800 devices across 20 sites, so memorised knowledge is inadequate.',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'A configuration management database (CMDB) / asset inventory with device records, firmware, warranty, and relationship mapping',
      B: 'The vendor marketing website',
      C: 'A physical data centre floor plan only',
      D: 'Syslog messages from the last hour'
    },
    answer: 'A',
    explanation: 'A CMDB (or asset inventory) is the canonical record of every device: model, serial, firmware, location, warranty, ownership, and relationships to other devices. For remote diagnosis of a failed device, the CMDB is the first stop before engaging vendor support. Vendor marketing (B) gives generic specs, not deployment state. Floor plans (C) give location only. Syslog (D) gives recent events, not inventory metadata.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D4-26: 802.1X vs port security (4.3 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'An organisation wants per-user authentication at every access switchport — users authenticate with credentials before getting a VLAN assignment and network access. Which technology provides this?',
    scenario: 'Port-based MAC filtering is currently used but can be spoofed easily. The security team wants identity-based access with dynamic VLAN assignment based on who is logging in, not what MAC is plugged in.',
    difficulty: 'Exam Level',
    topic: 'Protecting Networks',
    objective: '4.3',
    options: {
      A: 'Port security (sticky MAC) — learns and locks MAC addresses per port',
      B: '802.1X (EAP-based port-based authentication) — client supplicant authenticates via RADIUS before port opens',
      C: 'MAC ACLs — static MAC whitelist',
      D: 'BPDU Guard — err-disables ports that receive BPDUs'
    },
    answer: 'B',
    explanation: '802.1X is the IEEE standard for identity-based port access control. The client (supplicant) sends credentials via EAP to the switch (authenticator), which forwards to a RADIUS server (authentication server). On success, the RADIUS server can assign a dynamic VLAN based on user identity or group. Port security (A) filters by MAC — easy to spoof. MAC ACLs (C) are static. BPDU Guard (D) is loop prevention on PortFast ports.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D4-27: Pretexting (4.2 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'An attacker calls the help desk claiming to be a new remote employee whose laptop has crashed, urgently requesting a password reset for the accounting VP. The attacker has researched the VP name and project details. Which social engineering technique is this?',
    scenario: 'The attacker never physically enters the building. The attack is entirely by phone, relying on believable backstory and urgency to manipulate the help desk.',
    difficulty: 'Exam Level',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'Tailgating — following an authorised person through a secured door',
      B: 'Shoulder surfing — observing credentials over someone shoulder',
      C: 'Pretexting — inventing a believable scenario to extract information or trigger an action',
      D: 'Dumpster diving — recovering discarded documents'
    },
    answer: 'C',
    explanation: 'Pretexting is the social-engineering technique of creating a fabricated scenario (pretext) to manipulate the target. Help-desk impersonation calls with researched details are the classic example. Tailgating (A) is physical. Shoulder surfing (B) is observational. Dumpster diving (D) is physical retrieval. Pretexting underlies most phone-based social engineering and BEC attacks.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D4-28: CRL vs OCSP (4.4 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which certificate-revocation method provides real-time per-certificate status lookup rather than downloading a large periodic list?',
    difficulty: 'Exam Level',
    topic: 'PKI & Certificate Management',
    objective: '4.4',
    options: {
      A: 'Certificate Revocation List (CRL) — periodic signed list of revoked serial numbers',
      B: 'Online Certificate Status Protocol (OCSP) — HTTP-based per-certificate status query returning "good", "revoked", or "unknown"',
      C: 'Certificate transparency logs — append-only public log',
      D: 'Perfect Forward Secrecy (PFS) — ephemeral key exchange'
    },
    answer: 'B',
    explanation: 'OCSP (RFC 6960) queries the CA responder for a single certificate serial number and returns "good", "revoked", or "unknown" in real time. CRLs (A) are periodically-published lists that must be downloaded in full — slower and staler. CT logs (C) track issuance, not revocation. PFS (D) is a key-exchange property, unrelated to revocation. OCSP Stapling (RFC 6066) extends this further by having the server cache and present the OCSP response to avoid client-side lookups.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D5-29: EMI / crosstalk (5.2 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A long UTP cable run passes near a fluorescent light ballast and a motor control room. Users report intermittent high error rates. A cable tester reports acceptable length and continuity. Which physical-layer issue is most likely?',
    scenario: 'The run is 85 metres of Cat5e UTP. There is no visible damage. Moving the cable 2 metres away from the motor room reduces errors dramatically.',
    difficulty: 'Exam Level',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'Attenuation — signal loss over distance',
      B: 'Electromagnetic interference (EMI) from nearby motors and ballasts',
      C: 'Near-end crosstalk (NEXT) between pairs inside the same cable',
      D: 'Insufficient termination at the patch panel'
    },
    answer: 'B',
    explanation: 'Fluorescent ballasts and motor controllers emit strong electromagnetic fields that couple into UTP cables as noise. Symptoms: intermittent errors that improve dramatically when the cable is moved away from the source. Fixes include rerouting, using shielded (STP/FTP) cable, or using fibre. Attenuation (A) is distance-related, not environment-related. NEXT (C) is internal to the cable and would appear even on a short bench run. Termination (D) would show as continuity/length failures on the tester.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D5-30: Bandwidth vs throughput vs goodput (5.4 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'A link is provisioned at 1 Gbps. An iperf test reports 950 Mbps throughput. An application-layer transfer measures 700 Mbps. Which term best fits the 700 Mbps figure?',
    difficulty: 'Exam Level',
    topic: 'Perf Issues',
    objective: '5.4',
    options: {
      A: 'Bandwidth — theoretical link capacity',
      B: 'Throughput — actual bits delivered at Layer 3/4 including protocol overhead',
      C: 'Goodput — application-layer useful data rate, excluding protocol overhead and retransmissions',
      D: 'Latency — one-way packet delay'
    },
    answer: 'C',
    explanation: 'Bandwidth (A) is the rated capacity. Throughput (B) is what the link actually delivers including headers, retransmissions, and protocol overhead (iperf measures this). Goodput (C) is the useful application-layer data rate — after subtracting protocol overhead (TCP/IP headers, ACKs, retransmits, TLS overhead). The 700 Mbps application number is goodput. Latency (D) is time, not rate.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D5-31: Co-channel interference (5.4 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'In a high-density office, Wi-Fi performance is poor despite strong RSSI at every desk. A site survey shows channel utilisation above 85% on channels 1, 6, and 11 in the 2.4 GHz band from overlapping neighbour APs. What is the primary cause?',
    scenario: 'Signal strength (-55 dBm) is excellent. Users experience slow transfers and high retry counts. The office is in a dense commercial building with multiple neighbouring tenants.',
    difficulty: 'Exam Level',
    topic: 'Connection Issues',
    objective: '5.4',
    options: {
      A: 'Attenuation — signal too weak',
      B: 'Co-channel interference (CCI) — multiple APs on the same channel compete for airtime',
      C: 'Encryption mismatch between clients and AP',
      D: 'Incorrect DNS server assignment'
    },
    answer: 'B',
    explanation: 'Strong RSSI plus poor performance is the classic signature of channel congestion, not weak signal. When many APs share the same channel (1, 6, or 11 in 2.4 GHz), CSMA/CA forces them to take turns transmitting — airtime becomes the bottleneck. Fixes: move to 5 GHz (more non-overlapping channels), reduce AP transmit power to shrink cells, or use 6 GHz (Wi-Fi 6E). Attenuation (A) is ruled out by the -55 dBm RSSI. Encryption (C) would fail authentication entirely. DNS (D) is not RF.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D5-32: Broadcast storm (5.5 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'Users report the network is completely frozen across an entire switched VLAN. On a switch port monitor, every port shows near 100% utilisation with massive broadcast counts. A newly-installed unmanaged switch was added this morning. What is the most likely cause and immediate remediation?',
    scenario: 'Ping response time exceeds 2000 ms or times out entirely. Even console access to switches is slow. A technician noticed a small unmanaged switch plugged into two different ports of the main access switch.',
    difficulty: 'Hard',
    topic: 'Connection Issues',
    objective: '5.5',
    options: {
      A: 'DHCP server failure — reboot DHCP',
      B: 'Broadcast storm from a Layer 2 loop; disconnect one of the unmanaged switch uplinks, then enable BPDU Guard + STP on access ports',
      C: 'DNS poisoning; flush resolver caches',
      D: 'Duplex mismatch; hardcode all ports to full duplex'
    },
    answer: 'B',
    explanation: 'A loop in the Layer 2 topology causes broadcasts (ARP, DHCP discover) to multiply until bandwidth and CPU are saturated — a broadcast storm. The unmanaged switch uplinked to two ports of the access switch creates exactly that loop (unmanaged switches do not run STP, so the managed switch BPDUs never reach it). Immediate fix: disconnect one of the loop cables. Long-term fix: enable STP/RSTP and BPDU Guard on access ports. DHCP (A), DNS (C), and duplex (D) do not produce near-100% broadcast traffic.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ── D5-33: Split horizon / routing loop (5.5 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'After adding a redundant link between two RIP routers for failover, traceroute now shows packets bouncing between the two routers before reaching the destination. TTL eventually expires and packets are dropped. What is the most likely cause?',
    scenario: 'Before the redundant link was added, both routers reached the destination network via a single path. The new link was intended as backup, but routing loops appeared. The routers run RIPv2 with default timers.',
    difficulty: 'Hard',
    topic: 'CompTIA Troubleshooting Methodology',
    objective: '5.5',
    options: {
      A: 'Missing split-horizon enforcement — a router is re-advertising a route back out the interface it learned it on, creating the loop',
      B: 'MTU mismatch on the new link',
      C: 'Duplicate IP address on a host',
      D: 'DNS cache poisoning at the client'
    },
    answer: 'A',
    explanation: 'Classic distance-vector routing loop. Split horizon is the rule that a router must NOT advertise a route back out the interface from which it learned that route. Without it (or with poison reverse disabled), router A learns a route from B, then re-advertises it back to B — which now thinks A has a better path. Packets bounce between them until TTL expires. Modern RIP enables split horizon by default; older configs or certain topologies (hub-spoke frame relay) may disable it. MTU (B) would show fragmentation or black-hole, not a loop. Duplicate IP (C) causes ARP issues, not routing loops. DNS (D) is application layer.',
    source: 'curated',
    addedVersion: '4.59.4',
    addedDate: '2026-04-21'
  },
  // ═════════════════════════════════════════════════════════════════
  // PATH B — ROAD TO 200 BATCH 5 (v4.59.5): 22 new exemplars
  // Bank grows 156 → 178. Distribution: D1+5, D2+5, D3+5, D4+0, D5+7.
  // D4 sits out — already at target 28. D5 gets extra weight for 24% exam %.
  // ═════════════════════════════════════════════════════════════════
  // ── D1-36: DNSSEC chain validation (1.6 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A resolver receives a DNSSEC-signed answer for www.example.com. Which validation chain must succeed for the resolver to return the answer as AUTHENTIC rather than BOGUS?',
    scenario: 'The resolver performs DNSSEC validation. It has a trust anchor for the root zone pre-configured. It must walk the chain of trust from root down to the answer.',
    difficulty: 'Exam Level',
    topic: 'DNS Records & DNSSEC',
    objective: '1.6',
    options: {
      A: 'Root trust anchor → DS record in .com → DNSKEY of example.com → RRSIG over the requested RRset',
      B: 'The answer must match a cached copy from any recursive resolver',
      C: 'TLS certificate presented by the DNS server must be valid',
      D: 'ICMP Echo Reply must succeed from the resolver to the authoritative server'
    },
    answer: 'A',
    explanation: 'DNSSEC validation follows a chain of trust: the root zone signs the .com DS record (which hashes the .com DNSKEY), .com signs the example.com DS record, example.com signs its own DNSKEY and the RRsets with its ZSK (validated by RRSIG records). Break the chain anywhere and the answer is BOGUS. Caching (B), TLS (C), and ICMP (D) are unrelated to DNSSEC chain validation.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D1-37: CIDR aggregation (1.7 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'An ISP has customers in 192.168.16.0/24, 192.168.17.0/24, 192.168.18.0/24, and 192.168.19.0/24. What is the smallest single prefix that aggregates all four networks for advertisement to upstream peers?',
    scenario: 'The ISP wants to reduce the number of BGP prefixes advertised upstream by aggregating the four contiguous /24 allocations into a single summary route without including any unrelated addresses.',
    difficulty: 'Exam Level',
    topic: 'Subnetting & IP Addressing',
    objective: '1.7',
    options: {
      A: '192.168.16.0/21',
      B: '192.168.16.0/22',
      C: '192.168.16.0/23',
      D: '192.168.0.0/16'
    },
    answer: 'B',
    explanation: 'Four contiguous /24s aggregate to one /22: 192.168.16.0/22 covers 192.168.16.0 through 192.168.19.255 exactly. /23 (C) covers only two /24s. /21 (A) covers eight /24s — too broad, includes unallocated space. /16 (D) massively over-aggregates. CIDR summarisation picks the smallest (longest-prefix) block that covers exactly the contiguous set.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D1-38: MTU vs MSS (1.4 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'What is the relationship between MTU (Maximum Transmission Unit) and MSS (Maximum Segment Size) on a standard Ethernet + IPv4 + TCP path?',
    difficulty: 'Exam Level',
    topic: 'NTP, ICMP & Traffic Types',
    objective: '1.4',
    options: {
      A: 'MTU and MSS are synonyms',
      B: 'MSS = MTU (1500) − IPv4 header (20) − TCP header (20) = 1460 bytes typically',
      C: 'MSS is always 1500; MTU varies by link',
      D: 'MSS is only defined for UDP, not TCP'
    },
    answer: 'B',
    explanation: 'MTU is the largest Layer 2 frame payload (Ethernet default 1500 bytes). MSS is the largest TCP segment payload, calculated as MTU minus the IP and TCP header overhead: on standard IPv4 + TCP, 1500 − 20 (IP) − 20 (TCP) = 1460 bytes. MSS is negotiated during the TCP 3-way handshake to avoid IP fragmentation. MSS applies to TCP only (D is wrong). A and C are factually wrong.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D1-39: DHCP T1/T2 renewal (1.6 / Hard / recall) ──
  {
    type: 'mcq',
    question: 'In the DHCP lease renewal process, what happens at T1 (the renewal timer)?',
    difficulty: 'Hard',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'At T1 (50% of lease) the client sends a unicast DHCPREQUEST to the ORIGINAL DHCP server to renew',
      B: 'At T1 the client broadcasts DHCPDISCOVER to any available server',
      C: 'At T1 the client immediately releases the IP and starts over',
      D: 'At T1 the client queries DNS for a new IP address'
    },
    answer: 'A',
    explanation: 'DHCP renewal has two timers. T1 = 50% of lease duration: the client sends a unicast DHCPREQUEST to the original server. If that fails, T2 = 87.5% of lease duration: the client broadcasts DHCPREQUEST to any server. Only after the full lease expires without success does the client release and start over with a DHCPDISCOVER broadcast (B is T2 or later). C and D are wrong.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D1-40: CIDR-to-mask conversion (1.7 / Foundational / recall) ──
  {
    type: 'mcq',
    question: 'What is the dotted-decimal subnet mask for a /27 prefix?',
    difficulty: 'Foundational',
    topic: 'Subnetting & IP Addressing',
    objective: '1.7',
    options: {
      A: '255.255.255.192 (/26)',
      B: '255.255.255.224 (/27)',
      C: '255.255.255.240 (/28)',
      D: '255.255.255.128 (/25)'
    },
    answer: 'B',
    explanation: '/27 means 27 network bits and 5 host bits. In the fourth octet: 11100000 = 224. So 255.255.255.224. Block size = 2^5 = 32 addresses, minus network + broadcast = 30 usable hosts per subnet. The common /25-/30 fourth-octet ladder: /25=128, /26=192, /27=224, /28=240, /29=248, /30=252.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D2-32: Cable categories (2.3 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which copper Ethernet category is the MINIMUM rated for 10GBASE-T up to 100 metres without running warm and without shielding requirements?',
    difficulty: 'Exam Level',
    topic: 'Ethernet Standards',
    objective: '2.3',
    options: {
      A: 'Cat5e (1 Gbps up to 100 m)',
      B: 'Cat6 (10 Gbps up to ~55 m)',
      C: 'Cat6A (10 Gbps up to 100 m, 500 MHz)',
      D: 'Cat3 (10/100 Mbps only)'
    },
    answer: 'C',
    explanation: 'Cat6A is rated for full 10GBASE-T at 100 metres with 500 MHz bandwidth and internal separators to reduce alien crosstalk. Cat6 (B) supports 10 Gbps but only to ~55 metres without shielding. Cat5e (A) tops out at 1 Gbps. Cat3 (D) is telephone/10BASE-T era. Cat7/Cat8 go further (40-Gig / short-reach data centre) but Cat6A is the minimum for standard 10G horizontal cabling.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D2-33: Fiber connectors (2.3 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which fiber connector type is a SMALL-FORM-FACTOR duplex connector that uses a push-pull latch and is the most common in modern data centre patch panels?',
    difficulty: 'Exam Level',
    topic: 'Cabling & Topology',
    objective: '2.3',
    options: {
      A: 'ST — bayonet twist-lock, single fiber',
      B: 'SC — square push-pull, larger form factor',
      C: 'LC — small-form-factor push-pull, typically duplex',
      D: 'MPO — 12 or 24 fiber ribbon connector'
    },
    answer: 'C',
    explanation: 'LC (Lucent Connector) is the small-form-factor duplex connector used in almost all modern fiber patch panels and SFP transceivers. About half the size of SC. ST (A) is older bayonet-style and simplex. SC (B) is larger and typically duplex but rarely used in modern density. MPO/MTP (D) is a parallel multi-fiber connector for 40G/100G breakout cables, not a standard single-link connector.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D2-34: Transceivers SFP/SFP+/QSFP (2.3 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A data centre switch has SFP+ ports. A network engineer needs a single 40 Gbps uplink from this switch to a spine. Which transceiver form factor provides 40 Gbps in one physical port?',
    scenario: 'SFP+ is rated for 10 Gbps per port. The uplink needs 40 Gbps in a single interface slot. The spine switch offers both SFP+ and QSFP+ ports.',
    difficulty: 'Exam Level',
    topic: 'Ethernet Standards',
    objective: '2.3',
    options: {
      A: 'Use four SFP+ 10G transceivers bundled with LACP',
      B: 'Use a QSFP+ 40 Gbps transceiver (the switch must have a QSFP+ port)',
      C: 'Use an SFP 1 Gbps transceiver with a faster cable',
      D: 'Use a GBIC transceiver'
    },
    answer: 'B',
    explanation: 'QSFP+ (Quad Small Form-Factor Pluggable Plus) delivers 40 Gbps (4 × 10 Gbps lanes) in a single port. Newer QSFP28 delivers 100 Gbps (4 × 25). SFP+ is 10G per port; four SFP+ with LACP (A) works logically but needs 4 ports + 4 fibres + LAG config — not a single interface. SFP (C) is 1 Gbps max. GBIC (D) is the older/larger predecessor to SFP.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D2-35: Network topologies (2.3 / Foundational / recall) ──
  {
    type: 'mcq',
    question: 'Which physical network topology has every device connecting directly to a single central device (switch or hub), and is the dominant LAN topology today?',
    difficulty: 'Foundational',
    topic: 'Cabling & Topology',
    objective: '2.3',
    options: {
      A: 'Bus — single shared coaxial cable',
      B: 'Ring — each node connects to two neighbours in a loop',
      C: 'Star — each node connects to a central switch',
      D: 'Full mesh — every node connects directly to every other node'
    },
    answer: 'C',
    explanation: 'Star topology connects every device to a central switch. One cable fault affects only that device (not the whole network as with bus). Modern Ethernet LAN is star-wired. Bus (A) is legacy 10BASE2/5 coax. Ring (B) is Token Ring or FDDI. Full mesh (D) is used for WAN/core designs where resilience matters more than cost — requires n(n-1)/2 links.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D2-36: Wireless site survey (2.4 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A company is planning a new warehouse Wi-Fi deployment and must determine the number and placement of APs before installation. Which task produces a heatmap of expected RF coverage, channel planning, and AP counts?',
    scenario: 'The warehouse is 8000 m² with metal racking and concrete walls. The team must avoid RF dead zones and minimise co-channel interference before committing to AP purchases.',
    difficulty: 'Exam Level',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'A predictive site survey using RF modelling software with building floor plan and material attenuation data',
      B: 'Configuring SNMPv3 on existing APs',
      C: 'Reading the AP data sheet',
      D: 'Running iperf from one laptop to another'
    },
    answer: 'A',
    explanation: 'A predictive site survey (via tools like Ekahau, iBwave, Hamina) takes the building floor plan, wall/material attenuation values, and AP specs to produce a coverage heatmap, AP count, and channel plan BEFORE installation. A passive/active site survey validates AFTER installation. SNMP (B) is monitoring. Data sheets (C) give specs but not site-specific coverage. iperf (D) measures throughput, not coverage.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D3-30: sFlow vs NetFlow (3.2 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A very high-speed core switch (400 Gbps) is too fast for full-flow traffic accounting without overwhelming the collector. Which technology uses packet sampling to scale to line rates?',
    scenario: 'NetFlow export on this switch would hit ~5 million flows/minute and saturate the collector. The team accepts statistical sampling rather than full-flow accuracy to keep visibility at 400G.',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'sFlow — statistical packet sampling (e.g., 1 in 2048), counter polling; designed for high-speed interfaces',
      B: 'Full NetFlow v9 — record every flow',
      C: 'SNMP walks of every MIB',
      D: 'Syslog only'
    },
    answer: 'A',
    explanation: 'sFlow (RFC 3176) samples packets at a configurable rate (typical 1-in-2048 or 1-in-1024) and exports the samples plus interface counters. That scales to 400G+ linerates because CPU cost is fixed per sample. Full NetFlow (B) tracks every flow and does not scale to very high linerates. SNMP walks (C) and syslog (D) give no flow visibility.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D3-31: Jump server / bastion (3.5 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A security team requires that administrators access production servers only through a single hardened host that logs every session. What is this host called?',
    scenario: 'Direct SSH from administrator laptops to production servers is being eliminated. The new model forces all administrative sessions through a single auditable host in a management network.',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.5',
    options: {
      A: 'Load balancer',
      B: 'Jump server (bastion host) — a hardened intermediary that logs and controls administrative access',
      C: 'NTP server',
      D: 'Caching proxy'
    },
    answer: 'B',
    explanation: 'A jump server (also called bastion host) is a single hardened entry point for administrative access. Users SSH or RDP into the bastion, and from there into production systems. Every session is logged (often with session recording). The bastion is heavily monitored, patched, and often MFA-enforced. This reduces attack surface by eliminating direct admin access from user endpoints. Load balancers (A), NTP (C), and proxies (D) serve unrelated purposes.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D3-32: SIEM (3.2 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which platform aggregates logs from firewalls, IDS/IPS, servers, switches, and authentication systems into one searchable store with correlation rules and alerting?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'Syslog server with flat file rotation only',
      B: 'SNMP poller',
      C: 'SIEM (Security Information and Event Management) — centralised log aggregation + correlation + alerting',
      D: 'NetFlow collector'
    },
    answer: 'C',
    explanation: 'A SIEM (Splunk, QRadar, Sentinel, Elastic Security, etc.) pulls logs from heterogeneous sources, normalises them, applies correlation rules (e.g., repeated auth failure + successful login from new geo), and produces alerts. A raw syslog server (A) stores logs but lacks correlation. SNMP (B) and NetFlow (D) handle different data types (device health / traffic flows).',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D3-33: SMB vs NFS (3.4 / Foundational / recall) ──
  {
    type: 'mcq',
    question: 'Which file-sharing protocol originated in the UNIX world and is the default for most Linux servers, while a DIFFERENT protocol dominates Windows file sharing?',
    difficulty: 'Foundational',
    topic: 'SMB & Network File Services',
    objective: '3.4',
    options: {
      A: 'FTP for UNIX, HTTP for Windows',
      B: 'NFS for UNIX/Linux, SMB/CIFS for Windows',
      C: 'TFTP for UNIX, SFTP for Windows',
      D: 'Both platforms use the same protocol, AFP'
    },
    answer: 'B',
    explanation: 'NFS (Network File System, Sun Microsystems) is the traditional UNIX/Linux file share, using TCP 2049. SMB (Server Message Block, also called CIFS in older form) is the Windows file share, on TCP 445. Both can interoperate across platforms today, but NFS is default on Linux, SMB on Windows. AFP (D) was Apple Filing Protocol, now deprecated in macOS in favour of SMB.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D3-34: IPAM (3.1 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A large enterprise has hundreds of VLANs, multiple DHCP scopes, and extensive use of private IPv4 + IPv6 space. Tracking all of it in spreadsheets keeps causing conflicts. Which tool category solves this?',
    scenario: 'IP address conflicts are reported weekly. DNS entries are stale. DHCP scopes overlap. The team wants a central authoritative record of every subnet, DHCP scope, DNS entry, and assigned IP.',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'IPAM (IP Address Management) platform — centralised tracking of subnets, DHCP scopes, DNS records',
      B: 'SIEM for security events',
      C: 'Load balancer with virtual IPs',
      D: 'Switch stacking'
    },
    answer: 'A',
    explanation: 'IPAM platforms (Infoblox, phpIPAM, BlueCat, NetBox, etc.) provide authoritative tracking of subnets, VLANs, DHCP scopes, DNS records, and assigned IPs — usually integrating directly with DNS/DHCP servers so the record is the source of truth. SIEM (B) is security. Load balancers (C) and stacking (D) are unrelated. Spreadsheets drift; IPAM does not.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D5-34: Cable certification vs qualification (5.2 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which cable testing tool provides a PASS/FAIL result against a specific standard (e.g., Cat6A per TIA/EIA-568) with detailed measurements like NEXT, return loss, and insertion loss?',
    difficulty: 'Exam Level',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'Cable certifier (e.g., Fluke DSX, Versiv) — produces a PASS/FAIL against the TIA standard with full parameter sweep',
      B: 'Qualification tester — reports only whether the link supports a target rate (e.g., 1 Gbps), no detailed measurements',
      C: 'Verification tester (continuity/wiremap only)',
      D: 'Multimeter — DC voltage and resistance'
    },
    answer: 'A',
    explanation: 'Three tiers: (1) Verification = continuity + wiremap (toner + probe, basic wiremap tester). (2) Qualification (B) = "does this link support 1 Gbps right now?" but no category certification. (3) Certification (A) = full parameter sweep (NEXT, FEXT, PSNEXT, return loss, insertion loss, propagation delay) with PASS/FAIL against a TIA category. Cable installers use certifiers to deliver formal warranty reports. Multimeters (D) are not cable testers.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D5-35: OTDR (5.2 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A 12 km dark-fiber link between two buildings has a sudden loss spike in the middle. Which tool localises the fault to a specific distance from either endpoint?',
    scenario: 'Both end transceivers test fine on a short patch. The link ran clean for months, then loss jumped overnight. A construction crew was digging near the right-of-way last week.',
    difficulty: 'Exam Level',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'OTDR (Optical Time-Domain Reflectometer) — sends pulses and reads reflections to build a distance-vs-loss trace of the fibre',
      B: 'TDR (Time-Domain Reflectometer, copper)',
      C: 'Light meter / OLTS power reading',
      D: 'Continuity tester'
    },
    answer: 'A',
    explanation: 'OTDR is the fibre equivalent of TDR. It transmits optical pulses and measures reflections/backscatter to build a trace showing distance vs loss, pinpointing splice points, bends, breaks, and connector losses by location. Critical for long outside-plant fibre. A TDR (B) is for copper. A light meter / OLTS (C) gives end-to-end attenuation but no distance localisation. Continuity testers (D) only verify end-to-end light presence.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D5-36: nslookup vs dig (5.5 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which command-line DNS tool is universally available on Linux/macOS and produces more detailed, structured DNS output than the older Windows-style equivalent?',
    difficulty: 'Exam Level',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'nslookup — legacy, simple answer+authority output, available on Windows and UNIX',
      B: 'dig (Domain Information Groper) — detailed structured output with flags, RRSIGs, timing; standard on Linux/macOS',
      C: 'ping -a',
      D: 'arp -a'
    },
    answer: 'B',
    explanation: 'dig is the modern, detailed DNS diagnostic tool: shows query flags, all RR types, TTL, authority/additional sections, DNSSEC signatures, and query time. nslookup (A) still works everywhere but gives terser output and some quirky interactive-mode behavior. On Windows, "Resolve-DnsName" (PowerShell) is the dig-equivalent. ping -a (C) does a reverse lookup but is not a DNS query tool. arp -a (D) shows the ARP cache, unrelated to DNS.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D5-37: Routing table inspection (5.5 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A Windows laptop cannot reach 10.50.0.0/16 even though it is on the same LAN as a router that reaches that network. The admin suspects the laptop is missing a static route or default gateway. Which command displays the current routing table?',
    scenario: 'Other hosts on the same VLAN can reach 10.50.0.0/16. The failing laptop has an IP and can ping its default gateway, but not the remote subnet.',
    difficulty: 'Exam Level',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'ipconfig /all only',
      B: 'route print on Windows (or ip route / netstat -rn on Linux/macOS)',
      C: 'arp -d only',
      D: 'nslookup google.com'
    },
    answer: 'B',
    explanation: '"route print" on Windows shows the full IPv4 + IPv6 routing table — default route, connected routes, static routes. On Linux/macOS use "ip route" or "netstat -rn". Missing default route or wrong gateway reveals itself immediately. ipconfig (A) shows interface config + gateway but not the full routing table. arp -d (C) flushes the ARP cache — different layer. nslookup (D) is DNS, not routing.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D5-38: CRC errors vs collisions (5.5 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A switch interface counter shows increasing CRC errors and late collisions on a gigabit port connected to a server. Which root cause is most likely?',
    scenario: 'The cable is Cat6, 45 metres, recently installed. The server NIC shows the link as 100/Half. The switch port is configured auto/auto but the neighbor log shows a speed/duplex mismatch warning.',
    difficulty: 'Exam Level',
    topic: 'Connection Issues',
    objective: '5.5',
    options: {
      A: 'Normal Ethernet behaviour — collisions are expected at gigabit',
      B: 'Duplex mismatch — one side running half-duplex, the other full-duplex; late collisions are the classic signature',
      C: 'Firewall blocking CRC packets',
      D: 'DNS resolution failure'
    },
    answer: 'B',
    explanation: 'Late collisions (detected after the first 64 bytes) are the diagnostic fingerprint of duplex mismatch: the full-duplex side transmits freely, the half-duplex side sees traffic arriving while it is transmitting and reports a collision. Combined with rising CRC errors this is conclusive. Fix: hardcode matching speed/duplex on both ends (or properly auto-negotiate). Collisions are NOT normal on full-duplex gigabit (A wrong). Firewall (C) and DNS (D) do not cause Layer 1/2 errors.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D5-39: Asymmetric routing (5.5 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'A stateful firewall drops return packets for a new TCP flow, breaking connectivity for certain clients. The forward path goes through Firewall A; the return path goes through Firewall B. What is the root cause?',
    scenario: 'Clients in subnet X have a default route pointing to Firewall A. The server responses follow a different route (via Firewall B) because of a more-specific route on the server side. Firewall B has no state entry for the flow, so it drops the return packet.',
    difficulty: 'Hard',
    topic: 'CompTIA Troubleshooting Methodology',
    objective: '5.5',
    options: {
      A: 'MTU black hole',
      B: 'Asymmetric routing through stateful firewalls — return path bypasses the state table built on the forward path',
      C: 'Duplicate MAC address',
      D: 'DHCP lease expiry'
    },
    answer: 'B',
    explanation: 'Asymmetric routing is fatal to stateful firewalls. The forward packet creates a state entry on Firewall A; the return packet arrives at Firewall B, which has no matching state and drops the packet as unsolicited. Fix: route symmetrically (pin both directions through the same firewall), use a stateful cluster that shares state, or configure the firewalls to trust specific asymmetric flows. MTU (A), duplicate MAC (C), and DHCP (D) produce different symptoms.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ── D5-40: MTU black hole (5.5 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'A VPN user can browse small websites but large pages hang halfway or never fully load. Ping works. A firewall on the path drops all ICMP unreachable messages. What is happening?',
    scenario: 'The VPN MTU is 1400. Servers send 1500-byte packets with DF (Do not Fragment) set. The ICMP Type 3 Code 4 "fragmentation needed" message that should tell the server to reduce its packet size is blocked by an intermediate firewall.',
    difficulty: 'Hard',
    topic: 'Service Issues',
    objective: '5.5',
    options: {
      A: 'MTU black hole — Path MTU Discovery fails because ICMP Type 3 Code 4 is filtered; large DF packets are silently dropped',
      B: 'DNS resolution failure',
      C: 'TCP port exhaustion on the client',
      D: 'Expired TLS certificate'
    },
    answer: 'A',
    explanation: 'Path MTU Discovery relies on routers sending ICMP Type 3 Code 4 "fragmentation needed" back to the source when an oversized DF packet arrives. If a firewall silently drops that ICMP message, the source never learns to reduce MSS — and its large DF packets are silently dropped at the bottleneck. Symptom: small packets work, large packets time out. Fix: allow ICMP Type 3 through firewalls, or clamp TCP MSS at the VPN termination (e.g., ip tcp adjust-mss 1360). Other options do not match the symptoms.',
    source: 'curated',
    addedVersion: '4.59.5',
    addedDate: '2026-04-21'
  },
  // ═════════════════════════════════════════════════════════════════
  // PATH B — ROAD TO 200 BATCH 6 (v4.59.6): 22 new exemplars — FINAL
  // Bank grows 178 → 200. Distribution: D1+6, D2+4, D3+4, D4+0, D5+8.
  // Hits CompTIA-weight target: 46/40/38/28/48 = 200.
  // ═════════════════════════════════════════════════════════════════
  // ── D1-41: DoH / DoT (1.6 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which DNS privacy protocol encrypts client DNS queries inside TLS and uses HTTPS (port 443) to blend with normal web traffic?',
    difficulty: 'Exam Level',
    topic: 'DNS Records & DNSSEC',
    objective: '1.6',
    options: {
      A: 'Plain DNS over UDP/53 (cleartext)',
      B: 'DNS over TLS (DoT) on TCP/853',
      C: 'DNS over HTTPS (DoH) on TCP/443',
      D: 'DNSSEC on UDP/53'
    },
    answer: 'C',
    explanation: 'DoH (RFC 8484) wraps DNS queries in HTTPS on port 443, making them indistinguishable from normal web traffic — hard for middleboxes to identify and block. DoT (B) also encrypts DNS but uses a dedicated port (853), which network operators can easily identify. DNSSEC (D) signs answers for authenticity but does NOT encrypt them. Plain DNS (A) is cleartext and observable on-path.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D1-42: SNMP ports 161/162 (1.4 / Foundational / recall) ──
  {
    type: 'mcq',
    question: 'Which pair of port numbers is used by SNMP for agent polling and trap notification?',
    difficulty: 'Foundational',
    topic: 'Port Numbers',
    objective: '1.4',
    options: {
      A: 'TCP/22 for polling, UDP/23 for traps',
      B: 'UDP/161 for polling (manager to agent), UDP/162 for traps (agent to manager)',
      C: 'TCP/25 for polling, TCP/110 for traps',
      D: 'UDP/514 for polling, UDP/69 for traps'
    },
    answer: 'B',
    explanation: 'SNMP uses UDP/161 for manager-to-agent polling (GET, GETNEXT, SET) and UDP/162 for agent-to-manager trap notifications. Easy way to remember: 161 = normal poll, 162 = urgent trap. 22 is SSH, 23 Telnet, 25 SMTP, 110 POP3, 514 syslog, 69 TFTP — all wrong pairings here.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D1-43: Telnet 23 vs SSH 22 (1.4 / Foundational / recall) ──
  {
    type: 'mcq',
    question: 'Which statement correctly pairs the remote-shell protocols with their port numbers and security properties?',
    difficulty: 'Foundational',
    topic: 'Port Numbers',
    objective: '1.4',
    options: {
      A: 'Telnet on TCP/22 is encrypted; SSH on TCP/23 is cleartext',
      B: 'Telnet on TCP/23 is cleartext; SSH on TCP/22 is encrypted',
      C: 'Both use TCP/22 and both are encrypted',
      D: 'Both use TCP/23 and both are cleartext'
    },
    answer: 'B',
    explanation: 'Telnet (TCP/23) is the legacy cleartext remote-shell protocol — credentials and session traffic are visible on the wire. SSH (TCP/22) replaces Telnet with strong encryption, authentication, and integrity. Modern networks disable Telnet entirely in favour of SSH (and use SCP/SFTP for file transfer over the same SSH channel). A, C, D misstate the ports or security properties.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D1-44: VXLAN overlay (1.8 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A large data centre needs to extend Layer 2 reachability across an IP-routed underlay, allowing tenant VMs to communicate as if they were on the same LAN even when servers sit in different racks with different IP subnets. Which encapsulation enables this?',
    scenario: 'The data centre uses a spine-leaf design with IP-only transport between leaves. Tenants require Layer 2 adjacency for live VM migration and legacy protocols that assume a shared broadcast domain.',
    difficulty: 'Exam Level',
    topic: 'Virtualisation & Cloud',
    objective: '1.8',
    options: {
      A: 'VXLAN (Virtual Extensible LAN) — Layer 2 Ethernet frames encapsulated in UDP on an IP underlay, with 24-bit VNI supporting 16 million segments',
      B: 'ARP broadcasts flooded across the WAN',
      C: 'Standard 802.1Q VLAN tagging only',
      D: 'NAT translation between tenant subnets'
    },
    answer: 'A',
    explanation: 'VXLAN (RFC 7348) encapsulates original Ethernet frames in a VXLAN header plus UDP plus outer IP — extending L2 over any routed L3 underlay. The 24-bit VXLAN Network Identifier (VNI) supports ~16.7M segments vs 802.1Qs 4094 limit. VXLAN Tunnel Endpoints (VTEPs) on the leaves handle encapsulation/decapsulation. Standard 802.1Q (C) cannot cross routed networks. ARP flooding (B) is what VXLAN replaces with controlled flood-and-learn or EVPN control plane.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D1-45: SPF / DKIM / DMARC (1.6 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A company is receiving complaints that its email is being spoofed in phishing campaigns. Which three DNS TXT record standards work together to prevent unauthorised senders from impersonating the domain?',
    scenario: 'The spoofed emails pass basic checks at recipient mail servers. The security team wants to publish DNS records that let recipients verify both sender IP authorisation and message integrity, plus define a policy for handling failures.',
    difficulty: 'Exam Level',
    topic: 'DNS Records & DNSSEC',
    objective: '1.6',
    options: {
      A: 'PTR, MX, and CNAME',
      B: 'SPF (sender IP authorisation), DKIM (cryptographic message signature), DMARC (policy + reporting)',
      C: 'A, AAAA, and SOA',
      D: 'NS, TXT, and SRV'
    },
    answer: 'B',
    explanation: 'SPF (Sender Policy Framework) lists which IPs may send mail for the domain, published as a TXT record. DKIM (DomainKeys Identified Mail) adds a cryptographic signature over message content, validated via a TXT record containing the public key. DMARC (Domain-based Message Authentication) ties SPF and DKIM results to a policy (none/quarantine/reject) and provides aggregate reporting, also via TXT. Other options list unrelated record types.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D1-46: Container networking (1.8 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'A single Linux host runs 50 containers. Each container must have an isolated network stack (its own interfaces, routes, iptables rules) without requiring a separate hypervisor. Which kernel feature provides this isolation?',
    scenario: 'Containers are much lighter-weight than VMs — no hypervisor, no guest kernel — yet each still needs an isolated view of the network. The design relies on Linux kernel primitives rather than virtualisation.',
    difficulty: 'Hard',
    topic: 'Virtualisation & Cloud',
    objective: '1.8',
    options: {
      A: 'VLAN trunking on the physical NIC',
      B: 'Linux network namespaces + virtual Ethernet (veth) pairs, often bridged into a software switch (e.g., docker0, CNI plugins)',
      C: 'NAT only on each container',
      D: 'A separate physical NIC per container'
    },
    answer: 'B',
    explanation: 'Linux network namespaces create independent network stacks (interfaces, routing tables, iptables state) within a single kernel. Each container runs in its own netns. veth pairs (one end in the container, one in the host bridge) connect containers to a host-side software bridge (docker0 or a CNI plugin like Calico, Flannel, Cilium). This gives full isolation without hypervisor overhead. VLAN trunking (A) is not container-aware. NAT alone (C) does not give interface isolation. Physical NIC per container (D) defeats the container density model.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D2-37: OSPF area types (2.2 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'A remote branch has a single link to headquarters and runs OSPF. To reduce routing-table size on the branch router, you want the branch to learn only a default route from the backbone rather than every external prefix. Which OSPF area type achieves this?',
    scenario: 'The branch router is memory-constrained. It only needs a default route to reach the rest of the network. External LSAs (Type 5) from BGP redistribution elsewhere should not flood into this branch.',
    difficulty: 'Hard',
    topic: 'OSPF',
    objective: '2.2',
    options: {
      A: 'Backbone (Area 0) — all external and inter-area routes',
      B: 'Stub area — blocks external Type 5 LSAs; ABR injects a default route',
      C: 'Regular (non-special) area — full LSA flooding',
      D: 'Transit area — carries virtual links only'
    },
    answer: 'B',
    explanation: 'A stub area blocks Type 5 (external) LSAs from entering. The Area Border Router (ABR) injects a default route (0.0.0.0/0) so routers inside the stub area still reach external destinations via the ABR. A totally stubby area blocks Type 3 (inter-area) LSAs too, shrinking the table further. NSSA (Not-So-Stubby Area) allows limited Type 7 redistribution from within the area. Area 0 (A) is the transit backbone — cannot be stub. Virtual links (D) are a repair mechanism for areas not directly touching Area 0.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D2-38: QinQ / 802.1ad (2.1 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'A service provider carries customer Ethernet traffic across its backbone. Each customer already uses 802.1Q VLAN tags for their own internal VLANs, and the provider must preserve customer tags while multiplexing many customers on the same backbone link. Which technology is used?',
    scenario: 'Customer A uses VLANs 10-100 for their sites. Customer B also uses VLANs 10-100. The provider must tunnel both across the same backbone without mixing customer VLAN spaces.',
    difficulty: 'Hard',
    topic: 'VLAN Trunking',
    objective: '2.1',
    options: {
      A: 'Q-in-Q (802.1ad) — double-tagging with an outer service VLAN (S-Tag) plus the customer VLAN (C-Tag) preserved inside',
      B: 'Single 802.1Q tag — customer VLANs simply replace provider VLANs',
      C: 'VTP pruning',
      D: 'STP BPDU filtering'
    },
    answer: 'A',
    explanation: 'IEEE 802.1ad (Q-in-Q) adds an outer S-Tag (Service-provider VLAN) over the original customer C-Tag. Customer VLAN space is preserved unchanged; the provider uses only the S-Tag for switching decisions. Frame becomes: dst MAC | src MAC | 0x88A8 S-Tag | 0x8100 C-Tag | EtherType | payload. Single-tag (B) would require each customer to get unique VLANs — operationally unscalable. VTP (C) and BPDU filtering (D) are unrelated.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D2-39: Root Guard vs BPDU Guard (2.1 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'On a distribution switchport connecting to another switch, an admin wants to allow normal STP BPDUs but prevent the remote switch from becoming the root bridge (which would redirect traffic through an unintended path). Which feature enforces this?',
    scenario: 'BPDUs are expected on this port, so BPDU Guard would err-disable it immediately on any BPDU. The admin only wants to block the specific case of a superior BPDU that would win the root election.',
    difficulty: 'Exam Level',
    topic: 'STP/RSTP',
    objective: '2.1',
    options: {
      A: 'BPDU Guard — err-disables any port that receives any BPDU',
      B: 'Root Guard — allows BPDUs but places the port in root-inconsistent state if a superior BPDU is received, preventing root takeover',
      C: 'Loop Guard — prevents alternate ports from transitioning to forwarding',
      D: 'UplinkFast — fast failover between uplinks on access switches'
    },
    answer: 'B',
    explanation: 'Root Guard is the right tool for "I expect STP but this neighbor must not become root." If a superior BPDU (lower bridge ID) arrives, the port goes into root-inconsistent blocking state until the superior BPDUs stop. BPDU Guard (A) err-disables on any BPDU — too aggressive for a switch-to-switch link. Loop Guard (C) prevents unidirectional-link loops. UplinkFast (D) is an edge-switch failover accelerator.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D2-40: WPA2-PSK vs WPA2-Enterprise (2.4 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which statement correctly distinguishes WPA2-Personal (PSK) from WPA2-Enterprise (802.1X/EAP)?',
    difficulty: 'Exam Level',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'PSK uses a single shared passphrase for all clients; Enterprise authenticates each user individually via 802.1X/EAP against a RADIUS server',
      B: 'PSK is stronger because the key is longer',
      C: 'Enterprise does not encrypt traffic, only authenticates',
      D: 'PSK and Enterprise are identical on the wire'
    },
    answer: 'A',
    explanation: 'WPA2-Personal (Pre-Shared Key) uses one shared passphrase that everyone on the SSID knows — revoking access means rotating the PSK for everyone. WPA2-Enterprise uses 802.1X with EAP (PEAP, EAP-TLS, etc.): each user authenticates individually against a RADIUS server, and access can be revoked per user. Both encrypt traffic (C is wrong). Enterprise is more secure and more scalable for organisations, though more complex to deploy.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D3-35: ITIL change categories (3.1 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which ITIL change category covers pre-approved, low-risk, routine changes that can be executed without going through the Change Advisory Board for each instance?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Emergency change — fix for a production-down incident',
      B: 'Normal change — standard CAB approval path',
      C: 'Standard change — pre-approved, documented, repeatable (e.g., adding a port to a known-safe template config)',
      D: 'Major change — architectural impact'
    },
    answer: 'C',
    explanation: 'ITIL defines three change categories. Standard changes (C) are pre-approved and documented — e.g., applying a vetted template to a new switchport — so the CAB does not need to review each instance. Normal changes (B) go through full review. Emergency changes (A) bypass normal approval because production is down, but are reviewed retrospectively. Aligning routine work to the standard-change category is the main lever for reducing CAB queue time.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D3-36: SLA uptime math (3.1 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A service provider contract guarantees 99.9% availability per calendar year. Approximately how much total downtime is permitted per year under that SLA?',
    scenario: 'The customer is budgeting planned-maintenance windows against the SLA. Year = 365.25 days. They need the correct downtime allowance to avoid breaching the SLA with their maintenance schedule.',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: '52.6 minutes per year (five 9s: 99.999%)',
      B: '8.76 hours per year (three 9s: 99.9%)',
      C: '43.8 minutes per year (99.992%)',
      D: '36.5 days per year (90%)'
    },
    answer: 'B',
    explanation: 'Annual downtime math: (1 − availability) × 525,600 minutes (365.25 days × 24 h × 60 min). 99.9% → 0.001 × 525,600 ≈ 525 min ≈ 8.76 hours per year. Reference table: 99% ≈ 87.6 h/yr, 99.9% ≈ 8.76 h/yr, 99.99% ≈ 52.6 min/yr, 99.999% ≈ 5.26 min/yr. Each added 9 shrinks downtime by 10x.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D3-37: Vulnerability scan vs pen test (3.1 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which security assessment activity is typically automated, periodic, and produces a list of known weaknesses by CVE without attempting to actively exploit them?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Penetration test — authorised humans actively attempt to exploit and pivot',
      B: 'Vulnerability scan — automated, signature/rule-based identification of known weaknesses (CVE), no exploitation',
      C: 'Red team engagement — goal-driven multi-week adversarial simulation',
      D: 'Security audit — documentation and policy review'
    },
    answer: 'B',
    explanation: 'Vulnerability scanning (Nessus, Qualys, Rapid7, OpenVAS) is automated and runs routinely. It flags known CVEs by version-matching and rule-based checks without actively exploiting anything. Pen testing (A) is human-driven and includes active exploitation. Red team (C) is longer-duration, goal-oriented (steal intellectual property, reach domain admin), often using social engineering. Audit (D) reviews policies and controls on paper. Vulnerability scans feed patch management; pen tests validate actual exploitability.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D3-38: Capacity planning / trend analysis (3.2 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A network team must decide whether to upgrade a WAN circuit from 500 Mbps to 1 Gbps. They have 12 months of SNMP + NetFlow data. Which analytical approach best informs the decision?',
    scenario: 'Peak utilisation has been creeping upward month over month. The team wants to project when the current 500 Mbps will become insufficient, rather than reacting after the link is saturated.',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'Capacity planning / trend analysis — project utilisation growth, extrapolate to identify when capacity will be exhausted',
      B: 'One-time ping test',
      C: 'Vulnerability scan of the circuit',
      D: 'Log retention policy review'
    },
    answer: 'A',
    explanation: 'Capacity planning uses historical trend data (NetFlow, SNMP counters, baseline utilisation) to project future demand and identify the inflection point where current capacity will be insufficient. Typical approach: plot monthly peak + 95th-percentile utilisation over time, fit a trend line, cross the capacity threshold — that is the upgrade trigger. Ping (B), vulnerability scan (C), and log retention (D) do not address growth projection.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D5-41: MAC flap / table thrashing (5.5 / Hard / scenario) ──
  {
    type: 'mcq',
    question: 'A switch log is filling with "MAC flap" messages: the same MAC address is being learned repeatedly on two different ports. End users report intermittent connectivity. What is the most likely root cause?',
    scenario: 'The MAC address 0050.56aa.bbcc is flapping between Gi0/5 and Gi0/10 every few seconds. Both ports connect to downstream switches. No duplicate server is known to exist.',
    difficulty: 'Hard',
    topic: 'Connection Issues',
    objective: '5.5',
    options: {
      A: 'Layer 2 loop — the same broadcast/unicast frame arrives on multiple ports, so the MAC table cannot settle',
      B: 'Firewall rule blocking the MAC',
      C: 'Expired TLS certificate on the host',
      D: 'DHCP scope exhaustion'
    },
    answer: 'A',
    explanation: 'A MAC flap means the switch sees the same source MAC arriving on multiple ports — the canonical signature of a Layer 2 loop or, occasionally, a misconfigured MLAG/VPC peer. Fix: identify and break the loop (check STP status on the flapping ports, disable or redesign the extra uplink, ensure BPDU Guard + Root Guard are deployed on access ports). Firewalls (B) do not filter by MAC at this layer. TLS (C) and DHCP (D) produce different symptoms.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D5-42: Rogue DHCP server (5.5 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'Users on a corporate VLAN are receiving IP addresses in the wrong subnet. The authoritative DHCP server is working, but clients occasionally lease from an unknown server that advertises a different default gateway. Which mitigation prevents this?',
    scenario: 'A suspicious unmanaged device was plugged into a wall port this morning. Clients near it lease from 192.168.50.1 instead of the expected 10.1.1.1. Pointing them to the wrong gateway breaks connectivity.',
    difficulty: 'Exam Level',
    topic: 'Service Issues',
    objective: '5.5',
    options: {
      A: 'Enable DHCP Snooping on the switches — trust only the legitimate DHCP server port, drop server-sourced DHCP from any other port',
      B: 'Disable DHCP entirely on the network',
      C: 'Increase the DHCP lease time',
      D: 'Block ARP on access ports'
    },
    answer: 'A',
    explanation: 'DHCP Snooping is the canonical switch feature for rogue-DHCP defence. It classifies each switchport as trusted (upstream toward legitimate DHCP server) or untrusted (user-facing). DHCP server packets (OFFER, ACK) from untrusted ports are dropped. Also builds a binding table used by Dynamic ARP Inspection and IP Source Guard. Disabling DHCP (B) breaks the network. Long leases (C) do not prevent rogue leases. Blocking ARP (D) breaks everything.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D5-43: Duplicate IP conflict (5.5 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'Two hosts on the same VLAN intermittently lose connectivity, and the ARP cache on neighbours shows the same IP mapped to different MAC addresses at different times. What is the most likely cause?',
    scenario: 'Both hosts are manually configured with static IPs. A recent build image reused an IP that was already assigned. No DHCP is involved for these two hosts.',
    difficulty: 'Exam Level',
    topic: 'Service Issues',
    objective: '5.5',
    options: {
      A: 'Duplicate IP address — both hosts claim the same IP, each sends gratuitous ARP asserting the MAC, neighbours thrash their ARP entries',
      B: 'MTU mismatch on the VLAN',
      C: 'Failed DNS lookup',
      D: 'Expired DHCP lease'
    },
    answer: 'A',
    explanation: 'Duplicate-IP conflict: each host periodically emits a gratuitous ARP for its own IP, and neighbours keep flip-flopping the ARP binding between the two MACs. Windows alerts in Event Log; Linux logs ARP address conflicts. Fix: identify the duplicate, correct the config or reassign one host. MTU (B), DNS (C), DHCP lease (D) produce different symptoms.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D5-44: NIC teaming failover (5.5 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A server uses NIC teaming (two physical interfaces bonded in 802.3ad LACP to a switch stack). One NIC is unplugged for testing but the team shows both members still "up" in the team status and traffic stops flowing. What is the most likely issue?',
    scenario: 'The team is configured in LACP (active) mode. The switch ports are in the same LACP channel group. Link state on the server shows Up/Up even after the physical cable is pulled on one NIC.',
    difficulty: 'Exam Level',
    topic: 'Connection Issues',
    objective: '5.5',
    options: {
      A: 'Link state is being reported by an intermediate device (e.g., media converter or port expander) masking the physical link loss — the failover never fires because the OS sees both NICs as up',
      B: 'LACP is unrelated to link failure detection',
      C: 'The team must be reconfigured as round-robin instead',
      D: 'The cables need to be longer'
    },
    answer: 'A',
    explanation: 'LACP relies on link-layer state to drive failover. If a media converter, port channel or small unmanaged switch sits between the NIC and the switch, the OS can see a stale Up state even though the real path is broken — so the team keeps sending traffic on a dead leg. Fixes: eliminate the intermediate device, or use LACP PDU timeouts (fast/slow) to detect peer loss by missed LACP hellos. Round-robin (C) ignores link state entirely — worse. B and D are incorrect.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D5-45: Dirty fiber connector (5.2 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A fiber link between two buildings shows high receive-loss on one transceiver. The fiber tested fine when installed three years ago. An OTDR trace shows a loss spike at the patch panel, not along the span. What is the first action?',
    scenario: 'The loss is localised at the connector, not anywhere along the fibre itself. The run is inside a clean building, not subjected to digging or physical damage.',
    difficulty: 'Exam Level',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'Clean the fiber connector with isopropyl alcohol wipes or a click-cleaner — dust and skin oils are the #1 cause of patch-panel loss spikes',
      B: 'Replace the entire outdoor fiber run',
      C: 'Disable SNMP on the switch',
      D: 'Upgrade to 10GBASE-T copper instead'
    },
    answer: 'A',
    explanation: 'Dirty fiber connectors are the #1 cause of new loss on fiber patch-panel endpoints. Dust, skin oils, or touch contamination on the endface scatters light and drops signal power. Use IPA-impregnated wipes or a single-use click-cleaner, then re-measure. Replacing the full run (B) is massive overkill. SNMP (C) and switching to copper (D) are unrelated to optical connector contamination.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D5-46: iperf bandwidth test (5.5 / ExamL / recall) ──
  {
    type: 'mcq',
    question: 'Which open-source tool is the standard way to measure end-to-end throughput between two hosts by generating synthetic TCP or UDP traffic?',
    difficulty: 'Exam Level',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'ping',
      B: 'iperf (or iperf3) — client/server model, reports bits/sec, jitter, and packet loss',
      C: 'traceroute',
      D: 'tcpdump'
    },
    answer: 'B',
    explanation: 'iperf3 is run as "iperf3 -s" on one host (server) and "iperf3 -c <server>" on the other (client). Reports throughput in bits per second, jitter (UDP mode), packet loss, and retransmissions (TCP). The go-to tool for validating circuit capacity, QoS behaviour, and tuning. ping (A) measures latency and reachability, not throughput. traceroute (C) shows path. tcpdump (D) captures packets but does not generate load.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D5-47: Interface counter drops / input errors (5.4 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A 1 Gbps uplink shows increasing "input queue drops" and "input errors: CRC" on the switch interface. The link shows Up/Up at 1000/Full. Which is the most likely cause category?',
    scenario: 'Input drops accumulate at roughly the same rate as heavy traffic bursts. CRC errors increase slowly but steadily over time. Physical cabling tests clean on the Fluke certifier.',
    difficulty: 'Exam Level',
    topic: 'Perf Issues',
    objective: '5.4',
    options: {
      A: 'Input queue drops typically indicate oversubscription or CPU-bound processing; rising CRCs indicate a Layer 1 problem developing — re-seat SFPs and check for EMI/marginal cable despite clean certification',
      B: 'Both are normal background behaviour — ignore',
      C: 'Duplex mismatch — hardcode both sides to full duplex',
      D: 'Firewall policy denying traffic'
    },
    answer: 'A',
    explanation: 'Two separate symptoms pointing at two root causes. Input queue drops = buffer exhaustion or CPU-bound handling (raise buffer size, investigate control-plane policing, rate-limit upstream). Rising CRCs = Layer 1 issue forming (marginal SFP, flexing cable developing a fault, EMI source newly energised) even if a one-time certifier test was clean — reseat optics and re-test under load. Ignoring (B) lets both grow. Duplex mismatch (C) produces late collisions not CRCs at 1G auto-neg. Firewalls (D) do not cause interface counters.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ── D5-48: Wireless SNR threshold (5.4 / ExamL / scenario) ──
  {
    type: 'mcq',
    question: 'A Wi-Fi client shows RSSI of −65 dBm (good signal) but noise floor of −85 dBm, giving SNR of 20 dB. The user reports slow throughput. According to common enterprise Wi-Fi guidance, what is the minimum SNR target for reliable high-throughput operation?',
    scenario: 'The client associates fine but negotiates a low MCS (modulation/coding) rate. The neighbourhood has many active APs and a microwave oven in the kitchen next door.',
    difficulty: 'Exam Level',
    topic: 'Connection Issues',
    objective: '5.4',
    options: {
      A: '≥ 25 dB SNR for reliable high-throughput operation (higher MCS rates); 20 dB is marginal',
      B: '5 dB SNR is fine for all use cases',
      C: 'SNR has no impact on wireless performance',
      D: 'Only RSSI matters, not SNR'
    },
    answer: 'A',
    explanation: 'Signal-to-Noise Ratio = RSSI − noise floor. Enterprise guidance (Cisco, Aruba, Ekahau): ≥ 25 dB SNR for reliable high-MCS operation; 20-25 dB marginal; < 20 dB degraded. A good RSSI (−65) is useless if the noise floor is high (−75 or worse). Fixes: identify and remove noise sources (microwave, Bluetooth, non-Wi-Fi interferers via spectrum analyzer), move to 5 GHz or 6 GHz bands. 5 dB (B) fails even basic framing. C and D are false.',
    source: 'curated',
    addedVersion: '4.59.6',
    addedDate: '2026-04-21'
  },
  // ───── Phase 3 Cycle 1 — 2026-05-02 (Jason Dion practice test gap recalibration) ─────
  // 11 user-reported gap topics × 3 exemplars each = 33 new exemplars.
  // All content original. Sourced from public N10-009 blueprint + RFC/standard
  // references. NO copying or paraphrasing of paid-bank content per the
  // documented legal boundary (reference_jason_dion_method.md).
  // Gap topics: IPv6 Anycast, Media Converter, SD-WAN App Layer, Jumbo Frames
  // (SAN context), Band Steering, Anomaly Detection, DHCP Reservation, DHCP
  // Options, Separation of Duties, NAC Non-Persistent Agent, Wavelength Mismatch.

  // ── 1. IPv6 ANYCAST ──
  {
    type: 'mcq',
    question: 'Which IPv6 address type delivers a packet to the topologically nearest member of a group of interfaces sharing the same address?',
    difficulty: 'Foundational',
    topic: 'IPv6',
    objective: '1.4',
    options: { A: 'Unicast', B: 'Multicast', C: 'Anycast', D: 'Broadcast' },
    answer: 'C',
    explanation: 'Anycast assigns the same address to multiple interfaces, and the network routes a packet to whichever member is nearest by routing metric. Unicast (A) delivers to one specific interface. Multicast (B) delivers to every member of a group. Broadcast (D) does not exist in IPv6 — it is replaced by all-nodes multicast (FF02::1).',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'A content delivery provider configures three geographically distributed DNS resolvers with the same IPv6 address so client queries are answered by the closest resolver. Which addressing model does this implement?',
    difficulty: 'Exam Level',
    topic: 'IPv6',
    objective: '1.4',
    options: {
      A: 'Anycast — multiple interfaces share an address; routing picks the nearest',
      B: 'Multicast — packets fan out to every member of the group',
      C: 'Unicast — each resolver gets its own unique address',
      D: 'Loopback — resolvers respond on a private link-local address'
    },
    answer: 'A',
    explanation: 'Anycast is the design pattern for distributing the same service across multiple sites — clients hit whichever node the routing layer decides is closest. Multicast (B) would deliver each query to every resolver simultaneously, wasteful. Unicast (C) defeats the purpose since each resolver has a different address. Loopback (D) is not routable.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which statements correctly describe IPv6 anycast addresses?',
    difficulty: 'Hard',
    topic: 'IPv6',
    objective: '1.4',
    options: {
      A: 'They are syntactically indistinguishable from unicast addresses',
      B: 'They are reserved in their own dedicated address range like multicast addresses',
      C: 'A packet sent to an anycast address is delivered to the nearest member by routing metric',
      D: 'They replace IPv6 broadcast for all-nodes-on-a-link delivery',
      E: 'They are used for one-to-many fan-out where every member receives a copy'
    },
    answers: ['A', 'C'],
    explanation: 'A and C are correct. Anycast addresses look identical to unicast addresses (A) — the difference is that more than one interface shares the address; routing decides the destination by nearest metric (C). B is wrong: there is no dedicated "anycast range" in IPv6 — they share the unicast space. D is wrong: all-nodes delivery uses multicast (FF02::1), not anycast. E is wrong: that describes multicast (one-to-many), not anycast (one-to-nearest).',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },

  // ── 2. MEDIA CONVERTER ──
  {
    type: 'mcq',
    question: 'A network technician needs to extend a 1000BASE-T Ethernet link from a copper switch port to a remote building 600 meters away over existing fiber. Which device should they use to bridge the two media types?',
    difficulty: 'Foundational',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: { A: 'Repeater', B: 'Media converter', C: 'Hub', D: 'Patch panel' },
    answer: 'B',
    explanation: 'A media converter is a Layer 1 device that converts signals between two physical media — most commonly copper Ethernet and fiber optic. A repeater (A) regenerates the signal but on the same media. A hub (C) is a multi-port repeater for copper Ethernet. A patch panel (D) is a passive cable termination point with no signal conversion.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'Which best describes the OSI layer at which a media converter operates and the function it performs?',
    difficulty: 'Exam Level',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: {
      A: 'Layer 1 — converts the physical signal between media types (e.g., copper to fiber)',
      B: 'Layer 2 — translates Ethernet frames between media types',
      C: 'Layer 3 — routes packets across different physical connections',
      D: 'Layer 7 — translates application-layer protocols between hosts'
    },
    answer: 'A',
    explanation: 'A media converter is purely a Layer 1 (Physical) device. It converts electrical signals on copper to optical pulses on fiber (or vice versa) without inspecting frames, MAC addresses, or any higher-layer information. Options B–D describe functions of switches, routers, and application gateways respectively.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'A technician installs an SFP-based copper-to-fiber media converter and the link comes up but throughput is significantly lower than the rated speed. Which is the MOST LIKELY cause to investigate first?',
    difficulty: 'Hard',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: {
      A: 'A duplex or speed mismatch on the copper interface',
      B: 'The fiber strands are connected to the wrong polarity (TX/RX swap)',
      C: 'The media converter does not support jumbo frames',
      D: 'The fiber type is multi-mode instead of single-mode'
    },
    answer: 'A',
    explanation: 'A duplex or speed mismatch on the copper side is the most common cause of degraded throughput on an otherwise-up media-converter link — auto-negotiation failures cause one side to fall back to half-duplex while the other runs full-duplex, producing collisions and retransmissions visible only at the application layer. B (TX/RX polarity) typically prevents the link from coming up at all, not degrade throughput. C (jumbo frames) only matters if the workload uses oversized frames. D (fiber type) over short distances usually still passes traffic at full speed, though it may not be best practice.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },

  // ── 3. SD-WAN APPLICATION LAYER ──
  {
    type: 'mcq',
    question: 'Which capability distinguishes SD-WAN from traditional WAN routing?',
    difficulty: 'Exam Level',
    topic: 'SD-WAN & SASE',
    objective: '1.2',
    options: {
      A: 'It uses IPsec instead of GRE for site-to-site tunnels',
      B: 'It steers traffic dynamically based on application identity and real-time link conditions',
      C: 'It eliminates the need for any branch-office router hardware',
      D: 'It runs exclusively on private MPLS circuits'
    },
    answer: 'B',
    explanation: 'SD-WAN distinguishes itself by being application-aware — it identifies traffic by application (Office 365, Zoom, Salesforce, etc.) and steers each application across the best-performing transport (MPLS, broadband, LTE) based on real-time measurements of latency, jitter, and loss. A is irrelevant — SD-WAN supports both IPsec and other tunnel types. C is incorrect — branch hardware (uCPE / SD-WAN edge) is required. D is the opposite — SD-WAN was specifically designed to use any transport, including cheap broadband.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'An SD-WAN edge device classifies incoming traffic as a Microsoft Teams video call and routes it over the lowest-jitter link, while sending bulk file backups over the cheapest link. At which layer must the SD-WAN device operate to make this decision?',
    difficulty: 'Exam Level',
    topic: 'SD-WAN & SASE',
    objective: '1.2',
    options: {
      A: 'Layer 2 — it inspects the source MAC address',
      B: 'Layer 3 — it inspects the destination IP address',
      C: 'Layer 4 — it inspects port numbers only',
      D: 'Layer 7 — it inspects the application identity via deep packet inspection or DNS-based classification'
    },
    answer: 'D',
    explanation: 'Application-aware steering requires Layer 7 (Application Layer) intelligence — the SD-WAN edge identifies traffic by application signature, DNS lookup, or SaaS endpoint metadata. Layer 4 (port numbers) is insufficient because modern SaaS apps share common ports (443/TCP for nearly everything). Layer 2/3 has no concept of application identity.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which capabilities are core to SD-WAN application-aware routing?',
    difficulty: 'Hard',
    topic: 'SD-WAN & SASE',
    objective: '1.2',
    options: {
      A: 'Application identification via DPI (deep packet inspection) or SaaS endpoint signatures',
      B: 'Real-time path selection based on per-application SLA thresholds (latency, jitter, loss)',
      C: 'Replacing IPsec encryption with a proprietary key exchange',
      D: 'Eliminating the need for a centralized controller or orchestrator',
      E: 'Operating exclusively at Layer 3 with no Layer 7 awareness'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are the foundational capabilities. SD-WAN edges classify each flow by application (A) and then dynamically select the best path that meets that application’s SLA (B). C is wrong — SD-WAN typically still uses IPsec underneath for site-to-site tunnels. D is wrong — SD-WAN architecturally requires a centralized controller (the orchestrator) to push policy. E directly contradicts A — Layer 7 visibility is the whole point.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },

  // ── 4. JUMBO FRAMES (SAN / DEDICATED NETWORK CONTEXT) ──
  {
    type: 'mcq',
    question: 'Which frame payload size is defined by the standard Ethernet MTU, and which size is typical for jumbo frames?',
    difficulty: 'Foundational',
    topic: 'Ethernet Standards',
    objective: '2.1',
    options: {
      A: 'Standard 1500 bytes; jumbo 9000 bytes',
      B: 'Standard 1500 bytes; jumbo 4500 bytes',
      C: 'Standard 1024 bytes; jumbo 8192 bytes',
      D: 'Standard 9000 bytes; jumbo 9216 bytes'
    },
    answer: 'A',
    explanation: 'Standard Ethernet defines an MTU of 1500 bytes. Jumbo frames extend this to approximately 9000 bytes (often 9000 or 9216, vendor-dependent). The other options are not standard sizes for either format.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'A storage administrator wants to enable jumbo frames to improve iSCSI SAN throughput. What is the MOST IMPORTANT precondition for the change to actually deliver the expected benefit without breaking traffic?',
    difficulty: 'Exam Level',
    topic: 'Data Center Architectures',
    objective: '1.8',
    options: {
      A: 'Every device along the path — initiator NIC, every switch port, and target NIC — must be configured with the same jumbo MTU; mixing standard and jumbo causes fragmentation or drops',
      B: 'The iSCSI target must be reconfigured to use TCP port 860 instead of 3260',
      C: 'The SAN must run at 10 Gbps or higher; jumbo frames have no effect on 1 Gbps links',
      D: 'The SAN must use a dedicated fiber-channel fabric — Ethernet does not support jumbo frames'
    },
    answer: 'A',
    explanation: 'Jumbo-frame deployments require end-to-end consistency. If even one switch port along the path uses standard MTU, frames are dropped (or fragmented if PMTU discovery is allowed). This is why jumbo frames are typically deployed on DEDICATED storage networks or VLANs (e.g., a SAN VLAN) — to guarantee that every device on the path supports the same MTU. B is wrong — iSCSI uses 3260, not 860. C is wrong — jumbo frames help on any speed, though benefits scale with throughput. D is wrong — Ethernet absolutely supports jumbo frames; that is the entire premise.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'Why are jumbo frames typically deployed on a dedicated storage VLAN rather than a general-purpose user network?',
    difficulty: 'Hard',
    topic: 'Data Center Architectures',
    objective: '1.8',
    options: {
      A: 'Jumbo frames are illegal on multi-tenant networks per IEEE 802.3 regulation',
      B: 'Mixing 1500-byte and 9000-byte MTUs on the same path causes drops or PMTU-discovery overhead, so isolation guarantees end-to-end MTU consistency',
      C: 'User devices are physically incapable of transmitting frames larger than 1500 bytes',
      D: 'Jumbo frames consume more CPU than 1500-byte frames, slowing user devices'
    },
    answer: 'B',
    explanation: 'The end-to-end MTU consistency requirement is the architectural reason — putting jumbo frames on a dedicated VLAN or SAN guarantees every device on that segment supports the larger MTU, eliminating black-hole drops or PMTU negotiation overhead. A is fictional. C is wrong — most modern NICs support jumbo frames; they are just not enabled by default. D is the opposite — jumbo frames REDUCE per-byte CPU overhead because each frame carries more payload per interrupt.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },

  // ── 5. BAND STEERING ──
  {
    type: 'mcq',
    question: 'What is the name of the wireless feature that encourages dual-band-capable client devices to associate with the 5 GHz radio rather than the more crowded 2.4 GHz radio?',
    difficulty: 'Foundational',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: { A: 'Roaming assistance', B: 'Band steering', C: 'Channel bonding', D: 'Fast transition (802.11r)' },
    answer: 'B',
    explanation: 'Band steering is the AP/WLC feature that detects dual-band clients and proactively guides them onto 5 GHz (less interference, more channels, higher capacity) by withholding or delaying 2.4 GHz probe responses. Roaming assistance (A) helps clients hand off between APs. Channel bonding (C) combines adjacent channels for wider RF width. 802.11r (D) speeds up roaming key handshakes.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'A WLC with band steering enabled is observed to delay or suppress 2.4 GHz probe responses for clients that have recently been seen on 5 GHz. What is the MOST LIKELY motivation for this behavior?',
    difficulty: 'Exam Level',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'It conserves battery life on the AP radio',
      B: 'It pushes dual-band clients onto the less-congested 5 GHz band, improving overall capacity',
      C: 'It enforces WPA3-only encryption on 2.4 GHz',
      D: 'It blocks IoT devices from joining the network'
    },
    answer: 'B',
    explanation: 'Band steering exists specifically to reduce 2.4 GHz congestion by encouraging dual-band clients to use 5 GHz (which has more non-overlapping channels and less interference). A is irrelevant — band steering does not affect AP power. C is unrelated to band steering. D would be device filtering or MAC blocking, not band steering.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'Band steering can occasionally cause connectivity issues for which type of client?',
    difficulty: 'Hard',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'Single-band 2.4 GHz-only IoT devices that briefly fail to connect because their probe responses are temporarily delayed',
      B: 'Wired desktops connected via Ethernet',
      C: 'Devices using static IP addresses',
      D: 'Devices using MAC randomization'
    },
    answer: 'A',
    explanation: 'A poorly-tuned band-steering policy can mistakenly suppress 2.4 GHz probe responses for legitimately single-band-only clients (older IoT, certain medical/embedded devices), causing slow association or perceived dropouts. Wired clients (B) are unaffected by Wi-Fi behavior. Static IPs (C) and MAC randomization (D) operate at higher layers and are unrelated to RF association.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },

  // ── 6. ANOMALY DETECTION / NOTIFICATION SYSTEM ──
  {
    type: 'mcq',
    question: 'Which detection method flags traffic that deviates from a learned baseline of normal network behavior?',
    difficulty: 'Foundational',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'Signature-based detection',
      B: 'Anomaly-based detection',
      C: 'Heuristic blacklist matching',
      D: 'Static threshold alerting'
    },
    answer: 'B',
    explanation: 'Anomaly-based detection establishes a baseline of normal behavior (traffic volume, protocol distribution, login patterns, etc.) and alerts when actual traffic deviates from that baseline. Signature-based (A) matches against known-bad patterns. Heuristic blacklists (C) check identifiers against known-bad lists. Static thresholds (D) trigger on fixed numbers regardless of normal — not anomaly-based.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which statements correctly describe anomaly-based detection compared to signature-based detection?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'Anomaly-based detection can identify zero-day attacks because no prior signature is required',
      B: 'Anomaly-based detection produces fewer false positives than signature-based',
      C: 'Anomaly-based detection requires a learning/baseline period before becoming effective',
      D: 'Anomaly-based detection cannot detect known malware',
      E: 'Anomaly-based detection only works on encrypted traffic'
    },
    answers: ['A', 'C'],
    explanation: 'A and C correctly describe anomaly-based detection. The trade-off is that it can catch zero-days (A) but requires a baseline to be learned first (C). B is wrong — anomaly-based typically produces MORE false positives than signature-based, since "different from baseline" can mean legitimate change. D is wrong — anomaly-based can detect known malware too if its behavior deviates from baseline. E is fabricated.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'A NIDS is configured with anomaly-based detection. After deployment, the system generates many alerts during the normal monthly billing run. What is the MOST LIKELY cause and the appropriate response?',
    difficulty: 'Hard',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'The NIDS is malfunctioning — replace the appliance',
      B: 'The baseline did not include the billing run\'s legitimate traffic spike — extend the learning period or whitelist the pattern',
      C: 'The billing run is using outdated TLS — upgrade the application',
      D: 'The signatures are out of date — apply the latest signature update'
    },
    answer: 'B',
    explanation: 'Anomaly-based detection learns a baseline of normal behavior; if the baseline period missed a recurring legitimate spike (like a monthly billing run), that spike registers as an anomaly the first time it happens. The fix is to extend the learning period to cover full billing cycles or whitelist the known pattern. A is overreaction. C is unrelated. D applies to signature-based, not anomaly-based, detection.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },

  // ── 7. DHCP RESERVATION ──
  {
    type: 'mcq',
    question: 'A network administrator wants a specific networked printer to ALWAYS receive the same IP address from DHCP, without statically configuring the IP on the printer itself. Which DHCP feature implements this?',
    difficulty: 'Foundational',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'DHCP exclusion range',
      B: 'DHCP relay agent',
      C: 'DHCP reservation',
      D: 'DHCP lease renewal'
    },
    answer: 'C',
    explanation: 'A DHCP reservation ties a specific MAC address to a specific IP within the DHCP scope, so the device receives the same lease each time without manual static configuration. Exclusion ranges (A) prevent the server from handing out specific IPs to anyone. Relay agents (B) forward DHCP requests across subnets. Lease renewal (D) is the lifecycle process for any DHCP client.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'Which information is REQUIRED to create a DHCP reservation?',
    difficulty: 'Exam Level',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'The hostname and the operating system of the client',
      B: 'The MAC address of the client and the desired IP within the scope',
      C: 'The default gateway and DNS suffix',
      D: 'The vendor class identifier and the DHCP option 60 string'
    },
    answer: 'B',
    explanation: 'A DHCP reservation requires the client identifier (typically MAC address) and the desired IP address within the DHCP scope. The server then ensures that MAC always receives that IP. A is unnecessary — hostname/OS are not required. C describes options handed out, not reservation criteria. D is a more advanced PXE/vendor-class scenario, not a basic reservation.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'What is the KEY operational difference between a DHCP reservation and a static IP assignment configured locally on the device?',
    difficulty: 'Hard',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'A reservation is managed centrally on the DHCP server, so subnet/gateway/DNS changes apply automatically; a local static config must be touched on each device',
      B: 'A static IP can be any address; a reservation must use a private RFC 1918 range',
      C: 'A reservation requires the device to support DHCPv6; static does not',
      D: 'A static IP renews periodically while a reservation is permanent'
    },
    answer: 'A',
    explanation: 'The operational benefit of reservations is centralized management — when network parameters change (default gateway, DNS server, subnet mask), updating the DHCP scope propagates automatically to every reserved client at next renewal. A locally-configured static IP requires touching every device manually. B is fabricated. C is wrong — both reservation and static work for v4 and v6. D is reversed — DHCP leases (including reservations) renew; static configs do not.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },

  // ── 8. DHCP OPTIONS ──
  {
    type: 'mcq',
    question: 'Which DHCP option is used to inform clients of the address of a TFTP boot server (commonly used for VoIP phone provisioning and PXE boot)?',
    difficulty: 'Foundational',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: { A: 'Option 3 (Router)', B: 'Option 6 (DNS server)', C: 'Option 66 (TFTP server name)', D: 'Option 51 (Lease time)' },
    answer: 'C',
    explanation: 'Option 66 supplies the TFTP server name/address that clients use for boot or provisioning files. Option 3 (A) provides the default gateway. Option 6 (B) provides DNS server addresses. Option 51 (D) sets the lease duration.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which DHCP options would you configure on a scope to prepare it for VoIP phone auto-provisioning?',
    difficulty: 'Exam Level',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'Option 66 — TFTP server name (where the phone fetches config)',
      B: 'Option 67 — Boot file name (the specific file to download)',
      C: 'Option 80 — Web HTTP server',
      D: 'Option 25 — Path MTU discovery',
      E: 'Option 99 — User identification token'
    },
    answers: ['A', 'B'],
    explanation: 'Options 66 and 67 are the canonical pair for boot/provisioning workflows: option 66 tells the client WHERE to fetch (TFTP server), option 67 tells it WHAT to fetch (boot file name). C–E are not standard DHCP options used for VoIP provisioning.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'A network engineer is configuring DHCP options. Which mapping of option number to its function is CORRECT?',
    difficulty: 'Hard',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'Option 3 = DNS server, Option 6 = Default gateway',
      B: 'Option 3 = Default gateway, Option 6 = DNS server',
      C: 'Option 3 = NTP server, Option 6 = WINS server',
      D: 'Option 3 = Subnet mask, Option 6 = Lease time'
    },
    answer: 'B',
    explanation: 'Option 3 = Router (default gateway), Option 6 = Domain Name Server (DNS). A reverses the two — a common trap. C maps both to wrong functions (NTP is option 42; WINS is option 44). D conflates with subnet mask (option 1) and lease time (option 51).',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },

  // ── 9. SEPARATION OF DUTIES ──
  {
    type: 'mcq',
    question: 'Which security principle requires that no single individual can perform a critical task end-to-end without input or approval from another person?',
    difficulty: 'Foundational',
    topic: 'Protecting Networks',
    objective: '4.1',
    options: {
      A: 'Least privilege',
      B: 'Defense in depth',
      C: 'Separation of duties',
      D: 'Implicit deny'
    },
    answer: 'C',
    explanation: 'Separation of duties divides a critical task across multiple people so that no single individual can complete it alone, reducing fraud and error risk. Least privilege (A) is about minimum permissions per person, not splitting tasks across people. Defense in depth (B) is about layered controls. Implicit deny (D) is a firewall rule-set concept.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'A finance department requires that the person who APPROVES a wire transfer cannot also be the person who INITIATES it. Which security principle is this implementing?',
    difficulty: 'Exam Level',
    topic: 'Protecting Networks',
    objective: '4.1',
    options: {
      A: 'Separation of duties — splitting approval and initiation across two roles',
      B: 'Least privilege — limiting each role to only required permissions',
      C: 'Mandatory access control — labels enforce who can approve',
      D: 'Need to know — restricting visibility of the transfer details'
    },
    answer: 'A',
    explanation: 'Separation of duties is precisely the principle of splitting initiation and approval into two distinct roles to prevent a single person from completing a high-risk task alone. Least privilege (B) is related but addresses individual permissions, not task partitioning. MAC (C) governs access to labeled data. Need-to-know (D) restricts visibility, not workflow steps.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which controls implement separation of duties in a typical IT environment?',
    difficulty: 'Hard',
    topic: 'Protecting Networks',
    objective: '4.1',
    options: {
      A: 'Requiring change-management approvals from a different person than the one who proposed the change',
      B: 'Splitting password vault access from system administration access into separate roles',
      C: 'Encrypting backup archives at rest with AES-256',
      D: 'Installing a stateful firewall at the network edge',
      E: 'Configuring account lockout after 5 failed logins'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are workflow controls that split a sensitive task between two roles — change approval (A) and credentials management (B) — preventing a single individual from completing the entire chain. C, D, and E are valuable security controls but address different principles (data confidentiality, perimeter defense, and brute-force protection respectively), not separation of duties.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },

  // ── 10. NAC NON-PERSISTENT AGENT ──
  {
    type: 'mcq',
    question: 'In a NAC (Network Access Control) deployment, what distinguishes a NON-PERSISTENT agent from a persistent agent?',
    difficulty: 'Exam Level',
    topic: 'Protecting Networks',
    objective: '4.3',
    options: {
      A: 'A non-persistent agent is downloaded for the session, runs the posture check, then is removed; a persistent agent is installed permanently',
      B: 'A non-persistent agent only checks for malware; a persistent agent also checks patches',
      C: 'A non-persistent agent uses certificates; a persistent agent uses passwords',
      D: 'A non-persistent agent runs only on Windows; a persistent agent runs on any OS'
    },
    answer: 'A',
    explanation: 'A non-persistent (sometimes "dissolvable") NAC agent is fetched at connection time (often via a captive portal), performs the posture/health check, then exits — leaving nothing behind on the host. A persistent agent is installed as a permanent service that monitors continuously and can re-evaluate posture without user action. B–D are fabricated distinctions.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'A consultancy firm allows visiting contractors\' personal laptops to connect to the guest VLAN after passing a NAC posture check. The IT team prefers not to install permanent software on the contractor devices. Which NAC agent type best fits this scenario?',
    difficulty: 'Exam Level',
    topic: 'Protecting Networks',
    objective: '4.3',
    options: {
      A: 'Non-persistent (dissolvable) agent — downloads, runs the check, then removes itself',
      B: 'Persistent agent — installed as a permanent service for ongoing posture monitoring',
      C: 'Agentless NAC — relies entirely on network-side traffic inspection without any client-side check',
      D: 'Hardware token — issued to each contractor for the visit'
    },
    answer: 'A',
    explanation: 'A non-persistent agent is purpose-built for guest/contractor scenarios — it is fetched once, performs the posture check, then exits and can be removed without trace. A persistent agent (B) would require installation, which the IT team explicitly wants to avoid. Agentless (C) doesn\'t do client-side posture (no patch/AV/firewall checks). D is unrelated to NAC posture.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which are accurate trade-offs of using a non-persistent NAC agent compared to a persistent agent?',
    difficulty: 'Hard',
    topic: 'Protecting Networks',
    objective: '4.3',
    options: {
      A: 'Non-persistent leaves no permanent software footprint on the client',
      B: 'Non-persistent only checks posture once at connection time; it cannot continuously monitor compliance during the session',
      C: 'Non-persistent requires the user to provide root/admin credentials every time',
      D: 'Non-persistent provides stronger encryption than persistent agents',
      E: 'Non-persistent is mandated by 802.1X for all wireless authentication'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are the correct trade-offs. The benefit (A) is no permanent footprint — ideal for guests/contractors. The cost (B) is one-time-only posture: if the host\'s compliance changes mid-session (AV gets disabled, an exploit lands), the non-persistent agent is gone and cannot detect it. C is fabricated. D is irrelevant — encryption strength is independent. E is wrong — 802.1X does not mandate any specific NAC agent type.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },

  // ── 11. WAVELENGTH MISMATCH ──
  {
    type: 'mcq',
    question: 'A new fiber link between two switches will not come up. Both ends use SFP+ transceivers, but one end is a 1310 nm (single-mode) module and the other is an 850 nm (multi-mode) module. What is the MOST LIKELY cause?',
    difficulty: 'Exam Level',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'Wavelength mismatch — the transceivers operate at different wavelengths, so the receiver cannot detect the transmitted optical signal',
      B: 'Polarity reversal — the TX and RX strands are crossed',
      C: 'Excessive cable length — the signal is attenuated below the receiver sensitivity',
      D: 'Auto-negotiation mismatch — one switch is forcing 10 Gbps while the other is set to auto'
    },
    answer: 'A',
    explanation: 'Optical transceivers must use matching wavelengths and fiber types on both ends. A 1310 nm single-mode module cannot communicate with an 850 nm multi-mode module — different wavelengths, different fiber characteristics. The receiver cannot recover the signal. B (polarity) and C (attenuation) are common fiber problems but secondary. D applies to copper auto-negotiation.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'mcq',
    question: 'A technician swaps an LX SFP (1310 nm, single-mode) for an SX SFP (850 nm, multi-mode) on one end of a fiber run while the other end remains LX. What outcome is expected?',
    difficulty: 'Hard',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'The link will negotiate down to a lower speed but stay up',
      B: 'The link will not establish — the transceivers operate at different wavelengths',
      C: 'The link will work but at half-duplex',
      D: 'The link will work but with intermittent CRC errors'
    },
    answer: 'B',
    explanation: 'Mismatched optical transceivers on a fiber run will not establish a link — the receiver is tuned for a specific wavelength, and the transmitter\'s mismatched wavelength will not be detected. The transceiver pair must match in wavelength, fiber type, and connector type for the link to come up. A, C, and D describe behaviors that occur on copper duplex/speed mismatches, not optical wavelength mismatches.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which conditions must match between two fiber-optic transceivers for a link to come up?',
    difficulty: 'Hard',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'Wavelength (e.g., both 1310 nm or both 850 nm)',
      B: 'Fiber type (both single-mode or both multi-mode)',
      C: 'Manufacturer brand (e.g., both Cisco)',
      D: 'Connector color (both LC blue or both LC green)',
      E: 'Power supply voltage rating'
    },
    answers: ['A', 'B'],
    explanation: 'Wavelength (A) and fiber type (B) are the technical requirements for an optical link to come up. C is wrong — vendor interop is generally fine for standards-compliant SFPs (subject to vendor "lock" on some platforms, but not a physical-layer constraint). D is cosmetic, not functional. E is unrelated to optical signaling.',
    source: 'curated',
    addedVersion: '4.85.19',
    addedDate: '2026-05-02'
  },
  // ───── Phase 3 Cycle 2 — 2026-05-03 (Jason Dion practice test #2 gap recalibration) ─────
  // 12 user-reported gap topics × 3 exemplars each = 36 new exemplars.
  // All content original. Sourced from public N10-009 blueprint + RFC/IEEE/standards
  // references. NO copying or paraphrasing of paid-bank content per
  // reference_jason_dion_method.md legal boundary.
  // Gap topics: RFC 1918 Private Address Ranges, MDF (vs IDF), Hot/Cold Aisle
  // Portside Exhaust/Intake, MTRJ fiber connector, DAC Cable, Imaging a switch
  // (IOS/firmware), DoH (DNS over HTTPS), PTP (IEEE 1588), Out-of-Band
  // Management, OTDR, Toner Probe, LLDP.

  // ── 1. RFC 1918 PRIVATE ADDRESS RANGES ──
  {
    type: 'mcq',
    question: 'Which of the following is a valid RFC 1918 private IPv4 address range?',
    difficulty: 'Foundational',
    topic: 'NAT & IP Services',
    objective: '1.4',
    options: {
      A: '169.254.0.0/16',
      B: '172.16.0.0/12',
      C: '224.0.0.0/4',
      D: '127.0.0.0/8'
    },
    answer: 'B',
    explanation: 'RFC 1918 defines three private IPv4 ranges: 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16. 169.254.0.0/16 (A) is APIPA / link-local. 224.0.0.0/4 (C) is multicast. 127.0.0.0/8 (D) is loopback.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A network engineer is designing IP addressing for a small company and needs to choose a private range that supports up to 65,000 hosts on a single contiguous /16 subnet. Which RFC 1918 range BEST fits this requirement?',
    difficulty: 'Exam Level',
    topic: 'NAT & IP Services',
    objective: '1.4',
    options: {
      A: '10.0.0.0/8 — flat /16 carved out (e.g., 10.50.0.0/16)',
      B: '172.16.0.0/12 — flat /16 carved out (e.g., 172.20.0.0/16)',
      C: '192.168.0.0/16 — use the entire allocation as one /16',
      D: 'Any of A, B, or C — all RFC 1918 ranges support /16 allocations'
    },
    answer: 'D',
    explanation: 'All three RFC 1918 ranges can supply a /16 (~65k hosts). 10.0.0.0/8 has 256 possible /16s, 172.16.0.0/12 has 16 possible /16s (172.16-172.31), and 192.168.0.0/16 IS a /16. Any of them works for this requirement; the choice usually depends on the org\'s addressing scheme and avoiding overlap with VPN peers. Convention often uses 10/8 for medium-large enterprises, 192.168/16 for SOHO, and 172.16/12 for the in-between.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which addresses fall within RFC 1918 private address space?',
    difficulty: 'Hard',
    topic: 'NAT & IP Services',
    objective: '1.4',
    options: {
      A: '10.255.255.254',
      B: '172.32.0.5',
      C: '192.168.100.1',
      D: '169.254.10.20',
      E: '198.18.0.1'
    },
    answers: ['A', 'C'],
    explanation: 'A (10.255.255.254 — within 10.0.0.0/8) and C (192.168.100.1 — within 192.168.0.0/16) are RFC 1918 private. B (172.32.0.5) is just OUTSIDE the 172.16.0.0/12 range, which ends at 172.31.255.255 — common trap. D (169.254.x.x) is APIPA link-local. E (198.18.0.0/15) is RFC 2544 benchmark testing space, not RFC 1918.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },

  // ── 2. MDF (MAIN DISTRIBUTION FRAME) ──
  {
    type: 'mcq',
    question: 'In a structured cabling design, what is the role of the Main Distribution Frame (MDF)?',
    difficulty: 'Foundational',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: {
      A: 'It is the central termination point for the building\'s telecom feed and the source of all backbone cabling to floor or zone wiring closets',
      B: 'It is the wall plate where each user\'s desk connects to the network',
      C: 'It is the patch cable between a switch and a server',
      D: 'It is the optical-to-electrical conversion device used at the building entrance'
    },
    answer: 'A',
    explanation: 'The MDF is the primary cross-connect for a building — where the carrier service enters and where backbone cables run out to IDFs (Intermediate Distribution Frames) on each floor or wing. B describes a wall plate / work-area outlet. C is a patch cord. D describes a media converter / optical network terminal.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A multi-floor office building has one MDF in the basement and an IDF on each of 8 floors. Which type of cable typically runs between the MDF and each IDF?',
    difficulty: 'Exam Level',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: {
      A: 'Backbone (vertical/riser) cabling — usually multi-strand fiber for distance and bandwidth',
      B: 'Horizontal cabling — Cat 6 from each user wall plate',
      C: 'Crossover Ethernet — required between distribution frames',
      D: 'Coaxial RG-6 — standard for inter-floor links'
    },
    answer: 'A',
    explanation: 'Backbone cabling (also called vertical or riser cabling in multi-floor buildings) connects the MDF to each IDF. It is typically multi-strand fiber (single-mode or multi-mode) because of distance, bandwidth, and EMI immunity in the riser shaft. Horizontal cabling (B) runs WITHIN a floor from the IDF to user wall plates — usually Cat 6 — but does not link MDF to IDFs. C (crossover) is irrelevant — modern switches auto-MDIX. D (coax) is for video/cable TV, not enterprise data backbones.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which best describes the difference between an MDF and an IDF?',
    difficulty: 'Hard',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: {
      A: 'MDF is the central termination for the building (carrier feed + backbone source); IDF is a per-floor or per-zone distribution point that aggregates horizontal cabling from work-area outlets back to the MDF',
      B: 'MDF is for fiber, IDF is for copper',
      C: 'MDF is for management traffic, IDF is for user data',
      D: 'MDF is in the data center, IDF is in the wiring closet — they serve different network tiers'
    },
    answer: 'A',
    explanation: 'A correctly captures the structural relationship — MDF is the building-level "main" termination point (typically one per building, where the carrier feed enters), and IDFs are downstream distribution frames per-floor or per-zone that handle horizontal cabling. B is wrong — both MDF and IDF can have copper and fiber. C confuses the topic with out-of-band management. D is partially true (MDF is often in the data center) but doesn\'t capture the structural relationship.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },

  // ── 3. PORTSIDE EXHAUST / INTAKE (HOT-AISLE / COLD-AISLE) ──
  {
    type: 'mcq',
    question: 'In a data center using hot-aisle / cold-aisle containment, what should the PORTSIDE INTAKE configuration of a top-of-rack switch ensure?',
    difficulty: 'Exam Level',
    topic: 'Data Centres',
    objective: '3.3',
    options: {
      A: 'The switch ports face the cold aisle so the switch draws cool air from the front and exhausts hot air to the hot aisle',
      B: 'The switch ports face the hot aisle for easier maintenance access',
      C: 'The switch ports point upward so heat naturally rises away from the patch panel',
      D: 'The switch ports face whichever direction has shorter cable runs — airflow is irrelevant for switches'
    },
    answer: 'A',
    explanation: 'Portside intake (port-side intake / PSI) means the switch draws cool air through the side where its physical ports are — the front of the rack, facing the cold aisle. Hot air exhausts out the rear into the hot aisle. This aligns the switch\'s thermal flow with the data center\'s containment design so cabling and cooling work together. The opposite (port-side exhaust / PSE) is used in legacy or rear-cabling designs but breaks containment if mixed with PSI in the same rack.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A data center technician installs a new switch in a hot-aisle / cold-aisle deployed rack. The switch is rated PSE (port-side exhaust) but the rack is a port-side intake (PSI) design. What is the MOST LIKELY consequence?',
    difficulty: 'Hard',
    topic: 'Data Centres',
    objective: '3.3',
    options: {
      A: 'The switch will draw hot exhaust air back into its intake, causing thermal stress and potential thermal shutdown',
      B: 'The switch will run more efficiently because hot air rises naturally',
      C: 'The cabling will be shorter because ports face the rear',
      D: 'There is no consequence — switches generate negligible heat'
    },
    answer: 'A',
    explanation: 'A PSE (port-side exhaust) switch in a PSI rack causes a thermal short-circuit — the switch\'s intake (which faces the rear in PSE) is now in the HOT aisle, drawing already-heated exhaust air. This violates the cold-aisle/hot-aisle separation, raises switch operating temperatures, and can trigger thermal protections or premature hardware failure. The fix is to either swap to a PSI-variant switch (most modern switches offer either airflow option as a SKU choice) or use baffles/blanking panels. B/C/D are wrong — switches generate significant heat in dense racks, and airflow direction matters.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'When ordering switches for a data center using cold-aisle containment with cabling at the FRONT of the rack, which airflow direction should the switches use?',
    difficulty: 'Exam Level',
    topic: 'Data Centres',
    objective: '3.3',
    options: {
      A: 'Port-side intake (PSI) — air enters through the port-side (front) and exits the rear',
      B: 'Port-side exhaust (PSE) — air enters the rear and exits through the port-side',
      C: 'Either direction works — modern switches auto-detect airflow needs',
      D: 'No airflow requirement — front-cabled switches are passively cooled'
    },
    answer: 'A',
    explanation: 'When ports face the cold aisle (front), you want PSI so the switch breathes cold air through the front (port side) and exhausts hot air out the rear into the hot aisle. PSE in this scenario would cause the switch to inhale hot exhaust air — a thermal short-circuit. Modern switches do NOT auto-detect airflow direction; the SKU/part number determines fan direction at order time.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },

  // ── 4. MTRJ FIBER CONNECTOR ──
  {
    type: 'mcq',
    question: 'Which fiber-optic connector type uses a single small-form-factor housing to terminate BOTH transmit and receive fibers in one connector?',
    difficulty: 'Exam Level',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: {
      A: 'MTRJ (Mechanical Transfer Registered Jack)',
      B: 'LC (Lucent Connector) — single-strand only',
      C: 'SC (Subscriber Connector) — single-strand only',
      D: 'ST (Straight Tip) — single-strand only'
    },
    answer: 'A',
    explanation: 'The MTRJ is a duplex fiber connector — two fibers (TX/RX) terminate in a single small-form-factor housing resembling an RJ45. LC, SC, and ST are typically simplex connectors: each terminates a single fiber, and a duplex pair uses two connectors clipped together. (Note: LC duplex clips exist but each LC ferrule still terminates one fiber.) MTRJ\'s key trait is "two fibers, one connector body."',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A network technician is looking at a fiber patch cable with a connector that has a small rectangular plastic housing about the size of an RJ45, with two fiber strands emerging from a single ferrule. Which connector type is this?',
    difficulty: 'Exam Level',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: { A: 'SC', B: 'ST', C: 'MTRJ', D: 'FC' },
    answer: 'C',
    explanation: 'MTRJ has a distinctive small rectangular housing similar in size to an RJ45 jack, with two fiber strands in a single ferrule. SC has a square push-pull body, one fiber per connector. ST has a round bayonet-mount body. FC has a screw-on threaded coupling — used in test equipment.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which statements about the MTRJ fiber connector are correct?',
    difficulty: 'Hard',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: {
      A: 'It is a small-form-factor (SFF) connector designed to save panel space compared to ST or SC',
      B: 'It terminates two fibers (TX/RX) in a single connector body',
      C: 'It uses a 2.5mm ferrule like SC and ST',
      D: 'It is the most common connector on modern SFP/SFP+ transceivers',
      E: 'It is used exclusively for single-mode fiber'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are correct. MTRJ is a small-form-factor connector (A) and is duplex by design — terminates both TX and RX in one body (B). C is wrong — MTRJ uses a 1.25mm ferrule like LC, not the larger 2.5mm of ST/SC. D is wrong — most modern SFP/SFP+ transceivers use LC duplex, not MTRJ. E is wrong — MTRJ supports both single-mode and multi-mode variants.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },

  // ── 5. DAC CABLE (DIRECT ATTACH COPPER) ──
  {
    type: 'mcq',
    question: 'In a data center, what is a Direct Attach Copper (DAC) cable typically used for?',
    difficulty: 'Foundational',
    topic: 'Data Center Architectures',
    objective: '1.8',
    options: {
      A: 'Short-range high-speed (10/25/100 Gbps) connections between switches and servers within the same rack or adjacent racks',
      B: 'Long-distance (50+ km) carrier links between data centers',
      C: 'Outdoor underground burial between buildings',
      D: 'Fiber-to-the-home subscriber drops'
    },
    answer: 'A',
    explanation: 'DAC cables are short, fixed-length copper twinaxial cables with SFP/SFP+/QSFP transceivers permanently attached at each end. They\'re designed for short-range (typically 1m–7m, sometimes up to 10m) high-speed connections between switches and servers (top-of-rack design) or switch-to-switch in adjacent racks. They\'re cheaper and lower-latency than fiber for short runs. B/C are fiber territory. D is service-provider PON / fiber.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which is a key advantage of using a DAC cable over a separate transceiver-and-fiber-patch-cable combination at distances under 5 meters?',
    difficulty: 'Exam Level',
    topic: 'Data Center Architectures',
    objective: '1.8',
    options: {
      A: 'Lower cost, lower power consumption, and lower latency than transceivers + fiber',
      B: 'Longer reach — DAC supports kilometres while transceivers + fiber only support 100m',
      C: 'Immune to electromagnetic interference (EMI) — DAC is shielded copper twinaxial',
      D: 'Both A and C — cost, power, latency advantages PLUS EMI immunity'
    },
    answer: 'A',
    explanation: 'DAC\'s main advantages at short range are cost (no separate transceivers), power (passive DAC consumes far less than active optics), and latency (no electrical-to-optical conversion). B is wrong — DAC is SHORTER reach than fiber (typically ≤7m passive, ≤15m active). C is partly true (DAC is shielded twinax) but DAC is still copper and not immune to EMI like fiber is. D combines the partial truth of C, so still wrong.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'What is the practical reach limit of a passive DAC cable in a typical data center deployment?',
    difficulty: 'Hard',
    topic: 'Data Center Architectures',
    objective: '1.8',
    options: {
      A: 'About 7 meters — beyond that, signal integrity drops and active DAC or fiber is required',
      B: 'About 100 meters — same as Cat 6 Ethernet',
      C: 'About 300 meters — same as multi-mode OM3 fiber',
      D: 'About 10 kilometres — same as single-mode fiber'
    },
    answer: 'A',
    explanation: 'Passive DAC cables are typically rated up to ~7m (some vendors push to 10m). Beyond that, active DAC (with embedded signal conditioners) extends to ~15m, but at higher cost approaching active optical cable (AOC) or transceiver+fiber pricing. DAC is intentionally a SHORT-range solution — the win is cost/power/latency at top-of-rack and adjacent-rack distances. B/C/D are reaches associated with copper Ethernet, MMF, and SMF respectively.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },

  // ── 6. IMAGING A SWITCH (FIRMWARE / IOS IMAGE) ──
  {
    type: 'mcq',
    question: 'What does it mean to "image" a network switch?',
    difficulty: 'Foundational',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Install or upgrade the switch\'s operating-system image (firmware/IOS) and optionally apply a baseline configuration',
      B: 'Take a screenshot of the switch\'s console output for documentation',
      C: 'Generate a topology diagram showing every port',
      D: 'Photograph the switch hardware for inventory tracking'
    },
    answer: 'A',
    explanation: 'In networking ops, "imaging a switch" refers to loading or replacing the switch\'s OS image (the firmware that runs the switch — Cisco IOS, NX-OS, Junos, etc.) and applying a known-good baseline configuration. Common reasons: zero-touch provisioning, recovery from a bricked switch, large-scale fleet upgrade. B/C/D are unrelated visual/documentation interpretations.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A network engineer needs to upgrade the operating system image on 50 identical access switches across a campus. Which protocol is MOST commonly used to transfer the new image file from a central server to each switch?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: { A: 'TFTP (Trivial File Transfer Protocol)', B: 'HTTP', C: 'SMTP', D: 'POP3' },
    answer: 'A',
    explanation: 'TFTP is the long-standing standard for transferring firmware/IOS images to network devices because it\'s simple, lightweight, and built into virtually every switch/router\'s bootloader. SCP and FTP are also used (SCP for security), but TFTP is the most universally supported. HTTP can be used for newer "Smart Install" / ZTP flows but TFTP remains the canonical choice. SMTP/POP3 are for email and have no role in firmware transfer.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A switch is being commissioned via zero-touch provisioning (ZTP). Which sequence describes the typical "imaging" workflow?',
    difficulty: 'Hard',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Switch boots → DHCP request → DHCP reply provides TFTP server (option 66) and boot file (option 67) → switch downloads IOS image and config from TFTP → switch reboots into new image with config applied',
      B: 'Switch boots → manual console connection → engineer runs setup wizard → image is uploaded over USB',
      C: 'Switch boots → connects to cloud controller via Bluetooth → image is pushed wirelessly',
      D: 'Switch boots → admin SSHs in → image is copied via SCP from a workstation'
    },
    answer: 'A',
    explanation: 'ZTP relies on DHCP options 66 (TFTP server name) and 67 (boot file name) to tell the switch where to fetch its image and config. The switch boots, sends a DHCP request, receives the TFTP target, downloads the new IOS image and config files, then reboots into the imaged state — all without manual intervention. B describes manual provisioning. C is fictional. D is fine for one-off updates but is not "imaging" via ZTP.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },

  // ── 7. DOH (DNS OVER HTTPS) ──
  {
    type: 'mcq',
    question: 'What is the primary purpose of DNS over HTTPS (DoH)?',
    difficulty: 'Foundational',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'To encrypt DNS queries between client and resolver, preventing eavesdropping and on-path tampering',
      B: 'To accelerate DNS lookups by caching responses at the HTTPS proxy',
      C: 'To replace HTTPS web traffic with DNS-based content delivery',
      D: 'To allow DNS resolution over a TLS VPN tunnel only'
    },
    answer: 'A',
    explanation: 'DoH (RFC 8484) wraps DNS queries in HTTPS so they\'re encrypted in transit and indistinguishable from regular web traffic. Goals: prevent ISPs/intermediaries from snooping or tampering with DNS lookups, prevent on-path injection of fake DNS responses, and resist censorship. B is unrelated to caching. C is fabricated. D conflates DoH with VPN — DoH does not require a VPN.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which port and protocol does DoH (DNS over HTTPS) use, and how does that complicate enterprise DNS filtering?',
    difficulty: 'Exam Level',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'TCP/443 (HTTPS) — making DoH traffic indistinguishable from regular web traffic, so blocking traditional DNS port 53 no longer blocks all DNS lookups',
      B: 'UDP/53 — same as plain DNS, just encrypted',
      C: 'TCP/853 — the dedicated DNS-over-TLS port',
      D: 'UDP/443 — QUIC-based DNS only'
    },
    answer: 'A',
    explanation: 'DoH uses TCP/443 — the same port as ordinary HTTPS web traffic. Enterprises that traditionally filter DNS by blocking UDP/53 cannot easily block DoH without also breaking the web. This is a real challenge for content filtering, parental controls, and threat detection that relied on inspecting/blocking DNS. B is plain DNS. C (TCP/853) is DoT — DNS over TLS, a related but separate protocol. D is fabricated.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which statements correctly compare DoH (DNS over HTTPS) and DoT (DNS over TLS)?',
    difficulty: 'Hard',
    topic: 'Network Naming (DNS & DHCP)',
    objective: '1.6',
    options: {
      A: 'DoH uses TCP/443 (shared with HTTPS); DoT uses a dedicated TCP/853',
      B: 'Both encrypt DNS queries in transit using TLS',
      C: 'DoH always provides better privacy than DoT under all circumstances',
      D: 'DoT requires the user to install a VPN; DoH does not',
      E: 'Both are deprecated by RFC 8915 in favor of plain DNS'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are correct. The PORT is the key differentiator (A) — DoH on TCP/443 (shared with HTTPS, harder for networks to block), DoT on TCP/853 (dedicated, easier to identify and selectively block). Both encrypt queries with TLS (B). C is opinion-based and not always true — DoT is arguably easier for enterprises to monitor since it has a dedicated port. D is false — neither requires a VPN. E is fabricated; both are active standards.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },

  // ── 8. PTP (PRECISION TIME PROTOCOL) ──
  {
    type: 'mcq',
    question: 'What is the primary advantage of PTP (Precision Time Protocol, IEEE 1588) over NTP (Network Time Protocol)?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Sub-microsecond synchronization accuracy, suitable for industrial automation, financial trading, and 5G base-station coordination',
      B: 'Lower bandwidth — NTP uses 1500 byte frames while PTP uses jumbo frames',
      C: 'Cross-internet reach — PTP works across the public internet while NTP requires LAN',
      D: 'Standard built into every modern OS — no special hardware required'
    },
    answer: 'A',
    explanation: 'PTP provides sub-microsecond accuracy via hardware timestamping at network adapters and intermediate switches, suitable for industrial automation, HFT financial trading, telecom synchronization, and 5G coordination. NTP achieves millisecond accuracy at best — fine for general-purpose clock sync but insufficient for these use cases. B is wrong — PTP uses regular Ethernet frames. C is reversed — NTP works fine across the internet; PTP is typically LAN-bounded for accuracy. D is partially wrong — PTP requires hardware timestamping support in NICs and switches for full benefit.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A 5G mobile carrier is deploying base stations that require synchronization to within 1 microsecond of each other for handover coordination. Which time protocol is REQUIRED for this accuracy?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'PTP (Precision Time Protocol, IEEE 1588) — sub-microsecond accuracy via hardware timestamping',
      B: 'NTP (Network Time Protocol) — millisecond-level accuracy is sufficient',
      C: 'NTS (Network Time Security) — secure NTP variant, same accuracy as NTP',
      D: 'GPS — but only if every base station has a clear sky view'
    },
    answer: 'A',
    explanation: 'PTP is the only standard listed that delivers sub-microsecond accuracy (typically tens to hundreds of nanoseconds with proper hardware support). NTP is millisecond-level — orders of magnitude too coarse. NTS (RFC 8915) adds security to NTP but doesn\'t improve accuracy. GPS technically can deliver nanosecond accuracy but requires sky view, antenna, and hardware at every base station — typically used as a PTP grandmaster reference rather than as the per-base-station primary.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which OSI layer does PTP (IEEE 1588v2) primarily operate at, and what does this enable?',
    difficulty: 'Hard',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Layer 2 (with Layer 3 variant available) — enables hardware timestamping at the NIC, bypassing OS jitter and achieving sub-microsecond accuracy',
      B: 'Layer 4 only — uses TCP for reliability over the public internet',
      C: 'Layer 7 only — application-level synchronization without network involvement',
      D: 'Layer 1 only — physical clock distribution like SONET'
    },
    answer: 'A',
    explanation: 'PTP can run at Layer 2 (multicast) or Layer 3 (UDP), and the Layer 2 variant in particular allows hardware timestamping at the NIC and at PTP-aware switches (transparent clocks / boundary clocks), which is what eliminates OS-scheduling jitter and achieves sub-microsecond accuracy. B is wrong (PTP uses UDP not TCP, and L2 variant uses no IP at all). C/D are incorrect layer associations.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },

  // ── 9. OUT-OF-BAND MANAGEMENT ──
  {
    type: 'mcq',
    question: 'Which best describes Out-of-Band (OOB) management of network equipment?',
    difficulty: 'Foundational',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Managing devices over a separate dedicated network (or console connection) that is independent of the production data network',
      B: 'Managing devices remotely from outside the country',
      C: 'Managing devices using only encrypted protocols like SSH or HTTPS',
      D: 'Managing devices with low priority QoS marking so user traffic gets preference'
    },
    answer: 'A',
    explanation: 'Out-of-Band management uses a SEPARATE management network — distinct cabling, switches, sometimes a dedicated VLAN — or direct console access, so admins can reach a device even when the production data network is down. The opposite is in-band management, which shares the production network. B is unrelated to the OOB concept. C describes encryption, not OOB. D describes QoS, not OOB.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A network engineer needs to recover a switch that is unreachable due to a broken VLAN trunk that took down the production network. Which OOB option allows them to fix the switch?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Connect to the switch\'s console port via a serial cable from a laptop, or reach a network-attached console server / KVM that has serial connections to all devices',
      B: 'Wait for the production network to recover, then SSH in',
      C: 'Reboot the switch by pulling power and hope it boots into a working configuration',
      D: 'Send a Wake-on-LAN packet from the management subnet'
    },
    answer: 'A',
    explanation: 'Console access via serial cable (or remotely via a console server / KVM) is the canonical OOB recovery path — it works even when the data plane is completely broken, because it doesn\'t depend on the production network. B doesn\'t recover the switch, it just waits. C risks losing unsaved config and doesn\'t guarantee recovery. D requires the management subnet to be reachable, which is the same problem we\'re trying to solve.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which are valid Out-of-Band management mechanisms?',
    difficulty: 'Hard',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Direct console (RJ45/RS-232 serial) from an admin laptop',
      B: 'Dedicated management VLAN reachable via a separate management switch and dedicated NIC on each device',
      C: 'SSH over the production VLAN that user traffic also uses',
      D: 'Telnet over the user data network',
      E: 'Web GUI over the same uplink the switch uses for user traffic'
    },
    answers: ['A', 'B'],
    explanation: 'A (console serial) and B (dedicated management VLAN with separate management NIC) are both true out-of-band — they work independently of the production data network. C, D, and E are all in-band — they share the production network and fail when production fails.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },

  // ── 10. OTDR (OPTICAL TIME-DOMAIN REFLECTOMETER) ──
  {
    type: 'mcq',
    question: 'A network technician needs to test a 5km dark-fiber run between two buildings to find the location of a suspected cable break. Which test instrument is purpose-built for this job?',
    difficulty: 'Exam Level',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'OTDR (Optical Time-Domain Reflectometer)',
      B: 'TDR (Time-Domain Reflectometer) for copper',
      C: 'Cable certifier (like Fluke DSX) — tests Cat 6 only',
      D: 'Multimeter — tests resistance and continuity'
    },
    answer: 'A',
    explanation: 'An OTDR injects light pulses into a fiber and measures the reflected return signal versus time, producing a trace that shows distance to events (splices, connectors, breaks) and loss characteristics. It can pinpoint a fiber break to within meters even on multi-km runs. TDR (B) does the same job for COPPER cables, not fiber. Cable certifiers (C) test Cat 6 channel performance, not fiber breaks. Multimeters (D) test electrical continuity, useless on light-carrying fiber.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'An OTDR trace shows a sharp drop ("event") at 2.3km from the test end, with no light reaching the far end. What is the MOST LIKELY interpretation?',
    difficulty: 'Hard',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'The fiber is broken or severely crushed at approximately 2.3km from the OTDR test point',
      B: 'There is a splice with normal loss at 2.3km',
      C: 'The fiber has dust contamination at 2.3km',
      D: 'The wavelength is mismatched at 2.3km'
    },
    answer: 'A',
    explanation: 'A sharp drop event with NO continuation past it indicates a severe break, fiber crush, or unmated connector at that distance — the OTDR can\'t see anything beyond. A normal splice (B) shows a small step in the trace, not a sharp drop with no continuation. Dust (C) usually shows as a small loss bump but light typically still passes. Wavelength mismatch (D) is a transceiver issue at the link endpoints, not a mid-fiber event detectable by OTDR.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which OTDR trace event would indicate a CONNECTOR or splice with HIGHER-than-normal loss but NOT a complete break?',
    difficulty: 'Hard',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'A small downward step in the trace at the event distance, with the trace continuing afterwards',
      B: 'A sharp vertical drop with no continuation past the event',
      C: 'A flat baseline with no events at all',
      D: 'A spike upward in the reflected signal'
    },
    answer: 'A',
    explanation: 'A connector or splice with elevated loss appears as a small DOWNWARD step in the OTDR trace — light is partially absorbed/reflected at that point, but the trace continues afterwards (showing the fiber is still intact past the event). B is a complete break (no continuation). C means no events were detected (clean fiber). D — an upward spike — indicates a reflection (e.g., an unmated connector with Fresnel reflection), not a high-loss splice.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },

  // ── 11. TONER (TONE GENERATOR + PROBE) ──
  {
    type: 'mcq',
    question: 'A network technician is tracing an unmarked Cat 6 cable through a wall and ceiling to identify which port it terminates at on a 48-port patch panel. Which tool is BEST suited for this job?',
    difficulty: 'Exam Level',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'Tone generator and probe (toner/probe kit)',
      B: 'Cable certifier',
      C: 'OTDR',
      D: 'Loopback plug'
    },
    answer: 'A',
    explanation: 'A toner injects an audible tone signal onto the unknown cable; the probe (a wand-like inductive sensor) is then waved near each candidate cable end until the technician hears the tone, identifying which port the unknown cable terminates at. This is the canonical use case. Cable certifier (B) tests channel performance — overkill for tracing. OTDR (C) is for fiber, not copper. Loopback plug (D) tests NIC ports for transmit-receive integrity.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A toner-and-probe kit is used to trace cables. Which physical principle does the PROBE use to detect the tone signal without making electrical contact with the cable?',
    difficulty: 'Hard',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'Inductive coupling — the probe senses the magnetic field from the AC tone signal in the cable',
      B: 'Capacitive coupling — the probe measures voltage potential differences',
      C: 'Optical detection — the probe shines IR light through the cable jacket',
      D: 'Sonic resonance — the probe listens for vibration in the cable insulation'
    },
    answer: 'A',
    explanation: 'The probe uses inductive coupling — the AC tone signal in the cable produces a small magnetic field, and the probe\'s inductive sensor picks this up without needing direct electrical contact. This is why you can wave the probe near a bundle of cables and hear the tone strongest near the one carrying the signal. B is wrong — capacitive coupling requires very close proximity and isn\'t how tone probes work. C and D are fabricated.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which of the following is a known limitation of using a tone generator and probe to trace cables?',
    difficulty: 'Hard',
    topic: 'Network Troubleshooting & Tools',
    objective: '5.5',
    options: {
      A: 'The tone can bleed onto adjacent cables in tightly-bundled runs, making it hard to distinguish which one is the target',
      B: 'It only works on fiber-optic cables, not copper',
      C: 'It only works when the cable is plugged into a powered switch',
      D: 'It physically damages the cable jacket and requires recertification afterwards'
    },
    answer: 'A',
    explanation: 'In tightly-bundled cable runs, the tone signal can inductively bleed onto adjacent cables, causing the probe to register a signal on the wrong cable. The mitigation is to listen for the LOUDEST tone (which is on the actual target cable) or to physically separate suspect cables when possible. B is reversed — toners work on copper, not fiber. C is wrong — toners can be used on disconnected cables; the toner provides the signal. D is fabricated.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },

  // ── 12. LLDP (LINK LAYER DISCOVERY PROTOCOL) ──
  {
    type: 'mcq',
    question: 'What is the primary purpose of LLDP (Link Layer Discovery Protocol, IEEE 802.1AB)?',
    difficulty: 'Foundational',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'Vendor-neutral Layer 2 protocol that allows network devices to advertise their identity, capabilities, and neighbors to directly-connected devices',
      B: 'A routing protocol that distributes routes between OSPF areas',
      C: 'A spanning-tree variant that prevents Layer 2 loops',
      D: 'An encryption protocol for Layer 2 frames'
    },
    answer: 'A',
    explanation: 'LLDP is a vendor-neutral Layer 2 discovery protocol — devices advertise their identity (system name), port info, capabilities (router, switch, AP, phone, etc.), and neighbor relationships. Network management tools and admins use it to map physical topology and verify cabling. B is OSPF/BGP territory. C is STP/RSTP. D is MACsec.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'How does LLDP differ from Cisco\'s CDP (Cisco Discovery Protocol)?',
    difficulty: 'Exam Level',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'LLDP is vendor-neutral (IEEE 802.1AB) and works across any compliant equipment; CDP is Cisco-proprietary and works mainly on Cisco gear',
      B: 'LLDP runs at Layer 3 while CDP runs at Layer 2',
      C: 'LLDP encrypts neighbor advertisements while CDP sends them in plaintext',
      D: 'LLDP only works in IPv6 networks while CDP supports IPv4'
    },
    answer: 'A',
    explanation: 'The defining difference is interoperability — LLDP is an open IEEE standard (802.1AB) and works across any vendor that implements it; CDP is Cisco-proprietary. In multi-vendor environments LLDP is essential. Both run at Layer 2 (B is wrong). Neither encrypts (C is wrong). Both are protocol-agnostic with respect to L3 (D is wrong).',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which information is typically advertised by LLDP between directly-connected devices?',
    difficulty: 'Hard',
    topic: 'Network Operations',
    objective: '3.1',
    options: {
      A: 'System name and port description of the local device',
      B: 'System capabilities (e.g., router, switch, WLAN AP, phone)',
      C: 'A list of every IP route the device knows about',
      D: 'The full running configuration of the device',
      E: 'The MAC addresses of every host in the broadcast domain'
    },
    answers: ['A', 'B'],
    explanation: 'A (system name + port description) and B (capabilities) are the bread-and-butter LLDP advertisements. They let neighbors and management tools build accurate physical topology maps and identify what each device is. C/D would be massive privacy/security risks if advertised broadly. E is a separate function (MAC address tables) and not advertised via LLDP.',
    source: 'curated',
    addedVersion: '4.85.21',
    addedDate: '2026-05-03'
  },
  // ── 13. TCP RST FLAG — TERMINATES TCP CONNECTIONS (Cycle 2 add-on, 2026-05-03) ──
  {
    type: 'mcq',
    question: 'What does the TCP RST (reset) flag indicate when received by an endpoint?',
    difficulty: 'Foundational',
    topic: 'TCP/IP Basics',
    objective: '1.1',
    options: {
      A: 'The connection should be immediately aborted; no further packets will be exchanged on this connection',
      B: 'The connection is gracefully closing — both sides should finish current data transfer before terminating',
      C: 'The connection is being reset to a higher transmission window',
      D: 'The receiver is requesting retransmission of the last segment'
    },
    answer: 'A',
    explanation: 'TCP RST signals an immediate, abortive close — the receiver tears down the connection state without exchanging further data. Unlike FIN (B), which initiates a graceful four-way close, RST is a hard reset. C confuses RST with TCP window-scaling (a separate option). D describes a duplicate-ACK pattern that triggers fast retransmit, not RST.',
    source: 'curated',
    addedVersion: '4.85.22',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A port scanner sends a TCP SYN to port 22 of a target host, but receives a TCP RST in response. What does this indicate about the target?',
    difficulty: 'Exam Level',
    topic: 'TCP/IP Basics',
    objective: '1.1',
    options: {
      A: 'Port 22 is closed — no service is listening, so the OS responds with RST',
      B: 'Port 22 is open — the SSH service accepted the connection',
      C: 'Port 22 is filtered — a firewall is dropping packets silently',
      D: 'The scanner sent a malformed packet'
    },
    answer: 'A',
    explanation: 'A RST in response to a SYN means the port is closed but reachable — the target\'s OS received the SYN, found no listener, and responded with RST per the TCP spec. An OPEN port (B) replies with SYN-ACK. A FILTERED port (C) typically gives no response at all (silent drop). RST is unambiguous: the host is up and the port is reachable, but nothing is listening.',
    source: 'curated',
    addedVersion: '4.85.22',
    addedDate: '2026-05-03'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which scenarios commonly trigger a TCP RST?',
    difficulty: 'Hard',
    topic: 'TCP/IP Basics',
    objective: '1.1',
    options: {
      A: 'A SYN arriving for a destination port with no listening service',
      B: 'A firewall actively rejecting traffic to a closed connection (vs silently dropping)',
      C: 'Successful completion of a normal data transfer with no application errors',
      D: 'Receipt of three duplicate ACKs in a row',
      E: 'Successful completion of the TCP three-way handshake'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are common RST triggers. A — closed-port response: the OS sends RST when no service is listening. B — active firewall reject (vs silent drop) where the firewall returns RST to make the connection fail fast rather than time out. C is wrong — normal completion uses FIN, not RST. D — three duplicate ACKs triggers fast retransmit (not RST). E — successful handshake establishes the connection (no RST involved).',
    source: 'curated',
    addedVersion: '4.85.22',
    addedDate: '2026-05-03'
  },
  // ── Phase 3 Cycle 2 (Round 2 add-on) — 2026-05-03 (continued Dion gaps) ──
  // 11 more topics × 3 exemplars = 33. All original, public N10-009 + standards refs.

  // ── 1. MICROWAVE CONNECTION (POINT-TO-POINT WIRELESS WAN) ──
  {
    type: 'mcq',
    question: 'A campus needs to connect two buildings 5 km apart where running fiber would require expensive trenching. Which line-of-sight wireless technology is COMMONLY used as a building-to-building backbone link?',
    difficulty: 'Foundational',
    topic: 'WAN Connectivity',
    objective: '1.2',
    options: { A: 'Microwave point-to-point', B: 'Bluetooth mesh', C: '802.11ac Wi-Fi', D: 'NFC' },
    answer: 'A',
    explanation: 'Microwave point-to-point links use highly directional antennas to deliver multi-Gbps connectivity over line-of-sight distances of several km, making them a common alternative to trenched fiber for inter-building backbones. Bluetooth (B) is short-range PAN, not multi-km. 802.11ac (C) is indoor/short-range wireless LAN. NFC (D) is centimeters, not kilometers.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A microwave point-to-point link between two buildings was working perfectly, but during heavy rain the link drops or shows high error rates. What is this phenomenon called?',
    difficulty: 'Exam Level',
    topic: 'WAN Connectivity',
    objective: '1.2',
    options: {
      A: 'Rain fade — atmospheric water absorbs and scatters microwave signal energy at higher frequencies',
      B: 'Multipath interference — water droplets create reflections',
      C: 'Co-channel interference — rain shifts the microwave frequency',
      D: 'Antenna decoupling — wet antennas detune'
    },
    answer: 'A',
    explanation: 'Rain fade is the well-known degradation of microwave (and satellite) links during heavy precipitation — water droplets absorb and scatter signal energy, especially at higher frequency bands (above 10 GHz). Mitigations include link-budget margin in design, automatic transmit-power adjustment, or deploying lower-frequency bands which are less affected. B/C/D describe unrelated phenomena.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which is a critical requirement for a microwave point-to-point link to function correctly?',
    difficulty: 'Hard',
    topic: 'WAN Connectivity',
    objective: '1.2',
    options: {
      A: 'Clear line-of-sight between the two antennas, including Fresnel zone clearance — obstructions reduce signal strength even when "visible"',
      B: 'A copper grounding strap shared between both buildings',
      C: 'A fiber backup running underground in parallel with the microwave path',
      D: 'A licensed satellite uplink for synchronization'
    },
    answer: 'A',
    explanation: 'Microwave point-to-point requires unobstructed line-of-sight including Fresnel zone clearance — the elliptical 3D region around the direct path that must be ~60% clear of obstacles even though the antennas are technically "visible" to each other. Trees, buildings, or even terrain that intrudes into the Fresnel zone causes diffraction loss. B is fabricated. C is a desirable redundancy but not a microwave operational requirement. D is unrelated.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },

  // ── 2. PATCH PANEL ──
  {
    type: 'mcq',
    question: 'In a structured cabling system, what is the role of a patch panel?',
    difficulty: 'Foundational',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: {
      A: 'A passive cable termination unit that organizes fixed horizontal cabling into a central point where short patch cords connect to active switch/router ports',
      B: 'An active device that switches frames between VLANs',
      C: 'A managed PoE injector for IP phones',
      D: 'A wireless access point with multiple antenna ports'
    },
    answer: 'A',
    explanation: 'A patch panel is a passive (non-powered) device — it terminates the building\'s fixed horizontal cabling on the back, exposing labeled jacks on the front. Short patch cords then connect those jacks to the active equipment (switches/routers). The win is flexibility: you can change which port a wall jack connects to without touching the in-wall cabling. B (switch), C (PoE injector), D (WAP) are all active devices, fundamentally different from a passive patch panel.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Why do enterprise networks typically use patch panels between in-wall cabling and switches, rather than running cables directly from wall jacks to switches?',
    difficulty: 'Exam Level',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: {
      A: 'Patch panels protect the in-wall (horizontal) cable from wear, simplify port reassignment via patch cords, and provide a labeled organization layer',
      B: 'Patch panels add electrical isolation that prevents EMI from corrupting frames',
      C: 'Patch panels increase the maximum cable length beyond 100m',
      D: 'Patch panels are required by 802.1Q for VLAN trunk operation'
    },
    answer: 'A',
    explanation: 'Patch panels exist for cable management + flexibility: the rigid in-wall cabling terminates once at the panel, and short flexible patch cords handle the wear of frequent re-cabling. This protects the punch-down terminations from repeated stress and lets admins re-route ports without touching the in-wall plant. B is fabricated — patch panels don\'t isolate EMI. C is wrong — patch panels don\'t extend reach (they consume it). D is fabricated.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which statements correctly describe a patch panel?',
    difficulty: 'Hard',
    topic: 'Cabling & Topology',
    objective: '1.5',
    options: {
      A: 'It is a passive (non-powered) device — no electrical processing, just physical termination',
      B: 'It typically uses 110-style or Krone-style punch-down terminations on the rear and RJ45 (or fiber) jacks on the front',
      C: 'It performs Layer 2 frame switching internally',
      D: 'It always has built-in PoE for connected devices',
      E: 'It is a single-port device — multiple panels are needed for multiple cables'
    },
    answers: ['A', 'B'],
    explanation: 'A and B accurately describe patch panels — passive, with punch-down terminations on the back and modular jacks on the front. C is wrong (no L2 switching — that\'s a switch\'s job). D is wrong (panels are passive, no PoE). E is wrong — patch panels come in 12, 24, 48, 96-port and even larger configurations.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },

  // ── 3. BANDWIDTH ──
  {
    type: 'mcq',
    question: 'Which of the following BEST defines bandwidth in a networking context?',
    difficulty: 'Foundational',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'The maximum theoretical data-carrying capacity of a link, typically expressed in bits per second',
      B: 'The actual measured rate of data successfully delivered over a link',
      C: 'The delay between a packet leaving the source and arriving at the destination',
      D: 'The variation in delay over time'
    },
    answer: 'A',
    explanation: 'Bandwidth is the THEORETICAL max capacity of a link — e.g., 1 Gbps Ethernet has 1 Gbps of bandwidth. B is throughput (the actual measured rate, which is always ≤ bandwidth due to overhead, congestion, errors). C is latency. D is jitter. Confusing bandwidth with throughput is one of the most common networking mix-ups.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A 1 Gbps Ethernet link consistently delivers 940 Mbps of useful data when transferring large files. How should this be characterized?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'The bandwidth is 1 Gbps; the throughput is 940 Mbps; the difference is normal protocol overhead (framing, headers, IFG, etc.)',
      B: 'The bandwidth is 940 Mbps; the link is mislabeled',
      C: 'The throughput is 1 Gbps; the bandwidth is 940 Mbps',
      D: 'The link is failing and should be replaced — 1 Gbps should deliver exactly 1 Gbps of useful data'
    },
    answer: 'A',
    explanation: 'Bandwidth = max theoretical (1 Gbps). Throughput = actual delivered useful data (940 Mbps). The ~6% gap is expected overhead: Ethernet framing, IP/TCP headers, inter-frame gap (12 bytes between frames), preamble. Achieving 940 Mbps on a 1 Gbps link is, in fact, exceptional throughput. B and C confuse the terms. D misunderstands that bandwidth is theoretical maximum, not guaranteed delivered useful payload.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'An ISP advertises "up to 100 Mbps" download speeds. A user runs a speed test and consistently sees 85-92 Mbps. Which statement BEST describes the situation?',
    difficulty: 'Hard',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'The bandwidth is 100 Mbps (advertised theoretical max); the throughput is 85-92 Mbps (actual delivered, reduced by protocol overhead, ISP equipment, and contention)',
      B: 'The user is being throttled — they should call the ISP for a refund',
      C: 'The link is broken — 100 Mbps should always deliver exactly 100 Mbps',
      D: 'The user has a malware infection consuming bandwidth'
    },
    answer: 'A',
    explanation: '"Up to" advertised speeds are bandwidth (theoretical maximum). Throughput is what actually arrives, and it\'s always less due to: protocol overhead, equipment processing, contention with other users on the same link, and Wi-Fi/cabling losses. 85-92% of advertised is normal performance for a residential broadband connection. B is a misunderstanding. C confuses bandwidth with throughput. D is unsupported by the data given.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },

  // ── 4. LATENCY ──
  {
    type: 'mcq',
    question: 'In networking, what does latency measure?',
    difficulty: 'Foundational',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'The delay between a packet leaving the source and arriving at the destination',
      B: 'The maximum theoretical data rate of a link',
      C: 'The variation in arrival time of consecutive packets',
      D: 'The percentage of packets lost during transmission'
    },
    answer: 'A',
    explanation: 'Latency = delay from source to destination, typically measured in milliseconds. B is bandwidth. C is jitter (latency variation). D is packet loss. Round-trip latency (RTT) is what tools like ping measure — it\'s 2× one-way latency.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A web application user complains of slow performance, specifically "the page takes a long time to start loading even though it loads quickly once it starts." Which network metric is MOST LIKELY the issue?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'High latency — initial connection setup (DNS, TCP handshake, TLS) is delayed but then transfers fast once established',
      B: 'Low bandwidth — transfers are slow throughout',
      C: 'High jitter — would cause uneven streaming but not slow start',
      D: 'High packet loss — would cause TCP retransmissions throughout'
    },
    answer: 'A',
    explanation: 'High latency (typically RTT) primarily impacts CONNECTION SETUP — DNS lookup, TCP three-way handshake, TLS handshake all add multiple round-trips before any data flows. A user with high RTT but adequate bandwidth would see "slow to start, fast once started." Low bandwidth (B) would cause slow throughout. Jitter (C) affects real-time streaming. Loss (D) would cause variability and retransmits, not specifically slow-start behavior.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which contributes MOST significantly to latency on a long-distance fiber link spanning thousands of kilometers?',
    difficulty: 'Hard',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'Propagation delay — light travels at ~200,000 km/s in fiber, so each 1000 km adds ~5ms one-way regardless of bandwidth',
      B: 'Serialization delay — large frames take time to clock out',
      C: 'Processing delay at endpoints',
      D: 'Wireless interference along the path'
    },
    answer: 'A',
    explanation: 'For long-distance links, propagation delay dominates: light in fiber travels at roughly 200,000 km/s (about 2/3 c due to refractive index), so 1000 km of fiber adds ~5ms of one-way propagation latency, regardless of how fast the endpoints are. This is the fundamental physics floor — you cannot beat the speed of light in glass. Serialization (B), processing (C), and wireless interference (D) become relatively minor on long-distance high-speed links.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },

  // ── 5. JITTER ──
  {
    type: 'mcq',
    question: 'In networking, what does jitter measure?',
    difficulty: 'Foundational',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'The variation in delay between consecutive packets arriving at the destination',
      B: 'The total round-trip delay between source and destination',
      C: 'The percentage of packets that arrive out of order',
      D: 'The percentage of packets that fail to arrive at all'
    },
    answer: 'A',
    explanation: 'Jitter = variability in packet arrival timing. If packets sent at 20ms intervals arrive at 18ms, 22ms, 19ms, 25ms intervals, that variation IS jitter. B is latency (the delay itself, not its variation). C is reordering (different metric). D is packet loss.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which application is MOST sensitive to jitter, and why?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'Real-time voice (VoIP) and video conferencing — uneven packet arrival causes audio/video stutter and gaps in the playback buffer',
      B: 'Email — slow delivery is acceptable',
      C: 'Bulk file transfer — TCP automatically reorders out-of-order packets',
      D: 'Web browsing — pages load asynchronously'
    },
    answer: 'A',
    explanation: 'Real-time voice and video are extremely jitter-sensitive because they have a fixed-size playout buffer. If packets arrive too unevenly, the buffer either runs dry (causing audible/visible gaps) or overflows (causing dropped audio/video). Email (B) and file transfer (C) are buffered and order-tolerant — TCP retransmits and reassembles. Web (D) tolerates uneven page loads acceptably.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which network conditions can cause jitter?',
    difficulty: 'Hard',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'Variable queueing delays at intermediate routers under fluctuating congestion',
      B: 'Different packets taking different paths with different propagation latencies',
      C: 'A perfectly stable high-bandwidth link with no contention',
      D: 'A direct fiber connection between adjacent equipment racks',
      E: 'Symmetric routing with low utilization'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are common causes of jitter. Variable queueing (A) — when one packet sails through a router but the next finds a full queue and has to wait, that\'s jitter. Path variability (B) — load-balanced or asymmetric routing can send packets along different-length paths, producing varying latency. C, D, and E describe stable conditions that produce LOW jitter.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },

  // ── 6. THROUGHPUT ──
  {
    type: 'mcq',
    question: 'In networking, what does throughput measure?',
    difficulty: 'Foundational',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'The actual rate of useful data successfully delivered over a link in a given time period',
      B: 'The maximum theoretical capacity of a link',
      C: 'The variation in latency between packets',
      D: 'The number of hops between source and destination'
    },
    answer: 'A',
    explanation: 'Throughput = real-world delivered data rate, measured. B is bandwidth (theoretical max). C is jitter. D is hop count. Throughput is always ≤ bandwidth because of overhead (protocol headers, IFG), congestion, and errors that reduce useful payload below the theoretical maximum.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A 10 Gbps fiber link is being benchmarked. The test reports 9.2 Gbps of measured useful data delivery. Which is the MOST ACCURATE description?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'The link\'s bandwidth is 10 Gbps; its throughput is 9.2 Gbps; the 8% gap is normal overhead and processing',
      B: 'The link is failing — 10 Gbps should deliver 10 Gbps',
      C: 'The link is over-provisioned — measured throughput exceeds bandwidth',
      D: 'The benchmark tool is broken — single tests can\'t measure throughput'
    },
    answer: 'A',
    explanation: 'Bandwidth = 10 Gbps theoretical. Throughput = 9.2 Gbps actual measured useful data. The 8% gap is normal protocol overhead (Ethernet framing, IP/TCP headers, IFG, NIC processing). On 10 Gigabit Ethernet, anything north of 9 Gbps is solid throughput. B misunderstands the bandwidth/throughput distinction. C is impossible — throughput cannot exceed bandwidth. D is unsupported.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A user complains that their 1 Gbps office connection consistently delivers only ~400 Mbps when transferring files to a server, despite the link showing as 1 Gbps full-duplex on both ends. What is the MOST LIKELY cause to investigate FIRST?',
    difficulty: 'Hard',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'A bottleneck somewhere in the path: TCP window-size limits, an intermediate slower link, server disk I/O cap, or overall path congestion',
      B: 'The bandwidth is mislabeled — 1 Gbps was a typo for 400 Mbps',
      C: 'Jitter — variable latency drops effective throughput',
      D: 'The cable needs to be replaced'
    },
    answer: 'A',
    explanation: 'When throughput on a 1 Gbps link is consistently sub-50%, the issue is almost always a bottleneck somewhere — small TCP window for the BDP (bandwidth-delay product), an intermediate link at lower capacity, server-side disk/CPU bottleneck, or congestion. Start with `iperf` to test pure network throughput end-to-end without server-side disk involvement. B is unrealistic. C — jitter affects real-time apps but bulk TCP transfer is jitter-tolerant. D is a guess; cable issues usually show as errors, not consistent capped throughput.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },

  // ── 7. CLEAN AGENT FIRE SUPPRESSION ──
  {
    type: 'mcq',
    question: 'A data center needs a fire suppression system that can extinguish a fire WITHOUT damaging electronic equipment. Which type of system is appropriate?',
    difficulty: 'Foundational',
    topic: 'Data Centres',
    objective: '3.3',
    options: {
      A: 'Clean agent system (e.g., FM-200, Novec 1230, Inergen) — discharges a non-conductive gas that suppresses fire without water or residue',
      B: 'Wet pipe sprinkler system — water in pipes ready to discharge',
      C: 'Dry pipe sprinkler system — air in pipes, water released on activation',
      D: 'Foam suppression — best for electrical fires'
    },
    answer: 'A',
    explanation: 'Clean agent systems use specially-engineered gases (FM-200, Novec 1230, Inergen, etc.) that suppress fire by chemically interrupting combustion or displacing oxygen — they leave no residue, are non-conductive, and don\'t damage electronics. The trade-off is high cost and concerns about CO2 levels for occupants. Wet/dry pipe sprinklers (B/C) damage electronics with water. Foam (D) is for liquid fires (fuel), not electronics — it would also damage equipment.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which is a key operational consideration when deploying a clean agent fire suppression system in a server room?',
    difficulty: 'Exam Level',
    topic: 'Data Centres',
    objective: '3.3',
    options: {
      A: 'The room must be sealed to maintain agent concentration; rapid evacuation procedures and audible/visual warnings are required because some agents reduce oxygen below safe breathing levels',
      B: 'The system must use ozone-depleting Halon for compliance',
      C: 'It only works at temperatures below 0°C',
      D: 'It requires a constant water feed to recharge'
    },
    answer: 'A',
    explanation: 'Clean agent systems require room sealing to maintain effective gas concentration. Some agents (especially those that work by oxygen displacement) can reduce O2 below safe breathing levels, requiring evacuation procedures, audible alarms, and visual indicators that give occupants time to exit before discharge. B is wrong — Halon is being phased out due to ozone-depletion treaty (Montreal Protocol); modern clean agents are FM-200 / Novec 1230 / Inergen. C is fabricated. D contradicts "clean agent" — these systems use gas, not water.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which are advantages of clean agent fire suppression compared to water-based sprinkler systems for data center protection?',
    difficulty: 'Hard',
    topic: 'Data Centres',
    objective: '3.3',
    options: {
      A: 'No water damage to powered electronics during discharge',
      B: 'No residue or cleanup required after discharge',
      C: 'Lower cost than water-based systems',
      D: 'Effective on outdoor fires',
      E: 'No need for room sealing'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are the canonical clean-agent advantages — gas leaves no water damage (A) and no residue (B), so equipment can be back online quickly. C is reversed — clean agents are SIGNIFICANTLY MORE expensive than wet sprinklers. D is wrong — clean agents need to be contained in a sealed enclosure. E contradicts the operational reality of clean agent deployment.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },

  // ── 8. WET PIPE FIRE SUPPRESSION SYSTEM ──
  {
    type: 'mcq',
    question: 'In a wet pipe fire suppression system, what is in the pipes BEFORE activation?',
    difficulty: 'Foundational',
    topic: 'Data Centres',
    objective: '3.3',
    options: {
      A: 'Pressurized water — released immediately when a sprinkler head melts open',
      B: 'Compressed air — water enters only after activation',
      C: 'Halon gas — discharged on heat detection',
      D: 'Foam concentrate — mixed with water on activation'
    },
    answer: 'A',
    explanation: 'Wet pipe systems keep water pressurized in the pipes at all times. When a sprinkler head\'s heat-sensitive element (typically a glass bulb that breaks at a specific temperature) opens, water discharges immediately — no delay. B describes a DRY pipe system. C is clean agent. D is foam suppression.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which is a KEY advantage of a wet pipe sprinkler system over a dry pipe system?',
    difficulty: 'Exam Level',
    topic: 'Data Centres',
    objective: '3.3',
    options: {
      A: 'Faster water delivery to a fire — water is already in the pipes, so it discharges immediately when a sprinkler head opens',
      B: 'Lower cost of installation',
      C: 'Suitable for unheated spaces where pipes might freeze',
      D: 'No water present, so accidental discharge is impossible'
    },
    answer: 'A',
    explanation: 'Wet pipe systems deliver water FASTER than dry pipe — there\'s no air-purge delay because water is already present in the pipes. The advantage is critical because faster suppression = less property damage. B is debatable. C is the OPPOSITE — wet pipe systems are NOT used in unheated spaces because water in pipes can freeze; that\'s exactly why dry pipe systems exist. D is wrong — wet pipe systems CAN cause water damage from accidental head activation, leaks, or freezing burst.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Why might a data center prefer a clean agent or pre-action system over a traditional wet pipe sprinkler system?',
    difficulty: 'Hard',
    topic: 'Data Centres',
    objective: '3.3',
    options: {
      A: 'A wet pipe system can discharge water from accidentally-triggered heads or burst pipes, causing severe water damage to live electronic equipment',
      B: 'Wet pipe systems do not comply with NFPA 25',
      C: 'Wet pipe systems require continuous compressed air',
      D: 'Wet pipe systems are illegal in commercial buildings'
    },
    answer: 'A',
    explanation: 'The classic data center concern with wet pipe is "head failure or pipe burst dumps water onto powered equipment with no fire even occurring." Pre-action systems require TWO triggers (heat detection AND a head opening) before water is admitted into the pipes, dramatically reducing accidental-discharge risk. Clean agent systems sidestep water entirely. B is fabricated. C describes dry pipe, not wet. D is fabricated.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },

  // ── 9. EXPLOIT ──
  {
    type: 'mcq',
    question: 'In a security context, what is an EXPLOIT?',
    difficulty: 'Foundational',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'A piece of code, technique, or sequence of actions that takes advantage of a vulnerability to compromise a system',
      B: 'A flaw or weakness in software or configuration',
      C: 'A defensive control that mitigates risk',
      D: 'A security audit report'
    },
    answer: 'A',
    explanation: 'An exploit is the WEAPON — code or technique that uses a vulnerability to actually compromise a target. B describes the vulnerability (the flaw being exploited). The relationship: a vulnerability is the unlocked door; an exploit is the act of walking through it. C is a control. D is documentation.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Researchers discover a previously-unknown flaw in a popular web server. Within hours, attacker code circulates that uses that flaw to gain remote code execution. Which term BEST describes the attacker code?',
    difficulty: 'Exam Level',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'Zero-day exploit — code that exploits a vulnerability before a patch is available',
      B: 'Patch — corrects the vulnerability',
      C: 'Vulnerability disclosure — describes the flaw responsibly',
      D: 'Threat actor — the human or group behind the attack'
    },
    answer: 'A',
    explanation: 'A zero-day exploit is attacker code targeting a vulnerability for which no patch exists yet (defenders have had "zero days" to fix). The flaw itself is the zero-day vulnerability; the attacker code is the zero-day exploit. B is the defensive fix. C is the public report describing the vulnerability. D is the human/group, not the code.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which are accurate statements about exploits?',
    difficulty: 'Hard',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'An exploit requires an underlying vulnerability to target — without a flaw, there is nothing to exploit',
      B: 'Exploit code is often shared on hacker forums and within penetration-testing toolkits like Metasploit',
      C: 'An exploit is identical to the vulnerability it targets',
      D: 'Exploits only work on Windows systems',
      E: 'Once a vulnerability has a CVE assigned, no exploit is possible'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are correct. Exploits chain to vulnerabilities (A) — no flaw, no exploit. Exploits are widely traded/published, including in legitimate pentest tools like Metasploit (B). C confuses two distinct concepts (vulnerability = flaw; exploit = the technique that uses it). D is fabricated. E is reversed — assigning a CVE means the vulnerability is now widely known and exploits become MORE common until patched.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },

  // ── 10. VULNERABILITY ──
  {
    type: 'mcq',
    question: 'In a security context, what is a VULNERABILITY?',
    difficulty: 'Foundational',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'A flaw, weakness, or misconfiguration in software, hardware, or process that could be exploited to compromise security',
      B: 'A piece of attacker code',
      C: 'A successful security breach',
      D: 'An automated patching tool'
    },
    answer: 'A',
    explanation: 'A vulnerability is the FLAW — a buffer overflow, an unpatched library, a default password, an open port. It is the condition that makes compromise possible. B is the exploit (the weapon). C is a breach (the outcome of successful exploitation). D is a defense.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A scan of a corporate web server identifies that it is running an outdated version of OpenSSL with a known buffer-overflow flaw. The flaw could allow remote code execution if successfully targeted. What is this finding called?',
    difficulty: 'Exam Level',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'A vulnerability — the flaw exists, but exploitation has not yet occurred (and may never if the system is patched in time)',
      B: 'An exploit — by virtue of being identified',
      C: 'A breach — the attacker has already compromised the server',
      D: 'A patch — the scanner has automatically resolved the issue'
    },
    answer: 'A',
    explanation: 'A vulnerability finding is "the flaw exists" — it has been IDENTIFIED but not necessarily EXPLOITED. Vulnerability scanners (Nessus, Qualys, OpenVAS) generate inventories of vulnerabilities so admins can prioritize patching. B confuses vulnerability with exploit. C confuses vulnerability with breach (the actual compromise). D is fabricated — scanners report, they don\'t auto-patch.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'Which best describes the relationship between THREAT, VULNERABILITY, EXPLOIT, and RISK?',
    difficulty: 'Hard',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'A threat actor uses an exploit to take advantage of a vulnerability, creating risk; remediation requires patching the vulnerability or compensating with controls',
      B: 'They are synonyms — the terms can be used interchangeably',
      C: 'Vulnerabilities and exploits are the same thing; threats and risks are the same thing',
      D: 'A risk is a piece of attacker code; a threat is a flaw in software'
    },
    answer: 'A',
    explanation: 'The relationship: a threat actor (the human or group) uses an exploit (technique/code) to take advantage of a vulnerability (flaw), causing impact = risk to the organization. To reduce risk, you remove or remediate the vulnerability (patch, configuration change, compensating control). B and C confuse distinct concepts. D inverts the definitions.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },

  // ── 11. VISUAL FAULT LOCATOR (VFL) ──
  {
    type: 'mcq',
    question: 'Which fiber-optic test tool injects visible red laser light into a fiber to make breaks, sharp bends, or bad connectors visible by the light leaking from the defect?',
    difficulty: 'Exam Level',
    topic: 'Cable Issues',
    objective: '5.2',
    options: { A: 'Visual Fault Locator (VFL)', B: 'OTDR', C: 'Power meter', D: 'Cable certifier' },
    answer: 'A',
    explanation: 'A VFL is a handheld pen-shaped device that emits a bright visible (typically red, ~650 nm) laser into a fiber. Where the fiber is broken, sharply bent, or has a bad connector, the red light leaks out and can be seen with the naked eye. It\'s a quick first-line tool for short-run troubleshooting. OTDR (B) is for long-run quantitative analysis. Power meter (C) measures total signal loss. Cable certifier (D) tests Cat copper.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'mcq',
    question: 'A technician suspects a sharp bend or hidden break in a 50m fiber patch cable inside a server cabinet. Which tool gives the FASTEST visual confirmation of the defect\'s location?',
    difficulty: 'Hard',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'Visual Fault Locator — the red light leaking from the defect is immediately visible to the eye',
      B: 'OTDR — must be brought out and configured for short-run mode',
      C: 'Tone generator and probe — works only on copper',
      D: 'Multimeter — measures continuity'
    },
    answer: 'A',
    explanation: 'A VFL is purpose-built for the short-distance "where exactly is the bend or break" question. Plug it in, look for red glow leaking from the cable. OTDR (B) works at this range but requires more setup time. Toner (C) is copper, not fiber. Multimeter (D) doesn\'t work on fiber.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which are accurate statements about a Visual Fault Locator?',
    difficulty: 'Hard',
    topic: 'Cable Issues',
    objective: '5.2',
    options: {
      A: 'It uses a visible-wavelength (typically red ~650 nm) laser so the user can see light leaking from a defect',
      B: 'It is most useful for short-run troubleshooting (typically a few hundred meters or less)',
      C: 'It can measure exact loss in dB at each point',
      D: 'It is the same tool as an OTDR',
      E: 'It only works on copper cables'
    },
    answers: ['A', 'B'],
    explanation: 'A and B accurately describe a VFL. The visible red light (A) is the whole point — it\'s about visual identification, not quantitative measurement. The reach (B) is limited because the source is low-power and visible light attenuates faster than the IR wavelengths used for data — beyond a few hundred meters the leak is too dim to see. C is what an OTDR or power meter does. D confuses two distinct tools. E is wrong — VFL is exclusively for fiber.',
    source: 'curated',
    addedVersion: '4.85.23',
    addedDate: '2026-05-03'
  },
  // ── Phase 3 Cycle 2 R3 add-on: PENETRATION TESTING — 2026-05-04 ──
  {
    type: 'mcq',
    question: 'What is the primary purpose of a PENETRATION TEST?',
    difficulty: 'Foundational',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'An authorized simulated attack on a system to identify and exploit vulnerabilities before real adversaries do',
      B: 'An automated scan that lists vulnerabilities without attempting to exploit them',
      C: 'A formal audit of compliance documentation against a regulatory standard',
      D: 'A backup test that restores data to verify recoverability'
    },
    answer: 'A',
    explanation: 'A penetration test (pentest) is an authorized, simulated attack — testers actively exploit vulnerabilities to demonstrate real-world impact and find chains of weaknesses an attacker could use. B describes a vulnerability assessment (passive identification only — no exploitation). C describes a compliance audit. D is disaster-recovery testing. Pentest = "we tried to break in and here\'s what we found."',
    source: 'curated',
    addedVersion: '4.85.24',
    addedDate: '2026-05-04'
  },
  {
    type: 'mcq',
    question: 'What is the KEY DIFFERENCE between a vulnerability scan and a penetration test?',
    difficulty: 'Exam Level',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'A vulnerability scan IDENTIFIES potential weaknesses but does not exploit them; a penetration test goes further by actively exploiting findings to confirm impact and chain together attack paths',
      B: 'A vulnerability scan is unauthorized; a pentest is authorized',
      C: 'A vulnerability scan tests web applications; a pentest tests networks',
      D: 'A vulnerability scan is manual; a pentest is fully automated'
    },
    answer: 'A',
    explanation: 'The defining difference is exploitation. Vulnerability scans (Nessus, Qualys, OpenVAS) automatically identify potential issues by signature matching but do NOT exploit them — they produce findings lists. Pentests authorized human testers (often using exploit tools like Metasploit + manual techniques) confirm exploitability, chain weaknesses together, and demonstrate real-world impact (e.g., "we got domain admin starting from this misconfigured printer"). Both are authorized when done legitimately (B is wrong). Both can target any asset class (C is wrong). Pentests are typically MORE manual than scans (D is reversed).',
    source: 'curated',
    addedVersion: '4.85.24',
    addedDate: '2026-05-04'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which statements correctly describe penetration testing methodologies?',
    difficulty: 'Hard',
    topic: 'Network Attacks & Threats',
    objective: '4.2',
    options: {
      A: 'Black-box testing — the tester has no prior knowledge of the target environment, simulating an external attacker',
      B: 'White-box testing — the tester has full information (network diagrams, source code, credentials), simulating an insider or advanced persistent threat',
      C: 'Pentests must always be conducted without the system owner\'s permission to be valid',
      D: 'Pentests cannot include social engineering — they are strictly technical',
      E: 'Pentest reports omit findings the tester could not exploit, to keep the report concise'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are correct definitions of standard pentest methodologies — black-box (no info, external attacker simulation), white-box (full info, insider/APT simulation), and gray-box (partial info, often as a compromised user). C is wrong AND illegal — pentests REQUIRE explicit written authorization from the system owner; without it the activity is unlawful intrusion. D is wrong — social engineering (phishing, pretexting) is a common authorized pentest component. E is wrong — pentest reports include all findings, exploitable or not, with severity ratings; unexploited findings are still vulnerabilities that defenders need to address.',
    source: 'curated',
    addedVersion: '4.85.24',
    addedDate: '2026-05-04'
  },
  // ── Phase 3 Cycle 2 R4 add-on — 2026-05-04 (continued Dion gaps) ──
  // 3 topics × 3 exemplars = 9 new exemplars.

  // ── 1. OSPF AS A CLASSLESS ROUTING PROTOCOL ──
  {
    type: 'mcq',
    question: 'Which of the following describes OSPF correctly with respect to addressing classes?',
    difficulty: 'Foundational',
    topic: 'OSPF',
    objective: '2.1',
    options: {
      A: 'OSPF is a classless routing protocol — it carries subnet masks in its updates and supports VLSM and CIDR',
      B: 'OSPF is a classful routing protocol — it assumes default subnet masks based on Class A/B/C',
      C: 'OSPF is class-agnostic — it does not exchange routing information at all',
      D: 'OSPF is a distance-vector classful protocol like RIPv1'
    },
    answer: 'A',
    explanation: 'OSPF is a classless link-state routing protocol. It carries the subnet mask along with each network prefix in its LSAs (Link State Advertisements), which means it supports VLSM (Variable Length Subnet Masks) and CIDR (Classless Inter-Domain Routing). B describes RIPv1 / IGRP (legacy classful protocols, retired). C is fabricated. D is wrong — OSPF is a LINK-STATE classless protocol, not a distance-vector classful one.',
    source: 'curated',
    addedVersion: '4.85.25',
    addedDate: '2026-05-04'
  },
  {
    type: 'mcq',
    question: 'A network engineer is choosing a routing protocol for a network that uses VLSM (e.g., /22, /24, /26, /30 subnets mixed within the same address space). Which of the following protocols correctly supports this requirement?',
    difficulty: 'Exam Level',
    topic: 'OSPF',
    objective: '2.1',
    options: {
      A: 'OSPF — a classless protocol that carries subnet masks in updates and supports VLSM natively',
      B: 'RIPv1 — assumes default classful masks, breaks VLSM',
      C: 'IGRP — distance-vector classful, no VLSM support',
      D: 'A static routing-only design — no dynamic protocol can support VLSM'
    },
    answer: 'A',
    explanation: 'OSPF supports VLSM cleanly because it is classless and exchanges subnet masks with each route advertisement. Other classless options would also work (EIGRP, RIPv2, BGP, IS-IS), but among the choices given, OSPF is the correct answer. B and C are classful — they break under VLSM. D is wrong; many dynamic routing protocols support VLSM (just not the legacy classful ones).',
    source: 'curated',
    addedVersion: '4.85.25',
    addedDate: '2026-05-04'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which statements correctly describe OSPF\'s relationship with classless routing?',
    difficulty: 'Hard',
    topic: 'OSPF',
    objective: '2.1',
    options: {
      A: 'OSPF carries the subnet mask in every LSA, so it can correctly advertise prefixes of any length',
      B: 'OSPF supports route summarization between areas at non-classful boundaries (e.g., aggregating /26s into a /22)',
      C: 'OSPF requires every interface in an area to use the same classful mask',
      D: 'OSPF cannot interoperate with CIDR-aggregated route advertisements',
      E: 'OSPF was specified in 1989 as a classful protocol and only became classless in OSPFv3'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are accurate. OSPF carries the subnet mask in LSAs (A), which is the technical foundation of its classless behavior, and it supports route summarization at any prefix boundary (B) — including aggregating multiple smaller prefixes into a larger one for inter-area summarization. C is wrong (OSPF allows mixed prefix lengths within an area). D is wrong (OSPF works fine with CIDR). E is wrong — OSPFv2 (RFC 2328, the still-canonical version) is classless from the start; OSPFv3 is the IPv6 variant, not the introduction of classlessness.',
    source: 'curated',
    addedVersion: '4.85.25',
    addedDate: '2026-05-04'
  },

  // ── 2. LIGHTWEIGHT vs AUTONOMOUS APs ──
  {
    type: 'mcq',
    question: 'What is the KEY distinction between an autonomous (standalone) wireless access point and a lightweight wireless access point?',
    difficulty: 'Foundational',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'An autonomous AP runs full configuration and forwarding logic locally; a lightweight AP relies on a centralized Wireless LAN Controller (WLC) for configuration and often forwarding decisions',
      B: 'Autonomous APs are wired; lightweight APs are wireless',
      C: 'Autonomous APs only operate at 2.4 GHz; lightweight APs only operate at 5 GHz',
      D: 'Lightweight APs require batteries; autonomous APs require AC power'
    },
    answer: 'A',
    explanation: 'Autonomous APs are self-contained — each one is configured individually with full local intelligence (SSIDs, security, RF tuning). Lightweight APs (sometimes called "thin APs") offload configuration and often forwarding to a centralized Wireless LAN Controller, communicating with it via CAPWAP (or its predecessor LWAPP). The LWAPP/CAPWAP model wins at scale: configure once on the WLC, push to hundreds of APs. B/C/D are fabricated technical distinctions.',
    source: 'curated',
    addedVersion: '4.85.25',
    addedDate: '2026-05-04'
  },
  {
    type: 'mcq',
    question: 'A campus has 200 wireless access points across 12 buildings and wants centralized RF management, seamless roaming, and one-config-to-rule-them-all deployment. Which AP architecture BEST supports this?',
    difficulty: 'Exam Level',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'Lightweight APs managed by one or more centralized Wireless LAN Controllers (WLCs) using CAPWAP',
      B: 'Autonomous APs each configured individually via local web GUI',
      C: 'Wireless mesh nodes that all peer-to-peer with each other',
      D: 'Cellular small-cell base stations at each building'
    },
    answer: 'A',
    explanation: 'A WLC + lightweight AP architecture is purpose-built for this scale: the WLC is the brain (RF coordination, channel/power assignments, SSID config, client roaming logic), and the lightweight APs are the radios. Configure once on the WLC, push to 200 APs. Autonomous (B) at this scale is operationally painful — every AP is its own snowflake. Mesh (C) has its place but doesn\'t centrally manage 200 APs. Cellular (D) is a different technology stack entirely.',
    source: 'curated',
    addedVersion: '4.85.25',
    addedDate: '2026-05-04'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which advantages does a centralized lightweight-AP + WLC architecture have over autonomous APs?',
    difficulty: 'Hard',
    topic: 'Wireless Networking',
    objective: '2.4',
    options: {
      A: 'Centralized configuration, monitoring, and policy push — one change on the WLC propagates to all APs',
      B: 'Coordinated RF management — channel and transmit power assignments are calculated globally to minimize co-channel interference and optimize coverage',
      C: 'Lightweight APs continue forwarding all client traffic identically when the WLC is offline',
      D: 'Lightweight APs do not require any uplink to the wired network',
      E: 'Each AP independently negotiates its own SSID with each client'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are the architectural wins of WLC-managed deployments — single source of truth for config (A) and globally-optimized RF planning (B), neither of which scales with autonomous APs. C is misleading — many lightweight AP deployments DO degrade when the WLC is offline (depending on FlexConnect/HREAP-style local switching configuration; pure central-switching mode breaks). D is wrong — lightweight APs need uplink to reach the WLC. E describes autonomous AP behavior, not lightweight.',
    source: 'curated',
    addedVersion: '4.85.25',
    addedDate: '2026-05-04'
  },

  // ── 3. TAP (TEST/TRAFFIC ACCESS POINT) ──
  {
    type: 'mcq',
    question: 'What is a network TAP (Test/Traffic Access Point) used for?',
    difficulty: 'Foundational',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'A passive hardware device installed inline on a network link that copies all traffic to a separate monitoring port for capture or IDS analysis without affecting the live link',
      B: 'A wireless access point that authenticates VPN clients',
      C: 'A managed switch port that aggregates 802.1Q trunks',
      D: 'A test instrument that injects synthetic traffic to benchmark link capacity'
    },
    answer: 'A',
    explanation: 'A TAP is a passive (or semi-passive) inline device that physically copies traffic from a network link to one or more monitoring ports without affecting the original flow. Wireshark/IDS/IPS attaches to the monitoring port and sees full-fidelity traffic. B is wrong (wireless AP). C is fabricated. D describes a traffic generator, not a TAP.',
    source: 'curated',
    addedVersion: '4.85.25',
    addedDate: '2026-05-04'
  },
  {
    type: 'mcq',
    question: 'What is the KEY advantage of a hardware TAP over a SPAN (port mirroring) port for traffic monitoring?',
    difficulty: 'Exam Level',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'A TAP delivers a true unfiltered copy of every frame at full line rate, even under heavy load; a SPAN port can drop frames when oversubscribed and may not forward errored/runt frames',
      B: 'A TAP is cheaper to deploy than a SPAN port',
      C: 'A TAP requires no physical connection to the monitored link',
      D: 'A TAP only captures unencrypted traffic, while SPAN handles all traffic'
    },
    answer: 'A',
    explanation: 'TAPs are passive hardware copies — they reproduce every frame including errored frames, runts, oversized frames, and don\'t drop under load. SPAN ports run on the switch CPU/ASIC and can drop frames when the mirror buffer is overwhelmed (especially during incidents when monitoring matters most). They also typically filter out errored frames. B is reversed — TAPs are usually MORE expensive than configuring a SPAN port. C is wrong — TAPs are inline physical devices. D is fabricated.',
    source: 'curated',
    addedVersion: '4.85.25',
    addedDate: '2026-05-04'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which statements about hardware network TAPs are correct?',
    difficulty: 'Hard',
    topic: 'Network Monitoring & Observability',
    objective: '3.2',
    options: {
      A: 'A passive optical TAP introduces no power requirement on the data path itself — the splitter is purely optical',
      B: 'TAPs are typically deployed inline at strategic chokepoints (uplinks, datacenter edges) to feed IDS/IPS/SIEM/Wireshark',
      C: 'TAPs require firmware updates to learn the network topology',
      D: 'TAPs are always preferred over SPAN ports because they are cheaper',
      E: 'TAPs work only on wireless links, not wired'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are correct. Passive optical TAPs split light with no active electronics on the data path (A) — the data plane keeps working even if the TAP loses power. Strategic chokepoint placement (B) is the standard pattern: feed full-fidelity traffic from key links to IDS, IPS, or capture tools. C is fabricated. D is reversed (TAPs are usually MORE expensive than SPAN). E is wrong — most TAPs are wired (copper or fiber).',
    source: 'curated',
    addedVersion: '4.85.25',
    addedDate: '2026-05-04'
  },
  // ── Phase 3 Cycle 2 R5 add-on: SPLIT HORIZON — 2026-05-04 ──
  {
    type: 'mcq',
    question: 'In distance-vector routing protocols, what is the SPLIT HORIZON rule?',
    difficulty: 'Foundational',
    topic: 'Routing Protocols',
    objective: '2.1',
    options: {
      A: 'A router does not advertise a route back out the same interface from which it learned that route',
      B: 'A router floods every learned route out every interface to ensure full convergence',
      C: 'A router only advertises routes that have been verified by traceroute',
      D: 'A router sends route updates only to neighbors with matching VLAN IDs'
    },
    answer: 'A',
    explanation: 'Split horizon is a loop-prevention rule for distance-vector protocols (RIP, EIGRP): if router A learned a route from router B, A will NOT advertise that route back to B on the same interface. This prevents the simplest "two routers convince each other a dead network is still reachable through the other guy" loop. B is the opposite (and creates loops). C and D are fabricated rules.',
    source: 'curated',
    addedVersion: '4.85.26',
    addedDate: '2026-05-04'
  },
  {
    type: 'mcq',
    question: 'Router A learns about network 10.1.1.0/24 from Router B via interface Gi0/1. Router A is configured with split horizon enabled on Gi0/1. What does split horizon do in this scenario?',
    difficulty: 'Exam Level',
    topic: 'Routing Protocols',
    objective: '2.1',
    options: {
      A: 'Router A will NOT include 10.1.1.0/24 in its routing updates sent out Gi0/1, preventing a routing loop with Router B',
      B: 'Router A will advertise 10.1.1.0/24 with an infinite metric back out Gi0/1',
      C: 'Router A will block all incoming traffic to 10.1.1.0/24 on Gi0/1',
      D: 'Router A will buffer updates for 10.1.1.0/24 and replay them with a delay'
    },
    answer: 'A',
    explanation: 'Split horizon means: omit routes learned via this interface from updates sent out the same interface. Router A learned 10.1.1.0/24 via Gi0/1, so Router A will NOT readvertise that prefix back out Gi0/1. B describes "split horizon with poison reverse" (a related but distinct variation that explicitly advertises the route as unreachable). C and D are fabricated.',
    source: 'curated',
    addedVersion: '4.85.26',
    addedDate: '2026-05-04'
  },
  {
    type: 'multi-select',
    question: '(Choose TWO) Which statements about split horizon and related loop-prevention mechanisms in distance-vector routing are correct?',
    difficulty: 'Hard',
    topic: 'Routing Protocols',
    objective: '2.1',
    options: {
      A: 'Split horizon prevents a router from advertising a route back out the interface it was learned from',
      B: 'Split horizon with POISON REVERSE explicitly advertises the route back with an infinite metric (e.g., 16 in RIP), making the unreachability unambiguous to the neighbor',
      C: 'Split horizon eliminates all routing loops in all topologies, making other mechanisms (holddown timers, triggered updates) unnecessary',
      D: 'Split horizon is exclusive to link-state protocols like OSPF and IS-IS',
      E: 'Split horizon requires manual configuration of an access list per interface'
    },
    answers: ['A', 'B'],
    explanation: 'A and B are correct definitions. Split horizon (A) is the basic rule. Poison reverse (B) is the more aggressive variant that says "I cannot reach this network" rather than just staying silent. C is wrong — split horizon prevents simple two-router loops but not all loops; that\'s why distance-vector protocols also use holddown timers, triggered updates, and route poisoning. D is wrong — split horizon is a DISTANCE-VECTOR mechanism (RIP, EIGRP); link-state protocols like OSPF prevent loops via topology databases, not split horizon. E is wrong — split horizon is built into the protocol\'s update logic, not configured via ACLs.',
    source: 'curated',
    addedVersion: '4.85.26',
    addedDate: '2026-05-04'
  }
  ]
};
