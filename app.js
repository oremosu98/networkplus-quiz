// ══════════════════════════════════════════
// Network+ AI Quiz — app.js  v3.5
// ══════════════════════════════════════════

// ── CONSTANTS ──
const APP_VERSION = '3.5';
const EXAM_TIME_SECONDS = 5400;     // 90 minutes
const HISTORY_CAP = 200;
const WRONG_BANK_CAP = 200;
const REPORTS_CAP = 500;
const PORT_DRILL_SECONDS = 30;
const SESSION_TOPICS = 3;
const SESSION_QUESTIONS = 7;

// ── STATE ──
let questions  = [];
let current    = 0;
let score      = 0;
let streak     = 0;
let bestStreak = 0;
let answered   = 0;
let log        = [];
let quizFlags  = [];
let topic           = 'Mixed \u2014 All Topics';
let activeQuizTopic = 'Mixed \u2014 All Topics';
let diff       = 'Exam Level';
let qCount     = 10;
let apiKey     = '';
let wrongDrillMode = false;

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
  return localStorage.getItem('nplus_theme') || 'dark';
}

function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('nplus_theme', t);
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
// BOOT
// ══════════════════════════════════════════
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

window.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  setTheme(getTheme());

  const saved = localStorage.getItem('nplus_key');
  if (saved) document.getElementById('api-key').value = saved;

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
});

function initChips(groupId, cb) {
  const g = document.getElementById(groupId);
  g.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      g.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      cb(c.dataset.v);
    });
  });
}

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  window.scrollTo(0, 0);
}

function goSetup() {
  if (examTimer) { clearInterval(examTimer); examTimer = null; }
  if (portTimer) { clearInterval(portTimer); portTimer = null; }
  examMode = false;
  wrongDrillMode = false;
  navOpen = false;
  renderHistoryPanel();
  renderStatsCard();
  renderWeakBanner();
  renderStreakBadge();
  renderReadinessCard();
  renderSessionBanner();
  renderWrongBankBtn();
  showPage('setup');
}

function confirmBack() {
  if (confirm('Go back to the menu? Quiz progress will be lost.')) goSetup();
}

// ══════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('nplus_history') || '[]'); } catch(e) { return []; }
}
function saveToHistory(entry) {
  const h = loadHistory();
  h.unshift(entry);
  if (h.length > HISTORY_CAP) h.length = HISTORY_CAP;
  localStorage.setItem('nplus_history', JSON.stringify(h));
}

