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
          '<div class="cl-wall-mark" aria-hidden="true">' +
            '<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
              '<path d="M58 12 C42 6, 16 16, 14 34 C12 52, 22 62, 42 64" class="sb-brand-c" stroke-width="7" stroke-linecap="round"/>' +
              '<line x1="30" y1="84" x2="70" y2="16" class="sb-brand-slash" stroke-width="5" stroke-linecap="round"/>' +
              '<path d="M46 88 L64 50 L82 88 M53 74 L75 74" class="sb-brand-a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
          '</div>' +
          '<h2 class="cl-wall-title">' + hereLabel + ' is part of Pro</h2>' +
          '<p class="cl-wall-sub">On the free plan you study one exam at a time, and yours is <strong>' + ownedLabel + '</strong>. ' +
            'Pro unlocks the rest and lets you switch between them.</p>' +
          '<div class="cl-wall-actions">' +
            '<a class="cl-wall-cta" href="' + backUrl + '">Back to ' + ownedLabel + '</a>' +
            '<a class="cl-wall-pro" href="https://certanvil.com/pricing" target="_blank" rel="noopener">Unlock all exams · Pro</a>' +
          '</div>' +
        '</div>';
      document.body.appendChild(w);
      document.documentElement.classList.add('cl-locked');   // scroll-lock hook
      try {
        var cta = w.querySelector('.cl-wall-cta');
        if (cta) cta.focus();                                // a11y: land focus on the primary action
        w.addEventListener('keydown', function (e) {         // Esc = get me back to my cert
          if (e.key === 'Escape') { e.preventDefault(); window.location.href = backUrl; }
        });
      } catch (_) {}
    } catch (_) {}
  }

  window._certLock = { check: check, claimIfUnset: claimIfUnset };
})();
