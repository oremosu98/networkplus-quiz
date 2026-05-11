// ════════════════════════════════════════════════════════════════════
// features/subnet-trainer.js — Phase 11b feature module (v4.99.42)
// ════════════════════════════════════════════════════════════════════
//
// Extracted from app.js lines 27955-28850 (~896 LOC). Subnet Trainer:
// adaptive practice + 21 question types, lesson sidebar with gating,
// drill / timed-challenge / focus modes, dashboard with weakest-category
// + stale-category callouts, AI coach (Tier B Sonnet with binary-breakdown
// authoritative-facts injection so the math is always exact).
//
// CRITICAL cleanup: stTimerInterval (timed challenge). Exposed as
// window._subnetTrainerTeardown for goSetup defensive cleanup.
// ════════════════════════════════════════════════════════════════════

(function() {
  "use strict";

  // ══════════════════════════════════════════
  // SUBNET MASTERY — Interactive Learning + Adaptive Practice + Dashboard
  // ══════════════════════════════════════════
  
  // ── Utilities (kept from v1, extended) ──
  function cidrToMask(cidr) {
    const bits = '1'.repeat(cidr) + '0'.repeat(32 - cidr);
    return [bits.slice(0,8), bits.slice(8,16), bits.slice(16,24), bits.slice(24,32)].map(b => parseInt(b, 2)).join('.');
  }
  function cidrToMaskArr(cidr) {
    const bits = '1'.repeat(cidr) + '0'.repeat(32 - cidr);
    return [parseInt(bits.slice(0,8),2), parseInt(bits.slice(8,16),2), parseInt(bits.slice(16,24),2), parseInt(bits.slice(24,32),2)];
  }
  function arrToIp(a) { return a.join('.'); }
  function getSubnetAddr(ipArr, maskArr) { return ipArr.map((o,i) => o & maskArr[i]); }
  function getBroadcastAddr(ipArr, maskArr) { return ipArr.map((o,i) => (o & maskArr[i]) | (~maskArr[i] & 255)); }
  function hostCount(cidr) { return cidr >= 31 ? (cidr === 31 ? 2 : 1) : Math.pow(2, 32 - cidr) - 2; }
  function randOctet() { return Math.floor(Math.random() * 254) + 1; }
  function blockSize(cidr) { return Math.pow(2, 32 - cidr); }
  function maskToWildcard(mask) { return mask.split('.').map(o => 255 - parseInt(o)).join('.'); }
  // v4.62.4: wildcardToMask + classOfIp removed — zero callers anywhere
  // in the project. Subnet quiz uses maskToWildcard (forward) only;
  // ACL wildcards come from user input, not reverse-computed from masks.
  function ipToBinaryStr(ipStr) { return ipStr.split('.').map(o => parseInt(o).toString(2).padStart(8,'0')).join('.'); }
  function cidrForHosts(needed) { for (let p = 2; p <= 24; p++) { if (Math.pow(2,p) - 2 >= needed) return 32 - p; } return 8; }
  function nthSubnet(networkArr, origCidr, newCidr, n) {
    const bs = blockSize(newCidr);
    const startIp = networkArr[0]*16777216 + networkArr[1]*65536 + networkArr[2]*256 + networkArr[3];
    const nthIp = startIp + n * bs;
    return [(nthIp>>>24)&255, (nthIp>>>16)&255, (nthIp>>>8)&255, nthIp&255];
  }
  function defaultMaskForClass(cls) { return cls==='A'?'/8':cls==='B'?'/16':'/24'; }
  function randCidrForLevel(level) {
    if (level === 'beginner') return [24,25,26,27,28,29,30][Math.floor(Math.random()*7)];
    if (level === 'intermediate') return [16,20,22,23,24,25,26,27,28,29,30][Math.floor(Math.random()*11)];
    return [8,10,12,14,16,18,20,22,23,24,25,26,27,28,29,30][Math.floor(Math.random()*16)];
  }
  
  // ── State ──
  let stQ = null, stIdx = 0, stCorrect = 0, stTotal = 0, stStreak = 0;
  let stMode = 'drill'; // 'drill' | 'timed' | 'focus'
  let stFocusCat = null; // category id when mode=focus
  let stTimerInterval = null, stTimerValue = 60;
  let stQuestionStartTime = 0;
  let stActiveLesson = null;
  
  // ── Question Categories ──
  const ST_CATEGORIES = {
    masks:      { label: 'Masks & CIDR',       icon: '\ud83c\udfad', color: '#7c6ff7', types: ['cidr_to_mask','mask_to_cidr','mask_to_wildcard','wildcard_to_mask','binary_to_mask'] },
    addressing: { label: 'Network & Broadcast', icon: '\ud83c\udfef', color: '#22c55e', types: ['find_subnet','find_broadcast','usable_first','usable_last'] },
    counting:   { label: 'Host & Subnet Math',  icon: '\ud83e\uddee', color: '#f59e0b', types: ['host_count','hosts_needed_cidr','subnet_count','block_size_q'] },
    membership: { label: 'Subnet Membership',   icon: '\ud83d\udccd', color: '#0ea5e9', types: ['same_subnet','which_subnet','nth_subnet'] },
    design:     { label: 'Design & VLSM',       icon: '\ud83d\udcd0', color: '#ec4899', types: ['vlsm_pick','best_fit_mask'] },
    advanced:   { label: 'Advanced',            icon: '\ud83d\ude80', color: '#f97316', types: ['supernet_aggregate','classful_default','ipv6_prefix_count'] },
  };
  const ST_CAT_IDS = Object.keys(ST_CATEGORIES);
  
  // ── Mastery / Adaptive Engine ──
  function getSubnetMastery() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE.SUBNET_MASTERY) || 'null');
      if (raw && raw.categories) return raw;
    } catch {}
    const m = { categories: {}, types: {}, currentLevel: 'beginner', totalAnswered: 0, totalCorrect: 0 };
    ST_CAT_IDS.forEach(c => { m.categories[c] = { box: 1, seen: 0, correct: 0, lastSeen: null, streak: 0 }; });
    return m;
  }
  function saveSubnetMastery(m) { try { localStorage.setItem(STORAGE.SUBNET_MASTERY, JSON.stringify(m)); _cloudFlush(STORAGE.SUBNET_MASTERY); } catch {} }
  
  function updateSubnetMastery(category, type, wasCorrect) {
    const m = getSubnetMastery();
    m.totalAnswered++;
    if (wasCorrect) m.totalCorrect++;
    if (!m.categories[category]) m.categories[category] = { box: 1, seen: 0, correct: 0, lastSeen: null, streak: 0 };
    const cat = m.categories[category];
    cat.seen++;
    cat.lastSeen = new Date().toISOString();
    if (wasCorrect) { cat.correct++; cat.streak++; if (cat.box < 5) cat.box++; }
    else { cat.streak = 0; cat.box = 1; }
    if (!m.types[type]) m.types[type] = { seen: 0, correct: 0 };
    m.types[type].seen++;
    if (wasCorrect) m.types[type].correct++;
    // Level-up check
    m.currentLevel = stComputeLevel(m);
    saveSubnetMastery(m);
    return m;
  }
  
  function stComputeLevel(m) {
    if (m.totalAnswered < 15) return 'beginner';
    const acc = m.totalCorrect / m.totalAnswered;
    if (m.totalAnswered >= 60 && acc >= 0.80) return 'expert';
    if (m.totalAnswered >= 40 && acc >= 0.70) return 'advanced';
    if (m.totalAnswered >= 15 && acc >= 0.60) return 'intermediate';
    return 'beginner';
  }
  
  function stPickCategory(m) {
    if (stMode === 'focus' && stFocusCat) return stFocusCat;
    const weights = ST_CAT_IDS.map(c => {
      const cat = m.categories[c] || { box: 1, seen: 0, correct: 0 };
      if (cat.seen === 0) return 2.0;
      const acc = cat.correct / cat.seen;
      const boxW = 1 / cat.box;
      return (1 + (1 - acc) * 3) * boxW;
    });
    const total = weights.reduce((a,b) => a+b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return ST_CAT_IDS[i]; }
    return ST_CAT_IDS[0];
  }
  
  function stPickType(category, level) {
    const cat = ST_CATEGORIES[category];
    if (!cat) return 'cidr_to_mask';
    // Filter types by difficulty level.
    // v4.43.7: moved find_broadcast / usable_first / usable_last into easyTypes —
    // they were incorrectly classified as intermediate, which meant the Lesson 5
    // "Network & Broadcast" practice gate only ever served find_subnet questions
    // at beginner level. All four are equally easy once the block size method
    // clicks (broadcast = next block - 1, usable = network+1 to broadcast-1).
    const easyTypes = ['cidr_to_mask','mask_to_cidr','host_count','block_size_q','find_subnet','find_broadcast','usable_first','usable_last','binary_to_mask','classful_default'];
    const medTypes = ['mask_to_wildcard','wildcard_to_mask','hosts_needed_cidr','subnet_count','same_subnet','which_subnet','ipv6_prefix_count'];
    const hardTypes = ['nth_subnet','vlsm_pick','best_fit_mask','supernet_aggregate'];
    let pool = cat.types;
    if (level === 'beginner') pool = pool.filter(t => easyTypes.includes(t));
    else if (level === 'intermediate') pool = pool.filter(t => easyTypes.includes(t) || medTypes.includes(t));
    // if pool empty, fall back to all types in category
    if (pool.length === 0) pool = cat.types;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  
  // ── Question Generator (20+ types) ──
  function genSubnetQuestion(optCat, optLevel) {
    const m = getSubnetMastery();
    const level = optLevel || m.currentLevel;
    const category = optCat || stPickCategory(m);
    const type = stPickType(category, level);
    const cidr = randCidrForLevel(level);
    const ip = [randOctet(), randOctet(), randOctet(), randOctet()];
    if (cidr <= 16) { ip[2] = Math.floor(Math.random()*256); ip[3] = Math.floor(Math.random()*256); }
    const ipStr = arrToIp(ip);
    const mask = cidrToMask(cidr);
    const maskArr = cidrToMaskArr(cidr);
    const subnet = getSubnetAddr(ip, maskArr);
    const broadcast = getBroadcastAddr(ip, maskArr);
    const hosts = hostCount(cidr);
    const bs = blockSize(cidr);
  
    const base = { category, type, difficulty: level };
  
    switch (type) {
      case 'cidr_to_mask':
        return { ...base, q: `What is the subnet mask for /${cidr}?`, answer: mask, altAnswers: [],
          steps: [`CIDR /${cidr} means ${cidr} bits set to 1`, `Binary: ${'1'.repeat(cidr)}${'0'.repeat(32-cidr)}`, `Group into octets and convert to decimal`, `Result: ${mask}`] };
      case 'mask_to_cidr':
        return { ...base, q: `What is the CIDR notation for subnet mask ${mask}?`, answer: `/${cidr}`, altAnswers: [String(cidr)],
          steps: [`Convert each octet to binary`, `Binary: ${ipToBinaryStr(mask)}`, `Count the consecutive 1-bits`, `Total 1-bits: ${cidr} \u2192 /${cidr}`] };
      case 'mask_to_wildcard':
        return { ...base, q: `What is the wildcard mask for ${mask}?`, answer: maskToWildcard(mask), altAnswers: [],
          steps: [`Wildcard = 255.255.255.255 minus subnet mask`, `255 - ${maskArr[0]} = ${255-maskArr[0]}`, `255 - ${maskArr[1]} = ${255-maskArr[1]}`, `255 - ${maskArr[2]} = ${255-maskArr[2]}`, `255 - ${maskArr[3]} = ${255-maskArr[3]}`, `Result: ${maskToWildcard(mask)}`] };
      case 'wildcard_to_mask':
        { const wc = maskToWildcard(mask);
          return { ...base, q: `What subnet mask corresponds to wildcard mask ${wc}?`, answer: mask, altAnswers: [],
            steps: [`Subnet mask = 255.255.255.255 minus wildcard`, `Each octet: 255 - wildcard octet`, `Result: ${mask}`] }; }
      case 'binary_to_mask':
        { const binMask = ipToBinaryStr(mask);
          return { ...base, q: `Convert this binary mask to dotted decimal: ${binMask}`, answer: mask, altAnswers: [],
            steps: [`Split into 4 octets of 8 bits`, `Convert each group from binary to decimal`, `Result: ${mask}`] }; }
      case 'find_subnet':
        return { ...base, q: `What is the network address for ${ipStr}/${cidr}?`, answer: arrToIp(subnet), altAnswers: [],
          steps: [`IP: ${ipStr}`, `Mask: ${mask}`, `AND each octet: ${ip.map((o,i) => `${o} AND ${maskArr[i]} = ${o & maskArr[i]}`).join(', ')}`, `Network: ${arrToIp(subnet)}`] };
      case 'find_broadcast':
        return { ...base, q: `What is the broadcast address for ${ipStr}/${cidr}?`, answer: arrToIp(broadcast), altAnswers: [],
          steps: [`Network: ${arrToIp(subnet)}`, `Host bits: ${32-cidr}`, `Fill all host bits with 1`, `Broadcast: ${arrToIp(broadcast)}`] };
      case 'usable_first':
        { if (cidr >= 31) return genSubnetQuestion(category, level);
          const first = subnet.slice(); first[3]++;
          return { ...base, q: `What is the first usable host IP in ${arrToIp(subnet)}/${cidr}?`, answer: arrToIp(first), altAnswers: [],
            steps: [`Network address: ${arrToIp(subnet)}`, `First usable = network + 1`, `Result: ${arrToIp(first)}`] }; }
      case 'usable_last':
        { if (cidr >= 31) return genSubnetQuestion(category, level);
          const last = broadcast.slice(); last[3]--;
          return { ...base, q: `What is the last usable host IP in ${ipStr}/${cidr}?`, answer: arrToIp(last), altAnswers: [],
            steps: [`Broadcast: ${arrToIp(broadcast)}`, `Last usable = broadcast - 1`, `Result: ${arrToIp(last)}`] }; }
      case 'host_count':
        return { ...base, q: `How many usable host addresses in a /${cidr} network?`, answer: String(hosts), altAnswers: [],
          steps: [`Host bits: 32 - ${cidr} = ${32-cidr}`, `Total addresses: 2^${32-cidr} = ${bs}`, `Subtract network and broadcast: ${bs} - 2 = ${hosts}`] };
      case 'hosts_needed_cidr':
        { const need = [10,14,25,30,50,60,100,200,500][Math.floor(Math.random()*9)];
          const ans = cidrForHosts(need);
          return { ...base, q: `You need ${need} usable hosts. What is the smallest prefix length (CIDR)?`, answer: `/${ans}`, altAnswers: [String(ans)],
            steps: [`Need ${need} hosts`, `Formula: 2^n - 2 \u2265 ${need}`, `Solve: n = ${32-ans}, so 2^${32-ans} - 2 = ${hostCount(ans)} hosts`, `CIDR: /${ans}`] }; }
      case 'subnet_count':
        { const origCidr = cidr <= 24 ? cidr : 24;
          const newCidr = origCidr + [1,2,3,4][Math.floor(Math.random()*4)];
          if (newCidr > 30) return genSubnetQuestion(category, level);
          const count = Math.pow(2, newCidr - origCidr);
          return { ...base, q: `How many /${newCidr} subnets can you create from a /${origCidr} network?`, answer: String(count), altAnswers: [],
            steps: [`Borrowed bits: ${newCidr} - ${origCidr} = ${newCidr - origCidr}`, `Subnets: 2^${newCidr - origCidr} = ${count}`] }; }
      case 'block_size_q':
        return { ...base, q: `What is the block size (total addresses) for a /${cidr} network?`, answer: String(bs), altAnswers: [],
          steps: [`Host bits: 32 - ${cidr} = ${32-cidr}`, `Block size: 2^${32-cidr} = ${bs}`, `Or: 256 - ${maskArr[3]} = ${256-maskArr[3]} (for last octet)`] };
      case 'same_subnet':
        { const ip2 = ip.slice();
          const sameNet = Math.random() < 0.5;
          if (sameNet) {
            // Keep in same subnet: just change host bits
            const hostBits = 32 - cidr;
            if (hostBits <= 1) return genSubnetQuestion(category, level);
            ip2[3] = subnet[3] + 1 + Math.floor(Math.random() * Math.min(bs - 2, 253));
            if (ip2[3] > 254) ip2[3] = subnet[3] + 1;
          } else {
            // Different subnet: jump by block size
            ip2[3] = (subnet[3] + bs + Math.floor(Math.random()*50)) & 255;
            if (cidr <= 24) ip2[2] = (subnet[2] + 1 + Math.floor(Math.random()*5)) & 255;
          }
          const m2 = cidrToMaskArr(cidr);
          const s1 = arrToIp(getSubnetAddr(ip, m2));
          const s2 = arrToIp(getSubnetAddr(ip2, m2));
          const ans = s1 === s2 ? 'Yes' : 'No';
          return { ...base, q: `Are ${ipStr} and ${arrToIp(ip2)} in the same /${cidr} subnet?`, answer: ans, altAnswers: ans==='Yes'?['yes','YES']:['no','NO'], inputType: 'mcq', options: ['Yes','No'],
            steps: [`${ipStr} \u2192 network: ${s1}`, `${arrToIp(ip2)} \u2192 network: ${s2}`, `Same network? ${ans}`] }; }
      case 'which_subnet':
        return { ...base, q: `Which subnet does ${ipStr}/${cidr} belong to?`, answer: arrToIp(subnet), altAnswers: [],
          steps: [`Apply mask ${mask} to ${ipStr}`, `AND each octet`, `Result: ${arrToIp(subnet)}`] };
      case 'nth_subnet':
        { const origC = cidr <= 24 ? cidr : 24;
          const newC = origC + 2;
          if (newC > 30) return genSubnetQuestion(category, level);
          const maxN = Math.pow(2, newC - origC);
          const n = Math.floor(Math.random() * maxN);
          const baseNet = getSubnetAddr(ip, cidrToMaskArr(origC));
          const nthNet = nthSubnet(baseNet, origC, newC, n);
          const ordinal = n === 0 ? '1st' : n === 1 ? '2nd' : n === 2 ? '3rd' : (n+1)+'th';
          return { ...base, q: `What is the ${ordinal} subnet when ${arrToIp(baseNet)}/${origC} is divided into /${newC}s?`, answer: arrToIp(nthNet), altAnswers: [],
            steps: [`Block size of /${newC}: ${blockSize(newC)}`, `${ordinal} subnet starts at offset ${n} \u00d7 ${blockSize(newC)} = ${n * blockSize(newC)}`, `Network: ${arrToIp(nthNet)}`] }; }
      case 'vlsm_pick':
        { const needs = [100,50,25,10].sort((a,b) => b-a);
          const target = needs[Math.floor(Math.random()*needs.length)];
          const ans = cidrForHosts(target);
          return { ...base, q: `In a VLSM design, what prefix length should you assign to a department needing ${target} hosts?`, answer: `/${ans}`, altAnswers: [String(ans)],
            steps: [`Need ${target} hosts`, `Smallest CIDR: find n where 2^n - 2 \u2265 ${target}`, `n = ${32-ans}, CIDR = /${ans}, giving ${hostCount(ans)} usable hosts`] }; }
      case 'best_fit_mask':
        { const need = [5,12,20,50,100][Math.floor(Math.random()*5)];
          const ans = cidrForHosts(need);
          return { ...base, q: `A company needs ${need} hosts per subnet. What mask wastes the fewest addresses?`, answer: cidrToMask(ans), altAnswers: [`/${ans}`,String(ans)],
            steps: [`Need ${need} hosts`, `Smallest CIDR: /${ans}`, `Gives ${hostCount(ans)} usable hosts (wastes ${hostCount(ans)-need})`, `Mask: ${cidrToMask(ans)}`] }; }
      case 'supernet_aggregate':
        { const base24 = Math.floor(Math.random()*4)*4;
          const nets = [0,1,2,3].map(i => `192.168.${base24+i}.0/24`);
          return { ...base, q: `Summarize these routes into one: ${nets.join(', ')}`, answer: `192.168.${base24}.0/22`, altAnswers: [],
            steps: [`4 contiguous /24 networks`, `4 = 2^2, so borrow 2 bits from /24`, `Supernet: /24 - 2 = /22`, `Result: 192.168.${base24}.0/22`] }; }
      case 'classful_default':
        { const cls = ['A','B','C'][Math.floor(Math.random()*3)];
          const defMask = cls==='A'?'255.0.0.0':cls==='B'?'255.255.0.0':'255.255.255.0';
          const sampleIp = cls==='A'?`${10+Math.floor(Math.random()*117)}.0.0.0`:cls==='B'?`${128+Math.floor(Math.random()*63)}.${Math.floor(Math.random()*256)}.0.0`:`${192+Math.floor(Math.random()*31)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.0`;
          return { ...base, q: `What is the default subnet mask for the Class ${cls} address ${sampleIp}?`, answer: defMask, altAnswers: [defaultMaskForClass(cls)],
            steps: [`Class ${cls}: first octet range ${cls==='A'?'1-126':cls==='B'?'128-191':'192-223'}`, `Default mask: ${defMask}`] }; }
      case 'ipv6_prefix_count':
        { const from = 48, to = 64;
          const count = Math.pow(2, to - from);
          return { ...base, q: `How many /64 subnets fit inside a /48 IPv6 prefix?`, answer: String(count), altAnswers: ['65536'],
            steps: [`Difference: 64 - 48 = 16 bits`, `Subnets: 2^16 = ${count}`] }; }
      default:
        return genSubnetQuestion('masks', level);
    }
  }
  
  // ── Legacy compat wrappers (called by evaluateMilestones, analytics) ──
  function getSubnetStats() {
    try { return JSON.parse(localStorage.getItem(STORAGE.SUBNET_STATS) || '{"seen":0,"correct":0}'); } catch { return { seen: 0, correct: 0 }; }
  }
  function updateSubnetStat(wasCorrect) {
    try { const s = getSubnetStats(); s.seen++; if (wasCorrect) s.correct++; localStorage.setItem(STORAGE.SUBNET_STATS, JSON.stringify(s)); } catch {}
  }
  
  // ── Lessons System ──
  const SUBNET_LESSONS = [
    { id: 'binary', title: 'Binary & Powers of 2', icon: '\ud83d\udcbb', desc: 'The foundation: converting between binary and decimal.', prereq: null,
      theory: [
        'Every IP address is a 32-bit binary number displayed as 4 decimal octets.',
        'Each octet is 8 bits. The bit positions from left to right have values: <strong>128, 64, 32, 16, 8, 4, 2, 1</strong>.',
        'Example: the binary <code>11000000</code> = 128 + 64 = <strong>192</strong>.',
        'Memorize the powers of 2: 2\u00b9=2, 2\u00b2=4, 2\u00b3=8, 2\u2074=16, 2\u2075=32, 2\u2076=64, 2\u2077=128, 2\u2078=256.',
      ],
      practice: 'binary' },
    { id: 'ip_anatomy', title: 'IP Address Structure', icon: '\ud83c\udf10', desc: 'Octets, dotted decimal, network vs host bits.', prereq: 'binary',
      theory: [
        'An IPv4 address is 32 bits split into 4 octets: <code>192.168.1.100</code>.',
        'The address has two parts: <strong>network portion</strong> (identifies the network) and <strong>host portion</strong> (identifies the device).',
        'The subnet mask determines where the split happens. A /24 means the first 24 bits are network, the last 8 are host.',
        'Class A (/8): 1-126.x.x.x \u2014 Class B (/16): 128-191.x.x.x \u2014 Class C (/24): 192-223.x.x.x',
      ],
      practice: 'masks' },
    { id: 'masks_cidr', title: 'Subnet Masks & CIDR', icon: '\ud83c\udfad', desc: 'Converting between CIDR, dotted-decimal masks, and binary.', prereq: 'ip_anatomy',
      theory: [
        'A subnet mask is a 32-bit number with all 1s on the left (network) and all 0s on the right (host).',
        'CIDR notation /<em>n</em> tells you how many 1-bits are in the mask. /24 = 24 ones followed by 8 zeros.',
        '/24 = <code>11111111.11111111.11111111.00000000</code> = <strong>255.255.255.0</strong>',
        '/27 = <code>11111111.11111111.11111111.11100000</code> = <strong>255.255.255.224</strong>',
        '<strong>Trick:</strong> The "interesting octet" is the one that isn\'t 255 or 0. For /27, it\'s the 4th octet: 256 - 32 = 224.',
      ],
      practice: 'masks' },
    { id: 'block_size', title: 'The Block Size Method', icon: '\ud83e\uddf1', desc: 'Fast mental-math shortcut for network, broadcast, and usable range \u2014 no binary needed.', prereq: 'masks_cidr',
      theory: [
        'The <strong>block size method</strong> is the fastest way to find a subnet\u2019s network address, broadcast, and usable range. 5 quick steps, no binary, no scratch paper. Once this clicks, most /anything questions become 10-second mental math.',
        '<strong>Let\u2019s walk through an example:</strong><br><br><strong>IP: 192.168.1.100 /26</strong><br>Goal: find the network address.',
        '<strong>Step 1 \u2014 Find the mask</strong><br><br>/26 \u2192 <code>255.255.255.192</code><br><br>The <em>interesting octet</em> is the one that isn\u2019t 255 or 0. Here it\u2019s the <strong>4th octet (192)</strong>.',
        '<strong>Step 2 \u2014 Find the block size</strong><br><br><code>256 \u2212 192 = <strong>64</strong></code><br><br>This is the distance between successive networks in the interesting octet.',
        '<strong>Step 3 \u2014 Count the subnet starts</strong><br><br>Start at 0, keep adding 64:<br><br><code>0<br>64<br>128<br>192</code><br><br>These are the possible network starting points.',
        '<strong>Step 4 \u2014 Find where 100 belongs</strong><br><br><code>0\u201363<br>64\u2013127 <span class="st-block-match">\u2705</span><br>128\u2013191<br>192\u2013255</code><br><br>100 falls in the <strong>64\u2013127</strong> block.',
        '<strong>Step 5 \u2014 Take the starting number</strong><br><br>The network is the <em>start</em> of that block \u2014 <strong>64</strong>.<br><br>Octets before the interesting one copy from the IP (192.168.1); octets after (if any) become 0.<br><br><strong>Network address = 192.168.1.64</strong>',
        '<strong>\u2728 Bonus: broadcast and usable range come free</strong><br><br>\u2022 <strong>Broadcast</strong> = next network start \u2212 1 = 128 \u2212 1 = <strong>192.168.1.127</strong><br>\u2022 <strong>Usable range</strong> = network+1 \u2192 broadcast\u22121 = <strong>192.168.1.65 \u2013 192.168.1.126</strong>',
        '<strong>\u2728 Bigger example: 10.50.173.45 /20</strong> (interesting octet is the <strong>3rd</strong>)<br><br><strong>Step 1:</strong> /20 = 255.255.<strong>240</strong>.0<br><strong>Step 2:</strong> Block size = 256 \u2212 240 = <strong>16</strong><br><strong>Step 3:</strong> Starts in 3rd octet: 0, 16, 32, \u2026, 144, 160, 176, 192\u2026<br><strong>Step 4:</strong> 173 falls in <code>160\u2013175 <span class="st-block-match">\u2705</span></code><br><strong>Step 5:</strong> <strong>Network = 10.50.160.0</strong> (4th octet becomes 0 because it\u2019s <em>after</em> the interesting octet)<br><br>\u2022 Broadcast = 10.50.175.255<br>\u2022 Usable = 10.50.160.1 \u2013 10.50.175.254',
        '<strong>\ud83d\udcd0 Cheat sheet to memorize</strong><table class="subnet-table" style="margin-top:8px"><tr><th>CIDR</th><th>Mask last octet</th><th>Block size</th><th>Usable hosts</th></tr><tr><td>/24</td><td>0</td><td>256</td><td>254</td></tr><tr><td>/25</td><td>128</td><td>128</td><td>126</td></tr><tr><td>/26</td><td>192</td><td>64</td><td>62</td></tr><tr><td>/27</td><td>224</td><td>32</td><td>30</td></tr><tr><td>/28</td><td>240</td><td>16</td><td>14</td></tr><tr><td>/29</td><td>248</td><td>8</td><td>6</td></tr><tr><td>/30</td><td>252</td><td>4</td><td>2</td></tr></table>',
        '<strong>\ud83c\udfaf Pro tip:</strong> For any /25\u2013/30 question: figure the interesting octet, subtract from 256 for block size, list the multiples, find where your IP lands. Under 10 seconds, every time. Binary ANDing is the underlying operation, but you won\u2019t need it once this clicks.',
      ],
      practice: 'addressing' },
    { id: 'net_broadcast', title: 'Network & Broadcast', icon: '\ud83d\udce1', desc: 'Derive broadcast address and usable range from the block size in 3 quick steps.', prereq: 'block_size',
      theory: [
        'Lesson 4 showed you how to find the <strong>network address</strong>. Every subnet actually has <strong>3 key addresses</strong> you need to know. Once you\u2019ve found the network, the other two come out of the block size for free \u2014 no extra math.',
        '<strong>The 3 key addresses of any subnet:</strong><br><br>1. <strong>Network address</strong> \u2014 identifies the subnet (can\u2019t assign to a device)<br>2. <strong>Broadcast address</strong> \u2014 reaches every host in the subnet at once (can\u2019t assign to a device)<br>3. <strong>Usable range</strong> \u2014 everything between them. These are the IPs you give to real devices.',
        '<strong>Let\u2019s continue the Lesson 4 example:</strong><br><br><strong>IP: 192.168.1.100 /26</strong><br>From Lesson 4 we already know:<br>\u2022 Block size = <strong>64</strong><br>\u2022 Network address = <strong>192.168.1.64</strong><br><br>Now we\u2019ll derive the broadcast and usable range.',
        '<strong>Step 1 \u2014 Broadcast = next network start \u2212 1</strong><br><br>Our subnet starts at 64. The <em>next</em> network starts at 64 + block size = 64 + 64 = <strong>128</strong>.<br><br>So:<br><code>Broadcast = 128 \u2212 1 = 127</code><br><br><strong>Broadcast = 192.168.1.127</strong>',
        '<strong>Step 2 \u2014 First usable host = Network + 1</strong><br><br><code>192.168.1.64 + 1 = 192.168.1.65</code><br><br><strong>First usable = 192.168.1.65</strong>',
        '<strong>Step 3 \u2014 Last usable host = Broadcast \u2212 1</strong><br><br><code>192.168.1.127 \u2212 1 = 192.168.1.126</code><br><br><strong>Last usable = 192.168.1.126</strong>',
        '<strong>\u2728 Put it all together for 192.168.1.100 /26:</strong><br><br><code>.64  \u2190 Network (reserved)<br>.65  \u2190 First usable <span class="st-block-match">\u2705</span><br>.66<br>.67<br>...<br>.125<br>.126 \u2190 Last usable <span class="st-block-match">\u2705</span><br>.127 \u2190 Broadcast (reserved)</code><br><br>\u2022 <strong>Network:</strong> 192.168.1.64<br>\u2022 <strong>Broadcast:</strong> 192.168.1.127<br>\u2022 <strong>Usable range:</strong> 192.168.1.65 \u2013 192.168.1.126',
        '<strong>\ud83d\udca1 Why subtract 2 from host count?</strong><br><br>A /26 has 2<sup>6</sup> = 64 total addresses, but only <strong>62 are usable</strong>. Why?<br>\u2022 The <strong>network address</strong> (.64) identifies the subnet itself<br>\u2022 The <strong>broadcast address</strong> (.127) is reserved for "talk to every host"<br><br>Neither can be assigned to a device, so <strong>usable hosts = block size \u2212 2</strong>.<br><br>Check: 126 \u2212 65 + 1 = <strong>62 usable</strong>. \u2705',
        '<strong>\u2728 Bigger example: 10.50.173.45 /20</strong><br><br>From Lesson 4:<br>\u2022 Block size = 16<br>\u2022 Network = <strong>10.50.160.0</strong> (interesting octet was the 3rd)<br><br><strong>Step 1 \u2014 Broadcast:</strong><br>Next network = 160 + 16 = 176 \u2192 10.50.176.0<br>Broadcast = 10.50.176.0 \u2212 1 = <strong>10.50.175.255</strong><br><br><strong>Step 2 \u2014 First usable:</strong> 10.50.160.0 + 1 = <strong>10.50.160.1</strong><br><br><strong>Step 3 \u2014 Last usable:</strong> 10.50.175.255 \u2212 1 = <strong>10.50.175.254</strong><br><br><strong>Usable range: 10.50.160.1 \u2013 10.50.175.254</strong><br>Host count: 2<sup>12</sup> \u2212 2 = <strong>4094 usable</strong>.',
        '<strong>\ud83d\udcd0 Full cheat sheet (extends Lesson 4):</strong><table class="subnet-table" style="margin-top:8px"><tr><th>CIDR</th><th>Block size</th><th>Total IPs</th><th>Usable hosts</th><th>Reserved</th></tr><tr><td>/24</td><td>256</td><td>256</td><td>254</td><td>2</td></tr><tr><td>/25</td><td>128</td><td>128</td><td>126</td><td>2</td></tr><tr><td>/26</td><td>64</td><td>64</td><td>62</td><td>2</td></tr><tr><td>/27</td><td>32</td><td>32</td><td>30</td><td>2</td></tr><tr><td>/28</td><td>16</td><td>16</td><td>14</td><td>2</td></tr><tr><td>/29</td><td>8</td><td>8</td><td>6</td><td>2</td></tr><tr><td>/30</td><td>4</td><td>4</td><td>2</td><td>2</td></tr></table>',
        '<strong>\ud83c\udfaf Exam-pressure recipe:</strong> given any IP + CIDR, say out loud:<br>1. <em>Block size</em> = 256 \u2212 mask octet<br>2. <em>Network</em> = highest multiple of block size \u2264 IP\u2019s interesting octet<br>3. <em>Broadcast</em> = next block start \u2212 1<br>4. <em>First usable</em> = network + 1<br>5. <em>Last usable</em> = broadcast \u2212 1<br>6. <em>Hosts</em> = block size \u2212 2<br><br>If you can rattle those 6 off in under 20 seconds for any /26\u2013/30, you\u2019re exam-ready for this topic.',
        '<strong>Edge cases for the exam:</strong><br>\u2022 <strong>/31</strong> \u2192 block size 2, only 2 total IPs. Special <em>point-to-point link</em> rule (RFC 3021): both IPs are usable, no reserved network/broadcast. Host count = 2.<br>\u2022 <strong>/32</strong> \u2192 block size 1, single host \u2014 used for loopbacks and host routes.<br><br>The 2<sup>n</sup> \u2212 2 formula applies from /24 down to /30; /31 and /32 are the edge cases that break it.',
      ],
      practice: 'addressing' },
    { id: 'host_math', title: 'Counting Hosts & Blocks', icon: '\ud83e\uddee', desc: 'The 2^n - 2 formula, block sizes, and choosing the right mask.', prereq: 'net_broadcast',
      theory: [
        '<strong>Usable hosts</strong> = 2<sup>host bits</sup> - 2 (subtract network and broadcast addresses)',
        '/24 = 2\u2078 - 2 = 254 hosts \u2022 /25 = 2\u2077 - 2 = 126 \u2022 /26 = 2\u2076 - 2 = 62 \u2022 /27 = 2\u2075 - 2 = 30 \u2022 /28 = 2\u2074 - 2 = 14 \u2022 /29 = 2\u00b3 - 2 = 6 \u2022 /30 = 2\u00b2 - 2 = 2',
        '<strong>Block size</strong> = 2<sup>host bits</sup> (total addresses including network + broadcast)',
        'To find the right mask for N hosts: find the smallest power of 2 that is \u2265 N + 2, then CIDR = 32 - that power.',
        'Example: need 50 hosts \u2192 50+2=52 \u2192 next power of 2 is 64 = 2\u2076 \u2192 CIDR = 32-6 = /26',
      ],
      practice: 'counting' },
    { id: 'subnetting', title: 'Subnetting a Network', icon: '\u2702\ufe0f', desc: 'Dividing a network into smaller subnets by borrowing bits.', prereq: 'host_math',
      theory: [
        'Subnetting = borrowing host bits to create more networks (at the cost of fewer hosts per network).',
        'Example: split 192.168.1.0/24 into 4 subnets:',
        'Borrow 2 bits: 2\u00b2 = 4 subnets. New CIDR: /24 + 2 = /26. Block size: 64.',
        'Subnet 1: 192.168.1.0/26 (hosts .1\u2013.62)',
        'Subnet 2: 192.168.1.64/26 (hosts .65\u2013.126)',
        'Subnet 3: 192.168.1.128/26 (hosts .129\u2013.190)',
        'Subnet 4: 192.168.1.192/26 (hosts .193\u2013.254)',
        '<strong>Formula:</strong> # subnets = 2<sup>borrowed bits</sup>. # hosts/subnet = 2<sup>remaining host bits</sup> - 2.',
      ],
      practice: 'membership' },
    { id: 'vlsm', title: 'VLSM', icon: '\ud83d\udcd0', desc: 'Variable Length Subnet Masking \u2014 different-sized subnets from one block.', prereq: 'subnetting',
      theory: [
        'Real networks have departments of different sizes. VLSM lets you allocate different-sized subnets from one address block.',
        '<strong>Rule:</strong> Always allocate the largest subnet first, then work down.',
        'Example: from 10.0.0.0/24, allocate for 100 hosts, 50 hosts, 25 hosts, and 10 hosts:',
        '1. 100 hosts \u2192 /25 (126 usable) \u2192 10.0.0.0/25',
        '2. 50 hosts \u2192 /26 (62 usable) \u2192 10.0.0.128/26',
        '3. 25 hosts \u2192 /27 (30 usable) \u2192 10.0.0.192/27',
        '4. 10 hosts \u2192 /28 (14 usable) \u2192 10.0.0.224/28',
        'Each subnet starts right after the previous one ends.',
      ],
      practice: 'design' },
    { id: 'supernetting', title: 'Supernetting & Aggregation', icon: '\ud83d\udce6', desc: 'Combining contiguous networks into a summary route.', prereq: 'vlsm',
      theory: [
        'Supernetting (route summarization) is the reverse of subnetting \u2014 combining multiple small networks into one larger route.',
        'Example: 192.168.0.0/24, 192.168.1.0/24, 192.168.2.0/24, 192.168.3.0/24',
        'These 4 contiguous /24s share the first 22 bits \u2192 summary route: <strong>192.168.0.0/22</strong>',
        '<strong>Rule:</strong> You can only aggregate networks that are contiguous AND whose count is a power of 2.',
        '2 networks = move CIDR left by 1, 4 = left by 2, 8 = left by 3, etc.',
      ],
      practice: 'advanced' },
    { id: 'ipv6_basics', title: 'IPv6 Subnetting Basics', icon: '\ud83d\ude80', desc: 'IPv6 prefixes, /48 to /64 allocation.', prereq: 'supernetting',
      theory: [
        'IPv6 addresses are 128 bits in hexadecimal, split by colons: <code>2001:0db8:85a3::8a2e:0370:7334</code>.',
        'Common allocations: ISP gets /32, organization gets <strong>/48</strong>, each LAN gets <strong>/64</strong>.',
        'Subnetting from /48 to /64: 64 - 48 = 16 bits for subnets = 2\u00b9\u2076 = <strong>65,536 subnets</strong>.',
        'Hosts per /64: 2\u2076\u2074 \u2248 18 quintillion (host counting is irrelevant in IPv6 \u2014 always use /64 for LANs).',
        'For the exam: know the /48 \u2192 /64 math and that /128 = single host.',
      ],
      practice: 'advanced' },
  ];
  
  function getLessonProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE.SUBNET_LESSONS) || '{}'); } catch { return {}; }
  }
  function saveLessonProgress(p) { try { localStorage.setItem(STORAGE.SUBNET_LESSONS, JSON.stringify(p)); _cloudFlush(STORAGE.SUBNET_LESSONS); } catch {} }
  function isLessonComplete(id) { const p = getLessonProgress(); return p[id] && p[id].passed; }
  function isLessonUnlocked(lesson) {
    if (!lesson.prereq) return true;
    return isLessonComplete(lesson.prereq);
  }
  
  // ── Tab / Mode switching ──
  // Original startSubnetTrainer body inlined into enter() at module bottom.
  function setSubnetTab(tabId) {
    ['learn','practice','dashboard'].forEach(t => {
      document.getElementById('st-tab-' + t)?.classList.toggle('is-hidden', t !== tabId);
      document.getElementById('st-tab-btn-' + t)?.classList.toggle('st-tab-active', t === tabId);
    });
    if (tabId === 'learn') stRenderLessonSidebar();
    if (tabId === 'practice') { stIdx = 0; stCorrect = 0; stTotal = 0; stStreak = 0; stNextQuestion(); stRenderHeatmap(); }
    if (tabId === 'dashboard') stRenderDashboard();
  }
  
  function setSubnetMode(mode) {
    stMode = mode;
    ['drill','timed','focus'].forEach(m => {
      document.getElementById('st-mode-' + m)?.classList.toggle('st-mode-active', m === mode);
    });
    document.getElementById('st-focus-picker')?.classList.toggle('is-hidden', mode !== 'focus');
    document.getElementById('st-timer-wrap')?.classList.toggle('is-hidden', mode !== 'timed');
    if (mode === 'focus') stRenderFocusPicker();
    if (mode === 'timed') stStartTimer();
    else stStopTimer();
    stIdx = 0; stCorrect = 0; stTotal = 0; stStreak = 0;
    stNextQuestion();
  }
  
  function stSetFocusCat(catId) {
    stFocusCat = catId;
    document.querySelectorAll('.st-focus-chip').forEach(c => c.classList.toggle('st-focus-chip-active', c.dataset.cat === catId));
    stIdx = 0; stCorrect = 0; stTotal = 0; stStreak = 0;
    stNextQuestion();
  }
  
  function stRenderFocusPicker() {
    const el = document.getElementById('st-focus-picker');
    if (!el) return;
    el.innerHTML = ST_CAT_IDS.map(c => {
      const cat = ST_CATEGORIES[c];
      const active = stFocusCat === c ? ' st-focus-chip-active' : '';
      return `<button class="st-focus-chip${active}" data-cat="${c}" onclick="stSetFocusCat('${c}')" style="--st-cat-color:${cat.color}">${cat.icon} ${escHtml(cat.label)}</button>`;
    }).join('');
  }
  
  // ── Timed mode ──
  function stStartTimer() {
    stStopTimer();
    stTimerValue = 60;
    const el = document.getElementById('st-timer');
    if (el) el.textContent = '60';
    stTimerInterval = setInterval(() => {
      stTimerValue--;
      const el = document.getElementById('st-timer');
      if (el) { el.textContent = stTimerValue; el.classList.toggle('st-timer-warn', stTimerValue <= 10); }
      if (stTimerValue <= 0) { stStopTimer(); stEndTimedChallenge(); }
    }, 1000);
  }
  function stStopTimer() { if (stTimerInterval) { clearInterval(stTimerInterval); stTimerInterval = null; } }
  function stEndTimedChallenge() {
    const card = document.getElementById('st-q-card');
    if (card) card.innerHTML = `<div style="text-align:center;padding:30px"><div style="font-size:48px;margin-bottom:12px">\u23f0</div><div style="font-size:22px;font-weight:800;margin-bottom:8px">Time\u2019s Up!</div><div style="font-size:16px;color:var(--text-mid);margin-bottom:16px">You scored <strong>${stCorrect}</strong> out of <strong>${stTotal}</strong></div><button class="btn btn-primary" onclick="setSubnetMode('timed')">Try Again</button></div>`;
  }
  
  // ── Question Flow ──
  function stNextQuestion() {
    stIdx++;
    const m = getSubnetMastery();
    stQ = genSubnetQuestion(stMode === 'focus' ? stFocusCat : null, m.currentLevel);
    stQuestionStartTime = Date.now();
  
    const qNum = document.getElementById('st-q-num');
    const qText = document.getElementById('st-question');
    const ansArea = document.getElementById('st-answer-area');
    const fb = document.getElementById('st-feedback');
    const nextBtn = document.getElementById('st-next-btn');
    if (qNum) qNum.textContent = 'Q' + stIdx;
    if (qText) qText.textContent = stQ.q;
    if (fb) { fb.innerHTML = ''; fb.className = 'st-feedback'; }
    if (nextBtn) nextBtn.classList.add('is-hidden');
  
    // Render answer area based on type
    if (ansArea) {
      if (stQ.inputType === 'mcq' && stQ.options) {
        ansArea.innerHTML = `<div class="st-mcq-grid">${stQ.options.map(o => `<button class="st-mcq-btn" onclick="stPickMcq(this,'${escHtml(o)}')">${escHtml(o)}</button>`).join('')}</div>`;
      } else {
        ansArea.innerHTML = `<div class="subnet-input-row"><input type="text" id="st-answer-input" class="subnet-input" placeholder="Type your answer\u2026" autocomplete="off" inputmode="decimal" aria-label="Answer" /><button class="btn btn-primary" onclick="stCheckAnswer()" id="st-submit-btn">Check</button></div>`;
        const inp = document.getElementById('st-answer-input');
        if (inp) { inp.disabled = false; inp.focus(); }
      }
    }
  
    // Update stats strip
    document.getElementById('st-score').textContent = stCorrect + ' / ' + stTotal;
    document.getElementById('st-streak').textContent = '\ud83d\udd25 ' + stStreak;
    const catBadge = document.getElementById('st-cat-badge');
    if (catBadge && stQ.category) { const c = ST_CATEGORIES[stQ.category]; catBadge.textContent = c ? c.icon + ' ' + c.label : ''; catBadge.style.color = c ? c.color : ''; }
    const diffBadge = document.getElementById('st-diff-badge');
    if (diffBadge) diffBadge.textContent = stQ.difficulty ? stQ.difficulty.charAt(0).toUpperCase() + stQ.difficulty.slice(1) : '';
    stRenderLevelBadge();
  }
  
  function stPickMcq(btn, answer) {
    document.querySelectorAll('.st-mcq-btn').forEach(b => { b.disabled = true; });
    stProcessAnswer(answer);
  }
  
  function stCheckAnswer() {
    const inp = document.getElementById('st-answer-input');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) return;
    inp.disabled = true;
    document.getElementById('st-submit-btn')?.classList.add('is-hidden');
    stProcessAnswer(val);
  }
  
  function stProcessAnswer(userAnswer) {
    if (!stQ) return;
    stTotal++;
    const elapsed = ((Date.now() - stQuestionStartTime) / 1000).toFixed(1);
    const isCorrect = userAnswer === stQ.answer || (stQ.altAnswers && stQ.altAnswers.includes(userAnswer));
    updateSubnetStat(isCorrect);
    const m = updateSubnetMastery(stQ.category, stQ.type, isCorrect);
  
    if (isCorrect) { stCorrect++; stStreak++; }
    else { stStreak = 0; }
  
    document.getElementById('st-score').textContent = stCorrect + ' / ' + stTotal;
    document.getElementById('st-streak').textContent = '\ud83d\udd25 ' + stStreak;
    document.getElementById('st-next-btn')?.classList.remove('is-hidden');
  
    // Render feedback
    stRenderFeedback(stQ, userAnswer, isCorrect, elapsed);
    stRenderHeatmap();
    stRenderLevelBadge();
  
    // Auto-advance in timed mode
    if (stMode === 'timed' && isCorrect) { setTimeout(() => { if (stTimerValue > 0) stNextQuestion(); }, 800); }
  }
  
  function stRenderFeedback(q, userAnswer, isCorrect, elapsed) {
    const fb = document.getElementById('st-feedback');
    if (!fb) return;
    let html = '';
    if (isCorrect) {
      html = `<div class="st-fb-correct"><strong>\u2705 Correct!</strong> <span class="st-fb-answer">${escHtml(q.answer)}</span><span class="st-fb-time">${elapsed}s</span></div>`;
      if (stStreak >= 5) html += '<div class="st-fb-streak">\ud83d\udd25 ' + stStreak + ' streak!</div>';
    } else {
      html = `<div class="st-fb-wrong"><strong>\u274c Incorrect.</strong> Your answer: <code>${escHtml(userAnswer)}</code></div>`;
      html += `<div class="st-fb-correct-answer">Correct answer: <strong>${escHtml(q.answer)}</strong></div>`;
      // Step-by-step walkthrough
      if (q.steps && q.steps.length) {
        html += '<div class="st-steps"><div class="st-steps-title">Step-by-step solution:</div>';
        q.steps.forEach((s, i) => { html += `<div class="st-step" style="animation-delay:${i*150}ms"><span class="st-step-num">${i+1}</span> <span class="st-step-text">${s}</span></div>`; });
        html += '</div>';
      }
      // Binary breakdown for addressing/masks questions
      if (['find_subnet','find_broadcast','usable_first','usable_last','cidr_to_mask','mask_to_cidr','and_operation'].includes(q.type)) {
        html += '<details class="st-binary-details"><summary>Show binary breakdown</summary>';
        html += stRenderBinaryBreakdown(q);
        html += '</details>';
      }
      // AI Coach button
      html += `<button class="btn btn-ghost st-coach-btn" onclick="stAskCoach()">&#129302; Ask Coach to explain</button>`;
      html += '<div id="st-coach-panel" class="st-coach-panel"></div>';
    }
    fb.innerHTML = html;
    fb.className = 'st-feedback st-feedback-visible';
  }
  
  function stRenderBinaryBreakdown(q) {
    // Extract IP and CIDR from question text
    const ipMatch = q.q.match(/(\d+\.\d+\.\d+\.\d+)/);
    const cidrMatch = q.q.match(/\/(\d+)/);
    if (!ipMatch || !cidrMatch) return '';
    const ipStr = ipMatch[1];
    const cidr = parseInt(cidrMatch[1]);
    const ipBin = ipStr.split('.').map(o => parseInt(o).toString(2).padStart(8,'0')).join('');
    const maskBin = '1'.repeat(cidr) + '0'.repeat(32-cidr);
    const andBin = ipBin.split('').map((b,i) => (b === '1' && maskBin[i] === '1') ? '1' : '0').join('');
    const formatBin = b => b.match(/.{8}/g).join('.');
    return `<div class="st-binary-grid">
      <div class="st-bin-row"><span class="st-bin-label">IP</span><code class="st-bin-val">${formatBin(ipBin)}</code><span class="st-bin-dec">${ipStr}</span></div>
      <div class="st-bin-row"><span class="st-bin-label">Mask</span><code class="st-bin-val">${formatBin(maskBin)}</code><span class="st-bin-dec">${cidrToMask(cidr)}</span></div>
      <div class="st-bin-row st-bin-result"><span class="st-bin-label">AND</span><code class="st-bin-val">${formatBin(andBin)}</code><span class="st-bin-dec">${andBin.match(/.{8}/g).map(b=>parseInt(b,2)).join('.')}</span></div>
      <div class="st-bin-boundary" style="left:calc(${cidr/32*100}%)"><span class="st-bin-boundary-label">\u2190 /${cidr}</span></div>
    </div>`;
  }
  
  // ── AI Coach ──
  async function stAskCoach() {
    const panel = document.getElementById('st-coach-panel');
    if (!panel || !stQ) return;
    const key = localStorage.getItem(STORAGE.KEY);
    if (!key) { panel.innerHTML = '<div class="st-coach-msg">Set your API key in Settings to use the AI Coach.</div>'; return; }
    panel.innerHTML = '<div class="st-coach-loading">\u23f3 Coach is thinking\u2026</div>';
    try {
      const userAns = document.getElementById('st-answer-input')?.value || '';
      // v4.38.5 — inject the deterministic binary breakdown (IP / Mask / AND)
      // for the current question so Sonnet has concrete facts to anchor on
      // and can't hallucinate an incorrect calculation.
      const ipMatch = stQ.q.match(/(\d+\.\d+\.\d+\.\d+)/);
      const cidrMatch = stQ.q.match(/\/(\d+)/);
      let gtBlock = '';
      if (ipMatch && cidrMatch) {
        const ipStr = ipMatch[1];
        const cidr = parseInt(cidrMatch[1]);
        const ipBin = ipStr.split('.').map(o => parseInt(o).toString(2).padStart(8,'0')).join('');
        const maskBin = '1'.repeat(cidr) + '0'.repeat(32 - cidr);
        const andBin = ipBin.split('').map((b, i) => (b === '1' && maskBin[i] === '1') ? '1' : '0').join('');
        const netDotted = andBin.match(/.{8}/g).map(b => parseInt(b, 2)).join('.');
        gtBlock = `\nAUTHORITATIVE FACTS (do not contradict):\n- IP ${ipStr} in binary: ${ipBin.match(/.{8}/g).join('.')}\n- /${cidr} mask in binary: ${maskBin.match(/.{8}/g).join('.')}\n- Network address (IP AND mask): ${netDotted}\n`;
      }
      const prompt = `You are a subnetting tutor helping a Network+ student. They were asked: "${stQ.q}"\nThey answered: "${userAns}" but the correct answer is: "${stQ.answer}".${gtBlock}\nIn 3-4 sentences, explain where they likely made their mistake using the binary/calculation approach. Be encouraging but precise. End with a one-sentence tip to avoid this mistake next time.`;
      const res = await _claudeFetch( {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'content-type': 'application/json' },
        body: JSON.stringify({ model: CLAUDE_TEACHER_MODEL, max_tokens: MAX_TOKENS_TEACHER_BRIEF, messages: [{ role: 'user', content: prompt }] })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || 'Coach could not generate a response.';
      panel.innerHTML = '<div class="st-coach-msg">' + text.split('\n').map(p => '<p>' + escHtml(p) + '</p>').join('') + '</div>';
    } catch (e) {
      panel.innerHTML = '<div class="st-coach-msg st-coach-error">Could not reach the AI Coach. Check your connection and API key.</div>';
    }
  }
  
  // ── Lesson Rendering ──
  function stRenderLessonSidebar() {
    const el = document.getElementById('st-lesson-sidebar');
    if (!el) return;
    const progress = getLessonProgress();
    el.innerHTML = SUBNET_LESSONS.map((l, i) => {
      const unlocked = isLessonUnlocked(l);
      const done = progress[l.id] && progress[l.id].passed;
      const active = stActiveLesson === l.id;
      const icon = done ? '\u2705' : unlocked ? l.icon : '\ud83d\udd12';
      const cls = `st-lesson-item${active ? ' st-lesson-active' : ''}${!unlocked ? ' st-lesson-locked' : ''}`;
      return `<button class="${cls}" onclick="${unlocked ? `stOpenLesson('${l.id}')` : ''}" ${!unlocked ? 'disabled' : ''}>
        <span class="st-lesson-icon">${icon}</span>
        <span class="st-lesson-info"><span class="st-lesson-num">Lesson ${i+1}</span><span class="st-lesson-title">${escHtml(l.title)}</span></span>
      </button>`;
    }).join('');
  }
  
  function stOpenLesson(id) {
    // v4.81.10: tolerate the "Start Lesson 1" CTA passing 1 / '1' — the
    // placeholder card uses that as a friendly shorthand for "first
    // lesson". Lesson IDs are strings ('binary', 'ip_anatomy', ...) so a
    // strict-equality find() against a numeric 1 returned undefined and
    // the click silently no-op'd. Codex r8 flagged: "Start Lesson 1
    // buttons did not visibly transition into lesson content." Fix: if
    // the caller passes 1 or '1' (or anything that doesn't match an
    // existing lesson id directly), fall back to the first lesson.
    if ((id === 1 || id === '1') && SUBNET_LESSONS[0]) id = SUBNET_LESSONS[0].id;
    stActiveLesson = id;
    stRenderLessonSidebar();
    const lesson = SUBNET_LESSONS.find(l => l.id === id);
    if (!lesson) return;
    const main = document.getElementById('st-lesson-main');
    if (!main) return;
  
    let html = `<div class="st-lesson-header"><span class="st-lesson-header-icon">${lesson.icon}</span><h3>${escHtml(lesson.title)}</h3><p class="st-lesson-desc">${escHtml(lesson.desc)}</p></div>`;
    // Theory
    html += '<div class="st-lesson-theory">';
    lesson.theory.forEach(t => { html += `<div class="st-theory-block">${t}</div>`; });
    html += '</div>';
    // Practice gate
    html += '<div class="st-lesson-gate"><h4>\ud83c\udfaf Practice Gate \u2014 Get 3/5 to unlock the next lesson</h4>';
    html += '<div id="st-gate-area"></div></div>';
  
    main.innerHTML = html;
    stRenderGate(lesson);
    // v4.44.0 — animate the ✅ pop on Lesson 4 & 5 block-match visuals when the
    // card scrolls into view. Default .st-block-match is opacity:0 + scale(0.3);
    // adding .st-block-match-active fires the 600ms pop-in keyframe. One-shot per
    // element (unobserve after first trigger) so scrolling back doesn't replay.
    _stSetupBlockMatchObserver();
  }
  
  function _stSetupBlockMatchObserver() {
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: no observer support → just activate all immediately so the
      // ✅ is at least visible. No animation, but content isn't hidden.
      document.querySelectorAll('.st-block-match').forEach(el => el.classList.add('st-block-match-active'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('st-block-match-active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.st-block-match:not(.st-block-match-active)').forEach(el => observer.observe(el));
  }
  
  function stRenderGate(lesson) {
    const area = document.getElementById('st-gate-area');
    if (!area) return;
    const cat = lesson.practice || 'masks';
    let gateState = { questions: [], current: 0, correct: 0, total: 0 };
    // Generate 5 gate questions
    for (let i = 0; i < 5; i++) gateState.questions.push(genSubnetQuestion(cat, 'beginner'));
    window._stGateState = gateState;
    stRenderGateQuestion(area, gateState);
  }
  
  function stRenderGateQuestion(area, gs) {
    if (gs.current >= 5) {
      const passed = gs.correct >= 3;
      area.innerHTML = `<div class="st-gate-result ${passed ? 'st-gate-pass' : 'st-gate-fail'}"><div style="font-size:32px;margin-bottom:8px">${passed ? '\ud83c\udf89' : '\ud83d\udcaa'}</div><div style="font-size:16px;font-weight:700;margin-bottom:6px">${passed ? 'Lesson Complete!' : 'Keep Practicing'}</div><div style="font-size:14px;color:var(--text-mid)">${gs.correct}/5 correct${passed ? '' : ' \u2014 need 3 to pass'}</div>${!passed ? '<button class="btn btn-ghost" style="margin-top:12px" onclick="stOpenLesson(stActiveLesson)">Retry</button>' : ''}</div>`;
      if (passed) {
        const p = getLessonProgress();
        p[stActiveLesson] = { passed: true, score: gs.correct, date: new Date().toISOString() };
        saveLessonProgress(p);
        stRenderLessonSidebar();
      }
      return;
    }
    const q = gs.questions[gs.current];
    area.innerHTML = `<div class="st-gate-q"><div class="st-gate-progress">${gs.current + 1} / 5</div><div class="subnet-question" style="font-size:15px;margin-bottom:14px">${escHtml(q.q)}</div><div class="subnet-input-row"><input type="text" id="st-gate-input" class="subnet-input" placeholder="Your answer\u2026" autocomplete="off" inputmode="decimal" /><button class="btn btn-primary" onclick="stCheckGate()">Check</button></div><div id="st-gate-fb" class="st-feedback"></div></div>`;
    document.getElementById('st-gate-input')?.focus();
  }
  
  function stCheckGate() {
    const gs = window._stGateState;
    if (!gs) return;
    const inp = document.getElementById('st-gate-input');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) return;
    inp.disabled = true;
    const q = gs.questions[gs.current];
    const correct = val === q.answer || (q.altAnswers && q.altAnswers.includes(val));
    gs.total++;
    if (correct) gs.correct++;
    const fb = document.getElementById('st-gate-fb');
    if (fb) {
      fb.innerHTML = correct ? `<div class="st-fb-correct">\u2705 Correct! ${escHtml(q.answer)}</div>` : `<div class="st-fb-wrong">\u274c ${escHtml(q.answer)}</div>`;
      fb.className = 'st-feedback st-feedback-visible';
    }
    gs.current++;
    setTimeout(() => stRenderGateQuestion(document.getElementById('st-gate-area'), gs), 1200);
  }
  
  // ── Heatmap ──
  function stRenderHeatmap() {
    const el = document.getElementById('st-heatmap');
    if (!el) return;
    const m = getSubnetMastery();
    el.innerHTML = '<div class="st-heatmap-title">Category Accuracy</div><div class="st-heatmap-grid">' + ST_CAT_IDS.map(c => {
      const cat = ST_CATEGORIES[c];
      const d = m.categories[c] || { seen: 0, correct: 0, box: 1 };
      const acc = d.seen > 0 ? Math.round(d.correct / d.seen * 100) : 0;
      const color = d.seen === 0 ? 'var(--text-dim)' : acc >= 80 ? 'var(--green)' : acc >= 50 ? 'var(--yellow)' : 'var(--red)';
      return `<div class="st-heat-cell" style="border-color:${cat.color}"><div class="st-heat-icon">${cat.icon}</div><div class="st-heat-pct" style="color:${color}">${d.seen > 0 ? acc + '%' : '\u2014'}</div><div class="st-heat-label">${cat.label.split(' ')[0]}</div><div class="st-heat-box">Box ${d.box}/5</div></div>`;
    }).join('') + '</div>';
  }
  
  // ── Level Badge ──
  function stRenderLevelBadge() {
    const el = document.getElementById('st-level-badge');
    if (!el) return;
    const m = getSubnetMastery();
    const colors = { beginner: '#22c55e', intermediate: '#f59e0b', advanced: '#f97316', expert: '#ef4444' };
    el.textContent = m.currentLevel.charAt(0).toUpperCase() + m.currentLevel.slice(1);
    el.style.background = (colors[m.currentLevel] || '#7c6ff7') + '22';
    el.style.color = colors[m.currentLevel] || '#7c6ff7';
    el.style.borderColor = (colors[m.currentLevel] || '#7c6ff7') + '55';
  }
  
  // ── Dashboard ──
  // v4.43.1: Jump from the dashboard's weak-categories callout straight into
  // a focused practice session on that category. Pairs with new "Weakest
  // Categories" + "Stale Categories" callouts added below.
  function stDashJumpToCategory(catId) {
    setSubnetTab('practice');
    setSubnetMode('focus');
    stSetFocusCat(catId);
  }
  
  function stRenderDashboard() {
    const el = document.getElementById('st-dashboard-content');
    if (!el) return;
    // v4.78.0: surface weakest-category recommendation at top of Subnet page
    if (typeof renderSubnetRecommendation === 'function') renderSubnetRecommendation();
    const m = getSubnetMastery();
    const acc = m.totalAnswered > 0 ? Math.round(m.totalCorrect / m.totalAnswered * 100) : 0;
    const levelPcts = { beginner: 0, intermediate: 33, advanced: 66, expert: 100 };
    const pct = levelPcts[m.currentLevel] || 0;
    const nextLevel = m.currentLevel === 'beginner' ? 'Intermediate (60% acc, 15+ Qs)' : m.currentLevel === 'intermediate' ? 'Advanced (70% acc, 40+ Qs)' : m.currentLevel === 'advanced' ? 'Expert (80% acc, 60+ Qs)' : 'Maximum level reached!';
  
    let html = '<div class="st-dash-hero">';
    html += `<div class="st-dash-level"><div class="st-dash-level-title">${m.currentLevel.charAt(0).toUpperCase() + m.currentLevel.slice(1)}</div><div class="st-dash-level-bar"><div class="st-dash-level-fill" style="width:${pct}%"></div></div><div class="st-dash-level-next">Next: ${nextLevel}</div></div>`;
    html += `<div class="st-dash-stats"><div class="st-dash-stat"><div class="st-dash-stat-val">${m.totalAnswered}</div><div class="st-dash-stat-label">Questions</div></div><div class="st-dash-stat"><div class="st-dash-stat-val">${acc}%</div><div class="st-dash-stat-label">Accuracy</div></div><div class="st-dash-stat"><div class="st-dash-stat-val">${m.totalCorrect}</div><div class="st-dash-stat-label">Correct</div></div></div>`;
    html += '</div>';
  
    // ── v4.43.1: Weakest categories callout (top-3, ≥5 seen, sorted by accuracy asc) ──
    const now = Date.now();
    const catRows = ST_CAT_IDS.map(c => {
      const d = m.categories[c] || { seen: 0, correct: 0, lastSeen: null };
      const accuracy = d.seen > 0 ? d.correct / d.seen : null;
      const daysSince = d.lastSeen ? Math.floor((now - new Date(d.lastSeen).getTime()) / 86400000) : null;
      return { id: c, cat: ST_CATEGORIES[c], seen: d.seen, accuracy, daysSince };
    });
    const weakest = catRows
      .filter(r => r.seen >= 5 && r.accuracy !== null && r.accuracy < 0.75)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);
    if (weakest.length > 0) {
      html += '<div class="st-dash-callout st-dash-callout-weak"><div class="st-dash-callout-title">⚠️ Your weakest categories — drill these now</div><div class="st-dash-callout-rows">';
      weakest.forEach(w => {
        const pctNum = Math.round(w.accuracy * 100);
        html += `<button class="st-dash-callout-row" onclick="stDashJumpToCategory('${w.id}')" title="Jump to focus drill on ${escHtml(w.cat.label)}"><span class="st-dash-callout-icon">${w.cat.icon}</span><span class="st-dash-callout-name">${escHtml(w.cat.label)}</span><span class="st-dash-callout-pct">${pctNum}%</span><span class="st-dash-callout-action">Drill →</span></button>`;
      });
      html += '</div></div>';
    }
  
    // ── v4.43.1: Stale categories callout (seen at least once, not seen >7 days) ──
    const stale = catRows
      .filter(r => r.seen >= 1 && r.daysSince !== null && r.daysSince > 7)
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 3);
    if (stale.length > 0) {
      html += '<div class="st-dash-callout st-dash-callout-stale"><div class="st-dash-callout-title">🕐 Haven\'t touched in a while — refresh these</div><div class="st-dash-callout-rows">';
      stale.forEach(s => {
        html += `<button class="st-dash-callout-row" onclick="stDashJumpToCategory('${s.id}')" title="Jump to focus drill on ${escHtml(s.cat.label)}"><span class="st-dash-callout-icon">${s.cat.icon}</span><span class="st-dash-callout-name">${escHtml(s.cat.label)}</span><span class="st-dash-callout-pct">${s.daysSince}d stale</span><span class="st-dash-callout-action">Refresh →</span></button>`;
      });
      html += '</div></div>';
    }
  
    // ── v4.43.1: Weakest question types (granular signal — 21 types across 7 categories) ──
    const typeRows = Object.entries(m.types || {})
      .filter(([, v]) => v.seen >= 3)
      .map(([t, v]) => ({ type: t, accuracy: v.correct / v.seen, seen: v.seen }))
      .filter(r => r.accuracy < 0.7)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);
    if (typeRows.length > 0) {
      html += '<div class="st-dash-callout st-dash-callout-types"><div class="st-dash-callout-title">🎯 Specific question types tripping you up</div><div class="st-dash-callout-type-list">';
      typeRows.forEach(r => {
        const pctNum = Math.round(r.accuracy * 100);
        const humanType = r.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        html += `<div class="st-dash-callout-type-row"><span class="st-dash-callout-type-name">${escHtml(humanType)}</span><span class="st-dash-callout-type-pct">${pctNum}% on ${r.seen} attempts</span></div>`;
      });
      html += '</div></div>';
    }
  
    // Category mastery cards
    html += '<h3 class="st-dash-heading">Category Mastery</h3><div class="st-dash-cats">';
    ST_CAT_IDS.forEach(c => {
      const cat = ST_CATEGORIES[c];
      const d = m.categories[c] || { seen: 0, correct: 0, box: 1, streak: 0 };
      const catAcc = d.seen > 0 ? Math.round(d.correct / d.seen * 100) : 0;
      const barColor = catAcc >= 80 ? 'var(--green)' : catAcc >= 50 ? 'var(--yellow)' : 'var(--red)';
      html += `<div class="st-dash-cat-card" style="border-left:3px solid ${cat.color}"><div class="st-dash-cat-head">${cat.icon} ${escHtml(cat.label)}</div><div class="st-dash-cat-bar"><div style="width:${catAcc}%;background:${barColor};height:100%;border-radius:3px;transition:width .3s"></div></div><div class="st-dash-cat-stats"><span>${catAcc}% acc</span><span>${d.seen} seen</span><span>Box ${d.box}/5</span><span>\ud83d\udd25 ${d.streak}</span></div></div>`;
    });
    html += '</div>';
  
    // Lesson progress
    html += '<h3 class="st-dash-heading">Lesson Progress</h3><div class="st-dash-lessons">';
    const lp = getLessonProgress();
    SUBNET_LESSONS.forEach((l, i) => {
      const done = lp[l.id] && lp[l.id].passed;
      html += `<div class="st-dash-lesson-row"><span>${done ? '\u2705' : '\u2b1c'}</span><span>Lesson ${i+1}: ${escHtml(l.title)}</span></div>`;
    });
    html += '</div>';
  
    // Reset button
    html += '<div style="margin-top:24px;text-align:center"><button class="btn btn-ghost" onclick="if(confirm(\'Reset all subnet mastery data?\')){ localStorage.removeItem(STORAGE.SUBNET_MASTERY); localStorage.removeItem(STORAGE.SUBNET_LESSONS); stRenderDashboard(); }" style="font-size:12px;color:var(--text-dim)">Reset Mastery Data</button></div>';
  
    el.innerHTML = html;
  }
  
  // ── Enter key handler ──
  document.addEventListener('keydown', e => {
    if (!document.getElementById('page-subnet')?.classList.contains('active')) return;
    if (e.key === 'Enter') {
      // Practice tab
      const nextBtn = document.getElementById('st-next-btn');
      if (nextBtn && !nextBtn.classList.contains('is-hidden')) { stNextQuestion(); return; }
      const submitBtn = document.getElementById('st-submit-btn');
      if (submitBtn && !submitBtn.classList.contains('is-hidden')) { stCheckAnswer(); return; }
      // Gate
      const gateInput = document.getElementById('st-gate-input');
      if (gateInput && !gateInput.disabled) { stCheckGate(); return; }
    }
  });

  // ── Shell-callable teardown (v4.99.42) ──
  // goSetup() and other navigation paths can fire this to ensure the timed-
  // challenge timer is cleared when user leaves Subnet Trainer. Same shell-
  // callable pattern as _portDrillTeardown (v4.99.38) and _irwTeardown
  // (v4.99.39). Idempotent — safe to call when no timer is active.
  window._subnetTrainerTeardown = function() {
    try { stStopTimer(); } catch (_) {}
    try {
      if (stTimerInterval) {
        clearInterval(stTimerInterval);
        stTimerInterval = null;
      }
    } catch (_) {}
  };

  // ── Expose to window so onclick handlers in rendered HTML find them ──
  // CRITICAL: setSubnetTab is referenced in STATIC index.html onclicks at
  // lines 1307-1309 (tab buttons) — must be on window post-lazy-load so the
  // tab clicks work after Subnet Trainer is entered.
  window.setSubnetTab = setSubnetTab;
  window.stOpenLesson = stOpenLesson;
  window.stRenderDashboard = stRenderDashboard;
  window.stAskCoach = stAskCoach;
  window.stCheckAnswer = stCheckAnswer;
  window.stCheckGate = stCheckGate;
  window.stDashJumpToCategory = stDashJumpToCategory;
  window.stPickMcq = stPickMcq;
  window.stSetFocusCat = stSetFocusCat;
  window.stNextQuestion = stNextQuestion;
  window.stStopTimer = stStopTimer;
  window.stStartTimer = stStartTimer;
  window.stEndTimedChallenge = stEndTimedChallenge;

  // ── Register feature module entry point ──
  // Same contract as v4.99.36 (NA), v4.99.37 (PHT), v4.99.38 (Port Drill),
  // v4.99.39 (IRW). Shell calls window._certanvilFeatures["subnet-trainer"]
  // .enter() after lazy-load completes.
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures["subnet-trainer"] = {
    enter: function() {
      // Original startSubnetTrainer body inlined here. Pro gate fires from
      // the shell stub, so we don't double-gate.
      setSubnetTab("learn");
      stRenderLevelBadge();
      // v4.81.10: render Drill Mission Card on entry. renderSubnetRecommendation
      // lives in the shell at app.js:4912 (kept there because it computes
      // multi-feature mission state).
      if (typeof renderSubnetRecommendation === "function") renderSubnetRecommendation();
    },
    leave: function() {
      // Clean up timer + reset core state on page-leave.
      try { window._subnetTrainerTeardown(); } catch (_) {}
      stCorrect = 0; stTotal = 0; stStreak = 0;
      stQ = null; stIdx = 0;
      stActiveLesson = null;
    },
  };
})();