function renderHistoryPanel() {
  const h = loadHistory();
  const panel = document.getElementById('history-panel');
  const list  = document.getElementById('history-list');
  if (h.length === 0) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  list.innerHTML = h.slice(0,8).map(e => {
    const date = new Date(e.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    const color = e.pct >= 80 ? '#22c55e' : e.pct >= 60 ? '#fbbf24' : '#f87171';
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
function renderStatsCard() {
  const stats = getStudyStats();
  const card  = document.getElementById('stats-card');
  const grid  = document.getElementById('stats-grid');
  if (!stats || !card || !grid) return;
  card.style.display = 'block';
  const avgColor = stats.avgPct >= 80 ? 'var(--green)' : stats.avgPct >= 60 ? 'var(--yellow)' : 'var(--red)';
  grid.innerHTML = `
    <div class="sstat"><div class="sv">${stats.totalQ.toLocaleString()}</div><div class="sl">Questions</div></div>
    <div class="sstat"><div class="sv">${stats.sessions}</div><div class="sl">Sessions</div></div>
    <div class="sstat"><div class="sv" style="color:${avgColor}">${stats.avgPct}%</div><div class="sl">Avg Score</div></div>
    <div class="sstat"><div class="sv">${stats.bestExam > 0 ? stats.bestExam : '\u2014'}</div><div class="sl">Best Exam</div></div>`;
}

// ══════════════════════════════════════════
// TOPIC PROGRESS PAGE
// ══════════════════════════════════════════
function renderProgressPage() {
  const allTopics = Array.from(document.querySelectorAll('#topic-group .chip'))
    .map(c => c.dataset.v)
    .filter(v => !v.includes('Mixed') && !v.includes('Smart'));
  const h   = loadHistory();
  const now = Date.now();
  const grid = document.getElementById('progress-topic-grid');
  if (!grid) return;

  const rows = allTopics.map(t => {
    const entries = h.filter(e => e.topic === t);
    if (entries.length === 0) return { t, pct: null, total: 0, last: null };
    const totalQ   = entries.reduce((a, e) => a + e.total, 0);
    const wCorrect = entries.reduce((a, e) => a + e.score * diffWeight(e.difficulty), 0);
    const wTotal   = entries.reduce((a, e) => a + e.total * diffWeight(e.difficulty), 0);
    const pct      = Math.round((wCorrect / wTotal) * 100);
    const daysSince = Math.round((now - new Date(entries[0].date)) / 86400000);
    return { t, pct, total: totalQ, daysSince };
  });

  rows.sort((a, b) => {
    if (a.pct === null && b.pct === null) return 0;
    if (a.pct === null) return 1;
    if (b.pct === null) return -1;
    return a.pct - b.pct;
  });

  grid.innerHTML = rows.map(({ t, pct, total, daysSince }) => {
    let ragClass, color, label;
    if (pct === null) {
      ragClass = 'rag-grey'; color = 'var(--text-dim)'; label = 'Not studied yet';
    } else if (pct >= 80) {
      ragClass = 'rag-green'; color = 'var(--green)'; label = total + 'Q \u00b7 ' + (daysSince === 0 ? 'today' : daysSince + 'd ago');
    } else if (pct >= 60) {
      ragClass = 'rag-yellow'; color = 'var(--yellow)'; label = total + 'Q \u00b7 ' + (daysSince === 0 ? 'today' : daysSince + 'd ago');
    } else {
      ragClass = 'rag-red'; color = 'var(--red)'; label = total + 'Q \u00b7 ' + (daysSince === 0 ? 'today' : daysSince + 'd ago');
    }
    const barW = pct !== null ? pct : 0;
    const pctTxt = pct !== null ? pct + '%' : '\u2014';
    return `<div class="topic-row" onclick="drillTopic('${escHtml(t)}')">
      <div class="topic-rag ${ragClass}"></div>
      <div class="topic-info">
        <div class="topic-name">${escHtml(t)}</div>
        <div class="topic-meta">${label}</div>
        <div class="topic-mini-bar"><div class="topic-mini-fill" style="width:${barW}%;background:${color}"></div></div>
      </div>
      <div class="topic-pct-lbl" style="color:${color}">${pctTxt}</div>
    </div>`;
  }).join('');
}

function drillTopic(t) {
  topic = t;
  document.querySelectorAll('#topic-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === t));
  goSetup();
}

// ══════════════════════════════════════════
// STREAK
// ══════════════════════════════════════════
function getStreak() {
  try { return JSON.parse(localStorage.getItem('nplus_streak') || '{"current":0,"best":0,"last":null}'); }
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
  localStorage.setItem('nplus_streak', JSON.stringify(s));
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
function _scoreTopicNeed(topic, historyEntries, now) {
  const entries = historyEntries.filter(e => e.topic === topic);
  if (entries.length === 0) return { score: 1.0, reason: 'Never studied', color: 'var(--text-dim)' };
  const daysSince = (now - new Date(entries[0].date)) / 86400000;
  const recentAvg = entries.slice(0, 3).reduce((a, e) => a + e.pct, 0) / Math.min(entries.length, 3);
  const score = (Math.min(daysSince, 14) / 14) * 0.4 + ((100 - recentAvg) / 100) * 0.6;
  let reason, color;
  if (recentAvg < 60) { reason = Math.round(recentAvg) + '% avg \u2014 needs work'; color = 'var(--red)'; }
  else if (daysSince >= 7) { reason = Math.round(daysSince) + 'd since last drill'; color = 'var(--yellow)'; }
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
  const h = loadHistory().filter(e => e.topic !== 'Mixed \u2014 All Topics' && e.topic !== 'Exam Simulation');
  const now = Date.now();
  let bestTopic = allTopics[Math.floor(Math.random() * allTopics.length)];
  let bestScore = -1;
  allTopics.forEach(t => {
    const { score } = _scoreTopicNeed(t, h, now);
    if (score > bestScore) { bestScore = score; bestTopic = t; }
  });
  return bestTopic;
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
  try { return JSON.parse(localStorage.getItem('nplus_wrong_bank') || '[]'); } catch { return []; }
}
function saveWrongBank(bank) {
  try { localStorage.setItem('nplus_wrong_bank', JSON.stringify(bank)); } catch {}
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
  const btn = document.getElementById('wrong-bank-btn');
  if (!btn) return;
  const bank = loadWrongBank();
  if (bank.length === 0) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';
  const badge = btn.querySelector('.wrong-count-badge');
  if (badge) badge.textContent = bank.length;
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
  const h = loadHistory().filter(e => e.topic !== 'Mixed \u2014 All Topics' && e.topic !== 'Exam Simulation' && e.total >= 5);
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
  if (!weak) { banner.style.display = 'none'; return; }
  banner.style.display = 'flex';
  document.getElementById('weak-topic-name').textContent = weak.topic;
  document.getElementById('weak-topic-pct').textContent  = weak.pct + '%';
  document.getElementById('weak-drill-btn').onclick = () => {
    topic = weak.topic;
    document.querySelectorAll('#topic-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === weak.topic));
    diff = 'Exam Level';
    document.querySelectorAll('#diff-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === 'Exam Level'));
    qCount = 10;
    document.querySelectorAll('#count-group .chip').forEach(c => c.classList.toggle('on', c.dataset.v === '10'));
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
  errBox.style.display = 'none';
  const keyErr = validateApiKey(key);
  if (keyErr) { errBox.textContent = keyErr; errBox.style.display = 'block'; return; }
  apiKey = key;
  localStorage.setItem('nplus_key', key);
  examMode = false;
  wrongDrillMode = false;

  activeQuizTopic = topic.includes('Smart') ? getSpacedRepTopic() : topic;

  document.getElementById('load-progress').style.display = 'none';
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
    if (tb) tb.style.display = 'none';
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
      errBox.style.display = 'block';
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
  errBox.style.display = 'none';
  const keyErr = validateApiKey(key);
  if (keyErr) { errBox.textContent = keyErr; errBox.style.display = 'block'; return; }
  apiKey = key;
  localStorage.setItem('nplus_key', key);

  examMode = true;
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
  prog.style.display = 'block';

  const BATCHES = 5, BATCH_SIZE = 18, MAX_RETRIES = 2;
  try {
    for (let i = 0; i < BATCHES; i++) {
      fill.style.width = ((i / BATCHES) * 100) + '%';
      lbl.textContent  = `Batch ${i + 1} / ${BATCHES}\u2026`;
      document.getElementById('loading-msg').textContent = `Generating questions (${examQuestions.length + BATCH_SIZE} / 90)\u2026`;
      let batch = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          batch = await fetchQuestions(key, 'Mixed \u2014 All Topics', 'Mixed', BATCH_SIZE);
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
    examQuestions = injectPBQs(examQuestions, 'Mixed \u2014 All Topics', 2);
    examAnswers = examQuestions.map(() => ({ chosen: null, flagged: false, msChosen: [], orderSeq: [], cliRan: [], topoState: {} }));
    showPage('exam');
    renderExam();
    startExamTimer();
  } catch(e) {
    examMode = false;
    showPage('setup');
    errBox.textContent = '\u26a0\ufe0f ' + e.message;
    errBox.style.display = 'block';
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
  const topicStr = qTopic === 'Mixed \u2014 All Topics'
    ? 'Cover a broad mix of Network+ N10-009 exam topics: OSI model, TCP/IP, subnetting, routing protocols, switching, VLANs, IPv6, wireless (including WPA3/EAP), VPNs, security, DNS, DHCP, network operations, WAN, cloud, data centres, IoT/SCADA, troubleshooting tools, NAT, AAA/RADIUS, NTP, ICMP, Ethernet standards, PKI and certificate management, the CompTIA 7-step troubleshooting methodology, firewalls and security zones (DMZ, stateful vs stateless), WPA3 and EAP authentication types, and SDN/NFV/network automation.'
    : `Focus only on: "${qTopic}" for the CompTIA Network+ N10-009 exam.${topicHints[qTopic] ? ' Specifically cover: ' + topicHints[qTopic] : ''}`;

  const diffStr = {
    'Foundational':  'Foundational: test basic recall and definitions. Clear right answers.',
    'Exam Level':    'Exam Level: scenario-based, mirrors real CompTIA style. Plausible distractors.',
    'Hard / Tricky': 'Hard: tricky edge cases, near-identical distractors, deep understanding required.',
    'Mixed':         'Mix of foundational, exam-level, and hard questions across all difficulties.'
  }[difficulty] || 'Exam Level';

  // Determine PBQ count
  const pbqCount = n >= 10 ? 2 : (n >= 7 ? 1 : 0);
  const mcqCount = n - pbqCount;

  const pbqInstructions = pbqCount > 0 ? `

IMPORTANT: Out of the ${n} questions, generate exactly ${mcqCount} as standard MCQ and ${pbqCount} as performance-based questions (PBQ).

For standard MCQ, use this format:
{"type":"mcq","question":"...","difficulty":"...","topic":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A|B|C|D","explanation":"..."}

For PBQ, use ONE of these two formats:

1. MULTI-SELECT (choose 2 or 3 correct answers from 5 options):
{"type":"multi-select","question":"(Choose TWO) ...","difficulty":"...","topic":"...","options":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"answers":["A","C"],"explanation":"..."}

2. ORDERING (put 4-5 items in correct order):
{"type":"order","question":"Arrange these in the correct order...","difficulty":"...","topic":"...","items":["Item one","Item two","Item three","Item four"],"correctOrder":[2,0,3,1],"explanation":"..."}
For ordering: correctOrder is an array of indices (0-based) representing the correct sequence. correctOrder[0] = index of the item that should be FIRST.` : '';

  const prompt = `You are a CompTIA Network+ N10-009 exam question writer.

${topicStr}
Difficulty: ${diffStr}

Generate exactly ${n} multiple choice questions. Requirements:
- 4 options each (or 5 for multi-select): A, B, C, D (E for multi-select)
- One correct answer only (unless multi-select)
- Distractors must be plausible - never obviously wrong
- Vary the correct answer letter across questions
- Each explanation must state WHY the answer is correct AND briefly why the main wrong option is wrong (2-3 sentences max)
- No repeated questions
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
[{"type":"mcq","question":"...","difficulty":"Foundational|Exam Level|Hard","topic":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A|B|C|D","explanation":"..."}]`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 8000, messages: [{ role: 'user', content: prompt }] })
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
  const dc    = (q.difficulty || 'Exam Level').replace(/[^a-zA-Z]/g, '');
  badge.className   = `diff-badge diff-${dc}`;
  badge.textContent = q.difficulty || 'Exam Level';

  // PBQ badge
  const pbqBadge = document.getElementById('pbq-badge');
  if (pbqBadge) {
    if (qType === 'multi-select') { pbqBadge.textContent = 'Multi-Select'; pbqBadge.style.display = ''; }
    else if (qType === 'order') { pbqBadge.textContent = 'Ordering'; pbqBadge.style.display = ''; }
    else if (qType === 'cli-sim') { pbqBadge.textContent = 'CLI Sim'; pbqBadge.style.display = ''; }
    else if (qType === 'topology') { pbqBadge.textContent = 'Topology'; pbqBadge.style.display = ''; }
    else { pbqBadge.style.display = 'none'; }
  }

  document.getElementById('q-text').textContent = q.question;

  // Flag button
  const flagBtn = document.getElementById('quiz-flag-btn');
  flagBtn.className = 'flag-btn' + (quizFlags[current] ? ' flagged' : '');
  flagBtn.textContent = quizFlags[current] ? 'Flagged' : 'Flag';

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
  expBox.style.display = 'none';

  const btnNext = document.getElementById('btn-next');
  btnNext.className = 'btn-next';
  btnNext.textContent = current === total - 1 ? 'See Results' : 'Next \u2192';
  btnNext.onclick = current === total - 1 ? finish : advance;
}

// ── MCQ Render ──
function renderMCQ(q, box) {
  ['A','B','C','D'].forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.innerHTML = `<span class="opt-letter">${l}</span><span class="opt-text">${escHtml(q.options[l])}</span>`;
    btn.onclick = () => pick(l, q);
    box.appendChild(btn);
  });
}

// ── Multi-Select Render ──
function renderMultiSelect(q, box) {
  msSelections = [];
  const letters = Object.keys(q.options).sort();
  const reqCount = (q.answers || []).length || 2;

  letters.forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.dataset.letter = l;
    btn.innerHTML = `<span class="ms-checkbox"></span><span class="opt-text">${escHtml(q.options[l])}</span>`;
    btn.onclick = () => {
      if (btn.closest('.options').querySelector('.option.correct, .option.wrong')) return;
      const idx = msSelections.indexOf(l);
      if (idx >= 0) {
        msSelections.splice(idx, 1);
        btn.classList.remove('ms-selected');
        btn.querySelector('.ms-checkbox').textContent = '';
      } else {
        msSelections.push(l);
        btn.classList.add('ms-selected');
        btn.querySelector('.ms-checkbox').textContent = '\u2713';
      }
      updateMsSubmitBtn(reqCount);
    };
    box.appendChild(btn);
  });

  // Submit row
  const row = document.createElement('div');
  row.className = 'ms-submit-row';
  row.innerHTML = `<span class="ms-hint">Select ${reqCount} answers</span>`;
  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn btn-primary';
  submitBtn.id = 'ms-submit-btn';
  submitBtn.textContent = 'Submit';
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.5';
  submitBtn.onclick = () => submitMultiSelect(q);
  row.appendChild(submitBtn);
  box.appendChild(row);
}

function updateMsSubmitBtn(reqCount) {
  const btn = document.getElementById('ms-submit-btn');
  if (!btn) return;
  const ready = msSelections.length === reqCount;
  btn.disabled = !ready;
  btn.style.opacity = ready ? '1' : '0.5';
}

function submitMultiSelect(q) {
  const correctAnswers = (q.answers || []).sort();
  const chosen = [...msSelections].sort();
  const isRight = JSON.stringify(chosen) === JSON.stringify(correctAnswers);

  answered++;
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
  if (submitBtn) submitBtn.style.display = 'none';

  showExplanation(q, isRight);
}

// ── Order Render ──
function renderOrder(q, box) {
  orderSequence = [];
  const items = q.items || [];
  // Show items as clickable buttons
  const itemsDiv = document.createElement('div');
  itemsDiv.className = 'order-items';
  itemsDiv.id = 'order-items';

  items.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = 'order-item';
    btn.dataset.idx = idx;
    btn.innerHTML = `<span class="order-num">${idx + 1}</span><span class="order-item-text">${escHtml(item)}</span>`;
    btn.onclick = () => addToOrderSequence(idx, items, q);
    itemsDiv.appendChild(btn);
  });
  box.appendChild(itemsDiv);

  // Sequence display
  const seqDiv = document.createElement('div');
  seqDiv.className = 'order-sequence';
  seqDiv.innerHTML = '<h4>Your Order:</h4><div class="order-placed-list" id="order-placed-list"><span style="color:var(--text-dim);font-size:13px">Click items above in the correct order</span></div>';
  box.appendChild(seqDiv);

  // Controls
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
  submitBtn.style.opacity = '0.5';
  submitBtn.onclick = () => submitOrder(q);
  controls.appendChild(submitBtn);
  box.appendChild(controls);
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
    btn.style.opacity = ready ? '1' : '0.5';
  }
}

function submitOrder(q) {
  const correctOrder = q.correctOrder || [];
  const isRight = JSON.stringify(orderSequence) === JSON.stringify(correctOrder);

  answered++;
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
  document.getElementById('order-submit-btn').style.display = 'none';
  document.querySelector('.order-controls .btn-ghost').style.display = 'none';

  // Show correct vs wrong in placed list
  const items = q.items || [];
  const list = document.getElementById('order-placed-list');
  list.innerHTML = orderSequence.map((idx, pos) => {
    const isCorrectPos = correctOrder[pos] === idx;
    return `<div class="order-placed-item ${isCorrectPos ? 'order-correct' : 'order-wrong'}"><span class="order-placed-num">${pos + 1}</span>${escHtml(items[idx])} ${isCorrectPos ? '\u2713' : '\u2717 (should be: ' + escHtml(items[correctOrder[pos]]) + ')'}</div>`;
  }).join('');

  showExplanation(q, isRight);
}

// ══════════════════════════════════════════
// ANSWER SELECTION (MCQ)
// ══════════════════════════════════════════
function pick(chosen, q) {
  if (document.querySelector('#options .option.correct, #options .option.wrong')) return;
  const isRight = chosen === q.answer;
  answered++;

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

  // Resource link
  const qTopic = q.topic || activeQuizTopic;
  const res = topicResources[qTopic];
  let extraHtml = '';
  if (res) {
    extraHtml += '<div class="resource-link"><a href="https://www.youtube.com/results?search_query=' + res.search + '" target="_blank" rel="noopener">\ud83c\udfa5 Study: ' + escHtml(res.title) + ' (Obj ' + res.obj + ')</a></div>';
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
  expBox.style.display = 'block';
  document.getElementById('btn-next').classList.add('show');
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
function finish() {
  const total = questions.length;
  const pct   = total > 0 ? Math.round((score / total) * 100) : 0;
  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
  const gradeColor = { A:'#22c55e', B:'#60a5fa', C:'#fbbf24', D:'#fb923c', F:'#f87171' }[grade];

  const ring = document.getElementById('grade-ring');
  ring.style.borderColor = gradeColor;
  ring.style.background  = gradeColor + '14';
  document.getElementById('grade-letter').textContent = grade;
  document.getElementById('grade-letter').style.color = gradeColor;
  document.getElementById('grade-pct').textContent    = pct + '%';

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
  document.getElementById('btn-review').style.display = log.length > 0 ? '' : 'none';

  // Difficulty breakdown
  const byDiff = {};
  log.forEach(entry => {
    const d = (entry.q.difficulty || 'Exam Level').trim();
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
    const dpct = Math.round((right / t) * 100);
    const col = diffColors[d] || 'var(--text)';
    const shortLabel = d.replace(' / Tricky', '').replace('Foundational', 'Basic');
    return `<div class="dstat"><div class="dv" style="color:${col}">${right}/${t}</div><div class="dl">${shortLabel}</div></div>`;
  }).join('') : '';

  updateStreak();
  renderStreakBadge();

  if (!wrongDrillMode) {
    saveToHistory({ date: new Date().toISOString(), topic: activeQuizTopic, difficulty: diff, score, total, pct, mode: 'quiz' });
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
    err.style.display = 'block';
    return;
  }
  apiKey = key;

  activeQuizTopic = topic.includes('Smart') ? getSpacedRepTopic() : topic;

  document.getElementById('load-progress').style.display = 'none';
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
      err.style.display = 'block';
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

  document.getElementById('exam-q-text').textContent = q.question;

  const box = document.getElementById('exam-options');
  box.innerHTML = '';

  if (qType === 'multi-select') {
    renderExamMultiSelect(q, box, ans);
  } else if (qType === 'order') {
    renderExamOrder(q, box, ans);
  } else if (qType === 'cli-sim') {
    renderExamCliSim(q, box, ans);
  } else if (qType === 'topology') {
    renderExamTopology(q, box, ans);
  } else {
    renderExamMCQ(q, box, ans);
  }

  document.getElementById('exam-prev-btn').disabled = examCurrent === 0;
  const isLast = examCurrent === total - 1;
  const nextBtn = document.getElementById('exam-next-btn');
  nextBtn.textContent = isLast ? 'Submit Exam' : 'Next \u2192';
  nextBtn.onclick = isLast ? showExamModal : examNext;

  if (navOpen) renderNavGrid();
  updateTimerDisplay();
}

function renderExamMCQ(q, box, ans) {
  ['A','B','C','D'].forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'option' + (ans.chosen === l ? ' exam-selected' : '');
    btn.innerHTML = `<span class="opt-letter">${l}</span><span class="opt-text">${escHtml(q.options[l])}</span>`;
    btn.onclick = () => { examAnswers[examCurrent].chosen = l; renderExam(); };
    box.appendChild(btn);
  });
}

function renderExamMultiSelect(q, box, ans) {
  const letters = Object.keys(q.options).sort();
  letters.forEach(l => {
    const btn = document.createElement('button');
    const isSelected = ans.msChosen.includes(l);
    btn.className = 'option' + (isSelected ? ' ms-selected' : '');
    btn.dataset.letter = l;
    btn.innerHTML = `<span class="ms-checkbox">${isSelected ? '\u2713' : ''}</span><span class="opt-text">${escHtml(q.options[l])}</span>`;
    btn.onclick = () => {
      const idx = ans.msChosen.indexOf(l);
      if (idx >= 0) ans.msChosen.splice(idx, 1);
      else ans.msChosen.push(l);
      renderExam();
    };
    box.appendChild(btn);
  });
  const reqCount = (q.answers || []).length || 2;
  const hint = document.createElement('div');
  hint.className = 'ms-hint';
  hint.style.marginTop = '8px';
  hint.textContent = `Select ${reqCount} answers (${ans.msChosen.length} selected)`;
  box.appendChild(hint);
}

function renderExamOrder(q, box, ans) {
  const items = q.items || [];

  // Items to pick from
  const itemsDiv = document.createElement('div');
  itemsDiv.className = 'order-items';
  items.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = 'order-item' + (ans.orderSeq.includes(idx) ? ' placed' : '');
    btn.dataset.idx = idx;
    btn.innerHTML = `<span class="order-num">${idx + 1}</span><span class="order-item-text">${escHtml(item)}</span>`;
    btn.onclick = () => {
      if (!ans.orderSeq.includes(idx)) {
        ans.orderSeq.push(idx);
        renderExam();
      }
    };
    itemsDiv.appendChild(btn);
  });
  box.appendChild(itemsDiv);

  // Placed sequence
  const seqDiv = document.createElement('div');
  seqDiv.className = 'order-sequence';
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
  box.appendChild(seqDiv);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-ghost';
  resetBtn.style.fontSize = '13px';
  resetBtn.style.marginTop = '8px';
  resetBtn.textContent = 'Reset Order';
  resetBtn.onclick = () => { ans.orderSeq = []; renderExam(); };
  box.appendChild(resetBtn);
}

