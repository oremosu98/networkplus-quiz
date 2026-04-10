// ══════════════════════════════════════════
// Network+ AI Quiz — app.js  v4.13
// ══════════════════════════════════════════

// ── CONSTANTS ──
const APP_VERSION = '4.13';
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
  { id: 'hardcore_pass',    label: 'Hardcore pass',       desc: 'Score 720+ on a Hardcore exam simulation', icon: '🔥' }
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
  `;
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

let portTimer = null, portTimeLeft = PORT_DRILL_SECONDS, portScore = 0, portCurrentQ = null;
let portMissed = []; // Track wrong answers for review
let portMode = 'timed'; // 'timed' (30s countdown) or 'endless' (no timer, one wrong ends run)

function setPortMode(mode) {
  if (mode === 'endless') portMode = 'endless';
  else if (mode === 'family') portMode = 'family';
  else portMode = 'timed';
  // Update toggle button visuals
  const timedBtn = document.getElementById('port-mode-timed');
  const endlessBtn = document.getElementById('port-mode-endless');
  const familyBtn = document.getElementById('port-mode-family');
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
  // Swap pregame description + best label
  const descEl = document.getElementById('port-mode-desc');
  const bestLabelEl = document.getElementById('port-best-label');
  const bestValEl = document.getElementById('port-best');
  if (descEl) {
    if (portMode === 'family') {
      descEl.textContent = 'No timer. Each question asks you to select every port in a protocol family — one wrong submission ends the streak.';
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
  return `<div class="port-ref-card" data-proto="${p.proto.toLowerCase()}" data-port="${p.port}">
    <div class="port-ref-num">${p.port}</div>
    <div class="port-ref-meta">
      <div class="port-ref-proto">${p.proto}</div>
      <div class="port-ref-tp">${p.tp}</div>
    </div>
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
    if (portMode === 'endless') {
      // One wrong answer ends an endless run immediately
      endPortDrill();
      return;
    }
    // Timed mode: lose 1 second penalty
    portTimeLeft = Math.max(0, portTimeLeft - 1);
    document.getElementById('port-timer').textContent = portTimeLeft;
  }
  if (portMode === 'timed' && portTimeLeft <= 0) { endPortDrill(); return; }
  nextPortQ();
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
      : portMode === 'endless' ? 'streak length'
      : 'ports matched';
  }
  const bestKey = portMode === 'family' ? STORAGE.PORT_FAMILY_BEST
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
