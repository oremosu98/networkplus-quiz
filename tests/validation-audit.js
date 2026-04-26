#!/usr/bin/env node
// ══════════════════════════════════════════
// Validation Audit — measures catch rate of validateQuestions()
// against a hand-crafted corpus of known-broken questions.
//
// Run: node tests/validation-audit.js
// ══════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

// ── Extract validateQuestions() source with regex ──
// It's a top-level `function validateQuestions(qs) { ... }` block.
function extractFunction(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('Could not find function ' + name);
  let depth = 0;
  let i = src.indexOf('{', start);
  const bodyStart = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

// Extract all helpers needed by validateQuestions
const validateQuestionsSrc = extractFunction(js, 'validateQuestions');
const groundTruthSrc = extractFunction(js, '_groundTruthOk');
const numericOptionSrc = extractFunction(js, '_numericOptionOk');
const smallestSubnetSrc = extractFunction(js, '_smallestSubnetOk');
// v4.57.2: interrogative guard helper is called from validateQuestions
const stemInterrogativeSrc = extractFunction(js, '_stemHasInterrogative');
// v4.62.2: CompTIA troubleshooting-methodology order guard
const tsOrderOkSrc = extractFunction(js, '_tbTroubleshootingOrderOk');
// v4.81.16: stem-numeric-vs-answer-count + multi-select GT facts
const stemNumericSrc = extractFunction(js, '_stemNumericMatchesAnswerCount');
const multiSelectGtSrc = extractFunction(js, '_multiSelectGroundTruthOk');

// Extract GT_* constants block (GT_PORTS, GT_OSI, GT_WIFI_BROKEN, GT_WIFI_DEPRECATED)
function extractConstBlock(src, startName) {
  const start = src.indexOf('const ' + startName);
  if (start === -1) throw new Error('Could not find ' + startName);
  // Find the end — walk until the closing }; or ] on its own line followed by a newline
  // Simpler: find the matching brace/bracket for the literal
  let i = src.indexOf(startName, start) + startName.length;
  while (src[i] && src[i] !== '{' && src[i] !== '[' && src[i] !== '=') i++;
  while (src[i] && src[i] === '=') i++;
  while (src[i] && /\s/.test(src[i])) i++;
  const open = src[i];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) { depth--; if (depth === 0) { i++; break; } }
  }
  // Include trailing semicolon if present
  if (src[i] === ';') i++;
  return src.slice(start, i);
}

const gtPortsSrc = extractConstBlock(js, 'GT_PORTS');
const gtOsiSrc = extractConstBlock(js, 'GT_OSI');
const gtWifiBrokenSrc = extractConstBlock(js, 'GT_WIFI_BROKEN');
const gtWifiDeprecatedSrc = extractConstBlock(js, 'GT_WIFI_DEPRECATED');
// v4.81.16: stem-numeric word→int map consumed by _stemNumericMatchesAnswerCount
const stemNumberWordsSrc = extractConstBlock(js, '_STEM_NUMBER_WORDS');

// Stubs for dependencies
const stub = `
  const STORAGE = { REPORTS: 'nplus_reports' };
  function loadReports() { return []; }
  function getQType(q) { return q.type || 'mcq'; }
  ${gtPortsSrc}
  ${gtOsiSrc}
  ${gtWifiBrokenSrc}
  ${gtWifiDeprecatedSrc}
  ${stemNumberWordsSrc}
  ${groundTruthSrc}
  ${numericOptionSrc}
  ${smallestSubnetSrc}
  ${stemInterrogativeSrc}
  ${tsOrderOkSrc}
  ${stemNumericSrc}
  ${multiSelectGtSrc}
  ${validateQuestionsSrc}
  module.exports = validateQuestions;
`;

// Write stub to a temp file and require it
const tmp = path.join(__dirname, '.validation-audit-tmp.js');
fs.writeFileSync(tmp, stub);
const validateQuestions = require(tmp);
fs.unlinkSync(tmp);

