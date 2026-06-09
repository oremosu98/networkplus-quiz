/* ════════════════════════════════════════════════════════════════════════
   CertAnvil iOS E2E — shell engine  (Phase 1 skeleton)
   ------------------------------------------------------------------------
   Stitches the EXACT cert-ios-* / onboarding-* mockups into one navigable
   app. Each view is the untouched mockup loaded in an iframe (perfect 1:1
   fidelity by construction). The shell only:
     1. renders the inner .screen full-bleed on a 390x844 canvas, scaled to
        fit the viewport (strips the .stage caption + .phone bezel via
        injected CSS — the mockup files are NEVER edited)
     2. manages a view stack with iOS push/pop transitions
     3. shares state across views via same-origin localStorage
   See: docs/superpowers/specs/2026-06-08-cert-ios-e2e-app-plan.md
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Device design canvas (matches .phone in every mockup) ───────────────
  var CANVAS_W = 390, CANVAS_H = 844;

  // ── Screen registry: id -> mockup filename (relative to /mockups/) ──────
  var SCREENS = {
    'native-welcome'    : 'onboarding-native-welcome.html',
    'rollout'           : 'onboarding-rollout-flow.html',
    'signup-signin'     : 'onboarding-signup-signin.html',
    'magic-link'        : 'onboarding-magic-link-sent.html',
    'welcome-back'      : 'onboarding-welcome-back.html',
    'plan-picker'       : 'onboarding-plan-picker-concept.html',
    'free-cert-picker'  : 'onboarding-free-cert-picker.html',
    'free-home-day0'    : 'onboarding-free-home-day0.html',
    'first-run-diag'    : 'onboarding-first-run-diagnostic.html',
    'notifications'     : 'onboarding-notifications-prime.html',
    'home'              : 'cert-ios-home.html',
    'hub'               : 'cert-ios-hub.html',
    'quiz'              : 'cert-ios-quiz.html',
    'custom-quiz'       : 'cert-ios-custom-quiz.html',
    'exam'              : 'cert-ios-exam.html',
    'results'           : 'cert-ios-results.html',
    'exam-results'      : 'cert-ios-exam-results.html',
    'progress'          : 'cert-ios-progress.html',
    'analytics'         : 'cert-ios-analytics.html',
    'report'            : 'cert-ios-report.html',
    'cross-cert'        : 'cert-ios-cross-cert.html',
    'settings'          : 'cert-ios-settings.html',
    'log-result'        : 'cert-ios-log-result.html',
    'free-capped-home'  : 'onboarding-free-capped-home.html',
    'upgrade-sheet'     : 'onboarding-upgrade-sheet.html',
    'pro-iap'           : 'onboarding-pro-iap.html',
    'pro-welcome'       : 'onboarding-pro-welcome.html',
    'my-certs-pro'      : 'onboarding-my-certs-pro.html',
    'restore-purchase'  : 'onboarding-restore-purchase.html',
    'manage-sub'        : 'onboarding-manage-subscription.html',
    'account-deletion'  : 'onboarding-account-deletion.html',
    'error-states'      : 'onboarding-error-states.html',
    'loading-states'    : 'onboarding-loading-states.html'
  };

  // ── Canonical happy-path spine (D7: Option B) ───────────────────────────
  var HAPPY_PATH = [
    'native-welcome', 'signup-signin', 'free-cert-picker', 'free-home-day0',
    'home', 'hub', 'free-capped-home', 'upgrade-sheet', 'pro-iap',
    'pro-welcome', 'my-certs-pro'
  ];

  // ── Nav-bridge route map (Phase 2) ──────────────────────────────────────
  //  Wires each mockup's in-screen CTAs to drive the shell, WITHOUT editing
  //  the mockups. Only navigation actions are bound; in-screen toggles
  //  (.seg, .state-chip), cert selection (.cert-row), and modals are left to
  //  the mockup's own JS. Universal: .back / [data-act="back"] -> pop.
  //  Each rule: {sel, to, push?} — `to` is a SCREENS id (or 'pop'/'next').
  var NAV = {
    'native-welcome'   : [ {sel:'.btn-primary', to:'signup-signin'},
                           {sel:'.btn-link',    to:'signup-signin'} ],
    'signup-signin'    : [ {sel:'.btn-apple',   to:'free-cert-picker'},
                           {sel:'.btn-primary', to:'free-cert-picker'} ],
    'free-cert-picker' : [ {sel:'#confirmBtn',  to:'free-home-day0'},
                           {sel:'#lockBtn',     to:'free-home-day0'} ],
    'free-home-day0'   : [ {sel:'.btn-primary', to:'home'} ],
    // home dashboard: cert name -> hub (cert switcher), gear -> settings.
    // The 4-tab bar (Home/Drills/Progress/Account) is wired generically below.
    'home'             : [ {sel:'.tb-name', to:'hub'},
                           {sel:'.tb-set',  to:'settings'} ],
    // hub: tapping a locked cert opens the upsell sheet (mockup JS); the sheet's
    // "Unlock with Pro" and the "Go Pro" CTA drive the paywall arc
    // .pro-cta / tapping a locked cert opens the mockup's own upsell sheet;
    // the sheet's "Unlock with Pro" (#sheetGoPro) is the real nav to the IAP.
    'hub'              : [ {sel:'#sheetGoPro', to:'pro-iap'},
                           {sel:'#sheetClose', to:'pop'} ],
    'free-capped-home' : [ {sel:'.see',        to:'upgrade-sheet'},
                           {sel:'.btn-primary',to:'quiz'} ],
    'upgrade-sheet'    : [ {sel:'.btn-primary',to:'pro-iap'},
                           {sel:'#maybeLater', to:'pop'},
                           {text:'Restore purchase', to:'restore-purchase'} ],
    // pro-iap purchase buttons handled by the Pro-bypass block (sets demoPro);
    // here we only wire the cancel + restore paths.
    'pro-iap'          : [ {sel:'#skCancel',   to:'pop'},
                           {sel:'#restoreLink', to:'restore-purchase'} ],
    'pro-welcome'      : [ {sel:'.btn-primary',to:'my-certs-pro'} ],
    'my-certs-pro'     : [ {sel:'.btn-primary',to:'home'} ],
    // study loop: quiz advances to a session result; exam submits to exam-results
    'quiz'             : [ {sel:'.btn-primary:not([disabled])', to:'results'} ],
    'custom-quiz'      : [ {sel:'.btn-primary:not([disabled])', to:'results'} ],
    'exam'             : [ {sel:'#mSubmit',  to:'exam-results'},
                           {sel:'#endBtn',   to:'pop'},
                           {sel:'#mAbandon', to:'pop'} ],
    'results'          : [ {text:'New session',          to:'quiz'},
                           {text:'Drill my 3 mistakes',  to:'quiz'},
                           {text:'Back to menu',         to:'home'} ],
    'exam-results'     : [ {text:'Drill the gap', to:'quiz'},
                           {text:'Menu',          to:'home'} ],
    // log-result: after saving, "See it in your hub" -> hub (Passed state)
    'log-result'       : [ {sel:'#toHub', to:'hub'} ]
  };
  var BACK_SEL = '.back, .btn-back, [data-act="back"], [data-nav="back"]';

  // The dashboard tab bar (Home/Drills/Progress/Account) recurs across screens.
  // Wire it generically by label so every screen that has it navigates.
  var TABS = { 'Home':'home', 'Drills':'quiz', 'Progress':'progress', 'Account':'settings' };

  // ── Injected CSS: strip the gallery frame, render .screen full-bleed ────
  //    (D8 — the live app is the inner .screen, minus bezel + caption)
  var STRIP_CSS = [
    'html,body{margin:0!important;padding:0!important;background:transparent!important;',
      'overflow:hidden!important;width:' + CANVAS_W + 'px!important;height:' + CANVAS_H + 'px!important;max-width:none!important;}',
    '.stage{max-width:none!important;width:100%!important;margin:0!important;padding:0!important;}',
    '.stage-head{display:none!important;}',
    '.phone-wrap{display:block!important;width:100%!important;height:100%!important;max-width:none!important;margin:0!important;padding:0!important;}',
    /* force .phone to fill the canvas (overrides the gallery ~92vw max-width media
       query); strip only bezel decoration; blend the 11px gutter to the screen bg
       so the .screen still renders at its exact DESIGN size — true 1:1 */
    '.phone{box-sizing:border-box!important;width:100%!important;height:100%!important;max-width:none!important;',
      'margin:0!important;border-radius:0!important;box-shadow:none!important;background:var(--bg,#fff)!important;}',
    '.screen{box-shadow:none!important;}'
  ].join('');

  // ── App-wide theme (D: light/dark picker on every screen) ───────────────
  //  Every cert-ios-*/onboarding-* screen is data-theme aware and persists to
  //  the shared 'ca-theme' key. The shell applies the saved theme to each
  //  screen on load (so screens whose own toggle is stripped still theme
  //  correctly), exposes one persistent toggle, and listens for in-screen
  //  toggles so everything stays in sync.
  var THEME_KEY = 'ca-theme';
  function currentTheme() {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch (_) { return 'light'; }
  }
  function applyThemeToDoc(doc) {
    try { if (doc && doc.documentElement) doc.documentElement.setAttribute('data-theme', currentTheme()); } catch (_) {}
  }
  function setTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
    // re-apply to every screen currently in the stack (not just the top)
    stack.forEach(function (v) { try { applyThemeToDoc(v.iframeEl.contentDocument); } catch (_) {} });
    syncThemeHud();
  }
  function toggleTheme() { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); }
  function syncThemeHud() {
    if (!hudTheme) return;
    var dark = currentTheme() === 'dark';
    hudTheme.textContent = dark ? '☀ Light' : '☾ Dark';
    hudTheme.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  // ── Shell state ─────────────────────────────────────────────────────────
  var stackEl, scalerEl, hudCrumb, hudBack, hudPro, hudTheme;
  var stack = [];          // [{id, viewEl, iframeEl}]
  var animating = false;

  // ── Pro demo-bypass (D2) ────────────────────────────────────────────────
  //  A single, clearly-labelled demo flag. When ON it (a) flips the hub to its
  //  unlocked Pro view, and (b) lets the simulated Apple IAP "purchase"
  //  complete without real payment. One chokepoint, trivially removable.
  var DEMO_KEY = 'e2e_demo_pro';
  var demoPro = false;
  function isDemoPro() { return demoPro; }
  function setDemoPro(v) {
    demoPro = !!v;
    try { localStorage.setItem(DEMO_KEY, demoPro ? '1' : '0'); } catch (_) {}
    if (hudPro) {
      hudPro.textContent = demoPro ? '◈ Pro: ON' : '◈ Pro: off';
      hudPro.classList.toggle('on', demoPro);
    }
    // re-apply to whatever is currently on screen
    if (stack.length) {
      var top = stack[stack.length - 1];
      try { applyProState(top.iframeEl.contentDocument, top.id); } catch (_) {}
    }
  }
  // reflect Pro state inside a gated mockup (without editing the mockup file)
  function applyProState(doc, id) {
    if (!doc) return;
    if (id === 'hub') {
      var planPro = doc.querySelector('#planPro');
      var planFree = doc.querySelector('#planFree');
      if (demoPro && planPro && planFree && planFree.classList.contains('is-on')) {
        planPro.click();   // flip the hub to its unlocked Pro view (mockup JS)
      } else if (!demoPro && planFree && planPro && planPro.getAttribute('aria-pressed') === 'true') {
        planFree.click();  // back to free view
      }
    }
  }

  function fit() {
    // scale the 390x844 canvas to fit the viewport, preserving aspect.
    // translate(-50%,-50%) centres reliably regardless of scaled size.
    var vw = window.innerWidth, vh = window.innerHeight;
    var s = Math.min(vw / CANVAS_W, vh / CANVAS_H);
    scalerEl.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }

  function injectInto(iframe) {
    try {
      var doc = iframe.contentDocument;
      if (!doc) return;
      var style = doc.createElement('style');
      style.id = '__e2e_strip__';
      style.textContent = STRIP_CSS;
      (doc.head || doc.documentElement).appendChild(style);
      // apply the app-wide theme last, so it wins over the screen's own default
      applyThemeToDoc(doc);
    } catch (e) { /* cross-origin shouldn't happen (same dir) — fail soft */ }
  }

  // bind in-mockup CTAs to shell navigation (does not edit the mockup)
  function bindNav(iframe, id) {
    try {
      var doc = iframe.contentDocument;
      if (!doc) return;
      // universal: any back control pops the stack
      doc.querySelectorAll(BACK_SEL).forEach(function (el) {
        if (el.__e2e_bound) return; el.__e2e_bound = 1;
        el.addEventListener('click', function (e) { e.preventDefault(); pop(); });
      });
      // per-screen forward routes (rule.sel OR rule.text label match)
      (NAV[id] || []).forEach(function (rule) {
        var els;
        if (rule.text) {
          els = [].slice.call(doc.querySelectorAll(rule.sel || 'button, a')).filter(function (e) {
            var t = (e.textContent || '').trim();
            return t === rule.text || t.indexOf(rule.text) === 0;
          });
        } else {
          els = [].slice.call(doc.querySelectorAll(rule.sel));
        }
        els.forEach(function (el) {
          if (el.__e2e_bound) return; el.__e2e_bound = 1;
          el.addEventListener('click', function () {
            // let the mockup's own press animation start, then navigate
            setTimeout(function () {
              if (rule.to === 'pop') pop();
              else if (rule.to === 'next') nextInPath();
              else push(rule.to);
            }, 90);
          });
        });
      });
      // generic dashboard tab bar (recurs across home/progress/settings/…)
      doc.querySelectorAll('.tabbar .tab').forEach(function (tab) {
        if (tab.__e2e_bound) return; tab.__e2e_bound = 1;
        var to = TABS[(tab.textContent || '').trim()];
        if (!to || to === id) return;          // skip unknown / current tab
        tab.addEventListener('click', function () {
          setTimeout(function () { push(to); }, 90);
        });
      });
      // Pro bypass: the simulated Apple IAP "purchase" flips demoPro on and
      // advances — no real StoreKit transaction. Subscribe opens the mockup's
      // own sheet; confirming it (or the post-purchase Start) becomes Pro.
      if (id === 'pro-iap') {
        var subBtn = doc.querySelector('#subscribeBtn');
        if (subBtn && !subBtn.__e2e_bound) { subBtn.__e2e_bound = 1;
          subBtn.addEventListener('click', function () { setDemoPro(true); });
        }
        ['#skConfirm', '#startBtn'].forEach(function (sel) {
          var el = doc.querySelector(sel);
          if (el && !el.__e2e_bound) { el.__e2e_bound = 1;
            el.addEventListener('click', function () {
              setDemoPro(true);
              setTimeout(function () { push('pro-welcome'); }, 120);
            });
          }
        });
      }
      // reflect current Pro state into this screen (e.g. unlock the hub)
      applyProState(doc, id);
    } catch (e) { /* fail soft */ }
  }

  function makeView(id) {
    var file = SCREENS[id];
    if (!file) { console.warn('[shell] unknown screen:', id); return null; }
    var view = document.createElement('div');
    view.className = 'e2e-view';
    var iframe = document.createElement('iframe');
    iframe.className = 'e2e-frame';
    iframe.setAttribute('title', id);
    iframe.addEventListener('load', function () { injectInto(iframe); bindNav(iframe, id); });
    iframe.src = file;
    view.appendChild(iframe);
    scalerEl.appendChild(view);
    return { id: id, viewEl: view, iframeEl: iframe };
  }

  function updateHud() {
    if (hudCrumb) hudCrumb.textContent = stack.map(function (v) { return v.id; }).join('  ›  ') || '—';
    if (hudBack) hudBack.disabled = stack.length <= 1;
  }

  // ── Navigation ──────────────────────────────────────────────────────────
  function push(id) {
    if (animating) return;
    var next = makeView(id);
    if (!next) return;
    var prev = stack[stack.length - 1];
    stack.push(next);
    // start offscreen-right, then slide in; prev slides slightly left + dims
    next.viewEl.classList.add('enter-right');
    // force reflow so the transition runs
    void next.viewEl.offsetWidth;
    animating = true;
    requestAnimationFrame(function () {
      next.viewEl.classList.remove('enter-right');
      if (prev) prev.viewEl.classList.add('behind');
    });
    setTimeout(function () { animating = false; updateHud(); }, 420);
    updateHud();
  }

  function pop() {
    if (animating || stack.length <= 1) return;
    var top = stack.pop();
    var prev = stack[stack.length - 1];
    animating = true;
    if (prev) prev.viewEl.classList.remove('behind');
    top.viewEl.classList.add('enter-right'); // slide back out to the right
    setTimeout(function () {
      if (top.viewEl.parentNode) top.viewEl.parentNode.removeChild(top.viewEl);
      animating = false;
      updateHud();
    }, 420);
    updateHud();
  }

  function resetTo(id) {
    while (stack.length) {
      var v = stack.pop();
      if (v.viewEl.parentNode) v.viewEl.parentNode.removeChild(v.viewEl);
    }
    push(id);
  }

  function nextInPath() {
    var cur = stack.length ? stack[stack.length - 1].id : null;
    var i = HAPPY_PATH.indexOf(cur);
    if (i >= 0 && i < HAPPY_PATH.length - 1) push(HAPPY_PATH[i + 1]);
  }

  // ── Dev HUD wiring (floating, unobtrusive — not part of the app) ────────
  function wireHud() {
    hudCrumb = document.getElementById('hud-crumb');
    hudBack = document.getElementById('hud-back');
    document.getElementById('hud-next').addEventListener('click', nextInPath);
    hudBack.addEventListener('click', pop);
    document.getElementById('hud-toggle').addEventListener('click', function () {
      document.body.classList.toggle('hud-collapsed');
    });
    hudPro = document.getElementById('hud-pro');
    if (hudPro) hudPro.addEventListener('click', function () { setDemoPro(!demoPro); });
    hudTheme = document.getElementById('hud-theme');
    if (hudTheme) hudTheme.addEventListener('click', toggleTheme);
    syncThemeHud();
    var sel = document.getElementById('hud-jump');
    Object.keys(SCREENS).forEach(function (id) {
      var o = document.createElement('option'); o.value = id; o.textContent = id; sel.appendChild(o);
    });
    sel.addEventListener('change', function () { if (sel.value) resetTo(sel.value); });
  }

  // ── Boot ────────────────────────────────────────────────────────────────
  function boot() {
    stackEl = document.getElementById('e2e-stack');
    scalerEl = document.getElementById('e2e-scaler');
    scalerEl.style.width = CANVAS_W + 'px';
    scalerEl.style.height = CANVAS_H + 'px';
    wireHud();
    fit();
    window.addEventListener('resize', fit);
    // when a screen's own in-screen toggle changes the theme, keep the shell +
    // all other stacked screens in sync (storage events fire across same-origin frames)
    window.addEventListener('storage', function (e) {
      if (e && e.key === THEME_KEY) {
        stack.forEach(function (v) { try { applyThemeToDoc(v.iframeEl.contentDocument); } catch (_) {} });
        syncThemeHud();
      }
    });
    // restore Pro demo state (?pro=1 wins, else persisted flag)
    var qpPro = /[?&]pro=1\b/.test(location.search);
    var saved = false;
    try { saved = localStorage.getItem(DEMO_KEY) === '1'; } catch (_) {}
    setDemoPro(qpPro || saved);
    // start at the happy-path entry (or #screen)
    var start = (location.hash || '').replace('#', '') || HAPPY_PATH[0];
    if (!SCREENS[start]) start = HAPPY_PATH[0];
    push(start);
  }

  // expose for console / bypass control
  window.E2E = { push: push, pop: pop, resetTo: resetTo, next: nextInPath,
                 setPro: setDemoPro, isPro: isDemoPro, SCREENS: SCREENS };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
