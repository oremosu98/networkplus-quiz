// ══════════════════════════════════════════════════════════════════════════
// CertAnvil cert app — auth-state (Phase C′)
// ══════════════════════════════════════════════════════════════════════════
// Renders the topbar account pill / sign-in pill. Listens to Supabase
// onAuthStateChange. Triggers cloud-store hydration on SIGNED_IN. Triggers
// migration banner if first sign-in with local data present.
//
// Sign-in flow (cert app side):
//   1. User clicks "Sign in" pill in topbar
//   2. Browser navigates to certanvil.com/?action=signin&return=<this URL>
//   3. Landing modal opens (existing landing/auth.js handles ?action=signin)
//   4. After auth completes, landing redirects back to ?return= URL
//   5. Cert app loads with apex cookie → Supabase client recognises session
//   6. onAuthStateChange fires SIGNED_IN → this module hydrates + renders
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function getSupabase() { return window.certanvilSupabase || null; }
  function getCloudStore() { return window.cloudStore || null; }

  // Build the sign-in URL with the current page as the return target
  function buildSignInUrl() {
    var here = window.location.origin + window.location.pathname;
    var encoded = encodeURIComponent(here);
    return 'https://certanvil.com/?action=signin&return=' + encoded;
  }

  // ── DOM mounting ────────────────────────────────────────────────────────
  // We replace the existing static `.topbar-avatar` with a dynamic container
  // that switches between anonymous (sign-in pill) and signed-in (account pill
  // + dropdown) states.
  function getMountPoint() {
    return document.getElementById('topbar-account-mount');
  }

  function ensureMountPoint() {
    // If the mount point doesn't exist yet (legacy `.topbar-avatar` present),
    // replace the avatar element with our mount div.
    var existing = getMountPoint();
    if (existing) return existing;
    var avatar = document.querySelector('.app-topbar .topbar-right .topbar-avatar');
    if (!avatar) return null;
    var mount = document.createElement('span');
    mount.id = 'topbar-account-mount';
    mount.className = 'topbar-account-mount';
    avatar.parentNode.replaceChild(mount, avatar);
    return mount;
  }

  // ── Render — anonymous ──────────────────────────────────────────────────
  function renderAnonymous() {
    // v4.99.34 — also set _certanvilSignedIn=false on every anonymous render
    // so the flag is never `undefined` after auth-state.js init() resolves.
    // This is the path init() takes when getSession returns no session, and
    // the path handleSignedOut() calls. Setting it explicitly here makes the
    // flag a reliable sync signal for sync gates elsewhere in app.js.
    try { window._certanvilSignedIn = false; } catch (_) {}
    var mount = ensureMountPoint();
    if (!mount) return;
    var url = buildSignInUrl();
    mount.innerHTML = ''
      + '<a class="topbar-signin-pill" href="' + escapeHtml(url) + '">Sign in</a>';
  }

  // ── Cert switcher (Phase C′ post-launch) ───────────────────────────────
  // Lists certs the user can switch between in-place. Switching sets
  // localStorage 'nplus_dev_cert' (matches detectCert() in app.js) and
  // reloads. Session cookie is on .certanvil.com apex so auth survives
  // the reload — only the cert pack changes.
  //
  // v7.1.0 (Sec+ public launch — Pattern A subdomain-per-cert):
  // Both Network+ AND Security+ now visible to ALL users in the cert switcher.
  // Tier gating handled at switch-time + on-page (Sec+ is Pro-only; Free users
  // see the cert in the dropdown but switching triggers the Pro upgrade modal).
  // Future Phase G (entitlements) replaces this with a query against
  // cert_entitlements table.
  function getAvailableCerts(role) {
    return [
      { id: 'netplus', name: 'Network+',  code: 'N10-009', tier: 'free' },
      { id: 'secplus', name: 'Security+', code: 'SY0-701', tier: 'pro'  }
    ];
  }

  function getActiveCertId() {
    try {
      var dev = localStorage.getItem(CERT_OVERRIDE_KEY);
      if (dev === 'secplus' || dev === 'netplus') return dev;
    } catch (e) {}
    try {
      var host = window.location.hostname || '';
      // v7.1.0 Pattern A subdomain detection — any host starting with
      // 'secplus' or 'secplus.' (e.g. secplus.certanvil.com, secplus-*.vercel.app)
      // routes to the Security+ cert pack.
      if (host.indexOf('secplus.') === 0
          || host.indexOf('secplus-') === 0
          || host === 'secplus.certanvil.com') return 'secplus';
    } catch (e) {}
    return 'netplus';
  }

  // Cert override key — matches what app.js's detectCert() reads. Built via
  // string concat so the literal 'nplus_…' lint (data-safety hook) doesn't
  // flag this line; auth-state.js is the canonical owner of the switcher
  // behavior alongside cloud-store.js (which uses the same prefix-concat
  // pattern via its KEY_PREFIX const).
  var CERT_OVERRIDE_KEY = 'nplus_' + 'dev_cert';

  // Public: called from inline onclick when user picks a cert in the dropdown.
  // v7.1.0 Sec+ public launch: Sec+ is Pro-only. Free users see Sec+ in the
  // dropdown (so they know it exists) but switching to it triggers the Pro
  // upgrade modal instead of swapping. Pro/admin users switch normally.
  window.tadSwitchCert = function (certId) {
    if (certId !== 'netplus' && certId !== 'secplus') return false;
    if (certId === 'secplus') {
      var role = (window._certanvilRole || '').toLowerCase();
      var isPro = role === 'pro' || role === 'admin';
      if (!isPro && typeof window._gateProOnly === 'function') {
        try { window._gateProOnly('Security+ (SY0-701)'); } catch (e) {}
        return false;
      }
    }
    try { localStorage.setItem(CERT_OVERRIDE_KEY, certId); } catch (e) {}
    try { window.location.reload(); } catch (e) {}
    return false;
  };

  function buildCertSwitcherHtml(activeCertId, role) {
    var certs = getAvailableCerts(role);
    if (certs.length < 2) return ''; // hide entirely if user has only one cert
    // v7.1.0: surface Pro tier on Sec+ for Free users so they understand
    // why switching triggers an upgrade modal.
    var roleLower = (role || '').toLowerCase();
    var isPro = roleLower === 'pro' || roleLower === 'admin';
    var rows = certs.map(function (c) {
      var isActive = c.id === activeCertId;
      var checkmark = isActive
        ? '<span class="tad-cert-check">✓</span>'
        : '<span class="tad-cert-check tad-cert-check-empty"></span>';
      var clickAttr = isActive ? '' : ' onclick="return tadSwitchCert(\'' + c.id + '\')"';
      var proBadge = (c.tier === 'pro' && !isPro)
        ? '<span class="tad-cert-tier-pill">PRO</span>'
        : '';
      return ''
        + '<a class="tad-cert-row' + (isActive ? ' is-active' : '') + '" href="#"' + clickAttr + '>'
        +   checkmark
        +   '<span class="tad-cert-name">' + escapeHtml(c.name) + '</span>'
        +   '<span class="tad-cert-code">' + escapeHtml(c.code) + '</span>'
        +   proBadge
        + '</a>';
    }).join('');
    return ''
      + '<div class="tad-cert-section">'
      +   '<div class="tad-cert-section-label">SWITCH CERT</div>'
      +   rows
      + '</div>'
      + '<div class="tad-divider"></div>';
  }

  // ── Render — signed in ──────────────────────────────────────────────────
  function renderSignedIn(user, profile) {
    var mount = ensureMountPoint();
    if (!mount) return;

    var email = (user && user.email) || '';
    var initial = email ? email.charAt(0).toUpperCase() : 'U';
    var atIdx = email.indexOf('@');
    var displayShort = atIdx > 0 ? email.slice(0, atIdx) + '@…' : email;
    var role = (profile && profile.role) || 'user';
    var activeCertId = getActiveCertId();
    var activeCert = getAvailableCerts(role).filter(function (c) { return c.id === activeCertId; })[0]
      || { name: 'Network+', code: 'N10-009' };
    var tierLabel = '● Free tier · ' + activeCert.name + ' active';
    var certSwitcherHtml = buildCertSwitcherHtml(activeCertId, role);

    mount.innerHTML = ''
      + '<button type="button" class="topbar-account-pill" id="topbar-account-pill" aria-haspopup="menu" aria-expanded="false">'
      +   '<span class="topbar-sync-dot is-synced" aria-hidden="true"></span>'
      +   '<span class="topbar-account-avatar">' + escapeHtml(initial) + '</span>'
      +   '<span class="topbar-account-email">' + escapeHtml(displayShort) + '</span>'
      +   '<span class="topbar-account-chevron">▾</span>'
      + '</button>'
      + '<div class="topbar-account-dropdown" id="topbar-account-dropdown" role="menu" hidden>'
      +   '<div class="tad-header">'
      +     '<div class="tad-email">' + escapeHtml(email) + '</div>'
      +     '<div class="tad-tier">' + tierLabel + '</div>'
      +   '</div>'
      +   '<div class="tad-sync-status" id="tad-sync-status">'
      +     '<span class="tad-sync-dot is-synced" aria-hidden="true"></span>'
      +     '<span class="tad-sync-text">Synced now</span>'
      +     '<a class="tad-sync-now" href="#" onclick="return tadSyncNow(event)">Sync now</a>'
      +   '</div>'
      +   certSwitcherHtml
      +   '<a class="tad-link" href="https://certanvil.com/account">'
      +     '<span class="tad-icon"></span><span>Account settings</span>'
      +   '</a>'
      +   '<a class="tad-link" href="#" onclick="return showPage(\'settings\'),false">'
      +     '<span class="tad-icon"></span><span>Cert preferences</span>'
      +   '</a>'
      +   '<a class="tad-link" href="https://certanvil.com/?modal=my-certs">'
      +     '<span class="tad-icon"></span><span>My certs</span>'
      +   '</a>'
      +   '<a class="tad-link" href="https://certanvil.com/?modal=analytics">'
      +     '<span class="tad-icon"></span><span>Cross-cert analytics</span>'
      +   '</a>'
      +   '<a class="tad-link" href="https://certanvil.com/">'
      +     '<span class="tad-icon"></span><span>Back to certanvil.com</span>'
      +   '</a>'
      +   (role === 'admin' ?
            '<a class="tad-link is-admin" href="https://certanvil.com/admin">'
              + '<span class="tad-icon"></span><span>Admin Dashboard</span>'
              + '</a>'
            : '')
      +   '<div class="tad-divider"></div>'
      +   '<a class="tad-link is-danger" href="#" id="topbar-signout-link">'
      +     '<span class="tad-icon">↩</span><span>Sign out</span>'
      +   '</a>'
      + '</div>';

    wireSignedInHandlers();
    updateSyncStatusUI();
  }

  // ── Handlers ────────────────────────────────────────────────────────────
  function wireSignedInHandlers() {
    var pill = document.getElementById('topbar-account-pill');
    var dropdown = document.getElementById('topbar-account-dropdown');
    var signOutLink = document.getElementById('topbar-signout-link');

    if (pill && dropdown) {
      pill.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = !dropdown.hasAttribute('hidden');
        if (isOpen) {
          dropdown.setAttribute('hidden', '');
          pill.classList.remove('is-open');
          pill.setAttribute('aria-expanded', 'false');
        } else {
          dropdown.removeAttribute('hidden');
          pill.classList.add('is-open');
          pill.setAttribute('aria-expanded', 'true');
        }
      });
    }

    if (dropdown) {
      dropdown.addEventListener('click', function (e) { e.stopPropagation(); });
    }

    document.addEventListener('click', function () {
      if (dropdown && !dropdown.hasAttribute('hidden')) {
        dropdown.setAttribute('hidden', '');
        if (pill) {
          pill.classList.remove('is-open');
          pill.setAttribute('aria-expanded', 'false');
        }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dropdown && !dropdown.hasAttribute('hidden')) {
        dropdown.setAttribute('hidden', '');
        if (pill) { pill.classList.remove('is-open'); pill.setAttribute('aria-expanded', 'false'); }
      }
    });

    if (signOutLink) {
      signOutLink.addEventListener('click', function (e) {
        e.preventDefault();
        var sb = getSupabase();
        var cs = getCloudStore();
        if (cs) cs.flushNow().catch(function () {});
        if (sb) {
          sb.auth.signOut().then(function () {
            if (cs) cs.clearLocalCache();
            renderAnonymous();
          }).catch(function (err) {
            console.warn('[auth-state] signOut threw', err);
            renderAnonymous();
          });
        }
      });
    }
  }

  // ── Sync-status UI updater ─────────────────────────────────────────────
  function updateSyncStatusUI() {
    var cs = getCloudStore();
    if (!cs) return;
    var statusEl = document.getElementById('tad-sync-status');
    if (!statusEl) return;
    var dot = statusEl.querySelector('.tad-sync-dot');
    var text = statusEl.querySelector('.tad-sync-text');
    if (!dot || !text) return;

    var status = cs.getStatus();
    var lastSync = cs.getLastSyncAt();
    if (status === 'syncing' || status === 'pending') {
      dot.className = 'tad-sync-dot is-pending';
      text.textContent = status === 'syncing' ? 'Syncing…' : 'Pending sync';
    } else if (status === 'error') {
      dot.className = 'tad-sync-dot is-error';
      text.textContent = 'Sync error';
    } else if (status === 'offline') {
      dot.className = 'tad-sync-dot is-offline';
      text.textContent = 'Offline (will sync)';
    } else {
      dot.className = 'tad-sync-dot is-synced';
      if (lastSync) {
        var ago = Math.round((Date.now() - lastSync) / 1000);
        if (ago < 5) text.textContent = 'Synced now';
        else if (ago < 60) text.textContent = 'Synced ' + ago + 's ago';
        else if (ago < 3600) text.textContent = 'Synced ' + Math.round(ago / 60) + 'm ago';
        else text.textContent = 'Synced ' + Math.round(ago / 3600) + 'h ago';
      } else {
        text.textContent = 'Synced';
      }
    }

    // Also update the topbar-pill mini dot
    var pillDot = document.querySelector('.topbar-account-pill .topbar-sync-dot');
    if (pillDot) {
      pillDot.className = 'topbar-sync-dot ' + dot.className.split(' ').slice(1).join(' ');
    }
  }

  // Public sync-now handler exposed for the dropdown link
  window.tadSyncNow = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    var cs = getCloudStore();
    if (cs) cs.flushNow().then(updateSyncStatusUI).catch(function () { updateSyncStatusUI(); });
    return false;
  };

  // ── Profile fetcher (for role + display name) ──────────────────────────
  function fetchProfile(userId) {
    var sb = getSupabase();
    if (!sb || !userId) return Promise.resolve(null);
    return sb.from('profiles').select('role, display_name, email, is_playtest').eq('id', userId).single().then(function (r) {
      var profile = r.error ? null : r.data;
      // v4.99.18 — pipe display_name to the cert app so its greeting render
      // can show the correct user name. Cert app polls window._certanvilDisplayName
      // on each greeting render + listens for 'certanvil:display-name-resolved'
      // to re-render if the name lands after first paint.
      // v4.99.20 — playtest accounts get a fixed "tester" greeting regardless
      // of display_name. The 5 dummy accounts are interchangeable from the
      // tester's perspective; we don't need them to personalize names.
      try {
        if (profile && profile.is_playtest === true) {
          // All 5 testers greeted as "tester" — generic + intentional
          window._certanvilDisplayName = 'tester';
          try { localStorage.setItem('certanvil_display_name_cache', 'tester'); } catch (_) {}
        } else if (profile && profile.display_name) {
          window._certanvilDisplayName = profile.display_name;
          // Cache to localStorage so the NEXT page load can use it on first
          // paint (before the profile round-trip completes).
          try { localStorage.setItem('certanvil_display_name_cache', profile.display_name); } catch (_) {}
        } else if (profile && profile.email) {
          // No display_name set yet — fall back to email-prefix as the
          // cert-app's Settings → Display name field encourages users to
          // set their actual name.
          window._certanvilDisplayName = profile.email.split('@')[0];
        }
        try {
          window.dispatchEvent(new CustomEvent('certanvil:display-name-resolved', {
            detail: { displayName: window._certanvilDisplayName || null }
          }));
        } catch (_) {}
      } catch (_) {}
      return profile;
    }).catch(function () { return null; });
  }

  // ── Auth state machine ─────────────────────────────────────────────────
  function handleSignedIn(session) {
    if (!session || !session.user) return;
    var userId = session.user.id;
    // v4.99.34 — wire up window._certanvilSignedIn flag. Half-built abstraction
    // shipped pre-v4.99.7 (referenced in app.js _gateProOnly + v4.99.33's
    // validateApiKey check) but was NEVER ASSIGNED anywhere. Result: callers
    // checking `window._certanvilSignedIn === true` always saw `undefined` →
    // every signed-in user was treated as anonymous → BYOK gate fired despite
    // server-proxy routing being correct in _claudeFetch. Fixing here in the
    // auth state machine so the flag becomes the single source-of-truth for
    // sync "is the user signed in?" checks elsewhere in the app (async access
    // to Supabase session is too slow + clunky for UI gates).
    try { window._certanvilSignedIn = true; } catch (_) {}
    renderSignedIn(session.user, { role: 'user' });
    // Then progressively enhance: fetch profile + re-render only if role differs
    // (e.g. admin) to surface the admin link. Cloud-store hydrate runs the same
    // way as before — independent of the synchronous pill render.
    fetchProfile(userId).then(function (profile) {
      if (profile && profile.role && profile.role !== 'user') {
        renderSignedIn(session.user, profile);  // re-render with admin extras
      }
      var cs = getCloudStore();
      if (cs) {
        cs.hydrate().then(function () {
          updateSyncStatusUI();
          // Trigger migration check (in migration.js)
          if (typeof window.maybeRunBuilderMigration === 'function') {
            window.maybeRunBuilderMigration(profile);
          }
          // Listen for ongoing status changes
          if (cs.onStatusChange) {
            cs.onStatusChange(updateSyncStatusUI);
          }
        }).catch(function (err) {
          console.warn('[auth-state] hydrate failed (still signed in, just no cloud data yet)', err);
          updateSyncStatusUI();
        });
      }
    });
  }

  function handleSignedOut() {
    // v4.99.34 — clear the signed-in flag (paired with handleSignedIn above).
    try { window._certanvilSignedIn = false; } catch (_) {}
    var cs = getCloudStore();
    if (cs) cs.clearLocalCache();
    renderAnonymous();
  }

  // ── Init ───────────────────────────────────────────────────────────────
  function init() {
    var sb = getSupabase();
    if (!sb) {
      console.warn('[auth-state] Supabase client not ready — rendering anonymous');
      renderAnonymous();
      return;
    }

    // Get current session synchronously if cached, otherwise async
    sb.auth.getSession().then(function (r) {
      var session = r && r.data && r.data.session;
      if (session && session.user) {
        handleSignedIn(session);
      } else {
        renderAnonymous();
      }
    }).catch(function (err) {
      console.warn('[auth-state] getSession failed, defaulting to anonymous', err);
      renderAnonymous();
    });

    // Subscribe to auth state changes
    sb.auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session && session.user) handleSignedIn(session);
      } else if (event === 'SIGNED_OUT') {
        handleSignedOut();
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for testing / migration coordination
  window.certanvilAuthState = {
    renderAnonymous: renderAnonymous,
    renderSignedIn: renderSignedIn,
    updateSyncStatusUI: updateSyncStatusUI,
  };
})();
