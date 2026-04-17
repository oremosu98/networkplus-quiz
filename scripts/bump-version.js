#!/usr/bin/env node
// ══════════════════════════════════════════
// Auto-versioning script
// Usage: node scripts/bump-version.js <version> [description]
// Example: node scripts/bump-version.js 3.6 "New feature X, fix Y"
// ══════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const version = process.argv[2];
const description = process.argv.slice(3).join(' ') || 'No description provided';

if (!version) {
  console.error('\x1b[31mUsage: node scripts/bump-version.js <version> [description]\x1b[0m');
  console.error('Example: node scripts/bump-version.js 3.6 "Subnetting v2, new analytics"');
  process.exit(1);
}

if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
  console.error(`\x1b[31mInvalid version format: "${version}". Use X.Y or X.Y.Z\x1b[0m`);
  process.exit(1);
}

function updateFile(filename, replacements) {
  const filepath = path.join(ROOT, filename);
  let content = fs.readFileSync(filepath, 'utf8');
  let changes = 0;
  replacements.forEach(([pattern, replacement]) => {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) changes++;
    content = newContent;
  });
  fs.writeFileSync(filepath, content);
  return changes;
}

console.log(`\n\x1b[1mBumping to v${version}\x1b[0m\n`);

// 1. app.js — APP_VERSION constant + header comment
const jsChanges = updateFile('app.js', [
  [/const APP_VERSION = '[^']*'/, `const APP_VERSION = '${version}'`],
  [/app\.js\s+v[\d.]+/, `app.js  v${version}`],
]);
console.log(`  \x1b[32m✓\x1b[0m app.js — APP_VERSION + header (${jsChanges} changes)`);

// 2. index.html — version badge
const htmlChanges = updateFile('index.html', [
  [/>v[\d.]+<\/span>/, `>v${version}</span>`],
]);
console.log(`  \x1b[32m✓\x1b[0m index.html — version badge (${htmlChanges} changes)`);

// 3. sw.js — cache name + header
const swChanges = updateFile('sw.js', [
  [/const CACHE_NAME = 'netplus-v[^']*'/, `const CACHE_NAME = 'netplus-v${version}'`],
  [/Service Worker v[\d.]+/, `Service Worker v${version}`],
]);
console.log(`  \x1b[32m✓\x1b[0m sw.js — cache name + header (${swChanges} changes)`);

// 4. styles.css — header comment
const cssChanges = updateFile('styles.css', [
  [/styles\.css\s+v[\d.]+/, `styles.css  v${version}`],
]);
console.log(`  \x1b[32m✓\x1b[0m styles.css — header (${cssChanges} changes)`);

// 5. package.json — version field
const pkgChanges = updateFile('package.json', [
  [/"version":\s*"[^"]*"/, `"version": "${version}"`],
]);
console.log(`  \x1b[32m✓\x1b[0m package.json — version field (${pkgChanges} changes)`);

// 6. CLAUDE.md — prepend to version history table
// Convention: table is newest-first. Insert the new row immediately before
// the current first version row (right after the `|---|---|` header).
// Prior behavior (append-to-bottom) was wrong and forced a manual "move row
// to top" Edit on every release, which hit Read/Edit file-state races.
const claudePath = path.join(ROOT, 'CLAUDE.md');
let claudeContent = fs.readFileSync(claudePath, 'utf8');
const newRow = `| v${version} | ${description} |`;

const lines = claudeContent.split('\n');
let firstVersionIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (/^\| v\d/.test(lines[i])) { firstVersionIdx = i; break; }
}
if (firstVersionIdx >= 0) {
  lines.splice(firstVersionIdx, 0, newRow);
  fs.writeFileSync(claudePath, lines.join('\n'));
  console.log(`  \x1b[32m✓\x1b[0m CLAUDE.md — version history row added at top`);
} else {
  console.log(`  \x1b[33m!\x1b[0m CLAUDE.md — could not find version table, skipped`);
}

// Summary
console.log(`\n\x1b[32m\x1b[1m  Version bumped to v${version} across all files ✓\x1b[0m`);
console.log(`  Don't forget to run: node tests/uat.js\n`);
