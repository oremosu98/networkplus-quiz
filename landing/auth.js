// ══════════════════════════════════════════════════════════════════════════
// CertAnvil — Auth UI controller (Phase B)
// ══════════════════════════════════════════════════════════════════════════
// Magic-link sign-in via Supabase Auth. Same form handles sign-up + sign-in
// (Supabase auto-creates user on first magic-link request for an unknown
// email). Reads window.certanvilSupabase set by lib/supabase.js.
//
// Auth-flow states (matches mockups/certanvil-auth-flow-concept.html):
//   1. Logged-out topbar — "Sign in" CTA visible
//   2. Sign-in modal default — email field + "Continue with email"
//   3. Sign-in modal with anonymous-progress migration banner
//   4. Magic-link-sent confirmation — "Check your inbox · simi@..."
//   5. Logged-in topbar — account pill replaces "Sign in"
//   6. Account dropdown — email + tier + sign-out
//
// Implementation notes:
//   - Anonymous progress detection looks for nplus_* localStorage keys.
//     On apex certanvil.com these are NOT readable from cert subdomains
//     (different origin), so the banner only fires when the modal is
//     opened from a context that DOES see nplus_history (e.g. a future
//     subdomain redirect to apex with stored progress).
//   - Sign-out clears the Supabase session + closes the dropdown. On the
//     next page, `getSession()` returns null and the topbar reverts.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var supabase = window.certanvilSupabase;
  if (!supabase) {
    console.warn('[certanvil-auth] Supabase client missing — auth UI disabled');
    return;
  }

  // ── DOM refs ────────────────────────────────────────────────────────────
  var signInBtn = document.getElementById('sign-in-btn');
  var accountPill = document.getElementById('account-pill');
  var accountDropdown = document.getElementById('account-dropdown');
  var accountAvatar = document.getElementById('account-avatar');
  var accountEmailShort = document.getElementById('account-email-short');
  var accountChevron = document.getElementById('account-chevron');
  var dropdownEmail = document.getElementById('dropdown-email');
  var dropdownTier = document.getElementById('dropdown-tier');
  var signOutLink = document.getElementById('sign-out-link');

  var authModal = document.getElementById('auth-modal');
  var authModalClose = document.getElementById('auth-modal-close');
  var authForm = document.getElementById('auth-form');
  var authEmailInput = document.getElementById('auth-email');
  var authSubmit = document.getElementById('auth-submit');
  var authError = document.getElementById('auth-error');
  var authMain = document.getElementById('auth-main');
  var authSent = document.getElementById('auth-sent');
  var authSentEmail = document.getElementById('auth-sent-email');
  var authResend = document.getElementById('auth-resend');
  var authDifferentEmail = document.getElementById('auth-different-email');
  var migrationBanner = document.getElementById('migration-banner');
  var migrationStats = document.getElementById('migration-stats');
  // v4.99.17 — playtest-mode-only elements (password sign-in surface)
  var authPlaytestPill = document.getElementById('auth-playtest-pill');
  var authPasswordGroup = document.getElementById('auth-password-group');
  var authPasswordInput = document.getElementById('auth-password');
  var authMagicOnly = document.getElementById('auth-magic-only');
  var authSubText = document.getElementById('auth-sub');
  var authModalTitle = document.getElementById('auth-modal-title');
  // v4.99.21 — visible "Have a password?" link in magic-link mode (replaces
  // the URL-param-only flow as the primary path; URL param still works for
  // backward compat). Click swaps the auth form to password mode.
  var authShowPassword = document.getElementById('auth-show-password');

  // v4.90.1: auth.js is loaded on multiple landing-surface pages now —
  // the home page (index.html) has the full sign-in modal markup, but
  // account.html and admin.html do not. Pre-fix this function bailed out
  // entirely when the modal was missing, which ALSO skipped the topbar
  // render (Sign-in button stayed visible despite the user being signed
  // in). Now: only modal-specific wiring is gated; the topbar pill + auth
  // state machine still runs everywhere. See helper guards below
  // (openAuthModal, closeAuthModal, sendMagicLink, form-submit handler)
  // each gated independently with `if (!authModal) return;` etc.
  var hasModalMarkup = !!(authModal && authForm);
  if (!hasModalMarkup) {
    console.info('[certanvil-auth] No auth-modal markup on this page — running topbar-only mode');
  }

  // ── Anonymous-progress detection ────────────────────────────────────────
  // Looks for cert-app keys in localStorage. On apex landing this usually
  // returns null (different origin from subdomains); on a subdomain context
  // it returns counts so the migration banner can populate.
  function detectAnonymousProgress() {
    try {
      var historyRaw = localStorage.getItem('nplus_history');
      if (!historyRaw) return null;
      var parsed = JSON.parse(historyRaw);
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      var sessions = parsed.length;
      var streakRaw = localStorage.getItem('nplus_streak');
      var streak = 0;
      if (streakRaw) {
        try {
          var sParsed = JSON.parse(streakRaw);
          if (sParsed && typeof sParsed.count === 'number') {
            streak = sParsed.count;
          } else if (typeof sParsed === 'number') {
            streak = sParsed;
          }
        } catch (e) {
          var asInt = parseInt(streakRaw, 10);
          if (!isNaN(asInt)) streak = asInt;
        }
      }
      return { sessions: sessions, streak: streak };
    } catch (e) {
      return null;
    }
  }

  function buildMigrationCopy(progress) {
    if (!progress) return '';
    var parts = [];
    parts.push('Found ' + progress.sessions + ' quiz session' + (progress.sessions === 1 ? '' : 's'));
    if (progress.streak > 0) {
      parts.push(progress.streak + '-day streak');
    }
    return parts.join(' + ') + ' on this browser. Your account will inherit them on first sign-in.';
  }

  // ── Modal lifecycle ─────────────────────────────────────────────────────
  function openAuthModal() {
    if (!authModal) return;
    authModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    showAuthMain();
    clearAuthError();

    // v4.99.17 — flip auth mode based on URL param + localStorage flag.
    // setAuthMode handles all the show/hide logic for the password fields,
    // playtest pill, and magic-link-only elements.
    var isPlaytest = detectPlaytestMode();
    setAuthMode(isPlaytest ? 'password' : 'magic-link');

    var progress = detectAnonymousProgress();
    if (progress && migrationBanner && migrationStats && !isPlaytest) {
      migrationStats.innerHTML = '<strong>' + escapeHtml(buildMigrationCopy(progress)) + '</strong>';
      migrationBanner.removeAttribute('hidden');
    } else if (migrationBanner) {
      migrationBanner.setAttribute('hidden', '');
    }

    if (authEmailInput) {
      try { authEmailInput.focus(); } catch (e) {}
    }
  }

  function closeAuthModal() {
    if (!authModal) return;
    authModal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    if (authForm) authForm.reset();
    clearAuthError();
    showAuthMain();
  }

  function showAuthMain() {
    if (authMain) authMain.removeAttribute('hidden');
    if (authSent) authSent.setAttribute('hidden', '');
  }

  function showAuthSent(email) {
    if (authMain) authMain.setAttribute('hidden', '');
    if (authSent) authSent.removeAttribute('hidden');
    if (authSentEmail) authSentEmail.textContent = email;
  }

  // ── v4.99.17 — Playtest auth mode ──────────────────────────────────────
  // 5 dummy accounts (tester{1..5}@certanvil-playtest.com) for friends to
  // playtest the app. They use a hidden password sign-in surface — opaque to
  // public users, robust for testers (re-login + cross-session).
  //
  // Trigger order:
  //   1. URL param ?auth=password — first-time entry (you text testers the URL)
  //   2. localStorage 'certanvil_auth_mode' === 'password' — set after first
  //      successful sign-in so testers don't need the URL again
  //
  // Sign-out clears the localStorage flag so a tester signing out (or another
  // user on the same browser) gets the default magic-link UX, not the
  // password form.

  var PLAYTEST_AUTH_KEY = 'certanvil_auth_mode';
  var PLAYTEST_WELCOME_KEY = 'certanvil_playtest_welcome_pending';

  function detectPlaytestMode() {
    try {
      var params = new URLSearchParams(window.location.search);
      if ((params.get('auth') || '').toLowerCase() === 'password') return true;
    } catch (e) {}
    try {
      if (localStorage.getItem(PLAYTEST_AUTH_KEY) === 'password') return true;
    } catch (e) {}
    return false;
  }

  function setAuthMode(mode) {
    var isPlaytest = mode === 'password';
    if (authPlaytestPill) {
      if (isPlaytest) authPlaytestPill.removeAttribute('hidden');
      else authPlaytestPill.setAttribute('hidden', '');
    }
    if (authPasswordGroup) {
      if (isPlaytest) authPasswordGroup.removeAttribute('hidden');
      else authPasswordGroup.setAttribute('hidden', '');
    }
    if (authMagicOnly) {
      if (isPlaytest) authMagicOnly.setAttribute('hidden', '');
      else authMagicOnly.removeAttribute('hidden');
    }
    // v4.99.22 — auth-cta-secondary (the prominent password-fallback button)
    // lives outside auth-magic-only so it gets toggled explicitly here.
    // Hidden in password mode (testers are already there); visible otherwise.
    if (authShowPassword) {
      if (isPlaytest) authShowPassword.setAttribute('hidden', '');
      else authShowPassword.removeAttribute('hidden');
    }
    if (authForm && authForm.dataset) authForm.dataset.mode = mode;
    if (authModalTitle) {
      authModalTitle.textContent = isPlaytest
        ? 'Sign in with password'
        : 'Sign in to CertAnvil';
    }
    if (authSubText) {
      authSubText.textContent = isPlaytest
        ? 'Tester credentials only. The rest of the world uses magic links.'
        : "Drop your email and we'll send a one-click sign-in link. New here? Same form; your account gets created automatically.";
    }
    if (authSubmit) {
      authSubmit.textContent = isPlaytest ? 'Sign in →' : 'Continue with email →';
    }
    // Migration banner is irrelevant for playtesters (their accounts are
    // pre-seeded; no anonymous progress to claim). Hide it in playtest mode.
    if (migrationBanner && isPlaytest) {
      migrationBanner.setAttribute('hidden', '');
    }
  }

  function signInWithPlaytestPassword(email, password) {
    return supabase.auth.signInWithPassword({ email: email, password: password });
  }

  // v4.99.21 — wire the "Have a password? Sign in instead →" link to swap
  // the auth modal into password mode. After clicking, the user fills in
  // email + password just like they would via the ?auth=password URL param.
  // No localStorage flag set here — that only happens after a successful
  // sign-in. So clicking the link without signing in doesn't mark the device.
  if (authShowPassword) {
    authShowPassword.addEventListener('click', function (e) {
      e.preventDefault();
      setAuthMode('password');
      clearAuthError();
      // Focus the password input so they can start typing immediately
      // (email is usually already filled in from the magic-link form)
      if (authPasswordInput) {
        try { authPasswordInput.focus(); } catch (_) {}
      }
    });
  }

  function showAuthError(msg) {
    if (!authError) return;
    authError.textContent = msg;
    authError.removeAttribute('hidden');
  }

  function clearAuthError() {
    if (!authError) return;
    authError.textContent = '';
    authError.setAttribute('hidden', '');
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Return-URL plumbing (Phase C′) ──────────────────────────────────────
  // When the cert app at networkplus.certanvil.com (or a Vercel preview)
  // routes the user here for sign-in, it appends `?action=signin&return=<url>`.
  // We honour that in two places:
  //   (a) On page load — if already signed in, bounce immediately.
  //   (b) When sending the magic link — set `emailRedirectTo` to the return
  //       URL so the session lands on the right origin (critical for preview
  //       URLs on vercel.app, which don't share cookies with .certanvil.com).
  // Stored in module scope so both the URL handler and the magic-link sender
  // can see the same value across renders.
  var pendingReturnUrl = null;

  function readReturnUrlFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      var ret = params.get('return');
      if (!ret) return null;
      // Sanity check: must be an http(s) URL we can navigate to. Reject
      // javascript: / data: / relative-with-protocol-confusion etc.
      if (!/^https?:\/\//i.test(ret)) return null;
      return ret;
    } catch (e) { return null; }
  }

  function isSignInRequested() {
    try {
      var params = new URLSearchParams(window.location.search);
      var act = (params.get('action') || '').toLowerCase().trim();
      return act === 'signin';
    } catch (e) { return false; }
  }

  // True if the return URL is on a host that shares the .certanvil.com apex
  // cookie. Bouncing a signed-in user to such a host works because the
  // existing session is already visible there. Bouncing to a different
  // origin (e.g. *.vercel.app preview) is pointless since the session
  // cookie won't be sent with that request — better to fall through to the
  // modal flow and have the magic-link land the session on the right origin.
  function returnUrlSharesApexCookie(returnUrl) {
    try {
      var u = new URL(returnUrl);
      var host = u.hostname || '';
      return host === 'certanvil.com' || host.endsWith('.certanvil.com');
    } catch (e) { return false; }
  }

  // ── Magic-link send ─────────────────────────────────────────────────────
  function buildRedirectUrl() {
    // If the cert app passed a `return=` URL, point the magic link there
    // so the session ends up on the cert app's origin. Otherwise the link
    // arrives back at the same page (standard landing-side sign-in flow).
    if (pendingReturnUrl) return pendingReturnUrl;
    return window.location.origin + window.location.pathname;
  }

  function sendMagicLink(email) {
    return supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: buildRedirectUrl(),
        // shouldCreateUser: true is the default. Same form for sign-up + sign-in.
      },
    });
  }

  // ── Topbar render: signed-in vs signed-out ──────────────────────────────
  // ── Cert-tile personalization (signed-in users) ─────────────────────────
  // v4.93.0: data-driven from profiles.metadata.cert_results. Users mark
  // their real-exam result via /account "Exam results" section; that swaps
  // the cert tile pill from "Active" → "Passed" (or "Attempted") with score.
  // Anonymous visitors keep seeing the static "Start studying" / "Notify me"
  // CTAs. The hardcoded 767/900 string is gone.
  function personalizeCertTilesForSignedIn(profile) {
    var role = profile && profile.role || 'user';
    var results = (profile && profile.metadata && profile.metadata.cert_results) || {};

    // Apply per-cert state to a tile + CTA. Default ("active") is what every
    // signed-in user sees with no exam result on file.
    function applyTileState(certId, defaultStatus, defaultCta) {
      var statusEl = document.getElementById('cert-tile-' + certId + '-status');
      var ctaEl = document.getElementById('cert-tile-' + certId + '-cta');
      var result = results[certId];
      if (result && result.status === 'passed') {
        if (statusEl) {
          statusEl.className = 'cert-status status-passed';
          statusEl.innerHTML = '<span class="status-dot"></span>Passed';
        }
        if (ctaEl) ctaEl.textContent = '✓ ' + result.score + '/' + result.max_score + ' · keep practicing →';
      } else if (result && result.status === 'attempted') {
        if (statusEl) {
          statusEl.className = 'cert-status status-attempted';
          statusEl.innerHTML = '<span class="status-dot"></span>Attempted';
        }
        if (ctaEl) ctaEl.textContent = result.score + '/' + result.max_score + ' · keep going →';
      } else {
        // Default: Active (signed-in but no result marked)
        if (statusEl) {
          statusEl.className = 'cert-status status-' + defaultStatus;
          statusEl.innerHTML = '<span class="status-dot"></span>' + (defaultStatus === 'active' ? 'Active' : 'Live');
        }
        if (ctaEl) ctaEl.textContent = defaultCta;
      }
    }

    // Network+ — every signed-in user sees it (everyone's entitled to N+ free)
    applyTileState('netplus', 'active', 'Resume studying →');

    // v7.1.0 Sec+ public launch: Sec+ tile visible to ALL signed-in users.
    // Pro gating happens in-app on the secplus.certanvil.com subdomain, not
    // at landing-tile visibility. Pro users see "Resume studying →"; Free
    // users see the tile + upgrade prompt when they click in.
    var secTile = document.getElementById('cert-tile-secplus');
    if (secTile) secTile.removeAttribute('hidden');
    applyTileState('secplus', 'active', 'Resume studying →');

    // v7.3.0 AZ-900 public launch: Azure Fundamentals tile visible to ALL
    // signed-in users. Pro gating happens in-app on the azure.certanvil.com
    // subdomain, mirrors the Sec+ Pattern A founder lock.
    var azTile = document.getElementById('cert-tile-az900');
    if (azTile) azTile.removeAttribute('hidden');
    applyTileState('az900', 'active', 'Resume studying →');
  }

  // ── My certs modal (v4.93.0 — data-driven) ─────────────────────────────
  // Reads profile.metadata.cert_results so passed/attempted state surfaces
  // here too. Falls back to "Active · target exam <date>" when no result.
  function renderMyCertsList(profile) {
    var role = profile && profile.role || 'user';
    var results = (profile && profile.metadata && profile.metadata.cert_results) || {};
    var listEl = document.getElementById('my-certs-list');
    if (!listEl) return;

    function rowForCert(spec) {
      var result = results[spec.id];
      var statusLabel, statusClass, meta, ctaLabel;
      if (result && result.status === 'passed') {
        statusLabel = 'Passed';
        statusClass = 'my-cert-status-passed';
        meta = result.score + '/' + result.max_score + ' · ' + result.date;
        ctaLabel = 'Keep practicing →';
      } else if (result && result.status === 'attempted') {
        statusLabel = 'Attempted';
        statusClass = 'my-cert-status-attempted';
        meta = result.score + '/' + result.max_score + ' · ' + result.date;
        ctaLabel = 'Keep going →';
      } else {
        statusLabel = 'Active';
        statusClass = 'my-cert-status-active';
        meta = spec.activeMeta;
        ctaLabel = 'Resume →';
      }
      return buildMyCertRow({
        id: spec.id,
        glyph: spec.glyph,
        glyphClass: spec.glyphClass,
        name: spec.name,
        code: spec.code,
        statusLabel: statusLabel,
        statusClass: statusClass,
        meta: meta,
        ctaLabel: ctaLabel,
        href: spec.href
      });
    }

    var rows = [];
    rows.push(rowForCert({
      id: 'netplus',
      glyph: 'N+',
      glyphClass: 'cert-glyph-netplus',
      name: 'Network+',
      code: 'N10-009',
      activeMeta: 'studying — no exam booked',
      href: 'https://networkplus.certanvil.com/?cert=netplus'
    }));
    // v7.1.0 Sec+ public launch — Sec+ row visible to ALL signed-in users
    // (was admin-only). Pro gating happens in-app on the secplus.certanvil.com
    // subdomain, not at this list-visibility layer.
    rows.push(rowForCert({
      id: 'secplus',
      glyph: 'S+',
      glyphClass: 'cert-glyph-secplus',
      name: 'Security+',
      code: 'SY0-701',
      activeMeta: 'available now',
      href: 'https://secplus.certanvil.com/'
    }));
    // v7.3.0 AZ-900 public launch — Azure Fundamentals row visible to ALL
    // signed-in users. Pro gating happens in-app on the azure.certanvil.com
    // subdomain (mirrors the v7.1.0 Sec+ Pattern A pattern).
    rows.push(rowForCert({
      id: 'az900',
      glyph: 'AZ',
      glyphClass: 'cert-glyph-az900',
      name: 'Microsoft Azure Fundamentals',
      code: 'AZ-900',
      activeMeta: 'available now',
      href: 'https://azure.certanvil.com/'
    }));
    listEl.innerHTML = rows.join('');

    // Show Security+ analytics quick link in the cross-cert modal too
    var secplusLink = document.getElementById('cca-link-secplus');
    // v7.1.0 Sec+ public launch — visible to all signed-in users.
    if (secplusLink) secplusLink.removeAttribute('hidden');
  }

  function buildMyCertRow(c) {
    return ''
      + '<a class="my-cert-row" href="' + escapeHtml(c.href) + '">'
      +   '<span class="my-cert-glyph ' + c.glyphClass + '">' + escapeHtml(c.glyph) + '</span>'
      +   '<div class="my-cert-info">'
      +     '<div class="my-cert-name-row">'
      +       '<span class="my-cert-name">' + escapeHtml(c.name) + '</span>'
      +       '<span class="my-cert-status ' + c.statusClass + '">' + escapeHtml(c.statusLabel) + '</span>'
      +     '</div>'
      +     '<div class="my-cert-code">' + escapeHtml(c.code) + ' · ' + escapeHtml(c.meta) + '</div>'
      +   '</div>'
      +   '<span class="my-cert-cta">' + escapeHtml(c.ctaLabel) + '</span>'
      + '</a>';
  }

  function openMyCertsModal() {
    var modal = document.getElementById('my-certs-modal');
    if (!modal) return;
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeMyCertsModal() {
    var modal = document.getElementById('my-certs-modal');
    if (!modal) return;
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  // openCcaModal / closeCcaModal removed in Phase D — Cross-cert analytics
  // is now a dedicated page at /analytics, not a modal. Dropdown link
  // routes directly via the <a href> with no JS handler.

  function resetCertTilesForAnonymous() {
    // Defensively undo any personalization if the user signs out without
    // a full reload. Restores the static "Live" + "Start studying" state.
    var nStatus = document.getElementById('cert-tile-netplus-status');
    var nCta = document.getElementById('cert-tile-netplus-cta');
    if (nStatus) {
      nStatus.className = 'cert-status status-live';
      nStatus.innerHTML = '<span class="status-dot"></span>Live';
    }
    if (nCta) nCta.textContent = 'Start studying →';
    var secTile = document.getElementById('cert-tile-secplus');
    if (secTile) secTile.setAttribute('hidden', '');
    // v7.3.0 AZ-900: tile is public (mirrors Sec+ v7.1.0 Pattern A) — visible
    // even when anonymous, restore static "Live · Pro" + "Continue prep →".
    var azStatus = document.getElementById('cert-tile-az900-status');
    var azCta = document.getElementById('cert-tile-az900-cta');
    if (azStatus) {
      azStatus.className = 'cert-status status-live';
      azStatus.innerHTML = 'Live · Pro';
    }
    if (azCta) azCta.textContent = 'Continue prep →';
  }

  // Lightweight profile fetch — only need role for personalization. Fails
  // open (returns {role:'user'}) so a missing profiles row doesn't break
  // the landing render.
  function fetchProfileRole(userId) {
    if (!userId) return Promise.resolve({ role: 'user', metadata: {} });
    // v4.93.0: also fetch metadata so cert_results can drive cert-tile state
    // (Pass tracking — see landing/lib/account.js for save flow).
    return supabase.from('profiles').select('role, metadata').eq('id', userId).single()
      .then(function (r) {
        if (r.error || !r.data) return { role: 'user', metadata: {} };
        return { role: r.data.role || 'user', metadata: r.data.metadata || {} };
      })
      .catch(function () { return { role: 'user', metadata: {} }; });
  }

  function renderSignedOut() {
    if (signInBtn) signInBtn.removeAttribute('hidden');
    if (accountPill) accountPill.setAttribute('hidden', '');
    if (accountDropdown) accountDropdown.setAttribute('hidden', '');
    resetCertTilesForAnonymous();
  }

  function renderSignedIn(user) {
    if (signInBtn) signInBtn.setAttribute('hidden', '');
    if (accountPill) accountPill.removeAttribute('hidden');

    var email = (user && user.email) ? user.email : '';
    var initial = email ? email.charAt(0).toUpperCase() : 'U';

    if (accountAvatar) accountAvatar.textContent = initial;
    if (accountEmailShort) {
      var atIdx = email.indexOf('@');
      var displayShort = atIdx > 0 ? email.slice(0, atIdx) + '@…' : email;
      accountEmailShort.textContent = displayShort;
    }
    if (dropdownEmail) dropdownEmail.textContent = email;
    if (dropdownTier) {
      // Phase B: hardcoded "Free tier · Network+ unlocked" — every signup gets
      // this entitlement via the postgres trigger in supabase/schema.sql.
      // Phase D will query cert_entitlements for accurate per-cert tier display.
      dropdownTier.textContent = '● Free tier · Network+ unlocked';
    }

    // Phase C′: personalize cert tiles + my-certs modal based on profile.
    // Anonymous users see static tile markup; signed-in users see passed/
    // attempted/active states (driven by metadata.cert_results — v4.93.0).
    var userId = user && user.id;
    fetchProfileRole(userId).then(function (profile) {
      personalizeCertTilesForSignedIn(profile);
      renderMyCertsList(profile);
    });
  }

  // ── Account dropdown open/close ─────────────────────────────────────────
  function toggleAccountDropdown() {
    if (!accountDropdown) return;
    var isOpen = !accountDropdown.hasAttribute('hidden');
    if (isOpen) {
      closeAccountDropdown();
    } else {
      openAccountDropdown();
    }
  }

  function openAccountDropdown() {
    if (accountDropdown) accountDropdown.removeAttribute('hidden');
    if (accountChevron) accountChevron.textContent = '▴';
    if (accountPill) accountPill.classList.add('is-open');
  }

  function closeAccountDropdown() {
    if (accountDropdown) accountDropdown.setAttribute('hidden', '');
    if (accountChevron) accountChevron.textContent = '▾';
    if (accountPill) accountPill.classList.remove('is-open');
  }

  // ── Wire up event listeners ─────────────────────────────────────────────
  if (signInBtn) {
    signInBtn.addEventListener('click', function (e) {
      e.preventDefault();
      // On the home page the modal opens directly. On other landing pages
      // (account.html, admin.html) the modal isn't loaded, so we route
      // users back home with the same `?action=signin&return=…` pattern
      // already used by the cert app — landing's home picks up the URL
      // params and auto-opens the modal there.
      if (hasModalMarkup) {
        openAuthModal();
      } else {
        var here = window.location.origin + window.location.pathname;
        window.location.href = '/?action=signin&return=' + encodeURIComponent(here);
      }
    });
  }

  if (authModalClose) {
    authModalClose.addEventListener('click', closeAuthModal);
  }

  if (authModal) {
    authModal.addEventListener('click', function (e) {
      // Backdrop click closes; clicks inside the card don't bubble here
      // because the card sits inside but we check target === overlay.
      if (e.target === authModal) closeAuthModal();
    });
  }

  if (accountPill) {
    accountPill.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleAccountDropdown();
    });
  }

  if (accountDropdown) {
    accountDropdown.addEventListener('click', function (e) {
      // Don't close when clicking inside the dropdown (e.g. sign-out)
      e.stopPropagation();
    });
  }

  // Outside click closes dropdown
  document.addEventListener('click', function () {
    if (accountDropdown && !accountDropdown.hasAttribute('hidden')) {
      closeAccountDropdown();
    }
  });

  // Escape closes both
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (authModal && !authModal.hasAttribute('hidden')) {
      closeAuthModal();
    }
    if (accountDropdown && !accountDropdown.hasAttribute('hidden')) {
      closeAccountDropdown();
    }
  });

  // Form submit — send magic link. Only present on pages with the auth
  // modal markup (landing index.html). Account / admin pages don't ship
  // the modal, so this listener is gated.
  if (authForm) {
    authForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAuthError();
      var email = authEmailInput ? authEmailInput.value.trim() : '';
      if (!email || email.indexOf('@') < 1) {
        showAuthError('Enter a valid email.');
        return;
      }

      // v4.99.17 — branch on auth mode. dataset.mode is set by setAuthMode().
      var mode = (authForm.dataset && authForm.dataset.mode) || 'magic-link';

      if (mode === 'password') {
        var password = authPasswordInput ? authPasswordInput.value : '';
        if (!password) {
          showAuthError('Enter your password.');
          return;
        }
        if (authSubmit) {
          authSubmit.disabled = true;
          authSubmit.textContent = 'Signing in…';
        }
        signInWithPlaytestPassword(email, password)
          .then(function (result) {
            if (authSubmit) {
              authSubmit.disabled = false;
              authSubmit.textContent = 'Sign in →';
            }
            if (result && result.error) {
              showAuthError('Wrong email or password. Check the credentials Simi sent you.');
              return;
            }
            // Success — set localStorage flag so this device remembers
            // password mode for future visits (no URL param needed).
            try { localStorage.setItem(PLAYTEST_AUTH_KEY, 'password'); } catch (e2) {}
            // Set welcome flag for cert app to show toast on first nav-to-app.
            try { localStorage.setItem(PLAYTEST_WELCOME_KEY, 'true'); } catch (e2) {}
            // Auth state listener handles the rest (renders signed-in pill,
            // closes modal automatically). Don't manually close — let the
            // existing flow run.
          })
          .catch(function (err) {
            if (authSubmit) {
              authSubmit.disabled = false;
              authSubmit.textContent = 'Sign in →';
            }
            console.error('[certanvil-auth] signInWithPassword threw:', err);
            showAuthError('Network error. Check your connection and try again.');
          });
        return;
      }

      // ── Default magic-link flow ──
      if (authSubmit) {
        authSubmit.disabled = true;
        authSubmit.textContent = 'Sending…';
      }

      sendMagicLink(email)
        .then(function (result) {
          if (authSubmit) {
            authSubmit.disabled = false;
            authSubmit.textContent = 'Continue with email →';
          }
          if (result && result.error) {
            var msg = result.error.message || 'Could not send magic link. Try again in a moment.';
            showAuthError(msg);
            return;
          }
          showAuthSent(email);
        })
        .catch(function (err) {
          if (authSubmit) {
            authSubmit.disabled = false;
            authSubmit.textContent = 'Continue with email →';
          }
          console.error('[certanvil-auth] sendMagicLink threw:', err);
          showAuthError('Network error. Check your connection and try again.');
        });
    });
  }

  // Resend magic link (re-uses the email shown in the confirmation pill)
  if (authResend) {
    authResend.addEventListener('click', function (e) {
      e.preventDefault();
      var email = authSentEmail ? authSentEmail.textContent : '';
      if (!email) return;
      var origText = authResend.textContent;
      authResend.textContent = 'Sending…';
      sendMagicLink(email)
        .then(function (result) {
          if (result && result.error) {
            authResend.textContent = 'Try again';
          } else {
            authResend.textContent = 'Sent ✓';
          }
          setTimeout(function () {
            if (authResend) authResend.textContent = origText || 'Resend';
          }, 3000);
        })
        .catch(function () {
          authResend.textContent = 'Try again';
          setTimeout(function () {
            if (authResend) authResend.textContent = origText || 'Resend';
          }, 3000);
        });
    });
  }

  // Use a different email — go back to the form
  if (authDifferentEmail) {
    authDifferentEmail.addEventListener('click', function (e) {
      e.preventDefault();
      showAuthMain();
      clearAuthError();
      if (authEmailInput) {
        authEmailInput.value = '';
        try { authEmailInput.focus(); } catch (er) {}
      }
    });
  }

  // Sign out
  if (signOutLink) {
    signOutLink.addEventListener('click', function (e) {
      e.preventDefault();
      // v4.99.17 — clear the playtest auth-mode flag on sign-out so a tester
      // signing out (or another user on the same browser) reverts to the
      // default magic-link UX, not the password form. Without this, the
      // password mode would persist forever once set.
      try { localStorage.removeItem(PLAYTEST_AUTH_KEY); } catch (e3) {}
      try { localStorage.removeItem(PLAYTEST_WELCOME_KEY); } catch (e3) {}
      supabase.auth.signOut()
        .then(function () {
          renderSignedOut();
          closeAccountDropdown();
        })
        .catch(function (err) {
          console.error('[certanvil-auth] signOut threw:', err);
          // Render signed-out optimistically anyway — getSession on next
          // load will be the source of truth.
          renderSignedOut();
          closeAccountDropdown();
        });
    });
  }

  // ── Dropdown link wireup (My certs + Cross-cert analytics modals) ──────
  var myCertsLink = document.getElementById('dropdown-my-certs');
  if (myCertsLink) {
    myCertsLink.addEventListener('click', function (e) {
      e.preventDefault();
      closeAccountDropdown();
      openMyCertsModal();
    });
  }
  // Phase D: Cross-cert analytics dropdown link is now a plain <a href>
  // routing to /analytics — no JS click handler needed. Just close the
  // account dropdown when clicked so it doesn't stay open during nav.
  var ccaLink = document.getElementById('dropdown-cross-cert-analytics');
  if (ccaLink) {
    ccaLink.addEventListener('click', function () {
      closeAccountDropdown();
      // No preventDefault — let the browser navigate to /analytics
    });
  }
  // Modal close buttons + backdrop click + Escape key (My certs modal only;
  // cross-cert analytics modal removed in Phase D)
  var myCertsClose = document.getElementById('my-certs-modal-close');
  if (myCertsClose) myCertsClose.addEventListener('click', closeMyCertsModal);
  var myCertsModal = document.getElementById('my-certs-modal');
  if (myCertsModal) {
    myCertsModal.addEventListener('click', function (e) {
      if (e.target === myCertsModal) closeMyCertsModal();
    });
  }
  var myCertsBrowseLink = document.getElementById('my-certs-browse-link');
  if (myCertsBrowseLink) {
    myCertsBrowseLink.addEventListener('click', function () { closeMyCertsModal(); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var mc = document.getElementById('my-certs-modal');
    if (mc && !mc.hasAttribute('hidden')) closeMyCertsModal();
  });

  // ── Initial session check + state listener ──────────────────────────────
  function initAuthState() {
    // Stash the return URL up front so both branches (signed-in bounce + the
    // anonymous magic-link send) can see it.
    pendingReturnUrl = readReturnUrlFromQuery();
    var signinRequested = isSignInRequested();

    supabase.auth.getSession()
      .then(function (result) {
        var session = result && result.data ? result.data.session : null;
        if (session && session.user) {
          renderSignedIn(session.user);

          // Phase C′: if the cert app sent us here with `?action=signin&return=…`
          // bounce immediately ONLY when the return URL is on a host that
          // shares the .certanvil.com apex cookie (the existing session is
          // visible there). For cross-origin returns (Vercel preview URLs)
          // fall through to the modal flow so the magic-link can land the
          // session on the correct origin.
          if (signinRequested && pendingReturnUrl) {
            if (returnUrlSharesApexCookie(pendingReturnUrl)) {
              try { window.location.replace(pendingReturnUrl); } catch (e) {}
            } else {
              // Cross-origin: open the modal so the user can re-sign-in via
              // a magic link that redirects to the preview URL. Their
              // existing certanvil.com session stays intact.
              setTimeout(function () { openAuthModal(); }, 50);
            }
          }
        } else {
          renderSignedOut();

          // Anonymous + ?action=signin: pop the modal automatically so the
          // user doesn't have to find the button. The pendingReturnUrl is
          // already stashed above, and sendMagicLink will use it as
          // emailRedirectTo when the form is submitted.
          if (signinRequested) {
            // Defer one tick so the modal-open animation doesn't race the
            // initial paint.
            setTimeout(function () { openAuthModal(); }, 50);
          }
        }
      })
      .catch(function (err) {
        console.error('[certanvil-auth] getSession failed:', err);
        renderSignedOut();
      });
  }

  // Listen for auth state changes (sign-in via magic link, sign-out, refresh).
  supabase.auth.onAuthStateChange(function (event, session) {
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session && session.user) {
      renderSignedIn(session.user);
      // Phase C′: if the user just landed via magic link AND we have a
      // pending return URL (from `?action=signin&return=…`), bounce them
      // there now. This handles the case where the magic link came back to
      // landing (rather than directly to the return URL — happens if the
      // emailRedirectTo wasn't set, e.g. on a fresh page load with action=signin
      // but no submit happened locally).
      if (pendingReturnUrl) {
        var ret = pendingReturnUrl;
        pendingReturnUrl = null;
        setTimeout(function () {
          try { window.location.replace(ret); } catch (e) {}
        }, 250);
        return;
      }
      // If user just landed via magic link with the modal still open, close it.
      if (authModal && !authModal.hasAttribute('hidden')) {
        setTimeout(closeAuthModal, 600);
      }
    } else if (event === 'SIGNED_OUT') {
      renderSignedOut();
    }
  });

  initAuthState();

  // ── ?modal= URL param handler (Phase C′ post-launch) ───────────────────
  // The cert app's account dropdown has links like
  //   https://certanvil.com/?modal=my-certs
  // that navigate to the landing AND auto-open the My certs modal. Phase D
  // removed the analytics modal — ?modal=analytics now redirects to the
  // dedicated /analytics page rather than triggering a modal that no
  // longer exists. Old bookmarks / cached cert-app builds keep working.
  function handleModalUrlParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      var which = (params.get('modal') || '').toLowerCase().trim();
      if (which === 'analytics') {
        // Phase D: redirect legacy ?modal=analytics URLs to the real page
        try {
          var qs = (function () {
            params.delete('modal');
            return params.toString();
          })();
          window.location.replace('/analytics' + (qs ? '?' + qs : '') + (window.location.hash || ''));
        } catch (e) { window.location.replace('/analytics'); }
        return;
      }
      if (which !== 'my-certs') return;
      // Strip the param immediately so refresh doesn't re-fire.
      try {
        params.delete('modal');
        var newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
        history.replaceState({}, '', newUrl);
      } catch (e) {}
      // Defer so the modal markup is in DOM + auth state has resolved.
      setTimeout(function () {
        openMyCertsModal();
      }, 250);
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleModalUrlParam);
  } else {
    handleModalUrlParam();
  }
})();
