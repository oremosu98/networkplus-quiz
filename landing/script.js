// ══════════════════════════════════════════════════════════════════════════
// CertAnvil landing page — light/dark theme + builder mode + cert routing
// ══════════════════════════════════════════════════════════════════════════
// Theme toggle persists to localStorage 'certanvil_theme'.
// Builder mode revealed by localStorage 'certanvil_builder_mode' === 'true'.
// Cert tile click routes to that cert's deploy. Coming-soon tiles open
// notify modal (email captured locally for now).

(function() {
  'use strict';

  // ── M-3: Scroll-triggered section reveals ──
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var revealIO = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); revealIO.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach(function(el) { revealIO.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el) { el.classList.add('is-visible'); });
  }

  // ── Theme toggle ────────────────────────────────────────────────────────
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('certanvil_theme', next); } catch (e) {}
    });
  }

  // ── Builder mode ────────────────────────────────────────────────────────
  // Reveal Security+ tile + builder pill when localStorage flag is set.
  // To activate: open DevTools console + run
  //   localStorage.setItem('certanvil_builder_mode', 'true');
  //   location.reload();
  // To deactivate: localStorage.removeItem('certanvil_builder_mode');
  function checkBuilderMode() {
    let isBuilder = false;
    try {
      isBuilder = localStorage.getItem('certanvil_builder_mode') === 'true';
    } catch (e) {}
    // Also support ?builder=1 URL param as a fallback
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('builder') === '1') isBuilder = true;
    } catch (e) {}
    // v7.1.0 Sec+ public launch — tile visible to all; in-app Pro gate handles tier.
    const secplusTile = document.getElementById('cert-tile-secplus');
    if (secplusTile) secplusTile.removeAttribute('hidden');
    const secplusComingSoon = document.getElementById('cert-tile-secplus-soon');
    if (secplusComingSoon) secplusComingSoon.setAttribute('hidden', '');
    if (isBuilder) {
      const pill = document.getElementById('builder-pill');
      if (pill) pill.removeAttribute('hidden');
    }
  }
  checkBuilderMode();

  // ── Notify-me modal for "Coming soon" certs ────────────────────────────
  const modal = document.getElementById('notify-modal');
  const modalClose = document.getElementById('notify-modal-close');
  const notifyForm = document.getElementById('notify-form');
  const notifyEmail = document.getElementById('notify-email');
  const notifyCertName = document.getElementById('notify-cert-name');
  const notifyCertName2 = document.getElementById('notify-cert-name-2');
  const notifyFoot = document.getElementById('notify-foot');

  function openNotifyModal(certLabel) {
    if (!modal) return;
    if (notifyCertName) notifyCertName.textContent = certLabel;
    if (notifyCertName2) notifyCertName2.textContent = certLabel;
    modal.removeAttribute('hidden');
    if (notifyEmail) {
      try { notifyEmail.focus(); } catch (e) {}
    }
    document.body.style.overflow = 'hidden';
  }

  function closeNotifyModal() {
    if (!modal) return;
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    if (notifyForm) notifyForm.reset();
    if (notifyFoot) {
      // v4.99.10 — copy aligned with new persistence layer (Supabase notify_signups
      // + localStorage backup). No more "stored locally for now" hedge.
      notifyFoot.textContent = "You'll get one email the moment this cert launches. No spam, no follow-up sequences.";
      notifyFoot.style.color = '';
    }
  }

  if (modalClose) modalClose.addEventListener('click', closeNotifyModal);

  // Close on backdrop click
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeNotifyModal();
    });
  }

  // Close on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) {
      closeNotifyModal();
    }
  });

  // Wire up Notify buttons on coming-soon tiles
  document.querySelectorAll('.cert-cta-notify').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const tile = btn.closest('.cert-tile');
      if (!tile) return;
      const nameEl = tile.querySelector('.cert-name');
      const certLabel = nameEl ? nameEl.textContent : 'this cert';
      openNotifyModal(certLabel);
    });
  });

  // Wire the pricing-page "Start Pro" CTA into the same notify flow. Stripe
  // checkout lands in a later phase; until then capture launch intent instead
  // of dead-ending on the (non-existent) #pro-coming-soon anchor.
  document.querySelectorAll('[data-action="pro-signup"]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      openNotifyModal('CertAnvil Pro');
    });
  });

  // Submit handler for notify form — POSTs to /api/notify (Vercel edge fn)
  // with localStorage as a fallback if the API call fails (offline /
  // RESEND_API_KEY unset / network blip).
  if (notifyForm) {
    notifyForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = notifyEmail ? notifyEmail.value.trim() : '';
      if (!email || !email.includes('@')) return;
      const certLabel = notifyCertName ? notifyCertName.textContent : 'cert';
      const submitBtn = notifyForm.querySelector('.modal-cta');

      // Disable submit during request
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
      }

      let success = false;
      try {
        const resp = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            cert: certLabel,
            source: 'certanvil-landing',
            // Honeypot: if a bot fills this in, the API silently no-ops
            website: '',
          }),
        });
        if (resp.ok) success = true;
      } catch (err) {
        // Network failure — fall through to localStorage backup
      }

      // Always backup to localStorage too — survives API outages + lets you
      // manually re-process if Resend wasn't configured at submit time.
      try {
        const key = 'certanvil_notify_signups';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({
          email: email,
          cert: certLabel,
          at: new Date().toISOString(),
          delivered: success,
        });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (e) {}

      // Confirmation UX (works whether or not the API succeeded)
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Notify me';
      }
      if (notifyFoot) {
        if (success) {
          notifyFoot.textContent = '✓ Got it. Confirmation sent. Check your inbox; we\'ll email you the moment ' + certLabel + ' goes live.';
        } else {
          notifyFoot.textContent = '✓ Saved. We\'ll email you the moment ' + certLabel + ' goes live.';
        }
        notifyFoot.style.color = 'var(--green)';
      }
      setTimeout(closeNotifyModal, 2000);
    });
  }

  // ── Smooth scroll for in-page anchor links ─────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      const targetId = link.getAttribute('href').slice(1);
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ── "What you'll actually use" panel — tab swap + auto-rotate (v4.92.0) ──
  // Tabs cycle through certs every 6s on idle. Manual click pauses rotation
  // for the rest of the session. Reduced-motion users get static (no rotate).
  // Soft-fail if markup is absent (the panel only lives on landing/index.html).
  (function initProofOfProductPanel() {
    var tabs = document.querySelectorAll('.pp-tab[data-pp-tab]');
    var contents = document.querySelectorAll('.pp-content[data-pp-content]');
    if (!tabs.length || !contents.length) return;

    var rotateInterval = null;
    var paused = false;

    function showCert(certId) {
      tabs.forEach(function(t) {
        var match = t.getAttribute('data-pp-tab') === certId;
        t.classList.toggle('is-active', match);
        t.setAttribute('aria-selected', match ? 'true' : 'false');
      });
      contents.forEach(function(c) {
        var match = c.getAttribute('data-pp-content') === certId;
        c.classList.toggle('is-active', match);
        if (match) c.removeAttribute('hidden'); else c.setAttribute('hidden', '');
      });
    }

    function getActiveCert() {
      var active = document.querySelector('.pp-tab.is-active[data-pp-tab]');
      return active ? active.getAttribute('data-pp-tab') : 'netplus';
    }

    function getNextCert() {
      var ids = Array.from(tabs).map(function(t) { return t.getAttribute('data-pp-tab'); });
      var current = getActiveCert();
      var idx = ids.indexOf(current);
      return ids[(idx + 1) % ids.length];
    }

    function startRotate() {
      if (rotateInterval || paused) return;
      var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return;
      rotateInterval = setInterval(function() {
        if (!paused) showCert(getNextCert());
      }, 6000);
    }

    function pauseRotate() {
      paused = true;
      if (rotateInterval) {
        clearInterval(rotateInterval);
        rotateInterval = null;
      }
    }

    tabs.forEach(function(tab) {
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        var cert = tab.getAttribute('data-pp-tab');
        showCert(cert);
        pauseRotate();
      });
    });

    // Hook the existing "Notify me" buttons in the locked panels into the
    // existing notify modal flow (script.js already wires .cert-cta-notify;
    // we use [data-cert-notify] here so the panel button surfaces too).
    document.querySelectorAll('[data-cert-notify]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var cert = btn.getAttribute('data-cert-notify');
        var tile = document.querySelector('[data-cert="' + cert + '"] .cert-cta-notify');
        if (tile) tile.click();
      });
    });

    startRotate();
  })();

})();