function examNext() { if (examCurrent < examQuestions.length - 1) { examCurrent++; renderExam(); window.scrollTo(0,0); } }
function examPrev() { if (examCurrent > 0) { examCurrent--; renderExam(); window.scrollTo(0,0); } }

function examToggleFlag() {
  examAnswers[examCurrent].flagged = !examAnswers[examCurrent].flagged;
  renderExam();
}

// ══════════════════════════════════════════
// QUESTION NAVIGATOR
// ══════════════════════════════════════════
function toggleNav() {
  navOpen = !navOpen;
  const grid = document.getElementById('qnav-grid');
  document.getElementById('qnav-arrow').textContent = navOpen ? '\u25b2' : '\u25bc';
  grid.classList.toggle('open', navOpen);
  if (navOpen) renderNavGrid();
}

function renderNavGrid() {
  const grid = document.getElementById('qnav-grid');
  grid.innerHTML = '';
  examAnswers.forEach((a, i) => {
    const sq = document.createElement('button');
    const hasAnswer = a.chosen !== null || a.msChosen.length > 0 || a.orderSeq.length > 0 || Object.keys(a.topoState || {}).length > 0;
    let cls = 'qnav-sq';
    if (i === examCurrent)    cls += ' current';
    else if (a.flagged)       cls += ' flagged';
    else if (hasAnswer)       cls += ' answered';
    sq.className   = cls;
    sq.textContent = i + 1;
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
  flagBtn.style.opacity = flaggedCount === 0 ? '0.4' : '1';
  document.getElementById('exam-modal').classList.remove('hidden');
}

function hideExamModal() { document.getElementById('exam-modal').classList.add('hidden'); }

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

    if (qType === 'multi-select') {
      const correctAns = (q.answers || []).sort();
      const chosen = [...(a.msChosen || [])].sort();
      if (chosen.length === 0) skipped++;
      else if (JSON.stringify(chosen) === JSON.stringify(correctAns)) correct++;
      else wrong++;
    } else if (qType === 'order') {
      const correctOrd = q.correctOrder || [];
      if (a.orderSeq.length === 0) skipped++;
      else if (JSON.stringify(a.orderSeq) === JSON.stringify(correctOrd)) correct++;
      else wrong++;
    } else if (qType === 'topology') {
      const correctP = q.correctPlacements || {};
      const state = a.topoState || {};
      if (Object.keys(state).length === 0) skipped++;
      else {
        let allRight = true;
        Object.entries(correctP).forEach(([dev, zone]) => {
          const placed = Object.entries(state).find(([z, devs]) => devs.includes(dev));
          if (!placed || placed[0] !== zone) allRight = false;
        });
        if (allRight) correct++;
        else wrong++;
      }
    } else {
      // mcq and cli-sim both use chosen + answer
      if (a.chosen === null) skipped++;
      else if (a.chosen === q.answer) correct++;
      else wrong++;
    }
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
  saveToHistory({ date: new Date().toISOString(), topic: 'Exam Simulation', difficulty: 'Mixed', score: correct, total, pct, mode: 'exam' });

  const scoreEl = document.getElementById('exam-scaled-score');
  scoreEl.textContent  = scaledScore;
  scoreEl.style.color  = passed ? '#22c55e' : '#f87171';

  const badge = document.getElementById('exam-pass-badge');
  badge.textContent = passed ? 'PASS' : 'FAIL';
  badge.className   = 'pass-badge ' + (passed ? 'badge-pass' : 'badge-fail');

  document.getElementById('exam-result-msg').textContent = passed
    ? `Score ${scaledScore}/900 \u2014 above the 720 pass mark. Exam-ready!`
    : `Score ${scaledScore}/900 \u2014 need ${720 - scaledScore} more points. Keep drilling!`;

  document.getElementById('exam-r-correct').textContent = correct;
  document.getElementById('exam-r-wrong').textContent   = wrong;
  document.getElementById('exam-r-skipped').textContent = skipped;
  document.getElementById('exam-r-pct').textContent     = pct + '%';

  showPage('exam-results');
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
    const resLink = reviewRes ? `<div class="resource-link" style="margin-top:8px"><a href="https://www.youtube.com/results?search_query=${reviewRes.search}" target="_blank" rel="noopener">\ud83c\udfa5 Study: ${escHtml(reviewRes.title)} (Obj ${reviewRes.obj})</a></div>` : '';

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
function diffWeight(d) {
  if (!d) return 1.5;
  const s = d.toLowerCase();
  if (s.includes('hard'))  return 2.0;
  if (s.includes('exam'))  return 1.5;
  if (s.includes('found')) return 1.0;
  return 1.3;
}

function getReadinessScore() {
  const allTopics = Array.from(document.querySelectorAll('#topic-group .chip'))
    .map(c => c.dataset.v)
    .filter(v => !v.includes('Mixed') && !v.includes('Smart'));
  const totalTopics = allTopics.length;

  const h = loadHistory().filter(e =>
    e.topic !== 'Mixed \u2014 All Topics' && e.topic !== 'Exam Simulation' && e.total >= 3
  );
  if (h.length === 0) return null;

  const now = Date.now();
  const topicMap = {};
  h.forEach(e => {
    if (!topicMap[e.topic]) topicMap[e.topic] = { wCorrect: 0, wTotal: 0, lastDate: 0 };
    const w = diffWeight(e.difficulty);
    topicMap[e.topic].wCorrect += e.score * w;
    topicMap[e.topic].wTotal   += e.total * w;
    const d = new Date(e.date).getTime();
    if (d > topicMap[e.topic].lastDate) topicMap[e.topic].lastDate = d;
  });

  const studiedTopics = Object.keys(topicMap);
  const studiedCount  = studiedTopics.length;

  const accuracyScore = studiedCount > 0
    ? studiedTopics.reduce((sum, t) => sum + (topicMap[t].wCorrect / topicMap[t].wTotal) * 100, 0) / studiedCount
    : 0;

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

  return { predicted, raw, worstTopic, worstPct: worstPct === -1 ? null : worstPct };
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
}

// ══════════════════════════════════════════
// TODAY'S SESSION
// ══════════════════════════════════════════
function buildSessionPlan(n) {
  const allTopics = _getAllStudyTopics();
  const h = loadHistory().filter(e => e.topic !== 'Mixed \u2014 All Topics' && e.topic !== 'Exam Simulation');
  const now = Date.now();

  const scored = allTopics.map(t => {
    const { score, reason, color } = _scoreTopicNeed(t, h, now);
    return { topic: t, score, reason, color };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map(({ topic, reason, color }) => ({ topic, reason, color }));
}

function renderSessionBanner() {
  const plan = buildSessionPlan(SESSION_TOPICS);
  sessionPlan = plan;
  const banner = document.getElementById('session-banner');
  const rows   = document.getElementById('session-topic-rows');
  if (!banner || !rows) return;
  banner.style.display = 'block';
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
  errBox.style.display = 'none';
  const keyErr = validateApiKey(key);
  if (keyErr) { errBox.textContent = keyErr; errBox.style.display = 'block'; return; }
  apiKey = key;
  localStorage.setItem('nplus_key', key);

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

  document.getElementById('load-progress').style.display = 'none';
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
      err.style.display = 'block';
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
      localStorage.setItem('nplus_history', JSON.stringify(merged));

      if (data.streak) {
        const current = getStreak();
        if ((data.streak.best || 0) > (current.best || 0)) {
          current.best = data.streak.best;
          localStorage.setItem('nplus_streak', JSON.stringify(current));
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
  'SDN, NFV & Automation': { obj: '1.8', title: 'SDN & Automation', search: 'professor+messer+N10-009+SDN+NFV+automation' }
};

// ══════════════════════════════════════════
// CLI SIMULATOR SCENARIO BANK
// ══════════════════════════════════════════
const cliScenarios = [
  {
    type: 'cli-sim', difficulty: 'Exam Level', topic: 'Network Troubleshooting & Tools',
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
    type: 'cli-sim', difficulty: 'Exam Level', topic: 'Network Troubleshooting & Tools',
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
    type: 'cli-sim', difficulty: 'Exam Level', topic: 'Network Troubleshooting & Tools',
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
    type: 'cli-sim', difficulty: 'Exam Level', topic: 'Network Troubleshooting & Tools',
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
    type: 'topology', difficulty: 'Exam Level', topic: 'Firewalls, DMZ & Security Zones',
    scenario: 'Place each network component into the correct security zone for a secure web hosting architecture.',
    zones: ['Internet', 'DMZ', 'Internal LAN'],
    devices: ['Public Web Server', 'Database Server', 'Email Gateway', 'Domain Controller'],
    correctPlacements: { 'Public Web Server': 'DMZ', 'Database Server': 'Internal LAN', 'Email Gateway': 'DMZ', 'Domain Controller': 'Internal LAN' },
    question: 'Place each device into the correct security zone.',
    explanation: 'Public-facing servers (web server, email gateway) belong in the DMZ \u2014 a screened subnet between firewalls. This limits exposure if compromised. The database and domain controller hold sensitive data and must be in the Internal LAN, never directly exposed to the internet.'
  },
  {
    type: 'topology', difficulty: 'Exam Level', topic: 'Protecting Networks',
    scenario: 'A company is deploying network monitoring. Place each security tool in the correct zone.',
    zones: ['Internet Edge', 'Core Network', 'Server Farm'],
    devices: ['IDS Sensor', 'SIEM Collector', 'Honeypot', 'Syslog Server'],
    correctPlacements: { 'IDS Sensor': 'Internet Edge', 'SIEM Collector': 'Core Network', 'Honeypot': 'Internet Edge', 'Syslog Server': 'Server Farm' },
    question: 'Place each security tool in its optimal network zone.',
    explanation: 'The IDS sensor and honeypot belong at the Internet Edge to detect and attract threats before they reach internal networks. The SIEM collector goes in the Core Network to aggregate logs from all zones. The Syslog server belongs in the Server Farm for secure log storage alongside infrastructure servers.'
  },
  {
    type: 'topology', difficulty: 'Exam Level', topic: 'Wireless Networking',
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
    type: 'topology', difficulty: 'Exam Level', topic: 'Cabling & Topology',
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
  try { return JSON.parse(localStorage.getItem('nplus_reports') || '[]'); } catch { return []; }
}

function saveReport(questionText, reason) {
  const reports = loadReports();
  reports.push({ question: questionText, reason, date: new Date().toISOString() });
  // Cap reports storage
  if (reports.length > REPORTS_CAP) reports.splice(0, reports.length - REPORTS_CAP);
  localStorage.setItem('nplus_reports', JSON.stringify(reports));
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
function renderCliSim(q, box) {
  const scenarioDiv = document.createElement('div');
  scenarioDiv.className = 'cli-scenario';
  scenarioDiv.textContent = q.scenario;
  box.appendChild(scenarioDiv);

  const terminal = document.createElement('div');
  terminal.className = 'cli-terminal';
  terminal.id = 'cli-terminal';
  const hn = escHtml(q.hostname || 'PC');
  terminal.innerHTML = '<div class="cli-prompt">' + hn + '&gt; <span class="cli-cursor">_</span></div>';
  box.appendChild(terminal);

  const cmdRow = document.createElement('div');
  cmdRow.className = 'cli-cmd-row';
  cmdRow.innerHTML = '<span style="font-size:11px;color:var(--text-dim);margin-right:8px">Run:</span>';
  Object.keys(q.commands || {}).forEach(cmd => {
    const btn = document.createElement('button');
    btn.className = 'cli-cmd-btn';
    btn.textContent = cmd;
    btn.onclick = () => { runCliCommand(cmd, q); btn.classList.add('used'); };
    cmdRow.appendChild(btn);
  });
  box.appendChild(cmdRow);

  const diagSection = document.createElement('div');
  diagSection.id = 'cli-diagnosis';
  diagSection.className = 'cli-diagnosis';
  diagSection.style.display = 'none';
  diagSection.innerHTML = '<div class="cli-diag-label">DIAGNOSIS</div>';
  ['A','B','C','D'].forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.innerHTML = '<span class="opt-letter">' + l + '</span><span class="opt-text">' + escHtml(q.options[l]) + '</span>';
    btn.onclick = () => pick(l, q);
    diagSection.appendChild(btn);
  });
  box.appendChild(diagSection);
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
  if (diag) diag.style.display = 'block';
}

// ══════════════════════════════════════════
// TOPOLOGY BUILDER RENDER
// ══════════════════════════════════════════
function renderTopology(q, box) {
  topoDevices = {};
  selectedTopoDevice = null;

  const scenarioDiv = document.createElement('div');
  scenarioDiv.className = 'topo-scenario';
  scenarioDiv.textContent = q.scenario;
  box.appendChild(scenarioDiv);

  const palette = document.createElement('div');
  palette.className = 'topo-palette';
  palette.innerHTML = '<div class="topo-palette-label">DEVICES <span style="font-size:11px;font-weight:400;color:var(--text-dim)">(drag to a zone, or click to select then click a zone)</span></div>';
  (q.devices || []).forEach(dev => {
    const btn = document.createElement('button');
    btn.className = 'topo-device';
    btn.textContent = dev;
    btn.draggable = true;
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
      document.querySelectorAll('.topo-device').forEach(b => b.classList.toggle('selected', b.textContent === dev));
    }, { passive: false });
    btn.onclick = () => {
      selectedTopoDevice = dev;
      document.querySelectorAll('.topo-device').forEach(b => b.classList.toggle('selected', b.textContent === dev));
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
    const zoneId = 'topo-zone-' + zone.replace(/[^a-zA-Z0-9]/g, '-');
    zoneEl.innerHTML = '<div class="topo-zone-label">' + escHtml(zone) + '</div><div class="topo-zone-devices" id="' + zoneId + '"><span style="color:var(--text-dim);font-size:12px">Drag or click to place device here</span></div>';

    // Drag-and-drop handlers
    zoneEl.ondragover = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; zoneEl.classList.add('topo-zone-dragover'); };
    zoneEl.ondragleave = () => { zoneEl.classList.remove('topo-zone-dragover'); };
    zoneEl.ondrop = (e) => {
      e.preventDefault();
      zoneEl.classList.remove('topo-zone-dragover');
      const dev = e.dataTransfer.getData('text/plain');
      if (!dev) return;
      // Remove from any previous zone
      Object.keys(topoDevices).forEach(z => {
        topoDevices[z] = (topoDevices[z] || []).filter(d => d !== dev);
        if (topoDevices[z].length === 0) delete topoDevices[z];
      });
      if (!topoDevices[zone]) topoDevices[zone] = [];
      topoDevices[zone].push(dev);
      selectedTopoDevice = null;
      renderTopoState(q);
    };

    // Click handler (existing behaviour) — also serves as touch tap target
    const handleZonePlacement = () => {
      if (!selectedTopoDevice) return;
      Object.keys(topoDevices).forEach(z => {
        topoDevices[z] = (topoDevices[z] || []).filter(d => d !== selectedTopoDevice);
        if (topoDevices[z].length === 0) delete topoDevices[z];
      });
      if (!topoDevices[zone]) topoDevices[zone] = [];
      topoDevices[zone].push(selectedTopoDevice);
      selectedTopoDevice = null;
      renderTopoState(q);
    };
    zoneEl.onclick = handleZonePlacement;
    // Touch support for mobile zones
    zoneEl.addEventListener('touchend', (e) => { e.preventDefault(); handleZonePlacement(); }, { passive: false });
    zonesDiv.appendChild(zoneEl);
  });
  box.appendChild(zonesDiv);

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
  submitBtn.style.opacity = '0.5';
  submitBtn.onclick = () => submitTopology(q);
  controls.appendChild(submitBtn);
  box.appendChild(controls);
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
    submitBtn.style.opacity = ready ? '1' : '0.5';
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
  if (topoSubmit) topoSubmit.style.display = 'none';
  const topoReset = document.querySelector('.topo-controls .btn-ghost');
  if (topoReset) topoReset.style.display = 'none';

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
  const cli = cliScenarios.filter(s => qTopic === 'Mixed \u2014 All Topics' || s.topic === qTopic || qTopic.includes('Troubleshoot'));
  const topo = topoScenarios.filter(s => qTopic === 'Mixed \u2014 All Topics' || s.topic === qTopic);
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
    result.splice(insertIdx, 1, { ...pbq });
  });
  return result;
}

// ══════════════════════════════════════════
// EXAM CLI SIM & TOPOLOGY RENDER
// ══════════════════════════════════════════
function renderExamCliSim(q, box, ans) {
  const scenarioDiv = document.createElement('div');
  scenarioDiv.className = 'cli-scenario';
  scenarioDiv.textContent = q.scenario;
  box.appendChild(scenarioDiv);

  const terminal = document.createElement('div');
  terminal.className = 'cli-terminal';
  terminal.id = 'cli-terminal';
  const hn = escHtml(q.hostname || 'PC');
  let termHtml = '';
  if (ans.cliRan && ans.cliRan.length > 0) {
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
    btn.className = 'cli-cmd-btn' + ((ans.cliRan || []).includes(cmd) ? ' used' : '');
    btn.textContent = cmd;
    btn.onclick = () => {
      if (!ans.cliRan) ans.cliRan = [];
      if (!ans.cliRan.includes(cmd)) ans.cliRan.push(cmd);
      renderExam();
    };
    cmdRow.appendChild(btn);
  });
  box.appendChild(cmdRow);

  if (ans.cliRan && ans.cliRan.length > 0) {
    const diagDiv = document.createElement('div');
    diagDiv.className = 'cli-diagnosis';
    diagDiv.innerHTML = '<div class="cli-diag-label">DIAGNOSIS</div>';
    ['A','B','C','D'].forEach(l => {
      const btn = document.createElement('button');
      btn.className = 'option' + (ans.chosen === l ? ' exam-selected' : '');
      btn.innerHTML = '<span class="opt-letter">' + l + '</span><span class="opt-text">' + escHtml(q.options[l]) + '</span>';
      btn.onclick = () => { ans.chosen = l; renderExam(); };
      diagDiv.appendChild(btn);
    });
    box.appendChild(diagDiv);
  }
}

function renderExamTopology(q, box, ans) {
  const scenarioDiv = document.createElement('div');
  scenarioDiv.className = 'topo-scenario';
  scenarioDiv.textContent = q.scenario;
  box.appendChild(scenarioDiv);

  if (!ans.topoState) ans.topoState = {};
  const allPlaced = Object.values(ans.topoState).flat();

  const palette = document.createElement('div');
  palette.className = 'topo-palette';
  palette.innerHTML = '<div class="topo-palette-label">DEVICES <span style="font-size:11px;font-weight:400;color:var(--text-dim)">(drag to a zone, or click then click a zone)</span></div>';
  (q.devices || []).forEach(dev => {
    const btn = document.createElement('button');
    btn.className = 'topo-device' + (allPlaced.includes(dev) ? ' placed' : '') + (selectedTopoDevice === dev ? ' selected' : '');
    btn.textContent = dev;
    btn.draggable = true;
    btn.ondragstart = (e) => { e.dataTransfer.setData('text/plain', dev); e.dataTransfer.effectAllowed = 'move'; btn.classList.add('dragging'); };
    btn.ondragend = () => { btn.classList.remove('dragging'); };
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); selectedTopoDevice = dev; renderExam(); }, { passive: false });
    btn.onclick = () => { selectedTopoDevice = dev; renderExam(); };
    palette.appendChild(btn);
  });
  box.appendChild(palette);

  const zonesDiv = document.createElement('div');
  zonesDiv.className = 'topo-zones';
  (q.zones || []).forEach(zone => {
    const zoneEl = document.createElement('div');
    zoneEl.className = 'topo-zone';
    const placed = ans.topoState[zone] || [];
    const zoneId = 'topo-zone-' + zone.replace(/[^a-zA-Z0-9]/g, '-');
    zoneEl.innerHTML = '<div class="topo-zone-label">' + escHtml(zone) + '</div><div class="topo-zone-devices" id="' + zoneId + '">' +
      (placed.length === 0 ? '<span style="color:var(--text-dim);font-size:12px">Drag or click to place</span>' : placed.map(d => '<span class="topo-placed-device">' + escHtml(d) + '</span>').join('')) + '</div>';

    // Drag-and-drop handlers for exam mode
    zoneEl.ondragover = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; zoneEl.classList.add('topo-zone-dragover'); };
    zoneEl.ondragleave = () => { zoneEl.classList.remove('topo-zone-dragover'); };
    zoneEl.ondrop = (e) => {
      e.preventDefault();
      zoneEl.classList.remove('topo-zone-dragover');
      const dev = e.dataTransfer.getData('text/plain');
      if (!dev) return;
      Object.keys(ans.topoState).forEach(z => {
        ans.topoState[z] = (ans.topoState[z] || []).filter(d => d !== dev);
        if (ans.topoState[z].length === 0) delete ans.topoState[z];
      });
      if (!ans.topoState[zone]) ans.topoState[zone] = [];
      ans.topoState[zone].push(dev);
      selectedTopoDevice = null;
      renderExam();
    };

    const handleExamZonePlacement = () => {
      if (!selectedTopoDevice) return;
      Object.keys(ans.topoState).forEach(z => {
        ans.topoState[z] = (ans.topoState[z] || []).filter(d => d !== selectedTopoDevice);
        if (ans.topoState[z].length === 0) delete ans.topoState[z];
      });
      if (!ans.topoState[zone]) ans.topoState[zone] = [];
      ans.topoState[zone].push(selectedTopoDevice);
      selectedTopoDevice = null;
      renderExam();
    };
    zoneEl.onclick = handleExamZonePlacement;
    zoneEl.addEventListener('touchend', (e) => { e.preventDefault(); handleExamZonePlacement(); }, { passive: false });
    zonesDiv.appendChild(zoneEl);
  });
  box.appendChild(zonesDiv);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-ghost';
  resetBtn.style.cssText = 'font-size:13px;margin-top:8px';
  resetBtn.textContent = 'Reset Placement';
  resetBtn.onclick = () => { ans.topoState = {}; selectedTopoDevice = null; renderExam(); };
  box.appendChild(resetBtn);
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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
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

    if (fixCount > 0 || removeCount > 0) {
      console.log(`AI Validator: fixed ${fixCount}, removed ${removeCount} questions`);
    }
    return result;
  } catch (e) {
    console.warn('AI validation failed, using questions as-is:', e.message);
    return qs;
  }
}

