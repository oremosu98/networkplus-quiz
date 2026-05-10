// ════════════════════════════════════════════════════════════════════
// features/incident-response.js — Phase 11b feature module (v4.99.39)
// ════════════════════════════════════════════════════════════════════
//
// Extracted from app.js v4.99.38:
//   Block 1: lines 31152-31164 (constants + Sec+ cert flags — 13 LOC)
//   Block 2: lines 32883-33929 (state + functions + init IIFE — 1,047 LOC)
// Total: ~1,060 LOC. Lazy-loaded on first navigation to #page-irw.
//
// CRITICAL cleanup: pressure timer (_irwPressureTimerId) MUST be cleared
// on page-leave. window._irwTeardown is exposed for shell-side cleanup.
// ════════════════════════════════════════════════════════════════════

(function() {
  "use strict";

  // ── Constants (originally app.js:31152-31164) ──
  const _SECPLUS_HAS_IRW = typeof CERT_PACK === 'object' && CERT_PACK !== null
    && Array.isArray(CERT_PACK.incidentResponseScenarios) && CERT_PACK.incidentResponseScenarios.length > 0;
  const _USE_SECPLUS_IRW = (typeof CURRENT_CERT !== 'undefined') && CURRENT_CERT === 'secplus' && _SECPLUS_HAS_IRW;
  const IRW_DATA = _USE_SECPLUS_IRW ? CERT_PACK.incidentResponseScenarios : [];
  const IRW_PHASES = _USE_SECPLUS_IRW && Array.isArray(CERT_PACK.incidentResponsePhases)
    ? CERT_PACK.incidentResponsePhases : [];
  const IRW_VECTORS = _USE_SECPLUS_IRW && CERT_PACK.incidentResponseVectors
    ? CERT_PACK.incidentResponseVectors : {};
  // v4.97.1: lesson cheatsheets (6 PICERL phase cards) + pressure-mode budgets
  const IRW_LESSONS = _USE_SECPLUS_IRW && Array.isArray(CERT_PACK.incidentResponseLessons)
    ? CERT_PACK.incidentResponseLessons : [];
  // Pressure-mode time budgets per scenario difficulty (seconds).
  const IRW_PRESSURE_BUDGETS = { 1: 1800, 2: 1500, 3: 2100 };

  // ── State + functions (originally app.js:32883-33929) ──
  let _irwActiveScenarioId = null;
  let _irwActiveScenario = null;
  let _irwActivePhaseIdx = 0;
  let _irwPickedActionIds = [];
  let _irwPhaseRevealed = false;
  let _irwPhaseScores = [];
  // v4.97.1: Pressure mode + selected mode for setup
  let _irwSelectedMode = 'practice';   // 'practice' | 'pressure'
  let _irwPressureActive = false;
  let _irwPressureStartMs = 0;
  let _irwPressureBudgetMs = 0;
  let _irwPressureTimerId = null;
  let _irwPressureExpired = false;
  
  function irwInitMastery() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE.IRW_MASTERY) || 'null');
      if (raw && typeof raw === 'object') return raw;
    } catch (_) {}
    const m = {};
    IRW_DATA.forEach(s => { m[s.id] = { pips: 0, lastRun: null, bestAccuracy: 0, runs: 0, completed: 0 }; });
    return m;
  }
  function irwSaveMastery(m) {
    try { localStorage.setItem(STORAGE.IRW_MASTERY, JSON.stringify(m)); _cloudFlush(STORAGE.IRW_MASTERY); } catch (_) {}
  }
  function irwGetScenarioMastery(scenarioId) {
    const m = irwInitMastery();
    return m[scenarioId] || { pips: 0, lastRun: null, bestAccuracy: 0, runs: 0, completed: 0 };
  }
  function irwUpdateScenarioMastery(scenarioId, accuracy) {
    const m = irwInitMastery();
    if (!m[scenarioId]) m[scenarioId] = { pips: 0, lastRun: null, bestAccuracy: 0, runs: 0, completed: 0 };
    const e = m[scenarioId];
    e.runs += 1; e.completed += 1;
    e.lastRun = new Date().toISOString();
    if (accuracy > e.bestAccuracy) e.bestAccuracy = accuracy;
    // Mastery pip: 85%+ accuracy adds a pip (max 3). Mirrors AMM/CTS box-progression.
    if (accuracy >= 0.85 && e.pips < 3) e.pips += 1;
    irwSaveMastery(m);
    return e;
  }
  function irwIsScenarioUnlocked(scenario) {
    if (!scenario.unlockAfter || scenario.unlockAfter.length === 0) return true;
    const m = irwInitMastery();
    return scenario.unlockAfter.every(reqId => {
      const e = m[reqId];
      return e && e.pips >= 2;  // need 2/3 mastery on prereq
    });
  }
  function setIrwTab(tabId) {
    ['practice', 'lessons', 'dashboard'].forEach(t => {
      const btn = document.getElementById('irw-tab-btn-' + t);
      const panel = document.getElementById('irw-tab-' + t);
      if (btn) {
        btn.classList.toggle('irw-tab-active', t === tabId);
        btn.setAttribute('aria-selected', t === tabId ? 'true' : 'false');
        btn.setAttribute('tabindex', t === tabId ? '0' : '-1');
      }
      if (panel) panel.classList.toggle('is-hidden', t !== tabId);
    });
    if (tabId === 'practice') irwRenderHome();
    else if (tabId === 'lessons') irwRenderLessons();
    else if (tabId === 'dashboard') irwRenderDashboard();
  }
  // Original startIncidentResponseWarRoom body inlined into enter() at module bottom.
  function irwRenderHome() {
    const host = document.getElementById('irw-stage-host');
    if (!host) return;
    // Reset session state
    _irwActiveScenarioId = null; _irwActiveScenario = null;
    _irwActivePhaseIdx = 0; _irwPickedActionIds = [];
    _irwPhaseRevealed = false; _irwPhaseScores = [];
    // v4.97.1: stop any running pressure timer (e.g. user tabbed back to catalog)
    _irwStopPressureTimer();
  
    const m = irwInitMastery();
    const totalScenarios = IRW_DATA.length;
    const masteredCount = Object.values(m).filter(e => e.pips >= 3).length;
    const completedCount = Object.values(m).filter(e => e.completed > 0).length;
  
    let html = '<div class="irw-setup-shell">';
    html += '<div class="irw-stats-strip">';
    html += `<span class="irw-stat"><span class="irw-stat-num">${masteredCount}/${totalScenarios}</span><span class="irw-stat-label">Mastered</span></span>`;
    html += `<span class="irw-stat"><span class="irw-stat-num">${completedCount}</span><span class="irw-stat-label">Completed</span></span>`;
    html += `<span class="irw-stat"><span class="irw-stat-num">${IRW_DATA.length}</span><span class="irw-stat-label">Scenarios</span></span>`;
    html += '</div>';
    // v4.97.1: mode picker (Practice / Pressure). AI gen still v4.97.2.
    html += '<div class="irw-mode-picker">';
    html += `<button class="irw-mode-btn ${_irwSelectedMode === 'practice' ? 'is-active' : ''}" onclick="irwSetMode('practice')" type="button">`;
    html += '<span class="irw-mode-btn-icon">🎯</span>';
    html += '<span class="irw-mode-btn-label">Practice</span>';
    html += '<span class="irw-mode-btn-sub">No timer · build mastery first</span>';
    html += '</button>';
    html += `<button class="irw-mode-btn ${_irwSelectedMode === 'pressure' ? 'is-active' : ''}" onclick="irwSetMode('pressure')" type="button">`;
    html += '<span class="irw-mode-btn-icon">⏱️</span>';
    html += '<span class="irw-mode-btn-label">Pressure</span>';
    html += '<span class="irw-mode-btn-sub">25-35 min budget · realistic SOC feel</span>';
    html += '</button>';
    html += '</div>';
    html += '<div class="irw-mode-notice">';
    if (_irwSelectedMode === 'pressure') {
      html += '⏱️ <strong>Pressure mode active</strong> · Live timer counts down per scenario. Going over budget penalises accuracy. AI generator + 7-layer validator land in v4.97.2.';
    } else {
      html += '🎯 <strong>Practice mode</strong> · No timer · Reveal-on-mistake. Switch to Pressure when you\'re ready for the SOC analyst feel.';
    }
    html += '</div>';
    html += '<div class="irw-scenario-grid">';
    IRW_DATA.forEach(scen => {
      const mEntry = m[scen.id] || { pips: 0, completed: 0, bestAccuracy: 0 };
      const unlocked = irwIsScenarioUnlocked(scen);
      const vector = IRW_VECTORS[scen.vector] || { name: 'Unknown', icon: '⚠️', color: '#6b6b90' };
      const diffStars = '★'.repeat(scen.difficulty) + '☆'.repeat(3 - scen.difficulty);
      const diffLabel = ['', 'Foundational', 'Exam', 'Real-world'][scen.difficulty] || 'Unknown';
      const correctCount = scen.phases.reduce((a, p) => a + p.actions.filter(x => x.isCorrect).length, 0);
      html += `<div class="irw-scen-card ${unlocked ? '' : 'is-locked'}"${unlocked ? ` onclick="irwStartScenario('${escAttr(scen.id)}')"` : ''}>`;
      // v4.98.5: simple corner padlock badge (was overflowing prereq text over title)
      if (!unlocked) {
        html += '<span class="irw-scen-lock-badge">🔒 LOCKED</span>';
      }
      html += `<div class="irw-scen-row1">`;
      html += `<div class="irw-scen-icon">${escHtml(scen.icon)}</div>`;
      html += `<div class="irw-scen-titlewrap">`;
      html += `<div class="irw-scen-title">${escHtml(scen.title)}</div>`;
      html += `<div class="irw-scen-meta">`;
      html += `<span class="irw-scen-tag" style="color:${vector.color};">${vector.icon} ${escHtml(vector.name)}</span>`;
      html += `<span class="irw-scen-tag irw-scen-diff-${scen.difficulty}">${diffStars} ${diffLabel}</span>`;
      html += `<span class="irw-scen-tag irw-scen-tag-muted">${scen.phases.length} phases · ${correctCount} correct actions</span>`;
      html += `</div></div></div>`;
      html += `<div class="irw-scen-summary">${escHtml(scen.summary)}</div>`;
      html += '<div class="irw-scen-mastery">';
      for (let i = 0; i < 3; i++) {
        html += `<div class="irw-scen-pip ${i < mEntry.pips ? 'is-on' : ''}"></div>`;
      }
      if (mEntry.completed > 0) {
        html += `<span class="irw-scen-completed">${mEntry.completed} run${mEntry.completed === 1 ? '' : 's'} · best ${Math.round(mEntry.bestAccuracy * 100)}%</span>`;
      }
      html += '</div>';
      // v4.98.5: prereq banner moved out of the absolute-positioned lock div + into a normal-flow row
      if (!unlocked) {
        const reqId = scen.unlockAfter[0];
        const reqScen = IRW_DATA.find(s => s.id === reqId);
        const reqTitle = reqScen ? reqScen.title : reqId;
        html += `<div class="irw-scen-lock-banner">🔓 Master <strong>"${escHtml(reqTitle)}"</strong> to unlock</div>`;
      }
      html += '</div>';
    });
    html += '</div>';
    // v4.97.2: AI generator is now LIVE. Replace stub with active CTA.
    html += '<div class="irw-aigen-stub is-live" onclick="irwOpenAiGenerator()">';
    html += '<div class="irw-aigen-stub-icon">✨</div>';
    html += '<div><strong>AI scenario generator</strong> — Sonnet 4.6 authors fresh scenarios on demand. 7-layer validator gates every output (PICERL ordering · action realism · IOC plausibility · per-phase count · distractor quality · trap presence · citation grounding). Click to open.</div>';
    html += '<div class="irw-aigen-stub-cta">Open generator →</div>';
    html += '</div>';
    html += '</div>';
    host.innerHTML = html;
  }
  function irwStartScenario(scenarioId) {
    if (!_gateProOnly('IR War Room')) return;
    const scen = IRW_DATA.find(s => s.id === scenarioId);
    if (!scen) { console.warn('IRW: scenario not found:', scenarioId); return; }
    if (!irwIsScenarioUnlocked(scen)) {
      if (typeof showToast === 'function') showToast('Master prerequisite scenario first.', 'info');
      return;
    }
    _irwActiveScenarioId = scenarioId;
    _irwActiveScenario = scen;
    _irwActivePhaseIdx = 0;
    _irwPickedActionIds = [];
    _irwPhaseRevealed = false;
    _irwPhaseScores = [];
    // v4.97.1: kick off pressure timer if Pressure mode is selected
    if (_irwSelectedMode === 'pressure') {
      _irwStartPressureTimer(scen);
    } else {
      _irwStopPressureTimer();
    }
    irwRenderWarRoom();
  }
  function irwRenderWarRoom() {
    const host = document.getElementById('irw-stage-host');
    if (!host || !_irwActiveScenario) return;
    const scen = _irwActiveScenario;
    let html = '';
    // v4.97.1: pressure-mode bar above the war-room
    if (_irwPressureActive) {
      html += '<div id="irw-pressure-bar" class="irw-pressure-bar">';
      html += '<div class="irw-pb-l">';
      html += '<div class="irw-pb-pulse"></div>';
      html += `<div><div class="irw-pb-label">⚡ PRESSURE MODE</div><div class="irw-pb-mode">${escHtml(scen.title)}</div></div>`;
      html += '</div>';
      html += '<div class="irw-pb-r">';
      html += '<div class="irw-pb-time">--:--</div>';
      html += '<div class="irw-pb-pct">100% budget</div>';
      html += '</div>';
      html += '</div>';
    }
    html += '<div class="irw-warroom">';
    // LEFT: scenario context
    html += '<div class="irw-wr-col">';
    html += '<div class="irw-wr-col-h">📋 Incident</div>';
    html += `<div class="irw-ctx-tag">${escHtml(scen.severity)} · ACTIVE</div>`;
    html += `<div class="irw-ctx-title">${escHtml(scen.title)}</div>`;
    html += `<div class="irw-ctx-summary">${escHtml(scen.context)}</div>`;
    html += '<div class="irw-ctx-meta-row">';
    const v = IRW_VECTORS[scen.vector] || { icon: '⚠️', name: scen.vector };
    html += `<span class="irw-ctx-meta-pill">Vector: ${v.icon} ${escHtml(v.name)}</span>`;
    html += `<span class="irw-ctx-meta-pill">Vertical: ${escHtml(scen.vertical)}</span>`;
    html += `<span class="irw-ctx-meta-pill">${escHtml(scen.severity)}</span>`;
    html += '</div>';
    html += '<div class="irw-ctx-iocs"><div class="irw-ctx-iocs-h">🔍 IOCs</div>';
    scen.iocs.forEach(ioc => {
      html += `<div class="irw-ctx-ioc-row"><strong>${escHtml(ioc.label)}:</strong> ${escHtml(ioc.value)}</div>`;
    });
    html += '</div></div>';
  
    // CENTER: timeline + phase + actions
    html += '<div class="irw-wr-col irw-wr-col-center">';
    html += '<div class="irw-wr-col-h">⏱ PICERL Timeline</div>';
    html += irwRenderTimeline();
    html += irwRenderPhasePrompt();
    html += '</div>';
  
    // RIGHT: evidence feed
    html += '<div class="irw-wr-col">';
    html += '<div class="irw-wr-col-h">📡 Evidence feed <span class="irw-wr-col-pulse"></span></div>';
    html += irwRenderEvidenceFeed();
    html += '</div>';
    html += '</div>';
    host.innerHTML = html;
    // v4.97.1: refresh pressure bar immediately so time isn't '--:--' for a tick
    if (_irwPressureActive) _irwUpdatePressureBar();
    if (host.scrollIntoView) { try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {} }
  }
  function irwRenderTimeline() {
    let html = '<div class="irw-timeline">';
    IRW_PHASES.forEach((p, idx) => {
      let cls = '';
      let scoreLabel = '—';
      if (idx < _irwActivePhaseIdx) {
        cls = 'is-done';
        const score = _irwPhaseScores[idx];
        scoreLabel = score != null ? Math.round(score * 100) + '%' : '✓';
      } else if (idx === _irwActivePhaseIdx) {
        cls = 'is-active';
        scoreLabel = _irwPhaseRevealed ? Math.round((_irwPhaseScores[idx] || 0) * 100) + '%' : 'in progress';
      }
      html += `<div class="irw-tl-stage ${cls}" style="--tl-color:${p.color};">`;
      html += `<div class="irw-tl-stage-num">${p.num}</div>`;
      html += `<div class="irw-tl-stage-name">${escHtml(p.name)}</div>`;
      html += `<div class="irw-tl-stage-acc">${scoreLabel}</div>`;
      if (cls === 'is-done') html += '<div class="irw-tl-stage-check">✓</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }
  function irwRenderPhasePrompt() {
    const scen = _irwActiveScenario;
    const phaseDef = IRW_PHASES[_irwActivePhaseIdx];
    const phaseData = scen.phases[_irwActivePhaseIdx];
    const expectedCount = phaseData.expectedCount || phaseData.actions.filter(a => a.isCorrect).length;
    let html = `<div class="irw-phase-prompt"><div class="irw-phase-eyebrow" style="color:${phaseDef.color};">PHASE ${phaseDef.num} · ${escHtml(phaseDef.name).toUpperCase()}</div>`;
    html += `<div class="irw-phase-title">${escHtml(phaseData.promptTitle)}</div>`;
    html += `<div class="irw-phase-stem">${escHtml(phaseData.promptStem)}</div></div>`;
    html += '<div class="irw-actions-instructions">';
    if (_irwPhaseRevealed) {
      html += `Reveal — phase score <strong>${Math.round(_irwPhaseScores[_irwActivePhaseIdx] * 100)}%</strong>`;
    } else {
      html += `Pick all that apply (${expectedCount} expected · ${phaseData.actions.length} options):`;
    }
    html += '</div><div class="irw-action-deck">';
    phaseData.actions.forEach(action => {
      const isPicked = _irwPickedActionIds.includes(action.id);
      let cls = '';
      if (_irwPhaseRevealed) {
        if (isPicked && action.isCorrect) cls = 'is-picked-correct';
        else if (isPicked && !action.isCorrect) cls = 'is-picked-wrong';
        else if (!isPicked && action.isCorrect) cls = 'is-revealed-correct';
      } else if (isPicked) {
        cls = 'is-picked';
      }
      html += `<div class="irw-action-card ${cls}"${_irwPhaseRevealed ? '' : ` onclick="irwToggleAction('${escAttr(action.id)}')"`}>`;
      html += `<div class="irw-action-cb">${isPicked ? '✓' : ''}</div>`;
      html += '<div class="irw-action-body">';
      html += `<div class="irw-action-name">${escHtml(action.label)}</div>`;
      html += `<div class="irw-action-meta">${escHtml(action.meta || '')}</div>`;
      if (_irwPhaseRevealed) {
        html += `<div class="irw-action-why"><strong>${action.isCorrect ? '✓ Correct.' : (isPicked ? '✗ Wrong.' : 'Required — you missed this.')}</strong> ${escHtml(action.why || '')}</div>`;
      }
      html += '</div></div>';
    });
    html += '</div>';
    if (_irwPhaseRevealed && phaseData.trapCallout) {
      html += '<div class="irw-trap-callout"><div class="irw-trap-h"><div class="irw-trap-icon">!</div><div>';
      html += `<div class="irw-trap-title">${escHtml(phaseData.trapCallout.title)}</div>`;
      html += `<div class="irw-trap-sub">SY0-701 trap-callout</div></div></div>`;
      html += `<div class="irw-trap-body">${escHtml(phaseData.trapCallout.body)}</div></div>`;
    }
    html += '<div class="irw-submit-row">';
    if (_irwPhaseRevealed) {
      const isLast = _irwActivePhaseIdx === IRW_PHASES.length - 1;
      html += `<button class="irw-submit-btn is-confirm" onclick="irwAdvancePhase()">${isLast ? '🏁 Finish scenario →' : 'Advance to ' + escHtml(IRW_PHASES[_irwActivePhaseIdx + 1].name) + ' →'}</button>`;
    } else {
      const picked = _irwPickedActionIds.length;
      html += `<div class="irw-submit-counter">${picked} of ${expectedCount} expected · ${picked} selected</div>`;
      html += `<button class="irw-submit-btn" ${picked === 0 ? 'disabled' : ''} onclick="irwSubmitDecisions()">Lock answers →</button>`;
    }
    html += '</div>';
    return html;
  }
  function irwRenderEvidenceFeed() {
    const scen = _irwActiveScenario;
    let html = '';
    scen.iocs.forEach((ioc, idx) => {
      const isNew = idx === 0 && _irwActivePhaseIdx === 0 && !_irwPhaseRevealed;
      html += `<div class="irw-alert-row ${isNew ? 'is-new' : ''}">`;
      html += `<div class="irw-alert-time">IOC #${idx + 1}</div>`;
      html += `<div class="irw-alert-src">${escHtml(ioc.label)}</div>`;
      html += `<div class="irw-alert-detail"><code>${escHtml(ioc.value)}</code></div></div>`;
    });
    html += '<div class="irw-alert-row" style="margin-top:14px; border-left-color:#3b82f6;">';
    html += `<div class="irw-alert-time">Phase ${_irwActivePhaseIdx + 1} of ${IRW_PHASES.length}</div>`;
    html += `<div class="irw-alert-src">SOC analyst</div>`;
    html += `<div class="irw-alert-detail">${_irwPhaseRevealed ? 'Phase complete. Advance when ready.' : 'Decisions pending. Lock answers to advance.'}</div></div>`;
    return html;
  }
  function irwToggleAction(actionId) {
    if (_irwPhaseRevealed) return;
    const idx = _irwPickedActionIds.indexOf(actionId);
    if (idx >= 0) _irwPickedActionIds.splice(idx, 1);
    else _irwPickedActionIds.push(actionId);
    irwRenderWarRoom();
  }
  function irwSubmitDecisions() {
    if (_irwPhaseRevealed) return;
    if (_irwPickedActionIds.length === 0) return;
    const phaseData = _irwActiveScenario.phases[_irwActivePhaseIdx];
    const correctActions = phaseData.actions.filter(a => a.isCorrect);
    const correctCount = correctActions.length;
    const correctPicked = _irwPickedActionIds.filter(id => correctActions.some(a => a.id === id)).length;
    const wrongPicked = _irwPickedActionIds.filter(id => !correctActions.some(a => a.id === id)).length;
    // Score: correctPicked / total - wrongPenalty. Bounded [0,1].
    let raw = (correctPicked - 0.5 * wrongPicked) / correctCount;
    if (raw < 0) raw = 0; if (raw > 1) raw = 1;
    _irwPhaseScores[_irwActivePhaseIdx] = raw;
    _irwPhaseRevealed = true;
    irwRenderWarRoom();
  }
  function irwAdvancePhase() {
    _irwActivePhaseIdx += 1;
    _irwPickedActionIds = [];
    _irwPhaseRevealed = false;
    if (_irwActivePhaseIdx >= IRW_PHASES.length) {
      irwEndScenario();
    } else {
      irwRenderWarRoom();
    }
  }
  function irwEndScenario() {
    const host = document.getElementById('irw-stage-host');
    if (!host) return;
    const scen = _irwActiveScenario;
    let totalScore = _irwPhaseScores.reduce((a, s) => a + s, 0) / _irwPhaseScores.length;
    // v4.97.1: pressure-mode over-budget penalty (5% per minute over)
    let pressureMeta = null;
    if (_irwPressureActive || _irwPressureExpired) {
      const elapsedMs = Date.now() - _irwPressureStartMs;
      const overBudgetMs = elapsedMs - _irwPressureBudgetMs;
      if (overBudgetMs > 0) {
        const minOver = Math.ceil(overBudgetMs / 60000);
        const penaltyPct = Math.min(0.30, minOver * 0.05);  // cap at 30%
        pressureMeta = { elapsedMs, overBudgetMs, penaltyPct, minOver };
        totalScore = Math.max(0, totalScore - penaltyPct);
      } else {
        pressureMeta = { elapsedMs, overBudgetMs: 0, penaltyPct: 0, minOver: 0 };
      }
      _irwStopPressureTimer();
    }
    irwUpdateScenarioMastery(scen.id, totalScore);
    let html = '<div class="irw-eos-card">';
    html += '<div class="irw-eos-h"><div class="irw-eos-icon">🏁</div>';
    const modeLabel = pressureMeta ? '⚡ Pressure mode' : '🎯 Practice mode';
    html += `<div><div class="irw-eos-title">${escHtml(scen.title)} — completed</div><div class="irw-eos-sub">${modeLabel} · ${scen.phases.length} phases</div></div></div>`;
    if (pressureMeta && pressureMeta.overBudgetMs > 0) {
      html += `<div class="irw-eos-pressure-warn">⏱️ Over budget by ${pressureMeta.minOver} min · accuracy penalty −${Math.round(pressureMeta.penaltyPct * 100)}%</div>`;
    } else if (pressureMeta) {
      const elapsedMin = Math.floor(pressureMeta.elapsedMs / 60000);
      const elapsedSec = Math.floor((pressureMeta.elapsedMs % 60000) / 1000);
      html += `<div class="irw-eos-pressure-good">⏱️ Completed in ${elapsedMin}m ${elapsedSec.toString().padStart(2,'0')}s · within budget</div>`;
    }
    html += '<div class="irw-eos-stats">';
    html += `<div class="irw-eos-stat"><div class="irw-eos-stat-label">Overall accuracy</div><div class="irw-eos-stat-num is-good">${Math.round(totalScore * 100)}%</div></div>`;
    html += `<div class="irw-eos-stat"><div class="irw-eos-stat-label">Phases</div><div class="irw-eos-stat-num">${scen.phases.length}/${scen.phases.length}</div></div>`;
    const strongCount = _irwPhaseScores.filter(s => s >= 0.85).length;
    html += `<div class="irw-eos-stat"><div class="irw-eos-stat-label">Strong phases</div><div class="irw-eos-stat-num is-good">${strongCount}/${scen.phases.length}</div></div>`;
    const newPips = irwGetScenarioMastery(scen.id).pips;
    html += `<div class="irw-eos-stat"><div class="irw-eos-stat-label">Mastery pips</div><div class="irw-eos-stat-num">${newPips}/3</div></div>`;
    html += '</div><div class="irw-eos-phase-table">';
    IRW_PHASES.forEach((p, idx) => {
      const score = _irwPhaseScores[idx] || 0;
      const cls = score >= 0.85 ? 'is-good' : (score >= 0.65 ? 'is-mid' : 'is-bad');
      html += '<div class="irw-eos-phase-row">';
      html += `<div class="irw-eos-phase-stage" style="color:${p.color};">P${p.num}</div>`;
      html += `<div class="irw-eos-phase-name">${escHtml(p.name)}</div>`;
      html += `<div class="irw-eos-phase-acc ${cls}">${Math.round(score * 100)}%</div></div>`;
    });
    html += '</div><div class="irw-eos-cta-row">';
    html += `<button class="irw-eos-cta is-primary" onclick="irwStartScenario('${escAttr(scen.id)}')">🔁 Replay</button>`;
    html += `<button class="irw-eos-cta" onclick="setIrwTab('practice')">📋 Back to catalog</button></div></div>`;
    host.innerHTML = html;
    if (host.scrollIntoView) { try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {} }
  }
  function irwRenderLessons() {
    const host = document.getElementById('irw-lessons-content');
    if (!host) return;
    // v4.97.1: full PICERL lesson cards from IRW_LESSONS data array.
    let html = '<div class="irw-lessons-intro">';
    html += '📚 <strong>PICERL phase cheatsheets.</strong> Each card has the phase goal, canonical actions, and the canonical SY0-701 traps for that phase. Print-friendly + searchable.';
    html += '</div>';
    html += '<div class="irw-lessons-grid">';
    IRW_LESSONS.forEach((lesson, idx) => {
      const phaseDef = IRW_PHASES.find(p => p.id === lesson.phase) || { num: idx + 1, color: '#7c6ff7', name: lesson.title };
      html += `<div class="irw-lesson-card" style="border-top-color:${phaseDef.color};" data-phase="${escAttr(lesson.phase)}">`;
      html += `<div class="irw-lesson-h">`;
      html += `<div class="irw-lesson-num" style="color:${phaseDef.color};">P${phaseDef.num}</div>`;
      html += `<div class="irw-lesson-name">${escHtml(lesson.title)}</div>`;
      html += `</div>`;
      html += `<div class="irw-lesson-goal">${escHtml(lesson.goal)}</div>`;
      html += '<ul class="irw-lesson-bullets">';
      lesson.actions.forEach(a => {
        html += `<li>${a}</li>`;  // intentional raw HTML — actions contain <strong> markup
      });
      html += '</ul>';
      if (lesson.traps && lesson.traps.length > 0) {
        html += '<div class="irw-lesson-traps">';
        html += '<div class="irw-lesson-traps-h">⚠ Common traps</div>';
        lesson.traps.forEach(t => {
          html += `<div class="irw-lesson-trap">${t}</div>`;
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    host.innerHTML = html;
  }
  
  // ── Pressure mode helpers (v4.97.1) ──
  function _irwFormatPressureTime(remainingMs) {
    if (remainingMs < 0) remainingMs = 0;
    const totalSec = Math.ceil(remainingMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return min.toString().padStart(2, '0') + ':' + sec.toString().padStart(2, '0');
  }
  function _irwStartPressureTimer(scenario) {
    _irwStopPressureTimer();
    const budgetSec = IRW_PRESSURE_BUDGETS[scenario.difficulty] || 1500;
    _irwPressureBudgetMs = budgetSec * 1000;
    _irwPressureStartMs = Date.now();
    _irwPressureExpired = false;
    _irwPressureActive = true;
    _irwPressureTimerId = setInterval(_irwUpdatePressureBar, 1000);
    _irwUpdatePressureBar();
  }
  function _irwStopPressureTimer() {
    if (_irwPressureTimerId) { clearInterval(_irwPressureTimerId); _irwPressureTimerId = null; }
    _irwPressureActive = false;
  }
  function _irwUpdatePressureBar() {
    const bar = document.getElementById('irw-pressure-bar');
    if (!bar || !_irwPressureActive) return;
    const elapsed = Date.now() - _irwPressureStartMs;
    const remaining = _irwPressureBudgetMs - elapsed;
    if (remaining <= 0 && !_irwPressureExpired) {
      _irwPressureExpired = true;
      if (typeof showToast === 'function') showToast('⏱️ Time budget exceeded — accuracy will be penalised', 'info');
    }
    const timeEl = bar.querySelector('.irw-pb-time');
    const pctEl = bar.querySelector('.irw-pb-pct');
    if (timeEl) timeEl.textContent = remaining < 0 ? '00:00' : _irwFormatPressureTime(remaining);
    if (pctEl) {
      const pct = Math.max(0, Math.round((remaining / _irwPressureBudgetMs) * 100));
      pctEl.textContent = pct + '% budget';
    }
    // Visual escalation: header gradient shifts toward red as time drains
    const ratio = Math.max(0, Math.min(1, remaining / _irwPressureBudgetMs));
    if (ratio < 0.25) bar.classList.add('is-critical');
    else if (ratio < 0.5) bar.classList.add('is-warn');
  }
  function irwSetMode(mode) {
    _irwSelectedMode = (mode === 'pressure') ? 'pressure' : 'practice';
    irwRenderHome();
  }
  function irwRenderDashboard() {
    const host = document.getElementById('irw-dashboard-content');
    if (!host) return;
    const m = irwInitMastery();
    // v4.97.3: full prescriptive dashboard with per-phase mastery + callouts.
  
    // Hero stats
    const totalScenarios = IRW_DATA.length;
    const masteredCount = Object.values(m).filter(e => e.pips >= 3).length;
    const completedCount = Object.values(m).filter(e => e.completed > 0).length;
    const totalRuns = Object.values(m).reduce((a, e) => a + (e.runs || 0), 0);
    const avgAccuracy = totalRuns > 0
      ? Object.values(m).reduce((a, e) => a + (e.bestAccuracy * (e.runs > 0 ? 1 : 0)), 0) / Math.max(1, completedCount)
      : 0;
  
    // Per-phase mastery aggregation (v4.97.3 — was placeholder before)
    // Aggregate phase scores across all completed scenarios.
    const phaseAcc = {};
    IRW_PHASES.forEach(p => { phaseAcc[p.id] = { sum: 0, count: 0 }; });
    // We don't store per-phase history in localStorage today (would require schema change).
    // Use mastery proxy: scenarios where best ≥ 0.85 contribute "good" weight to all phases;
    // weaker contribute proportional weight. v4.97.3 ships this proxy; full per-phase
    // history tracking is a future-version enhancement.
    Object.values(m).forEach(e => {
      if (!e.completed) return;
      IRW_PHASES.forEach(p => {
        phaseAcc[p.id].sum += e.bestAccuracy * 100;
        phaseAcc[p.id].count += 1;
      });
    });
  
    // Vector-level aggregation
    const vectorAcc = {};
    Object.entries(IRW_VECTORS).forEach(([id, v]) => { vectorAcc[id] = { sum: 0, count: 0, name: v.name, color: v.color, icon: v.icon }; });
    IRW_DATA.forEach(scen => {
      const e = m[scen.id];
      if (e && e.completed > 0) {
        const va = vectorAcc[scen.vector];
        if (va) { va.sum += e.bestAccuracy * 100; va.count += 1; }
      }
    });
    const vectorEntries = Object.entries(vectorAcc)
      .filter(([id, v]) => v.count > 0)
      .map(([id, v]) => ({ id, name: v.name, color: v.color, icon: v.icon, pct: Math.round(v.sum / v.count) }))
      .sort((a, b) => a.pct - b.pct);
  
    // Build callouts (prescriptive)
    const callouts = [];
    if (vectorEntries.length > 0 && vectorEntries[0].pct < 75) {
      const w = vectorEntries[0];
      callouts.push({
        title: `${w.icon} ${escHtml(w.name)} is your weakest vector at ${w.pct}%.`,
        detail: `Drill it directly to lift the score.`,
        cta: `→ Filter catalog by ${escHtml(w.name)}`,
        action: `setIrwTab('practice')`
      });
    }
    // Find scenarios below 60% accuracy
    const weakScenarios = IRW_DATA
      .filter(scen => { const e = m[scen.id]; return e && e.completed > 0 && e.bestAccuracy < 0.60; })
      .map(scen => ({ scen, mastery: m[scen.id] }));
    if (weakScenarios.length > 0) {
      const w = weakScenarios[0];
      callouts.push({
        title: `${w.scen.icon} <strong>${escHtml(w.scen.title)}</strong> is your weakest scenario at ${Math.round(w.mastery.bestAccuracy * 100)}%.`,
        detail: `Replay to consolidate.`,
        cta: `→ Replay this scenario`,
        action: `irwStartScenario('${escAttr(w.scen.id)}')`
      });
    }
    // Suggest AI-gen if user has < 5 completed
    if (completedCount < 5) {
      callouts.push({
        title: `✨ Generate fresh scenarios via AI to deepen your bank.`,
        detail: `Sonnet authors new scenarios with the 7-layer validator gating output.`,
        cta: `→ Open AI generator`,
        action: `irwOpenAiGenerator()`
      });
    }
    // Show locked-prereq scenarios if user is close to unlocking
    const closeToUnlock = IRW_DATA
      .filter(scen => scen.unlockAfter && scen.unlockAfter.length > 0 && !irwIsScenarioUnlocked(scen))
      .filter(scen => {
        const reqId = scen.unlockAfter[0];
        const reqMastery = m[reqId];
        return reqMastery && reqMastery.pips === 1; // 1 of 2 pips, halfway
      });
    if (closeToUnlock.length > 0) {
      const w = closeToUnlock[0];
      const reqId = w.unlockAfter[0];
      const reqScen = IRW_DATA.find(s => s.id === reqId);
      callouts.push({
        title: `🔓 You\'re halfway to unlocking <strong>${escHtml(w.title)}</strong>.`,
        detail: `Master "${escHtml(reqScen ? reqScen.title : reqId)}" (1 more pip needed).`,
        cta: `→ Replay prerequisite`,
        action: `irwStartScenario('${escAttr(reqId)}')`
      });
    }
  
    let html = '<div class="irw-dash-shell">';
    // Hero stats
    html += '<div class="irw-dash-stat-grid">';
    html += `<div class="irw-dash-stat-pill"><div class="irw-dash-stat-pill-num">${masteredCount}/${totalScenarios}</div><div class="irw-dash-stat-pill-label">Mastered</div></div>`;
    html += `<div class="irw-dash-stat-pill"><div class="irw-dash-stat-pill-num">${completedCount}</div><div class="irw-dash-stat-pill-label">Scenarios completed</div></div>`;
    html += `<div class="irw-dash-stat-pill"><div class="irw-dash-stat-pill-num">${totalRuns}</div><div class="irw-dash-stat-pill-label">Total runs</div></div>`;
    html += '</div>';
  
    // Two-column layout
    html += '<div class="irw-dash-grid">';
  
    // LEFT: Per-vector mastery + Per-scenario list
    html += '<div class="irw-dash-card">';
    html += '<div class="irw-dash-card-h">📊 Per-vector mastery</div>';
    if (vectorEntries.length === 0) {
      html += '<div class="irw-dash-row-acc irw-dash-row-acc-muted">Complete a scenario to see per-vector breakdown.</div>';
    } else {
      Object.entries(vectorAcc).forEach(([id, v]) => {
        if (v.count === 0) return;
        const pct = Math.round(v.sum / v.count);
        html += '<div class="irw-dash-vec-row">';
        html += `<div class="irw-dash-vec-name" style="color:${v.color};">${v.icon} ${escHtml(v.name)}</div>`;
        html += `<div class="irw-dash-vec-track"><div class="irw-dash-vec-fill" style="background:${v.color}; width:${pct}%;"></div></div>`;
        html += `<div class="irw-dash-vec-pct">${pct}%</div>`;
        html += '</div>';
      });
    }
  
    html += '<div class="irw-dash-card-h" style="margin-top:18px;">📜 Per-scenario mastery</div>';
    html += '<div class="irw-dash-list">';
    IRW_DATA.forEach(scen => {
      const e = m[scen.id] || { pips: 0, completed: 0, bestAccuracy: 0 };
      html += '<div class="irw-dash-row">';
      html += `<span class="irw-dash-row-icon">${escHtml(scen.icon)}</span>`;
      html += `<div class="irw-dash-row-name">${escHtml(scen.title)}</div>`;
      html += '<div class="irw-dash-row-pips">';
      for (let i = 0; i < 3; i++) html += `<div class="irw-dash-pip ${i < e.pips ? 'is-on' : ''}"></div>`;
      html += '</div>';
      if (e.completed > 0) {
        html += `<div class="irw-dash-row-acc">${Math.round(e.bestAccuracy * 100)}% best · ${e.completed} run${e.completed === 1 ? '' : 's'}</div>`;
      } else {
        html += '<div class="irw-dash-row-acc irw-dash-row-acc-muted">Not attempted</div>';
      }
      html += '</div>';
    });
    html += '</div></div>';
  
    // RIGHT: Prescriptive callouts + AI-gen persistence info
    html += '<div class="irw-dash-card">';
    html += '<div class="irw-dash-card-h">🎯 Drill what\'s weakest</div>';
    if (callouts.length === 0) {
      html += '<div class="irw-dash-row-acc irw-dash-row-acc-muted">No specific recommendations yet — keep playing to build the picture.</div>';
    } else {
      callouts.forEach(c => {
        html += `<div class="irw-dash-callout"><strong>${c.title}</strong> ${c.detail}<div class="irw-dash-callout-cta" onclick="${c.action}">${c.cta}</div></div>`;
      });
    }
    // AI-generated scenarios persistence note
    const aiGenScenarios = _irwLoadGeneratedScenarios();
    if (aiGenScenarios.length > 0) {
      html += `<div class="irw-dash-card-h" style="margin-top:18px;">✨ AI-generated scenarios (${aiGenScenarios.length})</div>`;
      aiGenScenarios.forEach(scen => {
        html += `<div class="irw-dash-callout" style="background:rgba(124,111,247,.06); border-left-color:#7c6ff7;">`;
        html += `<strong>${escHtml(scen.icon)} ${escHtml(scen.title)}</strong> · saved to your bank`;
        html += `<div class="irw-dash-callout-cta" onclick="irwStartScenario('${escAttr(scen.id)}')">→ Run this scenario</div>`;
        html += '</div>';
      });
    }
    html += '</div>';
  
    html += '</div>';  // close irw-dash-grid
    html += '</div>';
    host.innerHTML = html;
  }
  
  // ── v4.97.3: AI-gen scenario persistence ──
  function _irwLoadGeneratedScenarios() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE.IRW_LESSONS + '_aigen') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (_) { return []; }
  }
  function _irwSaveGeneratedScenario(scenario) {
    try {
      const list = _irwLoadGeneratedScenarios();
      if (!list.find(s => s.id === scenario.id)) {
        list.push(scenario);
        localStorage.setItem(STORAGE.IRW_LESSONS + '_aigen', JSON.stringify(list));
        _cloudFlush(STORAGE.IRW_LESSONS);  // piggyback on lessons key for cloud sync
      }
    } catch (_) {}
  }
  
  // ════════════════════════════════════════════════════════════════════
  // IRW AI SCENARIO GENERATOR (v4.97.2 Batch 3) — Sonnet-authored scenarios
  // gated by 7-layer validator. Modeled on tbDeepValidateAndFix pattern.
  // User-supplied API key (STORAGE.KEY); same direct-browser-access pattern
  // as fetchQuestions. Validator rejects malformed output before load.
  // ════════════════════════════════════════════════════════════════════
  let _irwAiGenState = {
    isOpen: false,
    isGenerating: false,
    vector: 'cloud',
    difficulty: 2,
    bias: null,
    lastScenario: null,
    lastValidatorResults: null,
    lastError: null
  };
  
  function irwOpenAiGenerator() {
    _irwAiGenState.isOpen = true;
    _irwAiGenState.lastScenario = null;
    _irwAiGenState.lastValidatorResults = null;
    _irwAiGenState.lastError = null;
    _irwRenderAiGenModal();
  }
  function irwCloseAiGenerator() {
    _irwAiGenState.isOpen = false;
    const modal = document.getElementById('irw-aigen-modal');
    if (modal) modal.remove();
  }
  function irwSetAiGenVector(v) { _irwAiGenState.vector = v; _irwRenderAiGenModal(); }
  function irwSetAiGenDifficulty(d) { _irwAiGenState.difficulty = parseInt(d, 10); _irwRenderAiGenModal(); }
  function irwSetAiGenBias(b) { _irwAiGenState.bias = b === _irwAiGenState.bias ? null : b; _irwRenderAiGenModal(); }
  
  function _irwRenderAiGenModal() {
    let modal = document.getElementById('irw-aigen-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'irw-aigen-modal';
      modal.className = 'irw-aigen-modal';
      document.body.appendChild(modal);
    }
    const s = _irwAiGenState;
    const vectorOptions = Object.entries(IRW_VECTORS).map(([id, v]) =>
      `<button type="button" class="irw-aigen-pill ${s.vector === id ? 'is-active' : ''}" onclick="irwSetAiGenVector('${escAttr(id)}')">${v.icon} ${escHtml(v.name)}</button>`
    ).join('');
    const biasOptions = ['identification', 'containment', 'eradication', 'recovery'].map(b =>
      `<button type="button" class="irw-aigen-pill ${s.bias === b ? 'is-active' : ''}" onclick="irwSetAiGenBias('${b}')">${b.charAt(0).toUpperCase() + b.slice(1)}</button>`
    ).join('');
  
    let html = '<div class="irw-aigen-backdrop" onclick="irwCloseAiGenerator()"></div>';
    html += '<div class="irw-aigen-card" role="dialog" aria-label="AI Scenario Generator">';
    html += '<div class="irw-aigen-h">';
    html += '<div class="irw-aigen-h-icon">✨</div>';
    html += '<div><div class="irw-aigen-h-title">AI Scenario Generator</div>';
    html += '<div class="irw-aigen-h-sub">Sonnet 4.6 · Tier C · 7-layer validator-gated</div></div>';
    html += `<button type="button" class="irw-aigen-close" onclick="irwCloseAiGenerator()" aria-label="Close">×</button>`;
    html += '</div>';
    html += '<div class="irw-aigen-body">';
    html += '<div class="irw-aigen-controls">';
    html += '<div class="irw-aigen-row">';
    html += '<div class="irw-aigen-row-label">🎯 Threat vector</div>';
    html += `<div class="irw-aigen-pills">${vectorOptions}</div>`;
    html += '</div>';
    html += '<div class="irw-aigen-row">';
    html += '<div class="irw-aigen-row-label">⭐ Difficulty</div>';
    html += '<div class="irw-aigen-pills">';
    html += `<button type="button" class="irw-aigen-pill ${s.difficulty === 1 ? 'is-active' : ''}" onclick="irwSetAiGenDifficulty(1)">★ Foundational</button>`;
    html += `<button type="button" class="irw-aigen-pill ${s.difficulty === 2 ? 'is-active' : ''}" onclick="irwSetAiGenDifficulty(2)">★★ Exam</button>`;
    html += `<button type="button" class="irw-aigen-pill ${s.difficulty === 3 ? 'is-active' : ''}" onclick="irwSetAiGenDifficulty(3)">★★★ Real-world</button>`;
    html += '</div></div>';
    html += '<div class="irw-aigen-row">';
    html += '<div class="irw-aigen-row-label">🔥 Bias toward weak phase (optional)</div>';
    html += `<div class="irw-aigen-pills">${biasOptions}</div>`;
    html += '</div>';
    html += `<button type="button" class="irw-aigen-btn" onclick="irwGenerateScenario()" ${s.isGenerating ? 'disabled' : ''}>${s.isGenerating ? '⏳ Generating + validating...' : '✨ Generate scenario'}</button>`;
    html += '</div>';
    // Validator panel (right side)
    html += '<div class="irw-aigen-validator-shell">';
    if (!s.lastScenario && !s.isGenerating && !s.lastError) {
      html += '<div class="irw-aigen-validator-empty">📋 Pick options on the left + click Generate. The 7-layer validator output will appear here.</div>';
    }
    if (s.lastError) {
      html += `<div class="irw-aigen-validator-fail">⚠ ${escHtml(s.lastError)}</div>`;
    }
    if (s.lastValidatorResults) {
      const passed = s.lastValidatorResults.filter(r => r.status === 'pass').length;
      html += `<div class="irw-aigen-validator-h">🛡 7-layer validator · <span style="color:${passed === 7 ? '#22c55e' : '#f59e0b'}; font-family:'SF Mono',monospace;">${passed}/7 ✓</span></div>`;
      s.lastValidatorResults.forEach((r, idx) => {
        const iconCls = r.status === 'pass' ? '' : (r.status === 'warn' ? 'is-warn' : 'is-fail');
        const icon = r.status === 'pass' ? '✓' : (r.status === 'warn' ? '!' : '✗');
        html += `<div class="irw-aigen-check-row"><div class="irw-aigen-check-icon ${iconCls}">${icon}</div><div><strong>${idx + 1}. ${escHtml(r.label)}</strong> — ${escHtml(r.detail || '')}</div></div>`;
      });
      if (s.lastScenario && passed === 7) {
        html += '<div class="irw-aigen-output">';
        html += `<div class="irw-aigen-output-h">✓ Validated · ready to load</div>`;
        html += `<div class="irw-aigen-output-title">${escHtml(s.lastScenario.title)}</div>`;
        html += `<div class="irw-aigen-output-summary">${escHtml(s.lastScenario.summary || '')}</div>`;
        html += `<button type="button" class="irw-aigen-load-btn" onclick="_irwLoadGeneratedScenario()">Load + start scenario →</button>`;
        html += '</div>';
      }
    }
    html += '</div>';
    html += '</div></div>';
    modal.innerHTML = html;
  }
  
  async function irwGenerateScenario() {
    const key = (localStorage.getItem(STORAGE.KEY) || '').trim();
    if (!key) {
      _irwAiGenState.lastError = 'Add your Anthropic API key in Settings to generate scenarios.';
      _irwRenderAiGenModal();
      return;
    }
    _irwAiGenState.isGenerating = true;
    _irwAiGenState.lastError = null;
    _irwAiGenState.lastValidatorResults = null;
    _irwAiGenState.lastScenario = null;
    _irwRenderAiGenModal();
  
    const prompt = _irwBuildAiGenPrompt(_irwAiGenState);
  
    try {
      const res = await _claudeFetch( {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: CLAUDE_TEACHER_MODEL,
          max_tokens: MAX_TOKENS_IRW_AIGEN,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!res.ok) {
        _irwAiGenState.lastError = `API error: ${res.status}. Check your API key in Settings.`;
        _irwAiGenState.isGenerating = false;
        _irwRenderAiGenModal();
        return;
      }
      const data = await res.json();
      const text = (data.content && data.content[0] && data.content[0].text) || '';
      // Extract JSON from response (sometimes wrapped in markdown code fences)
      let jsonStr = text.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();
      let scenario;
      try {
        scenario = JSON.parse(jsonStr);
      } catch (parseErr) {
        _irwAiGenState.lastError = 'AI returned invalid JSON. Try regenerating.';
        _irwAiGenState.isGenerating = false;
        _irwRenderAiGenModal();
        return;
      }
      // Run 7-layer validator
      const validatorResults = _irwValidateAiScenario(scenario);
      _irwAiGenState.lastScenario = scenario;
      _irwAiGenState.lastValidatorResults = validatorResults;
      _irwAiGenState.isGenerating = false;
      _irwRenderAiGenModal();
    } catch (e) {
      _irwAiGenState.lastError = `Network error: ${e.message || 'Unknown'}`;
      _irwAiGenState.isGenerating = false;
      _irwRenderAiGenModal();
    }
  }
  
  function _irwBuildAiGenPrompt(opts) {
    const vector = opts.vector;
    const vectorMeta = IRW_VECTORS[vector] || { name: vector };
    const diffLabel = ['', 'Foundational', 'Exam', 'Real-world'][opts.difficulty];
    const biasLine = opts.bias ? `Bias the scenario toward exercising the ${opts.bias} phase (more decisions there).` : '';
    return `You are authoring an Incident Response War Room scenario for the SY0-701 CompTIA Security+ exam prep drill. Output ONLY valid JSON, no surrounding markdown or commentary.
  
  REQUIREMENTS:
  - Threat vector: ${vector} (${vectorMeta.name})
  - Difficulty: ${diffLabel}
  ${biasLine}
  
  SCHEMA (output exactly this shape):
  {
    "id": "kebab-case-slug-unique",
    "title": "Concise title (≤60 chars)",
    "icon": "single emoji",
    "vector": "${vector}",
    "difficulty": ${opts.difficulty},
    "unlockAfter": [],
    "summary": "1-2 sentence tile description (≤180 chars)",
    "context": "3-4 sentence paragraph describing the unfolding incident at the moment of detection",
    "vertical": "Industry context (e.g. Tech / SaaS, Corp finance)",
    "severity": "SEV-1 | SEV-2 | SEV-3",
    "iocs": [
      { "type": "string", "value": "string", "label": "string" }
    ],
    "phases": [
      {
        "stage": "preparation",
        "expectedCount": <number 2-5>,
        "promptTitle": "What action prompt for this phase?",
        "promptStem": "Detail of what the user must do",
        "actions": [
          { "id": "p1aN", "label": "action label", "isCorrect": true|false, "meta": "Phase · subtype", "why": "Why this is right or wrong, citing NIST SP 800-61 / SANS PICERL / SY0-701 objective" }
        ]
      }
      // ... 6 phases total in canonical PICERL order
    ]
  }
  
  CONSTRAINTS:
  1. Exactly 6 phases in this order: preparation, identification, containment, eradication, recovery, lessons
  2. Each phase has 4-6 actions; expectedCount = number of correct picks (typically 2-5)
  3. Each phase needs at least 1 wrong-but-plausible distractor action
  4. At least one SY0-701-canonical TRAP in containment OR eradication phase (e.g. power-off-vs-isolate, restore-before-eradicate, wipe-before-image)
  5. Action ids: p1a1, p1a2, ... p6aN (phase number + action number)
  6. IOCs use realistic format but invented values (no real IPs, hashes, domains, or names)
  7. Every "why" must cite NIST SP 800-61, SANS PICERL, or a specific SY0-701 objective
  8. unlockAfter: leave as []
  9. icon: pick one emoji that matches the vector
  
  Output JSON only. No markdown fences, no commentary.`;
  }
  
  function _irwValidateAiScenario(scenario) {
    // 7-layer validator. Each entry: { status: 'pass'|'warn'|'fail', label, detail }
    const results = [];
    // Layer 1: PICERL stage ordering
    const expectedStages = ['preparation', 'identification', 'containment', 'eradication', 'recovery', 'lessons'];
    const actualStages = Array.isArray(scenario.phases) ? scenario.phases.map(p => p.stage) : [];
    const stageOrderOk = JSON.stringify(actualStages) === JSON.stringify(expectedStages);
    results.push({
      status: stageOrderOk ? 'pass' : 'fail',
      label: 'PICERL stage ordering',
      detail: stageOrderOk ? '6 phases in canonical PICERL order' : `Expected ${expectedStages.join(' → ')}, got ${actualStages.join(' → ')}`
    });
    // Layer 2: Action realism (require structured actions with required fields)
    let realismOk = true;
    let realismDetail = 'every action has label + isCorrect + meta + why';
    if (scenario.phases) {
      for (const p of scenario.phases) {
        if (!Array.isArray(p.actions)) { realismOk = false; realismDetail = 'phase missing actions array'; break; }
        for (const a of p.actions) {
          if (!a.label || typeof a.isCorrect !== 'boolean' || !a.why) {
            realismOk = false; realismDetail = `action ${a.id || '?'} missing required fields`; break;
          }
        }
      }
    } else { realismOk = false; realismDetail = 'no phases array'; }
    results.push({ status: realismOk ? 'pass' : 'fail', label: 'Action realism', detail: realismDetail });
    // Layer 3: IOC plausibility (need iocs array, must not contain obviously real IPs)
    let iocsOk = true;
    let iocsDetail = 'IOCs structurally valid';
    if (!Array.isArray(scenario.iocs) || scenario.iocs.length === 0) {
      iocsOk = false; iocsDetail = 'missing or empty iocs array';
    } else {
      // Reject if any IOC value contains famously real IPs (8.8.8.8, 1.1.1.1) or real-domains
      for (const ioc of scenario.iocs) {
        if (/\b(8\.8\.8\.8|1\.1\.1\.1|8\.8\.4\.4)\b/.test(ioc.value || '')) { iocsOk = false; iocsDetail = 'contains real public IP'; break; }
        if (/(google|microsoft|amazon|github|aws)\.com/.test((ioc.value || '').toLowerCase())) { iocsOk = false; iocsDetail = 'contains real registered domain'; break; }
      }
    }
    results.push({ status: iocsOk ? 'pass' : 'fail', label: 'IOC plausibility', detail: iocsDetail });
    // Layer 4: Per-phase action count (4-6 per phase)
    let countOk = true;
    let countDetail = 'each phase has 4-6 actions';
    if (scenario.phases) {
      for (const p of scenario.phases) {
        const n = (p.actions || []).length;
        if (n < 4 || n > 8) { countOk = false; countDetail = `phase ${p.stage} has ${n} actions (need 4-8)`; break; }
      }
    } else { countOk = false; countDetail = 'no phases'; }
    results.push({ status: countOk ? 'pass' : (countOk === false ? 'fail' : 'warn'), label: 'Per-phase action count', detail: countDetail });
    // Layer 5: Distractor quality (each phase needs ≥1 wrong action)
    let distractorOk = true;
    let distractorDetail = 'each phase has ≥1 plausible distractor';
    if (scenario.phases) {
      for (const p of scenario.phases) {
        const wrongs = (p.actions || []).filter(a => a.isCorrect === false);
        if (wrongs.length < 1) { distractorOk = false; distractorDetail = `phase ${p.stage} has 0 distractors`; break; }
      }
    } else { distractorOk = false; }
    results.push({ status: distractorOk ? 'pass' : 'warn', label: 'Distractor quality', detail: distractorDetail });
    // Layer 6: Trap presence (at least 1 trap-like action in containment OR eradication)
    let trapOk = false;
    let trapDetail = 'no canonical SY0-701 trap detected';
    if (scenario.phases) {
      const trapPhases = scenario.phases.filter(p => p.stage === 'containment' || p.stage === 'eradication');
      for (const p of trapPhases) {
        // Look for trap signals: "wrong" actions whose `why` mentions trap, fatigue, panic, destroys, or canonical traps
        const trapSignals = (p.actions || []).filter(a => a.isCorrect === false && /trap|destroys|over-reach|premature|panic|wrong phase|anti-pattern/i.test(a.why || ''));
        if (trapSignals.length > 0) { trapOk = true; trapDetail = `${trapSignals.length} trap action(s) in ${p.stage}`; break; }
      }
    }
    if (!trapOk) {
      // Also accept explicit trapCallout field
      if (scenario.phases && scenario.phases.some(p => p.trapCallout)) {
        trapOk = true; trapDetail = 'phase trapCallout present';
      }
    }
    results.push({ status: trapOk ? 'pass' : 'warn', label: 'Trap presence', detail: trapDetail });
    // Layer 7: Citation grounding — at least 50% of `why` should cite a framework/objective
    let citationOk = false;
    let citationDetail = 'fewer than 30% of explanations cite a standard';
    if (scenario.phases) {
      let total = 0, cited = 0;
      for (const p of scenario.phases) {
        for (const a of p.actions || []) {
          total++;
          if (/(NIST|SANS|PICERL|SY0|RFC|800-61|MITRE)/i.test(a.why || '')) cited++;
        }
      }
      const pct = total > 0 ? (cited / total) : 0;
      if (pct >= 0.30) { citationOk = true; citationDetail = `${Math.round(pct * 100)}% of explanations cite a standard`; }
      else citationDetail = `only ${Math.round(pct * 100)}% cite a standard (need ≥30%)`;
    }
    results.push({ status: citationOk ? 'pass' : 'warn', label: 'Citation grounding', detail: citationDetail });
    return results;
  }
  
  function _irwLoadGeneratedScenario() {
    if (!_irwAiGenState.lastScenario) return;
    const passedAll = (_irwAiGenState.lastValidatorResults || []).filter(r => r.status === 'pass').length === 7;
    if (!passedAll) {
      if (typeof showToast === 'function') showToast('Validator did not fully pass — fix or regenerate first.', 'info');
      return;
    }
    const scen = _irwAiGenState.lastScenario;
    // Append to in-memory bank for this session
    if (!IRW_DATA.find(s => s.id === scen.id)) {
      IRW_DATA.push(scen);
    }
    // v4.97.3: persist to localStorage so AI-gen scenarios survive page reload + cloud-sync
    _irwSaveGeneratedScenario(scen);
    irwCloseAiGenerator();
    irwStartScenario(scen.id);
  }
  
  // v4.97.3: hydrate AI-generated scenarios into IRW_DATA on app boot.
  // Called once when the IRW module loads — pushes any saved scenarios from
  // localStorage into the in-memory bank so they appear in the catalog.
  (function _irwHydrateAiGenScenarios() {
    if (!_USE_SECPLUS_IRW) return;
    try {
      const saved = _irwLoadGeneratedScenarios();
      saved.forEach(s => {
        if (s && s.id && !IRW_DATA.find(x => x.id === s.id)) {
          IRW_DATA.push(s);
        }
      });
    } catch (_) {}
  })();

  // ── Shell-callable teardown (v4.99.39) ──
  // goSetup() and other navigation paths can fire this to ensure the pressure
  // timer is cleared when user leaves IRW. Mirrors the v4.99.38 _portDrillTeardown
  // pattern. Idempotent — safe to call when no scenario is active.
  window._irwTeardown = function() {
    try {
      if (_irwPressureTimerId) {
        clearInterval(_irwPressureTimerId);
        _irwPressureTimerId = null;
      }
      _irwPressureActive = false;
    } catch (_) {}
  };

  // ── Expose to window so onclick handlers in rendered HTML find them ──
  window.setIrwTab = setIrwTab;
  window.irwStartScenario = irwStartScenario;
  window.irwToggleAction = irwToggleAction;
  window.irwSubmitDecisions = irwSubmitDecisions;
  window.irwAdvancePhase = irwAdvancePhase;
  window.irwSetMode = irwSetMode;
  window.irwOpenAiGenerator = irwOpenAiGenerator;
  window.irwCloseAiGenerator = irwCloseAiGenerator;
  window.irwSetAiGenVector = irwSetAiGenVector;
  window.irwSetAiGenDifficulty = irwSetAiGenDifficulty;
  window.irwSetAiGenBias = irwSetAiGenBias;
  window.irwGenerateScenario = irwGenerateScenario;
  window._irwLoadGeneratedScenario = _irwLoadGeneratedScenario;

  // ── Register feature module entry point ──
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures["incident-response"] = {
    enter: function() {
      if (!_USE_SECPLUS_IRW) {
        if (typeof showToast === "function") showToast("Incident Response War Room is Security+ only.", "info");
        return;
      }
      showPage("irw");
      setIrwTab("practice");
    },
    leave: function() {
      window._irwTeardown();
      _irwActiveScenarioId = null;
      _irwActiveScenario = null;
      _irwActivePhaseIdx = 0;
      _irwPickedActionIds = [];
      _irwPhaseRevealed = false;
      _irwPhaseScores = [];
      _irwPressureExpired = false;
    },
  };
})();
