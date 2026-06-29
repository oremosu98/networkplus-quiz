---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# In-app Diagnostic Conversion + Account Home + Plan-to-Practice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the in-app Baseline Diagnostic a conversion ending, a permanent home on the account page (Free vs Pro), a path from a plan into pre-loaded practice, and a working re-diagnostic mechanism.

**Architecture:** All new UI lives in the cert-app PWA (`index.html` + `app.js` + `dg-system.css`), wired onto already-shipped tier logic (free 15+5/day v7.40, custom-quiz 15-cap v7.46, one-cert lock v7.33, cross-cert snapshots v7.43). Visual markup/CSS is ported from the approved mockup `mockups/diagnostic-conversion/index.html` (mockups ARE the pages). One minimal export is added to `auth-state.js` (gated lane, satisfied by the feature-branch PR).

**Tech Stack:** Vanilla HTML/JS/CSS SPA, forged-bronze `dg-system` tokens, Supabase-backed cloud state, UAT string assertions (`tests/uat.js`).

**Spec:** `docs/superpowers/specs/2026-06-14-in-app-diagnostic-conversion-design.md`
**Mockup (visual source of truth):** `mockups/diagnostic-conversion/index.html`

---

## Conventions for every task

- **Branch:** work happens in this worktree on `feat/diagnostic-conversion` (already off `origin/main`).
- **Local verify:** `cd` to repo root, `python3 -m http.server 3131`, drive `http://localhost:3131/index.html` with the preview tools. NEVER write user localStorage on a prod host.
- **Brand (audit passes apply to every visible surface):** forged-bronze `--accent` only (never legacy purple), Fraunces display + Inter, full tinted hairlines (no left-accent-border callouts), symmetric radius, zero emoji, zero em-dashes, copy says "15 questions a day".
- **tech-debt guardrails:** keep every new top-level function under 80 lines (headroom is 46/50); give every new function a caller or a UAT reference (dead-function gate is 0). If `node tests/tech-debt.js` trips the LOC cap, raise it per the v7.16.0 precedent in the same commit.
- **Commit** after each task with a `feat(diagnostic):` / `chore:` message.

---

## File map

| File | Change |
|---|---|
| `index.html` | conversion block container in `#page-diagnostic-result` (after :920); "Your Pass Plan" container in `#page-settings` `.settings-layout`; quota line + reuse of `#custom-quiz-section` |
| `app.js` | `_renderDiagnosticConversion()`, `renderPassPlanSection()`, `_readReadinessSnapshots()`, `_drillWeakDomainToBuilder()`; repoint weak-domain button; render hooks in `renderDiagnosticResult()` + `renderSettingsPage()` |
| `dg-system.css` | port conversion-block, account-plan, locked-cert, quota-line styles from the mockup |
| `auth-state.js` | expose `window.getAvailableCerts` (1 line, gated) |
| `tests/uat.js` | string/`_fnBody` guards for each new surface |
| `scripts/bump-version.js` (run) | v7.51.1 → v7.52.0 |

---

## Phase 1 — Conversion block (post-diagnostic moment)

### Task 1: Conversion block markup container

**Files:**
- Modify: `index.html` (after the `.pass-plan-final-cta` block, currently `:918-920`)

- [ ] **Step 1: Add an empty render target below the final CTA.** Insert immediately after the closing `</div>` of `.pass-plan-final-cta` (after :920), before the `#page-diagnostic-result` page close (:921):

```html
  <!-- v7.52.0: state-aware conversion block, rendered by _renderDiagnosticConversion() -->
  <div id="dq-conversion" class="dq-conversion" hidden></div>
```

- [ ] **Step 2: Verify it parses.** Run the local server, navigate to the app, confirm no console error and the element exists: `document.getElementById('dq-conversion')` is non-null.

- [ ] **Step 3: Commit.**
```bash
git add index.html && git commit -m "feat(diagnostic): add conversion block container to result page"
```

### Task 2: Conversion block styles

**Files:**
- Modify: `dg-system.css` (append a `/* diagnostic conversion */` block)

- [ ] **Step 1: Port the styles.** From `mockups/diagnostic-conversion/index.html` copy the rules for `.save-panel`, `.save-eyebrow`, `.save-h`, `.save-sub`, `.email-row`/`.email-input`, `.save-micro`, `.save-home`, `.pro` (teaser), `.pro-tag`, `.btn-ghost`, `.escape`, `.affirm`, `.affirm-link`, `.pro-soft`, scoped under `#dq-conversion`. Use the cert-app's existing tokens (`--accent`, `--surface`, `--border`, `--text`, `--text-mid`, `--green`, `--radius`) which are already forged-bronze in `dg-system.css` — do NOT hardcode the mockup's oklch values. Keep buttons reusing the app's `.btn`/`.btn-primary` where possible.

