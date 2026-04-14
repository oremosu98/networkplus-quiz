#!/usr/bin/env node
/* eslint-disable no-console */
//
// tests/deploy-verify.js — Post-deploy production health verifier.
//
// Runs 8 checks against the live Vercel deployment and writes a markdown
// report to stdout (also to GITHUB_OUTPUT for the workflow to consume).
//
// Exit codes:
//   0 — PASS or WARN (only Check 7 / security headers failed)
//   1 — FAIL (any critical check failed)
//   2 — FATAL (could not even read source files; usually a CI bug)
//
// Run locally:  node tests/deploy-verify.js
// Run in CI:    .github/workflows/deploy-verification.yml
//

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const PROD_URL = 'https://networkplus-quiz-sable.vercel.app';
const REPO_ROOT = path.resolve(__dirname, '..');
const TS = Date.now();

// ── Required DOM IDs that must exist in the live index.html ──
const REQUIRED_IDS = [
  'page-setup', 'page-quiz', 'page-results', 'page-exam', 'page-exam-results',
  'page-review', 'page-loading', 'page-subnet', 'page-ports', 'page-analytics',
  'page-progress', 'topic-group', 'diff-group', 'count-group', 'api-key',
  'version-badge', 'todays-focus'
];

// ── Required security headers (Check 7 — WARN only, not FAIL) ──
const REQUIRED_HEADERS = ['content-security-policy', 'x-frame-options', 'referrer-policy'];

// ── Check accumulator ──
const checks = [];
function rec(name, status, detail = '') {
  checks.push({ name, status, detail });
}

// ── HTTP helpers ──
async function fetchText(url) {
  const r = await fetch(url, { redirect: 'follow' });
  return { status: r.status, headers: r.headers, body: await r.text() };
}
async function fetchHead(url) {
  const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  return { status: r.status, headers: r.headers };
}

// ─────────────────────────────────────────────────────────────────
// SOURCE EXTRACTION — establish what the live site MUST match.
// Failure here is FATAL: we exit immediately rather than test against
// the live URL with bogus expected values.
// ─────────────────────────────────────────────────────────────────
let SRC_VERSION, SRC_CACHE, SRC_BADGE, SRC_SHELL_ASSETS, SRC_SHA;
try {
  const appJs = fs.readFileSync(path.join(REPO_ROOT, 'app.js'), 'utf8');
  const swJs = fs.readFileSync(path.join(REPO_ROOT, 'sw.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');

  const appMatch = appJs.match(/^const APP_VERSION = '([^']+)'/m);
  if (!appMatch) throw new Error('APP_VERSION not found in app.js');
  SRC_VERSION = appMatch[1];

  const cacheMatch = swJs.match(/^const CACHE_NAME = 'netplus-v([^']+)'/m);
  if (!cacheMatch) throw new Error("CACHE_NAME not found in sw.js (expected 'netplus-v...')");
  SRC_CACHE = cacheMatch[1];

  const badgeMatch = indexHtml.match(/id="version-badge"[^>]*>v([0-9.]+)</);
  if (!badgeMatch) throw new Error('version-badge not found in index.html');
  SRC_BADGE = badgeMatch[1];

  const shellMatch = swJs.match(/SHELL_ASSETS\s*=\s*\[([\s\S]*?)\]/);
  if (!shellMatch) throw new Error('SHELL_ASSETS array not found in sw.js');
  SRC_SHELL_ASSETS = [...shellMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]);

  SRC_SHA = execSync('git rev-parse HEAD', { cwd: REPO_ROOT }).toString().trim();
} catch (e) {
  console.error(`FATAL: source read failed — ${e.message}`);
  process.exit(2);
}
const SRC_SHORT_SHA = SRC_SHA.slice(0, 7);

// ─────────────────────────────────────────────────────────────────
// CHECK 1 — Source version triad consistency.
// If app.js / sw.js / index.html disagree, the REPO is broken; bail
// before hitting the live URL because we have no unambiguous expected
// version to compare against.
// ─────────────────────────────────────────────────────────────────
if (SRC_VERSION === SRC_CACHE && SRC_VERSION === SRC_BADGE) {
  rec('Source version triad', 'pass', `all three = ${SRC_VERSION}`);
} else {
  rec('Source version triad', 'fail',
    `app.js=${SRC_VERSION} sw.js=${SRC_CACHE} badge=${SRC_BADGE} (repo is divergent)`);
}

