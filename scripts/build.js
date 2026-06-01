#!/usr/bin/env node
// ══════════════════════════════════════════
// Production build: copy served surface -> dist/, then minify JS + CSS.
// Source files are never mutated. See
// docs/superpowers/specs/2026-06-01-perf-minify-build-design.md
// ══════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Denylist: top-level entries that must NOT ship to production.
// Everything else in the repo root is copied (behavior-preserving: there is
// no .vercelignore today, so Vercel currently serves the whole root; we only
// strip dev/infra/docs + api (served from root as functions) + supabase
// (migrations) + landing (separate Vercel project) + root config + *.md).
const DENY_DIRS = new Set([
  'node_modules', '.git', '.github', '.githooks', '.vercel', '.claude',
  '.planning', '.superpowers', '.agents', '.design-reference',
  'docs', 'scripts', 'tests', 'test-results', 'playwright-report',
  'dist', 'api', 'supabase', 'landing',
]);
const DENY_FILES = new Set([
  '.DS_Store', '.gitignore', '.lighthouserc.json', 'package.json',
  'package-lock.json', 'playwright.config.js', 'skills-lock.json', 'vercel.json',
]);
function isDenied(name) {
  if (DENY_DIRS.has(name) || DENY_FILES.has(name)) return true;
  if (name.endsWith('.md')) return true;          // root docs
  return false;
}

function cleanDist() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
}

function copySurface() {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });
  let copied = 0;
  for (const e of entries) {
    if (isDenied(e.name)) continue;
    fs.cpSync(path.join(ROOT, e.name), path.join(DIST, e.name), { recursive: true });
    copied++;
  }
  console.log('  \x1b[32m✓\x1b[0m copied ' + copied + ' top-level entries to dist/');
}

// Recursively walk dist/ and minify each eligible .js file IN PLACE.
// CRITICAL: use esbuild.transform (single-file), never esbuild.build/bundle.
// transform does not mangle top-level/global identifiers in non-module
// scripts, so window.CERT_PACK / window.CURRENT_CERT / APP_VERSION survive.
// keepNames:true preserves Function.prototype.name for any code that
// introspects it (error reporting, web-vitals). Drop later if proven safe.
const SKIP_JS = name => name.endsWith('.min.js') || name === 'sw.js';
const SKIP_DIRS_FOR_MINIFY = new Set(['vendor']);

async function minifyJs() {
  let count = 0, before = 0, after = 0;
  async function walk(dir, relTop) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (relTop === '' && SKIP_DIRS_FOR_MINIFY.has(e.name)) continue;
        await walk(full, relTop === '' ? e.name : relTop);
        continue;
      }
      if (!e.name.endsWith('.js') || SKIP_JS(e.name)) continue;
      const code = fs.readFileSync(full, 'utf8');
      const res = await esbuild.transform(code, {
        minify: true, keepNames: true, loader: 'js', legalComments: 'none',
      });
      before += code.length; after += res.code.length;
      fs.writeFileSync(full, res.code);
      count++;
    }
  }
  await walk(DIST, '');
  const pct = before ? Math.round((1 - after / before) * 100) : 0;
  console.log(`  \x1b[32m✓\x1b[0m minified ${count} JS files (${pct}% smaller raw)`);
}

// Minify the two root stylesheets in place. Only root *.css (no nested CSS
// in this repo's served surface). esbuild CSS minify is whitespace/syntax
// level — no class renaming — so selectors used by JS stay intact.
const CSS_TARGETS = ['styles.css', 'dg-system.css'];
async function minifyCss() {
  let count = 0, before = 0, after = 0;
  for (const name of CSS_TARGETS) {
    const full = path.join(DIST, name);
    if (!fs.existsSync(full)) continue;
    const code = fs.readFileSync(full, 'utf8');
    const res = await esbuild.transform(code, {
      minify: true, loader: 'css', legalComments: 'none',
    });
    before += code.length; after += res.code.length;
    fs.writeFileSync(full, res.code);
    count++;
  }
  const pct = before ? Math.round((1 - after / before) * 100) : 0;
  console.log(`  \x1b[32m✓\x1b[0m minified ${count} CSS files (${pct}% smaller raw)`);
}

async function main() {
  console.log('\n\x1b[1mBuilding dist/\x1b[0m\n');
  cleanDist();
  copySurface();
  await minifyJs();
  await minifyCss();
  console.log('\n\x1b[1mBuild complete.\x1b[0m\n');
}

main().catch(err => { console.error(err); process.exit(1); });
