/* Sim Lab — PBQ drill (Plan 1: core + Practice mode). Lazy-loaded feature. */
(function () {
  'use strict';

  var STEP_TYPES = ['order', 'categorize', 'match', 'analyze', 'fillin', 'configure'];

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
      case 'configure':
        return Array.isArray(p.slots) && p.slots.length >= 1 &&
               a.slots && typeof a.slots === 'object' && !Array.isArray(a.slots) &&
               p.slots.every(function (sl) {
                 return _isNonEmptyStr(sl.id) && _isNonEmptyStr(sl.label) &&
                        Array.isArray(sl.options) && sl.options.length >= 2 &&
                        sl.options.every(function (o) { return _isNonEmptyStr(o.id) && _isNonEmptyStr(o.text); }) &&
                        _isNonEmptyStr(a.slots[sl.id]) &&
                        sl.options.some(function (o) { return o.id === a.slots[sl.id]; });
               });
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
    if (s.assets && s.assets.reference) {
      var ref = s.assets.reference, kinds = ['network', 'timeline', 'layered'];
      if (kinds.indexOf(ref.kind) === -1) errs.push('reference: bad kind');
      else if (ref.kind === 'network' && !Array.isArray(ref.devices)) errs.push('reference network: devices[] required');
      else if (ref.kind === 'timeline' && !Array.isArray(ref.stages)) errs.push('reference timeline: stages[] required');
      else if (ref.kind === 'layered' && !Array.isArray(ref.layers)) errs.push('reference layered: layers[] required');
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

  function _scoreConfigureSlots(step, resp) {
    var ans = step.answer.slots, total = 0, correct = 0;
    Object.keys(ans).forEach(function (slotId) {
      total++;
      if (resp && resp.slots && resp.slots[slotId] === ans[slotId]) correct++;
    });
    return { total: total, correct: correct };
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
      case 'configure':
        var _sc = _scoreConfigureSlots(step, resp);
        return _sc.total > 0 && _sc.correct === _sc.total;
      default: return false;
    }
  }

  function simLabScoreScenario(scn, responses) {
    var perStep = {}, correct = 0, total = 0;
    scn.steps.forEach(function (st) {
      var resp = responses ? responses[st.id] : null;
      if (st.type === 'configure') {
        var sc = _scoreConfigureSlots(st, resp);
        perStep[st.id] = sc;            // { total, correct } breakdown for configure
        correct += sc.correct; total += sc.total;
      } else {
        var ok = _scoreStep(st, resp);
        perStep[st.id] = ok;            // boolean for existing types
        if (ok) correct++; total++;
      }
    });
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
  function _slRenderOrder(step, onChange, initial) {
    var order = step.payload.items.map(function (it) { return it.id; }); // initial = given order
    // Re-hydrate from a saved response: adopt the prior order if it's a valid
    // permutation of this step's items (ignore anything stale/mismatched).
    if (initial && Array.isArray(initial.order) && initial.order.length === order.length &&
        initial.order.slice().sort().join(' ') === order.slice().sort().join(' ')) {
      order = initial.order.slice();
    }
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
  function _slRenderCategorize(step, onChange, initial) {
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

    function place(itemId, bucketId) {
      map[itemId] = bucketId;
      var chip = root.querySelector('.sl-chip[data-item="' + _slAttr(itemId) + '"]');
      var drop = root.querySelector('.sl-cat-drop[data-target="' + _slAttr(bucketId) + '"]');
      if (chip && drop) drop.appendChild(chip);
      onChange({ map: Object.assign({}, map) });
    }
    _slBindMovable(root, {
      itemSel: '.sl-chip', targetSel: '.sl-cat-drop',
      onPlace: place
    });
    // Re-hydrate: replay saved placements through the same path so the chips
    // visually land in their buckets and the reported state matches.
    if (initial && initial.map && typeof initial.map === 'object') {
      Object.keys(initial.map).forEach(function (itemId) {
        var bucketId = initial.map[itemId];
        if (root.querySelector('.sl-chip[data-item="' + _slAttr(itemId) + '"]') &&
            root.querySelector('.sl-cat-drop[data-target="' + _slAttr(bucketId) + '"]')) {
          place(itemId, bucketId);
        }
      });
    } else {
      onChange({ map: {} });
    }
    return root;
  }

  // --- analyze renderer ---
  function _slRenderAnalyze(step, onChange, initial) {
    var multi = !!step.payload.multi;
    var selected = [];
    var root = _el('div', 'sl-analyze');
    root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
    var block = _el('div', 'sl-analyze-block'); root.appendChild(block);

    step.payload.lines.forEach(function (ln) {
      var row = _el('button', 'sl-analyze-line');
      row.setAttribute('type', 'button'); row.setAttribute('data-line', ln.id);
      var lab = _el('span', 'dl-lab', _esc(ln.text));
      row.textContent = '';
      row.appendChild(lab);
      if (ln.why) { row.appendChild(_el('span', 'dl-why', _esc(ln.why))); }
      row.appendChild(_el('span', 'dl-verdict', ''));
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
    // Re-hydrate: restore prior selection (only ids that exist on this step) and
    // paint the selected rows so the choice is visible again.
    if (initial && Array.isArray(initial.selected)) {
      var valid = {};
      step.payload.lines.forEach(function (ln) { valid[ln.id] = true; });
      selected = initial.selected.filter(function (id) { return valid[id]; });
      if (!multi && selected.length > 1) selected = selected.slice(0, 1);
      Array.prototype.forEach.call(block.children, function (c) {
        c.classList.toggle('sl-sel', selected.indexOf(c.getAttribute('data-line')) !== -1);
      });
    }
    onChange({ selected: selected.slice() });
    return root;
  }

  // --- match renderer ---
  function _slRenderMatch(step, onChange, initial) {
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

    function place(leftId, rightId) {
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
    _slBindMovable(root, {
      itemSel: '.sl-match-l', targetSel: '.sl-match-r',
      onPlace: place
    });
    // Re-hydrate: replay saved pairs through the same path so each left item shows
    // its "→ right" tag again and the reported state matches.
    if (initial && initial.pairs && typeof initial.pairs === 'object') {
      Object.keys(initial.pairs).forEach(function (leftId) {
        var rightId = initial.pairs[leftId];
        if (root.querySelector('.sl-match-l[data-item="' + _slAttr(leftId) + '"]') &&
            step.payload.right.some(function (x) { return x.id === rightId; })) {
          place(leftId, rightId);
        }
      });
    } else {
      onChange({ pairs: {} });
    }
    return root;
  }

  // --- fillin renderer ---
  function _slRenderFillin(step, onChange, initial) {
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
      // Re-hydrate: restore the prior typed value into the input (response shape
      // is a flat {fieldId: string} map).
      if (initial && typeof initial === 'object' && typeof initial[f.id] === 'string') {
        input.value = initial[f.id];
        vals[f.id] = initial[f.id];
      }
      wrap.appendChild(input);
      root.appendChild(wrap);
    });
    onChange(Object.assign({}, vals));
    return root;
  }

  // --- configure renderer ---
  // Renders one native <select> per slot. Native selects are chosen deliberately:
  // they use the platform wheel picker on iOS and are universally accessible
  // without custom ARIA. CSS comes in Task 4; class names are locked here.
  function _slRenderConfigure(step, onChange, initial) {
    var resp = (initial && initial.slots && typeof initial.slots === 'object')
      ? Object.assign({}, initial.slots)
      : {};
    var root = _el('div', 'sl-cfg');
    root.appendChild(_el('p', 'sl-prompt', _esc(step.prompt)));
    step.payload.slots.forEach(function (sl) {
      var wrap = _el('div', 'sl-cfg-slot');
      wrap.appendChild(_el('label', 'sl-cfg-label', _esc(sl.label)));
      var sel = document.createElement('select');
      sel.className = 'sl-cfg-select';
      sel.setAttribute('data-slot', sl.id);
      var ph = document.createElement('option');
      ph.value = ''; ph.textContent = 'Choose…'; sel.appendChild(ph);
      sl.options.forEach(function (o) {
        var op = document.createElement('option');
        op.value = o.id; op.textContent = o.text;
        if (resp[sl.id] === o.id) { op.selected = true; }
        sel.appendChild(op);
      });
      sel.addEventListener('change', function () {
        if (sel.value) { resp[sl.id] = sel.value; } else { delete resp[sl.id]; }
        onChange({ slots: Object.assign({}, resp) });
      });
      wrap.appendChild(sel);
      root.appendChild(wrap);
    });
    onChange({ slots: Object.assign({}, resp) }); // report initial state
    return root;
  }

  // --- renderStep dispatcher ---
  // `initial` (optional) seeds the widget with a prior response so it re-hydrates
  // visually — used by exam free-nav to restore a saved round. Omitted in
  // practice/session mode, where every step starts blank (behaviour unchanged).
  function simLabRenderStep(step, onChange, initial) {
    switch (step.type) {
      case 'order': return _slRenderOrder(step, onChange, initial);
      case 'categorize': return _slRenderCategorize(step, onChange, initial);
      case 'match': return _slRenderMatch(step, onChange, initial);
      case 'analyze': return _slRenderAnalyze(step, onChange, initial);
      case 'fillin': return _slRenderFillin(step, onChange, initial);
      case 'configure': return _slRenderConfigure(step, onChange, initial);
      default: return _el('div', 'sl-unknown', 'Unsupported step');
    }
  }

  // --- reference asset renderers (Task 5 — stubs; replaced by Tasks 6-8) ---

  // Real network reference renderer (Task 6). Data-driven: the mockups supply
  // VISUAL STYLE only; layout is computed from each device's small-int grid
  // coords so it works for any scenario, not just the dev fixture. Read-only
  // (no listeners). SVG is built as a string and mounted via
  // _el('div','sl-net', svg) so it is inert and trivially assertable. The
  // glyph map lives inside the fn so the unit is self-contained.
  function _slRenderRefNetwork(ref) {
    // Monoline device glyphs (lifted from mockups/diagram-pbq-concept.html;
    // each is drawn in a ~16px box and centered on the node by the renderer).
    // Stroke is currentColor via .sl-glyph so state overlays recolour it.
    var _SL_NET_GLYPHS = {
      router:   { d: 'M1 8h7m-3.5-3.5v7M10 4l5 4-5 4', w: 16, h: 16 },
      'switch': { d: 'M5 3l-5 5 5 5M13 3l5 5-5 5',     w: 18, h: 16 },
      server:   { d: 'M0 3h16v10H0zM0 8h16',           w: 16, h: 16 },
      pc:       { d: 'M0 3h16v9H0zM5 16h6',            w: 16, h: 18 },
      firewall: { d: 'M0 2h16v12H0zM0 6h16M0 10h16M5 2v4M11 2v4M3 6v4M8 6v4M13 6v4', w: 16, h: 16 },
      box:      { d: 'M1 3h14v10H1z',                  w: 16, h: 16 }
    };
    var root = _el('div', 'sl-net-ref');
    if (!ref || !Array.isArray(ref.devices)) { return root; }

    var CELL_W = 150, CELL_H = 110, NODE_W = 128, NODE_H = 62, PAD = 24;
    var ZONE_PAD = 20, ZONE_LABEL_PAD = 34;
    var devices = ref.devices, links = Array.isArray(ref.links) ? ref.links : [];

    // index by id + precompute geometry; track max extents for the viewBox
    var byId = {}, geo = {}, maxRight = 0, maxBottom = 0, i;
    for (i = 0; i < devices.length; i++) {
      var d = devices[i];
      var nx = PAD + (d.x || 0) * CELL_W;
      var ny = PAD + (d.y || 0) * CELL_H;
      geo[d.id] = { nx: nx, ny: ny, cx: nx + NODE_W / 2, cy: ny + NODE_H / 2 };
      byId[d.id] = d;
      if (nx + NODE_W > maxRight) maxRight = nx + NODE_W;
      if (ny + NODE_H > maxBottom) maxBottom = ny + NODE_H;
    }
    var W = maxRight + PAD, H = maxBottom + PAD;

    // zones: bounding box per distinct (truthy) zone — devices with a falsy
    // zone (router/firewall/internet) sit outside any zone box.
    var zoneOrder = [], zoneBox = {};
    for (i = 0; i < devices.length; i++) {
      var dv = devices[i];
      if (!dv.zone) continue;
      var zg = geo[dv.id];
      if (!zoneBox[dv.zone]) {
        zoneOrder.push(dv.zone);
        zoneBox[dv.zone] = { x1: zg.nx, y1: zg.ny, x2: zg.nx + NODE_W, y2: zg.ny + NODE_H };
      } else {
        var zb = zoneBox[dv.zone];
        if (zg.nx < zb.x1) zb.x1 = zg.nx;
        if (zg.ny < zb.y1) zb.y1 = zg.ny;
        if (zg.nx + NODE_W > zb.x2) zb.x2 = zg.nx + NODE_W;
        if (zg.ny + NODE_H > zb.y2) zb.y2 = zg.ny + NODE_H;
      }
    }

    var svg = [];
    svg.push('<svg class="sl-net-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
             'aria-label="Network diagram reference" preserveAspectRatio="xMidYMid meet">');
    // arrow marker for attack links (lifted from incident-response mockup)
    svg.push('<defs><marker id="sl-net-arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">' +
             '<path d="M0 0L6 3L0 6z" class="sl-net-arrowhead"/></marker></defs>');

    // zones first (behind nodes)
    for (i = 0; i < zoneOrder.length; i++) {
      var zname = zoneOrder[i], box = zoneBox[zname];
      var zx = box.x1 - ZONE_PAD, zy = box.y1 - ZONE_LABEL_PAD;
      var zw = (box.x2 - box.x1) + ZONE_PAD * 2;
      var zh = (box.y2 - box.y1) + ZONE_LABEL_PAD + ZONE_PAD;
      svg.push('<rect class="sl-vlan-zone" x="' + zx + '" y="' + zy + '" width="' + zw +
               '" height="' + zh + '" rx="16"/>');
      svg.push('<text class="sl-zone-lbl" x="' + (zx + 14) + '" y="' + (zy + 20) + '">' +
               _esc(String(zname).toUpperCase()) + '</text>');
    }

    // links (node-center to node-center)
    for (i = 0; i < links.length; i++) {
      var lk = links[i];
      var a = geo[lk.from], b = geo[lk.to];
      if (!a || !b) continue;
      var attack = lk.kind === 'attack';
      svg.push('<line class="sl-link' + (attack ? ' attack' : '') + '" x1="' + a.cx + '" y1="' + a.cy +
               '" x2="' + b.cx + '" y2="' + b.cy + '"' +
               (attack ? ' marker-end="url(#sl-net-arrow)"' : '') + '/>');
    }

    // nodes (centered-stack: rect + glyph-on-top + name/ip centered)
    for (i = 0; i < devices.length; i++) {
      var nd = devices[i], ng = geo[nd.id];
      var stateCls = nd.state === 'compromised' ? ' compromised'
                   : (nd.state === 'affected' ? ' affected' : '');
      var gl = _SL_NET_GLYPHS[nd.type] || _SL_NET_GLYPHS.box;
      var glX = ng.nx + (NODE_W - gl.w) / 2;
      var cxText = ng.nx + NODE_W / 2;
      svg.push('<g class="sl-node' + stateCls + '">');
      svg.push('<rect class="sl-node-box" x="' + ng.nx + '" y="' + ng.ny + '" width="' + NODE_W +
               '" height="' + NODE_H + '" rx="12"/>');
      svg.push('<path class="sl-glyph" transform="translate(' + glX + ',' + (ng.ny + 9) + ')" d="' + gl.d + '"/>');
      svg.push('<text class="sl-node-name" x="' + cxText + '" y="' + (ng.ny + 40) + '">' + _esc(nd.label) + '</text>');
      if (nd.ip) {
        svg.push('<text class="sl-node-ip" x="' + cxText + '" y="' + (ng.ny + 54) + '">' + _esc(nd.ip) + '</text>');
      }
      svg.push('</g>');
    }

    svg.push('</svg>');
    root.appendChild(_el('div', 'sl-net', svg.join('')));

    // optional read-only given panel + mono CLI block
    var given = ref.given;
    if (given) {
      if (given.networkId || given.mask) {
        var rows = '';
        if (given.networkId) rows += '<div class="sl-net-row"><span class="k">Network ID</span><span class="v">' + _esc(given.networkId) + '</span></div>';
        if (given.mask) rows += '<div class="sl-net-row"><span class="k">Subnet mask</span><span class="v">' + _esc(given.mask) + '</span></div>';
        root.appendChild(_el('div', 'sl-net-given', rows));
      }
      if (Array.isArray(given.cli) && given.cli.length) {
        var lines = [];
        for (i = 0; i < given.cli.length; i++) lines.push(_esc(given.cli[i]));
        root.appendChild(_el('div', 'sl-net-cli', lines.join('<br>')));
      }
    }

    return root;
  }
  // Real timeline reference renderer (Task 7). Data-driven: ref.stages[] drives
  // one .sl-stage row per entry. Faithful lift from mockups/incident-response-pbq-concept.html
  // (.timeline / .stage / .rail / .dot / .line / .body / .when / .what / .sevtag).
  // severity → sev-low|sev-med|sev-high|sev-crit on the stage (drives --sev token).
  // The .sl-line connector is OMITTED on the last stage. ES5, read-only.
  function _slRenderRefTimeline(ref) {
    var stages = Array.isArray(ref.stages) ? ref.stages : [];
    var rows = [];
    for (var i = 0; i < stages.length; i++) {
      var st = stages[i];
      var sev = st.severity || 'low';
      var sevCls = 'sev-' + sev;
      var isLast = (i === stages.length - 1);

      // rail: dot + optional connecting line
      var railInner = '<span class="sl-dot"></span>' + (isLast ? '' : '<span class="sl-line"></span>');
      var rail = '<div class="sl-rail">' + railInner + '</div>';

      // body: optional time, label, severity tag
      var whenHtml = st.time ? '<div class="sl-when">' + _esc(st.time) + '</div>' : '';
      var whatHtml = '<div class="sl-what">' + _esc(st.label) + '</div>';
      var tagHtml  = '<span class="sl-sevtag">' + _esc(sev) + '</span>';
      var body = '<div class="sl-body">' + whenHtml + whatHtml + tagHtml + '</div>';

      rows.push('<div class="sl-stage ' + sevCls + '">' + rail + body + '</div>');
    }
    return _el('div', 'sl-timeline', rows.join(''));
  }
  function _slRenderRefLayered(ref) {
    // Defense-in-depth nested-frames renderer (Task 8).
    // Layout: concentric SVG rectangles — layers[0] = outermost frame, each
    // subsequent layer inset INSET_X px left/right/bottom and INSET_TOP px top
    // (room for the layer label), then the core innermost. viewBox scales with
    // layer count: outer = CORE_W + 2*INSET_X*N wide, CORE_H + (INSET_X+INSET_TOP)*N tall.
    var layers = Array.isArray(ref.layers) ? ref.layers : [];
    var core   = ref.core || { label: 'Core', assets: [] };
    var assets = Array.isArray(core.assets) ? core.assets : [];
    var N = layers.length;

    var INSET_X   = 46;   // left/right/bottom inset per level
    var INSET_TOP = 52;   // top inset (label room) per level
    var CORE_W    = 200;  // minimum core inner width
    var CORE_H    = 120;  // minimum core inner height
    var RX        = 14;   // corner radius for all frames
    var DEV_W     = 90;   // device node width
    var DEV_H     = 42;   // device node height
    var DEV_GAP   = 12;   // gap between device nodes

    // Outer frame dimensions grow outward from the core
    var outerW = CORE_W + 2 * INSET_X * N;
    var outerH = CORE_H + (INSET_X + INSET_TOP) * N;
    // Add padding around the outer frame
    var PAD = 8;
    var VW  = outerW + PAD * 2;
    var VH  = outerH + PAD * 2;

    var parts = [];

    // Render each layer frame, outer to inner (layers[0] = outer)
    for (var i = 0; i < N; i++) {
      var lyr  = layers[i];
      var depth = i; // 0 = outermost
      var lx = PAD + INSET_X * depth;
      var ly = PAD + INSET_TOP * depth;
      var lw = outerW - 2 * INSET_X * depth;
      var lh = outerH - (INSET_X + INSET_TOP) * depth;
      var isMissing = lyr.state === 'missing';
      var frameCls = isMissing ? 'sl-misslayer' : 'sl-layer';
      var labelText = _esc(lyr.label) + (lyr.control ? ' — ' + _esc(lyr.control) : '');
      var missingTag = isMissing ? ' <tspan class="sl-misslayer-tag">missing</tspan>' : '';
      parts.push(
        '<rect class="' + frameCls + '" x="' + lx + '" y="' + ly +
        '" width="' + lw + '" height="' + lh + '" rx="' + RX + '"/>' +
        '<text class="sl-layer-lbl' + (isMissing ? ' sl-layer-lbl-miss' : '') + '" x="' + (lx + 14) + '" y="' + (ly + 22) + '">' +
        labelText + missingTag + '</text>'
      );
    }

    // Core frame — innermost rectangle
    var coreX = PAD + INSET_X * N;
    var coreY = PAD + INSET_TOP * N;
    var coreW = CORE_W;
    var coreH = CORE_H;
    var anyExposed = assets.some(function (a) { return a.exposed; });
    var coreCls = anyExposed ? 'sl-core-exposed' : 'sl-core';
    var coreLabelCls = anyExposed ? 'sl-core-lbl sl-core-lbl-exp' : 'sl-core-lbl';
    parts.push(
      '<rect class="' + coreCls + '" x="' + coreX + '" y="' + coreY +
      '" width="' + coreW + '" height="' + coreH + '" rx="' + RX + '"/>' +
      '<text class="' + coreLabelCls + '" x="' + (coreX + 10) + '" y="' + (coreY + 16) + '">' +
      _esc(core.label) + '</text>'
    );

    // Device nodes inside the core, laid out in a row centred horizontally
    var totalDevW = assets.length * DEV_W + (assets.length - 1) * DEV_GAP;
    var devStartX = coreX + Math.max(0, Math.floor((coreW - totalDevW) / 2));
    var devY = coreY + coreH - DEV_H - 10;
    for (var j = 0; j < assets.length; j++) {
      var ast = assets[j];
      var dx  = devStartX + j * (DEV_W + DEV_GAP);
      var dy  = devY;
      var expd = ast.exposed;
      var devBoxCls  = expd ? 'sl-dev-box sl-dev-box-exp' : 'sl-dev-box';
      var devNameCls = expd ? 'sl-dev-nm sl-dev-nm-exp'   : 'sl-dev-nm';
      parts.push(
        '<g class="sl-dev' + (expd ? ' exposed' : '') + '" transform="translate(' + dx + ',' + dy + ')">' +
        '<rect class="' + devBoxCls + '" width="' + DEV_W + '" height="' + DEV_H + '" rx="7"/>' +
        '<text class="' + devNameCls + '" x="' + Math.floor(DEV_W / 2) + '" y="' + Math.floor(DEV_H / 2 + 5) + '">' +
        _esc(ast.label) + '</text>' +
        '</g>'
      );
    }

    var svgStr =
      '<svg class="sl-layered-svg" viewBox="0 0 ' + VW + ' ' + VH + '" xmlns="http://www.w3.org/2000/svg">' +
      parts.join('') +
      '</svg>';

    return _el('div', 'sl-layered', svgStr);
  }
  function _slRenderReference(ref) {
    if (!ref || !ref.kind) return null;
    var panel = _el('div', 'sl-ref');
    if (ref.kind === 'network') panel.appendChild(_slRenderRefNetwork(ref));
    else if (ref.kind === 'timeline') panel.appendChild(_slRenderRefTimeline(ref));
    else if (ref.kind === 'layered') panel.appendChild(_slRenderRefLayered(ref));
    return panel;
  }

  // --- scenario orchestrator (Task 10) ---
  // opts.initial (optional): a per-step seed map { stepId: response } used by exam
  // free-nav to re-hydrate a previously-answered round. Practice/session mode omits
  // it, so every step mounts blank exactly as before. The live `responses` object
  // is exposed on window.__slResponses so the exam layer can snapshot REAL answers
  // (user interactions mutate this same object via each step's onChange).
  function _slMountScenario(host, scn, opts) {
    var responses = {};
    var initial = (opts && opts.initial) || null;
    host.innerHTML = '';
    var wrap = _el('div', 'sl-scenario');
    wrap.appendChild(_el('div', 'sl-scn-prose', _esc(scn.scenario)));
    if (scn.assets && Array.isArray(scn.assets.logs) && scn.assets.logs.length) {
      var pre = _el('pre', 'sl-scn-logs');
      pre.textContent = scn.assets.logs.join('\n');
      wrap.appendChild(pre);
    }
    if (scn.assets && scn.assets.reference) {
      var refPanel = _slRenderReference(scn.assets.reference);
      if (refPanel) wrap.appendChild(refPanel);
    }
    scn.steps.forEach(function (st, i) {
      var stepWrap = _el('div', 'sl-step');
      stepWrap.appendChild(_el('div', 'sl-step-k', 'Step ' + (i + 1) + ' of ' + scn.steps.length));
      var seed = initial ? initial[st.id] : null;
      var el = simLabRenderStep(st, function (resp) { responses[st.id] = resp; }, seed);
      stepWrap.appendChild(el);
      wrap.appendChild(stepWrap);
    });
    // Expose the live responses object so the exam layer can snapshot real answers
    // (closure over `responses`; user edits flow into it via each onChange).
    window.__slResponses = responses;
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
  // Shared cert->seed-bank resolver. Reads the live window global each call so a
  // lazily injected bank is picked up without re-wiring. Unknown/contentless certs return [].
  function _seedBank(registry, cert) {
    var g = registry[cert];
    var b = g && window[g];
    return Array.isArray(b) ? b : [];
  }

  var _SL_SEED_GLOBALS = {
    netplus: 'SIM_LAB_SEED_NETPLUS',
    secplus: 'SIM_LAB_SEED_SECPLUS',
    'aplus-core1': 'SIM_LAB_SEED_APLUS_CORE1',
    'aplus-core2': 'SIM_LAB_SEED_APLUS_CORE2'
  };
  function _slBank(cert) { return _seedBank(_SL_SEED_GLOBALS, cert); }

  // --- Decision Lab: cloud-fundamentals cert allowlist + seed registry (spec 3.2) ---
  var _DL_CERTS = ['az900', 'ai900', 'sc900', 'clfc02'];
  var _DL_SEED_GLOBALS = {
    az900: 'DECISION_LAB_SEED_AZ900',
    ai900: 'DECISION_LAB_SEED_AI900',
    sc900: 'DECISION_LAB_SEED_SC900',
    clfc02: 'DECISION_LAB_SEED_CLFC02'
  };
  function _dlBank(cert) { return _seedBank(_DL_SEED_GLOBALS, cert); }

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

  // --- Decision Lab entry state + Pro gate (Task 3) ---
  var _dlPickedMode = 'practice';
  var _dlPickedDecisions = 10;

  // Spec §4 — EXACT gate copy. Do not paraphrase. Keyed by the locked surface.
  var _DL_GATE = {
    exam: {
      title: 'Exam-style mode is Pro',
      body: "The real exam never explains why your pick was wrong, and never gives you the clock back. Exam-style runs a timed, no-feedback set so the first time you feel that pressure isn't on test day. Pro unlocks it, plus unlimited sets and weak-spots that follow you across sessions.",
      primary: 'Go Pro', secondary: 'Keep practicing'
    },
    full20: {
      title: 'The full 20-decision set is Pro',
      body: 'Short sets warm you up; the real exam is a marathon of back-to-back calls. The 20-set rehearses that stamina. Pro removes the cap.'
    },
    second: {
      title: "That's today's free set",
      body: 'Come back tomorrow free, or go Pro to keep drilling now while the misses are fresh. Same-day re-drill on the services you just confused is where the look-alikes stick.',
      primary: 'Continue with Pro', secondary: 'Remind me tomorrow'
    }
  };
  function _dlGateCopy(which) { return _DL_GATE[which]; }

  function _dlSyncEntry() {
    var opts = document.querySelectorAll('#dl-mode .dl-seg-opt');
    Array.prototype.forEach.call(opts, function (o) {
      var on = o.getAttribute('data-mode') === _dlPickedMode;
      o.classList.toggle('is-on', on);
      o.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var chips = document.querySelectorAll('#dl-decisions .dl-chip');
    Array.prototype.forEach.call(chips, function (c) {
      var on = parseInt(c.getAttribute('data-decisions'), 10) === _dlPickedDecisions;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function _dlBindModeToggle() {
    var host = document.getElementById('dl-mode');
    if (!host || host.__bound) return; host.__bound = true;
    host.addEventListener('click', function (e) {
      var opt = e.target.closest('.dl-seg-opt'); if (!opt) return;
      var m = opt.getAttribute('data-mode');
      if (m === 'exam' && !_slIsPro()) { window._gateProOnly('Decision Lab', _dlGateCopy('exam')); return; }
      _dlPickedMode = m; _dlSyncEntry();
    });
  }

  function _dlBindDecisionChips() {
    var host = document.getElementById('dl-decisions');
    if (!host || host.__bound) return; host.__bound = true;
    host.addEventListener('click', function (e) {
      var chip = e.target.closest('.dl-chip'); if (!chip) return;
      var n = parseInt(chip.getAttribute('data-decisions'), 10);
      if (n === 20 && !_slIsPro()) { window._gateProOnly('Decision Lab', _dlGateCopy('full20')); return; }
      _dlPickedDecisions = n; _dlSyncEntry();
    });
  }

  // Cert target label from the live pack (honest names; spec §6 — no hardcoded cert).
  function _dlTargetLabel() {
    var pack = window.CERT_PACK && window.CERT_PACK.meta;
    if (pack && pack.name) return 'Mixed · ' + pack.name + (pack.code ? ' ' + pack.code : '');
    return 'Mixed';
  }

  // --- Decision Lab runner / session (Task 4) ---
  var _dlSession = null;

  // Build a set of `count` Decision Lab scenarios for `cert` from _dlBank,
  // no-repeat, rotating by minute so re-runs vary. Returns [] if the bank is
  // empty (the runner then shows the empty state).
  function _dlBuildSet(cert, count) {
    var bank = _dlBank(cert).filter(function (s) { return simLabValidateScenario(s).ok; });
    if (!bank.length) return [];
    var start = (new Date().getMinutes()) % bank.length;
    var out = [];
    for (var i = 0; i < bank.length && out.length < count; i++) {
      out.push(bank[(start + i) % bank.length]);
    }
    return out;
  }

  function _dlUpdateChrome() {
    var pill = document.getElementById('dl-round-pill');
    if (pill) {
      pill.classList.remove('is-hidden');
      pill.textContent = 'Decision ' + (_dlSession.idx + 1) + ' of ' + _dlSession.rounds;
    }
    var dots = document.getElementById('dl-dots');
    if (dots) {
      dots.classList.remove('is-hidden');
      dots.innerHTML = '';
      for (var i = 0; i < _dlSession.rounds; i++) {
        var cls = 'dl-dot' + (i < _dlSession.idx ? ' done' : (i === _dlSession.idx ? ' now' : ''));
        dots.appendChild(_el('span', cls));
      }
    }
  }

  function _dlSessionStart() {
    var cert = window.CURRENT_CERT || 'az900';
    var set = _dlBuildSet(cert, _dlPickedDecisions);
    _dlSession = {
      mode: _dlPickedMode, rounds: set.length, idx: 0, pro: _slIsPro(),
      cert: cert, scenarios: set, results: [],
      deadlineMs: 0, budgetMs: 0, clock: null, amber: false, view: 'round'
    };
    if (typeof showPage === 'function') showPage('decision-lab');
    if (!set.length) { _dlRenderEmpty(); return; }
    if (_dlSession.mode === 'exam') { _dlStartExamStyle(); return; }   // Task 6
    _dlRunRound();
  }

  function _dlRenderEmpty() {
    var body = document.getElementById('dl-body');
    if (body) body.innerHTML = '<p class="dl-scn">No decision scenarios are loaded for this cert yet.</p>';
  }

  // Render the current round: scenario->pick analyze via _slMountScenario, with
  // Decision Lab chrome. Practice grade-reveal is wired in Task 5; exam-style
  // suppression in Task 6. Here: render + advance on submit.
  function _dlAdvance() {
    _dlSession.idx++;
    if (_dlSession.idx >= _dlSession.rounds) {
      if (_dlSession.mode === 'exam') { _dlExamSubmit(false); } else { _dlRenderResult(); }
    } else { _dlRunRound(); }
  }

  function _dlRunRound() {
    _dlUpdateChrome();
    var scn = _dlSession.scenarios[_dlSession.idx];
    var step = scn.steps[0];   // the hero scenario->pick is a single analyze step
    var body = document.getElementById('dl-body');
    body.innerHTML = '';
    _slMountScenario(body, scn, {
      onSubmit: function (result) {
        _dlSession.results.push({ scenario: scn, score: result, passed: result.fraction === 1, responses: result.responses });
        if (_dlSession.mode === 'exam') { _dlAdvance(); return; }   // exam-style: no reveal (Task 6 overrides flow)
        // Practice: grade in place with per-option reasoning, then offer Next.
        var picked = (result.responses && result.responses[step.id] && result.responses[step.id].selected) || [];
        var host = body.querySelector('.sl-scenario') || body;
        _dlGradeAnalyze(host, step, picked);
        var oldSubmit = body.querySelector('[data-action="simLabSubmitScenario"]');
        if (oldSubmit) oldSubmit.remove();
        var row = _el('div', 'dl-cta-row');
        var flag = _el('button', 'dl-cta ghost', 'Flag'); flag.setAttribute('type', 'button');
        var next = _el('button', 'dl-cta',
          _dlSession.idx + 1 >= _dlSession.rounds ? 'See results →' : 'Next decision →');
        next.setAttribute('type', 'button');
        next.addEventListener('click', _dlAdvance);
        row.appendChild(flag); row.appendChild(next);
        host.appendChild(row);
        // §8 tall-card: keep the primary CTA reachable after the reveal grows the card.
        if (next.scrollIntoView) next.scrollIntoView({ block: 'nearest' });
      }
    });
    // Shared-responsibility sorter: if the round's step is a categorize with a
    // services array, mount the service selector that shifts the boundary (Task 7).
    var first = scn.steps[0];
    if (first && first.type === 'categorize' && first.payload && first.payload.services) {
      var host2 = body.querySelector('.sl-scenario') || body;
      _dlBindServiceSelector(host2, first);
    }
  }

  // Shared-responsibility sorter (spec §7). The step is a normal `categorize`
  // step PLUS payload.services: [{ id, label, map:{itemId:bucketId} }]. Selecting
  // a service swaps the step's answer map to that service's boundary (the
  // boundary-shift) and re-grades on Submit. Placed tokens follow the new map.
  function _dlBindServiceSelector(host, step) {
    var services = step.payload && step.payload.services;
    if (!Array.isArray(services) || !services.length) return;
    var bar = _el('div', 'dl-srv-sel');
    var active = 0;
    services.forEach(function (svc, i) {
      var b = _el('button', 'dl-srv' + (i === 0 ? ' on' : ''), _esc(svc.label));
      b.setAttribute('type', 'button'); b.setAttribute('data-svc', svc.id);
      b.addEventListener('click', function () {
        if (active === i) return;
        active = i;
        Array.prototype.forEach.call(bar.children, function (c, n) { c.classList.toggle('on', n === i); });
        // boundary-shift: swap the answer map so Submit grades the new service.
        step.answer = step.answer || {};
        step.answer.map = Object.assign({}, services[i].map);
        _dlReplaceTokens(host, step, services[i].map);
      });
      bar.appendChild(b);
    });
    // initial boundary = first service
    step.answer = step.answer || {};
    step.answer.map = Object.assign({}, services[0].map);
    var stepEl = host.querySelector('.sl-cat');
    if (stepEl && stepEl.parentNode) stepEl.parentNode.insertBefore(bar, stepEl);
    else host.insertBefore(bar, host.firstChild);
    var shift = _el('div', 'dl-shift',
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18M14 7l5 5-5 5"></path></svg>' +
      'Switch the service and the boundary moves. That shift is the trap.');
    host.appendChild(shift);
  }

  // Move already-placed tokens (those sitting inside a drop column) to the column
  // the new boundary map expects. The graded response is the learner's placement;
  // this keeps the visible board consistent with the active service's boundary.
  function _dlReplaceTokens(host, step, map) {
    Object.keys(map).forEach(function (itemId) {
      var item = host.querySelector('.sl-chip[data-item="' + _slAttr(itemId) + '"]');
      var col = host.querySelector('.sl-cat-drop[data-target="' + _slAttr(map[itemId]) + '"]');
      if (item && col && item.parentNode && item.parentNode.classList &&
          item.parentNode.classList.contains('sl-cat-drop') && item.parentNode !== col) {
        col.appendChild(item);
      }
    });
  }

  // Budget = Σ per-decision estMinutes × 1.0 × 60000 (spec §3.6 — no tightening v1).
  function _dlExamBudgetMs(scenarios) {
    var minutes = scenarios.reduce(function (a, s) {
      return a + (typeof s.estMinutes === 'number' && s.estMinutes > 0 ? s.estMinutes : 3);
    }, 0);
    return Math.round(minutes * 60000);
  }

  function _dlStartExamStyle() {
    _dlSession.budgetMs = _dlExamBudgetMs(_dlSession.scenarios);
    _dlSession.deadlineMs = Date.now() + _dlSession.budgetMs;
    _slStartCountdown(_dlSession.deadlineMs);   // shared wall-clock countdown
    _dlRunRound();                               // feedback suppressed inside (mode==='exam')
  }

  // Time-up or last-round submit → score everything + route to verdict (retro-reveal lives there).
  function _dlExamSubmit(timeUp) {
    if (!_dlSession || _dlSession.__submitted) return;
    _dlSession.__submitted = true;
    _slStopCountdown();
    // any rounds not yet answered score as missed (responses absent)
    while (_dlSession.results.length < _dlSession.rounds) {
      var i = _dlSession.results.length;
      var scn = _dlSession.scenarios[i];
      var score = simLabScoreScenario(scn, {});
      _dlSession.results.push({ scenario: scn, score: score, passed: false, responses: {} });
    }
    _dlSession.timeUp = !!timeUp;
    _dlRenderResult();
  }

  // Aggregate MISSED rounds into look-alike pairs + weak families (spec §3.4).
  // Both fields are display labels carried on the scenario; absent → no contribution.
  function _dlVerdictClusters(results) {
    var pairs = {}, families = {};
    results.forEach(function (r) {
      if (r.passed) return;
      var scn = r.scenario || {};
      if (scn.pair) pairs[scn.pair] = (pairs[scn.pair] || 0) + 1;
      if (scn.family) families[scn.family] = (families[scn.family] || 0) + 1;
    });
    var pairList = Object.keys(pairs).map(function (k) { return { label: k, count: pairs[k] }; })
      .sort(function (a, b) { return b.count - a.count; });
    var familyList = Object.keys(families).sort(function (a, b) { return families[b] - families[a]; });
    return { pairs: pairList, families: familyList };
  }

  function _dlRenderResult() {
    if (_dlSession && _dlSession.mode === 'exam') _slStopCountdown();
    var agg = _slAggregateSession(_dlSession.results);
    var clusters = _dlVerdictClusters(_dlSession.results);
    var root = document.getElementById('dl-result-root');
    root.innerHTML = '';
    var sbar = _el('div', 'dl-sbar');
    sbar.innerHTML = '<span class="dl-sbar-strip">Decision Lab</span>' +
      '<span class="dl-round-pill">' + (_dlSession.timeUp ? "Time's up" : 'Set complete') + '</span>';
    root.appendChild(sbar);
    var scoreRow = _el('div', 'dl-score-row');
    scoreRow.innerHTML = '<span class="dl-score-fig" data-count="' + agg.passed + '">' + agg.passed +
      '<small>/' + agg.rounds + '</small></span>' +
      '<span><span class="dl-score-cap">Right calls</span></span>';
    root.appendChild(scoreRow);
    if (clusters.pairs.length) {
      var vs = _el('div', 'dl-vsec');
      vs.appendChild(_el('div', 'dl-vsec-k', 'Look-alikes you still confuse'));
      clusters.pairs.forEach(function (p) {
        var parts = String(p.label).split(' vs ');
        var row = _el('div', 'dl-confrow');
        row.innerHTML = '<span class="vs">' + _esc(parts[0] || p.label) + '</span>' +
          (parts[1] ? ' vs <span class="vs">' + _esc(parts[1]) + '</span>' : '') +
          '<span class="tag">missed &times;' + p.count + '</span>';
        vs.appendChild(row);
      });
      root.appendChild(vs);
    }
    if (clusters.families.length) {
      var wf = _el('div', 'dl-vsec');
      wf.appendChild(_el('div', 'dl-vsec-k', 'Weak service families'));
      var weak = _el('div', 'dl-weak');
      clusters.families.forEach(function (f) { weak.appendChild(_el('span', 'w', _esc(f))); });
      wf.appendChild(weak);
      root.appendChild(wf);
    }
    var ctaRow = _el('div', 'dl-cta-row');
    var drill = _el('button', 'btn btn-primary', 'Drill your 3 look-alikes →');
    drill.setAttribute('type', 'button'); drill.setAttribute('data-action', 'decisionLabSessionStart');
    var back = _el('button', 'btn gnt-ghost', 'Back to Practice');
    back.setAttribute('type', 'button'); back.setAttribute('data-action', 'decisionLabExit');
    ctaRow.appendChild(drill); ctaRow.appendChild(back);
    root.appendChild(ctaRow);
    // Pro cross-session persistence of look-alike clusters (free = current set only)
    if (typeof window._dlRecordWeakSpots === 'function') {
      window._dlRecordWeakSpots(clusters.pairs.map(function (p) { return p.label; }));
    }
    // score count-up (reduced-motion → instant; CSS shows final already)
    if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var fig = root.querySelector('.dl-score-fig');
      if (fig) {
        var target = agg.passed, t0 = null;
        var stepFn = function (ts) {
          if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 800);
          fig.firstChild.textContent = Math.round(p * target);
          if (p < 1) requestAnimationFrame(stepFn); else fig.firstChild.textContent = target;
        };
        requestAnimationFrame(stepFn);
      }
    }
    try {
      if (typeof window.bumpDrillStat === 'function') {
        window.bumpDrillStat('decision', 'done', 1);
        if (agg.passed === agg.rounds) window.bumpDrillStat('decision', 'perfect', 1);
      }
      if (typeof window.evaluateMilestones === 'function') {
        var _nu = window.evaluateMilestones();
        _nu.forEach(function (id, i) { setTimeout(function () { window.showMilestoneCelebration(id); }, 500 + i * 900); });
      }
    } catch (_) {}
    if (typeof showPage === 'function') showPage('decision-lab-result');
  }

  function _dlSessionStartDispatch() {
    if (_dlPickedMode === 'exam' && !_slIsPro()) { window._gateProOnly('Decision Lab', _dlGateCopy('exam')); return; }
    if (_dlPickedDecisions === 20 && !_slIsPro()) { window._gateProOnly('Decision Lab', _dlGateCopy('full20')); return; }
    // free practice 1/day cap (Task 9) — checked here for the practice path
    if (_dlPickedMode === 'practice' && !_slIsPro() &&
        typeof window._dlFreeRunsToday === 'function' && window._dlFreeRunsToday() >= 1) {
      window._gateProOnly('Decision Lab', _dlGateCopy('second')); return;
    }
    if (_dlPickedMode === 'practice' && !_slIsPro() && typeof window._dlBumpFreeRun === 'function') window._dlBumpFreeRun();
    return _dlSessionStart();
  }

  function decisionLabOpenEntry() {
    _dlPickedMode = 'practice';
    _dlPickedDecisions = 10;
    var tgt = document.getElementById('dl-target'); if (tgt) tgt.textContent = _dlTargetLabel();
    _dlBindModeToggle(); _dlBindDecisionChips(); _dlSyncEntry();
    if (typeof showPage === 'function') showPage('decision-lab-entry');
  }
  function decisionLabEntryBack() { if (typeof showPage === 'function') showPage('setup'); }

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

  function _slRenderExamLoader(host) {
    host.innerHTML = '';
    var box = _el('div', 'slr-loader');
    box.innerHTML = '<div class="slr-spin" aria-hidden="true"></div>' +
      '<div class="slr-loader-t">Building your exam…</div>' +
      '<div class="slr-loader-s">Generating every round up front so the clock never waits on us.</div>';
    host.appendChild(box);
  }

  // Pre-generate ALL rounds before the clock starts (§3.6). Each round: AI →
  // seed fallback, no-repeat across the batch via a growing used-id set. If the
  // bank can't fill N (won't happen: 50 ≫ 10) we return what we have and log.
  function _slExamGenerateAll(cert, rounds) {
    var used = new Set();
    var out = [];
    function next(i) {
      if (i >= rounds) return Promise.resolve(out);
      return _slGenerateScenarioFresh(cert, used).then(function (scn) {
        if (scn && simLabValidateScenario(scn).ok && !used.has(scn.id)) {
          used.add(scn.id); out.push(scn);
        } else {
          var alt = _slPickSeedFresh(cert, used);
          if (alt) { used.add(alt.id); out.push(alt); }
        }
        return next(i + 1);
      });
    }
    return next(0).then(function (arr) {
      if (arr.length < rounds && typeof console !== 'undefined') {
        console.warn('Sim Lab exam: only filled ' + arr.length + ' of ' + rounds + ' rounds for ' + cert);
      }
      return arr;
    });
  }

  // Task 4: wall-clock countdown handlers (removed after _slStopCountdown)
  var _slVisHandler = null, _slFocusHandler = null;

  // The countdown serves whichever exam-style session is active. Sim Lab uses
  // _slSession (mode 'exam'); Decision Lab uses _dlSession (mode 'exam'). One
  // accessor keeps _slStartCountdown/_slTickClock shared (spec §3.1).
  function _activeExamSession() {
    if (_slSession && _slSession.mode === 'exam') return _slSession;
    if (_dlSession && _dlSession.mode === 'exam') return _dlSession;
    return null;
  }

  function _slStartCountdown(deadlineMs) {
    _slStopCountdown();
    var sess = _activeExamSession(); if (!sess) return;
    var slotId = (sess === _dlSession) ? 'dl-clock-slot' : 'sl-clock-slot';
    var slot = document.getElementById(slotId);
    if (!slot) return;
    slot.innerHTML = '';
    var clk = _el('span', 'sl-clock');
    clk.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6"></path></svg><span class="sl-clock-t">' +
      _slFmtClock(deadlineMs - Date.now()) + '</span> <span class="cap">left</span>';
    slot.appendChild(clk);
    sess.clock = setInterval(_slTickClock, 1000);
    _slTickClock();
    _slVisHandler = function () { if (document.visibilityState === 'visible') _slTickClock(); };
    _slFocusHandler = function () { _slTickClock(); };
    document.addEventListener('visibilitychange', _slVisHandler);
    window.addEventListener('focus', _slFocusHandler);
  }

  function _slStopCountdown() {
    [_slSession, _dlSession].forEach(function (s) { if (s && s.clock) { clearInterval(s.clock); s.clock = null; } });
    if (_slVisHandler) { document.removeEventListener('visibilitychange', _slVisHandler); _slVisHandler = null; }
    if (_slFocusHandler) { window.removeEventListener('focus', _slFocusHandler); _slFocusHandler = null; }
  }

  // Build the clock node once; ticks only mutate the time string (digits never
  // transition — §6.5). Amber latches via .is-low.
  function _slTickClock() {
    var sess = _activeExamSession(); if (!sess) return;
    var remaining = sess.deadlineMs - Date.now();   // wall-clock truth, never decremented
    var clk = document.querySelector('.sl-clock');
    var t = clk && clk.querySelector('.sl-clock-t');
    if (t) t.textContent = _slFmtClock(Math.max(0, remaining));
    // amber latch at ≤10% remaining (one-way)
    if (!sess.amber && remaining <= sess.budgetMs * 0.10) {
      sess.amber = true;
      if (clk) clk.classList.add('is-low');
    }
    if (remaining <= 0) {
      _slStopCountdown();
      if (sess === _dlSession) _dlExamSubmit(true); else _slExamSubmit(true);
    }
  }

  function _slExamShowExamChrome() {
    var badge = document.getElementById('sl-exam-badge'); if (badge) badge.classList.remove('is-hidden');
    var dots = document.getElementById('sl-dots'); if (dots) dots.classList.add('is-hidden');   // palette replaces dots in exam
    var pal = document.getElementById('sl-palette'); if (pal) pal.classList.remove('is-hidden');
  }

  function _slSignedClock(ms) {
    var sign = ms >= 0 ? '-' : '+';   // under par (positive delta) shows as "-" time vs par (faster); over shows "+"
    return sign + _slFmtClock(Math.abs(ms));
  }

  function _slRenderPaceBlock(host, pace, scenarios) {
    var card = _el('div', 'slp-pace-card');
    card.appendChild(_el('div', 'slp-pace-eyebrow', 'Pace'));
    var head = _el('div', 'slp-pace-head');
    head.appendChild(_el('span', 'slp-pace-time', _slFmtClock(pace.totalMs)));
    var verdict = _el('span', 'slp-pace-verdict' + (pace.onPace ? '' : ' over'),
      pace.onPace ? 'On exam pace ✓' : (_slFmtClock(Math.abs(pace.deltaMs)) + ' over exam pace'));
    head.appendChild(verdict);
    card.appendChild(head);
    var sub;
    if (pace.onPace) {
      sub = _slFmtClock(pace.deltaMs) + ' to spare. On the real exam that leaves room to revisit a hard PBQ.';
    } else {
      // worst over-par round (1-based) for the coaching line
      var worst = 0, worstOver = -Infinity;
      pace.perRound.forEach(function (p, i) { var over = p.roundMs - p.parMs; if (over > worstOver) { worstOver = over; worst = i; } });
      sub = 'Round ' + (worst + 1) + ' ran long. On test day that\'s the round to triage: flag it and move.';
    }
    card.appendChild(_el('div', 'slp-pace-sub', sub));
    // par instrument — fill capped at 100% (overflow carried by the figure)
    var pct = Math.min(100, Math.round((pace.totalMs / pace.budgetMs) * 100));
    var track = _el('div', 'slp-par-track');
    var fill = _el('span', 'slp-par-fill'); fill.style.width = pct + '%';
    var tick = _el('span', 'slp-par-tick'); tick.innerHTML = '<span class="lab">Target ' + _slFmtClock(pace.budgetMs) + '</span>';
    track.appendChild(fill); track.appendChild(tick);
    card.appendChild(track);
    var scale = _el('div', 'slp-par-scale');
    scale.innerHTML = '<span>0:00</span><span>your time ' + _slFmtClock(pace.totalMs) + '</span>';
    card.appendChild(scale);
    // per-round rows
    var rows = _el('div', 'slp-pr-rows');
    pace.perRound.forEach(function (p, i) {
      var row = _el('div', 'slp-pr-row');
      row.appendChild(_el('span', 'slp-pr-lab', 'Round ' + (i + 1)));
      var bar = _el('span', 'slp-pr-bar');
      var max = Math.max(p.roundMs, p.parMs) * 1.25 || 1;
      var fillPct = Math.min(100, Math.round((p.roundMs / max) * 100));
      var parPct = Math.min(100, Math.round((p.parMs / max) * 100));
      var i2 = _el('i', p.over ? 'over' : 'under'); i2.style.width = fillPct + '%';
      var pt = _el('span', 'partick'); pt.style.left = parPct + '%';
      bar.appendChild(i2); bar.appendChild(pt);
      row.appendChild(bar);
      row.appendChild(_el('span', 'slp-pr-val ' + (p.over ? 'over' : 'under'), _slSignedClock(p.deltaMs)));
      rows.appendChild(row);
    });
    card.appendChild(rows);
    host.appendChild(card);
    // animate bars once (GPU scaleX, stagger), unless reduced-motion (CSS already finals)
    if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var bars = card.querySelectorAll('.slp-par-fill, .slp-pr-bar i');
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          Array.prototype.forEach.call(bars, function (b, n) { setTimeout(function () { b.classList.add('is-in'); }, n * 70); });
          obs.disconnect();
        });
      });
      io.observe(card);
    } else {
      Array.prototype.forEach.call(card.querySelectorAll('.slp-par-fill, .slp-pr-bar i'), function (b) { b.classList.add('is-in'); });
    }
  }

  function _slRenderExamResult() {
    var pace = _slComputePace(_slSession.results, _slSession.roundMs, _slSession.budgetMs,
      _slSession.elapsedMs, _slExamParMs(_slSession.scenarios));
    var root = document.getElementById('sl-result-root');
    root.innerHTML = '';
    // exam topbar-style seal + optional time-up note
    var seal = _el('span', 'sls-seal', _slSession.timeUp ? '⏱ Time’s up' : '✓ Exam complete');
    root.appendChild(seal);
    // Pace block FIRST (prepended above the verdict rows)
    _slRenderPaceBlock(root, pace, _slSession.scenarios);
    // reuse the existing aggregate + per-round rows + weak-spot cluster (same as practice summary)
    var agg = _slAggregateSession(_slSession.results);
    var score = _el('div', 'sls-score');
    score.innerHTML = '<span class="sls-score-n">' + agg.passed + '<small>/' + agg.rounds + '</small></span>' +
      '<span class="sls-score-cap">Rounds passed · ' + agg.pct + '% of steps correct</span>';
    root.appendChild(score);
    var rounds = _el('div', 'sls-rounds');
    _slSession.results.forEach(function (r) {
      var row = _el('div', 'sls-r');
      var ok = r.passed;
      row.appendChild(_el('span', 'sls-r-ic ' + (ok ? 'ok' : 'no'), ok ? '&#x2713;' : '&#x2717;'));
      var bodyc = _el('div', 'sls-r-body');
      bodyc.appendChild(_el('div', 'sls-r-title', _esc(r.scenario.topic || 'PBQ')));
      bodyc.appendChild(_el('div', 'sls-r-why', _esc(_slFirstWhy(r))));   // exam is Pro-only — always reveal
      row.appendChild(bodyc);
      row.appendChild(_el('span', 'sls-r-score', r.score.correct + '/' + r.score.total));
      rounds.appendChild(row);
    });
    root.appendChild(rounds);
    var cluster = _slWeakCluster(_slSession.results);
    if (cluster) {
      var ins = _el('div', 'sls-insight');
      ins.innerHTML = '<div class="sls-insight-k">Where you slipped</div><p>' + _esc(cluster) + '</p>';
      root.appendChild(ins);
    }
    if (typeof window._slRecordWeakSpots === 'function') {
      window._slRecordWeakSpots(_slSession.results.filter(function (r) { return !r.passed; }).map(function (r) { return r.scenario.topic; }));
    }
    var back = _el('button', 'btn btn-primary gnt-cta', 'Back to Practice');
    back.setAttribute('type', 'button'); back.setAttribute('data-action', 'simLabExit');
    root.appendChild(back);
    try {
      if (typeof window.bumpDrillStat === 'function') {
        window.bumpDrillStat('simlab', 'done', 1);
        if (agg.passed === agg.rounds) window.bumpDrillStat('simlab', 'perfect', 1);
      }
      if (typeof window.evaluateMilestones === 'function') {
        var _nu = window.evaluateMilestones();
        _nu.forEach(function (id, i) { setTimeout(function () { window.showMilestoneCelebration(id); }, 500 + i * 900); });
      }
    } catch (_) {}
    if (typeof showPage === 'function') showPage('sim-lab-result');
  }

  function _slExamSubmit(timeUp) {
    if (window._simLab.__examSubmitSpy) window._simLab.__examSubmitSpy();   // test hook (Task 4)
    if (!_slSession || _slSession.mode !== 'exam' || _slSession.__submitted) return;
    _slSession.__submitted = true;
    // capture the round in view (if a round, not the review screen)
    if (_slSession.view === 'round') {
      _slSession.roundMs[_slSession.idx] += Math.max(0, Date.now() - _slSession.roundEnteredAt);
      _slCaptureAnswer(_slSession.idx);
    }
    var remaining = Math.max(0, _slSession.deadlineMs - Date.now());
    _slSession.elapsedMs = _slSession.budgetMs - remaining;
    _slStopCountdown();
    _slSession.results = _slSession.scenarios.map(function (scn, i) {
      var resp = _slSession.answers[i] || {};
      var score = simLabScoreScenario(scn, resp);
      return { scenario: scn, score: score, passed: score.fraction === 1 };
    });
    _slSession.timeUp = !!timeUp;
    _slRenderExamResult();   // Task 9
  }

  // Task 5 — palette helpers
  function _slIsAnswered(idx) {
    var a = _slSession.answers[idx];
    if (!a) return false;
    // any non-empty saved response object counts as answered
    return Object.keys(a).some(function (k) {
      var v = a[k];
      if (v == null) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object') return Object.keys(v).length > 0;
      return String(v).trim().length > 0;
    });
  }

  function _slRenderPalette() {
    var host = document.getElementById('sl-palette');
    if (!host) return;
    host.classList.remove('is-hidden');
    host.innerHTML = '';
    _slSession.scenarios.forEach(function (scn, i) {
      var cls = 'pq';
      if (i === _slSession.idx) cls += ' now';
      else if (_slIsAnswered(i)) cls += ' answered';
      if (_slSession.flagged.has(i)) cls += ' flagged';
      var sq = _el('button', cls, String(i + 1));
      sq.setAttribute('type', 'button');
      sq.setAttribute('data-jump', String(i));
      var stateHint = (i === _slSession.idx) ? ', current' : (_slIsAnswered(i) ? ', answered' : ', not yet answered');
      if (_slSession.flagged.has(i)) stateHint += ', flagged';
      sq.setAttribute('aria-label', 'Round ' + (i + 1) + stateHint);
      sq.addEventListener('click', function () { _slExamNav(i); });   // Task 6
      host.appendChild(sq);
    });
    // legend (lifted copy)
    var key = _el('div', 'sl-palette-key');
    key.innerHTML = '<span><i class="kdot now"></i>This round</span>' +
      '<span><i class="kdot answered"></i>Answered</span>' +
      '<span><i class="kdot"></i>Not yet</span>' +
      '<span><i class="kdot flag"></i>Flagged</span>';
    host.appendChild(key);
  }

  // Deep-ish clone of a responses object so a captured snapshot can't be mutated
  // by later edits to the live object (or to another round that aliases it).
  function _slCloneResp(src) {
    if (src == null || typeof src !== 'object') return src;
    if (Array.isArray(src)) return src.map(_slCloneResp);
    var out = {};
    Object.keys(src).forEach(function (k) { out[k] = _slCloneResp(src[k]); });
    return out;
  }

  // Snapshot the current round's in-flight responses into answers[idx].
  // _slMountScenario exposes the LIVE responses object (the one user interactions
  // mutate) on window.__slResponses. Capturing a deep copy preserves edits across
  // free navigation without aliasing the live object into saved state.
  function _slCaptureAnswer(idx) {
    if (window.__slResponses) _slSession.answers[idx] = _slCloneResp(window.__slResponses);
  }

  function _slExamNav(toIdx) {
    if (!_slSession || toIdx < 0 || toIdx >= _slSession.rounds) return;
    // Accrue active time only when leaving an actual round, not the review screen
    // (spec §3.5: review/idle time must NOT be attributed to any round).
    if (_slSession.view === 'round') {
      _slSession.roundMs[_slSession.idx] += Math.max(0, Date.now() - _slSession.roundEnteredAt);
    }
    _slCaptureAnswer(_slSession.idx);
    _slRenderRound(toIdx);
  }

  function _slRenderRound(idx) {
    _slSession.idx = idx;
    _slSession.visited.add(idx);
    _slSession.view = 'round';
    _slSession.roundEnteredAt = Date.now();
    var scn = _slSession.scenarios[idx];
    var topic = document.getElementById('sl-topic');
    if (topic) topic.textContent = scn.topic || 'PBQ';
    _slRenderPalette();
    var body = document.getElementById('sl-body');
    // Clear body so _slMountScenario + footer start fresh.
    body.innerHTML = '';
    // Re-hydrate from the saved answer: pass it as `initial` so the step widgets
    // are seeded to SHOW the prior answer, and so the live window.__slResponses
    // (which _slMountScenario exposes) starts populated with it. A deep copy keeps
    // the saved snapshot insulated from edits made on this re-entry.
    _slMountScenario(body, scn, {
      onSubmit: function () {},                                 // exam never per-round-submits; nav/Review drives flow
      initial: _slSession.answers[idx] ? _slCloneResp(_slSession.answers[idx]) : null
    });
    _slRenderExamFooter(idx);
  }

  function _slRenderExamFooter(idx) {
    var body = document.getElementById('sl-body');
    // Remove any existing footer to avoid stacking on re-render (flag toggle).
    var old = body.querySelector('.sl-examfoot');
    if (old) old.remove();
    var foot = _el('div', 'sl-examfoot');
    var flagged = _slSession.flagged.has(idx);
    var flag = _el('button', 'sl-flagbtn' + (flagged ? ' is-on' : ''),
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"></path></svg>' +
      (flagged ? 'Flagged' : 'Flag'));
    flag.setAttribute('type', 'button');
    flag.addEventListener('click', function () { _slToggleFlag(idx); });
    foot.appendChild(flag);
    var nav = _el('span', 'sl-nav');
    var prev = _el('button', 'sl-navbtn prev', '‹ Prev');
    prev.setAttribute('type', 'button');
    if (idx === 0) prev.setAttribute('disabled', 'disabled');
    prev.addEventListener('click', function () { if (idx > 0) _slExamNav(idx - 1); });
    var isLast = idx === _slSession.rounds - 1;
    var next = _el('button', 'sl-navbtn next', isLast ? 'Review →' : 'Next ›');
    next.setAttribute('type', 'button');
    next.addEventListener('click', function () { if (isLast) _slRenderReview(); else _slExamNav(idx + 1); });
    nav.appendChild(prev);
    nav.appendChild(next);
    foot.appendChild(nav);
    body.appendChild(foot);
  }

  function _slToggleFlag(idx) {
    if (_slSession.flagged.has(idx)) _slSession.flagged.delete(idx);
    else _slSession.flagged.add(idx);
    _slRenderPalette();
    _slRenderExamFooter(idx);
  }

  function _slReviewCounts() {
    var answered = 0, flagged = _slSession.flagged.size, miss = 0;
    for (var i = 0; i < _slSession.rounds; i++) { if (_slIsAnswered(i)) answered++; else miss++; }
    return { answered: answered, flagged: flagged, miss: miss };
  }
  function _slFirstFlagged() {
    for (var i = 0; i < _slSession.rounds; i++) { if (_slSession.flagged.has(i)) return i; }
    return -1;
  }
  function _slRenderReview() {
    // accrue time on the round being left + snapshot its answer
    _slSession.roundMs[_slSession.idx] += Math.max(0, Date.now() - _slSession.roundEnteredAt);
    _slCaptureAnswer(_slSession.idx);
    _slSession.view = 'review';
    var pal = document.getElementById('sl-palette'); if (pal) pal.classList.add('is-hidden');
    var body = document.getElementById('sl-body');
    body.innerHTML = '';
    var c = _slReviewCounts();
    var root = _el('div', 'slv-review');
    root.appendChild(_el('div', 'slv-rev-h', 'Review before you submit'));
    root.appendChild(_el('div', 'slv-rev-sub', 'Tap any round to jump back. Flagged rounds are highlighted.'));
    var counts = _el('div', 'slv-rev-counts');
    counts.appendChild(_el('span', 'slv-rc ok', c.answered + ' answered'));
    counts.appendChild(_el('span', 'slv-rc flag', c.flagged + ' flagged'));
    counts.appendChild(_el('span', 'slv-rc miss', c.miss + ' not answered'));
    root.appendChild(counts);
    var list = _el('div', 'slv-rev-list');
    _slSession.scenarios.forEach(function (scn, i) {
      var row = _el('div', 'slv-rev-row');
      row.setAttribute('data-jump', String(i));
      var status, sLabel, ic;
      if (_slSession.flagged.has(i)) { status = 'flag'; sLabel = 'Flagged'; ic = '<path d="M5 21V4M5 4h11l-2 4 2 4H5"></path>'; }
      else if (_slIsAnswered(i)) { status = 'ok'; sLabel = 'Answered'; ic = '<path d="M5 12l4 4L19 7"></path>'; }
      else { status = 'miss'; sLabel = 'Not answered'; ic = '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path>'; }
      row.innerHTML = '<span class="slv-rev-n">' + (i + 1) + '</span>' +
        '<span><span class="slv-rev-t">' + _esc(scn.topic || 'PBQ') + '</span><br>' +
        '<span class="slv-rev-o">' + _esc(scn.objective || '') + '</span></span>' +
        '<span class="slv-rev-status ' + status + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + ic + '</svg>' + sLabel + '</span>';
      row.addEventListener('click', function () { _slExamNav(i); });
      list.appendChild(row);
    });
    root.appendChild(list);
    var ctaRow = _el('div', 'slv-cta-row');
    var firstFlag = _slFirstFlagged();
    var back = _el('button', 'btn gnt-ghost', 'Back to flagged'); back.setAttribute('type', 'button');
    if (firstFlag === -1) back.setAttribute('disabled', 'disabled');
    back.addEventListener('click', function () { if (firstFlag !== -1) _slExamNav(firstFlag); });
    var submit = _el('button', 'btn btn-primary', 'Submit exam'); submit.setAttribute('type', 'button');
    submit.addEventListener('click', function () {
      if (c.miss > 0) {
        var ok = window.confirm(c.miss + ' round' + (c.miss === 1 ? '' : 's') + ' unanswered. Submit anyway?');
        if (!ok) return;
      }
      _slExamSubmit(false);   // reason='manual' (Task 8)
    });
    ctaRow.appendChild(back); ctaRow.appendChild(submit);
    root.appendChild(ctaRow);
    body.appendChild(root);
  }

  function _slExamStart() {
    if (typeof window._slMeteredGenerate === 'function') window._simLab.__setFetcher(window._slMeteredGenerate);
    // Exam is Pro-only and unlimited — never calls _bumpPbqFreeRun (§3.7).
    if (typeof showPage === 'function') showPage('sim-lab');
    var body = document.getElementById('sl-body');
    if (body) _slRenderExamLoader(body);
    return _slExamGenerateAll(window.CURRENT_CERT || 'netplus', _slPickedRounds).then(function (scns) {
      var budgetMs = _slExamBudgetMs(scns);
      _slSession = _slExamBlankState(scns, budgetMs);
      _slSession.deadlineMs = Date.now() + budgetMs;
      _slStartCountdown(_slSession.deadlineMs);   // Task 4
      _slExamShowExamChrome();                     // Task 4 (badge + palette container visibility)
      _slRenderRound(0);                           // Task 4 (exam round wrapper)
    }).catch(function (e) {
      console.warn('Sim Lab exam start failed', e);
      if (typeof showToast === 'function') {
        showToast('Could not build the exam. Please try again.', 'error');
      } else {
        var body = document.getElementById('sl-body');
        if (body) { body.textContent = 'Could not build the exam. Please try again.'; }
      }
      if (typeof showPage === 'function') showPage('sim-lab-entry');
    });
  }

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
    if (t) {
      // Cert-driven label from the live pack (name minus vendor prefix + code),
      // mirroring _syncPageHeaderCert. NOTE: meta.examName is never defined on any
      // pack, so the old `examName || 'Network+ N10-009'` always showed Network+ on
      // every cert (incl. Sec+). Derive from name+code so it's always the real cert.
      var slMeta = (window.CERT_PACK && window.CERT_PACK.meta) || {};
      var slLabel = ((slMeta.name || '').replace(/^(CompTIA|Microsoft|Amazon|AWS)\s+/, '') + ' ' + (slMeta.code || '')).trim();
      t.textContent = slLabel ? ('Mixed · ' + slLabel) : 'Mixed';
    }
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
    // §3.7 confirm gate: mid-exam only (clock still running, not yet submitted)
    if (_slSession && _slSession.mode === 'exam' && !_slSession.__submitted) {
      if (!window.confirm('Leave? Your exam ends and won\'t be scored.')) return;
    }
    if (_slTimer) { _slTimer.stop(); _slTimer = null; }
    if (_slSession && _slSession.mode === 'exam') _slStopCountdown();   // clear interval + visibility/focus listeners
    _slMode = null;
    _slSession = null;
    var p = document.getElementById('sl-round-pill'); if (p) p.classList.add('is-hidden');
    var d = document.getElementById('sl-dots'); if (d) d.classList.add('is-hidden');
    var badge = document.getElementById('sl-exam-badge'); if (badge) badge.classList.add('is-hidden');
    var pal = document.getElementById('sl-palette'); if (pal) { pal.classList.add('is-hidden'); pal.innerHTML = ''; }
    var clk = document.getElementById('sl-clock-slot'); if (clk) clk.innerHTML = '';
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
    try {
      if (typeof window.bumpDrillStat === 'function') {
        window.bumpDrillStat('simlab', 'done', 1);
        if (agg.passed === agg.rounds) window.bumpDrillStat('simlab', 'perfect', 1);
      }
      if (typeof window.evaluateMilestones === 'function') {
        var _nu = window.evaluateMilestones();
        _nu.forEach(function (id, i) { setTimeout(function () { window.showMilestoneCelebration(id); }, 500 + i * 900); });
      }
    } catch (_) {}
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
  window._simLab.examGenerateAll = _slExamGenerateAll;
  window._simLab.tickClock = _slTickClock;             // lets tests drive a tick after mocking Date.now
  window._simLab.examSession = function () { return _slSession; };
  window._simLab.examSubmit = function (t) { _slExamSubmit(t); };
  window._simLab.renderPalette = _slRenderPalette;
  window._simLab.examNav = _slExamNav;
  window._simLab.toggleFlag = _slToggleFlag;
  window._simLab.renderRound = _slRenderRound;
  window._simLab.renderReview = _slRenderReview;
  window._simLab.renderExamResult = _slRenderExamResult;
  window._simLab.renderPaceBlock = _slRenderPaceBlock;
  function _dlGradeAnalyze(host, step, pickedIds) {
    if (!step || step.type !== 'analyze') return;
    var block = host.querySelector('.sl-analyze-block');
    if (!block) return;
    block.classList.add('dl-graded');
    var correct = (step.answer && step.answer.selected) || [];
    var picked = pickedIds || [];
    Array.prototype.forEach.call(block.children, function (row) {
      var id = row.getAttribute('data-line');
      var isCorrect = correct.indexOf(id) !== -1;
      var wasPicked = picked.indexOf(id) !== -1;
      var v = row.querySelector('.dl-verdict');
      row.classList.add('dl-opt');
      row.setAttribute('aria-disabled', 'true');
      if (isCorrect) { row.classList.add('dl-correct'); if (v) v.textContent = '✓ Best'; }
      else { row.classList.add('dl-wrong'); if (wasPicked) row.classList.add('dl-picked-wrong'); if (v) v.textContent = '✗'; }
    });
    if (step.explanation && !host.querySelector('.dl-teach')) {
      var teach = _el('div', 'dl-teach',
        '<div class="dl-teach-k">The tell</div><div class="dl-teach-b">' + _esc(step.explanation) + '</div>');
      block.parentNode.insertBefore(teach, block.nextSibling);
    }
  }

  window._simLab.slBank = _slBank;
  window._simLab.dlBank = _dlBank;
  window._simLab.dlCerts = function () { return _DL_CERTS.slice(); };
  window._simLab.dlGradeAnalyze = _dlGradeAnalyze;
  window._simLab.dlGateCopy = _dlGateCopy;
  window.decisionLabOpenEntry = decisionLabOpenEntry;
  window.decisionLabEntryBack = decisionLabEntryBack;
  window.decisionLabSessionStart = _dlSessionStartDispatch;
  window._simLab.dlBuildSet = _dlBuildSet;
  window._simLab.dlSession = function () { return _dlSession; };
  window._simLab.dlExamSubmit = function (t) { _dlExamSubmit(t); };
  window._simLab.dlTick = _slTickClock;
  window._simLab.dlVerdictClusters = _dlVerdictClusters;
  window._simLab.dlRenderResult = _dlRenderResult;
})();
