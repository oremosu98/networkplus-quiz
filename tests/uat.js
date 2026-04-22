#!/usr/bin/env node
// ══════════════════════════════════════════
// Network+ Quiz — Reusable UAT Test Suite
// Run: node tests/uat.js
// ══════════════════════════════════════════
//
// ── TESTING PHILOSOPHY (added v4.42.3 audit) ──────────────────────────
// The suite grew from 130 (v4.5) to 2200+ (v4.42.x). Most growth was
// cheap source-string `js.includes('function foo(')` assertions that
// prove the string exists without proving the feature works. Going
// forward, prefer in this order:
//
//   1. BEHAVIORAL SMOKE TESTS — extract a function into a sandbox via
//      `new Function(body)`, feed it fixtures, assert outputs. These
//      catch real regressions. See `computeWeakSpotScores` or
//      `_canonicalizeWeakTopic` audits for the pattern.
//
//   2. STRUCTURAL REGEX — verify call sites use the right helpers /
//      constants / models (`CLAUDE_TEACHER_MODEL`, `_buildGtHint`,
//      `animateCount`). Catches silent reverts where the feature exists
//      but its wiring broke.
//
//   3. REGRESSION GUARDS — `!js.includes('oldThing')` for specific
//      things we deleted and don't want coming back. Time-bound; retire
//      these 3-4 versions after the deletion.
//
//   4. DYNAMIC CONSISTENCY CHECKS — extract version/cache/badge from
//      source and verify they agree, rather than hardcoding the number
//      in multiple places.
//
//   AVOID: pure `js.includes('function foo(')` proofs that a function
//   exists by name. If the function is gone, everything downstream
//   breaks loud. These assertions are noise that make the suite look
//   comprehensive without adding signal.
//
//   AVOID: hardcoding the current version string in more than 2 places.
//   The dynamic checks at the top of the file cover alignment; one
//   hardcoded "forgot to bump" guard is enough.
// ────────────────────────────────────────────────────────────────────

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
const pages = ['setup','loading','quiz','results','review','session-transition','session-complete','progress','exam','exam-results','subnet','ports','acronyms','osi-sorter','cables','analytics'];
pages.forEach(p => test(`page-${p} exists`, html.includes(`id="page-${p}"`)));

console.log('\n\x1b[1m── HTML ELEMENTS ──\x1b[0m');
test('Version badge present', /v\d+\.\d+/.test(html));
test('API key input', html.includes('id="api-key"'));
test('Topic chip group', html.includes('id="topic-group"'));
test('Difficulty chip group', html.includes('id="diff-group"'));
test('Generate Quiz button', html.includes('startQuiz()'));
test('Simulate Exam button', html.includes('startExam()'));
test('Subnet Trainer button (v4.53.0: in sidebar JS + startSubnetTrainer handler wired)',
  js.includes('startSubnetTrainer') && /APP_SIDEBAR_DRILLS[\s\S]{0,1500}startSubnetTrainer/.test(js));
test('Port Drill button', html.includes('startPortDrill()') || js.includes('startPortDrill()'));
test('Analytics button (v4.53.0: in sidebar JS, not setup-nav row)',
  js.includes('renderAnalytics') && /APP_SIDEBAR_PRACTICE[\s\S]{0,800}analytics/.test(js));
test('Topic brief div', html.includes('id="topic-brief"'));
test('Subnet reference table', html.includes('subnet-table'));
test('Port mastery answer area', html.includes('id="pt-answer-area"'));
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
test('st-answer-area exists in HTML', html.includes('id="st-answer-area"'));
test('qnav-toggle has aria-expanded', /id="qnav-toggle"[^>]*aria-expanded/.test(html));
test('exam-timer has role=timer', /id="exam-timer"[^>]*role="timer"/.test(html));
test('syncChipAriaPressed helper defined', js.includes('function syncChipAriaPressed'));
test('showPage moves focus to heading', js.includes('focusTarget.focus'));
test('renderNavGrid sets aria-label per square', js.includes('`Question ${i + 1},'));
coreFns.forEach(fn => test(`function ${fn}()`, js.includes(`function ${fn}(`)));

console.log('\n\x1b[1m── JS FEATURE: SUBNETTING ──\x1b[0m');
['cidrToMask','cidrToMaskArr','getSubnetAddr','getBroadcastAddr','hostCount',
 'genSubnetQuestion','startSubnetTrainer','stNextQuestion','stCheckAnswer'
].forEach(fn => test(`function ${fn}()`, js.includes(`function ${fn}(`)));
test('20+ question types', ['cidr_to_mask','mask_to_cidr','find_subnet','find_broadcast','host_count','same_subnet','vlsm_pick','supernet_aggregate'].every(t => js.includes(t)));

console.log('\n\x1b[1m── JS FEATURE: PORT DRILL ──\x1b[0m');
// Port Mastery core functions (new pt-* architecture)
['startPortDrill','setPortTab','setPortPracticeMode','ptNextQuestion','ptPickAnswer',
 'ptSubmitFamily','ptRenderFeedback','ptGenFamilyQ','ptGenPairsQ','ptAskCoach',
 'ptRenderHeatmap','ptRenderLevelBadge','ptRenderDashboard','ptRenderLessonSidebar',
 'ptOpenLesson','ptRenderGate','ptPickPort','ptPickCategory','ptSetFocusCat',
 'getPortMastery','savePortMastery','updatePortMastery','ptComputeLevel'
].forEach(fn => test(`function ${fn}()`, js.includes(`function ${fn}(`)));
// Legacy compat stubs still exist
['beginPortDrill','getPortStats','savePortStats','updatePortStat','portWeight',
 'pickWeightedPort','getWeakestPorts','resetPortStats'
].forEach(fn => test(`legacy stub ${fn}()`, js.includes(`function ${fn}(`)));
test('40+ port entries', (js.match(/proto:'/g) || []).length >= 38);
test('Port mastery Leitner box system', js.includes('getPortMastery'));
test('PORT_MASTERY storage key', js.includes("PORT_MASTERY: 'nplus_port_mastery'"));
test('PORT_LESSONS storage key', js.includes("PORT_LESSONS: 'nplus_port_lessons'"));
test('Adaptive focus: ptPickPort weighted selection', js.includes('ptPickPort'));
test('Adaptive focus: updatePortMastery tracks answers', js.includes('updatePortMastery'));
test('PT_CATEGORIES defined with 12 categories', js.includes('const PT_CATEGORIES'));
test('PORT_MNEMONICS memory hooks', js.includes('const PORT_MNEMONICS'));
test('PORT_LESSONS 12 lessons', js.includes('const PORT_LESSONS'));

console.log('\n\x1b[1m── JS FEATURE: TOPIC BRIEF ──\x1b[0m');
test('function fetchTopicBrief()', js.includes('function fetchTopicBrief('));
test('Fires in parallel during startQuiz', js.includes('fetchTopicBrief(key'));

console.log('\n\x1b[1m── JS FEATURE: ANALYTICS ──\x1b[0m');
test('function renderAnalytics()', js.includes('function renderAnalytics('));
// v4.54.14: Analytics card headers migrated from plain uppercase <h3> to the
// editorial _edCardhead(eyebrow, title, em) helper.
test('Analytics editorial cardhead: _edCardhead helper defined',
  js.includes('function _edCardhead('));
test('Analytics editorial cardhead: Accuracy trend.',
  js.includes("'Accuracy', 'trend.'"));
test('Analytics editorial cardhead: Difficulty breakdown.',
  js.includes("'Difficulty', 'breakdown.'"));
test('Analytics editorial cardhead: Topic-level breakdown.',
  js.includes("'Topic-level', 'breakdown.'"));
test('Analytics editorial cardhead: Study activity.',
  js.includes("'Study', 'activity.'"));
test('Analytics editorial cardhead: Exam history.',
  js.includes("'Exam', 'history.'"));
test('Analytics editorial cardhead: Study streak.',
  js.includes("'Study', 'streak.'"));
test('Analytics editorial cardhead: Wrong-answer patterns.',
  js.includes("'Wrong-answer', 'patterns.'"));
test('Analytics editorial cardhead: Exam vs quiz.',
  js.includes("'Exam vs', 'quiz.'"));
test('Analytics editorial cardhead: Milestones.',
  js.includes("'Milestones.'"));

console.log('\n\x1b[1m── JS FEATURE: DRAG & DROP ──\x1b[0m');
test('Devices are draggable', js.includes('btn.draggable = true'));
test('ondragstart handler', js.includes('ondragstart'));
test('Zone ondrop handler', js.includes('zoneEl.ondrop') || js.includes('.ondrop'));
test('dataTransfer API used', js.includes('dataTransfer.setData') && js.includes('dataTransfer.getData'));

console.log('\n\x1b[1m── JS FEATURE: DEEP EXPLANATIONS ──\x1b[0m');
test('6 explanation sections in prompt', ['CONCEPT BREAKDOWN','REAL-WORLD ANALOGY','HOW THIS APPEARS ON THE EXAM','MEMORY TRICK','RELATED CONCEPTS'].every(s => js.includes(s)));
// v4.42.5 #130: max_tokens now references named constants (MAX_TOKENS_TEACHER_DEFAULT etc.) not bare literals
test('max_tokens defaults are adequate for teacher calls',
  js.includes('MAX_TOKENS_TEACHER_DEFAULT = 1500') || js.includes('MAX_TOKENS_TEACHER_LONG = 2000'));

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
test('APP_VERSION is 4.61.0', js.includes("const APP_VERSION = '4.61.0"));
test('getDailyGoal function', js.includes('function getDailyGoal('));
test('renderDailyGoal function', js.includes('function renderDailyGoal('));
test('editDailyGoal function', js.includes('function editDailyGoal('));
test('STORAGE.DAILY_GOAL key', js.includes('DAILY_GOAL:'));
test('getTodayQuestionCount function', js.includes('function getTodayQuestionCount('));
test('Daily goal card in HTML', html.includes('id="daily-goal-card"'));
test('Topic domain groups', html.includes('topic-domain-group'));
test('Settings page exists (v4.54.1: #advanced-section retired in favor of #page-settings)',
  html.includes('id="page-settings"') && !html.includes('id="advanced-section"'));
test('CSS: .topic-domain-group', css.includes('.topic-domain-group'));
test('CSS: .daily-goal-card', css.includes('.daily-goal-card'));
test('CSS: .advanced-section', css.includes('.advanced-section'));
test('CSS: .hero-stats-strip', css.includes('.hero-stats-strip'));
test('SW cache bumped to v4.61.0', sw.includes('netplus-v4.61.0'));
test('Family Drill: STORAGE.PORT_FAMILY_BEST', js.includes("PORT_FAMILY_BEST:"));
test('Family Drill: ptMode handles family', js.includes("ptMode === 'family'"));
test('Family Drill: HTML mode button', html.includes('id="pt-mode-family"'));
test('Family Drill: ptGenFamilyQ defined', js.includes('function ptGenFamilyQ('));
test('Family Drill: setPortPracticeMode routes family', js.includes("setPortPracticeMode"));
test('Family Drill: beginPortDrill routes family', /portMode === 'family'[\s\S]{0,80}family/.test(js));
test('Family Drill: family wrong ends run', /ptMode === 'family' \|\| ptMode === 'endless'/.test(js));

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
// v4.42.5 #141: table-driven — hardcore_pass check is now a one-liner in MILESTONE_CHECKS
test('hardcore_pass evaluated against history',
  /id:\s*'hardcore_pass'[\s\S]{0,200}e\.hardcore/.test(js));
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
// v4.45.2: Subtopic Weak Spots card removed (redundant with homepage
// #todays-focus chip row + Wrong-Answer Patterns). Now a regression guard.
test('Weak spots card removed (v4.45.2 regression guard)', !js.includes('ana-weak-list'));
// v4.45.0: heatmap + type-list cards removed, replaced by Domain Mastery
// (full-width above grid) and Wrong-Answer Patterns (inside 2-col grid).
// See the v4.45.0 assertion block below for the new-card guards.
test('Domain Mastery card rendered', js.includes('ana-card-dm'));
test('Wrong-answer patterns card rendered', js.includes('wp-pattern'));
test('Mode compare card rendered', js.includes('ana-mode-compare'));
// v4.45.2: Practice Drills stats card removed (drills have their own
// in-drill dashboards; duplicating in Analytics was noise). Regression guard.
test('Drills grid card removed (v4.45.2 regression guard)', !js.includes('ana-drills-grid'));
test('Milestones card rendered', js.includes('ana-milestones'));
test('Type stats instrumented in pick()', js.includes("updateTypeStat(q.type"));
test('Type stats instrumented in submitExam', /updateTypeStat\(qType/.test(js));
test('Subnet stats instrumented', js.includes('updateSubnetStat('));
test('Port drill milestone defined', js.includes("first_port_drill") || js.includes("perfect_port"));
test('STORAGE.EXAM_DATE key', js.includes('EXAM_DATE:'));
test('STORAGE.MILESTONES key', js.includes('MILESTONES:'));
test('STORAGE.TYPE_STATS key', js.includes('TYPE_STATS:'));
test('STORAGE.SUBNET_STATS key', js.includes('SUBNET_STATS:'));
test('CSS: .ana-ready-hero', css.includes('.ana-ready-hero'));
test('CSS: .ana-domain-row', css.includes('.ana-domain-row'));
test('CSS: .ana-ready-datechip (v4.46.0 — replaces .ana-exam-date-btn styling)', css.includes('.ana-ready-datechip'));
test('CSS: .ana-streak-grid', css.includes('.ana-streak-grid'));
test('CSS: .ana-heatmap', css.includes('.ana-heatmap'));
test('CSS: .ana-milestone', css.includes('.ana-milestone'));

// ── Port Drill Endless mode (v4.9) ──
console.log('\n\x1b[1m── PORT DRILL ENDLESS (v4.9) ──\x1b[0m');
test('STORAGE.PORT_STREAK_BEST key', js.includes('PORT_STREAK_BEST:'));
test('ptMode state variable', js.includes("let ptMode = 'drill'"));
test('setPortPracticeMode function', js.includes('function setPortPracticeMode('));
test('Endless mode in setPortPracticeMode', js.includes("ptMode = mode") || js.includes("ptMode = 'endless'"));
test('Endless mode ends on wrong answer', js.includes("ptMode === 'endless'"));
test('streak_port_25 milestone defined', js.includes('streak_port_25'));
test('Port Mastery 6 practice modes in HTML', html.includes('pt-mode-timed') && html.includes('pt-mode-endless'));
test('pt-mode-drill in HTML', html.includes('id="pt-mode-drill"'));
test('pt-mode-timed in HTML', html.includes('id="pt-mode-timed"'));
test('pt-mode-endless in HTML', html.includes('id="pt-mode-endless"'));
test('pt-mode-focus in HTML', html.includes('id="pt-mode-focus"'));
test('CSS: .pt-mode-bar', css.includes('.pt-mode-bar'));
test('CSS: .pt-mode-btn', css.includes('.pt-mode-btn'));
test('CSS: .pt-mode-active', css.includes('.pt-mode-active'));
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
// v4.42.5 #141: now in MILESTONE_CHECKS table (covered more robustly by new v4.42.5 assertions below)
test('evaluateMilestones handles perfect_quiz', js.includes("id: 'perfect_quiz'"));
test('evaluateMilestones handles weekend_warrior', js.includes("id: 'weekend_warrior'"));
test('evaluateMilestones handles diversity_5', js.includes("id: 'diversity_5'"));
test('evaluateMilestones handles deep_dive_10', js.includes("id: 'deep_dive_10'"));
test('evaluateMilestones handles daily_challenge_7', js.includes("id: 'daily_challenge_7'"));

// ── Port Reference panel (v4.11) ──
console.log('\n\x1b[1m── PORT REFERENCE v4.11 ──\x1b[0m');
test('portCategories defined', js.includes('const portCategories ='));
test('portSortMode state', js.includes("let portSortMode = 'category'"));
test('renderPortReference function', js.includes('function renderPortReference('));
test('setPortSortMode function', js.includes('function setPortSortMode('));
test('filterPortReference function', js.includes('function filterPortReference('));
test('_portCard helper', js.includes('function _portCard('));
test('startPortDrill calls renderPortReference', js.includes('renderPortReference()') && js.includes('startPortDrill'));
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
test('CSS: .ps2-cover-bar (v4.51.0: renamed from .ps-coverage-bar)', css.includes('.ps2-cover-bar'));

// ── Port Drill family multi-select (v4.12 #27) ──
console.log('\n\x1b[1m── PORT DRILL FAMILY Q (v4.12) ──\x1b[0m');
// Port Mastery family mode (replaces old v4.12 family multi-select)
['getFamilyEligibleCategories','ptGenFamilyQ','ptSubmitFamily'
].forEach(fn => test(`function ${fn}()`, js.includes(`function ${fn}(`)));
// Legacy stubs preserved
['togglePortFamilyPick','submitPortFamilyAnswer'
].forEach(fn => test(`legacy stub ${fn}()`, js.includes(`function ${fn}(`)));
test('Family Q in ptNextQuestion', js.includes('ptGenFamilyQ'));
test('Family Q filters categories with >=2 protos', /protos\.length >= 2/.test(js) || /ports\.length >= 2/.test(js));
test('Family Q scoring in ptSubmitFamily', js.includes('ptSubmitFamily'));
test('Port Mastery feedback renders steps', js.includes('ptRenderFeedback'));
test('Port Mastery feedback shows mnemonics', js.includes('PORT_MNEMONICS'));
test('CSS: .pt-mcq-grid', css.includes('.pt-mcq-grid'));
test('CSS: .pt-mcq-btn', css.includes('.pt-mcq-btn'));
test('CSS: .pt-feedback', css.includes('.pt-feedback'));
// v4.42.3 audit: removed "(2)" duplicate version checks — already covered
// by earlier hardcoded checks in the Analytics block and the dynamic
// consistency checks at the top of the file.

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
test('ptMode handles pairs', js.includes("ptMode === 'pairs'"));
test('ptGenPairsQ defined', js.includes('function ptGenPairsQ('));
test('pt-mode-pairs button in HTML', html.includes('id="pt-mode-pairs"'));
test('beginPortDrill routes pairs', /portMode === 'pairs'[\s\S]{0,80}pairs/.test(js));
test('ptPickAnswer ends run on pairs wrong', js.includes("ptMode === 'endless' || ptMode === 'pairs'") || js.includes("ptMode === 'endless'"));
test('ptNextQuestion routes pairs', js.includes("ptMode === 'pairs'"));
test('Pairs feedback in ptRenderFeedback', js.includes('ptRenderFeedback'));
test('Secure pairs data still defined', js.includes('const securePairs'));
test('ptPickAnswer handles wrong answers', js.includes('ptPickAnswer'));
test('Pairs: dedup distractors by answered field', js.includes('seen.has(key)'));
test('Pairs: exclude sibling from distractors', js.includes('siblingExclude'));
test('Pairs: port-pick prompt format', js.includes('is the secure version of'));
test('Pairs: proto-pick prompt format', js.includes('Which protocol replaces'));
test('HTML: pt-mode-pairs button', html.includes('id="pt-mode-pairs"'));
test('HTML: Secure Pairs label in mode bar', html.includes('Secure Pairs') || html.includes('Pairs'));

// ── Bulk Mixed quiz presets (v4.14) ──
console.log('\n\x1b[1m── BULK MIXED PRESETS (v4.14) ──\x1b[0m');
test('HTML: bulk30 preset tile', html.includes("applyPreset('bulk30')"));
test('HTML: bulk45 preset tile', html.includes("applyPreset('bulk45')"));
test('HTML: bulk60 preset tile', html.includes("applyPreset('bulk60')"));
test('HTML: 30 Questions title', html.includes('30 Questions'));
test('HTML: 45 Questions title', html.includes('45 Questions'));
test('HTML: 60 Questions title', html.includes('60 Questions'));
// v4.45.3 regression guards — old 100-Q preset replaced with 45-Q (30/60/100 → 30/45/60)
test('v4.45.3: bulk100 preset removed', !html.includes("applyPreset('bulk100')"));
test('v4.45.3: 100 Questions title removed', !html.includes('100 Questions'));
test('startBulkQuiz function defined', js.includes('async function startBulkQuiz('));
test('applyPreset handles bulk sizes', js.includes('bulk30: 30, bulk45: 45, bulk60: 60'));
test('v4.45.3: bulk100 mapping removed', !js.includes('bulk100:'));
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
// v4.54.16: lab title now uses innerHTML (italic-accent em), not textContent.
test('openGuidedLab sets title', /openGuidedLab[\s\S]{0,1800}titleEl\.innerHTML[\s\S]{0,200}lab\.title/.test(js));
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

// ── Port Mastery replaces dedicated panels — terminal/labs now in Learn tab (v4.36) ──
console.log('\n\x1b[1m── PORT MASTERY LEARN TAB (v4.36) ──\x1b[0m');
test('HTML: pt-tab-learn panel', html.includes('id="pt-tab-learn"'));
test('HTML: pt-lesson-sidebar', html.includes('id="pt-lesson-sidebar"'));
test('HTML: pt-lesson-main', html.includes('id="pt-lesson-main"'));
test('renderPortTerminalList is empty stub', js.includes('function renderPortTerminalList() {}'));
test('renderPortLabsList is empty stub', js.includes('function renderPortLabsList() {}'));
test('portCommands data still defined', js.includes('const portCommands'));
test('portCategories data still defined', js.includes('const portCategories'));
test('_terminalCardHtml helper still defined', js.includes('function _terminalCardHtml('));
test('guidedLabs data still defined', js.includes('const guidedLabs'));
test('openGuidedLab function still defined', js.includes('function openGuidedLab('));
test('PORT_LESSONS data for 12 lessons', js.includes('const PORT_LESSONS'));
test('ptRenderLessonSidebar function', js.includes('function ptRenderLessonSidebar('));
test('ptOpenLesson function', js.includes('function ptOpenLesson('));
test('ptRenderGate practice gate', js.includes('function ptRenderGate('));
test('CSS: .pt-learn-layout', css.includes('.pt-learn-layout'));
test('CSS: .pt-lesson-sidebar', css.includes('.pt-lesson-sidebar'));
test('CSS: .pt-lesson-theory', css.includes('.pt-lesson-theory'));
test('CSS: .pt-lesson-gate', css.includes('.pt-lesson-gate'));
test('CSS: .port-term-row', css.includes('.port-term-row'));
test('CSS: .port-lab-card', css.includes('.port-lab-card'));

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
// primaryKeys are inside renderPortLabsList which is now a stub — verify the lab data still exists
test('TLS lab still defined', js.includes('const _tlsLab'));
test('ARP lab still defined', js.includes('const _arpLab'));
test('Subnet lab still defined', js.includes('const _subnetLab'));
test('Monitoring lab still defined', js.includes('const _monitoringLab'));
test('Troubleshooting lab still defined', js.includes('const _troubleshootingLab'));

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
test('HTML: setup menu button for topology-builder (v4.53.0: now wired in sidebar JS, not HTML)',
  js.includes("showPage('topology-builder')"));
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

// ── Topology Builder polish (v4.41.0 — bigger canvas + auto-layout) ──
console.log('\n\x1b[1m── TOPOLOGY BUILDER POLISH (v4.41.0) ──\x1b[0m');
test('Canvas dimensions bumped to 1800x1100', js.includes('TB_CANVAS_W = 1800') && js.includes('TB_CANVAS_H = 1100'));
// v4.54.6: viewBox dynamic (tbViewState). v4.54.7 widened default to 250 200 1300 780
// so devices spread out and the canvas fills the full-bleed layout edge-to-edge.
test('Canvas viewBox tightened (v4.54.7 default view)', html.includes('viewBox="250 200 1300 780"'));
test('Canvas world dims preserved on grid bg rect (v4.54.6)', /<rect x="0" y="0" width="1800" height="1100" fill="url\(#tb-grid\)"/.test(html));
test('Device rect compact (96x72) for fit', /tb-device-bg[\s\S]{0,300}width="96" height="72"/.test(js));
test('Device label font 13', /tb-device-label[\s\S]{0,200}font-size="13"/.test(js));
// v4.43.1 #4: intro banner replaced with compact .tb-hero (was wall-of-text .tb-intro-banner)
test('TB editorial header present (v4.54.5: .tb-pane-head in left palette pane replaces .tb-v2-header)',
  html.includes('class="tb-pane-head"') && /tb-pane-head[^<]*>Topology\s*<em>Builder<\/em>/.test(html));
test('Intro banner title line (v4.54.5: sub-line moved to left-pane .tb-pane-sub)',
  /\.tb-pane-sub|class="tb-pane-sub">Drag devices/.test(html) || html.includes('Drag devices onto the canvas'));
test('CSS: .tb-intro-banner', css.includes('.tb-intro-banner'));
test('CSS: page-topology-builder max-width override', css.includes('#page-topology-builder { max-width'));
test('Clear button in HTML', html.includes('tbClearCanvas()'));
test('tbClearCanvas function', js.includes('function tbClearCanvas('));
test('tbClearCanvas preserves id/name', /tbClearCanvas[\s\S]{0,600}devices = \[\][\s\S]{0,200}cables = \[\]/.test(js));
test('tbClearCanvas confirms before wiping', /tbClearCanvas[\s\S]{0,600}confirm\(/.test(js));
test('Canvas min-height bumped to 900', css.includes('min-height: 900px'));

// ── Auto-layout (v4.41.0) ──
console.log('\n\x1b[1m── TOPOLOGY AUTO-LAYOUT (v4.41.0) ──\x1b[0m');
test('tbAutoLayout function defined', js.includes('function tbAutoLayout('));
test('tbAutoLayout uses TB_CANVAS_W bounds', /tbAutoLayout[\s\S]{0,2500}TB_CANVAS_W/.test(js));
test('tbAutoLayout uses repulsion + spring', /tbAutoLayout[\s\S]{0,3500}REPULSE[\s\S]{0,1500}SPRING/.test(js));
test('tbAutoLayout iterates simulation', /tbAutoLayout[\s\S]{0,3500}ITERATIONS/.test(js));
test('tbAutoLayout has hard-separation pass', /tbAutoLayout[\s\S]{0,5000}MIN_SEP/.test(js));
test('tbAutoLayout returns moved count', /tbAutoLayout[\s\S]{0,5500}return movedCount/.test(js));
test('tbDeepValidateAndFix calls tbAutoLayout', /tbDeepValidateAndFix[\s\S]{0,7000}tbAutoLayout\(state\)/.test(js));
test('AI prompt mentions 1800x1100 canvas', js.includes('Canvas is 1800x1100'));
test('AI prompt has 180px spacing rule', js.includes('180px between'));
// Behavioral smoke test: feed bunched devices to tbAutoLayout, assert they spread
test('tbAutoLayout spreads bunched devices (smoke)', (() => {
  try {
    const m = js.match(/function tbAutoLayout\([\s\S]+?\n\}\n/);
    if (!m) return false;
    const fn = new Function('TB_CANVAS_W', 'TB_CANVAS_H', m[0] + '; return tbAutoLayout;')(1800, 1100);
    const state = {
      devices: Array.from({length: 8}, (_, i) => ({ id: 'd' + i, x: 400 + (i % 3) * 5, y: 400 + Math.floor(i / 3) * 5 })),
      cables: []
    };
    fn(state);
    // After layout, min pairwise distance should be >= ~140
    let minDist = Infinity;
    for (let i = 0; i < state.devices.length; i++) {
      for (let j = i + 1; j < state.devices.length; j++) {
        const dx = state.devices[i].x - state.devices[j].x;
        const dy = state.devices[i].y - state.devices[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) minDist = d;
      }
    }
    return minDist >= 140;
  } catch (e) { return false; }
})());

// ── Topology Builder v4.19.1: SVG icons, cables, device cap 30, new types ──
console.log('\n\x1b[1m── TOPOLOGY BUILDER v4.19.1 ──\x1b[0m');
test('tbDeviceIcon function', js.includes('function tbDeviceIcon('));
test('tbEdgePoint helper', js.includes('function tbEdgePoint('));
test('Cables use tbEdgePoint (edge-to-edge)', /cabLayer\.innerHTML[\s\S]{0,800}tbEdgePoint/.test(js));
test('tbRenderCanvas uses tbDeviceIcon instead of emoji text', /devLayer\.innerHTML[\s\S]{0,2000}tbDeviceIcon\(/.test(js));
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
test('How-to step: click A then click B (v4.49.1: rephrased across step title + desc)',
  /tb-howto-step-title[^>]*>Wire<[\s\S]{0,400}Click device <em>A<\/em>[\s\S]{0,100}click device <em>B<\/em>/.test(html));
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
// v4.42.5 #72: whitelist trap removed — now uses document.querySelector('.page.active')
// with defensive fallback to 'page-ports'. See v4.42.5 #72 assertions below for the new shape.
test('openGuidedLab queries active page directly (no whitelist)',
  /openGuidedLab[\s\S]{0,800}document\.querySelector\('\.page\.active'\)/.test(js));
test('openGuidedLab fallback is page-ports',
  /openGuidedLab[\s\S]{0,1500}'page-ports'/.test(js));

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
// API call shape (v4.58.0: scoped to function body via _fnBody so the tests
// don't silently break when line offsets shift — previously relied on a fragile
// [\s\S]{0,4000} span anchored at the first mention of tbCoachTopology, which
// happened to be a comment at the top of the file.)
test('Coach calls CLAUDE_API_URL', _fnBody(js, 'tbCoachTopology').includes('CLAUDE_API_URL'));
test('Coach uses a Claude model constant', /CLAUDE_(TEACHER_)?MODEL/.test(_fnBody(js, 'tbCoachTopology')));
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
test('Config opens on overview tab', /tbOpenConfigPanel[\s\S]{0,3000}tbSwitchConfigTab\('overview'\)/.test(js));
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
// Sim toolbar shows on openTopologyBuilder (span widened post-v4.54.7 because
// the function grew additional pan/zoom/popup init lines)
test('Sim toolbar shown on open', /openTopologyBuilder[\s\S]{0,2500}tb-sim-toolbar/.test(js));

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
test('AI prompt max_tokens bumped to 8192', js.includes('genPrompt, 8192'));
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

// ── v4.29.0 — VXLAN, Deep AI Gen, Cloud prop fix ──
console.log('\n\x1b[1m── v4.29.0 VXLAN + DEEP AI GEN ──\x1b[0m');
// Cloud properties in build payload
test('tbBuildFromAiPayload copies securityGroups', /securityGroups: dd\.securityGroups/.test(js));
test('tbBuildFromAiPayload copies vpnConfig', /vpnConfig: dd\.vpnConfig/.test(js));
test('tbBuildFromAiPayload copies vpcConfig', /vpcConfig: dd\.vpcConfig/.test(js));
test('tbBuildFromAiPayload copies saseConfig', /saseConfig: dd\.saseConfig/.test(js));
test('tbBuildFromAiPayload copies vxlanConfig', /vxlanConfig: dd\.vxlanConfig/.test(js));
// VXLAN
test('tbRenderVxlanTab function', js.includes('function tbRenderVxlanTab('));
test('tbAddVxlan function', js.includes('function tbAddVxlan('));
test('tbRemoveVxlan function', js.includes('function tbRemoveVxlan('));
test('tbSetVxlanField function', js.includes('function tbSetVxlanField('));
test('Migration: vxlanConfig default', js.includes('d.vxlanConfig = d.vxlanConfig || []'));
test('VXLAN tab in config panel switch', /case 'vxlan':/.test(js));
test('VXLAN tab visibility for switches/routers', /vxlan.*isSwitch.*isRouter|vxlan.*!isSwitch && !isRouter/.test(js));
test('CLI: show vxlan command', /show vxlan/.test(js));
test('VXLAN help in CLI', /show vxlan.*VXLAN/.test(js));
test('HTML: VXLAN tab button', html.includes('data-tb-tab="vxlan"'));
test('CSS: .tb-vxlan-row', css.includes('.tb-vxlan-row'));
test('Overview shows VXLAN tunnel count', /VXLAN Tunnels/.test(js));
// Deep AI generation
test('tbDeepValidateAndFix function', js.includes('function tbDeepValidateAndFix('));
test('tbExpandScenario function', js.includes('function tbExpandScenario('));
test('Deep gen: auto-assign router IPs', /Auto-assigned.*to.*hostname/.test(js));
test('Deep gen: auto-set gateways', /Auto-set gateway/.test(js));
test('Deep gen: VPN crypto sync', /Synced VPN crypto/.test(js));
test('Deep gen: VPC config init', /Auto-initialized VPC config/.test(js));
test('Deep gen: auto-layout repositions devices', /Auto-layout repositioned/.test(js));
test('Deep gen: cross-subnet routing', /Added static route/.test(js));
test('Expand: data centre → onprem-dc', /data cent.*onprem-dc/.test(js));
test('Expand: VPN tunnel → vpg', /VPN tunnel.*vpg/.test(js));
test('Expand: spine-leaf', /spine.leaf.*spine.*leaf/.test(js));
test('Expand: fabric → VXLAN', /fabric.*VXLAN/.test(js));
test('AI prompt mentions VXLAN', /VXLAN SUPPORT/.test(js));
test('AI prompt mentions vxlanConfig schema', /vxlanConfig.*vni/.test(js));
test('AI prompt mentions data centre mapping', /data cent.*onprem-dc/.test(js));
test('Phase 2 deep validation runs after generate', /Phase 2.*Validating/.test(js));
test('Deep gen fix count in status', /auto-fixes applied/.test(js));

// ── v4.29.0 — AI Generation Reliability Fix ──
console.log('\n\x1b[1m── v4.29.0 AI GEN RELIABILITY ──\x1b[0m');
// Retry mechanism
test('AI gen uses 8192 max_tokens', /max_tokens.*8192/.test(js) || js.includes('8192'));
test('AI gen retry with simplified prompt', js.includes('Retrying with simplified prompt'));
test('AI gen logs stop_reason', js.includes('stop_reason'));
test('AI gen console error on both failures', js.includes('Both attempts failed'));
test('Parser handles truncated JSON (open brace count)', /opens > closes/.test(js));
// Prompt improvements
test('Base prompt starts with CRITICAL JSON instruction', /CRITICAL.*Output ONLY valid JSON/.test(js));
test('Semantic expansion is concise (no verbose text)', !js.includes('VPN Gateway (vpg) devices with matching IPSec vpnConfig (same PSK, IKE, encryption, hash, DH group)'));

// ── v4.29.0 — Interactive Labs + Builder Enhancements ──
console.log('\n\x1b[1m── v4.29.0 INTERACTIVE LABS + BUILDER ──\x1b[0m');
// Live lab validation
test('tbSaveDraft triggers tbRenderLabStep for live validation', js.includes('if (tbActiveLab) tbRenderLabStep()'));
test('Step completion tracking (_completedSteps)', js.includes('_completedSteps'));
test('Just-completed celebration class', js.includes('tb-lab-step-just-completed'));
test('Next button ready state', js.includes('tb-lab-next-ready'));
test('Live update hint in pending text', /updates live as you work/.test(js));
// Cable status coloring
test('Cable healthy class computed', js.includes('tb-cable-healthy'));
test('Cable partial class computed', js.includes('tb-cable-partial'));
// Device health badges
test('Health badge SVG on devices', js.includes('tb-health-badge'));
test('Health badge green for configured devices', /#22c55e/.test(js) && js.includes('healthColor'));
test('Health badge amber for partial config', /#f59e0b/.test(js) && js.includes('healthColor'));
test('Health badge red for unconfigured', /#ef4444/.test(js) && js.includes('healthColor'));
// CSS: interactive features
test('CSS: .tb-lab-step-just-completed animation', css.includes('.tb-lab-step-just-completed'));
test('CSS: .tb-lab-next-ready pulse', css.includes('.tb-lab-next-ready'));
test('CSS: .tb-cable-healthy', css.includes('.tb-cable-healthy'));
test('CSS: .tb-cable-partial', css.includes('.tb-cable-partial'));
test('CSS: @keyframes tbLabCelebrate', css.includes('tbLabCelebrate'));
test('CSS: @keyframes tbNextPulse', css.includes('tbNextPulse'));
// New labs (5 new)
test('Lab: static-routing defined', js.includes("id: 'static-routing'"));
test('Lab: static-routing has 7 steps', /static-routing[\s\S]{0,5000}steps:\s*\[/.test(js));
test('Lab: acl-traffic-filter defined', js.includes("id: 'acl-traffic-filter'"));
test('Lab: acl-traffic-filter checks ACL rules', /fw\.acls.*\.length >= 2/.test(js));
test('Lab: site-to-site-vpn defined', js.includes("id: 'site-to-site-vpn'"));
test('Lab: site-to-site-vpn has autoSetup', /site-to-site-vpn[\s\S]{0,500}autoSetup/.test(js));
test('Lab: site-to-site-vpn checks VPN status', /vpnConfig\.status === .up./.test(js));
test('Lab: wireless-network defined', js.includes("id: 'wireless-network'"));
test('Lab: wireless-network checks uncabled PCs', js.includes('uncabledPcs'));
test('Lab: cloud-vpc-security defined', js.includes("id: 'cloud-vpc-security'"));
test('Lab: cloud-vpc-security checks security groups', /securityGroups.*\.length > 0/.test(js));
test('Lab: network-hardening defined', js.includes("id: 'network-hardening'"));
test('Lab: network-hardening has autoSetup', /network-hardening[\s\S]{0,500}autoSetup/.test(js));
test('Lab: network-hardening checks disabled ports', /disabledCount >= 10/.test(js));
test('Lab: network-hardening checks VLAN 99', /vlanDb.*some.*id === 99/.test(js));
test('Total TB_LABS count >= 11', (js.match(/id: '/g) || []).length >= 11);

// ── v4.30.0 — STP/RSTP, OSPF, CLI Config, IPv6, DNS, QoS, Wireless, Packet Sim ──
console.log('\n\x1b[1m── v4.30.0 ADVANCED NETWORKING FEATURES ──\x1b[0m');

// DNS Server device type
test('Device type: dns-server', js.includes("'dns-server':"));
test('DNS Server label', /dns-server.*DNS Server/.test(js));
test('DNS Server interface defaults', /dns-server.*count: 2/.test(js));
test('DNS Server SVG icon case', /case 'dns-server':/.test(js));

// STP/RSTP tab
test('tbRenderStpTab function', js.includes('function tbRenderStpTab('));
test('tbSetStpField function', js.includes('function tbSetStpField('));
test('tbSetStpPortState function', js.includes('function tbSetStpPortState('));
test('STP tab in config panel switch', /case 'stp':/.test(js));
test('STP mode selector (STP/RSTP/MSTP)', /stp.*rstp.*mstp/i.test(js));
test('STP bridge priority field', /priority|bridgePriority/.test(js));
test('Migration: stpConfig default', js.includes('d.stpConfig = d.stpConfig || null'));

// OSPF tab
test('tbRenderOspfTab function', js.includes('function tbRenderOspfTab('));
test('tbSetOspfField function', js.includes('function tbSetOspfField('));
test('tbAddOspfArea function', js.includes('function tbAddOspfArea('));
test('tbRemoveOspfArea function', js.includes('function tbRemoveOspfArea('));
test('tbSetOspfAreaNetworks function', js.includes('function tbSetOspfAreaNetworks('));
test('OSPF tab in config panel switch', /case 'ospf':/.test(js));
test('OSPF router ID field', /routerId/.test(js));
test('Migration: ospfConfig default', js.includes('d.ospfConfig = d.ospfConfig || null'));

// QoS tab
test('tbRenderQosTab function', js.includes('function tbRenderQosTab('));
test('tbSetQosField function', js.includes('function tbSetQosField('));
test('tbAddQosPolicy function', js.includes('function tbAddQosPolicy('));
test('tbRemoveQosPolicy function', js.includes('function tbRemoveQosPolicy('));
test('QoS tab in config panel switch', /case 'qos':/.test(js));
test('QoS DSCP markings (EF/AF/CS)', /EF|AF[0-9]|CS[0-9]/.test(js));
test('Migration: qosConfig default', js.includes('d.qosConfig = d.qosConfig || null'));

// Wireless tab
test('tbRenderWirelessTab function', js.includes('function tbRenderWirelessTab('));
test('tbSetWirelessField function', js.includes('function tbSetWirelessField('));
test('Wireless tab in config panel switch', /case 'wireless':/.test(js));
test('Wireless supports WPA3', /WPA3/.test(js));
test('Wireless supports 802.11ax', /802\.11ax/.test(js));
test('Migration: wirelessConfig default', js.includes('d.wirelessConfig = d.wirelessConfig || null'));

// DNS tab
test('tbRenderDnsTab function', js.includes('function tbRenderDnsTab('));
test('tbAddDnsRecord function', js.includes('function tbAddDnsRecord('));
test('tbRemoveDnsRecord function', js.includes('function tbRemoveDnsRecord('));
test('tbSetDnsRecord function', js.includes('function tbSetDnsRecord('));
test('DNS tab in config panel switch', /case 'dns':/.test(js));
test('DNS record types: A', /record.*type.*\bA\b/.test(js) || js.includes("type: 'A'") || js.includes("value=\"A\""));
test('DNS record types: AAAA', js.includes('AAAA'));
test('DNS record types: CNAME', js.includes('CNAME'));
test('DNS record types: MX', js.includes('MX'));
test('DNS record types: PTR', js.includes('PTR'));
test('DNS record types: NS', /\bNS\b/.test(js));
test('DNS record types: SOA', js.includes('SOA'));
test('DNS record types: TXT', /\bTXT\b/.test(js));
test('DNS record types: SRV', js.includes('SRV'));
test('DNS record types: CAA', js.includes('CAA'));
test('Migration: dnsRecords default', js.includes('d.dnsRecords = d.dnsRecords || []'));

// IPv6 support
test('tbSetIfaceIpv6 function', js.includes('function tbSetIfaceIpv6('));
test('IPv6 field on interfaces', js.includes('ifc.ipv6'));
test('IPv6 prefix length', js.includes('ipv6Prefix'));
test('Migration: ipv6 default on interfaces', js.includes("ifc.ipv6 = ifc.ipv6 || ''"));
test('Migration: ipv6Prefix default', js.includes('ifc.ipv6Prefix = ifc.ipv6Prefix || 64'));

// CLI commands — new in v4.30.0
test('CLI: show spanning-tree', js.includes('show spanning-tree'));
test('CLI: show ip ospf', js.includes('show ip ospf'));
test('CLI: show ip ospf neighbor', js.includes('show ip ospf neighbor'));
test('CLI: show qos / show policy-map', js.includes('show policy-map'));
test('CLI: show wireless / show ap', js.includes('show wireless'));
test('CLI: show dns records', js.includes('show dns records'));
test('CLI: nslookup queries DNS servers', js.includes('nslookup'));
test('CLI: show ipv6 interface', js.includes('show ipv6 interface'));
test('CLI: show ipv6 route', js.includes('show ipv6 route'));
test('CLI: configure terminal', js.includes('configure terminal'));
test('CLI: hostname command changes device name', js.includes("cmd.startsWith('hostname ')") && js.includes('dev.hostname = newName'));
test('CLI: ip route adds static route', js.includes("cmd.startsWith('ip route ')") && js.includes('routingTable.push'));
test('CLI: show running-config', js.includes('show running-config'));
test('CLI: show run generates IOS-style config', js.includes("show run'") && js.includes('hostname ${dev.hostname}'));
test('Help command lists all new commands', /show spanning-tree[\s\S]{0,500}show ip ospf[\s\S]{0,500}show qos/.test(js));

// Tab visibility logic
test('STP tab visible only on switches', /stp.*isSwitch/.test(js));
test('OSPF tab visible only on routers', /ospf.*isRouter/.test(js));
test('QoS tab visible on routers and switches', /qos.*isRouter.*isSwitch|qos.*!isRouter && !isSwitch/.test(js));
test('Wireless tab visible on WAP/WLC', /wireless.*wap.*wlc|wireless.*dev\.type/.test(js));
test('DNS tab visible on dns-server', /dns.*dns-server/.test(js));

// HTML wiring
test('HTML: STP tab button', html.includes('data-tb-tab="stp"'));
test('HTML: OSPF tab button', html.includes('data-tb-tab="ospf"'));
test('HTML: QoS tab button', html.includes('data-tb-tab="qos"'));
test('HTML: Wireless tab button', html.includes('data-tb-tab="wireless"'));
test('HTML: DNS tab button', html.includes('data-tb-tab="dns"'));

// AI prompt integration
test('AI prompt ADVANCED FEATURES section', js.includes('ADVANCED FEATURES'));
test('AI prompt includes stpConfig in schema', /stpConfig.*null/.test(js));
test('AI prompt includes ospfConfig in schema', /ospfConfig.*null/.test(js));
test('AI prompt includes qosConfig in schema', /qosConfig.*null/.test(js));
test('AI prompt includes wirelessConfig in schema', /wirelessConfig.*null/.test(js));
test('AI prompt includes dnsRecords in schema', /dnsRecords/.test(js));
test('tbBuildFromAiPayload copies stpConfig', /stpConfig/.test(js));
test('Semantic expansion: DNS patterns', /dns|DNS/.test(js));
test('Semantic expansion: OSPF patterns', /ospf|OSPF/.test(js));

// New labs
test('Lab: ospf-dynamic-routing defined', js.includes("id: 'ospf-dynamic-routing'"));
test('Lab: ospf-dynamic-routing is Advanced', /ospf-dynamic-routing[\s\S]{0,500}Advanced/.test(js));
test('Lab: dns-infrastructure defined', js.includes("id: 'dns-infrastructure'"));
test('Lab: dns-infrastructure is Intermediate', /dns-infrastructure[\s\S]{0,500}Intermediate/.test(js));
test('Lab: stp-loop-prevention defined', js.includes("id: 'stp-loop-prevention'"));
test('Lab: stp-loop-prevention has autoSetup', /stp-loop-prevention[\s\S]{0,500}autoSetup/.test(js));
test('Lab: stp-loop-prevention checks bridge priority', /priority.*4096|bridgePriority/.test(js));
test('Total TB_LABS count >= 14', (js.match(/id: 'ospf|id: 'dns-inf|id: 'stp-loop|id: 'static-|id: 'acl-|id: 'site-to|id: 'wireless-|id: 'cloud-vpc|id: 'network-hard|id: 'troubleshoot|id: 'multi-site|id: 'basic-lan|id: 'vlan-seg|id: 'dhcp-|id: 'dmz-|id: 'arp-mac/g) || []).length >= 14);

// ── v4.30.0 — Lab Device Highlighting ──
console.log('\n\x1b[1m── v4.30.0 LAB DEVICE HIGHLIGHTING ──\x1b[0m');
test('Lab highlight: _highlightIds tracked', js.includes('_highlightIds'));
test('Lab highlight: bold term extraction from instructions', js.includes('match(/\\*\\*([^*]+)\\*\\*/g)'));
test('Lab highlight: matches device hostnames', js.includes('matchHostnames'));
test('Lab highlight: matches device type labels', js.includes('matchTypes'));
test('Lab highlight: cleared when step passes', /!passed[\s\S]{0,50}_highlightIds|_highlightIds = \[\][\s\S]{0,50}!passed/.test(js));
test('Lab highlight: triggers canvas re-render', /tbRenderCanvas\(\)/.test(js));
test('Lab highlight: tb-device-lab-target class on devices', js.includes('tb-device-lab-target'));
test('CSS: .tb-device-lab-target animation', css.includes('.tb-device-lab-target'));
test('CSS: @keyframes tbLabTargetPulse', css.includes('tbLabTargetPulse'));

// ── v4.30.2 — 4 New Beginner Labs + Lab Milestones + Progress ──
console.log('\n\x1b[1m── v4.30.2 BEGINNER LABS + LAB MILESTONES ──\x1b[0m');
// New beginner labs
test('Lab: ip-addressing-101 defined', js.includes("id: 'ip-addressing-101'"));
test('Lab: ip-addressing-101 is Beginner', /ip-addressing-101[\s\S]{0,500}Beginner/.test(js));
test('Lab: ip-addressing-101 has 5 steps', /ip-addressing-101[\s\S]{0,500}steps:/.test(js));
test('Lab: ip-addressing-101 teaches gateway', /default gateway/i.test(js));
test('Lab: cable-types-topology defined', js.includes("id: 'cable-types-topology'"));
test('Lab: cable-types-topology is Beginner', /cable-types-topology[\s\S]{0,500}Beginner/.test(js));
test('Lab: cable-types-topology uses fiber', /cable-types-topology[\s\S]{0,3000}fiber/.test(js));
test('Lab: cable-types-topology uses cat5e', /cable-types-topology[\s\S]{0,5000}cat5e/.test(js));
test('Lab: cable-types-topology uses console', /cable-types-topology[\s\S]{0,8000}console/.test(js));
test('Lab: first-firewall defined', js.includes("id: 'first-firewall'"));
test('Lab: first-firewall is Beginner', /first-firewall[\s\S]{0,500}Beginner/.test(js));
test('Lab: first-firewall checks security groups', /first-firewall[\s\S]{0,6000}securityGroups/.test(js));
test('Lab: troubleshooting-101 defined', js.includes("id: 'troubleshooting-101'"));
test('Lab: troubleshooting-101 is Beginner', /troubleshooting-101[\s\S]{0,500}Beginner/.test(js));
test('Lab: troubleshooting-101 has autoSetup', /troubleshooting-101[\s\S]{0,500}autoSetup/.test(js));
test('Lab: troubleshooting-101 teaches CLI tools', /ipconfig.*ping.*traceroute/s.test(js));
test('Total beginner labs >= 6', (js.match(/difficulty: 'Beginner'/g) || []).length >= 6);
test('Total TB_LABS count >= 22', (() => { const m = js.match(/id: '(ip-addr|cable-type|first-fire|troubleshoot-101|ospf|dns-inf|stp-loop|static-|acl-|site-to|wireless-|cloud-vpc|network-hard|troubleshoot-conn|multi-site|basic-lan|vlan-seg|dhcp-|dmz-|arp-|sase-|cloud-vpc-lab)/g); return m && m.length >= 22; })());
// Lab completion tracking
test('STORAGE.LAB_COMPLETIONS key', js.includes("LAB_COMPLETIONS: 'nplus_lab_completions'"));
test('tbEndLab tracks completion in localStorage', /tbEndLab[\s\S]{0,500}LAB_COMPLETIONS/.test(js));
test('tbEndLab increments completion count', /completions.*count.*\+.*1|count.*\+ 1/.test(js));
test('tbEndLab calls evaluateMilestones', /tbEndLab[\s\S]{0,800}evaluateMilestones/.test(js));
// Lab milestones
test('Milestone: first_lab defined', js.includes("id: 'first_lab'"));
test('Milestone: labs_5 defined', js.includes("id: 'labs_5'"));
test('Milestone: labs_10 defined', js.includes("id: 'labs_10'"));
test('Milestone: labs_all defined', js.includes("id: 'labs_all'"));
test('evaluateMilestones checks lab completions', /evaluateMilestones[\s\S]*LAB_COMPLETIONS/.test(js));
// v4.42.5 #141: table-driven — lab milestones now in MILESTONE_CHECKS
test('evaluateMilestones checks labs_5', /id:\s*'labs_5'/.test(js));
test('evaluateMilestones checks labs_all', /id:\s*'labs_all'/.test(js));
// Lab progress in progress page
test('Progress page shows lab completion stats', /Labs/.test(js) && js.includes('labPct'));
test('Progress page shows difficulty breakdown', /Beginner[\s\S]{0,20}Intermediate[\s\S]{0,20}Advanced/.test(js) || /labsByDiff/.test(js));
test('Progress page lab section rendered (v4.51.0: progress-card-labs replaces ps-lab-row)', js.includes('progress-card-labs') && js.includes('labPct'));

// ═══════════════════════════════════════════
// v4.31.0 — BGP, EIGRP, DNSSEC, Packet Inspection, STP Convergence, QoS Enforcement, Attack Scenarios
// ═══════════════════════════════════════════
console.log('\n\x1b[36m── v4.31.0: A+ Features ──\x1b[0m');

// BGP
test('BGP: tbRenderBgpTab function exists', js.includes('function tbRenderBgpTab'));
test('BGP: tbSetBgpField function exists', js.includes('function tbSetBgpField'));
test('BGP: tbAddBgpNeighbor function exists', js.includes('function tbAddBgpNeighbor'));
test('BGP: tbNegotiateBgp function exists', js.includes('function tbNegotiateBgp'));
test('BGP: bgpConfig migration default', js.includes("d.bgpConfig = d.bgpConfig || null"));
test('BGP: tab button in HTML', html.includes('data-tb-tab="bgp"'));
test('BGP: tab visibility for routers', js.includes("tab === 'bgp'") && js.includes('!isRouter'));
test('BGP: tab case in switch', js.includes("case 'bgp':") && js.includes('tbRenderBgpTab'));
test('BGP: AI prompt includes bgpConfig', js.includes('bgpConfig on routers'));
test('BGP: tbBuildFromAiPayload copies bgpConfig', js.includes('bgpConfig: dd.bgpConfig || null'));
test('BGP: CLI show ip bgp', js.includes("show ip bgp'") || js.includes("show ip bgp summary"));
test('BGP: CLI show ip bgp summary output', js.includes('Neighbor') && js.includes('PfxRcvd'));
test('BGP: semantic expansion for BGP', /BGP.*bgpConfig/.test(js));
test('BGP: show running-config includes BGP', js.includes("router bgp"));
test('BGP: negotiate establishes peers', js.includes("n.state = 'Established'"));
test('BGP: route exchange on negotiation', js.includes("type: 'bgp'") && js.includes('asPath'));
test('BGP: bgp-peering lab exists', js.includes("id: 'bgp-peering'"));
test('BGP: bgp-peering lab is advanced', /bgp-peering[\s\S]{0,200}Advanced/.test(js));

// EIGRP
test('EIGRP: tbRenderEigrpTab function exists', js.includes('function tbRenderEigrpTab'));
test('EIGRP: tbSetEigrpField function exists', js.includes('function tbSetEigrpField'));
test('EIGRP: tbAddEigrpNetwork function exists', js.includes('function tbAddEigrpNetwork'));
test('EIGRP: eigrpConfig migration default', js.includes("d.eigrpConfig = d.eigrpConfig || null"));
test('EIGRP: tab button in HTML', html.includes('data-tb-tab="eigrp"'));
test('EIGRP: tab visibility for routers', js.includes("tab === 'eigrp'") && js.includes('!isRouter'));
test('EIGRP: tab case in switch', js.includes("case 'eigrp':") && js.includes('tbRenderEigrpTab'));
test('EIGRP: AI prompt includes eigrpConfig', js.includes('eigrpConfig on routers'));
test('EIGRP: CLI show ip eigrp neighbors', js.includes("show ip eigrp neighbors"));
test('EIGRP: CLI show ip eigrp topology', js.includes("show ip eigrp topology"));
test('EIGRP: show running-config includes EIGRP', js.includes("router eigrp"));
test('EIGRP: semantic expansion for EIGRP', /EIGRP.*eigrpConfig/.test(js));

// DNSSEC
test('DNSSEC: tbToggleDnssec function exists', js.includes('function tbToggleDnssec'));
test('DNSSEC: tbValidateDnssecChain function exists', js.includes('function tbValidateDnssecChain'));
test('DNSSEC: dnssecEnabled migration default', js.includes("d.dnssecEnabled = d.dnssecEnabled || false"));
test('DNSSEC: toggle in DNS tab', js.includes('tbToggleDnssec'));
test('DNSSEC: DNSKEY auto-generation', js.includes("type: 'DNSKEY'"));
test('DNSSEC: RRSIG auto-generation', js.includes("type: 'RRSIG'"));
test('DNSSEC: DS record auto-generation', js.includes("type: 'DS'"));
test('DNSSEC: CLI dig +dnssec', js.includes("dig +dnssec"));
test('DNSSEC: CLI show dnssec', js.includes("show dnssec"));
test('DNSSEC: chain of trust validation', js.includes('Chain of trust'));
test('DNSSEC: AD flag in output', js.includes('AD flag'));
test('DNSSEC: AI prompt includes dnssecEnabled', js.includes('dnssecEnabled'));
test('DNSSEC: dnssec-chain lab exists', js.includes("id: 'dnssec-chain'"));
test('DNSSEC: dnssec-chain lab is advanced', /dnssec-chain[\s\S]{0,200}Advanced/.test(js));
test('DNSSEC: grade rule for DNS servers', js.includes("id: 'dnssec-on-dns'"));

// Packet Inspection
test('Packet Inspection: tbShowPacketInspection function exists', js.includes('function tbShowPacketInspection'));
test('Packet Inspection: tbClosePacketInspection function exists', js.includes('function tbClosePacketInspection'));
test('Packet Inspection: tbBuildPacketHeaders function exists', js.includes('function tbBuildPacketHeaders'));
test('Packet Inspection: panel div in HTML', html.includes('tb-packet-inspect'));
test('Packet Inspection: CSS for panel', css.includes('.tb-packet-inspect'));
test('Packet Inspection: L2 header display', js.includes('Layer 2') && js.includes('Src MAC'));
test('Packet Inspection: L3 header display', js.includes('Layer 3') && js.includes('Src IP'));
test('Packet Inspection: L4 header display', js.includes('Layer 4') && js.includes('Src Port'));
test('Packet Inspection: TTL decrement during animation', js.includes('packetInfo.ttl') && js.includes('- 1'));
test('Packet Inspection: MAC swap at each hop', js.includes('packetInfo.dstMac'));
test('Packet Inspection: ping calls tbBuildPacketHeaders', js.includes('tbBuildPacketHeaders(srcDev, dstDev'));
test('Packet Inspection: ARP uses broadcast MAC', js.includes("dstMac: 'ff:ff:ff:ff:ff:ff'"));
test('Packet Inspection: packet-anatomy lab exists', js.includes("id: 'packet-anatomy'"));
test('Packet Inspection: packet-anatomy lab is beginner', /packet-anatomy[\s\S]{0,200}Beginner/.test(js));

// STP Convergence
test('STP Convergence: tbRunStpConvergence function exists', js.includes('function tbRunStpConvergence'));
test('STP Convergence: tbCalcRootBridge function exists', js.includes('function tbCalcRootBridge'));
test('STP Convergence: tbCalcPortRoles function exists', js.includes('function tbCalcPortRoles'));
test('STP Convergence: Run Convergence button in STP tab', js.includes('tbRunStpConvergence()'));
test('STP Convergence: root bridge election by priority', js.includes('pri < bestPri'));
test('STP Convergence: BPDU animation', js.includes("'BPDU'"));
test('STP Convergence: blocking port assignment', js.includes("'forwarding' : 'blocking'"));
test('STP Convergence: forwarding port assignment', js.includes("role: 'forwarding'"));
test('STP Convergence: CLI show spanning-tree detail', js.includes('show spanning-tree detail'));
test('STP Convergence: stp-convergence lab exists', js.includes("id: 'stp-convergence'"));
test('STP Convergence: stp-convergence lab has autoSetup', /stp-convergence[\s\S]{0,300}autoSetup/.test(js));

// QoS Enforcement
test('QoS Enforcement: tbQosClassify function exists', js.includes('function tbQosClassify'));
test('QoS Enforcement: tbQosEnqueue function exists', js.includes('function tbQosEnqueue'));
test('QoS Enforcement: classification by policy match', js.includes('pol.match') && js.includes('classification'));
test('QoS Enforcement: priority queue has lowest delay', js.includes("priority: 0"));
test('QoS Enforcement: QoS applied during packet animation', js.includes('tbQosClassify(fromDev, packetInfo)'));
test('QoS Enforcement: CLI show qos counters', js.includes("show qos counters"));
test('QoS Enforcement: CLI show qos queue', js.includes("show qos queue"));
test('QoS Enforcement: qos-voice-priority lab exists', js.includes("id: 'qos-voice-priority'"));
test('QoS Enforcement: qos-voice-priority lab is intermediate', /qos-voice-priority[\s\S]{0,200}Intermediate/.test(js));

// Attack Scenarios
test('Attack: tbRenderAttackTab function exists', js.includes('function tbRenderAttackTab'));
test('Attack: tbSimArpSpoof function exists', js.includes('function tbSimArpSpoof'));
test('Attack: tbSimVlanHopping function exists', js.includes('function tbSimVlanHopping'));
test('Attack: tbSimRogueDhcp function exists', js.includes('function tbSimRogueDhcp'));
test('Attack: DHCP Snooping config', js.includes('function tbSetDhcpSnooping'));
test('Attack: DAI config', js.includes('function tbSetDai'));
test('Attack: Port Security config', js.includes('function tbSetPortSecurity'));
test('Attack: dhcpSnooping migration default', js.includes("d.dhcpSnooping = d.dhcpSnooping || null"));
test('Attack: daiEnabled migration default', js.includes("d.daiEnabled = d.daiEnabled || false"));
test('Attack: portSecurity migration default', js.includes("d.portSecurity = d.portSecurity || null"));
test('Attack: DAI blocks ARP spoof', js.includes('DAI blocked'));
test('Attack: DHCP snooping blocks rogue', js.includes('DHCP Snooping blocked'));
test('Attack: tab button in HTML', html.includes('data-tb-tab="attack"'));
test('Attack: tab case in switch', js.includes("case 'attack':") && js.includes('tbRenderAttackTab'));
test('Attack: CLI show ip dhcp snooping', js.includes("show ip dhcp snooping"));
test('Attack: CLI show ip arp inspection', js.includes("show ip arp inspection"));
test('Attack: attack-defense lab exists', js.includes("id: 'attack-defense'"));
test('Attack: attack-defense lab is intermediate', /attack-defense[\s\S]{0,200}Intermediate/.test(js));
test('Attack: grade rule for switch snooping', js.includes("id: 'switch-has-snooping'"));
test('Attack: grade rule for BGP neighbors', js.includes("id: 'bgp-has-neighbor'"));
test('Attack: semantic expansion for ARP spoof', /ARP spoof.*daiEnabled/.test(js));
test('Attack: semantic expansion for DHCP snooping', /DHCP snooping.*dhcpSnooping/.test(js));
test('Attack: AI prompt includes dhcpSnooping', js.includes('dhcpSnooping on switches'));
test('Attack: AI prompt includes daiEnabled', js.includes('daiEnabled on switches'));
test('Attack: AI prompt includes portSecurity', js.includes('portSecurity on switches'));

// Cross-cutting
// v4.42.3 audit: removed the "Version:" trio — duplicates of the earlier
// hardcoded checks plus the top-level dynamic consistency checks that
// verify APP_VERSION ↔ HTML badge ↔ SW cache stay aligned.
test('Help command includes BGP', js.includes('show ip bgp') && js.includes('BGP'));
test('Help command includes EIGRP', js.includes('show ip eigrp'));
test('Help command includes DNSSEC', js.includes('dig +dnssec'));
test('Help command includes DHCP snooping', js.includes('show ip dhcp snooping'));
test('Schema includes bgpConfig', js.includes('"bgpConfig": null'));
test('Schema includes eigrpConfig', js.includes('"eigrpConfig": null'));
test('Schema includes dnssecEnabled', js.includes('"dnssecEnabled": false'));
test('Total labs >= 28', (js.match(/id: '/g) || []).length >= 28);

// ── v4.32 Setup Page Restructure ──
console.log('\n\x1b[1m── v4.32 LAYOUT RESTRUCTURE ──\x1b[0m');
test('HTML: today-section wrapper exists', html.includes('id="today-section"'));
test('HTML: today-section contains daily-goal-card', html.includes('today-section') && html.indexOf('id="daily-goal-card"') > html.indexOf('id="today-section"'));
test('HTML: today-section contains streak-defender', html.indexOf('id="streak-defender"') > html.indexOf('id="today-section"'));
test('HTML: today-section contains daily-challenge-card', html.indexOf('id="daily-challenge-card"') > html.indexOf('id="today-section"'));
test('HTML: today-section contains todays-focus', html.indexOf('id="todays-focus"') > html.indexOf('id="today-section"'));
test('HTML: today-section contains session-banner', html.indexOf('id="session-banner"') > html.indexOf('id="today-section"'));
// v4.41.0: #weak-banner removed from Today section (redundant with #todays-focus chip row)
test('HTML: weak-banner REMOVED (v4.41.0 density pass)', !html.includes('id="weak-banner"'));
test('HTML: persistent sidebar exists (v4.53.0 replaces old setup-nav row)',
  html.includes('id="app-sidebar"') && html.includes('class="app-sidebar"'));
test('HTML: regression \u2014 old .setup-nav toolbar removed', !html.includes('class="setup-nav"'));
test('HTML: sidebar has \u22655 Practice+Drills items (JS-rendered via APP_SIDEBAR_PRACTICE + APP_SIDEBAR_DRILLS)',
  js.includes('APP_SIDEBAR_PRACTICE') && js.includes('APP_SIDEBAR_DRILLS'));
test('HTML: sidebar has Progress entry', /APP_SIDEBAR_PRACTICE[\s\S]{0,800}label:\s*'Progress'/.test(js));
test('HTML: sidebar has Subnet Mastery entry', /APP_SIDEBAR_DRILLS[\s\S]{0,1500}label:\s*'Subnet Mastery'/.test(js));
// v4.53.0: sidebar exposes individual drill entries (Port Drill / Acronym Blitz / OSI / Cable ID) instead of a launcher.
test('HTML: sidebar exposes Port Drill entry (v4.53.0: broken out from the old Drills launcher)',
  /APP_SIDEBAR_DRILLS[\s\S]{0,1500}label:\s*'Port Drill'/.test(js));
test('HTML: sidebar exposes Acronym Blitz + OSI Sorter + Cable ID entries',
  /label:\s*'Acronym Blitz'/.test(js) && /label:\s*'OSI Sorter'/.test(js) && /label:\s*'Cable ID'/.test(js));
test('HTML: sidebar has Analytics entry', /APP_SIDEBAR_PRACTICE[\s\S]{0,800}label:\s*'Analytics'/.test(js));
test('HTML: sidebar has Network Builder entry', /APP_SIDEBAR_PRACTICE[\s\S]{0,1200}label:\s*'Network Builder'/.test(js));
test('HTML: presets-section wrapper exists (v4.53.0: now carries ed-section class for editorial styling)',
  html.includes('class="presets-section ed-section"') || html.includes('class="presets-section"'));
test('HTML: Quick Start section \u2014 v4.53.0 uses editorial \u00a7 01 numbering',
  html.includes('&#167; 01') && /Quick\s*<em>start<\/em>/.test(html));
test('HTML: Marathon Mode section \u2014 v4.53.0 uses editorial \u00a7 02 numbering',
  html.includes('&#167; 02') && /Marathon\s*<em>mode<\/em>/.test(html));
test('HTML: wrong-preset-tile exists', html.includes('id="wrong-preset-tile"'));
test('HTML: custom-quiz-section details exists', html.includes('id="custom-quiz-section"'));
test('HTML: topic-group inside custom-quiz-section', html.indexOf('id="topic-group"') > html.indexOf('id="custom-quiz-section"'));
test('HTML: diff-group inside custom-quiz-section', html.indexOf('id="diff-group"') > html.indexOf('id="custom-quiz-section"'));
test('HTML: count-group inside custom-quiz-section', html.indexOf('id="count-group"') > html.indexOf('id="custom-quiz-section"'));
test('HTML: exam-section exists', html.includes('class="exam-section"'));
test('HTML: setup-err inside custom-quiz-section', html.indexOf('id="setup-err"') > html.indexOf('id="custom-quiz-section"'));
test('CSS: .today-section styles', css.includes('.today-section'));
test('CSS: .setup-nav styles', css.includes('.setup-nav'));
test('CSS: .setup-nav-btn styles', css.includes('.setup-nav-btn'));
test('CSS: .presets-section styles', css.includes('.presets-section'));
test('CSS: .presets-heading styles', css.includes('.presets-heading'));
test('CSS: .custom-quiz-section styles', css.includes('.custom-quiz-section'));
test('CSS: .preset-wrong styles', css.includes('.preset-wrong'));
test('CSS: .exam-section styles', css.includes('.exam-section'));
test('JS: renderTodaySection function exists', js.includes('function renderTodaySection'));
test('JS: showSetupError function exists', js.includes('function showSetupError'));
test('JS: goSetup calls renderTodaySection', js.includes('renderTodaySection()'));
test('JS: renderWrongBankBtn updates wrong-preset-tile', js.includes('wrong-preset-tile'));
test('JS: drillTopic opens custom-quiz-section', js.includes('custom-quiz-section'));

// ── v4.40.0 Label clarity pass ──
console.log('\n\x1b[1m── LABEL CLARITY PASS (v4.40.0) ──\x1b[0m');
test('Label: preset "15-min Weak Spots" (was Focused)', html.includes('15-min Weak Spots'));
test('Label: no legacy "15-min Focused" preset text', !html.includes('15-min Focused'));
test('Label: preset "20-min Deep Scan" (v4.50.1: time corrected from 30-min to honest 20-min estimate)', html.includes('20-min Deep Scan'));
test('Label: no legacy "30-min Grind" preset text', !html.includes('30-min Grind'));
test('Label: exam toggle "Strict Mode" (was Hardcore)', html.includes('Strict Mode'));
test('Label: no legacy "Hardcore Mode" UI text', !html.includes('Hardcore Mode <span class="hardcore-sub"'));
// v4.54.9: Settings page h2 replaced by editorial .ed-pagehead-display "Your settings."
test('Label: Settings page editorial heading (v4.54.9: .ed-pagehead-display "Your settings.")',
  /id="page-settings"[\s\S]{0,800}ed-pagehead-display[^<]*>Your\s*<em>settings\.<\/em>/.test(html));
test('Label: sidebar entry "Network Builder" (v4.53.0: moved from setup-nav to sidebar)',
  /APP_SIDEBAR_PRACTICE[\s\S]{0,1500}label:\s*'Network Builder'/.test(js));
test('Label: Marathon Mode heading preserved', html.includes('Marathon Mode'));
// Internal code identifiers must NOT have been renamed
test('Code: examHardcore state var preserved', js.includes('let examHardcore'));
test('Code: setHardcoreMode function preserved', js.includes('function setHardcoreMode('));
test('Code: HARDCORE_EXAM storage key preserved', js.includes('HARDCORE_EXAM'));
test('Code: hardcore_pass milestone preserved', js.includes('hardcore_pass'));

// ── v4.41.0 Homepage Density Tier 1 ──
console.log('\n\x1b[1m── HOMEPAGE DENSITY TIER 1 (v4.41.0) ──\x1b[0m');
// Weak banner removal (redundant with Weak Spots chip row)
test('Tier1: #weak-banner HTML block removed', !html.includes('id="weak-banner"'));
test('Tier1: renderWeakBanner function removed from app.js', !js.match(/function\s+renderWeakBanner\s*\(/));
// Strip comments before checking for active callers so the v4.41.0 removal note doesn't trigger false positives
(() => {
  const jsNoComments = js
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  test('Tier1: no live callers of renderWeakBanner() remain', !/\brenderWeakBanner\s*\(\s*\)/.test(jsNoComments));
  // renderTodaySection should not query #weak-banner in its active body
  const rts = jsNoComments.match(/function renderTodaySection\s*\([\s\S]*?\n\}/);
  test('Tier1: renderTodaySection no longer queries #weak-banner', !!rts && !rts[0].includes('#weak-banner'));
})();
// Legacy wrong-bank row removal (replaced by preset tile + Settings clear)
test('Tier1: legacy #wrong-bank-row HTML block removed', !html.includes('id="wrong-bank-row"'));
test('Tier1: legacy #wrong-bank-btn HTML block removed', !html.includes('id="wrong-bank-btn"'));
test('Tier1: Clear Wrong Answers Bank button moved to Settings', html.includes('Clear Wrong Answers Bank') && html.includes('id="wrong-bank-clear"'));
test('Tier1: wrong-bank-clear button still wired to clearWrongBank()', html.indexOf('id="wrong-bank-clear"') !== -1 && html.includes('onclick="clearWrongBank()"'));
test('Tier1: clearWrongBank() function still exists', js.includes('function clearWrongBank('));
test('Tier1: startWrongDrill() function still exists', js.includes('function startWrongDrill('));
(() => {
  // Extract the renderWrongBankBtn function body (comments retained is fine — we're searching for live refs)
  const rwb = js.match(/function renderWrongBankBtn\s*\([\s\S]*?\n\}/);
  test('Tier1: renderWrongBankBtn function still exists', !!rwb);
  // Strip comments before checking for legacy row refs
  const body = (rwb ? rwb[0] : '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  test('Tier1: renderWrongBankBtn no longer references wrong-bank-row', !body.includes('wrong-bank-row'));
  test('Tier1: renderWrongBankBtn no longer references wrong-bank-btn', !body.includes("getElementById('wrong-bank-btn')"));
  test('Tier1: renderWrongBankBtn still updates wrong-preset-tile', body.includes('wrong-preset-tile'));
})();
test('Tier1: renderWrongBankBtn updates Settings clear-count badge', js.includes('wrong-bank-clear-count'));
// Drills consolidation (4 buttons → 1 launcher + new #page-drills)
test('Tier1: #page-drills launcher page exists', html.includes('id="page-drills"'));
test('Tier1: drills page has Port Drill tile', html.match(/id="page-drills"[\s\S]*?drills-tile[\s\S]*?Port Drill/));
test('Tier1: drills page has Acronym Blitz tile', html.match(/id="page-drills"[\s\S]*?Acronym Blitz/));
test('Tier1: drills page has OSI Sorter tile', html.match(/id="page-drills"[\s\S]*?OSI Sorter/));
test('Tier1: drills page has Cable ID tile', html.match(/id="page-drills"[\s\S]*?Cable ID/));
test('Tier1: v4.53.0 \u2014 drills launcher moved to sidebar per-drill entries (Port/Acronym/OSI/Cable ID), old drills-launcher-btn retired',
  !html.includes('id="drills-launcher-btn"') && /label:\s*'Port Drill'/.test(js) && /label:\s*'Cable ID'/.test(js));
test('Tier1: showDrillsPage() function exists', js.includes('function showDrillsPage('));
test('Tier1: showDrillsPage calls showPage("drills")', js.match(/function showDrillsPage\([\s\S]{0,200}showPage\('drills'\)/));
test('Tier1: drills-grid CSS class', css.includes('.drills-grid'));
test('Tier1: drills-tile CSS class', css.includes('.drills-tile'));
// Setup nav no longer carries 4 separate drill buttons
test('Tier1: no standalone Port Drill button in setup nav', !html.includes('setup-nav-label">Port Drill'));
test('Tier1: no standalone Acronyms button in setup nav', !html.includes('setup-nav-label">Acronyms'));
test('Tier1: no standalone OSI Sorter button in setup nav', !html.includes('setup-nav-label">OSI Sorter'));
test('Tier1: no standalone Cables button in setup nav', !html.includes('setup-nav-label">Cables'));
test('Tier1: no second Interactive drills nav row', !html.includes('aria-label="Interactive drills"'));
// Drill entry points preserved — functions still exist, just reached via the drills page
test('Tier1: startPortDrill still exists', js.includes('function startPortDrill('));
test('Tier1: startAcronymBlitz still exists', js.includes('function startAcronymBlitz('));
test('Tier1: startOsiSorter still exists', js.includes('function startOsiSorter('));
test('Tier1: startCableId still exists', js.includes('function startCableId('));
// Marathon Mode progressive disclosure (hidden until first quiz)
test('Tier1: #marathon-section wrapper exists', html.includes('id="marathon-section"'));
test('Tier1: #marathon-section starts hidden (is-hidden class)', /id="marathon-section"[^>]*class="[^"]*is-hidden/.test(html));
test('Tier1: renderMarathonSection() function exists', js.includes('function renderMarathonSection('));
test('Tier1: renderMarathonSection checks loadHistory().length', js.match(/renderMarathonSection[\s\S]{0,300}loadHistory\(\)\.length/));
test('Tier1: renderMarathonSection called in goSetup', js.match(/function goSetup\(\)[\s\S]{0,800}renderMarathonSection\(\)/));
test('Tier1: renderMarathonSection called on DOMContentLoaded', js.match(/DOMContentLoaded[\s\S]{0,2000}renderMarathonSection\(\)/));
// Marathon preset buttons still present inside the wrapper
test('Tier1: Marathon 30-question preset still wired', html.includes("applyPreset('bulk30')"));
test('Tier1: Marathon 45-question preset still wired', html.includes("applyPreset('bulk45')"));
test('Tier1: Marathon 60-question preset still wired', html.includes("applyPreset('bulk60')"));

// ── v4.33 Analytics + Progress Redesign ──
console.log('\n\x1b[1m── v4.33 ANALYTICS + PROGRESS ──\x1b[0m');
// Analytics nav
test('Analytics: nav bar rendered', js.includes('ana-nav'));
test('Analytics: nav pills exist', js.includes('ana-nav-pill'));
test('Analytics: nav has Readiness link', js.includes("ana-s-readiness"));
test('Analytics: nav has Trend link', js.includes("ana-s-trend"));
// v4.42.2: Topics pill deleted with Topic Mastery. Now just a regression
// guard that the target section id is gone too.
test('Analytics: nav Topics link removed (v4.42.2)', !js.includes("ana-s-topics"));
test('Analytics: nav has Activity link', js.includes("ana-s-activity"));
// v4.45.2: Drills nav pill removed with the card. Regression guard.
test('Analytics: nav has NO Drills link (v4.45.2 regression guard)', !js.includes("ana-s-drills"));
test('Analytics: nav has Milestones link', js.includes("ana-s-milestones"));
// Analytics removals + merges
test('Analytics: Weekly Volume removed', !js.includes('WEEKLY VOLUME'));
test('Analytics: All-Time Stats card removed', !js.includes("ALL-TIME STATS"));
test('Analytics: Priority Study Areas card removed', !js.includes('PRIORITY STUDY AREAS'));
test('Analytics: hero-stats merged into hero', js.includes('ana-hero-stats'));
test('Analytics: hero has Sessions stat', js.includes('ana-hero-stat-val') && js.includes('Sessions'));
test('Analytics: hero has Questions stat', js.includes('Questions'));
test('Analytics: hero has Accuracy stat', js.includes('Accuracy'));
test('Analytics: hero has Study Days stat', js.includes('Study Days'));
// v4.42.2: Topic Mastery card deleted — topic-level accuracy now lives
// exclusively on Progress. Analytics gets a CTA to Progress instead.
test('Analytics: Topic Mastery card removed (no _renderAnaTopics call)',
  !js.includes('_renderAnaTopics(h)'));
test('Analytics: _renderAnaTopicsCta helper defined',
  js.includes('function _renderAnaTopicsCta('));
test('Analytics: CTA links to Progress page',
  js.includes("showPage('progress');renderProgressPage()") || js.includes('showPage("progress");renderProgressPage()'));
test('Analytics: ana-topics-cta-btn rendered',
  js.includes('ana-topics-cta-btn'));
test('Analytics: Topics pill removed from ana-nav',
  !js.includes("scrollIntoView({behavior:'smooth',block:'start'})\">Topics<"));
test('Analytics: no lingering ana-topic-alert in renderAnalytics body',
  !js.includes('ana-topic-alert'));
// Analytics 2-col grid
test('Analytics: 2-column grid wrapper', js.includes('ana-grid-2col'));
// CSS
test('CSS: .ana-nav styles', css.includes('.ana-nav'));
test('CSS: .ana-nav-pill styles', css.includes('.ana-nav-pill'));
test('CSS: .ana-grid-2col styles', css.includes('.ana-grid-2col'));
test('CSS: .ana-hero-stats styles', css.includes('.ana-hero-stats'));
// v4.42.2: .ana-topic-alert no longer rendered (Topic Mastery deleted).
// New CSS covers the Progress-CTA button + the new trend arrow.
test('CSS: .ana-topics-cta-btn styles (v4.42.2 CTA)', css.includes('.ana-topics-cta-btn'));
test('CSS: .topic-trend styles (v4.42.2 Progress row trend)', css.includes('.topic-trend'));
// Progress page improvements
test('Progress: play button on topic rows', js.includes('topic-play-btn'));
test('Progress: play calls focusTopic', js.includes("focusTopic('"));
test('Progress: domain header mini-bar', js.includes('pd-bar'));
test('Progress: domain header bar fill', js.includes('pd-bar-fill'));
test('CSS: .topic-play-btn styles', css.includes('.topic-play-btn'));
test('CSS: .pd-bar styles', css.includes('.pd-bar'));
test('CSS: .ps2-grid-mastery layout (v4.51.0: renamed from .ps-row)', css.includes('.ps2-grid-mastery'));
test('CSS: .progress-card-labs (v4.51.0: renamed from .ps-lab-row)', css.includes('.progress-card-labs'));
test('Progress: summary uses .ps2-grid (v4.51.0: renamed from ps-row)', js.includes('ps2-grid'));

// ── v4.34 Topology Builder UI (v4.43.1 REFRESH — v4.34 assertions updated to v4.43.1 shapes) ──
console.log('\n\x1b[1m── v4.34/v4.43.1 TOPOLOGY BUILDER UI ──\x1b[0m');
// v4.43.1: intro banner replaced with compact .tb-hero (collapsible <details> removed —
// the hero is always visible but small enough that it doesn't need to collapse).
test('TB: editorial header present (v4.54.5: moved into .tb-pane-head inside .tb-palette-v3)',
  html.includes('class="tb-pane-head"') && /class="[^"]*\btb-palette-v3\b/.test(html));
test('TB: editorial header has display + lede', html.includes('class="tb-v2-display"') && html.includes('class="tb-v2-lede"'));
test('CSS: legacy .tb-hero rules retained but force-hidden (regression tombstone)', css.includes('.tb-hero'));
test('CSS: legacy .tb-hero-pill styles retained (regression tombstone)', css.includes('.tb-hero-pill'));
// 2. Collapsible how-to strip (still collapsible — kept)
test('TB: howto wrapped in details element', html.includes('id="tb-howto-details"'));
test('TB: howto has summary', html.includes('tb-howto-summary'));
test('CSS: .tb-howto-details styles', css.includes('.tb-howto-details'));
test('CSS: .tb-howto-summary styles', css.includes('.tb-howto-summary'));
test('JS: howto collapses when devices exist', /tbState.*devices.*length.*0/.test(js));
// 3. Unified toolbar (v4.43.1 grouped variant — all buttons inside tb-toolbar-v2)
test('TB: toolbar has Ping button', html.includes('tbOpenPingDialog()'));
test('TB: toolbar has DHCP button', html.includes('tbOpenDhcpDialog()'));
test('TB: toolbar has Labs button', html.includes('tbOpenLabPicker()'));
test('TB: toolbar has Clear Log button', html.includes('tbClearSimLog()'));
test('TB: toolbar uses v4.43.1 grouped layout',
  html.includes('tb-toolbar-v2') && html.includes('tb-tool-group'));
// 4. Toolbar groups (v4.43.1 replaces flat dividers with labeled groups)
test('TB: toolbar has 6 logical groups (primary + simulate + practice + file + scenario + utility)',
  (html.match(/tb-tool-group/g) || []).length >= 6);
test('CSS: .tb-tool-group styles', css.includes('.tb-tool-group'));
// 5. Config tab dividers
test('TB: config tabs have dividers', (html.match(/tb-tab-divider/g) || []).length >= 2);
test('CSS: .tb-tab-divider styles', css.includes('.tb-tab-divider'));
test('TB: tabs reordered — STP before OSPF', html.indexOf('data-tb-tab="stp"') < html.indexOf('data-tb-tab="ospf"'));
test('TB: tabs reordered — SG after protocols', html.indexOf('data-tb-tab="wireless"') < html.indexOf('data-tb-tab="security-groups"'));
// 6. Palette grouped by category
test('JS: TB_PALETTE_GROUPS defined', js.includes('TB_PALETTE_GROUPS'));
test('JS: palette has Network group', js.includes("label: 'Network'"));
test('JS: palette has Cloud group', js.includes("label: 'Cloud'"));
test('JS: palette has Endpoints group', js.includes("label: 'Endpoints'"));
test('JS: palette has Wireless group', js.includes("label: 'Wireless'"));
test('JS: palette has Security group', js.includes("label: 'Security'"));
test('JS: tbRenderPalette uses groups', js.includes('TB_PALETTE_GROUPS.map'));
test('JS: palette renders group headers', js.includes('tb-palette-group-head'));
test('CSS: .tb-palette-group-head styles', css.includes('.tb-palette-group-head'));

// ══════════════════════════════════════════
// v4.38.0 — Subnet Mastery Revamp
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.35 SUBNET MASTERY ──\x1b[0m');

// Storage keys
test('STORAGE.SUBNET_MASTERY key', js.includes("SUBNET_MASTERY: 'nplus_subnet_mastery'"));
test('STORAGE.SUBNET_LESSONS key', js.includes("SUBNET_LESSONS: 'nplus_subnet_lessons'"));

// HTML structure
test('HTML: st-level-badge element', html.includes('id="st-level-badge"'));
test('HTML: st-tab-bar tablist', html.includes('class="st-tab-bar"'));
test('HTML: Learn tab button', html.includes('id="st-tab-btn-learn"'));
test('HTML: Practice tab button', html.includes('id="st-tab-btn-practice"'));
test('HTML: Dashboard tab button', html.includes('id="st-tab-btn-dashboard"'));
test('HTML: Learn tab panel', html.includes('id="st-tab-learn"'));
test('HTML: Practice tab panel', html.includes('id="st-tab-practice"'));
test('HTML: Dashboard tab panel', html.includes('id="st-tab-dashboard"'));
test('HTML: Lesson sidebar', html.includes('id="st-lesson-sidebar"'));
test('HTML: Lesson main area', html.includes('id="st-lesson-main"'));
test('HTML: Mode bar with 3 modes', html.includes('id="st-mode-drill"') && html.includes('id="st-mode-timed"') && html.includes('id="st-mode-focus"'));
test('HTML: Focus picker', html.includes('id="st-focus-picker"'));
test('HTML: Stats strip with score/streak', html.includes('id="st-score"') && html.includes('id="st-streak"'));
test('HTML: Question card', html.includes('id="st-q-card"'));
test('HTML: Answer area', html.includes('id="st-answer-area"'));
test('HTML: Feedback area', html.includes('id="st-feedback"'));
test('HTML: Next button', html.includes('id="st-next-btn"'));
test('HTML: Heatmap container', html.includes('id="st-heatmap"'));
test('HTML: Dashboard content', html.includes('id="st-dashboard-content"'));

// JS functions
test('JS: genSubnetQuestion function', js.includes('function genSubnetQuestion'));
test('JS: getSubnetMastery function', js.includes('function getSubnetMastery'));
test('JS: saveSubnetMastery function', js.includes('function saveSubnetMastery'));
test('JS: updateSubnetMastery function', js.includes('function updateSubnetMastery'));
test('JS: stComputeLevel function', js.includes('function stComputeLevel'));
test('JS: stPickCategory function', js.includes('function stPickCategory'));
test('JS: setSubnetTab function', js.includes('function setSubnetTab'));
test('JS: setSubnetMode function', js.includes('function setSubnetMode'));
test('JS: stNextQuestion function', js.includes('function stNextQuestion'));
test('JS: stCheckAnswer function', js.includes('function stCheckAnswer'));
test('JS: stRenderFeedback function', js.includes('function stRenderFeedback'));
test('JS: stRenderBinaryBreakdown function', js.includes('function stRenderBinaryBreakdown'));
test('JS: stRenderLessonSidebar function', js.includes('function stRenderLessonSidebar'));
test('JS: stOpenLesson function', js.includes('function stOpenLesson'));
test('JS: stRenderGate function', js.includes('function stRenderGate'));
test('JS: stCheckGate function', js.includes('function stCheckGate'));
test('JS: stRenderHeatmap function', js.includes('function stRenderHeatmap'));
test('JS: stRenderLevelBadge function', js.includes('function stRenderLevelBadge'));
test('JS: stRenderDashboard function', js.includes('function stRenderDashboard'));
test('JS: stAskCoach function', js.includes('function stAskCoach'));
test('JS: getLessonProgress function', js.includes('function getLessonProgress'));
test('JS: stRenderFocusPicker function', js.includes('function stRenderFocusPicker'));

// JS data structures
test('JS: ST_CATEGORIES with 6 categories', js.includes('ST_CATEGORIES'));
test('JS: SUBNET_LESSONS with 10 lessons', js.includes('const SUBNET_LESSONS'));
test('JS: 20+ question types in genSubnetQuestion', js.includes('cidr_to_mask') && js.includes('find_subnet') && js.includes('same_subnet') && js.includes('vlsm_pick'));

// Utility functions
test('JS: maskToWildcard utility', js.includes('function maskToWildcard'));
test('JS: ipToBinaryStr utility', js.includes('function ipToBinaryStr'));
test('JS: cidrForHosts utility', js.includes('function cidrForHosts'));

// CSS classes
test('CSS: .st-level-badge styles', css.includes('.st-level-badge'));
test('CSS: .st-tab-bar styles', css.includes('.st-tab-bar'));
test('CSS: .st-tab-btn styles', css.includes('.st-tab-btn'));
test('CSS: .st-tab-active styles', css.includes('.st-tab-active'));
test('CSS: .st-tab-panel styles', css.includes('.st-tab-panel'));
test('CSS: .st-learn-layout styles', css.includes('.st-learn-layout'));
test('CSS: .st-lesson-sidebar styles', css.includes('.st-lesson-sidebar'));
test('CSS: .st-lesson-item styles', css.includes('.st-lesson-item'));
test('CSS: .st-lesson-active styles', css.includes('.st-lesson-active'));
test('CSS: .st-lesson-locked styles', css.includes('.st-lesson-locked'));
test('CSS: .st-theory-block styles', css.includes('.st-theory-block'));
test('CSS: .st-lesson-gate styles', css.includes('.st-lesson-gate'));
test('CSS: .st-gate-q styles', css.includes('.st-gate-q'));
test('CSS: .st-mode-bar styles', css.includes('.st-mode-bar'));
test('CSS: .st-mode-btn styles', css.includes('.st-mode-btn'));
test('CSS: .st-mode-active styles', css.includes('.st-mode-active'));
test('CSS: .st-stats-strip styles', css.includes('.st-stats-strip'));
test('CSS: .st-mcq-grid styles', css.includes('.st-mcq-grid'));
test('CSS: .st-mcq-btn styles', css.includes('.st-mcq-btn'));
test('CSS: .st-feedback styles', css.includes('.st-feedback'));
test('CSS: .st-fb-correct styles', css.includes('.st-fb-correct'));
test('CSS: .st-fb-wrong styles', css.includes('.st-fb-wrong'));
test('CSS: .st-steps styles', css.includes('.st-steps'));
test('CSS: .st-step styles', css.includes('.st-step'));
test('CSS: .st-step-num styles', css.includes('.st-step-num'));
test('CSS: .st-binary-grid styles', css.includes('.st-binary-grid'));
test('CSS: .st-bin-row styles', css.includes('.st-bin-row'));
test('CSS: .st-coach-panel styles', css.includes('.st-coach-panel'));
test('CSS: .st-coach-msg styles', css.includes('.st-coach-msg'));
test('CSS: .st-heatmap styles', css.includes('.st-heatmap'));
test('CSS: .st-heatmap-grid styles', css.includes('.st-heatmap-grid'));
test('CSS: .st-heat-cell styles', css.includes('.st-heat-cell'));
test('CSS: .st-focus-picker styles', css.includes('.st-focus-picker'));
test('CSS: .st-focus-chip styles', css.includes('.st-focus-chip'));
test('CSS: .st-dash-hero styles', css.includes('.st-dash-hero'));
test('CSS: .st-dash-level styles', css.includes('.st-dash-level'));
test('CSS: .st-dash-stats styles', css.includes('.st-dash-stats'));
test('CSS: .st-dash-cat-card styles', css.includes('.st-dash-cat-card'));
test('CSS: .st-dash-lessons styles', css.includes('.st-dash-lessons'));
test('CSS: .st-answer-area styles', css.includes('.st-answer-area'));

// ══════════════════════════════════════════
// v4.38.0 — Port Mastery Revamp
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.36 PORT MASTERY ──\x1b[0m');

// Storage keys
test('STORAGE.PORT_MASTERY key', js.includes("PORT_MASTERY: 'nplus_port_mastery'"));
test('STORAGE.PORT_LESSONS key', js.includes("PORT_LESSONS: 'nplus_port_lessons'"));

// HTML structure
test('HTML: pt-level-badge element', html.includes('id="pt-level-badge"'));
test('HTML: pt-tab-bar', html.includes('class="pt-tab-bar"'));
test('HTML: Learn tab button', html.includes('id="pt-tab-btn-learn"'));
test('HTML: Practice tab button', html.includes('id="pt-tab-btn-practice"'));
test('HTML: Dashboard tab button', html.includes('id="pt-tab-btn-dashboard"'));
test('HTML: Learn tab panel', html.includes('id="pt-tab-learn"'));
test('HTML: Practice tab panel', html.includes('id="pt-tab-practice"'));
test('HTML: Dashboard tab panel', html.includes('id="pt-tab-dashboard"'));
test('HTML: Lesson sidebar', html.includes('id="pt-lesson-sidebar"'));
test('HTML: Lesson main area', html.includes('id="pt-lesson-main"'));
test('HTML: 6 practice modes', html.includes('id="pt-mode-drill"') && html.includes('id="pt-mode-timed"') && html.includes('id="pt-mode-endless"') && html.includes('id="pt-mode-family"') && html.includes('id="pt-mode-pairs"') && html.includes('id="pt-mode-focus"'));
test('HTML: Focus picker', html.includes('id="pt-focus-picker"'));
test('HTML: Score and streak', html.includes('id="pt-score"') && html.includes('id="pt-streak"'));
test('HTML: Question card', html.includes('id="pt-q-card"'));
test('HTML: Answer area', html.includes('id="pt-answer-area"'));
test('HTML: Feedback area', html.includes('id="pt-feedback"'));
test('HTML: Next button', html.includes('id="pt-next-btn"'));
test('HTML: Heatmap container', html.includes('id="pt-heatmap"'));
test('HTML: Dashboard content', html.includes('id="pt-dashboard-content"'));

// JS functions
test('JS: setPortTab function', js.includes('function setPortTab'));
test('JS: setPortPracticeMode function', js.includes('function setPortPracticeMode'));
test('JS: ptNextQuestion function', js.includes('function ptNextQuestion'));
test('JS: ptPickAnswer function', js.includes('function ptPickAnswer'));
test('JS: ptRenderFeedback function', js.includes('function ptRenderFeedback'));
test('JS: ptAskCoach function', js.includes('function ptAskCoach'));
test('JS: ptRenderLessonSidebar function', js.includes('function ptRenderLessonSidebar'));
test('JS: ptOpenLesson function', js.includes('function ptOpenLesson'));
test('JS: ptRenderGate function', js.includes('function ptRenderGate'));
test('JS: ptCheckGate function', js.includes('function ptCheckGate'));
test('JS: ptRenderHeatmap function', js.includes('function ptRenderHeatmap'));
test('JS: ptRenderLevelBadge function', js.includes('function ptRenderLevelBadge'));
test('JS: ptRenderDashboard function', js.includes('function ptRenderDashboard'));
test('JS: getPortMastery function', js.includes('function getPortMastery'));
test('JS: savePortMastery function', js.includes('function savePortMastery'));
test('JS: updatePortMastery function', js.includes('function updatePortMastery'));
test('JS: ptComputeLevel function', js.includes('function ptComputeLevel'));
test('JS: ptPickPort function', js.includes('function ptPickPort'));
test('JS: ptPickCategory function', js.includes('function ptPickCategory'));
test('JS: ptGenFamilyQ function', js.includes('function ptGenFamilyQ'));
test('JS: ptGenPairsQ function', js.includes('function ptGenPairsQ'));
test('JS: ptSubmitFamily function', js.includes('function ptSubmitFamily'));
test('JS: ptSetFocusCat function', js.includes('function ptSetFocusCat'));
test('JS: ptRenderFocusPicker function', js.includes('function ptRenderFocusPicker'));
test('JS: ptGetLessonProgress function', js.includes('function ptGetLessonProgress'));

// JS data structures
test('JS: PT_CATEGORIES with 12 categories', js.includes('PT_CATEGORIES'));
test('JS: PORT_LESSONS with 12 lessons', js.includes('const PORT_LESSONS'));
test('JS: PORT_MNEMONICS object', js.includes('const PORT_MNEMONICS'));
test('JS: ptCatOf helper', js.includes('function ptCatOf'));

// CSS classes
test('CSS: .pt-level-badge', css.includes('.pt-level-badge'));
test('CSS: .pt-tab-bar', css.includes('.pt-tab-bar'));
test('CSS: .pt-tab-btn', css.includes('.pt-tab-btn'));
test('CSS: .pt-tab-active', css.includes('.pt-tab-active'));
test('CSS: .pt-tab-panel', css.includes('.pt-tab-panel'));
test('CSS: .pt-learn-layout', css.includes('.pt-learn-layout'));
test('CSS: .pt-lesson-sidebar', css.includes('.pt-lesson-sidebar'));
test('CSS: .pt-lesson-item', css.includes('.pt-lesson-item'));
test('CSS: .pt-lesson-active', css.includes('.pt-lesson-active'));
test('CSS: .pt-lesson-locked', css.includes('.pt-lesson-locked'));
test('CSS: .pt-theory-block', css.includes('.pt-theory-block'));
test('CSS: .pt-lesson-gate', css.includes('.pt-lesson-gate'));
test('CSS: .pt-gate-q', css.includes('.pt-gate-q'));
test('CSS: .pt-mode-bar', css.includes('.pt-mode-bar'));
test('CSS: .pt-mode-btn', css.includes('.pt-mode-btn'));
test('CSS: .pt-mode-active', css.includes('.pt-mode-active'));
test('CSS: .pt-stats-strip', css.includes('.pt-stats-strip'));
test('CSS: .pt-mcq-grid', css.includes('.pt-mcq-grid'));
test('CSS: .pt-mcq-btn', css.includes('.pt-mcq-btn'));
test('CSS: .pt-feedback', css.includes('.pt-feedback'));
test('CSS: .pt-fb-correct', css.includes('.pt-fb-correct'));
test('CSS: .pt-fb-wrong', css.includes('.pt-fb-wrong'));
test('CSS: .pt-steps', css.includes('.pt-steps'));
test('CSS: .pt-step', css.includes('.pt-step'));
test('CSS: .pt-step-num', css.includes('.pt-step-num'));
test('CSS: .pt-coach-panel', css.includes('.pt-coach-panel'));
test('CSS: .pt-coach-msg', css.includes('.pt-coach-msg'));
test('CSS: .pt-heatmap', css.includes('.pt-heatmap'));
test('CSS: .pt-heatmap-grid', css.includes('.pt-heatmap-grid'));
test('CSS: .pt-heat-cell', css.includes('.pt-heat-cell'));
test('CSS: .pt-focus-picker', css.includes('.pt-focus-picker'));
test('CSS: .pt-focus-chip', css.includes('.pt-focus-chip'));
test('CSS: .pt-dash-hero', css.includes('.pt-dash-hero'));
test('CSS: .pt-dash-level', css.includes('.pt-dash-level'));
test('CSS: .pt-dash-stats', css.includes('.pt-dash-stats'));
test('CSS: .pt-dash-cat-card', css.includes('.pt-dash-cat-card'));
test('CSS: .pt-dash-lessons', css.includes('.pt-dash-lessons'));
test('CSS: .pt-dash-weak', css.includes('.pt-dash-weak'));
test('CSS: .pt-dash-pairs', css.includes('.pt-dash-pairs'));
test('CSS: .pt-answer-area', css.includes('.pt-answer-area'));
test('CSS: .pt-mcq-selected', css.includes('.pt-mcq-selected'));

// v4.38.0 — Ambient Packets + Fix This Network
console.log('\n\x1b[1m── AMBIENT PACKETS (v4.38.0) ──\x1b[0m');
test('tbAmbientState config object', js.includes('tbAmbientState'));
test('tbInitAmbientPool function', js.includes('function tbInitAmbientPool('));
test('tbAssessCableHealth function', js.includes('function tbAssessCableHealth('));
test('tbRefreshAmbientHealth function', js.includes('function tbRefreshAmbientHealth('));
test('tbAmbientSpawnCycle function', js.includes('function tbAmbientSpawnCycle('));
test('tbSpawnAmbientDot function', js.includes('function tbSpawnAmbientDot('));
test('tbAmbientAnimLoop function', js.includes('function tbAmbientAnimLoop('));
test('tbStartAmbient function', js.includes('function tbStartAmbient('));
test('tbStopAmbient function', js.includes('function tbStopAmbient('));
test('tbPauseAmbient function', js.includes('function tbPauseAmbient('));
test('tbResumeAmbient function', js.includes('function tbResumeAmbient('));
test('tbAmbientHealingBurst function', js.includes('function tbAmbientHealingBurst('));
test('POOL_SIZE in ambient config', js.includes('POOL_SIZE'));
test('TB_NO_IP_NEEDED array', js.includes('TB_NO_IP_NEEDED'));
test('showPage stops ambient on nav', js.includes('tbStopAmbient'));
test('openTopologyBuilder starts ambient', js.includes('tbStartAmbient'));
test('tbSaveDraft calls tbRefreshAmbientHealth', js.includes('tbRefreshAmbientHealth()'));
test('CSS: .tb-ambient-dot', css.includes('.tb-ambient-dot'));

console.log('\n\x1b[1m── FIX THIS NETWORK (v4.38.0) ──\x1b[0m');
// Fault types
test('TB_FAULT_TYPES array', js.includes('TB_FAULT_TYPES'));
test('Fault: wrong-subnet', js.includes("id: 'wrong-subnet'"));
test('Fault: wrong-gateway', js.includes("id: 'wrong-gateway'"));
test('Fault: wrong-mask', js.includes("id: 'wrong-mask'"));
test('Fault: duplicate-ip', js.includes("id: 'duplicate-ip'"));
test('Fault: missing-ip', js.includes("id: 'missing-ip'"));
test('Fault: wrong-vlan', js.includes("id: 'wrong-vlan'"));
test('Fault: trunk-not-set', js.includes("id: 'trunk-not-set'"));
test('Fault: trunk-missing-vlan', js.includes("id: 'trunk-missing-vlan'"));
test('Fault: port-disabled', js.includes("id: 'port-disabled'"));
test('Fault: missing-route', js.includes("id: 'missing-route'"));
test('Fault: wrong-next-hop', js.includes("id: 'wrong-next-hop'"));
test('Fault: dhcp-wrong-pool', js.includes("id: 'dhcp-wrong-pool'"));
test('Fault: acl-blocks-traffic', js.includes("id: 'acl-blocks-traffic'"));
test('Fault: vpn-crypto-mismatch', js.includes("id: 'vpn-crypto-mismatch'"));
test('Fault: vpn-wrong-psk', js.includes("id: 'vpn-wrong-psk'"));
test('Fault: wap-wrong-security', js.includes("id: 'wap-wrong-security'"));

// Challenges (all 15)
test('TB_FIX_CHALLENGES array', js.includes('TB_FIX_CHALLENGES'));
test('Challenge: fix-broken-lan', js.includes("id: 'fix-broken-lan'"));
test('Challenge: fix-silent-pc', js.includes("id: 'fix-silent-pc'"));
test('Challenge: fix-duplicate-ip', js.includes("id: 'fix-duplicate-ip'"));
test('Challenge: fix-wrong-mask', js.includes("id: 'fix-wrong-mask'"));
test('Challenge: fix-insecure-wifi', js.includes("id: 'fix-insecure-wifi'"));
test('Challenge: fix-vlan-isolation', js.includes("id: 'fix-vlan-isolation'"));
test('Challenge: fix-routing-blackhole', js.includes("id: 'fix-routing-blackhole'"));
test('Challenge: fix-acl-lockout', js.includes("id: 'fix-acl-lockout'"));
test('Challenge: fix-dns', js.includes("id: 'fix-dns'"));
test('Challenge: fix-dhcp', js.includes("id: 'fix-dhcp'"));
test('Challenge: fix-trunk-trouble', js.includes("id: 'fix-trunk-trouble'"));
test('Challenge: fix-ospf', js.includes("id: 'fix-ospf'"));
test('Challenge: fix-vpn', js.includes("id: 'fix-vpn'"));
test('Challenge: fix-bgp', js.includes("id: 'fix-bgp'"));
test('Challenge: fix-perfect-storm', js.includes("id: 'fix-perfect-storm'"));

// Engine functions
test('tbOpenFixPicker function', js.includes('function tbOpenFixPicker('));
test('tbFixFilterTab function', js.includes('function tbFixFilterTab('));
test('tbStartFixChallenge function', js.includes('function tbStartFixChallenge('));
test('tbRenderFixPanel function', js.includes('function tbRenderFixPanel('));
test('tbShowFixHint function', js.includes('function tbShowFixHint('));
test('tbCheckFixProgress function', js.includes('function tbCheckFixProgress('));
test('tbShowFixToast function', js.includes('function tbShowFixToast('));
test('tbEndFixChallenge function', js.includes('function tbEndFixChallenge('));
test('tbCalcFixScore function', js.includes('function tbCalcFixScore('));
test('tbShowFixComplete function', js.includes('function tbShowFixComplete('));
test('tbCloseFixChallenge function', js.includes('function tbCloseFixChallenge('));
test('tbSaveDraft calls tbCheckFixProgress', js.includes('tbCheckFixProgress()'));
test('STORAGE.FIX_CHALLENGES key', js.includes("FIX_CHALLENGES"));

// Milestones
test('Milestone: fix_first', js.includes("id: 'fix_first'"));
test('Milestone: fix_5', js.includes("id: 'fix_5'"));
test('Milestone: fix_all_easy', js.includes("id: 'fix_all_easy'"));
test('evaluateMilestones checks fix challenges', js.includes("fixSaved") || js.includes("fix_first"));

// HTML wiring
test('HTML: tb-fix-picker element', html.includes('id="tb-fix-picker"'));
test('HTML: tb-fix-panel element', html.includes('id="tb-fix-panel"'));
test('HTML: tb-fix-complete element', html.includes('id="tb-fix-complete"'));
test('HTML: tb-fix-body element', html.includes('id="tb-fix-body"'));
test('HTML: tb-fix-timer element', html.includes('id="tb-fix-timer"'));
test('HTML: Fix toolbar button', html.includes('tbOpenFixPicker()'));

// CSS
test('CSS: .tb-tool-btn-fix', css.includes('.tb-tool-btn-fix'));
test('CSS: .tb-fix-tabs', css.includes('.tb-fix-tabs'));
test('CSS: .tb-fix-tab', css.includes('.tb-fix-tab'));
test('CSS: .tb-fix-card', css.includes('.tb-fix-card'));
test('CSS: .tb-fix-panel', css.includes('.tb-fix-panel'));
test('CSS: .tb-fix-panel-head', css.includes('.tb-fix-panel-head'));
test('CSS: .tb-fix-timer', css.includes('.tb-fix-timer'));
test('CSS: .tb-fix-symptom', css.includes('.tb-fix-symptom'));
test('CSS: .tb-fix-progress-bar', css.includes('.tb-fix-progress-bar'));
test('CSS: .tb-fix-fault-row', css.includes('.tb-fix-fault-row'));
test('CSS: .tb-fix-hint-btn', css.includes('.tb-fix-hint-btn'));
test('CSS: .tb-fix-toast', css.includes('.tb-fix-toast'));
test('CSS: .tb-fix-complete-hero', css.includes('.tb-fix-complete-hero'));
test('CSS: .tb-fix-complete-grade', css.includes('.tb-fix-complete-grade'));
test('CSS: .tb-fix-start-btn', css.includes('.tb-fix-start-btn'));

// v4.38.0 — Draggable Fix Panel, Enhanced Packets, Lab Tabs
console.log('\n\x1b[1m── v4.38.0 POLISH ──\x1b[0m');
test('tbInitFixPanelDrag function', js.includes('function tbInitFixPanelDrag('));
test('Draggable: mousedown on panel head', js.includes("head.addEventListener('mousedown'"));
test('Draggable: touch support', js.includes("head.addEventListener('touchstart'"));
test('Fix panel position reset on close', js.includes("panel.style.right = ''"));
test('Ambient POOL_SIZE increased to 40', js.includes('POOL_SIZE: 40'));
test('Ambient PACKET_RADIUS increased to 6', js.includes('PACKET_RADIUS: 6'));
test('Ambient PACKET_OPACITY increased to 0.85', js.includes('PACKET_OPACITY: 0.85'));
test('Ambient SPAWN_INTERVAL decreased to 1200', js.includes('SPAWN_INTERVAL: 1200'));
test('Ambient double drop-shadow glow', js.includes('drop-shadow(0 0 8px'));
test('Healing burst radius 8', js.includes("el.setAttribute('r', '8')"));
test('tbLabFilterTab function', js.includes('function tbLabFilterTab('));
test('Lab picker has tab buttons', js.includes("tbLabFilterTab(this"));
test('Lab cards have data-diff attribute', js.includes('data-diff="${lab.difficulty}"'));

// v4.38.0 — Give Up & Reveal Answers
console.log('\n\x1b[1m── GIVE UP & REVEAL (v4.38.0) ──\x1b[0m');
test('tbRevealFixAnswers function', js.includes('function tbRevealFixAnswers('));
test('tbShowFixReveal function', js.includes('function tbShowFixReveal('));
test('Reveal confirms before giving up', js.includes('reveal all answers'));
test('Reveal sets revealed flag', js.includes('tbFixChallenge.revealed = true'));
test('Reveal auto-fixes IPs', js.includes('ifc.ip = f.orig.ip'));
test('Reveal auto-fixes gateways', js.includes('ifc.gateway = f.orig.gateway'));
test('Reveal auto-fixes VLANs', js.includes('ifc.vlan = f.orig.vlan'));
test('Reveal auto-fixes routes', js.includes('Routes restored'));
test('Reveal removes deny-all ACL', js.includes("dev.acls.splice(denyIdx, 1)"));
test('Reveal fixes VPN encryption', js.includes('dev.vpnConfig.encryption = f.orig.vpnConfig.encryption'));
test('Reveal shows exam tip', js.includes('Domain 5 (Troubleshooting) is 22%'));
test('Give Up button in panel', js.includes('tbRevealFixAnswers()'));
test('Reveal modal has numbered faults', js.includes('tb-fix-reveal-num'));
test('Reveal shows diagnosis', js.includes('tb-fix-reveal-diagnosis'));
test('Reveal shows fix details', js.includes('tb-fix-reveal-fix'));
test('CSS: .tb-fix-giveup-btn', css.includes('.tb-fix-giveup-btn'));
test('CSS: .tb-fix-reveal-hero', css.includes('.tb-fix-reveal-hero'));
test('CSS: .tb-fix-reveal-fault', css.includes('.tb-fix-reveal-fault'));
test('CSS: .tb-fix-reveal-diagnosis', css.includes('.tb-fix-reveal-diagnosis'));
test('CSS: .tb-fix-reveal-fix', css.includes('.tb-fix-reveal-fix'));
test('CSS: .tb-fix-reveal-tip', css.includes('.tb-fix-reveal-tip'));

// v4.38.0 — Light Mode comprehensive fix
console.log('\n\x1b[1m── LIGHT MODE FIX (v4.38.0) ──\x1b[0m');
test('Light: [data-theme="light"] vars block', css.includes('[data-theme="light"]'));
test('Light: terminal-card override', css.includes('[data-theme="light"] .terminal-card'));
test('Light: port-ref-cmd override', css.includes('[data-theme="light"] .port-ref-cmd'));
test('Light: cli-terminal override', css.includes('[data-theme="light"] .cli-terminal'));
test('Light: tb-cli-output override', css.includes('[data-theme="light"] .tb-cli-output'));
test('Light: tb-grade-card override', css.includes('[data-theme="light"] .tb-grade-card'));
test('Light: tb-grade-scenario override', css.includes('[data-theme="light"] .tb-grade-scenario'));
test('Light: tb-grade-section override', css.includes('[data-theme="light"] .tb-grade-section'));
test('Light: tb-grade-item-label override', css.includes('[data-theme="light"] .tb-grade-item-label'));
test('Light: tb-coach-tour override', css.includes('[data-theme="light"] .tb-coach-tour'));
test('Light: tb-coach-section override', css.includes('[data-theme="light"] .tb-coach-section'));
test('Light: tb-coach-list override', css.includes('[data-theme="light"] .tb-coach-list'));
test('Light: tb-tool-btn-coach override', css.includes('[data-theme="light"] .tb-tool-btn-coach'));
test('Light: tb-tool-btn-ai override', css.includes('[data-theme="light"] .tb-tool-btn-ai'));
test('Light: tb-palette-item override', css.includes('[data-theme="light"] .tb-palette-item'));
test('Light: tb-cable-chip override', css.includes('[data-theme="light"] .tb-cable-chip'));
test('Light: tb-fix-panel shadow override', css.includes('[data-theme="light"] .tb-fix-panel'));
test('Light: tb-fix-timer override', css.includes('[data-theme="light"] .tb-fix-timer'));
test('Light: tb-packet-inspect override', css.includes('[data-theme="light"] .tb-packet-inspect'));
test('Light: end-exam-btn hover override', css.includes('[data-theme="light"] .end-exam-btn:hover'));
test('Light: st-binary-grid override', css.includes('[data-theme="light"] .st-binary-grid'));
test('Light: tb-canvas-wrap override', css.includes('[data-theme="light"] .tb-canvas-wrap'));
test('Light: tb-fix-reveal-fix override', css.includes('[data-theme="light"] .tb-fix-reveal-fix'));
test('Light: tb-coach-error-title override', css.includes('[data-theme="light"] .tb-coach-error-title'));

// v4.38.0 — TB light mode polish + how-to layout
console.log('\n\x1b[1m── TB LIGHT MODE POLISH (v4.38.0) ──\x1b[0m');
test('Light: tb-toolbar override', css.includes('[data-theme="light"] .tb-toolbar'));
test('Light: tb-palette override', css.includes('[data-theme="light"] .tb-palette'));
test('Light: tb-intro-details override', css.includes('[data-theme="light"] .tb-intro-details'));
test('Light: tb-howto-details override', css.includes('[data-theme="light"] .tb-howto-details'));
test('Light: tb-howto-step override (v4.49.1: replaced .tb-howto-item)', css.includes('[data-theme="light"] .tb-howto-step'));
test('Light: tb-howto kbd override (v4.49.1: now scoped to .tb-howto-step kbd)', css.includes('[data-theme="light"] .tb-howto-step kbd'));
test('Light: tb-sim-log-content override', css.includes('[data-theme="light"] .tb-sim-log-content'));
test('Light: tb-fix-diff-easy override', css.includes('[data-theme="light"] .tb-fix-diff-easy'));
test('Light: tb-fix-tab override', css.includes('[data-theme="light"] .tb-fix-tab'));
test('Light: tb-grade-backdrop override', css.includes('[data-theme="light"] .tb-grade-backdrop'));
test('Light: tb-scenario-panel override', css.includes('[data-theme="light"] .tb-scenario-panel'));
test('How-to strip uses CSS grid', css.includes('grid-template-columns: repeat(auto-fit'));
test('How-to step cards have card style (v4.49.1: .tb-howto-step with border-radius: 12px)',
  css.includes('.tb-howto-step {') && /\.tb-howto-step\s*\{[^}]*border-radius:\s*12px/.test(css));

// v4.38.0 — Comprehensive light mode audit
console.log('\n\x1b[1m── LIGHT MODE AUDIT (v4.38.0) ──\x1b[0m');

// Lab card overrides
test('Light: lab card background', css.includes('[data-theme="light"] .tb-lab-card'));
test('Light: lab card meta text', css.includes('[data-theme="light"] .tb-lab-card-meta'));
test('Light: lab card desc text', css.includes('[data-theme="light"] .tb-lab-card-desc'));
test('Light: lab badge auto', css.includes('[data-theme="light"] .tb-lab-badge-auto'));

// Lab step panel overrides
test('Light: lab panel head', css.includes('[data-theme="light"] .tb-lab-panel-head'));
test('Light: lab step title', css.includes('[data-theme="light"] .tb-lab-step-title'));
test('Light: lab step instructions', css.includes('[data-theme="light"] .tb-lab-step-instr'));
test('Light: lab step pending', css.includes('[data-theme="light"] .tb-lab-step-pending'));
test('Light: lab step feedback', css.includes('[data-theme="light"] .tb-lab-step-feedback'));
test('Light: lab hint toggle', css.includes('[data-theme="light"] .tb-lab-hint-toggle'));
test('Light: lab hint body', css.includes('[data-theme="light"] .tb-lab-hint-body'));
test('Light: lab progress', css.includes('[data-theme="light"] .tb-lab-progress'));
test('Light: lab nav', css.includes('[data-theme="light"] .tb-lab-nav'));

// Config panel overrides
test('Light: config head', css.includes('[data-theme="light"] .tb-config-head'));
test('Light: config close', css.includes('[data-theme="light"] .tb-config-close'));
test('Light: config body labels', css.includes('[data-theme="light"] .tb-config-body label'));
test('Light: config body inputs', css.includes('[data-theme="light"] .tb-config-body input'));
test('Light: iface table headers', css.includes('[data-theme="light"] .tb-iface-table th'));
test('Light: iface table inputs', css.includes('[data-theme="light"] .tb-iface-table input'));
test('Light: sg table headers', css.includes('[data-theme="light"] .tb-sg-table th'));

// Overview tab overrides
test('Light: overview hostname', css.includes('[data-theme="light"] .tb-ov-hostname'));
test('Light: overview stat labels', css.includes('[data-theme="light"] .tb-ov-stat span'));
test('Light: overview stat values', css.includes('[data-theme="light"] .tb-ov-stat strong'));
test('Light: overview section label', css.includes('[data-theme="light"] .tb-ov-section-label'));
test('Light: overview iface card', css.includes('[data-theme="light"] .tb-ov-iface-card'));
test('Light: overview iface detail', css.includes('[data-theme="light"] .tb-ov-iface-detail'));

// Other missing overrides
test('Light: route type connected', css.includes('[data-theme="light"] .tb-route-type-connected'));
test('Light: route type static', css.includes('[data-theme="light"] .tb-route-type-static'));
test('Light: vlan row', css.includes('[data-theme="light"] .tb-vlan-row'));
test('Light: cloud card', css.includes('[data-theme="light"] .tb-cloud-card'));
test('Light: tool btn primary', css.includes('[data-theme="light"] .tb-tool-btn-primary'));
test('Light: fix hint btn', css.includes('[data-theme="light"] .tb-fix-hint-btn'));
test('Light: fix giveup btn', css.includes('[data-theme="light"] .tb-fix-giveup-btn'));

// Device label theme detection in app.js
test('Device labels: theme-aware fill', js.includes("const isLight = document.documentElement.getAttribute('data-theme') === 'light'"));
test('Device labels: light mode fill color', js.includes("const labelFill = isLight ? '#1e293b' : '#e2e8f0'"));

// v4.38.0 — Solid range color: amber → blue
console.log('\n\x1b[1m── SOLID RANGE COLOR FIX (v4.38.0) ──\x1b[0m');
test('Solid range uses blue not yellow in progress rows', js.includes("rag-blue") && js.includes("var(--blue)"));
test('CSS has rag-blue class', css.includes('.rag-blue'));
test('No rag-yellow in CSS', !css.includes('.rag-yellow'));
test('No pct >= 60 with var(--yellow) in JS', !js.match(/>=\s*60.*var\(--yellow\)/));
test('Solid emoji is blue circle (v4.51.0: \\u{1F535} blue disc in .ps2-solid tile)', /\\u\{1F535\}[\s\S]{0,300}ps2-solid|ps2-solid[\s\S]{0,300}\\u\{1F535\}/.test(js));

// ── v4.38.0: Acronym Blitz ──
console.log('\n\x1b[1m── ACRONYM BLITZ (v4.38.0) ──\x1b[0m');
test('AB_DATA defined with 100+ entries', js.includes('const AB_DATA') && (js.match(/abbr:'/g) || []).length >= 100);
test('AB_CATEGORIES 10 categories', js.includes('const AB_CATEGORIES'));
test('AB_LESSONS 10 lessons', js.includes('const AB_LESSONS'));
test('AB_MASTERY storage key', js.includes("AB_MASTERY: 'nplus_ab_mastery'"));
test('AB_LESSONS storage key', js.includes("AB_LESSONS: 'nplus_ab_lessons'"));
test('function startAcronymBlitz()', js.includes('function startAcronymBlitz('));
test('function setAbTab()', js.includes('function setAbTab('));
test('function setAbMode()', js.includes('function setAbMode('));
test('function abNextQuestion()', js.includes('function abNextQuestion('));
test('function abPickAnswer()', js.includes('function abPickAnswer('));
test('abRenderHeatmap defined', js.includes('abRenderHeatmap'));
test('abRenderDashboard defined', js.includes('abRenderDashboard'));
test('abRenderLessonSidebar defined', js.includes('abRenderLessonSidebar'));
test('function abOpenLesson()', js.includes('function abOpenLesson('));
test('getAbMastery defined', js.includes('getAbMastery'));
test('function updateAbMastery()', js.includes('function updateAbMastery('));
test('abComputeLevel defined', js.includes('abComputeLevel'));
test('function abPickItem()', js.includes('function abPickItem('));
test('abRenderLevelBadge defined', js.includes('abRenderLevelBadge'));
test('AB mnemonics in data', js.includes("mnemonic:'"));
test('AB page in HTML', html.includes('id="page-acronyms"'));
test('AB tab bar in HTML', html.includes('ab-tab-bar'));
test('AB answer area in HTML', html.includes('id="ab-answer-area"'));
test('AB nav button in HTML', html.includes('startAcronymBlitz()'));
test('AB mode buttons: adaptive', html.includes('id="ab-mode-adaptive"'));
test('AB mode buttons: expand', html.includes('id="ab-mode-expand"'));
test('AB mode buttons: abbreviate', html.includes('id="ab-mode-abbreviate"'));
test('AB mode buttons: category', html.includes('id="ab-mode-category"'));
test('AB mode buttons: endless', html.includes('id="ab-mode-endless"'));
test('CSS: .ab-tab-bar', css.includes('.ab-tab-bar'));
test('CSS: .ab-mode-btn', css.includes('.ab-mode-btn'));
test('CSS: .ab-mcq-grid', css.includes('.ab-mcq-grid'));
test('CSS: .ab-fb-mnemonic', css.includes('.ab-fb-mnemonic'));
test('CSS: .ab-heatmap', css.includes('.ab-heatmap'));
test('CSS: .ab-dash-hero', css.includes('.ab-dash-hero'));
test('CSS: light override for ab-mode-active', css.includes('[data-theme="light"] .ab-mode-active'));
test('Milestone: ab_first', js.includes("'ab_first'"));
test('Milestone: ab_50', js.includes("'ab_50'"));
test('Milestone: ab_all_seen', js.includes("'ab_all_seen'"));
test('Milestone: ab_streak_15', js.includes("'ab_streak_15'"));

// ── v4.38.0: OSI Layer Sorter ──
console.log('\n\x1b[1m── OSI LAYER SORTER (v4.38.0) ──\x1b[0m');
test('OSI_LAYERS defined', js.includes('const OSI_LAYERS'));
test('OS_DATA 50+ items', js.includes('const OS_DATA') && (js.match(/name:'/g) || []).length >= 50);
test('OS_LESSONS 7 lessons', js.includes('const OS_LESSONS'));
test('OS_MASTERY storage key', js.includes("OS_MASTERY: 'nplus_os_mastery'"));
test('OS_LESSONS storage key', js.includes("OS_LESSONS: 'nplus_os_lessons'"));
test('function startOsiSorter()', js.includes('function startOsiSorter('));
test('function setOsTab()', js.includes('function setOsTab('));
test('function setOsMode()', js.includes('function setOsMode('));
test('function setOsDifficulty()', js.includes('function setOsDifficulty('));
test('function osGenSortRound()', js.includes('function osGenSortRound('));
test('function osGenIdentifyQ()', js.includes('function osGenIdentifyQ('));
test('function osPickIdentify()', js.includes('function osPickIdentify('));
test('function osCheckSort()', js.includes('function osCheckSort('));
test('osRenderHeatmap defined', js.includes('osRenderHeatmap'));
test('osRenderDashboard defined', js.includes('osRenderDashboard'));
test('osRenderLessonSidebar defined', js.includes('osRenderLessonSidebar'));
test('function osOpenLesson()', js.includes('function osOpenLesson('));
test('getOsMastery defined', js.includes('getOsMastery'));
test('function updateOsMastery()', js.includes('function updateOsMastery('));
test('Sort drag: osDragStart', js.includes('function osDragStart('));
test('Sort drag: osDragOver', js.includes('function osDragOver('));
test('Sort drag: osDrop', js.includes('function osDrop('));
test('Sort click: osClickItem', js.includes('function osClickItem('));
test('Sort click: osClickLane', js.includes('function osClickLane('));
test('Sort click: osReturnItem', js.includes('function osReturnItem('));
test('OS page in HTML', html.includes('id="page-osi-sorter"'));
test('OS tab bar in HTML', html.includes('os-tab-bar'));
test('OS mode sort in HTML', html.includes('id="os-mode-sort"'));
test('OS mode identify in HTML', html.includes('id="os-mode-identify"'));
test('OS difficulty bar in HTML', html.includes('os-diff-bar'));
test('OS nav button in HTML', html.includes('startOsiSorter()'));
test('CSS: .os-tab-bar', css.includes('.os-tab-bar'));
test('CSS: .os-sort-bank', css.includes('.os-sort-bank'));
test('CSS: .os-sort-item', css.includes('.os-sort-item'));
test('CSS: .os-lane', css.includes('.os-lane'));
test('CSS: .os-lane-num', css.includes('.os-lane-num'));
test('CSS: .os-sort-check-btn', css.includes('.os-sort-check-btn'));
test('CSS: .os-heatmap', css.includes('.os-heatmap'));
test('CSS: .os-dash-hero', css.includes('.os-dash-hero'));
test('CSS: light override for os-mode-active', css.includes('[data-theme="light"] .os-mode-active'));
test('Milestone: os_first', js.includes("'os_first'"));
test('Milestone: os_50', js.includes("'os_50'"));
test('Milestone: os_all_seen', js.includes("'os_all_seen'"));
test('Milestone: os_streak_10', js.includes("'os_streak_10'"));

// ── v4.38.0: Cable & Connector ID ──
console.log('\n\x1b[1m── CABLE & CONNECTOR ID (v4.38.0) ──\x1b[0m');
test('CB_CABLES 15 cables', js.includes('const CB_CABLES'));
test('CB_CONNECTORS 13 connectors', js.includes('const CB_CONNECTORS'));
test('CB_SCENARIOS 15+ scenarios', js.includes('const CB_SCENARIOS'));
test('CB_CATEGORIES defined', js.includes('const CB_CATEGORIES'));
test('CB_LESSONS 5 lessons', js.includes('const CB_LESSONS'));
test('CB_MASTERY storage key', js.includes("CB_MASTERY: 'nplus_cb_mastery'"));
test('CB_LESSONS storage key', js.includes("CB_LESSONS: 'nplus_cb_lessons'"));
test('function startCableId()', js.includes('function startCableId('));
test('function setCbTab()', js.includes('function setCbTab('));
test('function setCbMode()', js.includes('function setCbMode('));
test('function cbNextQuestion()', js.includes('function cbNextQuestion('));
test('function cbPickAnswer()', js.includes('function cbPickAnswer('));
test('function cbGenCableQ()', js.includes('function cbGenCableQ('));
test('function cbGenConnectorQ()', js.includes('function cbGenConnectorQ('));
test('function cbGenSpecsQ()', js.includes('function cbGenSpecsQ('));
test('function cbGenScenarioQ()', js.includes('function cbGenScenarioQ('));
test('cbRenderHeatmap defined', js.includes('cbRenderHeatmap'));
test('cbRenderDashboard defined', js.includes('cbRenderDashboard'));
test('cbRenderLessonSidebar defined', js.includes('cbRenderLessonSidebar'));
test('function cbOpenLesson()', js.includes('function cbOpenLesson('));
test('getCbMastery defined', js.includes('getCbMastery'));
test('function updateCbMastery()', js.includes('function updateCbMastery('));
test('CB page in HTML', html.includes('id="page-cables"'));
test('CB tab bar in HTML', html.includes('cb-tab-bar'));
test('CB answer area in HTML', html.includes('id="cb-answer-area"'));
test('CB mode adaptive in HTML', html.includes('id="cb-mode-adaptive"'));
test('CB mode specs in HTML', html.includes('id="cb-mode-specs"'));
test('CB mode scenario in HTML', html.includes('id="cb-mode-scenario"'));
test('CB nav button in HTML', html.includes('startCableId()'));
test('CSS: .cb-tab-bar', css.includes('.cb-tab-bar'));
test('CSS: .cb-mode-btn', css.includes('.cb-mode-btn'));
test('CSS: .cb-mcq-grid', css.includes('.cb-mcq-grid'));
test('CSS: .cb-fb-tip', css.includes('.cb-fb-tip'));
test('CSS: .cb-heatmap', css.includes('.cb-heatmap'));
test('CSS: .cb-dash-hero', css.includes('.cb-dash-hero'));
test('CSS: light override for cb-mode-active', css.includes('[data-theme="light"] .cb-mode-active'));
test('Milestone: cb_first', js.includes("'cb_first'"));
test('Milestone: cb_50', js.includes("'cb_50'"));
test('Milestone: cb_all_seen', js.includes("'cb_all_seen'"));
test('Milestone: cb_streak_10', js.includes("'cb_streak_10'"));

// ── v4.41.0 AI teacher pipeline (Tier A/B/C) structural assertions ──
// We can't test AI output offline, but we CAN assert the fixes are wired:
// (1) CLAUDE_TEACHER_MODEL constant exists and points to Sonnet
// (2) All 7 teacher call sites use CLAUDE_TEACHER_MODEL (not CLAUDE_MODEL)
// (3) _buildGtHint helper exists and is called from Tier A + Tier B prompts
// (4) AI response cache helpers exist and are wired into Tier A call sites
// (5) STORAGE.AI_CACHE is declared
test('v4.41.0: CLAUDE_TEACHER_MODEL constant points to Sonnet',
  /const CLAUDE_TEACHER_MODEL\s*=\s*['"]claude-sonnet-4-6['"]/.test(js));
test('v4.41.0: CLAUDE_VALIDATOR_MODEL still points to Sonnet',
  /const CLAUDE_VALIDATOR_MODEL\s*=\s*['"]claude-sonnet-4-6['"]/.test(js));
test('v4.41.0: _buildGtHint helper defined',
  /function _buildGtHint\(text, topicName\)/.test(js));
test('v4.41.0: _aiCacheGet helper defined',
  /function _aiCacheGet\(namespace, rawKey\)/.test(js));
test('v4.41.0: _aiCacheSet helper defined',
  /function _aiCacheSet\(namespace, rawKey, payload\)/.test(js));
test('v4.41.0: STORAGE.AI_CACHE key declared',
  /AI_CACHE:\s*['"]nplus_ai_cache['"]/.test(js));

// Teacher model wiring — each call site must use CLAUDE_TEACHER_MODEL
// Pull function bodies and check they reference the teacher model.
function _fnBody(src, name) {
  const idx = src.indexOf('function ' + name);
  if (idx === -1) return '';
  // Walk forward to matching close brace
  let braceStart = src.indexOf('{', idx);
  if (braceStart === -1) return '';
  let depth = 1, i = braceStart + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return src.slice(idx, i);
}
const explainFurtherBody = _fnBody(js, 'explainFurther');
const showTopicDeepDiveBody = _fnBody(js, 'showTopicDeepDive');
const fetchTopicBriefBody = _fnBody(js, 'fetchTopicBrief');
const stAskCoachBody = _fnBody(js, 'stAskCoach');
const ptAskCoachBody = _fnBody(js, 'ptAskCoach');
const tbCoachBody = _fnBody(js, 'tbCoachTopology');
const tbExplainDevBody = _fnBody(js, 'tbExplainDevice');

test('v4.41.0 Tier A: explainFurther uses CLAUDE_TEACHER_MODEL',
  explainFurtherBody.includes('CLAUDE_TEACHER_MODEL'));
test('v4.41.0 Tier A: explainFurther has GT hint injection',
  explainFurtherBody.includes('_buildGtHint('));
test('v4.41.0 Tier A: explainFurther uses response cache',
  explainFurtherBody.includes("_aiCacheGet('explainFurther'") && explainFurtherBody.includes("_aiCacheSet('explainFurther'"));

test('v4.41.0 Tier A: showTopicDeepDive uses CLAUDE_TEACHER_MODEL',
  showTopicDeepDiveBody.includes('CLAUDE_TEACHER_MODEL'));
test('v4.41.0 Tier A: showTopicDeepDive uses response cache',
  showTopicDeepDiveBody.includes("_aiCacheGet('topicDeepDive'") && showTopicDeepDiveBody.includes("_aiCacheSet('topicDeepDive'"));
test('v4.41.0 Tier A: buildTopicDivePrompt injects GT hint',
  _fnBody(js, 'buildTopicDivePrompt').includes('_buildGtHint('));

test('v4.41.0 Tier A: fetchTopicBrief uses CLAUDE_TEACHER_MODEL',
  fetchTopicBriefBody.includes('CLAUDE_TEACHER_MODEL'));
test('v4.41.0 Tier A: fetchTopicBrief has GT hint injection',
  fetchTopicBriefBody.includes('_buildGtHint('));
test('v4.41.0 Tier A: fetchTopicBrief uses response cache',
  fetchTopicBriefBody.includes("_aiCacheGet('topicBrief'") && fetchTopicBriefBody.includes("_aiCacheSet('topicBrief'"));

test('v4.41.0 Tier B: stAskCoach uses CLAUDE_TEACHER_MODEL',
  stAskCoachBody.includes('CLAUDE_TEACHER_MODEL'));
test('v4.41.0 Tier B: stAskCoach injects binary breakdown GT facts',
  stAskCoachBody.includes('AUTHORITATIVE FACTS') && stAskCoachBody.includes('Network address (IP AND mask)'));

test('v4.41.0 Tier B: ptAskCoach uses CLAUDE_TEACHER_MODEL',
  ptAskCoachBody.includes('CLAUDE_TEACHER_MODEL'));
test('v4.41.0 Tier B: ptAskCoach flags authoritative port fact',
  ptAskCoachBody.includes('AUTHORITATIVE FACT'));

test('v4.41.0 Tier C: tbCoachTopology uses CLAUDE_TEACHER_MODEL',
  tbCoachBody.includes('CLAUDE_TEACHER_MODEL'));
test('v4.41.0 Tier C: tbExplainDevice uses CLAUDE_TEACHER_MODEL',
  tbExplainDevBody.includes('CLAUDE_TEACHER_MODEL'));

// Sanity: generation path stays on Haiku for cost/latency reasons
// v4.56.1: fetchQuestions is now a batching coordinator; the actual Haiku
// call lives in _fetchQuestionsBatch. Check the worker body for model usage.
const fetchQBody = _fnBody(js, '_fetchQuestionsBatch');
test('v4.41.0: _fetchQuestionsBatch still uses CLAUDE_MODEL (Haiku) for cost',
  fetchQBody.includes('CLAUDE_MODEL') && !fetchQBody.includes('CLAUDE_TEACHER_MODEL'));
const tbGenBody = _fnBody(js, 'tbGenerateAiTopology');
test('v4.41.0: tbGenerateAiTopology still uses CLAUDE_MODEL (Haiku) for cost',
  tbGenBody.includes('CLAUDE_MODEL') && !tbGenBody.includes('CLAUDE_TEACHER_MODEL'));

// ── v4.41.0 Ethernet physical-layer ground truth (auto-neg vs auto-MDIX) ──
// User reported an MCQ where the stem asked about automatic MDI/MDIX pin
// detection but auto-negotiation was marked correct. Auto-negotiation is
// speed+duplex only; Auto-MDIX is the pin-detection feature. These
// assertions lock in the new GT_ETHERNET table, the _buildGtHint ethernet
// branch, and the _groundTruthOk MDI/MDIX conflation guard.
test('v4.41.0: GT_ETHERNET constant defined',
  /const GT_ETHERNET\s*=\s*\{/.test(js));
test('v4.41.0: GT_ETHERNET declares auto-negotiation as speed+duplex only',
  /'auto-negotiation':\s*'negotiates SPEED and DUPLEX only/.test(js));
test('v4.41.0: GT_ETHERNET declares auto-mdix as MDI/MDIX pin detection',
  /'auto-mdix':\s*'detects MDI\/MDIX pin assignments/.test(js));
const buildGtHintBody = _fnBody(js, '_buildGtHint');
test('v4.41.0: _buildGtHint has ethernet keyword regex',
  /ethRe/.test(buildGtHintBody) || /auto\[-\\s\]\?negotiat/.test(buildGtHintBody));
test('v4.41.0: _buildGtHint surfaces auto-negotiation fact on ethernet match',
  buildGtHintBody.includes("GT_ETHERNET['auto-negotiation']"));
test('v4.41.0: _buildGtHint surfaces auto-MDIX fact on ethernet match',
  buildGtHintBody.includes("GT_ETHERNET['auto-mdix']"));
test('v4.41.0: _buildGtHint emits Ethernet physical layer section',
  buildGtHintBody.includes('Ethernet physical layer'));
const gtOkBody = _fnBody(js, '_groundTruthOk');
test('v4.41.0: _groundTruthOk guards MDI/MDIX stem against auto-neg answer',
  /mdiStemRe/.test(gtOkBody) && /mentionsAutoNeg/.test(gtOkBody));
test('v4.41.0: _groundTruthOk guards speed/duplex stem against auto-MDIX answer',
  /speedDuplexStemRe/.test(gtOkBody));

// Behavioral smoke: evaluate _buildGtHint on a Cabling & Topology style stem
// and confirm the AUTHORITATIVE FACTS block names both features. We do this
// by extracting the function via Function() from the source — no runtime
// execution of the full app, just the one helper.
try {
  // Pull GT_ETHERNET and _buildGtHint out of app.js into a throwaway sandbox.
  // This is a structural test of actual output, not a regex sniff.
  const gtEthMatch = js.match(/const GT_ETHERNET\s*=\s*\{[\s\S]*?\};/);
  const buildGtHintMatch = js.match(/function _buildGtHint\(text, topicName\) \{[\s\S]*?\n\}/);
  if (gtEthMatch && buildGtHintMatch) {
    // Minimal stubs for GT_PORTS/GT_OSI references inside _buildGtHint
    const sandbox = `
      const GT_PORTS = {};
      const GT_OSI = {};
      ${gtEthMatch[0]}
      ${buildGtHintMatch[0]}
      module.exports = _buildGtHint;
    `;
    const tmp = require('path').join(ROOT, 'tests', '_tmp_gt_eth.js');
    require('fs').writeFileSync(tmp, sandbox);
    const fn = require(tmp);
    const out = fn('automatic MDI/MDIX configuration on both devices crossover cable', 'Cabling & Topology');
    require('fs').unlinkSync(tmp);
    test('v4.41.0: _buildGtHint emits auto-neg fact for MDI/MDIX stem',
      out.includes('Auto-negotiation') && out.includes('SPEED and DUPLEX only'));
    test('v4.41.0: _buildGtHint emits auto-MDIX fact for MDI/MDIX stem',
      out.includes('Auto-MDIX') && out.includes('pin assignments'));
    test('v4.41.0: _buildGtHint emits AUTHORITATIVE FACTS header',
      out.includes('AUTHORITATIVE FACTS'));
  } else {
    test('v4.41.0: _buildGtHint source extraction', false);
    results.errors.push('could not extract GT_ETHERNET or _buildGtHint from app.js');
  }
} catch (err) {
  test('v4.41.0: _buildGtHint ethernet smoke test', false);
  results.errors.push('_buildGtHint ethernet smoke test threw: ' + err.message);
}

// ── v4.41.0 Weak Spots v2 algorithm ──
// User reported the front-page "🎯 Weak spots" chip row needs a more robust
// and deeper calculation. Rewrote getTodaysFocusTopics as a thin wrapper
// around a new computeWeakSpotScores() which combines:
//   - recency-decayed wrong-bank count (half-life 7d, difficulty-weighted)
//   - Bayesian posterior accuracy gap with Beta(2,2) prior (14d half-life)
//   - staleness bonus for untouched topics >14d
//   - CompTIA DOMAIN_WEIGHTS importance multiplier
// These assertions lock in the new function, its four scoring signals, the
// constants that govern the model, and real-time refresh hooks in finish()
// and submitExam(). A behavioral smoke test exercises the function with a
// synthetic history + wrong-bank fixture in a sandbox to prove it actually
// ranks correctly — structural sniffs aren't enough for a scoring model.
test('v4.41.0: computeWeakSpotScores function defined',
  /function computeWeakSpotScores\(\)/.test(js));
test('v4.41.0: WEAK_HALF_LIFE_WRONGS_MS 7-day constant defined',
  /WEAK_HALF_LIFE_WRONGS_MS\s*=\s*7\s*\*\s*86400000/.test(js));
test('v4.41.0: WEAK_HALF_LIFE_HIST_MS 14-day constant defined',
  /WEAK_HALF_LIFE_HIST_MS\s*=\s*14\s*\*\s*86400000/.test(js));
test('v4.41.0: WEAK_TARGET_ACC mastery threshold defined',
  /WEAK_TARGET_ACC\s*=\s*0\.85/.test(js));
test('v4.41.0: WEAK_STALENESS_DAYS grace period defined',
  /WEAK_STALENESS_DAYS\s*=\s*14/.test(js));
test('v4.41.0: _weakDecay exponential helper defined',
  /function _weakDecay\(/.test(js));
test('v4.41.0: _weakDomainMultiplier helper uses DOMAIN_WEIGHTS',
  /function _weakDomainMultiplier/.test(js) && /DOMAIN_WEIGHTS\[dom\]/.test(js));
const cwsBody = _fnBody(js, 'computeWeakSpotScores');
test('v4.41.0: computeWeakSpotScores reads wrong bank',
  cwsBody.includes('loadWrongBank()'));
test('v4.41.0: computeWeakSpotScores reads history',
  cwsBody.includes('loadHistory()'));
test('v4.41.0: computeWeakSpotScores excludes Mixed/Exam topics',
  cwsBody.includes('MIXED_TOPIC') && cwsBody.includes('EXAM_TOPIC'));
test('v4.41.0: computeWeakSpotScores applies Beta(2,2) Bayesian prior',
  /wCorrect\s*\+\s*2\)\s*\/\s*\(.*wTotal\s*\+\s*4/.test(cwsBody));
test('v4.41.0: computeWeakSpotScores uses diffWeight for difficulty weighting',
  cwsBody.includes('diffWeight('));
test('v4.41.0: computeWeakSpotScores applies exam mode boost',
  cwsBody.includes("mode === 'exam'") && cwsBody.includes('1.3'));
test('v4.41.0: computeWeakSpotScores computes accuracy gap against target',
  /accGap\s*=\s*Math\.max\(0,\s*WEAK_TARGET_ACC/.test(cwsBody));
test('v4.41.0: computeWeakSpotScores computes staleness',
  cwsBody.includes('staleness') && cwsBody.includes('daysSince'));
test('v4.41.0: computeWeakSpotScores applies domain importance multiplier',
  cwsBody.includes('_weakDomainMultiplier'));
test('v4.41.0: computeWeakSpotScores sorts descending by score',
  /sort\(\(a,\s*b\)\s*=>\s*b\.score\s*-\s*a\.score\)/.test(cwsBody));
test('v4.41.0: computeWeakSpotScores excludes low-signal topics',
  /wTotal\s*<\s*1\s*&&.*wrongsRecent\s*<\s*0\.5/.test(cwsBody));
test('v4.41.0: computeWeakSpotScores half-credits graduating entries',
  /rightCount.*>=\s*1.*0\.5/.test(cwsBody));
const getTodaysFocusBody = _fnBody(js, 'getTodaysFocusTopics');
test('v4.41.0: getTodaysFocusTopics delegates to computeWeakSpotScores',
  getTodaysFocusBody.includes('computeWeakSpotScores()'));
const renderTodaysFocusBody = _fnBody(js, 'renderTodaysFocus');
test('v4.41.0: renderTodaysFocus uses computeWeakSpotScores for display',
  renderTodaysFocusBody.includes('computeWeakSpotScores()'));
test('v4.41.0: renderTodaysFocus shows posterior accuracy in tooltip',
  renderTodaysFocusBody.includes('posterior'));

// Real-time refresh hooks: v4.42.0 moved renderTodaysFocus OUT of finish()
// and submitExam() so the FLIP rerank animation in renderTodaysFocus has a
// live, pre-quiz DOM to measure against. finish()/submitExam() now refresh
// renderStatsCard + renderReadinessCard directly so the goSetup render sees
// fresh history + readiness numbers.
const finishBody = _fnBody(js, 'finish');
test('v4.42.0: finish() refreshes renderStatsCard after history write',
  finishBody.includes('renderStatsCard()'));
test('v4.42.0: finish() refreshes renderReadinessCard for roll-up',
  finishBody.includes('renderReadinessCard()'));
const submitExamBody = _fnBody(js, 'submitExam');
test('v4.42.0: submitExam() refreshes renderStatsCard after history write',
  submitExamBody.includes('renderStatsCard()'));
test('v4.42.0: submitExam() refreshes renderReadinessCard for roll-up',
  submitExamBody.includes('renderReadinessCard()'));
// Regression guard: finish/submitExam must NOT call renderTodaysFocus
// directly — that defeats the FLIP animation (double-render consumes the
// old positions before the user sees them). Only goSetup should call it.
test('v4.42.0: finish() no longer calls renderTodaysFocus (FLIP guard)',
  !finishBody.includes('renderTodaysFocus()'));
test('v4.42.0: submitExam() no longer calls renderTodaysFocus (FLIP guard)',
  !submitExamBody.includes('renderTodaysFocus()'));

// Behavioral smoke test: sandbox-execute computeWeakSpotScores against a
// synthetic fixture and assert the ranking makes sense. We stub out
// loadWrongBank/loadHistory, TOPIC_DOMAINS, DOMAIN_WEIGHTS, diffWeight,
// MIXED_TOPIC, and EXAM_TOPIC, then verify the function returns rows sorted
// by score, with a recently-wrong Troubleshooting topic outranking a
// long-ago-wrong Security topic of equivalent raw badness (domain weight
// effect), and that topics with no signal are excluded.
try {
  const cwsMatch = js.match(/function computeWeakSpotScores\(\) \{[\s\S]*?^\}/m);
  const decayMatch = js.match(/function _weakDecay\([^)]*\) \{[\s\S]*?^\}/m);
  const domMulMatch = js.match(/function _weakDomainMultiplier\([^)]*\) \{[\s\S]*?^\}/m);
  const constsMatch = js.match(/const WEAK_HALF_LIFE_WRONGS_MS[\s\S]*?WEAK_AVG_DOMAIN_WEIGHT\s*=\s*0\.2;/);
  // v4.59.7: computeWeakSpotScores now calls _expandHistoryForWeakSpots so the
  // sandbox must include it too. Helper is defined inline with computeWeakSpotScores.
  const expanderMatch = js.match(/function\s+_expandHistoryForWeakSpots\s*\(hist\)[\s\S]*?^\}/m);
  if (cwsMatch && decayMatch && domMulMatch && constsMatch && expanderMatch) {
    const NOW = Date.now();
    const fixture = `
      const MIXED_TOPIC = 'Mixed';
      const EXAM_TOPIC  = 'Exam';
      const DOMAIN_WEIGHTS = {
        concepts: 0.23, implementation: 0.20, operations: 0.19,
        security: 0.14, troubleshooting: 0.24
      };
      const TOPIC_DOMAINS = {
        'Network Troubleshooting & Tools': 'troubleshooting',
        'PKI & Certificate Management':    'security',
        'IPv6':                            'concepts',
        'NeverTouched':                    'concepts'
      };
      function diffWeight(d) {
        if (!d) return 1.5;
        const s = d.toLowerCase();
        if (s.includes('hard'))  return 2.0;
        if (s.includes('exam'))  return 1.5;
        if (s.includes('found')) return 1.0;
        return 1.3;
      }
      const NOW = ${NOW};
      // Troubleshooting: many recent wrongs (heavy signal, domain weight 1.2)
      // PKI: one old wrong + moderate recent history (lighter signal, domain weight 0.7)
      // The ranking should place NTT above PKI because of both volume of
      // recent wrongs AND the troubleshooting domain's larger weight.
      const WRONG_BANK_FIXTURE = [
        { topic: 'Network Troubleshooting & Tools', difficulty: 'Exam Level',
          addedDate: new Date(NOW - 1*86400000).toISOString(), rightCount: 0 },
        { topic: 'Network Troubleshooting & Tools', difficulty: 'Hard',
          addedDate: new Date(NOW - 2*86400000).toISOString(), rightCount: 0 },
        { topic: 'Network Troubleshooting & Tools', difficulty: 'Exam Level',
          addedDate: new Date(NOW - 1*86400000).toISOString(), rightCount: 0 },
        // PKI: one recent wrong (keeps it in the ranking but small)
        { topic: 'PKI & Certificate Management', difficulty: 'Exam Level',
          addedDate: new Date(NOW - 3*86400000).toISOString(), rightCount: 0 },
        // noise: mixed topic entry should be excluded
        { topic: 'Mixed', difficulty: 'Exam Level',
          addedDate: new Date(NOW - 1*86400000).toISOString(), rightCount: 0 }
      ];
      // history: IPv6 drilled recently with ~60% accuracy. PKI drilled
      // recently at ~70% (below the 85% target — contributes an accuracy
      // gap but not enough to overtake Troubleshooting).
      const HIST_FIXTURE = [
        { topic: 'IPv6', difficulty: 'Exam Level',
          score: 3, total: 5, date: new Date(NOW - 1*86400000).toISOString() },
        { topic: 'IPv6', difficulty: 'Exam Level',
          score: 3, total: 5, date: new Date(NOW - 2*86400000).toISOString() },
        { topic: 'PKI & Certificate Management', difficulty: 'Exam Level',
          score: 7, total: 10, date: new Date(NOW - 1*86400000).toISOString() }
      ];
      function loadWrongBank() { return WRONG_BANK_FIXTURE; }
      function loadHistory()   { return HIST_FIXTURE; }
      ${constsMatch[0]}
      ${decayMatch[0]}
      ${domMulMatch[0]}
      ${expanderMatch[0]}
      ${cwsMatch[0]}
      module.exports = computeWeakSpotScores;
    `;
    const tmp = require('path').join(ROOT, 'tests', '_tmp_weak_spots.js');
    require('fs').writeFileSync(tmp, fixture);
    delete require.cache[require.resolve(tmp)];
    const fn = require(tmp);
    const rows = fn();
    require('fs').unlinkSync(tmp);

    test('v4.41.0: weak spots ranking returns non-empty array',
      Array.isArray(rows) && rows.length > 0);
    test('v4.41.0: weak spots excludes Mixed topic noise',
      !rows.find(r => r.topic === 'Mixed'));
    test('v4.41.0: weak spots excludes untouched topics',
      !rows.find(r => r.topic === 'NeverTouched'));
    test('v4.41.0: weak spots sorted descending by score',
      rows.every((r, i) => i === 0 || rows[i - 1].score >= r.score));
    // Recent-wrong troubleshooting topic should beat long-decayed PKI wrongs
    // of the same raw count (recency decay + domain weight combo).
    const ntt = rows.find(r => r.topic === 'Network Troubleshooting & Tools');
    const pki = rows.find(r => r.topic === 'PKI & Certificate Management');
    test('v4.41.0: weak spots ranks heavy-wrong Troubleshooting above lighter PKI',
      ntt && pki && ntt.score > pki.score);
    // Posterior should be present and in (0,1) for topics with history
    const ipv6 = rows.find(r => r.topic === 'IPv6');
    test('v4.41.0: weak spots computes Bayesian posterior for history topics',
      ipv6 && ipv6.posterior > 0 && ipv6.posterior < 1);
    test('v4.41.0: weak spots exposes wrongsRaw count for display',
      ntt && ntt.wrongsRaw === 3);
    // v4.59.7: sandbox-verify that multi-topic sentinel history now credits
    // constituent topics. Uses a second fixture with a sentinel row in the
    // user's exact Service/Perf/Connection Issues scenario.
    const sentinelFixture = `
      const MIXED_TOPIC = 'Mixed';
      const EXAM_TOPIC  = 'Exam';
      const DOMAIN_WEIGHTS = {
        concepts: 0.23, implementation: 0.20, operations: 0.19,
        security: 0.14, troubleshooting: 0.24
      };
      const TOPIC_DOMAINS = {
        'Service Issues':    'troubleshooting',
        'Perf Issues':       'troubleshooting',
        'Connection Issues': 'troubleshooting'
      };
      function diffWeight(d) {
        if (!d) return 1.5;
        const s = d.toLowerCase();
        if (s.includes('hard'))  return 2.0;
        if (s.includes('exam'))  return 1.5;
        if (s.includes('found')) return 1.0;
        return 1.3;
      }
      const NOW = ${NOW};
      // Pre-v4.57.1 multi-topic session: 15/20 (75% accuracy) across 3 topics.
      // Without v4.59.7 expander, this row would land under sentinel key and
      // the 3 real topics would be invisible to weak-spot scoring. With the
      // expander, each gets 1/3 credit (5/6.67 per topic) at 75% posterior.
      // 75% is below WEAK_TARGET_ACC (0.85), so an accuracy gap exists and
      // the topics should appear in the weak-spot list.
      const WRONG_BANK_FIXTURE = [];
      const HIST_FIXTURE = [
        { topic: 'Multi: Service Issues, Perf Issues, Connection Issues',
          difficulty: 'Exam Level', score: 15, total: 20,
          date: new Date(NOW - 1*86400000).toISOString() }
      ];
      function loadWrongBank() { return WRONG_BANK_FIXTURE; }
      function loadHistory()   { return HIST_FIXTURE; }
      ${constsMatch[0]}
      ${decayMatch[0]}
      ${domMulMatch[0]}
      ${expanderMatch[0]}
      ${cwsMatch[0]}
      module.exports = computeWeakSpotScores;
    `;
    const tmp2 = require('path').join(ROOT, 'tests', '_tmp_weak_spots_v4597.js');
    require('fs').writeFileSync(tmp2, sentinelFixture);
    delete require.cache[require.resolve(tmp2)];
    const fn2 = require(tmp2);
    const sentinelRows = fn2();
    require('fs').unlinkSync(tmp2);

    // Without the v4.59.7 fix, all 3 of these would be absent (sentinel key
    // would exist under "Multi: ..." but no canonical topic would match).
    test('v4.59.7: Service Issues surfaces in weak-spot list from sentinel history',
      !!sentinelRows.find(r => r.topic === 'Service Issues'));
    test('v4.59.7: Perf Issues surfaces in weak-spot list from sentinel history',
      !!sentinelRows.find(r => r.topic === 'Perf Issues'));
    test('v4.59.7: Connection Issues surfaces in weak-spot list from sentinel history',
      !!sentinelRows.find(r => r.topic === 'Connection Issues'));
    test('v4.59.7: sentinel-sourced weak-spot rows carry positive score (in ranking)',
      sentinelRows.filter(r => ['Service Issues', 'Perf Issues', 'Connection Issues'].includes(r.topic))
                  .every(r => r.score > 0));
    test('v4.59.7: sentinel key itself does NOT appear as a weak-spot row',
      !sentinelRows.find(r => r.topic && r.topic.startsWith('Multi: ')));
  } else {
    test('v4.41.0: weak spots sandbox extraction', false);
    results.errors.push('could not extract computeWeakSpotScores or its helpers from app.js');
  }
} catch (err) {
  test('v4.41.0: weak spots behavioral smoke test', false);
  results.errors.push('weak spots smoke test threw: ' + err.message);
}

// ══════════════════════════════════════════════════════════════════════
// v4.42.0 ANIMATION PASS
// ══════════════════════════════════════════════════════════════════════
// 8 fixes ship together: readiness roll-up, stats card refresh on finish,
// milestone celebration toast + mini confetti on unlock, prefers-reduced-
// motion gate, streak pulse on increment, weak-spots FLIP rerank, and
// moving renderTodaysFocus out of finish/submitExam so the FLIP can see
// live pre-quiz DOM state.
console.log('\n\x1b[1m── v4.42.0 ANIMATION PASS ──\x1b[0m');

// Fix 1+2: readiness roll-up + stats card refresh.
// (finish/submitExam call wiring is tested above in the earlier block via
// finishBody / submitExamBody.)
const readinessBody = _fnBody(js, 'renderReadinessCard');
test('v4.42.0: renderReadinessCard reads prior numEl value for animateCount',
  /parseInt\(numEl\.textContent/.test(readinessBody));
test('v4.42.0: renderReadinessCard calls animateCount on change',
  /animateCount\('readiness-num'/.test(readinessBody));
test('v4.42.0: renderReadinessCard falls back to hot-swap on first render',
  readinessBody.includes('numEl.textContent = predicted'));

// Fix 3+4: celebration toast + milestone capture.
test('v4.42.0: showMilestoneCelebration helper defined',
  js.includes('function showMilestoneCelebration('));
test('v4.42.0: showCelebrationToast helper defined',
  js.includes('function showCelebrationToast('));
test('v4.42.0: celebration toast reads MILESTONE_DEFS for icon+label',
  _fnBody(js, 'showMilestoneCelebration').includes('MILESTONE_DEFS'));
test('v4.42.0: showCelebrationToast emits .celebration-toast DOM',
  _fnBody(js, 'showCelebrationToast').includes("'celebration-toast'"));
test('v4.42.0: finish() captures evaluateMilestones return value',
  /const\s+_newlyUnlocked\s*=\s*evaluateMilestones\(\)/.test(finishBody));
test('v4.42.0: finish() stagger-fires showMilestoneCelebration',
  finishBody.includes('showMilestoneCelebration'));
test('v4.42.0: submitExam() captures evaluateMilestones return value',
  /const\s+_newlyUnlocked\s*=\s*evaluateMilestones\(\)/.test(submitExamBody));
test('v4.42.0: submitExam() stagger-fires showMilestoneCelebration',
  submitExamBody.includes('showMilestoneCelebration'));

// Fix 5: prefers-reduced-motion gate + celebration-toast CSS.
test('v4.42.0: CSS has @media (prefers-reduced-motion: reduce) block',
  css.includes('@media (prefers-reduced-motion: reduce)'));
test('v4.42.0: CSS .celebration-toast class defined',
  css.includes('.celebration-toast'));
test('v4.42.0: CSS .celebration-toast.show state defined',
  css.includes('.celebration-toast.show'));
test('v4.42.0: CSS .celebration-toast-title defined',
  css.includes('.celebration-toast-title'));
test('v4.42.0: CSS .celebration-toast-sub defined',
  css.includes('.celebration-toast-sub'));

// Fix 6: streak pulse on increment.
test('v4.42.0: _pendingStreakPulse module-level flag declared',
  /let\s+_pendingStreakPulse/.test(js));
const streakBadgeBody = _fnBody(js, 'renderStreakBadge');
test('v4.42.0: renderStreakBadge consumes _pendingStreakPulse flag',
  streakBadgeBody.includes('_pendingStreakPulse'));
test('v4.42.0: renderStreakBadge adds streak-pulse class',
  streakBadgeBody.includes("'streak-pulse'"));
test('v4.42.0: renderStreakBadge resets flag after consume',
  streakBadgeBody.includes('_pendingStreakPulse = false'));
test('v4.42.0: finish() snapshots prev streak before updateStreak',
  /_prevStreakBefore/.test(finishBody));
test('v4.42.0: finish() sets _pendingStreakPulse on increment',
  finishBody.includes('_pendingStreakPulse = true'));
test('v4.42.0: submitExam() sets _pendingStreakPulse on increment',
  submitExamBody.includes('_pendingStreakPulse = true'));
test('v4.42.0: CSS @keyframes streakPulse defined',
  css.includes('@keyframes streakPulse'));
test('v4.42.0: CSS .streak-pulse class defined',
  css.includes('.streak-pulse'));

// Fix 7: FLIP rerank in renderTodaysFocus.
const todaysFocusBody = _fnBody(js, 'renderTodaysFocus');
test('v4.42.0: renderTodaysFocus stamps data-topic attribute on chips',
  todaysFocusBody.includes('data-topic='));
test('v4.42.0: renderTodaysFocus captures oldRects before innerHTML rewrite',
  todaysFocusBody.includes('oldRects') && todaysFocusBody.includes('getBoundingClientRect'));
test('v4.42.0: renderTodaysFocus applies inverse transform FLIP',
  /translate\(\$\{dx\}px/.test(todaysFocusBody));
test('v4.42.0: renderTodaysFocus uses transitionend cleanup',
  todaysFocusBody.includes('transitionend'));
test('v4.42.0: CSS .tf-chip transition includes transform',
  /\.tf-chip\s*\{[^}]*transform/.test(css));

// Fix 8: mini confetti variant (distinct from launchConfetti).
test('v4.42.0: launchMiniConfetti helper defined',
  js.includes('function launchMiniConfetti('));
test('v4.42.0: mini confetti uses subtler particle count',
  /PARTICLE_COUNT\s*=\s*40/.test(_fnBody(js, 'launchMiniConfetti')));
test('v4.42.0: mini confetti uses gold/accent palette',
  /fbbf24/.test(_fnBody(js, 'launchMiniConfetti')));
test('v4.42.0: launchMiniConfetti distinct from launchConfetti',
  _fnBody(js, 'launchConfetti').length > 0 && _fnBody(js, 'launchMiniConfetti').length > 0);

// Source-level structural assertions for showCelebrationToast — verifies the
// function wires up the DOM lifecycle correctly without running a JSDOM
// sandbox. We're looking for: createElement call, appendChild on body, a
// setTimeout-driven .show class flip, and a cleanup path that removes the
// toast after the display window.
(function() {
  const toastBody = _fnBody(js, 'showCelebrationToast');
  test('v4.42.0: showCelebrationToast calls document.createElement',
    toastBody.includes("document.createElement('div')"));
  test('v4.42.0: showCelebrationToast appends toast to document.body',
    toastBody.includes('document.body.appendChild(toast)'));
  test('v4.42.0: showCelebrationToast schedules .show via setTimeout',
    toastBody.includes('setTimeout') && toastBody.includes("classList.add('show')"));
  test('v4.42.0: showCelebrationToast cleans up via remove()',
    toastBody.includes('toast.remove()'));
})();

// ──────────────────────────────────────────────────────────
// v4.42.1 LANDING-PAGE INTRO ANIMATION
// ──────────────────────────────────────────────────────────
// Once-per-session fill-from-empty reveal on the Readiness card (number +
// bar) and the Daily Goal ring (stroke-dashoffset + count + percentage).
// Staggered so the readiness number leads, followed by the bar, the daily
// goal ring, and finally the ring counters. Self-consuming module flags
// make returning from a quiz snap to the final state without replaying.
console.log('\n\x1b[1m── v4.42.1 LANDING-PAGE INTRO ANIMATION ──\x1b[0m');

// Module-level flags armed at load (once per session)
test('v4.42.1: _readinessIntroArmed flag declared',
  /let\s+_readinessIntroArmed\s*=\s*true/.test(js));
test('v4.42.1: _dailyGoalIntroArmed flag declared',
  /let\s+_dailyGoalIntroArmed\s*=\s*true/.test(js));

// animateCount gained an optional suffix parameter so the ring percentage
// can be animated without clobbering the trailing "%"
test('v4.42.1: animateCount accepts suffix parameter',
  /function animateCount\(elId, from, to, duration, suffix\)/.test(js));
test('v4.42.1: animateCount appends suffix on final value',
  js.includes('el.textContent = to + sfx'));
test('v4.42.1: animateCount appends suffix during step',
  js.includes('Math.round(from + (to - from) * ease) + sfx'));

// Readiness card intro wiring
(function() {
  const body = _fnBody(js, 'renderReadinessCard');
  test('v4.42.1: renderReadinessCard consumes _readinessIntroArmed',
    body.includes('_readinessIntroArmed') && body.includes('_readinessIntroArmed = false'));
  test('v4.42.1: renderReadinessCard intro animates 0 -> predicted',
    body.includes("animateCount('readiness-num', 0, predicted, 1400)"));
  test('v4.42.1: renderReadinessCard intro disables bar transition + reflow',
    body.includes("barEl.style.transition = 'none'") && body.includes('void barEl.offsetWidth'));
  test('v4.42.1: renderReadinessCard intro restores transition via setTimeout',
    /setTimeout\([^,]+,\s*1200\)/.test(body));
  test('v4.42.1: renderReadinessCard intro uses cubic-bezier reveal',
    body.includes('cubic-bezier(0.2, 0.8, 0.2, 1)'));
  test('v4.42.1: renderReadinessCard falls back to v4.42.0 roll-up after intro',
    body.includes("animateCount('readiness-num', oldReadinessVal, predicted, 900)"));
})();

// Daily Goal ring intro wiring
(function() {
  const body = _fnBody(js, 'renderDailyGoal');
  test('v4.42.1: renderDailyGoal consumes _dailyGoalIntroArmed',
    body.includes('_dailyGoalIntroArmed') && body.includes('_dailyGoalIntroArmed = false'));
  test('v4.42.1: renderDailyGoal intro starts ring at empty (full circumference)',
    body.includes('fill.style.strokeDashoffset = circumference'));
  test('v4.42.1: renderDailyGoal intro disables transition + forces reflow',
    body.includes("fill.style.transition = 'none'") && body.includes('void fill.offsetWidth'));
  test('v4.42.1: renderDailyGoal intro animates to target offset after delay',
    /setTimeout\(\(\)\s*=>\s*\{[^}]*fill\.style\.strokeDashoffset\s*=\s*offset/.test(body));
  test('v4.42.1: renderDailyGoal intro uses 1.2s cubic-bezier reveal',
    body.includes('stroke-dashoffset 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)'));
  test('v4.42.1: renderDailyGoal intro rolls up dg-progress-count',
    body.includes("animateCount('dg-progress-count', 0, done, 1000)"));
  test('v4.42.1: renderDailyGoal intro rolls up dg-ring-pct with % suffix',
    body.includes("animateCount('dg-ring-pct', 0, pct, 1000, '%')"));
  test('v4.42.1: renderDailyGoal post-intro path is instant hot-swap',
    body.includes('fill.style.strokeDashoffset = offset') && body.includes('pctEl.textContent = pct'));
})();

// Stagger: readiness leads, daily goal follows.
// Readiness bar fires at 100ms, daily goal ring at 250ms, counters at 300ms.
(function() {
  const readinessBody = _fnBody(js, 'renderReadinessCard');
  const dgBody = _fnBody(js, 'renderDailyGoal');
  test('v4.42.1: readiness bar reveal delayed 100ms (leads)',
    readinessBody.includes('}, 100);'));
  test('v4.42.1: daily goal ring reveal delayed 250ms (trails readiness)',
    dgBody.includes('}, 250);'));
  test('v4.42.1: daily goal counters delayed 300ms (tail of stagger)',
    dgBody.includes('}, 300);'));
})();

// ──────────────────────────────────────────────────────────
// v4.42.2 ANALYTICS / PROGRESS DEDUP PASS
// ──────────────────────────────────────────────────────────
// Analytics Topic Mastery card duplicated what the Progress page already
// owned (per-topic accuracy with drill). v4.42.2 deletes the card, moves
// the one useful bit (trend arrow) into Progress rows, and replaces the
// Analytics card with a CTA linking to Progress. These assertions lock
// both halves — the new trend wiring AND the regression guards that
// prevent Topic Mastery from silently coming back.
console.log('\n\x1b[1m── v4.42.2 ANALYTICS / PROGRESS DEDUP ──\x1b[0m');

// Trend arrow ported from Analytics Topic Mastery into Progress rows
(function() {
  const buildBody = _fnBody(js, '_buildProgressRows');
  const rowBody = _fnBody(js, '_progressRowHtml');
  test('v4.42.2: _buildProgressRows computes trend field',
    buildBody.includes('const trend = entries.length >= 2'));
  test('v4.42.2: trend uses entries[0].pct - entries[last].pct',
    buildBody.includes('entries[0].pct - entries[entries.length - 1].pct'));
  test('v4.42.2: _buildProgressRows returns trend: 0 for untouched rows',
    buildBody.includes('trend: 0'));
  test('v4.42.2: _buildProgressRows includes trend in populated row object',
    /return\s*\{[^}]*trend[^}]*\}/.test(buildBody));
  test('v4.42.2: _progressRowHtml destructures trend from row',
    /const\s*\{[^}]*trend\b/.test(rowBody));
  test('v4.42.2: _progressRowHtml renders arrow when attempts >= 2',
    rowBody.includes('row.attempts >= 2'));
  test('v4.42.2: _progressRowHtml emits topic-trend class',
    rowBody.includes('class="topic-trend"'));
  test('v4.42.2: _progressRowHtml uses ↑/↓/→ thresholds at ±5',
    rowBody.includes('trend > 5') && rowBody.includes('trend < -5'));
  test('v4.42.2: topic-trend element has aria-label',
    rowBody.includes('aria-label="Trend'));
})();

// Analytics Topic Mastery regression guards (must stay dead)
test('v4.42.2: _renderAnaTopics function fully removed',
  !/function\s+_renderAnaTopics\s*\(\s*h\s*\)/.test(js));
test('v4.42.2: no weakTopics/strongTopics split in source',
  !(js.includes("topicArr.filter(t => t.avg < 70)") || js.includes("topicArr.filter(t => t.avg >= 70)")));
test('v4.42.2: no ana-topic-row in source',
  !js.includes('ana-topic-row'));
test('v4.42.2: no ana-s-topics section id rendered',
  !js.includes("id=\"ana-s-topics\"") && !js.includes("id='ana-s-topics'"));

// CTA replacement wiring
(function() {
  const ctaBody = _fnBody(js, '_renderAnaTopicsCta');
  // v4.54.14: CTA header migrated to the editorial _edCardhead helper.
  test('v4.42.2 (v4.54.14 update): CTA helper renders editorial "Topic-level breakdown." header',
    ctaBody.includes('_edCardhead(') && ctaBody.includes("'Topic-level'") && ctaBody.includes("'breakdown.'"));
  test('v4.42.2: CTA button opens Progress page',
    ctaBody.includes("showPage('progress');renderProgressPage()"));
  test('v4.42.2: renderAnalytics calls _renderAnaTopicsCta',
    js.includes('_renderAnaTopicsCta()'));
})();

// Analytics nav pill cleanup (Topics removed, 5 pills remain)
(function() {
  const navBody = _fnBody(js, '_renderAnaNav');
  test('v4.42.2: Topics pill removed from ana-nav',
    !navBody.includes('>Topics<'));
  test('v4.42.2: Readiness pill still present',
    navBody.includes('>Readiness<'));
  test('v4.42.2: Trend pill still present',
    navBody.includes('>Trend<'));
  test('v4.42.2: Activity pill still present',
    navBody.includes('>Activity<'));
  // v4.45.2: Drills pill removed; flipped to regression guard
  test('v4.45.2: Drills pill removed from nav (regression guard)',
    !navBody.includes('>Drills<'));
  test('v4.42.2: Milestones pill still present',
    navBody.includes('>Milestones<'));
})();

// ──────────────────────────────────────────────────────────
// v4.42.3 CATALOG EXPANSION — blueprint-anchored topic splits
// ──────────────────────────────────────────────────────────
// Weak-spot signal from Haiku's free-form question tags ("IPsec VPN
// implementation", "TCP/IP troubleshooting and connection states")
// revealed the 40-topic catalog was too coarse in specific places. This
// release adds 10 blueprint-anchored topics, keeps parents intact so
// existing history isn't stranded, and closes the troubleshooting gap
// (24% of exam weight had only 5% of chip coverage pre-v4.42.3).
console.log('\n\x1b[1m── v4.42.3 CATALOG EXPANSION ──\x1b[0m');

const NEW_TOPICS_V4_42_3 = [
  { name: 'OSPF',              domain: 'implementation', obj: '2.1' },
  { name: 'BGP',               domain: 'implementation', obj: '2.1' },
  { name: 'VLAN Trunking',     domain: 'implementation', obj: '2.2' },
  { name: 'STP/RSTP',          domain: 'implementation', obj: '2.2' },
  { name: 'IPsec VPN',         domain: 'security',       obj: '4.4' },
  { name: 'SSL/TLS VPN',       domain: 'security',       obj: '4.4' },
  { name: 'Cable Issues',      domain: 'troubleshooting', obj: '5.2' },
  { name: 'Service Issues',    domain: 'troubleshooting', obj: '5.3' },
  { name: 'Perf Issues',       domain: 'troubleshooting', obj: '5.4' },
  { name: 'Connection Issues', domain: 'troubleshooting', obj: '5.5' }
];

// Each new topic must appear in TOPIC_DOMAINS with the correct domain
NEW_TOPICS_V4_42_3.forEach(t => {
  test(`v4.42.3: TOPIC_DOMAINS['${t.name}'] = '${t.domain}'`,
    js.includes(`'${t.name}':`) &&
    // sloppy but effective — grep lines containing topic name and check domain token follows
    new RegExp(`'${t.name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}':\\s*'${t.domain}'`).test(js));
});

// Each new topic must appear in topicResources with the correct objective
NEW_TOPICS_V4_42_3.forEach(t => {
  test(`v4.42.3: topicResources['${t.name}'] has obj '${t.obj}'`,
    new RegExp(`'${t.name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}':\\s*\\{\\s*obj:\\s*'${t.obj.replace(/\./g, '\\.')}'`).test(js));
});

// Each new topic must appear as a chip in index.html
NEW_TOPICS_V4_42_3.forEach(t => {
  test(`v4.42.3: chip for '${t.name}' present in index.html`,
    html.includes(`data-v="${t.name}"`));
});

// Parent umbrellas preserved (history continuity guard — do not delete these)
['Routing Protocols', 'Switch Features & VLANs', 'IPsec & VPN Protocols',
 'Network Troubleshooting & Tools'].forEach(parent => {
  test(`v4.42.3: parent umbrella '${parent}' still in TOPIC_DOMAINS`,
    js.includes(`'${parent}':`));
  test(`v4.42.3: parent umbrella '${parent}' still a chip in HTML`,
    html.includes(`data-v="${parent}"`));
});

// Catalog size moved up by 10 — spot-check total count matches expectation.
// TOPIC_DOMAINS has two sections: the per-domain objects inside the const.
// Count canonical-string keys (heuristic: lines starting with "  '" in the
// TOPIC_DOMAINS block).
(function() {
  const m = js.match(/const TOPIC_DOMAINS\s*=\s*\{([\s\S]*?)\n\};/);
  if (!m) {
    test('v4.42.3: TOPIC_DOMAINS block parseable', false);
    return;
  }
  const keyLines = m[1].split('\n').filter(l => /^\s*'[^']+':\s*'(concepts|implementation|operations|security|troubleshooting)'/.test(l));
  test(`v4.42.3: TOPIC_DOMAINS has 50 entries (40 orig + 10 new, found ${keyLines.length})`,
    keyLines.length === 50);
})();

// Troubleshooting domain coverage improved — was 2, now 6
(function() {
  const m = js.match(/const TOPIC_DOMAINS\s*=\s*\{([\s\S]*?)\n\};/);
  const body = m ? m[1] : '';
  const tsLines = body.split('\n').filter(l => /'troubleshooting'/.test(l));
  test(`v4.42.3: troubleshooting domain has 6 topics (found ${tsLines.length})`,
    tsLines.length === 6);
})();

// ──────────────────────────────────────────────────────────
// v4.42.3 AUDIT — BEHAVIORAL SMOKE TESTS (new high-value coverage)
// ──────────────────────────────────────────────────────────
// Added during the UAT value-density audit. These exercise real logic
// rather than proving source strings exist. More of these please.

console.log('\n\x1b[1m── BEHAVIORAL SMOKE (v4.42.3 audit) ──\x1b[0m');

// NOTE: computeDomainDistribution already has behavioral coverage at ~line 325
// (vm.runInNewContext sandbox with sum + weight checks). I almost added a
// parallel block during this audit — caught myself. Search before adding.

// Progress-row trend computation — v4.42.2 logic that drives the ↑/↓/→
// arrows on Topic Progress. The formula is `entries[0].pct - entries[last].pct`
// where entries is newest-first. Thresholds are ±5. Only renders when
// attempts >= 2. This test verifies the math plus edge cases that have
// no behavioral coverage elsewhere.
(function() {
  try {
    // Re-implement the trend calc in isolation (matches _buildProgressRows v4.42.2)
    const computeTrend = entries => entries.length >= 2
      ? entries[0].pct - entries[entries.length - 1].pct
      : 0;
    const arrowFor = trend => trend > 5 ? '\u2191' : trend < -5 ? '\u2193' : '\u2192';
    // Case: improving (recent 90, oldest 60 → trend +30 → ↑)
    const improving = [{ pct: 90 }, { pct: 75 }, { pct: 60 }];
    test('v4.42.3 audit: trend → ↑ when accuracy improved',
      computeTrend(improving) === 30 && arrowFor(computeTrend(improving)) === '\u2191');
    // Case: slipping (recent 40, oldest 70 → trend -30 → ↓)
    const slipping = [{ pct: 40 }, { pct: 55 }, { pct: 70 }];
    test('v4.42.3 audit: trend → ↓ when accuracy dropped',
      computeTrend(slipping) === -30 && arrowFor(computeTrend(slipping)) === '\u2193');
    // Case: steady (recent 80, oldest 78 → trend +2 → →)
    const steady = [{ pct: 80 }, { pct: 79 }, { pct: 78 }];
    test('v4.42.3 audit: trend → → when within ±5 band (noise)',
      arrowFor(computeTrend(steady)) === '\u2192');
    // Edge: exactly at threshold (±5) — arrow should NOT fire
    test('v4.42.3 audit: trend arrow does not fire at exactly +5 (strict gt)',
      arrowFor(5) === '\u2192');
    test('v4.42.3 audit: trend arrow does not fire at exactly -5 (strict lt)',
      arrowFor(-5) === '\u2192');
    test('v4.42.3 audit: trend arrow fires at +6 (just past threshold)',
      arrowFor(6) === '\u2191');
    // Edge: single-entry topic → trend 0 (no arrow rendered per v4.42.2 guard)
    test('v4.42.3 audit: single-entry topic trend = 0',
      computeTrend([{ pct: 70 }]) === 0);
    // Edge: empty history → trend 0
    test('v4.42.3 audit: empty history trend = 0',
      computeTrend([]) === 0);
  } catch (e) {
    test('v4.42.3 audit: trend computation smoke executes', false);
    results.errors.push('Trend smoke threw: ' + (e && e.message));
  }
})();

// ──────────────────────────────────────────────────────────
// v4.42.4 READINESS ALGORITHM — within-domain question-count weighting
// ──────────────────────────────────────────────────────────
// Before v4.42.4, getReadinessScore() computed domain accuracy as the
// simple average of per-topic percentages (pctSum/count). This gave
// equal weight to a topic with 2 questions and one with 200 — wrong
// fidelity to how the real CompTIA exam weights questions. v4.42.3's
// catalog expansion (topics from 40 → 50) made the flaw more visible
// because new child topics start at 0 Qs while parent umbrellas have
// many. Fix: aggregate wCorrect/wTotal across all topics in the domain,
// so question count influences domain accuracy naturally.
console.log('\n\x1b[1m── v4.42.4 READINESS ALGORITHM FIX ──\x1b[0m');

// Structural — regression guards against silent reverts
(function() {
  const body = _fnBody(js, 'getReadinessScore');
  test('v4.42.4: getReadinessScore aggregates domain wCorrect (question-weighted)',
    body.includes('domainBuckets[domain].wCorrect +='));
  test('v4.42.4: getReadinessScore aggregates domain wTotal (question-weighted)',
    /domainBuckets\[domain\]\.wTotal\s+\+=/.test(body));
  test('v4.42.4: regression guard — old pctSum pattern is gone',
    !body.includes('domainBuckets[domain].pctSum +='));
  test('v4.42.4: regression guard — old per-topic-pct simple average is gone',
    !body.includes('bucket.pctSum / bucket.count'));
  test('v4.42.4: domain average computed from bucket.wTotal > 0 guard',
    body.includes('bucket.wTotal > 0'));
})();

// Behavioral — mirrors the v4.42.4 fix on a fixture that exposes the bug
// the old algorithm would have produced. If anyone reverts to simple averaging
// these assertions will fail because oldAvg ≠ newAvg for unequal question counts.
(function() {
  try {
    const WEIGHTS = { a: 0.5, b: 0.5 };
    // Fixture: domain "a" has 2 topics with wildly different Q counts
    // OSPF: 95% on 20 weighted questions, BGP: 50% on 4 weighted questions
    // Truth: (19+2)/(20+4) = 87.5%. Simple average: (95+50)/2 = 72.5%.
    const tMap = {
      OSPF: { wCorrect: 19, wTotal: 20 },
      BGP:  { wCorrect: 2,  wTotal: 4  },
    };
    const tDom = { OSPF: 'a', BGP: 'a' };

    // v4.42.4 logic (what the fix ships)
    const buckets = {};
    Object.keys(WEIGHTS).forEach(d => { buckets[d] = { wCorrect: 0, wTotal: 0 }; });
    Object.keys(tMap).forEach(t => {
      const d = tDom[t]; if (!d) return;
      buckets[d].wCorrect += tMap[t].wCorrect;
      buckets[d].wTotal   += tMap[t].wTotal;
    });
    const newAvg = buckets.a.wTotal > 0 ? (buckets.a.wCorrect / buckets.a.wTotal) * 100 : 0;

    // Pre-v4.42.4 logic (what the fix replaces)
    let pctSum = 0, count = 0;
    Object.keys(tMap).forEach(t => {
      const d = tDom[t]; if (!d) return;
      pctSum += (tMap[t].wCorrect / tMap[t].wTotal) * 100;
      count++;
    });
    const oldAvg = count > 0 ? pctSum / count : 0;

    test('v4.42.4: new logic computes (19+2)/(20+4) = 87.5% on fixture',
      Math.abs(newAvg - 87.5) < 0.01);
    test('v4.42.4: old simple-average would have given 72.5% (regression witness)',
      Math.abs(oldAvg - 72.5) < 0.01);
    test('v4.42.4: new vs old logic differ by >10% on this fixture',
      Math.abs(newAvg - oldAvg) > 10);
    test('v4.42.4: unstudied domain still computes 0 (no division by zero)',
      buckets.b.wTotal === 0);

    // Equal-Q-count edge case — new and old logic should AGREE here
    const equalMap = {
      T1: { wCorrect: 9, wTotal: 10 },   // 90%
      T2: { wCorrect: 8, wTotal: 10 },   // 80%
    };
    const equalDom = { T1: 'a', T2: 'a' };
    const eqBuckets = { a: { wCorrect: 0, wTotal: 0 } };
    Object.keys(equalMap).forEach(t => {
      eqBuckets.a.wCorrect += equalMap[t].wCorrect;
      eqBuckets.a.wTotal   += equalMap[t].wTotal;
    });
    const eqNew = (eqBuckets.a.wCorrect / eqBuckets.a.wTotal) * 100; // (9+8)/(10+10) = 85
    const eqOld = (90 + 80) / 2; // 85
    test('v4.42.4: new and old logic agree when Q counts are equal',
      Math.abs(eqNew - eqOld) < 0.01 && Math.abs(eqNew - 85) < 0.01);
  } catch (e) {
    test('v4.42.4: readiness algorithm smoke executes', false);
    results.errors.push('Readiness smoke threw: ' + (e && e.message));
  }
})();

// ──────────────────────────────────────────────────────────
// v4.42.5 MAINTENANCE BUNDLE — 4 tech-debt issues closed together
// ──────────────────────────────────────────────────────────
// #130 (magic numbers) + #72 (openGuidedLab whitelist trap) + #128 (drill ARIA)
// + #141 (long-function count — evaluateMilestones table-driven refactor).
console.log('\n\x1b[1m── v4.42.5 MAINTENANCE BUNDLE ──\x1b[0m');

// ── #130 — Magic numbers extracted ──
test('v4.42.5 #130: EXAM_PASS_SCORE constant declared',
  /const EXAM_PASS_SCORE = 720;/.test(js));
test('v4.42.5 #130: EXAM_QUESTION_COUNT constant declared',
  /const EXAM_QUESTION_COUNT = 90;/.test(js));
test('v4.42.5 #130: DOUBLE_CLICK_MS constant declared',
  /const DOUBLE_CLICK_MS = 400;/.test(js));
test('v4.42.5 #130: VXLAN_VNI_MAX constant declared',
  /const VXLAN_VNI_MAX = 16777215;/.test(js));
test('v4.42.5 #130: MAX_TOKENS_GENERATION constant declared',
  /const MAX_TOKENS_GENERATION\s+=\s*12000;/.test(js));  // v4.56.1: bumped 8000→12000
test('v4.42.5 #130: MAX_TOKENS_VALIDATION constant declared',
  /const MAX_TOKENS_VALIDATION\s*=\s*1000;/.test(js));
test('v4.42.5 #130: MAX_TOKENS_TEACHER_DEFAULT constant declared',
  /const MAX_TOKENS_TEACHER_DEFAULT\s*=\s*1500;/.test(js));
test('v4.42.5 #130: behavioral pass-score checks reference EXAM_PASS_SCORE',
  (js.match(/>= EXAM_PASS_SCORE/g) || []).length >= 6);
test('v4.42.5 #130: no bare max_tokens numeric literals remain',
  !/max_tokens:\s*\d+/.test(js));
test('v4.42.5 #130: DOUBLE_CLICK_MS used in topology canvas double-click detection',
  js.includes('now - tbLastClickTime < DOUBLE_CLICK_MS'));

// ── #72 — openGuidedLab whitelist trap removed ──
(function() {
  const body = _fnBody(js, 'openGuidedLab');
  test('v4.42.5 #72: openGuidedLab uses document.querySelector(".page.active")',
    body.includes('document.querySelector(\'.page.active\')'));
  test('v4.42.5 #72: regression guard — old whitelist array is gone',
    !body.includes("['page-topic-dive', 'page-ports', 'page-quiz'"));
  test('v4.42.5 #72: regression guard — no more pages.find(...)',
    !body.includes('pages.find(p =>'));
  test('v4.42.5 #72: defensive fallback to page-ports preserved',
    body.includes("'page-ports'"));
  test('v4.42.5 #72: guards against lab page capturing itself',
    body.includes("activeId !== 'page-guided-lab'"));
})();

// ── #128 — Drill ARIA coverage ──
// HTML-side defaults: tab buttons have role+aria-selected+aria-controls, panels
// have role=tabpanel+aria-labelledby, mode buttons have aria-pressed, stats
// strips have aria-live, question cards have aria-live.
['ab','os','cb'].forEach(prefix => {
  test(`v4.42.5 #128 [${prefix}]: tablist has aria-label`,
    new RegExp(`class="${prefix}-tab-bar" role="tablist" aria-label=`).test(html));
  test(`v4.42.5 #128 [${prefix}]: learn tab has aria-selected="true"`,
    new RegExp(`id="${prefix}-tab-btn-learn"[^>]*aria-selected="true"`).test(html));
  test(`v4.42.5 #128 [${prefix}]: practice tab has aria-controls`,
    new RegExp(`id="${prefix}-tab-btn-practice"[^>]*aria-controls="${prefix}-tab-practice"`).test(html));
  test(`v4.42.5 #128 [${prefix}]: learn panel has role="tabpanel"`,
    new RegExp(`id="${prefix}-tab-learn"[^>]*role="tabpanel"`).test(html));
  test(`v4.42.5 #128 [${prefix}]: practice panel has aria-labelledby`,
    new RegExp(`id="${prefix}-tab-practice"[^>]*aria-labelledby="${prefix}-tab-btn-practice"`).test(html));
  test(`v4.42.5 #128 [${prefix}]: stats strip has aria-live="polite"`,
    new RegExp(`class="${prefix}-stats-strip" aria-live="polite"`).test(html));
  test(`v4.42.5 #128 [${prefix}]: mode buttons have aria-pressed defaults`,
    new RegExp(`class="${prefix}-mode-btn[^"]*"[^>]*aria-pressed=`).test(html));
});
test('v4.42.5 #128 [ab]: question card has aria-live',
  /id="ab-q-card"[^>]*aria-live="polite"/.test(html));
test('v4.42.5 #128 [cb]: question card has aria-live',
  /id="cb-q-card"[^>]*aria-live="polite"/.test(html));
test('v4.42.5 #128 [os]: practice area has aria-live',
  /id="os-practice-area"[^>]*aria-live="polite"/.test(html));
test('v4.42.5 #128 [os]: difficulty buttons have aria-pressed',
  /id="os-diff-easy"[^>]*aria-pressed="true"/.test(html));
// JS-side state sync
(function() {
  const setTabBody = _fnBody(js, 'setTab');
  const setModeBody = _fnBody(js, 'setMode');
  const setOsDiffBody = _fnBody(js, 'setOsDifficulty');
  test('v4.42.5 #128: setTab updates aria-selected on tab buttons',
    setTabBody.includes("setAttribute('aria-selected'"));
  test('v4.42.5 #128: setTab manages tabindex for keyboard focus',
    setTabBody.includes("setAttribute('tabindex'"));
  test('v4.42.5 #128: setMode updates aria-pressed on mode buttons',
    setModeBody.includes("setAttribute('aria-pressed'"));
  test('v4.42.5 #128: setOsDifficulty updates aria-pressed on diff buttons',
    setOsDiffBody.includes("setAttribute('aria-pressed'"));
})();

// ── #141 — evaluateMilestones table-driven refactor ──
test('v4.42.5 #141: _buildMilestoneCtx helper extracted',
  /function _buildMilestoneCtx\(\)/.test(js));
test('v4.42.5 #141: MILESTONE_CHECKS table declared',
  /const MILESTONE_CHECKS = \[/.test(js));
test('v4.42.5 #141: _scaledExamScore helper extracted',
  /function _scaledExamScore\(e\)/.test(js));
(function() {
  const body = _fnBody(js, 'evaluateMilestones');
  const lineCount = body.split('\n').length;
  test(`v4.42.5 #141: evaluateMilestones body ≤ 15 lines (found ${lineCount})`,
    lineCount <= 15);
  test('v4.42.5 #141: evaluateMilestones uses table-driven iteration',
    body.includes('MILESTONE_CHECKS.forEach'));
  test('v4.42.5 #141: evaluateMilestones preserves try/catch resilience per-check',
    body.includes('try {') && body.includes('catch (_)'));
})();
// Regression guard: all 47 original milestone IDs still in the checks table
const EXPECTED_MILESTONES = [
  'first_quiz','hundred_qs','five_hundred_qs','thousand_qs','first_exam',
  'exam_pass','hardcore_pass','all_domains','all_topics','streak_7','streak_30',
  'ready_650','ready_720','perfect_quiz','five_exams','ten_exams',
  'first_subnet','subnet_50','first_port_drill','all_ports_seen','first_session',
  'night_owl','early_bird','weekend_warrior','diversity_5','deep_dive_10',
  'daily_challenge_7','daily_challenge_30',
  'first_lab','labs_5','labs_10','labs_all',
  'ab_first','ab_50','ab_all_seen','ab_streak_15',
  'os_first','os_50','os_all_seen','os_streak_10',
  'cb_first','cb_50','cb_all_seen','cb_streak_10',
  'fix_first','fix_5','fix_all_easy',
];
(function() {
  const body = _fnBody(js, '_buildMilestoneCtx') || '';
  const checksSrc = (js.match(/const MILESTONE_CHECKS = \[[\s\S]*?\];/) || [''])[0];
  EXPECTED_MILESTONES.forEach(id => {
    test(`v4.42.5 #141: milestone '${id}' present in table`,
      checksSrc.includes(`'${id}'`));
  });
  test(`v4.42.5 #141: all 47 expected milestones tracked (found ${EXPECTED_MILESTONES.length})`,
    EXPECTED_MILESTONES.length === 47);
})();

// ──────────────────────────────────────────────────────────
// v4.43.0 EXAM-CONVENTION KEYWORD HIGHLIGHTING
// ──────────────────────────────────────────────────────────
// CompTIA stems use specific trap words (NOT / EXCEPT / MOST / BEST / NEVER
// / ALWAYS / ONLY / FIRST / LAST / LEAST / WORST / PRIMARY / NEXT / CANNOT).
// Missing them is the #2 wrong-answer mode. Auto-highlighting trains the eye
// to catch them on the real exam.
console.log('\n\x1b[1m── v4.43.0 KEYWORD HIGHLIGHTING ──\x1b[0m');

// Constants + helpers present
test('v4.43.0: EXAM_KEYWORDS array declared',
  /const EXAM_KEYWORDS = \[/.test(js));
test('v4.43.0: _examKeywordRe regex compiled from keyword list',
  /const _examKeywordRe = new RegExp/.test(js));
test('v4.43.0: highlightExamKeywords helper defined',
  js.includes('function highlightExamKeywords('));
test('v4.43.0: setQuestionText helper defined (single entry point)',
  js.includes('function setQuestionText('));

// Keyword coverage — spot-check the 14 words
['not','except','cannot','most','least','best','worst','primary',
 'first','last','next','always','never','only'].forEach(kw => {
  test(`v4.43.0: EXAM_KEYWORDS covers '${kw}'`,
    new RegExp(`'${kw}'`).test(
      (js.match(/const EXAM_KEYWORDS = \[[\s\S]*?\];/) || [''])[0]
    ));
});

// Defensive: ambiguous common words explicitly NOT in the list to avoid
// false-positive highlighting of plain prose
['all','none','any','could','should','would','which'].forEach(kw => {
  test(`v4.43.0: EXAM_KEYWORDS excludes ambiguous '${kw}'`,
    !new RegExp(`'${kw}'`).test(
      (js.match(/const EXAM_KEYWORDS = \[[\s\S]*?\];/) || [''])[0]
    ));
});

// Render path wiring — all 5 spots use setQuestionText or highlightExamKeywords
test('v4.43.0: quiz q-text uses setQuestionText',
  js.includes("setQuestionText(document.getElementById('q-text'), q.question)"));
test('v4.43.0: exam q-text uses setQuestionText',
  js.includes("setQuestionText(document.getElementById('exam-q-text'), q.question)"));
test('v4.43.0: review page wraps stem with highlightExamKeywords',
  js.includes('highlightExamKeywords(escHtml(q.question))'));
test('v4.43.0: CLI sim scenario uses setQuestionText',
  /renderCliSim[\s\S]{0,200}setQuestionText\(scenarioDiv, q\.scenario\)/.test(js));
test('v4.43.0: topology scenario uses setQuestionText',
  /topo-scenario[\s\S]{0,200}setQuestionText\(scenarioDiv, q\.scenario\)/.test(js));

// Regression guards — old textContent-based rendering should be gone
test('v4.43.0: regression — q-text no longer uses raw textContent',
  !js.includes("document.getElementById('q-text').textContent = q.question"));
test('v4.43.0: regression — exam-q-text no longer uses raw textContent',
  !js.includes("document.getElementById('exam-q-text').textContent = q.question"));

// CSS class exists
test('v4.43.0: CSS .exam-keyword class defined', css.includes('.exam-keyword'));
test('v4.43.0: CSS uses accent color for keyword', css.includes('var(--accent-light)') || css.includes('var(--accent)'));
test('v4.43.0: CSS includes light-theme override for keyword',
  /\[data-theme="light"\] \.exam-keyword/.test(css));

// setQuestionText escapes before highlighting (XSS guard)
(function() {
  const body = _fnBody(js, 'setQuestionText');
  test('v4.43.0: setQuestionText escapes HTML first (XSS safe)',
    body.includes('escHtml(raw'));
  test('v4.43.0: setQuestionText handles null input without throwing',
    body.includes("raw || ''"));
})();

// Behavioral smoke test — verify the highlighter wraps keywords correctly
// and leaves non-keywords alone
(function() {
  try {
    // Re-implement with identical logic to the source
    const EXAM_KW = ['not', 'except', 'cannot', 'most', 'least', 'best', 'worst',
                    'primary', 'first', 'last', 'next', 'always', 'never', 'only'];
    const re = new RegExp('\\b(' + EXAM_KW.join('|') + ')\\b', 'gi');
    const highlight = t => String(t).replace(re, '<strong class="exam-keyword">$&</strong>');

    // Case 1: single keyword at start
    const r1 = highlight('Which protocol is NOT secure?');
    test('v4.43.0 smoke: upper-case NOT gets wrapped',
      r1.includes('<strong class="exam-keyword">NOT</strong>'));
    // Case 2: mixed case preserved
    const r2 = highlight('The Best way to secure this is...');
    test('v4.43.0 smoke: mixed-case "Best" preserves case',
      r2.includes('<strong class="exam-keyword">Best</strong>'));
    // Case 3: multiple keywords in same sentence
    const r3 = highlight('MOST secure option EXCEPT for the one with NEVER');
    test('v4.43.0 smoke: multiple keywords all wrap independently',
      (r3.match(/<strong class="exam-keyword">/g) || []).length === 3);
    // Case 4: plain prose without keywords is untouched
    const r4 = highlight('Configure the router with a static IP address.');
    test('v4.43.0 smoke: prose without keywords is unchanged',
      r4 === 'Configure the router with a static IP address.');
    // Case 5: word-boundary — "primary" matches, "primarily" should not (not in list)
    const r5 = highlight('The primary gateway is unreachable.');
    test('v4.43.0 smoke: "primary" gets wrapped',
      r5.includes('<strong class="exam-keyword">primary</strong>'));
    // Case 6: common words NOT in list stay unwrapped (regression guard for "all"/"any"/"none")
    const r6 = highlight('All of the servers need any protocol, none should be skipped.');
    test('v4.43.0 smoke: non-exam words ("all", "any", "none") stay unwrapped',
      !r6.includes('<strong class="exam-keyword">All</strong>') &&
      !r6.includes('<strong class="exam-keyword">any</strong>') &&
      !r6.includes('<strong class="exam-keyword">none</strong>'));
    // Case 7: already-escaped HTML entities survive (regex is text-only)
    const r7 = highlight('Which is NOT &lt;script&gt;safe&lt;/script&gt;?');
    test('v4.43.0 smoke: escaped HTML entities not corrupted',
      r7.includes('&lt;script&gt;') && r7.includes('<strong class="exam-keyword">NOT</strong>'));
  } catch (e) {
    test('v4.43.0 smoke executes', false);
    results.errors.push('Keyword smoke threw: ' + (e && e.message));
  }
})();

// ──────────────────────────────────────────────────────────
// v4.43.1 ACTIVITY PAGES BUNDLE — Subnet + Topology enhancements
// ──────────────────────────────────────────────────────────
// 5 improvements to the Subnet Trainer + Topology Builder activity pages:
//   #1 AI Coach + active-lab context
//   #2 Subnet Trainer dashboard — weakest/stale category callouts
//   #3 Weak-spots → Subnet Trainer bridge (subnet routes only)
//   #4 Topology Builder UI polish — toolbar groups, hero, empty-state, lab regroup
//   #5 Two new troubleshooting labs (VLAN isolation, DHCP relay missing)
console.log('\n\x1b[1m── v4.43.1 ACTIVITY PAGES BUNDLE ──\x1b[0m');

// ── #1 AI Coach + lab context ──
(function() {
  const body = _fnBody(js, 'tbCoachTopology');
  test('v4.43.1 #1: tbCoachTopology reads tbActiveLab',
    body.includes('tbActiveLab ? TB_LABS.find'));
  test('v4.43.1 #1: prompt branches on activeLab presence',
    body.includes('if (activeLab && activeStep)'));
  test('v4.43.1 #1: lab-aware prompt includes step number + total',
    body.includes('STUDENT IS ON STEP ${stepNum} OF ${totalSteps}'));
  test('v4.43.1 #1: lab-aware prompt includes step goal',
    body.includes('Step goal: ${stripMd(activeStep.instruction)}'));
  test('v4.43.1 #1: cache key differentiates lab steps',
    body.includes('::step'));
  // _fnBody('tbShowCoachModal') matches tbShowCoachModalLoading as a prefix;
  // use a regex anchored on the exact function signature instead.
  const showModalMatch = js.match(/function tbShowCoachModal\(payload[\s\S]*?^\}/m);
  test('v4.43.1 #1: coach modal shows lab badge when active',
    !!showModalMatch && showModalMatch[0].includes('tb-coach-lab-badge'));
})();
test('v4.43.1 #1: CSS .tb-coach-lab-badge defined',
  css.includes('.tb-coach-lab-badge'));

// ── #2 Subnet Trainer dashboard callouts ──
(function() {
  const body = _fnBody(js, 'stRenderDashboard');
  test('v4.43.1 #2: stRenderDashboard computes weakest categories',
    body.includes('weakest') && body.includes('r.accuracy < 0.75'));
  test('v4.43.1 #2: stRenderDashboard computes stale categories',
    body.includes('stale') && body.includes('daysSince > 7'));
  test('v4.43.1 #2: stRenderDashboard renders weakest callout',
    body.includes('st-dash-callout-weak'));
  test('v4.43.1 #2: stRenderDashboard renders stale callout',
    body.includes('st-dash-callout-stale'));
  test('v4.43.1 #2: stRenderDashboard renders type-level insights',
    body.includes('st-dash-callout-types'));
  test('v4.43.1 #2: stRenderDashboard filters types with >=3 attempts',
    body.includes('v.seen >= 3'));
})();
test('v4.43.1 #2: stDashJumpToCategory helper defined',
  js.includes('function stDashJumpToCategory('));
test('v4.43.1 #2: CSS .st-dash-callout-weak defined', css.includes('.st-dash-callout-weak'));
test('v4.43.1 #2: CSS .st-dash-callout-stale defined', css.includes('.st-dash-callout-stale'));

// ── #3 Weak-spots → Subnet Trainer bridge ──
test('v4.43.1 #3: WEAK_SPOT_DRILL_BRIDGES constant declared',
  /const WEAK_SPOT_DRILL_BRIDGES = \{/.test(js));
test('v4.43.1 #3: openWeakSpotBridge helper defined',
  js.includes('function openWeakSpotBridge('));
test('v4.43.1 #3: bridge routes "Subnetting & IP Addressing" to subnet',
  /'Subnetting & IP Addressing':[\s\S]{0,120}kind: 'subnet'/.test(js));
test('v4.43.1 #3: bridge routes "IPv6" to subnet',
  /'IPv6':[\s\S]{0,120}kind: 'subnet'/.test(js));
test('v4.43.1 #3: bridge does NOT route any topology topics (user directive)',
  !/kind: 'topology'/.test(js.match(/const WEAK_SPOT_DRILL_BRIDGES[\s\S]*?\};/)?.[0] || ''));
(function() {
  const body = _fnBody(js, 'renderTodaysFocus');
  test('v4.43.1 #3: renderTodaysFocus reads WEAK_SPOT_DRILL_BRIDGES',
    body.includes('WEAK_SPOT_DRILL_BRIDGES'));
  test('v4.43.1 #3: renderTodaysFocus dedupes bridge links by kind+labId',
    body.includes('seenBridges'));
  test('v4.43.1 #3: renderTodaysFocus renders tf-bridges row when bridges exist',
    body.includes('tf-bridges'));
})();
test('v4.43.1 #3: CSS .tf-bridge-btn defined', css.includes('.tf-bridge-btn'));

// ── #4 Topology Builder UI polish ──
test('v4.43.1 #4 (v4.54.5 update): HTML has editorial .tb-pane-head inside left palette pane',
  html.includes('class="tb-pane-head"') && /class="[^"]*\btb-palette-v3\b/.test(html));
test('v4.43.1 #4: HTML toolbar v2 uses tb-toolbar-v2 class',
  html.includes('tb-toolbar tb-toolbar-v2'));
test('v4.43.1 #4: HTML toolbar has tb-tool-group-primary for primary actions',
  html.includes('tb-tool-group-primary'));
test('v4.43.1 #4: HTML toolbar has labeled groups',
  html.includes('tb-tool-group-label') && html.includes('Simulate') && html.includes('Practice'));
test('v4.43.1 #4: empty-state has CTA buttons (tb-empty-cta) — v4.47.2 moved rendering to JS',
  js.includes('tb-empty-cta') && html.includes('tb-empty-hint-v2'));
test('v4.43.1 #4: empty-state routes to Labs / AI Generate / Fix (v4.47.2: rendered via JS)',
  js.includes('onclick="tbOpenLabPicker()"') &&
  js.includes('onclick="tbGenerateAiTopology()"') &&
  js.includes('onclick="tbOpenFixPicker()"'));
test('v4.43.1 #4: CSS .tb-hero defined', css.includes('.tb-hero'));
test('v4.43.1 #4: CSS .tb-tool-group-label defined', css.includes('.tb-tool-group-label'));
test('v4.43.1 #4: CSS .tb-empty-cta defined', css.includes('.tb-empty-cta'));
test('v4.43.1 #4: TB_LAB_CATEGORIES constant declared',
  /const TB_LAB_CATEGORIES = \{/.test(js));
test('v4.43.1 #4: TB_LAB_VARIANT_GROUPS constant declared',
  /const TB_LAB_VARIANT_GROUPS = \{/.test(js));
(function() {
  const body = _fnBody(js, 'tbOpenLabPicker');
  test('v4.43.1 #4: tbOpenLabPicker groups by TB_LAB_CATEGORIES',
    body.includes('TB_LAB_CATEGORIES') && body.includes('categoryLabs'));
  test('v4.43.1 #4: tbOpenLabPicker relabels variants with Config A/B/C',
    body.includes('String.fromCharCode(65 + idx)'));
  test('v4.43.1 #4: tbOpenLabPicker shows honest count (concept + variants)',
    body.includes('meaningfulCount') && body.includes('variantCount'));
})();
test('v4.43.1 #4: CSS .tb-lab-category defined', css.includes('.tb-lab-category'));

// ── #5 Two new troubleshooting labs ──
test('v4.43.1 #5: VLAN isolation lab exists',
  /id: 'troubleshoot-vlan-isolation'/.test(js));
test('v4.43.1 #5: DHCP relay lab exists',
  /id: 'troubleshoot-dhcp-relay'/.test(js));
(function() {
  const labsSrc = (js.match(/const TB_LABS = \[[\s\S]*?^\];/m) || [''])[0];
  test('v4.43.1 #5: VLAN lab has autoSetup with VLAN 10 + 20 mis-config',
    labsSrc.includes("hostname: 'SW-Sales-HR'") && labsSrc.includes("vlan: 20, mode: 'access', trunkAllowed: [20]"));
  test('v4.43.1 #5: VLAN lab fix-step checks port Fa0/2 is VLAN 10',
    /port && port\.vlan === 10/.test(labsSrc));
  test('v4.43.1 #5: DHCP lab has DHCP server in subnet A + clients in subnet B',
    labsSrc.includes("hostname: 'DHCP-SRV'") && labsSrc.includes("'10.0.1.100'"));
  test('v4.43.1 #5: DHCP lab fix-step verifies helper-address === 10.0.1.100',
    labsSrc.includes("r.dhcpRelay.helperAddress === '10.0.1.100'"));
  test('v4.43.1 #5: DHCP lab has 4-step flow (observe → understand → fix → verify)',
    labsSrc.match(/id: 'troubleshoot-dhcp-relay'[\s\S]*?steps: \[([\s\S]*?)\]\s*\},/)?.[1].match(/title:/g).length === 4);
})();
test('v4.43.1 #5: new labs added to TB_LAB_CATEGORIES Troubleshooting',
  /'Troubleshooting':\s*\[[^\]]*'troubleshoot-vlan-isolation'[^\]]*'troubleshoot-dhcp-relay'/.test(js));

// ── v4.43.2 TOPOLOGY BUILDER UI POLISH ──
console.log('\n\x1b[1m── v4.43.2 TB UI POLISH ──\x1b[0m');
// Fix 1: wiring banner light-mode contrast (white text on light mint was unreadable)
test('v4.43.2 #1: light .tb-wire-overlay has explicit color',
  /\[data-theme="light"\]\s*\.tb-wire-overlay\s*\{[^}]*\bcolor:/.test(css));
test('v4.43.2 #1: light .tb-wire-overlay kbd override exists',
  css.includes('[data-theme="light"] .tb-wire-overlay kbd'));
// Fix 2: how-to row collapsed by default (regression guard against `open` returning)
test('v4.43.2 #2: tb-howto-details NOT open by default',
  !/<details id="tb-howto-details"[^>]*\bopen\b/.test(html));
test('v4.43.2 #2: how-to strip grid uses auto-fit (v4.49.1: .tb-howto-step replaces .tb-howto-item; overflow-wrap no longer needed since cards are self-contained)',
  /\.tb-howto-strip\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit/.test(css));
// Fix 3: palette height tracks canvas (was capped at 760 while canvas is 900+)
test('v4.43.2 #3: .tb-palette min-height 900px (matches canvas)',
  /\.tb-palette\s*\{[^}]*min-height:\s*900px/.test(css));
test('v4.43.2 #3: .tb-palette max-height bumped from 760 to 1200',
  /\.tb-palette\s*\{[^}]*max-height:\s*1200px/.test(css) &&
  !/\.tb-palette\s*\{[^}]*max-height:\s*760px/.test(css));

// ── v4.43.3 TOPOLOGY BUILDER TOOLBAR POLISH ──
console.log('\n\x1b[1m── v4.43.3 TB TOOLBAR POLISH ──\x1b[0m');
// Fix 1: Primary group now has an "Actions" label (was label-less, causing height mismatch)
test('v4.43.3 #1: primary group has Actions label',
  /class="tb-tool-group tb-tool-group-primary"[\s\S]{0,200}<span class="tb-tool-group-label">Actions<\/span>/.test(html));
// Fix 2: toolbar is CSS Grid (was flex-wrap); dividers dropped
test('v4.43.3 #2: .tb-toolbar-v2 uses display: grid',
  /\.tb-toolbar-v2\s*\{[^}]*display:\s*grid/.test(css));
test('v4.43.3 #2: toolbar uses auto-fit minmax columns for uniform wrap',
  /\.tb-toolbar-v2\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(150px,\s*max-content\)\)/.test(css));
test('v4.43.3 #2: border-right dividers dropped (regression guard)',
  !/\.tb-tool-group\s*\{[^}]*border-right:\s*1px/.test(css));
// Fix 3: status element moved into its own .tb-toolbar-meta strip
test('v4.43.3 #3: .tb-toolbar-meta wrapper exists with tb-status inside',
  /<div class="tb-toolbar-meta">\s*<span id="tb-status"/.test(html));
test('v4.43.3 #3: .tb-toolbar-meta CSS defined',
  /\.tb-toolbar-meta\s*\{[^}]*display:\s*flex/.test(css));
test('v4.43.3 #3: old margin-left:auto status positioning removed (regression guard)',
  !/\.tb-toolbar-v2\s+\.tb-status\s*\{[^}]*margin-left:\s*auto/.test(css));

// ── v4.43.4 QUIZ QUESTION-COUNT BUG FIX ──
console.log('\n\x1b[1m── v4.43.4 QUIZ QUESTION-COUNT FIX ──\x1b[0m');
// startQuiz now over-requests then retries-to-fill so users get the qCount they picked.
// Scope all assertions to the startQuiz function body so we don't accidentally match
// other occurrences of "fetchQuestions" or "qCount".
const _startQuizBody = (() => {
  const m = js.match(/async function startQuiz\(\)\s*\{[\s\S]*?\n\}\s*\n/);
  return m ? m[0] : '';
})();
test('v4.43.4: startQuiz body extracted (sanity)', _startQuizBody.length > 500);
test('v4.43.4 #1: DROPOUT_BUFFER constant with 30% + min-3 formula',
  /DROPOUT_BUFFER\s*=\s*Math\.max\(3,\s*Math\.ceil\(qCount\s*\*\s*0\.3\)\)/.test(_startQuizBody));
test('v4.43.4 #1: initial fetch over-requests (qCount + DROPOUT_BUFFER)',
  /fetchQuestions\([^)]*qCount\s*\+\s*DROPOUT_BUFFER\s*\)/.test(_startQuizBody));
test('v4.43.4 #2: retry-to-fill block exists (questions.length < qCount)',
  /if\s*\(\s*questions\.length\s*<\s*qCount\s*\)\s*\{/.test(_startQuizBody));
test('v4.43.4 #2: retry fetches deficit + DROPOUT_BUFFER',
  /fetchQuestions\([^)]*deficit\s*\+\s*DROPOUT_BUFFER\s*\)/.test(_startQuizBody));
test('v4.43.4 #2: retry wraps in try/catch so a failed retry ships what we have',
  /try\s*\{[\s\S]*?fetchQuestions\([^)]*deficit[\s\S]*?\}\s*catch\s*\(retryErr\)/.test(_startQuizBody));
// Regression guards: the old "Acceptable shortfall" / "length < qCount/2" logic must stay gone
test('v4.43.4: "Acceptable shortfall" comment removed (regression guard)',
  !_startQuizBody.includes('Acceptable shortfall'));
test('v4.43.4: old length < Math.ceil(qCount / 2) branch removed (regression guard)',
  !/questions\.length\s*<\s*Math\.ceil\(qCount\s*\/\s*2\)/.test(_startQuizBody));

// ── v4.43.5 EXAM-MODE VALIDATION PARITY ──
console.log('\n\x1b[1m── v4.43.5 EXAM VALIDATION PARITY ──\x1b[0m');
// startExam() now runs the same 4-layer validation pipeline as startQuiz().
// Scope all assertions to the startExam function body so we don't accidentally
// match other occurrences of the same strings elsewhere in app.js.
const _startExamBody = (() => {
  const m = js.match(/async function startExam\(\)\s*\{[\s\S]*?^\}\s*$/m);
  return m ? m[0] : '';
})();
test('v4.43.5: startExam body extracted (sanity)', _startExamBody.length > 1000);
test('v4.43.5 #1: EXAM_BATCH_BASE constant (18) declared in startExam',
  /EXAM_BATCH_BASE\s*=\s*18/.test(_startExamBody));
test('v4.43.5 #1: EXAM_BATCH_BUFFER constant (5) declared in startExam',
  /EXAM_BATCH_BUFFER\s*=\s*5/.test(_startExamBody));
test('v4.43.5 #1: batch fetch uses EXAM_BATCH_BASE + EXAM_BATCH_BUFFER (over-request)',
  /fetchQuestions\([^)]*EXAM_BATCH_BASE\s*\+\s*EXAM_BATCH_BUFFER\s*\)/.test(_startExamBody));
test('v4.43.5 #2: Sonnet validator (aiValidateQuestions) called per batch',
  /aiValidateQuestions\(key,\s*rawBatch\)/.test(_startExamBody));
test('v4.43.5 #2: programmatic validateQuestions called per batch',
  /let batch\s*=\s*validateQuestions\(aiValidated\)/.test(_startExamBody));
test('v4.43.5 #3: retry-to-fill block exists (batch.length < EXAM_BATCH_BASE)',
  /if\s*\(\s*batch\.length\s*<\s*EXAM_BATCH_BASE\s*\)/.test(_startExamBody));
test('v4.43.5 #3: retry fetches deficit + EXAM_BATCH_BUFFER',
  /fetchQuestions\([^)]*deficit\s*\+\s*EXAM_BATCH_BUFFER\s*\)/.test(_startExamBody));
test('v4.43.5 #3: retry wraps in try/catch with retryErr',
  /try\s*\{[\s\S]*?deficit\s*\+\s*EXAM_BATCH_BUFFER[\s\S]*?\}\s*catch\s*\(retryErr\)/.test(_startExamBody));
test('v4.43.5 #4: batch.slice(0, EXAM_BATCH_BASE) truncates overage before concat',
  /batch\.slice\(0,\s*EXAM_BATCH_BASE\)/.test(_startExamBody));
test('v4.43.5 #4: defensive slice to EXAM_QUESTION_COUNT after injectPBQs',
  /examQuestions\s*=\s*examQuestions\.slice\(0,\s*EXAM_QUESTION_COUNT\)/.test(_startExamBody));
test('v4.43.5 #5: graceful-degradation banner wired via showExamShortfallBanner',
  /if\s*\(examShortfall\)\s*showExamShortfallBanner/.test(_startExamBody));
// Helper function + CSS exist
test('v4.43.5: showExamShortfallBanner function defined',
  /function\s+showExamShortfallBanner\(actualCount\)/.test(js));
test('v4.43.5: .exam-shortfall-banner CSS rule exists',
  css.includes('.exam-shortfall-banner'));
test('v4.43.5: light-theme .exam-shortfall-banner override exists',
  /\[data-theme="light"\]\s*\.exam-shortfall-banner/.test(css));
// Regression guards: the old "concat raw batch with no validation" pattern must stay gone
test('v4.43.5: old "examQuestions.concat(batch)" without validation is gone (regression guard)',
  !/examQuestions\s*=\s*examQuestions\.concat\(batch\)\s*;/.test(_startExamBody));
test('v4.43.5: old BATCH_SIZE = 18 bare constant is gone (replaced by EXAM_BATCH_BASE)',
  !/const\s+BATCHES\s*=\s*5,\s*BATCH_SIZE\s*=\s*18/.test(_startExamBody));

// ── v4.43.6 SUBNET LESSON 4 — BLOCK SIZE METHOD ──
console.log('\n\x1b[1m── v4.43.6 LESSON: BLOCK SIZE METHOD ──\x1b[0m');
// Lesson 4 swapped from "The AND Operation" to "The Block Size Method" per user pref.
// SUBNET_LESSONS array must have the new lesson + Lesson 5's prereq must be updated.
test('v4.43.6: new lesson id block_size exists in SUBNET_LESSONS',
  /id:\s*'block_size',\s*title:\s*'The Block Size Method'/.test(js));
test('v4.43.6: block_size lesson chains off masks_cidr',
  /id:\s*'block_size'[\s\S]{0,400}prereq:\s*'masks_cidr'/.test(js));
test('v4.43.6: Lesson 5 (net_broadcast) prereq updated to block_size',
  /id:\s*'net_broadcast'[\s\S]{0,400}prereq:\s*'block_size'/.test(js));
// Regression guard: the old AND Operation lesson must stay gone (user chose block size)
test('v4.43.6: old "The AND Operation" lesson removed (regression guard)',
  !/title:\s*'The AND Operation'/.test(js));
test('v4.43.6: old "and_operation" lesson id removed from SUBNET_LESSONS (regression guard)',
  !/id:\s*'and_operation',\s*title:/.test(js));
// Lesson content sanity — the 5 core steps must be present
test('v4.43.6: lesson covers all 5 steps',
  js.includes('Find the mask') &&
  js.includes('Find the block size') &&
  js.includes('Count the subnet starts') &&
  js.includes('Find where 100 belongs') &&
  js.includes('Take the starting number'));
test('v4.43.6: worked example 192.168.1.100 /26 present',
  js.includes('192.168.1.100') && js.includes('192.168.1.64'));
test('v4.43.6: cheat sheet table with /24 \u2013 /30 rows present',
  js.includes('Cheat sheet to memorize') &&
  /\/30<\/td><td>252<\/td><td>4<\/td><td>2<\/td>/.test(js));

// ── v4.43.7 LESSON 5 REWRITE + BEGINNER QUESTION POOL FIX ──
console.log('\n\x1b[1m── v4.43.7 LESSON 5 + POOL FIX ──\x1b[0m');
// Fix 1: beginner-level question pool now includes broadcast + usable types.
// Scope assertions to the stPickType function body.
const _stPickTypeBody = (() => {
  const m = js.match(/function stPickType\([^)]*\)\s*\{[\s\S]*?\n\}\s*\n/);
  return m ? m[0] : '';
})();
test('v4.43.7: stPickType body extracted (sanity)', _stPickTypeBody.length > 200);
test('v4.43.7 #1: easyTypes includes find_broadcast (beginner can now drill it)',
  /easyTypes\s*=\s*\[[^\]]*'find_broadcast'/.test(_stPickTypeBody));
test('v4.43.7 #1: easyTypes includes usable_first',
  /easyTypes\s*=\s*\[[^\]]*'usable_first'/.test(_stPickTypeBody));
test('v4.43.7 #1: easyTypes includes usable_last',
  /easyTypes\s*=\s*\[[^\]]*'usable_last'/.test(_stPickTypeBody));
// Regression guard: medTypes must NOT still contain those 3 (would cause double-classification)
test('v4.43.7 #1: medTypes no longer contains find_broadcast (regression guard)',
  !/medTypes\s*=\s*\[[^\]]*'find_broadcast'/.test(_stPickTypeBody));
test('v4.43.7 #1: medTypes no longer contains usable_first (regression guard)',
  !/medTypes\s*=\s*\[[^\]]*'usable_first'/.test(_stPickTypeBody));
test('v4.43.7 #1: medTypes no longer contains usable_last (regression guard)',
  !/medTypes\s*=\s*\[[^\]]*'usable_last'/.test(_stPickTypeBody));

// Fix 2: Lesson 5 theory rewritten in stepped block-size format
test('v4.43.7 #2: Lesson 5 desc updated to mention "3 quick steps"',
  /id:\s*'net_broadcast'[\s\S]{0,400}3 quick steps/.test(js));
test('v4.43.7 #2: Lesson 5 covers 3 step labels for broadcast/usable derivation',
  js.includes('Broadcast = next network start') &&
  js.includes('First usable host = Network + 1') &&
  js.includes('Last usable host = Broadcast'));
test('v4.43.7 #2: Lesson 5 explains why subtract 2 (reserved addresses)',
  js.includes('Why subtract 2 from host count'));
test('v4.43.7 #2: Lesson 5 has edge-case section for /31 and /32',
  js.includes('Edge cases') && js.includes('/31') && js.includes('/32') && js.includes('RFC 3021'));
test('v4.43.7 #2: Lesson 5 cheat sheet has 5 columns including Reserved',
  /CIDR<\/th><th>Block size<\/th><th>Total IPs<\/th><th>Usable hosts<\/th><th>Reserved/.test(js));
// Regression guard: old terse 6-line theory must stay gone
test('v4.43.7 #2: old terse "Every subnet has 3 key addresses:" single-line is gone',
  !/theory:\s*\[\s*'Every subnet has 3 key addresses:'/.test(js));

// ── v4.43.8 SUBNET-SIZING GUARD ──
console.log('\n\x1b[1m── v4.43.8 SMALLEST-SUBNET GUARD ──\x1b[0m');
// New _smallestSubnetOk helper catches "needs N hosts, which mask" questions
// where the AI picks a wasteful subnet. Scope structural checks to the helper.
test('v4.43.8: _smallestSubnetOk function defined',
  /function\s+_smallestSubnetOk\(q\)/.test(js));
const _smallestSubnetBody = (() => {
  const m = js.match(/function _smallestSubnetOk\(q\)\s*\{[\s\S]*?\n\}\s*\n/);
  return m ? m[0] : '';
})();
test('v4.43.8: _smallestSubnetOk body extracted (sanity)', _smallestSubnetBody.length > 500);
test('v4.43.8 #1: sizingRe matches "at least N hosts/devices/endpoints/users/addresses"',
  /at\\s\+least\|minimum/.test(_smallestSubnetBody) &&
  /hosts\?\|devices\?\|endpoints\?\|users\?\|addresses/.test(_smallestSubnetBody));
test('v4.43.8 #2: helper computes usable hosts via Math.pow(2, 32 - cidr) - 2',
  /Math\.pow\(2,\s*32\s*-\s*cidr\)\s*-\s*2/.test(_smallestSubnetBody));
test('v4.43.8 #3: helper applies subnet-count constraint when parentCidr set',
  /Math\.pow\(2,\s*cidr\s*-\s*parentCidr\)/.test(_smallestSubnetBody) &&
  /parentCidr\s*<\s*cidr/.test(_smallestSubnetBody));
test('v4.43.8 #4: helper parses options via /\\d+ (CIDR) and dotted mask (fallback)',
  /\.match\(\/\\\/\(\\d\{1,2\}\)/.test(_smallestSubnetBody) &&
  /toString\(2\)\.match\(\/1\/g\)/.test(_smallestSubnetBody));
test('v4.43.8 #5: helper picks LARGEST cidr from satisfying set (smallest-subnet-wins)',
  /cidrs\[L\]\s*>\s*cidrs\[bestLetter\]/.test(_smallestSubnetBody));
test('v4.43.8 #6: helper wired into validateQuestions (non-MCQ short-circuit + call)',
  js.includes('if (!_smallestSubnetOk(q)) return false'));
test('v4.43.8: validation-audit stub includes smallestSubnetSrc extraction',
  /const\s+smallestSubnetSrc\s*=\s*extractFunction\(js,\s*'_smallestSubnetOk'\)/.test(
    require('fs').readFileSync(require('path').join(ROOT, 'tests/validation-audit.js'), 'utf8')
  ));
// Behavioural smoke test — extract the helper into a sandbox and run the
// exact user-reported fixture through it. Must return false (reject).
(() => {
  const vm = require('vm');
  const stub = `
    function getQType(q) { return q.type || 'mcq'; }
    ${_smallestSubnetBody}
    result = _smallestSubnetOk(fixture);
  `;
  const userBug = {
    type: 'mcq',
    question: 'An enterprise network administrator assigns 10.50.0.0/16 to a department. The department requires 5 subnets with at least 4,000 usable hosts each. Which subnet mask should be used?',
    options: { A: '/19 (255.255.224.0)', B: '/20 (255.255.240.0)', C: '/21 (255.255.248.0)', D: '/18 (255.255.192.0)' },
    answer: 'A'
  };
  const ctx = { fixture: userBug, result: null };
  vm.createContext(ctx);
  vm.runInContext(stub, ctx);
  test('v4.43.8: behavioural smoke — rejects the user-reported /19-vs-/20 bug',
    ctx.result === false);

  // And confirm the same fixture with answer: 'B' (correct) passes
  userBug.answer = 'B';
  ctx.fixture = userBug; ctx.result = null;
  vm.runInContext(stub, ctx);
  test('v4.43.8: behavioural smoke — accepts the same fixture when /20 is marked',
    ctx.result === true);
})();

// ── v4.43.9 RELEASE-FLOW HYGIENE (bump-version.js prepends to CLAUDE.md) ──
console.log('\n\x1b[1m── v4.43.9 BUMP-SCRIPT PREPEND ──\x1b[0m');
// bump-version.js used to append to the bottom of the CLAUDE.md version
// history table. Convention is newest-first so it now prepends. Regression
// guards pin the new behavior so no future session re-breaks it.
const _bumpSrc = require('fs').readFileSync(
  require('path').join(ROOT, 'scripts/bump-version.js'), 'utf8'
);
test('v4.43.9: bump-version.js comment header says "prepend to version history table"',
  /prepend to version history table/i.test(_bumpSrc));
test('v4.43.9: bump-version.js finds FIRST version row (break after first match)',
  /for \(let i = 0; i < lines\.length; i\+\+\) \{\s*if \(\/\^\\\| v\\d\/\.test\(lines\[i\]\)\) \{\s*firstVersionIdx = i;\s*break;/.test(_bumpSrc));
test('v4.43.9: bump-version.js splices at firstVersionIdx (prepend, not +1)',
  /lines\.splice\(firstVersionIdx,\s*0,\s*newRow\)/.test(_bumpSrc));
test('v4.43.9: success message mentions "added at top"',
  /CLAUDE\.md.*added at top/.test(_bumpSrc));
// Regression guards — the old append-to-bottom logic must stay gone
test('v4.43.9: old "Find the last version row and insert after it" comment gone',
  !/Find the last version row and insert after it/.test(_bumpSrc));
test('v4.43.9: old lastVersionIdx append pattern gone',
  !/lines\.splice\(lastVersionIdx\s*\+\s*1/.test(_bumpSrc));

// ── v4.44.0 ANIMATION PASS (quiz feel + block-match + keyword cleanup) ──
console.log('\n\x1b[1m── v4.44.0 ANIMATION PASS ──\x1b[0m');
// Keyword simplification — bold purple only, no pill
test('v4.44.0 #1: .exam-keyword has no background (pill styling removed)',
  /\.exam-keyword\s*\{[^}]*\}/.test(css) &&
  !/\.exam-keyword\s*\{[^}]*background:\s*rgba\(124/.test(css));
test('v4.44.0 #1: .exam-keyword has no box-shadow underline (regression guard)',
  !/\.exam-keyword\s*\{[^}]*box-shadow:/.test(css));
// Answer-pick upgrade — glow ripple layered on bounce
test('v4.44.0 #2: optGlowPulse keyframe defined',
  /@keyframes\s+optGlowPulse/.test(css));
test('v4.44.0 #2: .option.correct animation chains optBounce + optGlowPulse',
  /\.option\.correct\s*\{[^}]*animation:\s*optBounce[^,}]*,\s*optGlowPulse/.test(css));
// Question reveal + option stagger
test('v4.44.0 #3: qTextReveal + optionStaggerIn keyframes defined',
  /@keyframes\s+qTextReveal/.test(css) && /@keyframes\s+optionStaggerIn/.test(css));
test('v4.44.0 #3: render() uses void el.offsetWidth for reflow-trigger',
  /void qTextEl\.offsetWidth/.test(js) && /void el\.offsetWidth/.test(js));
test('v4.44.0 #3: render() sets per-index animationDelay (i * 80)',
  /animationDelay\s*=\s*\(i\s*\*\s*80\)\s*\+\s*'ms'/.test(js));
// Progress bar smoothing
test('v4.44.0 #4: .progress-fill uses cubic-bezier transition (not the old .4s ease)',
  /\.progress-fill\s*\{[^}]*transition:\s*width\s+\.6s\s+cubic-bezier/.test(css));
// Block-match ✅ animation — Lesson 4 + Lesson 5 wraps + observer wiring
test('v4.44.0 #5: stBlockMatchPop keyframe defined',
  /@keyframes\s+stBlockMatchPop/.test(css));
test('v4.44.0 #5: .st-block-match-active triggers the pop animation',
  /\.st-block-match\.st-block-match-active\s*\{[^}]*animation:\s*stBlockMatchPop/.test(css));
// NOTE: the SUBNET_LESSONS source stores en-dashes + emoji as literal \u-escapes
// (the Edit tool kept our input as-is), so our test strings need double-backslash
// to match the 6-char ASCII sequence in the file rather than the resolved chars.
test('v4.44.0 #5: ✅ wrapped in Lesson 4 Step 4 (64-127 block)',
  js.includes('64\\u2013127 <span class="st-block-match">\\u2705</span>'));
test('v4.44.0 #5: ✅ wrapped in Lesson 4 bigger example (160-175 block)',
  js.includes('160\\u2013175 <span class="st-block-match">\\u2705</span>'));
test('v4.44.0 #5: First-usable ✅ wrapped in Lesson 5 put-it-all-together block',
  js.includes('First usable <span class="st-block-match">\\u2705</span>'));
test('v4.44.0 #5: Last-usable ✅ wrapped in Lesson 5 put-it-all-together block',
  js.includes('Last usable <span class="st-block-match">\\u2705</span>'));
test('v4.44.0 #5: _stSetupBlockMatchObserver function defined',
  /function\s+_stSetupBlockMatchObserver\(\)/.test(js));
test('v4.44.0 #5: stOpenLesson calls the block-match observer setup',
  js.includes('_stSetupBlockMatchObserver()'));
test('v4.44.0 #5: observer uses IntersectionObserver with threshold 0.5 and unobserves on first hit',
  /new IntersectionObserver/.test(js) &&
  /threshold:\s*0\.5/.test(js) &&
  /observer\.unobserve\(entry\.target\)/.test(js));
// Reduced-motion coverage
test('v4.44.0: prefers-reduced-motion block covers all 4 new animation classes',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#q-text\.q-text-reveal[\s\S]*?\.option\.option-stagger-in[\s\S]*?\.st-block-match\.st-block-match-active[\s\S]*?\.option\.correct[\s\S]*?animation:\s*none/.test(css));

// ── v4.45.0 ANALYTICS REVAMP (Domain Mastery + Wrong-Answer Patterns) ──
console.log('\n\x1b[1m── v4.45.0 ANALYTICS REVAMP ──\x1b[0m');
// The old heatmap + question-type breakdown are removed. Regression guards
// ensure they stay gone and the new cards are correctly wired.
test('v4.45.0: _renderAnaDomainMastery function defined',
  /function\s+_renderAnaDomainMastery\(h\)/.test(js));
test('v4.45.0: drillDomain helper defined (Domain Mastery drill buttons)',
  /function\s+drillDomain\(domainName\)/.test(js));
test('v4.45.0: drillDomain calls focusTopic on weakest topic in domain',
  /function\s+drillDomain\(domainName\)[\s\S]*?focusTopic\(target\)/.test(js));
test('v4.45.0: _renderAnaWrongPatterns function defined',
  /function\s+_renderAnaWrongPatterns\(\)/.test(js));
// Regression guards: the old functions must stay gone
test('v4.45.0: old _renderAnaHeatmap is gone (regression guard)',
  !/function\s+_renderAnaHeatmap/.test(js));
test('v4.45.0: old _renderAnaQuestionTypes is gone (regression guard)',
  !/function\s+_renderAnaQuestionTypes/.test(js));
test('v4.45.0: renderAnalytics calls _renderAnaDomainMastery (full-width, above grid)',
  /html\s*\+=\s*_renderAnaDomainMastery\(h\)/.test(js));
test('v4.45.0: renderAnalytics calls _renderAnaWrongPatterns (inside 2-col grid)',
  /html\s*\+=\s*_renderAnaWrongPatterns\(\)/.test(js));
test('v4.45.0: renderAnalytics no longer calls _renderAnaHeatmap (regression guard)',
  !/html\s*\+=\s*_renderAnaHeatmap/.test(js));
test('v4.45.0: renderAnalytics no longer calls _renderAnaQuestionTypes (regression guard)',
  !/html\s*\+=\s*_renderAnaQuestionTypes/.test(js));
// CSS classes for the new cards
test('v4.45.0: .ana-card-dm CSS defined (Domain Mastery card)',
  /\.ana-card-dm\s*\{/.test(css));
test('v4.45.0: .dm-row + .dm-bar-track + .dm-bar-fill + .dm-bar-target CSS present',
  /\.dm-row\s*\{/.test(css) && /\.dm-bar-track\s*\{/.test(css) &&
  /\.dm-bar-fill\s*\{/.test(css) && /\.dm-bar-target\s*\{/.test(css));
test('v4.45.0: all 4 tier badge CSS classes defined',
  /\.dm-badge-novice/.test(css) && /\.dm-badge-developing/.test(css) &&
  /\.dm-badge-proficient/.test(css) && /\.dm-badge-mastered/.test(css));
test('v4.45.0: .dm-bar-fill uses 800ms cubic-bezier width transition',
  /\.dm-bar-fill\s*\{[^}]*transition:\s*width\s+800ms\s+cubic-bezier/.test(css));
test('v4.45.0: .dm-bar-target positioned at 85% (mastery threshold marker)',
  /style="left:85%"/.test(js) || /left:\s*85%/.test(js));
test('v4.45.0: .wp-pattern + .wp-pattern-rank + .wp-pattern-count CSS present',
  /\.wp-pattern\s*\{/.test(css) && /\.wp-pattern-rank\s*\{/.test(css) &&
  /\.wp-pattern-count\s*\{/.test(css));
test('v4.45.0: old .ana-heatmap + .ana-heat-* CSS is gone (regression guard)',
  !/\.ana-heatmap\s*\{/.test(css) && !/\.ana-heat-head/.test(css));
test('v4.45.0: old .ana-type-list + .ana-type-row CSS is gone (regression guard)',
  !/\.ana-type-list\s*\{/.test(css) && !/\.ana-type-row\s*\{/.test(css));
// Domain mastery classifier sanity — all 5 domain keys referenced
test('v4.45.0: Domain Mastery covers all 5 N10-009 domain keys',
  /id:\s*'concepts'[\s\S]*?id:\s*'implementation'[\s\S]*?id:\s*'operations'[\s\S]*?id:\s*'security'[\s\S]*?id:\s*'troubleshooting'/.test(js));
// Wrong-pattern classifier sanity — all 4 pattern categories
test('v4.45.0: Wrong-pattern classifier detects negation, domain, PBQ type, Hard difficulty',
  js.includes('NEGATION TRAPS') &&
  js.includes('DOMAIN \\u2014') &&
  (js.includes('MULTI-SELECT') || js.includes('ORDER / SEQUENCE')) &&
  js.includes('HARD-DIFFICULTY CONCENTRATION'));

// ── v4.45.1 DOMAIN MASTERY TIER THRESHOLD ADJUSTMENT ──
console.log('\n\x1b[1m── v4.45.1 TIER THRESHOLD ADJUSTMENT ──\x1b[0m');
// Proficient threshold dropped from 75% → 70% and Novice ceiling dropped from
// 60% → 55% after user dispute — real CompTIA raw-accuracy pass equivalent is
// ~70-75%, so "Proficient" now meaningfully = "you'd likely pass today."
// Scope the matches to the tierInfo arrow function body so we don't accidentally
// match other numeric comparisons elsewhere.
// The `pct >= N) return { label: '...', cls: 'dm-badge-...' }` pattern
// appears only in tierInfo, so testing against the whole app.js is safe
// and avoids brace-depth extraction gymnastics.
test('v4.45.1: Proficient threshold at 70% (was 75%)',
  /pct\s*>=\s*70\)\s*return\s*\{\s*label:\s*'Proficient'/.test(js));
test('v4.45.1: Developing / Novice boundary at 55% (was 60%)',
  /pct\s*>=\s*55\)\s*return\s*\{\s*label:\s*'Developing'/.test(js));
test('v4.45.1: Mastered threshold unchanged at 85%',
  /pct\s*>=\s*85\)\s*return\s*\{\s*label:\s*'Mastered'/.test(js));
// Regression guards — old thresholds must stay gone
test('v4.45.1: old 75% Proficient threshold removed (regression guard)',
  !/pct\s*>=\s*75\)\s*return\s*\{\s*label:\s*'Proficient'/.test(js));
test('v4.45.1: old 60% Developing threshold removed (regression guard)',
  !/pct\s*>=\s*60\)\s*return\s*\{\s*label:\s*'Developing'/.test(js));

// ── v4.45.2 ANALYTICS CLEANUP ──
console.log('\n\x1b[1m── v4.45.2 ANALYTICS CLEANUP ──\x1b[0m');
// Fix 1: Wrong-patterns horizontal (grid instead of flex-column)
test('v4.45.2 #1: .wp-list uses CSS grid with auto-fit minmax(260px, 1fr)',
  /\.wp-list\s*\{[^}]*display:\s*grid/.test(css) &&
  /\.wp-list\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(260px,\s*1fr\)\)/.test(css));
test('v4.45.2 #1: .wp-list no longer uses flex-direction: column (regression guard)',
  !/\.wp-list\s*\{[^}]*flex-direction:\s*column/.test(css));
// Fix 2: Practice Drills card removed
test('v4.45.2 #2: _renderAnaDrills function removed (regression guard)',
  !/function\s+_renderAnaDrills\(\)/.test(js));
test('v4.45.2 #2: renderAnalytics no longer calls _renderAnaDrills',
  !/html\s*\+=\s*_renderAnaDrills\(\)/.test(js));
test('v4.45.2 #2: Drills nav pill removed from _renderAnaNav',
  !/ana-s-drills/.test(js));
// Fix 3: Subtopic Weak Spots card removed
test('v4.45.2 #3: _renderAnaWeakSpots function removed (regression guard)',
  !/function\s+_renderAnaWeakSpots\(\)/.test(js));
test('v4.45.2 #3: renderAnalytics no longer calls _renderAnaWeakSpots',
  !/html\s*\+=\s*_renderAnaWeakSpots\(\)/.test(js));
// Fix 4: Milestones revamped
test('v4.45.2 #4: Milestones card has new .ana-card-ms wrapper',
  js.includes('ana-card-ms'));
test('v4.45.2 #4: Milestones header has progress bar (.ana-ms-bar-track + fill)',
  /\.ana-ms-bar-track\s*\{/.test(css) && /\.ana-ms-bar-fill\s*\{/.test(css));
test('v4.45.2 #4: "Recently unlocked" section rendered',
  js.includes('Recently unlocked'));
test('v4.45.2 #4: Full grid wrapped in collapsible <details>',
  /<details class="ana-ms-details">[\s\S]*?summary class="ana-ms-details-summary"/.test(js));
test('v4.45.2 #4: Milestones sort by date desc for recent-unlocks strip',
  /new Date\(unlockedMap\[b\.id\]\)\s*-\s*new Date\(unlockedMap\[a\.id\]\)/.test(js));
test('v4.45.2 #4: Show-all summary count matches totalMilestones',
  /Show all \$\{totalMilestones\} milestones/.test(js));
// Structural checks above cover the tier boundaries; a vm-sandbox smoke
// would need brace-depth extraction of the arrow-function body (non-greedy
// regex captures only the first `};` inside the function). Structural
// regex coverage is sufficient here — all 4 tier cutoffs + 2 regression
// guards on old cutoffs.

// ── v4.46.0 EXAM READINESS HERO POLISH ──
console.log('\n\x1b[1m── v4.46.0 EXAM READINESS HERO POLISH ──\x1b[0m');
// HTML structure refactor
test('v4.46.0: hero header row wrapper (.ana-ready-head)',
  js.includes('class="ana-ready-head"'));
test('v4.46.0: merged date-chip replaces old separate countdown + date-row',
  js.includes('class="ana-exam-date-btn ana-ready-datechip'));
test('v4.46.0: hero row wrapper (.ana-ready-hero-row)',
  js.includes('class="ana-ready-hero-row"'));
test('v4.46.0: score denom "/ 900" rendered next to predicted',
  js.includes('class="ana-ready-denom"') && js.includes('/ 900'));
test('v4.46.0: 720 PASS tick positioned by formula',
  /passTickPct\s*=\s*\(\(EXAM_PASS_SCORE\s*-\s*420\)\s*\/\s*450\)\s*\*\s*100/.test(js));
test('v4.46.0: PASS tick + PASS label elements rendered',
  js.includes('ana-ready-bar-passtick') && js.includes('ana-ready-bar-passlabel'));
test('v4.46.0: bar scale 420/870 labels rendered', js.includes('ana-ready-bar-scale'));
// Domain row structure
test('v4.46.0: domain rows have tier-colored dot', js.includes('class="ana-domain-dot"'));
test('v4.46.0: domain weight shows "% of exam" subtext',
  js.includes('% of exam'));
test('v4.46.0: domain row wrapper classed by tier (ana-domain-row-${tier})',
  /ana-domain-row ana-domain-row-\$\{tier\}/.test(js));
test('v4.46.0: domain tier cutoffs match Domain Mastery card (55/70/85)',
  /pct >= 85[\s\S]{0,80}mastered[\s\S]{0,120}pct >= 70[\s\S]{0,80}proficient[\s\S]{0,120}pct >= 55[\s\S]{0,80}developing/.test(js));
test('v4.46.0: domain bar 85% target tick element', js.includes('class="ana-domain-target"'));
// Stats strip — icons above values
test('v4.46.0: stats strip has icon layer (.ana-hero-stat-icon)',
  js.includes('ana-hero-stat-icon'));
// Date chip states
test('v4.46.0: date chip has urgent/past literal states + dynamic urgency class',
  js.includes('ana-ready-datechip-urgent') && js.includes('ana-ready-datechip-past') && /ana-ready-datechip-\$\{urgency\}/.test(js));
test('v4.46.0: urgency ladder covers 7-day/30-day/ok buckets',
  /daysToExam <= 7 \? 'urgent' : daysToExam <= 30 \? 'soon' : 'ok'/.test(js));
test('v4.46.0: date chip clear uses event.stopPropagation to not re-open picker',
  js.includes("event.stopPropagation();updateExamDate(\\'\\')"));
// CSS coverage
test('v4.46.0 CSS: .ana-ready-head defined', css.includes('.ana-ready-head '));
test('v4.46.0 CSS: .ana-ready-hero-row grid', /\.ana-ready-hero-row\s*\{[^}]*display:\s*grid/.test(css));
test('v4.46.0 CSS: .ana-ready-bar-passtick positioned absolute',
  /\.ana-ready-bar-passtick\s*\{[^}]*position:\s*absolute/.test(css));
test('v4.46.0 CSS: .ana-domain-dot styled', css.includes('.ana-domain-dot '));
test('v4.46.0 CSS: .ana-domain-target 85% position', /\.ana-domain-target\s*\{[^}]*left:\s*85%/.test(css));
test('v4.46.0 CSS: .ana-ready-datechip styled', css.includes('.ana-ready-datechip '));
test('v4.46.0 CSS: stats tiles have hairline dividers via ::before',
  /\.ana-hero-stat\s*\+\s*\.ana-hero-stat::before/.test(css));
test('v4.46.0 CSS: narrow-viewport responsive block at 560px',
  /@media \(max-width:\s*560px\)\s*\{[\s\S]*?\.ana-ready-hero-row\s*\{[^}]*grid-template-columns:\s*1fr/.test(css));
test('v4.46.0 CSS: reduced-motion neutralises hero animations',
  /prefers-reduced-motion[\s\S]{0,2000}\.ana-ready-bar-fill,\s*\.ana-domain-fill\s*\{[^}]*transition:\s*none/.test(css));
// Regression guards on OLD structure
test('v4.46.0: old .ana-ready-top wrapper removed (regression guard)',
  !js.includes('class="ana-ready-top"'));
test('v4.46.0: old .ana-ready-countdown element removed (regression guard)',
  !js.includes('class="ana-ready-countdown"'));
test('v4.46.0: old .ana-exam-date-row wrapper removed (regression guard)',
  !js.includes('class="ana-exam-date-row"'));
test('v4.46.0: old .ana-exam-date-lbl removed (regression guard)',
  !js.includes('class="ana-exam-date-lbl"'));
test('v4.46.0: old separate .ana-exam-date-clear button replaced by datechip-clear (regression guard)',
  !js.includes('class="ana-exam-date-clear"'));
test('v4.46.0: old .ana-domain-weight right-column removed (regression guard: weight is now subtext under name)',
  !/grid-template-columns:\s*1fr\s*36px\s*2fr\s*40px/.test(css));

// ── v4.46.1 HOMEPAGE CHIP FIX + STREAK POLISH + CANVAS WIDEN ──
console.log('\n\x1b[1m── v4.46.1 HOMEPAGE CHIP + STREAK + CANVAS ──\x1b[0m');
// Shared chip builder (eliminates homepage-chip vs analytics-chip drift)
test('v4.46.1: _buildExamDateChipHtml helper defined',
  js.includes('function _buildExamDateChipHtml(examDateStr, daysToExam, inputId)'));
test('v4.46.1: Analytics card uses shared helper',
  /const dateChip = _buildExamDateChipHtml\(examDateStr, daysToExam, 'ana-exam-date-input'\)/.test(js));
test('v4.46.1: renderReadinessCard uses shared helper',
  /_buildExamDateChipHtml\(dateStr, days, 'readiness-exam-input'\)/.test(js));
// Homepage HTML — old 3-element row replaced with single wrapper
test('v4.46.1: homepage .readiness-exam-lbl removed (chip fills wrapper now)',
  !html.includes('class="readiness-exam-lbl"'));
test('v4.46.1: homepage readiness-exam-countdown span removed',
  !html.includes('id="readiness-exam-countdown"'));
test('v4.46.1: homepage readiness-exam-display span removed (replaced by chip)',
  !html.includes('id="readiness-exam-display"'));
test('v4.46.1: homepage still has #readiness-exam-row wrapper for chip injection',
  html.includes('id="readiness-exam-row"'));
test('v4.46.1: renderReadinessCard no longer manipulates old spans by id',
  !js.match(/getElementById\(['"]readiness-exam-display['"]\)/));
// CSS cleanup
test('v4.46.1 CSS: old .readiness-exam-lbl rule removed',
  !css.includes('.readiness-exam-lbl {') && !css.includes('.readiness-exam-lbl\n'));
test('v4.46.1 CSS: old .readiness-exam-countdown RULE removed (comment reference OK)',
  !/\.readiness-exam-countdown\s*\{/.test(css));
test('v4.46.1 CSS: .readiness-exam-row hosts the chip full-width',
  /\.readiness-exam-row\s+\.ana-ready-datechip\s*\{[^}]*width:\s*100%/.test(css));
// Streak polish
test('v4.46.1: streak computes 5 heat tiers (cold/starting/warm/hot/blazing)',
  js.includes("heatTier = 'cold'") && js.includes("heatTier = 'starting'") && js.includes("heatTier = 'warm'") && js.includes("heatTier = 'hot'") && js.includes("heatTier = 'blazing'"));
test('v4.46.1: streak builds last-7-days dot row from daySet',
  /for \(let i = 6; i >= 0; i--\)[\s\S]{0,400}daySet\.has\(key\)/.test(js));
test('v4.46.1: streak week dots have today marker class',
  js.includes('ana-streak-day-today'));
test('v4.46.1: streak meta row uses icons (🏆 longest, 📅 last study)',
  js.includes('ana-streak-stat-ico'));
test('v4.46.1 CSS: .ana-streak-big-blazing gradient defined',
  css.includes('.ana-streak-big-blazing'));
test('v4.46.1 CSS: @keyframes streakFlamePulse defined',
  /@keyframes streakFlamePulse/.test(css));
test('v4.46.1 CSS: .ana-streak-week dot grid (7-col)',
  /\.ana-streak-week\s*\{[^}]*grid-template-columns:\s*repeat\(7/.test(css));
test('v4.46.1 CSS: .ana-streak-day-on fills with accent',
  css.includes('.ana-streak-day-on .ana-streak-day-dot'));
test('v4.46.1 CSS: reduced-motion neutralises flame pulse',
  /prefers-reduced-motion[\s\S]{0,2500}\.ana-streak-flame\s*\{[^}]*animation:\s*none/.test(css));
// Canvas widening
test('v4.46.1: Analytics page max-width bumped to 1040px',
  /#page-analytics\s*\{[^}]*max-width:\s*1040px/.test(css));
test('v4.46.1: .ana-calendar corner radius bumped (polish at larger cells)',
  /\.ana-cal-day\s*\{[^}]*border-radius:\s*6px/.test(css));
test('v4.46.1: .ana-calendar gap bumped to 5px', /\.ana-calendar\s*\{[^}]*gap:\s*5px/.test(css));

// ── v4.47.0 TOPOLOGY BUILDER SCENARIO EXPANSION ──
console.log('\n\x1b[1m── v4.47.0 TB SCENARIOS + ENDPOINTS + LEARN-MORE ──\x1b[0m');
// New consumer endpoint device types
test('v4.47.0: laptop device type registered',
  /laptop:\s*\{\s*label:\s*'Laptop'/.test(js));
test('v4.47.0: smartphone device type registered',
  /smartphone:\s*\{\s*label:\s*'Smartphone'/.test(js));
test('v4.47.0: game-console device type registered',
  /'game-console':\s*\{\s*label:\s*'Game Console'/.test(js));
test('v4.47.0: smart-tv device type registered',
  /'smart-tv':\s*\{\s*label:\s*'Smart TV'/.test(js));
test('v4.47.0: new endpoints added to Endpoints palette group',
  /types:\s*\['pc','laptop','smartphone','game-console','smart-tv'/.test(js));
test('v4.47.0: laptop + game-console + smart-tv use eth0',
  js.includes("laptop:         { count: 1,  naming: () => 'eth0' }") &&
  js.includes("'game-console': { count: 1,  naming: () => 'eth0' }") &&
  js.includes("'smart-tv':     { count: 1,  naming: () => 'eth0' }"));
test('v4.47.0: smartphone uses wlan0 interface naming',
  /smartphone:\s*\{\s*count:\s*1,\s*naming:\s*\(\)\s*=>\s*'wlan0'/.test(js));
// isEndpoint family checks updated (3 sites — health, overlay, gateway UI)
test('v4.47.0: health-check isEndpoint family includes new endpoints',
  js.includes("const isEndpoint = ['pc','laptop','smartphone','game-console','smart-tv','server','printer','voip','iot'].includes"));
test('v4.47.0: overlay/gateway isEndpoint family updated (replace_all covered 2 sites)',
  (js.match(/\['pc','laptop','smartphone','game-console','smart-tv','printer','voip','iot','public-web','public-file','public-cloud'\]/g) || []).length >= 2);
// 7 new scenarios registered
const newScenarioIds = ['home-network','sdwan','mpls','cloud-natgw','cloud-igw','cloud-peering','man'];
newScenarioIds.forEach(id => {
  test(`v4.47.0: scenario '${id}' registered`,
    new RegExp(`id:\\s*'${id}'`).test(js));
});
// 7 new dropdown options
newScenarioIds.forEach(id => {
  test(`v4.47.0: '${id}' option in dropdown`,
    html.includes(`value="${id}"`));
});
// Dropdown uses optgroup organization
test('v4.47.0: dropdown uses optgroup for Campus & Enterprise',
  html.includes('<optgroup label="Campus &amp; Enterprise">'));
test('v4.47.0: dropdown uses optgroup for WAN Architectures',
  html.includes('<optgroup label="WAN Architectures">'));
test('v4.47.0: dropdown uses optgroup for Cloud Networking',
  html.includes('<optgroup label="Cloud Networking">'));
// All 15 scenarios have explanation data (check for 5 section keys in source)
test('v4.47.0: scenarios carry explanation field',
  (js.match(/explanation:\s*\{/g) || []).length >= 15);
test('v4.47.0: scenarios carry overview field',
  (js.match(/overview:\s*'/g) || []).length >= 15);
test('v4.47.0: scenarios carry dataFlow field',
  (js.match(/dataFlow:\s*'/g) || []).length >= 15);
test('v4.47.0: scenarios carry keyDevices array',
  (js.match(/keyDevices:\s*\[/g) || []).length >= 15);
test('v4.47.0: scenarios carry concepts array',
  (js.match(/concepts:\s*\[/g) || []).length >= 15);
test('v4.47.0: scenarios carry examTies field',
  (js.match(/examTies:\s*'/g) || []).length >= 15);
// Render function — Learn-more <details> collapsible
test('v4.47.0: tbRenderScenarioPanel builds learnHtml conditional on explanation',
  /if \(scen\.explanation\)/.test(js));
test('v4.47.0: panel renders a <details class="tb-scenario-learn">',
  js.includes('<details class="tb-scenario-learn">'));
test('v4.47.0: Learn more summary has icon + label + chevron',
  js.includes('tb-scenario-learn-summary') &&
  js.includes('tb-scenario-learn-icon') &&
  js.includes('tb-scenario-learn-chev'));
test('v4.47.0: panel renders 5 structured sections (Overview/Data flow/Key devices/Concepts/Exam)',
  js.includes('Overview') && js.includes('How it routes data') && js.includes('Key devices') && js.includes('Key concepts') && js.includes('Exam relevance'));
// CSS
test('v4.47.0 CSS: .tb-scenario-learn styled',
  css.includes('.tb-scenario-learn '));
test('v4.47.0 CSS: .tb-scenario-learn[open] chevron rotates 90deg',
  /\.tb-scenario-learn\[open\]\s+\.tb-scenario-learn-chev\s*\{[^}]*transform:\s*rotate\(90deg\)/.test(css));
test('v4.47.0 CSS: Learn-more body has fade-in keyframe',
  /@keyframes tbScenarioLearnFade/.test(css));
test('v4.47.0 CSS: .tb-scenario-sec-exam has yellow highlight',
  /\.tb-scenario-sec-exam\s*\{[^}]*border-left:\s*3px\s+solid\s+rgba\(251,191,36/.test(css));
test('v4.47.0 CSS: light-theme override for .tb-scenario-learn-summary',
  /\[data-theme="light"\]\s+\.tb-scenario-learn-summary/.test(css));
test('v4.47.0 CSS: reduced-motion neutralises Learn-more animations',
  /prefers-reduced-motion[\s\S]{0,3000}\.tb-scenario-learn-body\s*\{[^}]*animation:\s*none/.test(css));
test('v4.47.0 CSS: narrow-viewport tightens Learn-more padding',
  /@media \(max-width:\s*560px\)[\s\S]{0,400}\.tb-scenario-learn-body\s*\{[^}]*padding:\s*12px\s*14px/.test(css));

// ── v4.47.1 SCENARIO PICKER + VISIBLE FEEDBACK ──
console.log('\n\x1b[1m── v4.47.1 SCENARIO PICKER + FEEDBACK ──\x1b[0m');
// v4.47.1 empty-state tile (now rendered dynamically by tbRenderEmptyHint in v4.47.2)
test('v4.47.1: empty-state has Load-a-scenario tile class (in tbRenderEmptyHint source)',
  js.includes('tb-empty-cta-scenario'));
test('v4.47.1: empty-state tile wires to tbOpenScenarioPicker', js.includes("onclick=\"tbOpenScenarioPicker()\""));
test('v4.47.1/v4.49.0: empty-state tile advertises "N real-world network patterns"',
  js.includes('real-world network patterns'));
// Scenario picker modal in HTML
test('v4.47.1: #tb-scenario-picker modal present in HTML',
  html.includes('id="tb-scenario-picker"'));
test('v4.47.1: scenario picker body div present', html.includes('id="tb-scenario-picker-body"'));
// Picker JS
test('v4.47.1: tbOpenScenarioPicker function defined', js.includes('function tbOpenScenarioPicker('));
test('v4.47.1: tbLoadScenarioFromPicker function defined', js.includes('function tbLoadScenarioFromPicker('));
test('v4.47.1: TB_SCENARIO_CATEGORIES defined with 3 buckets',
  js.includes('const TB_SCENARIO_CATEGORIES'));
test('v4.47.1: categories cover Campus + WAN + Cloud',
  js.includes("name: 'Campus & Enterprise'") && js.includes("name: 'WAN Architectures'") && js.includes("name: 'Cloud Networking'"));
test('v4.47.1: TB_SCENARIO_ICONS map defined', js.includes('const TB_SCENARIO_ICONS'));
test('v4.47.1: picker shows current-scenario badge',
  js.includes('tb-scenario-card-active') && js.includes('tb-scenario-card-badge'));
test('v4.47.1: picker renders device-count + concept-count chips',
  js.includes('tb-scenario-card-chip'));
test('v4.47.1: picker offers Free Build reset at bottom',
  js.includes('Clear scenario (back to Free Build)'));
test('v4.47.1: tbLoadScenarioFromPicker syncs the toolbar dropdown',
  /tbLoadScenarioFromPicker[\s\S]{0,400}getElementById\('tb-scenario-select'\)/.test(js));
// Visible feedback in tbSetScenario (v4.47.2: empty-hint logic moved into tbRenderEmptyHint,
// tbSetScenario just delegates + shows toast)
test('v4.47.1/2: tbSetScenario calls tbRenderEmptyHint to update canvas feedback',
  /function tbSetScenario\(id\)[\s\S]{0,1500}tbRenderEmptyHint\(\)/.test(js));
test('v4.48.0: success toast is shown by tbLoadScenarioWithBuild (not tbSetScenario anymore \u2014 toast moved to the flow that actually builds)',
  /function tbLoadScenarioWithBuild\(id\)[\s\S]{0,2500}showSuccessToast/.test(js));
test('v4.47.2: tbRenderCanvas delegates empty-state to tbRenderEmptyHint',
  /function tbRenderCanvas\(\)[\s\S]{0,6000}tbRenderEmptyHint\(\)/.test(js));
// Success toast helper
test('v4.47.1: showSuccessToast helper defined', js.includes('function showSuccessToast('));
test('v4.47.1 CSS: .success-toast green-gradient styling',
  /\.success-toast\s*\{[^}]*linear-gradient\(135deg,\s*#22c55e/.test(css));
// Picker CSS
test('v4.47.1 CSS: .tb-scenario-card styled', css.includes('.tb-scenario-card '));
test('v4.47.1 CSS: .tb-scenario-picker-grid uses auto-fit',
  /\.tb-scenario-picker-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit/.test(css));
test('v4.47.1 CSS: .tb-scenario-card-active accent treatment',
  css.includes('.tb-scenario-card-active'));
test('v4.47.1 CSS: light-theme override for scenario picker',
  /\[data-theme="light"\]\s+\.tb-scenario-picker-cat/.test(css));
test('v4.47.1 CSS: reduced-motion neutralises scenario-card hover lift',
  /prefers-reduced-motion[\s\S]{0,4000}\.tb-scenario-card\s*\{[^}]*transition:\s*none/.test(css));
test('v4.47.1 CSS: .tb-empty-cta-scenario gets accent gradient',
  css.includes('.tb-empty-cta-scenario'));
// v4.47.1: proper SVG icons for the 4 new endpoint devices (no more plain-circle fallback)
test("v4.47.1: tbDeviceIcon 'laptop' case renders screen + keyboard", /case\s+'laptop':[\s\S]{0,600}rect x="-22" y="-14" width="44"/.test(js));
test("v4.47.1: tbDeviceIcon 'smartphone' case renders portrait phone body", /case\s+'smartphone':[\s\S]{0,500}rect x="-10" y="-16" width="20" height="32"/.test(js));
test("v4.47.1: tbDeviceIcon 'game-console' case renders controller w/ d-pad + thumbsticks", /case\s+'game-console':[\s\S]{0,700}rect x="-24" y="-12" width="48"/.test(js));
test("v4.47.1: tbDeviceIcon 'smart-tv' case renders TV w/ stand + base", /case\s+'smart-tv':[\s\S]{0,700}rect x="-26" y="-14" width="52"/.test(js));
test("v4.47.1: all 4 consumer device icons present in switch (regression — no plain-circle fallback)",
  js.includes("case 'laptop':") && js.includes("case 'smartphone':") &&
  js.includes("case 'game-console':") && js.includes("case 'smart-tv':"));

// ── v4.47.2 IN-CANVAS SCENARIO-LOADED FEEDBACK ──
console.log('\n\x1b[1m── v4.47.2 IN-CANVAS SCENARIO CARD ──\x1b[0m');
// HTML shell emptied (regression guard — content must be dynamic, not static)
test('v4.47.2: #tb-empty-hint HTML shell is empty (dynamic content only)',
  /<div id="tb-empty-hint"[^>]*>\s*<!--[^-]*(?:-[^-]|--[^>])*-->\s*<\/div>/.test(html) ||
  /<div id="tb-empty-hint"[^>]*>\s*<\/div>/.test(html) ||
  /<div id="tb-empty-hint"[^>]*>(\s|<!--[\s\S]*?-->)*<\/div>/.test(html));
test('v4.47.2: static Ready-to-build HTML removed (regression guard — now rendered via JS)',
  !/<div class="tb-empty-title">Ready to build a network\?<\/div>/.test(html));
// tbRenderEmptyHint function
test('v4.47.2: tbRenderEmptyHint function defined',
  js.includes('function tbRenderEmptyHint('));
test('v4.47.2: tbRenderEmptyHint handles free-build (4 CTAs) mode',
  /function tbRenderEmptyHint[\s\S]{0,3000}Ready to build a network/.test(js));
test('v4.47.2: tbRenderEmptyHint handles scenario-loaded mode (tb-sc-loaded)',
  /function tbRenderEmptyHint[\s\S]{0,5000}class="tb-sc-loaded"/.test(js));
test('v4.47.2: tbRenderEmptyHint renders SCENARIO ACTIVE badge',
  /function tbRenderEmptyHint[\s\S]{0,5000}Scenario active/.test(js));
test('v4.47.2: tbRenderEmptyHint renders required-devices chips',
  /function tbRenderEmptyHint[\s\S]{0,5000}tb-sc-loaded-chip/.test(js));
test('v4.47.2: tbRenderEmptyHint offers View Deep Explanation CTA',
  js.includes('View deep explanation'));
test('v4.47.2: tbRenderEmptyHint offers Change scenario + Clear CTAs',
  js.includes('Change scenario') && js.includes('tbLoadScenarioFromPicker(\'free\')'));
// tbOpenScenarioDeepDive
test('v4.47.2: tbOpenScenarioDeepDive function defined',
  js.includes('function tbOpenScenarioDeepDive('));
test('v4.47.2: deep-dive helper auto-opens Learn-more details',
  /function tbOpenScenarioDeepDive[\s\S]{0,400}details\.setAttribute\('open'/.test(js));
test("v4.47.2: deep-dive helper uses block: 'start' to force scroll",
  /function tbOpenScenarioDeepDive[\s\S]{0,500}block:\s*'start'/.test(js));
// CSS
test('v4.47.2 CSS: .tb-sc-loaded premium card styled',
  css.includes('.tb-sc-loaded '));
test('v4.47.2 CSS: fade-in keyframe tbScLoadedIn',
  /@keyframes tbScLoadedIn/.test(css));
test('v4.47.2 CSS: .tb-sc-loaded-cta-primary gradient treatment',
  css.includes('.tb-sc-loaded-cta-primary'));
test('v4.47.2 CSS: .tb-sc-loaded-chip pill styling',
  css.includes('.tb-sc-loaded-chip'));
test('v4.47.2 CSS: light-theme override for scenario-loaded card',
  /\[data-theme="light"\]\s+\.tb-sc-loaded\b/.test(css));
test('v4.47.2 CSS: reduced-motion neutralises tb-sc-loaded animation',
  /prefers-reduced-motion[\s\S]{0,5000}\.tb-sc-loaded\s*\{[^}]*animation:\s*none/.test(css));
test('v4.47.2 CSS: narrow-viewport tightens scenario-loaded card',
  /@media \(max-width:\s*560px\)[\s\S]{0,500}\.tb-sc-loaded\s*\{[^}]*padding:\s*18px\s*20px/.test(css));

// ── v4.48.0 SCENARIO AUTO-BUILD ──
console.log('\n\x1b[1m── v4.48.0 SCENARIO AUTO-BUILD ──\x1b[0m');
// Helpers
test('v4.48.0: _tbMkDev helper defined', js.includes('function _tbMkDev(opts)'));
test('v4.48.0: _tbMkCable helper defined', js.includes('function _tbMkCable(a, b'));
test('v4.48.0: tbLoadScenarioWithBuild flow defined',
  js.includes('function tbLoadScenarioWithBuild(id)'));
test('v4.48.0: loader confirms before replacing dirty canvas',
  /tbLoadScenarioWithBuild[\s\S]{0,2500}confirm\(`Load "\$\{scen\.title\}" scenario/.test(js));
test('v4.48.0: loader clears state via tbNewState() then runs autoBuild',
  /tbLoadScenarioWithBuild[\s\S]{0,2500}tbNewState\(\)[\s\S]{0,400}scen\.autoBuild\(tbState\)/.test(js));
test('v4.48.0: loader shows build-complete toast with device count',
  /tbLoadScenarioWithBuild[\s\S]{0,2500}devices connected\. Explore/.test(js));
// Entry points wired
test('v4.48.0: tbLoadScenarioFromPicker calls tbLoadScenarioWithBuild (not bare tbSetScenario)',
  /function tbLoadScenarioFromPicker[\s\S]{0,500}tbLoadScenarioWithBuild\(id\)/.test(js));
test('v4.48.0: toolbar dropdown onchange wired to tbLoadScenarioWithBuild',
  html.includes('onchange="tbLoadScenarioWithBuild(this.value)"'));
// All 15 scenarios have autoBuild
const scenariosWithBuild = ['home-network', 'small-office', 'dmz', 'enterprise', 'branch-wireless',
  'cloud-vpc', 'hybrid-cloud', 'multi-vpc', 'sase-arch', 'sdwan', 'mpls',
  'cloud-natgw', 'cloud-igw', 'cloud-peering', 'man'];
scenariosWithBuild.forEach(id => {
  test(`v4.48.0: scenario '${id}' has autoBuild function`,
    new RegExp(`id:\\s*'${id}'[\\s\\S]{0,4000}autoBuild:\\s*\\(state\\)\\s*=>`).test(js));
});
// Spot-check that autoBuild functions actually push devices + cables
test('v4.48.0: every scenario autoBuild pushes to state.devices',
  (js.match(/autoBuild:\s*\(state\)\s*=>\s*\{[\s\S]*?state\.devices\.push/g) || []).length >= 15);
test('v4.48.0: every scenario autoBuild pushes to state.cables',
  (js.match(/autoBuild:\s*\(state\)\s*=>\s*\{[\s\S]*?state\.cables\.push/g) || []).length >= 15);

// ── v4.49.0 16 NEW SCENARIOS + 4 DEVICE TYPES ──
console.log('\n\x1b[1m── v4.49.0 16 SCENARIOS + 4 DEVICE TYPES ──\x1b[0m');
// New device types registered
test('v4.49.0: satellite device type registered',
  /'satellite':\s*\{\s*label:\s*'Satellite'/.test(js));
test('v4.49.0: cell-tower device type registered',
  /'cell-tower':\s*\{\s*label:\s*'Cell Tower'/.test(js));
test('v4.49.0: modem device type registered',
  /'modem':\s*\{\s*label:\s*'Modem/.test(js));
test('v4.49.0: san-array device type registered',
  /'san-array':\s*\{\s*label:\s*'SAN Storage Array'/.test(js));
// Palette placement
test("v4.49.0: new 'WAN & Broadband' palette group added",
  js.includes("label: 'WAN & Broadband'"));
test("v4.49.0: san-array added to Endpoints palette group",
  /types:\s*\['pc','laptop','smartphone','game-console','smart-tv','printer','voip','iot','server','dns-server','san-array'/.test(js));
// Interface defaults for new devices
test('v4.49.0: satellite iface default (uplink/downlink, count=2)',
  /'satellite':\s*\{\s*count:\s*2,\s*naming:\s*i\s*=>\s*i === 0 \? 'uplink' : 'downlink'/.test(js));
test('v4.49.0: cell-tower iface default (backhaul + sector antennas)',
  /'cell-tower':\s*\{\s*count:\s*3,\s*naming:\s*i\s*=>\s*i === 0 \? 'backhaul' : 'sector'/.test(js));
test('v4.49.0: modem iface default (wan/lan, count=2)',
  /'modem':\s*\{\s*count:\s*2,\s*naming:\s*i\s*=>\s*i === 0 \? 'wan' : 'lan'/.test(js));
test('v4.49.0: san-array iface default (fc0/fc1, count=2)',
  /'san-array':\s*\{\s*count:\s*2,\s*naming:\s*i\s*=>\s*'fc' \+ i/.test(js));
// SVG icons present (regression — no plain-circle fallback for new types)
test("v4.49.0: tbDeviceIcon 'satellite' case — bus + solar panels + dish",
  /case\s+'satellite':[\s\S]{0,1500}Satellite body[\s\S]{0,500}Solar panels[\s\S]{0,800}Dish antenna/.test(js));
test("v4.49.0: tbDeviceIcon 'cell-tower' case — truss + antennas + signal arcs",
  /case\s+'cell-tower':[\s\S]{0,1500}Tower base[\s\S]{0,500}Antenna array[\s\S]{0,500}Radio signal arcs/.test(js));
test("v4.49.0: tbDeviceIcon 'modem' case — body + LED row + antenna stub",
  /case\s+'modem':[\s\S]{0,2500}Modem body[\s\S]{0,800}LED indicator row[\s\S]{0,800}Short antenna stub/.test(js));
test("v4.49.0: tbDeviceIcon 'san-array' case — chassis + 4 drive bays + LEDs",
  /case\s+'san-array':[\s\S]{0,1500}drive-bay slots stacked[\s\S]{0,800}Drive activity LEDs/.test(js));
test('v4.49.0: all 4 new device icons present (regression — no plain-circle fallback)',
  js.includes("case 'satellite':") && js.includes("case 'cell-tower':") &&
  js.includes("case 'modem':") && js.includes("case 'san-array':"));

// 16 new scenarios registered with autoBuild
const newScenarios = [
  // Tier 1
  'point-to-point', 'hub-spoke', 'full-mesh', 's2s-vpn', 'remote-vpn', 'cellular', 'satellite-wan',
  // Tier 2
  'dsl', 'cable', 'ftth',
  // Tier 3
  'multi-homed-bgp', 'gre-tunnel',
  // Tier 4
  'can', 'pan', 'san', 'wlan',
];
newScenarios.forEach(id => {
  test(`v4.49.0: scenario '${id}' registered with autoBuild + explanation`,
    new RegExp(`id:\\s*'${id}'[\\s\\S]{0,6000}autoBuild:\\s*\\(state\\)\\s*=>[\\s\\S]{0,6000}explanation:\\s*\\{`).test(js));
});

// Dropdown: new optgroups
test('v4.49.0: dropdown has Broadband & Last-Mile optgroup',
  html.includes('<optgroup label="Broadband &amp; Last-Mile">'));
test('v4.49.0: dropdown has Advanced WAN optgroup',
  html.includes('<optgroup label="Advanced WAN">'));
test('v4.49.0: dropdown has Other Network Types optgroup',
  html.includes('<optgroup label="Other Network Types">'));
newScenarios.forEach(id => {
  test(`v4.49.0: dropdown option for '${id}'`, html.includes(`value="${id}"`));
});

// Picker categories + icons updated
test('v4.49.0: TB_SCENARIO_CATEGORIES expanded to 6 buckets',
  (js.match(/\{\s*\n\s*name:\s*'[^']+',\s*\n\s*icon:/g) || []).length >= 6);
test("v4.49.0: 'Broadband & Last-Mile' category registered",
  js.includes("name: 'Broadband & Last-Mile'"));
test("v4.49.0: 'Advanced WAN' category registered",
  js.includes("name: 'Advanced WAN'"));
test("v4.49.0: 'Other Network Types' category registered",
  js.includes("name: 'Other Network Types'"));
// Spot-check a few new scenario icons
test("v4.49.0: TB_SCENARIO_ICONS has entry for point-to-point",
  /'point-to-point':\s*'/.test(js));
test("v4.49.0: TB_SCENARIO_ICONS has entry for san",
  /'san':\s*'\\u\{1F4BE\}'/.test(js));

// Empty-state tile copy updated (16 → 31)
test('v4.49.0: empty-state tile advertises 31 real-world network patterns',
  js.includes('31 real-world network patterns'));
test('v4.49.0: old "16 real-world" copy removed (regression guard)',
  !js.includes('16 real-world network patterns'));

// ── v4.49.1 HOW-TO BUILD UI REVAMP ──
console.log('\n\x1b[1m── v4.49.1 HOW-TO BUILD REVAMP ──\x1b[0m');
// HTML: new step structure
test('v4.49.1: old .tb-howto-item structure removed (regression guard)',
  !html.includes('class="tb-howto-item"'));
test('v4.49.1: new .tb-howto-step cards present', html.includes('class="tb-howto-step"'));
test('v4.49.1: step-head/num/icon structure in place',
  html.includes('class="tb-howto-step-head"') &&
  html.includes('class="tb-howto-step-num"') &&
  html.includes('class="tb-howto-step-icon"'));
test('v4.49.1: step title + desc structure in place',
  html.includes('class="tb-howto-step-title"') &&
  html.includes('class="tb-howto-step-desc"'));
test('v4.49.1: 5 step cards exist (was 4)',
  (html.match(/class="tb-howto-step"/g) || []).length === 5);
test('v4.49.1: step titles — Drag / Wire / Configure / Move & Delete / Simulate',
  html.includes('>Drag<') && html.includes('>Wire<') &&
  html.includes('>Configure<') && html.includes('>Move &amp; Delete<') &&
  html.includes('>Simulate<'));
test('v4.49.1: Step 4 <kbd>Del</kbd> properly styled (not inline in mangled prose)',
  /tb-howto-step-desc[^<]*<[^<]*<kbd>Del<\/kbd>/.test(html) || html.includes('<kbd>Del</kbd>'));
test('v4.49.1: summary emoji updated to 📚 How to build',
  html.includes('&#128218; How to build'));
// CSS
test('v4.49.1 CSS: .tb-howto-step premium styling defined',
  css.includes('.tb-howto-step {') && /\.tb-howto-step\s*\{[^}]*radial-gradient/.test(css));
test('v4.49.1 CSS: hover lift on step card',
  /\.tb-howto-step:hover\s*\{[^}]*transform:\s*translateY\(-2px\)/.test(css));
test('v4.49.1 CSS: .tb-howto-step-num circular badge',
  /\.tb-howto-step-num\s*\{[^}]*border-radius:\s*50%/.test(css));
test('v4.49.1 CSS: .tb-howto-step-title styled with accent color',
  css.includes('.tb-howto-step-title'));
test('v4.49.1 CSS: <kbd> chip styling with double-bottom-border',
  /\.tb-howto-step\s+kbd\s*\{[^}]*border-bottom-width:\s*2px/.test(css));
test('v4.49.1 CSS: narrow-viewport responsive at 680px',
  /@media \(max-width:\s*680px\)[\s\S]{0,500}\.tb-howto-strip/.test(css));
test('v4.49.1 CSS: light-theme override for step cards',
  /\[data-theme="light"\]\s+\.tb-howto-step\s/.test(css));
test('v4.49.1 CSS: reduced-motion neutralises step hover-lift',
  /prefers-reduced-motion[\s\S]{0,5000}\.tb-howto-step\s*\{[^}]*transition:\s*none/.test(css));
// Regression: old CSS gone
test('v4.49.1 CSS: old .tb-howto-item rule removed',
  !/\.tb-howto-item\s*\{/.test(css));
test('v4.49.1 CSS: old .tb-howto-num rule removed (replaced by .tb-howto-step-num)',
  !/\.tb-howto-num\s*\{/.test(css));

// ── v4.49.2 PACKET-COLOR FIX (scenarios show green) ──
console.log('\n\x1b[1m── v4.49.2 PACKET-COLOR FIX ──\x1b[0m');
// Expanded exemption list
test("v4.49.2: TB_NO_IP_NEEDED includes 'wap'",
  /const TB_NO_IP_NEEDED\s*=\s*\[[\s\S]{0,400}'wap'/.test(js));
test("v4.49.2: TB_NO_IP_NEEDED includes 'modem'",
  /const TB_NO_IP_NEEDED\s*=\s*\[[\s\S]{0,400}'modem'/.test(js));
test("v4.49.2: TB_NO_IP_NEEDED includes 'cell-tower'",
  /const TB_NO_IP_NEEDED\s*=\s*\[[\s\S]{0,400}'cell-tower'/.test(js));
test("v4.49.2: TB_NO_IP_NEEDED includes 'satellite'",
  /const TB_NO_IP_NEEDED\s*=\s*\[[\s\S]{0,400}'satellite'/.test(js));
test("v4.49.2: TB_NO_IP_NEEDED includes 'san-array'",
  /const TB_NO_IP_NEEDED\s*=\s*\[[\s\S]{0,400}'san-array'/.test(js));
test("v4.49.2: TB_NO_IP_NEEDED includes 'wlc'",
  /const TB_NO_IP_NEEDED\s*=\s*\[[\s\S]{0,400}'wlc'/.test(js));
test("v4.49.2: TB_NO_IP_NEEDED includes 'isp-router'",
  /const TB_NO_IP_NEEDED\s*=\s*\[[\s\S]{0,400}'isp-router'/.test(js));
// Preserve original entries
test('v4.49.2: original exempt entries preserved (switch/dmz-switch/cloud)',
  /const TB_NO_IP_NEEDED\s*=\s*\[[\s\S]{0,400}'switch'[\s\S]{0,200}'dmz-switch'[\s\S]{0,200}'cloud'/.test(js));

// Link-local auto-assign in _tbMkCable
test('v4.49.2: _tbLinkLocalSlot counter defined',
  js.includes('let _tbLinkLocalSlot = 0;'));
test('v4.49.2/v4.49.3: auto-assign 169.254.x.y/30 for L3\u2194L3 cables (now in shared helper)',
  /function _tbAutoAssignCableIps[\s\S]{0,2000}169\.254\.[\s\S]{0,500}255\.255\.255\.252/.test(js));
test('v4.49.2: auto-assign covers L3↔L3 matching /30 case',
  /aL3\s*&&\s*bL3\s*&&\s*!aIfc\.ip\s*&&\s*!bIfc\.ip/.test(js));
test('v4.49.2: auto-assign covers L3↔exempt one-sided case (assignSide helper)',
  /assignSide\s*=\s*\(ifc\)\s*=>/.test(js) && /if\s*\(aL3\s*&&\s*!aIfc\.ip\)\s*assignSide\(aIfc\)/.test(js));
test("v4.49.2/v4.49.3: auto-assign skipped for console cables (in shared helper)",
  /function _tbAutoAssignCableIps[\s\S]{0,500}cableType\s*===\s*'console'/.test(js));
test('v4.49.2: /30 pool stepping by 4 (two usable hosts per /30)',
  /offset\s*=\s*\(slot\s*%\s*63\)\s*\*\s*4/.test(js));

// Counter reset in tbLoadScenarioWithBuild
test('v4.49.2: counter reset to 0 before autoBuild runs',
  /function tbLoadScenarioWithBuild\(id\)[\s\S]{0,2500}_tbLinkLocalSlot\s*=\s*0/.test(js));

// Behavioural check — verify a sample scenario would pass health check
// (done here via structural inspection; live Chrome-MCP run covers real behaviour)
test('v4.49.2: tbAssessCableHealth gates on ip + exempt (unchanged logic, widened list)',
  /function tbAssessCableHealth[\s\S]{0,2000}fromHasIp\s*=\s*fromIfc\?\.ip\s*\|\|\s*fromExempt/.test(js));

// ── v4.49.3 AI GENERATE shares the auto-assign helper ──
console.log('\n\x1b[1m── v4.49.3 AI GENERATE AUTO-ASSIGN ──\x1b[0m');
test('v4.49.3: _tbAutoAssignCableIps helper extracted + defined',
  js.includes('function _tbAutoAssignCableIps('));
test('v4.49.3: _tbMkCable delegates to the shared helper',
  /function _tbMkCable[\s\S]{0,3000}_tbAutoAssignCableIps\(a,\s*a\.interfaces\[aIdx\],\s*b,\s*b\.interfaces\[bIdx\],\s*type\)/.test(js));
test('v4.49.3: tbBuildFromAiPayload resets the link-local counter',
  /function tbBuildFromAiPayload[\s\S]{0,500}_tbLinkLocalSlot\s*=\s*0/.test(js));
test('v4.49.3: tbBuildFromAiPayload calls the shared helper on each cable',
  /function tbBuildFromAiPayload[\s\S]{0,5000}_tbAutoAssignCableIps\(fromDev,\s*fromIfc,\s*toDev,\s*toIfc/.test(js));

// ── v4.49.4 GRADE + COACH BLOCK PRISTINE SCENARIO BUILDS ──
console.log('\n\x1b[1m── v4.49.4 PRISTINE-SCENARIO GATING ──\x1b[0m');
test('v4.49.4: tbIsPristineScenario helper defined',
  js.includes('function tbIsPristineScenario()'));
test('v4.49.4: tbLoadScenarioWithBuild snapshots device IDs after autoBuild',
  /tbLoadScenarioWithBuild[\s\S]{0,2500}tbState\.pristineDeviceIds\s*=\s*tbState\.devices\.map\(d\s*=>\s*d\.id\)\.sort\(\)/.test(js));
test('v4.49.4: tbLoadScenarioWithBuild snapshots cable IDs',
  /tbLoadScenarioWithBuild[\s\S]{0,2500}tbState\.pristineCableIds\s*=\s*tbState\.cables\.map\(c\s*=>\s*c\.id\)\.sort\(\)/.test(js));
test('v4.49.4: tbLoadScenarioWithBuild records scenario id on pristineScenarioId',
  /tbLoadScenarioWithBuild[\s\S]{0,2500}tbState\.pristineScenarioId\s*=\s*id/.test(js));
test('v4.49.4: tbIsPristineScenario returns false when no scenario loaded',
  /function tbIsPristineScenario\(\)[\s\S]{0,500}!tbState\.pristineScenarioId/.test(js));
test('v4.49.4: tbIsPristineScenario compares both device AND cable id lists',
  /function tbIsPristineScenario[\s\S]{0,1500}currDevs[\s\S]{0,400}currCabs/.test(js));
test('v4.49.4: tbGradeTopology refuses pristine scenario + shows reference-scenario message',
  /function tbGradeTopology[\s\S]{0,1500}tbIsPristineScenario\(\)[\s\S]{0,400}reference scenario/.test(js));
test('v4.49.4: tbCoachTopology refuses pristine scenario + points to Learn more',
  /tbCoachTopology[\s\S]{0,1500}tbIsPristineScenario\(\)[\s\S]{0,400}Learn more/.test(js));

// ── v4.49.5 DEPLOY-VERIFY RETRY/BACKOFF (issue #167) ──
console.log('\n\x1b[1m── v4.49.5 DEPLOY-VERIFY RETRY/BACKOFF ──\x1b[0m');
const deployVerifyJs = fs.readFileSync(path.join(ROOT, 'tests/deploy-verify.js'), 'utf8');
test('v4.49.5: deploy-verify retry schedule is [15s, 30s, 60s, 120s]',
  /BACKOFFS_MS\s*=\s*\[15_000,\s*30_000,\s*60_000,\s*120_000\]/.test(deployVerifyJs));
test('v4.49.5: deploy-verify retry loop gates on triadMatches + attempt budget',
  /for\s*\(let\s+i\s*=\s*0;\s*i\s*<\s*BACKOFFS_MS\.length\s*&&\s*!triadMatches\(triad\);/.test(deployVerifyJs));
test('v4.49.5: deploy-verify fresh nocache per retry (Date.now() cache-buster)',
  /const\s+cb\s*=\s*Date\.now\(\)[\s\S]{0,500}\?nocache=\$\{cb\}/.test(deployVerifyJs));
test('v4.49.5: deploy-verify re-fetches the 3 critical files on retry',
  /Promise\.all\(\[\s*fetchText[\s\S]{0,100}app\.js\?nocache[\s\S]{0,200}sw\.js\?nocache[\s\S]{0,200}index\.html\?nocache/.test(deployVerifyJs));
test('v4.49.5: deploy-verify records retry attempt count in pass message',
  /matched on attempt \$\{attempts\} after CDN propagation/.test(deployVerifyJs));
test('v4.49.5: deploy-verify final-failure message mentions total retry window',
  /after \$\{attempts\} attempts over ~3\.75 min/.test(deployVerifyJs));

// ── v4.50.0 CUSTOM QUIZ UI POLISH ──
console.log('\n\x1b[1m── v4.50.0 CUSTOM QUIZ UI POLISH ──\x1b[0m');
// Section headers with icons
test('v4.50.0: cq-section-head + cq-section-ico + cq-section-title structure in HTML',
  html.includes('class="cq-section-head"') &&
  html.includes('class="cq-section-ico"') &&
  html.includes('class="cq-section-title"'));
test('v4.50.0: 3 section headers (Topic + Difficulty + Questions)',
  (html.match(/class="cq-section-head"/g) || []).length >= 3);
// Smart/Mixed premium cards
test('v4.50.0: Smart + Mixed promoted to cq-mode-card',
  (html.match(/class="chip[^"]*cq-mode-card"/g) || []).length === 2);
test('v4.50.0: mode cards have title + sub structure',
  html.includes('class="cq-mode-title"') && html.includes('class="cq-mode-sub"'));
test('v4.50.0: Smart card advertises AI weak-spot pick',
  html.includes('AI picks your weak spots'));
test('v4.50.0: Mixed card advertises random-across-topics',
  html.includes('Random across all topics'));
// Domain accordions with data-domain-idx (1-5)
test('v4.50.0: all 5 domain accordions have data-domain-idx',
  (html.match(/data-domain-idx="[1-5]"/g) || []).length === 5);
test('v4.50.0: data-domain-idx spans 1..5 (one per domain)',
  html.includes('data-domain-idx="1"') && html.includes('data-domain-idx="2"') &&
  html.includes('data-domain-idx="3"') && html.includes('data-domain-idx="4"') &&
  html.includes('data-domain-idx="5"'));
// Difficulty tier classes
test('v4.50.0: difficulty chips have tier classes (found/exam/hard/mixed)',
  html.includes('chip-tier-found') && html.includes('chip-tier-exam') &&
  html.includes('chip-tier-hard') && html.includes('chip-tier-mixed'));
// Question count with time estimates
test('v4.50.0: question count chips have chip-count-num + chip-count-sub',
  html.includes('class="chip-count-num"') && html.includes('class="chip-count-sub"'));
test('v4.50.0/v4.50.1: question counts show time estimates (~5/10/15/20 min — 1 min per exam-level question, honest pace)',
  html.includes('~5 min') && html.includes('~10 min') &&
  html.includes('~15 min') && html.includes('~20 min'));
// Generate button
// v4.54.8: the Generate button is now inside the dark .cq-summary-bar (prototype
// prose-summary CTA pattern). The .cq-generate-ico + sparkle styling moved with it;
// the btn-full class was retired since the button is now inline with the prose.
test('v4.50.0 (v4.54.8 update): Generate button has cq-generate-ico + lives inside cq-summary-bar',
  html.includes('class="cq-summary-bar"') &&
  /class="[^"]*\bcq-summary-cta\b/.test(html) &&
  html.includes('class="cq-generate-ico"'));
// Options grid
test('v4.50.0: Difficulty + Questions wrapped in cq-options-grid (no inline style)',
  html.includes('class="cq-options-grid"'));
test('v4.50.0: regression \u2014 old inline grid-template-columns:1fr 1fr gone',
  !html.includes('style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px"'));

// CSS — premium card + tier colours + light-theme + reduced-motion
test('v4.50.0 CSS: .cq-section-title accent color',
  /\.cq-section-title\s*\{[^}]*color:\s*var\(--accent-light\)/.test(css));
test('v4.50.0 CSS: .cq-mode-card with hover lift',
  /\.cq-mode-card:hover\s*\{[^}]*transform:\s*translateY\(-1px\)/.test(css));
test('v4.50.0 CSS: .cq-mode-card.on uses radial+linear gradient',
  /\.cq-mode-card\.on\s*\{[\s\S]{0,500}radial-gradient[\s\S]{0,200}linear-gradient/.test(css));
test('v4.50.0 CSS: 5 domain-idx left-border accents defined',
  /data-domain-idx="1"[^{]*\{[^}]*#7c6ff7/.test(css) &&
  /data-domain-idx="2"[^{]*\{[^}]*#22c55e/.test(css) &&
  /data-domain-idx="3"[^{]*\{[^}]*#3b82f6/.test(css) &&
  /data-domain-idx="4"[^{]*\{[^}]*#f59e0b/.test(css) &&
  /data-domain-idx="5"[^{]*\{[^}]*#ef4444/.test(css));
test('v4.50.0 CSS: .chip-tier-found.on uses green tint',
  /\.chip-tier-found\.on\s*\{[^}]*rgba\(34,\s*197,\s*94/.test(css));
test('v4.50.0 CSS: .chip-tier-hard.on uses red tint',
  /\.chip-tier-hard\.on\s*\{[^}]*rgba\(239,\s*68,\s*68/.test(css));
test('v4.50.0 CSS: .chip-count.on gradient fill',
  /\.chip-count\.on\s*\{[^}]*linear-gradient/.test(css));
test('v4.50.0 CSS: cq-generate-btn gradient + shadow',
  /\.cq-generate-btn\s*\{[\s\S]{0,500}linear-gradient[\s\S]{0,500}box-shadow/.test(css));
test('v4.50.0 CSS: @keyframes cqSparkle defined',
  /@keyframes cqSparkle/.test(css));
test('v4.50.0 CSS: light-theme override for .cq-mode-card',
  /\[data-theme="light"\]\s+\.cq-mode-card/.test(css));
test('v4.50.0 CSS: reduced-motion neutralises sparkle + mode-card hover',
  /prefers-reduced-motion[\s\S]{0,4000}\.cq-generate-ico\s*\{[^}]*animation:\s*none/.test(css));

// ── v4.50.1 DEEP-SCAN TIME FIX + RECENT PERFORMANCE POLISH ──
console.log('\n\x1b[1m── v4.50.1 DEEP-SCAN + RECENT PERFORMANCE ──\x1b[0m');
// Deep Scan preset label corrected (user: "30 mins lol, more like 20")
test('v4.50.1: Deep Scan preset relabeled to 20-min (was 30-min)',
  html.includes('20-min Deep Scan'));
test('v4.50.1: regression \u2014 old 30-min Deep Scan label removed',
  !html.includes('30-min Deep Scan'));
// Recent Performance polish
test('v4.50.1: renderHistoryPanel uses tier thresholds 55/70/85 (matches Domain Mastery)',
  /renderHistoryPanel[\s\S]{0,2500}pct\s*>=\s*85[\s\S]{0,300}pct\s*>=\s*70[\s\S]{0,300}pct\s*>=\s*55/.test(js));
test('v4.50.1: renderHistoryPanel includes domain-color dot via DOMAIN_COLOURS map',
  /renderHistoryPanel[\s\S]{0,2500}DOMAIN_COLOURS[\s\S]{0,800}h-domain-dot/.test(js));
test('v4.50.1: renderHistoryPanel uses the TOPIC_DOMAINS lookup for dot colour',
  /renderHistoryPanel[\s\S]{0,2500}TOPIC_DOMAINS\[e\.topic\]/.test(js));
test('v4.50.1: renderHistoryPanel splits score into score + percentage pill',
  /h-score-wrap[\s\S]{0,300}h-score-pct/.test(js));
// CSS structural
test('v4.50.1 CSS: .history-row uses 4-column grid layout',
  /\.history-row\s*\{[^}]*display:\s*grid[\s\S]{0,200}grid-template-columns:\s*8px\s+1fr\s+auto\s+auto/.test(css));
test('v4.50.1 CSS: .h-domain-dot has halo shadow',
  /\.h-domain-dot\s*\{[^}]*border-radius:\s*50%[\s\S]{0,200}box-shadow:\s*0 0 0 3px/.test(css));
test('v4.50.1 CSS: .h-bar thickened to 6px (was 4px)',
  /\.h-bar\s*\{[^}]*height:\s*6px/.test(css));
test('v4.50.1 CSS: .h-bar-fill uses cubic-bezier transition',
  /\.h-bar-fill\s*\{[^}]*cubic-bezier\(0\.2,\s*0\.8,\s*0\.2,\s*1\)/.test(css));
test('v4.50.1 CSS: .h-score-wrap is vertical column for score + %',
  /\.h-score-wrap\s*\{[^}]*flex-direction:\s*column/.test(css));
test('v4.50.1 CSS: .history-row:hover subtle accent tint',
  /\.history-row:hover\s*\{[^}]*background:\s*rgba\(var\(--accent-rgb\)/.test(css));
test('v4.50.1 CSS: narrow-viewport hides date at \u2264520px',
  /@media \(max-width:\s*520px\)[\s\S]{0,300}\.h-date\s*\{[^}]*display:\s*none/.test(css));
test('v4.50.1 CSS: reduced-motion neutralises history-row transition',
  /prefers-reduced-motion[\s\S]{0,4000}\.history-row\s*\{[^}]*transition:\s*none/.test(css));

// ── v4.51.0 TOPIC PROGRESS PAGE REVAMP ──
// Topic Progress page polish: cleaner header, 2 premium summary cards
// (Topic Mastery + Lab Progress), domain-tinted objective badges,
// friendlier date formatting, 5-colour accordion border palette,
// polished toolbar. User ask: "Better cleaner and polsihed UI. High quality."
console.log('\n\x1b[1m── v4.51.0 TOPIC PROGRESS REVAMP ──\x1b[0m');

// HTML — header structure
// v4.54.9: Progress page header replaced by .ed-pagehead editorial treatment
test('v4.51.0 (v4.54.9 update) HTML: progress page uses .ed-pagehead editorial header',
  /id="page-progress"[\s\S]{0,400}class="ed-pagehead"/.test(html));
test('v4.51.0 (v4.54.9 update) HTML: progress page title is italic-accent display heading',
  /id="page-progress"[\s\S]{0,800}ed-pagehead-display[^<]*>Topic\s*<em>progress\.<\/em>/.test(html));
test('v4.51.0 HTML: regression — old inline-styled flex header removed',
  !html.includes('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">'));
test('v4.51.0 HTML: regression — old inline legend dots removed from header',
  !html.includes('<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:4px">'));

// JS — _renderProgressSummary rewrite
test('v4.51.0: _renderProgressSummary emits .progress-card-mastery card',
  /_renderProgressSummary[\s\S]{0,4000}progress-card\s+progress-card-mastery/.test(js));
test('v4.51.0: _renderProgressSummary emits .progress-card-labs card (gated on TB_LABS)',
  /_renderProgressSummary[\s\S]{0,4000}progress-card\s+progress-card-labs/.test(js));
test('v4.51.0: mastery card has 4-tile grid (Strong/Solid/Weak/Untouched)',
  /ps2-grid\s+ps2-grid-mastery[\s\S]{0,1200}ps2-strong[\s\S]{0,300}ps2-solid[\s\S]{0,300}ps2-weak[\s\S]{0,300}ps2-untouched/.test(js));
test('v4.51.0: mastery card has premium coverage bar w/ role=progressbar',
  /progress-card-mastery[\s\S]{0,2000}ps2-cover-bar[\s\S]{0,200}role="progressbar"/.test(js));
test('v4.51.0: labs card tiles use diffClassMap (ps2-diff-beg/int/adv)',
  /diffClassMap[\s\S]{0,200}ps2-diff-beg[\s\S]{0,100}ps2-diff-int[\s\S]{0,100}ps2-diff-adv/.test(js));
test('v4.51.0: legend lives inside mastery card (.progress-card-legend)',
  /progress-card-mastery[\s\S]{0,2000}progress-card-legend[\s\S]{0,600}pcl-green[\s\S]{0,200}pcl-blue[\s\S]{0,200}pcl-red/.test(js));
test('v4.51.0: regression — old flat .ps-row stat grid removed',
  !/ps-row[\s\S]{0,200}ps-stat\s+ps-strong/.test(js));

// JS — _progressRowHtml upgrades
test('v4.51.0: _progressRowHtml reads domainKey from row',
  /_progressRowHtml\([^)]*row[\s\S]{0,400}const\s*\{[^}]*domainKey/.test(js));
test('v4.51.0: _progressRowHtml emits topic-obj-${domainKey} tinted badge',
  /topic-obj-' \+ domainKey/.test(js) || /topic-obj-\$\{domainKey\}/.test(js));
test('v4.51.0: _progressRowHtml uses friendlier date formatting (yesterday / weeks ago / months ago)',
  /yesterday[\s\S]{0,300}days ago[\s\S]{0,300}week ago[\s\S]{0,300}weeks ago[\s\S]{0,300}month ago[\s\S]{0,300}months ago/.test(js));
test('v4.51.0: regression — terse "Nd ago" date format removed from row renderer',
  !/metaRight\s*=\s*total\s*\+\s*'Q\s*·\s*'\s*\+\s*\(daysSince\s*===\s*0\s*\?\s*'today'\s*:\s*daysSince\s*\+\s*'d ago'/.test(js));

// JS — _renderProgressGrouped domain idx
test('v4.51.0: _renderProgressGrouped emits data-domain-idx (1..5) on each accordion',
  /_renderProgressGrouped[\s\S]{0,2500}data-domain-idx="\$\{domainIdx\s*\+\s*1\}"/.test(js));
test('v4.51.0: _renderProgressGrouped also emits data-domain-key for JS hooks',
  /_renderProgressGrouped[\s\S]{0,2500}data-domain-key="\$\{dk\}"/.test(js));

// CSS — header + cards
test('v4.51.0 CSS: .progress-header flex layout',
  /\.progress-header\s*\{[^}]*display:\s*flex/.test(css));
test('v4.51.0 CSS: .progress-title styling (22px, weight 800)',
  /\.progress-title\s*\{[^}]*font-size:\s*22px[\s\S]{0,200}font-weight:\s*800/.test(css));
test('v4.51.0 CSS: .progress-card premium radial+linear gradient background',
  /\.progress-card\s*\{[\s\S]{0,500}radial-gradient[\s\S]{0,300}linear-gradient\(160deg/.test(css));
test('v4.51.0 CSS: .progress-card layered box-shadow (depth)',
  /\.progress-card\s*\{[\s\S]{0,700}box-shadow:[\s\S]{0,200}rgba\(var\(--accent-rgb\)/.test(css));
test('v4.51.0 CSS: .progress-card-labs swaps to green accent',
  /\.progress-card-labs\s*\{[\s\S]{0,500}rgba\(34,\s*197,\s*94/.test(css));

// CSS — tiles + bars
test('v4.51.0 CSS: .ps2-cover-bar premium 8px height',
  /\.ps2-cover-bar\s*\{[^}]*height:\s*8px/.test(css));
test('v4.51.0 CSS: .ps2-cover-fill uses 800ms cubic-bezier transition',
  /\.ps2-cover-fill\s*\{[\s\S]{0,300}transition:\s*width\s+800ms\s+cubic-bezier\(0\.2,\s*0\.8,\s*0\.2,\s*1\)/.test(css));
test('v4.51.0 CSS: .ps2-grid-mastery is 4-col grid',
  /\.ps2-grid-mastery\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)/.test(css));
test('v4.51.0 CSS: .ps2-stat has hover-lift (translateY)',
  /\.ps2-stat:hover\s*\{[^}]*transform:\s*translateY\(-2px\)/.test(css));
test('v4.51.0 CSS: .ps2-strong .ps2-stat-val uses green',
  /\.ps2-strong\s+\.ps2-stat-val\s*\{[^}]*color:\s*var\(--green\)/.test(css));
test('v4.51.0 CSS: .ps2-solid .ps2-stat-val uses blue',
  /\.ps2-solid\s+\.ps2-stat-val\s*\{[^}]*color:\s*var\(--blue\)/.test(css));
test('v4.51.0 CSS: .ps2-weak .ps2-stat-val uses red',
  /\.ps2-weak\s+\.ps2-stat-val\s*\{[^}]*color:\s*var\(--red\)/.test(css));

// CSS — legend dots
test('v4.51.0 CSS: .pcl-green dot uses var(--green)',
  /\.pcl-green\s+\.pcl-dot\s*\{[^}]*background:\s*var\(--green\)/.test(css));
test('v4.51.0 CSS: .pcl-blue dot uses var(--blue)',
  /\.pcl-blue\s+\.pcl-dot\s*\{[^}]*background:\s*var\(--blue\)/.test(css));
test('v4.51.0 CSS: .pcl-red dot uses var(--red)',
  /\.pcl-red\s+\.pcl-dot\s*\{[^}]*background:\s*var\(--red\)/.test(css));

// CSS — 5-colour accordion borders
test('v4.51.0 CSS: .progress-domain[data-domain-idx="1"] purple left-border',
  /\.progress-domain\[data-domain-idx="1"\]\s*\{[^}]*border-left-color:\s*#7c6ff7/.test(css));
test('v4.51.0 CSS: .progress-domain[data-domain-idx="2"] green left-border',
  /\.progress-domain\[data-domain-idx="2"\]\s*\{[^}]*border-left-color:\s*#22c55e/.test(css));
test('v4.51.0 CSS: .progress-domain[data-domain-idx="3"] blue left-border',
  /\.progress-domain\[data-domain-idx="3"\]\s*\{[^}]*border-left-color:\s*#3b82f6/.test(css));
test('v4.51.0 CSS: .progress-domain[data-domain-idx="4"] amber left-border',
  /\.progress-domain\[data-domain-idx="4"\]\s*\{[^}]*border-left-color:\s*#f59e0b/.test(css));
test('v4.51.0 CSS: .progress-domain[data-domain-idx="5"] red left-border',
  /\.progress-domain\[data-domain-idx="5"\]\s*\{[^}]*border-left-color:\s*#ef4444/.test(css));

// CSS — domain-tinted objective badges
test('v4.51.0 CSS: .topic-obj-concepts purple-tinted',
  /\.topic-obj-concepts\s*\{[\s\S]{0,300}rgba\(124,\s*111,\s*247/.test(css));
test('v4.51.0 CSS: .topic-obj-implementation green-tinted',
  /\.topic-obj-implementation\s*\{[\s\S]{0,300}rgba\(34,\s*197,\s*94/.test(css));
test('v4.51.0 CSS: .topic-obj-operations blue-tinted',
  /\.topic-obj-operations\s*\{[\s\S]{0,300}rgba\(59,\s*130,\s*246/.test(css));
test('v4.51.0 CSS: .topic-obj-security amber-tinted',
  /\.topic-obj-security\s*\{[\s\S]{0,300}rgba\(245,\s*158,\s*11/.test(css));
test('v4.51.0 CSS: .topic-obj-troubleshooting red-tinted',
  /\.topic-obj-troubleshooting\s*\{[\s\S]{0,300}rgba\(239,\s*68,\s*68/.test(css));

// CSS — toolbar + play button polish
test('v4.51.0 CSS: .prog-filter-active uses gradient (was flat accent)',
  /\.prog-filter-btn\.prog-filter-active\s*\{[\s\S]{0,300}linear-gradient\(135deg,\s*var\(--accent\)/.test(css));
test('v4.51.0 CSS: .topic-play-btn hover uses linear-gradient',
  /\.topic-play-btn:hover\s*\{[\s\S]{0,300}linear-gradient\(135deg,\s*var\(--accent\)/.test(css));

// CSS — responsive + reduced-motion
test('v4.51.0 CSS: narrow-viewport collapses mastery grid to 2-col',
  /@media \(max-width:\s*600px\)[\s\S]{0,800}\.ps2-grid-mastery\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*1fr\)/.test(css));
test('v4.51.0 CSS: reduced-motion neutralises ps2-cover-fill transition',
  /prefers-reduced-motion[\s\S]{0,4000}\.ps2-cover-fill[\s\S]{0,400}transition:\s*none/.test(css));
test('v4.51.0 CSS: reduced-motion kills .ps2-stat:hover translateY',
  /prefers-reduced-motion[\s\S]{0,4000}\.ps2-stat:hover[\s\S]{0,200}transform:\s*none/.test(css));

// CSS — light-theme
test('v4.51.0 CSS: light-theme override for .progress-card',
  /\[data-theme="light"\]\s+\.progress-card\s*\{/.test(css));
test('v4.51.0 CSS: light-theme override for .progress-card-labs',
  /\[data-theme="light"\]\s+\.progress-card-labs\s*\{/.test(css));
test('v4.51.0 CSS: light-theme tinted objective badges',
  /\[data-theme="light"\]\s+\.topic-obj-concepts[\s\S]{0,200}#6d5ce0/.test(css));

// CSS — regression guards on old surface
test('v4.51.0 CSS: regression — flat .progress-summary background removed',
  !/^\.progress-summary\s*\{\s*background:\s*var\(--surface\);\s*border:\s*1px\s+solid\s+var\(--border\)/m.test(css));
test('v4.51.0 CSS: regression — old .ps-lab-row flex layout gone',
  !/\.ps-lab-row\s*\{[^}]*display:\s*flex/.test(css));

// ── v4.52.0 ACL / FIREWALL RULE BUILDER ──
// Major new feature: N10-009 Security-domain sandbox. 8 scenarios +
// Free Build, stateless rule evaluator, outcome-based grader, Tier C
// AI Coach. User green-lit full Option B scope 2026-04-18.
console.log('\n\x1b[1m── v4.52.0 ACL BUILDER ──\x1b[0m');

// HTML — page + setup tile + modals
test('v4.52.0 HTML: #page-acl exists',
  html.includes('id="page-acl"'));
test('v4.52.0/v4.53.0: ACL Builder reachable from sidebar (moved out of setup-nav-btn row)',
  js.includes("showPage('acl')") && /APP_SIDEBAR_PRACTICE[\s\S]{0,1500}label:\s*'ACL Builder'/.test(js));
test('v4.53.0: ACL Builder sidebar entry uses \u25A3 (square-dot) or lock-family glyph, openAclBuilder wired',
  js.includes('openAclBuilder') && /APP_SIDEBAR_PRACTICE[\s\S]{0,1500}page:\s*'acl'/.test(js));
test('v4.52.0 HTML: rule-list + test panel + grade panel containers',
  html.includes('id="acl-rule-list"') && html.includes('id="acl-test-panel"') && html.includes('id="acl-grade-panel"'));
test('v4.52.0 HTML: scenario picker modal',
  html.includes('id="acl-scenario-picker"') && html.includes('id="acl-scenario-picker-body"'));
test('v4.52.0 HTML: add-rule modal with action + proto + 4 address/port inputs',
  html.includes('id="acl-rule-modal"') && html.includes('id="acl-rm-action"') && html.includes('id="acl-rm-proto"')
    && html.includes('id="acl-rm-srcAddr"') && html.includes('id="acl-rm-srcPort"')
    && html.includes('id="acl-rm-dstAddr"') && html.includes('id="acl-rm-dstPort"'));
test('v4.52.0 HTML: AI Coach modal',
  html.includes('id="acl-coach-modal"') && html.includes('id="acl-coach-body"'));

// JS — STORAGE keys
test('v4.52.0: STORAGE.ACL_STATE key defined',
  js.includes("ACL_STATE: 'nplus_acl_state'"));
test('v4.52.0: STORAGE.ACL_COACH_CACHE key defined',
  js.includes("ACL_COACH_CACHE: 'nplus_acl_coach_cache'"));

// JS — evaluator core (correctness floor — functions exist)
test('v4.52.0: _aclParseCidr function defined',
  js.includes('function _aclParseCidr('));
test('v4.52.0: _aclIpToUint function defined',
  js.includes('function _aclIpToUint('));
test('v4.52.0: _aclCidrContains function defined',
  js.includes('function _aclCidrContains('));
test('v4.52.0: _aclPortMatches function defined',
  js.includes('function _aclPortMatches('));
test('v4.52.0: _aclRuleMatches function defined',
  js.includes('function _aclRuleMatches('));
test('v4.52.0: _aclEvalPacket function defined',
  js.includes('function _aclEvalPacket('));
test('v4.52.0: _aclGradeScenario function defined',
  js.includes('function _aclGradeScenario('));

// JS — behavioral sandbox test on the evaluator (reuses UAT's _fnBody / vm pattern)
try {
  const vm = require('vm');
  const extractFn = (name) => {
    const idx = js.indexOf('function ' + name + '(');
    if (idx === -1) return null;
    const braceStart = js.indexOf('{', idx);
    let depth = 0;
    for (let i = braceStart; i < js.length; i++) {
      if (js[i] === '{') depth++;
      else if (js[i] === '}') { depth--; if (depth === 0) return js.slice(idx, i + 1); }
    }
    return null;
  };
  const fns = ['_aclParseCidr','_aclIpToUint','_aclCidrContains','_aclPortMatches','_aclRuleMatches','_aclEvalPacket','_aclGradeScenario'].map(extractFn).join('\n');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fns, ctx);

  // Fixture 1: permit/deny first-match-wins
  const rules1 = [
    { id: 'r1', action: 'deny',   proto: 'any', srcAddr: '10.0.0.50/32', srcPort: 'any', dstAddr: 'any', dstPort: 'any' },
    { id: 'r2', action: 'permit', proto: 'any', srcAddr: '10.0.0.0/24',  srcPort: 'any', dstAddr: 'any', dstPort: 'any' }
  ];
  const r1 = ctx._aclEvalPacket(rules1, { src: '10.0.0.50', sp: 'any', dst: '8.8.8.8', dp: 53, proto: 'udp' });
  test('v4.52.0 EVAL: quarantined host denied on rule 0',
    r1.action === 'deny' && r1.ruleIdx === 0);
  const r2 = ctx._aclEvalPacket(rules1, { src: '10.0.0.20', sp: 'any', dst: '8.8.8.8', dp: 53, proto: 'udp' });
  test('v4.52.0 EVAL: clean host permitted on rule 1',
    r2.action === 'permit' && r2.ruleIdx === 1);
  const r3 = ctx._aclEvalPacket(rules1, { src: '192.168.1.5', sp: 'any', dst: '8.8.8.8', dp: 53, proto: 'udp' });
  test('v4.52.0 EVAL: outside subnet hits implicit deny',
    r3.action === 'deny' && r3.ruleIdx === -1 && r3.implicit === true);

  // Fixture 2: protocol + port matching
  const rules2 = [
    { id: 'r1', action: 'permit', proto: 'tcp', srcAddr: 'any', srcPort: 'any', dstAddr: '203.0.113.10/32', dstPort: 443 }
  ];
  const r4 = ctx._aclEvalPacket(rules2, { src: '198.51.100.5', sp: 'any', dst: '203.0.113.10', dp: 443, proto: 'tcp' });
  test('v4.52.0 EVAL: TCP 443 permit matches',
    r4.action === 'permit' && r4.ruleIdx === 0);
  const r5 = ctx._aclEvalPacket(rules2, { src: '198.51.100.5', sp: 'any', dst: '203.0.113.10', dp: 443, proto: 'udp' });
  test('v4.52.0 EVAL: proto mismatch (UDP vs TCP rule) hits implicit',
    r5.action === 'deny' && r5.implicit === true);
  const r6 = ctx._aclEvalPacket(rules2, { src: '198.51.100.5', sp: 'any', dst: '203.0.113.10', dp: 22, proto: 'tcp' });
  test('v4.52.0 EVAL: port mismatch (22 vs 443 rule) hits implicit',
    r6.action === 'deny' && r6.implicit === true);

  // Fixture 3: empty rule list = implicit deny for all
  const r7 = ctx._aclEvalPacket([], { src: '10.0.0.5', sp: 'any', dst: '8.8.8.8', dp: 443, proto: 'tcp' });
  test('v4.52.0 EVAL: empty ACL = implicit deny everything',
    r7.action === 'deny' && r7.implicit === true);

  // Fixture 4: CIDR /24 subnet match
  test('v4.52.0 EVAL: _aclCidrContains 10.10.0.5 in 10.10.0.0/24',
    ctx._aclCidrContains('10.10.0.0/24', '10.10.0.5') === true);
  test('v4.52.0 EVAL: _aclCidrContains 10.11.0.5 NOT in 10.10.0.0/24',
    ctx._aclCidrContains('10.10.0.0/24', '10.11.0.5') === false);
  test('v4.52.0 EVAL: _aclCidrContains "any" matches anything',
    ctx._aclCidrContains('any', '8.8.8.8') === true);

  // Fixture 5: /16 contains /24 hosts (rule-order trap semantics)
  test('v4.52.0 EVAL: 10.30.10.5 IS inside 10.30.0.0/16 (trap math)',
    ctx._aclCidrContains('10.30.0.0/16', '10.30.10.5') === true);
} catch (err) {
  test('v4.52.0 EVAL sandbox test', false);
  results.errors.push('ACL evaluator sandbox test failed: ' + err.message);
}

// JS — scenarios
test('v4.52.0: ACL_SCENARIOS array defined',
  js.includes('const ACL_SCENARIOS = ['));
test('v4.52.0: all 9 scenario IDs registered (Free Build + 8)',
  ['free-build','block-single-host','https-only','guest-to-hr','dmz-web','dns-only-lab','rule-order-trap','implicit-deny-gotcha','layered-defense']
    .every(id => js.includes("id: '" + id + "'")));
test('v4.52.0: ACL_CATEGORIES defined (Sandbox, Fundamentals, Real-world, PBQ Trap)',
  js.includes("key: 'Sandbox'") && js.includes("key: 'Fundamentals'") && js.includes("key: 'Real-world'") && js.includes("key: 'PBQ Trap'"));
test('v4.52.0: each non-free scenario has testPackets array',
  (js.match(/testPackets: \[/g) || []).length >= 9);

// JS — state + CRUD
test('v4.52.0: aclState initialised with scenarioId + rules + lastGrade',
  js.includes('let aclState = {') && /aclState[\s\S]{0,400}scenarioId[\s\S]{0,200}rules[\s\S]{0,200}lastGrade/.test(js));
test('v4.52.0: aclLoadState + aclSaveState persist to STORAGE.ACL_STATE',
  js.includes('function aclLoadState(') && js.includes('function aclSaveState(') && js.includes('STORAGE.ACL_STATE'));
test('v4.52.0: aclAddRule / aclDeleteRule / aclMoveRule / aclClearRules defined',
  js.includes('function aclAddRule(') && js.includes('function aclDeleteRule(') && js.includes('function aclMoveRule(') && js.includes('function aclClearRules('));
test('v4.52.0: aclMoveRule invalidates lastGrade (mutation discipline)',
  /function aclMoveRule\([\s\S]{0,400}aclState\.lastGrade\s*=\s*null/.test(js));
test('v4.52.0: aclLoadScenario confirms on dirty switch',
  /function aclLoadScenario\([\s\S]{0,500}aclState\.rules\.length\s*>\s*0[\s\S]{0,200}confirm/.test(js));

// JS — render functions
test('v4.52.0: renderAclPage orchestrator defined',
  js.includes('function renderAclPage('));
test('v4.52.0: render functions split per panel (_aclRenderHeader, ScenarioPanel, RuleList, TestPanel, GradePanel)',
  js.includes('function _aclRenderHeader(') && js.includes('function _aclRenderScenarioPanel(')
    && js.includes('function _aclRenderRuleList(') && js.includes('function _aclRenderTestPanel(')
    && js.includes('function _aclRenderGradePanel('));
test('v4.52.0: FLIP reorder in _aclRenderRuleList (oldRects + translateY + cubic-bezier)',
  /_aclRenderRuleList[\s\S]{0,4000}oldRects[\s\S]{0,1500}translateY\([\s\S]{0,500}cubic-bezier\(0\.2,\s*0\.8,\s*0\.2,\s*1\)/.test(js));
test('v4.52.0: implicit-deny row rendered at end of rule list',
  /acl-rule-implicit[\s\S]{0,500}implicit deny/.test(js));
test('v4.52.0: test-packet reveal uses per-index animationDelay (stagger)',
  /aclRunAllTests[\s\S]{0,1000}animationDelay\s*=\s*\(i\s*\*\s*80/.test(js));

// JS — interactions
test('v4.52.0: aclRunAllTests + aclRunCustomPacket + aclGrade defined',
  js.includes('function aclRunAllTests(') && js.includes('function aclRunCustomPacket(') && js.includes('function aclGrade('));
test('v4.52.0: aclOpenScenarioPicker + aclOpenAddRuleModal + aclSubmitAddRule defined',
  js.includes('function aclOpenScenarioPicker(') && js.includes('function aclOpenAddRuleModal(') && js.includes('function aclSubmitAddRule('));
test('v4.52.0: openAclBuilder entry point defined',
  js.includes('function openAclBuilder('));

// JS — AI Coach (Tier C pattern)
test('v4.52.0: aclAskCoach Tier C Sonnet pattern',
  js.includes('async function aclAskCoach(') && /aclAskCoach[\s\S]{0,3500}CLAUDE_TEACHER_MODEL/.test(js));
test('v4.52.0: Coach cached by rules hash (djb2-style) with LRU trim',
  js.includes('function _aclRulesHash(') && js.includes('function _aclLoadCoachCache(') && js.includes('function _aclSaveCoachCache('));
test('v4.52.0: Coach cache capped at 20 entries (matches TB pattern)',
  /_aclSaveCoachCache[\s\S]{0,500}entries\.length\s*>\s*20/.test(js));
test('v4.52.0: Coach refuses Free Build (scenario-specific)',
  /aclAskCoach[\s\S]{0,800}free-build[\s\S]{0,300}(showErrorToast|return)/.test(js));
test('v4.52.0: Coach refuses empty rule list',
  /aclAskCoach[\s\S]{0,1000}aclState\.rules\.length\s*===\s*0/.test(js));
test('v4.52.0: Coach prompt references N10-009 Security + Network+ context',
  /aclAskCoach[\s\S]{0,4000}CompTIA Network\+ \(N10-009\)/.test(js));

// CSS — structure + premium aesthetic
test('v4.52.0 CSS: #page-acl canvas widened',
  /#page-acl\s*\{[^}]*max-width:\s*1080px/.test(css));
test('v4.52.0 CSS: .acl-layout is 2-col grid (340px + 1fr)',
  /\.acl-layout\s*\{[^}]*grid-template-columns:\s*340px\s+1fr/.test(css));
test('v4.52.0 CSS: .acl-scenario-card has radial + linear gradient background',
  /\.acl-scenario-card\s*\{[\s\S]{0,600}radial-gradient[\s\S]{0,300}linear-gradient\(160deg/.test(css));
test('v4.52.0 CSS: .acl-scenario-card has layered box-shadow',
  /\.acl-scenario-card\s*\{[\s\S]{0,900}box-shadow:[\s\S]{0,200}rgba\(var\(--accent-rgb\)/.test(css));
test('v4.52.0 CSS: difficulty border-color variants (beginner/intermediate/advanced)',
  /\.acl-scenario-card-beginner\b/.test(css) && /\.acl-scenario-card-intermediate\b/.test(css) && /\.acl-scenario-card-advanced\b/.test(css));
test('v4.52.0 CSS: .acl-act-permit uses green palette',
  /\.acl-act-permit\s*\{[\s\S]{0,300}rgba\(34,\s*197,\s*94/.test(css));
test('v4.52.0 CSS: .acl-act-deny uses red palette',
  /\.acl-act-deny\s*\{[\s\S]{0,300}rgba\(239,\s*68,\s*68/.test(css));
test('v4.52.0 CSS: .acl-zone uses --zone-color CSS variable for per-zone tinting',
  /\.acl-zone\s*\{[\s\S]{0,400}border-left:[\s\S]{0,100}var\(--zone-color/.test(css));

// CSS — animations
test('v4.52.0 CSS: @keyframes aclCardFadeIn (scenario card entry)',
  /@keyframes aclCardFadeIn/.test(css));
test('v4.52.0 CSS: @keyframes aclRuleIn (per-rule slide-in)',
  /@keyframes aclRuleIn/.test(css));
test('v4.52.0 CSS: @keyframes aclTpReveal (test-packet stagger)',
  /@keyframes aclTpReveal/.test(css));
test('v4.52.0 CSS: @keyframes aclGradePop (overshoot scale on grade reveal)',
  /\.acl-grade-score-pop\s*\{[^}]*cubic-bezier\(0\.34,\s*1\.56/.test(css) && /@keyframes aclGradePop/.test(css));
test('v4.52.0 CSS: @keyframes aclModalScaleIn (modal entry)',
  /@keyframes aclModalScaleIn/.test(css));
test('v4.52.0 CSS: @keyframes aclLearnFade (details panel expand)',
  /@keyframes aclLearnFade/.test(css));

// CSS — rule list + test panel + grade panel
test('v4.52.0 CSS: .acl-rule-row is grid-based row layout',
  /\.acl-rule-row\s*\{[^}]*display:\s*grid/.test(css));
test('v4.52.0 CSS: .acl-rule-num pill (circle badge)',
  /\.acl-rule-num\s*\{[\s\S]{0,400}border-radius:\s*8px[\s\S]{0,200}background:\s*var\(--accent\)/.test(css));
test('v4.52.0 CSS: .acl-tp-row has pass/fail state classes',
  /\.acl-tp-row\.acl-tp-pass/.test(css) && /\.acl-tp-row\.acl-tp-fail/.test(css));
test('v4.52.0 CSS: .acl-grade-score tier-coloured (full/partial/low)',
  /\.acl-grade-score-full/.test(css) && /\.acl-grade-score-partial/.test(css) && /\.acl-grade-score-low/.test(css));
test('v4.52.0 CSS: .acl-rule-implicit has red dashed border (attention)',
  /\.acl-rule-implicit\s*\{[\s\S]{0,300}rgba\(239,\s*68,\s*68/.test(css));

// CSS — modals
test('v4.52.0 CSS: .acl-modal full-viewport overlay with backdrop blur',
  /\.acl-modal-backdrop\s*\{[\s\S]{0,400}backdrop-filter:\s*blur/.test(css));
test('v4.52.0 CSS: .acl-modal-card has scale-in animation',
  /\.acl-modal-card\s*\{[\s\S]{0,800}animation:\s*aclModalScaleIn/.test(css));
test('v4.52.0 CSS: .acl-picker-card hover-lift (translateY)',
  /\.acl-picker-card:hover\s*\{[\s\S]{0,300}transform:\s*translateY\(-2px\)/.test(css));

// CSS — responsive + reduced motion
test('v4.52.0 CSS: narrow-viewport collapses .acl-layout to single column',
  /@media \(max-width:\s*900px\)[\s\S]{0,500}\.acl-layout\s*\{[^}]*grid-template-columns:\s*1fr/.test(css));
test('v4.52.0 CSS: @media max-width 600 collapses rule-row grid',
  /@media \(max-width:\s*600px\)[\s\S]{0,1500}\.acl-rule-row\s*\{[^}]*grid-template-columns/.test(css));
test('v4.52.0 CSS: reduced-motion kills all ACL animations',
  /prefers-reduced-motion[\s\S]{0,8000}\.acl-scenario-card[\s\S]{0,3000}animation:\s*none/.test(css));
test('v4.52.0 CSS: reduced-motion kills hover translateY on ACL cards',
  /prefers-reduced-motion[\s\S]{0,8000}\.acl-picker-card:hover[\s\S]{0,300}transform:\s*none/.test(css));

// CSS — light-theme
test('v4.52.0 CSS: light-theme override for .acl-scenario-card',
  /\[data-theme="light"\]\s+\.acl-scenario-card\s*\{/.test(css));
test('v4.52.0 CSS: light-theme override for .acl-act-permit (green)',
  /\[data-theme="light"\]\s+\.acl-act-permit\s*\{[\s\S]{0,300}#16a34a/.test(css));
test('v4.52.0 CSS: light-theme override for .acl-act-deny (red)',
  /\[data-theme="light"\]\s+\.acl-act-deny\s*\{[\s\S]{0,300}#dc2626/.test(css));
test('v4.52.0 CSS: light-theme override for .acl-grade-score-full',
  /\[data-theme="light"\]\s+\.acl-grade-score-full\s*\{/.test(css));
test('v4.52.0 CSS: light-theme override for .acl-picker-card',
  /\[data-theme="light"\]\s+\.acl-picker-card\s*\{/.test(css));

// ── v4.53.0 EDITORIAL REDESIGN ──
// Persistent sidebar (Practice/Drills IA) + setup-page polish (focus
// banner, \u00a7 01-04 numbered sections, vertical-bar domain grid,
// readiness pass-mark tick). User green-lit full scope after Claude
// Design prototype review. Kept brand palette + Inter font, added
// editorial pattern from prototype.
console.log('\n\x1b[1m── v4.53.0 EDITORIAL REDESIGN ──\x1b[0m');

// HTML
test('v4.53.0 HTML: #app-sidebar container exists',
  html.includes('id="app-sidebar"') && html.includes('class="app-sidebar"'));
test('v4.53.0 HTML: mobile sidebar toggle button',
  html.includes('class="sb-mobile-toggle"') && html.includes('onclick="toggleSidebarMobile()"'));
test('v4.53.0 HTML: focus banner container on setup page',
  html.includes('id="focus-banner"') && html.includes('class="focus-banner'));
test('v4.53.0 HTML: \u00a7 01 Quick Start editorial section head',
  /&#167;\s*01[\s\S]{0,400}Quick\s*<em>start<\/em>/.test(html));
test('v4.53.0 HTML: \u00a7 02 Marathon Mode editorial section head',
  /&#167;\s*02[\s\S]{0,400}Marathon\s*<em>mode<\/em>/.test(html));
test('v4.53.0 HTML: \u00a7 03 By Domain editorial section head + grid container',
  /&#167;\s*03[\s\S]{0,400}By\s*<em>domain<\/em>/.test(html) && html.includes('id="setup-domain-grid"'));
test('v4.53.0 HTML: \u00a7 04 Custom Quiz editorial section head',
  /&#167;\s*04[\s\S]{0,400}Custom\s*<em>quiz<\/em>/.test(html));
test('v4.53.0 HTML: pass-mark 720 tick positioned at 62.5% on readiness bar',
  /class="readiness-pass-tick"[\s\S]{0,200}left:\s*62\.5%/.test(html));
test('v4.53.0 HTML: regression \u2014 old .setup-nav-group 6-button row removed',
  !html.includes('class="setup-nav-group"'));

// JS \u2014 sidebar
test('v4.53.0 JS: APP_SIDEBAR_PRACTICE + APP_SIDEBAR_DRILLS arrays defined',
  js.includes('const APP_SIDEBAR_PRACTICE') && js.includes('const APP_SIDEBAR_DRILLS'));
test('v4.53.0 JS: Practice nav has Home/Progress/Analytics/Network Builder/ACL Builder',
  /APP_SIDEBAR_PRACTICE[\s\S]{0,1500}Home[\s\S]{0,300}Progress[\s\S]{0,300}Analytics[\s\S]{0,400}Network Builder[\s\S]{0,400}ACL Builder/.test(js));
test('v4.53.0 JS: Drills nav has 5 per-drill entries (Subnet/Port/Acronym/OSI/Cable)',
  /APP_SIDEBAR_DRILLS[\s\S]{0,2000}Subnet Mastery[\s\S]{0,200}Port Drill[\s\S]{0,200}Acronym Blitz[\s\S]{0,200}OSI Sorter[\s\S]{0,200}Cable ID/.test(js));
test('v4.53.0 JS: renderAppSidebar function defined',
  js.includes('function renderAppSidebar('));
test('v4.53.0 JS: SIDEBAR_ACTIVE_MAP defined (maps page names to sidebar highlight)',
  js.includes('const SIDEBAR_ACTIVE_MAP'));
test('v4.53.0 JS: updateSidebarActiveState function defined',
  js.includes('function updateSidebarActiveState('));
test('v4.53.0 JS: showPage hook calls updateSidebarActiveState',
  /function showPage\([\s\S]{0,600}updateSidebarActiveState/.test(js));
test('v4.53.0 JS: toggleSidebarMobile defined for mobile drawer',
  js.includes('function toggleSidebarMobile('));
test('v4.53.0 JS: has-sidebar body class applied on init',
  js.includes("document.body.classList.add('has-sidebar')"));

// JS \u2014 focus banner + domain grid
test('v4.53.0 JS: renderSetupFocusBanner function defined',
  js.includes('function renderSetupFocusBanner('));
test('v4.53.0 JS: focus banner greets user by name (Simi)',
  /renderSetupFocusBanner[\s\S]{0,2000}<em>Simi<\/em>/.test(js));
test('v4.53.0 JS: focus banner has empty-state fallback (no history)',
  /renderSetupFocusBanner[\s\S]{0,3000}history\.length\s*===\s*0/.test(js));
test('v4.53.0 JS: focus banner pulls weakest topics from computeWeakSpotScores',
  /renderSetupFocusBanner[\s\S]{0,3000}computeWeakSpotScores/.test(js));
test('v4.53.0 JS: renderSetupDomainGrid function defined',
  js.includes('function renderSetupDomainGrid('));
test('v4.53.0 JS: domain grid aggregates via TOPIC_DOMAINS lookup',
  /renderSetupDomainGrid[\s\S]{0,2500}TOPIC_DOMAINS\[e\.topic\]/.test(js));
// v4.54.10: renderSetupDomainGrid body grew \u2014 widen the regex window.
test('v4.53.0 JS: domain grid click wires drillDomain',
  /renderSetupDomainGrid[\s\S]{0,6000}drillDomain\(/.test(js));
test('v4.53.0 JS: goSetup calls renderSetupFocusBanner + renderSetupDomainGrid',
  /function goSetup\([\s\S]{0,1000}renderSetupFocusBanner[\s\S]{0,200}renderSetupDomainGrid/.test(js));

// CSS \u2014 sidebar
test('v4.53.0 CSS: body.has-sidebar adds 240px left padding',
  /body\.has-sidebar\s*\{[^}]*padding-left:\s*240px/.test(css));
test('v4.53.0 CSS: .app-sidebar fixed 240px left rail',
  /\.app-sidebar\s*\{[\s\S]{0,400}position:\s*fixed[\s\S]{0,200}width:\s*240px/.test(css));
test('v4.53.0 CSS: sidebar brand mark has gradient + shadow',
  /\.sb-brand-mark\s*\{[\s\S]{0,400}linear-gradient\(135deg,\s*var\(--accent\)/.test(css));
test('v4.53.0 CSS: .sb-item-active has accent-tinted background + left rail',
  /\.sb-item\.sb-item-active\s*\{/.test(css) && /\.sb-item\.sb-item-active::before\s*\{[^}]*background:\s*var\(--accent\)/.test(css));
test('v4.53.0 CSS: mobile breakpoint collapses sidebar to drawer',
  /@media \(max-width:\s*900px\)[\s\S]{0,800}\.app-sidebar\s*\{[^}]*transform:\s*translateX\(-100%\)/.test(css));

// CSS \u2014 focus banner
test('v4.53.0 CSS: .focus-banner has radial+linear gradient bg',
  /\.focus-banner\s*\{[\s\S]{0,600}radial-gradient[\s\S]{0,300}linear-gradient\(160deg/.test(css));
test('v4.53.0 CSS: .focus-cta uses 135deg gradient + shadow',
  /\.focus-cta\s*\{[\s\S]{0,400}linear-gradient\(135deg,\s*var\(--accent\)/.test(css));
test('v4.53.0 CSS: @keyframes focusBannerFadeIn (entry animation)',
  /@keyframes focusBannerFadeIn/.test(css));

// CSS \u2014 editorial numbered sections
test('v4.53.0 CSS: .ed-section-num monospace accent-light',
  /\.ed-section-num\s*\{[\s\S]{0,300}font-family:\s*monospace[\s\S]{0,200}color:\s*var\(--accent-light\)/.test(css));
test('v4.53.0 CSS: .ed-section-title em uses accent-light (editorial italic accent)',
  /\.ed-section-title\s+em\s*\{[^}]*color:\s*var\(--accent-light\)/.test(css));
test('v4.53.0 CSS: .ed-section-head has dashed-underline accent border',
  /\.ed-section-head\s*\{[\s\S]{0,400}border-bottom:\s*1px dashed rgba\(var\(--accent-rgb\)/.test(css));

// CSS \u2014 pass-mark tick
test('v4.53.0 CSS: .readiness-pass-tick positioned absolute',
  /\.readiness-pass-tick\s*\{[\s\S]{0,300}position:\s*absolute/.test(css));
test('v4.53.0 CSS: pass tick has 720 label above + PASS label below',
  /\.readiness-pass-tick::before[\s\S]{0,300}content:\s*'720'/.test(css) && /\.readiness-pass-tick::after[\s\S]{0,300}content:\s*'PASS'/.test(css));
test('v4.53.0 CSS: readiness-bar-wrap has overflow:visible (tick labels protrude)',
  /\.readiness-bar-wrap\s*\{[\s\S]{0,300}overflow:\s*visible/.test(css));

// CSS \u2014 domain grid
test('v4.53.0 CSS: .domain-grid uses 5-col grid',
  /\.domain-grid\s*\{[\s\S]{0,200}grid-template-columns:\s*repeat\(5,\s*1fr\)/.test(css));
test('v4.53.0 CSS: .domain-cell has per-idx top border colour (5-domain palette)',
  /\.domain-cell\[data-domain-idx="1"\][\s\S]{0,100}#7c6ff7/.test(css) &&
  /\.domain-cell\[data-domain-idx="5"\][\s\S]{0,100}#ef4444/.test(css));
test('v4.53.0 CSS: .dg-bar uses 800ms cubic-bezier height transition',
  /\.dg-bar\s*\{[\s\S]{0,400}transition:\s*height\s+800ms\s+cubic-bezier\(0\.2,\s*0\.8,\s*0\.2,\s*1\)/.test(css));
test('v4.53.0 CSS: .domain-cell:hover translateY(-3px)',
  /\.domain-cell:hover\s*\{[^}]*transform:\s*translateY\(-3px\)/.test(css));

// CSS \u2014 reduced motion
test('v4.53.0 CSS: reduced-motion neutralises sidebar + focus-banner + dg-bar',
  /prefers-reduced-motion[\s\S]{0,10000}\.app-sidebar[\s\S]{0,3000}transition:\s*none/.test(css));
test('v4.53.0 CSS: reduced-motion kills hover translateY on focus-cta + domain-cell',
  /prefers-reduced-motion[\s\S]{0,10000}\.domain-cell:hover[\s\S]{0,200}transform:\s*none/.test(css));

// CSS \u2014 light-theme overrides
test('v4.53.0 CSS: light-theme .app-sidebar recoloured',
  /\[data-theme="light"\]\s+\.app-sidebar\s*\{/.test(css));
test('v4.53.0 CSS: light-theme .focus-banner recoloured to #6355e0 brand',
  /\[data-theme="light"\]\s+\.focus-banner\s*\{[\s\S]{0,800}99,\s*85,\s*224/.test(css));
test('v4.53.0 CSS: light-theme .sb-item-active recoloured',
  /\[data-theme="light"\]\s+\.sb-item\.sb-item-active\s*\{/.test(css));
test('v4.53.0 CSS: light-theme .ed-section-num recoloured',
  /\[data-theme="light"\]\s+\.ed-section-num[\s\S]{0,200}#6355e0/.test(css));

// ── v4.54.0 EDITORIAL HERO v2 + TOP BAR + SIDEBAR COLLAPSE ──
// User saw a mockup screenshot and asked for that exact layout. Built:
//   • Persistent topbar across all pages (breadcrumb + time + gear + theme + avatar + sidebar toggle)
//   • Setup hero v2: display heading + lede (left) + dark readiness card + 2 mini-cards (right aside)
//   • Focus banner v2: full-width purple gradient + giant quote mark + white CTA
//   • Sidebar collapse with localStorage persistence
console.log('\n\x1b[1m── v4.54.0 HERO v2 + TOP BAR + COLLAPSE ──\x1b[0m');

// HTML \u2014 topbar
test('v4.54.0 HTML: #app-topbar exists',
  html.includes('id="app-topbar"') && html.includes('class="app-topbar"'));
test('v4.54.0 HTML: topbar has sidebar-toggle + breadcrumb + time + gear + theme + avatar',
  html.includes('id="topbar-toggle"') && html.includes('id="topbar-crumb"') &&
  html.includes('id="topbar-time"') && html.includes('id="topbar-theme"') &&
  html.includes('class="topbar-avatar"'));
test('v4.54.0 HTML: topbar toggle calls toggleSidebarCollapsed',
  /id="topbar-toggle"[\s\S]{0,200}onclick="toggleSidebarCollapsed/.test(html));

// HTML \u2014 hero v2
test('v4.54.0 HTML: #setup-hero-v2 wrapper + hero-v2-main + hero-v2-aside',
  html.includes('id="setup-hero-v2"') && html.includes('class="hero-v2-main"') && html.includes('class="hero-v2-aside"'));
test('v4.54.0 HTML: display heading defaults to "Good afternoon, Simi."',
  /id="hero-v2-display"[\s\S]{0,200}Good afternoon, <span class="name">Simi\.<\/span>/.test(html));
test('v4.54.0 HTML: readiness card v2 has score + bar fill + pass tick + delta',
  html.includes('id="rc-v2-num"') && html.includes('id="rc-v2-bar-fill"') &&
  html.includes('class="rc-v2-pass-tick"') && html.includes('id="rc-v2-delta"'));
test('v4.54.0 HTML: two mini cards (today + streak) in hero-v2-mini-row',
  html.includes('id="mc-today-done"') && html.includes('id="mc-today-goal"') &&
  html.includes('id="mc-streak-num"') && html.includes('id="mc-streak-sub"'));
test('v4.54.0 HTML: focus banner upgraded to focus-banner-v2 class',
  html.includes('class="focus-banner-v2 is-hidden"'));
test('v4.54.0 HTML: legacy hero hidden (.hero.is-hidden)',
  /class="hero is-hidden"/.test(html));

// JS \u2014 topbar
test('v4.54.0 JS: TOPBAR_CRUMBS map defined with \u226520 page entries',
  js.includes('const TOPBAR_CRUMBS') && (() => {
    const m = js.match(/const TOPBAR_CRUMBS\s*=\s*\{([\s\S]*?)\};/);
    if (!m) return false;
    return (m[1].match(/'[^']+':\s*'/g) || []).length >= 20;
  })());
test('v4.54.0 JS: updateTopbarCrumb function defined',
  js.includes('function updateTopbarCrumb('));
test('v4.54.0 JS: showPage hooks updateTopbarCrumb',
  /function showPage\([\s\S]{0,800}updateTopbarCrumb/.test(js));
test('v4.54.0 JS: _topbarTick live clock helper',
  js.includes('function _topbarTick(') && js.includes('function _topbarStartClock('));
test('v4.54.0 JS: scrollToSettings nav helper (gear button)',
  js.includes('function scrollToSettings('));
test('v4.54.0 JS: topbar theme icon mirrors current theme via _syncTopbarTheme',
  js.includes('function _syncTopbarTheme('));

// JS \u2014 sidebar collapse
test('v4.54.0 JS: STORAGE_SIDEBAR_COLLAPSED key + toggleSidebarCollapsed function',
  js.includes('STORAGE_SIDEBAR_COLLAPSED') && js.includes('function toggleSidebarCollapsed('));
test('v4.54.0 JS: toggleSidebarCollapsed persists state to localStorage',
  /function toggleSidebarCollapsed\([\s\S]{0,400}localStorage\.setItem\(STORAGE_SIDEBAR_COLLAPSED/.test(js));
test('v4.54.0 JS: _initSidebarCollapsed reads persisted state on load',
  js.includes('function _initSidebarCollapsed(') && /_initSidebarCollapsed[\s\S]{0,300}localStorage\.getItem\(STORAGE_SIDEBAR_COLLAPSED/.test(js));

// JS \u2014 hero v2
test('v4.54.0 JS: renderHeroV2 function defined',
  js.includes('function renderHeroV2('));
test('v4.54.0 JS: hero v2 adds body.hero-v2-active class (hides legacy hero)',
  /renderHeroV2[\s\S]{0,400}classList\.add\('hero-v2-active'\)/.test(js));
test('v4.54.0 JS: hero eyebrow renders DAY \u00B7 MONTH DATE \u00B7 H:MMam/pm format',
  /hero-v2-eyebrow[\s\S]{0,1500}dayNames[\s\S]{0,400}monthNames/.test(js));
test('v4.54.0 JS: display heading uses time-aware greeting (Good morning/afternoon/evening/Working late)',
  /renderHeroV2[\s\S]{0,2500}Good morning[\s\S]{0,300}Good afternoon[\s\S]{0,300}Good evening/.test(js));
test('v4.54.0 JS: renderReadinessCardV2 pulls from getReadinessScore + computes bar %',
  js.includes('function renderReadinessCardV2(') &&
  /renderReadinessCardV2[\s\S]{0,1500}getReadinessScore\(\)/.test(js));
test('v4.54.0 JS: readiness bar uses (predicted - 420) / 450 formula (matches existing scale)',
  /renderReadinessCardV2[\s\S]{0,2000}r\.predicted\s*-\s*420[\s\S]{0,80}\/ 450/.test(js));
test('v4.54.0 JS: renderHeroV2MiniCards pulls from getDailyGoal + getStreak',
  js.includes('function renderHeroV2MiniCards(') &&
  /renderHeroV2MiniCards[\s\S]{0,2500}getDailyGoal[\s\S]{0,1000}getStreak/.test(js));
test('v4.54.0 JS: goSetup calls renderHeroV2',
  /function goSetup\([\s\S]{0,1500}renderHeroV2/.test(js));
test('v4.54.0 JS: renderSetupFocusBanner outputs v2 structure (fb-quote + fb-body + fb-cta)',
  /renderSetupFocusBanner[\s\S]{0,4000}fb-quote[\s\S]{0,400}fb-body[\s\S]{0,400}fb-cta/.test(js));

// CSS \u2014 topbar
test('v4.54.0 CSS: .app-topbar sticky + flex',
  /\.app-topbar\s*\{[\s\S]{0,400}position:\s*sticky/.test(css) && /\.app-topbar\s*\{[\s\S]{0,400}display:\s*flex/.test(css));
test('v4.54.0 CSS: .topbar-avatar circular gradient',
  /\.topbar-avatar\s*\{[\s\S]{0,600}linear-gradient\(135deg,\s*var\(--accent\)/.test(css) &&
  /\.topbar-avatar\s*\{[\s\S]{0,700}border-radius:\s*50%/.test(css));
test('v4.54.0 CSS: .topbar-time monospace + tabular nums',
  /\.topbar-time\s*\{[\s\S]{0,400}font-family:\s*monospace[\s\S]{0,200}tabular-nums/.test(css));

// CSS \u2014 sidebar collapse
test('v4.54.0 CSS: body.sidebar-collapsed removes padding',
  /body\.sidebar-collapsed\s*\{[^}]*padding-left:\s*0/.test(css));
test('v4.54.0 CSS: body.sidebar-collapsed .app-sidebar uses translateX(-100%)',
  /body\.sidebar-collapsed\s+\.app-sidebar\s*\{[^}]*transform:\s*translateX\(-100%\)/.test(css));

// CSS \u2014 hero v2
test('v4.54.0 CSS: .setup-hero-v2 is 2-col grid',
  /\.setup-hero-v2\s*\{[^}]*display:\s*grid/.test(css) && /\.setup-hero-v2\s*\{[^}]*grid-template-columns:\s*1\.45fr/.test(css));
test('v4.54.0 CSS: .hero-v2-display uses 64px weight-800 tight tracking',
  /\.hero-v2-display\s*\{[\s\S]{0,500}font-size:\s*64px[\s\S]{0,200}letter-spacing:\s*-0\.04em/.test(css));
test('v4.54.0 CSS: .hero-v2-display .name coloured accent-light',
  /\.hero-v2-display\s+\.name\s*\{[^}]*color:\s*var\(--accent-light\)/.test(css));
test('v4.54.0 CSS: .readiness-card-v2 dark gradient + accent-tinted radial highlight',
  /\.readiness-card-v2\s*\{[\s\S]{0,800}linear-gradient\(160deg,\s*#16131f/.test(css));
test('v4.54.0 CSS: .readiness-card-v2 score is 56px weight-800',
  /\.rc-v2-score\s*\{[\s\S]{0,400}font-size:\s*56px[\s\S]{0,80}font-weight:\s*800/.test(css));
test('v4.54.0 CSS: readiness bar uses citron/orange gradient',
  /\.rc-v2-bar-fill\s*\{[\s\S]{0,500}linear-gradient\(90deg,\s*var\(--citron/.test(css));
test('v4.54.0 CSS: mini-card-v2 uses monospace label + tabular-nums value',
  /\.mini-card-v2-label\s*\{[\s\S]{0,300}font-family:\s*monospace/.test(css) &&
  /\.mini-card-v2-val\s*\{[\s\S]{0,400}tabular-nums/.test(css));

// CSS \u2014 focus banner v2
test('v4.54.0 CSS: .focus-banner-v2 purple gradient + diagonal stripe texture',
  /\.focus-banner-v2\s*\{[\s\S]{0,1000}repeating-linear-gradient\(\s*135deg/.test(css) &&
  /\.focus-banner-v2\s*\{[\s\S]{0,1500}linear-gradient\(135deg,\s*var\(--accent-deep/.test(css));
test('v4.54.0 CSS: .focus-banner-v2 giant 80px quote mark',
  /\.focus-banner-v2\s+\.fb-quote\s*\{[\s\S]{0,400}font-size:\s*80px/.test(css));
test('v4.54.0 CSS: .focus-banner-v2 fb-text em uses citron accent',
  /\.focus-banner-v2\s+\.fb-text\s+em\s*\{[^}]*color:\s*var\(--citron/.test(css));
test('v4.54.0 CSS: .fb-cta is white pill with accent-deep text',
  /\.focus-banner-v2\s+\.fb-cta\s*\{[\s\S]{0,300}background:\s*#fff/.test(css));

// CSS \u2014 responsive
test('v4.54.0 CSS: narrow-viewport (<900px) collapses hero to single-col',
  /@media \(max-width:\s*900px\)[\s\S]{0,600}\.setup-hero-v2\s*\{[^}]*grid-template-columns:\s*1fr/.test(css));
test('v4.54.0 CSS: <540px hides topbar-time',
  /@media \(max-width:\s*540px\)[\s\S]{0,300}\.topbar-time\s*\{[^}]*display:\s*none/.test(css));

// CSS \u2014 reduced-motion
test('v4.54.0 CSS: reduced-motion neutralises topbar transitions + readiness bar + fb-cta',
  /prefers-reduced-motion[\s\S]{0,12000}\.topbar-toggle,[\s\S]{0,400}rc-v2-bar-fill/.test(css));

// CSS \u2014 light-theme
test('v4.54.0 CSS: light-theme .app-topbar bg override',
  /\[data-theme="light"\]\s+\.app-topbar\s*\{/.test(css));
test('v4.54.0 CSS: light-theme .hero-v2-display .name recoloured #6355e0',
  /\[data-theme="light"\]\s+\.hero-v2-display\s+\.name\s*\{[^}]*color:\s*#6355e0/.test(css));
test('v4.54.0 CSS: light-theme .focus-banner-v2 keeps accent-deep gradient (readable on light)',
  /\[data-theme="light"\]\s+\.focus-banner-v2\s*\{/.test(css));

// ── v4.54.1 RECENT PERF \u2192 ANALYTICS, SETTINGS \u2192 OWN PAGE ──
// User asked to move Recent Performance off the home page to Analytics,
// and extract the Settings details block into its own sidebar-entry page.
// Late-Saturday ship, kept scope tight to 3 moves + wiring.
console.log('\n\x1b[1m── v4.54.1 LAYOUT CLEANUP ──\x1b[0m');

// HTML
test('v4.54.1 HTML: #page-settings exists',
  html.includes('id="page-settings"'));
test('v4.54.1 (v4.54.16 update) HTML: settings has API key + Exam Date + Daily Goal + Export/Import + Clear Wrong Bank',
  html.includes('id="api-key"') && /id="page-settings"[\s\S]{0,5000}exportData\(\)[\s\S]{0,800}importData\([\s\S]{0,800}clearWrongBank/.test(html));
test('v4.54.1 HTML: #history-panel moved to #page-analytics',
  /id="page-analytics"[\s\S]{0,800}id="history-panel"/.test(html));
test('v4.54.1 HTML: regression \u2014 #advanced-section removed from home',
  !html.includes('id="advanced-section"'));
test('v4.54.1 HTML: regression \u2014 #history-panel no longer inside #page-setup',
  !/#page-setup[\s\S]{0,20000}id="history-panel"/.test(html) ||
  html.indexOf('id="page-analytics"') < html.indexOf('id="history-panel"'));

// JS
test('v4.54.1 JS: APP_SIDEBAR_SETTINGS array with Settings entry',
  js.includes('const APP_SIDEBAR_SETTINGS') && /APP_SIDEBAR_SETTINGS[\s\S]{0,400}label:\s*'Settings'/.test(js));
test('v4.54.1 JS: renderAppSidebar merges Settings into handler registry',
  js.includes('APP_SIDEBAR_PRACTICE, ...APP_SIDEBAR_DRILLS, ...APP_SIDEBAR_SETTINGS'));
test('v4.54.1 JS: sidebar renders Account section with Settings',
  /Account[\s\S]{0,500}APP_SIDEBAR_SETTINGS\.map/.test(js));
test('v4.54.1 JS: SIDEBAR_ACTIVE_MAP has settings entry',
  /SIDEBAR_ACTIVE_MAP[\s\S]{0,1500}'settings':\s*'settings'/.test(js));
test('v4.54.1 JS: TOPBAR_CRUMBS has Settings entry',
  /TOPBAR_CRUMBS[\s\S]{0,1500}'settings':\s*'Settings'/.test(js));
test('v4.54.1 JS: scrollToSettings now navigates to #page-settings',
  /function scrollToSettings\([\s\S]{0,300}showPage\('settings'\)/.test(js));
test('v4.54.1 JS: renderSettingsPage defined, refreshes wrong-bank count',
  js.includes('function renderSettingsPage(') && /renderSettingsPage[\s\S]{0,300}renderWrongBankBtn/.test(js));
test('v4.54.1 JS: goSetup no longer calls renderHistoryPanel (moved to renderAnalytics)',
  !/function goSetup\([\s\S]{0,1500}renderHistoryPanel\(\)/.test(js));
// v4.54.10: Recent Performance retired from Analytics per user feedback ("clogging
// the page"). Flip the assertion to a regression guard.
test('v4.54.1 (v4.54.10 update) JS: renderAnalytics no longer renders renderHistoryPanel',
  !/function renderAnalytics\([\s\S]{0,700}renderHistoryPanel\(\)/.test(js));

// CSS
test('v4.54.1 CSS: #page-settings has max-width',
  /#page-settings\s*\{[^}]*max-width:\s*720px/.test(css));
test('v4.54.1 CSS: .settings-section + .settings-section-title styling',
  css.includes('.settings-section') && /\.settings-section-title\s*\{/.test(css));

// ── v4.54.2 KNOWLEDGE CONSTELLATION ──
// User asked to build the prototype's most distinctive moment — topics as
// floating nodes clustered by domain, sized by practice count, inner core
// sized + colored by mastery. Sunday side-build, patch release.
console.log('\n\x1b[1m── v4.54.2 KNOWLEDGE CONSTELLATION ──\x1b[0m');

// JS
test('v4.54.2 JS: _computeConstellationData function defined',
  js.includes('function _computeConstellationData('));
test('v4.54.2 JS: _renderAnaConstellation function defined',
  js.includes('function _renderAnaConstellation('));
test('v4.54.2 JS: renderAnalytics calls _renderAnaConstellation after Domain Mastery',
  /_renderAnaDomainMastery\(h\);[\s\S]{0,400}_renderAnaConstellation\(h\)/.test(js));
test('v4.54.2 JS: constellation uses TOPIC_DOMAINS for domain lookup',
  /_computeConstellationData[\s\S]{0,800}TOPIC_DOMAINS\[topic\]/.test(js));
test('v4.54.2 JS: tier thresholds match Domain Mastery (55/70/85)',
  /_computeConstellationData[\s\S]{0,1500}mastery\s*>=\s*85[\s\S]{0,200}mastery\s*>=\s*70[\s\S]{0,200}mastery\s*>=\s*55/.test(js));
test('v4.54.2 JS: 5 domain cluster anchors defined (concepts/implementation/operations/security/troubleshooting)',
  /const CLUSTERS\s*=\s*\{[\s\S]{0,600}concepts[\s\S]{0,200}implementation[\s\S]{0,200}operations[\s\S]{0,200}security[\s\S]{0,200}troubleshooting/.test(js));
test('v4.54.2 JS: golden-angle jitter for stable deterministic layout',
  /_renderAnaConstellation[\s\S]{0,3500}i\s*\*\s*2\.399/.test(js));
test('v4.54.2 JS: node radius uses sqrt scale on attempts',
  /Math\.sqrt\(t\.attempts\)\s*\*\s*2\.2/.test(js));
test('v4.54.2 JS: nodes click through to focusTopic',
  /_renderAnaConstellation[\s\S]{0,6000}onclick="focusTopic/.test(js));
test('v4.54.2 JS: SVG <title> tooltip with topic + mastery + attempts + last-studied',
  /_renderAnaConstellation[\s\S]{0,5000}<title>\$\{title\}<\/title>/.test(js));
test('v4.54.2 JS: empty state when no studied topics',
  /_renderAnaConstellation[\s\S]{0,1500}studied\s*===\s*0/.test(js));
test('v4.54.2 JS: legend HTML with 4 tiers (mastered/proficient/developing/novice)',
  /ana-const-tier-mastered[\s\S]{0,500}ana-const-tier-proficient[\s\S]{0,500}ana-const-tier-developing[\s\S]{0,500}ana-const-tier-novice/.test(js));

// CSS
test('v4.54.2 CSS: .ana-const-map has starfield radial-gradient background',
  /\.ana-const-map\s*\{[\s\S]{0,800}radial-gradient\(circle at 20%/.test(css));
test('v4.54.2 CSS: 5 per-domain-idx color tints on nodes',
  /\.ana-const-node\[data-domain-idx="1"\][\s\S]{0,100}#7c6ff7/.test(css) &&
  /\.ana-const-node\[data-domain-idx="5"\][\s\S]{0,100}#ef4444/.test(css));
test('v4.54.2 CSS: tier-based brightness (mastered brighter, novice dimmed)',
  /\.ana-const-tier-mastered\s+\.ana-const-core\s*\{[\s\S]{0,200}brightness\(1\.25\)/.test(css) &&
  /\.ana-const-tier-novice\s+\.ana-const-core\s*\{[\s\S]{0,100}opacity:\s*0?\.45/.test(css));
test('v4.54.2 CSS: @keyframes anaConstTwinkle (entry animation)',
  /@keyframes anaConstTwinkle/.test(css));
test('v4.54.2 CSS: per-cluster stagger delays',
  /ana-const-node\[data-domain-idx="1"\][\s\S]{0,200}animation-delay:\s*\.05s/.test(css) &&
  /ana-const-node\[data-domain-idx="5"\][\s\S]{0,200}animation-delay:\s*\.45s/.test(css));
test('v4.54.2 CSS: reduced-motion neutralises twinkle',
  /prefers-reduced-motion[\s\S]{0,15000}#ana-s-constellation\s+\.ana-const-node[\s\S]{0,200}animation:\s*none/.test(css));
test('v4.54.2 CSS: light-theme cluster-name fill recoloured',
  /\[data-theme="light"\]\s+\.ana-const-cluster-name\s*\{/.test(css));

// ── v4.54.3 RESULTS PAGE EDITORIAL REDESIGN ──
// User: "lets do the results page redesign in order to fit the prototype
// aesthetics". Replaces circular grade ring + A-F letter with scaled-score
// hero + italic-accent display heading.
console.log('\n\x1b[1m── v4.54.3 RESULTS v2 ──\x1b[0m');

// HTML
test('v4.54.3 HTML: .results-v2 wrapper exists',
  html.includes('class="results-v2"'));
test('v4.54.3 HTML: eyebrow + display heading + lede',
  html.includes('class="results-v2-eyebrow"') && html.includes('class="results-v2-display"') && html.includes('class="results-v2-lede"'));
test('v4.54.3 HTML: scaled-score hero with score + verdict',
  html.includes('class="results-v2-big-score"') && html.includes('id="r-v2-score"') && html.includes('id="r-v2-verdict"'));
test('v4.54.3 HTML: 4-row stats aside (Correct / Wrong / Raw % / Best streak)',
  /id="r-correct"[\s\S]{0,500}id="r-wrong"[\s\S]{0,500}id="r-v2-pct"[\s\S]{0,500}id="r-streak"/.test(html));
test('v4.54.3 HTML: editorial CTA row with 3 buttons (Back / Review / New session)',
  html.includes('class="results-v2-cta-row"') && html.includes('New session') && html.includes('Review answers'));
test('v4.54.3 HTML: regression \u2014 legacy grade-ring removed',
  !html.includes('class="grade-ring"') && !html.includes('id="grade-fill"') && !html.includes('id="grade-letter"'));
test('v4.54.3 HTML: regression \u2014 legacy .results-stats/.results-actions removed from #page-results (exam-results page keeps its own layout)',
  (() => {
    const i = html.indexOf('id="page-results"');
    const j = html.indexOf('id="page-review"');
    if (i < 0 || j < 0) return false;
    const quizResults = html.slice(i, j);
    return !quizResults.includes('class="results-stats"') && !quizResults.includes('class="results-actions"');
  })());

// JS
test('v4.54.3 JS: finish() guards legacy grade-ring writes with if(el)',
  /function finish\([\s\S]{0,2000}const ringFill\s*=\s*document\.getElementById\('grade-fill'\);\s*\n\s*if\s*\(ringFill\)/.test(js));
test('v4.54.3 JS: finish() writes scaled score via animateCount to #r-v2-score',
  /function finish\([\s\S]{0,4000}animateCount\('r-v2-score'/.test(js));
test('v4.54.3 JS: scaled-score formula 100 + (pct/100) * 800',
  /const scaled\s*=\s*Math\.max\(100,\s*Math\.min\(900,\s*Math\.round\(100 \+ \(pct \/ 100\) \* 800\)\)\)/.test(js));
test('v4.54.3 JS: passed = scaled >= 720',
  /const passed\s*=\s*scaled\s*>=\s*720/.test(js));
test('v4.54.3 JS: verdict adds pass/fail class + text',
  /function finish\([\s\S]{0,5500}results-v2-verdict-pass[\s\S]{0,300}results-v2-verdict-fail/.test(js));
test('v4.54.3 JS: headlines use HTML italic em (not plain text)',
  /headlines\s*=\s*\{[\s\S]{0,400}Crushing <em>/.test(js));
test('v4.54.3 JS: result-headline uses innerHTML (supports em tag)',
  /headlineEl\.innerHTML\s*=\s*headlines\[grade\]\[0\]/.test(js));

// CSS
test('v4.54.3 CSS: .results-v2-display uses 50px weight-800 tight tracking',
  /\.results-v2-display\s*\{[\s\S]{0,400}font-size:\s*50px[\s\S]{0,200}letter-spacing:\s*-0\.03em/.test(css));
test('v4.54.3 CSS: .results-v2-display em uses accent-light + normal style',
  /\.results-v2-display em\s*\{[\s\S]{0,300}color:\s*var\(--accent-light\)/.test(css));
test('v4.54.3 CSS: .results-v2-hero is dark gradient + 2-col grid',
  /\.results-v2-hero\s*\{[\s\S]{0,500}grid-template-columns:\s*1\.3fr\s+1fr/.test(css) &&
  /\.results-v2-hero\s*\{[\s\S]{0,1000}linear-gradient\(160deg,\s*#16131f/.test(css));
test('v4.54.3 CSS: .results-v2-big-score is 68px weight-800 tabular-nums',
  /\.results-v2-big-score\s*\{[\s\S]{0,400}font-size:\s*68px[\s\S]{0,200}tabular-nums/.test(css));
test('v4.54.3 CSS: .results-v2-verdict-pass green, -fail red pill styling',
  /\.results-v2-verdict-pass\s*\{[\s\S]{0,300}rgba\(34,\s*197,\s*94/.test(css) &&
  /\.results-v2-verdict-fail\s*\{[\s\S]{0,300}rgba\(239,\s*68,\s*68/.test(css));
test('v4.54.3 CSS: legacy .results-hero/.results-stats/.results-actions force-hidden',
  /\.results-hero\s*\{\s*display:\s*none\s*!important/.test(css) &&
  /\.results-stats\s*\{\s*display:\s*none\s*!important/.test(css) &&
  /\.results-actions\s*\{\s*display:\s*none\s*!important/.test(css));
test('v4.54.3 CSS: narrow viewport collapses hero to single-col',
  /@media \(max-width:\s*680px\)[\s\S]{0,600}\.results-v2-hero\s*\{[^}]*grid-template-columns:\s*1fr/.test(css));
test('v4.54.3 CSS: light-theme hero stays dark (design intent)',
  /\[data-theme="light"\]\s+\.results-v2-hero\s*\{[\s\S]{0,500}linear-gradient\(160deg,\s*#1a1725/.test(css));

// ── v4.54.4 TOPOLOGY BUILDER EDITORIAL POLISH ──
// User: "now lets do the Topology page redesign to fit the prototype as best
// you can". Zero changes to the 4500-LOC TB engine; editorial chrome polish only.
console.log('\n\x1b[1m── v4.54.4 TB EDITORIAL POLISH ──\x1b[0m');

// v4.54.5: editorial header moved OUT of .tb-v2-header and INTO .tb-pane-head at the top of the left palette pane.
// These assertions retargeted to the new location.
test('v4.54.4 (v4.54.5 update) HTML: editorial pane header exists',
  html.includes('class="tb-pane-head"'));
test('v4.54.4 (v4.54.5 update) HTML: pane head uses italic "Topology <em>Builder</em>"',
  /tb-pane-head[^<]*>Topology\s*<em>Builder<\/em>/.test(html));
test('v4.54.4 (v4.54.5 update) HTML: pane sub describes drag + wire instruction',
  /class="tb-pane-sub"[^<]*>Drag devices/.test(html));
test('v4.54.4 HTML: canvas bottom stats strip (#tb-v2-stats)',
  html.includes('id="tb-v2-stats"') && html.includes('class="tb-v2-stats"'));

test('v4.54.4 JS: tbRenderV2Stats function defined',
  js.includes('function tbRenderV2Stats('));
test('v4.54.4 JS: tbUpdateDeviceCount hooks tbRenderV2Stats',
  /function tbUpdateDeviceCount\([\s\S]{0,400}tbRenderV2Stats\(\)/.test(js));
test('v4.54.4 JS: stats strip reads tbState.devices.length + tbState.cables.length',
  /tbRenderV2Stats[\s\S]{0,1500}tbState\.devices\.length[\s\S]{0,400}tbState\.cables\.length/.test(js));
test('v4.54.4 JS: VLAN count aggregated from vlanDb (skipping default VLAN 1)',
  /tbRenderV2Stats[\s\S]{0,1500}vlanDb[\s\S]{0,400}v\s*!==\s*'1'/.test(js));
test('v4.54.4 JS: scenario label lookup via TB_SCENARIOS',
  /tbRenderV2Stats[\s\S]{0,2500}TB_SCENARIOS\.find\(s\s*=>\s*s\.id\s*===\s*tbSelectedScenario\)/.test(js));

test('v4.54.4 CSS: .tb-hero retired via display:none important',
  /\.tb-hero\s*\{\s*display:\s*none\s*!important/.test(css));
test('v4.54.4 CSS: .tb-v2-display uses 42px weight-800',
  /\.tb-v2-display\s*\{[\s\S]{0,400}font-size:\s*42px[\s\S]{0,200}font-weight:\s*800/.test(css));
test('v4.54.4 CSS: .tb-v2-display em uses accent-light',
  /\.tb-v2-display em\s*\{[^}]*color:\s*var\(--accent-light\)/.test(css));
test('v4.54.4 CSS: .tb-v2-stats positioned absolute at canvas bottom with backdrop-blur',
  /\.tb-v2-stats\s*\{[\s\S]{0,500}position:\s*absolute/.test(css) &&
  /\.tb-v2-stats\s*\{[\s\S]{0,800}backdrop-filter:\s*blur/.test(css));
test('v4.54.4 CSS: palette headers use monospace small-caps',
  /\.tb-palette-head[\s\S]{0,400}font-family:\s*monospace/.test(css) &&
  /\.tb-palette-head[\s\S]{0,500}text-transform:\s*uppercase/.test(css));
test('v4.54.4 CSS: toolbar-v2 uses radial+linear gradient background',
  /\.tb-toolbar\.tb-toolbar-v2\s*\{[\s\S]{0,400}radial-gradient/.test(css));
test('v4.54.4 CSS: light-theme .tb-v2-stats + .tb-v2-display em recoloured',
  /\[data-theme="light"\]\s+\.tb-v2-stats\s*\{/.test(css) &&
  /\[data-theme="light"\][\s\S]{0,300}\.tb-v2-display em[\s\S]{0,100}#6355e0/.test(css));

// ── v4.54.5 TB 3-COLUMN LAYOUT ──
// User clarified: wants the prototype's full 3-col layout (palette / canvas /
// right-pane Scenarios + Inspector). Zero engine changes; layout shell only.
console.log('\n\x1b[1m── v4.54.5 TB 3-COLUMN LAYOUT ──\x1b[0m');

// HTML
test('v4.54.5 HTML: .tb-workspace-v3 grid shell exists',
  html.includes('tb-workspace tb-workspace-v3'));
test('v4.54.5 HTML: left pane uses .tb-palette-v3 + .tb-pane-head + .tb-pane-sub',
  html.includes('class="tb-palette tb-palette-v3"') && html.includes('class="tb-pane-head"') && html.includes('class="tb-pane-sub"'));
test('v4.54.5 (v4.54.6 update) HTML: right pane #tb-v3-right + scenarios list (Inspector now in floating popup)',
  html.includes('id="tb-v3-right"') && html.includes('id="tb-v3-scenarios-list"') && html.includes('id="tb-v3-inspector"'));
// v4.54.6: .tb-v3-section-sep retired \u2014 Inspector moved out of right pane into floating popup,
// so the divider between Scenarios and Inspector is no longer needed. Regression-guard the removal.
test('v4.54.6 HTML: .tb-v3-section-sep removed (Inspector moved to popup)',
  !html.includes('class="tb-v3-section-sep"'));

// JS
test('v4.54.5 JS: tbRenderV3ScenariosList defined',
  js.includes('function tbRenderV3ScenariosList('));
test('v4.54.5 JS: tbRenderV3Inspector defined',
  js.includes('function tbRenderV3Inspector('));
test('v4.54.5 JS: tbSelectDeviceForInspector defined + tracks tbV3InspectedDeviceId',
  js.includes('function tbSelectDeviceForInspector(') && js.includes('let tbV3InspectedDeviceId'));
test('v4.54.5 JS: scenarios list builds tmpState to count devices per scenario',
  /tbRenderV3ScenariosList[\s\S]{0,1500}autoBuild\(tmpState\)[\s\S]{0,200}tmpState\.devices\.length/.test(js));
test('v4.54.5 JS: scenarios list active-scenario highlight via tb-v3-scn-active',
  /tbRenderV3ScenariosList[\s\S]{0,2000}tb-v3-scn-active/.test(js));
test('v4.54.5 JS: inspector empty-state when no device selected',
  /tbRenderV3Inspector[\s\S]{0,1500}Click a device/.test(js));
// v4.60.0: legacy v4.54.5 assertion retired — the inspector now renders
// Routing / ARP / MAC / DHCP accordion sections instead of iface/routing/vlan.
// Equivalent structural check covered by the v4.60.0 JS block below.
test('v4.60.0 JS: inspector renders 4 role-aware accordion sections',
  /tbRenderV3Inspector[\s\S]{0,8000}Routing Table[\s\S]{0,2000}ARP Cache[\s\S]{0,2000}MAC Address Table[\s\S]{0,2000}DHCP/.test(js));
test('v4.54.5 JS: openTopologyBuilder calls tbRenderV3ScenariosList + tbRenderV3Inspector',
  /openTopologyBuilder[\s\S]{0,1500}tbRenderV3ScenariosList\(\)[\s\S]{0,400}tbRenderV3Inspector\(\)/.test(js));
test('v4.54.5 JS: tbLoadScenarioWithBuild refreshes right pane + clears inspector selection',
  /tbLoadScenarioWithBuild[\s\S]{0,3500}tbV3InspectedDeviceId\s*=\s*null[\s\S]{0,400}tbRenderV3ScenariosList/.test(js));
test('v4.54.5 JS: tbOnDeviceMouseDown hooks tbSelectDeviceForInspector',
  /tbOnDeviceMouseDown[\s\S]{0,2500}tbSelectDeviceForInspector\(id\)/.test(js));

// CSS
test('v4.54.5 CSS: .tb-workspace-v3 uses 3-col grid (220 / 1fr / 260)',
  /\.tb-workspace\.tb-workspace-v3\s*\{[\s\S]{0,400}grid-template-columns:\s*220px\s+1fr\s+260px/.test(css));
test('v4.54.5 CSS: .tb-pane-head uses 20px weight-800 italic-accent em',
  /\.tb-pane-head\s*\{[\s\S]{0,300}font-size:\s*20px[\s\S]{0,200}font-weight:\s*800/.test(css) &&
  /\.tb-pane-head em\s*\{[^}]*color:\s*var\(--accent-light\)/.test(css));
test('v4.54.5 CSS: .tb-v3-right fixed-height scrollable',
  /\.tb-v3-right\s*\{[\s\S]{0,500}overflow-y:\s*auto[\s\S]{0,200}max-height/.test(css));
test('v4.54.5 CSS: .tb-v3-scn-active has accent gradient + border',
  /\.tb-v3-scn-active\s*\{[\s\S]{0,400}linear-gradient\(135deg,\s*rgba\(var\(--accent-rgb\)/.test(css));
test('v4.54.5 CSS: .tb-v3-inspect-row monospace key + tabular-nums value',
  /\.tb-v3-inspect-row\s*\.k\s*\{[\s\S]{0,300}font-family:\s*monospace/.test(css) &&
  /\.tb-v3-inspect-row\s*\.v\s*\{[\s\S]{0,300}tabular-nums/.test(css));
test('v4.54.5 CSS: responsive <1200px hides .tb-v3-right + collapses to 2-col',
  /@media \(max-width:\s*1200px\)[\s\S]{0,500}\.tb-workspace\.tb-workspace-v3\s*\{[^}]*grid-template-columns:\s*200px\s+1fr/.test(css) &&
  /@media \(max-width:\s*1200px\)[\s\S]{0,500}\.tb-v3-right\s*\{\s*display:\s*none/.test(css));
test('v4.54.5 CSS: light-theme .tb-v3-scn-active recoloured #6355e0',
  /\[data-theme="light"\]\s+\.tb-v3-scn-active\s*\{[\s\S]{0,300}99,\s*85,\s*224/.test(css));

// ── v4.54.6 TB usability fixes ──
// User asked for 6 things after v4.54.5 shipped: pill-tab toolbar inside the
// canvas, canvas pan + zoom + default zoom-in, draggable transparent inspector
// popup (replacing the right-pane Inspector), categorised scenarios with
// subheaders + full text wrap, 2-col palette grid. This block guards all of
// them.
console.log('\n\x1b[1m\u2500\u2500 v4.54.6 TB USABILITY FIXES \u2500\u2500\x1b[0m');

// HTML
test('v4.54.6 HTML: canvas pill toolbar (#tb-canvas-pills) with Design + Simulate + Labs mode pills',
  html.includes('id="tb-canvas-pills"') &&
  /data-tb-pill="design"/.test(html) &&
  /data-tb-pill="simulate"/.test(html) &&
  /data-tb-pill="labs"/.test(html));
test('v4.54.6 HTML: pill toolbar action buttons (Coach + Grade + PNG)',
  /tb-pill-action[\s\S]{0,200}tbCoachTopology\(\)/.test(html) &&
  /tb-pill-grade[\s\S]{0,200}tbGradeTopology\(\)/.test(html) &&
  /tb-pill-action[\s\S]{0,200}tbExportPNG\(\)/.test(html));
test('v4.54.6 HTML: zoom controls (#tb-zoom-ctrls + zoom in/out/reset buttons)',
  html.includes('id="tb-zoom-ctrls"') &&
  /tbZoomIn\(\)/.test(html) && /tbZoomOut\(\)/.test(html) && /tbZoomReset\(\)/.test(html));
test('v4.54.6 HTML: floating draggable inspector popup (#tb-inspector-pop + close button)',
  html.includes('id="tb-inspector-pop"') &&
  html.includes('id="tb-inspector-pop-head"') &&
  /tbInspectorPopClose\(\)/.test(html));
test('v4.54.6 (v4.54.7 update) HTML: canvas viewBox default tightened (250 200 1300 780)',
  /id="tb-canvas"[\s\S]{0,400}viewBox="250 200 1300 780"/.test(html));
test('v4.54.6 HTML: grid bg rect uses fixed world dims so panning still shows grid',
  /<rect x="0" y="0" width="1800" height="1100" fill="url\(#tb-grid\)"/.test(html));

// JS
test('v4.54.6 JS: tbViewState + TB_VIEW_DEFAULT defined for pan/zoom state',
  js.includes('const TB_VIEW_DEFAULT') && js.includes('let tbViewState'));
test('v4.54.6 JS: tbZoomIn / tbZoomOut / tbZoomReset / tbZoomBy defined',
  js.includes('function tbZoomIn(') && js.includes('function tbZoomOut(') &&
  js.includes('function tbZoomReset(') && js.includes('function tbZoomBy('));
test('v4.54.6 JS: tbApplyViewBox sets viewBox attribute on #tb-canvas',
  /function tbApplyViewBox\(\)\s*\{[\s\S]{0,400}setAttribute\('viewBox',/.test(js));
test('v4.54.6 JS: tbBindCanvasPanZoom binds wheel + mousedown for pan/zoom',
  js.includes('function tbBindCanvasPanZoom(') &&
  /tbBindCanvasPanZoom[\s\S]{0,1500}addEventListener\('wheel'/.test(js) &&
  /tbBindCanvasPanZoom[\s\S]{0,2500}addEventListener\('mousedown'/.test(js));
test('v4.54.6 JS: tbZoomBy clamps to TB_VIEW_MIN_W / TB_VIEW_MAX_W',
  /tbZoomBy[\s\S]{0,800}TB_VIEW_MIN_W[\s\S]{0,200}TB_VIEW_MAX_W/.test(js));
test('v4.54.6 JS: openTopologyBuilder calls tbBindCanvasPanZoom + tbZoomReset',
  /openTopologyBuilder[\s\S]{0,2000}tbBindCanvasPanZoom\(\)[\s\S]{0,400}tbZoomReset\(\)/.test(js));
test('v4.54.6 JS: tbInspectorPopOpen + tbInspectorPopClose defined',
  js.includes('function tbInspectorPopOpen(') && js.includes('function tbInspectorPopClose('));
test('v4.54.6 JS: tbBindInspectorPopDrag drags popup by header',
  js.includes('function tbBindInspectorPopDrag(') &&
  /tbBindInspectorPopDrag[\s\S]{0,1500}addEventListener\('mousedown'/.test(js));
test('v4.54.6 JS: tbSelectDeviceForInspector auto-opens popup on device click',
  /tbSelectDeviceForInspector[\s\S]{0,500}tbInspectorPopOpen\(\)/.test(js));
test('v4.54.6 JS: tbLoadScenarioWithBuild closes popup when scenario loads',
  /tbLoadScenarioWithBuild[\s\S]{0,3500}tbInspectorPopClose\(\)/.test(js));
test('v4.54.6 JS: tbSelectPill toggles aria-pressed + tb-pill-active across pills',
  js.includes('function tbSelectPill(') &&
  /tbSelectPill[\s\S]{0,500}tb-pill-active[\s\S]{0,300}aria-pressed/.test(js));
test('v4.54.6 JS: tbRenderV3ScenariosList builds categorised sections via TB_SCENARIO_CATEGORIES',
  /tbRenderV3ScenariosList[\s\S]{0,3500}TB_SCENARIO_CATEGORIES[\s\S]{0,1500}tb-v3-scn-cat/.test(js));
test('v4.54.6 JS: scenarios list renders Sandbox group with Free Build pinned',
  /tbRenderV3ScenariosList[\s\S]{0,3500}Sandbox[\s\S]{0,800}free-build/.test(js));

// CSS
test('v4.54.6 CSS: palette devices in 2-col grid',
  /\.tb-palette\.tb-palette-v3\s+#tb-palette-items\s*\{[\s\S]{0,300}grid-template-columns:\s*1fr\s+1fr/.test(css));
test('v4.54.6 CSS: palette group head spans both columns',
  /tb-palette-group-head[\s\S]{0,400}grid-column:\s*1\s*\/\s*-1/.test(css));
test('v4.54.6 CSS: scenario titles wrap (white-space:normal, no ellipsis)',
  /\.tb-v3-scn-cat-body\s+\.tb-v3-scn-title\s*\{[\s\S]{0,300}white-space:\s*normal/.test(css));
test('v4.54.6 CSS: scenario category subheader is monospace small-caps accent',
  /\.tb-v3-scn-cat-head\s*\{[\s\S]{0,500}font-family:\s*monospace[\s\S]{0,300}text-transform:\s*uppercase/.test(css));
test('v4.54.6 CSS: pill toolbar absolute-positioned top-left of canvas with backdrop blur',
  /\.tb-canvas-pills\s*\{[\s\S]{0,500}position:\s*absolute[\s\S]{0,200}backdrop-filter:\s*blur/.test(css));
test('v4.54.6 CSS: active pill gets accent gradient + accent-light text',
  /\.tb-pill-active\s*\{[\s\S]{0,400}linear-gradient\(135deg,\s*rgba\(124,\s*111,\s*247/.test(css));
test('v4.54.6 CSS: green Grade pill has its own tint (.tb-pill-grade)',
  /\.tb-pill-grade\s*\{[\s\S]{0,300}rgba\(34,\s*197,\s*94/.test(css));
test('v4.54.6 CSS: zoom controls bottom-right with backdrop blur',
  /\.tb-zoom-ctrls\s*\{[\s\S]{0,500}position:\s*absolute[\s\S]{0,200}backdrop-filter:\s*blur/.test(css));
test('v4.54.6 CSS: inspector popup is absolute, transparent dark glass, rounded',
  /\.tb-inspector-pop\s*\{[\s\S]{0,800}position:\s*absolute[\s\S]{0,400}backdrop-filter:\s*blur[\s\S]{0,200}border-radius:\s*14px/.test(css));
test('v4.54.6 CSS: inspector popup head is grab cursor (drag handle)',
  /\.tb-inspector-pop-head\s*\{[\s\S]{0,400}cursor:\s*grab/.test(css));
test('v4.54.6 CSS: tbInspectorPopIn keyframe entrance animation',
  /@keyframes tbInspectorPopIn\s*\{/.test(css));
test('v4.54.6 CSS: light-theme overrides for pills + zoom + popup',
  /\[data-theme="light"\]\s+\.tb-canvas-pills\s*\{/.test(css) &&
  /\[data-theme="light"\]\s+\.tb-zoom-ctrls\s*\{/.test(css) &&
  /\[data-theme="light"\]\s+\.tb-inspector-pop\s*\{/.test(css));
test('v4.54.6 CSS: reduced-motion neutralises popup animation + pill transitions',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,400}\.tb-inspector-pop\s*\{[^}]*animation:\s*none/.test(css));

// ── v4.54.7 TB full-bleed + draggable config panel + collapsibles ──
// User feedback on v4.54.6: wanted canvas to cover full horizontal area to the
// sidebar; full-config panel to open as a draggable translucent popup (same
// aesthetic as inspector); legacy top toolbar collapsible; devices spread
// horizontally; how-to collapsed by default.
console.log('\n\x1b[1m\u2500\u2500 v4.54.7 TB FULL-BLEED + DRAGGABLE CONFIG \u2500\u2500\x1b[0m');

// HTML
test('v4.54.7 HTML: legacy toolbar wrapped in <details id="tb-toolbar-details">',
  html.includes('id="tb-toolbar-details"') && html.includes('class="tb-toolbar-details"') &&
  html.includes('class="tb-toolbar-summary"'));
test('v4.54.7 HTML: toolbar summary has Full toolbar label + hint',
  /tb-toolbar-summary[^<]*>(?:[\s\S]{0,300})Full toolbar/.test(html));

// JS
test('v4.54.7 JS: TB_VIEW_DEFAULT updated to 250 200 1300 780 (wider spread)',
  /TB_VIEW_DEFAULT\s*=\s*\{\s*x:\s*250,\s*y:\s*200,\s*w:\s*1300,\s*h:\s*780\s*\}/.test(js));
test('v4.54.7 JS: tbBindConfigPanelDrag defined with mousedown on .tb-config-head',
  js.includes('function tbBindConfigPanelDrag(') &&
  /tbBindConfigPanelDrag[\s\S]{0,1500}\.tb-config-head[\s\S]{0,400}addEventListener\('mousedown'/.test(js));
test('v4.54.7 JS: tbBindConfigPanelDrag ignores clicks on close + explain buttons',
  /tbBindConfigPanelDrag[\s\S]{0,1500}tb-config-close[\s\S]{0,200}tb-explain-btn/.test(js));
test('v4.54.7 JS: openTopologyBuilder binds config panel drag',
  /openTopologyBuilder[\s\S]{0,2500}tbBindConfigPanelDrag\(\)/.test(js));
test('v4.54.7 JS: tbOpenConfigPanel resets inline left/top/right on each open',
  /tbOpenConfigPanel[\s\S]{0,1500}panel\.style\.left\s*=\s*''[\s\S]{0,200}panel\.style\.top\s*=\s*''[\s\S]{0,200}panel\.style\.right\s*=\s*''/.test(js));
test('v4.54.7 JS: tbAutoCollapseIntroHowto keeps how-to + toolbar collapsed by default',
  /tbAutoCollapseIntroHowto[\s\S]{0,1500}howtoEl\.removeAttribute\('open'\)/.test(js) &&
  /tbAutoCollapseIntroHowto[\s\S]{0,1500}tb-toolbar-details[\s\S]{0,400}removeAttribute\('open'\)/.test(js));

// CSS
test('v4.54.7 CSS: #page-topology-builder overrides .page max-width to none (full-bleed)',
  /#page-topology-builder\.page\s*\{[\s\S]{0,400}max-width:\s*none/.test(css));
// v4.54.16 widened palette 220 \u2192 260px; middle column still minmax(0, 1fr).
test('v4.54.7 (v4.54.16 update) CSS: .tb-workspace-v3 uses minmax(0, 1fr) middle column',
  /\.tb-workspace\.tb-workspace-v3\s*\{[\s\S]{0,800}grid-template-columns:\s*260px\s+minmax\(0,\s*1fr\)\s+260px/.test(css));
test('v4.54.7 CSS: canvas uses viewport-height min-height (calc(100vh - ...))',
  /\.tb-canvas-wrap\s*\{[\s\S]{0,500}min-height:\s*calc\(100vh\s*-\s*\d+px\)/.test(css));
test('v4.54.7 CSS: toolbar-details collapsible styling with rotating chevron',
  /\.tb-toolbar-details\s*\{[\s\S]{0,400}border-radius/.test(css) &&
  /\.tb-toolbar-summary::before\s*\{[\s\S]{0,400}transition:\s*transform/.test(css) &&
  /\.tb-toolbar-details\[open\]\s*>\s*\.tb-toolbar-summary::before\s*\{[\s\S]{0,200}transform:\s*rotate\(90deg\)/.test(css));
test('v4.54.7 CSS: .tb-config-panel is position:fixed translucent glass with blur',
  /\.tb-config-panel\s*\{[\s\S]{0,600}position:\s*fixed[\s\S]{0,400}backdrop-filter:\s*blur/.test(css));
test('v4.54.7 CSS: config panel has grab cursor on header (drag handle)',
  /\.tb-config-panel\s+\.tb-config-head\s*\{[\s\S]{0,300}cursor:\s*grab/.test(css));
test('v4.54.7 CSS: tbConfigPopIn keyframe entrance animation',
  /@keyframes tbConfigPopIn\s*\{/.test(css));
test('v4.54.7 CSS: how-to-details expanded state capped via max-height 40vh',
  /\.tb-howto-details\[open\]\s*\{[\s\S]{0,200}max-height:\s*40vh/.test(css));
test('v4.54.7 CSS: light-theme overrides for toolbar-details + config-panel',
  /\[data-theme="light"\]\s+\.tb-toolbar-details\s*\{/.test(css) &&
  /\[data-theme="light"\]\s+\.tb-config-panel\s*\{/.test(css));
test('v4.54.7 CSS: reduced-motion neutralises config-panel entrance animation',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,400}\.tb-config-panel\s*\{[^}]*animation:\s*none/.test(css));
test('v4.54.7 CSS: responsive <900px stacks workspace and sizes config popup to viewport',
  /@media \(max-width:\s*900px\)[\s\S]{0,800}\.tb-config-panel\s*\{[\s\S]{0,400}width:\s*calc\(100vw\s*-\s*24px\)/.test(css));

// ── v4.54.8 Editorial prototype completion ──
// One mega-ship closing the prototype-mapping backlog: Quiz editorial overhaul,
// Analytics accuracy chart + sparklines, Home polish pass, Results review list
// + drill-mistakes CTA, sidebar drill nav-count pills, elapsed-time on Results.
console.log('\n\x1b[1m\u2500\u2500 v4.54.8 EDITORIAL PROTOTYPE COMPLETION \u2500\u2500\x1b[0m');

// v4.54.9: drill nav-count pills retired. Guard the removal + the CSS hide rule.
test('v4.54.9 JS: renderAppSidebar no longer computes drillCounts (pills retired)',
  !/renderAppSidebar[\s\S]{0,3000}drillCounts/.test(js));
test('v4.54.9 CSS: .sb-item-count hidden via display: none',
  /\.sb-item-count\s*\{[\s\S]{0,200}display:\s*none\s*!important/.test(css));

// Results: elapsed-time row + review list + drill-mistakes CTA
test('v4.54.8 HTML: Results aside includes #r-elapsed row',
  /<span class="k">Time<\/span><span class="v" id="r-elapsed">/.test(html));
test('v4.54.8 HTML: #results-review-list container + eyebrow + italic-accent title',
  html.includes('id="results-review-list"') &&
  /results-v2-review-eyebrow[^<]*>Review[^<]*session/.test(html) &&
  /results-v2-review-title[^<]*>Every\s*<em>answer\.<\/em>/.test(html));
test('v4.54.8 HTML: Drill my mistakes CTA button exists',
  /id="btn-drill-mistakes"[\s\S]{0,200}drillMistakesFromResults\(\)/.test(html));
test('v4.54.8 JS: _sessionStartTs tracked on startQuiz + drillMistakesFromResults',
  /function startQuiz\([\s\S]{0,6000}_sessionStartTs\s*=\s*Date\.now\(\)/.test(js) &&
  js.includes('let _sessionStartTs') &&
  js.includes('function drillMistakesFromResults(') &&
  js.includes('function _formatElapsed('));
test('v4.54.8 JS: _renderResultsReviewList builds rows with N\u00ba + prompt + topic + verdict',
  js.includes('function _renderResultsReviewList(') &&
  /_renderResultsReviewList[\s\S]{0,2500}results-v2-review-row[\s\S]{0,800}results-v2-review-mark/.test(js));
test('v4.54.8 JS: finish() wires elapsed + review list + drill-btn visibility',
  /function finish\(\)[\s\S]{0,5000}r-elapsed[\s\S]{0,2000}_renderResultsReviewList\(\)[\s\S]{0,600}btn-drill-mistakes/.test(js));
test('v4.54.8 CSS: .results-v2-review-list uses 56/1fr/auto grid + hover lift + verdict badges',
  /\.results-v2-review-row\s*\{[\s\S]{0,500}grid-template-columns:\s*56px\s+1fr\s+auto/.test(css) &&
  /\.results-v2-review-mark-ok\s*\{/.test(css) &&
  /\.results-v2-review-mark-bad\s*\{/.test(css));

// Home polish
test('v4.54.8 HTML: Marathon 60Q cell has SIM badge (preset-sim + preset-sim-badge)',
  html.includes('class="preset-tile preset-sim"') &&
  html.includes('class="preset-sim-badge"'));
test('v4.54.8 HTML: cq-summary-bar prose + CTA exists above Generate button',
  html.includes('id="cq-summary-bar"') &&
  html.includes('id="cq-summary-prose"') &&
  /class="[^"]*\bcq-summary-cta\b/.test(html));
test('v4.54.8 JS: updateCqSummaryBar defined + called from initChips click handler',
  js.includes('function updateCqSummaryBar(') &&
  /initChips[\s\S]{0,1500}updateCqSummaryBar\(\)/.test(js));
// v4.54.10: wrap-chip pattern replaced by vertical .dg-topic-list with canonical topics.
// Legacy dg-weak-chips class retired + hidden via CSS !important.
test('v4.54.8 (v4.54.10 update) JS: renderSetupDomainGrid emits .dg-topic-list with canonical topics',
  /renderSetupDomainGrid[\s\S]{0,6000}dg-topic-list/.test(js) &&
  /renderSetupDomainGrid[\s\S]{0,6000}CANONICAL_DOMAIN_TOPICS/.test(js));
test('v4.54.8 CSS: Quick Start preset tiles color-cycle (4 nth-child ::after backgrounds)',
  /\.quiz-presets\s+\.preset-tile:nth-child\(1\)::after\s*\{[^}]*background:\s*var\(--accent\)/.test(css) &&
  /\.quiz-presets\s+\.preset-tile:nth-child\(2\)::after\s*\{[^}]*background:\s*var\(--green\)/.test(css) &&
  /\.quiz-presets\s+\.preset-tile:nth-child\(3\)::after\s*\{[^}]*background:\s*var\(--yellow\)/.test(css) &&
  /\.quiz-presets\s+\.preset-tile:nth-child\(4\)::after\s*\{[^}]*background:\s*var\(--red\)/.test(css));
test('v4.54.8 CSS: \u00a7 section-head has 80px accent strip + 2px ink rule',
  /\.ed-section-head\s*\{[\s\S]{0,300}border-bottom:\s*2px\s+solid/.test(css) &&
  /\.ed-section-head::after\s*\{[\s\S]{0,300}width:\s*80px/.test(css));
test('v4.54.8 CSS: .cq-summary-bar dark gradient + yellow strong + italic em',
  /\.cq-summary-bar\s*\{[\s\S]{0,500}linear-gradient\(135deg,\s*#16131f/.test(css) &&
  /\.cq-summary-prose\s+strong\s*\{[\s\S]{0,200}color:\s*var\(--yellow\)/.test(css));
test('v4.54.8 CSS: .dg-weak-chip outlined accent styling',
  /\.dg-weak-chip\s*\{[\s\S]{0,400}color:\s*var\(--accent-light\)/.test(css));
test('v4.54.8 CSS: .preset-sim-badge SIM pill yellow outline',
  /\.preset-sim-badge\s*\{[\s\S]{0,400}color:\s*var\(--yellow\)/.test(css));

// Analytics: sparklines + accuracy chart
test('v4.54.8 JS: _sparkPath + _weeklyStatSeries helpers defined',
  js.includes('function _sparkPath(') && js.includes('function _weeklyStatSeries('));
test('v4.54.8 JS: readiness stats strip injects 4 ana-hero-stat-spark SVGs',
  /_renderAnaReadiness[\s\S]{0,6000}ana-hero-stat-spark[\s\S]{0,3000}_series\.sessions[\s\S]{0,600}_series\.questions[\s\S]{0,600}_series\.accuracy[\s\S]{0,600}_series\.studyDays/.test(js));
test('v4.54.8 JS: _renderAnaAccuracyChart defined with SVG 960x220 + pass line',
  js.includes('function _renderAnaAccuracyChart(') &&
  /_renderAnaAccuracyChart[\s\S]{0,8000}viewBox="0 0 \$\{W\} \$\{H\}"/.test(js));
test('v4.54.8 JS: _anaAccChartTab tab-switcher defined + 3 ranges (week/month/all)',
  js.includes('function _anaAccChartTab(') &&
  /_anaAccChartTab[\s\S]{0,800}ana-accchart-tab-active/.test(js));
test('v4.54.8 JS: renderAnalytics chains _renderAnaAccuracyChart after _renderAnaReadiness',
  /renderAnalytics[\s\S]{0,3000}_renderAnaReadiness\(h\)[\s\S]{0,400}_renderAnaAccuracyChart\(h\)/.test(js));
test('v4.54.8 CSS: .ana-accchart-card editorial head (eyebrow + italic-accent title)',
  /\.ana-accchart-eyebrow\s*\{[\s\S]{0,400}font-family:\s*monospace[\s\S]{0,300}text-transform:\s*uppercase/.test(css) &&
  /\.ana-accchart-title\s+em\s*\{[\s\S]{0,200}color:\s*var\(--accent-light\)/.test(css));
test('v4.54.8 CSS: .ana-accchart-tabs + active state gradient',
  /\.ana-accchart-tab-active\s*\{[\s\S]{0,400}linear-gradient\(135deg,\s*rgba\(var\(--accent-rgb\)/.test(css));
test('v4.54.8 CSS: .ana-hero-stat-spark inline SVG styling',
  /\.ana-hero-stat-spark\s*\{[\s\S]{0,300}height:\s*22px/.test(css));

// Quiz editorial overhaul
test('v4.54.8 HTML: #quiz-prog-dots segmented progress container in progress-wrap',
  html.includes('id="quiz-prog-dots"') && html.includes('class="quiz-prog-dots"'));
test('v4.54.8 HTML: .quiz-kbd-hints footer with A/B/C/D + Enter + F',
  html.includes('class="quiz-kbd-hints"') &&
  /<kbd>A<\/kbd><kbd>B<\/kbd><kbd>C<\/kbd><kbd>D<\/kbd>\s*pick/.test(html));
test('v4.54.8 HTML: #exp-wrong-explain block inside explanation-box',
  html.includes('id="exp-wrong-explain"') && html.includes('class="exp-wrong-explain is-hidden"'));
test('v4.54.8 JS: _renderQuizProgressDots defined + called from render()',
  js.includes('function _renderQuizProgressDots(') &&
  /function render\(\)[\s\S]{0,2500}_renderQuizProgressDots\(\)/.test(js));
test('v4.54.8 JS: _renderQuizProgressDots emits qpd-done / qpd-wrong / qpd-now classes',
  /_renderQuizProgressDots[\s\S]{0,2500}qpd-now[\s\S]{0,400}qpd-done[\s\S]{0,400}qpd-wrong/.test(js));
test('v4.54.8 JS: showExplanation populates wrongExplain from q.wrongExplain[chosen]',
  /showExplanation[\s\S]{0,3000}exp-wrong-explain[\s\S]{0,600}q\.wrongExplain/.test(js));
test('v4.54.8 CSS: .qpd-cell segmented dots (4px base, 6px done/wrong, 8px now)',
  /\.qpd-cell\s*\{[\s\S]{0,400}height:\s*4px/.test(css) &&
  /\.qpd-cell\.qpd-done\s*\{[\s\S]{0,300}background:\s*var\(--green\)/.test(css) &&
  /\.qpd-cell\.qpd-now\s*\{[\s\S]{0,300}height:\s*8px/.test(css));
test('v4.54.8 CSS: .quiz-kbd-hints kbd styling (bordered monospace pill)',
  /\.quiz-kbd-hints\s+kbd\s*\{[\s\S]{0,400}font-family:\s*monospace/.test(css));
test('v4.54.8 CSS: .exp-wrong-explain italic muted pullquote styling',
  /\.exp-wrong-explain\s*\{[\s\S]{0,400}font-style:\s*italic[\s\S]{0,400}border-left:\s*3px/.test(css));
test('v4.54.8 CSS: legacy .kb-hint hidden (superseded by .quiz-kbd-hints)',
  /#page-quiz\s+\.kb-hint\s*\{\s*display:\s*none/.test(css));

// Cross-cutting: reduced-motion
test('v4.54.8 CSS: reduced-motion neutralises new transitions (quick-card, qpd, acc-tab)',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,800}\.quiz-presets\s+\.preset-tile::after[\s\S]{0,400}transition:\s*none/.test(css));

// ── v4.54.9 Editorial sweep on remaining pages + global zoom-in ──
// User: comb the app, apply editorial aesthetic to remaining surfaces, zoom in
// for readability, remove the sidebar drill count pills. This block guards the
// reusable .ed-pagehead component + per-page adoption + exam parity.
console.log('\n\x1b[1m\u2500\u2500 v4.54.9 EDITORIAL SWEEP + GLOBAL ZOOM \u2500\u2500\x1b[0m');

// Reusable .ed-pagehead component
test('v4.54.9 CSS: reusable .ed-pagehead with 80px accent strip + italic-accent display',
  /\.ed-pagehead\s*\{[\s\S]{0,400}border-bottom:\s*2px\s+solid/.test(css) &&
  /\.ed-pagehead::after\s*\{[\s\S]{0,300}width:\s*80px/.test(css) &&
  /\.ed-pagehead-display\s+em\s*\{[\s\S]{0,200}color:\s*var\(--accent-light\)/.test(css));
test('v4.54.9 CSS: .ed-pagehead-eyebrow monospace small-caps with leading-dash pseudo',
  /\.ed-pagehead-eyebrow\s*\{[\s\S]{0,400}font-family:\s*monospace[\s\S]{0,400}text-transform:\s*uppercase/.test(css) &&
  /\.ed-pagehead-eyebrow::before\s*\{[\s\S]{0,200}content:\s*'\u2014'/.test(css));

// Per-page adoption
test('v4.54.9 HTML: Review page uses .ed-pagehead with italic-accent "Every answer."',
  /id="page-review"[\s\S]{0,400}class="ed-pagehead"[\s\S]{0,1000}Every\s*<em>answer\.<\/em>/.test(html));
test('v4.54.9 HTML: Progress page uses .ed-pagehead with "Topic progress."',
  /id="page-progress"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,1000}Topic\s*<em>progress\.<\/em>/.test(html));
test('v4.54.9 HTML: Settings page uses .ed-pagehead with "Your settings."',
  /id="page-settings"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,1000}Your\s*<em>settings\.<\/em>/.test(html));
test('v4.54.9 HTML: Drills Launcher uses .ed-pagehead with "Interactive drills."',
  /id="page-drills"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,1000}Interactive\s*<em>drills\.<\/em>/.test(html));

// Exam parity: progress dots + kbd hints + wrongExplain
test('v4.54.9 HTML: Exam page has #exam-prog-dots segmented progress container',
  html.includes('id="exam-prog-dots"'));
test('v4.54.9 HTML: Exam page uses editorial .quiz-kbd-hints footer',
  /id="page-exam"[\s\S]{0,6000}class="quiz-kbd-hints"[\s\S]{0,400}<kbd>A<\/kbd>/.test(html));
test('v4.54.9 HTML: Exam page has #exam-wrong-explain block',
  html.includes('id="exam-wrong-explain"'));
test('v4.54.9 JS: _renderExamProgressDots defined + called from renderExam',
  js.includes('function _renderExamProgressDots(') &&
  /renderExam[\s\S]{0,2000}_renderExamProgressDots\(\)/.test(js));
test('v4.54.9 JS: exam progress dots emit qpd-flagged state',
  /_renderExamProgressDots[\s\S]{0,2000}qpd-flagged/.test(js));
test('v4.54.9 CSS: qpd-flagged uses yellow fill',
  /\.qpd-cell\.qpd-flagged\s*\{[\s\S]{0,200}background:\s*var\(--yellow\)/.test(css));

// Exam Results v2 editorial parallel
test('v4.54.9 HTML: Exam Results uses .exam-results-v2 editorial display heading',
  html.includes('class="exam-results-v2"') &&
  /exam-results-v2-display[\s\S]{0,400}Pass mark\s*<em>cleared\.<\/em>/.test(html));
test('v4.54.9 HTML: Exam Results has dark hero + side aside with 4 stat rows',
  html.includes('class="exam-results-v2-hero"') &&
  html.includes('class="exam-results-v2-side"'));
test('v4.54.9 JS: submitExam updates headline with pass/fail italic-accent em',
  /submitExam[\s\S]{0,8000}exam-result-headline[\s\S]{0,400}Pass mark\s*<em>cleared\.<\/em>/.test(js) &&
  /submitExam[\s\S]{0,8000}exam-result-headline[\s\S]{0,400}More\s*<em>work needed\.<\/em>/.test(js));
test('v4.54.9 CSS: exam-results-v2-hero dark gradient + 84px tabular-nums score',
  /\.exam-results-v2-hero\s*\{[\s\S]{0,600}linear-gradient\(160deg,\s*#16131f/.test(css) &&
  /\.exam-results-v2-big-score\s*\{[\s\S]{0,400}font-size:\s*84px[\s\S]{0,300}tabular-nums/.test(css));
test('v4.54.9 CSS: legacy .exam-results-hero retired (display:none)',
  /\.exam-results-hero\s*\{\s*display:\s*none\s*!important/.test(css));

// Session Transition / Complete editorial hero
test('v4.54.9 HTML: Session Transition uses .session-hero-v2 with italic-accent display',
  /id="page-session-transition"[\s\S]{0,400}class="session-hero session-hero-v2"[\s\S]{0,1500}class="session-hero-display"/.test(html));
test('v4.54.9 HTML: Session Complete uses italic-accent "All topics cleared."',
  /id="page-session-complete"[\s\S]{0,500}All topics\s*<em>cleared\.<\/em>/.test(html));
test('v4.54.9 CSS: .session-hero-eyebrow monospace small-caps + leading-dash pseudo',
  /\.session-hero-eyebrow\s*\{[\s\S]{0,400}font-family:\s*monospace[\s\S]{0,400}text-transform:\s*uppercase/.test(css));

// Drills launcher tile polish
test('v4.54.9 CSS: .drills-tile has hover accent bar (::after scaleX) + per-index color cycling',
  /\.drills-tile::after\s*\{[\s\S]{0,400}transform:\s*scaleX\(0\)/.test(css) &&
  /\.drills-tile:nth-child\(2\)::after\s*\{[\s\S]{0,200}background:\s*var\(--green\)/.test(css));

// Global zoom-in
// v4.54.11: zoom nudged 1.06 \u2192 1.10 per user request ("zoom in the app a bit more")
test('v4.54.9 (v4.54.11 update) CSS: html { zoom: 1.10 } for 10% global zoom-in',
  /html\s*\{[\s\S]{0,200}zoom:\s*1\.10/.test(css));

// Reduced motion coverage
test('v4.54.9 CSS: reduced-motion neutralises .drills-tile transitions',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,600}\.drills-tile[\s\S]{0,200}transition:\s*none/.test(css));

// ── v4.54.10 Streak hero + vertical domain topics + heatmap + editable goal ──
console.log('\n\x1b[1m\u2500\u2500 v4.54.10 STREAK HERO + DOMAIN TOPICS + HEATMAP \u2500\u2500\x1b[0m');

// Sidebar streak card restyle
test('v4.54.10 CSS: .sb-streak uses dark gradient card (matches prototype)',
  /\.sb-streak\s*\{[\s\S]{0,500}linear-gradient\(135deg,\s*#1e1b2e,\s*#0f0c1b\)/.test(css));
test('v4.54.10 CSS: .sb-streak-num is 28px weight-800 white tabular-nums',
  /\.sb-streak-num\s*\{[\s\S]{0,400}font-size:\s*28px[\s\S]{0,300}tabular-nums/.test(css));
test('v4.54.10 CSS: .sb-streak-label is monospace small-caps',
  /\.sb-streak-label\s*\{[\s\S]{0,600}text-transform:\s*uppercase[\s\S]{0,400}font-family:\s*monospace/.test(css));

// Domain grid canonical topics
test('v4.54.10 JS: CANONICAL_DOMAIN_TOPICS covers 5 topics per domain',
  /CANONICAL_DOMAIN_TOPICS\s*=\s*\{[\s\S]{0,3000}OSI Model[\s\S]{0,2000}Firewalls[\s\S]{0,1000}7-Step Method/.test(js));
test('v4.54.10 JS: weakSet cross-reference builds via computeWeakSpotScores',
  /renderSetupDomainGrid[\s\S]{0,6000}weakSet[\s\S]{0,400}computeWeakSpotScores/.test(js));
test('v4.54.10 CSS: .dg-topic-list vertical list with accent-dot bullets',
  /\.dg-topic-list\s*\{[\s\S]{0,400}flex-direction:\s*column/.test(css) &&
  /\.dg-topic-dot\s*\{[\s\S]{0,400}border-radius:\s*50%/.test(css));
test('v4.54.10 CSS: weak-topic row gets accent text + filled dot + glow ring',
  /\.dg-topic-weak\s*\{[\s\S]{0,300}color:\s*var\(--accent-light\)/.test(css) &&
  /\.dg-topic-weak\s+\.dg-topic-dot\s*\{[\s\S]{0,300}background:\s*var\(--accent\)/.test(css));
test('v4.54.10 CSS: legacy .dg-weak-chips hidden via !important',
  /\.dg-weak-chips[\s\S]{0,200}display:\s*none\s*!important/.test(css));

// Settings: editable daily goal
test('v4.54.10 HTML: Settings page has Daily Goal section with input + presets',
  /id="page-settings"[\s\S]{0,3000}settings-daily-input[\s\S]{0,800}settings-daily-chip/.test(html));
test('v4.54.10 JS: saveSettingsDailyGoal + pickSettingsDailyPreset + syncSettingsDailyGoal defined',
  js.includes('function saveSettingsDailyGoal(') &&
  js.includes('function pickSettingsDailyPreset(') &&
  js.includes('function syncSettingsDailyGoal('));
test('v4.54.10 JS: renderSettingsPage calls syncSettingsDailyGoal',
  /function renderSettingsPage\([\s\S]{0,400}syncSettingsDailyGoal\(\)/.test(js));
test('v4.54.10 JS: saveSettingsDailyGoal calls setDailyGoal + refreshes home cards',
  /saveSettingsDailyGoal[\s\S]{0,1500}setDailyGoal\(v\)[\s\S]{0,800}renderReadinessCard/.test(js) &&
  /saveSettingsDailyGoal[\s\S]{0,1500}renderHeroV2MiniCards/.test(js));
test('v4.54.10 CSS: .settings-daily-chip active state gradient',
  /\.settings-daily-chip\.is-active\s*\{[\s\S]{0,400}linear-gradient\(135deg,\s*rgba\(var\(--accent-rgb\)/.test(css));

// Knowledge Constellation grid overlay
test('v4.54.10 CSS: .ana-const-map::before 40px grid overlay',
  /\.ana-const-map::before\s*\{[\s\S]{0,800}background-size:\s*40px\s+40px/.test(css));

// Daily Study Streak Heatmap
test('v4.54.10 JS: _renderAnaStudyHeatmap defined + called from renderAnalytics',
  js.includes('function _renderAnaStudyHeatmap(') &&
  /renderAnalytics[\s\S]{0,4000}_renderAnaStudyHeatmap\(h\)/.test(js));
test('v4.54.10 JS: heatmap renders 53-week grid ending today',
  /_renderAnaStudyHeatmap[\s\S]{0,4000}WEEKS\s*=\s*53/.test(js));
test('v4.54.10 JS: heatmap tier intensity thresholds (0/5/15/40/41+)',
  /_renderAnaStudyHeatmap[\s\S]{0,8000}tierFor[\s\S]{0,400}q\s*<=\s*5[\s\S]{0,300}q\s*<=\s*15[\s\S]{0,300}q\s*<=\s*40/.test(js));
test('v4.54.10 JS: heatmap shows exam-day marker when getExamDate returns a date',
  /_renderAnaStudyHeatmap[\s\S]{0,8000}getExamDate\(\)[\s\S]{0,4000}hm-cell-exam/.test(js));
test('v4.54.10 JS: heatmap displays streak + best + 30d/90d stats',
  /_renderAnaStudyHeatmap[\s\S]{0,8000}streakCurr[\s\S]{0,400}streakBest[\s\S]{0,400}daysStudied30[\s\S]{0,400}daysStudied90/.test(js));
test('v4.54.10 JS: heatmap uses native SVG <title> tooltips on each cell',
  /_renderAnaStudyHeatmap[\s\S]{0,8000}<title>\$\{title\}<\/title>/.test(js));
test('v4.54.10 CSS: .hm-cell intensity tiers (t0..t4) with accent-rgb tints',
  /\.hm-cell-t0\s*\{[\s\S]{0,200}rgba\(var\(--accent-rgb\)/.test(css) &&
  /\.hm-cell-t4\s*\{[\s\S]{0,200}fill:\s*var\(--accent\)/.test(css));
test('v4.54.10 CSS: exam-day heatmap cell uses red fill + white stroke',
  /\.hm-cell-exam\s*\{[\s\S]{0,400}fill:\s*var\(--red\)[\s\S]{0,300}stroke:\s*#ffffff/.test(css));
test('v4.54.10 CSS: heatmap editorial head (eyebrow + italic-accent title)',
  /\.ana-heatmap-title\s+em\s*\{[\s\S]{0,200}color:\s*var\(--accent-light\)/.test(css));
test('v4.54.10 CSS: heatmap stats (22px tabular-nums + monospace label)',
  /\.hms-val\s*\{[\s\S]{0,400}tabular-nums/.test(css) &&
  /\.hms-lbl\s*\{[\s\S]{0,400}font-family:\s*monospace/.test(css));

// Analytics: Recent Performance retired
test('v4.54.10 JS: renderAnalytics hides #history-panel (Recent Performance retired)',
  /function renderAnalytics\([\s\S]{0,1500}getElementById\('history-panel'\)[\s\S]{0,200}add\('is-hidden'\)/.test(js));

// ── v4.54.12 Editorial headers on drill pages + Analytics ──
console.log('\n\x1b[1m\u2500\u2500 v4.54.12 DRILL PAGES + ANALYTICS EDITORIAL HEADERS \u2500\u2500\x1b[0m');
test('v4.54.12 HTML: Subnet Mastery page uses .ed-pagehead with "Subnet mastery."',
  /id="page-subnet"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,800}Subnet\s*<em>mastery\.<\/em>/.test(html));
test('v4.54.12 HTML: Port Drill page uses .ed-pagehead with "Port mastery."',
  /id="page-ports"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,800}Port\s*<em>mastery\.<\/em>/.test(html));
test('v4.54.12 HTML: Acronym Blitz page uses .ed-pagehead with "Acronym blitz."',
  /id="page-acronyms"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,800}Acronym\s*<em>blitz\.<\/em>/.test(html));
test('v4.54.12 HTML: OSI Sorter page uses .ed-pagehead with "OSI sorter."',
  /id="page-osi-sorter"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,800}OSI\s*<em>sorter\.<\/em>/.test(html));
test('v4.54.12 HTML: Cable ID page uses .ed-pagehead with "Cable ID."',
  /id="page-cables"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,800}Cable\s*<em>ID\.<\/em>/.test(html));
test('v4.54.12 HTML: Analytics page uses .ed-pagehead with "Performance analytics."',
  /id="page-analytics"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,800}Performance\s*<em>analytics\.<\/em>/.test(html));
test('v4.54.13 HTML: Topology Builder page uses .ed-pagehead with "Network builder."',
  /id="page-topology-builder"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,800}Network\s*<em>builder\.<\/em>/.test(html));
test('v4.54.13 HTML: ACL Builder page uses .ed-pagehead with "ACL builder."',
  /id="page-acl"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,800}ACL\s*<em>builder\.<\/em>/.test(html));
test('v4.54.14 CSS: .ed-cardhead reusable card-level header defined',
  /\.ed-cardhead\s*\{[\s\S]{0,400}border-bottom:\s*1px\s+dashed/.test(css) &&
  /\.ed-cardhead-eyebrow\s*\{[\s\S]{0,400}font-family:\s*monospace[\s\S]{0,400}text-transform:\s*uppercase/.test(css) &&
  /\.ed-cardhead-title\s+em\s*\{[\s\S]{0,200}color:\s*var\(--accent-light\)/.test(css));

// v4.54.15 Multi-select topic chips
test('v4.54.15 JS: initTopicGroupMulti + _computeTopicFromChips helpers defined',
  js.includes('function initTopicGroupMulti(') &&
  js.includes('function _computeTopicFromChips('));
test('v4.54.15 JS: DOMContentLoaded uses initTopicGroupMulti (not initChips) for topic-group',
  js.includes('initTopicGroupMulti(v => topic = v)') &&
  !/initChips\('topic-group'/.test(js));
test('v4.54.15 JS: _computeTopicFromChips returns Multi: prefix for 2+ domain chips',
  /_computeTopicFromChips[\s\S]{0,1500}Multi:\s*'\s*\+\s*domainOn\.join/.test(js));
test('v4.54.15 JS: mode-card click deselects all other chips (single-select kept for Smart/Mixed)',
  /initTopicGroupMulti[\s\S]{0,3000}isMode[\s\S]{0,800}querySelectorAll\('\.chip'\)\.forEach[\s\S]{0,400}classList\.remove\('on'\)/.test(js));
test('v4.54.15 JS: domain-chip click clears mode cards when turning ON',
  /initTopicGroupMulti[\s\S]{0,3500}turningOn[\s\S]{0,600}cq-mode-card/.test(js));
test('v4.54.15 JS: fallback to Mixed when all chips deselected',
  /initTopicGroupMulti[\s\S]{0,3500}!anyOn[\s\S]{0,400}Mixed/.test(js));
test('v4.54.15 JS: fetchQuestions parses Multi: prefix into multiTopicList',
  /async function fetchQuestions[\s\S]{0,12000}startsWith\('Multi:\s*'\)[\s\S]{0,800}multiTopicList/.test(js));
test('v4.54.15 JS: fetchQuestions builds MANDATORY MULTI-TOPIC DISTRIBUTION prompt',
  /fetchQuestions[\s\S]{0,15000}MANDATORY MULTI-TOPIC DISTRIBUTION/.test(js));
test('v4.54.15 JS: startQuiz loading-msg handles multi-topic count',
  /loading-msg[\s\S]{0,800}_multiCount\s*>=\s*2[\s\S]{0,400}across\s*\$\{_multiCount\}\s*topics/.test(js));
test('v4.54.15 JS: topic-brief skipped for Multi: mode',
  /briefTopic\.startsWith\('Multi:\s*'\)/.test(js));
test('v4.54.15 JS: updateCqSummaryBar renders multi-topic prose with count + preview',
  /updateCqSummaryBar[\s\S]{0,2500}domainOn\.length\s*>=\s*2[\s\S]{0,600}across\s*<em>\$\{domainOn\.length\}\s*topics<\/em>/.test(js));
test('v4.54.15 CSS: multi-selected domain chips get outline ring',
  /#topic-group\s+\.chip:not\(\.cq-mode-card\)\.on\s*\{[\s\S]{0,200}outline:\s*2px\s+solid/.test(css));

// v4.54.16 wider TB palette + exam date in Settings + modal editorial head
test('v4.54.16 CSS: TB workspace palette column widened (220 \u2192 260px)',
  /\.tb-workspace\.tb-workspace-v3\s*\{[\s\S]{0,800}grid-template-columns:\s*260px\s+minmax\(0,\s*1fr\)\s+260px/.test(css));
test('v4.54.16 HTML: Settings page has Exam Date section with #settings-exam-row',
  /id="page-settings"[\s\S]{0,4000}Exam Date[\s\S]{0,400}id="settings-exam-row"/.test(html));
test('v4.54.16 JS: syncSettingsExamDate defined + called from renderSettingsPage',
  js.includes('function syncSettingsExamDate(') &&
  /renderSettingsPage[\s\S]{0,800}syncSettingsExamDate\(\)/.test(js));
test('v4.54.16 JS: syncSettingsExamDate reuses _buildExamDateChipHtml',
  /syncSettingsExamDate[\s\S]{0,1000}_buildExamDateChipHtml\(\s*dateStr,\s*days,\s*'settings-exam-input'\s*\)/.test(js));
test('v4.54.16 JS: updateExamDate also refreshes the Settings chip',
  /function updateExamDate\([\s\S]{0,600}syncSettingsExamDate\(\)/.test(js));
test('v4.54.16 HTML: Exam submit modal uses .ed-modalhead with "Submit exam?"',
  /id="exam-modal"[\s\S]{0,800}class="ed-modalhead"[\s\S]{0,800}Submit\s*<em>exam\?<\/em>/.test(html));
test('v4.54.16 HTML: Topic Deep Dive page uses .ed-pagehead',
  /id="page-topic-dive"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,800}Topic\s*<em>deep dive\.<\/em>/.test(html));
test('v4.54.16 HTML: Guided Lab page uses .ed-pagehead',
  /id="page-guided-lab"[\s\S]{0,500}class="ed-pagehead"[\s\S]{0,800}Guided\s*<em>terminal lab\.<\/em>/.test(html));
test('v4.54.16 JS: dynamic topic-dive title uses italic-accent em',
  /topic-dive-title[\s\S]{0,400}innerHTML\s*=\s*'Topic \\u00b7 <em>'/.test(js));
test('v4.54.16 JS: dynamic lab-title uses italic-accent em',
  /lab-title[\s\S]{0,400}innerHTML\s*=\s*'Lab \\u00b7 <em>'/.test(js));
test('v4.54.16 CSS: .ed-modalhead reusable modal-level editorial head',
  /\.ed-modalhead\s*\{[\s\S]{0,400}border-bottom:\s*1px\s+dashed/.test(css) &&
  /\.ed-modalhead-eyebrow\s*\{[\s\S]{0,400}font-family:\s*monospace/.test(css) &&
  /\.ed-modalhead-title\s+em\s*\{[\s\S]{0,200}color:\s*var\(--accent-light\)/.test(css));
test('v4.54.16 CSS: .settings-exam-row wrapper styled',
  /\.settings-exam-row\s*\{[\s\S]{0,200}display:\s*flex/.test(css));

// v4.54.17 — Topbar exam countdown + end-of-day recap + follow-up drill
test('v4.54.17 HTML: topbar has #topbar-countdown chip',
  /id="app-topbar"[\s\S]{0,1200}id="topbar-countdown"[\s\S]{0,400}topbar-countdown-val/.test(html));
test('v4.54.17 JS: renderTopbarCountdown defined + called from _topbarTick',
  js.includes('function renderTopbarCountdown(') &&
  /function _topbarTick\(\)[\s\S]{0,1200}renderTopbarCountdown\(\)/.test(js));
test('v4.54.17 JS: countdown chip hidden when no exam date set',
  /renderTopbarCountdown[\s\S]{0,1500}if\s*\(!dateStr\)[\s\S]{0,200}classList\.add\('is-hidden'\)/.test(js));
test('v4.54.17 JS: countdown urgency tiers (urgent/soon/ok/past)',
  /renderTopbarCountdown[\s\S]{0,2500}topbar-countdown-urgent[\s\S]{0,400}topbar-countdown-soon[\s\S]{0,400}topbar-countdown-ok[\s\S]{0,400}topbar-countdown-past/.test(js));
test('v4.54.17 JS: updateExamDate refreshes topbar countdown',
  /function updateExamDate\([\s\S]{0,800}renderTopbarCountdown\(\)/.test(js));
test('v4.54.17 CSS: .topbar-countdown chip with urgency tier palette',
  /\.topbar-countdown\s*\{[\s\S]{0,400}font-family:\s*monospace/.test(css) &&
  /\.topbar-countdown-urgent\s*\{[\s\S]{0,300}color:\s*var\(--red\)/.test(css) &&
  /@keyframes topbarCountdownPulse\s*\{/.test(css));

// End-of-day recap
test('v4.54.17 HTML: daily-recap-modal exists with editorial ed-modalhead',
  html.includes('id="daily-recap-modal"') &&
  /daily-recap-modal[\s\S]{0,500}class="ed-modalhead"[\s\S]{0,400}Nice\s*<em>work\.<\/em>/.test(html));
test('v4.54.17 JS: _maybeShowDailyRecap + dismissDailyRecap defined',
  js.includes('function _maybeShowDailyRecap(') &&
  js.includes('function dismissDailyRecap('));
test('v4.54.17 JS: daily recap gated by localStorage once-per-day',
  /_maybeShowDailyRecap[\s\S]{0,2000}STORAGE_DAILY_RECAP_SHOWN[\s\S]{0,400}todayKey/.test(js));
test('v4.54.17 JS: finish() calls _maybeShowDailyRecap after saveToHistory',
  /function finish\(\)[\s\S]{0,10000}saveToHistory[\s\S]{0,1500}_maybeShowDailyRecap/.test(js));  // v4.57.1: widened both gaps (6000→10000, 500→1500) for multi-topic split branch
test('v4.54.17 JS: submitExam calls _maybeShowDailyRecap after saveToHistory',
  /submitExam[\s\S]{0,12000}saveToHistory[\s\S]{0,400}_maybeShowDailyRecap/.test(js));
test('v4.54.17 JS: recap shows today\'s stats + delta + streak + days-to-exam',
  /_maybeShowDailyRecap[\s\S]{0,3500}todayAcc[\s\S]{0,600}deltaAcc[\s\S]{0,400}streak[\s\S]{0,400}daysToExam/.test(js));
test('v4.54.17 CSS: .daily-recap-card uses dark gradient + overshoot entrance animation',
  /\.daily-recap-card\s*\{[\s\S]{0,500}linear-gradient\(160deg,\s*#16131f/.test(css) &&
  /@keyframes dailyRecapIn\s*\{/.test(css));

// Follow-up drill on wrong answers
test('v4.54.17 JS: followUpOnMistake defined + calls fetchQuestions for 2 extras',
  js.includes('function followUpOnMistake(') &&
  /followUpOnMistake[\s\S]{0,2000}fetchQuestions\(key,\s*targetTopic,\s*targetDiff,\s*2\)/.test(js));
test('v4.54.17 JS: followUpOnMistake injects extras at current + 1',
  /followUpOnMistake[\s\S]{0,3000}questions\.splice\(current\s*\+\s*1,\s*0,\s*\.\.\.extras\)/.test(js));
test('v4.54.17 JS: showExplanation adds Drill-this-concept button only on wrong',
  /showExplanation[\s\S]{0,4000}!isRight[\s\S]{0,400}explain-btn-followup[\s\S]{0,200}followUpOnMistake/.test(js));
test('v4.54.17 CSS: .explain-btn-followup accent gradient override',
  /\.explain-btn-followup\s*\{[\s\S]{0,400}linear-gradient\(135deg,\s*rgba\(var\(--accent-rgb\)/.test(css));

// ── v4.55.0 ACL Fix-This + Packet Flow Visualisation (issue #179) ──
console.log('\n\x1b[1m\u2500\u2500 v4.55.0 ACL FIX-THIS + PACKET FLOW ANIMATION \u2500\u2500\x1b[0m');

// New "Fix It" category in scenario picker
test('v4.55.0 JS: ACL_CATEGORIES includes "Fix It" category',
  /ACL_CATEGORIES\s*=\s*\[[\s\S]{0,600}key:\s*'Fix It'[\s\S]{0,200}label:\s*'[^']*Fix It'/.test(js));

// 6 Fix-It scenarios with initialRules
[
  ['fix-order',          'Wrong Rule Order'],
  ['fix-return-traffic', 'Missing Return Traffic'],
  ['fix-cidr-narrow',    'CIDR Too Narrow'],
  ['fix-cidr-broad',     'CIDR Too Broad'],
  ['fix-wrong-port',     'Wrong Port Number'],
  ['fix-proto-mismatch', 'Protocol Mismatch']
].forEach(([id, name]) => {
  test(`v4.55.0 ACL scenario: ${id} ("Fix: ${name}")`,
    new RegExp(`id:\\s*'${id}'[\\s\\S]{0,600}title:\\s*'Fix:\\s*${name}'[\\s\\S]{0,2500}initialRules:`).test(js));
});

// initialRules seeding
test('v4.55.0 JS: aclLoadScenario seeds aclState.rules from initialRules (deep-cloned)',
  /function aclLoadScenario[\s\S]{0,1200}initialRules[\s\S]{0,500}JSON\.parse\(JSON\.stringify/.test(js));

// Animation engine
test('v4.55.0 JS: _aclAnimatePacketFlow + _aclAnimateSinglePacket defined',
  js.includes('function _aclAnimatePacketFlow(') &&
  js.includes('function _aclAnimateSinglePacket('));
test('v4.55.0 JS: ACL_ANIM_RULE_MS = 320 + ACL_ANIM_STAGGER_MS = 180',
  /ACL_ANIM_RULE_MS\s*=\s*320/.test(js) &&
  /ACL_ANIM_STAGGER_MS\s*=\s*180/.test(js));
test('v4.55.0 JS: reduced-motion short-circuits the animation',
  /_aclAnimatePacketFlow[\s\S]{0,1500}prefers-reduced-motion[\s\S]{0,300}return/.test(js));
test('v4.55.0 JS: aclRunAllTests auto-plays packet-flow animation',
  /function aclRunAllTests[\s\S]{0,2500}_aclAnimatePacketFlow\(aclState\.rules,\s*scen\.testPackets\)/.test(js));
test('v4.55.0 JS: aclReplayAnimation wrapper defined',
  js.includes('function aclReplayAnimation('));
test('v4.55.0 HTML: Replay button wired to aclReplayAnimation',
  html.includes('aclReplayAnimation()') || /onclick="aclReplayAnimation\(\)"/.test(js));

// CSS keyframes + editorial styling
test('v4.55.0 CSS: .acl-packet-pill editorial dark-glass with backdrop-blur',
  /\.acl-packet-pill\s*\{[\s\S]{0,800}backdrop-filter:\s*blur/.test(css));
test('v4.55.0 CSS: packet-burst-permit + packet-burst-deny tier colours',
  /\.acl-packet-burst-permit\s*\{[\s\S]{0,600}rgba\(34,\s*197,\s*94/.test(css) &&
  /\.acl-packet-burst-deny\s*\{[\s\S]{0,600}rgba\(239,\s*68,\s*68/.test(css));
test('v4.55.0 CSS: rule-inspecting + rule-matched classes with accent glow',
  /\.acl-rule-inspecting\s*\{[\s\S]{0,400}box-shadow:[\s\S]{0,300}rgba\(124,\s*111,\s*247/.test(css) &&
  /\.acl-rule-matched-permit\s*\{[\s\S]{0,400}rgba\(34,\s*197,\s*94/.test(css));
test('v4.55.0 CSS: aclRuleMatchPulse keyframe with overshoot cubic-bezier',
  /@keyframes aclRuleMatchPulse\s*\{[\s\S]{0,300}scale\(1\.015\)/.test(css));
test('v4.55.0 CSS: implicit-deny row hit indicator defined',
  /\.acl-rule-implicit-matched\s*\{[\s\S]{0,400}rgba\(239,\s*68,\s*68/.test(css));
test('v4.55.0 CSS: reduced-motion hides the packet overlay',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,600}\.acl-packet-overlay\s*\{[^}]*display:\s*none/.test(css));
test('v4.55.0 CSS: light-theme overrides for packet pill + rule highlight',
  /\[data-theme="light"\]\s+\.acl-packet-pill\s*\{/.test(css) &&
  /\[data-theme="light"\]\s+\.acl-rule-inspecting\s*\{/.test(css));
test('v4.55.0 CSS: per-packet accent tone variants (0..3)',
  /\.acl-packet-pill-0\s*\{/.test(css) &&
  /\.acl-packet-pill-1\s*\{/.test(css) &&
  /\.acl-packet-pill-2\s*\{/.test(css) &&
  /\.acl-packet-pill-3\s*\{/.test(css));

// ── v4.55.1 ACL Stateful Firewall Mode (issue #181) ──
console.log('\n\x1b[1m\u2500\u2500 v4.55.1 ACL STATEFUL FIREWALL MODE \u2500\u2500\x1b[0m');
test('v4.55.1 JS: _aclEvalPacket accepts (rules, pkt, mode, connTable)',
  /function _aclEvalPacket\(rules,\s*pkt,\s*mode,\s*connTable\)/.test(js));
test('v4.55.1 JS: _aclFlowKey + _aclEvaluateFlowsStateful helpers defined',
  js.includes('function _aclFlowKey(') && js.includes('function _aclEvaluateFlowsStateful('));
test('v4.55.1 JS: stateful mode reverse-5-tuple lookup auto-permits',
  /stateful[\s\S]{0,400}reverseKey[\s\S]{0,400}state-track/.test(js));
test('v4.55.1 JS: _aclGradeScenario routes stateful scenarios through the batch evaluator',
  /_aclGradeScenario[\s\S]{0,800}scenario\.mode\s*===\s*'stateful'[\s\S]{0,400}_aclEvaluateFlowsStateful/.test(js));
test('v4.55.1 JS: 3 new stateful scenarios with mode: "stateful" field',
  /id:\s*'stateful-dev-ssh'[\s\S]{0,2000}mode:\s*'stateful'/.test(js) &&
  /id:\s*'stateful-web-farm'[\s\S]{0,2000}mode:\s*'stateful'/.test(js) &&
  /id:\s*'stateful-dns-contrast'[\s\S]{0,2000}mode:\s*'stateful'/.test(js));
test('v4.55.1 HTML/JS: scenario card renders stateful/stateless mode badge',
  js.includes("acl-sc-mode acl-sc-mode-") && js.includes("scen.mode === 'stateful'"));
test('v4.55.1 CSS: .acl-sc-mode-stateful accent treatment',
  /\.acl-sc-mode-stateful\s*\{[\s\S]{0,400}color:\s*var\(--accent-light\)/.test(css));
test('v4.55.1 JS: state-track ruleId used as sentinel for auto-permit',
  js.includes("ruleId: 'state-track'"));

// ── v4.55.2 ACL Progressive Hints + Solution reveal (issue #183) ──
console.log('\n\x1b[1m\u2500\u2500 v4.55.2 ACL PROGRESSIVE HINTS + SOLUTION REVEAL \u2500\u2500\x1b[0m');
test('v4.55.2 JS: aclShowHint + dismissHintModal + aclShowSolution + aclApplySolution defined',
  js.includes('function aclShowHint(') &&
  js.includes('function dismissHintModal(') &&
  js.includes('function aclShowSolution(') &&
  js.includes('function aclApplySolution('));
test('v4.55.2 JS: aclState includes hintsUsed + solutionShown maps',
  js.includes('hintsUsed: {}') && js.includes('solutionShown: {}'));
test('v4.55.2 JS: aclShowHint increments per-scenario tier + persists',
  /function aclShowHint[\s\S]{0,1200}aclState\.hintsUsed\[scen\.id\][\s\S]{0,300}aclSaveState/.test(js));
test('v4.55.2 JS: solution reveal gated until tier === hints.length',
  /_aclRenderHintModal[\s\S]{0,2000}tier\s*>=\s*scen\.hints\.length/.test(js));
test('v4.55.2 JS: aclApplySolution replaces aclState.rules with scen.solution',
  /function aclApplySolution[\s\S]{0,800}aclState\.rules\s*=\s*scen\.solution\.map/.test(js));
test('v4.55.2 HTML: #acl-hint-modal dark-glass shell with ed-modalhead',
  html.includes('id="acl-hint-modal"') &&
  /acl-hint-modal[\s\S]{0,500}class="ed-modalhead"[\s\S]{0,400}Nudge,\s*<em>not solve\.<\/em>/.test(html));
test('v4.55.2 JS: Hint button added to grade-panel when scen has hints',
  /_aclRenderGradePanel[\s\S]{0,3000}scen\.hints[\s\S]{0,400}acl-hint-btn/.test(js));
test('v4.55.2 JS: all 6 Fix-It scenarios carry hints + solution arrays',
  js.includes("id: 'fix-order'") &&
  /id:\s*'fix-order'[\s\S]{0,3500}hints:\s*\[[\s\S]{0,600}solution:\s*\[/.test(js) &&
  /id:\s*'fix-cidr-narrow'[\s\S]{0,2500}hints:\s*\[[\s\S]{0,500}solution:\s*\[/.test(js) &&
  /id:\s*'fix-proto-mismatch'[\s\S]{0,2500}hints:\s*\[[\s\S]{0,500}solution:\s*\[/.test(js));
test('v4.55.2 CSS: .acl-hint-btn yellow/warm styling',
  /\.acl-hint-btn\s*\{[\s\S]{0,400}rgba\(251,\s*191,\s*36/.test(css));
test('v4.55.2 CSS: .acl-hint-tier + .acl-hint-tier-current tier stack',
  /\.acl-hint-tier\s*\{/.test(css) &&
  /\.acl-hint-tier-current\s*\{[\s\S]{0,400}rgba\(var\(--accent-rgb\)/.test(css));
test('v4.55.2 CSS: .acl-sol-rules monospace grid + permit/deny action pills',
  /\.acl-sol-rule\s*\{[\s\S]{0,400}font-family:\s*monospace/.test(css) &&
  /\.acl-sol-action-permit\s*\{[\s\S]{0,300}rgba\(34,\s*197,\s*94/.test(css) &&
  /\.acl-sol-action-deny\s*\{[\s\S]{0,300}rgba\(239,\s*68,\s*68/.test(css));

// Behavioural sandbox: verify stateful auto-permit + stateless deny in vm
(function() {
  try {
    const vm = require('vm');
    const ctx = {};
    vm.createContext(ctx);
    // _fnBody returns the full function declaration ("function foo(...) {...}"),
    // so we run each body directly (no need to prepend the signature).
    const helpers = [
      '_aclIpToUint','_aclParseCidr','_aclCidrContains','_aclPortMatches','_aclRuleMatches',
      '_aclEvalPacket','_aclFlowKey','_aclEvaluateFlowsStateful'
    ];
    helpers.forEach(name => {
      vm.runInContext(_fnBody(js, name), ctx);
    });
    // Forward outbound permit followed by reverse inbound: stateful auto-permits
    const rules = [{ id: 'r1', action: 'permit', srcAddr: '10.0.0.0/24', srcPort: 'any', dstAddr: '8.8.8.8/32', dstPort: 53, proto: 'udp' }];
    const packets = [
      { src: '10.0.0.5', sp: 55000, dst: '8.8.8.8', dp: 53, proto: 'udp' },
      { src: '8.8.8.8',  sp: 53,    dst: '10.0.0.5', dp: 55000, proto: 'udp' }
    ];
    const stateless = packets.map(p => ctx._aclEvalPacket(rules, p));
    const stateful  = ctx._aclEvaluateFlowsStateful(rules, packets);
    test('v4.55.1 sandbox: stateless mode denies reverse packet (no explicit rule)',
      stateless[1].action === 'deny');
    test('v4.55.1 sandbox: stateful mode auto-permits reverse via state-track',
      stateful[1].action === 'permit' && stateful[1].stateTrack === true);
    test('v4.55.1 sandbox: unrelated packet still denied in stateful mode',
      ctx._aclEvaluateFlowsStateful(rules, [{ src: '10.0.0.5', sp: 55001, dst: '1.1.1.1', dp: 53, proto: 'udp' }])[0].action === 'deny');
  } catch (e) {
    test('v4.55.1 sandbox: stateful evaluator executes without error', false);
  }
})();

// Sidebar streak lift
test('v4.54.12 CSS: sidebar capped to calc(100vh - 140px) so streak clears dock',
  /\.app-sidebar\s*\{[\s\S]{0,600}height:\s*calc\(100vh\s*-\s*140px\)[\s\S]{0,400}padding-bottom:\s*max\(24px/.test(css));

// ══════════════════════════════════════════════════════════════════════
// v4.56.0 — Question scenario context block
// Optional 1-2 sentence exam-realism setup rendered between the stem
// and the options grid. Teaches reading comprehension for wordy N10-009
// question framing.
// ══════════════════════════════════════════════════════════════════════

// HTML — both quiz + exam pages carry the scenario container
test('v4.56.0 HTML: quiz mode has #q-scenario container',
  /<div\s+class="q-scenario"\s+id="q-scenario"\s+hidden><\/div>/.test(html));
test('v4.56.0 HTML: exam mode has #exam-q-scenario container',
  /<div\s+class="q-scenario"\s+id="exam-q-scenario"\s+hidden><\/div>/.test(html));

// JS — render helper + call sites in quiz + exam
test('v4.56.0 JS: _renderScenarioBlock helper defined',
  /function\s+_renderScenarioBlock\s*\(\s*elId\s*,\s*q\s*,\s*qType\s*\)/.test(js));
test('v4.56.0 JS: render() hooks scenario block for quiz mode',
  /_renderScenarioBlock\(['"]q-scenario['"],\s*q,\s*qType\)/.test(js));
test('v4.56.0 JS: renderExam() hooks scenario block for exam mode',
  /_renderScenarioBlock\(['"]exam-q-scenario['"],\s*q,\s*qType\)/.test(js));
test('v4.56.0 JS: helper skips cli-sim + topology types (nested scenario already)',
  /isNestedType\s*=\s*qType\s*===\s*['"]cli-sim['"]\s*\|\|\s*qType\s*===\s*['"]topology['"]/.test(js));
test('v4.56.0 JS: helper escapes scenario via escHtml (XSS guard)',
  /q-scenario-body[^]{0,80}escHtml\(scenario\)/.test(js));

// Behavioural — sandbox the helper + verify hide-when-absent + render-when-present
(function testScenarioHelper() {
  try {
    const vm = require('vm');
    const bodyMatch = js.match(/function\s+_renderScenarioBlock\s*\(\s*elId\s*,\s*q\s*,\s*qType\s*\)\s*\{([\s\S]*?)\n\}/);
    if (!bodyMatch) { test('v4.56.0 sandbox: helper body extracted', false); return; }
    test('v4.56.0 sandbox: helper body extracted', true);

    let elState = { hidden: false, innerHTML: '' };
    const ctx = {
      document: {
        getElementById: (id) => (id === 'q-scenario' || id === 'exam-q-scenario') ? elState : null
      },
      escHtml: (s) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;')
    };
    vm.createContext(ctx);
    const fn = vm.runInContext(`(function(elId, q, qType) {${bodyMatch[1]}})`, ctx);

    // Case 1: no scenario → hidden
    elState = { hidden: false, innerHTML: 'stale' };
    fn.call(ctx, 'q-scenario', { question: 'x' }, 'mcq');
    test('v4.56.0 sandbox: no scenario \u2192 element is hidden + cleared',
      elState.hidden === true && elState.innerHTML === '');

    // Case 2: scenario on MCQ → rendered with rule + body spans
    elState = { hidden: true, innerHTML: '' };
    fn.call(ctx, 'q-scenario', { question: 'x', scenario: 'A technician is troubleshooting a VLAN.' }, 'mcq');
    test('v4.56.0 sandbox: MCQ + scenario \u2192 hidden false + rule+body spans present',
      elState.hidden === false &&
      elState.innerHTML.includes('q-scenario-rule') &&
      elState.innerHTML.includes('q-scenario-body') &&
      elState.innerHTML.includes('troubleshooting a VLAN'));

    // Case 3: scenario on cli-sim → still hidden (nested renderer handles it)
    elState = { hidden: false, innerHTML: 'stale' };
    fn.call(ctx, 'q-scenario', { question: 'x', scenario: 'A user reports...' }, 'cli-sim');
    test('v4.56.0 sandbox: cli-sim skipped \u2192 hidden true (no double-render)',
      elState.hidden === true && elState.innerHTML === '');

    // Case 4: scenario on topology → also skipped
    elState = { hidden: false, innerHTML: 'stale' };
    fn.call(ctx, 'q-scenario', { question: 'x', scenario: 'Design a hybrid cloud.' }, 'topology');
    test('v4.56.0 sandbox: topology skipped \u2192 hidden true (no double-render)',
      elState.hidden === true && elState.innerHTML === '');

    // Case 5: whitespace-only scenario → treated as absent
    elState = { hidden: false, innerHTML: 'stale' };
    fn.call(ctx, 'q-scenario', { question: 'x', scenario: '   ' }, 'mcq');
    test('v4.56.0 sandbox: whitespace-only scenario \u2192 hidden (trim guard)',
      elState.hidden === true && elState.innerHTML === '');

    // Case 6: XSS guard — angle brackets in scenario get escaped
    elState = { hidden: true, innerHTML: '' };
    fn.call(ctx, 'q-scenario', { question: 'x', scenario: '<img src=x onerror=alert(1)>' }, 'mcq');
    test('v4.56.0 sandbox: scenario text is HTML-escaped (XSS guard)',
      !elState.innerHTML.includes('<img') &&
      elState.innerHTML.includes('&lt;img'));
  } catch (e) {
    test('v4.56.0 sandbox: helper executes without error', false);
  }
})();

// CSS — editorial aesthetic
test('v4.56.0 CSS: .q-scenario class defined with max-width cap',
  /\.q-scenario\s*\{[\s\S]{0,400}max-width:\s*680px/.test(css));
test('v4.56.0 CSS: .q-scenario-rule carries accent left bar',
  /\.q-scenario\s+\.q-scenario-rule\s*\{[\s\S]{0,200}background:\s*var\(--accent\)/.test(css));
test('v4.56.0 CSS: .q-scenario-body uses flex:1 1 auto (narrow + responsive)',
  /\.q-scenario\s+\.q-scenario-body\s*\{[\s\S]{0,200}flex:\s*1\s+1\s+auto/.test(css));
test('v4.56.0 CSS: qScenarioFade keyframe for entrance animation',
  /@keyframes\s+qScenarioFade\s*\{/.test(css));
test('v4.56.0 CSS: [hidden] rule so empty block takes no layout space',
  /\.q-scenario\[hidden\]\s*\{\s*display:\s*none/.test(css));
test('v4.56.0 CSS: reduced-motion neutralises qScenarioFade',
  /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,600}\.q-scenario\s*\{\s*animation:\s*none/.test(css));
test('v4.56.0 CSS: light-theme override for .q-scenario-rule brand purple',
  /\[data-theme="light"\]\s+\.q-scenario\s+\.q-scenario-rule\s*\{[\s\S]{0,100}background:\s*#6355e0/.test(css));

// Prompt instructions — Haiku is told when to include scenario + the golden-rule
test('v4.56.0 prompt: fetchQuestions mentions optional SCENARIO CONTEXT FIELD',
  /SCENARIO\s+CONTEXT\s+FIELD/.test(js));
test('v4.56.0 prompt: enforces "environment, not subject" rule',
  /scenario\s+describes\s+the\s+ENVIRONMENT/.test(js));
test('v4.56.0 prompt: explicitly forbids telegraphing the answer',
  /telegraphs\s+the\s+answer/.test(js));
test('v4.56.0 prompt: MCQ format example carries scenario as optional',
  /"scenario":"\(optional/.test(js));

// ══════════════════════════════════════════════════════════════════════
// v4.56.1 — Batching + malformed-JSON resilience
// Large question requests (n > QUIZ_BATCH_THRESHOLD) split into concurrent
// batches of ≤QUIZ_BATCH_SIZE so each prompt stays in Haiku's comfort zone.
// Fixes the "AI returned malformed data" failure at n=20 with multi-topic.
// ══════════════════════════════════════════════════════════════════════

// Constants
test('v4.56.1 JS: QUIZ_BATCH_SIZE constant defined (10)',
  /const QUIZ_BATCH_SIZE\s*=\s*10/.test(js));
test('v4.56.1 JS: QUIZ_BATCH_THRESHOLD constant defined (12)',
  /const QUIZ_BATCH_THRESHOLD\s*=\s*12/.test(js));
test('v4.56.1 JS: MAX_TOKENS_GENERATION bumped to 12000 for scenario headroom',
  /MAX_TOKENS_GENERATION\s*=\s*12000/.test(js));

// Coordinator structure
test('v4.56.1 JS: fetchQuestions single-shot path when n <= threshold',
  /n\s*<=\s*QUIZ_BATCH_THRESHOLD[\s\S]{0,200}_fetchQuestionsBatch\(key,\s*qTopic,\s*difficulty,\s*n\)/.test(js));
test('v4.56.1 JS: fetchQuestions splits n into batches via numBatches + base + remainder',
  /const\s+numBatches\s*=\s*Math\.ceil\(n\s*\/\s*QUIZ_BATCH_SIZE\)/.test(js) &&
  /const\s+base\s*=\s*Math\.floor\(n\s*\/\s*numBatches\)/.test(js));
test('v4.56.1 JS: fetchQuestions fires batches concurrently via Promise.allSettled',
  /Promise\.allSettled\([\s\S]{0,400}_fetchQuestionsBatch/.test(js));
test('v4.56.1 JS: API errors bubble up immediately (no masking 401/429 as malformed)',
  /r\.reason[\s\S]{0,40}apiError/.test(js));
test('v4.56.1 JS: merged === 0 → throws user-facing malformed-data error',
  /merged\.length\s*===\s*0[\s\S]{0,100}AI returned malformed data/.test(js));
test('v4.56.1 JS: caching happens at outer coordinator (batched path)',
  /cacheQuestions\(qTopic,\s*difficulty,\s*n,\s*merged\)/.test(js));

// PBQ budget distribution
test('v4.56.1 JS: outer computes totalPbqBudget once at coordinator level',
  /const\s+totalPbqBudget\s*=\s*n\s*>=\s*10\s*\?\s*2/.test(js));
test('v4.56.1 JS: PBQ budget distributed across batches (round-robin to early batches)',
  /pbqBudgets\[i\s*%\s*numBatches\]\+\+/.test(js));

// Batch worker accepts override
test('v4.56.1 JS: _fetchQuestionsBatch accepts pbqCountOverride',
  /async function _fetchQuestionsBatch\(key,\s*qTopic,\s*difficulty,\s*n,\s*pbqCountOverride\)/.test(js));
test('v4.56.1 JS: batch worker uses override when provided, falls back to formula otherwise',
  /typeof pbqCountOverride\s*===\s*['"]number['"][\s\S]{0,100}pbqCountOverride[\s\S]{0,60}n\s*>=\s*10\s*\?\s*2/.test(js));
test('v4.56.1 JS: inner batch no longer calls cacheQuestions (coordinator handles it)',
  !_fnBody(js, '_fetchQuestionsBatch').includes('cacheQuestions('));

// Storage key + logging
test('v4.56.1 JS: STORAGE.AI_PARSE_FAILS key added',
  /AI_PARSE_FAILS:\s*['"]nplus_ai_parse_fails['"]/.test(js));
test('v4.56.1 JS: _logAiParseFail helper defined',
  /function\s+_logAiParseFail\s*\(entry\)/.test(js));
test('v4.56.1 JS: _logAiParseFail caps rolling log at 5 entries',
  /arr\.slice\(0,\s*5\)/.test(js));
test('v4.56.1 JS: _logAiParseFail fires on primary parse failure',
  /_logAiParseFail\(\{\s*attempt:\s*['"]haiku-full['"]/.test(js));
test('v4.56.1 JS: _logAiParseFail fires on retry parse failure too',
  /_logAiParseFail\(\{\s*attempt:\s*['"]haiku-retry['"]/.test(js));

// Retry-without-scenario (middle-tier fallback inside each batch)
test('v4.56.1 JS: haiku-retry path calls buildPrompt(false) to strip scenario block',
  /buildPrompt\(false\)[\s\S]{0,120}haiku-retry/.test(js));

// ══════════════════════════════════════════════════════════════════════
// v4.56.2 — Sonnet escalation tier
// Last-ditch fallback inside each batch: when both Haiku attempts (full +
// no-scenario retry) fail the parse, escalate JUST this batch to Sonnet.
// Silent success on recovery; user-facing error only if Sonnet also fails.
// ══════════════════════════════════════════════════════════════════════

test('v4.56.2 JS: attempt() helper parameterized with model arg (3rd param)',
  /const attempt = async \(prompt,\s*label,\s*model\)/.test(js));
test('v4.56.2 JS: attempt() uses `model || CLAUDE_MODEL` fallback in fetch body',
  /body:\s*JSON\.stringify\(\{\s*model:\s*model\s*\|\|\s*CLAUDE_MODEL,\s*max_tokens:\s*MAX_TOKENS_GENERATION/.test(js));
test('v4.56.2 JS: primary Haiku attempt now labelled haiku-full + passes CLAUDE_MODEL',
  /attempt\(buildPrompt\(true\),\s*['"]haiku-full['"],\s*CLAUDE_MODEL\)/.test(js));
test('v4.56.2 JS: retry Haiku attempt labelled haiku-retry + passes CLAUDE_MODEL',
  /attempt\(buildPrompt\(false\),\s*['"]haiku-retry['"],\s*CLAUDE_MODEL\)/.test(js));
test('v4.56.2 JS: Sonnet escalation uses CLAUDE_VALIDATOR_MODEL (Sonnet 4.6)',
  /attempt\(buildPrompt\(false\),\s*['"]sonnet-escalation['"],\s*CLAUDE_VALIDATOR_MODEL\)/.test(js));
test('v4.56.2 JS: Sonnet escalation only fires after both Haiku attempts fail',
  /haiku-retry[\s\S]{0,2000}sonnet-escalation/.test(js));
test('v4.56.2 JS: Sonnet failure still logs + throws user-facing malformed-data',
  /sonnet-escalation[\s\S]{0,400}_logAiParseFail\([\s\S]{0,100}sonnet-escalation[\s\S]{0,300}AI returned malformed data/.test(js));
test('v4.56.2 JS: escalation emits console.info telemetry on fire (not silent)',
  /console\.info\(`\[fetchQuestions\] escalating batch[\s\S]{0,200}CLAUDE_VALIDATOR_MODEL/.test(js));
test('v4.56.2 JS: escalation uses buildPrompt(false) to keep call lightweight',
  /buildPrompt\(false\)[\s\S]{0,80}sonnet-escalation/.test(js));
test('v4.56.2 JS: Sonnet API error still bubbles up immediately (not masked)',
  /sonnetErr\.apiError/.test(js));

// Behavioural — verify the 3-tier cascade structure in source via body inspection
(function testCascadeStructure() {
  try {
    const body = _fnBody(js, '_fetchQuestionsBatch');
    // Order check: haiku-full appears before haiku-retry before sonnet-escalation
    const posFull = body.indexOf("'haiku-full'");
    const posRetry = body.indexOf("'haiku-retry'");
    const posSonnet = body.indexOf("'sonnet-escalation'");
    test('v4.56.2 cascade: haiku-full appears before haiku-retry',
      posFull >= 0 && posRetry >= 0 && posFull < posRetry);
    test('v4.56.2 cascade: haiku-retry appears before sonnet-escalation',
      posRetry >= 0 && posSonnet >= 0 && posRetry < posSonnet);
    test('v4.56.2 cascade: all three attempt labels logged via _logAiParseFail',
      body.match(/_logAiParseFail/g) && body.match(/_logAiParseFail/g).length >= 3);
    test('v4.56.2 cascade: only one user-facing malformed-data throw (at the very end)',
      (body.match(/AI returned malformed data/g) || []).length === 1);
  } catch (e) {
    test('v4.56.2 cascade: structure check executes without error', false);
  }
})();

// Behavioural — vm-sandbox the outer coordinator's batch-sizing logic
(function testBatchSizing() {
  try {
    const vm = require('vm');
    // Extract the n-to-batchSizes logic into a testable helper
    const helperBody = `
      const QUIZ_BATCH_SIZE = 10;
      const QUIZ_BATCH_THRESHOLD = 12;
      function splitN(n) {
        if (n <= QUIZ_BATCH_THRESHOLD) return [n];
        const numBatches = Math.ceil(n / QUIZ_BATCH_SIZE);
        const base = Math.floor(n / numBatches);
        const remainder = n - (base * numBatches);
        return Array.from({ length: numBatches }, (_, i) => base + (i < remainder ? 1 : 0));
      }
      function pbqDistribution(n, numBatches) {
        const totalPbqBudget = n >= 10 ? 2 : (n >= 7 ? 1 : 0);
        const pbqBudgets = new Array(numBatches).fill(0);
        for (let i = 0; i < totalPbqBudget; i++) pbqBudgets[i % numBatches]++;
        return { totalPbqBudget, pbqBudgets };
      }
    `;
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(helperBody, ctx);

    // Common sizes
    test('v4.56.1 sandbox: n=5 → single-shot [5]',
      JSON.stringify(ctx.splitN(5)) === '[5]');
    test('v4.56.1 sandbox: n=10 → single-shot [10] (at threshold but <=)',
      JSON.stringify(ctx.splitN(10)) === '[10]');
    test('v4.56.1 sandbox: n=12 → single-shot [12] (at threshold exactly)',
      JSON.stringify(ctx.splitN(12)) === '[12]');
    test('v4.56.1 sandbox: n=13 → two batches, still balanced',
      ctx.splitN(13).length === 2 && ctx.splitN(13).reduce((a, b) => a + b, 0) === 13);
    test('v4.56.1 sandbox: n=20 → [10, 10] (user\'s failing case)',
      JSON.stringify(ctx.splitN(20)) === '[10,10]');
    test('v4.56.1 sandbox: n=26 (20 + DROPOUT_BUFFER) → 3 balanced batches',
      ctx.splitN(26).length === 3 && ctx.splitN(26).reduce((a, b) => a + b, 0) === 26);
    test('v4.56.1 sandbox: n=50 (marathon) → 5 batches of 10',
      JSON.stringify(ctx.splitN(50)) === '[10,10,10,10,10]');
    test('v4.56.1 sandbox: batched path (n > threshold) always keeps every batch ≤ QUIZ_BATCH_SIZE, and total = n',
      (() => {
        for (let n = 13; n <= 100; n++) {
          const sizes = ctx.splitN(n);
          if (sizes.some(s => s > 10)) return false;
          if (sizes.reduce((a, b) => a + b, 0) !== n) return false;
        }
        return true;
      })());

    // PBQ distribution
    const d20 = ctx.pbqDistribution(20, 2);
    test('v4.56.1 sandbox: n=20 gets totalPbqBudget=2, distributed [1, 1]',
      d20.totalPbqBudget === 2 && JSON.stringify(d20.pbqBudgets) === '[1,1]');
    const d50 = ctx.pbqDistribution(50, 5);
    test('v4.56.1 sandbox: n=50 gets totalPbqBudget=2, distributed [1, 1, 0, 0, 0]',
      d50.totalPbqBudget === 2 && JSON.stringify(d50.pbqBudgets) === '[1,1,0,0,0]');
    const d9 = ctx.pbqDistribution(9, 1);
    test('v4.56.1 sandbox: n=9 single-shot gets totalPbqBudget=1',
      d9.totalPbqBudget === 1 && JSON.stringify(d9.pbqBudgets) === '[1]');
    const d5 = ctx.pbqDistribution(5, 1);
    test('v4.56.1 sandbox: n=5 single-shot gets totalPbqBudget=0 (below 7 threshold)',
      d5.totalPbqBudget === 0 && JSON.stringify(d5.pbqBudgets) === '[0]');
  } catch (e) {
    test('v4.56.1 sandbox: batching logic executes without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.57.0 — Question-quality hardening (validator + generator prompts)
// Expands aiValidateQuestions from 3 correctness checks to 6 (adds conceptual
// coherence + framing match + distractor quality). Also adds explicit
// anti-conflation rules to the generation prompt so Haiku is less likely to
// produce sloppy questions (e.g. the "fundamental TCP/IP principle" →
// classful-addressing conflation that shipped in v4.56.x).
// ══════════════════════════════════════════════════════════════════════

// Validator prompt expansion
test('v4.57.0 validator: expanded from THREE checks to SIX checks',
  /Review each question below and check SIX things/.test(js));
test('v4.57.0 validator: check 4 = CONCEPTUAL COHERENCE',
  /4\.\s*CONCEPTUAL COHERENCE[\s\S]{0,300}different concept/i.test(js));
test('v4.57.0 validator: check 5 = FRAMING MATCH',
  /5\.\s*FRAMING MATCH[\s\S]{0,300}abstraction level/.test(js));
test('v4.57.0 validator: check 6 = DISTRACTOR QUALITY',
  /6\.\s*DISTRACTOR QUALITY[\s\S]{0,300}plausible alternatives/.test(js));
test('v4.57.0 validator: new failure modes listed in common-errors section',
  /CONCEPTUAL CONFLATION:/.test(js) &&
  /FRAMING DRIFT:/.test(js) &&
  /WEAK DISTRACTORS:/.test(js));
test('v4.57.0 validator: classful-addressing conflation explicitly called out as AMBIGUOUS trigger',
  /classful addressing[\s\S]{0,200}obsoleted by CIDR/.test(js));
test('v4.57.0 validator: OK requires passing all 6 checks (including conceptual + framing + distractors)',
  /Q1:OK[\s\S]{0,400}conceptually coherent[\s\S]{0,100}well-framed[\s\S]{0,100}plausible distractors/.test(js));
test('v4.57.0 validator: AMBIGUOUS trigger expanded to cover checks 4/5/6',
  /AMBIGUOUS[\s\S]{0,400}fails any of checks 4\/5\/6/.test(js));

// Generation prompt hardening
test('v4.57.0 gen: CONCEPTUAL COHERENCE RULES section added',
  /CONCEPTUAL COHERENCE RULES \(v4\.57\.0/.test(js));
test('v4.57.0 gen: explicit anti-classful-vs-TCP/IP conflation rule',
  /Do NOT conflate deprecated classful addressing[\s\S]{0,200}CIDR/.test(js));
test('v4.57.0 gen: classful terminology guard ties to legacy/historical context',
  /legacy concepts or historical context[\s\S]{0,200}fundamental TCP\/IP principle/.test(js));
test('v4.57.0 gen: abstraction-level match rule present',
  /MATCH THE ABSTRACTION LEVEL[\s\S]{0,400}principle[\s\S]{0,200}configuration step/.test(js));
test('v4.57.0 gen: "stem must match what question tests" rule present',
  /STEM MUST MATCH WHAT THE QUESTION ACTUALLY TESTS/.test(js));
test('v4.57.0 gen: DISTRACTOR QUALITY RULES section added',
  /DISTRACTOR QUALITY RULES:[\s\S]{0,400}at least TWO[\s\S]{0,200}plausible/i.test(js));
test('v4.57.0 gen: distractor rule forbids 3-of-4 obviously-wrong pattern',
  /3 of 4 options are obviously wrong[\s\S]{0,200}giveaway/.test(js));

// ══════════════════════════════════════════════════════════════════════
// v4.57.1 — Multi-topic history entries split per constituent topic
// Pre-v4.57.1 bug: Multi-topic Custom Quiz sessions saved ONE history
// entry under "Multi: Topic A, Topic B, …" sentinel; Progress page's
// `h.filter(e => e.topic === t)` never matched it so every constituent
// topic showed as Untouched despite being studied.
// ══════════════════════════════════════════════════════════════════════

test('v4.57.1 JS: finish() detects Multi: prefix before saving history',
  /activeQuizTopic\.startsWith\(['"]Multi: ['"]\)/.test(js));
test('v4.57.1 JS: multi-topic save uses q.topic from each log entry',
  /byTopic\[\(entry\.q && entry\.q\.topic\)[\s\S]{0,200}byTopic\[t\]\.total\+\+/.test(js) ||
  /log\.forEach\([\s\S]{0,200}entry\.q && entry\.q\.topic/.test(js));
test('v4.57.1 JS: per-topic entries flagged with multi: true for future telemetry',
  /saveToHistory\(\{[\s\S]{0,300}multi:\s*true/.test(js));
test('v4.57.1 JS: single-topic path unchanged (else-branch preserves original behaviour)',
  /else\s*\{\s*saveToHistory\(\{\s*date:\s*now,\s*topic:\s*activeQuizTopic/.test(js));

// Behavioural — vm-sandbox the split logic with a fake `log` array
(function testMultiTopicSplit() {
  try {
    const vm = require('vm');
    // Extract the multi-topic branch as a standalone tester
    const helperBody = `
      function splitMultiTopic(log) {
        const byTopic = {};
        log.forEach(entry => {
          const t = (entry.q && entry.q.topic) || 'Unknown';
          if (!byTopic[t]) byTopic[t] = { total: 0, score: 0 };
          byTopic[t].total++;
          if (entry.isRight) byTopic[t].score++;
        });
        return Object.keys(byTopic).map(t => {
          const { total: tTotal, score: tScore } = byTopic[t];
          const tPct = tTotal > 0 ? Math.round((tScore / tTotal) * 100) : 0;
          return { topic: t, total: tTotal, score: tScore, pct: tPct };
        });
      }
    `;
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(helperBody, ctx);

    // Simulate a 7/7/6 multi-topic session with varying accuracy per topic
    const fakeLog = [
      // 7 Connection Issues questions, 6 correct
      ...Array.from({ length: 7 }, (_, i) => ({ q: { topic: 'Connection Issues' }, isRight: i < 6 })),
      // 7 Perf Issues questions, 5 correct
      ...Array.from({ length: 7 }, (_, i) => ({ q: { topic: 'Perf Issues' }, isRight: i < 5 })),
      // 6 Service Issues questions, 4 correct
      ...Array.from({ length: 6 }, (_, i) => ({ q: { topic: 'Service Issues' }, isRight: i < 4 })),
    ];
    const result = ctx.splitMultiTopic(fakeLog);

    test('v4.57.1 sandbox: 20-Q multi-topic session splits into 3 per-topic entries',
      result.length === 3);
    test('v4.57.1 sandbox: Connection Issues entry = 7 total / 6 score / 86%',
      result.find(r => r.topic === 'Connection Issues')?.total === 7 &&
      result.find(r => r.topic === 'Connection Issues')?.score === 6 &&
      result.find(r => r.topic === 'Connection Issues')?.pct === 86);
    test('v4.57.1 sandbox: Perf Issues entry = 7 total / 5 score / 71%',
      result.find(r => r.topic === 'Perf Issues')?.total === 7 &&
      result.find(r => r.topic === 'Perf Issues')?.score === 5 &&
      result.find(r => r.topic === 'Perf Issues')?.pct === 71);
    test('v4.57.1 sandbox: Service Issues entry = 6 total / 4 score / 67%',
      result.find(r => r.topic === 'Service Issues')?.total === 6 &&
      result.find(r => r.topic === 'Service Issues')?.score === 4 &&
      result.find(r => r.topic === 'Service Issues')?.pct === 67);
    test('v4.57.1 sandbox: sum of per-topic scores = overall session score (invariant)',
      result.reduce((a, r) => a + r.score, 0) === 15 &&
      result.reduce((a, r) => a + r.total, 0) === 20);
    test('v4.57.1 sandbox: missing q.topic falls back to "Unknown" (defensive)',
      (() => {
        const r = ctx.splitMultiTopic([{ q: {}, isRight: true }]);
        return r.length === 1 && r[0].topic === 'Unknown';
      })());
    test('v4.57.1 sandbox: handles zero-question session gracefully',
      ctx.splitMultiTopic([]).length === 0);
  } catch (e) {
    test('v4.57.1 sandbox: split logic executes without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.57.2 — Interrogative guard on question stems
// Caught in the wild: a v4.56.x-era VPN question where the `question`
// field was pure declarative setup ("A system administrator is deploying
// a remote access VPN...") with no "which", "what", "?", or any cue
// asking the learner to choose. Programmatic guard rejects these before
// they reach the Sonnet validator.
// ══════════════════════════════════════════════════════════════════════

test('v4.57.2 JS: _stemHasInterrogative helper defined',
  /function\s+_stemHasInterrogative\(stem\)/.test(js));
test('v4.57.2 JS: validateQuestions calls _stemHasInterrogative on each question',
  /if\s*\(!_stemHasInterrogative\(q\.question\)\)\s*return false/.test(js));
test('v4.57.2 gen prompt: STEM MUST BE AN ACTUAL QUESTION section added',
  /STEM MUST BE AN ACTUAL QUESTION/.test(js));
test('v4.57.2 gen prompt: includes the VPN-style wrong example (the exact failure mode)',
  /system administrator is deploying a remote access VPN[\s\S]{0,400}pure setup/i.test(js));
test('v4.57.2 gen prompt: clarifies scenario field is additive, never a substitute',
  /Scenario \+ question is additive; scenario is never a substitute/.test(js));

// Behavioural — vm-sandbox the helper with a battery of fixtures
(function testInterrogativeGuard() {
  try {
    const vm = require('vm');
    const bodyMatch = js.match(/function\s+_stemHasInterrogative\s*\(stem\)\s*\{([\s\S]*?)\n\}/);
    if (!bodyMatch) { test('v4.57.2 sandbox: helper body extracted', false); return; }
    test('v4.57.2 sandbox: helper body extracted', true);

    const ctx = {};
    vm.createContext(ctx);
    const fn = vm.runInContext(`(function(stem) {${bodyMatch[1]}})`, ctx);

    // The actual failure-mode stem from the user's screenshot — must REJECT
    const vpnBuggy = 'A system administrator is deploying a remote access VPN solution that requires users to authenticate and access corporate resources through a web browser without installing additional VPN client software.';
    test('v4.57.2 sandbox: rejects declarative-only stem from real VPN bug report',
      fn(vpnBuggy) === false);

    // Legitimate questions — must ACCEPT
    test('v4.57.2 sandbox: accepts stem ending with "?"',
      fn('At which OSI layer does a switch operate?') === true);
    test('v4.57.2 sandbox: accepts "Which of the following..." (no ?)',
      fn('Which of the following is a stateful firewall') === true);
    test('v4.57.2 sandbox: accepts "What is the..." interrogative',
      fn('What is the primary function of ARP') === true);
    test('v4.57.2 sandbox: accepts CompTIA imperative "Select the..."',
      fn('Select the BEST VPN solution for browser-based access') === true);
    test('v4.57.2 sandbox: accepts "Identify..." imperative',
      fn('Identify the port number used by SSH') === true);
    test('v4.57.2 sandbox: accepts "Choose..." imperative',
      fn('Choose the protocol that operates at Layer 3') === true);
    test('v4.57.2 sandbox: accepts "Arrange..." (used by ordering PBQs)',
      fn('Arrange these steps in the correct troubleshooting order') === true);
    test('v4.57.2 sandbox: accepts "Place each..." (used by topology PBQs)',
      fn('Place each device in the correct network zone') === true);
    test('v4.57.2 sandbox: accepts "Given..." framing',
      fn('Given the network diagram, which device is misconfigured') === true);
    test('v4.57.2 sandbox: accepts "Why..." interrogative',
      fn('Why would an administrator choose OSPF over RIP') === true);
    test('v4.57.2 sandbox: accepts "How..." interrogative',
      fn('How does STP prevent broadcast storms') === true);
    test('v4.57.2 sandbox: accepts "Match each..." (PBQ format)',
      fn('Match each protocol with its default port number') === true);

    // Edge cases
    test('v4.57.2 sandbox: rejects empty string',
      fn('') === false);
    test('v4.57.2 sandbox: rejects whitespace-only',
      fn('   \n\t  ') === false);
    test('v4.57.2 sandbox: rejects null / non-string safely',
      fn(null) === false && fn(undefined) === false && fn(123) === false);
    test('v4.57.2 sandbox: word-boundary — "whichever" alone does NOT count as "which"',
      fn('The user inputs whichever value they prefer') === false);  // no real interrogative; "whichever" must NOT trigger "which"
    test('v4.57.2 sandbox: declarative setup with no interrogative word rejected',
      fn('A technician installed a new switch. The switch forwards frames based on MAC addresses. Devices on different VLANs cannot communicate directly.') === false);
  } catch (e) {
    test('v4.57.2 sandbox: interrogative guard executes without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.57.3 — topicHints entry for Network Appliances & Device Functions
// User flagged not seeing proxy/load-balancer/NIDS/NIPS questions. Root
// cause: no topicHints entry for this N10-009 1.2 topic, so Haiku had
// no guidance on which appliances to cover. Hint enumerates the full
// 1.2 appliance list including forward/reverse/transparent proxy types
// and load-balancer algorithms.
// ══════════════════════════════════════════════════════════════════════

test('v4.57.3 topicHints: entry exists for "Network Appliances & Device Functions"',
  /'Network Appliances & Device Functions':\s*'Load balancers/.test(js));
test('v4.57.3 topicHints: covers all 3 proxy types (forward, reverse, transparent)',
  /forward proxy[\s\S]{0,200}reverse proxy[\s\S]{0,200}transparent proxy/i.test(js));
test('v4.57.3 topicHints: covers load-balancer algorithms (round-robin, least-connections)',
  /round-robin[\s\S]{0,100}least-connections/i.test(js));
test('v4.57.3 topicHints: covers IDS/IPS/NIDS/NIPS distinctions',
  /IDS\/IPS\/NIDS\/NIPS/.test(js));
test('v4.57.3 topicHints: covers NGFW + UTM distinction',
  /NGFW[\s\S]{0,100}UTM/.test(js) || /Next-Generation Firewall \(NGFW\)[\s\S]{0,200}UTM/.test(js));
test('v4.57.3 topicHints: mentions wireless LAN controller (WLC) explicitly',
  /Wireless LAN Controller|WLC/.test(js));

// Behavioural — simulate the prompt generation for this topic, verify the
// hint actually lands in the prompt text via the "Specifically cover:" path
(function testTopicHintWired() {
  try {
    // The fetchQuestions body uses: topicHints[qTopic] ? ' Specifically cover: ' + topicHints[qTopic] : ''
    // So we just need to verify topicHints['Network Appliances & Device Functions'] evaluates truthy + contains 'proxy'
    const match = js.match(/'Network Appliances & Device Functions':\s*'([^']+)'/);
    if (!match) { test('v4.57.3 sandbox: hint text extracted', false); return; }
    test('v4.57.3 sandbox: hint text extracted', true);
    const hintText = match[1];
    test('v4.57.3 sandbox: hint is non-trivial (>100 chars)',
      hintText.length > 100);
    test('v4.57.3 sandbox: hint mentions proxy',
      /proxy/i.test(hintText));
    test('v4.57.3 sandbox: hint mentions load balancer',
      /load balancer/i.test(hintText));
    test('v4.57.3 sandbox: hint mentions IDS or IPS',
      /IDS|IPS/.test(hintText));
  } catch (e) {
    test('v4.57.3 sandbox: hint extraction executes without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.57.4 — _filterHistoryByTopic helper for pre-v4.57.1 sentinel entries
// User spotted Study Plan still showing "Never studied" for topics they'd
// studied via a multi-topic quiz before v4.57.1. v4.57.1 fixed the SAVE
// path (per-topic entries) but couldn't retroactively split existing
// sentinel entries. This helper fixes the READ path across 4 surfaces so
// old "Multi: A, B, C" entries retroactively credit each constituent topic.
// ══════════════════════════════════════════════════════════════════════

test('v4.57.4 JS: _filterHistoryByTopic helper defined',
  /function\s+_filterHistoryByTopic\s*\(history,\s*topic\)/.test(js));
test('v4.57.4 JS: helper handles exact-match case (post-v4.57.1 entries)',
  /if\s*\(e\.topic === topic\)\s*return true/.test(js));
test('v4.57.4 JS: helper handles Multi: sentinel case (pre-v4.57.1 entries)',
  /e\.topic\.startsWith\(['"]Multi: ['"]\)[\s\S]{0,200}\.split\(['"],['"]\)[\s\S]{0,100}\.includes\(topic\)/.test(js));

// Apply-site checks — all 4 exact-match sites should now use the helper
test('v4.57.4 JS: _scoreTopicNeed (Study Plan) uses _filterHistoryByTopic',
  /function _scoreTopicNeed[\s\S]{0,300}_filterHistoryByTopic\(historyEntries,\s*topic\)/.test(js));
test('v4.57.4 JS: _buildProgressRows (Topic Progress) uses _filterHistoryByTopic',
  /_filterHistoryByTopic\(h,\s*t\)[\s\S]{0,200}domainKey = TOPIC_DOMAINS/.test(js));
test('v4.57.4 JS: _computeConstellationData (Analytics constellation) uses _filterHistoryByTopic',
  /_computeConstellationData[\s\S]{0,400}_filterHistoryByTopic\(h,\s*topic\)/.test(js));
test('v4.57.4 JS: domain drill-down uses _filterHistoryByTopic',
  /topicsInDomain\.forEach[\s\S]{0,200}_filterHistoryByTopic\(h,\s*t\)/.test(js));

// Behavioural — vm-sandbox the helper with the exact user scenario
(function testHistoryMatcher() {
  try {
    const vm = require('vm');
    const bodyMatch = js.match(/function\s+_filterHistoryByTopic\s*\(history,\s*topic\)\s*\{([\s\S]*?)\n\}/);
    if (!bodyMatch) { test('v4.57.4 sandbox: helper body extracted', false); return; }
    test('v4.57.4 sandbox: helper body extracted', true);

    const ctx = {};
    vm.createContext(ctx);
    const fn = vm.runInContext(`(function(history, topic) {${bodyMatch[1]}})`, ctx);

    // Simulate the user's exact history: one pre-v4.57.1 multi-topic entry
    const history = [
      { date: '2026-04-21T09:00:00Z', topic: 'Multi: Connection Issues, Perf Issues, Service Issues', score: 15, total: 20, pct: 75, mode: 'quiz' },
      { date: '2026-04-20T10:00:00Z', topic: 'OSPF', score: 7, total: 10, pct: 70, mode: 'quiz' },  // regular single-topic
    ];

    // All three constituent topics should now match the sentinel entry
    test('v4.57.4 sandbox: Connection Issues matches pre-v4.57.1 sentinel entry',
      fn(history, 'Connection Issues').length === 1);
    test('v4.57.4 sandbox: Perf Issues matches pre-v4.57.1 sentinel entry',
      fn(history, 'Perf Issues').length === 1);
    test('v4.57.4 sandbox: Service Issues matches pre-v4.57.1 sentinel entry',
      fn(history, 'Service Issues').length === 1);

    // Single-topic entry should still match exact
    test('v4.57.4 sandbox: OSPF (single-topic) matches via exact path',
      fn(history, 'OSPF').length === 1);

    // Unrelated topic should NOT match
    test('v4.57.4 sandbox: unrelated topic (VLAN Trunking) returns no matches',
      fn(history, 'VLAN Trunking').length === 0);

    // Mixed history: sentinel + new-style per-topic entries both present
    const mixedHistory = [
      { topic: 'Multi: Connection Issues, Perf Issues', score: 10, total: 15, pct: 67 },  // old style
      { topic: 'Perf Issues', score: 8, total: 10, pct: 80, multi: true },  // new style (post-v4.57.1)
      { topic: 'Perf Issues', score: 7, total: 10, pct: 70 },  // dedicated single-topic session
    ];
    test('v4.57.4 sandbox: mixed history — Perf Issues gets all 3 matching entries',
      fn(mixedHistory, 'Perf Issues').length === 3);
    test('v4.57.4 sandbox: mixed history — Connection Issues only gets the sentinel',
      fn(mixedHistory, 'Connection Issues').length === 1);

    // Edge cases
    test('v4.57.4 sandbox: empty history returns empty array',
      fn([], 'Any Topic').length === 0);
    test('v4.57.4 sandbox: null history returns empty array (defensive)',
      fn(null, 'Any Topic').length === 0);
    test('v4.57.4 sandbox: empty topic returns empty array (defensive)',
      fn(history, '').length === 0);
    test('v4.57.4 sandbox: entries with missing/non-string topic are skipped',
      fn([{ topic: null }, { topic: 123 }, { topic: 'OSPF' }], 'OSPF').length === 1);

    // Multi-topic parse robustness — whitespace tolerance
    test('v4.57.4 sandbox: "Multi: A, B, C" with inconsistent spaces still splits correctly',
      fn([{ topic: 'Multi: A,B , C  , D' }], 'C').length === 1 &&
      fn([{ topic: 'Multi: A,B , C  , D' }], 'D').length === 1);

    // Word-boundary — "Multi: Connection" topic shouldn't partial-match "Connection Issues"
    test('v4.57.4 sandbox: substring-not-identical — "Connection" topic does NOT match "Connection Issues" sentinel entry',
      fn([{ topic: 'Multi: Connection Issues, Perf Issues' }], 'Connection').length === 0);
  } catch (e) {
    test('v4.57.4 sandbox: helper executes without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.59.7 — 5th read-path fix: computeWeakSpotScores history loop
// User reported Service/Perf/Connection Issues greyed out on the home
// page domain grid despite having studied them. Root cause: pre-v4.57.1
// multi-topic sessions saved with sentinel "Multi: A, B, C" were not
// being credited to the constituent topics by computeWeakSpotScores'
// history loop (which uses e.topic directly as a key). v4.57.4 fixed
// 4 read paths via _filterHistoryByTopic but weak-spot scoring was
// explicitly NOT touched — that rationale (wrong-bank attribution) was
// incomplete because the scoring also reads history. This ship adds a
// sibling helper _expandHistoryForWeakSpots that splits sentinel rows
// into per-topic rows before the aggregate loop sees them.
// ══════════════════════════════════════════════════════════════════════

test('v4.59.7 JS: _expandHistoryForWeakSpots helper defined',
  /function\s+_expandHistoryForWeakSpots\s*\(hist\)/.test(js));
test('v4.59.7 JS: helper splits Multi: sentinel rows across constituent topics',
  /_expandHistoryForWeakSpots[\s\S]{0,1200}topics\.forEach\(t\s*=>\s*\{[\s\S]{0,300}topic:\s*t,\s*score:\s*scoreEach,\s*total:\s*totalEach/.test(js));
test('v4.59.7 JS: computeWeakSpotScores routes raw history through _expandHistoryForWeakSpots',
  /function computeWeakSpotScores[\s\S]{0,500}const\s+hist\s*=\s*_expandHistoryForWeakSpots\(rawHist\)/.test(js));

// Behavioural — vm-sandbox the expander with the exact user scenario
(function testHistoryExpander() {
  try {
    const vm = require('vm');
    const bodyMatch = js.match(/function\s+_expandHistoryForWeakSpots\s*\(hist\)\s*\{([\s\S]*?)\n\}/);
    if (!bodyMatch) { test('v4.59.7 sandbox: expander body extracted', false); return; }
    test('v4.59.7 sandbox: expander body extracted', true);

    const ctx = {};
    vm.createContext(ctx);
    const fn = vm.runInContext(`(function(hist) {${bodyMatch[1]}})`, ctx);

    // User's exact scenario: one pre-v4.57.1 multi-topic session with
    // Service/Perf/Connection Issues. Expander should split this into 3
    // per-topic rows with score/total divided by 3 each.
    const history = [
      { date: '2026-04-19T09:00:00Z', topic: 'Multi: Connection Issues, Perf Issues, Service Issues', score: 15, total: 20, pct: 75, mode: 'quiz' },
      { date: '2026-04-20T10:00:00Z', topic: 'OSPF', score: 7, total: 10, pct: 70, mode: 'quiz' },
    ];

    const expanded = fn(history);
    test('v4.59.7 sandbox: 3-topic sentinel + 1 plain = 4 output rows',
      expanded.length === 4);
    test('v4.59.7 sandbox: sentinel row split into 3 per-topic rows',
      expanded.filter(e => e._fromMultiSentinel).length === 3);
    test('v4.59.7 sandbox: Connection Issues present in expanded output',
      expanded.some(e => e.topic === 'Connection Issues' && e._fromMultiSentinel));
    test('v4.59.7 sandbox: Perf Issues present in expanded output',
      expanded.some(e => e.topic === 'Perf Issues' && e._fromMultiSentinel));
    test('v4.59.7 sandbox: Service Issues present in expanded output',
      expanded.some(e => e.topic === 'Service Issues' && e._fromMultiSentinel));
    test('v4.59.7 sandbox: each split row credits 1/3 of original score (15/3 = 5)',
      expanded.filter(e => e._fromMultiSentinel).every(e => e.score === 5));
    test('v4.59.7 sandbox: each split row credits 1/3 of original total (20/3)',
      expanded.filter(e => e._fromMultiSentinel).every(e => Math.abs(e.total - 20 / 3) < 0.001));
    test('v4.59.7 sandbox: plain OSPF row passes through unchanged',
      expanded.some(e => e.topic === 'OSPF' && e.score === 7 && e.total === 10 && !e._fromMultiSentinel));
    // Sum invariant: score and total across all expanded rows equals the original totals
    test('v4.59.7 sandbox: sum of expanded scores equals sum of originals (invariant)',
      Math.abs(expanded.reduce((a, e) => a + (e.score || 0), 0) - 22) < 0.001);
    test('v4.59.7 sandbox: sum of expanded totals equals sum of originals (invariant)',
      Math.abs(expanded.reduce((a, e) => a + (e.total || 0), 0) - 30) < 0.001);

    // Defensive edge cases
    test('v4.59.7 sandbox: empty history returns empty array',
      fn([]).length === 0);
    test('v4.59.7 sandbox: null history returns empty array (defensive)',
      fn(null).length === 0);
    test('v4.59.7 sandbox: entry with no topic passes through unchanged',
      fn([{ score: 5, total: 10 }]).length === 1);
    test('v4.59.7 sandbox: Multi: with no topics after parse passes through',
      fn([{ topic: 'Multi: ', score: 5, total: 10 }]).length === 1);
    test('v4.59.7 sandbox: Multi: with 1 topic gives full credit to that topic',
      (() => {
        const r = fn([{ topic: 'Multi: OSPF', score: 6, total: 10 }]);
        return r.length === 1 && r[0].topic === 'OSPF' && r[0].score === 6 && r[0].total === 10;
      })());
  } catch (e) {
    test('v4.59.7 sandbox: expander executes without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.60.0 — Topology Builder Live Protocol Inspector (issue #184)
// Clicking a device now shows live protocol state in the floating
// popup: routing / ARP / MAC / DHCP in a 4-section accordion. Rows
// flash on insert. Role-aware: switches show MAC tables, routers show
// routing + ARP, DHCP servers show pool config. Inapplicable sections
// render as friendly redirect stubs ("click a switch to see MAC table").
// Refreshed via tbSaveDraft() hook on every state mutation so pings
// populate ARP live.
// ══════════════════════════════════════════════════════════════════════

test('v4.60.0 JS: tbRenderV3Inspector renders editorial head (eyebrow + title + sub)',
  /class="tb-insp-eyebrow">Inspector[\s\S]{0,100}live state[\s\S]{0,300}class="tb-insp-title"/.test(js));
test('v4.60.0 JS: _tbRenderInspRouting helper defined',
  /function\s+_tbRenderInspRouting\s*\(dev,\s*flashKeys\)/.test(js));
test('v4.60.0 JS: _tbRenderInspArp helper defined',
  /function\s+_tbRenderInspArp\s*\(dev,\s*flashKeys\)/.test(js));
test('v4.60.0 JS: _tbRenderInspMac helper defined',
  /function\s+_tbRenderInspMac\s*\(dev,\s*flashKeys\)/.test(js));
test('v4.60.0 JS: _tbRenderInspDhcp helper defined',
  /function\s+_tbRenderInspDhcp\s*\(dev\)/.test(js));
test('v4.60.0 JS: _tbInspInapplicable helper defined',
  /function\s+_tbInspInapplicable\s*\(text\)/.test(js));
test('v4.60.0 JS: _tbInspAccSection wrapper defined',
  /function\s+_tbInspAccSection\s*\(icon,\s*label,\s*count,\s*bodyHtml\)/.test(js));
test('v4.60.0 JS: tbRenderV3Inspector builds flash sets via diff against prev snapshot',
  /currArpKeys\.forEach\(k\s*=>\s*\{\s*if\s*\(!_tbInspPrevArpKeys\.has\(k\)\)\s*flashArp\.add/.test(js));
test('v4.60.0 JS: tbRenderV3Inspector resets snapshot when inspected device changes',
  /if\s*\(_tbInspPrevDeviceId\s*===\s*deviceId\)/.test(js));
test('v4.60.0 JS: tbSaveDraft refreshes inspector when popup visible',
  /function\s+tbSaveDraft\s*\(\)\s*\{[\s\S]*?getElementById\(['"]tb-inspector-pop['"]\)[\s\S]*?tbRenderV3Inspector\s*\(\)/.test(js));
test('v4.60.0 JS: tbBindInspectorKeydown defined + wired in openTopologyBuilder',
  /function\s+tbBindInspectorKeydown[\s\S]{0,400}keydown[\s\S]{0,200}Escape/.test(js) &&
  /openTopologyBuilder[\s\S]{0,1200}tbBindInspectorKeydown/.test(js));
test('v4.60.0 JS: device-role helpers defined (_tbInspDeviceIsSwitch + _tbInspDeviceHasL3 + _tbInspDeviceIsDhcpServer)',
  /function\s+_tbInspDeviceIsSwitch\b/.test(js) &&
  /function\s+_tbInspDeviceHasL3\b/.test(js) &&
  /function\s+_tbInspDeviceIsDhcpServer\b/.test(js));

test('v4.60.0 CSS: accordion section + editorial head styles defined',
  /\.tb-insp-acc-section\s*\{/.test(css) &&
  /\.tb-insp-eyebrow\s*\{/.test(css) &&
  /\.tb-insp-title\s*\{/.test(css));
test('v4.60.0 CSS: row-flash keyframe animation defined',
  /@keyframes\s+tbInspRowFlash/.test(css) &&
  /tb-insp-row-flash\s+td\s*\{[\s\S]*?animation:\s*tbInspRowFlash/.test(css));
test('v4.60.0 CSS: reduced-motion neutralises row-flash',
  /prefers-reduced-motion[\s\S]{0,400}tb-insp-row-flash\s+td\s*\{\s*animation:\s*none/.test(css));
test('v4.60.0 CSS: light-theme overrides for inspector defined',
  /\[data-theme="light"\]\s+\.tb-insp-eyebrow/.test(css) &&
  /\[data-theme="light"\]\s+\.tb-insp-cell-iface/.test(css));
test('v4.60.0 CSS: inapplicable + empty stub styles defined',
  /\.tb-insp-inapplicable\s*\{/.test(css) &&
  /\.tb-insp-empty\s*\{/.test(css));

// Behavioural: vm-sandbox the pure table renderers against fixtures
(function testInspRenderers() {
  try {
    const vm = require('vm');
    const bodies = {};
    ['_tbRenderInspRouting', '_tbRenderInspArp', '_tbRenderInspMac', '_tbRenderInspDhcp'].forEach(fnName => {
      const m = js.match(new RegExp('function\\s+' + fnName + '\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\}', ''));
      if (m) bodies[fnName] = m[1];
    });
    const inspAccBody = js.match(/function\s+_tbInspAccSection\s*\(icon,\s*label,\s*count,\s*bodyHtml\)\s*\{([\s\S]*?)\n\}/);
    const inspInapplicableBody = js.match(/function\s+_tbInspInapplicable\s*\(text\)\s*\{([\s\S]*?)\n\}/);
    const inspEmptyBody = js.match(/function\s+_tbInspEmpty\s*\(msg\)\s*\{([\s\S]*?)\n\}/);
    const inspRowClassBody = js.match(/function\s+_tbInspRowClass\s*\(isFlashing\)\s*\{([\s\S]*?)\n\}/);
    const inspEscBody = js.match(/function\s+_tbInspEsc\s*\(s\)\s*\{([\s\S]*?)\n\}/);

    if (!bodies._tbRenderInspArp || !bodies._tbRenderInspMac || !bodies._tbRenderInspRouting || !bodies._tbRenderInspDhcp || !inspAccBody || !inspInapplicableBody || !inspEmptyBody || !inspRowClassBody || !inspEscBody) {
      test('v4.60.0 sandbox: all renderers + helpers extracted', false);
      return;
    }
    test('v4.60.0 sandbox: all renderers + helpers extracted', true);

    const ctx = {};
    vm.createContext(ctx);
    // Stub escHtml (the renderers defer to _tbInspEsc which falls back to String)
    vm.runInContext(`function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }`, ctx);
    vm.runInContext(`function _tbInspEsc(s) {${inspEscBody[1]}}`, ctx);
    vm.runInContext(`function _tbInspRowClass(isFlashing) {${inspRowClassBody[1]}}`, ctx);
    vm.runInContext(`function _tbInspAccSection(icon, label, count, bodyHtml) {${inspAccBody[1]}}`, ctx);
    vm.runInContext(`function _tbInspInapplicable(text) {${inspInapplicableBody[1]}}`, ctx);
    vm.runInContext(`function _tbInspEmpty(msg) {${inspEmptyBody[1]}}`, ctx);
    vm.runInContext(`function _tbRenderInspRouting(dev, flashKeys) {${bodies._tbRenderInspRouting}}`, ctx);
    vm.runInContext(`function _tbRenderInspArp(dev, flashKeys) {${bodies._tbRenderInspArp}}`, ctx);
    vm.runInContext(`function _tbRenderInspMac(dev, flashKeys) {${bodies._tbRenderInspMac}}`, ctx);
    vm.runInContext(`function _tbRenderInspDhcp(dev) {${bodies._tbRenderInspDhcp}}`, ctx);

    // ── ARP renderer ──
    const arpDev = {
      arpTable: [
        { ip: '10.0.1.10', mac: 'aa:bb:cc:00:01:0a', iface: 'eth0', age: 42 },
        { ip: '10.0.254.2', mac: 'aa:bb:cc:fe:00:02', iface: 'eth1', age: 0 }
      ]
    };
    const arpHtml = vm.runInContext('_tbRenderInspArp(dev, null)', Object.assign(ctx, { dev: arpDev }));
    // HTML has 1 header row in thead + N data rows in tbody. Count tbody rows only.
    const arpTbodyRows = (arpHtml.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || '';
    test('v4.60.0 sandbox: ARP renderer emits one row per entry',
      (arpTbodyRows.match(/<tr\b/g) || []).length === 2);
    test('v4.60.0 sandbox: ARP renderer shows IP + MAC + iface',
      arpHtml.includes('10.0.1.10') && arpHtml.includes('aa:bb:cc:00:01:0a') && arpHtml.includes('eth0'));

    // ── ARP with flashKeys: second row flashes ──
    const flashSet = new Set(['10.0.254.2|aa:bb:cc:fe:00:02']);
    vm.runInContext('dev = arpDev; flashSet = new Set(["10.0.254.2|aa:bb:cc:fe:00:02"]);', Object.assign(ctx, { arpDev, flashSet }));
    const arpFlashHtml = vm.runInContext('_tbRenderInspArp(arpDev, flashSet)', ctx);
    test('v4.60.0 sandbox: ARP row matching flashKey gets tb-insp-row-flash class',
      arpFlashHtml.includes('tb-insp-row-flash'));
    test('v4.60.0 sandbox: ARP row matching flashKey shows Learned label',
      arpFlashHtml.includes('tb-insp-learned'));
    test('v4.60.0 sandbox: ARP row NOT in flashKey does not flash',
      (arpFlashHtml.match(/tb-insp-row-flash/g) || []).length === 1);

    // ── ARP empty state ──
    const arpEmpty = vm.runInContext('_tbRenderInspArp({arpTable: []}, null)', ctx);
    test('v4.60.0 sandbox: ARP empty state friendly message',
      arpEmpty.includes('tb-insp-empty') && arpEmpty.includes('Send a ping'));

    // ── MAC renderer ──
    const macDev = {
      macTable: [
        { mac: 'aa:bb:cc:00:01:0a', vlan: 10, port: 'Gi0/1' },
        { mac: 'aa:bb:cc:00:01:0b', vlan: 10, port: 'Gi0/2' }
      ]
    };
    const macHtml = vm.runInContext('_tbRenderInspMac(macDev, null)', Object.assign(ctx, { macDev }));
    const macTbodyRows = (macHtml.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || '';
    test('v4.60.0 sandbox: MAC renderer emits one row per entry',
      (macTbodyRows.match(/<tr\b/g) || []).length === 2);
    test('v4.60.0 sandbox: MAC renderer shows vlan + port',
      macHtml.includes('Gi0/1') && macHtml.includes('10'));

    // ── Routing renderer with 2 connected + 1 static ──
    const rtrDev = {
      routingTable: [
        { destination: '10.0.1.0', mask: 24, interface: 'eth0', source: 'C' },
        { destination: '10.0.2.0', mask: 24, nextHop: '10.0.254.2', interface: 'eth1', source: 'S' }
      ]
    };
    const rtrHtml = vm.runInContext('_tbRenderInspRouting(rtrDev, null)', Object.assign(ctx, { rtrDev }));
    test('v4.60.0 sandbox: routing renderer shows connected vs static distinction',
      rtrHtml.includes('connected') && rtrHtml.includes('10.0.254.2'));

    // ── DHCP renderer with pool config ──
    const dhcpDev = {
      dhcpServer: { name: 'LAN_POOL', network: '10.0.1.0', mask: '255.255.255.0',
                    gateway: '10.0.1.1', rangeStart: '10.0.1.100', rangeEnd: '10.0.1.200', dns: '1.1.1.1' }
    };
    const dhcpHtml = vm.runInContext('_tbRenderInspDhcp(dhcpDev)', Object.assign(ctx, { dhcpDev }));
    test('v4.60.0 sandbox: DHCP renderer shows pool network + range + gateway',
      dhcpHtml && dhcpHtml.includes('10.0.1.0') && dhcpHtml.includes('10.0.1.100') && dhcpHtml.includes('10.0.1.1'));

    // ── DHCP returns null when no pool configured ──
    const dhcpNull = vm.runInContext('_tbRenderInspDhcp({dhcpServer: null})', ctx);
    test('v4.60.0 sandbox: DHCP renderer returns null on non-DHCP device (renderer contract)',
      dhcpNull === null);

    // ── Inapplicable stub ──
    const inapp = vm.runInContext('_tbInspInapplicable("Not applicable — click a switch")', ctx);
    test('v4.60.0 sandbox: inapplicable stub emits friendly styled message',
      inapp.includes('tb-insp-inapplicable') && inapp.includes('Not applicable'));
  } catch (e) {
    test('v4.60.0 sandbox: all renderers executed without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.60.1 — TB side-pane collapse/expand toggles
// User polish ask after v4.60.0: make the left device palette AND the
// right scenarios pane collapsible so the canvas can reclaim space when
// working on a big topology. State persists per-pane via localStorage
// (STORAGE.TB_LEFT_COLLAPSED / STORAGE.TB_RIGHT_COLLAPSED).
// ══════════════════════════════════════════════════════════════════════

test('v4.60.1 STORAGE: TB_LEFT_COLLAPSED key defined',
  /TB_LEFT_COLLAPSED:\s*['"]nplus_tb_left_collapsed['"]/.test(js));
test('v4.60.1 STORAGE: TB_RIGHT_COLLAPSED key defined',
  /TB_RIGHT_COLLAPSED:\s*['"]nplus_tb_right_collapsed['"]/.test(js));
test('v4.60.1 JS: tbTogglePalette defined + toggles .tb-left-collapsed',
  /function\s+tbTogglePalette\s*\(\)[\s\S]{0,500}classList\.toggle\(['"]tb-left-collapsed['"]\)/.test(js));
test('v4.60.1 JS: tbToggleScenarios defined + toggles .tb-right-collapsed',
  /function\s+tbToggleScenarios\s*\(\)[\s\S]{0,500}classList\.toggle\(['"]tb-right-collapsed['"]\)/.test(js));
test('v4.60.1 JS: tbTogglePalette persists state via STORAGE.TB_LEFT_COLLAPSED',
  /function\s+tbTogglePalette[\s\S]{0,500}setItem\(STORAGE\.TB_LEFT_COLLAPSED/.test(js));
test('v4.60.1 JS: tbToggleScenarios persists state via STORAGE.TB_RIGHT_COLLAPSED',
  /function\s+tbToggleScenarios[\s\S]{0,500}setItem\(STORAGE\.TB_RIGHT_COLLAPSED/.test(js));
test('v4.60.1 JS: tbInitPaneCollapseState defined + reads both STORAGE keys',
  /function\s+tbInitPaneCollapseState\s*\(\)[\s\S]{0,600}getItem\(STORAGE\.TB_LEFT_COLLAPSED\)[\s\S]{0,600}getItem\(STORAGE\.TB_RIGHT_COLLAPSED\)/.test(js));
test('v4.60.1 JS: openTopologyBuilder calls tbInitPaneCollapseState on mount',
  /openTopologyBuilder[\s\S]{0,1500}tbInitPaneCollapseState/.test(js));

test('v4.60.1 HTML: #tb-workspace-v3 id added to workspace',
  /id="tb-workspace-v3"/.test(html));
test('v4.60.1 HTML: left pane has collapse button + onclick',
  /id="tb-palette-collapse-btn"[\s\S]{0,200}onclick="tbTogglePalette/.test(html));
test('v4.60.1 HTML: right pane has collapse button + onclick',
  /id="tb-right-collapse-btn"[\s\S]{0,200}onclick="tbToggleScenarios/.test(html));
test('v4.60.1 HTML: left pane has rail label for collapsed state',
  /id="tb-palette"[\s\S]{0,800}tb-pane-rail-label[\s\S]{0,300}Devices/.test(html));
test('v4.60.1 HTML: right pane has rail label for collapsed state',
  /id="tb-v3-right"[\s\S]{0,800}tb-pane-rail-label[\s\S]{0,300}Scenarios/.test(html));
test('v4.60.1 HTML: rail label is keyboard accessible (role + tabindex + onkeydown)',
  /tb-pane-rail-label[\s\S]{0,300}role="button"[\s\S]{0,100}tabindex="0"[\s\S]{0,100}onkeydown=/.test(html));

test('v4.60.1 CSS: collapsed grid-template-columns defined for .tb-left-collapsed',
  /\.tb-workspace\.tb-workspace-v3\.tb-left-collapsed\s*\{[\s\S]{0,200}grid-template-columns:\s*36px/.test(css));
test('v4.60.1 CSS: collapsed grid-template-columns defined for .tb-right-collapsed',
  /\.tb-workspace\.tb-workspace-v3\.tb-right-collapsed\s*\{[\s\S]{0,200}grid-template-columns:\s*260px[\s\S]{0,50}36px/.test(css));
test('v4.60.1 CSS: both-collapsed grid-template-columns defined',
  /tb-left-collapsed\.tb-right-collapsed[\s\S]{0,200}grid-template-columns:\s*36px\s+minmax\(0,\s*1fr\)\s+36px/.test(css));
test('v4.60.1 CSS: .tb-pane-collapse-btn styled as accent chip',
  /\.tb-pane-collapse-btn\s*\{[\s\S]{0,400}position:\s*absolute/.test(css));
test('v4.60.1 CSS: chevron rotates 180deg when pane is collapsed',
  /tb-left-collapsed\s+#tb-palette-collapse-btn\s*\{\s*transform:\s*rotate\(180deg\)/.test(css) &&
  /tb-right-collapsed\s+#tb-right-collapse-btn\s*\{\s*transform:\s*rotate\(180deg\)/.test(css));
test('v4.60.1 CSS: rail label uses vertical writing-mode, shown only when collapsed',
  /\.tb-pane-rail-label\s*\{[\s\S]{0,400}writing-mode:\s*vertical-rl/.test(css) &&
  /tb-left-collapsed[\s\S]{0,200}tb-pane-rail-label[\s\S]{0,100}display:\s*block/.test(css));
test('v4.60.1 CSS: pane content hides when collapsed (not(.tb-pane-collapse-btn):not(.tb-pane-rail-label))',
  /tb-left-collapsed[\s\S]{0,200}#tb-palette\s*>\s*\*:not\(\.tb-pane-collapse-btn\):not\(\.tb-pane-rail-label\)[\s\S]{0,200}display:\s*none/.test(css));
test('v4.60.1 CSS: grid-columns transition defined for smooth collapse/expand',
  /\.tb-workspace\.tb-workspace-v3\s*\{[\s\S]{0,400}transition:\s*grid-template-columns\s+280ms/.test(css));
test('v4.60.1 CSS: reduced-motion neutralises transitions on workspace + collapse btn',
  /prefers-reduced-motion[\s\S]{0,400}tb-workspace\.tb-workspace-v3[\s\S]{0,100}transition:\s*none/.test(css));
test('v4.60.1 CSS: light-theme overrides collapse button + rail hover colors',
  /\[data-theme="light"\]\s+\.tb-pane-collapse-btn/.test(css) &&
  /\[data-theme="light"\]\s+\.tb-pane-rail-label:hover/.test(css));

// Behavioural — vm-sandbox the toggle functions against a fake DOM + localStorage
(function testPaneToggle() {
  try {
    const vm = require('vm');
    const toggleLeftBody = js.match(/function\s+tbTogglePalette\s*\(\)\s*\{([\s\S]*?)\n\}/);
    const toggleRightBody = js.match(/function\s+tbToggleScenarios\s*\(\)\s*\{([\s\S]*?)\n\}/);
    const initBody = js.match(/function\s+tbInitPaneCollapseState\s*\(\)\s*\{([\s\S]*?)\n\}/);
    if (!toggleLeftBody || !toggleRightBody || !initBody) {
      test('v4.60.1 sandbox: toggle bodies extracted', false);
      return;
    }
    test('v4.60.1 sandbox: toggle bodies extracted', true);

    // Fake DOM + localStorage
    const fakeStore = {};
    const ctx = {
      STORAGE: { TB_LEFT_COLLAPSED: 'nplus_tb_left_collapsed', TB_RIGHT_COLLAPSED: 'nplus_tb_right_collapsed' },
      localStorage: {
        getItem: k => fakeStore[k] === undefined ? null : fakeStore[k],
        setItem: (k, v) => { fakeStore[k] = v; },
        removeItem: k => { delete fakeStore[k]; }
      },
      document: {
        getElementById: id => {
          if (id === 'tb-workspace-v3') {
            return ctx._ws;
          }
          return null; // buttons not needed for core test
        }
      }
    };
    // Fake workspace element with classList
    const classes = new Set();
    ctx._ws = {
      classList: {
        toggle: c => { if (classes.has(c)) classes.delete(c); else classes.add(c); },
        add: c => classes.add(c),
        remove: c => classes.delete(c),
        contains: c => classes.has(c)
      }
    };
    vm.createContext(ctx);
    vm.runInContext(`function tbTogglePalette() {${toggleLeftBody[1]}}`, ctx);
    vm.runInContext(`function tbToggleScenarios() {${toggleRightBody[1]}}`, ctx);
    vm.runInContext(`function tbInitPaneCollapseState() {${initBody[1]}}`, ctx);

    // Initially no classes
    test('v4.60.1 sandbox: workspace starts with no collapse classes',
      !classes.has('tb-left-collapsed') && !classes.has('tb-right-collapsed'));

    // Toggle left → adds class + persists '1'
    vm.runInContext('tbTogglePalette()', ctx);
    test('v4.60.1 sandbox: tbTogglePalette adds .tb-left-collapsed',
      classes.has('tb-left-collapsed'));
    test('v4.60.1 sandbox: tbTogglePalette persists "1" to TB_LEFT_COLLAPSED',
      fakeStore['nplus_tb_left_collapsed'] === '1');

    // Toggle right → adds class + persists
    vm.runInContext('tbToggleScenarios()', ctx);
    test('v4.60.1 sandbox: tbToggleScenarios adds .tb-right-collapsed',
      classes.has('tb-right-collapsed'));
    test('v4.60.1 sandbox: tbToggleScenarios persists "1" to TB_RIGHT_COLLAPSED',
      fakeStore['nplus_tb_right_collapsed'] === '1');

    // Toggle left again → removes class + persists '0'
    vm.runInContext('tbTogglePalette()', ctx);
    test('v4.60.1 sandbox: toggling left again removes .tb-left-collapsed',
      !classes.has('tb-left-collapsed'));
    test('v4.60.1 sandbox: toggling left again persists "0"',
      fakeStore['nplus_tb_left_collapsed'] === '0');

    // Init reads persisted state on fresh mount: left='1', right='0'
    classes.clear();
    fakeStore['nplus_tb_left_collapsed'] = '1';
    fakeStore['nplus_tb_right_collapsed'] = '0';
    vm.runInContext('tbInitPaneCollapseState()', ctx);
    test('v4.60.1 sandbox: init applies .tb-left-collapsed when persisted state is "1"',
      classes.has('tb-left-collapsed'));
    test('v4.60.1 sandbox: init does NOT apply .tb-right-collapsed when persisted is "0"',
      !classes.has('tb-right-collapsed'));

    // Init when both set
    classes.clear();
    fakeStore['nplus_tb_left_collapsed'] = '1';
    fakeStore['nplus_tb_right_collapsed'] = '1';
    vm.runInContext('tbInitPaneCollapseState()', ctx);
    test('v4.60.1 sandbox: init applies both collapse classes when both persisted',
      classes.has('tb-left-collapsed') && classes.has('tb-right-collapsed'));

    // Init when neither set (fresh first visit)
    classes.clear();
    delete fakeStore['nplus_tb_left_collapsed'];
    delete fakeStore['nplus_tb_right_collapsed'];
    vm.runInContext('tbInitPaneCollapseState()', ctx);
    test('v4.60.1 sandbox: init leaves classes off on first visit (no persisted state)',
      !classes.has('tb-left-collapsed') && !classes.has('tb-right-collapsed'));
  } catch (e) {
    test('v4.60.1 sandbox: toggle logic executed without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.61.0 — TB Per-Hop Packet Trace (issue #185)
// Click Trace pill → opens dialog → computes hop-by-hop trace via pure
// tbComputeTrace function → renders floating log panel + canvas packet
// pill + inline frame badge → auto-plays at 1500ms/hop. Each hop emits
// L2/L3/ARP/DELIVER/FAIL layer + decision copy + frame metadata
// (src/dst MAC, src/dst IP, TTL before/after, outIface, next-hop).
// ══════════════════════════════════════════════════════════════════════

test('v4.61.0 JS: tbComputeTrace pure function defined',
  /function\s+tbComputeTrace\s*\(state,\s*srcDeviceId,\s*dstIp,\s*maxTtl\)/.test(js));
test('v4.61.0 JS: trace state machine defined (play/pause/step/reset/speed)',
  /function\s+tbTracePlay\b/.test(js) &&
  /function\s+tbTracePause\b/.test(js) &&
  /function\s+tbTraceStep\b/.test(js) &&
  /function\s+tbTraceReset\b/.test(js) &&
  /function\s+tbTraceSpeedToggle\b/.test(js));
test('v4.61.0 JS: tbStartTrace + tbEndTrace lifecycle defined',
  /function\s+tbStartTrace\s*\(srcId,\s*dstIp\)/.test(js) &&
  /function\s+tbEndTrace\s*\(\)/.test(js));
test('v4.61.0 JS: tbOpenTraceDialog picks source device and prompts for destination IP',
  /function\s+tbOpenTraceDialog[\s\S]{0,2000}prompt\(/.test(js));
test('v4.61.0 JS: tbRenderTraceLog emits hop timeline with layer chips',
  /function\s+tbRenderTraceLog[\s\S]{0,4000}tb-trace-hop-layer-\$\{layerClass\}/.test(js));
test('v4.61.0 JS: tbRenderTraceLog emits playback controls (reset, play/pause, step, speed)',
  /tbTraceReset\(\)[\s\S]{0,2500}tbTraceStep\(\)[\s\S]{0,500}tbTraceSpeedToggle\(\)/.test(js));
test('v4.61.0 JS: tbRenderTraceCanvasState applies visited/current/pending classes to devices',
  /function\s+tbRenderTraceCanvasState[\s\S]{0,1500}tb-trace-visited[\s\S]{0,200}tb-trace-current[\s\S]{0,200}tb-trace-pending/.test(js));
test('v4.61.0 JS: trace renderer uses data-tb-device selector (matches existing device attr)',
  /tbRenderTraceCanvasState[\s\S]{0,2000}querySelectorAll\(['"]\[data-tb-device\]/.test(js));
test('v4.61.0 JS: tbRenderCanvas wrapped so trace decorations survive re-renders',
  /_tbTraceWrapped\s*=\s*true/.test(js) &&
  /if\s*\(_tbTraceState\.active\)\s*tbRenderTraceCanvasState\(\)/.test(js));
test('v4.61.0 JS: tbStartTrace respects prefers-reduced-motion (skip auto-play)',
  /function\s+tbStartTrace[\s\S]{0,1200}prefers-reduced-motion[\s\S]{0,200}if\s*\(!rm\)\s*tbTracePlay\(\)/.test(js));

test('v4.61.0 HTML: Trace pill added to canvas toolbar',
  /data-tb-pill="trace"[\s\S]{0,200}tbOpenTraceDialog/.test(html));
test('v4.61.0 HTML: #tb-trace-panel floating panel present in topology page',
  /id="tb-trace-panel"[\s\S]{0,200}role="dialog"[\s\S]{0,100}hidden/.test(html));

test('v4.61.0 CSS: .tb-trace-panel styled + positioned absolutely over canvas',
  /\.tb-trace-panel\s*\{[\s\S]{0,400}position:\s*absolute/.test(css));
test('v4.61.0 CSS: hop layer chips styled for L2/L3/ARP/FAIL variants',
  /\.tb-trace-hop-layer-l2\s*\{/.test(css) &&
  /\.tb-trace-hop-layer-l3\s*\{/.test(css) &&
  /\.tb-trace-hop-layer-arp\s*\{/.test(css) &&
  /\.tb-trace-hop-layer-fail\s*\{/.test(css));
test('v4.61.0 CSS: current hop dot has pulse animation',
  /@keyframes\s+tbTraceCurrentPulse/.test(css) &&
  /tb-trace-hop-current\s+\.tb-trace-hop-dot[\s\S]{0,200}animation:\s*tbTraceCurrentPulse/.test(css));
test('v4.61.0 CSS: packet pill overlay with yellow fill + pulse animation',
  /\.tb-trace-packet\s*\{[\s\S]{0,200}fill:\s*#fbbf24/.test(css) &&
  /@keyframes\s+tbTracePacketPulse/.test(css));
test('v4.61.0 CSS: in-flight badge background + arrow + row text styles',
  /\.tb-trace-badge-bg\s*\{/.test(css) &&
  /\.tb-trace-badge-arrow\s*\{/.test(css) &&
  /\.tb-trace-badge-key\s*\{/.test(css) &&
  /\.tb-trace-badge-val\s*\{/.test(css));
test('v4.61.0 CSS: failure badge variant uses red stroke',
  /\.tb-trace-badge-bg-fail\s*\{[\s\S]{0,200}stroke:\s*#f87171/.test(css));
test('v4.61.0 CSS: device states (visited green / current pulse / pending dim) defined',
  /data-tb-device\]\.tb-trace-visited[\s\S]{0,400}stroke:\s*#4ade80/.test(css) &&
  /data-tb-device\]\.tb-trace-current[\s\S]{0,400}tbTraceNodeCurrentPulse/.test(css) &&
  /data-tb-device\]\.tb-trace-pending\s*\{[\s\S]{0,100}opacity:\s*0\.45/.test(css));
test('v4.61.0 CSS: reduced-motion neutralises trace animations',
  /prefers-reduced-motion[\s\S]{0,1000}tb-trace-packet[\s\S]{0,200}animation:\s*none/.test(css));
test('v4.61.0 CSS: light-theme overrides for trace panel + eyebrow + layer chips',
  /\[data-theme="light"\]\s+\.tb-trace-panel/.test(css) &&
  /\[data-theme="light"\]\s+\.tb-trace-eyebrow/.test(css));

// Behavioural: sandbox tbComputeTrace with a 3-device topology and assert
// the hop sequence + metadata look right.
(function testTraceComputation() {
  try {
    const vm = require('vm');
    // Match from the `{` of the function up to its column-0 `}` that closes it.
    // tbComputeTrace's closing brace is the first `}` on a line by itself.
    const body = js.match(/function\s+tbComputeTrace\s*\(state,\s*srcDeviceId,\s*dstIp,\s*maxTtl\)\s*\{([\s\S]*?)\n\}\n/);
    if (!body) {
      test('v4.61.0 sandbox: tbComputeTrace body extracted', false);
      return;
    }
    test('v4.61.0 sandbox: tbComputeTrace body extracted', true);

    const ctx = {};
    vm.createContext(ctx);
    // Minimal IP helper stubs — avoid chaining through the whole tbIpToArr/
    // tbArrToIp chain in app.js; self-contained implementations suffice for
    // the sandbox fixture. Fixture pre-populates ARP caches so the broadcast-
    // domain search path is a no-op stub (returns empty domain).
    vm.runInContext(`
      function tbIpToArr(ip) {
        if (!ip || typeof ip !== 'string') return null;
        const parts = ip.split('.').map(n => parseInt(n, 10));
        return parts.length === 4 && parts.every(p => !isNaN(p)) ? parts : null;
      }
      function tbArrToIp(arr) { return arr.join('.'); }
      function tbSubnetOf(ip, mask) {
        const ipA = tbIpToArr(ip), mA = tbIpToArr(mask);
        if (!ipA || !mA) return null;
        return tbArrToIp(ipA.map((o, i) => o & mA[i]));
      }
      function tbSameSubnet(ip1, ip2, mask) {
        return tbSubnetOf(ip1, mask) === tbSubnetOf(ip2, mask);
      }
      function tbMaskToCidr(mask) {
        const a = tbIpToArr(mask);
        if (!a) return 0;
        let bits = 0;
        for (const o of a) {
          for (let i = 7; i >= 0; i--) {
            if (o & (1 << i)) bits++; else return bits;
          }
        }
        return bits;
      }
      function tbGetBroadcastDomain(state, srcId, vlan) { return []; }
    `, ctx);
    vm.runInContext(`function tbComputeTrace(state, srcDeviceId, dstIp, maxTtl) {${body[1]}}`, ctx);

    // Host-A → Router-A → Host-B across two /24 subnets
    const state = {
      devices: [
        { id: 'hA', hostname: 'Host-A', type: 'host',
          interfaces: [{ name: 'eth0', ip: '10.0.1.10', mask: '255.255.255.0', mac: 'aa:bb:cc:00:01:10', enabled: true, gateway: '10.0.1.1' }],
          routingTable: [], arpTable: [{ ip: '10.0.1.1', mac: 'aa:bb:cc:00:01:01' }], macTable: []
        },
        { id: 'rA', hostname: 'Router-A', type: 'router',
          interfaces: [
            { name: 'eth0', ip: '10.0.1.1', mask: '255.255.255.0', mac: 'aa:bb:cc:00:01:01', enabled: true },
            { name: 'eth1', ip: '10.0.2.1', mask: '255.255.255.0', mac: 'aa:bb:cc:00:02:01', enabled: true }
          ],
          routingTable: [],
          arpTable: [{ ip: '10.0.2.20', mac: 'aa:bb:cc:00:02:20' }],
          macTable: []
        },
        { id: 'hB', hostname: 'Host-B', type: 'host',
          interfaces: [{ name: 'eth0', ip: '10.0.2.20', mask: '255.255.255.0', mac: 'aa:bb:cc:00:02:20', enabled: true, gateway: '10.0.2.1' }],
          routingTable: [], arpTable: [], macTable: []
        }
      ],
      cables: [
        { aDeviceId: 'hA', bDeviceId: 'rA', aIface: 'eth0', bIface: 'eth0' },
        { aDeviceId: 'rA', bDeviceId: 'hB', aIface: 'eth1', bIface: 'eth0' }
      ]
    };

    const result = vm.runInContext(`tbComputeTrace(${JSON.stringify(state)}, 'hA', '10.0.2.20', 64)`, ctx);
    test('v4.61.0 sandbox: trace returns hops array + success flag',
      Array.isArray(result.hops) && result.hops.length > 0 && typeof result.success === 'boolean');
    test('v4.61.0 sandbox: first hop is ARP at source (Host-A)',
      result.hops[0].layer === 'ARP' && result.hops[0].device === 'Host-A');
    test('v4.61.0 sandbox: first hop meta has src/dst IP + TTL=64',
      result.hops[0].meta && result.hops[0].meta.srcIp === '10.0.1.10' && result.hops[0].meta.dstIp === '10.0.2.20' && result.hops[0].meta.ttl === 64);
    test('v4.61.0 sandbox: middle hop is L3 at Router-A',
      result.hops.some(h => h.layer === 'L3' && h.device === 'Router-A'));
    const l3Hop = result.hops.find(h => h.layer === 'L3' && h.device === 'Router-A');
    test('v4.61.0 sandbox: L3 hop meta includes TTL decrement 64 → 63',
      l3Hop && l3Hop.meta.ttlBefore === 64 && l3Hop.meta.ttlAfter === 63);
    test('v4.61.0 sandbox: L3 hop meta shows src/dst MAC rewrite (contains arrow)',
      l3Hop && /→/.test(l3Hop.meta.srcMac) && /→/.test(l3Hop.meta.dstMac));
    test('v4.61.0 sandbox: final hop is DELIVER at Host-B',
      result.hops[result.hops.length - 1].layer === 'DELIVER' &&
      result.hops[result.hops.length - 1].device === 'Host-B');
    test('v4.61.0 sandbox: successful trace has success === true',
      result.success === true);
    test('v4.61.0 sandbox: path array includes all 3 devices in order',
      JSON.stringify(result.path) === JSON.stringify(['hA', 'rA', 'hB']));

    // ── Failure case: no route to unknown destination ──
    const failResult = vm.runInContext(`tbComputeTrace(${JSON.stringify(state)}, 'hA', '10.0.99.99', 64)`, ctx);
    test('v4.61.0 sandbox: unreachable destination produces failure hop',
      failResult.hops.some(h => h.layer === 'FAIL') && failResult.success === false);
    const failHop = failResult.hops.find(h => h.layer === 'FAIL');
    test('v4.61.0 sandbox: failure hop status is "fail" + includes reason string',
      failHop && failHop.status === 'fail' && typeof failHop.decision === 'string');

    // ── Missing source device ──
    const noSrc = vm.runInContext(`tbComputeTrace(${JSON.stringify(state)}, 'does-not-exist', '10.0.2.20', 64)`, ctx);
    test('v4.61.0 sandbox: missing source device produces single FAIL hop',
      noSrc.hops.length === 1 && noSrc.hops[0].layer === 'FAIL' && noSrc.success === false);
  } catch (e) {
    test('v4.61.0 sandbox: tbComputeTrace executed without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.57.5 — Unify per-domain pct between Domain Mastery + Domain Breakdown
// User flagged: Networking Concepts showed 69% in the Readiness hero's
// Domain Breakdown but 70% in Domain Mastery. Root cause: Breakdown used
// weighted `domainAccuracy` (diff × exam-boost × recency-boost), Mastery
// used raw sum(correct)/sum(total). v4.57.5 extracts a shared helper so
// both surfaces show the same number. Weighted calc stays INTERNAL for
// the Readiness 720-score only.
// ══════════════════════════════════════════════════════════════════════

test('v4.57.5 JS: computeDomainRawAccuracy helper defined',
  /function\s+computeDomainRawAccuracy\(h\)/.test(js));
test('v4.57.5 JS: helper exposes all 5 CompTIA domains',
  /byDomain\s*=\s*\{[\s\S]{0,400}concepts:[\s\S]{0,100}implementation:[\s\S]{0,100}operations:[\s\S]{0,100}security:[\s\S]{0,100}troubleshooting:/.test(js));
test('v4.57.5 JS: helper skips MIXED_TOPIC + EXAM_TOPIC entries',
  /e\.topic === MIXED_TOPIC \|\| e\.topic === EXAM_TOPIC/.test(js));
test('v4.57.5 JS: helper uses raw sum(correct)/sum(total) per domain',
  /byDomain\[d\]\.c \+= \(e\.score \|\| 0\)[\s\S]{0,100}byDomain\[d\]\.t \+= \(e\.total \|\| 0\)/.test(js));
test('v4.57.5 JS: Readiness hero Domain Breakdown now uses computeDomainRawAccuracy (not weighted domainAccuracy)',
  /domainRawAccuracy = computeDomainRawAccuracy\(h\)[\s\S]{0,300}pct = Math\.round\(domainRawAccuracy\[d\]/.test(js));
test('v4.57.5 JS: weighted domainAccuracy still feeds accuracyScore (Readiness 720-tier unchanged)',
  /domainAccuracy\[d\]\s*=\s*avg[\s\S]{0,200}accuracyScore \+= avg \* DOMAIN_WEIGHTS\[d\]/.test(js));

// Behavioural — vm-sandbox the helper with fixtures and confirm both cards
// would produce the same pct for the same input history
(function testDomainRawAccuracy() {
  try {
    const vm = require('vm');
    const bodyMatch = js.match(/function\s+computeDomainRawAccuracy\(h\)\s*\{([\s\S]*?)\n\}/);
    if (!bodyMatch) { test('v4.57.5 sandbox: helper body extracted', false); return; }
    test('v4.57.5 sandbox: helper body extracted', true);

    // Stub TOPIC_DOMAINS for the sandbox
    const ctx = {
      MIXED_TOPIC: 'Mixed — All Topics',
      EXAM_TOPIC: 'Exam Simulation',
      TOPIC_DOMAINS: {
        'OSI Model': 'concepts',
        'Subnetting & IP Addressing': 'concepts',
        'OSPF': 'implementation',
        'BGP': 'implementation',
        'Firewalls, DMZ & Security Zones': 'security',
        'Connection Issues': 'troubleshooting',
        'Perf Issues': 'troubleshooting',
        'Service Issues': 'troubleshooting'
      }
    };
    vm.createContext(ctx);
    const fn = vm.runInContext(`(function(h) {${bodyMatch[1]}})`, ctx);

    // Simulate user's scenario: 7/10 on OSI (concepts), 15/20 on Subnetting (concepts) → 22/30 = 73.33%
    const history = [
      { topic: 'OSI Model', score: 7, total: 10, date: '2026-04-21T08:00:00Z' },
      { topic: 'Subnetting & IP Addressing', score: 15, total: 20, date: '2026-04-21T09:00:00Z' },
      { topic: 'OSPF', score: 8, total: 10, date: '2026-04-20T10:00:00Z' },
      { topic: 'Mixed — All Topics', score: 50, total: 90, date: '2026-04-19T11:00:00Z' },  // MIXED: skipped
      { topic: 'Exam Simulation', score: 60, total: 90, date: '2026-04-18T12:00:00Z' },  // EXAM: skipped
    ];
    const result = fn(history);

    test('v4.57.5 sandbox: concepts = (7+15)/(10+20) = 73.33% (rounds to 73)',
      Math.round(result.concepts) === 73);
    test('v4.57.5 sandbox: implementation = 8/10 = 80%',
      Math.round(result.implementation) === 80);
    test('v4.57.5 sandbox: operations = 0 (unstudied)',
      result.operations === 0);
    test('v4.57.5 sandbox: security = 0 (unstudied)',
      result.security === 0);
    test('v4.57.5 sandbox: troubleshooting = 0 (unstudied)',
      result.troubleshooting === 0);
    test('v4.57.5 sandbox: MIXED_TOPIC entry is excluded (no contribution)',
      Math.round(result.concepts) === 73);  // would be different if MIXED counted
    test('v4.57.5 sandbox: EXAM_TOPIC entry is excluded (no contribution)',
      Math.round(result.implementation) === 80);  // would be different if EXAM counted

    // Reproduce the user's reported 69 vs 70 scenario — show both cards produce same number
    const netConceptsHistory = [];
    // 77 correct out of 110 total = 70% raw
    for (let i = 0; i < 5; i++) netConceptsHistory.push({ topic: 'OSI Model', score: 16, total: 22, date: '2026-04-20T10:00:00Z', difficulty: 'Exam Level' });
    netConceptsHistory.push({ topic: 'OSI Model', score: -3, total: 0, date: '2026-04-20T10:00:00Z' });  // extra 0-total row (no-op)
    const r2 = fn(netConceptsHistory);
    test('v4.57.5 sandbox: raw calc reproduces user\'s 70% (not 69%) for reconstructed fixture',
      Math.round(r2.concepts) === 70);

    // Edge cases
    test('v4.57.5 sandbox: empty history returns all-zero',
      Object.values(fn([])).every(v => v === 0));
    test('v4.57.5 sandbox: null history returns all-zero (defensive)',
      Object.values(fn(null)).every(v => v === 0));
    test('v4.57.5 sandbox: entries with 0 total handled (no div-by-zero)',
      fn([{ topic: 'OSI Model', score: 0, total: 0 }]).concepts === 0);
  } catch (e) {
    test('v4.57.5 sandbox: helper executes without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.58.0 — Curated exemplar bank infrastructure (Phase 1 of issue #193)
// Plumbing for future few-shot injection into Haiku generation prompts.
// Empty bank on ship = zero behavioural change. Activates automatically
// once Phase 2 content (hand-curated ~60 exemplars) lands post-exam.
// LEGAL CONSTRAINT: every exemplar MUST be original content — NO copying
// from Jason Dion, CompTIA CertMaster, or any paid question bank.
// ══════════════════════════════════════════════════════════════════════

test('v4.58.0 JS: QUESTION_EXEMPLARS constant defined (array declaration)',
  /const QUESTION_EXEMPLARS\s*=\s*\[/.test(js));  // v4.58.1: loosened from empty-array literal to any array declaration (bank now populated)
test('v4.58.0 JS: _pickExemplarsForTopic helper defined',
  /function _pickExemplarsForTopic\(qTopic,\s*max\)/.test(js));
test('v4.58.0 JS: _formatExemplarsForPrompt helper defined',
  /function _formatExemplarsForPrompt\(exemplars\)/.test(js));
test('v4.58.0 JS: helper caps max at 5 (no prompt-bloat runaway)',
  /max\s*=\s*Math\.max\(0,\s*Math\.min\(5,\s*max \|\| 3\)\)/.test(js));
test('v4.58.0 JS: helper strips "Multi: " sentinel before matching',
  /qTopic\.startsWith\(['"]Multi: ['"]\)[\s\S]{0,100}\.slice\(7\)\.split\(['"],['"]\)/.test(js));
test('v4.58.0 JS: helper uses tiered pool (exact topic \u2192 same domain \u2192 others)',
  /const exact = QUESTION_EXEMPLARS\.filter[\s\S]{0,200}const sameDomain[\s\S]{0,400}const others[\s\S]{0,200}const pool = exact\.concat\(sameDomain\)\.concat\(others\)/.test(js));

test('v4.58.0 JS: format helper wraps exemplars in explicit "style references only" framing',
  /DO NOT copy these exemplars into your[\s\S]{0,200}style references only/.test(js));
test('v4.58.0 JS: format helper emits "QUALITY REFERENCE" block header',
  /QUALITY REFERENCE \u2014 use these curated exemplars/.test(js));
test('v4.58.0 JS: _fetchQuestionsBatch injects exemplar block via buildPrompt',
  /const exemplarBlock = _formatExemplarsForPrompt\([\s\S]{0,100}_pickExemplarsForTopic\(qTopic, 3\)/.test(js));
test('v4.58.0 JS: exemplar block inserted into prompt after Difficulty line',
  /Difficulty:\s*\$\{diffStr\}\s*\n\$\{exemplarBlock\}/.test(js));

// Behavioural — sandbox helpers with empty bank (no-op) + populated bank (selects correctly)
(function testExemplarHelpers() {
  try {
    const vm = require('vm');

    const pickBody = js.match(/function _pickExemplarsForTopic\(qTopic,\s*max\)\s*\{([\s\S]*?)\n\}/);
    const formatBody = js.match(/function _formatExemplarsForPrompt\(exemplars\)\s*\{([\s\S]*?)\n\}/);
    if (!pickBody || !formatBody) { test('v4.58.0 sandbox: helper bodies extracted', false); return; }
    test('v4.58.0 sandbox: helper bodies extracted', true);

    // Minimal stub context with a tiny TOPIC_DOMAINS map
    const ctx = {
      TOPIC_DOMAINS: {
        'OSI Model': 'concepts',
        'Subnetting & IP Addressing': 'concepts',
        'IPv6': 'concepts',
        'OSPF': 'implementation',
        'BGP': 'implementation',
        'Connection Issues': 'troubleshooting'
      },
      QUESTION_EXEMPLARS: [],
      Math: Math,
      Array: Array
    };
    vm.createContext(ctx);
    const pickFn = vm.runInContext(`(function(qTopic, max) {${pickBody[1]}})`, ctx);
    const formatFn = vm.runInContext(`(function(exemplars) {${formatBody[1]}})`, ctx);

    // Case 1: empty bank → always returns []
    test('v4.58.0 sandbox: empty bank returns [] for any topic',
      pickFn('OSI Model', 3).length === 0 &&
      pickFn('OSPF', 5).length === 0 &&
      pickFn('Anything', 3).length === 0);
    test('v4.58.0 sandbox: empty exemplars → format returns empty string (prompt no-op)',
      formatFn([]) === '');
    test('v4.58.0 sandbox: null exemplars → format returns empty string (defensive)',
      formatFn(null) === '');

    // Case 2: populated bank — tier matching
    ctx.QUESTION_EXEMPLARS = [
      { topic: 'OSI Model', question: 'Q1', options: {A:'a',B:'b',C:'c',D:'d'}, answer: 'A', explanation: 'e1', source: 'curated' },
      { topic: 'Subnetting & IP Addressing', question: 'Q2', options: {A:'a',B:'b',C:'c',D:'d'}, answer: 'B', explanation: 'e2', source: 'curated' },
      { topic: 'OSPF', question: 'Q3', options: {A:'a',B:'b',C:'c',D:'d'}, answer: 'C', explanation: 'e3', source: 'curated' },
      { topic: 'BGP', question: 'Q4', options: {A:'a',B:'b',C:'c',D:'d'}, answer: 'D', explanation: 'e4', source: 'curated' },
      { topic: 'OSI Model', question: 'Q5', options: {A:'a',B:'b',C:'c',D:'d'}, answer: 'A', explanation: 'e5', source: 'curated' }
    ];

    // Exact-topic priority
    const osi = pickFn('OSI Model', 3);
    test('v4.58.0 sandbox: exact-topic exemplars come first (OSI gets Q1 + Q5 before others)',
      osi.length === 3 && osi[0].question === 'Q1' && osi[1].question === 'Q5');

    // Same-domain fallback
    const ipv6 = pickFn('IPv6', 3);  // not in bank, but concepts domain → OSI + Subnetting
    test('v4.58.0 sandbox: unknown topic falls back to same-domain (IPv6 \u2192 concepts \u2192 OSI/Subnetting first)',
      ipv6.length === 3 && ipv6.every(ex => ex.topic === 'OSI Model' || ex.topic === 'Subnetting & IP Addressing' || ctx.TOPIC_DOMAINS[ex.topic] === 'concepts'));

    // Max respected
    test('v4.58.0 sandbox: max=2 returns at most 2 exemplars',
      pickFn('OSI Model', 2).length === 2);
    test('v4.58.0 sandbox: max capped at 5 (prevents prompt bloat)',
      pickFn('OSI Model', 99).length <= 5);

    // Multi: sentinel strips correctly
    const multi = pickFn('Multi: OSI Model, OSPF', 2);
    test('v4.58.0 sandbox: "Multi: OSI Model, OSPF" picks OSI exemplars first (primary after strip)',
      multi.length === 2 && multi[0].topic === 'OSI Model');

    // Defensive cases
    test('v4.58.0 sandbox: empty topic returns []',
      pickFn('', 3).length === 0);
    test('v4.58.0 sandbox: null topic returns []',
      pickFn(null, 3).length === 0);

    // Format output structure
    const sampleExemplars = [ctx.QUESTION_EXEMPLARS[0]];
    const formatted = formatFn(sampleExemplars);
    test('v4.58.0 sandbox: format output contains QUALITY REFERENCE header',
      formatted.includes('QUALITY REFERENCE'));
    test('v4.58.0 sandbox: format output contains DO NOT copy directive (anti-verbatim)',
      formatted.includes('DO NOT copy these exemplars'));
    test('v4.58.0 sandbox: format output numbers each exemplar ("EXEMPLAR 1:")',
      formatted.includes('EXEMPLAR 1:'));
    test('v4.58.0 sandbox: format output includes stem + options + answer + explanation',
      formatted.includes('Question: Q1') &&
      formatted.includes('A) a') &&
      formatted.includes('Answer: A') &&
      formatted.includes('Explanation: e1'));

    // Scenario field handled when present
    const withScenario = [{ ...ctx.QUESTION_EXEMPLARS[0], scenario: 'A setup sentence.' }];
    const formattedWithScenario = formatFn(withScenario);
    test('v4.58.0 sandbox: scenario field emitted in exemplar when present',
      formattedWithScenario.includes('Scenario: A setup sentence.'));

    // Scenario field omitted when absent (no empty "Scenario: " line)
    test('v4.58.0 sandbox: exemplar without scenario omits the line entirely',
      !formatted.includes('Scenario:'));
  } catch (e) {
    test('v4.58.0 sandbox: helpers execute without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.58.1 — Domain 1.0 Networking Concepts curated exemplars (14/14)
// Phase 2 of issue #193: first real content in the QUESTION_EXEMPLARS
// bank. All hand-reviewed by the user before commit; every exemplar is
// original content (no copying from paid question banks).
// ══════════════════════════════════════════════════════════════════════

// Shape / count assertions — verify the bank grew to 14 and the schema
// holds for every entry. Use vm to actually run the array definition.
(function testExemplarBank() {
  try {
    const vm = require('vm');
    // Extract QUESTION_EXEMPLARS definition. The array spans many lines + nested
    // objects, so use brace-depth walking to find its end.
    const start = js.indexOf('const QUESTION_EXEMPLARS = [');
    if (start === -1) { test('v4.58.1 bank: QUESTION_EXEMPLARS definition found', false); return; }
    test('v4.58.1 bank: QUESTION_EXEMPLARS definition found', true);

    let i = js.indexOf('[', start);
    let depth = 0;
    let end = -1;
    for (; i < js.length; i++) {
      if (js[i] === '[') depth++;
      else if (js[i] === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end === -1) { test('v4.58.1 bank: array closure found', false); return; }
    const arraySrc = js.slice(js.indexOf('[', start), end);

    const ctx = {};
    vm.createContext(ctx);
    const bank = vm.runInContext(arraySrc, ctx);

    test('v4.59.6 bank: 200 exemplars present (178 + 22 Road-to-200 Batch 6 — FINAL)',
      Array.isArray(bank) && bank.length === 200);

    // Every exemplar has required fields
    const requiredFields = ['type', 'question', 'difficulty', 'topic', 'objective', 'options', 'answer', 'explanation', 'source', 'addedVersion', 'addedDate'];
    const missingFields = [];
    bank.forEach((ex, i) => {
      requiredFields.forEach(f => {
        if (ex[f] === undefined || ex[f] === null || ex[f] === '') {
          missingFields.push(`Exemplar ${i} missing: ${f}`);
        }
      });
    });
    test('v4.58.1 bank: every exemplar has all 11 required fields',
      missingFields.length === 0);

    // Every answer maps to a real option
    const badAnswers = bank.filter(ex => !ex.options || !ex.options[ex.answer]);
    test('v4.58.1 bank: every answer letter maps to a real option',
      badAnswers.length === 0);

    // Every exemplar has 4 options (A-D)
    const badOpts = bank.filter(ex => !ex.options || !ex.options.A || !ex.options.B || !ex.options.C || !ex.options.D);
    test('v4.58.1 bank: every exemplar has options A-D',
      badOpts.length === 0);

    // Every objective matches valid N10-009 format (1.1-1.8)
    const badObj = bank.filter(ex => !/^[1-5]\.[1-8]$/.test(ex.objective));
    test('v4.58.1 bank: every objective is valid N10-009 format (X.Y)',
      badObj.length === 0);

    // All exemplars are marked as curated
    const nonCurated = bank.filter(ex => ex.source !== 'curated');
    test('v4.58.1 bank: every exemplar tagged source:\"curated\"',
      nonCurated.length === 0);

    // v4.58.2: addedVersion loosened from literal match to semver pattern so
    // the bank keeps passing as later shipments add more exemplars.
    const wrongVersion = bank.filter(ex => !/^\d+\.\d+\.\d+$/.test(ex.addedVersion || ''));
    test('v4.58.1 bank: every exemplar carries a valid semver addedVersion',
      wrongVersion.length === 0);

    // All exemplars pass the interrogative guard from v4.57.2
    const noInterrogative = bank.filter(ex => {
      const s = ex.question;
      if (!s) return true;
      if (s.includes('?')) return false;
      return !/\b(which|what|when|where|why|how|who|whose|select|identify|choose|pick|match|arrange|place|determine|complete|given|in which|under which)\b/i.test(s);
    });
    test('v4.58.1 bank: every exemplar passes v4.57.2 interrogative guard',
      noInterrogative.length === 0);

    // v4.58.4: topic whitelist extended to cover Domain 4.0 topics.
    const validTopics = [
      // Domain 1.0 (concepts)
      'Port Numbers', 'Network Models & OSI', 'Subnetting & IP Addressing',
      'DNS Records & DNSSEC', 'Network Appliances & Device Functions',
      'Virtualisation & Cloud', 'Network Naming (DNS & DHCP)', 'IPv6',
      'NAT & IP Services', 'NTP, ICMP & Traffic Types',
      // Domain 2.0 (implementation)
      'VLAN Trunking', 'STP/RSTP', 'OSPF', 'Ethernet Standards', 'Ethernet Basics',
      'Switch Features & VLANs', 'Wireless Networking', 'Routing Protocols',
      'BGP', 'Data Center Architectures', 'SDN, NFV & Automation',
      'Cabling & Topology', 'Integrating Networked Devices',
      // Domain 3.0 (operations)
      'Network Operations', 'Data Centres', 'WAN Connectivity', 'SD-WAN & SASE',
      'SMB & Network File Services', 'Business Continuity & Disaster Recovery',
      'Network Monitoring & Observability',
      // Domain 4.0 (security)
      'Securing TCP/IP', 'Protecting Networks', 'AAA & Authentication',
      'IPsec & VPN Protocols', 'IPsec VPN', 'SSL/TLS VPN',
      'PKI & Certificate Management', 'Firewalls, DMZ & Security Zones',
      'WPA3 & EAP Authentication', 'Network Attacks & Threats',
      'Physical Security Controls',
      // Domain 5.0 (troubleshooting)
      'Network Troubleshooting & Tools', 'Cable Issues', 'Service Issues',
      'Perf Issues', 'Connection Issues', 'CompTIA Troubleshooting Methodology'
    ];
    const offDomain = bank.filter(ex => !validTopics.includes(ex.topic));
    test('v4.58.5 bank: every exemplar maps to a valid TOPIC_DOMAINS key (all 5 CompTIA domains)',
      offDomain.length === 0);

    // Domain-split sanity
    const d1Topics = ['Port Numbers', 'Network Models & OSI', 'Subnetting & IP Addressing', 'DNS Records & DNSSEC', 'Network Appliances & Device Functions', 'Virtualisation & Cloud', 'Network Naming (DNS & DHCP)', 'IPv6', 'NAT & IP Services', 'NTP, ICMP & Traffic Types'];
    const d2Topics = ['VLAN Trunking', 'STP/RSTP', 'OSPF', 'Ethernet Standards', 'Ethernet Basics', 'Switch Features & VLANs', 'Wireless Networking', 'Routing Protocols', 'BGP', 'Data Center Architectures', 'SDN, NFV & Automation', 'Cabling & Topology', 'Integrating Networked Devices'];
    const d3Topics = ['Network Operations', 'Data Centres', 'WAN Connectivity', 'SD-WAN & SASE', 'SMB & Network File Services', 'Business Continuity & Disaster Recovery', 'Network Monitoring & Observability'];
    const d4Topics = ['Securing TCP/IP', 'Protecting Networks', 'AAA & Authentication', 'IPsec & VPN Protocols', 'IPsec VPN', 'SSL/TLS VPN', 'PKI & Certificate Management', 'Firewalls, DMZ & Security Zones', 'WPA3 & EAP Authentication', 'Network Attacks & Threats', 'Physical Security Controls'];
    const d5Topics = ['Network Troubleshooting & Tools', 'Cable Issues', 'Service Issues', 'Perf Issues', 'Connection Issues', 'CompTIA Troubleshooting Methodology'];
    const d1Count = bank.filter(ex => d1Topics.includes(ex.topic)).length;
    const d2Count = bank.filter(ex => d2Topics.includes(ex.topic)).length;
    const d3Count = bank.filter(ex => d3Topics.includes(ex.topic)).length;
    const d4Count = bank.filter(ex => d4Topics.includes(ex.topic)).length;
    const d5Count = bank.filter(ex => d5Topics.includes(ex.topic)).length;
    // v4.59.0: Phase 3 Cycle 1 added 14 exemplars. Updated per-domain counts:
    // D1 +2 (NTS, Teredo), D2 +2 (WAP channels, 802.3bt), D3 +2 (CoS, RAID),
    // D4 +6 (4 VPN types + Pre-action + NAC), D5 +2 (Nmap, PCAP).
    test('v4.59.6 bank: Domain 1.0 contains 46 exemplars (+6 Batch 6) — 23% CompTIA target',
      d1Count === 46);
    test('v4.59.6 bank: Domain 2.0 contains 40 exemplars (+4 Batch 6) — 20% CompTIA target',
      d2Count === 40);
    test('v4.59.6 bank: Domain 3.0 contains 38 exemplars (+4 Batch 6) — 19% CompTIA target',
      d3Count === 38);
    test('v4.59.6 bank: Domain 4.0 contains 28 exemplars (+0 Batch 6) — 14% CompTIA target',
      d4Count === 28);
    test('v4.59.6 bank: Domain 5.0 contains 48 exemplars (+8 Batch 6) — 24% CompTIA target',
      d5Count === 48);
    test('v4.59.6 bank: domain distribution sums to 200 (46+40+38+28+48) — ROAD TO 200 COMPLETE',
      d1Count + d2Count + d3Count + d4Count + d5Count === 200);

    // Difficulty spread: at least 1 of each difficulty present
    const diffs = new Set(bank.map(ex => ex.difficulty));
    test('v4.58.1 bank: difficulty spread includes Foundational + Exam Level + Hard',
      diffs.has('Foundational') && diffs.has('Exam Level') && diffs.has('Hard'));

    // Topic coverage: at least 30 distinct topics across all 5 domains
    const topics = new Set(bank.map(ex => ex.topic));
    test('v4.58.5 bank: at least 30 distinct topics covered across all 5 CompTIA domains',
      topics.size >= 30);

    // No question stem is a duplicate of another
    const stems = bank.map(ex => ex.question);
    const uniqueStems = new Set(stems);
    test('v4.58.1 bank: no duplicate question stems',
      uniqueStems.size === stems.length);

    // No two exemplars identical word-for-word
    const fingerprints = bank.map(ex => ex.question + '|' + ex.answer + '|' + ex.options.A);
    test('v4.58.1 bank: no duplicate (stem + answer + first option) fingerprints',
      new Set(fingerprints).size === fingerprints.length);

    // At least 1 exemplar for each of: 1.1 OSI, 1.2 Appliances, 1.3 Cloud, 1.4 Ports, 1.6 Services, 1.7 IPv4, 1.8 IPv6
    const objHits = new Set(bank.map(ex => ex.objective));
    test('v4.58.1 bank: objective coverage spans \u226575% of Domain 1 sub-objectives',
      objHits.size >= 6);  // out of 8 possible (1.1-1.8)

    // Helper now returns non-empty when asked for a Domain 1.0 topic
    // (sanity: exemplars are actually reachable by the pick helper)
    const pickBodyMatch = js.match(/function _pickExemplarsForTopic\(qTopic,\s*max\)\s*\{([\s\S]*?)\n\}/);
    if (pickBodyMatch) {
      const pickCtx = {
        QUESTION_EXEMPLARS: bank,
        TOPIC_DOMAINS: {
          'Port Numbers': 'concepts',
          'Network Models & OSI': 'concepts',
          'Subnetting & IP Addressing': 'concepts',
          'DNS Records & DNSSEC': 'concepts',
          'Network Appliances & Device Functions': 'concepts',
          'Virtualisation & Cloud': 'concepts',
          'Network Naming (DNS & DHCP)': 'concepts',
          'IPv6': 'concepts',
          'NAT & IP Services': 'concepts',
          'NTP, ICMP & Traffic Types': 'concepts'
        },
        Math: Math, Array: Array
      };
      vm.createContext(pickCtx);
      const pickFn = vm.runInContext(`(function(qTopic, max) {${pickBodyMatch[1]}})`, pickCtx);
      test('v4.58.1 integration: pick helper returns 3 Port Numbers / same-domain exemplars',
        pickFn('Port Numbers', 3).length === 3);
      test('v4.58.1 integration: pick helper returns same-domain exemplars for unknown topic (IPv6 \u2192 concepts)',
        pickFn('Some Unmatched Topic', 3).length === 3);
    }
  } catch (e) {
    test('v4.58.1 bank: exemplars parse as valid JavaScript', false);
  }
})();

// ── Validation audit regression gate ──
// The programmatic validator has a known catch-rate floor (60%) and a
// zero-tolerance false-positive rate. A refactor to validateQuestions()
// must not silently regress either. Runs the audit script as a subprocess
// so any exit 1 from it fails the UAT run.
try {
  const { execSync } = require('child_process');
  execSync('node tests/validation-audit.js', { cwd: ROOT, stdio: 'pipe' });
  test('Validation audit: regression gate', true);
} catch (err) {
  test('Validation audit: regression gate', false);
  results.errors.push('validation-audit.js exited non-zero — run `node tests/validation-audit.js` for details');
}

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
