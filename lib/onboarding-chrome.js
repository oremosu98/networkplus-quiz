// lib/onboarding-chrome.js — Onboarding tier chrome (Phase 2): upgrade sheets.
//
// Post-aha upgrade moments lifted from mockups/onboarding-batch2-concept.html:
//   • 'cap'      — free user hit the daily 15 new-questions cap (not a dead-end).
//   • 'add-cert' — free user wants a second exam (Pro value + pricing).
//
// Rendered into #onb-overlay (scrim + bottom sheet). API: window.onbUpgrade.show(kind).
// Tier/quota triggers are saas-gated (#136), so these are wired to events later;
// for now they are show-on-demand + fully dismissible. Sec-P7: delegated clicks,
// no inline on*. honest framing, no pass guarantee.

(function () {
  'use strict';

  var host = null;
  var REDUCE = false;
  try { REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

  function el() { return host || (host = document.getElementById('onb-overlay')); }

  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';
  var CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

  function sheetCap() {
    return ''
      + '<h2 class="onb-sh-title">That’s today’s 15 new questions.</h2>'
      + '<p class="onb-sh-body">Your Daily Review is still open, and your 15 new questions reset tomorrow. Pro lifts the daily cap so you can keep going.</p>'
      + '<div class="onb-reset">' + CLOCK + '<span>New questions reset in 6 hours</span></div>'
      + '<button type="button" class="onb-btn onb-btn-primary" data-up-action="see-pro">See Pro</button>'
      + '<button type="button" class="onb-btn onb-btn-ghost" data-up-action="dismiss">Keep reviewing</button>';
  }

  function sheetAddCert() {
    var feat = function (b, rest) { return '<div class="onb-feat">' + CHECK + '<span><b>' + b + '</b> ' + rest + '</span></div>'; };
    return ''
      + '<h2 class="onb-sh-title">Study more than one exam</h2>'
      + '<p class="onb-sh-body">Pro opens up every exam, lets you switch between them, and removes the daily question cap.</p>'
      + feat('All 8 exams', ', each with its own readiness score')
      + feat('Switch anytime', ', your place in each is saved')
      + feat('No daily cap', ' on new questions')
      + '<div class="onb-price-row">'
      + '  <div class="onb-price"><div class="onb-pl">Monthly</div><div class="onb-pv">$9.99</div><div class="onb-pp">per month</div></div>'
      + '  <div class="onb-price onb-price-sel"><div class="onb-pl">Yearly</div><div class="onb-pv">$89</div><div class="onb-pp">per year</div><span class="onb-save">Save 25%</span></div>'
      + '</div>'
      + '<button type="button" class="onb-btn onb-btn-primary" data-up-action="go-pro">Go Pro</button>'
      + '<button type="button" class="onb-btn onb-btn-ghost" data-up-action="dismiss">Not now</button>'
      + '<p class="onb-fine">Cancel anytime. We never promise a passing grade.</p>';
  }

  function render(kind) {
    var body = kind === 'add-cert' ? sheetAddCert() : sheetCap();
    return '<div class="onb-ov-scrim" data-up-action="dismiss"></div>'
      + '<div class="onb-sheet" role="dialog" aria-modal="true"><div class="onb-grab" aria-hidden="true"></div>' + body + '</div>';
  }

  function hide() {
    var h = el();
    if (!h || h.hidden) return;
    h.classList.add('onb-ov-out');
    var done = function () { h.hidden = true; h.classList.remove('onb-ov-out', 'onb-ov-in'); h.innerHTML = ''; };
    if (REDUCE) { done(); return; }
    setTimeout(done, 340);
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-up-action]') : null;
    if (!t) return;
    var action = t.getAttribute('data-up-action');
    if (action === 'dismiss') { hide(); }
    else if (action === 'see-pro') { window.onbUpgrade.show('add-cert'); }   // cap -> the Pro pitch
    else if (action === 'go-pro') {
      // TODO(saas pivot #136): real checkout. For now route to the pricing page.
      try { console.info('[onb] upgrade: go-pro'); } catch (_) {}
      try { window.location.href = 'https://certanvil.com/pricing.html'; } catch (_) { hide(); }
    }
  }

  window.onbUpgrade = {
    show: function (kind) {
      var h = el();
      if (!h) return;
      if (!h._upWired) { h.addEventListener('click', onClick); h._upWired = true; }
      h.innerHTML = render(kind);
      h.hidden = false;
      if (!REDUCE) { void h.offsetWidth; h.classList.add('onb-ov-in'); }
    },
    hide: hide
  };
})();
