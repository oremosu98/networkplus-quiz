// lib/router.js — Onboarding "lobby" router (Option B entry point).
//
// PURE decision logic: given auth + profile + the detected cert, decide where a
// launch should land. This module is INERT — it has no side effects, performs no
// cloud writes, and is not yet wired into the boot/auth sequence. Wiring it into
// app.js boot (~:2001) + auth-state.js (getSession ~:569 / handleSignedIn ~:510)
// is a separate, live-verified Phase 0 step.
//
// Spec: docs/planning/ONBOARDING_ACTIVATION_DECISIONS.md §6 (routing) + §6b
// (on-ramp, not a rebuild). Decision tree:
//   logged out                         -> marketing landing (strangers only)
//   logged in, no cert                 -> first-run (cert pick)
//   logged in, cert not activated      -> first-run (diagnostic for that cert)
//   logged in, cert activated          -> that cert's home (existing #page-setup)
//
// Tier: admin = Pro is LIVE (founder decision 2026-06-07). The rest stays STUBBED
// (saas-gated #136): getTier() returns 'pro' for admins (profile.role === 'admin')
// or when an explicit metadata.tier === 'pro' is set (lets previews/tests exercise
// the Pro path); everyone else is 'free'.

(function (global) {
  'use strict';

  // Accept either a full profile ({ metadata: {...} }) or a raw metadata object.
  function metaOf(profile) {
    if (!profile) return {};
    return profile.metadata || profile;
  }

  // --- activation (per-cert) -------------------------------------------------
  // A cert is "activated" once the user has a readiness score for it. Stored as
  // metadata.activated.<certId> (new; same shape as the shipped
  // metadata.sr.<certId> cert-keying). Derived defensively: explicit flag OR an
  // existing per-cert readiness snapshot (so users already scored pre-launch
  // are not forced back through first-run).
  function isActivated(profile, certId) {
    if (!certId) return false;
    var meta = metaOf(profile);
    try {
      if (meta.activated && meta.activated[certId]) return true;
      var snaps = meta.readiness_snapshots || meta.readinessSnapshots;
      if (snaps && snaps[certId] != null) return true;
    } catch (_) {}
    return false;
  }

  // --- tier (admin special-case LIVE; rest STUB — saas-gated #136) ----------
  // Admin = Pro (founder decision 2026-06-07): admins get the Pro home + drop out
  // of first-run (once activated). profile.role is loaded by auth-state.js
  // (select 'role,...') and passed through by onboarding-boot's gatherProfile —
  // it lives at the TOP level, not in metadata. NOTE: paid Pro users carry role
  // 'user' (real Pro tier is saas-gated #136 via _quotaState), so this is
  // ADMIN-ONLY for now. The metadata.tier check remains the preview/test stub.
  function getTier(profile) {
    if (profile && typeof profile.role === 'string' && profile.role.toLowerCase() === 'admin') return 'pro';
    var meta = metaOf(profile);
    return meta.tier === 'pro' ? 'pro' : 'free';
  }

  function firstOwnedCert(meta) {
    try {
      var cr = meta.cert_results || meta.certResults;
      if (cr) { for (var k in cr) { if (Object.prototype.hasOwnProperty.call(cr, k)) return k; } }
    } catch (_) {}
    return null;
  }

  // --- current cert ----------------------------------------------------------
  // Free owns exactly one locked cert; Pro resumes its last-active cert. Falls
  // back to the subdomain-detected cert, then to the first owned cert.
  function currentCert(tier, profile, detectedCert) {
    var meta = metaOf(profile);
    if (tier === 'free') {
      return meta.freeCertId || detectedCert || firstOwnedCert(meta) || null;
    }
    return meta.lastActiveCertId || detectedCert || firstOwnedCert(meta) || null;
  }

  // --- the decision ----------------------------------------------------------
  // ctx = { isLoggedIn: bool, profile: object, detectedCert: string }
  // returns { kind: 'landing'|'first-run'|'cert-home', certId, tier, reason }
  function routeOnLaunch(ctx) {
    ctx = ctx || {};
    if (!ctx.isLoggedIn) {
      return { kind: 'landing', certId: null, tier: null, reason: 'logged-out' };
    }
    var tier = getTier(ctx.profile);
    var certId = currentCert(tier, ctx.profile, ctx.detectedCert);
    if (!certId) {
      return { kind: 'first-run', certId: null, tier: tier, reason: 'no-cert' };
    }
    if (!isActivated(ctx.profile, certId)) {
      return { kind: 'first-run', certId: certId, tier: tier, reason: 'not-activated' };
    }
    return { kind: 'cert-home', certId: certId, tier: tier, reason: 'activated' };
  }

  // Pro switching to a cert never diagnosed re-enters first-run FOR that cert.
  // (Used by the cert switcher; pure helper, the switcher wires the navigation.)
  function routeOnSwitch(profile, certId) {
    var tier = getTier(profile);
    if (!certId) return { kind: 'first-run', certId: null, tier: tier, reason: 'switch-no-cert' };
    if (!isActivated(profile, certId)) {
      return { kind: 'first-run', certId: certId, tier: tier, reason: 'switch-not-activated' };
    }
    return { kind: 'cert-home', certId: certId, tier: tier, reason: 'switch-activated' };
  }

  // --- cert -> canonical URL (single source of truth for cross-subdomain nav) -
  // Mirrors the subdomain layout used by the Pro switcher (auth-state tadSwitchCert)
  // + landing/auth.js. Used by the cert-lock wall's "Back to your cert" button.
  var CERT_HOST = {
    netplus: 'https://networkplus.certanvil.com/',
    secplus: 'https://secplus.certanvil.com/',
    az900: 'https://azure.certanvil.com/',
    ai900: 'https://ai.certanvil.com/',
    sc900: 'https://sc900.certanvil.com/',
    clfc02: 'https://clfc02.certanvil.com/',
    'aplus-core1': 'https://aplus.certanvil.com/?exam=core1',
    'aplus-core2': 'https://aplus.certanvil.com/?exam=core2'
  };
  function certHost(certId) { return CERT_HOST[certId] || CERT_HOST.netplus; }

  var api = {
    routeOnLaunch: routeOnLaunch,
    routeOnSwitch: routeOnSwitch,
    isActivated: isActivated,
    getTier: getTier,
    currentCert: currentCert,
    certHost: certHost
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  if (global) { global.certanvilRouter = api; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
