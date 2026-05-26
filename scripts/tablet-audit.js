// ══════════════════════════════════════════════════════════════════════════
// Tablet layout audit — Phase 7
// ══════════════════════════════════════════════════════════════════════════
// Screenshots every major page at iPad portrait (768×1024) + landscape
// (1024×768) for visual review. Writes to ./tablet-audit/<orientation>/.
// One-time script — not part of CI. Run when iterating on tablet CSS to
// re-capture the before/after states.
//
// Usage:
//   node scripts/tablet-audit.js              # full audit
//   node scripts/tablet-audit.js setup,quiz   # specific pages
//
// Requires: python3 -m http.server 3131 running in repo root.
// ══════════════════════════════════════════════════════════════════════════

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTDIR = path.join(ROOT, 'tablet-audit');
const URL = 'http://localhost:3131';

const VIEWPORTS = [
  { name: 'portrait', width: 768, height: 1024 },
  { name: 'landscape', width: 1024, height: 768 },
];

// Page list — focuses on the pages with significant layout (skips error/loading
// pages and short-lived states like session-transition). Each entry navigates
// via showPage(), waits a bit for any render to settle, then screenshots.
const PAGES = [
  // ── Public-facing / entry ──
  { name: '01-setup-anonymous', pageId: 'setup', auth: false,
    prep: null,
    note: 'Default landing for anonymous users. Diagnostic CTA + sample-Q teaser.' },
  { name: '02-setup-signed-in', pageId: 'setup', auth: true,
    prep: () => {
      // Mark history non-empty so Marathon Mode + other progressive-disclosure
      // surfaces aren't hidden, giving a fuller layout to assess.
      try {
        localStorage.setItem('nplus_history', JSON.stringify([{ when: Date.now(), topic: 'OSI Model', score: 0.7, total: 5, correct: 4, exam: false }]));
      } catch (_) {}
    },
    note: 'Signed-in landing. Chip groups (Topic / Difficulty / Count), CTA panel, weak-spots focus card.' },

  // ── Drill launchers + drill UIs ──
  { name: '03-drills-launcher', pageId: 'drills', auth: true, prep: null,
    note: '4-tile drill launcher: Port Drill, Acronym Blitz, OSI Sorter, Cable ID.' },
  { name: '04-subnet-trainer', pageId: 'subnet', auth: true, prep: null,
    note: 'Multi-tab UI: Practice / Dashboard / Learn. Practice mode default.' },
  { name: '05-port-drill', pageId: 'ports', auth: true, prep: null,
    note: 'Port Drill modes (Timed / Endless / Family / Secure Pairs).' },
  { name: '06-acronyms', pageId: 'acronyms', auth: true, prep: null,
    note: 'Acronym Blitz drill — flashcard style.' },
  { name: '07-osi-sorter', pageId: 'osi-sorter', auth: true, prep: null,
    note: 'Drag/click protocols onto OSI layers.' },
  { name: '08-cables', pageId: 'cables', auth: true, prep: null,
    note: 'Cable & Connector identification — image-based.' },

  // ── Analytics + Progress ──
  { name: '09-analytics', pageId: 'analytics', auth: true, prep: null,
    note: 'Domain Mastery cards + Wrong-Answer Patterns. Hero readiness number.' },
  { name: '10-progress', pageId: 'progress', auth: true, prep: null,
    note: 'Per-topic progress + Recent Performance. List view.' },

  // ── Settings ──
  { name: '11-settings', pageId: 'settings', auth: true, prep: null,
    note: 'API key, theme, export/import, danger zone.' },

  // ── Pro features (desktop-only or paywalled) ──
  { name: '12-topology-builder', pageId: 'topology-builder', auth: true,
    prep: () => {
      // Pro gate + desktop-only viewport check both bypass for the audit.
      // We want to see how the Topology Builder PAGE itself looks at iPad,
      // even though Phase 8 will route iPad users to a "use desktop" nudge.
      // Forcing the page open shows what the BACKUP fallback nudge looks like.
      window._certanvilSignedIn = true;
    },
    note: 'Desktop-only feature — should show the mobile nudge on iPad portrait.' },
  { name: '13-acl-builder', pageId: 'acl', auth: true, prep: null,
    note: 'ACL Builder — desktop-friendly layout. May overflow on iPad portrait.' },
  { name: '14-incident-response', pageId: 'irw', auth: true, prep: null,
    note: 'Incident Response War Room (Sec+ flagship). Multi-pane.' },
  { name: '15-phishing-triage', pageId: 'pht', auth: true, prep: null,
    note: 'Phishing Triage Lab (Sec+).' },
  { name: '16-network-analysis', pageId: 'network-analysis', auth: true, prep: null,
    note: 'Network Analysis Drill.' },

  // ── Active quiz / exam states ──
  { name: '17-quiz-mid-question', pageId: 'quiz', auth: true,
    prep: () => {
      // Mock a quiz question so the UI has something to render
      window.questions = [{
        topic: 'OSI Model',
        objective: '1.1',
        difficulty: 'Medium',
        question: 'Which OSI layer is responsible for end-to-end communication and error recovery?',
        options: {
          A: 'Data Link (Layer 2)',
          B: 'Network (Layer 3)',
          C: 'Transport (Layer 4)',
          D: 'Session (Layer 5)'
        },
        answer: 'C',
        explanation: 'The Transport layer (Layer 4) provides end-to-end communication services and includes protocols like TCP for reliable, connection-oriented delivery with error recovery.'
      }];
      window.current = 0;
      if (typeof render === 'function') render();
    },
    note: 'Active quiz mid-question — 4 MCQ options + progress bar.' },
  { name: '18-results', pageId: 'results', auth: true,
    prep: () => {
      // Mock a results state
      window.questions = [{
        topic: 'OSI Model',
        difficulty: 'Medium',
        question: 'Sample',
        options: { A: 'A', B: 'B', C: 'C', D: 'D' },
        answer: 'C',
        explanation: 'Test'
      }];
      window.answers = ['C'];
      if (typeof renderResults === 'function') renderResults();
    },
    note: 'Quiz-complete results page with score + review CTA.' },

  // ── Diagnostic + Pass Plan ──
  { name: '19-diagnostic-result', pageId: 'diagnostic-result', auth: true, prep: null,
    note: 'Pass Plan reveal post-diagnostic. Probability ring + weak-domains list + week strip.' },
];

