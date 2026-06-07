// lib/onboarding-home.js — Onboarding tier chrome (Phase 2): home bar + cert switcher.
//
// The post-activation home surfaces lifted from mockups/onboarding-batch2-concept.html:
//   • Free home — quota meter (Daily Review due · New practice X/15) + "Add an exam · Pro".
//   • Pro home  — a cert switcher pill that opens the "Your exams" sheet (per-cert
//     readiness, Take-diagnostic for an exam not started yet).
//   • Wires the upgrade-sheet triggers (daily cap / add a cert) onto STUBBED tier +
//     quota state. Entitlements are saas-gated (#136), so this is display + a soft
//     daily counter only — no hard enforcement, no Stripe.
//
// GUARDED — OFF BY DEFAULT. Inert unless the onboarding flag is on (localStorage
// 'onb_router', set by ?onb=1). Tier is a preview stub: ?onbtier=pro|free (persisted)
// lets a preview exercise both homes; default follows the router stub ('free').
//
// It injects ONE element — .onb-home-bar — as the first child of the home bento
// (main.board inside #page-setup). It never rewrites the existing home. Mount /
// unmount is driven by wrapping window.showPage, patched at DOMContentLoaded AFTER
// app.js has defined it; app.js itself stays untouched (keeps this off the files
// that overlap the in-flight mobile-fit2 branch).
//
// Sec-P7: no inline on* handlers. Delegated clicks read data-home-action.

