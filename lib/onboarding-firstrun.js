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

  // Placeholder readiness until the short-calibration engine is wired (next pass).
  // Decision (founder, 2026-06-07): first-run uses a SHORT calibration (~12-15Q),
  // reusing the diagnostic engine with a reduced count + no confirm; the full 20-Q
  // Baseline Diagnostic stays separate. These numbers become real once that lands.
  var PH = { score: 465, pass: 720, weakArea: 'Subnetting', moveTo: 482, reviewCards: 5 };
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
    var certName = (certById(state.certId) || {}).name || 'your';
    var gap = PH.pass - PH.score;
    return ''
      + '<div class="fr-screen fr-screen-center" data-fr-screen="score-reveal">'
      + '  <p class="fr-kicker fr-kicker-dim">Your readiness today</p>'
      + '  <div class="fr-readiness"><span class="fr-num" id="fr-reveal-num">0</span><span class="fr-outof">out of 900</span></div>'
      + '  <div class="fr-bar-wrap"><div class="fr-bar-track"><div class="fr-bar-fill" id="fr-reveal-bar"></div><div class="fr-bar-tick"></div></div><div class="fr-bar-legend"><span>100</span><span class="fr-pass">Pass ' + PH.pass + '</span><span>900</span></div></div>'
      + '  <p class="fr-gap">You are <b>' + gap + ' points</b> from the ' + esc(certName) + ' pass mark.</p>'
      + '  <p class="fr-honest">This estimates where you stand today, based on your diagnostic. It is not a prediction or a pass guarantee. It moves as you study.</p>'
      + '  <div class="fr-foot"><button type="button" class="fr-btn fr-btn-primary" data-fr-action="to-movement">Start closing the gap</button></div>'
      + '</div>';
  }

  function screenMovement() {
    var delta = PH.moveTo - PH.score;
    return ''
      + '<div class="fr-screen fr-screen-center" data-fr-screen="movement">'
      + '  <p class="fr-kicker">Your weakest area</p>'
      + '  <div class="fr-chip-wrap"><span class="fr-chip"><span class="fr-dot"></span>' + esc(PH.weakArea) + ' · 5 answered</span></div>'
      + '  <div class="fr-readiness"><span class="fr-num" id="fr-move-num">' + PH.score + '</span><span class="fr-outof">out of 900</span><span class="fr-delta" id="fr-move-delta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>+' + delta + ' today</span></div>'
      + '  <div class="fr-bar-wrap"><div class="fr-bar-track"><div class="fr-bar-fill" id="fr-move-bar"></div><div class="fr-bar-tick"></div></div><div class="fr-bar-legend"><span>100</span><span class="fr-pass">Pass ' + PH.pass + '</span><span>900</span></div></div>'
      + '  <p class="fr-honest">You just moved your readiness. A few questions, ' + delta + ' points. That is the whole loop: study a little, watch the number climb.</p>'
      + '  <div class="fr-foot"><button type="button" class="fr-btn fr-btn-primary" data-fr-action="to-habit">Set up my daily habit</button></div>'
      + '</div>';
  }

  function screenHabit() {
    return ''
      + '<div class="fr-screen" data-fr-screen="habit">'
      + '  <p class="fr-kicker">You’re set up</p>'
      + '  <h2 class="fr-title">A few minutes a day is how it sticks.</h2>'
      + '  <p class="fr-body">Your diagnostic seeded your first review cards. Spaced practice is what moves the number, so we’ll line up a small set each day.</p>'
      + '  <div class="fr-card-focal"><div class="fr-rev"><div class="fr-rev-ring"><span>' + PH.reviewCards + '</span></div><div><div class="fr-rev-title">Daily Review ready tomorrow</div><div class="fr-rev-sub">' + PH.reviewCards + ' cards from what you missed today</div></div></div></div>'
      + '  <div class="fr-streak"><span>Streak started.</span><b>Day 1</b></div>'
      + '  <div class="fr-foot"><button type="button" class="fr-btn fr-btn-primary" data-fr-action="finish-firstrun">Go to my home</button></div>'
      + '</div>';
  }

  function render(html) { var h = container(); if (h) { h.innerHTML = html; h.scrollTop = 0; } }

  function goCertPick() { show(); render(screenCertPick()); }
  function goDiagnosticIntro() { show(); render(screenDiagnosticIntro()); }

  function goScoreReveal() {
    show(); render(screenScoreReveal());
    var bar = document.getElementById('fr-reveal-bar');
    if (bar) { bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth; bar.style.transition = ''; bar.style.width = pct(PH.score); }
    animateNum(document.getElementById('fr-reveal-num'), 0, PH.score, 1100);
  }

  function goMovement() {
    show(); render(screenMovement());
    var bar = document.getElementById('fr-move-bar');
    var delta = document.getElementById('fr-move-delta');
    var num = document.getElementById('fr-move-num');
    if (bar) { bar.style.transition = 'none'; bar.style.width = pct(PH.score); void bar.offsetWidth; }
    setTimeout(function () {
      if (bar) { bar.style.transition = ''; bar.style.width = pct(PH.moveTo); }
      animateNum(num, PH.score, PH.moveTo, 900, function () { if (delta) delta.classList.add('show'); });
    }, 420);
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
      goDiagnosticIntro();
    } else if (action === 'start-diagnostic') {
      // TODO(next pass): launch the SHORT first-run calibration (~12-15Q) — reuse
      // the diagnostic engine with a reduced count + no confirm — then feed the
      // real readiness into score-reveal. For now show score-reveal w/ placeholder.
      try { console.info('[onb] first-run: start calibration for', state.certId); } catch (_) {}
      goScoreReveal();
    } else if (action === 'skip-diagnostic') {
      try { console.info('[onb] first-run: skipped diagnostic for', state.certId); } catch (_) {}
      handToHome();
    } else if (action === 'to-movement') {
      goMovement();
    } else if (action === 'to-habit') {
      goHabit();
    } else if (action === 'finish-firstrun') {
      // TODO(next pass): set metadata.activated[certId] via cloud-store.
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
