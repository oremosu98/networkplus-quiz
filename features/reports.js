// features/reports.js — v5.6.x bug-report drawer + retry queue
// Lazy-loaded via _loadFeature('reports') from the topbar bug iconbtn
// and from DOMContentLoaded (queue drain). Self-contained: zero deps
// on other feature modules.
//
// No `enter` / `leave` lifecycle (the standard feature-module pattern)
// because this is a drawer + queue feature, not a page. Entry points are
// `openDrawer()` (UI from topbar) and `drainQueue()` (DOMContentLoaded).

(function () {
  'use strict';

  // ───────────────────────────────────────────────────────────
  // PURE FUNCTIONS (testable in isolation via vm-sandbox)
  // ───────────────────────────────────────────────────────────

  function buildPayload(form, ctx) {
    // ISO-no-colons + 4-char hex random for stable ID across retries
    var iso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); // strip ms
    var idIso = iso.replace(/:/g, '-');
    var hex = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    var id = 'rpt_' + idIso.replace(/Z$/, '') + '_' + hex;

    function trim(s) { return (s == null ? '' : String(s)).trim(); }

    return {
      id: id,
      title: trim(form && form.title),
      description: trim(form && form.desc),
      steps: form && form.steps ? trim(form.steps) : null,
      context: {
        version: (ctx && ctx.version) || 'unknown',
        page: (ctx && ctx.page) || 'unknown',
        cert: (ctx && ctx.cert) || 'unknown',
        theme: (ctx && ctx.theme) || 'unknown',
        viewport: (ctx && ctx.viewport) || 'unknown',
        last_quiz: (ctx && ctx.last_quiz) || null,
        wrong_bank_size: (ctx && typeof ctx.wrong_bank_size === 'number') ? ctx.wrong_bank_size : 0,
      },
      submitted_at: iso,
      attempt_count: 1,
    };
  }
  function renderIssueBody(payload) {
    var p = payload || {};
    var c = p.context || {};
    var lq = c.last_quiz;
    var lqLine = lq ? (lq.topic + ' · ' + lq.score + ' · ' + lq.minutes_ago + 'm ago') : 'none';
    var stepsBlock = p.steps ? p.steps : '_not provided_';

    var out = [];
    out.push('## What happened');
    out.push('');
    out.push(p.description || '');
    out.push('');
    out.push('## Steps to reproduce');
    out.push('');
    out.push(stepsBlock);
    out.push('');
    out.push('<details>');
    out.push('<summary>Auto-attached context</summary>');
    out.push('');
    out.push('| field | value |');
    out.push('|---|---|');
    out.push('| version | ' + (c.version || '') + ' |');
    out.push('| page | ' + (c.page || '') + ' |');
    out.push('| cert | ' + (c.cert || '') + ' |');
    out.push('| theme | ' + (c.theme || '') + ' |');
    out.push('| viewport | ' + (c.viewport || '') + ' |');
    out.push('| last quiz | ' + lqLine + ' |');
    out.push('| wrong-bank | ' + (typeof c.wrong_bank_size === 'number' ? c.wrong_bank_size : 0) + ' |');
    out.push('');
    out.push('</details>');
    out.push('');
    out.push('---');
    out.push('_Filed via in-app reporter · id: ' + (p.id || '') + '_');
    return out.join('\n');
  }
  function classifyError(resp) {
    var r = resp || {};
    var status = r.status;

    if (status === 200 || status === 201) {
      return { type: 'success', queueAction: 'clear', toast: { tone: 'ok', title: 'Report filed' }, terminal: false };
    }
    if (status === 0 || r.network) {
      return { type: 'offline', queueAction: 'enqueue',
        toast: { tone: 'amber', title: 'Saved offline · retries on next visit' }, terminal: false };
    }
    if (status >= 500) {
      return { type: 'server', queueAction: 'enqueue',
        toast: { tone: 'amber', title: 'GitHub error · retries on next visit' }, terminal: false };
    }
    if (status === 403 && typeof r.ratelimit_remaining === 'number' && r.ratelimit_remaining === 0) {
      return { type: 'ratelimit', queueAction: 'requeue',
        toast: { tone: 'amber', title: 'Rate-limited · retries soon' },
        next_try: r.ratelimit_reset || null, terminal: false };
    }
    if (status === 403) {
      return { type: 'scope', queueAction: 'enqueue',
        toast: { tone: 'red', title: 'Token lacks scope · update in Settings' }, terminal: true };
    }
    if (status === 401) {
      return { type: 'auth', queueAction: 'enqueue',
        toast: { tone: 'red', title: 'Token rejected · open Settings' }, terminal: true };
    }
    if (status === 422) {
      return { type: 'payload', queueAction: 'enqueue',
        toast: { tone: 'red', title: "Couldn't send · check console" }, terminal: true };
    }
    // Unknown 4xx — treat as terminal payload error
    return { type: 'unknown', queueAction: 'enqueue',
      toast: { tone: 'red', title: "Couldn't send (HTTP " + status + ')' }, terminal: true };
  }
  function enqueueReport(rpt, store) {
    var QUEUE_CAP = 25;
    var s = (store || []).slice();
    // Update in place if same id
    var idx = -1;
    for (var i = 0; i < s.length; i++) { if (s[i].id === rpt.id) { idx = i; break; } }
    if (idx > -1) {
      s[idx] = rpt;
      return s;
    }
    // Append
    s.push(rpt);
    // LRU: drop oldest non-terminal first, else oldest period
    while (s.length > QUEUE_CAP) {
      var dropAt = -1;
      for (var j = 0; j < s.length; j++) { if (!s[j].terminal) { dropAt = j; break; } }
      if (dropAt === -1) dropAt = 0;
      s.splice(dropAt, 1);
    }
    return s;
  }

  // ───────────────────────────────────────────────────────────
  // DRAWER UI (TASK 2.x)
  // ───────────────────────────────────────────────────────────

  function _drawerHtml(ctx) {
    var c = ctx || {};
    var lq = c.last_quiz;
    var ctxLine =
      '<b>' + (c.version || '?') + '</b> &middot; ' +
      (c.page || '?') + ' &middot; ' +
      (c.cert || '?') + ' &middot; ' +
      (c.theme || '?') + ' &middot; ' +
      (c.viewport || '?') + ' &middot; ' +
      (lq ? 'last quiz: ' + lq.topic + ' <b>' + lq.score + '</b> ' + lq.minutes_ago + 'm ago' : 'no recent quiz') +
      ' &middot; wrong-bank: <b>' + (typeof c.wrong_bank_size === 'number' ? c.wrong_bank_size : 0) + '</b>';

    return (
      '<div class="br-backdrop" id="br-backdrop"></div>' +
      '<div class="br-drawer" id="bug-report-drawer" role="dialog" aria-modal="true" aria-labelledby="br-title">' +
        '<div class="br-head">' +
          '<div>' +
            '<div class="br-eyebrow">&sect; Report</div>' +
            '<h3 class="br-title" id="br-title">Report an issue</h3>' +
          '</div>' +
          '<button type="button" class="br-close" id="br-close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<div class="br-body">' +
          '<div class="br-field">' +
            '<label class="br-label" for="br-input-title">Title <span class="br-req">*</span></label>' +
            '<input class="br-input" id="br-input-title" type="text" maxlength="200" placeholder="What happened in one line?">' +
            '<div class="br-caption br-caption-err" id="br-title-err" hidden>Title is required</div>' +
          '</div>' +
          '<div class="br-field">' +
            '<label class="br-label" for="br-input-desc">Description <span class="br-req">*</span><span class="br-counter" id="br-desc-counter" hidden></span></label>' +
            '<textarea class="br-textarea" id="br-input-desc" maxlength="5000" placeholder="What you did, what happened, what you expected."></textarea>' +
            '<div class="br-caption br-caption-err" id="br-desc-err" hidden>Description is required</div>' +
          '</div>' +
          '<button type="button" class="br-steps-link" id="br-steps-toggle">' +
            '<span class="br-plus">+</span><span>Add steps to reproduce</span>' +
          '</button>' +
          '<div class="br-ctx">' +
            '<span class="br-ctx-h">Auto-attached</span>' +
            '<span class="br-ctx-fields">' + ctxLine + '</span>' +
          '</div>' +
          '<div class="br-no-token" id="br-no-token" hidden>' +
            '<b>Setup needed</b>' +
            '<span>Add a GitHub personal access token in <a href="#" id="br-open-settings">Settings &rsaquo; Integrations</a> to file reports.</span>' +
          '</div>' +
        '</div>' +
        '<div class="br-foot">' +
          '<button type="button" class="br-cancel" id="br-cancel">Cancel</button>' +
          '<button type="button" class="br-send" id="br-send">Send report</button>' +
        '</div>' +
      '</div>'
    );
  }

  var _drawerHost = null;
  var _drawerOpenedAt = 0;
  var _prevFocus = null;
  var _escListener = null;

  function _getCtx() {
    function safeRead(fn) { try { return fn(); } catch (e) { return null; } }
    var theme = safeRead(function(){ return document.documentElement.getAttribute('data-theme') || 'dark'; });
    var page = safeRead(function(){
      var pages = document.querySelectorAll('.page.active'); return pages.length ? '#' + pages[0].id : 'unknown';
    });
    var cert = safeRead(function(){
      // Read from CERT_PACK if available; fall back to localStorage CURRENT_CERT
      if (window.CERT_PACK && window.CERT_PACK.meta) {
        return (window.CURRENT_CERT || 'netplus') + '-' + window.CERT_PACK.meta.objectiveCode;
      }
      return (window.CURRENT_CERT || 'unknown');
    });
    var version = safeRead(function(){ return window.APP_VERSION || 'unknown'; });
    var viewport = window.innerWidth + 'x' + window.innerHeight;
    var lastQuiz = safeRead(function(){
      if (typeof loadHistory !== 'function') return null;
      var h = loadHistory();
      if (!h || !h.length) return null;
      var last = h[0];
      var minsAgo = Math.round((Date.now() - last.timestamp) / 60000);
      return { topic: last.topic, score: last.correct + '/' + last.total, minutes_ago: minsAgo };
    });
    var wrongBankSize = safeRead(function(){
      if (typeof loadWrongBank !== 'function') return 0;
      return (loadWrongBank() || []).length;
    }) || 0;

    return {
      version: version, page: page, cert: cert, theme: theme,
      viewport: viewport, last_quiz: lastQuiz, wrong_bank_size: wrongBankSize,
    };
  }

  function _hasToken() {
    try { return !!localStorage.getItem(STORAGE.GH_TOKEN); } catch (e) { return false; }
  }

  function openDrawer() {
    if (_drawerHost) return; // idempotent
    _prevFocus = document.activeElement;

    var ctx = _getCtx();
    var host = document.createElement('div');
    host.id = 'br-portal';
    host.innerHTML = _drawerHtml(ctx);
    document.body.appendChild(host);
    _drawerHost = host;
    _drawerOpenedAt = Date.now();

    // Disable token banner if token exists
    if (!_hasToken()) {
      host.querySelector('#br-no-token').hidden = false;
    }

    // Wire ESC + backdrop click + close × + cancel
    _escListener = function (e) { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', _escListener);
    host.querySelector('#br-backdrop').addEventListener('click', closeDrawer);
    host.querySelector('#br-close').addEventListener('click', closeDrawer);
    host.querySelector('#br-cancel').addEventListener('click', closeDrawer);

    // Settings deep-link
    var settingsLink = host.querySelector('#br-open-settings');
    if (settingsLink) settingsLink.addEventListener('click', function(e){
      e.preventDefault(); closeDrawer();
      if (typeof showPage === 'function') showPage('settings');
    });

    // Reveal with motion next frame (so transform transitions instead of snapping)
    requestAnimationFrame(function(){
      host.querySelector('#br-backdrop').classList.add('open');
      host.querySelector('#bug-report-drawer').classList.add('open');
      setTimeout(function(){
        var titleInput = host.querySelector('#br-input-title');
        if (titleInput) titleInput.focus();
      }, 220);
    });

    _wireForm(host); // TASK 3.x
    _wireSubmit(host); // TASK 5.x
  }

  function closeDrawer() {
    if (!_drawerHost) return;
    var host = _drawerHost;
    host.querySelector('#br-backdrop').classList.remove('open');
    var drawer = host.querySelector('#bug-report-drawer');
    drawer.classList.remove('open');
    document.removeEventListener('keydown', _escListener);
    _escListener = null;

    // Wait for transition before removing from DOM
    setTimeout(function(){
      if (host.parentNode) host.parentNode.removeChild(host);
      _drawerHost = null;
      if (_prevFocus && _prevFocus.focus) _prevFocus.focus();
      _prevFocus = null;
    }, 240);
  }

  // Stubs that later tasks will implement; provide empty bodies so openDrawer doesn't error
  function _wireForm(host) {}
  function _wireSubmit(host) {}

  // ───────────────────────────────────────────────────────────
  // SUBMIT + RETRY (TASK 5.x, 6.x)
  // ───────────────────────────────────────────────────────────

  async function submitReport(payload) { /* TASK 5.1 */ }
  async function drainQueue() { /* TASK 6.1 */ }

  // ───────────────────────────────────────────────────────────
  // SETTINGS PANEL (TASK 7.x)
  // ───────────────────────────────────────────────────────────

  function renderSettingsReportsPanel(host) { /* TASK 7.1 */ }

  // Register on the standard feature-modules contract
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures.reports = {
    // Pure (exposed for testing)
    buildPayload: buildPayload,
    renderIssueBody: renderIssueBody,
    classifyError: classifyError,
    enqueueReport: enqueueReport,
    // UI
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    // Pipeline
    submitReport: submitReport,
    drainQueue: drainQueue,
    // Settings
    renderSettingsReportsPanel: renderSettingsReportsPanel,
  };
})();
