// ══════════════════════════════════════════
// Network+ AI Quiz — app.js  v3.1
// ══════════════════════════════════════════

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
let examTimeLeft   = 5400;
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
  if (h.length > 60) h.length = 60;
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
function getSpacedRepTopic() {
  const allTopics = Array.from(document.querySelectorAll('#topic-group .chip'))
    .map(c => c.dataset.v)
    .filter(v => v !== 'Mixed \u2014 All Topics' && !v.includes('Smart'));
  const h = loadHistory().filter(e => e.topic !== 'Mixed \u2014 All Topics' && e.topic !== 'Exam Simulation');
  const now = Date.now();
  let bestTopic = allTopics[Math.floor(Math.random() * allTopics.length)];
  let bestScore = -1;
  allTopics.forEach(t => {
    const entries = h.filter(e => e.topic === t);
    let score;
    if (entries.length === 0) {
      score = 1.0;
    } else {
      const daysSince = (now - new Date(entries[0].date)) / 86400000;
      const recentAvg = entries.slice(0, 3).reduce((a, e) => a + e.pct, 0) / Math.min(entries.length, 3);
      score = (Math.min(daysSince, 14) / 14) * 0.4 + ((100 - recentAvg) / 100) * 0.6;
    }
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
  try {
    questions = await fetchQuestions(key, activeQuizTopic, diff, qCount);
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
  examTimeLeft  = 5400;
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
    examAnswers = examQuestions.map(() => ({ chosen: null, flagged: false, msChosen: [], orderSeq: [] }));
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

CRITICAL — ANSWER KEY VALIDATION (do this before outputting):
For every question, verify these three things match each other:
1. The option text at the letter in "answer" must be the factually correct answer
2. The "explanation" must say THAT same letter is correct
3. If your explanation contradicts the "answer" field, fix the "answer" field to match the correct option
Never output a question where the explanation and the answer field disagree.

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

  const answeredCount = examAnswers.filter(a => a.chosen !== null || a.msChosen.length > 0 || a.orderSeq.length > 0).length;
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
    const hasAnswer = a.chosen !== null || a.msChosen.length > 0 || a.orderSeq.length > 0;
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
  const answeredCount = examAnswers.filter(a => a.chosen !== null || a.msChosen.length > 0 || a.orderSeq.length > 0).length;
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
    } else {
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
    } else {
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
    const typeBadge = qType !== 'mcq' ? `<span class="pbq-badge" style="margin-bottom:8px;display:inline-block">${qType === 'multi-select' ? 'Multi-Select' : 'Ordering'}</span><br>` : '';

    div.innerHTML = `
      <div class="review-q">${i+1}. ${escHtml(q.question)}</div>
      ${typeBadge}${flagTag}${skippedTag}
      ${optsHtml}
      <div class="review-exp">${escHtml(q.explanation)}</div>`;
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

  if (['A','B','C','D'].includes(key)) {
    if (onQuiz) {
      const q = questions[current];
      if (getQType(q) === 'mcq') pick(key, q);
    } else if (onExam) {
      const q = examQuestions[examCurrent];
      if (getQType(q) === 'mcq') {
        examAnswers[examCurrent].chosen = key;
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
  const allTopics = Array.from(document.querySelectorAll('#topic-group .chip'))
    .map(c => c.dataset.v)
    .filter(v => !v.includes('Mixed') && !v.includes('Smart'));
  const h   = loadHistory().filter(e => e.topic !== 'Mixed \u2014 All Topics' && e.topic !== 'Exam Simulation');
  const now = Date.now();

  const scored = allTopics.map(t => {
    const entries = h.filter(e => e.topic === t);
    let score, reason, color;
    if (entries.length === 0) {
      score = 1.0; reason = 'Never studied'; color = 'var(--text-dim)';
    } else {
      const daysSince = (now - new Date(entries[0].date)) / 86400000;
      const recentAvg = entries.slice(0, 3).reduce((a, e) => a + e.pct, 0) / Math.min(entries.length, 3);
      score = (Math.min(daysSince, 14) / 14) * 0.4 + ((100 - recentAvg) / 100) * 0.6;
      if (recentAvg < 60) { reason = Math.round(recentAvg) + '% avg \u2014 needs work'; color = 'var(--red)'; }
      else if (daysSince >= 7) { reason = Math.round(daysSince) + 'd since last drill'; color = 'var(--yellow)'; }
      else if (recentAvg < 80) { reason = Math.round(recentAvg) + '% avg \u2014 room to improve'; color = 'var(--yellow)'; }
      else { reason = Math.round(recentAvg) + '% avg \u2014 keep sharp'; color = 'var(--green)'; }
    }
    return { topic: t, score, reason, color };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map(({ topic, reason, color }) => ({ topic, reason, color }));
}

function renderSessionBanner() {
  const plan = buildSessionPlan(3);
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
  sessionPlan    = buildSessionPlan(3);
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
    'Session ' + (sessionStep + 1) + '/3 \u2014 ' + sTopic + '\u2026';

  showCacheNotice(false);
  try {
    questions = await fetchQuestions(apiKey, sTopic, 'Mixed', 7);
  } catch(e) {
    const cached = getCachedQuestions(sTopic, 'Mixed', 7);
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
    version: '3.1',
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
      if (merged.length > 200) merged.length = 200;
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
// UTIL
// ══════════════════════════════════════════
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
