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
  // Phase C
  var elPanelWn = document.getElementById('cca-panel-wn');
  var elWnBody = document.getElementById('cca-wn-body');

  // ── Per-cert exam-domain weight tables (Phase C ranker uses these to
  // reason about "X% of exam weight" in hero card). Source: published
  // CompTIA / Microsoft / Cisco / AWS exam objectives.
  var DOMAIN_WEIGHTS_BY_CERT = {
    netplus: {
      'Networking Concepts': 23,
      'Network Implementation': 20,
      'Network Operations': 19,
      'Network Security': 14,
      'Network Troubleshooting': 24
    },
    secplus: {
      'General Security Concepts': 12,
      'Threats, Vulnerabilities, and Mitigations': 22,
      'Security Architecture': 18,
      'Security Operations': 28,
      'Security Program Management and Oversight': 20
    },
    az900: {
      'Cloud Concepts': 27.5,
      'Azure Architecture & Services': 37.5,
      'Azure Management & Governance': 32.5
    },
    ai900: {
      'AI Workloads & Considerations': 17.5,
      'Machine Learning Fundamentals': 22.5,
      'Computer Vision Workloads': 17.5,
      'NLP Workloads': 17.5,
      'Generative AI Workloads': 25
    },
    sc900: {
      'Security, Compliance & Identity Concepts': 12.5,
      'Microsoft Entra': 27.5,
      'Microsoft Security Solutions': 37.5,
      'Microsoft Compliance Solutions': 22.5
    },
    'aplus-core1': {
      'Mobile Devices': 13,
      'Networking': 23,
      'Hardware': 25,
      'Virtualization & Cloud': 11,
      'Hardware & Network Troubleshooting': 28
    },
    'aplus-core2': {
      'Operating Systems': 28,
      'Security': 28,
      'Software Troubleshooting': 23,
      'Operational Procedures': 21
    },
    clfc02: {
      'Cloud Concepts': 24,
      'Security & Compliance': 30,
      'Cloud Technology & Services': 34,
      'Billing, Pricing & Support': 12
    }
  };

  // ── Cert catalog ────────────────────────────────────────────────────────
  // Local source of truth for the analytics page. Eight exams (7 certs / 3 vendors).
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
        coachActive: 'Foundation cert. Leads to CCNA, AWS networking, and cloud tracks.'
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
        coachActive: 'Builds on N+. 65% knowledge transfer from Network+.'
      },
      {
        id: 'aplus-core1',
        name: 'CompTIA A+ Core 1',
        code: '220-1201',
        glyphClass: 'aplus-core1',
        glyph: 'A+',
        status: 'active',
        examFormat: 'scaled',
        maxScore: 900,
        passScore: 675,
        examName: 'CompTIA A+ Core 1 220-1201',
        cta: { label: 'Open →', href: 'https://aplus.certanvil.com/?exam=core1' },
        coachActive: 'First half of CompTIA A+. Hardware, networking, and mobile devices.'
      },
      {
        id: 'aplus-core2',
        name: 'CompTIA A+ Core 2',
        code: '220-1202',
        glyphClass: 'aplus-core2',
        glyph: 'A+',
        status: 'active',
        examFormat: 'scaled',
        maxScore: 900,
        passScore: 700,
        examName: 'CompTIA A+ Core 2 220-1202',
        cta: { label: 'Open →', href: 'https://aplus.certanvil.com/?exam=core2' },
        coachActive: 'Second half of CompTIA A+. OS, security, and operational procedures.'
      },
      {
        id: 'az900',
        name: 'Microsoft Azure Fundamentals',
        code: 'AZ-900',
        glyphClass: 'az900',
        glyph: 'AZ',
        status: 'active',
        examFormat: 'percent',
        maxScore: 1000,
        passScore: 700,
        examName: 'Microsoft Azure Fundamentals AZ-900',
        cta: { label: 'Open →', href: 'https://azure.certanvil.com/?cert=az900' },
        coachActive: 'Cloud fundamentals. Pairs with Sec+ on shared responsibility and IAM.'
      },
      {
        id: 'ai900',
        name: 'Microsoft Azure AI Fundamentals',
        code: 'AI-900',
        glyphClass: 'ai900',
        glyph: 'AI',
        status: 'active',
        examFormat: 'percent',
        maxScore: 1000,
        passScore: 700,
        examName: 'Microsoft Azure AI Fundamentals AI-900',
        cta: { label: 'Open →', href: 'https://ai.certanvil.com/?cert=ai900' },
        coachActive: 'AI and ML fundamentals on Azure. Builds on AZ-900 cloud concepts.'
      },
      {
        id: 'sc900',
        name: 'Microsoft SC-900',
        code: 'SC-900',
        glyphClass: 'sc900',
        glyph: 'SC',
        status: 'active',
        examFormat: 'percent',
        maxScore: 1000,
        passScore: 700,
        examName: 'Microsoft SC-900 SC-900',
        cta: { label: 'Open →', href: 'https://sc900.certanvil.com/?cert=sc900' },
        coachActive: 'Security, compliance, and identity fundamentals. 35% transfer from Sec+.'
      },
      {
        id: 'clfc02',
        name: 'AWS Cloud Practitioner',
        code: 'CLF-C02',
        glyphClass: 'clfc02',
        glyph: 'AWS',
        status: 'active',
        examFormat: 'scaled',
        maxScore: 1000,
        passScore: 700,
        examName: 'AWS Cloud Practitioner CLF-C02',
        cta: { label: 'Open →', href: 'https://clfc02.certanvil.com/?cert=clfc02' },
        coachActive: 'AWS cloud fundamentals. Cloud-concepts overlap with AZ-900.'
      }
    ];
  }

  // E2E hook (v7.8.2): expose the cert catalog so Playwright can assert the
  // canonical 8-exam set renders + no phantom certs leak (cd8c784 contract).
  // Read-only data getter — same pattern as the cert-app's window.renderHistoryPanel.
  window.ccaGetCertCatalog = getCertCatalog;

  // ── Auth flow ──────────────────────────────────────────────────────────
  var elProGate = document.getElementById('cca-pro-gate');

  function showLoading() {
    if (elLoading) elLoading.removeAttribute('hidden');
    if (elAnonGate) elAnonGate.setAttribute('hidden', '');
    if (elProGate) elProGate.setAttribute('hidden', '');
    if (elContent) elContent.setAttribute('hidden', '');
  }

  function showAnonGate() {
    if (elLoading) elLoading.setAttribute('hidden', '');
    if (elAnonGate) elAnonGate.removeAttribute('hidden');
    if (elProGate) elProGate.setAttribute('hidden', '');
    if (elContent) elContent.setAttribute('hidden', '');
  }

  // GAP-4 (v7.43.0): cross-cert analytics is a Pro feature.
  function showProGate() {
    if (elLoading) elLoading.setAttribute('hidden', '');
    if (elAnonGate) elAnonGate.setAttribute('hidden', '');
    if (elProGate) elProGate.removeAttribute('hidden');
    if (elContent) elContent.setAttribute('hidden', '');
  }

  function showContent() {
    if (elLoading) elLoading.setAttribute('hidden', '');
    if (elAnonGate) elAnonGate.setAttribute('hidden', '');
    if (elProGate) elProGate.setAttribute('hidden', '');
    if (elContent) elContent.removeAttribute('hidden');
  }

  // Tier check — same RPC the cert app's quota chip uses (is_pro() in
  // Postgres folds admin into 'pro'). Returns 'free' | 'pro' | null.
  // null = unknown (RPC error) — callers fail OPEN so a transient hiccup
  // never locks a paying user out of their dashboard.
  function fetchTier(userId) {
    return supabase.rpc('get_daily_quota_usage', { uid: userId })
      .then(function (res) {
        var row = res && res.data && res.data[0];
        return (row && row.tier) ? row.tier : null;
      })
      .catch(function () { return null; });
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

  function certGlyphHTML(glyph, glyphClass){
    var g = String(glyph || '');
    if (!g) return '';
    var sup = glyphClass === 'aplus-core1' ? '1' : glyphClass === 'aplus-core2' ? '2' : '';
    var esc = function(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
    var head = esc(g.slice(0, -1)), last = esc(g.slice(-1));
    return '<span class="cg">' + head + '<span class="cg-ac">' + last + '</span>' + (sup ? '<span class="cg-sup">' + sup + '</span>' : '') + '</span>';
  }

  function renderGlyph(cert) {
    return '<div class="cca-pr-glyph cca-pr-glyph-' + cert.glyphClass + '">' + certGlyphHTML(cert.glyph, cert.glyphClass) + '</div>';
  }

  function renderGroupHeader(label, count, kind) {
    var icon = kind === 'passed' ? '✓' : kind === 'active' ? '' : '';
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
      +     '<div class="cca-pr-coach">Maintenance practice. Keep your knowledge sharp for related certs.</div>'
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
      +       ' <span class="cca-pr-status-pill cca-pr-status-active">Active</span>'
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
      +       ' <span class="cca-pr-status-pill cca-pr-status-soon">Pro only</span>'
      +     '</div>'
      +     '<div class="cca-pr-coach">Upgrade to Pro to unlock. 65% transfers from Network+.</div>'
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
      +     '<div class="cca-so-pair-glyph cca-pr-glyph-' + fromCert.glyphClass + '">' + certGlyphHTML(fromCert.glyph, fromCert.glyphClass) + '</div>'
      +     '<span class="cca-so-pair-arrow" aria-hidden="true">→</span>'
      +     '<div class="cca-so-pair-glyph cca-pr-glyph-' + toCert.glyphClass + '">' + certGlyphHTML(toCert.glyph, toCert.glyphClass) + '</div>'
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

  // ── Panel 3: What to study next (Phase C — deterministic ranker) ────────
  //
  // Reads the v4.99.1+ enriched readiness snapshots + cert results + skill
  // overlap to produce a ranked recommendation list. NOT LLM-generated —
  // pure deterministic math anchored to user data + published exam weights.
  //
  // Algorithm (urgency score per active cert):
  //   gap = max(0, passScore - readiness.score)             // points to close
  //   pacing = gap / max(daysToExam, 1)                     // pts/day pace
  //   urgency = pacing × (1 + 0.5*staleness_factor)         // stale snapshots punished
  //   leverage = boost if a passed cert has high overlap into this one
  //
  // Hero recommendation = top-urgency cert. Reasons combine: weak topic,
  // exam-weight, overlap context, runway math. Secondary list = next
  // 3 prioritized actions (other active certs, mock-exam suggestion,
  // passed-cert maintenance).

  function getOverlapBonusFor(targetCertId, passedCertIds, overlap) {
    if (!overlap || !passedCertIds || !passedCertIds.length) return null;
    // Find the highest-overlap pair where source is a passed cert + target matches
    var best = null;
    for (var i = 0; i < overlap.length; i++) {
      var p = overlap[i];
      if (p.to === targetCertId && passedCertIds.indexOf(p.from) !== -1) {
        if (!best || p.pct > best.pct) best = p;
      }
    }
    return best;
  }

  function computeUrgency(cert, snapshot, overlap, passedCertIds) {
    var gap = Math.max(0, cert.passScore - (snapshot ? snapshot.score : cert.passScore - 100));
    var daysToExam = (snapshot && typeof snapshot.days_to_exam === 'number') ? snapshot.days_to_exam : 365;
    daysToExam = Math.max(daysToExam, 1);
    var pacing = gap / daysToExam;
    // Staleness penalty — old snapshots underestimate urgency
    var staleDays = 0;
    if (snapshot && snapshot.computed_at) {
      try { staleDays = (Date.now() - new Date(snapshot.computed_at).getTime()) / 86400000; }
      catch (_) {}
    }
    var staleFactor = Math.min(1, staleDays / 14);  // capped at 14 days
    var urgency = pacing * (1 + 0.5 * staleFactor);
    // No-snapshot fallback — encourage user to take a quiz to seed signal
    if (!snapshot) urgency = 0.5;  // medium-low; prefer snapshot-backed certs
    return { urgency: urgency, gap: gap, daysToExam: daysToExam, staleDays: staleDays };
  }

  function buildHeroReasons(cert, snapshot, urgencyData, overlapBonus) {
    var reasons = [];

    // Reason 1: weakest domain (if known)
    if (snapshot && snapshot.weak_domain && snapshot.weak_topic) {
      var domWeights = DOMAIN_WEIGHTS_BY_CERT[cert.id] || {};
      var weight = domWeights[snapshot.weak_domain];
      var pctText = (snapshot.weak_pct != null) ? (snapshot.weak_pct + '% accuracy') : 'lowest accuracy';
      reasons.push({
        icon: '▸',
        text: '<strong>Weakest domain</strong> on ' + escapeHtml(cert.name) + ' — ' + escapeHtml(snapshot.weak_topic) + ' currently at ' + escapeHtml(pctText)
      });
      if (weight) {
        reasons.push({
          icon: '▸',
          text: '<strong>' + weight + '% of ' + escapeHtml(cert.examName || cert.name) + '</strong> exam weight goes to ' + escapeHtml(snapshot.weak_domain) + ' — biggest single chunk of unguarded score'
        });
      }
    } else if (snapshot && snapshot.weak_topic) {
      reasons.push({
        icon: '▸',
        text: '<strong>Weakest topic</strong> on ' + escapeHtml(cert.name) + ' — ' + escapeHtml(snapshot.weak_topic)
      });
    }

    // Reason: overlap context
    if (overlapBonus && overlapBonus.pct >= 50) {
      var srcName = overlapBonus.from === 'netplus' ? 'Network+' :
                    overlapBonus.from === 'secplus' ? 'Security+' :
                    overlapBonus.from === 'ccna' ? 'CCNA' :
                    overlapBonus.from === 'aws-saa' ? 'AWS SAA' :
                    overlapBonus.from === 'az900' ? 'Azure AZ-900' :
                    overlapBonus.from === 'az104' ? 'Azure AZ-104' : 'previous cert';
      reasons.push({
        icon: '▸',
        text: '<strong>' + escapeHtml(srcName) + ' overlap</strong> — ~' + overlapBonus.hoursSaved + ' hours of re-study skipped, focus on the new ' + (100 - overlapBonus.pct) + '%'
      });
    } else if (overlapBonus && overlapBonus.pct < 50) {
      reasons.push({
        icon: '▸',
        text: '<strong>Limited overlap</strong> with what you\'ve already learned — most of this is new territory'
      });
    }

    // Reason: runway math
    if (urgencyData.daysToExam < 365 && urgencyData.gap > 0) {
      var minPerDay = Math.max(15, Math.ceil((urgencyData.gap / urgencyData.daysToExam) * 5));
      reasons.push({
        icon: '▸',
        text: '<strong>' + urgencyData.daysToExam + ' days to exam</strong> · ~' + minPerDay + ' min/day closes the gap if started today'
      });
    } else if (urgencyData.gap === 0) {
      reasons.push({
        icon: '▸',
        text: '<strong>Above pass cutoff already</strong> — additional study locks in your margin'
      });
    } else if (urgencyData.daysToExam >= 365) {
      reasons.push({
        icon: '▸',
        text: '<strong>No exam booked yet</strong> — set a date in the cert app to get pace targets'
      });
    }

    // Staleness reason
    if (urgencyData.staleDays > 7) {
      reasons.push({
        icon: '▸',
        text: '<strong>' + Math.round(urgencyData.staleDays) + ' days since last quiz</strong> — readiness data is stale, freshen it with a 10-Q drill'
      });
    }

    return reasons.slice(0, 4);  // cap at 4 reasons
  }

  function buildHeroAction(cert, snapshot) {
    if (!snapshot || !snapshot.weak_topic) {
      return {
        label: 'Continue ' + cert.name + ' →',
        href: cert.cta && cert.cta.href ? cert.cta.href : '#',
        title: ''
      };
    }
    return {
      label: 'Drill ' + (snapshot.weak_topic.length > 26 ? snapshot.weak_topic.slice(0, 26) + '…' : snapshot.weak_topic) + ' →',
      href: cert.cta && cert.cta.href ? cert.cta.href : '#',
      title: 'Open ' + cert.name + ' and drill ' + snapshot.weak_topic
    };
  }

  function renderHero(cert, snapshot, urgencyData, overlapBonus) {
    var reasons = buildHeroReasons(cert, snapshot, urgencyData, overlapBonus);
    var action = buildHeroAction(cert, snapshot);

    // Hero title — single-cert vs multi-cert framing
    var title;
    if (snapshot && snapshot.weak_topic) {
      var minBlock = urgencyData.gap > 100 ? '90' : urgencyData.gap > 50 ? '60' : '45';
      title = 'Drill ' + escapeHtml(snapshot.weak_topic) + ' on ' + escapeHtml(cert.name) + ' for ~' + minBlock + ' min today';
    } else if (snapshot) {
      title = 'Block 60 min for ' + escapeHtml(cert.name) + ' — focus on the weakest topic';
    } else {
      title = 'Take a 20-Q quiz on ' + escapeHtml(cert.name) + ' to seed your readiness';
    }

    var reasonsHtml = reasons.map(function (r) {
      return '<div class="cca-wn-reason"><span class="cca-wn-reason-icon">' + r.icon + '</span><span>' + r.text + '</span></div>';
    }).join('');

    return ''
      + '<div class="cca-wn-hero">'
      +   '<div class="cca-wn-hero-eyebrow">Top recommendation</div>'
      +   '<div class="cca-wn-hero-title">' + title + '</div>'
      +   '<div class="cca-wn-hero-reasons">' + reasonsHtml + '</div>'
      +   '<a class="cca-wn-hero-cta" href="' + escapeHtml(action.href) + '"' + (action.title ? ' title="' + escapeHtml(action.title) + '"' : '') + '>' + escapeHtml(action.label) + '</a>'
      + '</div>';
  }

  function renderSecondaryList(rankedActiveCerts, passedCerts, snapshots) {
    // Skip the top cert (rendered as hero); show next 3-4 options
    var rest = rankedActiveCerts.slice(1, 4);
    var rows = [];
    var rank = 2;

    rest.forEach(function (entry) {
      var cert = entry.cert;
      var snap = snapshots[cert.id];
      var label = snap && snap.weak_topic ? 'Practice ' + snap.weak_topic : 'Continue ' + cert.name;
      var meta = snap
        ? 'Readiness ' + snap.score + ' · gap ' + Math.max(0, cert.passScore - snap.score) + ' to pass'
        : 'No readiness data yet · take a quiz to seed';
      rows.push({
        rank: rank++,
        textHtml: '<strong>' + escapeHtml(label) + '</strong> (' + escapeHtml(cert.name) + ')',
        metaText: meta,
        href: cert.cta && cert.cta.href ? cert.cta.href : '#'
      });
    });

    // Add a passed-cert maintenance option if we have one and slots remain
    if (rank <= 4 && passedCerts.length) {
      var pc = passedCerts[0];  // most recently passed (or just first)
      rows.push({
        rank: rank++,
        textHtml: '<strong>' + escapeHtml(pc.name) + ' refresher quiz</strong>',
        metaText: 'Maintain streak · 5 min · keeps your passed cert sharp',
        href: pc.cta && pc.cta.href ? pc.cta.href : '#'
      });
    }

    if (!rows.length) return '';

    var rowsHtml = rows.map(function (r) {
      return ''
        + '<a class="cca-wn-secondary-row" href="' + escapeHtml(r.href) + '">'
        +   '<div class="cca-wn-rank">' + r.rank + '</div>'
        +   '<div>'
        +     '<div class="cca-wn-text">' + r.textHtml + '</div>'
        +     '<div class="cca-wn-text-meta">' + escapeHtml(r.metaText) + '</div>'
        +   '</div>'
        +   '<span class="cca-wn-row-action">Start →</span>'
        + '</a>';
    }).join('');

    return ''
      + '<div class="cca-wn-secondary-h">Other high-impact options</div>'
      + '<div class="cca-wn-secondary-list">' + rowsHtml + '</div>';
  }

  function renderPanel3(profile) {
    if (!elWnBody) return;

    var role = (profile && profile.role) || 'user';
    var results = (profile && profile.metadata && profile.metadata.cert_results) || {};
    var snapshots = (profile && profile.metadata && profile.metadata.nplus_readiness_snapshots) || {};
    var catalog = getCertCatalog(role);
    var stateMap = getCertStateMap(catalog, results);
    var overlap = (typeof window !== 'undefined' && window.CROSS_CERT_OVERLAP) || [];

    // Build sets
    var activeCerts = catalog.filter(function (c) { return stateMap[c.id] === 'active'; });
    var passedCerts = catalog.filter(function (c) { return stateMap[c.id] === 'passed'; });
    var passedCertIds = passedCerts.map(function (c) { return c.id; });

    if (!activeCerts.length) {
      // No active certs to recommend on — soft empty state
      if (passedCerts.length) {
        elWnBody.innerHTML = ''
          + '<div class="cca-wn-empty">'
          +   '<div class="cca-wn-empty-icon"></div>'
          +   '<h3>No active prep right now</h3>'
          +   '<p>You\'ve passed ' + passedCerts.length + ' cert' + (passedCerts.length === 1 ? '' : 's') + ' and aren\'t studying any new ones. Pick a coming-soon cert above to get the next one in the pipeline.</p>'
          + '</div>';
      } else {
        elWnBody.innerHTML = ''
          + '<div class="cca-wn-empty">'
          +   '<div class="cca-wn-empty-icon"></div>'
          +   '<h3>Nothing to recommend yet</h3>'
          +   '<p>Pick a cert above to start studying — recommendations show up after your first quiz.</p>'
          + '</div>';
      }
      if (elPanelWn) elPanelWn.removeAttribute('hidden');
      return;
    }

    // Score every active cert
    var ranked = activeCerts.map(function (cert) {
      var snap = snapshots[cert.id];
      var urgencyData = computeUrgency(cert, snap, overlap, passedCertIds);
      var bonus = getOverlapBonusFor(cert.id, passedCertIds, overlap);
      return {
        cert: cert,
        snapshot: snap,
        urgencyData: urgencyData,
        overlapBonus: bonus
      };
    });

    // Sort by urgency descending
    ranked.sort(function (a, b) { return b.urgencyData.urgency - a.urgencyData.urgency; });

    // Render hero (top entry)
    var top = ranked[0];
    var heroHtml = renderHero(top.cert, top.snapshot, top.urgencyData, top.overlapBonus);

    // Secondary list (next 3 + maintenance suggestion)
    var secondaryHtml = renderSecondaryList(ranked, passedCerts, snapshots);

    elWnBody.innerHTML = heroHtml + secondaryHtml;
    if (elPanelWn) elPanelWn.removeAttribute('hidden');
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
      // GAP-4 (v7.43.0): Pro-only surface. Resolve tier before any content
      // renders so free users never see a flash of the dashboard. Unknown
      // tier (null, RPC error) fails open.
      fetchTier(session.user.id).then(function (tier) {
        if (tier === 'free') {
          showProGate();
          return;
        }
        // Render the panel synchronously with no profile while we fetch — the
        // catalog itself is enough to render the active/coming-soon rows.
        // Profile fetch only changes the passed-cert section.
        var emptyProfile = { role: 'user', metadata: {} };
        renderPanel1(emptyProfile);
        renderPanel2(emptyProfile);
        renderPanel3(emptyProfile);
        showContent();

        // Async: fetch real profile, re-render once we have cert_results
        fetchProfile(session.user.id).then(function (profile) {
          if (profile) {
            renderPanel1(profile);
            renderPanel2(profile);
            renderPanel3(profile);
          }
        });
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
