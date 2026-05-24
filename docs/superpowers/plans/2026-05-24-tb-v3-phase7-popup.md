# TB v3 Phase 7 v2 — 3D popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a modal lightbox 3D popup of the canvas topology — drag to rotate (both axes), scroll to zoom, live-syncs with canvas edits. No mode change, no trace integration, no OSI cascade. Just a beautiful, interactive 3D view.

**Architecture:** Additive inside `features/topology-builder-v3.js` IIFE — `_3dPopup` module-scope state object owns popup state. `_open3DPopup` creates a DOM modal, attaches input listeners, populates a 3D scene mirror of `state.devices` + `state.cables`. `_apply3DCamera` writes a CSS `transform` on the stage element. Live sync via a single tail-call in the existing `_renderCanvas` (line 1951). Stylized 3D with extruded-card devices, bezier-ribbon cables, gradient floor, ambient lighting simulation via layered drop-shadows.

**Tech Stack:** Vanilla JS (IIFE in `features/topology-builder-v3.js`), scoped CSS (`features/topology-builder-v3.css`), `requestAnimationFrame` (momentum decay), `@media (prefers-reduced-motion)` gate, Node UAT suite (`tests/uat.js`), Playwright E2E (`tests/e2e/app.spec.js`).

**Spec:** `docs/superpowers/specs/2026-05-24-tb-v3-phase7-3d-popup-design.md`

**Branch:** `feat/tb-v3-phase7-popup` (already created at commit `5e0f71b` — spec doc)

**Cumulative test targets at end of phase:** UAT 6753 → ~6768 (+~15). Playwright 161 → ~166 (+5).

**Subagent model defaults:** Sonnet unless explicitly Opus (motion + interaction cluster: Stages 4, 5).

**Skills invoked:** Stage 3-4 use `ui-ux-pro-max` for visual treatment refinement. Stage 5 uses `emil-design-eng` for motion choreography. Stage 8 uses `stop-slop` for locked copy validation.

---

## Stage 0: CSS rev bump r11 → r12 + branch hygiene

**Subagent model:** Sonnet

**Goal:** Bump `TB3_CSS_REV` so existing users get fresh Phase 7 v2 CSS on first popup open. Verify clean main with no v6.4.0 residue.

**Files:**
- Modify: `features/topology-builder-v3.js:99` (single constant)

### Task 0.1: bump TB3_CSS_REV r11 → r12

- [ ] **Step 1:** Verify branch + clean state:

```bash
cd '/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz'
git branch --show-current
git status --short
```

Expected: branch `feat/tb-v3-phase7-popup`. Status shows untracked unrelated files only (MOTION_AUDIT.md etc) — leave untouched.

- [ ] **Step 2:** Verify no v6.4.0 residue in main:

```bash
grep -n "APP_VERSION = " app.js | head -1
grep -n "TB3_CSS_REV = " features/topology-builder-v3.js | head -1
grep -n "_open3D\b\|_close3D\b\|_animateEncap3D\|_animateDecap3D\|_animateIntermediate3D\|_packetRise\|_packetFall\|_clearPacketTransition\|_render3DDeviceCascade\|_renderFloating3DControlStrip\|_update3DAriaStatus" features/topology-builder-v3.js | head -10
```

Expected: `APP_VERSION = '6.3.0'`, `TB3_CSS_REV = 'r11'`, and the last grep returns NOTHING (all v1 functions cleanly reverted).

If any v6.4.0 functions show up, the revert was incomplete — STOP and report.

- [ ] **Step 3:** Bump the constant. Use Edit tool with this exact change:

```javascript
// BEFORE (line 99)
  var TB3_CSS_REV = 'r11'; // r11: Phase 6 OSI mode CSS appended (layer stack, encap/decap motion, failure variants)

// AFTER
  var TB3_CSS_REV = 'r12'; // r12: Phase 7 v2 3D popup CSS appended (modal, extruded-card devices, bezier ribbons, gradient floor)
```

- [ ] **Step 4:** Run UAT to confirm baseline still passes:

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6753/6753 ALL PASS ✓`

- [ ] **Step 5:** Commit:

```bash
git add features/topology-builder-v3.js
git commit -m "$(cat <<'EOF'
chore(tb-v3-phase7-popup): bump TB3_CSS_REV r11 → r12 (Stage 0)

Cache-bust the lazy-loaded CSS so existing v6.3.0 users get the
Phase 7 v2 popup styles on first 3D pill click without a hard reload.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Stage 1: `_3dPopup` state + lifecycle + modebar pill rewire

**Subagent model:** Sonnet

**Goal:** Add module-scope `_3dPopup` state object, define `_open3DPopup` + `_close3DPopup` lifecycle stubs (full implementation arrives in Stages 2-5), flip the 3D modebar pill from locked → unlocked, wire pill click to `_open3DPopup`, remove the stale `{'3d':6}` locked-phase map entry.

**Files:**
- Modify: `features/topology-builder-v3.js` — add `_3dPopup` near other state declarations (~line 95), add `_open3DPopup`/`_close3DPopup` near other `_open*`/`_close*` fns, edit `_renderModeBar` modes array + click handler
- Modify: `tests/uat.js` — append new `_tbv3Phase7v2Fixtures` IIFE with 5 Stage 1 guards

### Task 1.1: add failing UAT fixtures

- [ ] **Step 1:** Open `tests/uat.js`. Find the Phase 6 fixture IIFE — search for `(function _tbv3Phase6Fixtures() {` (around line 22036). Immediately AFTER its closing `})();` add a new Phase 7 v2 fixture IIFE:

```javascript
// ══════════════════════════════════════════
// TB v3 Phase 7 v2 — 3D popup UAT fixtures
// ══════════════════════════════════════════
(function _tbv3Phase7v2Fixtures() {
  const fs = require('fs');
  const path = require('path');
  const tbv3SrcP7v2 = fs.readFileSync(path.join(__dirname, '..', 'features', 'topology-builder-v3.js'), 'utf8');
  const tbv3CssP7v2 = fs.readFileSync(path.join(__dirname, '..', 'features', 'topology-builder-v3.css'), 'utf8');

  // ---- Stage 1: _3dPopup state + lifecycle + pill rewire ----
  test('P7v2: _3dPopup state object defined with all fields',
    /_3dPopup\s*=\s*\{[\s\S]{0,400}open:\s*false[\s\S]{0,400}camera:[\s\S]{0,200}rotX[\s\S]{0,200}rotY[\s\S]{0,200}zoom[\s\S]{0,400}dragState/.test(tbv3SrcP7v2)
  );
  test('P7v2: _open3DPopup is defined',
    /function\s+_open3DPopup\s*\(/.test(tbv3SrcP7v2)
  );
  test('P7v2: _close3DPopup is defined',
    /function\s+_close3DPopup\s*\(/.test(tbv3SrcP7v2)
  );
  test('P7v2: 3D modebar pill unlocked (locked:false)',
    /id:\s*['"]3d['"][\s\S]{0,400}locked:\s*false/.test(tbv3SrcP7v2)
  );
  test('P7v2: modebar wires 3d click to _open3DPopup (NOT _open3D)',
    /mode\s*===\s*['"]3d['"][\s\S]{0,100}_open3DPopup\s*\(/.test(tbv3SrcP7v2) &&
    !/mode\s*===\s*['"]3d['"][\s\S]{0,100}_open3D\s*\(\s*\)/.test(tbv3SrcP7v2.replace(/_open3DPopup/g, 'XX'))
  );

})();
```