// ══════════════════════════════════════════
// EXPLAIN FURTHER (Enhancement 5)
// ══════════════════════════════════════════
async function explainFurther() {
  const q = examMode ? examQuestions[examCurrent] : questions[current];
  if (!q) return;

  const btn = document.querySelector('.explain-btn');
  if (btn) { btn.textContent = 'Loading\u2026'; btn.disabled = true; }

  const key = apiKey || localStorage.getItem('nplus_key') || '';
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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
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
function ipToArr(ip) { return ip.split('.').map(Number); }
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
  document.getElementById('subnet-next-btn').style.display = 'none';
  document.getElementById('subnet-submit-btn').style.display = 'inline-flex';
  document.getElementById('subnet-answer').disabled = false;
  document.getElementById('subnet-answer').focus();
  document.getElementById('subnet-score').textContent = subnetCorrect + ' / ' + subnetTotal;
  document.getElementById('subnet-streak-lbl').textContent = '\ud83d\udd25 ' + subnetStreak;
}

function checkSubnetAnswer() {
  if (!subnetQ) return;
  const input = document.getElementById('subnet-answer').value.trim();
  if (!input) return;
  subnetTotal++;
  const fb = document.getElementById('subnet-feedback');
  const correct = input === subnetQ.answer || (subnetQ.altAnswer && input === subnetQ.altAnswer);
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
  document.getElementById('subnet-submit-btn').style.display = 'none';
  document.getElementById('subnet-next-btn').style.display = 'block';
  document.getElementById('subnet-answer').disabled = true;
}

