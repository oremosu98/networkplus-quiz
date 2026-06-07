// lib/onboarding-boot.js — Onboarding lobby WIRING (Phase 0, guarded).
//
// Connects the pure router (lib/router.js) to the live boot/auth sequence:
//   1. On boot (if enabled) show the neutral resolve skeleton, covering the home
//      flash while auth resolves (decision doc §6 — "no flash of landing").
//   2. auth-state.js calls window._onbRoute() once auth resolves (signed-in:
//      after cloud hydrate; anonymous: immediately). We gather inputs, ask the
//      router for a decision, and act on it.
//
// SAFETY — OFF BY DEFAULT. The feature is gated behind localStorage 'onb_router'
// (toggle with ?onb=1 / ?onb=0). When off: this module is inert, the skeleton is
// never shown, _onbRoute is a no-op, and the existing boot path is untouched.
//
// Phase 0 scope: routes the ACTIVATED case to the existing cert home. 'first-run'
// is STUBBED (reveals home + logs the decision) until Phase 1 builds the first-run
// UI; 'landing' (native/logged-out redirect) is deferred to the Capacitor work.

(function () {
  'use strict';

  function guardOn() {
    try {
      var s = location.search || '';
      if (s.indexOf('onb=1') !== -1) localStorage.setItem('onb_router', '1');
      if (s.indexOf('onb=0') !== -1) localStorage.removeItem('onb_router');
      return localStorage.getItem('onb_router') === '1';
    } catch (_) { return false; }
  }

  var ENABLED = guardOn();
  var resolved = false;
  var REDUCE = false;
  try { REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

  function el() { return document.getElementById('onb-resolve'); }

  function showSkeleton() { var e = el(); if (e) e.hidden = false; }

  function hideSkeleton() {
    var e = el();
    if (!e || e.hidden) return;
    if (REDUCE) { e.hidden = true; return; }
    e.classList.add('onb-resolve-out');          // fade out (emil: resolve recedes, not snaps)
    setTimeout(function () { e.hidden = true; e.classList.remove('onb-resolve-out'); }, 320);
  }

  // Show the skeleton as early as possible so it covers the synchronous home
  // render (app.js DOMContentLoaded ~:2001). Loaded before app.js so this
  // handler registers first.
  if (ENABLED) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showSkeleton);
    else showSkeleton();
    // Failsafe: the skeleton can never stick, even if auth never resolves.
    setTimeout(function () { if (!resolved) hideSkeleton(); }, 4000);
  }

  // Build a metadata-like profile for the router from the fetched profile +
  // hydrated localStorage. Readiness snapshots (nplus_readiness_snapshots) are
  // the per-cert "has been scored" signal the activation check reads.
  function gatherProfile(fetched) {
    var meta = (fetched && fetched.metadata) ? Object.assign({}, fetched.metadata) : {};
    try {
      var raw = localStorage.getItem('nplus_readiness_snapshots');
      if (raw && !meta.readiness_snapshots) meta.readiness_snapshots = JSON.parse(raw);
    } catch (_) {}
    var out = { metadata: meta };
    // Carry role through so the router's admin special-case (admin = Pro) can see
    // it: getTier reads profile.role, which lives at the top level, not in metadata.
    if (fetched && fetched.role) out.role = fetched.role;
    return out;
  }

  // Called by auth-state.js after auth resolves. Inert unless enabled.
  // opts = { isLoggedIn: bool, profile?: object }
  window._onbRoute = function (opts) {
    if (!ENABLED) return;
    opts = opts || {};
    resolved = true;
    var R = window.certanvilRouter;
    if (!R) { hideSkeleton(); return; }

    var decision = R.routeOnLaunch({
      isLoggedIn: !!opts.isLoggedIn,
      profile: gatherProfile(opts.profile),
      detectedCert: window.CURRENT_CERT || null
    });
    try { console.info('[onb] route decision:', decision.kind, '(' + decision.reason + ')', decision.certId || ''); } catch (_) {}

    // Publish the router-computed tier so the home bar (lib/onboarding-home.js)
    // renders the right chrome (Pro switcher vs free quota bar) — for admins
    // especially, since the bar's own tier() is a preview stub with no profile
    // access. The bar usually mounts during app.js boot (before auth resolves),
    // so re-sync it here once the real tier is known. Skip the null 'landing' tier.
    try {
      if (decision.tier) {
        window._onbTier = decision.tier;
        if (window.onbHome && window.onbHome.sync) window.onbHome.sync();
      }
    } catch (_) {}

    switch (decision.kind) {
      case 'cert-home':
        // The existing home already rendered underneath; just reveal it.
        hideSkeleton();
        break;
      case 'first-run':
        // Phase 1: launch the first-run spine (it manages its own overlay above
        // the home). Hide the resolve skeleton underneath it.
        hideSkeleton();
        try { if (window.onbFirstRun) window.onbFirstRun.start(decision); } catch (_) {}
        break;
      case 'landing':
      default:
        // Native/logged-out redirect is deferred (Capacitor). Web stays in-app.
        hideSkeleton();
        break;
    }
  };
})();
