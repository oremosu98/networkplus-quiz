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

  function render(html) { var h = container(); if (h) { h.innerHTML = html; h.scrollTop = 0; } }

  function goCertPick() { show(); render(screenCertPick()); }
  function goDiagnosticIntro() { show(); render(screenDiagnosticIntro()); }

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
      // TODO(next increment): launch the existing diagnostic engine for state.certId.
      try { console.info('[onb] first-run: start diagnostic for', state.certId); } catch (_) {}
      handToHome();
    } else if (action === 'skip-diagnostic') {
      try { console.info('[onb] first-run: skipped diagnostic for', state.certId); } catch (_) {}
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
      // cert), skip the picker and open at the diagnostic intro.
      if (state.certId && decision.reason === 'not-activated') goDiagnosticIntro();
      else goCertPick();
    },
    close: close,
    _state: function () { return { certId: state.certId, tier: state.tier, visible: container() && !container().hidden }; }
  };
})();