- [ ] **Step 2:** Run UAT to verify the 5 new guards FAIL (proves nothing's implemented yet):

```bash
node tests/uat.js 2>&1 | tail -10
```

Expected: 5 FAILures, all `P7v2: ...`. Total `6753 PASS + 5 FAIL`.

### Task 1.2: implement state, lifecycle stubs, pill rewire

- [ ] **Step 1:** Open `features/topology-builder-v3.js`. Find the existing state declarations near the top of the IIFE (around line 95, near `_simState` and `_traceState`). Add `_3dPopup` immediately AFTER the `_traceState = null;` declaration:

```javascript
  // Ephemeral 3D popup state (Phase 7 v2) — NOT persisted, cleared on _close3DPopup
  // Lives separate from state.mode (popup is transient, not a mode value).
  var _3dPopup = {
    open: false,
    camera: { rotX: 52, rotY: -18, zoom: 1 },
    dragState: { active: false, startX: 0, startY: 0, startRotX: 0, startRotY: 0 },
    velocityX: 0,
    velocityY: 0,
    rafHandle: null
  };
```

- [ ] **Step 2:** Find an existing `_close*` function (e.g., `_closeTrace` or `_closeOSI`) via:

```bash
grep -n 'function _closeOSI\|function _closeTrace' features/topology-builder-v3.js
```

Immediately AFTER the chosen `_close*` (use `_closeOSI` since it's the most recent precedent), add the popup lifecycle stubs. Full implementation lands in Stages 2-5 — Stage 1 ships stubs sufficient to satisfy structural UAT guards:

```javascript
  // ===========================================================================
  // Phase 7 v2: _open3DPopup / _close3DPopup — 3D popup lifecycle
  // 3D popup is a transient modal (NOT a mode). Does NOT modify state.mode.
  // Spec: docs/superpowers/specs/2026-05-24-tb-v3-phase7-3d-popup-design.md §4
  // ===========================================================================
  function _open3DPopup() {
    if (_3dPopup.open) return;
    _3dPopup.open = true;
    document.body.style.overflow = 'hidden';   // body scroll lock
    // Stage 2: build modal DOM + initial render + camera apply
    // Stage 5: open animation + input listeners
  }

  function _close3DPopup() {
    if (!_3dPopup.open) return;
    _3dPopup.open = false;
    if (_3dPopup.rafHandle) {
      cancelAnimationFrame(_3dPopup.rafHandle);
      _3dPopup.rafHandle = null;
    }
    var modal = document.getElementById('tb3-3d-popup-modal');
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    document.body.style.overflow = '';
    var pill = document.querySelector('.tb3-mode[data-mode="3d"]');
    if (pill) pill.focus();
    // Stage 5: close animation, Stage 6: detach input listeners
  }
```

- [ ] **Step 3:** Flip the 3D pill in the `_renderModeBar` modes array. Open `features/topology-builder-v3.js` line ~4835. The current line is:

```javascript
      { id: '3d',       label: '3D',       icon: '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',                                                                                                       locked: true },
```

Change `locked: true` → `locked: false`:

```javascript
      { id: '3d',       label: '3D',       icon: '<svg viewBox="0 0 24 24" class="tb3-mode-ic" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',                                                                                                       locked: false },
```

- [ ] **Step 4:** Remove the stale `{'3d':6}` locked-phase map at line ~4839. Current line:

```javascript
      return '<div class="tb3-mode' + (on ? ' on' : '') + (m.locked ? ' locked' : '') + '" data-mode="' + m.id + '" title="' + (m.locked ? m.label + ' — phase ' + ({'3d':6}[m.id]) : m.label) + '">' + m.icon + m.label + '</div>';
```

Replace with cleaner "coming soon" fallback for future locked pills:

```javascript
      return '<div class="tb3-mode' + (on ? ' on' : '') + (m.locked ? ' locked' : '') + '" data-mode="' + m.id + '" title="' + (m.locked ? m.label + ' — coming soon' : m.label) + '">' + m.icon + m.label + '</div>';
```

- [ ] **Step 5:** Add the `mode === '3d'` branch in the click handler at line ~4847. Current handler:

```javascript
        if (mode === 'simulate') {
          _openSimulate();
          return;
        }
        if (mode === 'trace') {
          _openTrace();
          return;
        }
        if (mode === 'osi') {
          _openOSI();
          return;
        }
        if (mode === state.mode) return;
        state.mode = mode;
        _renderModeBar();
```

Add a 3D branch AFTER the osi branch:

```javascript
        if (mode === 'simulate') {
          _openSimulate();
          return;
        }
        if (mode === 'trace') {
          _openTrace();
          return;
        }
        if (mode === 'osi') {
          _openOSI();
          return;
        }
        if (mode === '3d') {
          // Phase 7 v2: 3D is a popup, NOT a mode — do NOT modify state.mode
          _open3DPopup();
          return;
        }
        if (mode === state.mode) return;
        state.mode = mode;
        _renderModeBar();
```

- [ ] **Step 6:** Run UAT:

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6758/6758 ALL PASS ✓` (6753 baseline + 5 Stage 1).

- [ ] **Step 7:** Commit:

```bash
git add features/topology-builder-v3.js tests/uat.js
git commit -m "$(cat <<'EOF'
feat(tb-v3-phase7-popup): _3dPopup state + lifecycle stubs + pill rewire (Stage 1)

- _3dPopup module-scope state object (open, camera, dragState, velocity, rafHandle)
- _open3DPopup + _close3DPopup lifecycle stubs (full impl in Stages 2-5)
- 3D modebar pill unlocked (locked: true → false)
- Stale {'3d':6} title map replaced with 'coming soon' fallback
- Modebar click on 3D pill calls _open3DPopup (does NOT change state.mode)
- Body scroll lock + focus return to pill on close

+5 Stage 1 UAT guards (6753 → 6758).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Stage 2: Modal DOM + scoped CSS chrome

**Subagent model:** Sonnet

**Goal:** Build the modal DOM (backdrop + card + header with X button + viewport + stage + floor). Add scoped CSS for the modal chrome (positioning, sizing, backdrop blur, header layout, X button styling). At end of Stage 2, clicking the 3D pill opens an empty modal with proper chrome — devices/cables come in Stages 3-4.

**Files:**
- Modify: `features/topology-builder-v3.js` — flesh out `_open3DPopup` to build modal DOM, add `_build3DPopupHtml` helper
- Modify: `features/topology-builder-v3.css` — append Phase 7 v2 §1 (modal chrome)
- Modify: `tests/uat.js` — append 4 Stage 2 guards

### Task 2.1: append scoped CSS for modal chrome

- [ ] **Step 1:** Append to the END of `features/topology-builder-v3.css`. Tail-read 10 lines first to find a unique anchor:

```bash
tail -10 '/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz/features/topology-builder-v3.css'
```

Then Edit to insert AFTER the last line, this Phase 7 v2 §1 block:

```css

/* ═══════════════════════════════════════════════════════════════════════════
   PHASE 7 v2 — 3D POPUP
   A modal lightbox showing the canvas topology in stylized 3D. NOT a mode.
   §1 modal chrome; §2 viewport + stage + floor; §3 device extruded cards;
   §4 cable bezier ribbons; §5 ambient lighting; §6 entry/exit animations;
   §7 reduced-motion fallback.
   Spec: docs/superpowers/specs/2026-05-24-tb-v3-phase7-3d-popup-design.md
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Phase 7 v2 §1: Modal chrome ── */
.tb3-3d-popup-modal {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms cubic-bezier(.4, 0, 1, 1);
}

.tb3-3d-popup-modal.is-open {
  opacity: 1;
  pointer-events: auto;
}

.tb3-3d-popup-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.tb3-3d-popup-card {
  position: relative;
  width: 88vw;
  height: 84vh;
  max-width: 1200px;
  max-height: 800px;
  background: var(--tb3-cream, #f5ede0);
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, .32), 0 4px 16px rgba(0, 0, 0, .12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: scale(.85);
  transition: transform 320ms cubic-bezier(.16, 1, .3, 1);
}

.tb3-3d-popup-modal.is-open .tb3-3d-popup-card {
  transform: scale(1);
}

.tb3-3d-popup-header {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid color-mix(in oklab, var(--tb3-cream, #f5ede0) 70%, black 30%);
  gap: 12px;
}

.tb3-3d-popup-title {
  font-family: var(--tb3-font-serif, Georgia, serif);
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--tb3-text, #1a1a1a);
  letter-spacing: .01em;
}

.tb3-3d-popup-counts {
  font-size: 12px;
  color: var(--tb3-muted, #666);
  font-family: var(--tb3-font, system-ui);
}

.tb3-3d-popup-close-btn {
  margin-left: auto;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: var(--tb3-text, #1a1a1a);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms;
}

.tb3-3d-popup-close-btn:hover,
.tb3-3d-popup-close-btn:focus-visible {
  background: color-mix(in oklab, var(--tb3-cream, #f5ede0) 70%, black 30%);
  outline: none;
}

.tb3-3d-popup-viewport {
  flex: 1 1 auto;
  position: relative;
  perspective: 1400px;
  perspective-origin: 50% 40%;
  background: radial-gradient(
    ellipse at 50% 40%,
    var(--tb3-cream, #f5ede0) 0%,
    color-mix(in oklab, var(--tb3-cream, #f5ede0) 70%, black 30%) 100%
  );
  cursor: grab;
  outline: none;
  overflow: hidden;
}

.tb3-3d-popup-viewport:active {
  cursor: grabbing;
}

.tb3-3d-popup-viewport:focus-visible {
  box-shadow: inset 0 0 0 2px var(--tb3-accent, #8b5a3c);
}

.tb3-3d-popup-stage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  /* transform set inline by _apply3DCamera */
}
```

- [ ] **Step 2:** Add the modal HTML builder + flesh out `_open3DPopup`. Find `_open3DPopup` (added in Stage 1) and replace its body with the full Stage 2 implementation:

```javascript
  function _open3DPopup() {
    if (_3dPopup.open) return;
    _3dPopup.open = true;

    document.body.style.overflow = 'hidden';

    var devCount = state.devices.length;
    var cabCount = state.cables.length;

    var modal = document.createElement('div');
    modal.className = 'tb3-3d-popup-modal';
    modal.id = 'tb3-3d-popup-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'tb3-3d-popup-title');
    modal.innerHTML =
      '<div class="tb3-3d-popup-backdrop" id="tb3-3d-popup-backdrop"></div>' +
      '<div class="tb3-3d-popup-card">' +
        '<header class="tb3-3d-popup-header">' +
          '<h2 id="tb3-3d-popup-title" class="tb3-3d-popup-title">3D view of topology</h2>' +
          '<span class="tb3-3d-popup-counts">' + devCount + ' devices &middot; ' + cabCount + ' cables</span>' +
          '<button class="tb3-3d-popup-close-btn" id="tb3-3d-popup-close-btn" aria-label="Close 3D view" type="button">&times;</button>' +
        '</header>' +
        '<div class="tb3-3d-popup-viewport" id="tb3-3d-popup-viewport" role="img" ' +
             'aria-label="3D rendering of ' + devCount + ' devices and ' + cabCount + ' cables. Use arrow keys to rotate, plus or minus to zoom, R to reset, Escape to close." ' +
             'tabindex="0">' +
          '<div class="tb3-3d-popup-stage" id="tb3-3d-popup-stage">' +
            '<div class="tb3-3d-floor"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    _apply3DCamera();   // apply initial camera (Stage 5 defines this)

    // Wire X button + backdrop close (full input listeners come in Stage 5)
    document.getElementById('tb3-3d-popup-close-btn').addEventListener('click', _close3DPopup);
    document.getElementById('tb3-3d-popup-backdrop').addEventListener('click', _close3DPopup);

    // Open tween — add .is-open after a paint to trigger CSS transitions
    requestAnimationFrame(function () {
      modal.classList.add('is-open');
      var btn = document.getElementById('tb3-3d-popup-close-btn');
      if (btn) btn.focus();
    });
  }
```

- [ ] **Step 3:** Add a stub `_apply3DCamera` BEFORE `_open3DPopup`. The full implementation lands in Stage 5; this stub satisfies the Stage 2 open path:

```javascript
  function _apply3DCamera() {
    var stage = document.getElementById('tb3-3d-popup-stage');
    if (!stage) return;
    stage.style.transform =
      'rotateX(' + _3dPopup.camera.rotX + 'deg) ' +
      'rotateY(' + _3dPopup.camera.rotY + 'deg) ' +
      'scale(' + _3dPopup.camera.zoom + ')';
  }
```

- [ ] **Step 4:** Add 4 Stage 2 UAT guards inside `_tbv3Phase7v2Fixtures` IIFE (before `})();`):

```javascript
  // ---- Stage 2: modal DOM + chrome CSS ----
  test('P7v2: _open3DPopup creates modal with role=dialog + aria-modal',
    /_open3DPopup[\s\S]{0,1500}role['"]?\s*,\s*['"]dialog['"][\s\S]{0,200}aria-modal['"]?\s*,\s*['"]true['"]/.test(tbv3SrcP7v2)
  );
  test('P7v2: modal chrome CSS defines tb3-3d-popup-modal positioning',
    /\.tb3-3d-popup-modal\s*\{[\s\S]{0,500}position:\s*fixed[\s\S]{0,200}z-index:\s*70/.test(tbv3CssP7v2)
  );
  test('P7v2: modal card has the spec-cream background + bronze shadow',
    /\.tb3-3d-popup-card[\s\S]{0,800}background:\s*var\(--tb3-cream/.test(tbv3CssP7v2)
  );
  test('P7v2: _apply3DCamera writes transform to stage',
    /function\s+_apply3DCamera[\s\S]{0,400}getElementById\(['"]tb3-3d-popup-stage['"]\)[\s\S]{0,400}transform[\s\S]{0,200}rotateX/.test(tbv3SrcP7v2)
  );
```

- [ ] **Step 5:** Run UAT:

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6762/6762 ALL PASS ✓` (Stage 1 cumulative 6758 + 4 new).

- [ ] **Step 6:** Visual smoke — load the app, navigate to Topology Builder v3, click the 3D pill:
- Expected: modal opens centered with cream card, backdrop dims behind, X button visible top-right, viewport is empty (just the dark-vignetted background)
- Click X, Esc shortcut, OR click backdrop → modal closes
- Body scroll behind modal is locked while open

- [ ] **Step 7:** Commit:

```bash
git add features/topology-builder-v3.js features/topology-builder-v3.css tests/uat.js
git commit -m "$(cat <<'EOF'
feat(tb-v3-phase7-popup): modal DOM + scoped CSS chrome (Stage 2)

- _open3DPopup fully builds modal DOM: backdrop, card, header
  (title + counts + X button), viewport (perspective host), stage,
  floor placeholder
- Phase 7 v2 §1 CSS: modal positioning, z-index, scale-from-.85 open
  tween (320ms cubic-bezier(.16,1,.3,1) — emil overshoot-and-settle),
  220ms backdrop fade, X button hover, viewport perspective + radial
  vignette
- _apply3DCamera stub writes rotateX/Y/scale to stage (full impl Stage 5)
- X button + backdrop click wired to _close3DPopup

+4 Stage 2 UAT guards (6758 → 6762).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Stage 3: Device extruded cards (Stripe-style material)

**Subagent model:** Sonnet (invokes **ui-ux-pro-max** for material refinement)

**Goal:** `_render3DScene` reads `state.devices` and emits `.tb3-3d-dev` extruded-card DOM per device, with top face holding the existing device icon + label, and 4 side faces + 1 bottom face to give depth. Per-face gradients simulate lighting from upper-left. Per-device drop-shadow grounds to the floor.

**Files:**
- Modify: `features/topology-builder-v3.js` — add `_render3DScene` + `_build3DDeviceEl` + wire into `_open3DPopup`
- Modify: `features/topology-builder-v3.css` — append Phase 7 v2 §3 (extruded card CSS)
- Modify: `tests/uat.js` — append 4 Stage 3 guards

### Task 3.1: invoke ui-ux-pro-max for visual treatment refinement

- [ ] **Step 1:** Before writing the extruded-card CSS, invoke `ui-ux-pro-max` to validate the Stripe/Vercel direction against the forged-bronze palette. Goal: lock the exact gradient angles, shadow offsets, and color-mix percentages so the material reads as "lit 3D card", not "flat box with shadow".

In the subagent, use the Skill tool:
```
Skill: ui-ux-pro-max
args: review and refine the Stripe/Vercel stylized-3D treatment for a forged-bronze editorial palette device card. 5-face extruded card (top + 4 sides + bottom), light from upper-left at 135deg, light source warm not cool. Card sits on cream floor with vignette. Bronze top face, slightly darker side rims (12-15% darker), darkest bottom face (25% darker). Drop-shadow offset 8px 14px blur 16px rgba(0,0,0,.18). Validate these values against best-in-class stylized 3D illustration references (Stripe pricing pages, Vercel hero illustrations). Suggest specific tweaks to gradient stops, shadow tuning, or layer composition to push from "OK 3D" to "great to watch + visually appealing". No code — just specific value recommendations.
```

Capture the recommendations and apply them to the CSS values in the next steps.

### Task 3.2: add `_render3DScene` + `_build3DDeviceEl`

- [ ] **Step 1:** Add `_render3DScene` immediately AFTER `_apply3DCamera` (Stage 2). This function will eventually also handle cables (Stage 4) and live sync re-renders (Stage 6); Stage 3 ships the device-only variant:

```javascript
  // ===========================================================================
  // Phase 7 v2 Stage 3: _render3DScene
  // Reads state.devices + state.cables and emits 3D DOM into the stage.
  // Stage 3 ships devices only; Stage 4 adds cables; Stage 6 wires live sync.
  // ===========================================================================
  function _render3DScene() {
    if (!_3dPopup.open) return;
    var stage = document.getElementById('tb3-3d-popup-stage');
    if (!stage) return;

    // Remove old devices + cables, preserve .tb3-3d-floor
    var existing = stage.querySelectorAll('.tb3-3d-dev, .tb3-3d-cable');
    for (var i = 0; i < existing.length; i++) existing[i].remove();

    // Append devices
    for (var d = 0; d < state.devices.length; d++) {
      stage.appendChild(_build3DDeviceEl(state.devices[d]));
    }

    // Cables will be appended here in Stage 4

    // Update header counts + aria-label
    var counts = document.querySelector('.tb3-3d-popup-counts');
    if (counts) counts.innerHTML = state.devices.length + ' devices &middot; ' + state.cables.length + ' cables';
    var vp = document.getElementById('tb3-3d-popup-viewport');
    if (vp) {
      vp.setAttribute('aria-label',
        '3D rendering of ' + state.devices.length + ' devices and ' + state.cables.length +
        ' cables. Use arrow keys to rotate, plus or minus to zoom, R to reset, Escape to close.');
    }
  }

  function _build3DDeviceEl(dev) {
    // Center the 3D scene around the canvas centroid by translating each device
    // by its (x, y) minus the canvas centroid. Phase 7 v2 keeps it simple — use
    // raw dev.x, dev.y; if scenes drift off-center for large topologies, a
    // future enhancement can compute centroid offset.
    var iconHtml = _deviceIcon(dev.type) || '';   // existing helper from Phase 1
    var label = _escAttr(dev.label || dev.type || '');

    var el = document.createElement('div');
    el.className = 'tb3-3d-dev';
    el.setAttribute('data-device-id', dev.id);
    el.style.transform = 'translate3d(' + (dev.x || 0) + 'px, ' + (dev.y || 0) + 'px, 0)';
    el.innerHTML =
      '<div class="tb3-3d-dev-top">' + iconHtml + '<span class="tb3-3d-dev-label">' + label + '</span></div>' +
      '<div class="tb3-3d-dev-bottom"></div>' +
      '<div class="tb3-3d-dev-side-n"></div>' +
      '<div class="tb3-3d-dev-side-s"></div>' +
      '<div class="tb3-3d-dev-side-e"></div>' +
      '<div class="tb3-3d-dev-side-w"></div>';
    return el;
  }
```

**Helper verification.** Stage 3 references `_deviceIcon(dev.type)` and `_escAttr(...)`. Verify both exist:

```bash
grep -n 'function _deviceIcon\|function _escAttr' features/topology-builder-v3.js | head -5
```

Both should return matches. If `_deviceIcon` is named differently (e.g., `_iconForDevice` or `_getDeviceSvg`), substitute the actual name. If neither exists, fall back to a minimal text label only:

```javascript
var iconHtml = '';   // fallback if no _deviceIcon helper
```

- [ ] **Step 2:** Wire `_render3DScene` into `_open3DPopup`. Find the line `_apply3DCamera();` inside `_open3DPopup` (added in Stage 2). Add a `_render3DScene()` call BEFORE it:

```javascript
    _render3DScene();    // populate devices (Stage 3) + cables (Stage 4)
    _apply3DCamera();    // apply initial camera
```

### Task 3.3: append extruded-card CSS

- [ ] **Step 1:** Append to `features/topology-builder-v3.css` after Phase 7 v2 §1:

```css

/* ── Phase 7 v2 §3: Extruded device cards ── */
.tb3-3d-dev {
  position: absolute;
  width: 88px;
  height: 60px;
  transform-style: preserve-3d;
  filter: drop-shadow(8px 14px 16px rgba(0, 0, 0, .18));
}

.tb3-3d-dev-top {
  position: absolute;
  inset: 0;
  transform: translateZ(14px);
  background: linear-gradient(
    135deg,
    color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 92%, white 8%),
    var(--tb3-bronze, #8b5a3c)
  );
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  color: var(--tb3-cream, #f5ede0);
  font-family: var(--tb3-font, system-ui);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.tb3-3d-dev-top .tb3-mode-ic,
.tb3-3d-dev-top svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.tb3-3d-dev-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tb3-3d-dev-bottom {
  position: absolute;
  inset: 0;
  background: color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 75%, black 25%);
  border-radius: 6px;
}

.tb3-3d-dev-side-n,
.tb3-3d-dev-side-s {
  position: absolute;
  left: 0;
  right: 0;
  height: 14px;
  background: color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 88%, black 12%);
  border-radius: 0 0 2px 2px;
}

.tb3-3d-dev-side-n {
  top: 0;
  transform: rotateX(90deg);
  transform-origin: top;
}

.tb3-3d-dev-side-s {
  bottom: 0;
  transform: rotateX(-90deg);
  transform-origin: bottom;
}

.tb3-3d-dev-side-e,
.tb3-3d-dev-side-w {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 14px;
  background: color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 85%, black 15%);
}

.tb3-3d-dev-side-e {
  right: 0;
  transform: rotateY(-90deg);
  transform-origin: right;
}

.tb3-3d-dev-side-w {
  left: 0;
  transform: rotateY(90deg);
  transform-origin: left;
}
```

### Task 3.4: add UAT guards

- [ ] **Step 1:** Add 4 Stage 3 guards inside `_tbv3Phase7v2Fixtures`:

```javascript
  // ---- Stage 3: device extruded cards ----
  test('P7v2: _render3DScene is defined',
    /function\s+_render3DScene\s*\(/.test(tbv3SrcP7v2)
  );
  test('P7v2: _build3DDeviceEl emits 5-face extruded card structure',
    /function\s+_build3DDeviceEl[\s\S]{0,800}tb3-3d-dev-top[\s\S]{0,200}tb3-3d-dev-bottom[\s\S]{0,200}tb3-3d-dev-side-n[\s\S]{0,200}tb3-3d-dev-side-s[\s\S]{0,200}tb3-3d-dev-side-e[\s\S]{0,200}tb3-3d-dev-side-w/.test(tbv3SrcP7v2)
  );
  test('P7v2: top face uses 135deg gradient (light from upper-left)',
    /\.tb3-3d-dev-top[\s\S]{0,400}linear-gradient\(\s*135deg/.test(tbv3CssP7v2)
  );
  test('P7v2: device drop-shadow offset matches light direction',
    /\.tb3-3d-dev\s*\{[\s\S]{0,200}drop-shadow\(8px\s+14px\s+16px/.test(tbv3CssP7v2)
  );
```

- [ ] **Step 2:** Run UAT:

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6766/6766 ALL PASS ✓` (Stage 2 cumulative 6762 + 4 new).

- [ ] **Step 3:** Visual smoke — add 3-4 devices to canvas in Design mode, click 3D pill:
- Devices appear as extruded bronze cards inside the modal
- Top face shows device icon + label
- Sides show as slightly-darker bronze rims (depth illusion)
- Each device has a soft shadow under it
- Devices are positioned in the same X/Y as on the 2D canvas

- [ ] **Step 4:** Commit:

```bash
git add features/topology-builder-v3.js features/topology-builder-v3.css tests/uat.js
git commit -m "$(cat <<'EOF'
feat(tb-v3-phase7-popup): device extruded cards (Stage 3)

- _render3DScene reads state.devices, builds 5-face extruded cards
- _build3DDeviceEl: top face (icon + label, 135deg light-from-upper-left
  gradient on bronze) + 4 side rims (12-15% darker) + bottom (25% darker)
- 88×60×14 card dimensions; drop-shadow 8px 14px 16px rgba(0,0,0,.18)
- Reuses existing _deviceIcon + _escAttr helpers
- ui-ux-pro-max consulted on gradient stops + shadow tuning

+4 Stage 3 UAT guards (6762 → 6766).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Stage 4: Cables + floor + ambient lighting (Opus)

**Subagent model:** **Opus** (multi-element 3D composition; invokes **ui-ux-pro-max**)

**Goal:** Extend `_render3DScene` to emit `.tb3-3d-cable` bezier-ribbon DOM per cable, anchored to device card bottom-edges. Add `.tb3-3d-floor` rendering as a horizontal plane with radial vignette. Ambient lighting via layered gradients across all surfaces.

**Files:**
- Modify: `features/topology-builder-v3.js` — extend `_render3DScene`, add `_build3DCableEl` + cable path helper
- Modify: `features/topology-builder-v3.css` — append Phase 7 v2 §4 (cables) + §5 (floor + ambient lighting)
- Modify: `tests/uat.js` — append 3 Stage 4 guards

### Task 4.1: invoke ui-ux-pro-max for cable + floor treatment

- [ ] **Step 1:** Before writing CSS, invoke ui-ux-pro-max again for the cable and floor specifics:

```
Skill: ui-ux-pro-max
args: validate cable rendering for stylized 3D scene. Cables are bezier curves connecting two device card endpoints (88x60 cards, bottom-edge midpoint anchors). Cable width: 3-4px ribbon, not 1px line. Stroke uses an SVG gradient with lighter bronze at the spine center, darker at the edges — suggests cable cross-section roundness. Cables sit at translateZ:0 (floor plane). Bezier curve control points: roughly mid-X with offset Y to give a natural sag. Floor: large rotated plane (rotateX:90deg, translateZ:-30 for devices to "hover"), radial gradient cream center → darker edges (vignette), no grid lines. Recommend specific stroke-width, control-point offset for bezier sag, and gradient stops for both cable and floor. No code — just values.
```

### Task 4.2: extend `_render3DScene` with cables + floor

- [ ] **Step 1:** Open `features/topology-builder-v3.js`. Find `_render3DScene` (added Stage 3). After the device-build loop, replace the `// Cables will be appended here in Stage 4` placeholder with cable-build logic:

```javascript
    // Append cables (Stage 4)
    for (var c = 0; c < state.cables.length; c++) {
      var cab = state.cables[c];
      var fromDev = _findDeviceById(cab.fromId);
      var toDev = _findDeviceById(cab.toId);
      if (!fromDev || !toDev) continue;
      stage.appendChild(_build3DCableEl(cab, fromDev, toDev));
    }
```

- [ ] **Step 2:** Add `_findDeviceById` (small helper — verify if it exists in the codebase first):

```bash
grep -n 'function _findDeviceById\|function _getDeviceById\|function _devById' features/topology-builder-v3.js
```

If it doesn't exist, add it next to `_build3DDeviceEl`:

```javascript
  function _findDeviceById(id) {
    for (var i = 0; i < state.devices.length; i++) {
      if (state.devices[i].id === id) return state.devices[i];
    }
    return null;
  }
```

(If the codebase already has a helper with a different name like `_getDevById`, use that and skip this addition.)

- [ ] **Step 3:** Add `_build3DCableEl` after `_build3DDeviceEl`:

```javascript
  function _build3DCableEl(cab, fromDev, toDev) {
    // Cable anchors: bottom-edge midpoint of each device card (44px from left, 60px from top)
    var x1 = (fromDev.x || 0) + 44;
    var y1 = (fromDev.y || 0) + 60;
    var x2 = (toDev.x || 0) + 44;
    var y2 = (toDev.y || 0) + 60;

    // Bezier control points: midpoint X with a slight Y offset for a natural sag
    var midX = (x1 + x2) / 2;
    var sagY = Math.max(20, Math.abs(x2 - x1) * 0.12);
    var cy1 = y1 + sagY;
    var cy2 = y2 + sagY;

    // Bounding box for the SVG container
    var minX = Math.min(x1, x2) - 20;
    var minY = Math.min(y1, y2) - 4;
    var maxX = Math.max(x1, x2) + 20;
    var maxY = Math.max(y1, y2) + sagY + 8;
    var w = maxX - minX;
    var h = maxY - minY;

    var px1 = x1 - minX, py1 = y1 - minY;
    var px2 = x2 - minX, py2 = y2 - minY;
    var pcy1 = cy1 - minY;
    var pcy2 = cy2 - minY;

    // Build SVG path
    var pathD = 'M' + px1 + ',' + py1 +
                ' C' + midX + '-' + minX + ',' + pcy1 + ' ' +
                       midX + '-' + minX + ',' + pcy2 + ' ' +
                       px2 + ',' + py2;
    // (Path string assembled — note 'midX - minX' computed inline below for clarity)

    var cpX = midX - minX;
    var pathStr = 'M' + px1 + ',' + py1 +
                  ' C' + cpX + ',' + pcy1 + ' ' +
                         cpX + ',' + pcy2 + ' ' +
                         px2 + ',' + py2;

    var gradId = 'tb3-cable-grad-' + cab.id;
    var svgNs = 'http://www.w3.org/2000/svg';

    var svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('class', 'tb3-3d-cable');
    svg.setAttribute('data-cable-id', cab.id);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.style.position = 'absolute';
    svg.style.left = minX + 'px';
    svg.style.top = minY + 'px';
    svg.style.transform = 'translateZ(0)';
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';

    var defs = document.createElementNS(svgNs, 'defs');
    var grad = document.createElementNS(svgNs, 'linearGradient');
    grad.setAttribute('id', gradId);
    grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
    var stop1 = document.createElementNS(svgNs, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 70%, black 30%)');
    var stop2 = document.createElementNS(svgNs, 'stop');
    stop2.setAttribute('offset', '50%');
    stop2.setAttribute('stop-color', 'var(--tb3-bronze, #8b5a3c)');
    var stop3 = document.createElementNS(svgNs, 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('stop-color', 'color-mix(in oklab, var(--tb3-bronze, #8b5a3c) 70%, black 30%)');
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    grad.appendChild(stop3);
    defs.appendChild(grad);
    svg.appendChild(defs);

    var path = document.createElementNS(svgNs, 'path');
    path.setAttribute('d', pathStr);
    path.setAttribute('stroke', 'url(#' + gradId + ')');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);

    return svg;
  }
```

### Task 4.3: append cable + floor CSS

- [ ] **Step 1:** Append to `features/topology-builder-v3.css` after Phase 7 v2 §3:

```css

/* ── Phase 7 v2 §4: Cables — 3D-aware bezier ribbons ── */
.tb3-3d-cable {
  /* SVG element styling — width/height/left/top set inline by builder */
  pointer-events: none;
}

.tb3-3d-cable path {
  /* stroke + stroke-width set inline; this rule sets material feel */
  filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, .14));
}

/* ── Phase 7 v2 §5: Floor + ambient lighting ── */
.tb3-3d-floor {
  position: absolute;
  width: 2400px;
  height: 1600px;
  left: 50%;
  top: 50%;
  margin-left: -1200px;
  margin-top: -800px;
  transform: rotateX(90deg) translateZ(-30px);
  transform-origin: center center;
  background: radial-gradient(
    ellipse at 50% 50%,
    var(--tb3-cream, #f5ede0) 0%,
    color-mix(in oklab, var(--tb3-cream, #f5ede0) 65%, black 35%) 100%
  );
  pointer-events: none;
}
```

### Task 4.4: UAT guards

- [ ] **Step 1:** Add 3 Stage 4 guards inside `_tbv3Phase7v2Fixtures`:

```javascript
  // ---- Stage 4: cables + floor ----
  test('P7v2: _build3DCableEl creates SVG with bezier path + gradient',
    /function\s+_build3DCableEl[\s\S]{0,2500}createElementNS[\s\S]{0,200}linearGradient[\s\S]{0,500}createElementNS[\s\S]{0,200}path/.test(tbv3SrcP7v2)
  );
  test('P7v2: cables sit at translateZ(0) (table plane)',
    /_build3DCableEl[\s\S]{0,3000}transform\s*=\s*['"]translateZ\(0\)['"]/.test(tbv3SrcP7v2)
  );
  test('P7v2: floor uses rotateX(90deg) + radial gradient vignette',
    /\.tb3-3d-floor[\s\S]{0,800}rotateX\(90deg\)[\s\S]{0,400}radial-gradient/.test(tbv3CssP7v2)
  );
```

- [ ] **Step 2:** Run UAT:

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6769/6769 ALL PASS ✓` (Stage 3 cumulative 6766 + 3 new).

- [ ] **Step 3:** Visual smoke — add 3-4 devices + 2-3 cables, click 3D pill:
- Devices visible as extruded cards (Stage 3 ✓)
- Cables visible as bronze bezier ribbons connecting device bottom-edges
- Floor visible underneath devices with cream-to-dark radial vignette
- Cables have a subtle drop-shadow

- [ ] **Step 4:** Commit:

```bash
git add features/topology-builder-v3.js features/topology-builder-v3.css tests/uat.js
git commit -m "$(cat <<'EOF'
feat(tb-v3-phase7-popup): cables + floor + ambient lighting (Stage 4 / Opus)

- _build3DCableEl: SVG element with bezier path between device card
  bottom-edges, 3px stroke, 3-stop gradient (darker at edges → lighter
  at spine), 2px 4px 6px drop-shadow
- Bezier sag proportional to horizontal distance (max(20, dx * 0.12))
- _findDeviceById helper for cable endpoint lookup
- Floor: 2400×1600 plane, rotateX(90deg) translateZ(-30px), radial-
  gradient ellipse (cream center → 35% darker edges = vignette)
- ui-ux-pro-max consulted on cable stroke-width + floor gradient stops

+3 Stage 4 UAT guards (6766 → 6769).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Stage 5: Interaction — drag rotate, scroll zoom, momentum, animations (Opus)

**Subagent model:** **Opus** (motion choreography; invokes **emil-design-eng**)

**Goal:** Implement drag-to-rotate (X+Y axes), scroll-wheel zoom, momentum decay on release, double-click reset, plus the open/close tween animations. Wire `mousedown`/`mousemove`/`mouseup`/`wheel`/`dblclick` listeners on the viewport.

**Files:**
- Modify: `features/topology-builder-v3.js` — add `_attach3DInputListeners` + `_detach3DInputListeners`, drag handlers, wheel handler, momentum decay, double-click reset; wire into `_open3DPopup` + `_close3DPopup`
- Modify: `tests/uat.js` — append 4 Stage 5 guards

### Task 5.1: invoke emil-design-eng for motion choreography

- [ ] **Step 1:** Invoke emil-design-eng for motion details:

```
Skill: emil-design-eng
args: validate motion choreography for a 3D popup. Specifics:
1. Open: modal scale .85 → 1.0 + opacity 0 → 1 over 320ms with cubic-bezier(.16, 1, .3, 1). Backdrop opacity 0 → 1 over 220ms.
2. Close: scale 1 → .92 + opacity 1 → 0 over 220ms with cubic-bezier(.4, 0, 1, 1).
3. Drag rotate: synchronous (no rAF) during drag for instant response. Drag sensitivity: 0.4 deg per pixel. rotX clamped [15, 75]. rotY unconstrained.
4. Momentum: on mouseup with velocity > 0.5, exponential decay factor 0.94 (~1.2s tail). Frame-by-frame velocity *= 0.94 until < 0.05.
5. Scroll zoom: synchronous (no momentum). 1px wheel delta = 0.1% zoom change. Clamped [0.5, 2.0].
6. Double-click reset: tween back to initial camera (rotX:52, rotY:-18, zoom:1) over 320ms with cubic-bezier(.16, 1, .3, 1) — matches open ease.
Validate these are "weighted but not floaty, settle don't stop dead". Recommend any tweaks to decay factor, durations, or easing curves. No code.
```

Apply recommendations to the values in the next steps if they suggest changes.

### Task 5.2: add input listeners + handlers

- [ ] **Step 1:** Add `_attach3DInputListeners` + `_detach3DInputListeners` + the handler functions. Place after `_build3DCableEl`:

```javascript
  // ===========================================================================
  // Phase 7 v2 Stage 5: Input handlers — drag rotate, scroll zoom, momentum,
  // double-click reset, keyboard nav (Stage 6 extends with arrows/+/-/R).
  // ===========================================================================
  var _3dPopupListeners = null;   // bag of listener references for clean detach

  function _attach3DInputListeners() {
    var viewport = document.getElementById('tb3-3d-popup-viewport');
    if (!viewport) return;

    _3dPopupListeners = {
      mousedown: _on3DPopupMouseDown,
      mousemove: _on3DPopupMouseMove,
      mouseup: _on3DPopupMouseUp,
      wheel: _on3DPopupWheel,
      dblclick: _on3DPopupDblClick,
      keydown: _on3DPopupKeyDown
    };

    viewport.addEventListener('mousedown', _3dPopupListeners.mousedown);
    document.addEventListener('mousemove', _3dPopupListeners.mousemove);
    document.addEventListener('mouseup', _3dPopupListeners.mouseup);
    viewport.addEventListener('wheel', _3dPopupListeners.wheel, { passive: false });
    viewport.addEventListener('dblclick', _3dPopupListeners.dblclick);
    document.addEventListener('keydown', _3dPopupListeners.keydown);
  }

  function _detach3DInputListeners() {
    if (!_3dPopupListeners) return;
    var viewport = document.getElementById('tb3-3d-popup-viewport');
    if (viewport) {
      viewport.removeEventListener('mousedown', _3dPopupListeners.mousedown);
      viewport.removeEventListener('wheel', _3dPopupListeners.wheel);
      viewport.removeEventListener('dblclick', _3dPopupListeners.dblclick);
    }
    document.removeEventListener('mousemove', _3dPopupListeners.mousemove);
    document.removeEventListener('mouseup', _3dPopupListeners.mouseup);
    document.removeEventListener('keydown', _3dPopupListeners.keydown);
    _3dPopupListeners = null;
  }

  function _on3DPopupMouseDown(e) {
    if (e.button !== 0) return;   // left-click only
    if (_3dPopup.rafHandle) {
      cancelAnimationFrame(_3dPopup.rafHandle);
      _3dPopup.rafHandle = null;
    }
    _3dPopup.dragState.active = true;
    _3dPopup.dragState.startX = e.clientX;
    _3dPopup.dragState.startY = e.clientY;
    _3dPopup.dragState.startRotX = _3dPopup.camera.rotX;
    _3dPopup.dragState.startRotY = _3dPopup.camera.rotY;
    _3dPopup.velocityX = 0;
    _3dPopup.velocityY = 0;
    _3dPopup.dragState._lastX = e.clientX;
    _3dPopup.dragState._lastY = e.clientY;
    e.preventDefault();
  }

  function _on3DPopupMouseMove(e) {
    if (!_3dPopup.dragState.active) return;
    var dx = e.clientX - _3dPopup.dragState.startX;
    var dy = e.clientY - _3dPopup.dragState.startY;

    var newRotY = _3dPopup.dragState.startRotY + dx * 0.4;
    var newRotX = _clamp3D(_3dPopup.dragState.startRotX - dy * 0.4, 15, 75);

    // Velocity via single-frame delta (smooth-enough for release momentum)
    _3dPopup.velocityY = (e.clientX - _3dPopup.dragState._lastX) * 0.4;
    _3dPopup.velocityX = -(e.clientY - _3dPopup.dragState._lastY) * 0.4;
    _3dPopup.dragState._lastX = e.clientX;
    _3dPopup.dragState._lastY = e.clientY;

    _3dPopup.camera.rotY = newRotY;
    _3dPopup.camera.rotX = newRotX;
    _apply3DCamera();
  }

  function _on3DPopupMouseUp() {
    if (!_3dPopup.dragState.active) return;
    _3dPopup.dragState.active = false;
    if (Math.abs(_3dPopup.velocityX) > 0.5 || Math.abs(_3dPopup.velocityY) > 0.5) {
      _start3DMomentumDecay();
    }
  }

  function _start3DMomentumDecay() {
    function tick() {
      _3dPopup.camera.rotY += _3dPopup.velocityY;
      _3dPopup.camera.rotX = _clamp3D(_3dPopup.camera.rotX + _3dPopup.velocityX, 15, 75);
      _3dPopup.velocityX *= 0.94;
      _3dPopup.velocityY *= 0.94;
      _apply3DCamera();
      if (Math.abs(_3dPopup.velocityX) > 0.05 || Math.abs(_3dPopup.velocityY) > 0.05) {
        _3dPopup.rafHandle = requestAnimationFrame(tick);
      } else {
        _3dPopup.rafHandle = null;
      }
    }
    _3dPopup.rafHandle = requestAnimationFrame(tick);
  }

  function _on3DPopupWheel(e) {
    e.preventDefault();
    var newZoom = _3dPopup.camera.zoom * (1 - e.deltaY * 0.001);
    _3dPopup.camera.zoom = _clamp3D(newZoom, 0.5, 2.0);
    _apply3DCamera();
  }

  function _on3DPopupDblClick() {
    // Tween camera back to initial state
    var startRotX = _3dPopup.camera.rotX;
    var startRotY = _3dPopup.camera.rotY;
    var startZoom = _3dPopup.camera.zoom;
    var targetRotX = 52, targetRotY = -18, targetZoom = 1;
    var startTs = null;
    var durationMs = 320;
    if (_3dPopup.rafHandle) {
      cancelAnimationFrame(_3dPopup.rafHandle);
      _3dPopup.rafHandle = null;
    }
    function ease(t) {
      // cubic-bezier(.16, 1, .3, 1) approximation via simple ease-out cubic
      return 1 - Math.pow(1 - t, 3);
    }
    function tick(ts) {
      if (startTs === null) startTs = ts;
      var t = Math.min(1, (ts - startTs) / durationMs);
      var k = ease(t);
      _3dPopup.camera.rotX = startRotX + (targetRotX - startRotX) * k;
      _3dPopup.camera.rotY = startRotY + (targetRotY - startRotY) * k;
      _3dPopup.camera.zoom = startZoom + (targetZoom - startZoom) * k;
      _apply3DCamera();
      if (t < 1) {
        _3dPopup.rafHandle = requestAnimationFrame(tick);
      } else {
        _3dPopup.rafHandle = null;
      }
    }
    _3dPopup.rafHandle = requestAnimationFrame(tick);
  }

  function _on3DPopupKeyDown(e) {
    if (!_3dPopup.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      _close3DPopup();
      return;
    }
    // Stage 6 adds arrow keys / + / - / R for keyboard nav
  }

  // Local helper — clamp a value between min and max
  function _clamp3D(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
```

- [ ] **Step 2:** Wire `_attach3DInputListeners` into `_open3DPopup`. Find the line `_render3DScene();` in `_open3DPopup`. Add `_attach3DInputListeners();` immediately AFTER the `requestAnimationFrame` block that adds `.is-open`:

```javascript
    requestAnimationFrame(function () {
      modal.classList.add('is-open');
      var btn = document.getElementById('tb3-3d-popup-close-btn');
      if (btn) btn.focus();
      _attach3DInputListeners();   // NEW Stage 5
    });
```

- [ ] **Step 3:** Wire `_detach3DInputListeners` into `_close3DPopup`. Find the line `if (modal && modal.parentNode)` in `_close3DPopup`. Add `_detach3DInputListeners();` BEFORE the existing `if (_3dPopup.rafHandle)` block:

```javascript
  function _close3DPopup() {
    if (!_3dPopup.open) return;
    _3dPopup.open = false;
    _detach3DInputListeners();   // NEW Stage 5 — must run BEFORE rAF cancel
    if (_3dPopup.rafHandle) {
      cancelAnimationFrame(_3dPopup.rafHandle);
      _3dPopup.rafHandle = null;
    }
    var modal = document.getElementById('tb3-3d-popup-modal');
    // ... rest unchanged
  }
```

### Task 5.3: UAT guards

- [ ] **Step 1:** Add 4 Stage 5 guards inside `_tbv3Phase7v2Fixtures`:

```javascript
  // ---- Stage 5: drag + zoom + momentum + animations ----
  test('P7v2: _attach3DInputListeners wires mousedown/mousemove/mouseup/wheel/dblclick',
    /function\s+_attach3DInputListeners[\s\S]{0,1500}mousedown[\s\S]{0,500}mousemove[\s\S]{0,500}mouseup[\s\S]{0,500}wheel[\s\S]{0,500}dblclick/.test(tbv3SrcP7v2)
  );
  test('P7v2: drag rotates camera with rotX clamped [15, 75]',
    /_on3DPopupMouseMove[\s\S]{0,800}_clamp3D[\s\S]{0,80}15[\s\S]{0,80}75/.test(tbv3SrcP7v2)
  );
  test('P7v2: momentum decay factor 0.94',
    /_start3DMomentumDecay[\s\S]{0,800}velocityX\s*\*=\s*0\.94/.test(tbv3SrcP7v2)
  );
  test('P7v2: wheel zoom clamped [0.5, 2.0]',
    /_on3DPopupWheel[\s\S]{0,500}_clamp3D[\s\S]{0,80}0\.5[\s\S]{0,80}2(\.0)?/.test(tbv3SrcP7v2)
  );
```

- [ ] **Step 2:** Run UAT:

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6773/6773 ALL PASS ✓` (Stage 4 cumulative 6769 + 4 new).

- [ ] **Step 3:** Visual smoke — open popup with devices, then:
- Drag with mouse → scene rotates X+Y, release with velocity → momentum decays smoothly
- Scroll wheel → zoom in/out, hits limits at 50% / 200%
- Double-click → camera resets to initial angle over a smooth tween
- Esc closes the modal

- [ ] **Step 4:** Commit:

```bash
git add features/topology-builder-v3.js tests/uat.js
git commit -m "$(cat <<'EOF'
feat(tb-v3-phase7-popup): drag + zoom + momentum + animations (Stage 5 / Opus)

- _attach3DInputListeners / _detach3DInputListeners: clean listener
  attachment/detachment via _3dPopupListeners bag
- _on3DPopupMouseDown/Move/Up: drag rotates camera, sensitivity 0.4
  deg/px, rotX clamped [15, 75], rotY unconstrained
- Velocity tracked frame-by-frame; on release with |v| > 0.5,
  _start3DMomentumDecay runs rAF loop with 0.94 decay (~1.2s tail)
- _on3DPopupWheel: 1px delta = 0.1% zoom, clamped [0.5, 2.0]
- _on3DPopupDblClick: 320ms ease-out cubic tween back to
  rotX:52, rotY:-18, zoom:1 (matches open ease)
- _on3DPopupKeyDown: Esc closes (arrows/+/-/R come Stage 6)
- emil-design-eng consulted on decay factor + easing curves

+4 Stage 5 UAT guards (6769 → 6773).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Stage 6: Live sync + keyboard nav

**Subagent model:** Sonnet

**Goal:** Hook into `_renderCanvas` (line 1951) so edits to the 2D canvas re-render the 3D scene while popup is open. Add keyboard nav (arrows, +/-, R) for users without pointers. Camera transform is NOT touched by live re-renders — user keeps their rotated view.

**Files:**
- Modify: `features/topology-builder-v3.js` — add tail call in `_renderCanvas`, extend `_on3DPopupKeyDown` with arrows/+/-/R
- Modify: `tests/uat.js` — append 2 Stage 6 guards

### Task 6.1: live-sync hook in `_renderCanvas`

- [ ] **Step 1:** Open `features/topology-builder-v3.js`. Find `_renderCanvas` at line 1951:

```bash
grep -n 'function _renderCanvas' features/topology-builder-v3.js
```

Read enough of the function to find its closing brace. Inside the function, AT THE END (before the closing `}`), add the live-sync tail call:

```javascript
  function _renderCanvas() {
    // ... existing 2D canvas rendering unchanged ...

    // Phase 7 v2 Stage 6: live sync — if 3D popup is open, refresh its scene.
    // Camera transform on .tb3-3d-popup-stage is NOT touched — user keeps
    // their rotated view across edits.
    if (_3dPopup.open) _render3DScene();
  }
```

### Task 6.2: keyboard nav

- [ ] **Step 1:** Find `_on3DPopupKeyDown` (added Stage 5). Currently only handles `Escape`. Extend with arrow keys, `+`/`-`, and `R`:

```javascript
  function _on3DPopupKeyDown(e) {
    if (!_3dPopup.open) return;
    var step = 5;
    if (e.key === 'Escape') {
      e.preventDefault();
      _close3DPopup();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      _3dPopup.camera.rotY -= step;
      _apply3DCamera();
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      _3dPopup.camera.rotY += step;
      _apply3DCamera();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      _3dPopup.camera.rotX = _clamp3D(_3dPopup.camera.rotX - step, 15, 75);
      _apply3DCamera();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _3dPopup.camera.rotX = _clamp3D(_3dPopup.camera.rotX + step, 15, 75);
      _apply3DCamera();
      return;
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      _3dPopup.camera.zoom = _clamp3D(_3dPopup.camera.zoom * 1.1, 0.5, 2.0);
      _apply3DCamera();
      return;
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      _3dPopup.camera.zoom = _clamp3D(_3dPopup.camera.zoom / 1.1, 0.5, 2.0);
      _apply3DCamera();
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      _on3DPopupDblClick();   // reuse the tween
      return;
    }
  }
```

### Task 6.3: UAT guards

- [ ] **Step 1:** Add 2 Stage 6 guards:

```javascript
  // ---- Stage 6: live sync + keyboard nav ----
  test('P7v2: _renderCanvas calls _render3DScene when popup is open',
    /function\s+_renderCanvas[\s\S]{0,8000}if\s*\(\s*_3dPopup\.open\s*\)\s*_render3DScene\s*\(\s*\)/.test(tbv3SrcP7v2)
  );
  test('P7v2: keyboard nav covers Esc + ArrowLeft/Right/Up/Down + plus/minus + R',
    /_on3DPopupKeyDown[\s\S]{0,2500}ArrowLeft[\s\S]{0,300}ArrowRight[\s\S]{0,300}ArrowUp[\s\S]{0,300}ArrowDown[\s\S]{0,500}['"]\+['"][\s\S]{0,500}['"]-['"][\s\S]{0,500}['"][rR]['"]/.test(tbv3SrcP7v2)
  );
```

- [ ] **Step 2:** Run UAT:

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6775/6775 ALL PASS ✓` (Stage 5 cumulative 6773 + 2 new).

- [ ] **Step 3:** Visual smoke — open popup, then:
- Add a device on the canvas behind (drag a device from palette) → new card appears in the 3D scene immediately
- Remove a cable → cable disappears from 3D scene
- Focus the viewport (Tab into it) → arrow keys rotate, `+`/`-` zoom, `R` resets, `Esc` closes

- [ ] **Step 4:** Commit:

```bash
git add features/topology-builder-v3.js tests/uat.js
git commit -m "$(cat <<'EOF'
feat(tb-v3-phase7-popup): live sync + keyboard nav (Stage 6)

- _renderCanvas tail-call: if (_3dPopup.open) _render3DScene()
  — single explicit hook, no MutationObserver, camera state preserved
  across edits
- _on3DPopupKeyDown extended: ArrowLeft/Right (rotY ±5°),
  ArrowUp/Down (rotX ±5°, clamped), +/=/-/_ (zoom ±10%, clamped),
  r/R (reset via _on3DPopupDblClick tween reuse)

+2 Stage 6 UAT guards (6773 → 6775).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Stage 7: Reduced-motion + full accessibility pass

**Subagent model:** Sonnet

**Goal:** `@media (prefers-reduced-motion: reduce)` zeros entry/exit animations + disables momentum + removes zoom smoothing. Focus trap inside the modal. Empty state when `state.devices.length === 0`.

**Files:**
- Modify: `features/topology-builder-v3.css` — append Phase 7 v2 §7 (reduced-motion + empty-state styling)
- Modify: `features/topology-builder-v3.js` — gate momentum on reduced-motion, focus trap on Tab, empty-state rendering
- Modify: `tests/uat.js` — append 3 Stage 7 guards

### Task 7.1: reduced-motion CSS + empty-state CSS

- [ ] **Step 1:** Append to `features/topology-builder-v3.css` after Phase 7 v2 §5:

```css

/* ── Phase 7 v2 §6: Empty-state ── */
.tb3-3d-popup-empty {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--tb3-font, system-ui);
  font-size: 14px;
  color: var(--tb3-muted, #666);
  text-align: center;
  pointer-events: none;
}

/* ── Phase 7 v2 §7: Reduced-motion fallback ── */
@media (prefers-reduced-motion: reduce) {
  .tb3-3d-popup-modal,
  .tb3-3d-popup-card {
    transition: none !important;
  }
  .tb3-3d-popup-modal:not(.is-open) {
    /* No fade — instant hide */
    opacity: 0;
  }
  .tb3-3d-popup-modal.is-open {
    opacity: 1;
  }
  .tb3-3d-popup-modal.is-open .tb3-3d-popup-card {
    transform: scale(1);
    transition: none !important;
  }
}
```

### Task 7.2: JS reduced-motion + focus trap + empty-state

- [ ] **Step 1:** Add a `_3dPopupReducedMotion()` helper. Find `_reducedMotion` in the codebase (verified earlier — it's the actual helper name):

```javascript
  function _3dPopupReducedMotion() {
    return (typeof _reducedMotion === 'function') ? _reducedMotion() : false;
  }
```

(Place near other Phase 7 v2 helpers. Falls back to false if `_reducedMotion` isn't defined for some reason.)

- [ ] **Step 2:** Gate `_start3DMomentumDecay` on reduced-motion. Find `_on3DPopupMouseUp`:

```javascript
  function _on3DPopupMouseUp() {
    if (!_3dPopup.dragState.active) return;
    _3dPopup.dragState.active = false;
    if (_3dPopupReducedMotion()) return;   // NEW Stage 7 — no momentum
    if (Math.abs(_3dPopup.velocityX) > 0.5 || Math.abs(_3dPopup.velocityY) > 0.5) {
      _start3DMomentumDecay();
    }
  }
```

- [ ] **Step 3:** Gate the double-click reset tween:

```javascript
  function _on3DPopupDblClick() {
    if (_3dPopupReducedMotion()) {
      // Instant reset
      _3dPopup.camera.rotX = 52;
      _3dPopup.camera.rotY = -18;
      _3dPopup.camera.zoom = 1;
      _apply3DCamera();
      return;
    }
    // ... rest of existing tween logic unchanged
  }
```

- [ ] **Step 4:** Add focus trap. Find `_open3DPopup`. Inside `_attach3DInputListeners` (added Stage 5), add a `focusin` listener to enforce the trap. Update `_attach3DInputListeners`:

```javascript
  function _attach3DInputListeners() {
    var viewport = document.getElementById('tb3-3d-popup-viewport');
    if (!viewport) return;

    _3dPopupListeners = {
      mousedown: _on3DPopupMouseDown,
      mousemove: _on3DPopupMouseMove,
      mouseup: _on3DPopupMouseUp,
      wheel: _on3DPopupWheel,
      dblclick: _on3DPopupDblClick,
      keydown: _on3DPopupKeyDown,
      focusin: _on3DPopupFocusIn   // NEW Stage 7
    };

    viewport.addEventListener('mousedown', _3dPopupListeners.mousedown);
    document.addEventListener('mousemove', _3dPopupListeners.mousemove);
    document.addEventListener('mouseup', _3dPopupListeners.mouseup);
    viewport.addEventListener('wheel', _3dPopupListeners.wheel, { passive: false });
    viewport.addEventListener('dblclick', _3dPopupListeners.dblclick);
    document.addEventListener('keydown', _3dPopupListeners.keydown);
    document.addEventListener('focusin', _3dPopupListeners.focusin);   // NEW
  }
```

Add corresponding detach in `_detach3DInputListeners`:

```javascript
    document.removeEventListener('focusin', _3dPopupListeners.focusin);
```

And the handler:

```javascript
  function _on3DPopupFocusIn(e) {
    if (!_3dPopup.open) return;
    var modal = document.getElementById('tb3-3d-popup-modal');
    if (!modal) return;
    if (!modal.contains(e.target)) {
      // Focus escaped the modal — pull it back to the close button
      var btn = document.getElementById('tb3-3d-popup-close-btn');
      if (btn) btn.focus();
    }
  }
```

- [ ] **Step 5:** Empty-state rendering in `_render3DScene`. After the device + cable build loops, add:

```javascript
    // Empty state — no devices on canvas
    var existingEmpty = stage.querySelector('.tb3-3d-popup-empty');
    if (existingEmpty) existingEmpty.remove();
    if (state.devices.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'tb3-3d-popup-empty';
      empty.textContent = 'Add devices to the canvas to see them in 3D.';
      stage.appendChild(empty);
    }
```

(Place AFTER the cable-build loop, BEFORE the count update block.)

### Task 7.3: UAT guards

- [ ] **Step 1:** Add 3 Stage 7 guards:

```javascript
  // ---- Stage 7: reduced-motion + a11y ----
  test('P7v2: @media prefers-reduced-motion disables popup transitions',
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]{0,800}\.tb3-3d-popup-modal[\s\S]{0,200}transition:\s*none/.test(tbv3CssP7v2)
  );
  test('P7v2: _on3DPopupMouseUp respects reduced-motion (no momentum)',
    /function\s+_on3DPopupMouseUp[\s\S]{0,600}_3dPopupReducedMotion\s*\(\s*\)\s*\)\s*return/.test(tbv3SrcP7v2)
  );
  test('P7v2: focus trap pulls escaped focus back to close button',
    /_on3DPopupFocusIn[\s\S]{0,500}modal\.contains[\s\S]{0,200}tb3-3d-popup-close-btn[\s\S]{0,80}\.focus/.test(tbv3SrcP7v2)
  );
```

- [ ] **Step 2:** Run UAT:

```bash
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6778/6778 ALL PASS ✓` (Stage 6 cumulative 6775 + 3 new).

- [ ] **Step 3:** Visual smoke:
- Open popup with no devices on canvas → see the "Add devices to the canvas to see them in 3D." empty-state message
- Toggle macOS Reduce Motion ON → open popup → no entry animation, modal appears instantly; drag-release stops dead (no momentum); double-click resets instantly
- Tab from X button → viewport. Tab from viewport → wraps to X button (focus stays in modal)

- [ ] **Step 4:** Commit:

```bash
git add features/topology-builder-v3.css features/topology-builder-v3.js tests/uat.js
git commit -m "$(cat <<'EOF'
feat(tb-v3-phase7-popup): reduced-motion + a11y + empty-state (Stage 7)

- @media (prefers-reduced-motion: reduce) Phase 7 v2 §7:
  - modal open/close transitions disabled (transition:none)
  - opens instantly at final state
- JS reduced-motion gates:
  - _on3DPopupMouseUp early-returns before momentum (release stops dead)
  - _on3DPopupDblClick: instant snap instead of 320ms tween
- _3dPopupReducedMotion() helper wraps _reducedMotion() safely
- Focus trap via document focusin listener — escaped focus snaps
  back to the close button
- Empty state when state.devices.length === 0: 'Add devices to the
  canvas to see them in 3D.' centered placeholder

+3 Stage 7 UAT guards (6775 → 6778).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Stage 8: Playwright tests + founder dogfood + ship

**Subagent model:** Sonnet (invokes **stop-slop** for locked copy validation)

**Goal:** Add 5 Playwright tests (54-58), founder dogfood HTML (8-step smoke), `stop-slop` copy validation, version bump v6.3.0 → v6.4.0, CLAUDE.md row, branch ready for PR.

**Files:**
- Modify: `tests/e2e/app.spec.js` — append Phase 7 v2 test block
- Create: `dogfood/tb-v3-phase7-popup.html` — 8-step manual smoke
- Modify: `app.js`, `sw.js`, `index.html`, `package.json`, `CLAUDE.md` (via `scripts/bump-version.js`)

### Task 8.1: invoke stop-slop for copy validation

- [ ] **Step 1:** Invoke stop-slop on Phase 7 v2 copy:

```
Skill: stop-slop
args: validate locked copy templates for Phase 7 v2 3D popup. Templates:
- Modal title: "3D view of topology"
- Counts: "{N} devices · {M} cables" (middle-dot separator)
- Empty state: "Add devices to the canvas to see them in 3D."
- X button aria-label: "Close 3D view"
- Viewport aria-label template: "3D rendering of {N} devices and {M} cables. Use arrow keys to rotate, plus or minus to zoom, R to reset, Escape to close."
- 3D pill tooltip (unchanged): "3D view"
Check for AI-tells, weasel words, redundancy, or unclear phrasing. Suggest tightenings if any.
```

Apply any tightening recommendations.

### Task 8.2: Playwright tests 54-58

- [ ] **Step 1:** Open `tests/e2e/app.spec.js`. Find the last existing Phase 7-related test (likely a Phase 6 test from before — verify there are no leftover Phase 7 v1 tests):

```bash
grep -n 'TB v3 Phase 7\|TB v3 Phase 6 — test 53' tests/e2e/app.spec.js | tail -5
```

If any `TB v3 Phase 7 — test 5X` tests exist from the reverted v1, delete them. The revert should have removed them, but verify.

Then append at the end of the suite, after the last Phase 6 test (test 53):

```javascript
  // ────────────────────────────────────────────────────────────
  // Phase 7 v2 — 3D popup (Stage 8: tests 54-58)
  // ────────────────────────────────────────────────────────────

  test('TB v3 Phase 7 v2 — test 54: 3D pill opens modal with role=dialog', async ({ page }) => {
    await page.goto('/');
    await _navigateToTopologyBuilderV3(page);
    await page.click('.tb3-mode[data-mode="3d"]');
    await page.waitForSelector('#tb3-3d-popup-modal');
    const role = await page.locator('#tb3-3d-popup-modal').getAttribute('role');
    const ariaModal = await page.locator('#tb3-3d-popup-modal').getAttribute('aria-modal');
    expect(role).toBe('dialog');
    expect(ariaModal).toBe('true');
    // Focus should be on the X button after open
    const focused = await page.evaluate(() => document.activeElement.id);
    expect(focused).toBe('tb3-3d-popup-close-btn');
  });

  test('TB v3 Phase 7 v2 — test 55: drag on viewport changes stage transform', async ({ page }) => {
    await page.goto('/');
    await _navigateToTopologyBuilderV3(page);
    await _setupBasicTopology(page);
    await page.evaluate(() => window._certanvilFeatures['topology-builder-v3'].enter());
    await page.evaluate(() => {
      var pill = document.querySelector('.tb3-mode[data-mode="3d"]');
      pill.click();
    });
    await page.waitForSelector('#tb3-3d-popup-stage');
    const before = await page.locator('#tb3-3d-popup-stage').getAttribute('style');
    const viewport = await page.locator('#tb3-3d-popup-viewport').boundingBox();
    await page.mouse.move(viewport.x + 100, viewport.y + 100);
    await page.mouse.down();
    await page.mouse.move(viewport.x + 300, viewport.y + 200, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(50);
    const after = await page.locator('#tb3-3d-popup-stage').getAttribute('style');
    expect(after).not.toBe(before);
  });

  test('TB v3 Phase 7 v2 — test 56: Esc closes modal cleanly', async ({ page }) => {
    await page.goto('/');
    await _navigateToTopologyBuilderV3(page);
    await page.click('.tb3-mode[data-mode="3d"]');
    await page.waitForSelector('#tb3-3d-popup-modal');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);   // wait for close tween + DOM removal
    const stillThere = await page.locator('#tb3-3d-popup-modal').count();
    expect(stillThere).toBe(0);
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('');
  });

  test('TB v3 Phase 7 v2 — test 57: live sync — add device while popup open', async ({ page }) => {
    await page.goto('/');
    await _navigateToTopologyBuilderV3(page);
    await page.click('.tb3-mode[data-mode="3d"]');
    await page.waitForSelector('#tb3-3d-popup-stage');
    const before = await page.locator('.tb3-3d-popup-stage .tb3-3d-dev').count();
    // Add a device via the feature module
    await page.evaluate(() => {
      const tb3 = window._certanvilFeatures['topology-builder-v3'];
      const state = tb3._getState();
      state.devices.push({ id: 'test-dev-1', type: 'router', x: 100, y: 100, label: 'R1' });
      tb3._renderCanvas();   // triggers live sync
    });
    await page.waitForTimeout(100);
    const after = await page.locator('.tb3-3d-popup-stage .tb3-3d-dev').count();
    expect(after).toBe(before + 1);
  });

  test('TB v3 Phase 7 v2 — test 58: reduced-motion skips entry animation', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await _navigateToTopologyBuilderV3(page);
    await page.click('.tb3-mode[data-mode="3d"]');
    await page.waitForSelector('#tb3-3d-popup-modal');
    // In reduced-motion, the modal should be open immediately at scale(1) opacity:1
    const transform = await page.locator('.tb3-3d-popup-card').evaluate(el =>
      getComputedStyle(el).transform
    );
    // 'matrix(1, 0, 0, 1, 0, 0)' or 'none' both indicate identity scale
    expect(transform === 'none' || transform.startsWith('matrix(1,')).toBe(true);
    await context.close();
  });
```

**Helper notes:** `_navigateToTopologyBuilderV3` and `_setupBasicTopology` are existing helpers from Phase 6 tests (they were used in the reverted Phase 7 v1 tests). If they don't exist in current `tests/e2e/app.spec.js`, inline the equivalent navigation:

```javascript
async function _navigateToTopologyBuilderV3(page) {
  await page.evaluate(() => {
    var nav = document.querySelector('a[href="#page-topology"]');
    if (nav) nav.click();
  });
  await page.waitForSelector('#tb3-canvas-svg');
}
```

(Place at the top of the test file alongside other helpers.)

- [ ] **Step 2:** Run Phase 7 v2 tests in isolation:

```bash
npx playwright test --project=chromium tests/e2e/app.spec.js -g "Phase 7 v2" 2>&1 | tail -20
```

Expected: 5 new tests passing.

- [ ] **Step 3:** Run full suite to confirm no regression:

```bash
npx playwright test --project=chromium tests/e2e/app.spec.js 2>&1 | tail -10
```

Expected: ~166 tests passing.

### Task 8.3: founder dogfood HTML

- [ ] **Step 1:** Create `dogfood/tb-v3-phase7-popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Founder dogfood — TB v3 Phase 7 v2 (3D popup)</title>
<style>
  body { font: 14px/1.5 -apple-system, system-ui, sans-serif; max-width: 880px; margin: 32px auto; padding: 0 16px; color: #1a1a1a; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
  .step { border-left: 3px solid #d8b89a; padding: 12px 16px; margin: 12px 0; background: #fafafa; border-radius: 4px; }
  .step h3 { margin: 0 0 6px 0; font-size: 14px; }
  .step p { margin: 4px 0; }
  label { display: block; margin-top: 8px; color: #555; }
  textarea { width: 100%; min-height: 50px; font: inherit; padding: 6px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; }
  code { background: #eee; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
</style>
</head>
<body>

<h1>Founder dogfood — TB v3 Phase 7 v2 (3D popup)</h1>
<div class="meta">
  Branch: <code>feat/tb-v3-phase7-popup</code> · Target version: <code>v6.4.0</code> ·
  Open in: <a href="../index.html#page-topology" target="_blank">Topology Builder v3</a>
</div>

<p>8-step manual smoke test. Click through in order; note any glitch or surprise.</p>

<div class="step">
  <h3>Step 1: 3D pill on empty canvas</h3>
  <p>Clear any topology, then click the <strong>3D modebar pill</strong>.</p>
  <p>Expected: modal opens centered with cream card, dark blurred backdrop, X button top-right. Viewport shows empty floor with the message "Add devices to the canvas to see them in 3D."</p>
  <label>Notes: <textarea></textarea></label>
</div>

<div class="step">
  <h3>Step 2: 3D pill with devices on canvas</h3>
  <p>Close modal. Drag 3-4 devices onto the canvas, connect with cables. Click 3D pill again.</p>
  <p>Expected: each device appears as a bronze extruded card with label + icon on top face. Cables visible as bezier ribbons between device bottom-edges. Floor visible with cream-to-dark radial vignette.</p>
  <label>Notes: <textarea></textarea></label>
</div>

<div class="step">
  <h3>Step 3: Drag rotation</h3>
  <p>Click and drag inside the viewport.</p>
  <p>Expected: scene rotates around both axes (X tilt clamped, Y full spin). Cursor changes to grabbing while dragging.</p>
  <label>Notes: <textarea></textarea></label>
</div>

<div class="step">
  <h3>Step 4: Momentum decay on release</h3>
  <p>Drag quickly then release with motion.</p>
  <p>Expected: scene continues to rotate with exponential decay (~1.2s tail), feels weighted not floaty. Eventually settles smoothly.</p>
  <label>Notes: <textarea></textarea></label>
</div>

<div class="step">
  <h3>Step 5: Scroll zoom</h3>
  <p>Use scroll wheel over the viewport.</p>
  <p>Expected: zooms in/out, clamped at 50% (min) and 200% (max). No momentum on zoom — feels direct.</p>
  <label>Notes: <textarea></textarea></label>
</div>

<div class="step">
  <h3>Step 6: Double-click reset</h3>
  <p>Double-click the viewport.</p>
  <p>Expected: camera tweens back to initial angle (rotX:52°, rotY:-18°, zoom:1) over a smooth 320ms ease.</p>
  <label>Notes: <textarea></textarea></label>
</div>

<div class="step">
  <h3>Step 7: Live sync</h3>
  <p>With the popup still open, edit the canvas behind: drag a new device onto the canvas, delete a cable, move a device.</p>
  <p>Expected: 3D scene updates in real time. Camera rotation is preserved across edits — you don't lose your viewing angle.</p>
  <label>Notes: <textarea></textarea></label>
</div>

<div class="step">
  <h3>Step 8: Esc close + reduced-motion</h3>
  <p>Press <code>Esc</code> → modal closes cleanly. Then enable macOS Reduce Motion (System Settings → Accessibility → Display). Reopen popup.</p>
  <p>Expected: instant open (no scale tween, no fade); drag-release stops dead (no momentum); double-click reset is instant.</p>
  <label>Notes: <textarea></textarea></label>
</div>

</body>
</html>
```

- [ ] **Step 2:** Visually confirm by opening the file:

```bash
open '/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz/dogfood/tb-v3-phase7-popup.html'
```

Walk through all 8 steps; capture any notes inline.

### Task 8.4: pre-push double gate

- [ ] **Step 1:** Run full UAT one more time:

```bash
cd '/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz'
node tests/uat.js 2>&1 | tail -5
```

Expected: `UAT: 6778/6778 ALL PASS ✓`

- [ ] **Step 2:** Run full Playwright (chromium):

```bash
npx playwright test --project=chromium tests/e2e/app.spec.js 2>&1 | tail -15
```

Expected: ~166 tests passing.

If either fails — STOP, fix, re-run. Do NOT proceed to version bump.

### Task 8.5: version bump v6.3.0 → v6.4.0

- [ ] **Step 1:** Run the bump script:

```bash
cd '/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz'
node scripts/bump-version.js 6.4.0 "Topology Builder v3 — Phase 7 v2: 3D popup"
```

Expected: script updates `app.js`, `sw.js`, `index.html`, `package.json`, and prepends a CLAUDE.md history row stub.

- [ ] **Step 2:** Verify the 5 files changed:

```bash
git status --short
git diff --stat
```

### Task 8.6: expand CLAUDE.md row

- [ ] **Step 1:** Open `CLAUDE.md`. The stub row sits above the existing v6.3.0 row (line ~485 in main). Read the v6.3.0 row as a reference for format depth, then replace the stub row's content with this expanded version:

```markdown
| v6.4.0 | **Topology Builder v3 — Phase 7 v2: 3D popup** (after reverting the Phase 7 v1 overbuild — see §14 of the spec). Where v1 tried to be a peer mode with trace + OSI cascade integration (overbuilt, reverted at `c114b7f`), v2 ships the actual ask: a modal lightbox showing the canvas topology in stylized 3D. Click the 3D modebar pill, the popup opens centered with a backdrop-blurred dimmed view of the canvas behind. Inside: a cream-colored card with a header (title + device/cable counts + X button) and a 3D viewport. The viewport shows the topology as extruded bronze cards (5 faces — top with icon+label + 4 side rims + bottom, all gradient-lit from upper-left at 135°, soft drop-shadow grounding each card to the floor) connected by bezier-ribbon cables (3px stroke with a 3-stop gradient suggesting cable cross-section roundness, drawn at floor level). The floor itself is a large rotated plane with a radial cream-to-dark vignette. Drag the viewport to rotate the scene (X+Y axes, X clamped to [15°, 75°] to prevent flipping), scroll wheel to zoom (clamped [0.5x, 2.0x]), double-click to reset camera to initial angle (rotX:52°, rotY:-18°). On release with momentum, the camera continues to rotate with exponential decay (factor 0.94, ~1.2s tail) for a weighted feel. Keyboard nav: arrows rotate, +/- zoom, R resets, Esc closes. **Architecture** (additive to `features/topology-builder-v3.js` IIFE, ~+550 LOC JS + ~+200 LOC CSS; no new modules; no Three.js / WebGL — CSS 3D transforms only; `TB3_CSS_REV` bumped `r11 → r12` at Stage 0): (1) **Modal NOT mode** — `state.mode` is NOT modified by opening the popup. The popup is transient; closing returns user to whatever mode they were in. The 3D modebar pill (locked since Phase 1) unlocks at Stage 1 and acts as a button. (2) **Render-copy, NOT canvas-transform** — `_render3DScene` builds a SEPARATE DOM mirror inside the modal; the existing `#tb3-canvas-svg` is untouched. The 2D canvas keeps its full 2D rendering — no interference. (3) **Module-scope state** — `_3dPopup = { open, camera{rotX, rotY, zoom}, dragState, velocityX, velocityY, rafHandle }`. Single state object; no extensions to `state` or `_traceState`. (4) **Live sync via single tail-call** — `_renderCanvas` (the existing 2D canvas render fn at line 1951) gets ONE new line at its tail: `if (_3dPopup.open) _render3DScene();`. No MutationObserver, no event bus. State edits already call `_renderCanvas`, so the 3D mirror updates automatically. The camera transform on `.tb3-3d-popup-stage` is NOT touched by re-renders — user keeps their rotated view across edits. (5) **Stylized 3D rendering** — devices are 5-face extruded cards (88×60×14 dimensions; top face holds the existing device icon SVG + label, gradient `linear-gradient(135deg, color-mix(in oklab, bronze 92%, white 8%), bronze)`; 4 side rims 12-15% darker than top; bottom face 25% darker than top). Per-device `filter: drop-shadow(8px 14px 16px rgba(0,0,0,.18))` grounds each card to the floor with shadow offset matching the 135° light direction. Cables are SVG bezier curves with 3-stop linear gradient (darker → lighter → darker along Y) suggesting cross-section roundness; bezier sag is `max(20, dx * 0.12)` for natural-looking droop. Floor is a large rotated plane (`rotateX(90deg) translateZ(-30px)`, 2400×1600px) with a radial `cream → 35% darker` ellipse vignette. (6) **Interaction** — drag rotates with 0.4°/px sensitivity on both axes (synchronous mousemove application, no rAF for instant response); velocity tracked frame-by-frame for release momentum; `_start3DMomentumDecay` runs an rAF loop with `vX *= 0.94, vY *= 0.94` until `|v| < 0.05`. Scroll wheel zoom is synchronous (no smoothing) — `camera.zoom *= (1 - deltaY * 0.001)`. Double-click reset tweens over 320ms with `cubic-bezier(.16, 1, .3, 1)` (emil's overshoot-and-settle, matches modal entry ease). (7) **Animations** — entry: modal `opacity 0 → 1 + scale .85 → 1` over 320ms with cubic-bezier(.16, 1, .3, 1); backdrop fades over 220ms. Exit: `opacity 1 → 0 + scale 1 → .92` over 220ms with cubic-bezier(.4, 0, 1, 1). All driven by CSS class toggle (`.is-open`) on the modal root. (8) **Reduced-motion fallback** — `@media (prefers-reduced-motion: reduce)`: zeros entry/exit transitions (instant open/close), disables momentum (drag-release stops dead), instant double-click reset. (9) **Accessibility** — `role="dialog"`, `aria-modal="true"`, `aria-labelledby`. Focus moves to X button on open, traps inside the modal via document-level `focusin` listener, restores to the 3D pill on close. Viewport has `role="img"` and an `aria-label` template that includes device/cable counts + keyboard instructions (`"3D rendering of {N} devices and {M} cables. Use arrow keys to rotate, plus or minus to zoom, R to reset, Escape to close."`). (10) **Three close paths** — Esc, click on `.tb3-3d-popup-backdrop`, click X button — all delegate to `_close3DPopup` which tears down modal DOM, restores `body.overflow`, detaches all listeners, cancels rAF, restores focus to the 3D pill. **Tests**: UAT 6753 → 6778 (+25 P7v2 guards). Playwright 161 → 166 chromium (+5 tests 54-58 covering pill activation, drag rotation, Esc cleanup, live sync, reduced-motion). **Stages**: 9 (0-8), Sonnet default, Opus for motion + interaction (Stages 4 cables/floor/lighting + 5 input/animations). **Skills invoked**: `ui-ux-pro-max` for visual treatment refinement (Stages 3-4), `emil-design-eng` for motion choreography (Stage 5), `stop-slop` for locked copy validation (Stage 8). **Dogfood**: `dogfood/tb-v3-phase7-popup.html` (8-step manual smoke). **Phase 8+ unblocks**: Coach mode can call `_open3DPopup(initialCameraOverride?)` to highlight specific devices from a teaching angle; cursor-anchored zoom is a future enhancement (would add `offsetX/Y` to camera state). |
```

(Trim or rephrase to match existing row depth.)

### Task 8.7: final commit + branch ready

- [ ] **Step 1:** Confirm all files staged:

```bash
git status --short
git diff --cached --stat
```

Expected files: `app.js`, `sw.js`, `index.html`, `package.json`, `CLAUDE.md`.

If the bump script didn't auto-stage CLAUDE.md, add it:

```bash
git add app.js sw.js index.html package.json CLAUDE.md
```

- [ ] **Step 2:** Commit the release:

```bash
git commit -m "$(cat <<'EOF'
chore(release): v6.4.0 — TB v3 Phase 7 v2 3D popup

Topology Builder v3 — Phase 7 v2: 3D popup (modal lightbox with
stylized 3D rendering, drag-rotate, scroll-zoom, live-sync,
emil-tuned momentum).

Replaces the reverted v6.4.0 Phase 7 v1 (overbuilt peer-mode with
trace + OSI integration; reverted at c114b7f).

See CLAUDE.md v6.4.0 row for full architecture.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3:** Final UAT check post-bump:

```bash
node tests/uat.js 2>&1 | tail -3
```

Expected: 6778/6778 still passing (version-string consistency checks should re-validate after bump).

- [ ] **Step 4:** Report branch state to the user — do NOT push.

```bash
git log --oneline -15
git status --short
```

Expected: 9-12 commits on `feat/tb-v3-phase7-popup` since branching from main.

- [ ] **Step 5:** Tell the user:

> Phase 7 v2 complete on `feat/tb-v3-phase7-popup`. UAT 6753 → 6778 (+25 P7v2 guards), Playwright 161 → 166 chromium (+5), all green. Dogfood at `dogfood/tb-v3-phase7-popup.html`. v6.4.0 staged across 5 files. Branch ready for PR — awaiting your authorization to push.

---

## Post-ship

After user authorizes push + PR + merge:

- [ ] Watch CI on the PR
- [ ] Once merged + deployed: run `tests/deploy-verify.js` against prod
- [ ] Add a memory entry recording Phase 7 v2 ship completion (replaces the reverted v1)
- [ ] Consider closing PR #352 (workflow perms — already mergeable but blocked by old Lighthouse assertion threshold; revisit threshold separately)

---

## Plan self-review (inline before declaring done)

**1. Spec coverage:**
- §1 Goal → covered by all 9 stages
- §2 Non-goals → enforced via Stage 1 (no `state.mode` mutation), Stage 2 (separate DOM, not canvas transform), Stage 5 (no trace/OSI integration), no cross-rail mutex anywhere
- §3 Locked decisions → Stages 1-7 (each decision drives a specific stage)
- §4 Architecture → Stages 1, 2 (state + lifecycle), 3, 4 (render), 6 (live sync)
- §5 Visual treatment → Stages 3 (devices), 4 (cables + floor)
- §6 Interaction → Stage 5
- §7 Close + a11y → Stages 5 (close paths) + 7 (focus trap + reduced-motion)
- §8 Stop-slop copy → Stage 8.1
- §9 Stage breakdown → this plan
- §10 Test surface → Stages 1-7 (UAT structural) + 8 (Playwright + dogfood)
- §11 Known limitations → documented; no implementation needed
- §12 Phase 8+ implications → Post-ship handoff
- §13 Skills locked → Stages 3.1 (ui-ux-pro-max), 4.1 (ui-ux-pro-max), 5.1 (emil-design-eng), 8.1 (stop-slop)
- §14 What changes vs v1 → documented in spec; verified clean in Stage 0.1 Step 2

**2. Placeholder scan:** Searched plan for "TBD" / "TODO" / "implement later" / "add appropriate" / "similar to Task" — none present.

**3. Type consistency:**
- `_3dPopup.camera` fields (`rotX`, `rotY`, `zoom`) — same in Stage 1 definition, Stage 5 mutations, Stage 6 keyboard handler ✓
- `_3dPopup.dragState` fields (`active`, `startX`, `startY`, `startRotX`, `startRotY`) — Stage 1 definition + Stage 5 handlers consistent ✓
- `_render3DScene()` signature — no args throughout (reads global state); Stage 6 calls it the same way ✓
- `_build3DDeviceEl(dev)` / `_build3DCableEl(cab, fromDev, toDev)` — signatures consistent ✓
- `_apply3DCamera()` — no args, reads `_3dPopup.camera` ✓
- `_3dPopupReducedMotion()` — wraps `_reducedMotion`, returns boolean ✓
- `_clamp3D(v, lo, hi)` — consistent signature in Stage 5 + Stage 6 ✓
- Class names: `.tb3-3d-popup-modal`, `.tb3-3d-popup-card`, `.tb3-3d-popup-viewport`, `.tb3-3d-popup-stage`, `.tb3-3d-dev`, `.tb3-3d-cable`, `.tb3-3d-floor` — consistent across all CSS + JS references ✓
- IDs: `tb3-3d-popup-modal`, `tb3-3d-popup-backdrop`, `tb3-3d-popup-close-btn`, `tb3-3d-popup-viewport`, `tb3-3d-popup-stage` — consistent ✓

**4. Spec → plan additions:** None needed. Every spec section has a stage.

**5. Reversibility:** Every commit is a clean revert point. No squashing required.

**6. Stage ordering:** Each stage produces working, testable software:
- After Stage 0: nothing new visible; CSS rev bumped
- After Stage 1: 3D pill clickable, opens but does nothing visible (stub lifecycle)
- After Stage 2: clicking pill opens an empty modal with chrome (X button closes)
- After Stage 3: devices appear as extruded cards
- After Stage 4: cables + floor appear
- After Stage 5: drag/scroll/dblclick interactivity
- After Stage 6: live sync + keyboard nav
- After Stage 7: reduced-motion + empty state + focus trap
- After Stage 8: tests + dogfood + ship

Each intermediate state is a coherent, testable thing.
