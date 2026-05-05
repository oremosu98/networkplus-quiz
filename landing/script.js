// ══════════════════════════════════════════════════════════════════════════
// CertAnvil landing page — light/dark theme + builder mode + cert routing
// ══════════════════════════════════════════════════════════════════════════
// Theme toggle persists to localStorage 'certanvil_theme'.
// Builder mode revealed by localStorage 'certanvil_builder_mode' === 'true'.
// Cert tile click routes to that cert's deploy. Coming-soon tiles open
// notify modal (email captured locally for now).

(function() {
  'use strict';

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
    if (isBuilder) {
      const secplusTile = document.getElementById('cert-tile-secplus');
      if (secplusTile) secplusTile.removeAttribute('hidden');
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
      notifyFoot.textContent = 'Stored locally for now — full email integration ships when the first cert beyond Network+ launches.';
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

  // Submit handler for notify form
  if (notifyForm) {
    notifyForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = notifyEmail ? notifyEmail.value.trim() : '';
      if (!email || !email.includes('@')) return;
      const certLabel = notifyCertName ? notifyCertName.textContent : 'cert';
      // Persist locally for now — full email integration deferred.
      try {
        const key = 'certanvil_notify_signups';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ email: email, cert: certLabel, at: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (e) {}
      // Confirmation UX
      if (notifyFoot) {
        notifyFoot.textContent = '✓ Got it — saved. We\'ll email you the moment ' + certLabel + ' goes live.';
        notifyFoot.style.color = 'var(--green)';
      }
      setTimeout(closeNotifyModal, 1800);
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

})();