// ── Broken question corpus ──
// Each entry has: id, category, question, shouldBeCaught (true = we expect the
// filter to drop it), notes
const corpus = [
  // ── 1. PREMISE-ANSWER CONTRADICTION (v4.38.2 target) ──
  {
    id: 1,
    category: 'Premise-answer contradiction',
    q: {
      type: 'mcq',
      question: 'PC-A is on VLAN 30 and PC-B is on VLAN 30. Both are connected to the same L2 switch. Why are they unable to communicate?',
      options: { A: 'They are on different VLANs', B: 'STP is blocking the port', C: 'DHCP is misconfigured', D: 'ARP cache is stale' },
      answer: 'A',
      explanation: 'When two devices are on different VLANs, they cannot communicate without a router. VLAN segmentation is a Layer 2 boundary.',
      objective: '2.1',
      difficulty: 'Exam Level',
      topic: 'VLANs'
    },
    shouldBeCaught: true,
    notes: 'Stem explicitly says both on VLAN 30 but answer claims different VLANs. Pure logic contradiction — programmatic check cannot catch without semantic understanding.'
  },

  // ── 2. EXPLANATION-ANSWER MISMATCH (v4.38.3 target — DC tier style) ──
  {
    id: 2,
    category: 'Explanation-answer mismatch',
    q: {
      type: 'mcq',
      question: 'An organization implements a traditional three-tier data center architecture. Which tier is primarily responsible for housing servers and storage?',
      options: { A: 'Access tier', B: 'Core tier', C: 'Aggregation tier', D: 'Distribution tier' },
      answer: 'B',
      explanation: 'In the three-tier data center model, the access tier (also called the edge tier) contains servers, storage arrays, and compute resources. The core tier provides backbone connectivity between aggregation points, the aggregation tier sits between access and core, and the distribution tier manages traffic distribution — none of these primary functions involve hosting servers and storage.',
      objective: '1.8',
      difficulty: 'Foundational',
      topic: 'Data Center Architectures'
    },
    shouldBeCaught: true,
    notes: 'Explanation supports option A ("access tier contains servers") but answer marked as B. Should be caught by v4.38.3 scoring check.'
  },

  // ── 3. PORT NUMBER WRONG ──
  {
    id: 3,
    category: 'Factual error — wrong port',
    q: {
      type: 'mcq',
      question: 'Which port does SSH use by default?',
      options: { A: 'Port 21', B: 'Port 22', C: 'Port 23', D: 'Port 443' },
      answer: 'A',
      explanation: 'SSH provides secure remote access and uses port 22 by default, replacing the older Telnet protocol.',
      objective: '1.4',
      difficulty: 'Foundational',
      topic: 'Ports'
    },
    shouldBeCaught: true,
    notes: 'Factual error — answer is A (Port 21) but SSH is port 22 (B). Explanation says "port 22" correctly. Keyword scoring blind because "22" is 2 chars and "port" is a stopword.'
  },

  // ── 4. PORT NUMBER — EXPLANATION AGREES WITH WRONG ANSWER ──
  {
    id: 4,
    category: 'Factual error — both answer and explanation wrong',
    q: {
      type: 'mcq',
      question: 'Which port is used by HTTPS?',
      options: { A: '80', B: '8080', C: '443', D: '22' },
      answer: 'A',
      explanation: 'HTTPS uses port 80, the standard HTTP port, to encrypt traffic over TLS.',
      objective: '1.4',
      difficulty: 'Foundational',
      topic: 'Ports'
    },
    shouldBeCaught: true,
    notes: 'Both answer and explanation wrong (HTTPS is 443, not 80). Only a ground-truth lookup table can catch this. No current layer does.'
  },

  // ── 5. TWO CORRECT ANSWERS ──
  {
    id: 5,
    category: 'Two valid answers',
    q: {
      type: 'mcq',
      question: 'Which of the following is a valid IPv4 private address range?',
      options: { A: '10.0.0.0/8', B: '192.168.0.0/16', C: '172.16.0.0/12', D: '8.8.8.8/32' },
      answer: 'A',
      explanation: '10.0.0.0/8 is the largest private IPv4 range defined in RFC 1918.',
      objective: '1.5',
      difficulty: 'Foundational',
      topic: 'IP Addressing'
    },
    shouldBeCaught: true,
    notes: 'A, B, and C are ALL valid private ranges. Only D is public. Question is logically broken — needs (Choose all) qualifier or different distractors.'
  },

  // ── 6. ZERO CORRECT ANSWERS ──
  {
    id: 6,
    category: 'No correct answer',
    q: {
      type: 'mcq',
      question: 'Which protocol operates at OSI Layer 3?',
      options: { A: 'HTTP', B: 'TCP', C: 'Ethernet', D: 'FTP' },
      answer: 'A',
      explanation: 'HTTP is a Layer 7 protocol — wait, none of these options are Layer 3. IP would be the correct answer but it is not listed.',
      objective: '1.1',
      difficulty: 'Foundational',
      topic: 'OSI'
    },
    shouldBeCaught: true,
    notes: 'None of the 4 options are Layer 3. Explanation even admits this. Should ideally be caught — explanation confesses the error.'
  },

  // ── 7. NEGATION TRAP (potential false positive for v4.38.3 check) ──
  {
    id: 7,
    category: 'Negation phrasing (GOOD question)',
    q: {
      type: 'mcq',
      question: 'A technician needs to configure a secure remote access protocol. Which of the following should they use?',
      options: { A: 'Telnet', B: 'SSH', C: 'HTTP', D: 'FTP' },
      answer: 'B',
      explanation: 'SSH provides secure remote access by encrypting all traffic. Telnet is NOT secure — it sends credentials in plaintext. HTTP and FTP also transmit data unencrypted and should not be used for secure remote access.',
      objective: '4.1',
      difficulty: 'Foundational',
      topic: 'Security Protocols'
    },
    shouldBeCaught: false,
    notes: 'This is a GOOD question. Answer is correct (SSH). But the explanation heavily mentions "telnet" (option A) because it negates it. v4.38.3 scoring might falsely flag this.'
  },

  // ── 8. SHORT-OPTION AMBIGUITY ──
  {
    id: 8,
    category: 'Short options, keyword blindness',
    q: {
      type: 'mcq',
      question: 'Which protocol is connection-oriented?',
      options: { A: 'UDP', B: 'TCP', C: 'ICMP', D: 'IP' },
      answer: 'A',
      explanation: 'TCP establishes a three-way handshake before transmitting data, making it connection-oriented. UDP is connectionless.',
      objective: '1.1',
      difficulty: 'Foundational',
      topic: 'Transport Layer'
    },
    shouldBeCaught: true,
    notes: 'Answer marked A (UDP) but explanation says TCP is connection-oriented. Option texts are 3-4 chars → scoring check has little to work with. Wrong-letter claim check should catch if "TCP" appears where A is expected... but TCP is option B.'
  },

  // ── 9. OUTDATED SECURITY FACT ──
  {
    id: 9,
    category: 'Outdated fact',
    q: {
      type: 'mcq',
      question: 'Which wireless encryption standard is currently considered secure?',
      options: { A: 'WEP', B: 'WPA', C: 'WPA2', D: 'Open' },
      answer: 'A',
      explanation: 'WEP uses RC4 encryption and is the most secure wireless encryption standard available today.',
      objective: '4.3',
      difficulty: 'Foundational',
      topic: 'Wireless Security'
    },
    shouldBeCaught: true,
    notes: 'WEP is broken and has been for 20 years. Answer is factually wrong. No distractor is actually correct (WPA2 is acceptable but not "currently secure" — WPA3 is). Ground-truth lookup needed.'
  },

  // ── 10. SUBJECTIVE QUALIFIER ──
  {
    id: 10,
    category: 'Subjective / ambiguous qualifier',
    q: {
      type: 'mcq',
      question: 'Which topology is MOST COMMONLY used in modern enterprise LANs?',
      options: { A: 'Star', B: 'Mesh', C: 'Ring', D: 'Bus' },
      answer: 'A',
      explanation: 'The star topology is most common in enterprise LANs because each endpoint connects to a central switch.',
      objective: '1.2',
      difficulty: 'Foundational',
      topic: 'Topologies'
    },
    shouldBeCaught: false,
    notes: 'This is a GOOD question — star IS most common. But "MOST COMMONLY" is subjective and opens doors to disputes. Not a validation failure.'
  },

  // ── 11. EXPLANATION EXPLICITLY STATES WRONG LETTER ──
  {
    id: 11,
    category: 'Explicit wrong-letter claim',
    q: {
      type: 'mcq',
      question: 'Which command displays the routing table on a Cisco router?',
      options: { A: 'show interface', B: 'show ip route', C: 'show running-config', D: 'show vlan brief' },
      answer: 'A',
      explanation: 'The correct answer is B. "show ip route" displays the routing table with all learned and connected routes.',
      objective: '5.3',
      difficulty: 'Foundational',
      topic: 'CLI'
    },
    shouldBeCaught: true,
    notes: 'Explanation literally says "The correct answer is B" but answer field says A. Existing wrong-letter-claim check should catch this.'
  },

  // ── 12. KEYWORD CROSS-CONTAMINATION ──
  {
    id: 12,
    category: 'Cross-option keyword overlap',
    q: {
      type: 'mcq',
      question: 'Which type of access list permits or denies traffic based on source IP, destination IP, and port number?',
      options: { A: 'Standard access list', B: 'Extended access list', C: 'Named access list', D: 'Reflexive access list' },
      answer: 'A',
      explanation: 'An extended access list can filter based on source IP, destination IP, protocol, and port number, making it more granular than a standard access list which only filters on source IP.',
      objective: '4.3',
      difficulty: 'Exam Level',
      topic: 'ACLs'
    },
    shouldBeCaught: true,
    notes: 'Every option contains "access list". Answer A (Standard) but explanation clearly describes Extended. Scoring should detect "extended" in explanation matches B over A.'
  },

  // ── 13. PREMISE-ANSWER CONTRADICTION — WPA3 STATED ──
  {
    id: 13,
    category: 'Premise-answer contradiction (WPA3)',
    q: {
      type: 'mcq',
      question: 'A wireless network is configured with WPA3-Personal. What is the MOST LIKELY cause of a client failing to authenticate?',
      options: { A: 'The client is using an outdated WEP-only adapter', B: 'The signal strength is too low', C: 'The SSID is hidden', D: 'WPA3 is not enabled on the AP' },
      answer: 'D',
      explanation: 'If WPA3 is not enabled on the access point, the client cannot use WPA3 encryption and will fail to authenticate.',
      objective: '4.3',
      difficulty: 'Exam Level',
      topic: 'Wireless'
    },
    shouldBeCaught: true,
    notes: 'Stem says WPA3 IS configured, answer says WPA3 is NOT enabled. Direct contradiction.'
  },

  // ── 14. GOOD QUESTION — CONTROL ──
  {
    id: 14,
    category: 'Clean question (control)',
    q: {
      type: 'mcq',
      question: 'A network administrator needs to segment broadcast domains without adding physical routers. Which feature should they use?',
      options: { A: 'STP', B: 'VLAN', C: 'LACP', D: 'NAT' },
      answer: 'B',
      explanation: 'VLANs logically segment broadcast domains on a single switch without requiring additional physical hardware. STP prevents loops, LACP bundles links, and NAT translates addresses — none of these segment broadcast domains.',
      objective: '2.1',
      difficulty: 'Foundational',
      topic: 'VLANs'
    },
    shouldBeCaught: false,
    notes: 'Clean question, factually correct, explanation supports B.'
  },

  // ── 15. GOOD QUESTION — CONTROL 2 ──
  {
    id: 15,
    category: 'Clean question (control)',
    q: {
      type: 'mcq',
      question: 'Which Layer 2 protocol prevents switching loops?',
      options: { A: 'OSPF', B: 'BGP', C: 'STP', D: 'RIP' },
      answer: 'C',
      explanation: 'Spanning Tree Protocol (STP) prevents Layer 2 switching loops by blocking redundant paths. OSPF, BGP, and RIP are Layer 3 routing protocols, not loop prevention mechanisms.',
      objective: '2.1',
      difficulty: 'Foundational',
      topic: 'STP'
    },
    shouldBeCaught: false,
    notes: 'Clean question, correct answer, clear explanation.'
  },

  // ── 16. MISSING OBJECTIVE ──
  {
    id: 16,
    category: 'Missing objective tag',
    q: {
      type: 'mcq',
      question: 'Which device operates at Layer 2?',
      options: { A: 'Router', B: 'Switch', C: 'Hub', D: 'Firewall' },
      answer: 'B',
      explanation: 'A switch operates at Layer 2 using MAC addresses to forward frames.',
      difficulty: 'Foundational',
      topic: 'OSI'
    },
    shouldBeCaught: true,
    notes: 'No objective field. Existing v4.8 check should drop this.'
  },

  // ── 17. INVALID OBJECTIVE FORMAT ──
  {
    id: 17,
    category: 'Invalid objective',
    q: {
      type: 'mcq',
      question: 'Which is a dynamic routing protocol?',
      options: { A: 'OSPF', B: 'ARP', C: 'DNS', D: 'DHCP' },
      answer: 'A',
      explanation: 'OSPF is a link-state dynamic routing protocol.',
      objective: '99.99',
      difficulty: 'Foundational',
      topic: 'Routing'
    },
    shouldBeCaught: true,
    notes: 'Objective does not match /[1-5]\\.[1-8]/ range. Existing v4.8 check should drop this.'
  },

  // ── 18. EXPLANATION TOO SHORT ──
  {
    id: 18,
    category: 'Stub explanation',
    q: {
      type: 'mcq',
      question: 'What port does DNS use?',
      options: { A: '53', B: '80', C: '443', D: '22' },
      answer: 'A',
      explanation: 'DNS.',
      objective: '1.4',
      difficulty: 'Foundational',
      topic: 'Ports'
    },
    shouldBeCaught: true,
    notes: 'Explanation length < 15 chars. Existing length check should drop this.'
  },

  // ── 19. SUBNET MATH WRONG ──
  {
    id: 19,
    category: 'Subnet math error',
    q: {
      type: 'mcq',
      question: 'How many usable host addresses are in a /29 subnet?',
      options: { A: '8', B: '6', C: '14', D: '30' },
      answer: 'A',
      explanation: 'A /29 subnet has 2^3 = 8 total addresses. Subtracting the network and broadcast leaves 6 usable host addresses.',
      objective: '1.5',
      difficulty: 'Exam Level',
      topic: 'Subnetting'
    },
    shouldBeCaught: true,
    notes: 'Answer A (8) but explanation says 6 usable (which is correct, option B). Scoring check may catch — "6" is short, "usable" keyword may cross-match.'
  },

  // ── 20. INVALID ANSWER LETTER ──
  {
    id: 20,
    category: 'Malformed answer letter',
    q: {
      type: 'mcq',
      question: 'Which layer does TCP operate at?',
      options: { A: 'Layer 1', B: 'Layer 2', C: 'Layer 3', D: 'Layer 4' },
      answer: 'E',
      explanation: 'TCP is a Layer 4 transport protocol.',
      objective: '1.1',
      difficulty: 'Foundational',
      topic: 'OSI'
    },
    shouldBeCaught: true,
    notes: 'Answer letter E does not exist. Existing check should drop this.'
  },

  // ── 21. SUBNET SIZING — wasteful mask marked (v4.43.8 target, real user bug) ──
  {
    id: 21,
    category: 'Subnet sizing — wasteful subnet marked as answer',
    q: {
      type: 'mcq',
      question: 'An enterprise network administrator assigns 10.50.0.0/16 to a department. The department requires 5 subnets with at least 4,000 usable hosts each. Which subnet mask should be used?',
      options: { A: '/19 (255.255.224.0)', B: '/20 (255.255.240.0)', C: '/21 (255.255.248.0)', D: '/18 (255.255.192.0)' },
      answer: 'A',
      explanation: '/19 provides 2^(32-19) = 8,192 total addresses per subnet (8,190 usable hosts), which meets the 4,000 minimum and allows 8 subnets from the /16. /20 provides 4,096 total (4,094 usable), which barely meets the requirement but only allows 16 subnets. /21 provides 2,048 total (2,046 usable), which is insufficient. /18 allows only 4 subnets from /16, leaving no room for 5 required subnets. The best answer balancing the 5-subnet requirement and 4,000+ usable hosts is /19.',
      objective: '1.4',
      difficulty: 'Hard',
      topic: 'Subnetting & IP Addressing'
    },
    shouldBeCaught: true,
    notes: 'Real user-reported bug (2026-04-17). Both /19 and /20 satisfy constraints, but /20 is correct (smallest-satisfying subnet). Haiku picked /19 claiming "more headroom is better." v4.43.8 guard (_smallestSubnetOk) should detect and reject.'
  },

  // ── 22. SUBNET SIZING — only one option satisfies, marked correctly (control) ──
  {
    id: 22,
    category: 'Subnet sizing — single satisfying option, marked correctly',
    q: {
      type: 'mcq',
      question: 'A department is assigned 10.0.0.0/16 and needs 3 subnets with at least 8,000 usable hosts each. Which subnet mask should be used?',
      options: { A: '/19 (255.255.224.0)', B: '/20 (255.255.240.0)', C: '/21 (255.255.248.0)', D: '/22 (255.255.252.0)' },
      answer: 'A',
      explanation: '/19 provides 8,190 usable hosts per subnet (meets the 8,000 minimum) and 8 subnets from /16 (covers the 3-subnet requirement). /20 only gives 4,094 usable, which is insufficient. /21 and /22 are even smaller. /19 is the smallest subnet that satisfies both constraints.',
      objective: '1.4',
      difficulty: 'Hard',
      topic: 'Subnetting & IP Addressing'
    },
    shouldBeCaught: false,
    notes: 'Control — /19 is the ONLY option providing >=8,000 usable hosts. Marked answer is correct. v4.43.8 guard should activate and pass (smallest-satisfying = marked).'
  },

  // ── 23. NON-SIZING subnet question (regression control for the v4.43.8 guard) ──
  {
    id: 23,
    category: 'Non-sizing subnet question (guard should not activate)',
    q: {
      type: 'mcq',
      question: 'What is the network address for 192.168.1.100/26?',
      options: { A: '192.168.1.0', B: '192.168.1.64', C: '192.168.1.100', D: '192.168.1.128' },
      answer: 'B',
      explanation: 'Using the block size method: block = 64, multiples are 0, 64, 128, 192. 100 falls in the 64 block. Network = 192.168.1.64.',
      objective: '1.4',
      difficulty: 'Foundational',
      topic: 'Subnetting & IP Addressing'
    },
    shouldBeCaught: false,
    notes: 'Control — non-sizing question. The v4.43.8 sizingRe regex should NOT match (no "at least N hosts" phrasing) so the guard short-circuits. Options are IP addresses, not CIDRs/masks.'
  }
];

