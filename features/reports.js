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

  function buildPayload(form, ctx) { return null; /* TASK 1.2 */ }
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
