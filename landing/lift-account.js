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
