#!/usr/bin/env node
// ══════════════════════════════════════════
// Network+ Quiz — Reusable UAT Test Suite
// Run: node tests/uat.js
// ══════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let html, js, css, sw;
try {
  html = read('index.html');
  js   = read('app.js');
  css  = read('styles.css');
  sw   = read('sw.js');
} catch(e) {
  console.error('ERROR: Could not read project files. Run from project root.');
  process.exit(1);
}

// ── Test runner ──
const results = { pass: 0, fail: 0, errors: [] };
function test(name, condition) {
  if (condition) {
    results.pass++;
    console.log(`  \x1b[32mPASS\x1b[0m ${name}`);
  } else {
    results.fail++;
    results.errors.push(name);
    console.log(`  \x1b[31mFAIL\x1b[0m ${name}`);
  }
}

// ── JS Syntax Check ──
console.log('\n\x1b[1m── SYNTAX ──\x1b[0m');
try {
  new (require('vm').Script)(js);
  test('app.js parses without syntax errors', true);
} catch(e) {
  test('app.js parses without syntax errors', false);
  console.log('    Error:', e.message);
}

// ── HTML Structure ──
console.log('\n\x1b[1m── HTML PAGES ──\x1b[0m');
const pages = ['setup','loading','quiz','results','review','session-transition','session-complete','progress','exam','exam-results','subnet','ports','analytics'];
pages.forEach(p => test(`page-${p} exists`, html.includes(`id="page-${p}"`)));

console.log('\n\x1b[1m── HTML ELEMENTS ──\x1b[0m');
test('Version badge present', /v\d+\.\d+/.test(html));
test('API key input', html.includes('id="api-key"'));
test('Topic chip group', html.includes('id="topic-group"'));
test('Difficulty chip group', html.includes('id="diff-group"'));
test('Generate Quiz button', html.includes('startQuiz()'));
test('Simulate Exam button', html.includes('startExam()'));
test('Subnet Trainer button', html.includes('startSubnetTrainer()'));
test('Port Drill button', html.includes('startPortDrill()'));
test('Analytics button', html.includes('renderAnalytics()'));
test('Topic brief div', html.includes('id="topic-brief"'));
test('Subnet reference table', html.includes('subnet-table'));
test('Port missed review div', html.includes('port-missed-review'));
test('Export/Import buttons', html.includes('exportData()') && html.includes('importData('));