function pickPages() {
  const arg = process.argv[2];
  if (!arg) return PAGES;
  const wanted = arg.split(',').map(s => s.trim().toLowerCase());
  return PAGES.filter(p => wanted.some(w => p.pageId.toLowerCase().includes(w) || p.name.toLowerCase().includes(w)));
}

(async () => {
  const pages = pickPages();
  console.log(`Auditing ${pages.length} pages × ${VIEWPORTS.length} viewports = ${pages.length * VIEWPORTS.length} screenshots`);

  // Ensure output dirs exist
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);
  for (const v of VIEWPORTS) {
    const sub = path.join(OUTDIR, v.name);
    if (!fs.existsSync(sub)) fs.mkdirSync(sub);
  }

  const browser = await chromium.launch();

  let n = 0;
  const startTime = Date.now();
  const summary = [];

  for (const viewport of VIEWPORTS) {
    for (const page of pages) {
      const ctx = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2,  // retina-like, sharper screenshots
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      });
      const pg = await ctx.newPage();

      try {
        await pg.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
        await pg.waitForTimeout(500);

        // Auth + per-page prep
        if (page.auth || page.prep) {
          await pg.evaluate((prepStr) => {
            try {
              window._certanvilSignedIn = true;
              localStorage.setItem('nplus_key', 'sk-ant-stub-for-audit');
            } catch (_) {}
            if (prepStr) {
              try { (new Function(prepStr))(); } catch (e) { console.warn('prep failed', e); }
            }
          }, page.prep ? page.prep.toString().replace(/^[^{]*\{/, '').replace(/\}[^}]*$/, '') : null);
        }

        // Navigate to the page
        await pg.evaluate((id) => {
          if (typeof showPage === 'function') showPage(id);
        }, page.pageId);

        // Wait for any deferred render / lazy-load
        await pg.waitForTimeout(900);

        const filename = `${page.name}.png`;
        const filepath = path.join(OUTDIR, viewport.name, filename);
        await pg.screenshot({ path: filepath, fullPage: true });
        n++;
        console.log(`✓ [${viewport.name}] ${page.name} → ${filename}`);
        summary.push({ viewport: viewport.name, page: page.name, ok: true, path: path.relative(ROOT, filepath), note: page.note });
      } catch (err) {
        console.warn(`✗ [${viewport.name}] ${page.name} — ${err.message.slice(0, 80)}`);
        summary.push({ viewport: viewport.name, page: page.name, ok: false, error: err.message.slice(0, 200), note: page.note });
      } finally {
        await ctx.close();
      }
    }
  }

  await browser.close();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone. ${n} screenshots in ${elapsed}s`);

  // Write a summary index
  const indexPath = path.join(OUTDIR, 'index.md');
  let md = `# Tablet Audit · Phase 7 · ${new Date().toISOString().slice(0, 10)}\n\n`;
  md += `Screenshots at iPad portrait (768×1024) + landscape (1024×768). Each row is one page; both viewports side-by-side.\n\n`;
  md += `## Pages\n\n`;
  md += `| # | Page | Portrait | Landscape | Notes |\n|---|---|---|---|---|\n`;
  for (const p of pages) {
    const portrait = summary.find(s => s.viewport === 'portrait' && s.page === p.name);
    const landscape = summary.find(s => s.viewport === 'landscape' && s.page === p.name);
    md += `| ${p.name.split('-')[0]} | **${p.name.split('-').slice(1).join('-')}** | ${portrait?.ok ? `[portrait](portrait/${p.name}.png)` : '❌'} | ${landscape?.ok ? `[landscape](landscape/${p.name}.png)` : '❌'} | ${p.note} |\n`;
  }
  fs.writeFileSync(indexPath, md);
  console.log(`Index: ${path.relative(ROOT, indexPath)}`);
})();
