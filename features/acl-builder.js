// ════════════════════════════════════════════════════════════════════
// features/acl-builder.js — Phase 11b feature module (v4.99.43)
// ════════════════════════════════════════════════════════════════════
//
// Extracted from app.js lines 32748-34727 (~1,980 LOC). ACL Builder:
// the standalone rule-builder + first-match-wins simulation engine +
// packet flow animation + Tier C Sonnet coach with hint ladder.
//
// NOT in scope: the ACL Pass-Plan PBQ flow (early-block functions at
// app.js:3425 + 4170 + 4253 + 4379-4430). That feature is part of the
// Pass-Plan exam-readiness card flow; uses different schema + lives
// in the shell. Same acl* prefix is a naming overlap, not architecture.
//
// Animation cleanup: setTimeout-only (no setInterval). Short-lived
// (320ms / 180ms staggers). No persistent timers needing teardown.
// No _aclTeardown shell hook needed — module is animation-free at rest.
// ════════════════════════════════════════════════════════════════════

(function() {
  "use strict";

  function _aclParseCidr(s) {
    if (!s || s === 'any' || s === '*') return { base: 0, mask: 0 };
    const parts = String(s).trim().split('/');
    const addr = parts[0];
    const bits = parts.length > 1 ? parseInt(parts[1], 10) : 32;
    const octets = addr.split('.');
    if (octets.length !== 4) return null;
    let base = 0;
    for (let i = 0; i < 4; i++) {
      const n = parseInt(octets[i], 10);
      if (isNaN(n) || n < 0 || n > 255) return null;
      base = (base * 256) + n;
    }
    if (isNaN(bits) || bits < 0 || bits > 32) return null;
    // Build the mask as unsigned 32-bit. Using `>>> 0` coerces to uint.
    const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
    // Normalise base to the network address so match math is consistent.
    return { base: ((base & mask) >>> 0), mask };
  }
  
  function _aclIpToUint(s) {
    if (!s) return null;
    const o = String(s).trim().split('.');
    if (o.length !== 4) return null;
    let u = 0;
    for (let i = 0; i < 4; i++) {
      const n = parseInt(o[i], 10);
      if (isNaN(n) || n < 0 || n > 255) return null;
      u = (u * 256) + n;
    }
    return u >>> 0;
  }
  
  // Does the packet source/dest IP fall inside the CIDR?
  function _aclCidrContains(cidrSpec, ip) {
    if (!cidrSpec) return false;
    if (cidrSpec === 'any' || cidrSpec === '*') return true;
    const c = _aclParseCidr(cidrSpec);
    const u = _aclIpToUint(ip);
    if (!c || u === null) return false;
    return ((u & c.mask) >>> 0) === c.base;
  }
  
  // Port match. Rule port can be:
  //   • 'any'                     → always matches
  //   • number (80)               → exact match
  //   • '1024-65535' range string → inclusive range
  function _aclPortMatches(rulePort, pktPort) {
    if (rulePort === 'any' || rulePort == null || rulePort === '') return true;
    if (pktPort === 'any' || pktPort == null) return true;
    const pp = parseInt(pktPort, 10);
    if (typeof rulePort === 'number') return pp === rulePort;
    const s = String(rulePort).trim();
    if (s.includes('-')) {
      const [lo, hi] = s.split('-').map(n => parseInt(n, 10));
      return pp >= lo && pp <= hi;
    }
    return pp === parseInt(s, 10);
  }
  
  // Does the packet match this rule? Checks proto, src CIDR, src port,
  // dst CIDR, dst port. Rule fields that are 'any' always match.
  function _aclRuleMatches(rule, pkt) {
    if (!rule || !pkt) return false;
    // Protocol — 'any' matches everything; otherwise exact (tcp/udp/icmp).
    if (rule.proto && rule.proto !== 'any' && rule.proto !== pkt.proto) return false;
    if (!_aclCidrContains(rule.srcAddr, pkt.src)) return false;
    if (!_aclPortMatches(rule.srcPort, pkt.sp)) return false;
    if (!_aclCidrContains(rule.dstAddr, pkt.dst)) return false;
    if (!_aclPortMatches(rule.dstPort, pkt.dp)) return false;
    return true;
  }
  
  // Evaluate a packet against the rule list top-to-bottom. Returns the
  // action (permit / deny) plus which rule matched (or implicit deny at
  // the end). This is the heart of the simulator — everything else is UI.
  function _aclEvalPacket(rules, pkt, mode, connTable) {
    if (!Array.isArray(rules)) rules = [];
    // v4.55.1: stateful mode \u2014 reverse-5-tuple match auto-permits as return traffic.
    const stateful = mode === 'stateful' && connTable && typeof connTable === 'object';
    if (stateful) {
      const reverseKey = _aclFlowKey({ src: pkt.dst, sp: pkt.dp, dst: pkt.src, dp: pkt.sp, proto: pkt.proto });
      if (connTable[reverseKey]) {
        return { action: 'permit', ruleIdx: -1, ruleId: 'state-track', implicit: false, stateTrack: true };
      }
    }
    for (let i = 0; i < rules.length; i++) {
      if (_aclRuleMatches(rules[i], pkt)) {
        const action = rules[i].action;
        if (stateful && action === 'permit') {
          connTable[_aclFlowKey(pkt)] = true;
        }
        return { action, ruleIdx: i, ruleId: rules[i].id, implicit: false };
      }
    }
    return { action: 'deny', ruleIdx: -1, ruleId: 'implicit-deny', implicit: true };
  }
  
  // v4.55.1: 5-tuple canonical key for the stateful connection table.
  function _aclFlowKey(pkt) {
    return [pkt.proto, pkt.src, pkt.sp, pkt.dst, pkt.dp].join('|');
  }
  
  // v4.55.1: batch flow evaluator for stateful grading. Processes packets
  // in order, builds a shared connTable so later packets get the benefit
  // of earlier permits (reverse-tuple match \u2192 auto-permit).
  function _aclEvaluateFlowsStateful(rules, packets) {
    const connTable = {};
    return packets.map(pkt => _aclEvalPacket(rules, pkt, 'stateful', connTable));
  }
  
  // Grade a rule list against a scenario: run each canned test packet,
  // check outcome vs expected. Returns { passed, total, details: [...] }.
  // Outcome-based (not rule-order-based) so there are many valid solutions.
  function _aclGradeScenario(rules, scenario) {
    if (!scenario || !Array.isArray(scenario.testPackets)) {
      return { passed: 0, total: 0, details: [] };
    }
    // v4.55.1: stateful mode routes through the batch evaluator so the
    // connection table is shared across packets in the scenario \u2014 return
    // traffic auto-permits even without an explicit reverse rule.
    const stateful = scenario.mode === 'stateful';
    const results = stateful
      ? _aclEvaluateFlowsStateful(rules, scenario.testPackets)
      : scenario.testPackets.map(pkt => _aclEvalPacket(rules, pkt));
    const details = scenario.testPackets.map((pkt, i) => {
      const result = results[i];
      return {
        label: pkt.label,
        packet: pkt,
        expected: pkt.expected,
        actual: result.action,
        pass: result.action === pkt.expected,
        ruleIdx: result.ruleIdx,
        implicit: result.implicit,
        stateTrack: !!result.stateTrack
      };
    });
    const passed = details.filter(d => d.pass).length;
    return { passed, total: details.length, details };
  }
  
  // ── ACL SCENARIOS ──
  // 8 hand-authored scenarios + Free Build. Each has objectives (N10-009),
  // requirements (human-readable checklist), zones (read-only topology),
  // testPackets (the canonical grader), and an explanation block matching
  // the TB scenarios schema so the Learn-more panel can render the same
  // 5-section pedagogical layout.
  const ACL_SCENARIOS = [
    {
      id: 'free-build',
      title: 'Free Build',
      icon: '\ud83e\uddea',
      category: 'Sandbox',
      difficulty: 'beginner',
      description: 'Experiment freely \u2014 add rules, test packets, learn how first-match-wins and implicit-deny behave.',
      objectives: [],
      zones: [
        { name: 'Network A', cidr: '10.10.0.0/24', color: '#7c6ff7' },
        { name: 'Network B', cidr: '10.20.0.0/24', color: '#22c55e' },
        { name: 'Internet',  cidr: 'any',          color: '#3b82f6' }
      ],
      requirements: [],
      testPackets: [],
      explanation: null
    },
    {
      id: 'block-single-host',
      title: 'Block a Single Host',
      icon: '\ud83d\udeab',
      category: 'Fundamentals',
      difficulty: 'beginner',
      description: 'A compromised workstation at 10.0.0.50 needs to be fully isolated. Block all traffic from that host; allow everyone else.',
      objectives: ['4.3'],
      zones: [
        { name: 'Quarantined', cidr: '10.0.0.50/32', color: '#ef4444' },
        { name: 'LAN',         cidr: '10.0.0.0/24',  color: '#7c6ff7' },
        { name: 'Internet',    cidr: 'any',          color: '#3b82f6' }
      ],
      requirements: [
        'Block ALL traffic from 10.0.0.50',
        'Allow the rest of the 10.0.0.0/24 LAN to reach the internet',
        'Specific denies before broader permits (rule-order discipline)'
      ],
      testPackets: [
        { src: '10.0.0.50', sp: 'any', dst: '8.8.8.8',  dp:  53, proto: 'udp', expected: 'deny',   label: 'Quarantined host \u2192 DNS' },
        { src: '10.0.0.50', sp: 'any', dst: '93.184.216.34', dp: 443, proto: 'tcp', expected: 'deny',   label: 'Quarantined host \u2192 HTTPS' },
        { src: '10.0.0.20', sp: 'any', dst: '8.8.8.8',  dp:  53, proto: 'udp', expected: 'permit', label: 'Clean host \u2192 DNS' },
        { src: '10.0.0.20', sp: 'any', dst: '93.184.216.34', dp: 443, proto: 'tcp', expected: 'permit', label: 'Clean host \u2192 HTTPS' }
      ],
      explanation: {
        overview: 'When you need to isolate a single host (e.g. malware-infected or leaked creds), you add a specific-to-broad ACL. The golden rule: the narrowest rule goes at the top so it fires before broader permits match.',
        dataFlow: 'A packet from 10.0.0.50 hits your ACL. If rule 1 says "deny 10.0.0.50 any any", the rule matches on the very first check and the packet is dropped before the broader "permit 10.0.0.0/24" rule is ever evaluated. Reverse the order and the compromised host slips through because the broader permit matches first.',
        keyDevices: [
          { name: 'ACL at the LAN egress router', role: 'First chokepoint for outbound traffic \u2014 classic host-isolation placement.' },
          { name: 'Quarantined host 10.0.0.50',   role: 'Cannot originate any traffic past the ACL.' },
          { name: 'Clean LAN 10.0.0.0/24',        role: 'All other hosts retain full outbound internet access.' }
        ],
        concepts: [
          { term: 'First-match-wins',     meaning: 'An ACL evaluates rules top-to-bottom; the first rule that matches determines the action and no further rules are checked.' },
          { term: 'Specific-to-broad',    meaning: 'Narrow rules (single host / specific port) belong at the top; broad rules (subnet / any) at the bottom.' },
          { term: 'Host route /32',       meaning: 'A single IP expressed as CIDR \u2014 10.0.0.50/32 means exactly that one address.' },
          { term: 'Stateless ACL',        meaning: 'Each packet is evaluated independently. Return traffic needs its own permit rule (unlike stateful firewalls).' }
        ],
        examTies: 'N10-009 Objective 4.3 (network hardening). Rule-order questions are a staple of the Security domain \u2014 CompTIA PBQs frequently ask which rule matched or why a "permit" is being blocked.'
      }
    },
    {
      id: 'https-only',
      title: 'Allow HTTPS Outbound Only',
      icon: '\ud83d\udd12',
      category: 'Fundamentals',
      difficulty: 'beginner',
      description: 'A high-security workstation subnet is allowed to browse the web over HTTPS only. Block plain HTTP, FTP, everything else. Rely on implicit deny.',
      objectives: ['4.3'],
      zones: [
        { name: 'Secure Workstations', cidr: '192.168.50.0/24', color: '#7c6ff7' },
        { name: 'Internet',            cidr: 'any',             color: '#3b82f6' }
      ],
      requirements: [
        'Allow 192.168.50.0/24 outbound to any destination on TCP port 443',
        'Allow DNS lookups (UDP 53) so browsers can resolve names',
        'Everything else blocked \u2014 rely on implicit deny'
      ],
      testPackets: [
        { src: '192.168.50.10', sp: 'any', dst: '1.1.1.1',     dp:  53, proto: 'udp', expected: 'permit', label: 'HTTPS workstation \u2192 DNS' },
        { src: '192.168.50.10', sp: 'any', dst: '93.184.216.34', dp: 443, proto: 'tcp', expected: 'permit', label: 'HTTPS workstation \u2192 HTTPS' },
        { src: '192.168.50.10', sp: 'any', dst: '93.184.216.34', dp:  80, proto: 'tcp', expected: 'deny',   label: 'HTTPS workstation \u2192 plain HTTP' },
        { src: '192.168.50.10', sp: 'any', dst: '93.184.216.34', dp:  21, proto: 'tcp', expected: 'deny',   label: 'HTTPS workstation \u2192 FTP' }
      ],
      explanation: {
        overview: 'Default-deny with a tiny permit list is the classic hardening posture \u2014 common for PCI compliance, kiosk networks, and any system that shouldn\'t talk to arbitrary internet services.',
        dataFlow: 'Browser needs DNS first (UDP 53) \u2192 rule 1 permits it. Then TCP handshake to :443 \u2192 rule 2 permits. A plain HTTP request hits :80 \u2192 no permit rule matches \u2192 implicit-deny at the end blocks it.',
        keyDevices: [
          { name: 'Edge firewall / ACL',     role: 'Single enforcement point for outbound policy.' },
          { name: 'Internal DNS resolver',   role: 'Not needed here \u2014 clients can use public DNS with the UDP 53 permit.' },
          { name: 'Secure workstations',     role: 'Locked down to HTTPS + DNS only.' }
        ],
        concepts: [
          { term: 'Implicit deny',          meaning: 'If no rule matches, the default action is deny. This means you only need permit rules for the traffic you want to allow.' },
          { term: 'Default-deny posture',   meaning: 'The opposite of "allow everything unless blocked" \u2014 safer but requires knowing your app\'s ports up front.' },
          { term: 'DNS on UDP 53',          meaning: 'Recursive DNS queries use UDP 53 by default (TCP 53 is reserved for large responses / zone transfers).' },
          { term: 'Stateless reply traffic',meaning: 'In a stateless ACL the return packets are evaluated as their own flow \u2014 in this scenario we\'re only grading the outbound direction.' }
        ],
        examTies: 'N10-009 Objective 4.3. Implicit deny is one of the most commonly-missed PBQ concepts: students add a final "deny any" explicitly when implicit-deny already covers it, or forget that default-deny means they need every permit rule they want.'
      }
    },
    {
      id: 'guest-to-hr',
      title: 'Guest Isolation from HR',
      icon: '\ud83c\udfe2',
      category: 'Real-world',
      difficulty: 'intermediate',
      description: 'Guest Wi-Fi clients must reach the internet freely but must NOT reach the internal HR subnet. Classic VLAN isolation pattern.',
      objectives: ['4.3', '4.5'],
      zones: [
        { name: 'Guest VLAN', cidr: '10.10.0.0/24', color: '#f59e0b' },
        { name: 'HR Subnet',  cidr: '10.20.0.0/24', color: '#ef4444' },
        { name: 'Internet',   cidr: 'any',          color: '#3b82f6' }
      ],
      requirements: [
        'Deny ALL traffic from Guest VLAN (10.10.0.0/24) to HR Subnet (10.20.0.0/24)',
        'Allow Guest VLAN to reach the internet on HTTPS (TCP 443) and DNS (UDP 53)',
        'HR Subnet is not affected by this ACL'
      ],
      testPackets: [
        { src: '10.10.0.5', sp: 'any', dst: '10.20.0.10', dp: 445, proto: 'tcp', expected: 'deny',   label: 'Guest \u2192 HR SMB' },
        { src: '10.10.0.5', sp: 'any', dst: '10.20.0.10', dp:  80, proto: 'tcp', expected: 'deny',   label: 'Guest \u2192 HR web' },
        { src: '10.10.0.5', sp: 'any', dst: '8.8.8.8',    dp: 443, proto: 'tcp', expected: 'permit', label: 'Guest \u2192 Internet HTTPS' },
        { src: '10.10.0.5', sp: 'any', dst: '1.1.1.1',    dp:  53, proto: 'udp', expected: 'permit', label: 'Guest \u2192 DNS' },
        { src: '10.10.0.5', sp: 'any', dst: '8.8.8.8',    dp:  80, proto: 'tcp', expected: 'deny',   label: 'Guest \u2192 plain HTTP (no permit)' }
      ],
      explanation: {
        overview: 'East-west segmentation is where most real network-security value lives. Guest Wi-Fi isolation is the textbook case \u2014 untrusted clients need internet but must never touch internal resources.',
        dataFlow: 'A guest laptop tries to reach the HR fileshare (SMB 445). First rule: "deny guest\u2192HR any". Match on first check; dropped. A minute later the same laptop tries google.com:443. Rules 1 and 2 don\'t match (HR deny, other denies); rule 3 permits guest\u2192443. Packet forwarded.',
        keyDevices: [
          { name: 'Inter-VLAN router / L3 switch', role: 'Where the ACL is applied \u2014 guest and HR are on different VLANs routed through here.' },
          { name: 'Guest wireless controller',     role: 'Puts all guest clients on the 10.10.0.0/24 VLAN.' },
          { name: 'HR file server 10.20.0.10',     role: 'What we\'re protecting \u2014 sensitive HR data.' }
        ],
        concepts: [
          { term: 'East-west traffic',     meaning: 'Traffic between internal VLANs (as opposed to north-south = client\u2194internet). The new frontier of network security.' },
          { term: 'VLAN isolation via ACL',meaning: 'Instead of physical separation, ACLs on the inter-VLAN router enforce which VLANs can talk to which.' },
          { term: 'Zero-trust on the LAN', meaning: 'Don\'t assume "inside the firewall" means "trusted" \u2014 guest traffic on your LAN is still external risk.' },
          { term: 'Port-agnostic deny',    meaning: 'The deny rule uses "any" for ports because guest\u2192HR on ANY port is disallowed, not just one.' }
        ],
        examTies: 'N10-009 Objectives 4.3 + 4.5. VLAN isolation + guest-network hardening are staples of the Security domain. CompTIA loves PBQs where students must identify why traffic is being blocked unexpectedly (often: a higher-priority deny).'
      }
    },
    {
      id: 'dmz-web',
      title: 'DMZ Web Server Policy',
      icon: '\ud83c\udf10',
      category: 'Real-world',
      difficulty: 'intermediate',
      description: 'Public web server in the DMZ must be reachable from the internet on HTTP and HTTPS. Everything else inbound to the DMZ is blocked.',
      objectives: ['4.3', '4.5'],
      zones: [
        { name: 'Internet',       cidr: 'any',           color: '#3b82f6' },
        { name: 'DMZ Web Server', cidr: '203.0.113.10/32', color: '#22c55e' },
        { name: 'Internal LAN',   cidr: '10.0.0.0/8',    color: '#7c6ff7' }
      ],
      requirements: [
        'Allow any source \u2192 DMZ web server on TCP 80',
        'Allow any source \u2192 DMZ web server on TCP 443',
        'Deny everything else inbound to the DMZ (implicit deny works)'
      ],
      testPackets: [
        { src: '198.51.100.5', sp: 'any', dst: '203.0.113.10', dp: 443, proto: 'tcp', expected: 'permit', label: 'Internet \u2192 DMZ HTTPS' },
        { src: '198.51.100.5', sp: 'any', dst: '203.0.113.10', dp:  80, proto: 'tcp', expected: 'permit', label: 'Internet \u2192 DMZ HTTP' },
        { src: '198.51.100.5', sp: 'any', dst: '203.0.113.10', dp:  22, proto: 'tcp', expected: 'deny',   label: 'Internet \u2192 DMZ SSH (attacker)' },
        { src: '198.51.100.5', sp: 'any', dst: '203.0.113.10', dp: 445, proto: 'tcp', expected: 'deny',   label: 'Internet \u2192 DMZ SMB (attacker)' },
        { src: '198.51.100.5', sp: 'any', dst: '203.0.113.10', dp: 3389, proto: 'tcp', expected: 'deny',   label: 'Internet \u2192 DMZ RDP (attacker)' }
      ],
      explanation: {
        overview: 'The DMZ hosts services you intentionally expose to the internet. Your inbound ACL should permit only the ports those services use \u2014 everything else (SSH, RDP, SMB, database ports) must be blocked, because attackers routinely probe for them.',
        dataFlow: 'A legitimate user hits https://web.example.com \u2192 DNS resolves to 203.0.113.10 \u2192 TCP handshake to :443 \u2192 rule 1 matches (permit any\u2192DMZ:443) \u2192 forwarded. An attacker scans :22 \u2192 no permit rule matches \u2192 implicit-deny drops it.',
        keyDevices: [
          { name: 'Perimeter firewall',    role: 'Holds the inbound ACL; sits between internet and DMZ.' },
          { name: 'Web server 203.0.113.10', role: 'Runs a web app on TCP 80 + 443.' },
          { name: 'DMZ segment',            role: 'Isolated subnet \u2014 if the web server is pwned, attackers can\'t pivot to the internal LAN through it.' }
        ],
        concepts: [
          { term: 'DMZ',             meaning: 'Demilitarized Zone \u2014 a network segment that hosts publicly-accessible servers while isolating them from the internal LAN.' },
          { term: 'Exposed ports',   meaning: 'The minimal set of ports needed for the service to function \u2014 80 + 443 for web, 25 + 587 for SMTP, etc.' },
          { term: 'Port scanning',   meaning: 'Attackers send probe packets to every common port looking for anything exposed. Implicit-deny neutralises this.' },
          { term: 'Screened subnet', meaning: 'Modern name for DMZ \u2014 N10-009 uses both terms.' }
        ],
        examTies: 'N10-009 Objectives 4.3 + 4.5. DMZ / screened-subnet design is a major Security-domain topic. PBQs often show a scenario where an attacker reached an internal service \u2014 the answer is usually "SSH was open to the internet when it shouldn\'t have been."'
      }
    },
    {
      id: 'dns-only-lab',
      title: 'DNS-Only Lab Network',
      icon: '\ud83e\uddea',
      category: 'Real-world',
      difficulty: 'intermediate',
      description: 'A quarantined lab subnet can only reach your internal DNS server. No other outbound traffic is permitted. Tight containment.',
      objectives: ['4.3'],
      zones: [
        { name: 'Lab Subnet',     cidr: '172.16.99.0/24', color: '#f59e0b' },
        { name: 'Internal DNS',   cidr: '10.0.0.53/32',   color: '#22c55e' },
        { name: 'Rest of Network',cidr: '10.0.0.0/8',     color: '#7c6ff7' }
      ],
      requirements: [
        'Allow 172.16.99.0/24 \u2192 10.0.0.53 on UDP 53',
        'Allow 172.16.99.0/24 \u2192 10.0.0.53 on TCP 53 (large responses)',
        'Deny 172.16.99.0/24 to anywhere else'
      ],
      testPackets: [
        { src: '172.16.99.40', sp: 'any', dst: '10.0.0.53',  dp:  53, proto: 'udp', expected: 'permit', label: 'Lab \u2192 DNS UDP' },
        { src: '172.16.99.40', sp: 'any', dst: '10.0.0.53',  dp:  53, proto: 'tcp', expected: 'permit', label: 'Lab \u2192 DNS TCP' },
        { src: '172.16.99.40', sp: 'any', dst: '10.0.0.10',  dp:  80, proto: 'tcp', expected: 'deny',   label: 'Lab \u2192 internal web (disallowed)' },
        { src: '172.16.99.40', sp: 'any', dst: '8.8.8.8',    dp:  53, proto: 'udp', expected: 'deny',   label: 'Lab \u2192 public DNS (disallowed)' },
        { src: '172.16.99.40', sp: 'any', dst: '10.0.0.53',  dp:  22, proto: 'tcp', expected: 'deny',   label: 'Lab \u2192 DNS server SSH (disallowed)' }
      ],
      explanation: {
        overview: 'Highly-restricted subnets are common for malware-analysis labs, forensic workstations, and payment-card systems. The pattern: permit only the specific flows you need, deny everything else.',
        dataFlow: 'A researcher\'s lab VM needs to resolve a suspected-malicious domain. DNS query (UDP 53) to 10.0.0.53 \u2014 permit rule 1 fires. Malware on the same VM tries to call home on port 443 \u2014 no rule matches, implicit-deny blocks it. Critically, the lab can\'t even reach public DNS (8.8.8.8) so the malware can\'t use alternative resolvers.',
        keyDevices: [
          { name: 'Internal DNS server 10.0.0.53', role: 'The single allowed outbound destination for the lab subnet.' },
          { name: 'Lab VM host',                    role: 'Runs isolated virtual machines for analysis.' },
          { name: 'Containment router',             role: 'Enforces the deny-all-except-DNS policy.' }
        ],
        concepts: [
          { term: 'Network containment',   meaning: 'Restricting a compromised or risky host\'s ability to reach other systems \u2014 the inverse of lateral movement.' },
          { term: 'Why TCP 53 too',        meaning: 'DNS uses UDP for normal queries but falls back to TCP for responses larger than 512 bytes (e.g. DNSSEC, zone transfers).' },
          { term: 'Specific service allow',meaning: 'Even to the one permitted destination, only port 53 is allowed \u2014 the DNS server\'s SSH port is still blocked.' },
          { term: 'No internet = no C2',   meaning: 'Blocking public DNS prevents malware from using DNS tunneling or alternative resolvers to reach command-and-control.' }
        ],
        examTies: 'N10-009 Objective 4.3. Network segmentation + containment patterns. Be able to read an ACL and identify what the compromised host CAN and CANNOT reach.'
      }
    },
    {
      id: 'rule-order-trap',
      title: 'Rule-Order Trap',
      icon: '\u26a0\ufe0f',
      category: 'PBQ Trap',
      difficulty: 'advanced',
      description: 'The classic exam gotcha: you have the right rules, but they\'re in the wrong order. Fix the ordering so finance hosts can reach the payment gateway while everyone else is blocked.',
      objectives: ['4.3'],
      zones: [
        { name: 'Finance Hosts',   cidr: '10.30.10.0/24',    color: '#22c55e' },
        { name: 'Other LAN',       cidr: '10.30.0.0/16',     color: '#7c6ff7' },
        { name: 'Payment Gateway', cidr: '203.0.113.200/32', color: '#3b82f6' }
      ],
      requirements: [
        'Permit 10.30.10.0/24 \u2192 203.0.113.200 on TCP 443',
        'Deny the rest of 10.30.0.0/16 \u2192 203.0.113.200',
        'Rule ORDER matters: the specific permit must come BEFORE the broader deny'
      ],
      testPackets: [
        { src: '10.30.10.5', sp: 'any', dst: '203.0.113.200', dp: 443, proto: 'tcp', expected: 'permit', label: 'Finance host \u2192 Payment (should permit)' },
        { src: '10.30.50.5', sp: 'any', dst: '203.0.113.200', dp: 443, proto: 'tcp', expected: 'deny',   label: 'Other LAN host \u2192 Payment (should deny)' },
        { src: '10.30.10.5', sp: 'any', dst: '8.8.8.8',       dp: 443, proto: 'tcp', expected: 'deny',   label: 'Finance host \u2192 Internet (no rule, implicit deny)' }
      ],
      explanation: {
        overview: 'The most-failed concept on real exams: "these rules look right \u2014 why is traffic being blocked?" Answer: rule 2 is a broader match that fires before rule 1 can match. Specific rules must go first.',
        dataFlow: 'Finance host 10.30.10.5 sends a packet to 203.0.113.200:443. If your rule list is `deny 10.30.0.0/16 \u2192 Payment` THEN `permit 10.30.10.0/24 \u2192 Payment`, the first rule matches (10.30.10.5 is inside 10.30.0.0/16) and the packet is DENIED. The permit never gets evaluated. Flip the order and the specific permit fires first.',
        keyDevices: [
          { name: 'Border router', role: 'Holds the ACL \u2014 rule order determines who reaches the payment gateway.' },
          { name: 'Finance hosts', role: 'Need TCP 443 access to the payment gateway for card processing.' },
          { name: 'Payment gateway', role: 'External SaaS \u2014 restricting which internal hosts can reach it is a compliance requirement (PCI DSS).' }
        ],
        concepts: [
          { term: 'First-match-wins',        meaning: 'The ACL stops evaluating at the first matching rule. Order is load-bearing.' },
          { term: 'Specific-before-general', meaning: 'A /24 inside a /16 is more specific. The /24 rule must come first.' },
          { term: 'Why this compiles',       meaning: 'The rules look individually correct \u2014 there\'s no syntax error. The bug is strictly in ordering. This is what makes it a PBQ trap.' },
          { term: 'PCI DSS analog',          meaning: 'Real-world this pattern gates card-data access to only certified workstations. Getting rule-order wrong means either compliance failure OR the finance team can\'t work.' }
        ],
        examTies: 'N10-009 Objective 4.3. Rule-ordering PBQs appear on virtually every N10-009 form. Read the rules as the firewall reads them: top-to-bottom, stop on first match.'
      }
    },
    {
      id: 'implicit-deny-gotcha',
      title: 'Implicit-Deny Gotcha',
      icon: '\ud83c\udfaf',
      category: 'PBQ Trap',
      difficulty: 'advanced',
      description: 'Write an ACL for a web team\'s subnet: HTTPS out, NTP for time sync, SSH to the build server. Test packets will check your understanding of implicit deny.',
      objectives: ['4.3'],
      zones: [
        { name: 'Web Team',       cidr: '10.40.0.0/24',  color: '#7c6ff7' },
        { name: 'Build Server',   cidr: '10.0.5.20/32',  color: '#22c55e' },
        { name: 'NTP Server',     cidr: '10.0.5.123/32', color: '#f59e0b' },
        { name: 'Internet',       cidr: 'any',           color: '#3b82f6' }
      ],
      requirements: [
        'Permit 10.40.0.0/24 \u2192 Internet on TCP 443 (HTTPS)',
        'Permit 10.40.0.0/24 \u2192 10.0.5.123 on UDP 123 (NTP)',
        'Permit 10.40.0.0/24 \u2192 10.0.5.20 on TCP 22 (SSH to build)',
        'Everything else: rely on implicit deny'
      ],
      testPackets: [
        { src: '10.40.0.5', sp: 'any', dst: '93.184.216.34', dp: 443, proto: 'tcp', expected: 'permit', label: 'Web team \u2192 HTTPS' },
        { src: '10.40.0.5', sp: 'any', dst: '10.0.5.123',    dp: 123, proto: 'udp', expected: 'permit', label: 'Web team \u2192 NTP' },
        { src: '10.40.0.5', sp: 'any', dst: '10.0.5.20',     dp:  22, proto: 'tcp', expected: 'permit', label: 'Web team \u2192 Build SSH' },
        { src: '10.40.0.5', sp: 'any', dst: '10.0.5.20',     dp: 445, proto: 'tcp', expected: 'deny',   label: 'Web team \u2192 Build SMB (not permitted)' },
        { src: '10.40.0.5', sp: 'any', dst: '10.0.5.50',     dp:  22, proto: 'tcp', expected: 'deny',   label: 'Web team \u2192 OTHER server SSH (not permitted)' },
        { src: '10.40.0.5', sp: 'any', dst: '93.184.216.34', dp:  80, proto: 'tcp', expected: 'deny',   label: 'Web team \u2192 plain HTTP' }
      ],
      explanation: {
        overview: 'Students commonly forget that an implicit deny covers ALL unmatched traffic, not just "obviously bad" traffic. Here the build server is a permitted destination \u2014 but only on port 22. SMB (445) to the same host is still denied because no permit rule matches it.',
        dataFlow: 'Web team host sends SSH to the build server \u2014 rule 3 matches, permitted. Same host sends SMB to the build server \u2014 no permit rule covers TCP 445 to that host, so implicit deny fires. The destination IP being "allowed" for one service doesn\'t make it allowed for all services.',
        keyDevices: [
          { name: 'Web team router/firewall', role: 'Enforces the outbound ACL.' },
          { name: 'Build server',             role: 'Allowed destination \u2014 but only on SSH. Not a blanket pass.' },
          { name: 'NTP server',               role: 'Time sync is quiet but essential \u2014 broken time breaks logging, certs, Kerberos.' }
        ],
        concepts: [
          { term: 'Implicit deny covers everything', meaning: 'It\'s not a "deny internet only" default \u2014 it covers ANY flow that didn\'t match a permit, including internal destinations.' },
          { term: 'Per-service permits',    meaning: 'Allowing host X doesn\'t mean allowing all ports to X. Each (src, dst, proto, port) quadruple needs its own permit.' },
          { term: 'NTP on UDP 123',         meaning: 'Time sync uses UDP 123 by convention. Blocking it breaks Kerberos authentication and TLS certificate validation.' },
          { term: 'HTTP \u2192 HTTPS redirect', meaning: 'Most modern sites redirect 80\u2192443 server-side. Blocking outbound 80 is usually safe \u2014 the redirect still comes back on 443.' }
        ],
        examTies: 'N10-009 Objective 4.3. Implicit deny on both sides of a permit (the "build server on 22 permitted, on 445 denied") is a high-frequency trap \u2014 know that a destination-host permit is NOT a blanket permit.'
      }
    },
    {
      id: 'layered-defense',
      title: 'Layered Defence: Tier-Based Access',
      icon: '\ud83d\udee1\ufe0f',
      category: 'PBQ Trap',
      difficulty: 'advanced',
      description: 'Three tiers with different trust levels. Admin workstations can reach anything. Developer workstations can reach dev + staging. End-user workstations can only reach the internet. No cross-tier escalation.',
      objectives: ['4.3', '4.5'],
      zones: [
        { name: 'Admin Workstations', cidr: '10.50.1.0/24',  color: '#ef4444' },
        { name: 'Dev Workstations',   cidr: '10.50.2.0/24',  color: '#f59e0b' },
        { name: 'End-Users',          cidr: '10.50.3.0/24',  color: '#7c6ff7' },
        { name: 'Dev Server',         cidr: '10.60.1.0/24',  color: '#22c55e' },
        { name: 'Staging Server',     cidr: '10.60.2.0/24',  color: '#22c55e' },
        { name: 'Production Server',  cidr: '10.60.3.0/24',  color: '#3b82f6' }
      ],
      requirements: [
        'Permit Admin (10.50.1.0/24) \u2192 ANY internal server (10.60.0.0/16)',
        'Permit Dev (10.50.2.0/24) \u2192 Dev (10.60.1.0/24) on TCP 22',
        'Permit Dev (10.50.2.0/24) \u2192 Staging (10.60.2.0/24) on TCP 22',
        'Deny everyone else to internal servers',
        'Permit all 3 workstation tiers outbound to internet on TCP 443'
      ],
      testPackets: [
        { src: '10.50.1.5', sp: 'any', dst: '10.60.3.10', dp:  22, proto: 'tcp', expected: 'permit', label: 'Admin \u2192 Prod SSH' },
        { src: '10.50.2.5', sp: 'any', dst: '10.60.1.10', dp:  22, proto: 'tcp', expected: 'permit', label: 'Dev \u2192 Dev SSH' },
        { src: '10.50.2.5', sp: 'any', dst: '10.60.2.10', dp:  22, proto: 'tcp', expected: 'permit', label: 'Dev \u2192 Staging SSH' },
        { src: '10.50.2.5', sp: 'any', dst: '10.60.3.10', dp:  22, proto: 'tcp', expected: 'deny',   label: 'Dev \u2192 Prod SSH (forbidden!)' },
        { src: '10.50.3.5', sp: 'any', dst: '10.60.1.10', dp:  22, proto: 'tcp', expected: 'deny',   label: 'End-user \u2192 Dev (forbidden)' },
        { src: '10.50.3.5', sp: 'any', dst: '93.184.216.34', dp: 443, proto: 'tcp', expected: 'permit', label: 'End-user \u2192 Internet HTTPS' },
        { src: '10.50.1.5', sp: 'any', dst: '93.184.216.34', dp: 443, proto: 'tcp', expected: 'permit', label: 'Admin \u2192 Internet HTTPS' }
      ],
      explanation: {
        overview: 'Enterprise ACLs are rarely a single deny-list. They\'re layered role-based access: multiple source tiers, multiple destination tiers, and specific permit matrices between them. Getting this right requires thinking about each source\u2194destination pair separately.',
        dataFlow: 'A dev workstation tries SSH to production. No rule grants dev\u2192prod (only dev\u2192dev and dev\u2192staging). Implicit deny blocks it. The same dev workstation hits Google on :443 \u2014 rule X (internet-for-all) permits it. Role-based ACLs work because the permit set is minimal and the implicit deny catches all the "wait, can they do THAT too?" cases.',
        keyDevices: [
          { name: 'Inter-VLAN router / firewall', role: 'Holds the full layered ACL \u2014 often hundreds of rules in real environments.' },
          { name: 'Role-separated workstation VLANs', role: 'Admin / Dev / End-user each get their own subnet with a role tag.' },
          { name: 'Environment-separated servers',  role: 'Dev / Staging / Prod are distinct subnets so ACLs can target them independently.' }
        ],
        concepts: [
          { term: 'Role-based access control (RBAC)', meaning: 'Permissions granted by role, not by individual identity. Implemented at the network layer via per-VLAN ACLs.' },
          { term: 'Defence-in-depth',        meaning: 'Multiple overlapping controls \u2014 network ACL + host firewall + app auth. An attacker has to defeat all of them, not just one.' },
          { term: 'Principle of least privilege', meaning: 'Each tier gets exactly the access it needs, nothing more. Dev doesn\'t get prod "just in case."' },
          { term: 'Environment isolation',    meaning: 'Keeping dev/staging/prod in separate network zones prevents accidental data exfiltration (e.g. a test job pointing at the prod DB).' }
        ],
        examTies: 'N10-009 Objectives 4.3 + 4.5. Multi-tier ACL reading is where high-performing exam takers separate from the rest. Practice reading complex ACLs and answering "which host can do what?" questions.'
      }
    },
    // ═══════════════════════════════════════════════════════════════════
    // v4.55.0 FIX-IT SCENARIOS (6 \u2014 2 beg / 2 int / 2 adv)
    // Each scenario ships a BROKEN rule list via `initialRules`. Student
    // diagnoses the fault + edits/reorders/replaces rules to pass all test
    // packets. Mirrors the real N10-009 PBQ pattern: "this ACL isn't
    // working \u2014 why?"
    // ═══════════════════════════════════════════════════════════════════
    {
      id: 'fix-order',
      title: 'Fix: Wrong Rule Order',
      icon: '\ud83d\udd04',
      category: 'Fix It',
      difficulty: 'beginner',
      description: 'Finance traffic to the payment server is being DROPPED when it should be allowed. The rules look OK at first glance \u2014 but first-match-wins. Rearrange the rules so finance can still reach the payment server.',
      objectives: ['4.3'],
      zones: [
        { name: 'Finance VLAN', cidr: '10.0.10.0/24', color: '#7c6ff7' },
        { name: 'Payment Svr',  cidr: '10.0.50.5/32', color: '#22c55e' },
        { name: 'Internet',     cidr: 'any',          color: '#3b82f6' }
      ],
      requirements: [
        'Finance hosts (10.0.10.0/24) must reach payment server (10.0.50.5:443/tcp)',
        'Block all other access to payment server from finance',
        'Do NOT delete rules \u2014 just reorder them'
      ],
      initialRules: [
        { id: 'r_fx_ord_1', action: 'deny',   srcAddr: '10.0.10.0/24', srcPort: 'any', dstAddr: '10.0.50.0/24', dstPort: 'any', proto: 'any', comment: 'Block finance from hitting 10.0.50.0/24' },
        { id: 'r_fx_ord_2', action: 'permit', srcAddr: '10.0.10.0/24', srcPort: 'any', dstAddr: '10.0.50.5/32', dstPort: 443,   proto: 'tcp', comment: 'Allow finance \u2192 payment HTTPS' }
      ],
      hints: [
        'ACLs are evaluated top-to-bottom, first-match-wins. Which rule fires first for the finance \u2192 payment HTTPS packet?',
        'Rule #1 (the broad deny) matches the finance-to-payment HTTPS packet because its CIDR covers the payment server. Rule #2 never runs. Order matters.',
        'Swap the two rules. Put the specific permit (rule #2) ABOVE the broad deny (rule #1). Use the up/down arrows on each rule.'
      ],
      solution: [
        { action: 'permit', srcAddr: '10.0.10.0/24', srcPort: 'any', dstAddr: '10.0.50.5/32', dstPort: 443, proto: 'tcp', comment: 'Finance \u2192 payment HTTPS (specific permit first)' },
        { action: 'deny',   srcAddr: '10.0.10.0/24', srcPort: 'any', dstAddr: '10.0.50.0/24', dstPort: 'any', proto: 'any', comment: 'Block all other finance \u2192 payment-subnet traffic' }
      ],
      testPackets: [
        { src: '10.0.10.25', sp: 52000, dst: '10.0.50.5', dp: 443, proto: 'tcp', expected: 'permit', label: 'Finance host \u2192 Payment HTTPS (must work)' },
        { src: '10.0.10.30', sp: 52001, dst: '10.0.50.7', dp: 22,  proto: 'tcp', expected: 'deny',   label: 'Finance \u2192 other svr SSH (must block)' },
        { src: '10.0.10.40', sp: 52002, dst: '10.0.50.5', dp: 3389, proto: 'tcp', expected: 'deny',  label: 'Finance \u2192 payment RDP (must block)' }
      ],
      explanation: {
        overview: 'Rules are evaluated top to bottom, first match wins. A broad deny on 10.0.50.0/24 at rule #1 fires first, so the specific permit at rule #2 is never reached.',
        dataFlow: 'Packet arrives: finance host \u2192 payment:443/tcp. Rule #1 (broad deny) sees source in finance + dest in /24 \u2192 match \u2192 DENY. Rule #2 never runs. The fix: move the specific permit ABOVE the broad deny.',
        keyDevices: [
          { name: 'Inter-VLAN ACL', role: 'Lives on the router/firewall between VLANs. Evaluates every packet top-to-bottom.' }
        ],
        concepts: [
          { term: 'First-match-wins', meaning: 'ACL evaluation stops at the first rule that matches. Order matters enormously.' },
          { term: 'Specificity before generality', meaning: 'Put narrow permits ABOVE broad denies, not the other way around.' }
        ],
        examTies: 'N10-009 Objective 4.3. The single most common ACL PBQ: "this traffic is being blocked when it shouldn\'t be" \u2014 almost always a rule-order issue.'
      }
    },
    {
      id: 'fix-return-traffic',
      title: 'Fix: Missing Return Traffic',
      icon: '\u21a9\ufe0f',
      category: 'Fix It',
      difficulty: 'beginner',
      description: 'Web traffic from internal hosts to the internet is getting OUT but never getting BACK. The outbound permit looks fine. What\'s missing?',
      objectives: ['4.3', '4.4'],
      zones: [
        { name: 'Internal',  cidr: '10.1.0.0/16', color: '#7c6ff7' },
        { name: 'Internet',  cidr: 'any',          color: '#3b82f6' }
      ],
      requirements: [
        'Internal hosts reach any internet target on :443/tcp',
        'Return traffic from internet to internal on established ports (1024-65535) must be allowed',
        'Hint: this firewall is stateless \u2014 add explicit return-traffic rules'
      ],
      initialRules: [
        { id: 'r_fx_ret_1', action: 'permit', srcAddr: '10.1.0.0/16', srcPort: 'any', dstAddr: 'any',         dstPort: 443, proto: 'tcp', comment: 'Outbound HTTPS' }
      ],
      hints: [
        'This is a stateless firewall. What happens to the reply that comes BACK from the internet after the client sends out?',
        'Return traffic needs its own permit \u2014 source is the remote server (:443), destination is the internal client on an ephemeral port. Think about the direction of the reply.',
        'Add a second rule: permit tcp any any \u2192 10.1.0.0/16 on ports 1024-65535 with source port 443. That allows return traffic without letting in un-requested inbound traffic.'
      ],
      solution: [
        { action: 'permit', srcAddr: '10.1.0.0/16', srcPort: 'any', dstAddr: 'any', dstPort: 443, proto: 'tcp', comment: 'Outbound HTTPS (existing)' },
        { action: 'permit', srcAddr: 'any', srcPort: 443, dstAddr: '10.1.0.0/16', dstPort: '1024-65535', proto: 'tcp', comment: 'Inbound return traffic from web servers to ephemeral client ports' }
      ],
      testPackets: [
        { src: '10.1.5.10', sp: 52000, dst: '93.184.216.34', dp: 443,  proto: 'tcp', expected: 'permit', label: 'Internal \u2192 Internet HTTPS (outbound)' },
        { src: '93.184.216.34', sp: 443, dst: '10.1.5.10',   dp: 52000, proto: 'tcp', expected: 'permit', label: 'Internet return \u2192 Internal :52000 (return traffic)' },
        { src: '8.8.8.8',      sp: 443,  dst: '10.1.5.10',   dp: 22,    proto: 'tcp', expected: 'deny',   label: 'Internet \u2192 Internal SSH (must block)' }
      ],
      explanation: {
        overview: 'A truly stateless firewall evaluates each direction independently. Outbound permit alone lets the SYN leave \u2014 but the SYN-ACK reply hits no rule and falls through to implicit deny.',
        dataFlow: 'Client sends SYN from 52000 \u2192 :443. Outbound rule permits it. Server replies from :443 \u2192 :52000. No inbound rule matches. Implicit deny drops it. Connection hangs. Fix: add a return-traffic rule permitting established (src:443, dst ephemeral 1024-65535).',
        keyDevices: [
          { name: 'Stateless firewall / ACL', role: 'Each direction is its own ruleset. Unlike stateful firewalls, there\'s no connection table.' }
        ],
        concepts: [
          { term: 'Stateless vs stateful', meaning: 'Stateful tracks active sessions; stateless checks every packet against rules independently.' },
          { term: 'Ephemeral ports',        meaning: 'Client-side random ports (typically 1024-65535). Return traffic must be allowed to these ports from the server\'s well-known port.' },
          { term: 'Established return',     meaning: 'Allow inbound src:well-known \u2192 dst:ephemeral, restricted by proto + source range. Tighter than "permit all inbound."' }
        ],
        examTies: 'N10-009 Objective 4.4. Stateless vs stateful is a key exam concept, and the return-traffic trap is the classic "why is this not working" PBQ.'
      }
    },
    {
      id: 'fix-cidr-narrow',
      title: 'Fix: CIDR Too Narrow',
      icon: '\u{1F9F5}',
      category: 'Fix It',
      difficulty: 'intermediate',
      description: 'Only SOME hosts on the 10.20.0.0/24 subnet can reach the DNS server \u2014 the rest get blocked. The permit rule targets a CIDR, but it\'s the wrong size.',
      objectives: ['4.3', '1.4'],
      zones: [
        { name: 'User VLAN',  cidr: '10.20.0.0/24', color: '#7c6ff7' },
        { name: 'DNS Server', cidr: '10.20.50.10/32', color: '#22c55e' }
      ],
      requirements: [
        'ALL hosts in 10.20.0.0/24 must reach 10.20.50.10:53/udp',
        'Widen the CIDR in the permit rule so the entire /24 is covered',
        'No other changes needed'
      ],
      initialRules: [
        { id: 'r_fx_nar_1', action: 'permit', srcAddr: '10.20.0.0/26', srcPort: 'any', dstAddr: '10.20.50.10/32', dstPort: 53, proto: 'udp', comment: 'DNS (rule covers only .0-.63)' }
      ],
      hints: [
        'The rule mentions a CIDR prefix. Does it cover every host in the subnet?',
        'Check the prefix length. /26 covers 64 addresses (.0-.63). /24 covers 256 (.0-.255). The subnet is /24 but the rule is /26.',
        'Change the source CIDR from 10.20.0.0/26 to 10.20.0.0/24. That widens the rule to match the entire user VLAN.'
      ],
      solution: [
        { action: 'permit', srcAddr: '10.20.0.0/24', srcPort: 'any', dstAddr: '10.20.50.10/32', dstPort: 53, proto: 'udp', comment: 'DNS for the full /24 user VLAN' }
      ],
      testPackets: [
        { src: '10.20.0.5',   sp: 54000, dst: '10.20.50.10', dp: 53, proto: 'udp', expected: 'permit', label: 'User .5 \u2192 DNS (in /26, works)' },
        { src: '10.20.0.100', sp: 54001, dst: '10.20.50.10', dp: 53, proto: 'udp', expected: 'permit', label: 'User .100 \u2192 DNS (outside /26, currently BROKEN)' },
        { src: '10.20.0.200', sp: 54002, dst: '10.20.50.10', dp: 53, proto: 'udp', expected: 'permit', label: 'User .200 \u2192 DNS (outside /26, currently BROKEN)' }
      ],
      explanation: {
        overview: 'CIDR /26 covers 64 addresses (.0-.63). /24 covers 256 (.0-.255). If your rule is /26 but your subnet is /24, you\'re silently denying 75% of your hosts.',
        dataFlow: '10.20.0.5 hits rule \u2014 in /26 range, matches, permit. 10.20.0.100 hits same rule \u2014 NOT in /26 range (/26 ends at .63), no match, falls to implicit deny. Fix: change /26 \u2192 /24.',
        keyDevices: [
          { name: 'Router / L3 firewall', role: 'Evaluates CIDR match via bitwise AND of src IP + subnet mask.' }
        ],
        concepts: [
          { term: 'CIDR prefix length', meaning: 'The /N value tells how many bits are the network portion. /24 = 256 addrs, /25 = 128, /26 = 64, /27 = 32.' },
          { term: 'Wildcard mask vs CIDR', meaning: 'Cisco IOS uses wildcard masks (inverted); most modern syntax uses /N. Know both.' },
          { term: 'Overmatching vs undermatching', meaning: 'Too-narrow = traffic silently dropped. Too-broad = unintended traffic silently permitted. Both are bugs.' }
        ],
        examTies: 'N10-009 Objective 4.3 (ACL reading) + 1.4 (subnetting). Classic PBQ: "why can host X reach the server but host Y can\'t, when both are in the same VLAN?"'
      }
    },
    {
      id: 'fix-cidr-broad',
      title: 'Fix: CIDR Too Broad',
      icon: '\u{1F30B}',
      category: 'Fix It',
      difficulty: 'intermediate',
      description: 'The HR VLAN (10.30.0.0/24) should have SSH access to the HR file server \u2014 but so can the Finance VLAN (10.30.1.0/24) and the Guest VLAN (10.30.2.0/24). Your CIDR is too broad. Narrow it.',
      objectives: ['4.3', '1.4'],
      zones: [
        { name: 'HR VLAN',      cidr: '10.30.0.0/24', color: '#7c6ff7' },
        { name: 'Finance',      cidr: '10.30.1.0/24', color: '#f59e0b' },
        { name: 'Guest Wi-Fi',  cidr: '10.30.2.0/24', color: '#ef4444' },
        { name: 'HR File Svr',  cidr: '10.30.100.5/32', color: '#22c55e' }
      ],
      requirements: [
        'ONLY HR VLAN (10.30.0.0/24) should reach 10.30.100.5:22/tcp',
        'Finance + Guest must be blocked',
        'Tighten the source CIDR in the permit rule'
      ],
      initialRules: [
        { id: 'r_fx_bro_1', action: 'permit', srcAddr: '10.30.0.0/16', srcPort: 'any', dstAddr: '10.30.100.5/32', dstPort: 22, proto: 'tcp', comment: 'SSH to HR file server (CIDR too broad \u2014 covers 256 subnets not 1)' }
      ],
      hints: [
        'The rule\'s source CIDR is permitting more hosts than intended. Who can currently reach the file server?',
        'The rule uses /16 which covers 10.30.0.0 through 10.30.255.255 \u2014 every subnet in the 10.30.x.x range. Finance and Guest VLANs live inside that range.',
        'Tighten the source CIDR to 10.30.0.0/24 so only the HR VLAN is permitted. Finance (10.30.1.0/24) and Guest (10.30.2.0/24) are then outside the rule and hit implicit deny.'
      ],
      solution: [
        { action: 'permit', srcAddr: '10.30.0.0/24', srcPort: 'any', dstAddr: '10.30.100.5/32', dstPort: 22, proto: 'tcp', comment: 'SSH from HR VLAN only \u2014 Finance + Guest excluded by tight CIDR' }
      ],
      testPackets: [
        { src: '10.30.0.50',   sp: 52000, dst: '10.30.100.5', dp: 22, proto: 'tcp', expected: 'permit', label: 'HR \u2192 HR file svr SSH (should work)' },
        { src: '10.30.1.50',   sp: 52001, dst: '10.30.100.5', dp: 22, proto: 'tcp', expected: 'deny',   label: 'Finance \u2192 HR file svr (must block)' },
        { src: '10.30.2.50',   sp: 52002, dst: '10.30.100.5', dp: 22, proto: 'tcp', expected: 'deny',   label: 'Guest \u2192 HR file svr (must block)' }
      ],
      explanation: {
        overview: 'A /16 CIDR covers 65,536 addresses \u2014 every subnet from 10.30.0.0 to 10.30.255.255. If you only meant to permit ONE /24 subnet, that\'s a 256x overmatch.',
        dataFlow: 'Finance (10.30.1.x) hits the rule \u2014 is 10.30.1.x inside 10.30.0.0/16? Yes. Match. PERMIT (wrong!). Fix: change /16 \u2192 /24. Now only 10.30.0.0-10.30.0.255 matches.',
        keyDevices: [
          { name: 'L3 switch / VLAN router', role: 'Inter-VLAN routing is where ACLs enforce subnet boundaries. Overbroad CIDR leaks across VLANs.' }
        ],
        concepts: [
          { term: 'Principle of least privilege', meaning: 'Permit the exact CIDR you mean \u2014 no more. Over-permissive rules are a silent security hole.' },
          { term: 'Summary vs specific routes', meaning: 'Summary routes belong in routing tables for reachability. ACLs should almost always be specific, not summarised.' }
        ],
        examTies: 'N10-009 Objective 4.3 + 1.4. Common gotcha: a rule that "works" but over-permits. Security failures rarely show up as blocked traffic \u2014 they show up as permitted traffic that shouldn\'t be.'
      }
    },
    {
      id: 'fix-wrong-port',
      title: 'Fix: Wrong Port Number',
      icon: '\u{1F6AA}',
      category: 'Fix It',
      difficulty: 'advanced',
      description: 'External HTTPS traffic to the web server is silently dropping. The rule looks fine to the casual eye \u2014 but the port is wrong. Fix it.',
      objectives: ['4.3', '1.5'],
      zones: [
        { name: 'Internet',    cidr: 'any',          color: '#3b82f6' },
        { name: 'DMZ Web Svr', cidr: '203.0.113.5/32', color: '#22c55e' }
      ],
      requirements: [
        'Internet must reach 203.0.113.5 on :443/tcp (HTTPS)',
        'Block all other ports',
        'One-character fix: change the port number'
      ],
      initialRules: [
        { id: 'r_fx_prt_1', action: 'permit', srcAddr: 'any', srcPort: 'any', dstAddr: '203.0.113.5/32', dstPort: 80, proto: 'tcp', comment: 'Web (should be 443, not 80)' }
      ],
      hints: [
        'The requirement says HTTPS. Look at the rule\'s destination port.',
        'HTTP = 80/tcp. HTTPS = 443/tcp. The rule currently permits the wrong one.',
        'Change the rule\'s destination port from 80 to 443.'
      ],
      solution: [
        { action: 'permit', srcAddr: 'any', srcPort: 'any', dstAddr: '203.0.113.5/32', dstPort: 443, proto: 'tcp', comment: 'HTTPS (port corrected from 80 to 443)' }
      ],
      testPackets: [
        { src: '8.8.8.8',        sp: 55000, dst: '203.0.113.5', dp: 443, proto: 'tcp', expected: 'permit', label: 'Internet \u2192 Web HTTPS (must work)' },
        { src: '93.184.216.34',  sp: 55001, dst: '203.0.113.5', dp: 80,  proto: 'tcp', expected: 'deny',   label: 'Internet \u2192 Web HTTP (must block, cleartext)' },
        { src: '1.1.1.1',        sp: 55002, dst: '203.0.113.5', dp: 22,  proto: 'tcp', expected: 'deny',   label: 'Internet \u2192 Web SSH (must block)' }
      ],
      explanation: {
        overview: 'HTTP = 80/tcp. HTTPS = 443/tcp. Transposing the two is one of the most common ACL bugs because the services look nearly identical at a glance.',
        dataFlow: 'External client sends to 203.0.113.5:443. Rule #1 matches on src + dst IP, but dstPort is 80, not 443. No match. Implicit deny fires. Connection drops silently. Fix: change dstPort 80 \u2192 443.',
        keyDevices: [
          { name: 'Edge firewall / DMZ ACL', role: 'Where inbound internet-to-DMZ rules live. Port accuracy is critical.' }
        ],
        concepts: [
          { term: 'Well-known ports', meaning: 'Know 80 (HTTP), 443 (HTTPS), 22 (SSH), 53 (DNS), 21/22/25/53/67/68/80/110/143/443/445/3389 are your memorise list.' },
          { term: 'Port number typos', meaning: 'Real outage cause. Review every ACL rule\'s port number against its comment.' }
        ],
        examTies: 'N10-009 Objective 4.3 + 1.5 (ports). Port knowledge is foundational and frequently tested both as direct recall (\"what port is HTTPS?\") and as applied ACL troubleshooting.'
      }
    },
    {
      id: 'fix-proto-mismatch',
      title: 'Fix: Protocol Mismatch',
      icon: '\u{1F500}',
      category: 'Fix It',
      difficulty: 'advanced',
      description: 'DNS lookups from the user VLAN are failing intermittently. The permit rule is in place, the port is right, but something about the protocol line doesn\'t match DNS behaviour.',
      objectives: ['4.3', '1.4', '1.5'],
      zones: [
        { name: 'User VLAN',     cidr: '10.40.0.0/24',  color: '#7c6ff7' },
        { name: 'DNS Resolver',  cidr: '8.8.8.8/32',     color: '#22c55e' }
      ],
      requirements: [
        'Users in 10.40.0.0/24 must resolve DNS via 8.8.8.8:53',
        'DNS primarily uses UDP (TCP only for zone transfers + responses >512 bytes)',
        'Fix the protocol mismatch so normal DNS queries work'
      ],
      initialRules: [
        { id: 'r_fx_pro_1', action: 'permit', srcAddr: '10.40.0.0/24', srcPort: 'any', dstAddr: '8.8.8.8/32', dstPort: 53, proto: 'tcp', comment: 'DNS (proto wrong \u2014 most DNS is UDP)' }
      ],
      hints: [
        'The rule\'s port is right (53) and the addresses are right. Look at the proto field.',
        'DNS queries under 512 bytes use UDP. TCP is only for zone transfers. Your rule is proto=tcp.',
        'Change the rule\'s proto from tcp to udp.'
      ],
      solution: [
        { action: 'permit', srcAddr: '10.40.0.0/24', srcPort: 'any', dstAddr: '8.8.8.8/32', dstPort: 53, proto: 'udp', comment: 'DNS queries \u2014 proto corrected from tcp to udp' }
      ],
      testPackets: [
        { src: '10.40.0.25', sp: 54000, dst: '8.8.8.8', dp: 53, proto: 'udp', expected: 'permit', label: 'User \u2192 DNS UDP query (standard, must work)' },
        { src: '10.40.0.30', sp: 54001, dst: '8.8.8.8', dp: 53, proto: 'tcp', expected: 'deny',   label: 'User \u2192 DNS TCP (zone xfer \u2014 block unless needed)' },
        { src: '10.40.0.40', sp: 54002, dst: '1.1.1.1', dp: 53, proto: 'udp', expected: 'deny',   label: 'User \u2192 different DNS (must block, not authorised)' }
      ],
      explanation: {
        overview: 'DNS queries under 512 bytes use UDP. TCP is only used for zone transfers or responses too large for UDP. A "DNS" rule scoped to tcp silently blocks the 99% normal case.',
        dataFlow: 'Client sends UDP:53 query. Rule requires proto=tcp. No match. Implicit deny. Query drops. Fix: change proto tcp \u2192 udp (or "any" if you want both).',
        keyDevices: [
          { name: 'DNS resolver', role: 'Typically accessible via UDP/53 by default. TCP/53 reserved for zone transfers, large responses, DNS-over-TLS (853), etc.' }
        ],
        concepts: [
          { term: 'UDP vs TCP for DNS', meaning: 'UDP for small queries (fast, low overhead). TCP when response >512 bytes or for zone transfers. Modern DNSSEC responses often trigger TCP fallback.' },
          { term: 'Protocol precision', meaning: 'ACL rules must match the actual protocol used. \"any\" is broad; tcp-only is too narrow for services that mostly use UDP.' },
          { term: 'Implicit deny', meaning: 'A missing proto match is indistinguishable from a missing rule \u2014 the packet silently hits implicit deny at the bottom.' }
        ],
        examTies: 'N10-009 Objective 4.3 + 1.4 (DNS protocols). Exam will specifically test \"what proto does DNS use?\" and \"why is DNS failing when the rule clearly says port 53?\"'
      }
    },
    // ═══════════════════════════════════════════════════════════════════
    // v4.55.1 STATEFUL FIREWALL SCENARIOS (3 \u2014 showcase stateful pattern)
    // Each carries `mode: 'stateful'` so the grader uses the batch flow
    // evaluator with a shared connection table. Return-traffic packets
    // auto-permit against tracked forward flows \u2014 no explicit reverse rule
    // needed. Learning: enterprise firewalls work this way, stateless ACLs
    // don't.
    // ═══════════════════════════════════════════════════════════════════
    {
      id: 'stateful-dev-ssh',
      title: 'Stateful: Dev SSH with Auto-Returns',
      icon: '\ud83d\udd01',
      category: 'Real-world',
      difficulty: 'intermediate',
      mode: 'stateful',
      description: 'Developers SSH to the build server and the replies need to come back. In STATEFUL mode, one outbound permit is enough \u2014 the firewall tracks the connection and auto-permits the reverse flow. No explicit return rule needed.',
      objectives: ['4.3', '4.4'],
      zones: [
        { name: 'Dev VLAN',       cidr: '10.60.0.0/24', color: '#7c6ff7' },
        { name: 'Build Server',   cidr: '10.60.100.5/32', color: '#22c55e' }
      ],
      requirements: [
        'Dev hosts (10.60.0.0/24) can SSH to 10.60.100.5:22/tcp',
        'Build server\'s replies back to dev reach the original client (STATEFUL auto-permits)',
        'Nothing else'
      ],
      testPackets: [
        { src: '10.60.0.15',  sp: 52000, dst: '10.60.100.5', dp: 22,    proto: 'tcp', expected: 'permit', label: 'Dev SSH \u2192 Build (outbound, permits + tracks)' },
        { src: '10.60.100.5', sp: 22,    dst: '10.60.0.15',  dp: 52000, proto: 'tcp', expected: 'permit', label: 'Build reply \u2192 Dev (return flow, auto-permit)' },
        { src: '10.60.0.20',  sp: 52001, dst: '10.60.100.5', dp: 3389,  proto: 'tcp', expected: 'deny',   label: 'Dev RDP \u2192 Build (not in rules, blocked)' }
      ],
      explanation: {
        overview: 'Every real enterprise firewall (pfSense, iptables with ctstate, Cisco ASA, AWS security groups) is STATEFUL. When a packet outbound is permitted by a rule, the firewall adds the 5-tuple (proto, src, srcPort, dst, dstPort) to a connection table. When the reverse of that tuple arrives inbound, it auto-permits without any explicit inbound rule.',
        dataFlow: 'Dev .15:52000 \u2192 Build:22 tcp. Matches outbound permit. Firewall adds (tcp, 10.60.0.15, 52000, 10.60.100.5, 22) to connection table. Build replies: Build:22 \u2192 Dev .15:52000 tcp. Firewall sees reversed-tuple match in conn table \u2192 auto-permit. Dev RDP attempt: no match, no state entry, falls through to implicit deny.',
        keyDevices: [
          { name: 'Stateful firewall / ACL', role: 'Maintains a connection table. Reverse-tuple match auto-permits as established return traffic.' }
        ],
        concepts: [
          { term: 'Stateful inspection',    meaning: 'Firewall tracks active sessions. Return traffic for tracked sessions is automatically allowed.' },
          { term: 'Connection table',       meaning: 'In-memory store of active 5-tuples (proto + src + srcPort + dst + dstPort). Purged after idle timeout.' },
          { term: 'Stateless vs stateful',  meaning: 'Stateless: every packet evaluated in isolation \u2014 return rules required. Stateful: forward permit auto-allows the reverse. Real enterprise is stateful.' },
          { term: 'Why it matters for ACLs', meaning: 'Stateful mode lets you write minimal rule lists (just the intended direction). Stateless forces you to double every rule. A key exam distinction.' }
        ],
        examTies: 'N10-009 Objective 4.4 (firewalls) + Security+ crossover. Exam will ask \"what\'s the difference between stateful and stateless firewalls?\" and \"why does my firewall rule work sometimes but not others?\" \u2014 usually the answer is stateful context.'
      }
    },
    {
      id: 'stateful-web-farm',
      title: 'Stateful: Public Web Farm',
      icon: '\ud83c\udf10',
      category: 'Real-world',
      difficulty: 'intermediate',
      mode: 'stateful',
      description: 'Internet clients reach a public web server on :443. In STATEFUL mode, the server\'s replies back to the clients are auto-permitted by connection tracking \u2014 you don\'t author outbound rules for response traffic.',
      objectives: ['4.3', '4.4'],
      zones: [
        { name: 'Internet',     cidr: 'any',             color: '#3b82f6' },
        { name: 'Public Web',   cidr: '203.0.113.10/32', color: '#22c55e' }
      ],
      requirements: [
        'Internet clients hit 203.0.113.10:443/tcp',
        'Server replies back to clients must auto-permit (stateful)',
        'No separate outbound rule needed'
      ],
      testPackets: [
        { src: '198.51.100.5',    sp: 54000, dst: '203.0.113.10',  dp: 443,   proto: 'tcp', expected: 'permit', label: 'Client A \u2192 Web HTTPS (inbound)' },
        { src: '203.0.113.10',    sp: 443,   dst: '198.51.100.5',  dp: 54000, proto: 'tcp', expected: 'permit', label: 'Web \u2192 Client A reply (stateful auto)' },
        { src: '198.51.100.6',    sp: 54001, dst: '203.0.113.10',  dp: 22,    proto: 'tcp', expected: 'deny',   label: 'Client B SSH \u2192 Web (blocked)' }
      ],
      explanation: {
        overview: 'Public-facing web servers are the simplest stateful use case: one inbound permit on :443/tcp from any, and the firewall handles the return traffic automatically. Pre-stateful you\'d need an outbound permit for src:443 \u2192 ephemeral ports \u2014 ugly + error-prone.',
        dataFlow: 'Internet client \u2192 web server:443 tcp. Matches inbound permit, connection added to table. Web server replies from :443 \u2192 client ephemeral port. Reverse-tuple match in conn table \u2192 auto-permit. Attempted SSH from another client \u2014 no matching rule \u2014 implicit deny.',
        keyDevices: [
          { name: 'Perimeter firewall', role: 'Holds the inbound public-service permit. Connection tracking lives here.' },
          { name: 'Web server', role: 'Replies from well-known port :443 to client\'s ephemeral port. Doesn\'t care about firewall state.' }
        ],
        concepts: [
          { term: 'Minimal rule set',       meaning: 'Stateful mode means you write rules for INTENT only. You don\'t pollute the rule list with return-traffic plumbing.' },
          { term: 'Ephemeral port pool',    meaning: 'Client-side TCP ports 1024\u201365535. Stateful firewall tracks these automatically \u2014 you never hand-enumerate.' }
        ],
        examTies: 'N10-009 Objective 4.4 \u2014 understanding WHY modern firewalls are stateful is a recurring concept. The "write minimal rules + rely on state tracking" pattern appears in both exam theory and PBQ.'
      }
    },
    {
      id: 'stateful-dns-contrast',
      title: 'Stateful: DNS (compare to stateless DNS lab)',
      icon: '\u{2696}\uFE0F',
      category: 'Real-world',
      difficulty: 'advanced',
      mode: 'stateful',
      description: 'Users resolve DNS via an external resolver. Same scenario as the stateless dns-only-lab but in STATEFUL mode \u2014 feel the difference: one rule covers both the query AND the response.',
      objectives: ['4.3', '4.4', '1.4'],
      zones: [
        { name: 'Internal Users', cidr: '10.70.0.0/24', color: '#7c6ff7' },
        { name: 'Resolver',       cidr: '1.1.1.1/32',    color: '#22c55e' }
      ],
      requirements: [
        'Internal (10.70.0.0/24) can query 1.1.1.1:53/udp',
        'Return DNS responses auto-permit (stateful)',
        'Compare: in stateless mode you\'d need an EXPLICIT inbound rule for src:1.1.1.1:53 \u2192 dst:any:any-ephemeral/udp'
      ],
      testPackets: [
        { src: '10.70.0.30', sp: 54000, dst: '1.1.1.1',    dp: 53,    proto: 'udp', expected: 'permit', label: 'User DNS query \u2192 Resolver' },
        { src: '1.1.1.1',    sp: 53,    dst: '10.70.0.30', dp: 54000, proto: 'udp', expected: 'permit', label: 'Resolver reply \u2192 User (stateful auto)' },
        { src: '10.70.0.30', sp: 54001, dst: '8.8.8.8',    dp: 53,    proto: 'udp', expected: 'deny',   label: 'User \u2192 unauthorised DNS (blocked)' }
      ],
      explanation: {
        overview: 'Same business goal as dns-only-lab but stateful. The stateless version needs TWO rules (outbound query + inbound response). Stateful needs ONE (outbound query). The saved rule is the whole pedagogical point.',
        dataFlow: 'User \u2192 1.1.1.1:53 udp \u2014 matches outbound permit, connection tracked. 1.1.1.1 replies \u2014 reverse-tuple hit, auto-permit. 8.8.8.8 attempt \u2014 no rule matches, implicit deny.',
        keyDevices: [
          { name: 'Stateful firewall', role: 'Tracks UDP \"flows\" (looser than TCP sessions but still time-bounded).' }
        ],
        concepts: [
          { term: 'UDP state tracking',   meaning: 'UDP is connectionless, but stateful firewalls still track recent UDP flows with a short timeout (typically 30s). Reverse-tuple packets within the window auto-permit.' },
          { term: 'Stateless noise cost', meaning: 'Stateless ACLs typically run 2\u20134x more rules than stateful for the same policy. Operational cost: more review, more errors, more drift.' }
        ],
        examTies: 'N10-009 Objective 4.4 \u2014 the differentiation between UDP flow tracking and TCP session tracking shows up in the exam as "what does a stateful firewall track for UDP?" \u2014 answer: recent flows with idle timeouts.'
      }
    }
  ];
  
  // Quick lookup + categorisation for picker UI
  const ACL_CATEGORIES = [
    { key: 'Sandbox',      label: 'Sandbox' },
    { key: 'Fundamentals', label: 'Fundamentals' },
    { key: 'Real-world',   label: 'Real-world' },
    { key: 'PBQ Trap',     label: 'PBQ Traps' },
    // v4.55.0: Fix-This-ACL category \u2014 scenarios seed a BROKEN rule list
    // via `initialRules` and the student diagnoses + fixes it. Matches the
    // real-exam pedagogy of "this ACL isn't working \u2014 why?".
    { key: 'Fix It',       label: 'Fix It' }
  ];
  
  // ── ACL Builder state ──
  // Single source of truth for the active scenario + rule list + grader
  // result. Persisted to localStorage so reloading the page keeps your work
  // (like Topology Builder does with tbState).
  let aclState = {
    scenarioId: 'free-build',
    rules: [],
    lastGrade: null,    // { passed, total, details } \u2014 null = never graded
    lastTest: null,     // most recent free-form custom packet result
    viewMode: 'split',  // reserved for future compact / split / wide modes
    // v4.55.2: progressive-hint state tracked per scenario id
    hintsUsed: {},      // { [scenarioId]: numberOfTiersUnlocked } \u2014 persists
    solutionShown: {}   // { [scenarioId]: true } \u2014 set when "Show solution" fired
  };
  
  // v4.80.0: First-time-user default scenario per Codex round-4. New users
  // landed in Free Build with a blank canvas — too open-ended for first-time
  // pedagogy. They now default to "block-single-host" (the simplest guided
  // beginner scenario: 4.3 ACL fundamentals, single deny rule + implicit
  // allow understanding). Returning users keep whatever scenario they last
  // loaded via the persisted state.
  const ACL_FIRST_TIME_SCENARIO = 'block-single-host';
  
  function aclLoadState() {
    try {
      const raw = localStorage.getItem(STORAGE.ACL_STATE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          aclState = Object.assign({ scenarioId: 'free-build', rules: [], lastGrade: null, lastTest: null, viewMode: 'split', hintsUsed: {}, solutionShown: {} }, parsed);
          if (!aclState.hintsUsed) aclState.hintsUsed = {};
          if (!aclState.solutionShown) aclState.solutionShown = {};
        }
      }
    } catch (_) { /* defensive: localStorage corruption \u2192 fall back to defaults */ }
    // v4.80.0: First-time-user default \u2192 guided scenario instead of Free Build.
    // Detection: never-saved state with default 'free-build' + empty rules.
    // Returning users (saved state with anything different) keep their pick.
    try {
      const hasSaved = localStorage.getItem(STORAGE.ACL_STATE) !== null;
      if (!hasSaved && aclState.scenarioId === 'free-build' && aclState.rules.length === 0) {
        aclState.scenarioId = ACL_FIRST_TIME_SCENARIO;
      }
    } catch (_) {}
    return aclState;
  }
  function aclSaveState() {
    try { localStorage.setItem(STORAGE.ACL_STATE, JSON.stringify(aclState)); _cloudFlush(STORAGE.ACL_STATE); } catch (_) {}
  }
  
  function aclActiveScenario() {
    return ACL_SCENARIOS.find(s => s.id === aclState.scenarioId) || ACL_SCENARIOS[0];
  }
  
  // Rule CRUD
  function _aclMkRuleId() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  
  function aclAddRule(partial) {
    const rule = Object.assign({
      id: _aclMkRuleId(),
      action: 'permit',
      proto:  'any',
      srcAddr: 'any',
      srcPort: 'any',
      dstAddr: 'any',
      dstPort: 'any'
    }, partial || {});
    aclState.rules.push(rule);
    aclState.lastGrade = null; // invalidate grade on any mutation
    aclSaveState();
    renderAclPage();
  }
  
  function aclDeleteRule(id) {
    aclState.rules = aclState.rules.filter(r => r.id !== id);
    aclState.lastGrade = null;
    aclSaveState();
    renderAclPage();
  }
  
  function aclMoveRule(id, dir) {
    const i = aclState.rules.findIndex(r => r.id === id);
    if (i === -1) return;
    const j = i + dir;
    if (j < 0 || j >= aclState.rules.length) return;
    const tmp = aclState.rules[i];
    aclState.rules[i] = aclState.rules[j];
    aclState.rules[j] = tmp;
    aclState.lastGrade = null;
    aclSaveState();
    renderAclPage(/*animateFlip=*/true);
  }
  
  function aclClearRules() {
    if (aclState.rules.length === 0) return;
    if (!confirm('Clear all rules from this ACL?')) return;
    aclState.rules = [];
    aclState.lastGrade = null;
    aclState.lastTest = null;
    aclSaveState();
    renderAclPage();
  }
  
  function aclLoadScenario(id) {
    const scen = ACL_SCENARIOS.find(s => s.id === id);
    if (!scen) return;
    // Non-destructive guard: if user has rules and switches scenarios,
    // confirm before wiping. Free Build \u2192 any scenario also confirms.
    if (aclState.rules.length > 0 && aclState.scenarioId !== id) {
      if (!confirm('Switch to "' + scen.title + '"? Your current rule list will be cleared.')) return;
    }
    aclState.scenarioId = id;
    // v4.55.0: Fix-It scenarios seed a pre-authored BROKEN rule list via
    // `initialRules`. Regular scenarios stay empty-canvas. Deep-clone so
    // edits don't mutate the scenario definition.
    aclState.rules = Array.isArray(scen.initialRules) && scen.initialRules.length
      ? JSON.parse(JSON.stringify(scen.initialRules)).map(r => ({ ...r, id: r.id || ('r_' + Math.random().toString(36).slice(2, 8)) }))
      : [];
    aclState.lastGrade = null;
    aclState.lastTest = null;
    aclSaveState();
    const modal = document.getElementById('acl-scenario-picker');
    if (modal) modal.classList.add('is-hidden');
    renderAclPage();
    // Gentle success toast matches TB scenario-load feedback
    if (typeof showSuccessToast === 'function' && scen.id !== 'free-build') {
      showSuccessToast('\ud83d\udcda ' + scen.title + ' loaded. Read requirements, build your ACL, then click Test All.');
    }
  }
  
  // ── Page entry point ──
  // Original openAclBuilder body inlined into enter() at module bottom.
  // ── Render orchestrator ──
  // Top-level renderer. Pushes new DOM into #page-acl child containers.
  // Split into small helpers for testability and so the CSS selectors stay
  // stable even as the interior logic evolves.
  function renderAclPage(animateFlip) {
    const page = document.getElementById('page-acl');
    if (!page) return;
    const scen = aclActiveScenario();
    _aclRenderHeader(scen);
    _aclRenderScenarioPanel(scen);
    _aclRenderRuleList(scen, animateFlip);
    _aclRenderTestPanel(scen);
    _aclRenderGradePanel(scen);
  }
  
  function _aclRenderHeader(scen) {
    const el = document.getElementById('acl-header-scenario');
    if (!el) return;
    const chip = scen.id === 'free-build'
      ? '<span class="acl-header-pill acl-header-pill-free">Free Build</span>'
      : '<span class="acl-header-pill acl-header-pill-scenario" title="' + escHtml(scen.title) + '">' + escHtml(scen.title) + '</span>';
    el.innerHTML = chip +
      '<button type="button" class="btn btn-ghost acl-header-change" onclick="aclOpenScenarioPicker()" style="padding:6px 12px;font-size:12px">Change scenario</button>';
  }
  
  function _aclRenderScenarioPanel(scen) {
    const el = document.getElementById('acl-scenario-panel');
    if (!el) return;
    if (scen.id === 'free-build') {
      el.innerHTML = `
        <div class="acl-scenario-card acl-scenario-card-free">
          <div class="acl-sc-head">
            <span class="acl-sc-ico" aria-hidden="true">\ud83e\uddea</span>
            <div>
              <div class="acl-sc-title">Free Build</div>
              <div class="acl-sc-sub">Experiment freely. Add rules, send test packets, watch first-match-wins play out.</div>
            </div>
          </div>
          <div class="acl-sc-zones">
            ${scen.zones.map((z, i) => `<div class="acl-zone" style="--zone-color:${z.color}" data-zone-idx="${i}"><span class="acl-zone-name">${escHtml(z.name)}</span><span class="acl-zone-cidr">${escHtml(z.cidr)}</span></div>`).join('')}
          </div>
          <div class="acl-sc-hint">No grading in Free Build \u2014 use <em>Test Custom Packet</em> below to explore how rules behave.</div>
        </div>`;
      return;
    }
    // Full scenario panel: head + zones + requirements + learn-more
    const reqsHtml = scen.requirements.map((r, i) => {
      const detail = scen.lastGradeDetail && scen.lastGradeDetail[i];
      return `<li class="acl-req">\u2022 ${escHtml(r)}</li>`;
    }).join('');
    const learnHtml = scen.explanation ? `
      <details class="acl-learn">
        <summary><span class="acl-learn-ico">\ud83d\udcda</span> Learn more about this scenario <span class="acl-learn-chev">\u25B8</span></summary>
        <div class="acl-learn-body">
          <section class="acl-learn-sec"><h4>Overview</h4><p>${escHtml(scen.explanation.overview)}</p></section>
          <section class="acl-learn-sec"><h4>How traffic flows</h4><p>${escHtml(scen.explanation.dataFlow)}</p></section>
          <section class="acl-learn-sec"><h4>Key devices</h4><ul class="acl-learn-list">${scen.explanation.keyDevices.map(d => `<li><strong>${escHtml(d.name)}</strong> \u2014 ${escHtml(d.role)}</li>`).join('')}</ul></section>
          <section class="acl-learn-sec"><h4>Key concepts</h4><ul class="acl-learn-list">${scen.explanation.concepts.map(c => `<li><strong>${escHtml(c.term)}</strong> \u2014 ${escHtml(c.meaning)}</li>`).join('')}</ul></section>
          <section class="acl-learn-sec acl-learn-exam"><h4>Exam relevance</h4><p>${escHtml(scen.explanation.examTies)}</p></section>
        </div>
      </details>` : '';
    el.innerHTML = `
      <div class="acl-scenario-card acl-scenario-card-${scen.difficulty}">
        <div class="acl-sc-head">
          <span class="acl-sc-ico" aria-hidden="true">${scen.icon || '\ud83d\udcc4'}</span>
          <div class="acl-sc-titlewrap">
            <div class="acl-sc-title">${escHtml(scen.title)}</div>
            <div class="acl-sc-meta">
              <span class="acl-sc-diff acl-sc-diff-${scen.difficulty}">${scen.difficulty}</span>
              ${(scen.objectives || []).map(o => `<span class="acl-sc-obj">N10-009 \u00b7 ${escHtml(o)}</span>`).join('')}
              <!-- v4.55.1: mode badge \u2014 shows stateful vs stateless at a glance -->
              <span class="acl-sc-mode acl-sc-mode-${scen.mode === 'stateful' ? 'stateful' : 'stateless'}" title="${scen.mode === 'stateful' ? 'Stateful firewall \u2014 return traffic auto-permits' : 'Stateless firewall \u2014 return traffic needs explicit rules'}">${scen.mode === 'stateful' ? 'Stateful' : 'Stateless'}</span>
            </div>
            <div class="acl-sc-sub">${escHtml(scen.description)}</div>
          </div>
        </div>
        <div class="acl-sc-zones">
          ${scen.zones.map((z, i) => `<div class="acl-zone" style="--zone-color:${z.color}" data-zone-idx="${i}"><span class="acl-zone-name">${escHtml(z.name)}</span><span class="acl-zone-cidr">${escHtml(z.cidr)}</span></div>`).join('')}
        </div>
        <div class="acl-sc-reqs">
          <div class="acl-sc-reqs-head">Requirements</div>
          <ul class="acl-sc-reqs-list">${reqsHtml}</ul>
        </div>
        ${learnHtml}
      </div>`;
  }
  
  function _aclRenderRuleList(scen, animateFlip) {
    const el = document.getElementById('acl-rule-list');
    if (!el) return;
    // v4.52.0 FLIP: capture old positions for smooth reorder animation
    let oldRects = null;
    if (animateFlip) {
      oldRects = new Map();
      el.querySelectorAll('.acl-rule-row').forEach(row => {
        oldRects.set(row.dataset.ruleId, row.getBoundingClientRect());
      });
    }
    const rules = aclState.rules;
    if (rules.length === 0) {
      el.innerHTML = `
        <div class="acl-rule-empty">
          <div class="acl-rule-empty-ico">\u2795</div>
          <div class="acl-rule-empty-title">No rules yet</div>
          <div class="acl-rule-empty-sub">Click <strong>+ Add Rule</strong> to build your first rule. Rules are evaluated top-to-bottom \u2014 first match wins.</div>
        </div>`;
      return;
    }
    const rows = rules.map((r, i) => {
      const actCls = r.action === 'permit' ? 'acl-act-permit' : 'acl-act-deny';
      const actIco = r.action === 'permit' ? '\u2714' : '\u2716';
      return `<div class="acl-rule-row" data-rule-id="${r.id}">
        <div class="acl-rule-num">${i + 1}</div>
        <div class="acl-rule-cell acl-rule-action"><span class="acl-act-pill ${actCls}">${r.action}</span></div>
        <div class="acl-rule-cell acl-rule-proto">${escHtml(r.proto)}</div>
        <div class="acl-rule-cell acl-rule-src">
          <div class="acl-rule-addr">${escHtml(r.srcAddr)}</div>
          <div class="acl-rule-port">:${escHtml(String(r.srcPort))}</div>
        </div>
        <div class="acl-rule-arrow">\u2192</div>
        <div class="acl-rule-cell acl-rule-dst">
          <div class="acl-rule-addr">${escHtml(r.dstAddr)}</div>
          <div class="acl-rule-port">:${escHtml(String(r.dstPort))}</div>
        </div>
        <div class="acl-rule-ops">
          <button type="button" class="acl-rule-op" title="Move up" onclick="aclMoveRule('${r.id}', -1)" ${i === 0 ? 'disabled' : ''}>\u25B4</button>
          <button type="button" class="acl-rule-op" title="Move down" onclick="aclMoveRule('${r.id}', 1)" ${i === rules.length - 1 ? 'disabled' : ''}>\u25BE</button>
          <button type="button" class="acl-rule-op acl-rule-op-del" title="Delete rule" onclick="aclDeleteRule('${r.id}')">\u00d7</button>
        </div>
      </div>`;
    }).join('');
    const implicit = `<div class="acl-rule-implicit" aria-hidden="true">
      <div class="acl-rule-num acl-rule-num-implicit">\u221e</div>
      <div class="acl-rule-implicit-text"><span class="acl-act-pill acl-act-deny">implicit deny</span> \u00b7 any packet that reaches this rule is dropped</div>
    </div>`;
    el.innerHTML = rows + implicit;
  
    // v4.52.0: FLIP rerank animation for reorder (matches renderTodaysFocus pattern).
    // Capture new positions, subtract old, apply inverse transform, release w/ transition.
    if (oldRects) {
      const rows = el.querySelectorAll('.acl-rule-row');
      rows.forEach(row => {
        const oldRect = oldRects.get(row.dataset.ruleId);
        if (!oldRect) return;
        const newRect = row.getBoundingClientRect();
        const dy = oldRect.top - newRect.top;
        if (Math.abs(dy) < 2) return;
        row.style.transform = `translateY(${dy}px)`;
        row.style.transition = 'none';
        requestAnimationFrame(() => {
          row.style.transition = 'transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1)';
          row.style.transform = '';
        });
        row.addEventListener('transitionend', () => {
          row.style.transition = '';
          row.style.transform = '';
        }, { once: true });
      });
    }
  }
  
  function _aclRenderTestPanel(scen) {
    const el = document.getElementById('acl-test-panel');
    if (!el) return;
    const canned = scen.testPackets && scen.testPackets.length
      ? scen.testPackets.map((p, i) => {
          const last = aclState.lastGrade && aclState.lastGrade.details && aclState.lastGrade.details[i];
          const stateCls = last ? (last.pass ? 'acl-tp-pass' : 'acl-tp-fail') : '';
          const stateIco = last ? (last.pass ? '\u2714' : '\u2716') : '';
          const actualBadge = last ? `<span class="acl-tp-actual acl-tp-actual-${last.actual}">${last.actual}</span>` : '';
          return `<div class="acl-tp-row ${stateCls}" data-tp-idx="${i}">
            <div class="acl-tp-label">${escHtml(p.label)}</div>
            <div class="acl-tp-packet"><span class="acl-tp-addr">${escHtml(p.src)}</span>:<span class="acl-tp-port">${escHtml(String(p.sp))}</span> <span class="acl-tp-arrow">\u2192</span> <span class="acl-tp-addr">${escHtml(p.dst)}</span>:<span class="acl-tp-port">${escHtml(String(p.dp))}</span> <span class="acl-tp-proto">${escHtml(p.proto)}</span></div>
            <div class="acl-tp-expected">expected: <strong class="acl-tp-exp-${p.expected}">${p.expected}</strong></div>
            <div class="acl-tp-result">${actualBadge}${stateIco ? '<span class="acl-tp-state">' + stateIco + '</span>' : ''}</div>
          </div>`;
        }).join('')
      : '<div class="acl-tp-empty">Free Build has no canned tests \u2014 send a custom packet below.</div>';
    const disable = scen.testPackets && scen.testPackets.length === 0 ? 'disabled' : '';
    el.innerHTML = `
      <div class="acl-panel-head">
        <div class="acl-panel-title"><span class="acl-panel-ico">\ud83e\uddea</span> Test Packets</div>
        <button type="button" class="btn btn-primary acl-test-run" onclick="aclRunAllTests()" ${disable}>Test All</button>
        <button type="button" class="btn btn-ghost acl-test-replay" onclick="aclReplayAnimation()" ${disable} title="Replay packet-flow animation">Replay</button>
      </div>
      <div class="acl-tp-list">${canned}</div>
      <details class="acl-custom-packet">
        <summary><span class="acl-custom-ico">\ud83c\udfaf</span> Test a custom packet <span class="acl-custom-chev">\u25B8</span></summary>
        <div class="acl-custom-body">
          <div class="acl-custom-grid">
            <label class="acl-custom-lbl">Source IP<input class="acl-custom-input" id="acl-cp-src" placeholder="e.g. 10.0.0.5" value="10.0.0.5"></label>
            <label class="acl-custom-lbl">Src Port<input class="acl-custom-input" id="acl-cp-sp" placeholder="any or e.g. 443" value="any"></label>
            <label class="acl-custom-lbl">Dest IP<input class="acl-custom-input" id="acl-cp-dst" placeholder="e.g. 8.8.8.8" value="8.8.8.8"></label>
            <label class="acl-custom-lbl">Dest Port<input class="acl-custom-input" id="acl-cp-dp" placeholder="any or e.g. 443" value="443"></label>
            <label class="acl-custom-lbl">Proto<select class="acl-custom-input" id="acl-cp-proto"><option value="tcp">tcp</option><option value="udp">udp</option><option value="icmp">icmp</option><option value="any">any</option></select></label>
          </div>
          <button type="button" class="btn btn-primary acl-custom-run" onclick="aclRunCustomPacket()">Send Packet</button>
          <div id="acl-custom-result" class="acl-custom-result"></div>
        </div>
      </details>`;
  }
  
  function _aclRenderGradePanel(scen) {
    const el = document.getElementById('acl-grade-panel');
    if (!el) return;
    if (scen.id === 'free-build') {
      el.innerHTML = `<div class="acl-grade-info">Free Build mode \u2014 grading disabled. Pick a scenario to unlock grading + AI Coach.</div>`;
      return;
    }
    const g = aclState.lastGrade;
    const scoreLine = g
      ? `<span class="acl-grade-score acl-grade-score-${g.passed === g.total ? 'full' : (g.passed >= Math.ceil(g.total * 0.6) ? 'partial' : 'low')}">${g.passed} / ${g.total}</span>`
      : '<span class="acl-grade-score acl-grade-score-empty">\u2014</span>';
    const detail = g && g.details.length
      ? g.details.map((d, i) => `<div class="acl-grade-detail ${d.pass ? 'acl-gd-pass' : 'acl-gd-fail'}">
          <span class="acl-gd-state">${d.pass ? '\u2714' : '\u2716'}</span>
          <span class="acl-gd-label">${escHtml(d.label)}</span>
          <span class="acl-gd-expected">${d.expected}</span>
          <span class="acl-gd-vs">vs</span>
          <span class="acl-gd-actual acl-gd-actual-${d.actual}">${d.actual}</span>
          ${d.implicit ? '<span class="acl-gd-tag acl-gd-tag-implicit" title="No explicit rule matched \u2014 hit implicit deny">implicit</span>' : ''}
          ${!d.implicit && d.ruleIdx >= 0 ? `<span class="acl-gd-tag acl-gd-tag-rule" title="Matched rule #${d.ruleIdx + 1}">rule #${d.ruleIdx + 1}</span>` : ''}
        </div>`).join('')
      : '';
    // v4.55.2: Hint button \u2014 only on scenarios that carry a `hints` array
    const hasHints = Array.isArray(scen.hints) && scen.hints.length > 0;
    const tierUsed = (aclState.hintsUsed && aclState.hintsUsed[scen.id]) || 0;
    const hintsLeft = hasHints ? Math.max(0, scen.hints.length - tierUsed) : 0;
    const hintBtnLabel = hasHints ? (tierUsed === 0 ? `Hint` : `Hint (${hintsLeft} left)`) : '';
    const hintBtn = hasHints
      ? `<button type="button" class="btn btn-ghost acl-hint-btn" onclick="aclShowHint()">${hintBtnLabel}</button>`
      : '';
  
    el.innerHTML = `
      <div class="acl-panel-head">
        <div class="acl-panel-title"><span class="acl-panel-ico">\ud83c\udfaf</span> Grade</div>
        <div class="acl-grade-actions">
          ${hintBtn}
          <button type="button" class="btn btn-ghost acl-coach-btn" onclick="aclAskCoach()">AI Coach</button>
          <button type="button" class="btn btn-primary acl-grade-btn" onclick="aclGrade()">Grade My ACL</button>
        </div>
      </div>
      <div class="acl-grade-body">
        <div class="acl-grade-summary">${scoreLine}<span class="acl-grade-label">${g ? (g.passed === g.total ? 'All test packets pass. Nice!' : 'Test packets remaining to satisfy.') : 'Click Grade My ACL to evaluate.'}</span></div>
        ${detail ? `<div class="acl-grade-details">${detail}</div>` : ''}
      </div>`;
  }
  
  // ── Interactions ──
  
  function aclRunAllTests() {
    const scen = aclActiveScenario();
    if (!scen.testPackets || scen.testPackets.length === 0) return;
    const g = _aclGradeScenario(aclState.rules, scen);
    aclState.lastGrade = g;
    aclSaveState();
    renderAclPage();
    // Animated packet-flow reveal on the test-panel rows (stagger).
    // Each row fades in its pass/fail indicator with a per-index delay.
    requestAnimationFrame(() => {
      document.querySelectorAll('#acl-test-panel .acl-tp-row').forEach((row, i) => {
        row.classList.remove('acl-tp-reveal');
        void row.offsetWidth;  // force reflow so animation restarts
        row.style.animationDelay = (i * 80) + 'ms';
        row.classList.add('acl-tp-reveal');
      });
      // v4.55.0: packet-flow animation \u2014 walk each packet visually down the
      // rule list, highlighting each rule it inspects, stopping + bursting
      // at the matching rule (or implicit deny if none matched).
      if (typeof _aclAnimatePacketFlow === 'function') {
        _aclAnimatePacketFlow(aclState.rules, scen.testPackets);
      }
    });
  }
  
  // v4.55.0: Replay button wrapper. Re-runs the packet-flow animation
  // against the CURRENT rule list without re-grading (preserves UI state).
  function aclReplayAnimation() {
    const scen = aclActiveScenario();
    if (!scen.testPackets || scen.testPackets.length === 0) return;
    if (typeof _aclAnimatePacketFlow === 'function') {
      _aclAnimatePacketFlow(aclState.rules, scen.testPackets);
    }
  }
  
  // v4.55.0: Packet-flow animation engine.
  // For each test packet:
  //   - create a floating "packet pill" that starts at the top of the rule list
  //   - slide it down, pausing ~320ms at each rule it inspects
  //   - highlight each rule with an accent pulse as the packet inspects it
  //   - when the packet reaches its matching rule, burst green (permit) or red (deny)
  //   - if no rule matches, continue to an "implicit deny" slot below the list
  //     and burst red
  //   - multiple packets stagger 180ms apart so they're in-flight together
  // Reduced-motion: skip the animation entirely, just jump to the final state.
  const ACL_ANIM_RULE_MS = 320;
  const ACL_ANIM_STAGGER_MS = 180;
  function _aclAnimatePacketFlow(rules, packets) {
    if (!Array.isArray(rules) || !Array.isArray(packets) || packets.length === 0) return;
    const ruleList = document.getElementById('acl-rule-list');
    if (!ruleList) return;
    // Respect reduced-motion \u2014 short-circuit to the final grading UI
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;
  
    // Ensure an overlay container exists inside the rule list for the floating pills
    let overlay = document.getElementById('acl-packet-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'acl-packet-overlay';
      overlay.className = 'acl-packet-overlay';
      ruleList.appendChild(overlay);
    } else {
      overlay.innerHTML = '';
    }
  
    // Clear any stale highlights
    ruleList.querySelectorAll('.acl-rule-row').forEach(r => {
      r.classList.remove('acl-rule-inspecting', 'acl-rule-matched-permit', 'acl-rule-matched-deny');
    });
    const implicitRow = ruleList.querySelector('.acl-rule-implicit');
    if (implicitRow) implicitRow.classList.remove('acl-rule-implicit-matched');
  
    // Animate each packet with a stagger
    packets.forEach((pkt, packetIdx) => {
      setTimeout(() => _aclAnimateSinglePacket(rules, pkt, packetIdx), packetIdx * ACL_ANIM_STAGGER_MS);
    });
  }
  
  function _aclAnimateSinglePacket(rules, pkt, packetIdx) {
    const overlay = document.getElementById('acl-packet-overlay');
    const ruleList = document.getElementById('acl-rule-list');
    if (!overlay || !ruleList) return;
    // Figure out which rule (if any) this packet matches \u2014 so we know when to burst.
    const res = _aclEvalPacket(rules, pkt);
    const matchIdx = res.ruleIdx; // -1 if implicit deny
    const finalAction = res.action;
  
    // Build the packet pill (absolute-positioned, follows a translateY path down the list)
    const pill = document.createElement('div');
    pill.className = 'acl-packet-pill acl-packet-pill-' + (packetIdx % 4); // per-packet accent tone
    pill.innerHTML = `<span class="acl-packet-proto">${escHtml(pkt.proto)}</span>
      <span class="acl-packet-src">${escHtml(pkt.src)}:${escHtml(String(pkt.sp))}</span>
      <span class="acl-packet-arrow">\u2192</span>
      <span class="acl-packet-dst">${escHtml(pkt.dst)}:${escHtml(String(pkt.dp))}</span>`;
    overlay.appendChild(pill);
  
    // Position pill at the top-left of the overlay (relative to first rule row)
    const ruleRows = Array.from(ruleList.querySelectorAll('.acl-rule-row'));
    const implicitRow = ruleList.querySelector('.acl-rule-implicit');
    // Walk down each rule; highlight for ACL_ANIM_RULE_MS each
    const nRulesToWalk = matchIdx >= 0 ? (matchIdx + 1) : rules.length;
    const walkTargets = [];
    for (let i = 0; i < nRulesToWalk; i++) {
      if (ruleRows[i]) walkTargets.push({ row: ruleRows[i], isMatch: i === matchIdx, isLast: i === nRulesToWalk - 1 });
    }
    // If no rule matched, append the implicit-deny row as the final target
    if (matchIdx < 0 && implicitRow) {
      walkTargets.push({ row: implicitRow, isMatch: true, isImplicit: true, isLast: true });
    }
  
    // Position the pill at the first rule row initially
    const firstRowRect = walkTargets[0] ? walkTargets[0].row.getBoundingClientRect() : null;
    const overlayRect = overlay.getBoundingClientRect();
    if (firstRowRect) {
      pill.style.top = (firstRowRect.top - overlayRect.top) + 'px';
      pill.style.left = '8px';
    }
    pill.classList.add('acl-packet-pill-in');
  
    // Step through each rule; use requestAnimationFrame offsets via setTimeout
    walkTargets.forEach((target, step) => {
      setTimeout(() => {
        // Position pill at this rule row
        const rowRect = target.row.getBoundingClientRect();
        pill.style.top = (rowRect.top - overlayRect.top) + 'px';
        // Highlight the rule (unless it's the implicit row \u2014 we have a separate class for that)
        if (target.isImplicit) {
          if (implicitRow) implicitRow.classList.add('acl-rule-implicit-matched');
        } else {
          target.row.classList.add('acl-rule-inspecting');
          if (target.isMatch) {
            setTimeout(() => {
              target.row.classList.remove('acl-rule-inspecting');
              target.row.classList.add(finalAction === 'permit' ? 'acl-rule-matched-permit' : 'acl-rule-matched-deny');
            }, ACL_ANIM_RULE_MS * 0.7);
          } else {
            // not matching: release highlight after dwell
            setTimeout(() => target.row.classList.remove('acl-rule-inspecting'), ACL_ANIM_RULE_MS * 0.85);
          }
        }
        // On the final step, burst the pill
        if (target.isLast) {
          setTimeout(() => {
            pill.classList.add('acl-packet-burst-' + finalAction);
            // Fade pill out after burst
            setTimeout(() => { pill.classList.add('acl-packet-fade'); }, 400);
            setTimeout(() => { pill.remove(); }, 900);
          }, ACL_ANIM_RULE_MS * 0.6);
        }
      }, step * ACL_ANIM_RULE_MS);
    });
  }
  
  function aclRunCustomPacket() {
    const src = (document.getElementById('acl-cp-src') || {}).value || '';
    const sp  = (document.getElementById('acl-cp-sp')  || {}).value || 'any';
    const dst = (document.getElementById('acl-cp-dst') || {}).value || '';
    const dp  = (document.getElementById('acl-cp-dp')  || {}).value || 'any';
    const proto = (document.getElementById('acl-cp-proto') || {}).value || 'any';
    const pkt = { src: src.trim(), sp: sp.trim(), dst: dst.trim(), dp: dp.trim(), proto };
    if (!_aclIpToUint(pkt.src) || !_aclIpToUint(pkt.dst)) {
      const r = document.getElementById('acl-custom-result');
      if (r) r.innerHTML = '<div class="acl-custom-err">Both Source IP and Dest IP must be valid IPv4 addresses (e.g. 10.0.0.5).</div>';
      return;
    }
    const res = _aclEvalPacket(aclState.rules, pkt);
    aclState.lastTest = { pkt, res };
    const r = document.getElementById('acl-custom-result');
    if (!r) return;
    const matchTxt = res.implicit ? 'implicit deny' : ('rule #' + (res.ruleIdx + 1));
    r.innerHTML = `<div class="acl-custom-ok acl-custom-ok-${res.action}">
      <span class="acl-custom-action">${res.action.toUpperCase()}</span>
      <span class="acl-custom-match">matched: ${matchTxt}</span>
      <div class="acl-custom-pkt">${escHtml(pkt.src)}:${escHtml(String(pkt.sp))} \u2192 ${escHtml(pkt.dst)}:${escHtml(String(pkt.dp))} ${escHtml(pkt.proto)}</div>
    </div>`;
  }
  
  function aclGrade() {
    const scen = aclActiveScenario();
    if (scen.id === 'free-build') return;
    aclRunAllTests();   // grading IS running all tests; share the same evaluator pass
    // Scroll the grade panel into view so the result is visible immediately
    // (v4.47.2 lesson: feedback goes where the eye is looking).
    const grade = document.getElementById('acl-grade-panel');
    if (grade) {
      try { grade.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
    }
    // Count-up animation on the score number (if animateCount helper available).
    const g = aclState.lastGrade;
    if (g && typeof animateCount === 'function') {
      const scoreEl = document.querySelector('.acl-grade-score');
      if (scoreEl) {
        scoreEl.classList.remove('acl-grade-score-pop');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('acl-grade-score-pop');
      }
    }
  }
  
  // ── Scenario picker modal ──
  function aclOpenScenarioPicker() {
    const modal = document.getElementById('acl-scenario-picker');
    if (!modal) return;
    const body = document.getElementById('acl-scenario-picker-body');
    if (body) {
      body.innerHTML = ACL_CATEGORIES.map(cat => {
        const scens = ACL_SCENARIOS.filter(s => s.category === cat.key);
        if (!scens.length) return '';
        return `<div class="acl-picker-cat">
          <div class="acl-picker-cat-title">${cat.label}</div>
          <div class="acl-picker-grid">
            ${scens.map(s => {
              const active = s.id === aclState.scenarioId;
              return `<button type="button" class="acl-picker-card acl-picker-card-${s.difficulty}${active ? ' acl-picker-card-active' : ''}" onclick="aclLoadScenario('${s.id}')">
                <div class="acl-picker-ico">${s.icon || '\ud83d\udcc4'}</div>
                <div class="acl-picker-title">${escHtml(s.title)}${active ? '<span class="acl-picker-current">Current</span>' : ''}</div>
                <div class="acl-picker-desc">${escHtml(s.description)}</div>
                <div class="acl-picker-meta">
                  <span class="acl-picker-diff acl-picker-diff-${s.difficulty}">${s.difficulty}</span>
                  ${(s.testPackets && s.testPackets.length) ? `<span class="acl-picker-tests">${s.testPackets.length} tests</span>` : ''}
                  ${(s.objectives || []).length ? `<span class="acl-picker-obj">obj ${s.objectives.join(', ')}</span>` : ''}
                </div>
              </button>`;
            }).join('')}
          </div>
        </div>`;
      }).join('');
    }
    modal.classList.remove('is-hidden');
  }
  
  function aclCloseScenarioPicker() {
    const modal = document.getElementById('acl-scenario-picker');
    if (modal) modal.classList.add('is-hidden');
  }
  
  // ── Add-Rule modal ──
  // v4.81.9: derive scenario-aware rule hints (Codex r7 #1). Pulls suggested
  // first-rule defaults + IP/port chips from the active scenario's existing
  // data (testPackets + zones). No schema change — purely a derivation.
  //
  // Returns { suggested, helper, chips } where:
  //   suggested: pre-fill values for the modal (only when ruleCount === 0)
  //   helper:    one-line scenario-specific guidance shown above the modal grid
  //   chips:     { addr: [...], port: [...] } click-to-fill quick-pick rows
  //
  // Detection rules:
  //   - If a scenario has BOTH deny + permit test packets with different srcs,
  //     it's a "block-a-host" pattern → suggest specific-deny first.
  //   - If only permit packets exist (with implicit-deny everything else),
  //     it's a "default-deny" pattern → suggest the most specific permit first.
  //   - Free Build / sandbox scenarios → no hints (return null).
  function _aclDeriveRuleHints(scen, currentRuleCount) {
    if (!scen || scen.id === 'free-build') return null;
  
    // Collect unique IPs/CIDRs from zones + test packets for chips
    const addrChips = ['any'];
    const seen = new Set(['any']);
    const addAddr = (a) => { if (a && !seen.has(a)) { seen.add(a); addrChips.push(a); } };
    (scen.zones || []).forEach(z => addAddr(z.cidr));
    (scen.testPackets || []).forEach(p => { addAddr(p.src); addAddr(p.dst); });
  
    // Common ports from test packets
    const portChips = ['any'];
    const seenP = new Set(['any']);
    const addPort = (p) => {
      if (p === undefined || p === null || p === 'any' || p === '') return;
      const s = String(p);
      if (!seenP.has(s)) { seenP.add(s); portChips.push(s); }
    };
    (scen.testPackets || []).forEach(p => { addPort(p.sp); addPort(p.dp); });
  
    // Suggested first-rule defaults — only when no rules yet
    let suggested = null;
    let helper = null;
    if (currentRuleCount === 0 && Array.isArray(scen.testPackets) && scen.testPackets.length > 0) {
      const denies = scen.testPackets.filter(p => p.expected === 'deny');
      const permits = scen.testPackets.filter(p => p.expected === 'permit');
      const firstDeny = denies[0];
      const firstPermit = permits[0];
  
      // "Block-a-host" pattern: deny + permit packets with different srcs
      if (firstDeny && firstPermit && firstDeny.src && firstPermit.src && firstDeny.src !== firstPermit.src) {
        suggested = {
          action: 'deny',
          proto: 'any',
          srcAddr: firstDeny.src,
          srcPort: 'any',
          dstAddr: 'any',
          dstPort: 'any'
        };
        helper = 'For this scenario, start with the specific deny before broader permits — ACLs are first-match-wins, so the narrowest rule must come first.';
      } else if (firstPermit && permits.length > 0 && denies.length > 0) {
        // "Default-deny" pattern: implicit deny + specific permits
        const dst = firstPermit.dst;
        const isPublicDns = dst === '8.8.8.8' || dst === '1.1.1.1';
        suggested = {
          action: 'permit',
          proto: firstPermit.proto || 'any',
          srcAddr: firstPermit.src || 'any',
          srcPort: 'any',
          dstAddr: isPublicDns ? 'any' : (dst || 'any'),
          dstPort: String(firstPermit.dp || 'any')
        };
        helper = 'Add the most specific permit first. Implicit deny at the end will block everything else.';
      }
    }
  
    return { suggested, helper, chips: { addr: addrChips, port: portChips } };
  }
  
  // v4.81.9: render a click-to-fill chip row. Clicking a chip writes its
  // value to the targetInputId — saves typing common IPs/ports.
  function _aclRenderRuleChips(containerId, values, targetInputId) {
    const host = document.getElementById(containerId);
    if (!host) return;
    if (!values || values.length === 0) { host.innerHTML = ''; host.hidden = true; return; }
    host.hidden = false;
    host.innerHTML = values.map(v =>
      '<button type="button" class="acl-rm-chip" data-target="' + targetInputId +
      '" data-value="' + escHtml(v) + '" onclick="_aclChipClick(event)">' +
      escHtml(v) + '</button>'
    ).join('');
  }
  
  // v4.81.9: chip-click handler. Reads data-target + data-value and writes
  // the value into the named input.
  function _aclChipClick(ev) {
    const btn = ev.currentTarget;
    if (!btn) return;
    const targetId = btn.getAttribute('data-target');
    const value = btn.getAttribute('data-value');
    const input = document.getElementById(targetId);
    if (!input) return;
    input.value = value;
    // Briefly highlight to confirm the fill
    input.classList.add('acl-rm-input-flash');
    setTimeout(() => input.classList.remove('acl-rm-input-flash'), 350);
    // Move focus to the input so the user can edit further
    try { input.focus(); } catch (_) {}
  }
  
  function aclOpenAddRuleModal() {
    const modal = document.getElementById('acl-rule-modal');
    if (!modal) return;
    // Reset fields — defaults shift based on scenario context (Codex r7 #1)
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const scen = (typeof ACL_SCENARIOS !== 'undefined' && aclState && aclState.scenarioId)
      ? ACL_SCENARIOS.find(s => s.id === aclState.scenarioId)
      : null;
    const hints = _aclDeriveRuleHints(scen, (aclState && aclState.rules) ? aclState.rules.length : 0);
    const sugg = (hints && hints.suggested) || {
      action: 'permit', proto: 'any',
      srcAddr: 'any', srcPort: 'any',
      dstAddr: 'any', dstPort: 'any'
    };
    set('acl-rm-action',  sugg.action);
    set('acl-rm-proto',   sugg.proto);
    set('acl-rm-srcAddr', sugg.srcAddr);
    set('acl-rm-srcPort', sugg.srcPort);
    set('acl-rm-dstAddr', sugg.dstAddr);
    set('acl-rm-dstPort', sugg.dstPort);
  
    // Helper strip — scenario-specific guidance for the first rule
    const helperEl = document.getElementById('acl-rm-helper');
    if (helperEl) {
      if (hints && hints.helper) {
        helperEl.textContent = hints.helper;
        helperEl.hidden = false;
      } else {
        helperEl.hidden = true;
        helperEl.textContent = '';
      }
    }
  
    // Quick chips — IPs for src/dst, ports for src/dst-port
    const chipAddrs = (hints && hints.chips && hints.chips.addr) || ['any'];
    const chipPorts = (hints && hints.chips && hints.chips.port) || ['any'];
    _aclRenderRuleChips('acl-rm-srcAddr-chips', chipAddrs, 'acl-rm-srcAddr');
    _aclRenderRuleChips('acl-rm-dstAddr-chips', chipAddrs, 'acl-rm-dstAddr');
    _aclRenderRuleChips('acl-rm-srcPort-chips', chipPorts, 'acl-rm-srcPort');
    _aclRenderRuleChips('acl-rm-dstPort-chips', chipPorts, 'acl-rm-dstPort');
  
    modal.classList.remove('is-hidden');
    setTimeout(() => { const el = document.getElementById('acl-rm-srcAddr'); if (el) el.focus(); }, 40);
  }
  
  function aclCloseAddRuleModal() {
    const modal = document.getElementById('acl-rule-modal');
    if (modal) modal.classList.add('is-hidden');
  }
  
  function aclSubmitAddRule() {
    const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const rule = {
      action:  get('acl-rm-action')  || 'permit',
      proto:   get('acl-rm-proto')   || 'any',
      srcAddr: get('acl-rm-srcAddr') || 'any',
      srcPort: get('acl-rm-srcPort') || 'any',
      dstAddr: get('acl-rm-dstAddr') || 'any',
      dstPort: get('acl-rm-dstPort') || 'any'
    };
    // Light validation on IPs (allow 'any' or CIDR / bare IP)
    const ipOk = v => v === 'any' || _aclIpToUint(v.split('/')[0]) !== null;
    if (!ipOk(rule.srcAddr)) { alert('Source address must be an IP, CIDR, or "any".'); return; }
    if (!ipOk(rule.dstAddr)) { alert('Dest address must be an IP, CIDR, or "any".');   return; }
    aclAddRule(rule);
    aclCloseAddRuleModal();
  }
  
  // ── AI Coach (Tier C, cached) ──
  // Same architectural shape as tbCoachTopology: check cache by scenario+rules
  // hash, show loading modal, call Sonnet, render structured response, cache.
  function _aclRulesHash() {
    const scenId = aclState.scenarioId || 'free-build';
    const rulesKey = aclState.rules.map(r => [r.action, r.proto, r.srcAddr, r.srcPort, r.dstAddr, r.dstPort].join('|')).join('\n');
    // djb2-style hash, matches style used in tbTopologyHash
    let h = 5381;
    const s = scenId + '::' + rulesKey;
    for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  
  // v4.55.2: Progressive-hint ladder. 3 tiers of authored nudges per
  // scenario (general \u2192 specific \u2192 exact). Solution reveal unlocks only
  // after tier-3 is used. Client-side, zero API cost.
  function aclShowHint() {
    const scen = aclActiveScenario();
    if (!scen || !Array.isArray(scen.hints) || scen.hints.length === 0) return;
    const used = (aclState.hintsUsed[scen.id] || 0);
    const nextTier = Math.min(used + 1, scen.hints.length);
    aclState.hintsUsed[scen.id] = nextTier;
    aclSaveState();
    _aclRenderHintModal(scen, nextTier);
    renderAclPage(); // refresh the Hint button label ("Hint (N left)")
  }
  function _aclRenderHintModal(scen, tier) {
    const modal = document.getElementById('acl-hint-modal');
    const body = document.getElementById('acl-hint-body');
    if (!modal || !body) return;
    const tierCopy = ['general nudge', 'more specific', 'near-exact'][tier - 1] || 'hint';
    const hintText = scen.hints[tier - 1] || '';
    const esc = typeof escHtml === 'function' ? escHtml : (s => s);
    const tiersHtml = scen.hints.slice(0, tier).map((h, i) => `
      <div class="acl-hint-tier acl-hint-tier-${i === tier - 1 ? 'current' : 'past'}">
        <div class="acl-hint-tier-label">Tier ${i + 1} \u00b7 ${['general nudge', 'more specific', 'near-exact'][i] || 'hint'}</div>
        <div class="acl-hint-tier-text">${esc(scen.hints[i])}</div>
      </div>
    `).join('');
    const hasSolution = Array.isArray(scen.solution) && scen.solution.length > 0;
    const solutionUnlocked = tier >= scen.hints.length;
    const solutionBtn = hasSolution && solutionUnlocked
      ? `<button type="button" class="btn btn-ghost acl-hint-solution-btn" onclick="aclShowSolution()">\ud83d\udd13 Show solution rule list</button>`
      : '';
    body.innerHTML = `
      <div class="acl-hint-tiers">${tiersHtml}</div>
      ${solutionBtn}
      <div class="acl-hint-foot">Tier ${tier} of ${scen.hints.length} \u00b7 ${tier < scen.hints.length ? 'Click Hint again for more.' : 'Final tier reached.'}</div>
    `;
    modal.hidden = false;
  }
  function dismissHintModal() {
    const modal = document.getElementById('acl-hint-modal');
    if (modal) modal.hidden = true;
  }
  function aclShowSolution() {
    const scen = aclActiveScenario();
    if (!scen || !Array.isArray(scen.solution)) return;
    aclState.solutionShown[scen.id] = true;
    aclSaveState();
    const body = document.getElementById('acl-hint-body');
    if (!body) return;
    const esc = typeof escHtml === 'function' ? escHtml : (s => s);
    const rulesList = scen.solution.map((r, i) => `
      <div class="acl-sol-rule">
        <span class="acl-sol-num">${i + 1}</span>
        <span class="acl-sol-action acl-sol-action-${r.action}">${r.action}</span>
        <span class="acl-sol-proto">${esc(r.proto || 'any')}</span>
        <span class="acl-sol-addr">${esc(r.srcAddr || 'any')}</span>
        <span class="acl-sol-sep">\u2192</span>
        <span class="acl-sol-addr">${esc(r.dstAddr || 'any')}:${esc(String(r.dstPort || 'any'))}</span>
        ${r.comment ? `<div class="acl-sol-comment">${esc(r.comment)}</div>` : ''}
      </div>
    `).join('');
    body.innerHTML = `
      <div class="acl-hint-eyebrow">\ud83d\udd13 Solution \u00b7 golden rule list</div>
      <div class="acl-sol-rules">${rulesList}</div>
      <p class="acl-hint-foot">This is one canonical solution. Your answer may differ in wording but produce equivalent behaviour.</p>
      <button type="button" class="btn btn-primary acl-sol-apply" onclick="aclApplySolution()">\ud83c\udfaf Apply this solution to my rules</button>
    `;
  }
  function aclApplySolution() {
    const scen = aclActiveScenario();
    if (!scen || !Array.isArray(scen.solution)) return;
    aclState.rules = scen.solution.map(r => ({ ...r, id: r.id || ('r_sol_' + Math.random().toString(36).slice(2, 8)) }));
    aclSaveState();
    dismissHintModal();
    renderAclPage();
    if (typeof showSuccessToast === 'function') showSuccessToast('Solution applied. Run Test All to verify.');
  }
  
  function _aclLoadCoachCache() {
    try { return JSON.parse(localStorage.getItem(STORAGE.ACL_COACH_CACHE) || '{}'); }
    catch (_) { return {}; }
  }
  function _aclSaveCoachCache(cache) {
    const entries = Object.entries(cache);
    const trimmed = entries.length > 20 ? Object.fromEntries(entries.sort((a, b) => (b[1].t || 0) - (a[1].t || 0)).slice(0, 20)) : cache;
    try { localStorage.setItem(STORAGE.ACL_COACH_CACHE, JSON.stringify(trimmed)); } catch (_) {}
  }
  
  // v4.85.7: extracted from aclAskCoach() — builds the Sonnet teacher-tier
  // prompt (rules serialization + grader output + scenario context + JSON
  // response shape). Pure: takes scenario, returns prompt string. Reads
  // aclState.rules indirectly via _aclGradeScenario.
  function _aclBuildCoachPrompt(scen) {
    const rulesText = aclState.rules.length
      ? aclState.rules.map((r, i) => `${i + 1}. ${r.action} ${r.proto} ${r.srcAddr}:${r.srcPort} → ${r.dstAddr}:${r.dstPort}`).join('\n')
      : '(empty rule list)';
    const g = _aclGradeScenario(aclState.rules, scen);
    const gradeText = g.details.length
      ? g.details.map(d => `  - ${d.label}: expected ${d.expected}, got ${d.actual}${d.implicit ? ' (implicit deny)' : ` (rule #${d.ruleIdx + 1})`} — ${d.pass ? 'PASS' : 'FAIL'}`).join('\n')
      : '(no grading data)';
    return `You are a CompTIA Network+ (N10-009) instructor reviewing a student's Access Control List for the following scenario. Be direct, specific, and tie observations to Security-domain exam concepts. Focus on why their rule list passes/fails the test packets — especially rule ordering and implicit-deny behaviour.
  
  SCENARIO: ${scen.title}
  ${scen.description}
  
  REQUIREMENTS:
  ${scen.requirements.map((r, i) => (i + 1) + '. ' + r).join('\n')}
  
  STUDENT'S RULE LIST:
  ${rulesText}
  
  GRADER OUTPUT (${g.passed}/${g.total} passing):
  ${gradeText}
  
  Respond with ONLY a JSON object (no preamble, no markdown fences) with these keys:
  {
    "tour": "A 2-3 sentence plain-English walkthrough of what their rule list actually DOES when packets hit it.",
    "strengths": ["2-3 things they got right"],
    "concerns": ["1-3 specific issues with this rule list — wrong rule order, missing rule, wrong port, etc. Reference rule numbers."],
    "fixes": ["2-3 concrete edits to make. Be specific: 'swap rules 1 and 2', 'add a permit for UDP 53', etc."],
    "concept": "1 N10-009 concept this scenario really teaches — first-match-wins, implicit deny, specific-before-general, layered defence."
  }
  
  Keep total response under 400 words. Respond with ONLY the JSON object.`;
  }
  
  async function aclAskCoach() {
    const scen = aclActiveScenario();
    if (scen.id === 'free-build') {
      if (typeof showErrorToast === 'function') showErrorToast('AI Coach is scenario-specific \u2014 pick a scenario first.');
      return;
    }
    if (aclState.rules.length === 0) {
      if (typeof showErrorToast === 'function') showErrorToast('Add some rules before asking the Coach.');
      return;
    }
    const key = (localStorage.getItem(STORAGE.KEY) || '').trim();
    if (!key) {
      if (typeof showErrorToast === 'function') showErrorToast('Add your Anthropic API key in Settings to use the Coach.');
      return;
    }
    const hash = _aclRulesHash();
    const cache = _aclLoadCoachCache();
    if (cache[hash] && cache[hash].payload) {
      _aclShowCoachModal(cache[hash].payload, scen, /*cached=*/true);
      return;
    }
    _aclShowCoachModalLoading(scen);
    const prompt = _aclBuildCoachPrompt(scen);
    try {
      const res = await _claudeFetch( {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model: CLAUDE_TEACHER_MODEL, max_tokens: MAX_TOKENS_TEACHER_DEFAULT, messages: [{ role: 'user', content: prompt }] })
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        _aclShowCoachModalError(`API returned ${res.status}. ${errText.slice(0, 160)}`);
        return;
      }
      const data = await res.json();
      const text = (data.content && data.content[0] && data.content[0].text) || '';
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      let payload;
      try { payload = JSON.parse(cleaned); }
      catch (e) {
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) { try { payload = JSON.parse(m[0]); } catch (_) {} }
      }
      if (!payload || !payload.tour) {
        _aclShowCoachModalError('Coach returned an unexpected response. Try again.');
        return;
      }
      cache[hash] = { t: Date.now(), payload };
      _aclSaveCoachCache(cache);
      _aclShowCoachModal(payload, scen, /*cached=*/false);
    } catch (e) {
      _aclShowCoachModalError(e && e.message ? e.message : 'Network error.');
    }
  }
  
  function _aclShowCoachModalLoading(scen) {
    const modal = document.getElementById('acl-coach-modal');
    const body = document.getElementById('acl-coach-body');
    if (!modal || !body) return;
    modal.classList.remove('is-hidden');
    body.innerHTML = `
      <div class="tb-coach-loading">
        <div class="tb-coach-spinner"></div>
        <div class="tb-coach-loading-text">
          <strong>Coach is analysing your ACL\u2026</strong>
          <div class="tb-coach-loading-sub">Scenario: ${escHtml(scen.title)} &middot; usually 3\u20135 seconds</div>
        </div>
      </div>`;
  }
  
  function _aclShowCoachModalError(msg) {
    const body = document.getElementById('acl-coach-body');
    if (!body) return;
    body.innerHTML = `
      <div class="tb-coach-error">
        <div class="tb-coach-error-title">\u26A0 Coach couldn\'t reach the API</div>
        <div class="tb-coach-error-msg">${escHtml(msg)}</div>
        <button type="button" class="btn btn-ghost" onclick="aclAskCoach()" style="margin-top:12px">Retry</button>
      </div>`;
  }
  
  function _aclShowCoachModal(payload, scen, cached) {
    const modal = document.getElementById('acl-coach-modal');
    const body = document.getElementById('acl-coach-body');
    if (!modal || !body) return;
    modal.classList.remove('is-hidden');
    const list = arr => Array.isArray(arr) && arr.length
      ? `<ul class="tb-coach-list">${arr.map(x => `<li>${escHtml(String(x))}</li>`).join('')}</ul>`
      : '<div class="tb-coach-empty">(none)</div>';
    body.innerHTML = `
      <div class="tb-coach-content">
        <div class="tb-coach-tour">${escHtml(payload.tour || '')}</div>
        <div class="tb-coach-grid">
          <div class="tb-coach-sec"><h4>\u2714 Strengths</h4>${list(payload.strengths)}</div>
          <div class="tb-coach-sec"><h4>\u26A0 Concerns</h4>${list(payload.concerns)}</div>
          <div class="tb-coach-sec"><h4>\ud83d\udd27 Fixes</h4>${list(payload.fixes)}</div>
        </div>
        <div class="tb-coach-concept"><strong>\ud83c\udf93 Concept:</strong> ${escHtml(payload.concept || '')}</div>
        ${cached ? '<div class="tb-coach-cached">Cached \u2014 same rule list as before.</div>' : ''}
      </div>`;
  }
  
  function aclCloseCoachModal() {
    const modal = document.getElementById('acl-coach-modal');
    if (modal) modal.classList.add('is-hidden');
  }

  // ── Expose to window so onclick handlers (in dynamically rendered HTML
  //    AND in index.html static onclicks) find them after lazy-load ──
  // 18 onclick targets, audited from grep across both app.js + index.html.
  window.aclLoadScenario = aclLoadScenario;
  window.aclAddRule = aclAddRule;
  window.aclDeleteRule = aclDeleteRule;
  window.aclMoveRule = aclMoveRule;
  window.aclClearRules = aclClearRules;
  window.aclRunAllTests = aclRunAllTests;
  window.aclRunCustomPacket = aclRunCustomPacket;
  window.aclGrade = aclGrade;
  window.aclReplayAnimation = aclReplayAnimation;
  window.aclShowHint = aclShowHint;
  window.aclShowSolution = aclShowSolution;
  window.aclApplySolution = aclApplySolution;
  window.aclAskCoach = aclAskCoach;
  window.aclOpenScenarioPicker = aclOpenScenarioPicker;
  window.aclCloseScenarioPicker = aclCloseScenarioPicker;
  window.aclOpenAddRuleModal = aclOpenAddRuleModal;
  window.aclCloseAddRuleModal = aclCloseAddRuleModal;
  window.aclSubmitAddRule = aclSubmitAddRule;
  window.aclCloseCoachModal = aclCloseCoachModal;

  // ── Register feature module entry point ──
  // Same contract as v4.99.36 (NA), v4.99.37 (PHT), v4.99.38 (Port Drill),
  // v4.99.39 (IRW), v4.99.42 (Subnet Trainer). Shell calls
  // window._certanvilFeatures["acl-builder"].enter() after lazy-load.
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures["acl-builder"] = {
    enter: function() {
      // Original openAclBuilder body inlined here. Pro gate fires from
      // the shell stub, so we don't double-gate.
      aclLoadState();
      renderAclPage();
    },
    leave: function() {
      // Modal cleanup on page-leave. Animation setTimeouts self-clean.
      try {
        var coach = document.getElementById("acl-coach-modal");
        if (coach) coach.classList.add("is-hidden");
        var picker = document.getElementById("acl-scenario-picker");
        if (picker) picker.classList.add("is-hidden");
        var addRule = document.getElementById("acl-add-rule-modal");
        if (addRule) addRule.classList.add("is-hidden");
      } catch (_) {}
    },
  };
})();
