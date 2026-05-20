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
  function enqueueReport(rpt, store) { return store; /* TASK 1.8 */ }

  // ───────────────────────────────────────────────────────────
  // DRAWER UI (TASK 2.x)
  // ───────────────────────────────────────────────────────────

  function openDrawer() { /* TASK 2.3 */ }
  function closeDrawer() { /* TASK 2.3 */ }

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
