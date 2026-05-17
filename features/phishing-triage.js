// ════════════════════════════════════════════════════════════════════
// features/phishing-triage.js — Phase 11b feature module (v4.99.37)
// ════════════════════════════════════════════════════════════════════
//
// Extracted from app.js in v4.99.37:
//   Block 1: lines 32230-32243 (constants — 14 LOC)
//   Block 2: lines 34992-36071 (state + functions — 1,080 LOC)
// Total: ~1,094 LOC. Lazy-loaded on first navigation to #page-pht.
// Saves ~50 KB transfer from the shell on first paint.
//
// Cert-aware: PHT only renders content for SY0-701 (Sec+). Network+
// users get an empty bank because _USE_SECPLUS_PHT short-circuits to
// false. The constants are still evaluated at module-load time —
// CERT_PACK is populated by then because the cert pack loads before
// any feature module (synchronous via document.write in <head>).
//
// Contract per PHASE_11B_CUT_POINTS.md: IIFE-wrapped, onclick targets
// exposed on window, registered as window._certanvilFeatures["pht"]
// = { enter, leave }.
// ════════════════════════════════════════════════════════════════════

(function() {
  "use strict";

  // ── Constants (originally app.js:32230-32243) ──
  // ── Phishing Triage Lab (v4.98.0, issue #313) ───────────────────────────
  // Flagship Security+ drill #2 (SY0-701 Domain 2, 22%). Click-the-flag inbox
  // simulator across email/SMS/voice/QR. v4.98.0 ships 6 email phish + 4
  // lesson cards; v4.98.1 adds smishing; v4.98.2 adds vishing+quishing;
  // v4.98.3 adds AI generator + dashboard. Visual contract locked to
  // mockups/security-phishing-email-triage-lab-concept.html (9 states).
  const _SECPLUS_HAS_PHT = typeof CERT_PACK === 'object' && CERT_PACK !== null
    && Array.isArray(CERT_PACK.phishingScenarios) && CERT_PACK.phishingScenarios.length > 0;
  const _USE_SECPLUS_PHT = (typeof CURRENT_CERT !== 'undefined') && CURRENT_CERT === 'secplus' && _SECPLUS_HAS_PHT;
  const PHT_DATA = _USE_SECPLUS_PHT ? CERT_PACK.phishingScenarios : [];
  const PHT_LESSONS = _USE_SECPLUS_PHT && Array.isArray(CERT_PACK.phishingLessons)
    ? CERT_PACK.phishingLessons : [];
  const PHT_VECTORS = _USE_SECPLUS_PHT && CERT_PACK.phishingVectors
    ? CERT_PACK.phishingVectors : {};

  // ── State + functions (originally app.js:34992-36071) ──
  // ════════════════════════════════════════════════════════════════════
  // PHISHING TRIAGE LAB (v4.98.0, issue #313) — Flagship #2 for Sec+
  // SY0-701 Domain 2 (22%) flagship. Click-the-flag inbox simulator.
  // 6 email phish at v4.98.0; +4 email + smishing v4.98.1; vishing +
  // quishing v4.98.2; AI gen + dashboard v4.98.3.
  // ════════════════════════════════════════════════════════════════════
  let _phtActiveScenarioId = null;
  let _phtActiveScenario = null;
  let _phtTaggedFlagIds = [];          // currently-tagged flag ids
  let _phtWrongTags = [];               // user clicks that weren't flags
  let _phtRevealed = false;
  let _phtPickedDecision = null;        // 'report' | 'delete' | 'reply' | 'click' | 'spam'
  
  function phtInitMastery() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE.PHT_MASTERY) || 'null');
      if (raw && typeof raw === 'object') return raw;
    } catch (_) {}
    const m = {};
    PHT_DATA.forEach(s => { m[s.id] = { pips: 0, lastRun: null, bestFlagPct: 0, runs: 0, completed: 0, decisionCorrect: false }; });
    return m;
  }
  function phtSaveMastery(m) {
    try { localStorage.setItem(STORAGE.PHT_MASTERY, JSON.stringify(m)); _cloudFlush(STORAGE.PHT_MASTERY); } catch (_) {}
  }
  // v4.99.9 — phtGetScenarioMastery removed. The function was authored alongside
  // phtUpdateScenarioMastery in the v4.98.0 PHT batch but never wired in;
  // every consumer (phtRenderDashboard, phtFinishScenario, etc.) reaches into
  // phtInitMastery() directly + reads the scenario key inline. UAT regression
  // guard prevents accidental resurrection. Companion update fn stays — it IS used.
  function phtUpdateScenarioMastery(scenarioId, flagPct, decisionCorrect) {
    const m = phtInitMastery();
    if (!m[scenarioId]) m[scenarioId] = { pips: 0, lastRun: null, bestFlagPct: 0, runs: 0, completed: 0, decisionCorrect: false };
    const e = m[scenarioId];
    e.runs += 1; e.completed += 1;
    e.lastRun = new Date().toISOString();
    if (flagPct > e.bestFlagPct) e.bestFlagPct = flagPct;
    if (decisionCorrect) e.decisionCorrect = true;
    // Mastery pip: ≥80% flag-catch + correct decision adds a pip (max 3).
    if (flagPct >= 0.80 && decisionCorrect && e.pips < 3) e.pips += 1;
    phtSaveMastery(m);
    return e;
  }
  function phtIsScenarioUnlocked(scenario) {
    if (!scenario.unlockAfter || scenario.unlockAfter.length === 0) return true;
    const m = phtInitMastery();
    return scenario.unlockAfter.every(reqId => {
      const e = m[reqId];
      return e && e.pips >= 2;
    });
  }
  function setPhtTab(tabId) {
    ['practice', 'lessons', 'dashboard'].forEach(t => {
      const btn = document.getElementById('pht-tab-btn-' + t);
      const panel = document.getElementById('pht-tab-' + t);
      if (btn) {
        btn.classList.toggle('pht-tab-active', t === tabId);
        btn.setAttribute('aria-selected', t === tabId ? 'true' : 'false');
        btn.setAttribute('tabindex', t === tabId ? '0' : '-1');
      }
      if (panel) panel.classList.toggle('is-hidden', t !== tabId);
    });
    if (tabId === 'practice') phtRenderHome();
    else if (tabId === 'lessons') phtRenderLessons();
    else if (tabId === 'dashboard') phtRenderDashboard();
  }
  // Original startPhishingTriageLab body inlined into enter() at module bottom.
  function phtRenderHome() {
    const host = document.getElementById('pht-stage-host');
    if (!host) return;
    // Reset session
    _phtActiveScenarioId = null; _phtActiveScenario = null;
    _phtTaggedFlagIds = []; _phtWrongTags = [];
    _phtRevealed = false; _phtPickedDecision = null;
  
    const m = phtInitMastery();
    const totalScenarios = PHT_DATA.length;
    const masteredCount = Object.values(m).filter(e => e.pips >= 3).length;
    const completedCount = Object.values(m).filter(e => e.completed > 0).length;
  
    let html = '<div class="pht-setup-shell">';
    html += '<div class="pht-stats-strip">';
    html += `<span class="pht-stat"><span class="pht-stat-num">${masteredCount}/${totalScenarios}</span><span class="pht-stat-label">Mastered</span></span>`;
    html += `<span class="pht-stat"><span class="pht-stat-num">${completedCount}</span><span class="pht-stat-label">Completed</span></span>`;
    html += `<span class="pht-stat"><span class="pht-stat-num">${PHT_DATA.length}</span><span class="pht-stat-label">Phish in bank</span></span>`;
    html += '</div>';
    html += '<div class="pht-mode-notice"><strong>Practice mode</strong> · Click the red flags · Pick the right action · Reveal-on-submit. All 4 vectors live: email · smishing · vishing · quishing. AI generator + dashboard in v4.98.3.</div>';
  
    // Vector filter — all 4 vectors live in v4.98.2
    html += '<div class="pht-variant-row">';
    const liveVectors = ['email', 'sms', 'voice', 'qr'];
    Object.entries(PHT_VECTORS).forEach(([id, v]) => {
      const isLive = liveVectors.includes(id);
      const count = PHT_DATA.filter(s => s.vector === id).length;
      if (isLive) {
        html += `<span class="pht-variant-pill is-active">${escHtml(v.name)} (${count})</span>`;
      } else {
        html += `<span class="pht-variant-pill is-disabled">${escHtml(v.name)} <span class="pht-variant-pill-soon">soon</span></span>`;
      }
    });
    html += '</div>';
  
    // Scenario grid
    html += '<div class="pht-scenario-grid">';
    PHT_DATA.forEach(scen => {
      const mEntry = m[scen.id] || { pips: 0, completed: 0, bestFlagPct: 0 };
      const unlocked = phtIsScenarioUnlocked(scen);
      const vector = PHT_VECTORS[scen.vector] || { name: 'Unknown', icon: '', color: '#6b6b90' };
      const diffLabel = ['', 'Foundational', 'Exam', 'Hard'][scen.difficulty] || '';
      html += `<div class="pht-scen-card ${unlocked ? '' : 'is-locked'}"${unlocked ? ` onclick="phtStartScenario('${escAttr(scen.id)}')"` : ''}>`;
      // v4.98.5: simple corner padlock badge
      if (!unlocked) {
        html += '<span class="pht-scen-lock-badge">LOCKED</span>';
      }
      html += '<div class="pht-scen-row1">';
      html += '<div class="pht-scen-icon"></div>';
      html += '<div class="pht-scen-titlewrap">';
      html += `<div class="pht-scen-title">${escHtml(scen.title)}</div>`;
      html += '<div class="pht-scen-meta">';
      html += `<span class="pht-scen-tag">${escHtml(vector.name)}</span>`;
      html += `<span class="pht-scen-tag pht-scen-diff-${scen.difficulty}">${diffLabel}</span>`;
      html += `<span class="pht-scen-tag pht-scen-tag-muted">${scen.flags.length} red flags</span>`;
      html += '</div></div></div>';
      html += `<div class="pht-scen-summary">${escHtml(scen.summary)}</div>`;
      html += '<div class="pht-scen-mastery">';
      for (let i = 0; i < 3; i++) html += `<div class="pht-scen-pip ${i < mEntry.pips ? 'is-on' : ''}"></div>`;
      if (mEntry.completed > 0) {
        html += `<span class="pht-scen-completed">${mEntry.completed} run${mEntry.completed === 1 ? '' : 's'} · best ${Math.round(mEntry.bestFlagPct * 100)}% flags</span>`;
      }
      html += '</div>';
      // v4.98.5: prereq banner in normal flow (was overlapping title in abs-positioned lock div)
      if (!unlocked) {
        const reqId = scen.unlockAfter[0];
        const reqScen = PHT_DATA.find(s => s.id === reqId);
        const reqTitle = reqScen ? reqScen.title : reqId;
        html += `<div class="pht-scen-lock-banner">Master <strong>"${escHtml(reqTitle)}"</strong> to unlock</div>`;
      }
      html += '</div>';
    });
    html += '</div>';
  
    html += '<div class="pht-aigen-stub is-live" onclick="phtOpenAiGenerator()">';
    html += '<div class="pht-aigen-stub-icon"></div>';
    html += '<div><strong>AI phish generator</strong> — Sonnet 4.6 authors fresh phish across all 4 vectors. 7-layer validator gates every output (vector validity · action realism · no real PII · ≥4 flags · SY0-701 citation · 5 decision actions · vector-format match). Click to open.</div>';
    html += '<div class="pht-aigen-stub-cta">Open generator →</div>';
    html += '</div>';
    html += '</div>';
    host.innerHTML = html;
  }
  function phtStartScenario(scenarioId) {
    if (!_gateProOnly('Phishing Triage Lab')) return;
    const scen = PHT_DATA.find(s => s.id === scenarioId);
    if (!scen) { console.warn('PHT: scenario not found:', scenarioId); return; }
    if (!phtIsScenarioUnlocked(scen)) {
      if (typeof showToast === 'function') showToast('Master prerequisite scenario first.', 'info');
      return;
    }
    _phtActiveScenarioId = scenarioId;
    _phtActiveScenario = scen;
    _phtTaggedFlagIds = [];
    _phtWrongTags = [];
    _phtRevealed = false;
    _phtPickedDecision = null;
    // v4.98.1: route to vector-specific renderer · v4.98.2 adds voice + qr
    if (scen.vector === 'sms') {
      phtRenderSmsClient();
    } else if (scen.vector === 'voice') {
      phtRenderVoiceClient();
    } else if (scen.vector === 'qr') {
      phtRenderQrClient();
    } else {
      phtRenderEmailClient();
    }
  }
  function phtRenderEmailClient() {
    const host = document.getElementById('pht-stage-host');
    if (!host || !_phtActiveScenario) return;
    const scen = _phtActiveScenario;
    const totalFlags = scen.flags.length;
    const tagged = _phtTaggedFlagIds.length;

    let html = '';
    // Triage bar (top)
    html += '<div class="pht-triage-bar">';
    html += '<div class="pht-tb-l">';
    html += `<div class="pht-tb-counter">${tagged}/${totalFlags}</div>`;
    html += '<div>';
    html += `<div class="pht-tb-label">Red flags tagged · ${escHtml(scen.title)}</div>`;
    html += `<div class="pht-tb-mode">Practice mode${_phtWrongTags.length > 0 && !_phtRevealed ? ` · ${_phtWrongTags.length} wrong tag${_phtWrongTags.length === 1 ? '' : 's'}` : ''}</div>`;
    html += '</div></div>';
    if (!_phtRevealed) {
      html += '<div class="pht-tb-r">';
      ['report', 'delete', 'reply', 'click', 'spam'].forEach(act => {
        const labels = { report: 'Report', delete: 'Delete', reply: 'Reply', click: 'Click', spam: 'Spam' };
        html += `<button class="pht-decision-btn" onclick="phtSubmitDecision('${act}')">${labels[act]}</button>`;
      });
      html += '</div>';
    }
    html += '</div>';
  
    // Email reading pane
    html += '<div class="pht-reading">';
    html += '<div class="pht-rd-head">';
    html += `<div class="pht-rd-subj">${escHtml(scen.subject)}</div>`;
    html += '<div class="pht-rd-from-row">';
    const av = scen.sender.avatar || '??';
    const avC = scen.sender.avatarColor || '#7c6ff7';
    html += `<span class="pht-rd-avatar" style="background:${avC};">${escHtml(av)}</span>`;
    html += `<strong>${escHtml(scen.sender.name)}</strong> <span class="pht-rd-faded">&lt;<span class="flag" data-fid="sender-email" onclick="phtToggleFlag(event, 'sender-email')">${escHtml(scen.sender.email)}</span>&gt;</span>`;
    html += '</div>';
    html += `<div class="pht-rd-meta">To: ${escHtml(scen.to)}`;
    if (scen.replyTo) {
      html += ` · Reply-To: <span class="flag" data-fid="reply-to" onclick="phtToggleFlag(event, 'reply-to')">${escHtml(scen.replyTo)}</span>`;
    }
    html += ` · ${escHtml(scen.time)}</div>`;
    html += '</div>';
    // Process bodyHtml: wire up flag click handlers + tagged-state
    let processedBody = scen.bodyHtml || '';
    // Inject onclick to every <span class="flag" data-fid="X">
    processedBody = processedBody.replace(/<span class="flag" data-fid="([^"]+)"/g, (m, fid) => {
      let cls = 'flag';
      if (_phtTaggedFlagIds.includes(fid)) cls += ' is-tagged';
      if (_phtRevealed) {
        // mark revealed flags green if not already tagged
        if (!_phtTaggedFlagIds.includes(fid)) cls += ' is-revealed-missed';
      }
      const onClickAttr = _phtRevealed ? '' : ` onclick="phtToggleFlag(event, '${fid}')"`;
      return `<span class="${cls}" data-fid="${fid}"${onClickAttr}`;
    });
    html += `<div class="pht-rd-body" onclick="phtBodyClick(event)">${processedBody}</div>`;
    if (scen.attachments && scen.attachments.length > 0) {
      html += '<div class="pht-rd-attachments">';
      html += '<div class="pht-rd-attachments-h">Attachments</div>';
      scen.attachments.forEach(att => {
        html += `<div class="pht-rd-attachment">${escHtml(att.name)}${att.protected ? ' <span class="pht-rd-attachment-tag">password protected</span>' : ''}</div>`;
      });
      html += '</div>';
    }
    html += '</div>';
  
    // Reveal panel (post-decision)
    if (_phtRevealed) {
      html += phtRenderReveal();
    }
    host.innerHTML = html;
    if (host.scrollIntoView) { try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {} }
  }
  function phtRenderSmsClient() {
    // v4.98.1: smishing UI — phone-frame mock with SMS bubble + decision panel.
    const host = document.getElementById('pht-stage-host');
    if (!host || !_phtActiveScenario) return;
    const scen = _phtActiveScenario;
    const totalFlags = scen.flags.length;
    const tagged = _phtTaggedFlagIds.length;

    let html = '';
    // Triage bar
    html += '<div class="pht-triage-bar">';
    html += '<div class="pht-tb-l">';
    html += `<div class="pht-tb-counter">${tagged}/${totalFlags}</div>`;
    html += '<div>';
    html += `<div class="pht-tb-label">Red flags tagged · Smishing · ${escHtml(scen.title)}</div>`;
    html += `<div class="pht-tb-mode">Practice mode${_phtWrongTags.length > 0 && !_phtRevealed ? ` · ${_phtWrongTags.length} wrong tag${_phtWrongTags.length === 1 ? '' : 's'}` : ''}</div>`;
    html += '</div></div>';
    html += '</div>';
  
    // Phone-frame layout (phone left + decision panel right on wide screens)
    html += '<div class="pht-sms-layout">';
  
    // Phone frame
    html += '<div class="pht-phone-frame">';
    html += '<div class="pht-phone-screen">';
    // Status bar
    html += '<div class="pht-phone-statusbar">';
    html += '<span>9:14 AM</span>';
    html += '<span>5G ◢◢◢ 87%</span>';
    html += '</div>';
    // App header (sender ID = first flag)
    html += '<div class="pht-phone-app-h">';
    // The senderId itself is potentially a flag — render with class="flag" data-fid="sender-id"
    html += `<div class="pht-phone-app-h-name"><span class="flag" data-fid="sender-id" onclick="phtToggleFlag(event, 'sender-id')">${escHtml(scen.senderId || '+0 (000) 000-0000')}</span></div>`;
    html += '<div class="pht-phone-app-h-sub">SMS / Text Message</div>';
    html += '</div>';
    // Message body
    html += '<div class="pht-phone-msg-list">';
    html += `<div class="pht-phone-msg-time">${escHtml(scen.time || 'Today')}</div>`;
    // Process bodyHtml flag wiring
    let processedBody = scen.bodyHtml || '';
    processedBody = processedBody.replace(/<span class="flag" data-fid="([^"]+)"/g, (m, fid) => {
      let cls = 'flag';
      if (_phtTaggedFlagIds.includes(fid)) cls += ' is-tagged';
      if (_phtRevealed && !_phtTaggedFlagIds.includes(fid)) cls += ' is-revealed-missed';
      const onClickAttr = _phtRevealed ? '' : ` onclick="phtToggleFlag(event, '${fid}')"`;
      return `<span class="${cls}" data-fid="${fid}"${onClickAttr}`;
    });
    html += `<div class="pht-phone-msg-bubble" onclick="phtBodyClick(event)">${processedBody}</div>`;
    html += '</div>';
    html += '</div></div>';
  
    // Decision + smishing-flags-to-watch panel
    html += '<div class="pht-sms-side">';
    if (!_phtRevealed) {
      html += '<div class="pht-sms-decision-card">';
      html += '<div class="pht-sms-decision-h">Decision</div>';
      [
        ['report', 'Report + forward to 7726'],
        ['delete', 'Delete'],
        ['reply', 'Reply'],
        ['click', 'Tap the link'],
        ['spam', 'Block sender']
      ].forEach(([act, label]) => {
        html += `<button class="pht-decision-btn" style="text-align:left;" onclick="phtSubmitDecision('${act}')">${label}</button>`;
      });
      html += '</div>';
    }
    // Smishing flags-to-watch reference
    html += '<div class="pht-sms-tips">';
    html += '<div class="pht-sms-tips-h">Smishing-specific flags</div>';
    html += '<ul>';
    html += '<li>Custom sender ID for unsolicited contact</li>';
    html += '<li>Shortened URLs (bit.ly, tinyurl)</li>';
    html += '<li>Tight time windows (30 min – 12h)</li>';
    html += '<li>Reply-keyword fishing (YES / NO)</li>';
    html += '<li>Callback number not on physical card</li>';
    html += '<li><strong>NEVER share 2FA codes</strong></li>';
    html += '</ul>';
    html += '</div>';
    html += '</div>';
    html += '</div>';  // close pht-sms-layout
  
    // Reveal panel after decision
    if (_phtRevealed) {
      html += phtRenderReveal();
    }
    host.innerHTML = html;
    if (host.scrollIntoView) { try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {} }
  }
  
  function phtRenderVoiceClient() {
    // v4.98.2: vishing UI — voicemail player + transcript with click-the-flag.
    const host = document.getElementById('pht-stage-host');
    if (!host || !_phtActiveScenario) return;
    const scen = _phtActiveScenario;
    const totalFlags = scen.flags.length;
    const tagged = _phtTaggedFlagIds.length;

    let html = '';
    html += '<div class="pht-triage-bar">';
    html += '<div class="pht-tb-l">';
    html += `<div class="pht-tb-counter">${tagged}/${totalFlags}</div>`;
    html += '<div>';
    html += `<div class="pht-tb-label">Red flags tagged · Vishing · ${escHtml(scen.title)}</div>`;
    html += `<div class="pht-tb-mode">Practice mode${_phtWrongTags.length > 0 && !_phtRevealed ? ` · ${_phtWrongTags.length} wrong tag${_phtWrongTags.length === 1 ? '' : 's'}` : ''}</div>`;
    html += '</div></div></div>';
  
    html += '<div class="pht-voice-layout">';
  
    // Voicemail card
    html += '<div class="pht-voicemail-card">';
    html += '<div class="pht-voicemail-head">';
    html += '<div class="pht-voicemail-icon"></div>';
    html += '<div>';
    html += `<div class="pht-voicemail-title"><span class="flag" data-fid="caller-id" onclick="phtToggleFlag(event, 'caller-id')">${escHtml(scen.callerId || '+0 (000) 000-0000')}</span></div>`;
    html += `<div class="pht-voicemail-meta">${escHtml(scen.time || 'Today')} · ${escHtml(scen.voicemailLength || '0:30')} voicemail</div>`;
    html += '</div></div>';
    // Player
    html += '<div class="pht-voicemail-player">';
    html += '<button class="pht-voicemail-play-btn" type="button" aria-label="Play voicemail (mock)">▶</button>';
    html += '<div class="pht-voicemail-progress"><div class="pht-voicemail-progress-fill"></div></div>';
    html += `<div class="pht-voicemail-time">${escHtml(scen.voicemailLength || '0:30')}</div>`;
    html += '</div>';
    // Transcript
    html += '<div class="pht-voicemail-transcript-h">Auto-transcript</div>';
    let processedTranscript = scen.transcript || '';
    processedTranscript = processedTranscript.replace(/<span class="flag" data-fid="([^"]+)"/g, (m, fid) => {
      let cls = 'flag';
      if (_phtTaggedFlagIds.includes(fid)) cls += ' is-tagged';
      if (_phtRevealed && !_phtTaggedFlagIds.includes(fid)) cls += ' is-revealed-missed';
      const onClickAttr = _phtRevealed ? '' : ` onclick="phtToggleFlag(event, '${fid}')"`;
      return `<span class="${cls}" data-fid="${fid}"${onClickAttr}`;
    });
    html += `<div class="pht-voicemail-transcript" onclick="phtBodyClick(event)">${processedTranscript}</div>`;
    html += '</div>';
  
    // Decision + tips panel
    html += '<div class="pht-voice-side">';
    if (!_phtRevealed) {
      html += '<div class="pht-sms-decision-card">';
      html += '<div class="pht-sms-decision-h">Decision</div>';
      [
        ['report', 'Report + delete voicemail'],
        ['delete', 'Just delete'],
        ['reply', 'Call back to verify'],
        ['click', 'Visit URL mentioned'],
        ['spam', 'Block the number']
      ].forEach(([act, label]) => {
        html += `<button class="pht-decision-btn" style="text-align:left;" onclick="phtSubmitDecision('${act}')">${label}</button>`;
      });
      html += '</div>';
    }
    html += '<div class="pht-voice-tips">';
    html += '<div class="pht-voice-tips-h">Vishing-specific flags</div>';
    html += '<ul>';
    html += '<li>Caller-ID can be spoofed — never trust alone</li>';
    html += '<li>Microsoft / Apple / IRS / SSA NEVER call you</li>';
    html += '<li>SSN / arrest / warrant threats = scam</li>';
    html += '<li><strong>Gift cards / Bitcoin = always scam</strong></li>';
    html += '<li>Remote-access requests = catastrophic</li>';
    html += '<li>Press-keypad routing traps you with live scammers</li>';
    html += '<li>Defense: hang up + call back via official number</li>';
    html += '</ul>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  
    if (_phtRevealed) html += phtRenderReveal();
    host.innerHTML = html;
    if (host.scrollIntoView) { try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {} }
  }
  
  function phtRenderQrClient() {
    // v4.98.2: quishing UI — QR image + decoded URL + context panel.
    const host = document.getElementById('pht-stage-host');
    if (!host || !_phtActiveScenario) return;
    const scen = _phtActiveScenario;
    const totalFlags = scen.flags.length;
    const tagged = _phtTaggedFlagIds.length;

    let html = '';
    html += '<div class="pht-triage-bar">';
    html += '<div class="pht-tb-l">';
    html += `<div class="pht-tb-counter">${tagged}/${totalFlags}</div>`;
    html += '<div>';
    html += `<div class="pht-tb-label">Red flags tagged · Quishing · ${escHtml(scen.title)}</div>`;
    html += `<div class="pht-tb-mode">Practice mode${_phtWrongTags.length > 0 && !_phtRevealed ? ` · ${_phtWrongTags.length} wrong tag${_phtWrongTags.length === 1 ? '' : 's'}` : ''}</div>`;
    html += '</div></div></div>';
  
    html += '<div class="pht-qr-layout">';
  
    // QR card (left side)
    html += '<div class="pht-qr-card">';
    html += '<div class="pht-qr-image"></div>';
    html += '<div class="pht-qr-detail">';
    html += `<div class="pht-qr-context">${escHtml(scen.context || '')}</div>`;
    // Decoded URL preview (this is THE thing the user inspects + tags)
    html += '<div class="pht-qr-mobile-preview">';
    html += '<div class="pht-qr-mobile-preview-h">What your phone shows after scan</div>';
    // The decoded URL itself is a flag — wrap in flag span
    html += `<div class="pht-qr-mobile-url"><span class="flag" data-fid="decoded-url" onclick="phtToggleFlag(event, 'decoded-url')">${escHtml(scen.decodedUrl || '')}</span></div>`;
    if (scen.realUrl) {
      html += `<div class="pht-qr-real-url">Real ${escHtml(scen.title.split(' ')[0]).toLowerCase()} domain: <code>${escHtml(scen.realUrl)}</code>`;
      if (scen.domainAge) html += ` · this domain registered <span class="flag" data-fid="domain-age" onclick="phtToggleFlag(event, 'domain-age')">${escHtml(scen.domainAge)}</span>`;
      html += '</div>';
    }
    html += '</div>';
    // List view of flags as clickable items (since there's no body text to click)
    html += '<div class="pht-qr-flag-list">';
    html += '<div class="pht-qr-flag-list-h">Tag the red flags about this QR</div>';
    scen.flags.forEach(f => {
      if (f.id === 'decoded-url' || f.id === 'domain-age') return;  // already rendered inline
      let cls = 'pht-qr-flag-tag';
      if (_phtTaggedFlagIds.includes(f.id)) cls += ' is-tagged';
      if (_phtRevealed && !_phtTaggedFlagIds.includes(f.id)) cls += ' is-revealed-missed';
      const onClickAttr = _phtRevealed ? '' : ` onclick="phtToggleFlag(event, '${f.id}')"`;
      html += `<div class="${cls}"${onClickAttr}>${escHtml(f.label)}</div>`;
    });
    html += '</div>';
    html += '</div></div>';
  
    // Decision + tips panel
    html += '<div class="pht-qr-side">';
    if (!_phtRevealed) {
      html += '<div class="pht-sms-decision-card">';
      html += '<div class="pht-sms-decision-h">Decision</div>';
      [
        ['report', 'Report + use official channel'],
        ['delete', 'Walk away / ignore'],
        ['reply', 'Use the QR anyway'],
        ['click', 'Verify domain first then click'],
        ['spam', 'Block the domain']
      ].forEach(([act, label]) => {
        html += `<button class="pht-decision-btn" style="text-align:left;" onclick="phtSubmitDecision('${act}')">${label}</button>`;
      });
      html += '</div>';
    }
    html += '<div class="pht-qr-tips">';
    html += '<div class="pht-qr-tips-h">Quishing-specific flags</div>';
    html += '<ul>';
    html += '<li>Sticker-over-original physical attack pattern</li>';
    html += '<li>Lookalike domain / unusual TLD (.app vs .gov)</li>';
    html += '<li>Recent domain registration (&lt; 30 days)</li>';
    html += '<li>HTTPS doesn\'t mean trustworthy</li>';
    html += '<li><strong>Login on a "menu" page = credential harvest</strong></li>';
    html += '<li>Use official app instead of QR when in doubt</li>';
    html += '</ul>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  
    if (_phtRevealed) html += phtRenderReveal();
    host.innerHTML = html;
    if (host.scrollIntoView) { try { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {} }
  }
  
  function phtBodyClick(ev) {
    // Capture body clicks NOT on a flag — count as wrong tags (over-tag penalty).
    if (_phtRevealed) return;
    if (!ev.target) return;
    const t = ev.target;
    if (t.classList && t.classList.contains('flag')) return;  // handled by phtToggleFlag
    // Track a wrong-tag if user clicked a non-flag region of body text (a bit tolerant)
    // Only fire if click was on text inside the body (not whitespace / margin)
    const tagName = (t.tagName || '').toLowerCase();
    if (tagName !== 'p' && tagName !== 'span' && tagName !== 'strong' && tagName !== 'em' && tagName !== 'div') return;
    const wrongId = 'wrong-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    _phtWrongTags.push(wrongId);
    phtRenderEmailClient();
  }
  function phtToggleFlag(ev, flagId) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (_phtRevealed) return;
    // Special: sender-email + reply-to are virtual flag IDs not in the flags array;
    // map them to the actual flag id if present (we keep them as separate categories).
    const idx = _phtTaggedFlagIds.indexOf(flagId);
    if (idx >= 0) _phtTaggedFlagIds.splice(idx, 1);
    else _phtTaggedFlagIds.push(flagId);
    phtRenderEmailClient();
  }
  function phtSubmitDecision(action) {
    if (_phtRevealed) return;
    _phtPickedDecision = action;
    _phtRevealed = true;
    // Compute scoring
    const scen = _phtActiveScenario;
    const validFlagIds = scen.flags.map(f => f.id);
    const correctTagged = _phtTaggedFlagIds.filter(fid => validFlagIds.includes(fid)).length;
    const flagPct = scen.flags.length > 0 ? correctTagged / scen.flags.length : 0;
    const decisionCorrect = (action === scen.correctAction);
    phtUpdateScenarioMastery(scen.id, flagPct, decisionCorrect);
    phtRenderEmailClient();
  }
  function phtRenderReveal() {
    const scen = _phtActiveScenario;
    const validFlagIds = scen.flags.map(f => f.id);
    const correctTagged = _phtTaggedFlagIds.filter(fid => validFlagIds.includes(fid)).length;
    const totalFlags = scen.flags.length;
    const flagPct = Math.round((totalFlags > 0 ? correctTagged / totalFlags : 0) * 100);
    const wrongCount = _phtWrongTags.length + _phtTaggedFlagIds.filter(fid => !validFlagIds.includes(fid)).length;
    const decisionCorrect = (_phtPickedDecision === scen.correctAction);
    const decisionMeta = scen.decisionReveal[_phtPickedDecision] || { isCorrect: false, label: _phtPickedDecision, why: '' };
  
    let html = '<div class="pht-reveal-card">';
    html += '<div class="pht-reveal-h">';
    html += `<div class="pht-reveal-h-icon ${decisionCorrect ? 'is-good' : 'is-bad'}">${decisionCorrect ? '✓' : '✗'}</div>`;
    html += '<div>';
    html += `<div class="pht-reveal-h-title">${decisionCorrect ? 'Right call —' : 'Wrong call —'} ${escHtml(decisionMeta.label)}</div>`;
    html += `<div class="pht-reveal-h-sub">Flag-catch ${flagPct}% (${correctTagged}/${totalFlags}) · ${wrongCount} over-tag${wrongCount === 1 ? '' : 's'} · Decision ${decisionCorrect ? 'correct' : 'wrong'}</div>`;
    html += '</div></div>';
  
    // Stats grid
    html += '<div class="pht-reveal-grid">';
    html += `<div class="pht-reveal-stat"><div class="pht-reveal-stat-num ${flagPct >= 80 ? 'is-good' : (flagPct >= 50 ? '' : 'is-bad')}">${flagPct}%</div><div class="pht-reveal-stat-label">Flag-catch</div></div>`;
    html += `<div class="pht-reveal-stat"><div class="pht-reveal-stat-num ${decisionCorrect ? 'is-good' : 'is-bad'}">${decisionCorrect ? '✓' : '✗'}</div><div class="pht-reveal-stat-label">Decision</div></div>`;
    html += `<div class="pht-reveal-stat"><div class="pht-reveal-stat-num ${wrongCount === 0 ? 'is-good' : 'is-bad'}">${wrongCount}</div><div class="pht-reveal-stat-label">Over-tags</div></div>`;
    html += '</div>';
  
    // Decision why
    html += `<div class="pht-reveal-section-h">Decision: ${escHtml(decisionMeta.label)}</div>`;
    html += `<div class="pht-reveal-flag-row ${decisionCorrect ? 'is-good' : ''}"><strong>${decisionCorrect ? '✓ ' : '✗ '}${escHtml(decisionMeta.label)}.</strong> ${escHtml(decisionMeta.why)}</div>`;
  
    // Caught flags
    const caughtFlags = scen.flags.filter(f => _phtTaggedFlagIds.includes(f.id));
    if (caughtFlags.length > 0) {
      html += `<div class="pht-reveal-section-h">✓ Flags you caught (${caughtFlags.length})</div>`;
      caughtFlags.forEach(f => {
        html += `<div class="pht-reveal-flag-row is-good"><strong>${escHtml(f.label)}.</strong> ${escHtml(f.why)}</div>`;
      });
    }
    // Missed flags
    const missedFlags = scen.flags.filter(f => !_phtTaggedFlagIds.includes(f.id));
    if (missedFlags.length > 0) {
      html += `<div class="pht-reveal-section-h">Flags you missed (${missedFlags.length})</div>`;
      missedFlags.forEach(f => {
        html += `<div class="pht-reveal-flag-row"><strong>${escHtml(f.label)}.</strong> ${escHtml(f.why)}</div>`;
      });
    }
    // Anatomy / pattern
    html += '<div class="pht-reveal-section-h">Anatomy of this phish</div>';
    html += `<div class="pht-reveal-flag-row"><strong>Pattern: ${escHtml(scen.patternName)}.</strong> ${scen.patternBlurb}</div>`;
    // CTAs
    html += '<div class="pht-reveal-cta-row">';
    // Find next phish in the list
    const idx = PHT_DATA.findIndex(s => s.id === scen.id);
    const next = idx >= 0 && idx < PHT_DATA.length - 1 ? PHT_DATA[idx + 1] : null;
    if (next && phtIsScenarioUnlocked(next)) {
      html += `<button class="pht-reveal-cta is-primary" onclick="phtStartScenario('${escAttr(next.id)}')">▶ Next phish (${escHtml(next.title)})</button>`;
    }
    html += `<button class="pht-reveal-cta" onclick="phtStartScenario('${escAttr(scen.id)}')">Replay this phish</button>`;
    html += `<button class="pht-reveal-cta" onclick="setPhtTab('practice')">Back to catalog</button>`;
    html += '</div>';
    html += '</div>';
    return html;
  }
  function phtRenderLessons() {
    const host = document.getElementById('pht-lessons-content');
    if (!host) return;
    let html = '<div class="pht-lessons-intro">';
    html += '<strong>Phishing red flag cheatsheets.</strong> Universal red flags + vector-specific tells. Smishing/vishing/quishing-specific cards land in v4.98.1+.';
    html += '</div>';
    html += '<div class="pht-lessons-grid">';
    PHT_LESSONS.forEach(lesson => {
      html += '<div class="pht-lesson-card">';
      html += `<div class="pht-lesson-h">${escHtml(lesson.title)}</div>`;
      html += `<div class="pht-lesson-summary">${escHtml(lesson.summary)}</div>`;
      html += '<div class="pht-lesson-flags">';
      lesson.flags.forEach(f => {
        html += '<div class="pht-lesson-flag-row">';
        html += `<div class="pht-lesson-flag-name">${escHtml(f.name)}</div>`;
        html += `<div class="pht-lesson-flag-detail">${f.detail}</div>`;  // intentional raw HTML — markup in source
        html += '</div>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    host.innerHTML = html;
  }
  function phtRenderDashboard() {
    // v4.98.3: full prescriptive dashboard with per-vector mastery + callouts.
    const host = document.getElementById('pht-dashboard-content');
    if (!host) return;
    const m = phtInitMastery();
    const totalScenarios = PHT_DATA.length;
    const masteredCount = Object.values(m).filter(e => e.pips >= 3).length;
    const completedCount = Object.values(m).filter(e => e.completed > 0).length;
    const totalRuns = Object.values(m).reduce((a, e) => a + (e.runs || 0), 0);
    const vectorAcc = {};
    Object.entries(PHT_VECTORS).forEach(([id, v]) => { vectorAcc[id] = { sum: 0, count: 0, name: v.name, color: v.color, icon: v.icon }; });
    PHT_DATA.forEach(scen => {
      const e = m[scen.id];
      if (e && e.completed > 0) {
        const va = vectorAcc[scen.vector];
        if (va) { va.sum += e.bestFlagPct * 100; va.count += 1; }
      }
    });
    const vectorEntries = Object.entries(vectorAcc)
      .filter(([id, v]) => v.count > 0)
      .map(([id, v]) => ({ id, name: v.name, color: v.color, icon: v.icon, pct: Math.round(v.sum / v.count) }))
      .sort((a, b) => a.pct - b.pct);
    const callouts = [];
    if (vectorEntries.length > 0 && vectorEntries[0].pct < 75) {
      const w = vectorEntries[0];
      callouts.push({
        title: `${escHtml(w.name)} is your weakest vector at ${w.pct}%.`,
        detail: `Drill it directly to lift the score.`,
        cta: `→ Filter catalog by ${escHtml(w.name)}`,
        action: `setPhtTab('practice')`
      });
    }
    const weakPhish = PHT_DATA
      .filter(scen => { const e = m[scen.id]; return e && e.completed > 0 && e.bestFlagPct < 0.60; })
      .map(scen => ({ scen, mastery: m[scen.id] }));
    if (weakPhish.length > 0) {
      const w = weakPhish[0];
      callouts.push({
        title: `<strong>${escHtml(w.scen.title)}</strong> at ${Math.round(w.mastery.bestFlagPct * 100)}% flag-catch.`,
        detail: `Replay to consolidate.`,
        cta: `→ Replay this phish`,
        action: `phtStartScenario('${escAttr(w.scen.id)}')`
      });
    }
    if (completedCount < 5) {
      callouts.push({
        title: `Generate fresh phish via AI to deepen your bank.`,
        detail: `Sonnet authors new phish across all 4 vectors with the 7-layer validator gating output.`,
        cta: `→ Open AI generator`,
        action: `phtOpenAiGenerator()`
      });
    }
    const closeToUnlock = PHT_DATA
      .filter(scen => scen.unlockAfter && scen.unlockAfter.length > 0 && !phtIsScenarioUnlocked(scen))
      .filter(scen => {
        const reqId = scen.unlockAfter[0];
        const reqMastery = m[reqId];
        return reqMastery && reqMastery.pips === 1;
      });
    if (closeToUnlock.length > 0) {
      const w = closeToUnlock[0];
      const reqId = w.unlockAfter[0];
      const reqScen = PHT_DATA.find(s => s.id === reqId);
      callouts.push({
        title: `You're halfway to unlocking <strong>${escHtml(w.title)}</strong>.`,
        detail: `Master "${escHtml(reqScen ? reqScen.title : reqId)}" (1 more pip needed).`,
        cta: `→ Replay prerequisite`,
        action: `phtStartScenario('${escAttr(reqId)}')`
      });
    }
  
    let html = '<div class="pht-dash-shell">';
    html += '<div class="pht-dash-stat-grid">';
    html += `<div class="pht-dash-stat-pill"><div class="pht-dash-stat-pill-num">${masteredCount}/${totalScenarios}</div><div class="pht-dash-stat-pill-label">Mastered</div></div>`;
    html += `<div class="pht-dash-stat-pill"><div class="pht-dash-stat-pill-num">${completedCount}</div><div class="pht-dash-stat-pill-label">Phish completed</div></div>`;
    html += `<div class="pht-dash-stat-pill"><div class="pht-dash-stat-pill-num">${totalRuns}</div><div class="pht-dash-stat-pill-label">Total runs</div></div>`;
    html += '</div>';
    html += '<div class="pht-dash-grid">';
    // LEFT: per-vector + per-phish list
    html += '<div class="pht-dash-card">';
    html += '<div class="pht-dash-card-h">Per-vector mastery</div>';
    if (vectorEntries.length === 0) {
      html += '<div class="pht-dash-row-acc pht-dash-row-acc-muted">Complete a phish to see per-vector breakdown.</div>';
    } else {
      Object.entries(vectorAcc).forEach(([id, v]) => {
        if (v.count === 0) return;
        const pct = Math.round(v.sum / v.count);
        html += '<div class="pht-dash-vec-row">';
        html += `<div class="pht-dash-vec-name">${escHtml(v.name)}</div>`;
        html += `<div class="pht-dash-vec-track"><div class="pht-dash-vec-fill" style="width:${pct}%;"></div></div>`;
        html += `<div class="pht-dash-vec-pct">${pct}%</div>`;
        html += '</div>';
      });
    }
    html += '<div class="pht-dash-card-h" style="margin-top:18px;">Per-phish mastery</div>';
    html += '<div class="pht-dash-list">';
    PHT_DATA.forEach(scen => {
      const e = m[scen.id] || { pips: 0, completed: 0, bestFlagPct: 0 };
      const v = PHT_VECTORS[scen.vector] || { icon: '', color: '#6b6b90' };
      html += '<div class="pht-dash-row">';
      html += '<span class="pht-dash-row-icon"></span>';
      html += `<div class="pht-dash-row-name">${escHtml(scen.title)}</div>`;
      html += '<div class="pht-dash-row-pips">';
      for (let i = 0; i < 3; i++) html += `<div class="pht-dash-pip ${i < e.pips ? 'is-on' : ''}"></div>`;
      html += '</div>';
      if (e.completed > 0) {
        html += `<div class="pht-dash-row-acc">${Math.round(e.bestFlagPct * 100)}% best · ${e.completed} run${e.completed === 1 ? '' : 's'}</div>`;
      } else {
        html += '<div class="pht-dash-row-acc pht-dash-row-acc-muted">Not attempted</div>';
      }
      html += '</div>';
    });
    html += '</div></div>';
    // RIGHT: prescriptive callouts + AI-gen list
    html += '<div class="pht-dash-card">';
    html += '<div class="pht-dash-card-h">Drill what\'s weakest</div>';
    if (callouts.length === 0) {
      html += '<div class="pht-dash-row-acc pht-dash-row-acc-muted">No specific recommendations yet — keep playing to build the picture.</div>';
    } else {
      callouts.forEach(c => {
        html += `<div class="pht-dash-callout"><strong>${c.title}</strong> ${c.detail}<div class="pht-dash-callout-cta" onclick="${c.action}">${c.cta}</div></div>`;
      });
    }
    const aiGenPhish = _phtLoadGeneratedScenarios();
    if (aiGenPhish.length > 0) {
      html += `<div class="pht-dash-card-h" style="margin-top:18px;">AI-generated phish (${aiGenPhish.length})</div>`;
      aiGenPhish.forEach(scen => {
        html += '<div class="pht-dash-callout pht-dash-callout-aigen">';
        html += `<strong>${escHtml(scen.title)}</strong> · saved to your bank`;
        html += `<div class="pht-dash-callout-cta" onclick="phtStartScenario('${escAttr(scen.id)}')">→ Run this phish</div>`;
        html += '</div>';
      });
    }
    html += '</div></div></div>';
    host.innerHTML = html;
  }
  
  // ════════════════════════════════════════════════════════════════════
  // PHT AI SCENARIO GENERATOR (v4.98.3 Batch 4) — Sonnet-authored phish
  // gated by 7-layer validator. Mirrors IRW v4.97.2 pattern.
  // ════════════════════════════════════════════════════════════════════
  let _phtAiGenState = {
    isOpen: false, isGenerating: false,
    vector: 'email', difficulty: 2, category: null,
    lastScenario: null, lastValidatorResults: null, lastError: null
  };
  function phtOpenAiGenerator() {
    _phtAiGenState.isOpen = true;
    _phtAiGenState.lastScenario = null;
    _phtAiGenState.lastValidatorResults = null;
    _phtAiGenState.lastError = null;
    _phtRenderAiGenModal();
  }
  function phtCloseAiGenerator() {
    _phtAiGenState.isOpen = false;
    const modal = document.getElementById('pht-aigen-modal');
    if (modal) modal.remove();
  }
  function phtSetAiGenVector(v) { _phtAiGenState.vector = v; _phtRenderAiGenModal(); }
  function phtSetAiGenDifficulty(d) { _phtAiGenState.difficulty = parseInt(d, 10); _phtRenderAiGenModal(); }
  function phtSetAiGenCategory(c) { _phtAiGenState.category = c === _phtAiGenState.category ? null : c; _phtRenderAiGenModal(); }
  
  function _phtRenderAiGenModal() {
    let modal = document.getElementById('pht-aigen-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pht-aigen-modal';
      modal.className = 'pht-aigen-modal';
      document.body.appendChild(modal);
    }
    const s = _phtAiGenState;
    const vectorPills = Object.entries(PHT_VECTORS).map(([id, v]) =>
      `<button type="button" class="pht-aigen-pill ${s.vector === id ? 'is-active' : ''}" onclick="phtSetAiGenVector('${escAttr(id)}')">${escHtml(v.name)}</button>`
    ).join('');
    const cats = ['bec', 'credential-harvest', 'callback-scam', 'gift-card-scam', 'tech-support-scam', 'government-impersonation'];
    const catPills = cats.map(c =>
      `<button type="button" class="pht-aigen-pill ${s.category === c ? 'is-active' : ''}" onclick="phtSetAiGenCategory('${c}')">${c.replace(/-/g, ' ')}</button>`
    ).join('');
  
    let html = '<div class="pht-aigen-backdrop" onclick="phtCloseAiGenerator()"></div>';
    html += '<div class="pht-aigen-card" role="dialog" aria-label="AI Phish Generator">';
    html += '<div class="pht-aigen-h">';
    html += '<div class="pht-aigen-h-icon"></div>';
    html += '<div><div class="pht-aigen-h-title">AI Phish Generator</div>';
    html += '<div class="pht-aigen-h-sub">Sonnet 4.6 · Tier C · 7-layer validator-gated</div></div>';
    html += `<button type="button" class="pht-aigen-close" onclick="phtCloseAiGenerator()" aria-label="Close">×</button>`;
    html += '</div>';
    html += '<div class="pht-aigen-body">';
    html += '<div class="pht-aigen-controls">';
    html += '<div class="pht-aigen-row"><div class="pht-aigen-row-label">Vector</div>';
    html += `<div class="pht-aigen-pills">${vectorPills}</div></div>`;
    html += '<div class="pht-aigen-row"><div class="pht-aigen-row-label">Difficulty</div>';
    html += '<div class="pht-aigen-pills">';
    html += `<button type="button" class="pht-aigen-pill ${s.difficulty === 1 ? 'is-active' : ''}" onclick="phtSetAiGenDifficulty(1)">★ Foundational</button>`;
    html += `<button type="button" class="pht-aigen-pill ${s.difficulty === 2 ? 'is-active' : ''}" onclick="phtSetAiGenDifficulty(2)">★★ Exam</button>`;
    html += `<button type="button" class="pht-aigen-pill ${s.difficulty === 3 ? 'is-active' : ''}" onclick="phtSetAiGenDifficulty(3)">★★★ Hard</button>`;
    html += '</div></div>';
    html += '<div class="pht-aigen-row"><div class="pht-aigen-row-label">Category (optional)</div>';
    html += `<div class="pht-aigen-pills">${catPills}</div></div>`;
    html += `<button type="button" class="pht-aigen-btn" onclick="phtGenerateScenario()" ${s.isGenerating ? 'disabled' : ''}>${s.isGenerating ? 'Generating + validating...' : 'Generate phish'}</button>`;
    html += '</div>';
  
    html += '<div class="pht-aigen-validator-shell">';
    if (!s.lastScenario && !s.isGenerating && !s.lastError) {
      html += '<div class="pht-aigen-validator-empty">Pick options on the left + click Generate. The 7-layer validator output will appear here.</div>';
    }
    if (s.lastError) html += `<div class="pht-aigen-validator-fail">${escHtml(s.lastError)}</div>`;
    if (s.lastValidatorResults) {
      const passed = s.lastValidatorResults.filter(r => r.status === 'pass').length;
      html += `<div class="pht-aigen-validator-h">7-layer validator · <span class="pht-aigen-validator-count">${passed}/7 ✓</span></div>`;
      s.lastValidatorResults.forEach((r, idx) => {
        const iconCls = r.status === 'pass' ? '' : (r.status === 'warn' ? 'is-warn' : 'is-fail');
        const icon = r.status === 'pass' ? '✓' : (r.status === 'warn' ? '!' : '✗');
        html += `<div class="pht-aigen-check-row"><div class="pht-aigen-check-icon ${iconCls}">${icon}</div><div><strong>${idx + 1}. ${escHtml(r.label)}</strong> — ${escHtml(r.detail || '')}</div></div>`;
      });
      if (s.lastScenario && passed === 7) {
        html += '<div class="pht-aigen-output">';
        html += `<div class="pht-aigen-output-h">✓ Validated · ready to load</div>`;
        html += `<div class="pht-aigen-output-title">${escHtml(s.lastScenario.title)}</div>`;
        html += `<div class="pht-aigen-output-summary">${escHtml(s.lastScenario.summary || '')}</div>`;
        html += `<button type="button" class="pht-aigen-load-btn" onclick="_phtLoadGeneratedScenario()">Load + start phish →</button>`;
        html += '</div>';
      }
    }
    html += '</div></div></div>';
    modal.innerHTML = html;
  }
  
  async function phtGenerateScenario() {
    const key = (localStorage.getItem(STORAGE.KEY) || '').trim();
    if (!key) {
      _phtAiGenState.lastError = 'Add your Anthropic API key in Settings to generate phish.';
      _phtRenderAiGenModal();
      return;
    }
    _phtAiGenState.isGenerating = true;
    _phtAiGenState.lastError = null;
    _phtAiGenState.lastValidatorResults = null;
    _phtAiGenState.lastScenario = null;
    _phtRenderAiGenModal();
    const prompt = _phtBuildAiGenPrompt(_phtAiGenState);
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
        _phtAiGenState.lastError = `API error: ${res.status}. Check your API key in Settings.`;
        _phtAiGenState.isGenerating = false;
        _phtRenderAiGenModal();
        return;
      }
      const data = await res.json();
      const text = (data.content && data.content[0] && data.content[0].text) || '';
      let jsonStr = text.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();
      let scenario;
      try { scenario = JSON.parse(jsonStr); }
      catch (parseErr) {
        _phtAiGenState.lastError = 'AI returned invalid JSON. Try regenerating.';
        _phtAiGenState.isGenerating = false;
        _phtRenderAiGenModal();
        return;
      }
      const validatorResults = _phtValidateAiScenario(scenario);
      _phtAiGenState.lastScenario = scenario;
      _phtAiGenState.lastValidatorResults = validatorResults;
      _phtAiGenState.isGenerating = false;
      _phtRenderAiGenModal();
    } catch (e) {
      _phtAiGenState.lastError = `Network error: ${e.message || 'Unknown'}`;
      _phtAiGenState.isGenerating = false;
      _phtRenderAiGenModal();
    }
  }
  
  function _phtBuildAiGenPrompt(opts) {
    const vector = opts.vector;
    const vectorMeta = PHT_VECTORS[vector] || { name: vector };
    const diffLabel = ['', 'Foundational', 'Exam', 'Hard'][opts.difficulty];
    const categoryLine = opts.category ? `Attack category: ${opts.category}.` : '';
    let schemaHint = '';
    if (vector === 'email') {
      schemaHint = '"sender": { "name": "...", "email": "...", "avatar": "AB", "avatarColor": "#3b82f6" }, "subject": "...", "to": "...", "replyTo": "...", "time": "...", "bodyHtml": "<p>...with <span class=\\"flag\\" data-fid=\\"f1\\">flagged text</span>...</p>", "attachments": []';
    } else if (vector === 'sms') {
      schemaHint = '"senderId": "BANK-ALERT or +1 (XXX) XXX-XXXX", "time": "Today · X:XX AM", "bodyHtml": "...with <span class=\\"flag\\" data-fid=\\"f1\\">flagged text</span>..."';
    } else if (vector === 'voice') {
      schemaHint = '"callerId": "+1 (XXX) XXX-XXXX", "time": "Today · X:XX AM", "voicemailLength": "0:38", "transcript": "...with <span class=\\"flag\\" data-fid=\\"f1\\">flagged text</span>..."';
    } else if (vector === 'qr') {
      schemaHint = '"context": "Where the QR is + what scanning leads to.", "decodedUrl": "https://...", "realUrl": "real-org.com (legitimate domain)", "domainAge": "X days"';
    }
    return `You are authoring a phishing scenario for the SY0-701 CompTIA Security+ Phishing Triage Lab. Output ONLY valid JSON, no surrounding markdown.
  
  REQUIREMENTS:
  - Vector: ${vector} (${vectorMeta.name})
  - Difficulty: ${diffLabel}
  ${categoryLine}
  
  SCHEMA:
  {
    "id": "kebab-case-slug",
    "title": "Concise title (≤60 chars)",
    "vector": "${vector}",
    "difficulty": ${opts.difficulty},
    "unlockAfter": [],
    "category": "${opts.category || 'credential-harvest'}",
    "summary": "1-2 sentence tile description (≤180 chars)",
    ${schemaHint},
    "flags": [
      { "id": "f1", "category": "string-tag", "label": "short flag name", "why": "Why this is a red flag, citing SY0-701 / NIST / absolute rule" }
    ],
    "correctAction": "report",
    "decisionReveal": {
      "report": { "isCorrect": true, "label": "Report to security", "why": "..." },
      "delete": { "isCorrect": false, "label": "Delete", "why": "..." },
      "reply": { "isCorrect": false, "label": "Reply", "why": "..." },
      "click": { "isCorrect": false, "label": "Click the link", "why": "..." },
      "spam": { "isCorrect": false, "label": "Mark as spam", "why": "..." }
    },
    "patternName": "Short attack-pattern name",
    "patternBlurb": "SY0-701 Domain 2.2 reference + defense advice"
  }
  
  CONSTRAINTS:
  1. vector exactly: ${vector}
  2. ≥4 flags (typically 5-8)
  3. Each flag has id (f1, f2...), category, label, why
  4. correctAction = "report" always
  5. decisionReveal must include all 5 keys (report/delete/reply/click/spam) with why for each
  6. NO real PII (names, emails, phones, IPs)
  7. NO real-registered domains (use lookalike-suspicious-but-not-real)
  8. Cite SY0-701 / NIST / absolute rule (NEVER share 2FA, IRS-never-SMSes, gift-cards-always-scam) in patternBlurb / why
  9. unlockAfter: leave as []
  
  Output JSON only.`;
  }
  
  function _phtValidateAiScenario(scenario) {
    const results = [];
    const validVectors = ['email', 'sms', 'voice', 'qr'];
    // Layer 1: vector validity
    const vectorValid = scenario && validVectors.includes(scenario.vector);
    results.push({ status: vectorValid ? 'pass' : 'fail', label: 'Vector validity', detail: vectorValid ? `vector = ${scenario.vector}` : 'must be email/sms/voice/qr' });
    // Layer 2: action realism
    let realismOk = true; let realismDetail = '';
    if (!Array.isArray(scenario.flags)) { realismOk = false; realismDetail = 'no flags array'; }
    else {
      if (scenario.flags.length < 4) { realismOk = false; realismDetail = `only ${scenario.flags.length} flags (need ≥4)`; }
      for (const f of scenario.flags || []) {
        if (!f.id || !f.label || !f.why) { realismOk = false; realismDetail = 'flag missing id/label/why'; break; }
      }
    }
    if (realismOk) realismDetail = `${scenario.flags.length} flags, all have id+label+why`;
    results.push({ status: realismOk ? 'pass' : 'fail', label: 'Action realism', detail: realismDetail });
    // Layer 3: no real PII / domains
    let piiOk = true; let piiDetail = 'no real-registered domains detected';
    const realDomains = /\b(google|microsoft|amazon|github|aws|apple|facebook|paypal|netflix|chase|wellsfargo|bankofamerica|citibank|capitalone)\.com\b/i;
    const realIPs = /\b(8\.8\.8\.8|1\.1\.1\.1|8\.8\.4\.4)\b/;
    const text = JSON.stringify(scenario);
    if (realDomains.test(text)) { piiOk = false; piiDetail = 'contains real-registered domain'; }
    else if (realIPs.test(text)) { piiOk = false; piiDetail = 'contains real public IP'; }
    results.push({ status: piiOk ? 'pass' : 'fail', label: 'No real PII / domains', detail: piiDetail });
    // Layer 4: ≥4 flags
    const flagCount = Array.isArray(scenario.flags) ? scenario.flags.length : 0;
    results.push({ status: flagCount >= 4 ? 'pass' : 'fail', label: '≥4 flags per phish', detail: `${flagCount} flag${flagCount === 1 ? '' : 's'}` });
    // Layer 5: SY0-701 / defense citation
    const blurb = (scenario.patternBlurb || '') + ' ' + (scenario.flags || []).map(f => f.why).join(' ');
    const hasCitation = /(SY0-701|NIST|Domain 2|absolute rule|NEVER share|never call|gift card|defense)/i.test(blurb);
    results.push({ status: hasCitation ? 'pass' : 'warn', label: 'SY0-701 / defense citation', detail: hasCitation ? 'patternBlurb cites SY0-701 / defense' : 'no clear citation' });
    // Layer 6: 5 decision actions
    const dr = scenario.decisionReveal || {};
    const required = ['report', 'delete', 'reply', 'click', 'spam'];
    const missing = required.filter(a => !dr[a] || !dr[a].why);
    results.push({ status: missing.length === 0 ? 'pass' : 'fail', label: '5 decision actions present', detail: missing.length === 0 ? 'all 5 actions have why' : `missing: ${missing.join(', ')}` });
    // Layer 7: vector-format match
    let formatOk = true; let formatDetail = 'vector-specific fields present';
    if (scenario.vector === 'email') {
      if (!scenario.sender || !scenario.subject || !scenario.bodyHtml) { formatOk = false; formatDetail = 'email needs sender + subject + bodyHtml'; }
    } else if (scenario.vector === 'sms') {
      if (!scenario.senderId || !scenario.bodyHtml) { formatOk = false; formatDetail = 'sms needs senderId + bodyHtml'; }
    } else if (scenario.vector === 'voice') {
      if (!scenario.callerId || !scenario.transcript) { formatOk = false; formatDetail = 'voice needs callerId + transcript'; }
    } else if (scenario.vector === 'qr') {
      if (!scenario.decodedUrl || !scenario.context) { formatOk = false; formatDetail = 'qr needs decodedUrl + context'; }
    }
    results.push({ status: formatOk ? 'pass' : 'fail', label: 'Vector-format match', detail: formatDetail });
    return results;
  }
  
  function _phtLoadGeneratedScenario() {
    if (!_phtAiGenState.lastScenario) return;
    const passedAll = (_phtAiGenState.lastValidatorResults || []).filter(r => r.status === 'pass').length === 7;
    if (!passedAll) {
      if (typeof showToast === 'function') showToast('Validator did not fully pass — fix or regenerate first.', 'info');
      return;
    }
    const scen = _phtAiGenState.lastScenario;
    if (!PHT_DATA.find(s => s.id === scen.id)) PHT_DATA.push(scen);
    _phtSaveGeneratedScenario(scen);
    phtCloseAiGenerator();
    phtStartScenario(scen.id);
  }
  function _phtLoadGeneratedScenarios() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE.PHT_LESSONS + '_aigen') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (_) { return []; }
  }
  function _phtSaveGeneratedScenario(scenario) {
    try {
      const list = _phtLoadGeneratedScenarios();
      if (!list.find(s => s.id === scenario.id)) {
        list.push(scenario);
        localStorage.setItem(STORAGE.PHT_LESSONS + '_aigen', JSON.stringify(list));
        _cloudFlush(STORAGE.PHT_LESSONS);
      }
    } catch (_) {}
  }
  // Hydration IIFE — push saved AI-gen phish into PHT_DATA on app boot.
  (function _phtHydrateAiGenScenarios() {
    if (!_USE_SECPLUS_PHT) return;
    try {
      const saved = _phtLoadGeneratedScenarios();
      saved.forEach(s => {
        if (s && s.id && !PHT_DATA.find(x => x.id === s.id)) PHT_DATA.push(s);
      });
    } catch (_) {}
  })();
  

  // ── Expose to window so onclick handlers in rendered HTML find them ──
  window.setPhtTab = setPhtTab;
  window.phtStartScenario = phtStartScenario;
  window.phtToggleFlag = phtToggleFlag;
  window.phtBodyClick = phtBodyClick;
  window.phtSubmitDecision = phtSubmitDecision;
  window.phtOpenAiGenerator = phtOpenAiGenerator;
  window.phtCloseAiGenerator = phtCloseAiGenerator;
  window.phtSetAiGenVector = phtSetAiGenVector;
  window.phtSetAiGenDifficulty = phtSetAiGenDifficulty;
  window.phtSetAiGenCategory = phtSetAiGenCategory;

  // ── Register feature module entry point ──
  // Shell calls window._certanvilFeatures["phishing-triage"].enter() after
  // lazy-load. Key == filename (matches NA's network-analysis convention).
  window._certanvilFeatures = window._certanvilFeatures || {};
  window._certanvilFeatures["phishing-triage"] = {
    enter: function() {
      // Same body as the original startPhishingTriageLab at app.js:35058.
      // PHT is Sec+-only; if user is on Network+ (no PHT scenarios in cert
      // pack), short-circuit with a toast instead of rendering an empty bank.
      if (!_USE_SECPLUS_PHT) {
        if (typeof showToast === "function") showToast("Phishing Triage Lab is Security+ only.", "info");
        return;
      }
      showPage("pht");
      setPhtTab("practice");
    },
    leave: function() {
      // Reset module state on page-leave so next entry feels fresh.
      _phtActiveScenarioId = null;
      _phtActiveScenario = null;
      _phtTaggedFlagIds = [];
      _phtWrongTags = [];
      _phtRevealed = false;
      _phtPickedDecision = null;
      // Close any open AI gen modal
      try {
        var modal = document.getElementById("pht-aigen-modal");
        if (modal) modal.remove();
      } catch (_) {}
    },
  };
})();