// ── Run audit ──
console.log('\n\x1b[1m╔══════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[1m║  VALIDATION AUDIT — v4.38.3 pipeline catch rate  ║\x1b[0m');
console.log('\x1b[1m╚══════════════════════════════════════════════════╝\x1b[0m\n');

let caughtTP = 0;  // true positive — broken q correctly dropped
let missedFN = 0;  // false negative — broken q slipped through
let passedTN = 0;  // true negative — good q correctly kept
let droppedFP = 0; // false positive — good q wrongly dropped
const slips = [];
const falsePositives = [];

corpus.forEach(entry => {
  const result = validateQuestions([entry.q]);
  const wasDropped = result.length === 0;
  const expectedDrop = entry.shouldBeCaught;

  let outcome;
  if (expectedDrop && wasDropped) { caughtTP++; outcome = '\x1b[32mCAUGHT\x1b[0m    '; }
  else if (expectedDrop && !wasDropped) { missedFN++; outcome = '\x1b[31mSLIPPED\x1b[0m   '; slips.push(entry); }
  else if (!expectedDrop && !wasDropped) { passedTN++; outcome = '\x1b[32mKEPT\x1b[0m      '; }
  else { droppedFP++; outcome = '\x1b[33mFALSE POS\x1b[0m '; falsePositives.push(entry); }

  const idStr = String(entry.id).padStart(2, ' ');
  console.log(`  #${idStr}  ${outcome}  ${entry.category}`);
});