// Allow Enter key in subnet input
document.addEventListener('keydown', e => {
  if (document.getElementById('page-subnet')?.classList.contains('active')) {
    if (e.key === 'Enter') {
      const nextBtn = document.getElementById('subnet-next-btn');
      if (nextBtn && nextBtn.style.display !== 'none') nextSubnetQuestion();
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

function startPortDrill() {
  const best = parseInt(localStorage.getItem('nplus_port_best') || '0');
  document.getElementById('port-best').textContent = best;
  document.getElementById('port-pregame').style.display = 'block';
  document.getElementById('port-game').style.display = 'none';
  document.getElementById('port-results').style.display = 'none';
  document.getElementById('port-timer').textContent = String(PORT_DRILL_SECONDS);
  document.getElementById('port-score').textContent = '0';
}

function beginPortDrill() {
  portScore = 0;
  portTimeLeft = PORT_DRILL_SECONDS;
  portMissed = [];
  document.getElementById('port-pregame').style.display = 'none';
  document.getElementById('port-game').style.display = 'block';
  document.getElementById('port-results').style.display = 'none';
  document.getElementById('port-timer').textContent = String(PORT_DRILL_SECONDS);
  document.getElementById('port-score').textContent = '0';
  document.getElementById('port-timer').className = 'port-timer';
  nextPortQ();
  if (portTimer) clearInterval(portTimer);
  portTimer = setInterval(() => {
    portTimeLeft--;
    document.getElementById('port-timer').textContent = portTimeLeft;
    if (portTimeLeft <= 10) document.getElementById('port-timer').className = 'port-timer port-timer-warn';
    if (portTimeLeft <= 5) document.getElementById('port-timer').className = 'port-timer port-timer-danger';
    if (portTimeLeft <= 0) endPortDrill();
  }, 1000);
}

function nextPortQ() {
  // Pick random port question — 50/50 "what port?" vs "what protocol?"
  const mode = Math.random() < 0.5 ? 'port' : 'proto';
  const correct = portData[Math.floor(Math.random() * portData.length)];
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

function pickPort(chosen, correct) {
  if (chosen === correct) {
    portScore++;
    document.getElementById('port-score').textContent = portScore;
  } else {
    portTimeLeft = Math.max(0, portTimeLeft - 1);
    document.getElementById('port-timer').textContent = portTimeLeft;
    // Log the miss for review
    if (portCurrentQ) {
      const c = portCurrentQ.correct;
      portMissed.push({ proto: c.proto, port: c.port, tp: c.tp, yourAnswer: chosen, mode: portCurrentQ.mode });
    }
    // Flash red
    document.getElementById('port-prompt').classList.add('port-flash-wrong');
    setTimeout(() => document.getElementById('port-prompt').classList.remove('port-flash-wrong'), 200);
  }
  if (portTimeLeft <= 0) { endPortDrill(); return; }
  nextPortQ();
}

function endPortDrill() {
  if (portTimer) { clearInterval(portTimer); portTimer = null; }
  document.getElementById('port-game').style.display = 'none';
  document.getElementById('port-pregame').style.display = 'none';
  document.getElementById('port-results').style.display = 'block';
  document.getElementById('port-final-score').textContent = portScore;
  const best = parseInt(localStorage.getItem('nplus_port_best') || '0');
  if (portScore > best) {
    localStorage.setItem('nplus_port_best', String(portScore));
    document.getElementById('port-best').textContent = portScore;
  }
  // Render missed answers review
  const reviewDiv = document.getElementById('port-missed-review');
  if (reviewDiv) {
    if (portMissed.length === 0) {
      reviewDiv.innerHTML = '<div class="port-review-perfect">🎯 Perfect round — no wrong answers!</div>';
    } else {
      // Deduplicate by proto (may have missed same port twice)
      const seen = new Set();
      const unique = portMissed.filter(m => { if (seen.has(m.proto)) return false; seen.add(m.proto); return true; });
      reviewDiv.innerHTML = '<h3 style="margin-bottom:10px">MISSED PORTS — LEARN THESE</h3>' +
        unique.map(m => {
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
  tb.style.display = 'none';
  tbt.innerHTML = '';
  const prompt = `Give a concise study brief for the CompTIA Network+ N10-009 topic: "${topicName}".
Include:
- 3-4 key concepts to know (one line each)
- 2 common exam traps for this topic
- 1 memory trick

Keep it under 120 words. Use plain text, no markdown. Number each section.`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
    });
    if (!res.ok) return;
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    if (text) {
      tbt.innerHTML = escHtml(text).replace(/\n/g, '<br>');
      tb.style.display = 'block';
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
          return `<div class="ana-bar-wrap" title="${escHtml(e.topic)} — ${e.pct}%">
            <div class="ana-bar" style="height:${e.pct}%;background:${color}"></div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="ana-avg">Average: <strong>${Math.round(h.reduce((a,e)=>a+e.pct,0)/h.length)}%</strong></div>
  </div>`;

  // 2. Difficulty Breakdown
  const diffs = {};
  h.forEach(e => {
    const d = e.difficulty || e.diff || 'Exam Level';
    if (!diffs[d]) diffs[d] = { correct: 0, total: 0 };
    diffs[d].correct += e.score;
    diffs[d].total += e.total;
  });
  html += `<div class="ana-card">
    <h3>DIFFICULTY BREAKDOWN</h3>
    <div class="ana-diff-grid">
      ${Object.entries(diffs).map(([d, v]) => {
        const pct = v.total > 0 ? Math.round(v.correct / v.total * 100) : 0;
        const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--yellow)' : 'var(--red)';
        return `<div class="ana-diff-item">
          <div class="ana-diff-name">${escHtml(d)}</div>
          <div class="ana-diff-bar"><div class="ana-diff-fill" style="width:${pct}%;background:${color}"></div></div>
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
      ${topicArr.map(t => {
        const color = t.avg >= 80 ? 'var(--green)' : t.avg >= 60 ? 'var(--yellow)' : 'var(--red)';
        const trendIcon = t.trend > 5 ? '\u2191' : t.trend < -5 ? '\u2193' : '\u2192';
        const trendColor = t.trend > 5 ? 'var(--green)' : t.trend < -5 ? 'var(--red)' : 'var(--text-dim)';
        return `<div class="ana-topic-row">
          <div class="ana-topic-name">${escHtml(t.topic)}</div>
          <div class="ana-topic-bar"><div class="ana-topic-fill" style="width:${t.avg}%;background:${color}"></div></div>
          <div class="ana-topic-pct" style="color:${color}">${t.avg}%</div>
          <div class="ana-topic-trend" style="color:${trendColor}" title="Trend">${trendIcon}</div>
          <div class="ana-topic-sessions">${t.sessions}x</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // 4. Study Activity Calendar (last 30 days)
  const today = new Date();
  const dayMap = {};
  h.forEach(e => {
    const d = new Date(e.date).toISOString().slice(0,10);
    dayMap[d] = (dayMap[d] || 0) + 1;
  });
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    days.push({ date: key, count: dayMap[key] || 0, day: d.toLocaleDateString('en-US',{weekday:'short'}).charAt(0), num: d.getDate() });
  }
  const maxCount = Math.max(...days.map(d => d.count), 1);
  html += `<div class="ana-card">
    <h3>STUDY ACTIVITY</h3>
    <div class="ana-subtitle">Last 30 days</div>
    <div class="ana-calendar">
      ${days.map(d => {
        const intensity = d.count > 0 ? Math.max(0.2, d.count / maxCount) : 0;
        const bg = d.count > 0 ? `rgba(124,111,247,${intensity})` : 'var(--surface3)';
        return `<div class="ana-cal-day" style="background:${bg}" title="${d.date}: ${d.count} sessions">
          <span class="ana-cal-num">${d.num}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="ana-cal-legend">
      <span>Less</span>
      <div class="ana-cal-day-sm" style="background:var(--surface3)"></div>
      <div class="ana-cal-day-sm" style="background:rgba(124,111,247,.2)"></div>
      <div class="ana-cal-day-sm" style="background:rgba(124,111,247,.5)"></div>
      <div class="ana-cal-day-sm" style="background:rgba(124,111,247,.8)"></div>
      <div class="ana-cal-day-sm" style="background:rgba(124,111,247,1)"></div>
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
            <div class="ana-exam-badge" style="background:${pass ? 'rgba(34,197,94,.1)' : 'rgba(248,113,113,.1)'};color:${pass ? 'var(--green)' : 'var(--red)'}">${pass ? 'PASS' : 'FAIL'}</div>
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
        ${weak.map((t, i) => `<div class="ana-priority-item">
          <span class="ana-priority-rank">${i+1}</span>
          <span class="ana-priority-name">${escHtml(t.topic)}</span>
          <span class="ana-priority-pct" style="color:${t.avg >= 60 ? 'var(--yellow)' : 'var(--red)'}">${t.avg}%</span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  // 7. Weekly Volume Chart
  const weeks = [0,0,0,0];
  const weekLabels = ['This Week','Last Week','2 Weeks Ago','3 Weeks Ago'];
  h.forEach(e => {
    const daysAgo = Math.floor((today - new Date(e.date)) / 86400000);
    const weekIdx = Math.floor(daysAgo / 7);
    if (weekIdx < 4) weeks[weekIdx]++;
  });
  const maxWeek = Math.max(...weeks, 1);
  html += `<div class="ana-card">
    <h3>WEEKLY VOLUME</h3>
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

  container.innerHTML = html;
}

// ══════════════════════════════════════════
// UTIL
// ══════════════════════════════════════════
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