- [ ] **Step 2: Verify in browser.** Temporarily `document.getElementById('dq-conversion').hidden=false` and inject a sample save-panel via preview_eval; screenshot; confirm bronze (not purple), hairline borders, no emoji/em-dash. Revert the temporary change.

- [ ] **Step 3: Commit.**
```bash
git add dg-system.css && git commit -m "feat(diagnostic): conversion block styles (ported from approved mockup)"
```

### Task 3: `_renderDiagnosticConversion()` + render hook

**Files:**
- Modify: `app.js` — new function near `renderDiagnosticResult()` (`:5446`); add a call at its tail (~`:5501`)

- [ ] **Step 1: Write the function.** Add `_renderDiagnosticConversion()` (keep < 80 lines). Three states via the documented detectors:

```js
// v7.52.0: state-aware conversion moment at the bottom of the Pass Plan.
function _renderDiagnosticConversion() {
  const host = document.getElementById('dq-conversion');
  if (!host) return;
  const signedIn = window._certanvilSignedIn === true;
  const isPro = !!_quotaState && (_quotaState.tier === 'pro' ||
    (typeof _quotaState.daily_limit === 'number' && _quotaState.daily_limit < 0));

  if (isPro) {                              // Pro: nothing to sell
    host.hidden = true;
    return;
  }
  host.hidden = false;
  if (signedIn) {                           // signed-in free: saved + soft Pro line
    host.innerHTML =
      '<p class="affirm">' + _checkSvg() + 'Saved to your account</p>' +
      '<a href="#" class="affirm-link" data-act="dq-view-account">View it on your account page</a>' +
      '<p class="pro-soft">Want unlimited questions and every cert? ' +
      '<a href="#" data-act="dq-pro-teaser">Get Pro at launch</a></p>';
  } else {                                  // anonymous: save-free + Pro waitlist + escape
    host.innerHTML = _dqAnonConversionHtml();
  }
  _wireDiagnosticConversion(host);
}
```

