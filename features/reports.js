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

  // ───────────────────────────────────────────────────────────
  // SUBMIT HELPERS (TASK 4.1)
  // ───────────────────────────────────────────────────────────

  var GH_OWNER = 'oremosu98';
  var GH_REPO = 'networkplus-quiz';

  function _showToast(opts) {
    var existing = document.querySelector('.br-toast');
    if (existing) existing.parentNode.removeChild(existing);
    var t = document.createElement('div');
    var tone = opts.tone || 'ok';
    t.className = 'br-toast ' + tone;
    var icon = tone === 'ok' ? '&check;' : (tone === 'amber' ? '&#8635;' : '&times;');
    t.innerHTML =
      '<div class="br-toast-i">' + icon + '</div>' +
      '<div><div class="br-toast-t">' + (opts.title || '') + '</div>' +
      (opts.sub ? '<div class="br-toast-l">' + opts.sub + '</div>' : '') + '</div>';
    if (opts.url) {
      t.classList.add('br-toast-link');
      t.addEventListener('click', function(){ window.open(opts.url, '_blank', 'noopener'); });
    }
    document.body.appendChild(t);
    requestAnimationFrame(function(){ t.classList.add('open'); });
    setTimeout(function(){
      t.classList.remove('open');
      setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, opts.duration || 5000);
  }

  function _loadQueue() {
    try { return JSON.parse(localStorage.getItem(STORAGE.BUG_REPORTS) || '[]'); }
    catch (e) { return []; }
  }
  function _saveQueue(q) {
    try { localStorage.setItem(STORAGE.BUG_REPORTS, JSON.stringify(q)); } catch (e) {}
  }

  function _certBadgeClass() {
    try { return 'cert:' + (window.CURRENT_CERT || 'unknown'); } catch (e) { return 'cert:unknown'; }
  }

  function _updateTopbarDot() {
    var btn = document.getElementById('topbar-bug-report');
    if (!btn) return;
    var q = _loadQueue();
    btn.classList.toggle('has-queue', q.length > 0);
  }

  // Stubs that later tasks will implement; provide empty bodies so openDrawer doesn't error
  function _wireForm(host) {
    var titleEl = host.querySelector('#br-input-title');
    var descEl = host.querySelector('#br-input-desc');
    var sendEl = host.querySelector('#br-send');
    var stepsToggle = host.querySelector('#br-steps-toggle');
    var counter = host.querySelector('#br-desc-counter');
    var titleErr = host.querySelector('#br-title-err');
    var descErr = host.querySelector('#br-desc-err');

    function updateSend() {
      var t = titleEl.value.trim();
      var d = descEl.value.trim();
      var ok = t.length > 0 && d.length > 0 && _hasToken();
      sendEl.disabled = !ok;
    }

    function updateCounter() {
      var len = descEl.value.length;
      if (len >= 4000) {
        counter.hidden = false;
        counter.textContent = len.toLocaleString() + ' / 5,000';
        counter.classList.toggle('warn', len >= 4000);
      } else {
        counter.hidden = true;
      }
    }

    titleEl.addEventListener('input', function(){
      titleEl.classList.remove('err'); titleErr.hidden = true; updateSend();
    });
    descEl.addEventListener('input', function(){
      descEl.classList.remove('err'); descErr.hidden = true;
      updateCounter(); updateSend();
    });

    // Steps-to-reproduce expander
    var stepsInserted = false;
    stepsToggle.addEventListener('click', function(){
      if (stepsInserted) return;
      stepsInserted = true;
      var field = document.createElement('div');
      field.className = 'br-field';
      field.innerHTML =
        '<label class="br-label" for="br-input-steps">Steps to reproduce <span style="color:var(--text-dim);font-weight:400;font-size:9.5px">(optional)</span></label>' +
        '<textarea class="br-textarea" id="br-input-steps" maxlength="2000" placeholder="1. ...&#10;2. ...&#10;3. ..."></textarea>';
      stepsToggle.parentNode.insertBefore(field, stepsToggle);
      stepsToggle.hidden = true;
      var stepsEl = host.querySelector('#br-input-steps');
      stepsEl.focus();
    });

    updateSend();
  }
  function _wireSubmit(host) {
    host.querySelector('#br-send').addEventListener('click', async function(){
      var sendBtn = host.querySelector('#br-send');
      sendBtn.disabled = true;
      var form = {
        title: host.querySelector('#br-input-title').value,
        desc: host.querySelector('#br-input-desc').value,
        steps: (host.querySelector('#br-input-steps') || {}).value || null,
      };
      var payload = buildPayload(form, _getCtx());
      var result = await submitReport(payload);

      if (result.type === 'success') {
        _showToast({ tone: 'ok', title: 'Report filed',
          sub: 'Issue <b>#' + result.issue_number + '</b> · tap to open',
          url: result.issue_url });
        // Clear from queue if this was a retry
        var q = _loadQueue();
        _saveQueue(q.filter(function(r){ return r.id !== payload.id; }));
        closeDrawer();
        _updateTopbarDot();
        return;
      }

      // Failure paths
      if (result.queueAction === 'enqueue' || result.queueAction === 'requeue') {
        var q2 = _loadQueue();
        var record = {
          id: payload.id, payload: payload,
          attempts: 1, last_try: payload.submitted_at,
          next_try: result.next_try || null,
          terminal: !!result.terminal,
        };
        _saveQueue(enqueueReport(record, q2));
      }
      _showToast({ tone: result.toast.tone, title: result.toast.title });
      sendBtn.disabled = false;
      _updateTopbarDot();
    });
  }

  // ───────────────────────────────────────────────────────────
  // SUBMIT + RETRY (TASK 5.x, 6.x)
  // ───────────────────────────────────────────────────────────

  async function submitReport(payload) {
    var token;
    try { token = localStorage.getItem(STORAGE.GH_TOKEN); } catch (e) { token = null; }
    if (!token) {
      return classifyError({ status: 401 });
    }

    var body = renderIssueBody(payload);
    var labels = ['bug-report', _certBadgeClass(), 'version:' + (payload.context && payload.context.version) ];

    try {
      var resp = await fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/issues', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '[user-report] ' + payload.title,
          body: body,
          labels: labels,
        }),
      });

      var rlRem = parseInt(resp.headers.get('x-ratelimit-remaining') || '-1', 10);
      var rlReset = parseInt(resp.headers.get('x-ratelimit-reset') || '0', 10);
      if (resp.ok) {
        var json = await resp.json();
        return Object.assign(classifyError({ status: resp.status }), {
          issue_number: json.number, issue_url: json.html_url,
        });
      }
      var respBody = null;
      try { respBody = await resp.json(); } catch (e) {}
      var cls = classifyError({
        status: resp.status,
        ratelimit_remaining: rlRem >= 0 ? rlRem : undefined,
        ratelimit_reset: rlReset || undefined,
        body: respBody,
      });
      if (cls.type === 'payload') {
        try { console.error('[bug-report] 422 payload rejected:', respBody); } catch (e) {}
      }
      return cls;
    } catch (e) {
      return classifyError({ status: 0, network: true });
    }
  }
  async function drainQueue() {
    var q = _loadQueue();
    if (!q.length) return;

    var keep = [];
    var landed = 0;
    for (var i = 0; i < q.length; i++) {
      var entry = q[i];
      if (entry.terminal) { keep.push(entry); continue; }
      if (entry.next_try && Date.now() < entry.next_try * 1000) {
        keep.push(entry); continue;
      }
      // One attempt
      var result = await submitReport(entry.payload);
      if (result.type === 'success') {
        landed++;
        continue; // don't keep
      }
      entry.attempts = (entry.attempts || 1) + 1;
      entry.last_try = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      entry.next_try = result.next_try || null;
      entry.terminal = !!result.terminal;
      keep.push(entry);
    }
    _saveQueue(keep);
    _updateTopbarDot();

    if (landed > 0) {
      _showToast({ tone: 'ok',
        title: 'Filed offline ' + (landed === 1 ? 'report' : 'reports'),
        sub: landed + ' queued ' + (landed === 1 ? 'report' : 'reports') + ' just landed',
      });
    }
  }

  // ───────────────────────────────────────────────────────────
  // SETTINGS PANEL (TASK 7.x)
  // ───────────────────────────────────────────────────────────

  function renderSettingsReportsPanel(host) {
    if (!host) return;
    var q = _loadQueue();
    var rows = q.map(function(r){
      var status = r.terminal ? 'hf' : 'tr';
      var statusLabel = r.terminal ? 'Failed' : 'Pending';
      var ago = r.last_try ? _ago(r.last_try) : '';
      return (
        '<div class="br-sp-row" data-id="' + r.id + '">' +
          '<div class="br-sp-status br-sp-' + status + '"><span class="br-sp-dot"></span>' + statusLabel + '</div>' +
          '<div class="br-sp-body"><div class="br-sp-title">' + _esc(r.payload.title) + '</div>' +
            '<div class="br-sp-sub">' + r.id + ' · ' + (r.attempts || 1) + ' attempt' + ((r.attempts || 1) === 1 ? '' : 's') + '</div></div>' +
          '<div class="br-sp-when">' + ago + '</div>' +
          '<div class="br-sp-acts">' +
            '<button class="br-sp-retry" data-id="' + r.id + '">Retry</button>' +
            '<button class="br-sp-del" data-id="' + r.id + '">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    host.innerHTML =
      '<div class="br-sp-hd"><div class="br-sp-eyb">&sect; Reports</div>' +
      '<h4>Pending reports</h4><div class="br-sp-meta">' + q.length + ' queued · drains on next page load</div></div>' +
      '<div class="br-sp-list">' + (rows || '<div class="br-sp-empty">No queued reports.</div>') + '</div>';

    // Wire retry/delete
    host.querySelectorAll('.br-sp-retry').forEach(function(b){
      b.addEventListener('click', async function(){
        var id = b.getAttribute('data-id');
        var qNow = _loadQueue();
        var entry = qNow.find(function(x){ return x.id === id; });
        if (!entry) return;
        var result = await submitReport(entry.payload);
        if (result.type === 'success') {
          _saveQueue(qNow.filter(function(x){ return x.id !== id; }));
        } else {
          entry.attempts = (entry.attempts || 1) + 1;
          entry.terminal = !!result.terminal;
          _saveQueue(qNow);
        }
        renderSettingsReportsPanel(host);
        _updateTopbarDot();
      });
    });
    host.querySelectorAll('.br-sp-del').forEach(function(b){
      b.addEventListener('click', function(){
        var id = b.getAttribute('data-id');
        _saveQueue(_loadQueue().filter(function(x){ return x.id !== id; }));
        renderSettingsReportsPanel(host);
        _updateTopbarDot();
      });
    });
  }

  function _ago(iso) {
    try {
      var t = new Date(iso).getTime(); var s = Math.floor((Date.now() - t) / 1000);
      if (s < 60) return s + 's ago';
      if (s < 3600) return Math.floor(s/60) + 'm ago';
      if (s < 86400) return Math.floor(s/3600) + 'h ago';
      return Math.floor(s/86400) + 'd ago';
    } catch (e) { return ''; }
  }
  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }

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
