// ══════════════════════════════════════════════════════════════════════════
// Diagnostic results · shared renderer  ·  v1 (extracted from network-plus D.4)
// ══════════════════════════════════════════════════════════════════════════
// One renderer for every cert's results page. Reads the quiz payload from
// sessionStorage (or a /r/{token} share link), looks up the cert's identity +
// score scale from window.CERT_RESULTS_CONFIG, and renders:
//   · Hero (band headline + source eyebrow)
//   · Score ring (scaled-score arc + pass-threshold tick), scale per cert
//   · Pass Plan (band + summary + 3 personalised next steps)
//   · By-domain breakdown (weakest-first) with animated bars
//   · 5-path CTA fan-out (Subscribe / Continue / Download / Retake / Back)
//   · magic-link signup · share-link + email-report + print · answer review
//
// Usage (from each cert's thin results.html shell):
//   <script src="../results-config.js" defer></script>
//   <script src="../results-core.js" defer></script>
//   <script>document.addEventListener('DOMContentLoaded', function () {
//     window.CertAnvilResults.render('network-plus');
//   });</script>
//
// The pageSlug argument names the cert whose page this is (drives empty-state
// + share-error links). The actual results render keys off results.cert, with
// pageSlug as the fallback.
// ══════════════════════════════════════════════════════════════════════════

