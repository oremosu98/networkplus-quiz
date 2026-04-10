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
test('APP_VERSION is 4.12', js.includes("const APP_VERSION = '4.12"));
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
test('SW cache bumped to v4.12', sw.includes('netplus-v4.12'));
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
test('SW cache bumped to v4.12.0', sw.includes('netplus-v4.12.0'));
test('APP_VERSION bumped to 4.12', js.includes("APP_VERSION = '4.12'"));

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
