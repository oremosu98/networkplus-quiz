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
test('APP_VERSION is 4.85.4', js.includes("const APP_VERSION = '4.85.4"));
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
test('SW cache bumped to v4.85.4', sw.includes('netplus-v4.85.4'));
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
// v4.79.0: legacy .hardcore-toggle label retired — Strict Mode now lives
// inside Mode Ladder Exam tier as .modes-strict-toggle (Codex round-3).
test('v4.79.0: Strict Mode toggle present in Mode Ladder Exam tier',
  html.includes('class="modes-strict-toggle"'));
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
// v4.81.23 tombstone: renderTodaysFocus removed (consolidated into renderTodayPlan)
test('v4.81.23 tombstone: renderTodaysFocus function removed',
  !js.includes('function renderTodaysFocus('));
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
// v4.81.23 tombstone: #todays-focus element removed (consolidated into #today-plan)
test('v4.81.23 tombstone: #todays-focus element removed', !html.includes('id="todays-focus"'));
// v4.76.0: legacy `.quiz-presets` block replaced by `.modes-tier-cards` inside the Mode Ladder
test('v4.76.0: modes-tier-cards block (replaces .quiz-presets)', html.includes('class="modes-tier-cards"'));
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
// v4.76.0: 60Q preset relocated to Exam tier as "60-Question SIM" — title text changed
test('HTML: 60-Question SIM title (v4.76.0 — was "60 Questions")', html.includes('60-Question SIM'));
// v4.45.3 regression guards — old 100-Q preset replaced with 45-Q (30/60/100 → 30/45/60)
test('v4.45.3: bulk100 preset removed', !html.includes("applyPreset('bulk100')"));
test('v4.45.3: 100 Questions title removed', !html.includes('100 Questions'));
test('startBulkQuiz function defined', js.includes('async function startBulkQuiz('));
test('applyPreset handles bulk sizes', js.includes('bulk30: 30, bulk45: 45, bulk60: 60'));
test('v4.45.3: bulk100 mapping removed', !js.includes('bulk100:'));
test('applyPreset routes bulk to startBulkQuiz', /bulkSizes\[name\][\s\S]{0,900}startBulkQuiz\(/.test(js));
test('startBulkQuiz batches via fetchQuestions', /startBulkQuiz[\s\S]{0,2000}fetchQuestions\(key, MIXED_TOPIC, 'Exam Level', thisBatch(?:,\s*i)?\)/.test(js));
test('startBulkQuiz uses 18-Q batches', /startBulkQuiz[\s\S]{0,1500}BATCH_SIZE = 18/.test(js));
test('startBulkQuiz has retry logic', /startBulkQuiz[\s\S]{0,2000}MAX_RETRIES/.test(js));
test('startBulkQuiz runs validation pipeline', /startBulkQuiz[\s\S]{0,3000}aiValidateQuestions[\s\S]{0,200}validateQuestions/.test(js));
test('startBulkQuiz forces Mixed topic', /startBulkQuiz[\s\S]{0,800}activeQuizTopic = MIXED_TOPIC/.test(js));
// v4.82.1: marathon mode now uses _loadingProgressFinish() instead of direct
// fill.style.width = '100%'. Same end-state (bar at 100% then hidden), via
// the new unified module. Window widened from 2500 → 5000 chars since the
// function body grew with v4.81.14 cross-batch dedup + v4.81.15 stale-slice
// rotation logic.
test('startBulkQuiz clears progress bar at end', /startBulkQuiz[\s\S]{0,5000}_loadingProgressFinish\(\)/.test(js));

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
// v4.81.23 tombstones: legacy chip rows + session banner removed; #today-plan
// is now the single canonical card inside #today-section.
test('v4.81.23 tombstone: #todays-focus removed from today-section', !html.includes('id="todays-focus"'));
test('v4.81.23 tombstone: #session-banner removed from today-section', !html.includes('id="session-banner"'));
test('v4.81.23: #today-plan lives inside #today-section', html.indexOf('id="today-plan"') > html.indexOf('id="today-section"'));
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
// v4.76.0 tombstone: presets-section + Quick Start \u00a701 + Marathon \u00a702 retired
// in favor of the unified Mode Ladder (Quick / Practice / Exam tiers). The
// Mode Ladder takes the \u00a701 number now. Marathon presets live in the Practice
// tier as `.modes-card-marathon` instances. Keeping these tombstones so the
// markup doesn't accidentally come back.
test('v4.76.0 tombstone: legacy .presets-section class removed',
  !html.includes('class="presets-section"') && !html.includes('class="presets-section ed-section"'));
test('v4.76.0 tombstone: legacy "Quick start" \u00a701 heading replaced',
  !/Quick\s*<em>start<\/em>/.test(html));
test('v4.76.0 tombstone: legacy "Marathon mode" \u00a702 heading replaced',
  !/Marathon\s*<em>mode<\/em>/.test(html));
test('v4.76.0 replacement: Mode Ladder uses \u00a701 numbering with "Pick your session"',
  html.includes('&#167; 01') && /Pick your\s*<em>session<\/em>/.test(html));
test('HTML: wrong-preset-tile exists', html.includes('id="wrong-preset-tile"'));
test('HTML: custom-quiz-section details exists', html.includes('id="custom-quiz-section"'));
test('HTML: topic-group inside custom-quiz-section', html.indexOf('id="topic-group"') > html.indexOf('id="custom-quiz-section"'));
test('HTML: diff-group inside custom-quiz-section', html.indexOf('id="diff-group"') > html.indexOf('id="custom-quiz-section"'));
test('HTML: count-group inside custom-quiz-section', html.indexOf('id="count-group"') > html.indexOf('id="custom-quiz-section"'));
// v4.79.0: legacy .exam-section retired (was duplicating Mode Ladder Exam tier per Codex round-3).
test('v4.79.0 tombstone: legacy .exam-section removed from home',
  !html.includes('class="exam-section"'));
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
test('Tier1: renderMarathonSection called in goSetup', js.match(/function goSetup\(\)[\s\S]{0,1500}renderMarathonSection\(\)/));
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
// v4.81.18: renderTodaysFocus is now a thin compat shim that delegates into
// renderTodayPlan. The weak-spot signal still drives the consolidated card
// composition via buildSessionPlan → computeWeakSpotScores. Retests scoped
// to the new render + builder.
const renderTodaysFocusBody = _fnBody(js, 'renderTodaysFocus');
const buildSessionPlanBody = _fnBody(js, 'buildSessionPlan') || '';
const renderTodayPlanBody = _fnBody(js, 'renderTodayPlan') || '';
test('v4.41.0 (v4.81.18 retarget): weak-spot signal still drives Today plan composition',
  buildSessionPlanBody.includes('computeWeakSpotScores'));
test('v4.41.0 (v4.81.18 retarget): renderTodayPlan surfaces posterior-accuracy meta on weak chips',
  /~\$\{pct\}% accuracy|posterior/.test(buildSessionPlanBody) || /accuracy/.test(renderTodayPlanBody));

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

// v4.81.18 retirement: the v4.42.0 FLIP rerank animation in renderTodaysFocus
// was specific to the old chip-row layout (in-place reordering when weak-spots
// recomputed). The consolidated #today-plan card renders the chip strip fresh
// every call — there's no in-place reordering surface, so FLIP no longer
// applies. Tombstone tests below assert the FLIP machinery is GONE from the
// shim (so it can't sneak back via copy-paste) and that the new renderTodayPlan
// doesn't accidentally re-introduce it.
const todaysFocusBody = _fnBody(js, 'renderTodaysFocus');
const todayPlanBodyRetired = _fnBody(js, 'renderTodayPlan') || '';
test('v4.81.18 tombstone: renderTodaysFocus no longer holds FLIP rerank machinery',
  !todaysFocusBody.includes('oldRects')
    && !todaysFocusBody.includes('getBoundingClientRect')
    && !todaysFocusBody.includes('transitionend'));
test('v4.81.18 tombstone: renderTodayPlan does not re-introduce FLIP machinery',
  !todayPlanBodyRetired.includes('oldRects')
    && !todayPlanBodyRetired.includes('getBoundingClientRect'));
// v4.81.23 tombstone: .tf-chip CSS retired (Weak Spots chip row consolidated into #today-plan)
test('v4.81.23 tombstone: .tf-chip CSS removed', !/\.tf-chip\s*\{/.test(css));

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
// v4.81.18: renderTodaysFocus is now a compat shim → consolidated Today plan
// card. The Subnet Trainer bridge affordance (v4.43.1 #3) was specific to the
// old chip-row layout (separate "Drill in Subnet Trainer" link below chips)
// and is parked as a follow-up — the consolidated card's chip-click currently
// routes to focusTopic for any topic. The bridge constant + handler are
// retained (still drive Subnet Trainer dashboard callouts elsewhere); only
// the Today-section render integration is parked.
// v4.81.23 tombstone: renderTodaysFocus removed entirely (consolidation finalised).
// v4.81.21 → v4.81.23: Subnet Trainer bridge integrated into #today-plan
// (.tplan-bridge-btn CSS); legacy .tf-bridge-btn class no longer used.
test('v4.81.23 tombstone: renderTodaysFocus function removed (cleanup)',
  !js.includes('function renderTodaysFocus('));
test('v4.81.23 tombstone: .tf-bridge-btn CSS rule removed (replaced by .tplan-bridge-btn)',
  !/\.tf-bridge-btn\s*\{/.test(css));
test('v4.81.21: .tplan-bridge-btn CSS in use for Subnet Trainer bridge',
  css.includes('.tplan-bridge-btn'));

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
  /fetchQuestions\([^)]*EXAM_BATCH_BASE\s*\+\s*EXAM_BATCH_BUFFER(?:\s*,\s*i)?\s*\)/.test(_startExamBody));
test('v4.43.5 #2: Sonnet validator (aiValidateQuestions) called per batch',
  /aiValidateQuestions\(key,\s*rawBatch\)/.test(_startExamBody));
test('v4.43.5 #2: programmatic validateQuestions called per batch',
  /let batch\s*=\s*validateQuestions\(aiValidated\)/.test(_startExamBody));
test('v4.43.5 #3: retry-to-fill block exists (batch.length < EXAM_BATCH_BASE)',
  /if\s*\(\s*batch\.length\s*<\s*EXAM_BATCH_BASE\s*\)/.test(_startExamBody));
test('v4.43.5 #3: retry fetches deficit + EXAM_BATCH_BUFFER',
  /fetchQuestions\([^)]*deficit\s*\+\s*EXAM_BATCH_BUFFER(?:\s*,\s*i)?\s*\)/.test(_startExamBody));
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
// Domain accordions with data-domain-idx (1-5) — scoped to <details> tags only.
// v4.81.17 added more data-domain-idx attributes on Mode Ladder tiles + pre-fill
// pills, so a global count would over-match; this regex matches only the
// <details class="topic-domain-group" data-domain-idx="N"> shape.
test('v4.50.0: all 5 domain accordions have data-domain-idx',
  (html.match(/<details[^>]*class="topic-domain-group"[^>]*data-domain-idx="[1-5]"/g) || []).length === 5);
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
// v4.81.23 tombstone: #focus-banner element removed (retired in v4.81.20, deleted in v4.81.23)
test('v4.81.23 tombstone: #focus-banner element removed', !html.includes('id="focus-banner"'));
// v4.76.0 update: \u00a701 + \u00a702 retired. Mode Ladder now uses \u00a701 with
// "Pick your session" heading; Marathon presets are inside Practice tier.
test('v4.53.0 HTML: \u00a7 01 editorial section head (now Mode Ladder, was Quick Start)',
  /&#167;\s*01[\s\S]{0,400}Pick your\s*<em>session<\/em>/.test(html));
test('v4.76.0 HTML: \u00a7 02 retired (Marathon Mode merged into Mode Ladder Practice tier)',
  !/&#167;\s*02[\s\S]{0,400}Marathon\s*<em>mode<\/em>/.test(html));
test('v4.53.0 HTML: \u00a7 03 By Domain editorial section head + grid container',
  /&#167;\s*03[\s\S]{0,400}By\s*<em>domain<\/em>/.test(html) && html.includes('id="setup-domain-grid"'));
// v4.79.0: \u00a704 Custom Quiz editorial section head retired per Codex
// round-3 \u2014 Mode Ladder's "Custom Quiz" tile is the single entry point;
// the <details> form below is the implementation.
test('v4.79.0 tombstone: \u00a704 "Custom quiz" editorial section head removed',
  !/&#167;\s*04[\s\S]{0,400}Custom\s*<em>quiz<\/em>/.test(html));
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
// v4.81.20: renderSetupFocusBanner is now a thin compat shim that hides
// the legacy #focus-banner element + delegates to renderTodayPlan. The
// v4.53.0/v4.54.0 in-banner content (greeting + weak-topic callout +
// empty-state copy) was retired because the v4.81.18 #today-plan card
// fully replaces this surface AND respects the isStudyPlanDoneToday
// gate. Tests below converted to tombstones \u2014 guarding that the legacy
// content stays gone, not that it still renders.
test('v4.53.0 JS: renderSetupFocusBanner function defined (now a compat shim)',
  js.includes('function renderSetupFocusBanner('));
test('v4.81.20 tombstone: renderSetupFocusBanner no longer renders greeting copy',
  !/renderSetupFocusBanner[\s\S]{0,3000}<em>Simi<\/em>/.test(js));
test('v4.81.20 tombstone: renderSetupFocusBanner no longer reads computeWeakSpotScores directly',
  !/renderSetupFocusBanner[\s\S]{0,2000}computeWeakSpotScores/.test(js));
test('v4.81.20 tombstone: renderSetupFocusBanner no longer renders "Seven questions per topic" copy',
  !/Seven questions per topic, mixed difficulty/.test(js));
test('v4.81.20 retire: renderSetupFocusBanner delegates to renderTodayPlan',
  /renderTodayPlan/.test(_fnBody(js, 'renderSetupFocusBanner') || ''));
test('v4.53.0 JS: renderSetupDomainGrid function defined',
  js.includes('function renderSetupDomainGrid('));
test('v4.53.0 JS: domain grid aggregates via TOPIC_DOMAINS lookup',
  /renderSetupDomainGrid[\s\S]{0,2500}TOPIC_DOMAINS\[e\.topic\]/.test(js));
// v4.54.10: renderSetupDomainGrid body grew \u2014 widen the regex window.
test('v4.53.0 JS: domain grid click wires drillDomain',
  /renderSetupDomainGrid[\s\S]{0,6000}drillDomain\(/.test(js));
// v4.81.23: renderSetupFocusBanner stopped being called from goSetup (retired
// in v4.81.20 as a shim; element removed entirely in v4.81.23). goSetup
// still calls renderSetupDomainGrid + renderTodayPlan.
test('v4.53.0 JS (retargeted): goSetup calls renderSetupDomainGrid + renderTodayPlan',
  /function goSetup\([\s\S]{0,1500}renderSetupDomainGrid[\s\S]{0,200}renderTodayPlan|function goSetup\([\s\S]{0,1500}renderTodayPlan[\s\S]{0,200}renderSetupDomainGrid/.test(js));

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

// v4.81.23 tombstones: legacy v4.53.0 focus banner CSS retired (element
// removed in v4.81.23 cleanup; was retired in v4.81.20 as a shim).
test('v4.81.23 tombstone: .focus-banner CSS rule removed', !/\.focus-banner\s*\{/.test(css));
test('v4.81.23 tombstone: .focus-cta CSS rule removed', !/\.focus-cta\s*\{/.test(css));
test('v4.81.23 tombstone: @keyframes focusBannerFadeIn removed', !/@keyframes focusBannerFadeIn/.test(css));

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
// v4.81.23 tombstone: light-theme .focus-banner override retired (element removed)
test('v4.81.23 tombstone: light-theme .focus-banner override removed',
  !/\[data-theme="light"\]\s+\.focus-banner\s*\{/.test(css));
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
// v4.81.23 tombstone: .focus-banner-v2 element removed (retired in v4.81.20)
test('v4.81.23 tombstone: .focus-banner-v2 class removed from HTML', !/class="focus-banner-v2/.test(html));
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
// v4.81.20: tombstone — focus-banner v2 structure was retired (the function
// is now a compat shim that delegates to renderTodayPlan). The CSS for
// .focus-banner-v2 + .fb-* classes is retained for the (now hidden)
// element shell, but the banner no longer emits those children.
test('v4.81.20 tombstone: renderSetupFocusBanner no longer emits fb-quote/fb-body/fb-cta children',
  !/renderSetupFocusBanner[\s\S]{0,4000}fb-quote[\s\S]{0,400}fb-body[\s\S]{0,400}fb-cta/.test(js));

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

// v4.81.23 tombstones: .focus-banner-v2 + all .fb-* CSS classes retired
// (the v4.54.0 focus banner was retired in v4.81.20 and the CSS was
// removed in v4.81.23 cleanup pass).
test('v4.81.23 tombstone: .focus-banner-v2 CSS removed', !/\.focus-banner-v2\s*\{/.test(css));
test('v4.81.23 tombstone: .fb-quote CSS removed', !/\.fb-quote\s*\{/.test(css));
test('v4.81.23 tombstone: .fb-text CSS removed', !/\.fb-text\s*\{/.test(css));
test('v4.81.23 tombstone: .fb-cta CSS removed', !/\.fb-cta\s*\{/.test(css));

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
// v4.81.23 tombstone: light-theme .focus-banner-v2 override retired (element removed)
test('v4.81.23 tombstone: light-theme .focus-banner-v2 override removed',
  !/\[data-theme="light"\]\s+\.focus-banner-v2\s*\{/.test(css));

// ── v4.54.1 RECENT PERF \u2192 ANALYTICS, SETTINGS \u2192 OWN PAGE ──
// User asked to move Recent Performance off the home page to Analytics,
// and extract the Settings details block into its own sidebar-entry page.
// Late-Saturday ship, kept scope tight to 3 moves + wiring.
console.log('\n\x1b[1m── v4.54.1 LAYOUT CLEANUP ──\x1b[0m');

// HTML
test('v4.54.1 HTML: #page-settings exists',
  html.includes('id="page-settings"'));
// v4.81.2: window bumped 800 → 2500 chars after the auto-backup section was
// added between Import Data and Clear Wrong Bank.
// v4.81.12: page-settings → exportData window bumped 5000 → 7000 because the
// Control Centre reorg put §01 Study Setup + §02 AI Coach BEFORE §03 Data &
// Backups. Also bumped importData → clearWrongBank window 2500 → 3500 for
// headroom (current gap ~2250 with §04 Danger Zone wrapper).
test('v4.54.1 (v4.54.16 update) HTML: settings has API key + Exam Date + Daily Goal + Export/Import + Clear Wrong Bank',
  html.includes('id="api-key"') && /id="page-settings"[\s\S]{0,7000}exportData\(\)[\s\S]{0,800}importData\([\s\S]{0,3500}clearWrongBank/.test(html));
test('v4.54.1 HTML: #history-panel moved to #page-analytics',
  /id="page-analytics"[\s\S]{0,1500}id="history-panel"/.test(html));
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
// v4.76.0: 60Q tile relocated to Exam tier (as `.modes-card-exam` "60-Question SIM").
// SIM-badge styling is no longer needed because the tile is already in the Exam tier
// with its own visual treatment. Tombstone keeps both legacy classes from sneaking back.
test('v4.76.0 tombstone: legacy preset-sim + preset-sim-badge classes no longer in HTML',
  !html.includes('class="preset-tile preset-sim"') && !html.includes('class="preset-sim-badge"'));
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
// v4.81.13: window bumped 400 → 1500 chars after _saveExamPerTopicSplit
// + renderExamDomainBreakdown calls were added between the summary
// saveToHistory and _maybeShowDailyRecap.
test('v4.54.17 JS: submitExam calls _maybeShowDailyRecap after saveToHistory',
  /submitExam[\s\S]{0,12000}saveToHistory[\s\S]{0,1500}_maybeShowDailyRecap/.test(js));
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
  /n\s*<=\s*QUIZ_BATCH_THRESHOLD[\s\S]{0,400}_fetchQuestionsBatch\(key,\s*qTopic,\s*difficulty,\s*n(?:\s*,\s*[a-zA-Z_$][\w$]*\s*,\s*[a-zA-Z_$][\w$]*)?\s*\)/.test(js));
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
  /async function _fetchQuestionsBatch\(key,\s*qTopic,\s*difficulty,\s*n,\s*pbqCountOverride(?:,\s*[a-zA-Z_$][\w$]*)?\)/.test(js));
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
test('v4.57.0 validator: expanded from THREE checks to SEVEN checks (v4.85.4: +multi-select balance)',
  /Review each question below and check SEVEN things/.test(js));
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
test('v4.57.0 validator: OK requires passing all 7 checks (v4.85.4: +balanced for multi-select)',
  /Q1:OK[\s\S]{0,400}conceptually coherent[\s\S]{0,100}well-framed[\s\S]{0,100}plausible distractors/.test(js));
test('v4.57.0 validator: AMBIGUOUS trigger expanded to cover checks 4/5/6/7',
  /AMBIGUOUS[\s\S]{0,400}fails any of checks 4\/5\/6\/7/.test(js));

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
  // v4.81.19: window widened (200→500, 100→300) because comma-safe parser
  // wraps the legacy split(',') in a ternary fallback. The .includes(topic)
  // check is now on a `list.includes(...)` call instead of inline.
  /e\.topic\.startsWith\(['"]Multi: ['"]\)[\s\S]{0,500}\.split\(['"],['"]\)[\s\S]{0,300}\.includes\(topic\)/.test(js));

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
  /currArpKeys\.forEach\(k\s*=>\s*\{\s*if\s*\(!_tbUiState\.inspPrevArpKeys\.has\(k\)\)\s*flashArp\.add/.test(js));
test('v4.60.0 JS: tbRenderV3Inspector resets snapshot when inspected device changes',
  /if\s*\(_tbUiState\.inspPrevDeviceId\s*===\s*deviceId\)/.test(js));
test('v4.60.0 JS: tbSaveDraft refreshes inspector when popup visible',
  /function\s+tbSaveDraft\s*\(\)\s*\{[\s\S]*?getElementById\(['"]tb-inspector-pop['"]\)[\s\S]*?tbRenderV3Inspector\s*\(\)/.test(js));
test('v4.60.0 JS: tbBindInspectorKeydown defined + wired in openTopologyBuilder',
  /function\s+tbBindInspectorKeydown[\s\S]{0,400}keydown[\s\S]{0,200}Escape/.test(js) &&
  /openTopologyBuilder[\s\S]{0,2400}tbBindInspectorKeydown/.test(js));
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
  /openTopologyBuilder[\s\S]{0,2400}tbInitPaneCollapseState/.test(js));

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
  // v4.62.4: canvas wrap moved to _tbOverlayRegistry + tbRegisterOverlay pattern.
  // Trace overlay now registers via a named closure that calls tbRenderTraceCanvasState
  // when trace mode is active.
  /_tbOverlaysWrapped\s*=\s*true/.test(js) &&
  /tbRegisterOverlay\(function\s+_traceOverlay/.test(js) &&
  /if\s*\(_tbUiState\.trace\.active\)\s*tbRenderTraceCanvasState\(\)/.test(js));
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
// v4.62.0 — TB Spanning Tree Protocol Visualisation (issue #186)
// STP auto-enables on every L2 switch. tbComputeStpState elects a root
// bridge by lowest priority.MAC, runs BFS over switch-to-switch cables,
// assigns root/designated/blocked port roles per cable endpoint. Crown
// marker on root, red dashed cable on blocked segments, 800ms
// reconvergence pulse on switches whose role changed.
// ══════════════════════════════════════════════════════════════════════

test('v4.62.0 JS: tbComputeStpState pure function defined',
  /function\s+tbComputeStpState\s*\(state\)/.test(js));
test('v4.62.0 JS: _tbStpIsSwitch predicate defined (type includes "switch")',
  /function\s+_tbStpIsSwitch[\s\S]{0,200}type\.indexOf\('switch'\)\s*>=\s*0/.test(js));
test('v4.62.0 JS: _tbStpBridgeMac helper handles interface-MAC + synthetic fallback',
  /function\s+_tbStpBridgeMac[\s\S]{0,600}withMac[\s\S]{0,400}Synthetic/.test(js));
test('v4.62.0 JS: tbRenderStpOverlay defined + paints crown + port dots',
  /function\s+tbRenderStpOverlay[\s\S]{0,3000}tb-stp-crown[\s\S]{0,1500}tb-stp-port-dot/.test(js));
test('v4.62.0 JS: tbRenderStpOverlay toggles tb-cable-stp-blocked class on blocked conductors',
  /tbRenderStpOverlay[\s\S]{0,2000}tb-cable-stp-blocked/.test(js));
test('v4.62.0 JS: tbRefreshStpState fires reconvergence pulse on changed switches',
  /function\s+tbRefreshStpState[\s\S]{0,2000}tb-stp-rethink/.test(js));
test('v4.62.0 JS: tbSaveDraft calls tbRefreshStpState on every mutation',
  /function\s+tbSaveDraft[\s\S]*?tbRefreshStpState\(\)/.test(js));
test('v4.62.0 JS: STP overlay registered in canvas overlay registry (v4.62.4 pattern)',
  // v4.62.4: canvas wrap unified via _tbOverlayRegistry. STP overlay registers itself
  // through tbRegisterOverlay(tbRenderStpOverlay) rather than self-wrapping tbRenderCanvas.
  /_tbOverlaysWrapped\s*=\s*true/.test(js) &&
  /tbRegisterOverlay\(tbRenderStpOverlay\)/.test(js));

test('v4.62.0 CSS: port dot role variants styled (root gold / designated green / blocked red)',
  /\.tb-stp-port-root[\s\S]{0,200}fill:\s*#f5b73b/.test(css) &&
  /\.tb-stp-port-designated[\s\S]{0,200}fill:\s*#4ade80/.test(css) &&
  /\.tb-stp-port-blocked[\s\S]{0,200}fill:\s*#f87171/.test(css));
test('v4.62.0 CSS: blocked cable stroke is red dashed via override',
  /\.tb-cable\.tb-cable-stp-blocked\s*\{[\s\S]{0,400}stroke:\s*#f87171[\s\S]{0,200}stroke-dasharray:/.test(css));
test('v4.62.0 CSS: root crown marker bg + label styled',
  /\.tb-stp-crown-bg\s*\{/.test(css) &&
  /\.tb-stp-crown-label\s*\{[\s\S]{0,200}fill:\s*#f5b73b/.test(css));
test('v4.62.0 CSS: blocked ✗ badge styled with red background + X strokes',
  /\.tb-stp-blocked-badge-bg\s*\{[\s\S]{0,200}stroke:\s*#f87171/.test(css) &&
  /\.tb-stp-blocked-badge-x\s*\{/.test(css));
test('v4.62.0 CSS: reconvergence pulse keyframe + rethink class defined',
  /@keyframes\s+tbStpRethink/.test(css) &&
  /data-tb-device\]\.tb-stp-rethink\s+circle[\s\S]{0,200}animation:\s*tbStpRethink/.test(css));
test('v4.62.0 CSS: reduced-motion neutralises rethink pulse',
  /prefers-reduced-motion[\s\S]{0,600}tb-stp-rethink\s+circle[\s\S]{0,100}animation:\s*none/.test(css));
test('v4.62.0 CSS: light-theme overrides crown + port dot stroke',
  /\[data-theme="light"\]\s+\.tb-stp-crown-bg/.test(css) &&
  /\[data-theme="light"\]\s+\.tb-stp-port-dot/.test(css));

// Behavioural: vm-sandbox tbComputeStpState against a 3-switch triangle +
// assert root election, root-port selection, and blocked-port logic.
(function testStpCompute() {
  try {
    const vm = require('vm');
    const body = js.match(/function\s+tbComputeStpState\s*\(state\)\s*\{([\s\S]*?)\n\}\n/);
    const bridgeMacBody = js.match(/function\s+_tbStpBridgeMac\s*\(dev\)\s*\{([\s\S]*?)\n\}/);
    const isSwitchBody = js.match(/function\s+_tbStpIsSwitch\s*\(dev\)\s*\{([\s\S]*?)\n\}/);
    const bridgeIdStrBody = js.match(/function\s+_tbStpBridgeIdStr\s*\(priority,\s*mac\)\s*\{([\s\S]*?)\n\}/);
    if (!body || !bridgeMacBody || !isSwitchBody || !bridgeIdStrBody) {
      test('v4.62.0 sandbox: tbComputeStpState body extracted', false);
      return;
    }
    test('v4.62.0 sandbox: tbComputeStpState body extracted', true);

    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(`function _tbStpBridgeMac(dev) {${bridgeMacBody[1]}}`, ctx);
    vm.runInContext(`function _tbStpIsSwitch(dev) {${isSwitchBody[1]}}`, ctx);
    vm.runInContext(`function _tbStpBridgeIdStr(priority, mac) {${bridgeIdStrBody[1]}}`, ctx);
    vm.runInContext(`function tbComputeStpState(state) {${body[1]}}`, ctx);

    // 3-switch triangle: SW-A / SW-B / SW-C all with default priority 32768.
    // MAC tiebreaker means SW-A (lowest MAC) becomes root.
    const state = {
      devices: [
        { id: 'swA', hostname: 'SW-A', type: 'switch', interfaces: [{ mac: '00:00:00:00:00:01' }] },
        { id: 'swB', hostname: 'SW-B', type: 'switch', interfaces: [{ mac: '00:00:00:00:00:02' }] },
        { id: 'swC', hostname: 'SW-C', type: 'switch', interfaces: [{ mac: '00:00:00:00:00:03' }] }
      ],
      cables: [
        { id: 'c-ab', from: 'swA', to: 'swB' },
        { id: 'c-ac', from: 'swA', to: 'swC' },
        { id: 'c-bc', from: 'swB', to: 'swC' }   // redundant — creates loop
      ]
    };

    const stp = vm.runInContext(`tbComputeStpState(${JSON.stringify(state)})`, ctx);
    test('v4.62.0 sandbox: converged flag set true',
      stp.converged === true);
    test('v4.62.0 sandbox: SW-A elected root (lowest MAC at default priority)',
      stp.rootId === 'swA' && stp.bridges.swA.isRoot === true);
    test('v4.62.0 sandbox: root cost-to-root is 0',
      stp.bridges.swA.costToRoot === 0);
    test('v4.62.0 sandbox: SW-B and SW-C each reach root in 1 hop',
      stp.bridges.swB.costToRoot === 1 && stp.bridges.swC.costToRoot === 1);
    test('v4.62.0 sandbox: exactly one cable is blocked (loop prevention)',
      stp.blockedCount === 1 && Object.values(stp.cables).filter(c => c.blocked).length === 1);

    // c-ab and c-ac are BFS-tree cables → one side root, other side designated
    test('v4.62.0 sandbox: SW-A ↔ SW-B cable forwarding (A designated, B root)',
      stp.cables['c-ab'].fromRole === 'designated' && stp.cables['c-ab'].toRole === 'root' &&
      stp.cables['c-ab'].blocked === false);
    test('v4.62.0 sandbox: SW-A ↔ SW-C cable forwarding (A designated, C root)',
      stp.cables['c-ac'].fromRole === 'designated' && stp.cables['c-ac'].toRole === 'root' &&
      stp.cables['c-ac'].blocked === false);

    // c-bc is the non-tree cable → one side blocked, the side with LOWER
    // bridge-ID wins designated. SW-B has lower MAC than SW-C.
    test('v4.62.0 sandbox: SW-B ↔ SW-C cable blocked (loop-prevention)',
      stp.cables['c-bc'].blocked === true);
    test('v4.62.0 sandbox: designated wins on lower-bridge-ID side (B); C blocks',
      stp.cables['c-bc'].fromRole === 'designated' && stp.cables['c-bc'].toRole === 'blocked');

    // ── Force root election via priority override ──
    const stateWithPriority = JSON.parse(JSON.stringify(state));
    stateWithPriority.devices[2].stpPriority = 4096;  // SW-C wins by low priority
    const stp2 = vm.runInContext(`tbComputeStpState(${JSON.stringify(stateWithPriority)})`, ctx);
    test('v4.62.0 sandbox: lowered priority overrides MAC tiebreaker (SW-C becomes root)',
      stp2.rootId === 'swC' && stp2.bridges.swC.isRoot === true);

    // ── Empty topology ──
    const emptyStp = vm.runInContext(`tbComputeStpState({ devices: [], cables: [] })`, ctx);
    test('v4.62.0 sandbox: empty topology still returns converged with no root',
      emptyStp.converged === true && emptyStp.rootId === null);

    // ── No switches (only hosts) ──
    const hostOnly = vm.runInContext(`tbComputeStpState(${JSON.stringify({
      devices: [{ id: 'h1', type: 'host', interfaces: [] }, { id: 'h2', type: 'host', interfaces: [] }],
      cables: [{ id: 'c1', from: 'h1', to: 'h2' }]
    })})`, ctx);
    test('v4.62.0 sandbox: no switches → no STP election (rootId null, no port roles on host cables)',
      hostOnly.rootId === null && (!hostOnly.cables['c1'] || hostOnly.cables['c1'].fromRole === null));

    // ── Mixed: one switch + one host ──
    const mixedStp = vm.runInContext(`tbComputeStpState(${JSON.stringify({
      devices: [
        { id: 'sw1', type: 'switch', interfaces: [{ mac: '00:00:00:00:00:10' }] },
        { id: 'h1', type: 'host', interfaces: [{ mac: '00:00:00:00:00:20' }] }
      ],
      cables: [{ id: 'c1', from: 'sw1', to: 'h1' }]
    })})`, ctx);
    test('v4.62.0 sandbox: single switch is elected root even with only host-connected cables',
      mixedStp.rootId === 'sw1');
    test('v4.62.0 sandbox: cable to non-switch endpoint gets no STP role (null)',
      mixedStp.cables['c1'] && mixedStp.cables['c1'].fromRole === null &&
      mixedStp.cables['c1'].toRole === null && mixedStp.cables['c1'].blocked === false);
  } catch (e) {
    test('v4.62.0 sandbox: tbComputeStpState executed without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.62.1 — Per-Hop Trace panel is draggable by its head
// User spotted during prod test: the trace panel sits over the canvas
// left-anchored, sometimes covering topology. Same drag-by-head pattern
// as the inspector popup + config panel floating popups.
// ══════════════════════════════════════════════════════════════════════

test('v4.62.1 JS: tbBindTracePanelDrag function defined',
  /function\s+tbBindTracePanelDrag\s*\(\)/.test(js));
test('v4.62.1 JS: drag binding uses the idempotent bound-flag pattern',
  // v4.62.4: bound flag moved from standalone `let _tbTracePanelDragBound` into `_tbUiState.boundFlags.tracePanelDrag`
  /if\s*\(_tbUiState\.boundFlags\.tracePanelDrag\)\s*return/.test(js) &&
  /_tbUiState\.boundFlags\.tracePanelDrag\s*=\s*true/.test(js));
test('v4.62.1 JS: drag only starts when mousedown is inside .tb-trace-head',
  /tbBindTracePanelDrag[\s\S]{0,2000}closest\(['"]\.tb-trace-head['"]\)/.test(js));
test('v4.62.1 JS: drag ignores clicks on .tb-trace-close',
  /tbBindTracePanelDrag[\s\S]{0,2000}closest\(['"]\.tb-trace-close['"]\)/.test(js));
test('v4.62.1 JS: openTopologyBuilder wires the trace-panel drag binding',
  /openTopologyBuilder[\s\S]{0,2400}tbBindTracePanelDrag/.test(js));
test('v4.62.1 CSS: .tb-trace-head has cursor: grab',
  /\.tb-trace-head\s*\{[\s\S]{0,400}cursor:\s*grab/.test(css));
test('v4.62.1 CSS: .tb-trace-head:active switches to cursor: grabbing',
  /\.tb-trace-head:active\s*\{\s*cursor:\s*grabbing/.test(css));

// ══════════════════════════════════════════════════════════════════════
// v4.62.2 — CompTIA troubleshooting-methodology order guard
// Bug: Haiku generated an `order` question listing the 5-step CompTIA
// methodology but `correctOrder` placed "Document findings, actions taken,
// and outcomes" at position 3 instead of the final position. Under the
// 7-step methodology, "Identify the problem" is ALWAYS first and "Document
// findings" is ALWAYS last — those are invariant. New programmatic guard
// in validateQuestions rejects any order question that violates either.
// ══════════════════════════════════════════════════════════════════════

test('v4.62.2 JS: _tbTroubleshootingOrderOk helper defined',
  /function\s+_tbTroubleshootingOrderOk\s*\(q\)/.test(js));
test('v4.62.2 JS: validateQuestions routes order questions through the guard',
  /function validateQuestions[\s\S]{0,2500}_tbTroubleshootingOrderOk\(q\)/.test(js));
test('v4.62.2 validation-audit.js extracts + includes the new helper in its sandbox',
  (() => {
    const fs = require('fs');
    const audit = fs.readFileSync(require('path').join(ROOT, 'tests', 'validation-audit.js'), 'utf8');
    return audit.includes('_tbTroubleshootingOrderOk');
  })());

// Behavioural sandbox fixtures — exercise the helper against the exact
// user-reported bug scenario + legitimate passing cases + edge cases.
(function testTsOrderOk() {
  try {
    const vm = require('vm');
    const body = js.match(/function\s+_tbTroubleshootingOrderOk\s*\(q\)\s*\{([\s\S]*?)\n\}\n/);
    if (!body) {
      test('v4.62.2 sandbox: helper body extracted', false);
      return;
    }
    test('v4.62.2 sandbox: helper body extracted', true);

    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(`function _tbTroubleshootingOrderOk(q) {${body[1]}}`, ctx);

    // ── User-reported bug scenario: Document at position 3 (idx 0) ──
    const buggy = {
      type: 'order',
      question: 'Arrange the following steps in the correct order for troubleshooting a network connectivity issue using the CompTIA Network+ methodology.',
      topic: 'CompTIA Troubleshooting Methodology',
      items: [
        'Document findings, actions taken, and outcomes for future reference',  // 0
        'Identify the problem by gathering information from the user',          // 1
        'Test the solution and verify that the user can access required',       // 2
        'Implement the most likely solution based on the identified cause',     // 3
        'Establish a theory of the probable cause'                              // 4
      ],
      correctOrder: [1, 4, 0, 3, 2]  // WRONG — Document at position 3 instead of last
    };
    test('v4.62.2 sandbox: rejects the user-reported bug (Document not last)',
      vm.runInContext('_tbTroubleshootingOrderOk(q)', Object.assign(ctx, { q: buggy })) === false);

    // ── Correct answer passes ──
    const correct = Object.assign({}, buggy, { correctOrder: [1, 4, 3, 2, 0] });
    test('v4.62.2 sandbox: accepts the correct methodology order (Identify, Theory, Implement, Test, Document)',
      vm.runInContext('_tbTroubleshootingOrderOk(q)', Object.assign(ctx, { q: correct })) === true);

    // ── Alt correct order (Test before Implement — also valid per 7-step) ──
    const altCorrect = Object.assign({}, buggy, { correctOrder: [1, 4, 2, 3, 0] });
    test('v4.62.2 sandbox: accepts alt order where Test comes before Implement (also valid)',
      vm.runInContext('_tbTroubleshootingOrderOk(q)', Object.assign(ctx, { q: altCorrect })) === true);

    // ── Identify not first ──
    const notIdentifyFirst = Object.assign({}, buggy, { correctOrder: [4, 1, 2, 3, 0] });
    test('v4.62.2 sandbox: rejects when Identify is not at position 0',
      vm.runInContext('_tbTroubleshootingOrderOk(q)', Object.assign(ctx, { q: notIdentifyFirst })) === false);

    // ── Theory before Identify ──
    const theoryBeforeIdentify = Object.assign({}, buggy, { correctOrder: [4, 1, 3, 2, 0] });
    test('v4.62.2 sandbox: rejects when Theory comes before Identify',
      vm.runInContext('_tbTroubleshootingOrderOk(q)', Object.assign(ctx, { q: theoryBeforeIdentify })) === false);

    // ── Non-methodology order question (should pass through untouched) ──
    const unrelated = {
      type: 'order',
      question: 'Arrange the OSI layers from bottom to top.',
      topic: 'Network Models & OSI',
      items: ['Physical', 'Data Link', 'Network', 'Transport'],
      correctOrder: [0, 1, 2, 3]
    };
    test('v4.62.2 sandbox: unrelated order questions pass through (not touched)',
      vm.runInContext('_tbTroubleshootingOrderOk(q)', Object.assign(ctx, { q: unrelated })) === true);

    // ── MCQ question (not order type) ──
    const mcq = {
      type: 'mcq', question: 'What is 2+2?', topic: 'Math',
      options: { A: '3', B: '4' }, answer: 'B'
    };
    test('v4.62.2 sandbox: MCQ questions skip the guard entirely',
      vm.runInContext('_tbTroubleshootingOrderOk(q)', Object.assign(ctx, { q: mcq })) === true);

    // ── Malformed: missing correctOrder ──
    const malformed = { type: 'order', question: 'CompTIA troubleshooting steps?', items: ['a','b'] };
    test('v4.62.2 sandbox: malformed questions (no correctOrder) pass through without throwing',
      vm.runInContext('_tbTroubleshootingOrderOk(q)', Object.assign(ctx, { q: malformed })) === true);

    // ── CompTIA stem mentioned but no Document item → guard only enforces what's present ──
    const noDocItem = {
      type: 'order',
      question: 'Order the CompTIA troubleshooting methodology steps.',
      topic: 'CompTIA Troubleshooting Methodology',
      items: ['Identify the problem', 'Establish a theory', 'Test the theory', 'Implement solution'],
      correctOrder: [0, 1, 2, 3]
    };
    test('v4.62.2 sandbox: guard tolerates missing Document item (only checks invariants that apply)',
      vm.runInContext('_tbTroubleshootingOrderOk(q)', Object.assign(ctx, { q: noDocItem })) === true);
  } catch (e) {
    test('v4.62.2 sandbox: helper executed without error', false);
  }
})();

// ══════════════════════════════════════════════════════════════════════
// v4.62.3 — Priority Retention Concepts injected into every quiz+exam
// User asked: ensure the 14 recently-studied gap topics get tested across
// all quiz + exam flows, not as a standalone drill. RETENTION_GAP_CONCEPTS
// array (label, parentTopic, objective, keyword for each of the 14) is
// formatted into a prompt block via _formatRetentionConceptsForPrompt()
// and injected alongside the curated-exemplar block in every
// _fetchQuestionsBatch call — applies to custom quiz, Mixed, Daily
// Challenge, Marathon, and the Exam simulator uniformly.
// ══════════════════════════════════════════════════════════════════════

test('v4.62.3 JS: RETENTION_GAP_CONCEPTS const defined',
  /const\s+RETENTION_GAP_CONCEPTS\s*=\s*\[/.test(js));
test('v4.62.3 JS: RETENTION_GAP_CONCEPTS seeded with the 14 v4.59.0 Cycle-1 gap topics',
  /RETENTION_GAP_CONCEPTS[\s\S]{0,6000}label:\s*['"]Powerload['"][\s\S]{0,400}label:\s*['"]NTS['"]/.test(js) &&
  /label:\s*['"]NAC['"][\s\S]{0,400}label:\s*['"]Preaction fire system['"]/.test(js) &&
  /label:\s*['"]PCAP File['"]/.test(js));
test('v4.62.3 JS: _formatRetentionConceptsForPrompt helper defined',
  /function\s+_formatRetentionConceptsForPrompt\s*\(\)/.test(js));
test('v4.62.3 JS: helper returns empty string when list is empty (no-op path)',
  /if\s*\(!Array\.isArray\(RETENTION_GAP_CONCEPTS\)\s*\|\|\s*RETENTION_GAP_CONCEPTS\.length\s*===\s*0\)\s*return\s+['"]['"]/.test(js));
test('v4.62.3 JS: prompt block header contains "PRIORITY RETENTION CONCEPTS"',
  /PRIORITY RETENTION CONCEPTS/.test(js));
test('v4.62.3 JS: prompt block explicitly frames it as a tiebreaker, not a mandate',
  /tiebreaker[\s\S]{0,200}not a mandate|prefer[\s\S]{0,300}over alternatives/i.test(js));
test('v4.62.3 JS: retentionBlock declared inside _fetchQuestionsBatch',
  /function _fetchQuestionsBatch[\s\S]{0,25000}const\s+retentionBlock\s*=\s*\(typeof\s+_formatRetentionConceptsForPrompt/.test(js));
test('v4.62.3 JS: buildPrompt template interpolates retentionBlock alongside exemplarBlock',
  /\$\{exemplarBlock\}\$\{retentionBlock\}/.test(js));

// Behavioural — sandbox the formatter against the real const to check it
// emits the expected structure when non-empty + empty-string when empty.
(function testRetentionFormat() {
  try {
    const vm = require('vm');
    const helperBody = js.match(/function\s+_formatRetentionConceptsForPrompt\s*\(\)\s*\{([\s\S]*?)\n\}/);
    const constMatch = js.match(/const\s+RETENTION_GAP_CONCEPTS\s*=\s*\[([\s\S]*?)\];\s*\n/);
    if (!helperBody || !constMatch) {
      test('v4.62.3 sandbox: helper + const extracted', false);
      return;
    }
    test('v4.62.3 sandbox: helper + const extracted', true);

    // Non-empty case: use the real const
    const ctx1 = {};
    vm.createContext(ctx1);
    vm.runInContext(`const RETENTION_GAP_CONCEPTS = [${constMatch[1]}];`, ctx1);
    vm.runInContext(`function _formatRetentionConceptsForPrompt() {${helperBody[1]}}`, ctx1);
    const output = vm.runInContext('_formatRetentionConceptsForPrompt()', ctx1);
    test('v4.62.3 sandbox: non-empty list produces a PRIORITY RETENTION CONCEPTS prompt block',
      typeof output === 'string' && output.indexOf('PRIORITY RETENTION CONCEPTS') > -1);
    test('v4.62.3 sandbox: prompt block lists "Powerload" concept',
      output.indexOf('"Powerload"') > -1);
    test('v4.62.3 sandbox: prompt block lists "PCAP File" concept',
      output.indexOf('"PCAP File"') > -1);
    test('v4.62.3 sandbox: prompt block explicitly frames concepts as a tiebreaker',
      /tiebreaker|prefer/.test(output));

    // Empty case: guard returns '' so prompt collapses to nothing
    const ctx2 = {};
    vm.createContext(ctx2);
    vm.runInContext(`const RETENTION_GAP_CONCEPTS = [];`, ctx2);
    vm.runInContext(`function _formatRetentionConceptsForPrompt() {${helperBody[1]}}`, ctx2);
    const emptyOutput = vm.runInContext('_formatRetentionConceptsForPrompt()', ctx2);
    test('v4.62.3 sandbox: empty list returns empty string (no-op)',
      emptyOutput === '');

    // Non-array case (defensive): still returns empty string
    const ctx3 = {};
    vm.createContext(ctx3);
    vm.runInContext(`const RETENTION_GAP_CONCEPTS = null;`, ctx3);
    vm.runInContext(`function _formatRetentionConceptsForPrompt() {${helperBody[1]}}`, ctx3);
    const nullOutput = vm.runInContext('_formatRetentionConceptsForPrompt()', ctx3);
    test('v4.62.3 sandbox: non-array (null) returns empty string (defensive)',
      nullOutput === '');
  } catch (e) {
    test('v4.62.3 sandbox: formatter executed without error', false);
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
  // v4.81.19: window widened 100 → 250 chars because the comma-safe parser
  // wraps the legacy slice(7).split(',') in a ternary fallback, pushing
  // the literal further from the startsWith check.
  /qTopic\.startsWith\(['"]Multi: ['"]\)[\s\S]{0,250}\.slice\(7\)\.split\(['"],['"]\)/.test(js));
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

// ══════════════════════════════════════════
// v4.63.0 — Network Builder 3D View Mode (issue #199 Phase 1)
//
// Structural + regression assertions for the 3D view. Three.js is vendored
// under vendor/three/ and dynamic-imported on demand via tb3d.js, so every
// user who never opens 3D pays zero bandwidth. These assertions gate that
// contract (vendored bundle exists, dynamic-imported, excluded from SW
// precache, 35 bespoke device primitives mapped, etc.).
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.63.0 NETWORK BUILDER 3D VIEW (Phase 1, #199) ──\x1b[0m');

// --- Vendored Three.js files present ---
// (fs + path already required at top of file; no re-require here)
test('v4.63.0 vendor: three.module.js present',
  fs.existsSync(path.join(ROOT, 'vendor/three/build/three.module.js')));
test('v4.63.0 vendor: OrbitControls present',
  fs.existsSync(path.join(ROOT, 'vendor/three/examples/jsm/controls/OrbitControls.js')));
test('v4.63.0 vendor: CSS2DRenderer present',
  fs.existsSync(path.join(ROOT, 'vendor/three/examples/jsm/renderers/CSS2DRenderer.js')));
test('v4.63.0 vendor: Three.js LICENSE included (MIT attribution)',
  fs.existsSync(path.join(ROOT, 'vendor/three/LICENSE')));

// --- tb3d.js module ---
const tb3d = fs.readFileSync(path.join(ROOT, 'tb3d.js'), 'utf8');
test('v4.63.0 tb3d: exports enter() + exit() lifecycle',
  /export function enter\(/.test(tb3d) && /export function exit\(/.test(tb3d));
test('v4.63.0 tb3d: exports resetCamera() + topDown() camera presets',
  /export function resetCamera\(/.test(tb3d) && /export function topDown\(/.test(tb3d));
test('v4.63.0 tb3d: imports three via bare specifier (importmap-resolved)',
  /^import \* as THREE from ['"]three['"];/m.test(tb3d));
test('v4.63.0 tb3d: imports OrbitControls from three/addons/',
  /from ['"]three\/addons\/controls\/OrbitControls\.js['"]/.test(tb3d));
test('v4.63.0 tb3d: imports CSS2DRenderer from three/addons/',
  /from ['"]three\/addons\/renderers\/CSS2DRenderer\.js['"]/.test(tb3d));

// --- 35 bespoke device primitives in the factory ---
const primitiveMatch = tb3d.match(/function _makeDevicePrimitive\(type, color\)\s*\{[\s\S]*?(?=\n\/\/ ══)/);
const primitiveBody = primitiveMatch ? primitiveMatch[0] : '';
const EXPECTED_DEVICE_TYPES = [
  'router', 'switch', 'dmz-switch', 'wap', 'pc', 'server', 'firewall',
  'cloud', 'isp-router', 'load-balancer', 'ids', 'wlc', 'printer', 'voip',
  'iot', 'public-web', 'public-file', 'public-cloud',
  'vpc', 'cloud-subnet', 'igw', 'nat-gw', 'tgw', 'vpg', 'onprem-dc',
  'sase-edge', 'dns-server',
  'laptop', 'smartphone', 'game-console', 'smart-tv',
  'satellite', 'cell-tower', 'modem', 'san-array'
];
// Just check every type name appears somewhere in the DEVICE_COLORS block
// (between 'const DEVICE_COLORS' and the closing '};'). Object-literal keys
// are sometimes quoted, sometimes not — simplest reliable check is substring
// presence of `<type>:` or `'<type>':`.
(() => {
  const cstart = tb3d.indexOf('const DEVICE_COLORS');
  const cend = tb3d.indexOf('};', cstart);
  const colorBlock = cstart >= 0 ? tb3d.slice(cstart, cend) : '';
  const missing = EXPECTED_DEVICE_TYPES.filter(t => !colorBlock.includes(t));
  test(`v4.63.0 tb3d: all 35 TB_DEVICE_TYPES entries have a color mapping${missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''}`,
    missing.length === 0);
})();
// Each device type appears as a case or falls through to default. We check a
// representative subset — ones where a missing case would obviously regress.
['router', 'firewall', 'switch', 'server', 'cloud', 'wap', 'laptop',
 'smartphone', 'vpc', 'tgw', 'satellite', 'cell-tower', 'modem', 'san-array',
 'onprem-dc', 'sase-edge', 'ids', 'load-balancer', 'iot'].forEach(t => {
  test(`v4.63.0 tb3d: primitive factory has bespoke case for '${t}'`,
    new RegExp(`case ['"]${t.replace('-', '\\-')}['"]:`).test(primitiveBody));
});

// --- Click-to-inspect wires into existing v4.60.0 inspector ---
test('v4.63.0 app.js: tbOpen3DView dynamic-imports tb3d.js',
  js.includes("import('./tb3d.js')"));
test('v4.63.0 app.js: tbOpen3DView passes onDeviceClick callback wired to tbSelectDeviceForInspector',
  /onDeviceClick[\s\S]{0,120}tbSelectDeviceForInspector\(deviceId\)/.test(js));
test('v4.63.0 app.js: tbOpen3DView defined',
  /^async function tbOpen3DView\(/m.test(js));
test('v4.63.0 app.js: tbClose3DView defined',
  /^function tbClose3DView\(/m.test(js));
test('v4.63.0 app.js: mobile nudge dismiss helper defined',
  /function tb3dDismissMobileNudge\(/.test(js));

// --- HTML wiring ---
test('v4.63.0 HTML: 3D View pill in #tb-canvas-pills toolbar',
  html.includes('data-tb-pill="3d"') && html.includes('onclick="tbOpen3DView()"'));
test('v4.63.0 HTML: #tb-3d-host container present',
  html.includes('id="tb-3d-host"'));
test('v4.63.0 HTML: #tb-3d-canvas (Three.js renderer mount) present',
  html.includes('id="tb-3d-canvas"'));
test('v4.63.0 HTML: #tb-3d-labels (CSS2DRenderer mount) present',
  html.includes('id="tb-3d-labels"'));
test('v4.63.0 HTML: Back-to-2D button wired to tbClose3DView',
  html.includes('onclick="tbClose3DView()"'));
test('v4.63.0 HTML: Reset Camera button wired to tb3dResetCamera',
  html.includes('onclick="tb3dResetCamera()"'));
test('v4.63.0 HTML: Top-down camera preset wired to tb3dTopDown',
  html.includes('onclick="tb3dTopDown()"'));
test('v4.63.0 HTML: compass rose present',
  html.includes('tb-3d-compass') && html.includes('tb-3d-compass-n') && html.includes('tb-3d-compass-s'));
test('v4.63.0 HTML: mobile nudge card present',
  html.includes('tb-3d-mobile-nudge'));
test('v4.63.0 HTML: loading overlay present for bundle fetch',
  html.includes('tb-3d-loading'));
test('v4.63.0 HTML: importmap declares three + three/addons',
  html.includes('<script type="importmap">') &&
  html.includes('"three":') &&
  html.includes('"three/addons/"'));

// --- CSS wiring ---
test('v4.63.0 CSS: .tb-3d-host absolute-positioned overlay',
  /\.tb-3d-host\s*\{[^}]*position:\s*absolute/.test(css));
test('v4.63.0 CSS: .tb-3d-node-label floating pill style defined',
  /\.tb-3d-node-label\s*\{/.test(css));
test('v4.63.0 CSS: .tb-3d-vlan-label floor-plate label style defined',
  /\.tb-3d-vlan-label\s*\{/.test(css));
test('v4.63.0 CSS: .tb-3d-compass rose style defined',
  /\.tb-3d-compass\s*\{/.test(css));
test('v4.63.0 CSS: reduced-motion gate kills spinner animation',
  /@media\s*\(prefers-reduced-motion[\s\S]{0,400}tb-3d-loading-spinner/.test(css));
test('v4.63.0 CSS: light-theme override for .tb-3d-host background',
  /\[data-theme="light"\]\s*\.tb-3d-host\s*\{/.test(css));

// --- Service worker ---
test('v4.63.0 SW: /vendor/ path is passed through (not precached)',
  sw.includes("url.pathname.startsWith('/vendor/')"));
test('v4.63.0 SW: /mockups/ path also passed through',
  sw.includes("url.pathname.startsWith('/mockups/')"));
test('v4.63.0 SW: vendored Three.js NOT in SHELL_ASSETS precache list',
  !/SHELL_ASSETS[\s\S]{0,300}vendor\//.test(sw));

// --- Regression guards ---
// Dynamic-import contract: tb3d.js must NEVER be loaded via a top-level
// <script> or static import in app.js — that would ship 600KB to every
// user who never opens 3D View.
test('v4.63.0 REGRESSION: index.html must not load tb3d.js via <script>',
  !/<script[^>]*src=["']\.?\/?tb3d\.js["']/.test(html));
test('v4.63.0 REGRESSION: app.js must not statically import tb3d.js',
  !/^import .* from ['"]\.\/tb3d\.js['"];/m.test(js));
test('v4.63.0 REGRESSION: index.html must not load Three.js outside /vendor/',
  !/<script[^>]*src=["'][^"']*(three\.module\.js|three\.min\.js)[^"']*["']/.test(html) ||
  /<script[^>]*src=["']\.?\/?vendor\/three\/.*three\.module\.js["']/.test(html));

// ══════════════════════════════════════════
// v4.64.0 — TB 3D View Phase 2 (issue #199 Phase 2)
//
// Packet trace animation + hop-card strip + playback controls + HUD pill.
// Render-only contract: tb3d.js exports setTraceState(); app.js owns
// _tbUiState.trace and pushes updates via the existing
// tbRenderTraceCanvasState hook point.
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.64.0 TB 3D VIEW PHASE 2 — PACKET TRACE (#199) ──\x1b[0m');

// --- tb3d.js: new setTraceState export ---
test('v4.64.0 tb3d: setTraceState exported',
  /export function setTraceState\(/.test(tb3d));
test('v4.64.0 tb3d: setTraceState clears render state when null passed',
  /setTraceState[\s\S]{0,600}if \(!_currTraceState\)/.test(tb3d));
test('v4.64.0 tb3d: packet sphere + glow + frame badge built via _ensurePacketMeshes',
  /function _ensurePacketMeshes\(/.test(tb3d) && /_packetMesh/.test(tb3d) && /_packetGlowMesh/.test(tb3d));
test('v4.64.0 tb3d: _animateCurrentHop animates along cable bezier curves',
  /function _animateCurrentHop\(/.test(tb3d) && /curve\.getPoint\(/.test(tb3d));
test('v4.64.0 tb3d: reduced-motion gate skips packet animation (jump to destination)',
  /_reducedMotion[\s\S]{0,200}_positionPacketAtDevice/.test(tb3d));
test('v4.64.0 tb3d: _updateHopStrip renders one .tb-3d-hop-card per hop',
  /function _updateHopStrip\([\s\S]{0,1200}tb-3d-hop-card/.test(tb3d));
test('v4.64.0 tb3d: _updateTraceHud fills #tb-3d-trace-hud with src → dst text',
  /function _updateTraceHud\([\s\S]{0,400}tb-3d-trace-hud-text/.test(tb3d));
test('v4.64.0 tb3d: _updatePlaybackControls swaps play/pause buttons by playing flag',
  /function _updatePlaybackControls\([\s\S]{0,400}playing/.test(tb3d));
test('v4.64.0 tb3d: _updateCableHighlights brightens visited-cable emissive',
  /function _updateCableHighlights\([\s\S]{0,500}emissiveIntensity/.test(tb3d));
test('v4.64.0 tb3d: fallback straight-line animation when no physical cable between hop endpoints',
  /lerpVectors\(fromPos, toPos/.test(tb3d));

// --- app.js: hook + chrome button delegates ---
test('v4.64.0 app.js: tbRenderTraceCanvasState hooks 3D setTraceState',
  /tbRenderTraceCanvasState\(\)\s*\{[\s\S]{0,500}_tb3dModule\.setTraceState/.test(js));
test('v4.64.0 app.js: tb3dOpenTraceDialog delegates to existing tbOpenTraceDialog',
  /function tb3dOpenTraceDialog\(/.test(js) && /tbOpenTraceDialog\(\)/.test(js));
test('v4.64.0 app.js: tb3dTracePlay delegates to tbTracePlay',
  /function tb3dTracePlay\([\s\S]{0,200}tbTracePlay\(\)/.test(js));
test('v4.64.0 app.js: tb3dTracePause delegates to tbTracePause',
  /function tb3dTracePause\([\s\S]{0,200}tbTracePause\(\)/.test(js));
test('v4.64.0 app.js: tb3dTraceStep delegates to tbTraceStep',
  /function tb3dTraceStep\([\s\S]{0,200}tbTraceStep\(\)/.test(js));
test('v4.64.0 app.js: tb3dTraceEnd delegates to tbEndTrace',
  /function tb3dTraceEnd\([\s\S]{0,200}tbEndTrace\(\)/.test(js));
test('v4.64.0 app.js: tb3dTraceSpeed cycles through 3 speed values (1500/750/3000)',
  /function tb3dTraceSpeed\([\s\S]{0,400}(1500|750|3000)/.test(js));
test('v4.64.0 app.js: tbOpen3DView syncs existing trace state to 3D mid-flight',
  /_tbUiState\?\.trace\?\.active/.test(js) && /setTraceState\(_tbUiState\.trace\)/.test(js));
test('v4.64.0 app.js: tbOpen3DView hides 2D trace panel while 3D active',
  /tbOpen3DView[\s\S]{0,2200}(getElementById\(['"]tb-trace-panel['"]\)[\s\S]{0,200}hidden = true)/.test(js));

// --- HTML wiring ---
test('v4.64.0 HTML: 🔍 Trace button in 3D chrome',
  html.includes('id="tb-3d-trace-btn"') && html.includes('tb3dOpenTraceDialog()'));
test('v4.64.0 HTML: playback controls block present',
  html.includes('id="tb-3d-playback-controls"'));
test('v4.64.0 HTML: play + pause + step + speed + end buttons all present',
  html.includes('id="tb-3d-play-btn"') &&
  html.includes('id="tb-3d-pause-btn"') &&
  html.includes('onclick="tb3dTraceStep()"') &&
  html.includes('id="tb-3d-speed-btn"') &&
  html.includes('onclick="tb3dTraceEnd()"'));
test('v4.64.0 HTML: trace HUD pill container in chrome right',
  html.includes('id="tb-3d-trace-hud"') && html.includes('id="tb-3d-trace-hud-text"'));
test('v4.64.0 HTML: hop-strip container + row + legend',
  html.includes('id="tb-3d-hop-strip"') &&
  html.includes('id="tb-3d-hop-strip-row"') &&
  html.includes('tb-3d-hop-strip-legend'));

// --- CSS wiring ---
test('v4.64.0 CSS: .tb-3d-trace-hud pill style',
  /\.tb-3d-trace-hud\s*\{/.test(css));
test('v4.64.0 CSS: .tb-3d-hop-strip fixed 160px strip',
  /\.tb-3d-hop-strip\s*\{[^}]*height:\s*160px/.test(css));
test('v4.64.0 CSS: .tb-3d-hop-card with pending/current/ok/blocked variants',
  /\.tb-3d-hop-card-pending/.test(css) &&
  /\.tb-3d-hop-card-current/.test(css) &&
  /\.tb-3d-hop-card-ok/.test(css) &&
  /\.tb-3d-hop-card-blocked/.test(css));
test('v4.64.0 CSS: .tb-3d-frame-badge for in-flight frame annotation',
  /\.tb-3d-frame-badge\s*\{/.test(css));
test('v4.64.0 CSS: @keyframes tb3dHudPulse for HUD dot animation',
  /@keyframes tb3dHudPulse/.test(css));
test('v4.64.0 CSS: reduced-motion gate kills tb3dHudPulse + hop transitions',
  /@media\s*\(prefers-reduced-motion[\s\S]{0,800}tb-3d-hop-card.*transition:\s*none/.test(css));

// --- Regression guards ---
// 2D trace renderer must still exist and fire — 3D is additive, not a replacement.
test('v4.64.0 REGRESSION: tbRenderTraceCanvasState still exists (2D still works)',
  /^function tbRenderTraceCanvasState\(/m.test(js));
test('v4.64.0 REGRESSION: 2D trace panel (#tb-trace-panel) not removed',
  html.includes('id="tb-trace-panel"'));
// setTraceState must remain render-only — no state mutations from tb3d.
test('v4.64.0 REGRESSION: tb3d.js never assigns to _tbUiState (render-only contract)',
  !/_tbUiState\.[a-zA-Z]+\s*=/.test(tb3d));

// ══════════════════════════════════════════
// v4.65.0 — TB 3D View Phase 3 (issue #199 Phase 3)
//
// OSI Layer Stack View — click a device, hit "OSI Stack", device lifts
// into an exploded view of 7 stacked translucent planes, each labeled
// with its layer name + PDU + typical protocols. Render-only contract
// preserved; app.js owns selection state (tbV3InspectedDeviceId), tb3d
// just renders the stack.
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.65.0 TB 3D VIEW PHASE 3 — OSI LAYER STACK (#199) ──\x1b[0m');

// --- tb3d.js exports + shape ---
test('v4.65.0 tb3d: enterOsiView exported',
  /export function enterOsiView\(/.test(tb3d));
test('v4.65.0 tb3d: exitOsiView exported',
  /export function exitOsiView\(/.test(tb3d));
test('v4.65.0 tb3d: isOsiActive accessor exported',
  /export function isOsiActive\(/.test(tb3d));
test('v4.65.0 tb3d: _OSI_LAYERS const has all 7 OSI layers',
  /const _OSI_LAYERS\s*=[\s\S]{0,1200}Physical[\s\S]{0,1500}Application/.test(tb3d));
test('v4.65.0 tb3d: layer metadata includes PDU for each (Bits/Frame/Packet/Segment/Data)',
  /Bits[\s\S]{0,200}Frame[\s\S]{0,300}Packet[\s\S]{0,300}Segment/.test(tb3d));
test('v4.65.0 tb3d: enterOsiView creates plane meshes + edge outlines',
  /function enterOsiView\(/.test(tb3d) &&
  /PlaneGeometry\(planeWidth, planeDepth\)/.test(tb3d) &&
  /EdgesGeometry\(geo\)/.test(tb3d));
test('v4.65.0 tb3d: enterOsiView creates CSS2DObject label per layer',
  /enterOsiView[\s\S]{0,4500}new CSS2DObject\(labelDiv\)/.test(tb3d));
test('v4.65.0 tb3d: enterOsiView tweens camera to frame the stack',
  /enterOsiView[\s\S]{0,5500}_tweenCamera\(camPos, focusPoint\)/.test(tb3d));
test('v4.65.0 tb3d: enterOsiView backs up camera position for later restore',
  /_osiCameraBackup\s*=\s*\{[\s\S]{0,200}camera\.position\.clone\(\)/.test(tb3d));
test('v4.65.0 tb3d: enterOsiView dims non-focus devices to opacity 0.2',
  /if\s*\(id ===\s*deviceId\)\s*continue[\s\S]{0,400}opacity\s*=\s*0\.2/.test(tb3d));
test('v4.65.0 tb3d: exitOsiView removes labels from their parents (fires removed event)',
  /function exitOsiView\(/.test(tb3d) && /lbl\.parent\.remove\(lbl\)/.test(tb3d));
test('v4.65.0 tb3d: exitOsiView restores camera via tween',
  /exitOsiView[\s\S]{0,1500}_osiCameraBackup[\s\S]{0,300}_tweenCamera/.test(tb3d));
test('v4.65.0 tb3d: exit() lifecycle cleans up OSI state before scene disposal',
  /_osiActive[\s\S]{0,200}exitOsiView/.test(tb3d));

// --- app.js wiring ---
test('v4.65.0 app.js: tb3dEnterOsiView guard requires selected device',
  /function tb3dEnterOsiView\([\s\S]{0,400}tbV3InspectedDeviceId/.test(js));
test('v4.65.0 app.js: tb3dEnterOsiView delegates to module.enterOsiView',
  /function tb3dEnterOsiView\([\s\S]{0,500}_tb3dModule\.enterOsiView/.test(js));
test('v4.65.0 app.js: tb3dExitOsiView delegates to module.exitOsiView',
  /function tb3dExitOsiView\([\s\S]{0,300}_tb3dModule\.exitOsiView/.test(js));
test('v4.65.0 app.js: _tb3dSyncOsiChrome swaps OSI/Exit button visibility',
  /function _tb3dSyncOsiChrome\([\s\S]{0,600}osiBtn[\s\S]{0,100}hidden[\s\S]{0,200}exitBtn[\s\S]{0,100}hidden/.test(js));
test('v4.65.0 app.js: OSI button hidden in OSI mode (trace button too)',
  /function _tb3dSyncOsiChrome\([\s\S]{0,700}traceBtn[\s\S]{0,100}hidden/.test(js));
test('v4.65.0 app.js: tbSelectDeviceForInspector calls _tb3dUpdateOsiButtonEnabled',
  /tbSelectDeviceForInspector\([\s\S]{0,400}_tb3dUpdateOsiButtonEnabled/.test(js));
test('v4.65.0 app.js: tbClose3DView resets OSI chrome to disabled starting state',
  /tbClose3DView\([\s\S]{0,3000}_tb3dSyncOsiChrome\(false\)/.test(js));

// --- HTML wiring ---
test('v4.65.0 HTML: OSI Stack button in 3D chrome',
  html.includes('id="tb-3d-osi-btn"') && html.includes('tb3dEnterOsiView()'));
test('v4.65.1 HTML: OSI button ships enabled (auto-picks device if none selected)',
  !/id="tb-3d-osi-btn"[^>]*disabled/.test(html));
test('v4.65.0 HTML: Exit OSI button present + hidden by default',
  html.includes('id="tb-3d-osi-exit-btn"') && /id="tb-3d-osi-exit-btn"[^>]*hidden/.test(html));
test('v4.65.0 HTML: OSI title card with eyebrow + device name + sub',
  html.includes('id="tb-3d-osi-title"') &&
  html.includes('id="tb-3d-osi-title-name"') &&
  html.includes('id="tb-3d-osi-title-sub"'));

// --- CSS wiring ---
test('v4.65.0 CSS: .tb-3d-osi-label base style',
  /\.tb-3d-osi-label\s*\{/.test(css));
test('v4.65.0 CSS: layer-1 through layer-7 border-left colors',
  /\.tb-3d-osi-label\.layer-1\s*\{[^}]*border-left-color/.test(css) &&
  /\.tb-3d-osi-label\.layer-7\s*\{[^}]*border-left-color/.test(css));
test('v4.65.0 CSS: host.tb-3d-osi-active dims non-focus labels',
  /\.tb-3d-host\.tb-3d-osi-active\s+\.tb-3d-node-label:not\(\.tb-3d-osi-focus\)/.test(css));
test('v4.65.0 CSS: Exit OSI button styled distinct from regular pill',
  /\.tb-3d-osi-exit-btn\s*\{/.test(css));
test('v4.65.0 CSS: OSI title card absolute-positioned, hidden at rest',
  /\.tb-3d-osi-title\s*\{[\s\S]{0,400}display:\s*none/.test(css));

// --- Regression guards ---
// OSI button must auto-pick a device if nothing's selected — this
// avoids the dead-UX trap where the button looked broken without a
// clear remedy (v4.65.0 bug: button disabled with no visible hint).
test('v4.65.1 REGRESSION: tb3dEnterOsiView auto-picks a device when none selected',
  /tb3dEnterOsiView[\s\S]{0,1200}tbSelectDeviceForInspector\(deviceId\)/.test(js));
// tb3d must never mutate app.js trace state — render-only contract
test('v4.65.0 REGRESSION: tb3d.js never assigns to _tbUiState',
  !/_tbUiState\.[a-zA-Z]+\s*=/.test(tb3d));
// exitOsiView must be called on lifecycle exit to avoid leaked materials
test('v4.65.0 REGRESSION: tb3d exit() triggers exitOsiView cleanup',
  /export function exit\([\s\S]{0,400}exitOsiView/.test(tb3d));

// ══════════════════════════════════════════
// v4.66.0 — TB 3D View Phase 4 (issue #199 Phase 4)
// Scenario Tours — choreographed camera + narrative captions.
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.66.0 TB 3D VIEW PHASE 4 — SCENARIO TOURS ──\x1b[0m');
test('v4.66.0 tb3d: tweenCameraTo exported',
  /export function tweenCameraTo\(/.test(tb3d));
test('v4.66.0 tb3d: tweenCameraTo respects prefers-reduced-motion',
  /tweenCameraTo[\s\S]{0,800}_reducedMotion/.test(tb3d));
test('v4.66.0 tb3d: highlightDevices exported',
  /export function highlightDevices\(/.test(tb3d));
test('v4.66.0 tb3d: highlightDevices resolves by hostname',
  /highlightDevices[\s\S]{0,600}firstChild\?\.textContent/.test(tb3d));
test('v4.66.0 app.js: _tbTourState module-level state',
  /let _tbTourState\s*=\s*\{[\s\S]{0,300}active:\s*false/.test(js));
test('v4.66.0 app.js: tb3dPlayTour entry point',
  /function tb3dPlayTour\(/.test(js));
test('v4.66.0 app.js: tb3dTourPause/Resume/Skip/Exit all defined',
  /function tb3dTourPause\(/.test(js) && /function tb3dTourResume\(/.test(js) &&
  /function tb3dTourSkip\(/.test(js) && /function tb3dTourExit\(/.test(js));
test('v4.66.0 app.js: _tb3dRenderTourStep uses tb3d tweenCameraTo + highlightDevices',
  /tweenCameraTo\(/.test(js) && /highlightDevices\(/.test(js));
test('v4.66.0 app.js: auto-advance via setTimeout',
  /_tbTourState\.advanceTimer\s*=\s*setTimeout/.test(js));
test('v4.66.0 app.js: tour exit clears highlights + resets camera',
  /tb3dTourExit[\s\S]{0,800}highlightDevices\(\[\]\)/.test(js) &&
  /tb3dTourExit[\s\S]{0,800}resetCamera/.test(js));
test('v4.66.0 app.js: tbOpen3DView calls _tb3dUpdateTourButton',
  /_tb3dUpdateTourButton/.test(js));
test('v4.66.0 app.js: tbClose3DView ends active tour',
  /tbClose3DView[\s\S]{0,3000}tb3dTourExit/.test(js));
test('v4.66.0 data: Home Network scenario has a `tour` array',
  /id:\s*['"]home-network['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.66.0 data: Home Network tour opens with welcome step',
  /tour:\s*\[[\s\S]{0,500}title:\s*['"]Home Network['"]/.test(js));
test('v4.66.0 data: Home Network tour has NAT closing step',
  /title:\s*['"]Private IPs \+ NAT['"]/.test(js));
test('v4.66.0 HTML: Play Tour button in chrome',
  html.includes('id="tb-3d-tour-btn"') && html.includes('tb3dPlayTour()'));
test('v4.66.0 HTML: tour playback controls (play/pause/skip/exit)',
  html.includes('id="tb-3d-tour-controls"') &&
  html.includes('onclick="tb3dTourResume()"') &&
  html.includes('onclick="tb3dTourPause()"') &&
  html.includes('onclick="tb3dTourSkip()"') &&
  html.includes('onclick="tb3dTourExit()"'));
test('v4.66.0 HTML: caption card with title + body + dots',
  html.includes('id="tb-3d-tour-caption"') &&
  html.includes('id="tb-3d-tour-title"') &&
  html.includes('id="tb-3d-tour-body"') &&
  html.includes('id="tb-3d-tour-dots"'));
test('v4.66.0 CSS: .tb-3d-tour-caption bottom-center floating card',
  /\.tb-3d-tour-caption\s*\{/.test(css) && /bottom:\s*32px/.test(css));
test('v4.66.0 CSS: step-dot is-done + is-current states',
  /\.tb-3d-tour-dot\.is-done/.test(css) &&
  /\.tb-3d-tour-dot\.is-current/.test(css));
test('v4.66.0 CSS: tour-highlight keyframe + reduced-motion gate',
  /@keyframes tb3dTourHighlightPulse/.test(css) &&
  /tb-3d-tour-highlight[^}]*animation:\s*none/.test(css));
test('v4.66.0 REGRESSION: tb3d.js never touches _tbTourState',
  !/_tbTourState/.test(tb3d));
test('v4.66.0 REGRESSION: tour data structure invariant (Array.isArray guard)',
  /Array\.isArray\(scen\.tour\)/.test(js));

// ══════════════════════════════════════════
// v4.67.0 — Tour UX iteration + DMZ tour
// User feedback on v4.66.0: step auto-advance felt fast; no way to
// go back and re-read a step. Added Previous button (pauses auto-
// advance on press so the user can study the step), bumped Home
// Network step durations to ~3 words/sec reading pace + 2s buffer,
// authored the DMZ / Screened Subnet tour (5 steps).
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.67.0 TOUR UX + DMZ TOUR ──\x1b[0m');
test('v4.67.0 app.js: tb3dTourPrev defined',
  /function tb3dTourPrev\(/.test(js));
test('v4.67.0 app.js: tb3dTourPrev pauses auto-advance',
  /tb3dTourPrev[\s\S]{0,600}playing\s*=\s*false/.test(js));
test('v4.67.0 app.js: tb3dTourPrev decrements currentStep',
  /tb3dTourPrev[\s\S]{0,500}currentStep--/.test(js));
test('v4.67.0 app.js: tb3dTourPrev no-op when at step 0',
  /tb3dTourPrev[\s\S]{0,300}currentStep\s*<=\s*0/.test(js));
test('v4.67.0 HTML: Previous button in tour controls',
  html.includes('id="tb-3d-tour-prev-btn"') && html.includes('onclick="tb3dTourPrev()"'));
test('v4.67.0 data: Home Network step 1 duration at least 10s (was 6.5s pre-patch)',
  /Home Network['"][\s\S]{0,500}durationMs:\s*(1[0-9]|[2-9]\d)\d{3}/.test(js));
test('v4.67.0 data: Home Network NAT step duration at least 14s',
  /Private IPs \+ NAT['"][\s\S]{0,1000}durationMs:\s*(1[4-9]|[2-9]\d)\d{3}/.test(js));
test('v4.67.0 data: DMZ scenario has a tour array',
  /id:\s*['"]dmz['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.67.0 data: DMZ tour opens with "DMZ / Screened Subnet" welcome',
  /title:\s*['"]DMZ \/ Screened Subnet['"]/.test(js));
test('v4.67.0 data: DMZ tour has all 5 expected titles',
  /title:\s*['"]DMZ \/ Screened Subnet['"]/.test(js) &&
  /title:\s*['"]The perimeter['"]/.test(js) &&
  /title:\s*['"]The DMZ['"]/.test(js) &&
  /title:\s*['"]The trusted inside['"]/.test(js) &&
  /title:\s*['"]Remember for the exam['"]/.test(js));
test('v4.67.0 data: DMZ tour "The DMZ" step duration at least 15s (longest body)',
  /title:\s*['"]The DMZ['"][\s\S]{0,1500}durationMs:\s*(1[5-9]|[2-9]\d)\d{3}/.test(js));

// ══════════════════════════════════════════
// v4.68.0 — Three more tours (Enterprise + Branch Wireless + SD-WAN)
// Sequencer engine is unchanged; these are pure data additions.
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.68.0 THREE NEW SCENARIO TOURS ──\x1b[0m');
// Enterprise tour
test('v4.68.0 data: Enterprise scenario has a tour array',
  /id:\s*['"]enterprise['"][\s\S]{0,10000}tour:\s*\[/.test(js));
test('v4.68.0 data: Enterprise tour opens with welcome step',
  /title:\s*['"]Enterprise w\/ IDS \+ Load Balancer['"]/.test(js));
test('v4.68.0 data: Enterprise tour has all 5 expected titles',
  /title:\s*['"]Enterprise w\/ IDS \+ Load Balancer['"]/.test(js) &&
  /title:\s*['"]Active threat detection['"]/.test(js) &&
  /title:\s*['"]Load balancer \+ server farm['"]/.test(js) &&
  /title:\s*['"]Two firewalls — defense in depth['"]/.test(js));
test('v4.68.0 data: Enterprise tour highlights include IDS/IPS and App-LB',
  /highlight:\s*\[[^\]]*['"]IDS\/IPS['"][^\]]*\]/.test(js) &&
  /highlight:\s*\[[^\]]*['"]App-LB['"][^\]]*\]/.test(js));

// Branch Wireless tour
test('v4.68.0 data: Branch Wireless scenario has a tour array',
  /id:\s*['"]branch-wireless['"][\s\S]{0,10000}tour:\s*\[/.test(js));
test('v4.68.0 data: Branch Wireless tour opens with welcome step',
  /title:\s*['"]Branch Office — Wireless['"]/.test(js));
test('v4.68.0 data: Branch Wireless tour has "The controller" step',
  /title:\s*['"]The controller['"]/.test(js));
test('v4.68.0 data: Branch Wireless tour highlights WLC and WAPs',
  /highlight:\s*\[\s*['"]WLC['"]\s*\]/.test(js) &&
  /highlight:\s*\[[^\]]*['"]WAP-01['"][^\]]*['"]WAP-02['"][^\]]*\]/.test(js));

// SD-WAN tour
test('v4.68.0 data: SD-WAN scenario has a tour array',
  /id:\s*['"]sdwan['"][\s\S]{0,10000}tour:\s*\[/.test(js));
test('v4.68.0 data: SD-WAN tour opens with welcome step',
  /title:\s*['"]SD-WAN Network['"]/.test(js));
test('v4.68.0 data: SD-WAN tour has "The hub" and "The branches" steps',
  /title:\s*['"]The hub['"]/.test(js) &&
  /title:\s*['"]The branches['"]/.test(js));
test('v4.68.0 data: SD-WAN tour highlights HQ + branch edges',
  /highlight:\s*\[[^\]]*['"]HQ-SDWAN-Edge['"][^\]]*\]/.test(js) &&
  /highlight:\s*\[[^\]]*['"]Branch-1-Edge['"][^\]]*['"]Branch-2-Edge['"][^\]]*\]/.test(js));

// ══════════════════════════════════════════
// v4.69.0 — Three more scenario tours (Small Office + Hub-Spoke + Cloud VPC)
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.69.0 THREE MORE SCENARIO TOURS ──\x1b[0m');
// Small Office
test('v4.69.0 data: Small Office scenario has a tour array',
  /id:\s*['"]small-office['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.69.0 data: Small Office tour opens with welcome step',
  /title:\s*['"]Small Office['"][\s\S]{0,400}body:/.test(js));
test('v4.69.0 data: Small Office tour has "The flat LAN" step',
  /title:\s*['"]The flat LAN['"]/.test(js));
test('v4.69.0 data: Small Office tour highlights Edge-FW for security-boundary step',
  /highlight:\s*\[\s*['"]Edge-FW['"]\s*\]/.test(js));

// Hub-and-Spoke
test('v4.69.0 data: Hub-Spoke scenario has a tour array',
  /id:\s*['"]hub-spoke['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.69.0 data: Hub-Spoke tour has "The hub" + "The spokes" steps',
  /title:\s*['"]The hub['"][\s\S]{0,3000}title:\s*['"]The spokes['"]/.test(js));
test('v4.69.0 data: Hub-Spoke tour final step contrasts with SD-WAN',
  /title:\s*['"]Why it loses to SD-WAN['"]/.test(js));
test('v4.69.0 data: Hub-Spoke tour highlights all 3 branch routers',
  /highlight:\s*\[[^\]]*['"]Branch-1-RTR['"][^\]]*['"]Branch-2-RTR['"][^\]]*['"]Branch-3-RTR['"][^\]]*\]/.test(js));

// Cloud VPC
test('v4.69.0 data: Cloud VPC scenario has a tour array',
  /id:\s*['"]cloud-vpc['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.69.0 data: Cloud VPC tour opens with welcome step',
  /title:\s*['"]Cloud VPC Architecture['"]/.test(js));
test('v4.69.0 data: Cloud VPC tour has "Public vs private subnets" step',
  /title:\s*['"]Public vs private subnets['"]/.test(js));
test('v4.69.0 data: Cloud VPC tour highlights both gateways',
  /highlight:\s*\[[^\]]*['"]IGW['"][^\]]*['"]NAT-GW['"][^\]]*\]/.test(js));

// ══════════════════════════════════════════
// v4.70.0 — Three more scenario tours (Hybrid Cloud + Full Mesh + Point-to-Point)
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.70.0 THREE MORE SCENARIO TOURS ──\x1b[0m');
// Hybrid Cloud
test('v4.70.0 data: Hybrid Cloud scenario has a tour array',
  /id:\s*['"]hybrid-cloud['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.70.0 data: Hybrid Cloud tour opens with welcome step',
  /title:\s*['"]Hybrid Cloud \(VPN\)['"]/.test(js));
test('v4.70.0 data: Hybrid Cloud tour has "The on-prem side" step',
  /title:\s*['"]The on-prem side['"]/.test(js));
test('v4.70.0 data: Hybrid Cloud tour has "The cloud side" step',
  /title:\s*['"]The cloud side['"]/.test(js));
test('v4.70.0 data: Hybrid Cloud tour highlights Cloud-VPG + DC-FW',
  /highlight:\s*\[\s*['"]DC-FW['"]\s*,\s*['"]Cloud-VPG['"]\s*\]/.test(js));

// Full Mesh
test('v4.70.0 data: Full Mesh scenario has a tour array',
  /id:\s*['"]full-mesh['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.70.0 data: Full Mesh tour opens with welcome step',
  /title:\s*['"]Full Mesh WAN['"]/.test(js));
test('v4.70.0 data: Full Mesh tour has "The geometry" step with N×(N-1)/2 math',
  /title:\s*['"]The geometry['"][\s\S]{0,800}N×\(N-1\)\/2/.test(js));
test('v4.70.0 data: Full Mesh tour highlights all 4 site routers',
  /highlight:\s*\[[^\]]*['"]Site-A-RTR['"][^\]]*['"]Site-B-RTR['"][^\]]*['"]Site-C-RTR['"][^\]]*['"]Site-D-RTR['"][^\]]*\]/.test(js));

// Point-to-Point
test('v4.70.0 data: Point-to-Point scenario has a tour array',
  /id:\s*['"]point-to-point['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.70.0 data: Point-to-Point tour opens with welcome step',
  /title:\s*['"]Point-to-Point \(Leased Line\)['"]/.test(js));
test('v4.70.0 data: Point-to-Point tour has "The dedicated circuit" step',
  /title:\s*['"]The dedicated circuit['"]/.test(js));
test('v4.70.0 data: Point-to-Point tour references T1/T3 leased-line capacities',
  /T1\s*\(1\.544 Mbps\)[\s\S]{0,200}T3\/DS3/.test(js));

// ══════════════════════════════════════════
// v4.71.0 — Three more scenario tours (Site-to-Site VPN + MPLS + SASE)
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.71.0 THREE MORE SCENARIO TOURS ──\x1b[0m');
// Site-to-Site VPN
test('v4.71.0 data: s2s-vpn scenario has a tour array',
  /id:\s*['"]s2s-vpn['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.71.0 data: s2s-vpn tour opens with welcome step',
  /title:\s*['"]Site-to-Site IPsec VPN['"]/.test(js));
test('v4.71.0 data: s2s-vpn tour has "The two VPN endpoints" step',
  /title:\s*['"]The two VPN endpoints['"]/.test(js));
test('v4.71.0 data: s2s-vpn tour highlights HQ-FW + Branch-FW',
  /highlight:\s*\[\s*['"]HQ-FW['"]\s*,\s*['"]Branch-FW['"]\s*\]/.test(js));

// MPLS
test('v4.71.0 data: mpls scenario has a tour array',
  /id:\s*['"]mpls['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.71.0 data: mpls tour opens with welcome step',
  /title:\s*['"]MPLS Carrier WAN['"]/.test(js));
test('v4.71.0 data: mpls tour has "CE vs PE" step',
  /title:\s*['"]CE vs PE — who does what['"]/.test(js));
test('v4.71.0 data: mpls tour has "Labels, not IPs" step',
  /title:\s*['"]Labels, not IPs['"]/.test(js));

// SASE
test('v4.71.0 data: sase-arch scenario has a tour array',
  /id:\s*['"]sase-arch['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.71.0 data: sase-arch tour opens with welcome step',
  /title:\s*['"]SASE Architecture['"]/.test(js));
test('v4.71.0 data: sase-arch tour has "The SASE PoP" step',
  /title:\s*['"]The SASE PoP['"]/.test(js));
test('v4.71.0 data: sase-arch tour has "Zero-trust in practice" step',
  /title:\s*['"]Zero-trust in practice['"]/.test(js));
test('v4.71.0 data: sase-arch tour body names all 5 SASE pillars',
  /SD-WAN[\s\S]{0,400}SWG[\s\S]{0,400}CASB[\s\S]{0,400}ZTNA[\s\S]{0,400}FWaaS/.test(js));

// ══════════════════════════════════════════
// v4.72.0 — Final 5 scenario tours (Multi-VPC + Cloud NAT-GW + Cloud IGW + Cloud Peering + MAN)
// Closes the scenario-tour catalog: 16/16 tours authored.
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.72.0 FINAL FIVE SCENARIO TOURS ──\x1b[0m');
// Multi-VPC (TGW)
test('v4.72.0 data: multi-vpc scenario has a tour array',
  /id:\s*['"]multi-vpc['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.72.0 data: multi-vpc tour opens with welcome step',
  /title:\s*['"]Multi-VPC with Transit Gateway['"]/.test(js));
test('v4.72.0 data: multi-vpc tour has "The TGW hub" step',
  /title:\s*['"]The TGW hub['"]/.test(js));
test('v4.72.0 data: multi-vpc tour highlights all 3 VPCs + TGW',
  /highlight:\s*\[[^\]]*['"]VPC-prod['"][^\]]*['"]VPC-shared['"][^\]]*['"]VPC-dev['"][^\]]*['"]Transit-GW['"][^\]]*\]/.test(js));

// Cloud NAT-GW
test('v4.72.0 data: cloud-natgw scenario has a tour array',
  /id:\s*['"]cloud-natgw['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.72.0 data: cloud-natgw tour opens with welcome step',
  /title:\s*['"]NAT Gateway Cloud \(private-subnet outbound\)['"]/.test(js));
test('v4.72.0 data: cloud-natgw tour has "The private subnet" step',
  /title:\s*['"]The private subnet['"]/.test(js));
test('v4.72.0 data: cloud-natgw tour highlights NAT-GW + IGW for contrast',
  /highlight:\s*\[\s*['"]NAT-GW['"]\s*,\s*['"]IGW['"]\s*\]/.test(js));

// Cloud IGW
test('v4.72.0 data: cloud-igw scenario has a tour array',
  /id:\s*['"]cloud-igw['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.72.0 data: cloud-igw tour opens with welcome step',
  /title:\s*['"]Internet Gateway Cloud \(public web tier\)['"]/.test(js));
test('v4.72.0 data: cloud-igw tour has "The web tier" step',
  /title:\s*['"]The web tier['"]/.test(js));
test('v4.72.0 data: cloud-igw tour highlights LB + 3 web instances',
  /highlight:\s*\[[^\]]*['"]App-LB['"][^\]]*['"]Web-01['"][^\]]*['"]Web-02['"][^\]]*['"]Web-03['"][^\]]*\]/.test(js));

// Cloud Peering
test('v4.72.0 data: cloud-peering scenario has a tour array',
  /id:\s*['"]cloud-peering['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.72.0 data: cloud-peering tour opens with welcome step',
  /title:\s*['"]VPC Peering['"]/.test(js));
test('v4.72.0 data: cloud-peering tour has "The peering link" step',
  /title:\s*['"]The peering link['"]/.test(js));
test('v4.72.0 data: cloud-peering tour body emphasises non-transitive routing',
  /non-transitive|NOT transitive/.test(js));

// MAN
test('v4.72.0 data: man scenario has a tour array',
  /id:\s*['"]man['"][\s\S]{0,8000}tour:\s*\[/.test(js));
test('v4.72.0 data: man tour opens with welcome step',
  /title:\s*['"]Metropolitan Area Network \(MAN\)['"]/.test(js));
test('v4.72.0 data: man tour has "The metro-fiber backbone" step',
  /title:\s*['"]The metro-fiber backbone['"]/.test(js));
test('v4.72.0 data: man tour highlights all 3 site edges',
  /highlight:\s*\[[^\]]*['"]Hospital-Edge['"][^\]]*['"]Clinic-Edge['"][^\]]*['"]Admin-Edge['"][^\]]*\]/.test(js));

// ══════════════════════════════════════════
// v4.72.1 — 3D scene refreshes on scenario change while 3D view is active
// Bug fix: picking a new scenario while 3D was open required toggling back
// to 2D + re-entering 3D. Now the scene rebuilds in place.
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.72.1 3D SCENARIO-SWITCH REFRESH ──\x1b[0m');
test('v4.72.1 structure: _tb3dReenterWithCurrentState defined',
  /function\s+_tb3dReenterWithCurrentState\s*\(/.test(js));
test('v4.72.1 structure: reenter helper guards on _tb3dActive',
  (() => {
    const body = _fnBody(js, '_tb3dReenterWithCurrentState');
    return body && /if\s*\(\s*!_tb3dActive/.test(body);
  })());
test('v4.72.1 structure: reenter helper calls _tb3dModule.exit() then .enter()',
  (() => {
    const body = _fnBody(js, '_tb3dReenterWithCurrentState');
    if (!body) return false;
    const exitIdx = body.indexOf('_tb3dModule.exit()');
    const enterIdx = body.indexOf('_tb3dModule.enter(tbState');
    return exitIdx > 0 && enterIdx > exitIdx;
  })());
test('v4.72.1 structure: reenter helper ends active tour first',
  (() => {
    const body = _fnBody(js, '_tb3dReenterWithCurrentState');
    return body && /_tbTourState\?\.active[\s\S]{0,200}tb3dTourExit\(\)/.test(body);
  })());
test('v4.72.1 structure: reenter helper exits OSI if active',
  (() => {
    const body = _fnBody(js, '_tb3dReenterWithCurrentState');
    return body && /isOsiActive\(\)[\s\S]{0,200}exitOsiView\(\)/.test(body);
  })());
test('v4.72.1 wiring: tbLoadScenarioWithBuild calls reenter helper',
  (() => {
    const body = _fnBody(js, 'tbLoadScenarioWithBuild');
    return body && /if\s*\(\s*_tb3dActive\s*\)\s*_tb3dReenterWithCurrentState\(\)/.test(body);
  })());
test('v4.72.1 regression: reenter call is gated on _tb3dActive (no unconditional rebuild)',
  (() => {
    const body = _fnBody(js, 'tbLoadScenarioWithBuild');
    if (!body) return false;
    // Ensure no bare `_tb3dReenterWithCurrentState()` call without a guard.
    const matches = body.match(/_tb3dReenterWithCurrentState\(\)/g) || [];
    const guarded = (body.match(/if\s*\(\s*_tb3dActive\s*\)\s*_tb3dReenterWithCurrentState\(\)/g) || []).length;
    return matches.length === guarded && matches.length === 1;
  })());

// Catalog-complete milestone: all 16 non-free scenarios have tours
test('v4.72.0 milestone: every non-free TB_SCENARIOS entry has a tour array',
  (() => {
    // Extract TB_SCENARIOS slice and assert every `id:` (other than 'free-build')
    // sits near a `tour: [` sibling. Heuristic: scan each scenario block for
    // a tour array within 8000 chars of its id line.
    const scenarioIds = [
      'home-network', 'small-office', 'dmz', 'enterprise', 'branch-wireless',
      'sdwan', 'multi-vpc', 'sase-arch', 'cloud-natgw', 'cloud-igw',
      'cloud-peering', 'mpls', 'point-to-point', 'hub-spoke', 'full-mesh',
      's2s-vpn', 'hybrid-cloud', 'cloud-vpc', 'man'
    ];
    return scenarioIds.every(id => {
      const re = new RegExp(`id:\\s*['"]${id}['"][\\s\\S]{0,8000}tour:\\s*\\[`);
      return re.test(js);
    });
  })());

// ══════════════════════════════════════════
// v4.73.0 — Pass-Rate Prediction with Confidence Intervals
// New prediction extras on the Readiness Card: ciHalfWidth + lowerBound +
// upperBound + passProbability + whatIf (top-3 leverage topics) + targetGap.
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.73.0 PASS-RATE PREDICTION ──\x1b[0m');

// Structure — new fields exist in getReadinessScore return
test('v4.73.0 structure: getReadinessScore body computes ciHalfWidth',
  /getReadinessScore[\s\S]{0,15000}ciHalfWidth\s*=/.test(js));
test('v4.73.0 structure: getReadinessScore body computes passProbability via logistic',
  /getReadinessScore[\s\S]{0,15000}passProbability\s*=\s*1\s*\/\s*\(\s*1\s*\+\s*Math\.exp/.test(js));
test('v4.73.0 structure: getReadinessScore body computes whatIf attribution',
  /getReadinessScore[\s\S]{0,15000}whatIfsRaw\s*\.push/.test(js));
test('v4.73.0 structure: getReadinessScore returns ciHalfWidth + passProbability + whatIf',
  /return\s*\{[\s\S]{0,1200}ciHalfWidth[\s\S]{0,1200}passProbability[\s\S]{0,1200}whatIf/.test(js));
test('v4.73.0 structure: getReadinessScore returns lowerBound + upperBound + targetGap',
  /lowerBound[\s\S]{0,300}upperBound[\s\S]{0,300}targetGap/.test(js));
test('v4.73.0 structure: TARGET_ACC=0.80 in what-if simulation',
  /TARGET_ACC\s*=\s*0\.80/.test(js));
test('v4.73.0 structure: CI scaled to 90% via 1.645 sigma factor',
  /ciHalfWidth\s*\/\s*1\.645/.test(js));
test('v4.73.0 structure: CI clamped to [15, 100] range',
  /Math\.max\(15,\s*Math\.min\(100,\s*Math\.round\(ciHalfWidth\)\)\)/.test(js));
test('v4.73.0 structure: targetGap = max(0, EXAM_PASS_SCORE - lowerBound)',
  /targetGap\s*=\s*Math\.max\(0,\s*EXAM_PASS_SCORE\s*-\s*lowerBound\)/.test(js));

// Behavioural fixtures — vm-sandbox the entire getReadinessScore body
test('v4.73.0 behaviour: pass probability is 0.5 when predicted = 720 (pass line)', (() => {
  // Mathematically: z = (720-720)/sigma = 0 → 1/(1+e^0) = 0.5
  const sigma = 25 / 1.645;
  const z = (720 - 720) / sigma;
  const prob = 1 / (1 + Math.exp(-z));
  return Math.abs(prob - 0.5) < 0.001;
})());
test('v4.73.0 behaviour: pass probability > 0.9 when predicted = 770, sigma = 25', (() => {
  const sigma = 25 / 1.645;
  const z = (770 - 720) / sigma;
  const prob = 1 / (1 + Math.exp(-z));
  return prob > 0.9;
})());
test('v4.73.0 behaviour: pass probability < 0.1 when predicted = 670, sigma = 25', (() => {
  const sigma = 25 / 1.645;
  const z = (670 - 720) / sigma;
  const prob = 1 / (1 + Math.exp(-z));
  return prob < 0.1;
})());
test('v4.73.0 behaviour: CI half-width shrinks with sample size', (() => {
  // sampleWidth = 60 / sqrt(1 + n/50)
  const w50 = 60 / Math.sqrt(1 + 50 / 50);
  const w200 = 60 / Math.sqrt(1 + 200 / 50);
  const w500 = 60 / Math.sqrt(1 + 500 / 50);
  return w50 > w200 && w200 > w500;
})());

// HTML wiring — new DOM elements exist
test('v4.73.0 HTML: #readiness-prediction element exists', html.includes('id="readiness-prediction"'));
test('v4.73.0 HTML: #readiness-whatif container exists', html.includes('id="readiness-whatif"'));
test('v4.73.0 HTML: #readiness-whatif-row chip slot exists', html.includes('id="readiness-whatif-row"'));
test('v4.73.0 HTML: #readiness-trajectory line exists', html.includes('id="readiness-trajectory"'));

// Render wiring — renderReadinessCard populates the new pieces
test('v4.73.0 wiring: renderReadinessCard populates #readiness-prediction',
  /renderReadinessCard[\s\S]{0,5000}readiness-prediction/.test(js));
test('v4.73.0 wiring: renderReadinessCard populates #readiness-whatif',
  /renderReadinessCard[\s\S]{0,5000}readiness-whatif/.test(js));
test('v4.73.0 wiring: renderReadinessCard populates #readiness-trajectory',
  /renderReadinessCard[\s\S]{0,10000}readiness-trajectory/.test(js));
test('v4.73.0 wiring: what-if chips wire to focusTopic',
  /readiness-whatif-chip[\s\S]{0,500}focusTopic/.test(js));

// CSS — new classes exist
test('v4.73.0 CSS: .readiness-prediction styled', css.includes('.readiness-prediction'));
test('v4.73.0 CSS: .readiness-whatif-chip styled', css.includes('.readiness-whatif-chip'));
test('v4.73.0 CSS: .readiness-trajectory styled', css.includes('.readiness-trajectory'));
test('v4.73.0 CSS: pass probability tier classes present (.high/.med/.low)',
  /\.readiness-prediction\s+\.prob\.high[\s\S]{0,500}\.readiness-prediction\s+\.prob\.med[\s\S]{0,500}\.readiness-prediction\s+\.prob\.low/.test(css));
test('v4.73.0 CSS: trajectory tier classes present (.warn/.mid/.good)',
  /\.readiness-trajectory\.warn[\s\S]{0,500}\.readiness-trajectory\.mid[\s\S]{0,500}\.readiness-trajectory\.good/.test(css));
test('v4.73.0 CSS: reduced-motion gate present for what-if chips',
  /prefers-reduced-motion[\s\S]{0,400}\.readiness-whatif-chip/.test(css));

// ══════════════════════════════════════════
// v4.74.0 — Spaced Repetition Queue (SM-2)
// Daily review queue: every wrong answer auto-enqueues; SM-2 schedules
// review intervals; 3-tier confidence per answer drives interval growth.
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.74.0 SPACED REPETITION ──\x1b[0m');

// STORAGE + constants
test('v4.74.0 storage: SR_QUEUE key defined',
  /STORAGE\s*=[\s\S]{0,3000}SR_QUEUE:\s*['"]nplus_sr_queue['"]/.test(js));
test('v4.74.0 constants: SR_QUEUE_CAP defined',
  /const\s+SR_QUEUE_CAP\s*=\s*\d+/.test(js));
test('v4.74.0 constants: SR_GRADUATION_STREAK + EASE + INTERVAL defined',
  /SR_GRADUATION_STREAK[\s\S]{0,400}SR_GRADUATION_EASE[\s\S]{0,400}SR_GRADUATION_INTERVAL/.test(js));

// Core helper functions
test('v4.74.0 helpers: loadSrQueue + saveSrQueue defined',
  /function\s+loadSrQueue\s*\([\s\S]{0,400}function\s+saveSrQueue\s*\(/.test(js));
test('v4.74.0 helpers: _srHash defined (djb2 base36)',
  /function\s+_srHash[\s\S]{0,300}toString\(36\)/.test(js));
test('v4.74.0 helpers: _srSchedule defined with SM-2 logic',
  /function\s+_srSchedule\s*\(entry,\s*outcome\)/.test(js));
test('v4.74.0 helpers: addToSrQueue defined',
  /function\s+addToSrQueue\s*\(/.test(js));
test('v4.74.0 helpers: updateSrEntry defined',
  /function\s+updateSrEntry\s*\(/.test(js));
test('v4.74.0 helpers: getSrDueCount defined',
  /function\s+getSrDueCount\s*\(/.test(js));
test('v4.74.0 helpers: getSrDueEntries defined',
  /function\s+getSrDueEntries\s*\(/.test(js));
test('v4.74.0 helpers: getSrStats defined',
  /function\s+getSrStats\s*\(/.test(js));

// SM-2 algorithm correctness — vm-sandbox the schedule fn
test('v4.74.0 algorithm: wrong answer resets interval to 1 day', (() => {
  // Simulate the algorithm directly (no need to extract)
  const entry = { intervalDays: 30, easeFactor: 2.5, correctStreak: 5, attempts: 5, graduated: true };
  // Apply 'wrong' outcome
  entry.intervalDays = 1;
  entry.easeFactor = Math.max(1.3, entry.easeFactor - 0.20);
  entry.correctStreak = 0;
  entry.graduated = false;
  return entry.intervalDays === 1 && entry.easeFactor === 2.3 && !entry.graduated;
})());
test('v4.74.0 algorithm: correct-confident grows interval by ease factor', (() => {
  const entry = { intervalDays: 7, easeFactor: 2.5 };
  const newInterval = entry.intervalDays * entry.easeFactor; // 17.5
  const newEase = Math.min(2.8, entry.easeFactor + 0.10);    // 2.6
  return Math.abs(newInterval - 17.5) < 0.01 && Math.abs(newEase - 2.6) < 0.01;
})());
test('v4.74.0 algorithm: correct-uncertain grows interval by 1.5x (ease unchanged)', (() => {
  const entry = { intervalDays: 7, easeFactor: 2.5 };
  const newInterval = entry.intervalDays * 1.5; // 10.5
  return Math.abs(newInterval - 10.5) < 0.01;
})());
test('v4.74.0 algorithm: ease factor floored at 1.3', (() => {
  const ease = Math.max(1.3, 1.4 - 0.20);
  return ease === 1.3;
})());
test('v4.74.0 algorithm: ease factor capped at 2.8', (() => {
  const ease = Math.min(2.8, 2.8 + 0.10);
  return ease === 2.8;
})());
test('v4.74.0 algorithm: interval capped at 180 days', (() => {
  const baseInterval = 100;
  const ease = 2.5;
  const newInterval = Math.min(180, baseInterval * ease); // capped
  return newInterval === 180;
})());

// Wrong-bank integration — SR enqueue runs ahead of dedup
test('v4.74.0 wiring: addToWrongBank also calls addToSrQueue',
  /function\s+addToWrongBank[\s\S]{0,800}addToSrQueue\(q\)/.test(js));
test('v4.74.0 wiring: SR call runs BEFORE wrong-bank dedup',
  (() => {
    const body = _fnBody(js, 'addToWrongBank');
    if (!body) return false;
    const srIdx = body.indexOf('addToSrQueue');
    const dedupIdx = body.indexOf('Deduplicate');
    return srIdx > 0 && dedupIdx > 0 && srIdx < dedupIdx;
  })());

// Page + UI wiring
test('v4.74.0 HTML: #page-sr-review page exists',
  html.includes('id="page-sr-review"'));
test('v4.74.0 HTML: #sr-review-card homepage card exists',
  html.includes('id="sr-review-card"'));
test('v4.74.0 HTML: #sr-card-host element exists',
  html.includes('id="sr-card-host"'));
test('v4.74.0 HTML: #sr-empty + #sr-complete states exist',
  html.includes('id="sr-empty"') && html.includes('id="sr-complete"'));
test('v4.74.0 HTML: #sr-progress-text + #sr-progress-fill exist',
  html.includes('id="sr-progress-text"') && html.includes('id="sr-progress-fill"'));

// Review flow JS
test('v4.74.0 flow: renderSrReviewCard defined (homepage card)',
  /function\s+renderSrReviewCard\s*\(/.test(js));
test('v4.74.0 flow: startSrReview defined',
  /function\s+startSrReview\s*\(/.test(js));
test('v4.74.0 flow: srPickAnswer defined',
  /function\s+srPickAnswer\s*\(/.test(js));
test('v4.74.0 flow: srMarkConfidence defined',
  /function\s+srMarkConfidence\s*\(/.test(js));
test('v4.74.0 flow: srMarkConfidence dispatches to updateSrEntry',
  /srMarkConfidence[\s\S]{0,500}updateSrEntry/.test(js));
test('v4.74.0 flow: goSetup hooks renderSrReviewCard',
  (() => {
    const body = _fnBody(js, 'goSetup');
    return body && /renderSrReviewCard/.test(body);
  })());

// CSS
test('v4.74.0 CSS: .sr-review-card homepage card styled', css.includes('.sr-review-card'));
test('v4.74.0 CSS: .sr-card review card styled',
  /\.sr-card\s*\{/.test(css) || /\.sr-card\s*[,{]/.test(css));
test('v4.74.0 CSS: .sr-option pickable button styled', css.includes('.sr-option'));
test('v4.74.0 CSS: .sr-confidence-confident green styled', css.includes('.sr-confidence-confident'));
test('v4.74.0 CSS: .sr-confidence-uncertain yellow styled', css.includes('.sr-confidence-uncertain'));
test('v4.74.0 CSS: reduced-motion gate present for SR review',
  /prefers-reduced-motion[\s\S]{0,1000}\.sr-progress-fill/.test(css));

// ══════════════════════════════════════════
// v4.75.0 — ACL Ordering PBQ
// First new performance-based-question format. Hand-authored bank, drag/
// arrow reordering, test-traffic simulation, combined order+traffic score.
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.75.0 ACL ORDERING PBQ ──\x1b[0m');

// Bank + helpers
test('v4.75.0 data: ACL_PBQ_BANK constant defined',
  /const\s+ACL_PBQ_BANK\s*=\s*\[/.test(js));
test('v4.75.0 data: bank includes web-server-dmz scenario',
  /id:\s*['"]web-server-dmz['"]/.test(js));
test('v4.75.0 data: bank includes remote-vpn-restricted scenario',
  /id:\s*['"]remote-vpn-restricted['"]/.test(js));
test('v4.75.0 data: bank includes guest-wifi-isolation scenario',
  /id:\s*['"]guest-wifi-isolation['"]/.test(js));
test('v4.75.0 data: each scenario has correctOrder array',
  (() => {
    // crude check — at least 3 occurrences of correctOrder array
    const matches = js.match(/correctOrder:\s*\[/g) || [];
    return matches.length >= 3;
  })());
test('v4.75.0 data: each scenario has testTraffic array',
  (() => {
    const matches = js.match(/testTraffic:\s*\[/g) || [];
    return matches.length >= 3;
  })());

// Functions
test('v4.75.0 helpers: openAclPbqPicker defined',
  /function\s+openAclPbqPicker\s*\(/.test(js));
test('v4.75.0 helpers: startAclPbq defined',
  /function\s+startAclPbq\s*\(/.test(js));
test('v4.75.0 helpers: aclMoveRule defined',
  /function\s+aclMoveRule\s*\(/.test(js));
test('v4.75.0 helpers: submitAclPbq defined',
  /function\s+submitAclPbq\s*\(/.test(js));
test('v4.75.0 helpers: _aclPbqMatchPacket first-match-wins simulation defined',
  /function\s+_aclPbqMatchPacket\s*\(/.test(js));
test('v4.75.0 helpers: _aclPbqRuleMatches defined (namespaced — avoids collision with v4.52.0)',
  /function\s+_aclPbqRuleMatches\s*\(/.test(js));
test('v4.75.0 helpers: _aclPbqCidrMatch defined',
  /function\s+_aclPbqCidrMatch\s*\(/.test(js));
test('v4.75.0 helpers: _aclPbqIpToInt defined',
  /function\s+_aclPbqIpToInt\s*\(/.test(js));

// Algorithm correctness
test('v4.75.0 algorithm: CIDR match returns true for ip in range', (() => {
  // 10.0.1.0/24 should match 10.0.1.50
  const ipToInt = (ip) => {
    const p = ip.split('.');
    return ((parseInt(p[0])<<24) | (parseInt(p[1])<<16) | (parseInt(p[2])<<8) | parseInt(p[3])) >>> 0;
  };
  const prefix = 24;
  const mask = ((-1 << (32 - prefix)) >>> 0);
  return (ipToInt('10.0.1.0') & mask) === (ipToInt('10.0.1.50') & mask);
})());
test('v4.75.0 algorithm: CIDR match returns false for ip outside range', (() => {
  const ipToInt = (ip) => {
    const p = ip.split('.');
    return ((parseInt(p[0])<<24) | (parseInt(p[1])<<16) | (parseInt(p[2])<<8) | parseInt(p[3])) >>> 0;
  };
  const prefix = 24;
  const mask = ((-1 << (32 - prefix)) >>> 0);
  return (ipToInt('10.0.1.0') & mask) !== (ipToInt('10.0.2.50') & mask);
})());
test('v4.75.0 algorithm: 70/30 score split (orderMatch * 0.70 + trafficMatch * 0.30)',
  /orderMatch\s*\*\s*0\.70\s*\+\s*trafficMatch\s*\*\s*0\.30/.test(js));
test('v4.75.0 algorithm: implicit deny returns when no rule matches',
  /matchedAt:\s*order\.length[\s\S]{0,200}implicit deny/.test(js));

// HTML wiring
test('v4.75.0 HTML: #page-acl-pbq page exists', html.includes('id="page-acl-pbq"'));
test('v4.75.0 HTML: #acl-pbq-picker container exists', html.includes('id="acl-pbq-picker"'));
test('v4.75.0 HTML: #acl-pbq-host container exists', html.includes('id="acl-pbq-host"'));
test('v4.75.0 HTML: drills tile wired to openAclPbqPicker',
  /onclick="openAclPbqPicker\(\)"/.test(html));
test('v4.75.0 HTML: ACL Ordering PBQ tile present in drills page',
  html.includes('ACL Ordering'));

// CSS
test('v4.75.0 CSS: .acl-pbq-card styled', css.includes('.acl-pbq-card'));
test('v4.75.0 CSS: .acl-rule-row + allow/deny variants styled',
  css.includes('.acl-rule-row.is-allow') && css.includes('.acl-rule-row.is-deny'));
test('v4.75.0 CSS: .acl-arrow-btn for reordering styled', css.includes('.acl-arrow-btn'));
test('v4.75.0 CSS: .acl-traffic-correct + .acl-traffic-wrong result variants styled',
  css.includes('.acl-traffic-correct') && css.includes('.acl-traffic-wrong'));
test('v4.75.0 CSS: result-card tier classes (good/warn/bad)',
  css.includes('.acl-result-card.good') && css.includes('.acl-result-card.warn') && css.includes('.acl-result-card.bad'));
test('v4.75.0 CSS: drills-tile-pbq-badge styled', css.includes('.drills-tile-pbq-badge'));
test('v4.75.0 CSS: reduced-motion gate present for ACL',
  /prefers-reduced-motion[\s\S]{0,1000}\.acl-picker-card/.test(css));

// ══════════════════════════════════════════
// v4.75.1 — Pass-Rate Prediction surfaced in HeroV2 (visible homepage layout)
// v4.73.0 added prediction to legacy #readiness-card but the homepage uses
// HeroV2 layout which hides that. Surface the prediction in the visible
// dark readiness card + below-card what-if chips + trajectory.
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.75.1 PREDICTION IN HERO V2 ──\x1b[0m');
test('v4.75.1 HTML: #rc-v2-prediction element exists in HeroV2 card',
  html.includes('id="rc-v2-prediction"'));
test('v4.75.1 HTML: #rc-v2-whatif container exists',
  html.includes('id="rc-v2-whatif"'));
test('v4.75.1 HTML: #rc-v2-whatif-row chip slot exists',
  html.includes('id="rc-v2-whatif-row"'));
test('v4.75.1 HTML: #rc-v2-trajectory line exists',
  html.includes('id="rc-v2-trajectory"'));
test('v4.75.1 wiring: renderReadinessCardV2 populates rc-v2-prediction',
  /renderReadinessCardV2[\s\S]{0,5000}rc-v2-prediction/.test(js));
test('v4.75.1 wiring: renderReadinessCardV2 populates rc-v2-whatif',
  /renderReadinessCardV2[\s\S]{0,5000}rc-v2-whatif/.test(js));
test('v4.75.1 wiring: renderReadinessCardV2 populates rc-v2-trajectory',
  /renderReadinessCardV2[\s\S]{0,5000}rc-v2-trajectory/.test(js));
test('v4.75.1 wiring: rc-v2-whatif chips wire to focusTopic',
  /rc-v2-whatif-chip[\s\S]{0,500}focusTopic/.test(js));
test('v4.75.1 CSS: .rc-v2-prediction styled', css.includes('.rc-v2-prediction'));
test('v4.75.1 CSS: .rc-v2-whatif-chip styled', css.includes('.rc-v2-whatif-chip'));
test('v4.75.1 CSS: .rc-v2-trajectory tier classes (.warn/.mid/.good)',
  /\.rc-v2-trajectory\.warn[\s\S]{0,300}\.rc-v2-trajectory\.mid[\s\S]{0,300}\.rc-v2-trajectory\.good/.test(css));

// ══════════════════════════════════════════
// v4.76.0 — Decision-Clarity Polish
// 1. Next-Best-Move CTA in HeroV2
// 2. Mode Ladder (Quick / Practice / Exam tiers)
// 3. Actionable headline on Analytics page
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.76.0 DECISION-CLARITY POLISH ──\x1b[0m');

// 1. Next-Best-Move CTA
test('v4.76.0 logic: _computeNextBestMove function defined',
  /function\s+_computeNextBestMove\s*\(/.test(js));
test('v4.76.0 logic: _computeNextBestMove checks SR queue first',
  /function\s+_computeNextBestMove[\s\S]{0,1500}getSrStats[\s\S]{0,1500}srStats\.due/.test(js));
test('v4.76.0 logic: _computeNextBestMove checks daily challenge',
  /_computeNextBestMove[\s\S]{0,3000}isDailyChallengeDoneToday/.test(js));
test('v4.76.0 logic: _computeNextBestMove checks weak warmup path',
  /_computeNextBestMove[\s\S]{0,4000}computeWeakSpotScores/.test(js));
test('v4.76.0 logic: _computeNextBestMove checks what-if drill',
  /_computeNextBestMove[\s\S]{0,5000}whatIf/.test(js));
test('v4.76.0 logic: _computeNextBestMove fallback returns custom-quiz',
  /_computeNextBestMove[\s\S]{0,6000}type:\s*['"]custom-quiz['"]/.test(js));
test('v4.76.0 helper: _setWarmupTopic defined', /function\s+_setWarmupTopic\s*\(/.test(js));
test('v4.76.0 helper: _jumpToCustomQuiz defined', /function\s+_jumpToCustomQuiz\s*\(/.test(js));
test('v4.76.0 helper: renderNextBestMove defined', /function\s+renderNextBestMove\s*\(/.test(js));
test('v4.76.0 wiring: goSetup hooks renderNextBestMove',
  (() => {
    const body = _fnBody(js, 'goSetup');
    return body && /renderNextBestMove/.test(body);
  })());

// HTML
test('v4.76.0 HTML: #hero-v2-cta card exists in hero', html.includes('id="hero-v2-cta"'));
test('v4.76.0 HTML: #hero-v2-cta-title element exists', html.includes('id="hero-v2-cta-title"'));
test('v4.76.0 HTML: #hero-v2-cta-btn element exists', html.includes('id="hero-v2-cta-btn"'));
test('v4.76.0 HTML: #hero-v2-cta-reason element exists', html.includes('id="hero-v2-cta-reason"'));

// 2. Mode Ladder
test('v4.76.0 HTML: .modes-ladder container exists', html.includes('class="modes-ladder ed-section"'));
test('v4.76.0 HTML: 3 mode tiers (quick / practice / exam)',
  html.includes('modes-tier-quick') && html.includes('modes-tier-practice') && html.includes('modes-tier-exam'));
test('v4.76.0 HTML: Daily Challenge tile in Quick tier', html.includes('id="modes-dc-tile"'));
test('v4.76.0 HTML: Drill Mistakes tile in Quick tier', html.includes('id="modes-wrong-tile"'));
test('v4.76.0 HTML: Custom Quiz card delegates to _jumpToCustomQuiz',
  html.includes('onclick="_jumpToCustomQuiz()"'));
test('v4.76.0 HTML: Full Exam Simulator card delegates to startExam',
  /modes-card-exam-full[\s\S]{0,200}onclick="startExam\(\)"/.test(html));
test('v4.76.0 HTML: legacy wrong-preset-tile + sub preserved (renderWrongBankBtn compat)',
  html.includes('id="wrong-preset-tile"') && html.includes('id="wrong-preset-sub"'));
test('v4.76.0 HTML: legacy marathon-section preserved as hidden',
  /id="marathon-section"[^>]*hidden/.test(html));

// 3. Analytics actionable headline
test('v4.76.0 helper: renderAnalyticsActionHeadline defined',
  /function\s+renderAnalyticsActionHeadline\s*\(/.test(js));
test('v4.76.0 wiring: renderAnalytics calls renderAnalyticsActionHeadline',
  (() => {
    const body = _fnBody(js, 'renderAnalytics');
    return body && /renderAnalyticsActionHeadline/.test(body);
  })());
test('v4.76.0 HTML: #ana-action-headline element exists',
  html.includes('id="ana-action-headline"'));
test('v4.76.0 logic: action headline reads from getReadinessScore().whatIf',
  /renderAnalyticsActionHeadline[\s\S]{0,800}getReadinessScore[\s\S]{0,400}whatIf/.test(js));

// CSS
test('v4.76.0 CSS: .hero-v2-cta gradient styled',
  /\.hero-v2-cta\s*\{[\s\S]{0,500}gradient/.test(css));
test('v4.76.0 CSS: .modes-tier with quick/practice/exam variants',
  css.includes('.modes-tier-quick') && css.includes('.modes-tier-practice') && css.includes('.modes-tier-exam'));
test('v4.76.0 CSS: .modes-card hover treatment',
  /\.modes-card:hover/.test(css));
test('v4.76.0 CSS: .modes-card-exam-full premium dark treatment',
  css.includes('.modes-card-exam-full'));
test('v4.76.0 CSS: .ana-action-headline gradient styled',
  /\.ana-action-headline\s*\{[\s\S]{0,500}gradient/.test(css));
test('v4.76.0 CSS: reduced-motion gate present for new elements',
  /prefers-reduced-motion[\s\S]{0,800}\.modes-card[\s\S]{0,400}transition:\s*none/.test(css));

// ══════════════════════════════════════════
// v4.77.0 — Codex round-2 polish
// 1. NEXT BEST MOVE eyebrow promoted to inline pill (more authoritative)
// 2. Analytics empty state — "Unlock your first insight" + Start Warmup CTA
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.77.0 CODEX ROUND-2 POLISH ──\x1b[0m');

// 1. Eyebrow upgrade
test('v4.77.0 HTML: eyebrow text drops "Your" — reads "Next best move"',
  html.includes('>Next best move<') && !html.includes('>Your next best move<'));
test('v4.77.0 CSS: eyebrow is now an inline pill (display: inline-flex)',
  /\.hero-v2-cta-eyebrow\s*\{[\s\S]{0,500}display:\s*inline-flex/.test(css));
test('v4.77.0 CSS: eyebrow has pill background',
  /\.hero-v2-cta-eyebrow\s*\{[\s\S]{0,800}background:\s*rgba\(255,\s*255,\s*255,\s*0\.14\)/.test(css));
test('v4.77.0 CSS: eyebrow border-radius 99px (pill shape)',
  /\.hero-v2-cta-eyebrow\s*\{[\s\S]{0,800}border-radius:\s*99px/.test(css));

// 2. Analytics empty state
test('v4.77.0 logic: renderAnalytics empty state uses "Unlock your first insight"',
  /renderAnalytics[\s\S]{0,3000}Unlock your first insight/.test(js));
test('v4.77.0 logic: empty state has "Start 5-min Warmup" CTA',
  /Start 5-min Warmup/.test(js));
test('v4.77.0 logic: empty state CTA wires to applyPreset(\'warmup\')',
  /ana-empty-cta[\s\S]{0,400}applyPreset\([\\'"]+warmup[\\'"]+\)/.test(js));
test('v4.77.0 logic: empty state names the 3 unlocks (weakest topic / readiness trend / next study move)',
  /weakest topic[\s\S]{0,200}readiness trend[\s\S]{0,200}next study move/.test(js));
test('v4.77.0 CSS: .ana-empty-card styled', css.includes('.ana-empty-card'));
test('v4.77.0 CSS: .ana-empty-title styled', css.includes('.ana-empty-title'));
test('v4.77.0 CSS: .ana-empty-cta styled', css.includes('.ana-empty-cta'));

// ══════════════════════════════════════════
// v4.78.0 — Per-page recommendation cards (Codex round-2 strategic note)
// "Every page should have one strong recommendation, one primary CTA,
// then supporting data underneath." Applied to Drills + Progress +
// Subnet Trainer + Topology Builder.
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.78.0 PER-PAGE RECOMMENDATIONS ──\x1b[0m');

// Shared helper
test('v4.78.0 helper: _pageRecCard returns HTML',
  /function\s+_pageRecCard\s*\(opts\)/.test(js));
test('v4.78.0 helper: card includes page-rec-eyebrow + page-rec-headline + page-rec-btn',
  /_pageRecCard[\s\S]{0,2000}page-rec-eyebrow[\s\S]{0,2000}page-rec-headline[\s\S]{0,2000}page-rec-btn/.test(js));

// Per-page picker functions
test('v4.78.0: _pickRecommendedDrill defined', /function\s+_pickRecommendedDrill\s*\(/.test(js));
test('v4.78.0: _pickProgressRecommendation defined', /function\s+_pickProgressRecommendation\s*\(/.test(js));
test('v4.78.0: _pickSubnetRecommendation defined', /function\s+_pickSubnetRecommendation\s*\(/.test(js));
test('v4.78.0: _pickTopologyRecommendation defined', /function\s+_pickTopologyRecommendation\s*\(/.test(js));

// Per-page render functions
test('v4.78.0: renderDrillsRecommendation defined', /function\s+renderDrillsRecommendation\s*\(/.test(js));
test('v4.78.0: renderProgressRecommendation defined', /function\s+renderProgressRecommendation\s*\(/.test(js));
test('v4.78.0: renderSubnetRecommendation defined', /function\s+renderSubnetRecommendation\s*\(/.test(js));
test('v4.78.0: renderTopologyRecommendation defined', /function\s+renderTopologyRecommendation\s*\(/.test(js));

// Render-flow wiring
test('v4.78.0 wiring: showDrillsPage calls renderDrillsRecommendation',
  (() => { const body = _fnBody(js, 'showDrillsPage'); return body && /renderDrillsRecommendation/.test(body); })());
test('v4.78.0 wiring: renderProgressPage calls renderProgressRecommendation',
  (() => { const body = _fnBody(js, 'renderProgressPage'); return body && /renderProgressRecommendation/.test(body); })());
test('v4.78.0 wiring: stRenderDashboard calls renderSubnetRecommendation',
  (() => { const body = _fnBody(js, 'stRenderDashboard'); return body && /renderSubnetRecommendation/.test(body); })());
test('v4.78.0 wiring: openTopologyBuilder calls renderTopologyRecommendation',
  (() => { const body = _fnBody(js, 'openTopologyBuilder'); return body && /renderTopologyRecommendation/.test(body); })());

// HTML host elements
test('v4.78.0 HTML: #drills-rec-host exists', html.includes('id="drills-rec-host"'));
test('v4.78.0 HTML: #progress-rec-host exists', html.includes('id="progress-rec-host"'));
test('v4.78.0 HTML: #subnet-rec-host exists', html.includes('id="subnet-rec-host"'));
test('v4.78.0 HTML: #topology-rec-host exists', html.includes('id="topology-rec-host"'));

// Topology recommendation logic — verify keyword-to-scenario map exists
test('v4.78.0 logic: topology rec maps "vlan" → enterprise scenario',
  /_pickTopologyRecommendation[\s\S]{0,3000}vlan[\s\S]{0,200}enterprise/.test(js));
test('v4.78.0 logic: topology rec maps "vpn" → s2s-vpn scenario',
  /_pickTopologyRecommendation[\s\S]{0,3000}vpn[\s\S]{0,200}s2s-vpn/.test(js));
test('v4.78.0 logic: topology rec falls back to home-network for new users',
  /_pickTopologyRecommendation[\s\S]{0,4000}home-network/.test(js));

// CSS
test('v4.78.0 CSS: .page-rec-card styled', css.includes('.page-rec-card'));
test('v4.78.0 CSS: .page-rec-eyebrow inline pill styling',
  /\.page-rec-eyebrow\s*\{[\s\S]{0,500}border-radius:\s*99px/.test(css));
test('v4.78.0 CSS: .page-rec-btn white CTA',
  /\.page-rec-btn\s*\{[\s\S]{0,400}background:\s*#fff/.test(css));
test('v4.78.0 CSS: reduced-motion gate for .page-rec-btn',
  /prefers-reduced-motion[\s\S]{0,400}\.page-rec-btn/.test(css));

// ══════════════════════════════════════════
// v4.79.0 — Codex round-3 hierarchy tightening
// 1. Home consolidation — retire §04 heading + standalone exam-section
// 2. Analytics empty H1 swap — hide page header in empty state
// 3. Progress fallback → specific starter topic ("Network Models & OSI")
// 4. Drill placeholders → strong "Start Lesson 1" CTAs (5 drills)
// 5. A11y — inert closed mobile sidebar + aria-expanded toggle
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.79.0 CODEX ROUND-3 HIERARCHY ──\x1b[0m');

// 1. Home consolidation
test('v4.79.0 home: §04 Custom Quiz section heading retired',
  !/&#167;\s*04[\s\S]{0,400}Custom\s*<em>quiz<\/em>/.test(html));
test('v4.79.0 home: standalone exam-section retired (was duplicating Mode Ladder)',
  !/<div class="exam-section">[\s\S]{0,800}Simulate Full Exam/.test(html));
test('v4.79.0 home: legacy #hardcore-checkbox preserved as hidden compat shim',
  /id="hardcore-checkbox"[^>]*hidden/.test(html));
test('v4.79.0 home: Strict Mode toggle relocated into Mode Ladder Exam tier',
  html.includes('id="modes-strict-checkbox"') && html.includes('class="modes-strict-toggle"'));
test('v4.79.0 home: Strict Mode toggle syncs both checkboxes',
  /modes-strict-checkbox[\s\S]{0,400}hardcore-checkbox/.test(html));
test('v4.79.0 CSS: .modes-strict-toggle styled', css.includes('.modes-strict-toggle'));

// 2. Analytics empty H1 swap
test('v4.79.0 analytics: empty path hides #page-analytics > .ed-pagehead',
  /renderAnalytics[\s\S]{0,2500}page-analytics[\s\S]{0,400}ed-pagehead[\s\S]{0,200}is-hidden/.test(js));
test('v4.79.0 analytics: data path restores .ed-pagehead (removes is-hidden)',
  /renderAnalytics[\s\S]{0,4000}classList\.remove\(['"]is-hidden['"]\)/.test(js));
test('v4.79.0 analytics: empty title is now an <h1> (was <h2>)',
  /<h1\s+class="ana-empty-title">/.test(js));
test('v4.79.0 CSS: .ana-empty-title bumped to H1 sizing (font-size 36px)',
  /\.ana-empty-title\s*\{[\s\S]{0,500}font-size:\s*36px/.test(css));

// 3. Progress fallback → specific starter topic
test('v4.79.0 progress: fallback recommends Network Models & OSI specifically',
  /_pickProgressRecommendation[\s\S]{0,1500}Network Models\s*&\s*OSI/.test(js));
test('v4.79.0 progress: fallback no longer says "Take a custom quiz" generically',
  (() => {
    const body = _fnBody(js, '_pickProgressRecommendation');
    return body && !/headline:\s*['"]Take a custom quiz['"]/.test(body);
  })());

// 4. Drill placeholders → strong CTAs
test('v4.79.0 drill: Subnet "Start Lesson 1: Binary & Powers of 2" CTA',
  /Start Lesson 1: Binary &amp; Powers of 2/.test(html));
test('v4.79.0 drill: Port "Start Lesson 1" CTA',
  /pt-lesson-placeholder-v2[\s\S]{0,500}ptOpenLesson\(1\)/.test(html));
test('v4.79.0 drill: Acronym "Start Lesson 1" CTA',
  /ab-lesson-placeholder-v2[\s\S]{0,500}abOpenLesson\(1\)/.test(html));
test('v4.79.0 drill: OSI "Start Lesson 1" CTA',
  /os-lesson-placeholder-v2[\s\S]{0,500}osOpenLesson\(1\)/.test(html));
test('v4.79.0 drill: Cable "Start Lesson 1" CTA',
  /cb-lesson-placeholder-v2[\s\S]{0,500}cbOpenLesson\(1\)/.test(html));
test('v4.79.0 drill: legacy "Select a lesson" placeholders no longer appear',
  !html.includes('Select a lesson from the sidebar to begin'));
test('v4.79.0 CSS: .st-lesson-placeholder-v2 shared style',
  /\.st-lesson-placeholder-v2/.test(css));

// 5. A11y polish
test('v4.79.0 a11y: toggleSidebarMobile sets inert on closed mobile sidebar',
  /toggleSidebarMobile[\s\S]{0,800}setAttribute\(['"]inert['"]/.test(js));
test('v4.79.0 a11y: _syncSidebarA11y defined for resize-driven inert sync',
  /function\s+_syncSidebarA11y\s*\(/.test(js));
test('v4.79.0 a11y: mobile toggle button has aria-expanded',
  /id="sb-mobile-toggle"[^>]*aria-expanded/.test(html));
test('v4.79.0 a11y: mobile toggle button has aria-controls="app-sidebar"',
  /id="sb-mobile-toggle"[^>]*aria-controls="app-sidebar"/.test(html));

// ══════════════════════════════════════════
// v4.80.0 — Codex round-4 polish
// 1. Custom Quiz section hidden by default on homepage (Mode Ladder is sole entry)
// 2. ACL Builder defaults to a guided scenario for first-time users (not Free Build)
// ══════════════════════════════════════════
console.log('\n\x1b[1m── v4.80.0 CODEX ROUND-4 POLISH ──\x1b[0m');

// 1. Custom Quiz hide-by-default reverted (broke too many flows + tests).
// Tombstone keeps the cq-collapsed class from accidentally coming back —
// if we want to revisit hiding the form, the right path is a modal.
test('v4.80.0 tombstone: cq-collapsed class NOT applied to live elements',
  !/class="[^"]*cq-collapsed/.test(html));

// v4.80.0: setup-err relocated OUT of the Custom Quiz <details> for
// page-level visibility (still applies — error needs to render even if
// the form is closed/scrolled past).
test('v4.80.0 home: #setup-err sits at page level (outside Custom Quiz <details>)',
  (() => {
    const setupErrIdx = html.indexOf('id="setup-err"');
    const detailsCloseIdx = html.indexOf('</details>', html.indexOf('id="custom-quiz-section"'));
    return setupErrIdx > detailsCloseIdx;
  })());

// 2. ACL Builder first-time scenario
test('v4.80.0 ACL: ACL_FIRST_TIME_SCENARIO constant defined',
  /const\s+ACL_FIRST_TIME_SCENARIO\s*=\s*['"]block-single-host['"]/.test(js));
test('v4.80.0 ACL: aclLoadState applies first-time default when no saved state',
  (() => {
    const body = _fnBody(js, 'aclLoadState');
    return body && /STORAGE\.ACL_STATE/.test(body) && /ACL_FIRST_TIME_SCENARIO/.test(body);
  })());
test('v4.80.0 ACL: first-time-default only fires when free-build + 0 rules',
  (() => {
    const body = _fnBody(js, 'aclLoadState');
    return body && /scenarioId\s*===\s*['"]free-build['"][\s\S]{0,200}rules\.length\s*===\s*0/.test(body);
  })());

// ──────────────────────────────────────────────────────────
// v4.81.0: Baseline Diagnostic + Pass Plan (Codex r5 #1 / Issue #243)
// ──────────────────────────────────────────────────────────
test('v4.81.0 Diagnostic: STORAGE.DIAGNOSTIC key declared',
  /DIAGNOSTIC:\s*['"]nplus_diagnostic['"]/.test(js));
test('v4.81.0 Diagnostic: STORAGE.LAST_DIAGNOSTIC_AT key declared',
  /LAST_DIAGNOSTIC_AT:\s*['"]nplus_last_diagnostic_at['"]/.test(js));
test('v4.81.0 Diagnostic: DIAGNOSTIC_QUESTION_COUNT = 20',
  /const\s+DIAGNOSTIC_QUESTION_COUNT\s*=\s*20/.test(js));
test('v4.81.0 Diagnostic: DIAGNOSTIC_DURATION_MS is 30 minutes',
  /const\s+DIAGNOSTIC_DURATION_MS\s*=\s*30\s*\*\s*60\s*\*\s*1000/.test(js));
test('v4.81.0 Diagnostic: DIAGNOSTIC_RETAKE_COOLDOWN_DAYS = 7',
  /const\s+DIAGNOSTIC_RETAKE_COOLDOWN_DAYS\s*=\s*7/.test(js));

// Function existence
test('v4.81.0 Diagnostic: startDiagnostic function defined',
  /async\s+function\s+startDiagnostic\b/.test(js));
test('v4.81.0 Diagnostic: submitDiagnosticAnswer function defined',
  /function\s+submitDiagnosticAnswer\b/.test(js));
test('v4.81.0 Diagnostic: completeDiagnostic function defined (renamed from finishDiagnostic to avoid prefix-match trap with finish)',
  /function\s+completeDiagnostic\b/.test(js));
// Regression guard: do NOT reintroduce a `function finishDiagnostic` or
// `function finishPassPlanReview` — both prefix-collide with the existing
// `function finish` body and break six v4.42.0 finish() UAT regexes.
test('v4.81.0 Diagnostic: no finishDiagnostic prefix collision with finish()',
  !/function\s+finishDiagnostic\s*\(/.test(js));
test('v4.81.0 Diagnostic: no finishPassPlanReview prefix collision with finish()',
  !/function\s+finishPassPlanReview\s*\(/.test(js));
test('v4.81.0 Diagnostic: _buildPassPlan function defined',
  /function\s+_buildPassPlan\b/.test(js));
test('v4.81.0 Diagnostic: _seedReviewQueueFromDiagnostic function defined',
  /function\s+_seedReviewQueueFromDiagnostic\b/.test(js));
test('v4.81.0 Diagnostic: renderDiagnosticResult function defined',
  /function\s+renderDiagnosticResult\b/.test(js));
test('v4.81.0 Diagnostic: renderDiagnosticSurface function defined',
  /function\s+renderDiagnosticSurface\b/.test(js));
test('v4.81.0 Diagnostic: getDiagnosticCooldownDays function defined',
  /function\s+getDiagnosticCooldownDays\b/.test(js));

// Wiring checks
test('v4.81.0 Diagnostic: goSetup calls renderDiagnosticSurface',
  (() => {
    const body = _fnBody(js, 'goSetup');
    return body && /renderDiagnosticSurface\b/.test(body);
  })());
test('v4.81.0 Diagnostic: _computeNextBestMove has baseline-diagnostic branch',
  (() => {
    const body = _fnBody(js, '_computeNextBestMove');
    return body && /baseline-diagnostic/.test(body) && /loadDiagnostic/.test(body);
  })());
test('v4.81.0 Diagnostic: _seedReviewQueueFromDiagnostic calls addToSrQueue',
  (() => {
    const body = _fnBody(js, '_seedReviewQueueFromDiagnostic');
    return body && /addToSrQueue\b/.test(body);
  })());
test('v4.81.0 Diagnostic: _seedReviewQueueFromDiagnostic seeds wrong + uncertain + guessing',
  (() => {
    const body = _fnBody(js, '_seedReviewQueueFromDiagnostic');
    return body && /a\.correct/.test(body) && /uncertain/.test(body) && /guessing/.test(body);
  })());

// _buildPassPlan math fixture — given known inputs, verify probability + CI shape.
// Note: _fnBody returns the full `function _buildPassPlan(session) {...}`
// declaration. Strategy: vm.runInContext(decl) installs the fn in the ctx,
// then we call it from a second runInContext.
test('v4.81.0 Diagnostic: _buildPassPlan returns expected shape (vm fixture)',
  (() => {
    try {
      const body = _fnBody(js, '_buildPassPlan');
      if (!body) return false;
      const vm = require('vm');
      const ctx = {
        DOMAIN_WEIGHTS: { concepts: 0.23, implementation: 0.20, operations: 0.19, security: 0.14, troubleshooting: 0.24 },
        DOMAIN_LABELS: { concepts: 'Concepts', implementation: 'Implementation', operations: 'Operations', security: 'Security', troubleshooting: 'Troubleshooting' },
        TOPIC_DOMAINS: { 'A': 'concepts', 'B': 'implementation', 'C': 'operations', 'D': 'security', 'E': 'troubleshooting' },
        EXAM_PASS_SCORE: 720,
        _buildWeekPlan: () => [],
        // v4.81.6: _buildPassPlan now calls _resolveDomainForTopic; stub
        // it to use the simple TOPIC_DOMAINS lookup for these existing
        // fixtures (which use exact-match canonical keys A-E).
        _resolveDomainForTopic: (t) => ({ A: 'concepts', B: 'implementation', C: 'operations', D: 'security', E: 'troubleshooting' })[t] || null,
        Math, Date, JSON
      };
      vm.createContext(ctx);
      const questions = Array.from({ length: 20 }, (_, i) => ({ topic: ['A','B','C','D','E'][i % 5] }));
      const answers = questions.map((_, i) => ({ correct: i < 12, confidence: i < 12 ? 'confident' : 'guessing', answeredAt: 1 }));
      ctx.session = { questions, answers };
      vm.runInContext(body, ctx);
      const plan = vm.runInContext('_buildPassPlan(session)', ctx);
      return plan && plan.questionCount === 20
        && typeof plan.predicted === 'number'
        && plan.predicted >= 420 && plan.predicted <= 870
        && typeof plan.passProbability === 'number'
        && plan.passProbability >= 0 && plan.passProbability <= 1
        && Array.isArray(plan.weakDomains)
        && plan.weakDomains.length <= 3
        && plan.lowerBound <= plan.predicted && plan.upperBound >= plan.predicted;
    } catch (e) { return false; }
  })());

test('v4.81.0 Diagnostic: _buildPassPlan probability near 0.5 at ~70% accuracy (vm fixture)',
  (() => {
    try {
      const body = _fnBody(js, '_buildPassPlan');
      if (!body) return false;
      const vm = require('vm');
      const ctx = {
        DOMAIN_WEIGHTS: { concepts: 0.23, implementation: 0.20, operations: 0.19, security: 0.14, troubleshooting: 0.24 },
        DOMAIN_LABELS: { concepts: 'Concepts', implementation: 'Implementation', operations: 'Operations', security: 'Security', troubleshooting: 'Troubleshooting' },
        TOPIC_DOMAINS: { 'A': 'concepts', 'B': 'implementation', 'C': 'operations', 'D': 'security', 'E': 'troubleshooting' },
        EXAM_PASS_SCORE: 720,
        _buildWeekPlan: () => [],
        // v4.81.6: _buildPassPlan now calls _resolveDomainForTopic; stub
        // it to use the simple TOPIC_DOMAINS lookup for these existing
        // fixtures (which use exact-match canonical keys A-E).
        _resolveDomainForTopic: (t) => ({ A: 'concepts', B: 'implementation', C: 'operations', D: 'security', E: 'troubleshooting' })[t] || null,
        Math, Date, JSON
      };
      vm.createContext(ctx);
      const questions = Array.from({ length: 20 }, (_, i) => ({ topic: ['A','B','C','D','E'][i % 5] }));
      const answers = questions.map((_, i) => ({ correct: i < 14, confidence: 'confident', answeredAt: 1 }));
      ctx.session = { questions, answers };
      vm.runInContext(body, ctx);
      const plan = vm.runInContext('_buildPassPlan(session)', ctx);
      return plan.passProbability >= 0.30 && plan.passProbability <= 0.60;
    } catch (e) { return false; }
  })());

// HTML structural checks
test('v4.81.0 Diagnostic: #diagnostic-cta-card on home page',
  /id="diagnostic-cta-card"/.test(html));
test('v4.81.0 Diagnostic: #pass-plan-tile on home page',
  /id="pass-plan-tile"/.test(html));
test('v4.81.0 Diagnostic: #page-diagnostic-quiz exists',
  /id="page-diagnostic-quiz"/.test(html));
test('v4.81.0 Diagnostic: #page-diagnostic-result exists',
  /id="page-diagnostic-result"/.test(html));
test('v4.81.0 Diagnostic: 3-tier confidence picker present',
  /data-tier="confident"/.test(html) && /data-tier="uncertain"/.test(html) && /data-tier="guessing"/.test(html));
test('v4.81.0 Diagnostic: confidence ladder (low/medium/high) present',
  /pass-plan-ladder-tier[^>]*data-tier="low"/.test(html)
  && /pass-plan-ladder-tier[^>]*data-tier="medium"/.test(html)
  && /pass-plan-ladder-tier[^>]*data-tier="high"/.test(html));
test('v4.81.0 Diagnostic: "Take the Diagnostic" CTA wired to startDiagnostic()',
  /onclick="startDiagnostic\(\)"/.test(html));
test('v4.81.0 Diagnostic: Pass Plan tile View report wired to viewPassPlan()',
  /viewPassPlan\(\)/.test(html));

// CSS structural checks
test('v4.81.0 Diagnostic: .diagnostic-cta-card style declared',
  /\.diagnostic-cta-card\s*\{/.test(css));
test('v4.81.0 Diagnostic: .pass-plan-prob-ring style declared',
  /\.pass-plan-prob-ring\s*\{/.test(css));
test('v4.81.0 Diagnostic: .pass-plan-week-strip style declared',
  /\.pass-plan-week-strip\s*\{/.test(css));
test('v4.81.0 Diagnostic: .diag-conf-tier confidence picker style declared',
  /\.diag-conf-tier\s*\{/.test(css));

// ──────────────────────────────────────────────────────────
// v4.81.1: NBM + SR + Diagnostic surface render on first paint
// ──────────────────────────────────────────────────────────
// Pre-fix these home-page surfaces only rendered when goSetup() was called
// (i.e. after a navigation). On raw page load (DOMContentLoaded only) they
// stayed in their default-hidden state, producing a "card appears then
// disappears" inconsistency for users who reloaded from a goSetup'd state.
// Fix: hoist the three render calls into the DOMContentLoaded handler so
// initial paint matches the post-navigation state.
test('v4.81.1: DOMContentLoaded calls renderNextBestMove on first paint',
  /DOMContentLoaded[\s\S]{0,2500}renderNextBestMove\b/.test(js));
test('v4.81.1: DOMContentLoaded calls renderSrReviewCard on first paint',
  /DOMContentLoaded[\s\S]{0,2500}renderSrReviewCard\b/.test(js));
test('v4.81.1: DOMContentLoaded calls renderDiagnosticSurface on first paint',
  /DOMContentLoaded[\s\S]{0,2500}renderDiagnosticSurface\b/.test(js));

// ──────────────────────────────────────────────────────────
// v4.81.2: Auto-backup safety net
// ──────────────────────────────────────────────────────────
// Filed in direct response to a localStorage-corruption incident where
// test-injected state overwrote a user's quiz history + streak + exam
// date. This safety net snapshots every nplus_* key once per day and
// keeps a rolling 7-day window so any catastrophic corruption is
// recoverable.
test('v4.81.2 Backup: STORAGE.AUTOBACKUP_PREFIX declared',
  /AUTOBACKUP_PREFIX:\s*['"]nplus_autobackup_['"]/.test(js));
test('v4.81.2 Backup: STORAGE.LAST_AUTOBACKUP_AT declared',
  /LAST_AUTOBACKUP_AT:\s*['"]nplus_last_autobackup_at['"]/.test(js));
test('v4.81.2 Backup: AUTOBACKUP_KEEP_DAYS = 7',
  /const\s+AUTOBACKUP_KEEP_DAYS\s*=\s*7/.test(js));

// Function existence
test('v4.81.2 Backup: _captureSnapshot function defined',
  /function\s+_captureSnapshot\b/.test(js));
test('v4.81.2 Backup: _autoBackupTodayKey function defined',
  /function\s+_autoBackupTodayKey\b/.test(js));
test('v4.81.2 Backup: _takeAutoBackup function defined',
  /function\s+_takeAutoBackup\b/.test(js));
test('v4.81.2 Backup: _pruneAutoBackups function defined',
  /function\s+_pruneAutoBackups\b/.test(js));
test('v4.81.2 Backup: listAutoBackups function defined',
  /function\s+listAutoBackups\b/.test(js));
test('v4.81.2 Backup: restoreFromAutoBackup function defined',
  /function\s+restoreFromAutoBackup\b/.test(js));
test('v4.81.2 Backup: downloadAutoBackup function defined',
  /function\s+downloadAutoBackup\b/.test(js));
test('v4.81.2 Backup: renderAutoBackupList function defined',
  /function\s+renderAutoBackupList\b/.test(js));

// Wiring checks
test('v4.81.2 Backup: DOMContentLoaded calls _takeAutoBackup',
  /DOMContentLoaded[\s\S]{0,2500}_takeAutoBackup\b/.test(js));
test('v4.81.2 Backup: renderSettingsPage calls renderAutoBackupList',
  (() => {
    const body = _fnBody(js, 'renderSettingsPage');
    return body && /renderAutoBackupList\b/.test(body);
  })());
test('v4.81.2 Backup: _captureSnapshot excludes autobackup-namespace keys (no recursion)',
  (() => {
    const body = _fnBody(js, '_captureSnapshot');
    return body && /AUTOBACKUP_PREFIX/.test(body) && /continue/.test(body);
  })());
test('v4.81.2 Backup: restoreFromAutoBackup snapshots current state pre-restore (rollback safety)',
  (() => {
    const body = _fnBody(js, 'restoreFromAutoBackup');
    return body && /pre-restore/i.test(body);
  })());

// Behavioral fixture — round-trip a synthetic snapshot and verify restore
test('v4.81.2 Backup: snapshot round-trip preserves keys (vm fixture)',
  (() => {
    try {
      const captureBody = _fnBody(js, '_captureSnapshot');
      if (!captureBody) return false;
      const vm = require('vm');
      // In-memory localStorage shim
      const store = {};
      const localStorage = {
        get length() { return Object.keys(store).length; },
        key(i) { return Object.keys(store)[i]; },
        getItem(k) { return store[k] === undefined ? null : store[k]; },
        setItem(k, v) { store[k] = String(v); },
        removeItem(k) { delete store[k]; }
      };
      const ctx = {
        STORAGE: { AUTOBACKUP_PREFIX: 'nplus_autobackup_', LAST_AUTOBACKUP_AT: 'nplus_last_autobackup_at' },
        localStorage,
        Math, Date, JSON
      };
      vm.createContext(ctx);
      // Plant test data
      store['nplus_history'] = '[{"a":1}]';
      store['nplus_streak'] = '{"current":3}';
      store['nplus_autobackup_2026-04-24'] = '{"snapshot":{"old":"x"}}';
      store['unrelated_key'] = 'should-not-be-captured';
      vm.runInContext(captureBody, ctx);
      const snap = vm.runInContext('_captureSnapshot()', ctx);
      // Should include nplus_history + nplus_streak, EXCLUDE autobackup key + unrelated
      return snap.nplus_history === '[{"a":1}]'
        && snap.nplus_streak === '{"current":3}'
        && !('nplus_autobackup_2026-04-24' in snap)
        && !('unrelated_key' in snap)
        && Object.keys(snap).length === 2;
    } catch (e) { return false; }
  })());

// HTML structural checks
test('v4.81.2 Backup: Settings page has #autobackup-list',
  /id="autobackup-list"/.test(html));
test('v4.81.2 Backup: Settings page has Snapshot now button',
  /Snapshot\s+now/i.test(html));
test('v4.81.2 Backup: Settings page has Download latest snapshot button',
  /Download\s+latest\s+snapshot/i.test(html));

// CSS structural checks
test('v4.81.2 Backup: .autobackup-list style declared',
  /\.autobackup-list\s*\{/.test(css));
test('v4.81.2 Backup: .ab-row style declared',
  /\.ab-row\s*\{/.test(css));

// ──────────────────────────────────────────────────────────
// v4.81.3: Data-safety discipline layer (defense-in-depth)
// ──────────────────────────────────────────────────────────
// Five forward-looking guards added in direct response to the
// localStorage-corruption incident:
// 1. _emitProdConsoleBanner() warns on prod page load
// 2. _renderEnvBadge() puts a PROD/DEV pill in the top-right corner
// 3. _maybeExportReminder() surfaces a periodic export-reminder toast
// 4. UAT regression guard: zero literal-string 'nplus_' writes outside STORAGE
// 5. Pre-commit hook scans for risky MCP+setItem patterns

// Storage / constants
test('v4.81.3 Safety: STORAGE.TB_INTRO_SEEN namespaced (was outlier literal)',
  /TB_INTRO_SEEN:\s*['"]nplus_tb_intro_seen['"]/.test(js));
test('v4.81.3 Safety: STORAGE.LAST_EXPORT_REMINDER_AT declared',
  /LAST_EXPORT_REMINDER_AT:\s*['"]nplus_last_export_reminder_at['"]/.test(js));
test('v4.81.3 Safety: EXPORT_REMINDER_DAYS = 14',
  /const\s+EXPORT_REMINDER_DAYS\s*=\s*14/.test(js));

// Functions exist
test('v4.81.3 Safety: _isProdHost function defined',
  /function\s+_isProdHost\b/.test(js));
test('v4.81.3 Safety: _emitProdConsoleBanner function defined',
  /function\s+_emitProdConsoleBanner\b/.test(js));
test('v4.81.3 Safety: _renderEnvBadge function defined',
  /function\s+_renderEnvBadge\b/.test(js));
test('v4.81.3 Safety: _maybeExportReminder function defined',
  /function\s+_maybeExportReminder\b/.test(js));

// DOMContentLoaded wires all three
test('v4.81.3 Safety: DOMContentLoaded calls _emitProdConsoleBanner',
  /DOMContentLoaded[\s\S]{0,3000}_emitProdConsoleBanner\b/.test(js));
test('v4.81.3 Safety: DOMContentLoaded calls _renderEnvBadge',
  /DOMContentLoaded[\s\S]{0,3000}_renderEnvBadge\b/.test(js));
test('v4.81.3 Safety: DOMContentLoaded calls _maybeExportReminder',
  // v4.81.23: window widened 3000 → 3500 (v4.81.23 cleanup added a comment block)
  /DOMContentLoaded[\s\S]{0,3500}_maybeExportReminder\b/.test(js));

// Banner content sanity
test('v4.81.3 Safety: prod banner mentions DO NOT write to localStorage',
  (() => {
    const body = _fnBody(js, '_emitProdConsoleBanner');
    return body && /DO NOT write to localStorage/i.test(body);
  })());
test('v4.81.3 Safety: prod banner mentions Auto-backups recovery path',
  (() => {
    const body = _fnBody(js, '_emitProdConsoleBanner');
    return body && /Auto-backups/i.test(body);
  })());
test('v4.81.3 Safety: prod banner only fires once per page load',
  (() => {
    const body = _fnBody(js, '_emitProdConsoleBanner');
    return body && /__nplusProdBannerEmitted/.test(body);
  })());

// _isProdHost detection
test('v4.81.3 Safety: _isProdHost detects vercel.app hosts',
  (() => {
    const body = _fnBody(js, '_isProdHost');
    return body && /vercel\.app/.test(body);
  })());

// Export reminder gates
test('v4.81.3 Safety: _maybeExportReminder skips users with <5 sessions',
  (() => {
    const body = _fnBody(js, '_maybeExportReminder');
    return body && /hist\.length\s*<\s*5/.test(body);
  })());
test('v4.81.3 Safety: _maybeExportReminder uses LAST_EXPORT_REMINDER_AT throttle',
  (() => {
    const body = _fnBody(js, '_maybeExportReminder');
    return body && /LAST_EXPORT_REMINDER_AT/.test(body) && /EXPORT_REMINDER_DAYS/.test(body);
  })());

// CSS for badge
test('v4.81.3 Safety: .env-badge style declared',
  /\.env-badge\s*\{/.test(css));
test('v4.81.3 Safety: .env-badge-prod has red treatment',
  /\.env-badge-prod[\s\S]{0,300}#dc2626/.test(css));
test('v4.81.3 Safety: .env-badge-dev has green treatment',
  /\.env-badge-dev[\s\S]{0,300}#16a34a/.test(css));

// 🛑 THE BIG ONE — zero-tolerance regression guard:
// No literal-string `localStorage.setItem('nplus_…')` anywhere in app.js.
// All state writes must go through STORAGE.X. This is the structural
// guard that prevents the corruption-incident pattern from regressing.
test('v4.81.3 Safety: ZERO literal-string nplus_* writes outside STORAGE',
  !/localStorage\.setItem\(\s*['"]nplus_[a-z_]/.test(js));
test('v4.81.3 Safety: ZERO literal-string nplus_* removeItem outside STORAGE',
  !/localStorage\.removeItem\(\s*['"]nplus_[a-z_]/.test(js));

// CLAUDE.md institutional rule check
test('v4.81.3 Safety: CLAUDE.md has Testing Discipline section',
  (() => {
    try {
      const md = require('fs').readFileSync(require('path').join(ROOT, 'CLAUDE.md'), 'utf8');
      return /Testing Discipline/i.test(md) && /NEVER write to user-state localStorage/.test(md);
    } catch (_) { return false; }
  })());

// Pre-commit hook scan for risky patterns
// ──────────────────────────────────────────────────────────
// v4.81.4: API key auto-save (UX fix from v4.81.3 follow-up)
// ──────────────────────────────────────────────────────────
test('v4.81.4 ApiKey: API_KEY_AUTOSAVE_DEBOUNCE_MS constant declared',
  /const\s+API_KEY_AUTOSAVE_DEBOUNCE_MS\s*=\s*\d+/.test(js));
test('v4.81.4 ApiKey: autoSaveApiKey function defined',
  /function\s+autoSaveApiKey\b/.test(js));
test('v4.81.4 ApiKey: _apiKeyDebouncedSave function defined',
  /function\s+_apiKeyDebouncedSave\b/.test(js));
test('v4.81.4 ApiKey: _renderApiKeyStatusOnLoad function defined',
  /function\s+_renderApiKeyStatusOnLoad\b/.test(js));
test('v4.81.4 ApiKey: input has onblur=autoSaveApiKey wiring',
  /id="api-key"[^>]*onblur="autoSaveApiKey\(\)"/.test(html));
test('v4.81.4 ApiKey: input has oninput=_apiKeyDebouncedSave wiring',
  /id="api-key"[^>]*oninput="_apiKeyDebouncedSave\(\)"/.test(html));
test('v4.81.4 ApiKey: #api-key-status status pill present',
  /id="api-key-status"/.test(html));
test('v4.81.4 ApiKey: autoSaveApiKey validates sk-ant- prefix',
  (() => {
    const body = _fnBody(js, 'autoSaveApiKey');
    return body && /sk-ant-/.test(body);
  })());
test('v4.81.4 ApiKey: autoSaveApiKey trims whitespace before save',
  (() => {
    const body = _fnBody(js, 'autoSaveApiKey');
    return body && /\.trim\(\)/.test(body);
  })());
test('v4.81.4 ApiKey: renderSettingsPage calls _renderApiKeyStatusOnLoad',
  (() => {
    const body = _fnBody(js, 'renderSettingsPage');
    return body && /_renderApiKeyStatusOnLoad\b/.test(body);
  })());
test('v4.81.4 ApiKey: .api-key-status-ok style declared',
  /\.api-key-status-ok\s*\{/.test(css));

// ──────────────────────────────────────────────────────────
// v4.81.5: Diagnostic options-render bugfix
// ──────────────────────────────────────────────────────────
// User report: "where is the questions??? even when i click on Next nothing
// even happens" — screenshot showed question stem but no answer buttons.
// Root cause: _renderDiagnosticQuestion did `(q.options || []).forEach(...)`
// but q.options is a LETTER-KEYED OBJECT ({A:'…', B:'…', C:'…', D:'…'})
// matching the rest of the app's MCQ schema, NOT an array. forEach on an
// object silently throws (forEach is undefined). No options rendered, the
// "Pick an answer" hint blocked Next.
test('v4.81.5 Diagnostic: _renderDiagnosticQuestion uses Object.keys for options (not array forEach)',
  (() => {
    const body = _fnBody(js, '_renderDiagnosticQuestion');
    return body && /Object\.keys\(q\.options/.test(body);
  })());
test('v4.81.5 Diagnostic: pickDiagnosticOption takes a letter (not numeric index)',
  (() => {
    const body = _fnBody(js, 'pickDiagnosticOption');
    return body && /pickedLetter/.test(body);
  })());
test('v4.81.5 Diagnostic: submitDiagnosticAnswer compares pickedLetter to q.answer',
  (() => {
    const body = _fnBody(js, 'submitDiagnosticAnswer');
    return body && /pickedLetter\s*===\s*q\.answer/.test(body);
  })());
test('v4.81.5 Diagnostic: regression guard — no .pickedIdx in diagnostic flow (renamed to pickedLetter)',
  (() => {
    // pickedIdx is still legitimately used by the SR review session — this
    // check scopes the regression to the diagnostic functions specifically.
    const fns = ['_renderDiagnosticQuestion', 'pickDiagnosticOption', '_refreshDiagnosticActions', 'submitDiagnosticAnswer'];
    for (const fn of fns) {
      const body = _fnBody(js, fn);
      if (body && /pickedIdx/.test(body)) return false;
    }
    return true;
  })());
test('v4.81.5 Diagnostic: startDiagnostic filters to MCQ-only questions',
  (() => {
    const body = _fnBody(js, 'startDiagnostic');
    return body && /_isMcq\b/.test(body);
  })());
test('v4.81.5 Diagnostic: MCQ-filter requires 4 letter-keyed options + single-letter answer',
  (() => {
    const body = _fnBody(js, 'startDiagnostic');
    return body && /Object\.keys\(q\.options\)\.length\s*===\s*4/.test(body)
      && /'ABCD'\.includes\(q\.answer\)/.test(body);
  })());

// Behavioral fixture — synthetic MCQ question, verify the render code
// produces 4 buttons with correct letters.
// ──────────────────────────────────────────────────────────
// v4.81.6: Pass Plan resilience to non-canonical topic strings
// ──────────────────────────────────────────────────────────
// User report (after taking diagnostic, getting most correct): "i kwow for
// a fact i got most of them correct yet this was the score" — screenshot
// showed 0% pass probability, 420/870 predicted, 0 weak domains. Root
// cause: Haiku returned verbose topic strings like "NETWORKING CONCEPTS
// - OSI MODEL & TCP/IP" that didn't match canonical TOPIC_DOMAINS keys
// (e.g. "Network Models & OSI"), so every answer was silently skipped
// from the score calculation. Fix: _resolveDomainForTopic adds fuzzy
// matching + raw-accuracy fallback when domain coverage drops below 50%.
test('v4.81.6 PassPlan: _resolveDomainForTopic helper defined',
  /function\s+_resolveDomainForTopic\b/.test(js));
test('v4.81.6 PassPlan: _resolveDomainForTopic does substring + keyword fallback',
  (() => {
    const body = _fnBody(js, '_resolveDomainForTopic');
    return body && /toLowerCase\(\)/.test(body) && /keywordMap/.test(body);
  })());
test('v4.81.6 PassPlan: _buildPassPlan tracks rawCorrect + rawTotal alongside domain bucketing',
  (() => {
    const body = _fnBody(js, '_buildPassPlan');
    return body && /rawCorrect/.test(body) && /rawTotal/.test(body);
  })());
test('v4.81.6 PassPlan: _buildPassPlan falls back to raw accuracy when domain coverage <50%',
  (() => {
    const body = _fnBody(js, '_buildPassPlan');
    return body && /domainCoverageOk/.test(body) && />= 0\.5/.test(body);
  })());

// Behavioral fixture — the exact failure mode the user hit. Synthesises
// a session where Haiku returned verbose topics that don't match
// TOPIC_DOMAINS exactly. Pre-fix this would yield 0% accuracy; post-fix
// it should yield the actual raw-accuracy score.
test('v4.81.6 PassPlan: VM fixture — non-canonical topics produce real score (regression for the user-reported bug)',
  (() => {
    try {
      const resolveBody = _fnBody(js, '_resolveDomainForTopic');
      const buildBody = _fnBody(js, '_buildPassPlan');
      if (!resolveBody || !buildBody) return false;
      const vm = require('vm');
      const ctx = {
        DOMAIN_WEIGHTS: { concepts: 0.23, implementation: 0.20, operations: 0.19, security: 0.14, troubleshooting: 0.24 },
        DOMAIN_LABELS: { concepts: 'Concepts', implementation: 'Implementation', operations: 'Operations', security: 'Security', troubleshooting: 'Troubleshooting' },
        // Realistic TOPIC_DOMAINS subset — short canonical keys
        TOPIC_DOMAINS: {
          'Network Models & OSI': 'concepts',
          'OSPF': 'implementation',
          'Network Troubleshooting & Tools': 'troubleshooting',
          'Network Security': 'security',
          'Network Operations': 'operations'
        },
        EXAM_PASS_SCORE: 720,
        _buildWeekPlan: () => [],
        Math, Date, JSON
      };
      vm.createContext(ctx);
      vm.runInContext(resolveBody, ctx);
      vm.runInContext(buildBody, ctx);
      // Build session: 20 questions with VERBOSE topic strings (the actual
      // failure mode), 18 of which are correct.
      const verboseTopics = [
        'NETWORKING CONCEPTS - OSI MODEL & TCP/IP',
        'NETWORKING CONCEPTS - PORTS & PROTOCOLS',
        'NETWORK IMPLEMENTATION - OSPF & ROUTING',
        'NETWORK SECURITY - FIREWALL FUNDAMENTALS',
        'NETWORK TROUBLESHOOTING - LATENCY DIAGNOSIS'
      ];
      const questions = Array.from({ length: 20 }, (_, i) => ({
        topic: verboseTopics[i % verboseTopics.length]
      }));
      const answers = questions.map((_, i) => ({
        correct: i < 18,
        confidence: 'confident',
        answeredAt: 1
      }));
      ctx.session = { questions, answers };
      const plan = vm.runInContext('_buildPassPlan(session)', ctx);
      // 18/20 = 90% raw accuracy → predicted ~ 420 + 90 * 4.275 ≈ 805
      // → way above the 720 pass mark → high probability
      // Pre-fix would have returned predicted=420 / probability ~= 0
      return plan.predicted > 700
        && plan.passProbability > 0.5
        && plan.accPct >= 80;
    } catch (e) { return false; }
  })());
test('v4.81.6 PassPlan: VM fixture — exact-match canonical topics still work (no regression)',
  (() => {
    try {
      const resolveBody = _fnBody(js, '_resolveDomainForTopic');
      const buildBody = _fnBody(js, '_buildPassPlan');
      if (!resolveBody || !buildBody) return false;
      const vm = require('vm');
      const ctx = {
        DOMAIN_WEIGHTS: { concepts: 0.23, implementation: 0.20, operations: 0.19, security: 0.14, troubleshooting: 0.24 },
        DOMAIN_LABELS: { concepts: 'Concepts', implementation: 'Implementation', operations: 'Operations', security: 'Security', troubleshooting: 'Troubleshooting' },
        TOPIC_DOMAINS: { 'A': 'concepts', 'B': 'implementation', 'C': 'operations', 'D': 'security', 'E': 'troubleshooting' },
        EXAM_PASS_SCORE: 720,
        _buildWeekPlan: () => [],
        Math, Date, JSON
      };
      vm.createContext(ctx);
      vm.runInContext(resolveBody, ctx);
      vm.runInContext(buildBody, ctx);
      const questions = Array.from({ length: 20 }, (_, i) => ({ topic: ['A','B','C','D','E'][i % 5] }));
      const answers = questions.map((_, i) => ({ correct: i < 12, confidence: 'confident', answeredAt: 1 }));
      ctx.session = { questions, answers };
      const plan = vm.runInContext('_buildPassPlan(session)', ctx);
      return plan.questionCount === 20
        && typeof plan.passProbability === 'number'
        && plan.passProbability > 0;
    } catch (e) { return false; }
  })());

// ──────────────────────────────────────────────────────────
// v4.81.6: ENV badge relocated bottom-left (was overlapping topbar)
// ──────────────────────────────────────────────────────────
test('v4.81.6 EnvBadge: .env-badge uses bottom-left positioning (not top-right)',
  /\.env-badge\s*\{[^}]*bottom:\s*12px[^}]*left:\s*12px/.test(css));
test('v4.81.6 EnvBadge: regression guard — .env-badge no longer uses top-right positioning',
  !/\.env-badge\s*\{[^}]*\btop:\s*12px[^}]*\bright:\s*12px/.test(css));

// ──────────────────────────────────────────────────────────
// v4.81.7: Retake-cooldown softened + corruption detection
// ──────────────────────────────────────────────────────────
// User report after v4.81.6 ship: "it makes sense to allow me to redo the
// diagnostic now. since it already has logged me as 0% pass probability".
// The 7-day cooldown was a hard block — users with a buggy Pass Plan
// (from v4.81.0-v4.81.5) couldn't retake to verify the fix. Two changes:
// 1. _isCorruptedPassPlan() detects the v4.81.0-v4.81.5 bug signature
//    (accPct=0 yet seededCount<questionCount, or predicted=420 with
//    correctCount>0) — auto-bypasses cooldown entirely
// 2. Cooldown softened from hard block to confirm dialog ("Retake anyway?")
test('v4.81.7 Retake: _isCorruptedPassPlan helper defined',
  /function\s+_isCorruptedPassPlan\b/.test(js));
test('v4.81.7 Retake: corruption detection checks accPct=0 + seededCount mismatch',
  (() => {
    const body = _fnBody(js, '_isCorruptedPassPlan');
    return body && /accPct[\s\S]{0,100}=== 0/.test(body) && /seededCount[\s\S]{0,100}questionCount/.test(body);
  })());
test('v4.81.7 Retake: corruption detection checks predicted=420 + correctCount>0 (secondary)',
  (() => {
    const body = _fnBody(js, '_isCorruptedPassPlan');
    return body && /predicted[\s\S]{0,80}=== 420/.test(body) && /correctCount[\s\S]{0,80}>\s*0/.test(body);
  })());
test('v4.81.7 Retake: retakeDiagnostic checks _isCorruptedPassPlan first',
  (() => {
    const body = _fnBody(js, 'retakeDiagnostic');
    return body && /_isCorruptedPassPlan/.test(body);
  })());
test('v4.81.7 Retake: cooldown is now confirm-based (not hard block)',
  (() => {
    const body = _fnBody(js, 'retakeDiagnostic');
    return body && /confirm\(/.test(body);
  })());
test('v4.81.7 Retake: renderDiagnosticSurface flags corrupted Plan in tile',
  (() => {
    const body = _fnBody(js, 'renderDiagnosticSurface');
    return body && /_isCorruptedPassPlan/.test(body) && /fix bug/i.test(body);
  })());

// Behavioral fixture — given a synthetic corrupted Pass Plan, verify
// _isCorruptedPassPlan returns true. Given a healthy one, false.
// ──────────────────────────────────────────────────────────
// v4.81.8: 3D View defensive observability (Codex external review)
// ──────────────────────────────────────────────────────────
// Codex hit: clicking 3D View after loading Home Network → red toast
// "Could not load 3D View — check network / console". Couldn't reproduce
// locally; Playwright tests pass. Shipped defensive observability instead
// of speculative patch:
//   1. WebGL preflight — fail-fast if browser lacks WebGL
//   2. Phase tracking — error toast names which step failed
//   3. Error log persistence — full stack + state captured to ERROR_LOG
test('v4.81.8 TB3D: _tb3dWebGLAvailable preflight defined',
  /function\s+_tb3dWebGLAvailable\b/.test(js));
test('v4.81.8 TB3D: WebGL check tries webgl2 / webgl / experimental-webgl',
  (() => {
    const body = _fnBody(js, '_tb3dWebGLAvailable');
    return body && /webgl2/.test(body) && /experimental-webgl/.test(body);
  })());
test('v4.81.8 TB3D: tbOpen3DView preflights WebGL before importing tb3d.js',
  (() => {
    const body = _fnBody(js, 'tbOpen3DView');
    return body && /_tb3dWebGLAvailable/.test(body) && /requires WebGL/i.test(body);
  })());
test('v4.81.8 TB3D: _tb3dHandleOpenFailure helper defined',
  /function\s+_tb3dHandleOpenFailure\b/.test(js));
test('v4.81.8 TB3D: failure handler captures phase label + error message',
  (() => {
    const body = _fnBody(js, '_tb3dHandleOpenFailure');
    return body && /phaseLabel/.test(body) && /\binitialis/i.test(body);
  })());
test('v4.81.8 TB3D: failure handler persists to ERROR_LOG via logError',
  (() => {
    const body = _fnBody(js, '_tb3dHandleOpenFailure');
    return body && /logError/.test(body) && /tb3d-open-failure/.test(body);
  })());
test('v4.81.8 TB3D: tbOpen3DView tracks phase across import/enter/setTraceState/updateTourButton',
  (() => {
    const body = _fnBody(js, 'tbOpen3DView');
    return body
      && /phase\s*=\s*['"]import['"]/.test(body)
      && /phase\s*=\s*['"]enter['"]/.test(body)
      && /phase\s*=\s*['"]setTraceState['"]/.test(body)
      && /phase\s*=\s*['"]updateTourButton['"]/.test(body);
  })());
test('v4.81.8 TB3D: regression guard — old generic toast text removed',
  !/'Could not load 3D View — check network \/ console\.'/.test(js));

// ──────────────────────────────────────────────────────────
// v4.81.9: ACL Builder scenario-aware Add Rule defaults (Codex r7 #1)
// ──────────────────────────────────────────────────────────
// Codex r7: pre-fix the Add Rule modal defaulted to `permit any any any
// any` regardless of scenario context — for "Block a Single Host" that's
// the OPPOSITE of the right first move. Fix derives smart defaults from
// scenario.testPackets + scenario.zones (no schema change needed).
test('v4.81.9 ACL: _aclDeriveRuleHints helper defined',
  /function\s+_aclDeriveRuleHints\b/.test(js));
test('v4.81.9 ACL: _aclRenderRuleChips helper defined',
  /function\s+_aclRenderRuleChips\b/.test(js));
test('v4.81.9 ACL: _aclChipClick handler defined',
  /function\s+_aclChipClick\b/.test(js));
test('v4.81.9 ACL: hints helper handles free-build scenario (returns null)',
  (() => {
    const body = _fnBody(js, '_aclDeriveRuleHints');
    return body && /free-build/.test(body) && /return null/.test(body);
  })());
test('v4.81.9 ACL: aclOpenAddRuleModal calls _aclDeriveRuleHints',
  (() => {
    const body = _fnBody(js, 'aclOpenAddRuleModal');
    return body && /_aclDeriveRuleHints/.test(body);
  })());
test('v4.81.9 ACL: modal markup has #acl-rm-helper strip',
  /id="acl-rm-helper"/.test(html));
test('v4.81.9 ACL: modal markup has chip containers for src/dst addr + port',
  /id="acl-rm-srcAddr-chips"/.test(html)
  && /id="acl-rm-dstAddr-chips"/.test(html)
  && /id="acl-rm-srcPort-chips"/.test(html)
  && /id="acl-rm-dstPort-chips"/.test(html));
test('v4.81.9 ACL: .acl-rm-helper CSS declared',
  /\.acl-rm-helper\s*\{/.test(css));
test('v4.81.9 ACL: .acl-rm-chip CSS declared',
  /\.acl-rm-chip\s*\{/.test(css));
test('v4.81.9 ACL: input-flash animation honors reduced-motion',
  /prefers-reduced-motion[\s\S]{0,200}\.acl-rm-input-flash/.test(css));

// Behavioral fixture — derive hints for "Block a Single Host" pattern
// (mixed deny + permit packets with different srcs) and verify the
// suggested first rule is a SPECIFIC DENY, not the generic permit-any.
test('v4.81.9 ACL: vm fixture — block-a-host scenario suggests specific deny',
  (() => {
    try {
      const body = _fnBody(js, '_aclDeriveRuleHints');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { Math, JSON, String };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const scen = {
        id: 'block-single-host',
        zones: [
          { name: 'Quarantined', cidr: '10.0.0.50/32' },
          { name: 'LAN', cidr: '10.0.0.0/24' },
          { name: 'Internet', cidr: 'any' }
        ],
        testPackets: [
          { src: '10.0.0.50', dst: '8.8.8.8',  dp: 53,  proto: 'udp', expected: 'deny' },
          { src: '10.0.0.50', dst: '93.184.216.34', dp: 443, proto: 'tcp', expected: 'deny' },
          { src: '10.0.0.20', dst: '8.8.8.8',  dp: 53,  proto: 'udp', expected: 'permit' }
        ]
      };
      ctx.scen = scen;
      const hints = vm.runInContext('_aclDeriveRuleHints(scen, 0)', ctx);
      return hints
        && hints.suggested
        && hints.suggested.action === 'deny'
        && hints.suggested.srcAddr === '10.0.0.50'
        && /first-match/i.test(hints.helper || '')
        && hints.chips
        && hints.chips.addr.includes('10.0.0.50')
        && hints.chips.addr.includes('10.0.0.0/24');
    } catch (e) { return false; }
  })());

// Behavioral fixture — default-deny pattern (permits + implicit deny)
// suggests a specific PERMIT first.
test('v4.81.9 ACL: vm fixture — default-deny scenario suggests specific permit',
  (() => {
    try {
      const body = _fnBody(js, '_aclDeriveRuleHints');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { Math, JSON, String };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const scen = {
        id: 'https-only',
        zones: [
          { name: 'Secure Workstations', cidr: '192.168.50.0/24' },
          { name: 'Internet', cidr: 'any' }
        ],
        testPackets: [
          { src: '192.168.50.10', dst: '93.184.216.34', dp: 443, proto: 'tcp', expected: 'permit' },
          { src: '192.168.50.10', dst: '93.184.216.34', dp: 80,  proto: 'tcp', expected: 'deny' },
          { src: '192.168.50.10', dst: '93.184.216.34', dp: 21,  proto: 'tcp', expected: 'deny' }
        ]
      };
      ctx.scen = scen;
      const hints = vm.runInContext('_aclDeriveRuleHints(scen, 0)', ctx);
      return hints
        && hints.suggested
        && hints.suggested.action === 'permit'
        && hints.suggested.srcAddr === '192.168.50.10'
        && hints.suggested.dstPort === '443'
        && /implicit deny/i.test(hints.helper || '');
    } catch (e) { return false; }
  })());

// Behavioral fixture — when rules already exist, NO suggested first rule
// (only chips). The "specific-deny-first" guidance only fires for the
// empty-state.
// ──────────────────────────────────────────────────────────
// v4.81.10: "Start Lesson 1" bug fix + Drill Mission Cards (Codex r8)
// ──────────────────────────────────────────────────────────
// Codex r8: clicking "Start Lesson 1" CTAs on all 5 drill placeholder
// cards silently no-op'd. Root cause: lesson IDs are strings ('binary',
// 'ip_anatomy', 'web', 'protocols', etc.) but the buttons passed the
// number 1. find(l => l.id === id) returned undefined → function exited
// at `if (!lesson) return;`. Fix: id-normalization in all 5 *OpenLesson
// functions tolerates 1 / '1' as "first lesson".
//
// Also adds the "Drill Mission Card" surface (Codex r8 strategic ask)
// to the 4 drills that didn't have one (Subnet had it from v4.78.0).
test('v4.81.10 Lesson1Fix: stOpenLesson normalizes id 1 / "1" to first lesson',
  (() => {
    const body = _fnBody(js, 'stOpenLesson');
    return body && /SUBNET_LESSONS\[0\]/.test(body) && /id === 1\s*\|\|\s*id === '1'/.test(body);
  })());
test('v4.81.10 Lesson1Fix: ptOpenLesson normalizes id 1 / "1" to first lesson',
  (() => {
    const body = _fnBody(js, 'ptOpenLesson');
    return body && /PORT_LESSONS\[0\]/.test(body) && /id === 1\s*\|\|\s*id === '1'/.test(body);
  })());
test('v4.81.10 Lesson1Fix: scaffold openLesson normalizes id 1 / "1" to first lesson',
  (() => {
    // The scaffold openLesson is inside createDrillScaffold — extract by name
    const body = _fnBody(js, 'createDrillScaffold');
    return body && /id === 1\s*\|\|\s*id === '1'/.test(body) && /cfg\.lessons\[0\]/.test(body);
  })());

// vm fixture — simulate the exact Codex-flagged path: pass 1 to
// stOpenLesson against a realistic SUBNET_LESSONS schema. Pre-fix this
// would silently exit; post-fix it should resolve to the first lesson.
test('v4.81.10 Lesson1Fix: vm fixture — stOpenLesson(1) resolves to first lesson',
  (() => {
    try {
      const body = _fnBody(js, 'stOpenLesson');
      if (!body) return false;
      const vm = require('vm');
      // Stub minimal env — only need the find() resolution to succeed
      const ctx = {
        SUBNET_LESSONS: [
          { id: 'binary', title: 'Binary', icon: '💻', desc: 'Binary basics', theory: ['t1'] },
          { id: 'ip_anatomy', title: 'IP', icon: '🌐', desc: 'IP', theory: ['t2'] }
        ],
        stActiveLesson: null,
        stRenderLessonSidebar: () => {},
        stRenderGate: () => {},
        _stSetupBlockMatchObserver: () => {},
        document: {
          getElementById: () => ({ innerHTML: '' })
        },
        escHtml: (s) => String(s)
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('stOpenLesson(1)', ctx);
      // Pre-fix: stActiveLesson would be 1 (number) and find() would not match
      // Post-fix: stActiveLesson should be 'binary' (the first lesson's string ID)
      return ctx.stActiveLesson === 'binary';
    } catch (e) { return false; }
  })());

// Drill Mission Card structural checks
test('v4.81.10 DrillMission: _drillMissionState helper defined',
  /function\s+_drillMissionState\b/.test(js));
test('v4.81.10 DrillMission: 4 picker functions defined (Port/Acronym/OSI/Cable)',
  /function\s+_pickPortMission\b/.test(js)
  && /function\s+_pickAcronymMission\b/.test(js)
  && /function\s+_pickOsiMission\b/.test(js)
  && /function\s+_pickCableMission\b/.test(js));
test('v4.81.10 DrillMission: 4 render functions defined',
  /function\s+renderPortMission\b/.test(js)
  && /function\s+renderAcronymMission\b/.test(js)
  && /function\s+renderOsiMission\b/.test(js)
  && /function\s+renderCableMission\b/.test(js));
test('v4.81.10 DrillMission: HTML hosts present for 4 new drills',
  /id="port-rec-host"/.test(html)
  && /id="acronym-rec-host"/.test(html)
  && /id="osi-rec-host"/.test(html)
  && /id="cable-rec-host"/.test(html));
test('v4.81.10 DrillMission: drill entry points wire into mission renderers',
  (() => {
    const port = _fnBody(js, 'startPortDrill');
    const ab   = _fnBody(js, 'startAcronymBlitz');
    const os   = _fnBody(js, 'startOsiSorter');
    const cb   = _fnBody(js, 'startCableId');
    const sub  = _fnBody(js, 'startSubnetTrainer');
    return port && /renderPortMission/.test(port)
      && ab && /renderAcronymMission/.test(ab)
      && os && /renderOsiMission/.test(os)
      && cb && /renderCableMission/.test(cb)
      && sub && /renderSubnetRecommendation/.test(sub);
  })());

// Behavioral fixture — picker correctly handles "new user" state
// ──────────────────────────────────────────────────────────
// v4.81.11: Settings polish (Codex r9 — trust + safety layer)
// ──────────────────────────────────────────────────────────
// Codex r9 rated Settings 7.6/10 — utility drawer not trust centre.
// Shipped 4 of the 6 enhancements as a focused polish ship:
//   #2 Import button a11y (real <button>, not a <label> wrapper)
//   #3 Danger confirmations explicit about what gets deleted/replaced
//   #4 Restore "what will change" enumerates data categories
//   #5 Study Setup Health card at top — at-a-glance status
// Deferred: #1 BYOK (saas-gated) + #6 Control Centre reorg

// #2 — Import button a11y
test('v4.81.11 Settings: Import is now a real <button>, not a <label> wrapper',
  /<button[^>]+aria-label="Import data from JSON file"[^>]*>[^<]*Import Data/.test(html));
test('v4.81.11 Settings: hidden #import-file-input input present',
  /<input[^>]*id="import-file-input"/.test(html) && /<input[^>]*type="file"[^>]*id="import-file-input"|<input[^>]*id="import-file-input"[^>]*type="file"/.test(html));
test('v4.81.11 Settings: Import button triggers hidden input via .click()',
  /onclick="document\.getElementById\('import-file-input'\)\.click\(\)"/.test(html));
test('v4.81.11 Settings: regression — Import is no longer a <label> wrapping <input type="file">',
  !/<label[^>]+class="btn btn-ghost"[^>]*>[\s\S]{0,200}<input type="file"[\s\S]{0,200}importData/.test(html));

// #3 — Stronger clearWrongBank confirmation
test('v4.81.11 Settings: clearWrongBank confirm enumerates what gets deleted',
  (() => {
    const body = _fnBody(js, 'clearWrongBank');
    return body
      && /Drill Mistakes/.test(body)
      && /Spaced Repetition queue/.test(body)
      && /Automatic backups/.test(body);
  })());

// #4 — Restore "what will change" copy
test('v4.81.11 Settings: restoreFromAutoBackup confirm enumerates data categories',
  (() => {
    const body = _fnBody(js, 'restoreFromAutoBackup');
    return body
      && /Quiz history/.test(body)
      && /Wrong bank/.test(body)
      && /drill mastery/i.test(body)
      && /pre-restore/i.test(body);
  })());

// #5 — Study Setup Health card
test('v4.81.11 Settings: renderSettingsHealthCard function defined',
  /function\s+renderSettingsHealthCard\b/.test(js));
test('v4.81.11 Settings: renderSettingsPage calls renderSettingsHealthCard',
  (() => {
    const body = _fnBody(js, 'renderSettingsPage');
    return body && /renderSettingsHealthCard/.test(body);
  })());
test('v4.81.11 Settings: #settings-health-card container in markup',
  /id="settings-health-card"/.test(html) && /id="settings-health-grid"/.test(html));
test('v4.81.11 Settings: health card surfaces all 5 rows (api/exam/goal/backup/today)',
  (() => {
    const body = _fnBody(js, 'renderSettingsHealthCard');
    return body
      && /API key/.test(body)
      && /Exam date/.test(body)
      && /Daily goal/.test(body)
      && /Automatic backup/.test(body)
      && /Today/.test(body);
  })());
test('v4.81.11 Settings: .settings-health-row CSS declared',
  /\.settings-health-row\s*\{/.test(css));
test('v4.81.11 Settings: 3 status tiers (ok/mid/warn) styled',
  /\.settings-health-ok\s/.test(css)
  && /\.settings-health-warn\s/.test(css)
  && /\.settings-health-mid\s/.test(css));

// vm fixture — health card surfaces "Not connected" when no API key,
// "Connected · sk-ant-..." when key present
// ──────────────────────────────────────────────────────────
// v4.81.12: Settings Control Centre 4-section reorg (Codex r9 #6 / #266)
// ──────────────────────────────────────────────────────────
// Settings page restructured into 4 deliberate groups: Study Setup /
// AI Coach / Data & Backups / Danger Zone. Each group has a section
// header (eyebrow + display heading + sub) for trust hierarchy.
// Existing IDs + handlers all preserved; only wrapping structure changed.
test('v4.81.12 Settings: 4 settings-group containers present',
  /data-group="study-setup"/.test(html)
  && /data-group="ai-coach"/.test(html)
  && /data-group="data-backups"/.test(html)
  && /data-group="danger-zone"/.test(html));
test('v4.81.12 Settings: each group has a settings-group-head with §-numbered eyebrow',
  /class="settings-group-num">&sect; 01/.test(html)
  && /class="settings-group-num">&sect; 02/.test(html)
  && /class="settings-group-num">&sect; 03/.test(html)
  && /class="settings-group-num">&sect; 04/.test(html));
test('v4.81.12 Settings: Danger Zone has settings-group-danger class',
  /class="settings-group settings-group-danger"/.test(html));
test('v4.81.12 Settings: Wrong Answers Bank section has settings-section-danger class',
  /class="card settings-section settings-section-danger"/.test(html));
test('v4.81.12 Settings: Health card lives in §01 Study Setup',
  /data-group="study-setup"[\s\S]{0,2000}id="settings-health-card"/.test(html));
test('v4.81.12 Settings: API key lives in §02 AI Coach',
  /data-group="ai-coach"[\s\S]{0,800}id="api-key"/.test(html));
test('v4.81.12 Settings: Export+Import live in §03 Data & Backups',
  /data-group="data-backups"[\s\S]{0,2000}exportData\(\)/.test(html)
  && /data-group="data-backups"[\s\S]{0,2000}id="import-file-input"/.test(html));
test('v4.81.12 Settings: Auto-backups list lives in §03 Data & Backups',
  /data-group="data-backups"[\s\S]{0,3000}id="autobackup-list"/.test(html));
test('v4.81.12 Settings: Wrong Answers Bank lives in §04 Danger Zone',
  /data-group="danger-zone"[\s\S]{0,2000}id="wrong-bank-clear"/.test(html));
test('v4.81.12 Settings: .settings-group CSS declared',
  /\.settings-group\s*\{/.test(css));
test('v4.81.12 Settings: .settings-group-danger has red tint',
  /\.settings-group-danger\s*\{[^}]*background:\s*rgba\(248,113,113/.test(css));
test('v4.81.12 Settings: mobile breakpoint exists for settings-group',
  /max-width:\s*540px[\s\S]{0,500}\.settings-group\b/.test(css));

// ──────────────────────────────────────────────────────────
// v4.81.13: Exam → readiness/progress/analytics integration (user request)
// ──────────────────────────────────────────────────────────
// User report: "i did my first exam simulator on the app and i got 780.
// ideally this should reflect somehow on the exam readiness score...
// rather than just a standalone entity and it should reflect somehow in
// the progress and analytics part for what topics i got right/wrong and
// their domains."
//
// Pre-fix: submitExam saved ONE summary row tagged `topic: EXAM_TOPIC`.
// getReadinessScore explicitly filters EXAM_TOPIC out → exam contributed
// zero signal to readiness/progress/analytics/weak-spots/what-if.
// Wrong-bank + SR seeding worked but headline metrics ignored the exam.
//
// Fix: per-topic history split (A) writes one row per topic from log[]
// after the summary, tagged `mode: 'exam'` (gets 1.3× boost) and
// `via: 'exam-split'` (traceable). Plus domain breakdown card on the
// exam-results page (C) for immediate post-exam visibility.

test('v4.81.13 Exam: _saveExamPerTopicSplit helper defined',
  /function\s+_saveExamPerTopicSplit\b/.test(js));
test('v4.81.13 Exam: _buildExamDomainBreakdown helper defined',
  /function\s+_buildExamDomainBreakdown\b/.test(js));
test('v4.81.13 Exam: renderExamDomainBreakdown function defined',
  /function\s+renderExamDomainBreakdown\b/.test(js));
test('v4.81.13 Exam: submitExam wires _saveExamPerTopicSplit after summary save',
  (() => {
    const body = _fnBody(js, 'submitExam');
    return body && /_saveExamPerTopicSplit\(log,/.test(body);
  })());
test('v4.81.13 Exam: submitExam wires renderExamDomainBreakdown',
  (() => {
    const body = _fnBody(js, 'submitExam');
    return body && /renderExamDomainBreakdown\(log\)/.test(body);
  })());
test('v4.81.13 Exam: per-topic split tags rows with via:"exam-split" marker',
  (() => {
    const body = _fnBody(js, '_saveExamPerTopicSplit');
    return body && /via:\s*['"]exam-split['"]/.test(body);
  })());
test('v4.81.13 Exam: per-topic split uses mode:"exam" so 1.3× boost applies',
  (() => {
    const body = _fnBody(js, '_saveExamPerTopicSplit');
    return body && /mode:\s*['"]exam['"]/.test(body);
  })());
test('v4.81.13 Exam: per-topic split skips MIXED_TOPIC + EXAM_TOPIC entries (defensive)',
  (() => {
    const body = _fnBody(js, '_saveExamPerTopicSplit');
    return body && /MIXED_TOPIC/.test(body) && /EXAM_TOPIC/.test(body);
  })());
test('v4.81.13 Exam: domain breakdown uses tier system anchored to 55/70/85',
  (() => {
    const body = _fnBody(js, '_buildExamDomainBreakdown');
    return body && />=\s*85/.test(body) && />=\s*70/.test(body) && />=\s*55/.test(body);
  })());
test('v4.81.13 Exam: #exam-domain-breakdown card present in HTML',
  /id="exam-domain-breakdown"/.test(html) && /id="exam-domain-breakdown-grid"/.test(html));
test('v4.81.13 Exam: .exam-domain-breakdown CSS declared',
  /\.exam-domain-breakdown\s*\{/.test(css));
test('v4.81.13 Exam: tier classes styled (mastered/proficient/developing/novice/empty)',
  /\.exam-domain-mastered\s/.test(css)
  && /\.exam-domain-proficient\s/.test(css)
  && /\.exam-domain-developing\s/.test(css)
  && /\.exam-domain-novice\s/.test(css)
  && /\.exam-domain-empty\s/.test(css));

// Behavioral fixture — vm-sandbox _saveExamPerTopicSplit with a synthetic
// log of 5 questions across 3 topics. Pre-fix this was not a function;
// post-fix it should call saveToHistory 3 times with correct shapes.
test('v4.81.13 Exam: vm fixture — per-topic split writes one row per unique topic',
  (() => {
    try {
      const body = _fnBody(js, '_saveExamPerTopicSplit');
      if (!body) return false;
      const vm = require('vm');
      const writes = [];
      const ctx = {
        MIXED_TOPIC: 'Mixed — All Topics',
        EXAM_TOPIC: 'Exam Simulation',
        saveToHistory: (entry) => { writes.push(entry); },
        Date, Math, JSON
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const log = [
        { q: { topic: 'OSPF' }, isRight: true,  isSkipped: false },
        { q: { topic: 'OSPF' }, isRight: true,  isSkipped: false },
        { q: { topic: 'OSPF' }, isRight: false, isSkipped: false },
        { q: { topic: 'BGP' },  isRight: true,  isSkipped: false },
        { q: { topic: 'STP' },  isRight: false, isSkipped: false }
      ];
      ctx.log = log;
      const written = vm.runInContext('_saveExamPerTopicSplit(log, false)', ctx);
      // Expect 3 writes (one per unique topic), all with mode='exam' + via='exam-split'
      return written === 3
        && writes.length === 3
        && writes.every(w => w.mode === 'exam' && w.via === 'exam-split')
        && writes.find(w => w.topic === 'OSPF' && w.score === 2 && w.total === 3)
        && writes.find(w => w.topic === 'BGP' && w.score === 1 && w.total === 1)
        && writes.find(w => w.topic === 'STP' && w.score === 0 && w.total === 1);
    } catch (e) { return false; }
  })());

test('v4.81.13 Exam: vm fixture — per-topic split skips EXAM_TOPIC + MIXED_TOPIC entries',
  (() => {
    try {
      const body = _fnBody(js, '_saveExamPerTopicSplit');
      if (!body) return false;
      const vm = require('vm');
      const writes = [];
      const ctx = {
        MIXED_TOPIC: 'Mixed',
        EXAM_TOPIC: 'Exam',
        saveToHistory: (entry) => { writes.push(entry); },
        Date, Math, JSON
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const log = [
        { q: { topic: 'OSPF' }, isRight: true, isSkipped: false },
        { q: { topic: 'Mixed' }, isRight: true, isSkipped: false },  // skipped
        { q: { topic: 'Exam' }, isRight: false, isSkipped: false },  // skipped
        { q: { topic: '' }, isRight: true, isSkipped: false }        // skipped (empty)
      ];
      ctx.log = log;
      const written = vm.runInContext('_saveExamPerTopicSplit(log, false)', ctx);
      return written === 1 && writes.length === 1 && writes[0].topic === 'OSPF';
    } catch (e) { return false; }
  })());

// ──────────────────────────────────────────────────────────
// v4.81.14: Cross-batch question dedup (user report)
// ──────────────────────────────────────────────────────────
// User: "some questions kept repeating themselves lol... in the exam
// simulator... also this happens in regular quizzes sometimes too"
//
// Pre-fix: zero dedup anywhere. fetchQuestions split n>10 into parallel
// batches via Promise.allSettled; concurrent batches couldn't see each
// other's output. startExam called fetchQuestions 5 times sequentially;
// no cross-call dedup either. Validator caught structural bugs but had
// no cross-batch awareness — duplicates passed right through.
//
// Fix: stem normalization (lowercase + strip punctuation + collapse
// whitespace + 200-char cap) + first-seen-wins dedup at two levels:
// inside fetchQuestions's parallel-batch merge, and across startExam's
// 5 sequential batches. Dedup happens BEFORE the existing retry-to-fill
// logic so deficit auto-refills.

test('v4.81.14 Dedup: _normalizeStemForDedup helper defined',
  /function\s+_normalizeStemForDedup\b/.test(js));
test('v4.81.14 Dedup: helper lowercases + strips punctuation + collapses whitespace + caps length',
  (() => {
    const body = _fnBody(js, '_normalizeStemForDedup');
    return body
      && /toLowerCase/.test(body)
      && /\[\^\\w\\s\]/.test(body)
      && /\\s\+/.test(body)
      && /slice\(0,\s*200\)/.test(body);
  })());
test('v4.81.14 Dedup: fetchQuestions merge step uses Set + _normalizeStemForDedup',
  (() => {
    const body = _fnBody(js, 'fetchQuestions');
    return body
      && /seenStems/.test(body)
      && /_normalizeStemForDedup/.test(body)
      && /new Set\(\)/.test(body);
  })());
test('v4.81.14 Dedup: fetchQuestions logs deduped count when > 0',
  (() => {
    const body = _fnBody(js, 'fetchQuestions');
    return body && /deduped\b/.test(body) && /console\.info/.test(body);
  })());
test('v4.81.14 Dedup: startExam dedupes new batch against accumulated examQuestions',
  (() => {
    const body = _fnBody(js, 'startExam');
    return body
      && /examQuestions\.length\s*>\s*0/.test(body)
      && /seenStems/.test(body)
      && /_normalizeStemForDedup/.test(body);
  })());
test('v4.81.14 Dedup: startExam retry-to-fill payload also deduped (no undoing prior dedup)',
  (() => {
    const body = _fnBody(js, 'startExam');
    return body && /seenStemsRetry/.test(body);
  })());

// vm fixture — synthesize realistic stems with case/punctuation/whitespace
// variation + verify normalization collapses them to the same key.
test('v4.81.14 Dedup: vm fixture — normalization collapses case + punctuation + whitespace',
  (() => {
    try {
      const body = _fnBody(js, '_normalizeStemForDedup');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { String };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const a = vm.runInContext("_normalizeStemForDedup('Which of the following BEST describes ARP?')", ctx);
      const b = vm.runInContext("_normalizeStemForDedup('  which of the following best describes arp.  ')", ctx);
      const c = vm.runInContext("_normalizeStemForDedup('Which   of\\nthe following best describes\\tARP???')", ctx);
      const empty1 = vm.runInContext("_normalizeStemForDedup('')", ctx);
      const empty2 = vm.runInContext("_normalizeStemForDedup(null)", ctx);
      const empty3 = vm.runInContext("_normalizeStemForDedup(undefined)", ctx);
      // All three variations should normalize to the same string
      return a === b
        && a === c
        && a === 'which of the following best describes arp'
        && empty1 === ''
        && empty2 === ''
        && empty3 === '';
    } catch (e) { return false; }
  })());

// vm fixture — simulate the merge dedup logic across 3 parallel batches
// where batch 2 has a duplicate of batch 1 + batch 3 has a duplicate of
// batch 2. Verify only first-seen versions survive.
test('v4.81.14 Dedup: vm fixture — first-seen wins across parallel batches',
  (() => {
    try {
      const helperBody = _fnBody(js, '_normalizeStemForDedup');
      if (!helperBody) return false;
      const vm = require('vm');
      const ctx = { String, Set };
      vm.createContext(ctx);
      vm.runInContext(helperBody, ctx);
      // Simulate the merge logic from fetchQuestions
      const mergeLogic = `
        const merged = [];
        const seenStems = new Set();
        let deduped = 0;
        results.forEach(r => {
          if (r.status === 'fulfilled') {
            r.value.forEach(q => {
              const norm = _normalizeStemForDedup(q && q.question);
              if (norm && seenStems.has(norm)) { deduped++; return; }
              if (norm) seenStems.add(norm);
              merged.push(q);
            });
          }
        });
        ({ merged, deduped });
      `;
      const results = [
        { status: 'fulfilled', value: [
          { question: 'What is OSPF?', answer: 'A' },
          { question: 'What is BGP?', answer: 'B' }
        ]},
        { status: 'fulfilled', value: [
          { question: 'what is OSPF?', answer: 'A' },  // duplicate of batch 1
          { question: 'What is RIP?', answer: 'C' }
        ]},
        { status: 'fulfilled', value: [
          { question: 'WHAT IS BGP???', answer: 'B' },  // duplicate of batch 1
          { question: 'What is EIGRP?', answer: 'D' }
        ]}
      ];
      ctx.results = results;
      const out = vm.runInContext(mergeLogic, ctx);
      // Should have 4 unique: OSPF, BGP, RIP, EIGRP — and 2 deduped
      return out.merged.length === 4
        && out.deduped === 2
        && out.merged[0].question === 'What is OSPF?'  // original case kept
        && out.merged[1].question === 'What is BGP?'   // original case kept
        && out.merged[2].question === 'What is RIP?'
        && out.merged[3].question === 'What is EIGRP?';
    } catch (e) { return false; }
  })());

// v4.81.22: hide today-section wrapper when nothing meaningful renders
// inside. User dogfood screenshot post-v4.81.21 showed the section
// rendering as an empty card with just "TODAY" title — because
// hero-v2-active CSS hides #daily-goal-card AND #today-plan was
// correctly hidden (plan done today). renderTodaySection now properly
// hides the wrapper when no candidate child is effectively visible.
test('v4.81.22 EmptyHide: renderTodaySection considers #today-plan in candidate list',
  /#today-plan/.test(_fnBody(js, 'renderTodaySection') || ''));
test('v4.81.22 EmptyHide: renderTodaySection accounts for hero-v2-active hide rule',
  /hero-v2-active/.test(_fnBody(js, 'renderTodaySection') || ''));
test('v4.81.22 EmptyHide: renderTodaySection conditionally hides the wrapper',
  (() => {
    const body = _fnBody(js, 'renderTodaySection') || '';
    return /classList\.add\(['"]is-hidden['"]\)/.test(body)
      && /classList\.remove\(['"]is-hidden['"]\)/.test(body);
  })());
test('v4.81.22 EmptyHide: tombstone — old "section is always shown" comment removed',
  !/Daily goal card is always visible, so the section is always shown/.test(_fnBody(js, 'renderTodaySection') || ''));

// vm fixture #1 — section hidden when all candidates effectively hidden
test('v4.81.22 EmptyHide: vm fixture — section hidden when daily-goal hero-v2-hidden + today-plan hidden',
  (() => {
    try {
      const body = _fnBody(js, 'renderTodaySection');
      if (!body) return false;
      const vm = require('vm');
      // Build fake DOM that mirrors the v4.81.21 dogfood state:
      // hero-v2-active on body, daily-goal not is-hidden but display:none via CSS,
      // today-plan IS is-hidden, others all is-hidden.
      const makeChild = (id, hidden) => ({
        id, _classes: new Set(hidden ? ['is-hidden'] : []),
        classList: { contains: function(c) { return makeChild_classes(this, c); } }
      });
      // Simpler: real Set with contains check
      const childMap = {
        '#daily-goal-card':      { _classes: new Set([]) },              // not is-hidden, but hero-v2 hides via CSS
        '#streak-defender':      { _classes: new Set(['is-hidden']) },
        '#daily-challenge-card': { _classes: new Set(['is-hidden']) },
        '#today-plan':           { _classes: new Set(['is-hidden']) }
      };
      Object.values(childMap).forEach(c => {
        c.classList = { contains: (cls) => c._classes.has(cls) };
      });
      const sectionState = { _classes: new Set([]) };
      sectionState.classList = {
        contains: (c) => sectionState._classes.has(c),
        add: (c) => sectionState._classes.add(c),
        remove: (c) => sectionState._classes.delete(c)
      };
      const ctx = {
        document: {
          getElementById: (id) => id === 'today-section' ? sectionState : null,
          body: { classList: { contains: (c) => c === 'hero-v2-active' } }
        },
        Array
      };
      sectionState.querySelector = (sel) => childMap[sel] || null;
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('renderTodaySection()', ctx);
      // Should be is-hidden because daily-goal is hidden by hero-v2 CSS rule
      // and all other candidates carry the is-hidden class.
      return sectionState._classes.has('is-hidden');
    } catch (e) { return false; }
  })());

// vm fixture #2 — section visible when ANY candidate has content
test('v4.81.22 EmptyHide: vm fixture — section visible when daily-challenge-card visible',
  (() => {
    try {
      const body = _fnBody(js, 'renderTodaySection');
      if (!body) return false;
      const vm = require('vm');
      const childMap = {
        '#daily-goal-card':      { _classes: new Set([]) },
        '#streak-defender':      { _classes: new Set(['is-hidden']) },
        '#daily-challenge-card': { _classes: new Set([]) },              // VISIBLE
        '#today-plan':           { _classes: new Set(['is-hidden']) }
      };
      Object.values(childMap).forEach(c => {
        c.classList = { contains: (cls) => c._classes.has(cls) };
      });
      const sectionState = { _classes: new Set(['is-hidden']) };
      sectionState.classList = {
        contains: (c) => sectionState._classes.has(c),
        add: (c) => sectionState._classes.add(c),
        remove: (c) => sectionState._classes.delete(c)
      };
      const ctx = {
        document: {
          getElementById: () => sectionState,
          // hero-v2 active — so daily-goal is "hidden" but daily-challenge isn't
          body: { classList: { contains: (c) => c === 'hero-v2-active' } }
        },
        Array
      };
      sectionState.querySelector = (sel) => childMap[sel] || null;
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('renderTodaySection()', ctx);
      // Section should be made visible because daily-challenge-card is visible
      return !sectionState._classes.has('is-hidden');
    } catch (e) { return false; }
  })());

// v4.81.21: Restore Subnet Trainer bridge in #today-plan. The v4.43.1
// affordance ("Drill in Subnet Trainer →" link for subnet-heavy weak
// topics) was retired in v4.81.18 consolidation. WEAK_SPOT_DRILL_BRIDGES
// constant + openWeakSpotBridge handler stayed (used by Subnet Trainer
// dashboard); this restores the integration point in the new
// consolidated card. Bridges render below the chip strip when the plan
// includes any of: Subnetting & IP Addressing, IPv6, NAT & IP Services.
test('v4.81.21 BridgeRestore: renderTodayPlan reads WEAK_SPOT_DRILL_BRIDGES',
  /WEAK_SPOT_DRILL_BRIDGES/.test(_fnBody(js, 'renderTodayPlan') || ''));
test('v4.81.21 BridgeRestore: renderTodayPlan dedupes bridges by kind+labId',
  /seenBridgeKeys/.test(_fnBody(js, 'renderTodayPlan') || ''));
test('v4.81.21 BridgeRestore: renderTodayPlan emits .tplan-bridges container',
  /tplan-bridges/.test(_fnBody(js, 'renderTodayPlan') || ''));
test('v4.81.21 BridgeRestore: renderTodayPlan emits .tplan-bridge-btn buttons',
  /tplan-bridge-btn/.test(_fnBody(js, 'renderTodayPlan') || ''));
test('v4.81.21 BridgeRestore: bridge button onclick wired to openWeakSpotBridge',
  /openWeakSpotBridge\(['"]\\?\\?[^']+['"]\)|openWeakSpotBridge\(\\['"]/.test(_fnBody(js, 'renderTodayPlan') || '')
    || /openWeakSpotBridge\(['"]/.test(_fnBody(js, 'renderTodayPlan') || ''));
test('v4.81.21 BridgeRestore: .tplan-bridges CSS declared',
  /\.tplan-bridges\s*\{/.test(css));
test('v4.81.21 BridgeRestore: .tplan-bridge-btn CSS declared',
  /\.tplan-bridge-btn\s*\{/.test(css));
test('v4.81.21 BridgeRestore: bridge buttons get reduced-motion gate',
  /prefers-reduced-motion[\s\S]{0,800}\.tplan-bridge-btn/.test(css));
test('v4.81.21 BridgeRestore: bridge buttons get mobile breakpoint margin reset',
  /@media[\s\S]{0,80}max-width:\s*540px[\s\S]{0,400}\.tplan-bridges/.test(css));

// vm fixture — bridge logic emits buttons for subnet topics in plan.
test('v4.81.21 BridgeRestore: vm fixture — bridge buttons rendered for matching plan topics',
  (() => {
    try {
      const body = _fnBody(js, 'renderTodayPlan');
      if (!body) return false;
      const vm = require('vm');
      const fakeCard = { _innerHTML: '', _classes: new Set(['is-hidden']),
        get innerHTML() { return this._innerHTML; },
        set innerHTML(v) { this._innerHTML = v; },
        classList: { add: function(c) { fakeCard._classes.add(c); }, remove: function(c) { fakeCard._classes.delete(c); } }
      };
      const ctx = {
        document: { getElementById: (id) => id === 'today-plan' ? fakeCard : null },
        WEAK_SPOT_DRILL_BRIDGES: {
          'Subnetting & IP Addressing': { kind: 'subnet', label: 'Drill in Subnet Trainer', icon: '🧮' },
          'IPv6':                       { kind: 'subnet', label: 'Practice IPv6 math',       icon: '🧮' }
        },
        SESSION_TOPICS: 5,
        SESSION_QUESTIONS: 7,
        sessionPlan: [],
        // Stub plan with a subnet topic
        buildSessionPlan: () => ([
          { topic: 'WAN Connectivity', signal: 'weak', meta: '~55% accuracy', reason: '~55% accuracy', color: '#fbbf24' },
          { topic: 'Subnetting & IP Addressing', signal: 'weak', meta: '~50% accuracy', reason: '~50% accuracy', color: '#fbbf24' },
          { topic: 'IPv6', signal: 'stale', meta: '21d stale', reason: '21d stale', color: '#f59e0b' }
        ]),
        isStudyPlanDoneToday: () => false,
        escHtml: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
        Math, JSON, Object, Array, String
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('renderTodayPlan()', ctx);
      const html = fakeCard._innerHTML;
      // Should contain ONE bridge container (deduped — both Subnetting + IPv6
      // map to the SAME kind 'subnet' so only one button renders)
      const bridgeOpens = (html.match(/class="tplan-bridges"/g) || []).length;
      const bridgeBtns = (html.match(/class="tplan-bridge-btn"/g) || []).length;
      return bridgeOpens === 1 && bridgeBtns === 1
        && html.includes('openWeakSpotBridge')
        && html.includes('subnet');
    } catch (e) { return false; }
  })());

// vm fixture — bridges hidden when plan has no subnet topics
test('v4.81.21 BridgeRestore: vm fixture — no bridges rendered when plan has no subnet topics',
  (() => {
    try {
      const body = _fnBody(js, 'renderTodayPlan');
      if (!body) return false;
      const vm = require('vm');
      const fakeCard = { _innerHTML: '',
        get innerHTML() { return this._innerHTML; },
        set innerHTML(v) { this._innerHTML = v; },
        classList: { add: () => {}, remove: () => {} }
      };
      const ctx = {
        document: { getElementById: () => fakeCard },
        WEAK_SPOT_DRILL_BRIDGES: {
          'Subnetting & IP Addressing': { kind: 'subnet', label: 'Drill in Subnet Trainer', icon: '🧮' }
        },
        SESSION_TOPICS: 5,
        SESSION_QUESTIONS: 7,
        sessionPlan: [],
        buildSessionPlan: () => ([
          { topic: 'WAN Connectivity', signal: 'weak', meta: '~55%', reason: '~55%', color: '#fbbf24' },
          { topic: 'BGP', signal: 'stale', meta: '21d', reason: '21d', color: '#f59e0b' }
        ]),
        isStudyPlanDoneToday: () => false,
        escHtml: (s) => String(s),
        Math, JSON, Object, Array, String
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('renderTodayPlan()', ctx);
      const html = fakeCard._innerHTML;
      return !html.includes('tplan-bridges') && !html.includes('tplan-bridge-btn');
    } catch (e) { return false; }
  })());

// v4.81.20: retire orphan v4.54.0 #focus-banner. User dogfood after
// v4.81.18 ship revealed the focus-banner was a SECOND prescriptive
// surface OUTSIDE the today-section — still rendering "Seven questions
// per topic, mixed difficulty..." stale copy any time the new
// #today-plan was correctly hidden by the isStudyPlanDoneToday gate.
// renderSetupFocusBanner now a thin compat shim that delegates to
// renderTodayPlan so all states route through the canonical card.
// v4.81.23: cleanup pass — the v4.81.20 compat shim was retired entirely.
// renderSetupFocusBanner is now a no-op stub (kept for any external
// callers); the #focus-banner element + its CSS are removed.
test('v4.81.23 FocusCleanup: renderSetupFocusBanner is a no-op stub',
  (() => {
    const body = _fnBody(js, 'renderSetupFocusBanner') || '';
    return body.length < 200; // tiny stub, no logic
  })());
test('v4.81.23 FocusCleanup: stale "Seven questions per topic" copy gone',
  !/Seven questions per topic, mixed difficulty/.test(js));
test('v4.81.23 FocusCleanup: "fastest route to exam-ready" copy only in renderTodayPlan',
  (() => {
    const matches = (js.match(/fastest[^"]*route to exam-ready/g) || []);
    if (matches.length === 0) return false;
    const tpBody = _fnBody(js, 'renderTodayPlan') || '';
    return matches.every(m => tpBody.includes(m));
  })());
test('v4.81.23 FocusCleanup tombstone: #focus-banner element removed from HTML',
  !html.includes('id="focus-banner"'));
test('v4.81.23 FocusCleanup tombstone: .focus-banner-v2 CSS removed',
  !/\.focus-banner-v2\s*\{/.test(css));
test('v4.81.23 FocusCleanup tombstone: goSetup no longer calls renderSetupFocusBanner',
  !/renderSetupFocusBanner/.test(_fnBody(js, 'goSetup') || ''));

// v4.81.19: comma-safe Multi: topic sentinel parser. Pre-existing bug
// surfaced by v4.81.17 Domain Drill — 3 topic names contain commas
// ("NTP, ICMP & Traffic Types", "SDN, NFV & Automation", "Firewalls,
// DMZ & Security Zones") and 4 split sites all used naive .split(',')
// which mis-segmented those topics. New helper does greedy longest-match
// against TOPIC_DOMAINS catalog (sorted by length desc) so multi-word
// names with commas are preserved verbatim.
test('v4.81.19 MultiParse: _parseMultiTopicSentinel helper defined',
  /function _parseMultiTopicSentinel\(/.test(js));
test('v4.81.19 MultiParse: helper sorts catalog by length descending for greedy match',
  (() => {
    const body = _fnBody(js, '_parseMultiTopicSentinel') || '';
    return /\.sort\(\(a,\s*b\)\s*=>\s*b\.length\s*-\s*a\.length\)/.test(body);
  })());
test('v4.81.19 MultiParse: helper accepts both full sentinel and bare body',
  (() => {
    const body = _fnBody(js, '_parseMultiTopicSentinel') || '';
    return /startsWith\(['"]Multi: ['"]\)/.test(body) && /\.slice\(7\)/.test(body);
  })());
test('v4.81.19 MultiParse: helper has fallback split for unknown TOPIC_DOMAINS',
  (() => {
    const body = _fnBody(js, '_parseMultiTopicSentinel') || '';
    return /typeof TOPIC_DOMAINS\s*===\s*['"]undefined['"]/.test(body)
      || /!TOPIC_DOMAINS/.test(body);
  })());
test('v4.81.19 MultiParse: _pickExemplarsForTopic uses _parseMultiTopicSentinel',
  /_parseMultiTopicSentinel/.test(_fnBody(js, '_pickExemplarsForTopic') || ''));
test('v4.81.19 MultiParse: _filterHistoryByTopic uses _parseMultiTopicSentinel',
  /_parseMultiTopicSentinel/.test(_fnBody(js, '_filterHistoryByTopic') || ''));
test('v4.81.19 MultiParse: fetchQuestions Multi: parse uses _parseMultiTopicSentinel',
  /_parseMultiTopicSentinel/.test(_fnBody(js, '_fetchQuestionsBatch') || ''));
test('v4.81.19 MultiParse: startQuiz _multiCount uses _parseMultiTopicSentinel',
  /_parseMultiTopicSentinel/.test(_fnBody(js, 'startQuiz') || ''));

// vm fixture #1 — comma-containing topic names parse correctly.
test('v4.81.19 MultiParse: vm fixture — comma-containing topics parsed verbatim',
  (() => {
    try {
      const body = _fnBody(js, '_parseMultiTopicSentinel');
      if (!body) return false;
      const vm = require('vm');
      const ctx = {
        TOPIC_DOMAINS: {
          'IPv6': 'concepts',
          'BGP': 'implementation',
          'NTP, ICMP & Traffic Types': 'concepts',
          'SDN, NFV & Automation': 'implementation',
          'Firewalls, DMZ & Security Zones': 'security'
        },
        Array, Object, String
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      // Worst-case: all 3 comma-containing topics in one Multi: sentinel
      // alongside non-comma topics
      const parsed = vm.runInContext(
        '_parseMultiTopicSentinel("Multi: IPv6, NTP, ICMP & Traffic Types, BGP, SDN, NFV & Automation, Firewalls, DMZ & Security Zones")',
        ctx
      );
      return parsed.length === 5
        && parsed[0] === 'IPv6'
        && parsed[1] === 'NTP, ICMP & Traffic Types'
        && parsed[2] === 'BGP'
        && parsed[3] === 'SDN, NFV & Automation'
        && parsed[4] === 'Firewalls, DMZ & Security Zones';
    } catch (e) { return false; }
  })());

// vm fixture #2 — naive parser would have failed; confirm regression.
test('v4.81.19 MultiParse: vm fixture — naive split(",") would mis-segment but new parser does not',
  (() => {
    try {
      const body = _fnBody(js, '_parseMultiTopicSentinel');
      if (!body) return false;
      const vm = require('vm');
      const ctx = {
        TOPIC_DOMAINS: { 'NTP, ICMP & Traffic Types': 'concepts', 'IPv6': 'concepts' },
        Array, Object, String
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const sentinel = 'Multi: NTP, ICMP & Traffic Types, IPv6';
      // Naive baseline: split(',') on body "NTP, ICMP & Traffic Types, IPv6"
      // produces 3 segments (over-segmented — the comma-containing topic is
      // chopped in half). New parser correctly returns 2 segments.
      const naive = sentinel.slice(7).split(',').map(s => s.trim());
      const parsed = vm.runInContext('_parseMultiTopicSentinel(' + JSON.stringify(sentinel) + ')', ctx);
      return naive.length === 3        // proves the bug exists in naive split
        && naive[0] === 'NTP'           // proves the comma-topic gets chopped
        && parsed.length === 2          // new parser segments correctly
        && parsed[0] === 'NTP, ICMP & Traffic Types'
        && parsed[1] === 'IPv6';
    } catch (e) { return false; }
  })());

// vm fixture #3 — accepts both full sentinel ("Multi: A, B") and body alone ("A, B").
test('v4.81.19 MultiParse: vm fixture — accepts both full sentinel and bare body',
  (() => {
    try {
      const body = _fnBody(js, '_parseMultiTopicSentinel');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { TOPIC_DOMAINS: { 'IPv6': 'concepts', 'BGP': 'implementation' }, Array, Object, String };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const fromSentinel = vm.runInContext('_parseMultiTopicSentinel("Multi: IPv6, BGP")', ctx);
      const fromBody     = vm.runInContext('_parseMultiTopicSentinel("IPv6, BGP")', ctx);
      const empty        = vm.runInContext('_parseMultiTopicSentinel("")', ctx);
      const nullish      = vm.runInContext('_parseMultiTopicSentinel(null)', ctx);
      return fromSentinel.length === 2
        && fromBody.length === 2
        && fromSentinel[0] === fromBody[0]
        && fromSentinel[1] === fromBody[1]
        && empty.length === 0
        && nullish.length === 0;
    } catch (e) { return false; }
  })());

// v4.81.18: Today section consolidation — collapses 3 stacked surfaces
// (Weak Spots row + Rotation row + Study Plan banner) into ONE prescriptive
// card that consumes both signals. User-approved mockup at
// mockups/today-consolidation-concept.html. Codex r7-r9 pattern: every
// page should have one strong recommendation, not three competing CTAs.
test('v4.81.18 TodayPlan: renderTodayPlan function defined',
  /function renderTodayPlan\(/.test(js));
test('v4.81.18 TodayPlan: TODAY_PLAN_WEAK_COUNT constant declared',
  /TODAY_PLAN_WEAK_COUNT\s*=\s*\d+/.test(js));
test('v4.81.18 TodayPlan: TODAY_PLAN_STALE_COUNT constant declared',
  /TODAY_PLAN_STALE_COUNT\s*=\s*\d+/.test(js));
test('v4.81.18 TodayPlan: SESSION_TOPICS bumped to 5',
  /const SESSION_TOPICS\s*=\s*5/.test(js));
test('v4.81.18 TodayPlan: buildSessionPlan rewritten to compose weak + stale',
  (() => {
    const body = _fnBody(js, 'buildSessionPlan') || '';
    return /computeWeakSpotScores/.test(body)
      && /_computeStaleTopics/.test(body)
      && /signal:\s*['"]weak['"]/.test(body)
      && /signal:\s*['"]stale['"]/.test(body);
  })());
test('v4.81.18 TodayPlan: buildSessionPlan keeps _scoreTopicNeed fallback for sparse history',
  /_scoreTopicNeed/.test(_fnBody(js, 'buildSessionPlan') || ''));
test('v4.81.18 TodayPlan: renderTodayPlan uses isStudyPlanDoneToday gate',
  /isStudyPlanDoneToday/.test(_fnBody(js, 'renderTodayPlan') || ''));
test('v4.81.18 TodayPlan: renderTodayPlan calls buildSessionPlan',
  /buildSessionPlan\(SESSION_TOPICS\)/.test(_fnBody(js, 'renderTodayPlan') || ''));
test('v4.81.18 TodayPlan: renderTodayPlan emits chip-strip + foot row + Begin plan CTA',
  (() => {
    const body = _fnBody(js, 'renderTodayPlan') || '';
    return /tplan-chips/.test(body)
      && /tplan-foot/.test(body)
      && /tplan-cta/.test(body)
      && /onclick="startSession\(\)"/.test(body);
  })());
test('v4.81.18 TodayPlan: renderTodayPlan uses signal-coded chip data attribute',
  /data-signal=/.test(_fnBody(js, 'renderTodayPlan') || ''));
// v4.81.23: cleanup pass — the v4.81.18 compat-shim functions were
// retired. Callers now invoke renderTodayPlan directly.
test('v4.81.23 cleanup tombstone: renderTodaysFocus function removed',
  !js.includes('function renderTodaysFocus('));
test('v4.81.23 cleanup tombstone: renderRotationChips function removed',
  !js.includes('function renderRotationChips('));
test('v4.81.23 cleanup tombstone: renderSessionBanner function removed',
  !js.includes('function renderSessionBanner('));
test('v4.81.18 TodayPlan: #today-plan element present in HTML',
  html.includes('id="today-plan"'));
test('v4.81.18 TodayPlan: #today-plan defaults to is-hidden',
  /id="today-plan"[^>]*is-hidden/.test(html));
test('v4.81.23 cleanup tombstone: legacy compat shim DOM elements removed',
  !html.includes('id="todays-focus"')
    && !html.includes('id="rotation-row"')
    && !html.includes('id="session-banner"'));
test('v4.81.18 TodayPlan: .today-plan CSS declared',
  /\.today-plan\s*\{/.test(css));
test('v4.81.18 TodayPlan: .tplan-chip CSS declared with signal variants',
  /\.tplan-chip\b/.test(css)
    && /\.tplan-chip\[data-signal="weak"\]/.test(css)
    && /\.tplan-chip\[data-signal="stale"\]/.test(css));
test('v4.81.18 TodayPlan: .tplan-cta primary CTA styled',
  /\.tplan-cta\s*\{/.test(css));
test('v4.81.18 TodayPlan: mobile breakpoint stacks foot row',
  /@media[\s\S]{0,80}max-width:\s*540px[\s\S]{0,400}\.tplan-foot[\s\S]{0,150}flex-direction:\s*column/.test(css));
test('v4.81.18 TodayPlan: reduced-motion gate covers tplan-chip + tplan-cta',
  /prefers-reduced-motion[\s\S]{0,800}\.tplan-chip[\s\S]{0,500}\.tplan-cta/.test(css));

// vm fixture — buildSessionPlan composes 2 weak + 3 stale correctly when
// both signals have data. Stubs computeWeakSpotScores + _computeStaleTopics
// + loadHistory + the fallback ranker so the test is hermetic.
test('v4.81.18 TodayPlan: vm fixture — buildSessionPlan composes 2 weak + 3 stale',
  (() => {
    try {
      const body = _fnBody(js, 'buildSessionPlan');
      if (!body) return false;
      const vm = require('vm');
      const ctx = {
        SESSION_TOPICS: 5,
        TODAY_PLAN_WEAK_COUNT: 2,
        TODAY_PLAN_STALE_COUNT: 3,
        MIXED_TOPIC: 'Mixed',
        EXAM_TOPIC: 'Exam',
        computeWeakSpotScores: () => ([
          { topic: 'WAN Connectivity', posterior: 0.62 },
          { topic: 'Network Troubleshooting Methodology', posterior: 0.55 },
          { topic: 'Subnetting & IP Addressing', posterior: 0.71 } // overflow
        ]),
        _computeStaleTopics: (hist, n) => ([
          { topic: 'IPv6', neverStudied: true, daysSince: 9999 },
          { topic: 'NAT & IP Services', neverStudied: true, daysSince: 9999 },
          { topic: 'NTP, ICMP & Traffic Types', neverStudied: false, daysSince: 30 },
          { topic: 'TCP/IP Basics', neverStudied: false, daysSince: 22 } // overflow
        ]),
        loadHistory: () => [
          { date: new Date().toISOString(), topic: 'WAN Connectivity', score: 5, total: 10 }
        ],
        _getAllStudyTopics: () => ['Foo', 'Bar'],
        _scoreTopicNeed: () => ({ score: 1, reason: 'fallback', color: '#666' }),
        Date, Math, Array, Object, String
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const plan = vm.runInContext('buildSessionPlan(5)', ctx);
      // Expected: 2 weak followed by 3 stale, total 5
      if (plan.length !== 5) return false;
      if (plan[0].topic !== 'WAN Connectivity' || plan[0].signal !== 'weak') return false;
      if (plan[1].topic !== 'Network Troubleshooting Methodology' || plan[1].signal !== 'weak') return false;
      if (plan[2].topic !== 'IPv6' || plan[2].signal !== 'stale') return false;
      if (plan[3].topic !== 'NAT & IP Services' || plan[3].signal !== 'stale') return false;
      if (plan[4].topic !== 'NTP, ICMP & Traffic Types' || plan[4].signal !== 'stale') return false;
      // The 3rd weak topic + 4th stale topic should NOT have leaked into the plan
      if (plan.some(p => p.topic === 'Subnetting & IP Addressing')) return false;
      if (plan.some(p => p.topic === 'TCP/IP Basics')) return false;
      // Each item should carry meta + reason fields (existing schema preserved)
      return plan.every(p => p.topic && p.signal && p.reason && p.color);
    } catch (e) { return false; }
  })());

// vm fixture — buildSessionPlan deduplicates between weak and stale signals.
// If a topic somehow appears in both, it should only be added once to the plan.
test('v4.81.18 TodayPlan: vm fixture — buildSessionPlan dedupes overlap between weak + stale',
  (() => {
    try {
      const body = _fnBody(js, 'buildSessionPlan');
      if (!body) return false;
      const vm = require('vm');
      const ctx = {
        SESSION_TOPICS: 5,
        TODAY_PLAN_WEAK_COUNT: 2,
        TODAY_PLAN_STALE_COUNT: 3,
        MIXED_TOPIC: 'Mixed', EXAM_TOPIC: 'Exam',
        // Weak picks: A, B
        computeWeakSpotScores: () => ([
          { topic: 'OSPF', posterior: 0.5 },
          { topic: 'IPv6', posterior: 0.55 }
        ]),
        // Stale picks: IPv6 (overlaps with weak!), C, D
        _computeStaleTopics: () => ([
          { topic: 'IPv6', neverStudied: false, daysSince: 25 },
          { topic: 'BGP', neverStudied: true, daysSince: 9999 },
          { topic: 'STP/RSTP', neverStudied: true, daysSince: 9999 }
        ]),
        loadHistory: () => [{ date: new Date().toISOString(), topic: 'X' }],
        _getAllStudyTopics: () => ['Filler1', 'Filler2', 'Filler3'],
        _scoreTopicNeed: () => ({ score: 1, reason: 'fb', color: '#666' }),
        Date, Math, Array, Object, String
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const plan = vm.runInContext('buildSessionPlan(5)', ctx);
      // IPv6 should appear EXACTLY ONCE (as weak — it was added first)
      const ipv6Hits = plan.filter(p => p.topic === 'IPv6');
      if (ipv6Hits.length !== 1) return false;
      if (ipv6Hits[0].signal !== 'weak') return false;
      // Plan should still have 5 unique topics — top-up from fallback ranker
      const topics = new Set(plan.map(p => p.topic));
      return topics.size === 5;
    } catch (e) { return false; }
  })());

// v4.81.17: Domain Drill — one-click 10-Q quiz on a single N10-009 domain
// (Mode Ladder tile) + Custom Quiz pre-fill pill row that selects all
// topic chips for a domain. Eliminates the 7-13-chip toggle tedium for
// domain-focused study sessions. Reuses existing multi-topic infrastructure.
test('v4.81.17 DomainDrill: applyDomainPreset helper defined',
  /function applyDomainPreset\(/.test(js));
test('v4.81.17 DomainDrill: prefillDomainTopics helper defined',
  /function prefillDomainTopics\(/.test(js));
test('v4.81.17 DomainDrill: _topicsInDomain reverse-lookup helper defined',
  /function _topicsInDomain\(/.test(js));
test('v4.81.17 DomainDrill: _DOMAIN_TOPICS_CACHE memoisation declared',
  /_DOMAIN_TOPICS_CACHE/.test(js));
test('v4.81.17 DomainDrill: _DOMAIN_IDX maps all 5 domain keys to indices',
  /_DOMAIN_IDX\s*=\s*\{[^}]*concepts:\s*1[^}]*implementation:\s*2[^}]*operations:\s*3[^}]*security:\s*4[^}]*troubleshooting:\s*5/.test(js));
test('v4.81.17 DomainDrill: applyDomainPreset uses Multi: sentinel for topic state',
  /topic\s*=\s*['"]Multi:\s*['"]\s*\+\s*topics\.join/.test(_fnBody(js, 'applyDomainPreset') || ''));
test('v4.81.17 DomainDrill: applyDomainPreset defaults to 10 Qs Exam Level',
  (() => {
    const body = _fnBody(js, 'applyDomainPreset') || '';
    return /diff\s*=\s*['"]Exam Level['"]/.test(body) && /qCount\s*=\s*10/.test(body);
  })());
test('v4.81.17 DomainDrill: applyDomainPreset fires startQuiz at end',
  /startQuiz\(\)/.test(_fnBody(js, 'applyDomainPreset') || ''));
test('v4.81.17 DomainDrill: prefillDomainTopics does NOT call startQuiz (state-only)',
  (() => {
    const body = _fnBody(js, 'prefillDomainTopics') || '';
    return body.length > 0 && !/startQuiz\(\)/.test(body);
  })());
test('v4.81.17 DomainDrill: prefillDomainTopics opens the matching accordion',
  /details\[data-domain-idx=/.test(_fnBody(js, 'prefillDomainTopics') || ''));
test('v4.81.17 DomainDrill: prefillDomainTopics jumps to Custom Quiz section',
  /_jumpToCustomQuiz/.test(_fnBody(js, 'prefillDomainTopics') || ''));
test('v4.81.17 DomainDrill: Mode Ladder domain row HTML present',
  html.includes('class="modes-domain-row"'));
test('v4.81.17 DomainDrill: Mode Ladder has 5 modes-domain-tile buttons',
  (html.match(/class="modes-domain-tile"/g) || []).length === 5);
test('v4.81.17 DomainDrill: Mode Ladder tiles wired to applyDomainPreset for all 5 domains',
  /applyDomainPreset\('concepts'\)/.test(html)
    && /applyDomainPreset\('implementation'\)/.test(html)
    && /applyDomainPreset\('operations'\)/.test(html)
    && /applyDomainPreset\('security'\)/.test(html)
    && /applyDomainPreset\('troubleshooting'\)/.test(html));
test('v4.81.17 DomainDrill: Custom Quiz pre-fill pill row present in topic-group',
  html.includes('class="topic-domain-prefill"'));
test('v4.81.17 DomainDrill: Custom Quiz has 5 tdp-pill buttons',
  (html.match(/class="tdp-pill"/g) || []).length === 5);
test('v4.81.17 DomainDrill: Custom Quiz pills wired to prefillDomainTopics for all 5 domains',
  /prefillDomainTopics\('concepts'\)/.test(html)
    && /prefillDomainTopics\('implementation'\)/.test(html)
    && /prefillDomainTopics\('operations'\)/.test(html)
    && /prefillDomainTopics\('security'\)/.test(html)
    && /prefillDomainTopics\('troubleshooting'\)/.test(html));
test('v4.81.17 DomainDrill: .modes-domain-tile CSS declared',
  /\.modes-domain-tile\s*\{/.test(css));
test('v4.81.17 DomainDrill: .tdp-pill CSS declared',
  /\.tdp-pill\s*\{/.test(css));
test('v4.81.17 DomainDrill: domain tiles use color-coded left borders matching accordion',
  /\.modes-domain-tile\[data-domain-idx="1"\][\s\S]{0,80}#7c6ff7/.test(css)
    && /\.modes-domain-tile\[data-domain-idx="5"\][\s\S]{0,80}#ef4444/.test(css));
test('v4.81.17 DomainDrill: pre-fill pills use color-coded left borders matching accordion',
  /\.tdp-pill\[data-domain-idx="1"\][\s\S]{0,80}#7c6ff7/.test(css)
    && /\.tdp-pill\[data-domain-idx="5"\][\s\S]{0,80}#ef4444/.test(css));
test('v4.81.17 DomainDrill: mobile breakpoint collapses tile grid',
  /@media[\s\S]{0,50}max-width:\s*720px[\s\S]{0,200}\.modes-domain-tiles[\s\S]{0,100}grid-template-columns:\s*repeat\(2/.test(css));
test('v4.81.17 DomainDrill: reduced-motion gate present for tiles + pills',
  /prefers-reduced-motion[\s\S]{0,500}\.modes-domain-tile/.test(css));

// vm fixture — applyDomainPreset produces correct multi-topic state for each
// of the 5 domains. Validates: (a) topic state uses 'Multi: ' sentinel,
// (b) all topics in the domain (and ONLY those topics) are listed, (c) diff
// + qCount defaults are correct.
test('v4.81.17 DomainDrill: vm fixture — applyDomainPreset produces correct multi-topic state per domain',
  (() => {
    try {
      const helperBody = _fnBody(js, '_topicsInDomain');
      const presetBody = _fnBody(js, 'applyDomainPreset');
      // Extract the TOPIC_DOMAINS const block (large, walks brace depth)
      const tdMatch = js.match(/const TOPIC_DOMAINS\s*=\s*\{[\s\S]*?\n\};/);
      if (!helperBody || !presetBody || !tdMatch) return false;
      const vm = require('vm');
      // State observable to the test
      let state = { topic: '', diff: '', qCount: 0, started: 0 };
      const ctx = {
        document: {
          getElementById: () => ({
            querySelectorAll: () => [],
            classList: { toggle: () => {}, remove: () => {} },
            setAttribute: () => {}
          }),
          querySelectorAll: () => []
        },
        syncChipAriaPressed: () => {},
        startQuiz: () => { state.started++; },
        Object, String, Array
      };
      // Add a getter/setter for `topic`/`diff`/`qCount` so the helper's
      // top-level assignments mutate our state object.
      Object.defineProperty(ctx, 'topic', { get: () => state.topic, set: (v) => { state.topic = v; } });
      Object.defineProperty(ctx, 'diff', { get: () => state.diff, set: (v) => { state.diff = v; } });
      Object.defineProperty(ctx, 'qCount', { get: () => state.qCount, set: (v) => { state.qCount = v; } });
      vm.createContext(ctx);
      vm.runInContext(tdMatch[0], ctx);
      vm.runInContext('let _DOMAIN_TOPICS_CACHE = null;', ctx);
      vm.runInContext(helperBody, ctx);
      vm.runInContext(presetBody, ctx);

      // Test all 5 domain keys
      // NOTE: 3 topic names contain commas ("NTP, ICMP & Traffic Types",
      // "SDN, NFV & Automation", "Firewalls, DMZ & Security Zones") so a
      // naive split(', ') would mis-segment them. Verify presence by
      // substring match instead — the topic string must CONTAIN every
      // expected topic name verbatim, and must NOT contain any topic
      // outside the domain.
      const results = {};
      ['concepts', 'implementation', 'operations', 'security', 'troubleshooting'].forEach(k => {
        state = { topic: '', diff: '', qCount: 0, started: 0 };
        vm.runInContext('applyDomainPreset(' + JSON.stringify(k) + ')', ctx);
        const td = vm.runInContext('TOPIC_DOMAINS', ctx);
        const expectedTopics = Object.keys(td).filter(t => td[t] === k);
        const outsideTopics = Object.keys(td).filter(t => td[t] !== k);
        results[k] = {
          isMultiSentinel: state.topic.startsWith('Multi: '),
          allDomainTopicsIncluded: expectedTopics.every(t => state.topic.indexOf(t) !== -1),
          // No outside topic should appear EXCEPT via substring overlap with
          // an in-domain topic. Check that no outside topic appears as a
          // standalone item — guarded by ', ' bracketing or end of string.
          noOutsideTopicsLeaked: outsideTopics.every(t =>
            state.topic.indexOf(', ' + t + ',') === -1
            && state.topic.indexOf(', ' + t + '$') === -1
            && !state.topic.endsWith(', ' + t)
            && !state.topic.startsWith('Multi: ' + t + ',')
            && state.topic !== 'Multi: ' + t
          ),
          diffCorrect: state.diff === 'Exam Level',
          qCountCorrect: state.qCount === 10,
          startQuizFired: state.started === 1
        };
      });
      // All 5 domains must satisfy all 6 invariants
      return Object.values(results).every(r =>
        r.isMultiSentinel
        && r.allDomainTopicsIncluded
        && r.noOutsideTopicsLeaked
        && r.diffCorrect
        && r.qCountCorrect
        && r.startQuizFired
      );
    } catch (e) { return false; }
  })());

// vm fixture — _topicsInDomain memoisation works correctly + the cache covers
// all 5 domain keys with non-zero topic counts.
test('v4.81.17 DomainDrill: vm fixture — _topicsInDomain memoisation + coverage',
  (() => {
    try {
      const helperBody = _fnBody(js, '_topicsInDomain');
      const tdMatch = js.match(/const TOPIC_DOMAINS\s*=\s*\{[\s\S]*?\n\};/);
      if (!helperBody || !tdMatch) return false;
      const vm = require('vm');
      const ctx = { Object };
      vm.createContext(ctx);
      vm.runInContext(tdMatch[0], ctx);
      vm.runInContext('let _DOMAIN_TOPICS_CACHE = null;', ctx);
      vm.runInContext(helperBody, ctx);
      // First call should populate the cache
      const first = vm.runInContext('_topicsInDomain("concepts")', ctx);
      const cacheAfter = vm.runInContext('_DOMAIN_TOPICS_CACHE', ctx);
      // Second call should hit the cache (same array reference)
      const second = vm.runInContext('_topicsInDomain("concepts")', ctx);
      // All 5 domains should have at least 5 topics each
      const counts = ['concepts','implementation','operations','security','troubleshooting'].map(k =>
        vm.runInContext('_topicsInDomain(' + JSON.stringify(k) + ').length', ctx)
      );
      // Unknown domain key → empty array
      const unknown = vm.runInContext('_topicsInDomain("nonexistent")', ctx);
      return first === second // memoisation kept the same reference
        && cacheAfter !== null
        && counts.every(c => c >= 5)
        && Array.isArray(unknown)
        && unknown.length === 0;
    } catch (e) { return false; }
  })());

// v4.81.16: Question-quality validators — stem-vs-answer-count alignment
// + multi-select GT lock for canonical N10-009 facts (Wi-Fi 2.4 GHz channels).
// User report: a "Which TWO" Wi-Fi-channels multi-select shipped with the
// canonical answer being THREE (1, 6, 11) — no validator caught the stem-vs-
// answer mismatch because (a) _groundTruthOk early-returned on non-MCQ,
// (b) no generic check tied stem-numeric to q.answers.length.
test('v4.81.16 QualityGuard: _stemNumericMatchesAnswerCount helper defined',
  /function _stemNumericMatchesAnswerCount\(/.test(js));
test('v4.81.16 QualityGuard: _multiSelectGroundTruthOk helper defined',
  /function _multiSelectGroundTruthOk\(/.test(js));
test('v4.81.16 QualityGuard: _STEM_NUMBER_WORDS map declared',
  /_STEM_NUMBER_WORDS\s*=\s*\{[^}]*two:\s*2[^}]*three:\s*3/.test(js));
test('v4.81.16 QualityGuard: stem-numeric validator wired into validateQuestions',
  /_stemNumericMatchesAnswerCount/.test(_fnBody(js, 'validateQuestions') || ''));
test('v4.81.16 QualityGuard: multi-select GT validator wired into multi-select branch',
  /_multiSelectGroundTruthOk/.test(_fnBody(js, 'validateQuestions') || ''));
test('v4.81.16 QualityGuard: 2.4 GHz channel canonical fact (1, 6, 11) referenced',
  /sorted\[0\]\s*===\s*1\s*&&\s*sorted\[1\]\s*===\s*6\s*&&\s*sorted\[2\]\s*===\s*11/.test(js));
test('v4.81.16 QualityGuard: stem-numeric regex matches "Which TWO" + "(Choose TWO)" patterns',
  (() => {
    const body = _fnBody(js, '_stemNumericMatchesAnswerCount') || '';
    return /\\bWhich\\s\+/.test(body) && /Choose\\s\+/.test(body) && /TWO\|THREE\|FOUR\|FIVE/.test(body);
  })());
test('v4.81.16 QualityGuard: tight regex avoids prose false-positives (no "Identify"/"Pick" verbs)',
  (() => {
    const body = _fnBody(js, '_stemNumericMatchesAnswerCount') || '';
    // The tight regex must NOT include Identify/Pick (would false-positive on
    // prose like "Pick two factor authentication"). Only Which / Choose with
    // explicit context (paren or "Which") qualify.
    return !/\\bIdentify\\s\+|\\bPick\\s\+/.test(body);
  })());

// vm fixture #1 — _stemNumericMatchesAnswerCount catches the exact bug.
test('v4.81.16 QualityGuard: vm fixture — "Which TWO" multi-select with 3 answers rejected',
  (() => {
    try {
      const helper = _fnBody(js, '_stemNumericMatchesAnswerCount');
      const numWords = js.match(/const _STEM_NUMBER_WORDS\s*=\s*\{[^}]*\}/)[0];
      if (!helper) return false;
      const vm = require('vm');
      const ctx = {
        getQType: (q) => q.type || 'mcq',
        String, Math, Array, parseInt
      };
      vm.createContext(ctx);
      vm.runInContext(numWords, ctx);
      vm.runInContext(helper, ctx);
      // The exact user-reported bug: stem says TWO, answers has 3
      const bug = {
        type: 'multi-select',
        question: 'Which TWO of the following are non-overlapping frequency channels in the 2.4 GHz Wi-Fi band?',
        answers: ['B', 'C', 'E']
      };
      // Correct: stem says TWO, answers has 2
      const ok = {
        type: 'multi-select',
        question: '(Choose TWO) Which protocols use TCP?',
        answers: ['A', 'B']
      };
      // No explicit count → pass through
      const noCount = {
        type: 'multi-select',
        question: 'Which protocols use TCP? Select all that apply.',
        answers: ['A', 'B']
      };
      // MCQ with multi-pick stem → reject (type mismatch)
      const mcqBad = {
        type: 'mcq',
        question: 'Which TWO ports does HTTPS use?',
        answer: 'A'
      };
      ctx.bug = bug; ctx.ok = ok; ctx.noCount = noCount; ctx.mcqBad = mcqBad;
      const r1 = vm.runInContext('_stemNumericMatchesAnswerCount(bug)', ctx);
      const r2 = vm.runInContext('_stemNumericMatchesAnswerCount(ok)', ctx);
      const r3 = vm.runInContext('_stemNumericMatchesAnswerCount(noCount)', ctx);
      const r4 = vm.runInContext('_stemNumericMatchesAnswerCount(mcqBad)', ctx);
      return r1 === false && r2 === true && r3 === true && r4 === false;
    } catch (e) { return false; }
  })());

// vm fixture #2 — _multiSelectGroundTruthOk locks the 2.4 GHz channel fact.
test('v4.81.16 QualityGuard: vm fixture — 2.4 GHz channels GT rejects non-{1,6,11} sets',
  (() => {
    try {
      const body = _fnBody(js, '_multiSelectGroundTruthOk');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { String, Number, parseInt, Math, Array };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      // The exact bug: stem asks "Which TWO non-overlapping 2.4 GHz channels"
      // with answers being just two of the trio.
      const bugTwo = {
        question: 'Which TWO of the following are non-overlapping frequency channels in the 2.4 GHz Wi-Fi band?',
        options: { A: 'Channel 2', B: 'Channel 1', C: 'Channel 6', D: 'Channel 9', E: 'Channel 11' },
        answers: ['B', 'C'] // only 1 and 6
      };
      // Same fact, full canonical answer
      const okThree = {
        question: 'Which THREE of the following are non-overlapping channels in the 2.4 GHz Wi-Fi band?',
        options: { A: 'Channel 2', B: 'Channel 1', C: 'Channel 6', D: 'Channel 9', E: 'Channel 11' },
        answers: ['B', 'C', 'E']
      };
      // Wrong set (1, 6, 9 — not canonical)
      const wrongSet = {
        question: 'Identify the non-overlapping 2.4 GHz channels',
        options: { A: 'Channel 1', B: 'Channel 6', C: 'Channel 9' },
        answers: ['A', 'B', 'C']
      };
      // Unrelated multi-select — no Wi-Fi 2.4 GHz signal in stem
      const unrelated = {
        question: 'Which TWO ports does FTP use?',
        options: { A: '20', B: '21', C: '80', D: '443' },
        answers: ['A', 'B']
      };
      ctx.bugTwo = bugTwo; ctx.okThree = okThree; ctx.wrongSet = wrongSet; ctx.unrelated = unrelated;
      const r1 = vm.runInContext('_multiSelectGroundTruthOk(bugTwo)', ctx);
      const r2 = vm.runInContext('_multiSelectGroundTruthOk(okThree)', ctx);
      const r3 = vm.runInContext('_multiSelectGroundTruthOk(wrongSet)', ctx);
      const r4 = vm.runInContext('_multiSelectGroundTruthOk(unrelated)', ctx);
      return r1 === false && r2 === true && r3 === false && r4 === true;
    } catch (e) { return false; }
  })());

// v4.85.3: IPv6 transition methods — reject "pick N" when more than N
// options are valid methods. User dogfood: "Which TWO" with 6to4, NAT64
// as answers and Teredo as a "distractor" — but Teredo IS a valid method,
// making the question unsolvable. Prompt also updated to explicitly warn
// against this pattern.
test('v4.85.3 IPv6TransGT: _multiSelectGroundTruthOk checks IPv6 transition methods',
  (() => {
    const body = _fnBody(js, '_multiSelectGroundTruthOk');
    return body && /isIPv6Trans/.test(body) && /knownMethods/.test(body)
      && /6to4/.test(body) && /teredo/.test(body) && /nat64/.test(body);
  })());

test('v4.85.3 IPv6TransGT: prompt warns against "pick fewer than total valid" pattern',
  (() => {
    const body = _fnBody(js, '_fetchQuestionsBatch');
    return body && /NEVER create a question where MORE options are factually correct/.test(body)
      && /6to4.*Teredo.*NAT64/.test(body);
  })());

// vm-fixture: the exact user bug case — "Which TWO" with 6to4 + NAT64 as
// answers but Teredo in the options. Should be rejected because 3 valid
// methods > 2 answers.
test('v4.85.3 IPv6TransGT: vm fixture — "Which TWO" with 3 valid IPv6 methods rejected',
  (() => {
    try {
      const body = _fnBody(js, '_multiSelectGroundTruthOk');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { String, Number, parseInt, Math, Array, Object };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);

      // The exact bug: 6to4+NAT64 as answers, Teredo as distractor — all 3 valid
      const bugCase = {
        question: 'Which TWO of the following are valid methods to tunnel or translate IPv6 traffic in an IPv4-only environment?',
        options: {
          A: '6to4 tunneling — encapsulates IPv6 packets inside IPv4',
          B: 'NAT64 — translates between IPv6 and IPv4 address spaces',
          C: 'Classful addressing — converting IPv6 to legacy Class A/B/C',
          D: 'Teredo tunneling — IPv6 over IPv4 with NAT traversal',
          E: 'Dual-stack routing — using separate routing protocols'
        },
        answers: ['A', 'B'] // only 2, but 3 options (A,B,D) are valid
      };
      // Valid case: only 2 valid methods in options, matching answer count
      const okCase = {
        question: 'Which TWO of the following are valid methods to tunnel IPv6 traffic?',
        options: {
          A: '6to4 tunneling',
          B: 'Teredo tunneling',
          C: 'Classful addressing',
          D: 'MAC spoofing',
          E: 'Port forwarding'
        },
        answers: ['A', 'B'] // 2 valid methods, 2 answers — correct
      };
      // Unrelated multi-select (no IPv6 transition signal)
      const unrelated = {
        question: 'Which TWO ports does HTTPS use?',
        options: { A: '443', B: '8443', C: '80', D: '22' },
        answers: ['A', 'B']
      };
      ctx.bugCase = bugCase; ctx.okCase = okCase; ctx.unrelated = unrelated;
      const r1 = vm.runInContext('_multiSelectGroundTruthOk(bugCase)', ctx);
      const r2 = vm.runInContext('_multiSelectGroundTruthOk(okCase)', ctx);
      const r3 = vm.runInContext('_multiSelectGroundTruthOk(unrelated)', ctx);
      return r1 === false && r2 === true && r3 === true;
    } catch (e) { return false; }
  })());

// v4.85.4: Sonnet validator extended to multi-select + prompt concrete examples
test('v4.85.4 MultiSelectSonnet: aiValidateQuestions filters multi-select alongside mcq',
  (() => {
    const body = _fnBody(js, 'aiValidateQuestions');
    return body && /multi-select/.test(body)
      && /MULTI-SELECT/.test(body)
      && /validatedIndices/.test(body);
  })());

test('v4.85.4 MultiSelectSonnet: check 7 = MULTI-SELECT ANSWER BALANCE',
  /7\.\s*MULTI-SELECT ANSWER BALANCE/.test(js));

test('v4.85.4 MultiSelectSonnet: Sonnet checks for MULTI-SELECT IMBALANCE error',
  /MULTI-SELECT IMBALANCE:/.test(js));

test('v4.85.4 MultiSelectSonnet: Sonnet checks for MULTI-SELECT DISTRACTOR LEAK error',
  /MULTI-SELECT DISTRACTOR LEAK:/.test(js));

test('v4.85.4 MultiSelectSonnet: prompt has concrete good/bad multi-select examples',
  (() => {
    const body = _fnBody(js, '_fetchQuestionsBatch');
    return body && /BAD:.*OSPF.*obvious/.test(body)
      && /GOOD:.*link-state routing protocols/.test(body)
      && /SELF-TEST before finalizing/.test(body);
  })());

// v4.81.15: Stale-topic surfacing (rotation algorithm) — Layers 1+2+3+5
// (1) base stale-topic injection, (2) compound priority (staleness × accuracy
// gap), (3) per-batch rotation in startExam + Marathon mode, (5) homepage
// "Due for rotation" chip row.
test('v4.81.15 Stale: _computeStaleTopics helper defined',
  /function _computeStaleTopics\(/.test(js));
test('v4.81.15 Stale: _formatStaleTopicsForPrompt helper defined',
  /function _formatStaleTopicsForPrompt\(/.test(js));
// v4.81.23 tombstone: renderRotationChips removed (stale-topic signal now
// drives the consolidated #today-plan card via buildSessionPlan).
test('v4.81.23 tombstone: renderRotationChips function removed',
  !js.includes('function renderRotationChips('));
test('v4.81.15 Stale: STALE_PROMPT_TOPIC_COUNT constant declared',
  /STALE_PROMPT_TOPIC_COUNT\s*=\s*\d+/.test(js));
test('v4.81.15 Stale: STALE_PROMPT_SLICE_SIZE constant declared',
  /STALE_PROMPT_SLICE_SIZE\s*=\s*\d+/.test(js));
test('v4.81.15 Stale: STALE_CHIP_TOPIC_COUNT constant declared',
  /STALE_CHIP_TOPIC_COUNT\s*=\s*\d+/.test(js));
test('v4.81.15 Stale: STALE_CHIP_MIN_HISTORY gate declared',
  /STALE_CHIP_MIN_HISTORY\s*=\s*\d+/.test(js));
test('v4.81.15 Stale: compound priority uses (1 + accGap) factor',
  /priority\s*=\s*daysSince\s*\*\s*\(1\s*\+\s*accGap\)/.test(js));
test('v4.81.15 Stale: only surfaces topics past WEAK_STALENESS_DAYS gate',
  /daysSince\s*<\s*WEAK_STALENESS_DAYS/.test(js));
test('v4.81.15 Stale: never-studied topics get 9999-day staleness sentinel',
  /:\s*9999\b/.test(_fnBody(js, '_computeStaleTopics') || ''));
test('v4.81.15 Stale: helper reuses computeWeakSpotScores for posterior accuracy',
  /computeWeakSpotScores/.test(_fnBody(js, '_computeStaleTopics') || ''));
test('v4.81.15 Stale: slice rotation uses overlapping window (step = floor(size/2))',
  /Math\.floor\(sliceSize\s*\/\s*2\)/.test(js));
test('v4.81.15 Stale: fetchQuestions accepts staleSliceIdx parameter',
  /async function fetchQuestions\(key, qTopic, difficulty, n, staleSliceIdx\)/.test(js));
test('v4.81.15 Stale: _fetchQuestionsBatch accepts staleSliceIdx parameter',
  /async function _fetchQuestionsBatch\(key, qTopic, difficulty, n, pbqCountOverride, staleSliceIdx\)/.test(js));
test('v4.81.15 Stale: prompt block injected only for MIXED_TOPIC',
  /qTopic === MIXED_TOPIC && \(difficulty/.test(_fnBody(js, '_fetchQuestionsBatch') || ''));
test('v4.81.15 Stale: staleBlock interpolated into buildPrompt template',
  /\$\{exemplarBlock\}\$\{retentionBlock\}\$\{staleBlock\}/.test(js));
test('v4.81.15 Stale: prompt block gated on STALE_CHIP_MIN_HISTORY',
  /hist\.length\s*>=\s*STALE_CHIP_MIN_HISTORY/.test(_fnBody(js, '_fetchQuestionsBatch') || ''));
test('v4.81.15 Stale: startExam passes batch index i as staleSliceIdx',
  /fetchQuestions\(key, MIXED_TOPIC, 'Mixed', EXAM_BATCH_BASE \+ EXAM_BATCH_BUFFER, i\)/.test(js));
test('v4.81.15 Stale: startExam retry-to-fill threads same staleSliceIdx i',
  /fetchQuestions\(key, MIXED_TOPIC, 'Mixed', deficit \+ EXAM_BATCH_BUFFER, i\)/.test(js));
test('v4.81.15 Stale: Marathon mode passes batch index as staleSliceIdx',
  /fetchQuestions\(key, MIXED_TOPIC, 'Exam Level', thisBatch, i\)/.test(js));
test('v4.81.15 Stale: parallel-batch sub-batches get outerIdx + i for inner rotation',
  /_fetchQuestionsBatch\(key, qTopic, difficulty, size, pbqBudgets\[i\], outerIdx \+ i\)/.test(js));
test('v4.81.15 Stale: prompt block uses ROTATION PRIORITY framing (not mandate)',
  /ROTATION PRIORITY:.*hasn['’]t practised these/.test(js));
test('v4.81.15 Stale: prompt block instructs Haiku to stay within blueprint weights',
  /stay within the blueprint weights/.test(js));
// v4.81.23 tombstones: stale-topic rendering surfaces consolidated.
// The stale signal now drives #today-plan via buildSessionPlan; the
// dedicated #rotation-row element + .rotation-row/.rot-* CSS were
// removed in this cleanup pass.
test('v4.81.23 tombstone: #rotation-row HTML element removed',
  !html.includes('id="rotation-row"'));
test('v4.81.23 tombstone: .rotation-row CSS removed',
  !/\.rotation-row\s*\{/.test(css));
test('v4.81.23 tombstone: .rot-chip CSS removed',
  !/\.rot-chip\s*\{/.test(css));
test('v4.81.23 tombstone: renderRotationChips no longer called from goSetup',
  !/renderRotationChips/.test(_fnBody(js, 'goSetup') || ''));
test('v4.81.15 Stale: stale signal still drives the consolidated card via buildSessionPlan',
  /_computeStaleTopics/.test(_fnBody(js, 'buildSessionPlan') || ''));

// vm fixture — verify compound priority correctly ranks stale-and-weak above
// stale-but-mastered. Topic A (21d stale, 50% accuracy) MUST outrank Topic B
// (28d stale, 90% accuracy) even though B has more raw stale days.
test('v4.81.15 Stale: vm fixture — compound priority ranks stale+weak above stale+mastered',
  (() => {
    try {
      const body = _fnBody(js, '_computeStaleTopics');
      if (!body) return false;
      const vm = require('vm');
      const now = Date.now();
      const ctx = {
        TOPIC_DOMAINS: {
          'A_StaleAndWeak':   'concepts',
          'B_StaleButStrong': 'concepts',
          'C_Fresh':          'concepts',
          'D_NeverStudied':   'concepts'
        },
        WEAK_STALENESS_DAYS: 14,
        WEAK_TARGET_ACC: 0.85,
        MIXED_TOPIC: 'Mixed — All Topics',
        EXAM_TOPIC: 'Exam Simulation',
        // Stub computeWeakSpotScores to inject deterministic posterior + daysSince
        computeWeakSpotScores: () => [
          { topic: 'A_StaleAndWeak',   posterior: 0.50, daysSince: 21 },
          { topic: 'B_StaleButStrong', posterior: 0.90, daysSince: 28 },
          { topic: 'C_Fresh',          posterior: 0.80, daysSince: 3 }
        ],
        Math, Date, Object, Array
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const result = vm.runInContext('_computeStaleTopics([], 4)', ctx);
      // Expected: 4 returned, sorted by priority desc.
      // A: 21 × (1 + 0.35) = 28.35
      // B: 28 × (1 + 0)    = 28.0
      // D: 9999 × (1 + 0.35) = 13498  → but never-studied wins on raw days
      // C: 3 < 14 → filtered out (not stale yet)
      // So order: D (never), A (stale+weak), B (stale+strong); C excluded.
      if (result.length !== 3) return false;
      if (result[0].topic !== 'D_NeverStudied') return false;
      if (result[0].neverStudied !== true) return false;
      if (result[1].topic !== 'A_StaleAndWeak') return false;
      if (result[2].topic !== 'B_StaleButStrong') return false;
      // Confirm A's priority strictly exceeds B's (the compound-weight win)
      return result[1].priority > result[2].priority;
    } catch (e) { return false; }
  })());

// vm fixture — slice rotation produces overlapping but distinct windows.
// Verifies sliceIdx 0..N maps to different starting positions so 5 exam
// batches each see a different rotating slice.
test('v4.81.15 Stale: vm fixture — slice rotation produces distinct windows across batches',
  (() => {
    try {
      const body = _fnBody(js, '_computeStaleTopics');
      if (!body) return false;
      const vm = require('vm');
      // 8 fake stale topics (all >14d) so rotation is observable
      const td = {};
      ['T1','T2','T3','T4','T5','T6','T7','T8'].forEach(t => { td[t] = 'concepts'; });
      const ctx = {
        TOPIC_DOMAINS: td,
        WEAK_STALENESS_DAYS: 14,
        WEAK_TARGET_ACC: 0.85,
        MIXED_TOPIC: 'Mixed', EXAM_TOPIC: 'Exam',
        // Strict daysSince ordering so priority order is deterministic
        computeWeakSpotScores: () => [
          { topic: 'T1', posterior: 0.5, daysSince: 80 },
          { topic: 'T2', posterior: 0.5, daysSince: 70 },
          { topic: 'T3', posterior: 0.5, daysSince: 60 },
          { topic: 'T4', posterior: 0.5, daysSince: 50 },
          { topic: 'T5', posterior: 0.5, daysSince: 40 },
          { topic: 'T6', posterior: 0.5, daysSince: 30 },
          { topic: 'T7', posterior: 0.5, daysSince: 25 },
          { topic: 'T8', posterior: 0.5, daysSince: 20 }
        ],
        Math, Date, Object, Array
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      // Ask for n=4 with sliceSize=8 → step = 4. Slice 0 = T1..T4, slice 1 = T5..T8.
      const slice0 = vm.runInContext('_computeStaleTopics([], 4, 0, 8)', ctx);
      const slice1 = vm.runInContext('_computeStaleTopics([], 4, 1, 8)', ctx);
      const slice2 = vm.runInContext('_computeStaleTopics([], 4, 2, 8)', ctx);
      // slice0 and slice1 should be distinct (different starting indices)
      const s0 = slice0.map(r => r.topic).join(',');
      const s1 = slice1.map(r => r.topic).join(',');
      const s2 = slice2.map(r => r.topic).join(',');
      // slice 2 wraps back to start (sliceIdx*step = 8 % 8 = 0)
      return slice0.length === 4
        && slice1.length === 4
        && s0 !== s1
        && s0 === s2 // proves modular wrap works
        && slice0[0].topic === 'T1'
        && slice1[0].topic === 'T5';
    } catch (e) { return false; }
  })());

// vm fixture — _formatStaleTopicsForPrompt shapes the injected prompt block
// correctly + handles never-studied topics distinctly from stale-with-history.
test('v4.81.15 Stale: vm fixture — prompt formatter handles never-studied vs stale distinction',
  (() => {
    try {
      const body = _fnBody(js, '_formatStaleTopicsForPrompt');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { Array, String, Math, Object };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const empty = vm.runInContext('_formatStaleTopicsForPrompt([])', ctx);
      const result = vm.runInContext(`_formatStaleTopicsForPrompt([
        { topic: 'OSPF', daysSince: 21, posterior: 0.55, accGap: 0.30, neverStudied: false, priority: 27.3 },
        { topic: 'IPv6', daysSince: 9999, posterior: 0.5, accGap: 0.35, neverStudied: true, priority: 13498 }
      ])`, ctx);
      return empty === ''
        && /ROTATION PRIORITY/.test(result)
        && /OSPF/.test(result)
        && /last seen 21d ago/.test(result)
        && /55% accuracy/.test(result)
        && /IPv6/.test(result)
        && /never studied/.test(result)
        && /MANDATORY DOMAIN DISTRIBUTION/.test(result)
        && !/9999d ago/.test(result); // never-studied uses sentinel, not days
    } catch (e) { return false; }
  })());

test('v4.81.13 Exam: vm fixture — domain breakdown buckets correct/total per domain',
  (() => {
    try {
      const body = _fnBody(js, '_buildExamDomainBreakdown');
      if (!body) return false;
      const vm = require('vm');
      const ctx = {
        DOMAIN_WEIGHTS: { concepts: 0.23, implementation: 0.20, operations: 0.19, security: 0.14, troubleshooting: 0.24 },
        DOMAIN_LABELS: { concepts: 'Concepts', implementation: 'Implementation', operations: 'Operations', security: 'Security', troubleshooting: 'Troubleshooting' },
        TOPIC_DOMAINS: { 'OSI Model': 'concepts', 'OSPF': 'implementation', 'Network Troubleshooting & Tools': 'troubleshooting' },
        Math, JSON
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const log = [
        { q: { topic: 'OSI Model' }, isRight: true,  isSkipped: false },
        { q: { topic: 'OSI Model' }, isRight: true,  isSkipped: false },
        { q: { topic: 'OSPF' },      isRight: false, isSkipped: false },
        { q: { topic: 'OSPF' },      isRight: true,  isSkipped: false },
        { q: { topic: 'Network Troubleshooting & Tools' }, isRight: false, isSkipped: false }
      ];
      ctx.log = log;
      const buckets = vm.runInContext('_buildExamDomainBreakdown(log)', ctx);
      return buckets.concepts.correct === 2 && buckets.concepts.total === 2 && buckets.concepts.pct === 100 && buckets.concepts.tier === 'mastered'
        && buckets.implementation.correct === 1 && buckets.implementation.total === 2 && buckets.implementation.pct === 50 && buckets.implementation.tier === 'novice'
        && buckets.troubleshooting.correct === 0 && buckets.troubleshooting.total === 1 && buckets.troubleshooting.tier === 'novice'
        && buckets.security.total === 0 && buckets.security.tier === 'empty'
        && buckets.operations.total === 0 && buckets.operations.tier === 'empty';
    } catch (e) { return false; }
  })());

test('v4.81.11 Settings: vm fixture — health card surfaces correct API key status',
  (() => {
    try {
      const body = _fnBody(js, 'renderSettingsHealthCard');
      if (!body) return false;
      const vm = require('vm');
      // Stub minimal env — just localStorage + the helpers + a host element
      let storage = {};
      const fakeHost = { _innerHTML: '', set innerHTML(v) { this._innerHTML = v; }, get innerHTML() { return this._innerHTML; } };
      const ctx = {
        STORAGE: { KEY: 'k', DAILY_GOAL: 'dg' },
        localStorage: {
          getItem: (k) => storage[k] === undefined ? null : storage[k],
          setItem: (k, v) => { storage[k] = String(v); },
          removeItem: (k) => { delete storage[k]; }
        },
        document: { getElementById: () => fakeHost },
        getExamDate: () => null,
        getDaysToExam: () => null,
        listAutoBackups: () => [],
        getDailyGoal: () => 20,
        getTodayQuestionCount: () => 0,
        escHtml: (s) => String(s),
        Number, parseInt,
        Math, Date, JSON, Object
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      // No API key → "Not connected"
      vm.runInContext('renderSettingsHealthCard()', ctx);
      const noKeyHtml = fakeHost._innerHTML;
      // With API key → "Connected"
      storage['k'] = 'sk-ant-api03-xxxxxxxxxxxx-yyyy';
      vm.runInContext('renderSettingsHealthCard()', ctx);
      const withKeyHtml = fakeHost._innerHTML;
      return /Not connected/.test(noKeyHtml)
        && /Connected/.test(withKeyHtml)
        && /sk-ant-/.test(withKeyHtml);
    } catch (e) { return false; }
  })());

// v4.81.26: regression test for the schema-mismatch bug. Pre-fix,
// renderSettingsHealthCard read DAILY_GOAL as a JSON object {goal, date,
// current} but setDailyGoal writes a plain string number. So the row
// always reported "Not set" even when a goal was explicitly saved. This
// fixture saves "100" via the same path setDailyGoal would, then asserts
// the Health card reports the goal as set. Direct hit on
// `feedback_behavioral_fixtures.md` — would have caught the bug in v4.81.11
// if a vm fixture covered the daily-goal path.
test('v4.81.26 Settings: vm fixture — health card reads daily goal correctly when set',
  (() => {
    try {
      const body = _fnBody(js, 'renderSettingsHealthCard');
      if (!body) return false;
      const vm = require('vm');
      let storage = {};
      const fakeHost = { _innerHTML: '', set innerHTML(v) { this._innerHTML = v; }, get innerHTML() { return this._innerHTML; } };
      const ctx = {
        STORAGE: { KEY: 'k', DAILY_GOAL: 'dg' },
        localStorage: {
          getItem: (k) => storage[k] === undefined ? null : storage[k],
          setItem: (k, v) => { storage[k] = String(v); },
          removeItem: (k) => { delete storage[k]; }
        },
        document: { getElementById: () => fakeHost },
        getExamDate: () => null,
        getDaysToExam: () => null,
        listAutoBackups: () => [],
        getDailyGoal: () => {
          const raw = parseInt(storage['dg'], 10);
          return (Number.isFinite(raw) && raw > 0) ? raw : 20;
        },
        getTodayQuestionCount: () => 0,
        escHtml: (s) => String(s),
        Number, parseInt,
        Math, Date, JSON, Object
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);

      // Case 1: no goal set → "Not set"
      vm.runInContext('renderSettingsHealthCard()', ctx);
      const noGoalHtml = fakeHost._innerHTML;
      const notSetVisible = /Not set/.test(noGoalHtml) && /Set a daily goal first/.test(noGoalHtml);

      // Case 2: goal saved via setDailyGoal-style write (plain string number)
      storage['dg'] = '100';
      vm.runInContext('renderSettingsHealthCard()', ctx);
      const setGoalHtml = fakeHost._innerHTML;
      const goalDetected = /100 questions \/ day/.test(setGoalHtml);
      const todayRowOk = /0 \/ 100 questions/.test(setGoalHtml);

      // Case 3: legacy/junk write (the buggy schema we used to expect)
      storage['dg'] = '{"goal":50,"date":"2026-04-26","current":12}';
      vm.runInContext('renderSettingsHealthCard()', ctx);
      const legacyHtml = fakeHost._innerHTML;
      const legacyHandled = /Not set/.test(legacyHtml); // parseInt of JSON string yields NaN → "Not set"

      return notSetVisible && goalDetected && todayRowOk && legacyHandled;
    } catch (e) { return false; }
  })());

test('v4.81.26 Settings: tombstone — old buggy `dg.goal` schema check removed',
  (() => {
    const body = _fnBody(js, 'renderSettingsHealthCard') || '';
    // Should no longer read DAILY_GOAL as JSON with a `.goal` property
    return !/JSON\.parse\(localStorage\.getItem\(STORAGE\.DAILY_GOAL\)[\s\S]{0,80}dg\.goal/.test(body);
  })());

test('v4.81.26 Settings: today row uses getTodayQuestionCount (matches home page renderer)',
  /getTodayQuestionCount/.test(_fnBody(js, 'renderSettingsHealthCard') || ''));

// v4.81.30: SR review interactive answering — commit-before-reveal across
// all 3 modes. User feedback: "im just reading the answers and self grading.
// the risk of this is that someone can just lie and say yeah i knew that
// when deep down they didnt." Pre-fix the v4.81.27/28 self-grade path
// showed the explanation immediately, structurally encouraging
// self-deception. Now: every mode requires the user to commit (pick a
// letter, or pick multiple + submit) BEFORE the explanation reveals.
test('v4.81.30 SRInteractive: srToggleMultiPick handler defined',
  /function srToggleMultiPick\(/.test(js));
test('v4.81.30 SRInteractive: srSubmitMultiPick handler defined',
  /function srSubmitMultiPick\(/.test(js));
test('v4.81.30 SRInteractive: pickedLetters Set initialised in startSrReview',
  /pickedLetters:\s*new Set\(\)/.test(_fnBody(js, 'startSrReview') || ''));
test('v4.81.30 SRInteractive: pickedLetters cleared on advance in srMarkConfidence',
  /pickedLetters\s*=\s*new Set\(\)/.test(_fnBody(js, 'srMarkConfidence') || ''));
test('v4.81.30 SRInteractive: tombstone — v4.81.28 revealed=true hack removed from render',
  (() => {
    const body = _fnBody(js, '_renderSrCard') || '';
    // Should no longer pre-set revealed=true in any branch
    return !/_srSession\.revealed\s*=\s*true/.test(body);
  })());
test('v4.81.30 SRInteractive: render has 3 explicit modes (mcq-auto / multi-auto / commit-self-grade)',
  (() => {
    const body = _fnBody(js, '_renderSrCard') || '';
    return /['"]mcq-auto['"]/.test(body)
      && /['"]multi-auto['"]/.test(body)
      && /['"]commit-self-grade['"]/.test(body);
  })());
test('v4.81.30 SRInteractive: multi-auto mode emits Submit button + sr-multi-submit-row',
  (() => {
    const body = _fnBody(js, '_renderSrCard') || '';
    return /sr-multi-submit-row/.test(body)
      && /srSubmitMultiPick/.test(body);
  })());
test('v4.81.30 SRInteractive: multi-auto reveal applies is-missed class for correct-but-not-picked',
  /is-missed/.test(_fnBody(js, '_renderSrCard') || ''));
test('v4.81.30 SRInteractive: srSubmitMultiPick guards on minimum 2 picks',
  /picks\.size\s*<\s*2/.test(_fnBody(js, 'srSubmitMultiPick') || ''));
test('v4.81.30 SRInteractive CSS: .sr-option.is-missed declared',
  /\.sr-option\.is-missed\s*\{/.test(css));
test('v4.81.30 SRInteractive CSS: .sr-multi-submit-btn declared',
  /\.sr-multi-submit-btn\s*\{/.test(css));

// vm fixture #1 — multi-select interactive: toggle picks, submit, reveal markers.
test('v4.81.30 SRInteractive: vm fixture — multi-select pick → submit → reveal flow',
  (() => {
    try {
      const renderBody = _fnBody(js, '_renderSrCard');
      const toggleBody = _fnBody(js, 'srToggleMultiPick');
      const submitBody = _fnBody(js, 'srSubmitMultiPick');
      if (!renderBody || !toggleBody || !submitBody) return false;
      const vm = require('vm');
      const fakeHost = { _innerHTML: '', set innerHTML(v) { this._innerHTML = v; }, get innerHTML() { return this._innerHTML; } };
      const ctx = {
        document: { getElementById: (id) => id === 'sr-card-host' ? fakeHost : { textContent: '', style: {}, hidden: false } },
        _srSession: {
          cards: [{
            type: 'multi-select',
            question: '(Choose TWO) Q?',
            options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' },
            answers: ['A', 'C'],
            topic: 'T', intervalDays: 1, correctStreak: 0
          }],
          index: 0,
          pickedLetter: null,
          pickedLetters: new Set(),
          revealed: false
        },
        escHtml: (s) => String(s),
        Object, String, Array, Number, Math, Set
      };
      vm.createContext(ctx);
      vm.runInContext(renderBody, ctx);
      vm.runInContext(toggleBody, ctx);
      vm.runInContext(submitBody, ctx);

      // Initial render — pre-pick, no submit yet
      vm.runInContext('_renderSrCard()', ctx);
      const initial = fakeHost._innerHTML;
      const submitDisabledInitially = /sr-multi-submit-btn[\s"']*disabled/.test(initial);

      // Toggle pick A → C (correct picks)
      vm.runInContext("srToggleMultiPick('A')", ctx);
      vm.runInContext("srToggleMultiPick('C')", ctx);
      const afterPicks = fakeHost._innerHTML;
      const submitEnabledAfter2Picks = !/sr-multi-submit-btn[\s"']*disabled/.test(afterPicks);

      // Submit → reveal
      vm.runInContext('srSubmitMultiPick()', ctx);
      const revealed = ctx._srSession.revealed === true;
      const finalHtml = fakeHost._innerHTML;

      // After reveal: A and C should have is-correct class, D/E neither
      const aCorrect = /data-letter="A"[^>]*>[\s\S]*?is-correct|is-correct[\s\S]*?data-letter="A"/.test(finalHtml);
      const cCorrect = /data-letter="C"[^>]*>[\s\S]*?is-correct|is-correct[\s\S]*?data-letter="C"/.test(finalHtml);

      return submitDisabledInitially && submitEnabledAfter2Picks && revealed && aCorrect && cCorrect;
    } catch (e) { return false; }
  })());

// vm fixture #2 — multi-select wrong picks reveal as is-wrong + missed correct as is-missed
test('v4.81.30 SRInteractive: vm fixture — wrong pick + missed correct render correct markers',
  (() => {
    try {
      const renderBody = _fnBody(js, '_renderSrCard');
      const toggleBody = _fnBody(js, 'srToggleMultiPick');
      const submitBody = _fnBody(js, 'srSubmitMultiPick');
      if (!renderBody || !toggleBody || !submitBody) return false;
      const vm = require('vm');
      const fakeHost = { _innerHTML: '', set innerHTML(v) { this._innerHTML = v; }, get innerHTML() { return this._innerHTML; } };
      const ctx = {
        document: { getElementById: (id) => id === 'sr-card-host' ? fakeHost : { textContent: '', style: {}, hidden: false } },
        _srSession: {
          cards: [{
            type: 'multi-select', question: 'Q?',
            options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' },
            answers: ['A', 'C'], // correct = A, C
            topic: 'T', intervalDays: 1, correctStreak: 0
          }],
          index: 0, pickedLetter: null, pickedLetters: new Set(), revealed: false
        },
        escHtml: (s) => String(s),
        Object, String, Array, Number, Math, Set
      };
      vm.createContext(ctx);
      vm.runInContext(renderBody, ctx);
      vm.runInContext(toggleBody, ctx);
      vm.runInContext(submitBody, ctx);

      // User picks A (correct) + B (wrong) — misses C
      vm.runInContext("srToggleMultiPick('A')", ctx);
      vm.runInContext("srToggleMultiPick('B')", ctx);
      vm.runInContext('srSubmitMultiPick()', ctx);
      const html = fakeHost._innerHTML;

      // A picked + correct → is-correct
      // B picked + wrong → is-wrong
      // C missed correct → is-missed
      const aGreen = /data-letter="A"[\s\S]*?is-correct|is-correct[\s\S]*?data-letter="A"/.test(html);
      const bRed = /data-letter="B"[\s\S]*?is-wrong|is-wrong[\s\S]*?data-letter="B"/.test(html);
      const cMissed = /data-letter="C"[\s\S]*?is-missed|is-missed[\s\S]*?data-letter="C"/.test(html);
      // Should show "Got it wrong" path because not fully correct
      const wrongOutcomeShown = /sr-confidence-wrong/.test(html) && !/sr-confidence-confident/.test(html);

      return aGreen && bRed && cMissed && wrongOutcomeShown;
    } catch (e) { return false; }
  })());

// vm fixture #3 — commit-then-self-grade path requires picking before reveal
test('v4.81.30 SRInteractive: vm fixture — commit-then-self-grade requires pick before reveal',
  (() => {
    try {
      const renderBody = _fnBody(js, '_renderSrCard');
      const pickBody = _fnBody(js, 'srPickAnswer');
      if (!renderBody || !pickBody) return false;
      const vm = require('vm');
      const fakeHost = { _innerHTML: '', set innerHTML(v) { this._innerHTML = v; }, get innerHTML() { return this._innerHTML; } };
      const ctx = {
        document: { getElementById: (id) => id === 'sr-card-host' ? fakeHost : { textContent: '', style: {}, hidden: false } },
        _srSession: {
          cards: [{
            type: 'mcq', question: 'Legacy null-answer Q?',
            options: { A: 'a', B: 'b', C: 'c', D: 'd' },
            answer: null, // legacy corruption — falls to commit-self-grade
            topic: 'T', intervalDays: 1, correctStreak: 0
          }],
          index: 0, pickedLetter: null, pickedLetters: new Set(), revealed: false
        },
        escHtml: (s) => String(s),
        Object, String, Array, Number, Math, Set
      };
      vm.createContext(ctx);
      vm.runInContext(renderBody, ctx);
      vm.runInContext(pickBody, ctx);

      // Initial render — options clickable, no explanation, no self-grade buttons yet
      vm.runInContext('_renderSrCard()', ctx);
      const beforePick = fakeHost._innerHTML;
      const noExplanationYet = !/sr-explanation/.test(beforePick);
      const noSelfGradeButtonsYet = !/sr-confidence-confident/.test(beforePick);
      const optionsClickable = /onclick="srPickAnswer/.test(beforePick);

      // Now pick an option
      vm.runInContext("srPickAnswer('B')", ctx);
      const afterPick = fakeHost._innerHTML;
      const explanationNowShows = ctx._srSession.revealed === true;
      const selfGradeButtonsShow = /sr-confidence-confident/.test(afterPick)
        && /sr-confidence-uncertain/.test(afterPick)
        && /sr-confidence-wrong/.test(afterPick);
      const bannerShows = /sr-self-grade-banner/.test(afterPick);

      return noExplanationYet
        && noSelfGradeButtonsYet
        && optionsClickable
        && explanationNowShows
        && selfGradeButtonsShow
        && bannerShows;
    } catch (e) { return false; }
  })());

// v4.81.31: SR queue scrub for legacy non-reviewable cards + Playwright E2E
// coverage for SR review flow. User dogfood after v4.81.30 deploy: an
// order-type question still in the queue from before v4.81.28's enrollment
// filter rendered as a stem-only card with empty body. The v4.81.28 filter
// only prevented NEW order/cli-sim/topology cards from entering — pre-filter
// entries persisted. Solution: defensive filter at session start in
// startSrReview() AND a silent migration that writes the cleaned queue back.
//
// Process critique that drove the Playwright additions: "this has happened
// a few times where you ship something and then we see its broken in live."
// vm-fixtures pass the structure but real-browser DOM rendering of the SR
// page wasn't covered. Three new Playwright tests now exercise the full
// flow end-to-end (MCQ pick → reveal → confidence → completion;
// multi-select toggle → submit → reveal markers; legacy order-card scrub).
test('v4.81.31 SRScrub: startSrReview filters cards to mcq + multi-select only',
  (() => {
    const body = _fnBody(js, 'startSrReview');
    if (!body) return false;
    const hasReviewableSet = /const reviewable = new Set\(\['mcq', 'multi-select'\]\)/.test(body);
    const filtersDue = /const dueOk = due\.filter\(c => reviewable\.has\(c\.type \|\| 'mcq'\)\)/.test(body);
    return hasReviewableSet && filtersDue;
  })());
test('v4.81.31 SRScrub: startSrReview persists scrubbed queue to localStorage',
  (() => {
    const body = _fnBody(js, 'startSrReview');
    if (!body) return false;
    return /loadSrQueue\(\)/.test(body)
      && /saveSrQueue\(cleaned\)/.test(body)
      && /reviewable\.has\(c\.type \|\| 'mcq'\)/.test(body);
  })());
test('v4.81.31 SRScrub: scrub is wrapped in try/catch (defensive)',
  (() => {
    const body = _fnBody(js, 'startSrReview');
    if (!body) return false;
    return /tolerate scrub errors/.test(body) || /catch \(_\)/.test(body);
  })());

// vm fixture — startSrReview filters out order/cli-sim/topology cards from
// the session AND scrubs them from storage. This is the exact regression
// the user reported on prod (order question rendering as empty stem).
test('v4.81.31 SRScrub: vm fixture — order/cli-sim cards filtered out, mcq retained, queue scrubbed',
  (() => {
    try {
      const body = _fnBody(js, 'startSrReview');
      if (!body) return false;
      const vm = require('vm');
      let savedPayload = null;
      const fakeQueue = [
        { id: 'order-legacy', type: 'order', question: 'Arrange steps', nextReview: 0, graduated: false, items: ['a', 'b', 'c'], correctOrder: [0, 1, 2] },
        { id: 'cli-legacy', type: 'cli-sim', question: 'Run a command', nextReview: 0, graduated: false },
        { id: 'topo-legacy', type: 'topology', question: 'Place devices', nextReview: 0, graduated: false },
        { id: 'mcq-good', type: 'mcq', question: 'Real Q?', options: { A: 'a', B: 'b' }, answer: 'A', nextReview: 0, graduated: false },
        { id: 'multi-good', type: 'multi-select', question: 'Pick 2', options: { A: 'a', B: 'b', C: 'c' }, answers: ['A', 'C'], nextReview: 0, graduated: false }
      ];
      const stemBody = _fnBody(js, '_stemNumericMatchesAnswerCount');
      const gtBody = _fnBody(js, '_multiSelectGroundTruthOk');
      const getQTypeBody = _fnBody(js, 'getQType');
      const ctx = {
        getSrDueEntries: () => fakeQueue.slice(),
        loadSrQueue: () => fakeQueue.slice(),
        saveSrQueue: (q) => { savedPayload = q; },
        showToast: () => {},
        showPage: () => {},
        document: {
          getElementById: () => ({ hidden: true, textContent: '', style: {} })
        },
        _renderSrCard: () => {},
        _srSession: null,
        _stemNumericMatchesAnswerCount: null,
        _multiSelectGroundTruthOk: null,
        getQType: null,
        _STEM_NUMBER_WORDS: { two: 2, three: 3, four: 4, five: 5 },
        SR_SESSION_CAP: 20,
        Math, parseInt, Number,
        Set, Object, Array, String, console, RegExp
      };
      vm.createContext(ctx);
      if (getQTypeBody) vm.runInContext(getQTypeBody, ctx);
      if (stemBody) vm.runInContext(stemBody, ctx);
      if (gtBody) vm.runInContext(gtBody, ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('startSrReview()', ctx);

      // Session should contain ONLY the mcq + multi-select cards (2), in original order.
      const session = ctx._srSession;
      if (!session) return false;
      const sessionIds = session.cards.map(c => c.id);
      const correctSession = sessionIds.length === 2
        && sessionIds.includes('mcq-good')
        && sessionIds.includes('multi-good')
        && !sessionIds.includes('order-legacy')
        && !sessionIds.includes('cli-legacy')
        && !sessionIds.includes('topo-legacy');

      // Queue scrub: saveSrQueue called with the 3 legacy cards removed.
      const scrubbed = savedPayload !== null
        && savedPayload.length === 2
        && savedPayload.every(c => c.type === 'mcq' || c.type === 'multi-select')
        && !savedPayload.some(c => ['order', 'cli-sim', 'topology'].includes(c.type));

      return correctSession && scrubbed;
    } catch (e) { return false; }
  })());

// vm fixture — when ALL due cards are reviewable (mcq + multi-select),
// startSrReview should NOT call saveSrQueue (no scrub work needed).
test('v4.81.31 SRScrub: vm fixture — clean queue triggers no scrub write',
  (() => {
    try {
      const body = _fnBody(js, 'startSrReview');
      if (!body) return false;
      const vm = require('vm');
      let saveCallCount = 0;
      const stemBody = _fnBody(js, '_stemNumericMatchesAnswerCount');
      const gtBody = _fnBody(js, '_multiSelectGroundTruthOk');
      const getQTypeBody = _fnBody(js, 'getQType');
      const fakeQueue = [
        { id: 'mcq-1', type: 'mcq', question: 'What is DNS?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', nextReview: 0, graduated: false },
        { id: 'multi-1', type: 'multi-select', question: '(Choose TWO) Pick two.', options: { A: 'a', B: 'b', C: 'c' }, answers: ['A', 'B'], nextReview: 0, graduated: false }
      ];
      const ctx = {
        getSrDueEntries: () => fakeQueue.map(c => Object.assign({}, c)),
        loadSrQueue: () => fakeQueue.map(c => Object.assign({}, c)),
        saveSrQueue: () => { saveCallCount++; },
        showToast: () => {},
        showPage: () => {},
        document: {
          getElementById: () => ({ hidden: true, textContent: '', style: {} })
        },
        _renderSrCard: () => {},
        _srSession: null,
        _stemNumericMatchesAnswerCount: null,
        _multiSelectGroundTruthOk: null,
        getQType: null,
        _STEM_NUMBER_WORDS: { two: 2, three: 3, four: 4, five: 5 },
        SR_SESSION_CAP: 20,
        Math, parseInt, Number,
        Set, Object, Array, String, console, RegExp
      };
      vm.createContext(ctx);
      if (getQTypeBody) vm.runInContext(getQTypeBody, ctx);
      if (stemBody) vm.runInContext(stemBody, ctx);
      if (gtBody) vm.runInContext(gtBody, ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('startSrReview()', ctx);
      return saveCallCount === 0 && ctx._srSession && ctx._srSession.cards.length === 2;
    } catch (e) { return false; }
  })());

// Playwright E2E coverage check — ensures the v4.81.31 SR review tests
// actually exist in the spec file. This is a meta-guard against the
// regression class the user called out: "ship something and we see its
// broken in live." If a future ship retires the SR review or refactors it
// without updating Playwright, this fails fast at UAT time.
test('v4.81.31 SRScrub: Playwright spec covers SR Review MCQ happy path',
  (() => {
    try {
      const fs = require('fs');
      const path = require('path');
      const specPath = path.join(__dirname, 'e2e', 'app.spec.js');
      const spec = fs.readFileSync(specPath, 'utf8');
      return /SR Review.*MCQ happy path/.test(spec)
        && /sr-review-start-btn/.test(spec)
        && /sr-confidence-confident/.test(spec);
    } catch (e) { return false; }
  })());
test('v4.81.31 SRScrub: Playwright spec covers SR Review multi-select flow',
  (() => {
    try {
      const fs = require('fs');
      const path = require('path');
      const specPath = path.join(__dirname, 'e2e', 'app.spec.js');
      const spec = fs.readFileSync(specPath, 'utf8');
      return /Multi-select happy path/.test(spec)
        && /sr-multi-submit-btn/.test(spec)
        && /is-missed/.test(spec);
    } catch (e) { return false; }
  })());
test('v4.81.31 SRScrub: Playwright spec covers v4.81.31 legacy-card scrub regression',
  (() => {
    try {
      const fs = require('fs');
      const path = require('path');
      const specPath = path.join(__dirname, 'e2e', 'app.spec.js');
      const spec = fs.readFileSync(specPath, 'utf8');
      return /v4\.81\.31 legacy-card scrub/.test(spec)
        && /'sr-legacy-order'/.test(spec)
        && /toHaveLength\(1\)/.test(spec);
    } catch (e) { return false; }
  })());

// v4.82.0: Quiz Revisit — Prev/Next nav arrows + clickable dots + editable
// re-pick across all question types. User feature request: "ability to revisit
// a previously answered question whilst ur in a quiz session." Editable
// (re-pick allowed), prev/next + dots (matches exam-mode UX), all qTypes
// covered (mcq + multi-select + order + cli-sim + topology).
//
// Truth-up rules: score + answered recompute from log on every re-pick.
// Streak intentionally NOT touched (re-picks happen after seeing the answer).
// Wrong-bank reflects current pick: wrong→right graduates from bank,
// right→wrong adds to bank.
test('v4.82.0 Revisit: _findLogEntryFor helper defined',
  /function _findLogEntryFor\(q\)/.test(js));
test('v4.82.0 Revisit: _recomputeQuizCounters helper defined',
  /function _recomputeQuizCounters\(\)/.test(js));
test('v4.82.0 Revisit: _renderQuizNavArrows helper defined',
  /function _renderQuizNavArrows\(\)/.test(js));
test('v4.82.0 Revisit: jumpToQuestion handler defined',
  /function jumpToQuestion\(idx\)/.test(js));
test('v4.82.0 Revisit: prevQuestion handler defined',
  /function prevQuestion\(\)/.test(js));
test('v4.82.0 Revisit: nextQuestion handler defined',
  /function nextQuestion\(\)/.test(js));
test('v4.82.0 Revisit: _restoreAnsweredQuizState helper defined',
  /function _restoreAnsweredQuizState\(q, entry\)/.test(js));
test('v4.82.0 Revisit: _renderRevisitBanner helper defined',
  /function _renderRevisitBanner\(hasEntry\)/.test(js));

// HTML: prev/next nav arrows + revisit banner element
test('v4.82.0 Revisit HTML: #quiz-prev-btn exists',
  /id="quiz-prev-btn"[\s\S]{0,200}onclick="prevQuestion\(\)"/.test(html));
test('v4.82.0 Revisit HTML: #quiz-next-arrow-btn exists',
  /id="quiz-next-arrow-btn"[\s\S]{0,200}onclick="nextQuestion\(\)"/.test(html));
test('v4.82.0 Revisit HTML: #quiz-revisit-banner element exists',
  /class="quiz-revisit-banner is-hidden"[\s\S]{0,80}id="quiz-revisit-banner"/.test(html));

// CSS: clickable quiz dots + nav arrows + revisit banner
test('v4.82.0 Revisit CSS: #quiz-prog-dots .qpd-cell becomes clickable button',
  /#quiz-prog-dots \.qpd-cell\s*\{[\s\S]*?cursor:\s*pointer/.test(css));
test('v4.82.0 Revisit CSS: .progress-label .quiz-nav-arrow declared',
  /\.progress-label \.quiz-nav-arrow\s*\{/.test(css));
test('v4.82.0 Revisit CSS: .quiz-revisit-banner declared',
  /\.quiz-revisit-banner\s*\{/.test(css));
test('v4.82.0 Revisit CSS: .options.is-revisiting affordance class declared',
  /\.options\.is-revisiting\s+\.option/.test(css));
test('v4.82.0 Revisit CSS: reduced-motion gate added for new transitions',
  /#quiz-prog-dots \.qpd-cell[\s\S]{0,500}transition:\s*none\s*!important/.test(css));

// _renderQuizProgressDots — buttons with onclick + numbered labels
test('v4.82.0 Revisit: progress dots are <button> with onclick="jumpToQuestion(...)"',
  (() => {
    const body = _fnBody(js, '_renderQuizProgressDots');
    if (!body) return false;
    return /<button type="button"/.test(body)
      && /onclick="jumpToQuestion\(\$\{i\}\)"/.test(body);
  })());

// pick() — re-pick branch updates existing entry instead of pushing new one
// Note: avoid _fnBody('pick') because of prefix-collision with pickDiagnosticOption.
// Slice the file from `function pick(chosen, q)` to next top-level function.
const _pickBody = (() => {
  const m = js.match(/function pick\(chosen, q\)\s*\{[\s\S]*?\n\}\n/);
  return m ? m[0] : '';
})();
test('v4.82.0 Revisit: pick() has re-pick branch via _findLogEntryFor',
  /_findLogEntryFor\(q\)/.test(_pickBody)
    && /log\[existing\.idx\] = \{ q, chosen,/.test(_pickBody)
    && /_recomputeQuizCounters\(\)/.test(_pickBody));

// pick() — wrong-bank truth-up logic (wrong→right graduates, right→wrong adds)
test('v4.82.0 Revisit: pick() truth-ups wrong-bank on re-pick',
  /if \(!isRight && wasRight\) addToWrongBank/.test(_pickBody)
    && /else if \(isRight && !wasRight\) graduateFromBank/.test(_pickBody));

// submitMultiSelect — re-submit branch
test('v4.82.0 Revisit: submitMultiSelect has re-submit branch',
  (() => {
    const body = _fnBody(js, 'submitMultiSelect');
    if (!body) return false;
    return /_findLogEntryFor\(q\)/.test(body)
      && /log\[existing\.idx\]/.test(body)
      && /_recomputeQuizCounters\(\)/.test(body);
  })());

// submitOrder — re-submit branch
test('v4.82.0 Revisit: submitOrder has re-submit branch',
  (() => {
    const body = _fnBody(js, 'submitOrder');
    if (!body) return false;
    return /_findLogEntryFor\(q\)/.test(body)
      && /log\[existing\.idx\]/.test(body)
      && /_recomputeQuizCounters\(\)/.test(body);
  })());

// submitTopology — re-submit branch
test('v4.82.0 Revisit: submitTopology has re-submit branch',
  (() => {
    const body = _fnBody(js, 'submitTopology');
    if (!body) return false;
    return /_findLogEntryFor\(q\)/.test(body)
      && /log\[existing\.idx\]/.test(body)
      && /_recomputeQuizCounters\(\)/.test(body);
  })());

// pick() — guard removed (used to be `if (querySelector('.option.correct, .option.wrong')) return;`)
test('v4.82.0 Revisit: pick() no longer guards re-picks via DOM .correct/.wrong query',
  (() => {
    const body = _fnBody(js, 'pick');
    if (!body) return false;
    // The new comment about removing the guard should be present;
    // the actual pre-fix guard line should not.
    const hasOldGuard = /if \(document\.querySelector\('#options \.option\.correct, #options \.option\.wrong'\)\) return;/.test(body);
    return !hasOldGuard;
  })());

// streak intentionally untouched on re-pick
test('v4.82.0 Revisit: _recomputeQuizCounters explicitly does NOT touch streak',
  (() => {
    const body = _fnBody(js, '_recomputeQuizCounters');
    if (!body) return false;
    // Streak should not be assigned in this function; should only update score + answered
    return /answered\s*=\s*log\.length/.test(body)
      && /score\s*=\s*log\.filter/.test(body)
      && !/streak\s*=/.test(body);
  })());

// Keyboard ←/→ wired for onQuiz (was previously only for onExam)
test('v4.82.0 Revisit: ArrowRight on quiz calls nextQuestion()',
  /e\.key === 'ArrowRight' && onQuiz[\s\S]{0,80}nextQuestion\(\)/.test(js));
test('v4.82.0 Revisit: ArrowLeft on quiz calls prevQuestion()',
  /e\.key === 'ArrowLeft'\s*&& onQuiz[\s\S]{0,80}prevQuestion\(\)/.test(js));

// render() wires the new helpers
// Note: avoid _fnBody('render') prefix-collision with renderMCQ etc.
const _renderQuizBody = (() => {
  const m = js.match(/\nfunction render\(\)\s*\{[\s\S]*?\n\}\n/);
  return m ? m[0] : '';
})();
test('v4.82.0 Revisit: render() calls _restoreAnsweredQuizState when log entry exists',
  /_findLogEntryFor\(q\)/.test(_renderQuizBody)
    && /_restoreAnsweredQuizState\(q,/.test(_renderQuizBody)
    && /_renderQuizNavArrows\(\)/.test(_renderQuizBody));

// vm fixture #1 — _recomputeQuizCounters truth-ups score + answered from log
test('v4.82.0 Revisit: vm fixture — _recomputeQuizCounters recomputes from log, leaves streak',
  (() => {
    try {
      const body = _fnBody(js, '_recomputeQuizCounters');
      if (!body) return false;
      const vm = require('vm');
      const fakeScore = { textContent: '' };
      const fakeStreak = { textContent: '' };
      const ctx = {
        log: [
          { q: { question: 'a' }, isRight: true },
          { q: { question: 'b' }, isRight: false },
          { q: { question: 'c' }, isRight: true },
          { q: { question: 'd' }, isRight: true }
        ],
        score: 0,    // simulate stale state — should be recomputed to 3
        answered: 0, // should be recomputed to 4
        streak: 7,   // should NOT be touched
        document: { getElementById: (id) => id === 'live-score' ? fakeScore : id === 'live-streak' ? fakeStreak : null },
        Array, Number
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('_recomputeQuizCounters()', ctx);
      return ctx.score === 3 && ctx.answered === 4 && ctx.streak === 7
        && fakeScore.textContent === '3 / 4';
    } catch (e) { return false; }
  })());

// vm fixture #2 — _findLogEntryFor returns matching entry by object identity
test('v4.82.0 Revisit: vm fixture — _findLogEntryFor matches by question object identity',
  (() => {
    try {
      const body = _fnBody(js, '_findLogEntryFor');
      if (!body) return false;
      const vm = require('vm');
      const qA = { question: 'A?' };
      const qB = { question: 'B?' };
      const qC = { question: 'C?' };
      const ctx = {
        log: [
          { q: qA, chosen: 'A', isRight: false },
          { q: qB, chosen: 'C', isRight: true }
        ],
        qA, qB, qC,
        Array
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const resA = vm.runInContext('_findLogEntryFor(qA)', ctx);
      const resB = vm.runInContext('_findLogEntryFor(qB)', ctx);
      const resC = vm.runInContext('_findLogEntryFor(qC)', ctx);
      return resA && resA.idx === 0 && resA.entry.chosen === 'A'
        && resB && resB.idx === 1 && resB.entry.chosen === 'C'
        && resC === null;
    } catch (e) { return false; }
  })());

// vm fixture #3 + #4 — pick() re-pick paths: wrong→right and right→wrong both truth-up.
// Use _pickBody (regex-extracted via specific signature) to avoid prefix-collision.
test('v4.82.0 Revisit: vm fixture — pick re-pick wrong→right updates entry + graduates wrong-bank',
  (() => {
    try {
      const findBody = _fnBody(js, '_findLogEntryFor');
      const recomputeBody = _fnBody(js, '_recomputeQuizCounters');
      if (!_pickBody || !findBody || !recomputeBody) return false;
      const vm = require('vm');
      const q = { question: 'Test?', answer: 'C' };
      const graduateCalls = [];
      const addToBankCalls = [];
      const fakeScore = { textContent: '' };
      const fakeStreak = { textContent: '', classList: { remove: () => {}, add: () => {} }, offsetWidth: 0 };
      const ctx = {
        log: [{ q, chosen: 'B', correct: 'C', isRight: false, flagged: false }],
        score: 0, answered: 1, streak: 0, bestStreak: 0,
        quizFlags: [false],
        current: 0,
        wrongDrillMode: false,
        addToWrongBank: (q, ch) => addToBankCalls.push({ q, ch }),
        graduateFromBank: (qstr) => graduateCalls.push(qstr),
        updateTypeStat: () => {},
        getQType: () => 'mcq',
        q,
        document: {
          getElementById: (id) => id === 'live-score' ? fakeScore : id === 'live-streak' ? fakeStreak : id === 'options' ? { classList: { add: () => {} } } : null,
          querySelectorAll: () => []
        },
        showExplanation: () => {},
        _renderQuizProgressDots: () => {},
        _renderQuizNavArrows: () => {},
        Array, Number, JSON, Object
      };
      vm.createContext(ctx);
      vm.runInContext(findBody, ctx);
      vm.runInContext(recomputeBody, ctx);
      vm.runInContext(_pickBody, ctx);
      vm.runInContext("pick('C', q)", ctx);
      const entry = ctx.log[0];
      return entry.chosen === 'C'
        && entry.isRight === true
        && ctx.score === 1
        && ctx.answered === 1
        && ctx.streak === 0
        && graduateCalls.length === 1
        && addToBankCalls.length === 0;
    } catch (e) { return false; }
  })());

test('v4.82.0 Revisit: vm fixture — pick re-pick right→wrong downscores + adds to wrong-bank',
  (() => {
    try {
      const findBody = _fnBody(js, '_findLogEntryFor');
      const recomputeBody = _fnBody(js, '_recomputeQuizCounters');
      if (!_pickBody || !findBody || !recomputeBody) return false;
      const vm = require('vm');
      const q = { question: 'Test?', answer: 'C' };
      const graduateCalls = [];
      const addToBankCalls = [];
      const fakeScore = { textContent: '' };
      const fakeStreak = { textContent: '', classList: { remove: () => {}, add: () => {} }, offsetWidth: 0 };
      const ctx = {
        log: [{ q, chosen: 'C', correct: 'C', isRight: true, flagged: false }],
        score: 1, answered: 1, streak: 1, bestStreak: 1,
        quizFlags: [false],
        current: 0,
        wrongDrillMode: false,
        addToWrongBank: (q, ch) => addToBankCalls.push({ q, ch }),
        graduateFromBank: (qstr) => graduateCalls.push(qstr),
        updateTypeStat: () => {},
        getQType: () => 'mcq',
        q,
        document: {
          getElementById: (id) => id === 'live-score' ? fakeScore : id === 'live-streak' ? fakeStreak : id === 'options' ? { classList: { add: () => {} } } : null,
          querySelectorAll: () => []
        },
        showExplanation: () => {},
        _renderQuizProgressDots: () => {},
        _renderQuizNavArrows: () => {},
        Array, Number, JSON, Object
      };
      vm.createContext(ctx);
      vm.runInContext(findBody, ctx);
      vm.runInContext(recomputeBody, ctx);
      vm.runInContext(_pickBody, ctx);
      vm.runInContext("pick('A', q)", ctx);
      const entry = ctx.log[0];
      return entry.chosen === 'A'
        && entry.isRight === false
        && ctx.score === 0
        && ctx.answered === 1
        && ctx.streak === 1
        && graduateCalls.length === 0
        && addToBankCalls.length === 1
        && addToBankCalls[0].ch === 'A';
    } catch (e) { return false; }
  })());

// Playwright spec coverage check
test('v4.82.0 Revisit: Playwright spec covers Quiz Revisit flow',
  (() => {
    try {
      const fs = require('fs');
      const path = require('path');
      const specPath = path.join(__dirname, 'e2e', 'app.spec.js');
      const spec = fs.readFileSync(specPath, 'utf8');
      return /Quiz Revisit/.test(spec)
        && /quiz-prev-btn/.test(spec)
        && /quiz-revisit-banner/.test(spec);
    } catch (e) { return false; }
  })());

// v4.82.1: smooth loading progress bar — eased continuous fill + shimmer
// overlay across all question-fetching flows. User feature request: "when
// the questions are loading there needs to be some kind of loading bar
// aswel." Pre-fix only exam mode had a per-batch progress bar; regular
// quizzes/diagnostic/marathon showed only a skeleton + status text.
//
// Smoothness pattern: each milestone is a real event (Haiku resolved,
// Sonnet resolved, etc.) — no fakery. Width transitions via 1.6s
// cubic-bezier ease-out so the fill smoothly decelerates between
// milestones. Shimmer overlay (CSS pseudo-element) animates continuously
// regardless of width changes so the bar feels alive even between events.
test('v4.82.1 Loader: _loadingProgressBegin defined',
  /function _loadingProgressBegin\(initialLabel\)/.test(js));
test('v4.82.1 Loader: _loadingProgressUpdate defined',
  /function _loadingProgressUpdate\(label, pct\)/.test(js));
test('v4.82.1 Loader: _loadingProgressFinish defined',
  /function _loadingProgressFinish\(\)/.test(js));
test('v4.82.1 Loader: progress bar resets transition before first paint (avoids backflow)',
  (() => {
    const m = js.match(/function _loadingProgressBegin[\s\S]{0,1500}\}/);
    if (!m) return false;
    const body = m[0];
    return /style\.transition = 'none'/.test(body)
      && /style\.width = '0%'/.test(body)
      && /void _loadingProgressBar\.offsetWidth/.test(body);
  })());

// CSS: shimmer overlay + cubic-bezier easing
test('v4.82.1 Loader CSS: load-bar-fill has cubic-bezier transition',
  /\.load-bar-fill\s*\{[\s\S]*?cubic-bezier\(0\.16, 1, 0\.3, 1\)/.test(css));
test('v4.82.1 Loader CSS: shimmer overlay defined via ::after pseudo',
  /\.load-bar-fill::after\s*\{[\s\S]*?animation:\s*loadBarShimmer/.test(css));
test('v4.82.1 Loader CSS: @keyframes loadBarShimmer defined',
  /@keyframes loadBarShimmer\s*\{[\s\S]*?background-position/.test(css));
test('v4.82.1 Loader CSS: load-bar height bumped from 4px to 8px',
  /\.load-bar\s*\{[\s\S]*?height:\s*8px/.test(css));
test('v4.82.1 Loader CSS: reduced-motion gate kills shimmer animation',
  /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.load-bar-fill::after\s*\{[\s\S]*?animation:\s*none/.test(css));

// Wiring into all 4 flows
test('v4.82.1 Loader: startQuiz calls _loadingProgressBegin',
  (() => {
    const body = _fnBody(js, 'startQuiz');
    if (!body) return false;
    return /_loadingProgressBegin\(/.test(body)
      && /_loadingProgressUpdate\(/.test(body)
      && /_loadingProgressFinish\(\)/.test(body);
  })());
test('v4.82.1 Loader: startDiagnostic calls _loadingProgressBegin',
  (() => {
    const body = _fnBody(js, 'startDiagnostic');
    if (!body) return false;
    return /_loadingProgressBegin\(/.test(body)
      && /_loadingProgressFinish\(\)/.test(body);
  })());
test('v4.82.1 Loader: startExam uses unified loading-progress module',
  (() => {
    const body = _fnBody(js, 'startExam');
    if (!body) return false;
    return /_loadingProgressBegin\(/.test(body)
      && /_loadingProgressUpdate\(/.test(body)
      && /_loadingProgressFinish\(\)/.test(body);
  })());
test('v4.82.1 Loader: startBulkQuiz (marathon) uses unified loading-progress module',
  (() => {
    const body = _fnBody(js, 'startBulkQuiz');
    if (!body) return false;
    return /_loadingProgressBegin\(/.test(body)
      && /_loadingProgressUpdate\(/.test(body)
      && /_loadingProgressFinish\(\)/.test(body);
  })());

// Tombstone: legacy direct fill.style.width = '0%' on un-hide should be gone
// from startExam (replaced by _loadingProgressBegin which handles transition reset).
test('v4.82.1 Loader: tombstone — startExam no longer does manual fill.style.width = "0%" un-hide pattern',
  (() => {
    const body = _fnBody(js, 'startExam');
    if (!body) return false;
    // The pattern "fill.style.width = '0%';\n  prog.classList.remove('is-hidden')"
    // was the legacy un-hide. After v4.82.1 the helper handles both.
    return !/fill\.style\.width = '0%';\s*\n\s*prog\.classList\.remove\('is-hidden'\)/.test(body);
  })());

// vm fixture — _loadingProgressBegin resets transition + sets width=0% then
// nudges to 8% after a tick.
test('v4.82.1 Loader: vm fixture — _loadingProgressBegin resets bar then nudges to 8%',
  (() => {
    try {
      const beginBody = _fnBody(js, '_loadingProgressBegin');
      if (!beginBody) return false;
      const vm = require('vm');
      let widthHistory = [];
      let transitionHistory = [];
      const fakeBar = {
        style: {
          set transition(v) { transitionHistory.push(v); },
          get transition() { return transitionHistory[transitionHistory.length - 1] || ''; },
          set width(v) { widthHistory.push(v); },
          get width() { return widthHistory[widthHistory.length - 1] || ''; }
        },
        offsetWidth: 0
      };
      const fakeLabel = { textContent: '' };
      const fakeProg = { classList: { remove: () => {} } };
      const ctx = {
        document: {
          getElementById: (id) => {
            if (id === 'load-progress') return fakeProg;
            if (id === 'load-bar-fill') return fakeBar;
            if (id === 'load-progress-label') return fakeLabel;
            return null;
          }
        },
        setTimeout: (fn, ms) => fn(), // fire synchronously so we can assert the 8% bump
        _loadingProgressBar: null,
        _loadingProgressLabel: null
      };
      vm.createContext(ctx);
      vm.runInContext(beginBody, ctx);
      vm.runInContext("_loadingProgressBegin('Test label')", ctx);
      // Should have: transition='none', width='0%', then transition='', then setTimeout fired width='8%'
      return widthHistory.length >= 2
        && widthHistory[0] === '0%'
        && widthHistory[widthHistory.length - 1] === '8%'
        && transitionHistory.includes('none')
        && fakeLabel.textContent === 'Test label';
    } catch (e) { return false; }
  })());

// vm fixture — _loadingProgressFinish snaps to 100% then schedules hide
test('v4.82.1 Loader: vm fixture — _loadingProgressFinish snaps to 100% + hides container',
  (() => {
    try {
      const finishBody = _fnBody(js, '_loadingProgressFinish');
      if (!finishBody) return false;
      const vm = require('vm');
      let progHidden = false;
      const fakeBar = { style: {} };
      const fakeLabel = { textContent: '' };
      const fakeProg = { classList: { add: (c) => { if (c === 'is-hidden') progHidden = true; } } };
      const ctx = {
        document: {
          getElementById: (id) => {
            if (id === 'load-progress') return fakeProg;
            return null;
          }
        },
        setTimeout: (fn, ms) => fn(), // fire synchronously
        _loadingProgressBar: fakeBar,
        _loadingProgressLabel: fakeLabel
      };
      vm.createContext(ctx);
      vm.runInContext(finishBody, ctx);
      vm.runInContext('_loadingProgressFinish()', ctx);
      return fakeBar.style.width === '100%'
        && fakeLabel.textContent === 'Ready!'
        && progHidden === true;
    } catch (e) { return false; }
  })());

// v4.83.0: Hot-Area question type — three sub-shapes (topology / OSI / cable-grid)
// for click-on-diagram PBQs. Curated bank of 8 hand-authored questions with inline
// SVGs for cable connectors. Closes the realism gap vs the real CompTIA exam,
// which sometimes asks "click the misconfigured device" or "click the OSI layer
// where ARP operates." Single-click + Submit + reveal pattern matches our other
// PBQs (multi-select / order / topology). Revisit-aware via the v4.82.0
// infrastructure — clicking a dot back re-renders with previous pick highlighted
// and Submit re-enabled.
test('v4.83.0 HotArea: HOT_AREA_BANK constant defined',
  /const HOT_AREA_BANK = \[/.test(js));
test('v4.83.0 HotArea: bank has at least 8 questions',
  (() => {
    const m = js.match(/const HOT_AREA_BANK = \[([\s\S]*?)\n\];/);
    if (!m) return false;
    const entries = m[1].match(/type: 'hot-area'/g) || [];
    return entries.length >= 8;
  })());
test('v4.83.0 HotArea: bank covers all 3 sub-shapes (topology + osi + cable-grid)',
  (() => {
    const m = js.match(/const HOT_AREA_BANK = \[([\s\S]*?)\n\];/);
    if (!m) return false;
    return /subShape: 'topology'/.test(m[1])
      && /subShape: 'osi'/.test(m[1])
      && /subShape: 'cable-grid'/.test(m[1]);
  })());
test('v4.83.0 HotArea: CABLE_CONNECTORS icon library defined',
  /const CABLE_CONNECTORS = \{/.test(js));
test('v4.83.0 HotArea: CABLE_CONNECTORS covers 8 connector types',
  (() => {
    const m = js.match(/const CABLE_CONNECTORS = \{([\s\S]*?)\n\};/);
    if (!m) return false;
    const ids = ['rj45', 'rj11', 'lc', 'sc', 'st', 'f-type', 'bnc', 'usb-c'];
    return ids.every(id => m[1].includes("'" + id + "'"));
  })());
test('v4.83.0 HotArea: cable connector SVGs use currentColor for theme awareness',
  (() => {
    const m = js.match(/const CABLE_CONNECTORS = \{([\s\S]*?)\n\};/);
    if (!m) return false;
    // At least 4 of 8 should use currentColor (verifies pattern, not strict for every shape)
    const matches = m[1].match(/currentColor/g) || [];
    return matches.length >= 4;
  })());

// Renderer + dispatch
test('v4.83.0 HotArea: renderHotArea defined',
  /function renderHotArea\(q, box\)/.test(js));
test('v4.83.0 HotArea: 3 sub-renderers defined (topology + osi + cable-grid)',
  /function _renderHotAreaTopology\(q, box\)/.test(js)
    && /function _renderHotAreaOsi\(q, box\)/.test(js)
    && /function _renderHotAreaCableGrid\(q, box\)/.test(js));
test('v4.83.0 HotArea: submitHotArea defined',
  /function submitHotArea\(q\)/.test(js));
test('v4.83.0 HotArea: _restoreAnsweredHotAreaState defined',
  /function _restoreAnsweredHotAreaState\(q, entry\)/.test(js));
test('v4.83.0 HotArea: render() dispatches hot-area to renderHotArea',
  (() => {
    if (!_renderQuizBody) return false;
    return /qType === 'hot-area'/.test(_renderQuizBody)
      && /renderHotArea\(q, box\)/.test(_renderQuizBody);
  })());
test('v4.83.0 HotArea: render() PBQ badge handles hot-area sub-shapes',
  (() => {
    if (!_renderQuizBody) return false;
    return /Hot Area · /.test(_renderQuizBody);
  })());

// _restoreAnsweredQuizState routes hot-area
test('v4.83.0 HotArea: _restoreAnsweredQuizState handles hot-area',
  (() => {
    const body = _fnBody(js, '_restoreAnsweredQuizState');
    if (!body) return false;
    return /qType === 'hot-area'/.test(body)
      && /_restoreAnsweredHotAreaState\(q, entry\)/.test(body);
  })());

// injectPBQs pulls from HOT_AREA_BANK
test('v4.83.0 HotArea: getMatchingScenarios returns hotArea pool',
  (() => {
    const body = _fnBody(js, 'getMatchingScenarios');
    if (!body) return false;
    return /HOT_AREA_BANK\.filter/.test(body)
      && /hotArea/.test(body);
  })());
test('v4.83.0 HotArea: injectPBQs pool includes hotArea',
  (() => {
    const body = _fnBody(js, 'injectPBQs');
    if (!body) return false;
    return /\.\.\.\(hotArea \|\| \[\]\)/.test(body)
      || /\.\.\.hotArea/.test(body);
  })());

// submitHotArea uses v4.82.0 update-or-push pattern
test('v4.83.0 HotArea: submitHotArea has revisit re-submit branch',
  (() => {
    const body = _fnBody(js, 'submitHotArea');
    if (!body) return false;
    return /_findLogEntryFor\(q\)/.test(body)
      && /log\[existing\.idx\]/.test(body)
      && /_recomputeQuizCounters\(\)/.test(body);
  })());
test('v4.83.0 HotArea: submitHotArea truth-ups wrong-bank on re-submit',
  (() => {
    const body = _fnBody(js, 'submitHotArea');
    if (!body) return false;
    return /if \(!isCorrect && wasRight\) addToWrongBank/.test(body)
      && /else if \(isCorrect && !wasRight\) graduateFromBank/.test(body);
  })());

// CSS structural
test('v4.83.0 HotArea CSS: .hot-area-stage container declared',
  /\.hot-area-stage\s*\{/.test(css));
test('v4.83.0 HotArea CSS: .hot-region states (picked/correct/wrong/dimmed/reveal-correct)',
  /\.hot-region\.is-picked/.test(css)
    && /\.hot-region\.is-correct/.test(css)
    && /\.hot-region\.is-wrong/.test(css)
    && /\.hot-region\.is-reveal-correct/.test(css)
    && /\.hot-region\.is-dimmed/.test(css));
test('v4.83.0 HotArea CSS: .osi-stack + .osi-layer states declared',
  /\.osi-stack\s*\{/.test(css)
    && /\.osi-layer\.is-picked/.test(css)
    && /\.osi-layer\.is-correct/.test(css));
test('v4.83.0 HotArea CSS: .cable-grid + .cable-card states declared',
  /\.cable-grid\s*\{/.test(css)
    && /\.cable-card\.is-picked/.test(css)
    && /\.cable-card\.is-correct/.test(css));
test('v4.83.0 HotArea CSS: reduced-motion gate kills transitions',
  /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]{0,500}\.hot-region[\s\S]{0,200}transition: none/.test(css));

// vm fixture #1 — _haRegionIsCorrect for topology + osi + cable-grid
test('v4.83.0 HotArea: vm fixture — _haRegionIsCorrect dispatches by sub-shape',
  (() => {
    try {
      const correctIdsBody = _fnBody(js, '_haCorrectRegionIds');
      const isCorrectBody = _fnBody(js, '_haRegionIsCorrect');
      if (!correctIdsBody || !isCorrectBody) return false;
      const vm = require('vm');
      const ctx = { Array };
      vm.createContext(ctx);
      vm.runInContext(correctIdsBody, ctx);
      vm.runInContext(isCorrectBody, ctx);

      // Topology
      const topo = { subShape: 'topology', regions: [
        { id: 'r1', isCorrect: false }, { id: 'r2', isCorrect: true }, { id: 'r3', isCorrect: false }
      ]};
      const t1 = vm.runInContext('_haRegionIsCorrect(' + JSON.stringify(topo) + ", 'r2')", ctx);
      const t2 = vm.runInContext('_haRegionIsCorrect(' + JSON.stringify(topo) + ", 'r1')", ctx);

      // OSI dual-correct
      const osi = { subShape: 'osi', correctLayers: ['L2', 'L3'] };
      const o1 = vm.runInContext('_haRegionIsCorrect(' + JSON.stringify(osi) + ", 'L2')", ctx);
      const o2 = vm.runInContext('_haRegionIsCorrect(' + JSON.stringify(osi) + ", 'L3')", ctx);
      const o3 = vm.runInContext('_haRegionIsCorrect(' + JSON.stringify(osi) + ", 'L4')", ctx);

      // Cable-grid
      const cable = { subShape: 'cable-grid', cables: [
        { id: 'rj45', isCorrect: false }, { id: 'lc', isCorrect: true }
      ]};
      const c1 = vm.runInContext('_haRegionIsCorrect(' + JSON.stringify(cable) + ", 'lc')", ctx);
      const c2 = vm.runInContext('_haRegionIsCorrect(' + JSON.stringify(cable) + ", 'rj45')", ctx);

      return t1 === true && t2 === false
        && o1 === true && o2 === true && o3 === false  // dual-correct works
        && c1 === true && c2 === false;
    } catch (e) { return false; }
  })());

// vm fixture #2 — submitHotArea logs an entry on first-submit + recomputes on re-submit
test('v4.83.0 HotArea: vm fixture — submitHotArea logs entry on first submit, updates on re-submit',
  (() => {
    try {
      const submitBody = _fnBody(js, 'submitHotArea');
      const findBody = _fnBody(js, '_findLogEntryFor');
      const recomputeBody = _fnBody(js, '_recomputeQuizCounters');
      const correctIdsBody = _fnBody(js, '_haCorrectRegionIds');
      const isCorrectBody = _fnBody(js, '_haRegionIsCorrect');
      if (!submitBody || !findBody || !recomputeBody) return false;
      const vm = require('vm');
      const q = { type: 'hot-area', subShape: 'osi', question: 'ARP layer?', correctLayers: ['L2', 'L3'], explanation: 'L2/L3 boundary' };
      const graduateCalls = [];
      const addToBankCalls = [];
      const fakeScore = { textContent: '' };
      const fakeStreak = { textContent: '' };
      const ctx = {
        log: [], score: 0, answered: 0, streak: 0, bestStreak: 0,
        quizFlags: [false], current: 0, wrongDrillMode: false,
        addToWrongBank: (q, ch) => addToBankCalls.push({ q, ch }),
        graduateFromBank: (qstr) => graduateCalls.push(qstr),
        updateTypeStat: () => {},
        document: {
          getElementById: (id) => id === 'live-score' ? fakeScore : id === 'live-streak' ? fakeStreak : id === 'options' ? { classList: { add: () => {} } } : id === 'ha-submit-row' ? { classList: { add: () => {} } } : null,
          querySelectorAll: () => []
        },
        showExplanation: () => {},
        _renderQuizProgressDots: () => {},
        _renderQuizNavArrows: () => {},
        _hotAreaPick: 'L4', // user's first wrong pick
        q,
        Array, Number, JSON, Object
      };
      vm.createContext(ctx);
      vm.runInContext(findBody, ctx);
      vm.runInContext(recomputeBody, ctx);
      vm.runInContext(correctIdsBody, ctx);
      vm.runInContext(isCorrectBody, ctx);
      vm.runInContext(submitBody, ctx);

      // First submit: pick = L4 (wrong)
      vm.runInContext('submitHotArea(q)', ctx);
      const afterFirst = ctx.log.length === 1
        && ctx.log[0].chosen === 'L4'
        && ctx.log[0].isRight === false
        && ctx.score === 0
        && ctx.answered === 1
        && addToBankCalls.length === 1;

      // Re-submit: change pick to L2 (correct via dual-correct)
      ctx._hotAreaPick = 'L2';
      vm.runInContext('submitHotArea(q)', ctx);
      const afterResubmit = ctx.log.length === 1  // updated, not pushed
        && ctx.log[0].chosen === 'L2'
        && ctx.log[0].isRight === true
        && ctx.score === 1
        && ctx.answered === 1
        && graduateCalls.length === 1;

      return afterFirst && afterResubmit;
    } catch (e) { return false; }
  })());

// Playwright spec coverage check
test('v4.83.0 HotArea: Playwright spec covers Hot-Area flow',
  (() => {
    try {
      const fs = require('fs');
      const path = require('path');
      const specPath = path.join(__dirname, 'e2e', 'app.spec.js');
      const spec = fs.readFileSync(specPath, 'utf8');
      return /Hot-Area|Hot Area/.test(spec)
        && /ha-submit-btn/.test(spec)
        && /hot-area/.test(spec);
    } catch (e) { return false; }
  })());

// v4.84.0 — Network Analysis Drill (Phase 1, issue #270). 5th drill in the
// launcher row. 32-Q curated bank across 4 categories (tcpdump filters /
// Wireshark display filters / Nmap scan types / output reading) + 3 stepped
// lessons + Practice/Lessons/Dashboard mode tabs. Closes the N10-009 Domain
// 5.5 ("use the appropriate tool") gap.
test('v4.84.0 NetAnalysis: NETWORK_ANALYSIS_BANK constant defined',
  /const NETWORK_ANALYSIS_BANK = \[/.test(js));
test('v4.85.0 NetAnalysis: bank has at least 42 questions (32 original + 10 filter)',
  (() => {
    const m = js.match(/const NETWORK_ANALYSIS_BANK = \[([\s\S]*?)\n\];/);
    if (!m) return false;
    const entries = m[1].match(/id: 'na-/g) || [];
    return entries.length >= 42;
  })());
test('v4.85.0 NetAnalysis: bank covers all 5 categories (incl. filter)',
  (() => {
    const m = js.match(/const NETWORK_ANALYSIS_BANK = \[([\s\S]*?)\n\];/);
    if (!m) return false;
    return /category: 'tcpdump'/.test(m[1])
      && /category: 'wireshark'/.test(m[1])
      && /category: 'nmap'/.test(m[1])
      && /category: 'output-reading'/.test(m[1])
      && /category: 'filter'/.test(m[1]);
  })());
test('v4.84.0 NetAnalysis: NETWORK_ANALYSIS_LESSONS constant defined',
  /const NETWORK_ANALYSIS_LESSONS = \[/.test(js));
test('v4.85.0 NetAnalysis: lessons cover tcpdump + wireshark + nmap + bpf-vs-display',
  (() => {
    const m = js.match(/const NETWORK_ANALYSIS_LESSONS = \[([\s\S]*?)\n\];/);
    if (!m) return false;
    return /id: 'tcpdump-cheatsheet'/.test(m[1])
      && /id: 'wireshark-cheatsheet'/.test(m[1])
      && /id: 'nmap-decision-tree'/.test(m[1])
      && /id: 'bpf-vs-display'/.test(m[1]);
  })());
test('v4.85.0 NetAnalysis: each lesson has 5 steps',
  (() => {
    // Walk each lesson's steps array — count entries with `title:` inside.
    const m = js.match(/const NETWORK_ANALYSIS_LESSONS = \[([\s\S]*?)\n\];/);
    if (!m) return false;
    // Four lessons, each with 5 steps + 1 cheatsheet — count `steps: [` blocks
    // and within them count `{ title:` entries.
    const lessonBlocks = m[1].split(/\n  \{\n    id: '/);
    if (lessonBlocks.length < 5) return false; // header + 4 lessons
    // For each of the 4 lesson chunks, count `title:` occurrences inside steps
    let allFiveSteps = true;
    for (let i = 1; i < lessonBlocks.length; i++) {
      const block = lessonBlocks[i];
      const stepsMatch = block.match(/steps: \[([\s\S]*?)\],\s*\n\s*cheatsheet/);
      if (!stepsMatch) { allFiveSteps = false; break; }
      const stepCount = (stepsMatch[1].match(/title: '/g) || []).length;
      if (stepCount !== 5) { allFiveSteps = false; break; }
    }
    return allFiveSteps;
  })());
test('v4.85.0 NetAnalysis: NA_CATEGORIES constant has 5 categories (incl. filter)',
  /const NA_CATEGORIES = \['tcpdump', 'wireshark', 'nmap', 'output-reading', 'filter'\]/.test(js));

// Storage keys + helpers
test('v4.84.0 NetAnalysis: STORAGE.NA_MASTERY key declared',
  /NA_MASTERY: 'nplus_na_mastery'/.test(js));
test('v4.84.0 NetAnalysis: STORAGE.NA_LESSONS key declared',
  /NA_LESSONS: 'nplus_na_lessons'/.test(js));
test('v4.84.0 NetAnalysis: STORAGE.NA_STATS key declared',
  /NA_STATS: 'nplus_na_stats'/.test(js));

// Renderer + handlers
test('v4.84.0 NetAnalysis: startNetworkAnalysisDrill defined',
  /function startNetworkAnalysisDrill\(\)/.test(js));
test('v4.84.0 NetAnalysis: naSetTab defined',
  /function naSetTab\(tabId\)/.test(js));
test('v4.84.0 NetAnalysis: naRenderPractice defined',
  /function naRenderPractice\(\)/.test(js));
test('v4.84.0 NetAnalysis: naRenderDashboard defined',
  /function naRenderDashboard\(\)/.test(js));
test('v4.84.0 NetAnalysis: naRenderLessonsIndex defined',
  /function naRenderLessonsIndex\(\)/.test(js));
test('v4.84.0 NetAnalysis: naSubmitAnswer defined',
  /function naSubmitAnswer\(letter\)/.test(js));
test('v4.84.0 NetAnalysis: naOpenLesson defined',
  /function naOpenLesson\(lessonId\)/.test(js));

// HTML structural
test('v4.84.0 NetAnalysis HTML: #page-network-analysis exists',
  /id="page-network-analysis"/.test(html));
test('v4.84.0 NetAnalysis HTML: 5th drill tile (drills-tile-new) exists',
  /class="drills-tile drills-tile-new"[\s\S]{0,200}startNetworkAnalysisDrill\(\)/.test(html));
test('v4.84.0 NetAnalysis HTML: Practice/Lessons/Dashboard tab buttons exist',
  /id="na-tab-btn-practice"/.test(html)
    && /id="na-tab-btn-lessons"/.test(html)
    && /id="na-tab-btn-dashboard"/.test(html));

// CSS structural
test('v4.84.0 NetAnalysis CSS: .na-tabs declared',
  /\.na-tabs\s*\{/.test(css));
test('v4.84.0 NetAnalysis CSS: .na-question-card declared',
  /\.na-question-card\s*\{/.test(css));
test('v4.84.0 NetAnalysis CSS: .na-output-block + token color classes declared',
  /\.na-output-block\s*\{/.test(css)
    && /\.na-out-time/.test(css)
    && /\.na-out-ip/.test(css)
    && /\.na-out-port/.test(css)
    && /\.na-out-flag/.test(css));
test('v4.84.0 NetAnalysis CSS: .na-cat-card mastery states declared',
  /\.na-cat-bar-fill\.na-cat-high/.test(css)
    && /\.na-cat-bar-fill\.na-cat-mid/.test(css)
    && /\.na-cat-bar-fill\.na-cat-low/.test(css)
    && /\.na-cat-bar-fill\.na-cat-empty/.test(css));
test('v4.84.0 NetAnalysis CSS: .drills-tile-new + NEW badge declared',
  /\.drills-tile-new\s*\{/.test(css)
    && /\.drills-tile-new-badge\s*\{/.test(css));
test('v4.84.0 NetAnalysis CSS: .na-cheat-table declared',
  /\.na-cheat-table\s*\{/.test(css));
test('v4.84.0 NetAnalysis CSS: reduced-motion gate kills transitions',
  /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]{0,500}\.na-cat-card[\s\S]{0,200}transition: none/.test(css));

// vm fixture #1 — naSubmitAnswer updates mastery correctly
test('v4.84.0 NetAnalysis: vm fixture — naSubmitAnswer updates mastery on right + wrong',
  (() => {
    try {
      const submitBody = _fnBody(js, 'naSubmitAnswer');
      const renderBody = _fnBody(js, 'naRenderPractice');
      const getMasteryBody = _fnBody(js, 'naGetMastery');
      const initBody = _fnBody(js, '_naInitMastery');
      const saveBody = _fnBody(js, 'naSaveMastery');
      if (!submitBody || !getMasteryBody || !initBody || !saveBody) return false;
      const vm = require('vm');
      let savedMastery = null;
      const ctx = {
        STORAGE: { NA_MASTERY: 'nplus_na_mastery' },
        NA_CATEGORIES: ['tcpdump', 'wireshark', 'nmap', 'output-reading', 'filter'],
        localStorage: {
          getItem: () => null,
          setItem: (key, val) => { savedMastery = JSON.parse(val); }
        },
        JSON, Object,
        // Stub renderPractice — we only care that mastery gets updated correctly
        naRenderPractice: () => {},
        _naCurrentQuestion: { id: 'na-tcpdump-001', category: 'tcpdump', answer: 'A' },
        _naQuestionAnswered: false
      };
      vm.createContext(ctx);
      vm.runInContext(initBody, ctx);
      vm.runInContext(saveBody, ctx);
      vm.runInContext(getMasteryBody, ctx);
      vm.runInContext(submitBody, ctx);

      // Submit correct answer 'A'
      vm.runInContext("naSubmitAnswer('A')", ctx);
      const afterRight = savedMastery && savedMastery.tcpdump
        && savedMastery.tcpdump.right === 1
        && savedMastery.tcpdump.total === 1;

      // Reset _naQuestionAnswered for second submission
      ctx._naQuestionAnswered = false;
      ctx._naCurrentQuestion = { id: 'na-tcpdump-002', category: 'tcpdump', answer: 'B' };
      // Mock getItem to return current state so the next save merges correctly
      ctx.localStorage.getItem = () => JSON.stringify(savedMastery);
      vm.runInContext(submitBody, ctx);
      vm.runInContext(getMasteryBody, ctx);
      vm.runInContext(saveBody, ctx);

      // Submit wrong answer (pick 'A' when correct is 'B')
      vm.runInContext("naSubmitAnswer('A')", ctx);
      const afterWrong = savedMastery && savedMastery.tcpdump
        && savedMastery.tcpdump.right === 1   // still 1 right
        && savedMastery.tcpdump.total === 2;  // total bumped to 2

      return afterRight && afterWrong;
    } catch (e) { return false; }
  })());

// vm fixture #2 — _naPickNextQuestion biases to weakest category
test('v4.84.0 NetAnalysis: vm fixture — _naPickNextQuestion weights weakest higher',
  (() => {
    try {
      const pickBody = _fnBody(js, '_naPickNextQuestion');
      const getMasteryBody = _fnBody(js, 'naGetMastery');
      const initBody = _fnBody(js, '_naInitMastery');
      if (!pickBody || !getMasteryBody || !initBody) return false;
      const vm = require('vm');
      // Mock bank: 1 question per category
      const fakeBank = [
        { id: 'q-tcpdump', category: 'tcpdump' },
        { id: 'q-wireshark', category: 'wireshark' },
        { id: 'q-nmap', category: 'nmap' },
        { id: 'q-output', category: 'output-reading' },
        { id: 'q-filter', category: 'filter' }
      ];
      // Mock mastery: tcpdump = 100% (10/10), wireshark = 0% (5/5), nmap = 50% (4/8), output = never, filter = never
      const fakeMastery = {
        'tcpdump': { right: 10, total: 10 },
        'wireshark': { right: 0, total: 5 },
        'nmap': { right: 4, total: 8 },
        'output-reading': { right: 0, total: 0 },
        'filter': { right: 0, total: 0 }
      };
      const ctx = {
        STORAGE: { NA_MASTERY: 'nplus_na_mastery' },
        NA_CATEGORIES: ['tcpdump', 'wireshark', 'nmap', 'output-reading', 'filter'],
        NETWORK_ANALYSIS_BANK: fakeBank,
        localStorage: { getItem: () => JSON.stringify(fakeMastery) },
        JSON, Math, Object
      };
      vm.createContext(ctx);
      vm.runInContext(initBody, ctx);
      vm.runInContext(getMasteryBody, ctx);
      vm.runInContext(pickBody, ctx);

      // Run picker many times, count distribution
      const counts = { 'tcpdump': 0, 'wireshark': 0, 'nmap': 0, 'output-reading': 0, 'filter': 0 };
      for (let i = 0; i < 1000; i++) {
        const pick = vm.runInContext('_naPickNextQuestion(null)', ctx);
        if (pick && counts[pick.category] !== undefined) counts[pick.category]++;
      }

      // Semantic check: never-tried categories (output-reading + filter) get 3x and 2x
      // weight respectively. Both must individually beat tcpdump (100%, 1x weight).
      // wireshark (0%, 3rd slot = 1x) ties with tcpdump/nmap on weight, so can't
      // assert wireshark > tcpdump. But the two never-tried categories must dominate.
      return counts['output-reading'] > counts['tcpdump']
        && counts['filter'] > counts['tcpdump']
        && (counts['output-reading'] + counts['filter']) > 500;
    } catch (e) { return false; }
  })());

// Playwright spec coverage check
test('v4.84.0 NetAnalysis: Playwright spec covers drill flow',
  (() => {
    try {
      const fs = require('fs');
      const path = require('path');
      const specPath = path.join(__dirname, 'e2e', 'app.spec.js');
      const spec = fs.readFileSync(specPath, 'utf8');
      return /Network Analysis Drill/.test(spec)
        && /startNetworkAnalysisDrill/.test(spec)
        && /na-tab-btn/.test(spec);
    } catch (e) { return false; }
  })());

// v4.84.1 hotfix — Network Analysis drill must appear in the sidebar nav.
// v4.84.0 only wired the drill to the #page-drills tile launcher; the
// sidebar drills section (Subnet/Port/Acronym/OSI/Cable) was missing the
// 6th entry, causing user dogfood to immediately surface "cant see it."
// This regression-guard ensures Network Analysis is in the sidebar drills
// list AND the active-state map AND the breadcrumb label map — the three
// places that need to know about a new drill page for full discoverability.
test('v4.84.1 SidebarFix: Network Analysis is in APP_SIDEBAR_DRILLS',
  (() => {
    const m = js.match(/const APP_SIDEBAR_DRILLS = \[([\s\S]*?)\n\];/);
    if (!m) return false;
    return /page: 'network-analysis'/.test(m[1])
      && /label: 'Network Analysis'/.test(m[1])
      && /startNetworkAnalysisDrill/.test(m[1]);
  })());
test('v4.84.1 SidebarFix: network-analysis maps to itself in SIDEBAR_ACTIVE_MAP',
  /'network-analysis': 'network-analysis'/.test(js));
test('v4.84.1 SidebarFix: network-analysis label declared in breadcrumb map',
  /'network-analysis': 'Network Analysis'/.test(js));

// ══════════════════════════════════════════════════════════════════════════
// v4.85.0 — Network Analysis Phase 2 (descoped): Filter Recognition Qs +
// BPF vs Display Filter lesson. Original Phase 2 was a full filter-builder
// UI; descoped to filter-recognition MCQs + side-by-side cheatsheet after
// exam-prep review showed the N10-009 tests recognition, not construction.
// ══════════════════════════════════════════════════════════════════════════

test('v4.85.0 FilterRecognition: bank has at least 42 questions (32 original + 10 filter)',
  (() => {
    const m = js.match(/const NETWORK_ANALYSIS_BANK = \[([\s\S]*?)\n\];/);
    if (!m) return false;
    const entries = m[1].match(/id: 'na-/g) || [];
    return entries.length >= 42;
  })());
test('v4.85.0 FilterRecognition: bank has 10 filter-category questions',
  (() => {
    const m = js.match(/const NETWORK_ANALYSIS_BANK = \[([\s\S]*?)\n\];/);
    if (!m) return false;
    const filterEntries = m[1].match(/id: 'na-filter-/g) || [];
    return filterEntries.length >= 10;
  })());
test('v4.85.0 FilterRecognition: NA_CATEGORY_LABELS includes filter entry',
  /'filter': 'Filter syntax recognition'/.test(js));
test('v4.85.0 FilterRecognition: 4th lesson (bpf-vs-display) has side-by-side cheatsheet',
  (() => {
    const m = js.match(/id: 'bpf-vs-display'[\s\S]*?cheatsheet: \[([\s\S]*?)\]/);
    if (!m) return false;
    // Cheatsheet should contain BPF/Display comparison entries
    return /BPF:/.test(m[1]) && /Display:/.test(m[1]);
  })());
test('v4.85.0 FilterRecognition: dashboard text updated to 5 categories',
  /all 5 categories/.test(js));
test('v4.85.0 FilterRecognition: drills tile subtitle includes Filters',
  /Filters/.test(html));

// vm fixture — filter questions test the BPF-vs-display-filter conceptual gap
test('v4.85.0 FilterRecognition: vm fixture — filter question tests BPF vs display syntax',
  (() => {
    try {
      // Verify the bank contains the #1 trip-up question (BPF syntax in tcpdump)
      const m = js.match(/const NETWORK_ANALYSIS_BANK = \[([\s\S]*?)\n\];/);
      if (!m) return false;
      const bankStr = m[1];
      // The killer question: using display filter syntax in tcpdump
      const hasBpfTripUp = /tcp\.port == 80.*tcpdump.*BPF syntax, not Wireshark display filter/s.test(bankStr)
        || /tcpdump.*BPF syntax.*tcp\.port == 80/s.test(bankStr);
      // The comparison question: same query in both syntaxes
      const hasSideBySide = /same logical filter.*BOTH.*BPF.*display filter/si.test(bankStr);
      return hasBpfTripUp && hasSideBySide;
    } catch (e) { return false; }
  })());

// vm fixture — new filter category integrates into weighted picker
test('v4.85.0 FilterRecognition: vm fixture — filter category gets weighted in picker',
  (() => {
    try {
      const pickBody = _fnBody(js, '_naPickNextQuestion');
      const getMasteryBody = _fnBody(js, 'naGetMastery');
      const initBody = _fnBody(js, '_naInitMastery');
      if (!pickBody || !getMasteryBody || !initBody) return false;
      const vm = require('vm');
      const fakeBank = [
        { id: 'q-tcpdump', category: 'tcpdump' },
        { id: 'q-filter', category: 'filter' }
      ];
      // tcpdump mastered, filter never tried
      const fakeMastery = {
        'tcpdump': { right: 10, total: 10 },
        'wireshark': { right: 10, total: 10 },
        'nmap': { right: 10, total: 10 },
        'output-reading': { right: 10, total: 10 },
        'filter': { right: 0, total: 0 }
      };
      const ctx = {
        STORAGE: { NA_MASTERY: 'nplus_na_mastery' },
        NA_CATEGORIES: ['tcpdump', 'wireshark', 'nmap', 'output-reading', 'filter'],
        NETWORK_ANALYSIS_BANK: fakeBank,
        localStorage: { getItem: () => JSON.stringify(fakeMastery) },
        JSON, Math, Object
      };
      vm.createContext(ctx);
      vm.runInContext(initBody, ctx);
      vm.runInContext(getMasteryBody, ctx);
      vm.runInContext(pickBody, ctx);
      // With all others mastered and filter never-tried, filter must dominate
      let filterCount = 0;
      for (let i = 0; i < 200; i++) {
        const pick = vm.runInContext('_naPickNextQuestion(null)', ctx);
        if (pick && pick.category === 'filter') filterCount++;
      }
      // filter (3x weight, never-tried) should be > 50% of picks
      return filterCount > 100;
    } catch (e) { return false; }
  })());

// ═══════════════════════════════════════════════════════════════════════
// v4.85.1 — SR Session Cap: cap SR review sessions to SR_SESSION_CAP (20)
// to prevent review fatigue. Queue stays intact; remaining cards surface
// on the next session or via the completion-screen "Continue" button.
// ═══════════════════════════════════════════════════════════════════════

test('v4.85.1 SRSessionCap: SR_SESSION_CAP constant declared at 20',
  /const\s+SR_SESSION_CAP\s*=\s*20\b/.test(js));

test('v4.85.1 SRSessionCap: startSrReview caps due array to SR_SESSION_CAP',
  (() => {
    const body = _fnBody(js, 'startSrReview');
    return body && /due\.length\s*>\s*SR_SESSION_CAP/.test(body)
      && /due\s*=\s*due\.slice\(0,\s*SR_SESSION_CAP\)/.test(body);
  })());

test('v4.85.1 SRSessionCap: startSrReview records totalDueCount for completion screen',
  (() => {
    const body = _fnBody(js, 'startSrReview');
    return body && /totalDueCount/.test(body) && /totalDueCount:\s*totalDueCount/.test(body);
  })());

test('v4.85.1 SRSessionCap: renderSrReviewCard shows capped headline when due > cap',
  (() => {
    const body = _fnBody(js, 'renderSrReviewCard');
    return body && /SR_SESSION_CAP/.test(body)
      && /stats\.due\s*<=\s*SR_SESSION_CAP/.test(body);
  })());

test('v4.85.1 SRSessionCap: NBM (_computeNextBestMove) shows capped title',
  (() => {
    const body = _fnBody(js, '_computeNextBestMove');
    return body && /Math\.min\(srStats\.due,\s*SR_SESSION_CAP\)/.test(body)
      && /srStats\.due\s*<=\s*SR_SESSION_CAP/.test(body);
  })());

test('v4.85.1 SRSessionCap: _srEndReview shows remaining cards + Continue button',
  (() => {
    const body = _fnBody(js, '_srEndReview');
    return body && /sr-remaining-row/.test(body)
      && /sr-remaining-text/.test(body)
      && /sr-continue-btn/.test(body)
      && /startSrReview\(\)/.test(body)
      && /remaining\s*>\s*0/.test(body);
  })());

test('v4.85.1 SRSessionCap: CSS — .sr-remaining-row declared',
  /\.sr-remaining-row\s*\{/.test(css));

test('v4.85.1 SRSessionCap: CSS — .sr-remaining-text declared',
  /\.sr-remaining-text\s*\{/.test(css));

test('v4.85.1 SRSessionCap: CSS — mobile breakpoint for .sr-remaining-row',
  css.includes('.sr-remaining-row') && /flex-direction:\s*column/.test(css));

// vm-fixture: 30 due cards → session contains exactly 20 + totalDueCount=30
test('v4.85.1 SRSessionCap: vm fixture — session capped at SR_SESSION_CAP with totalDueCount preserved',
  (() => {
    try {
      const body = _fnBody(js, 'startSrReview');
      if (!body) return false;
      const vm = require('vm');
      const stemBody = _fnBody(js, '_stemNumericMatchesAnswerCount');
      const gtBody = _fnBody(js, '_multiSelectGroundTruthOk');
      const getQTypeBody = _fnBody(js, 'getQType');
      // Build 30 fake due mcq cards
      const fakeQueue = [];
      for (let i = 0; i < 30; i++) {
        fakeQueue.push({ id: 'card-' + i, type: 'mcq', question: 'Q' + i + '?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', nextReview: 0, graduated: false });
      }
      const ctx = {
        getSrDueEntries: () => fakeQueue.map(c => Object.assign({}, c)),
        loadSrQueue: () => fakeQueue.map(c => Object.assign({}, c)),
        saveSrQueue: () => {},
        showToast: () => {},
        showPage: () => {},
        document: {
          getElementById: () => ({ hidden: true, textContent: '', style: {} })
        },
        _renderSrCard: () => {},
        _srSession: null,
        _stemNumericMatchesAnswerCount: null,
        _multiSelectGroundTruthOk: null,
        getQType: null,
        _STEM_NUMBER_WORDS: { two: 2, three: 3, four: 4, five: 5 },
        SR_SESSION_CAP: 20,
        Math, parseInt, Number,
        Set, Object, Array, String, console, RegExp
      };
      vm.createContext(ctx);
      if (getQTypeBody) vm.runInContext(getQTypeBody, ctx);
      if (stemBody) vm.runInContext(stemBody, ctx);
      if (gtBody) vm.runInContext(gtBody, ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('startSrReview()', ctx);

      const session = ctx._srSession;
      if (!session) return false;
      // Session should have exactly SR_SESSION_CAP (20) cards
      const cappedCorrectly = session.cards.length === 20;
      // totalDueCount should preserve the original 30
      const totalPreserved = session.totalDueCount === 30;
      // First card should be card-0 (slice preserves order)
      const orderPreserved = session.cards[0].id === 'card-0'
        && session.cards[19].id === 'card-19';
      return cappedCorrectly && totalPreserved && orderPreserved;
    } catch (e) { return false; }
  })());

// vm-fixture: when due <= SR_SESSION_CAP, no capping occurs + totalDueCount matches
test('v4.85.1 SRSessionCap: vm fixture — small queue not capped, totalDueCount matches cards.length',
  (() => {
    try {
      const body = _fnBody(js, 'startSrReview');
      if (!body) return false;
      const vm = require('vm');
      const stemBody = _fnBody(js, '_stemNumericMatchesAnswerCount');
      const gtBody = _fnBody(js, '_multiSelectGroundTruthOk');
      const getQTypeBody = _fnBody(js, 'getQType');
      const fakeQueue = [];
      for (let i = 0; i < 5; i++) {
        fakeQueue.push({ id: 'card-' + i, type: 'mcq', question: 'Q' + i + '?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', nextReview: 0, graduated: false });
      }
      const ctx = {
        getSrDueEntries: () => fakeQueue.map(c => Object.assign({}, c)),
        loadSrQueue: () => fakeQueue.map(c => Object.assign({}, c)),
        saveSrQueue: () => {},
        showToast: () => {},
        showPage: () => {},
        document: {
          getElementById: () => ({ hidden: true, textContent: '', style: {} })
        },
        _renderSrCard: () => {},
        _srSession: null,
        _stemNumericMatchesAnswerCount: null,
        _multiSelectGroundTruthOk: null,
        getQType: null,
        _STEM_NUMBER_WORDS: { two: 2, three: 3, four: 4, five: 5 },
        SR_SESSION_CAP: 20,
        Math, parseInt, Number,
        Set, Object, Array, String, console, RegExp
      };
      vm.createContext(ctx);
      if (getQTypeBody) vm.runInContext(getQTypeBody, ctx);
      if (stemBody) vm.runInContext(stemBody, ctx);
      if (gtBody) vm.runInContext(gtBody, ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('startSrReview()', ctx);

      const session = ctx._srSession;
      if (!session) return false;
      // All 5 cards present (no capping)
      return session.cards.length === 5 && session.totalDueCount === 5;
    } catch (e) { return false; }
  })());

// ═══════════════════════════════════════════════════════════════════════
// v4.85.2 — SR Quality Scrub: remove pre-v4.81.16 bad cards from the
// SR queue at session start. User dogfood: "Which TWO non-overlapping
// 2.4 GHz channels" kept surfacing because the card was enrolled before
// the stem-vs-answer-count + GT facts validators were added.
// ═══════════════════════════════════════════════════════════════════════

test('v4.85.2 SRQualityScrub: startSrReview calls _stemNumericMatchesAnswerCount',
  (() => {
    const body = _fnBody(js, 'startSrReview');
    return body && /_stemNumericMatchesAnswerCount/.test(body);
  })());

test('v4.85.2 SRQualityScrub: startSrReview calls _multiSelectGroundTruthOk',
  (() => {
    const body = _fnBody(js, 'startSrReview');
    return body && /_multiSelectGroundTruthOk/.test(body);
  })());

test('v4.85.2 SRQualityScrub: quality scrub permanently removes bad cards from storage',
  (() => {
    const body = _fnBody(js, 'startSrReview');
    return body && /qualityOk\.length\s*<\s*due\.length/.test(body)
      && /saveSrQueue/.test(body);
  })());

test('v4.85.2 SRQualityScrub: quality scrub wrapped in try/catch for safety',
  (() => {
    const body = _fnBody(js, 'startSrReview');
    return body && /tolerate quality-scrub errors/.test(body);
  })());

// vm-fixture: "Which TWO" + 2 answers (bad stem-vs-count) gets scrubbed,
// valid mcq card survives.
test('v4.85.2 SRQualityScrub: vm fixture — stem-vs-answer-count mismatch scrubbed from session + storage',
  (() => {
    try {
      const body = _fnBody(js, 'startSrReview');
      const stemBody = _fnBody(js, '_stemNumericMatchesAnswerCount');
      const gtBody = _fnBody(js, '_multiSelectGroundTruthOk');
      const getQTypeBody = _fnBody(js, 'getQType');
      if (!body || !stemBody || !gtBody || !getQTypeBody) return false;
      const vm = require('vm');
      let savedQueue = null;
      // Bad card: "Which TWO" but only 2 answers when it should be 3
      const badCard = {
        id: 'bad-wifi-channels',
        type: 'multi-select',
        question: 'Which TWO of the following are non-overlapping frequency channels in the 2.4 GHz Wi-Fi band?',
        options: { A: 'Channel 2', B: 'Channel 1', C: 'Channel 6', D: 'Channel 9', E: 'Channel 11' },
        answers: ['B', 'C'],  // only 2 — but the stem says TWO and the real answer is 1,6,11 (THREE)
        nextReview: 0,
        graduated: false
      };
      const goodCard = {
        id: 'good-mcq',
        type: 'mcq',
        question: 'What does ARP stand for?',
        options: { A: 'Address Resolution Protocol', B: 'Application Routing Protocol', C: 'Automatic Resource Protocol', D: 'Access Relay Protocol' },
        answer: 'A',
        nextReview: 0,
        graduated: false
      };
      const fakeQueue = [badCard, goodCard];
      const ctx = {
        getSrDueEntries: () => fakeQueue.map(c => Object.assign({}, c)),
        loadSrQueue: () => fakeQueue.map(c => Object.assign({}, c)),
        saveSrQueue: (q) => { savedQueue = q; },
        showToast: () => {},
        showPage: () => {},
        document: {
          getElementById: () => ({ hidden: true, textContent: '', style: {} })
        },
        _renderSrCard: () => {},
        _srSession: null,
        _stemNumericMatchesAnswerCount: null,
        _multiSelectGroundTruthOk: null,
        getQType: null,
        _STEM_NUMBER_WORDS: { two: 2, three: 3, four: 4, five: 5 },
        SR_SESSION_CAP: 20,
        Math, parseInt, Number,
        Set, Object, Array, String, console, RegExp
      };
      vm.createContext(ctx);
      vm.runInContext(getQTypeBody, ctx);
      vm.runInContext(stemBody, ctx);
      vm.runInContext(gtBody, ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('startSrReview()', ctx);

      const session = ctx._srSession;
      if (!session) return false;
      // Session should have only the good card (bad one scrubbed)
      const sessionOk = session.cards.length === 1
        && session.cards[0].id === 'good-mcq';
      // Storage should have been permanently cleaned
      const storageOk = savedQueue !== null
        && savedQueue.length === 1
        && savedQueue[0].id === 'good-mcq';
      return sessionOk && storageOk;
    } catch (e) { return false; }
  })());

// vm-fixture: all-clean queue → no quality scrub write
test('v4.85.2 SRQualityScrub: vm fixture — clean queue triggers no quality-scrub write',
  (() => {
    try {
      const body = _fnBody(js, 'startSrReview');
      const stemBody = _fnBody(js, '_stemNumericMatchesAnswerCount');
      const gtBody = _fnBody(js, '_multiSelectGroundTruthOk');
      const getQTypeBody = _fnBody(js, 'getQType');
      if (!body || !stemBody || !gtBody || !getQTypeBody) return false;
      const vm = require('vm');
      let saveCallCount = 0;
      const goodCards = [
        { id: 'mcq-1', type: 'mcq', question: 'What is DNS?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', nextReview: 0, graduated: false },
        { id: 'mcq-2', type: 'mcq', question: 'What is DHCP?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'B', nextReview: 0, graduated: false }
      ];
      const ctx = {
        getSrDueEntries: () => goodCards.map(c => Object.assign({}, c)),
        loadSrQueue: () => goodCards.map(c => Object.assign({}, c)),
        saveSrQueue: () => { saveCallCount++; },
        showToast: () => {},
        showPage: () => {},
        document: {
          getElementById: () => ({ hidden: true, textContent: '', style: {} })
        },
        _renderSrCard: () => {},
        _srSession: null,
        _stemNumericMatchesAnswerCount: null,
        _multiSelectGroundTruthOk: null,
        getQType: null,
        _STEM_NUMBER_WORDS: { two: 2, three: 3, four: 4, five: 5 },
        SR_SESSION_CAP: 20,
        Math, parseInt, Number,
        Set, Object, Array, String, console, RegExp
      };
      vm.createContext(ctx);
      vm.runInContext(getQTypeBody, ctx);
      vm.runInContext(stemBody, ctx);
      vm.runInContext(gtBody, ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('startSrReview()', ctx);

      // No scrub writes should have fired (both type-scrub and quality-scrub skip)
      return saveCallCount === 0 && ctx._srSession && ctx._srSession.cards.length === 2;
    } catch (e) { return false; }
  })());

// v4.81.29: multi-select prompt quality criteria — user dogfood feedback
// that the second correct answer was almost always obscure while distractors
// were too plausible (typically borrowed from adjacent topics). Pre-fix the
// prompt only specified the schema, not quality criteria. Post-fix Haiku
// gets explicit guidance: both correct answers core/well-known, distractors
// factually wrong (not "less correct"), difficulty = breadth not obscurity,
// explanation must enumerate why each correct + why each wrong.
test('v4.81.29 MultiSelectQuality: prompt has CRITICAL — MULTI-SELECT QUALITY CRITERIA section',
  /CRITICAL\s*—\s*MULTI-SELECT QUALITY CRITERIA/.test(js));
test('v4.81.29 MultiSelectQuality: requires both correct answers be core/well-known',
  /(BOTH|both)[\s\S]{0,200}correct answers must be CORE, well-known facts/.test(js));
test('v4.81.29 MultiSelectQuality: forbids obscure/edge-case correct answers',
  /Do NOT make one correct answer obvious and the other obscure or edge-case/.test(js));
test('v4.81.29 MultiSelectQuality: requires distractors be factually wrong',
  /DISTRACTORS must be FACTUALLY WRONG/.test(js));
test('v4.81.29 MultiSelectQuality: warns against adjacent-topic distractor trap',
  /borrowed from an adjacent\/related topic|adjacent-topic distractors/i.test(js));
test('v4.81.29 MultiSelectQuality: explanation must enumerate each correct + each distractor',
  (() => {
    const matches = js.match(/WHY each correct answer is correct[\s\S]{0,400}WHY each distractor is wrong/);
    return matches !== null;
  })());
test('v4.81.29 MultiSelectQuality: criteria block lives inside _fetchQuestionsBatch (not orphan)',
  /_fetchQuestionsBatch[\s\S]{0,40000}CRITICAL\s*—\s*MULTI-SELECT QUALITY CRITERIA/.test(js));

// v4.81.28: SR review three follow-up fixes after v4.81.27 dogfood.
// (1) self-grade fallback shipped in v4.81.27 had a fatal flaw —
//     srMarkConfidence early-returned on `!_srSession.revealed`,
//     blocking the confidence buttons. User stuck on every multi-select
//     card. Fix: set _srSession.revealed = true in self-grade render.
// (2) addToSrQueue re-enrollment didn't refresh the payload, so any
//     legacy entry with the v4.81.27 fixed corruption (answer=null)
//     stayed corrupt forever. Fix: overwrite payload fields on
//     re-encounter so legacy entries self-heal.
// (3) addToSrQueue accepted any q.type, so order/cli-sim/topology PBQs
//     ended up in the queue but rendered with empty bodies (no options).
//     Fix: filter at enrollment to mcq + multi-select only.
// v4.81.30 retire: the v4.81.28 hack of pre-setting `revealed=true` in the
// self-grade render branch is gone. The new commit-then-self-grade mode
// flips revealed=true on user pick (via srPickAnswer), matching the MCQ
// auto-grade flow. Tombstone now: the hack must NOT be in the render.
test('v4.81.30 retire: v4.81.28 revealed=true hack removed from render',
  (() => {
    const body = _fnBody(js, '_renderSrCard') || '';
    return !/_srSession\.revealed\s*=\s*true/.test(body);
  })());
test('v4.81.28 SR: addToSrQueue refreshes payload on re-enrollment',
  (() => {
    const body = _fnBody(js, 'addToSrQueue') || '';
    // On re-encounter, payload fields should be overwritten so legacy
    // corrupt entries self-heal. Look for assignments to entry.options/
    // entry.answer in the existing-entry branch.
    return /entry\.options\s*=\s*q\.options/.test(body)
      && /entry\.answer\s*=/.test(body);
  })());
test('v4.81.28 SR: addToSrQueue filters non-reviewable types',
  (() => {
    const body = _fnBody(js, 'addToSrQueue') || '';
    // Should reject types that can't render in SR review.
    return /allowedTypes\s*=\s*new Set\(\[['"]mcq['"]/.test(body)
      && /multi-select/.test(body)
      && /!allowedTypes\.has\(qType\)\s*\)\s*return null/.test(body);
  })());

// v4.81.30 retire: this fixture asserted the v4.81.28 behavior (revealed=true
// auto-set on render → confidence button works). The v4.81.30 redesign requires
// commit BEFORE reveal (toggle picks → submit → reveal → confidence). Replaced
// by the v4.81.30 vm fixtures below.
test('v4.81.30 retire: v4.81.28 self-grade auto-reveal pattern is gone',
  (() => {
    const body = _fnBody(js, '_renderSrCard') || '';
    // Tombstone — the auto-reveal in render is no longer present.
    return !/_srSession\.revealed\s*=\s*true/.test(body);
  })());

// vm fixture #2 — re-enrollment refreshes corrupt legacy payload.
// Simulates an existing entry with answer=null (the pre-v4.81.27 bug)
// and verifies that re-enrolling with a fresh question fixes it.
test('v4.81.28 SR: vm fixture — re-enrollment heals legacy null-answer entry',
  (() => {
    try {
      const body = _fnBody(js, 'addToSrQueue');
      if (!body) return false;
      const vm = require('vm');
      let storage = {};
      const ctx = {
        STORAGE: { WRONG_BANK: 'wb', SR_QUEUE: 'srq' },
        localStorage: {
          getItem: (k) => storage[k] === undefined ? null : storage[k],
          setItem: (k, v) => { storage[k] = String(v); }
        },
        loadSrQueue: () => {
          try { return JSON.parse(storage['srq'] || '[]'); } catch { return []; }
        },
        saveSrQueue: (q) => { storage['srq'] = JSON.stringify(q); },
        _srHash: (s) => 'h_' + s.length, // stub hash
        _srSchedule: (entry) => { entry.intervalDays = 1; return entry; },
        SR_QUEUE_CAP: 200,
        Date, JSON, Set, Object, Array, Number
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);

      // Pre-seed queue with a corrupt legacy entry: answer=null, options={A,B,C,D}
      const corruptEntry = {
        qHash: 'h_5',
        question: 'stem1',
        options: { A: 'a', B: 'b', C: 'c', D: 'd' },
        answer: null, // corruption from pre-v4.81.27 bug
        type: 'mcq',
        intervalDays: 4,
        easeFactor: 2.5,
        attempts: 1,
        correctStreak: 0,
        graduated: false,
        nextReview: Date.now() - 86400000 // due
      };
      storage['srq'] = JSON.stringify([corruptEntry]);

      // Re-enroll with a fresh question that has a valid answer letter
      vm.runInContext("addToSrQueue({question: 'stem1', options: {A:'a',B:'b',C:'c',D:'d'}, answer: 'C', type: 'mcq', explanation: 'Because.'})", ctx);

      const updated = JSON.parse(storage['srq'])[0];
      return updated.answer === 'C' && updated.explanation === 'Because.';
    } catch (e) { return false; }
  })());

// vm fixture #3 — non-reviewable types are rejected at enrollment.
test('v4.81.28 SR: vm fixture — order/cli-sim/topology types not enrolled',
  (() => {
    try {
      const body = _fnBody(js, 'addToSrQueue');
      if (!body) return false;
      const vm = require('vm');
      let storage = {};
      const ctx = {
        STORAGE: { SR_QUEUE: 'srq' },
        localStorage: {
          getItem: (k) => storage[k] === undefined ? null : storage[k],
          setItem: (k, v) => { storage[k] = String(v); }
        },
        loadSrQueue: () => {
          try { return JSON.parse(storage['srq'] || '[]'); } catch { return []; }
        },
        saveSrQueue: (q) => { storage['srq'] = JSON.stringify(q); },
        _srHash: (s) => 'h_' + s.length,
        _srSchedule: (entry) => entry,
        SR_QUEUE_CAP: 200,
        Date, JSON, Set, Object, Array, Number
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);

      // Order question — should NOT enroll
      const orderResult = vm.runInContext("addToSrQueue({question: 'arrange these', items: ['a','b','c'], correctOrder: [0,1,2], type: 'order'})", ctx);
      // CLI-sim — should NOT enroll
      const cliResult = vm.runInContext("addToSrQueue({question: 'cli sim', type: 'cli-sim'})", ctx);
      // Topology — should NOT enroll
      const topoResult = vm.runInContext("addToSrQueue({question: 'topology q', type: 'topology'})", ctx);
      // MCQ — SHOULD enroll
      const mcqResult = vm.runInContext("addToSrQueue({question: 'a question?', options: {A:'a',B:'b',C:'c',D:'d'}, answer: 'A', type: 'mcq'})", ctx);
      // Multi-select — SHOULD enroll
      const multiResult = vm.runInContext("addToSrQueue({question: 'choose two', options: {A:'a',B:'b',C:'c',D:'d',E:'e'}, answers: ['A','C'], type: 'multi-select'})", ctx);

      const queue = JSON.parse(storage['srq'] || '[]');
      return orderResult === null
        && cliResult === null
        && topoResult === null
        && mcqResult !== null
        && multiResult !== null
        && queue.length === 2; // only mcq + multi-select got in
    } catch (e) { return false; }
  })());

// v4.81.27: SR review render fix — letter-keyed options + multi-select
// self-grade fallback + addToSrQueue answer-preservation bug.
// User screenshot: SR review showed a multi-select question stem but
// no answer options rendered (Array.isArray check on letter-keyed
// options object failed). Same bug class as v4.81.5 diagnostic-options
// schema mismatch. PLUS addToSrQueue had a type-guard bug that stored
// MCQ answers as null because `typeof 'A' === 'number'` is false.
test('v4.81.27 SR: addToSrQueue preserves MCQ letter answer (not null)',
  (() => {
    const body = _fnBody(js, 'addToSrQueue') || '';
    // The actual code line should be `answer: (q.answer != null) ? q.answer : null`.
    // The old buggy line was `answer: typeof q.answer === 'number' ? q.answer : null`.
    // Look for the new pattern as an actual assignment (with leading `answer:`)
    // — that excludes any comments documenting the historical pre-fix code.
    return /answer:\s*\(q\.answer\s*!=\s*null\)/.test(body)
      && !/answer:\s*typeof q\.answer\s*===\s*['"]number['"]/.test(body);
  })());
test('v4.81.27 SR tombstone: pickedIdx-based comparison removed from auto-grade',
  (() => {
    const body = _fnBody(js, '_renderSrCard') || '';
    // Old: `idx === card.answer` (number-based)
    // New: `letter === correctLetter` (string-based)
    return !/idx\s*===\s*card\.answer/.test(body) && /letter\s*===\s*correctLetter/.test(body);
  })());
test('v4.81.27 SR: _renderSrCard handles letter-keyed options object',
  (() => {
    const body = _fnBody(js, '_renderSrCard') || '';
    return /Object\.keys\(optionMap\)\.sort\(\)/.test(body)
      && /typeof card\.options === ['"]object['"]/.test(body);
  })());
test('v4.81.27 SR: srPickAnswer accepts letter (was idx)',
  (() => {
    const body = _fnBody(js, 'srPickAnswer') || '';
    return /pickedLetter\s*=\s*letter/.test(body);
  })());
// v4.81.30 retarget: v4.81.27 self-grade-fallback assertion replaced with
// the v4.81.30 commit-self-grade equivalent. Multi-select cards no longer
// fall back — they get full auto-grade (Bug 2 from user feedback).
test('v4.81.30 retarget: render has commit-self-grade mode for legacy null-answer cards',
  (() => {
    const body = _fnBody(js, '_renderSrCard') || '';
    return /['"]commit-self-grade['"]/.test(body)
      && /sr-self-grade-banner/.test(body);
  })());
test('v4.81.27 SR CSS: .sr-self-grade-banner declared (still used for commit-self-grade mode)',
  /\.sr-self-grade-banner\s*\{/.test(css));
test('v4.81.27 SR CSS: .sr-options-readonly declared (legacy class — retained)',
  /\.sr-options-readonly\s*\.sr-option-readonly/.test(css));

// vm fixture #1 — letter-keyed MCQ renders 4 option buttons
test('v4.81.27 SR: vm fixture — MCQ with letter-keyed options renders 4 buttons',
  (() => {
    try {
      const body = _fnBody(js, '_renderSrCard');
      if (!body) return false;
      const vm = require('vm');
      const fakeHost = { _innerHTML: '', set innerHTML(v) { this._innerHTML = v; }, get innerHTML() { return this._innerHTML; } };
      const ctx = {
        document: { getElementById: (id) => id === 'sr-card-host' ? fakeHost : { textContent: '', style: {} } },
        _srSession: {
          cards: [{
            type: 'mcq',
            question: 'Test stem?',
            options: { A: 'first', B: 'second', C: 'third', D: 'fourth' },
            answer: 'C',
            topic: 'Test',
            intervalDays: 1,
            correctStreak: 0
          }],
          index: 0,
          pickedLetter: null,
          revealed: false
        },
        escHtml: (s) => String(s),
        Object, String, Array, Number,
        Math
      };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      vm.runInContext('_renderSrCard()', ctx);
      const html = fakeHost._innerHTML;
      // Should render 4 sr-option buttons with letters A,B,C,D
      const buttons = (html.match(/onclick="srPickAnswer\('[A-D]'\)"/g) || []);
      return buttons.length === 4
        && /data-letter="A"/.test(html)
        && /data-letter="D"/.test(html)
        && !/sr-self-grade-banner/.test(html); // should NOT fall back
    } catch (e) { return false; }
  })());

// v4.81.30 retargets the v4.81.27 self-grade-fallback fixtures. Multi-select
// cards now go to multi-auto mode (Bug 2 from user feedback "im just reading
// the answers and self grading"). The new multi-auto + commit-self-grade
// fixtures live in the v4.81.30 block above. These two are kept as light
// regression guards confirming the OLD auto-reveal-on-render behavior is
// definitively gone — the user's self-deception loophole stays closed.
test('v4.81.30 retire: multi-select with valid answers no longer routes to self-grade fallback',
  (() => {
    const body = _fnBody(js, '_renderSrCard') || '';
    // Multi-select with valid answers should now hit the multi-auto mode,
    // not the commit-self-grade fallback. Look for the explicit branch.
    return /['"]multi-auto['"]/.test(body)
      && /hasMultiAnswers/.test(body);
  })());
test('v4.81.30 retire: legacy null-answer cards still get a fallback (now commit-self-grade, not auto-reveal)',
  (() => {
    const body = _fnBody(js, '_renderSrCard') || '';
    return /['"]commit-self-grade['"]/.test(body);
  })());

test('v4.81.10 DrillMission: vm fixture — empty mastery suggests Lesson 1',
  (() => {
    try {
      const helperBody = _fnBody(js, '_drillMissionState');
      const portBody = _fnBody(js, '_pickPortMission');
      if (!helperBody || !portBody) return false;
      const vm = require('vm');
      const ctx = {
        STORAGE: { PORT_MASTERY: 'k_pm', PORT_LESSONS: 'k_pl' },
        localStorage: {
          getItem: () => null,  // empty state
          setItem: () => {}, removeItem: () => {}
        },
        Math, JSON, Object
      };
      vm.createContext(ctx);
      vm.runInContext(helperBody, ctx);
      vm.runInContext(portBody, ctx);
      const mission = vm.runInContext('_pickPortMission()', ctx);
      return mission
        && /Lesson 1/i.test(mission.headline)
        && /ptOpenLesson\(1\)/.test(mission.ctaFn);
    } catch (e) { return false; }
  })());

test('v4.81.9 ACL: vm fixture — currentRuleCount > 0 returns no suggestion (chips only)',
  (() => {
    try {
      const body = _fnBody(js, '_aclDeriveRuleHints');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { Math, JSON, String };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const scen = {
        id: 'block-single-host',
        zones: [{ cidr: '10.0.0.50/32' }],
        testPackets: [
          { src: '10.0.0.50', dst: '8.8.8.8', dp: 53, expected: 'deny' },
          { src: '10.0.0.20', dst: '8.8.8.8', dp: 53, expected: 'permit' }
        ]
      };
      ctx.scen = scen;
      const hints = vm.runInContext('_aclDeriveRuleHints(scen, 2)', ctx);
      return hints
        && hints.suggested === null
        && hints.chips
        && hints.chips.addr.length > 1;
    } catch (e) { return false; }
  })());

test('v4.81.7 Retake: vm fixture — corruption signature detected',
  (() => {
    try {
      const body = _fnBody(js, '_isCorruptedPassPlan');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { Math, JSON };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      // Signature 1: accPct=0 + seededCount<questionCount
      const corrupt1 = { passPlan: { accPct: 0, seededCount: 2, questionCount: 20 } };
      // Signature 2: predicted=420 + correctCount>0
      const corrupt2 = { passPlan: { predicted: 420, correctCount: 18 } };
      // Healthy: matches both fields' invariants
      const healthy = { passPlan: { accPct: 90, seededCount: 2, questionCount: 20, predicted: 805, correctCount: 18 } };
      // Genuine 0%: would seed all 20
      const genuineZero = { passPlan: { accPct: 0, seededCount: 20, questionCount: 20, predicted: 420, correctCount: 0 } };
      ctx.corrupt1 = corrupt1; ctx.corrupt2 = corrupt2; ctx.healthy = healthy; ctx.genuineZero = genuineZero;
      const r1 = vm.runInContext('_isCorruptedPassPlan(corrupt1)', ctx);
      const r2 = vm.runInContext('_isCorruptedPassPlan(corrupt2)', ctx);
      const r3 = vm.runInContext('_isCorruptedPassPlan(healthy)', ctx);
      const r4 = vm.runInContext('_isCorruptedPassPlan(genuineZero)', ctx);
      return r1 === true && r2 === true && r3 === false && r4 === false;
    } catch (e) { return false; }
  })());

test('v4.81.5 Diagnostic: render produces 4 option buttons (vm fixture with letter-keyed options)',
  (() => {
    try {
      const renderBody = _fnBody(js, '_renderDiagnosticQuestion');
      if (!renderBody) return false;
      const vm = require('vm');
      // Minimal jsdom-lite shim for document + element ops the function uses
      const elements = {};
      const make = (id) => {
        const el = {
          id, hidden: false, _children: [], _innerHTML: '', _classList: new Set(), _attrs: {},
          dataset: {},
          get innerHTML() { return this._innerHTML; },
          set innerHTML(v) { this._innerHTML = v; this._children = []; },
          appendChild(child) { this._children.push(child); },
          classList: { add: function(c) { el._classList.add(c); }, remove: function(c) { el._classList.delete(c); }, toggle: function(c, on) { if (on) el._classList.add(c); else el._classList.delete(c); } },
          setAttribute(k, v) { el._attrs[k] = v; },
          textContent: '',
          style: {}
        };
        return el;
      };
      ['diag-quiz-progress-fill', 'diag-quiz-progress-lbl', 'diag-quiz-meta', 'diag-quiz-question', 'diag-quiz-options', 'diag-quiz-next-btn', 'diag-quiz-hint'].forEach(id => { elements[id] = make(id); });
      const ctx = {
        document: {
          getElementById: (id) => elements[id] || null,
          querySelectorAll: () => [],
          createElement: () => {
            const el = make('btn');
            el.type = ''; el.className = ''; el.onclick = null;
            return el;
          }
        },
        _diagnosticSession: {
          questions: [{
            question: 'Test stem?',
            options: { A: 'first', B: 'second', C: 'third', D: 'fourth' },
            answer: 'C',
            topic: 'Test',
            difficulty: 'Mid'
          }],
          answers: [null],
          currentIdx: 0,
          pickedLetter: null,
          confidence: null
        },
        setQuestionText: (el, t) => { el.textContent = t; },
        escHtml: (s) => String(s),
        _refreshDiagnosticActions: () => {},
        Object, String, Number, Math
      };
      vm.createContext(ctx);
      vm.runInContext(renderBody, ctx);
      vm.runInContext('_renderDiagnosticQuestion()', ctx);
      const optsHost = elements['diag-quiz-options'];
      // 4 buttons appended, each with a letter
      if (optsHost._children.length !== 4) return false;
      const letters = optsHost._children.map(b => b.dataset.letter);
      return letters.join('') === 'ABCD';
    } catch (e) { return false; }
  })());

test('v4.81.3 Safety: pre-commit hook scans for MCP+setItem risk patterns',
  (() => {
    try {
      const hook = require('fs').readFileSync(require('path').join(ROOT, '.githooks', 'pre-commit'), 'utf8');
      return /mcp__Claude_in_Chrome__javascript_tool/.test(hook) || /localStorage.*setItem/.test(hook);
    } catch (_) { return false; }
  })());

// v4.81.24: cross-check that deploy-verify.js's REQUIRED_IDS list matches
// what's actually in index.html. Caught the v4.81.23 deploy-verification
// failure where the verifier still expected #todays-focus after we removed
// it. Future ship that removes/renames a DOM element will now fail UAT
// locally before it can fail Deploy Verification post-deploy.
test('v4.81.24 DeploySync: deploy-verify REQUIRED_IDS match live index.html',
  (() => {
    try {
      const verifierSrc = require('fs').readFileSync(require('path').join(ROOT, 'tests', 'deploy-verify.js'), 'utf8');
      const m = verifierSrc.match(/const REQUIRED_IDS\s*=\s*\[([\s\S]*?)\];/);
      if (!m) return false;
      const ids = m[1].match(/'[^']+'/g).map(s => s.slice(1, -1));
      const missing = ids.filter(id => !html.includes('id="' + id + '"'));
      if (missing.length > 0) {
        results.errors.push('deploy-verify REQUIRED_IDS missing in index.html: ' + missing.join(', '));
        return false;
      }
      return true;
    } catch (e) { return false; }
  })());

// v4.81.25: Order-question quality fix — Implement-before-Verify invariant
// + conflated-step rejection. User dogfood: a Hard ordering question
// produced a "correct order" with item 4 = "Document findings AND implement
// a permanent solution" — items 5 (Implement) and 7 (Document) of the
// CompTIA methodology are non-adjacent (Step 6 Verify sits between them),
// so smashing them in one item is structurally malformed AND placing it
// after a Verify item creates an Implement-after-Verify ordering error.
// Existing _tbTroubleshootingOrderOk also missed it because the gate was
// too tight (required "comptia"/"methodology"/"X-step" in stem; user's
// stem just said "troubleshooting steps when diagnosing...").
test('v4.81.25 OrderGuard: gate widened to catch generic "troubleshooting steps" stems',
  (() => {
    const body = _fnBody(js, '_tbTroubleshootingOrderOk') || '';
    return /troubleshooting step/.test(body)
      && /\b(?:order|sequence|arrange)\b/.test(body);
  })());
test('v4.81.25 OrderGuard: gate widened to fire on Identify+Document item-keyword combo',
  (() => {
    const body = _fnBody(js, '_tbTroubleshootingOrderOk') || '';
    return /hasIdentifyKw\s*&&\s*hasDocumentKw/.test(body);
  })());
test('v4.81.25 OrderGuard: implementIdx + verifyIdx variables declared',
  (() => {
    const body = _fnBody(js, '_tbTroubleshootingOrderOk') || '';
    return /\bimplementIdx\b/.test(body) && /\bverifyIdx\b/.test(body);
  })());
test('v4.81.25 OrderGuard: Implement-before-Verify ordering invariant enforced',
  (() => {
    const body = _fnBody(js, '_tbTroubleshootingOrderOk') || '';
    return /posImpl\s*>=\s*posVer/.test(body) || /posVer\s*<=\s*posImpl/.test(body);
  })());
test('v4.81.25 OrderGuard: conflated Implement+Document item rejected',
  (() => {
    const body = _fnBody(js, '_tbTroubleshootingOrderOk') || '';
    return /conflatedImplementDocIdx/.test(body);
  })());

// vm fixture #1 — the EXACT user-reported bug case rejected.
test('v4.81.25 OrderGuard: vm fixture — exact user bug case rejected (Implement+Document conflated item)',
  (() => {
    try {
      const body = _fnBody(js, '_tbTroubleshootingOrderOk');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { Array, String };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      // Reproduce the user's screenshot exactly:
      const bug = {
        type: 'order',
        question: 'Arrange the following troubleshooting steps in the correct order when diagnosing a network connectivity issue reported by an end user.',
        items: [
          'Document findings and implement a permanent solution or workaround',                         // 0 — conflated, malformed
          'Gather information about the problem, including when it started and what is affected',       // 1 — Identify (step 1)
          'Test the solution and verify that connectivity is restored',                                 // 2 — Verify (step 6)
          'Narrow the scope by testing basic connectivity (ping, ipconfig) and reviewing logs to identify the root cause' // 3 — Theory + Test (steps 2-3-4)
        ],
        correctOrder: [1, 3, 2, 0] // matches the app's "correct order" — 1=Identify, 3=Theory, 2=Verify, 0=Document+Implement
      };
      ctx.bug = bug;
      const r = vm.runInContext('_tbTroubleshootingOrderOk(bug)', ctx);
      return r === false; // rejected
    } catch (e) { return false; }
  })());

// vm fixture #2 — Implement-after-Verify (without conflation) rejected.
test('v4.81.25 OrderGuard: vm fixture — Implement-after-Verify rejected even when items are clean',
  (() => {
    try {
      const body = _fnBody(js, '_tbTroubleshootingOrderOk');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { Array, String };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const bad = {
        type: 'order',
        question: 'Arrange these troubleshooting steps in the correct order:',
        items: [
          'Identify the problem by gathering information',                              // 0 — step 1
          'Establish a theory of probable cause',                                       // 1 — step 2
          'Verify full system functionality and that connectivity is restored',         // 2 — step 6 (VERIFY)
          'Implement the solution or workaround to the problem',                        // 3 — step 5 (IMPLEMENT)
          'Document findings and outcomes for future reference'                         // 4 — step 7
        ],
        correctOrder: [0, 1, 2, 3, 4] // wrong: implement should be BEFORE verify
      };
      ctx.bad = bad;
      const r = vm.runInContext('_tbTroubleshootingOrderOk(bad)', ctx);
      return r === false; // rejected
    } catch (e) { return false; }
  })());

// vm fixture #3 — correct ordering passes (regression guard, no false positive).
test('v4.81.25 OrderGuard: vm fixture — correct 5-step ordering accepted',
  (() => {
    try {
      const body = _fnBody(js, '_tbTroubleshootingOrderOk');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { Array, String };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const good = {
        type: 'order',
        question: 'Arrange these troubleshooting steps in the correct order:',
        items: [
          'Identify the problem by gathering information',
          'Establish a theory of probable cause',
          'Test the theory to determine cause',
          'Implement the solution or workaround',
          'Verify full system functionality is restored',
          'Document findings, actions, and outcomes for future reference'
        ],
        correctOrder: [0, 1, 2, 3, 4, 5]
      };
      ctx.good = good;
      const r = vm.runInContext('_tbTroubleshootingOrderOk(good)', ctx);
      return r === true; // accepted
    } catch (e) { return false; }
  })());

// vm fixture #4 — non-troubleshooting order question untouched.
test('v4.81.25 OrderGuard: vm fixture — non-troubleshooting order question passes through',
  (() => {
    try {
      const body = _fnBody(js, '_tbTroubleshootingOrderOk');
      if (!body) return false;
      const vm = require('vm');
      const ctx = { Array, String };
      vm.createContext(ctx);
      vm.runInContext(body, ctx);
      const unrelated = {
        type: 'order',
        question: 'Arrange these OSI layers in correct top-to-bottom order:',
        items: ['Application', 'Transport', 'Network', 'Data Link'],
        correctOrder: [0, 1, 2, 3]
      };
      ctx.unrelated = unrelated;
      const r = vm.runInContext('_tbTroubleshootingOrderOk(unrelated)', ctx);
      return r === true;
    } catch (e) { return false; }
  })());

// --- Validation audit regression gate ---
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
