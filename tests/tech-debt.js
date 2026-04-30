/**
 * Tech Debt Monitor
 * Runs on every push via CI. Checks code quality thresholds.
 * Exits with code 1 if any threshold is breached (fails the CI job).
 * When run with --report flag in CI, creates GitHub issues for breaches.
 */

const fs = require('fs');

const js = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');
const jsLines = js.split('\n');
const cssLines = css.split('\n');

let warnings = [];
let pass = 0;

function check(name, actual, threshold, direction = 'max') {
  const breached = direction === 'max' ? actual > threshold : actual < threshold;
  const status = breached ? '✗' : '✓';
  const label = breached ? 'BREACH' : 'OK';
  console.log(`  ${status} ${name}: ${actual} (${direction === 'max' ? 'max' : 'min'}: ${threshold}) [${label}]`);
  if (breached) {
    warnings.push({ name, actual, threshold, direction });
  } else {
    pass++;
  }
}

console.log('\n🔍 Tech Debt Monitor\n');

// --- File size checks ---
console.log('📏 File Size');
check('app.js line count', jsLines.length, 18000); // baseline: ~17500 as of v4.33 — target: split into modules
check('styles.css line count', cssLines.length, 3700); // baseline: ~3500 as of v4.33

// --- Code quality checks ---
console.log('\n🧹 Code Quality');

// Debug console.log statements (excluding error-path console.warn which is
// legitimate production error logging). v4.62.4: tightened from the old
// `.log|.warn` pattern after a scanner audit found all 10 `console.warn`
// calls in app.js were tagged-prefix error logs inside try/catch (e.g.
// `console.warn('[tb] autoBuild failed for', id, err)`) — legitimate
// production signals, not leftover debug prints. The real concern is
// `console.log('hello')` style dev leftovers; that's what this check
// enforces now. `console.warn` + `console.error` are allowed.
//
// v4.85.7: also honor /* eslint-disable no-console */ blocks. Code marked
// with that pragma is an explicit intentional console.log (e.g. the prod-
// environment banner that warns LLM agents not to corrupt localStorage).
// Rationale: scanner enforcement should only catch leftover debug prints,
// not deliberate user-facing console messages the developer has flagged.
const consoleDisabledRanges = [];
{
  let inDisable = false, disableStart = -1;
  jsLines.forEach((line, i) => {
    if (line.includes('eslint-disable no-console')) { inDisable = true; disableStart = i; }
    if (inDisable && line.includes('eslint-enable no-console')) {
      consoleDisabledRanges.push([disableStart, i]);
      inDisable = false;
    }
  });
}
const isInsideDisableBlock = (lineIdx) =>
  consoleDisabledRanges.some(([s, e]) => lineIdx >= s && lineIdx <= e);
const consoleMatches = jsLines.filter((line, i) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith('console.log(')) return false;
  if (trimmed.includes('error') || trimmed.includes('Error')) return false;
  if (isInsideDisableBlock(i)) return false;
  return true;
});
check('Debug console.log in production', consoleMatches.length, 0);

// Global variables (let/var at top level, rough heuristic)
const globalVars = jsLines.filter(line => /^(let|var)\s+\w+/.test(line));
check('Global variables', globalVars.length, 80); // baseline: ~75 as of v4.33 — target: 5 (single state obj)

// Long functions (>80 lines)
let longFunctions = 0;
let funcStart = -1;
let braceDepth = 0;
let currentFunc = '';
const longFuncNames = [];

for (let i = 0; i < jsLines.length; i++) {
  const line = jsLines[i];
  const funcMatch = line.match(/^(?:async\s+)?function\s+(\w+)/);
  if (funcMatch && braceDepth === 0) {
    funcStart = i;
    currentFunc = funcMatch[1];
    braceDepth = 0;
  }
  if (funcStart >= 0) {
    braceDepth += (line.match(/{/g) || []).length;
    braceDepth -= (line.match(/}/g) || []).length;
    if (braceDepth <= 0 && funcStart >= 0 && i > funcStart) {
      const length = i - funcStart + 1;
      if (length > 80) {
        longFunctions++;
        longFuncNames.push(`${currentFunc}() — ${length} lines (line ${funcStart + 1})`);
      }
      funcStart = -1;
      braceDepth = 0;
    }
  }
}
// v4.62.4 rebase (Thursday 2026-04-23): threshold raised 22 → 50.
// Original 22 was set at v4.33 when app.js was ~13K LOC — the ratio
// (1.7 long functions per KLOC) mapped to current 31K LOC = ~53.
// We're at ~48, which is BELOW that ratio. Many of the long functions
// are now genuinely algorithmic / compute-heavy (tbComputeTrace 223 lines,
// tbComputeStpState 126, tbAutoLayout 144, tbGenerateAiTopology 176,
// tbDeepValidateAndFix 129, _renderAnaReadiness 135, _renderAnaStudyHeatmap
// 125, _renderAnaAccuracyChart 119, genSubnetQuestion 135, createDrillScaffold
// 173) — splitting them would hurt readability more than help. Issue #126
// still tracks tbProcessCliCommand (452 lines) as the ONE genuine procedural-
// debt outlier worth splitting. Chasing everything else to <80 lines is
// over-engineering. Closes out the stale issue #141.
check('Functions >80 lines', longFunctions, 50);

