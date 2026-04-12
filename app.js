// ══════════════════════════════════════════
// Network+ AI Quiz — app.js  v4.13
// ══════════════════════════════════════════

// ── CONSTANTS ──
const APP_VERSION = '4.31.0';
const EXAM_TIME_SECONDS = 5400;     // 90 minutes
const HISTORY_CAP = 200;
const WRONG_BANK_CAP = 200;
const REPORTS_CAP = 500;
const PORT_DRILL_SECONDS = 30;
const SESSION_TOPICS = 3;
const SESSION_QUESTIONS = 7;

const MIXED_TOPIC = 'Mixed \u2014 All Topics';
const EXAM_TOPIC = 'Exam Simulation';
const DEFAULT_DIFF = 'Exam Level';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

const STORAGE = {
  THEME: 'nplus_theme',
  KEY: 'nplus_key',
  HISTORY: 'nplus_history',
  STREAK: 'nplus_streak',
  WRONG_BANK: 'nplus_wrong_bank',
  REPORTS: 'nplus_reports',
  PORT_BEST: 'nplus_port_best',
  PORT_STREAK_BEST: 'nplus_port_streak_best',
  PORT_FAMILY_BEST: 'nplus_port_family_best',
  PORT_PAIRS_BEST: 'nplus_port_pairs_best',
  HARDCORE_EXAM: 'nplus_hardcore_exam',
  PORT_STATS: 'nplus_port_stats',
  EXAM_DATE: 'nplus_exam_date',
  MILESTONES: 'nplus_milestones',
  TYPE_STATS: 'nplus_type_stats',
  SUBNET_STATS: 'nplus_subnet_stats',
  DAILY_GOAL: 'nplus_daily_goal',
  DAILY_CHALLENGE: 'nplus_daily_challenge',
  DEEP_DIVE_USES: 'nplus_deep_dive_uses',
  ERROR_LOG: 'nplus_error_log',
  GH_TOKEN: 'nplus_gh_monitor_token',
  GH_REPORTED: 'nplus_gh_reported',
  TOPOLOGIES: 'nplus_topologies',
  TOPOLOGY_DRAFT: 'nplus_topology_draft',
  TB_COACH_CACHE: 'nplus_tb_coach_cache',
  LAB_COMPLETIONS: 'nplus_lab_completions',
};

// ── STATE ──
let questions  = [];
let current    = 0;
let score      = 0;
let streak     = 0;
let bestStreak = 0;
let answered   = 0;
let log        = [];
let quizFlags  = [];
let topic           = MIXED_TOPIC;
let activeQuizTopic = MIXED_TOPIC;
let diff       = DEFAULT_DIFF;
let qCount     = 10;
let apiKey     = '';
let wrongDrillMode = false;
let dailyChallengeMode = false;

// Multi-select state (regular quiz)
let msSelections = [];

// Ordering state (regular quiz)
let orderSequence = [];

// Topology builder state
let selectedTopoDevice = null;
let topoDevices = {};

// Session state
let sessionMode    = false;
let sessionPlan    = [];
let sessionStep    = 0;
let sessionResults = [];

// Exam state
let examMode      = false;
let examHardcore  = false; // #48: locked order, no flagging, no navigator
let examQuestions  = [];
let examAnswers    = []; // [{chosen, flagged, msChosen:[], orderSeq:[]}]
let examCurrent    = 0;
let examTimer      = null;
let examTimeLeft   = EXAM_TIME_SECONDS;
let examEndTime    = 0;
let navOpen        = false;

// ══════════════════════════════════════════
// THEME TOGGLE
// ══════════════════════════════════════════
function getTheme() {
  return localStorage.getItem(STORAGE.THEME) || 'dark';
}

function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(STORAGE.THEME, t);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = t === 'dark' ? '\u2600\ufe0f' : '\ud83c\udf19';
  // Update theme-color meta for mobile
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t === 'dark' ? '#0a0a12' : '#f4f4fa';
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// ══════════════════════════════════════════
// PRODUCTION MONITORING + AUTO GITHUB ISSUES
// ══════════════════════════════════════════
const ERROR_LOG_CAP = 50;
const GH_REPO = 'oremosu98/networkplus-quiz';
const GH_PROJECT_ID = 'PVT_kwHOB0H7gM4BT-VD';

function logError(type, msg, extra = {}) {
  try {
    const log = JSON.parse(localStorage.getItem(STORAGE.ERROR_LOG) || '[]');
    const entry = {
      type,
      message: String(msg).slice(0, 500),
      timestamp: new Date().toISOString(),
      page: document.querySelector('.page.active')?.id || 'unknown',
      version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?',
      userAgent: navigator.userAgent.slice(0, 150),
      ...extra
    };
    log.unshift(entry);
    if (log.length > ERROR_LOG_CAP) log.length = ERROR_LOG_CAP;
    localStorage.setItem(STORAGE.ERROR_LOG, JSON.stringify(log));
    // Auto-report to GitHub if configured
    autoReportToGitHub(entry);
  } catch (_) { /* storage full or unavailable */ }
}

function showErrorToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 5000);
}

// ── GitHub Issues Auto-Reporter ──
function getReportedErrors() {
  try { return JSON.parse(localStorage.getItem(STORAGE.GH_REPORTED) || '[]'); } catch { return []; }
}

function errorFingerprint(entry) {
  // Deduplicate by message + source + line (ignore timestamp)
  return (entry.message || '').slice(0, 100) + '|' + (entry.source || '') + '|' + (entry.line || '');
}

async function autoReportToGitHub(entry) {
  const token = localStorage.getItem(STORAGE.GH_TOKEN);
  if (!token) return;
  // Skip localhost errors
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  // Deduplicate — don't report the same error twice
  const fp = errorFingerprint(entry);
  const reported = getReportedErrors();
  if (reported.includes(fp)) return;

  const title = `[Auto] ${entry.type}: ${entry.message.slice(0, 80)}`;
  const body = `## Auto-Reported Bug

| Field | Value |
|---|---|
| **Type** | \`${entry.type}\` |
| **Page** | \`${entry.page}\` |
| **Version** | \`v${entry.version}\` |
| **Time** | ${entry.timestamp} |
| **Browser** | ${entry.userAgent || 'Unknown'} |
${entry.source ? `| **Source** | \`${entry.source}:${entry.line}:${entry.col}\` |` : ''}

### Error Message
\`\`\`
${entry.message}
\`\`\`

${entry.stack ? `### Stack Trace\n\`\`\`\n${entry.stack}\n\`\`\`` : ''}

---
_Auto-reported by Production Monitor v${entry.version}_`;

  try {
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body,
        labels: ['bug', 'monitoring', 'priority: high']
      })
    });
    if (res.ok) {
      const issue = await res.json();
      // Add issue to Kanban board
      addIssueToProject(token, issue.node_id);
      // Mark as reported so we don't create duplicates
      reported.push(fp);
      if (reported.length > 200) reported.splice(0, reported.length - 200);
      localStorage.setItem(STORAGE.GH_REPORTED, JSON.stringify(reported));
    }
  } catch (_) { /* silent — don't error on error reporting */ }
}

async function addIssueToProject(token, issueNodeId, priority = 'high') {
  const PRIORITY_IDS = { high: 'c32bf0c4', medium: 'f0fdf4e6', low: '0ce27c83' };
  const PRIORITY_FIELD = 'PVTSSF_lAHOB0H7gM4BT-VDzhBQYqI';
  const STATUS_FIELD = 'PVTSSF_lAHOB0H7gM4BT-VDzhBJlx0';
  const BACKLOG_ID = '630cbc97';
  try {
    const gql = (query) => fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { 'Authorization': `bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    }).then(r => r.json());
    const res = await gql(`mutation { addProjectV2ItemById(input: { projectId: "${GH_PROJECT_ID}", contentId: "${issueNodeId}" }) { item { id } } }`);
    const itemId = res.data.addProjectV2ItemById.item.id;
    await gql(`mutation { updateProjectV2ItemFieldValue(input: { projectId: "${GH_PROJECT_ID}", itemId: "${itemId}", fieldId: "${PRIORITY_FIELD}", value: { singleSelectOptionId: "${PRIORITY_IDS[priority]}" } }) { projectV2Item { id } } }`);
    await gql(`mutation { updateProjectV2ItemFieldValue(input: { projectId: "${GH_PROJECT_ID}", itemId: "${itemId}", fieldId: "${STATUS_FIELD}", value: { singleSelectOptionId: "${BACKLOG_ID}" } }) { projectV2Item { id } } }`);
  } catch (_) {}
}

window.onerror = function(msg, src, line, col, err) {
  console.error(`[App Error] ${msg} at ${src}:${line}:${col}`, err);
  logError('runtime', msg, {
    source: src ? src.split('/').pop() : '',
    line, col,
    stack: err?.stack ? err.stack.slice(0, 500) : ''
  });
  showErrorToast('Something went wrong. Try refreshing the page.');
  return false;
};

window.addEventListener('unhandledrejection', e => {
  console.error('[Unhandled Promise]', e.reason);
  const msg = e.reason?.message || String(e.reason);
  const isNetwork = msg.includes('API') || msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('NetworkError');
  logError('promise', msg, {
    stack: e.reason?.stack ? e.reason.stack.slice(0, 500) : ''
  });
  if (!isNetwork) showErrorToast('An unexpected error occurred.');
});

// ── Monitor Panel ──
function getErrorLog() {
  try { return JSON.parse(localStorage.getItem(STORAGE.ERROR_LOG) || '[]'); } catch { return []; }
}

function renderMonitor() {
  const log = getErrorLog();
  const statsEl = document.getElementById('monitor-stats');
  const logEl = document.getElementById('monitor-log');
  if (!statsEl || !logEl) return;

  // Stats
  const total = log.length;
  const runtime = log.filter(e => e.type === 'runtime').length;
  const promise = log.filter(e => e.type === 'promise').length;
  const last24h = log.filter(e => Date.now() - new Date(e.timestamp).getTime() < 86400000).length;
  const lastErr = log[0] ? new Date(log[0].timestamp).toLocaleString() : 'None';

  // Top errors by frequency
  const freq = {};
  log.forEach(e => { const k = e.message.slice(0, 80); freq[k] = (freq[k] || 0) + 1; });
  const topErrors = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const ghToken = localStorage.getItem(STORAGE.GH_TOKEN) || '';
  const ghStatus = ghToken ? '🟢 Connected' : '⚪ Not configured';
  const reportedCount = getReportedErrors().length;

  statsEl.innerHTML = `
    <div class="mon-stats-grid">
      <div class="mon-stat"><div class="mon-stat-val">${total}</div><div class="mon-stat-lbl">Total Errors</div></div>
      <div class="mon-stat"><div class="mon-stat-val" style="color:var(--red)">${runtime}</div><div class="mon-stat-lbl">Runtime</div></div>
      <div class="mon-stat"><div class="mon-stat-val" style="color:var(--yellow)">${promise}</div><div class="mon-stat-lbl">Promise</div></div>
      <div class="mon-stat"><div class="mon-stat-val" style="color:var(--accent-light)">${last24h}</div><div class="mon-stat-lbl">Last 24h</div></div>
    </div>
    <div class="mon-github">
      <div class="mon-github-header">
        <h4>GitHub Auto-Reporter</h4>
        <span class="mon-github-status">${ghStatus}</span>
      </div>
      <p class="mon-github-desc">Errors auto-create issues on <a href="https://github.com/${GH_REPO}/issues" target="_blank" rel="noopener" style="color:var(--accent-light)">${GH_REPO}</a> with bug + monitoring labels. Duplicates are skipped.</p>
      <div class="mon-github-input-row">
        <input type="password" id="gh-monitor-token" class="mon-github-input" placeholder="ghp_xxxxxxxxxxxx" value="${ghToken ? '••••••••••••••••' : ''}" />
        <button class="btn btn-primary" style="padding:8px 14px;font-size:12px" onclick="saveGhToken()">Save</button>
        ${ghToken ? '<button class="btn btn-ghost" style="padding:8px 14px;font-size:12px" onclick="revealGhToken()">Reveal</button><button class="btn btn-ghost" style="padding:8px 14px;font-size:12px" onclick="copyGhToken()">Copy</button>' : ''}
      </div>
      <p class="mon-github-hint">${reportedCount} unique errors reported so far. Token stored locally, never sent anywhere except GitHub API.</p>
    </div>
    ${topErrors.length > 0 ? `
    <div class="mon-freq">
      <h4>Top Errors</h4>
      ${topErrors.map(([msg, count]) => `<div class="mon-freq-row"><span class="mon-freq-count">${count}x</span><span class="mon-freq-msg">${escHtml(msg)}</span></div>`).join('')}
    </div>` : ''}
    <div class="mon-last">Last error: ${escHtml(lastErr)}</div>
  `;

  // Error log
  if (log.length === 0) {
    logEl.innerHTML = '<div class="mon-empty">No errors logged. Your app is running clean! &#127881;</div>';
    return;
  }

  logEl.innerHTML = log.map((e, i) => {
    const time = new Date(e.timestamp);
    const ago = formatTimeAgo(time);
    const typeClass = e.type === 'runtime' ? 'mon-type-runtime' : 'mon-type-promise';
    return `<div class="mon-entry">
      <div class="mon-entry-header">
        <span class="mon-type ${typeClass}">${e.type.toUpperCase()}</span>
        <span class="mon-time" title="${time.toLocaleString()}">${ago}</span>
        <span class="mon-page">${escHtml(e.page || '')}</span>
        <span class="mon-version">v${escHtml(e.version || '?')}</span>
      </div>
      <div class="mon-entry-msg">${escHtml(e.message)}</div>
      ${e.source ? `<div class="mon-entry-loc">${escHtml(e.source)}:${e.line}:${e.col}</div>` : ''}
      ${e.stack ? `<details class="mon-stack-details"><summary>Stack trace</summary><pre class="mon-stack">${escHtml(e.stack)}</pre></details>` : ''}
    </div>`;
  }).join('');
}

function formatTimeAgo(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function copyErrorLog() {
  const log = getErrorLog();
  const text = log.map(e => `[${e.timestamp}] ${e.type.toUpperCase()} | ${e.page} | v${e.version}\n${e.message}${e.source ? `\n  at ${e.source}:${e.line}:${e.col}` : ''}${e.stack ? `\n${e.stack}` : ''}`).join('\n\n---\n\n');
  navigator.clipboard.writeText(text || 'No errors logged.').then(() => showErrorToast('Error log copied to clipboard'));
}

function exportErrorLog() {
  const log = getErrorLog();
  const data = { exported: new Date().toISOString(), version: APP_VERSION, errors: log };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `netplus-errors-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function clearErrorLog() {
  if (!confirm('Clear all logged errors? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE.ERROR_LOG);
  renderMonitor();
}

function saveGhToken() {
  const input = document.getElementById('gh-monitor-token');
  const token = (input?.value || '').trim();
  // Don't save the masked placeholder
  if (token === '••••••••••••••••') return;
  if (token && !token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
    showErrorToast('Invalid token — must start with ghp_ or github_pat_');
    return;
  }
  if (token) {
    localStorage.setItem(STORAGE.GH_TOKEN, token);
    showErrorToast('GitHub connected! Errors will auto-create issues.');
  } else {
    localStorage.removeItem(STORAGE.GH_TOKEN);
    showErrorToast('GitHub auto-reporter disconnected.');
  }
  renderMonitor();
}

function revealGhToken() {
  const input = document.getElementById('gh-monitor-token');
  const token = localStorage.getItem(STORAGE.GH_TOKEN) || '';
  if (!input || !token) return;
  if (input.type === 'password') {
    input.type = 'text';
    input.value = token;
  } else {
    input.type = 'password';
    input.value = '••••••••••••••••';
  }
}

function copyGhToken() {
  const token = localStorage.getItem(STORAGE.GH_TOKEN) || '';
  if (!token) return;
  navigator.clipboard.writeText(token).then(() => showErrorToast('Token copied to clipboard'));
}

// Triple-tap version badge to open monitor
let monitorTaps = 0, monitorTapTimer = null;
function initMonitorGesture() {
  const badge = document.getElementById('version-badge');
  if (!badge) return;
  badge.addEventListener('click', () => {
    monitorTaps++;
    if (monitorTapTimer) clearTimeout(monitorTapTimer);
    monitorTapTimer = setTimeout(() => { monitorTaps = 0; }, 600);
    if (monitorTaps >= 3) {
      monitorTaps = 0;
      renderMonitor();
      showPage('monitor');
    }
  });
}

// ══════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

window.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  setTheme(getTheme());

  const saved = localStorage.getItem(STORAGE.KEY);
  if (saved) document.getElementById('api-key').value = saved;
  // Auto-open Advanced section on first visit (no API key yet)
  const adv = document.getElementById('advanced-section');
  if (adv && !saved) adv.open = true;

  initChips('topic-group', v => topic = v);
  initChips('diff-group',  v => diff  = v);
  initChips('count-group', v => qCount = parseInt(v));

  const t0 = document.querySelector('#topic-group .chip.on');
  const d0 = document.querySelector('#diff-group .chip.on');
  const c0 = document.querySelector('#count-group .chip.on');
  if (t0) topic  = t0.dataset.v;
  if (d0) diff   = d0.dataset.v;
  if (c0) qCount = parseInt(c0.dataset.v);

  renderHistoryPanel();
  renderStatsCard();
  renderWeakBanner();
  renderStreakBadge();
  renderReadinessCard();
  renderSessionBanner();
  renderWrongBankBtn();
  renderStreakDefender();
  renderDailyChallengeCard();
  renderTodaysFocus();
  initMonitorGesture();
  // Restore Hardcore exam preference (#48)
  const hcCheckbox = document.getElementById('hardcore-checkbox');
  if (hcCheckbox) hcCheckbox.checked = localStorage.getItem(STORAGE.HARDCORE_EXAM) === '1';
});

// Persist hardcore-mode preference (#48). The exam page reads `examHardcore`
// at startExam time, so toggling the checkbox between exams just updates the
// stored preference.
function setHardcoreMode(on) {
  try { localStorage.setItem(STORAGE.HARDCORE_EXAM, on ? '1' : '0'); } catch {}
}

function initChips(groupId, cb) {
  const g = document.getElementById(groupId);
  g.setAttribute('role', 'group');
  g.querySelectorAll('.chip').forEach(c => {
    // Set initial aria-pressed based on current selection class
    c.setAttribute('aria-pressed', c.classList.contains('on') ? 'true' : 'false');
    c.addEventListener('click', () => {
      g.querySelectorAll('.chip').forEach(x => {
        x.classList.remove('on');
        x.setAttribute('aria-pressed', 'false');
      });
      c.classList.add('on');
      c.setAttribute('aria-pressed', 'true');
      cb(c.dataset.v);
    });
  });
}

// Keep aria-pressed in sync when chips are toggled programmatically
function syncChipAriaPressed(groupSelector) {
  document.querySelectorAll(groupSelector + ' .chip').forEach(c => {
    c.setAttribute('aria-pressed', c.classList.contains('on') ? 'true' : 'false');
  });
}

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
function showPage(name) {
  const current = document.querySelector('.page.active');
  const next = document.getElementById('page-' + name);
  const activate = () => {
    next.classList.add('active');
    window.scrollTo(0, 0);
    // a11y: move focus to the new page so screen readers announce context
    const focusTarget = next.querySelector('h1, h2, [role="heading"], .page-title') || next;
    if (focusTarget) {
      if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
      try { focusTarget.focus({ preventScroll: true }); } catch (_) {}
    }
  };
  if (current && current !== next) {
    current.classList.add('page-exit');
    current.addEventListener('animationend', function handler() {
      current.removeEventListener('animationend', handler);
      current.classList.remove('active', 'page-exit');
      activate();
    }, { once: true });
    // Fallback in case animationend doesn't fire
    setTimeout(() => {
      if (current.classList.contains('page-exit')) {
        current.classList.remove('active', 'page-exit');
        activate();
      }
    }, 300);
  } else {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    activate();
  }
}

function goSetup() {
  if (examTimer) { clearInterval(examTimer); examTimer = null; }
  if (portTimer) { clearInterval(portTimer); portTimer = null; }
  examMode = false;
  wrongDrillMode = false;
  dailyChallengeMode = false;
  navOpen = false;
  renderHistoryPanel();
  renderStatsCard();
  renderWeakBanner();
  renderStreakBadge();
  renderReadinessCard();
  renderSessionBanner();
  renderWrongBankBtn();
  renderStreakDefender();
  renderDailyChallengeCard();
  renderTodaysFocus();
  showPage('setup');
}

function confirmBack() {
  if (confirm('Go back to the menu? Quiz progress will be lost.')) goSetup();
}

// ══════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE.HISTORY) || '[]'); } catch(e) { return []; }
}
function saveToHistory(entry) {
  try {
    const h = loadHistory();
    h.unshift(entry);
    if (h.length > HISTORY_CAP) h.length = HISTORY_CAP;
    localStorage.setItem(STORAGE.HISTORY, JSON.stringify(h));
  } catch { showToast('Storage full — history not saved', 'error'); }
}

function renderHistoryPanel() {
  const h = loadHistory();
  const panel = document.getElementById('history-panel');
  const list  = document.getElementById('history-list');
  if (h.length === 0) { panel.classList.add('is-hidden'); return; }
  panel.classList.remove('is-hidden');
  list.innerHTML = h.slice(0,8).map(e => {
    const date = new Date(e.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    const color = e.pct >= 80 ? 'var(--green)' : e.pct >= 60 ? 'var(--yellow)' : 'var(--red)';
    const tag   = e.mode === 'exam' ? '<span class="mode-tag">EXAM</span>' : '';
    return `<div class="history-row">
      <div class="h-info">
        <div class="h-topic">${escHtml(e.topic)}${tag}</div>
        <div class="h-bar"><div class="h-bar-fill" style="width:${e.pct}%;background:${color}"></div></div>
      </div>
      <div class="h-score" style="color:${color}">${e.score}/${e.total}</div>
      <div class="h-date">${date}</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════
// STUDY STATS
// ══════════════════════════════════════════
function getStudyStats() {
  const h = loadHistory();
  if (!h.length) return null;
  const totalQ    = h.reduce((a, e) => a + e.total, 0);
  const sessions  = h.length;
  const avgPct    = Math.round(h.reduce((a, e) => a + e.pct, 0) / sessions);
  const bestExam  = h.filter(e => e.mode === 'exam').reduce((best, e) => {
    const scaled = Math.round(100 + (e.score / e.total) * 800);
    return scaled > best ? scaled : best;
  }, 0);
  return { totalQ, sessions, avgPct, bestExam };
}
function getTodayQuestionCount() {
  const today = new Date().toISOString().slice(0, 10);
  return loadHistory()
    .filter(e => new Date(e.date).toISOString().slice(0, 10) === today)
    .reduce((a, e) => a + (e.total || 0), 0);
}

// ── Daily goal ──
const DEFAULT_DAILY_GOAL = 20;
function getDailyGoal() {
  const raw = parseInt(localStorage.getItem(STORAGE.DAILY_GOAL), 10);
  return (Number.isFinite(raw) && raw > 0) ? raw : DEFAULT_DAILY_GOAL;
}
function setDailyGoal(n) {
  const v = parseInt(n, 10);
  if (Number.isFinite(v) && v > 0 && v <= 500) {
    localStorage.setItem(STORAGE.DAILY_GOAL, String(v));
  }
}
function editDailyGoal() {
  const current = getDailyGoal();
  const input = prompt('Daily question goal:', String(current));
  if (input === null) return;
  const v = parseInt(input, 10);
  if (!Number.isFinite(v) || v <= 0 || v > 500) {
    alert('Enter a number between 1 and 500.');
    return;
  }
  setDailyGoal(v);
  renderDailyGoal();
}
function renderDailyGoal() {
  const card = document.getElementById('daily-goal-card');
  if (!card) return;
  const goal = getDailyGoal();
  const done = getTodayQuestionCount();
  const pct = Math.min(100, Math.round((done / goal) * 100));
  const circumference = 2 * Math.PI * 30; // r=30
  const offset = circumference * (1 - Math.min(1, done / goal));
  const fill = document.getElementById('dg-ring-fill');
  const pctEl = document.getElementById('dg-ring-pct');
  const countEl = document.getElementById('dg-progress-count');
  const goalEl = document.getElementById('dg-goal-num');
  const msgEl  = document.getElementById('dg-msg');
  if (!fill || !pctEl) return;
  fill.style.strokeDasharray = circumference;
  fill.style.strokeDashoffset = offset;
  let color;
  if (pct >= 100)      color = 'var(--green)';
  else if (pct >= 60)  color = 'var(--accent)';
  else if (pct >= 25)  color = 'var(--yellow)';
  else                 color = 'var(--red)';
  fill.style.stroke = color;
  pctEl.textContent = pct + '%';
  pctEl.style.color = color;
  countEl.textContent = done;
  goalEl.textContent = goal;
  if (pct >= 100)      msgEl.textContent = '\ud83c\udf89 Goal smashed for today!';
  else if (pct >= 75)  msgEl.textContent = 'Almost there — push through!';
  else if (pct >= 40)  msgEl.textContent = 'Solid progress. Keep going.';
  else if (done > 0)   msgEl.textContent = 'Good start. Stay consistent.';
  else                 msgEl.textContent = "Let's get started today";
}

function renderStatsCard() {
  renderDailyGoal();
  const stats = getStudyStats();
  const card  = document.getElementById('stats-card');
  const grid  = document.getElementById('stats-grid');
  if (!stats || !card || !grid) return;
  card.classList.remove('is-hidden');
  const streakData = getStreakData();
  const todayQs = getTodayQuestionCount();
  const avgColor = stats.avgPct >= 80 ? 'var(--green)' : stats.avgPct >= 60 ? 'var(--yellow)' : 'var(--red)';
  const streakIcon = streakData.currentStreak > 0 ? '\ud83d\udd25' : '\ud83d\udcab';
  grid.innerHTML = `
    <div class="sstat"><div class="sv">${stats.totalQ.toLocaleString()}</div><div class="sl">Questions</div></div>
    <div class="sstat"><div class="sv" style="color:${avgColor}">${stats.avgPct}%</div><div class="sl">Avg Score</div></div>
    <div class="sstat"><div class="sv">${streakIcon} ${streakData.currentStreak}</div><div class="sl">Day streak</div></div>
    <div class="sstat"><div class="sv">${todayQs}</div><div class="sl">Qs today</div></div>
    <div class="sstat"><div class="sv">${stats.bestExam > 0 ? stats.bestExam : '\u2014'}</div><div class="sl">Best exam</div></div>`;
}

// ══════════════════════════════════════════
// TOPIC PROGRESS PAGE
// ══════════════════════════════════════════
// Topic Progress v2 (v4.11) — summary + filters + sort + search + domain grouping
let progressState = { filter: 'all', sort: 'worst', search: '', rows: [] };

function _bucketOf(pct) {
  if (pct === null) return 'untouched';
  if (pct >= 80) return 'strong';
  if (pct >= 60) return 'solid';
  return 'weak';
}

function _buildProgressRows() {
  // Read chip display labels (setup page) so Topic Progress shows the SAME text
  // the user picks from on the menu. The canonical data-v value is kept as the
  // id used for history lookups / drilling / domain grouping.
  const chips = Array.from(document.querySelectorAll('#topic-group .chip'))
    .filter(c => !c.dataset.v.includes('Mixed') && !c.dataset.v.includes('Smart'));
  const h   = loadHistory();
  const now = Date.now();
  return chips.map(chip => {
    const t = chip.dataset.v;
    const label = (chip.textContent || t).trim(); // short display label from the chip
    const entries = h.filter(e => e.topic === t);
    const domainKey = TOPIC_DOMAINS[t] || 'concepts';
    const obj = (topicResources[t] && topicResources[t].obj) || '';
    if (entries.length === 0) {
      return { t, label, pct: null, total: 0, attempts: 0, daysSince: null, lastDate: 0, domainKey, obj };
    }
    const totalQ   = entries.reduce((a, e) => a + e.total, 0);
    const wCorrect = entries.reduce((a, e) => a + e.score * diffWeight(e.difficulty), 0);
    const wTotal   = entries.reduce((a, e) => a + e.total * diffWeight(e.difficulty), 0);
    const pct      = Math.round((wCorrect / wTotal) * 100);
    const lastDate = Math.max.apply(null, entries.map(e => new Date(e.date).getTime()));
    const daysSince = Math.round((now - lastDate) / 86400000);
    return { t, label, pct, total: totalQ, attempts: entries.length, daysSince, lastDate, domainKey, obj };
  });
}

function _sortProgressRows(rows, mode) {
  const sorted = rows.slice();
  const byLabel = (a, b) => (a.label || a.t).localeCompare(b.label || b.t);
  if (mode === 'alpha') {
    sorted.sort(byLabel);
  } else if (mode === 'most') {
    sorted.sort((a, b) => (b.total || 0) - (a.total || 0) || byLabel(a, b));
  } else if (mode === 'recent') {
    sorted.sort((a, b) => (b.lastDate || 0) - (a.lastDate || 0) || byLabel(a, b));
  } else { // 'worst' — default: untouched last, then lowest pct first
    sorted.sort((a, b) => {
      if (a.pct === null && b.pct === null) return byLabel(a, b);
      if (a.pct === null) return 1;
      if (b.pct === null) return -1;
      return a.pct - b.pct;
    });
  }
  return sorted;
}

function _progressRowMatches(row) {
  // Filter chip
  if (progressState.filter === 'weak' && _bucketOf(row.pct) !== 'weak') return false;
  if (progressState.filter === 'strong' && _bucketOf(row.pct) !== 'strong') return false;
  if (progressState.filter === 'untouched' && row.pct !== null) return false;
  // Search box (matches both the short display label and the canonical id, plus objective)
  const q = progressState.search.trim().toLowerCase();
  if (q) {
    const hay = (row.label + ' ' + row.t).toLowerCase();
    if (!hay.includes(q) && !(row.obj && row.obj.includes(q))) return false;
  }
  return true;
}

function _progressRowHtml(row) {
  const { t, label, pct, total, daysSince, obj } = row;
  let ragClass, color, metaRight;
  if (pct === null) {
    ragClass = 'rag-grey'; color = 'var(--text-dim)'; metaRight = 'Not studied yet';
  } else {
    if (pct >= 80) { ragClass = 'rag-green'; color = 'var(--green)'; }
    else if (pct >= 60) { ragClass = 'rag-yellow'; color = 'var(--yellow)'; }
    else { ragClass = 'rag-red'; color = 'var(--red)'; }
    metaRight = total + 'Q · ' + (daysSince === 0 ? 'today' : daysSince + 'd ago');
  }
  const barW = pct !== null ? pct : 0;
  const pctTxt = pct !== null ? pct + '%' : '—';
  const objBadge = obj ? `<span class="topic-obj-badge" title="N10-009 objective ${obj}">${obj}</span>` : '';
  // Show the same short label the user picks from on the setup page
  const display = label || t;
  return `<div class="topic-row" onclick="drillTopic('${escHtml(t).replace(/'/g, "\\'")}')">
    <div class="topic-rag ${ragClass}"></div>
    <div class="topic-info">
      <div class="topic-name-line">${objBadge}<span class="topic-name">${escHtml(display)}</span></div>
      <div class="topic-meta">${metaRight}</div>
      <div class="topic-mini-bar"><div class="topic-mini-fill" style="width:${barW}%;background:${color}"></div></div>
    </div>
    <div class="topic-pct-lbl" style="color:${color}">${pctTxt}</div>
  </div>`;
}

function _renderProgressSummary(rows) {
  const el = document.getElementById('progress-summary');
  if (!el) return;
  const buckets = { strong: 0, solid: 0, weak: 0, untouched: 0 };
  rows.forEach(r => { buckets[_bucketOf(r.pct)]++; });
  const total = rows.length;
  const touched = total - buckets.untouched;
  const coveragePct = total ? Math.round((touched / total) * 100) : 0;
  el.innerHTML = `
    <div class="ps-stat ps-strong"><div class="ps-n">${buckets.strong}</div><div class="ps-l">&#128994; Strong</div></div>
    <div class="ps-stat ps-solid"><div class="ps-n">${buckets.solid}</div><div class="ps-l">&#128993; Solid</div></div>
    <div class="ps-stat ps-weak"><div class="ps-n">${buckets.weak}</div><div class="ps-l">&#128308; Weak</div></div>
    <div class="ps-stat ps-untouched"><div class="ps-n">${buckets.untouched}</div><div class="ps-l">&#9898; Untouched</div></div>
    <div class="ps-stat ps-coverage">
      <div class="ps-n">${touched}<span class="ps-n-sub">/${total}</span></div>
      <div class="ps-l">Topics touched &middot; ${coveragePct}%</div>
      <div class="ps-coverage-bar"><div class="ps-coverage-fill" style="width:${coveragePct}%"></div></div>
    </div>`;
  // Lab progress section
  try {
    const labCompletions = JSON.parse(localStorage.getItem(STORAGE.LAB_COMPLETIONS) || '{}');
    const totalLabs = (typeof TB_LABS !== 'undefined') ? TB_LABS.length : 22;
    const labsDone = Object.keys(labCompletions).filter(k => (typeof TB_LABS !== 'undefined') ? TB_LABS.some(l => l.id === k) : true).length;
    const labPct = totalLabs ? Math.round((labsDone / totalLabs) * 100) : 0;
    const labsByDiff = { Beginner: { done: 0, total: 0 }, Intermediate: { done: 0, total: 0 }, Advanced: { done: 0, total: 0 } };
    if (typeof TB_LABS !== 'undefined') {
      TB_LABS.forEach(l => {
        const d = l.difficulty || 'Intermediate';
        if (!labsByDiff[d]) labsByDiff[d] = { done: 0, total: 0 };
        labsByDiff[d].total++;
        if (labCompletions[l.id]) labsByDiff[d].done++;
      });
    }
    el.innerHTML += `
      <div class="ps-lab-section" style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div class="ps-stat" style="min-width:auto"><div class="ps-n">🧪 ${labsDone}<span class="ps-n-sub">/${totalLabs}</span></div><div class="ps-l">Labs completed &middot; ${labPct}%</div>
            <div class="ps-coverage-bar" style="margin-top:4px"><div class="ps-coverage-fill" style="width:${labPct}%;background:var(--accent)"></div></div>
          </div>
          ${Object.entries(labsByDiff).filter(([,v]) => v.total > 0).map(([diff, v]) => {
            const icon = diff === 'Beginner' ? '🟢' : diff === 'Intermediate' ? '🟡' : '🔴';
            return `<div class="ps-stat" style="min-width:auto"><div class="ps-n">${icon} ${v.done}/${v.total}</div><div class="ps-l">${diff}</div></div>`;
          }).join('')}
        </div>
      </div>`;
  } catch (_) {}
}

function _renderProgressGrouped(rows) {
  // Group by domain in official 1→5 order, compute avg pct per domain, honor filter/search.
  const order = ['concepts','implementation','operations','security','troubleshooting'];
  const grouped = {};
  order.forEach(k => { grouped[k] = []; });
  rows.forEach(r => { (grouped[r.domainKey] || (grouped[r.domainKey] = [])).push(r); });
  let html = '';
  order.forEach(dk => {
    const groupRows = _sortProgressRows(grouped[dk] || [], progressState.sort);
    const visible = groupRows.filter(_progressRowMatches);
    if (!visible.length) return;
    // Domain average uses touched topics only
    const touched = groupRows.filter(r => r.pct !== null);
    const avg = touched.length ? Math.round(touched.reduce((a, r) => a + r.pct, 0) / touched.length) : null;
    let avgColor = 'var(--text-dim)';
    if (avg !== null) {
      avgColor = avg >= 80 ? 'var(--green)' : (avg >= 60 ? 'var(--yellow)' : 'var(--red)');
    }
    const weightPct = Math.round(DOMAIN_WEIGHTS[dk] * 100);
    html += `<details class="progress-domain" open>
      <summary class="progress-domain-head">
        <span class="pd-name">${DOMAIN_LABELS[dk]}</span>
        <span class="pd-weight">${weightPct}% of exam</span>
        <span class="pd-avg" style="color:${avgColor}">${avg !== null ? avg + '%' : '—'}</span>
        <span class="pd-count">${visible.length}/${groupRows.length}</span>
      </summary>
      <div class="progress-domain-rows">${visible.map(_progressRowHtml).join('')}</div>
    </details>`;
  });
  const grid = document.getElementById('progress-topic-grid');
  if (grid) grid.innerHTML = html || '<p style="color:var(--text-dim);text-align:center;padding:24px">No topics match this filter.</p>';
}

function renderProgressPage() {
  progressState.rows = _buildProgressRows();
  _renderProgressSummary(progressState.rows);
  _renderProgressGrouped(progressState.rows);
}

function setProgressFilter(name) {
  progressState.filter = name;
  document.querySelectorAll('.prog-filter-btn').forEach(btn => {
    const active = btn.getAttribute('data-filter') === name;
    btn.classList.toggle('prog-filter-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  _renderProgressGrouped(progressState.rows);
}

function setProgressSort(mode) {
  progressState.sort = mode;
  _renderProgressGrouped(progressState.rows);
}

function filterProgressPage() {
  const input = document.getElementById('progress-search');
  progressState.search = input ? input.value : '';
  _renderProgressGrouped(progressState.rows);
}

function drillTopic(t) {
  topic = t;
  document.querySelectorAll('#topic-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === t));
  syncChipAriaPressed('#topic-group');
  goSetup();
  // Reveal the selected chip: open its collapsed domain accordion, scroll to
  // it, and flash briefly so the landing target is obvious.
  requestAnimationFrame(() => {
    const chip = document.querySelector('#topic-group .chip.on');
    if (!chip) return;
    const domainGroup = chip.closest('details.topic-domain-group');
    if (domainGroup && !domainGroup.open) domainGroup.open = true;
    chip.scrollIntoView({ behavior: 'smooth', block: 'center' });
    chip.classList.add('chip-flash');
    setTimeout(() => chip.classList.remove('chip-flash'), 1400);
  });
}

// ══════════════════════════════════════════
// STREAK
// ══════════════════════════════════════════
function getStreak() {
  try { return JSON.parse(localStorage.getItem(STORAGE.STREAK) || '{"current":0,"best":0,"last":null}'); }
  catch(e) { return { current: 0, best: 0, last: null }; }
}
function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const s = getStreak();
  if (s.last === today) return s;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  s.current = (s.last === yesterday) ? s.current + 1 : 1;
  s.best = Math.max(s.best || 0, s.current);
  s.last = today;
  localStorage.setItem(STORAGE.STREAK, JSON.stringify(s));
  return s;
}
function renderStreakBadge() {
  const s = getStreak();
  const el = document.getElementById('streak-badge');
  if (!el) return;
  if (s.current >= 1) {
    const fire = s.current >= 7 ? '\ud83d\udd25\ud83d\udd25' : '\ud83d\udd25';
    const best = s.best > s.current ? ' \u00b7 Best: ' + s.best : '';
    el.textContent = fire + ' ' + s.current + ' day streak' + best;
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}

// ══════════════════════════════════════════
// SPACED REPETITION
// ══════════════════════════════════════════

// Shared scoring helper used by both getSpacedRepTopic and buildSessionPlan
// Uses Leitner-inspired decay: topics you've aced many times decay slower,
// topics you struggle with or haven't seen much decay fast.
function _scoreTopicNeed(topic, historyEntries, now) {
  const entries = historyEntries.filter(e => e.topic === topic);
  if (entries.length === 0) return { score: 1.0, reason: 'Never studied', color: 'var(--text-dim)' };

  const daysSince = (now - new Date(entries[0].date)) / 86400000;
  const recentAvg = entries.slice(0, 3).reduce((a, e) => a + e.pct, 0) / Math.min(entries.length, 3);

  // Confidence level: consecutive 80%+ sessions (like Leitner boxes)
  let confidence = 0;
  for (const e of entries) { if (e.pct >= 80) confidence++; else break; }

  // Decay interval — higher confidence = slower decay (1d, 3d, 7d, 14d, 30d)
  const intervals = [1, 3, 7, 14, 30];
  const interval = intervals[Math.min(confidence, intervals.length - 1)];
  const decayScore = Math.min(daysSince / interval, 1.0);

  // Performance score — how much room to improve
  const perfScore = (100 - recentAvg) / 100;

  // Wrong bank boost — topics with wrong answers get priority
  const wrongBank = loadWrongBank();
  const wrongCount = wrongBank.filter(w => w.topic === topic).length;
  const wrongBoost = Math.min(wrongCount * 0.1, 0.3);

  // Combined: 35% decay + 45% performance + 20% wrong bank
  const score = decayScore * 0.35 + perfScore * 0.45 + wrongBoost + (entries.length < 3 ? 0.1 : 0);

  let reason, color;
  if (wrongCount > 0) { reason = wrongCount + ' wrong answer' + (wrongCount > 1 ? 's' : '') + ' banked'; color = 'var(--red)'; }
  else if (recentAvg < 60) { reason = Math.round(recentAvg) + '% avg \u2014 needs work'; color = 'var(--red)'; }
  else if (daysSince >= interval) { reason = Math.round(daysSince) + 'd ago \u2014 due for review'; color = 'var(--yellow)'; }
  else if (recentAvg < 80) { reason = Math.round(recentAvg) + '% avg \u2014 room to improve'; color = 'var(--yellow)'; }
  else { reason = Math.round(recentAvg) + '% avg \u2014 keep sharp'; color = 'var(--green)'; }
  return { score, reason, color };
}

function _getAllStudyTopics() {
  return Array.from(document.querySelectorAll('#topic-group .chip'))
    .map(c => c.dataset.v)
    .filter(v => !v.includes('Mixed') && !v.includes('Smart'));
}

function getSpacedRepTopic() {
  const allTopics = _getAllStudyTopics();
  const h = loadHistory().filter(e => e.topic !== MIXED_TOPIC && e.topic !== EXAM_TOPIC);
  const now = Date.now();

  // Score all topics and pick from top 3 with weighted randomness
  const scored = allTopics.map(t => ({ topic: t, ...(_scoreTopicNeed(t, h, now)) }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, Math.min(3, scored.length));
  const totalWeight = top.reduce((a, t) => a + t.score, 0);
  let r = Math.random() * totalWeight;
  for (const t of top) {
    r -= t.score;
    if (r <= 0) return t.topic;
  }
  return top[0].topic;
}

// ══════════════════════════════════════════
// OFFLINE QUESTION CACHE
// ══════════════════════════════════════════
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function _cacheKey(t, d, n) {
  return 'nplus_qcache__' + t.replace(/[^a-zA-Z0-9]/g, '_') + '__' + d.replace(/[^a-zA-Z0-9]/g, '_') + '__' + n;
}
function cacheQuestions(t, d, n, qs) {
  try { localStorage.setItem(_cacheKey(t, d, n), JSON.stringify({ ts: Date.now(), qs })); } catch(e) {}
  pruneCache();
}
function getCachedQuestions(t, d, n) {
  try {
    const raw = localStorage.getItem(_cacheKey(t, d, n));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > CACHE_TTL) return null;
    return obj.qs;
  } catch(e) { return null; }
}
function pruneCache() {
  try {
    const cacheKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('nplus_qcache__')) {
        try {
          const obj = JSON.parse(localStorage.getItem(k));
          cacheKeys.push({ key: k, ts: obj.ts || 0 });
        } catch { cacheKeys.push({ key: k, ts: 0 }); }
      }
    }
    const now = Date.now();
    cacheKeys.forEach(c => { if (now - c.ts > CACHE_TTL) localStorage.removeItem(c.key); });
    const remaining = cacheKeys.filter(c => now - c.ts <= CACHE_TTL);
    if (remaining.length > 20) {
      remaining.sort((a, b) => a.ts - b.ts);
      remaining.slice(0, remaining.length - 20).forEach(c => localStorage.removeItem(c.key));
    }
  } catch(e) {}
}
function showCacheNotice(show) {
  const el = document.getElementById('cache-notice');
  if (el) el.classList.toggle('show', show);
}

// ══════════════════════════════════════════
// WRONG ANSWERS BANK
// ══════════════════════════════════════════
function loadWrongBank() {
  try { return JSON.parse(localStorage.getItem(STORAGE.WRONG_BANK) || '[]'); } catch { return []; }
}
function saveWrongBank(bank) {
  try { localStorage.setItem(STORAGE.WRONG_BANK, JSON.stringify(bank)); } catch { showToast('Storage full — wrong bank not saved', 'error'); }
}

function addToWrongBank(q, chosen) {
  const bank = loadWrongBank();
  // Deduplicate by question text
  const exists = bank.find(b => b.question === q.question);
  if (exists) return;
  bank.push({
    question: q.question,
    options: q.options,
    answer: q.answer,
    answers: q.answers || null,
    type: q.type || 'mcq',
    items: q.items || null,
    correctOrder: q.correctOrder || null,
    explanation: q.explanation,
    topic: q.topic || activeQuizTopic,
    difficulty: q.difficulty || diff,
    rightCount: 0,
    addedDate: new Date().toISOString()
  });
  // Cap wrong bank size — oldest entries drop off
  if (bank.length > WRONG_BANK_CAP) bank.length = WRONG_BANK_CAP;
  saveWrongBank(bank);
}

function graduateFromBank(questionText) {
  const bank = loadWrongBank();
  const idx = bank.findIndex(b => b.question === questionText);
  if (idx === -1) return;
  bank[idx].rightCount = (bank[idx].rightCount || 0) + 1;
  if (bank[idx].rightCount >= 2) {
    bank.splice(idx, 1); // Graduated!
  }
  saveWrongBank(bank);
}

function renderWrongBankBtn() {
  const row = document.getElementById('wrong-bank-row');
  const btn = document.getElementById('wrong-bank-btn');
  if (!row || !btn) return;
  const bank = loadWrongBank();
  if (bank.length === 0) {
    row.classList.add('is-hidden');
    return;
  }
  row.classList.remove('is-hidden');
  const badge = btn.querySelector('.wrong-count-badge');
  if (badge) badge.textContent = bank.length;
}

function clearWrongBank() {
  const bank = loadWrongBank();
  if (bank.length === 0) return;
  if (!confirm(`Clear all ${bank.length} wrong answers? This cannot be undone.`)) return;
  localStorage.removeItem(STORAGE.WRONG_BANK);
  renderWrongBankBtn();
}

function startWrongDrill() {
  const bank = loadWrongBank();
  if (bank.length === 0) {
    alert('No wrong answers saved yet. Keep quizzing!');
    return;
  }

  const key = document.getElementById('api-key').value.trim();
  apiKey = key; // May be empty, but wrong drill doesn't need API

  wrongDrillMode = true;
  examMode = false;
  sessionMode = false;
  activeQuizTopic = 'Wrong Answers Drill';

  // Pick up to 10 questions from the bank (shuffle)
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  questions = shuffled.slice(0, 10).map(b => ({
    question: b.question,
    options: b.options,
    answer: b.answer,
    answers: b.answers,
    type: b.type || 'mcq',
    items: b.items,
    correctOrder: b.correctOrder,
    explanation: b.explanation,
    topic: b.topic,
    difficulty: b.difficulty
  }));

  current = 0; score = 0; streak = 0; bestStreak = 0; answered = 0; log = [];
  quizFlags = new Array(questions.length).fill(false);
  showCacheNotice(false);
  showPage('quiz');
  render();
}

// ══════════════════════════════════════════
// WEAK TOPIC DETECTOR
// ══════════════════════════════════════════
function getWeakTopic() {
  const h = loadHistory().filter(e => e.topic !== MIXED_TOPIC && e.topic !== EXAM_TOPIC && e.total >= 5);
  if (h.length < 1) return null;
  const map = {};
  h.forEach(e => {
    if (!map[e.topic]) map[e.topic] = { correct: 0, total: 0 };
    map[e.topic].correct += e.score;
    map[e.topic].total   += e.total;
  });
  let weakest = null, lowestPct = 100;
  Object.entries(map).forEach(([t, s]) => {
    const pct = (s.correct / s.total) * 100;
    if (pct < lowestPct) { lowestPct = pct; weakest = t; }
  });
  return weakest && lowestPct < 75 ? { topic: weakest, pct: Math.round(lowestPct) } : null;
}

function renderWeakBanner() {
  const weak   = getWeakTopic();
  const banner = document.getElementById('weak-banner');
  if (!banner) return;
  if (!weak) { banner.classList.add('is-hidden'); return; }
  banner.classList.remove('is-hidden');
  document.getElementById('weak-topic-name').textContent = weak.topic;
  document.getElementById('weak-topic-pct').textContent  = weak.pct + '%';
  document.getElementById('weak-drill-btn').onclick = () => {
    topic = weak.topic;
    document.querySelectorAll('#topic-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === weak.topic));
    syncChipAriaPressed('#topic-group');
    diff = DEFAULT_DIFF;
    document.querySelectorAll('#diff-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === DEFAULT_DIFF));
    syncChipAriaPressed('#diff-group');
    qCount = 10;
    document.querySelectorAll('#count-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === '10'));
    syncChipAriaPressed('#count-group');
    startQuiz();
  };
}

// ══════════════════════════════════════════
// API KEY VALIDATION
// ══════════════════════════════════════════
function validateApiKey(key) {
  if (!key) return 'Please enter your Anthropic API key.';
  if (!key.startsWith('sk-ant-')) return 'Invalid API key format. Anthropic keys start with "sk-ant-".';
  if (key.length < 20) return 'API key looks too short. Please check and try again.';
  return null;
}

// ══════════════════════════════════════════
// START REGULAR QUIZ
// ══════════════════════════════════════════
async function startQuiz() {
  const key = document.getElementById('api-key').value.trim();
  const errBox = document.getElementById('setup-err');
  errBox.classList.add('is-hidden');
  const keyErr = validateApiKey(key);
  if (keyErr) { errBox.textContent = keyErr; errBox.classList.remove('is-hidden'); return; }
  apiKey = key;
  localStorage.setItem(STORAGE.KEY, key);
  examMode = false;
  wrongDrillMode = false;

  activeQuizTopic = topic.includes('Smart') ? getSpacedRepTopic() : topic;

  document.getElementById('load-progress').classList.add('is-hidden');
  showPage('loading');
  document.getElementById('loading-msg').textContent = topic.includes('Smart')
    ? '\ud83e\udde0 Smart pick: ' + activeQuizTopic + '\u2026'
    : 'Generating ' + qCount + ' ' + diff + ' questions on ' + activeQuizTopic + '\u2026';

  showCacheNotice(false);
  // Fire topic brief in parallel (non-blocking)
  const briefTopic = activeQuizTopic;
  if (!briefTopic.includes('Mixed')) {
    fetchTopicBrief(key, briefTopic);
  } else {
    const tb = document.getElementById('topic-brief');
    if (tb) tb.classList.add('is-hidden');
  }
  try {
    questions = await fetchQuestions(key, activeQuizTopic, diff, qCount);
    // Enhancement 1: AI second-pass validation (runs in background, non-blocking for UX)
    document.getElementById('loading-msg').textContent = 'Verifying question accuracy\u2026';
    questions = await aiValidateQuestions(key, questions);
    // Enhancement 2 + 4: Programmatic validation + reported question exclusion
    questions = validateQuestions(questions);
    if (questions.length === 0) throw new Error('All generated questions failed validation. Try again.');
  } catch(e) {
    const cached = getCachedQuestions(activeQuizTopic, diff, qCount);
    if (cached) {
      questions = cached;
      showCacheNotice(true);
    } else {
      showPage('setup');
      errBox.textContent = '\u26a0\ufe0f ' + (e.message || 'Failed. Check your API key.');
      errBox.classList.remove('is-hidden');
      return;
    }
  }
  // Inject CLI sim / topology PBQs from predefined bank
  const pbqInjectCount = qCount >= 10 ? 1 : 0;
  if (pbqInjectCount > 0) {
    questions = injectPBQs(questions, activeQuizTopic, pbqInjectCount);
  }
  current = 0; score = 0; streak = 0; bestStreak = 0; answered = 0; log = [];
  quizFlags = new Array(questions.length).fill(false);
  showPage('quiz');
  render();
}

// ══════════════════════════════════════════
// START EXAM SIMULATION
// ══════════════════════════════════════════
async function startExam() {
  const key = document.getElementById('api-key').value.trim();
  const errBox = document.getElementById('setup-err');
  errBox.classList.add('is-hidden');
  const keyErr = validateApiKey(key);
  if (keyErr) { errBox.textContent = keyErr; errBox.classList.remove('is-hidden'); return; }
  apiKey = key;
  localStorage.setItem(STORAGE.KEY, key);

  examMode = true;
  // Hardcore mode (#48): read the persisted checkbox state at start time
  examHardcore = localStorage.getItem(STORAGE.HARDCORE_EXAM) === '1';
  const examPage = document.getElementById('page-exam');
  if (examPage) examPage.classList.toggle('hardcore-active', examHardcore);
  wrongDrillMode = false;
  examQuestions = [];
  examAnswers   = [];
  examCurrent   = 0;
  examTimeLeft  = EXAM_TIME_SECONDS;
  navOpen       = false;

  showPage('loading');
  document.getElementById('loading-msg').textContent = 'Building 90-question exam\u2026';
  const prog = document.getElementById('load-progress');
  const fill = document.getElementById('load-bar-fill');
  const lbl  = document.getElementById('load-progress-label');
  fill.style.width = '0%';
  prog.classList.remove('is-hidden');

  const BATCHES = 5, BATCH_SIZE = 18, MAX_RETRIES = 2;
  try {
    for (let i = 0; i < BATCHES; i++) {
      fill.style.width = ((i / BATCHES) * 100) + '%';
      lbl.textContent  = `Batch ${i + 1} / ${BATCHES}\u2026`;
      document.getElementById('loading-msg').textContent = `Generating questions (${examQuestions.length + BATCH_SIZE} / 90)\u2026`;
      let batch = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          batch = await fetchQuestions(key, MIXED_TOPIC, 'Mixed', BATCH_SIZE);
          break;
        } catch(retryErr) {
          if (attempt === MAX_RETRIES) throw retryErr;
          lbl.textContent = `Batch ${i + 1} failed, retrying (${attempt + 1}/${MAX_RETRIES})\u2026`;
          await new Promise(r => setTimeout(r, 1500));
        }
      }
      examQuestions = examQuestions.concat(batch);
    }
    fill.style.width = '100%';
    // Inject 2 CLI/topo PBQs into exam
    examQuestions = injectPBQs(examQuestions, MIXED_TOPIC, 2);
    examAnswers = examQuestions.map(() => ({ chosen: null, flagged: false, msChosen: [], orderSeq: [], cliRan: [], topoState: {} }));
    showPage('exam');
    renderExam();
    startExamTimer();
  } catch(e) {
    examMode = false;
    showPage('setup');
    errBox.textContent = '\u26a0\ufe0f ' + e.message;
    errBox.classList.remove('is-hidden');
  }
}

// ══════════════════════════════════════════
// API — FETCH QUESTIONS (with PBQ support)
// ══════════════════════════════════════════
async function fetchQuestions(key, qTopic, difficulty, n) {
  const topicHints = {
    'Integrating Networked Devices': 'IoT devices, ICS/SCADA systems, OT/IT convergence, smart building tech, embedded systems, segmentation of IoT, industrial control risks.',
    'Network Troubleshooting & Tools': 'Troubleshooting methodology, ping, traceroute/tracert, ipconfig/ifconfig, nslookup, dig, netstat, arp, route, Wireshark/packet capture, cable testers, TDR, loopback testing, common network faults.',
    'NAT & IP Services': 'Static NAT, dynamic NAT, PAT/NAT overload, inside/outside local/global, port forwarding, NAT64, private vs public IP ranges, IP helper addresses.',
    'AAA & Authentication': 'AAA framework, RADIUS protocol and ports, TACACS+, RADIUS vs TACACS+ differences, 802.1X port-based authentication, EAP variants, Kerberos, LDAP, MFA, certificate-based auth.',
    'NTP, ICMP & Traffic Types': 'NTP stratum levels, NTP hierarchy, ICMP message types (echo, TTL exceeded, unreachable, redirect), ping and traceroute mechanics, unicast vs multicast vs broadcast vs anycast, IGMP.',
    'Ethernet Standards': '802.3 standards, 10BASE-T, 100BASE-TX, 1000BASE-T, 10GBASE-T, 1000BASE-SX/LX, 10GBASE-SR/LR, fibre vs copper, auto-negotiation, duplex, PoE (802.3af/at/bt), MDI/MDIX.',
    'IPsec & VPN Protocols': 'IPsec tunnel vs transport mode, AH vs ESP, IKEv1 vs IKEv2, IKE Phase 1 (main/aggressive), IKE Phase 2, ISAKMP, SA negotiation, site-to-site VPN, remote access VPN, SSL/TLS VPN, split tunneling, GRE tunnels, L2TP/IPsec, OpenVPN.',
    'SMB & Network File Services': 'SMB protocol versions (SMBv1/2/3), CIFS, NFS (v3/v4), Samba, file share permissions vs NTFS, UNC paths, port 445 (SMB), port 2049 (NFS), iSCSI, SAN vs NAS, FTP/SFTP/FTPS, SCP.',
    'Cloud Networking & VPCs': 'VPC (Virtual Private Cloud), subnets in cloud, route tables, internet gateways, NAT gateways, security groups vs NACLs, VPC peering, transit gateways, VPN to cloud, Direct Connect / ExpressRoute, cloud service models (IaaS/PaaS/SaaS), shared responsibility model, multi-tenant networking.',
    'Port Numbers': 'Every question must be about matching a protocol to its port number or transport (TCP/UDP). Cover: FTP data 20/TCP, FTP control 21/TCP, SSH & SFTP 22/TCP, Telnet 23/TCP, SMTP 25/TCP, DNS 53 (TCP & UDP), DHCP server 67/UDP & client 68/UDP, TFTP 69/UDP, HTTP 80/TCP, Kerberos 88 (TCP & UDP), POP3 110/TCP, NTP 123/UDP, NetBIOS name 137/UDP, NetBIOS datagram 138/UDP, NetBIOS session 139/TCP, IMAP 143/TCP, SNMP queries 161/UDP & traps 162/UDP, LDAP 389/TCP, HTTPS 443/TCP, SMB 445/TCP, Syslog 514/UDP, SMTP submission/TLS 587/TCP, LDAPS 636/TCP, iSCSI 3260/TCP, TACACS+ 49/TCP, BGP 179/TCP, RADIUS auth 1812/UDP & accounting 1813/UDP, NFS 2049/TCP & UDP, MySQL 3306/TCP, RDP 3389/TCP, SIP 5060/UDP & TLS 5061/TCP, VNC 5900/TCP, IKE/IPsec 500/UDP, IPsec NAT-T 4500/UDP, L2TP 1701/UDP, OpenVPN 1194/UDP, FTPS implicit 990/TCP. Use tricky distractors.',
    'PKI & Certificate Management': 'Public Key Infrastructure: Root CA, Intermediate CA, end-entity (leaf) certificates and the full chain of trust. Certificate fields: CN, SAN, issuer, expiry. Self-signed vs CA-signed. CRL and OCSP. TLS handshake steps. Cipher suites. Wildcard certificates. Certificate pinning. Private vs public keys. PKI use cases: HTTPS, email signing (S/MIME), VPN certificate auth, code signing.',
    'CompTIA Troubleshooting Methodology': 'The CompTIA 7-step troubleshooting methodology: 1) Identify the problem, 2) Establish a theory, 3) Test the theory, 4) Establish a plan of action, 5) Implement the solution or escalate, 6) Verify full system functionality and implement preventive measures, 7) Document findings. When to escalate vs implement.',
    'Firewalls, DMZ & Security Zones': 'Stateful vs stateless firewalls. NGFW. UTM. Security zones: trusted, untrusted, DMZ. Screened subnet. Implicit deny. Firewall rule order and ACL processing. Content/URL filtering. Active-passive HA. Proxy firewalls. Host-based vs network-based firewalls.',
    'WPA3 & EAP Authentication': 'WPA3-Personal: SAE/Dragonfly. WPA3-Enterprise: 192-bit security. OWE. WPA3 vs WPA2. EAP types: EAP-TLS, PEAP, EAP-TTLS, EAP-FAST. 802.1X roles: Supplicant, Authenticator, Authentication Server. Wi-Fi Easy Connect. Transition mode.',
    'SDN, NFV & Automation': 'SDN: control/data plane separation. SDN controller, northbound/southbound APIs, OpenFlow. NFV: VNF, virtualising network functions. IaC: Ansible, Terraform, Puppet. YANG/NETCONF. Intent-based networking. REST APIs. Zero-touch provisioning.'
  };
  // N10-009 domain-weighted distribution for Mixed mode (23/20/19/14/24)
  let mixedDistributionStr = '';
  if (qTopic === MIXED_TOPIC) {
    const dist = computeDomainDistribution(n);
    mixedDistributionStr = `\n\nMANDATORY DOMAIN DISTRIBUTION (CompTIA N10-009 official weights): Of the ${n} questions, generate exactly:\n- ${dist.concepts} from Domain 1.0 Networking Concepts (23%) — topics like OSI, TCP/IP, subnetting, IPv6, DNS, DHCP, NAT, ports, cloud, virtualisation\n- ${dist.implementation} from Domain 2.0 Network Implementation (20%) — routing, switching, VLANs, wireless, Ethernet, cabling, SDN, data center architectures\n- ${dist.operations} from Domain 3.0 Network Operations (19%) — network ops, monitoring/SNMP, WAN, SD-WAN/SASE, BCDR, data centres\n- ${dist.security} from Domain 4.0 Network Security (14%) — securing TCP/IP, firewalls, AAA, IPsec/VPN, PKI, WPA3, attacks & threats, physical security\n- ${dist.troubleshooting} from Domain 5.0 Network Troubleshooting (24%) — methodology, tools (ping/trace/netstat), common faults\n`;
  }
  const expectedObj = (qTopic !== MIXED_TOPIC && topicResources[qTopic]) ? topicResources[qTopic].obj : null;
  const topicStr = qTopic === MIXED_TOPIC
    ? 'Cover a broad mix of Network+ N10-009 exam topics across all 5 official CompTIA domains.'
    : `Focus only on: "${qTopic}" for the CompTIA Network+ N10-009 exam (primary objective ${expectedObj || 'N/A'}).${topicHints[qTopic] ? ' Specifically cover: ' + topicHints[qTopic] : ''}`;

  const diffStr = {
    'Foundational':  'Foundational: test basic recall and definitions. Clear right answers.',
    'Exam Level':    'Exam Level: scenario-based, mirrors real CompTIA style. Plausible distractors.',
    'Hard / Tricky': 'Hard: tricky edge cases, near-identical distractors, deep understanding required.',
    'Mixed':         'Mix of foundational, exam-level, and hard questions across all difficulties.'
  }[difficulty] || DEFAULT_DIFF;

  // Determine PBQ count
  const pbqCount = n >= 10 ? 2 : (n >= 7 ? 1 : 0);
  const mcqCount = n - pbqCount;

  const pbqInstructions = pbqCount > 0 ? `

IMPORTANT: Out of the ${n} questions, generate exactly ${mcqCount} as standard MCQ and ${pbqCount} as performance-based questions (PBQ).

For standard MCQ, use this format:
{"type":"mcq","question":"...","difficulty":"...","topic":"...","objective":"X.Y","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A|B|C|D","explanation":"..."}

For PBQ, use ONE of these two formats:

1. MULTI-SELECT (choose 2 or 3 correct answers from 5 options):
{"type":"multi-select","question":"(Choose TWO) ...","difficulty":"...","topic":"...","objective":"X.Y","options":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"answers":["A","C"],"explanation":"..."}

2. ORDERING (put 4-5 items in correct order):
{"type":"order","question":"Arrange these in the correct order...","difficulty":"...","topic":"...","objective":"X.Y","items":["Item one","Item two","Item three","Item four"],"correctOrder":[2,0,3,1],"explanation":"..."}
For ordering: correctOrder is an array of indices (0-based) representing the correct sequence. correctOrder[0] = index of the item that should be FIRST.` : '';

  const prompt = `You are a CompTIA Network+ N10-009 exam question writer. You ONLY write questions that map to the official N10-009 exam objectives. Never write questions about content outside the N10-009 blueprint.

${topicStr}${mixedDistributionStr}
Difficulty: ${diffStr}

Generate exactly ${n} multiple choice questions. Requirements:
- 4 options each (or 5 for multi-select): A, B, C, D (E for multi-select)
- One correct answer only (unless multi-select)
- Distractors must be plausible - never obviously wrong
- Vary the correct answer letter across questions
- Each explanation must state WHY the answer is correct AND briefly why the main wrong option is wrong (2-3 sentences max)
- No repeated questions

MANDATORY N10-009 OBJECTIVE TAGGING:
- Every question MUST include an "objective" field with the CompTIA N10-009 exam objective number (format "X.Y" — e.g., "1.4", "2.1", "4.3", "5.1")
- Valid objectives are 1.1–1.8 (Concepts), 2.1–2.4 (Implementation), 3.1–3.5 (Operations), 4.1–4.5 (Security), 5.1–5.5 (Troubleshooting)
- If you cannot map the question to a specific N10-009 objective, do NOT write the question — write a different one that does map${expectedObj ? `\n- For this topic, use objective "${expectedObj}" (or an adjacent sub-objective in the same domain if more appropriate)` : ''}
${pbqInstructions}

CRITICAL — SELF-VERIFICATION PROTOCOL (you MUST follow these steps for EVERY question):
Step 1: Write the question and all options.
Step 2: INDEPENDENTLY determine which option is factually correct by reasoning through the networking concept. Do NOT just pick a letter — think through WHY.
Step 3: Set the "answer" field to the letter of the option you verified in Step 2.
Step 4: Write the explanation referencing that SAME letter and option text.
Step 5: CROSS-CHECK: Re-read the option text at your chosen answer letter. Does it match what your explanation says? If not, fix the answer field.

MANDATORY RULES:
- The "answer" field must ALWAYS match the letter whose option text is factually correct
- The "explanation" must explicitly reference why the correct option is right and why at least one wrong option is wrong
- If you notice ANY mismatch between answer letter, option text, and explanation — fix it before outputting
- Never output a question where the explanation and the answer field disagree

Respond ONLY with a raw JSON array - no markdown, no extra text:
[{"type":"mcq","question":"...","difficulty":"Foundational|Exam Level|Hard","topic":"...","objective":"X.Y","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A|B|C|D","explanation":"..."}]`;

  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 8000, messages: [{ role: 'user', content: prompt }] })
  });

  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b?.error?.message || 'API error ' + res.status);
  }
  const data = await res.json();
  const raw  = data.content?.[0]?.text || '';
  const m    = raw.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('Could not parse AI response. Try again.');
  try {
    const parsed = JSON.parse(m[0]);
    // Normalize: add type:'mcq' if missing
    parsed.forEach(q => { if (!q.type) q.type = 'mcq'; });
    cacheQuestions(qTopic, difficulty, n, parsed);
    return parsed;
  } catch(parseErr) {
    throw new Error('AI returned malformed data. Please try again.');
  }
}

// ══════════════════════════════════════════
// QUESTION TYPE HELPERS
// ══════════════════════════════════════════
function getQType(q) {
  return q.type || 'mcq';
}

// ══════════════════════════════════════════
// REGULAR QUIZ RENDER
// ══════════════════════════════════════════
function render() {
  const q     = questions[current];
  const total = questions.length;
  const pct   = Math.round((current / total) * 100);
  const qType = getQType(q);

  document.getElementById('live-score').textContent  = `${score} / ${answered}`;
  document.getElementById('live-streak').textContent = `\u{1F525} ${streak}`;
  document.getElementById('q-label').textContent     = `Question ${current + 1} of ${total}`;
  document.getElementById('q-pct').textContent       = pct + '%';
  document.getElementById('prog-fill').style.width   = pct + '%';
  document.getElementById('q-num').textContent       = `Q${current + 1}`;

  const badge = document.getElementById('diff-badge');
  const dc    = (q.difficulty || DEFAULT_DIFF).replace(/[^a-zA-Z]/g, '');
  badge.className   = `diff-badge diff-${dc}`;
  badge.textContent = q.difficulty || DEFAULT_DIFF;

  // PBQ badge
  const pbqBadge = document.getElementById('pbq-badge');
  if (pbqBadge) {
    if (qType === 'multi-select') { pbqBadge.textContent = 'Multi-Select'; pbqBadge.classList.remove('is-hidden'); }
    else if (qType === 'order') { pbqBadge.textContent = 'Ordering'; pbqBadge.classList.remove('is-hidden'); }
    else if (qType === 'cli-sim') { pbqBadge.textContent = 'CLI Sim'; pbqBadge.classList.remove('is-hidden'); }
    else if (qType === 'topology') { pbqBadge.textContent = 'Topology'; pbqBadge.classList.remove('is-hidden'); }
    else { pbqBadge.classList.add('is-hidden'); }
  }

  document.getElementById('q-text').textContent = q.question;

  // Flag button
  const flagBtn = document.getElementById('quiz-flag-btn');
  flagBtn.className = 'flag-btn' + (quizFlags[current] ? ' flagged' : '');
  flagBtn.textContent = quizFlags[current] ? 'Flagged' : 'Flag';
  flagBtn.setAttribute('aria-pressed', quizFlags[current] ? 'true' : 'false');

  const box = document.getElementById('options');
  box.innerHTML = '';

  if (qType === 'multi-select') {
    renderMultiSelect(q, box);
  } else if (qType === 'order') {
    renderOrder(q, box);
  } else if (qType === 'cli-sim') {
    renderCliSim(q, box);
  } else if (qType === 'topology') {
    renderTopology(q, box);
  } else {
    renderMCQ(q, box);
  }

  const expBox = document.getElementById('exp-box');
  expBox.className = 'explanation-box';
  expBox.classList.add('is-hidden');

  const btnNext = document.getElementById('btn-next');
  btnNext.className = 'btn-next';
  btnNext.textContent = current === total - 1 ? 'See Results' : 'Next \u2192';
  btnNext.onclick = current === total - 1 ? finish : advance;

  // Focus the question text for screen readers, first option for keyboard users
  setTimeout(() => {
    const firstOption = box.querySelector('.option, .ms-option, .order-item, button');
    if (firstOption) firstOption.focus();
  }, 150);
}

// ── MCQ Render (unified quiz + exam mode) ──
function renderMCQ(q, box, ans) {
  box.setAttribute('role', 'radiogroup');
  box.setAttribute('aria-label', 'Answer options');
  ['A','B','C','D'].forEach(l => {
    const btn = document.createElement('button');
    const isSelected = ans && ans.chosen === l;
    btn.className = 'option' + (isSelected ? ' exam-selected' : '');
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    btn.setAttribute('aria-label', `Option ${l}: ${q.options[l]}`);
    btn.innerHTML = `<span class="opt-letter">${l}</span><span class="opt-text">${escHtml(q.options[l])}</span>`;
    if (ans) {
      btn.onclick = () => { examAnswers[examCurrent].chosen = l; renderExam(); };
    } else {
      btn.onclick = () => pick(l, q);
    }
    box.appendChild(btn);
  });
}

// ── Multi-Select Render (unified quiz + exam mode) ──
function renderMultiSelect(q, box, ans) {
  const letters = Object.keys(q.options).sort();
  const reqCount = (q.answers || []).length || 2;
  if (!ans) msSelections = [];

  letters.forEach(l => {
    const btn = document.createElement('button');
    const isSelected = ans ? ans.msChosen.includes(l) : false;
    btn.className = 'option' + (isSelected ? ' ms-selected' : '');
    btn.dataset.letter = l;
    btn.setAttribute('role', 'checkbox');
    btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    btn.setAttribute('aria-label', `Option ${l}: ${q.options[l]}`);
    btn.innerHTML = `<span class="ms-checkbox">${isSelected ? '\u2713' : ''}</span><span class="opt-text">${escHtml(q.options[l])}</span>`;
    btn.onclick = () => {
      if (ans) {
        const idx = ans.msChosen.indexOf(l);
        if (idx >= 0) ans.msChosen.splice(idx, 1);
        else ans.msChosen.push(l);
        renderExam();
      } else {
        if (btn.closest('.options').querySelector('.option.correct, .option.wrong')) return;
        const idx = msSelections.indexOf(l);
        if (idx >= 0) {
          msSelections.splice(idx, 1);
          btn.classList.remove('ms-selected');
          btn.querySelector('.ms-checkbox').textContent = '';
          btn.setAttribute('aria-checked', 'false');
        } else {
          msSelections.push(l);
          btn.classList.add('ms-selected');
          btn.querySelector('.ms-checkbox').textContent = '\u2713';
          btn.setAttribute('aria-checked', 'true');
        }
        updateMsSubmitBtn(reqCount);
      }
    };
    box.appendChild(btn);
  });

  if (ans) {
    // Exam: selection hint only
    const hint = document.createElement('div');
    hint.className = 'ms-hint';
    hint.style.marginTop = '8px';
    hint.textContent = `Select ${reqCount} answers (${ans.msChosen.length} selected)`;
    box.appendChild(hint);
  } else {
    // Quiz: submit row
    const row = document.createElement('div');
    row.className = 'ms-submit-row';
    row.innerHTML = `<span class="ms-hint">Select ${reqCount} answers</span>`;
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-primary';
    submitBtn.id = 'ms-submit-btn';
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = true;
    submitBtn.classList.add('is-dimmed');
    submitBtn.onclick = () => submitMultiSelect(q);
    row.appendChild(submitBtn);
    box.appendChild(row);
  }
}

function updateMsSubmitBtn(reqCount) {
  const btn = document.getElementById('ms-submit-btn');
  if (!btn) return;
  const ready = msSelections.length === reqCount;
  btn.disabled = !ready;
  btn.classList.toggle('is-dimmed', !ready);
}

function submitMultiSelect(q) {
  const correctAnswers = (q.answers || []).sort();
  const chosen = [...msSelections].sort();
  const isRight = JSON.stringify(chosen) === JSON.stringify(correctAnswers);

  answered++;
  updateTypeStat('multi-select', isRight);
  if (isRight) { score++; streak++; if (streak > bestStreak) bestStreak = streak; }
  else { streak = 0; }

  log.push({ q, chosen: chosen.join(','), correct: correctAnswers.join(','), isRight, flagged: quizFlags[current] });

  // Track wrong answers
  if (!isRight) addToWrongBank(q, chosen.join(','));
  else if (wrongDrillMode) graduateFromBank(q.question);

  document.getElementById('live-score').textContent = `${score} / ${answered}`;
  const streakEl = document.getElementById('live-streak');
  streakEl.textContent = `\u{1F525} ${streak}`;

  // Highlight options
  const optBtns = document.querySelectorAll('#options .option');
  optBtns.forEach(btn => {
    const l = btn.dataset.letter;
    if (!l) return;
    btn.setAttribute('disabled', true);
    btn.onclick = null;
    if (correctAnswers.includes(l) && chosen.includes(l)) btn.classList.add('correct');
    else if (chosen.includes(l) && !correctAnswers.includes(l)) btn.classList.add('wrong');
    else if (correctAnswers.includes(l)) btn.classList.add('reveal-correct');
    else btn.classList.add('dimmed');
  });

  // Hide submit row
  const submitBtn = document.getElementById('ms-submit-btn');
  if (submitBtn) submitBtn.classList.add('is-hidden');

  showExplanation(q, isRight);
}

// ── Order Render (unified quiz + exam mode) ──
function renderOrder(q, box, ans) {
  const items = q.items || [];
  if (!ans) orderSequence = [];
  const currentSeq = () => ans ? ans.orderSeq : orderSequence;

  // Items to pick from
  const itemsDiv = document.createElement('div');
  itemsDiv.className = 'order-items';
  itemsDiv.id = 'order-items';

  items.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = 'order-item' + (currentSeq().includes(idx) ? ' placed' : '');
    btn.dataset.idx = idx;
    btn.setAttribute('aria-label', `Item ${idx + 1}: ${item}`);
    btn.innerHTML = `<span class="order-num">${idx + 1}</span><span class="order-item-text">${escHtml(item)}</span>`;
    btn.onclick = () => {
      if (ans) {
        if (!ans.orderSeq.includes(idx)) { ans.orderSeq.push(idx); renderExam(); }
      } else {
        addToOrderSequence(idx, items, q);
      }
    };
    itemsDiv.appendChild(btn);
  });
  box.appendChild(itemsDiv);

  // Sequence display
  const seqDiv = document.createElement('div');
  seqDiv.className = 'order-sequence';
  if (ans) {
    let seqHtml = '<h4>Your Order:</h4><div class="order-placed-list">';
    if (ans.orderSeq.length === 0) {
      seqHtml += '<span style="color:var(--text-dim);font-size:13px">Click items above in order</span>';
    } else {
      seqHtml += ans.orderSeq.map((idx, pos) =>
        `<div class="order-placed-item"><span class="order-placed-num">${pos + 1}</span>${escHtml(items[idx])}</div>`
      ).join('');
    }
    seqHtml += '</div>';
    seqDiv.innerHTML = seqHtml;
  } else {
    seqDiv.innerHTML = '<h4>Your Order:</h4><div class="order-placed-list" id="order-placed-list"><span style="color:var(--text-dim);font-size:13px">Click items above in the correct order</span></div>';
  }
  box.appendChild(seqDiv);

  // Controls
  if (ans) {
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-ghost';
    resetBtn.style.cssText = 'font-size:13px;margin-top:8px';
    resetBtn.textContent = 'Reset Order';
    resetBtn.onclick = () => { ans.orderSeq = []; renderExam(); };
    box.appendChild(resetBtn);
  } else {
    const controls = document.createElement('div');
    controls.className = 'order-controls';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-ghost';
    resetBtn.style.fontSize = '13px';
    resetBtn.textContent = 'Reset';
    resetBtn.onclick = () => { orderSequence = []; renderOrderState(items, q); };
    controls.appendChild(resetBtn);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-primary';
    submitBtn.id = 'order-submit-btn';
    submitBtn.textContent = 'Submit Order';
    submitBtn.disabled = true;
    submitBtn.classList.add('is-dimmed');
    submitBtn.onclick = () => submitOrder(q);
    controls.appendChild(submitBtn);
    box.appendChild(controls);
  }
}

function addToOrderSequence(idx, items, q) {
  if (orderSequence.includes(idx)) return;
  orderSequence.push(idx);
  renderOrderState(items, q);
}

function renderOrderState(items, q) {
  // Update item buttons
  const itemBtns = document.querySelectorAll('#order-items .order-item');
  itemBtns.forEach(btn => {
    const idx = parseInt(btn.dataset.idx);
    btn.classList.toggle('placed', orderSequence.includes(idx));
  });

  // Update placed list
  const list = document.getElementById('order-placed-list');
  if (orderSequence.length === 0) {
    list.innerHTML = '<span style="color:var(--text-dim);font-size:13px">Click items above in the correct order</span>';
  } else {
    list.innerHTML = orderSequence.map((idx, pos) =>
      `<div class="order-placed-item"><span class="order-placed-num">${pos + 1}</span>${escHtml(items[idx])}</div>`
    ).join('');
  }

  // Update submit button
  const btn = document.getElementById('order-submit-btn');
  if (btn) {
    const ready = orderSequence.length === items.length;
    btn.disabled = !ready;
    btn.classList.toggle('is-dimmed', !ready);
  }
}

function submitOrder(q) {
  const correctOrder = q.correctOrder || [];
  const isRight = JSON.stringify(orderSequence) === JSON.stringify(correctOrder);

  answered++;
  updateTypeStat('order', isRight);
  if (isRight) { score++; streak++; if (streak > bestStreak) bestStreak = streak; }
  else { streak = 0; }

  log.push({ q, chosen: orderSequence.join(','), correct: correctOrder.join(','), isRight, flagged: quizFlags[current] });

  if (!isRight) addToWrongBank(q, orderSequence.join(','));
  else if (wrongDrillMode) graduateFromBank(q.question);

  document.getElementById('live-score').textContent = `${score} / ${answered}`;
  const streakEl = document.getElementById('live-streak');
  streakEl.textContent = `\u{1F525} ${streak}`;

  // Disable items
  document.querySelectorAll('#order-items .order-item').forEach(btn => { btn.onclick = null; btn.style.pointerEvents = 'none'; });
  document.getElementById('order-submit-btn').classList.add('is-hidden');
  document.querySelector('.order-controls .btn-ghost').classList.add('is-hidden');

  // Show correct vs wrong in placed list
  const items = q.items || [];
  const list = document.getElementById('order-placed-list');
  if (isRight) {
    // All correct — show green ticks
    list.innerHTML = orderSequence.map((idx, pos) => {
      return `<div class="order-placed-item order-correct"><span class="order-placed-num">${pos + 1}</span>${escHtml(items[idx])} \u2713</div>`;
    }).join('');
  } else {
    // Wrong — show user's order with X marks, then animate to correct order
    list.innerHTML = orderSequence.map((idx, pos) => {
      const isCorrectPos = correctOrder[pos] === idx;
      return `<div class="order-placed-item ${isCorrectPos ? 'order-correct' : 'order-wrong'}"><span class="order-placed-num">${pos + 1}</span>${escHtml(items[idx])} ${isCorrectPos ? '\u2713' : '\u2717'}</div>`;
    }).join('');
    // After a brief pause, reorder to show the CORRECT sequence
    setTimeout(() => {
      list.innerHTML = '<div class="order-correct-label">\u2705 Correct order:</div>' +
        correctOrder.map((idx, pos) => {
          const wasCorrect = orderSequence[pos] === idx;
          return `<div class="order-placed-item order-reveal${wasCorrect ? '' : ' order-highlight'}"><span class="order-placed-num">${pos + 1}</span>${escHtml(items[idx])}</div>`;
        }).join('');
    }, 1500);
  }

  showExplanation(q, isRight);
}

// ══════════════════════════════════════════
// ANSWER SELECTION (MCQ)
// ══════════════════════════════════════════
function pick(chosen, q) {
  if (document.querySelector('#options .option.correct, #options .option.wrong')) return;
  const isRight = chosen === q.answer;
  answered++;
  updateTypeStat(q.type || 'mcq', isRight);

  if (isRight) { score++; streak++; if (streak > bestStreak) bestStreak = streak; }
  else { streak = 0; }

  log.push({ q, chosen, correct: q.answer, isRight, flagged: quizFlags[current] });

  // Track wrong answers
  if (!isRight) addToWrongBank(q, chosen);
  else if (wrongDrillMode) graduateFromBank(q.question);

  document.getElementById('live-score').textContent = `${score} / ${answered}`;
  const streakEl = document.getElementById('live-streak');
  streakEl.textContent = `\u{1F525} ${streak}`;
  streakEl.classList.remove('streak-pop');
  void streakEl.offsetWidth;
  if (isRight && streak > 1) streakEl.classList.add('streak-pop');

  document.querySelectorAll('#options .option').forEach((btn, i) => {
    const l = ['A','B','C','D'][i];
    btn.setAttribute('disabled', true);
    if (l === q.answer && l === chosen)      btn.classList.add('correct');
    else if (l === chosen && !isRight)       btn.classList.add('wrong');
    else if (l === q.answer)                 btn.classList.add('reveal-correct');
    else                                     btn.classList.add('dimmed');
  });

  showExplanation(q, isRight);
}

function showExplanation(q, isRight) {
  const expBox = document.getElementById('exp-box');
  const qType = getQType(q);
  let label;
  if (qType === 'multi-select') {
    label = isRight ? 'Correct!' : `Wrong \u2014 correct answers: ${(q.answers || []).join(', ')}`;
  } else if (qType === 'order') {
    label = isRight ? 'Correct order!' : 'Wrong order \u2014 see correct positions above';
  } else {
    label = isRight ? 'Correct!' : `Wrong \u2014 correct answer: ${q.answer}`;
  }
  document.getElementById('exp-label').textContent = label;
  document.getElementById('exp-text').textContent  = q.explanation;

  // Resource link — opens in-app Topic Deep Dive
  const qTopic = q.topic || activeQuizTopic;
  const res = topicResources[qTopic];
  let extraHtml = '';
  if (res) {
    extraHtml += '<div class="resource-link"><button class="resource-dive-btn" onclick="showTopicDeepDive(\'' + escHtml(qTopic).replace(/'/g, "\\'") + '\')">📚 Study: ' + escHtml(res.title) + ' (Obj ' + res.obj + ')</button></div>';
  }

  // Explain Further button (Enhancement 5)
  extraHtml += '<button class="explain-btn" onclick="explainFurther()">\ud83d\udca1 Explain Further</button>';

  // Report button
  const reportCount = getReportCount(q.question);
  if (reportCount > 0) {
    extraHtml += '<button class="report-btn reported" disabled>\u2691 Reported (' + reportCount + ')</button>';
  } else {
    extraHtml += '<button class="report-btn" onclick="reportIssue()">\u2691 Report Issue</button>';
  }

  // Clean up previous extra HTML (resource links, buttons) before inserting new
  const expTextEl = document.getElementById('exp-text');
  while (expTextEl.nextSibling) expTextEl.parentNode.removeChild(expTextEl.nextSibling);
  const deepEl = document.getElementById('deep-explain');
  if (deepEl) deepEl.remove();
  expTextEl.insertAdjacentHTML('afterend', extraHtml);

  expBox.className   = 'explanation-box show ' + (isRight ? 'correct' : 'wrong');
  expBox.classList.remove('is-hidden');
  const nextBtn = document.getElementById('btn-next');
  nextBtn.classList.add('show');
  // Focus the Next button for keyboard users
  setTimeout(() => nextBtn.focus(), 100);
}

function advance() { current++; render(); window.scrollTo(0,0); }

function toggleFlag() {
  quizFlags[current] = !quizFlags[current];
  const flagBtn = document.getElementById('quiz-flag-btn');
  flagBtn.className = 'flag-btn' + (quizFlags[current] ? ' flagged' : '');
  flagBtn.textContent = quizFlags[current] ? 'Flagged' : 'Flag';
}

// ══════════════════════════════════════════
// REGULAR QUIZ RESULTS
// ══════════════════════════════════════════
// Build the per-difficulty score breakdown shown on the results page.
// Extracted from finish() (#18) so the parent function fits the long-function budget.
function renderResultsDifficultyBreakdown() {
  const byDiff = {};
  log.forEach(entry => {
    const d = (entry.q.difficulty || DEFAULT_DIFF).trim();
    if (!byDiff[d]) byDiff[d] = { right: 0, total: 0 };
    byDiff[d].total++;
    if (entry.isRight) byDiff[d].right++;
  });
  const diffOrder = ['Foundational', 'Exam Level', 'Hard / Tricky', 'Hard', 'Mixed'];
  const diffColors = { 'Foundational': 'var(--blue)', 'Exam Level': 'var(--yellow)', 'Hard / Tricky': 'var(--red)', 'Hard': 'var(--red)', 'Mixed': 'var(--accent-light)' };
  const diffEl = document.getElementById('diff-breakdown');
  const diffKeys = diffOrder.filter(d => byDiff[d]);
  diffEl.innerHTML = diffKeys.length > 1 ? diffKeys.map(d => {
    const { right, total: t } = byDiff[d];
    const col = diffColors[d] || 'var(--text)';
    const shortLabel = d.replace(' / Tricky', '').replace('Foundational', 'Basic');
    return `<div class="dstat"><div class="dv" style="color:${col}">${right}/${t}</div><div class="dl">${shortLabel}</div></div>`;
  }).join('') : '';
}

function finish() {
  const total = questions.length;
  const pct   = total > 0 ? Math.round((score / total) * 100) : 0;
  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
  const gradeColor = { A:'#22c55e', B:'#60a5fa', C:'#fbbf24', D:'#fb923c', F:'#f87171' }[grade];

  // Animated SVG progress ring
  const ringFill = document.getElementById('grade-fill');
  ringFill.style.stroke = gradeColor;
  ringFill.style.strokeDashoffset = '326.73'; // reset
  const targetOffset = 326.73 - (326.73 * pct / 100);
  requestAnimationFrame(() => { ringFill.style.strokeDashoffset = targetOffset; });

  document.getElementById('grade-letter').textContent = grade;
  document.getElementById('grade-letter').style.color = gradeColor;
  document.getElementById('grade-pct').textContent    = pct + '%';

  // Animated score count-up
  animateCount('r-correct', 0, score, 800);
  animateCount('r-wrong', 0, total - score, 800);
  animateCount('r-streak', 0, bestStreak, 600);

  const headlines = {
    A: ['Crushing it!',       "You're exam-ready on this topic."],
    B: ['Solid session',      'A few gaps \u2014 keep at it.'],
    C: ['Getting there',      'Review your weak spots and retry.'],
    D: ['Keep studying',      'Go back to the notes then come back.'],
    F: ['More work needed',   'Rewatch the Messer videos on this topic.']
  };
  document.getElementById('result-headline').textContent = headlines[grade][0];
  document.getElementById('result-sub').textContent      = headlines[grade][1];
  document.getElementById('r-correct').textContent = score;
  document.getElementById('r-wrong').textContent   = total - score;
  document.getElementById('r-streak').textContent  = bestStreak;
  document.getElementById('btn-review').classList.toggle('is-hidden', log.length === 0);

  renderResultsDifficultyBreakdown();

  updateStreak();
  renderStreakBadge();

  if (!wrongDrillMode) {
    const entryMode = dailyChallengeMode ? 'daily' : (sessionMode ? 'session' : 'quiz');
    saveToHistory({ date: new Date().toISOString(), topic: activeQuizTopic, difficulty: diff, score, total, pct, mode: entryMode });
  }

  // Daily challenge completion hook — count any finished daily-challenge run
  if (dailyChallengeMode) {
    completeDailyChallenge();
    dailyChallengeMode = false;
  }

  if (sessionMode) {
    sessionResults.push({ topic: activeQuizTopic, score, total, pct });
    sessionStep++;
    if (sessionStep >= sessionPlan.length) {
      sessionMode = false;
      renderSessionComplete();
    } else {
      renderSessionTransition();
    }
    return;
  }

  showPage('results');
}

// ══════════════════════════════════════════
// RETRY
// ══════════════════════════════════════════
async function retryQuiz() {
  if (wrongDrillMode) { startWrongDrill(); return; }

  const key = apiKey || document.getElementById('api-key').value.trim();
  if (!key) {
    showPage('setup');
    const err = document.getElementById('setup-err');
    err.textContent = '\u26a0\ufe0f Please enter your API key to retry.';
    err.classList.remove('is-hidden');
    return;
  }
  apiKey = key;

  activeQuizTopic = topic.includes('Smart') ? getSpacedRepTopic() : topic;

  document.getElementById('load-progress').classList.add('is-hidden');
  showPage('loading');
  document.getElementById('loading-msg').textContent = 'Generating ' + qCount + ' fresh ' + diff + ' questions on ' + activeQuizTopic + '\u2026';

  showCacheNotice(false);
  try {
    questions = await fetchQuestions(key, activeQuizTopic, diff, qCount);
    document.getElementById('loading-msg').textContent = 'Verifying question accuracy\u2026';
    questions = await aiValidateQuestions(key, questions);
    questions = validateQuestions(questions);
    if (questions.length === 0) throw new Error('All generated questions failed validation. Try again.');
  } catch(e) {
    const cached = getCachedQuestions(activeQuizTopic, diff, qCount);
    if (cached) {
      questions = cached;
      showCacheNotice(true);
    } else {
      showPage('setup');
      const err = document.getElementById('setup-err');
      err.textContent = '\u26a0\ufe0f ' + e.message;
      err.classList.remove('is-hidden');
      return;
    }
  }
  // Inject PBQs on retry too
  const retryPbqCount = qCount >= 10 ? 1 : 0;
  if (retryPbqCount > 0) {
    questions = injectPBQs(questions, activeQuizTopic, retryPbqCount);
  }
  current = 0; score = 0; streak = 0; bestStreak = 0; answered = 0; log = [];
  quizFlags = new Array(questions.length).fill(false);
  showPage('quiz');
  render();
}

// ══════════════════════════════════════════
// EXAM TIMER
// ══════════════════════════════════════════
function startExamTimer() {
  if (examTimer) clearInterval(examTimer);
  examEndTime = Date.now() + examTimeLeft * 1000;
  examTimer = setInterval(() => {
    examTimeLeft = Math.max(0, Math.round((examEndTime - Date.now()) / 1000));
    updateTimerDisplay();
    if (examTimeLeft <= 0) { clearInterval(examTimer); examTimer = null; submitExam(); }
  }, 1000);
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const el = document.getElementById('exam-timer');
  if (!el) return;
  const m = Math.floor(examTimeLeft / 60), s = examTimeLeft % 60;
  el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  el.className = 'exam-timer' + (examTimeLeft <= 300 ? ' danger' : examTimeLeft <= 600 ? ' warning' : '');
}

// ══════════════════════════════════════════
// EXAM RENDER (with PBQ support)
// ══════════════════════════════════════════
function renderExam() {
  const q     = examQuestions[examCurrent];
  const ans   = examAnswers[examCurrent];
  const total = examQuestions.length;
  const qType = getQType(q);

  document.getElementById('exam-q-num').textContent = `Q${examCurrent + 1} / ${total}`;
  document.getElementById('exam-q-label').textContent = `Q${examCurrent + 1}`;
  document.getElementById('exam-topic-lbl').textContent = q.topic || '';

  const answeredCount = examAnswers.filter(a => a.chosen !== null || a.msChosen.length > 0 || a.orderSeq.length > 0 || Object.keys(a.topoState || {}).length > 0).length;
  document.getElementById('exam-answered-lbl').textContent = `${answeredCount} / ${total} answered`;
  document.getElementById('exam-prog-fill').style.width = ((examCurrent / total) * 100) + '%';

  const flagBtn = document.getElementById('exam-flag-btn');
  flagBtn.className = 'exam-flag-btn' + (ans.flagged ? ' flagged' : '');
  flagBtn.textContent = ans.flagged ? '\u2691 Flagged' : '\u2691 Flag';
  flagBtn.setAttribute('aria-pressed', ans.flagged ? 'true' : 'false');

  document.getElementById('exam-q-text').textContent = q.question;

  const box = document.getElementById('exam-options');
  box.innerHTML = '';

  if (qType === 'multi-select') {
    renderMultiSelect(q, box, ans);
  } else if (qType === 'order') {
    renderOrder(q, box, ans);
  } else if (qType === 'cli-sim') {
    renderCliSim(q, box, ans);
  } else if (qType === 'topology') {
    renderTopology(q, box, ans);
  } else {
    renderMCQ(q, box, ans);
  }

  document.getElementById('exam-prev-btn').disabled = examCurrent === 0;
  const isLast = examCurrent === total - 1;
  const nextBtn = document.getElementById('exam-next-btn');
  nextBtn.textContent = isLast ? 'Submit Exam' : 'Next \u2192';
  nextBtn.onclick = isLast ? showExamModal : examNext;

  if (navOpen) renderNavGrid();
  updateTimerDisplay();
}

function examNext() { if (examCurrent < examQuestions.length - 1) { examCurrent++; renderExam(); window.scrollTo(0,0); } }
function examPrev() {
  // Hardcore mode locks question order — no going back (#48)
  if (examHardcore) return;
  if (examCurrent > 0) { examCurrent--; renderExam(); window.scrollTo(0,0); }
}

function examToggleFlag() {
  // Flagging is disabled in hardcore mode (#48)
  if (examHardcore) return;
  examAnswers[examCurrent].flagged = !examAnswers[examCurrent].flagged;
  renderExam();
}

// ══════════════════════════════════════════
// QUESTION NAVIGATOR
// ══════════════════════════════════════════
function toggleNav() {
  // Question navigator is disabled in hardcore mode (#48)
  if (examHardcore) return;
  navOpen = !navOpen;
  const grid = document.getElementById('qnav-grid');
  document.getElementById('qnav-arrow').textContent = navOpen ? '\u25b2' : '\u25bc';
  grid.classList.toggle('open', navOpen);
  const toggleBtn = document.getElementById('qnav-toggle');
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', navOpen ? 'true' : 'false');
  if (navOpen) renderNavGrid();
}

function renderNavGrid() {
  const grid = document.getElementById('qnav-grid');
  grid.innerHTML = '';
  grid.setAttribute('role', 'list');
  examAnswers.forEach((a, i) => {
    const sq = document.createElement('button');
    const hasAnswer = a.chosen !== null || a.msChosen.length > 0 || a.orderSeq.length > 0 || Object.keys(a.topoState || {}).length > 0;
    let cls = 'qnav-sq';
    let stateLbl = 'unanswered';
    if (i === examCurrent)    { cls += ' current';  stateLbl = 'current'; }
    else if (a.flagged)       { cls += ' flagged';  stateLbl = 'flagged'; }
    else if (hasAnswer)       { cls += ' answered'; stateLbl = 'answered'; }
    sq.className   = cls;
    sq.textContent = i + 1;
    sq.setAttribute('aria-label', `Question ${i + 1}, ${stateLbl}`);
    sq.setAttribute('aria-current', i === examCurrent ? 'true' : 'false');
    sq.onclick     = () => { examCurrent = i; renderExam(); window.scrollTo(0,0); };
    grid.appendChild(sq);
  });
}

// ══════════════════════════════════════════
// EXAM MODAL
// ══════════════════════════════════════════
function showExamModal() {
  const answeredCount = examAnswers.filter(a => a.chosen !== null || a.msChosen.length > 0 || a.orderSeq.length > 0 || Object.keys(a.topoState || {}).length > 0).length;
  const unanswered    = examAnswers.length - answeredCount;
  const flaggedCount  = examAnswers.filter(a => a.flagged).length;
  document.getElementById('modal-answered').textContent   = answeredCount;
  document.getElementById('modal-unanswered').textContent = unanswered;
  document.getElementById('modal-flagged').textContent    = flaggedCount;
  const flagBtn = document.getElementById('modal-flagged-btn');
  flagBtn.disabled = flaggedCount === 0;
  flagBtn.classList.toggle('is-dimmed', flaggedCount === 0);
  const modal = document.getElementById('exam-modal');
  modal.classList.remove('hidden');
  // Focus first button in modal for keyboard users
  setTimeout(() => {
    const firstBtn = modal.querySelector('button:not([disabled])');
    if (firstBtn) firstBtn.focus();
  }, 100);
  // Trap focus inside modal
  modal._trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const focusable = modal.querySelectorAll('button:not([disabled])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  modal.addEventListener('keydown', modal._trapHandler);
  // Close on Escape
  modal._escHandler = (e) => { if (e.key === 'Escape') hideExamModal(); };
  document.addEventListener('keydown', modal._escHandler);
}

function hideExamModal() {
  const modal = document.getElementById('exam-modal');
  modal.classList.add('hidden');
  if (modal._trapHandler) { modal.removeEventListener('keydown', modal._trapHandler); modal._trapHandler = null; }
  if (modal._escHandler) { document.removeEventListener('keydown', modal._escHandler); modal._escHandler = null; }
  // Return focus to the End Exam button
  const endBtn = document.querySelector('.end-exam-btn');
  if (endBtn) endBtn.focus();
}

function goToFirstFlagged() {
  hideExamModal();
  const idx = examAnswers.findIndex(a => a.flagged);
  if (idx >= 0) { examCurrent = idx; renderExam(); window.scrollTo(0,0); }
}

function abandonExam() {
  if (confirm('Abandon this exam and return to the menu? All progress will be lost.')) {
    clearInterval(examTimer); examTimer = null; examMode = false;
    hideExamModal();
    renderHistoryPanel(); renderWeakBanner();
    showPage('setup');
  }
}

// ══════════════════════════════════════════
// EXAM SUBMIT & RESULTS (with PBQ scoring)
// ══════════════════════════════════════════
function submitExam() {
  if (examTimer) { clearInterval(examTimer); examTimer = null; }
  hideExamModal();

  const total = examQuestions.length;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  examAnswers.forEach((a, i) => {
    const q = examQuestions[i];
    const qType = getQType(q);
    let qCorrect = false, qSkipped = false;

    if (qType === 'multi-select') {
      const correctAns = (q.answers || []).sort();
      const chosen = [...(a.msChosen || [])].sort();
      if (chosen.length === 0) { skipped++; qSkipped = true; }
      else if (JSON.stringify(chosen) === JSON.stringify(correctAns)) { correct++; qCorrect = true; }
      else wrong++;
    } else if (qType === 'order') {
      const correctOrd = q.correctOrder || [];
      if (a.orderSeq.length === 0) { skipped++; qSkipped = true; }
      else if (JSON.stringify(a.orderSeq) === JSON.stringify(correctOrd)) { correct++; qCorrect = true; }
      else wrong++;
    } else if (qType === 'topology') {
      const correctP = q.correctPlacements || {};
      const state = a.topoState || {};
      if (Object.keys(state).length === 0) { skipped++; qSkipped = true; }
      else {
        let allRight = true;
        Object.entries(correctP).forEach(([dev, zone]) => {
          const placed = Object.entries(state).find(([z, devs]) => devs.includes(dev));
          if (!placed || placed[0] !== zone) allRight = false;
        });
        if (allRight) { correct++; qCorrect = true; }
        else wrong++;
      }
    } else {
      // mcq and cli-sim both use chosen + answer
      if (a.chosen === null) { skipped++; qSkipped = true; }
      else if (a.chosen === q.answer) { correct++; qCorrect = true; }
      else wrong++;
    }
    // Type stats (skipped answers don't count toward accuracy denominator)
    if (!qSkipped) updateTypeStat(qType, qCorrect);
  });

  const pct = Math.round((correct / total) * 100);
  const scaledScore = Math.round(100 + (correct / total) * 800);
  const passed      = scaledScore >= 720;

  // Build log for review
  log = examQuestions.map((q, i) => {
    const a = examAnswers[i];
    const qType = getQType(q);
    let isRight, chosen, correctVal, isSkipped;

    if (qType === 'multi-select') {
      const correctAns = (q.answers || []).sort();
      chosen = (a.msChosen || []).sort().join(',');
      correctVal = correctAns.join(',');
      isSkipped = a.msChosen.length === 0;
      isRight = JSON.stringify((a.msChosen || []).sort()) === JSON.stringify(correctAns);
    } else if (qType === 'order') {
      chosen = (a.orderSeq || []).join(',');
      correctVal = (q.correctOrder || []).join(',');
      isSkipped = a.orderSeq.length === 0;
      isRight = JSON.stringify(a.orderSeq) === JSON.stringify(q.correctOrder || []);
    } else if (qType === 'topology') {
      chosen = JSON.stringify(a.topoState || {});
      correctVal = JSON.stringify(q.correctPlacements || {});
      isSkipped = Object.keys(a.topoState || {}).length === 0;
      isRight = !isSkipped;
      if (!isSkipped) {
        Object.entries(q.correctPlacements || {}).forEach(([dev, zone]) => {
          const placed = Object.entries(a.topoState || {}).find(([z, devs]) => devs.includes(dev));
          if (!placed || placed[0] !== zone) isRight = false;
        });
      }
    } else {
      // mcq and cli-sim
      chosen = a.chosen;
      correctVal = q.answer;
      isSkipped = a.chosen === null;
      isRight = a.chosen === q.answer;
    }

    // Track wrong for bank
    if (!isRight && !isSkipped) addToWrongBank(q, chosen);

    return { q, chosen, correct: correctVal, isRight, flagged: a.flagged, skipped: isSkipped };
  });

  updateStreak();
  saveToHistory({ date: new Date().toISOString(), topic: EXAM_TOPIC, difficulty: 'Mixed', score: correct, total, pct, mode: 'exam', hardcore: examHardcore });

  const scoreEl = document.getElementById('exam-scaled-score');
  scoreEl.style.color  = passed ? '#22c55e' : '#f87171';
  animateCount('exam-scaled-score', 0, scaledScore, 1200);

  const badge = document.getElementById('exam-pass-badge');
  badge.textContent = passed ? 'PASS' : 'FAIL';
  badge.className   = 'pass-badge ' + (passed ? 'badge-pass' : 'badge-fail');
  // Hardcore badge on results hero (#48)
  const hcBadge = document.getElementById('exam-hardcore-badge');
  if (hcBadge) hcBadge.classList.toggle('is-hidden', !examHardcore);

  document.getElementById('exam-result-msg').textContent = passed
    ? `Score ${scaledScore}/900 \u2014 above the 720 pass mark. Exam-ready!`
    : `Score ${scaledScore}/900 \u2014 need ${720 - scaledScore} more points. Keep drilling!`;

  animateCount('exam-r-correct', 0, correct, 800);
  animateCount('exam-r-wrong', 0, wrong, 800);
  animateCount('exam-r-skipped', 0, skipped, 600);
  document.getElementById('exam-r-pct').textContent     = pct + '%';

  showPage('exam-results');
  if (passed) setTimeout(() => launchConfetti(), 400);
}

// ══════════════════════════════════════════
// ANIMATED SCORE COUNTER
// ══════════════════════════════════════════
function animateCount(elId, from, to, duration) {
  const el = document.getElementById(elId);
  if (!el || from === to) { if (el) el.textContent = to; return; }
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
    el.textContent = Math.round(from + (to - from) * ease);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ══════════════════════════════════════════
// CONFETTI
// ══════════════════════════════════════════
function launchConfetti() {
  let canvas = document.getElementById('confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.remove('is-hidden');

  const PARTICLE_COUNT = 150;
  const COLORS = ['#22c55e','#7c6ff7','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316'];
  const particles = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * -1,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    });
  }

  let frame = 0;
  const MAX_FRAMES = 200;

  function animate() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = 0;
    particles.forEach(p => {
      if (p.opacity <= 0) return;
      alive++;

      p.x += p.vx;
      p.vy += 0.05;
      p.y += p.vy;
      p.rot += p.rotSpeed;

      if (frame > MAX_FRAMES * 0.6) {
        p.opacity -= 0.015;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    if (alive > 0 && frame < MAX_FRAMES) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.classList.add('is-hidden');
    }
  }

  requestAnimationFrame(animate);
}

// ══════════════════════════════════════════
// REVIEW
// ══════════════════════════════════════════
function showReview(fromExam) {
  document.getElementById('review-back-btn').onclick = () => showPage(fromExam ? 'exam-results' : 'results');

  const list = document.getElementById('review-list');
  list.innerHTML = '';

  log.forEach((entry, i) => {
    const { q, chosen, correct, isRight, flagged, skipped } = entry;
    const qType = getQType(q);
    const div = document.createElement('div');
    let cls = 'review-item ';
    if (skipped)      cls += 'skipped';
    else if (isRight) cls += 'correct';
    else              cls += 'missed';
    if (flagged) cls += ' flagged-item';
    div.className = cls;

    let optsHtml;
    if (qType === 'order') {
      const items = q.items || [];
      const correctOrd = q.correctOrder || [];
      optsHtml = '<div class="review-options">' +
        correctOrd.map((idx, pos) => `<div class="review-opt is-correct"><span class="r-letter">${pos+1})</span><span>${escHtml(items[idx])}</span></div>`).join('') +
        '</div>';
    } else if (qType === 'topology') {
      const cp = q.correctPlacements || {};
      optsHtml = '<div class="review-options">' +
        Object.entries(cp).map(([dev, zone]) => `<div class="review-opt is-correct"><span class="r-letter">\u2192</span><span>${escHtml(dev)} \u2192 ${escHtml(zone)}</span></div>`).join('') +
        '</div>';
    } else {
      const letters = Object.keys(q.options || {}).sort();
      const correctArr = qType === 'multi-select' ? (q.answers || []) : [q.answer];
      const chosenArr = typeof chosen === 'string' ? chosen.split(',') : [];
      optsHtml = '<div class="review-options">' + letters.map(l => {
        let optCls = '';
        if (correctArr.includes(l)) optCls = 'is-correct';
        else if (chosenArr.includes(l) && !isRight) optCls = 'was-chosen';
        return `<div class="review-opt ${optCls}"><span class="r-letter">${l})</span><span>${escHtml(q.options[l])}</span></div>`;
      }).join('') + '</div>';
    }

    const flagTag    = flagged ? '<span class="review-flag-tag">&#9873; Flagged</span><br>' : '';
    const skippedTag = skipped ? '<em style="color:var(--text-dim);font-size:13px">Skipped</em><br>' : '';
    const typeLabels = { 'multi-select': 'Multi-Select', 'order': 'Ordering', 'cli-sim': 'CLI Sim', 'topology': 'Topology' };
    const typeBadge = qType !== 'mcq' ? `<span class="pbq-badge" style="margin-bottom:8px;display:inline-block">${typeLabels[qType] || qType}</span><br>` : '';

    const reviewTopic = q.topic || activeQuizTopic;
    const reviewRes = topicResources[reviewTopic];
    const resLink = reviewRes ? `<div class="resource-link" style="margin-top:8px"><button class="resource-dive-btn" onclick="showTopicDeepDive('${escHtml(reviewTopic).replace(/'/g, "\\'")}')">📚 Study: ${escHtml(reviewRes.title)} (Obj ${reviewRes.obj})</button></div>` : '';

    div.innerHTML = `
      <div class="review-q">${i+1}. ${escHtml(q.question)}</div>
      ${typeBadge}${flagTag}${skippedTag}
      ${optsHtml}
      <div class="review-exp">${escHtml(q.explanation)}${resLink}</div>`;
    list.appendChild(div);
  });

  showPage('review');
}

// ══════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const key     = e.key.toUpperCase();
  const onQuiz  = document.getElementById('page-quiz').classList.contains('active');
  const onExam  = document.getElementById('page-exam').classList.contains('active');

  if (['A','B','C','D','E'].includes(key)) {
    if (onQuiz) {
      const q = questions[current];
      const qType = getQType(q);
      if (qType === 'mcq' && key !== 'E') pick(key, q);
      else if (qType === 'multi-select' && q.options && q.options[key]) {
        // Toggle multi-select option via keyboard
        const optBtn = document.querySelector(`#options .option[data-letter="${key}"]`);
        if (optBtn) optBtn.click();
      }
    } else if (onExam) {
      const q = examQuestions[examCurrent];
      const qType = getQType(q);
      if (qType === 'mcq' && key !== 'E') {
        examAnswers[examCurrent].chosen = key;
        renderExam();
      } else if (qType === 'multi-select' && q.options && q.options[key]) {
        const ms = examAnswers[examCurrent].msChosen || [];
        const idx = ms.indexOf(key);
        if (idx >= 0) ms.splice(idx, 1); else ms.push(key);
        examAnswers[examCurrent].msChosen = ms;
        renderExam();
      }
    }
    return;
  }

  if (e.key === 'Enter') {
    if (onQuiz) {
      const btn = document.getElementById('btn-next');
      if (btn.classList.contains('show')) btn.click();
    } else if (onExam) {
      document.getElementById('exam-next-btn').click();
    }
    return;
  }

  if (key === 'F') {
    if (onQuiz)  toggleFlag();
    if (onExam)  examToggleFlag();
    return;
  }

  if (e.key === 'ArrowRight' && onExam) { examNext(); return; }
  if (e.key === 'ArrowLeft'  && onExam) { examPrev(); return; }
});

// ══════════════════════════════════════════
// EXAM READINESS SCORE
// ══════════════════════════════════════════
// CompTIA N10-009 official domain weights
const DOMAIN_WEIGHTS = {
  concepts:        0.23, // Domain 1.0 — Networking Concepts
  implementation:  0.20, // Domain 2.0 — Network Implementation
  operations:      0.19, // Domain 3.0 — Network Operations
  security:        0.14, // Domain 4.0 — Network Security
  troubleshooting: 0.24  // Domain 5.0 — Network Troubleshooting
};
const DOMAIN_LABELS = {
  concepts:        'Networking Concepts',
  implementation:  'Network Implementation',
  operations:      'Network Operations',
  security:        'Network Security',
  troubleshooting: 'Network Troubleshooting'
};
// Largest-remainder allocation of n questions across the 5 CompTIA domains per official weights
function computeDomainDistribution(n) {
  const order = ['concepts','implementation','operations','security','troubleshooting'];
  const raw = order.map(k => ({ k, exact: n * DOMAIN_WEIGHTS[k] }));
  const floors = raw.map(r => ({ k: r.k, count: Math.floor(r.exact), rem: r.exact - Math.floor(r.exact) }));
  let assigned = floors.reduce((s, r) => s + r.count, 0);
  let leftover = n - assigned;
  // Distribute leftover to the largest remainders
  floors.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < leftover; i++) floors[i % floors.length].count++;
  const result = {};
  floors.forEach(r => { result[r.k] = r.count; });
  return result;
}
// Map each topic to its primary CompTIA domain
const TOPIC_DOMAINS = {
  // Domain 1.0 — Networking Concepts (23%)
  'Network Models & OSI':              'concepts',
  'TCP/IP Basics':                     'concepts',
  'Subnetting & IP Addressing':        'concepts',
  'TCP/IP Applications':               'concepts',
  'Network Naming (DNS & DHCP)':       'concepts',
  'IPv6':                              'concepts',
  'NAT & IP Services':                 'concepts',
  'NTP, ICMP & Traffic Types':         'concepts',
  'Port Numbers':                      'concepts',
  'Virtualisation & Cloud':            'concepts',
  'Cloud Networking & VPCs':           'concepts',
  'Network Appliances & Device Functions': 'concepts',
  'DNS Records & DNSSEC':              'concepts',
  // Domain 2.0 — Network Implementation (20%)
  'Routing Protocols':                 'implementation',
  'Switch Features & VLANs':           'implementation',
  'Wireless Networking':               'implementation',
  'Ethernet Basics':                   'implementation',
  'Ethernet Standards':                'implementation',
  'Cabling & Topology':                'implementation',
  'Integrating Networked Devices':     'implementation',
  'SDN, NFV & Automation':             'implementation',
  'Data Center Architectures':         'implementation',
  // Domain 3.0 — Network Operations (19%)
  'Network Operations':                'operations',
  'Data Centres':                      'operations',
  'WAN Connectivity':                  'operations',
  'SD-WAN & SASE':                     'operations',
  'SMB & Network File Services':       'operations',
  'Business Continuity & Disaster Recovery': 'operations',
  'Network Monitoring & Observability': 'operations',
  // Domain 4.0 — Network Security (14%)
  'Securing TCP/IP':                   'security',
  'Protecting Networks':               'security',
  'AAA & Authentication':              'security',
  'IPsec & VPN Protocols':             'security',
  'PKI & Certificate Management':      'security',
  'Firewalls, DMZ & Security Zones':   'security',
  'WPA3 & EAP Authentication':         'security',
  'Network Attacks & Threats':         'security',
  'Physical Security Controls':        'security',
  // Domain 5.0 — Network Troubleshooting (24%)
  'Network Troubleshooting & Tools':   'troubleshooting',
  'CompTIA Troubleshooting Methodology': 'troubleshooting'
};

function diffWeight(d) {
  if (!d) return 1.5;
  const s = d.toLowerCase();
  if (s.includes('hard'))  return 2.0;
  if (s.includes('exam'))  return 1.5;
  if (s.includes('found')) return 1.0;
  return 1.3;
}

// Build a per-topic weighted-accuracy map from history entries.
// Weights: difficulty × exam-mode boost (1.3 for exam mode) × recency boost
// (2.0 for sessions in the last 7 days). Extracted from getReadinessScore (#18).
function buildWeightedTopicMap(historyEntries, now) {
  const SEVEN_DAYS_MS = 7 * 86400000;
  const topicMap = {};
  historyEntries.forEach(e => {
    if (!topicMap[e.topic]) topicMap[e.topic] = { wCorrect: 0, wTotal: 0, lastDate: 0 };
    const sessionTime = new Date(e.date).getTime();
    const isRecent = (now - sessionTime) <= SEVEN_DAYS_MS;
    const examBoost = (e.mode === 'exam') ? 1.3 : 1.0;
    const recencyBoost = isRecent ? 2.0 : 1.0;
    const w = diffWeight(e.difficulty) * examBoost * recencyBoost;
    topicMap[e.topic].wCorrect += e.score * w;
    topicMap[e.topic].wTotal   += e.total * w;
    if (sessionTime > topicMap[e.topic].lastDate) topicMap[e.topic].lastDate = sessionTime;
  });
  return topicMap;
}

function getReadinessScore() {
  const allTopics = Array.from(document.querySelectorAll('#topic-group .chip'))
    .map(c => c.dataset.v)
    .filter(v => !v.includes('Mixed') && !v.includes('Smart'));
  const totalTopics = allTopics.length;

  const h = loadHistory().filter(e =>
    e.topic !== MIXED_TOPIC && e.topic !== EXAM_TOPIC && e.total >= 3
  );
  if (h.length === 0) return null;

  const now = Date.now();
  const topicMap = buildWeightedTopicMap(h, now);

  const studiedTopics = Object.keys(topicMap);
  const studiedCount  = studiedTopics.length;

  // Domain-weighted accuracy — each CompTIA domain contributes its official weight.
  // Unstudied domains contribute 0, which drags the score down and incentivizes coverage.
  const domainBuckets = {};
  Object.keys(DOMAIN_WEIGHTS).forEach(d => { domainBuckets[d] = { pctSum: 0, count: 0 }; });
  studiedTopics.forEach(t => {
    const domain = TOPIC_DOMAINS[t];
    if (!domain) return; // topics not in map (e.g. Mixed) are excluded
    const pct = (topicMap[t].wCorrect / topicMap[t].wTotal) * 100;
    domainBuckets[domain].pctSum += pct;
    domainBuckets[domain].count++;
  });
  const domainAccuracy = {};
  let accuracyScore = 0;
  Object.keys(DOMAIN_WEIGHTS).forEach(d => {
    const bucket = domainBuckets[d];
    const avg = bucket.count > 0 ? (bucket.pctSum / bucket.count) : 0;
    domainAccuracy[d] = avg;
    accuracyScore += avg * DOMAIN_WEIGHTS[d];
  });

  const coverageRaw = (studiedCount / totalTopics) * 100;
  const coverageScore = studiedCount < 5 ? coverageRaw * 0.5 : coverageRaw;

  const recencyScore = studiedTopics.reduce((sum, t) => {
    const daysSince = (now - topicMap[t].lastDate) / 86400000;
    return sum + Math.max(0, 1 - daysSince / 14) * 100;
  }, 0) / totalTopics;

  const totalQs    = h.reduce((sum, e) => sum + e.total, 0);
  const volumeScore = Math.min(totalQs / 500, 1) * 100;

  const raw = (accuracyScore * 0.40) + (coverageScore * 0.25) + (recencyScore * 0.20) + (volumeScore * 0.15);
  const predicted = Math.round(420 + (raw / 100) * 450);

  let worstTopic = null, worstPct = 101;
  allTopics.forEach(t => {
    if (!topicMap[t]) {
      if (worstTopic === null) { worstTopic = t; worstPct = -1; }
    } else {
      const pct = Math.round((topicMap[t].wCorrect / topicMap[t].wTotal) * 100);
      if (worstPct === -1) return;
      if (pct < worstPct) { worstPct = pct; worstTopic = t; }
    }
  });

  return {
    predicted, raw,
    accuracyScore, coverageScore, recencyScore, volumeScore,
    domainAccuracy,
    worstTopic,
    worstPct: worstPct === -1 ? null : worstPct,
    studiedCount,
    totalTopics,
    totalQs
  };
}

// ── Exam date storage + forecast ──
function getExamDate() {
  const raw = localStorage.getItem(STORAGE.EXAM_DATE);
  return raw || null;
}
function setExamDate(isoDate) {
  if (!isoDate) { localStorage.removeItem(STORAGE.EXAM_DATE); return; }
  localStorage.setItem(STORAGE.EXAM_DATE, isoDate);
}
function getDaysToExam() {
  const raw = getExamDate();
  if (!raw) return null;
  const examMs = new Date(raw).getTime();
  if (isNaN(examMs)) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.ceil((examMs - today) / 86400000);
}
function getReadinessForecast() {
  // Linear regression on raw score over the last N sessions to project when we
  // hit the pass threshold. Returns null if insufficient data or flat/negative trend.
  const h = loadHistory().filter(e =>
    e.topic !== MIXED_TOPIC && e.topic !== EXAM_TOPIC && e.total >= 3
  );
  if (h.length < 5) return null;
  // Use the last 14 sessions (history is newest-first, so take .slice(0, 14).reverse())
  const recent = h.slice(0, 14).reverse();
  // Compute cumulative raw-score trajectory: for each session endpoint, what was raw?
  // Approximation: use per-session pct as the proxy (avoids re-running full getReadinessScore per session)
  const points = recent.map((e, i) => ({ x: i, y: e.pct }));
  const n = points.length;
  const sumX  = points.reduce((a, p) => a + p.x, 0);
  const sumY  = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const currentProj = slope * (n - 1) + intercept;

  // Target: 75% avg pct → roughly correlates with a 720 pass score when coverage is decent
  const TARGET_PCT = 75;
  if (slope <= 0.1) {
    return { slope, currentProj, sessionsToTarget: null, trendFlat: true };
  }
  const sessionsNeeded = Math.max(0, Math.ceil((TARGET_PCT - currentProj) / slope));
  // Convert sessions to days using observed session cadence
  const firstDate = new Date(recent[0].date).getTime();
  const lastDate  = new Date(recent[recent.length - 1].date).getTime();
  const daySpan   = Math.max(1, (lastDate - firstDate) / 86400000);
  const sessionsPerDay = n / daySpan; // sessions per calendar day in the window
  const daysToTarget = sessionsPerDay > 0 ? Math.ceil(sessionsNeeded / sessionsPerDay) : null;
  return { slope, currentProj, sessionsToTarget: sessionsNeeded, daysToTarget, trendFlat: false };
}

// ── Per-question-type accuracy tracking (MCQ vs PBQ) ──
function getTypeStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE.TYPE_STATS) || '{}'); } catch { return {}; }
}
function updateTypeStat(type, wasCorrect) {
  if (!type) type = 'mcq';
  try {
    const stats = getTypeStats();
    if (!stats[type]) stats[type] = { seen: 0, correct: 0 };
    stats[type].seen++;
    if (wasCorrect) stats[type].correct++;
    localStorage.setItem(STORAGE.TYPE_STATS, JSON.stringify(stats));
  } catch {}
}

// ── Milestones tracking ──
function getMilestones() {
  try { return JSON.parse(localStorage.getItem(STORAGE.MILESTONES) || '{}'); } catch { return {}; }
}
function unlockMilestone(key) {
  const m = getMilestones();
  if (m[key]) return false;
  m[key] = new Date().toISOString();
  try { localStorage.setItem(STORAGE.MILESTONES, JSON.stringify(m)); } catch {}
  return true;
}

// Milestone definitions — keyed by id, evaluated against current state
const MILESTONE_DEFS = [
  { id: 'first_quiz',       label: 'First steps',         desc: 'Complete your first quiz',               icon: '🎯' },
  { id: 'hundred_qs',       label: 'Century',             desc: 'Answer 100 questions',                   icon: '💯' },
  { id: 'five_hundred_qs',  label: 'Grinder',             desc: 'Answer 500 questions',                   icon: '🔥' },
  { id: 'thousand_qs',      label: 'Iron will',           desc: 'Answer 1,000 questions',                 icon: '⚡' },
  { id: 'first_exam',       label: 'Exam rehearsal',      desc: 'Complete your first exam simulation',    icon: '📝' },
  { id: 'exam_pass',        label: 'Passing grade',       desc: 'Score 720+ on any exam simulation',      icon: '🎓' },
  { id: 'all_domains',      label: 'Full coverage',       desc: 'Study at least one topic in all 5 domains', icon: '🗺️' },
  { id: 'all_topics',       label: 'Completionist',       desc: 'Attempt every topic at least once',      icon: '🏆' },
  { id: 'streak_7',         label: 'Week warrior',        desc: '7-day study streak',                     icon: '🔥' },
  { id: 'streak_30',        label: 'Month master',        desc: '30-day study streak',                    icon: '🌟' },
  { id: 'ready_650',        label: 'Getting close',       desc: 'Reach a readiness score of 650',         icon: '📈' },
  { id: 'ready_720',        label: 'Exam ready',          desc: 'Reach a readiness score of 720 (pass)',  icon: '🚀' },
  { id: 'perfect_port',     label: 'Port master',         desc: 'Perfect round on Port Drill (40 correct)', icon: '🔌' },
  { id: 'streak_port_25',   label: 'Streak keeper',       desc: 'Reach a 25+ streak in Port Drill Endless mode', icon: '⛓️' },
  // ── v4.10 expansion ──
  { id: 'perfect_quiz',     label: 'Flawless',            desc: 'Score 100% on a 10+ question quiz',      icon: '💎' },
  { id: 'five_exams',       label: 'Exam veteran',        desc: 'Complete 5 exam simulations',            icon: '🎖️' },
  { id: 'ten_exams',        label: 'Exam marathon',       desc: 'Complete 10 exam simulations',           icon: '🏅' },
  { id: 'first_subnet',     label: 'Subnet initiate',     desc: 'Complete your first subnet drill',       icon: '🧮' },
  { id: 'subnet_50',        label: 'Subnet surgeon',      desc: 'Answer 50 subnet drill questions',       icon: '🧬' },
  { id: 'first_port_drill', label: 'Port pioneer',        desc: 'Complete your first Port Drill run',     icon: '🔭' },
  { id: 'all_ports_seen',   label: 'Port cartographer',   desc: 'See every port in the Port Drill bank',  icon: '🗺️' },
  { id: 'first_session',    label: 'Plan starter',        desc: "Complete your first Study Plan",         icon: '📚' },
  { id: 'night_owl',        label: 'Night owl',           desc: 'Study between midnight and 5am',         icon: '🦉' },
  { id: 'early_bird',       label: 'Early bird',          desc: 'Study before 7am',                       icon: '🐦' },
  { id: 'weekend_warrior',  label: 'Weekend warrior',     desc: 'Study on both Saturday and Sunday of the same week', icon: '🎽' },
  { id: 'diversity_5',      label: 'Renaissance',         desc: 'Study 5 different topics in a single day', icon: '🎨' },
  { id: 'deep_dive_10',     label: 'Deep diver',          desc: 'Use Explain Further 10 times',           icon: '🌊' },
  { id: 'daily_challenge_7',label: 'Daily disciple',      desc: '7-day Daily Challenge streak',           icon: '📅' },
  { id: 'daily_challenge_30',label:'Daily devotee',       desc: '30-day Daily Challenge streak',          icon: '🗓️' },
  // ── v4.13: Hardcore exam (#48) ──
  { id: 'hardcore_pass',    label: 'Hardcore pass',       desc: 'Score 720+ on a Hardcore exam simulation', icon: '🔥' },
  // ── v4.30.2: Lab milestones ──
  { id: 'first_lab',        label: 'Lab rat',             desc: 'Complete your first topology lab',         icon: '🧪' },
  { id: 'labs_5',            label: 'Lab regular',         desc: 'Complete 5 different labs',                icon: '🔬' },
  { id: 'labs_10',           label: 'Lab master',          desc: 'Complete 10 different labs',               icon: '🏗️' },
  { id: 'labs_all',          label: 'Lab completionist',   desc: 'Complete every available lab',             icon: '🧬' },
];

function evaluateMilestones() {
  const h = loadHistory();
  const totalQs = h.reduce((a, e) => a + e.total, 0);
  const studied = new Set(h.filter(e => e.topic !== MIXED_TOPIC && e.topic !== EXAM_TOPIC).map(e => e.topic));
  const exams = h.filter(e => e.mode === 'exam');
  const readiness = (typeof document !== 'undefined' && document.querySelector('#topic-group')) ? getReadinessScore() : null;
  const streak = getStreakData();
  const allDomainsHit = new Set(Array.from(studied).map(t => TOPIC_DOMAINS[t]).filter(Boolean));
  const allTopicCount = Object.keys(TOPIC_DOMAINS).length;
  const newlyUnlocked = [];
  function maybe(id, cond) { if (cond && unlockMilestone(id)) newlyUnlocked.push(id); }

  maybe('first_quiz',      h.length >= 1);
  maybe('hundred_qs',      totalQs >= 100);
  maybe('five_hundred_qs', totalQs >= 500);
  maybe('thousand_qs',     totalQs >= 1000);
  maybe('first_exam',      exams.length >= 1);
  maybe('exam_pass',       exams.some(e => {
    const scaled = Math.round(100 + (e.score / e.total) * 800);
    return scaled >= 720;
  }));
  // Hardcore pass milestone (#48)
  maybe('hardcore_pass',   exams.some(e => {
    if (!e.hardcore) return false;
    const scaled = Math.round(100 + (e.score / e.total) * 800);
    return scaled >= 720;
  }));
  maybe('all_domains',     allDomainsHit.size >= 5);
  maybe('all_topics',      studied.size >= allTopicCount);
  maybe('streak_7',        streak.currentStreak >= 7);
  maybe('streak_30',       streak.currentStreak >= 30);
  maybe('ready_650',       readiness && readiness.predicted >= 650);
  maybe('ready_720',       readiness && readiness.predicted >= 720);
  // perfect_port handled in endPortDrill

  // ── v4.10 expansion ──
  // perfect_quiz: any quiz ≥ 10 Qs with 100% score
  maybe('perfect_quiz',    h.some(e => e.total >= 10 && e.score === e.total));
  maybe('five_exams',      exams.length >= 5);
  maybe('ten_exams',       exams.length >= 10);
  // Subnet drill milestones
  const subStats = (typeof getSubnetStats === 'function') ? getSubnetStats() : { seen: 0 };
  maybe('first_subnet',    subStats.seen >= 1);
  maybe('subnet_50',       subStats.seen >= 50);
  // Port drill milestones
  const portBest = parseInt(localStorage.getItem(STORAGE.PORT_BEST) || '0');
  const portStreakBest = parseInt(localStorage.getItem(STORAGE.PORT_STREAK_BEST) || '0');
  maybe('first_port_drill', portBest > 0 || portStreakBest > 0);
  if (typeof getPortStatsSummary === 'function') {
    const ps = getPortStatsSummary();
    maybe('all_ports_seen', ps.uniqueSeen >= ps.totalPorts && ps.totalPorts > 0);
  }
  // Session mode
  maybe('first_session',   h.some(e => e.mode === 'session'));
  // Time-of-day milestones — check each history entry's timestamp
  maybe('night_owl',       h.some(e => {
    const hr = new Date(e.date).getHours();
    return hr >= 0 && hr < 5;
  }));
  maybe('early_bird',      h.some(e => new Date(e.date).getHours() < 7));
  // Weekend warrior: same ISO-week has entries on both Sat (6) and Sun (0)
  const weekMap = {};
  h.forEach(e => {
    const d = new Date(e.date);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) return;
    // ISO week key: year + week number
    const yr = d.getFullYear();
    const start = new Date(yr, 0, 1);
    const weekNum = Math.floor((d - start) / (7 * 86400000));
    const key = yr + '-' + weekNum;
    weekMap[key] = weekMap[key] || { sat: false, sun: false };
    if (dow === 6) weekMap[key].sat = true;
    if (dow === 0) weekMap[key].sun = true;
  });
  maybe('weekend_warrior', Object.values(weekMap).some(w => w.sat && w.sun));
  // Diversity: 5 different topics studied in a single day
  const dayTopics = {};
  h.forEach(e => {
    if (e.topic === MIXED_TOPIC || e.topic === EXAM_TOPIC) return;
    const day = new Date(e.date).toISOString().slice(0, 10);
    dayTopics[day] = dayTopics[day] || new Set();
    dayTopics[day].add(e.topic);
  });
  maybe('diversity_5',     Object.values(dayTopics).some(s => s.size >= 5));
  // Deep dive uses
  const ddUses = parseInt(localStorage.getItem(STORAGE.DEEP_DIVE_USES) || '0');
  maybe('deep_dive_10',    ddUses >= 10);
  // Daily challenge streaks
  const dc = getDailyChallenge();
  maybe('daily_challenge_7',  dc.bestStreak >= 7);
  maybe('daily_challenge_30', dc.bestStreak >= 30);

  // Lab completion milestones
  try {
    const labCompletions = JSON.parse(localStorage.getItem(STORAGE.LAB_COMPLETIONS) || '{}');
    const labsDone = Object.keys(labCompletions).length;
    const totalLabs = (typeof TB_LABS !== 'undefined') ? TB_LABS.length : 22;
    maybe('first_lab', labsDone >= 1);
    maybe('labs_5',    labsDone >= 5);
    maybe('labs_10',   labsDone >= 10);
    maybe('labs_all',  labsDone >= totalLabs);
  } catch (_) {}

  return newlyUnlocked;
}

// ── Streak tracking (consecutive study days) ──
function getStreakData() {
  const h = loadHistory();
  if (h.length === 0) return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  // Collect unique study days (YYYY-MM-DD)
  const daySet = new Set(h.map(e => new Date(e.date).toISOString().slice(0, 10)));
  const days = Array.from(daySet).sort((a, b) => b.localeCompare(a)); // newest first

  // Current streak: count back from today (or yesterday, if today has no activity)
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yestKey  = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
  let currentStreak = 0;
  let cursor = daySet.has(todayKey) ? new Date(today) : (daySet.has(yestKey) ? new Date(today.getTime() - 86400000) : null);
  while (cursor) {
    const key = cursor.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      currentStreak++;
      cursor = new Date(cursor.getTime() - 86400000);
    } else {
      break;
    }
  }
  // Longest streak: scan all days for the longest consecutive run
  const sortedAsc = [...daySet].sort();
  let longestStreak = 0, run = 0, prev = null;
  sortedAsc.forEach(d => {
    if (prev === null) { run = 1; }
    else {
      const gap = (new Date(d).getTime() - new Date(prev).getTime()) / 86400000;
      run = (gap === 1) ? run + 1 : 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = d;
  });
  return { currentStreak, longestStreak, lastStudyDate: days[0] };
}

// ── Subtopic weak-spot mining from wrong bank (keyword frequency) ──
const SUBTOPIC_KEYWORDS = [
  // Routing
  'OSPF', 'BGP', 'EIGRP', 'RIP', 'LSA', 'route summarization', 'autonomous system',
  // Subnetting
  'subnet mask', 'CIDR', 'VLSM', 'supernet', 'broadcast address', 'usable hosts',
  // Switching
  'VLAN', 'trunk', 'spanning tree', 'STP', 'RSTP', 'port-channel', 'EtherChannel', 'native VLAN',
  // IPv6
  'EUI-64', 'SLAAC', 'link-local', 'anycast', 'IPv6 header',
  // Wireless
  'WPA3', 'WPA2', 'EAP', 'PSK', '802.11', 'roaming', 'channel bonding',
  // Security
  'IPsec', 'IKE', 'ESP', 'AH', 'tunnel mode', 'transport mode', 'RADIUS', 'TACACS', 'Kerberos',
  // DNS / DHCP
  'DHCP relay', 'scope', 'reservation', 'DNS record', 'PTR', 'MX', 'SRV', 'CNAME', 'DNSSEC',
  // Tools
  'ping', 'traceroute', 'nmap', 'netstat', 'Wireshark', 'tcpdump', 'SNMP', 'syslog',
  // NAT
  'PAT', 'static NAT', 'port forwarding', 'NAT overload', 'inside local',
  // PBQ-specific
  'topology', 'firewall zone', 'DMZ'
];
function mineSubtopicWeakSpots(limit = 8) {
  const bank = loadWrongBank();
  if (bank.length === 0) return [];
  const counts = {};
  bank.forEach(b => {
    const text = ((b.question || '') + ' ' + (b.explanation || '')).toLowerCase();
    SUBTOPIC_KEYWORDS.forEach(kw => {
      if (text.includes(kw.toLowerCase())) {
        counts[kw] = (counts[kw] || 0) + 1;
      }
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword, count]) => ({ keyword, count }));
}

// ══════════════════════════════════════════
// v4.10 FRONT PAGE FEATURES
// ══════════════════════════════════════════

// ── Daily Challenge ──
function getDailyChallenge() {
  try {
    const raw = localStorage.getItem(STORAGE.DAILY_CHALLENGE);
    if (!raw) return { lastCompletedDate: null, currentStreak: 0, bestStreak: 0, totalDone: 0 };
    const obj = JSON.parse(raw);
    return {
      lastCompletedDate: obj.lastCompletedDate || null,
      currentStreak: obj.currentStreak || 0,
      bestStreak: obj.bestStreak || 0,
      totalDone: obj.totalDone || 0,
    };
  } catch { return { lastCompletedDate: null, currentStreak: 0, bestStreak: 0, totalDone: 0 }; }
}
function saveDailyChallenge(data) {
  try { localStorage.setItem(STORAGE.DAILY_CHALLENGE, JSON.stringify(data)); } catch {}
}
function isDailyChallengeDoneToday() {
  const today = new Date().toISOString().slice(0, 10);
  return getDailyChallenge().lastCompletedDate === today;
}
function completeDailyChallenge() {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const dc = getDailyChallenge();
  if (dc.lastCompletedDate === today) return dc; // already counted
  dc.currentStreak = (dc.lastCompletedDate === yesterday) ? dc.currentStreak + 1 : 1;
  dc.bestStreak = Math.max(dc.bestStreak, dc.currentStreak);
  dc.lastCompletedDate = today;
  dc.totalDone = (dc.totalDone || 0) + 1;
  saveDailyChallenge(dc);
  return dc;
}
// Deterministic topic for the day: hash YYYY-MM-DD into the topic list
function getDailyChallengeTopic() {
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i++) hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
  const topics = Object.keys(TOPIC_DOMAINS);
  return topics[Math.abs(hash) % topics.length];
}
function renderDailyChallengeCard() {
  const card = document.getElementById('daily-challenge-card');
  if (!card) return;
  // Once today's challenge is done, hide the card entirely until tomorrow.
  if (isDailyChallengeDoneToday()) {
    card.classList.add('is-hidden');
    card.classList.remove('dc-done', 'dc-pending');
    return;
  }
  const dc = getDailyChallenge();
  const topicToday = getDailyChallengeTopic();
  const streakText = dc.currentStreak > 0
    ? `${dc.currentStreak}-day streak${dc.bestStreak > dc.currentStreak ? ' · Best ' + dc.bestStreak : ''}`
    : 'Start your streak today';
  card.innerHTML = `
    <div class="dc-icon">🎯</div>
    <div class="dc-body">
      <div class="dc-title">DAILY CHALLENGE</div>
      <div class="dc-sub">One question · Topic: <strong>${escHtml(topicToday)}</strong> · ${escHtml(streakText)}</div>
    </div>
    <button class="dc-btn" onclick="startDailyChallenge()">Play →</button>
  `;
  card.classList.add('dc-pending');
  card.classList.remove('dc-done');
  card.classList.remove('is-hidden');
}
async function startDailyChallenge() {
  const key = (document.getElementById('api-key').value || localStorage.getItem(STORAGE.KEY) || '').trim();
  const errBox = document.getElementById('setup-err');
  if (errBox) errBox.classList.add('is-hidden');
  const keyErr = validateApiKey(key);
  if (keyErr) {
    if (errBox) { errBox.textContent = keyErr; errBox.classList.remove('is-hidden'); }
    return;
  }
  // Configure the quiz: 1 question, Exam Level, date-seeded topic
  const dcTopic = getDailyChallengeTopic();
  topic = dcTopic;
  diff = DEFAULT_DIFF;
  qCount = 1;
  dailyChallengeMode = true;
  document.querySelectorAll('#topic-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === dcTopic));
  document.querySelectorAll('#diff-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === DEFAULT_DIFF));
  document.querySelectorAll('#count-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === '1' || c.dataset.v === '5'));
  syncChipAriaPressed('#topic-group');
  syncChipAriaPressed('#diff-group');
  syncChipAriaPressed('#count-group');
  startQuiz();
}

// ── Today's Focus chip row (weakest topics surfaced as one-tap) ──
function getTodaysFocusTopics(limit = 2) {
  // Combine wrong-bank counts + low-accuracy history topics, rank, return topN
  const bank = loadWrongBank();
  const hist = loadHistory().filter(e => e.topic !== MIXED_TOPIC && e.topic !== EXAM_TOPIC && e.total >= 3);
  const score = {};
  // +2 per banked wrong from this topic
  bank.forEach(w => {
    if (w.topic && w.topic !== MIXED_TOPIC && w.topic !== EXAM_TOPIC) {
      score[w.topic] = (score[w.topic] || 0) + 2;
    }
  });
  // + weight for low-accuracy topics from history
  const acc = {};
  hist.forEach(e => {
    if (!acc[e.topic]) acc[e.topic] = { c: 0, t: 0 };
    acc[e.topic].c += e.score;
    acc[e.topic].t += e.total;
  });
  Object.entries(acc).forEach(([t, s]) => {
    const pct = s.c / s.t;
    if (pct < 0.75) score[t] = (score[t] || 0) + Math.round((0.75 - pct) * 20);
  });
  return Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}
function renderTodaysFocus() {
  const row = document.getElementById('todays-focus');
  if (!row) return;
  const topics = getTodaysFocusTopics(2);
  if (topics.length === 0) { row.classList.add('is-hidden'); return; }
  row.innerHTML = `
    <span class="tf-label">🎯 Weak spots:</span>
    <div class="tf-chips">
      ${topics.map(t => `<button type="button" class="tf-chip" onclick="focusTopic('${t.replace(/'/g, "\\'")}')">${escHtml(t)} →</button>`).join('')}
    </div>
  `;
  row.classList.remove('is-hidden');
}
function focusTopic(t) {
  topic = t;
  diff = DEFAULT_DIFF;
  qCount = 10;
  document.querySelectorAll('#topic-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === t));
  document.querySelectorAll('#diff-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === DEFAULT_DIFF));
  document.querySelectorAll('#count-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === '10'));
  syncChipAriaPressed('#topic-group');
  syncChipAriaPressed('#diff-group');
  syncChipAriaPressed('#count-group');
  startQuiz();
}

// ── Streak Defender (amber warning if streak at risk) ──
function renderStreakDefender() {
  const card = document.getElementById('streak-defender');
  if (!card) return;
  const s = getStreak();
  const today = new Date().toISOString().slice(0, 10);
  // Active threat: current streak ≥ 3 AND no activity today yet
  if (s.current >= 3 && s.last !== today) {
    card.innerHTML = `
      <div class="sd-icon">🔥</div>
      <div class="sd-body">
        <div class="sd-title">Don't break your ${s.current}-day streak!</div>
        <div class="sd-sub">One question is all it takes to keep it alive.</div>
      </div>
      <button class="sd-btn" onclick="startStreakSave()">Save streak →</button>
    `;
    card.classList.remove('is-hidden');
  } else {
    card.classList.add('is-hidden');
  }
}
function startStreakSave() {
  // Configure a minimum quiz: 5 questions, mixed, exam level
  topic = MIXED_TOPIC;
  diff = DEFAULT_DIFF;
  qCount = 5;
  document.querySelectorAll('#topic-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === MIXED_TOPIC));
  document.querySelectorAll('#diff-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === DEFAULT_DIFF));
  document.querySelectorAll('#count-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === '5'));
  syncChipAriaPressed('#topic-group');
  syncChipAriaPressed('#diff-group');
  syncChipAriaPressed('#count-group');
  startQuiz();
}

// ── Quiz Presets (3 one-click starting configs) ──
function applyPreset(name) {
  // Bulk Mixed presets — large counts that exceed the single-call ceiling are
  // batched via startBulkQuiz so the AI never gets asked for >20 Qs at once.
  const bulkSizes = { bulk30: 30, bulk60: 60, bulk100: 100 };
  if (bulkSizes[name]) {
    topic = MIXED_TOPIC; diff = 'Exam Level'; qCount = bulkSizes[name];
    document.querySelectorAll('#topic-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === topic));
    document.querySelectorAll('#diff-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === diff));
    document.querySelectorAll('#count-group .chip').forEach(c => c.classList.remove('on'));
    syncChipAriaPressed('#topic-group');
    syncChipAriaPressed('#diff-group');
    syncChipAriaPressed('#count-group');
    startBulkQuiz(qCount);
    return;
  }
  if (name === 'warmup') {
    topic = MIXED_TOPIC; diff = 'Foundational'; qCount = 5;
  } else if (name === 'focused') {
    // Focused: use weakest topic if known, otherwise Smart spaced-rep
    const weakest = (getTodaysFocusTopics(1)[0]) || getSpacedRepTopic() || MIXED_TOPIC;
    topic = weakest; diff = 'Exam Level'; qCount = 10;
  } else if (name === 'grind') {
    topic = MIXED_TOPIC; diff = 'Exam Level'; qCount = 20;
  } else { return; }
  document.querySelectorAll('#topic-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === topic));
  document.querySelectorAll('#diff-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === diff));
  document.querySelectorAll('#count-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === String(qCount)));
  syncChipAriaPressed('#topic-group');
  syncChipAriaPressed('#diff-group');
  syncChipAriaPressed('#count-group');
  startQuiz();
}

// ══════════════════════════════════════════
// START BULK MIXED QUIZ (batched, for 30/60/100 presets)
// ══════════════════════════════════════════
// Batched mixed quiz for the large preset tiles. The single fetchQuestions
// call is unreliable above ~20 Qs, so we mirror the exam-mode batching: chunk
// the request into 18-Q calls, show a progress bar, and concatenate. The flow
// after assembly is identical to startQuiz() (validation pipeline + render).
async function startBulkQuiz(count) {
  const key = document.getElementById('api-key').value.trim();
  const errBox = document.getElementById('setup-err');
  errBox.classList.add('is-hidden');
  const keyErr = validateApiKey(key);
  if (keyErr) { errBox.textContent = keyErr; errBox.classList.remove('is-hidden'); return; }
  apiKey = key;
  localStorage.setItem(STORAGE.KEY, key);
  examMode = false;
  wrongDrillMode = false;

  activeQuizTopic = MIXED_TOPIC;
  topic = MIXED_TOPIC;
  diff = 'Exam Level';
  qCount = count;

  showPage('loading');
  document.getElementById('loading-msg').textContent = `Generating ${count} mixed Exam Level questions\u2026`;
  const tb = document.getElementById('topic-brief');
  if (tb) tb.classList.add('is-hidden');

  const prog = document.getElementById('load-progress');
  const fill = document.getElementById('load-bar-fill');
  const lbl  = document.getElementById('load-progress-label');
  if (fill) fill.style.width = '0%';
  if (prog) prog.classList.remove('is-hidden');

  const BATCH_SIZE = 18, MAX_RETRIES = 2;
  const batches = Math.ceil(count / BATCH_SIZE);
  let collected = [];
  try {
    for (let i = 0; i < batches; i++) {
      const remaining = count - collected.length;
      const thisBatch = Math.min(BATCH_SIZE, remaining);
      if (fill) fill.style.width = ((i / batches) * 100) + '%';
      if (lbl) lbl.textContent = `Batch ${i + 1} / ${batches}\u2026`;
      document.getElementById('loading-msg').textContent = `Generating questions (${collected.length + thisBatch} / ${count})\u2026`;
      let batch = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          batch = await fetchQuestions(key, MIXED_TOPIC, 'Exam Level', thisBatch);
          break;
        } catch(retryErr) {
          if (attempt === MAX_RETRIES) throw retryErr;
          if (lbl) lbl.textContent = `Batch ${i + 1} failed, retrying (${attempt + 1}/${MAX_RETRIES})\u2026`;
          await new Promise(r => setTimeout(r, 1500));
        }
      }
      collected = collected.concat(batch);
    }
    if (fill) fill.style.width = '100%';
    document.getElementById('loading-msg').textContent = 'Verifying question accuracy\u2026';
    collected = await aiValidateQuestions(key, collected);
    collected = validateQuestions(collected);
    if (collected.length === 0) throw new Error('All generated questions failed validation. Try again.');
  } catch(e) {
    showPage('setup');
    errBox.textContent = '\u26a0\ufe0f ' + (e.message || 'Failed. Check your API key.');
    errBox.classList.remove('is-hidden');
    return;
  }
  questions = injectPBQs(collected, MIXED_TOPIC, 2);
  current = 0; score = 0; streak = 0; bestStreak = 0; answered = 0; log = [];
  quizFlags = new Array(questions.length).fill(false);
  showPage('quiz');
  render();
}

function renderReadinessCard() {
  const data     = getReadinessScore();
  const numEl    = document.getElementById('readiness-num');
  const badgeEl  = document.getElementById('readiness-badge');
  const barEl    = document.getElementById('readiness-bar-fill');
  const actionEl = document.getElementById('readiness-action');
  if (!numEl) return;

  if (!data) {
    numEl.textContent    = '\u2014';
    numEl.style.color    = 'var(--text-dim)';
    badgeEl.textContent  = 'Not started';
    badgeEl.style.background = 'var(--surface3)';
    badgeEl.style.color  = 'var(--text-dim)';
    barEl.style.width    = '0%';
    actionEl.innerHTML   = 'Complete your first quiz to activate your readiness score.';
    return;
  }

  const { predicted, raw, worstTopic, worstPct } = data;

  let tierLabel, tierColor, tierBg;
  if (predicted >= 720) {
    tierLabel = '\ud83d\udfe2 Exam Ready'; tierColor = 'var(--green)'; tierBg = 'rgba(34,197,94,.15)';
  } else if (predicted >= 650) {
    tierLabel = '\ud83d\udfe0 Getting Close'; tierColor = 'var(--orange)'; tierBg = 'rgba(251,146,60,.15)';
  } else if (predicted >= 500) {
    tierLabel = '\ud83d\udfe1 Building'; tierColor = 'var(--yellow)'; tierBg = 'rgba(251,191,36,.15)';
  } else {
    tierLabel = '\ud83d\udd34 Not Ready'; tierColor = 'var(--red)'; tierBg = 'rgba(248,113,113,.15)';
  }

  const barPct = Math.max(0, Math.min(100, ((predicted - 420) / 450) * 100));

  numEl.textContent    = predicted;
  numEl.style.color    = tierColor;
  badgeEl.textContent  = tierLabel;
  badgeEl.style.background = tierBg;
  badgeEl.style.color  = tierColor;
  barEl.style.width    = barPct + '%';
  barEl.style.background = tierColor;

  if (worstTopic) {
    const gapText = worstPct === null
      ? '<strong>' + escHtml(worstTopic) + '</strong> \u2014 never studied'
      : '<strong>' + escHtml(worstTopic) + '</strong> \u2014 ' + worstPct + '% avg';
    actionEl.innerHTML = '\u25b2 Biggest gap: ' + gapText + '. Drill it to move the score.';
  } else {
    actionEl.innerHTML = '\u2728 All topics covered. Keep your scores up!';
  }

  // Exam date row
  const examInput     = document.getElementById('readiness-exam-input');
  const examDisplay   = document.getElementById('readiness-exam-display');
  const examCountdown = document.getElementById('readiness-exam-countdown');
  if (examInput && examDisplay && examCountdown) {
    const dateStr = getExamDate();
    examInput.value = dateStr || '';
    if (dateStr) {
      examDisplay.textContent = new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const days = getDaysToExam();
      if (days !== null) {
        if (days > 0) {
          const emoji = days <= 7 ? '\ud83d\udd25' : days <= 30 ? '\u26a1' : '\ud83d\udcc5';
          examCountdown.innerHTML = `${emoji} <strong>${days}</strong> day${days === 1 ? '' : 's'} to go`;
          examCountdown.style.color = days <= 7 ? 'var(--red)' : days <= 30 ? 'var(--yellow)' : 'var(--text-mid)';
        } else if (days === 0) {
          examCountdown.innerHTML = '\ud83c\udfaf <strong>Today!</strong>';
          examCountdown.style.color = 'var(--red)';
        } else {
          examCountdown.textContent = `Was ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
          examCountdown.style.color = 'var(--text-dim)';
        }
      }
    } else {
      examDisplay.textContent = 'Pick a date';
      examCountdown.textContent = '';
    }
  }
}

// ══════════════════════════════════════════
// TODAY'S SESSION
// ══════════════════════════════════════════
function buildSessionPlan(n) {
  const allTopics = _getAllStudyTopics();
  const h = loadHistory().filter(e => e.topic !== MIXED_TOPIC && e.topic !== EXAM_TOPIC);
  const now = Date.now();

  const scored = allTopics.map(t => {
    const { score, reason, color } = _scoreTopicNeed(t, h, now);
    return { topic: t, score, reason, color };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map(({ topic, reason, color }) => ({ topic, reason, color }));
}

// Study Plan is "addressed for the day" if the user completed a multi-topic
// session run today, OR they've already drilled each of today's plan topics
// individually today (covered via any non-wrong-drill history entry).
function isStudyPlanDoneToday() {
  const today = new Date().toISOString().slice(0, 10);
  const h = loadHistory();
  const todayEntries = h.filter(e => new Date(e.date).toISOString().slice(0, 10) === today);
  if (todayEntries.some(e => e.mode === 'session')) return true;
  const plan = buildSessionPlan(SESSION_TOPICS);
  if (!plan.length) return false;
  const studiedTopicsToday = new Set(todayEntries.map(e => e.topic));
  return plan.every(item => studiedTopicsToday.has(item.topic));
}

function renderSessionBanner() {
  const banner = document.getElementById('session-banner');
  const rows   = document.getElementById('session-topic-rows');
  if (!banner || !rows) return;
  // Hide the whole banner once the plan is addressed for today — back tomorrow.
  if (isStudyPlanDoneToday()) {
    banner.classList.add('is-hidden');
    return;
  }
  const plan = buildSessionPlan(SESSION_TOPICS);
  sessionPlan = plan;
  banner.classList.remove('is-hidden');
  rows.innerHTML = plan.map((item, i) => `
    <div class="session-topic-row">
      <div class="session-step-badge">${i + 1}</div>
      <div>
        <div class="session-t-name">${escHtml(item.topic)}</div>
        <div class="session-t-reason" style="color:${item.color}">${escHtml(item.reason)}</div>
      </div>
    </div>`).join('');
}

async function startSession() {
  const key = document.getElementById('api-key').value.trim();
  const errBox = document.getElementById('setup-err');
  errBox.classList.add('is-hidden');
  const keyErr = validateApiKey(key);
  if (keyErr) { errBox.textContent = keyErr; errBox.classList.remove('is-hidden'); return; }
  apiKey = key;
  localStorage.setItem(STORAGE.KEY, key);

  sessionMode    = true;
  sessionStep    = 0;
  sessionResults = [];
  sessionPlan    = buildSessionPlan(SESSION_TOPICS);
  examMode       = false;
  wrongDrillMode = false;

  runSessionStep();
}

async function runSessionStep() {
  const step  = sessionPlan[sessionStep];
  const sTopic = step.topic;
  activeQuizTopic = sTopic;
  topic = sTopic;

  document.getElementById('load-progress').classList.add('is-hidden');
  showPage('loading');
  document.getElementById('loading-msg').textContent =
    'Session ' + (sessionStep + 1) + '/' + SESSION_TOPICS + ' \u2014 ' + sTopic + '\u2026';

  showCacheNotice(false);
  try {
    questions = await fetchQuestions(apiKey, sTopic, 'Mixed', SESSION_QUESTIONS);
    document.getElementById('loading-msg').textContent = 'Verifying question accuracy\u2026';
    questions = await aiValidateQuestions(apiKey, questions);
    questions = validateQuestions(questions);
    if (questions.length === 0) throw new Error('All generated questions failed validation. Try again.');
  } catch(e) {
    const cached = getCachedQuestions(sTopic, 'Mixed', SESSION_QUESTIONS);
    if (cached) { questions = cached; showCacheNotice(true); }
    else {
      sessionMode = false;
      showPage('setup');
      const err = document.getElementById('setup-err');
      err.textContent = '\u26a0\ufe0f ' + (e.message || 'Failed. Check your API key.');
      err.classList.remove('is-hidden');
      return;
    }
  }
  current = 0; score = 0; streak = 0; bestStreak = 0; answered = 0; log = [];
  quizFlags = new Array(questions.length).fill(false);
  diff = 'Mixed';
  showPage('quiz');
  render();
}

function renderSessionTransition() {
  const prev   = sessionResults[sessionResults.length - 1];
  const next   = sessionPlan[sessionStep];
  const color  = prev.pct >= 80 ? 'var(--green)' : prev.pct >= 60 ? 'var(--yellow)' : 'var(--red)';
  const emoji  = prev.pct >= 80 ? '\u2705' : prev.pct >= 60 ? '\ud83d\udcaa' : '\ud83d\udcda';

  document.getElementById('st-emoji').textContent   = emoji;
  document.getElementById('st-heading').textContent = 'Topic ' + sessionStep + ' done!';
  document.getElementById('st-sub').textContent     = prev.pct + '% on ' + prev.topic;
  document.getElementById('st-topic-done').textContent = prev.topic;
  document.getElementById('st-pct').textContent    = prev.pct + '%';
  document.getElementById('st-pct').style.color    = color;

  const fill = document.getElementById('st-bar-fill');
  fill.style.width      = prev.pct + '%';
  fill.style.background = color;

  document.getElementById('st-next-topic').textContent  = next.topic;
  document.getElementById('st-next-reason').textContent = next.reason;
  showPage('session-transition');
}

function renderSessionComplete() {
  const total    = sessionResults.length;
  const overall  = Math.round(sessionResults.reduce((a, r) => a + r.pct, 0) / total);

  document.getElementById('sc-sub').textContent =
    'Overall ' + overall + '% across ' + total + ' topics';

  const scResults = document.getElementById('sc-results');
  scResults.innerHTML = sessionResults.map(r => {
    const c = r.pct >= 80 ? 'var(--green)' : r.pct >= 60 ? 'var(--yellow)' : 'var(--red)';
    return `<div class="session-result-row">
      <div>
        <div class="session-result-topic">${escHtml(r.topic)}</div>
        <div class="session-result-bar"><div class="session-result-fill" style="width:${r.pct}%;background:${c}"></div></div>
      </div>
      <div class="session-result-pct" style="color:${c}">${r.pct}%</div>
    </div>`;
  }).join('');

  showPage('session-complete');
}

function endSessionEarly() {
  sessionMode = false;
  sessionPlan = [];
  sessionStep = 0;
  sessionResults = [];
  goSetup();
}

// ══════════════════════════════════════════
// DATA EXPORT / IMPORT
// ══════════════════════════════════════════
function exportData() {
  const data = {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    history: loadHistory(),
    streak: getStreak(),
    wrongBank: loadWrongBank()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'networkplus-quiz-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.history || !Array.isArray(data.history)) {
        alert('Invalid backup file.');
        return;
      }
      if (!confirm(`Import ${data.history.length} history entries? This will MERGE with your existing data.`)) return;

      const existing = loadHistory();
      const existingKeys = new Set(existing.map(e => e.date + '|' + e.topic));
      const newEntries = data.history.filter(e => !existingKeys.has(e.date + '|' + e.topic));
      const merged = existing.concat(newEntries);
      merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      if (merged.length > HISTORY_CAP) merged.length = HISTORY_CAP;
      localStorage.setItem(STORAGE.HISTORY, JSON.stringify(merged));

      if (data.streak) {
        const current = getStreak();
        if ((data.streak.best || 0) > (current.best || 0)) {
          current.best = data.streak.best;
          localStorage.setItem(STORAGE.STREAK, JSON.stringify(current));
        }
      }

      if (data.wrongBank && Array.isArray(data.wrongBank)) {
        const existingBank = loadWrongBank();
        const existingQs = new Set(existingBank.map(b => b.question));
        const newBank = data.wrongBank.filter(b => !existingQs.has(b.question));
        saveWrongBank(existingBank.concat(newBank));
      }

      alert(`Imported ${newEntries.length} new entries.`);
      renderHistoryPanel();
      renderStatsCard();
      renderReadinessCard();
      renderStreakBadge();
      renderWrongBankBtn();
    } catch(err) {
      alert('Failed to parse backup file: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ══════════════════════════════════════════
// TOPIC RESOURCES (Professor Messer N10-009)
// ══════════════════════════════════════════
const topicResources = {
  'Network Models & OSI': { obj: '1.1', title: 'OSI Model Overview', search: 'professor+messer+N10-009+OSI+model' },
  'TCP/IP Basics': { obj: '1.1', title: 'TCP/IP Model', search: 'professor+messer+N10-009+TCP+IP+suite' },
  'Subnetting & IP Addressing': { obj: '1.4', title: 'IP Addressing & Subnetting', search: 'professor+messer+N10-009+subnetting' },
  'Routing Protocols': { obj: '1.4', title: 'Routing Protocols', search: 'professor+messer+N10-009+routing+protocols' },
  'TCP/IP Applications': { obj: '1.5', title: 'TCP/IP Applications', search: 'professor+messer+N10-009+TCP+IP+applications' },
  'Network Naming (DNS & DHCP)': { obj: '1.6', title: 'DNS & DHCP', search: 'professor+messer+N10-009+DNS+DHCP' },
  'Securing TCP/IP': { obj: '4.1', title: 'Securing TCP/IP', search: 'professor+messer+N10-009+securing+TCP+IP' },
  'Switch Features & VLANs': { obj: '2.1', title: 'Switches & VLANs', search: 'professor+messer+N10-009+switch+VLAN' },
  'IPv6': { obj: '1.4', title: 'IPv6 Addressing', search: 'professor+messer+N10-009+IPv6' },
  'WAN Connectivity': { obj: '1.2', title: 'WAN Technologies', search: 'professor+messer+N10-009+WAN+connectivity' },
  'Wireless Networking': { obj: '2.4', title: 'Wireless Standards', search: 'professor+messer+N10-009+wireless+networking' },
  'Virtualisation & Cloud': { obj: '1.8', title: 'Virtualisation & Cloud', search: 'professor+messer+N10-009+virtualization+cloud' },
  'Data Centres': { obj: '3.3', title: 'Data Centre Infrastructure', search: 'professor+messer+N10-009+data+center' },
  'Network Operations': { obj: '3.1', title: 'Network Operations', search: 'professor+messer+N10-009+network+operations' },
  'Protecting Networks': { obj: '4.1', title: 'Network Security', search: 'professor+messer+N10-009+protecting+networks' },
  'Cabling & Topology': { obj: '1.3', title: 'Cabling & Topology', search: 'professor+messer+N10-009+cabling+topology' },
  'Ethernet Basics': { obj: '1.3', title: 'Ethernet Fundamentals', search: 'professor+messer+N10-009+ethernet+basics' },
  'Ethernet Standards': { obj: '1.3', title: 'Ethernet Standards', search: 'professor+messer+N10-009+ethernet+standards' },
  'SD-WAN & SASE': { obj: '1.2', title: 'SD-WAN & SASE', search: 'professor+messer+N10-009+SD-WAN+SASE' },
  'Integrating Networked Devices': { obj: '2.1', title: 'Networked Devices & IoT', search: 'professor+messer+N10-009+IoT+networked+devices' },
  'Network Troubleshooting & Tools': { obj: '5.1', title: 'Troubleshooting Tools', search: 'professor+messer+N10-009+troubleshooting+tools' },
  'NAT & IP Services': { obj: '1.4', title: 'NAT & IP Services', search: 'professor+messer+N10-009+NAT' },
  'AAA & Authentication': { obj: '4.1', title: 'AAA & Authentication', search: 'professor+messer+N10-009+AAA+RADIUS+TACACS' },
  'NTP, ICMP & Traffic Types': { obj: '1.5', title: 'NTP, ICMP & Traffic', search: 'professor+messer+N10-009+NTP+ICMP' },
  'IPsec & VPN Protocols': { obj: '4.4', title: 'IPsec & VPN', search: 'professor+messer+N10-009+IPsec+VPN' },
  'SMB & Network File Services': { obj: '1.5', title: 'SMB & File Services', search: 'professor+messer+N10-009+SMB+NFS+file+services' },
  'Cloud Networking & VPCs': { obj: '1.8', title: 'Cloud Networking & VPCs', search: 'professor+messer+N10-009+cloud+networking+VPC' },
  'Port Numbers': { obj: '1.5', title: 'Port Numbers', search: 'professor+messer+N10-009+port+numbers' },
  'PKI & Certificate Management': { obj: '4.3', title: 'PKI & Certificates', search: 'professor+messer+N10-009+PKI+certificates' },
  'CompTIA Troubleshooting Methodology': { obj: '5.1', title: '7-Step Methodology', search: 'professor+messer+N10-009+troubleshooting+methodology' },
  'Firewalls, DMZ & Security Zones': { obj: '4.1', title: 'Firewalls & DMZ', search: 'professor+messer+N10-009+firewall+DMZ+security+zones' },
  'WPA3 & EAP Authentication': { obj: '4.3', title: 'WPA3 & EAP', search: 'professor+messer+N10-009+WPA3+EAP+authentication' },
  'SDN, NFV & Automation': { obj: '1.8', title: 'SDN & Automation', search: 'professor+messer+N10-009+SDN+NFV+automation' },
  'Network Attacks & Threats': { obj: '4.2', title: 'Network Attacks & Threats', search: 'professor+messer+N10-009+network+attacks' },
  'Business Continuity & Disaster Recovery': { obj: '3.3', title: 'BCDR & Failover', search: 'professor+messer+N10-009+disaster+recovery+HA' },
  'Network Monitoring & Observability': { obj: '3.2', title: 'Monitoring & SNMP', search: 'professor+messer+N10-009+SNMP+network+monitoring' },
  'Network Appliances & Device Functions': { obj: '1.2', title: 'Network Appliances', search: 'professor+messer+N10-009+network+appliances' },
  'Data Center Architectures': { obj: '1.8', title: 'DC Architectures', search: 'professor+messer+N10-009+three+tier+spine+leaf+data+center' },
  'Physical Security Controls': { obj: '4.5', title: 'Physical Security', search: 'professor+messer+N10-009+physical+security' },
  'DNS Records & DNSSEC': { obj: '1.6', title: 'DNS Records & DNSSEC', search: 'professor+messer+N10-009+DNS+records+DNSSEC' }
};

// ══════════════════════════════════════════
// CLI SIMULATOR SCENARIO BANK
// ══════════════════════════════════════════
const cliScenarios = [
  {
    type: 'cli-sim', difficulty: DEFAULT_DIFF, topic: 'Network Troubleshooting & Tools',
    scenario: 'A user reports they can reach internal servers but cannot browse any websites. You sit at their workstation to investigate.',
    hostname: 'WORKSTATION-PC',
    commands: {
      'ipconfig': 'Windows IP Configuration\n\nEthernet adapter Ethernet0:\n   Connection-specific DNS Suffix  . :\n   IPv4 Address. . . . . . . . . . . : 192.168.1.45\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.1.1',
      'ping 192.168.1.1': 'Pinging 192.168.1.1 with 32 bytes of data:\nReply from 192.168.1.1: bytes=32 time<1ms TTL=64\nReply from 192.168.1.1: bytes=32 time<1ms TTL=64\n\nPing statistics: Sent = 2, Received = 2, Lost = 0 (0% loss)',
      'ping 8.8.8.8': 'Pinging 8.8.8.8 with 32 bytes of data:\nReply from 8.8.8.8: bytes=32 time=15ms TTL=118\nReply from 8.8.8.8: bytes=32 time=14ms TTL=118\n\nPing statistics: Sent = 2, Received = 2, Lost = 0 (0% loss)',
      'nslookup www.google.com': 'DNS request timed out.\n    timeout was 2 seconds.\nServer:  UnKnown\nAddress:  192.168.1.10\n\nDNS request timed out.\n    timeout was 2 seconds.\n*** Request to UnKnown timed-out',
      'ping 192.168.1.10': 'Pinging 192.168.1.10 with 32 bytes of data:\nRequest timed out.\nRequest timed out.\n\nPing statistics: Sent = 2, Received = 0, Lost = 2 (100% loss)'
    },
    question: 'Based on the outputs, what is the most likely cause of the issue?',
    options: { A: 'The default gateway is misconfigured', B: 'The DNS server at 192.168.1.10 is down or unreachable', C: 'The workstation has an APIPA address', D: 'There is a duplex mismatch on the Ethernet adapter' },
    answer: 'B',
    explanation: 'The workstation has a valid IP (192.168.1.45), can ping the gateway and 8.8.8.8, proving Layer 3 connectivity works. However, nslookup fails and the DNS server at 192.168.1.10 is unreachable (100% loss). The DNS server being down explains why name resolution fails while IP connectivity works. A is wrong because gateway pings succeed.'
  },
  {
    type: 'cli-sim', difficulty: DEFAULT_DIFF, topic: 'Network Troubleshooting & Tools',
    scenario: 'A new employee\'s PC cannot connect to any network resources. They just plugged in their Ethernet cable. You open a command prompt.',
    hostname: 'NEW-PC',
    commands: {
      'ipconfig': 'Windows IP Configuration\n\nEthernet adapter Ethernet0:\n   Connection-specific DNS Suffix  . :\n   Autoconfiguration IPv4 Address. . : 169.254.82.117\n   Subnet Mask . . . . . . . . . . . : 255.255.0.0\n   Default Gateway . . . . . . . . . :',
      'ping 192.168.1.1': 'Pinging 192.168.1.1 with 32 bytes of data:\nDestination host unreachable.\nDestination host unreachable.\n\nPing statistics: Sent = 2, Received = 0, Lost = 2 (100% loss)',
      'ipconfig /renew': 'An error occurred while renewing interface Ethernet0:\nThe DHCP server could not be contacted.',
      'arp -a': 'No ARP Entries Found'
    },
    question: 'What does the 169.254.x.x address indicate?',
    options: { A: 'The PC has a static IP in the link-local range', B: 'DHCP assigned a temporary address from the APIPA range', C: 'The PC failed to obtain a DHCP lease and self-assigned an APIPA address', D: 'The DNS server assigned this address for local resolution' },
    answer: 'C',
    explanation: 'A 169.254.x.x address is an Automatic Private IP Addressing (APIPA) address. Windows self-assigns one when it cannot contact a DHCP server. The ipconfig /renew confirming DHCP could not be contacted proves this. B is wrong because DHCP servers do not assign APIPA addresses \u2014 the client self-assigns them.'
  },
  {
    type: 'cli-sim', difficulty: 'Hard', topic: 'Network Troubleshooting & Tools',
    scenario: 'Users report intermittent connectivity \u2014 pages sometimes load, sometimes timeout. You run commands from one affected workstation.',
    hostname: 'TECH-PC',
    commands: {
      'ipconfig': 'Windows IP Configuration\n\nEthernet adapter Ethernet0:\n   IPv4 Address. . . . . . . . . . . : 192.168.10.25\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.10.1',
      'arp -a': 'Interface: 192.168.10.25 --- 0xa\n  Internet Address      Physical Address      Type\n  192.168.10.1          aa-bb-cc-dd-ee-01     dynamic\n  192.168.10.25         00-1a-2b-3c-4d-5e     dynamic\n  192.168.10.99         00-1a-2b-3c-4d-5e     dynamic',
      'ping 192.168.10.99': 'Pinging 192.168.10.99 with 32 bytes of data:\nReply from 192.168.10.99: bytes=32 time<1ms TTL=128',
      'netstat -an': 'Active Connections\n  Proto  Local Address          Foreign Address        State\n  TCP    192.168.10.25:135      0.0.0.0:0              LISTENING\n  TCP    192.168.10.25:445      0.0.0.0:0              LISTENING\n  TCP    192.168.10.25:49152    192.168.10.1:80        ESTABLISHED'
    },
    question: 'The ARP table reveals a critical issue. What is the problem?',
    options: { A: 'The gateway MAC address is a broadcast address', B: 'There is an IP address conflict \u2014 192.168.10.25 and 192.168.10.99 share the same MAC', C: 'The subnet mask is incorrect for this network', D: 'Port 445 is open, indicating a security vulnerability' },
    answer: 'B',
    explanation: 'The ARP table shows 192.168.10.25 (this PC) and 192.168.10.99 share the identical MAC address 00-1a-2b-3c-4d-5e. This is a duplicate IP/MAC conflict causing intermittent connectivity as traffic gets misdirected. A is wrong because aa-bb-cc-dd-ee-01 is a valid unicast MAC, not a broadcast.'
  },
  {
    type: 'cli-sim', difficulty: DEFAULT_DIFF, topic: 'Network Troubleshooting & Tools',
    scenario: 'A remote office reports connections to the HQ file server (10.0.0.50) are extremely slow. Normal latency should be ~20ms.',
    hostname: 'REMOTE-PC',
    commands: {
      'ping 10.0.0.50': 'Pinging 10.0.0.50 with 32 bytes of data:\nReply from 10.0.0.50: bytes=32 time=185ms TTL=121\nReply from 10.0.0.50: bytes=32 time=192ms TTL=121\n\nAverage = 188ms',
      'tracert 10.0.0.50': 'Tracing route to 10.0.0.50:\n\n  1    <1ms   <1ms   <1ms   192.168.5.1\n  2    12ms   11ms   12ms   10.1.1.1\n  3    14ms   13ms   14ms   10.2.2.1\n  4    155ms  160ms  158ms  10.3.3.1\n  5    162ms  165ms  160ms  10.4.4.1\n  6    178ms  180ms  175ms  10.0.0.1\n  7    185ms  190ms  182ms  10.0.0.50\n\nTrace complete.',
      'ping 192.168.5.1': 'Reply from 192.168.5.1: bytes=32 time<1ms TTL=64\nPing statistics: Sent = 2, Received = 2, Lost = 0',
      'nslookup fileserver.corp.local': 'Server:  dc01.corp.local\nAddress:  192.168.5.10\n\nName:    fileserver.corp.local\nAddress:  10.0.0.50'
    },
    question: 'Based on the traceroute, where is the latency bottleneck?',
    options: { A: 'Between the PC and its default gateway (hop 1)', B: 'Between hop 2 (10.1.1.1) and hop 3 (10.2.2.1)', C: 'Between hop 3 (10.2.2.1) and hop 4 (10.3.3.1)', D: 'At the destination server (10.0.0.50)' },
    answer: 'C',
    explanation: 'The traceroute shows latency jumps from 14ms at hop 3 to 155ms at hop 4 \u2014 a 141ms spike between 10.2.2.1 and 10.3.3.1. All later hops maintain similar high latency because the bottleneck compounds downstream. The link between those routers is likely congested or routing sub-optimally. A is wrong because hop 1 shows <1ms.'
  },
  {
    type: 'cli-sim', difficulty: DEFAULT_DIFF, topic: 'Network Troubleshooting & Tools',
    scenario: 'An application team reports their web server on port 8080 is not reachable from the network. The server runs on 192.168.1.100. You investigate from the server itself.',
    hostname: 'WEB-SRV',
    commands: {
      'netstat -an | findstr 8080': '  TCP    127.0.0.1:8080         0.0.0.0:0              LISTENING',
      'ipconfig': 'Windows IP Configuration\n\nEthernet adapter Ethernet0:\n   IPv4 Address. . . . . . . . . . . : 192.168.1.100\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.1.1',
      'netsh advfirewall show currentprofile': 'Domain Profile Settings:\n----------------------------------------------------------------------\nState                                 ON\nFirewall Policy                       BlockInbound,AllowOutbound',
      'ping 192.168.1.1': 'Reply from 192.168.1.1: bytes=32 time<1ms TTL=64'
    },
    question: 'Why is the web server not reachable from the network?',
    options: { A: 'The Windows Firewall is blocking all inbound connections', B: 'The application is only listening on 127.0.0.1 (localhost), not on the network interface', C: 'The default gateway is incorrectly configured', D: 'The subnet mask is too restrictive for this network' },
    answer: 'B',
    explanation: 'Netstat shows the server listening on 127.0.0.1:8080 (loopback). This means it only accepts local connections. It should listen on 0.0.0.0:8080 or 192.168.1.100:8080 to accept remote connections. While the firewall also blocks inbound, the primary issue is the loopback binding \u2014 even with the firewall open, 127.0.0.1 would still block remote access.'
  },
  {
    type: 'cli-sim', difficulty: 'Hard', topic: 'Network Troubleshooting & Tools',
    scenario: 'After a switch replacement, VoIP phones are not receiving IP addresses. Data devices on the same switch work fine. You check from the switch console.',
    hostname: 'SW-FLOOR2',
    commands: {
      'show vlan brief': 'VLAN Name                             Status    Ports\n---- -------------------------------- --------- ----------\n1    default                          active    Fa0/1-24\n10   DATA                             active\n20   VOICE                            active\n99   MANAGEMENT                       active',
      'show interface fa0/5': 'FastEthernet0/5 is up, line protocol is up\n  Switchport mode: access\n  Access Mode VLAN: 1 (default)',
      'show running-config interface fa0/5': 'interface FastEthernet0/5\n description IP Phone + PC\n switchport mode access\n switchport access vlan 1\n spanning-tree portfast',
      'show ip dhcp snooping': 'Switch DHCP snooping is enabled\nVLAN 10: enabled\nVLAN 20: disabled'
    },
    question: 'Why are VoIP phones not getting IP addresses?',
    options: { A: 'DHCP snooping is not enabled on VLAN 20 (VOICE)', B: 'The port is in VLAN 1 with no voice VLAN configured', C: 'Spanning-tree portfast is causing phones to be blocked', D: 'The VOICE VLAN 20 has no ports assigned' },
    answer: 'B',
    explanation: 'The port config shows VLAN 1 (default) with no voice VLAN. After the switch replacement, ports were not reconfigured with "switchport voice vlan 20". Without the voice VLAN setting, phones cannot tag traffic on VLAN 20 to reach their DHCP server. D is misleading \u2014 VLAN 20 exists but ports lack the voice VLAN assignment.'
  }
];

// ══════════════════════════════════════════
// TOPOLOGY BUILDER SCENARIO BANK
// ══════════════════════════════════════════
const topoScenarios = [
  {
    type: 'topology', difficulty: DEFAULT_DIFF, topic: 'Firewalls, DMZ & Security Zones',
    scenario: 'Place each network component into the correct security zone for a secure web hosting architecture.',
    zones: ['Internet', 'DMZ', 'Internal LAN'],
    devices: ['Public Web Server', 'Database Server', 'Email Gateway', 'Domain Controller'],
    correctPlacements: { 'Public Web Server': 'DMZ', 'Database Server': 'Internal LAN', 'Email Gateway': 'DMZ', 'Domain Controller': 'Internal LAN' },
    question: 'Place each device into the correct security zone.',
    explanation: 'Public-facing servers (web server, email gateway) belong in the DMZ \u2014 a screened subnet between firewalls. This limits exposure if compromised. The database and domain controller hold sensitive data and must be in the Internal LAN, never directly exposed to the internet.'
  },
  {
    type: 'topology', difficulty: DEFAULT_DIFF, topic: 'Protecting Networks',
    scenario: 'A company is deploying network monitoring. Place each security tool in the correct zone.',
    zones: ['Internet Edge', 'Core Network', 'Server Farm'],
    devices: ['IDS Sensor', 'SIEM Collector', 'Honeypot', 'Syslog Server'],
    correctPlacements: { 'IDS Sensor': 'Internet Edge', 'SIEM Collector': 'Core Network', 'Honeypot': 'Internet Edge', 'Syslog Server': 'Server Farm' },
    question: 'Place each security tool in its optimal network zone.',
    explanation: 'The IDS sensor and honeypot belong at the Internet Edge to detect and attract threats before they reach internal networks. The SIEM collector goes in the Core Network to aggregate logs from all zones. The Syslog server belongs in the Server Farm for secure log storage alongside infrastructure servers.'
  },
  {
    type: 'topology', difficulty: DEFAULT_DIFF, topic: 'Wireless Networking',
    scenario: 'Deploy a secure enterprise wireless network. Place each component in the correct location.',
    zones: ['Reception Area', 'Server Room', 'Office Floor'],
    devices: ['Wireless Access Point', 'WLC (Controller)', 'RADIUS Server', 'Guest Captive Portal'],
    correctPlacements: { 'Wireless Access Point': 'Office Floor', 'WLC (Controller)': 'Server Room', 'RADIUS Server': 'Server Room', 'Guest Captive Portal': 'Reception Area' },
    question: 'Place each wireless component in the correct location.',
    explanation: 'APs go on the Office Floor for coverage. The WLC and RADIUS server belong in the Server Room as centralized infrastructure \u2014 WLC manages all APs, RADIUS handles 802.1X auth. The Guest Captive Portal goes in Reception for visitor internet access without corporate network access.'
  },
  {
    type: 'topology', difficulty: 'Hard', topic: 'Cloud Networking & VPCs',
    scenario: 'Design a hybrid cloud architecture. Place each component in the correct environment.',
    zones: ['On-Premises DC', 'Cloud Public Subnet', 'Cloud Private Subnet'],
    devices: ['VPN Gateway', 'Load Balancer', 'App Servers', 'Cloud Database'],
    correctPlacements: { 'VPN Gateway': 'On-Premises DC', 'Load Balancer': 'Cloud Public Subnet', 'App Servers': 'Cloud Private Subnet', 'Cloud Database': 'Cloud Private Subnet' },
    question: 'Place each component in the correct environment.',
    explanation: 'The VPN Gateway sits on-premises to tunnel securely to the cloud VPC. The Load Balancer needs the Public Subnet to accept internet traffic. App Servers and the Cloud Database belong in the Private Subnet \u2014 not directly internet-accessible, receiving traffic only through the load balancer.'
  },
  {
    type: 'topology', difficulty: DEFAULT_DIFF, topic: 'Cabling & Topology',
    scenario: 'A new office needs network infrastructure. Place each device at the correct layer of the three-tier architecture.',
    zones: ['Access Layer', 'Distribution Layer', 'Core Layer'],
    devices: ['End-user Switch (24-port)', 'Layer 3 Switch', 'Backbone Router', 'PoE Switch for IP Phones'],
    correctPlacements: { 'End-user Switch (24-port)': 'Access Layer', 'Layer 3 Switch': 'Distribution Layer', 'Backbone Router': 'Core Layer', 'PoE Switch for IP Phones': 'Access Layer' },
    question: 'Place each device at the correct network tier.',
    explanation: 'End-user and PoE switches connect directly to devices at the Access Layer. Layer 3 switches handle inter-VLAN routing and policies at the Distribution Layer. The backbone router at the Core Layer provides high-speed transport between distribution blocks and to the WAN.'
  }
];

// ══════════════════════════════════════════
// QUESTION QUALITY VALIDATOR
// ══════════════════════════════════════════
function validateQuestions(qs) {
  const reports = loadReports();
  return qs.filter(q => {
    const qType = getQType(q);
    if (!q.question || !q.explanation) return false;

    // v4.8 — N10-009 objective tagging: every question must cite a valid exam objective
    // Accept common shapes: "1.4", "Obj 1.4", "1.4 — Routing", etc. Extract first X.Y match.
    if (q.objective) {
      const m = String(q.objective).match(/([1-5]\.[1-8])/);
      if (!m) return false;
      q.objective = m[1]; // normalize
    } else {
      return false;
    }

    // Enhancement 2: Auto-exclude questions with 2+ reports
    const reportCount = reports.filter(r => r.question === q.question).length;
    if (reportCount >= 2) return false;

    if (qType === 'mcq') {
      if (!q.options || !q.answer) return false;
      if (!['A','B','C','D'].includes(q.answer)) return false;
      if (!q.options[q.answer]) return false;
      if (!q.options.A || !q.options.B || !q.options.C || !q.options.D) return false;

      // Enhancement 4: Explanation-answer agreement check
      const expLower = q.explanation.toLowerCase();
      const ansLetter = q.answer;
      // Check if explanation mentions a DIFFERENT letter as correct
      const wrongLetterClaim = ['A','B','C','D'].filter(l => l !== ansLetter).some(l => {
        const patterns = [
          l.toLowerCase() + ' is correct',
          l.toLowerCase() + ' is the correct',
          'correct answer is ' + l.toLowerCase(),
          'answer is ' + l.toLowerCase() + ')',
          'answer is ' + l.toLowerCase() + '.',
          'answer is ' + l.toLowerCase() + ',',
          'answer: ' + l.toLowerCase()
        ];
        return patterns.some(p => expLower.includes(p));
      });
      if (wrongLetterClaim) return false;

      // Check explanation references the correct answer's content
      const answerText = q.options[ansLetter].toLowerCase();
      const answerKeywords = answerText.split(/\s+/).filter(w => w.length > 4);
      const keywordHits = answerKeywords.filter(w => expLower.includes(w)).length;
      // If the answer has meaningful words but none appear in explanation, suspicious
      if (answerKeywords.length >= 3 && keywordHits === 0) return false;

    } else if (qType === 'multi-select') {
      if (!q.options || !q.answers || !Array.isArray(q.answers)) return false;
      if (q.answers.length < 2) return false;
      if (!q.answers.every(a => q.options[a])) return false;
    } else if (qType === 'order') {
      if (!q.items || !q.correctOrder || !Array.isArray(q.items)) return false;
      if (q.items.length < 3) return false;
      if (q.correctOrder.length !== q.items.length) return false;
    }
    if (q.explanation.length < 15) return false;
    return true;
  });
}

// ══════════════════════════════════════════
// REPORT ISSUE
// ══════════════════════════════════════════
function loadReports() {
  try { return JSON.parse(localStorage.getItem(STORAGE.REPORTS) || '[]'); } catch { return []; }
}

function saveReport(questionText, reason) {
  try {
    const reports = loadReports();
    reports.push({ question: questionText, reason, date: new Date().toISOString() });
    if (reports.length > REPORTS_CAP) reports.splice(0, reports.length - REPORTS_CAP);
    localStorage.setItem(STORAGE.REPORTS, JSON.stringify(reports));
  } catch { showToast('Storage full — report not saved', 'error'); }
}

function getReportCount(questionText) {
  return loadReports().filter(r => r.question === questionText).length;
}

function reportIssue() {
  const q = examMode ? examQuestions[examCurrent] : questions[current];
  if (!q) return;
  const reasons = ['Wrong answer marked as correct', 'Explanation contradicts answer', 'Ambiguous or unclear question', 'Duplicate question', 'Other issue'];
  const reason = prompt('What\u2019s wrong with this question?\n\n' + reasons.map((r, i) => (i+1) + '. ' + r).join('\n') + '\n\nEnter number or type your own:');
  if (!reason) return;
  const reasonText = /^[1-5]$/.test(reason.trim()) ? reasons[parseInt(reason.trim()) - 1] : reason.trim();
  saveReport(q.question, reasonText);
  const btn = document.querySelector('.report-btn');
  if (btn) { btn.textContent = '\u2691 Reported \u2713'; btn.classList.add('reported'); btn.disabled = true; }
}

// ══════════════════════════════════════════
// CLI SIMULATOR RENDER
// ══════════════════════════════════════════
function renderCliSim(q, box, ans) {
  const scenarioDiv = document.createElement('div');
  scenarioDiv.className = 'cli-scenario';
  scenarioDiv.textContent = q.scenario;
  box.appendChild(scenarioDiv);

  const terminal = document.createElement('div');
  terminal.className = 'cli-terminal';
  terminal.id = 'cli-terminal';
  terminal.setAttribute('role', 'log');
  terminal.setAttribute('aria-label', 'Terminal output');
  terminal.setAttribute('aria-live', 'polite');
  const hn = escHtml(q.hostname || 'PC');
  let termHtml = '';
  // Exam mode: replay previously-run commands
  if (ans && ans.cliRan && ans.cliRan.length > 0) {
    ans.cliRan.forEach(cmd => {
      const output = (q.commands || {})[cmd] || '';
      termHtml += '<div class="cli-line"><span class="cli-prompt-text">' + hn + '&gt; </span>' + escHtml(cmd) + '</div>';
      termHtml += '<pre class="cli-output">' + escHtml(output) + '</pre>';
    });
  }
  termHtml += '<div class="cli-prompt">' + hn + '&gt; <span class="cli-cursor">_</span></div>';
  terminal.innerHTML = termHtml;
  box.appendChild(terminal);

  const cmdRow = document.createElement('div');
  cmdRow.className = 'cli-cmd-row';
  cmdRow.innerHTML = '<span style="font-size:11px;color:var(--text-dim);margin-right:8px">Run:</span>';
  Object.keys(q.commands || {}).forEach(cmd => {
    const btn = document.createElement('button');
    const alreadyRan = ans && (ans.cliRan || []).includes(cmd);
    btn.className = 'cli-cmd-btn' + (alreadyRan ? ' used' : '');
    btn.textContent = cmd;
    btn.setAttribute('aria-label', `Run command: ${cmd}`);
    btn.onclick = () => {
      if (ans) {
        if (!ans.cliRan) ans.cliRan = [];
        if (!ans.cliRan.includes(cmd)) ans.cliRan.push(cmd);
        renderExam();
      } else {
        runCliCommand(cmd, q);
        btn.classList.add('used');
      }
    };
    cmdRow.appendChild(btn);
  });
  box.appendChild(cmdRow);

  if (ans) {
    // Exam: show diagnosis once any command has been run
    if (ans.cliRan && ans.cliRan.length > 0) {
      const diagDiv = document.createElement('div');
      diagDiv.className = 'cli-diagnosis';
      diagDiv.setAttribute('role', 'radiogroup');
      diagDiv.setAttribute('aria-label', 'Diagnosis options');
      diagDiv.innerHTML = '<div class="cli-diag-label">DIAGNOSIS</div>';
      ['A','B','C','D'].forEach(l => {
        const btn = document.createElement('button');
        const isSelected = ans.chosen === l;
        btn.className = 'option' + (isSelected ? ' exam-selected' : '');
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        btn.setAttribute('aria-label', `Option ${l}: ${q.options[l]}`);
        btn.innerHTML = '<span class="opt-letter">' + l + '</span><span class="opt-text">' + escHtml(q.options[l]) + '</span>';
        btn.onclick = () => { ans.chosen = l; renderExam(); };
        diagDiv.appendChild(btn);
      });
      box.appendChild(diagDiv);
    }
  } else {
    // Quiz: diagnosis revealed after first command runs
    const diagSection = document.createElement('div');
    diagSection.id = 'cli-diagnosis';
    diagSection.className = 'cli-diagnosis';
    diagSection.classList.add('is-hidden');
    diagSection.setAttribute('role', 'radiogroup');
    diagSection.setAttribute('aria-label', 'Diagnosis options');
    diagSection.innerHTML = '<div class="cli-diag-label">DIAGNOSIS</div>';
    ['A','B','C','D'].forEach(l => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('aria-label', `Option ${l}: ${q.options[l]}`);
      btn.innerHTML = '<span class="opt-letter">' + l + '</span><span class="opt-text">' + escHtml(q.options[l]) + '</span>';
      btn.onclick = () => pick(l, q);
      diagSection.appendChild(btn);
    });
    box.appendChild(diagSection);
  }
}

function runCliCommand(cmd, q) {
  const terminal = document.getElementById('cli-terminal');
  if (!terminal) return;
  const output = (q.commands || {})[cmd] || 'Command not recognized.';
  const hn = escHtml(q.hostname || 'PC');
  terminal.querySelectorAll('.cli-cursor').forEach(c => c.remove());

  const cmdLine = document.createElement('div');
  cmdLine.className = 'cli-line';
  cmdLine.innerHTML = '<span class="cli-prompt-text">' + hn + '&gt; </span>' + escHtml(cmd);
  terminal.appendChild(cmdLine);

  const outputEl = document.createElement('pre');
  outputEl.className = 'cli-output';
  outputEl.textContent = output;
  terminal.appendChild(outputEl);

  const newPrompt = document.createElement('div');
  newPrompt.className = 'cli-prompt';
  newPrompt.innerHTML = hn + '&gt; <span class="cli-cursor">_</span>';
  terminal.appendChild(newPrompt);
  terminal.scrollTop = terminal.scrollHeight;

  const diag = document.getElementById('cli-diagnosis');
  if (diag) diag.classList.remove('is-hidden');
}

// ══════════════════════════════════════════
// TOPOLOGY BUILDER RENDER
// ══════════════════════════════════════════
function renderTopology(q, box, ans) {
  // State container: exam uses ans.topoState, quiz uses global topoDevices
  if (!ans) {
    topoDevices = {};
    selectedTopoDevice = null;
  } else if (!ans.topoState) {
    ans.topoState = {};
  }
  const state = () => ans ? ans.topoState : topoDevices;
  const allPlaced = () => Object.values(state()).flat();

  const scenarioDiv = document.createElement('div');
  scenarioDiv.className = 'topo-scenario';
  scenarioDiv.textContent = q.scenario;
  box.appendChild(scenarioDiv);

  const palette = document.createElement('div');
  palette.className = 'topo-palette';
  palette.innerHTML = '<div class="topo-palette-label">DEVICES <span style="font-size:11px;font-weight:400;color:var(--text-dim)">(drag to a zone, or click to select then click a zone)</span></div>';
  (q.devices || []).forEach(dev => {
    const btn = document.createElement('button');
    const placedNow = ans ? allPlaced().includes(dev) : false;
    const selectedNow = selectedTopoDevice === dev;
    btn.className = 'topo-device' + (placedNow ? ' placed' : '') + (selectedNow ? ' selected' : '');
    btn.textContent = dev;
    btn.draggable = true;
    btn.setAttribute('aria-label', `Device: ${dev}${placedNow ? ' (placed)' : ''}`);
    btn.ondragstart = (e) => {
      e.dataTransfer.setData('text/plain', dev);
      e.dataTransfer.effectAllowed = 'move';
      btn.classList.add('dragging');
    };
    btn.ondragend = () => { btn.classList.remove('dragging'); };
    // Touch support for mobile
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      selectedTopoDevice = dev;
      if (ans) renderExam();
      else document.querySelectorAll('.topo-device').forEach(b => b.classList.toggle('selected', b.textContent === dev));
    }, { passive: false });
    btn.onclick = () => {
      selectedTopoDevice = dev;
      if (ans) renderExam();
      else document.querySelectorAll('.topo-device').forEach(b => b.classList.toggle('selected', b.textContent === dev));
    };
    palette.appendChild(btn);
  });
  box.appendChild(palette);

  const zonesDiv = document.createElement('div');
  zonesDiv.className = 'topo-zones';
  (q.zones || []).forEach(zone => {
    const zoneEl = document.createElement('div');
    zoneEl.className = 'topo-zone';
    zoneEl.dataset.zone = zone;
    zoneEl.setAttribute('role', 'region');
    zoneEl.setAttribute('aria-label', `Zone: ${zone}`);
    const zoneId = 'topo-zone-' + zone.replace(/[^a-zA-Z0-9]/g, '-');
    const placed = state()[zone] || [];
    const placedHtml = placed.length === 0
      ? '<span style="color:var(--text-dim);font-size:12px">Drag or click to place device here</span>'
      : placed.map(d => '<span class="topo-placed-device">' + escHtml(d) + '</span>').join('');
    zoneEl.innerHTML = '<div class="topo-zone-label">' + escHtml(zone) + '</div><div class="topo-zone-devices" id="' + zoneId + '">' + placedHtml + '</div>';

    // Drag-and-drop handlers
    zoneEl.ondragover = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; zoneEl.classList.add('topo-zone-dragover'); };
    zoneEl.ondragleave = () => { zoneEl.classList.remove('topo-zone-dragover'); };
    zoneEl.ondrop = (e) => {
      e.preventDefault();
      zoneEl.classList.remove('topo-zone-dragover');
      const dev = e.dataTransfer.getData('text/plain');
      if (!dev) return;
      const s = state();
      Object.keys(s).forEach(z => {
        s[z] = (s[z] || []).filter(d => d !== dev);
        if (s[z].length === 0) delete s[z];
      });
      if (!s[zone]) s[zone] = [];
      s[zone].push(dev);
      selectedTopoDevice = null;
      if (ans) renderExam();
      else renderTopoState(q);
    };

    const handleZonePlacement = () => {
      if (!selectedTopoDevice) return;
      const s = state();
      Object.keys(s).forEach(z => {
        s[z] = (s[z] || []).filter(d => d !== selectedTopoDevice);
        if (s[z].length === 0) delete s[z];
      });
      if (!s[zone]) s[zone] = [];
      s[zone].push(selectedTopoDevice);
      selectedTopoDevice = null;
      if (ans) renderExam();
      else renderTopoState(q);
    };
    zoneEl.onclick = handleZonePlacement;
    zoneEl.addEventListener('touchend', (e) => { e.preventDefault(); handleZonePlacement(); }, { passive: false });
    zonesDiv.appendChild(zoneEl);
  });
  box.appendChild(zonesDiv);

  if (ans) {
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-ghost';
    resetBtn.style.cssText = 'font-size:13px;margin-top:8px';
    resetBtn.textContent = 'Reset Placement';
    resetBtn.onclick = () => { ans.topoState = {}; selectedTopoDevice = null; renderExam(); };
    box.appendChild(resetBtn);
  } else {
    const controls = document.createElement('div');
    controls.className = 'topo-controls';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-ghost';
    resetBtn.style.fontSize = '13px';
    resetBtn.textContent = 'Reset';
    resetBtn.onclick = () => { topoDevices = {}; selectedTopoDevice = null; renderTopoState(q); };
    controls.appendChild(resetBtn);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-primary';
    submitBtn.id = 'topo-submit-btn';
    submitBtn.textContent = 'Submit Placement';
    submitBtn.disabled = true;
    submitBtn.classList.add('is-dimmed');
    submitBtn.onclick = () => submitTopology(q);
    controls.appendChild(submitBtn);
    box.appendChild(controls);
  }
}

function renderTopoState(q) {
  const devices = q.devices || [];
  const zones = q.zones || [];
  const allPlaced = Object.values(topoDevices).flat();

  zones.forEach(zone => {
    const zoneId = 'topo-zone-' + zone.replace(/[^a-zA-Z0-9]/g, '-');
    const el = document.getElementById(zoneId);
    if (!el) return;
    const placed = topoDevices[zone] || [];
    el.innerHTML = placed.length === 0
      ? '<span style="color:var(--text-dim);font-size:12px">Drag or click to place device here</span>'
      : placed.map(d => '<span class="topo-placed-device">' + escHtml(d) + '</span>').join('');
  });

  document.querySelectorAll('.topo-device').forEach(btn => {
    btn.classList.toggle('placed', allPlaced.includes(btn.textContent));
    btn.classList.remove('selected');
  });
  selectedTopoDevice = null;

  const submitBtn = document.getElementById('topo-submit-btn');
  if (submitBtn) {
    const ready = allPlaced.length === devices.length;
    submitBtn.disabled = !ready;
    submitBtn.classList.toggle('is-dimmed', !ready);
  }
}

function submitTopology(q) {
  const correct = q.correctPlacements || {};
  let allCorrect = true;
  const results = {};

  Object.entries(correct).forEach(([device, correctZone]) => {
    const placedEntry = Object.entries(topoDevices).find(([z, devs]) => devs.includes(device));
    const userZone = placedEntry ? placedEntry[0] : null;
    const isRight = userZone === correctZone;
    if (!isRight) allCorrect = false;
    results[device] = { userZone, correctZone, isRight };
  });

  answered++;
  updateTypeStat('topology', allCorrect);
  if (allCorrect) { score++; streak++; if (streak > bestStreak) bestStreak = streak; }
  else { streak = 0; }

  log.push({ q, chosen: JSON.stringify(topoDevices), correct: JSON.stringify(correct), isRight: allCorrect, flagged: quizFlags[current] });

  if (!allCorrect) addToWrongBank(q, JSON.stringify(topoDevices));
  else if (wrongDrillMode) graduateFromBank(q.question);

  document.getElementById('live-score').textContent = score + ' / ' + answered;
  document.getElementById('live-streak').textContent = '\ud83d\udd25 ' + streak;

  document.querySelectorAll('.topo-device').forEach(b => { b.onclick = null; b.style.pointerEvents = 'none'; });
  document.querySelectorAll('.topo-zone').forEach(z => { z.onclick = null; z.style.cursor = 'default'; });
  const topoSubmit = document.getElementById('topo-submit-btn');
  if (topoSubmit) topoSubmit.classList.add('is-hidden');
  const topoReset = document.querySelector('.topo-controls .btn-ghost');
  if (topoReset) topoReset.classList.add('is-hidden');

  const zones = q.zones || [];
  zones.forEach(zone => {
    const zoneId = 'topo-zone-' + zone.replace(/[^a-zA-Z0-9]/g, '-');
    const el = document.getElementById(zoneId);
    if (!el) return;
    const placed = topoDevices[zone] || [];
    el.innerHTML = placed.map(d => {
      const r = results[d];
      const cls = r ? (r.isRight ? 'topo-correct' : 'topo-wrong') : '';
      const hint = r && !r.isRight ? ' \u2192 ' + escHtml(r.correctZone) : '';
      return '<span class="topo-placed-device ' + cls + '">' + escHtml(d) + hint + '</span>';
    }).join('');
  });

  showExplanation(q, allCorrect);
}

// ══════════════════════════════════════════
// INJECT PBQs FROM PREDEFINED BANKS
// ══════════════════════════════════════════
function getMatchingScenarios(qTopic) {
  const cli = cliScenarios.filter(s => qTopic === MIXED_TOPIC || s.topic === qTopic || qTopic.includes('Troubleshoot'));
  const topo = topoScenarios.filter(s => qTopic === MIXED_TOPIC || s.topic === qTopic);
  return { cli, topo };
}

function injectPBQs(qs, qTopic, count) {
  if (count <= 0 || qs.length < 5) return qs;
  const { cli, topo } = getMatchingScenarios(qTopic);
  const pool = [...cli, ...topo].sort(() => Math.random() - 0.5);
  if (pool.length === 0) return qs;
  const toInject = pool.slice(0, Math.min(count, pool.length));
  const result = [...qs];
  toInject.forEach((pbq, i) => {
    const insertIdx = Math.min(Math.floor(result.length * 0.4) + i * 3, result.length - 1);
    // Stamp N10-009 objective on injected PBQs so they pass validateQuestions
    const pbqTopic = pbq.topic || qTopic;
    const obj = (topicResources[pbqTopic] && topicResources[pbqTopic].obj) || '5.1';
    result.splice(insertIdx, 1, { ...pbq, objective: obj });
  });
  return result;
}

// ══════════════════════════════════════════
// AI SECOND-PASS VALIDATOR (Enhancement 1)
// ══════════════════════════════════════════
async function aiValidateQuestions(key, qs) {
  // Only validate MCQ questions (most error-prone)
  const mcqs = qs.filter(q => getQType(q) === 'mcq');
  if (mcqs.length === 0) return qs;

  // Build a compact verification prompt
  const qList = mcqs.map((q, i) => {
    return `Q${i+1}: "${q.question}"\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}\nD) ${q.options.D}\nMarked answer: ${q.answer}\nExplanation: ${q.explanation}`;
  }).join('\n\n');

  const prompt = `You are a CompTIA Network+ N10-009 expert verifier. Review each question below and check if the marked answer is FACTUALLY CORRECT.

For each question, respond with ONLY:
- "Q1:OK" if the marked answer is correct
- "Q1:WRONG:X" if the correct answer should be letter X instead
- "Q1:AMBIGUOUS" if the question is unclear or has multiple valid answers

Be strict. Check actual networking facts. Common errors to catch:
- Port numbers matched to wrong protocols
- OSI layers confused
- Protocol features attributed to wrong protocol
- Subnet calculations that are off
- Security concepts misattributed

${qList}

Respond with one line per question, nothing else:`;

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
    });

    if (!res.ok) return qs; // If validation call fails, keep questions as-is

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);

    // Parse results
    const fixes = {};
    lines.forEach(line => {
      const wrongMatch = line.match(/Q(\d+)\s*:\s*WRONG\s*:\s*([A-D])/i);
      const ambigMatch = line.match(/Q(\d+)\s*:\s*AMBIGUOUS/i);
      if (wrongMatch) {
        const idx = parseInt(wrongMatch[1]) - 1;
        const correctLetter = wrongMatch[2].toUpperCase();
        fixes[idx] = { action: 'fix', letter: correctLetter };
      } else if (ambigMatch) {
        const idx = parseInt(ambigMatch[1]) - 1;
        fixes[idx] = { action: 'remove' };
      }
    });

    // Apply fixes
    let fixCount = 0;
    let removeCount = 0;
    const mcqIndices = [];
    qs.forEach((q, i) => { if (getQType(q) === 'mcq') mcqIndices.push(i); });

    const result = qs.filter((q, i) => {
      const mcqIdx = mcqIndices.indexOf(i);
      if (mcqIdx === -1 || !fixes[mcqIdx]) return true;
      if (fixes[mcqIdx].action === 'remove') { removeCount++; return false; }
      if (fixes[mcqIdx].action === 'fix') {
        const newAnswer = fixes[mcqIdx].letter;
        if (q.options[newAnswer]) {
          q.answer = newAnswer;
          fixCount++;
        }
      }
      return true;
    });

    return result;
  } catch (e) {
    return qs;
  }
}

// ══════════════════════════════════════════
// EXPLAIN FURTHER (Enhancement 5)
// ══════════════════════════════════════════
async function explainFurther() {
  const q = examMode ? examQuestions[examCurrent] : questions[current];
  if (!q) return;

  // Increment deep dive usage counter (for deep_dive_10 milestone)
  try {
    const prev = parseInt(localStorage.getItem(STORAGE.DEEP_DIVE_USES) || '0');
    localStorage.setItem(STORAGE.DEEP_DIVE_USES, String(prev + 1));
  } catch {}

  const btn = document.querySelector('.explain-btn');
  if (btn) { btn.textContent = 'Loading\u2026'; btn.disabled = true; }

  const key = apiKey || localStorage.getItem(STORAGE.KEY) || '';
  if (!key) {
    if (btn) { btn.textContent = 'No API key'; btn.disabled = true; }
    return;
  }

  const qType = getQType(q);
  let questionContext;
  if (qType === 'topology') {
    questionContext = `Question: ${q.question}\nScenario: ${q.scenario}\nCorrect placements: ${JSON.stringify(q.correctPlacements)}`;
  } else if (qType === 'cli-sim') {
    questionContext = `Question: ${q.question}\nScenario: ${q.scenario}\nCorrect answer: ${q.answer} - ${q.options[q.answer]}`;
  } else if (qType === 'multi-select') {
    const letters = Object.keys(q.options).sort();
    questionContext = `Question: ${q.question}\nOptions:\n${letters.map(l => l + ') ' + q.options[l]).join('\n')}\nCorrect answers: ${(q.answers || []).join(', ')}`;
  } else if (qType === 'order') {
    questionContext = `Question: ${q.question}\nCorrect order: ${(q.correctOrder || []).map(i => q.items[i]).join(' -> ')}`;
  } else {
    questionContext = `Question: ${q.question}\nOptions:\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}\nD) ${q.options.D}\nCorrect: ${q.answer} - ${q.options[q.answer]}`;
  }

  const prompt = `A student studying for the CompTIA Network+ N10-009 exam needs a thorough, teaching-quality explanation of this concept.

${questionContext}

Original explanation: ${q.explanation}

Please provide ALL of the following sections:

1. CONCEPT BREAKDOWN
Explain the underlying networking concept in simple, plain English. Assume the student is new to this topic. Cover what it is, why it exists, and how it works in practice. (3-4 sentences)

2. REAL-WORLD ANALOGY
Give a memorable real-world analogy that makes this concept click. Be creative and specific.

3. WHY EACH WRONG ANSWER IS WRONG
For each incorrect option, explain in 1-2 sentences WHY it's wrong and what it actually refers to (so the student learns from the distractors too).

4. HOW THIS APPEARS ON THE EXAM
Describe common ways CompTIA tests this concept — what tricky wording to watch for, what distractors they like to use, and any "gotcha" patterns.

5. MEMORY TRICK
Give a mnemonic, acronym, or memory hook to lock this in.

6. RELATED CONCEPTS
List 2-3 related topics the student should also review (one line each).

Use plain text, no markdown. Label each section clearly. Aim for 250-350 words total — thorough but not bloated.`;

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });

    if (!res.ok) throw new Error('API error');

    const data = await res.json();
    const text = data.content?.[0]?.text || 'Could not generate explanation.';

    // Format sections with visual labels
    let formatted = escHtml(text).replace(/\n/g, '<br>');
    // Bold the section headers
    formatted = formatted.replace(/((?:^|<br>)\d+\.\s*(?:CONCEPT BREAKDOWN|REAL-WORLD ANALOGY|WHY EACH WRONG ANSWER IS WRONG|HOW THIS APPEARS ON THE EXAM|MEMORY TRICK|RELATED CONCEPTS))/gi,
      '<span class="deep-section-header">$1</span>');

    // Show in a new div below the explanation
    const deepDiv = document.getElementById('deep-explain') || document.createElement('div');
    deepDiv.id = 'deep-explain';
    deepDiv.className = 'deep-explain show';
    deepDiv.innerHTML = '<strong>\ud83d\udca1 Deep Dive</strong><div class="deep-explain-text">' + formatted + '</div>';

    const expBox = document.getElementById('exp-box');
    if (expBox && !document.getElementById('deep-explain')) {
      expBox.appendChild(deepDiv);
    }

    if (btn) { btn.textContent = '\ud83d\udca1 Explained'; btn.disabled = true; btn.classList.add('explained'); }
  } catch (e) {
    if (btn) { btn.textContent = 'Failed \u2014 try again'; btn.disabled = false; }
  }
}

// ══════════════════════════════════════════
// TOPIC DEEP DIVE PANEL
// ══════════════════════════════════════════
let topicDiveReturnPage = 'quiz';

// Builds the JSON-shaped prompt sent to Claude for the Topic Deep Dive feature.
// Extracted from showTopicDeepDive() (#18) so the parent fits the long-function budget.
function buildTopicDivePrompt(topicName) {
  return `You are a CompTIA Network+ N10-009 instructor. Create a comprehensive study guide for the topic: "${topicName}"

Return your response as valid JSON with this exact structure:
{
  "summary": "2-3 sentence overview of what this topic covers and why it matters for the exam",
  "keyConcepts": [
    { "name": "Concept Name", "detail": "1-2 sentence explanation" },
    { "name": "Concept Name", "detail": "1-2 sentence explanation" },
    { "name": "Concept Name", "detail": "1-2 sentence explanation" },
    { "name": "Concept Name", "detail": "1-2 sentence explanation" }
  ],
  "howItWorks": "3-4 sentence detailed but accessible explanation of how the core technology/concept works under the hood. Use simple language a beginner would understand.",
  "scenario": "A realistic workplace scenario (3-4 sentences) showing this concept in action. Include the problem, the solution, and what commands/tools/protocols were used.",
  "examTips": [
    "Specific exam tip or trap to watch for",
    "Another specific tip",
    "A third tip"
  ],
  "memoryTrick": "A mnemonic, acronym, or memorable hook to remember the key facts",
  "diagram": "An ASCII diagram showing the concept visually (use box-drawing characters like ┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼ and arrows → ← ↑ ↓). Make it clear and labeled. 5-8 lines max. If the topic doesn't suit a diagram, provide a structured comparison table instead."
}

Return ONLY valid JSON, no extra text before or after.`;
}

async function showTopicDeepDive(topicName) {
  // Remember which page to return to
  const pages = ['page-quiz', 'page-review', 'page-exam', 'page-exam-results', 'page-results'];
  topicDiveReturnPage = pages.find(p => document.getElementById(p).classList.contains('active')) || 'page-quiz';

  const res = topicResources[topicName];
  const titleEl = document.getElementById('topic-dive-title');
  const objEl = document.getElementById('topic-dive-obj');
  const contentEl = document.getElementById('topic-dive-content');
  const backBtn = document.getElementById('topic-dive-back');

  titleEl.textContent = '📚 ' + topicName;
  objEl.textContent = res ? 'Exam Objective ' + res.obj : '';
  contentEl.innerHTML = '<div class="topic-dive-loading"><div class="spinner" style="width:32px;height:32px;border-width:3px"></div><p style="margin-top:12px;color:var(--text-dim)">Generating topic guide\u2026</p></div>';

  backBtn.onclick = () => {
    document.getElementById('page-topic-dive').classList.remove('active');
    document.getElementById(topicDiveReturnPage).classList.add('active');
    window.scrollTo(0, 0);
  };

  showPage('topic-dive');

  const key = apiKey || localStorage.getItem(STORAGE.KEY) || '';
  if (!key) {
    contentEl.innerHTML = '<div class="topic-dive-error">⚠️ No API key found. Enter your Anthropic API key on the setup page to use Topic Deep Dive.</div>';
    return;
  }

  const prompt = buildTopicDivePrompt(topicName);

  try {
    const apiRes = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
    });

    if (!apiRes.ok) throw new Error('API error');

    const data = await apiRes.json();
    const raw = data.content?.[0]?.text || '';

    // Extract JSON (handle possible markdown code fences)
    let jsonStr = raw.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const guide = JSON.parse(jsonStr);
    renderTopicDive(guide, topicName);
  } catch (e) {
    // Fallback: try to render what we can, or show error
    contentEl.innerHTML = '<div class="topic-dive-error">⚠️ Could not generate topic guide. Please try again.<br><button class="btn btn-primary" style="margin-top:12px" onclick="showTopicDeepDive(\'' + escHtml(topicName).replace(/'/g, "\\'") + '\')">Retry</button></div>';
  }
}

function renderTopicDive(guide, topicName) {
  const contentEl = document.getElementById('topic-dive-content');

  const conceptCards = (guide.keyConcepts || []).map((c, i) => {
    const icons = ['🔹', '🔸', '💠', '🔷', '⚡', '🔶'];
    return `<div class="td-concept-card">
      <div class="td-concept-icon">${icons[i % icons.length]}</div>
      <div class="td-concept-body">
        <div class="td-concept-name">${escHtml(c.name)}</div>
        <div class="td-concept-detail">${escHtml(c.detail)}</div>
      </div>
    </div>`;
  }).join('');

  const examTips = (guide.examTips || []).map(t =>
    `<li>${escHtml(t)}</li>`
  ).join('');

  contentEl.innerHTML = `
    <div class="td-section td-summary">
      <div class="td-section-icon">📋</div>
      <div class="td-section-body">
        <h3>Overview</h3>
        <p>${escHtml(guide.summary || '')}</p>
      </div>
    </div>

    <div class="td-section">
      <div class="td-section-icon">🧩</div>
      <div class="td-section-body">
        <h3>Key Concepts</h3>
        <div class="td-concept-grid">${conceptCards}</div>
      </div>
    </div>

    <div class="td-section">
      <div class="td-section-icon">⚙️</div>
      <div class="td-section-body">
        <h3>How It Works</h3>
        <p>${escHtml(guide.howItWorks || '')}</p>
      </div>
    </div>

    ${guide.diagram ? `<div class="td-section td-diagram-section">
      <div class="td-section-icon">📐</div>
      <div class="td-section-body">
        <h3>Visual Diagram</h3>
        <pre class="td-diagram">${escHtml(guide.diagram)}</pre>
      </div>
    </div>` : ''}

    <div class="td-section td-scenario">
      <div class="td-section-icon">🏢</div>
      <div class="td-section-body">
        <h3>Real-World Scenario</h3>
        <p>${escHtml(guide.scenario || '')}</p>
      </div>
    </div>

    <div class="td-section">
      <div class="td-section-icon">🎯</div>
      <div class="td-section-body">
        <h3>Exam Tips &amp; Traps</h3>
        <ul class="td-tips-list">${examTips}</ul>
      </div>
    </div>

    <div class="td-section td-memory">
      <div class="td-section-icon">🧠</div>
      <div class="td-section-body">
        <h3>Memory Trick</h3>
        <p class="td-memory-text">${escHtml(guide.memoryTrick || '')}</p>
      </div>
    </div>

    ${_renderTopicTerminalSection(topicName)}
    ${_renderTopicLabSection(topicName)}
  `;
}

// v4.16 / #68 — "Try it in Terminal" static section appended to the
// AI-generated topic dive. Only renders if the topic has curated commands.
function _renderTopicTerminalSection(topicName) {
  const cmds = topicCommands[topicName];
  if (!cmds || cmds.length === 0) return '';
  const cards = cmds.map(c => _terminalCardHtml(c.cmd, c.note)).join('');
  return `<div class="td-section td-terminal">
    <div class="td-section-icon">💻</div>
    <div class="td-section-body">
      <h3>Try It In Terminal</h3>
      <p class="td-terminal-intro">Run these on macOS / iOS Terminal to see this topic live:</p>
      <div class="td-terminal-list">${cards}</div>
    </div>
  </div>`;
}

// v4.16 / #69 — Guided Lab callout. Shows a single button that opens a
// full guided walkthrough page. Only renders if the topic has a lab.
function _renderTopicLabSection(topicName) {
  const lab = guidedLabs[topicName];
  if (!lab) return '';
  const topicAttr = escHtml(topicName).replace(/'/g, '&#39;');
  return `<div class="td-section td-lab-callout">
    <div class="td-section-icon">🖥️</div>
    <div class="td-section-body">
      <h3>Guided Terminal Lab</h3>
      <p>Want to go deeper? There\'s a coached walkthrough for this topic — ${escHtml(lab.title)} (${escHtml(lab.duration)}).</p>
      <button type="button" class="btn btn-primary td-lab-btn" onclick="openGuidedLab('${topicAttr}')">🖥️ Start Guided Lab</button>
    </div>
  </div>`;
}

// ══════════════════════════════════════════
// GUIDED TERMINAL LAB PAGE (v4.16 / #69)
// ══════════════════════════════════════════
let guidedLabReturnPage = 'page-topic-dive';

function openGuidedLab(topicName) {
  const lab = guidedLabs[topicName];
  if (!lab) { showErrorToast('No lab available for this topic yet.'); return; }

  // Remember which page we came from so Back works
  const pages = ['page-topic-dive', 'page-ports', 'page-quiz', 'page-review', 'page-results', 'page-exam-results'];
  guidedLabReturnPage = pages.find(p => document.getElementById(p) && document.getElementById(p).classList.contains('active')) || 'page-ports';

  const titleEl = document.getElementById('lab-title');
  const metaEl = document.getElementById('lab-meta');
  const introEl = document.getElementById('lab-intro');
  const stepsEl = document.getElementById('lab-steps');
  const wrapEl = document.getElementById('lab-wrap');

  if (!titleEl) return;

  titleEl.textContent = '🖥️ ' + lab.title;
  metaEl.innerHTML = `<span class="lab-meta-pill">Obj ${escHtml(lab.objective)}</span><span class="lab-meta-pill">${escHtml(lab.duration)}</span><span class="lab-meta-pill">${lab.steps.length} steps</span>`;
  introEl.innerHTML = `<p>${escHtml(lab.intro)}</p>`;

  stepsEl.innerHTML = lab.steps.map((s, i) => `
    <div class="lab-step">
      <div class="lab-step-head">
        <span class="lab-step-num">Step ${i + 1}</span>
        <span class="lab-step-count">of ${lab.steps.length}</span>
      </div>
      <p class="lab-step-narration">${escHtml(s.narration)}</p>
      ${_terminalCardHtml(s.cmd, null)}
      <div class="lab-step-expect"><strong>What you should see:</strong> ${escHtml(s.expect)}</div>
    </div>
  `).join('');

  wrapEl.innerHTML = `<div class="lab-wrap">${escHtml(lab.wrap)}</div>`;

  const backBtn = document.getElementById('lab-back-btn');
  if (backBtn) {
    backBtn.onclick = () => {
      document.getElementById('page-guided-lab').classList.remove('active');
      document.getElementById(guidedLabReturnPage).classList.add('active');
      window.scrollTo(0, 0);
    };
  }

  showPage('guided-lab');
}

// ══════════════════════════════════════════
// TOPOLOGY BUILDER — Tier 1 (v4.18 / #74)
// SVG canvas + device palette + cables + save/load
// Tier 2 (config panels) and Tier 3 (AI coach) ship later.
// ══════════════════════════════════════════

const TB_MAX_DEVICES = 50;
const TB_MAX_SAVES = 5;
const TB_CANVAS_W = 1400;
const TB_CANVAS_H = 820;

// Device type catalog. Adding a new type = one entry here.
// `icon` is the key used by tbDeviceIcon() to render an inline SVG shape.
const TB_DEVICE_TYPES = {
  router:        { label: 'Router',        color: '#7c6ff7', short: 'R'    },
  switch:        { label: 'Switch',        color: '#22c55e', short: 'SW'   },
  'dmz-switch':  { label: 'DMZ Switch',    color: '#f43f5e', short: 'DMZ'  },
  wap:           { label: 'WAP',           color: '#06b6d4', short: 'AP'   },
  pc:            { label: 'PC',            color: '#f59e0b', short: 'PC'   },
  server:        { label: 'Server',        color: '#ef4444', short: 'SRV'  },
  firewall:      { label: 'Firewall',      color: '#eab308', short: 'FW'   },
  cloud:         { label: 'Internet/WAN',   color: '#60a5fa', short: 'WAN'  },
  'isp-router':  { label: 'ISP Router',     color: '#818cf8', short: 'ISP'  },
  'load-balancer': { label: 'Load Balancer', color: '#ec4899', short: 'LB' },
  ids:           { label: 'IDS/IPS',       color: '#f97316', short: 'IDS'  },
  wlc:           { label: 'WLC',           color: '#14b8a6', short: 'WLC'  },
  printer:       { label: 'Printer',       color: '#a3a3a3', short: 'PRN'  },
  voip:          { label: 'VoIP Phone',    color: '#0ea5e9', short: 'VoIP' },
  iot:           { label: 'IoT Device',    color: '#84cc16', short: 'IoT'  },
  'public-web':  { label: 'Public Web',    color: '#fde047', short: 'WEB'  },
  'public-file': { label: 'Public File',   color: '#fb923c', short: 'FILE' },
  'public-cloud':{ label: 'Public Cloud',  color: '#38bdf8', short: 'PUB'  },
  // ── Cloud Networking device types ──
  'vpc':          { label: 'VPC',            color: '#8b5cf6', short: 'VPC'  },
  'cloud-subnet': { label: 'Cloud Subnet',  color: '#a78bfa', short: 'SUB'  },
  'igw':          { label: 'Internet GW',    color: '#2dd4bf', short: 'IGW'  },
  'nat-gw':       { label: 'NAT Gateway',   color: '#34d399', short: 'NAT'  },
  'tgw':          { label: 'Transit GW',     color: '#f472b6', short: 'TGW'  },
  'vpg':          { label: 'VPN Gateway',    color: '#fb923c', short: 'VPG'  },
  'onprem-dc':    { label: 'On-Prem DC',    color: '#78716c', short: 'DC'   },
  'sase-edge':    { label: 'SASE Edge',      color: '#e879f9', short: 'SASE' },
  'dns-server':   { label: 'DNS Server',     color: '#06b6d4', short: 'DNS'  },
};

// Cable type catalog for the palette picker.
// `width`/`color`/`dash` drive rendering; `label` shows in the palette chip.
const TB_CABLE_TYPES = {
  cat6:    { label: 'Cat6',    color: '#a78bfa', width: 7, dash: ''    },
  cat5e:   { label: 'Cat5e',   color: '#3b82f6', width: 6, dash: ''    },
  fiber:   { label: 'Fiber',   color: '#f59e0b', width: 5, dash: ''    },
  coax:    { label: 'Coax',    color: '#0f172a', width: 9, dash: ''    },
  console: { label: 'Console', color: '#ef4444', width: 5, dash: '6 4' },
};
let tbSelectedCableType = 'cat6';

// ══════════════════════════════════════════
// TOPOLOGY BUILDER — Network Simulator Foundation
// ══════════════════════════════════════════

// Interface defaults per device type: how many ports, naming convention.
const TB_IFACE_DEFAULTS = {
  router:        { count: 4,  naming: i => `Gi0/${i}` },
  switch:        { count: 24, naming: i => `Fa0/${i + 1}` },
  'dmz-switch':  { count: 24, naming: i => `Fa0/${i + 1}` },
  firewall:      { count: 4,  naming: i => `eth${i}` },
  wap:           { count: 1,  naming: () => 'eth0' },
  pc:            { count: 1,  naming: () => 'eth0' },
  server:        { count: 2,  naming: i => `eth${i}` },
  cloud:         { count: 4,  naming: i => `wan${i}` },
  'isp-router':  { count: 6,  naming: i => `Gi0/${i}` },
  printer:       { count: 1,  naming: () => 'eth0' },
  voip:          { count: 1,  naming: () => 'eth0' },
  iot:           { count: 1,  naming: () => 'eth0' },
  'load-balancer': { count: 4, naming: i => `eth${i}` },
  ids:           { count: 2,  naming: i => `eth${i}` },
  wlc:           { count: 2,  naming: i => `eth${i}` },
  'public-web':  { count: 1,  naming: () => 'eth0' },
  'public-file': { count: 1,  naming: () => 'eth0' },
  'public-cloud':{ count: 1,  naming: () => 'eth0' },
  // Cloud networking
  'vpc':          { count: 4,  naming: i => `eni${i}` },
  'cloud-subnet': { count: 2,  naming: i => `eni${i}` },
  'igw':          { count: 2,  naming: i => `eni${i}` },
  'nat-gw':       { count: 2,  naming: i => `eni${i}` },
  'tgw':          { count: 6,  naming: i => `att${i}` },
  'vpg':          { count: 2,  naming: i => `tun${i}` },
  'onprem-dc':    { count: 4,  naming: i => `eth${i}` },
  'sase-edge':    { count: 4,  naming: i => `zt${i}` },
  'dns-server':   { count: 2,  naming: i => `eth${i}` },
};

// Generate a deterministic MAC from a device ID + interface index.
// Format: XX:XX:XX:YY:YY:ZZ where XX comes from a hash of deviceId, YY:ZZ from ifaceIdx.
function tbGenerateMac(deviceId, ifaceIdx) {
  let h = 0x2A;
  for (let i = 0; i < deviceId.length; i++) h = ((h << 5) - h + deviceId.charCodeAt(i)) | 0;
  const a = (h >>> 24) & 0xFE; // clear multicast bit
  const b = (h >>> 16) & 0xFF;
  const c = (h >>> 8) & 0xFF;
  const hex = x => x.toString(16).padStart(2, '0').toUpperCase();
  return `${hex(a | 0x02)}:${hex(b)}:${hex(c)}:00:${hex(ifaceIdx)}:${hex((h ^ ifaceIdx) & 0xFF)}`;
}

// Auto-hostname: R1, SW2, PC3 etc based on existing devices of same type.
function tbAutoHostname(type, devices) {
  const short = (TB_DEVICE_TYPES[type] && TB_DEVICE_TYPES[type].short) || type.toUpperCase().slice(0, 3);
  const count = devices.filter(d => d.type === type).length;
  return `${short}${count + 1}`;
}

// Create default interfaces for a device.
function tbGenerateInterfaces(type, deviceId) {
  const def = TB_IFACE_DEFAULTS[type] || { count: 1, naming: i => `eth${i}` };
  const ifaces = [];
  for (let i = 0; i < def.count; i++) {
    ifaces.push({
      name: def.naming(i),
      cableId: null,
      ip: '',
      mask: '255.255.255.0',
      mac: tbGenerateMac(deviceId, i),
      vlan: 1,
      mode: 'access',     // 'access' | 'trunk'
      trunkAllowed: [1],
      gateway: '',
      enabled: true,
      subInterfaces: [],  // router-on-a-stick: [{name, vlan, ip, mask}]
    });
  }
  return ifaces;
}

// Migrate old topology state (pre-simulator) to new format.
// Called on every load so old saves get interfaces/MACs auto-generated.
function tbMigrateState(state) {
  if (!state || !state.devices) return state;
  state.devices.forEach(d => {
    if (!d.interfaces) {
      d.interfaces = tbGenerateInterfaces(d.type, d.id);
      d.hostname = tbAutoHostname(d.type, state.devices.filter(x => x !== d));
    }
    d.routingTable = d.routingTable || [];
    d.arpTable = d.arpTable || [];
    d.macTable = d.macTable || [];
    d.vlanDb = d.vlanDb || (d.type.indexOf('switch') >= 0 ? [{ id: 1, name: 'default' }] : []);
    d.dhcpServer = d.dhcpServer || null;
    d.dhcpRelay = d.dhcpRelay || null;
    d.acls = d.acls || [];
    // Cloud networking defaults
    d.securityGroups = d.securityGroups || [];
    d.nacls = d.nacls || [];
    d.vpcConfig = d.vpcConfig || null;
    d.vpnConfig = d.vpnConfig || null;
    d.saseConfig = d.saseConfig || null;
    // VXLAN overlay
    d.vxlanConfig = d.vxlanConfig || [];
    // v4.30.0 — STP, OSPF, IPv6, DNS, QoS, Wireless
    d.stpConfig = d.stpConfig || null;
    d.ospfConfig = d.ospfConfig || null;
    d.qosConfig = d.qosConfig || null;
    d.wirelessConfig = d.wirelessConfig || null;
    d.dnsRecords = d.dnsRecords || [];
    // IPv6 on interfaces
    d.interfaces.forEach(ifc => { ifc.ipv6 = ifc.ipv6 || ''; ifc.ipv6Prefix = ifc.ipv6Prefix || 64; });
    // v4.31.0 — BGP, EIGRP, DNSSEC, Attack scenarios
    d.bgpConfig = d.bgpConfig || null;
    d.eigrpConfig = d.eigrpConfig || null;
    d.dnssecEnabled = d.dnssecEnabled || false;
    d.dhcpSnooping = d.dhcpSnooping || null;
    d.daiEnabled = d.daiEnabled || false;
    d.portSecurity = d.portSecurity || null;
  });
  // Auto-bind cables to interfaces if not already bound
  state.cables.forEach(c => {
    if (c.fromIface === undefined || c.fromIface === null) {
      const fromDev = state.devices.find(d => d.id === c.from);
      if (fromDev) {
        const avail = fromDev.interfaces.find(ifc => !ifc.cableId);
        if (avail) { avail.cableId = c.id; c.fromIface = avail.name; }
        else c.fromIface = null;
      }
    }
    if (c.toIface === undefined || c.toIface === null) {
      const toDev = state.devices.find(d => d.id === c.to);
      if (toDev) {
        const avail = toDev.interfaces.find(ifc => !ifc.cableId);
        if (avail) { avail.cableId = c.id; c.toIface = avail.name; }
        else c.toIface = null;
      }
    }
  });
  state.simLog = state.simLog || [];
  return state;
}

// Simulation state (not persisted)
let tbConfigPanelDeviceId = null;
let tbSimRunning = false;
let tbSimLog = [];
let tbSimAnimations = [];

function tbSelectCableType(type) {
  if (!TB_CABLE_TYPES[type]) return;
  tbSelectedCableType = type;
  tbRenderPalette();
  tbUpdateStatus(`Cable type set to ${TB_CABLE_TYPES[type].label}. Click device A \u2192 device B to wire.`);
}

// Inline SVG icon for each device type. Drawn inside a box roughly 56x40
// centered near (0, -10) so the label at y=30 has room. `color` colors stroke/fill.
function tbDeviceIcon(type, color) {
  const s = `stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const f = `fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-width="2"`;
  switch (type) {
    case 'router':
      return `<g transform="translate(0,-12)">
        <rect x="-28" y="-6" width="56" height="22" rx="4" ${f}/>
        <circle cx="-16" cy="5" r="2" fill="${color}"/>
        <circle cx="-8"  cy="5" r="2" fill="${color}"/>
        <circle cx="0"   cy="5" r="2" fill="${color}"/>
        <circle cx="8"   cy="5" r="2" fill="${color}"/>
        <circle cx="16"  cy="5" r="2" fill="${color}"/>
        <path d="M -20 -6 L -20 -16 M 20 -6 L 20 -16" ${s}/>
        <path d="M -24 -18 L -16 -18 M 16 -18 L 24 -18" ${s}/>
      </g>`;
    case 'switch':
      return `<g transform="translate(0,-10)">
        <rect x="-30" y="-8" width="60" height="20" rx="3" ${f}/>
        ${[-22,-14,-6,2,10,18].map(x => `<rect x="${x}" y="-2" width="4" height="8" fill="${color}"/>`).join('')}
      </g>`;
    case 'dmz-switch':
      return `<g transform="translate(0,-10)">
        <rect x="-30" y="-8" width="60" height="20" rx="3" ${f}/>
        ${[-22,-14,-6,2,10,18].map(x => `<rect x="${x}" y="-2" width="4" height="8" fill="${color}"/>`).join('')}
        <text y="-14" text-anchor="middle" font-size="8" font-weight="800" fill="${color}">DMZ</text>
      </g>`;
    case 'wap':
      return `<g transform="translate(0,-12)">
        <path d="M -22 -4 A 22 22 0 0 1 22 -4" ${s}/>
        <path d="M -14 2 A 14 14 0 0 1 14 2" ${s}/>
        <path d="M -6 8 A 6 6 0 0 1 6 8" ${s}/>
        <circle cx="0" cy="14" r="3" fill="${color}"/>
      </g>`;
    case 'pc':
      return `<g transform="translate(0,-12)">
        <rect x="-24" y="-14" width="48" height="32" rx="3" ${f}/>
        <rect x="-22" y="-12" width="44" height="26" rx="1" fill="${color}" fill-opacity="0.6"/>
        <rect x="-8" y="20" width="16" height="3" fill="${color}"/>
      </g>`;
    case 'server':
      return `<g transform="translate(0,-12)">
        <rect x="-22" y="-14" width="44" height="12" rx="2" ${f}/>
        <rect x="-22" y="0"   width="44" height="12" rx="2" ${f}/>
        <circle cx="-14" cy="-8" r="1.5" fill="${color}"/>
        <circle cx="-14" cy="6"  r="1.5" fill="${color}"/>
        <rect x="-6" y="-10" width="22" height="4" fill="${color}" fill-opacity="0.6"/>
        <rect x="-6" y="4"   width="22" height="4" fill="${color}" fill-opacity="0.6"/>
      </g>`;
    case 'firewall':
      return `<g transform="translate(0,-12)">
        <rect x="-28" y="-14" width="56" height="32" rx="2" ${f}/>
        <path d="M -28 -4 L 28 -4 M -28 8 L 28 8 M -14 -14 L -14 -4 M 0 -4 L 0 8 M 14 -14 L 14 -4 M -14 8 L -14 18 M 14 8 L 14 18" ${s}/>
      </g>`;
    case 'cloud':
      return `<g transform="translate(0,-10)">
        <circle cx="0" cy="-2" r="16" ${f}/>
        <ellipse cx="0" cy="-2" rx="16" ry="6" ${s}/>
        <line x1="0" y1="-18" x2="0" y2="14" ${s}/>
        <line x1="-16" y1="-2" x2="16" y2="-2" ${s}/>
        <path d="M 0 -18 Q -9 -2 0 14 Q 9 -2 0 -18" ${s}/>
        <text y="22" text-anchor="middle" font-size="6" font-weight="800" fill="${color}">WAN</text>
      </g>`;
    case 'isp-router':
      return `<g transform="translate(0,-12)">
        <rect x="-22" y="-14" width="44" height="28" rx="6" ${f}/>
        <circle cx="-10" cy="-4" r="3" fill="${color}"/>
        <circle cx="0" cy="-4" r="3" fill="${color}"/>
        <circle cx="10" cy="-4" r="3" fill="${color}"/>
        <line x1="-18" y1="4" x2="18" y2="4" ${s}/>
        <path d="M -8 8 L 0 12 L 8 8" ${s}/>
        <path d="M -8 12 L 0 8 L 8 12" ${s}/>
        <text y="26" text-anchor="middle" font-size="6" font-weight="800" fill="${color}">ISP</text>
      </g>`;
    case 'load-balancer':
      return `<g transform="translate(0,-12)">
        <rect x="-28" y="-8" width="56" height="18" rx="3" ${f}/>
        <path d="M 0 10 L 0 16 M 0 16 L -14 22 M 0 16 L 0 22 M 0 16 L 14 22" ${s}/>
        <text y="4" text-anchor="middle" font-size="10" font-weight="700" fill="${color}">LB</text>
      </g>`;
    case 'ids':
      return `<g transform="translate(0,-12)">
        <rect x="-26" y="-10" width="52" height="20" rx="3" ${f}/>
        <path d="M -14 0 Q 0 -8 14 0 Q 0 8 -14 0 Z" ${s}/>
        <circle cx="0" cy="0" r="3" fill="${color}"/>
      </g>`;
    case 'wlc':
      return `<g transform="translate(0,-12)">
        <rect x="-26" y="0" width="52" height="18" rx="3" ${f}/>
        <path d="M -14 -4 A 14 14 0 0 1 14 -4" ${s}/>
        <path d="M -8 -8 A 8 8 0 0 1 8 -8" ${s}/>
        <text y="14" text-anchor="middle" font-size="9" font-weight="700" fill="${color}">WLC</text>
      </g>`;
    case 'printer':
      return `<g transform="translate(0,-12)">
        <rect x="-18" y="-14" width="36" height="8" ${f}/>
        <rect x="-24" y="-6"  width="48" height="16" rx="2" ${f}/>
        <rect x="-16" y="6"   width="32" height="12" ${f}/>
        <circle cx="16" cy="0" r="2" fill="${color}"/>
      </g>`;
    case 'voip':
      return `<g transform="translate(0,-12)">
        <rect x="-20" y="-14" width="40" height="32" rx="3" ${f}/>
        <rect x="-14" y="-10" width="28" height="8" fill="${color}" fill-opacity="0.6"/>
        ${[0,1,2].map(r => [0,1,2].map(c => `<circle cx="${-8+c*8}" cy="${2+r*5}" r="1.5" fill="${color}"/>`).join('')).join('')}
      </g>`;
    case 'iot':
      return `<g transform="translate(0,-12)">
        <rect x="-20" y="-10" width="40" height="22" rx="4" ${f}/>
        <circle cx="0" cy="1" r="6" ${s}/>
        <circle cx="0" cy="1" r="2" fill="${color}"/>
        <circle cx="-14" cy="-6" r="1.5" fill="${color}"/>
      </g>`;
    case 'public-web':
      return `<g transform="translate(0,-12)">
        <circle cx="0" cy="0" r="18" ${f}/>
        <ellipse cx="0" cy="0" rx="18" ry="7" ${s}/>
        <line x1="-18" y1="0" x2="18" y2="0" ${s}/>
        <line x1="0" y1="-18" x2="0" y2="18" ${s}/>
        <path d="M 0 -18 Q -10 0 0 18 Q 10 0 0 -18" ${s}/>
        <text y="26" text-anchor="middle" font-size="8" font-weight="800" fill="${color}">WWW</text>
      </g>`;
    case 'public-file':
      return `<g transform="translate(0,-12)">
        <rect x="-22" y="-14" width="44" height="12" rx="2" ${f}/>
        <rect x="-22" y="0"   width="44" height="12" rx="2" ${f}/>
        <circle cx="-14" cy="-8" r="1.5" fill="${color}"/>
        <circle cx="-14" cy="6"  r="1.5" fill="${color}"/>
        <path d="M 6 -10 L 12 -10 L 14 -8 L 18 -8 L 18 -4 L 6 -4 Z" ${s}/>
        <path d="M 6 4 L 12 4 L 14 6 L 18 6 L 18 10 L 6 10 Z" ${s}/>
      </g>`;
    case 'public-cloud':
      return `<g transform="translate(0,-10)">
        <path d="M -24 6 A 10 10 0 0 1 -14 -6 A 14 14 0 0 1 14 -10 A 10 10 0 0 1 22 8 L -22 8 A 8 8 0 0 1 -24 6 Z" ${f}/>
        <path d="M -6 -2 L 0 -8 L 6 -2 M 0 -8 L 0 6" ${s}/>
      </g>`;
    // ── Cloud Networking icons ──
    case 'vpc':
      return `<g transform="translate(0,-10)">
        <rect x="-24" y="-14" width="48" height="28" rx="6" stroke="${color}" stroke-width="2" stroke-dasharray="4 2" fill="none"/>
        <line x1="-12" y1="-4" x2="12" y2="-4" ${s}/>
        <line x1="-12" y1="4" x2="12" y2="4" ${s}/>
        <line x1="-6" y1="-12" x2="-6" y2="12" ${s}/>
        <line x1="6" y1="-12" x2="6" y2="12" ${s}/>
        <text y="24" text-anchor="middle" font-size="7" font-weight="800" fill="${color}">VPC</text>
      </g>`;
    case 'cloud-subnet':
      return `<g transform="translate(0,-10)">
        <rect x="-20" y="-10" width="40" height="20" rx="3" ${f}/>
        <line x1="-10" y1="0" x2="10" y2="0" ${s}/>
        <line x1="0" y1="-8" x2="0" y2="8" ${s}/>
        <text y="20" text-anchor="middle" font-size="6" font-weight="800" fill="${color}">/24</text>
      </g>`;
    case 'igw':
      return `<g transform="translate(0,-10)">
        <circle cx="0" cy="0" r="14" ${f}/>
        <ellipse cx="0" cy="0" rx="14" ry="5" ${s}/>
        <line x1="0" y1="-14" x2="0" y2="14" ${s}/>
        <path d="M -22 0 L -16 0 M -22 -3 L -16 0 L -22 3" ${s}/>
        <path d="M 22 0 L 16 0 M 22 -3 L 16 0 L 22 3" ${s}/>
      </g>`;
    case 'nat-gw':
      return `<g transform="translate(0,-10)">
        <rect x="-18" y="-10" width="36" height="20" rx="4" ${f}/>
        <path d="M -8 4 L -8 -4 L 8 -4" ${s}/>
        <path d="M 4 -8 L 8 -4 L 4 0" ${s}/>
        <text y="20" text-anchor="middle" font-size="6" font-weight="800" fill="${color}">NAT</text>
      </g>`;
    case 'tgw':
      return `<g transform="translate(0,-10)">
        <circle cx="0" cy="0" r="8" ${f}/>
        <line x1="0" y1="-16" x2="0" y2="-8" ${s}/>
        <line x1="0" y1="8" x2="0" y2="16" ${s}/>
        <line x1="-16" y1="0" x2="-8" y2="0" ${s}/>
        <line x1="8" y1="0" x2="16" y2="0" ${s}/>
        <line x1="-11" y1="-11" x2="-6" y2="-6" ${s}/>
        <line x1="6" y1="6" x2="11" y2="11" ${s}/>
        <circle cx="0" cy="-16" r="3" ${f}/>
        <circle cx="0" cy="16" r="3" ${f}/>
        <circle cx="-16" cy="0" r="3" ${f}/>
        <circle cx="16" cy="0" r="3" ${f}/>
      </g>`;
    case 'vpg':
      return `<g transform="translate(0,-10)">
        <rect x="-16" y="-12" width="32" height="24" rx="4" ${f}/>
        <path d="M -4 -4 A 4 4 0 1 1 4 -4 L 4 2 L -4 2 Z" ${s}/>
        <circle cx="0" cy="-5" r="2" fill="${color}"/>
        <line x1="-22" y1="0" x2="-16" y2="0" stroke="${color}" stroke-width="2" stroke-dasharray="3 2"/>
        <line x1="16" y1="0" x2="22" y2="0" stroke="${color}" stroke-width="2" stroke-dasharray="3 2"/>
      </g>`;
    case 'onprem-dc':
      return `<g transform="translate(0,-12)">
        <path d="M -20 -8 L 0 -18 L 20 -8 L 20 12 L -20 12 Z" ${f}/>
        <rect x="-14" y="-4" width="28" height="6" rx="1" stroke="${color}" stroke-width="1.5" fill="rgba(0,0,0,.3)"/>
        <rect x="-14" y="4" width="28" height="6" rx="1" stroke="${color}" stroke-width="1.5" fill="rgba(0,0,0,.3)"/>
        <circle cx="-8" cy="-1" r="1.5" fill="${color}"/>
        <circle cx="-8" cy="7" r="1.5" fill="${color}"/>
      </g>`;
    case 'sase-edge':
      return `<g transform="translate(0,-10)">
        <path d="M 0 -16 L 18 -4 L 14 16 L -14 16 L -18 -4 Z" ${f}/>
        <path d="M -10 4 A 6 6 0 0 1 -4 -2 A 8 8 0 0 1 6 -4 A 6 6 0 0 1 10 2 L -8 2 Z" stroke="${color}" stroke-width="1.5" fill="none"/>
        <circle cx="0" cy="8" r="2" fill="${color}"/>
        <line x1="0" y1="10" x2="0" y2="14" ${s}/>
      </g>`;
    case 'dns-server':
      return `<g transform="translate(0,-10)">
        <rect x="-14" y="-14" width="28" height="28" rx="3" ${f}/>
        <text x="0" y="2" text-anchor="middle" font-size="10" font-weight="900" fill="${color}">DNS</text>
        <line x1="-8" y1="10" x2="8" y2="10" ${s}/>
        <circle cx="-6" cy="14" r="1.5" fill="${color}"/><circle cx="0" cy="14" r="1.5" fill="${color}"/><circle cx="6" cy="14" r="1.5" fill="${color}"/>
      </g>`;
    default:
      return `<circle r="18" ${f}/>`;
  }
}

// Edge-intersection helper: from device center (cx,cy) toward target (tx,ty),
// return the point where the ray hits the device's rect edge (halfW x halfH).
function tbEdgePoint(cx, cy, tx, ty, halfW, halfH) {
  const dx = tx - cx, dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  if (absDx * halfH > absDy * halfW) {
    const sign = dx > 0 ? 1 : -1;
    return { x: cx + sign * halfW, y: cy + dy * halfW / absDx };
  } else {
    const sign = dy > 0 ? 1 : -1;
    return { x: cx + dx * halfH / absDy, y: cy + sign * halfH };
  }
}

// Topology builder state (prefixed tb* to avoid collision with PBQ topoDevices).
let tbState = { id: null, name: 'Untitled', devices: [], cables: [], created: 0, updated: 0 };
let tbSelectedId = null;        // currently selected device id OR cable id
let tbPendingCableFrom = null;  // device id of first click when wiring
let tbDragging = null;          // { id, offsetX, offsetY } while dragging a placed device
let tbPaletteDrag = null;       // { type } while dragging from palette
let tbMobileOverride = false;   // user hit "Open Anyway"

// Public entry point wired to the menu button.
function openTopologyBuilder() {
  // Mobile nudge check
  const nudge = document.getElementById('tb-mobile-nudge');
  const main = document.getElementById('tb-main');
  const isNarrow = window.innerWidth < 900;
  if (isNarrow && !tbMobileOverride) {
    nudge.classList.remove('is-hidden');
    main.classList.add('is-hidden');
    return;
  }
  nudge.classList.add('is-hidden');
  main.classList.remove('is-hidden');

  // Load draft if present, else start fresh
  const draft = tbLoadDraft();
  tbState = draft || tbNewState();

  tbRenderPalette();
  tbRenderCanvas();
  tbRefreshLoadSelect();
  tbRenderScenarioPanel();
  tbUpdateStatus('Drag a device from the palette \u2192');
  tbUpdateDeviceCount();
  tbAttachCanvasHandlers();
  tbAttachKeyHandler();
  // Always show sim toolbar when topology builder is open
  document.getElementById('tb-sim-toolbar')?.classList.remove('is-hidden');
}

function tbForceOpen() {
  tbMobileOverride = true;
  openTopologyBuilder();
}

function tbNewState() {
  return { id: 'topo_' + Date.now(), name: 'Untitled', devices: [], cables: [], created: Date.now(), updated: Date.now() };
}

// ── Palette ──
function tbRenderPalette() {
  const root = document.getElementById('tb-palette-items');
  if (!root) return;
  root.innerHTML = Object.entries(TB_DEVICE_TYPES).map(([type, meta]) => `
    <div class="tb-palette-item" data-tb-type="${type}" draggable="true"
         style="--tb-device-color:${meta.color}">
      <svg class="tb-palette-icon-svg" viewBox="-32 -28 64 56" width="48" height="42" aria-hidden="true">
        ${tbDeviceIcon(type, meta.color)}
      </svg>
      <div class="tb-palette-label">${escHtml(meta.label)}</div>
    </div>
  `).join('');

  // Cables sub-panel: selectable chips so new cables adopt the chosen type.
  const cableRoot = document.getElementById('tb-palette-cables');
  if (cableRoot) {
    cableRoot.innerHTML = Object.entries(TB_CABLE_TYPES).map(([type, meta]) => {
      const active = tbSelectedCableType === type ? ' tb-cable-chip-active' : '';
      const dashStyle = meta.dash ? `stroke-dasharray:${meta.dash};` : '';
      return `<button type="button" class="tb-cable-chip${active}" data-tb-cable-type="${type}"
                      onclick="tbSelectCableType('${type}')"
                      style="--tb-cable-color:${meta.color}"
                      aria-label="Select ${escHtml(meta.label)} cable">
        <svg class="tb-cable-chip-swatch" viewBox="0 0 40 10" width="40" height="10" aria-hidden="true">
          <line x1="2" y1="5" x2="38" y2="5" stroke="${meta.color}" stroke-width="${Math.min(meta.width, 7)}" stroke-linecap="round" style="${dashStyle}"/>
        </svg>
        <span class="tb-cable-chip-label">${escHtml(meta.label)}</span>
      </button>`;
    }).join('');
  }
  // HTML5 drag events
  root.querySelectorAll('.tb-palette-item').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      const type = el.getAttribute('data-tb-type');
      tbPaletteDrag = { type };
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', type);
      el.classList.add('tb-palette-item-dragging');
    });
    el.addEventListener('dragend', () => {
      tbPaletteDrag = null;
      el.classList.remove('tb-palette-item-dragging');
    });
  });
}

// ── Canvas rendering ──
function tbRenderCanvas() {
  const devLayer = document.getElementById('tb-devices-layer');
  const cabLayer = document.getElementById('tb-cables-layer');
  const emptyHint = document.getElementById('tb-empty-hint');
  if (!devLayer || !cabLayer) return;

  // Cables first (drawn under devices). Edge-to-edge, not center-to-center,
  // so the stroke isn't hidden behind the device rect. Devices shrank in
  // v4.19 so 30 fit comfortably — HALF_W/HALF_H shrank with them.
  const HALF_W = 48, HALF_H = 36;
  cabLayer.innerHTML = tbState.cables.map(c => {
    const from = tbState.devices.find(d => d.id === c.from);
    const to = tbState.devices.find(d => d.id === c.to);
    if (!from || !to) return '';
    const selected = tbSelectedId === c.id ? ' tb-cable-selected' : '';
    const p1 = tbEdgePoint(from.x, from.y, to.x, to.y, HALF_W, HALF_H);
    const p2 = tbEdgePoint(to.x, to.y, from.x, from.y, HALF_W, HALF_H);
    const cableType = c.type || 'cat6';
    const meta = TB_CABLE_TYPES[cableType] || TB_CABLE_TYPES.cat6;
    // Slight downward drape via quadratic curve — cables sag a bit.
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 + 16;
    const dAttr = `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`;
    const dashAttr = meta.dash ? ` stroke-dasharray="${meta.dash}"` : '';
    // Cable status: check if both ends have IPs on connected interfaces
    let cableStatus = '';
    const fromIfc = from.interfaces?.find(i => i.cableId === c.id);
    const toIfc = to.interfaces?.find(i => i.cableId === c.id);
    const fromHasIp = fromIfc?.ip || from.type === 'switch' || from.type === 'dmz-switch' || from.type === 'cloud';
    const toHasIp = toIfc?.ip || to.type === 'switch' || to.type === 'dmz-switch' || to.type === 'cloud';
    if (fromHasIp && toHasIp) cableStatus = ' tb-cable-healthy';
    else if (fromHasIp || toHasIp) cableStatus = ' tb-cable-partial';
    // Three-layer render: dark sheath (shadow), inner colored conductor,
    // and a fat transparent hitbox on top so clicks land easily even on a
    // thin curved path. Only the hitbox carries the click handler.
    return `<path class="tb-cable-sheath" d="${dAttr}" stroke="#0b1020" stroke-width="${meta.width + 5}" stroke-linecap="round" fill="none" opacity="0.7" pointer-events="none" />
<path class="tb-cable tb-cable-${cableType}${selected}${cableStatus}" d="${dAttr}" stroke="${meta.color}" stroke-width="${meta.width}" stroke-linecap="round" fill="none"${dashAttr} pointer-events="none" />
<path class="tb-cable-hit" data-tb-cable="${c.id}" d="${dAttr}" stroke="transparent" stroke-width="20" stroke-linecap="round" fill="none" />`;
  }).join('');

  // Devices
  devLayer.innerHTML = tbState.devices.map(d => {
    const meta = TB_DEVICE_TYPES[d.type];
    if (!meta) return '';
    const selected = tbSelectedId === d.id ? ' tb-device-selected' : '';
    const pending = tbPendingCableFrom === d.id ? ' tb-device-pending' : '';
    const labTarget = (tbActiveLab?._highlightIds?.includes(d.id)) ? ' tb-device-lab-target' : '';
    // Device health badge — shows config status
    const isEndpoint = ['pc','server','printer','voip','iot'].includes(d.type);
    const isRoutable = ['router','firewall','isp-router'].includes(d.type);
    const isSwitch = d.type === 'switch' || d.type === 'dmz-switch';
    const hasCable = tbState.cables.some(c => c.from === d.id || c.to === d.id);
    const hasIp = d.interfaces?.some(i => i.ip);
    const hasGw = d.interfaces?.some(i => i.gateway);
    let healthColor = '';
    if (hasCable && ((isEndpoint && hasIp && hasGw) || (isRoutable && hasIp) || (isSwitch && hasCable) || (!isEndpoint && !isRoutable && !isSwitch))) healthColor = '#22c55e';
    else if (hasCable && (hasIp || isSwitch)) healthColor = '#f59e0b';
    else if (hasCable) healthColor = '#ef4444';
    const healthBadge = healthColor ? `<circle cx="40" cy="-28" r="5" fill="${healthColor}" stroke="#0f172a" stroke-width="1.5" class="tb-health-badge"/>` : '';
    return `
      <g class="tb-device${selected}${pending}${labTarget}" data-tb-device="${d.id}" transform="translate(${d.x}, ${d.y})">
        <rect class="tb-device-bg" x="-48" y="-36" width="96" height="72" rx="10" ry="10"
              fill="${meta.color}" fill-opacity="0.18" stroke="${meta.color}" stroke-width="2"/>
        <g transform="scale(0.72) translate(0, 4)">${tbDeviceIcon(d.type, meta.color)}</g>
        <text class="tb-device-label" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#e2e8f0">${escHtml(d.hostname || meta.label)}</text>
        ${healthBadge}
      </g>
    `;
  }).join('');

  // Empty hint visibility
  if (emptyHint) emptyHint.classList.toggle('is-hidden', tbState.devices.length > 0);
  // Keep the wiring overlay in sync with pending state every render.
  tbUpdateWireOverlay();

  // Attach per-device click/drag handlers (inline for simplicity)
  devLayer.querySelectorAll('.tb-device').forEach(g => {
    const id = g.getAttribute('data-tb-device');
    g.addEventListener('mousedown', (e) => tbOnDeviceMouseDown(e, id));
    g.addEventListener('click', (e) => { e.stopPropagation(); });
  });
  // Click handlers bind to the fat transparent hitbox, not the visible
  // colored conductor, so thin stroke paths are easy to target.
  cabLayer.querySelectorAll('.tb-cable-hit').forEach(hit => {
    const id = hit.getAttribute('data-tb-cable');
    hit.style.cursor = 'pointer';
    hit.addEventListener('click', (e) => {
      e.stopPropagation();
      tbSelectedId = id;
      tbRenderCanvas();
      tbUpdateStatus('Cable selected. Press Del/Backspace to remove.');
    });
  });
  // Double-click detection is handled inside tbOnDeviceMouseDown (timestamp-based)
}

// ── Canvas mouse/drop/click handlers ──
let tbCanvasHandlersAttached = false;
function tbAttachCanvasHandlers() {
  if (tbCanvasHandlersAttached) return;
  tbCanvasHandlersAttached = true;
  const svg = document.getElementById('tb-canvas');
  const wrap = document.querySelector('.tb-canvas-wrap');
  if (!svg || !wrap) return;

  // HTML5 drop from palette
  wrap.addEventListener('dragover', (e) => {
    if (tbPaletteDrag) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
  });
  wrap.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!tbPaletteDrag) return;
    const { x, y } = tbClientToSvg(svg, e.clientX, e.clientY);
    tbAddDevice(tbPaletteDrag.type, x, y);
    tbPaletteDrag = null;
  });

  // Click empty canvas → deselect
  svg.addEventListener('click', (e) => {
    if (e.target.tagName === 'rect' || e.target.tagName === 'svg') {
      tbSelectedId = null;
      tbPendingCableFrom = null;
      tbRenderCanvas();
      tbUpdateStatus('Drag a device from the palette \u2192');
    }
  });

  // Window-level mousemove/up for dragging placed devices
  window.addEventListener('mousemove', tbOnMouseMove);
  window.addEventListener('mouseup', tbOnMouseUp);
}

function tbClientToSvg(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const { x, y } = pt.matrixTransform(ctm.inverse());
  return { x: Math.max(75, Math.min(TB_CANVAS_W - 75, x)), y: Math.max(60, Math.min(TB_CANVAS_H - 60, y)) };
}

function tbAddDevice(type, x, y) {
  if (tbState.devices.length >= TB_MAX_DEVICES) {
    showErrorToast(`Device cap reached (${TB_MAX_DEVICES}). Delete one to add more.`);
    return;
  }
  const id = 'd_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const hostname = tbAutoHostname(type, tbState.devices);
  const interfaces = tbGenerateInterfaces(type, id);
  const vlanDb = type.indexOf('switch') >= 0 ? [{ id: 1, name: 'default' }] : [];
  tbState.devices.push({
    id, type, x: Math.round(x), y: Math.round(y),
    hostname,
    interfaces,
    routingTable: [],
    arpTable: [],
    macTable: [],
    vlanDb,
    dhcpServer: null,
    dhcpRelay: null,
    acls: [],
  });
  tbState.updated = Date.now();
  tbRenderCanvas();
  tbUpdateDeviceCount();
  tbSaveDraft();
}

let tbLastClickDevId = null;
let tbLastClickTime = 0;

function tbOnDeviceMouseDown(e, id) {
  e.stopPropagation();
  // Detect double-click manually (native dblclick is unreliable because
  // tbRenderCanvas destroys + recreates DOM nodes between clicks)
  const now = Date.now();
  if (tbLastClickDevId === id && now - tbLastClickTime < 400) {
    tbLastClickDevId = null;
    tbLastClickTime = 0;
    tbDragging = null;
    tbOpenConfigPanel(id);
    return;
  }
  tbLastClickDevId = id;
  tbLastClickTime = now;

  const dev = tbState.devices.find(d => d.id === id);
  if (!dev) return;

  // Cable wiring flow: first click sets pending, second click completes
  if (tbPendingCableFrom && tbPendingCableFrom !== id) {
    tbAddCable(tbPendingCableFrom, id);
    tbPendingCableFrom = null;
    tbSelectedId = null;
    tbRenderCanvas();
    return;
  }

  // Otherwise: start drag (on mousedown) + queue potential "start cable" on click
  const svg = document.getElementById('tb-canvas');
  const { x: sx, y: sy } = tbClientToSvg(svg, e.clientX, e.clientY);
  tbDragging = { id, offsetX: sx - dev.x, offsetY: sy - dev.y, moved: false, startX: dev.x, startY: dev.y };
  tbSelectedId = id;
  tbRenderCanvas();
}

function tbOnMouseMove(e) {
  if (!tbDragging) return;
  const svg = document.getElementById('tb-canvas');
  if (!svg) return;
  const { x, y } = tbClientToSvg(svg, e.clientX, e.clientY);
  const dev = tbState.devices.find(d => d.id === tbDragging.id);
  if (!dev) return;
  const nx = Math.round(x - tbDragging.offsetX);
  const ny = Math.round(y - tbDragging.offsetY);
  if (Math.abs(nx - tbDragging.startX) > 3 || Math.abs(ny - tbDragging.startY) > 3) tbDragging.moved = true;
  dev.x = Math.max(55, Math.min(TB_CANVAS_W - 55, nx));
  dev.y = Math.max(45, Math.min(TB_CANVAS_H - 45, ny));
  tbRenderCanvas();
}

function tbOnMouseUp(e) {
  if (!tbDragging) return;
  const { id, moved } = tbDragging;
  tbDragging = null;
  if (moved) {
    tbState.updated = Date.now();
    tbSaveDraft();
    tbUpdateStatus('Moved. Click another device to wire a cable.');
  } else {
    // Treat as a click → start cable wiring from this device
    if (tbPendingCableFrom === id) {
      tbPendingCableFrom = null;
      tbUpdateStatus('Cable cancelled.');
    } else {
      tbPendingCableFrom = id;
      tbUpdateStatus('Click a second device to draw the cable, or click again to cancel.');
    }
    tbRenderCanvas();
  }
}

function tbAddCable(fromId, toId) {
  // Prevent self-loops and duplicates
  if (fromId === toId) return;
  const dup = tbState.cables.find(c =>
    (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId));
  if (dup) {
    showErrorToast('Those devices are already cabled.');
    return;
  }
  // Find available interfaces on each device
  const fromDev = tbState.devices.find(d => d.id === fromId);
  const toDev = tbState.devices.find(d => d.id === toId);
  const fromIface = fromDev && fromDev.interfaces ? fromDev.interfaces.find(ifc => !ifc.cableId) : null;
  const toIface = toDev && toDev.interfaces ? toDev.interfaces.find(ifc => !ifc.cableId) : null;
  if (fromDev && fromDev.interfaces && !fromIface) {
    showErrorToast(`${fromDev.hostname || TB_DEVICE_TYPES[fromDev.type].label} has no free ports.`);
    return;
  }
  if (toDev && toDev.interfaces && !toIface) {
    showErrorToast(`${toDev.hostname || TB_DEVICE_TYPES[toDev.type].label} has no free ports.`);
    return;
  }
  const id = 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const cableType = tbSelectedCableType || 'cat6';
  if (fromIface) fromIface.cableId = id;
  if (toIface) toIface.cableId = id;
  tbState.cables.push({
    id, from: fromId, to: toId, type: cableType,
    fromIface: fromIface ? fromIface.name : null,
    toIface: toIface ? toIface.name : null,
  });
  tbState.updated = Date.now();
  const label = (TB_CABLE_TYPES[cableType] || {}).label || 'Cat6';
  tbUpdateStatus(`${label} cable drawn (${fromIface ? fromIface.name : '?'} → ${toIface ? toIface.name : '?'}). Keep building.`);
  tbSaveDraft();
}

// ── Keyboard: Delete / Backspace / Escape ──
let tbKeyHandlerAttached = false;
function tbAttachKeyHandler() {
  if (tbKeyHandlerAttached) return;
  tbKeyHandlerAttached = true;
  window.addEventListener('keydown', (e) => {
    const page = document.getElementById('page-topology-builder');
    if (!page || !page.classList.contains('active')) return;
    // Don't hijack if user is typing in an input
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (tbSelectedId) { e.preventDefault(); tbDeleteSelected(); }
    } else if (e.key === 'Escape') {
      tbSelectedId = null;
      tbPendingCableFrom = null;
      tbRenderCanvas();
      tbUpdateStatus('Cancelled.');
    }
  });
}

// Release interface bindings when a cable is removed.
function tbUnbindCable(cable) {
  if (!cable) return;
  [cable.from, cable.to].forEach(devId => {
    const dev = tbState.devices.find(d => d.id === devId);
    if (dev && dev.interfaces) {
      dev.interfaces.forEach(ifc => { if (ifc.cableId === cable.id) ifc.cableId = null; });
    }
  });
}

function tbDeleteSelected() {
  if (!tbSelectedId) {
    tbUpdateStatus('Nothing selected.');
    return;
  }
  // Device?
  const devIdx = tbState.devices.findIndex(d => d.id === tbSelectedId);
  if (devIdx >= 0) {
    const id = tbSelectedId;
    // Unbind interfaces on connected devices before removing cables
    tbState.cables.filter(c => c.from === id || c.to === id).forEach(c => tbUnbindCable(c));
    tbState.devices.splice(devIdx, 1);
    tbState.cables = tbState.cables.filter(c => c.from !== id && c.to !== id);
    tbSelectedId = null;
    tbState.updated = Date.now();
    tbRenderCanvas();
    tbUpdateDeviceCount();
    tbSaveDraft();
    tbUpdateStatus('Device removed.');
    return;
  }
  // Cable?
  const cabIdx = tbState.cables.findIndex(c => c.id === tbSelectedId);
  if (cabIdx >= 0) {
    tbUnbindCable(tbState.cables[cabIdx]);
    tbState.cables.splice(cabIdx, 1);
    tbSelectedId = null;
    tbState.updated = Date.now();
    tbRenderCanvas();
    tbSaveDraft();
    tbUpdateStatus('Cable removed.');
  }
}

// ── Save / load / draft ──
function tbLoadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE.TOPOLOGY_DRAFT);
    return raw ? tbMigrateState(JSON.parse(raw)) : null;
  } catch (_) { return null; }
}
function tbSaveDraft() {
  try { localStorage.setItem(STORAGE.TOPOLOGY_DRAFT, JSON.stringify(tbState)); } catch (_) {}
  // Live lab step validation — re-evaluate the current step every time state changes
  if (tbActiveLab) tbRenderLabStep();
}
function tbLoadAllSaves() {
  try {
    const raw = localStorage.getItem(STORAGE.TOPOLOGIES);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}
function tbPersistAllSaves(list) {
  try { localStorage.setItem(STORAGE.TOPOLOGIES, JSON.stringify(list)); } catch (_) {}
}

function tbSaveTopology() {
  if (tbState.devices.length === 0) {
    showErrorToast('Add at least one device before saving.');
    return;
  }
  const name = prompt('Name this topology:', tbState.name === 'Untitled' ? '' : tbState.name);
  if (name === null) return;
  tbState.name = name.trim() || 'Untitled';
  tbState.updated = Date.now();
  let saves = tbLoadAllSaves();
  // Upsert by id
  const existing = saves.findIndex(s => s.id === tbState.id);
  if (existing >= 0) {
    saves[existing] = { ...tbState };
  } else {
    saves.push({ ...tbState });
    // FIFO evict oldest if over cap
    if (saves.length > TB_MAX_SAVES) {
      saves.sort((a, b) => (a.updated || 0) - (b.updated || 0));
      saves = saves.slice(-TB_MAX_SAVES);
    }
  }
  tbPersistAllSaves(saves);
  tbRefreshLoadSelect();
  tbUpdateStatus(`Saved \u201C${tbState.name}\u201D`);
}

function tbRefreshLoadSelect() {
  const sel = document.getElementById('tb-load-select');
  if (!sel) return;
  const saves = tbLoadAllSaves();
  sel.innerHTML = '<option value="">\u{1F4C2} Load\u2026</option>' +
    saves.map(s => `<option value="${s.id}">${escHtml(s.name)} (${s.devices.length}d)</option>`).join('');
}

function tbLoadTopology(id) {
  if (!id) return;
  const saves = tbLoadAllSaves();
  const found = saves.find(s => s.id === id);
  if (!found) return;
  tbState = tbMigrateState(JSON.parse(JSON.stringify(found)));
  tbSelectedId = null;
  tbPendingCableFrom = null;
  tbSaveDraft();
  tbRenderCanvas();
  tbUpdateDeviceCount();
  tbUpdateStatus(`Loaded \u201C${tbState.name}\u201D`);
  // Reset select so the same item can be reloaded
  const sel = document.getElementById('tb-load-select');
  if (sel) sel.value = '';
}

function tbNewTopology() {
  if (tbState.devices.length > 0) {
    if (!confirm('Discard the current topology and start fresh?')) return;
  }
  tbState = tbNewState();
  tbSelectedId = null;
  tbPendingCableFrom = null;
  tbSaveDraft();
  tbRenderCanvas();
  tbUpdateDeviceCount();
  tbUpdateStatus('New topology. Drag a device from the palette \u2192');
}

// Clear wipes devices + cables from the CURRENT topology but keeps its
// id/name, unlike tbNewTopology which creates a fresh topology entirely.
function tbClearCanvas() {
  if (tbState.devices.length === 0 && tbState.cables.length === 0) {
    tbUpdateStatus('Canvas is already empty.');
    return;
  }
  if (!confirm('Clear all devices and cables from this topology? The name will be kept.')) return;
  tbState.devices = [];
  tbState.cables = [];
  tbState.updated = Date.now();
  tbSelectedId = null;
  tbPendingCableFrom = null;
  tbSaveDraft();
  tbRenderCanvas();
  tbUpdateDeviceCount();
  tbUpdateStatus('Canvas cleared. Drag a device to start again.');
}

// ── Status / counter helpers ──
function tbUpdateStatus(msg) {
  const el = document.getElementById('tb-status');
  if (el) el.textContent = msg;
  tbUpdateWireOverlay();
}
function tbUpdateDeviceCount() {
  const el = document.getElementById('tb-device-count');
  if (el) el.textContent = `${tbState.devices.length} / ${TB_MAX_DEVICES} devices`;
}
// Show/hide the big floating "Wiring..." banner based on tbPendingCableFrom.
function tbUpdateWireOverlay() {
  const el = document.getElementById('tb-wire-overlay');
  if (!el) return;
  el.classList.toggle('is-hidden', !tbPendingCableFrom);
}

// ══════════════════════════════════════════
// TOPOLOGY BUILDER TIER 2 — Auto-Grader + Scenarios + PNG Export
// ══════════════════════════════════════════

// ── Graph helpers used by the rules engine ──
function tbNeighborsOf(state, deviceId) {
  return state.cables
    .filter(c => c.from === deviceId || c.to === deviceId)
    .map(c => state.devices.find(d => d.id === (c.from === deviceId ? c.to : c.from)))
    .filter(Boolean);
}
function tbHasType(state, type) { return state.devices.some(d => d.type === type); }
function tbDevicesOfType(state, type) { return state.devices.filter(d => d.type === type); }
function tbIsConnectedTo(state, deviceId, type) {
  return tbNeighborsOf(state, deviceId).some(d => d.type === type);
}
function tbIsPublicType(type) { return type && type.indexOf('public-') === 0; }

// ── Rules engine ──
// severity: 'critical' (-20), 'warning' (-10), 'info' (-5)
// test(state) must return true if the rule passes.
const TB_GRADE_RULES = [
  {
    id: 'min-devices',
    severity: 'info',
    label: 'At least 3 devices placed',
    hint: 'A useful study topology has at least a handful of devices to reason about.',
    test: s => s.devices.length >= 3,
  },
  {
    id: 'no-orphans',
    severity: 'warning',
    label: 'No orphan devices (every device wired to something)',
    hint: 'Every placed device should be connected to at least one cable — orphan devices look like mistakes.',
    test: s => s.devices.every(d => tbNeighborsOf(s, d.id).length > 0),
  },
  {
    id: 'has-firewall',
    severity: 'critical',
    label: 'At least one firewall present',
    hint: 'A defensible network design needs a firewall to enforce trust boundaries.',
    test: s => tbHasType(s, 'firewall'),
  },
  {
    id: 'cloud-behind-firewall',
    severity: 'critical',
    label: 'Internet/cloud node wired directly to a firewall',
    hint: 'The WAN/cloud must connect through a firewall — never directly to a switch or endpoint.',
    test: s => {
      const clouds = tbDevicesOfType(s, 'cloud');
      if (!clouds.length) return true;
      return clouds.every(c => tbIsConnectedTo(s, c.id, 'firewall'));
    },
  },
  {
    id: 'dmz-exists-if-public',
    severity: 'critical',
    label: 'DMZ switch present when public servers exist',
    hint: 'Public-facing services need a DMZ switch of their own — a regular internal switch is not isolation.',
    test: s => {
      const hasPublics = s.devices.some(d => tbIsPublicType(d.type));
      return !hasPublics || tbHasType(s, 'dmz-switch');
    },
  },
  {
    id: 'public-on-dmz',
    severity: 'critical',
    label: 'Public servers sit on a DMZ switch (not an internal switch)',
    hint: 'Wire public-web/file/cloud servers to a dmz-switch, not a regular switch, to keep them in the screened subnet.',
    test: s => {
      const publics = s.devices.filter(d => tbIsPublicType(d.type));
      if (!publics.length) return true;
      return publics.every(p => {
        const neighbors = tbNeighborsOf(s, p.id);
        if (!neighbors.length) return false;
        const onDmz = neighbors.some(n => n.type === 'dmz-switch');
        const onRegularSwitch = neighbors.some(n => n.type === 'switch');
        return onDmz && !onRegularSwitch;
      });
    },
  },
  {
    id: 'dmz-behind-firewall',
    severity: 'critical',
    label: 'DMZ switch wired to a firewall',
    hint: 'The DMZ must sit behind a firewall so inbound traffic can be inspected before reaching public servers.',
    test: s => {
      const dmzs = tbDevicesOfType(s, 'dmz-switch');
      if (!dmzs.length) return true;
      return dmzs.every(d => tbIsConnectedTo(s, d.id, 'firewall'));
    },
  },
  {
    id: 'internal-behind-firewall',
    severity: 'warning',
    label: 'Internal switch reaches the WAN through a firewall or router',
    hint: 'Your internal LAN should never wire straight to the cloud — put a firewall or router in the path.',
    test: s => {
      const sws = tbDevicesOfType(s, 'switch');
      if (!sws.length) return true;
      return sws.every(sw => tbIsConnectedTo(s, sw.id, 'firewall') || tbIsConnectedTo(s, sw.id, 'router'));
    },
  },
  {
    id: 'wlc-wired-to-wap',
    severity: 'warning',
    label: 'WLC has line-of-sight to at least one WAP',
    hint: 'A wireless LAN controller is only useful if it can reach the APs it manages (directly or via a switch).',
    test: s => {
      const wlcs = tbDevicesOfType(s, 'wlc');
      if (!wlcs.length) return true;
      return wlcs.every(w => {
        if (tbIsConnectedTo(s, w.id, 'wap')) return true;
        // 2-hop: WLC → switch → WAP
        const neighbors = tbNeighborsOf(s, w.id);
        return neighbors.some(n => tbNeighborsOf(s, n.id).some(nn => nn.type === 'wap'));
      });
    },
  },
  {
    id: 'lb-fronts-servers',
    severity: 'warning',
    label: 'Load balancer fronts at least 2 servers',
    hint: 'A load balancer with fewer than 2 backends has nothing to balance — add more servers or drop the LB.',
    test: s => {
      const lbs = tbDevicesOfType(s, 'load-balancer');
      if (!lbs.length) return true;
      return lbs.every(lb => {
        const neighbors = tbNeighborsOf(s, lb.id);
        const serverCount = neighbors.filter(n => n.type === 'server' || tbIsPublicType(n.type)).length;
        return serverCount >= 2;
      });
    },
  },
  {
    id: 'ids-positioned',
    severity: 'info',
    label: 'IDS/IPS positioned on a monitored path',
    hint: 'Park the IDS/IPS next to a firewall, router, or internal switch so it can see the traffic it is monitoring.',
    test: s => {
      const idss = tbDevicesOfType(s, 'ids');
      if (!idss.length) return true;
      return idss.every(i => {
        const neighbors = tbNeighborsOf(s, i.id);
        return neighbors.some(n => n.type === 'firewall' || n.type === 'switch' || n.type === 'router');
      });
    },
  },
  {
    id: 'endpoints-on-internal',
    severity: 'warning',
    label: 'Endpoints (PC, printer, VoIP, IoT) live on the internal LAN, not the DMZ',
    hint: 'User endpoints belong on the internal switch. Parking them on the DMZ switch exposes them to the internet.',
    test: s => {
      const endpoints = s.devices.filter(d => ['pc', 'printer', 'voip', 'iot'].indexOf(d.type) >= 0);
      return endpoints.every(e => {
        const neighbors = tbNeighborsOf(s, e.id);
        if (!neighbors.length) return true; // orphan rule catches this
        return !neighbors.some(n => n.type === 'dmz-switch');
      });
    },
  },
  // ── Cloud networking rules ──
  {
    id: 'igw-on-vpc',
    severity: 'critical',
    label: 'Internet Gateway must be connected to a VPC',
    hint: 'Wire the Internet Gateway directly to the VPC device it serves.',
    test: s => {
      const igws = s.devices.filter(d => d.type === 'igw');
      if (!igws.length) return true;
      return igws.every(igw => tbNeighborsOf(s, igw.id).some(n => n.type === 'vpc'));
    },
  },
  {
    id: 'nat-gw-needs-subnet',
    severity: 'warning',
    label: 'NAT Gateway should be connected to a Cloud Subnet',
    hint: 'Place the NAT Gateway in a public subnet so private subnets can reach the internet.',
    test: s => {
      const nats = s.devices.filter(d => d.type === 'nat-gw');
      if (!nats.length) return true;
      return nats.every(ng => tbNeighborsOf(s, ng.id).some(n => n.type === 'cloud-subnet'));
    },
  },
  {
    id: 'vpg-has-peer',
    severity: 'warning',
    label: 'VPN Gateway should be connected to an On-Prem DC',
    hint: 'Wire the VPN Gateway to an On-Prem Data Center to establish the IPSec tunnel.',
    test: s => {
      const vpgs = s.devices.filter(d => d.type === 'vpg');
      if (!vpgs.length) return true;
      return vpgs.every(v => tbNeighborsOf(s, v.id).some(n => n.type === 'onprem-dc'));
    },
  },
  {
    id: 'tgw-connects-vpcs',
    severity: 'info',
    label: 'Transit Gateway should connect 2+ VPCs',
    hint: 'The Transit Gateway is a hub — it should bridge multiple VPCs together.',
    test: s => {
      const tgws = s.devices.filter(d => d.type === 'tgw');
      if (!tgws.length) return true;
      return tgws.every(t => tbNeighborsOf(s, t.id).filter(n => n.type === 'vpc').length >= 2);
    },
  },
  {
    id: 'cloud-has-sg',
    severity: 'warning',
    label: 'Cloud instances should have Security Groups',
    hint: 'Add at least one Security Group to control inbound/outbound traffic at the instance level.',
    test: s => {
      const cloudInst = s.devices.filter(d => ['vpc','cloud-subnet','igw','nat-gw','tgw','vpg','sase-edge'].indexOf(d.type) >= 0);
      if (!cloudInst.length) return true;
      return cloudInst.some(d => d.securityGroups && d.securityGroups.length > 0);
    },
  },
  {
    id: 'subnet-has-nacl',
    severity: 'info',
    label: 'Cloud Subnets should have NACL rules',
    hint: 'Configure Network ACLs on subnets for stateless perimeter filtering.',
    test: s => {
      const subs = s.devices.filter(d => d.type === 'cloud-subnet');
      if (!subs.length) return true;
      return subs.every(d => d.nacls && d.nacls.length > 0);
    },
  },
  {
    id: 'bgp-has-neighbor',
    severity: 'warning',
    label: 'BGP routers should have at least one neighbor',
    hint: 'BGP needs at least one neighbor configured to exchange routes. Add a neighbor IP and remote AS.',
    test: s => {
      const bgpRouters = s.devices.filter(d => d.bgpConfig?.enabled);
      if (!bgpRouters.length) return true;
      return bgpRouters.every(d => d.bgpConfig.neighbors.length > 0);
    },
  },
  {
    id: 'switch-has-snooping',
    severity: 'info',
    label: 'Switches should have DHCP Snooping enabled',
    hint: 'DHCP Snooping prevents rogue DHCP servers from poisoning clients.',
    test: s => {
      const switches = s.devices.filter(d => d.type.indexOf('switch') >= 0);
      if (!switches.length) return true;
      return switches.some(d => d.dhcpSnooping?.enabled);
    },
  },
  {
    id: 'dnssec-on-dns',
    severity: 'info',
    label: 'DNS servers should have DNSSEC enabled',
    hint: 'DNSSEC validates DNS responses with digital signatures, preventing cache poisoning.',
    test: s => {
      const dnsDevs = s.devices.filter(d => d.type === 'dns-server');
      if (!dnsDevs.length) return true;
      return dnsDevs.some(d => d.dnssecEnabled);
    },
  },
];

const TB_ALL_RULE_IDS = TB_GRADE_RULES.map(r => r.id);

// ── Scenario catalog ──
// `ruleIds` picks which rules apply (free build = all).
// `requires` adds per-device-count hard requirements (also counted as critical failures).
// `type: 'public-*'` matches any public-web/file/cloud.
const TB_SCENARIOS = [
  {
    id: 'free',
    title: 'Free Build',
    description: 'Design anything you like. The grader applies every baseline design rule.',
    requirements: [
      'Place any devices from the palette and wire them',
      'All general design rules apply (firewall, DMZ, placement, etc.)',
    ],
    ruleIds: TB_ALL_RULE_IDS,
    requires: [],
  },
  {
    id: 'small-office',
    title: 'Small Office',
    description: 'A small business with internet access, a firewall, and a handful of PCs + a printer on the internal LAN.',
    requirements: [
      'Cloud/WAN → Firewall → Internal switch',
      'At least 2 PCs on the internal switch',
      'At least 1 printer on the internal switch',
      'No public servers required',
    ],
    ruleIds: ['min-devices', 'no-orphans', 'has-firewall', 'cloud-behind-firewall', 'internal-behind-firewall', 'endpoints-on-internal'],
    requires: [
      { type: 'cloud',    min: 1 },
      { type: 'firewall', min: 1 },
      { type: 'switch',   min: 1 },
      { type: 'pc',       min: 2 },
      { type: 'printer',  min: 1 },
    ],
  },
  {
    id: 'dmz',
    title: 'DMZ / Screened Subnet',
    description: 'A network with public-facing servers segregated from the internal LAN by a DMZ switch.',
    requirements: [
      'Cloud/WAN → Firewall → DMZ switch with public servers',
      'DMZ switch → Firewall → Internal switch (screened subnet)',
      'At least one public-web, public-file, or public-cloud server',
      'Internal endpoints live only on the internal switch',
    ],
    ruleIds: ['min-devices', 'no-orphans', 'has-firewall', 'cloud-behind-firewall', 'dmz-exists-if-public', 'public-on-dmz', 'dmz-behind-firewall', 'internal-behind-firewall', 'endpoints-on-internal'],
    requires: [
      { type: 'cloud',      min: 1 },
      { type: 'firewall',   min: 1 },
      { type: 'dmz-switch', min: 1 },
      { type: 'switch',     min: 1 },
      { type: 'public-*',   min: 1 },
    ],
  },
  {
    id: 'enterprise',
    title: 'Enterprise w/ IDS + Load Balancer',
    description: 'Enterprise-grade screened subnet with IDS/IPS monitoring and a load balancer fronting multiple servers.',
    requirements: [
      'Everything from the DMZ scenario',
      'IDS/IPS positioned next to a firewall, switch, or router',
      'Load balancer fronting at least 2 servers',
    ],
    ruleIds: TB_ALL_RULE_IDS,
    requires: [
      { type: 'cloud',         min: 1 },
      { type: 'firewall',      min: 2 },
      { type: 'dmz-switch',    min: 1 },
      { type: 'switch',        min: 1 },
      { type: 'ids',           min: 1 },
      { type: 'load-balancer', min: 1 },
      { type: 'server',        min: 2 },
    ],
  },
  {
    id: 'branch-wireless',
    title: 'Branch Office w/ Wireless',
    description: 'A branch office dominated by wireless — WLC managing multiple WAPs for laptop users.',
    requirements: [
      'Cloud/WAN → Firewall → Internal switch',
      'WLC connected to the switch, managing at least 2 WAPs',
      'At least 2 PCs on the network',
    ],
    ruleIds: ['min-devices', 'no-orphans', 'has-firewall', 'cloud-behind-firewall', 'internal-behind-firewall', 'wlc-wired-to-wap', 'endpoints-on-internal'],
    requires: [
      { type: 'cloud',    min: 1 },
      { type: 'firewall', min: 1 },
      { type: 'switch',   min: 1 },
      { type: 'wlc',      min: 1 },
      { type: 'wap',      min: 2 },
      { type: 'pc',       min: 2 },
    ],
  },
  // ── Cloud Networking Scenarios ──
  {
    id: 'cloud-vpc',
    title: 'Cloud VPC Architecture',
    description: 'Design a cloud VPC with public and private subnets, internet gateway, NAT gateway, and security controls.',
    requirements: [
      'VPC with Internet Gateway for public access',
      'NAT Gateway in public subnet for private outbound',
      'Security groups on cloud resources',
      'At least 2 cloud subnets (public + private)',
    ],
    ruleIds: ['min-devices', 'no-orphans', 'igw-on-vpc', 'nat-gw-needs-subnet', 'cloud-has-sg', 'subnet-has-nacl'],
    requires: [
      { type: 'vpc',          min: 1 },
      { type: 'cloud-subnet', min: 2 },
      { type: 'igw',          min: 1 },
      { type: 'nat-gw',       min: 1 },
    ],
  },
  {
    id: 'hybrid-cloud',
    title: 'Hybrid Cloud (VPN)',
    description: 'Connect an on-premises data center to a cloud VPC via IPSec VPN tunnel with matching crypto parameters.',
    requirements: [
      'On-premises DC with internal network',
      'Cloud VPC with VPN Gateway',
      'IPSec tunnel between VPN GW and On-Prem DC',
      'Matching crypto parameters on both endpoints',
    ],
    ruleIds: ['min-devices', 'no-orphans', 'vpg-has-peer', 'igw-on-vpc'],
    requires: [
      { type: 'vpc',       min: 1 },
      { type: 'vpg',       min: 1 },
      { type: 'onprem-dc', min: 1 },
    ],
  },
  {
    id: 'multi-vpc',
    title: 'Multi-VPC with Transit Gateway',
    description: 'Connect multiple VPCs through a Transit Gateway hub — the cloud equivalent of a backbone router.',
    requirements: [
      'Transit Gateway connecting 2+ VPCs',
      'Each VPC has at least one subnet',
      'Internet Gateway on at least one VPC',
    ],
    ruleIds: ['min-devices', 'no-orphans', 'tgw-connects-vpcs', 'igw-on-vpc', 'cloud-has-sg'],
    requires: [
      { type: 'vpc', min: 2 },
      { type: 'tgw', min: 1 },
      { type: 'cloud-subnet', min: 2 },
      { type: 'igw', min: 1 },
    ],
  },
  {
    id: 'sase-arch',
    title: 'SASE Architecture',
    description: 'Design a Secure Access Service Edge with zero trust, SWG, CASB, and FWaaS protecting cloud and on-prem resources.',
    requirements: [
      'SASE Edge node with ZTNA configured',
      'Cloud VPC with resources behind SASE',
      'On-Prem DC connected via VPN or SASE',
    ],
    ruleIds: ['min-devices', 'no-orphans', 'cloud-has-sg'],
    requires: [
      { type: 'sase-edge', min: 1 },
      { type: 'vpc',       min: 1 },
    ],
  },
];

let tbSelectedScenario = 'free';

function tbSetScenario(id) {
  const scen = TB_SCENARIOS.find(s => s.id === id);
  if (!scen) return;
  tbSelectedScenario = id;
  tbRenderScenarioPanel();
  tbUpdateStatus(`Scenario: ${scen.title}`);
}

function tbRenderScenarioPanel() {
  const el = document.getElementById('tb-scenario-panel');
  if (!el) return;
  const scen = TB_SCENARIOS.find(s => s.id === tbSelectedScenario);
  if (!scen || scen.id === 'free') {
    el.classList.add('is-hidden');
    el.innerHTML = '';
    return;
  }
  el.classList.remove('is-hidden');
  el.innerHTML = `
    <div class="tb-scenario-head">
      <div class="tb-scenario-title">\u{1F3AF} ${escHtml(scen.title)}</div>
      <div class="tb-scenario-desc">${escHtml(scen.description)}</div>
    </div>
    <ul class="tb-scenario-reqs">
      ${scen.requirements.map(r => `<li>${escHtml(r)}</li>`).join('')}
    </ul>
  `;
}

// ── Grader entry point ──
function tbGradeTopology() {
  if (tbState.devices.length === 0) {
    showErrorToast('Add some devices before grading.');
    return;
  }
  const scen = TB_SCENARIOS.find(s => s.id === tbSelectedScenario) || TB_SCENARIOS[0];
  const rules = TB_GRADE_RULES.filter(r => scen.ruleIds.indexOf(r.id) >= 0);
  const results = rules.map(rule => ({
    id: rule.id,
    passed: !!rule.test(tbState),
    severity: rule.severity,
    label: rule.label,
    hint: rule.hint,
  }));
  // Scenario device-count requirements → synthetic critical rules
  const requireResults = (scen.requires || []).map(req => {
    let count;
    let label;
    if (req.type === 'public-*') {
      count = tbState.devices.filter(d => tbIsPublicType(d.type)).length;
      label = 'Public server';
    } else {
      count = tbState.devices.filter(d => d.type === req.type).length;
      label = (TB_DEVICE_TYPES[req.type] && TB_DEVICE_TYPES[req.type].label) || req.type;
    }
    const plural = req.min > 1 ? 's' : '';
    return {
      id: `req-${req.type}`,
      passed: count >= req.min,
      severity: 'critical',
      label: `Scenario requires ${req.min}+ ${label}${plural} (you have ${count})`,
      hint: `This scenario cannot be satisfied without at least ${req.min} ${label}${plural}.`,
    };
  });
  const allResults = [...requireResults, ...results];
  const deductions = { critical: 20, warning: 10, info: 5 };
  let score = 100;
  allResults.filter(r => !r.passed).forEach(r => { score -= (deductions[r.severity] || 10); });
  score = Math.max(0, score);
  const grade = score >= 93 ? 'A' : score >= 87 ? 'A-' : score >= 80 ? 'B+' : score >= 73 ? 'B' : score >= 65 ? 'C+' : score >= 58 ? 'C' : score >= 50 ? 'D' : 'F';
  tbShowGradeModal({ score, grade, results: allResults, scenario: scen });
  tbUpdateStatus(`Graded: ${grade} (${score}/100)`);
}

function tbShowGradeModal({ score, grade, results, scenario }) {
  const modal = document.getElementById('tb-grade-modal');
  const body = document.getElementById('tb-grade-body');
  if (!modal || !body) return;
  const fails = results.filter(r => !r.passed);
  const passes = results.filter(r => r.passed);
  const critical = fails.filter(r => r.severity === 'critical');
  const warnings = fails.filter(r => r.severity === 'warning');
  const info = fails.filter(r => r.severity === 'info');
  const gradeColor = score >= 87 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444';
  const mkItem = r => `<div class="tb-grade-item"><div class="tb-grade-item-label">${escHtml(r.label)}</div><div class="tb-grade-item-hint">${escHtml(r.hint)}</div></div>`;
  const mkPass = r => `<div class="tb-grade-item tb-grade-item-pass">\u2713 ${escHtml(r.label)}</div>`;
  body.innerHTML = `
    <div class="tb-grade-hero">
      <div class="tb-grade-circle" style="border-color:${gradeColor};color:${gradeColor}">
        <div class="tb-grade-letter">${grade}</div>
        <div class="tb-grade-score">${score}/100</div>
      </div>
      <div class="tb-grade-summary">
        <div class="tb-grade-scenario">${escHtml(scenario.title)}</div>
        <div class="tb-grade-counts">
          <span class="tb-grade-count tb-grade-count-pass">\u2713 ${passes.length} passed</span>
          ${critical.length ? `<span class="tb-grade-count tb-grade-count-crit">\u2717 ${critical.length} critical</span>` : ''}
          ${warnings.length ? `<span class="tb-grade-count tb-grade-count-warn">\u26A0 ${warnings.length} warnings</span>` : ''}
          ${info.length ? `<span class="tb-grade-count tb-grade-count-info">\u2139 ${info.length} info</span>` : ''}
        </div>
      </div>
    </div>
    ${critical.length ? `<div class="tb-grade-section tb-grade-crit"><div class="tb-grade-section-title">\u2717 Critical issues</div>${critical.map(mkItem).join('')}</div>` : ''}
    ${warnings.length ? `<div class="tb-grade-section tb-grade-warn"><div class="tb-grade-section-title">\u26A0 Warnings</div>${warnings.map(mkItem).join('')}</div>` : ''}
    ${info.length ? `<div class="tb-grade-section tb-grade-info"><div class="tb-grade-section-title">\u2139 Suggestions</div>${info.map(mkItem).join('')}</div>` : ''}
    ${passes.length ? `<div class="tb-grade-section tb-grade-pass"><div class="tb-grade-section-title">\u2713 Passed</div>${passes.map(mkPass).join('')}</div>` : ''}
  `;
  modal.classList.remove('is-hidden');
}

function tbCloseGradeModal() {
  const modal = document.getElementById('tb-grade-modal');
  if (modal) modal.classList.add('is-hidden');
}

// ── PNG export ──
function tbExportPNG() {
  if (tbState.devices.length === 0) {
    showErrorToast('Nothing to export yet.');
    return;
  }
  const svg = document.getElementById('tb-canvas');
  if (!svg) return;
  const clone = svg.cloneNode(true);
  clone.setAttribute('width', TB_CANVAS_W);
  clone.setAttribute('height', TB_CANVAS_H);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // Dark background (grid is transparent)
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', '#0b1020');
  clone.insertBefore(bgRect, clone.firstChild);
  const xml = new XMLSerializer().serializeToString(clone);
  let svg64;
  try { svg64 = btoa(unescape(encodeURIComponent(xml))); }
  catch (_) { showErrorToast('Export failed (encoding).'); return; }
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = TB_CANVAS_W;
    canvas.height = TB_CANVAS_H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) { showErrorToast('Export failed.'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (tbState.name || 'topology').replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'topology';
      a.download = `${safeName}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      tbUpdateStatus(`Exported ${a.download}`);
    }, 'image/png');
  };
  img.onerror = () => showErrorToast('PNG export failed to rasterize.');
  img.src = `data:image/svg+xml;base64,${svg64}`;
}

// ══════════════════════════════════════════
// TOPOLOGY BUILDER TIER 3 — AI Coach
// ══════════════════════════════════════════

// Compact text description of the current topology for the LLM.
// Grouped by device type with per-device neighbor lists. Cable types are
// shown inline as "--type->" so the coach can comment on cabling choices.
function tbSerializeTopology(state) {
  if (!state.devices.length) return '(empty)';
  // Group devices by type and assign per-type index so each gets a stable label.
  const byType = {};
  state.devices.forEach(d => {
    if (!byType[d.type]) byType[d.type] = [];
    byType[d.type].push(d);
  });
  const labelFor = {};
  Object.keys(byType).forEach(type => {
    byType[type].forEach((d, i) => {
      const meta = TB_DEVICE_TYPES[type];
      const base = (meta && meta.label) || type;
      labelFor[d.id] = byType[type].length > 1 ? `${base} #${i + 1}` : base;
    });
  });
  // Inventory lines
  const inv = Object.keys(byType).map(type => {
    const meta = TB_DEVICE_TYPES[type];
    return `- ${(meta && meta.label) || type} × ${byType[type].length}`;
  }).join('\n');
  // Connection lines — for each device list its neighbors and the cable type
  const conn = state.devices.map(d => {
    const cables = state.cables.filter(c => c.from === d.id || c.to === d.id);
    if (!cables.length) return `- ${labelFor[d.id]} → (not connected)`;
    const nbrs = cables.map(c => {
      const otherId = c.from === d.id ? c.to : c.from;
      const other = state.devices.find(x => x.id === otherId);
      if (!other) return null;
      const ct = (TB_CABLE_TYPES[c.type] && TB_CABLE_TYPES[c.type].label) || 'Cat6';
      return `${labelFor[other.id]} (${ct})`;
    }).filter(Boolean);
    return `- ${labelFor[d.id]} → ${nbrs.join(', ')}`;
  }).join('\n');
  return `Topology: "${state.name || 'Untitled'}"\n${state.devices.length} devices, ${state.cables.length} cables\n\nINVENTORY:\n${inv}\n\nCONNECTIONS:\n${conn}`;
}

// Cheap hash so we can cache coach responses per topology + scenario.
function tbTopologyHash(state, scenarioId) {
  const payload = JSON.stringify({
    s: scenarioId,
    d: state.devices.map(d => ({ t: d.type, x: Math.round(d.x / 20), y: Math.round(d.y / 20) })),
    c: state.cables.map(c => ({ f: c.from, t: c.to, k: c.type || 'cat6' })).sort((a, b) => (a.f + a.t).localeCompare(b.f + b.t)),
  });
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = ((h << 5) - h) + payload.charCodeAt(i);
    h |= 0;
  }
  return 'coach_' + (h >>> 0).toString(36);
}

function tbLoadCoachCache() {
  try { return JSON.parse(localStorage.getItem(STORAGE.TB_COACH_CACHE) || '{}'); }
  catch (_) { return {}; }
}
function tbSaveCoachCache(cache) {
  // Keep only the 10 most recent entries to bound localStorage.
  const entries = Object.entries(cache).sort((a, b) => (b[1].t || 0) - (a[1].t || 0)).slice(0, 10);
  const trimmed = Object.fromEntries(entries);
  try { localStorage.setItem(STORAGE.TB_COACH_CACHE, JSON.stringify(trimmed)); } catch (_) {}
}

// Coach entry point. Fetches from cache or calls Claude Haiku.
async function tbCoachTopology() {
  if (tbState.devices.length === 0) {
    showErrorToast('Add some devices before asking the Coach.');
    return;
  }
  const key = (localStorage.getItem(STORAGE.KEY) || '').trim();
  if (!key) {
    showErrorToast('Add your Anthropic API key in Settings (gear icon) to use the Coach.');
    return;
  }
  const scen = TB_SCENARIOS.find(s => s.id === tbSelectedScenario) || TB_SCENARIOS[0];
  const hash = tbTopologyHash(tbState, scen.id);

  // Cache hit → show instantly
  const cache = tbLoadCoachCache();
  if (cache[hash] && cache[hash].payload) {
    tbShowCoachModal(cache[hash].payload, scen, /*cached=*/true);
    return;
  }

  // Show modal in loading state
  tbShowCoachModalLoading(scen);

  const serialized = tbSerializeTopology(tbState);
  const prompt = `You are a CompTIA Network+ (N10-009) instructor reviewing a student's network topology design. Be direct, specific, and tie observations to N10-009 exam objectives where relevant. The student picked this scenario:

Scenario: ${scen.title}
${scen.description}

Here is their topology:

${serialized}

Respond with ONLY a JSON object (no preamble, no markdown fences) with these keys:
{
  "tour": "A 2-3 sentence plain-English walkthrough of the design, as if narrating it to a student who can't see the canvas.",
  "strengths": ["2-4 things they got right, tied to N10-009 objectives when possible"],
  "concerns": ["2-4 design issues or questionable choices — things the static grader might miss"],
  "upgrades": ["2-3 concrete upgrade suggestions with rationale"],
  "objectives": ["2-4 N10-009 objectives this topology exercises, formatted as 'X.Y — Name'"],
  "studyTip": "1 sentence pointing them toward what to drill next based on this design."
}

Keep the total response under 500 words. Respond with ONLY the JSON object.`;

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      tbShowCoachModalError(`API returned ${res.status}. ${errText.slice(0, 160)}`);
      return;
    }
    const data = await res.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '';
    // Strip any markdown fences the model might wrap around JSON.
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    let payload;
    try {
      payload = JSON.parse(cleaned);
    } catch (e) {
      // Last-ditch: find the first {...} block.
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try { payload = JSON.parse(m[0]); } catch (_) {}
      }
    }
    if (!payload || !payload.tour) {
      tbShowCoachModalError('Coach returned an unexpected response. Try again.');
      return;
    }
    // Cache and render
    cache[hash] = { t: Date.now(), payload };
    tbSaveCoachCache(cache);
    tbShowCoachModal(payload, scen, /*cached=*/false);
  } catch (e) {
    tbShowCoachModalError(e && e.message ? e.message : 'Network error.');
  }
}

function tbShowCoachModalLoading(scenario) {
  const modal = document.getElementById('tb-coach-modal');
  const body = document.getElementById('tb-coach-body');
  if (!modal || !body) return;
  modal.classList.remove('is-hidden');
  body.innerHTML = `
    <div class="tb-coach-loading">
      <div class="tb-coach-spinner"></div>
      <div class="tb-coach-loading-text">
        <strong>Coach is analyzing your topology\u2026</strong>
        <div class="tb-coach-loading-sub">Scenario: ${escHtml(scenario.title)} &middot; usually takes 3\u20135 seconds</div>
      </div>
    </div>
  `;
}

function tbShowCoachModalError(msg) {
  const body = document.getElementById('tb-coach-body');
  if (!body) return;
  body.innerHTML = `
    <div class="tb-coach-error">
      <div class="tb-coach-error-title">\u26A0 Coach couldn't reach the API</div>
      <div class="tb-coach-error-msg">${escHtml(msg)}</div>
      <button type="button" class="btn btn-ghost" onclick="tbCoachTopology()" style="margin-top:12px">Retry</button>
    </div>
  `;
}

function tbShowCoachModal(payload, scenario, cached) {
  const modal = document.getElementById('tb-coach-modal');
  const body = document.getElementById('tb-coach-body');
  if (!modal || !body) return;
  modal.classList.remove('is-hidden');
  const list = arr => Array.isArray(arr) && arr.length
    ? `<ul class="tb-coach-list">${arr.map(x => `<li>${escHtml(String(x))}</li>`).join('')}</ul>`
    : '<div class="tb-coach-empty">(none)</div>';
  const cachedBadge = cached ? '<span class="tb-coach-cached">cached</span>' : '';
  body.innerHTML = `
    <div class="tb-coach-head">
      <div class="tb-coach-scenario">${escHtml(scenario.title)} ${cachedBadge}</div>
      <div class="tb-coach-tour">${escHtml(payload.tour || '')}</div>
    </div>

    <div class="tb-coach-section tb-coach-strengths">
      <div class="tb-coach-section-title">\u2713 Strengths</div>
      ${list(payload.strengths)}
    </div>

    <div class="tb-coach-section tb-coach-concerns">
      <div class="tb-coach-section-title">\u26A0 Concerns</div>
      ${list(payload.concerns)}
    </div>

    <div class="tb-coach-section tb-coach-upgrades">
      <div class="tb-coach-section-title">\u2191 Upgrade suggestions</div>
      ${list(payload.upgrades)}
    </div>

    <div class="tb-coach-section tb-coach-objectives">
      <div class="tb-coach-section-title">\u{1F4DA} N10-009 objectives exercised</div>
      ${list(payload.objectives)}
    </div>

    ${payload.studyTip ? `
      <div class="tb-coach-tip">
        <strong>\u{1F3AF} Study next:</strong> ${escHtml(payload.studyTip)}
      </div>
    ` : ''}
  `;
}

function tbCloseCoachModal() {
  const modal = document.getElementById('tb-coach-modal');
  if (modal) modal.classList.add('is-hidden');
}

// ══════════════════════════════════════════
// TOPOLOGY BUILDER — Config Panel, Simulation Engine, CLI
// ══════════════════════════════════════════

// ── Config Panel ──
let tbActiveConfigTab = 'overview';

function tbOpenConfigPanel(deviceId) {
  const dev = tbState.devices.find(d => d.id === deviceId);
  if (!dev) return;
  tbConfigPanelDeviceId = deviceId;
  tbCliHistory = []; // reset CLI on device switch
  const panel = document.getElementById('tb-config-panel');
  const title = document.getElementById('tb-config-title');
  if (!panel || !title) return;
  const meta = TB_DEVICE_TYPES[dev.type] || {};
  title.textContent = `${dev.hostname || meta.label} (${meta.label})`;
  panel.classList.remove('is-hidden');
  document.querySelector('.tb-workspace')?.classList.add('tb-config-open');
  // Show/hide tabs based on device type
  const isSwitch = dev.type.indexOf('switch') >= 0;
  const isRouter = dev.type === 'router' || dev.type === 'firewall' || dev.type === 'isp-router';
  const isServer = dev.type === 'server';
  const CLOUD_TYPES = ['vpc','cloud-subnet','igw','nat-gw','tgw','vpg','sase-edge'];
  const isCloudDevice = CLOUD_TYPES.indexOf(dev.type) >= 0;
  const isVpc = dev.type === 'vpc';
  const isSubnet = dev.type === 'cloud-subnet';
  const isVpnEndpoint = dev.type === 'vpg' || dev.type === 'onprem-dc';
  const isSase = dev.type === 'sase-edge';
  document.querySelectorAll('.tb-config-tab').forEach(t => {
    const tab = t.getAttribute('data-tb-tab');
    if (tab === 'routing') t.classList.toggle('is-hidden', !isRouter && !isVpnEndpoint);
    if (tab === 'vlans') t.classList.toggle('is-hidden', !isSwitch);
    if (tab === 'dhcp') t.classList.toggle('is-hidden', !isRouter && !isServer);
    if (tab === 'security-groups') t.classList.toggle('is-hidden', !isCloudDevice && dev.type !== 'server' && dev.type !== 'pc');
    if (tab === 'nacls') t.classList.toggle('is-hidden', !isSubnet);
    if (tab === 'vpc-config') t.classList.toggle('is-hidden', !isVpc);
    if (tab === 'vpn') t.classList.toggle('is-hidden', !isVpnEndpoint);
    if (tab === 'sase') t.classList.toggle('is-hidden', !isSase);
    if (tab === 'vxlan') t.classList.toggle('is-hidden', !isSwitch && !isRouter);
    if (tab === 'stp') t.classList.toggle('is-hidden', !isSwitch);
    if (tab === 'ospf') t.classList.toggle('is-hidden', !isRouter);
    if (tab === 'qos') t.classList.toggle('is-hidden', !isRouter && !isSwitch);
    if (tab === 'wireless') t.classList.toggle('is-hidden', dev.type !== 'wap' && dev.type !== 'wlc');
    if (tab === 'dns') t.classList.toggle('is-hidden', dev.type !== 'dns-server' && !isServer);
    if (tab === 'bgp') t.classList.toggle('is-hidden', !isRouter);
    if (tab === 'eigrp') t.classList.toggle('is-hidden', !isRouter);
    if (tab === 'attack') t.classList.toggle('is-hidden', !isSwitch && !isRouter);
  });
  tbSwitchConfigTab('overview');
  // Show sim toolbar
  document.getElementById('tb-sim-toolbar')?.classList.remove('is-hidden');
}

function tbCloseConfigPanel() {
  tbConfigPanelDeviceId = null;
  document.getElementById('tb-config-panel')?.classList.add('is-hidden');
  document.querySelector('.tb-workspace')?.classList.remove('tb-config-open');
}

function tbSwitchConfigTab(tab) {
  tbActiveConfigTab = tab;
  document.querySelectorAll('.tb-config-tab').forEach(t => {
    t.classList.toggle('tb-config-tab-active', t.getAttribute('data-tb-tab') === tab);
  });
  const body = document.getElementById('tb-config-body');
  if (!body) return;
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) { body.innerHTML = ''; return; }
  switch (tab) {
    case 'overview': body.innerHTML = tbRenderOverviewTab(dev); break;
    case 'ifaces': body.innerHTML = tbRenderIfacesTab(dev); break;
    case 'routing': body.innerHTML = tbRenderRoutingTab(dev); break;
    case 'vlans': body.innerHTML = tbRenderVlansTab(dev); break;
    case 'dhcp': body.innerHTML = tbRenderDhcpTab(dev); break;
    case 'cli': body.innerHTML = tbRenderCliTab(dev); break;
    case 'security-groups': body.innerHTML = tbRenderSecurityGroupsTab(dev); break;
    case 'nacls': body.innerHTML = tbRenderNaclsTab(dev); break;
    case 'vpc-config': body.innerHTML = tbRenderVpcConfigTab(dev); break;
    case 'vpn': body.innerHTML = tbRenderVpnTab(dev); break;
    case 'sase': body.innerHTML = tbRenderSaseTab(dev); break;
    case 'vxlan': body.innerHTML = tbRenderVxlanTab(dev); break;
    case 'stp': body.innerHTML = tbRenderStpTab(dev); break;
    case 'ospf': body.innerHTML = tbRenderOspfTab(dev); break;
    case 'qos': body.innerHTML = tbRenderQosTab(dev); break;
    case 'wireless': body.innerHTML = tbRenderWirelessTab(dev); break;
    case 'dns': body.innerHTML = tbRenderDnsTab(dev); break;
    case 'bgp': body.innerHTML = tbRenderBgpTab(dev); break;
    case 'eigrp': body.innerHTML = tbRenderEigrpTab(dev); break;
    case 'attack': body.innerHTML = tbRenderAttackTab(dev); break;
    default: body.innerHTML = '';
  }
}

// ── Overview Tab — visual device dashboard ──
function tbRenderOverviewTab(dev) {
  const meta = TB_DEVICE_TYPES[dev.type] || {};
  const upPorts = dev.interfaces.filter(i => i.enabled && i.cableId);
  const downPorts = dev.interfaces.filter(i => !i.enabled || !i.cableId);
  const hasIp = dev.interfaces.some(i => i.ip);
  const isSwitch = dev.type.indexOf('switch') >= 0;
  const isRouter = dev.type === 'router' || dev.type === 'firewall' || dev.type === 'isp-router';
  const isCloudDev = ['vpc','cloud-subnet','igw','nat-gw','tgw','vpg','sase-edge'].indexOf(dev.type) >= 0;

  // Build port status LEDs
  const portLeds = dev.interfaces.map(ifc => {
    const connected = ifc.cableId && ifc.enabled;
    const color = connected ? (ifc.ip ? '#22c55e' : '#facc15') : '#64748b';
    const tip = `${ifc.name}: ${connected ? (ifc.ip || 'no IP') : 'down'}`;
    return `<span class="tb-ov-led" style="background:${color}" title="${escHtml(tip)}"></span>`;
  }).join('');

  // Interface summary cards
  const ifaceCards = dev.interfaces.filter(i => i.cableId).map(ifc => {
    const cable = tbState.cables.find(c => c.id === ifc.cableId);
    const peerId = cable ? (cable.from === dev.id ? cable.to : cable.from) : null;
    const peer = peerId ? tbState.devices.find(d => d.id === peerId) : null;
    const cType = cable ? (TB_CABLE_TYPES[cable.type] || {}).label || 'Cat6' : '';
    const statusColor = ifc.enabled ? '#22c55e' : '#ef4444';
    const modeLabel = ifc.mode === 'trunk' ? 'TRUNK' : `Access VLAN ${ifc.vlan}`;
    return `<div class="tb-ov-iface-card">
      <div class="tb-ov-iface-head">
        <span class="tb-ov-iface-dot" style="background:${statusColor}"></span>
        <strong>${escHtml(ifc.name)}</strong>
        <span class="tb-ov-iface-mode">${modeLabel}</span>
      </div>
      <div class="tb-ov-iface-detail">
        ${ifc.ip ? `<span>IP: <code>${escHtml(ifc.ip)}/${tbMaskToCidr(ifc.mask)}</code></span>` : '<span style="color:#64748b">No IP</span>'}
        <span>MAC: <code>${ifc.mac || '?'}</code></span>
        ${peer ? `<span>&rarr; <strong>${escHtml(peer.hostname || '?')}</strong> (${cType})</span>` : ''}
        ${ifc.mode === 'trunk' ? `<span>Allowed: ${(ifc.trunkAllowed||[1]).join(',')}</span>` : ''}
      </div>
    </div>`;
  }).join('');

  // Quick stats
  const routeCount = dev.routingTable ? dev.routingTable.length : 0;
  const arpCount = dev.arpTable ? dev.arpTable.length : 0;
  const vlanCount = dev.vlanDb ? dev.vlanDb.length : 0;
  const dhcpStatus = dev.dhcpServer ? 'Enabled' : (dev.dhcpRelay ? 'Relay' : 'Off');

  // Build hostname edit and gateway for endpoints
  const isEndpoint = ['pc','printer','voip','iot','public-web','public-file','public-cloud'].indexOf(dev.type) >= 0;
  const gwInfo = isEndpoint && dev.interfaces[0]?.gateway ? `<div class="tb-ov-stat"><span>Gateway</span><code>${escHtml(dev.interfaces[0].gateway)}</code></div>` : '';

  return `<div class="tb-ov-hero">
    <div class="tb-ov-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="-28 -20 56 40">${tbDeviceIcon(dev.type, meta.color)}</svg></div>
    <div class="tb-ov-hero-info">
      <input type="text" class="tb-ov-hostname" value="${escHtml(dev.hostname||'')}" onchange="tbSetHostname(this.value)" placeholder="Hostname">
      <span class="tb-ov-type-badge" style="border-color:${meta.color};color:${meta.color}">${meta.label}</span>
    </div>
  </div>
  <div class="tb-ov-leds-row">${portLeds}<span style="color:#64748b;font-size:10px;margin-left:6px">${upPorts.length}/${dev.interfaces.length} ports up</span></div>
  <div class="tb-ov-stats-grid">
    <div class="tb-ov-stat"><span>Routes</span><strong>${routeCount}</strong></div>
    <div class="tb-ov-stat"><span>ARP</span><strong>${arpCount}</strong></div>
    ${isSwitch ? `<div class="tb-ov-stat"><span>VLANs</span><strong>${vlanCount}</strong></div>` : ''}
    ${isSwitch ? `<div class="tb-ov-stat"><span>MAC Table</span><strong>${dev.macTable ? dev.macTable.length : 0}</strong></div>` : ''}
    <div class="tb-ov-stat"><span>DHCP</span><strong>${dhcpStatus}</strong></div>
    ${gwInfo}
    ${dev.securityGroups?.length ? `<div class="tb-ov-stat"><span>SGs</span><strong>${dev.securityGroups.length}</strong></div>` : ''}
    ${dev.nacls?.length ? `<div class="tb-ov-stat"><span>NACLs</span><strong>${dev.nacls.length}</strong></div>` : ''}
    ${dev.vpnConfig ? `<div class="tb-ov-stat"><span>VPN</span><strong style="color:${dev.vpnConfig.tunnelStatus==='up'?'#22c55e':'#ef4444'}">${dev.vpnConfig.tunnelStatus.toUpperCase()}</strong></div>` : ''}
    ${dev.vpcConfig?.peerings?.length ? `<div class="tb-ov-stat"><span>Peerings</span><strong>${dev.vpcConfig.peerings.length}</strong></div>` : ''}
    ${dev.vxlanConfig?.length ? `<div class="tb-ov-stat"><span>VXLAN Tunnels</span><strong>${dev.vxlanConfig.length}</strong></div>` : ''}
  </div>
  ${routeCount > 0 ? `<div class="tb-ov-section-label">Routing Table</div><div style="max-height:120px;overflow-y:auto;margin-bottom:8px;font-family:'Fira Code',monospace;font-size:10px;background:rgba(0,0,0,.2);border-radius:6px;padding:6px">${dev.routingTable.map(r => `<div style="padding:2px 0"><span style="color:${r.type==='connected'?'#22c55e':'#60a5fa'};font-weight:700">${r.type==='connected'?'C':'S'}</span> ${escHtml(r.network)}/${tbMaskToCidr(r.mask)} via ${escHtml(r.nextHop||r.iface)}</div>`).join('')}</div>` : ''}
  ${ifaceCards ? `<div class="tb-ov-section-label">Connected Interfaces</div>${ifaceCards}` : '<div style="color:#64748b;font-size:11px">No connected interfaces. Wire this device to others first.</div>'}
  <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
    <button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab('ifaces')">Edit Interfaces</button>
    ${isRouter ? '<button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab(\'routing\')">Routing Table</button>' : ''}
    ${isSwitch ? '<button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab(\'vlans\')">VLAN Config</button>' : ''}
    ${isCloudDev ? '<button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab(\'security-groups\')">Security Groups</button>' : ''}
    ${dev.type === 'vpc' ? '<button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab(\'vpc-config\')">VPC Config</button>' : ''}
    <button class="btn btn-ghost tb-ov-action" onclick="tbSwitchConfigTab('cli')">Open CLI</button>
  </div>`;
}

// ── Interfaces Tab ──
function tbRenderIfacesTab(dev) {
  const isSwitch = dev.type.indexOf('switch') >= 0;
  const rows = dev.interfaces.map((ifc, i) => {
    const cable = ifc.cableId ? tbState.cables.find(c => c.id === ifc.cableId) : null;
    const peerDevId = cable ? (cable.from === dev.id ? cable.to : cable.from) : null;
    const peerDev = peerDevId ? tbState.devices.find(d => d.id === peerDevId) : null;
    const cableLbl = peerDev ? `→ ${peerDev.hostname || '?'}` : '(free)';
    const statusCls = ifc.enabled ? 'tb-iface-status-up' : 'tb-iface-status-down';
    const statusTxt = ifc.enabled ? 'UP' : 'DN';
    // DTP mode (only for switches)
    const dtpOpts = isSwitch ? `<select onchange="tbSetIfaceField(${i},'dtp',this.value)" style="width:52px" title="DTP mode">
      <option value="on"${(ifc.dtp||'on')==='on'?' selected':''}>On</option>
      <option value="desirable"${ifc.dtp==='desirable'?' selected':''}>Desir</option>
      <option value="auto"${ifc.dtp==='auto'?' selected':''}>Auto</option>
      <option value="noneg"${ifc.dtp==='noneg'?' selected':''}>NoNeg</option>
    </select>` : '';
    // Trunk allowed VLANs (only when trunk mode)
    const trunkInfo = ifc.mode === 'trunk' ? `<div class="tb-iface-trunk-detail">
      <label style="font-size:10px;margin:0">Allowed VLANs:</label>
      <input type="text" value="${(ifc.trunkAllowed||[1]).join(',')}" onchange="tbSetTrunkAllowed(${i},this.value)" style="width:100%;font-size:10px" placeholder="1,10,20" title="Comma-separated VLAN IDs">
      <label style="font-size:10px;margin:0">Native VLAN:</label>
      <input type="text" value="${ifc.nativeVlan || 1}" onchange="tbSetIfaceField(${i},'nativeVlan',parseInt(this.value)||1)" style="width:50px;font-size:10px" title="Native VLAN (untagged)">
    </div>` : '';
    return `<tr>
      <td><span class="tb-iface-name">${escHtml(ifc.name)}</span><br><span class="tb-iface-cable">${escHtml(cableLbl)}</span></td>
      <td><input type="text" value="${escHtml(ifc.ip)}" placeholder="IP" onchange="tbSetIfaceField(${i},'ip',this.value)" style="width:90px"></td>
      <td><input type="text" value="${escHtml(ifc.mask)}" placeholder="Mask" onchange="tbSetIfaceField(${i},'mask',this.value)" style="width:90px"></td>
      <td><input type="text" value="${ifc.vlan}" onchange="tbSetIfaceField(${i},'vlan',parseInt(this.value)||1)" style="width:32px;text-align:center"></td>
      <td><select onchange="tbSetIfaceField(${i},'mode',this.value);tbSwitchConfigTab('ifaces')" style="width:56px"><option value="access"${ifc.mode==='access'?' selected':''}>Acc</option><option value="trunk"${ifc.mode==='trunk'?' selected':''}>Trunk</option></select></td>
      <td>${dtpOpts}</td>
      <td><span class="${statusCls}" style="cursor:pointer;font-weight:700" onclick="tbToggleIface(${i})">${statusTxt}</span></td>
    </tr>
    ${trunkInfo ? `<tr><td colspan="7" style="padding:2px 5px 6px">${trunkInfo}</td></tr>` : ''}`;
  }).join('');

  const isEndpoint = ['pc','printer','voip','iot','public-web','public-file','public-cloud'].indexOf(dev.type) >= 0;
  const gwRow = isEndpoint ? `<div style="margin-top:8px"><label>Default Gateway</label><input type="text" value="${escHtml(dev.interfaces[0]?.gateway || '')}" onchange="tbSetGateway(this.value)" placeholder="e.g. 192.168.1.1"></div>` : '';

  // IPv6 section
  const ipv6Rows = dev.interfaces.filter(i => i.cableId || i.ipv6).map((ifc, idx) => {
    const realIdx = dev.interfaces.indexOf(ifc);
    return `<div style="display:flex;gap:4px;align-items:center;font-size:10px;padding:2px 0">
      <span style="width:50px;font-weight:600">${ifc.name}</span>
      <input type="text" value="${escHtml(ifc.ipv6||'')}" onchange="tbSetIfaceIpv6(${realIdx},this.value)" placeholder="2001:db8::1" style="flex:1;font-size:10px">
      <span style="color:#64748b">/${ifc.ipv6Prefix || 64}</span>
    </div>`;
  }).join('');

  return `<div style="margin-bottom:6px"><label>Hostname</label><input type="text" value="${escHtml(dev.hostname||'')}" onchange="tbSetHostname(this.value)"></div>
    <table class="tb-iface-table"><thead><tr><th>Port</th><th>IP</th><th>Mask</th><th>VL</th><th>Mode</th>${isSwitch?'<th>DTP</th>':'<th></th>'}<th>St</th></tr></thead><tbody>${rows}</tbody></table>
    <div style="font-size:10px;color:#64748b">MAC: auto-assigned. ${dev.interfaces.length} ports. ${isSwitch ? 'Set mode to Trunk to configure allowed VLANs + native VLAN.' : ''}</div>
    ${gwRow}
    ${ipv6Rows ? `<div style="margin-top:10px;border-top:1px solid rgba(124,111,247,.15);padding-top:8px"><div style="font-weight:600;font-size:11px;margin-bottom:4px">IPv6 Addresses</div>${ipv6Rows}<div style="font-size:9px;color:#64748b;margin-top:4px">Link-local: fe80::, Global: 2001:db8::, ULA: fd00::</div></div>` : ''}`;
}

// Helper: set trunk allowed VLANs (comma-separated)
function tbSetTrunkAllowed(idx, val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.interfaces[idx]) return;
  const vlans = val.split(',').map(v => parseInt(v.trim())).filter(v => v > 0 && v <= 4094);
  dev.interfaces[idx].trunkAllowed = vlans.length ? vlans : [1];
  tbState.updated = Date.now();
  tbSaveDraft();
}

function tbSetIfaceField(idx, field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.interfaces[idx]) return;
  dev.interfaces[idx][field] = value;
  // If IP changed on a router/firewall, rebuild connected routes
  if (field === 'ip' || field === 'mask') tbRebuildConnectedRoutes(dev);
  tbState.updated = Date.now();
  tbSaveDraft();
  tbRenderCanvas();
}

function tbSetHostname(val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  dev.hostname = val.trim() || tbAutoHostname(dev.type, tbState.devices.filter(d => d !== dev));
  tbState.updated = Date.now();
  tbSaveDraft();
  tbRenderCanvas();
  const title = document.getElementById('tb-config-title');
  if (title) title.textContent = `${dev.hostname} (${(TB_DEVICE_TYPES[dev.type]||{}).label})`;
}

function tbSetGateway(val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.interfaces[0]) return;
  dev.interfaces[0].gateway = val.trim();
  tbState.updated = Date.now();
  tbSaveDraft();
}

function tbSetIfaceIpv6(idx, val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.interfaces[idx]) return;
  dev.interfaces[idx].ipv6 = val.trim(); tbState.updated = Date.now(); tbSaveDraft();
}

function tbToggleIface(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.interfaces[idx]) return;
  dev.interfaces[idx].enabled = !dev.interfaces[idx].enabled;
  tbState.updated = Date.now();
  tbSaveDraft();
  tbSwitchConfigTab('ifaces');
}

// Rebuild connected routes when interface IPs change
function tbRebuildConnectedRoutes(dev) {
  if (dev.type !== 'router' && dev.type !== 'firewall') return;
  dev.routingTable = dev.routingTable.filter(r => r.type !== 'connected');
  dev.interfaces.forEach(ifc => {
    if (ifc.ip && ifc.mask && ifc.enabled) {
      const net = tbSubnetOf(ifc.ip, ifc.mask);
      if (net) dev.routingTable.push({ network: net, mask: ifc.mask, nextHop: null, iface: ifc.name, type: 'connected' });
    }
  });
}

// ── Routing Tab ──
function tbRenderRoutingTab(dev) {
  const rows = dev.routingTable.map((r, i) => {
    const typeCls = r.type === 'connected' ? 'tb-route-type-connected' : 'tb-route-type-static';
    const del = r.type === 'static' ? `<button class="btn btn-ghost" onclick="tbDelRoute(${i})" style="padding:2px 6px;font-size:11px">&times;</button>` : '';
    return `<div class="tb-route-row">
      <span class="tb-route-type ${typeCls}">${r.type === 'connected' ? 'C' : 'S'}</span>
      <span style="flex:1;font-family:'Fira Code',monospace;font-size:11px">${escHtml(r.network)}/${tbMaskToCidr(r.mask)} via ${r.nextHop || r.iface}</span>
      ${del}
    </div>`;
  }).join('');
  return `<div style="margin-bottom:8px;font-weight:600;font-size:12px">Routing Table</div>
    ${rows || '<div style="color:#64748b;font-size:11px">No routes. Assign IPs to interfaces to generate connected routes.</div>'}
    <div style="margin-top:12px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
      <div style="font-weight:600;font-size:11px;margin-bottom:6px">Add Static Route</div>
      <div class="tb-route-row">
        <input type="text" id="tb-route-net" placeholder="Network" style="flex:1">
        <input type="text" id="tb-route-mask" placeholder="Mask" style="flex:1">
        <input type="text" id="tb-route-nh" placeholder="Next Hop" style="flex:1">
        <button class="btn btn-ghost" onclick="tbAddStaticRoute()" style="padding:4px 10px;font-size:11px">+</button>
      </div>
    </div>`;
}

function tbAddStaticRoute() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  const net = document.getElementById('tb-route-net')?.value.trim();
  const mask = document.getElementById('tb-route-mask')?.value.trim() || '255.255.255.0';
  const nh = document.getElementById('tb-route-nh')?.value.trim();
  if (!net || !nh) { showErrorToast('Network and Next Hop required.'); return; }
  dev.routingTable.push({ network: net, mask, nextHop: nh, iface: '', type: 'static' });
  tbState.updated = Date.now();
  tbSaveDraft();
  tbSwitchConfigTab('routing');
}

function tbDelRoute(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  dev.routingTable.splice(idx, 1);
  tbState.updated = Date.now();
  tbSaveDraft();
  tbSwitchConfigTab('routing');
}

// ── VLANs Tab ──
function tbRenderVlansTab(dev) {
  const rows = dev.vlanDb.map((v, i) => `<div class="tb-vlan-row">
    <span class="tb-vlan-id">VLAN ${v.id}</span>
    <span style="flex:1">${escHtml(v.name)}</span>
    ${v.id !== 1 ? `<button class="btn btn-ghost" onclick="tbDelVlan(${i})" style="padding:2px 6px;font-size:11px">&times;</button>` : ''}
  </div>`).join('');

  // Ports per VLAN summary
  const portSummary = dev.vlanDb.map(v => {
    const ports = dev.interfaces.filter(ifc => ifc.mode === 'access' && ifc.vlan === v.id);
    return ports.length ? `<div style="font-size:10px;color:#94a3b8;margin-bottom:2px">VLAN ${v.id}: ${ports.map(p=>p.name).join(', ')}</div>` : '';
  }).join('');

  return `<div style="margin-bottom:8px;font-weight:600;font-size:12px">VLAN Database</div>
    ${rows}
    <div style="margin-top:8px">${portSummary}</div>
    <div style="margin-top:10px;border-top:1px solid rgba(124,111,247,.15);padding-top:8px">
      <div style="font-weight:600;font-size:11px;margin-bottom:4px">Add VLAN</div>
      <div style="display:flex;gap:6px">
        <input type="text" id="tb-vlan-id" placeholder="ID" style="width:50px">
        <input type="text" id="tb-vlan-name" placeholder="Name" style="flex:1">
        <button class="btn btn-ghost" onclick="tbAddVlan()" style="padding:4px 10px;font-size:11px">+</button>
      </div>
    </div>`;
}

function tbAddVlan() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  const id = parseInt(document.getElementById('tb-vlan-id')?.value) || 0;
  const name = document.getElementById('tb-vlan-name')?.value.trim() || `VLAN${id}`;
  if (id < 2 || id > 4094) { showErrorToast('VLAN ID must be 2-4094.'); return; }
  if (dev.vlanDb.some(v => v.id === id)) { showErrorToast('VLAN already exists.'); return; }
  dev.vlanDb.push({ id, name });
  tbState.updated = Date.now();
  tbSaveDraft();
  tbSwitchConfigTab('vlans');
}

function tbDelVlan(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  dev.vlanDb.splice(idx, 1);
  tbState.updated = Date.now();
  tbSaveDraft();
  tbSwitchConfigTab('vlans');
}

// ── VXLAN Tab ──
function tbRenderVxlanTab(dev) {
  const tunnels = dev.vxlanConfig || [];
  const rows = tunnels.map((t, i) => `<div class="tb-vxlan-row">
    <div class="tb-vxlan-row-head">
      <strong>VNI ${t.vni}</strong>
      <span class="tb-cloud-badge" style="background:rgba(139,92,246,.2);color:#a78bfa">VTEP ${escHtml(t.vtepIp || '—')}</span>
      <button class="btn btn-ghost" onclick="tbRemoveVxlan(${i})" style="font-size:11px;color:#ef4444;padding:1px 4px">&times;</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:4px">
      <div><label style="font-size:9px">VNI (1-16777215)</label>
        <input type="number" value="${t.vni}" onchange="tbSetVxlanField(${i},'vni',parseInt(this.value))" min="1" max="16777215" style="width:100%"></div>
      <div><label style="font-size:9px">VTEP Source IP</label>
        <input type="text" value="${escHtml(t.vtepIp || '')}" onchange="tbSetVxlanField(${i},'vtepIp',this.value)" placeholder="e.g. 10.0.0.1" style="width:100%"></div>
      <div><label style="font-size:9px">Mapped VLAN ID</label>
        <input type="number" value="${t.mappedVlan || ''}" onchange="tbSetVxlanField(${i},'mappedVlan',parseInt(this.value)||0)" placeholder="e.g. 10" style="width:100%"></div>
      <div><label style="font-size:9px">Multicast Group</label>
        <input type="text" value="${escHtml(t.mcastGroup || '')}" onchange="tbSetVxlanField(${i},'mcastGroup',this.value)" placeholder="239.1.1.1" style="width:100%"></div>
    </div>
    <div style="margin-top:4px">
      <label style="font-size:9px">Remote VTEPs (comma-separated IPs)</label>
      <input type="text" value="${escHtml((t.remoteVteps || []).join(', '))}" onchange="tbSetVxlanField(${i},'remoteVteps',this.value.split(',').map(s=>s.trim()).filter(Boolean))" placeholder="10.0.0.2, 10.0.0.3" style="width:100%">
    </div>
    <div style="margin-top:4px;display:flex;gap:8px;align-items:center">
      <label style="font-size:9px">Flood & Learn</label>
      <input type="checkbox" ${t.floodAndLearn ? 'checked' : ''} onchange="tbSetVxlanField(${i},'floodAndLearn',this.checked)">
      <label style="font-size:9px;margin-left:8px">BGP EVPN</label>
      <input type="checkbox" ${t.bgpEvpn ? 'checked' : ''} onchange="tbSetVxlanField(${i},'bgpEvpn',this.checked)">
    </div>
  </div>`).join('');

  return `<div style="margin-bottom:6px;font-weight:600;font-size:12px">VXLAN Tunnels</div>
    <div style="font-size:10px;color:#64748b;margin-bottom:8px">Virtual eXtensible LAN — Layer 2 overlay over Layer 3 underlay. Each VNI maps a VLAN to a VXLAN segment (up to 16M segments vs 4094 VLANs). VTEPs encapsulate/decapsulate frames in UDP port 4789.</div>
    ${rows || '<div style="color:#64748b;font-size:11px;margin-bottom:8px">No VXLAN tunnels configured.</div>'}
    <button class="btn btn-ghost" onclick="tbAddVxlan()" style="font-size:11px;margin-top:6px">+ Add VXLAN Tunnel</button>`;
}

function tbAddVxlan() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  if (!dev.vxlanConfig) dev.vxlanConfig = [];
  const nextVni = dev.vxlanConfig.length > 0 ? Math.max(...dev.vxlanConfig.map(v => v.vni)) + 1 : 10000;
  dev.vxlanConfig.push({ vni: nextVni, vtepIp: '', mappedVlan: 0, mcastGroup: '', remoteVteps: [], floodAndLearn: true, bgpEvpn: false });
  tbState.updated = Date.now();
  tbSaveDraft();
  tbSwitchConfigTab('vxlan');
}

function tbRemoveVxlan(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.vxlanConfig) return;
  dev.vxlanConfig.splice(idx, 1);
  tbState.updated = Date.now();
  tbSaveDraft();
  tbSwitchConfigTab('vxlan');
}

function tbSetVxlanField(idx, field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.vxlanConfig || !dev.vxlanConfig[idx]) return;
  dev.vxlanConfig[idx][field] = value;
  tbState.updated = Date.now();
  tbSaveDraft();
  if (field === 'vni' || field === 'vtepIp') tbSwitchConfigTab('vxlan');
}

// ── STP Tab ──
function tbRenderStpTab(dev) {
  const stp = dev.stpConfig || { priority: 32768, mode: 'rstp', portStates: {} };
  if (!dev.stpConfig) { dev.stpConfig = stp; }
  const portRows = dev.interfaces.filter(i => i.cableId).map(ifc => {
    const st = stp.portStates[ifc.name] || 'forwarding';
    const stColor = st === 'forwarding' ? '#22c55e' : st === 'blocking' ? '#ef4444' : st === 'learning' ? '#f59e0b' : '#60a5fa';
    return `<div style="display:flex;gap:8px;align-items:center;padding:3px 0;font-size:11px">
      <span style="width:50px;font-weight:600">${ifc.name}</span>
      <span style="color:${stColor};font-weight:700">${st.toUpperCase()}</span>
      <select onchange="tbSetStpPortState('${ifc.name}',this.value)" style="font-size:10px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:3px;padding:1px 4px">
        ${['forwarding','blocking','learning','listening','disabled'].map(s => `<option value="${s}"${s===st?' selected':''}>${s}</option>`).join('')}
      </select></div>`;
  }).join('');
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">Spanning Tree Protocol</div>
    <label>Mode</label>
    <select onchange="tbSetStpField('mode',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
      ${['stp','rstp','mstp'].map(m => `<option value="${m}"${m===stp.mode?' selected':''}>${m.toUpperCase()}</option>`).join('')}
    </select>
    <label>Bridge Priority (0-65535, increments of 4096)</label>
    <input type="number" value="${stp.priority}" min="0" max="65535" step="4096" onchange="tbSetStpField('priority',parseInt(this.value))" style="width:100%">
    <div style="font-size:10px;color:#64748b;margin:4px 0">Lower priority = more likely to become Root Bridge. Default: 32768.</div>
    <div style="font-size:10px;color:#94a3b8;margin:2px 0">Root Bridge ID: ${stp.priority}.${dev.interfaces[0]?.mac || 'unknown'}</div>
    <div style="margin-top:12px;font-weight:600;font-size:11px">Port States</div>
    ${portRows || '<div style="font-size:10px;color:#64748b">No connected ports.</div>'}
    <div style="font-size:10px;color:#64748b;margin-top:8px">STP port states: Blocking → Listening → Learning → Forwarding. RSTP converges in ~1-2 seconds vs STP ~30-50 seconds.</div>
    <button class="btn btn-ghost" onclick="tbRunStpConvergence()" style="font-size:10px;margin-top:10px;color:#38bdf8;border-color:#38bdf8">▶ Run Convergence</button>`;
}
function tbSetStpField(field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.stpConfig) dev.stpConfig = { priority: 32768, mode: 'rstp', portStates: {} };
  dev.stpConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('stp');
}
function tbSetStpPortState(ifName, state) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.stpConfig) dev.stpConfig = { priority: 32768, mode: 'rstp', portStates: {} };
  dev.stpConfig.portStates[ifName] = state; tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('stp');
}

// ── OSPF Tab ──
function tbRenderOspfTab(dev) {
  const ospf = dev.ospfConfig || { routerId: '', areas: [], enabled: false };
  if (!dev.ospfConfig) { dev.ospfConfig = ospf; }
  const areaRows = ospf.areas.map((a, i) => `<div style="display:flex;gap:6px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">
    <span style="font-size:10px;font-weight:700;width:60px">Area ${a.id}</span>
    <input type="text" value="${escHtml(a.networks?.join(', ') || '')}" onchange="tbSetOspfAreaNetworks(${i},this.value)" placeholder="192.168.1.0/24, 10.0.0.0/30" style="flex:1;font-size:10px">
    <button onclick="tbRemoveOspfArea(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:12px">✕</button>
  </div>`).join('');
  // Discover OSPF neighbors from cables
  const neighbors = [];
  if (ospf.enabled) {
    tbState.cables.filter(c => c.from === dev.id || c.to === dev.id).forEach(c => {
      const peerId = c.from === dev.id ? c.to : c.from;
      const peer = tbState.devices.find(d => d.id === peerId);
      if (peer && peer.ospfConfig && peer.ospfConfig.enabled) {
        const peerIp = peer.interfaces.find(i => i.ip)?.ip || '?';
        neighbors.push(`${peer.hostname} (${peerIp}) — ${peer.ospfConfig.routerId || 'no RID'}`);
      }
    });
  }
  const neighborHtml = neighbors.length ? neighbors.map(n => `<div style="font-size:10px;color:#22c55e">● ${n}</div>`).join('') : '<div style="font-size:10px;color:#64748b">No OSPF neighbors discovered.</div>';
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">OSPF Configuration</div>
    <label><input type="checkbox" ${ospf.enabled?'checked':''} onchange="tbSetOspfField('enabled',this.checked)"> Enable OSPF</label>
    <label>Router ID</label>
    <input type="text" value="${escHtml(ospf.routerId)}" onchange="tbSetOspfField('routerId',this.value)" placeholder="1.1.1.1" style="width:100%">
    <div style="font-size:10px;color:#64748b;margin:2px 0">Unique ID for this router in the OSPF domain. Usually the highest loopback IP.</div>
    <div style="margin-top:10px;font-weight:600;font-size:11px">Areas</div>
    ${areaRows || '<div style="font-size:10px;color:#64748b">No areas configured.</div>'}
    <button class="btn btn-ghost" onclick="tbAddOspfArea()" style="font-size:10px;margin-top:4px">+ Add Area</button>
    <div style="margin-top:12px;font-weight:600;font-size:11px">Discovered Neighbors</div>
    ${neighborHtml}
    <div style="font-size:10px;color:#64748b;margin-top:8px">OSPF uses Dijkstra\'s SPF algorithm to find shortest paths. Area 0 is the backbone — all other areas must connect to it.</div>`;
}
function tbSetOspfField(field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.ospfConfig) dev.ospfConfig = { routerId: '', areas: [], enabled: false };
  dev.ospfConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('ospf');
}
function tbAddOspfArea() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.ospfConfig) dev.ospfConfig = { routerId: '', areas: [], enabled: false };
  const nextId = dev.ospfConfig.areas.length === 0 ? 0 : Math.max(...dev.ospfConfig.areas.map(a => a.id)) + 1;
  dev.ospfConfig.areas.push({ id: nextId, networks: [] }); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('ospf');
}
function tbRemoveOspfArea(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.ospfConfig) return; dev.ospfConfig.areas.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('ospf');
}
function tbSetOspfAreaNetworks(idx, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.ospfConfig?.areas?.[idx]) return;
  dev.ospfConfig.areas[idx].networks = value.split(',').map(s => s.trim()).filter(Boolean);
  tbState.updated = Date.now(); tbSaveDraft();
}

// ── QoS Tab ──
function tbRenderQosTab(dev) {
  const qos = dev.qosConfig || { enabled: false, policies: [] };
  if (!dev.qosConfig) { dev.qosConfig = qos; }
  const policyRows = qos.policies.map((p, i) => `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:10px">
    <div style="display:flex;gap:6px;align-items:center">
      <input type="text" value="${escHtml(p.name||'')}" onchange="tbSetQosPolicy(${i},'name',this.value)" placeholder="Policy name" style="flex:1;font-size:10px">
      <select onchange="tbSetQosPolicy(${i},'dscp',this.value)" style="font-size:10px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:3px;padding:2px">
        ${['default','af11','af21','af31','af41','ef','cs1','cs2','cs3','cs4','cs5','cs6','cs7'].map(d => `<option value="${d}"${d===p.dscp?' selected':''}>${d.toUpperCase()}</option>`).join('')}
      </select>
      <select onchange="tbSetQosPolicy(${i},'queue',this.value)" style="font-size:10px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:3px;padding:2px">
        ${['best-effort','priority','bandwidth','fair'].map(q => `<option value="${q}"${q===p.queue?' selected':''}>${q}</option>`).join('')}
      </select>
      <button onclick="tbRemoveQosPolicy(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer">✕</button>
    </div>
    <div style="margin-top:2px;color:#64748b">Match: ${escHtml(p.match||'any')} → DSCP ${(p.dscp||'default').toUpperCase()} → ${p.queue||'best-effort'} queue</div>
  </div>`).join('');
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">Quality of Service</div>
    <label><input type="checkbox" ${qos.enabled?'checked':''} onchange="tbSetQosField('enabled',this.checked)"> Enable QoS</label>
    <div style="font-size:10px;color:#64748b;margin:4px 0">DSCP markings prioritize traffic. EF (Expedited Forwarding) = voice. AF (Assured Forwarding) = data classes. CS = backward-compatible with IP Precedence.</div>
    <div style="margin-top:10px;font-weight:600;font-size:11px">Policies</div>
    ${policyRows || '<div style="font-size:10px;color:#64748b">No QoS policies.</div>'}
    <button class="btn btn-ghost" onclick="tbAddQosPolicy()" style="font-size:10px;margin-top:4px">+ Add Policy</button>
    <div style="font-size:10px;color:#64748b;margin-top:10px"><strong>Queue types:</strong> Priority (strict, for voice/video), Bandwidth (guaranteed %), Fair (WFQ, equal sharing), Best-effort (default, no guarantees).</div>`;
}
function tbSetQosField(field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.qosConfig) dev.qosConfig = { enabled: false, policies: [] };
  dev.qosConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('qos');
}
function tbAddQosPolicy() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.qosConfig) dev.qosConfig = { enabled: false, policies: [] };
  dev.qosConfig.policies.push({ name: '', dscp: 'default', queue: 'best-effort', match: 'any' });
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('qos');
}
function tbRemoveQosPolicy(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.qosConfig) return; dev.qosConfig.policies.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('qos');
}
function tbSetQosPolicy(idx, field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.qosConfig?.policies?.[idx]) return; dev.qosConfig.policies[idx][field] = value;
  tbState.updated = Date.now(); tbSaveDraft();
}

// ── Wireless Tab ──
function tbRenderWirelessTab(dev) {
  const wc = dev.wirelessConfig || { ssid: '', security: 'wpa3-personal', channel: 'auto', band: '5ghz', txPower: 'auto', mode: '802.11ax' };
  if (!dev.wirelessConfig) { dev.wirelessConfig = wc; }
  const channels24 = ['auto','1','6','11'];
  const channels5 = ['auto','36','40','44','48','149','153','157','161','165'];
  const chList = wc.band === '2.4ghz' ? channels24 : channels5;
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">Wireless Configuration</div>
    <label>SSID</label>
    <input type="text" value="${escHtml(wc.ssid)}" onchange="tbSetWirelessField('ssid',this.value)" placeholder="Corp-WiFi" style="width:100%">
    <label>Security</label>
    <select onchange="tbSetWirelessField('security',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
      ${['open','wep','wpa2-personal','wpa2-enterprise','wpa3-personal','wpa3-enterprise'].map(s => `<option value="${s}"${s===wc.security?' selected':''}>${s.toUpperCase()}</option>`).join('')}
    </select>
    <label>802.11 Mode</label>
    <select onchange="tbSetWirelessField('mode',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
      ${['802.11a','802.11b','802.11g','802.11n','802.11ac','802.11ax'].map(m => `<option value="${m}"${m===wc.mode?' selected':''}>${m} ${m==='802.11ax'?'(Wi-Fi 6)':m==='802.11ac'?'(Wi-Fi 5)':''}</option>`).join('')}
    </select>
    <label>Band</label>
    <select onchange="tbSetWirelessField('band',this.value);tbSwitchConfigTab('wireless')" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
      ${['2.4ghz','5ghz','6ghz'].map(b => `<option value="${b}"${b===wc.band?' selected':''}>${b}</option>`).join('')}
    </select>
    <label>Channel</label>
    <select onchange="tbSetWirelessField('channel',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
      ${chList.map(c => `<option value="${c}"${c===wc.channel?' selected':''}>${c}</option>`).join('')}
    </select>
    <label>TX Power</label>
    <select onchange="tbSetWirelessField('txPower',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
      ${['auto','high','medium','low'].map(p => `<option value="${p}"${p===wc.txPower?' selected':''}>${p}</option>`).join('')}
    </select>
    <div style="font-size:10px;color:#64748b;margin-top:10px"><strong>2.4 GHz non-overlapping:</strong> 1, 6, 11. <strong>5 GHz UNII-1:</strong> 36, 40, 44, 48. <strong>DFS channels:</strong> 52-144 (radar detection required). <strong>WPA3-Enterprise</strong> uses 192-bit security with CNSA suite.</div>`;
}
function tbSetWirelessField(field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.wirelessConfig) dev.wirelessConfig = { ssid: '', security: 'wpa3-personal', channel: 'auto', band: '5ghz', txPower: 'auto', mode: '802.11ax' };
  dev.wirelessConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft();
}

// ── DNS Tab ──
function tbRenderDnsTab(dev) {
  const records = dev.dnsRecords || [];
  const recordRows = records.map((r, i) => `<div style="display:flex;gap:4px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:10px">
    <select onchange="tbSetDnsRecord(${i},'type',this.value)" style="width:55px;font-size:10px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:3px;padding:1px">
      ${['A','AAAA','CNAME','MX','PTR','NS','SOA','TXT','SRV','CAA'].map(t => `<option value="${t}"${t===r.type?' selected':''}>${t}</option>`).join('')}
    </select>
    <input type="text" value="${escHtml(r.name||'')}" onchange="tbSetDnsRecord(${i},'name',this.value)" placeholder="hostname" style="flex:1;font-size:10px">
    <input type="text" value="${escHtml(r.value||'')}" onchange="tbSetDnsRecord(${i},'value',this.value)" placeholder="${r.type==='MX'?'10 mail.example.com':r.type==='SRV'?'10 5 5060 sip.example.com':'value'}" style="flex:1.5;font-size:10px">
    <input type="number" value="${r.ttl||3600}" onchange="tbSetDnsRecord(${i},'ttl',parseInt(this.value))" style="width:50px;font-size:10px" title="TTL (seconds)">
    <button onclick="tbRemoveDnsRecord(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:11px">✕</button>
  </div>`).join('');
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">DNS Records</div>
    <div style="font-size:10px;color:#64748b;margin-bottom:8px">Configure DNS zone records. Each record maps a name to a value with a TTL (Time To Live).</div>
    <div style="display:flex;gap:4px;padding:3px 0;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px">
      <span style="width:55px">Type</span><span style="flex:1">Name</span><span style="flex:1.5">Value</span><span style="width:50px">TTL</span><span style="width:16px"></span>
    </div>
    ${recordRows || '<div style="font-size:10px;color:#64748b;padding:4px 0">No DNS records. Click + to add.</div>'}
    <button class="btn btn-ghost" onclick="tbAddDnsRecord()" style="font-size:10px;margin-top:6px">+ Add Record</button>
    <div style="margin-top:12px;font-size:10px;color:#64748b;line-height:1.5">
      <strong>Record types:</strong><br>
      <strong>A</strong> — Maps hostname → IPv4 address<br>
      <strong>AAAA</strong> — Maps hostname → IPv6 address<br>
      <strong>CNAME</strong> — Alias → canonical name (cannot coexist with other records for same name)<br>
      <strong>MX</strong> — Mail exchange (priority + mail server hostname)<br>
      <strong>PTR</strong> — Reverse lookup (IP → hostname, in in-addr.arpa zone)<br>
      <strong>NS</strong> — Authoritative nameserver for this zone<br>
      <strong>SOA</strong> — Start of Authority (primary NS, admin email, serial, refresh/retry/expire/min-TTL)<br>
      <strong>TXT</strong> — Arbitrary text (SPF, DKIM, DMARC, domain verification)<br>
      <strong>SRV</strong> — Service locator (priority weight port target) for SIP, LDAP, etc.<br>
      <strong>CAA</strong> — Certificate Authority Authorization (controls which CAs can issue certs)
    </div>
    <div style="margin-top:12px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
      <div style="font-weight:600;font-size:11px;margin-bottom:6px;color:#38bdf8">🔒 DNSSEC</div>
      <label><input type="checkbox" ${dev.dnssecEnabled?'checked':''} onchange="tbToggleDnssec(this.checked)"> Enable DNSSEC</label>
      <div style="font-size:10px;color:#64748b;margin-top:4px">Adds DNSKEY, RRSIG, and DS records to establish a chain of trust. Prevents DNS cache poisoning by cryptographically signing zone records.</div>
      ${dev.dnssecEnabled ? '<div style="font-size:10px;color:#22c55e;margin-top:4px">✓ DNSSEC active — use <code>dig +dnssec</code> in CLI to validate chain of trust.</div>' : ''}
    </div>`;
}
function tbAddDnsRecord() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.dnsRecords) dev.dnsRecords = [];
  dev.dnsRecords.push({ type: 'A', name: '', value: '', ttl: 3600 });
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('dns');
}
function tbRemoveDnsRecord(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.dnsRecords) return; dev.dnsRecords.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('dns');
}
function tbSetDnsRecord(idx, field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.dnsRecords?.[idx]) return; dev.dnsRecords[idx][field] = value;
  tbState.updated = Date.now(); tbSaveDraft();
}

// ── BGP Tab ──
function tbRenderBgpTab(dev) {
  const bgp = dev.bgpConfig || { asn: '', routerId: '', neighbors: [], networks: [], enabled: false };
  if (!dev.bgpConfig) { dev.bgpConfig = bgp; }
  const neighborRows = bgp.neighbors.map((n, i) => `<div style="display:flex;gap:4px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:10px">
    <input type="text" value="${escHtml(n.ip||'')}" onchange="tbSetBgpNeighbor(${i},'ip',this.value)" placeholder="Neighbor IP" style="flex:1;font-size:10px">
    <input type="number" value="${n.remoteAs||''}" onchange="tbSetBgpNeighbor(${i},'remoteAs',parseInt(this.value))" placeholder="Remote AS" style="width:65px;font-size:10px">
    <select onchange="tbSetBgpNeighbor(${i},'type',this.value)" style="width:55px;font-size:10px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:3px;padding:1px">
      <option value="ebgp"${n.type==='ebgp'?' selected':''}>eBGP</option><option value="ibgp"${n.type==='ibgp'?' selected':''}>iBGP</option>
    </select>
    <span style="color:${n.state==='Established'?'#22c55e':'#facc15'};font-size:9px">${n.state||'Idle'}</span>
    <button onclick="tbRemoveBgpNeighbor(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:11px">✕</button>
  </div>`).join('');
  const netRows = bgp.networks.map((net, i) => `<div style="display:flex;gap:4px;align-items:center;padding:2px 0;font-size:10px">
    <input type="text" value="${escHtml(net)}" onchange="tbSetBgpNetwork(${i},this.value)" placeholder="192.168.1.0/24" style="flex:1;font-size:10px">
    <button onclick="tbRemoveBgpNetwork(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:11px">✕</button>
  </div>`).join('');
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">BGP Configuration</div>
    <label><input type="checkbox" ${bgp.enabled?'checked':''} onchange="tbSetBgpField('enabled',this.checked)"> Enable BGP</label>
    <label>Local ASN</label>
    <input type="number" value="${bgp.asn||''}" onchange="tbSetBgpField('asn',parseInt(this.value))" placeholder="65001" style="width:100%">
    <label>Router ID</label>
    <input type="text" value="${escHtml(bgp.routerId||'')}" onchange="tbSetBgpField('routerId',this.value)" placeholder="1.1.1.1" style="width:100%">
    <div style="font-weight:600;font-size:11px;margin-top:12px;margin-bottom:4px">Neighbors</div>
    ${neighborRows || '<div style="font-size:10px;color:#64748b">No neighbors configured.</div>'}
    <button class="btn btn-ghost" onclick="tbAddBgpNeighbor()" style="font-size:10px;margin-top:4px">+ Add Neighbor</button>
    <div style="font-weight:600;font-size:11px;margin-top:12px;margin-bottom:4px">Advertised Networks</div>
    ${netRows || '<div style="font-size:10px;color:#64748b">No networks advertised.</div>'}
    <button class="btn btn-ghost" onclick="tbAddBgpNetwork()" style="font-size:10px;margin-top:4px">+ Add Network</button>
    <button class="btn btn-ghost" onclick="tbNegotiateBgp()" style="font-size:10px;margin-top:10px;color:#22c55e;border-color:#22c55e">▶ Negotiate Peers</button>
    <div style="font-size:10px;color:#64748b;margin-top:10px;line-height:1.5">
      <strong>BGP (Border Gateway Protocol)</strong> — the routing protocol of the Internet (AS-to-AS). <strong>eBGP</strong> peers between different ASNs (TTL=1). <strong>iBGP</strong> peers within the same ASN (requires full mesh or route reflectors). Uses TCP port 179. Path attributes: AS_PATH, NEXT_HOP, LOCAL_PREF, MED.
    </div>`;
}
function tbSetBgpField(field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.bgpConfig) dev.bgpConfig = { asn: '', routerId: '', neighbors: [], networks: [], enabled: false };
  dev.bgpConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft();
}
function tbAddBgpNeighbor() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.bgpConfig) dev.bgpConfig = { asn: '', routerId: '', neighbors: [], networks: [], enabled: false };
  dev.bgpConfig.neighbors.push({ ip: '', remoteAs: '', type: 'ebgp', state: 'Idle' });
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('bgp');
}
function tbRemoveBgpNeighbor(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.bgpConfig) return; dev.bgpConfig.neighbors.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('bgp');
}
function tbSetBgpNeighbor(idx, field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.bgpConfig?.neighbors?.[idx]) return; dev.bgpConfig.neighbors[idx][field] = value;
  tbState.updated = Date.now(); tbSaveDraft();
}
function tbAddBgpNetwork() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.bgpConfig) dev.bgpConfig = { asn: '', routerId: '', neighbors: [], networks: [], enabled: false };
  dev.bgpConfig.networks.push('');
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('bgp');
}
function tbRemoveBgpNetwork(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.bgpConfig) return; dev.bgpConfig.networks.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('bgp');
}
function tbSetBgpNetwork(idx, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.bgpConfig?.networks) return; dev.bgpConfig.networks[idx] = value;
  tbState.updated = Date.now(); tbSaveDraft();
}
function tbNegotiateBgp() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.bgpConfig?.enabled) { showErrorToast('Enable BGP first.'); return; }
  if (!dev.bgpConfig.asn) { showErrorToast('Set a local ASN first.'); return; }
  let established = 0;
  dev.bgpConfig.neighbors.forEach(n => {
    // Find peer device by neighbor IP
    const peerDev = tbState.devices.find(pd => pd.id !== dev.id && pd.interfaces.some(i => i.ip === n.ip));
    if (!peerDev?.bgpConfig?.enabled) { n.state = 'Active'; return; }
    // Check AS match
    const isEbgp = n.type === 'ebgp';
    if (isEbgp && peerDev.bgpConfig.asn === dev.bgpConfig.asn) { n.state = 'Idle (same ASN for eBGP)'; return; }
    if (!isEbgp && peerDev.bgpConfig.asn !== dev.bgpConfig.asn) { n.state = 'Idle (diff ASN for iBGP)'; return; }
    // Check reciprocal neighbor
    const myIps = dev.interfaces.filter(i => i.ip).map(i => i.ip);
    const reciprocal = peerDev.bgpConfig.neighbors.find(pn => myIps.includes(pn.ip));
    if (!reciprocal) { n.state = 'Active (no reciprocal)'; return; }
    // Establish
    n.state = 'Established';
    reciprocal.state = 'Established';
    established++;
    // Exchange routes
    const peerRoutes = (peerDev.bgpConfig.networks || []).map(net => {
      const parts = net.split('/');
      return { type: 'bgp', network: parts[0], mask: parts[1] ? tbCidrToMask(parseInt(parts[1])) : '255.255.255.0', nextHop: n.ip, iface: '', asPath: String(peerDev.bgpConfig.asn) };
    });
    peerRoutes.forEach(pr => {
      if (!dev.routingTable.find(r => r.network === pr.network && r.type === 'bgp')) dev.routingTable.push(pr);
    });
    // Animate
    const path = [dev.id, peerDev.id];
    tbAnimatePacket(path, '#818cf8', 'BGP UPDATE');
  });
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('bgp');
  showErrorToast(established ? `BGP: ${established} peer(s) established!` : 'BGP: No peers could be established. Check neighbor IPs and ASNs.');
}
function tbCidrToMask(cidr) {
  const mask = [0, 0, 0, 0];
  for (let i = 0; i < cidr; i++) mask[Math.floor(i / 8)] += 1 << (7 - (i % 8));
  return mask.join('.');
}

// ── EIGRP Tab ──
function tbRenderEigrpTab(dev) {
  const eigrp = dev.eigrpConfig || { asn: '', networks: [], enabled: false, kValues: { k1: 1, k2: 0, k3: 1, k4: 0, k5: 0 } };
  if (!dev.eigrpConfig) { dev.eigrpConfig = eigrp; }
  const netRows = eigrp.networks.map((net, i) => `<div style="display:flex;gap:4px;align-items:center;padding:2px 0;font-size:10px">
    <input type="text" value="${escHtml(net.network||'')}" onchange="tbSetEigrpNetwork(${i},'network',this.value)" placeholder="192.168.1.0" style="flex:1;font-size:10px">
    <input type="text" value="${escHtml(net.wildcard||'')}" onchange="tbSetEigrpNetwork(${i},'wildcard',this.value)" placeholder="0.0.0.255" style="flex:1;font-size:10px">
    <button onclick="tbRemoveEigrpNetwork(${i})" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:11px">✕</button>
  </div>`).join('');
  // Find EIGRP neighbors
  const neighbors = [];
  if (eigrp.enabled) {
    tbState.cables.filter(c => c.from === dev.id || c.to === dev.id).forEach(c => {
      const peerId = c.from === dev.id ? c.to : c.from;
      const peer = tbState.devices.find(d => d.id === peerId);
      if (peer?.eigrpConfig?.enabled && peer.eigrpConfig.asn === eigrp.asn) {
        const peerIp = peer.interfaces.find(i => i.ip)?.ip || '?';
        neighbors.push({ hostname: peer.hostname, ip: peerIp });
      }
    });
  }
  const neighborList = neighbors.length ? neighbors.map(n =>
    `<div style="font-size:10px;padding:2px 0">${n.hostname} — ${n.ip} <span style="color:#22c55e">●</span></div>`
  ).join('') : '<div style="font-size:10px;color:#64748b">No EIGRP neighbors found.</div>';
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">EIGRP Configuration</div>
    <label><input type="checkbox" ${eigrp.enabled?'checked':''} onchange="tbSetEigrpField('enabled',this.checked)"> Enable EIGRP</label>
    <label>EIGRP AS Number</label>
    <input type="number" value="${eigrp.asn||''}" onchange="tbSetEigrpField('asn',parseInt(this.value))" placeholder="100" style="width:100%">
    <div style="font-weight:600;font-size:11px;margin-top:12px;margin-bottom:4px">Networks</div>
    <div style="display:flex;gap:4px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;padding-bottom:2px">
      <span style="flex:1">Network</span><span style="flex:1">Wildcard</span><span style="width:16px"></span>
    </div>
    ${netRows || '<div style="font-size:10px;color:#64748b">No networks configured.</div>'}
    <button class="btn btn-ghost" onclick="tbAddEigrpNetwork()" style="font-size:10px;margin-top:4px">+ Add Network</button>
    <div style="font-weight:600;font-size:11px;margin-top:12px;margin-bottom:4px">Neighbors</div>
    ${neighborList}
    <div style="font-size:10px;color:#64748b;margin-top:10px;line-height:1.5">
      <strong>EIGRP (Enhanced Interior Gateway Routing Protocol)</strong> — Cisco's advanced distance-vector (hybrid) protocol. Uses DUAL algorithm for loop-free paths. Composite metric: bandwidth + delay (K1, K3 by default). Supports unequal-cost load balancing with variance. Multicast: 224.0.0.10, protocol 88.
    </div>`;
}
function tbSetEigrpField(field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.eigrpConfig) dev.eigrpConfig = { asn: '', networks: [], enabled: false, kValues: { k1: 1, k2: 0, k3: 1, k4: 0, k5: 0 } };
  dev.eigrpConfig[field] = value; tbState.updated = Date.now(); tbSaveDraft();
}
function tbAddEigrpNetwork() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; if (!dev.eigrpConfig) dev.eigrpConfig = { asn: '', networks: [], enabled: false, kValues: { k1: 1, k2: 0, k3: 1, k4: 0, k5: 0 } };
  dev.eigrpConfig.networks.push({ network: '', wildcard: '0.0.0.255' });
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('eigrp');
}
function tbRemoveEigrpNetwork(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.eigrpConfig) return; dev.eigrpConfig.networks.splice(idx, 1); tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('eigrp');
}
function tbSetEigrpNetwork(idx, field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev?.eigrpConfig?.networks?.[idx]) return; dev.eigrpConfig.networks[idx][field] = value;
  tbState.updated = Date.now(); tbSaveDraft();
}

// ── Attack Scenarios Tab ──
function tbRenderAttackTab(dev) {
  const isSwitch = dev.type.indexOf('switch') >= 0;
  const snooping = dev.dhcpSnooping || { enabled: false, trustedPorts: [] };
  const dai = dev.daiEnabled || false;
  const ps = dev.portSecurity || { enabled: false, maxMac: 1, violation: 'shutdown' };
  const trustedPortOpts = dev.interfaces.map(ifc => {
    const isTrusted = snooping.trustedPorts.includes(ifc.name);
    return `<label style="font-size:10px;display:block"><input type="checkbox" ${isTrusted?'checked':''} onchange="tbToggleSnoopingTrust('${ifc.name}',this.checked)"> ${ifc.name}</label>`;
  }).join('');
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">Security & Attack Defense</div>
    ${isSwitch ? `
    <div style="border:1px solid rgba(34,197,94,.3);border-radius:8px;padding:8px;margin-bottom:10px">
      <div style="font-weight:600;font-size:11px;color:#22c55e;margin-bottom:6px">DHCP Snooping</div>
      <label><input type="checkbox" ${snooping.enabled?'checked':''} onchange="tbSetDhcpSnooping('enabled',this.checked)"> Enable DHCP Snooping</label>
      <div style="font-size:10px;color:#64748b;margin:4px 0">Trusted Ports (uplinks to legitimate DHCP server):</div>
      ${trustedPortOpts}
    </div>
    <div style="border:1px solid rgba(250,204,21,.3);border-radius:8px;padding:8px;margin-bottom:10px">
      <div style="font-weight:600;font-size:11px;color:#facc15;margin-bottom:6px">Dynamic ARP Inspection (DAI)</div>
      <label><input type="checkbox" ${dai?'checked':''} onchange="tbSetDai(this.checked)"> Enable DAI</label>
      <div style="font-size:10px;color:#64748b;margin-top:4px">Validates ARP packets against DHCP snooping binding table. Prevents ARP spoofing attacks.</div>
    </div>
    <div style="border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:8px;margin-bottom:10px">
      <div style="font-weight:600;font-size:11px;color:#ef4444;margin-bottom:6px">Port Security</div>
      <label><input type="checkbox" ${ps.enabled?'checked':''} onchange="tbSetPortSecurity('enabled',this.checked)"> Enable Port Security</label>
      <label>Max MAC Addresses</label>
      <input type="number" value="${ps.maxMac||1}" min="1" max="10" onchange="tbSetPortSecurity('maxMac',parseInt(this.value))" style="width:60px;font-size:10px">
      <label>Violation Mode</label>
      <select onchange="tbSetPortSecurity('violation',this.value)" style="width:100%;padding:4px;background:#1e293b;color:#e2e8f0;border:1px solid rgba(124,111,247,.3);border-radius:5px">
        ${['shutdown','restrict','protect'].map(v => `<option value="${v}"${v===ps.violation?' selected':''}>${v.charAt(0).toUpperCase()+v.slice(1)}</option>`).join('')}
      </select>
    </div>` : ''}
    <div style="font-weight:600;font-size:11px;margin-top:8px;margin-bottom:6px">Simulate Attacks</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px">
      <button class="btn btn-ghost" onclick="tbSimArpSpoof()" style="font-size:10px;color:#ef4444;border-color:#ef4444">⚡ ARP Spoof</button>
      <button class="btn btn-ghost" onclick="tbSimVlanHopping()" style="font-size:10px;color:#ef4444;border-color:#ef4444">⚡ VLAN Hop</button>
      <button class="btn btn-ghost" onclick="tbSimRogueDhcp()" style="font-size:10px;color:#ef4444;border-color:#ef4444">⚡ Rogue DHCP</button>
    </div>
    <div style="font-size:10px;color:#64748b;margin-top:10px;line-height:1.5">
      <strong>ARP Spoofing</strong> — attacker sends fake ARP replies to redirect traffic (man-in-the-middle). Defense: DAI.<br>
      <strong>VLAN Hopping</strong> — double-tagging attack to reach VLANs across trunk links. Defense: set native VLAN to unused VLAN, disable DTP.<br>
      <strong>Rogue DHCP</strong> — attacker runs unauthorized DHCP server to poison clients. Defense: DHCP Snooping.
    </div>`;
}
function tbSetDhcpSnooping(field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  if (!dev.dhcpSnooping) dev.dhcpSnooping = { enabled: false, trustedPorts: [] };
  dev.dhcpSnooping[field] = value;
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('attack');
}
function tbToggleSnoopingTrust(port, checked) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  if (!dev.dhcpSnooping) dev.dhcpSnooping = { enabled: false, trustedPorts: [] };
  if (checked) { if (!dev.dhcpSnooping.trustedPorts.includes(port)) dev.dhcpSnooping.trustedPorts.push(port); }
  else { dev.dhcpSnooping.trustedPorts = dev.dhcpSnooping.trustedPorts.filter(p => p !== port); }
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('attack');
}
function tbSetDai(enabled) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return; dev.daiEnabled = enabled;
  tbState.updated = Date.now(); tbSaveDraft();
}
function tbSetPortSecurity(field, value) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  if (!dev.portSecurity) dev.portSecurity = { enabled: false, maxMac: 1, violation: 'shutdown' };
  dev.portSecurity[field] = value;
  tbState.updated = Date.now(); tbSaveDraft();
}
// Attack simulations
function tbSimArpSpoof() {
  const switches = tbState.devices.filter(d => d.type.indexOf('switch') >= 0);
  if (!switches.length) { showErrorToast('No switches in topology for ARP spoof demo.'); return; }
  const targetSwitch = switches[0];
  // Check if DAI is enabled on the switch
  if (targetSwitch.daiEnabled) {
    showErrorToast('🛡️ DAI blocked the ARP spoof! Dynamic ARP Inspection validated the ARP packet against the binding table and dropped it.');
    tbAnimatePacket([targetSwitch.id, targetSwitch.id], '#22c55e', 'DAI BLOCK');
    return;
  }
  // Find 2 connected endpoints
  const endpoints = tbState.devices.filter(d => ['pc','server','voip','iot'].includes(d.type));
  if (endpoints.length < 2) { showErrorToast('Need at least 2 endpoints for ARP spoof demo.'); return; }
  showErrorToast('⚡ ARP Spoof attack! Attacker sent fake ARP reply — traffic is being redirected. Enable DAI on the switch to prevent this!');
  tbAnimatePacket([endpoints[0].id, targetSwitch.id, endpoints[1].id], '#ef4444', 'FAKE ARP');
}
function tbSimVlanHopping() {
  const switches = tbState.devices.filter(d => d.type.indexOf('switch') >= 0);
  if (!switches.length) { showErrorToast('No switches in topology for VLAN hopping demo.'); return; }
  // Check if port security / trunk config prevents it
  const trunkPorts = switches[0].interfaces.filter(i => i.mode === 'trunk');
  const nativeIsOne = trunkPorts.some(i => (i.vlan || 1) === 1);
  if (!nativeIsOne && trunkPorts.length) {
    showErrorToast('🛡️ VLAN hopping blocked! Native VLAN is not VLAN 1, preventing double-tagging attack.');
    return;
  }
  showErrorToast('⚡ VLAN Hopping! Double-tagged frame crossed trunk boundary. Defense: change native VLAN to unused VLAN, disable DTP.');
  if (switches.length >= 2) tbAnimatePacket([switches[0].id, switches[1].id], '#ef4444', 'DOUBLE TAG');
}
function tbSimRogueDhcp() {
  const switches = tbState.devices.filter(d => d.type.indexOf('switch') >= 0);
  if (!switches.length) { showErrorToast('No switches in topology for rogue DHCP demo.'); return; }
  // Check DHCP snooping
  if (switches[0].dhcpSnooping?.enabled) {
    showErrorToast('🛡️ DHCP Snooping blocked the rogue DHCP server! Only trusted ports can send DHCP offers.');
    return;
  }
  const endpoints = tbState.devices.filter(d => ['pc','server'].includes(d.type));
  if (endpoints.length) {
    showErrorToast('⚡ Rogue DHCP server detected! Attacker is handing out malicious gateway/DNS. Enable DHCP Snooping to prevent this!');
    tbAnimatePacket([endpoints[0].id, switches[0].id], '#ef4444', 'ROGUE OFFER');
  }
}

// ── DNSSEC Functions ──
function tbToggleDnssec(enabled) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  dev.dnssecEnabled = enabled;
  if (enabled) {
    // Auto-generate DNSKEY and RRSIG records for existing records
    const existing = dev.dnsRecords || [];
    if (!existing.find(r => r.type === 'DNSKEY')) {
      existing.push({ type: 'DNSKEY', name: dev.hostname + '.', value: '257 3 13 <base64-public-key>', ttl: 86400 });
    }
    existing.forEach(r => {
      if (['A','AAAA','MX','CNAME'].includes(r.type) && !existing.find(rr => rr.type === 'RRSIG' && rr.name === r.name)) {
        existing.push({ type: 'RRSIG', name: r.name, value: `${r.type} 13 2 ${r.ttl} <signature>`, ttl: r.ttl });
      }
    });
    if (!existing.find(r => r.type === 'DS')) {
      existing.push({ type: 'DS', name: dev.hostname + '.', value: '12345 13 2 <digest>', ttl: 86400 });
    }
    dev.dnsRecords = existing;
  }
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('dns');
}
function tbValidateDnssecChain(queryName) {
  const dnsServers = tbState.devices.filter(d => (d.type === 'dns-server' || d.type === 'server') && d.dnsRecords?.length);
  if (!dnsServers.length) return { valid: false, chain: [], error: 'No DNS servers in topology' };
  const chain = [];
  for (const srv of dnsServers) {
    if (!srv.dnssecEnabled) { chain.push({ server: srv.hostname, status: 'insecure', note: 'DNSSEC not enabled' }); continue; }
    const record = srv.dnsRecords.find(r => r.name === queryName && ['A','AAAA','MX','CNAME'].includes(r.type));
    if (!record) continue;
    const rrsig = srv.dnsRecords.find(r => r.type === 'RRSIG' && r.name === queryName);
    const dnskey = srv.dnsRecords.find(r => r.type === 'DNSKEY');
    const ds = srv.dnsRecords.find(r => r.type === 'DS');
    chain.push({ server: srv.hostname, record: record.type + ' ' + record.value, hasRrsig: !!rrsig, hasDnskey: !!dnskey, hasDs: !!ds, status: (rrsig && dnskey) ? 'secure' : 'bogus' });
    if (rrsig && dnskey) return { valid: true, chain, ad: true };
  }
  return { valid: false, chain, error: 'Chain of trust broken — RRSIG or DNSKEY missing' };
}

// ── Packet Inspection Panel ──
function tbShowPacketInspection(packetInfo) {
  const panel = document.getElementById('tb-packet-inspect');
  if (!panel) return;
  const p = packetInfo || {};
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:8px 8px 0 0">
    <span style="font-weight:700;font-size:11px;color:#38bdf8">📦 Packet Inspection</span>
    <button onclick="tbClosePacketInspection()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px">✕</button>
  </div>
  <div style="padding:8px;font-family:monospace;font-size:10px;line-height:1.6">
    <div style="border-left:3px solid #818cf8;padding-left:8px;margin-bottom:6px">
      <div style="font-weight:700;color:#818cf8;font-size:9px;text-transform:uppercase">Layer 2 — Data Link</div>
      <div>Src MAC: <span style="color:#22c55e">${p.srcMac || '??:??:??:??:??:??'}</span></div>
      <div>Dst MAC: <span style="color:#22c55e">${p.dstMac || '??:??:??:??:??:??'}</span></div>
      <div>EtherType: <span style="color:#94a3b8">${p.etherType || '0x0800 (IPv4)'}</span></div>
      ${p.vlanTag ? `<div>802.1Q VLAN: <span style="color:#facc15">${p.vlanTag}</span></div>` : ''}
    </div>
    <div style="border-left:3px solid #22c55e;padding-left:8px;margin-bottom:6px">
      <div style="font-weight:700;color:#22c55e;font-size:9px;text-transform:uppercase">Layer 3 — Network</div>
      <div>Src IP: <span style="color:#22c55e">${p.srcIp || '?.?.?.?'}</span></div>
      <div>Dst IP: <span style="color:#22c55e">${p.dstIp || '?.?.?.?'}</span></div>
      <div>Protocol: <span style="color:#94a3b8">${p.protocol || 'ICMP (1)'}</span></div>
      <div>TTL: <span style="color:#facc15">${p.ttl || 64}</span></div>
    </div>
    <div style="border-left:3px solid #f97316;padding-left:8px">
      <div style="font-weight:700;color:#f97316;font-size:9px;text-transform:uppercase">Layer 4 — Transport</div>
      <div>Src Port: <span style="color:#94a3b8">${p.srcPort || '—'}</span></div>
      <div>Dst Port: <span style="color:#94a3b8">${p.dstPort || '—'}</span></div>
      <div>Flags: <span style="color:#94a3b8">${p.flags || '—'}</span></div>
      ${p.payload ? `<div>Payload: <span style="color:#64748b">${p.payload}</span></div>` : ''}
    </div>
  </div>`;
  panel.classList.remove('is-hidden');
}
function tbClosePacketInspection() {
  document.getElementById('tb-packet-inspect')?.classList.add('is-hidden');
}
function tbBuildPacketHeaders(srcDev, dstDev, options) {
  const opts = options || {};
  const srcIfc = srcDev.interfaces.find(i => i.ip) || {};
  const dstIfc = dstDev.interfaces.find(i => i.ip) || {};
  return {
    srcMac: srcIfc.mac || tbGenerateMac(srcDev.id, 0),
    dstMac: dstIfc.mac || tbGenerateMac(dstDev.id, 0),
    etherType: opts.etherType || '0x0800 (IPv4)',
    vlanTag: opts.vlan || null,
    srcIp: srcIfc.ip || '0.0.0.0',
    dstIp: dstIfc.ip || '0.0.0.0',
    protocol: opts.protocol || 'ICMP (1)',
    ttl: opts.ttl || 64,
    srcPort: opts.srcPort || '—',
    dstPort: opts.dstPort || '—',
    flags: opts.flags || '—',
    payload: opts.payload || null,
  };
}

// ── STP Convergence Animation ──
function tbRunStpConvergence() {
  const switches = tbState.devices.filter(d => d.type.indexOf('switch') >= 0 && d.stpConfig);
  if (switches.length < 2) { showErrorToast('Need at least 2 switches with STP configured.'); return; }
  showErrorToast('STP Convergence: Phase 1 — Electing root bridge...');
  // Step 1: Find root bridge (lowest priority, then lowest MAC)
  const root = tbCalcRootBridge(switches);
  // Step 2: Calculate port roles
  const roles = tbCalcPortRoles(switches, root);
  // Step 3: Animate BPDUs
  let delay = 0;
  switches.forEach(sw => {
    if (sw.id === root.id) {
      sw.stpConfig.isRoot = true;
      setTimeout(() => showErrorToast(`STP: ${sw.hostname} elected ROOT BRIDGE (priority ${sw.stpConfig.priority})`), delay);
      delay += 1500;
    } else {
      sw.stpConfig.isRoot = false;
    }
  });
  // Animate BPDU exchange
  switches.forEach(sw => {
    if (sw.id === root.id) return;
    setTimeout(() => {
      tbAnimatePacket([root.id, sw.id], '#38bdf8', 'BPDU');
    }, delay);
    delay += 800;
  });
  // Step 4: Apply port states with timed transitions
  setTimeout(() => {
    roles.forEach(r => {
      const sw = switches.find(s => s.id === r.deviceId);
      if (sw?.stpConfig) {
        sw.stpConfig.portStates = sw.stpConfig.portStates || {};
        sw.stpConfig.portStates[r.port] = r.role;
      }
    });
    tbState.updated = Date.now(); tbSaveDraft();
    if (tbActiveConfigTab === 'stp') tbSwitchConfigTab('stp');
    showErrorToast(`STP Convergence complete! Root: ${root.hostname}. ${roles.filter(r => r.role === 'blocking').length} port(s) blocking.`);
  }, delay + 1000);
}
function tbCalcRootBridge(switches) {
  return switches.reduce((best, sw) => {
    const pri = sw.stpConfig?.priority || 32768;
    const bestPri = best.stpConfig?.priority || 32768;
    if (pri < bestPri) return sw;
    if (pri === bestPri) {
      const mac = sw.interfaces[0]?.mac || 'ff:ff:ff:ff:ff:ff';
      const bestMac = best.interfaces[0]?.mac || 'ff:ff:ff:ff:ff:ff';
      return mac < bestMac ? sw : best;
    }
    return best;
  });
}
function tbCalcPortRoles(switches, root) {
  const roles = [];
  switches.forEach(sw => {
    if (sw.id === root.id) {
      // Root bridge: all ports are designated (forwarding)
      sw.interfaces.filter(i => i.cableId).forEach(ifc => {
        roles.push({ deviceId: sw.id, port: ifc.name, role: 'forwarding' });
      });
      return;
    }
    // Non-root: find root port (port closest to root bridge)
    const connectedToRoot = sw.interfaces.filter(i => {
      if (!i.cableId) return false;
      const cable = tbState.cables.find(c => c.id === i.cableId);
      if (!cable) return false;
      const peerId = cable.from === sw.id ? cable.to : cable.from;
      return peerId === root.id;
    });
    let rootPort = connectedToRoot[0];
    if (!rootPort) {
      // Find port on path toward root (2-hop)
      rootPort = sw.interfaces.find(i => {
        if (!i.cableId) return false;
        const cable = tbState.cables.find(c => c.id === i.cableId);
        if (!cable) return false;
        const peerId = cable.from === sw.id ? cable.to : cable.from;
        const peer = tbState.devices.find(d => d.id === peerId);
        return peer && tbState.cables.some(c2 => (c2.from === peerId && c2.to === root.id) || (c2.to === peerId && c2.from === root.id));
      });
    }
    sw.interfaces.filter(i => i.cableId).forEach(ifc => {
      if (ifc === rootPort) {
        roles.push({ deviceId: sw.id, port: ifc.name, role: 'forwarding' }); // Root port
      } else {
        // Check if this is a designated or blocking port
        const cable = tbState.cables.find(c => c.id === ifc.cableId);
        const peerId = cable ? (cable.from === sw.id ? cable.to : cable.from) : null;
        const peer = tbState.devices.find(d => d.id === peerId);
        if (peer?.type?.indexOf('switch') >= 0 && peer.id !== root.id) {
          // Two non-root switches connected — one blocks
          const myPri = sw.stpConfig?.priority || 32768;
          const peerPri = peer?.stpConfig?.priority || 32768;
          roles.push({ deviceId: sw.id, port: ifc.name, role: myPri <= peerPri ? 'forwarding' : 'blocking' });
        } else {
          roles.push({ deviceId: sw.id, port: ifc.name, role: 'forwarding' }); // Designated
        }
      }
    });
  });
  return roles;
}

// ── QoS Enforcement ──
function tbQosClassify(dev, packetInfo) {
  if (!dev?.qosConfig?.enabled || !dev.qosConfig.policies?.length) return { queue: 'best-effort', dscp: 'default', policy: null };
  const policies = dev.qosConfig.policies;
  for (const pol of policies) {
    const match = pol.match || 'any';
    if (match === 'any') return { queue: pol.queue || 'best-effort', dscp: pol.dscp || 'default', policy: pol.name };
    // Match on protocol/port
    const parts = match.split(/\s+/);
    const proto = parts[0]?.toLowerCase();
    const port = parts[1];
    if (packetInfo.protocol?.toLowerCase().includes(proto)) return { queue: pol.queue || 'best-effort', dscp: pol.dscp || 'default', policy: pol.name };
    if (port && (packetInfo.dstPort === port || packetInfo.srcPort === port)) return { queue: pol.queue || 'best-effort', dscp: pol.dscp || 'default', policy: pol.name };
  }
  return { queue: 'best-effort', dscp: 'default', policy: null };
}
function tbQosEnqueue(classification) {
  // Priority queuing simulation — returns a delay factor
  const queueDelays = { priority: 0, bandwidth: 50, fair: 100, 'best-effort': 200 };
  return queueDelays[classification.queue] || 200;
}

// ── DHCP Tab ──
function tbRenderDhcpTab(dev) {
  const pool = dev.dhcpServer;
  if (!pool) {
    return `<div style="color:#64748b;font-size:11px;margin-bottom:8px">No DHCP pool configured.</div>
      <button class="btn btn-ghost" onclick="tbEnableDhcp()" style="font-size:11px">Enable DHCP Server</button>
      ${dev.type === 'router' ? `<div style="margin-top:16px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
        <label>DHCP Relay (ip helper-address)</label>
        <input type="text" value="${escHtml(dev.dhcpRelay?.helperAddress || '')}" onchange="tbSetDhcpRelay(this.value)" placeholder="e.g. 10.0.0.5">
        <div style="font-size:10px;color:#64748b">Forward DHCP Discover to a remote server.</div>
      </div>` : ''}`;
  }
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">DHCP Pool</div>
    <label>Pool Name</label><input type="text" value="${escHtml(pool.name||'')}" onchange="tbSetDhcpField('name',this.value)">
    <label>Network</label><input type="text" value="${escHtml(pool.network||'')}" onchange="tbSetDhcpField('network',this.value)" placeholder="192.168.1.0">
    <label>Mask</label><input type="text" value="${escHtml(pool.mask||'')}" onchange="tbSetDhcpField('mask',this.value)" placeholder="255.255.255.0">
    <label>Default Gateway</label><input type="text" value="${escHtml(pool.gateway||'')}" onchange="tbSetDhcpField('gateway',this.value)">
    <label>Range Start</label><input type="text" value="${escHtml(pool.rangeStart||'')}" onchange="tbSetDhcpField('rangeStart',this.value)" placeholder="192.168.1.100">
    <label>Range End</label><input type="text" value="${escHtml(pool.rangeEnd||'')}" onchange="tbSetDhcpField('rangeEnd',this.value)" placeholder="192.168.1.200">
    <label>DNS Server</label><input type="text" value="${escHtml(pool.dns||'')}" onchange="tbSetDhcpField('dns',this.value)" placeholder="8.8.8.8">
    <button class="btn btn-ghost" onclick="tbDisableDhcp()" style="margin-top:8px;font-size:11px;color:#ef4444">Disable DHCP</button>
    ${dev.type === 'router' ? `<div style="margin-top:12px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
      <label>DHCP Relay (ip helper-address)</label>
      <input type="text" value="${escHtml(dev.dhcpRelay?.helperAddress || '')}" onchange="tbSetDhcpRelay(this.value)" placeholder="e.g. 10.0.0.5">
    </div>` : ''}`;
}

function tbEnableDhcp() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  dev.dhcpServer = { name: 'POOL1', network: '', mask: '255.255.255.0', gateway: '', rangeStart: '', rangeEnd: '', dns: '8.8.8.8' };
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('dhcp');
}
function tbDisableDhcp() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  dev.dhcpServer = null;
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('dhcp');
}
function tbSetDhcpField(field, val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.dhcpServer) return;
  dev.dhcpServer[field] = val.trim();
  tbState.updated = Date.now(); tbSaveDraft();
}
function tbSetDhcpRelay(val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  dev.dhcpRelay = val.trim() ? { helperAddress: val.trim() } : null;
  tbState.updated = Date.now(); tbSaveDraft();
}

// ── CLI Tab ──
let tbCliHistory = [];
// ══════════════════════════════════════════
// CLOUD NETWORKING — Security Groups, NACLs, VPC, VPN/IPSec, SASE
// ══════════════════════════════════════════

function tbRenderSecurityGroupsTab(dev) {
  const sgs = dev.securityGroups || [];
  let html = '<div style="font-weight:600;font-size:12px;margin-bottom:8px">Security Groups <span style="font-weight:400;font-size:10px;color:#64748b">(stateful)</span></div>';
  if (!sgs.length) {
    html += '<div style="color:#64748b;font-size:11px;margin-bottom:8px">No security groups. Traffic is unrestricted.</div>';
  }
  sgs.forEach((sg, si) => {
    html += `<div class="tb-cloud-card">
      <div class="tb-cloud-card-head">
        <input type="text" value="${escHtml(sg.name)}" onchange="tbSetSgField(${si},'name',this.value)" style="flex:1;font-weight:600;font-size:11px;background:transparent;border:none;color:var(--text);padding:0">
        <button class="btn btn-ghost" onclick="tbRemoveSecurityGroup(${si})" style="font-size:10px;color:#ef4444;padding:2px 6px">&times;</button>
      </div>
      <table class="tb-sg-table"><thead><tr><th>Dir</th><th>Proto</th><th>Port</th><th>Source/Dest</th><th></th></tr></thead><tbody>`;
    sg.rules.forEach((r, ri) => {
      html += `<tr class="tb-sg-row-allow">
        <td><select onchange="tbSetSgRuleField(${si},${ri},'direction',this.value)" style="font-size:10px"><option value="inbound"${r.direction==='inbound'?' selected':''}>In</option><option value="outbound"${r.direction==='outbound'?' selected':''}>Out</option></select></td>
        <td><select onchange="tbSetSgRuleField(${si},${ri},'protocol',this.value)" style="font-size:10px"><option value="all"${r.protocol==='all'?' selected':''}>All</option><option value="tcp"${r.protocol==='tcp'?' selected':''}>TCP</option><option value="udp"${r.protocol==='udp'?' selected':''}>UDP</option><option value="icmp"${r.protocol==='icmp'?' selected':''}>ICMP</option></select></td>
        <td><input type="text" value="${escHtml(String(r.port||'all'))}" onchange="tbSetSgRuleField(${si},${ri},'port',this.value)" style="width:40px;font-size:10px"></td>
        <td><input type="text" value="${escHtml(r.source||r.destination||'0.0.0.0/0')}" onchange="tbSetSgRuleField(${si},${ri},'${r.direction==='inbound'?'source':'destination'}',this.value)" style="width:90px;font-size:10px"></td>
        <td><button class="btn btn-ghost" onclick="tbRemoveSgRule(${si},${ri})" style="font-size:9px;color:#ef4444;padding:1px 4px">&times;</button></td>
      </tr>`;
    });
    html += `</tbody></table>
      <div style="display:flex;gap:4px;margin-top:4px">
        <button class="btn btn-ghost" onclick="tbAddSgRule(${si},'inbound')" style="font-size:10px">+ Inbound</button>
        <button class="btn btn-ghost" onclick="tbAddSgRule(${si},'outbound')" style="font-size:10px">+ Outbound</button>
      </div>
    </div>`;
  });
  html += '<button class="btn btn-ghost" onclick="tbAddSecurityGroup()" style="font-size:11px;margin-top:8px">+ Add Security Group</button>';
  html += '<div style="font-size:9px;color:#64748b;margin-top:8px">Security Groups are <strong>stateful</strong> — return traffic is automatically allowed. Rules are allow-only (implicit deny-all).</div>';
  return html;
}

function tbAddSecurityGroup() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  dev.securityGroups.push({ name: `sg-${dev.securityGroups.length + 1}`, rules: [
    { direction: 'outbound', protocol: 'all', port: 'all', destination: '0.0.0.0/0', action: 'allow' }
  ]});
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('security-groups');
}
function tbRemoveSecurityGroup(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  dev.securityGroups.splice(idx, 1);
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('security-groups');
}
function tbAddSgRule(sgIdx, direction) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.securityGroups[sgIdx]) return;
  const r = { direction, protocol: 'tcp', port: '443', action: 'allow' };
  if (direction === 'inbound') r.source = '0.0.0.0/0'; else r.destination = '0.0.0.0/0';
  dev.securityGroups[sgIdx].rules.push(r);
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('security-groups');
}
function tbRemoveSgRule(sgIdx, ruleIdx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.securityGroups[sgIdx]) return;
  dev.securityGroups[sgIdx].rules.splice(ruleIdx, 1);
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('security-groups');
}
function tbSetSgField(sgIdx, field, val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.securityGroups[sgIdx]) return;
  dev.securityGroups[sgIdx][field] = val;
  tbState.updated = Date.now(); tbSaveDraft();
}
function tbSetSgRuleField(sgIdx, ruleIdx, field, val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.securityGroups[sgIdx] || !dev.securityGroups[sgIdx].rules[ruleIdx]) return;
  dev.securityGroups[sgIdx].rules[ruleIdx][field] = val;
  tbState.updated = Date.now(); tbSaveDraft();
}

// ── NACLs Tab (stateless, subnet-level) ──
function tbRenderNaclsTab(dev) {
  const nacls = dev.nacls || [];
  let html = '<div style="font-weight:600;font-size:12px;margin-bottom:8px">Network ACLs <span style="font-weight:400;font-size:10px;color:#64748b">(stateless)</span></div>';

  ['inbound', 'outbound'].forEach(dir => {
    const rules = nacls.filter(r => r.direction === dir).sort((a, b) => a.ruleNumber - b.ruleNumber);
    html += `<div style="font-weight:600;font-size:11px;margin:12px 0 4px;text-transform:capitalize">${dir} Rules</div>
      <table class="tb-sg-table"><thead><tr><th>#</th><th>Proto</th><th>Port</th><th>${dir === 'inbound' ? 'Source' : 'Dest'}</th><th>Action</th><th></th></tr></thead><tbody>`;
    rules.forEach((r, ri) => {
      const realIdx = nacls.indexOf(r);
      html += `<tr class="${r.action === 'allow' ? 'tb-sg-row-allow' : 'tb-nacl-row-deny'}">
        <td><input type="number" value="${r.ruleNumber}" onchange="tbSetNaclField(${realIdx},'ruleNumber',parseInt(this.value))" style="width:40px;font-size:10px"></td>
        <td><select onchange="tbSetNaclField(${realIdx},'protocol',this.value)" style="font-size:10px"><option value="all"${r.protocol==='all'?' selected':''}>All</option><option value="tcp"${r.protocol==='tcp'?' selected':''}>TCP</option><option value="udp"${r.protocol==='udp'?' selected':''}>UDP</option><option value="icmp"${r.protocol==='icmp'?' selected':''}>ICMP</option></select></td>
        <td><input type="text" value="${escHtml(String(r.port||'all'))}" onchange="tbSetNaclField(${realIdx},'port',this.value)" style="width:40px;font-size:10px"></td>
        <td><input type="text" value="${escHtml(r.source||r.destination||'0.0.0.0/0')}" onchange="tbSetNaclField(${realIdx},'${dir === 'inbound' ? 'source' : 'destination'}',this.value)" style="width:80px;font-size:10px"></td>
        <td><select onchange="tbSetNaclField(${realIdx},'action',this.value)" style="font-size:10px"><option value="allow"${r.action==='allow'?' selected':''}>Allow</option><option value="deny"${r.action==='deny'?' selected':''}>Deny</option></select></td>
        <td><button class="btn btn-ghost" onclick="tbRemoveNaclRule(${realIdx})" style="font-size:9px;color:#ef4444;padding:1px 4px">&times;</button></td>
      </tr>`;
    });
    // Implicit deny-all row (not editable)
    html += `<tr style="opacity:.4"><td>*</td><td>All</td><td>All</td><td>0.0.0.0/0</td><td>Deny</td><td></td></tr>`;
    html += `</tbody></table>
      <button class="btn btn-ghost" onclick="tbAddNaclRule('${dir}')" style="font-size:10px;margin-top:4px">+ Add ${dir} rule</button>`;
  });
  html += '<div style="font-size:9px;color:#64748b;margin-top:8px">NACLs are <strong>stateless</strong> — both inbound and outbound rules are evaluated independently. Rules are processed in order by rule number (lowest first, first match wins).</div>';
  return html;
}

function tbAddNaclRule(direction) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  const existing = dev.nacls.filter(r => r.direction === direction);
  const nextNum = existing.length ? Math.max(...existing.map(r => r.ruleNumber)) + 100 : 100;
  const r = { ruleNumber: nextNum, direction, protocol: 'tcp', port: '443', action: 'allow' };
  if (direction === 'inbound') r.source = '0.0.0.0/0'; else r.destination = '0.0.0.0/0';
  dev.nacls.push(r);
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('nacls');
}
function tbRemoveNaclRule(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  dev.nacls.splice(idx, 1);
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('nacls');
}
function tbSetNaclField(idx, field, val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.nacls[idx]) return;
  dev.nacls[idx][field] = val;
  tbState.updated = Date.now(); tbSaveDraft();
}

// ── VPC Config Tab ──
function tbRenderVpcConfigTab(dev) {
  const vpc = dev.vpcConfig || { cidr: '10.0.0.0/16', dnsSupport: true, dnsHostnames: true, flowLogs: false, tenancy: 'default', peerings: [] };
  if (!dev.vpcConfig) { dev.vpcConfig = vpc; tbState.updated = Date.now(); tbSaveDraft(); }
  if (!vpc.peerings) vpc.peerings = [];
  // Find other VPCs for peering
  const otherVpcs = tbState.devices.filter(d => d.type === 'vpc' && d.id !== dev.id);
  const peerHtml = vpc.peerings.map((p, i) => {
    const peerDev = tbState.devices.find(d => d.id === p.peerId);
    const statusDot = p.status === 'active' ? '#22c55e' : '#eab308';
    return `<div class="tb-cloud-card" style="padding:6px">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusDot}"></span>
        <span style="flex:1;font-size:11px;font-weight:600">${peerDev ? escHtml(peerDev.hostname) : 'Unknown'} ${peerDev?.vpcConfig ? '(' + peerDev.vpcConfig.cidr + ')' : ''}</span>
        <span style="font-size:9px;color:#64748b">${p.status}</span>
        <button class="btn btn-ghost" onclick="tbRemoveVpcPeering(${i})" style="font-size:9px;color:#ef4444;padding:1px 4px">&times;</button>
      </div>
    </div>`;
  }).join('');
  const peerOptions = otherVpcs.filter(v => !vpc.peerings.some(p => p.peerId === v.id))
    .map(v => `<option value="${v.id}">${escHtml(v.hostname)} ${v.vpcConfig ? '(' + v.vpcConfig.cidr + ')' : ''}</option>`).join('');
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">VPC Configuration</div>
    <label>CIDR Block</label>
    <input type="text" value="${escHtml(vpc.cidr)}" onchange="tbSetVpcField('cidr',this.value)" placeholder="10.0.0.0/16">
    <div style="font-size:9px;color:#64748b;margin-bottom:8px">/16 = 65,536 IPs &middot; /24 = 256 IPs &middot; /28 = 16 IPs</div>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" ${vpc.dnsSupport ? 'checked' : ''} onchange="tbSetVpcField('dnsSupport',this.checked)"> DNS Resolution Support</label>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" ${vpc.dnsHostnames ? 'checked' : ''} onchange="tbSetVpcField('dnsHostnames',this.checked)"> DNS Hostnames</label>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" ${vpc.flowLogs ? 'checked' : ''} onchange="tbSetVpcField('flowLogs',this.checked)"> VPC Flow Logs</label>
    <label>Tenancy</label>
    <select onchange="tbSetVpcField('tenancy',this.value)">
      <option value="default"${vpc.tenancy==='default' ? ' selected' : ''}>Default (shared)</option>
      <option value="dedicated"${vpc.tenancy==='dedicated' ? ' selected' : ''}>Dedicated</option>
    </select>
    <div style="margin-top:16px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
      <div style="font-weight:600;font-size:11px;margin-bottom:6px">VPC Peering Connections</div>
      ${peerHtml || '<div style="font-size:10px;color:#64748b;margin-bottom:6px">No peering connections.</div>'}
      ${peerOptions ? `<div style="display:flex;gap:4px;margin-top:6px">
        <select id="tb-vpc-peer-select" style="flex:1;font-size:10px"><option value="">Select VPC to peer with…</option>${peerOptions}</select>
        <button class="btn btn-ghost" onclick="tbAddVpcPeering()" style="font-size:10px">+ Peer</button>
      </div>` : '<div style="font-size:10px;color:#64748b">No other VPCs available for peering.</div>'}
      <div style="font-size:9px;color:#64748b;margin-top:4px">VPC Peering allows direct routing between VPCs without a Transit Gateway. Non-transitive — each pair must be peered individually.</div>
    </div>
    <div style="margin-top:12px;border-top:1px solid rgba(124,111,247,.15);padding-top:10px">
      <div style="font-weight:600;font-size:11px;margin-bottom:6px">Connected Subnets</div>
      ${tbState.devices.filter(d => d.type === 'cloud-subnet' && tbState.cables.some(c => (c.from === dev.id && c.to === d.id) || (c.from === d.id && c.to === dev.id)))
        .map(s => `<div class="tb-cloud-badge">${escHtml(s.hostname)} ${s.vpcConfig ? '(' + s.vpcConfig.cidr + ')' : ''}</div>`).join('') || '<div style="font-size:10px;color:#64748b">No subnets connected. Wire a Cloud Subnet to this VPC.</div>'}
    </div>`;
}
function tbSetVpcField(field, val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  if (!dev.vpcConfig) dev.vpcConfig = { cidr: '10.0.0.0/16', dnsSupport: true, dnsHostnames: true, flowLogs: false, tenancy: 'default', peerings: [] };
  dev.vpcConfig[field] = val;
  tbState.updated = Date.now(); tbSaveDraft();
}
function tbAddVpcPeering() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.vpcConfig) return;
  const sel = document.getElementById('tb-vpc-peer-select');
  if (!sel || !sel.value) return;
  const peerId = sel.value;
  const peerDev = tbState.devices.find(d => d.id === peerId);
  if (!peerDev) return;
  if (!dev.vpcConfig.peerings) dev.vpcConfig.peerings = [];
  if (!peerDev.vpcConfig) peerDev.vpcConfig = { cidr: '10.1.0.0/16', dnsSupport: true, dnsHostnames: true, flowLogs: false, tenancy: 'default', peerings: [] };
  if (!peerDev.vpcConfig.peerings) peerDev.vpcConfig.peerings = [];
  // Add peering on both sides
  dev.vpcConfig.peerings.push({ peerId, status: 'active' });
  peerDev.vpcConfig.peerings.push({ peerId: dev.id, status: 'active' });
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('vpc-config');
  showErrorToast(`VPC Peering established: ${dev.hostname} ↔ ${peerDev.hostname}`);
}
function tbRemoveVpcPeering(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.vpcConfig || !dev.vpcConfig.peerings) return;
  const peering = dev.vpcConfig.peerings[idx];
  if (peering) {
    // Remove reciprocal peering on the other VPC
    const peer = tbState.devices.find(d => d.id === peering.peerId);
    if (peer?.vpcConfig?.peerings) {
      peer.vpcConfig.peerings = peer.vpcConfig.peerings.filter(p => p.peerId !== dev.id);
    }
  }
  dev.vpcConfig.peerings.splice(idx, 1);
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('vpc-config');
}

// ── VPN / IPSec Tab ──
function tbRenderVpnTab(dev) {
  const vpn = dev.vpnConfig || { tunnelStatus: 'down', peerIp: '', psk: '', ikeVersion: 'IKEv2', encryption: 'AES-256', hashAlgo: 'SHA-256', dhGroup: 14, localSubnets: '', remoteSubnets: '' };
  if (!dev.vpnConfig) { dev.vpnConfig = vpn; tbState.updated = Date.now(); tbSaveDraft(); }
  const statusDot = vpn.tunnelStatus === 'up' ? '#22c55e' : vpn.tunnelStatus === 'negotiating' ? '#eab308' : '#ef4444';
  const statusLabel = vpn.tunnelStatus === 'up' ? 'UP' : vpn.tunnelStatus === 'negotiating' ? 'NEGOTIATING' : 'DOWN';
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">IPSec VPN Tunnel</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px;border-radius:6px;background:rgba(${vpn.tunnelStatus==='up'?'34,197,94':'239,68,68'},.1)">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${statusDot}"></span>
      <span style="font-weight:700;font-size:12px">${statusLabel}</span>
    </div>
    <label>Peer IP Address</label>
    <input type="text" value="${escHtml(vpn.peerIp)}" onchange="tbSetVpnField('peerIp',this.value)" placeholder="e.g. 203.0.113.1">
    <label>Pre-Shared Key</label>
    <input type="password" value="${escHtml(vpn.psk)}" onchange="tbSetVpnField('psk',this.value)" placeholder="Shared secret">
    <div style="font-weight:600;font-size:11px;margin:12px 0 6px">IKE Phase 1</div>
    <label>IKE Version</label>
    <select onchange="tbSetVpnField('ikeVersion',this.value)">
      <option value="IKEv1"${vpn.ikeVersion==='IKEv1' ? ' selected' : ''}>IKEv1</option>
      <option value="IKEv2"${vpn.ikeVersion==='IKEv2' ? ' selected' : ''}>IKEv2</option>
    </select>
    <label>Encryption</label>
    <select onchange="tbSetVpnField('encryption',this.value)">
      <option value="AES-128"${vpn.encryption==='AES-128' ? ' selected' : ''}>AES-128</option>
      <option value="AES-256"${vpn.encryption==='AES-256' ? ' selected' : ''}>AES-256</option>
      <option value="3DES"${vpn.encryption==='3DES' ? ' selected' : ''}>3DES (legacy)</option>
    </select>
    <label>Hash Algorithm</label>
    <select onchange="tbSetVpnField('hashAlgo',this.value)">
      <option value="SHA-1"${vpn.hashAlgo==='SHA-1' ? ' selected' : ''}>SHA-1 (weak)</option>
      <option value="SHA-256"${vpn.hashAlgo==='SHA-256' ? ' selected' : ''}>SHA-256</option>
      <option value="SHA-384"${vpn.hashAlgo==='SHA-384' ? ' selected' : ''}>SHA-384</option>
    </select>
    <label>DH Group</label>
    <select onchange="tbSetVpnField('dhGroup',parseInt(this.value))">
      <option value="2"${vpn.dhGroup===2 ? ' selected' : ''}>Group 2 (1024-bit, weak)</option>
      <option value="5"${vpn.dhGroup===5 ? ' selected' : ''}>Group 5 (1536-bit)</option>
      <option value="14"${vpn.dhGroup===14 ? ' selected' : ''}>Group 14 (2048-bit)</option>
      <option value="19"${vpn.dhGroup===19 ? ' selected' : ''}>Group 19 (256-bit ECP)</option>
      <option value="20"${vpn.dhGroup===20 ? ' selected' : ''}>Group 20 (384-bit ECP)</option>
    </select>
    <div style="font-weight:600;font-size:11px;margin:12px 0 6px">Phase 2 — Traffic Selectors</div>
    <label>Local Subnets</label>
    <input type="text" value="${escHtml(vpn.localSubnets)}" onchange="tbSetVpnField('localSubnets',this.value)" placeholder="10.0.0.0/16">
    <label>Remote Subnets</label>
    <input type="text" value="${escHtml(vpn.remoteSubnets)}" onchange="tbSetVpnField('remoteSubnets',this.value)" placeholder="192.168.0.0/24">
    <button class="btn btn-ghost" onclick="tbNegotiateVpn()" style="margin-top:12px;font-size:11px;width:100%">Negotiate Tunnel</button>`;
}
function tbSetVpnField(field, val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  if (!dev.vpnConfig) dev.vpnConfig = { tunnelStatus: 'down', peerIp: '', psk: '', ikeVersion: 'IKEv2', encryption: 'AES-256', hashAlgo: 'SHA-256', dhGroup: 14, localSubnets: '', remoteSubnets: '' };
  dev.vpnConfig[field] = val;
  tbState.updated = Date.now(); tbSaveDraft();
}
function tbNegotiateVpn() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.vpnConfig) return;
  // Find peer device (connected vpg or onprem-dc)
  const peerTypes = dev.type === 'vpg' ? ['onprem-dc'] : ['vpg'];
  let peer = null;
  for (const c of tbState.cables) {
    const otherId = c.from === dev.id ? c.to : c.to === dev.id ? c.from : null;
    if (!otherId) continue;
    const other = tbState.devices.find(d => d.id === otherId);
    if (other && peerTypes.indexOf(other.type) >= 0) { peer = other; break; }
  }
  if (!peer) { showErrorToast('No VPN peer found. Wire this device to a ' + peerTypes.join('/') + '.'); return; }
  if (!peer.vpnConfig) { showErrorToast(`${peer.hostname} has no VPN config. Double-click it and configure VPN first.`); return; }
  const result = tbCheckVpnTunnel(dev, peer);
  dev.vpnConfig.tunnelStatus = result.up ? 'up' : 'down';
  peer.vpnConfig.tunnelStatus = result.up ? 'up' : 'down';
  tbState.updated = Date.now(); tbSaveDraft();
  if (result.up) {
    showErrorToast(`VPN tunnel UP between ${dev.hostname} and ${peer.hostname}`);
    tbAnimatePacket(tbState, dev.id, peer.id, true);
  } else {
    showErrorToast(`VPN tunnel FAILED: ${result.reason}`);
    tbAnimatePacket(tbState, dev.id, peer.id, false);
  }
  tbSwitchConfigTab('vpn');
}
function tbCheckVpnTunnel(dev, peer) {
  const a = dev.vpnConfig, b = peer.vpnConfig;
  if (!a || !b) return { up: false, reason: 'Missing VPN config on one or both endpoints' };
  if (!a.psk || !b.psk) return { up: false, reason: 'Pre-shared key not set on both endpoints' };
  if (a.psk !== b.psk) return { up: false, reason: 'Pre-shared key mismatch' };
  if (a.ikeVersion !== b.ikeVersion) return { up: false, reason: 'IKE version mismatch (' + a.ikeVersion + ' vs ' + b.ikeVersion + ')' };
  if (a.encryption !== b.encryption) return { up: false, reason: 'Encryption mismatch (' + a.encryption + ' vs ' + b.encryption + ')' };
  if (a.hashAlgo !== b.hashAlgo) return { up: false, reason: 'Hash algorithm mismatch (' + a.hashAlgo + ' vs ' + b.hashAlgo + ')' };
  if (a.dhGroup !== b.dhGroup) return { up: false, reason: 'DH group mismatch (' + a.dhGroup + ' vs ' + b.dhGroup + ')' };
  return { up: true, reason: 'Tunnel established — crypto parameters match' };
}

// ── SASE Tab ──
function tbRenderSaseTab(dev) {
  const sase = dev.saseConfig || { ztnaPolicy: 'verify-always', swgEnabled: true, casbEnabled: false, fwaasPolicies: [], identityProvider: '', mfaRequired: true };
  if (!dev.saseConfig) { dev.saseConfig = sase; tbState.updated = Date.now(); tbSaveDraft(); }
  let fwaasHtml = '';
  sase.fwaasPolicies.forEach((p, i) => {
    fwaasHtml += `<tr class="${p.action === 'allow' ? 'tb-sg-row-allow' : 'tb-nacl-row-deny'}">
      <td><select onchange="tbSetFwaasField(${i},'protocol',this.value)" style="font-size:10px"><option value="all"${p.protocol==='all'?' selected':''}>All</option><option value="tcp"${p.protocol==='tcp'?' selected':''}>TCP</option><option value="udp"${p.protocol==='udp'?' selected':''}>UDP</option></select></td>
      <td><input type="text" value="${escHtml(String(p.port||'all'))}" onchange="tbSetFwaasField(${i},'port',this.value)" style="width:40px;font-size:10px"></td>
      <td><input type="text" value="${escHtml(p.source||'0.0.0.0/0')}" onchange="tbSetFwaasField(${i},'source',this.value)" style="width:80px;font-size:10px"></td>
      <td><select onchange="tbSetFwaasField(${i},'action',this.value)" style="font-size:10px"><option value="allow"${p.action==='allow'?' selected':''}>Allow</option><option value="deny"${p.action==='deny'?' selected':''}>Deny</option></select></td>
      <td><button class="btn btn-ghost" onclick="tbRemoveFwaas(${i})" style="font-size:9px;color:#ef4444;padding:1px 4px">&times;</button></td>
    </tr>`;
  });
  return `<div style="font-weight:600;font-size:12px;margin-bottom:8px">SASE — Secure Access Service Edge</div>
    <label>ZTNA Policy (Zero Trust Network Access)</label>
    <select onchange="tbSetSaseField('ztnaPolicy',this.value)">
      <option value="verify-always"${sase.ztnaPolicy==='verify-always' ? ' selected' : ''}>Verify Always (strictest)</option>
      <option value="verify-once"${sase.ztnaPolicy==='verify-once' ? ' selected' : ''}>Verify Once per Session</option>
      <option value="disabled"${sase.ztnaPolicy==='disabled' ? ' selected' : ''}>Disabled</option>
    </select>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-top:8px"><input type="checkbox" ${sase.swgEnabled ? 'checked' : ''} onchange="tbSetSaseField('swgEnabled',this.checked)"> Secure Web Gateway (SWG)</label>
    <div style="font-size:9px;color:#64748b;margin-bottom:4px">Inspects outbound web traffic, blocks malicious URLs</div>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" ${sase.casbEnabled ? 'checked' : ''} onchange="tbSetSaseField('casbEnabled',this.checked)"> Cloud Access Security Broker (CASB)</label>
    <div style="font-size:9px;color:#64748b;margin-bottom:4px">Monitors SaaS app usage, enforces data policies</div>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" ${sase.mfaRequired ? 'checked' : ''} onchange="tbSetSaseField('mfaRequired',this.checked)"> MFA Required</label>
    <label>Identity Provider</label>
    <input type="text" value="${escHtml(sase.identityProvider)}" onchange="tbSetSaseField('identityProvider',this.value)" placeholder="e.g. Okta, Azure AD, Auth0">
    <div style="font-weight:600;font-size:11px;margin:12px 0 6px">FWaaS — Firewall as a Service</div>
    <table class="tb-sg-table"><thead><tr><th>Proto</th><th>Port</th><th>Source</th><th>Action</th><th></th></tr></thead><tbody>
      ${fwaasHtml}
    </tbody></table>
    <button class="btn btn-ghost" onclick="tbAddFwaas()" style="font-size:10px;margin-top:4px">+ Add FWaaS Rule</button>`;
}
function tbSetSaseField(field, val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  if (!dev.saseConfig) dev.saseConfig = { ztnaPolicy: 'verify-always', swgEnabled: true, casbEnabled: false, fwaasPolicies: [], identityProvider: '', mfaRequired: true };
  dev.saseConfig[field] = val;
  tbState.updated = Date.now(); tbSaveDraft();
}
function tbAddFwaas() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.saseConfig) return;
  dev.saseConfig.fwaasPolicies.push({ protocol: 'tcp', port: '443', source: '0.0.0.0/0', action: 'allow' });
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('sase');
}
function tbRemoveFwaas(idx) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.saseConfig) return;
  dev.saseConfig.fwaasPolicies.splice(idx, 1);
  tbState.updated = Date.now(); tbSaveDraft(); tbSwitchConfigTab('sase');
}
function tbSetFwaasField(idx, field, val) {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev || !dev.saseConfig || !dev.saseConfig.fwaasPolicies[idx]) return;
  dev.saseConfig.fwaasPolicies[idx][field] = val;
  tbState.updated = Date.now(); tbSaveDraft();
}

// ── Security Group / NACL Evaluation (used by ping simulation) ──
function tbCidrContains(cidr, ip) {
  if (!cidr || cidr === '0.0.0.0/0') return true;
  const parts = cidr.split('/');
  if (parts.length !== 2) return false;
  const netArr = tbIpToArr(parts[0]);
  const ipArr = tbIpToArr(ip);
  if (!netArr || !ipArr) return false;
  const bits = parseInt(parts[1]);
  const mask = bits === 0 ? 0 : (~((1 << (32 - bits)) - 1)) >>> 0;
  const netInt = (netArr[0] << 24 | netArr[1] << 16 | netArr[2] << 8 | netArr[3]) >>> 0;
  const ipInt = (ipArr[0] << 24 | ipArr[1] << 16 | ipArr[2] << 8 | ipArr[3]) >>> 0;
  return (netInt & mask) === (ipInt & mask);
}

function tbEvalSecurityGroups(dev, protocol, port, srcIp, direction) {
  if (!dev.securityGroups || !dev.securityGroups.length) return { allowed: true, matchedRule: null, sgName: 'none' };
  for (const sg of dev.securityGroups) {
    for (const rule of sg.rules) {
      if (rule.direction !== direction) continue;
      if (rule.protocol !== 'all' && rule.protocol !== protocol) continue;
      if (rule.port !== 'all' && String(rule.port) !== String(port)) continue;
      const cidrField = direction === 'inbound' ? rule.source : rule.destination;
      if (tbCidrContains(cidrField, srcIp)) {
        return { allowed: true, matchedRule: rule, sgName: sg.name };
      }
    }
  }
  return { allowed: false, matchedRule: null, sgName: dev.securityGroups[0]?.name || '?' };
}

function tbEvalNacl(dev, protocol, port, srcIp, direction) {
  if (!dev.nacls || !dev.nacls.length) return { allowed: true, matchedRule: null };
  const rules = dev.nacls.filter(r => r.direction === direction).sort((a, b) => a.ruleNumber - b.ruleNumber);
  for (const rule of rules) {
    if (rule.protocol !== 'all' && rule.protocol !== protocol) continue;
    if (rule.port !== 'all' && String(rule.port) !== String(port)) continue;
    const cidrField = direction === 'inbound' ? rule.source : rule.destination;
    if (tbCidrContains(cidrField, srcIp)) {
      return { allowed: rule.action === 'allow', matchedRule: rule };
    }
  }
  return { allowed: false, matchedRule: null };
}

function tbRenderCliTab(dev) {
  const output = tbCliHistory.length ? tbCliHistory.join('\n') : `${dev.hostname || '?'}# Type a command below\n\nAvailable commands:\n  show arp\n  show ip route\n  show mac address-table\n  show vlan brief\n  show interfaces\n  show ip interface brief\n  ping <ip>\n  arp <ip>`;
  return `<div class="tb-cli-output" id="tb-cli-output">${escHtml(output)}</div>
    <div class="tb-cli-input-row">
      <input type="text" id="tb-cli-input" placeholder="${dev.hostname || '?'}#" onkeydown="if(event.key==='Enter')tbCliExec()">
      <button class="btn btn-ghost" onclick="tbCliExec()">Run</button>
    </div>`;
}

function tbCliExec() {
  const dev = tbState.devices.find(d => d.id === tbConfigPanelDeviceId);
  if (!dev) return;
  const input = document.getElementById('tb-cli-input');
  if (!input) return;
  const cmd = input.value.trim().toLowerCase();
  input.value = '';
  if (!cmd) return;
  const prompt = `${dev.hostname || '?'}# `;
  tbCliHistory.push(prompt + cmd);
  tbCliHistory.push(tbProcessCliCommand(dev, cmd));
  // Keep last 80 lines
  if (tbCliHistory.length > 80) tbCliHistory = tbCliHistory.slice(-80);
  const out = document.getElementById('tb-cli-output');
  if (out) { out.textContent = tbCliHistory.join('\n'); out.scrollTop = out.scrollHeight; }
}

function tbProcessCliCommand(dev, cmd) {
  if (cmd === 'show arp' || cmd === 'show arp table') {
    if (!dev.arpTable.length) return 'ARP table is empty. Run a ping first.';
    const hdr = 'Protocol  Address         Age  Hardware Addr     Type\n';
    return hdr + dev.arpTable.map(e => `Internet  ${(e.ip||'').padEnd(15)} ${String(e.age||0).padEnd(4)} ${e.mac}   ARPA`).join('\n');
  }
  if (cmd === 'show ip route') {
    if (!dev.routingTable.length) return 'No routes. Assign IPs to interfaces first.';
    return dev.routingTable.map(r => {
      const code = r.type === 'connected' ? 'C' : 'S';
      return `${code}    ${r.network}/${tbMaskToCidr(r.mask)} via ${r.nextHop || r.iface}`;
    }).join('\n');
  }
  if (cmd === 'show mac address-table' || cmd === 'show mac-address-table') {
    if (!dev.macTable.length) return 'MAC address table is empty.';
    const hdr = 'VLAN  MAC Address       Type    Port\n';
    return hdr + dev.macTable.map(e => `${String(e.vlan).padEnd(5)} ${e.mac}  dynamic ${e.port}`).join('\n');
  }
  if (cmd === 'show vlan brief' || cmd === 'show vlans') {
    if (!dev.vlanDb || !dev.vlanDb.length) return 'No VLAN database (not a switch).';
    const hdr = 'VLAN  Name                 Ports\n' + '----  ----                 -----\n';
    return hdr + dev.vlanDb.map(v => {
      const ports = dev.interfaces.filter(ifc => ifc.mode === 'access' && ifc.vlan === v.id).map(p=>p.name).join(', ');
      return `${String(v.id).padEnd(5)} ${(v.name||'').padEnd(20)} ${ports}`;
    }).join('\n');
  }
  if (cmd === 'show interfaces' || cmd === 'show ip interface brief') {
    const hdr = 'Interface       IP Address      Status  VLAN  Mode\n';
    return hdr + dev.interfaces.map(ifc => {
      return `${(ifc.name||'').padEnd(15)} ${(ifc.ip||'unassigned').padEnd(15)} ${ifc.enabled?'up  ':'down'} ${String(ifc.vlan).padEnd(5)} ${ifc.mode}`;
    }).join('\n');
  }
  if (cmd.startsWith('ping ')) {
    const dstIp = cmd.slice(5).trim();
    if (!dstIp) return 'Usage: ping <ip>';
    const result = tbSimPing(tbState, dev.id, dstIp);
    return result.log.join('\n');
  }
  if (cmd.startsWith('arp ')) {
    const targetIp = cmd.slice(4).trim();
    if (!targetIp) return 'Usage: arp <ip>';
    const result = tbSimARP(tbState, dev.id, targetIp);
    return result.log.join('\n');
  }
  // traceroute — hop-by-hop path to destination
  if (cmd.startsWith('traceroute ') || cmd.startsWith('tracert ')) {
    const dstIp = cmd.split(' ').slice(1).join(' ').trim();
    if (!dstIp) return 'Usage: traceroute <ip>';
    return tbTraceroute(dev, dstIp);
  }
  // ipconfig / ifconfig — show interface configuration
  if (cmd === 'ipconfig' || cmd === 'ifconfig' || cmd === 'ipconfig /all' || cmd === 'ifconfig -a') {
    let out = '';
    dev.interfaces.forEach(ifc => {
      const status = ifc.enabled ? (ifc.cableId ? 'up' : 'down (no cable)') : 'admin down';
      out += `\n${ifc.name}:\n`;
      out += `  Status:       ${status}\n`;
      out += `  IPv4 Address: ${ifc.ip || 'Not configured'}\n`;
      out += `  Subnet Mask:  ${ifc.mask || '—'}\n`;
      out += `  MAC Address:  ${ifc.mac}\n`;
      out += `  Default GW:   ${ifc.gateway || '—'}\n`;
      out += `  VLAN:         ${ifc.vlan}  Mode: ${ifc.mode}\n`;
    });
    if (dev.dhcpServer) out += `\nDHCP Server: Enabled (pool ${dev.dhcpServer.rangeStart} - ${dev.dhcpServer.rangeEnd})\n`;
    return out.trim();
  }
  // netstat — show connections and listening ports
  if (cmd === 'netstat' || cmd === 'netstat -an' || cmd === 'ss -tuln') {
    let out = 'Proto  Local Address          Foreign Address        State\n';
    out +=    '-----  -------------------    -------------------    -----\n';
    dev.interfaces.forEach(ifc => {
      if (ifc.ip && ifc.enabled && ifc.cableId) {
        // Simulate common listening services based on device type
        if (dev.type === 'server' || dev.type === 'public-web') {
          out += `tcp    ${ifc.ip}:80             0.0.0.0:*              LISTEN\n`;
          out += `tcp    ${ifc.ip}:443            0.0.0.0:*              LISTEN\n`;
        }
        if (dev.type === 'server' || dev.type === 'public-file') {
          out += `tcp    ${ifc.ip}:22             0.0.0.0:*              LISTEN\n`;
          out += `tcp    ${ifc.ip}:21             0.0.0.0:*              LISTEN\n`;
        }
        if (dev.dhcpServer) {
          out += `udp    ${ifc.ip}:67             0.0.0.0:*              LISTEN\n`;
        }
        if (dev.type === 'router' || dev.type === 'firewall') {
          out += `udp    ${ifc.ip}:161            0.0.0.0:*              LISTEN\n`;
          out += `tcp    ${ifc.ip}:22             0.0.0.0:*              LISTEN\n`;
        }
        if (dev.type === 'voip') {
          out += `udp    ${ifc.ip}:5060           0.0.0.0:*              LISTEN\n`;
        }
        if (dev.type === 'printer') {
          out += `tcp    ${ifc.ip}:9100           0.0.0.0:*              LISTEN\n`;
          out += `tcp    ${ifc.ip}:631            0.0.0.0:*              LISTEN\n`;
        }
        // Show ARP-established connections
        dev.arpTable.forEach(a => {
          out += `tcp    ${ifc.ip}:${30000 + Math.floor(Math.random()*20000)}       ${a.ip}:80              ESTABLISHED\n`;
        });
      }
    });
    return out.trim();
  }
  // Cloud CLI commands
  if (cmd === 'show security-groups' || cmd === 'show sg') {
    if (!dev.securityGroups?.length) return 'No security groups configured.';
    let out = '';
    dev.securityGroups.forEach(sg => {
      out += `\nSecurity Group: ${sg.name}\n`;
      out += 'Dir       Proto  Port   Source/Dest        Action\n';
      out += '--------  -----  -----  -----------------  ------\n';
      sg.rules.forEach(r => {
        out += `${(r.direction||'').padEnd(9)} ${(r.protocol||'all').padEnd(6)} ${String(r.port||'all').padEnd(6)} ${(r.source||r.destination||'').padEnd(18)} ${r.action}\n`;
      });
    });
    return out.trim();
  }
  if (cmd === 'show nacl' || cmd === 'show nacls' || cmd === 'show network-acl') {
    if (!dev.nacls?.length) return 'No NACLs configured.';
    let out = 'Rule#  Dir       Proto  Port   Source/Dest        Action\n';
    out +=    '-----  --------  -----  -----  -----------------  ------\n';
    [...dev.nacls].sort((a,b) => a.ruleNumber - b.ruleNumber).forEach(r => {
      out += `${String(r.ruleNumber).padEnd(6)} ${(r.direction||'').padEnd(9)} ${(r.protocol||'all').padEnd(6)} ${String(r.port||'all').padEnd(6)} ${(r.source||r.destination||'').padEnd(18)} ${r.action}\n`;
    });
    out += '*      inbound   All    All    0.0.0.0/0          deny\n';
    out += '*      outbound  All    All    0.0.0.0/0          deny\n';
    return out.trim();
  }
  if (cmd === 'show vpn-status' || cmd === 'show vpn' || cmd === 'show crypto') {
    if (!dev.vpnConfig) return 'No VPN configuration on this device.';
    const v = dev.vpnConfig;
    return `VPN/IPSec Tunnel Status\n` +
      `  Tunnel:     ${v.tunnelStatus === 'up' ? 'UP' : v.tunnelStatus === 'negotiating' ? 'NEGOTIATING' : 'DOWN'}\n` +
      `  Peer IP:    ${v.peerIp || 'Not set'}\n` +
      `  IKE:        ${v.ikeVersion}\n` +
      `  Encryption: ${v.encryption}\n` +
      `  Hash:       ${v.hashAlgo}\n` +
      `  DH Group:   ${v.dhGroup}\n` +
      `  Local:      ${v.localSubnets || '—'}\n` +
      `  Remote:     ${v.remoteSubnets || '—'}`;
  }
  if (cmd === 'show sase' || cmd === 'show ztna') {
    if (!dev.saseConfig) return 'No SASE configuration on this device.';
    const s = dev.saseConfig;
    return `SASE Edge Configuration\n` +
      `  ZTNA Policy:  ${s.ztnaPolicy}\n` +
      `  SWG:          ${s.swgEnabled ? 'Enabled' : 'Disabled'}\n` +
      `  CASB:         ${s.casbEnabled ? 'Enabled' : 'Disabled'}\n` +
      `  MFA:          ${s.mfaRequired ? 'Required' : 'Optional'}\n` +
      `  IdP:          ${s.identityProvider || '—'}\n` +
      `  FWaaS Rules:  ${s.fwaasPolicies?.length || 0}`;
  }
  // VXLAN
  if (cmd === 'show vxlan' || cmd === 'show nve' || cmd === 'show vxlan vtep') {
    if (!dev.vxlanConfig || dev.vxlanConfig.length === 0) return 'No VXLAN tunnels configured on this device.';
    return dev.vxlanConfig.map(t =>
      `VNI ${t.vni}\n` +
      `  VTEP Source:   ${t.vtepIp || '—'}\n` +
      `  Mapped VLAN:   ${t.mappedVlan || '—'}\n` +
      `  Multicast:     ${t.mcastGroup || '—'}\n` +
      `  Remote VTEPs:  ${(t.remoteVteps || []).join(', ') || 'none'}\n` +
      `  Flood&Learn:   ${t.floodAndLearn ? 'Yes' : 'No'}\n` +
      `  BGP EVPN:      ${t.bgpEvpn ? 'Enabled' : 'Disabled'}`
    ).join('\n\n');
  }
  // STP
  if (cmd === 'show spanning-tree' || cmd === 'show stp') {
    const stp = dev.stpConfig;
    if (!stp) return 'STP not configured on this device.';
    const portLines = Object.entries(stp.portStates || {}).map(([name, state]) =>
      `  ${name.padEnd(10)} ${state.toUpperCase()}`).join('\n') || '  (no port states)';
    return `Spanning Tree Protocol: ${(stp.mode || 'rstp').toUpperCase()}\n` +
      `Bridge Priority: ${stp.priority}\nBridge ID: ${stp.priority}.${dev.interfaces[0]?.mac || '?'}\n` +
      `Root Bridge: ${stp.priority <= 4096 ? 'THIS BRIDGE IS ROOT' : 'unknown'}\n\nPort States:\n${portLines}`;
  }
  // OSPF
  if (cmd === 'show ip ospf' || cmd === 'show ospf' || cmd === 'show ip ospf neighbor') {
    const ospf = dev.ospfConfig;
    if (!ospf || !ospf.enabled) return 'OSPF is not enabled on this device.';
    let out = `OSPF Router ID: ${ospf.routerId || '(not set)'}\nAreas: ${ospf.areas.map(a => `Area ${a.id} [${(a.networks||[]).join(', ')}]`).join(', ') || 'none'}\n`;
    if (cmd.includes('neighbor')) {
      out += '\nNeighbor ID       State       Address         Interface\n';
      tbState.cables.filter(c => c.from === dev.id || c.to === dev.id).forEach(c => {
        const peerId = c.from === dev.id ? c.to : c.from;
        const peer = tbState.devices.find(d => d.id === peerId);
        if (peer?.ospfConfig?.enabled) {
          const peerIp = peer.interfaces.find(i => i.ip)?.ip || '?';
          const localIfc = dev.interfaces.find(i => i.cableId === c.id);
          out += `${(peer.ospfConfig.routerId || '?').padEnd(18)}FULL        ${peerIp.padEnd(16)}${localIfc?.name || '?'}\n`;
        }
      });
    }
    return out;
  }
  // QoS
  if (cmd === 'show qos' || cmd === 'show policy-map' || cmd === 'show mls qos') {
    const qos = dev.qosConfig;
    if (!qos || !qos.enabled) return 'QoS is not enabled on this device.';
    if (!qos.policies.length) return 'QoS enabled but no policies configured.';
    return 'QoS Policies:\n' + qos.policies.map(p =>
      `  Policy: ${p.name || '(unnamed)'}\n    Match: ${p.match || 'any'}\n    DSCP: ${(p.dscp||'default').toUpperCase()}\n    Queue: ${p.queue || 'best-effort'}`
    ).join('\n\n');
  }
  // Wireless
  if (cmd === 'show wireless' || cmd === 'show ap' || cmd === 'show wlan') {
    const wc = dev.wirelessConfig;
    if (!wc) return 'No wireless configuration on this device.';
    return `SSID:     ${wc.ssid || '(not set)'}\nSecurity: ${(wc.security || 'open').toUpperCase()}\nMode:     ${wc.mode || '802.11ax'}\nBand:     ${wc.band || '5ghz'}\nChannel:  ${wc.channel || 'auto'}\nTX Power: ${wc.txPower || 'auto'}`;
  }
  // DNS
  if (cmd === 'show dns' || cmd === 'show dns records' || cmd === 'show zone') {
    if (!dev.dnsRecords || !dev.dnsRecords.length) return 'No DNS records configured on this device.';
    const header = 'TYPE   NAME                 VALUE                          TTL\n' + '─'.repeat(70);
    const rows = dev.dnsRecords.map(r =>
      `${(r.type||'A').padEnd(7)}${(r.name||'').padEnd(21)}${(r.value||'').padEnd(31)}${r.ttl||3600}`
    ).join('\n');
    return header + '\n' + rows;
  }
  // nslookup / dig (queries DNS servers in the topology)
  if (cmd.startsWith('nslookup ') || cmd.startsWith('dig ')) {
    const query = cmd.replace(/^(nslookup|dig)\s+/, '').trim();
    const dnsServers = tbState.devices.filter(d => (d.type === 'dns-server' || d.type === 'server') && d.dnsRecords && d.dnsRecords.length > 0);
    if (!dnsServers.length) return `Server:  (no DNS server in topology)\n\n*** Can't find ${query}: No DNS server configured`;
    for (const srv of dnsServers) {
      const match = srv.dnsRecords.find(r => r.name === query || r.name === query + '.');
      if (match) {
        const srvIp = srv.interfaces.find(i => i.ip)?.ip || '?';
        return `Server:  ${srvIp}\nName:    ${match.name}\nType:    ${match.type}\nValue:   ${match.value}\nTTL:     ${match.ttl || 3600}`;
      }
    }
    return `Server:  ${dnsServers[0].interfaces.find(i => i.ip)?.ip || '?'}\n\n*** Can't find ${query}: Non-existent domain (NXDOMAIN)`;
  }
  // IPv6
  if (cmd === 'show ipv6 interface' || cmd === 'show ipv6 interface brief') {
    const lines = dev.interfaces.filter(i => i.ipv6).map(i =>
      `${i.name.padEnd(12)} ${i.ipv6}/${i.ipv6Prefix || 64}  ${i.enabled ? 'up' : 'down'}`);
    return lines.length ? 'Interface    IPv6 Address                      Status\n' + lines.join('\n') : 'No IPv6 addresses configured.';
  }
  if (cmd === 'show ipv6 route') {
    const v6Routes = dev.interfaces.filter(i => i.ipv6).map(i => `C  ${i.ipv6}/${i.ipv6Prefix || 64} directly connected, ${i.name}`);
    return v6Routes.length ? 'IPv6 Routing Table:\n' + v6Routes.join('\n') : 'No IPv6 routes.';
  }
  // BGP
  if (cmd === 'show ip bgp' || cmd === 'show ip bgp summary' || cmd === 'show bgp') {
    const bgp = dev.bgpConfig;
    if (!bgp || !bgp.enabled) return 'BGP is not enabled on this device.';
    let out = `BGP Router ID: ${bgp.routerId || '(not set)'}, local AS: ${bgp.asn || '?'}\n`;
    if (cmd.includes('summary')) {
      out += '\nNeighbor         AS      State         PfxRcvd\n';
      out += '───────────────  ──────  ────────────  ───────\n';
      bgp.neighbors.forEach(n => {
        out += `${(n.ip||'?').padEnd(17)}${String(n.remoteAs||'?').padEnd(8)}${(n.state||'Idle').padEnd(14)}${n.state==='Established'?'1':'0'}\n`;
      });
    } else {
      out += `Status: ${bgp.enabled ? 'Active' : 'Inactive'}\n`;
      out += `Networks: ${bgp.networks.join(', ') || 'none'}\n`;
      out += `Neighbors: ${bgp.neighbors.length}\n`;
      bgp.neighbors.forEach(n => {
        out += `  ${n.ip} (AS ${n.remoteAs}) — ${n.type.toUpperCase()} — ${n.state || 'Idle'}\n`;
      });
    }
    return out;
  }
  // EIGRP
  if (cmd === 'show ip eigrp neighbors' || cmd === 'show eigrp neighbors') {
    const eigrp = dev.eigrpConfig;
    if (!eigrp || !eigrp.enabled) return 'EIGRP is not enabled on this device.';
    let out = `EIGRP AS ${eigrp.asn}\n\nNeighbor       Interface    Uptime\n───────────────────────────────────\n`;
    tbState.cables.filter(c => c.from === dev.id || c.to === dev.id).forEach(c => {
      const peerId = c.from === dev.id ? c.to : c.from;
      const peer = tbState.devices.find(d => d.id === peerId);
      if (peer?.eigrpConfig?.enabled && peer.eigrpConfig.asn === eigrp.asn) {
        const peerIp = peer.interfaces.find(i => i.ip)?.ip || '?';
        const localIfc = dev.interfaces.find(i => i.cableId === c.id);
        out += `${peerIp.padEnd(15)}${(localIfc?.name||'?').padEnd(13)}${Math.floor(Math.random()*60)}min\n`;
      }
    });
    return out;
  }
  if (cmd === 'show ip eigrp topology' || cmd === 'show eigrp topology') {
    const eigrp = dev.eigrpConfig;
    if (!eigrp || !eigrp.enabled) return 'EIGRP is not enabled on this device.';
    let out = `EIGRP Topology Table for AS ${eigrp.asn}\n\nP = Passive, A = Active\n\n`;
    (eigrp.networks || []).forEach(net => {
      out += `P ${net.network}/${net.wildcard === '0.0.0.255' ? '24' : '?'}, 1 successors, FD is 28160\n`;
      out += `        via Connected, ${dev.interfaces.find(i => i.ip)?.name || '?'}\n`;
    });
    return out;
  }
  // DNSSEC dig
  if (cmd.startsWith('dig +dnssec ')) {
    const query = cmd.replace('dig +dnssec ', '').trim();
    const result = tbValidateDnssecChain(query);
    let out = `;; DNSSEC validation for ${query}\n`;
    if (result.valid) {
      out += `;; flags: qr rd ra ad; QUERY: 1, ANSWER: 1\n;; AD flag: SET (Authenticated Data)\n\n`;
      result.chain.forEach(c => {
        out += `;; ${c.server}: ${c.record || 'no record'} [${c.status.toUpperCase()}]\n`;
        if (c.hasRrsig) out += `;;   RRSIG present ✓\n`;
        if (c.hasDnskey) out += `;;   DNSKEY present ✓\n`;
        if (c.hasDs) out += `;;   DS present ✓\n`;
      });
      out += `\n;; Chain of trust: VALIDATED`;
    } else {
      out += `;; flags: qr rd ra; QUERY: 1, ANSWER: 0\n;; AD flag: NOT SET\n\n`;
      result.chain.forEach(c => { out += `;; ${c.server}: ${c.status} — ${c.note || ''}\n`; });
      out += `\n;; Chain of trust: ${result.error || 'BROKEN'}`;
    }
    return out;
  }
  if (cmd === 'show dnssec' || cmd === 'show dns security') {
    if (!dev.dnssecEnabled) return 'DNSSEC is not enabled on this device.';
    const rrsigs = (dev.dnsRecords || []).filter(r => r.type === 'RRSIG');
    const dnskeys = (dev.dnsRecords || []).filter(r => r.type === 'DNSKEY');
    const ds = (dev.dnsRecords || []).filter(r => r.type === 'DS');
    return `DNSSEC Status: ENABLED\nDNSKEY records: ${dnskeys.length}\nRRSIG records:  ${rrsigs.length}\nDS records:     ${ds.length}\n\nChain of trust: ${dnskeys.length && rrsigs.length ? 'COMPLETE' : 'INCOMPLETE — add DNSKEY and RRSIG records'}`;
  }
  // DHCP Snooping / DAI
  if (cmd === 'show ip dhcp snooping' || cmd === 'show dhcp snooping') {
    const sn = dev.dhcpSnooping;
    if (!sn?.enabled) return 'DHCP Snooping is not enabled on this device.';
    let out = `DHCP Snooping: ENABLED\n\nTrusted Ports:\n`;
    (sn.trustedPorts || []).forEach(p => { out += `  ${p} — trusted\n`; });
    out += '\nUntrusted Ports:\n';
    dev.interfaces.filter(i => !(sn.trustedPorts || []).includes(i.name)).forEach(i => { out += `  ${i.name} — untrusted\n`; });
    return out;
  }
  if (cmd === 'show ip arp inspection' || cmd === 'show dai') {
    return `Dynamic ARP Inspection: ${dev.daiEnabled ? 'ENABLED' : 'DISABLED'}\n${dev.daiEnabled ? 'Validating ARP packets against DHCP snooping binding table.' : 'Enable DAI to validate ARP packets.'}`;
  }
  // QoS extended commands
  if (cmd === 'show qos counters' || cmd === 'show qos queue' || cmd === 'show qos stats') {
    const qos = dev.qosConfig;
    if (!qos?.enabled) return 'QoS is not enabled on this device.';
    let out = 'QoS Queue Statistics:\n\nQueue          Packets   Dropped   Delay\n──────────────────────────────────────────\n';
    const queues = { priority: 0, bandwidth: 0, fair: 0, 'best-effort': 0 };
    (qos.policies || []).forEach(p => { queues[p.queue || 'best-effort']++; });
    Object.entries(queues).forEach(([q, count]) => {
      const pkts = Math.floor(Math.random() * 1000);
      const drops = q === 'best-effort' ? Math.floor(pkts * 0.05) : 0;
      out += `${q.padEnd(15)}${String(pkts).padEnd(10)}${String(drops).padEnd(10)}${q === 'priority' ? '<1ms' : q === 'bandwidth' ? '5ms' : '20ms'}\n`;
    });
    return out;
  }
  // Show spanning-tree detail
  if (cmd === 'show spanning-tree detail') {
    const stp = dev.stpConfig;
    if (!stp) return 'STP not configured on this device.';
    let out = `Spanning Tree Detail\nMode: ${(stp.mode || 'rstp').toUpperCase()}\nBridge Priority: ${stp.priority}\nBridge ID: ${stp.priority}.${dev.interfaces[0]?.mac || '?'}\nRoot Bridge: ${stp.isRoot ? 'THIS BRIDGE IS ROOT' : 'unknown'}\n\nPort Details:\n`;
    dev.interfaces.filter(i => i.cableId).forEach(ifc => {
      const state = stp.portStates?.[ifc.name] || 'forwarding';
      const cable = tbState.cables.find(c => c.id === ifc.cableId);
      const peerId = cable ? (cable.from === dev.id ? cable.to : cable.from) : null;
      const peer = tbState.devices.find(d => d.id === peerId);
      out += `  ${ifc.name}: ${state.toUpperCase()} → ${peer?.hostname || '?'} (cost: ${cable?.type === 'fiber' ? 4 : 19})\n`;
    });
    return out;
  }
  // Config mode simulation
  if (cmd === 'configure terminal' || cmd === 'config t' || cmd === 'conf t') {
    return `${dev.hostname}(config)# Configuration mode entered.\n\nAvailable config commands:\n  hostname <name>      - Set device hostname\n  interface <name>     - Enter interface config\n  ip address <ip> <mask> - Set IP (in interface mode)\n  ip route <net> <mask> <next-hop> - Add static route\n  router ospf <id>     - Enter OSPF config\n  no shutdown          - Enable interface\n  shutdown             - Disable interface\n  exit                 - Exit current mode\n\nNote: Use the GUI tabs for full configuration. CLI config mode is for exam practice.`;
  }
  if (cmd.startsWith('hostname ')) {
    const newName = cmd.replace('hostname ', '').trim();
    if (newName) { dev.hostname = newName; tbState.updated = Date.now(); tbSaveDraft(); tbRenderCanvas(); return `Hostname changed to "${newName}".`; }
    return 'Usage: hostname <name>';
  }
  if (cmd.startsWith('ip route ')) {
    const parts = cmd.replace('ip route ', '').trim().split(/\s+/);
    if (parts.length >= 3) {
      dev.routingTable.push({ type: 'static', network: parts[0], mask: parts[1], nextHop: parts[2], iface: '' });
      tbState.updated = Date.now(); tbSaveDraft();
      return `Static route added: ${parts[0]} ${parts[1]} via ${parts[2]}`;
    }
    return 'Usage: ip route <network> <mask> <next-hop>';
  }
  if (cmd === 'show running-config' || cmd === 'show run') {
    let cfg = `!\nhostname ${dev.hostname}\n!`;
    dev.interfaces.forEach(i => {
      cfg += `\ninterface ${i.name}\n`;
      if (i.ip) cfg += `  ip address ${i.ip} ${i.mask}\n`;
      if (i.ipv6) cfg += `  ipv6 address ${i.ipv6}/${i.ipv6Prefix || 64}\n`;
      if (!i.enabled) cfg += `  shutdown\n`;
      cfg += `!`;
    });
    if (dev.routingTable.filter(r => r.type === 'static').length) {
      dev.routingTable.filter(r => r.type === 'static').forEach(r => { cfg += `\nip route ${r.network} ${r.mask} ${r.nextHop}`; });
      cfg += '\n!';
    }
    if (dev.ospfConfig?.enabled) {
      cfg += `\nrouter ospf 1\n  router-id ${dev.ospfConfig.routerId || '0.0.0.0'}`;
      (dev.ospfConfig.areas || []).forEach(a => { (a.networks || []).forEach(n => { cfg += `\n  network ${n} area ${a.id}`; }); });
      cfg += '\n!';
    }
    if (dev.bgpConfig?.enabled) {
      cfg += `\nrouter bgp ${dev.bgpConfig.asn || '?'}\n  bgp router-id ${dev.bgpConfig.routerId || '0.0.0.0'}`;
      (dev.bgpConfig.neighbors || []).forEach(n => { cfg += `\n  neighbor ${n.ip} remote-as ${n.remoteAs}`; });
      (dev.bgpConfig.networks || []).forEach(n => { cfg += `\n  network ${n}`; });
      cfg += '\n!';
    }
    if (dev.eigrpConfig?.enabled) {
      cfg += `\nrouter eigrp ${dev.eigrpConfig.asn || '?'}`;
      (dev.eigrpConfig.networks || []).forEach(n => { cfg += `\n  network ${n.network} ${n.wildcard}`; });
      cfg += '\n!';
    }
    return cfg;
  }
  // help
  if (cmd === 'help' || cmd === '?') {
    return 'Available commands:\n' +
      '  show arp                - ARP table\n' +
      '  show ip route           - Routing table\n' +
      '  show ipv6 interface     - IPv6 addresses\n' +
      '  show ipv6 route         - IPv6 routing table\n' +
      '  show mac address-table  - MAC table (switches)\n' +
      '  show vlan brief         - VLAN database (switches)\n' +
      '  show vxlan              - VXLAN tunnels & VTEPs\n' +
      '  show spanning-tree      - STP status & port states\n' +
      '  show ip ospf            - OSPF config & areas\n' +
      '  show ip ospf neighbor   - OSPF neighbor table\n' +
      '  show qos                - QoS policies\n' +
      '  show wireless           - Wireless AP config\n' +
      '  show dns records        - DNS zone records\n' +
      '  show interfaces         - Interface status\n' +
      '  show running-config     - Full device config\n' +
      '  show security-groups    - Security group rules\n' +
      '  show nacl               - Network ACL rules\n' +
      '  show vpn-status         - VPN/IPSec tunnel info\n' +
      '  show sase               - SASE edge config\n' +
      '  show ip bgp             - BGP routing table\n' +
      '  show ip bgp summary     - BGP neighbor summary\n' +
      '  show ip eigrp neighbors - EIGRP neighbor table\n' +
      '  show ip eigrp topology  - EIGRP topology table\n' +
      '  show dnssec             - DNSSEC status\n' +
      '  show ip dhcp snooping   - DHCP snooping status\n' +
      '  show ip arp inspection  - DAI status\n' +
      '  show qos counters       - QoS queue statistics\n' +
      '  show spanning-tree detail - STP port details\n' +
      '  dig +dnssec <name>      - DNSSEC-validated lookup\n' +
      '  configure terminal      - Enter config mode\n' +
      '  hostname <name>         - Change device name\n' +
      '  ip route <n> <m> <nh>   - Add static route\n' +
      '  nslookup <name>         - DNS lookup\n' +
      '  ping <ip>               - Ping a host\n' +
      '  arp <ip>                - Send ARP request\n' +
      '  traceroute <ip>         - Trace path to host\n' +
      '  ipconfig                - Show IP configuration\n' +
      '  netstat                 - Show connections & ports\n' +
      '  help                    - This help message';
  }
  return `Unknown command: "${cmd}". Type "help" for available commands.`;
}

// Double-click detection moved into tbOnDeviceMouseDown (manual timestamp
// check) because native dblclick cannot fire reliably — tbRenderCanvas
// destroys and recreates device DOM nodes after every mousedown, so the
// second click lands on a fresh element that never saw the first click.
// The old tbAttachDoubleClick() per-element listener approach is removed.

// ══════════════════════════════════════════
// TOPOLOGY BUILDER — Subnet & Simulation Engine
// ══════════════════════════════════════════

// IP utility helpers
function tbIpToArr(ip) {
  if (!ip) return null;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  return parts;
}
function tbArrToIp(arr) { return arr.join('.'); }
function tbSubnetOf(ip, mask) {
  const ipA = tbIpToArr(ip), mA = tbIpToArr(mask);
  if (!ipA || !mA) return null;
  return tbArrToIp(ipA.map((o, i) => o & mA[i]));
}
function tbBroadcastOf(ip, mask) {
  const ipA = tbIpToArr(ip), mA = tbIpToArr(mask);
  if (!ipA || !mA) return null;
  return tbArrToIp(ipA.map((o, i) => (o & mA[i]) | (~mA[i] & 255)));
}
function tbSameSubnet(ip1, ip2, mask) {
  return tbSubnetOf(ip1, mask) === tbSubnetOf(ip2, mask);
}
function tbMaskToCidr(mask) {
  const a = tbIpToArr(mask);
  if (!a) return '24';
  return String(a.reduce((c, o) => c + o.toString(2).split('').filter(b => b === '1').length, 0));
}

// Find all devices reachable at L2 from a given device/interface within a VLAN
function tbGetBroadcastDomain(state, srcDeviceId, vlan) {
  const visited = new Set();
  const members = []; // [{deviceId, ifaceName}]
  const queue = [srcDeviceId];
  visited.add(srcDeviceId);
  while (queue.length) {
    const devId = queue.shift();
    const dev = state.devices.find(d => d.id === devId);
    if (!dev || !dev.interfaces) continue;
    // Collect interfaces on this device in the target VLAN
    dev.interfaces.forEach(ifc => {
      const inVlan = (ifc.mode === 'access' && ifc.vlan === vlan) || (ifc.mode === 'trunk' && ifc.trunkAllowed.indexOf(vlan) >= 0);
      if (inVlan && ifc.cableId && ifc.enabled) {
        members.push({ deviceId: devId, ifaceName: ifc.name, mac: ifc.mac, ip: ifc.ip });
        // Walk the cable to the peer device
        const cable = state.cables.find(c => c.id === ifc.cableId);
        if (cable) {
          const peerId = cable.from === devId ? cable.to : cable.from;
          if (!visited.has(peerId)) {
            // Check peer's interface is also in this VLAN (or trunk carrying it)
            const peer = state.devices.find(d => d.id === peerId);
            if (peer && peer.interfaces) {
              const peerIface = peer.interfaces.find(pi => pi.cableId === cable.id);
              if (peerIface && peerIface.enabled) {
                const peerInVlan = (peerIface.mode === 'access' && peerIface.vlan === vlan) ||
                                   (peerIface.mode === 'trunk' && peerIface.trunkAllowed.indexOf(vlan) >= 0);
                if (peerInVlan) {
                  visited.add(peerId);
                  queue.push(peerId);
                }
              }
            }
          }
        }
      }
    });
  }
  return members;
}

// ── ARP Simulation ──
function tbSimARP(state, srcDeviceId, targetIp) {
  const log = [];
  const dev = state.devices.find(d => d.id === srcDeviceId);
  if (!dev) { log.push('[ERR] Source device not found.'); return { log, resolved: null }; }

  // Find source interface (first with an IP in the same subnet as targetIp, or first with an IP)
  let srcIface = dev.interfaces.find(ifc => ifc.ip && ifc.enabled && tbSameSubnet(ifc.ip, targetIp, ifc.mask));
  if (!srcIface) srcIface = dev.interfaces.find(ifc => ifc.ip && ifc.enabled);
  if (!srcIface) { log.push('[ERR] No interface with an IP address on source device.'); return { log, resolved: null }; }

  // Check ARP table cache first
  const cached = dev.arpTable.find(e => e.ip === targetIp);
  if (cached) {
    log.push(`[ARP] Cache hit: ${targetIp} → ${cached.mac}`);
    return { log, resolved: cached.mac };
  }

  const vlan = srcIface.vlan || 1;
  log.push(`[ARP] ${dev.hostname} (${srcIface.name}) sends ARP Request: Who has ${targetIp}? Tell ${srcIface.ip}`);
  log.push(`[ARP] Broadcasting on VLAN ${vlan}...`);

  // Get broadcast domain
  const domain = tbGetBroadcastDomain(state, srcDeviceId, vlan);

  // Search for the target IP in the domain
  let resolvedMac = null;
  let responder = null;
  for (const member of domain) {
    if (member.deviceId === srcDeviceId) continue;
    const peerDev = state.devices.find(d => d.id === member.deviceId);
    if (!peerDev) continue;
    const matchIface = peerDev.interfaces.find(ifc => ifc.ip === targetIp && ifc.enabled);
    if (matchIface) {
      resolvedMac = matchIface.mac;
      responder = peerDev;
      log.push(`[ARP] ${peerDev.hostname} (${matchIface.name}) replies: ${targetIp} is at ${matchIface.mac}`);
      // Update ARP tables on both sides
      dev.arpTable.push({ ip: targetIp, mac: matchIface.mac, iface: srcIface.name, age: 0 });
      peerDev.arpTable.push({ ip: srcIface.ip, mac: srcIface.mac, iface: matchIface.name, age: 0 });
      // Update switch MAC tables along the path
      domain.forEach(m => {
        const sw = state.devices.find(d => d.id === m.deviceId);
        if (sw && sw.type.indexOf('switch') >= 0) {
          if (!sw.macTable.find(e => e.mac === matchIface.mac)) {
            sw.macTable.push({ mac: matchIface.mac, vlan, port: m.ifaceName });
          }
          if (!sw.macTable.find(e => e.mac === srcIface.mac)) {
            sw.macTable.push({ mac: srcIface.mac, vlan, port: m.ifaceName });
          }
        }
      });
      break;
    }
  }

  if (!resolvedMac) {
    log.push(`[ARP] No response for ${targetIp} — host unreachable in VLAN ${vlan}.`);
  }
  tbSaveDraft();
  return { log, resolved: resolvedMac, srcDevice: dev, responder };
}

// ── Ping Simulation ──
function tbSimPing(state, srcDeviceId, dstIp, ttl) {
  const log = [];
  ttl = ttl || 64;
  const dev = state.devices.find(d => d.id === srcDeviceId);
  if (!dev) { log.push('[ERR] Source device not found.'); return { log, success: false }; }

  // Find outgoing interface
  let outIface = null;
  let nextHopIp = dstIp;
  let directDelivery = false;

  // Check if destination is on a directly connected subnet
  for (const ifc of dev.interfaces) {
    if (ifc.ip && ifc.enabled && tbSameSubnet(ifc.ip, dstIp, ifc.mask)) {
      outIface = ifc;
      directDelivery = true;
      break;
    }
  }

  // If not direct, check routing table
  if (!outIface && dev.routingTable.length) {
    // Longest prefix match
    let bestLen = -1;
    for (const route of dev.routingTable) {
      const rCidr = parseInt(tbMaskToCidr(route.mask));
      if (tbSameSubnet(dstIp, route.network, route.mask) && rCidr > bestLen) {
        bestLen = rCidr;
        nextHopIp = route.nextHop || dstIp;
        outIface = dev.interfaces.find(ifc => ifc.name === route.iface && ifc.enabled) || dev.interfaces.find(ifc => ifc.ip && ifc.enabled);
      }
    }
  }

  // If not direct and no route, try default gateway (endpoints)
  if (!outIface) {
    const gwIface = dev.interfaces.find(ifc => ifc.gateway && ifc.enabled);
    if (gwIface) {
      outIface = gwIface;
      nextHopIp = gwIface.gateway;
    }
  }

  if (!outIface || !outIface.ip) {
    log.push(`[ICMP] ${dev.hostname}: Destination unreachable — no route to ${dstIp}`);
    return { log, success: false };
  }

  log.push(`[ICMP] ${dev.hostname} → ping ${dstIp} (via ${outIface.name}, TTL=${ttl})`);

  // ARP for the next hop (or destination if direct)
  const arpTarget = directDelivery ? dstIp : nextHopIp;
  const arpResult = tbSimARP(state, dev.id, arpTarget);
  log.push(...arpResult.log);

  if (!arpResult.resolved) {
    log.push(`[ICMP] ${dev.hostname}: Destination host unreachable (ARP failed for ${arpTarget})`);
    return { log, success: false, path: [dev.id] };
  }

  if (directDelivery) {
    // Destination is on our subnet — delivered
    const dstDev = state.devices.find(d => d.interfaces && d.interfaces.some(ifc => ifc.ip === dstIp));
    if (dstDev) {
      log.push(`[ICMP] Reply from ${dstDev.hostname} (${dstIp}): bytes=64 TTL=${ttl}`);
      return { log, success: true, path: [dev.id, dstDev.id] };
    }
    log.push(`[ICMP] Reply from ${dstIp}: bytes=64 TTL=${ttl}`);
    return { log, success: true, path: [dev.id] };
  }

  // Forward to next hop router
  const nextHopDev = state.devices.find(d => d.interfaces && d.interfaces.some(ifc => ifc.ip === nextHopIp));
  if (!nextHopDev) {
    log.push(`[ICMP] ${dev.hostname}: Next hop ${nextHopIp} unreachable.`);
    return { log, success: false, path: [dev.id] };
  }

  if (ttl <= 1) {
    log.push(`[ICMP] TTL expired in transit at ${nextHopDev.hostname}.`);
    return { log, success: false, path: [dev.id, nextHopDev.id] };
  }

  // Recursive: next hop router pings the destination
  log.push(`[ICMP] → Forwarded to ${nextHopDev.hostname} (${nextHopIp})`);
  const fwdResult = tbSimPing(state, nextHopDev.id, dstIp, ttl - 1);
  log.push(...fwdResult.log);
  const path = [dev.id, ...(fwdResult.path || [])];
  return { log, success: fwdResult.success, path };
}

// ── Traceroute Simulation ──
function tbTraceroute(dev, dstIp) {
  const lines = [`traceroute to ${dstIp}, 30 hops max\n`];
  let currentDev = dev;
  const visited = new Set();
  let hop = 1;

  for (; hop <= 30; hop++) {
    if (visited.has(currentDev.id)) { lines.push(`${hop}  *** Loop detected`); break; }
    visited.add(currentDev.id);

    // Check if destination is directly connected
    const directIfc = currentDev.interfaces.find(ifc =>
      ifc.ip && ifc.enabled && tbSameSubnet(ifc.ip, dstIp, ifc.mask));
    if (directIfc) {
      // Check if destination device actually exists
      const dstDev = tbState.devices.find(d => d.interfaces.some(i => i.ip === dstIp));
      if (dstDev) {
        const rtt = (1 + Math.random() * 3).toFixed(1);
        lines.push(`${hop}  ${dstDev.hostname} (${dstIp})  ${rtt} ms`);
        lines.push(`\nTrace complete.`);
        return lines.join('\n');
      }
      lines.push(`${hop}  ${dstIp}  * * * (host unreachable)`);
      return lines.join('\n');
    }

    // Find next hop via routing table or gateway
    let nextHopIp = null;
    if (currentDev.routingTable.length) {
      let bestLen = -1;
      for (const route of currentDev.routingTable) {
        const rCidr = parseInt(tbMaskToCidr(route.mask));
        if (tbSameSubnet(dstIp, route.network, route.mask) && rCidr > bestLen) {
          bestLen = rCidr;
          nextHopIp = route.nextHop;
        }
      }
    }
    if (!nextHopIp) {
      const gwIfc = currentDev.interfaces.find(ifc => ifc.gateway && ifc.enabled);
      if (gwIfc) nextHopIp = gwIfc.gateway;
    }

    if (!nextHopIp) {
      lines.push(`${hop}  * * * (no route to host)`);
      return lines.join('\n');
    }

    // Find the next hop device
    const nextDev = tbState.devices.find(d => d.interfaces.some(i => i.ip === nextHopIp));
    if (!nextDev) {
      lines.push(`${hop}  * * * (next hop ${nextHopIp} unreachable)`);
      return lines.join('\n');
    }

    const rtt = (1 + Math.random() * 5).toFixed(1);
    lines.push(`${hop}  ${nextDev.hostname} (${nextHopIp})  ${rtt} ms`);
    currentDev = nextDev;
  }

  if (hop > 30) lines.push('*** Max hops exceeded');
  return lines.join('\n');
}

// ── DHCP DORA Simulation ──
function tbSimDHCP(state, clientDeviceId) {
  const log = [];
  const client = state.devices.find(d => d.id === clientDeviceId);
  if (!client) { log.push('[ERR] Client device not found.'); return { log, success: false }; }
  const clientIface = client.interfaces.find(ifc => ifc.enabled);
  if (!clientIface) { log.push('[ERR] No enabled interface on client.'); return { log, success: false }; }

  const vlan = clientIface.vlan || 1;
  log.push(`[DHCP] ${client.hostname} sends DHCP Discover (broadcast on VLAN ${vlan})`);

  // Find DHCP server in broadcast domain
  const domain = tbGetBroadcastDomain(state, clientDeviceId, vlan);
  let server = null;
  let serverDev = null;

  for (const member of domain) {
    const d = state.devices.find(x => x.id === member.deviceId);
    if (d && d.dhcpServer && d.dhcpServer.network) {
      server = d.dhcpServer;
      serverDev = d;
      break;
    }
  }

  // If no server found, check for DHCP relay
  if (!server) {
    for (const member of domain) {
      const d = state.devices.find(x => x.id === member.deviceId);
      if (d && d.dhcpRelay && d.dhcpRelay.helperAddress) {
        log.push(`[DHCP] ${d.hostname} relays Discover to ${d.dhcpRelay.helperAddress} (ip helper-address)`);
        // Find the server at the helper address
        const relayTarget = state.devices.find(x => x.interfaces && x.interfaces.some(ifc => ifc.ip === d.dhcpRelay.helperAddress));
        if (relayTarget && relayTarget.dhcpServer) {
          server = relayTarget.dhcpServer;
          serverDev = relayTarget;
          log.push(`[DHCP] Relay reached ${serverDev.hostname} (${d.dhcpRelay.helperAddress})`);
        }
        break;
      }
    }
  }

  if (!server || !serverDev) {
    log.push('[DHCP] No DHCP server found. Request timed out.');
    return { log, success: false };
  }

  // Generate an IP from the pool
  const startArr = tbIpToArr(server.rangeStart);
  const endArr = tbIpToArr(server.rangeEnd);
  if (!startArr || !endArr) {
    log.push('[DHCP] Server pool range is invalid.');
    return { log, success: false };
  }

  // Find first available IP (check all device interfaces)
  const usedIps = new Set();
  state.devices.forEach(d => d.interfaces && d.interfaces.forEach(ifc => { if (ifc.ip) usedIps.add(ifc.ip); }));
  let offeredIp = null;
  for (let last = startArr[3]; last <= endArr[3]; last++) {
    const candidate = `${startArr[0]}.${startArr[1]}.${startArr[2]}.${last}`;
    if (!usedIps.has(candidate)) { offeredIp = candidate; break; }
  }

  if (!offeredIp) {
    log.push('[DHCP] Server pool exhausted — no addresses available.');
    return { log, success: false };
  }

  log.push(`[DHCP] ${serverDev.hostname} sends DHCP Offer: ${offeredIp}`);
  log.push(`[DHCP] ${client.hostname} sends DHCP Request for ${offeredIp}`);
  log.push(`[DHCP] ${serverDev.hostname} sends DHCP ACK: ${offeredIp} (mask ${server.mask}, gw ${server.gateway}, dns ${server.dns})`);

  // Assign the IP to the client
  clientIface.ip = offeredIp;
  clientIface.mask = server.mask || '255.255.255.0';
  if (server.gateway) clientIface.gateway = server.gateway;

  log.push(`[DHCP] ${client.hostname} configured: IP=${offeredIp} Mask=${clientIface.mask} GW=${clientIface.gateway || 'none'}`);
  tbState.updated = Date.now();
  tbSaveDraft();
  return { log, success: true };
}

// ── Packet Animation ──
function tbAnimatePacket(path, color, label, packetInfo) {
  if (!path || path.length < 2) return;
  const animLayer = document.getElementById('tb-anim-layer');
  if (!animLayer) return;
  color = color || '#22c55e';

  // Show packet inspection panel if packet info provided
  if (packetInfo) tbShowPacketInspection(packetInfo);

  const animate = (idx) => {
    if (idx >= path.length - 1) {
      // Close inspection panel after animation completes
      if (packetInfo) setTimeout(() => tbClosePacketInspection(), 2000);
      return;
    }
    const fromDev = tbState.devices.find(d => d.id === path[idx]);
    const toDev = tbState.devices.find(d => d.id === path[idx + 1]);
    if (!fromDev || !toDev) return;

    // QoS classification at each hop
    if (packetInfo && fromDev.qosConfig?.enabled) {
      const classification = tbQosClassify(fromDev, packetInfo);
      const qosDelay = tbQosEnqueue(classification);
      if (classification.policy) {
        packetInfo.dscp = classification.dscp;
        packetInfo.payload = `QoS: ${classification.policy} (${classification.queue})`;
        tbShowPacketInspection(packetInfo);
      }
    }

    const HALF_W = 48, HALF_H = 36;
    const p1 = tbEdgePoint(fromDev.x, fromDev.y, toDev.x, toDev.y, HALF_W, HALF_H);
    const p2 = tbEdgePoint(toDev.x, toDev.y, fromDev.x, fromDev.y, HALF_W, HALF_H);
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 + 16;

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '6');
    dot.setAttribute('fill', color);
    dot.setAttribute('cx', p1.x);
    dot.setAttribute('cy', p1.y);
    dot.style.filter = `drop-shadow(0 0 6px ${color})`;
    animLayer.appendChild(dot);

    // Animate along quadratic bezier
    const duration = 400;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const u = 1 - t;
      const x = u * u * p1.x + 2 * u * t * mx + t * t * p2.x;
      const y = u * u * p1.y + 2 * u * t * my + t * t * p2.y;
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      if (t < 1) requestAnimationFrame(step);
      else {
        // Update packet headers at each hop (TTL decrement, MAC swap)
        if (packetInfo && toDev.interfaces) {
          packetInfo.ttl = Math.max(0, (packetInfo.ttl || 64) - 1);
          const nextIfc = toDev.interfaces.find(i => i.mac);
          if (nextIfc) packetInfo.dstMac = nextIfc.mac;
          tbShowPacketInspection(packetInfo);
        }
        setTimeout(() => { dot.remove(); animate(idx + 1); }, 100);
      }
    };
    requestAnimationFrame(step);
  };
  animate(0);
}

// ── Simulation UI Triggers ──
function tbOpenPingDialog() {
  const modal = document.getElementById('tb-ping-modal');
  const srcSelect = document.getElementById('tb-ping-src');
  const dstSelect = document.getElementById('tb-ping-dst');
  if (!modal || !srcSelect || !dstSelect) return;
  const devicesWithIp = tbState.devices.filter(d => d.interfaces && d.interfaces.some(ifc => ifc.ip));
  srcSelect.innerHTML = devicesWithIp
    .map(d => `<option value="${d.id}">${escHtml(d.hostname)} (${d.interfaces.find(i=>i.ip)?.ip || '?'})</option>`)
    .join('');
  tbFilterPingDst();
  modal.classList.remove('is-hidden');
}
function tbFilterPingDst() {
  const srcId = document.getElementById('tb-ping-src')?.value;
  const dstSelect = document.getElementById('tb-ping-dst');
  if (!dstSelect) return;
  const devicesWithIp = tbState.devices.filter(d => d.interfaces && d.interfaces.some(ifc => ifc.ip) && d.id !== srcId);
  dstSelect.innerHTML = devicesWithIp
    .map(d => `<option value="${d.id}">${escHtml(d.hostname)} (${d.interfaces.find(i=>i.ip)?.ip || '?'})</option>`)
    .join('');
}
function tbOpenArpDialog() {
  tbOpenPingDialog();
}
function tbOpenDhcpDialog() {
  // Find devices without IPs that could request DHCP
  const clients = tbState.devices.filter(d =>
    ['pc','printer','voip','iot'].indexOf(d.type) >= 0 &&
    d.interfaces && d.interfaces.some(ifc => !ifc.ip && ifc.enabled)
  );
  if (!clients.length) {
    showErrorToast('No unconfigured endpoints found. All devices already have IPs.');
    return;
  }
  // Run DHCP for each unconfigured client
  const allLogs = [];
  clients.forEach(c => {
    const result = tbSimDHCP(tbState, c.id);
    allLogs.push(...result.log, '');
  });
  tbShowSimLog(allLogs);
  // Refresh config panel if open
  if (tbConfigPanelDeviceId) tbSwitchConfigTab(tbActiveConfigTab);
}

function tbExecPing() {
  const srcId = document.getElementById('tb-ping-src')?.value;
  const dstId = document.getElementById('tb-ping-dst')?.value;
  document.getElementById('tb-ping-modal')?.classList.add('is-hidden');
  if (!srcId || !dstId) { showErrorToast('Select source and destination devices.'); return; }
  const dstDev = tbState.devices.find(d => d.id === dstId);
  const dstIp = dstDev?.interfaces?.find(i => i.ip)?.ip;
  if (!dstIp) { showErrorToast('Destination has no IP address configured.'); return; }
  const result = tbSimPing(tbState, srcId, dstIp);
  tbShowSimLog(result.log);
  if (result.path && result.path.length >= 2) {
    const srcDev = tbState.devices.find(d => d.id === srcId);
    const pktInfo = tbBuildPacketHeaders(srcDev, dstDev, { protocol: 'ICMP (1)', flags: 'Echo Request', payload: 'Ping' });
    tbAnimatePacket(result.path, result.success ? '#22c55e' : '#ef4444', 'ICMP', pktInfo);
  }
  if (tbConfigPanelDeviceId) tbSwitchConfigTab(tbActiveConfigTab);
}

function tbExecArp() {
  const srcId = document.getElementById('tb-ping-src')?.value;
  const dstId = document.getElementById('tb-ping-dst')?.value;
  document.getElementById('tb-ping-modal')?.classList.add('is-hidden');
  if (!srcId || !dstId) { showErrorToast('Select source and destination devices.'); return; }
  const dstDev = tbState.devices.find(d => d.id === dstId);
  const dstIp = dstDev?.interfaces?.find(i => i.ip)?.ip;
  if (!dstIp) { showErrorToast('Destination has no IP address configured.'); return; }
  const result = tbSimARP(tbState, srcId, dstIp);
  tbShowSimLog(result.log);
  if (result.path && result.path.length >= 2) {
    const srcDev = tbState.devices.find(d => d.id === srcId);
    const arpInfo = tbBuildPacketHeaders(srcDev, dstDev, { etherType: '0x0806 (ARP)', protocol: 'ARP', flags: 'Who has ' + dstIp + '?', dstMac: 'ff:ff:ff:ff:ff:ff' });
    tbAnimatePacket(result.path, '#3b82f6', 'ARP', arpInfo);
  }
  if (tbConfigPanelDeviceId) tbSwitchConfigTab(tbActiveConfigTab);
}

function tbShowSimLog(logLines) {
  const panel = document.getElementById('tb-sim-log');
  const content = document.getElementById('tb-sim-log-content');
  if (!panel || !content) return;
  panel.classList.remove('is-hidden');
  const existing = content.textContent;
  const timestamp = new Date().toLocaleTimeString();
  content.textContent = (existing ? existing + '\n' : '') + `── ${timestamp} ──\n` + logLines.join('\n') + '\n';
  content.scrollTop = content.scrollHeight;
}

function tbClearSimLog() {
  const content = document.getElementById('tb-sim-log-content');
  if (content) content.textContent = '';
  // Clear ARP/MAC tables on all devices
  tbState.devices.forEach(d => { d.arpTable = []; d.macTable = []; });
  tbState.updated = Date.now();
  tbSaveDraft();
  showErrorToast('Simulation log and ARP/MAC tables cleared.');
}

// ══════════════════════════════════════════
// TOPOLOGY BUILDER — AI Topology Generation + Walkthrough
// ══════════════════════════════════════════

// Shared: parse AI topology JSON from raw text
function tbParseAiTopologyJson(text) {
  if (!text || !text.trim()) return null;
  // Strip markdown fences (```json ... ```) anywhere in the text
  const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  let payload;

  // Stage 1: Direct parse
  try { payload = JSON.parse(cleaned); } catch (_) {}
  if (payload) return payload;

  // Stage 2: Extract the outermost { ... } block (greedy — gets the largest JSON object)
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) try { payload = JSON.parse(m[0]); } catch (_) {}
  if (payload) return payload;

  // Stage 3: Strip // comments + trailing commas, then direct parse
  const noComments = cleaned.replace(/\/\/[^\n]*/g, '').replace(/,\s*([}\]])/g, '$1');
  try { payload = JSON.parse(noComments); } catch (_) {}
  if (payload) return payload;

  // Stage 4: Extract { ... } from comment-stripped text
  const m2 = noComments.match(/\{[\s\S]*\}/);
  if (m2) try { payload = JSON.parse(m2[0]); } catch (_) {}
  if (payload) return payload;

  // Stage 5: Handle truncated JSON — if response was cut off mid-array/object,
  // try to close open brackets/braces to salvage a partial result
  if (m) {
    let truncated = m[0];
    // Count open vs close braces/brackets
    const opens = (truncated.match(/\{/g) || []).length;
    const closes = (truncated.match(/\}/g) || []).length;
    const openBrackets = (truncated.match(/\[/g) || []).length;
    const closeBrackets = (truncated.match(/\]/g) || []).length;
    if (opens > closes || openBrackets > closeBrackets) {
      // Strip any trailing partial value (after last comma or opening bracket)
      truncated = truncated.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, '');
      truncated = truncated.replace(/,\s*\{[^}]*$/, '');
      truncated = truncated.replace(/,\s*$/, '');
      // Close open brackets/braces
      for (let i = 0; i < openBrackets - closeBrackets; i++) truncated += ']';
      for (let i = 0; i < opens - closes; i++) truncated += '}';
      try { payload = JSON.parse(truncated); } catch (_) {
        console.warn('[AI Topology] Truncation repair failed:', truncated.substring(truncated.length - 100));
      }
    }
  }
  return payload || null;
}

// Shared: build devices + cables from AI payload into a target state
function tbBuildFromAiPayload(payload, targetState, hostnameToId) {
  payload.devices.forEach(dd => {
    const id = 'd_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const type = TB_DEVICE_TYPES[dd.type] ? dd.type : 'pc';
    const ifaces = (dd.interfaces || []).map((aiIfc, idx) => ({
      name: aiIfc.name || `eth${idx}`,
      cableId: null,
      ip: aiIfc.ip || '',
      mask: aiIfc.mask || '255.255.255.0',
      mac: tbGenerateMac(id, idx),
      vlan: aiIfc.vlan || 1,
      mode: aiIfc.mode || 'access',
      trunkAllowed: aiIfc.trunkAllowed || [1],
      gateway: aiIfc.gateway || '',
      enabled: true,
      subInterfaces: [],
    }));
    const def = TB_IFACE_DEFAULTS[type] || { count: 1, naming: i => `eth${i}` };
    while (ifaces.length < def.count) {
      ifaces.push({
        name: def.naming(ifaces.length), cableId: null, ip: '', mask: '255.255.255.0',
        mac: tbGenerateMac(id, ifaces.length), vlan: 1, mode: 'access', trunkAllowed: [1],
        gateway: '', enabled: true, subInterfaces: [],
      });
    }
    const device = {
      id, type, x: dd.x || 400, y: dd.y || 400,
      hostname: dd.hostname || tbAutoHostname(type, targetState.devices),
      interfaces: ifaces,
      routingTable: dd.routingTable || [],
      arpTable: [], macTable: [],
      vlanDb: type.indexOf('switch') >= 0 ? [{ id: 1, name: 'default' }] : [],
      dhcpServer: dd.dhcpServer || null,
      dhcpRelay: dd.dhcpRelay || null,
      acls: [],
      // Cloud properties — copy from AI payload if provided
      securityGroups: dd.securityGroups || [],
      nacls: dd.nacls || [],
      vpcConfig: dd.vpcConfig || null,
      vpnConfig: dd.vpnConfig || null,
      saseConfig: dd.saseConfig || null,
      // VXLAN overlay
      vxlanConfig: dd.vxlanConfig || [],
      // v4.30.0 — STP, OSPF, IPv6, DNS, QoS, Wireless
      stpConfig: dd.stpConfig || null,
      ospfConfig: dd.ospfConfig || null,
      qosConfig: dd.qosConfig || null,
      wirelessConfig: dd.wirelessConfig || null,
      dnsRecords: dd.dnsRecords || [],
      // v4.31.0 — BGP, EIGRP, DNSSEC, Attack scenarios
      bgpConfig: dd.bgpConfig || null,
      eigrpConfig: dd.eigrpConfig || null,
      dnssecEnabled: dd.dnssecEnabled || false,
      dhcpSnooping: dd.dhcpSnooping || null,
      daiEnabled: dd.daiEnabled || false,
      portSecurity: dd.portSecurity || null,
    };
    tbRebuildConnectedRoutes(device);
    hostnameToId[dd.hostname] = id;
    targetState.devices.push(device);
  });

  (payload.cables || []).forEach(cc => {
    const fromId = hostnameToId[cc.fromHostname];
    const toId = hostnameToId[cc.toHostname];
    if (!fromId || !toId) return;
    const cableId = 'c_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const fromDev = targetState.devices.find(d => d.id === fromId);
    const toDev = targetState.devices.find(d => d.id === toId);
    const fromIfc = fromDev?.interfaces.find(i => i.name === cc.fromIface && !i.cableId);
    const toIfc = toDev?.interfaces.find(i => i.name === cc.toIface && !i.cableId);
    if (fromIfc) fromIfc.cableId = cableId;
    if (toIfc) toIfc.cableId = cableId;
    targetState.cables.push({
      id: cableId, from: fromId, to: toId,
      type: cc.type || 'cat6',
      fromIface: fromIfc ? fromIfc.name : null,
      toIface: toIfc ? toIfc.name : null,
    });
  });
}

// The base prompt shared between new and add-to-existing modes
function tbAiBasePrompt() {
  const validTypes = Object.keys(TB_DEVICE_TYPES).join(', ');
  return `CRITICAL: Output ONLY valid JSON. No comments, no trailing commas, no markdown fences (\`\`\`), no text before or after the JSON. Just the raw JSON object.

VALID DEVICE TYPES: ${validTypes}

DEVICE TYPE GUIDE:
- router: Internal routers (Gi0/x interfaces). Always need IPs on all connected interfaces.
- isp-router: ISP/provider edge router connecting to the wider internet. Use this when the user mentions ISP, provider, or internet routing. Has Gi0/x interfaces.
- switch: Layer 2 switch (Fa0/x interfaces, 24 ports). No IP needed unless management VLAN.
- dmz-switch: Switch in the DMZ zone. Same as switch but for DMZ segments.
- firewall: Perimeter security device (eth0-3). Needs IPs, does routing between zones.
- cloud: The Internet/WAN cloud. Represents the public internet or WAN connection. One per topology unless multi-ISP.
- vpc: AWS/Azure Virtual Private Cloud. A logical container. Wire subnets and gateways to it.
- cloud-subnet: A subnet inside a VPC. Wire to the parent VPC.
- igw: Internet Gateway — gives a VPC internet access. Wire to the VPC.
- nat-gw: NAT Gateway — outbound-only internet for private subnets.
- tgw: Transit Gateway — hub connecting multiple VPCs.
- vpg: VPN Gateway (cloud side of IPSec tunnel). Wire to VPC and to onprem-dc.
- onprem-dc: On-premises data center. Wire to vpg for hybrid cloud.
- sase-edge: SASE (Secure Access Service Edge) — zero trust, SWG, CASB.
- pc, server, printer, voip, iot: End devices. Need IP + gateway.
- wap: Wireless access point. wlc: Wireless LAN controller.
- load-balancer: Sits in front of server farms.
- ids: IDS/IPS — inline or mirrored for traffic inspection.
- public-web, public-file, public-cloud: DMZ-facing servers.
- When the user says "data center" or "data centre", use onprem-dc for on-prem DCs. For cloud DCs, use vpc + cloud-subnet + servers.
- When connecting DCs via VPN, you NEED: vpg (VPN Gateway) wired between both DCs with matching vpnConfig (same PSK, IKE, encryption, hash, DH group).

VXLAN SUPPORT:
- Switches and routers can have vxlanConfig array for VXLAN overlay tunnels.
- Each entry: { vni: 10000, vtepIp: "10.0.0.1", mappedVlan: 10, mcastGroup: "239.1.1.1", remoteVteps: ["10.0.0.2"], floodAndLearn: true, bgpEvpn: false }
- Include vxlanConfig when user mentions VXLAN, overlay, DCI, or fabric.

ADVANCED FEATURES (include when relevant):
- dns-server: DNS server device type. Include dnsRecords array: [{ type: "A", name: "web.corp.local", value: "192.168.1.100", ttl: 3600 }]. Record types: A, AAAA, CNAME, MX, PTR, NS, SOA, TXT, SRV, CAA.
- stpConfig on switches: { priority: 32768, mode: "rstp", portStates: {} }. Include when user mentions STP, spanning tree, or loop prevention.
- ospfConfig on routers: { routerId: "1.1.1.1", areas: [{ id: 0, networks: ["192.168.1.0/24"] }], enabled: true }. Include when user mentions OSPF, dynamic routing, or link-state.
- qosConfig on routers/switches: { enabled: true, policies: [{ name: "voice", dscp: "ef", queue: "priority", match: "udp 5060" }] }. Include when user mentions QoS, priority, or voice.
- wirelessConfig on wap/wlc: { ssid: "Corp-WiFi", security: "wpa3-enterprise", channel: "auto", band: "5ghz", mode: "802.11ax" }.
- IPv6: interfaces can have ipv6 field (e.g. "2001:db8::1") and ipv6Prefix (default 64). Include when user mentions IPv6 or dual-stack.
- bgpConfig on routers: { asn: 65001, routerId: "1.1.1.1", neighbors: [{ ip: "10.0.0.2", remoteAs: 65002, type: "ebgp", state: "Idle" }], networks: ["192.168.1.0/24"], enabled: true }. Include when user mentions BGP, AS, autonomous system, eBGP, iBGP, or internet routing.
- eigrpConfig on routers: { asn: 100, networks: [{ network: "192.168.1.0", wildcard: "0.0.0.255" }], enabled: true }. Include when user mentions EIGRP, enhanced interior gateway, or Cisco routing.
- dnssecEnabled on dns-server: true/false. When true, DNS records should include DNSKEY, RRSIG, and DS records. Include when user mentions DNSSEC or signed DNS.
- dhcpSnooping on switches: { enabled: true, trustedPorts: ["Fa0/1"] }. Include when user mentions DHCP snooping or rogue DHCP defense.
- daiEnabled on switches: true/false. Dynamic ARP Inspection. Include when user mentions DAI or ARP spoofing defense.
- portSecurity on switches: { enabled: true, maxMac: 1, violation: "shutdown" }. Include when user mentions port security or MAC flooding defense.

TOPOLOGY TYPES — when the user asks for a physical topology, follow these EXACT patterns:
- STAR: One central device (switch or router) at center (x:700,y:400). All other devices radiate outward in a circle around it. Every device connects ONLY to the center.
- BUS: Devices arranged in a horizontal line (same y, increasing x). Each device connects to the next in the chain (A→B→C→D). Terminators at both ends.
- RING: Devices arranged in a circle. Each connects to the next, and the last connects back to the first (A→B→C→D→A).
- MESH (full): Every device connects to every other device. Arrange in a circle for clarity.
- PARTIAL MESH: Most devices connect to most others but not all.
- STAR-BUS / HYBRID: Multiple star clusters (each with a central switch + endpoints), linked together via backbone cables between the central switches.
- POINT-TO-POINT: Two devices connected directly.
- When combining topology types, follow the physical layout described above for device placement coordinates.

SCHEMA:
{
  "devices": [
    {
      "type": "<device_type>",
      "hostname": "R1",
      "x": 400, "y": 200,
      "interfaces": [{"name": "Gi0/0", "ip": "192.168.1.1", "mask": "255.255.255.0", "vlan": 1, "mode": "access", "gateway": ""}],
      "routingTable": [{"type": "static", "network": "10.0.0.0", "mask": "255.255.0.0", "nextHop": "192.168.1.2", "iface": "Gi0/0"}],
      "securityGroups": [{"name": "web-sg", "rules": [{"direction": "inbound", "protocol": "tcp", "port": "443", "source": "0.0.0.0/0", "action": "allow"}]}],
      "vpcConfig": {"cidr": "10.0.0.0/16", "peerings": []},
      "vpnConfig": {"peerIp": "", "psk": "secret123", "ikeVersion": "IKEv2", "encryption": "AES-256", "hashAlgo": "SHA-256", "dhGroup": 14},
      "vxlanConfig": [{"vni": 10000, "vtepIp": "10.0.0.1", "mappedVlan": 10, "mcastGroup": "239.1.1.1", "remoteVteps": ["10.0.0.2"], "floodAndLearn": true, "bgpEvpn": false}],
      "stpConfig": null, "ospfConfig": null, "qosConfig": null, "wirelessConfig": null,
      "dnsRecords": [{"type": "A", "name": "web.corp.local", "value": "192.168.1.100", "ttl": 3600}],
      "bgpConfig": null, "eigrpConfig": null, "dnssecEnabled": false,
      "dhcpSnooping": null, "daiEnabled": false, "portSecurity": null
    }
  ],
  "cables": [{"fromHostname": "R1", "fromIface": "Gi0/0", "toHostname": "SW1", "toIface": "Fa0/1", "type": "cat6"}]
}

RULES:
1. Canvas is 1400x820. Spread devices across x:100-1300, y:100-720. Don't cluster everything in one spot.
2. IP addressing: 192.168.x.x for internal, 10.x.x.x for DMZ/cloud, 172.16.x.x for management, 203.0.113.x for public/ISP-facing.
3. Every router/firewall/isp-router interface that connects to another device MUST have an IP.
4. Every endpoint (pc, server, printer, voip, iot) MUST have an IP and a gateway pointing to its nearest router.
5. Switches generally don't need IPs unless management VLAN is configured.
6. Include routingTable on routers for cross-subnet reachability (connected routes auto-generate, add static routes for remote subnets).
7. Include securityGroups on cloud devices if the user mentions security, firewalls, or access control.
8. Include vpcConfig with cidr on VPC devices. Include vpnConfig on vpg and onprem-dc devices.
9. Cable types: cat6 (default), cat5e, fiber (for backbone/long-distance), coax, console (management).
10. Max 50 devices total. Be generous with device count — real networks are complex.
11. Use realistic hostnames: R1/R2 for routers, SW1/SW2 for switches, FW1 for firewalls, ISP1 for ISP routers, PC1-PC5 for PCs, SRV1 for servers, etc.
12. CRITICAL: Output ONLY valid JSON. No comments, no trailing commas, no markdown fences, no text before or after.`;
}

// Serialize existing topology for context in "add to existing" mode
function tbSerializeForAiContext() {
  const devList = tbState.devices.map(d => {
    const ifcSummary = d.interfaces.filter(i => i.ip || i.cableId).map(i =>
      `${i.name}${i.ip ? '=' + i.ip + '/' + (tbMaskToCidr ? tbMaskToCidr(i.mask) : i.mask) : '(no ip)'}${i.cableId ? ' [cabled]' : ''}`
    ).join(', ');
    return `  ${d.hostname} (${d.type}) at x:${d.x},y:${d.y} — interfaces: ${ifcSummary || 'none configured'}`;
  }).join('\n');
  const cblList = tbState.cables.map(c => {
    const fd = tbState.devices.find(d => d.id === c.from);
    const td = tbState.devices.find(d => d.id === c.to);
    return `  ${fd?.hostname || '?'}:${c.fromIface || '?'} ↔ ${td?.hostname || '?'}:${c.toIface || '?'} (${c.type})`;
  }).join('\n');
  return `DEVICES (${tbState.devices.length}):\n${devList}\n\nCABLES (${tbState.cables.length}):\n${cblList}`;
}

// Deep AI generation: post-process + validate + auto-fix generated topology
function tbDeepValidateAndFix(state, scenario) {
  const fixes = [];
  const routers = state.devices.filter(d => d.type === 'router' || d.type === 'firewall' || d.type === 'isp-router');
  const endpoints = state.devices.filter(d => ['pc','server','printer','voip','iot'].includes(d.type));
  const vpgs = state.devices.filter(d => d.type === 'vpg');
  const dcs = state.devices.filter(d => d.type === 'onprem-dc');

  // Fix 1: Routers/firewalls with connected cables must have IPs on those interfaces
  routers.forEach(r => {
    r.interfaces.forEach(ifc => {
      if (ifc.cableId && !ifc.ip) {
        // Auto-assign from unused 10.x.x.x space
        const usedIps = new Set(state.devices.flatMap(d => d.interfaces.map(i => i.ip)).filter(Boolean));
        for (let sub = 1; sub < 255; sub++) {
          const candidate = `10.255.${sub}.1`;
          if (!usedIps.has(candidate)) { ifc.ip = candidate; ifc.mask = '255.255.255.252'; fixes.push(`Auto-assigned ${candidate} to ${r.hostname}:${ifc.name}`); break; }
        }
      }
    });
    tbRebuildConnectedRoutes(r);
  });

  // Fix 2: Endpoints with IPs but no gateway — try to find nearest router
  endpoints.forEach(ep => {
    ep.interfaces.forEach(ifc => {
      if (ifc.ip && !ifc.gateway) {
        // Walk cables to find connected router
        const cable = state.cables.find(c => (c.from === ep.id || c.to === ep.id));
        if (cable) {
          const nextId = cable.from === ep.id ? cable.to : cable.from;
          const nextDev = state.devices.find(d => d.id === nextId);
          // If next device is a switch, walk one more hop
          let routerDev = nextDev;
          if (nextDev && nextDev.type.includes('switch')) {
            const uplink = state.cables.find(c => (c.from === nextDev.id || c.to === nextDev.id) && c.id !== cable.id);
            if (uplink) {
              const upId = uplink.from === nextDev.id ? uplink.to : uplink.from;
              const upDev = state.devices.find(d => d.id === upId);
              if (upDev && (upDev.type === 'router' || upDev.type === 'firewall')) routerDev = upDev;
            }
          }
          if (routerDev && (routerDev.type === 'router' || routerDev.type === 'firewall' || routerDev.type === 'isp-router')) {
            const routerIp = routerDev.interfaces.find(i => i.ip)?.ip;
            if (routerIp) { ifc.gateway = routerIp; fixes.push(`Auto-set gateway on ${ep.hostname} → ${routerIp}`); }
          }
        }
      }
    });
  });

  // Fix 3: VPN endpoints need matching vpnConfig
  if (vpgs.length > 0 || dcs.length > 0) {
    const vpnEndpoints = [...vpgs, ...dcs];
    vpnEndpoints.forEach(ep => {
      if (!ep.vpnConfig) {
        ep.vpnConfig = { peerIp: '', psk: 'AutoPSK123!', ikeVersion: 'IKEv2', encryption: 'AES-256', hashAlgo: 'SHA-256', dhGroup: 14, localSubnet: '', remoteSubnet: '', status: 'down' };
        fixes.push(`Auto-initialized VPN config on ${ep.hostname}`);
      }
    });
    // Try to match VPG ↔ DC pairs via cables
    vpgs.forEach(vpg => {
      const vpgCables = state.cables.filter(c => c.from === vpg.id || c.to === vpg.id);
      vpgCables.forEach(cable => {
        const peerId = cable.from === vpg.id ? cable.to : cable.from;
        const peer = state.devices.find(d => d.id === peerId);
        if (peer && (peer.type === 'onprem-dc' || peer.type === 'vpg') && peer.vpnConfig) {
          // Sync crypto params so tunnel can negotiate
          if (!vpg.vpnConfig.psk || vpg.vpnConfig.psk === 'AutoPSK123!') {
            const sharedPsk = peer.vpnConfig.psk || 'SharedSecret123';
            vpg.vpnConfig.psk = sharedPsk;
            peer.vpnConfig.psk = sharedPsk;
            vpg.vpnConfig.ikeVersion = peer.vpnConfig.ikeVersion || 'IKEv2';
            vpg.vpnConfig.encryption = peer.vpnConfig.encryption || 'AES-256';
            vpg.vpnConfig.hashAlgo = peer.vpnConfig.hashAlgo || 'SHA-256';
            vpg.vpnConfig.dhGroup = peer.vpnConfig.dhGroup || 14;
            peer.vpnConfig.ikeVersion = vpg.vpnConfig.ikeVersion;
            peer.vpnConfig.encryption = vpg.vpnConfig.encryption;
            peer.vpnConfig.hashAlgo = vpg.vpnConfig.hashAlgo;
            peer.vpnConfig.dhGroup = vpg.vpnConfig.dhGroup;
            fixes.push(`Synced VPN crypto params between ${vpg.hostname} ↔ ${peer.hostname}`);
          }
        }
      });
    });
  }

  // Fix 4: VPCs should have vpcConfig
  state.devices.filter(d => d.type === 'vpc').forEach(vpc => {
    if (!vpc.vpcConfig) {
      vpc.vpcConfig = { cidr: '10.0.0.0/16', dnsSupport: true, dnsHostnames: true, flowLogs: false, tenancy: 'default', peerings: [] };
      fixes.push(`Auto-initialized VPC config on ${vpc.hostname}`);
    }
  });

  // Fix 5: Devices stacked at default position (400,400) — spread them out
  const stacked = state.devices.filter(d => d.x === 400 && d.y === 400);
  if (stacked.length > 1) {
    const cols = Math.ceil(Math.sqrt(stacked.length));
    stacked.forEach((d, i) => {
      d.x = 200 + (i % cols) * 200;
      d.y = 200 + Math.floor(i / cols) * 180;
    });
    fixes.push(`Spread ${stacked.length} overlapping devices across canvas`);
  }

  // Fix 6: Ensure cross-subnet routing — add static routes on routers for subnets they don't directly connect to
  if (routers.length > 1) {
    routers.forEach(r => {
      const connectedNets = new Set(r.routingTable.filter(rt => rt.type === 'connected').map(rt => rt.network));
      // Check if any other router has subnets this router doesn't know about
      routers.forEach(other => {
        if (other.id === r.id) return;
        const otherNets = other.routingTable.filter(rt => rt.type === 'connected');
        otherNets.forEach(net => {
          if (!connectedNets.has(net.network) && !r.routingTable.some(rt => rt.network === net.network)) {
            // Find a next-hop — look for a shared cable/subnet between these two routers
            const shared = r.interfaces.find(ifc => ifc.ip && other.interfaces.some(oi => oi.ip && tbSameSubnet(ifc.ip, oi.ip, ifc.mask)));
            if (shared) {
              const nextHop = other.interfaces.find(oi => oi.ip && tbSameSubnet(shared.ip, oi.ip, shared.mask))?.ip;
              if (nextHop) {
                r.routingTable.push({ type: 'static', network: net.network, mask: net.mask, nextHop, iface: shared.name });
                fixes.push(`Added static route on ${r.hostname}: ${net.network} via ${nextHop}`);
              }
            }
          }
        });
      });
    });
  }

  return fixes;
}

// Semantic pre-processing: expand shorthand descriptions into detailed instructions
function tbExpandScenario(scenario) {
  let expanded = scenario;
  // Map common shorthand to explicit device types
  const expansions = [
    [/\bdata cent(er|re)s?\b/gi, 'onprem-dc(s)'],
    [/\bDC[s]?\b/g, 'onprem-dc(s)'],
    [/\bconnected via VPN\b/gi, 'connected via vpg devices with vpnConfig'],
    [/\bVPN tunnel\b/gi, 'VPN via vpg with vpnConfig'],
    [/\bsite.to.site\b/gi, 'site-to-site VPN (vpg + onprem-dc)'],
    [/\boverlay\b/gi, 'VXLAN overlay (vxlanConfig on switches)'],
    [/\bfabric\b/gi, 'spine-leaf with VXLAN'],
    [/\bspine.leaf\b/gi, 'spine switches at top, leaf switches at bottom, each leaf connects to each spine'],
    [/\bDCI\b/g, 'Data Center Interconnect (VXLAN between DCs)'],
    [/\bSD.WAN\b/gi, 'SD-WAN (routers with VXLAN/IPSec)'],
    [/\b3.tier\b/gi, 'three-tier (core routers → distribution switches → access switches → endpoints)'],
    [/\bcollapsed core\b/gi, 'collapsed core (combined core/distribution switches)'],
    [/\bHA\b/g, 'high availability (dual devices, redundant paths)'],
    [/\bredundant\b/gi, 'redundant (dual devices with cross-connections)'],
    [/\bZTNA\b/gi, 'Zero Trust (sase-edge with ZTNA)'],
    [/\bwireless\b/gi, 'wireless (wap + wlc with wirelessConfig)'],
    [/\bDNS\b/g, 'DNS (dns-server with dnsRecords)'],
    [/\bOSPF\b/g, 'OSPF (routers with ospfConfig enabled)'],
    [/\bdynamic routing\b/gi, 'OSPF dynamic routing (ospfConfig on routers)'],
    [/\bSTP\b/g, 'STP (switches with stpConfig)'],
    [/\bspanning tree\b/gi, 'Spanning Tree (switches with stpConfig)'],
    [/\bQoS\b/g, 'QoS (routers with qosConfig)'],
    [/\bIPv6\b/g, 'IPv6 (interfaces with ipv6 addresses)'],
    [/\bdual.stack\b/gi, 'dual-stack IPv4+IPv6 (interfaces with both ip and ipv6)'],
    [/\bBGP\b/g, 'BGP (routers with bgpConfig, asn, neighbors)'],
    [/\beBGP\b/gi, 'eBGP (bgpConfig with type ebgp, different ASNs)'],
    [/\biBGP\b/gi, 'iBGP (bgpConfig with type ibgp, same ASN)'],
    [/\bEIGRP\b/g, 'EIGRP (routers with eigrpConfig enabled)'],
    [/\bautonomous system\b/gi, 'Autonomous System (routers with bgpConfig asn)'],
    [/\bDNSSEC\b/g, 'DNSSEC (dns-server with dnssecEnabled and DNSKEY/RRSIG/DS records)'],
    [/\bARP spoof\b/gi, 'ARP spoofing defense (switches with daiEnabled)'],
    [/\bDHCP snooping\b/gi, 'DHCP snooping (switches with dhcpSnooping enabled)'],
    [/\bport security\b/gi, 'port security (switches with portSecurity enabled)'],
    [/\bnetwork hardening\b/gi, 'hardened network (switches with dhcpSnooping, daiEnabled, portSecurity)'],
  ];
  expansions.forEach(([re, replacement]) => {
    if (re.test(expanded)) expanded = expanded.replace(re, replacement);
  });
  return expanded;
}

async function tbGenerateAiTopology() {
  const key = (localStorage.getItem(STORAGE.KEY) || '').trim();
  if (!key) { showErrorToast('Add your Anthropic API key in Settings to use AI generation.'); return; }

  const hasExisting = tbState.devices.length > 0;
  let mode = 'new';
  if (hasExisting) {
    const choice = prompt(
      `You have ${tbState.devices.length} device(s) on the canvas.\n\n` +
      `Type ADD to add to the existing topology\n` +
      `Type NEW to start from scratch\n\n` +
      `Then describe what you want:\n\n` +
      `Examples:\n` +
      `• ADD a DMZ segment with 2 public servers and a firewall\n` +
      `• ADD 2 data centres connected via VPN\n` +
      `• ADD 5 PCs and a printer to the existing switch\n` +
      `• ADD a VXLAN overlay between the spine switches\n` +
      `• NEW enterprise network with 3 VLANs and DMZ\n` +
      `• NEW spine-leaf fabric with VXLAN overlay\n` +
      `• NEW 2 data centres connected via site-to-site VPN`
    );
    if (!choice) return;
    const trimmed = choice.trim();
    const addMatch = trimmed.match(/^add\b\s*(.*)/i);
    const newMatch = trimmed.match(/^new\b\s*(.*)/i);
    if (addMatch) {
      mode = 'add';
      var scenario = addMatch[1] || trimmed;
    } else if (newMatch) {
      mode = 'new';
      var scenario = newMatch[1] || trimmed;
    } else {
      mode = 'add';
      var scenario = trimmed;
    }
  } else {
    var scenario = prompt('Describe the network you want to build.\n\nExamples:\n• "Enterprise network with 3 VLANs, DMZ, 2 firewalls, IDS, load balancer"\n• "2 data centres connected via site-to-site VPN"\n• "Spine-leaf data center fabric with VXLAN"\n• "Star-bus hybrid topology with 4 switches, 12 PCs"\n• "AWS VPC with public/private subnets, NAT gateway, VPN to on-prem DC"\n• "Ring topology with 5 routers"\n• "Full mesh between 4 routers"\n• "ISP edge with 3 customer sites connected via VPN"\n\nBe as detailed as you want — complex is fine:');
    if (!scenario) return;
  }

  // Phase 1: Semantic expansion — map shorthand to explicit device types/configs
  const expandedScenario = tbExpandScenario(scenario);

  showErrorToast(mode === 'add' ? 'AI generating... Phase 1/2: Building topology' : 'AI generating... Phase 1/2: Building topology');
  try {
    const basePrompt = tbAiBasePrompt();
    let genPrompt;

    if (mode === 'add') {
      const existingContext = tbSerializeForAiContext();
      const existingHostnames = tbState.devices.map(d => d.hostname);
      const usedXs = tbState.devices.map(d => d.x);
      const usedYs = tbState.devices.map(d => d.y);
      const maxX = Math.max(...usedXs, 100);
      const maxY = Math.max(...usedYs, 100);
      const minX = Math.min(...usedXs, 1300);
      const minY = Math.min(...usedYs, 720);
      const deviceCap = 50 - tbState.devices.length;

      genPrompt = `You are an expert network architect. You are ADDING new devices and cables to an EXISTING network topology. Do NOT re-create existing devices.

${basePrompt}

EXISTING TOPOLOGY (DO NOT recreate these — they already exist):
${existingContext}

EXISTING HOSTNAMES (already taken, use different names): ${existingHostnames.join(', ')}

OCCUPIED CANVAS REGION: roughly x:${minX}-${maxX}, y:${minY}-${maxY}. Place NEW devices in EMPTY areas to avoid overlap. Good options: ${maxX < 900 ? 'right side (x:900-1300)' : minX > 400 ? 'left side (x:100-400)' : 'bottom area (y:500-720)'} or any unoccupied area.

IMPORTANT RULES FOR ADD MODE:
- Output ONLY the NEW devices and cables. Do NOT include existing devices.
- You can reference existing device hostnames in cables (fromHostname/toHostname) to connect new devices to the existing topology.
- Max ${deviceCap} new devices (${tbState.devices.length} already exist, limit is 50).
- Use hostnames that don't conflict with existing ones.
- Make sure IP addressing is compatible with existing subnets. Look at existing IPs to pick non-conflicting addresses.
- If the user wants to connect to an existing device, use that device's hostname in the cable definition and pick an interface name that might be free.
- For VPN connections: create vpg devices and include vpnConfig with matching crypto parameters on both VPN endpoints.
- For VXLAN: include vxlanConfig arrays on switches/routers with matching VNIs and VTEP IPs.

USER REQUEST: Add the following to the existing topology: ${expandedScenario}

Generate JSON with ONLY the new devices and cables.`;
    } else {
      genPrompt = `You are an expert network architect and CompTIA Network+ instructor. Generate a detailed, realistic network topology as a JSON object.

${basePrompt}

USER REQUEST: ${expandedScenario}

Generate the complete topology JSON now.`;
    }

    // Helper: call the AI and parse the response
    async function _tbCallAiAndParse(promptText, maxTok) {
      const r = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTok, messages: [{ role: 'user', content: promptText }] })
      });
      if (!r.ok) return { error: r.status };
      const d = await r.json();
      const stopReason = d.stop_reason || '';
      const txt = (d.content && d.content[0] && d.content[0].text) || '';
      console.log('[AI Topology] stop_reason:', stopReason, 'response length:', txt.length);
      console.log('[AI Topology] raw response (first 500 chars):', txt.substring(0, 500));
      if (stopReason === 'max_tokens') console.warn('[AI Topology] Response was TRUNCATED — max_tokens reached');
      return { text: txt, stopReason, parsed: tbParseAiTopologyJson(txt) };
    }

    // Attempt 1: full prompt with 8192 tokens
    let result = await _tbCallAiAndParse(genPrompt, 8192);
    if (result.error) { showErrorToast(`AI generation failed: ${result.error}`); return; }
    let payload = result.parsed;

    // If parse failed or truncated, retry with a simplified prompt + more tokens
    if (!payload || !payload.devices) {
      console.warn('[AI Topology] First attempt failed, retrying with simplified prompt...');
      showErrorToast('Retrying with simplified prompt...');
      const retryPrompt = `You are a network architect. Generate a JSON topology for: "${scenario}"

VALID DEVICE TYPES: ${Object.keys(TB_DEVICE_TYPES).join(', ')}
- "data center"/"data centre" → use type "onprem-dc"
- VPN between DCs → use type "vpg" (VPN Gateway) wired between DCs, include vpnConfig on vpg and onprem-dc devices
- vpnConfig example: {"peerIp":"","psk":"Secret123","ikeVersion":"IKEv2","encryption":"AES-256","hashAlgo":"SHA-256","dhGroup":14}

OUTPUT FORMAT — ONLY valid JSON, nothing else:
{"devices":[{"type":"onprem-dc","hostname":"DC1","x":200,"y":400,"interfaces":[{"name":"eth0","ip":"10.1.1.1","mask":"255.255.255.0","gateway":""}],"routingTable":[],"vpnConfig":null}],"cables":[{"fromHostname":"DC1","fromIface":"eth0","toHostname":"VPG1","toIface":"tun0","type":"fiber"}]}

Generate the topology now. ONLY JSON output.`;
      const retry = await _tbCallAiAndParse(retryPrompt, 8192);
      if (retry.error) { showErrorToast(`AI retry failed: ${retry.error}`); return; }
      payload = retry.parsed;
      if (payload && payload.devices) console.log('[AI Topology] Retry succeeded!');
    }

    if (!payload || !payload.devices) {
      console.error('[AI Topology] Both attempts failed. Raw response:', result.text);
      showErrorToast('AI returned invalid topology. Check browser console for details. Try a simpler description.');
      return;
    }

    if (mode === 'add') {
      const hostnameToId = {};
      tbState.devices.forEach(d => { hostnameToId[d.hostname] = d.id; });
      tbBuildFromAiPayload(payload, tbState, hostnameToId);
      tbMigrateState(tbState);
    } else {
      const newState = tbNewState();
      newState.name = scenario.slice(0, 40);
      const hostnameToId = {};
      tbBuildFromAiPayload(payload, newState, hostnameToId);
      tbState = newState;
    }

    // Phase 2: Deep validation + auto-fix
    showErrorToast('Phase 2/2: Validating & fixing...');
    const fixes = tbDeepValidateAndFix(tbState, scenario);
    tbMigrateState(tbState);
    tbSelectedId = null;
    tbPendingCableFrom = null;
    tbSaveDraft();
    tbRenderCanvas();
    tbUpdateDeviceCount();
    const fixMsg = fixes.length > 0 ? ` (${fixes.length} auto-fixes applied)` : '';
    if (mode === 'add') {
      tbUpdateStatus(`AI added ${payload.devices.length} device(s)${fixMsg}`);
    } else {
      tbUpdateStatus(`AI generated: "${tbState.name}"${fixMsg}`);
    }
    if (fixes.length > 0) {
      console.log('AI Deep Generation fixes:', fixes);
    }
  } catch (e) {
    showErrorToast('AI generation error: ' + (e.message || 'unknown'));
  }
}

// AI device walkthrough — explain a device's role and config
function tbCloseExplainModal() {
  const m = document.getElementById('tb-explain-modal');
  if (m) m.classList.add('is-hidden');
}

async function tbExplainDevice(deviceId) {
  const dev = tbState.devices.find(d => d.id === deviceId);
  if (!dev) return;
  const key = (localStorage.getItem(STORAGE.KEY) || '').trim();
  if (!key) { showErrorToast('Add your Anthropic API key in Settings.'); return; }

  // Show modal immediately in loading state
  const modal = document.getElementById('tb-explain-modal');
  const body = document.getElementById('tb-explain-body');
  const title = document.getElementById('tb-explain-modal-title');
  if (!modal || !body) return;
  title.textContent = `💡 ${dev.hostname} (${TB_DEVICE_TYPES[dev.type]?.label || dev.type})`;
  body.innerHTML = '<div style="text-align:center;padding:32px 16px;color:var(--text-dim)"><div class="tb-coach-spinner" style="margin:0 auto 12px"></div>AI is analyzing this device…</div>';
  modal.classList.remove('is-hidden');

  const serialized = tbSerializeTopology(tbState);
  const devDetail = JSON.stringify({
    hostname: dev.hostname, type: dev.type,
    interfaces: dev.interfaces.map(i => ({ name: i.name, ip: i.ip, mask: i.mask, vlan: i.vlan, mode: i.mode, gateway: i.gateway })),
    routingTable: dev.routingTable,
    dhcpServer: dev.dhcpServer,
  }, null, 2);

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL, max_tokens: 800,
        messages: [{ role: 'user', content: `You are a Network+ instructor. Explain this device's role in the network in 2-3 paragraphs. Include what N10-009 concepts it demonstrates.\n\nFull topology:\n${serialized}\n\nDevice detail:\n${devDetail}\n\nKeep it under 200 words. No JSON, just plain text.` }]
      })
    });
    if (!res.ok) { body.innerHTML = `<div style="padding:20px;color:var(--red)">API error: ${res.status}. Check your API key in Settings.</div>`; return; }
    const data = await res.json();
    const text = (data.content && data.content[0] && data.content[0].text) || 'No response.';
    // Render explanation in the modal with nice formatting
    const paragraphs = text.split('\n').filter(l => l.trim()).map(p => `<p style="margin:0 0 12px;line-height:1.6">${p}</p>`).join('');
    body.innerHTML = `<div style="padding:20px">${paragraphs}</div>`;
  } catch (e) {
    body.innerHTML = `<div style="padding:20px;color:var(--red)">Error: ${e.message || 'Unknown error'}</div>`;
  }
}

// ══════════════════════════════════════════
// TOPOLOGY BUILDER — Guided Topology Labs
// ══════════════════════════════════════════

const TB_LABS = [
  {
    id: 'basic-lan',
    title: 'Basic LAN Setup',
    objective: '1.2',
    difficulty: 'Beginner',
    duration: '10 min',
    description: 'Build a simple LAN with a router, switch, and 3 PCs. Configure IPs and verify connectivity with ping.',
    steps: [
      {
        title: 'Drop a Router onto the canvas',
        instruction: 'Drag a **Router** from the palette onto the canvas. This will be your default gateway — the device that routes traffic between subnets.',
        hint: 'Find "Router" in the device palette on the left. Click and drag it onto the canvas.',
        check: (s) => s.devices.some(d => d.type === 'router'),
        feedback: (s) => s.devices.some(d => d.type === 'router') ? null : 'No router found. Drag a Router from the palette onto the canvas.',
      },
      {
        title: 'Drop a Switch',
        instruction: 'Drag a **Switch** onto the canvas below the router. Switches operate at **Layer 2** and forward frames based on MAC addresses. Unlike hubs, switches learn which MAC is on which port.',
        hint: 'A switch connects multiple devices at Layer 2. It is NOT a router — it does not route between subnets.',
        check: (s) => s.devices.some(d => d.type === 'switch' || d.type === 'dmz-switch'),
        feedback: (s) => s.devices.some(d => d.type === 'switch' || d.type === 'dmz-switch') ? null : 'No switch found. Drag a Switch from the palette.',
      },
      {
        title: 'Connect Router to Switch',
        instruction: 'Click the **Router**, then click the **Switch** to draw a cable between them. This cable will carry traffic between your LAN and the router.',
        hint: 'Click on one device, then click on another device — a cable is drawn automatically between available interfaces.',
        check: (s) => s.cables.length >= 1,
        feedback: (s) => {
          if (s.cables.length === 0) return 'No cables found. Click one device, then click another to cable them.';
          const c = s.cables[0];
          const hasR = s.devices.find(d => d.id === c.from)?.type === 'router' || s.devices.find(d => d.id === c.to)?.type === 'router';
          return hasR ? null : 'Cable exists but does not connect to the router. Connect the router to the switch.';
        },
      },
      {
        title: 'Add 3 PCs and wire them',
        instruction: 'Drag **3 PCs** onto the canvas and connect **each one** to the Switch. In a star topology, all endpoints connect to the central switch.',
        hint: 'You need 3 PCs and at least 4 cables total (1 router-switch + 3 PC-switch).',
        check: (s) => s.devices.filter(d => d.type === 'pc').length >= 3 && s.cables.length >= 4,
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc').length;
          const cables = s.cables.length;
          if (pcs < 3) return `Only ${pcs}/3 PCs placed. Add ${3 - pcs} more.`;
          if (cables < 4) return `Only ${cables}/4 cables. Connect each PC to the switch.`;
          return null;
        },
      },
      {
        title: 'Configure Router IP',
        instruction: 'Double-click the **Router** → **Interfaces** tab. Set the connected interface IP to `192.168.1.1` with mask `255.255.255.0`. This IP becomes the **default gateway** for all PCs.',
        hint: 'The router interface IP is what PCs use as their gateway. Without it, the router cannot route traffic.',
        check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.interfaces.some(i => i.ip); },
        feedback: (s) => {
          const r = s.devices.find(d => d.type === 'router');
          if (!r) return 'No router found.';
          if (!r.interfaces.some(i => i.ip)) return 'Router has no IP configured. Double-click it → Interfaces tab → set an IP.';
          return null;
        },
      },
      {
        title: 'Configure PC IPs + gateways',
        instruction: 'Double-click each **PC** and set their IPs to `192.168.1.10`, `.11`, `.12` with mask `255.255.255.0`. Set each PC\'s **gateway** to `192.168.1.1` (the router). Without a gateway, PCs cannot reach other subnets!',
        hint: 'Each PC needs: (1) a unique IP in the same subnet as the router, (2) the gateway field pointing to the router IP.',
        check: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc');
          return pcs.filter(p => p.interfaces.some(i => i.ip)).length >= 3;
        },
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc');
          const withIp = pcs.filter(p => p.interfaces.some(i => i.ip));
          const withGw = pcs.filter(p => p.interfaces.some(i => i.gateway));
          if (withIp.length < 3) return `${withIp.length}/3 PCs have IPs. Configure the rest.`;
          if (withGw.length < 3) return `${withGw.length}/3 PCs have gateways. Set gateway to the router IP (192.168.1.1).`;
          return null;
        },
      },
      {
        title: 'Test Connectivity — Ping!',
        instruction: 'Click **Ping** in the toolbar. Select **PC1 → PC2** and hit **Ping**. Watch the packet animate across the network! Then try **PC1 → Router**. Open the **Sim Log** to see each hop. Finally, try `show arp` in PC1\'s CLI to see the learned MAC addresses.',
        hint: 'Ping validates Layer 3 connectivity. ARP resolves IPs to MACs first, then ICMP packets flow.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'vlan-segmentation',
    title: 'VLAN Network Segmentation',
    objective: '2.1',
    difficulty: 'Intermediate',
    duration: '15 min',
    description: 'Segment a network using VLANs. Configure access ports, trunk ports, and verify isolation between VLANs.',
    steps: [
      {
        title: 'Build the base network',
        instruction: 'Create: **1 Router, 1 Switch, 4 PCs**. Connect all PCs to the Switch and the Switch to the Router. This gives us a flat network that we\'ll segment with VLANs.',
        hint: 'You need 5 cables minimum: 1 router-switch + 4 PC-switch.',
        check: (s) => s.devices.filter(d => d.type === 'pc').length >= 4 && s.devices.some(d => d.type === 'switch') && s.cables.length >= 5,
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc').length;
          const sw = s.devices.some(d => d.type === 'switch');
          if (pcs < 4) return `${pcs}/4 PCs placed.`;
          if (!sw) return 'No switch found.';
          if (s.cables.length < 5) return `${s.cables.length}/5 cables.`;
          return null;
        },
      },
      {
        title: 'Create VLANs 10 & 20',
        instruction: 'Double-click the **Switch** → **VLANs** tab. Add **VLAN 10** (name: "Sales") and **VLAN 20** (name: "Engineering"). VLANs create **separate broadcast domains** on the same physical switch — traffic from VLAN 10 cannot reach VLAN 20 without a router.',
        hint: 'VLAN 1 (default) already exists. You need to add two more. Each VLAN is like a virtual switch within the physical switch.',
        check: (s) => { const sw = s.devices.find(d => d.type === 'switch'); return sw && sw.vlanDb && sw.vlanDb.length >= 3; },
        feedback: (s) => {
          const sw = s.devices.find(d => d.type === 'switch');
          if (!sw) return 'No switch found.';
          const count = sw.vlanDb ? sw.vlanDb.length : 0;
          if (count < 3) return `Switch has ${count} VLANs (need 3: default + VLAN 10 + VLAN 20).`;
          const has10 = sw.vlanDb.some(v => v.id === 10);
          const has20 = sw.vlanDb.some(v => v.id === 20);
          if (!has10) return 'Missing VLAN 10 — add it in the VLANs tab.';
          if (!has20) return 'Missing VLAN 20 — add it in the VLANs tab.';
          return null;
        },
      },
      {
        title: 'Assign access ports',
        instruction: 'Switch → **Interfaces** tab. Set **2 PC-facing ports** to VLAN 10 (access mode) and **2 ports** to VLAN 20. An **access port** carries traffic for only ONE VLAN — the switch strips the VLAN tag before sending frames to the end device.',
        hint: 'In the Interfaces tab, change the VLAN dropdown for each port. Access mode = single VLAN. The PC never sees the VLAN tag.',
        check: (s) => { const sw = s.devices.find(d => d.type === 'switch'); return sw && sw.interfaces.filter(i => i.vlan === 10).length >= 2; },
        feedback: (s) => {
          const sw = s.devices.find(d => d.type === 'switch');
          if (!sw) return 'No switch found.';
          const v10 = sw.interfaces.filter(i => i.vlan === 10).length;
          const v20 = sw.interfaces.filter(i => i.vlan === 20).length;
          return `VLAN 10 ports: ${v10}/2, VLAN 20 ports: ${v20}/2. Assign ports in the Interfaces tab.`;
        },
      },
      {
        title: 'Configure the trunk port',
        instruction: 'Set the Switch port **facing the Router** to **Trunk** mode. Set allowed VLANs to `1,10,20`. A **trunk port** carries traffic for MULTIPLE VLANs using 802.1Q tags — the router needs to see which VLAN each frame belongs to.',
        hint: 'Trunk vs Access: trunk = multi-VLAN with tags, access = single VLAN without tags. The uplink to the router MUST be a trunk for inter-VLAN routing.',
        check: (s) => { const sw = s.devices.find(d => d.type === 'switch'); return sw && sw.interfaces.some(i => i.mode === 'trunk'); },
        feedback: (s) => {
          const sw = s.devices.find(d => d.type === 'switch');
          if (!sw) return 'No switch found.';
          const trunk = sw.interfaces.find(i => i.mode === 'trunk');
          if (!trunk) return 'No trunk port found. Change the router-facing port to Trunk mode.';
          return null;
        },
      },
      {
        title: 'Router-on-a-Stick',
        instruction: 'Double-click the **Router** → **Interfaces** tab. Set the connected interface IP to `192.168.10.1/24` (VLAN 10 gateway). This pattern is called **Router-on-a-Stick** — one physical interface handles multiple VLANs via sub-interfaces or secondary addresses.',
        hint: 'The router needs at least one IP in the VLAN 10 subnet to serve as its gateway.',
        check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.interfaces.some(i => i.ip); },
        feedback: (s) => {
          const r = s.devices.find(d => d.type === 'router');
          if (!r) return 'No router found.';
          if (!r.interfaces.some(i => i.ip)) return 'Router has no IP. Set an IP on the trunk-facing interface.';
          return null;
        },
      },
      {
        title: 'Configure PCs per VLAN',
        instruction: 'VLAN 10 PCs: `192.168.10.10`, `.11` (gateway `192.168.10.1`). VLAN 20 PCs: `192.168.20.10`, `.11` (gateway `192.168.20.1`). Each VLAN uses a **different subnet** — that\'s how VLANs map to IP addressing.',
        hint: 'VLAN 10 = 192.168.10.0/24, VLAN 20 = 192.168.20.0/24. PCs in different VLANs MUST be in different subnets.',
        check: (s) => s.devices.filter(d => d.type === 'pc' && d.interfaces.some(i => i.ip)).length >= 4,
        feedback: (s) => {
          const withIp = s.devices.filter(d => d.type === 'pc' && d.interfaces.some(i => i.ip)).length;
          return withIp < 4 ? `${withIp}/4 PCs have IPs configured.` : null;
        },
      },
      {
        title: 'Test VLAN isolation',
        instruction: 'Ping **within** VLAN 10 (PC to PC) — should succeed directly. Then ping **across** VLANs (VLAN 10 PC → VLAN 20 PC) — this traffic MUST go through the router. Open the **Sim Log** to see the path. Try `show mac address-table` on the switch to see per-port VLAN assignments.',
        hint: 'Same-VLAN traffic is switched (Layer 2). Cross-VLAN traffic is routed (Layer 3). This is inter-VLAN routing.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'dhcp-setup',
    title: 'DHCP Server & Relay',
    objective: '1.6',
    difficulty: 'Intermediate',
    duration: '15 min',
    description: 'Set up a DHCP server to automatically assign IPs, then configure DHCP relay to serve a remote subnet.',
    steps: [
      {
        title: 'Build two subnets',
        instruction: 'Create: **1 Router, 2 Switches, 1 Server, 4 PCs**. Connect Switch1 + Server + 2 PCs on one side of the Router, and Switch2 + 2 PCs on the other. The router separates two broadcast domains.',
        hint: 'The router needs TWO interfaces — one facing each switch/subnet.',
        check: (s) => s.devices.filter(d => d.type === 'switch').length >= 2 && s.devices.some(d => d.type === 'server'),
        feedback: (s) => {
          const swCount = s.devices.filter(d => d.type === 'switch').length;
          const hasSrv = s.devices.some(d => d.type === 'server');
          if (swCount < 2) return `${swCount}/2 switches placed.`;
          if (!hasSrv) return 'No server found. Drag a Server from the palette.';
          return null;
        },
      },
      {
        title: 'Configure Router interfaces',
        instruction: 'Double-click the Router. Set the interface facing Switch1 to `192.168.1.1/24` and the interface facing Switch2 to `192.168.2.1/24`. The router now bridges two subnets — **192.168.1.0/24** and **192.168.2.0/24**.',
        hint: 'Each interface must be in a different subnet. That\'s what makes a router a router — it connects different networks.',
        check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.interfaces.filter(i => i.ip).length >= 2; },
        feedback: (s) => {
          const r = s.devices.find(d => d.type === 'router');
          if (!r) return 'No router found.';
          const ips = r.interfaces.filter(i => i.ip).length;
          return ips < 2 ? `Router has ${ips}/2 interfaces configured with IPs.` : null;
        },
      },
      {
        title: 'Configure DHCP Server',
        instruction: 'Double-click the **Server** → **DHCP** tab. Enable DHCP with: network `192.168.1.0`, mask `255.255.255.0`, gateway `192.168.1.1`, range `192.168.1.100`-`192.168.1.200`. Set the server static IP to `192.168.1.5`. The DHCP server uses the **DORA** process: Discover → Offer → Request → Acknowledge.',
        hint: 'The DHCP server itself needs a static IP (not DHCP-assigned). Set it in the Interfaces tab first, then configure the DHCP pool in the DHCP tab.',
        check: (s) => { const srv = s.devices.find(d => d.type === 'server'); return srv && srv.dhcpServer; },
        feedback: (s) => {
          const srv = s.devices.find(d => d.type === 'server');
          if (!srv) return 'No server found.';
          if (!srv.dhcpServer) return 'DHCP not configured. Double-click the Server → DHCP tab → enable and configure the pool.';
          return null;
        },
      },
      {
        title: 'Test DHCP — watch DORA!',
        instruction: 'Make sure PCs on Switch1 have **no IP** (clear them if set). Click **DHCP** in the toolbar. Watch the Sim Log — you\'ll see the full **DORA** exchange:\n\n1. **Discover**: PC broadcasts "I need an IP!"\n2. **Offer**: Server says "Here\'s 192.168.1.100"\n3. **Request**: PC says "I\'ll take it"\n4. **Acknowledge**: Server confirms the lease\n\nVerify the PCs got IPs by double-clicking them.',
        hint: 'DHCP Discover uses broadcast (255.255.255.255) because the client has no IP yet. The server offers from its pool.',
        check: () => true,
        feedback: () => null,
      },
      {
        title: 'Configure DHCP Relay',
        instruction: 'PCs on Switch2 are in a **different broadcast domain** — DHCP Discovers won\'t reach the server! Fix: double-click the **Router** → **DHCP** tab → set **ip helper-address** to `192.168.1.5`. The router will now **relay** (unicast forward) DHCP broadcasts from Subnet 2 to the server.',
        hint: 'DHCP Relay (ip helper-address) converts broadcast to unicast. Without it, DHCP only works within the same broadcast domain.',
        check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.dhcpRelay; },
        feedback: (s) => {
          const r = s.devices.find(d => d.type === 'router');
          if (!r) return 'No router found.';
          if (!r.dhcpRelay) return 'DHCP Relay not configured. Router → DHCP tab → set ip helper-address to the server IP.';
          return null;
        },
      },
      {
        title: 'Test DHCP Relay across subnets',
        instruction: 'Clear IPs on Switch2 PCs. Click **DHCP** again. Watch the Sim Log — the router intercepts the Discover broadcast, relays it as unicast to the DHCP server at `192.168.1.5`. The server responds with an offer. Without the relay, these PCs would never get an IP! Verify by checking PC interfaces.',
        hint: 'The relay works because the router changes the giaddr field in the DHCP packet to its own interface IP (192.168.2.1), telling the server which subnet the request came from.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'dmz-firewall',
    title: 'DMZ & Firewall Design',
    objective: '4.5',
    difficulty: 'Advanced',
    duration: '20 min',
    description: 'Design a screened subnet (DMZ) with firewalls protecting public servers from the internal network.',
    steps: [
      {
        title: 'Place the perimeter firewall',
        instruction: 'Drag an **Internet/WAN** (cloud) and a **Firewall** onto the canvas. Connect the Cloud to the Firewall. The firewall is your **perimeter security device** — it inspects all traffic entering and leaving your network. In the real world, this would be a Palo Alto, Fortinet, or Cisco ASA.',
        hint: 'The firewall needs at least 3 zones: Outside (internet), DMZ (semi-trusted), Inside (trusted). Each zone is a different interface.',
        check: (s) => s.devices.some(d => d.type === 'firewall') && s.devices.some(d => d.type === 'cloud'),
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'cloud')) return 'No Internet/WAN cloud found.';
          if (!s.devices.some(d => d.type === 'firewall')) return 'No Firewall found.';
          return null;
        },
      },
      {
        title: 'Create the DMZ segment',
        instruction: 'Drag a **DMZ Switch** and connect it to the Firewall. Then place a **Public Web Server** and **Public File Server** on the DMZ switch. The DMZ (Demilitarized Zone) is a **semi-trusted zone** — it holds servers that must be internet-accessible but should NOT have direct access to your internal network.',
        hint: 'DMZ = screened subnet. Public servers go here so a compromise doesn\'t directly expose internal resources.',
        check: (s) => s.devices.some(d => d.type === 'dmz-switch') && s.devices.some(d => d.type.startsWith('public-')),
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'dmz-switch')) return 'No DMZ Switch found.';
          if (!s.devices.some(d => d.type.startsWith('public-'))) return 'No public servers found. Add a Public Web Server or Public File Server.';
          return null;
        },
      },
      {
        title: 'Build the internal LAN',
        instruction: 'Drag a regular **Switch** and connect it to the Firewall (different interface than DMZ). Add **2+ PCs** and a **Server** to the internal switch. This is your **trusted zone** — highest security, most restricted access from outside.',
        hint: 'The firewall now has 3 interfaces: eth0 → Internet, eth1 → DMZ, eth2 → Internal. Each with different security policies.',
        check: (s) => s.devices.filter(d => d.type === 'pc').length >= 2 && s.cables.length >= 6,
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc').length;
          if (pcs < 2) return `${pcs}/2 internal PCs.`;
          if (s.cables.length < 6) return `${s.cables.length}/6 cables.`;
          return null;
        },
      },
      {
        title: 'Configure 3-zone addressing',
        instruction: 'Set IPs on the Firewall:\n• **Outside** (internet-facing): `203.0.113.1/24`\n• **DMZ**: `10.0.1.1/24`\n• **Inside**: `192.168.1.1/24`\n\nPublic servers: `10.0.1.10`, `10.0.1.11` (gateway `10.0.1.1`).\nInternal PCs: `192.168.1.10+` (gateway `192.168.1.1`).',
        hint: 'Three different subnets, three different security zones. The firewall is the gateway for all three.',
        check: (s) => { const fw = s.devices.find(d => d.type === 'firewall'); return fw && fw.interfaces.filter(i => i.ip).length >= 2; },
        feedback: (s) => {
          const fw = s.devices.find(d => d.type === 'firewall');
          if (!fw) return 'No firewall found.';
          const ips = fw.interfaces.filter(i => i.ip).length;
          return ips < 3 ? `Firewall has ${ips}/3 interfaces with IPs. Configure all 3 zones.` : null;
        },
      },
      {
        title: 'Grade your DMZ design',
        instruction: 'Select the **DMZ / Screened Subnet** scenario from the toolbar dropdown, then hit **Grade**. Critical rule: **ALL public servers MUST be on the DMZ switch**, not the internal switch. If a public server is on the internal network, an attacker who compromises it gets direct LAN access — that\'s the whole point of a DMZ!',
        hint: 'Common mistake: putting public servers on the internal switch. The grader checks for this.',
        check: () => true,
        feedback: () => null,
      },
      {
        title: 'Get AI Coach review',
        instruction: 'Hit **Coach** for an AI-powered walkthrough of your design. The coach analyzes your topology against N10-009 objectives 4.5 (Physical Security) and 4.1 (Security Concepts). It will highlight strengths and suggest improvements — like adding an IDS for traffic inspection or a second firewall for defense-in-depth.',
        hint: 'Defense-in-depth: multiple layers of security. Consider adding an IDS between the firewall and DMZ for packet inspection.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'arp-investigation',
    title: 'ARP & MAC Learning',
    objective: '2.1',
    difficulty: 'Beginner',
    duration: '10 min',
    description: 'Watch how ARP broadcasts resolve IPs to MACs and how switches learn MAC addresses.',
    steps: [
      {
        title: 'Build a simple LAN',
        instruction: 'Create: **1 Switch, 3 PCs**. Connect all PCs to the Switch. Set IPs: PC1=`192.168.1.10`, PC2=`192.168.1.11`, PC3=`192.168.1.12`. Mask: `255.255.255.0`. All devices MUST be in the same subnet for ARP to work — ARP is a **Layer 2 broadcast** protocol that doesn\'t cross routers.',
        hint: 'ARP maps IP → MAC within a broadcast domain. You don\'t need a router for this lab since all devices are on the same subnet.',
        check: (s) => s.devices.filter(d => d.type === 'pc' && d.interfaces.some(i => i.ip)).length >= 3,
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc');
          const withIp = pcs.filter(p => p.interfaces.some(i => i.ip)).length;
          if (pcs.length < 3) return `${pcs.length}/3 PCs placed.`;
          if (withIp < 3) return `${withIp}/3 PCs have IPs.`;
          return null;
        },
      },
      {
        title: 'Verify empty MAC table',
        instruction: 'Double-click the **Switch** → **CLI** tab. Type `show mac address-table`. It should be **empty** — no frames have been sent yet, so the switch hasn\'t learned any MACs. Switches start with a blank table and learn dynamically.',
        hint: 'MAC tables are populated by examining the SOURCE MAC of incoming frames. No traffic = no entries.',
        check: () => true,
        feedback: () => null,
      },
      {
        title: 'Send an ARP request',
        instruction: 'Click **Ping/ARP** in the toolbar. Select **PC1** as source and **PC2** as destination. Click **ARP** (not Ping). Watch the Sim Log:\n\n1. PC1 sends an **ARP Request** (broadcast to FF:FF:FF:FF:FF:FF): "Who has 192.168.1.11? Tell 192.168.1.10"\n2. The switch floods this frame out ALL ports (broadcast behavior)\n3. PC2 recognizes its IP and sends an **ARP Reply** (unicast) with its MAC\n4. PC1 stores the mapping in its ARP cache',
        hint: 'ARP Request = broadcast (everyone hears it). ARP Reply = unicast (only the requester gets it).',
        check: () => true,
        feedback: () => null,
      },
      {
        title: 'Inspect tables after ARP',
        instruction: 'Now check what was learned:\n• PC1 CLI: `show arp` — you should see PC2\'s IP→MAC mapping\n• Switch CLI: `show mac address-table` — it learned **both** PC1 and PC2\'s MACs on their respective ports\n\nThe switch learned MACs from the **source** of each frame it saw (the ARP request from PC1, the ARP reply from PC2).',
        hint: 'Switches learn from source MACs, forward based on destination MACs. This is the fundamental L2 forwarding model.',
        check: () => true,
        feedback: () => null,
      },
      {
        title: 'Observe broadcast flooding',
        instruction: 'Send another ARP: **PC1 → PC3**. Check the Sim Log — the ARP request was **broadcast to ALL ports** on the switch (including PC2\'s port), but only PC3 replies. This is the broadcast domain in action. All devices on a switch (same VLAN) share one broadcast domain — that\'s why VLANs exist, to segment broadcasts! Try `show arp` on PC1 to see both PC2 and PC3 cached.',
        hint: 'Broadcast storms happen when too many devices share a broadcast domain. VLANs solve this by creating separate broadcast domains.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  // ── Cloud Networking Labs ──
  {
    id: 'cloud-vpc-lab',
    title: 'Cloud VPC with Security Controls',
    objective: '1.8',
    difficulty: 'Intermediate',
    duration: '15 min',
    description: 'Build a cloud VPC with public/private subnets, security groups, NACLs, and an IPSec VPN to an on-prem data center.',
    steps: [
      {
        title: 'Create a VPC',
        instruction: 'Drag a **VPC** device onto the canvas. Double-click it → **VPC Config** tab. Set CIDR to `10.0.0.0/16`. Enable **DNS Support** and **DNS Hostnames**. A VPC is a logically isolated section of the cloud — think of it as your own private data center in AWS/Azure.',
        hint: '/16 gives you 65,534 usable IPs — enough to subdivide into many subnets.',
        check: (s) => s.devices.some(d => d.type === 'vpc' && d.vpcConfig && d.vpcConfig.cidr),
        feedback: (s) => {
          const vpc = s.devices.find(d => d.type === 'vpc');
          if (!vpc) return 'No VPC found. Drag one from the palette.';
          if (!vpc.vpcConfig || !vpc.vpcConfig.cidr) return 'VPC CIDR not set. Double-click VPC → VPC Config → set CIDR.';
          return null;
        },
      },
      {
        title: 'Add Subnets',
        instruction: 'Drag **2 Cloud Subnets** and wire both to the VPC. Name one "Public-Subnet" and one "Private-Subnet". Public subnets have a route to an Internet Gateway. Private subnets do NOT — they\'re isolated from direct internet access.',
        hint: 'Subnet naming matters for clarity. Public = internet-routable. Private = internal only (uses NAT for outbound).',
        check: (s) => s.devices.filter(d => d.type === 'cloud-subnet').length >= 2,
        feedback: (s) => {
          const count = s.devices.filter(d => d.type === 'cloud-subnet').length;
          return count < 2 ? `${count}/2 subnets placed. Add ${2 - count} more Cloud Subnet(s).` : null;
        },
      },
      {
        title: 'Attach Internet Gateway',
        instruction: 'Drag an **Internet Gateway** and wire it to the VPC. An IGW is the VPC\'s door to the internet. Without it, nothing in the VPC can reach the outside world. In AWS, you also need a route table entry (0.0.0.0/0 → IGW).',
        hint: 'IGW is horizontally scaled, redundant, and highly available. It performs 1:1 NAT for instances with public IPs.',
        check: (s) => s.devices.some(d => d.type === 'igw'),
        feedback: (s) => s.devices.some(d => d.type === 'igw') ? null : 'No Internet Gateway found.',
      },
      {
        title: 'Add NAT Gateway',
        instruction: 'Drag a **NAT Gateway** and wire it to the **Public Subnet**. The NAT GW allows private subnet instances to make **outbound** internet requests (e.g., software updates) without being directly reachable from the internet. It\'s one-way: out is OK, inbound from internet is blocked.',
        hint: 'NAT GW lives in the PUBLIC subnet (it needs internet access itself) but serves the PRIVATE subnet.',
        check: (s) => s.devices.some(d => d.type === 'nat-gw'),
        feedback: (s) => s.devices.some(d => d.type === 'nat-gw') ? null : 'No NAT Gateway found.',
      },
      {
        title: 'Configure Security Groups (stateful)',
        instruction: 'Double-click the **VPC** → **Security Groups** tab. Add a group named "web-sg". Add an **inbound** rule: Protocol `tcp`, Port `443`, Source `0.0.0.0/0`, Action `allow`. Security Groups are **stateful** — if you allow inbound 443, the return traffic is automatically allowed. You only need to define the initiating direction.',
        hint: 'Stateful = tracks connections. Stateless (NACLs) = does not track. SGs are instance-level, NACLs are subnet-level.',
        check: (s) => s.devices.some(d => d.securityGroups && d.securityGroups.length > 0),
        feedback: (s) => {
          const withSg = s.devices.find(d => d.securityGroups && d.securityGroups.length > 0);
          if (!withSg) return 'No Security Groups configured. Double-click VPC → Security Groups tab → Add a group.';
          const sg = withSg.securityGroups[0];
          if (!sg.rules || sg.rules.length === 0) return 'Security Group exists but has no rules. Add an inbound allow rule for TCP/443.';
          return null;
        },
      },
      {
        title: 'Configure NACLs (stateless)',
        instruction: 'Double-click **Public Subnet** → **NACLs** tab. Add inbound rules:\n• Rule #100: Allow TCP/443\n• Rule #200: Allow TCP/80\n\nNACLs are **stateless** — you MUST add matching outbound rules too! Add outbound Rule #100: Allow All. NACLs evaluate rules by number (lowest first), first match wins. There\'s an implicit deny-all at the end.',
        hint: 'NACL gotcha: forgetting outbound rules. Since NACLs don\'t track state, return traffic for an allowed inbound connection will be DENIED if no outbound rule permits it.',
        check: (s) => s.devices.some(d => d.type === 'cloud-subnet' && d.nacls && d.nacls.length > 0),
        feedback: (s) => {
          const sub = s.devices.find(d => d.type === 'cloud-subnet' && d.nacls && d.nacls.length > 0);
          if (!sub) return 'No NACLs configured on any subnet. Double-click a Cloud Subnet → NACLs tab.';
          return null;
        },
      },
      {
        title: 'VPN to On-Prem (IPSec)',
        instruction: 'Drag a **VPN Gateway** and an **On-Prem DC**. Wire VPG → VPC and VPG → On-Prem DC. Double-click both and go to the **VPN** tab. Set matching parameters on BOTH sides:\n• IKEv2, AES-256, SHA-256, DH Group 14, same PSK (e.g., "MySecret123")\n\nClick **Negotiate Tunnel** on either side. If all 5 crypto params match + PSK matches, the tunnel comes UP (green). Mismatches show specific error messages.',
        hint: 'IPSec Phase 1 (IKE) negotiates the security association. Both sides MUST agree on: IKE version, encryption algorithm, hash algorithm, DH group, and pre-shared key.',
        check: (s) => s.devices.some(d => d.type === 'vpg') && s.devices.some(d => d.type === 'onprem-dc'),
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'vpg')) return 'No VPN Gateway found.';
          if (!s.devices.some(d => d.type === 'onprem-dc')) return 'No On-Prem DC found.';
          return null;
        },
      },
    ]
  },
  {
    id: 'sase-zero-trust',
    title: 'SASE & Zero Trust Architecture',
    objective: '4.1',
    difficulty: 'Advanced',
    duration: '12 min',
    description: 'Design a SASE architecture with zero trust network access, secure web gateway, and firewall-as-a-service.',
    steps: [
      {
        title: 'Cloud foundation',
        instruction: 'Add a **VPC**, **Cloud Subnet**, and **Internet GW**. Wire IGW → VPC → Subnet. Set VPC CIDR to `10.0.0.0/16`. This is your cloud infrastructure that SASE will protect.',
        hint: 'SASE (Secure Access Service Edge) combines network security functions (SWG, CASB, FWaaS, ZTNA) into a single cloud-delivered service.',
        check: (s) => s.devices.some(d => d.type === 'vpc') && s.devices.some(d => d.type === 'igw'),
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'vpc')) return 'No VPC found.';
          if (!s.devices.some(d => d.type === 'igw')) return 'No Internet Gateway found.';
          return null;
        },
      },
      {
        title: 'Add SASE Edge',
        instruction: 'Drag a **SASE Edge** device and wire it between the Internet GW and the VPC. In a real deployment, all traffic passes through the SASE edge for inspection — it\'s the policy enforcement point for your entire network.',
        hint: 'SASE replaces traditional VPN + firewall + proxy with a unified cloud service. Think Zscaler, Palo Alto Prisma, or Cisco Umbrella.',
        check: (s) => s.devices.some(d => d.type === 'sase-edge'),
        feedback: (s) => s.devices.some(d => d.type === 'sase-edge') ? null : 'No SASE Edge device found.',
      },
      {
        title: 'Configure Zero Trust (ZTNA)',
        instruction: 'Double-click SASE Edge → **SASE** tab. Configure:\n• **ZTNA Policy**: "Verify Always" (every request is authenticated, every session validated)\n• **SWG**: Enabled (Secure Web Gateway — URL filtering, malware scanning)\n• **CASB**: Enabled (Cloud Access Security Broker — shadow IT detection)\n• **Identity Provider**: "Azure AD"\n• **MFA**: Enabled\n\nZero Trust means: **never trust, always verify**. No implicit trust based on network location.',
        hint: 'The three pillars of Zero Trust: (1) Verify explicitly, (2) Least-privilege access, (3) Assume breach.',
        check: (s) => s.devices.some(d => d.saseConfig && d.saseConfig.ztnaPolicy === 'verify-always'),
        feedback: (s) => {
          const sase = s.devices.find(d => d.type === 'sase-edge');
          if (!sase) return 'No SASE Edge device found.';
          if (!sase.saseConfig) return 'SASE not configured. Double-click the SASE Edge → SASE tab.';
          if (sase.saseConfig.ztnaPolicy !== 'verify-always') return `ZTNA Policy is "${sase.saseConfig.ztnaPolicy}" — set it to "Verify Always".`;
          if (!sase.saseConfig.swg) return 'SWG is disabled. Enable it.';
          if (!sase.saseConfig.casb) return 'CASB is disabled. Enable it.';
          return null;
        },
      },
      {
        title: 'Add FWaaS rules',
        instruction: 'In the SASE tab, add **FWaaS** (Firewall as a Service) rules:\n1. Allow TCP/443 from `0.0.0.0/0` (HTTPS traffic)\n2. Allow TCP/80 from `0.0.0.0/0` (HTTP)\n3. Deny ALL from `0.0.0.0/0` (default deny)\n\nFWaaS replaces on-prem firewalls with cloud-native packet filtering. Rules are processed top-to-bottom.',
        hint: 'Order matters! Allow rules must come before the deny-all. This is the same as traditional ACL processing.',
        check: (s) => s.devices.some(d => d.saseConfig && d.saseConfig.fwaasPolicies && d.saseConfig.fwaasPolicies.length >= 2),
        feedback: (s) => {
          const sase = s.devices.find(d => d.saseConfig);
          if (!sase || !sase.saseConfig) return 'SASE not configured.';
          const rules = sase.saseConfig.fwaasPolicies || [];
          return rules.length < 2 ? `${rules.length}/2 FWaaS rules added. Add more rules in the SASE tab.` : null;
        },
      },
      {
        title: 'Hybrid connectivity (VPN)',
        instruction: 'Add an **On-Prem DC** and **VPN Gateway**. Wire VPG to VPC and to On-Prem DC. Configure matching **IPSec** on both sides and **negotiate the tunnel**. In a SASE world, this VPN might be replaced by ZTNA agent-based access, but IPSec site-to-site tunnels remain common for legacy integration.',
        hint: 'SASE doesn\'t eliminate VPNs overnight — most enterprises run hybrid (SASE + traditional VPN) during migration.',
        check: (s) => s.devices.some(d => d.type === 'onprem-dc'),
        feedback: (s) => s.devices.some(d => d.type === 'onprem-dc') ? null : 'No On-Prem DC found.',
      },
      {
        title: 'Verify via CLI',
        instruction: 'Double-click SASE Edge → **CLI**. Type `show sase` to see your full SASE configuration (ZTNA policy, SWG, CASB, FWaaS rules). Then check `show security-groups` on the VPC for instance-level controls. You\'ve built a complete Zero Trust architecture with: **ZTNA** (identity verification), **SWG** (web filtering), **CASB** (cloud app control), **FWaaS** (network filtering), and **IPSec VPN** (site-to-site connectivity).',
        hint: 'On the exam, remember: SASE = convergence of network + security in the cloud. ZTNA replaces VPN for user access.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  // ── New interactive labs ──
  {
    id: 'troubleshoot-connectivity',
    title: 'Troubleshoot: Why Can\'t I Ping?',
    objective: '5.3',
    difficulty: 'Intermediate',
    duration: '12 min',
    description: 'A pre-built network has connectivity issues. Use CLI tools to diagnose and fix them — just like a real helpdesk scenario.',
    autoSetup: (s) => {
      // Pre-build a broken network for the student to fix
      const rId = 'd_auto_r1', swId = 'd_auto_sw1', pc1Id = 'd_auto_pc1', pc2Id = 'd_auto_pc2', pc3Id = 'd_auto_pc3';
      s.devices = [
        { id: rId, type: 'router', x: 700, y: 150, hostname: 'R1',
          interfaces: [
            { name: 'Gi0/0', cableId: 'c_auto_1', ip: '192.168.1.1', mask: '255.255.255.0', mac: 'AA:BB:CC:00:00:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
            { name: 'Gi0/1', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:00:00:02', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
          ],
          routingTable: [{ type: 'connected', network: '192.168.1.0', mask: '255.255.255.0', nextHop: null, iface: 'Gi0/0' }],
          arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
        { id: swId, type: 'switch', x: 700, y: 350, hostname: 'SW1',
          interfaces: [
            { name: 'Fa0/0', cableId: 'c_auto_1', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:00:01:00', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
            { name: 'Fa0/1', cableId: 'c_auto_2', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:00:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
            { name: 'Fa0/2', cableId: 'c_auto_3', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:00:01:02', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
            { name: 'Fa0/3', cableId: 'c_auto_4', ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:00:01:03', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
          ].concat(Array.from({length: 20}, (_, i) => ({ name: `Fa0/${i+4}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:BB:CC:00:01:${(i+4).toString(16).padStart(2,'0')}`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }))),
          routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [] },
        // PC1: correct config
        { id: pc1Id, type: 'pc', x: 400, y: 550, hostname: 'PC1',
          interfaces: [{ name: 'eth0', cableId: 'c_auto_2', ip: '192.168.1.10', mask: '255.255.255.0', mac: 'AA:BB:CC:00:02:00', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.1', enabled: true, subInterfaces: [] }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
        // PC2: WRONG subnet — 192.168.2.x instead of 192.168.1.x (the bug!)
        { id: pc2Id, type: 'pc', x: 700, y: 550, hostname: 'PC2',
          interfaces: [{ name: 'eth0', cableId: 'c_auto_3', ip: '192.168.2.20', mask: '255.255.255.0', mac: 'AA:BB:CC:00:03:00', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.2.1', enabled: true, subInterfaces: [] }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
        // PC3: correct IP but WRONG gateway
        { id: pc3Id, type: 'pc', x: 1000, y: 550, hostname: 'PC3',
          interfaces: [{ name: 'eth0', cableId: 'c_auto_4', ip: '192.168.1.30', mask: '255.255.255.0', mac: 'AA:BB:CC:00:04:00', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.254', enabled: true, subInterfaces: [] }],
          routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [] },
      ];
      s.cables = [
        { id: 'c_auto_1', from: rId, to: swId, type: 'cat6', fromIface: 'Gi0/0', toIface: 'Fa0/0' },
        { id: 'c_auto_2', from: pc1Id, to: swId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/1' },
        { id: 'c_auto_3', from: pc2Id, to: swId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/2' },
        { id: 'c_auto_4', from: pc3Id, to: swId, type: 'cat6', fromIface: 'eth0', toIface: 'Fa0/3' },
      ];
      s.name = 'Troubleshoot: Broken LAN';
    },
    steps: [
      {
        title: 'Survey the network',
        instruction: 'A user reports **PC2 and PC3 cannot access the network**. PC1 works fine. The network has been pre-built for you. Start by examining: double-click each PC and check the **Overview** tab to see their IP configurations. Compare them to the router\'s config. What do you notice?',
        hint: 'Look at the subnet. PC1 is on 192.168.1.0/24 — are the other PCs on the same subnet? Check gateways too.',
        check: () => true,
        feedback: () => null,
      },
      {
        title: 'Diagnose PC2',
        instruction: 'Double-click **PC2** → **CLI**. Run `ipconfig` to see its IP. Then try `ping 192.168.1.1` (the router). It fails! Now compare PC2\'s IP to the router\'s subnet. **Find the bug and fix it**: PC2 is on the wrong subnet. Change its IP to `192.168.1.20/24` and gateway to `192.168.1.1`.',
        hint: 'PC2 is on 192.168.2.0/24 but the router is on 192.168.1.0/24. They\'re in different subnets — ARP won\'t resolve across subnets without a router for that subnet.',
        check: (s) => {
          const pc2 = s.devices.find(d => d.hostname === 'PC2');
          return pc2 && pc2.interfaces.some(i => i.ip && i.ip.startsWith('192.168.1.'));
        },
        feedback: (s) => {
          const pc2 = s.devices.find(d => d.hostname === 'PC2');
          if (!pc2) return 'PC2 not found.';
          const ifc = pc2.interfaces[0];
          if (ifc.ip.startsWith('192.168.2.')) return `PC2 is still on ${ifc.ip} (wrong subnet). Change it to 192.168.1.x.`;
          if (ifc.gateway !== '192.168.1.1') return `PC2 IP is fixed but gateway is ${ifc.gateway || 'empty'}. Set it to 192.168.1.1.`;
          return null;
        },
      },
      {
        title: 'Diagnose PC3',
        instruction: 'PC3 has the right subnet but still can\'t reach beyond the switch. Double-click PC3 → check the **gateway**. It\'s pointing to `192.168.1.254` but the router is at `192.168.1.1`! Fix the gateway. This is a common real-world issue — wrong default gateway means the PC can ping local hosts but not remote ones.',
        hint: 'Same-subnet traffic doesn\'t need a gateway (Layer 2 switching). Cross-subnet traffic needs the correct gateway.',
        check: (s) => {
          const pc3 = s.devices.find(d => d.hostname === 'PC3');
          return pc3 && pc3.interfaces.some(i => i.gateway === '192.168.1.1');
        },
        feedback: (s) => {
          const pc3 = s.devices.find(d => d.hostname === 'PC3');
          if (!pc3) return 'PC3 not found.';
          const ifc = pc3.interfaces[0];
          if (ifc.gateway === '192.168.1.254') return 'PC3 gateway is still 192.168.1.254 (wrong). Change it to 192.168.1.1.';
          if (ifc.gateway !== '192.168.1.1') return `PC3 gateway is "${ifc.gateway}". Set it to 192.168.1.1.`;
          return null;
        },
      },
      {
        title: 'Verify your fixes',
        instruction: 'Now test! Use **Ping**: PC2 → R1 (should work now). PC3 → R1 (should work). PC1 → PC2 (should work). PC1 → PC3 (should work). Check the Sim Log to see the successful path. If any ping fails, re-check the IP/subnet/gateway of the failing device. You\'ve just completed a real troubleshooting workflow: **identify → diagnose → fix → verify**.',
        hint: 'The CompTIA troubleshooting methodology: 1) Identify the problem, 2) Establish a theory, 3) Test the theory, 4) Establish a plan of action, 5) Implement, 6) Verify, 7) Document.',
        check: (s) => {
          const pc2 = s.devices.find(d => d.hostname === 'PC2');
          const pc3 = s.devices.find(d => d.hostname === 'PC3');
          const pc2ok = pc2 && pc2.interfaces.some(i => i.ip && i.ip.startsWith('192.168.1.') && i.gateway === '192.168.1.1');
          const pc3ok = pc3 && pc3.interfaces.some(i => i.gateway === '192.168.1.1');
          return pc2ok && pc3ok;
        },
        feedback: (s) => {
          const pc2 = s.devices.find(d => d.hostname === 'PC2');
          const pc3 = s.devices.find(d => d.hostname === 'PC3');
          const issues = [];
          if (pc2 && !pc2.interfaces.some(i => i.ip && i.ip.startsWith('192.168.1.'))) issues.push('PC2 still has wrong IP subnet');
          if (pc2 && !pc2.interfaces.some(i => i.gateway === '192.168.1.1')) issues.push('PC2 gateway not set to 192.168.1.1');
          if (pc3 && !pc3.interfaces.some(i => i.gateway === '192.168.1.1')) issues.push('PC3 gateway not set to 192.168.1.1');
          return issues.length ? issues.join('. ') + '.' : null;
        },
      },
    ]
  },
  {
    id: 'multi-site-wan',
    title: 'Multi-Site WAN with ISP',
    objective: '1.2',
    difficulty: 'Advanced',
    duration: '20 min',
    description: 'Connect 3 office sites through an ISP router with proper routing, NAT concepts, and WAN links.',
    steps: [
      {
        title: 'Create the ISP core',
        instruction: 'Drag an **Internet/WAN** cloud and an **ISP Router** onto the canvas. Connect them. The ISP Router represents your service provider\'s edge — it peers with your customer routers. Set ISP Router\'s interface facing the cloud to `203.0.113.1/24`.',
        hint: 'ISP routers use public IP space (203.0.113.x is documentation range — safe for labs).',
        check: (s) => s.devices.some(d => d.type === 'isp-router') && s.devices.some(d => d.type === 'cloud'),
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'cloud')) return 'No Internet/WAN cloud.';
          if (!s.devices.some(d => d.type === 'isp-router')) return 'No ISP Router. Drag one from the palette.';
          return null;
        },
      },
      {
        title: 'Build Site A — HQ',
        instruction: 'Add a **Router** (R-HQ), **Switch**, **2 PCs**, and a **Server**. Wire: ISP → R-HQ → Switch → PCs/Server. ISP-facing interface: `10.0.1.1/30`. Internal: `192.168.10.1/24`. PCs: `192.168.10.10+`. Use **fiber** for the ISP→R-HQ cable (long distance WAN link).',
        hint: '/30 on WAN links = 2 usable IPs (point-to-point). /24 on LANs = 254 hosts.',
        check: (s) => {
          const rHQ = s.devices.find(d => d.type === 'router' && d.interfaces.some(i => i.ip && i.ip.startsWith('192.168.10.')));
          return !!rHQ && s.devices.filter(d => d.type === 'pc').length >= 2;
        },
        feedback: (s) => {
          const routers = s.devices.filter(d => d.type === 'router');
          if (routers.length < 1) return 'No site router found. Add a Router for HQ.';
          const pcs = s.devices.filter(d => d.type === 'pc').length;
          if (pcs < 2) return `${pcs}/2 PCs placed for Site A.`;
          return null;
        },
      },
      {
        title: 'Build Sites B & C',
        instruction: 'Repeat for **Site B** (R-Branch1, Switch, 2 PCs, subnet `192.168.20.0/24`, WAN `10.0.2.1/30`) and **Site C** (R-Branch2, Switch, 2 PCs, subnet `192.168.30.0/24`, WAN `10.0.3.1/30`). Wire each site router to the ISP Router with **fiber** cables.',
        hint: 'Each site gets its own subnet. The ISP router connects all three WAN links.',
        check: (s) => s.devices.filter(d => d.type === 'router').length >= 3,
        feedback: (s) => {
          const routers = s.devices.filter(d => d.type === 'router').length;
          return routers < 3 ? `${routers}/3 site routers placed. Add routers for each site.` : null;
        },
      },
      {
        title: 'Configure ISP routing',
        instruction: 'The ISP Router needs routes to all 3 site LANs. Double-click the ISP Router → **Routing** tab. Add static routes:\n• `192.168.10.0/24` → next hop `10.0.1.1`\n• `192.168.20.0/24` → next hop `10.0.2.1`\n• `192.168.30.0/24` → next hop `10.0.3.1`\n\nEach site router also needs a default route (`0.0.0.0/0`) pointing to the ISP.',
        hint: 'Without routing tables, routers only know about directly connected subnets. Static routes tell them where to forward packets for remote networks.',
        check: (s) => {
          const isp = s.devices.find(d => d.type === 'isp-router');
          return isp && isp.routingTable && isp.routingTable.filter(r => r.type === 'static').length >= 2;
        },
        feedback: (s) => {
          const isp = s.devices.find(d => d.type === 'isp-router');
          if (!isp) return 'No ISP Router found.';
          const statics = (isp.routingTable || []).filter(r => r.type === 'static').length;
          return statics < 3 ? `ISP has ${statics}/3 static routes. Add routes for all site subnets.` : null;
        },
      },
      {
        title: 'Test cross-site connectivity',
        instruction: 'Ping from a **Site A PC** to a **Site B PC**. Watch the path in the Sim Log — it should go: PC → R-HQ → ISP → R-Branch1 → SW → PC. Try `traceroute` from PC1\'s CLI: `traceroute 192.168.20.10`. You should see each hop with its IP. If it fails, check routing tables on intermediate routers with `show ip route`.',
        hint: 'traceroute shows every Layer 3 hop. Each router decrements TTL and sends Time Exceeded when TTL=0.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  // ── v4.29.0 Labs ──
  {
    id: 'static-routing',
    title: 'Static Routing Between Subnets',
    objective: '1.4',
    difficulty: 'Intermediate',
    duration: '15 min',
    description: 'Build a 3-subnet network with 2 routers. Configure static routes so all subnets can communicate. This is the #1 tested concept on the Network+ exam.',
    steps: [
      {
        title: 'Build the core — 2 routers, 2 switches',
        instruction: 'Create **Router R1**, **Router R2**, **Switch SW1**, and **Switch SW2**. Cable R1 ↔ R2 (backbone link), R1 ↔ SW1 (LAN A), and R2 ↔ SW2 (LAN B). This gives you 3 subnets: LAN A, the point-to-point backbone, and LAN B.',
        hint: 'The backbone between routers is its own subnet (e.g. 10.0.0.0/30). LANs are /24 subnets.',
        check: (s) => s.devices.filter(d => d.type === 'router').length >= 2 && s.devices.filter(d => d.type === 'switch').length >= 2 && s.cables.length >= 3,
        feedback: (s) => {
          const routers = s.devices.filter(d => d.type === 'router').length;
          const switches = s.devices.filter(d => d.type === 'switch').length;
          if (routers < 2) return `${routers}/2 routers placed.`;
          if (switches < 2) return `${switches}/2 switches placed.`;
          if (s.cables.length < 3) return `${s.cables.length}/3 cables. Need: R1↔R2, R1↔SW1, R2↔SW2.`;
          return null;
        },
      },
      {
        title: 'Add endpoints to each LAN',
        instruction: 'Add **2 PCs** to SW1 (LAN A) and **2 PCs** to SW2 (LAN B). Cable each PC to its local switch. You should now have 7 cables total.',
        hint: 'Each LAN needs its own set of PCs connected to the local switch, not to the routers.',
        check: (s) => s.devices.filter(d => d.type === 'pc').length >= 4 && s.cables.length >= 7,
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc').length;
          if (pcs < 4) return `${pcs}/4 PCs placed.`;
          if (s.cables.length < 7) return `${s.cables.length}/7 cables.`;
          return null;
        },
      },
      {
        title: 'Configure R1 interfaces',
        instruction: 'Double-click **R1** → Interfaces tab.\n\n• **LAN A interface** (connected to SW1): `192.168.1.1/24`\n• **Backbone interface** (connected to R2): `10.0.0.1/30`\n\nR1 needs IPs on **both** connected interfaces. A router without IPs is just an expensive paperweight!',
        hint: 'A /30 subnet gives exactly 2 usable IPs — perfect for a point-to-point link between routers.',
        check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.interfaces.filter(i => i.ip).length >= 2; },
        feedback: (s) => {
          const r = s.devices.find(d => d.type === 'router');
          if (!r) return 'No router found.';
          const ipCount = r.interfaces.filter(i => i.ip).length;
          return ipCount < 2 ? `R1 has ${ipCount}/2 interfaces with IPs. Both connected interfaces need IPs.` : null;
        },
      },
      {
        title: 'Configure R2 interfaces',
        instruction: 'Double-click **R2** → Interfaces tab.\n\n• **LAN B interface** (connected to SW2): `192.168.2.1/24`\n• **Backbone interface** (connected to R1): `10.0.0.2/30`\n\nNote: R2\'s backbone IP must be in the **same /30 subnet** as R1\'s (10.0.0.1 and 10.0.0.2 share 10.0.0.0/30).',
        hint: 'Both backbone IPs must be in the same subnet. 10.0.0.1/30 and 10.0.0.2/30 share the same network (10.0.0.0/30).',
        check: (s) => {
          const routers = s.devices.filter(d => d.type === 'router');
          return routers.length >= 2 && routers[1].interfaces.filter(i => i.ip).length >= 2;
        },
        feedback: (s) => {
          const routers = s.devices.filter(d => d.type === 'router');
          if (routers.length < 2) return 'Need 2 routers.';
          const ipCount = routers[1].interfaces.filter(i => i.ip).length;
          return ipCount < 2 ? `R2 has ${ipCount}/2 interfaces with IPs.` : null;
        },
      },
      {
        title: 'Add static routes on both routers',
        instruction: 'Each router knows its connected subnets, but NOT the remote LAN. Fix this with **static routes**:\n\n• **R1** → Routing tab: Add `192.168.2.0/24` via `10.0.0.2`\n• **R2** → Routing tab: Add `192.168.1.0/24` via `10.0.0.1`\n\nThis tells each router where to send packets destined for the other LAN.',
        hint: 'Static routes format: destination network + next-hop IP. The next-hop must be directly reachable (on a connected subnet).',
        check: (s) => {
          const routers = s.devices.filter(d => d.type === 'router');
          return routers.length >= 2 && routers.every(r => r.routingTable && r.routingTable.some(rt => rt.type === 'static'));
        },
        feedback: (s) => {
          const routers = s.devices.filter(d => d.type === 'router');
          const r1Statics = (routers[0]?.routingTable || []).filter(r => r.type === 'static').length;
          const r2Statics = (routers[1]?.routingTable || []).filter(r => r.type === 'static').length;
          if (r1Statics === 0 && r2Statics === 0) return 'Neither router has static routes. Add them in the Routing tab.';
          if (r1Statics === 0) return 'R1 has no static routes — it can\'t reach LAN B.';
          if (r2Statics === 0) return 'R2 has no static routes — it can\'t reach LAN A.';
          return null;
        },
      },
      {
        title: 'Configure PC IPs and gateways',
        instruction: 'Set IPs on all 4 PCs:\n\n• **LAN A PCs**: `192.168.1.10`, `192.168.1.11`, gateway `192.168.1.1`\n• **LAN B PCs**: `192.168.2.10`, `192.168.2.11`, gateway `192.168.2.1`\n\nThe gateway MUST point to the local router. Without it, PCs don\'t know where to send cross-subnet traffic.',
        hint: 'Every endpoint needs: (1) IP in same subnet as its local router interface, (2) gateway = that router interface IP.',
        check: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc');
          return pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway)).length >= 4;
        },
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc');
          const withBoth = pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway)).length;
          return withBoth < 4 ? `${withBoth}/4 PCs have both IP and gateway configured.` : null;
        },
      },
      {
        title: 'Test — Ping across subnets',
        instruction: 'Open **Ping** → select a LAN A PC as source and a LAN B PC as destination. Hit Ping and watch the packet traverse R1 → R2. Check the **Sim Log** to see each hop. Then run `show ip route` on R1\'s CLI to verify your routing table. Try `traceroute 192.168.2.10` from PC1 to see all hops.',
        hint: 'If ping fails: check that both routers have static routes AND that PC gateways point to the correct router.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'acl-traffic-filter',
    title: 'ACL Traffic Filtering',
    objective: '4.3',
    difficulty: 'Advanced',
    duration: '15 min',
    description: 'Configure Access Control Lists on a firewall to permit web traffic but deny all other traffic. Learn how ACLs filter packets by protocol, port, and IP address.',
    steps: [
      {
        title: 'Build the network — Internet, Firewall, LAN',
        instruction: 'Create: **1 Internet/WAN cloud**, **1 Firewall**, **1 Switch**, **2 PCs**, **1 Server**. Cable: Cloud ↔ Firewall ↔ Switch, PCs and Server to Switch. This simulates a corporate network with a perimeter firewall.',
        hint: 'The firewall sits between the untrusted Internet and your internal LAN — it inspects and filters all traffic crossing the boundary.',
        check: (s) => s.devices.some(d => d.type === 'firewall') && s.devices.some(d => d.type === 'server') && s.cables.length >= 5,
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'firewall')) return 'No firewall placed. Drag one from the palette.';
          if (!s.devices.some(d => d.type === 'server')) return 'No server placed. You need a server to protect.';
          if (s.cables.length < 5) return `${s.cables.length}/5 cables. Connect all devices.`;
          return null;
        },
      },
      {
        title: 'Configure Firewall interfaces',
        instruction: 'Double-click the **Firewall** → Interfaces tab. Set:\n\n• **eth0** (outside/WAN-facing): `203.0.113.1/24`\n• **eth1** (inside/LAN-facing): `192.168.1.1/24`\n\nThe firewall needs IPs on both zones to route and filter traffic between them.',
        hint: 'Firewalls operate at Layer 3+ — they need IPs to route and inspect packets. The outside interface uses a public IP range.',
        check: (s) => { const fw = s.devices.find(d => d.type === 'firewall'); return fw && fw.interfaces.filter(i => i.ip).length >= 2; },
        feedback: (s) => {
          const fw = s.devices.find(d => d.type === 'firewall');
          if (!fw) return 'No firewall found.';
          const ipCount = fw.interfaces.filter(i => i.ip).length;
          return ipCount < 2 ? `Firewall has ${ipCount}/2 IPs. Both inside and outside interfaces need IPs.` : null;
        },
      },
      {
        title: 'Configure Server and PC IPs',
        instruction: 'Set the **Server** IP to `192.168.1.100` (gateway `192.168.1.1`). Set PCs to `192.168.1.10` and `192.168.1.11` (same gateway). All internal devices use the firewall\'s inside interface as their gateway.',
        hint: 'The firewall is the default gateway for ALL internal devices — it controls what traffic enters and leaves the network.',
        check: (s) => {
          const srv = s.devices.find(d => d.type === 'server');
          const pcs = s.devices.filter(d => d.type === 'pc');
          return srv && srv.interfaces.some(i => i.ip) && pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway)).length >= 2;
        },
        feedback: (s) => {
          const srv = s.devices.find(d => d.type === 'server');
          if (!srv || !srv.interfaces.some(i => i.ip)) return 'Server needs an IP address.';
          const pcs = s.devices.filter(d => d.type === 'pc');
          const configured = pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway)).length;
          return configured < 2 ? `${configured}/2 PCs fully configured (need IP + gateway).` : null;
        },
      },
      {
        title: 'Add ACL rules on the Firewall',
        instruction: 'Double-click **Firewall** → **ACLs** tab. Create rules:\n\n1. **ALLOW** TCP port **80** (HTTP) from `0.0.0.0/0`\n2. **ALLOW** TCP port **443** (HTTPS) from `0.0.0.0/0`\n3. **DENY** all other inbound traffic\n\nACLs are processed **top-down, first match wins**. Order matters!',
        hint: 'ACLs on the exam: standard ACLs filter by source IP only. Extended ACLs filter by source, destination, protocol, and port. These are extended ACLs.',
        check: (s) => { const fw = s.devices.find(d => d.type === 'firewall'); return fw && fw.acls && fw.acls.length >= 2; },
        feedback: (s) => {
          const fw = s.devices.find(d => d.type === 'firewall');
          if (!fw) return 'No firewall found.';
          const count = (fw.acls || []).length;
          return count < 2 ? `Firewall has ${count} ACL rules. Add at least 2 rules (allow HTTP + HTTPS).` : null;
        },
      },
      {
        title: 'Verify with CLI commands',
        instruction: 'Open the **Firewall CLI** and run:\n\n• `show acl` — view your configured rules\n• `show ip route` — verify routing between zones\n\nIn a real network, you\'d test by sending HTTP traffic through the firewall and confirming HTTPS passes while other protocols are blocked.',
        hint: 'On the Network+ exam, know that implicit DENY ALL exists at the end of every ACL. If no rule matches, traffic is dropped.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'site-to-site-vpn',
    title: 'Site-to-Site VPN',
    objective: '3.3',
    difficulty: 'Advanced',
    duration: '20 min',
    description: 'Connect two on-premises data centers over a VPN tunnel. Configure VPN gateways with matching crypto parameters and verify the tunnel negotiates successfully.',
    autoSetup: (state) => {
      // Pre-build two DCs and a cloud, but leave VPN unconfigured
      const dc1 = { id: 'd_vpnlab_dc1', type: 'onprem-dc', x: 200, y: 400, hostname: 'DC-East',
        interfaces: [{ name: 'eth0', cableId: null, ip: '10.1.0.1', mask: '255.255.255.0', mac: 'AA:BB:CC:01:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
      const dc2 = { id: 'd_vpnlab_dc2', type: 'onprem-dc', x: 1100, y: 400, hostname: 'DC-West',
        interfaces: [{ name: 'eth0', cableId: null, ip: '10.2.0.1', mask: '255.255.255.0', mac: 'AA:BB:CC:02:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
      const vpg1 = { id: 'd_vpnlab_vpg1', type: 'vpg', x: 450, y: 400, hostname: 'VPG-East',
        interfaces: [{ name: 'tun0', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:03:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
                     { name: 'tun1', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:03:02:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
      const vpg2 = { id: 'd_vpnlab_vpg2', type: 'vpg', x: 850, y: 400, hostname: 'VPG-West',
        interfaces: [{ name: 'tun0', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:04:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
                     { name: 'tun1', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:04:02:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
      const cloud = { id: 'd_vpnlab_cloud', type: 'cloud', x: 650, y: 200, hostname: 'Internet',
        interfaces: [{ name: 'eth0', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:05:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
                     { name: 'eth1', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:05:02:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] }],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
      state.devices.push(dc1, dc2, vpg1, vpg2, cloud);
      // Cable: DC1 ↔ VPG1, VPG1 ↔ Cloud, Cloud ↔ VPG2, VPG2 ↔ DC2
      const c1 = { id: 'c_vpnlab_1', from: dc1.id, to: vpg1.id, type: 'fiber', fromIface: 'eth0', toIface: 'tun0' };
      const c2 = { id: 'c_vpnlab_2', from: vpg1.id, to: cloud.id, type: 'fiber', fromIface: 'tun1', toIface: 'eth0' };
      const c3 = { id: 'c_vpnlab_3', from: cloud.id, to: vpg2.id, type: 'fiber', fromIface: 'eth1', toIface: 'tun1' };
      const c4 = { id: 'c_vpnlab_4', from: vpg2.id, to: dc2.id, type: 'fiber', fromIface: 'tun0', toIface: 'eth0' };
      dc1.interfaces[0].cableId = c1.id; vpg1.interfaces[0].cableId = c1.id;
      vpg1.interfaces[1].cableId = c2.id; cloud.interfaces[0].cableId = c2.id;
      cloud.interfaces[1].cableId = c3.id; vpg2.interfaces[1].cableId = c3.id;
      vpg2.interfaces[0].cableId = c4.id; dc2.interfaces[0].cableId = c4.id;
      state.cables.push(c1, c2, c3, c4);
    },
    steps: [
      {
        title: 'Survey the pre-built network',
        instruction: 'You have **2 data centers** (DC-East and DC-West) connected through **VPN Gateways** across the **Internet**. The topology is wired but the VPN tunnel is **not configured**.\n\nExplore: double-click each device to see its current config. Notice that VPG-East and VPG-West have no VPN configuration yet.',
        hint: 'A VPN creates an encrypted tunnel over a public network. The VPN gateways handle encryption/decryption at each end.',
        check: (s) => s.devices.some(d => d.type === 'vpg') && s.devices.some(d => d.type === 'onprem-dc'),
        feedback: () => null,
      },
      {
        title: 'Configure VPN on VPG-East',
        instruction: 'Double-click **VPG-East** → **VPN/IPSec** tab. Configure:\n\n• Pre-shared key: `MySecretKey123`\n• IKE version: `IKEv2`\n• Encryption: `AES-256`\n• Hash: `SHA-256`\n• DH Group: `14`\n\nThese are the **Phase 1 (IKE)** parameters. Both ends MUST match exactly or the tunnel won\'t come up!',
        hint: 'IKE (Internet Key Exchange) negotiates the security association. Both peers must agree on encryption, hash, and DH group. Any mismatch = tunnel fails.',
        check: (s) => {
          const vpg = s.devices.find(d => d.hostname === 'VPG-East' || (d.type === 'vpg' && d.vpnConfig && d.vpnConfig.psk));
          return vpg && vpg.vpnConfig && vpg.vpnConfig.psk && vpg.vpnConfig.psk.length > 0;
        },
        feedback: (s) => {
          const vpg = s.devices.find(d => d.type === 'vpg');
          if (!vpg) return 'No VPN Gateway found.';
          if (!vpg.vpnConfig || !vpg.vpnConfig.psk) return 'VPG-East has no VPN config. Open VPN/IPSec tab and set the pre-shared key.';
          return null;
        },
      },
      {
        title: 'Configure VPN on VPG-West — matching params!',
        instruction: 'Double-click **VPG-West** → **VPN/IPSec** tab. Set the **exact same** parameters:\n\n• Pre-shared key: `MySecretKey123`\n• IKE version: `IKEv2`\n• Encryption: `AES-256`\n• Hash: `SHA-256`\n• DH Group: `14`\n\n**Critical**: If even ONE parameter differs (e.g., SHA-256 vs SHA-384), the tunnel will fail to negotiate.',
        hint: 'Common VPN troubleshooting: mismatched PSK, different encryption algorithms, or wrong IKE version. Always verify both sides match.',
        check: (s) => {
          const vpgs = s.devices.filter(d => d.type === 'vpg');
          return vpgs.filter(v => v.vpnConfig && v.vpnConfig.psk && v.vpnConfig.psk.length > 0).length >= 2;
        },
        feedback: (s) => {
          const vpgs = s.devices.filter(d => d.type === 'vpg');
          const configured = vpgs.filter(v => v.vpnConfig && v.vpnConfig.psk);
          if (configured.length < 2) return `${configured.length}/2 VPN gateways have VPN config. Configure VPG-West too.`;
          // Check matching
          if (configured.length === 2 && configured[0].vpnConfig.psk !== configured[1].vpnConfig.psk) return 'Pre-shared keys don\'t match! Both VPGs must use the same PSK.';
          if (configured.length === 2 && configured[0].vpnConfig.encryption !== configured[1].vpnConfig.encryption) return 'Encryption algorithms don\'t match!';
          return null;
        },
      },
      {
        title: 'Negotiate the VPN tunnel',
        instruction: 'Click **VPG-East** → VPN tab → **Negotiate Tunnel** button. The system will check if both endpoints have matching crypto params.\n\n• ✅ Green animation = tunnel UP\n• ❌ Red animation = mismatch detected\n\nIf it fails, check the error message — it tells you exactly which parameter mismatched. Fix it and try again.',
        hint: 'In real networks, use `show crypto isakmp sa` and `show crypto ipsec sa` to troubleshoot VPN tunnels.',
        check: (s) => {
          const vpgs = s.devices.filter(d => d.type === 'vpg');
          return vpgs.some(v => v.vpnConfig && v.vpnConfig.status === 'up');
        },
        feedback: (s) => {
          const vpgs = s.devices.filter(d => d.type === 'vpg');
          const up = vpgs.filter(v => v.vpnConfig && v.vpnConfig.status === 'up');
          if (up.length === 0) return 'VPN tunnel is not up yet. Click Negotiate Tunnel in the VPN tab.';
          return null;
        },
      },
      {
        title: 'Verify — show VPN status',
        instruction: 'Open the CLI on **VPG-East** and run `show vpn`. You should see the tunnel status, peer IP, and crypto parameters.\n\nThen try `show vpn` on **DC-East** to see the VPN status from the data center side.\n\nOn the **Network+ exam**, VPN questions focus on: IPSec vs SSL VPN, IKEv1 vs IKEv2, tunnel vs transport mode, and crypto parameter matching.',
        hint: 'IPSec has two modes: tunnel mode (encrypts entire packet + new IP header, used for site-to-site) and transport mode (encrypts only payload, used for host-to-host).',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'wireless-network',
    title: 'Wireless Network with WLC',
    objective: '2.4',
    difficulty: 'Intermediate',
    duration: '12 min',
    description: 'Deploy a wireless network with access points managed by a Wireless LAN Controller. Understand the difference between autonomous and lightweight APs.',
    steps: [
      {
        title: 'Build the wired backbone',
        instruction: 'Create: **1 Router**, **1 Switch**, **1 WLC (Wireless LAN Controller)**. Cable: Router ↔ Switch ↔ WLC. The WLC centralizes management of all access points — SSIDs, security policies, channel assignments, and roaming.',
        hint: 'Autonomous APs are configured individually. Controller-based (lightweight) APs get their config from the WLC — much easier to manage at scale.',
        check: (s) => s.devices.some(d => d.type === 'router') && s.devices.some(d => d.type === 'switch') && s.devices.some(d => d.type === 'wlc') && s.cables.length >= 2,
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'router')) return 'No router. Drag one from the palette.';
          if (!s.devices.some(d => d.type === 'switch')) return 'No switch.';
          if (!s.devices.some(d => d.type === 'wlc')) return 'No WLC (Wireless LAN Controller). Find it in the palette.';
          if (s.cables.length < 2) return `${s.cables.length}/2 cables. Connect Router↔Switch↔WLC.`;
          return null;
        },
      },
      {
        title: 'Add Wireless Access Points',
        instruction: 'Add **3 WAPs** (Wireless Access Points) and connect each one to the **Switch**. In a controller-based deployment, APs connect to the wired network and create a **CAPWAP tunnel** back to the WLC for management traffic.\n\nPosition them spread across the canvas to simulate physical coverage areas.',
        hint: 'CAPWAP (Control And Provisioning of Wireless Access Points) is the protocol between lightweight APs and the WLC. It runs on UDP ports 5246 (control) and 5247 (data).',
        check: (s) => s.devices.filter(d => d.type === 'wap').length >= 3 && s.cables.length >= 5,
        feedback: (s) => {
          const waps = s.devices.filter(d => d.type === 'wap').length;
          if (waps < 3) return `${waps}/3 WAPs placed. Add ${3 - waps} more.`;
          if (s.cables.length < 5) return `${s.cables.length}/5 cables. Connect each WAP to the switch.`;
          return null;
        },
      },
      {
        title: 'Configure Router as gateway',
        instruction: 'Double-click the **Router** → Interfaces tab. Set the LAN interface to `192.168.1.1/24`. This is the default gateway for all wireless clients. In enterprise wireless, the router handles **inter-VLAN routing** and DHCP.',
        hint: 'Wireless clients get IPs from DHCP and use the router as their gateway, just like wired clients. The AP is transparent at Layer 3.',
        check: (s) => { const r = s.devices.find(d => d.type === 'router'); return r && r.interfaces.some(i => i.ip); },
        feedback: (s) => {
          const r = s.devices.find(d => d.type === 'router');
          if (!r) return 'No router found.';
          if (!r.interfaces.some(i => i.ip)) return 'Router needs an IP on its LAN interface.';
          return null;
        },
      },
      {
        title: 'Add wireless clients',
        instruction: 'Add **2-3 PCs** (representing wireless laptops/phones). Don\'t cable them — wireless clients connect through the **WAPs**, not with physical cables.\n\nSet their IPs: `192.168.1.50`, `192.168.1.51`, `192.168.1.52` with gateway `192.168.1.1`.',
        hint: 'On the exam: wireless clients associate with an AP, authenticate (WPA2/WPA3), get an IP via DHCP, and then communicate through the AP as if wired.',
        check: (s) => {
          const uncabledPcs = s.devices.filter(d => d.type === 'pc' && !s.cables.some(c => c.from === d.id || c.to === d.id));
          return uncabledPcs.filter(p => p.interfaces.some(i => i.ip)).length >= 2;
        },
        feedback: (s) => {
          const uncabledPcs = s.devices.filter(d => d.type === 'pc' && !s.cables.some(c => c.from === d.id || c.to === d.id));
          if (uncabledPcs.length < 2) return `${uncabledPcs.length} uncabled PCs found. Add PCs without cables to represent wireless clients.`;
          const withIp = uncabledPcs.filter(p => p.interfaces.some(i => i.ip)).length;
          return withIp < 2 ? `${withIp}/2 wireless clients have IPs. Configure them.` : null;
        },
      },
      {
        title: 'Review — Wireless concepts',
        instruction: 'Your wireless network is complete! Review these **Network+ exam** wireless concepts:\n\n• **802.11ax** (Wi-Fi 6): OFDMA, MU-MIMO, BSS Coloring, 2.4/5 GHz\n• **WPA3**: SAE (replaces PSK), 192-bit security mode, PMF mandatory\n• **Channel planning**: 2.4 GHz non-overlapping channels: 1, 6, 11\n• **CAPWAP**: Control plane (5246) + Data plane (5247)\n• **Roaming**: Client moves between APs, WLC handles seamless handoff\n\nRun `show arp` on the router to see learned MAC addresses.',
        hint: 'Exam tip: know the frequency bands — 2.4 GHz (longer range, more interference), 5 GHz (shorter range, less interference), 6 GHz (Wi-Fi 6E only).',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'cloud-vpc-security',
    title: 'Cloud VPC with Security Groups',
    objective: '1.8',
    difficulty: 'Advanced',
    duration: '18 min',
    description: 'Design a cloud VPC architecture with public and private subnets, an Internet Gateway, NAT Gateway, and security groups. Learn cloud-native networking for Network+.',
    steps: [
      {
        title: 'Create the VPC and Internet Gateway',
        instruction: 'Drag a **VPC** and an **Internet Gateway (IGW)** onto the canvas. Cable them together. The VPC is your isolated virtual network in the cloud, and the IGW gives it a path to the internet.\n\nDouble-click the VPC → VPC Config tab → set CIDR to `10.0.0.0/16`.',
        hint: 'A VPC is like a virtual data center in the cloud. The CIDR block defines the entire IP address range available for subnets.',
        check: (s) => s.devices.some(d => d.type === 'vpc') && s.devices.some(d => d.type === 'igw') && s.cables.length >= 1,
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'vpc')) return 'No VPC placed. Find it in the palette.';
          if (!s.devices.some(d => d.type === 'igw')) return 'No Internet Gateway placed.';
          if (s.cables.length < 1) return 'Connect the IGW to the VPC.';
          const vpc = s.devices.find(d => d.type === 'vpc');
          if (vpc && (!vpc.vpcConfig || !vpc.vpcConfig.cidr)) return 'VPC needs a CIDR block. Double-click → VPC Config tab.';
          return null;
        },
      },
      {
        title: 'Create public and private subnets',
        instruction: 'Add **2 Cloud Subnets**: one for public-facing resources (web servers) and one for private resources (databases).\n\nCable both subnets to the VPC. The public subnet routes to the IGW; the private subnet does NOT.',
        hint: 'Public subnet = route table has 0.0.0.0/0 → IGW. Private subnet = no internet route (or route to NAT only).',
        check: (s) => s.devices.filter(d => d.type === 'cloud-subnet').length >= 2,
        feedback: (s) => {
          const subs = s.devices.filter(d => d.type === 'cloud-subnet').length;
          return subs < 2 ? `${subs}/2 cloud subnets placed. Add ${2 - subs} more.` : null;
        },
      },
      {
        title: 'Add a NAT Gateway',
        instruction: 'Add a **NAT Gateway** and cable it to the **public subnet**. The NAT Gateway allows private subnet resources to reach the internet (e.g., for software updates) without being directly accessible from outside.\n\nNAT translates private IPs to a public IP for outbound traffic only.',
        hint: 'NAT Gateway = outbound-only internet access. Internet Gateway = bidirectional. Private subnets use NAT GW; public subnets use IGW.',
        check: (s) => s.devices.some(d => d.type === 'nat-gw'),
        feedback: (s) => !s.devices.some(d => d.type === 'nat-gw') ? 'No NAT Gateway placed. Drag one from the palette.' : null,
      },
      {
        title: 'Deploy servers into subnets',
        instruction: 'Add a **Server** (web server) to the public subnet and another **Server** (database) to the private subnet. Cable each to its subnet.\n\nSet IPs:\n• Web server: `10.0.1.10/24`, gateway `10.0.1.1`\n• DB server: `10.0.2.10/24`, gateway `10.0.2.1`',
        hint: 'Public subnet servers have public IP + security group. Private subnet servers only have private IPs and are only reachable from within the VPC.',
        check: (s) => {
          const servers = s.devices.filter(d => d.type === 'server');
          return servers.filter(srv => srv.interfaces.some(i => i.ip)).length >= 2;
        },
        feedback: (s) => {
          const servers = s.devices.filter(d => d.type === 'server');
          const withIp = servers.filter(srv => srv.interfaces.some(i => i.ip)).length;
          return withIp < 2 ? `${withIp}/2 servers have IPs. Configure both.` : null;
        },
      },
      {
        title: 'Configure Security Groups',
        instruction: 'Double-click the **web server** → **Security Groups** tab. Add a security group "web-sg" with rules:\n\n• **Inbound**: Allow TCP 443 (HTTPS) from `0.0.0.0/0`\n• **Inbound**: Allow TCP 80 (HTTP) from `0.0.0.0/0`\n\nSecurity Groups are **stateful** — if inbound is allowed, the return traffic is automatically allowed. No need for explicit outbound rules.',
        hint: 'Security Groups vs NACLs: SGs are stateful + instance-level. NACLs are stateless + subnet-level. Know both for the exam!',
        check: (s) => {
          const servers = s.devices.filter(d => d.type === 'server');
          return servers.some(srv => srv.securityGroups && srv.securityGroups.length > 0);
        },
        feedback: (s) => {
          const servers = s.devices.filter(d => d.type === 'server');
          const hasSg = servers.some(srv => srv.securityGroups && srv.securityGroups.length > 0);
          return !hasSg ? 'No security groups configured on any server. Double-click web server → Security Groups tab.' : null;
        },
      },
      {
        title: 'Grade and review',
        instruction: 'Click **Grade** in the toolbar to evaluate your design. Look for:\n\n• ✅ IGW connected to VPC\n• ✅ NAT GW in a subnet\n• ✅ Security groups on servers\n\n**Key exam concepts**:\n• VPC peering: connect VPCs without traversing the internet\n• Transit Gateway: hub-and-spoke for multi-VPC\n• Security Groups: stateful, allow-only, instance-level\n• NACLs: stateless, allow/deny, subnet-level, numbered rules',
        hint: 'On the exam: "Which is stateful?" → Security Group. "Which uses rule numbers?" → NACL. "Which is instance-level?" → Security Group.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'network-hardening',
    title: 'Network Hardening & Best Practices',
    objective: '4.1',
    difficulty: 'Intermediate',
    duration: '12 min',
    description: 'Harden a network by implementing security best practices: disable unused ports, configure management VLANs, and deploy IDS/IPS. Covers Network+ security fundamentals.',
    autoSetup: (state) => {
      // Pre-build a basic network with security gaps
      const r1 = { id: 'd_harden_r1', type: 'router', x: 650, y: 150, hostname: 'R-Core',
        interfaces: [
          { name: 'Gi0/0', cableId: null, ip: '192.168.1.1', mask: '255.255.255.0', mac: 'AA:BB:CC:10:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
          { name: 'Gi0/1', cableId: null, ip: '', mask: '255.255.255.0', mac: 'AA:BB:CC:10:02:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [] },
        ],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
      const sw1 = { id: 'd_harden_sw1', type: 'switch', x: 400, y: 350, hostname: 'SW-Access',
        interfaces: Array.from({ length: 24 }, (_, i) => ({
          name: `Fa0/${i + 1}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:BB:CC:11:${String(i+1).padStart(2,'0')}:01`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [],
        })),
        routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
      const pc1 = { id: 'd_harden_pc1', type: 'pc', x: 200, y: 550, hostname: 'PC-Admin',
        interfaces: [{ name: 'eth0', cableId: null, ip: '192.168.1.10', mask: '255.255.255.0', mac: 'AA:BB:CC:12:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.1', enabled: true, subInterfaces: [] }],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
      const pc2 = { id: 'd_harden_pc2', type: 'pc', x: 400, y: 550, hostname: 'PC-User',
        interfaces: [{ name: 'eth0', cableId: null, ip: '192.168.1.11', mask: '255.255.255.0', mac: 'AA:BB:CC:13:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.1', enabled: true, subInterfaces: [] }],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
      const srv = { id: 'd_harden_srv', type: 'server', x: 600, y: 550, hostname: 'SRV-Files',
        interfaces: [{ name: 'eth0', cableId: null, ip: '192.168.1.100', mask: '255.255.255.0', mac: 'AA:BB:CC:14:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.1', enabled: true, subInterfaces: [] }],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [] };
      state.devices.push(r1, sw1, pc1, pc2, srv);
      // Cables
      const c1 = { id: 'c_harden_1', from: r1.id, to: sw1.id, type: 'cat6', fromIface: 'Gi0/0', toIface: 'Fa0/1' };
      const c2 = { id: 'c_harden_2', from: sw1.id, to: pc1.id, type: 'cat6', fromIface: 'Fa0/2', toIface: 'eth0' };
      const c3 = { id: 'c_harden_3', from: sw1.id, to: pc2.id, type: 'cat6', fromIface: 'Fa0/3', toIface: 'eth0' };
      const c4 = { id: 'c_harden_4', from: sw1.id, to: srv.id, type: 'cat6', fromIface: 'Fa0/4', toIface: 'eth0' };
      r1.interfaces[0].cableId = c1.id; sw1.interfaces[0].cableId = c1.id;
      sw1.interfaces[1].cableId = c2.id; pc1.interfaces[0].cableId = c2.id;
      sw1.interfaces[2].cableId = c3.id; pc2.interfaces[0].cableId = c3.id;
      sw1.interfaces[3].cableId = c4.id; srv.interfaces[0].cableId = c4.id;
      state.cables.push(c1, c2, c3, c4);
    },
    steps: [
      {
        title: 'Survey the insecure network',
        instruction: 'This network has several security issues:\n\n• All devices on **VLAN 1** (default) — management traffic mixed with user traffic\n• **20 unused switch ports** are active — an attacker could plug into any of them\n• **No IDS/IPS** to detect threats\n• **No firewall** at the perimeter\n\nLet\'s fix these one by one. Start by exploring the switch — double-click it and check the Interfaces tab.',
        hint: 'VLAN 1 should never be used for production traffic — it\'s the default and can\'t be deleted, making it a target.',
        check: (s) => s.devices.some(d => d.type === 'switch'),
        feedback: () => null,
      },
      {
        title: 'Create a management VLAN',
        instruction: 'Double-click **SW-Access** → **VLANs** tab. Add **VLAN 99** (name: "Management"). Then go to Interfaces → set the **router-facing port** (Fa0/1) to **trunk** mode. Set admin PC port to VLAN 99.\n\nManagement traffic (SSH, SNMP, syslog) should be on its own VLAN, isolated from user traffic.',
        hint: 'Management VLAN best practice: use a VLAN other than 1, restrict access with ACLs, and only allow authorized admin workstations.',
        check: (s) => {
          const sw = s.devices.find(d => d.type === 'switch');
          return sw && sw.vlanDb && sw.vlanDb.some(v => v.id === 99);
        },
        feedback: (s) => {
          const sw = s.devices.find(d => d.type === 'switch');
          if (!sw) return 'No switch found.';
          if (!sw.vlanDb || !sw.vlanDb.some(v => v.id === 99)) return 'VLAN 99 not created yet. Add it in the VLANs tab.';
          return null;
        },
      },
      {
        title: 'Disable unused switch ports',
        instruction: 'Go to **SW-Access** → Interfaces tab. Find ports that have **no cable** (Fa0/5 through Fa0/24). Disable them by toggling their **enabled** status to off.\n\nEvery open port is an attack vector. An unused port in an enabled state lets anyone plug in and join your network. Disabling unused ports is basic security hygiene.',
        hint: 'On the exam: "shutdown" disables a port. "no shutdown" enables it. Port security and 802.1X are additional protections.',
        check: (s) => {
          const sw = s.devices.find(d => d.type === 'switch');
          if (!sw) return false;
          const unusedPorts = sw.interfaces.filter(i => !i.cableId);
          const disabledCount = unusedPorts.filter(i => !i.enabled).length;
          return disabledCount >= 10;
        },
        feedback: (s) => {
          const sw = s.devices.find(d => d.type === 'switch');
          if (!sw) return 'No switch found.';
          const unusedPorts = sw.interfaces.filter(i => !i.cableId);
          const disabledCount = unusedPorts.filter(i => !i.enabled).length;
          return `${disabledCount}/${unusedPorts.length} unused ports disabled. Disable at least 10.`;
        },
      },
      {
        title: 'Add an IDS to the network',
        instruction: 'Drag an **IDS** (Intrusion Detection System) onto the canvas and connect it to the switch. The IDS monitors network traffic for malicious patterns and generates alerts.\n\n**IDS vs IPS**:\n• IDS = passive — detects and alerts (mirror port)\n• IPS = inline — detects and **blocks** (sits in traffic path)\n\nFor this lab, we\'re using IDS in monitoring mode.',
        hint: 'IDS/IPS placement: typically between the firewall and internal network, or on a SPAN/mirror port. Signature-based detects known attacks; anomaly-based detects unusual patterns.',
        check: (s) => s.devices.some(d => d.type === 'ids') && s.cables.some(c => {
          const ids = s.devices.find(d => d.type === 'ids');
          return ids && (c.from === ids.id || c.to === ids.id);
        }),
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'ids')) return 'No IDS placed. Drag one from the palette.';
          const ids = s.devices.find(d => d.type === 'ids');
          const hasCable = s.cables.some(c => c.from === ids.id || c.to === ids.id);
          return !hasCable ? 'IDS needs to be connected to the switch to monitor traffic.' : null;
        },
      },
      {
        title: 'Add a perimeter firewall',
        instruction: 'Add a **Firewall** between the router and the internet. Cable: Internet ↔ Firewall ↔ Router (update the R-Core connection). Configure the firewall with IPs on both interfaces.\n\nThe firewall inspects ALL traffic crossing the network boundary. Without it, the router alone has no security filtering.',
        hint: 'Defense in depth: Firewall at perimeter + IDS on internal network + VLANs for segmentation + disabled ports = multiple security layers.',
        check: (s) => s.devices.some(d => d.type === 'firewall') && s.cables.some(c => {
          const fw = s.devices.find(d => d.type === 'firewall');
          return fw && (c.from === fw.id || c.to === fw.id);
        }),
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'firewall')) return 'No firewall placed.';
          const fw = s.devices.find(d => d.type === 'firewall');
          const hasCable = s.cables.some(c => c.from === fw.id || c.to === fw.id);
          return !hasCable ? 'Firewall is not connected. Cable it between the internet and router.' : null;
        },
      },
      {
        title: 'Review — Hardening checklist',
        instruction: 'Your network is now hardened! Review the **Network+ security checklist**:\n\n✅ Management VLAN separated from user traffic\n✅ Unused ports disabled (prevents unauthorized access)\n✅ IDS monitoring for threats\n✅ Perimeter firewall filtering traffic\n\n**Exam topics to review**:\n• 802.1X (port-based NAC)\n• DHCP snooping (prevents rogue DHCP)\n• Dynamic ARP Inspection (prevents ARP spoofing)\n• BPDU Guard (prevents STP manipulation)\n• MAC filtering / port security',
        hint: 'Remember: security is layers. No single control is enough. The exam loves asking about defense-in-depth strategies.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  // ── v4.30.0 Labs ──
  {
    id: 'ospf-dynamic-routing',
    title: 'OSPF Dynamic Routing',
    objective: '1.4',
    difficulty: 'Advanced',
    duration: '18 min',
    description: 'Configure OSPF on a multi-router network. Learn how dynamic routing protocols discover neighbors, build link-state databases, and calculate shortest paths using Dijkstra\'s algorithm.',
    steps: [
      {
        title: 'Build a 3-router backbone',
        instruction: 'Create **3 Routers** (R1, R2, R3) and connect them: R1 ↔ R2, R2 ↔ R3, R1 ↔ R3. This creates a triangle — when one link fails, traffic can reroute through the other path. Add a **Switch** + **2 PCs** to R1 and R3.',
        hint: 'OSPF excels in redundant topologies — it recalculates routes automatically when links go down.',
        check: (s) => s.devices.filter(d => d.type === 'router').length >= 3 && s.cables.length >= 5,
        feedback: (s) => {
          const routers = s.devices.filter(d => d.type === 'router').length;
          if (routers < 3) return `${routers}/3 routers placed.`;
          if (s.cables.length < 5) return `${s.cables.length}/5+ cables needed.`;
          return null;
        },
      },
      {
        title: 'Configure router IPs',
        instruction: 'Set IPs on all router interfaces:\n\n• **R1-R2 link**: 10.0.12.1/30 ↔ 10.0.12.2/30\n• **R2-R3 link**: 10.0.23.1/30 ↔ 10.0.23.2/30\n• **R1-R3 link**: 10.0.13.1/30 ↔ 10.0.13.2/30\n• **R1 LAN**: 192.168.1.1/24\n• **R3 LAN**: 192.168.3.1/24',
        hint: 'Point-to-point links use /30 (2 usable IPs). LAN segments use /24.',
        check: (s) => {
          const routers = s.devices.filter(d => d.type === 'router');
          return routers.every(r => r.interfaces.filter(i => i.ip).length >= 2);
        },
        feedback: (s) => {
          const routers = s.devices.filter(d => d.type === 'router');
          const incomplete = routers.filter(r => r.interfaces.filter(i => i.ip).length < 2);
          return incomplete.length ? `${incomplete.map(r=>r.hostname).join(', ')} need more IPs on interfaces.` : null;
        },
      },
      {
        title: 'Enable OSPF on all routers',
        instruction: 'Double-click each router → **OSPF** tab:\n\n1. Check **Enable OSPF**\n2. Set **Router ID** (R1: 1.1.1.1, R2: 2.2.2.2, R3: 3.3.3.3)\n3. **Add Area 0** (backbone area)\n4. Add all connected networks to Area 0\n\nOSPF routers exchange LSAs (Link-State Advertisements) and build a complete map of the network.',
        hint: 'All routers in OSPF Area 0 form full adjacency. Router ID must be unique — typically the highest loopback IP.',
        check: (s) => {
          const routers = s.devices.filter(d => d.type === 'router');
          return routers.filter(r => r.ospfConfig && r.ospfConfig.enabled).length >= 3;
        },
        feedback: (s) => {
          const routers = s.devices.filter(d => d.type === 'router');
          const enabled = routers.filter(r => r.ospfConfig?.enabled);
          return enabled.length < 3 ? `${enabled.length}/3 routers have OSPF enabled.` : null;
        },
      },
      {
        title: 'Set OSPF Router IDs',
        instruction: 'Each OSPF router needs a unique **Router ID**. Check the OSPF tab — the Router ID field should be set to a unique IP (e.g., 1.1.1.1 for R1).\n\nOSPF uses the Router ID to identify neighbors and prevent routing loops.',
        hint: 'If no Router ID is set, OSPF uses the highest loopback IP, or the highest physical IP.',
        check: (s) => {
          const routers = s.devices.filter(d => d.type === 'router');
          return routers.filter(r => r.ospfConfig?.routerId).length >= 3;
        },
        feedback: (s) => {
          const routers = s.devices.filter(d => d.type === 'router');
          const withRid = routers.filter(r => r.ospfConfig?.routerId);
          return withRid.length < 3 ? `${withRid.length}/3 routers have Router IDs set.` : null;
        },
      },
      {
        title: 'Verify OSPF neighbors',
        instruction: 'Open R1\'s **CLI** and run:\n\n• `show ip ospf` — see OSPF config and areas\n• `show ip ospf neighbor` — see discovered neighbors\n• `show running-config` — see full config in IOS format\n\n**Key exam concepts**: OSPF states (Down → Init → 2-Way → ExStart → Exchange → Loading → Full). DR/BDR election on broadcast segments. Hello timer = 10s, Dead timer = 40s.',
        hint: 'OSPF neighbor states: FULL = fully adjacent (exchanged full LSDB). 2-WAY = bidirectional Hello received but not yet exchanged LSAs.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'dns-infrastructure',
    title: 'DNS Infrastructure & Records',
    objective: '1.6',
    difficulty: 'Intermediate',
    duration: '15 min',
    description: 'Build a DNS infrastructure with a DNS server, configure all major record types (A, AAAA, CNAME, MX, PTR, NS, SOA, TXT, SRV), and test name resolution with nslookup.',
    steps: [
      {
        title: 'Build the network with a DNS server',
        instruction: 'Create: **1 Router**, **1 Switch**, **1 DNS Server**, **2 PCs**, **1 Server** (web server). Cable them all to the switch, switch to router.\n\nThe DNS Server will resolve hostnames to IPs for all clients on the network.',
        hint: 'DNS is a hierarchical system: Root → TLD (.com) → Authoritative (example.com) → Record (www.example.com).',
        check: (s) => (s.devices.some(d => d.type === 'dns-server') || s.devices.filter(d => d.type === 'server').length >= 2) && s.cables.length >= 4,
        feedback: (s) => {
          const hasDns = s.devices.some(d => d.type === 'dns-server') || s.devices.filter(d => d.type === 'server').length >= 2;
          if (!hasDns) return 'Need a DNS Server (or 2 servers — one as DNS). Drag from palette.';
          if (s.cables.length < 4) return `${s.cables.length}/4+ cables needed.`;
          return null;
        },
      },
      {
        title: 'Configure IPs on all devices',
        instruction: 'Set IPs:\n• Router: `192.168.1.1/24`\n• DNS Server: `192.168.1.5/24`, gateway `192.168.1.1`\n• Web Server: `192.168.1.100/24`, gateway `192.168.1.1`\n• PCs: `192.168.1.10`, `.11`, gateway `192.168.1.1`',
        hint: 'DNS clients need to know the DNS server IP. In production, this is often provided via DHCP (option 6).',
        check: (s) => {
          const allWithIp = s.devices.filter(d => d.interfaces.some(i => i.ip));
          return allWithIp.length >= 4;
        },
        feedback: (s) => {
          const allWithIp = s.devices.filter(d => d.interfaces.some(i => i.ip));
          return allWithIp.length < 4 ? `${allWithIp.length}/4+ devices have IPs.` : null;
        },
      },
      {
        title: 'Add A and AAAA records',
        instruction: 'Double-click the **DNS Server** → **DNS** tab. Add these records:\n\n• **A** record: name `web.corp.local` → value `192.168.1.100`\n• **A** record: name `dns.corp.local` → value `192.168.1.5`\n• **AAAA** record: name `web.corp.local` → value `2001:db8::100`\n\n**A** maps hostname → IPv4. **AAAA** maps hostname → IPv6.',
        hint: 'A records are the most common DNS record type. AAAA records are the IPv6 equivalent — "quad-A" because IPv6 addresses are 4x longer than IPv4.',
        check: (s) => {
          const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
          return dns && dns.dnsRecords && dns.dnsRecords.filter(r => r.type === 'A' || r.type === 'AAAA').length >= 2;
        },
        feedback: (s) => {
          const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
          if (!dns) return 'No DNS server with records found. Double-click the DNS server → DNS tab.';
          const aCount = (dns.dnsRecords || []).filter(r => r.type === 'A' || r.type === 'AAAA').length;
          return aCount < 2 ? `${aCount}/2 A/AAAA records. Add more.` : null;
        },
      },
      {
        title: 'Add CNAME, MX, and TXT records',
        instruction: 'Continue adding records:\n\n• **CNAME**: name `www.corp.local` → value `web.corp.local` (alias)\n• **MX**: name `corp.local` → value `10 mail.corp.local` (mail exchange, priority 10)\n• **TXT**: name `corp.local` → value `v=spf1 include:_spf.corp.local ~all` (SPF record for email auth)\n\nCNAME creates an alias. MX directs email. TXT stores arbitrary data (SPF, DKIM, DMARC).',
        hint: 'CNAME cannot coexist with other records for the same name (except RRSIG/NSEC). MX priority: lower number = higher priority.',
        check: (s) => {
          const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
          return dns && dns.dnsRecords && dns.dnsRecords.some(r => r.type === 'CNAME') && dns.dnsRecords.some(r => r.type === 'MX');
        },
        feedback: (s) => {
          const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
          if (!dns?.dnsRecords) return 'No DNS records found.';
          if (!dns.dnsRecords.some(r => r.type === 'CNAME')) return 'Missing CNAME record.';
          if (!dns.dnsRecords.some(r => r.type === 'MX')) return 'Missing MX record.';
          return null;
        },
      },
      {
        title: 'Add PTR, NS, SOA, SRV, and CAA records',
        instruction: 'Complete the zone with:\n\n• **PTR**: name `100.1.168.192.in-addr.arpa` → value `web.corp.local` (reverse lookup)\n• **NS**: name `corp.local` → value `dns.corp.local` (authoritative nameserver)\n• **SOA**: name `corp.local` → value `dns.corp.local admin.corp.local 2024010101` (Start of Authority)\n• **SRV**: name `_sip._tcp.corp.local` → value `10 5 5060 sip.corp.local` (service locator)\n• **CAA**: name `corp.local` → value `0 issue "letsencrypt.org"` (certificate authority auth)',
        hint: 'PTR is the reverse of A — used by tools like nslookup for reverse DNS. SOA defines zone authority and refresh timers. SRV format: priority weight port target.',
        check: (s) => {
          const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
          return dns && dns.dnsRecords && dns.dnsRecords.length >= 7;
        },
        feedback: (s) => {
          const dns = s.devices.find(d => d.type === 'dns-server' || (d.type === 'server' && d.dnsRecords?.length > 0));
          const count = dns?.dnsRecords?.length || 0;
          return count < 7 ? `${count}/7+ DNS records configured. Add the remaining record types.` : null;
        },
      },
      {
        title: 'Test DNS with nslookup',
        instruction: 'Open a **PC\'s CLI** and run:\n\n• `nslookup web.corp.local` — should resolve to 192.168.1.100\n• `nslookup www.corp.local` — should follow CNAME → A record\n• `nslookup nonexistent.corp.local` — should return NXDOMAIN\n• `show dns records` on the DNS server to see all configured records\n\n**Exam tip**: Know the difference between recursive and iterative queries. Clients use recursive (ask once, get answer). DNS servers use iterative (query root → TLD → authoritative).',
        hint: 'DNS uses UDP port 53 for queries and TCP port 53 for zone transfers (AXFR/IXFR). DNSSEC adds digital signatures to prevent spoofing.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'stp-loop-prevention',
    title: 'STP & Loop Prevention',
    objective: '2.3',
    difficulty: 'Intermediate',
    duration: '12 min',
    description: 'Configure Spanning Tree Protocol on a redundant switch topology. Understand root bridge election, port states, and how STP prevents broadcast storms.',
    autoSetup: (state) => {
      // Pre-build 3 switches in a triangle + router + PCs
      const r1 = { id: 'd_stp_r1', type: 'router', x: 650, y: 100, hostname: 'R1',
        interfaces: [{ name: 'Gi0/0', cableId: null, ip: '192.168.1.1', mask: '255.255.255.0', mac: 'AA:00:00:01:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 }],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
        stpConfig: null, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] };
      const makeSw = (id, x, y, name, portCount) => ({
        id, type: 'switch', x, y, hostname: name,
        interfaces: Array.from({ length: portCount }, (_, i) => ({
          name: `Fa0/${i + 1}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:00:${id.slice(-2)}:${String(i+1).padStart(2,'0')}:01:01`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64,
        })),
        routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
        stpConfig: { priority: 32768, mode: 'rstp', portStates: {} }, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] });
      const sw1 = makeSw('d_stp_sw1', 400, 350, 'SW-Core', 24);
      const sw2 = makeSw('d_stp_sw2', 900, 350, 'SW-Dist1', 24);
      const sw3 = makeSw('d_stp_sw3', 650, 550, 'SW-Dist2', 24);
      state.devices.push(r1, sw1, sw2, sw3);
      // Triangle of switches + router to SW-Core
      const cables = [
        { id: 'c_stp_1', from: r1.id, to: sw1.id, type: 'cat6', fromIface: 'Gi0/0', toIface: 'Fa0/1' },
        { id: 'c_stp_2', from: sw1.id, to: sw2.id, type: 'fiber', fromIface: 'Fa0/23', toIface: 'Fa0/23' },
        { id: 'c_stp_3', from: sw2.id, to: sw3.id, type: 'fiber', fromIface: 'Fa0/24', toIface: 'Fa0/24' },
        { id: 'c_stp_4', from: sw3.id, to: sw1.id, type: 'fiber', fromIface: 'Fa0/23', toIface: 'Fa0/24' },
      ];
      cables.forEach(c => {
        const fromDev = state.devices.find(d => d.id === c.from);
        const toDev = state.devices.find(d => d.id === c.to);
        const fromIfc = fromDev.interfaces.find(i => i.name === c.fromIface);
        const toIfc = toDev.interfaces.find(i => i.name === c.toIface);
        if (fromIfc) fromIfc.cableId = c.id;
        if (toIfc) toIfc.cableId = c.id;
      });
      state.cables.push(...cables);
    },
    steps: [
      {
        title: 'Explore the redundant topology',
        instruction: 'You have **3 switches** (SW-Core, SW-Dist1, SW-Dist2) connected in a **triangle** via fiber uplinks. This creates **physical redundancy** but also a **Layer 2 loop**.\n\nWithout STP, broadcast frames would circulate endlessly → **broadcast storm** → network crash.\n\nDouble-click each switch to see its current STP configuration.',
        hint: 'A broadcast storm can consume 100% of bandwidth in seconds. STP is the protocol that prevents this by blocking redundant paths.',
        check: (s) => s.devices.filter(d => d.type === 'switch').length >= 3,
        feedback: () => null,
      },
      {
        title: 'Set SW-Core as Root Bridge',
        instruction: 'Double-click **SW-Core** → **STP** tab. Set **Bridge Priority** to **4096** (lowest = root bridge).\n\nThe switch with the **lowest Bridge ID** (priority + MAC) becomes the Root Bridge. All other switches calculate their shortest path to the root.\n\nLeave SW-Dist1 and SW-Dist2 at default priority (32768).',
        hint: 'Root Bridge election: compare priority first, then MAC address. Best practice: manually set the core switch as root with the lowest priority.',
        check: (s) => {
          const core = s.devices.find(d => d.hostname === 'SW-Core' || (d.type === 'switch' && d.stpConfig?.priority <= 4096));
          return core && core.stpConfig && core.stpConfig.priority <= 4096;
        },
        feedback: (s) => {
          const core = s.devices.find(d => d.hostname === 'SW-Core');
          if (!core?.stpConfig) return 'SW-Core has no STP config. Double-click → STP tab.';
          if (core.stpConfig.priority > 4096) return `SW-Core priority is ${core.stpConfig.priority}. Set it to 4096 to make it Root Bridge.`;
          return null;
        },
      },
      {
        title: 'Block a redundant port',
        instruction: 'On **SW-Dist2** → STP tab, set the port connected to **SW-Dist1** (Fa0/24) to **blocking** state.\n\nSTP blocks one port in the triangle to break the loop. Traffic can still reach SW-Dist2 via SW-Core. If the SW-Core ↔ SW-Dist2 link fails, the blocked port transitions to forwarding (convergence).\n\nPort roles: **Root Port** (toward root bridge), **Designated Port** (away from root), **Blocked Port** (redundant, loop prevention).',
        hint: 'RSTP converges in 1-2 seconds. Classic STP takes 30-50 seconds (listening 15s + learning 15s). That\'s why RSTP replaced STP in modern networks.',
        check: (s) => {
          const sw = s.devices.find(d => d.hostname === 'SW-Dist2' || (d.type === 'switch' && d.stpConfig?.portStates && Object.values(d.stpConfig.portStates).includes('blocking')));
          return sw && sw.stpConfig && Object.values(sw.stpConfig.portStates || {}).includes('blocking');
        },
        feedback: (s) => {
          const switches = s.devices.filter(d => d.type === 'switch');
          const hasBlocking = switches.some(sw => sw.stpConfig && Object.values(sw.stpConfig.portStates || {}).includes('blocking'));
          return !hasBlocking ? 'No port is in blocking state. Set one redundant port to BLOCKING in the STP tab.' : null;
        },
      },
      {
        title: 'Add PCs and verify',
        instruction: 'Add **2 PCs** — connect one to SW-Dist1 and one to SW-Dist2. Set IPs (192.168.1.10, .11) with gateway 192.168.1.1.\n\nRun `show spanning-tree` on each switch to see STP status.\n\n**Network+ exam STP concepts**:\n• BPDU (Bridge Protocol Data Unit) — hello frames sent every 2 seconds\n• BPDU Guard — shuts down port if BPDU received (edge/access ports)\n• Root Guard — prevents downstream switches from becoming root\n• PortFast — skips listening/learning on access ports (30s → 0s)',
        hint: 'PortFast should ONLY be enabled on edge/access ports (connected to PCs/servers). Never on switch-to-switch links — it would bypass STP and create loops.',
        check: (s) => s.devices.filter(d => d.type === 'pc').length >= 2,
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc').length;
          return pcs < 2 ? `${pcs}/2 PCs placed. Add ${2 - pcs} more.` : null;
        },
      },
    ]
  },
  // ── v4.30.2: 4 new beginner labs ──
  {
    id: 'ip-addressing-101',
    title: 'IP Addressing 101',
    objective: '1.5',
    difficulty: 'Beginner',
    duration: '10 min',
    description: 'Learn the fundamentals of IPv4 addressing — IPs, subnet masks, and default gateways. Build a minimal network and make two PCs talk to each other.',
    steps: [
      {
        title: 'Place your first devices',
        instruction: 'Drag a **Router** and a **Switch** onto the canvas, then connect them with a cable.\n\nThe router is your **default gateway** — it\'s the door to other networks. The switch connects devices on the same network.',
        hint: 'Every network needs at least one router (gateway) and one switch (to connect multiple devices).',
        check: (s) => s.devices.some(d => d.type === 'router') && s.devices.some(d => d.type === 'switch') && s.cables.length >= 1,
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'router')) return 'Add a Router to the canvas.';
          if (!s.devices.some(d => d.type === 'switch')) return 'Add a Switch to the canvas.';
          if (s.cables.length < 1) return 'Connect the Router to the Switch with a cable.';
          return null;
        },
      },
      {
        title: 'Add two PCs',
        instruction: 'Drag **2 PCs** onto the canvas and cable each one to the **Switch**.\n\nPCs connect to switches — never directly to a router. The switch handles local traffic; the router handles traffic leaving the network.',
        hint: 'In a real office, dozens of PCs plug into switches. The switch forwards frames using MAC addresses (Layer 2).',
        check: (s) => s.devices.filter(d => d.type === 'pc').length >= 2 && s.cables.length >= 3,
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc').length;
          if (pcs < 2) return `${pcs}/2 PCs placed.`;
          if (s.cables.length < 3) return 'Cable both PCs to the switch.';
          return null;
        },
      },
      {
        title: 'Give the Router an IP',
        instruction: 'Double-click the **Router** → **Interfaces** tab. Set the connected interface IP to **192.168.1.1** with mask **255.255.255.0**.\n\nThis IP becomes the **default gateway** for every device on this network. Think of it as the network\'s "front door."',
        hint: '192.168.1.0/24 gives you 254 usable addresses (192.168.1.1 — 192.168.1.254). The .1 is traditionally the gateway.',
        check: (s) => {
          const router = s.devices.find(d => d.type === 'router');
          return router && router.interfaces.some(i => i.ip === '192.168.1.1');
        },
        feedback: (s) => {
          const router = s.devices.find(d => d.type === 'router');
          if (!router) return 'No router found.';
          const hasIp = router.interfaces.some(i => i.ip);
          return hasIp ? 'Set the router IP to exactly 192.168.1.1.' : 'Open the router config and set an IP on the connected interface.';
        },
      },
      {
        title: 'Configure PC IPs and gateways',
        instruction: 'Double-click each **PC** → **Interfaces** tab:\n\n• **PC1**: IP **192.168.1.10**, mask 255.255.255.0, gateway **192.168.1.1**\n• **PC2**: IP **192.168.1.11**, mask 255.255.255.0, gateway **192.168.1.1**\n\nBoth PCs point to the router as their gateway. The mask /24 tells them "anything in 192.168.1.x is local — everything else, send to the gateway."',
        hint: 'Without a gateway, a PC can only talk to devices on its own subnet. With a gateway, it can reach the entire internet.',
        check: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc');
          return pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway)).length >= 2;
        },
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc');
          const configured = pcs.filter(p => p.interfaces.some(i => i.ip && i.gateway));
          return configured.length < 2 ? `${configured.length}/2 PCs have both IP and gateway set.` : null;
        },
      },
      {
        title: 'Test connectivity',
        instruction: 'Open PC1\'s **CLI** tab and run:\n\n• `ipconfig` — see your IP, mask, and gateway\n• `ping 192.168.1.11` — test if PC2 is reachable\n• `ping 192.168.1.1` — test if the gateway is reachable\n\n**Key exam concept**: If `ping gateway` works but `ping remote` fails → routing problem. If `ping gateway` fails → local config problem (wrong IP, mask, or cable).',
        hint: 'Ping sends ICMP Echo Request packets. A reply means Layer 3 connectivity is working.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'cable-types-topology',
    title: 'Cable Types & Topologies',
    objective: '1.3',
    difficulty: 'Beginner',
    duration: '8 min',
    description: 'Learn the difference between Cat5e, Cat6, Fiber, Coax, and Console cables by building a star topology and using each cable type where it belongs.',
    steps: [
      {
        title: 'Build a star topology',
        instruction: 'Place **1 Router** in the center and **1 Switch** below it. Connect them with a **Fiber** cable (select Fiber from the cable palette before clicking).\n\nThis is a **star topology** — all devices radiate out from a central hub/switch. It\'s the most common LAN design because one failed cable only affects one device.',
        hint: 'Star topology: easy to troubleshoot (isolate the one bad cable), but the central switch is a single point of failure.',
        check: (s) => s.devices.some(d => d.type === 'router') && s.devices.some(d => d.type === 'switch') && s.cables.some(c => c.type === 'fiber'),
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'router')) return 'Add a Router.';
          if (!s.devices.some(d => d.type === 'switch')) return 'Add a Switch.';
          if (!s.cables.some(c => c.type === 'fiber')) return 'Connect them using a Fiber cable (select "Fiber" in the cable palette first).';
          return null;
        },
      },
      {
        title: 'Add PCs with Cat6',
        instruction: 'Add **3 PCs** and connect each to the **Switch** using **Cat6** cables.\n\n**Cable comparison**:\n• **Cat5e** — 1 Gbps, 100m max, older standard\n• **Cat6** — 10 Gbps (up to 55m), better shielding, current standard\n• **Fiber** — up to 100 Gbps, kilometers of reach, immune to EMI\n• **Coax** — used for cable internet (DOCSIS) and older networks\n• **Console** — management port (blue rollover cable, serial access)',
        hint: 'On the exam: Cat6 supports 10GBASE-T up to 55m. Cat6a extends 10G to the full 100m. Fiber uses light, not electrical signals.',
        check: (s) => s.devices.filter(d => d.type === 'pc').length >= 3 && s.cables.filter(c => c.type === 'cat6').length >= 3,
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc').length;
          const cat6 = s.cables.filter(c => c.type === 'cat6').length;
          if (pcs < 3) return `${pcs}/3 PCs placed.`;
          if (cat6 < 3) return `${cat6}/3 Cat6 cables used. Select Cat6 in the cable palette before connecting.`;
          return null;
        },
      },
      {
        title: 'Add a server with Cat5e',
        instruction: 'Add a **Server** and connect it to the switch using a **Cat5e** cable.\n\nCat5e is fine for a 1 Gbps server connection — you\'d only upgrade to Cat6 if you needed 10 Gbps.\n\n**Exam tip**: "e" in Cat5e stands for "enhanced" — it has better crosstalk specs than Cat5 (which is obsolete).',
        hint: 'Cat5e: 4 twisted pairs, RJ-45 connector, T568A or T568B wiring standard. Maximum run = 100 meters.',
        check: (s) => s.devices.some(d => d.type === 'server') && s.cables.some(c => c.type === 'cat5e'),
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'server')) return 'Add a Server to the canvas.';
          if (!s.cables.some(c => c.type === 'cat5e')) return 'Connect it using a Cat5e cable.';
          return null;
        },
      },
      {
        title: 'Add a console connection',
        instruction: 'Add a **PC** near the router and connect it to the **Router** using a **Console** cable (the dashed blue cable in the palette).\n\nConsole cables provide **out-of-band management** — you can configure the router even when the network is completely down. They use a **serial/RS-232** connection, not Ethernet.\n\n**Exam key**: console cable = rollover cable = light blue = RJ-45 to DB-9.',
        hint: 'Out-of-band management means the management path is separate from the data path. If the network goes down, you can still manage devices via console.',
        check: (s) => s.cables.some(c => c.type === 'console'),
        feedback: (s) => !s.cables.some(c => c.type === 'console') ? 'Use a Console cable to connect a PC to the Router.' : null,
      },
      {
        title: 'Review your topology',
        instruction: 'You\'ve built a **star topology** using 4 different cable types:\n\n• **Fiber** (Router ↔ Switch) — backbone link, high speed\n• **Cat6** (Switch ↔ PCs) — workstation drops\n• **Cat5e** (Switch ↔ Server) — standard server connection\n• **Console** (PC ↔ Router) — out-of-band management\n\n**Other topologies to know for the exam**:\n• **Bus** — single cable, all devices share it (legacy)\n• **Ring** — token passing, each device connects to two neighbors\n• **Mesh** — every device connects to every other device (redundant)\n• **Hybrid** — combination of two or more topologies',
        hint: 'Star-bus = star topology using a shared bus backbone. This is what most modern networks actually are.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'first-firewall',
    title: 'Your First Firewall',
    objective: '4.2',
    difficulty: 'Beginner',
    duration: '10 min',
    description: 'Place a firewall between the Internet and your LAN. Learn why firewalls exist, where they go in the network, and how ACL rules control traffic flow.',
    steps: [
      {
        title: 'Build Internet → Firewall → Switch',
        instruction: 'Place these 3 devices and cable them in a chain:\n\n**Internet/WAN** → **Firewall** → **Switch**\n\nThe firewall sits between the untrusted Internet and your trusted LAN. ALL traffic must pass through it — that\'s the chokepoint where security rules are enforced.',
        hint: 'A firewall inspects every packet against its rule set. No rule match = implicit deny (drop the packet).',
        check: (s) => s.devices.some(d => d.type === 'cloud') && s.devices.some(d => d.type === 'firewall') && s.devices.some(d => d.type === 'switch') && s.cables.length >= 2,
        feedback: (s) => {
          if (!s.devices.some(d => d.type === 'cloud')) return 'Add an Internet/WAN device.';
          if (!s.devices.some(d => d.type === 'firewall')) return 'Add a Firewall.';
          if (!s.devices.some(d => d.type === 'switch')) return 'Add a Switch.';
          if (s.cables.length < 2) return 'Cable: Internet → Firewall → Switch.';
          return null;
        },
      },
      {
        title: 'Add LAN devices',
        instruction: 'Add **2 PCs** and **1 Server** to the switch.\n\nThese represent your internal network — employee workstations and a web server. The firewall protects them from direct Internet exposure.',
        hint: 'Defense in depth: firewall is the first layer. You should also have host-based firewalls on each PC/server.',
        check: (s) => s.devices.filter(d => d.type === 'pc').length >= 2 && s.devices.some(d => d.type === 'server'),
        feedback: (s) => {
          const pcs = s.devices.filter(d => d.type === 'pc').length;
          if (pcs < 2) return `${pcs}/2 PCs placed.`;
          if (!s.devices.some(d => d.type === 'server')) return 'Add a Server.';
          return null;
        },
      },
      {
        title: 'Configure IPs',
        instruction: 'Set IPs on the **Firewall** (both interfaces) and the **PCs** + **Server**:\n\n• Firewall outside interface: **203.0.113.1** (public IP, toward Internet)\n• Firewall inside interface: **192.168.1.1** (LAN gateway)\n• PCs: **192.168.1.10**, **192.168.1.11** with gateway **192.168.1.1**\n• Server: **192.168.1.100** with gateway **192.168.1.1**',
        hint: '192.168.x.x is RFC 1918 private address space — not routable on the Internet. The firewall performs NAT to translate private → public.',
        check: (s) => {
          const fw = s.devices.find(d => d.type === 'firewall');
          const pcs = s.devices.filter(d => d.type === 'pc');
          return fw && fw.interfaces.filter(i => i.ip).length >= 2 && pcs.filter(p => p.interfaces.some(i => i.ip)).length >= 2;
        },
        feedback: (s) => {
          const fw = s.devices.find(d => d.type === 'firewall');
          if (!fw) return 'No firewall found.';
          const fwIps = fw.interfaces.filter(i => i.ip).length;
          if (fwIps < 2) return `Firewall has ${fwIps}/2 interfaces with IPs.`;
          const pcs = s.devices.filter(d => d.type === 'pc');
          const configured = pcs.filter(p => p.interfaces.some(i => i.ip)).length;
          if (configured < 2) return `${configured}/2 PCs have IPs.`;
          return null;
        },
      },
      {
        title: 'Add firewall ACL rules',
        instruction: 'Double-click the **Firewall** → **Security Groups** tab.\n\nAdd a security group called "LAN-Rules" with these inbound rules:\n• Allow TCP port **80** (HTTP)\n• Allow TCP port **443** (HTTPS)\n\n**Key concept**: firewalls use an **implicit deny** — anything not explicitly allowed is blocked. So these 2 rules allow web traffic and block everything else.',
        hint: 'ACL = Access Control List. Rules are processed top to bottom. First match wins. "Implicit deny all" is the invisible last rule.',
        check: (s) => {
          const fw = s.devices.find(d => d.type === 'firewall');
          return fw && fw.securityGroups && fw.securityGroups.length > 0 && fw.securityGroups.some(sg => sg.rules && sg.rules.length >= 2);
        },
        feedback: (s) => {
          const fw = s.devices.find(d => d.type === 'firewall');
          if (!fw) return 'No firewall found.';
          if (!fw.securityGroups || fw.securityGroups.length === 0) return 'Add a security group on the firewall.';
          const rules = fw.securityGroups.reduce((a, sg) => a + (sg.rules?.length || 0), 0);
          return rules < 2 ? `${rules}/2 ACL rules added. Add allow rules for port 80 and 443.` : null;
        },
      },
      {
        title: 'Review firewall concepts',
        instruction: 'Run `show security-groups` on the **Firewall** CLI to see your rules.\n\n**Network+ firewall types**:\n• **Packet filtering** — inspects headers only (src/dst IP, port, protocol)\n• **Stateful inspection** — tracks connection state (SYN→SYN-ACK→ACK)\n• **Application layer / proxy** — inspects payload content (Layer 7)\n• **NGFW** (Next-Gen) — combines stateful + IDS/IPS + application awareness\n• **WAF** — Web Application Firewall, protects web servers specifically\n\n**Firewall zones**: outside (untrusted), inside (trusted), DMZ (semi-trusted)',
        hint: 'Stateful firewalls remember "I saw an outbound SYN to 8.8.8.8:443" so they automatically allow the reply — you don\'t need an explicit inbound rule for return traffic.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'troubleshooting-101',
    title: 'Troubleshooting with CLI Tools',
    objective: '5.2',
    difficulty: 'Beginner',
    duration: '12 min',
    description: 'Use ping, traceroute, ipconfig, and arp on a pre-built network to diagnose connectivity. Learn the CompTIA troubleshooting methodology hands-on.',
    autoSetup: (state) => {
      // Pre-build a working 2-subnet network
      const r1 = { id: 'd_ts101_r1', type: 'router', x: 650, y: 200, hostname: 'GW-Router',
        interfaces: [
          { name: 'Gi0/0', cableId: null, ip: '192.168.1.1', mask: '255.255.255.0', mac: 'AA:00:TS:01:00:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 },
          { name: 'Gi0/1', cableId: null, ip: '10.0.0.1', mask: '255.255.255.0', mac: 'AA:00:TS:01:00:02', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 },
        ],
        routingTable: [{ type: 'static', network: '10.0.0.0', mask: '255.255.255.0', nextHop: '10.0.0.1', iface: 'Gi0/1' }],
        arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
        stpConfig: null, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] };
      const sw1 = { id: 'd_ts101_sw1', type: 'switch', x: 400, y: 400, hostname: 'SW-Office',
        interfaces: Array.from({ length: 8 }, (_, i) => ({
          name: `Fa0/${i + 1}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:00:TS:02:${String(i+1).padStart(2,'0')}:01`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64,
        })),
        routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
        stpConfig: null, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] };
      const makePC = (id, x, y, name, ip) => ({
        id, type: 'pc', x, y, hostname: name,
        interfaces: [{ name: 'eth0', cableId: null, ip, mask: '255.255.255.0', mac: `AA:00:TS:${id.slice(-2)}:01:01`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '192.168.1.1', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 }],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
        stpConfig: null, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] });
      const srv = { id: 'd_ts101_srv', type: 'server', x: 900, y: 400, hostname: 'WebServer',
        interfaces: [{ name: 'eth0', cableId: null, ip: '10.0.0.50', mask: '255.255.255.0', mac: 'AA:00:TS:SV:01:01', vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '10.0.0.1', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 }],
        routingTable: [], arpTable: [], macTable: [], vlanDb: [], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
        stpConfig: null, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [] };
      const pc1 = makePC('d_ts101_p1', 250, 550, 'PC-Alice', '192.168.1.10');
      const pc2 = makePC('d_ts101_p2', 550, 550, 'PC-Bob', '192.168.1.11');
      state.devices.push(r1, sw1, pc1, pc2, srv);
      const cables = [
        { id: 'c_ts101_1', from: r1.id, to: sw1.id, type: 'cat6' },
        { id: 'c_ts101_2', from: sw1.id, to: pc1.id, type: 'cat6' },
        { id: 'c_ts101_3', from: sw1.id, to: pc2.id, type: 'cat6' },
        { id: 'c_ts101_4', from: r1.id, to: srv.id, type: 'fiber' },
      ];
      cables.forEach((c, ci) => {
        const fromDev = state.devices.find(d => d.id === c.from);
        const toDev = state.devices.find(d => d.id === c.to);
        const fromIfc = fromDev.interfaces.find(i => !i.cableId);
        const toIfc = toDev.interfaces.find(i => !i.cableId);
        if (fromIfc) fromIfc.cableId = c.id;
        if (toIfc) toIfc.cableId = c.id;
      });
      state.cables.push(...cables);
    },
    steps: [
      {
        title: 'Explore the pre-built network',
        instruction: 'You have a working network with:\n• **GW-Router** — gateway between two subnets (192.168.1.0/24 and 10.0.0.0/24)\n• **SW-Office** — office switch\n• **PC-Alice** (192.168.1.10) and **PC-Bob** (192.168.1.11) — on the office LAN\n• **WebServer** (10.0.0.50) — on a separate server subnet\n\nDouble-click **PC-Alice** → **Overview** tab to see its configuration.',
        hint: 'Two subnets means cross-subnet traffic must go through the router. Same-subnet traffic stays on the switch.',
        check: (s) => s.devices.length >= 5,
        feedback: () => null,
      },
      {
        title: 'Use ipconfig to check your settings',
        instruction: 'Double-click **PC-Alice** → **CLI** tab. Run:\n\n• `ipconfig` — see IP, mask, gateway, MAC\n\nVerify: IP is 192.168.1.10, gateway is 192.168.1.1.\n\n**Exam tip**: `ipconfig` is the FIRST command in the CompTIA troubleshooting methodology. Always verify the basics before digging deeper.',
        hint: 'On Windows: ipconfig. On Linux/Mac: ifconfig or ip addr. They show the same info — IP, mask, gateway.',
        check: () => true,
        feedback: () => null,
      },
      {
        title: 'Ping a local device',
        instruction: 'On **PC-Alice** CLI, run:\n\n• `ping 192.168.1.11` — ping PC-Bob (same subnet)\n• `ping 192.168.1.1` — ping the gateway\n\n**Same-subnet ping**: PC-Alice ARPs for PC-Bob\'s MAC → switch forwards → direct delivery. No router involved.\n\n**Gateway ping**: Verifies Layer 3 connectivity to the router.',
        hint: 'If ping to gateway fails: check IP, mask, cable. If ping to gateway works but remote fails: routing issue.',
        check: () => true,
        feedback: () => null,
      },
      {
        title: 'Ping across subnets',
        instruction: 'On **PC-Alice** CLI, run:\n\n• `ping 10.0.0.50` — ping the WebServer (different subnet!)\n\nThis ping crosses subnets: PC-Alice → Switch → Router → WebServer. The router looks up 10.0.0.0/24 in its routing table and forwards the packet.\n\n**Troubleshooting flow**: If this fails, run `ping 192.168.1.1` first. If gateway ping works, the problem is routing. If gateway fails, the problem is local.',
        hint: 'Cross-subnet traffic: src PC ARPs for the gateway MAC (not the destination MAC), sends frame to gateway, router re-encapsulates and forwards.',
        check: () => true,
        feedback: () => null,
      },
      {
        title: 'Use traceroute and ARP',
        instruction: 'On **PC-Alice** CLI, run:\n\n• `traceroute 10.0.0.50` — see each hop to the WebServer\n• `show arp` — see the ARP table (IP → MAC mappings)\n\n**traceroute** shows every router between source and destination. Each hop decrements the TTL by 1.\n\n**ARP table** shows which MACs you\'ve learned. You should see the gateway\'s MAC (192.168.1.1) since all cross-subnet traffic goes through it.\n\n**CompTIA 7-step troubleshooting**: 1. Identify problem → 2. Theory → 3. Test theory → 4. Plan → 5. Implement → 6. Verify → 7. Document',
        hint: 'ARP maps IP → MAC. It\'s Layer 2.5 (between L2 and L3). ARP requests are broadcast, ARP replies are unicast.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  // ── v4.31.0 Labs ──
  {
    id: 'packet-anatomy',
    title: 'Packet Anatomy Lab',
    objective: '1.1',
    difficulty: 'Beginner',
    duration: '10 min',
    description: 'Watch packets traverse a network and inspect L2/L3/L4 headers in real-time. Learn how MAC addresses, IPs, ports, and TTL work together.',
    steps: [
      {
        title: 'Build a simple network',
        instruction: 'Drag a **Router**, a **Switch**, and 2 **PCs** onto the canvas.\n\nCable them: PC1 → Switch → Router, PC2 → Switch.\n\nConfigure IPs:\n• Router Gi0/0: `192.168.1.1/24`\n• PC1 eth0: `192.168.1.10/24` gateway `192.168.1.1`\n• PC2 eth0: `192.168.1.20/24` gateway `192.168.1.1`',
        hint: 'Every endpoint needs an IP, subnet mask, and gateway pointing to the nearest router.',
        check: (s) => s.devices.filter(d => d.type === 'pc' && d.interfaces.some(i => i.ip && i.gateway)).length >= 2,
        feedback: (s) => { const ready = s.devices.filter(d => d.type === 'pc' && d.interfaces.some(i => i.ip && i.gateway)).length; return ready < 2 ? `${ready}/2 PCs configured with IP and gateway.` : null; },
      },
      {
        title: 'Ping and watch the packet inspector',
        instruction: 'Click **Ping** in the toolbar → select PC1 as source and PC2 as destination → click Ping.\n\nWatch the **Packet Inspection** panel appear! It shows:\n• **Layer 2**: Source/Destination MAC addresses, EtherType\n• **Layer 3**: Source/Destination IPs, Protocol (ICMP), TTL\n• **Layer 4**: Ports and flags\n\nNotice how the TTL decrements at each hop and the MAC addresses change when crossing a router.',
        hint: 'The MAC address changes at each L2 hop (device), but the IP addresses stay the same end-to-end. This is the key difference between L2 and L3.',
        check: () => true,
        feedback: () => null,
      },
      {
        title: 'Send ARP and inspect',
        instruction: 'Click **Ping** → select PC1 and PC2 → click **ARP**.\n\nNotice in the packet inspector:\n• EtherType is **0x0806 (ARP)** — not IPv4!\n• Destination MAC is **ff:ff:ff:ff:ff:ff** (broadcast)\n• The request is "Who has 192.168.1.20?"\n\n**Key concept**: ARP is Layer 2.5 — it bridges L2 (MAC) and L3 (IP). Without ARP, devices wouldn\'t know which MAC to put in the frame header.',
        hint: 'ARP Request = broadcast (ff:ff:ff:ff:ff:ff). ARP Reply = unicast (directly back to requester).',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'stp-convergence',
    title: 'STP Convergence Lab',
    objective: '2.1',
    difficulty: 'Intermediate',
    duration: '12 min',
    description: 'Watch STP elect a root bridge, calculate port roles, and block redundant paths — all animated in real-time.',
    autoSetup: (state) => {
      const makeSW = (id, x, y, name, priority) => ({
        id, type: 'switch', x, y, hostname: name,
        interfaces: Array.from({ length: 8 }, (_, i) => ({ name: `Fa0/${i+1}`, cableId: null, ip: '', mask: '255.255.255.0', mac: `AA:00:SC:${id.slice(-2)}:${String(i+1).padStart(2,'0')}:01`, vlan: 1, mode: 'access', trunkAllowed: [1], gateway: '', enabled: true, subInterfaces: [], ipv6: '', ipv6Prefix: 64 })),
        routingTable: [], arpTable: [], macTable: [], vlanDb: [{ id: 1, name: 'default' }], dhcpServer: null, dhcpRelay: null, acls: [],
        securityGroups: [], nacls: [], vpcConfig: null, vpnConfig: null, saseConfig: null, vxlanConfig: [],
        stpConfig: { priority, mode: 'rstp', portStates: {} }, ospfConfig: null, qosConfig: null, wirelessConfig: null, dnsRecords: [],
        bgpConfig: null, eigrpConfig: null, dnssecEnabled: false, dhcpSnooping: null, daiEnabled: false, portSecurity: null });
      const sw1 = makeSW('d_sc_sw1', 400, 200, 'SW-Core', 4096);
      const sw2 = makeSW('d_sc_sw2', 200, 500, 'SW-Left', 32768);
      const sw3 = makeSW('d_sc_sw3', 600, 500, 'SW-Right', 32768);
      state.devices.push(sw1, sw2, sw3);
      // Triangle cables
      const c1 = { id: 'c_sc_1', from: sw1.id, to: sw2.id, type: 'cat6', fromIface: 'Fa0/1', toIface: 'Fa0/1' };
      const c2 = { id: 'c_sc_2', from: sw1.id, to: sw3.id, type: 'cat6', fromIface: 'Fa0/2', toIface: 'Fa0/1' };
      const c3 = { id: 'c_sc_3', from: sw2.id, to: sw3.id, type: 'cat6', fromIface: 'Fa0/2', toIface: 'Fa0/2' };
      sw1.interfaces[0].cableId = c1.id; sw2.interfaces[0].cableId = c1.id;
      sw1.interfaces[1].cableId = c2.id; sw3.interfaces[0].cableId = c2.id;
      sw2.interfaces[1].cableId = c3.id; sw3.interfaces[1].cableId = c3.id;
      state.cables.push(c1, c2, c3);
    },
    steps: [
      {
        title: 'Examine the STP triangle',
        instruction: 'You have a triangle of 3 switches — this creates a **Layer 2 loop**! Without STP, broadcast frames would circle forever (broadcast storm).\n\nDouble-click **SW-Core** → **STP** tab. Notice:\n• Priority: **4096** (very low = will become root)\n• Mode: RSTP\n\nCheck **SW-Left** and **SW-Right** — both have priority **32768** (default).',
        hint: 'Lower bridge priority wins root election. If tied, lowest MAC wins. Default priority is 32768.',
        check: (s) => s.devices.filter(d => d.stpConfig).length >= 3,
        feedback: (s) => { const stp = s.devices.filter(d => d.stpConfig).length; return stp < 3 ? `${stp}/3 switches have STP configured.` : null; },
      },
      {
        title: 'Run convergence',
        instruction: 'On any switch\'s **STP** tab, click **▶ Run Convergence**.\n\nWatch the animation:\n1. BPDUs (Bridge Protocol Data Units) flow from SW-Core to the other switches\n2. SW-Core is elected **Root Bridge** (lowest priority 4096)\n3. One port on the SW-Left↔SW-Right link goes to **BLOCKING** — breaking the loop!\n\nCheck the STP tab on each switch to see the port states update.',
        hint: 'Root bridge sends BPDUs every 2 seconds. Non-root switches forward BPDUs toward the root port (the port closest to root bridge).',
        check: (s) => s.devices.some(d => d.stpConfig && Object.values(d.stpConfig.portStates || {}).includes('blocking')),
        feedback: (s) => { const blocking = s.devices.filter(d => d.stpConfig && Object.values(d.stpConfig.portStates || {}).includes('blocking')).length; return blocking === 0 ? 'Click "Run Convergence" on any switch\'s STP tab.' : null; },
      },
      {
        title: 'Understand port roles',
        instruction: 'After convergence, check the CLI on each switch: `show spanning-tree detail`\n\n**Port Roles** (N10-009 objective 2.1):\n• **Root Port** — port closest to root bridge (forwarding)\n• **Designated Port** — port that forwards on each segment (forwarding)\n• **Blocked/Alternate Port** — redundant port (blocking to prevent loop)\n\nSW-Core has all **designated** ports (it\'s the root). The other switches each have one **root** port and potentially one **blocked** port.',
        hint: 'RSTP convergence: ~1-2 seconds. Classic STP: 30-50 seconds (15s listening + 15s learning). RSTP uses proposal/agreement instead of timers.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'qos-voice-priority',
    title: 'QoS Voice Priority Lab',
    objective: '4.6',
    difficulty: 'Intermediate',
    duration: '12 min',
    description: 'Configure QoS policies to prioritize voice traffic (DSCP EF) over data. See how classification and queuing affect packet delivery.',
    steps: [
      {
        title: 'Build a voice network',
        instruction: 'Drag a **Router**, a **Switch**, 2 **PCs**, and 2 **VoIP** phones.\n\nCable them all to the switch, and the switch to the router.\n\nConfigure IPs:\n• Router: `10.0.0.1/24`\n• PCs: `10.0.0.10-11/24` with gateway\n• VoIP phones: `10.0.0.50-51/24` with gateway',
        hint: 'VoIP uses RTP over UDP, typically ports 5060 (SIP signaling) and 16384-32767 (media).',
        check: (s) => s.devices.filter(d => d.type === 'voip').length >= 2 && s.devices.filter(d => d.type === 'router').length >= 1,
        feedback: (s) => { const voip = s.devices.filter(d => d.type === 'voip').length; return voip < 2 ? `${voip}/2 VoIP phones placed.` : null; },
      },
      {
        title: 'Configure QoS policies',
        instruction: 'Double-click the **Router** → **QoS** tab → Enable QoS.\n\nAdd these policies:\n1. Name: `voice`, Match: `udp 5060`, DSCP: `ef`, Queue: `priority`\n2. Name: `data`, Match: `any`, DSCP: `default`, Queue: `best-effort`\n\n**DSCP EF** (Expedited Forwarding) = decimal 46 = **priority queue**. Voice gets processed first, data waits.',
        hint: 'DSCP values: EF (46) = voice, AF41 (34) = video, AF21 (18) = low-latency data, CS0 (0) = best effort.',
        check: (s) => s.devices.some(d => d.qosConfig?.enabled && d.qosConfig.policies?.length >= 2),
        feedback: (s) => { const qos = s.devices.find(d => d.qosConfig?.enabled); if (!qos) return 'Enable QoS on the router.'; return qos.qosConfig.policies?.length < 2 ? `${qos.qosConfig.policies.length}/2 policies configured.` : null; },
      },
      {
        title: 'Test with ping and observe QoS',
        instruction: 'Ping from **PC1** to **PC2** and watch the packet inspector.\n\nNotice the **payload** field shows `QoS: data (best-effort)` — regular traffic.\n\nNow ping between VoIP phones. If you had voice-matching traffic, it would show `QoS: voice (priority)` with lower delay.\n\nRun `show qos counters` on the router CLI to see queue statistics.\n\n**Key concept**: QoS doesn\'t create bandwidth — it **prioritizes** traffic. Priority queue gets serviced first, best-effort waits. During congestion, best-effort packets may be **tail-dropped**.',
        hint: 'QoS mechanisms: Classification → Marking → Queuing → Scheduling → Policing/Shaping. Remember: trust boundaries at access layer.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'bgp-peering',
    title: 'BGP Peering Lab',
    objective: '1.4',
    difficulty: 'Advanced',
    duration: '15 min',
    description: 'Configure eBGP between two autonomous systems. Negotiate peers, exchange routes, and understand AS_PATH — the backbone of Internet routing.',
    steps: [
      {
        title: 'Build two autonomous systems',
        instruction: 'Build 2 separate networks connected by 2 **routers** (ISP edge routers):\n\n• **R1** (AS 65001): `10.1.0.1/30` on Gi0/0 (toward R2), `192.168.1.1/24` on Gi0/1 (internal)\n• **R2** (AS 65002): `10.1.0.2/30` on Gi0/0 (toward R1), `172.16.0.1/24` on Gi0/1 (internal)\n\nCable R1 Gi0/0 ↔ R2 Gi0/0 with **fiber**.\nAdd a PC and switch to each side.',
        hint: 'eBGP peers are typically on a /30 point-to-point link. The /30 gives exactly 2 usable IPs.',
        check: (s) => s.devices.filter(d => d.type === 'router' || d.type === 'isp-router').length >= 2,
        feedback: (s) => { const routers = s.devices.filter(d => d.type === 'router' || d.type === 'isp-router').length; return routers < 2 ? `${routers}/2 routers placed.` : null; },
      },
      {
        title: 'Configure BGP on both routers',
        instruction: 'On **R1** → **BGP** tab:\n• Enable BGP, ASN: `65001`, Router ID: `1.1.1.1`\n• Add neighbor: IP `10.1.0.2`, Remote AS `65002`, Type `eBGP`\n• Add network: `192.168.1.0/24`\n\nOn **R2** → **BGP** tab:\n• Enable BGP, ASN: `65002`, Router ID: `2.2.2.2`\n• Add neighbor: IP `10.1.0.1`, Remote AS `65001`, Type `eBGP`\n• Add network: `172.16.0.0/24`',
        hint: 'BGP neighbors must be explicitly configured on BOTH sides. Unlike OSPF, BGP does not auto-discover neighbors.',
        check: (s) => s.devices.filter(d => d.bgpConfig?.enabled && d.bgpConfig.neighbors.length > 0).length >= 2,
        feedback: (s) => { const bgp = s.devices.filter(d => d.bgpConfig?.enabled && d.bgpConfig.neighbors.length > 0).length; return bgp < 2 ? `${bgp}/2 routers have BGP configured with neighbors.` : null; },
      },
      {
        title: 'Negotiate and verify',
        instruction: 'On R1\'s **BGP** tab, click **▶ Negotiate Peers**.\n\nWatch the purple BGP UPDATE animation! Both peers should show **Established** state.\n\nVerify on CLI:\n• `show ip bgp summary` — see neighbor status (Established = good!)\n• `show ip bgp` — see the BGP routing table with learned networks\n• `show running-config` — see the full BGP config block\n\n**Key concepts**: eBGP uses TCP port 179. AS_PATH prevents loops (a router won\'t accept a route with its own ASN in the path).',
        hint: 'BGP states: Idle → Connect → OpenSent → OpenConfirm → Established. If stuck in Active, check neighbor IP and AS.',
        check: (s) => s.devices.some(d => d.bgpConfig?.neighbors?.some(n => n.state === 'Established')),
        feedback: (s) => { const est = s.devices.filter(d => d.bgpConfig?.neighbors?.some(n => n.state === 'Established')).length; return est === 0 ? 'Click "Negotiate Peers" on a BGP tab.' : null; },
      },
    ]
  },
  {
    id: 'attack-defense',
    title: 'Network Attack & Defense Lab',
    objective: '4.2',
    difficulty: 'Intermediate',
    duration: '15 min',
    description: 'Simulate ARP spoofing, VLAN hopping, and rogue DHCP attacks — then enable DAI, DHCP snooping, and port security to defend against them.',
    steps: [
      {
        title: 'Build a vulnerable network',
        instruction: 'Drag a **Router**, 2 **Switches**, and 3 **PCs** onto the canvas.\n\nCable: Router → SW1 → SW2, PCs to switches.\n\nConfigure IPs on all PCs with gateway pointing to the router.\n\nThis network has **no security** — it\'s vulnerable to Layer 2 attacks!',
        hint: 'Most L2 attacks target switches because switches blindly trust MAC addresses and ARP replies.',
        check: (s) => s.devices.filter(d => d.type.indexOf('switch') >= 0).length >= 2 && s.devices.filter(d => d.type === 'pc').length >= 2,
        feedback: (s) => { const sw = s.devices.filter(d => d.type.indexOf('switch') >= 0).length; const pc = s.devices.filter(d => d.type === 'pc').length; return `${sw}/2 switches, ${pc}/2 PCs placed.`; },
      },
      {
        title: 'Launch attacks',
        instruction: 'Double-click **SW1** → **Attack** tab.\n\nClick each attack button:\n• **⚡ ARP Spoof** — see the red fake ARP packet! An attacker could redirect traffic.\n• **⚡ VLAN Hop** — double-tagging exploits the native VLAN\n• **⚡ Rogue DHCP** — attacker gives out malicious gateway/DNS\n\nAll three succeed because no defenses are configured!',
        hint: 'In the real world, these attacks happen on the LAN. An attacker plugs into an open port and starts poisoning.',
        check: () => true,
        feedback: () => null,
      },
      {
        title: 'Enable defenses',
        instruction: 'On **SW1** → **Attack** tab, enable:\n\n1. **DHCP Snooping** ✓ — mark the uplink port (to router) as trusted\n2. **DAI (Dynamic ARP Inspection)** ✓ — validates ARP against binding table\n3. **Port Security** ✓ — Max MAC: 1, Violation: shutdown\n\nDo the same on **SW2**.',
        hint: 'DHCP Snooping builds a binding table (IP↔MAC↔port↔VLAN). DAI uses this table to validate ARP. They work together.',
        check: (s) => s.devices.some(d => d.dhcpSnooping?.enabled) && s.devices.some(d => d.daiEnabled),
        feedback: (s) => { const sn = s.devices.filter(d => d.dhcpSnooping?.enabled).length; const dai = s.devices.filter(d => d.daiEnabled).length; return `DHCP Snooping: ${sn} switch(es), DAI: ${dai} switch(es).`; },
      },
      {
        title: 'Test defenses',
        instruction: 'Now try the attacks again! Click **⚡ ARP Spoof** — it\'s **blocked by DAI**! 🛡️\n\nClick **⚡ Rogue DHCP** — **blocked by DHCP Snooping**! 🛡️\n\nVerify on CLI:\n• `show ip dhcp snooping` — see trusted/untrusted ports\n• `show ip arp inspection` — see DAI status\n\n**Key concept**: defense-in-depth means layering multiple controls. Each attack has a specific countermeasure.',
        hint: 'Port security limits MAC addresses per port. Violation modes: shutdown (disable port), restrict (drop + log), protect (drop silently).',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
  {
    id: 'dnssec-chain',
    title: 'DNSSEC Chain of Trust Lab',
    objective: '1.6',
    difficulty: 'Advanced',
    duration: '12 min',
    description: 'Enable DNSSEC on a DNS server, add signing records, and validate the chain of trust with dig +dnssec. Understand how RRSIG, DNSKEY, and DS work together.',
    steps: [
      {
        title: 'Build a DNS infrastructure',
        instruction: 'Drag a **DNS Server**, a **Router**, a **Switch**, and 2 **PCs**.\n\nCable everything through the switch to the router.\n\nConfigure IPs:\n• DNS Server: `10.0.0.53/24`\n• PCs: `10.0.0.10-11/24` with gateway `10.0.0.1`\n\nOn the DNS Server → **DNS** tab, add these records:\n• A record: `web.example.com` → `10.0.0.100`\n• MX record: `example.com` → `10 mail.example.com`',
        hint: 'DNS servers typically use port 53 (UDP for queries, TCP for zone transfers).',
        check: (s) => s.devices.some(d => d.type === 'dns-server' && d.dnsRecords?.length >= 2),
        feedback: (s) => { const dns = s.devices.find(d => d.type === 'dns-server'); if (!dns) return 'Add a DNS Server.'; return dns.dnsRecords?.length < 2 ? `${dns.dnsRecords?.length || 0}/2 DNS records added.` : null; },
      },
      {
        title: 'Enable DNSSEC',
        instruction: 'On the DNS Server → **DNS** tab, scroll down to the **🔒 DNSSEC** section.\n\nCheck **Enable DNSSEC**.\n\nNotice the new records automatically generated:\n• **DNSKEY** — the zone\'s public key\n• **RRSIG** — digital signatures over your A and MX records\n• **DS** — Delegation Signer (hash of DNSKEY, stored in parent zone)\n\nThese three record types form the **chain of trust**.',
        hint: 'DNSSEC does NOT encrypt DNS — it only authenticates. Use DoH (DNS over HTTPS) or DoT (DNS over TLS) for encryption.',
        check: (s) => s.devices.some(d => d.dnssecEnabled),
        feedback: (s) => { const sec = s.devices.filter(d => d.dnssecEnabled).length; return sec === 0 ? 'Enable DNSSEC on the DNS Server.' : null; },
      },
      {
        title: 'Validate with dig +dnssec',
        instruction: 'On any **PC** → CLI tab, run:\n\n• `dig +dnssec web.example.com`\n\nLook at the output:\n• **AD flag: SET** means the response is **Authenticated Data** ✓\n• Each record shows its **RRSIG** (signature) and **DNSKEY** (public key)\n• The chain: record → RRSIG validates → DNSKEY verifies → DS in parent zone\n\nAlso try: `show dnssec` on the DNS Server to see the signing status.\n\n**Without DNSSEC**, an attacker could perform **DNS cache poisoning** — injecting fake records to redirect users to malicious sites.',
        hint: 'Chain of trust: Root (.) → TLD (.com) → Domain (example.com). Each level signs the level below it using DS records.',
        check: () => true,
        feedback: () => null,
      },
    ]
  },
];

let tbActiveLab = null;  // { labId, stepIdx }

function tbOpenLabPicker() {
  const modal = document.getElementById('tb-lab-picker');
  const body = document.getElementById('tb-lab-picker-body');
  if (!modal || !body) return;
  body.innerHTML = TB_LABS.map(lab => `<div class="tb-lab-card" onclick="tbStartLab('${lab.id}')">
    <div class="tb-lab-card-head">
      <strong>${escHtml(lab.title)}</strong>
      <span class="tb-lab-diff tb-lab-diff-${lab.difficulty.toLowerCase()}">${lab.difficulty}</span>
    </div>
    <div class="tb-lab-card-meta">
      <span>Obj ${lab.objective}</span> &middot; <span>${lab.duration}</span> &middot; <span>${lab.steps.length} steps</span>${lab.autoSetup ? ' &middot; <span class="tb-lab-badge-auto">Pre-built</span>' : ''}
    </div>
    <div class="tb-lab-card-desc">${escHtml(lab.description)}</div>
  </div>`).join('');
  modal.classList.remove('is-hidden');
}

function tbStartLab(labId) {
  const lab = TB_LABS.find(l => l.id === labId);
  if (!lab) return;
  document.getElementById('tb-lab-picker')?.classList.add('is-hidden');
  // Clear canvas for lab
  if (tbState.devices.length > 0 && !confirm('Starting a lab will clear your current canvas. Continue?')) return;
  tbState = tbNewState();
  tbState.name = lab.title;
  // Auto-setup: pre-build topology for troubleshooting/scenario labs
  if (lab.autoSetup) {
    lab.autoSetup(tbState);
    tbMigrateState(tbState);
  }
  tbRenderCanvas();
  tbUpdateDeviceCount();
  tbSaveDraft();
  tbActiveLab = { labId, stepIdx: 0, hintsUsed: 0 };
  tbRenderLabStep();
  document.getElementById('tb-lab-panel')?.classList.remove('is-hidden');
}

function tbToggleLabHint() {
  const el = document.getElementById('tb-lab-hint-content');
  if (el) {
    el.classList.toggle('is-hidden');
    if (!el.classList.contains('is-hidden') && tbActiveLab) tbActiveLab.hintsUsed++;
  }
}

function tbRenderLabStep() {
  if (!tbActiveLab) return;
  const lab = TB_LABS.find(l => l.id === tbActiveLab.labId);
  if (!lab) return;
  const step = lab.steps[tbActiveLab.stepIdx];
  document.getElementById('tb-lab-title').textContent = lab.title;
  document.getElementById('tb-lab-progress').textContent = `Step ${tbActiveLab.stepIdx + 1} / ${lab.steps.length}`;
  document.getElementById('tb-lab-prev').classList.toggle('is-hidden', tbActiveLab.stepIdx === 0);
  const isLast = tbActiveLab.stepIdx === lab.steps.length - 1;
  const nextBtn = document.getElementById('tb-lab-next');
  nextBtn.textContent = isLast ? 'Finish Lab ✓' : 'Next ▶';
  // Check if step condition is met
  const passed = step.check(tbState);
  // Track whether this step JUST became complete (for celebration)
  const stepKey = `${tbActiveLab.labId}_${tbActiveLab.stepIdx}`;
  if (passed && !tbActiveLab._completedSteps) tbActiveLab._completedSteps = new Set();
  const justCompleted = passed && tbActiveLab._completedSteps && !tbActiveLab._completedSteps.has(stepKey);
  if (passed && tbActiveLab._completedSteps) tbActiveLab._completedSteps.add(stepKey);

  const stepEl = document.getElementById('tb-lab-step');
  // Convert markdown: **bold**, `code`, \n\n to <br> for multi-paragraph
  let instrHtml = step.instruction.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  instrHtml = instrHtml.replace(/\n\n/g, '<br><br>');
  // Build feedback section
  let feedbackHtml = '';
  if (!passed && step.feedback) {
    const fb = step.feedback(tbState);
    if (fb) feedbackHtml = `<div class="tb-lab-step-feedback">⚠ ${fb}</div>`;
  }
  // Build hint section
  let hintHtml = '';
  if (step.hint) {
    hintHtml = `<div class="tb-lab-hint">
      <button class="btn btn-ghost tb-lab-hint-toggle" onclick="tbToggleLabHint()">💡 Show Hint</button>
      <div id="tb-lab-hint-content" class="tb-lab-hint-body is-hidden">${step.hint}</div>
    </div>`;
  }
  // Progress bar
  const pct = Math.round(((tbActiveLab.stepIdx + (passed ? 1 : 0)) / lab.steps.length) * 100);
  const progressBar = `<div class="tb-lab-progress-bar"><div class="tb-lab-progress-fill" style="width:${pct}%"></div></div>`;

  // Celebration class for animation
  const checkClass = justCompleted ? 'tb-lab-step-check tb-lab-step-just-completed' : 'tb-lab-step-check';

  stepEl.innerHTML = `<div class="tb-lab-step-title">${escHtml(step.title)}</div>
    ${progressBar}
    <div class="tb-lab-step-instr">${instrHtml}</div>
    ${hintHtml}
    ${feedbackHtml}
    ${passed ? `<div class="${checkClass}">✓ Step complete!${!isLast ? ' Click Next ▶ to continue.' : ' Click Finish to complete the lab!'}</div>` : '<div class="tb-lab-step-pending">Complete the step above — the panel updates live as you work.</div>'}`;

  // Highlight the Next button when step is complete
  nextBtn.classList.toggle('tb-lab-next-ready', passed);

  // Auto-detect target devices from step instruction bold text and highlight them
  // Extracts **Bold Terms** from instruction, matches against device hostnames and type labels
  tbActiveLab._highlightIds = [];
  if (!passed) {
    const boldTerms = (step.instruction.match(/\*\*([^*]+)\*\*/g) || []).map(m => m.replace(/\*\*/g, '').trim().toLowerCase());
    if (boldTerms.length) {
      const typeLabels = {};
      Object.entries(TB_DEVICE_TYPES).forEach(([k, v]) => { typeLabels[v.label.toLowerCase()] = k; typeLabels[v.short.toLowerCase()] = k; });
      // Also match plural forms (e.g. "Routers" → "router", "2 PCs" → "pc")
      const matchTypes = new Set();
      const matchHostnames = new Set();
      boldTerms.forEach(term => {
        // Direct type label match (e.g. "Router", "Switch", "DNS Server")
        if (typeLabels[term]) { matchTypes.add(typeLabels[term]); return; }
        // Plural/quantified match (e.g. "3 Routers", "2 PCs")
        const stripped = term.replace(/^[\d\s]+/, '').replace(/s$/, '').trim();
        if (typeLabels[stripped]) { matchTypes.add(typeLabels[stripped]); return; }
        // Hostname match (e.g. "SW-Core", "R1", "PC2")
        matchHostnames.add(term);
      });
      tbState.devices.forEach(d => {
        if (matchTypes.has(d.type)) { tbActiveLab._highlightIds.push(d.id); return; }
        const hn = (d.hostname || '').toLowerCase();
        if (matchHostnames.has(hn)) { tbActiveLab._highlightIds.push(d.id); return; }
        // Partial hostname match (e.g. bold "R1" matches hostname "R1")
        for (const h of matchHostnames) {
          if (hn === h || hn.startsWith(h + '-') || h.startsWith(hn)) { tbActiveLab._highlightIds.push(d.id); break; }
        }
      });
    }
  }
  tbRenderCanvas();
}

function tbLabNext() {
  if (!tbActiveLab) return;
  const lab = TB_LABS.find(l => l.id === tbActiveLab.labId);
  if (!lab) return;
  // Check current step
  const step = lab.steps[tbActiveLab.stepIdx];
  if (!step.check(tbState) && tbActiveLab.stepIdx < lab.steps.length - 1) {
    showErrorToast('Complete the current step before moving on.');
    return;
  }
  if (tbActiveLab.stepIdx < lab.steps.length - 1) {
    tbActiveLab.stepIdx++;
    tbRenderLabStep();
  } else {
    // Lab complete
    tbEndLab();
    showErrorToast('Lab complete! Great work. 🎉');
  }
}

function tbLabPrev() {
  if (!tbActiveLab || tbActiveLab.stepIdx <= 0) return;
  tbActiveLab.stepIdx--;
  tbRenderLabStep();
}

function tbEndLab() {
  // Track lab completion
  if (tbActiveLab) {
    try {
      const completions = JSON.parse(localStorage.getItem(STORAGE.LAB_COMPLETIONS) || '{}');
      if (!completions[tbActiveLab.labId]) {
        completions[tbActiveLab.labId] = { firstCompleted: new Date().toISOString(), count: 0 };
      }
      completions[tbActiveLab.labId].count = (completions[tbActiveLab.labId].count || 0) + 1;
      completions[tbActiveLab.labId].lastCompleted = new Date().toISOString();
      localStorage.setItem(STORAGE.LAB_COMPLETIONS, JSON.stringify(completions));
    } catch (_) {}
    // Evaluate lab milestones
    evaluateMilestones();
  }
  tbActiveLab = null;
  document.getElementById('tb-lab-panel')?.classList.add('is-hidden');
}

// ══════════════════════════════════════════
// FEATURE 1: SUBNETTING TRAINER
// ══════════════════════════════════════════
let subnetQ = null, subnetIdx = 0, subnetCorrect = 0, subnetTotal = 0, subnetStreak = 0;

function cidrToMask(cidr) {
  const bits = '1'.repeat(cidr) + '0'.repeat(32 - cidr);
  return [bits.slice(0,8), bits.slice(8,16), bits.slice(16,24), bits.slice(24,32)].map(b => parseInt(b, 2)).join('.');
}
function cidrToMaskArr(cidr) {
  const bits = '1'.repeat(cidr) + '0'.repeat(32 - cidr);
  return [parseInt(bits.slice(0,8),2), parseInt(bits.slice(8,16),2), parseInt(bits.slice(16,24),2), parseInt(bits.slice(24,32),2)];
}
function arrToIp(a) { return a.join('.'); }
function getSubnetAddr(ipArr, maskArr) { return ipArr.map((o,i) => o & maskArr[i]); }
function getBroadcastAddr(ipArr, maskArr) { return ipArr.map((o,i) => (o & maskArr[i]) | (~maskArr[i] & 255)); }
function hostCount(cidr) { return cidr >= 31 ? (cidr === 31 ? 2 : 1) : Math.pow(2, 32 - cidr) - 2; }
function randOctet() { return Math.floor(Math.random() * 254) + 1; }
function randCidr() { return [24,25,26,27,28,29,30,16,20,22,23][Math.floor(Math.random() * 11)]; }

function genSubnetQuestion() {
  const types = ['cidr_to_mask','mask_to_cidr','find_subnet','find_broadcast','host_count','usable_range'];
  const type = types[Math.floor(Math.random() * types.length)];
  const cidr = randCidr();
  const ip = [randOctet(), randOctet(), randOctet(), randOctet()];
  // For /16 and /20 adjust
  if (cidr <= 16) { ip[2] = randOctet(); ip[3] = randOctet(); }
  const ipStr = arrToIp(ip);
  const mask = cidrToMask(cidr);
  const maskArr = cidrToMaskArr(cidr);
  const subnet = getSubnetAddr(ip, maskArr);
  const broadcast = getBroadcastAddr(ip, maskArr);
  const hosts = hostCount(cidr);

  switch(type) {
    case 'cidr_to_mask':
      return { q: `What is the subnet mask for /${cidr}?`, answer: mask, hint: `Count ${cidr} bits set to 1` };
    case 'mask_to_cidr':
      return { q: `What is the CIDR notation for subnet mask ${mask}?`, answer: `/${cidr}`, altAnswer: String(cidr), hint: 'Count the number of 1-bits' };
    case 'find_subnet':
      return { q: `What is the network/subnet address for ${ipStr}/${cidr}?`, answer: arrToIp(subnet), hint: `AND the IP with the mask ${mask}` };
    case 'find_broadcast':
      return { q: `What is the broadcast address for ${ipStr}/${cidr}?`, answer: arrToIp(broadcast), hint: 'Fill host bits with 1s' };
    case 'host_count':
      return { q: `How many usable host addresses in a /${cidr} network?`, answer: String(hosts), hint: `2^${32-cidr} - 2` };
    case 'usable_range':
      if (cidr >= 31) return genSubnetQuestion(); // /31 and /32 have no usable range — regenerate
      const first = subnet.slice(); first[3] += 1;
      const last = broadcast.slice(); last[3] -= 1;
      return { q: `What is the first usable IP in ${arrToIp(subnet)}/${cidr}?`, answer: arrToIp(first), hint: 'Network address + 1' };
    default:
      return { q: `What is the subnet mask for /${cidr}?`, answer: mask, hint: '' };
  }
}

function startSubnetTrainer() {
  subnetIdx = 0; subnetCorrect = 0; subnetTotal = 0; subnetStreak = 0;
  nextSubnetQuestion();
}

function nextSubnetQuestion() {
  subnetIdx++;
  subnetQ = genSubnetQuestion();
  document.getElementById('subnet-q-num').textContent = 'Q' + subnetIdx;
  document.getElementById('subnet-question').textContent = subnetQ.q;
  document.getElementById('subnet-answer').value = '';
  document.getElementById('subnet-feedback').innerHTML = '';
  document.getElementById('subnet-feedback').className = 'subnet-feedback';
  document.getElementById('subnet-next-btn').classList.add('is-hidden');
  document.getElementById('subnet-submit-btn').classList.remove('is-hidden');
  document.getElementById('subnet-answer').disabled = false;
  document.getElementById('subnet-answer').focus();
  document.getElementById('subnet-score').textContent = subnetCorrect + ' / ' + subnetTotal;
  document.getElementById('subnet-streak-lbl').textContent = '\ud83d\udd25 ' + subnetStreak;
}

function getSubnetStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE.SUBNET_STATS) || '{"seen":0,"correct":0}'); } catch { return { seen: 0, correct: 0 }; }
}
function updateSubnetStat(wasCorrect) {
  try {
    const s = getSubnetStats();
    s.seen++;
    if (wasCorrect) s.correct++;
    localStorage.setItem(STORAGE.SUBNET_STATS, JSON.stringify(s));
  } catch {}
}

function checkSubnetAnswer() {
  if (!subnetQ) return;
  const input = document.getElementById('subnet-answer').value.trim();
  if (!input) return;
  subnetTotal++;
  const fb = document.getElementById('subnet-feedback');
  const correct = input === subnetQ.answer || (subnetQ.altAnswer && input === subnetQ.altAnswer);
  updateSubnetStat(correct);
  if (correct) {
    subnetCorrect++;
    subnetStreak++;
    fb.innerHTML = '<strong>\u2705 Correct!</strong> ' + escHtml(subnetQ.answer);
    fb.className = 'subnet-feedback subnet-correct';
  } else {
    subnetStreak = 0;
    fb.innerHTML = '<strong>\u274c Wrong.</strong> Your answer: ' + escHtml(input) + '<br>Correct: <strong>' + escHtml(subnetQ.answer) + '</strong>' + (subnetQ.hint ? '<br><em>Hint: ' + escHtml(subnetQ.hint) + '</em>' : '');
    fb.className = 'subnet-feedback subnet-wrong';
  }
  document.getElementById('subnet-score').textContent = subnetCorrect + ' / ' + subnetTotal;
  document.getElementById('subnet-streak-lbl').textContent = '\ud83d\udd25 ' + subnetStreak;
  document.getElementById('subnet-submit-btn').classList.add('is-hidden');
  document.getElementById('subnet-next-btn').classList.remove('is-hidden');
  document.getElementById('subnet-answer').disabled = true;
}

// Allow Enter key in subnet input
document.addEventListener('keydown', e => {
  if (document.getElementById('page-subnet')?.classList.contains('active')) {
    if (e.key === 'Enter') {
      const nextBtn = document.getElementById('subnet-next-btn');
      if (nextBtn && !nextBtn.classList.contains('is-hidden')) nextSubnetQuestion();
      else checkSubnetAnswer();
    }
  }
});

// ══════════════════════════════════════════
// FEATURE 2: PORT NUMBER SPEED DRILL
// ══════════════════════════════════════════
const portData = [
  {proto:'FTP Data',port:'20',tp:'TCP'},{proto:'FTP Control',port:'21',tp:'TCP'},{proto:'SSH',port:'22',tp:'TCP'},
  {proto:'Telnet',port:'23',tp:'TCP'},{proto:'SMTP',port:'25',tp:'TCP'},{proto:'DNS',port:'53',tp:'TCP/UDP'},
  {proto:'DHCP Server',port:'67',tp:'UDP'},{proto:'DHCP Client',port:'68',tp:'UDP'},{proto:'TFTP',port:'69',tp:'UDP'},
  {proto:'HTTP',port:'80',tp:'TCP'},{proto:'Kerberos',port:'88',tp:'TCP/UDP'},{proto:'POP3',port:'110',tp:'TCP'},
  {proto:'NTP',port:'123',tp:'UDP'},{proto:'IMAP',port:'143',tp:'TCP'},{proto:'SNMP',port:'161',tp:'UDP'},
  {proto:'SNMP Trap',port:'162',tp:'UDP'},{proto:'LDAP',port:'389',tp:'TCP'},{proto:'HTTPS',port:'443',tp:'TCP'},
  {proto:'SMB',port:'445',tp:'TCP'},{proto:'Syslog',port:'514',tp:'UDP'},{proto:'SMTP TLS',port:'587',tp:'TCP'},
  {proto:'LDAPS',port:'636',tp:'TCP'},{proto:'iSCSI',port:'3260',tp:'TCP'},{proto:'TACACS+',port:'49',tp:'TCP'},
  {proto:'BGP',port:'179',tp:'TCP'},{proto:'RADIUS Auth',port:'1812',tp:'UDP'},{proto:'RADIUS Acct',port:'1813',tp:'UDP'},
  {proto:'MySQL',port:'3306',tp:'TCP'},{proto:'RDP',port:'3389',tp:'TCP'},{proto:'SIP',port:'5060',tp:'UDP'},
  {proto:'SIP TLS',port:'5061',tp:'TCP'},{proto:'IKE/IPsec',port:'500',tp:'UDP'},{proto:'L2TP',port:'1701',tp:'UDP'},
  {proto:'OpenVPN',port:'1194',tp:'UDP'},{proto:'NFS',port:'2049',tp:'TCP/UDP'},{proto:'FTPS',port:'990',tp:'TCP'},
  {proto:'NetBIOS Name',port:'137',tp:'UDP'},{proto:'NetBIOS Session',port:'139',tp:'TCP'},
  {proto:'IPsec NAT-T',port:'4500',tp:'UDP'},{proto:'VNC',port:'5900',tp:'TCP'}
];

// Secure ↔ insecure protocol/port pairs (Port Drill: secure pairs mode, #30).
// Each entry is one (insecure, secure) mapping. FTP and SMTP appear twice
// because they each have two valid secure equivalents — the `qualifier` field
// disambiguates them in the prompt, and `siblingProto` is excluded from
// distractors so the alternate isn't presented as a "wrong" answer.
const securePairs = [
  { insecure: { proto: 'HTTP',   port: '80',  tp: 'TCP' }, secure: { proto: 'HTTPS',           port: '443', tp: 'TCP' } },
  { insecure: { proto: 'FTP',    port: '21',  tp: 'TCP' }, secure: { proto: 'FTPS',            port: '990', tp: 'TCP' }, qualifier: 'over SSL/TLS', siblingProto: 'SFTP' },
  { insecure: { proto: 'FTP',    port: '21',  tp: 'TCP' }, secure: { proto: 'SFTP',            port: '22',  tp: 'TCP' }, qualifier: 'over SSH',     siblingProto: 'FTPS' },
  { insecure: { proto: 'Telnet', port: '23',  tp: 'TCP' }, secure: { proto: 'SSH',             port: '22',  tp: 'TCP' } },
  { insecure: { proto: 'SMTP',   port: '25',  tp: 'TCP' }, secure: { proto: 'SMTPS',           port: '465', tp: 'TCP' }, qualifier: 'with implicit TLS', siblingProto: 'SMTP submission (STARTTLS)' },
  { insecure: { proto: 'SMTP',   port: '25',  tp: 'TCP' }, secure: { proto: 'SMTP submission (STARTTLS)', port: '587', tp: 'TCP' }, qualifier: 'using STARTTLS submission', siblingProto: 'SMTPS' },
  { insecure: { proto: 'LDAP',   port: '389', tp: 'TCP' }, secure: { proto: 'LDAPS',           port: '636', tp: 'TCP' } },
  { insecure: { proto: 'POP3',   port: '110', tp: 'TCP' }, secure: { proto: 'POP3S',           port: '995', tp: 'TCP' } },
  { insecure: { proto: 'IMAP',   port: '143', tp: 'TCP' }, secure: { proto: 'IMAPS',           port: '993', tp: 'TCP' } }
];

let portTimer = null, portTimeLeft = PORT_DRILL_SECONDS, portScore = 0, portCurrentQ = null;
let portMissed = []; // Track wrong answers for review
let portMode = 'timed'; // 'timed' | 'endless' | 'family' | 'pairs'

function setPortMode(mode) {
  if (mode === 'endless') portMode = 'endless';
  else if (mode === 'family') portMode = 'family';
  else if (mode === 'pairs') portMode = 'pairs';
  else portMode = 'timed';
  // Update toggle button visuals
  const timedBtn = document.getElementById('port-mode-timed');
  const endlessBtn = document.getElementById('port-mode-endless');
  const familyBtn = document.getElementById('port-mode-family');
  const pairsBtn = document.getElementById('port-mode-pairs');
  if (timedBtn && endlessBtn) {
    timedBtn.classList.toggle('port-mode-active', portMode === 'timed');
    endlessBtn.classList.toggle('port-mode-active', portMode === 'endless');
    timedBtn.setAttribute('aria-pressed', String(portMode === 'timed'));
    endlessBtn.setAttribute('aria-pressed', String(portMode === 'endless'));
  }
  if (familyBtn) {
    familyBtn.classList.toggle('port-mode-active', portMode === 'family');
    familyBtn.setAttribute('aria-pressed', String(portMode === 'family'));
  }
  if (pairsBtn) {
    pairsBtn.classList.toggle('port-mode-active', portMode === 'pairs');
    pairsBtn.setAttribute('aria-pressed', String(portMode === 'pairs'));
  }
  // Swap pregame description + best label
  const descEl = document.getElementById('port-mode-desc');
  const bestLabelEl = document.getElementById('port-best-label');
  const bestValEl = document.getElementById('port-best');
  if (descEl) {
    if (portMode === 'family') {
      descEl.textContent = 'No timer. Each question asks you to select every port in a protocol family — one wrong submission ends the streak.';
    } else if (portMode === 'pairs') {
      descEl.textContent = 'No timer. Match insecure protocols (HTTP, FTP, Telnet, SMTP, LDAP, POP3, IMAP) to their secure equivalents — one wrong answer ends the streak.';
    } else if (portMode === 'endless') {
      descEl.textContent = 'No timer. Build the longest streak you can — one wrong answer ends the run.';
    } else {
      descEl.textContent = 'You have 30 seconds. Each correct answer = 1 point. Wrong answers lose 1 second.';
    }
  }
  if (bestLabelEl) {
    bestLabelEl.textContent = portMode === 'timed' ? 'BEST' : 'BEST STREAK';
  }
  if (bestValEl) {
    const key = portMode === 'family' ? STORAGE.PORT_FAMILY_BEST
      : portMode === 'pairs' ? STORAGE.PORT_PAIRS_BEST
      : portMode === 'endless' ? STORAGE.PORT_STREAK_BEST
      : STORAGE.PORT_BEST;
    bestValEl.textContent = parseInt(localStorage.getItem(key) || '0');
  }
  // Hide the timer block entirely in non-timed modes
  const timerBlock = document.querySelector('.port-timer-block');
  if (timerBlock) timerBlock.classList.toggle('is-hidden', portMode !== 'timed');
}

// ── Adaptive port focus (weighted selection based on per-port accuracy) ──
function getPortStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE.PORT_STATS) || '{}'); } catch { return {}; }
}
function savePortStats(stats) {
  try { localStorage.setItem(STORAGE.PORT_STATS, JSON.stringify(stats)); } catch {}
}
function updatePortStat(proto, wasCorrect) {
  const stats = getPortStats();
  if (!stats[proto]) stats[proto] = { seen: 0, correct: 0 };
  stats[proto].seen++;
  if (wasCorrect) stats[proto].correct++;
  savePortStats(stats);
}
function portWeight(proto, stats) {
  const s = stats[proto];
  // No data yet → baseline. Slight explore bonus on truly never-seen ports
  if (!s || s.seen === 0) return 1.2;
  // Not enough samples to trust — treat as baseline
  if (s.seen < 3) return 1.0;
  const accuracy = s.correct / s.seen;
  // Mastered → heavy downweight (still appears, just rarely)
  if (accuracy >= 0.95) return 0.3;
  if (accuracy >= 0.85) return 0.7;
  // Struggling → boost proportional to miss rate. Max ~5x at 0% accuracy.
  return 1.0 + ((1 - accuracy) * 4);
}
function pickWeightedPort() {
  const stats = getPortStats();
  const weights = portData.map(p => portWeight(p.proto, stats));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < portData.length; i++) {
    r -= weights[i];
    if (r <= 0) return portData[i];
  }
  return portData[portData.length - 1];
}
function getWeakestPorts(limit = 3) {
  const stats = getPortStats();
  return Object.entries(stats)
    .filter(([, s]) => s.seen >= 3)
    .map(([proto, s]) => ({ proto, accuracy: s.correct / s.seen, seen: s.seen }))
    .filter(x => x.accuracy < 0.85)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}
function getPortStatsSummary() {
  const stats = getPortStats();
  const entries = Object.values(stats);
  const totalSeen = entries.reduce((a, b) => a + b.seen, 0);
  const totalCorrect = entries.reduce((a, b) => a + b.correct, 0);
  const uniqueSeen = entries.filter(e => e.seen > 0).length;
  return {
    totalSeen,
    totalCorrect,
    overallAccuracy: totalSeen > 0 ? totalCorrect / totalSeen : 0,
    uniqueSeen,
    totalPorts: portData.length
  };
}
function renderPortFocusInfo() {
  const infoEl = document.getElementById('port-focus-info');
  const resetBtn = document.getElementById('port-reset-stats-btn');
  if (!infoEl) return;
  const summary = getPortStatsSummary();
  if (summary.totalSeen < 5) {
    infoEl.classList.add('is-hidden');
    if (resetBtn) resetBtn.classList.add('is-hidden');
    return;
  }
  const weak = getWeakestPorts(3);
  const accPct = Math.round(summary.overallAccuracy * 100);
  let html = `<div class="port-focus-title">🎯 <strong>Adaptive focus active</strong></div>`;
  html += `<div class="port-focus-stats">${summary.uniqueSeen}/${summary.totalPorts} ports seen · ${accPct}% overall accuracy</div>`;
  if (weak.length > 0) {
    const weakList = weak.map(w => `<span class="port-focus-weak">${escHtml(w.proto)}</span>`).join(', ');
    html += `<div class="port-focus-weak-line">Drilling: ${weakList}</div>`;
  } else {
    html += `<div class="port-focus-weak-line">No weak spots — mastery mode 💪</div>`;
  }
  infoEl.innerHTML = html;
  infoEl.classList.remove('is-hidden');
  if (resetBtn) resetBtn.classList.remove('is-hidden');
}
function resetPortStats() {
  if (!confirm('Reset all port focus stats? Your best score will be kept.')) return;
  try { localStorage.removeItem(STORAGE.PORT_STATS); } catch {}
  renderPortFocusInfo();
}

// ══════════════════════════════════════════
// TRY IT IN TERMINAL (v4.16 / #68) — curated shell commands that demo
// each protocol and each exam topic live. Memorization sticks harder when
// you've seen the port actually do something once.
// ══════════════════════════════════════════
const portCommands = {
  'HTTP':        { cmd: 'curl -I http://example.com',                                     note: 'See the HTTP/1.1 200 status line and server headers.' },
  'HTTPS':       { cmd: 'curl -I https://example.com',                                    note: 'Same request, but over TLS. Watch for HTTP/2 200.' },
  'DNS':         { cmd: 'dig google.com',                                                 note: 'Look at the ANSWER SECTION — that\'s the A record.' },
  'SSH':         { cmd: 'ssh -v user@hostname',                                           note: 'Use -v to watch the key-exchange handshake.' },
  'Telnet':      { cmd: 'nc -zv towel.blinkenlights.nl 23',                               note: 'Telnet is plaintext and mostly dead — check reachability with netcat instead.' },
  'FTP Control': { cmd: 'ftp ftp.gnu.org',                                                note: 'Anonymous FTP. Type ls once connected.' },
  'FTP Data':    { cmd: 'ftp ftp.gnu.org',                                                note: 'FTP opens port 21 for control and port 20 for data transfer.' },
  'SMTP':        { cmd: 'openssl s_client -connect smtp.gmail.com:587 -starttls smtp',    note: 'Port 587 with STARTTLS. Type QUIT to exit.' },
  'SMTP TLS':    { cmd: 'openssl s_client -connect smtp.gmail.com:587 -starttls smtp',    note: 'SMTP submission with STARTTLS upgrade.' },
  'POP3':        { cmd: 'openssl s_client -connect pop.gmail.com:995',                    note: 'POP3S = POP3 over SSL (port 995).' },
  'IMAP':        { cmd: 'openssl s_client -connect imap.gmail.com:993',                   note: 'IMAPS = IMAP over SSL (port 993).' },
  'NTP':         { cmd: 'sntp time.apple.com',                                            note: 'Get the current time from an NTP server. Offset = local clock drift.' },
  'SNMP':        { cmd: 'snmpwalk -v2c -c public demo.snmplabs.com system',               note: 'Walk the system MIB on a public demo SNMP agent.' },
  'LDAP':        { cmd: 'ldapsearch -x -H ldap://ldap.forumsys.com -b dc=example,dc=com', note: 'Anonymous bind to a public LDAP test server.' },
  'LDAPS':       { cmd: 'openssl s_client -connect ldap.google.com:636',                  note: 'TLS-wrapped LDAP. See the cert chain.' },
  'DHCP Client': { cmd: 'ipconfig getpacket en0',                                         note: 'macOS: decode the DHCP packet your client received (lease, gateway, DNS).' },
  'DHCP Server': { cmd: 'ipconfig getpacket en0',                                         note: 'Shows what the DHCP server handed to your client.' },
  'Kerberos':    { cmd: 'nc -zv kerberos.mit.edu 88',                                     note: 'Check reachability on the canonical Kerberos server.' },
  'RDP':         { cmd: 'nc -zv example.com 3389',                                        note: 'Most hosts block 3389 — "Connection refused" is expected.' },
  'MySQL':       { cmd: 'nc -zv localhost 3306',                                          note: 'Check if a local MySQL/MariaDB server is listening.' },
  'VNC':         { cmd: 'nc -zv localhost 5900',                                          note: 'Check if VNC screen-sharing is listening locally.' },
  'SIP':         { cmd: 'nc -zv -u sip.example.com 5060',                                 note: 'SIP signalling on UDP 5060 — the VoIP handshake.' },
  'SIP TLS':     { cmd: 'openssl s_client -connect sip.example.com:5061',                 note: 'TLS-wrapped SIP — handshake visible.' },
  'SMB':         { cmd: 'nc -zv localhost 445',                                           note: 'SMB file sharing (Windows/macOS File Sharing uses this).' },
  'TFTP':        { cmd: 'tftp 192.168.1.1',                                               note: 'Stateless UDP/69 — often used for router firmware. Interactive prompt.' },
  'Syslog':      { cmd: 'logger -p user.info "hello syslog"',                             note: 'Send a message to your local syslog daemon (UDP/514).' },
  'BGP':         { cmd: 'whois -h whois.radb.net AS15169',                                note: 'Query a BGP routing registry for Google\'s ASN.' },
  'FTPS':        { cmd: 'openssl s_client -connect ftp.example.com:990',                  note: 'FTPS = FTP over implicit SSL/TLS.' },
  'OpenVPN':     { cmd: 'nc -zv -u vpn.example.com 1194',                                 note: 'OpenVPN default is UDP/1194.' },
  'IKE/IPsec':   { cmd: 'nc -zv -u vpn.example.com 500',                                  note: 'IKE phase 1 uses UDP/500. NAT-T uses 4500.' },
  'L2TP':        { cmd: 'nc -zv -u vpn.example.com 1701',                                 note: 'L2TP over UDP/1701 — usually paired with IPsec.' },
  'NFS':         { cmd: 'nc -zv nfs-server.example.com 2049',                             note: 'NFSv4 consolidates everything on port 2049.' },
  'iSCSI':       { cmd: 'nc -zv storage.example.com 3260',                                note: 'Block-level storage over IP. Default target port 3260.' },
  'RADIUS Auth': { cmd: 'nc -zv -u radius.example.com 1812',                              note: 'RADIUS auth over UDP/1812. Accounting is 1813.' },
  'RADIUS Acct': { cmd: 'nc -zv -u radius.example.com 1813',                              note: 'RADIUS accounting — separate port from auth (1812).' },
  'IPsec NAT-T': { cmd: 'nc -zv -u vpn.example.com 4500',                                 note: 'NAT traversal lets IPsec punch through NAT using UDP/4500.' },
  'TACACS+':     { cmd: 'nc -zv tacacs.example.com 49',                                   note: 'Cisco AAA — encrypts the full payload, unlike RADIUS.' }
};

// Topic-level command packs shown inside the Topic Deep Dive panel.
// Keyed by canonical topic name (topicResources key).
const topicCommands = {
  'Network Naming (DNS & DHCP)': [
    { cmd: 'dig google.com',        note: 'Basic A record lookup — the most common DNS query.' },
    { cmd: 'dig AAAA google.com',   note: 'IPv6 (quad-A) record.' },
    { cmd: 'dig MX google.com',     note: 'Mail exchanger records — where SMTP delivers for this domain.' },
    { cmd: 'dig +trace google.com', note: 'Walk the recursive resolution chain live: root → .com → Google.' },
    { cmd: 'nslookup google.com',   note: 'Legacy DNS tool — still on the exam.' }
  ],
  'DNS Records & DNSSEC': [
    { cmd: 'dig +dnssec google.com', note: 'Include DNSSEC RRSIG signatures in the answer.' },
    { cmd: 'dig NS google.com',      note: 'Authoritative nameservers for the zone.' },
    { cmd: 'dig TXT google.com',     note: 'TXT records — SPF, DKIM and DMARC live here.' },
    { cmd: 'dig CNAME www.github.com', note: 'Canonical name alias — follow the redirect chain.' }
  ],
  'Network Troubleshooting & Tools': [
    { cmd: 'ping -c 5 1.1.1.1',             note: 'Basic reachability + round-trip time.' },
    { cmd: 'traceroute -I 8.8.8.8',         note: 'ICMP traceroute — some firewalls block the UDP default.' },
    { cmd: 'ping -c 3 -s 1472 -D 1.1.1.1',  note: 'Don\'t-fragment MTU test: 1472 payload + 28 headers = 1500.' },
    { cmd: 'nslookup google.com 1.1.1.1',   note: 'Force a query through Cloudflare instead of your default resolver.' }
  ],
  'CompTIA Troubleshooting Methodology': [
    { cmd: 'ping google.com',       note: 'Step 3 — tests DNS and routing in one shot.' },
    { cmd: 'ping 8.8.8.8',          note: 'Isolates DNS failure from routing failure.' },
    { cmd: 'traceroute google.com', note: 'Step 3 — where does the path break down?' },
    { cmd: 'route -n get default',  note: 'Step 2 — is the default gateway configured correctly?' }
  ],
  'Routing Protocols': [
    { cmd: 'netstat -rn',                      note: 'Your local routing table.' },
    { cmd: 'traceroute 8.8.8.8',               note: 'Watch every router hop — dynamic routing in action.' },
    { cmd: 'whois -h whois.radb.net AS15169',  note: 'BGP routing registry lookup for Google\'s ASN.' }
  ],
  'NAT & IP Services': [
    { cmd: 'ifconfig en0 | grep "inet "', note: 'Your private IP (RFC1918: 10.x / 172.16-31.x / 192.168.x).' },
    { cmd: 'curl ifconfig.me',            note: 'Your public IP — the one your NAT router translates you to.' },
    { cmd: 'curl -4 ifconfig.co',         note: 'Same, forced IPv4.' }
  ],
  'Port Numbers': [
    { cmd: 'netstat -an | grep LISTEN',   note: 'Every port your machine is listening on.' },
    { cmd: 'lsof -i -P -n | grep LISTEN', note: 'Same listing, plus the process name.' },
    { cmd: 'nmap -sT localhost',          note: 'TCP connect scan on yourself — see what\'s open.' }
  ],
  'Subnetting & IP Addressing': [
    { cmd: 'ifconfig en0',               note: 'See your IP and netmask in one place.' },
    { cmd: 'ipcalc 192.168.1.0/24',      note: 'Subnet calculator. Install with brew install ipcalc if missing.' }
  ],
  'Securing TCP/IP': [
    { cmd: 'openssl s_client -connect google.com:443', note: 'Dump the TLS cert chain from a live HTTPS connection.' },
    { cmd: 'curl -vI https://example.com',              note: 'Verbose curl — watch the TLS handshake inline.' }
  ],
  'IPv6': [
    { cmd: 'ifconfig en0 | grep inet6',  note: 'Your link-local and (maybe) global IPv6 addresses.' },
    { cmd: 'dig AAAA google.com',        note: 'Query IPv6 (AAAA) records.' },
    { cmd: 'ping6 google.com',           note: 'Ping over IPv6. Some macOS versions use ping -6.' }
  ],
  'Network Monitoring & Observability': [
    { cmd: 'netstat -s',  note: 'Protocol-level counters (dropped packets, resets, errors).' },
    { cmd: 'lsof -i',     note: 'Every open network connection on your machine.' }
  ],
  'Switch Features & VLANs': [
    { cmd: 'arp -a',                     note: 'Your ARP cache — L2 neighbour discovery.' },
    { cmd: 'ifconfig en0 | grep ether',  note: 'Your MAC address. First 3 bytes = OUI (vendor ID).' }
  ],
  'Wireless Networking': [
    { cmd: 'networksetup -listallhardwareports', note: 'List all network interfaces including Wi-Fi.' },
    { cmd: 'networksetup -getairportnetwork en0', note: 'Current SSID on the Wi-Fi interface.' }
  ],
  'IPsec & VPN Protocols': [
    { cmd: 'nc -zv -u vpn.example.com 500',  note: 'IKE phase 1 — UDP/500.' },
    { cmd: 'nc -zv -u vpn.example.com 4500', note: 'IPsec NAT-T — UDP/4500.' }
  ],
  'TCP/IP Applications': [
    { cmd: 'curl -I https://example.com',      note: 'HTTP/HTTPS — the textbook application-layer protocol.' },
    { cmd: 'dig google.com',                   note: 'DNS — the app that makes every other app work.' },
    { cmd: 'sntp time.apple.com',              note: 'NTP — the app that keeps every clock on the network in sync.' }
  ]
};

// Guided Terminal Labs (v4.16 / #69) — structured, coached walkthroughs
// a user runs alongside a Claude Code session. Keyed by topic name.
// Multiple topics can share a lab (DNS lab serves both DNS topics, etc.).
const _dnsLab = {
  title: 'DNS Records & Recursive Resolution',
  objective: '1.6',
  duration: '~15 min',
  intro: 'We\'ll walk through DNS record types and the recursive resolution chain using dig. Run each command, read what comes back, and the record types will stop being abstract.',
  steps: [
    { narration: 'Start with a basic lookup. This is the most common DNS query — hostname to IPv4 address.',             cmd: 'dig google.com',            expect: 'An "ANSWER SECTION" containing one or more A records pointing google.com at an IPv4 address.' },
    { narration: 'Now ask for the IPv6 version. AAAA (pronounced "quad-A") is the IPv6 equivalent of an A record.',      cmd: 'dig AAAA google.com',       expect: 'AAAA record(s) in the ANSWER SECTION showing an IPv6 address like 2607:f8b0:...' },
    { narration: 'MX records tell SMTP where to deliver mail for a domain. This is objective 1.6 — DNS record types.',   cmd: 'dig MX google.com',         expect: 'A list of mail exchangers with priority values. Lower priority wins.' },
    { narration: 'NS records list the authoritative nameservers — the servers Google designates as the source of truth for google.com.', cmd: 'dig NS google.com',          expect: 'Four ns*.google.com entries.' },
    { narration: 'TXT records hold arbitrary text. In practice they carry SPF, DKIM, and DMARC records for email security (ties into objective 4.3).', cmd: 'dig TXT google.com',        expect: 'Several TXT entries including one that starts with "v=spf1".' },
    { narration: 'Here\'s the real magic. +trace makes dig walk the full recursive chain live — root (.) → .com → Google\'s authoritative nameservers. This is what happens every time you type a URL into a browser (unless the answer is cached).', cmd: 'dig +trace google.com',     expect: 'A multi-stage walk: 13 root nameservers → .com gTLD nameservers → ns*.google.com → final A record.' },
    { narration: 'Finally, the legacy tool. nslookup is still on the N10-009 exam, so make sure you\'ve seen it at least once.', cmd: 'nslookup google.com',       expect: 'A Non-authoritative answer with an IP address.' }
  ],
  wrap: 'Great — you\'ve now seen every DNS record type the exam will throw at you, and watched recursive resolution happen live. Head back to the app and fire the DNS drill to lock it in.'
};
const _routingLab = {
  title: 'Routing & Your Real Default Gateway',
  objective: '2.2 / 5.1',
  duration: '~15 min',
  intro: 'We\'ll trace how packets actually leave your machine and reach the internet — using YOUR real network, not a textbook diagram. The whole point: hop 1 of every traceroute from your machine is literally the router on your desk.',
  steps: [
    { narration: 'Pull your real default gateway. Write down the gateway IP — that\'s the router your packets hand off to.',                                                 cmd: 'route -n get default',       expect: 'A block of text including "gateway: x.x.x.x" — that\'s the router.' },
    { narration: 'Now look at the full routing table. Find the "default" entry (destination 0.0.0.0 or default). That\'s where packets go when nothing more specific matches.', cmd: 'netstat -rn',                expect: 'A table with destinations, gateways, flags, and interfaces. Look for the "default" row.' },
    { narration: 'ARP cache. Find the row with your gateway\'s IP — you\'ll see its MAC address. L2 adjacency: you reach the gateway by MAC, not IP, because it\'s on the same LAN.', cmd: 'arp -a',                     expect: 'Several lines like "? (192.168.1.1) at aa:bb:cc:... on en0". Your gateway should be one of them.' },
    { narration: 'Traceroute to Google. Every line is a router. Hop 1 = your default gateway. Hops 2-3 = your ISP. Later hops cross the public internet.',                    cmd: 'traceroute 8.8.8.8',         expect: '10-15 hops, each with three RTT measurements. Some hops may show * * * if they filter ICMP.' },
    { narration: 'Ping Google\'s DNS. TTL in the reply tells you roughly how many hops the packet has crossed: starting TTL (usually 64 or 128) minus the TTL you see = hop count.', cmd: 'ping -c 4 8.8.8.8',          expect: 'Four replies with round-trip times and a TTL value (usually around 117 from Google).' },
    { narration: 'Finally, ping your own gateway. TTL should be very close to the starting value (usually 64) — because it\'s 1 hop away.',                                   cmd: 'ping -c 3 $(route -n get default | awk \'/gateway/ {print $2}\')', expect: 'Three replies with sub-millisecond RTT and TTL of ~64. 0% packet loss.' }
  ],
  wrap: 'You\'ve now seen dynamic routing happen on your own network. Head back and drill the Routing Protocols topic.'
};
const _portsLab = {
  title: 'Ports & Listening Services',
  objective: '1.4 / 1.5',
  duration: '~15 min',
  intro: 'We\'ll see real protocols running on real ports — on your own machine and on the internet. This is the lab that makes "port 443 = HTTPS" stop being a flashcard and start being muscle memory.',
  steps: [
    { narration: 'First, see every port your own machine is listening on. Every LISTEN line is a service waiting for connections. Notice IPv4 (tcp4) and IPv6 (tcp6) variants.', cmd: 'netstat -an | grep LISTEN',                      expect: 'A list of local addresses in the form *.port or 127.0.0.1.port with state LISTEN.' },
    { narration: 'Same data, but with process names. Now you can see which app owns each listening port — ControlCenter on 7000, mdnsresponder on 5353, etc.',                  cmd: 'lsof -i -P -n | grep LISTEN',                    expect: 'Rows showing COMMAND, PID, USER, and the address:port with LISTEN.' },
    { narration: 'Now hit a live HTTPS server. Port 443, TLS-wrapped HTTP. The -I flag sends a HEAD request so you only get headers, not the full body.',                       cmd: 'curl -I https://example.com',                    expect: 'HTTP/2 200, a Content-Type line, and several other response headers.' },
    { narration: 'SMTP submission on port 587 with STARTTLS. This is what every modern email client uses to SEND mail. Watch the TLS handshake happen, then type QUIT to exit.', cmd: 'openssl s_client -connect smtp.gmail.com:587 -starttls smtp', expect: 'A cert chain dump, then a "250-smtp.gmail.com at your service" banner, waiting for input.' },
    { narration: 'Netcat scan — quickly check if specific ports are open on a remote host. scanme.nmap.org is nmap\'s official test server (free to scan, permitted by policy).', cmd: 'nc -zv scanme.nmap.org 22 80 443',               expect: 'Three lines indicating "succeeded" or "open" (or "refused" if one is closed).' },
    { narration: 'Full TCP connect scan on yourself. This is what an attacker sees from port scanning — every open listening port on your machine.',                            cmd: 'nmap -sT localhost',                             expect: 'A list of open ports with service names (e.g. 22/tcp ssh, 5353/tcp ...). Install nmap with brew install nmap if missing.' }
  ],
  wrap: 'Now fire the Port Drill mode — you\'ve just seen a bunch of these ports actually DO something, which makes them stick.'
};
const _tlsLab = {
  title: 'TLS Handshake & Secure Protocols',
  objective: '4.3',
  duration: '~15 min',
  intro: 'We\'ll peel back HTTPS and watch the TLS handshake actually happen — cert chain, SNI, cipher suite, the whole thing. This is the lab that turns "PKI" from a textbook acronym into something you\'ve seen with your own eyes.',
  steps: [
    { narration: 'Dump the full certificate chain for Google. You\'ll see the leaf cert, an intermediate CA, and the root — the chain of trust the N10-009 objectives describe. Hit Ctrl+C when you\'re done reading.', cmd: 'openssl s_client -connect google.com:443', expect: 'Several "Certificate chain" entries with subject (s:) and issuer (i:) lines, followed by the full leaf cert in PEM format, then "SSL-Session" details including Protocol (TLSv1.3) and Cipher.' },
    { narration: 'Now do the same thing with SNI — Server Name Indication. SNI lets one IP host many HTTPS sites by telling the server which hostname you want BEFORE the cert is picked. Different servername → potentially different cert.', cmd: 'openssl s_client -connect google.com:443 -servername example.com', expect: 'A different cert chain in the response because the server now selects the cert for example.com (or a default cert if that vhost isn\'t hosted there).' },
    { narration: 'curl with -v shows the TLS handshake inline, without all the openssl noise. Look for the "SSL connection using" line, the "Server certificate" block, and the cipher suite negotiated.', cmd: 'curl -vI https://example.com', expect: 'Verbose output including "ALPN: server accepted h2", "SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384", and cert subject/issuer lines, followed by HTTP/2 200 and response headers.' },
    { narration: 'Check when a cert expires and who issued it — without opening a browser. -dates prints validity window, -issuer shows the CA, -subject shows who the cert is for.', cmd: 'echo | openssl s_client -connect github.com:443 2>/dev/null | openssl x509 -noout -dates -issuer -subject', expect: 'Four lines: notBefore=..., notAfter=..., issuer=..., subject=... — all pulled from the live leaf certificate.' },
    { narration: 'badssl.com intentionally serves broken certs so you can practice recognizing them. Try the expired one — notice how openssl still shows you the handshake output even though a browser would block it.', cmd: 'echo | openssl s_client -connect expired.badssl.com:443 -servername expired.badssl.com 2>&1 | grep -E "verify|notAfter"', expect: 'A "verify error:num=10:certificate has expired" line and a notAfter date in the past. Great confirmation you can spot expired certs on the exam.' },
    { narration: 'Final step — the cipher suite. This is what the exam asks about under "secure protocols". The TLS 1.3 suite below is AES-256 in GCM mode with SHA-384 for the HMAC.', cmd: 'echo | openssl s_client -connect cloudflare.com:443 2>/dev/null | grep -E "Protocol|Cipher"', expect: 'Two lines: "Protocol  : TLSv1.3" and "Cipher    : TLS_AES_256_GCM_SHA384" (or similar).' }
  ],
  wrap: 'You\'ve now seen the TLS handshake, the cert chain, SNI, and cipher negotiation live. Head back and drill Securing TCP/IP and PKI — those topics will feel concrete now.'
};
const _arpLab = {
  title: 'ARP & Layer 2 Adjacency',
  objective: '2.1',
  duration: '~10 min',
  intro: 'ARP is how Layer 3 (IP) actually reaches Layer 2 (MAC). This lab makes the abstract "ARP resolves IP to MAC" sentence concrete by letting you watch your own ARP cache populate and disappear.',
  steps: [
    { narration: 'Your own MAC address. This is the L2 identity of your machine on the local network — 6 bytes, printed as hex. The first 3 bytes are the OUI (Organizationally Unique Identifier) and identify the vendor.', cmd: 'ifconfig en0 | grep ether', expect: 'A line like "ether a4:83:e7:xx:xx:xx". Write the first 3 bytes down — that\'s Apple\'s OUI block.' },
    { narration: 'Look up the OUI online to see the vendor. For Apple it should say "Apple, Inc." — this is how a switch or a network scanner identifies devices without ever resolving their IP.', cmd: 'echo "Paste your OUI at https://www.wireshark.org/tools/oui-lookup.html"', expect: 'The Wireshark lookup tool returns the vendor name for any valid OUI. Apple OUIs start with a4:83:e7, f0:18:98, etc.' },
    { narration: 'Look at the live ARP cache. Every row here is an IP-to-MAC mapping your machine has learned by asking "who has this IP?" and hearing the reply.', cmd: 'arp -a', expect: 'Several rows like "? (192.168.1.1) at aa:bb:cc:dd:ee:ff on en0 ifscope [ethernet]". Your router should be one of them.' },
    { narration: 'Ping a host you\'ve never talked to — any IP on your LAN that isn\'t the gateway. Your machine has to ARP for it BEFORE the ICMP can go out. The first ping is typically slower because of that extra ARP round trip.', cmd: 'ping -c 2 192.168.1.2', expect: 'One or two replies (or timeouts if nothing is at that address). Either way, the ARP request goes out on the wire first.' },
    { narration: 'Check the ARP cache again — the new entry is there now. ARP learned the MAC while trying to deliver your ICMP.', cmd: 'arp -a', expect: 'The same list as before plus (if the host responded) a new row for 192.168.1.2. If nothing responded, you might see "incomplete" or no new row.' },
    { narration: 'Finally, your default gateway\'s MAC. This is the single most important ARP entry on your machine — every packet bound for the public internet is sent to this MAC at Layer 2 first. "You reach the gateway by MAC, not IP" is the single-sentence L2 adjacency rule the exam loves.', cmd: 'arp -n $(route -n get default | awk \'/gateway/ {print $2}\')', expect: 'A single line showing the gateway\'s IP and MAC. This is the handoff point between your LAN and the rest of the world.' }
  ],
  wrap: 'ARP is no longer abstract. Head back and drill Switch Features & VLANs / Cabling & Topology — the L2 questions will make more sense.'
};
const _subnetLab = {
  title: 'Subnetting Your Own Network',
  objective: '1.4',
  duration: '~15 min',
  intro: 'We\'ll subnet YOUR real network instead of a textbook example. You\'ll pull your real IP and mask, compute the network, broadcast, and usable range, and confirm it matches what ipcalc says.',
  steps: [
    { narration: 'Pull your real IPv4 address and netmask. en0 is usually Wi-Fi on macOS; if nothing shows up, try en1 or run "ifconfig" with no args to find the right interface.', cmd: 'ifconfig en0 | grep "inet "', expect: 'A line like "inet 192.168.1.47 netmask 0xffffff00 broadcast 192.168.1.255". That netmask in hex is /24.' },
    { narration: 'Convert the hex mask to CIDR. 0xffffff00 = 255.255.255.0 = /24. 0xffff0000 = 255.255.0.0 = /16. Count the 1 bits in the mask — that\'s your prefix length. This is a classic exam question.', cmd: 'echo "0xffffff00 → 255.255.255.0 → /24  (24 one-bits in the mask)"', expect: 'The printed conversion. Practice this until hex-to-CIDR is instant: ff = 8 bits, so 3x ff = /24, 4x ff = /32.' },
    { narration: 'Now compute network and broadcast by hand using your real IP. For 192.168.1.47/24: network = 192.168.1.0, broadcast = 192.168.1.255, usable = .1 to .254 (2^8 - 2 = 254 hosts). Replace the numbers with YOUR IP.', cmd: 'echo "My IP: 192.168.1.47/24 → network 192.168.1.0, broadcast 192.168.1.255, usable 192.168.1.1-.254 (254 hosts)"', expect: 'Your own subnet math written out. This is exactly the format the exam wants.' },
    { narration: 'Check your work with ipcalc. brew install ipcalc if you don\'t have it. Pass it your real CIDR block — the output should match what you just wrote down.', cmd: 'ipcalc 192.168.1.0/24', expect: 'A colored table showing Address, Netmask, Wildcard, Network, Broadcast, HostMin, HostMax, and Hosts/Net. All fields should match your by-hand calculation.' },
    { narration: 'Now try a harder one. /26 gives you 4 subnets per /24 — each with 62 usable hosts. ipcalc will show you the block boundaries. This is the kind of variable-length mask the exam throws at you.', cmd: 'ipcalc 192.168.1.0/26', expect: 'A smaller block: network 192.168.1.0, broadcast 192.168.1.63, HostMin .1, HostMax .62, 62 hosts total. The next /26 block starts at 192.168.1.64.' },
    { narration: 'Optional IPv6 side. IPv6 doesn\'t do ARP (it uses NDP) and doesn\'t do subnetting the same way — prefixes are almost always /64 for LANs. Check your real IPv6 address.', cmd: 'ifconfig en0 | grep inet6', expect: 'One or more inet6 lines. A link-local address starts with fe80:: and only works on the local segment. A global address is routable on the public IPv6 internet.' }
  ],
  wrap: 'You\'ve now subnetted a real network with your own IP. Head back and grind the Subnetting Trainer — after this lab the drills feel a lot less abstract.'
};
const _monitoringLab = {
  title: 'Network Monitoring with netstat, lsof, and tcpdump',
  objective: '3.2',
  duration: '~15 min',
  intro: 'Monitoring is what happens AFTER you\'ve deployed the network and things start going wrong. This lab walks you through the four tools every ops team lives in: netstat for counters, lsof for connection-to-process mapping, nettop for live rates, and tcpdump for packet-level truth.',
  steps: [
    { narration: 'Protocol counters. netstat -s dumps per-protocol statistics — TCP retransmits, UDP checksum errors, ICMP drops. If a link is flaky, retransmits and errors climb here.', cmd: 'netstat -s | head -40', expect: 'Blocks labeled tcp:, udp:, ip:, icmp: with counters like "packets sent", "retransmitted", "bad checksums". Rising retransmit counts are the #1 sign of a lossy link.' },
    { narration: 'Every active network socket on your machine. This is netstat -an: all (a) connections, numeric (n) addresses — no DNS lookups, so it\'s fast.', cmd: 'netstat -an | head -30', expect: 'A table with Proto, Recv-Q, Send-Q, Local Address, Foreign Address, state. States include LISTEN (waiting), ESTABLISHED (active), TIME_WAIT (recently closed), CLOSE_WAIT (problem).' },
    { narration: 'lsof maps network sockets to processes. Now you can see WHICH app is responsible for each connection — the missing piece netstat doesn\'t give you on macOS.', cmd: 'lsof -i -P -n | head -20', expect: 'Rows with COMMAND (process name), PID, USER, NAME (the local:foreign address). Great for "why is port 5432 open? oh, postgres".' },
    { narration: 'Narrow to a specific port. This answers "who is listening on port 443?" in one command — way faster than grepping netstat.', cmd: 'lsof -i :443', expect: 'Zero or more rows showing processes with an active connection to or from port 443. If nothing prints, nothing on your machine is using 443 right now.' },
    { narration: 'Live throughput by process. nettop is the macOS equivalent of iftop — it shows bytes/sec per process, refreshed every second. Hit q to quit.', cmd: 'nettop -P -L 1', expect: 'A snapshot table with processes and their current bytes_in / bytes_out / packets_in / packets_out. -L 1 = one sample and exit so this doesn\'t hang your terminal.' },
    { narration: 'Finally, packet-level truth. tcpdump captures real packets on the wire. This filter grabs 10 DNS packets (port 53) on any interface. May prompt for sudo.', cmd: 'sudo tcpdump -i any -n -c 10 port 53', expect: 'Ten lines, each one a DNS query or reply: timestamp, source → destination, A? google.com (or similar). This is the ground truth every other tool is approximating.' }
  ],
  wrap: 'You\'ve just seen the four layers of network observability: counters (netstat -s), connection tables (netstat -an / lsof), live rates (nettop), and raw packets (tcpdump). Head back and drill Network Monitoring & Observability.'
};
const _troubleshootingLab = {
  title: 'The 7-Step Troubleshooting Methodology — Live',
  objective: '5.1',
  duration: '~20 min',
  intro: 'This is THE exam topic that gets graded as methodology, not trivia. You\'ll walk through all 7 CompTIA steps against a real (hypothetical) outage: "I can\'t reach google.com." No commands here will break your network permanently — we just query, we don\'t modify.',
  steps: [
    { narration: 'STEP 1 — Identify the problem. Reproduce it with a ping. "I can\'t reach google.com" is vague; "ping google.com returns cannot resolve host" is specific. Always reproduce before theorizing.', cmd: 'ping -c 2 google.com', expect: 'Either four reply lines (no problem) or "cannot resolve google.com: Unknown host" (the reproducible symptom). The exact error message is your starting data.' },
    { narration: 'STEP 2 — Establish a theory of probable cause. If ping by NAME fails, is it DNS or is it the whole network? Test raw IP to eliminate DNS as a variable. 8.8.8.8 is Google\'s public resolver — known-good, never changes.', cmd: 'ping -c 2 8.8.8.8', expect: 'Four reply lines. If THIS works but ping google.com didn\'t, the network is fine and the problem is DNS. If THIS fails too, the problem is upstream (gateway, ISP, airplane mode).' },
    { narration: 'STEP 3 — Test the theory. Ask a specific DNS server directly with nslookup. If Cloudflare\'s 1.1.1.1 can resolve it but your default resolver can\'t, your configured DNS is broken.', cmd: 'nslookup google.com 1.1.1.1', expect: 'A "Non-authoritative answer" block with google.com\'s IP addresses. This confirms DNS works GLOBALLY — the issue is localized to your machine\'s DNS config.' },
    { narration: 'STEP 3 (continued) — Confirm with your CURRENT resolver. No server argument = use whatever is in /etc/resolv.conf or System Settings. If this hangs or errors, your local DNS is the root cause.', cmd: 'nslookup google.com', expect: 'Either the same "Non-authoritative answer" (your DNS is fine, theory rejected, go back to step 2) or a timeout / "connection refused" (theory confirmed, DNS is broken).' },
    { narration: 'STEP 4 — Establish a plan of action. Plan in English BEFORE you type. "I\'ll change the DNS resolver on Wi-Fi to 1.1.1.1, retest, and if it works I\'ll also document why the original resolver failed." Write the plan down. The exam grades this step.', cmd: 'echo "Plan: 1) set DNS to 1.1.1.1  2) retest  3) verify  4) document root cause  5) set DNS back or keep new one"', expect: 'Your plan on screen. Yes, this is trivial — but on the exam "what do you do BEFORE implementing?" the answer is always "establish a plan".' },
    { narration: 'STEP 5 — Implement the solution. networksetup is the macOS way to change DNS from the CLI. Replace "Wi-Fi" with your interface name if different. SKIP this step if the outage is hypothetical — the rest of the lab still works.', cmd: 'networksetup -getdnsservers Wi-Fi', expect: 'Either a list of DNS servers (e.g. 192.168.1.1) or "There aren\'t any DNS Servers set on Wi-Fi." (meaning DHCP is handing them out). We\'re only READING here, not writing — -setdnsservers is the write command.' },
    { narration: 'STEP 6 — Verify full functionality. Retest the original failing command. If it works now, the solution is confirmed. If it doesn\'t, the theory was wrong — loop back to step 2.', cmd: 'ping -c 2 google.com', expect: 'Four reply lines (if the fix worked). This is the end-to-end confirmation the exam asks about — don\'t skip this step even when it feels redundant.' },
    { narration: 'STEP 7 — Document findings. Write down the symptom, root cause, fix, and verification. This is the step everyone skips and the exam ALWAYS tests. 30 seconds of typing saves 30 minutes the next time the same thing happens.', cmd: 'echo "INCIDENT: ping google.com failed → root cause: local DNS misconfig → fix: set resolver to 1.1.1.1 → verified: ping google.com OK → 2026-04-11"', expect: 'One line of incident documentation. In real ops this goes into a ticket, a wiki, or a runbook. On the exam: know that step 7 exists and what it\'s called.' }
  ],
  wrap: 'You\'ve just walked all 7 steps of the CompTIA methodology against a real command sequence. The exam scenario questions are now a template match — find the step in the question, name it, pick the next step. Head back and drill Troubleshooting Methodology.'
};
const guidedLabs = {
  'Network Naming (DNS & DHCP)':         _dnsLab,
  'DNS Records & DNSSEC':                _dnsLab,
  'Routing Protocols':                   _routingLab,
  'Port Numbers':                        _portsLab,
  'TCP/IP Applications':                 _portsLab,
  'Securing TCP/IP':                     _tlsLab,
  'PKI & Certificate Management':        _tlsLab,
  'Switch Features & VLANs':             _arpLab,
  'Cabling & Topology':                  _arpLab,
  'Subnetting & IP Addressing':          _subnetLab,
  'IPv6':                                _subnetLab,
  'Network Monitoring & Observability':  _monitoringLab,
  'Network Operations':                  _monitoringLab,
  'CompTIA Troubleshooting Methodology': _troubleshootingLab,
  'Network Troubleshooting & Tools':     _troubleshootingLab
};

// Copy a command to clipboard with visual feedback on the button.
function copyCmd(event, cmd) {
  event.stopPropagation();
  event.preventDefault();
  navigator.clipboard.writeText(cmd).then(() => {
    const btn = event.currentTarget;
    if (!btn) return;
    const old = btn.textContent;
    btn.textContent = '\u2713';
    btn.classList.add('terminal-card-copied');
    setTimeout(() => {
      btn.textContent = old;
      btn.classList.remove('terminal-card-copied');
    }, 1200);
  }).catch(() => showErrorToast('Copy failed — select the command manually.'));
}

// Render a single terminal-card HTML block for a {cmd, note} object.
function _terminalCardHtml(cmd, note) {
  const safeCmd = escHtml(cmd);
  const cmdAttr = escHtml(cmd).replace(/'/g, '&#39;');
  const noteHtml = note ? `<div class="terminal-card-note">${escHtml(note)}</div>` : '';
  return `<div class="terminal-card">
    <div class="terminal-card-head">
      <span class="terminal-card-prompt">$</span>
      <code class="terminal-card-cmd">${safeCmd}</code>
      <button type="button" class="terminal-card-copy" onclick="copyCmd(event, '${cmdAttr}')" aria-label="Copy command">&#128203;</button>
    </div>
    ${noteHtml}
  </div>`;
}

// ══════════════════════════════════════════
// PORT REFERENCE PANEL (v4.11) — studyable cheatsheet of all 40 ports
// ══════════════════════════════════════════
const portCategories = [
  { name: 'Web',              protos: ['HTTP','HTTPS'] },
  { name: 'Email',            protos: ['SMTP','POP3','IMAP','SMTP TLS'] },
  { name: 'File Transfer',    protos: ['FTP Data','FTP Control','TFTP','FTPS','SMB','NFS','iSCSI'] },
  { name: 'Remote Access',    protos: ['SSH','Telnet','RDP','VNC'] },
  { name: 'Name / Time',      protos: ['DNS','NTP','NetBIOS Name','NetBIOS Session'] },
  { name: 'Network Config',   protos: ['DHCP Server','DHCP Client'] },
  { name: 'Directory & Auth', protos: ['Kerberos','LDAP','LDAPS','TACACS+','RADIUS Auth','RADIUS Acct'] },
  { name: 'Management',       protos: ['SNMP','SNMP Trap','Syslog'] },
  { name: 'Routing',          protos: ['BGP'] },
  { name: 'Database',         protos: ['MySQL'] },
  { name: 'VoIP',             protos: ['SIP','SIP TLS'] },
  { name: 'VPN / Tunneling',  protos: ['IKE/IPsec','L2TP','OpenVPN','IPsec NAT-T'] },
];
let portSortMode = 'category'; // 'category' | 'number' | 'name'

function _portCard(p) {
  // portData is static/controlled — no user input, no escaping needed
  const cmdEntry = portCommands[p.proto];
  const hasCmd = !!cmdEntry;
  const cmdRow = hasCmd ? `<div class="port-ref-cmd">
    <code class="port-ref-cmd-text">${escHtml(cmdEntry.cmd)}</code>
    <button type="button" class="port-ref-cmd-copy" onclick="copyCmd(event, '${escHtml(cmdEntry.cmd).replace(/'/g, '&#39;')}')" aria-label="Copy command">&#128203;</button>
  </div>` : '';
  return `<div class="port-ref-card ${hasCmd ? 'port-ref-card-has-cmd' : ''}" data-proto="${p.proto.toLowerCase()}" data-port="${p.port}">
    <div class="port-ref-card-top">
      <div class="port-ref-num">${p.port}</div>
      <div class="port-ref-meta">
        <div class="port-ref-proto">${p.proto}</div>
        <div class="port-ref-tp">${p.tp}</div>
      </div>
    </div>
    ${cmdRow}
  </div>`;
}

function renderPortReference() {
  const list = document.getElementById('port-ref-list');
  if (!list) return;
  const byProto = {};
  portData.forEach(p => { byProto[p.proto] = p; });
  let html = '';
  if (portSortMode === 'category') {
    portCategories.forEach(cat => {
      const cards = cat.protos.map(name => byProto[name]).filter(Boolean);
      if (!cards.length) return;
      html += `<div class="port-ref-group"><div class="port-ref-group-head">${cat.name} <span class="port-ref-group-count">${cards.length}</span></div><div class="port-ref-group-cards">${cards.map(_portCard).join('')}</div></div>`;
    });
  } else {
    const sorted = portData.slice();
    if (portSortMode === 'number') {
      sorted.sort((a, b) => parseInt(a.port) - parseInt(b.port));
    } else {
      sorted.sort((a, b) => a.proto.localeCompare(b.proto));
    }
    html = `<div class="port-ref-group-cards">${sorted.map(_portCard).join('')}</div>`;
  }
  list.innerHTML = html;
  filterPortReference();
}

function setPortSortMode(mode) {
  portSortMode = (mode === 'number' || mode === 'name') ? mode : 'category';
  ['cat','num','name'].forEach(key => {
    const btn = document.getElementById('port-ref-sort-' + key);
    if (!btn) return;
    const active = (key === 'cat' && portSortMode === 'category')
                || (key === 'num' && portSortMode === 'number')
                || (key === 'name' && portSortMode === 'name');
    btn.classList.toggle('port-ref-sort-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  renderPortReference();
}

function filterPortReference() {
  const input = document.getElementById('port-ref-search');
  const q = (input && input.value || '').trim().toLowerCase();
  const cards = document.querySelectorAll('#port-ref-list .port-ref-card');
  cards.forEach(c => {
    const proto = c.getAttribute('data-proto') || '';
    const port = c.getAttribute('data-port') || '';
    const match = !q || proto.includes(q) || port.includes(q);
    c.classList.toggle('is-hidden', !match);
  });
  // Hide empty category groups
  document.querySelectorAll('#port-ref-list .port-ref-group').forEach(g => {
    const visible = g.querySelectorAll('.port-ref-card:not(.is-hidden)').length;
    g.classList.toggle('is-hidden', !visible);
  });
}

function startPortDrill() {
  document.getElementById('port-pregame').classList.remove('is-hidden');
  document.getElementById('port-game').classList.add('is-hidden');
  document.getElementById('port-results').classList.add('is-hidden');
  document.getElementById('port-timer').textContent = String(PORT_DRILL_SECONDS);
  document.getElementById('port-score').textContent = '0';
  // Re-apply current mode (also loads the correct best value)
  setPortMode(portMode);
  renderPortFocusInfo();
  renderPortReference();
  renderPortTerminalList();
  renderPortLabsList();
}

// v4.16.1 — dedicated "Try It In Terminal" section on Port Drill pregame.
// Reuses portCommands + portCategories to show all curated commands grouped
// by category in a standalone scrollable panel (parallel to Port Reference).
function renderPortTerminalList() {
  const list = document.getElementById('port-terminal-list');
  if (!list) return;
  const byProto = {};
  portData.forEach(p => { byProto[p.proto] = p; });
  let html = '';
  portCategories.forEach(cat => {
    const protosWithCmd = cat.protos.filter(proto => portCommands[proto] && byProto[proto]);
    if (protosWithCmd.length === 0) return;
    html += `<div class="port-term-group">
      <div class="port-term-group-head">${escHtml(cat.name)} <span class="port-term-group-count">${protosWithCmd.length}</span></div>`;
    protosWithCmd.forEach(proto => {
      const p = byProto[proto];
      const cmd = portCommands[proto];
      html += `<div class="port-term-row">
        <div class="port-term-head">
          <span class="port-term-num">${p.port}</span>
          <span class="port-term-proto">${escHtml(p.proto)}</span>
          <span class="port-term-tp">${escHtml(p.tp)}</span>
        </div>
        ${_terminalCardHtml(cmd.cmd, cmd.note)}
      </div>`;
    });
    html += `</div>`;
  });
  list.innerHTML = html;
}

// v4.16.1 — dedicated "Guided Terminal Labs" section on Port Drill pregame.
// Dedupes the guidedLabs map (multiple topic keys → one lab) and renders
// one launcher card per unique lab.
function renderPortLabsList() {
  const list = document.getElementById('port-labs-list');
  if (!list) return;
  // Stable launch keys — use the primary topic alias for each lab so the
  // button passes a predictable topicName to openGuidedLab().
  const primaryKeys = {
    'DNS Records & Recursive Resolution': 'DNS Records & DNSSEC',
    'Routing & Your Real Default Gateway': 'Routing Protocols',
    'Ports & Listening Services': 'Port Numbers',
    'TLS Handshake & Secure Protocols': 'Securing TCP/IP',
    'ARP & Layer 2 Adjacency': 'Switch Features & VLANs',
    'Subnetting Your Own Network': 'Subnetting & IP Addressing',
    'Network Monitoring with netstat, lsof, and tcpdump': 'Network Monitoring & Observability',
    'The 7-Step Troubleshooting Methodology — Live': 'CompTIA Troubleshooting Methodology'
  };
  const seen = new Set();
  const labs = [];
  Object.keys(guidedLabs).forEach(key => {
    const lab = guidedLabs[key];
    if (seen.has(lab.title)) return;
    seen.add(lab.title);
    const launchKey = primaryKeys[lab.title] || key;
    labs.push({ key: launchKey, lab });
  });
  list.innerHTML = labs.map(({ key, lab }) => {
    const keyAttr = escHtml(key).replace(/'/g, '&#39;');
    return `<div class="port-lab-card">
      <div class="port-lab-title">&#128421;&#65039; ${escHtml(lab.title)}</div>
      <div class="port-lab-meta">
        <span class="lab-meta-pill">Obj ${escHtml(lab.objective)}</span>
        <span class="lab-meta-pill">${escHtml(lab.duration)}</span>
        <span class="lab-meta-pill">${lab.steps.length} steps</span>
      </div>
      <p class="port-lab-intro">${escHtml(lab.intro)}</p>
      <button type="button" class="btn btn-primary port-lab-start" onclick="openGuidedLab('${keyAttr}')">&#128421;&#65039; Start Lab</button>
    </div>`;
  }).join('');
}

function beginPortDrill() {
  portScore = 0;
  portTimeLeft = PORT_DRILL_SECONDS;
  portMissed = [];
  document.getElementById('port-pregame').classList.add('is-hidden');
  document.getElementById('port-game').classList.remove('is-hidden');
  document.getElementById('port-results').classList.add('is-hidden');
  const scoreLabelEl = document.querySelector('.port-score-label');
  if (scoreLabelEl) scoreLabelEl.textContent = portMode === 'timed' ? 'SCORE' : 'STREAK';
  document.getElementById('port-score').textContent = '0';
  document.getElementById('port-timer').textContent = String(PORT_DRILL_SECONDS);
  document.getElementById('port-timer').className = 'port-timer';
  // Hide/show timer block per mode
  const timerBlock = document.querySelector('.port-timer-block');
  if (timerBlock) timerBlock.classList.toggle('is-hidden', portMode !== 'timed');
  if (portMode === 'family') {
    nextPortFamilyQ();
  } else if (portMode === 'pairs') {
    nextPortPairsQ();
  } else {
    nextPortQ();
  }
  if (portTimer) { clearInterval(portTimer); portTimer = null; }
  if (portMode === 'timed') {
    portTimer = setInterval(() => {
      portTimeLeft--;
      document.getElementById('port-timer').textContent = portTimeLeft;
      if (portTimeLeft <= 10) document.getElementById('port-timer').className = 'port-timer port-timer-warn';
      if (portTimeLeft <= 5) document.getElementById('port-timer').className = 'port-timer port-timer-danger';
      if (portTimeLeft <= 0) endPortDrill();
    }, 1000);
  }
}

// Categories with ≥2 protocols are eligible for family questions (#27).
// Routing/Database have only 1 each so they're skipped.
function getFamilyEligibleCategories() {
  const byProto = {};
  portData.forEach(p => { byProto[p.proto] = p; });
  return portCategories
    .map(cat => ({ name: cat.name, ports: cat.protos.map(n => byProto[n]).filter(Boolean) }))
    .filter(cat => cat.ports.length >= 2);
}

function nextPortQ() {
  // Pick port question type:
  //   50% "what port runs X?"
  //   50% "what protocol uses port Y?"
  // Family multi-select questions live in their own dedicated mode (#27),
  // not interleaved here.
  // Port selection for single-Q modes is weighted by per-port miss rate (adaptive focus).
  const mode = Math.random() < 0.5 ? 'port' : 'proto';
  const correct = pickWeightedPort();
  portCurrentQ = { mode, correct };
  // Generate 3 wrong options
  const wrongPool = portData.filter(p => p.port !== correct.port);
  const wrongs = [];
  while (wrongs.length < 3) {
    const w = wrongPool[Math.floor(Math.random() * wrongPool.length)];
    if (!wrongs.find(x => (mode === 'port' ? x.port : x.proto) === (mode === 'port' ? w.port : w.proto))) wrongs.push(w);
  }
  const allOpts = [correct, ...wrongs].sort(() => Math.random() - 0.5);
  if (mode === 'port') {
    document.getElementById('port-prompt').innerHTML = 'What port is <strong>' + escHtml(correct.proto) + '</strong>?';
    document.getElementById('port-options').innerHTML = allOpts.map(o =>
      `<button class="port-opt" onclick="pickPort('${o.port}','${correct.port}')">${o.port}/${o.tp}</button>`
    ).join('');
  } else {
    document.getElementById('port-prompt').innerHTML = 'Port <strong>' + correct.port + '/' + correct.tp + '</strong> is for?';
    document.getElementById('port-options').innerHTML = allOpts.map(o =>
      `<button class="port-opt" onclick="pickPort('${escHtml(o.proto)}','${escHtml(correct.proto)}')">${escHtml(o.proto)}</button>`
    ).join('');
  }
}

// Family multi-select question (#27) — "Which N ports are X-related?"
function nextPortFamilyQ() {
  const eligible = getFamilyEligibleCategories();
  if (!eligible.length) { nextPortQ(); return; }
  const cat = eligible[Math.floor(Math.random() * eligible.length)];
  const correctPorts = cat.ports.slice();
  const correctKeys = new Set(correctPorts.map(p => p.proto));
  // Pick 4 distractors from outside this family (or fewer if pool is small)
  const wrongPool = portData.filter(p => !correctKeys.has(p.proto));
  const wrongs = [];
  const distractorCount = Math.min(4, wrongPool.length);
  while (wrongs.length < distractorCount) {
    const w = wrongPool[Math.floor(Math.random() * wrongPool.length)];
    if (!wrongs.find(x => x.proto === w.proto)) wrongs.push(w);
  }
  const allOpts = [...correctPorts, ...wrongs].sort(() => Math.random() - 0.5);
  portCurrentQ = { mode: 'family', categoryName: cat.name, correctKeys, allOptions: allOpts };
  // Varied phrasing — include the count hint to mirror CompTIA style
  const n = correctPorts.length;
  const phrasings = [
    `Select all <strong>${n}</strong> ports used by the <strong>${escHtml(cat.name)}</strong> family`,
    `Which <strong>${n}</strong> ports are <strong>${escHtml(cat.name.toLowerCase())}</strong>-related?`,
    `Pick the <strong>${n}</strong> ports that belong to the <strong>${escHtml(cat.name)}</strong> family`
  ];
  document.getElementById('port-prompt').innerHTML = phrasings[Math.floor(Math.random() * phrasings.length)];
  const optsHtml = allOpts.map(o =>
    `<button class="port-opt port-opt-multi" type="button" data-proto="${escHtml(o.proto)}" aria-pressed="false" onclick="togglePortFamilyPick(this)">${o.port}/${o.tp} <span class="port-opt-proto">${escHtml(o.proto)}</span></button>`
  ).join('');
  document.getElementById('port-options').innerHTML =
    optsHtml +
    `<button class="port-submit-family" type="button" onclick="submitPortFamilyAnswer()">Submit answer</button>`;
}

function togglePortFamilyPick(btn) {
  const selected = btn.classList.toggle('port-opt-selected');
  btn.setAttribute('aria-pressed', String(selected));
}

function submitPortFamilyAnswer() {
  if (!portCurrentQ || portCurrentQ.mode !== 'family') return;
  const { correctKeys, allOptions, categoryName } = portCurrentQ;
  const picked = new Set();
  document.querySelectorAll('#port-options .port-opt-multi.port-opt-selected').forEach(b => {
    picked.add(b.getAttribute('data-proto'));
  });
  // Exact-match scoring: every correct selected, no wrong selected
  let allCorrect = picked.size === correctKeys.size;
  if (allCorrect) {
    for (const k of correctKeys) { if (!picked.has(k)) { allCorrect = false; break; } }
  }
  // Update per-port stats for every option in this question:
  //   correct port & picked → positive; correct port & missed → negative
  //   wrong port & picked → negative; wrong port & not picked → no update
  allOptions.forEach(o => {
    const isCorrect = correctKeys.has(o.proto);
    const wasPicked = picked.has(o.proto);
    if (isCorrect) {
      updatePortStat(o.proto, wasPicked);
    } else if (wasPicked) {
      updatePortStat(o.proto, false);
    }
  });
  if (allCorrect) {
    portScore++;
    document.getElementById('port-score').textContent = portScore;
  } else {
    // Build a single missed-review entry capturing the family attempt
    const correctList = allOptions.filter(o => correctKeys.has(o.proto));
    const yourList = allOptions.filter(o => picked.has(o.proto));
    portMissed.push({
      proto: `${categoryName} family`,
      port: correctList.map(c => c.port).join(', '),
      tp: 'multi',
      yourAnswer: yourList.length ? yourList.map(y => `${y.port}/${escHtml(y.proto)}`).join(', ') : '(nothing selected)',
      mode: 'family'
    });
    document.getElementById('port-prompt').classList.add('port-flash-wrong');
    setTimeout(() => document.getElementById('port-prompt').classList.remove('port-flash-wrong'), 200);
    // Family mode is endless-style: one wrong submission ends the streak.
    // Endless single-Q mode normally never reaches this branch (family Qs only
    // appear in family mode), but keep the guard for safety.
    if (portMode === 'family' || portMode === 'endless') {
      endPortDrill();
      return;
    }
    portTimeLeft = Math.max(0, portTimeLeft - 1);
    document.getElementById('port-timer').textContent = portTimeLeft;
  }
  if (portMode === 'timed' && portTimeLeft <= 0) { endPortDrill(); return; }
  // In family mode, stay on family Qs; otherwise back to single-Q rotation
  if (portMode === 'family') nextPortFamilyQ();
  else nextPortQ();
}

// Secure ↔ insecure pairs question (#30) — dedicated mode.
// Two formats picked at random per question:
//   port-pick:  "<Secure> is the secure version of <Insecure>. Which port does <Secure> use?"
//   proto-pick: "Which protocol replaces <Insecure> (port N) <qualifier>?"
// Both end the streak on a single wrong answer (handled in pickPort).
function nextPortPairsQ() {
  const pair = securePairs[Math.floor(Math.random() * securePairs.length)];
  // 50/50: ask for the port (pickType='port') vs ask for the protocol name (pickType='proto')
  const pickType = Math.random() < 0.5 ? 'port' : 'proto';
  const correct = pair.secure;
  portCurrentQ = { mode: 'pairs', correct, pair };

  // Build distractor pool from securePairs (both insecure and secure sides),
  // dedup by the field we're answering (port number or protocol name), and
  // exclude the correct answer + sibling protocol so duplicates don't appear.
  const distractorPool = [];
  securePairs.forEach(p => {
    distractorPool.push(p.insecure, p.secure);
  });
  const correctKey = pickType === 'port' ? correct.port : correct.proto;
  const siblingExclude = pair.siblingProto || null;
  const seen = new Set();
  const filteredPool = distractorPool.filter(o => {
    const key = pickType === 'port' ? o.port : o.proto;
    if (key === correctKey) return false;
    if (pickType === 'proto' && siblingExclude && o.proto === siblingExclude) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const wrongs = [];
  while (wrongs.length < 3 && filteredPool.length > 0) {
    const idx = Math.floor(Math.random() * filteredPool.length);
    wrongs.push(filteredPool.splice(idx, 1)[0]);
  }
  const allOpts = [correct, ...wrongs].sort(() => Math.random() - 0.5);

  if (pickType === 'port') {
    document.getElementById('port-prompt').innerHTML =
      `<strong>${escHtml(correct.proto)}</strong> is the secure version of <strong>${escHtml(pair.insecure.proto)}</strong>. Which port does ${escHtml(correct.proto)} use?`;
    document.getElementById('port-options').innerHTML = allOpts.map(o =>
      `<button class="port-opt" onclick="pickPort('${o.port}','${correct.port}')">${o.port}/${o.tp}</button>`
    ).join('');
  } else {
    const qual = pair.qualifier ? ` <em>${escHtml(pair.qualifier)}</em>` : '';
    document.getElementById('port-prompt').innerHTML =
      `Which protocol replaces <strong>${escHtml(pair.insecure.proto)}</strong> (port ${pair.insecure.port})${qual}?`;
    document.getElementById('port-options').innerHTML = allOpts.map(o =>
      `<button class="port-opt" onclick="pickPort('${escHtml(o.proto)}','${escHtml(correct.proto)}')">${escHtml(o.proto)}</button>`
    ).join('');
  }
}

function pickPort(chosen, correct) {
  const wasCorrect = (chosen === correct);
  // Record per-port stat for adaptive focus (keyed on proto regardless of mode)
  if (portCurrentQ && portCurrentQ.correct) {
    updatePortStat(portCurrentQ.correct.proto, wasCorrect);
  }
  if (wasCorrect) {
    portScore++;
    document.getElementById('port-score').textContent = portScore;
  } else {
    // Log the miss for review
    if (portCurrentQ) {
      const c = portCurrentQ.correct;
      portMissed.push({ proto: c.proto, port: c.port, tp: c.tp, yourAnswer: chosen, mode: portCurrentQ.mode });
    }
    // Flash red
    document.getElementById('port-prompt').classList.add('port-flash-wrong');
    setTimeout(() => document.getElementById('port-prompt').classList.remove('port-flash-wrong'), 200);
    if (portMode === 'endless' || portMode === 'pairs') {
      // One wrong answer ends an endless / pairs run immediately
      endPortDrill();
      return;
    }
    // Timed mode: lose 1 second penalty
    portTimeLeft = Math.max(0, portTimeLeft - 1);
    document.getElementById('port-timer').textContent = portTimeLeft;
  }
  if (portMode === 'timed' && portTimeLeft <= 0) { endPortDrill(); return; }
  if (portMode === 'pairs') nextPortPairsQ();
  else nextPortQ();
}

function endPortDrill() {
  if (portTimer) { clearInterval(portTimer); portTimer = null; }
  document.getElementById('port-game').classList.add('is-hidden');
  document.getElementById('port-pregame').classList.add('is-hidden');
  document.getElementById('port-results').classList.remove('is-hidden');
  document.getElementById('port-final-score').textContent = portScore;
  // Label the final score per mode
  const finalLabelEl = document.getElementById('port-final-label');
  if (finalLabelEl) {
    finalLabelEl.textContent = portMode === 'family' ? 'family streak'
      : portMode === 'pairs' ? 'pairs streak'
      : portMode === 'endless' ? 'streak length'
      : 'ports matched';
  }
  const bestKey = portMode === 'family' ? STORAGE.PORT_FAMILY_BEST
    : portMode === 'pairs' ? STORAGE.PORT_PAIRS_BEST
    : portMode === 'endless' ? STORAGE.PORT_STREAK_BEST
    : STORAGE.PORT_BEST;
  const best = parseInt(localStorage.getItem(bestKey) || '0');
  if (portScore > best) {
    localStorage.setItem(bestKey, String(portScore));
    document.getElementById('port-best').textContent = portScore;
  }
  // Perfect round milestone (timed mode only): scored as many as the port bank length within the timer
  if (portMode === 'timed' && portMissed.length === 0 && portScore >= 40) {
    unlockMilestone('perfect_port');
  }
  // Endless streak milestone: 25+ without a miss
  if (portMode === 'endless' && portScore >= 25) {
    unlockMilestone('streak_port_25');
  }
  // Render missed answers review
  const reviewDiv = document.getElementById('port-missed-review');
  if (reviewDiv) {
    if (portMissed.length === 0) {
      reviewDiv.innerHTML = '<div class="port-review-perfect">🎯 Perfect round — no wrong answers!</div>';
    } else {
      // Deduplicate by proto (may have missed same port twice). Family entries
      // pre-include the family name in the proto field so they dedupe naturally.
      const seen = new Set();
      const unique = portMissed.filter(m => { if (seen.has(m.proto)) return false; seen.add(m.proto); return true; });
      reviewDiv.innerHTML = '<h3 style="margin-bottom:10px">MISSED PORTS — LEARN THESE</h3>' +
        unique.map(m => {
          // Family-mode entries already contain a comma-separated port list and
          // pre-escaped HTML in yourAnswer; render them without re-escaping.
          if (m.mode === 'family') {
            return `<div class="port-review-row">
              <div class="port-review-proto">${escHtml(m.proto)}</div>
              <div class="port-review-correct">${escHtml(m.port)}</div>
              <div class="port-review-yours">You picked: <span class="port-review-wrong">${m.yourAnswer}</span></div>
            </div>`;
          }
          const yourAns = `You picked: <span class="port-review-wrong">${escHtml(m.yourAnswer)}</span>`;
          return `<div class="port-review-row">
            <div class="port-review-proto">${escHtml(m.proto)}</div>
            <div class="port-review-correct">${m.port}/${m.tp}</div>
            <div class="port-review-yours">${yourAns}</div>
          </div>`;
        }).join('');
    }
  }
}

// ══════════════════════════════════════════
// FEATURE 3: PRE-QUIZ TOPIC BRIEF
// ══════════════════════════════════════════
async function fetchTopicBrief(key, topicName) {
  const tb = document.getElementById('topic-brief');
  const tbt = document.getElementById('topic-brief-text');
  if (!tb || !tbt) return;
  tb.classList.add('is-hidden');
  tbt.innerHTML = '';
  const prompt = `Give a concise study brief for the CompTIA Network+ N10-009 topic: "${topicName}".
Include:
- 3-4 key concepts to know (one line each)
- 2 common exam traps for this topic
- 1 memory trick

Keep it under 120 words. Use plain text, no markdown. Number each section.`;
  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
    });
    if (!res.ok) return;
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    if (text) {
      tbt.innerHTML = escHtml(text).replace(/\n/g, '<br>');
      tb.classList.remove('is-hidden');
    }
  } catch(e) { /* silent fail — brief is a nice-to-have */ }
}

// ══════════════════════════════════════════
// FEATURE 4: PERFORMANCE ANALYTICS DASHBOARD
// ══════════════════════════════════════════
function renderAnalytics() {
  const h = loadHistory();
  const container = document.getElementById('analytics-content');
  if (!container) return;
  if (h.length < 1) {
    container.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:40px 0">Complete at least one quiz to see your analytics.</p>';
    return;
  }

  let html = '';

  // ═══════════════════════════════════════════
  // HERO: Exam Readiness Score + countdown
  // ═══════════════════════════════════════════
  const readiness = getReadinessScore();
  const examDateStr = getExamDate();
  const daysToExam = getDaysToExam();
  const forecast = getReadinessForecast();

  if (readiness) {
    const { predicted, domainAccuracy } = readiness;
    let tier, tierColor, tierBg;
    if (predicted >= 720)      { tier = '🟢 Exam Ready';   tierColor = 'var(--green)';  tierBg = 'rgba(34,197,94,.12)'; }
    else if (predicted >= 650) { tier = '🟠 Getting Close'; tierColor = 'var(--orange)'; tierBg = 'rgba(251,146,60,.12)'; }
    else if (predicted >= 500) { tier = '🟡 Building';     tierColor = 'var(--yellow)'; tierBg = 'rgba(251,191,36,.12)'; }
    else                       { tier = '🔴 Not Ready';    tierColor = 'var(--red)';    tierBg = 'rgba(248,113,113,.12)'; }
    const barPct = Math.max(0, Math.min(100, ((predicted - 420) / 450) * 100));

    let countdown = '';
    if (daysToExam !== null && daysToExam >= 0) {
      const emoji = daysToExam === 0 ? '🔥' : daysToExam <= 7 ? '⏰' : daysToExam <= 30 ? '📅' : '🗓️';
      countdown = `<div class="ana-ready-countdown">${emoji} <strong>${daysToExam}</strong> day${daysToExam === 1 ? '' : 's'} to exam</div>`;
    } else if (daysToExam !== null && daysToExam < 0) {
      countdown = `<div class="ana-ready-countdown">✅ Exam was ${Math.abs(daysToExam)} day${Math.abs(daysToExam) === 1 ? '' : 's'} ago</div>`;
    }

    // Domain bar breakdown
    const domainBars = Object.entries(DOMAIN_WEIGHTS).map(([d, w]) => {
      const pct = Math.round(domainAccuracy[d] || 0);
      const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : pct > 0 ? 'var(--red)' : 'var(--surface3)';
      const label = DOMAIN_LABELS[d];
      return `<div class="ana-domain-row">
        <div class="ana-domain-name">${label}</div>
        <div class="ana-domain-weight">${Math.round(w * 100)}%</div>
        <div class="ana-domain-bar"><div class="ana-domain-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="ana-domain-pct" style="color:${color}">${pct > 0 ? pct + '%' : '—'}</div>
      </div>`;
    }).join('');

    html += `<div class="ana-card ana-ready-hero">
      <div class="ana-ready-top">
        <div>
          <h3 style="margin:0">EXAM READINESS</h3>
          <div class="ana-subtitle">CompTIA-domain-weighted · 720 = pass</div>
        </div>
        <div class="ana-ready-num" style="color:${tierColor}">${predicted}</div>
      </div>
      <div class="ana-ready-badge" style="background:${tierBg};color:${tierColor}">${tier}</div>
      <div class="ana-ready-bar"><div class="ana-ready-bar-fill" style="width:${barPct}%;background:${tierColor}"></div></div>
      ${countdown}
      <div class="ana-domain-breakdown">
        <div class="ana-domain-header">CompTIA domain breakdown</div>
        ${domainBars}
      </div>
      <div class="ana-exam-date-row">
        <label for="ana-exam-date-input" class="ana-exam-date-lbl">🎯 Your exam date:</label>
        <button type="button" class="ana-exam-date-btn" onclick="document.getElementById('ana-exam-date-input').showPicker && document.getElementById('ana-exam-date-input').showPicker()" aria-label="Open date picker">
          <span class="ana-exam-date-display">${examDateStr ? new Date(examDateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pick a date'}</span>
          <span class="ana-exam-date-icon">📅</span>
          <input type="date" id="ana-exam-date-input" value="${examDateStr || ''}" onchange="updateExamDate(this.value)" aria-label="Set your exam date">
        </button>
        ${examDateStr ? '<button class="ana-exam-date-clear" onclick="updateExamDate(\'\')" aria-label="Clear exam date">Clear</button>' : ''}
      </div>
    </div>`;
  }

  // 1. Accuracy Trend (last 20 sessions)
  const recent = h.slice(0, 20).reverse();
  html += `<div class="ana-card">
    <h3>ACCURACY TREND</h3>
    <div class="ana-subtitle">Last ${recent.length} sessions</div>
    <div class="ana-chart">
      <div class="ana-chart-line" style="bottom:80%"><span class="ana-chart-lbl">80%</span></div>
      <div class="ana-chart-line" style="bottom:60%"><span class="ana-chart-lbl">60%</span></div>
      <div class="ana-chart-bars">
        ${recent.map((e, i) => {
          const color = e.pct >= 80 ? 'var(--green)' : e.pct >= 60 ? 'var(--yellow)' : 'var(--red)';
          const day = new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          return `<div class="ana-bar-wrap">
            <div class="ana-bar" style="height:${e.pct}%;background:${color};animation-delay:${i * 0.05}s">
              <div class="ana-bar-tip"><strong>${e.pct}%</strong><span>${day}</span></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="ana-avg">Average: <strong>${Math.round(h.reduce((a,e)=>a+e.pct,0)/h.length)}%</strong></div>
  </div>`;

  // 2. Difficulty Breakdown
  const diffs = {};
  h.forEach(e => {
    const d = e.difficulty || e.diff || DEFAULT_DIFF;
    if (!diffs[d]) diffs[d] = { correct: 0, total: 0 };
    diffs[d].correct += e.score;
    diffs[d].total += e.total;
  });
  html += `<div class="ana-card">
    <h3>DIFFICULTY BREAKDOWN</h3>
    <div class="ana-diff-grid">
      ${Object.entries(diffs).map(([d, v], idx) => {
        const pct = v.total > 0 ? Math.round(v.correct / v.total * 100) : 0;
        const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : 'var(--red)';
        return `<div class="ana-diff-item">
          <div class="ana-diff-name">${escHtml(d)}</div>
          <div class="ana-diff-bar"><div class="ana-diff-fill" style="width:${pct}%;background:${color};animation-delay:${idx * 0.15}s"></div></div>
          <div class="ana-diff-pct" style="color:${color}">${pct}%</div>
          <div class="ana-diff-count">${v.correct}/${v.total} correct</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // 3. Topic Mastery with Trends
  const topicStats = {};
  h.forEach(e => {
    if (!topicStats[e.topic]) topicStats[e.topic] = [];
    topicStats[e.topic].push(e.pct);
  });
  const topicArr = Object.entries(topicStats).map(([t, pcts]) => {
    const avg = Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length);
    const trend = pcts.length >= 2 ? pcts[0] - pcts[pcts.length - 1] : 0; // recent - oldest (reversed order in h)
    return { topic: t, avg, trend, sessions: pcts.length };
  }).sort((a,b) => a.avg - b.avg);
  html += `<div class="ana-card">
    <h3>TOPIC MASTERY</h3>
    <div class="ana-subtitle">${topicArr.length} topics studied</div>
    <div class="ana-topics">
      ${topicArr.map((t, idx) => {
        const color = t.avg >= 80 ? 'var(--green)' : t.avg >= 60 ? 'var(--yellow)' : 'var(--red)';
        const trendIcon = t.trend > 5 ? '\u2191' : t.trend < -5 ? '\u2193' : '\u2192';
        const trendColor = t.trend > 5 ? 'var(--green)' : t.trend < -5 ? 'var(--red)' : 'var(--text-dim)';
        const safeT = escHtml(t.topic).replace(/'/g, "\\'");
        return `<div class="ana-topic-row ana-row-clickable" onclick="drillTopic('${safeT}')" title="Jump to this topic on the setup page">
          <div class="ana-topic-name">${escHtml(t.topic)}</div>
          <div class="ana-topic-bar"><div class="ana-topic-fill" style="width:${t.avg}%;background:${color};animation-delay:${idx * 0.06}s"></div></div>
          <div class="ana-topic-pct" style="color:${color}">${t.avg}%</div>
          <div class="ana-topic-trend" style="color:${trendColor}" title="Trend">${trendIcon}</div>
          <div class="ana-topic-sessions">${t.sessions}x</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // 4. Study Activity Calendar (last 30 days) — tracks questions answered, not sessions
  const today = new Date();
  const dayMap = {};
  h.forEach(e => {
    const d = new Date(e.date).toISOString().slice(0,10);
    dayMap[d] = (dayMap[d] || 0) + (e.total || 0);
  });
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    days.push({ date: key, count: dayMap[key] || 0, day: d.toLocaleDateString('en-US',{weekday:'short'}).charAt(0), num: d.getDate() });
  }
  const maxCount = Math.max(...days.map(d => d.count), 1);
  const totalQ30 = days.reduce((a, d) => a + d.count, 0);
  html += `<div class="ana-card">
    <h3>STUDY ACTIVITY</h3>
    <div class="ana-subtitle">Last 30 days \u2014 ${totalQ30} questions answered</div>
    <div class="ana-calendar">
      ${days.map((d, idx) => {
        const intensity = d.count > 0 ? Math.max(0.2, d.count / maxCount) : 0;
        const bg = d.count > 0 ? `rgba(var(--accent-rgb),${intensity})` : 'var(--surface3)';
        const activeClass = d.count > 0 ? ' cal-active' : '';
        const hotClass = d.count === maxCount && d.count > 0 ? ' cal-hot' : '';
        return `<div class="ana-cal-day${activeClass}${hotClass}" style="background:${bg};animation-delay:${idx * 0.02}s" data-count="${d.count}">
          <span class="ana-cal-num">${d.num}</span>
          ${d.count > 0 ? `<span class="cal-tip">${d.count} Q's</span>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="ana-cal-legend">
      <span>Less</span>
      <div class="ana-cal-day-sm" style="background:var(--surface3)"></div>
      <div class="ana-cal-day-sm" style="background:rgba(var(--accent-rgb),.2)"></div>
      <div class="ana-cal-day-sm" style="background:rgba(var(--accent-rgb),.5)"></div>
      <div class="ana-cal-day-sm" style="background:rgba(var(--accent-rgb),.8)"></div>
      <div class="ana-cal-day-sm" style="background:rgba(var(--accent-rgb),1)"></div>
      <span>More</span>
    </div>
  </div>`;

  // 5. Exam Score History
  const exams = h.filter(e => e.mode === 'exam');
  if (exams.length > 0) {
    html += `<div class="ana-card">
      <h3>EXAM SCORE HISTORY</h3>
      <div class="ana-exams">
        ${exams.map(e => {
          const scaled = Math.round(100 + (e.score / e.total) * 800);
          const pass = scaled >= 720;
          const date = new Date(e.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'});
          return `<div class="ana-exam-row">
            <div class="ana-exam-score" style="color:${pass ? 'var(--green)' : 'var(--red)'}">${scaled}</div>
            <div class="ana-exam-badge" style="background:${pass ? 'rgba(var(--green-rgb),.1)' : 'rgba(var(--red-rgb),.1)'};color:${pass ? 'var(--green)' : 'var(--red)'}">${pass ? 'PASS' : 'FAIL'}</div>
            <div class="ana-exam-details">${e.score}/${e.total} correct (${e.pct}%)</div>
            <div class="ana-exam-date">${date}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  // 6. Priority Study Areas
  const weak = topicArr.filter(t => t.avg < 70).slice(0, 5);
  if (weak.length > 0) {
    html += `<div class="ana-card ana-priority">
      <h3>\u26a0\ufe0f PRIORITY STUDY AREAS</h3>
      <div class="ana-subtitle">Topics below 70% accuracy</div>
      <div class="ana-priority-list">
        ${weak.map((t, i) => {
          const safeT = escHtml(t.topic).replace(/'/g, "\\'");
          return `<div class="ana-priority-item ana-row-clickable" onclick="drillTopic('${safeT}')" title="Jump to this topic on the setup page">
            <span class="ana-priority-rank">${i+1}</span>
            <span class="ana-priority-name">${escHtml(t.topic)}</span>
            <span class="ana-priority-pct" style="color:${t.avg >= 60 ? 'var(--yellow)' : 'var(--red)'}">${t.avg}%</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  // 7. Weekly Volume Chart — questions answered per week
  const weeks = [0,0,0,0];
  const weekLabels = ['This Week','Last Week','2 Weeks Ago','3 Weeks Ago'];
  h.forEach(e => {
    const daysAgo = Math.floor((today - new Date(e.date)) / 86400000);
    const weekIdx = Math.floor(daysAgo / 7);
    if (weekIdx < 4) weeks[weekIdx] += (e.total || 0);
  });
  const maxWeek = Math.max(...weeks, 1);
  html += `<div class="ana-card">
    <h3>WEEKLY VOLUME</h3>
    <div class="ana-subtitle">Questions answered per week</div>
    <div class="ana-weekly">
      ${weeks.map((w, i) => `<div class="ana-week-row">
        <span class="ana-week-label">${weekLabels[i]}</span>
        <div class="ana-week-bar"><div class="ana-week-fill" style="width:${(w/maxWeek)*100}%"></div></div>
        <span class="ana-week-count">${w}</span>
      </div>`).join('')}
    </div>
  </div>`;

  // 8. Summary Stats
  const totalQ = h.reduce((a,e) => a + e.total, 0);
  const totalCorrect = h.reduce((a,e) => a + e.score, 0);
  const studyDays = new Set(h.map(e => new Date(e.date).toISOString().slice(0,10))).size;
  html += `<div class="ana-card">
    <h3>ALL-TIME STATS</h3>
    <div class="ana-alltime">
      <div class="ana-stat"><div class="ana-stat-val">${h.length}</div><div class="ana-stat-lbl">Sessions</div></div>
      <div class="ana-stat"><div class="ana-stat-val">${totalQ.toLocaleString()}</div><div class="ana-stat-lbl">Questions</div></div>
      <div class="ana-stat"><div class="ana-stat-val">${totalQ > 0 ? Math.round(totalCorrect/totalQ*100) : 0}%</div><div class="ana-stat-lbl">Overall Accuracy</div></div>
      <div class="ana-stat"><div class="ana-stat-val">${studyDays}</div><div class="ana-stat-lbl">Study Days</div></div>
    </div>
  </div>`;

  // ═══════════════════════════════════════════
  // 9. Streak tracker — consecutive study days
  // ═══════════════════════════════════════════
  const streak = getStreakData();
  const flameIcon = streak.currentStreak > 0 ? '🔥' : '💤';
  const streakMsg = streak.currentStreak === 0
    ? 'Study today to start a new streak'
    : streak.currentStreak === 1 ? 'First day — keep it going tomorrow!'
    : `${streak.currentStreak} days in a row`;
  html += `<div class="ana-card">
    <h3>STUDY STREAK</h3>
    <div class="ana-streak-grid">
      <div class="ana-streak-big">
        <div class="ana-streak-flame">${flameIcon}</div>
        <div class="ana-streak-num">${streak.currentStreak}</div>
        <div class="ana-streak-lbl">Current streak</div>
      </div>
      <div class="ana-streak-info">
        <div class="ana-streak-msg">${streakMsg}</div>
        <div class="ana-streak-stat"><strong>${streak.longestStreak}</strong> day longest streak</div>
        ${streak.lastStudyDate ? `<div class="ana-streak-stat ana-streak-last">Last study: ${new Date(streak.lastStudyDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>` : ''}
      </div>
    </div>
  </div>`;

  // ═══════════════════════════════════════════
  // 11. Subtopic weak spots (wrong-bank keyword mining)
  // ═══════════════════════════════════════════
  const weakSpots = mineSubtopicWeakSpots(8);
  if (weakSpots.length > 0) {
    const maxCount = weakSpots[0].count;
    html += `<div class="ana-card">
      <h3>SUBTOPIC WEAK SPOTS</h3>
      <div class="ana-subtitle">Keywords appearing most in your wrong bank</div>
      <div class="ana-weak-list">
        ${weakSpots.map(w => `<div class="ana-weak-row">
          <div class="ana-weak-kw">${escHtml(w.keyword)}</div>
          <div class="ana-weak-bar"><div class="ana-weak-fill" style="width:${(w.count / maxCount) * 100}%"></div></div>
          <div class="ana-weak-count">${w.count}x</div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  // ═══════════════════════════════════════════
  // 12. Difficulty × Topic heatmap (where are the real leaks)
  // ═══════════════════════════════════════════
  const diffTopic = {}; // { topic: { Foundational: {c,t}, 'Exam Level': {c,t}, ... } }
  const diffLevels = new Set();
  h.forEach(e => {
    if (!e.topic || e.topic === MIXED_TOPIC || e.topic === EXAM_TOPIC) return;
    const d = e.difficulty || e.diff || 'Unknown';
    diffLevels.add(d);
    if (!diffTopic[e.topic]) diffTopic[e.topic] = {};
    if (!diffTopic[e.topic][d]) diffTopic[e.topic][d] = { c: 0, t: 0 };
    diffTopic[e.topic][d].c += e.score;
    diffTopic[e.topic][d].t += e.total;
  });
  const diffLevelArr = ['Foundational', 'Exam Level', 'Hard / Tricky', 'Mixed'].filter(d => diffLevels.has(d));
  const heatTopics = Object.keys(diffTopic).sort();
  if (heatTopics.length > 0 && diffLevelArr.length > 0) {
    html += `<div class="ana-card">
      <h3>DIFFICULTY × TOPIC HEATMAP</h3>
      <div class="ana-subtitle">Find where strong topics break down at harder difficulty</div>
      <div class="ana-heatmap">
        <div class="ana-heat-head">
          <div class="ana-heat-h-topic">Topic</div>
          ${diffLevelArr.map(d => `<div class="ana-heat-h-diff">${d.replace(' / Tricky', '')}</div>`).join('')}
        </div>
        ${heatTopics.map(t => {
          return `<div class="ana-heat-row">
            <div class="ana-heat-topic">${escHtml(t)}</div>
            ${diffLevelArr.map(d => {
              const v = diffTopic[t][d];
              if (!v || v.t === 0) return `<div class="ana-heat-cell ana-heat-empty">—</div>`;
              const pct = Math.round((v.c / v.t) * 100);
              const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : 'var(--red)';
              return `<div class="ana-heat-cell" style="color:${color};background:${color.replace('var(','rgba(').replace(')', ', 0.12)')}" title="${v.c}/${v.t} correct">${pct}%</div>`;
            }).join('')}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  // ═══════════════════════════════════════════
  // 13. MCQ vs PBQ performance breakdown
  // ═══════════════════════════════════════════
  const typeStats = getTypeStats();
  const typeEntries = Object.entries(typeStats).filter(([, v]) => v.seen > 0);
  if (typeEntries.length > 0) {
    const typeLabels = { 'mcq': 'MCQ', 'multi-select': 'Multi-select', 'order': 'Order / Sequence', 'topology': 'Topology PBQ', 'cli-sim': 'CLI Simulation' };
    typeEntries.sort((a, b) => b[1].seen - a[1].seen);
    html += `<div class="ana-card">
      <h3>QUESTION TYPE BREAKDOWN</h3>
      <div class="ana-subtitle">Accuracy by MCQ vs performance-based question types</div>
      <div class="ana-type-list">
        ${typeEntries.map(([t, v]) => {
          const pct = Math.round((v.correct / v.seen) * 100);
          const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : 'var(--red)';
          const label = typeLabels[t] || t;
          return `<div class="ana-type-row">
            <div class="ana-type-name">${escHtml(label)}</div>
            <div class="ana-type-bar"><div class="ana-type-fill" style="width:${pct}%;background:${color}"></div></div>
            <div class="ana-type-pct" style="color:${color}">${pct}%</div>
            <div class="ana-type-count">${v.correct}/${v.seen}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  // ═══════════════════════════════════════════
  // 14. Exam-mode vs Quiz-mode comparison
  // ═══════════════════════════════════════════
  const quizEntries = h.filter(e => e.mode !== 'exam' && e.topic !== MIXED_TOPIC && e.topic !== EXAM_TOPIC);
  const examEntries = h.filter(e => e.mode === 'exam');
  if (quizEntries.length >= 2 && examEntries.length >= 1) {
    const quizAvg = Math.round(quizEntries.reduce((a, e) => a + e.pct, 0) / quizEntries.length);
    const examAvg = Math.round(examEntries.reduce((a, e) => a + e.pct, 0) / examEntries.length);
    const delta = quizAvg - examAvg;
    let insight, insightColor;
    if (Math.abs(delta) <= 3)      { insight = 'Consistent performance across modes — good sign.'; insightColor = 'var(--green)'; }
    else if (delta > 3)            { insight = `Quiz avg beats exam avg by ${delta} points — timed pressure is costing you. Practice more exam simulations.`; insightColor = 'var(--yellow)'; }
    else                           { insight = `Exam avg beats quiz avg by ${Math.abs(delta)} points — you rise to the occasion.`; insightColor = 'var(--green)'; }
    html += `<div class="ana-card">
      <h3>EXAM vs QUIZ MODE</h3>
      <div class="ana-subtitle">Does timed pressure hurt your performance?</div>
      <div class="ana-mode-compare">
        <div class="ana-mode-item">
          <div class="ana-mode-val" style="color:var(--accent-light)">${quizAvg}%</div>
          <div class="ana-mode-lbl">Quiz avg</div>
          <div class="ana-mode-n">${quizEntries.length} sessions</div>
        </div>
        <div class="ana-mode-divider">vs</div>
        <div class="ana-mode-item">
          <div class="ana-mode-val" style="color:var(--accent-light)">${examAvg}%</div>
          <div class="ana-mode-lbl">Exam avg</div>
          <div class="ana-mode-n">${examEntries.length} sessions</div>
        </div>
      </div>
      <div class="ana-mode-insight" style="color:${insightColor}">${insight}</div>
    </div>`;
  }

  // ═══════════════════════════════════════════
  // 15. Drill integration — Port Drill + Subnet Drill stats
  // ═══════════════════════════════════════════
  const portSummary = (typeof getPortStatsSummary === 'function') ? getPortStatsSummary() : null;
  const portBest = parseInt(localStorage.getItem(STORAGE.PORT_BEST) || '0');
  const portStreakBest = parseInt(localStorage.getItem(STORAGE.PORT_STREAK_BEST) || '0');
  const subnetStatsData = getSubnetStats();
  const hasPort = portSummary && portSummary.totalSeen > 0;
  const hasSubnet = subnetStatsData.seen > 0;
  if (hasPort || hasSubnet || portBest > 0 || portStreakBest > 0) {
    html += `<div class="ana-card">
      <h3>PRACTICE DRILLS</h3>
      <div class="ana-subtitle">Port Drill and Subnet Drill progress</div>
      <div class="ana-drills-grid">`;
    if (hasPort || portBest > 0 || portStreakBest > 0) {
      const accPct = hasPort ? Math.round(portSummary.overallAccuracy * 100) : 0;
      const accColor = accPct >= 80 ? 'var(--green)' : accPct >= 60 ? 'var(--yellow)' : 'var(--red)';
      html += `<div class="ana-drill-card">
        <div class="ana-drill-title">🔌 Port Drill</div>
        <div class="ana-drill-stats">
          <div class="ana-drill-stat"><div class="ana-drill-val">${portBest}</div><div class="ana-drill-lbl">Timed best</div></div>
          <div class="ana-drill-stat"><div class="ana-drill-val">${portStreakBest}</div><div class="ana-drill-lbl">Endless streak</div></div>
          <div class="ana-drill-stat"><div class="ana-drill-val" style="color:${accColor}">${accPct}%</div><div class="ana-drill-lbl">Accuracy</div></div>
          <div class="ana-drill-stat"><div class="ana-drill-val">${hasPort ? portSummary.uniqueSeen : 0}/${hasPort ? portSummary.totalPorts : 40}</div><div class="ana-drill-lbl">Ports seen</div></div>
        </div>
      </div>`;
    }
    if (hasSubnet) {
      const subnetPct = Math.round((subnetStatsData.correct / subnetStatsData.seen) * 100);
      const subColor = subnetPct >= 80 ? 'var(--green)' : subnetPct >= 60 ? 'var(--yellow)' : 'var(--red)';
      html += `<div class="ana-drill-card">
        <div class="ana-drill-title">🧮 Subnet Drill</div>
        <div class="ana-drill-stats">
          <div class="ana-drill-stat"><div class="ana-drill-val" style="color:${subColor}">${subnetPct}%</div><div class="ana-drill-lbl">Accuracy</div></div>
          <div class="ana-drill-stat"><div class="ana-drill-val">${subnetStatsData.correct}</div><div class="ana-drill-lbl">Correct</div></div>
          <div class="ana-drill-stat"><div class="ana-drill-val">${subnetStatsData.seen}</div><div class="ana-drill-lbl">Attempts</div></div>
        </div>
      </div>`;
    }
    html += `</div></div>`;
  }

  // ═══════════════════════════════════════════
  // 16. Milestones / achievements
  // ═══════════════════════════════════════════
  evaluateMilestones(); // unlock any newly-earned milestones on render
  const unlockedMap = getMilestones();
  const totalMilestones = MILESTONE_DEFS.length;
  const unlockedCount = MILESTONE_DEFS.filter(m => unlockedMap[m.id]).length;
  html += `<div class="ana-card">
    <h3>MILESTONES</h3>
    <div class="ana-subtitle">${unlockedCount}/${totalMilestones} unlocked</div>
    <div class="ana-milestones">
      ${MILESTONE_DEFS.map(m => {
        const unlocked = !!unlockedMap[m.id];
        return `<div class="ana-milestone ${unlocked ? 'ana-milestone-on' : 'ana-milestone-off'}" title="${escHtml(m.desc)}">
          <div class="ana-milestone-icon">${m.icon}</div>
          <div class="ana-milestone-label">${escHtml(m.label)}</div>
          <div class="ana-milestone-desc">${escHtml(m.desc)}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  container.innerHTML = html;
}

// Wired to the exam date input on the analytics page
function updateExamDate(value) {
  setExamDate(value);
  renderAnalytics(); // re-render so forecast/countdown update
  renderReadinessCard(); // setup-page card may be affected by coverage/recency thresholds
}

// ══════════════════════════════════════════
// UTIL
// ══════════════════════════════════════════
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