(function () {
  'use strict';

  // ── guard + stubbed tier ────────────────────────────────────────────────────
  function guardOn() {
    try {
      var s = location.search || '';
      if (s.indexOf('onbtier=pro') !== -1) localStorage.setItem('onb_tier', 'pro');
      if (s.indexOf('onbtier=free') !== -1) localStorage.removeItem('onb_tier');
      return localStorage.getItem('onb_router') === '1';
    } catch (_) { return false; }
  }
  function tier() {
    try { if (localStorage.getItem('onb_tier') === 'pro') return 'pro'; } catch (_) {}
    return 'free';
  }

  var ENABLED = guardOn();
  var REDUCE = false;
  try { REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

  // The 8 certs (static metadata; mirrors onboarding-firstrun.js + the cert packs).
  var CERTS = [
    { id: 'netplus',     name: 'Network+',           vendor: 'N10-009',  mark: 'N+'  },
    { id: 'secplus',     name: 'Security+',          vendor: 'SY0-701',  mark: 'S+'  },
    { id: 'aplus-core1', name: 'A+ Core 1',          vendor: '220-1101', mark: 'A+'  },
    { id: 'aplus-core2', name: 'A+ Core 2',          vendor: '220-1102', mark: 'A+'  },
    { id: 'az900',       name: 'AZ-900',             vendor: 'Azure Fundamentals',    mark: 'AZ'  },
    { id: 'ai900',       name: 'AI-900',             vendor: 'Azure AI Fundamentals', mark: 'AI'  },
    { id: 'sc900',       name: 'SC-900',             vendor: 'Security Fundamentals',  mark: 'SC'  },
    { id: 'clfc02',      name: 'Cloud Practitioner', vendor: 'CLF-C02',  mark: 'CLF' }
  ];

  var NEW_Q_CAP = 15;   // free daily new-question cap (display only; #136 enforces)
  var REVIEW_CAP = 5;   // free daily review cap

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function certById(id) { for (var i = 0; i < CERTS.length; i++) if (CERTS[i].id === id) return CERTS[i]; return null; }
  function currentCertId() { return (window.CURRENT_CERT) || (state.certId) || 'netplus'; }

  var state = { certId: null };
  var enteredOnce = false;   // entrance animation plays only the first time the bar appears

  // ── real-ish data reads (cheap, read-only) ───────────────────────────────────
  // Per-cert readiness score from the shipped snapshot store; null if not scored.
  function readinessFor(certId) {
    try {
      var raw = localStorage.getItem('nplus_readiness_snapshots');
      if (!raw) return null;
      var snaps = JSON.parse(raw) || {};
      var s = snaps[certId];
      if (s && typeof s.score === 'number') return Math.round(s.score);
      if (typeof s === 'number') return Math.round(s);
    } catch (_) {}
    return null;
  }
  function isActivated(certId) { return readinessFor(certId) != null; }
  function dueCount() {
    try { if (typeof window.getSrDueCount === 'function') return window.getSrDueCount() | 0; } catch (_) {}
    return 0;
  }
  // Stubbed soft counter for new questions answered today (#136 owns the real one).
  function todayKey() { try { return (new Date()).toISOString().slice(0, 10); } catch (_) { return 'x'; } }
  function newUsed() {
    try { return Math.max(0, parseInt(localStorage.getItem('onb_q_new_' + todayKey()) || '0', 10) || 0); } catch (_) { return 0; }
  }
  function setNewUsed(n) {
    try { localStorage.setItem('onb_q_new_' + todayKey(), String(Math.max(0, n | 0))); } catch (_) {}
  }
  function hoursToReset() {
    try {
      var now = new Date();
      var end = new Date(now); end.setHours(24, 0, 0, 0);
      return Math.max(1, Math.ceil((end - now) / 3600000));
    } catch (_) { return 6; }
  }

  // ── the home bar ──────────────────────────────────────────────────────────────
  function svgChevron() { return '<svg class="onb-hb-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'; }

  function switcherPill() {
    var c = certById(currentCertId()) || CERTS[0];
    return '<button type="button" class="onb-hb-switcher" data-home-action="open-switcher" aria-haspopup="dialog">'
      + '<span class="onb-hb-mark">' + esc(c.mark) + '</span>'
      + '<span class="onb-hb-ct"><span class="onb-hb-name">' + esc(c.name) + '</span><span class="onb-hb-code">' + esc(c.vendor) + '</span></span>'
      + svgChevron()
      + '</button>';
  }

  function quotaRows(t) {
    var due = dueCount();
    var reviewVal = t === 'pro'
      ? (due + ' due')
      : (due > REVIEW_CAP ? (REVIEW_CAP + ' of ' + REVIEW_CAP + ' today') : (due + (due === 1 ? ' card due' : ' cards due')));
    var newRow;
    if (t === 'pro') {
      newRow = '<div class="onb-hb-row"><span class="onb-hb-rn">New practice</span><span class="onb-hb-rv onb-hb-rv-free">Unlimited</span></div>';
    } else {
      var used = Math.min(newUsed(), NEW_Q_CAP);
      var capped = used >= NEW_Q_CAP;
      var pctw = Math.round(used / NEW_Q_CAP * 100);
      var rv = capped
        ? '<button type="button" class="onb-hb-capbtn" data-home-action="cap-hit">Resets in ' + hoursToReset() + 'h</button>'
        : (used + ' / ' + NEW_Q_CAP + ' today');
      newRow = '<div class="onb-hb-row">'
        + '<span class="onb-hb-rn">New practice</span><span class="onb-hb-rv">' + rv + '</span>'
        + '</div>'
        + '<div class="onb-hb-meter" aria-hidden="true"><span style="width:' + pctw + '%"></span></div>';
    }
    return '<div class="onb-hb-row"><span class="onb-hb-rn">Daily Review</span><span class="onb-hb-rv">' + esc(reviewVal) + '</span></div>' + newRow;
  }

  function barHtml() {
    var t = tier();
    var top = t === 'pro'
      ? '<div class="onb-hb-top">' + switcherPill() + '<span class="onb-hb-plan onb-hb-plan-pro">Pro</span></div>'
      : '<div class="onb-hb-top"><div class="onb-hb-cert"><span class="onb-hb-mark">' + esc((certById(currentCertId()) || CERTS[0]).mark) + '</span>'
        + '<span class="onb-hb-ct"><span class="onb-hb-name">' + esc((certById(currentCertId()) || CERTS[0]).name) + '</span><span class="onb-hb-code">' + esc((certById(currentCertId()) || CERTS[0]).vendor) + '</span></span></div>'
        + '<span class="onb-hb-plan">Free</span></div>';
    var addCert = t === 'free'
      ? '<button type="button" class="onb-hb-add" data-home-action="add-cert"><span class="onb-hb-plus" aria-hidden="true">+</span><span>Add an exam</span><span class="onb-hb-protag">Pro</span></button>'
      : '';
    return '<div class="onb-home-bar" data-onb-tier="' + t + '">'
      + top
      + '<div class="onb-hb-quota">' + quotaRows(t) + '</div>'
      + addCert
      + '</div>';
  }

  function mountTarget() {
    var setup = document.getElementById('page-setup');
    if (!setup) return null;
    return setup.querySelector('main.board') || setup;
  }

  function unmount() {
    var ex = document.getElementById('onb-home-bar-host');
    if (ex && ex.parentNode) ex.parentNode.removeChild(ex);
  }

  function mount() {
    if (!ENABLED) return;
    var target = mountTarget();
    if (!target) return;
    unmount();
    var wrap = document.createElement('div');
    wrap.id = 'onb-home-bar-host';
    wrap.innerHTML = barHtml();
    if (!enteredOnce) {
      var bar = wrap.querySelector('.onb-home-bar');
      if (bar) bar.classList.add('onb-hb-enter');
      enteredOnce = true;
    }
    wrap.addEventListener('click', onBarClick);
    target.insertBefore(wrap, target.firstChild);
  }

  function sync() { if (document.getElementById('onb-home-bar-host')) mount(); }

  function onBarClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-home-action]') : null;
    if (!t) return;
    var action = t.getAttribute('data-home-action');
    if (action === 'open-switcher') { openSwitcher(); }
    else if (action === 'add-cert') { if (window.onbUpgrade) window.onbUpgrade.show('add-cert'); }
    else if (action === 'cap-hit') { if (window.onbUpgrade) window.onbUpgrade.show('cap'); }
  }

  // ── "Your exams" switcher sheet (reuses the #onb-overlay sheet mechanism) ─────
  function overlay() { return document.getElementById('onb-overlay'); }

  function switcherSheetHtml() {
    var cur = currentCertId();
    var rows = CERTS.map(function (c) {
      var score = readinessFor(c.id);
      var on = c.id === cur ? ' onb-sw-sel' : '';
      var right = score != null
        ? '<span class="onb-sw-score"><span class="onb-sw-v">' + score + '</span><span class="onb-sw-l">/ 900</span></span>'
        : '<span class="onb-sw-start">Take diagnostic</span>';
      var sub = score != null ? esc(c.vendor) : 'Not started yet';
      return '<button type="button" class="onb-sw-row' + on + '" data-home-action="pick-cert" data-home-cert="' + c.id + '">'
        + '<span class="onb-sw-mark">' + esc(c.mark) + '</span>'
        + '<span class="onb-sw-meta"><span class="onb-sw-cn">' + esc(c.name) + '</span><span class="onb-sw-cs">' + sub + '</span></span>'
        + right
        + '</button>';
    }).join('');
    return '<div class="onb-ov-scrim" data-home-action="dismiss"></div>'
      + '<div class="onb-sheet" role="dialog" aria-modal="true" aria-label="Your exams"><div class="onb-grab" aria-hidden="true"></div>'
      + '<h2 class="onb-sh-title">Your exams</h2>'
      + '<div class="onb-sw-list">' + rows + '</div>'
      + '<button type="button" class="onb-sw-add" data-home-action="add-cert"><span class="onb-sw-plus" aria-hidden="true">+</span><span>Add an exam</span></button>'
      + '<button type="button" class="onb-sw-link" data-home-action="see-all">See all your exams and progress</button>'
      + '</div>';
  }

  function openSheet(html) {
    var h = overlay();
    if (!h) return;
    if (!h._homeWired) { h.addEventListener('click', onSheetClick); h._homeWired = true; }
    h.innerHTML = html;
    h.hidden = false;
    if (!REDUCE) { void h.offsetWidth; h.classList.add('onb-ov-in'); }
  }
  function closeSheet() {
    var h = overlay();
    if (!h || h.hidden) return;
    h.classList.add('onb-ov-out');
    var done = function () { h.hidden = true; h.classList.remove('onb-ov-out', 'onb-ov-in'); h.innerHTML = ''; };
    if (REDUCE) { done(); return; }
    setTimeout(done, 340);
  }

  function openSwitcher() {
    if (tier() !== 'pro') { if (window.onbUpgrade) window.onbUpgrade.show('add-cert'); return; }
    openSheet(switcherSheetHtml());
  }

  function onSheetClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-home-action]') : null;
    if (!t) return;
    var action = t.getAttribute('data-home-action');
    if (action === 'dismiss') { closeSheet(); return; }
    if (action === 'add-cert') { closeSheet(); if (window.onbUpgrade) setTimeout(function () { window.onbUpgrade.show('add-cert'); }, REDUCE ? 0 : 200); return; }
    if (action === 'see-all') { closeSheet(); try { if (typeof window.showMyCerts === 'function') window.showMyCerts(); } catch (_) {} return; }
    if (action === 'pick-cert') {
      var certId = t.getAttribute('data-home-cert');
      closeSheet();
      var R = window.certanvilRouter;
      var decision = R && R.routeOnSwitch ? R.routeOnSwitch({ metadata: { tier: tier() } }, certId) : { kind: isActivated(certId) ? 'cert-home' : 'first-run', certId: certId };
      try { console.info('[onb] switch ->', decision.kind, certId); } catch (_) {}
      if (decision.kind === 'first-run') {
        setTimeout(function () { try { if (window.onbFirstRun) window.onbFirstRun.start(decision); } catch (_) {} }, REDUCE ? 0 : 200);
      } else {
        // Activated: this is where a real cert-switch would re-render the home for
        // the chosen cert (writes metadata.lastActiveCertId — gated #136). For now
        // record the intent + re-sync the bar so the pill reflects the choice.
        state.certId = certId;
        try { localStorage.setItem('onb_last_active_cert', certId); } catch (_) {}
        sync();
      }
    }
  }

  // ── mount wiring: wrap showPage so the bar tracks the home page ───────────────
  // app.js defines showPage inside its OWN DOMContentLoaded handler, which runs
  // after this module's (script order), so showPage may not exist on the first
  // try — retry briefly until it does, then wrap + mount if home is already up.
  function wireShowPage() {
    if (typeof window.showPage !== 'function' || window.showPage._onbHomeWrapped) return;
    var orig = window.showPage;
    window.showPage = function (p) {
      var r = orig.apply(this, arguments);
      try { if (p === 'setup') mount(); else unmount(); } catch (_) {}
      return r;
    };
    window.showPage._onbHomeWrapped = true;
  }

  function patch(tries) {
    if (!ENABLED) return;
    tries = tries || 0;
    if (typeof window.showPage !== 'function' && tries < 60) {
      setTimeout(function () { patch(tries + 1); }, 50);
      return;
    }
    wireShowPage();
    // If the home is already the active page at patch time, mount immediately.
    try {
      var setup = document.getElementById('page-setup');
      if (setup && setup.classList.contains('active')) mount();
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { patch(0); });
  else patch(0);

  // ── public API (dev/preview helpers) ─────────────────────────────────────────
  window.onbHome = {
    sync: sync,
    mount: mount,
    unmount: unmount,
    openSwitcher: openSwitcher,
    capHit: function () { if (window.onbUpgrade) window.onbUpgrade.show('cap'); },
    // preview helper: simulate exhausting today's free new-question cap.
    simulateCap: function () { setNewUsed(NEW_Q_CAP); sync(); if (window.onbUpgrade) window.onbUpgrade.show('cap'); },
    _state: function () { return { tier: tier(), cert: currentCertId(), due: dueCount(), newUsed: newUsed() }; }
  };
})();
