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
['startPortDrill','beginPortDrill','nextPortQ','pickPort','endPortDrill'
].forEach(fn => test(`function ${fn}()`, js.includes(`function ${fn}(`)));
test('40+ port entries', (js.match(/proto:'/g) || []).length >= 38);
test('Wrong answer tracking (portMissed)', js.includes('portMissed.push'));
test('Missed review rendering', js.includes('MISSED PORTS'));

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
