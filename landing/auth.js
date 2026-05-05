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

  // ── Magic-link send ─────────────────────────────────────────────────────
  function buildRedirectUrl() {
    // Magic-link arrives back at the same page. Supabase appends
    // `?token_hash=...&type=magiclink` (or hash equivalents) and the
    // detectSessionInUrl flag picks it up automatically on load.
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
  function renderSignedOut() {
    if (signInBtn) signInBtn.removeAttribute('hidden');
    if (accountPill) accountPill.setAttribute('hidden', '');
    if (accountDropdown) accountDropdown.setAttribute('hidden', '');
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
    supabase.auth.getSession()
      .then(function (result) {
        var session = result && result.data ? result.data.session : null;
        if (session && session.user) {
          renderSignedIn(session.user);
        } else {
          renderSignedOut();
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