const total = corpus.length;
const broken = corpus.filter(c => c.shouldBeCaught).length;
const good = total - broken;
const catchRate = broken > 0 ? (caughtTP / broken * 100).toFixed(1) : 'N/A';
const fpRate = good > 0 ? (droppedFP / good * 100).toFixed(1) : 'N/A';

console.log('\n\x1b[1m── RESULTS ──\x1b[0m');
console.log(`  Total questions tested: ${total}`);
console.log(`  Broken questions:       ${broken}   (expected to be caught)`);
console.log(`  Good questions:         ${good}    (expected to pass)`);
console.log('');
console.log(`  \x1b[32mTrue positives  (caught):\x1b[0m  ${caughtTP} / ${broken}  —  \x1b[1m${catchRate}%\x1b[0m catch rate`);
console.log(`  \x1b[31mFalse negatives (slipped):\x1b[0m ${missedFN}`);
console.log(`  \x1b[32mTrue negatives  (kept):\x1b[0m    ${passedTN} / ${good}`);
console.log(`  \x1b[33mFalse positives (dropped):\x1b[0m ${droppedFP}  —  ${fpRate}% false-positive rate`);

if (slips.length > 0) {
  console.log('\n\x1b[1;31m── QUESTIONS THAT SLIPPED THROUGH ──\x1b[0m');
  slips.forEach(s => {
    console.log(`\n  \x1b[1m#${s.id}  ${s.category}\x1b[0m`);
    console.log(`     Q: "${s.q.question.slice(0, 100)}${s.q.question.length > 100 ? '...' : ''}"`);
    console.log(`     Why it slipped: ${s.notes}`);
  });
}

