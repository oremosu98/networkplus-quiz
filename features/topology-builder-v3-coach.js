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

  function defaultProvider(prompt) {
    // Task 17 — real BYOK / server-proxy via the shell's _claudeFetch.
    // Tier C precedent (tbCoachTopology / tbExplainDevice): Sonnet,
    // MAX_TOKENS_TEACHER_COACH, plain-text response.
    var fetchFn = (typeof _claudeFetch === 'function') ? _claudeFetch
      : (typeof window !== 'undefined' && typeof window._claudeFetch === 'function') ? window._claudeFetch
      : null;
    if (!fetchFn) {
      throw new Error('AI provider unavailable — shell _claudeFetch missing');
    }
    var model = (typeof CLAUDE_TEACHER_MODEL === 'string' && CLAUDE_TEACHER_MODEL)
      || (typeof window !== 'undefined' && window.CLAUDE_TEACHER_MODEL)
      || 'claude-sonnet-4-6';
    var maxTokens = (typeof MAX_TOKENS_TEACHER_COACH === 'number' && MAX_TOKENS_TEACHER_COACH)
      || (typeof window !== 'undefined' && window.MAX_TOKENS_TEACHER_COACH)
      || 800;
    var key = null;
    try {
      if (typeof STORAGE !== 'undefined' && STORAGE && STORAGE.KEY && typeof localStorage !== 'undefined') {
        key = localStorage.getItem(STORAGE.KEY);
      } else if (typeof localStorage !== 'undefined') {
        key = localStorage.getItem('nplus_api_key');
      }
    } catch (_) {}
    var headers = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
    if (key) headers['x-api-key'] = key;
    return fetchFn({
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
        _metered: true
      })
    }).then(function (res) {
      if (!res) {
        var noResp = new Error('no response');
        noResp.code = 'network';
        throw noResp;
      }
      if (res.status === 429) {
        var quota = new Error('quota');
        quota.status = 429;
        throw quota;
      }
      if (!res.ok) {
        var apiErr = new Error('api ' + res.status);
        apiErr.status = res.status;
        throw apiErr;
      }
      return res.json();
    }).then(function (data) {
      var text = (data && data.content && data.content[0] && data.content[0].text) || '';
      if (!text) {
        var empty = new Error('empty');
        empty.code = 'empty';
        throw empty;
      }
      return text.trim();
    });
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

  // ── PBQ stuck-escape hint cascade (Task 9) ─────────────────────────
  // useHint(state) is the routing surface for "I'm stuck" — returns
  // one of three shapes:
  //   { kind: 'scripted', index, text, nextState }  for hints 1..3
  //   { kind: 'ai-escape', step, nextState }        for the 4th press
  //   null                                          past the 4th
  // The caller (Task 16 wiring) renders scripted hints inline and
  // invokes askAI() with the step's aiPromptSeed on ai-escape.
  function useHint(state) {
    var step = getCurrentStep(state);
    if (!step) return null;
    var used = (state && typeof state.hintsUsed === 'number') ? state.hintsUsed : 0;
    if (used >= 4) return null;
    var nextState = {};
    for (var k in state) { if (Object.prototype.hasOwnProperty.call(state, k)) nextState[k] = state[k]; }
    nextState.hintsUsed = used + 1;
    if (used < 3) {
      var hints = Array.isArray(step.hints) ? step.hints : [];
      return {
        kind: 'scripted',
        index: used,
        text: hints[used] || '',
        nextState: nextState,
      };
    }
    // used === 3 → 4th press → AI escape rung.
    return {
      kind: 'ai-escape',
      step: step,
      nextState: nextState,
    };
  }

  // ── DOM helpers (Task 11) ──────────────────────────────────────────
  // Tiny render primitives. Pure DOM, no framework. Each renderX
  // returns a detached element the caller appends.
  function el(tag, opts, children) {
    opts = opts || {};
    var node = document.createElement(tag);
    if (opts.class) node.className = opts.class;
    if (opts.text != null) node.textContent = String(opts.text);
    if (opts.attrs) {
      for (var k in opts.attrs) {
        if (Object.prototype.hasOwnProperty.call(opts.attrs, k)) {
          node.setAttribute(k, opts.attrs[k]);
        }
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        if (children[i]) node.appendChild(children[i]);
      }
    }
    return node;
  }

  // ── Panel shell render (Task 11) ───────────────────────────────────
  // Three-band header → mode strip → body → footer. Body + footer are
  // empty containers; Tasks 12-14 fill them based on mode.
  function renderHeader() {
    return el('header', { class: 'tb3-coach__header' }, [
      el('div', { class: 'tb3-coach__brand' }, [
        el('span', { class: 'tb3-coach__mono', text: 'CA' }),
        el('span', { class: 'tb3-coach__name', text: 'Coach' }),
      ]),
      el('div', {
        class: 'tb3-coach__counter',
        text: getCounter().count + ' today',
      }),
    ]);
  }

  function renderModeStrip(input) {
    input = input || {};
    var mode = input.mode;
    var state = input.state || {};
    if (mode === 'pbq') {
      var pbq = getActivePbq(state);
      var idx = (typeof state.currentStepIndex === 'number') ? state.currentStepIndex : 0;
      var totalSteps = pbq ? pbq.steps.length : 0;
      var labelText = pbq ? ('PBQ · ' + (pbq.task ? pbq.task.split('.')[0] : pbq.id)) : 'PBQ';
      return el('div', { class: 'tb3-coach__mode tb3-coach__mode--pbq' }, [
        el('span', { class: 'tb3-coach__mode-dot' }),
        el('span', { class: 'tb3-coach__mode-label', text: labelText }),
        el('span', {
          class: 'tb3-coach__mode-step',
          text: 'Step ' + (idx + 1) + ' of ' + totalSteps,
        }),
      ]);
    }
    return el('div', { class: 'tb3-coach__mode tb3-coach__mode--fb' }, [
      el('span', { class: 'tb3-coach__mode-dot' }),
      el('span', { class: 'tb3-coach__mode-label', text: 'Free Build' }),
      el('span', { class: 'tb3-coach__mode-hint', text: 'ask anything about your topology' }),
    ]);
  }

  function renderShell(input) {
    input = input || {};
    var root = el('section', { class: 'tb3-coach', attrs: { 'aria-label': 'Coach' } });
    root.appendChild(renderHeader());
    root.appendChild(renderModeStrip(input));
    root.appendChild(el('main', { class: 'tb3-coach__body' }));
    root.appendChild(el('footer', { class: 'tb3-coach__footer' }));
    return root;
  }

  // ── PBQ body render (Task 12) ──────────────────────────────────────
  // Fraunces lesson title + Inter task + hairline-bordered step
  // checklist (each step gets [data-done='true'] when index < current).
  // Hint rail below: 3 scripted pips + 'AI' rung. Pips marked
  // [data-filled='true'] when index < hintsUsed.
  function renderPbqBody(state) {
    state = state || {};
    var pbq = getActivePbq(state);
    var idx = (typeof state.currentStepIndex === 'number') ? state.currentStepIndex : 0;
    var used = (typeof state.hintsUsed === 'number') ? state.hintsUsed : 0;
    var wrap = el('div');

    if (pbq) {
      wrap.appendChild(el('h2', {
        class: 'tb3-coach__lesson-title',
        text: 'Build the SOHO topology',
      }));
      wrap.appendChild(el('p', {
        class: 'tb3-coach__lesson-task',
        text: pbq.task || '',
      }));

      var list = el('ul', { class: 'tb3-coach__lesson-list' });
      var steps = pbq.steps || [];
      for (var i = 0; i < steps.length; i++) {
        var li = el('li', { text: steps[i].instruction || '' });
        if (i < idx) li.setAttribute('data-done', 'true');
        list.appendChild(li);
      }
      wrap.appendChild(list);
    }

    var rail = el('div', { class: 'tb3-coach__hint-rail' });
    rail.appendChild(el('div', {
      class: 'tb3-coach__hint-rail-label',
      text: 'Stuck-escape',
    }));
    var pips = el('div', { class: 'tb3-coach__hint-pips' });
    for (var p = 0; p < 3; p++) {
      var pip = el('span', { class: 'tb3-coach__hint-pip' });
      if (p < used) pip.setAttribute('data-filled', 'true');
      pips.appendChild(pip);
    }
    pips.appendChild(el('span', {
      class: 'tb3-coach__hint-pip tb3-coach__hint-pip--ai',
      text: 'AI',
    }));
    rail.appendChild(pips);

    var note;
    if (used === 0) {
      note = '3 scripted hints, then AI on the fourth.';
    } else if (used <= 3) {
      note = used + ' of 3 scripted hints used. AI fires on the fourth.';
    } else {
      note = 'AI hint used.';
    }
    rail.appendChild(el('p', { class: 'tb3-coach__hint-note', text: note }));
    wrap.appendChild(rail);

    return wrap;
  }

  // ── FB body render (Task 13) ───────────────────────────────────────
  // Time-ordered feed of messages. Three kinds:
  //   - scripted (◯) — Coach narration in response to canvas events
  //   - ai (★)       — Coach AI reply to student question
  //   - you          — what the student typed
  // Decorative icons get aria-hidden so screen readers skip them; the
  // adjacent .tb3-coach__msg-meta + body text carries the meaning.
  var FB_ICONS = { scripted: '◯', ai: '★', you: '' };

  function renderMsg(m) {
    m = m || {};
    var kind = m.kind || 'scripted';
    var article = el('article', { class: 'tb3-coach__msg tb3-coach__msg--' + kind });
    if (kind !== 'you') {
      article.appendChild(el('span', {
        class: 'tb3-coach__msg-icon',
        text: FB_ICONS[kind] || '',
        attrs: { 'aria-hidden': 'true' },
      }));
    }
    var body = el('div');
    if (m.meta) {
      body.appendChild(el('div', { class: 'tb3-coach__msg-meta', text: m.meta }));
    }
    // Plain text only — wrap in a span so we can use textContent in both
    // the real DOM and the Node sandbox shim (no createTextNode dep).
    body.appendChild(el('span', {
      class: 'tb3-coach__msg-text',
      text: m.text == null ? '' : String(m.text),
    }));
    article.appendChild(body);
    return article;
  }

  function renderFbBody(messages) {
    var feed = el('div', { class: 'tb3-coach__feed' });
    var list = Array.isArray(messages) ? messages : [];
    for (var i = 0; i < list.length; i++) {
      feed.appendChild(renderMsg(list[i]));
    }
    return feed;
  }

  // ── Footers (Task 14) ──────────────────────────────────────────────
  // PBQ footer: ghost "I'm stuck" + primary "Next step". No free-form
  // input — escape only via the hint cascade (Task 9 routing).
  // FB footer:  text input + primary "Send". AI fires on Send.
  // Both buttons carry data-action attrs that Task 16 wiring listens to.
  function renderPbqFooter() {
    var wrap = el('div', { class: 'tb3-coach__footer-wrap' });
    wrap.appendChild(el('button', {
      class: 'tb3-coach__btn tb3-coach__btn--ghost',
      text: "I'm stuck",
      attrs: { type: 'button', 'data-action': 'stuck' },
    }));
    wrap.appendChild(el('button', {
      class: 'tb3-coach__btn tb3-coach__btn--primary',
      text: 'Next step',
      attrs: { type: 'button', 'data-action': 'next' },
    }));
    return wrap;
  }

  function renderFbFooter() {
    var wrap = el('div', { class: 'tb3-coach__footer-wrap tb3-coach__footer-wrap--fb' });
    wrap.appendChild(el('input', {
      class: 'tb3-coach__ask',
      attrs: {
        type: 'text',
        placeholder: 'Ask Coach about your topology…',
        'aria-label': 'Ask Coach',
        'data-action': 'ask-input',
      },
    }));
    wrap.appendChild(el('button', {
      class: 'tb3-coach__btn tb3-coach__btn--primary',
      text: 'Send',
      attrs: { type: 'button', 'data-action': 'send' },
    }));
    return wrap;
  }

  // ── Module-scope ephemeral UI state (Task 15) ──────────────────────
  // In-memory only; wipes on reload (Memory Level A per spec §3.7).
  // The cache (Task 5) is the only thing that survives a reload.
  var _coachState = {
    activePbqId: null,
    currentStepIndex: 0,
    hintsUsed: 0,
    fbMessages: [],
    panelCollapsed: false,
  };

  function getState() { return _coachState; }

  function setState(patch) {
    if (!patch) return _coachState;
    var next = {};
    for (var k in _coachState) {
      if (Object.prototype.hasOwnProperty.call(_coachState, k)) next[k] = _coachState[k];
    }
    for (var k2 in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k2)) next[k2] = patch[k2];
    }
    _coachState = next;
    return _coachState;
  }

  function getCanvasState() {
    if (typeof window !== 'undefined' && typeof window._getState === 'function') {
      try { return window._getState() || {}; } catch (e) { /* fall through */ }
    }
    return { devices: [], cables: [] };
  }

  // ── Action handlers (Task 16) ──────────────────────────────────────
  // bindActions delegates click + Enter-on-input to the right handler
  // based on the data-action attr on the clicked element (set in
  // Task 14 footer rendering). Provider override is exposed for tests
  // via _setProviderForTest.
  var _testProvider = null;
  function _setProviderForTest(fn) { _testProvider = fn; }

  function handleStuck(host) {
    if (!host) return;
    var combined = {};
    var canvas = getCanvasState();
    for (var k in canvas) {
      if (Object.prototype.hasOwnProperty.call(canvas, k)) combined[k] = canvas[k];
    }
    for (var k2 in _coachState) {
      if (Object.prototype.hasOwnProperty.call(_coachState, k2)) combined[k2] = _coachState[k2];
    }
    var hint = useHint(combined);
    if (!hint) return;
    setState({ hintsUsed: hint.nextState.hintsUsed });
    render(host);
    if (hint.kind === 'ai-escape') {
      var input = {
        mode: 'pbq:' + _coachState.activePbqId,
        stepId: hint.step.id,
        hintsUsed: hint.nextState.hintsUsed,
        aiPromptSeed: hint.step.aiPromptSeed,
        state: getCanvasState(),
      };
      askAI(input, { provider: _testProvider || undefined }).then(function (aiText) {
        // Surface the AI hint inline by updating the hint-note copy.
        var note = host.querySelector('.tb3-coach__hint-note');
        if (note) note.textContent = aiText;
      });
    }
  }

  function handleNext(host) {
    if (!host) return;
    var combined = {};
    var canvas = getCanvasState();
    for (var k in canvas) {
      if (Object.prototype.hasOwnProperty.call(canvas, k)) combined[k] = canvas[k];
    }
    for (var k2 in _coachState) {
      if (Object.prototype.hasOwnProperty.call(_coachState, k2)) combined[k2] = _coachState[k2];
    }
    if (!isStepComplete(combined)) return;
    var next = advanceStep(_coachState);
    setState({ currentStepIndex: next.currentStepIndex, hintsUsed: 0 });
    render(host);
  }

  function handleSend(host) {
    if (!host) return;
    var input = host.querySelector('.tb3-coach__ask');
    if (!input) return;
    var q = (input.value || '').trim();
    if (!q) return;
    input.value = '';
    var msgsBefore = (_coachState.fbMessages || []).slice();
    msgsBefore.push({ kind: 'you', meta: 'You asked', text: q });
    setState({ fbMessages: msgsBefore });
    render(host);
    askAI(
      { mode: 'fb', question: q, state: getCanvasState() },
      { provider: _testProvider || undefined }
    ).then(function (reply) {
      var msgsAfter = (_coachState.fbMessages || []).slice();
      msgsAfter.push({ kind: 'ai', meta: 'Coach · AI', text: reply });
      setState({ fbMessages: msgsAfter });
      render(host);
    });
  }

  function bindActions(shell, host) {
    if (!shell || !host) return;
    if (typeof shell.addEventListener !== 'function') return;
    shell.addEventListener('click', function (ev) {
      var t = ev.target || {};
      var actionEl = (typeof t.closest === 'function')
        ? t.closest('[data-action]')
        : null;
      var action = actionEl ? actionEl.getAttribute('data-action') : null;
      if (action === 'stuck') handleStuck(host);
      else if (action === 'next') handleNext(host);
      else if (action === 'send') handleSend(host);
    });
    shell.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter') return;
      var t = ev.target || {};
      if (t.classList && t.classList.contains && t.classList.contains('tb3-coach__ask')) {
        handleSend(host);
      }
    });
  }

  // ── Mount + render orchestration (Task 15) ─────────────────────────
  // mount(host) marks the host with [data-coach-host], renders the
  // panel inside it. Idempotent — subsequent calls replace the panel
  // rather than appending.
  function render(host) {
    if (!host) return;
    var canvas = getCanvasState();
    var combined = {};
    for (var k in canvas) {
      if (Object.prototype.hasOwnProperty.call(canvas, k)) combined[k] = canvas[k];
    }
    for (var k2 in _coachState) {
      if (Object.prototype.hasOwnProperty.call(_coachState, k2)) combined[k2] = _coachState[k2];
    }
    var mode = getCoachMode(combined);
    var shell = renderShell({ mode: mode, state: combined });
    var body = shell.querySelector('.tb3-coach__body');
    var footer = shell.querySelector('.tb3-coach__footer');
    if (mode === 'pbq') {
      if (body) body.appendChild(renderPbqBody(combined));
      if (footer) footer.appendChild(renderPbqFooter());
    } else {
      if (body) body.appendChild(renderFbBody(_coachState.fbMessages));
      if (footer) footer.appendChild(renderFbFooter());
    }
    bindActions(shell, host);

    var existing = host.querySelector('.tb3-coach');
    if (existing && typeof existing.replaceWith === 'function') {
      existing.replaceWith(shell);
    } else if (existing && existing.parentNode && typeof existing.parentNode.removeChild === 'function') {
      existing.parentNode.removeChild(existing);
      host.appendChild(shell);
    } else {
      host.appendChild(shell);
    }
  }

  function mount(host) {
    if (!host) return;
    host.setAttribute('data-coach-host', 'true');
    render(host);
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
    useHint: useHint,
    renderShell: renderShell,
    renderHeader: renderHeader,
    renderModeStrip: renderModeStrip,
    renderPbqBody: renderPbqBody,
    renderFbBody: renderFbBody,
    renderMsg: renderMsg,
    renderPbqFooter: renderPbqFooter,
    renderFbFooter: renderFbFooter,
    el: el,
    mount: mount,
    render: render,
    getState: getState,
    setState: setState,
    getCanvasState: getCanvasState,
    handleStuck: handleStuck,
    handleNext: handleNext,
    handleSend: handleSend,
    _setProviderForTest: _setProviderForTest,
  };

  if (typeof window !== 'undefined') {
    window.TbV3Coach = TbV3Coach;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TbV3Coach;
  }
})();
