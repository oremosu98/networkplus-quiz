/* Sim Lab — PBQ drill (Plan 1: core + Practice mode). Lazy-loaded feature. */
(function () {
  'use strict';

  var STEP_TYPES = ['order', 'categorize', 'match', 'analyze', 'fillin'];

  var _SL_PBQ_CERTS = ['netplus', 'secplus', 'aplus-core1', 'aplus-core2'];

  function _isNonEmptyStr(v) { return typeof v === 'string' && v.trim().length > 0; }

  function _validateStepPayload(step) {
    var p = step.payload, a = step.answer;
    if (!p || typeof p !== 'object' || !a) return false;
    switch (step.type) {
      case 'order':
        return Array.isArray(p.items) && p.items.length >= 2 &&
               Array.isArray(a.correctOrder) && a.correctOrder.length === p.items.length;
      case 'categorize':
        return Array.isArray(p.items) && p.items.length >= 1 && Array.isArray(p.buckets) && p.buckets.length >= 2 &&
               a.map && !Array.isArray(a.map) && typeof a.map === 'object';
      case 'match':
        return Array.isArray(p.left) && Array.isArray(p.right) &&
               p.left.length >= 2 && p.left.length === p.right.length && a.pairs && typeof a.pairs === 'object';
      case 'analyze':
        return Array.isArray(p.lines) && p.lines.length >= 2 &&
               Array.isArray(a.selected) && a.selected.length >= 1;
      case 'fillin':
        return Array.isArray(p.fields) && p.fields.length >= 1 &&
               a && typeof a === 'object' &&
               p.fields.every(function (f) { return typeof f.id === 'string' && f.id && Array.isArray(a[f.id]) && a[f.id].length >= 1; });
      default: return false;
    }
  }

  function simLabValidateScenario(s) {
    var errs = [];
    if (!s || typeof s !== 'object') return { ok: false, errors: ['not an object'] };
    if (!_isNonEmptyStr(s.id)) errs.push('missing id');
    if (!_isNonEmptyStr(s.cert)) errs.push('missing cert');
    if (!_isNonEmptyStr(s.scenario)) errs.push('missing scenario prose');
    if (typeof s.estMinutes !== 'number' || s.estMinutes <= 0) errs.push('bad estMinutes');
    if (!Array.isArray(s.steps) || s.steps.length < 1 || s.steps.length > 4) {
      errs.push('steps must be 1..4');
    } else {
      s.steps.forEach(function (st, i) {
        if (!_isNonEmptyStr(st.id)) errs.push('step ' + i + ': missing id');
        if (STEP_TYPES.indexOf(st.type) === -1) errs.push('step ' + i + ': bad type');
        if (!_isNonEmptyStr(st.prompt)) errs.push('step ' + i + ': missing prompt');
        if (!_isNonEmptyStr(st.explanation)) errs.push('step ' + i + ': missing explanation');
        if (st.points !== 1) errs.push('step ' + i + ': points must be 1');
        if (!_validateStepPayload(st)) errs.push('step ' + i + ': bad payload/answer for ' + st.type);
      });
    }
    return { ok: errs.length === 0, errors: errs };
  }

  // --- scoring (Task 2) ---

  function _norm(v) {
    if (v == null) return '';
    return String(v).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function _simLabNormalizeMatch(given, acceptList) {
    if (given == null || String(given).trim() === '') return false;
    var g = _norm(given);
    for (var i = 0; i < acceptList.length; i++) {
      if (_norm(acceptList[i]) === g) return true;
    }
    return false;
  }

  function _arrEq(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function _setEq(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    var sa = a.slice().sort(), sb = b.slice().sort();
    return _arrEq(sa, sb);
  }

  function _scoreStep(step, resp) {
    if (!resp) return false;
    switch (step.type) {
      case 'order':
        return _arrEq(resp.order, step.answer.correctOrder);
      case 'categorize':
        return Object.keys(step.answer.map).every(function (itemId) {
          return resp.map && resp.map[itemId] === step.answer.map[itemId];
        }) && resp.map && Object.keys(resp.map).length === Object.keys(step.answer.map).length;
      case 'match':
        return Object.keys(step.answer.pairs).every(function (l) {
          return resp.pairs && resp.pairs[l] === step.answer.pairs[l];
        }) && resp.pairs && Object.keys(resp.pairs).length === Object.keys(step.answer.pairs).length;
      case 'analyze':
        return _setEq(resp.selected, step.answer.selected);
      case 'fillin':
        return step.payload.fields.every(function (f) {
          var accept = step.answer[f.id] || [];
          var given = resp && resp[f.id];
          return _simLabNormalizeMatch(given, accept); // see _simLabNormalizeMatch above
        });
      default: return false;
    }
  }

  function simLabScoreScenario(scn, responses) {
    var perStep = {}, correct = 0;
    scn.steps.forEach(function (st) {
      var ok = _scoreStep(st, responses ? responses[st.id] : null);
      perStep[st.id] = ok;
      if (ok) correct++;
    });
    var total = scn.steps.length;
    return { perStep: perStep, correct: correct, total: total, fraction: total ? correct / total : 0 };
  }

  // --- per-gesture input controller (Task 4) ---

  function _slBindMovable(container, opts) {
    var picked = null; // currently picked-up item element
    var suppressClick = false; // Bug 1: swallow the trailing click after a real drag

    function clearPicked() {
      if (picked) picked.classList.remove('sl-picked');
      picked = null;
    }
    function pick(itemEl) {
      if (picked === itemEl) { clearPicked(); return; }
      clearPicked();
      picked = itemEl;
      itemEl.classList.add('sl-picked');
    }
    function drop(targetEl) {
      if (!picked) return;
      var itemId = picked.getAttribute('data-item');
      var targetId = targetEl.getAttribute('data-target');
      clearPicked();
      opts.onPlace(itemId, targetId);
    }

    // Tap-to-place + keyboard (universal baseline). 'click' fires for mouse tap,
    // touch tap, and keyboard Enter/Space on a focusable button.
    container.addEventListener('click', function (e) {
      if (suppressClick) { suppressClick = false; return; } // Bug 1: swallow post-drag stray click
      var item = e.target.closest(opts.itemSel);
      if (item && container.contains(item)) { pick(item); return; }
      var target = e.target.closest(opts.targetSel);
      if (target && container.contains(target)) { drop(target); }
    });

    // Drag layer — ONLY for mouse/pen. Touch never drags. Movement threshold
    // distinguishes drag from click.
    var DRAG_THRESHOLD = 6;
    container.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;        // touch uses tap path above
      var item = e.target.closest(opts.itemSel);
      if (!item || !container.contains(item)) return;
      var startX = e.clientX, startY = e.clientY, dragging = false;
      item.setPointerCapture(e.pointerId);

      function move(ev) {
        if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_THRESHOLD) {
          dragging = true;
          item.classList.add('sl-dragging');
          pick(item);
        }
        if (dragging) {
          item.style.transform = 'translate(' + (ev.clientX - startX) + 'px,' + (ev.clientY - startY) + 'px)';
        }
      }
      function up(ev) {
        item.releasePointerCapture(e.pointerId);
        item.removeEventListener('pointermove', move);
        item.removeEventListener('pointerup', up);
        item.removeEventListener('pointercancel', cancel); // Bug 2: clean up cancel listener
        item.classList.remove('sl-dragging');
        if (dragging) {
          suppressClick = true; // Bug 1: flag to swallow the trailing click
          item.style.transform = ''; // clear transform before hit-testing so item doesn't occlude target
          var under = document.elementFromPoint(ev.clientX, ev.clientY);
          var target = under && under.closest(opts.targetSel);
          if (target && container.contains(target)) drop(target);
          else clearPicked();
        } else {
          item.style.transform = '';
        }
      }
      // Bug 2: handle pointercancel to avoid listener leak and stale state
      function cancel() {
        try { item.releasePointerCapture(e.pointerId); } catch (err) {}
        item.removeEventListener('pointermove', move);
        item.removeEventListener('pointerup', up);
        item.removeEventListener('pointercancel', cancel);
        item.style.transform = '';
        item.classList.remove('sl-dragging');
        clearPicked();
      }
      item.addEventListener('pointermove', move);
      item.addEventListener('pointerup', up);
      item.addEventListener('pointercancel', cancel); // Bug 2: register cancel handler
    });

    return { clearPicked: clearPicked };
  }

  // --- shared DOM helpers ---
  function _el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function _esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function _slAttr(v) { return (window.CSS && CSS.escape) ? CSS.escape(v) : String(v).replace(/["\\]/g, '\\$&'); }

  // --- order renderer ---
  function _slRenderOrder(step, onChange) {
    var order = step.payload.items.map(function (it) { return it.id; }); // initial = given order
    var root = _el('div', 'sl-order');
    root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
    var list = _el('div', 'sl-order-list');
    root.appendChild(list);

    function labelFor(id) {
      var it = step.payload.items.filter(function (x) { return x.id === id; })[0];
      return it ? it.label : id;
    }
    function moveTo(itemId, index) {
      var from = order.indexOf(itemId);
      if (from === -1) return;
      order.splice(from, 1);
      order.splice(index, 0, itemId);
      paint();
      onChange({ order: order.slice() });
    }
    function paint() {
      list.innerHTML = '';
      order.forEach(function (id, i) {
        var row = _el('button', 'sl-item sl-order-row');
        row.setAttribute('type', 'button');
        row.setAttribute('data-item', id);
        row.setAttribute('aria-label', 'Move ' + labelFor(id));
        row.innerHTML = '<span class="sl-grip" aria-hidden="true">⋮⋮</span>' + _esc(labelFor(id));
        // tap/keyboard: clicking a row swaps it up one slot (simple, predictable)
        row.addEventListener('click', function () { if (i > 0) moveTo(id, i - 1); });
        list.appendChild(row);
      });
    }
    paint();
    onChange({ order: order.slice() }); // report initial state
    root.__moveTo = moveTo; // test hook
    return root;
  }

  // --- categorize renderer ---
  function _slRenderCategorize(step, onChange) {
    var map = {};                 // itemId -> bucketId
    var root = _el('div', 'sl-cat');
    root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
    var tray = _el('div', 'sl-cat-tray');
    var cols = _el('div', 'sl-cat-cols');
    root.appendChild(tray); root.appendChild(cols);

    step.payload.items.forEach(function (it) {
      var b = _el('button', 'sl-item sl-chip', _esc(it.label));
      b.setAttribute('type', 'button'); b.setAttribute('data-item', it.id);
      tray.appendChild(b);
    });
    step.payload.buckets.forEach(function (bk) {
      var col = _el('div', 'sl-cat-col');
      col.innerHTML = '<div class="sl-cat-h">' + _esc(bk.label) + '</div>';
      var drop = _el('div', 'sl-target sl-cat-drop'); drop.setAttribute('data-target', bk.id);
      col.appendChild(drop); cols.appendChild(col);
    });

    _slBindMovable(root, {
      itemSel: '.sl-chip', targetSel: '.sl-cat-drop',
      onPlace: function (itemId, bucketId) {
        map[itemId] = bucketId;
        var chip = root.querySelector('.sl-chip[data-item="' + _slAttr(itemId) + '"]');
        var drop = root.querySelector('.sl-cat-drop[data-target="' + _slAttr(bucketId) + '"]');
        if (chip && drop) drop.appendChild(chip);
        onChange({ map: Object.assign({}, map) });
      }
    });
    onChange({ map: {} });
    return root;
  }

  // --- analyze renderer ---
  function _slRenderAnalyze(step, onChange) {
    var multi = !!step.payload.multi;
    var selected = [];
    var root = _el('div', 'sl-analyze');
    root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
    var block = _el('div', 'sl-analyze-block'); root.appendChild(block);

    step.payload.lines.forEach(function (ln) {
      var row = _el('button', 'sl-analyze-line');
      row.setAttribute('type', 'button'); row.setAttribute('data-line', ln.id);
      row.textContent = ln.text;
      row.addEventListener('click', function () {
        var idx = selected.indexOf(ln.id);
        if (multi) {
          if (idx === -1) selected.push(ln.id); else selected.splice(idx, 1);
        } else {
          selected = (idx === -1) ? [ln.id] : [];
        }
        Array.prototype.forEach.call(block.children, function (c) {
          c.classList.toggle('sl-sel', selected.indexOf(c.getAttribute('data-line')) !== -1);
        });
        onChange({ selected: selected.slice() });
      });
      block.appendChild(row);
    });
    onChange({ selected: [] });
    return root;
  }

  // --- match renderer ---
  function _slRenderMatch(step, onChange) {
    var pairs = {};
    var root = _el('div', 'sl-match');
    root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
    var grid = _el('div', 'sl-match-grid'); root.appendChild(grid);
    var lcol = _el('div', 'sl-match-col'), rcol = _el('div', 'sl-match-col');
    grid.appendChild(lcol); grid.appendChild(rcol);

    step.payload.left.forEach(function (l) {
      var b = _el('button', 'sl-item sl-match-l', _esc(l.label));
      b.setAttribute('type', 'button'); b.setAttribute('data-item', l.id);
      lcol.appendChild(b);
    });
    step.payload.right.forEach(function (r) {
      var t = _el('div', 'sl-target sl-match-r', _esc(r.label));
      t.setAttribute('data-target', r.id); t.setAttribute('tabindex', '0');
      rcol.appendChild(t);
    });

    _slBindMovable(root, {
      itemSel: '.sl-match-l', targetSel: '.sl-match-r',
      onPlace: function (leftId, rightId) {
        pairs[leftId] = rightId;
        var lEl = root.querySelector('.sl-match-l[data-item="' + _slAttr(leftId) + '"]');
        if (lEl) {
          var rLabel = step.payload.right.filter(function (x){return x.id===rightId;})[0];
          lEl.setAttribute('data-paired', rightId);
          var existing = lEl.querySelector('.sl-pairtag');
          if (existing) existing.remove();
          var tag = _el('span', 'sl-pairtag', '→ ' + _esc(rLabel ? rLabel.label : rightId));
          lEl.appendChild(tag);
        }
        onChange({ pairs: Object.assign({}, pairs) });
      }
    });
    onChange({ pairs: {} });
    return root;
  }

  // --- fillin renderer ---
  function _slRenderFillin(step, onChange) {
    var vals = {};
    var root = _el('div', 'sl-fillin');
    root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
    step.payload.fields.forEach(function (f) {
      var wrap = _el('label', 'sl-field');
      wrap.appendChild(_el('span', 'sl-field-label', _esc(f.label)));
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'sl-field-input';
      input.setAttribute('data-field', f.id);
      input.setAttribute('inputmode', f.inputmode || 'text');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocapitalize', 'none');
      input.setAttribute('spellcheck', 'false');
      input.addEventListener('input', function () {
        vals[f.id] = input.value;
        onChange(Object.assign({}, vals));
      });
      wrap.appendChild(input);
      root.appendChild(wrap);
    });
    onChange({});
    return root;
  }

  // --- renderStep dispatcher ---
  function simLabRenderStep(step, onChange) {
    switch (step.type) {
      case 'order': return _slRenderOrder(step, onChange);
      case 'categorize': return _slRenderCategorize(step, onChange);
      case 'match': return _slRenderMatch(step, onChange);
      case 'analyze': return _slRenderAnalyze(step, onChange);
      case 'fillin': return _slRenderFillin(step, onChange);
      default: return _el('div', 'sl-unknown', 'Unsupported step');
    }
  }

  // --- scenario orchestrator (Task 10) ---
  function _slMountScenario(host, scn, opts) {
    var responses = {};
    host.innerHTML = '';
    var wrap = _el('div', 'sl-scenario');
    wrap.appendChild(_el('div', 'sl-scn-prose', _esc(scn.scenario)));
    if (scn.assets && Array.isArray(scn.assets.logs) && scn.assets.logs.length) {
      var pre = _el('pre', 'sl-scn-logs');
      pre.textContent = scn.assets.logs.join('\n');
      wrap.appendChild(pre);
    }
    scn.steps.forEach(function (st, i) {
      var stepWrap = _el('div', 'sl-step');
      stepWrap.appendChild(_el('div', 'sl-step-k', 'Step ' + (i + 1) + ' of ' + scn.steps.length));
      var el = simLabRenderStep(st, function (resp) { responses[st.id] = resp; });
      stepWrap.appendChild(el);
      wrap.appendChild(stepWrap);
    });
    var submit = _el('button', 'btn btn-primary gnt-cta', 'Submit answers');
    submit.setAttribute('type', 'button');
    submit.setAttribute('data-action', 'simLabSubmitScenario');
    wrap.appendChild(submit);
    host.appendChild(wrap);

    var submitted = false;
    window.__slActiveSubmit = function () {
      if (submitted) return;
      submitted = true;
      var score = simLabScoreScenario(scn, responses);
      opts.onSubmit(Object.assign({ responses: responses, scenario: scn }, score));
    };
  }

  function simLabSubmitScenario() { if (window.__slActiveSubmit) window.__slActiveSubmit(); }

  // --- hybrid feedback renderer (Task 11) ---
  function _slRenderFeedback(host, scn, score, opts) {
    var mode = (opts && opts.mode) || 'free';
    host.innerHTML = '';
    var root = _el('div', 'sl-feedback');
    var pct = Math.round(score.fraction * 100);
    root.appendChild(_el('div', 'sl-fb-score', score.correct + ' of ' + score.total + ' steps · ' + pct + '%'));

    scn.steps.forEach(function (st, i) {
      var ok = score.perStep[st.id];
      var row = _el('div', 'sl-fb-row ' + (ok ? 'sl-ok' : 'sl-bad'));
      row.appendChild(_el('span', 'sl-fb-ic', ok ? '✓' : '✗'));
      row.appendChild(_el('span', 'sl-fb-t', 'Step ' + (i + 1) + ' · ' + _esc(st.prompt)));
      var reveal = (mode === 'pro') || !ok;
      if (reveal) {
        row.appendChild(_el('p', 'sl-fb-why', _esc(st.explanation)));
      } else {
        var lock = _el('p', 'sl-fb-locked', 'You nailed this one. Pro explains the why behind your right answers too, so it sticks.');
        row.appendChild(lock);
      }
      root.appendChild(row);
    });
    host.appendChild(root);
  }

  function _slStartPracticeTimer(host, opts) {
    var started = Date.now();
    var nudged = false;
    var thresholdMs = (opts.estMinutes || 6) * 60 * 1000;
    var el = _el('div', 'sl-timer');
    var nudgeEl = _el('div', 'sl-nudge sl-hidden',
      "You've been on this one a while. Partial credit counts, so lock in your best answer and move on.");
    host.appendChild(el); host.appendChild(nudgeEl);

    function fmt(ms) {
      var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
      return m + ':' + String(s % 60).padStart(2, '0');
    }
    var iv = setInterval(function () {
      var elapsed = Date.now() - started;
      el.textContent = '⏱ ' + fmt(elapsed);
      if (!nudged && elapsed >= thresholdMs) {
        nudged = true;
        nudgeEl.classList.remove('sl-hidden');
        if (opts.onNudge) opts.onNudge();
      }
    }, 250);
    return { stop: function () { clearInterval(iv); }, elapsedMs: function () { return Date.now() - started; } };
  }

  // --- scenario generation with validation + seed fallback (Task 13) ---

  var _slFetcher = null; // injectable for tests; the real metered fetcher is set in Task 14

  // Cert → seed-bank resolver. Reads the live window global each call so a lazily
  // injected bank is picked up without re-wiring, and tests that swap the global
  // still work. Unknown or contentless certs return [] → AI-gen + fallback path.
  var _SL_SEED_GLOBALS = {
    netplus: 'SIM_LAB_SEED_NETPLUS',
    secplus: 'SIM_LAB_SEED_SECPLUS'
    // 'aplus-core1' / 'aplus-core2' — add when their banks ship
  };
  function _slBank(cert) {
    var g = _SL_SEED_GLOBALS[cert];
    var b = g && window[g];
    return Array.isArray(b) ? b : [];
  }

  function _slPickSeed(cert) {
    var bank = _slBank(cert);
    if (!bank.length) return null;
    // vary by minute so repeated taster runs rotate without Math.random
    var idx = (new Date().getMinutes()) % bank.length;
    var seed = bank[idx];
    if (!simLabValidateScenario(seed).ok) return null;
    return seed;
  }

  // No-repeat seed pick within a session. Falls back to plain pick if the bank
  // is exhausted (won't happen: 50 seeds >> 10 max rounds).
  function _slPickSeedFresh(cert, usedIds) {
    var bank = _slBank(cert);
    var fresh = bank.filter(function (s) { return !usedIds.has(s.id) && simLabValidateScenario(s).ok; });
    var pool = fresh.length ? fresh : bank.filter(function (s) { return simLabValidateScenario(s).ok; });
    if (!pool.length) return null;
    // Index by how many we've already shown — pure, clock-independent, and within
    // the `fresh` pool every pick is a distinct unused seed by construction.
    var idx = usedIds.size % pool.length;
    return pool[idx];
  }

  // Aggregate per-round results into a session summary.
  function _slAggregateSession(results) {
    var passed = 0, stepsCorrect = 0, stepsTotal = 0;
    results.forEach(function (r) {
      if (r.passed) passed++;
      stepsCorrect += r.score.correct; stepsTotal += r.score.total;
    });
    var pct = stepsTotal ? Math.round((stepsCorrect / stepsTotal) * 100) : 0;
    return { passed: passed, rounds: results.length, stepsCorrect: stepsCorrect, stepsTotal: stepsTotal, pct: pct };
  }

  // Blank exam-session state. scenarios is the pre-generated round array;
  // budgetMs is Σ estMinutes × 0.9 × 60000 (computed by the caller). Wall-clock
  // deadlineMs is set at clock-start, not here (state is generated before the
  // clock starts — §3.3).
  function _slExamBlankState(scenarios, budgetMs) {
    return {
      mode: 'exam',
      rounds: scenarios.length,
      idx: 0,
      pro: _slIsPro(),
      cert: (window.CURRENT_CERT || 'netplus'),
      results: [],
      usedSeedIds: new Set(scenarios.map(function (s) { return s.id; })),
      timer: null,
      // exam-only
      scenarios: scenarios.slice(),
      answers: scenarios.map(function () { return null; }),     // per-round in-flight responses
      visited: new Set(),
      flagged: new Set(),
      deadlineMs: 0,                                            // set in _slStartCountdown
      budgetMs: budgetMs,
      roundMs: scenarios.map(function () { return 0; }),        // accrued active time per round
      view: 'round',                                           // 'round' | 'review'
      clock: null,                                             // setInterval handle
      amber: false,                                            // latched
      roundEnteredAt: 0                                        // Date.now() when current round was shown
    };
  }

  // Pace math (§3.5). totalMs (headline "your time") = elapsedMs = budgetMs − remaining
  // at submit. deltaMs = budgetMs − totalMs (positive = under par = "to spare").
  // onPace = deltaMs >= 0. Per-round bars compare roundMs[i] against that round's
  // par. Par per round comes from the scenario estMinutes × 0.9; the caller passes
  // the par array so this stays pure.
  function _slComputePace(results, roundMs, budgetMs, elapsedMs, parMs) {
    var totalMs = elapsedMs;
    var deltaMs = budgetMs - totalMs;
    var onPace = deltaMs >= 0;
    var perRound = roundMs.map(function (ms, i) {
      var par = (parMs && typeof parMs[i] === 'number') ? parMs[i] : (budgetMs / roundMs.length);
      return { roundMs: ms, parMs: par, deltaMs: par - ms, over: ms > par };
    });
    return { totalMs: totalMs, deltaMs: deltaMs, onPace: onPace, perRound: perRound };
  }

  // Budget = Σ estMinutes × 0.9 × 60000 (§2 decision 2). Pure helper.
  function _slExamBudgetMs(scenarios) {
    var minutes = scenarios.reduce(function (acc, s) {
      return acc + (typeof s.estMinutes === 'number' && s.estMinutes > 0 ? s.estMinutes : 6);
    }, 0);
    return Math.round(minutes * 0.9 * 60000);
  }

  // Per-round par array (estMinutes × 0.9 × 60000) for the per-round bars.
  function _slExamParMs(scenarios) {
    return scenarios.map(function (s) {
      var m = (typeof s.estMinutes === 'number' && s.estMinutes > 0) ? s.estMinutes : 6;
      return Math.round(m * 0.9 * 60000);
    });
  }

  // Session-level free-cap guard: bump the daily counter at most once per session.
  var _slSessionBumped = false;
  function _slSessionBumpOnce() {
    if (_slSessionBumped) return;
    _slSessionBumped = true;
    if (typeof window._bumpPbqFreeRun === 'function') window._bumpPbqFreeRun();
  }

  var _slSession = null;
  var _slPickedRounds = 5;
  var _slPickedMode = 'practice';

  // Spec §4 — the revenue tap. EXACT copy; do not paraphrase.
  function _slExamGateCopy() {
    return {
      title: 'The real exam is timed. Practice that way.',
      body: 'Exam mode runs one clock across the whole session. Flag a PBQ, move on, come back, then review before you submit, just like the N10-009 PBQ section. Practice mode stays free and unlimited. Unlock Exam mode with Pro to train under real pressure.',
      primary: 'Unlock Exam mode',
      secondary: 'Keep practicing (free)'
    };
  }

  function _slFmtClock(ms) {
    var s = Math.max(0, Math.round(ms / 1000)), m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }

  function _slSyncMode() {
    var opts = document.querySelectorAll('#sle-mode .sle-seg-opt');
    Array.prototype.forEach.call(opts, function (o) {
      var on = o.getAttribute('data-mode') === _slPickedMode;
      o.classList.toggle('is-on', on);
      o.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var isExam = _slPickedMode === 'exam';
    var budget = document.getElementById('sle-budget');
    var note = document.getElementById('sle-note');
    var start = document.getElementById('sle-start');
    if (budget) budget.classList.toggle('is-hidden', !isExam);
    if (note) note.classList.toggle('is-hidden', !isExam);
    if (start) start.textContent = isExam ? 'Start exam sim →' : 'Start the sim →';
    if (isExam) _slSyncBudgetReadout();
  }

  // Estimate the budget readout from the seed bank's median estMinutes x rounds
  // x 0.9 (the real budget is computed from the actual pre-generated rounds at
  // start; this readout is the anticipated figure for the entry screen).
  function _slSyncBudgetReadout() {
    var bank = _slBank(window.CURRENT_CERT || 'netplus');
    var per = bank.length
      ? bank.reduce(function (a, s) { return a + (s.estMinutes || 6); }, 0) / bank.length
      : 6;
    var ms = Math.round(per * _slPickedRounds * 0.9 * 60000);
    var v = document.getElementById('sle-budget-v');
    var note = document.getElementById('sle-note');
    if (v) v.textContent = _slFmtClock(ms);
    if (note) note.textContent = 'Pro · one clock for all ' + _slPickedRounds + ' rounds · budget ' + _slFmtClock(ms) + ' (tightened to exam pace)';
  }

  function _slBindModeToggle() {
    var host = document.getElementById('sle-mode');
    if (!host || host.__bound) return; host.__bound = true;
    host.addEventListener('click', function (e) {
      var opt = e.target.closest('.sle-seg-opt'); if (!opt) return;
      var m = opt.getAttribute('data-mode');
      if (m === 'exam' && !_slIsPro()) { window._gateProOnly('Sim Lab', _slExamGateCopy()); return; }
      _slPickedMode = m; _slSyncMode();
    });
  }

  // Stub — filled in Task 3.
  function _slExamStart() {}

  function _slSessionStartDispatch() {
    if (_slPickedMode === 'exam') {
      if (!_slIsPro()) { window._gateProOnly('Sim Lab', _slExamGateCopy()); return; }
      return _slExamStart();   // Task 3
    }
    return _slSessionStart();  // existing practice path
  }

  function simLabOpenEntry() {
    _slBindRoundChips();
    _slBindModeToggle();
    _slPickedRounds = 5;
    _slPickedMode = 'practice';
    var t = document.getElementById('sle-target');
    if (t) t.textContent = 'Mixed · ' + ((window.CERT_PACK && window.CERT_PACK.meta && window.CERT_PACK.meta.examName) || 'Network+ N10-009');
    _slSyncRoundChips();
    _slSyncMode();
    // Real routing — showPage syncs the sidebar active state, topbar crumb,
    // clears stale error boxes, and closes the mobile drawer. Never bypass it.
    if (typeof showPage === 'function') showPage('sim-lab-entry');
  }
  function _slSyncRoundChips() {
    var chips = document.querySelectorAll('#sle-rounds .sle-chip');
    Array.prototype.forEach.call(chips, function (c) {
      var on = parseInt(c.getAttribute('data-rounds'), 10) === _slPickedRounds;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function _slBindRoundChips() {
    var host = document.getElementById('sle-rounds');
    if (!host || host.__bound) return; host.__bound = true;
    host.addEventListener('click', function (e) {
      var chip = e.target.closest('.sle-chip'); if (!chip) return;
      var n = parseInt(chip.getAttribute('data-rounds'), 10);
      if (n === 10 && !_slIsPro()) {
        window._gateProOnly('Sim Lab', {
          title: 'Exam-length runs are a Pro sim.',
          body: 'Free runs 3 or 5 rounds. Pro opens the full 10-round exam-length sim on every cert, plus weak-spot tracking across sessions.'
        });
        return;
      }
      _slPickedRounds = n; _slSyncRoundChips();
      if (_slPickedMode === 'exam') _slSyncBudgetReadout();
    });
  }
  function simLabEntryBack() { if (typeof showPage === 'function') showPage('setup'); }

  // Pull up to 2 hand-reviewed seeds of distinct step types from the bank to use
  // as few-shot format/quality exemplars. Reads the live bank so they never drift.
  function _slPickExemplars(cert) {
    var bank = _slBank(cert);
    var picked = [], seenType = {};
    for (var i = 0; i < bank.length && picked.length < 2; i++) {
      var st = bank[i].steps && bank[i].steps[0];
      var t = st && st.type;
      if (t && !seenType[t] && simLabValidateScenario(bank[i]).ok) { seenType[t] = 1; picked.push(bank[i]); }
    }
    return picked;
  }

  function _slBuildPrompt(cert, objectiveHint) {
    var ex = _slPickExemplars(cert);
    var exText = ex.length
      ? ' Here ' + (ex.length === 1 ? 'is an example' : 'are example scenarios') +
        ' in the exact format — study the shape and the deterministic answers, then write a DIFFERENT scenario on another topic: '
        + ex.map(function (s) { return JSON.stringify(s); }).join(' ') + '.'
      : '';
    return 'Generate ONE CompTIA ' + cert + ' performance-based question as strict JSON matching this shape: '
      + '{id,cert,objective,topic,title,scenario,estMinutes,steps:[{id,type,prompt,explanation,points:1,payload,answer}]}. '
      + 'type is one of order|categorize|match|analyze|fillin. 1 to 4 steps. '
      + 'Answers must be deterministic and verifiably correct.' + exText
      + ' Do not copy the examples; cover a different objective or topic. Objective focus: ' + (objectiveHint || 'any core objective') + '. '
      + 'Return ONLY the JSON object, no prose.';
  }

  function _slGenerateScenario(cert, objectiveHint) {
    return Promise.resolve().then(function () {
      if (!_slFetcher) return null;
      return _slFetcher(_slBuildPrompt(cert, objectiveHint));
    }).then(function (raw) {
      if (raw) {
        var v = simLabValidateScenario(raw);
        if (v.ok) return raw;
      }
      var seed = _slPickSeed(cert);
      if (seed) return seed;
      throw new Error('Sim Lab: no scenario available for ' + cert);
    }).catch(function (e) {
      var seed = _slPickSeed(cert);
      if (seed) return seed;
      throw e;
    });
  }

  // --- Task 15: practice page + verdict + exit ---

  var _slMode = null, _slTimer = null;

  function _slShowPage() {
    // Real routing: showPage('sim-lab') manages .page.active via its own activate() closure.
    // showPage is always defined by app.js (loaded before features/sim-lab.js).
    if (typeof showPage === 'function') { showPage('sim-lab'); return; }
    // Safety no-op if somehow called before app.js (should never happen in production)
    if (typeof console !== 'undefined') console.warn('simLab: showPage not available');
  }

  function _slRenderPracticePage(scn, pro) {
    _slShowPage();
    // Defensive: the legacy single-scenario flow has no rounds — keep session-mode
    // chrome hidden so it can't leak in if both paths are ever exercised (mirrors simLabExit).
    var rp = document.getElementById('sl-round-pill'); if (rp) rp.classList.add('is-hidden');
    var rd = document.getElementById('sl-dots'); if (rd) rd.classList.add('is-hidden');
    var topicEl = document.getElementById('sl-topic'); if (topicEl) topicEl.textContent = scn.topic || 'PBQ';
    var timerSlot = document.getElementById('sl-timer-slot');
    if (timerSlot) timerSlot.innerHTML = '';
    if (_slTimer) _slTimer.stop();
    if (timerSlot) _slTimer = _slStartPracticeTimer(timerSlot, { estMinutes: scn.estMinutes });

    var body = document.getElementById('sl-body');
    _slMountScenario(body, scn, {
      onSubmit: function (result) {
        if (_slTimer) _slTimer.stop();
        _slTimer = null;
        body.innerHTML = '';
        _slRenderFeedback(body, scn, result, { mode: pro ? 'pro' : 'free' });
        var footer = _el('div', 'gnt-result-footer');
        var exit = _el('button', 'btn gnt-ghost', 'Back to Practice');
        exit.setAttribute('type', 'button'); exit.setAttribute('data-action', 'simLabExit');
        footer.appendChild(exit);
        body.appendChild(footer);
        if (typeof window.renderSimLabDrillsCard === 'function') window.renderSimLabDrillsCard(); // refresh pill (Task 16)
      }
    });
  }

  function simLabExit() {
    if (_slTimer) { _slTimer.stop(); _slTimer = null; }
    _slMode = null;
    _slSession = null;
    var p = document.getElementById('sl-round-pill'); if (p) p.classList.add('is-hidden');
    var d = document.getElementById('sl-dots'); if (d) d.classList.add('is-hidden');
    // Return to the Home (setup) page: that's where the Sim Lab entry now lives.
    if (typeof showPage === 'function') { showPage('setup'); return; }
    // Safety no-op (showPage is always defined by app.js before features/sim-lab.js runs)
    if (typeof console !== 'undefined') console.warn('simLab: showPage not available');
  }
  window.simLabExit = simLabExit;

  // --- Task 14: launcher + free-gating ---

  function _slIsPro() {
    return !!(window._quotaState && (window._quotaState.tier === 'pro' || window._quotaState.tier === 'admin'));
  }

  function simLabStart(opts) {
    opts = opts || {};
    var cert = opts.cert || (window.CURRENT_CERT || 'netplus');
    var pro = _slIsPro();
    if (!pro) {
      var used = (typeof window._pbqFreeRunsToday === 'function') ? window._pbqFreeRunsToday() : 0;
      var cap = window.PBQ_FREE_DAILY_CAP || 1;
      if (used >= cap) {
        return Promise.resolve(window._gateProOnly('Sim Lab', {
          title: "That's your free sim for today.",
          body: "You're in the rhythm now. Pro keeps it unlimited on every cert, with the full reasoning on every step, not just the ones you missed."
        }));
      }
    }
    if (!opts.__test && typeof window._slMeteredGenerate === 'function') {
      window._simLab.__setFetcher(window._slMeteredGenerate);
    }
    return _slGenerateScenario(cert, opts.objective).then(function (scn) {
      if (opts.__test) return true;
      if (typeof _slRenderPracticePage === 'function') { _slRenderPracticePage(scn, pro); return true; }
      return true; // Task 15 adds the page render
    }).catch(function () {
      if (typeof showToast === 'function') showToast('Sim Lab is not available for this cert yet.', 'info');
      return false;
    });
  }
  window.simLabStart = simLabStart;

  // --- Task 5: in-session round chrome + loader + round loop ---

  function _slUpdateChrome() {
    var pill = document.getElementById('sl-round-pill');
    if (pill) { pill.textContent = 'Round ' + (_slSession.idx + 1) + ' of ' + _slSession.rounds; pill.classList.remove('is-hidden'); }
    var dotsHost = document.getElementById('sl-dots');
    if (dotsHost) {
      dotsHost.classList.remove('is-hidden');
      dotsHost.innerHTML = '';
      for (var i = 0; i < _slSession.rounds; i++) {
        var d = _el('span', 'slr-dot' + (i < _slSession.idx ? ' done' : (i === _slSession.idx ? ' now' : '')));
        dotsHost.appendChild(d);
      }
    }
  }

  function _slRenderLoader(host, roundNum) {
    host.innerHTML = '';
    var box = _el('div', 'slr-loader');
    box.innerHTML = '<div class="slr-spin" aria-hidden="true"></div>' +
      '<div class="slr-loader-t">Building round ' + roundNum + '…</div>' +
      '<div class="slr-loader-s">A fresh scenario. This takes a few seconds.</div>';
    host.appendChild(box);
  }

  function _slSessionStart() {
    var cert = window.CURRENT_CERT || 'netplus';
    var pro = _slIsPro();
    if (!pro) {
      var used = (typeof window._pbqFreeRunsToday === 'function') ? window._pbqFreeRunsToday() : 0;
      var cap = window.PBQ_FREE_DAILY_CAP || 1;
      if (used >= cap) {
        return window._gateProOnly('Sim Lab', {
          title: "That's your free session for today.",
          body: "You're in the rhythm now. Pro keeps it unlimited on every cert, with the full reasoning on every step, not just the ones you missed."
        });
      }
    }
    _slSessionBumped = false;
    if (!pro) _slSessionBumpOnce();
    if (typeof window._slMeteredGenerate === 'function') window._simLab.__setFetcher(window._slMeteredGenerate);
    _slSession = { mode: 'practice', rounds: _slPickedRounds, idx: 0, pro: pro, cert: cert, results: [], usedSeedIds: new (window.Set || Set)(), prefetch: null, timer: null };
    if (typeof showPage === 'function') showPage('sim-lab');
    _slUpdateChrome();
    _slRunRound();
  }

  function _slRunRound() {
    var body = document.getElementById('sl-body');
    var topic = document.getElementById('sl-topic');
    _slUpdateChrome();
    _slRenderLoader(body, _slSession.idx + 1);
    _slGetRoundScenario().then(function (scn) {
      _slSession.usedSeedIds.add(scn.id);
      if (topic) topic.textContent = scn.topic || 'PBQ';
      var slot = document.getElementById('sl-timer-slot');
      if (slot) { slot.innerHTML = ''; _slSession.timer = _slStartPracticeTimer(slot, { estMinutes: scn.estMinutes }); }
      _slMountScenario(body, scn, {
        onSubmit: function (result) {
          if (_slSession.timer) { _slSession.timer.stop(); _slSession.timer = null; }
          var passed = result.fraction === 1;
          _slSession.results.push({ scenario: scn, score: result, passed: passed });
          _slSession.idx++;
          if (_slSession.idx >= _slSession.rounds) { _slRenderSummary(); }
          else { _slRunRound(); }
        }
      });
      _slStartPrefetch();
    });
  }

  function _slGetRoundScenario() {
    var pf = _slSession.prefetch;
    if (pf && pf.idx === _slSession.idx) {
      _slSession.prefetch = null;
      return pf.promise.then(function (scn) {
        // suspended/failed prefetch (e.g. iOS background) → regenerate on demand
        if (!scn || _slSession.usedSeedIds.has(scn.id)) return _slGenerateScenarioFresh(_slSession.cert, _slSession.usedSeedIds);
        return scn;
      });
    }
    return _slGenerateScenarioFresh(_slSession.cert, _slSession.usedSeedIds);
  }

  function _slGenerateScenarioFresh(cert, usedIds) {
    return _slGenerateScenario(cert).then(function (scn) {
      if (scn && usedIds.has(scn.id)) { var alt = _slPickSeedFresh(cert, usedIds); if (alt) return alt; }
      return scn;
    }).catch(function () { return _slPickSeedFresh(cert, usedIds); });
  }

  function _slStartPrefetch() {
    if (!_slSession) return;
    var nextIdx = _slSession.idx + 1;
    if (nextIdx >= _slSession.rounds) { _slSession.prefetch = null; return; }
    // one in flight; snapshot the used-set so the prefetched scenario stays distinct
    var snapshot = new Set(_slSession.usedSeedIds);
    var p = _slGenerateScenarioFresh(_slSession.cert, snapshot).then(function (scn) {
      return scn;
    }).catch(function () { return null; });
    _slSession.prefetch = { idx: nextIdx, promise: p };
  }
  function _slRenderSummary() {
    var pill = document.getElementById('sl-round-pill'); if (pill) pill.classList.add('is-hidden');
    var dots = document.getElementById('sl-dots'); if (dots) dots.classList.add('is-hidden');
    var agg = _slAggregateSession(_slSession.results);
    var pro = _slSession.pro;
    var root = document.getElementById('sl-result-root');
    root.innerHTML = '';
    root.appendChild(_el('span', 'sls-seal', '&#x2713; Session complete'));
    var score = _el('div', 'sls-score');
    score.innerHTML = '<span class="sls-score-n">' + agg.pct + '<small>%</small></span>' +
      '<span class="sls-score-cap">' + agg.passed + ' of ' + agg.rounds + ' sims passed &middot; ' + agg.stepsCorrect + ' of ' + agg.stepsTotal + ' steps</span>';
    root.appendChild(score);
    var rounds = _el('div', 'sls-rounds');
    _slSession.results.forEach(function (r) {
      var row = _el('div', 'sls-r');
      var ok = r.passed;
      row.appendChild(_el('span', 'sls-r-ic ' + (ok ? 'ok' : 'no'), ok ? '&#x2713;' : '&#x2717;'));
      var bodyc = _el('div', 'sls-r-body');
      bodyc.appendChild(_el('div', 'sls-r-title', _esc(r.scenario.topic || 'PBQ')));
      var reveal = pro || !ok; // free reveals "why" on missed rounds only
      if (reveal) bodyc.appendChild(_el('div', 'sls-r-why', _esc(_slFirstWhy(r))));
      else { var lk = _el('div', 'sls-r-why sls-why-locked'); lk.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>Pro shows the why on the ones you got right too'; bodyc.appendChild(lk); }
      row.appendChild(bodyc);
      row.appendChild(_el('span', 'sls-r-score', r.score.correct + '/' + r.score.total));
      rounds.appendChild(row);
    });
    root.appendChild(rounds);
    var cluster = _slWeakCluster(_slSession.results);
    if (cluster) {
      var ins = _el('div', 'sls-insight');
      ins.innerHTML = '<div class="sls-insight-k"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path><circle cx="12" cy="12" r="4"></circle></svg>Where you slipped</div><p>' + _esc(cluster) + '</p>';
      root.appendChild(ins);
    }
    if (pro && typeof window._slRecordWeakSpots === 'function') {
      var missedTopics = _slSession.results.filter(function (r) { return !r.passed; }).map(function (r) { return r.scenario.topic; });
      window._slRecordWeakSpots(missedTopics);
    }
    var back = _el('button', 'btn btn-primary gnt-cta', 'Back to Practice');
    back.setAttribute('type', 'button'); back.setAttribute('data-action', 'simLabExit');
    root.appendChild(back);
    if (!pro) {
      var up = _el('button', 'btn gnt-ghost', 'Go Pro &middot; exam-length runs + weak-spot tracking');
      up.setAttribute('type', 'button'); up.setAttribute('data-action', 'simLabSummaryUpsell');
      root.appendChild(up);
    }
    if (typeof showPage === 'function') showPage('sim-lab-result');
    if (typeof window.renderSimLabHomeEntry === 'function') window.renderSimLabHomeEntry();
  }
  function _slFirstWhy(r) {
    var steps = r.scenario.steps || [];
    for (var i = 0; i < steps.length; i++) { if (r.score.perStep[steps[i].id] === false) return steps[i].explanation; }
    return steps.length ? steps[0].explanation : '';
  }
  function _slWeakCluster(results) {
    var uniq = [];
    results.forEach(function (r) {
      if (r.passed) return;
      var t = r.scenario.topic;
      if (t && uniq.indexOf(t) === -1) uniq.push(t);
    });
    if (!uniq.length) return null;
    return 'Your misses were in ' + uniq.join(' and ') + '. Pro tracks this across every session and pulls your weak domains back in automatically.';
  }
  function simLabSummaryUpsell() {
    window._gateProOnly('Sim Lab', { title: 'Go Pro for the full sim.', body: 'Exam-length 10-round runs, unlimited sessions on every cert, the full reasoning on every step, and weak-spot tracking that pulls your misses back in.' });
  }

  // --- Task 16: Drills-page card with daily-state pill ---

  function renderSimLabDrillsCard() {
    var host = document.getElementById('page-drills');
    if (!host) return;
    var existing = document.getElementById('drills-simlab-card');
    if (existing) existing.remove();
    // Sim Lab (PBQs) only exists on CompTIA certs — absent everywhere else.
    if (_SL_PBQ_CERTS.indexOf(window.CURRENT_CERT || 'netplus') === -1) return;
    var pro = _slIsPro();
    var used = (typeof window._pbqFreeRunsToday === 'function') ? window._pbqFreeRunsToday() : 0;
    var cap = window.PBQ_FREE_DAILY_CAP || 1;
    var pill;
    if (!pro) {
      pill = (used >= cap)
        ? '<span id="drills-simlab-state" class="gnt-daily-pill is-spent">Done today</span>'
        : '<span id="drills-simlab-state" class="gnt-daily-pill">1 free today</span>';
    } else {
      pill = '<span id="drills-simlab-state" class="gnt-daily-pill">Pro</span>';
    }
    var card = document.createElement('div');
    card.className = 'drills-card';
    card.id = 'drills-simlab-card';
    card.innerHTML =
      '<div class="drills-card-head"><span class="drills-card-title">Sim Lab ' + pill + '</span></div>' +
      '<p class="drills-card-note">The exam opens with hands-on PBQs. One free sim a day.</p>' +
      '<button type="button" class="drills-btn" data-action="simLabLaunch">Start a sim →</button>';
    host.appendChild(card);
  }

  function simLabLaunch() {
    simLabStart({ cert: window.CURRENT_CERT || 'netplus' });
  }

  window.renderSimLabDrillsCard = renderSimLabDrillsCard;
  window.simLabLaunch = simLabLaunch;
  window.simLabSummaryUpsell = simLabSummaryUpsell;

  // --- exports (more added in later tasks) ---
  window.simLabValidateScenario = simLabValidateScenario;
  window.simLabScoreScenario = simLabScoreScenario;
  window.simLabSubmitScenario = simLabSubmitScenario;
  window._simLab = window._simLab || {};
  window._simLab.STEP_TYPES = STEP_TYPES;
  window._simLab.normalizeMatch = _simLabNormalizeMatch;
  window._simLab.bindMovable = _slBindMovable;
  window._simLab.renderStep = simLabRenderStep;
  window._simLab.mountScenario = _slMountScenario;
  window._simLab.renderFeedback = _slRenderFeedback;
  window._simLab.__test_moveOrder = function (el, id, idx) { el.__moveTo(id, idx); };
  window._simLab.startPracticeTimer = _slStartPracticeTimer;
  window._simLab.generateScenario = _slGenerateScenario;
  window._simLab.__setFetcher = function (fn) { _slFetcher = fn; };
  window._simLab.pickSeedFresh = _slPickSeedFresh;
  window._simLab.aggregateSession = _slAggregateSession;
  window._simLab.sessionBumpOnce = function () { _slSessionBumpOnce(); };
  window.simLabOpenEntry = simLabOpenEntry;
  window.simLabEntryBack = simLabEntryBack;
  window.simLabSessionStart = _slSessionStartDispatch;
  window._simLab.sessionRounds = function () { return _slPickedRounds; };
  window._simLab.hasPrefetch = function () { return !!(_slSession && _slSession.prefetch); };
  window._simLab.examBlankState = _slExamBlankState;
  window._simLab.computePace = function (results, roundMs, budgetMs, elapsedMs, parMs) {
    return _slComputePace(results, roundMs, budgetMs, elapsedMs, parMs);
  };
  window._simLab.examBudgetMs = _slExamBudgetMs;
  window._simLab.examParMs = _slExamParMs;
})();
