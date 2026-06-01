/* event-actions.js — CSP-clean event delegation (M7).
   Replaces inline on*= handlers. Loaded (defer) BEFORE app.js; globals it
   dispatches to are resolved lazily at event time, so load order is safe.
   See docs/superpowers/specs/2026-05-31-m7-csp-unsafe-inline-design.md */
(function () {
  'use strict';

  function decodeArgs(el) {
    var raw = el.dataset.args;
    if (!raw) return [];
    try { return JSON.parse(raw); }
    catch (_) { return []; }   // fail safe: no args rather than throw
  }

  // Handlers that need the event object or bespoke wiring. Checked first.
  var ACTIONS = {
    copyCmd: function (e, el) { if (typeof copyCmd === 'function') copyCmd(e, decodeArgs(el)[0]); },
    updateExamDateStop: function (e, el) {
      e.stopPropagation();
      if (typeof updateExamDate === 'function') updateExamDate(decodeArgs(el)[0]);
    },
    aclSidebar: function (e, el) {
      var key = decodeArgs(el)[0];
      var t = window.__aclSidebarHandlers;
      if (t && typeof t[key] === 'function') t[key](e, el);
    },
    // Compound: dismissDailyRecap() + goSetup()
    dismissDailyRecapGoSetup: function () {
      if (typeof dismissDailyRecap === 'function') dismissDailyRecap();
      if (typeof goSetup === 'function') goSetup();
    },
    // Compound: showPage('settings') + optional renderSettingsPage()
    goSettingsPage: function () {
      if (typeof showPage === 'function') showPage('settings');
      if (typeof renderSettingsPage === 'function') renderSettingsPage();
    },
    // Async: lazy-load the reports feature and open drawer
    openBugReport: function () {
      if (typeof _loadFeature === 'function') {
        (async function () { var m = await _loadFeature('reports'); m.openDrawer(); })();
      }
    },
    // event.preventDefault + dismissDiagnosticCta(event)
    dismissDiagnosticCtaClick: function (e) {
      e.preventDefault();
      if (typeof dismissDiagnosticCta === 'function') dismissDiagnosticCta(e);
    },
    // event.preventDefault + viewPassPlan()
    viewPassPlanPrevent: function (e) {
      e.preventDefault();
      if (typeof viewPassPlan === 'function') viewPassPlan();
    },
    // event.preventDefault + retakeDiagnostic()
    retakeDiagnosticPrevent: function (e) {
      e.preventDefault();
      if (typeof retakeDiagnostic === 'function') retakeDiagnostic();
    },
    // onchange on modes-strict-checkbox: setHardcoreMode(this.checked) + sync hardcore-checkbox
    setHardcoreModeChecked: function (e, el) {
      var checked = el.checked;
      if (typeof setHardcoreMode === 'function') setHardcoreMode(checked);
      var hc = document.getElementById('hardcore-checkbox');
      if (hc) hc.checked = checked;
    },
    // onchange on hardcore-checkbox: setHardcoreMode(this.checked)
    setHardcoreModeFromCheckbox: function (e, el) {
      if (typeof setHardcoreMode === 'function') setHardcoreMode(el.checked);
    },
    // event.preventDefault + aclOpenFromPassPlan()
    aclOpenFromPassPlanPrevent: function (e) {
      e.preventDefault();
      if (typeof aclOpenFromPassPlan === 'function') aclOpenFromPassPlan();
    },
    // onchange on progress-sort-select: setProgressSort(this.value)
    setProgressSortFromSelect: function (e, el) {
      if (typeof setProgressSort === 'function') setProgressSort(el.value);
    },
    // Trigger hidden file input click for import
    triggerImportFileInput: function () {
      var inp = document.getElementById('import-file-input');
      if (inp) inp.click();
    },
    // onchange on file input: importData(event)
    importDataFromEvent: function (e) {
      if (typeof importData === 'function') importData(e);
    },
    // Compound: _takeAutoBackup() + renderAutoBackupList()
    takeAutoBackupAndRefresh: function () {
      if (typeof _takeAutoBackup === 'function') _takeAutoBackup();
      if (typeof renderAutoBackupList === 'function') renderAutoBackupList();
    }
  };

  function run(e) {
    var el = e.target.closest && e.target.closest('[data-action]');
    if (!el) return;
    var name = el.dataset.action;
    if (ACTIONS[name]) { ACTIONS[name](e, el); return; }
    var fn = window[name];
    if (typeof fn === 'function') fn.apply(null, decodeArgs(el));
  }

  document.addEventListener('click', run);
  document.addEventListener('change', run);
  document.addEventListener('input', run);

  // Expose for tests + for app.js to register additional ACTIONS if needed.
  window.__eventActions = { run: run, ACTIONS: ACTIONS, decodeArgs: decodeArgs };
})();
