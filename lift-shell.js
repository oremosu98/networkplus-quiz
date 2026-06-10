/* LIFT-SHELL · Phase 0 — bottom tab bar + showPage hook.
   Companion to lift-shell.css; see the plan doc for the phase map.
   Phase 3: the Drills tab routes to the dedicated #page-drills screen,
   rendered here from real app data (wrong bank, weak spots, domains). */
(function () {
  'use strict';

  var TABS = [
    { page: 'setup',    label: 'Home',     icon: '<path d="M4 11l8-7 8 7"></path><path d="M6 10v9h12v-9"></path>' },
    { page: 'drills',   label: 'Drills',   icon: '<path d="M4 6h16M4 12h16M4 18h10"></path>' },
    { page: 'progress', label: 'Progress', icon: '<path d="M5 19V9M12 19V4M19 19v-7"></path>' },
    { page: 'settings', label: 'Account',  icon: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>' }
  ];

  /* session/immersive pages render without the tab bar (mockup behaviour) */
  var HIDE_ON = {
    'quiz': 1, 'exam': 1, 'diagnostic-quiz': 1, 'loading': 1, 'review': 1,
    'sr-review': 1, 'session-transition': 1, 'acl-pbq': 1, 'guided-lab': 1,
    /* session-end screens carry their own mockup footer (rfoot) */
    'results': 1, 'exam-results': 1, 'session-complete': 1
  };

  /* tab to light when a non-tab page is active */
  var LIGHT_AS = { 'analytics': 'progress', 'topic-dive': 'progress', 'diagnostic-result': 'setup' };

  function init() {
    if (document.getElementById('lift-tabbar')) return;
    var bar = document.createElement('nav');
    bar.id = 'lift-tabbar';
    bar.setAttribute('aria-label', 'Primary');
    bar.innerHTML = TABS.map(function (t) {
      return '<button type="button" class="lift-tab" data-page="' + t.page + '" aria-label="' + t.label + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' + t.icon + '</svg><span>' + t.label + '</span></button>';
    }).join('');
    document.body.appendChild(bar);

    bar.addEventListener('click', function (e) {
      var b = e.target.closest('.lift-tab');
      if (!b || typeof window.showPage !== 'function') return;
      var page = b.getAttribute('data-page');
      if (page === 'drills') liftRenderDrills();
      window.showPage(page);
    });

    /* keep tab state + tab bar visibility in sync with navigation */
    if (typeof window.showPage === 'function' && !window.showPage.__liftWrapped) {
      var orig = window.showPage;
      var wrapped = function (name) {
        var r = orig.apply(this, arguments);
        try { sync(name); } catch (_) {}
        return r;
      };
      wrapped.__liftWrapped = true;
      window.showPage = wrapped;
    }
    sync(currentPage());
  }

  function currentPage() {
    var el = document.querySelector('.page.active');
    return el ? el.id.replace(/^page-/, '') : 'setup';
  }

  function esc(s) { var d = document.createElement('i'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  /* Drills tab screen — 1:1 of mockups/cert-ios-drills.html fed by real data.
     Reads the same sources as the app's own surfaces: loadWrongBank (mistakes
     count behind startWrongDrill), computeWeakSpotScores (weak chips →
     focusTopic launches a 10-Q drill), DOMAIN_WEIGHTS/DOMAIN_LABELS +
     history-aggregated mastery (identical math to renderBentoDomains) →
     applyDomainPreset. Must never block navigation. */
  function liftRenderDrills() {
    try {
      var bank = (typeof loadWrongBank === 'function') ? loadWrongBank() : [];
      var n = bank.length;
      var pill = document.getElementById('drills-mistakes-pill');
      var note = document.getElementById('drills-mistakes-note');
      var mbtn = document.getElementById('drills-mistakes-btn');
      if (pill) pill.textContent = n + ' saved';
      if (note) note.innerHTML = n
        ? 'Clear the <b>' + n + ' wrong answer' + (n === 1 ? '' : 's') + '</b> in your bank. Get one right twice in a row and it leaves the bank for good.'
        : 'No wrong answers saved yet. Miss a question in practice and it lands here for a repeat pass.';
      if (mbtn) { mbtn.disabled = !n; mbtn.textContent = n ? 'Drill the ' + n + ' you missed' : 'Nothing to drill yet'; }

      /* per-topic accuracy from history (chip percentages) */
      var acc = {};
      try {
        ((typeof loadHistory === 'function') ? loadHistory() : []).forEach(function (e) {
          if (!e.topic) return;
          var a = acc[e.topic] || (acc[e.topic] = { s: 0, t: 0 });
          a.s += e.score || 0; a.t += e.total || 0;
        });
      } catch (_) {}

      var weak = [];
      try { weak = ((typeof computeWeakSpotScores === 'function') ? computeWeakSpotScores() : []) || []; } catch (_) {}
      var top = weak.slice(0, 3);
      var chipsHost = document.getElementById('drills-weak-chips');
      var wbtn = document.getElementById('drills-weak-btn');
      if (chipsHost) {
        chipsHost.innerHTML = top.length ? top.map(function (w) {
          var a = acc[w.topic], pct = (a && a.t) ? Math.round((a.s / a.t) * 100) : 0;
          return '<span class="drills-chip">' + esc(w.topic) + ' <b>' + pct + '%</b></span>';
        }).join('') : '<span class="drills-chip drills-chip-empty">No weak topics yet — keep practising</span>';
      }
      if (wbtn) {
        wbtn.disabled = !top.length;
        wbtn.onclick = top.length
          ? function () { if (typeof focusTopic === 'function') focusTopic(top[0].topic); }
          : null;
      }

      var host = document.getElementById('drills-domain-list');
      if (host && typeof DOMAIN_WEIGHTS === 'object' && DOMAIN_WEIGHTS) {
        var order = Object.keys(DOMAIN_WEIGHTS);
        var stats = {};
        order.forEach(function (d) { stats[d] = { s: 0, t: 0 }; });
        try {
          ((typeof loadHistory === 'function') ? loadHistory() : []).forEach(function (e) {
            var dk = (typeof TOPIC_DOMAINS !== 'undefined' && TOPIC_DOMAINS) ? TOPIC_DOMAINS[e.topic] : null;
            if (!dk || !stats[dk]) return;
            stats[dk].s += e.score || 0; stats[dk].t += e.total || 0;
          });
        } catch (_) {}
        host.innerHTML = order.map(function (dk) {
          var weight = Math.round((DOMAIN_WEIGHTS[dk] || 0) * 100);
          var st = stats[dk];
          var m = st.t ? Math.round((st.s / st.t) * 100) : 0;
          var name = (typeof DOMAIN_LABELS === 'object' && DOMAIN_LABELS && DOMAIN_LABELS[dk]) || dk;
          return '<button type="button" class="drills-domain" onclick="applyDomainPreset(\'' + String(dk).replace(/'/g, "\\'") + '\')">'
            + '<span class="drills-domain-top"><b>' + esc(name) + '</b><span class="drills-domain-wt">' + weight + '% of exam</span></span>'
            + '<span class="drills-domain-bar' + (m >= 100 ? ' full' : '') + '"><i style="width:' + m + '%"></i></span>'
            + '<span class="drills-domain-mast">Mastery <b>' + m + '%</b>' + (st.t ? '' : ', untouched') + ' &middot; 10 Q</span>'
            + '</button>';
        }).join('');
      }

      var tag = document.getElementById('drills-plan-tag');
      if (tag) {
        try {
          var pk = (typeof CERT_PACK === 'object' && CERT_PACK) ? (CERT_PACK.examCode || CERT_PACK.code || null) : null;
          if (pk) tag.textContent = pk;
        } catch (_) {}
      }
    } catch (_) { /* drills render must never block navigation */ }
  }

  function sync(name) {
    document.body.classList.toggle('lift-no-tabbar', !!HIDE_ON[name]);
    var lit = LIGHT_AS[name] || name;
    var tabs = document.querySelectorAll('#lift-tabbar .lift-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('on', tabs[i].getAttribute('data-page') === lit);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
