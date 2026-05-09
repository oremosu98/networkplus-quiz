// ══════════════════════════════════════════════════════════════════════════
// CertAnvil — Cross-cert analytics page logic (/analytics)
// ══════════════════════════════════════════════════════════════════════════
// Loaded after lib/supabase-umd.min.js + lib/supabase.js + auth.js +
// lib/cross-cert-overlap.js (provides window.CROSS_CERT_OVERLAP).
//
// Phase A (shipped): skeleton page + Panel 1 (pass-readiness side-by-side,
// status-grouped). Reads profile.metadata.cert_results for passed certs.
//
// Phase A.5 (shipped v4.99.0): live readiness gauges for active certs from
// profile.metadata.nplus_readiness_snapshots (cert app writes after each
// quiz/exam; Phase C′ debounced cloud-flush carries it to Supabase).
//
// Phase B (this ship): Panel 2 skill overlap. Reads window.CROSS_CERT_OVERLAP
// (hand-authored data table). Filters cert pairs to ones where at least one
// cert is passed/active for the user. Click-to-expand for topic-level detail.
//
// Phases NOT in this ship:
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
  // Phase B
  var elPanelSo = document.getElementById('cca-panel-so');
  var elSoList = document.getElementById('cca-so-list');

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

  function renderActiveRow(cert, snapshot) {
    // Phase A.5: live readiness gauge from snapshot if present, otherwise
    // graceful "Open cert app to compute" placeholder.
    //
    // Snapshot shape (written by cert-app's _writeReadinessSnapshot):
    //   { score: 645, computed_at: '2026-05-09T14:32:00Z' }
    // Score range: 420-870 (CompTIA scaled). Cutoff is per-cert (cert.passScore
    // expressed in score-band terms ≈ 720 for N+, 750 for S+ etc — but the
    // readiness bar is normalised to the 420-870 readiness range, NOT the
    // cert's max-score range).
    var ctaHref = (cert.cta && cert.cta.href) || '#';
    var ctaLabel = (cert.cta && cert.cta.label) || 'Continue →';
    var ctaDisabled = cert.cta && cert.cta.disabled;

    var hasSnapshot = !!(snapshot && typeof snapshot.score === 'number');
    var readinessHtml;
    if (hasSnapshot) {
      // Convert 420-870 readiness range to 0-100% bar fill
      var pct = Math.max(0, Math.min(100, Math.round(((snapshot.score - 420) / (870 - 420)) * 100)));
      // Cutoff line: where cert.passScore (in 100-900 band) maps onto the
      // 420-870 readiness band — i.e., the readiness threshold for "you'd
      // pass the real exam." Use cert.passScore directly since CompTIA
      // readiness predictions land in the same band as actual scaled scores.
      var cutoffPct = Math.max(0, Math.min(100, Math.round(((cert.passScore - 420) / (870 - 420)) * 100)));
      var gapToPass = cert.passScore - snapshot.score;
      var fillClass = snapshot.score >= cert.passScore ? 'cca-pr-fill-green' : '';
      var scoreClass = snapshot.score >= cert.passScore ? 'cca-pr-score-green' : '';
      var statusLine = gapToPass <= 0
        ? 'Above pass cutoff · keep practising'
        : 'Gap: ' + gapToPass + ' to pass';
      readinessHtml = ''
        + '<div class="cca-pr-readiness">'
        +   '<div class="cca-pr-readiness-label">'
        +     '<span>Readiness</span>'
        +     '<span class="cca-pr-readiness-score ' + scoreClass + '">' + escapeHtml(String(snapshot.score)) + '</span>'
        +   '</div>'
        +   '<div class="cca-pr-readiness-bar">'
        +     '<div class="cca-pr-readiness-fill ' + fillClass + '" style="width: ' + pct + '%;"></div>'
        +     '<div class="cca-pr-readiness-cutoff" style="left: ' + cutoffPct + '%;"></div>'
        +   '</div>'
        +   '<div class="cca-pr-readiness-meta">'
        +     '<span>' + escapeHtml(humanFreshness(snapshot.computed_at)) + '</span>'
        +     '<span>' + escapeHtml(statusLine) + '</span>'
        +   '</div>'
        + '</div>';
    } else {
      readinessHtml = ''
        + '<div class="cca-pr-readiness cca-pr-readiness-pending">'
        +   '<div class="cca-pr-readiness-label">'
        +     '<span>Readiness</span>'
        +     '<span class="cca-pr-readiness-score cca-pr-score-pending">—</span>'
        +   '</div>'
        +   '<div class="cca-pr-readiness-bar">'
        +     '<div class="cca-pr-readiness-cutoff" style="left: 70%;"></div>'
        +   '</div>'
        +   '<div class="cca-pr-readiness-meta">'
        +     '<span>Open cert app to compute</span>'
        +     '<span>Cutoff ' + escapeHtml(String(cert.passScore)) + '</span>'
        +   '</div>'
        + '</div>';
    }

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
      +   readinessHtml
      +   '<div class="cca-pr-action">'
      +     (ctaDisabled
        ? '<button class="cca-pr-action-btn cca-pr-action-disabled" disabled title="' + escapeHtml((cert.cta && cert.cta.title) || '') + '">' + escapeHtml(ctaLabel) + '</button>'
        : '<a class="cca-pr-action-btn" href="' + escapeHtml(ctaHref) + '">' + escapeHtml(ctaLabel) + '</a>')
      +   '</div>'
      + '</div>';
  }

  // Snapshot freshness humaniser — displayed in the meta line under the bar.
  // Stale snapshots (>30 days) get a subtle "stale" hint; fresh ones display
  // a friendly relative time.
  function humanFreshness(iso) {
    if (!iso) return 'Just computed';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return 'Just computed';
      var now = Date.now();
      var diffMs = now - d.getTime();
      var diffMin = Math.floor(diffMs / 60000);
      var diffHr = Math.floor(diffMs / 3600000);
      var diffDay = Math.floor(diffMs / 86400000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return diffMin + ' min ago';
      if (diffHr < 24) return diffHr + ' hr ago';
      if (diffDay < 7) return diffDay + ' day' + (diffDay === 1 ? '' : 's') + ' ago';
      if (diffDay < 30) return Math.floor(diffDay / 7) + ' wk ago';
      return diffDay + ' days ago · stale';
    } catch (_) {
      return 'Just computed';
    }
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
    // v4.99.0 Phase A.5: cert app writes per-cert readiness snapshots after
    // every quiz/exam — read them here for the active-cert gauges.
    var snapshots = (profile && profile.metadata && profile.metadata.nplus_readiness_snapshots) || {};
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
        activeCerts.push({ cert: cert, snapshot: snapshots[cert.id] || null });
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
      activeCerts.forEach(function (item) {
        html += renderActiveRow(item.cert, item.snapshot);
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

  // ── Panel 2: Skill overlap (Phase B) ────────────────────────────────────
  // Reads window.CROSS_CERT_OVERLAP authored data + user's cert state.
  // Filters pairs to ones where at least one cert is passed/active.
  // Sorts by relevance: passed-source pairs first (knowledge already locked
  // in), then high-overlap pairs. Top pair expanded by default.

  function getCertStateMap(catalog, results) {
    var map = {};
    catalog.forEach(function (cert) {
      var r = results[cert.id];
      if (r && r.status === 'passed') map[cert.id] = 'passed';
      else if (cert.status === 'active') map[cert.id] = 'active';
      else if (cert.status === 'locked') map[cert.id] = 'locked';
      else map[cert.id] = 'soon';
    });
    return map;
  }

  function getCertById(catalog, id) {
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].id === id) return catalog[i];
    }
    return null;
  }

  function renderSoPair(pair, fromCert, toCert, fromState, isExpanded) {
    // Compact summary row + optional expanded detail panel.
    // Source-passed pairs get a special headline framing ("you know X — here's
    // what carries"); source-active pairs frame as forward-looking ("once you
    // finish X, this is what unlocks").
    var srcKnown = fromState === 'passed';

    var summaryHtml = ''
      + '<button type="button" class="cca-so-summary" data-pair="' + escapeHtml(pair.from + '__' + pair.to) + '" aria-expanded="' + (isExpanded ? 'true' : 'false') + '">'
      +   '<div class="cca-so-pair">'
      +     '<div class="cca-so-pair-glyph cca-pr-glyph-' + fromCert.glyphClass + '">' + escapeHtml(fromCert.glyph) + '</div>'
      +     '<span class="cca-so-pair-arrow" aria-hidden="true">→</span>'
      +     '<div class="cca-so-pair-glyph cca-pr-glyph-' + toCert.glyphClass + '">' + escapeHtml(toCert.glyph) + '</div>'
      +   '</div>'
      +   '<div class="cca-so-bar-wrap">'
      +     '<div class="cca-so-bar-track"><div class="cca-so-bar-fill" style="width: ' + pair.pct + '%;"></div></div>'
      +     '<span class="cca-so-bar-pct">' + pair.pct + '%</span>'
      +   '</div>'
      +   '<div class="cca-so-meta">'
      +     '<div class="cca-so-meta-headline">' + escapeHtml(pair.headline) + '</div>'
      +     '<div class="cca-so-meta-sub">' + pair.sharedCount + ' of ' + pair.totalTargetCount + ' topics shared</div>'
      +   '</div>'
      +   '<span class="cca-so-chevron" aria-hidden="true">▾</span>'
      + '</button>';

    // Expanded detail
    var sharedColH, sharedColIcon, sharedColIconClass;
    if (srcKnown) {
      sharedColH = 'Already mastered (skip the re-study)';
      sharedColIcon = '✓';
      sharedColIconClass = 'mastered';
    } else {
      sharedColH = 'Shared with ' + escapeHtml(fromCert.name) + ' — once mastered, transfers';
      sharedColIcon = '⊙';
      sharedColIconClass = 'shared';
    }

    var sharedListHtml = pair.sharedTopics.map(function (t) {
      return '<div class="cca-so-topic"><span class="cca-so-topic-pill ' + sharedColIconClass + '">' + sharedColIcon + '</span>' + escapeHtml(t) + '</div>';
    }).join('');

    var refresherHtml = '';
    if (pair.refresherTopics && pair.refresherTopics.length) {
      refresherHtml = pair.refresherTopics.map(function (t) {
        return '<div class="cca-so-topic"><span class="cca-so-topic-pill refresher">⏵</span>' + escapeHtml(t) + '</div>';
      }).join('');
    }

    var newListHtml = pair.newTopics.map(function (t) {
      return '<div class="cca-so-topic"><span class="cca-so-topic-pill new">+</span>' + escapeHtml(t) + '</div>';
    }).join('');

    var rightColH = srcKnown
      ? toCert.name + '-specific (your real focus)'
      : 'New territory in ' + toCert.name;

    var detailHtml = ''
      + '<div class="cca-so-detail">'
      +   '<div class="cca-so-detail-grid">'
      +     '<div class="cca-so-detail-col">'
      +       '<div class="cca-so-detail-col-h">'
      +         '<span class="cca-so-topic-pill ' + sharedColIconClass + '">' + sharedColIcon + '</span>'
      +         escapeHtml(sharedColH)
      +       '</div>'
      +       '<div class="cca-so-detail-col-list">' + sharedListHtml + '</div>'
      +       (refresherHtml ? '<div class="cca-so-detail-col-h" style="margin-top:14px;"><span class="cca-so-topic-pill refresher">⏵</span>Refresher needed</div><div class="cca-so-detail-col-list">' + refresherHtml + '</div>' : '')
      +     '</div>'
      +     '<div class="cca-so-detail-col">'
      +       '<div class="cca-so-detail-col-h">'
      +         '<span class="cca-so-topic-pill new">+</span>'
      +         escapeHtml(rightColH)
      +       '</div>'
      +       '<div class="cca-so-detail-col-list">' + newListHtml + '</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="cca-so-callout">'
      +     escapeHtml(pair.callout)
      +     ' <span class="cca-so-saving-pill">≈ ' + pair.daysSaved + ' day' + (pair.daysSaved === 1 ? '' : 's') + ' of prep saved</span>'
      +   '</div>'
      + '</div>';

    return ''
      + '<div class="cca-so-row' + (isExpanded ? ' is-open' : '') + '" data-pair="' + escapeHtml(pair.from + '__' + pair.to) + '">'
      +   summaryHtml
      +   detailHtml
      + '</div>';
  }

  function renderPanel2(profile) {
    if (!elSoList) return;

    var role = (profile && profile.role) || 'user';
    var results = (profile && profile.metadata && profile.metadata.cert_results) || {};
    var catalog = getCertCatalog(role);
    var stateMap = getCertStateMap(catalog, results);

    var overlap = (typeof window !== 'undefined' && window.CROSS_CERT_OVERLAP) || [];
    if (!overlap.length) {
      // No data table loaded — skip rendering the panel
      if (elPanelSo) elPanelSo.setAttribute('hidden', '');
      return;
    }

    // Filter: pairs where AT LEAST ONE side is passed/active. We hide pairs
    // where both sides are "soon" since they're not actionable yet.
    var relevant = overlap.filter(function (p) {
      var fromState = stateMap[p.from];
      var toState = stateMap[p.to];
      var fromActive = fromState === 'passed' || fromState === 'active';
      var toActive = toState === 'passed' || toState === 'active';
      return fromActive || toActive;
    });

    if (!relevant.length) {
      if (elPanelSo) elPanelSo.setAttribute('hidden', '');
      return;
    }

    // Sort: source-passed pairs first (your knowledge is locked in, what
    // carries forward), then by overlap percentage descending.
    relevant.sort(function (a, b) {
      var aSrcPassed = stateMap[a.from] === 'passed';
      var bSrcPassed = stateMap[b.from] === 'passed';
      if (aSrcPassed && !bSrcPassed) return -1;
      if (!aSrcPassed && bSrcPassed) return 1;
      var aSrcActive = stateMap[a.from] === 'active';
      var bSrcActive = stateMap[b.from] === 'active';
      if (aSrcActive && !bSrcActive) return -1;
      if (!aSrcActive && bSrcActive) return 1;
      return b.pct - a.pct;
    });

    // Cap at 8 pairs to avoid wall-of-pairs UX
    relevant = relevant.slice(0, 8);

    var html = relevant.map(function (pair, idx) {
      var fromCert = getCertById(catalog, pair.from);
      var toCert = getCertById(catalog, pair.to);
      if (!fromCert || !toCert) return '';
      var fromState = stateMap[pair.from];
      // Top pair (most relevant) expanded by default; rest collapsed.
      var isExpanded = idx === 0;
      return renderSoPair(pair, fromCert, toCert, fromState, isExpanded);
    }).join('');

    elSoList.innerHTML = html;
    if (elPanelSo) elPanelSo.removeAttribute('hidden');

    // Wire click handlers on the summary buttons to toggle the row
    var summaries = elSoList.querySelectorAll('.cca-so-summary');
    Array.prototype.forEach.call(summaries, function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.cca-so-row');
        if (!row) return;
        var nowOpen = row.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
      });
    });
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
      renderPanel2(emptyProfile);
      showContent();

      // Async: fetch real profile, re-render once we have cert_results
      fetchProfile(session.user.id).then(function (profile) {
        if (profile) {
          renderPanel1(profile);
          renderPanel2(profile);
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
