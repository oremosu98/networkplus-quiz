// ══════════════════════════════════════════════════════════════════════════
// CertAnvil — Account mobile-lift enhancer (cert-ios-hub greeting + stats)
// Additive only: waits for lib/account.js to populate #account-content, then
// injects the hub greeting + stat strip above the identity card. Gated to the
// same <900px viewport as lift-account.css (LIFT_MQ pattern from the cert-app
// lift, v7.36.1). Desktop ≥900px never sees these nodes. No account.js
// contract is read or written — everything is derived from the rendered DOM.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var LIFT_MQ = window.matchMedia('(max-width: 899px)');

  function greetingWord() {
    var h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 18) return 'Afternoon';
    return 'Evening';
  }

  function buildStrip() {
    var content = document.getElementById('account-content');
    if (!content || content.hasAttribute('hidden')) return false;
    if (document.getElementById('lift-hub-strip')) return true;

    var idCard = content.querySelector('.id-card');
    if (!idCard) return false;

    var entRows = content.querySelectorAll('#ent-list .ent-row');
    if (!entRows.length) return false; // account.js hasn't rendered yet

    var total = entRows.length;
    var unlocked = content.querySelectorAll('#ent-list .ent-row:not(.is-locked)').length;
    var passed = content.querySelectorAll('#ent-list .ent-status-pill.is-passed').length;

    var nameEl = document.getElementById('profile-display-name');
    var name = nameEl && nameEl.textContent && nameEl.textContent !== '…'
      ? nameEl.textContent.trim() : '';

    var wrap = document.createElement('div');
    wrap.id = 'lift-hub-strip';

    var p = document.createElement('p');
    p.className = 'lift-greeting';
    p.appendChild(document.createTextNode(greetingWord() + (name ? ', ' : '.')));
    if (name) {
      var b = document.createElement('b');
      b.textContent = name;
      p.appendChild(b);
      p.appendChild(document.createTextNode('.'));
    }
    wrap.appendChild(p);

    var stats = document.createElement('div');
    stats.className = 'lift-stats';
    var defs = [
      { v: String(unlocked), l: unlocked === 1 ? 'Cert unlocked' : 'Certs unlocked' },
      { v: String(passed), l: 'Passed', cls: passed > 0 ? 'pass' : '' },
      { v: String(total), l: 'In the library' }
    ];
    defs.forEach(function (d) {
      var s = document.createElement('div');
      s.className = 'lift-stat' + (d.cls ? ' ' + d.cls : '');
      var bb = document.createElement('b');
      bb.textContent = d.v;
      var sp = document.createElement('span');
      sp.textContent = d.l;
      s.appendChild(bb);
      s.appendChild(sp);
      stats.appendChild(s);
    });
    wrap.appendChild(stats);

    content.insertBefore(wrap, content.firstChild);
    return true;
  }

  function removeStrip() {
    var el = document.getElementById('lift-hub-strip');
    if (el) el.remove();
  }

  function sync() {
    if (LIFT_MQ.matches) buildStrip();
    else removeStrip();
  }

  // account.js populates asynchronously (auth check + profile fetch) —
  // observe until the content is rendered, then stop.
  function start() {
    if (sync(), document.getElementById('lift-hub-strip')) return;
    var content = document.getElementById('account-content');
    if (!content || !('MutationObserver' in window)) return;
    var mo = new MutationObserver(function () {
      if (!LIFT_MQ.matches) return;
      if (buildStrip()) mo.disconnect();
    });
    mo.observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  if (LIFT_MQ.addEventListener) LIFT_MQ.addEventListener('change', sync);
  else if (LIFT_MQ.addListener) LIFT_MQ.addListener(sync);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

// ══════════════════════════════════════════════════════════════════════════
// Phase 2 — Go Pro card + locked-cert upsell sheet (cert-ios-hub grammar).
// Mobile (<900px) free-tier users only. Additive: nothing here touches the
// account.js contract; the locked rows' own buttons stay disabled. The Go Pro
// CTA is disabled with the same "coming soon" semantics as #btn-upgrade —
// purchase wiring lands with Stripe (Phase G). The sheet CTA routes to the
// Go Pro card (scroll + flash), mirroring the mockup's Stripe-less behavior.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var LIFT_MQ = window.matchMedia('(max-width: 899px)');

  function isFreeTier() {
    var label = document.getElementById('id-tier-label');
    return !!(label && /free/i.test(label.textContent || ''));
  }

  function page() { return document.getElementById('account-page'); }

  function buildProCard() {
    if (document.getElementById('lift-pro-card')) return true;
    var section = document.getElementById('section-subscription');
    if (!section || !isFreeTier()) return false;

    var card = document.createElement('div');
    card.className = 'lift-pro';
    card.id = 'lift-pro-card';
    card.innerHTML =
      '<p class="lift-pro-eyebrow">On Free, you study one cert</p>'
      + '<h2 class="lift-pro-title">Study every cert with Pro</h2>'
      + '<p class="lift-pro-body">Every cert unlocked, no daily question cap, and analytics across all of them. Your progress comes with you.</p>'
      + '<div class="lift-price-row">'
      +   '<div class="lift-price best"><span class="save">Save 26%</span><div class="plan">Annual</div><div class="amt">$89<small>/yr</small></div><div class="sub">About $7.42 a month</div></div>'
      +   '<div class="lift-price"><div class="plan">Monthly</div><div class="amt">$9.99<small>/mo</small></div><div class="sub">Billed monthly</div></div>'
      + '</div>'
      + '<button class="lift-pro-cta" type="button" disabled title="Upgrade coming soon">Go Pro</button>'
      + '<span class="lift-pro-reassure">Cancel anytime. Launching soon.</span>';
    section.insertAdjacentElement('afterend', card);
    return true;
  }

  function buildSheet() {
    if (document.getElementById('lift-sheet')) return;
    var host = page();
    if (!host) return;

    var scrim = document.createElement('div');
    scrim.className = 'lift-scrim';
    scrim.id = 'lift-scrim';

    var sheet = document.createElement('aside');
    sheet.className = 'lift-sheet';
    sheet.id = 'lift-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'lift-sheet-title');
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML =
      '<div class="lift-sheet-grab"></div>'
      + '<span class="lift-sheet-lock" aria-hidden="true">🔒</span>'
      + '<h2 id="lift-sheet-title">This is a Pro exam</h2>'
      + '<p id="lift-sheet-body">Pro unlocks every exam in the library — and your current progress stays exactly where it is. From $7.42 a month.</p>'
      + '<button class="lift-sheet-cta" id="lift-sheet-cta" type="button">See Pro plans</button>'
      + '<button class="lift-sheet-dismiss" id="lift-sheet-close" type="button">Not now</button>';

    host.appendChild(scrim);
    host.appendChild(sheet);

    function close() {
      scrim.classList.remove('open');
      sheet.classList.remove('open');
      sheet.setAttribute('aria-hidden', 'true');
    }
    scrim.addEventListener('click', close);
    document.getElementById('lift-sheet-close').addEventListener('click', close);
    document.getElementById('lift-sheet-cta').addEventListener('click', function () {
      close();
      var pro = document.getElementById('lift-pro-card');
      if (pro) {
        pro.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pro.classList.remove('flash');
        void pro.offsetWidth;
        pro.classList.add('flash');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('open')) close();
    });
  }

  function openSheet(certName) {
    var sheet = document.getElementById('lift-sheet');
    var scrim = document.getElementById('lift-scrim');
    if (!sheet || !scrim) return;
    var title = document.getElementById('lift-sheet-title');
    if (title) title.textContent = (certName || 'This') + ' is a Pro exam';
    scrim.classList.add('open');
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
  }

  function wireLockedRows() {
    var list = document.getElementById('ent-list');
    if (!list || list.hasAttribute('data-lift-upsell')) return;
    list.setAttribute('data-lift-upsell', '1');
    list.addEventListener('click', function (e) {
      if (!LIFT_MQ.matches || !isFreeTier()) return;
      var row = e.target.closest('.ent-row.is-locked');
      if (!row) return;
      var name = row.querySelector('.ent-name');
      openSheet(name ? name.textContent.trim() : '');
    });
  }

  function teardown() {
    ['lift-pro-card', 'lift-sheet', 'lift-scrim'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function sync() {
    if (LIFT_MQ.matches) {
      if (buildProCard()) { buildSheet(); wireLockedRows(); }
    } else {
      teardown();
    }
  }

  function start() {
    sync();
    if (document.getElementById('lift-pro-card')) return;
    var content = document.getElementById('account-content');
    if (!content || !('MutationObserver' in window)) return;
    var mo = new MutationObserver(function () {
      if (!LIFT_MQ.matches) return;
      if (buildProCard()) { buildSheet(); wireLockedRows(); mo.disconnect(); }
    });
    mo.observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  if (LIFT_MQ.addEventListener) LIFT_MQ.addEventListener('change', sync);
  else if (LIFT_MQ.addListener) LIFT_MQ.addListener(sync);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