// ─────────────────────────────────────────────────────────────────
// LIVE CHECKS 2-8 — fetch the live URLs and validate.
// ─────────────────────────────────────────────────────────────────
let liveAppJs, liveSwJs, liveIndexHtml, liveManifest;

async function liveFetches() {
  // ── Check 2: shell assets all return 200 ──
  const shellPaths = new Set([
    '/', '/index.html', '/app.js', '/styles.css', '/sw.js', '/manifest.json',
    ...SRC_SHELL_ASSETS
      .filter(p => !p.startsWith('http'))
      .map(p => p.replace(/^\.\//, '/'))
      .map(p => p === '' ? '/' : p)
  ]);
  const fails = [];
  for (const p of shellPaths) {
    const url = `${PROD_URL}${p}?v=${TS}`;
    try {
      const r = await fetchText(url);
      if (r.status !== 200) {
        fails.push(`${p}: HTTP ${r.status}`);
        continue;
      }
      // Cache the bodies we'll need for later checks
      if (p === '/app.js') liveAppJs = r.body;
      else if (p === '/sw.js') liveSwJs = r.body;
      else if ((p === '/' || p === '/index.html') && !liveIndexHtml) liveIndexHtml = r.body;
      else if (p === '/manifest.json') liveManifest = r.body;
    } catch (e) {
      fails.push(`${p}: ${e.message}`);
    }
  }
  if (fails.length) {
    rec('Shell assets', 'fail',
      `${shellPaths.size - fails.length}/${shellPaths.size} OK; failures: ${fails.join(', ')}`);
  } else {
    rec('Shell assets', 'pass', `${shellPaths.size}/${shellPaths.size} returning 200`);
  }

  // ── Check 3: live version triad matches source ──
  if (!liveAppJs || !liveSwJs || !liveIndexHtml) {
    rec('Live version triad matches source', 'fail',
      'one or more live shell assets missing — cannot extract');
  } else {
    const liveAppV = (liveAppJs.match(/^const APP_VERSION = '([^']+)'/m) || [])[1];
    const liveCacheV = (liveSwJs.match(/^const CACHE_NAME = 'netplus-v([^']+)'/m) || [])[1];
    const liveBadgeV = (liveIndexHtml.match(/id="version-badge"[^>]*>v([0-9.]+)</) || [])[1];
    const allMatch = liveAppV === SRC_VERSION && liveCacheV === SRC_VERSION && liveBadgeV === SRC_VERSION;
    if (allMatch) {
      rec('Live version triad matches source', 'pass', `all three = ${SRC_VERSION}`);
    } else {
      rec('Live version triad matches source', 'fail',
        `expected v${SRC_VERSION}; observed app.js=${liveAppV} sw.js=${liveCacheV} badge=${liveBadgeV}`);
    }
  }

  // ── Check 4: JS parse check ──
  if (!liveAppJs) {
    rec('JS parse check', 'fail', 'live app.js missing');
  } else {
    const tmp = path.join(os.tmpdir(), `live-app-${TS}.js`);
    fs.writeFileSync(tmp, liveAppJs);
    try {
      execSync(`node --check "${tmp}"`, { stdio: 'pipe' });
      rec('JS parse check', 'pass');
    } catch (e) {
      const stderr = (e.stderr || e.message || '').toString();
      const firstLines = stderr.split('\n').slice(0, 5).join(' | ').slice(0, 400);
      rec('JS parse check', 'fail', firstLines);
    } finally {
      try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
    }
  }

  // ── Check 5: manifest.json validity ──
  if (!liveManifest) {
    rec('manifest.json validity', 'fail', 'live manifest.json missing');
  } else {
    try {
      const m = JSON.parse(liveManifest);
      const missing = ['name', 'start_url', 'display'].filter(k => !(k in m));
      if (!Array.isArray(m.icons) || m.icons.length === 0) missing.push('icons');
      if (missing.length) {
        rec('manifest.json validity', 'fail', `missing fields: ${missing.join(', ')}`);
      } else {
        rec('manifest.json validity', 'pass');
      }
    } catch (e) {
      rec('manifest.json validity', 'fail', `parse error: ${e.message}`);
    }
  }

  // ── Check 6: critical DOM markers in live index.html ──
  if (!liveIndexHtml) {
    rec('Critical DOM markers', 'fail', 'live index.html missing');
  } else {
    const missing = REQUIRED_IDS.filter(id => !liveIndexHtml.includes(`id="${id}"`));
    if (missing.length) {
      rec('Critical DOM markers', 'fail',
        `${REQUIRED_IDS.length - missing.length}/${REQUIRED_IDS.length} present; missing: ${missing.join(', ')}`);
    } else {
      rec('Critical DOM markers', 'pass', `${REQUIRED_IDS.length}/${REQUIRED_IDS.length} present`);
    }
  }

  // ── Check 7: security headers (WARN, not FAIL) ──
  try {
    const h = await fetchHead(`${PROD_URL}/?v=${TS}`);
    const present = REQUIRED_HEADERS.filter(k => h.headers.has(k));
    const missing = REQUIRED_HEADERS.filter(k => !h.headers.has(k));
    if (missing.length === 0) {
      rec('Security headers', 'pass', `${present.length}/${REQUIRED_HEADERS.length} present`);
    } else {
      rec('Security headers', 'warn',
        `${present.length}/${REQUIRED_HEADERS.length} present; missing: ${missing.join(', ')}`);
    }
  } catch (e) {
    rec('Security headers', 'warn', `HEAD request failed: ${e.message}`);
  }

  // ── Check 8: service worker handlers ──
  if (!liveSwJs) {
    rec('Service worker handlers', 'fail', 'live sw.js missing');
  } else {
    const required = [
      `self.addEventListener('install'`,
      `self.addEventListener('activate'`,
      `self.addEventListener('fetch'`
    ];
    const missingHandlers = required.filter(p => !liveSwJs.includes(p));
    const hasShellAssets = /SHELL_ASSETS\s*=\s*\[/.test(liveSwJs);
    if (missingHandlers.length === 0 && hasShellAssets) {
      rec('Service worker handlers', 'pass', 'install/activate/fetch + SHELL_ASSETS present');
    } else {
      const det = [];
      if (missingHandlers.length) det.push(`missing handlers: ${missingHandlers.length}`);
      if (!hasShellAssets) det.push('SHELL_ASSETS missing');
      rec('Service worker handlers', 'fail', det.join('; '));
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// MAIN — run live checks, build markdown report, write outputs.
// ─────────────────────────────────────────────────────────────────
(async () => {
  await liveFetches();

  const hasFail = checks.some(c => c.status === 'fail');
  const hasWarn = checks.some(c => c.status === 'warn');
  const status = hasFail ? 'FAIL' : (hasWarn ? 'WARN' : 'PASS');

  const triggeredBy = process.env.GITHUB_EVENT_NAME || 'local';
  const lines = [];
  lines.push(`# Deploy verification: v${SRC_VERSION} @ ${SRC_SHORT_SHA} — ${status}`);
  lines.push('');
  lines.push(`- **Live URL:** ${PROD_URL}`);
  lines.push(`- **Source commit:** \`${SRC_SHA}\``);
  lines.push(`- **Source version:** v${SRC_VERSION}`);
  lines.push(`- **Triggered by:** ${triggeredBy}`);
  lines.push(`- **Run timestamp:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Results');
  for (const c of checks) {
    const icon = c.status === 'pass' ? '✅' : (c.status === 'warn' ? '⚠️' : '❌');
    lines.push(`- ${icon} **${c.name}**${c.detail ? ` — ${c.detail}` : ''}`);
  }
  lines.push('');
  lines.push('## Action required');
  if (hasFail) {
    lines.push(`@oremosu98 — **CRITICAL**: deploy verification failed. Investigate immediately.`);
    lines.push('');
    lines.push('Consider rolling back via `vercel rollback` if users are currently affected.');
  } else if (hasWarn) {
    lines.push('Non-critical — security header(s) missing. Investigate when convenient.');
  } else {
    lines.push('None. Deploy is clean.');
  }
  lines.push('');
  lines.push('---');
  lines.push('*Generated by `tests/deploy-verify.js` via `.github/workflows/deploy-verification.yml`*');

  const report = lines.join('\n');
  console.log(report);

  // Hand off to the workflow if running in CI
  if (process.env.GITHUB_OUTPUT) {
    const reportFile = path.join(os.tmpdir(), 'deploy-verify-report.md');
    fs.writeFileSync(reportFile, report);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `report_file=${reportFile}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${status}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${SRC_VERSION}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `short_sha=${SRC_SHORT_SHA}\n`);
  }

  process.exit(hasFail ? 1 : 0);
})().catch(e => {
  console.error(`FATAL: ${e.message}\n${e.stack || ''}`);
  process.exit(2);
});
