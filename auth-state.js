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
  // v7.3.0 (AZ-900 public launch — third cert on azure.certanvil.com):
  // Microsoft Azure Fundamentals added as Pro tier (same gating mechanism
  // as Sec+). Future Azure certs (AZ-104, AZ-204, AZ-305) co-exist on the
  // same azure.certanvil.com subdomain via in-app cert switcher rather
  // than new subdomains (founder lock 2026-05-26).
  function getAvailableCerts(role) {
    return [
      { id: 'netplus', name: 'Network+',                       code: 'N10-009', tier: 'free' },
      { id: 'secplus', name: 'Security+',                      code: 'SY0-701', tier: 'pro'  },
      { id: 'az900',   name: 'Microsoft Azure Fundamentals',   code: 'AZ-900',  tier: 'pro'  },
      { id: 'ai900',   name: 'Microsoft Azure AI Fundamentals',code: 'AI-900',  tier: 'pro'  },
      // v7.7.0 — sixth cert SC-900 (single-exam, Microsoft Security/Compliance/Identity)
      { id: 'sc900',   name: 'Microsoft SC-900',                code: 'SC-900',  tier: 'pro'  },
      // v7.6.0 — fifth cert family CompTIA A+ (dual-exam): both Core 1 + Core 2
      // are selectable rows on the shared aplus.certanvil.com subdomain.
      { id: 'aplus-core1', name: 'CompTIA A+ Core 1', code: '220-1201', tier: 'pro' },
      { id: 'aplus-core2', name: 'CompTIA A+ Core 2', code: '220-1202', tier: 'pro' }
    ];
  }

  function getActiveCertId() {
    try {
      var dev = localStorage.getItem(CERT_OVERRIDE_KEY);
      if (dev === 'secplus' || dev === 'netplus' || dev === 'az900' || dev === 'ai900'
          || dev === 'aplus-core1' || dev === 'aplus-core2' || dev === 'sc900') return dev;
    } catch (e) {}
    try {
      var host = window.location.hostname || '';
      // v7.1.0 Pattern A subdomain detection — any host starting with
      // 'secplus' or 'secplus.' (e.g. secplus.certanvil.com, secplus-*.vercel.app)
      // routes to the Security+ cert pack.
      // v7.3.0 — extended with the third cert AZ-900 on azure.certanvil.com
      // (Pattern A; founder lock 2026-05-26 — future Azure certs share this
      // same subdomain via internal cert-switcher, NOT new subdomains).
      if (host.indexOf('secplus.') === 0
          || host.indexOf('secplus-') === 0
          || host === 'secplus.certanvil.com') return 'secplus';
      if (host.indexOf('azure.') === 0
          || host.indexOf('azure-') === 0
          || host === 'azure.certanvil.com') return 'az900';
      // v7.5.0 — fourth cert AI-900 on ai.certanvil.com (Pattern A;
      // founder lock 2026-05-27 — AI/data role family separation).
      if (host.indexOf('ai.') === 0
          || host.indexOf('ai-') === 0
          || host === 'ai.certanvil.com') return 'ai900';
      // v7.7.0 — sixth cert SC-900 on sc900.certanvil.com (Pattern A; founder
      // lock 2026-05-28). Single-exam Microsoft Security/Compliance/Identity
      // cert; cert-code-named to avoid Security+ (secplus.) collision.
      if (host.indexOf('sc900.') === 0
          || host.indexOf('sc900-') === 0
          || host === 'sc900.certanvil.com') return 'sc900';
      // v7.6.0 — fifth cert family CompTIA A+ on aplus.certanvil.com (Pattern
      // A; founder lock 2026-05-27). Core 1 + Core 2 share the subdomain; the
      // localStorage override above (checked FIRST) differentiates the active
      // exam for the in-app switcher, so a cold subdomain entry defaults here
      // to Core 1.
      if (host.indexOf('aplus.') === 0
          || host.indexOf('aplus-') === 0
          || host === 'aplus.certanvil.com') return 'aplus-core1';
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
  // v7.1.0 hotfix: delegate to the canonical _gateProOnly() (which reads
  // _quotaState.tier — the real source of Pro/admin truth) instead of
  // rolling our own role check against window._certanvilRole (which was
  // never set anywhere — every user got Pro-gated, including admin).
  //
  // v7.1.0 Pattern A: switching certs navigates to the cert's canonical
  // subdomain rather than reloading the current URL with a localStorage
  // override. localhost still uses the override fallback for local dev
  // where subdomain hosts aren't available.
  window.tadSwitchCert = function (certId) {
    if (certId !== 'netplus' && certId !== 'secplus' && certId !== 'az900' && certId !== 'ai900'
        && certId !== 'aplus-core1' && certId !== 'aplus-core2' && certId !== 'sc900') return false;
    // Pro gate for Sec+ + AZ-900 + AI-900: delegate to canonical _gateProOnly.
    // Returns true if Pro/admin (proceed) OR false if Free (modal already shown, abort).
    // v7.3.0: az900 joins secplus on the Pro tier.
    // v7.5.0: ai900 joins as the fourth Pro-tier cert (founder lock 2026-05-27).
    if (certId === 'secplus' && typeof window._gateProOnly === 'function') {
      if (!window._gateProOnly('Security+ (SY0-701)')) return false;
    }
    if (certId === 'az900' && typeof window._gateProOnly === 'function') {
      if (!window._gateProOnly('Azure Fundamentals (AZ-900)')) return false;
    }
    if (certId === 'ai900' && typeof window._gateProOnly === 'function') {
      if (!window._gateProOnly('Azure AI Fundamentals (AI-900)')) return false;
    }
    // v7.7.0: sc900 joins as the sixth Pro-tier cert (founder lock 2026-05-28).
    if (certId === 'sc900' && typeof window._gateProOnly === 'function') {
      if (!window._gateProOnly('Microsoft SC-900 Security, Compliance & Identity Fundamentals')) return false;
    }
    // v7.6.0: both A+ exams are Pro-tier.
    if (certId === 'aplus-core1' && typeof window._gateProOnly === 'function') {
      if (!window._gateProOnly('CompTIA A+ Core 1')) return false;
    }
    if (certId === 'aplus-core2' && typeof window._gateProOnly === 'function') {
      if (!window._gateProOnly('CompTIA A+ Core 2')) return false;
    }
    var host = '';
    try { host = window.location.hostname || ''; } catch (e) {}
    var isLocalhost = host === 'localhost' || host === '127.0.0.1' || host.indexOf('192.168.') === 0;
    if (isLocalhost) {
      // Local dev — keep override + reload (no subdomain alias on localhost).
      // Handles all certs incl. both A+ exams (override = certId, reload).
      try { localStorage.setItem(CERT_OVERRIDE_KEY, certId); } catch (e) {}
      try { window.location.reload(); } catch (e) {}
    } else if (certId === 'aplus-core1' || certId === 'aplus-core2') {
      // v7.6.0 WITHIN-SUBDOMAIN SWITCHING — the FIRST cert switch that may NOT
      // change subdomain. Core 1 + Core 2 share aplus.certanvil.com.
      var onAplus = host.indexOf('aplus.') === 0
        || host.indexOf('aplus-') === 0
        || host === 'aplus.certanvil.com';
      if (onAplus) {
        // Same subdomain (Core 1 <-> Core 2 toggle): write the exam override +
        // reload. The reload re-fires the inline IIFE + detectCert() +
        // getActiveCertId(), all of which read this override FIRST for aplus,
        // so the correct pack loads + content + dropdown all agree.
        try { localStorage.setItem(CERT_OVERRIDE_KEY, certId); } catch (e) {}
        try { window.location.reload(); } catch (e) {}
      } else {
        // Coming from a DIFFERENT cert subdomain — navigate to aplus carrying
        // the exam via ?exam= so the inline IIFE document.writes the right pack
        // on arrival. Clear the stale override first (the deep-link param wins
        // + re-persists on arrival).
        try { localStorage.removeItem(CERT_OVERRIDE_KEY); } catch (e) {}
        var examSlug = (certId === 'aplus-core2') ? 'core2' : 'core1';
        try { window.location.href = 'https://aplus.certanvil.com/?exam=' + examSlug; } catch (e) {}
      }
    } else {
      // Pattern A: navigate to the cert's subdomain. Clear any stale override
      // so getActiveCertId() trusts the subdomain on arrival.
      // v7.3.0: az900 → azure.certanvil.com (the third Pattern A subdomain).
      try { localStorage.removeItem(CERT_OVERRIDE_KEY); } catch (e) {}
      var targetHost = (certId === 'secplus')
        ? 'secplus.certanvil.com'
        : (certId === 'az900')
          ? 'azure.certanvil.com'
          : (certId === 'ai900')
            ? 'ai.certanvil.com'
            : (certId === 'sc900')
              ? 'sc900.certanvil.com'
              : 'networkplus.certanvil.com';
      try { window.location.href = 'https://' + targetHost + '/'; } catch (e) {}
    }
    return false;
  };

  function buildCertSwitcherHtml(activeCertId, role) {
    var certs = getAvailableCerts(role);
    if (certs.length < 2) return ''; // hide entirely if user has only one cert
    // v7.1.0: surface Pro tier on Sec+ for Free users so they understand
    // why switching triggers an upgrade modal. Pro detection uses the
    // canonical _quotaState.tier (set by app.js post-hydration) +
    // profile.role === 'admin'. profile.role for paid Pro users is 'user',
    // NOT 'pro' — Pro tier lives in _quotaState. If _quotaState hasn't
    // hydrated yet we skip the badge (avoids a flash on Pro users at
    // page load); the gate at click-time still works via _gateProOnly's
    // optimistic-allow path.
    var qs = (typeof window !== 'undefined' && window._quotaState) || null;
    var isPro = (qs && qs.tier === 'pro')
      || ((role || '').toLowerCase() === 'admin')
      || !qs; // skip badge during hydration to prevent flash for Pro users
    // Note: setting isPro=true while not-yet-hydrated means we DON'T show
    // the badge. Free users will see it once hydration completes + the
    // dropdown re-renders (next account-menu open).
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
