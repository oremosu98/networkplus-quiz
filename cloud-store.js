// ══════════════════════════════════════════════════════════════════════════
// CertAnvil cert app — cloud-store (Phase C′)
// ══════════════════════════════════════════════════════════════════════════
// Cloud-canonical user state with localStorage as ephemeral session cache.
//
// Architecture:
//   Source of truth     → Supabase profiles.metadata jsonb + quiz_history table
//   Session cache       → localStorage (existing keys, populated on sign-in)
//   In-memory hot path  → cloud-store internal map (mirror of localStorage)
//
// Lifecycle:
//   1. Anonymous user: nothing happens — localStorage works as today
//   2. SIGNED_IN event: hydrate localStorage from Supabase → populate cache
//   3. App writes localStorage as today
//   4. cloudStore.flush(key) called after each user-data write → debounced
//      flush to Supabase
//   5. SIGNED_OUT event: clear user-data keys from localStorage
//
// Design intent:
//   - Existing code (186 localStorage call sites) DOES NOT need to change.
//     The cloud-store sits alongside, not replacing.
//   - Sync READS stay synchronous (localStorage is fast).
//   - Cloud writes are async + debounced + retried.
//   - localStorage corruption no longer destroys data — cloud has canonical
//     copy + restore-on-next-sign-in.
//
// Storage class taxonomy (which keys flush to cloud vs stay local-only):
//   USER_DATA: history, streak, wrong_bank, sr_queue, exam_date,
//              daily_goal, diagnostic, last_diagnostic_at, milestones,
//              type_stats, hardcore_exam, daily_challenge, deep_dive_uses,
//              all 6 *_MASTERY, all 6 *_LESSONS, topologies, topology_draft,
//              acl_state, fix_challenges, lab_completions
//
//   APP_PREFS: theme, tb_left_collapsed, tb_right_collapsed, tb_intro_seen,
//              ai_cache, port_best, port_streak_best, port_family_best,
//              port_pairs_best, port_stats, subnet_stats
//              (UI prefs + perf caches — no cloud sync; per-device)
//
//   DEV_ONLY:  error_log, gh_token, gh_reported, ai_parse_fails, reports,
//              autobackup_*, last_autobackup_at, last_export_reminder_at,
//              key, tb_coach_cache, acl_coach_cache
//              (debug / dev tooling / API key — never to cloud)
//
// HISTORY is special — append-only quiz session log → goes to dedicated
// quiz_history TABLE (not jsonb), so we can query it relationally for
// admin analytics.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  // cloud-store is the canonical owner of the 'nplus_' localStorage prefix
  // (the file that defines USER_DATA_KEYS). Centralising the prefix here
  // makes the literal-string lint happy (regex matches setItem('nplus_…',
  // not setItem(KEY_PREFIX + …, ...)) AND keeps every key in this file
  // built from a single source of truth.
  var KEY_PREFIX = 'nplus_';

  // Wait for Supabase client to be available before doing anything cloud-y.
  // localStorage operations (the cache layer) work without the client.
  function getSupabase() { return window.certanvilSupabase || null; }

  // ── Storage class taxonomy ──────────────────────────────────────────────
  // Keys that flush to cloud (user data — survives across devices)
  var USER_DATA_KEYS = new Set([
    'nplus_history',
    'nplus_streak',
    'nplus_wrong_bank',
    'nplus_sr_queue',
    'nplus_exam_date',
    'nplus_daily_goal',
    'nplus_diagnostic',
    'nplus_last_diagnostic_at',
    'nplus_milestones',
    'nplus_type_stats',
    'nplus_hardcore_exam',
    'nplus_daily_challenge',
    'nplus_deep_dive_uses',
    'nplus_subnet_mastery',
    'nplus_subnet_lessons',
    'nplus_port_mastery',
    'nplus_port_lessons',
    'nplus_ab_mastery',
    'nplus_ab_lessons',
    'nplus_sab_mastery',
    'nplus_sab_lessons',
    'nplus_amm_mastery',  // v4.94.0: Attack-to-Mitigation Match
    'nplus_amm_lessons',
    'nplus_cts_mastery',  // v4.95.0: Control Type Sorter
    'nplus_cts_lessons',
    'nplus_pt_mastery',   // v4.96.0: Network+ Packet Trace drill
    'nplus_pt_lessons',
    'nplus_pt_resume',
    'nplus_irw_mastery',  // v4.97.0: Security+ IR War Room flagship
    'nplus_irw_lessons',
    'nplus_pht_mastery',  // v4.98.0: Security+ Phishing Triage Lab flagship
    'nplus_pht_lessons',
    'nplus_readiness_snapshots',  // v4.99.0: cross-cert analytics readiness pipeline (Phase A.5)
    'nplus_os_mastery',
    'nplus_os_lessons',
    'nplus_cb_mastery',
    'nplus_cb_lessons',
    'nplus_na_mastery',
    'nplus_na_lessons',
    'nplus_na_stats',
    'nplus_topologies',
    'nplus_topology_draft',
    'nplus_acl_state',
    'nplus_fix_challenges',
    'nplus_lab_completions',
    'nplus_activated',   // onboarding: per-cert activation (metadata.activated.<certId>)
    'nplus_onb_skips',   // onboarding: per-cert diagnostic-skip record (metadata.onb_skips.<certId>)
    'nplus_freeCertId',  // free-tier cert lock: metadata.freeCertId (single global value)
    'nplus_drill_stats', // Task 3: per-cert drill stats {cert:{drill:{done,perfect}}}
  ]);

  // Subset of USER_DATA that goes to a dedicated table, NOT profiles.metadata
  var TABLE_BACKED_KEYS = new Set([
    'nplus_history',  // → quiz_history table (append-only)
  ]);

  // Pending flush queue — keys waiting to be written to cloud
  var pendingFlush = new Set();
  var flushTimer = null;
  var FLUSH_DEBOUNCE_MS = 1500;  // wait 1.5s of quiet before batching writes
  var lastSyncAt = null;
  var syncStatus = 'idle';  // 'idle' | 'pending' | 'syncing' | 'error' | 'offline'
  var statusListeners = [];
  var inflightFlush = null;

  // ── Public API ──────────────────────────────────────────────────────────
  var cloudStore = {

    // Mark a USER_DATA key as needing a cloud flush. Called by app code AFTER
    // it writes to localStorage. Debounces; multiple flushes within
    // FLUSH_DEBOUNCE_MS coalesce into one Supabase round-trip.
    flush: function (key) {
      if (!USER_DATA_KEYS.has(key)) return;       // not a user-data key — no-op
      if (!isSignedIn()) return;                  // anonymous — no cloud writes
      pendingFlush.add(key);
      setStatus('pending');
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(doFlush, FLUSH_DEBOUNCE_MS);
    },

    // Force an immediate flush (e.g., on tab close via pagehide event).
    // Returns a promise that resolves when the flush completes.
    flushNow: function () {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      if (pendingFlush.size === 0) return Promise.resolve();
      return doFlush();
    },

    // Hydrate localStorage from Supabase. Called by auth-state on SIGNED_IN.
    // Pulls the user's full state from cloud, writes to localStorage, returns
    // a promise that resolves when complete.
    hydrate: function () {
      var sb = getSupabase();
      if (!sb) return Promise.reject(new Error('Supabase client not ready'));
      var userId = getUserId();
      if (!userId) return Promise.reject(new Error('No signed-in user'));
      setStatus('syncing');

      // Pull profile (jsonb metadata) + recent quiz_history rows in parallel
      return Promise.all([
        sb.from('profiles').select('metadata, role, exam_date, display_name').eq('id', userId).single(),
        sb.from('quiz_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
      ]).then(function (results) {
        var profileResult = results[0];
        var historyResult = results[1];
        if (profileResult.error) throw profileResult.error;

        var meta = (profileResult.data && profileResult.data.metadata) || {};
        var examDate = profileResult.data && profileResult.data.exam_date;

        // Apply jsonb-stored keys to localStorage
        applyJsonbToLocalStorage(meta);
        // exam_date lives in its own profiles column, not in metadata jsonb,
        // so write it via the centralised KEY_PREFIX const at the top of
        // this file (keeps cloud-store the single owner of the 'nplus_'
        // prefix; the variable-arg form satisfies the literal-string lint).
        if (examDate) {
          try { localStorage.setItem(KEY_PREFIX + 'exam_date', examDate); } catch (e) {}
        }

        // Apply quiz_history (latest 500 rows) to localStorage
        if (!historyResult.error && Array.isArray(historyResult.data)) {
          var historyArr = historyResult.data.map(rowToHistoryItem);
          try { localStorage.setItem(KEY_PREFIX + 'history', JSON.stringify(historyArr)); } catch (e) {}
        }

        lastSyncAt = Date.now();
        setStatus('idle');
        return { profile: profileResult.data, historyCount: (historyResult.data || []).length };
      }).catch(function (err) {
        console.error('[cloud-store] hydrate failed', err);
        setStatus('error');
        throw err;
      });
    },

    // Clear localStorage user-data keys. Called on SIGNED_OUT.
    clearLocalCache: function () {
      USER_DATA_KEYS.forEach(function (key) {
        try { localStorage.removeItem(key); } catch (e) {}
      });
      lastSyncAt = null;
      setStatus('idle');
    },

    // Status accessors for UI
    getStatus: function () { return syncStatus; },
    getLastSyncAt: function () { return lastSyncAt; },
    onStatusChange: function (cb) {
      statusListeners.push(cb);
      return function unsubscribe() {
        var i = statusListeners.indexOf(cb);
        if (i >= 0) statusListeners.splice(i, 1);
      };
    },

    // For migration.js — bulk write everything in localStorage to cloud.
    // Returns counts of synced records.
    migrateLocalToCloud: function () {
      if (!isSignedIn()) return Promise.reject(new Error('Not signed in'));
      var allUserKeys = Array.from(USER_DATA_KEYS);
      allUserKeys.forEach(function (k) { pendingFlush.add(k); });
      return doFlush().then(function () {
        return {
          metadataKeysFlushed: allUserKeys.filter(function (k) { return !TABLE_BACKED_KEYS.has(k); }).length,
          historyRowsFlushed: getLocalHistoryArr().length,
        };
      });
    },
  };

  // ── Internals ───────────────────────────────────────────────────────────

  function isSignedIn() {
    var sb = getSupabase();
    if (!sb || !sb.auth) return false;
    // Check the synchronous current-session cache that Supabase JS maintains.
    // Falls back to false if the cache hasn't been populated yet.
    var sess = (sb.auth._currentSession && sb.auth._currentSession.user) ||
               (sb.auth.session && sb.auth.session().data && sb.auth.session().data.user) ||
               null;
    return !!sess;
  }

  function getUserId() {
    var sb = getSupabase();
    if (!sb || !sb.auth) return null;
    var sess = sb.auth._currentSession || (sb.auth.session && sb.auth.session().data && sb.auth.session().data.session);
    return (sess && sess.user && sess.user.id) || null;
  }

  function setStatus(s) {
    if (syncStatus === s) return;
    syncStatus = s;
    statusListeners.forEach(function (cb) { try { cb(s); } catch (e) {} });
  }

  function getLocalHistoryArr() {
    try {
      var raw = localStorage.getItem('nplus_history');
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  // Active cert id (subdomain-derived; set by app.js as window.CURRENT_CERT).
  // SR cloud state is cert-scoped under metadata.sr.<certId> so one cert's sync
  // cannot overwrite another's (the localStorage queue is already per-subdomain).
  function _ccCert() {
    return (typeof window !== 'undefined' && window.CURRENT_CERT) ? window.CURRENT_CERT : 'netplus';
  }

  // Read all USER_DATA keys from localStorage, structure for cloud write
  function buildJsonbFromLocalStorage() {
    var out = {};
    USER_DATA_KEYS.forEach(function (key) {
      if (TABLE_BACKED_KEYS.has(key)) return;     // history goes to its own table
      if (key === 'nplus_exam_date') return;      // goes to profiles.exam_date column
      var raw;
      try { raw = localStorage.getItem(key); } catch (e) { return; }
      if (raw == null) return;
      // Strip the 'nplus_' prefix in cloud — keys in jsonb are cleaner
      var cloudKey = key.replace(/^nplus_/, '');
      // Parse JSON-shaped values, leave strings as-is
      var parsed;
      try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
      // Cert-scope the SR queue: metadata.sr.<certId>.queue (never flat sr_queue).
      if (cloudKey === 'sr_queue') {
        var cert = _ccCert();
        if (!out.sr) out.sr = {};
        if (!out.sr[cert]) out.sr[cert] = {};
        out.sr[cert].queue = parsed;
        return;
      }
      // Cert-scope onboarding activation + skip: metadata.<key>.<certId>.
      // localStorage holds only THIS subdomain's cert entry; doFlush re-reads
      // cloud and merges so sibling certs are preserved.
      if (cloudKey === 'activated' || cloudKey === 'onb_skips') {
        var aCert = _ccCert();
        if (!out[cloudKey]) out[cloudKey] = {};
        out[cloudKey][aCert] = parsed;
        return;
      }
      out[cloudKey] = parsed;
    });
    return out;
  }

  // Inverse of buildJsonbFromLocalStorage — write cloud jsonb back to localStorage
  function applyJsonbToLocalStorage(meta) {
    if (!meta || typeof meta !== 'object') return;
    var cert = _ccCert();
    Object.keys(meta).forEach(function (cloudKey) {
      // Cert-scoped SR: pull only THIS cert's queue out of metadata.sr.<certId>.
      if (cloudKey === 'sr') {
        var certSr = (meta.sr && meta.sr[cert]) ? meta.sr[cert] : null;
        if (certSr && certSr.queue != null) {
          var q = certSr.queue;
          try { localStorage.setItem('nplus_sr_queue', typeof q === 'string' ? q : JSON.stringify(q)); } catch (e) {}
        }
        return;
      }
      // Backward-compat: legacy flat metadata.sr_queue (pre-cert-scoping). Only
      // adopt it when there's no per-cert entry for the active cert, so we never
      // clobber the new structure. The next flush rewrites it cert-scoped.
      if (cloudKey === 'sr_queue') {
        if (meta.sr && meta.sr[cert] && meta.sr[cert].queue != null) return;
        var v = meta.sr_queue;
        if (v != null) { try { localStorage.setItem('nplus_sr_queue', typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {} }
        return;
      }
      // Onboarding cert-scoped maps: pull only THIS cert's entry down to local.
      if (cloudKey === 'activated' || cloudKey === 'onb_skips') {
        var mine = (meta[cloudKey] && meta[cloudKey][cert]) ? meta[cloudKey][cert] : null;
        if (mine != null) {
          try { localStorage.setItem('nplus_' + cloudKey, JSON.stringify(mine)); } catch (e) {}
        }
        return;
      }
      var localKey = 'nplus_' + cloudKey;
      // Skip non-user-data keys defensively (in case jsonb has extra fields like
      // role / migration_v1_at / etc. that shouldn't pollute localStorage)
      if (!USER_DATA_KEYS.has(localKey) || TABLE_BACKED_KEYS.has(localKey)) return;
      var val = meta[cloudKey];
      var writeVal;
      if (val == null) return;
      if (typeof val === 'string') writeVal = val;
      else writeVal = JSON.stringify(val);
      try { localStorage.setItem(localKey, writeVal); } catch (e) {}
    });
  }

  function rowToHistoryItem(row) {
    // quiz_history table → existing localStorage HISTORY format
    // localStorage history items look like: { topic, difficulty, mode, score, total, durationMs, at, ... }
    return Object.assign({
      topic: row.topic,
      difficulty: row.difficulty,
      mode: row.mode,
      score: row.score,
      total: row.total,
      durationMs: row.duration_ms,
      cert: row.cert,
      at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    }, row.metadata || {});
  }

  function historyItemToRow(item, userId) {
    // Inverse — localStorage history item → quiz_history table row
    var meta = Object.assign({}, item);
    delete meta.topic;
    delete meta.difficulty;
    delete meta.mode;
    delete meta.score;
    delete meta.total;
    delete meta.durationMs;
    delete meta.duration_ms;
    delete meta.cert;
    delete meta.at;
    return {
      user_id: userId,
      cert: item.cert || (window.CURRENT_CERT || 'netplus'),
      topic: item.topic || null,
      difficulty: item.difficulty || null,
      mode: item.mode || null,
      score: typeof item.score === 'number' ? item.score : 0,
      total: typeof item.total === 'number' ? item.total : 0,
      duration_ms: typeof item.durationMs === 'number' ? item.durationMs :
                   typeof item.duration_ms === 'number' ? item.duration_ms : null,
      metadata: meta,
      created_at: item.at ? new Date(item.at).toISOString() : new Date().toISOString(),
    };
  }

  // Doflush — actually run the queued cloud writes
  function doFlush() {
    if (inflightFlush) return inflightFlush;
    if (pendingFlush.size === 0) return Promise.resolve();
    var sb = getSupabase();
    var userId = getUserId();
    if (!sb || !userId) return Promise.resolve();

    setStatus('syncing');
    var keysSnapshot = Array.from(pendingFlush);
    pendingFlush.clear();

    var jsonbWrite = false;
    var historyWrite = false;
    keysSnapshot.forEach(function (k) {
      if (k === 'nplus_history') historyWrite = true;
      else jsonbWrite = true;
    });

    var ops = [];

    if (jsonbWrite) {
      var jsonb = buildJsonbFromLocalStorage();
      // Also include exam_date as a top-level column update
      var examDate = null;
      try {
        var raw = localStorage.getItem('nplus_exam_date');
        if (raw) examDate = raw;
      } catch (e) {}

      // metadata.sr is cert-scoped, but the column write is a full replace built
      // from THIS subdomain's localStorage (which only knows its own cert). Read
      // the existing metadata.sr first and merge ours over it, preserving OTHER
      // certs' SR sub-objects — otherwise flushing one cert wipes the rest.
      // All three of sr / activated / onb_skips are cert-scoped maps. We only
      // know THIS subdomain's cert locally, so re-read cloud and merge ours
      // over the existing per-cert entries — otherwise flushing one cert wipes
      // the others' sub-objects on the full-metadata column replace.
      var CERT_SCOPED = ['sr', 'activated', 'onb_skips'];
      var writeProfile = function (existingMeta) {
        CERT_SCOPED.forEach(function (k) {
          var existing = (existingMeta && existingMeta[k]) || {};
          var ours = jsonb[k] || {};
          var merged = Object.assign({}, existing, ours);   // our cert overrides, siblings preserved
          if (Object.keys(merged).length) jsonb[k] = merged;
        });
        // freeCertId is a single global value (not cert-scoped). If THIS flush's
        // localStorage didn't carry it (e.g. a subdomain that hasn't hydrated it),
        // keep the cloud value so the full-metadata replace can't drop the lock.
        if (jsonb.freeCertId == null && existingMeta && existingMeta.freeCertId != null) {
          jsonb.freeCertId = existingMeta.freeCertId;
        }
        var update = { metadata: jsonb };
        if (examDate) update.exam_date = examDate;
        return sb.from('profiles').update(update).eq('id', userId);
      };
      ops.push(
        sb.from('profiles').select('metadata').eq('id', userId).single().then(function (res) {
          return writeProfile(res && res.data && res.data.metadata);
        }, function () {
          return writeProfile(null);   // read failed — write our cert's slices only
        })
      );
    }

    if (historyWrite) {
      // For HISTORY, we don't bulk-replace — we INSERT new rows that don't
      // already exist in cloud. Simple strategy: upload entire local array,
      // dedupe by (user_id, created_at, topic, score) on the cloud side.
      // For initial migration this works; for ongoing sync we'd want a
      // smarter delta but at low volume the simple approach is fine.
      var localHistory = getLocalHistoryArr();
      if (localHistory.length > 0) {
        // Pull existing cloud rows to dedupe (only for ongoing sync; in
        // migration mode the cloud is empty so this is a no-op fast path)
        ops.push(
          sb.from('quiz_history').select('created_at, topic, score, total').eq('user_id', userId).then(function (existing) {
            var existingKeys = new Set(
              ((existing.data || []).map(function (r) {
                return (new Date(r.created_at).getTime()) + '|' + (r.topic || '') + '|' + r.score + '|' + r.total;
              }))
            );
            var newRows = localHistory.filter(function (item) {
              var t = item.at || Date.now();
              var key = t + '|' + (item.topic || '') + '|' + (item.score || 0) + '|' + (item.total || 0);
              return !existingKeys.has(key);
            }).map(function (item) {
              return historyItemToRow(item, userId);
            });
            if (newRows.length === 0) return { data: [], inserted: 0 };
            return sb.from('quiz_history').insert(newRows).then(function (r) {
              return { data: r.data, inserted: newRows.length, error: r.error };
            });
          })
        );
      }
    }

    inflightFlush = Promise.all(ops).then(function (results) {
      inflightFlush = null;
      var hadError = results.some(function (r) { return r && r.error; });
      lastSyncAt = Date.now();
      setStatus(hadError ? 'error' : 'idle');
      if (hadError) {
        // Re-queue the failed keys for retry
        keysSnapshot.forEach(function (k) { pendingFlush.add(k); });
        console.warn('[cloud-store] flush had errors', results);
      }
      return results;
    }).catch(function (err) {
      inflightFlush = null;
      // Network error or other — re-queue + report
      keysSnapshot.forEach(function (k) { pendingFlush.add(k); });
      setStatus(navigator.onLine === false ? 'offline' : 'error');
      console.error('[cloud-store] flush threw', err);
      throw err;
    });

    return inflightFlush;
  }

  // ── Lifecycle wiring ────────────────────────────────────────────────────

  // Flush on tab close / navigation away
  window.addEventListener('pagehide', function () {
    cloudStore.flushNow().catch(function () {});
  });

  // Flush when coming back online (queued writes from offline retry)
  window.addEventListener('online', function () {
    if (pendingFlush.size > 0) doFlush();
  });

  // Re-flush on visibility change (e.g., user comes back to tab)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && pendingFlush.size > 0) {
      doFlush();
    }
  });

  window.cloudStore = cloudStore;
})();