if (falsePositives.length > 0) {
  console.log('\n\x1b[1;33m── GOOD QUESTIONS INCORRECTLY DROPPED ──\x1b[0m');
  falsePositives.forEach(f => {
    console.log(`\n  \x1b[1m#${f.id}  ${f.category}\x1b[0m`);
    console.log(`     Q: "${f.q.question.slice(0, 100)}${f.q.question.length > 100 ? '...' : ''}"`);
    console.log(`     Why it was wrongly dropped: ${f.notes}`);
  });
}

console.log('');

// CI gate: enforce regression thresholds. Programmatic validator only catches
// deterministic failure modes (port numbers, OSI, subnet math, objectives).
// Semantic contradictions need the AI validator layer — we track the floor
// here so that a refactor can't silently regress us below the known baseline.
const MIN_CATCH_RATE = 60;  // v4.38.4 baseline: 62.5%
const MAX_FP_RATE = 0;      // never wrongly drop a good question
const catchRateNum = broken > 0 ? (caughtTP / broken * 100) : 100;
const fpRateNum = good > 0 ? (droppedFP / good * 100) : 0;

let failed = false;
if (catchRateNum < MIN_CATCH_RATE) {
  console.log(`\x1b[1;31m✗ REGRESSION:\x1b[0m catch rate ${catchRateNum.toFixed(1)}% dropped below floor of ${MIN_CATCH_RATE}%`);
  failed = true;
}
if (fpRateNum > MAX_FP_RATE) {
  console.log(`\x1b[1;31m✗ REGRESSION:\x1b[0m false-positive rate ${fpRateNum.toFixed(1)}% exceeds ceiling of ${MAX_FP_RATE}%`);
  failed = true;
}
if (failed) {
  console.log('\x1b[1;31mValidation audit FAILED — the programmatic validator has regressed.\x1b[0m\n');
  process.exit(1);
} else {
  console.log(`\x1b[1;32m✓ Validation audit PASSED\x1b[0m (catch ${catchRateNum.toFixed(1)}% ≥ ${MIN_CATCH_RATE}%, FP ${fpRateNum.toFixed(1)}% ≤ ${MAX_FP_RATE}%)\n`);
}
