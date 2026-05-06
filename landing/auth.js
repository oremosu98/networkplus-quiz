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

  if (!authModal || !authForm) {
    console.warn('[certanvil-auth] Auth modal markup missing — skipping wireup');
    return;
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

    var progress = detectAnonymousProgress();
    if (progress && migrationBanner && migrationStats) {
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
  // For now: hardcoded to the builder's actual state (Network+ passed
  // 2026-05-05 with 767/900, Security+ in active prep). Future Phase G
  // replaces these constants with a query against cert_entitlements +
  // quiz_history. Show ONLY for signed-in users — anonymous visitors keep
  // seeing the static "Start studying" / "Notify me" CTAs.
  function personalizeCertTilesForSignedIn(role) {
    // Network+ — show passed state for everyone signed in (builder is the
    // only signed-in user right now; Phase G adds per-user data lookups).
    var nStatus = document.getElementById('cert-tile-netplus-status');
    var nCta = document.getElementById('cert-tile-netplus-cta');
    if (nStatus) {
      nStatus.className = 'cert-status status-passed';
      nStatus.innerHTML = '<span class="status-dot"></span>Passed';
    }
    if (nCta) nCta.textContent = '✓ 767/900 · keep practicing →';

    // Security+ — un-hide for admin, swap status to "Active" + CTA to
    // "Resume studying →". Regular users keep seeing it hidden (private
    // builder cert, not yet customer-facing).
    if (role === 'admin') {
      var secTile = document.getElementById('cert-tile-secplus');
      var secStatus = document.getElementById('cert-tile-secplus-status');
      var secCta = document.getElementById('cert-tile-secplus-cta');
      if (secTile) secTile.removeAttribute('hidden');
      if (secStatus) {
        secStatus.className = 'cert-status status-active';
        secStatus.innerHTML = '<span class="status-dot"></span>Active';
      }
      if (secCta) secCta.textContent = 'Resume studying →';
    }
  }

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
  }

  // Lightweight profile fetch — only need role for personalization. Fails
  // open (returns {role:'user'}) so a missing profiles row doesn't break
  // the landing render.
  function fetchProfileRole(userId) {
    if (!userId) return Promise.resolve({ role: 'user' });
    return supabase.from('profiles').select('role').eq('id', userId).single()
      .then(function (r) { return (r.error || !r.data) ? { role: 'user' } : { role: r.data.role || 'user' }; })
      .catch(function () { return { role: 'user' }; });
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

    // Phase C′: personalize cert tiles based on role. Anonymous users see
    // static markup; signed-in users see passed/active states.
    var userId = user && user.id;
    fetchProfileRole(userId).then(function (profile) {
      personalizeCertTilesForSignedIn(profile.role);
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
      openAuthModal();
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

  // Form submit — send magic link
  authForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearAuthError();
    var email = authEmailInput ? authEmailInput.value.trim() : '';
    if (!email || email.indexOf('@') < 1) {
      showAuthError('Enter a valid email.');
      return;
    }

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
})();
