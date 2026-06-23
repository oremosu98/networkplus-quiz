/* Sim Lab — PBQ drill (Plan 1: core + Practice mode). Lazy-loaded feature. */
(function () {
  'use strict';

  var STEP_TYPES = ['order', 'categorize', 'match', 'analyze', 'fillin'];

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

  // Temporary stub — Task 3 replaces with full normalization logic
  function _simLabNormalizeMatch(given, accept) { return accept.indexOf(given) !== -1; }

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
          return _simLabNormalizeMatch(given, accept); // defined fully in Task 3
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

  // --- exports (more added in later tasks) ---
  window.simLabValidateScenario = simLabValidateScenario;
  window.simLabScoreScenario = simLabScoreScenario;
  window._simLab = window._simLab || {};
  window._simLab.STEP_TYPES = STEP_TYPES;
})();