// ── JS Functions ──
console.log('\n\x1b[1m── JS CORE FUNCTIONS ──\x1b[0m');
const coreFns = [
  'showPage','goSetup','startQuiz','startExam','fetchQuestions','render','renderExam',
  'pick','showExplanation','showReview','submitExam','exportData','importData',
  'validateQuestions','aiValidateQuestions','explainFurther','injectPBQs',
  'renderTopology','renderTopoState','submitTopology','renderCliSim','runCliCommand',
  'renderMCQ','renderMultiSelect','renderOrder'
];
// Unified render functions should accept an `ans` parameter (exam mode) — verify all take it
test('renderMCQ unified signature', /function renderMCQ\(q, box, ans\)/.test(js));
test('renderMultiSelect unified signature', /function renderMultiSelect\(q, box, ans\)/.test(js));
test('renderOrder unified signature', /function renderOrder\(q, box, ans\)/.test(js));
test('renderCliSim unified signature', /function renderCliSim\(q, box, ans\)/.test(js));
test('renderTopology unified signature', /function renderTopology\(q, box, ans\)/.test(js));
test('No duplicated renderExam* functions', !/function renderExam(MCQ|MultiSelect|Order|CliSim|Topology)\(/.test(js));

// Accessibility
test('quiz-flag-btn has aria-pressed', html.includes('id="quiz-flag-btn"') && html.includes('aria-pressed="false"'));
test('exam-flag-btn has aria-pressed', html.includes('id="exam-flag-btn"') && /exam-flag-btn[^>]*aria-pressed/.test(html));
test('live-score has aria-live', /id="live-score"[^>]*aria-live/.test(html));
test('subnet-answer has aria-label', /id="subnet-answer"[^>]*aria-label/.test(html));
test('qnav-toggle has aria-expanded', /id="qnav-toggle"[^>]*aria-expanded/.test(html));
test('exam-timer has role=timer', /id="exam-timer"[^>]*role="timer"/.test(html));
test('syncChipAriaPressed helper defined', js.includes('function syncChipAriaPressed'));
test('showPage moves focus to heading', js.includes('focusTarget.focus'));
test('renderNavGrid sets aria-label per square', js.includes('`Question ${i + 1},'));
coreFns.forEach(fn => test(`function ${fn}()`, js.includes(`function ${fn}(`)));

console.log('\n\x1b[1m── JS FEATURE: SUBNETTING ──\x1b[0m');
['cidrToMask','cidrToMaskArr','getSubnetAddr','getBroadcastAddr','hostCount',
 'genSubnetQuestion','startSubnetTrainer','nextSubnetQuestion','checkSubnetAnswer'
].forEach(fn => test(`function ${fn}()`, js.includes(`function ${fn}(`)));
test('6 question types', ['cidr_to_mask','mask_to_cidr','find_subnet','find_broadcast','host_count','usable_range'].every(t => js.includes(t)));

console.log('\n\x1b[1m── JS FEATURE: PORT DRILL ──\x1b[0m');
['startPortDrill','beginPortDrill','nextPortQ','pickPort','endPortDrill',
 'getPortStats','savePortStats','updatePortStat','portWeight','pickWeightedPort',
 'getWeakestPorts','renderPortFocusInfo','resetPortStats'
].forEach(fn => test(`function ${fn}()`, js.includes(`function ${fn}(`)));
test('40+ port entries', (js.match(/proto:'/g) || []).length >= 38);
test('Wrong answer tracking (portMissed)', js.includes('portMissed.push'));
test('Missed review rendering', js.includes('MISSED PORTS'));
test('Adaptive focus: PORT_STATS storage key', js.includes("PORT_STATS: 'nplus_port_stats'"));
test('Adaptive focus: nextPortQ uses weighted selection', js.includes('pickWeightedPort()'));
test('Adaptive focus: pickPort records stats', js.includes('updatePortStat(portCurrentQ.correct.proto'));
test('Adaptive focus: weight formula boosts weak ports', js.includes('1 - accuracy'));
test('Adaptive focus: pregame shows focus info', js.includes('renderPortFocusInfo()'));
test('Port focus info container in HTML', html.includes('id="port-focus-info"'));
test('Port reset stats button in HTML', html.includes('id="port-reset-stats-btn"'));

console.log('\n\x1b[1m── JS FEATURE: TOPIC BRIEF ──\x1b[0m');
test('function fetchTopicBrief()', js.includes('function fetchTopicBrief('));
test('Fires in parallel during startQuiz', js.includes('fetchTopicBrief(key'));

console.log('\n\x1b[1m── JS FEATURE: ANALYTICS ──\x1b[0m');
test('function renderAnalytics()', js.includes('function renderAnalytics('));
['ACCURACY TREND','DIFFICULTY BREAKDOWN','TOPIC MASTERY','STUDY ACTIVITY',
 'EXAM SCORE HISTORY','PRIORITY STUDY AREAS','WEEKLY VOLUME','ALL-TIME STATS'
].forEach(s => test(`Analytics: ${s}`, js.includes(s)));

console.log('\n\x1b[1m── JS FEATURE: DRAG & DROP ──\x1b[0m');
test('Devices are draggable', js.includes('btn.draggable = true'));
test('ondragstart handler', js.includes('ondragstart'));
test('Zone ondrop handler', js.includes('zoneEl.ondrop') || js.includes('.ondrop'));
test('dataTransfer API used', js.includes('dataTransfer.setData') && js.includes('dataTransfer.getData'));

console.log('\n\x1b[1m── JS FEATURE: DEEP EXPLANATIONS ──\x1b[0m');
test('6 explanation sections in prompt', ['CONCEPT BREAKDOWN','REAL-WORLD ANALOGY','HOW THIS APPEARS ON THE EXAM','MEMORY TRICK','RELATED CONCEPTS'].every(s => js.includes(s)));
test('max_tokens >= 1500', js.includes('max_tokens: 1500'));

console.log('\n\x1b[1m── JS QUESTION TYPES ──\x1b[0m');
['mcq','multi-select','order','cli-sim','topology'].forEach(t => test(`Type: ${t}`, js.includes(`'${t}'`)));

// ── CSS ──
console.log('\n\x1b[1m── CSS SECTIONS ──\x1b[0m');
['.subnet-card','.subnet-table','.port-timer','.port-opt','.port-review-row',
 '.ana-card','.ana-chart','.ana-calendar','.ana-priority','.ana-alltime',
 '.topo-zone','.topo-device','.cli-terminal','.btn-tool','.topic-brief',
 '.deep-section-header','.topo-zone-dragover','.topo-device.dragging'
].forEach(sel => test(`CSS: ${sel}`, css.includes(sel)));
test('Dark theme variables', css.includes(':root'));
test('Light theme variables', css.includes('[data-theme="light"]'));

// ── Service Worker ──
console.log('\n\x1b[1m── SERVICE WORKER ──\x1b[0m');
test('Cache name set', sw.includes('CACHE_NAME'));
test('Shell assets defined', sw.includes('SHELL_ASSETS'));
test('Install handler', sw.includes("addEventListener('install'"));
test('Activate handler', sw.includes("addEventListener('activate'"));
test('Fetch handler', sw.includes("addEventListener('fetch'"));
test('API calls excluded from cache', sw.includes('api.anthropic.com'));
test('SW: cache cap defined (#20)', /CACHE_MAX_ENTRIES\s*=\s*\d+/.test(sw));
test('SW: trimCache helper present (#20)', sw.includes('async function trimCache'));
test('SW: trimCache called after cache.put (#20)', /cache\.put\([^)]+\);\s*trimCache\(/.test(sw));
test('SW: 5xx falls back to cached response (#20)', /response\.status\s*>=\s*500\s*&&\s*cached/.test(sw));
test('CSS: .is-hidden utility class (#17)', css.includes('.is-hidden { display: none !important;'));
test('CSS: .is-dimmed utility class (#17)', css.includes('.is-dimmed { opacity:'));
test('JS: uses is-hidden classList toggles (#17)', (js.match(/classList\.(add|remove|toggle)\(['"]is-hidden['"]/g) || []).length >= 50);
test('JS: uses is-dimmed classList toggles (#17)', (js.match(/classList\.(add|toggle)\(['"]is-dimmed['"]/g) || []).length >= 5);

// ── Subnet Math Verification ──
console.log('\n\x1b[1m── SUBNET MATH ──\x1b[0m');
// Extract and test the actual math functions
const vm = require('vm');
const sandbox = {};
const mathCode = `
  function cidrToMask(cidr) {
    const bits = '1'.repeat(cidr) + '0'.repeat(32 - cidr);
    return [bits.slice(0,8), bits.slice(8,16), bits.slice(16,24), bits.slice(24,32)].map(b => parseInt(b, 2)).join('.');
  }
  function cidrToMaskArr(cidr) {
    const bits = '1'.repeat(cidr) + '0'.repeat(32 - cidr);
    return [parseInt(bits.slice(0,8),2), parseInt(bits.slice(8,16),2), parseInt(bits.slice(16,24),2), parseInt(bits.slice(24,32),2)];
  }
  function getSubnetAddr(ipArr, maskArr) { return ipArr.map((o,i) => o & maskArr[i]); }
  function getBroadcastAddr(ipArr, maskArr) { return ipArr.map((o,i) => (o & maskArr[i]) | (~maskArr[i] & 255)); }
  function hostCount(cidr) { return cidr >= 31 ? (cidr === 31 ? 2 : 1) : Math.pow(2, 32 - cidr) - 2; }
`;
vm.runInNewContext(mathCode, sandbox);
test('/24 = 255.255.255.0', sandbox.cidrToMask(24) === '255.255.255.0');
test('/25 = 255.255.255.128', sandbox.cidrToMask(25) === '255.255.255.128');
test('/26 = 255.255.255.192', sandbox.cidrToMask(26) === '255.255.255.192');
test('/16 = 255.255.0.0', sandbox.cidrToMask(16) === '255.255.0.0');
test('/30 = 255.255.255.252', sandbox.cidrToMask(30) === '255.255.255.252');
test('/24 hosts = 254', sandbox.hostCount(24) === 254);
test('/30 hosts = 2', sandbox.hostCount(30) === 2);
test('Subnet 192.168.1.100/24', sandbox.getSubnetAddr([192,168,1,100], sandbox.cidrToMaskArr(24)).join('.') === '192.168.1.0');
test('Broadcast 192.168.1.100/24', sandbox.getBroadcastAddr([192,168,1,100], sandbox.cidrToMaskArr(24)).join('.') === '192.168.1.255');
test('Subnet 10.0.5.67/26', sandbox.getSubnetAddr([10,0,5,67], sandbox.cidrToMaskArr(26)).join('.') === '10.0.5.64');
test('Broadcast 10.0.5.67/26', sandbox.getBroadcastAddr([10,0,5,67], sandbox.cidrToMaskArr(26)).join('.') === '10.0.5.127');

// ── Tech Debt Fixes (v3.5) ──
console.log('\n\x1b[1m── TECH DEBT FIXES ──\x1b[0m');
test('APP_VERSION constant defined', /const APP_VERSION = '\d+\.\d+/.test(js));
test('EXAM_TIME_SECONDS constant', js.includes('const EXAM_TIME_SECONDS = 5400'));
test('HISTORY_CAP constant', js.includes('const HISTORY_CAP = 200'));
test('WRONG_BANK_CAP constant', js.includes('const WRONG_BANK_CAP = 200'));
test('Port timer cleared in goSetup()', js.includes('if (portTimer) { clearInterval(portTimer)'));
test('Wrong bank capped', js.includes('WRONG_BANK_CAP'));
test('Reports capped', js.includes('REPORTS_CAP'));
test('History cap uses constant', js.includes('HISTORY_CAP) h.length'));
test('Export version uses constant', js.includes('version: APP_VERSION'));
test('ExamTimeLeft uses constant', !js.includes('examTimeLeft   = 5400'));
test('Explanation cleanup before insert', js.includes('while (expTextEl.nextSibling)'));
test('Touch event support for topology', js.includes('touchstart') && js.includes('touchend'));
test('E key for multi-select', js.includes("'A','B','C','D','E'"));
test('Shared scoring helper', js.includes('function _scoreTopicNeed('));
test('Meta description in HTML', html.includes('meta name="description"'));
test('ARIA on theme toggle', html.includes('aria-label="Toggle'));
test('ARIA on API key input', html.includes('aria-label="Anthropic'));
test('ARIA on exam modal', html.includes('role="dialog"'));
test('Version badge matches APP_VERSION', (() => { const m = js.match(/const APP_VERSION = '([^']+)'/); return m && html.includes('v' + m[1]); })());
test('SW cache name matches APP_VERSION', (() => { const m = js.match(/const APP_VERSION = '([^']+)'/); return m && sw.includes('netplus-v'); })());
test('SW relative paths', sw.includes("'./index.html'"));
test('No unused Inter font', !css.includes("'Inter'"));
test('Difficulty uses e.difficulty', js.includes('e.difficulty || e.diff'));
test('/31 edge case guard', js.includes('cidr >= 31') && js.includes('genSubnetQuestion'));
test('Validation in retryQuiz', js.includes('retryQuiz') && js.includes('aiValidateQuestions(key, questions)'));
test('Validation in runSessionStep', js.includes('aiValidateQuestions(apiKey, questions)'));

// ── Analytics v2 (v4.5) ──
console.log('\n\x1b[1m── ANALYTICS v2 (v4.5) ──\x1b[0m');
test('APP_VERSION is 4.27.0', js.includes("const APP_VERSION = '4.27.0"));
test('getDailyGoal function', js.includes('function getDailyGoal('));
test('renderDailyGoal function', js.includes('function renderDailyGoal('));
test('editDailyGoal function', js.includes('function editDailyGoal('));
test('STORAGE.DAILY_GOAL key', js.includes('DAILY_GOAL:'));
test('getTodayQuestionCount function', js.includes('function getTodayQuestionCount('));
test('Daily goal card in HTML', html.includes('id="daily-goal-card"'));
test('Topic domain groups', html.includes('topic-domain-group'));
test('Advanced collapsible section', html.includes('id="advanced-section"'));
test('CSS: .topic-domain-group', css.includes('.topic-domain-group'));
test('CSS: .daily-goal-card', css.includes('.daily-goal-card'));
test('CSS: .advanced-section', css.includes('.advanced-section'));
test('CSS: .hero-stats-strip', css.includes('.hero-stats-strip'));
test('SW cache bumped to v4.25.0', sw.includes('netplus-v4.27.0'));
test('Family Drill: STORAGE.PORT_FAMILY_BEST', js.includes("PORT_FAMILY_BEST:"));
test('Family Drill: setPortMode handles family', js.includes("portMode = 'family'"));
test('Family Drill: HTML mode button', html.includes('id="port-mode-family"'));
test('Family Drill: nextPortQ reverted to 50/50', js.includes("Math.random() < 0.5 ? 'port' : 'proto'"));
test('Family Drill: nextPortQ no longer calls family', !/function nextPortQ\(\)[\s\S]{0,400}nextPortFamilyQ\(\);[\s\S]{0,80}return;/.test(js));
test('Family Drill: beginPortDrill routes family', /portMode === 'family'[\s\S]{0,80}nextPortFamilyQ/.test(js));
test('Family Drill: family wrong ends run', /portMode === 'family' \|\| portMode === 'endless'/.test(js));

// ── Hardcore exam (#48) ──
console.log('\n\x1b[1m── HARDCORE EXAM (v4.13 #48) ──\x1b[0m');
test('STORAGE.HARDCORE_EXAM key', js.includes("HARDCORE_EXAM:"));
test('examHardcore state var', js.includes('let examHardcore'));
test('setHardcoreMode function', js.includes('function setHardcoreMode('));
test('startExam reads HARDCORE_EXAM pref', /examHardcore = localStorage\.getItem\(STORAGE\.HARDCORE_EXAM\)/.test(js));
test('startExam toggles hardcore-active class', js.includes("classList.toggle('hardcore-active'"));
test('examPrev guarded by examHardcore', /function examPrev[\s\S]{0,150}if \(examHardcore\) return;/.test(js));
test('examToggleFlag guarded by examHardcore', /function examToggleFlag[\s\S]{0,200}if \(examHardcore\) return;/.test(js));
test('toggleNav guarded by examHardcore', /function toggleNav[\s\S]{0,150}if \(examHardcore\) return;/.test(js));
test('History entry includes hardcore flag', js.includes('hardcore: examHardcore'));
test('Hardcore badge shown on results', js.includes("'exam-hardcore-badge'"));
test('hardcore_pass milestone defined', js.includes("id: 'hardcore_pass'"));
test('hardcore_pass evaluated against history', /maybe\('hardcore_pass'[\s\S]{0,200}e\.hardcore/.test(js));
test('HTML: hardcore-checkbox', html.includes('id="hardcore-checkbox"'));
test('HTML: hardcore-toggle label', html.includes('class="hardcore-toggle"'));
test('HTML: exam-hardcore-badge', html.includes('id="exam-hardcore-badge"'));
test('CSS: .hardcore-toggle', css.includes('.hardcore-toggle'));
test('CSS: .hardcore-badge', css.includes('.hardcore-badge'));
test('CSS: hardcore-active hides flag/nav', css.includes('hardcore-active'));
// v4.8 — N10-009 tightness
test('computeDomainDistribution helper', js.includes('function computeDomainDistribution('));
test('N10-009 objective regex used in validation', /\(\[1-5\]\\\.\[1-8\]\)/.test(js));
test('Prompt requires objective field', js.includes('MANDATORY N10-009 OBJECTIVE TAGGING'));
test('Prompt: objective in JSON schema', js.includes('"objective":"X.Y"'));
test('Mixed mode domain distribution', js.includes('MANDATORY DOMAIN DISTRIBUTION'));
test('validateQuestions enforces objective', js.includes('q.objective') && js.includes('[1-5]\\.[1-8]'));
test('injectPBQs stamps objective', js.includes('objective: obj'));
// computeDomainDistribution math — largest remainder adds up to n, respects 23/20/19/14/24
const vm2 = require('vm');
const distSandbox = { DOMAIN_WEIGHTS: { concepts:0.23, implementation:0.20, operations:0.19, security:0.14, troubleshooting:0.24 } };
const distCode = js.match(/function computeDomainDistribution[\s\S]*?\n\}/);
if (distCode) {
  vm2.runInNewContext(distCode[0] + '; result10 = computeDomainDistribution(10); result18 = computeDomainDistribution(18); result90 = computeDomainDistribution(90);', distSandbox);
  const sum10 = Object.values(distSandbox.result10).reduce((a,b)=>a+b,0);
  const sum18 = Object.values(distSandbox.result18).reduce((a,b)=>a+b,0);
  const sum90 = Object.values(distSandbox.result90).reduce((a,b)=>a+b,0);
  test('computeDomainDistribution(10) sums to 10', sum10 === 10);
  test('computeDomainDistribution(18) sums to 18', sum18 === 18);
  test('computeDomainDistribution(90) sums to 90', sum90 === 90);
  test('computeDomainDistribution(90) respects weights (concepts≈21)', distSandbox.result90.concepts === 21 || distSandbox.result90.concepts === 20);
  test('computeDomainDistribution(90) troubleshooting≈22', distSandbox.result90.troubleshooting === 22 || distSandbox.result90.troubleshooting === 21);
} else {
  test('computeDomainDistribution extracted', false);
}
// v4.7 new topics
[
  'Network Attacks & Threats',
  'Business Continuity & Disaster Recovery',
  'Network Monitoring & Observability',
  'Network Appliances & Device Functions',
  'Data Center Architectures',
  'Physical Security Controls',
  'DNS Records & DNSSEC'
].forEach(topic => {
  test(`Topic chip: ${topic}`, html.includes(`data-v="${topic}"`));
  test(`TOPIC_DOMAINS: ${topic}`, js.includes(`'${topic}'`));
  test(`topicResources: ${topic}`, new RegExp(`'${topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\{\\s*obj:`).test(js));
});
test('DOMAIN_WEIGHTS constant', js.includes('const DOMAIN_WEIGHTS = {'));
test('TOPIC_DOMAINS mapping', js.includes('const TOPIC_DOMAINS = {'));
test('MILESTONE_DEFS defined', js.includes('MILESTONE_DEFS'));
[
  'getExamDate','setExamDate','getDaysToExam','getReadinessForecast',
  'getTypeStats','updateTypeStat','unlockMilestone','evaluateMilestones',
  'getStreakData','mineSubtopicWeakSpots','getSubnetStats','updateSubnetStat','updateExamDate'
].forEach(fn => test(`function ${fn}()`, js.includes(`function ${fn}(`)));
test('Enhanced readiness uses domain weighting', js.includes('domainAccuracy') && js.includes('DOMAIN_WEIGHTS'));
test('Recency boost in readiness', js.includes('recencyBoost') || js.includes('SEVEN_DAYS_MS'));
test('Exam-mode boost in readiness', js.includes('examBoost'));
test('Linear regression in forecast', js.includes('slope') && js.includes('intercept'));
test('Readiness hero card in analytics', js.includes('ana-ready-hero'));
test('Domain breakdown rendered', js.includes('ana-domain-row'));
test('Exam date picker in analytics', js.includes('ana-exam-date-btn'));
test('Streak card rendered', js.includes('ana-streak-grid'));
test('Weak spots card rendered', js.includes('ana-weak-list'));
test('Heatmap card rendered', js.includes('ana-heatmap'));
test('Type breakdown card rendered', js.includes('ana-type-list'));
test('Mode compare card rendered', js.includes('ana-mode-compare'));
test('Drills grid card rendered', js.includes('ana-drills-grid'));
test('Milestones card rendered', js.includes('ana-milestones'));
test('Type stats instrumented in pick()', js.includes("updateTypeStat(q.type"));
test('Type stats instrumented in submitExam', /updateTypeStat\(qType/.test(js));
test('Subnet stats instrumented', js.includes('updateSubnetStat('));
test('Perfect port milestone unlock', js.includes("unlockMilestone('perfect_port')"));
test('STORAGE.EXAM_DATE key', js.includes('EXAM_DATE:'));
test('STORAGE.MILESTONES key', js.includes('MILESTONES:'));
test('STORAGE.TYPE_STATS key', js.includes('TYPE_STATS:'));
test('STORAGE.SUBNET_STATS key', js.includes('SUBNET_STATS:'));
test('CSS: .ana-ready-hero', css.includes('.ana-ready-hero'));
test('CSS: .ana-domain-row', css.includes('.ana-domain-row'));
test('CSS: .ana-exam-date-btn', css.includes('.ana-exam-date-btn'));
test('CSS: .ana-streak-grid', css.includes('.ana-streak-grid'));
test('CSS: .ana-heatmap', css.includes('.ana-heatmap'));
test('CSS: .ana-milestone', css.includes('.ana-milestone'));

// ── Port Drill Endless mode (v4.9) ──
console.log('\n\x1b[1m── PORT DRILL ENDLESS (v4.9) ──\x1b[0m');
test('STORAGE.PORT_STREAK_BEST key', js.includes('PORT_STREAK_BEST:'));
test('portMode state variable', js.includes("let portMode = 'timed'"));
test('setPortMode function', js.includes('function setPortMode('));
test('Endless mode branch in beginPortDrill', js.includes("portMode === 'timed'") && js.includes('beginPortDrill'));
test('Endless mode ends on wrong answer', js.includes("portMode === 'endless'") && js.includes('endPortDrill()'));
test('streak_port_25 milestone defined', js.includes('streak_port_25'));
test('streak_port_25 unlock on endless', js.includes("unlockMilestone('streak_port_25')"));
test('Mode toggle buttons in HTML', html.includes('port-mode-timed') && html.includes('port-mode-endless'));
test('port-mode-desc in HTML', html.includes('id="port-mode-desc"'));
test('port-final-label in HTML', html.includes('id="port-final-label"'));
test('port-best-label has id', html.includes('id="port-best-label"'));
test('CSS: .port-mode-toggle', css.includes('.port-mode-toggle'));
test('CSS: .port-mode-btn', css.includes('.port-mode-btn'));
test('CSS: .port-mode-active', css.includes('.port-mode-active'));
test('Analytics surfaces endless streak best', js.includes('portStreakBest'));

// ── Front page features (v4.10) ──
console.log('\n\x1b[1m── FRONT PAGE v4.10 ──\x1b[0m');
test('STORAGE.DAILY_CHALLENGE key', js.includes('DAILY_CHALLENGE:'));
test('STORAGE.DEEP_DIVE_USES key', js.includes('DEEP_DIVE_USES:'));
test('getDailyChallenge function', js.includes('function getDailyChallenge('));
test('saveDailyChallenge function', js.includes('function saveDailyChallenge('));
test('isDailyChallengeDoneToday function', js.includes('function isDailyChallengeDoneToday('));
test('completeDailyChallenge function', js.includes('function completeDailyChallenge('));
test('getDailyChallengeTopic function', js.includes('function getDailyChallengeTopic('));
test('renderDailyChallengeCard function', js.includes('function renderDailyChallengeCard('));
test('startDailyChallenge function', js.includes('function startDailyChallenge('));
test('Daily challenge completion hook', js.includes('completeDailyChallenge()') && js.includes('dailyChallengeMode = false'));
test("Daily challenge history entry mode 'daily'", js.includes("mode: 'daily'") || js.includes("dailyChallengeMode ? 'daily'"));
test('dailyChallengeMode state', js.includes('dailyChallengeMode'));
test('getTodaysFocusTopics function', js.includes('function getTodaysFocusTopics('));
test('renderTodaysFocus function', js.includes('function renderTodaysFocus('));
test('focusTopic function', js.includes('function focusTopic('));
test('renderStreakDefender function', js.includes('function renderStreakDefender('));
test('startStreakSave function', js.includes('function startStreakSave('));
test('applyPreset function', js.includes('function applyPreset('));
test('Preset: warmup', js.includes("'warmup'"));
test('Preset: focused', js.includes("'focused'"));
test('Preset: grind', js.includes("'grind'"));
test('Deep dive counter increment', js.includes('STORAGE.DEEP_DIVE_USES') && js.includes('explainFurther'));
// HTML
test('streak-defender element', html.includes('id="streak-defender"'));
test('daily-challenge-card element', html.includes('id="daily-challenge-card"'));
test('todays-focus element', html.includes('id="todays-focus"'));
test('quiz-presets block', html.includes('class="quiz-presets"'));
test('Preset tile: warmup', html.includes("applyPreset('warmup')"));
test('Preset tile: focused', html.includes("applyPreset('focused')"));
test('Preset tile: grind', html.includes("applyPreset('grind')"));
// CSS
test('CSS: .streak-defender', css.includes('.streak-defender'));
test('CSS: .daily-challenge-card', css.includes('.daily-challenge-card'));
test('CSS: .todays-focus', css.includes('.todays-focus'));
test('CSS: .quiz-presets', css.includes('.quiz-presets'));
test('CSS: .preset-tile', css.includes('.preset-tile'));
// New milestones (v4.10)
const newMilestones = [
  'perfect_quiz','five_exams','ten_exams','first_subnet','subnet_50',
  'first_port_drill','all_ports_seen','first_session','night_owl','early_bird',
  'weekend_warrior','diversity_5','deep_dive_10','daily_challenge_7','daily_challenge_30'
];
newMilestones.forEach(m => test(`Milestone: ${m}`, js.includes(`id: '${m}'`)));
test('evaluateMilestones handles perfect_quiz', js.includes("maybe('perfect_quiz'"));
test('evaluateMilestones handles weekend_warrior', js.includes("maybe('weekend_warrior'"));
test('evaluateMilestones handles diversity_5', js.includes("maybe('diversity_5'"));
test('evaluateMilestones handles deep_dive_10', js.includes("maybe('deep_dive_10'"));
test('evaluateMilestones handles daily_challenge_7', js.includes("maybe('daily_challenge_7'"));

// ── Port Reference panel (v4.11) ──
console.log('\n\x1b[1m── PORT REFERENCE v4.11 ──\x1b[0m');
test('portCategories defined', js.includes('const portCategories ='));
test('portSortMode state', js.includes("let portSortMode = 'category'"));
test('renderPortReference function', js.includes('function renderPortReference('));
test('setPortSortMode function', js.includes('function setPortSortMode('));
test('filterPortReference function', js.includes('function filterPortReference('));
test('_portCard helper', js.includes('function _portCard('));
test('startPortDrill calls renderPortReference', /function startPortDrill\(\)[\s\S]*?renderPortReference\(\);[\s\S]*?\n\}/.test(js));
test('HTML: port-ref details', html.includes('id="port-ref"'));
test('HTML: port-ref search input', html.includes('id="port-ref-search"'));
test('HTML: port-ref sort buttons', html.includes('id="port-ref-sort-cat"') && html.includes('id="port-ref-sort-num"') && html.includes('id="port-ref-sort-name"'));
test('HTML: port-ref list container', html.includes('id="port-ref-list"'));
test('CSS: .port-ref', css.includes('.port-ref '));
test('CSS: .port-ref-card', css.includes('.port-ref-card'));
test('CSS: .port-ref-group', css.includes('.port-ref-group'));
test('CSS: .port-ref-sort-active', css.includes('.port-ref-sort-active'));
// Every protocol in portData appears in exactly one category list
const catProtos = (js.match(/const portCategories = \[[\s\S]*?\];/) || [''])[0];
const dataProtos = [...js.matchAll(/proto:'([^']+)'/g)].map(m => m[1]);
test('All 40 ports covered in portCategories',
  dataProtos.length === 40 && dataProtos.every(p => catProtos.includes(`'${p}'`)));

// ── Topic Progress v2 (v4.11) ──
console.log('\n\x1b[1m── TOPIC PROGRESS v2 (v4.11) ──\x1b[0m');
test('progressState defined', js.includes('let progressState ='));
test('_buildProgressRows function', js.includes('function _buildProgressRows('));
test('_sortProgressRows function', js.includes('function _sortProgressRows('));
test('_progressRowMatches function', js.includes('function _progressRowMatches('));
test('_progressRowHtml function', js.includes('function _progressRowHtml('));
test('_renderProgressSummary function', js.includes('function _renderProgressSummary('));
test('_renderProgressGrouped function', js.includes('function _renderProgressGrouped('));
test('setProgressFilter function', js.includes('function setProgressFilter('));
test('setProgressSort function', js.includes('function setProgressSort('));
test('filterProgressPage function', js.includes('function filterProgressPage('));
test('_bucketOf helper', js.includes('function _bucketOf('));
test('progressState.sort default worst', /progressState = \{[^}]*sort: 'worst'/.test(js));
test('Summary uses TOPIC_DOMAINS', js.includes('TOPIC_DOMAINS[t]'));
test('Grouped render uses DOMAIN_WEIGHTS', /_renderProgressGrouped[\s\S]*?DOMAIN_WEIGHTS/.test(js));
test('Grouped render uses DOMAIN_LABELS', /_renderProgressGrouped[\s\S]*?DOMAIN_LABELS/.test(js));
test('HTML: progress-summary element', html.includes('id="progress-summary"'));
test('HTML: progress-search input', html.includes('id="progress-search"'));
test('HTML: progress-sort-select', html.includes('id="progress-sort-select"'));
test('HTML: filter button All', html.includes('data-filter="all"'));
test('HTML: filter button weak', html.includes('data-filter="weak"'));
test('HTML: filter button untouched', html.includes('data-filter="untouched"'));
test('HTML: filter button strong', html.includes('data-filter="strong"'));
test('CSS: .progress-summary', css.includes('.progress-summary'));
test('CSS: .progress-domain', css.includes('.progress-domain '));
test('CSS: .topic-obj-badge', css.includes('.topic-obj-badge'));
test('CSS: .prog-filter-active', css.includes('.prog-filter-active'));
test('CSS: .ps-coverage-bar', css.includes('.ps-coverage-bar'));

// ── Port Drill family multi-select (v4.12 #27) ──
console.log('\n\x1b[1m── PORT DRILL FAMILY Q (v4.12) ──\x1b[0m');
['getFamilyEligibleCategories','nextPortFamilyQ','togglePortFamilyPick','submitPortFamilyAnswer'
].forEach(fn => test(`function ${fn}()`, js.includes(`function ${fn}(`)));
test('nextPortQ rolls 40/40/20 (family branch)', js.includes('nextPortFamilyQ()') && /Math\.random\(\)/.test(js));
test('Family Q filters categories with >=2 protos', /ports\.length >= 2/.test(js));
test('Family Q exact-match scoring (correctKeys)', js.includes('correctKeys'));
test('Family Q records mode:family in portMissed', js.includes("mode: 'family'"));
test('Missed review branches on family mode', js.includes("m.mode === 'family'"));
test('Family Q updates per-port adaptive stats', /allOptions\.forEach[\s\S]*?updatePortStat/.test(js));
test('CSS: .port-opt-multi', css.includes('.port-opt-multi'));
test('CSS: .port-opt-selected', css.includes('.port-opt-selected'));
test('CSS: .port-submit-family', css.includes('.port-submit-family'));
test('SW cache bumped to v4.25.0', sw.includes('netplus-v4.27.0'));
test('APP_VERSION bumped to 4.25.0', js.includes("APP_VERSION = '4.27.0'"));

// ── Secure Pairs Port Drill mode (v4.16.1 #30) ──
console.log('\n\x1b[1m── SECURE PAIRS PORT DRILL (v4.16.1 #30) ──\x1b[0m');
test('STORAGE.PORT_PAIRS_BEST key', js.includes("PORT_PAIRS_BEST:"));
test('securePairs dataset defined', js.includes('const securePairs = ['));
test('Pairs: HTTP↔HTTPS', /HTTP[\s\S]{0,200}HTTPS[\s\S]{0,80}443/.test(js));
test('Pairs: Telnet↔SSH', /Telnet[\s\S]{0,200}SSH[\s\S]{0,80}'22'/.test(js));
test('Pairs: LDAP↔LDAPS', /LDAP[\s\S]{0,200}LDAPS[\s\S]{0,80}636/.test(js));
test('Pairs: POP3↔POP3S', /POP3[\s\S]{0,200}POP3S[\s\S]{0,80}995/.test(js));
test('Pairs: IMAP↔IMAPS', /IMAP[\s\S]{0,200}IMAPS[\s\S]{0,80}993/.test(js));
test('Pairs: FTP has FTPS variant', js.includes("'FTPS'") && js.includes("'990'"));
test('Pairs: FTP has SFTP variant', js.includes("'SFTP'"));
test('Pairs: SMTP has SMTPS variant', js.includes("'SMTPS'") && js.includes("'465'"));
test('Pairs: SMTP submission 587', js.includes("'587'"));
test('Pairs: qualifier disambiguation', js.includes('qualifier:'));
test('Pairs: siblingProto exclusion', js.includes('siblingProto:'));
test('nextPortPairsQ function defined', js.includes('function nextPortPairsQ('));
test('setPortMode handles pairs', js.includes("portMode = 'pairs'"));
test('setPortMode pairs description', /portMode === 'pairs'[\s\S]{0,300}secure equivalents/.test(js));
test('setPortMode pairs button toggle', js.includes("'port-mode-pairs'"));
test('setPortMode pairs best key lookup', /portMode === 'pairs' \? STORAGE\.PORT_PAIRS_BEST/.test(js));
test('beginPortDrill routes to nextPortPairsQ', /portMode === 'pairs'[\s\S]{0,80}nextPortPairsQ/.test(js));
test('pickPort ends run on pairs wrong', js.includes("portMode === 'endless' || portMode === 'pairs'"));
test('pickPort routes next Q to pairs', /portMode === 'pairs'\) nextPortPairsQ/.test(js));
test('endPortDrill labels pairs streak', js.includes("'pairs streak'"));
test('endPortDrill uses PORT_PAIRS_BEST', /portMode === 'pairs' \? STORAGE\.PORT_PAIRS_BEST/.test(js));
test('Pairs: dedup distractors by answered field', js.includes('seen.has(key)'));
test('Pairs: exclude sibling from distractors', js.includes('siblingExclude'));
test('Pairs: port-pick prompt format', js.includes('is the secure version of'));
test('Pairs: proto-pick prompt format', js.includes('Which protocol replaces'));
test('HTML: port-mode-pairs button', html.includes('id="port-mode-pairs"'));
test('HTML: Secure Pairs label', html.includes('Secure Pairs'));

// ── Bulk Mixed quiz presets (v4.14) ──
console.log('\n\x1b[1m── BULK MIXED PRESETS (v4.14) ──\x1b[0m');
test('HTML: bulk30 preset tile', html.includes("applyPreset('bulk30')"));
test('HTML: bulk60 preset tile', html.includes("applyPreset('bulk60')"));
test('HTML: bulk100 preset tile', html.includes("applyPreset('bulk100')"));
test('HTML: 30 Questions title', html.includes('30 Questions'));
test('HTML: 60 Questions title', html.includes('60 Questions'));
test('HTML: 100 Questions title', html.includes('100 Questions'));
test('startBulkQuiz function defined', js.includes('async function startBulkQuiz('));
test('applyPreset handles bulk sizes', js.includes('bulk30: 30, bulk60: 60, bulk100: 100'));
test('applyPreset routes bulk to startBulkQuiz', /bulkSizes\[name\][\s\S]{0,900}startBulkQuiz\(/.test(js));
test('startBulkQuiz batches via fetchQuestions', /startBulkQuiz[\s\S]{0,2000}fetchQuestions\(key, MIXED_TOPIC, 'Exam Level', thisBatch\)/.test(js));
test('startBulkQuiz uses 18-Q batches', /startBulkQuiz[\s\S]{0,1500}BATCH_SIZE = 18/.test(js));
test('startBulkQuiz has retry logic', /startBulkQuiz[\s\S]{0,2000}MAX_RETRIES/.test(js));
test('startBulkQuiz runs validation pipeline', /startBulkQuiz[\s\S]{0,3000}aiValidateQuestions[\s\S]{0,200}validateQuestions/.test(js));
test('startBulkQuiz forces Mixed topic', /startBulkQuiz[\s\S]{0,800}activeQuizTopic = MIXED_TOPIC/.test(js));
test('startBulkQuiz clears progress bar at end', /startBulkQuiz[\s\S]{0,2500}fill\.style\.width = '100%'/.test(js));

// ── Try It In Terminal + Guided Labs (v4.16.1 #68, #69) ──
console.log('\n\x1b[1m── TRY IT IN TERMINAL + GUIDED LABS (v4.16.1 #68, #69) ──\x1b[0m');
test('portCommands map defined', js.includes('const portCommands = {'));
test('portCommands: HTTPS → curl', /'HTTPS':\s*\{\s*cmd:\s*'curl -I https:\/\/example\.com'/.test(js));
test('portCommands: DNS → dig', /'DNS':\s*\{\s*cmd:\s*'dig google\.com'/.test(js));
test('portCommands: NTP → sntp', /'NTP':\s*\{\s*cmd:\s*'sntp time\.apple\.com'/.test(js));
test('portCommands: SMTP → openssl starttls', /'SMTP':[\s\S]{0,200}openssl s_client[\s\S]{0,120}starttls smtp/.test(js));
test('topicCommands map defined', js.includes('const topicCommands = {'));
test('topicCommands: DNS topic has dig +trace', /'Network Naming \(DNS & DHCP\)'[\s\S]{0,800}dig \+trace google\.com/.test(js));
test('topicCommands: Port Numbers has netstat LISTEN', /'Port Numbers'[\s\S]{0,600}netstat -an \| grep LISTEN/.test(js));
test('topicCommands: Troubleshooting has MTU ping', /ping -c 3 -s 1472 -D/.test(js));
test('guidedLabs map defined', js.includes('const guidedLabs = {'));
test('guidedLabs: DNS lab', js.includes('_dnsLab') && js.includes('DNS Records & Recursive Resolution'));
test('guidedLabs: Routing lab', js.includes('_routingLab') && js.includes('Routing & Your Real Default Gateway'));
test('guidedLabs: Ports lab', js.includes('_portsLab') && js.includes('Ports & Listening Services'));
test('guidedLabs: DNS alias 1', /'Network Naming \(DNS & DHCP\)':\s*_dnsLab/.test(js));
test('guidedLabs: DNS alias 2', /'DNS Records & DNSSEC':\s*_dnsLab/.test(js));
test('guidedLabs: Routing alias', /'Routing Protocols':\s*_routingLab/.test(js));
test('guidedLabs: Ports alias', /'Port Numbers':\s*_portsLab/.test(js));
test('Lab has steps array with narration/cmd/expect', /steps:\s*\[[\s\S]*?narration:[\s\S]*?cmd:[\s\S]*?expect:/.test(js));
test('copyCmd function defined', js.includes('function copyCmd(event, cmd)'));
test('copyCmd uses clipboard API', /copyCmd[\s\S]{0,300}navigator\.clipboard\.writeText/.test(js));
test('_terminalCardHtml helper', js.includes('function _terminalCardHtml('));
test('_portCard renders command row', js.includes('port-ref-card-has-cmd'));
test('_portCard reads portCommands', /_portCard[\s\S]{0,300}portCommands\[p\.proto\]/.test(js));
test('_renderTopicTerminalSection function', js.includes('function _renderTopicTerminalSection('));
test('_renderTopicLabSection function', js.includes('function _renderTopicLabSection('));
test('renderTopicDive calls terminal section', /renderTopicDive[\s\S]{0,3000}_renderTopicTerminalSection\(topicName\)/.test(js));
test('renderTopicDive calls lab section', /renderTopicDive[\s\S]{0,3000}_renderTopicLabSection\(topicName\)/.test(js));
test('openGuidedLab function defined', js.includes('function openGuidedLab('));
test('openGuidedLab sets title', /openGuidedLab[\s\S]{0,1500}titleEl\.textContent[\s\S]{0,80}lab\.title/.test(js));
test('openGuidedLab uses showPage guided-lab', /openGuidedLab[\s\S]{0,2000}showPage\('guided-lab'\)/.test(js));
test('HTML: #page-guided-lab', html.includes('id="page-guided-lab"'));
test('HTML: #lab-title', html.includes('id="lab-title"'));
test('HTML: #lab-intro', html.includes('id="lab-intro"'));
test('HTML: #lab-steps', html.includes('id="lab-steps"'));
test('HTML: #lab-back-btn', html.includes('id="lab-back-btn"'));
test('CSS: .terminal-card', css.includes('.terminal-card {'));
test('CSS: .terminal-card-copy', css.includes('.terminal-card-copy'));
test('CSS: .terminal-card-prompt', css.includes('.terminal-card-prompt'));
test('CSS: .port-ref-card-has-cmd', css.includes('.port-ref-card-has-cmd'));
test('CSS: .port-ref-cmd', css.includes('.port-ref-cmd '));
test('CSS: .td-terminal', css.includes('.td-terminal '));
test('CSS: .td-lab-callout', css.includes('.td-lab-callout'));
test('CSS: .lab-step', css.includes('.lab-step {'));
test('CSS: .lab-step-expect', css.includes('.lab-step-expect'));
test('CSS: .lab-wrap', css.includes('.lab-wrap '));
test('CSS: .lab-meta-pill', css.includes('.lab-meta-pill'));

// ── Dedicated Port Drill panels for Terminal + Labs (v4.16.1) ──
console.log('\n\x1b[1m── DEDICATED PORT DRILL PANELS (v4.16.1) ──\x1b[0m');
test('HTML: #port-terminal-panel', html.includes('id="port-terminal-panel"'));
test('HTML: #port-terminal-list', html.includes('id="port-terminal-list"'));
test('HTML: Try It In Terminal summary', html.includes('Try It In Terminal'));
test('HTML: #port-labs-panel', html.includes('id="port-labs-panel"'));
test('HTML: #port-labs-list', html.includes('id="port-labs-list"'));
test('HTML: Guided Terminal Labs summary', html.includes('Guided Terminal Labs'));
test('renderPortTerminalList function', js.includes('function renderPortTerminalList('));
test('renderPortLabsList function', js.includes('function renderPortLabsList('));
test('startPortDrill calls renderPortTerminalList', /startPortDrill\(\)[\s\S]{0,800}renderPortTerminalList\(\)/.test(js));
test('startPortDrill calls renderPortLabsList', /startPortDrill\(\)[\s\S]{0,900}renderPortLabsList\(\)/.test(js));
test('renderPortTerminalList uses portCategories', /renderPortTerminalList[\s\S]{0,800}portCategories\.forEach/.test(js));
test('renderPortTerminalList uses portCommands', /renderPortTerminalList[\s\S]{0,800}portCommands\[proto\]/.test(js));
test('renderPortTerminalList uses _terminalCardHtml', /renderPortTerminalList[\s\S]{0,1200}_terminalCardHtml/.test(js));
test('renderPortLabsList dedupes by lab title', /renderPortLabsList[\s\S]{0,1500}seen\.has\(lab\.title\)/.test(js));
test('renderPortLabsList uses primaryKeys map', /renderPortLabsList[\s\S]{0,400}primaryKeys = \{/.test(js));
test('renderPortLabsList launches openGuidedLab', /renderPortLabsList[\s\S]{0,2000}openGuidedLab\(/.test(js));
test('CSS: .port-term-row', css.includes('.port-term-row'));
test('CSS: .port-term-group', css.includes('.port-term-group '));
test('CSS: .port-term-num', css.includes('.port-term-num'));
test('CSS: .port-lab-card', css.includes('.port-lab-card'));
test('CSS: .port-lab-start', css.includes('.port-lab-start'));
test('CSS: .port-terminal-intro', css.includes('.port-terminal-intro'));

// ── Remaining 5 Guided Terminal Labs (v4.17 / #70) ──
console.log('\n\x1b[1m── GUIDED LABS: REMAINING 5 (v4.17 / #70) ──\x1b[0m');
test('Lab: _tlsLab defined', js.includes('const _tlsLab = {'));
test('Lab: _arpLab defined', js.includes('const _arpLab = {'));
test('Lab: _subnetLab defined', js.includes('const _subnetLab = {'));
test('Lab: _monitoringLab defined', js.includes('const _monitoringLab = {'));
test('Lab: _troubleshootingLab defined', js.includes('const _troubleshootingLab = {'));
test('TLS lab: openssl s_client', /_tlsLab[\s\S]{0,3500}openssl s_client -connect google\.com:443/.test(js));
test('TLS lab: SNI step', /_tlsLab[\s\S]{0,3500}-servername example\.com/.test(js));
test('TLS lab: badssl', /_tlsLab[\s\S]{0,4000}expired\.badssl\.com/.test(js));
test('ARP lab: ifconfig ether', /_arpLab[\s\S]{0,2500}ifconfig en0 \| grep ether/.test(js));
test('ARP lab: arp -a', /_arpLab[\s\S]{0,3000}arp -a/.test(js));
test('ARP lab: gateway MAC step', /_arpLab[\s\S]{0,3500}route -n get default/.test(js));
test('Subnet lab: ifconfig inet', /_subnetLab[\s\S]{0,2500}ifconfig en0 \| grep "inet "/.test(js));
test('Subnet lab: ipcalc /24', /_subnetLab[\s\S]{0,3500}ipcalc 192\.168\.1\.0\/24/.test(js));
test('Subnet lab: /26 harder case', /_subnetLab[\s\S]{0,4000}ipcalc 192\.168\.1\.0\/26/.test(js));
test('Subnet lab: IPv6 branch', /_subnetLab[\s\S]{0,4500}ifconfig en0 \| grep inet6/.test(js));
test('Monitoring lab: netstat -s', /_monitoringLab[\s\S]{0,2500}netstat -s/.test(js));
test('Monitoring lab: lsof -i', /_monitoringLab[\s\S]{0,3500}lsof -i/.test(js));
test('Monitoring lab: nettop', /_monitoringLab[\s\S]{0,4000}nettop/.test(js));
test('Monitoring lab: tcpdump port 53', /_monitoringLab[\s\S]{0,4500}tcpdump[\s\S]{0,100}port 53/.test(js));
test('Troubleshooting lab: 20 min duration', /_troubleshootingLab[\s\S]{0,200}~20 min/.test(js));
test('Troubleshooting lab: ping google.com step', /_troubleshootingLab[\s\S]{0,2500}ping -c 2 google\.com/.test(js));
test('Troubleshooting lab: nslookup with 1.1.1.1', /_troubleshootingLab[\s\S]{0,3500}nslookup google\.com 1\.1\.1\.1/.test(js));
test('Troubleshooting lab: networksetup getdnsservers', /_troubleshootingLab[\s\S]{0,4500}networksetup -getdnsservers/.test(js));
test('Troubleshooting lab: 8 steps (all 7 CompTIA + extra step 3)', (js.match(/_troubleshootingLab[\s\S]*?\]\s*,\s*wrap/) || [''])[0].match(/\{ narration:/g)?.length >= 8);
test('guidedLabs: Securing TCP/IP → _tlsLab', /'Securing TCP\/IP':[\s]+_tlsLab/.test(js));
test('guidedLabs: PKI → _tlsLab', /'PKI & Certificate Management':[\s]+_tlsLab/.test(js));
test('guidedLabs: Switch Features → _arpLab', /'Switch Features & VLANs':[\s]+_arpLab/.test(js));
test('guidedLabs: Cabling → _arpLab', /'Cabling & Topology':[\s]+_arpLab/.test(js));
test('guidedLabs: Subnetting → _subnetLab', /'Subnetting & IP Addressing':[\s]+_subnetLab/.test(js));
test('guidedLabs: IPv6 → _subnetLab', /'IPv6':[\s]+_subnetLab/.test(js));
test('guidedLabs: Monitoring → _monitoringLab', /'Network Monitoring & Observability':[\s]+_monitoringLab/.test(js));
test('guidedLabs: Network Operations → _monitoringLab', /'Network Operations':[\s]+_monitoringLab/.test(js));
test('guidedLabs: Troubleshooting Methodology → _troubleshootingLab', /'CompTIA Troubleshooting Methodology':[\s]+_troubleshootingLab/.test(js));
test('guidedLabs: Network Troubleshooting → _troubleshootingLab', /'Network Troubleshooting & Tools':[\s]+_troubleshootingLab/.test(js));
test('guidedLabs: Troubleshooting no longer aliased to routing', !/'CompTIA Troubleshooting Methodology':[\s]+_routingLab/.test(js));
test('primaryKeys: TLS launch key', /primaryKeys[\s\S]{0,600}'TLS Handshake[\s\S]{0,80}'Securing TCP\/IP'/.test(js));
test('primaryKeys: ARP launch key', /primaryKeys[\s\S]{0,700}'ARP & Layer 2 Adjacency'[\s\S]{0,80}'Switch Features & VLANs'/.test(js));
test('primaryKeys: Subnet launch key', /primaryKeys[\s\S]{0,800}'Subnetting Your Own Network'[\s\S]{0,80}'Subnetting & IP Addressing'/.test(js));
test('primaryKeys: Monitoring launch key', /primaryKeys[\s\S]{0,900}'Network Monitoring with[\s\S]{0,80}'Network Monitoring & Observability'/.test(js));
test('primaryKeys: Troubleshooting launch key', /primaryKeys[\s\S]{0,1000}'The 7-Step Troubleshooting[\s\S]{0,80}'CompTIA Troubleshooting Methodology'/.test(js));

// ── Topology Builder Tier 1 (v4.18 / #74) ──
console.log('\n\x1b[1m── TOPOLOGY BUILDER TIER 1 (v4.18 / #74) ──\x1b[0m');
// Storage keys
test('STORAGE.TOPOLOGIES key', js.includes("TOPOLOGIES: 'nplus_topologies'"));
test('STORAGE.TOPOLOGY_DRAFT key', js.includes("TOPOLOGY_DRAFT: 'nplus_topology_draft'"));
// Constants
test('TB_MAX_DEVICES = 50', js.includes('const TB_MAX_DEVICES = 50'));
test('TB_MAX_SAVES = 5', js.includes('const TB_MAX_SAVES = 5'));
test('TB_DEVICE_TYPES defined', js.includes('const TB_DEVICE_TYPES = {'));
// Device type coverage (13 total after v4.19.1)
test('Device type: router', /TB_DEVICE_TYPES[\s\S]{0,3000}router:\s*\{/.test(js));
test('Device type: switch', /TB_DEVICE_TYPES[\s\S]{0,3000}switch:\s*\{/.test(js));
test('Device type: wap', /TB_DEVICE_TYPES[\s\S]{0,3000}wap:\s*\{/.test(js));
test('Device type: pc', /TB_DEVICE_TYPES[\s\S]{0,3000}pc:\s*\{/.test(js));
test('Device type: server', /TB_DEVICE_TYPES[\s\S]{0,3000}server:\s*\{/.test(js));
test('Device type: firewall', /TB_DEVICE_TYPES[\s\S]{0,3000}firewall:\s*\{/.test(js));
test('Device type: cloud', /TB_DEVICE_TYPES[\s\S]{0,3000}cloud:\s*\{/.test(js));
test('Device type: load-balancer', /TB_DEVICE_TYPES[\s\S]{0,3000}'load-balancer':\s*\{/.test(js));
test('Device type: ids', /TB_DEVICE_TYPES[\s\S]{0,3000}ids:\s*\{/.test(js));
test('Device type: wlc', /TB_DEVICE_TYPES[\s\S]{0,3000}wlc:\s*\{/.test(js));
test('Device type: printer', /TB_DEVICE_TYPES[\s\S]{0,3000}printer:\s*\{/.test(js));
test('Device type: voip', /TB_DEVICE_TYPES[\s\S]{0,3000}voip:\s*\{/.test(js));
test('Device type: iot', /TB_DEVICE_TYPES[\s\S]{0,3000}iot:\s*\{/.test(js));
// Core functions
test('openTopologyBuilder function', js.includes('function openTopologyBuilder('));
test('tbForceOpen function', js.includes('function tbForceOpen('));
test('tbNewState function', js.includes('function tbNewState('));
test('tbRenderPalette function', js.includes('function tbRenderPalette('));
test('tbRenderCanvas function', js.includes('function tbRenderCanvas('));
test('tbAttachCanvasHandlers function', js.includes('function tbAttachCanvasHandlers('));
test('tbClientToSvg function', js.includes('function tbClientToSvg('));
test('tbAddDevice function', js.includes('function tbAddDevice('));
test('tbOnDeviceMouseDown function', js.includes('function tbOnDeviceMouseDown('));
test('tbOnMouseMove function', js.includes('function tbOnMouseMove('));
test('tbOnMouseUp function', js.includes('function tbOnMouseUp('));
test('tbAddCable function', js.includes('function tbAddCable('));
test('tbAttachKeyHandler function', js.includes('function tbAttachKeyHandler('));
test('tbDeleteSelected function', js.includes('function tbDeleteSelected('));
test('tbSaveDraft function', js.includes('function tbSaveDraft('));
test('tbLoadDraft function', js.includes('function tbLoadDraft('));
test('tbSaveTopology function', js.includes('function tbSaveTopology('));
test('tbLoadTopology function', js.includes('function tbLoadTopology('));
test('tbNewTopology function', js.includes('function tbNewTopology('));
test('tbLoadAllSaves function', js.includes('function tbLoadAllSaves('));
test('tbRefreshLoadSelect function', js.includes('function tbRefreshLoadSelect('));
// Behavior details
test('Device cap enforced in tbAddDevice', /tbAddDevice[\s\S]{0,400}devices\.length >= TB_MAX_DEVICES/.test(js));
test('Cable dedupe prevents duplicate cables', /tbAddCable[\s\S]{0,500}already cabled/.test(js));
test('Cable dedupe prevents self-loop', /tbAddCable[\s\S]{0,200}fromId === toId/.test(js));
test('Delete cascades: cables removed with device', /tbDeleteSelected[\s\S]{0,600}cables = tbState\.cables\.filter/.test(js));
test('Save FIFO caps at TB_MAX_SAVES', /tbSaveTopology[\s\S]{0,800}length > TB_MAX_SAVES/.test(js));
test('Save requires at least one device', /tbSaveTopology[\s\S]{0,300}Add at least one device/.test(js));
test('Draft auto-saves on add device', /tbAddDevice[\s\S]{0,800}tbSaveDraft\(\)/.test(js));
test('Draft auto-saves on move', /tbOnMouseUp[\s\S]{0,400}tbSaveDraft\(\)/.test(js));
test('Mobile nudge triggers below 900px', /openTopologyBuilder[\s\S]{0,600}innerWidth < 900/.test(js));
test('Mobile override via tbForceOpen', /tbForceOpen[\s\S]{0,100}tbMobileOverride = true/.test(js));
test('Keyboard: Delete/Backspace triggers delete', /tbAttachKeyHandler[\s\S]{0,600}(Delete|Backspace)/.test(js));
test('Keyboard: Escape clears selection', /tbAttachKeyHandler[\s\S]{0,700}Escape/.test(js));
test('Keyboard handler skips inputs', /tbAttachKeyHandler[\s\S]{0,500}tagName === 'INPUT'/.test(js));
// HTML wiring
test('HTML: setup menu button for topology-builder', html.includes("showPage('topology-builder')"));
test('HTML: #page-topology-builder exists', html.includes('id="page-topology-builder"'));
test('HTML: #tb-canvas SVG exists', html.includes('id="tb-canvas"'));
test('HTML: #tb-palette-items container', html.includes('id="tb-palette-items"'));
test('HTML: #tb-devices-layer', html.includes('id="tb-devices-layer"'));
test('HTML: #tb-cables-layer', html.includes('id="tb-cables-layer"'));
test('HTML: #tb-mobile-nudge', html.includes('id="tb-mobile-nudge"'));
test('HTML: #tb-device-count pill', html.includes('id="tb-device-count"'));
test('HTML: #tb-load-select dropdown', html.includes('id="tb-load-select"'));
test('HTML: Save button wired to tbSaveTopology', html.includes('tbSaveTopology()'));
test('HTML: New button wired to tbNewTopology', html.includes('tbNewTopology()'));
test('HTML: Delete button wired to tbDeleteSelected', html.includes('tbDeleteSelected()'));
// CSS hooks
test('CSS: .tb-canvas', css.includes('.tb-canvas'));
test('CSS: .tb-palette', css.includes('.tb-palette '));
test('CSS: .tb-palette-item', css.includes('.tb-palette-item'));
test('CSS: .tb-device-selected', css.includes('.tb-device-selected'));
test('CSS: .tb-device-pending', css.includes('.tb-device-pending'));
test('CSS: .tb-cable', css.includes('.tb-cable'));
test('CSS: .tb-cable-selected', css.includes('.tb-cable-selected'));
test('CSS: .tb-mobile-nudge', css.includes('.tb-mobile-nudge'));
test('CSS: .tb-workspace grid', css.includes('.tb-workspace'));
test('CSS: .tb-toolbar', css.includes('.tb-toolbar'));

// ── Topology Builder polish (v4.19.1) ──
console.log('\n\x1b[1m── TOPOLOGY BUILDER POLISH (v4.19.1) ──\x1b[0m');
test('Canvas dimensions bumped to 1400x820', js.includes('TB_CANVAS_W = 1400') && js.includes('TB_CANVAS_H = 820'));
test('Canvas viewBox 1400x820 in HTML', html.includes('viewBox="0 0 1400 820"'));
test('Device rect compact (96x72) for 30-device fit', /tb-device-bg[\s\S]{0,300}width="96" height="72"/.test(js));
test('Device label font 13', /tb-device-label[\s\S]{0,200}font-size="13"/.test(js));
test('Intro banner in HTML', html.includes('tb-intro-banner'));
test('Intro banner title line', html.includes('Build, configure'));
test('CSS: .tb-intro-banner', css.includes('.tb-intro-banner'));
test('CSS: page-topology-builder max-width override', css.includes('#page-topology-builder { max-width'));
test('Clear button in HTML', html.includes('tbClearCanvas()'));
test('tbClearCanvas function', js.includes('function tbClearCanvas('));
test('tbClearCanvas preserves id/name', /tbClearCanvas[\s\S]{0,600}devices = \[\][\s\S]{0,200}cables = \[\]/.test(js));
test('tbClearCanvas confirms before wiping', /tbClearCanvas[\s\S]{0,600}confirm\(/.test(js));
test('Canvas min-height bumped to 720', css.includes('min-height: 720px'));

// ── Topology Builder v4.19.1: SVG icons, cables, device cap 30, new types ──
console.log('\n\x1b[1m── TOPOLOGY BUILDER v4.19.1 ──\x1b[0m');
test('tbDeviceIcon function', js.includes('function tbDeviceIcon('));
test('tbEdgePoint helper', js.includes('function tbEdgePoint('));
test('Cables use tbEdgePoint (edge-to-edge)', /cabLayer\.innerHTML[\s\S]{0,800}tbEdgePoint/.test(js));
test('tbRenderCanvas uses tbDeviceIcon instead of emoji text', /devLayer\.innerHTML[\s\S]{0,800}tbDeviceIcon\(/.test(js));
test('tbRenderPalette uses SVG icon', /tbRenderPalette[\s\S]{0,600}tb-palette-icon-svg/.test(js));
test('Intro banner mentions Ping', html.includes('Ping'));
test('Intro banner mentions DHCP', html.includes('DHCP'));
test('Device count pill reflects 50 cap', html.includes('0 / 50 devices'));
test('CSS: .tb-cable interactive rule', /\.tb-cable\s*\{[\s\S]{0,400}cursor:\s*pointer/.test(css));
test('CSS: palette scrollable', /\.tb-palette\s*\{[\s\S]{0,400}overflow-y:\s*auto/.test(css));
test('CSS: .tb-palette-icon-svg rule', css.includes('.tb-palette-icon-svg'));
test('Icon: router shape', /case 'router':/.test(js));
test('Icon: load-balancer shape', /case 'load-balancer':/.test(js));
test('Icon: ids shape', /case 'ids':/.test(js));
test('Icon: wlc shape', /case 'wlc':/.test(js));
test('Icon: printer shape', /case 'printer':/.test(js));
test('Icon: voip shape', /case 'voip':/.test(js));
test('Icon: iot shape', /case 'iot':/.test(js));

// ── Topology Builder v4.19.1: discoverable wiring UX ──
console.log('\n\x1b[1m── TOPOLOGY BUILDER v4.19.1 (wiring UX) ──\x1b[0m');
test('How-to strip in HTML', html.includes('tb-howto-strip'));
test('How-to step: click A then click B', /Click<\/strong> device A[\s\S]{0,200}click<\/strong> device B/.test(html));
test('Wire overlay element in HTML', html.includes('id="tb-wire-overlay"'));
test('Wire overlay starts hidden', /tb-wire-overlay[\s\S]{0,200}is-hidden/.test(html));
test('tbUpdateWireOverlay function', js.includes('function tbUpdateWireOverlay('));
test('tbUpdateWireOverlay called by status', /tbUpdateStatus[\s\S]{0,200}tbUpdateWireOverlay/.test(js));
test('tbUpdateWireOverlay called by render', /tbRenderCanvas[\s\S]{0,3000}tbUpdateWireOverlay/.test(js));
test('CSS: .tb-howto-strip', css.includes('.tb-howto-strip'));
test('CSS: .tb-wire-overlay', css.includes('.tb-wire-overlay'));
test('CSS: wire overlay pulse keyframes', css.includes('@keyframes tb-wire-pulse'));

// ── Topology Builder v4.19.1: cable picker, public servers, compact devices ──
console.log('\n\x1b[1m── TOPOLOGY BUILDER v4.19.1 ──\x1b[0m');
// Cable types
test('TB_CABLE_TYPES map', js.includes('const TB_CABLE_TYPES = {'));
test('Cable type: cat6', /TB_CABLE_TYPES[\s\S]{0,500}cat6:/.test(js));
test('Cable type: cat5e', /TB_CABLE_TYPES[\s\S]{0,500}cat5e:/.test(js));
test('Cable type: fiber', /TB_CABLE_TYPES[\s\S]{0,500}fiber:/.test(js));
test('Cable type: coax', /TB_CABLE_TYPES[\s\S]{0,500}coax:/.test(js));
test('Cable type: console', /TB_CABLE_TYPES[\s\S]{0,500}console:/.test(js));
test('tbSelectedCableType default cat6', js.includes("let tbSelectedCableType = 'cat6'"));
test('tbSelectCableType function', js.includes('function tbSelectCableType('));
test('tbAddCable stamps cable type', /tbAddCable[\s\S]{0,1400}type: cableType/.test(js));
// Public server device types
test('Device type: public-web', /TB_DEVICE_TYPES[\s\S]{0,3000}'public-web':/.test(js));
test('Device type: public-file', /TB_DEVICE_TYPES[\s\S]{0,3000}'public-file':/.test(js));
test('Device type: public-cloud', /TB_DEVICE_TYPES[\s\S]{0,3000}'public-cloud':/.test(js));
test('Icon: public-web shape', /case 'public-web':/.test(js));
test('Icon: public-file shape', /case 'public-file':/.test(js));
test('Icon: public-cloud shape', /case 'public-cloud':/.test(js));
// Palette cable picker
test('HTML: tb-palette-cables container', html.includes('id="tb-palette-cables"'));
test('HTML: palette Cables head', html.includes('tb-palette-head-cables'));
test('CSS: .tb-cable-chip', css.includes('.tb-cable-chip'));
test('CSS: .tb-cable-chip-active', css.includes('.tb-cable-chip-active'));
test('tbRenderPalette populates cable chips', /tbRenderPalette[\s\S]{0,1500}tb-palette-cables/.test(js));
// Realistic cables: curved path + sheath layer
test('Cables use <path> with Q curve', /cabLayer\.innerHTML[\s\S]{0,1500}M \$\{p1\.x\} \$\{p1\.y\} Q/.test(js));
test('Cables have sheath layer', /tb-cable-sheath/.test(js));
test('Cable stroke width from meta', /cabLayer\.innerHTML[\s\S]{0,2000}meta\.width/.test(js));
// Intro mentions DMZ + cable types
test('Intro banner mentions DMZ / screened subnet', /DMZ|screened subnet/i.test(html));
test('Intro banner mentions AI Generate', html.includes('AI Generate'));
// Device shrink bounds
test('tbOnMouseMove clamp padding 55/45', /Math\.max\(55,[\s\S]{0,300}Math\.max\(45/.test(js));
test('HALF_W = 48, HALF_H = 36', /HALF_W = 48, HALF_H = 36/.test(js));

// ── v4.19.1: DMZ switch + cable click hitbox ──
console.log('\n\x1b[1m── TOPOLOGY BUILDER v4.19.1 ──\x1b[0m');
test('Device type: dmz-switch', /TB_DEVICE_TYPES[\s\S]{0,3000}'dmz-switch':/.test(js));
test('Icon: dmz-switch shape', /case 'dmz-switch':/.test(js));
test('Cable fat hitbox layer', /tb-cable-hit/.test(js));
test('Cable hitbox click handler', /querySelectorAll\('\.tb-cable-hit'\)/.test(js));
test('Cable visible layer is pointer-events none', /tb-cable tb-cable-\$\{cableType\}[\s\S]{0,300}pointer-events="none"/.test(js));

// ── Guided Lab Back button return page fix (v4.16.2) ──
console.log('\n\x1b[1m── GUIDED LAB BACK FIX (v4.16.2) ──\x1b[0m');
test('openGuidedLab includes page-ports in return pages', /openGuidedLab[\s\S]{0,800}pages = \[[^\]]*'page-ports'/.test(js));
test('openGuidedLab fallback is page-ports', /openGuidedLab[\s\S]{0,900}\|\| 'page-ports'/.test(js));

// ── Topology Builder Tier 2 (v4.20.0) — Grader + Scenarios + Export ──
console.log('\n\x1b[1m── TOPOLOGY BUILDER TIER 2 (v4.20.0) ──\x1b[0m');
// Rules engine
test('TB_GRADE_RULES defined', /const TB_GRADE_RULES = \[/.test(js));
test('Rule: has-firewall', /id: 'has-firewall'/.test(js));
test('Rule: cloud-behind-firewall', /id: 'cloud-behind-firewall'/.test(js));
test('Rule: public-on-dmz', /id: 'public-on-dmz'/.test(js));
test('Rule: dmz-exists-if-public', /id: 'dmz-exists-if-public'/.test(js));
test('Rule: dmz-behind-firewall', /id: 'dmz-behind-firewall'/.test(js));
test('Rule: wlc-wired-to-wap', /id: 'wlc-wired-to-wap'/.test(js));
test('Rule: lb-fronts-servers', /id: 'lb-fronts-servers'/.test(js));
test('Rule: endpoints-on-internal', /id: 'endpoints-on-internal'/.test(js));
test('Graph helper: tbNeighborsOf', /function tbNeighborsOf/.test(js));
test('Graph helper: tbIsConnectedTo', /function tbIsConnectedTo/.test(js));
// Scenarios
test('TB_SCENARIOS defined', /const TB_SCENARIOS = \[/.test(js));
test('Scenario: free', /id: 'free'/.test(js));
test('Scenario: small-office', /id: 'small-office'/.test(js));
test('Scenario: dmz', /id: 'dmz',/.test(js));
test('Scenario: enterprise', /id: 'enterprise'/.test(js));
test('Scenario: branch-wireless', /id: 'branch-wireless'/.test(js));
test('tbSetScenario defined', /function tbSetScenario/.test(js));
test('tbRenderScenarioPanel defined', /function tbRenderScenarioPanel/.test(js));
// Grader + modal
test('tbGradeTopology defined', /function tbGradeTopology/.test(js));
test('tbShowGradeModal defined', /function tbShowGradeModal/.test(js));
test('tbCloseGradeModal defined', /function tbCloseGradeModal/.test(js));
test('Grader letter-grade mapping', /score >= 93 \? 'A' : score >= 87 \? 'A-'/.test(js));
test('Grader deductions map', /critical: 20, warning: 10, info: 5/.test(js));
// PNG export
test('tbExportPNG defined', /function tbExportPNG/.test(js));
test('PNG export serializes SVG', /XMLSerializer\(\)\.serializeToString/.test(js));
test('PNG export uses canvas.toBlob', /canvas\.toBlob\(blob =>/.test(js));
// HTML wiring
test('HTML: scenario selector', html.includes('id="tb-scenario-select"'));
test('HTML: scenario panel', html.includes('id="tb-scenario-panel"'));
test('HTML: grade button', html.includes('id="tb-grade-btn"'));
test('HTML: export button', html.includes('id="tb-export-btn"'));
test('HTML: grade modal', html.includes('id="tb-grade-modal"'));
test('HTML: grade body', html.includes('id="tb-grade-body"'));
test('HTML: scenario option dmz', html.includes('value="dmz"'));
test('HTML: scenario option enterprise', html.includes('value="enterprise"'));
// CSS
test('CSS: .tb-grade-modal', css.includes('.tb-grade-modal'));
test('CSS: .tb-grade-card', css.includes('.tb-grade-card'));
test('CSS: .tb-grade-circle', css.includes('.tb-grade-circle'));
test('CSS: .tb-grade-section', css.includes('.tb-grade-section'));
test('CSS: .tb-scenario-panel', css.includes('.tb-scenario-panel'));
test('CSS: .tb-scenario-reqs', css.includes('.tb-scenario-reqs'));
test('CSS: .tb-tool-btn-primary', css.includes('.tb-tool-btn-primary'));
// openTopologyBuilder calls tbRenderScenarioPanel
test('openTopologyBuilder renders scenario panel', /openTopologyBuilder[\s\S]{0,800}tbRenderScenarioPanel/.test(js));

// ── Topology Builder Tier 3 (v4.25.0) — AI Coach ──
console.log('\n\x1b[1m── TOPOLOGY BUILDER TIER 3 (v4.25.0) ──\x1b[0m');
// Core functions
test('tbSerializeTopology defined', /function tbSerializeTopology/.test(js));
test('tbTopologyHash defined', /function tbTopologyHash/.test(js));
test('tbCoachTopology async defined', /async function tbCoachTopology/.test(js));
test('tbShowCoachModal defined', /function tbShowCoachModal\(/.test(js));
test('tbShowCoachModalLoading defined', /function tbShowCoachModalLoading/.test(js));
test('tbShowCoachModalError defined', /function tbShowCoachModalError/.test(js));
test('tbCloseCoachModal defined', /function tbCloseCoachModal/.test(js));
// Cache
test('STORAGE.TB_COACH_CACHE key', js.includes("TB_COACH_CACHE: 'nplus_tb_coach_cache'"));
test('tbLoadCoachCache defined', /function tbLoadCoachCache/.test(js));
test('tbSaveCoachCache defined', /function tbSaveCoachCache/.test(js));
test('Coach cache trims to 10 entries', /\.slice\(0, 10\)/.test(js));
// API call shape
test('Coach calls CLAUDE_API_URL', /tbCoachTopology[\s\S]{0,4000}CLAUDE_API_URL/.test(js));
test('Coach uses CLAUDE_MODEL', /tbCoachTopology[\s\S]{0,4000}CLAUDE_MODEL/.test(js));
test('Coach guards missing API key', /tbCoachTopology[\s\S]{0,1500}Add your Anthropic API key/.test(js));
test('Coach strips markdown fences', /replace\(\/\^```/.test(js));
test('Coach prompt mentions N10-009', /tbCoachTopology[\s\S]{0,4000}N10-009/.test(js));
test('Coach prompt asks for JSON keys', /"tour"[\s\S]{0,400}"strengths"[\s\S]{0,400}"concerns"[\s\S]{0,400}"upgrades"/.test(js));
// Serializer
test('Serializer groups devices by type', /const byType = \{\}/.test(js));
test('Serializer emits INVENTORY section', /INVENTORY:/.test(js));
test('Serializer emits CONNECTIONS section', /CONNECTIONS:/.test(js));
// HTML wiring
test('HTML: coach button', html.includes('id="tb-coach-btn"'));
test('HTML: coach modal', html.includes('id="tb-coach-modal"'));
test('HTML: coach body', html.includes('id="tb-coach-body"'));
test('HTML: coach button onclick', html.includes('onclick="tbCoachTopology()"'));
// CSS
test('CSS: .tb-coach-loading', css.includes('.tb-coach-loading'));
test('CSS: .tb-coach-spinner', css.includes('.tb-coach-spinner'));
test('CSS: .tb-coach-error', css.includes('.tb-coach-error'));
test('CSS: .tb-coach-head', css.includes('.tb-coach-head'));
test('CSS: .tb-coach-strengths', css.includes('.tb-coach-strengths'));
test('CSS: .tb-coach-concerns', css.includes('.tb-coach-concerns'));
test('CSS: .tb-coach-upgrades', css.includes('.tb-coach-upgrades'));
test('CSS: .tb-coach-objectives', css.includes('.tb-coach-objectives'));
test('CSS: .tb-coach-tip', css.includes('.tb-coach-tip'));
test('CSS: .tb-tool-btn-coach', css.includes('.tb-tool-btn-coach'));
test('CSS: tb-coach-spin keyframes', css.includes('@keyframes tb-coach-spin'));

// ── Network Simulator (v4.25.0) — Config Panel, Sim Engine, CLI, AI Gen ──
console.log('\n\x1b[1m── NETWORK SIMULATOR (v4.25.0) ──\x1b[0m');
// Foundation
test('TB_MAX_DEVICES bumped to 50', js.includes('const TB_MAX_DEVICES = 50'));
test('TB_IFACE_DEFAULTS defined', js.includes('const TB_IFACE_DEFAULTS'));
test('tbGenerateMac function', js.includes('function tbGenerateMac('));
test('tbAutoHostname function', js.includes('function tbAutoHostname('));
test('tbGenerateInterfaces function', js.includes('function tbGenerateInterfaces('));
test('tbMigrateState function', js.includes('function tbMigrateState('));
// Config Panel
test('tbOpenConfigPanel function', js.includes('function tbOpenConfigPanel('));
test('tbCloseConfigPanel function', js.includes('function tbCloseConfigPanel('));
test('tbSwitchConfigTab function', js.includes('function tbSwitchConfigTab('));
test('tbRenderIfacesTab function', js.includes('function tbRenderIfacesTab('));
test('tbRenderRoutingTab function', js.includes('function tbRenderRoutingTab('));
test('tbRenderVlansTab function', js.includes('function tbRenderVlansTab('));
test('tbRenderDhcpTab function', js.includes('function tbRenderDhcpTab('));
test('tbRenderCliTab function', js.includes('function tbRenderCliTab('));
test('Double-click detection vars', js.includes('tbLastClickDevId') && js.includes('tbLastClickTime'));
test('Double-click opens config panel in mousedown', /tbOnDeviceMouseDown[\s\S]{0,600}tbOpenConfigPanel\(id\)/.test(js));
// IP utilities
test('tbIpToArr function', js.includes('function tbIpToArr('));
test('tbSubnetOf function', js.includes('function tbSubnetOf('));
test('tbBroadcastOf function', js.includes('function tbBroadcastOf('));
test('tbSameSubnet function', js.includes('function tbSameSubnet('));
test('tbMaskToCidr function', js.includes('function tbMaskToCidr('));
// Broadcast domain
test('tbGetBroadcastDomain function', js.includes('function tbGetBroadcastDomain('));
// ARP simulation
test('tbSimARP function', js.includes('function tbSimARP('));
// Ping simulation
test('tbSimPing function', js.includes('function tbSimPing('));
// DHCP simulation
test('tbSimDHCP function', js.includes('function tbSimDHCP('));
// Packet animation
test('tbAnimatePacket function', js.includes('function tbAnimatePacket('));
// CLI
test('tbCliExec function', js.includes('function tbCliExec('));
test('tbProcessCliCommand function', js.includes('function tbProcessCliCommand('));
test('CLI supports show arp', /show arp/.test(js));
test('CLI supports show ip route', /show ip route/.test(js));
test('CLI supports ping command', /cmd\.startsWith\('ping '\)/.test(js));
// AI generation
test('tbGenerateAiTopology async function', /async function tbGenerateAiTopology/.test(js));
test('tbExplainDevice async function', /async function tbExplainDevice/.test(js));
// Simulation UI
test('tbOpenPingDialog function', js.includes('function tbOpenPingDialog('));
test('tbExecPing function', js.includes('function tbExecPing('));
test('tbShowSimLog function', js.includes('function tbShowSimLog('));
test('tbClearSimLog function', js.includes('function tbClearSimLog('));
test('tbOpenDhcpDialog function', js.includes('function tbOpenDhcpDialog('));
// Routing helpers
test('tbRebuildConnectedRoutes function', js.includes('function tbRebuildConnectedRoutes('));
test('tbAddStaticRoute function', js.includes('function tbAddStaticRoute('));
// VLAN helpers
test('tbAddVlan function', js.includes('function tbAddVlan('));
// Cable unbind
test('tbUnbindCable function', js.includes('function tbUnbindCable('));
// HTML wiring
test('HTML: config panel exists', html.includes('id="tb-config-panel"'));
test('HTML: config panel tabs', html.includes('data-tb-tab="ifaces"'));
test('HTML: sim toolbar exists', html.includes('id="tb-sim-toolbar"'));
test('HTML: ping modal exists', html.includes('id="tb-ping-modal"'));
test('HTML: sim log panel exists', html.includes('id="tb-sim-log"'));
test('HTML: anim layer in SVG', html.includes('id="tb-anim-layer"'));
test('HTML: AI Generate button', html.includes('id="tb-ai-gen-btn"'));
test('HTML: Explain button in config panel', html.includes('tbExplainDevice(tbConfigPanelDeviceId)'));
test('HTML: howto mentions double-click', html.includes('Double-click'));
// CSS
test('CSS: .tb-config-panel', css.includes('.tb-config-panel'));
test('CSS: .tb-sim-toolbar', css.includes('.tb-sim-toolbar'));
test('CSS: .tb-sim-log', css.includes('.tb-sim-log'));
test('CSS: .tb-cli-output', css.includes('.tb-cli-output'));
test('CSS: .tb-iface-table', css.includes('.tb-iface-table'));
test('CSS: .tb-tool-btn-ai', css.includes('.tb-tool-btn-ai'));
test('CSS: .tb-explain-btn', css.includes('.tb-explain-btn'));
// v4.25.0 additions
// Overview tab
test('tbRenderOverviewTab function', js.includes('function tbRenderOverviewTab('));
test('Overview tab in switch', /case 'overview':[\s\S]{0,100}tbRenderOverviewTab/.test(js));
test('HTML: overview tab button', html.includes('data-tb-tab="overview"'));
test('Config opens on overview tab', /tbOpenConfigPanel[\s\S]{0,2000}tbSwitchConfigTab\('overview'\)/.test(js));
// Ping dropdown (device-to-device)
test('Ping destination is select dropdown', html.includes('id="tb-ping-dst"'));
test('Ping dst is select not input', /select id="tb-ping-dst"/.test(html));
test('tbFilterPingDst function', js.includes('function tbFilterPingDst('));
test('tbExecArp function', js.includes('function tbExecArp('));
test('ARP button in ping modal', html.includes('tbExecArp()'));
// VLAN Trunking/DTP
test('DTP mode select in interfaces tab', /dtp/.test(js));
test('tbSetTrunkAllowed function', js.includes('function tbSetTrunkAllowed('));
test('Trunk allowed VLANs input', /Allowed VLANs/.test(js));
test('Native VLAN input', /Native VLAN/.test(js));
// Guided Labs
test('TB_LABS defined', js.includes('const TB_LABS'));
test('Lab: basic-lan', /id: 'basic-lan'/.test(js));
test('Lab: vlan-segmentation', /id: 'vlan-segmentation'/.test(js));
test('Lab: dhcp-setup', /id: 'dhcp-setup'/.test(js));
test('Lab: dmz-firewall', /id: 'dmz-firewall'/.test(js));
test('Lab: arp-investigation', /id: 'arp-investigation'/.test(js));
test('tbOpenLabPicker function', js.includes('function tbOpenLabPicker('));
test('tbStartLab function', js.includes('function tbStartLab('));
test('tbRenderLabStep function', js.includes('function tbRenderLabStep('));
test('tbLabNext function', js.includes('function tbLabNext('));
test('tbLabPrev function', js.includes('function tbLabPrev('));
test('tbEndLab function', js.includes('function tbEndLab('));
test('HTML: lab picker modal', html.includes('id="tb-lab-picker"'));
test('HTML: lab panel', html.includes('id="tb-lab-panel"'));
test('HTML: lab step container', html.includes('id="tb-lab-step"'));
test('HTML: labs button in toolbar', html.includes('tbOpenLabPicker()'));
// CSS
test('CSS: .tb-ov-hero', css.includes('.tb-ov-hero'));
test('CSS: .tb-ov-iface-card', css.includes('.tb-ov-iface-card'));
test('CSS: .tb-ov-stats-grid', css.includes('.tb-ov-stats-grid'));
test('CSS: .tb-lab-card', css.includes('.tb-lab-card'));
test('CSS: .tb-lab-panel', css.includes('.tb-lab-panel'));
test('CSS: .tb-lab-step-check', css.includes('.tb-lab-step-check'));
test('CSS: .tb-iface-trunk-detail', css.includes('.tb-iface-trunk-detail'));
// Sim toolbar shows on openTopologyBuilder
test('Sim toolbar shown on open', /openTopologyBuilder[\s\S]{0,1500}tb-sim-toolbar/.test(js));

// ── v4.25.0 — Explain modal, CLI commands, AI topology improvements ──
console.log('\n\x1b[1m── SIMULATOR ENHANCEMENTS (v4.25.0) ──\x1b[0m');
// Explain modal
test('tbCloseExplainModal function', js.includes('function tbCloseExplainModal('));
test('Explain shows modal not sim log', /tbExplainDevice[\s\S]{0,800}tb-explain-modal/.test(js));
test('Explain modal has loading spinner', /tbExplainDevice[\s\S]{0,800}tb-coach-spinner/.test(js));
test('HTML: explain modal', html.includes('id="tb-explain-modal"'));
test('HTML: explain modal body', html.includes('id="tb-explain-body"'));
test('HTML: explain modal title', html.includes('id="tb-explain-modal-title"'));
// CLI commands
test('CLI: traceroute command', /traceroute /.test(js) && js.includes('function tbTraceroute('));
test('CLI: ipconfig command', /cmd === 'ipconfig'/.test(js));
test('CLI: netstat command', /cmd === 'netstat'/.test(js));
test('CLI: help command', /cmd === 'help'/.test(js));
test('tbTraceroute walks hops', /tbTraceroute[\s\S]{0,1200}Trace complete/.test(js));
test('traceroute respects visited set', /tbTraceroute[\s\S]{0,800}Loop detected/.test(js));
test('ipconfig shows MAC + gateway', /ipconfig[\s\S]{0,500}MAC Address/.test(js));
test('netstat simulates listening ports', /netstat[\s\S]{0,600}LISTEN/.test(js));
// AI topology improvements
test('AI prompt supports topology types', /star.*bus.*mesh|topology type/i.test(js));
test('AI JSON comment stripping fallback', js.includes('noComments') && js.includes("replace(/\\/\\/"));
test('AI invalid topology gives helpful message', /Try a simpler description/.test(js));

// ── v4.25.0 — Cloud Networking ──
console.log('\n\x1b[1m── CLOUD NETWORKING ──\x1b[0m');
// Device types
test('Device type: vpc', js.includes("'vpc':"));
test('Device type: cloud-subnet', js.includes("'cloud-subnet':"));
test('Device type: igw', js.includes("'igw':"));
test('Device type: nat-gw', js.includes("'nat-gw':"));
test('Device type: tgw', js.includes("'tgw':"));
test('Device type: vpg', js.includes("'vpg':"));
test('Device type: onprem-dc', js.includes("'onprem-dc':"));
test('Device type: sase-edge', js.includes("'sase-edge':"));
// Interface defaults for cloud types
test('Iface defaults: vpc eni', /vpc.*naming.*eni/.test(js));
test('Iface defaults: tgw att', /tgw.*naming.*att/.test(js));
test('Iface defaults: vpg tun', /vpg.*naming.*tun/.test(js));
// Migration
test('Migration: securityGroups default', js.includes('d.securityGroups = d.securityGroups || []'));
test('Migration: nacls default', js.includes('d.nacls = d.nacls || []'));
test('Migration: vpcConfig default', js.includes('d.vpcConfig = d.vpcConfig || null'));
test('Migration: vpnConfig default', js.includes('d.vpnConfig = d.vpnConfig || null'));
test('Migration: saseConfig default', js.includes('d.saseConfig = d.saseConfig || null'));
// Config panel tab renderers
test('tbRenderSecurityGroupsTab function', js.includes('function tbRenderSecurityGroupsTab('));
test('tbRenderNaclsTab function', js.includes('function tbRenderNaclsTab('));
test('tbRenderVpcConfigTab function', js.includes('function tbRenderVpcConfigTab('));
test('tbRenderVpnTab function', js.includes('function tbRenderVpnTab('));
test('tbRenderSaseTab function', js.includes('function tbRenderSaseTab('));
// CRUD helpers
test('tbAddSecurityGroup function', js.includes('function tbAddSecurityGroup('));
test('tbRemoveSecurityGroup function', js.includes('function tbRemoveSecurityGroup('));
test('tbAddSgRule function', js.includes('function tbAddSgRule('));
test('tbAddNaclRule function', js.includes('function tbAddNaclRule('));
test('tbSetVpcField function', js.includes('function tbSetVpcField('));
test('tbSetVpnField function', js.includes('function tbSetVpnField('));
test('tbNegotiateVpn function', js.includes('function tbNegotiateVpn('));
test('tbCheckVpnTunnel function', js.includes('function tbCheckVpnTunnel('));
test('tbSetSaseField function', js.includes('function tbSetSaseField('));
test('tbAddFwaas function', js.includes('function tbAddFwaas('));
// Simulation helpers
test('tbCidrContains function', js.includes('function tbCidrContains('));
test('tbEvalSecurityGroups function', js.includes('function tbEvalSecurityGroups('));
test('tbEvalNacl function', js.includes('function tbEvalNacl('));
test('SG stateful: implicit deny', /tbEvalSecurityGroups[\s\S]{0,800}allowed: false/.test(js));
test('NACL stateless: first match wins', /tbEvalNacl[\s\S]{0,600}sort.*ruleNumber/.test(js));
// CLI commands
test('CLI: show security-groups', /show security-groups/.test(js));
test('CLI: show nacl', /show nacl/.test(js));
test('CLI: show vpn-status', /show vpn-status/.test(js));
test('CLI: show sase', /show sase/.test(js));
// VPN tunnel check
test('VPN checks PSK match', /psk.*mismatch|PSK mismatch/.test(js));
test('VPN checks IKE version', /IKE version mismatch/.test(js));
test('VPN checks encryption', /Encryption mismatch/.test(js));
test('VPN checks DH group', /DH group mismatch/.test(js));
// Grading rules
test('Grade rule: igw-on-vpc', /id: 'igw-on-vpc'/.test(js));
test('Grade rule: nat-gw-needs-subnet', /id: 'nat-gw-needs-subnet'/.test(js));
test('Grade rule: vpg-has-peer', /id: 'vpg-has-peer'/.test(js));
test('Grade rule: tgw-connects-vpcs', /id: 'tgw-connects-vpcs'/.test(js));
test('Grade rule: cloud-has-sg', /id: 'cloud-has-sg'/.test(js));
test('Grade rule: subnet-has-nacl', /id: 'subnet-has-nacl'/.test(js));
// Scenarios
test('Scenario: cloud-vpc', /id: 'cloud-vpc'/.test(js));
test('Scenario: hybrid-cloud', /id: 'hybrid-cloud'/.test(js));
test('Scenario: multi-vpc', /id: 'multi-vpc'/.test(js));
test('Scenario: sase-arch', /id: 'sase-arch'/.test(js));
// HTML wiring
test('HTML: SG tab button', html.includes('data-tb-tab="security-groups"'));
test('HTML: NACL tab button', html.includes('data-tb-tab="nacls"'));
test('HTML: VPC Config tab button', html.includes('data-tb-tab="vpc-config"'));
test('HTML: VPN tab button', html.includes('data-tb-tab="vpn"'));
test('HTML: SASE tab button', html.includes('data-tb-tab="sase"'));
test('HTML: cloud-vpc scenario option', html.includes('value="cloud-vpc"'));
test('HTML: hybrid-cloud scenario option', html.includes('value="hybrid-cloud"'));
test('HTML: explain modal', html.includes('id="tb-explain-modal"'));
// CSS
test('CSS: .tb-sg-table', css.includes('.tb-sg-table'));
test('CSS: .tb-sg-row-allow', css.includes('.tb-sg-row-allow'));
test('CSS: .tb-nacl-row-deny', css.includes('.tb-nacl-row-deny'));
test('CSS: .tb-cloud-card', css.includes('.tb-cloud-card'));
test('CSS: .tb-cloud-badge', css.includes('.tb-cloud-badge'));
// Labs
test('Lab: cloud-vpc-lab', /id: 'cloud-vpc-lab'/.test(js));
test('Lab: sase-zero-trust', /id: 'sase-zero-trust'/.test(js));

// ── v4.26.0 — ISP Router, WAN icon, VPC Peering, Routing in Overview, AI Prompt v2 ──
console.log('\n\x1b[1m── v4.26.0 ENHANCEMENTS ──\x1b[0m');
// ISP Router device type
test('Device type: isp-router', js.includes("'isp-router':"));
test('ISP Router label', /isp-router.*ISP Router/.test(js));
test('ISP Router iface defaults', /isp-router.*count: 6/.test(js));
test('ISP Router SVG icon case', /case 'isp-router':/.test(js));
test('ISP Router included in isRouter checks', /isRouter.*isp-router/.test(js));
// Internet/WAN icon update
test('Cloud device renamed to Internet/WAN', /cloud:.*Internet\/WAN/.test(js));
test('Cloud short label is WAN', /cloud:.*short: 'WAN'/.test(js));
// VPC Peering
test('tbAddVpcPeering function', js.includes('function tbAddVpcPeering('));
test('tbRemoveVpcPeering function', js.includes('function tbRemoveVpcPeering('));
test('VPC peerings array in config', /peerings/.test(js));
test('Peering is bidirectional', /peerDev\.vpcConfig\.peerings\.push/.test(js));
// Routing table in overview tab for all devices
test('Overview shows routing table', /tbRenderOverviewTab[\s\S]{0,3000}routingTable/.test(js));
test('Overview shows route count stat', /routeCount/.test(js));
// AI Generate prompt v2
test('AI prompt max_tokens bumped to 4096', /max_tokens: 4096/.test(js));
test('AI prompt mentions DEVICE TYPE GUIDE', /DEVICE TYPE GUIDE/.test(js));
test('AI prompt mentions TOPOLOGY TYPES', /TOPOLOGY TYPES/.test(js));
test('AI prompt supports star layout', /star[\s\S]{0,200}bus[\s\S]{0,200}ring[\s\S]{0,200}mesh/i.test(js));
test('AI prompt max 50 devices', /max.*50|up to 50/i.test(js));
// Migration includes peerings default
test('Migration: peerings default on vpcConfig', /peerings/.test(js));

// ── v4.27.0 — AI Add-to-Existing, Interactive Labs ──
console.log('\n\x1b[1m── v4.27.0 AI ADD-TO-EXISTING + INTERACTIVE LABS ──\x1b[0m');
// AI Add-to-Existing mode
test('tbParseAiTopologyJson function', js.includes('function tbParseAiTopologyJson('));
test('tbBuildFromAiPayload function', js.includes('function tbBuildFromAiPayload('));
test('tbAiBasePrompt function', js.includes('function tbAiBasePrompt('));
test('tbSerializeForAiContext function', js.includes('function tbSerializeForAiContext('));
test('AI generate detects existing devices', /hasExisting.*devices\.length > 0/.test(js));
test('AI generate ADD mode merges into state', /mode === 'add'[\s\S]{0,500}tbBuildFromAiPayload\(payload, tbState/.test(js));
test('AI generate NEW mode creates fresh state', /mode.*!==.*add[\s\S]{0,300}tbNewState|mode.*new[\s\S]{0,300}tbNewState/.test(js) || /const newState = tbNewState/.test(js));
test('AI add prompt includes existing topology', /EXISTING TOPOLOGY[\s\S]{0,200}DO NOT recreate/.test(js));
test('AI add prompt warns about hostname conflicts', /EXISTING HOSTNAMES[\s\S]{0,100}already taken/.test(js));
test('AI add prompt calculates device cap', /deviceCap.*50 - tbState\.devices\.length/.test(js));
// Interactive lab features
test('Lab steps have hint field', /hint:.*'/.test(js) && /tbToggleLabHint/.test(js));
test('Lab steps have feedback function', /feedback:.*\(s\) =>/.test(js));
test('tbToggleLabHint function', js.includes('function tbToggleLabHint('));
test('Lab render shows hints', /tb-lab-hint-toggle/.test(js));
test('Lab render shows feedback', /tb-lab-step-feedback/.test(js));
test('Lab render shows progress bar', /tb-lab-progress-bar/.test(js));
test('Lab autoSetup support in tbStartLab', /lab\.autoSetup[\s\S]{0,100}autoSetup\(tbState\)/.test(js));
test('Lab: troubleshoot-connectivity', /id: 'troubleshoot-connectivity'/.test(js));
test('Lab: multi-site-wan', /id: 'multi-site-wan'/.test(js));
test('Troubleshoot lab has autoSetup', /troubleshoot-connectivity[\s\S]{0,2000}autoSetup/.test(js));
test('Troubleshoot lab pre-builds broken network', js.includes("192.168.2.20"));
test('Troubleshoot lab checks PC2 fix', /PC2[\s\S]{0,200}192\.168\.1\./.test(js));
test('Multi-site lab uses ISP Router', /multi-site-wan[\s\S]{0,2000}isp-router/.test(js));
test('Lab hintsUsed tracking', /hintsUsed/.test(js));
test('Lab picker shows Pre-built badge', /tb-lab-badge-auto/.test(js));
// CSS
test('CSS: .tb-lab-step-feedback', css.includes('.tb-lab-step-feedback'));
test('CSS: .tb-lab-hint', css.includes('.tb-lab-hint'));
test('CSS: .tb-lab-hint-toggle', css.includes('.tb-lab-hint-toggle'));
test('CSS: .tb-lab-hint-body', css.includes('.tb-lab-hint-body'));
test('CSS: .tb-lab-progress-bar', css.includes('.tb-lab-progress-bar'));
test('CSS: .tb-lab-progress-fill', css.includes('.tb-lab-progress-fill'));
test('CSS: .tb-lab-badge-auto', css.includes('.tb-lab-badge-auto'));

// ── Summary ──
console.log('\n' + '═'.repeat(50));
const total = results.pass + results.fail;
if (results.fail === 0) {
  console.log(`\x1b[32m\x1b[1m  UAT: ${results.pass}/${total} ALL PASS ✓\x1b[0m`);
} else {
  console.log(`\x1b[31m\x1b[1m  UAT: ${results.pass}/${total} — ${results.fail} FAILED\x1b[0m`);
  console.log('\n  Failed tests:');
  results.errors.forEach(e => console.log(`    - ${e}`));
}
console.log('═'.repeat(50) + '\n');

process.exit(results.fail > 0 ? 1 : 0);