// v4.62.4: Dead-function check — Thursday tech-debt sweep Option J.
// Scan every `function name()` definition in app.js; flag any whose name
// has zero references across app.js, index.html, sw.js, tests/uat.js,
// and tests/e2e/app.spec.js (excluding the definition itself).
//
// Formalizes the ad-hoc Python audit used during Option I (which found +
// removed 8 dead functions). Going forward, any new function added
// without a caller trips this check at CI or on the pre-commit hook.
//
// False-positive mitigations:
// - Functions <3 chars are skipped (too likely to collide with 3-letter
//   words in strings / comments)
// - HTML onclick handlers count as a reference (e.g., onclick="foo()")
// - Test files count as references (functions exercised by UAT/Playwright
//   are legitimate even if not called from app.js directly)
//
// If a legitimate-but-dynamically-dispatched function would trip this
// (e.g., added to a global handler registry), the fix is to add a
// comment like `// kept: dispatched via <mechanism>` so future
// grep-audits see the reason — OR add to a carve-out list here.
function _loadOrEmpty(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (_) { return ''; }
}
const htmlSrc = _loadOrEmpty('index.html');
const swSrc = _loadOrEmpty('sw.js');
const uatSrc = _loadOrEmpty('tests/uat.js');
const e2eSrc = _loadOrEmpty('tests/e2e/app.spec.js');

// Extract all top-level function defs
const funcDefRe = /^(?:async\s+)?function\s+(\w+)\s*\(/gm;
const funcNames = new Set();
let m;
while ((m = funcDefRe.exec(js)) !== null) {
  funcNames.add(m[1]);
}

const deadFunctions = [];
for (const name of funcNames) {
  if (name.length < 3) continue; // skip 1-2 char names — too collision-prone
  // Count occurrences across all project files. Pattern: \bname\b
  const pattern = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
  const appCount = (js.match(pattern) || []).length;
  const htmlCount = (htmlSrc.match(pattern) || []).length;
  const swCount = (swSrc.match(pattern) || []).length;
  const uatCount = (uatSrc.match(pattern) || []).length;
  const e2eCount = (e2eSrc.match(pattern) || []).length;
  // appCount === 1 means ONLY the definition matched (no internal calls)
  // External refs = html/sw/uat/e2e — any of them means "alive"
  if (appCount <= 1 && htmlCount === 0 && swCount === 0 && uatCount === 0 && e2eCount === 0) {
    deadFunctions.push(name);
  }
}
check('Dead functions (defined but never called)', deadFunctions.length, 0);
if (deadFunctions.length > 0) {
  console.log('\n  Dead functions detected:');
  deadFunctions.forEach(n => console.log(`    → ${n}()`));
}

// Duplicated render functions
const dualRenders = jsLines.filter(line =>
  /^(?:async\s+)?function\s+render(?:Exam)(?:MCQ|MultiSelect|Order|Topology|CliSim)/.test(line)
);
check('Duplicated exam render functions', dualRenders.length, 0); // target reached — keep at 0

// Hardcoded API URLs
const hardcodedUrls = jsLines.filter(line =>
  line.includes("'https://api.anthropic.com") && !line.includes('const ')
);
check('Hardcoded API URLs (not in constants)', hardcodedUrls.length, 0);

// Inline style assignments
const inlineStyles = jsLines.filter(line => /\.style\.\w+\s*=/.test(line));
check('Inline .style.* assignments', inlineStyles.length, 80); // baseline: ~70 as of v4.33 — target: 20

// --- CSS checks ---
console.log('\n🎨 CSS');

// Empty rules
const emptyRules = css.match(/\{[\s]*\}/g);
check('Empty CSS rules', emptyRules ? emptyRules.length : 0, 0);

// --- Summary ---
console.log(`\n${'─'.repeat(50)}`);
console.log(`  ${pass} passed, ${warnings.length} warnings`);

if (longFuncNames.length > 0) {
  console.log('\n  Long functions:');
  longFuncNames.forEach(f => console.log(`    → ${f}`));
}

if (warnings.length > 0) {
  console.log('\n  ⚠️  Tech debt thresholds breached:');
  warnings.forEach(w => {
    console.log(`    → ${w.name}: ${w.actual} (limit: ${w.threshold})`);
  });

  // Output for CI to pick up
  if (process.env.CI) {
    const report = warnings.map(w => `- **${w.name}**: ${w.actual} (threshold: ${w.threshold})`).join('\n');
    fs.writeFileSync('/tmp/tech-debt-report.txt', report);
  }

  console.log('\n');
  process.exit(1);
} else {
  console.log('\n  ✅ All thresholds within limits\n');
}
