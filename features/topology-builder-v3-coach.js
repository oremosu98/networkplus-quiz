// ════════════════════════════════════════════════════════════════════
// TB v3 Phase 9 — Coach Module
// Hybrid (scripts + AI fallback) right-rail tutor for Topology Builder v3.
// Two modes (PBQ + Free Build), one shell. AI fires only as fallback —
// FB student questions + PBQ 4th-hint stuck-escape. Scripts everywhere
// else. Cost-bounded by design.
//
// Spec: docs/superpowers/specs/2026-05-26-tb-v3-coach-design.md
// Plan: docs/superpowers/plans/2026-05-26-tb-v3-coach.md
// ════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var COACH_VERSION = '1.0.0';

  // ── Mode detection (Task 3) ────────────────────────────────────────
  // The Coach lives in one of two modes. Mode is derived from canvas
  // state, NEVER stored independently — keeps the panel a pure render
  // of the source of truth. PBQ when a PBQ is loaded and the current
  // step index is within the catalog's step list; FB otherwise.
  function getCoachMode(state) {
    if (!state || !state.activePbqId) return 'fb';
    var catalog = (typeof window !== 'undefined' && window.TB_V3_PBQS) || [];
    var pbq = catalog.find(function (p) { return p.id === state.activePbqId; });
    if (!pbq) return 'fb';
    if (typeof state.currentStepIndex !== 'number') return 'fb';
    if (state.currentStepIndex >= pbq.steps.length) return 'fb';
    return 'pbq';
  }

  // ── AI session counter (Task 4) ────────────────────────────────────
  // Per-day counter persisted to localStorage. Renders top-right of the
  // panel header as a cost-conscious affordance — students always see
  // how many AI calls they have fired today. Resets when the calendar
  // date rolls over (UTC ISO date). Defensive try/catch for Safari
  // incognito SecurityError on localStorage access.
  var COUNTER_KEY = 'tbV3CoachCounter';

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function getCounter() {
    try {
      var raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(COUNTER_KEY) : null;
      if (!raw) return { date: today(), count: 0 };
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.date !== today()) return { date: today(), count: 0 };
      return parsed;
    } catch (e) {
      return { date: today(), count: 0 };
    }
  }

  function incrementCounter() {
    var cur = getCounter();
    var next = { date: today(), count: cur.count + 1 };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(COUNTER_KEY, JSON.stringify(next));
      }
    } catch (e) { /* swallow — quota exceeded / SecurityError */ }
    return next;
  }

  // ── AI response cache (Task 5) ─────────────────────────────────────
  // localStorage-backed cache keyed by a stable hash of the AI call
  // inputs (topology + question + mode + step). 24h TTL — survives
  // reload (the v1 STORAGE.TB_COACH_CACHE precedent). On hit, askAI
  // skips the provider call AND skips the counter increment per spec
  // §3.6. djb2 hash for portability; Task 17 swaps in tbTopologyHash
  // when the integration boundary lands.
  var CACHE_KEY = 'tbV3CoachCache';
  var CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  function cacheKey(input) {
    var s = JSON.stringify(input || {});
    var h = 5381;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    }
    return 'k' + (h >>> 0).toString(16);
  }

  function _readCache() {
    try {
      if (typeof localStorage === 'undefined') return {};
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function _writeCache(obj) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
      }
    } catch (e) { /* swallow — quota / SecurityError */ }
  }

  function cacheGet(input) {
    var cache = _readCache();
    var entry = cache[cacheKey(input)];
    if (!entry) return null;
    if (Date.now() - entry.t > CACHE_TTL_MS) return null;
    return entry.v;
  }

  function cacheSet(input, value) {
    var cache = _readCache();
    cache[cacheKey(input)] = { v: value, t: Date.now() };
    _writeCache(cache);
  }

  // ── AI call (Task 6) ───────────────────────────────────────────────
  // buildPrompt assembles the persona + cert pack + state + step
  // context + student question into a single Sonnet 4.6 prompt.
  // askAI is the routing surface: cache check → provider call with
  // 10s timeout → cache write + counter increment on success →
  // calm fallback on timeout/rate-limit. Provider is a STUB at this
  // stage (Task 17 wires the real BYOK proxy).
  var PERSONA = 'You are a Network+ (N10-009) tutor inside the Topology Builder. Keep responses under 500 tokens, calm and direct. Do not spoiler the PBQ answer when one is active. Stay on TB v3 topics.';

  function buildPrompt(input) {
    input = input || {};
    var mode = input.mode || 'fb';
    var state = input.state || {};
    var stepId = input.stepId || null;
    var hintsUsed = input.hintsUsed || 0;
    var certPack = input.certPack || 'netplus';
    var aiPromptSeed = input.aiPromptSeed || '';
    var question = input.question || '';
    var stateJson = JSON.stringify({
      devices: (state.devices || []).map(function (d) {
        return { id: d.id, type: d.type, config: d.config };
      }),
      cables: (state.cables || []).map(function (c) {
        return { from: c.from, to: c.to };
      }),
    });
    var seed = aiPromptSeed.replace('{{state}}', stateJson);
    var lines = [
      PERSONA,
      'Cert pack: ' + certPack + '.',
      'Mode: ' + mode + '.',
      stepId ? ('Current step: ' + stepId + '. Hints used: ' + hintsUsed + '.') : '',
      seed,
      question ? ('Student question: ' + question) : '',
    ];
    return lines.filter(function (s) { return !!s; }).join('\n\n');
  }

  function defaultProvider() {
    // Stub at Task 6 — every askAI() call must pass { provider } until
    // Task 17 wires the real BYOK proxy. The error message identifies
    // the call site as a missing-integration, not a network failure.
    throw new Error('AI provider not wired — supply { provider } or wait for Task 17 integration');
  }

  function _withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        var e = new Error('timeout');
        e.code = 'timeout';
        reject(e);
      }, ms);
      Promise.resolve(promise).then(
        function (v) { clearTimeout(timer); resolve(v); },
        function (e) { clearTimeout(timer); reject(e); }
      );
    });
  }

  function askAI(input, opts) {
    opts = opts || {};
    var provider = opts.provider || defaultProvider;
    var timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 10000;
    var cached = cacheGet(input);
    if (cached) return Promise.resolve(cached);
    return _withTimeout(Promise.resolve().then(function () { return provider(buildPrompt(input)); }), timeoutMs)
      .then(function (result) {
        cacheSet(input, result);
        incrementCounter();
        return result;
      })
      .catch(function (err) {
        if (err && err.status === 429) return 'BYOK quota reached for today.';
        return "I couldn't reach the tutor — try rephrasing, or check your connection.";
      });
  }

  // ── FB action narration templates (Task 7) ─────────────────────────
  // Scripted strings keyed by canvas event type. Returned by
  // narrateAction(event); appended to the FB message feed as a quiet
  // ◯-marked narration line. Returns null for unknown events — the
  // panel renders silence rather than noise (no AI fallback for
  // narration; that's deliberate, the AI is reserved for student-
  // typed questions + PBQ 4th-hint escape).
  var NARRATION = {
    'device-added': function (e) {
      var t = (e && e.device && e.device.type) || null;
      var map = {
        'router': 'Routers move packets between subnets at L3. This one will likely be your gateway.',
        'soho-router': 'A SOHO router is converged: routing + switching + DHCP + NAT in one device.',
        'switch': 'Switches forward frames within a subnet at L2. Multiple endpoints share one L2 broadcast domain.',
        'pc': 'Endpoints sit at the edge — they originate traffic and receive it.',
        'phone': 'Endpoints sit at the edge — they originate traffic and receive it.',
        'printer': 'Endpoints sit at the edge — they originate traffic and receive it.',
        'endpoint': 'Endpoints sit at the edge — they originate traffic and receive it.',
        'isp': 'The ISP represents the WAN side. Anything beyond it leaves your control.',
        'firewall': 'Firewalls inspect traffic crossing a boundary and decide what passes.',
      };
      return map[t] || null;
    },
    'cable-drawn': function () {
      return 'Cables are L1 — physical paths. Protocol decisions happen on the devices at each end.';
    },
    'device-deleted': function () { return null; },
    'cable-deleted': function () { return null; },
  };

  function narrateAction(event) {
    if (!event || !event.type) return null;
    var fn = NARRATION[event.type];
    if (!fn) return null;
    var msg = fn(event);
    return (typeof msg === 'string' && msg.length > 0) ? msg : null;
  }

  // ── PBQ step progression (Task 8) ──────────────────────────────────
  // Pure helpers that operate on the combined UI + canvas state.
  // step.check(state) is the source of truth for completion. The UI
  // (Tasks 12 + 16) reads these to drive the lesson list + Next button
  // state.
  function getActivePbq(state) {
    if (!state || !state.activePbqId) return null;
    var catalog = (typeof window !== 'undefined' && window.TB_V3_PBQS) || [];
    return catalog.find(function (p) { return p.id === state.activePbqId; }) || null;
  }

  function getCurrentStep(state) {
    var pbq = getActivePbq(state);
    if (!pbq) return null;
    var idx = (typeof state.currentStepIndex === 'number') ? state.currentStepIndex : 0;
    return pbq.steps[idx] || null;
  }

  function isStepComplete(state) {
    var step = getCurrentStep(state);
    if (!step || typeof step.check !== 'function') return false;
    try {
      return !!step.check(state);
    } catch (e) {
      // Defensive: a broken check() must not crash the panel.
      return false;
    }
  }

  function advanceStep(state) {
    var idx = (state && typeof state.currentStepIndex === 'number') ? state.currentStepIndex : 0;
    var next = {};
    for (var k in state) { if (Object.prototype.hasOwnProperty.call(state, k)) next[k] = state[k]; }
    next.currentStepIndex = idx + 1;
    next.hintsUsed = 0;
    return next;
  }

  // ── Module export ──────────────────────────────────────────────────
  var TbV3Coach = {
    COACH_VERSION: COACH_VERSION,
    getCoachMode: getCoachMode,
    getCounter: getCounter,
    incrementCounter: incrementCounter,
    cacheKey: cacheKey,
    cacheGet: cacheGet,
    cacheSet: cacheSet,
    buildPrompt: buildPrompt,
    askAI: askAI,
    PERSONA: PERSONA,
    narrateAction: narrateAction,
    getActivePbq: getActivePbq,
    getCurrentStep: getCurrentStep,
    isStepComplete: isStepComplete,
    advanceStep: advanceStep,
  };

  if (typeof window !== 'undefined') {
    window.TbV3Coach = TbV3Coach;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TbV3Coach;
  }
})();
