// ══════════════════════════════════════════════════════════════════════════
// CertAnvil cert app — one-time builder import (Phase C′)
// ══════════════════════════════════════════════════════════════════════════
// Bridges the localStorage-only world (pre-Phase-C′) with the cloud-canonical
// world (post-Phase-C′). Runs once per user, on first sign-in only.
//
// Trigger:
//   auth-state.js fires `window.maybeRunBuilderMigration(profile)` after a
//   successful SIGNED_IN + cloudStore.hydrate() cycle.
//
// Detection:
//   profiles.metadata.migration_v1_at is absent  →  user hasn't migrated yet
//   localStorage has nplus_history rows          →  there's data to import
//
// User flow:
//   1. Banner mounts at top of page with stats summary + 2 actions.
//   2. "Yes, import" → cloudStore.migrateLocalToCloud() → write
//      migration_v1_at timestamp into profiles.metadata → toast + banner hides.
//   3. "Start fresh" → write migration_v1_at + skipped flag → banner hides.
//
// Idempotency:
//   - Once migration_v1_at is set (either path), banner never re-renders.
//   - If localStorage is empty (fresh install with cloud data already), we
//     silently mark migration_v1_at so the user isn't bothered.
//   - Banner mount point is reused if it already exists (won't double-render).
//
// Safety:
//   - We READ from localStorage but never mutate it during migration.
//     cloud-store handles the actual writes via its existing flush queue.
//   - migration_v1_at is the canary: we set it ONLY after migrateLocalToCloud
//     resolves successfully. If the cloud write fails the user can retry on
//     next sign-in.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  var BANNER_ID = 'builder-migration-banner';

  function getSupabase() { return window.certanvilSupabase || null; }
  function getCloudStore() { return window.cloudStore || null; }

  // ── Public entry point (called from auth-state.js) ──────────────────────
  window.maybeRunBuilderMigration = function (profile) {
    // Wait for DOM if needed
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        window.maybeRunBuilderMigration(profile);
      });
      return;
    }

    var sb = getSupabase();
    if (!sb) return;

    var sess = (sb.auth && sb.auth._currentSession) || null;
    var userId = sess && sess.user && sess.user.id;
    if (!userId) return;

    // Auth-state.js only selected (role, display_name, email) — fetch metadata now.
    sb.from('profiles').select('metadata').eq('id', userId).single().then(function (r) {
      if (r.error) {
        console.warn('[migration] could not read profile metadata', r.error);
        return;
      }
      var meta = (r.data && r.data.metadata) || {};

      // Already migrated (or skipped) — never show banner again.
      if (meta.migration_v1_at) return;

      var stats = readLocalStats();

      // Nothing to import — silently set the flag so the check stops happening.
      if (stats.historyLen === 0 && stats.wrongLen === 0 && stats.srLen === 0) {
        writeMigrationFlag(userId, meta, { skipped: true, reason: 'no-local-data' });
        return;
      }

      renderMigrationBanner(stats, userId, meta);
    }).catch(function (err) {
      console.warn('[migration] metadata fetch threw', err);
    });
  };

  // ── Local stats reader ──────────────────────────────────────────────────
  function readLocalStats() {
    function safeJson(key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (e) { return fallback; }
    }

    var history = safeJson('nplus_history', []);
    if (!Array.isArray(history)) history = [];

    var streak = safeJson('nplus_streak', null) || {};
    var wrong = safeJson('nplus_wrong_bank', []);
    if (!Array.isArray(wrong)) wrong = [];
    var sr = safeJson('nplus_sr_queue', []);
    if (!Array.isArray(sr)) sr = [];
    var milestones = safeJson('nplus_milestones', {});
    var milestoneCount = milestones && typeof milestones === 'object' ? Object.keys(milestones).length : 0;

    // Total questions across history
    var totalQuestions = 0;
    history.forEach(function (h) {
      if (h && typeof h.total === 'number') totalQuestions += h.total;
    });

    // Date span: oldest entry → newest
    var oldestAt = null;
    history.forEach(function (h) {
      var t = h && h.at;
      if (typeof t === 'number' && (oldestAt === null || t < oldestAt)) oldestAt = t;
    });
    var dayspan = oldestAt ? Math.max(1, Math.round((Date.now() - oldestAt) / 86400000)) : 0;

    return {
      historyLen: history.length,
      totalQuestions: totalQuestions,
      streakCurrent: (streak && typeof streak.current === 'number') ? streak.current : 0,
      streakBest:    (streak && typeof streak.best === 'number') ? streak.best : 0,
      wrongLen: wrong.length,
      srLen: sr.length,
      milestoneCount: milestoneCount,
      dayspan: dayspan,
    };
  }

  // ── Banner UI ───────────────────────────────────────────────────────────
  function renderMigrationBanner(stats, userId, currentMeta) {
    // Reuse existing mount point if present (idempotent re-render)
    var existing = document.getElementById(BANNER_ID);
    if (existing) existing.parentNode.removeChild(existing);

    ensureBannerStyles();

    var banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'builder-migration-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Import existing study data');

    var statBits = [];
    if (stats.historyLen > 0) statBits.push(stats.historyLen + ' session' + (stats.historyLen === 1 ? '' : 's'));
    if (stats.totalQuestions > 0) statBits.push(stats.totalQuestions.toLocaleString() + ' questions');
    if (stats.streakBest > 0) statBits.push('best streak ' + stats.streakBest + 'd');
    if (stats.wrongLen > 0) statBits.push(stats.wrongLen + ' wrong-bank cards');
    if (stats.srLen > 0) statBits.push(stats.srLen + ' SR cards');
    if (stats.milestoneCount > 0) statBits.push(stats.milestoneCount + ' milestones');

    var statsLine = statBits.join(' · ');
    var subline = stats.dayspan > 0
      ? 'Spanning the last ' + stats.dayspan + ' day' + (stats.dayspan === 1 ? '' : 's') + ' of practice on this device.'
      : 'Existing local data on this device.';

    banner.innerHTML =
      '<div class="bmb-icon" aria-hidden="true">📥</div>' +
      '<div class="bmb-body">' +
        '<div class="bmb-headline">Import your existing study data?</div>' +
        '<div class="bmb-stats">' + escapeHtml(statsLine) + '</div>' +
        '<div class="bmb-sub">' + escapeHtml(subline) + ' Once imported, your progress lives in the cloud and syncs across devices.</div>' +
      '</div>' +
      '<div class="bmb-actions">' +
        '<button type="button" class="bmb-btn bmb-btn-primary" data-act="import">Yes, import</button>' +
        '<button type="button" class="bmb-btn bmb-btn-secondary" data-act="skip">Start fresh</button>' +
      '</div>';

    // Mount at very top of body so it's above the topbar — prominent but dismissable
    if (document.body.firstChild) {
      document.body.insertBefore(banner, document.body.firstChild);
    } else {
      document.body.appendChild(banner);
    }

    // Wire actions
    banner.querySelector('[data-act="import"]').addEventListener('click', function () {
      runImport(banner, userId, currentMeta);
    });
    banner.querySelector('[data-act="skip"]').addEventListener('click', function () {
      runSkip(banner, userId, currentMeta);
    });
  }

  function ensureBannerStyles() {
    if (document.getElementById('builder-migration-banner-styles')) return;
    var style = document.createElement('style');
    style.id = 'builder-migration-banner-styles';
    style.textContent = [
      '.builder-migration-banner {',
      '  position: relative; z-index: 1000;',
      '  display: flex; align-items: center; gap: 16px;',
      '  padding: 14px 18px;',
      '  background: linear-gradient(135deg, rgba(124,111,247,0.16), rgba(56,189,248,0.10));',
      '  border-bottom: 1px solid rgba(124,111,247,0.36);',
      '  color: var(--text, #e9e7ff);',
      '  font-family: inherit;',
      '}',
      '.builder-migration-banner .bmb-icon { font-size: 26px; flex: 0 0 auto; }',
      '.builder-migration-banner .bmb-body { flex: 1 1 auto; min-width: 0; }',
      '.builder-migration-banner .bmb-headline { font-weight: 700; font-size: 15px; margin-bottom: 2px; }',
      '.builder-migration-banner .bmb-stats { font-size: 13px; opacity: 0.92; font-weight: 600; }',
      '.builder-migration-banner .bmb-sub { font-size: 12px; opacity: 0.72; margin-top: 2px; line-height: 1.4; }',
      '.builder-migration-banner .bmb-actions { display: flex; gap: 8px; flex: 0 0 auto; }',
      '.builder-migration-banner .bmb-btn {',
      '  padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;',
      '  border: 1px solid transparent; cursor: pointer; transition: filter .15s ease, transform .1s ease;',
      '  font-family: inherit;',
      '}',
      '.builder-migration-banner .bmb-btn:hover { filter: brightness(1.1); }',
      '.builder-migration-banner .bmb-btn:active { transform: scale(0.97); }',
      '.builder-migration-banner .bmb-btn:disabled { opacity: 0.55; cursor: wait; }',
      '.builder-migration-banner .bmb-btn-primary { background: var(--accent, #7c6ff7); color: white; }',
      '.builder-migration-banner .bmb-btn-secondary {',
      '  background: transparent; color: var(--text, #e9e7ff);',
      '  border-color: rgba(255,255,255,0.22);',
      '}',
      '@media (max-width: 640px) {',
      '  .builder-migration-banner { flex-direction: column; align-items: stretch; gap: 12px; padding: 12px 14px; }',
      '  .builder-migration-banner .bmb-actions { justify-content: flex-end; }',
      '}',
      '@media (prefers-reduced-motion: reduce) {',
      '  .builder-migration-banner .bmb-btn { transition: none; }',
      '  .builder-migration-banner .bmb-btn:active { transform: none; }',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Actions ─────────────────────────────────────────────────────────────
  function runImport(banner, userId, currentMeta) {
    var primary = banner.querySelector('[data-act="import"]');
    var secondary = banner.querySelector('[data-act="skip"]');
    if (primary) { primary.disabled = true; primary.textContent = 'Importing…'; }
    if (secondary) { secondary.disabled = true; }

    var cs = getCloudStore();
    if (!cs) {
      console.error('[migration] cloud-store not loaded — aborting import');
      restoreButtons(banner, 'Couldn\'t reach the cloud. Try again in a moment.');
      return;
    }

    cs.migrateLocalToCloud()
      .then(function (counts) {
        // Record success in profiles.metadata so the banner never reappears
        return writeMigrationFlag(userId, currentMeta, {
          imported_at: new Date().toISOString(),
          metadata_keys_flushed: counts.metadataKeysFlushed,
          history_rows_flushed: counts.historyRowsFlushed,
        }).then(function () { return counts; });
      })
      .then(function (counts) {
        if (primary) primary.textContent = '✓ Imported · ' + counts.historyRowsFlushed + ' sessions';
        // Hide after a short celebration window
        setTimeout(function () { dismissBanner(banner); }, 1800);
      })
      .catch(function (err) {
        console.error('[migration] import failed', err);
        restoreButtons(banner, 'Import failed — please try again. If this keeps happening, your data is still safe locally.');
      });
  }

  function runSkip(banner, userId, currentMeta) {
    var primary = banner.querySelector('[data-act="import"]');
    var secondary = banner.querySelector('[data-act="skip"]');
    if (primary) primary.disabled = true;
    if (secondary) { secondary.disabled = true; secondary.textContent = 'Saving…'; }

    writeMigrationFlag(userId, currentMeta, { skipped: true, skipped_at: new Date().toISOString() })
      .then(function () { dismissBanner(banner); })
      .catch(function (err) {
        console.error('[migration] skip flag write failed', err);
        // Hide anyway so the user isn't stuck — they can re-import next session
        dismissBanner(banner);
      });
  }

  function restoreButtons(banner, errMsg) {
    var primary = banner.querySelector('[data-act="import"]');
    var secondary = banner.querySelector('[data-act="skip"]');
    if (primary) { primary.disabled = false; primary.textContent = 'Yes, import'; }
    if (secondary) { secondary.disabled = false; secondary.textContent = 'Start fresh'; }
    if (errMsg) {
      var sub = banner.querySelector('.bmb-sub');
      if (sub) sub.textContent = errMsg;
    }
  }

  function dismissBanner(banner) {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
  }

  // ── Profile metadata writer ─────────────────────────────────────────────
  function writeMigrationFlag(userId, currentMeta, extra) {
    var sb = getSupabase();
    if (!sb) return Promise.reject(new Error('Supabase not ready'));
    var nextMeta = Object.assign({}, currentMeta || {}, {
      migration_v1_at: new Date().toISOString(),
    });
    if (extra && typeof extra === 'object') {
      nextMeta.migration_v1 = Object.assign({}, currentMeta && currentMeta.migration_v1 || {}, extra);
    }
    return sb.from('profiles').update({ metadata: nextMeta }).eq('id', userId).then(function (r) {
      if (r.error) throw r.error;
      return r;
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
})();
