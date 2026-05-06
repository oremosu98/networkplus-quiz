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
    var mount = ensureMountPoint();
    if (!mount) return;
    var url = buildSignInUrl();
    mount.innerHTML = ''
      + '<a class="topbar-signin-pill" href="' + escapeHtml(url) + '">Sign in</a>';
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
    var tierLabel = '● Free tier · Network+ unlocked';

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
      +   '<a class="tad-link" href="#" onclick="return showPage(\'settings\'),false">'
      +     '<span class="tad-icon">⚙️</span><span>Account settings</span>'
      +   '</a>'
      +   '<a class="tad-link" href="https://certanvil.com" target="_blank" rel="noopener">'
      +     '<span class="tad-icon">🌐</span><span>Visit certanvil.com</span>'
      +   '</a>'
      +   (role === 'admin' ?
            '<a class="tad-link is-admin" href="https://certanvil.com/admin" target="_blank" rel="noopener">'
              + '<span class="tad-icon">🔧</span><span>Admin Dashboard</span>'
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
    return sb.from('profiles').select('role, display_name, email').eq('id', userId).single().then(function (r) {
      return r.error ? null : r.data;
    }).catch(function () { return null; });
  }

  // ── Auth state machine ─────────────────────────────────────────────────
  function handleSignedIn(session) {
    if (!session || !session.user) return;
    var userId = session.user.id;
    fetchProfile(userId).then(function (profile) {
      renderSignedIn(session.user, profile || { role: 'user' });
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
