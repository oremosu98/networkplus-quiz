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
      navTo(b.getAttribute('data-page'));
    });
    injectSeg();

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

  /* showPage() only swaps pages — content renderers were historically invoked
     by the (now retired) sidebar item handlers. Mirror that dispatch here so
     tab/seg navigation always lands on fresh content. */
  var RENDER = {
    drills: function () { liftRenderDrills(); },
    progress: function () { if (typeof renderProgressPage === 'function') renderProgressPage(); },
    analytics: function () { if (typeof renderAnalytics === 'function') renderAnalytics(); },
    settings: function () { if (typeof renderSettingsPage === 'function') renderSettingsPage(); }
  };

  function navTo(page) {
    if (page === 'setup' && typeof window.goSetup === 'function') { window.goSetup(); return; }
    try { if (RENDER[page]) RENDER[page](); } catch (_) { /* render must never block nav */ }
    window.showPage(page);
  }

  /* Progress ⇄ Analytics segmented switcher (mockup .seg chip language).
     Analytics lost its only entry point when the sidebar retired — this
     restores it inside the lift's own chrome, on both pages. */
  function injectSeg() {
    ['progress', 'analytics'].forEach(function (pid) {
      var page = document.getElementById('page-' + pid);
      if (!page || page.querySelector('.lift-seg')) return;
      var seg = document.createElement('div');
      seg.className = 'lift-seg';
      seg.setAttribute('role', 'tablist');
      seg.setAttribute('aria-label', 'Progress and analytics');
      seg.innerHTML = [['progress', 'Progress'], ['analytics', 'Analytics']].map(function (t) {
        var on = t[0] === pid;
        return '<button type="button" class="lift-seg-chip' + (on ? ' on' : '') + '" data-page="' + t[0] + '" role="tab" aria-selected="' + on + '">' + t[1] + '</button>';
      }).join('');
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('.lift-seg-chip');
        if (!b || b.classList.contains('on')) return;
        navTo(b.getAttribute('data-page'));
      });
      page.insertBefore(seg, page.firstChild);
    });
  }

  function esc(s) { var d = document.createElement('i'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  function certCode() {
    try {
      var m = (typeof CERT_PACK === 'object' && CERT_PACK && CERT_PACK.meta) || null;
      return m ? (m.code || m.examCode || null) : null;
    } catch (_) { return null; }
  }

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
      if (tag) { var pk = certCode(); if (pk) tag.textContent = pk; }
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

  /* ── Exam-date bottom sheet (Phase 2 leftover, mockup cert-ios-settings) ──
     Replaces the native showPicker() date input on the Settings exam chip
     with the mockup's scrim + calendar sheet. Saves through the app's own
     updateExamDate() so the chip, topbar countdown, Home and Analytics all
     re-sync. Sheet DOM is lazy-built on first open; the chip's inline
     onclick is intercepted in capture phase (clear × stays native). */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOWS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  var sheetBuilt = false, selISO = '', viewY = 0, viewM = 0;

  function dayStart(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function isoOf(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function buildExamSheet() {
    if (sheetBuilt) return;
    sheetBuilt = true;
    var scrim = document.createElement('div');
    scrim.className = 'lift-sheet-scrim';
    scrim.id = 'lift-exam-scrim';
    var sheet = document.createElement('div');
    sheet.className = 'lift-sheet';
    sheet.id = 'lift-exam-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Set your exam date');
    var cert = certCode() || '';
    sheet.innerHTML = '<div class="lift-sheet-grab"></div>'
      + '<h2 class="lift-sheet-title">Set your exam date</h2>'
      + '<p class="lift-sheet-sub">Pick the day you sit ' + (cert ? esc(cert) : 'your exam') + '. You can change it any time.</p>'
      + '<div class="lift-cal-head">'
      + '<span class="lift-cal-month" id="lift-cal-month"></span>'
      + '<span class="lift-cal-nav">'
      + '<button type="button" id="lift-cal-prev" aria-label="Previous month"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>'
      + '<button type="button" id="lift-cal-next" aria-label="Next month"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>'
      + '</span></div>'
      + '<div class="lift-cal-grid" id="lift-cal-grid"></div>'
      + '<button class="lift-sheet-save" id="lift-exam-save" type="button" disabled>Save exam date</button>'
      + '<button class="lift-sheet-clear" id="lift-exam-clear" type="button" hidden>Remove exam date</button>';
    document.body.appendChild(scrim);
    document.body.appendChild(sheet);

    scrim.addEventListener('click', closeExamSheet);
    document.getElementById('lift-cal-prev').addEventListener('click', function () { if (--viewM < 0) { viewM = 11; viewY--; } renderCal(); });
    document.getElementById('lift-cal-next').addEventListener('click', function () { if (++viewM > 11) { viewM = 0; viewY++; } renderCal(); });
    document.getElementById('lift-cal-grid').addEventListener('click', function (e) {
      var b = e.target.closest('.lift-cal-day');
      if (!b || b.disabled) return;
      selISO = b.getAttribute('data-iso');
      renderCal();
    });
    document.getElementById('lift-exam-save').addEventListener('click', function () {
      if (!selISO) return;
      if (typeof updateExamDate === 'function') updateExamDate(selISO);
      closeExamSheet();
    });
    document.getElementById('lift-exam-clear').addEventListener('click', function () {
      if (typeof updateExamDate === 'function') updateExamDate('');
      closeExamSheet();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('on')) closeExamSheet();
    });
  }

  function renderCal() {
    var today = dayStart(new Date());
    var monthEl = document.getElementById('lift-cal-month');
    var prevBtn = document.getElementById('lift-cal-prev');
    var grid = document.getElementById('lift-cal-grid');
    var save = document.getElementById('lift-exam-save');
    monthEl.textContent = MONTHS[viewM] + ' ' + viewY;
    prevBtn.disabled = (viewY === today.getFullYear() && viewM === today.getMonth());
    var html = DOWS.map(function (d) { return '<span class="lift-cal-dow">' + d + '</span>'; }).join('');
    var lead = (new Date(viewY, viewM, 1).getDay() + 6) % 7; /* Monday-start offset */
    for (var i = 0; i < lead; i++) html += '<span></span>';
    var days = new Date(viewY, viewM + 1, 0).getDate();
    for (var d = 1; d <= days; d++) {
      var dt = new Date(viewY, viewM, d), dISO = isoOf(dt);
      var cls = 'lift-cal-day' + (dISO === selISO ? ' sel' : '') + (dt.getTime() === today.getTime() ? ' today' : '');
      html += '<button type="button" class="' + cls + '" data-iso="' + dISO + '"' + (dt < today ? ' disabled' : '') + '>' + d + '</button>';
    }
    grid.innerHTML = html;
    save.disabled = !selISO;
  }

  function openExamSheet() {
    buildExamSheet();
    var today = dayStart(new Date());
    selISO = '';
    try { selISO = (typeof getExamDate === 'function' && getExamDate()) || ''; } catch (_) {}
    if (selISO) { var p = selISO.split('-'); viewY = +p[0]; viewM = +p[1] - 1; }
    else { viewY = today.getFullYear(); viewM = today.getMonth(); }
    renderCal();
    document.getElementById('lift-exam-clear').hidden = !selISO;
    document.getElementById('lift-exam-save').textContent = selISO ? 'Save exam date' : 'Save exam date';
    document.getElementById('lift-exam-scrim').classList.add('on');
    document.getElementById('lift-exam-sheet').classList.add('on');
  }

  function closeExamSheet() {
    var scrim = document.getElementById('lift-exam-scrim'), sheet = document.getElementById('lift-exam-sheet');
    if (scrim) scrim.classList.remove('on');
    if (sheet) sheet.classList.remove('on');
  }

  /* capture-phase intercept: the chip's inline onclick (native showPicker)
     never fires; the clear × keeps its native updateExamDate('') path */
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest) return;
    var row = ev.target.closest('#settings-exam-row');
    if (!row) return;
    if (ev.target.closest('.ana-ready-datechip-clear')) return;
    ev.preventDefault();
    ev.stopPropagation();
    openExamSheet();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
