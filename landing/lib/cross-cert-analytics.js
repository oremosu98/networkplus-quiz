// ══════════════════════════════════════════════════════════════════════════
// CertAnvil — Cross-cert analytics page logic (/analytics)
// ══════════════════════════════════════════════════════════════════════════
// Loaded after lib/supabase-umd.min.js + lib/supabase.js + auth.js.
//
// Phase A (this ship): skeleton page + Panel 1 (pass-readiness side-by-side,
// status-grouped). Reads profile.metadata.cert_results to drive the passed-
// cert visual treatment + uses local cert catalog for active/coming-soon
// rows. Readiness number for active certs is "Continue studying" placeholder
// until Phase A.5 ships the readiness-snapshot pipeline (cert app writes
// metadata.readiness_snapshots.<cert> after each quiz; landing reads it).
//
// Phases NOT in this ship:
//   - Phase A.5: live readiness gauges for active certs (snapshot pipeline)
//   - Phase B: Panel 2 skill overlap + CROSS_CERT_OVERLAP table
//   - Phase C: Panel 3 deterministic next-up ranker
//   - Phase D: replace the launcher modal on dashboard with a route to here
//
// The mockup at mockups/cross-cert-analytics-concept.html is the visual
// contract for all 4 phases.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var supabase = window.certanvilSupabase;
  if (!supabase) {
    console.warn('[certanvil-cca] Supabase client missing — page disabled');
    return;
  }

  // ── DOM refs ────────────────────────────────────────────────────────────
  var elLoading = document.getElementById('cca-loading');
  var elAnonGate = document.getElementById('cca-anon-gate');
  var elContent = document.getElementById('cca-content');
  var elEmptyState = document.getElementById('cca-empty-state');
  var elPanelPr = document.getElementById('cca-panel-pr');
  var elPrList = document.getElementById('cca-pr-list');

  // ── Cert catalog ────────────────────────────────────────────────────────
  // Local source of truth for the analytics page. Six certs in the pipeline.
  // Phase G consolidates this with cert_entitlements DB table.
  //
  // Status semantics:
  //   - 'active' — cert is live in the app, user can study it (gated by role/Pro for Sec+)
  //   - 'soon' — coming soon, no study possible yet
  //   - 'passed' — derived at runtime from profile.metadata.cert_results.<cert>.status
  function getCertCatalog(role) {
    return [
      {
        id: 'netplus',
        name: 'Network+',
        code: 'N10-009',
        glyphClass: 'netplus',
        glyph: 'N+',
        status: 'active',
        examFormat: 'scaled',
        maxScore: 900,
        passScore: 720,
        examName: 'Network+ N10-009',
        cta: { label: 'Open →', href: 'https://networkplus.certanvil.com/?cert=netplus' },
        coachActive: 'Foundation cert — opens the door to CCNA, AWS networking, and beyond.'
      },
      {
        id: 'secplus',
        name: 'Security+',
        code: 'SY0-701',
        glyphClass: 'secplus',
        glyph: 'S+',
        status: role === 'admin' ? 'active' : 'locked',
        examFormat: 'scaled',
        maxScore: 900,
        passScore: 750,
        examName: 'Security+ SY0-701',
        cta: role === 'admin'
          ? { label: 'Resume →', href: 'https://networkplus.certanvil.com/?cert=secplus' }
          : { label: 'Upgrade →', href: '#', disabled: true, title: 'Stripe billing coming with Phase G' },
        coachActive: 'Builds on N+ — 65% knowledge transfer from Network+.'
      },
      {
        id: 'az900',
        name: 'Azure Fundamentals',
        code: 'AZ-900',
        glyphClass: 'az900',
        glyph: 'AZ',
        status: 'soon',
        examFormat: 'percent',
        maxScore: 1000,
        passScore: 700,
        examName: 'Azure Fundamentals AZ-900',
        soonEta: '~6 weeks ETA'
      },
      {
        id: 'ccna',
        name: 'Cisco CCNA',
        code: '200-301',
        glyphClass: 'ccna',
        glyph: 'CC',
        status: 'soon',
        examFormat: 'percent',
        maxScore: 1000,
        passScore: 825,
        examName: 'Cisco CCNA 200-301',
        soonEta: '~10 weeks ETA · 85% N+ overlap'
      },
      {
        id: 'aws-saa',
        name: 'AWS Solutions Architect',
        code: 'SAA-C03',
        glyphClass: 'aws',
        glyph: 'AW',
        status: 'soon',
        examFormat: 'scaled',
        maxScore: 1000,
        passScore: 720,
        examName: 'AWS SAA-C03',
        soonEta: '~12 weeks ETA'
      },
      {
        id: 'az104',
        name: 'Azure Administrator',
        code: 'AZ-104',
        glyphClass: 'az104',
        glyph: 'AZ',
        status: 'soon',
        examFormat: 'percent',
        maxScore: 1000,
        passScore: 700,
        examName: 'Azure Administrator AZ-104',
        soonEta: '~14 weeks ETA · 90% AZ-900 overlap'
      }
    ];
  }

  // ── Auth flow ──────────────────────────────────────────────────────────
  function showLoading() {
    if (elLoading) elLoading.removeAttribute('hidden');
    if (elAnonGate) elAnonGate.setAttribute('hidden', '');
    if (elContent) elContent.setAttribute('hidden', '');
  }

  function showAnonGate() {
    if (elLoading) elLoading.setAttribute('hidden', '');
    if (elAnonGate) elAnonGate.removeAttribute('hidden');
    if (elContent) elContent.setAttribute('hidden', '');
  }

  function showContent() {
    if (elLoading) elLoading.setAttribute('hidden', '');
    if (elAnonGate) elAnonGate.setAttribute('hidden', '');
    if (elContent) elContent.removeAttribute('hidden');
  }

  function fetchProfile(userId) {
    return supabase
      .from('profiles')
      .select('role, display_name, metadata, created_at')
      .eq('id', userId)
      .single()
      .then(function (res) { return res && res.data ? res.data : null; })
      .catch(function () { return null; });
  }

  // ── Render Panel 1 (pass-readiness side-by-side, status-grouped) ───────
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderGlyph(cert) {
    return '<div class="cca-pr-glyph cca-pr-glyph-' + cert.glyphClass + '">' + escapeHtml(cert.glyph) + '</div>';
  }

  function renderGroupHeader(label, count, kind) {
    var icon = kind === 'passed' ? '✓' : kind === 'active' ? '📚' : '⏳';
    return ''
      + '<div class="cca-pr-group-h cca-pr-group-h-' + kind + '">'
      +   '<span class="cca-pr-group-h-icon">' + icon + '</span>'
      +   '<span>' + escapeHtml(label) + ' (' + count + ')</span>'
      +   '<span class="cca-pr-group-h-rule"></span>'
      + '</div>';
  }

  function renderPassedRow(cert, result) {
    var pctOfMax = Math.min(100, Math.round((result.score / result.max_score) * 100));
    var dateStr = result.date ? humanDate(result.date) : '';
    return ''
      + '<div class="cca-pr-row cca-pr-row-passed" data-cert="' + cert.id + '">'
      +   renderGlyph(cert)
      +   '<div class="cca-pr-info">'
      +     '<div class="cca-pr-name">'
      +       escapeHtml(cert.name)
      +       ' <span class="cca-pr-status-pill cca-pr-status-passed">✓ Passed</span>'
      +     '</div>'
      +     '<div class="cca-pr-coach">Maintenance practice — keep your knowledge sharp for related certs</div>'
      +   '</div>'
      +   '<div class="cca-pr-readiness">'
      +     '<div class="cca-pr-readiness-label">'
      +       '<span>Score</span>'
      +       '<span class="cca-pr-readiness-score cca-pr-score-green">' + escapeHtml(String(result.score)) + '/' + escapeHtml(String(result.max_score)) + '</span>'
      +     '</div>'
      +     '<div class="cca-pr-readiness-bar">'
      +       '<div class="cca-pr-readiness-fill cca-pr-fill-green" style="width: ' + pctOfMax + '%;"></div>'
      +       '<div class="cca-pr-readiness-cutoff" style="left: ' + Math.round((cert.passScore / cert.maxScore) * 100) + '%;"></div>'
      +     '</div>'
      +     '<div class="cca-pr-readiness-meta">'
      +       '<span>' + (dateStr ? 'Passed ' + escapeHtml(dateStr) : 'Passed') + '</span>'
      +       '<span>Cutoff ' + escapeHtml(String(cert.passScore)) + '</span>'
      +     '</div>'
      +   '</div>'
      +   '<div class="cca-pr-action">'
      +     '<a class="cca-pr-action-btn cca-pr-action-ghost" href="' + escapeHtml(cert.cta.href) + '">Open →</a>'
      +   '</div>'
      + '</div>';
  }

  function renderActiveRow(cert) {
    // Phase A: no readiness number yet — placeholder until snapshot pipeline
    // ships in Phase A.5. Show cert + status pill + coach line + Continue CTA.
    var ctaHref = (cert.cta && cert.cta.href) || '#';
    var ctaLabel = (cert.cta && cert.cta.label) || 'Continue →';
    var ctaDisabled = cert.cta && cert.cta.disabled;
    return ''
      + '<div class="cca-pr-row cca-pr-row-active" data-cert="' + cert.id + '">'
      +   renderGlyph(cert)
      +   '<div class="cca-pr-info">'
      +     '<div class="cca-pr-name">'
      +       escapeHtml(cert.name)
      +       ' <span class="cca-pr-status-pill cca-pr-status-active">📚 Active</span>'
      +     '</div>'
      +     '<div class="cca-pr-coach">' + escapeHtml(cert.coachActive || 'In progress') + '</div>'
      +   '</div>'
      +   '<div class="cca-pr-readiness cca-pr-readiness-pending">'
      +     '<div class="cca-pr-readiness-label">'
      +       '<span>Readiness</span>'
      +       '<span class="cca-pr-readiness-score cca-pr-score-pending">—</span>'
      +     '</div>'
      +     '<div class="cca-pr-readiness-bar">'
      +       '<div class="cca-pr-readiness-cutoff" style="left: 80%;"></div>'
      +     '</div>'
      +     '<div class="cca-pr-readiness-meta">'
      +       '<span>Live gauge ships next</span>'
      +       '<span>Cutoff ' + escapeHtml(String(cert.passScore)) + '</span>'
      +     '</div>'
      +   '</div>'
      +   '<div class="cca-pr-action">'
      +     (ctaDisabled
        ? '<button class="cca-pr-action-btn cca-pr-action-disabled" disabled title="' + escapeHtml((cert.cta && cert.cta.title) || '') + '">' + escapeHtml(ctaLabel) + '</button>'
        : '<a class="cca-pr-action-btn" href="' + escapeHtml(ctaHref) + '">' + escapeHtml(ctaLabel) + '</a>')
      +   '</div>'
      + '</div>';
  }

  function renderSoonRow(cert) {
    return ''
      + '<div class="cca-pr-row cca-pr-row-soon" data-cert="' + cert.id + '">'
      +   renderGlyph(cert)
      +   '<div class="cca-pr-info">'
      +     '<div class="cca-pr-name">'
      +       escapeHtml(cert.name)
      +       ' <span class="cca-pr-status-pill cca-pr-status-soon">Coming soon</span>'
      +     '</div>'
      +     '<div class="cca-pr-coach">' + escapeHtml(cert.soonEta || 'In the queue') + '</div>'
      +   '</div>'
      +   '<div class="cca-pr-readiness cca-pr-readiness-empty">'
      +     '<div class="cca-pr-readiness-label">'
      +       '<span>Readiness</span>'
      +       '<span class="cca-pr-readiness-score cca-pr-score-pending">—</span>'
      +     '</div>'
      +     '<div class="cca-pr-readiness-bar"></div>'
      +     '<div class="cca-pr-readiness-meta"><span>Not started</span></div>'
      +   '</div>'
      +   '<div class="cca-pr-action">'
      +     '<button class="cca-pr-action-btn cca-pr-action-disabled" disabled>Notify me</button>'
      +   '</div>'
      + '</div>';
  }

  function renderLockedRow(cert) {
    // Sec+ for non-admin users — locked behind upgrade
    return ''
      + '<div class="cca-pr-row cca-pr-row-soon" data-cert="' + cert.id + '">'
      +   renderGlyph(cert)
      +   '<div class="cca-pr-info">'
      +     '<div class="cca-pr-name">'
      +       escapeHtml(cert.name)
      +       ' <span class="cca-pr-status-pill cca-pr-status-soon">🔒 Pro only</span>'
      +     '</div>'
      +     '<div class="cca-pr-coach">Upgrade to Pro to unlock — 65% transfers from Network+</div>'
      +   '</div>'
      +   '<div class="cca-pr-readiness cca-pr-readiness-empty">'
      +     '<div class="cca-pr-readiness-label">'
      +       '<span>Readiness</span>'
      +       '<span class="cca-pr-readiness-score cca-pr-score-pending">—</span>'
      +     '</div>'
      +     '<div class="cca-pr-readiness-bar"></div>'
      +     '<div class="cca-pr-readiness-meta"><span>Locked</span></div>'
      +   '</div>'
      +   '<div class="cca-pr-action">'
      +     '<button class="cca-pr-action-btn cca-pr-action-disabled" disabled title="Stripe billing ships in Phase G">Upgrade →</button>'
      +   '</div>'
      + '</div>';
  }

  function humanDate(iso) {
    // ISO date → 'May 5' / 'May 5, 2026'-style. Lightweight, no library.
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      var now = new Date();
      var diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diffDays === 0) return 'today';
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return diffDays + ' days ago';
      var sameYear = d.getFullYear() === now.getFullYear();
      var opts = sameYear
        ? { month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric' };
      return d.toLocaleDateString('en-US', opts);
    } catch (e) {
      return iso;
    }
  }

  function renderPanel1(profile) {
    if (!elPrList) return;
    var role = (profile && profile.role) || 'user';
    var results = (profile && profile.metadata && profile.metadata.cert_results) || {};
    var catalog = getCertCatalog(role);

    // Bucket certs by their effective status
    var passedCerts = [];
    var activeCerts = [];
    var soonCerts = [];
    var lockedCerts = [];

    catalog.forEach(function (cert) {
      var result = results[cert.id];
      if (result && result.status === 'passed') {
        passedCerts.push({ cert: cert, result: result });
      } else if (cert.status === 'active') {
        activeCerts.push(cert);
      } else if (cert.status === 'locked') {
        lockedCerts.push(cert);
      } else {
        soonCerts.push(cert);
      }
    });

    var html = '';

    // PASSED group — first so it never gets visually buried
    if (passedCerts.length) {
      html += renderGroupHeader('Passed', passedCerts.length, 'passed');
      passedCerts.forEach(function (item) {
        html += renderPassedRow(item.cert, item.result);
      });
    }

    // ACTIVE group
    if (activeCerts.length) {
      html += renderGroupHeader('Currently studying', activeCerts.length, 'active');
      activeCerts.forEach(function (cert) {
        html += renderActiveRow(cert);
      });
    }

    // LOCKED group (Sec+ for non-admin) — folded in with "coming soon" visually
    // since they share the "you can't study this right now" semantic
    var lockedAndSoon = lockedCerts.length + soonCerts.length;
    if (lockedAndSoon) {
      var label = lockedCerts.length && !soonCerts.length
        ? 'Pro-only certs'
        : (lockedCerts.length ? 'Coming soon & Pro-only' : 'Coming soon');
      html += renderGroupHeader(label, lockedAndSoon, 'soon');
      lockedCerts.forEach(function (cert) {
        html += renderLockedRow(cert);
      });
      soonCerts.forEach(function (cert) {
        html += renderSoonRow(cert);
      });
    }

    elPrList.innerHTML = html;

    // Show Panel 1 if there's any cert to render; otherwise show empty state
    if (catalog.length === 0) {
      if (elEmptyState) elEmptyState.removeAttribute('hidden');
      if (elPanelPr) elPanelPr.setAttribute('hidden', '');
    } else {
      if (elEmptyState) elEmptyState.setAttribute('hidden', '');
      if (elPanelPr) elPanelPr.removeAttribute('hidden');
    }
  }

  // ── Boot ────────────────────────────────────────────────────────────────
  function boot() {
    showLoading();
    supabase.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (!session || !session.user) {
        showAnonGate();
        return;
      }
      // Render the panel synchronously with no profile while we fetch — the
      // catalog itself is enough to render the active/coming-soon rows.
      // Profile fetch only changes the passed-cert section.
      var emptyProfile = { role: 'user', metadata: {} };
      renderPanel1(emptyProfile);
      showContent();

      // Async: fetch real profile, re-render once we have cert_results
      fetchProfile(session.user.id).then(function (profile) {
        if (profile) {
          renderPanel1(profile);
        }
      });
    }).catch(function () {
      showAnonGate();
    });

    // React to auth state changes (sign out / cross-tab sign in)
    try {
      supabase.auth.onAuthStateChange(function (event, session) {
        if (event === 'SIGNED_OUT' || !session) {
          showAnonGate();
        } else if (event === 'SIGNED_IN') {
          boot();  // re-run the flow
        }
      });
    } catch (e) { /* older client may not support — non-fatal */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
