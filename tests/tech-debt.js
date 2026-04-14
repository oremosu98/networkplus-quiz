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

// Console statements (excluding error handlers)
const consoleMatches = jsLines.filter((line, i) => {
  const trimmed = line.trim();
  return (trimmed.startsWith('console.log(') || trimmed.startsWith('console.warn(')) &&
    !trimmed.includes('error') && !trimmed.includes('Error');
});
check('console.log/warn in production', consoleMatches.length, 0);

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
check('Functions >80 lines', longFunctions, 22); // baseline: ~20 as of v4.33 — target: 0

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
