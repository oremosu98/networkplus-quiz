// lib/cert-lock.js — Free-tier cert lock (always-on; independent of the onboarding flag).
//
// A signed-in FREE user is locked to one cert (profile.metadata.freeCertId). If they
// open any other cert (cross-subdomain nav on web/Safari; native is account-first +
// has no URL bar), we drop a full-screen upsell wall. Admin/Pro/anonymous/owned-cert
// pass through. FAILS OPEN — a bug must never lock a real user OUT of the app.
//
// Spec: docs/superpowers/specs/2026-06-07-free-tier-cert-lock-design.md
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  function meta(profile) { return (profile && profile.metadata) || {}; }

  // Which certs does this user already have study data for? (readiness snapshot,
  // SR queue, or cert_results). Used by the fallback claim.
  function certsWithData(m) {
    var out = {};
    try {
      ['readiness_snapshots', 'readinessSnapshots', 'sr', 'cert_results', 'certResults', 'activated'].forEach(function (k) {
        var o = m[k];
        if (o && typeof o === 'object') { for (var c in o) { if (Object.prototype.hasOwnProperty.call(o, c)) out[c] = true; } }
      });
    } catch (_) {}
    return out;
  }

  function persistFreeCert(certId) {
    try {
      localStorage.setItem('nplus_freeCertId', certId);
      if (window.cloudStore && window.cloudStore.flush) window.cloudStore.flush('nplus_freeCertId');
    } catch (_) {}
  }

  // Fallback claim: a free user with NO freeCertId, whose ONLY cert-with-data is the
  // current one, claims it. (Multiple certs with data -> grandfathered, left unlocked.)
  function claimIfUnset(certId, profile) {
    try {
      if (!certId) return;
      var m = meta(profile);
      if (m.freeCertId) return;
      var data = certsWithData(m);
      var keys = Object.keys(data);
      if (keys.length === 1 && data[certId]) persistFreeCert(certId);
    } catch (_) {}
  }

  function check(opts) {
    try {
      opts = opts || {};
      if (!opts.isLoggedIn) return;                          // anonymous: not locked (spec §5)
      var R = window.certanvilRouter;
      if (!R || R.getTier(opts.profile) !== 'free') return;  // pro/admin exempt
      var locked = meta(opts.profile).freeCertId || null;
      var here = window.CURRENT_CERT || null;
      if (!locked) { claimIfUnset(here, opts.profile); return; }
      if (here && here !== locked) showWall(locked);         // wrong cert -> wall
    } catch (_) { /* fail open */ }
  }

  // ── the wall ───────────────────────────────────────────────────────────────
  function certLabel(certId) {
    var L = { netplus: 'Network+', secplus: 'Security+', az900: 'Azure AZ-900', ai900: 'Azure AI-900',
      sc900: 'Security SC-900', clfc02: 'AWS CLF-C02', 'aplus-core1': 'A+ Core 1', 'aplus-core2': 'A+ Core 2' };
    return L[certId] || certId;
  }
  function showWall(ownedCert) {
    try {
      if (document.getElementById('cl-wall')) return;
      var R = window.certanvilRouter;
      var backUrl = (R && R.certHost) ? R.certHost(ownedCert) : '/';
      var hereLabel = certLabel(window.CURRENT_CERT);
      var ownedLabel = certLabel(ownedCert);
      var w = document.createElement('div');
      w.id = 'cl-wall';
      w.className = 'cl-wall';
      w.setAttribute('role', 'dialog');
      w.setAttribute('aria-modal', 'true');
      w.setAttribute('aria-label', ownedLabel + ' is part of Pro');
      w.innerHTML =
        '<div class="cl-wall-card">' +
          '<div class="cl-wall-mark" aria-hidden="true"></div>' +
          '<h2 class="cl-wall-title">' + hereLabel + ' is part of Pro</h2>' +
          '<p class="cl-wall-sub">You’re studying <strong>' + ownedLabel + '</strong> on the free plan. ' +
            'Free covers one exam at a time. Pro unlocks every exam and lets you switch anytime.</p>' +
          '<div class="cl-wall-actions">' +
            '<a class="cl-wall-cta" href="' + backUrl + '">Back to ' + ownedLabel + '</a>' +
            '<a class="cl-wall-pro" href="https://certanvil.com/pricing" target="_blank" rel="noopener">Unlock all exams · Pro</a>' +
          '</div>' +
        '</div>';
      document.body.appendChild(w);
      document.documentElement.classList.add('cl-locked');   // scroll-lock hook
    } catch (_) {}
  }

  window._certLock = { check: check, claimIfUnset: claimIfUnset };
})();
