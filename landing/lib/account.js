// ══════════════════════════════════════════════════════════════════════════
// CertAnvil — Account page logic (/account)
// ══════════════════════════════════════════════════════════════════════════
// Loaded after lib/supabase-umd.min.js + lib/supabase.js + auth.js.
//
// Responsibilities:
//   1. Auth-gate the page — anonymous users see the Sign-in CTA card.
//   2. Fetch the user's profile from Supabase (role + display_name + metadata)
//      and populate the identity card + Profile + Subscription sections.
//   3. Wire the 4 notification toggles to profiles.metadata.notifications.*
//      (toggles save immediately on click; visual state = persisted state).
//   4. Wire the data-export button to bundle profile + cert metadata + a
//      slice of quiz_history into a downloadable JSON.
//   5. Wire the sign-out-everywhere + delete-account flows.
//
// What this DOES NOT do (yet):
//   - Stripe billing portal integration (button is disabled with title hint;
//     Phase G ships the actual handoff).
//   - Email change flow (button disabled; needs Supabase RPC + verification).
//   - Multi-device session display (Supabase JS exposes only the current
//     session via getSession; admin-side sessions table query needs the
//     service-role key, which is server-only).
//   - Display-name edit (button shows a prompt() for now; Phase G replaces
//     with proper inline editing).
//
// All cross-cert account state is canonical here on certanvil.com.
// Cert-app /settings stays for app-prefs (exam date, daily goal, API key).
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var supabase = window.certanvilSupabase;
  if (!supabase) {
    console.warn('[certanvil-account] Supabase client missing — page disabled');
    return;
  }

  // ── DOM refs ────────────────────────────────────────────────────────────
  var elLoading = document.getElementById('account-loading');
  var elAnonGate = document.getElementById('account-anon-gate');
  var elContent = document.getElementById('account-content');
  var elAdminCtaBanner = document.getElementById('admin-cta-banner');

  var elIdAvatar = document.getElementById('id-avatar');
  var elIdEmail = document.getElementById('id-email');
  var elIdTierPill = document.getElementById('id-tier-pill');
  var elIdTierLabel = document.getElementById('id-tier-label');
  var elIdAdminPill = document.getElementById('id-admin-pill');
  var elIdMetaText = document.getElementById('id-meta-text');

  var elProfileEmail = document.getElementById('profile-email-display');
  var elProfileDisplayName = document.getElementById('profile-display-name');
  var elBtnEditDisplayName = document.getElementById('btn-edit-display-name');
  var elBtnChangeEmail = document.getElementById('btn-change-email');

  var elSubTierPill = document.getElementById('sub-tier-pill');
  var elSubTierLabel = document.getElementById('sub-tier-label');
  var elBtnUpgrade = document.getElementById('btn-upgrade');
  var elEntList = document.getElementById('ent-list');
  var elErList = document.getElementById('er-list');  // v4.93.0 exam results list

  var elSecurityEmailMono = document.getElementById('security-email-mono');
  var elSessionList = document.getElementById('session-list');
  var elBtnSignOutEverywhere = document.getElementById('btn-sign-out-everywhere');

  var elNotifyCertLaunch = document.getElementById('notify-cert-launch');
  var elNotifyWeeklyProgress = document.getElementById('notify-weekly-progress');
  var elNotifyExamApproaching = document.getElementById('notify-exam-approaching');
  var elNotifyMarketing = document.getElementById('notify-marketing');

  var elBtnExportData = document.getElementById('btn-export-data');
  var elBtnDeleteAccount = document.getElementById('btn-delete-account');
  var elDeletionStatus = document.getElementById('deletion-status');

  // ── State ──────────────────────────────────────────────────────────────
  var currentUser = null;
  var currentProfile = null;

  // Default notification preferences for a brand-new user. Marketing OFF
  // by default per user-respect default; everything else ON.
  var DEFAULT_NOTIFICATIONS = {
    cert_launch: true,
    weekly_progress: true,
    exam_approaching: true,
    marketing: false
  };

  // ── Toast helper ────────────────────────────────────────────────────────
  function toast(msg, kind) {
    var stack = document.getElementById('toast-stack');
    if (!stack) return;
    var t = document.createElement('div');
    t.className = 'toast toast-' + (kind || 'info');
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(function () { t.classList.add('is-fading'); }, 2400);
    setTimeout(function () { try { stack.removeChild(t); } catch (e) {} }, 3000);
  }

  // ── Cert pack catalog (local — same data as the landing's tile grid) ──
  // Phase G replaces with a query against cert_entitlements + a cert_packs
  // table. For now: hardcoded list of certs the user has access to, gated
  // by role for the admin's Security+ access.
  function getCertEntitlements(role) {
    var certs = [{
      id: 'netplus',
      name: 'Network+',
      code: 'N10-009',
      glyphClass: 'netplus',
      glyph: 'N+',
      meta: 'unlocked free · no expiry',
      // The user is the builder who passed Network+ — every signed-in user
      // sees Network+ as available; "passed" surfaces only if quiz_history
      // shows a successful exam attempt (Phase G refines via real query).
      status: 'active',  // 'active' | 'passed' | 'locked'
      cta: { label: 'Open →', href: 'https://networkplus.certanvil.com/?cert=netplus' }
    }];
    if (role === 'admin') {
      certs.push({
        id: 'secplus',
        name: 'Security+',
        code: 'SY0-701',
        glyphClass: 'secplus',
        glyph: 'S+',
        meta: 'private builder · target exam 2026-07-29',
        status: 'active',
        cta: { label: 'Resume →', href: 'https://networkplus.certanvil.com/?cert=secplus' }
      });
    } else {
      // Non-admin users see Security+ as locked (upgrade tease)
      certs.push({
        id: 'secplus',
        name: 'Security+',
        code: 'SY0-701',
        glyphClass: 'locked',
        glyph: 'S+',
        meta: 'upgrade to Pro to unlock',
        status: 'locked',
        cta: { label: 'Upgrade →', href: '#', disabled: true, title: 'Stripe billing coming with Phase G' }
      });
    }
    // The remaining 6 canonical MVP certs follow the same Pro-gating pattern as
    // Security+: admins get them active (open the cert app), non-admins see them
    // locked behind the Phase-G upgrade tease. Order matches the canonical set.
    var rest = [
      { id: 'aplus-core1', name: 'CompTIA A+ Core 1', code: '220-1201', glyph: 'A+' },
      { id: 'aplus-core2', name: 'CompTIA A+ Core 2', code: '220-1202', glyph: 'A+' },
      { id: 'az900',       name: 'Azure Fundamentals', code: 'AZ-900',  glyph: 'AZ' },
      { id: 'ai900',       name: 'Azure AI Fundamentals', code: 'AI-900', glyph: 'AI' },
      { id: 'sc900',       name: 'Microsoft SC-900',  code: 'SC-900',   glyph: 'SC' },
      { id: 'clfc02',      name: 'AWS Cloud Practitioner', code: 'CLF-C02', glyph: 'AWS' }
    ];
    rest.forEach(function (c) {
      if (role === 'admin') {
        certs.push({
          id: c.id,
          name: c.name,
          code: c.code,
          glyphClass: c.id,
          glyph: c.glyph,
          meta: 'private builder · admin access',
          status: 'active',
          cta: { label: 'Open →', href: 'https://networkplus.certanvil.com/?cert=' + c.id }
        });
      } else {
        certs.push({
          id: c.id,
          name: c.name,
          code: c.code,
          glyphClass: 'locked',
          glyph: c.glyph,
          meta: 'upgrade to Pro to unlock',
          status: 'locked',
          cta: { label: 'Upgrade →', href: '#', disabled: true, title: 'Stripe billing coming with Phase G' }
        });
      }
    });
    return certs;
  }

  // E2E hook (v7.8.2): expose the entitlements builder so Playwright can assert
  // the canonical 8-exam set + no phantom certs (cd8c784 contract). Read-only
  // data getter — mirrors the cert-app's window.renderHistoryPanel pattern.
  window.accGetCertEntitlements = getCertEntitlements;

  // ── Render: identity + profile + subscription ─────────────────────────
  function renderEverything(user, profile) {
    var role = (profile && profile.role) || 'user';
    var displayName = (profile && profile.display_name) || (user && user.email && user.email.split('@')[0]) || 'You';
    var email = (user && user.email) || '';
    var initial = email ? email.charAt(0).toUpperCase() : 'U';
    var createdAt = user && user.created_at ? new Date(user.created_at) : null;
    var memberSince = createdAt ? createdAt.toISOString().slice(0, 10) : '—';

    // Identity card
    if (elIdAvatar) elIdAvatar.textContent = initial;
    if (elIdEmail) elIdEmail.textContent = email;
    if (elIdMetaText) {
      var pieces = ['Member since ' + memberSince];
      if (role === 'admin') pieces.push('owner');
      elIdMetaText.textContent = pieces.join(' · ');
    }
    // Tier pill — admins are treated as Pro for entitlement purposes
    // (Phase E.4 SQL migration: is_pro() OR'd with role='admin'). Stripe-paying
    // users will get tier='pro' from subscriptions table once Stripe ships.
    var tierLabel;
    if (role === 'admin') tierLabel = 'Pro tier · all certs';
    else tierLabel = 'Free tier';
    if (elIdTierLabel) elIdTierLabel.textContent = tierLabel;
    if (elIdAdminPill) {
      if (role === 'admin') elIdAdminPill.removeAttribute('hidden');
      else elIdAdminPill.setAttribute('hidden', '');
    }

    // Admin CTA banner above identity card
    if (elAdminCtaBanner) {
      if (role === 'admin') elAdminCtaBanner.removeAttribute('hidden');
      else elAdminCtaBanner.setAttribute('hidden', '');
    }

    // Profile section
    if (elProfileEmail) elProfileEmail.textContent = email;
    if (elProfileDisplayName) elProfileDisplayName.textContent = displayName;

    // Subscription tier — same logic as the tier pill above (admin = Pro for now)
    if (elSubTierLabel) elSubTierLabel.textContent = tierLabel;

    // Cert entitlements (status now reflects metadata.cert_results when present)
    if (elEntList) elEntList.innerHTML = renderEntitlements(role, profile);

    // Exam results section (v4.93.0)
    if (elErList) elErList.innerHTML = renderExamResultsList(role, profile);

    // Security email
    if (elSecurityEmailMono) elSecurityEmailMono.textContent = email;

    // Active sessions — only the current one is exposed by Supabase JS
    if (elSessionList) elSessionList.innerHTML = renderCurrentSession();

    // Notifications
    var notif = (profile && profile.metadata && profile.metadata.notifications) || DEFAULT_NOTIFICATIONS;
    setToggleState(elNotifyCertLaunch, notif.cert_launch !== false);
    setToggleState(elNotifyWeeklyProgress, notif.weekly_progress !== false);
    setToggleState(elNotifyExamApproaching, notif.exam_approaching !== false);
    setToggleState(elNotifyMarketing, notif.marketing === true);

    // Deletion status
    var deletionRequestedAt = profile && profile.metadata && profile.metadata.deletion_requested_at;
    if (deletionRequestedAt && elDeletionStatus) {
      var d = new Date(deletionRequestedAt);
      var purgeDate = new Date(d.getTime() + 7 * 86400000);
      elDeletionStatus.textContent = 'Deletion scheduled for ' + purgeDate.toISOString().slice(0, 10) + ' — sign in any time before then to cancel.';
      elDeletionStatus.removeAttribute('hidden');
    }
  }

  function renderEntitlements(role, profile) {
    var certs = getCertEntitlements(role);
    var results = (profile && profile.metadata && profile.metadata.cert_results) || {};
    return certs.map(function (c) {
      // v4.93.0: if user has marked a real-exam result, override the entitlement
      // status + meta line so "Passed 767/900" shows here instead of "active".
      var result = results[c.id];
      var displayStatus = c.status;
      var displayMeta = c.meta;
      if (result && result.status === 'passed') {
        displayStatus = 'passed';
        displayMeta = '✓ ' + result.score + '/' + result.max_score + ' · Passed ' + result.date;
      } else if (result && result.status === 'attempted') {
        displayStatus = 'attempted';
        displayMeta = '○ ' + result.score + '/' + result.max_score + ' · Attempted ' + result.date;
      }
      var statusPill = '';
      if (displayStatus === 'passed') {
        statusPill = '<span class="ent-status-pill is-passed">✓ Passed</span>';
      } else if (displayStatus === 'attempted') {
        statusPill = '<span class="ent-status-pill is-attempted">○ Attempted</span>';
      } else if (displayStatus === 'active') {
        statusPill = '<span class="ent-status-pill is-active"><span aria-hidden="true">●</span> Active</span>';
      } else if (displayStatus === 'locked') {
        statusPill = '<span class="ent-status-pill is-locked">Locked</span>';
      }
      var ctaAttrs = c.cta.disabled
        ? 'disabled aria-disabled="true" title="' + escapeHtml(c.cta.title || '') + '"'
        : 'data-href="' + escapeHtml(c.cta.href) + '"';
      var btnClass = c.cta.disabled ? 'btn-ghost-sm' : (c.status === 'locked' ? 'btn-primary-sm' : 'btn-ghost-sm');
      return ''
        + '<div class="ent-row' + (c.status === 'locked' ? ' is-locked' : '') + '">'
        +   '<div class="ent-glyph ' + c.glyphClass + '">' + certGlyphHTML(c.glyph, c.glyphClass) + '</div>'
        +   '<div class="ent-info">'
        +     '<div class="ent-name-row">'
        +       '<span class="ent-name">' + escapeHtml(c.name) + '</span>'
        +       statusPill
        +     '</div>'
        +     '<div class="ent-meta">' + escapeHtml(c.code) + ' · ' + escapeHtml(displayMeta) + '</div>'
        +   '</div>'
        +   '<button class="' + btnClass + ' ent-cta-btn" ' + ctaAttrs + '>' + escapeHtml(c.cta.label) + '</button>'
        + '</div>';
    }).join('');
  }

  // ── Exam results (v4.93.0) ──────────────────────────────────────────────
  // Per-cert "I passed" / "I attempted" tracker. Stores result on
  // profiles.metadata.cert_results.<cert>. Anonymous visitors don't see this
  // section at all (auth gate at top of file blocks /account from rendering).

  // Exam-format defaults per cert. CompTIA uses 100-900 scaled with cert-
  // specific cutoffs. Future certs (CCNA, AWS) override here when added.
  var EXAM_FORMATS = {
    netplus:       { format: 'scaled', maxScore: 900, passScore: 720, examName: 'Network+ N10-009' },
    secplus:       { format: 'scaled', maxScore: 900, passScore: 750, examName: 'Security+ SY0-701' },
    'aplus-core1': { format: 'scaled', maxScore: 900, passScore: 675, examName: 'CompTIA A+ Core 1 220-1201' },
    'aplus-core2': { format: 'scaled', maxScore: 900, passScore: 700, examName: 'CompTIA A+ Core 2 220-1202' },
    az900:         { format: 'percent', maxScore: 1000, passScore: 700, examName: 'Azure Fundamentals AZ-900' },
    ai900:         { format: 'percent', maxScore: 1000, passScore: 700, examName: 'Azure AI Fundamentals AI-900' },
    sc900:         { format: 'percent', maxScore: 1000, passScore: 700, examName: 'Microsoft SC-900' },
    clfc02:        { format: 'percent', maxScore: 1000, passScore: 700, examName: 'AWS Cloud Practitioner CLF-C02' }
  };

  function renderExamResultsList(role, profile) {
    // GAP-5 (v7.44.0): logging real exam results is Pro-only per the
    // cert-ios-log-result mockup. Same tier logic as the tier pill above:
    // admin = Pro until Stripe lands; paying users will arrive as tier='pro'.
    if (role !== 'admin') {
      return ''
        + '<div class="er-pro-lock">'
        +   '<span class="er-pro-lock-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>Pro</span>'
        +   '<p>Logging real exam results is part of Pro. Record your score and test centre after exam day, and your cert tile flips to <b>Passed</b>.</p>'
        +   '<a class="btn-primary-cta" href="/pricing">See Pro plans →</a>'
        + '</div>';
    }
    var certs = getCertEntitlements(role).filter(function (c) { return c.status !== 'locked'; });
    if (!certs.length) {
      return '<p class="er-empty">No certs unlocked yet. Pick a cert and start studying.</p>';
    }
    var results = (profile && profile.metadata && profile.metadata.cert_results) || {};
    return certs.map(function (c) { return renderExamResultRow(c, results[c.id]); }).join('');
  }

  function renderExamResultRow(cert, result) {
    var fmt = EXAM_FORMATS[cert.id] || { maxScore: 900, passScore: 720, examName: cert.name };
    if (result && result.status === 'passed') {
      return ''
        + '<div class="er-row is-passed" data-cert="' + cert.id + '">'
        +   '<div class="er-glyph ' + cert.glyphClass + '">' + certGlyphHTML(cert.glyph, cert.glyphClass) + '</div>'
        +   '<div class="er-info">'
        +     '<div class="er-name">' + escapeHtml(cert.name) + ' · ' + escapeHtml(cert.code) + '</div>'
        +     '<div class="er-detail">'
        +       escapeHtml(String(result.score)) + ' / ' + escapeHtml(String(result.max_score))
        +       ' · Passed ' + escapeHtml(result.date)
        +       (result.centre ? ' · ' + escapeHtml(result.centre) : '')
        +     '</div>'
        +   '</div>'
        +   '<div class="er-action-cluster">'
        +     '<span class="er-status is-passed">✓ Passed</span>'
        +     '<button class="er-action" data-er-edit="' + cert.id + '">Edit</button>'
        +   '</div>'
        + '</div>';
    }
    if (result && result.status === 'attempted') {
      return ''
        + '<div class="er-row is-attempted" data-cert="' + cert.id + '">'
        +   '<div class="er-glyph ' + cert.glyphClass + '">' + certGlyphHTML(cert.glyph, cert.glyphClass) + '</div>'
        +   '<div class="er-info">'
        +     '<div class="er-name">' + escapeHtml(cert.name) + ' · ' + escapeHtml(cert.code) + '</div>'
        +     '<div class="er-detail">'
        +       escapeHtml(String(result.score)) + ' / ' + escapeHtml(String(result.max_score))
        +       ' · Attempted ' + escapeHtml(result.date)
        +     '</div>'
        +   '</div>'
        +   '<div class="er-action-cluster">'
        +     '<span class="er-status is-attempted">○ Attempted</span>'
        +     '<button class="er-action" data-er-edit="' + cert.id + '">Edit</button>'
        +   '</div>'
        + '</div>';
    }
    return ''
      + '<div class="er-row" data-cert="' + cert.id + '">'
      +   '<div class="er-glyph ' + cert.glyphClass + '">' + certGlyphHTML(cert.glyph, cert.glyphClass) + '</div>'
      +   '<div class="er-info">'
      +     '<div class="er-name">' + escapeHtml(cert.name) + ' · ' + escapeHtml(cert.code) + '</div>'
      +     '<div class="er-detail">' + escapeHtml(fmt.examName) + ' · pass ≥ ' + fmt.passScore + '/' + fmt.maxScore + '</div>'
      +   '</div>'
      +   '<div class="er-action-cluster">'
      +     '<span class="er-status is-not-taken">Not taken yet</span>'
      +     '<button class="er-action" data-er-edit="' + cert.id + '">Mark result →</button>'
      +   '</div>'
      + '</div>';
  }

  function expandExamForm(certId) {
    var row = document.querySelector('.er-row[data-cert="' + certId + '"]');
    if (!row) return;
    var fmt = EXAM_FORMATS[certId] || { maxScore: 900, passScore: 720, examName: certId };
    var result = (currentProfile && currentProfile.metadata && currentProfile.metadata.cert_results && currentProfile.metadata.cert_results[certId]) || null;
    var initialStatus = (result && result.status) || 'passed';
    var initialScore = (result && result.score != null) ? result.score : '';
    var initialDate = (result && result.date) || new Date().toISOString().slice(0, 10);
    var initialCentre = (result && result.centre) || '';

    var formHtml = ''
      + '<div class="er-form" data-cert-form="' + certId + '">'
      +   '<div class="er-form-pass-toggle" role="tablist">'
      +     '<button class="' + (initialStatus === 'passed' ? 'is-active passed' : '') + '" type="button" data-er-toggle="passed">✓ I passed</button>'
      +     '<button class="' + (initialStatus === 'attempted' ? 'is-active failed' : '') + '" type="button" data-er-toggle="attempted">I attempted</button>'
      +   '</div>'
      +   '<div class="er-form-row">'
      +     '<div class="er-field">'
      +       '<label class="er-field-label">Your score</label>'
      +       '<input class="er-field-input" type="number" min="0" max="' + fmt.maxScore + '" placeholder="e.g. ' + fmt.passScore + '" value="' + escapeHtml(String(initialScore)) + '" data-er-field="score">'
      +       '<span class="er-field-help">Out of ' + fmt.maxScore + ' · pass ≥ ' + fmt.passScore + '</span>'
      +     '</div>'
      +     '<div class="er-field">'
      +       '<label class="er-field-label">Date of exam</label>'
      +       '<input class="er-field-input" type="date" value="' + escapeHtml(initialDate) + '" data-er-field="date">'
      +       '<span class="er-field-help">Backdate fine. We trust your date.</span>'
      +     '</div>'
      +   '</div>'
      +   '<div class="er-form-row full">'
      +     '<div class="er-field">'
      +       '<label class="er-field-label">Test centre <em class="er-optional">(optional)</em></label>'
      +       '<input class="er-field-input" type="text" placeholder="Pearson VUE / online proctor / centre name" value="' + escapeHtml(initialCentre) + '" data-er-field="centre">'
      +     '</div>'
      +   '</div>'
      +   '<div class="er-form-actions">'
      +     '<button class="er-btn er-btn-secondary" type="button" data-er-cancel>Cancel</button>'
      +     '<button class="er-btn er-btn-primary" type="button" data-er-save="' + certId + '">Save result</button>'
      +   '</div>'
      + '</div>';
    row.classList.add('is-expanded');
    var existing = row.querySelector('.er-form');
    if (existing) existing.remove();
    row.insertAdjacentHTML('beforeend', formHtml);

    // Wire pass/fail toggle in the new form
    var formEl = row.querySelector('.er-form');
    formEl.querySelectorAll('[data-er-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-er-toggle');
        formEl.querySelectorAll('[data-er-toggle]').forEach(function (b) { b.classList.remove('is-active', 'passed', 'failed'); });
        btn.classList.add('is-active', kind === 'passed' ? 'passed' : 'failed');
      });
    });
    formEl.querySelector('[data-er-cancel]').addEventListener('click', function () { collapseExamForm(certId); });
    formEl.querySelector('[data-er-save]').addEventListener('click', function () { handleSaveExamResult(certId); });
  }

  function collapseExamForm(certId) {
    var row = document.querySelector('.er-row[data-cert="' + certId + '"]');
    if (!row) return;
    var form = row.querySelector('.er-form');
    if (form) form.remove();
    row.classList.remove('is-expanded');
  }

  function handleSaveExamResult(certId) {
    var row = document.querySelector('.er-row[data-cert="' + certId + '"]');
    if (!row || !currentUser) return;
    var form = row.querySelector('.er-form');
    if (!form) return;
    var fmt = EXAM_FORMATS[certId] || { maxScore: 900, passScore: 720 };
    var activeToggle = form.querySelector('[data-er-toggle].is-active');
    var status = activeToggle ? activeToggle.getAttribute('data-er-toggle') : 'passed';
    var score = parseInt(form.querySelector('[data-er-field="score"]').value, 10);
    var date = form.querySelector('[data-er-field="date"]').value;
    var centre = form.querySelector('[data-er-field="centre"]').value.trim();

    if (!Number.isFinite(score) || score < 0 || score > fmt.maxScore) {
      toast('Please enter a valid score between 0 and ' + fmt.maxScore + '.', 'error');
      return;
    }
    if (!date) {
      toast('Please enter the exam date.', 'error');
      return;
    }
    // Sanity check: status=passed but score < passScore → confirm
    if (status === 'passed' && score < fmt.passScore) {
      if (!confirm('Score ' + score + '/' + fmt.maxScore + ' is below the pass cutoff (' + fmt.passScore + '). Mark as Attempted instead?')) return;
      status = 'attempted';
    }

    var nowIso = new Date().toISOString();
    var meta = (currentProfile && currentProfile.metadata) || {};
    var certResults = meta.cert_results || {};
    var prev = certResults[certId] || {};
    certResults[certId] = {
      status: status,
      score: score,
      max_score: fmt.maxScore,
      pass_score: fmt.passScore,
      date: date,
      centre: centre || null,
      created_at: prev.created_at || nowIso,
      updated_at: nowIso
    };
    var nextMeta = Object.assign({}, meta, { cert_results: certResults });

    supabase.from('profiles').update({ metadata: nextMeta }).eq('id', currentUser.id).then(function (r) {
      if (r.error) {
        console.error('[certanvil-account] cert result save failed', r.error);
        toast('Couldn\'t save result. Try again.', 'error');
        return;
      }
      currentProfile.metadata = nextMeta;
      collapseExamForm(certId);
      // Re-render the list to show the new state
      if (elErList) elErList.innerHTML = renderExamResultsList((currentProfile && currentProfile.role) || 'user', currentProfile);
      // Also refresh the entitlements list since its status reflects cert_results
      if (elEntList) elEntList.innerHTML = renderEntitlements((currentProfile && currentProfile.role) || 'user', currentProfile);
      // Wire the new edit buttons
      wireExamResultButtons();
      // Fire celebration modal — passed = confetti, attempted = encouragement
      openExamResultModal(certId, certResults[certId]);
    }).catch(function (err) {
      console.error('[certanvil-account] cert result save threw', err);
      toast('Couldn\'t save. Try again.', 'error');
    });
  }

  function openExamResultModal(certId, result) {
    var fmt = EXAM_FORMATS[certId] || { maxScore: 900, passScore: 720, examName: certId };
    var cert = getCertEntitlements((currentProfile && currentProfile.role) || 'user').find(function (c) { return c.id === certId; }) || { name: certId, glyph: '?', glyphClass: '' };
    var passed = result.status === 'passed';
    var deltaText = '';
    if (passed) {
      var above = result.score - fmt.passScore;
      deltaText = above + ' point' + (above === 1 ? '' : 's') + ' above the ' + fmt.passScore + ' cutoff';
    } else {
      var below = fmt.passScore - result.score;
      deltaText = below + ' point' + (below === 1 ? '' : 's') + ' below the ' + fmt.passScore + ' cutoff';
    }

    // Build modal HTML — all inline so we don't need a static dialog element
    var sprinkles = passed
      ? '<div class="confetti-sprinkle" style="top:10%;left:8%;width:12px;height:12px;background:#22c55e;border-radius:2px;transform:rotate(20deg)"></div>'
        + '<div class="confetti-sprinkle" style="top:20%;left:88%;width:10px;height:10px;background:#f472b6;border-radius:50%"></div>'
        + '<div class="confetti-sprinkle" style="top:35%;left:14%;width:8px;height:14px;background:#fbbf24;transform:rotate(45deg)"></div>'
        + '<div class="confetti-sprinkle" style="top:55%;left:90%;width:14px;height:8px;background:#b8860b;transform:rotate(15deg)"></div>'
        + '<div class="confetti-sprinkle" style="top:70%;left:6%;width:10px;height:10px;background:#06b6d4"></div>'
        + '<div class="confetti-sprinkle" style="top:80%;left:80%;width:12px;height:12px;background:#22c55e;border-radius:50%"></div>'
        + '<div class="confetti-sprinkle" style="top:14%;left:50%;width:8px;height:8px;background:#f59e0b;border-radius:2px"></div>'
        + '<div class="confetti-sprinkle" style="top:88%;left:48%;width:10px;height:10px;background:#d4a574;border-radius:50%"></div>'
      : '';
    var bodyHtml = passed
      ? '<div class="confetti-burst"></div>'
        + '<div class="confetti-eyebrow">CERT PASSED</div>'
        + '<h2 class="confetti-title">You crushed it.</h2>'
        + '<p class="confetti-prose">' + escapeHtml(cert.name) + ' in the bag. Your tile on the home page just earned a Passed badge.</p>'
        + '<div class="confetti-cert-card">'
        +   '<div class="confetti-cert-row">'
        +     '<div class="confetti-cert-glyph ' + cert.glyphClass + '">' + certGlyphHTML(cert.glyph, cert.glyphClass) + '</div>'
        +     '<div style="flex:1">'
        +       '<div class="confetti-cert-name">' + escapeHtml(fmt.examName) + '</div>'
        +       '<div class="confetti-cert-sub">CompTIA scaled score</div>'
        +     '</div>'
        +     '<span class="confetti-score-pill">✓ ' + result.score + ' / ' + result.max_score + '</span>'
        +   '</div>'
        +   '<div class="confetti-meta">Passed ' + escapeHtml(result.date) + (result.centre ? ' · ' + escapeHtml(result.centre) : '') + ' · ' + deltaText + '</div>'
        + '</div>'
        + '<div class="confetti-actions">'
        +   '<a class="confetti-btn confetti-btn-primary" href="/">View on home page →</a>'
        +   '<button class="confetti-btn confetti-btn-secondary" data-erm-close>Close</button>'
        + '</div>'
      : '<div class="confetti-burst" style="font-size:48px">🎯</div>'
        + '<div class="confetti-eyebrow att-eyebrow">ATTEMPT LOGGED</div>'
        + '<h2 class="confetti-title">Close — and we mean it.</h2>'
        + '<p class="confetti-prose">First-attempt fails are normal. Your study data is intact, your weak spots are mapped, and you have plenty of retake window left.</p>'
        + '<div class="confetti-cert-card att-cert-card">'
        +   '<div class="confetti-cert-row">'
        +     '<div class="confetti-cert-glyph ' + cert.glyphClass + '">' + certGlyphHTML(cert.glyph, cert.glyphClass) + '</div>'
        +     '<div style="flex:1">'
        +       '<div class="confetti-cert-name">' + escapeHtml(fmt.examName) + '</div>'
        +       '<div class="confetti-cert-sub">CompTIA scaled score</div>'
        +     '</div>'
        +     '<span class="confetti-score-pill">' + result.score + ' / ' + result.max_score + '</span>'
        +   '</div>'
        +   '<div class="confetti-meta">Attempted ' + escapeHtml(result.date) + ' · ' + deltaText + '</div>'
        + '</div>'
        + '<div class="confetti-actions">'
        +   '<button class="confetti-btn confetti-btn-primary" data-erm-close>Keep practicing</button>'
        + '</div>';
    var modalHtml = ''
      + '<div class="erm-backdrop" id="exam-result-modal-backdrop">'
      +   sprinkles
      +   '<div class="erm-modal' + (passed ? '' : ' is-attempted') + '" role="dialog" aria-modal="true" aria-labelledby="erm-title">'
      +     bodyHtml
      +   '</div>'
      + '</div>';
    var host = document.createElement('div');
    host.innerHTML = modalHtml;
    document.body.appendChild(host.firstChild);
    document.body.style.overflow = 'hidden';

    var backdrop = document.getElementById('exam-result-modal-backdrop');
    function close() {
      if (backdrop) backdrop.remove();
      document.body.style.overflow = '';
    }
    backdrop.querySelectorAll('[data-erm-close]').forEach(function (b) { b.addEventListener('click', close); });
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) close();
    });
    document.addEventListener('keydown', function escClose(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escClose); }
    });
  }

  function wireExamResultButtons() {
    document.querySelectorAll('[data-er-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var certId = btn.getAttribute('data-er-edit');
        expandExamForm(certId);
      });
    });
  }

  function renderCurrentSession() {
    var ua = navigator.userAgent || '';
    var device = 'This browser';
    if (/iPhone|iPad/.test(ua)) device = 'iOS device';
    else if (/Android/.test(ua)) device = 'Android device';
    else if (/Mac OS X/.test(ua)) device = 'Mac';
    else if (/Windows/.test(ua)) device = 'Windows PC';
    else if (/Linux/.test(ua)) device = 'Linux machine';

    var browser = 'Browser';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/Chrome\//.test(ua)) browser = 'Chrome';
    else if (/Safari\//.test(ua)) browser = 'Safari';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';

    return ''
      + '<div class="session-row">'
      +   '<div class="session-icon" aria-hidden="true"></div>'
      +   '<div class="session-info">'
      +     '<div class="session-name">' + escapeHtml(device) + ' · ' + escapeHtml(browser)
      +       ' <span class="session-current-pill">This device</span>'
      +     '</div>'
      +     '<div class="session-meta">Active right now · cookie-backed session (cross-subdomain)</div>'
      +   '</div>'
      + '</div>';
  }

  function setToggleState(btn, on) {
    if (!btn) return;
    if (on) {
      btn.classList.add('is-on');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('is-on');
      btn.setAttribute('aria-pressed', 'false');
    }
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

  function certGlyphHTML(glyph, glyphClass){
    var g = String(glyph || '');
    if (!g) return '';
    var sup = glyphClass === 'aplus-core1' ? '1' : glyphClass === 'aplus-core2' ? '2' : '';
    var esc = function(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
    var head = esc(g.slice(0, -1)), last = esc(g.slice(-1));
    return '<span class="cg">' + head + '<span class="cg-ac">' + last + '</span>' + (sup ? '<span class="cg-sup">' + sup + '</span>' : '') + '</span>';
  }

  // ── Notification toggle persistence ─────────────────────────────────────
  function wireNotificationToggle(btn, key) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      var nextOn = !btn.classList.contains('is-on');
      setToggleState(btn, nextOn);
      saveNotificationPref(key, nextOn);
    });
  }

  function saveNotificationPref(key, value) {
    if (!currentUser) return;
    var meta = (currentProfile && currentProfile.metadata) || {};
    var notif = meta.notifications || {};
    notif[key] = value;
    var nextMeta = Object.assign({}, meta, { notifications: notif });

    supabase.from('profiles').update({ metadata: nextMeta }).eq('id', currentUser.id).then(function (r) {
      if (r.error) {
        console.error('[certanvil-account] notification save failed', r.error);
        toast('Couldn\'t save notification preference. Try again.', 'error');
        // Roll back the visual state
        setToggleState(document.getElementById('notify-' + key.replace(/_/g, '-')), !value);
        return;
      }
      currentProfile.metadata = nextMeta;
      toast('Saved.', 'success');
    }).catch(function (err) {
      console.error('[certanvil-account] notification save threw', err);
      toast('Couldn\'t save. Try again.', 'error');
    });
  }

  // ── Display-name edit (simple prompt for now) ───────────────────────────
  function wireDisplayNameEdit() {
    if (!elBtnEditDisplayName) return;
    elBtnEditDisplayName.addEventListener('click', function () {
      var current = elProfileDisplayName ? elProfileDisplayName.textContent : '';
      var next = prompt('Display name:', current);
      if (next == null || next.trim() === '' || next.trim() === current) return;
      var trimmed = next.trim().slice(0, 60);  // cap
      supabase.from('profiles').update({ display_name: trimmed }).eq('id', currentUser.id).then(function (r) {
        if (r.error) { toast('Couldn\'t save name. Try again.', 'error'); return; }
        if (elProfileDisplayName) elProfileDisplayName.textContent = trimmed;
        if (currentProfile) currentProfile.display_name = trimmed;
        toast('Display name updated.', 'success');
      }).catch(function () { toast('Couldn\'t save name.', 'error'); });
    });
  }

  // ── Cert entitlement CTAs ──────────────────────────────────────────────
  function wireEntitlementCtas() {
    if (!elEntList) return;
    elEntList.addEventListener('click', function (e) {
      var btn = e.target.closest('.ent-cta-btn[data-href]');
      if (!btn || btn.hasAttribute('disabled')) return;
      var href = btn.getAttribute('data-href');
      if (!href || href === '#') return;
      window.location.href = href;
    });
  }

  // ── Data export ────────────────────────────────────────────────────────
  function wireDataExport() {
    if (!elBtnExportData) return;
    elBtnExportData.addEventListener('click', function () {
      if (!currentUser) return;
      elBtnExportData.disabled = true;
      var origText = elBtnExportData.textContent;
      elBtnExportData.textContent = 'Building archive…';

      // Pull the user's profile + recent quiz_history (latest 500 rows)
      Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).single(),
        supabase.from('quiz_history').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(500),
      ]).then(function (results) {
        var archive = {
          exported_at: new Date().toISOString(),
          exported_by: currentUser.email,
          source: 'certanvil.com/account · data export',
          profile: results[0].data || null,
          profile_error: results[0].error ? results[0].error.message : null,
          quiz_history: (results[1].data || []),
          quiz_history_count: (results[1].data || []).length,
          quiz_history_error: results[1].error ? results[1].error.message : null,
        };
        var json = JSON.stringify(archive, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'certanvil-account-' + currentUser.email.replace(/[^a-z0-9]/gi, '_') + '-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('Downloaded. Profile + ' + (archive.quiz_history.length) + ' quiz history rows.', 'success');
      }).catch(function (err) {
        console.error('[certanvil-account] export failed', err);
        toast('Export failed. Try again.', 'error');
      }).then(function () {
        elBtnExportData.disabled = false;
        elBtnExportData.textContent = origText;
      });
    });
  }

  // ── Sign out everywhere ────────────────────────────────────────────────
  function wireSignOutEverywhere() {
    if (!elBtnSignOutEverywhere) return;
    elBtnSignOutEverywhere.addEventListener('click', function () {
      if (!confirm('Sign out of every device, including this one? You\'ll need to sign in again next time.')) return;
      supabase.auth.signOut({ scope: 'global' }).then(function () {
        window.location.href = '/';
      }).catch(function () {
        // Fallback: local sign-out
        supabase.auth.signOut().then(function () { window.location.href = '/'; });
      });
    });
  }

  // ── Delete account (soft-delete via metadata flag) ─────────────────────
  function wireDeleteAccount() {
    if (!elBtnDeleteAccount) return;
    elBtnDeleteAccount.addEventListener('click', function () {
      if (!currentUser) return;
      var msg = 'Delete your CertAnvil account?\n\n'
        + 'This marks your account for deletion. After 7 days, your profile + quiz history are permanently purged.\n\n'
        + 'You can cancel during the grace window by signing in and clicking "Cancel deletion" below this button.\n\n'
        + 'Are you sure?';
      if (!confirm(msg)) return;

      var meta = (currentProfile && currentProfile.metadata) || {};
      var nextMeta = Object.assign({}, meta, {
        deletion_requested_at: new Date().toISOString(),
      });
      supabase.from('profiles').update({ metadata: nextMeta }).eq('id', currentUser.id).then(function (r) {
        if (r.error) { toast('Couldn\'t schedule deletion. Try again.', 'error'); return; }
        currentProfile.metadata = nextMeta;
        var purgeDate = new Date(Date.now() + 7 * 86400000);
        if (elDeletionStatus) {
          elDeletionStatus.textContent = 'Deletion scheduled for ' + purgeDate.toISOString().slice(0, 10) + ' — sign in any time before then to cancel.';
          elDeletionStatus.removeAttribute('hidden');
        }
        toast('Account marked for deletion. 7-day grace window.', 'info');
      }).catch(function () { toast('Couldn\'t schedule deletion.', 'error'); });
    });
  }

  // ── Init: auth-gate + populate ────────────────────────────────────────
  function init() {
    supabase.auth.getSession().then(function (r) {
      var session = r && r.data ? r.data.session : null;
      if (!session || !session.user) {
        // Anonymous — show gate
        if (elLoading) elLoading.setAttribute('hidden', '');
        if (elAnonGate) elAnonGate.removeAttribute('hidden');
        return;
      }
      currentUser = session.user;

      // Fetch profile (role, display_name, metadata)
      supabase.from('profiles').select('id, email, display_name, role, active_cert, exam_date, metadata, created_at, updated_at').eq('id', currentUser.id).single().then(function (pr) {
        currentProfile = pr.data || { role: 'user', display_name: null, metadata: {} };
        if (elLoading) elLoading.setAttribute('hidden', '');
        if (elContent) elContent.removeAttribute('hidden');
        renderEverything(currentUser, currentProfile);
        wireExamResultButtons();  // v4.93.0: wire after first render
      }).catch(function (err) {
        console.error('[certanvil-account] profile fetch failed', err);
        currentProfile = { role: 'user', display_name: null, metadata: {} };
        if (elLoading) elLoading.setAttribute('hidden', '');
        if (elContent) elContent.removeAttribute('hidden');
        renderEverything(currentUser, currentProfile);
        wireExamResultButtons();
      });
    }).catch(function (err) {
      console.error('[certanvil-account] getSession failed', err);
      if (elLoading) elLoading.setAttribute('hidden', '');
      if (elAnonGate) elAnonGate.removeAttribute('hidden');
    });
  }

  // Wire everything once on load — these don't depend on the auth result
  // so they're safe to attach before init() resolves.
  wireNotificationToggle(elNotifyCertLaunch, 'cert_launch');
  wireNotificationToggle(elNotifyWeeklyProgress, 'weekly_progress');
  wireNotificationToggle(elNotifyExamApproaching, 'exam_approaching');
  wireNotificationToggle(elNotifyMarketing, 'marketing');
  wireDisplayNameEdit();
  wireEntitlementCtas();
  wireDataExport();
  wireSignOutEverywhere();
  wireDeleteAccount();

  // Initial auth check
  init();
})();
