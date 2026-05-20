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
  function renderIssueBody(payload) { return ''; /* TASK 1.4 */ }
  function classifyError(resp) { return null; /* TASK 1.6 */ }
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