window.CertAnvilResults = (function () {
  'use strict';

  // Last-resort config if results-config.js failed to load; keeps the page
  // from hard-crashing; mirrors Network+'s scale.
  var DEFAULT_CFG = {
    name: 'CertAnvil', examCode: '', slug: 'network-plus',
    scoreMin: 100, scoreMax: 900,
    bands: { ready: 800, onPace: 720, nearPass: 600 },
    domainDrills: {}
  };

  function pickCfg(slug) {
    var map = window.CERT_RESULTS_CONFIG || {};
    return map[slug] || null;
  }

  function certLabelOf(cfg) {
    if (cfg.examCode && cfg.name.indexOf(cfg.examCode) === -1) return cfg.name + ' ' + cfg.examCode;
    return cfg.name;
  }

  function render(pageSlug) {
    var SESSION_KEY = 'certanvilDiagnosticSession';
    var RESULTS_KEY = 'certanvilDiagnosticResults';

    var shell = document.getElementById('dr-shell');
    if (!shell) return;

    var pageCfg = pickCfg(pageSlug) || DEFAULT_CFG;

    var results = null;
    try {
      var raw = sessionStorage.getItem(RESULTS_KEY);
      if (raw) results = JSON.parse(raw);
    } catch (_) {}

    // If URL has ?token=<hex>, hydrate from the share-fetch endpoint instead.
    // The token takes precedence over sessionStorage (the user followed a link).
    var urlToken = null;
    try {
      var params = new URLSearchParams(window.location.search);
      var tq = (params.get('token') || '').trim();
      if (/^[a-f0-9]{16,64}$/i.test(tq)) urlToken = tq;
    } catch (_) {}

    if (urlToken) {
      var loadingEl = document.getElementById('dr-loading');
      if (loadingEl) loadingEl.textContent = 'Loading shared diagnostic…';

      fetch('/api/diagnostic/share-fetch?token=' + encodeURIComponent(urlToken))
        .then(function (res) {
          return res.json().then(function (body) { return { status: res.status, body: body }; });
        })
        .then(function (r) {
          if (r.body && r.body.ok && r.body.results) {
            results = r.body.results;
            results._sharedFromToken = urlToken;
            results._sharedViewCount = r.body.viewCount || 1;
            renderPage();
          } else {
            renderShareError((r.body && r.body.error) || 'share_not_found');
          }
        })
        .catch(function (err) {
          renderShareError('network_error: ' + (err && err.message ? err.message : 'fetch failed'));
        });
      return;  // wait for async render
    }

    // Synchronous path: sessionStorage already has results → render now.
    renderPage();
    return;

    // ── Helper: shareable-link error ─────────────────────────────────
    function renderShareError(reason) {
      var hint;
      if (reason === 'expired') hint = 'This shared diagnostic has expired (90-day limit). Ask the sender for a fresh link, or take the diagnostic yourself.';
      else if (reason === 'not_found') hint = 'That share link is invalid or no longer available. Take the diagnostic to see your baseline.';
      else hint = 'Couldn\'t load the shared diagnostic · ' + reason + '. Take the diagnostic yourself to see your baseline.';

      shell.innerHTML =
        '<div class="dr-hero">' +
          '<span class="dr-eyebrow" style="background:var(--dg-bg-2);color:var(--dg-text-2)">Share link unavailable</span>' +
          '<h1 class="dr-h1">This shared diagnostic isn\'t available</h1>' +
          '<p class="dr-sub">' + hint + '</p>' +
        '</div>' +
        '<div class="dr-cta-block">' +
          '<div class="dr-cta-list">' +
            '<a href="/diagnostic/' + pageCfg.slug + '/intake" class="dr-cta dr-cta-primary">' +
              '<span class="dr-cta-icon">▶</span>' +
              '<span class="dr-cta-body">' +
                '<span class="dr-cta-title">Take the ' + esc(pageCfg.name) + ' diagnostic</span>' +
                '<span class="dr-cta-sub">20 questions · ~15 min · honest baseline</span>' +
              '</span>' +
              '<span class="dr-cta-chev">→</span>' +
            '</a>' +
            '<a href="/" class="dr-cta dr-cta-ghost">' +
              '<span class="dr-cta-title">Back to CertAnvil</span>' +
              '<span class="dr-cta-chev">←</span>' +
            '</a>' +
          '</div>' +
        '</div>';
    }

    // ── Empty state · no results yet (no sessionStorage AND no token) ─
    function renderEmptyState() {
      shell.innerHTML =
        '<div class="dr-hero">' +
          '<span class="dr-eyebrow" style="background:var(--dg-bg-2);color:var(--dg-text-2)">No results yet</span>' +
          '<h1 class="dr-h1">Take the diagnostic to see results</h1>' +
          '<p class="dr-sub">No results in this browser session. Start the 20-minute flow to get your score, weak-domain map, and Pass Plan.</p>' +
        '</div>' +
        '<div class="dr-cta-block">' +
          '<div class="dr-cta-list">' +
            '<a href="/diagnostic/' + pageCfg.slug + '/intake" class="dr-cta dr-cta-primary">' +
              '<span class="dr-cta-icon">▶</span>' +
              '<span class="dr-cta-body">' +
                '<span class="dr-cta-title">Start the ' + esc(pageCfg.name) + ' diagnostic</span>' +
                '<span class="dr-cta-sub">20 questions · ~15 min · honest baseline</span>' +
              '</span>' +
              '<span class="dr-cta-chev">→</span>' +
            '</a>' +
            '<a href="/" class="dr-cta dr-cta-ghost">' +
              '<span class="dr-cta-title">Back to CertAnvil</span>' +
              '<span class="dr-cta-chev">←</span>' +
            '</a>' +
          '</div>' +
        '</div>';
    }

    function renderPage() {
      if (!results || !results.totalQuestions) {
        renderEmptyState();
        return;
      }
      renderResultsContent();
    }

    // ── Main results render ──────────────────────────────────────────
    function renderResultsContent() {

      // Resolve the cert config from the payload, falling back to the page's.
      var cfg = pickCfg(results.cert) || pageCfg;
      var certLabel = certLabelOf(cfg);
      var DOMAIN_DRILLS = cfg.domainDrills || {};

      // ── Helpers ──
      function classifyBand(scaledScore) {
        if (scaledScore >= cfg.bands.ready) return 'ready';
        if (scaledScore >= cfg.bands.onPace) return 'on-pace';
        if (scaledScore >= cfg.bands.nearPass) return 'near-pass';
        return 'foundation';
      }

      function bandCopy(band) {
        if (band === 'ready')     return { label: 'Exam-ready', headline: 'Strong baseline · book the exam.', tone: 'You\'re already above pass on this 20-question slice. Tighten the weak corners and lock in the date.' };
        if (band === 'on-pace')   return { label: 'On pace',    headline: 'You\'d pass today.',               tone: 'You crossed pass on this baseline. Lift the bottom 1-2 domains and add a full-length exam sim to confirm.' };
        if (band === 'near-pass') return { label: 'Near pass',  headline: 'Close to pass.',                   tone: '1-2 weak domains separate you from pass. Drill those topics for 2-4 weeks.' };
        return                           { label: 'Foundation', headline: 'Starting baseline.',               tone: 'Plenty of headroom. Anchor on the ' + certLabel + ' objectives and rebuild from the weakest domain up. 6-8 weeks of focused study typically closes the gap.' };
      }

      function daysUntil(dateStr) {
        if (!dateStr) return null;
        var t = new Date(dateStr).getTime();
        if (isNaN(t)) return null;
        return Math.max(0, Math.round((t - Date.now()) / 86400000));
      }

      // ── Derived view-model ──
      var band = classifyBand(results.scaledScore);
      var bandInfo = bandCopy(band);
      var domainCount = (results.domainBreakdown || []).length;
      var weakDomains = (results.domainBreakdown || []).slice(0, 3);
      var top3WeakDomains = weakDomains.filter(function (d) { return d.accuracy < 0.8; });
      var examDays = daysUntil(results.intake && results.intake.examDate);
      var intensity = (results.intake && results.intake.intensity) || null;

      var diffFromPass = results.scaledScore - results.passThreshold;
      var passMarkerClass = '';
      var passMarkerText = '';
      if (results.isPassing) {
        passMarkerClass = 'is-passing';
        passMarkerText = '✓ ' + diffFromPass + ' points above pass';
      } else if (Math.abs(diffFromPass) <= 60) {
        passMarkerClass = 'is-near';
        passMarkerText = Math.abs(diffFromPass) + ' points below pass (' + results.passThreshold + ')';
      } else {
        passMarkerClass = 'is-far';
        passMarkerText = Math.abs(diffFromPass) + ' points below pass (' + results.passThreshold + ')';
      }

      var durationMin = Math.max(1, Math.round(results.durationMs / 60000));
      var sourceLabel = results.source === 'ai' ? 'AI-generated · 20 Q'
                      : results.source === 'fallback' ? 'Local set · 20 Q'
                      : '20 Q';

      // Ring geometry · scale per cert (Network+ is 100-900; others 0-1000/0-900)
      var RING_RADIUS = 80;  // SVG units; viewBox is 200x200
      var RING_CIRC = 2 * Math.PI * RING_RADIUS;
      var scoreSpan = Math.max(1, cfg.scoreMax - cfg.scoreMin);
      var scoreFraction = Math.max(0, Math.min(1, (results.scaledScore - cfg.scoreMin) / scoreSpan));
      var ringFillLength = scoreFraction * RING_CIRC;
      var passFraction = Math.max(0, Math.min(1, (results.passThreshold - cfg.scoreMin) / scoreSpan));

      // ── Pass Plan steps ──
      function buildPassPlanSteps() {
        var steps = [];

        if (top3WeakDomains.length > 0) {
          var weakest = top3WeakDomains[0];
          var drillTargets = DOMAIN_DRILLS[weakest.domain] || 'core topics in this domain';
          steps.push(
            '<strong>Start with ' + esc(weakest.domain) + '</strong> ' +
            '<span class="muted">(' + Math.round(weakest.accuracy * 100) + '% on this baseline). ' +
            'Drill ' + esc(drillTargets) + '. Aim for ≥85% across 30 questions before moving on.</span>'
          );
        } else {
          steps.push(
            '<strong>Drill the bottom two domains</strong> ' +
            '<span class="muted">to push them past 90%. Strong baselines still have weak corners. Your exam tests all domains.</span>'
          );
        }

        var cadenceCopy;
        if (examDays !== null && examDays < 14) {
          cadenceCopy = 'Daily 30-Q quizzes (high urgency · ' + examDays + ' days to exam). Two full-length exam sims this week, one next week.';
        } else if (examDays !== null && examDays < 30) {
          cadenceCopy = 'Three or four 20-Q sessions per week. Schedule one full-length exam sim ~10 days before your test date.';
        } else if (examDays !== null) {
          cadenceCopy = 'Two 20-Q sessions per week. Add a full-length exam sim at month-end to measure climb.';
        } else if (intensity === 'intense') {
          cadenceCopy = 'Daily 20-30 Q sessions. Add a full-length exam sim every 7-10 days to measure climb.';
        } else if (intensity === 'casual') {
          cadenceCopy = 'Two 20-Q sessions per week. Add a full-length exam sim at month-end to measure climb.';
        } else {
          cadenceCopy = 'Three 20-Q sessions per week. Add a full-length exam sim every 2 weeks to measure climb.';
        }
        steps.push('<strong>Lock a study cadence.</strong> <span class="muted">' + esc(cadenceCopy) + '</span>');

        if (band === 'foundation' || band === 'near-pass') {
          steps.push(
            '<strong>Use targeted topic drills first.</strong> ' +
            '<span class="muted">Don\'t rush into a full-length exam sim while the foundation is still settling · you\'ll just rehearse wrong answers.</span>'
          );
        } else if (band === 'on-pace') {
          steps.push(
            '<strong>Mix custom quizzes with full-length exam sims.</strong> ' +
            '<span class="muted">You\'re ready for full simulations. Aim for 2-3 sims comfortably above pass before booking the exam.</span>'
          );
        } else { /* ready */
          steps.push(
            '<strong>Book the exam window in the next 2-3 weeks.</strong> ' +
            '<span class="muted">Don\'t lose momentum by waiting too long. Run a full-length exam sim 5-7 days before the real test as the dress rehearsal.</span>'
          );
        }

        return steps;
      }

      var passPlanSteps = buildPassPlanSteps();

      // ── Domain breakdown rows ──
      function domainRowsHtml() {
        return (results.domainBreakdown || []).map(function (d) {
          var pct = Math.round(d.accuracy * 100);
          var cls = d.accuracy < 0.5 ? 'is-weak' : (d.accuracy < 0.8 ? 'is-mid' : 'is-strong');
          var drills = DOMAIN_DRILLS[d.domain] || '';
          return '<li class="dr-domain-row">' +
            '<div class="dr-domain-row-left">' +
              '<span class="dr-domain-name">' + esc(d.domain) +
                ' <span class="dr-domain-count">' + d.correct + '/' + d.total + '</span>' +
              '</span>' +
              '<span class="dr-domain-bar"><span class="dr-domain-bar-fill ' + cls + '" style="width:0%" data-target="' + pct + '"></span></span>' +
              (drills ? '<span class="dr-review-topic">' + esc(drills) + '</span>' : '') +
            '</div>' +
            '<span class="dr-domain-pct ' + cls + '">' + pct + '%</span>' +
          '</li>';
        }).join('');
      }

      // ── Answer-review rows ──
      function reviewRowsHtml() {
        return (results.questions || []).map(function (a, idx) {
          if (!a) {
            return '<div class="dr-review-row">' +
              '<span class="dr-review-mark is-skipped">–</span>' +
              '<div class="dr-review-mid"><span class="dr-review-domain">Q' + (idx + 1) + ' · skipped</span></div>' +
              '<span class="dr-review-confidence">·</span>' +
            '</div>';
          }
          var markCls = a.isCorrect ? 'is-correct' : 'is-wrong';
          var markSym = a.isCorrect ? '✓' : '✕';
          var confCls = a.confidence === 'locked-in' ? 'is-locked-in'
                      : a.confidence === 'guessing' ? 'is-guessing' : '';
          var confLabel = a.confidence === 'locked-in' ? 'Locked in'
                        : a.confidence === 'pretty-sure' ? 'Pretty sure'
                        : a.confidence === 'guessing' ? 'Guessing' : '·';
          return '<div class="dr-review-row">' +
            '<span class="dr-review-mark ' + markCls + '">' + markSym + '</span>' +
            '<div class="dr-review-mid">' +
              '<span class="dr-review-domain">Q' + (idx + 1) + ' · ' + esc(a.domain || 'Unknown') + '</span>' +
              '<span class="dr-review-topic">picked ' + esc(a.picked || '–') + ' · correct ' + esc(a.correct || '–') + ' · ' + (a.difficulty || '') + '</span>' +
            '</div>' +
            '<span class="dr-review-confidence ' + confCls + '">' + confLabel + '</span>' +
          '</div>';
        }).join('');
      }

      // ── Source eyebrow chip ──
      var eyebrowHtml;
      if (results.source === 'fallback') {
        eyebrowHtml = '<span class="dr-eyebrow is-source-fallback">Local question set · ' + durationMin + ' min</span>';
      } else if (results.source === 'ai') {
        eyebrowHtml = '<span class="dr-eyebrow">AI-generated · ' + durationMin + ' min</span>';
      } else {
        eyebrowHtml = '<span class="dr-eyebrow">✓ Diagnostic complete · ' + durationMin + ' min</span>';
      }

      // ── Render ──
      shell.innerHTML =
        '<div class="dr-hero">' +
          eyebrowHtml +
          '<h1 class="dr-h1">' + esc(bandInfo.headline) + '</h1>' +
          '<p class="dr-sub">' + results.correctCount + ' / ' + results.totalQuestions + ' correct across all ' + domainCount + ' ' + esc(certLabel) + ' domains · ' + sourceLabel + '</p>' +
        '</div>' +

        '<div class="dr-score-block">' +
          '<div class="dr-ring-wrap" id="dr-ring-wrap">' +
            '<svg class="dr-ring-svg" viewBox="0 0 200 200" aria-hidden="true">' +
              '<circle class="dr-ring-bg" cx="100" cy="100" r="' + RING_RADIUS + '"></circle>' +
              '<circle class="dr-ring-fg is-' + band + '" cx="100" cy="100" r="' + RING_RADIUS + '" id="dr-ring-fg" ' +
                      'stroke-dasharray="' + RING_CIRC.toFixed(2) + '" ' +
                      'stroke-dashoffset="' + RING_CIRC.toFixed(2) + '"></circle>' +
            '</svg>' +
            '<div class="dr-ring-tick" id="dr-ring-tick" aria-hidden="true"></div>' +
            '<div class="dr-ring-center">' +
              '<span class="dr-score-num" aria-live="polite">' + results.scaledScore + '</span>' +
              '<span class="dr-score-out-of">/ ' + cfg.scoreMax + ' · pass ' + results.passThreshold + '</span>' +
            '</div>' +
          '</div>' +
          '<span class="dr-pass-marker ' + passMarkerClass + '">' + esc(passMarkerText) + '</span>' +
          '<div class="dr-meta-row">' +
            '<span>Accuracy <strong>' + Math.round(results.accuracy * 100) + '%</strong></span>' +
            '<span>Time <strong>' + durationMin + ' min</strong></span>' +
            '<span>Cert <strong>' + esc(cfg.name) + '</strong></span>' +
          '</div>' +
        '</div>' +

        '<div class="dr-passplan">' +
          '<p class="dr-section-title">Your Pass Plan</p>' +
          '<span class="dr-passplan-band is-' + band + '">' + esc(bandInfo.label) + '</span>' +
          '<h2 class="dr-passplan-head">' + esc(bandInfo.headline) + '</h2>' +
          '<p class="dr-passplan-summary">' + esc(bandInfo.tone) + '</p>' +
          '<ul class="dr-passplan-steps">' +
            passPlanSteps.map(function (s, i) {
              return '<li class="dr-passplan-step"><span class="dr-passplan-step-num">' + (i + 1) + '</span><div>' + s + '</div></li>';
            }).join('') +
          '</ul>' +
        '</div>' +

        '<div class="dr-domain-block">' +
          '<p class="dr-section-title">By domain · weakest first</p>' +
          '<ul class="dr-domain-list">' + domainRowsHtml() + '</ul>' +
        '</div>' +

        '<div class="dr-cta-block">' +
          '<p class="dr-section-title">What next?</p>' +
          '<div class="dr-cta-list">' +
            // Primary (pre-Stripe): the real free path into the app. Pro is a
            // waitlist until checkout ships, so it sits second, not first.
            '<button type="button" class="dr-cta dr-cta-primary" id="dr-cta-continue" data-path="continue">' +
              '<span class="dr-cta-icon">▶</span>' +
              '<span class="dr-cta-body">' +
                '<span class="dr-cta-title">Save your results &amp; keep practising free</span>' +
                '<span class="dr-cta-sub">Magic-link sign-up · no password · 15 questions + 5 review cards a day</span>' +
              '</span>' +
              '<span class="dr-cta-chev">→</span>' +
            '</button>' +

            '<button type="button" class="dr-cta dr-cta-secondary" id="dr-cta-subscribe" data-path="subscribe">' +
              '<span class="dr-cta-icon">⚡</span>' +
              '<span class="dr-cta-body">' +
                '<span class="dr-cta-title">Get CertAnvil Pro at launch</span>' +
                '<span class="dr-cta-sub">Unlimited AI · all certs · 14-day money-back · $9.99/mo or $89/yr</span>' +
              '</span>' +
              '<span class="dr-cta-chev">→</span>' +
            '</button>' +

            '<button type="button" class="dr-cta dr-cta-tertiary" id="dr-cta-download" data-path="download">' +
              '<span class="dr-cta-icon">⬇</span>' +
              '<span class="dr-cta-body">' +
                '<span class="dr-cta-title">Download or email score report</span>' +
                '<span class="dr-cta-sub">PDF with Pass Plan + weak domains · share link · keep a copy</span>' +
              '</span>' +
              '<span class="dr-cta-chev">→</span>' +
            '</button>' +

            '<button type="button" class="dr-cta dr-cta-ghost" id="dr-cta-retake" data-path="retake">' +
              '<span class="dr-cta-title">Retake the diagnostic</span>' +
              '<span class="dr-cta-chev">↺</span>' +
            '</button>' +

            '<a href="/" class="dr-cta dr-cta-ghost" id="dr-cta-back">' +
              '<span class="dr-cta-title">Back to CertAnvil</span>' +
              '<span class="dr-cta-chev">←</span>' +
            '</a>' +
          '</div>' +
        '</div>' +

        '<div class="dr-stub" id="dr-stub-subscribe">' +
          '<div class="dr-stub-head">' +
            '<h2 class="dr-stub-title">⚡ CertAnvil Pro · join the launch waitlist</h2>' +
            '<button type="button" class="dr-stub-close" data-close="subscribe" aria-label="Close">×</button>' +
          '</div>' +
          '<div class="dr-stub-body">' +
            '<span class="dr-stub-pill">Launching soon</span>' +
            '<p><strong>Pro launches soon</strong> with unlimited AI question generation, every cert, the full Exam Simulator, and advanced readiness analytics.</p>' +
            '<p>For now, your results are saved locally in this browser session. Add your email below and you\'ll be first in when subscriptions open.</p>' +
            '<p style="margin-top:14px"><a href="/pricing" class="dr-cta dr-cta-secondary" style="text-decoration:none;display:inline-grid;grid-template-columns:auto 1fr auto;padding:10px 16px"><span class="dr-cta-icon"></span><span class="dr-cta-body"><span class="dr-cta-title">See full pricing</span></span><span class="dr-cta-chev">→</span></a></p>' +
          '</div>' +
        '</div>' +

        '<div class="dr-stub" id="dr-stub-continue">' +
          '<div class="dr-stub-head">' +
            '<h2 class="dr-stub-title">↗ Continue with a free account</h2>' +
            '<button type="button" class="dr-stub-close" data-close="continue" aria-label="Close">×</button>' +
          '</div>' +
          '<div class="dr-stub-body">' +
            '<p>Drop your email · we\'ll send a magic link that creates your free CertAnvil account and saves these diagnostic results to your profile. No password to remember.</p>' +
            '<form id="dr-continue-form" class="dr-continue-form" novalidate>' +
              '<input type="email" id="dr-continue-email" name="email" required ' +
                     'placeholder="you@example.com" autocomplete="email" ' +
                     'aria-label="Your email address" />' +
              '<button type="submit" id="dr-continue-submit" class="dr-cta dr-cta-secondary dr-continue-submit">' +
                '<span class="dr-cta-icon">✉</span>' +
                '<span class="dr-cta-body"><span class="dr-cta-title">Send magic link</span></span>' +
                '<span class="dr-cta-chev">→</span>' +
              '</button>' +
            '</form>' +
            '<div id="dr-continue-status" class="dr-continue-status" role="status" aria-live="polite"></div>' +
          '</div>' +
        '</div>' +

        '<div class="dr-stub" id="dr-stub-download">' +
          '<div class="dr-stub-head">' +
            '<h2 class="dr-stub-title">⬇ Save or share your report</h2>' +
            '<button type="button" class="dr-stub-close" data-close="download" aria-label="Close">×</button>' +
          '</div>' +
          '<div class="dr-stub-body">' +
            '<p>Three options · keep a copy, email it to yourself, or share a public link.</p>' +
            '<div class="dr-download-actions">' +
              '<button type="button" class="dr-download-action" id="dr-action-print">' +
                '<span class="dr-download-action-icon"></span>' +
                '<span class="dr-download-action-body">' +
                  '<span class="dr-download-action-title">Print or save as PDF</span>' +
                  '<span class="dr-download-action-sub">Opens your browser\'s print dialog · choose "Save as PDF" for a clean copy</span>' +
                '</span>' +
                '<span class="dr-download-action-chev">→</span>' +
              '</button>' +
              '<button type="button" class="dr-download-action" id="dr-action-email">' +
                '<span class="dr-download-action-icon">✉</span>' +
                '<span class="dr-download-action-body">' +
                  '<span class="dr-download-action-title">Email me the report</span>' +
                  '<span class="dr-download-action-sub">Score + Pass Plan + shareable link, in your inbox</span>' +
                '</span>' +
                '<span class="dr-download-action-chev">→</span>' +
              '</button>' +
              '<button type="button" class="dr-download-action" id="dr-action-share">' +
                '<span class="dr-download-action-icon"></span>' +
                '<span class="dr-download-action-body">' +
                  '<span class="dr-download-action-title">Copy a shareable link</span>' +
                  '<span class="dr-download-action-sub">Public URL · 90-day expiry · no email required</span>' +
                '</span>' +
                '<span class="dr-download-action-chev">→</span>' +
              '</button>' +
            '</div>' +
            '<div class="dr-download-email-wrap" id="dr-email-wrap">' +
              '<form id="dr-email-form" class="dr-download-email-form" novalidate>' +
                '<input type="email" id="dr-email-input" name="email" required ' +
                       'placeholder="you@example.com" autocomplete="email" ' +
                       'aria-label="Your email address" />' +
                '<button type="submit" id="dr-email-submit" class="dr-cta dr-cta-secondary" style="width:100%">' +
                  '<span class="dr-cta-icon">✉</span>' +
                  '<span class="dr-cta-body"><span class="dr-cta-title">Send report</span></span>' +
                  '<span class="dr-cta-chev">→</span>' +
                '</button>' +
              '</form>' +
            '</div>' +
            '<div class="dr-share-link-reveal" id="dr-share-reveal">' +
              '<strong>✓ Your shareable link:</strong>' +
              '<code class="dr-share-link-url" id="dr-share-url"></code>' +
              '<button type="button" id="dr-share-copy" class="dr-cta dr-cta-tertiary" style="width:auto;padding:8px 14px">' +
                '<span class="dr-cta-title">Copy to clipboard</span>' +
              '</button>' +
              '<span style="display:block;margin-top:8px;font-size:12px;color:var(--dg-text-2)">Valid 90 days · works for anyone (no sign-in needed) · doesn\'t include your email.</span>' +
            '</div>' +
            '<div id="dr-download-status" class="dr-download-status" role="status" aria-live="polite"></div>' +
          '</div>' +
        '</div>' +

        '<div class="dr-review-block">' +
          '<button type="button" class="dr-review-toggle" id="dr-review-toggle" aria-expanded="false" aria-controls="dr-review-list">Show question-by-question review ▾</button>' +
          '<div class="dr-review-list" id="dr-review-list" aria-live="polite">' +
            reviewRowsHtml() +
          '</div>' +
        '</div>' +

        '<div class="dr-print-footer">' +
          'CertAnvil · ' + new Date().toLocaleDateString() + ' · ' +
          (results._sharedFromToken ? 'certanvil.com/r/' + results._sharedFromToken : 'certanvil.com/diagnostic/' + cfg.slug) +
        '</div>';

      // ── Animate the ring fill (after layout settles) ──
      setTimeout(function () {
        var fg = document.getElementById('dr-ring-fg');
        if (fg) fg.setAttribute('stroke-dashoffset', String(RING_CIRC - ringFillLength));

        var tick = document.getElementById('dr-ring-tick');
        if (tick) {
          var deg = passFraction * 360;
          tick.style.transform = 'rotate(' + deg + 'deg) translateY(-90px)';
        }

        document.querySelectorAll('.dr-domain-bar-fill').forEach(function (bar) {
          var t = parseFloat(bar.getAttribute('data-target')) || 0;
          bar.style.width = t + '%';
        });
      }, 80);

      // ── Wire CTAs ──
      function openStub(name) {
        ['subscribe', 'continue', 'download'].forEach(function (n) {
          var el = document.getElementById('dr-stub-' + n);
          if (el) el.classList.toggle('is-open', n === name);
        });
        var target = document.getElementById('dr-stub-' + name);
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      function closeStub(name) {
        var el = document.getElementById('dr-stub-' + name);
        if (el) el.classList.remove('is-open');
      }

      ['subscribe', 'continue', 'download'].forEach(function (name) {
        var btn = document.getElementById('dr-cta-' + name);
        if (btn) btn.addEventListener('click', function () { openStub(name); });
        var closeBtn = document.querySelector('[data-close="' + name + '"]');
        if (closeBtn) closeBtn.addEventListener('click', function () { closeStub(name); });
      });

      // ── Continue stub form: magic-link signup + result-claim handoff ──
      var continueForm = document.getElementById('dr-continue-form');
      var continueStatus = document.getElementById('dr-continue-status');
      var continueSubmit = document.getElementById('dr-continue-submit');
      var continueEmail = document.getElementById('dr-continue-email');

      function setContinueStatus(text, tone) {
        if (!continueStatus) return;
        continueStatus.textContent = text || '';
        continueStatus.classList.remove('is-error', 'is-success');
        if (tone === 'error') continueStatus.classList.add('is-error');
        else if (tone === 'success') continueStatus.classList.add('is-success');
      }

      function setContinueBusy(busy) {
        if (continueSubmit) continueSubmit.disabled = !!busy;
        if (continueEmail) continueEmail.disabled = !!busy;
      }

      if (continueForm) continueForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!continueEmail || !continueEmail.value) return;
        var emailRaw = continueEmail.value.trim();
        if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
          setContinueStatus('Please enter a valid email address.', 'error');
          return;
        }

        setContinueBusy(true);
        setContinueStatus('Sending…', null);

        fetch('/api/diagnostic/signup-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailRaw,
            cert: results.cert || cfg.slug,
            diagnosticResults: results,
          }),
        }).then(function (res) {
          return res.json().then(function (body) { return { status: res.status, body: body }; });
        }).then(function (r) {
          if (r.status === 503) {
            setContinueStatus('Magic-link signup is being configured · please try again in a moment.', 'error');
            setContinueBusy(false);
            return;
          }
          if (r.status === 429) {
            setContinueStatus('Too many sign-up attempts from this IP · please wait an hour before trying again.', 'error');
            setContinueBusy(false);
            return;
          }
          if (!r.body || !r.body.ok) {
            var msg = (r.body && r.body.error) || 'unknown_error';
            setContinueStatus('Couldn\'t send magic link · ' + msg + ' · please try again.', 'error');
            setContinueBusy(false);
            return;
          }

          var sb = window.certanvilSupabase;
          if (!sb || !sb.auth || typeof sb.auth.signInWithOtp !== 'function') {
            setContinueStatus('Supabase client missing · please refresh and try again.', 'error');
            setContinueBusy(false);
            return;
          }
          sb.auth.signInWithOtp({
            email: emailRaw,
            options: { emailRedirectTo: r.body.redirectTo },
          }).then(function (otpResp) {
            if (otpResp && otpResp.error) {
              setContinueStatus('Supabase auth error: ' + (otpResp.error.message || 'send_failed') + '. Please try again.', 'error');
              setContinueBusy(false);
              return;
            }
            setContinueStatus(
              '✓ Magic link sent to ' + emailRaw + '. Click the link in your inbox to finish signing up · your diagnostic results transfer to your profile on sign-in.',
              'success'
            );
          }).catch(function (err) {
            setContinueStatus('Send failed: ' + (err && err.message ? err.message : 'unknown error') + '. Please try again.', 'error');
            setContinueBusy(false);
          });
        }).catch(function (err) {
          setContinueStatus('Network error: ' + (err && err.message ? err.message : 'fetch failed') + '. Please try again.', 'error');
          setContinueBusy(false);
        });
      });

      // Retake: clear session + results + go back to intake
      var retakeBtn = document.getElementById('dr-cta-retake');
      if (retakeBtn) retakeBtn.addEventListener('click', function () {
        if (!window.confirm('Retake the diagnostic? This clears your current results.')) return;
        try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
        try { sessionStorage.removeItem(RESULTS_KEY); } catch (_) {}
        window.location.href = '/diagnostic/' + cfg.slug + '/intake';
      });

      // Answer review toggle
      var toggle = document.getElementById('dr-review-toggle');
      var list = document.getElementById('dr-review-list');
      if (toggle && list) toggle.addEventListener('click', function () {
        var open = list.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.textContent = open ? 'Hide question-by-question review ▴' : 'Show question-by-question review ▾';
      });

      // ── Download dialog wiring (Print · Email · Copy-share-link) ──
      var downloadStatus = document.getElementById('dr-download-status');
      var emailWrap = document.getElementById('dr-email-wrap');
      var shareReveal = document.getElementById('dr-share-reveal');
      var shareUrlEl = document.getElementById('dr-share-url');
      var cachedShareToken = null;

      function setDownloadStatus(text, tone) {
        if (!downloadStatus) return;
        downloadStatus.textContent = text || '';
        downloadStatus.classList.remove('is-error', 'is-success');
        if (tone === 'error') downloadStatus.classList.add('is-error');
        else if (tone === 'success') downloadStatus.classList.add('is-success');
      }

      var printBtn = document.getElementById('dr-action-print');
      if (printBtn) printBtn.addEventListener('click', function () {
        setDownloadStatus('Opening print dialog…', null);
        setTimeout(function () {
          try { window.print(); setDownloadStatus('', null); }
          catch (_) { setDownloadStatus('Browser blocked the print dialog · try the keyboard shortcut Cmd/Ctrl + P.', 'error'); }
        }, 50);
      });

      var emailBtn = document.getElementById('dr-action-email');
      if (emailBtn) emailBtn.addEventListener('click', function () {
        if (emailWrap) emailWrap.classList.toggle('is-open');
        setDownloadStatus('', null);
        var input = document.getElementById('dr-email-input');
        if (input && emailWrap && emailWrap.classList.contains('is-open')) {
          try { input.focus(); } catch (_) {}
        }
      });

      var emailForm = document.getElementById('dr-email-form');
      if (emailForm) emailForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var input = document.getElementById('dr-email-input');
        var submitBtn = document.getElementById('dr-email-submit');
        if (!input || !input.value) return;
        var addr = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
          setDownloadStatus('Please enter a valid email address.', 'error');
          return;
        }
        if (submitBtn) submitBtn.disabled = true;
        input.disabled = true;
        setDownloadStatus('Sending report to ' + addr + '…', null);

        fetch('/api/diagnostic/email-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: addr,
            cert: results.cert || cfg.slug,
            diagnosticResults: results,
            shareToken: cachedShareToken || undefined,
          }),
        }).then(function (res) {
          return res.json().then(function (b) { return { status: res.status, body: b }; });
        }).then(function (r) {
          if (r.status === 503) {
            setDownloadStatus('Email service is being configured · try again in a moment, or use Print or Copy link instead.', 'error');
          } else if (r.status === 429) {
            setDownloadStatus('Too many requests from this IP · please wait an hour before trying again.', 'error');
          } else if (r.body && r.body.ok) {
            cachedShareToken = r.body.token || cachedShareToken;
            setDownloadStatus('✓ Sent to ' + addr + ' · check your inbox in a minute (and spam folder).', 'success');
          } else {
            var msg = (r.body && r.body.error) || 'unknown_error';
            setDownloadStatus('Couldn\'t send email · ' + msg + ' · please try again.', 'error');
          }
        }).catch(function (err) {
          setDownloadStatus('Network error · ' + (err && err.message ? err.message : 'fetch failed') + ' · please try again.', 'error');
        }).then(function () {
          if (submitBtn) submitBtn.disabled = false;
          input.disabled = false;
        });
      });

      var shareBtn = document.getElementById('dr-action-share');
      if (shareBtn) shareBtn.addEventListener('click', function () {
        if (cachedShareToken && shareUrlEl && shareReveal) {
          shareReveal.classList.add('is-open');
          return;
        }
        setDownloadStatus('Creating shareable link…', null);
        fetch('/api/diagnostic/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cert: results.cert || cfg.slug,
            diagnosticResults: results,
          }),
        }).then(function (res) {
          return res.json().then(function (b) { return { status: res.status, body: b }; });
        }).then(function (r) {
          if (r.status === 503) {
            setDownloadStatus('Share service is being configured · try Print or Email instead.', 'error');
          } else if (r.status === 429) {
            setDownloadStatus('Too many share requests from this IP · please wait an hour.', 'error');
          } else if (r.body && r.body.ok && r.body.shareUrl) {
            cachedShareToken = r.body.token;
            if (shareUrlEl) shareUrlEl.textContent = r.body.shareUrl;
            if (shareReveal) shareReveal.classList.add('is-open');
            setDownloadStatus('', null);
          } else {
            var msg = (r.body && r.body.error) || 'unknown_error';
            setDownloadStatus('Couldn\'t create share link · ' + msg + '. Please try again.', 'error');
          }
        }).catch(function (err) {
          setDownloadStatus('Network error · ' + (err && err.message ? err.message : 'fetch failed'), 'error');
        });
      });

      var copyBtn = document.getElementById('dr-share-copy');
      if (copyBtn) copyBtn.addEventListener('click', function () {
        var url = (shareUrlEl && shareUrlEl.textContent) || '';
        if (!url) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            copyBtn.querySelector('.dr-cta-title').textContent = 'Copied ✓';
            setTimeout(function () {
              if (copyBtn && copyBtn.querySelector('.dr-cta-title')) {
                copyBtn.querySelector('.dr-cta-title').textContent = 'Copy to clipboard';
              }
            }, 1800);
          }).catch(function () {
            setDownloadStatus('Couldn\'t auto-copy · please select the link above and copy manually.', 'error');
          });
        } else {
          setDownloadStatus('Clipboard API unavailable · please select the link above and copy manually.', 'error');
        }
      });

    }  // end renderResultsContent
  }    // end render

  // Shared HTML-escape (used by every render path).
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  return { render: render };
})();