- [ ] **Step 2: Add the helpers** `_dqAnonConversionHtml()` (returns the save-panel + pro-teaser + escape markup, ported from the mockup's Frame 1, copy = "Don't lose your Pass Plan" / "Save it free" / "Just your email. No password · no card · 15 questions a day"), `_checkSvg()` (inline green check), and `_wireDiagnosticConversion(host)` which binds:
  - `[data-act="dq-save-free"]` → `_showSignInPrompt(host, 'Save your Pass Plan free')` (existing, `app.js:7444`) — or navigate to `buildSignInUrl()` if the helper is unavailable.
  - `[data-act="dq-pro-teaser"]` and the Pro CTA → a new `_showProWaitlist()` that reuses the `_showProOnlyUI` visual shell **without the `certanvil.com/pricing` link** (App Store rule) — body copy "Pro at launch · unlimited · all certs · $9.99/mo", and a "Notify me at launch" action (no external purchase).
  - `[data-act="dq-escape"]` → `closePassPlanReview()` (existing).
  - `[data-act="dq-view-account"]` → `showPage('settings')`.

- [ ] **Step 3: Call it from the result renderer.** At the tail of `renderDiagnosticResult()` (after the existing `#pass-plan-*` population, ~`:5501`), add:
```js
  _renderDiagnosticConversion();
```

- [ ] **Step 4: Browser verify all three states.** Use preview_eval to set `window._certanvilSignedIn` and a stub `_quotaState` ({tier:'free'} / {tier:'pro'} / null), re-call `renderDiagnosticResult()`, screenshot each. Confirm: anonymous shows save-panel+escape; free shows saved+pro line; pro hides the block. Confirm "Save it free" triggers the sign-in path and the Pro CTA does NOT navigate to `/pricing`.

- [ ] **Step 5: UAT guards.** In `tests/uat.js` add:
```js
test('diagnostic conversion block present', html.includes('id="dq-conversion"'));
test('conversion renders states', _fnBody(js, '_renderDiagnosticConversion').includes('_certanvilSignedIn'));
test('Pro teaser has no pricing link', !_fnBody(js, '_showProWaitlist').includes('certanvil.com/pricing'));
```
Run `node tests/uat.js`; expect pass.

- [ ] **Step 6: Commit.**
```bash
git add app.js tests/uat.js && git commit -m "feat(diagnostic): state-aware conversion moment after the Pass Plan"
```

---

## Phase 2 — Account-page Pass Plan home (Free vs Pro)

### Task 4: Expose the cert registry (gated, 1 line)

**Files:**
- Modify: `auth-state.js` (after the `getAvailableCerts` IIFE/function, ~`:101`)

- [ ] **Step 1: Export it on window.**
```js
// v7.52.0: expose the cert registry so app.js can render the Pass Plan account section.
window.getAvailableCerts = getAvailableCerts;
```

- [ ] **Step 2: Verify.** In the browser console (local), `window.getAvailableCerts('user')` returns the 8-cert array.

- [ ] **Step 3: Commit.**
```bash
git add auth-state.js && git commit -m "feat(account): expose getAvailableCerts for the account Pass Plan section (gated)"
```

### Task 5: Readiness-snapshot reader

**Files:**
- Modify: `app.js` (near `_writeReadinessSnapshot`, `:10787`)

- [ ] **Step 1: Add a reader** (a writer exists, no reader). Keep tiny:
```js
// v7.52.0: read the per-cert readiness snapshot map for the Pro multi-plan list.
function _readReadinessSnapshots() {
  try { return JSON.parse(localStorage.getItem(STORAGE.READINESS_SNAPSHOTS) || '{}') || {}; }
  catch (_) { return {}; }
}
```

- [ ] **Step 2: UAT guard.**
```js
test('readiness snapshot reader', /function _readReadinessSnapshots\(/.test(js));
```

- [ ] **Step 3: Commit.**
```bash
git add app.js tests/uat.js && git commit -m "feat(account): per-cert readiness snapshot reader"
```

### Task 6: "Your Pass Plan" section markup container

**Files:**
- Modify: `index.html` (inside `#page-settings` `.settings-layout`, after `:1518`)

- [ ] **Step 1: Add a settings group at the top of the layout.**
```html
  <!-- v7.52.0: Pass Plan home (Free=one plan + upsell, Pro=plan per cert) -->
  <div class="settings-group" id="settings-passplan-group">
    <div class="settings-group-num">§ 00</div>
    <section class="card settings-section" id="passplan-section"></section>
  </div>
```

- [ ] **Step 2: Verify** the element exists when `showPage('settings')` is open. Commit.
```bash
git add index.html && git commit -m "feat(account): Your Pass Plan section container in settings"
```

### Task 7: `renderPassPlanSection()` + render hook

**Files:**
- Modify: `app.js` — new function; call inside `renderSettingsPage()` (`:19628`)

- [ ] **Step 1: Write the renderer** (split into `_renderPassPlanFree()` and `_renderPassPlanPro()` helpers so each stays < 80 lines):

```js
// v7.52.0: render the account Pass Plan home, tier-aware.
function renderPassPlanSection() {
  const host = document.getElementById('passplan-section');
  if (!host) return;
  const isPro = !!_quotaState && (_quotaState.tier === 'pro' ||
    (typeof _quotaState.daily_limit === 'number' && _quotaState.daily_limit < 0));
  host.innerHTML = isPro ? _renderPassPlanProHtml() : _renderPassPlanFreeHtml();
  _wirePassPlanSection(host);
}
```

- [ ] **Step 2: `_renderPassPlanFreeHtml()`** — one plan card from `loadDiagnostic().passPlan` (pass probability `passProbability`, `accPct`, `completedAt` date, top `weakDomains`), with `View full plan` (→ `viewPassPlan()`) and `Retake` (→ `retakeDiagnostic()`); then the locked-certs upsell: iterate `window.getAvailableCerts('user').filter(c => c.tier === 'pro')` into lock chips + a "Get Pro at launch" action (`_showProWaitlist()`, no `/pricing`). If `loadDiagnostic()` is null, show a "Take the baseline diagnostic" empty state → `startDiagnostic()`. Markup/CSS ported from the mockup Section 2 Free frame.

- [ ] **Step 3: `_renderPassPlanProHtml()`** — read `_readReadinessSnapshots()`, map each present cert id through `window.getAvailableCerts('user')` to its `name`+`code`+`glyph`, render one compact row per cert (readiness `score`, `computed_at` date, `weak_domain`) opening that cert via `tadSwitchCert(id)`; plus a "Diagnose another cert" action → a cert picker that calls `tadSwitchCert(id)` (Pro-gated already). Markup from the mockup Section 2 Pro frames (phone + the desktop reflow is just CSS).

- [ ] **Step 4: `_wirePassPlanSection(host)`** binds the `data-act` buttons: `pp-view` → `viewPassPlan()`; `pp-retake` → `retakeDiagnostic()`; `pp-pro` → `_showProWaitlist()`; `pp-open-cert` → `tadSwitchCert(certId)`; `pp-empty` → `startDiagnostic()`.

- [ ] **Step 5: Hook into settings render.** In `renderSettingsPage()` (`:19628`), add near the other guarded sub-renderers:
```js
  if (typeof renderPassPlanSection === 'function') renderPassPlanSection();
```

- [ ] **Step 6: Styles.** Append account-plan styles to `dg-system.css` ported from the mockup (`.plan-card`, `.prob-ring`, `.pcard-*`, `.locked-certs`, `.cert-chip`, `.plan-list`, `.plan-item`, `.pi-*`, `.add-cert`), scoped under `#passplan-section`, using app tokens.

- [ ] **Step 7: Browser verify both tiers.** Stub `_quotaState` free vs pro + a sample `nplus_diagnostic` and `nplus_readiness_snapshots` (local only), open Settings, screenshot each. Confirm Free shows one plan + locked chips; Pro shows the per-cert list + add. Confirm retake/view/switch handlers fire.

- [ ] **Step 8: UAT guards.**
```js
test('account Pass Plan section', html.includes('id="passplan-section"'));
test('Pass Plan section tier-aware', _fnBody(js, 'renderPassPlanSection').includes('_renderPassPlanProHtml'));
test('Pro plan list uses snapshots', _fnBody(js, '_renderPassPlanProHtml').includes('_readReadinessSnapshots'));
```
Run `node tests/uat.js`; expect pass.

- [ ] **Step 9: Commit.**
```bash
git add app.js index.html dg-system.css tests/uat.js && git commit -m "feat(account): Pass Plan home on settings (Free one-plan+upsell, Pro plan-per-cert)"
```

---

## Phase 3 — Plan to practice (pre-loaded builder)

### Task 8: `_drillWeakDomainToBuilder()` (open builder, no auto-start)

**Files:**
- Modify: `app.js` — new function modeled on `prefillDomainTopics` (`:12158`); repoint the weak-domain button in `_renderPassPlanWeakDomains` (`:5413-5429`)

- [ ] **Step 1: Write the handler** (keep < 80 lines):
```js
// v7.52.0: open the Custom Quiz builder pre-loaded with a weak domain's topics (no auto-start).
function _drillWeakDomainToBuilder(domainKey) {
  prefillDomainTopics(domainKey);                 // selects topics + recomputes `topic` + opens builder
  const rem = _quotaRemainingToday();             // Infinity for Pro; N for free
  const want = (rem === Infinity) ? 15 : Math.max(5, Math.min(15, rem));
  qCount = want;
  document.querySelectorAll('#count-group .chip').forEach(c =>
    c.classList.toggle('on', c.dataset.v === String(want)));
  syncChipAriaPressed('#count-group');
  _renderBuilderQuotaLine();                       // "N of 15 left today" (Task 9)
}
```

- [ ] **Step 2: Repoint the weak-domain button.** In `_renderPassPlanWeakDomains` (`:5420`/`:5426`) change the button `onclick` from `focusFirstTopicInDomain('<key>')` (which auto-starts) to `_drillWeakDomainToBuilder('<key>')`. Keep the "Drill all weak topics" primary button → call `_drillWeakDomainToBuilder` for the top weak domain (or extend to select all weak domains' topics).

- [ ] **Step 3: Browser verify.** Open a Pass Plan, click a weak-domain "Fix this →"; confirm the Custom Quiz builder OPENS with that domain's topics pre-selected and the count set, and does NOT immediately start a quiz. Confirm hitting Generate then runs the normal `startQuiz()` flow.

- [ ] **Step 4: UAT guard.**
```js
test('weak drill opens builder (no autostart)', _fnBody(js, '_drillWeakDomainToBuilder').includes('prefillDomainTopics') && !_fnBody(js, '_drillWeakDomainToBuilder').includes('startQuiz('));
```

- [ ] **Step 5: Commit.**
```bash
git add app.js tests/uat.js && git commit -m "feat(diagnostic): weak topics open the Custom Quiz builder pre-loaded"
```

### Task 9: Quota-aware builder line

**Files:**
- Modify: `index.html` (`#custom-quiz-section`, near `#count-group` `:604`); `app.js` (`_renderBuilderQuotaLine`)

- [ ] **Step 1: Add a quota line element** above `#count-group`:
```html
  <div id="cq-quota-line" class="cq-quota-line" hidden></div>
```

- [ ] **Step 2: Write `_renderBuilderQuotaLine()`** (tiny): if `_srIsFreeTier()`, show `"Free plan · " + _quotaRemainingToday() + " of " + _quotaState.daily_limit + " questions left today"` and reveal; else keep hidden. Call it from `_drillWeakDomainToBuilder` (Task 8) and whenever the builder opens (`_jumpToCustomQuiz`, `:6042`).

- [ ] **Step 3: Style** `.cq-quota-line` from the mockup's `.quota-note` (bronze-tinted hairline pill), scoped, app tokens.

- [ ] **Step 4: Browser verify** with a stubbed free `_quotaState` ({tier:'free', daily_limit:15, used_today:7}); confirm "8 of 15 questions left today" shows and the count chip clamps to ≤ remaining. (The existing v7.46 count-interceptor + `startQuiz` gate enforce the hard cap — no new gate logic.)

- [ ] **Step 5: UAT guard.**
```js
test('builder quota line', html.includes('id="cq-quota-line"') && /function _renderBuilderQuotaLine\(/.test(js));
```

- [ ] **Step 6: Commit.**
```bash
git add index.html app.js dg-system.css tests/uat.js && git commit -m "feat(diagnostic): quota-aware Custom Quiz builder line for free users"
```

---

## Phase 4 — Audit, version, ship

### Task 10: Four audit passes on the real build

- [ ] **Step 1:** Run `/design-taste-frontend` → `/emil-design-eng` → `/humanizer` → `/marketing-psychology` against the three live surfaces (conversion block, account Pass Plan, builder line) in the browser. Fix findings inline (em-dash/emoji scan, bronze-not-purple, hairline-not-callout, copy clarity, loss-aversion framing). Re-screenshot.
- [ ] **Step 2:** Commit any audit fixes: `git commit -am "polish(diagnostic): four-pass audit fixes on conversion + account surfaces"`.

### Task 11: review-feature (4-agent) pass

- [ ] **Step 1:** Run the in-repo `review-feature` skill (touches accounts + the Pro path → required). Address blocking findings; commit fixes.

### Task 12: Version bump + tech-debt check

- [ ] **Step 1:** `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"` then `node scripts/bump-version.js 7.52.0 "In-app diagnostic conversion + account Pass Plan home + plan-to-practice"`. Re-read CLAUDE.md (the script rewrites it).
- [ ] **Step 2:** `node tests/uat.js` (expect pass), `node tests/tech-debt.js`. If the function-count or LOC gate trips, fix (split a >80-line function) or raise the cap per the v7.16.0 precedent in the same commit. Confirm no new dead functions (every new function has a caller/UAT).
- [ ] **Step 3:** Commit: `git commit -am "chore(release): v7.52.0"`.

### Task 13: Ship

- [ ] **Step 1:** Walk `SHIP_CHECKLIST.md` via the in-repo `/ship` skill. This is gated-lane (auth-state.js touched) → push the branch, open the PR (the cert-app, NOT landing), let CI (UAT + Playwright) run on the Supabase/Vercel preview.
- [ ] **Step 2:** Smoke the Vercel preview in a real browser: full flow (finish diagnostic → conversion states → account Pass Plan → weak-topic drill → builder → retake/switch). Confirm no `/pricing` link in the iOS conversion/Pro surfaces.
- [ ] **Step 3:** On green + founder "merge", squash-merge → prod deploy → post-deploy prod verification (CLAUDE.md rule).

---

## Self-review (spec coverage)

- Conversion moment, 3 states, free-primary, App-Store-safe Pro waitlist → Tasks 1-3. ✓
- Account Pass Plan home, Free (one plan + upsell) vs Pro (plan per cert) → Tasks 4-7. ✓
- Plan → weak topic → pre-loaded builder → Task 8. ✓
- Quota-aware builder (15/day, separate 5 reviews, soft cap reuse) → Task 9. ✓
- Re-diagnostic: Retake (7-day soft confirm) + Diagnose another cert (cert switcher) → wired in Task 7. ✓
- One responsive build; brand; no emoji/em-dash → conventions + Task 10. ✓
- review-feature + ship + lane → Tasks 11-13. ✓
