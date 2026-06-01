// Build output invariants. Run AFTER `npm run build`.
// Usage: node tests/build.test.js  (exits non-zero on any failure)
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

let passed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('  \x1b[32m✓\x1b[0m ' + name); }
  catch (e) { console.error('  \x1b[31m✗\x1b[0m ' + name + ' — ' + e.message); process.exitCode = 1; }
}

// --- Copy-phase invariants ---
check('dist/ exists', () => assert(fs.existsSync(DIST)));
check('served entry files copied', () => {
  ['index.html', 'manifest.json', 'favicon.svg', 'sw.js', 'app.js',
   'styles.css', 'dg-system.css', 'certs/netplus.js', 'lib/supabase.js']
    .forEach(f => assert(fs.existsSync(path.join(DIST, f)), 'missing ' + f));
});
check('dev/infra dirs NOT copied', () => {
  ['node_modules', '.git', 'tests', 'scripts', 'docs', 'api', 'supabase', 'landing']
    .forEach(d => assert(!fs.existsSync(path.join(DIST, d)), 'should not ship ' + d));
});
check('root markdown NOT copied', () => {
  assert(!fs.existsSync(path.join(DIST, 'CLAUDE.md')));
});

// --- JS minify invariants ---
const fnNoTrailingNewlines = s => s.replace(/\n+$/, '');
check('app.js is minified (smaller than source)', () => {
  const src = fs.statSync(path.join(ROOT, 'app.js')).size;
  const out = fs.statSync(path.join(DIST, 'app.js')).size;
  assert(out < src * 0.75, `expected <75% of ${src}, got ${out}`);
});
check('cross-file global window.CERT_PACK preserved in certs/netplus.js', () => {
  const out = fs.readFileSync(path.join(DIST, 'certs/netplus.js'), 'utf8');
  assert(/CERT_PACK/.test(out), 'CERT_PACK identifier was mangled away');
});
check('app.js APP_VERSION global still present after minify', () => {
  const out = fs.readFileSync(path.join(DIST, 'app.js'), 'utf8');
  assert(/APP_VERSION/.test(out), 'APP_VERSION mangled away');
});
check('already-min file copied verbatim (not re-processed)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/supabase-umd.min.js'), 'utf8');
  const out = fs.readFileSync(path.join(DIST, 'lib/supabase-umd.min.js'), 'utf8');
  assert.strictEqual(fnNoTrailingNewlines(out), fnNoTrailingNewlines(src));
});
check('sw.js copied verbatim (skipped)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const out = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
  assert.strictEqual(src, out);
});

// --- CSS minify invariants ---
check('styles.css is minified (smaller than source)', () => {
  const src = fs.statSync(path.join(ROOT, 'styles.css')).size;
  const out = fs.statSync(path.join(DIST, 'styles.css')).size;
  assert(out < src * 0.9, `expected <90% of ${src}, got ${out}`);
});
check('dg-system.css is minified', () => {
  const src = fs.statSync(path.join(ROOT, 'dg-system.css')).size;
  const out = fs.statSync(path.join(DIST, 'dg-system.css')).size;
  assert(out < src * 0.9);
});

console.log('\n' + passed + ' checks passed');
