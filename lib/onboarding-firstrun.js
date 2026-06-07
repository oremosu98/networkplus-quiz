// lib/onboarding-firstrun.js — Onboarding first-run spine (Phase 1).
//
// Renders the activation sequence (cert pick -> diagnostic intro -> diagnostic
// -> score reveal -> +5 movement -> habit hook) into #onb-firstrun, lifted from
// the approved mockup (mockups/onboarding-first-run-concept.html), forged-bronze.
//
// Launched by the lobby router's 'first-run' decision via window.onbFirstRun.start().
// GUARDED: only ever invoked when onboarding-boot is enabled (?onb=1), so it is
// inert by default. The deep engine wiring (real diagnostic / readiness / SR) is
// layered in incrementally; this increment ships the cert-pick + diagnostic-intro
// screens and the sequence shell.
//
// Sec-P7: no inline on* handlers. One delegated click listener reads data-fr-action.

(function () {
  'use strict';

  // The 8 certs (static metadata; stable). Matches the cert packs + landing My Certs.
  var CERTS = [
    { id: 'netplus',     name: 'Network+',           vendor: 'CompTIA · N10-009',  mark: 'N+'  },
    { id: 'secplus',     name: 'Security+',          vendor: 'CompTIA · SY0-701',  mark: 'S+'  },
    { id: 'aplus-core1', name: 'A+ Core 1',          vendor: 'CompTIA · 220-1101', mark: 'A+'  },
    { id: 'aplus-core2', name: 'A+ Core 2',          vendor: 'CompTIA · 220-1102', mark: 'A+'  },
    { id: 'az900',       name: 'AZ-900',             vendor: 'Microsoft Azure Fundamentals',     mark: 'AZ'  },
    { id: 'ai900',       name: 'AI-900',             vendor: 'Microsoft Azure AI Fundamentals',  mark: 'AI'  },
    { id: 'sc900',       name: 'SC-900',             vendor: 'Microsoft Security Fundamentals',  mark: 'SC'  },
    { id: 'clfc02',      name: 'Cloud Practitioner', vendor: 'AWS · CLF-C02',      mark: 'CLF' }
  ];

  var host = null;
  var state = { certId: null, tier: 'free' };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function container() { return host || (host = document.getElementById('onb-firstrun')); }
  function certById(id) { for (var i = 0; i < CERTS.length; i++) if (CERTS[i].id === id) return CERTS[i]; return null; }

  function show() { var h = container(); if (h) h.hidden = false; }
  function close() { var h = container(); if (h) { h.hidden = true; h.innerHTML = ''; } }

  // Placeholder readiness — used only for force-show / design review (when the
  // flow is opened directly without running the calibration engine).
  var PH = { score: 465, pass: 720, weakArea: 'Subnetting', moveFrom: 465, moveTo: 482, reviewCards: 5 };
  // Real readiness, populated by the diagnostic engine (app.js startDiagnostic
  // onboarding legs). Falls back to PH until the calibration runs.
  var real = null;
  function data() { return real || PH; }
  // Preview without an API key: ?onbmock=1 (or localStorage onb_mock=1) runs the
  // calibration on mock questions so the full flow is exercisable end-to-end.
  var mockMode = false;
  try { mockMode = /[?&]onbmock=1/.test(location.search) || localStorage.getItem('onb_mock') === '1'; } catch (_) {}
  function pct(s) { return ((s - 100) / 800 * 100) + '%'; }
  var REDUCE = false; try { REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

  // count-up with a setTimeout fallback + done-guard (robust if rAF is throttled).
  function animateNum(elm, from, to, ms, onDone) {
    if (!elm) { if (onDone) onDone(); return; }
    elm.textContent = from;
    if (REDUCE) { elm.textContent = to; if (onDone) onDone(); return; }
    var start = null, done = false;
    function finish() { if (done) return; done = true; elm.textContent = to; if (onDone) onDone(); }
    function step(t) { if (done) return; if (start === null) start = t; var p = Math.min((t - start) / ms, 1); elm.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); else finish(); }
    requestAnimationFrame(step);
    setTimeout(finish, ms + 250);
  }

  // ── Screens ────────────────────────────────────────────────────────────────
  function screenCertPick() {
    var sel = state.certId || (window.CURRENT_CERT || 'netplus');
    state.certId = sel;
    var rows = CERTS.map(function (c) {
      var on = c.id === sel ? ' fr-sel' : '';
      return '<button type="button" class="fr-cert' + on + '" data-fr-action="pick-cert" data-fr-cert="' + c.id + '">'
        + '<span class="fr-mark">' + esc(c.mark) + '</span>'
        + '<span class="fr-cmeta"><span class="fr-cname">' + esc(c.name) + '</span><span class="fr-cvendor">' + esc(c.vendor) + '</span></span>'
        + '<span class="fr-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span>'
        + '</button>';
    }).join('');
    var selName = (certById(sel) || {}).name || 'this exam';
    return ''
      + '<div class="fr-screen" data-fr-screen="cert-pick">'
      + '  <p class="fr-kicker">Step 1 of 3</p>'
      + '  <h2 class="fr-title">Which exam are you studying for?</h2>'
      + '  <p class="fr-body">Pick one to get your readiness score. On the free plan you focus on a single exam at a time.</p>'
      + '  <div class="fr-cert-list">' + rows + '</div>'
      + '  <div class="fr-foot">'
      + '    <button type="button" class="fr-btn fr-btn-primary" data-fr-action="confirm-cert">Continue with ' + esc(selName) + '</button>'
      + '    <p class="fr-micro">8 exams available. Switching between them is a Pro feature.</p>'
      + '  </div>'
      + '</div>';
  }

  function screenDiagnosticIntro() {
    return ''
      + '<div class="fr-screen" data-fr-screen="diagnostic-intro">'
      + '  <p class="fr-kicker">Step 2 of 3</p>'
      + '  <h2 class="fr-title">Let’s see where you stand.</h2>'
      + '  <p class="fr-body">Answer about 15 questions so we can calibrate your readiness. No studying needed. Anything you miss becomes your first review set.</p>'
      + '  <div class="fr-reassure">'
      + '    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>'
      + '    <span><b>This is calibration, not a test.</b> There is nothing to fail here. A low score just means more room to climb.</span>'
      + '  </div>'
      + '  <div class="fr-foot">'
      + '    <button type="button" class="fr-btn fr-btn-primary" data-fr-action="start-diagnostic">Start the 15-question check</button>'
      + '    <button type="button" class="fr-btn fr-btn-ghost" data-fr-action="skip-diagnostic">Skip for now</button>'
      + '    <p class="fr-micro">Takes about 4 minutes, and it does not use your daily questions. You can take it later from your home.</p>'
      + '  </div>'
      + '</div>';
  }

  function screenScoreReveal() {
    var D = data();
    var certName = (certById(state.certId) || {}).name || 'your';
    var gap = Math.max(0, D.pass - D.score);
    return ''
      + '<div class="fr-screen fr-screen-center" data-fr-screen="score-reveal">'
      + '  <p class="fr-kicker fr-kicker-dim">Your readiness today</p>'
      + '  <div class="fr-readiness"><span class="fr-num" id="fr-reveal-num">0</span><span class="fr-outof">out of 900</span></div>'
      + '  <div class="fr-bar-wrap"><div class="fr-bar-track"><div class="fr-bar-fill" id="fr-reveal-bar"></div><div class="fr-bar-tick"></div></div><div class="fr-bar-legend"><span>100</span><span class="fr-pass">Pass ' + D.pass + '</span><span>900</span></div></div>'
      + '  <p class="fr-gap">You are <b>' + gap + ' points</b> from the ' + esc(certName) + ' pass mark.</p>'
      + '  <p class="fr-honest">This estimates where you stand today, based on your diagnostic. It is not a prediction or a pass guarantee. It moves as you study.</p>'
      + '  <div class="fr-foot"><button type="button" class="fr-btn fr-btn-primary" data-fr-action="to-movement">Start closing the gap</button></div>'
      + '</div>';
  }

  function screenMovement() {
    var D = data();
    var from = (typeof D.moveFrom === 'number') ? D.moveFrom : D.score;
    var to = (typeof D.moveTo === 'number') ? D.moveTo : D.score;
    var delta = to - from;
    var deltaTxt = (delta >= 0 ? '+' : '') + delta;
    var honest = delta > 0
      ? 'You just moved your readiness. A few questions, ' + delta + ' points. That is the whole loop: study a little, watch the number climb.'
      : 'That is the loop: answer a few and your readiness recalculates from what you actually know. It climbs as you study.';
    return ''
      + '<div class="fr-screen fr-screen-center" data-fr-screen="movement">'
      + '  <p class="fr-kicker">Your weakest area</p>'
      + '  <div class="fr-chip-wrap"><span class="fr-chip"><span class="fr-dot"></span>' + esc(D.weakArea) + ' · 5 answered</span></div>'
      + '  <div class="fr-readiness"><span class="fr-num" id="fr-move-num">' + from + '</span><span class="fr-outof">out of 900</span><span class="fr-delta" id="fr-move-delta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' + deltaTxt + ' today</span></div>'
      + '  <div class="fr-bar-wrap"><div class="fr-bar-track"><div class="fr-bar-fill" id="fr-move-bar"></div><div class="fr-bar-tick"></div></div><div class="fr-bar-legend"><span>100</span><span class="fr-pass">Pass ' + D.pass + '</span><span>900</span></div></div>'
      + '  <p class="fr-honest">' + honest + '</p>'
      + '  <div class="fr-foot"><button type="button" class="fr-btn fr-btn-primary" data-fr-action="to-habit">Set up my daily habit</button></div>'
      + '</div>';
  }

  function screenHabit() {
    var D = data();
    var n = (typeof D.reviewCards === 'number') ? D.reviewCards : 0;
    var sub = n > 0 ? (n + ' cards from what you missed today') : 'We’ll build your review deck as you practice';
    return ''
      + '<div class="fr-screen" data-fr-screen="habit">'
      + '  <p class="fr-kicker">You’re set up</p>'
      + '  <h2 class="fr-title">A few minutes a day is how it sticks.</h2>'
      + '  <p class="fr-body">Your diagnostic seeded your first review cards. Spaced practice is what moves the number, so we’ll line up a small set each day.</p>'
      + '  <div class="fr-card-focal"><div class="fr-rev"><div class="fr-rev-ring"><span>' + n + '</span></div><div><div class="fr-rev-title">Daily Review ready tomorrow</div><div class="fr-rev-sub">' + sub + '</div></div></div></div>'
      + '  <div class="fr-streak"><span>Streak started.</span><b>Day 1</b></div>'
      + '  <div class="fr-foot"><button type="button" class="fr-btn fr-btn-primary" data-fr-action="finish-firstrun">Go to my home</button></div>'
      + '</div>';
  }

  function render(html) { var h = container(); if (h) { h.innerHTML = html; h.scrollTop = 0; } }

  function goCertPick() { show(); render(screenCertPick()); }
  function goDiagnosticIntro() { show(); render(screenDiagnosticIntro()); }

  function goScoreReveal() {
    show(); render(screenScoreReveal());
    var D = data();
    var bar = document.getElementById('fr-reveal-bar');
    if (bar) { bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth; bar.style.transition = ''; bar.style.width = pct(D.score); }
    animateNum(document.getElementById('fr-reveal-num'), 0, D.score, 1100);
  }

  function goMovement() {
    show(); render(screenMovement());
    var D = data();
    var from = (typeof D.moveFrom === 'number') ? D.moveFrom : D.score;
    var to = (typeof D.moveTo === 'number') ? D.moveTo : D.score;
    var bar = document.getElementById('fr-move-bar');
    var delta = document.getElementById('fr-move-delta');
    var num = document.getElementById('fr-move-num');
    if (bar) { bar.style.transition = 'none'; bar.style.width = pct(from); void bar.offsetWidth; }
    setTimeout(function () {
      if (bar) { bar.style.transition = ''; bar.style.width = pct(to); }
      animateNum(num, from, to, 900, function () { if (delta && to > from) delta.classList.add('show'); });
    }, 420);
  }

  // ── activation telemetry ─────────────────────────────────────────────────
  // Persist per-cert activation so the activation metric is queryable and the
  // router's explicit-flag path (metadata.activated.<certId>) is populated.
  // localStorage is this subdomain's cert only; cloud-store cert-scopes + merges.
  // Free-tier cert lock: record the picked cert as the user's one free exam.
  function persistFreeCert(certId) {
    try {
      if (!certId) return;
      localStorage.setItem('nplus_freeCertId', certId);
      if (window.cloudStore && window.cloudStore.flush) window.cloudStore.flush('nplus_freeCertId');
    } catch (_) {}
  }
  function writeActivation(patch) {
    try {
      if (!state.certId) return;
      var prev = {};
      try { prev = JSON.parse(localStorage.getItem('nplus_activated') || '{}') || {}; } catch (_) { prev = {}; }
      var next = Object.assign({}, prev, patch);
      localStorage.setItem('nplus_activated', JSON.stringify(next));
      if (window.cloudStore && window.cloudStore.flush) window.cloudStore.flush('nplus_activated');
    } catch (_) {}
  }
  function recordSkip() {
    try {
      if (!state.certId) return;
      localStorage.setItem('nplus_onb_skips', JSON.stringify({ at: Date.now() }));
      if (window.cloudStore && window.cloudStore.flush) window.cloudStore.flush('nplus_onb_skips');
    } catch (_) {}
  }

  // ── engine bridge: launch the real diagnostic, consume real readiness ────────
  // The calibration + movement legs hand off to app.js's diagnostic engine
  // (startDiagnostic with onboarding opts). The overlay is hidden while the
  // diagnostic-quiz page is up, then re-shown at the relevant screen on
  // completion with the real numbers.
  function onCalibrationDone(res) {
    var pp = (res && res.passPlan) ? res.passPlan : {};
    var weak = (pp.weakDomains && pp.weakDomains[0]) || null;
    var score = (typeof pp.predicted === 'number') ? pp.predicted : PH.score;
    real = {
      score: score,
      pass: (res && typeof res.passScore === 'number') ? res.passScore
        : ((window.CERT_PACK && window.CERT_PACK.meta && window.CERT_PACK.meta.examPassScore) || 720),
      weakArea: weak ? weak.label : 'your weakest area',
      reviewCards: (typeof pp.seededCount === 'number') ? pp.seededCount : 0,
      calibScore: score,
      moveFrom: score,
      moveTo: score,
      session: res ? res.session : null
    };
    writeActivation({ at: Date.now(), baseline: real.calibScore, moved: null });
    try { if (typeof window.showPage === 'function') window.showPage('setup'); } catch (_) {}
    goScoreReveal();
  }

  function onMovementDone(res) {
    var pp = (res && res.passPlan) ? res.passPlan : {};
    var to = (typeof pp.predicted === 'number') ? pp.predicted : (real ? real.score : PH.score);
    if (!real) real = { pass: (window.EXAM_PASS_SCORE || 720), weakArea: 'your weakest area', calibScore: to };
    real.moveFrom = real.calibScore;
    real.moveTo = to;
    real.score = to;
    writeActivation({ moved: (typeof real.moveFrom === 'number') ? (real.moveTo - real.moveFrom) : null });
    if (typeof pp.seededCount === 'number') real.reviewCards = (real.reviewCards || 0) + pp.seededCount;
    real.session = res ? res.session : real.session;
    try { if (typeof window.showPage === 'function') window.showPage('setup'); } catch (_) {}
    goMovement();
  }

  function goHabit() { show(); render(screenHabit()); }

  // Hand off to the existing home (engine wiring for the real diagnostic comes
  // in the next increment). Reveals the cert-app underneath.
  function handToHome() { close(); }

  // ── Delegated actions ────────────────────────────────────────────────────────
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-fr-action]') : null;
    if (!t) return;
    var action = t.getAttribute('data-fr-action');
    if (action === 'pick-cert') {
      state.certId = t.getAttribute('data-fr-cert');
      goCertPick();                       // re-render with new selection + button label
    } else if (action === 'confirm-cert') {
      // Free tier locks to this cert. Pro is not locked -> proceed straight through.
      if (state.tier !== 'pro') {
        var nm = (certById(state.certId) || {}).name || 'this exam';
        if (!window.confirm(nm + ' will be your free exam. On the free plan you study one exam at a time, and you can unlock the rest with Pro. Continue with ' + nm + '?')) return;
        persistFreeCert(state.certId);
      }
      goDiagnosticIntro();
    } else if (action === 'start-diagnostic') {
      try { console.info('[onb] first-run: start calibration for', state.certId, mockMode ? '(mock)' : ''); } catch (_) {}
      if (typeof window.startDiagnostic !== 'function') { goScoreReveal(); return; }  // engine absent → design-review fallback
      close();  // reveal the diagnostic-quiz page beneath the overlay
      window.startDiagnostic({ count: 15, skipConfirm: true, onboarding: 'calibration', mock: mockMode, onComplete: onCalibrationDone });
    } else if (action === 'skip-diagnostic') {
      try { console.info('[onb] first-run: skipped diagnostic for', state.certId); } catch (_) {}
      recordSkip();
      handToHome();
    } else if (action === 'to-movement') {
      if (!real || typeof window.startDiagnostic !== 'function') { goMovement(); return; }  // fallback if engine/real absent
      try { console.info('[onb] first-run: movement practice for', state.certId); } catch (_) {}
      close();
      window.startDiagnostic({ count: 5, skipConfirm: true, onboarding: 'movement', mock: mockMode, priorSession: real.session, onComplete: onMovementDone });
    } else if (action === 'to-habit') {
      goHabit();
    } else if (action === 'finish-firstrun') {
      // Activation is already set: the calibration wrote the per-cert readiness
      // snapshot, which is the lobby router's activation signal. Just reveal home.
      try { console.info('[onb] first-run: complete for', state.certId); } catch (_) {}
      handToHome();
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  window.onbFirstRun = {
    start: function (decision) {
      decision = decision || {};
      state.certId = decision.certId || window.CURRENT_CERT || null;
      state.tier = decision.tier || 'free';
      var h = container();
      if (h && !h._frWired) { h.addEventListener('click', onClick); h._frWired = true; }
      // If the cert is already known (free locked cert / Pro switching to a known
      // but un-activated cert via the switcher), skip the picker and open at the
      // diagnostic intro for that cert.
      if (state.certId && (decision.reason === 'not-activated' || decision.reason === 'switch-not-activated')) goDiagnosticIntro();
      else goCertPick();
    },
    close: close,
    _state: function () { return { certId: state.certId, tier: state.tier, visible: container() && !container().hidden }; }
  };
})();
