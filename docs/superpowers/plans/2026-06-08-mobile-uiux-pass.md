---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan, mobile]
---
# Mobile UI/UX Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the phone experience activation-first — lead Home with a Start action, cut it from ~3.7 to ~1.4 screens, and clear the cross-cutting blockers (off-screen sign-in message, button-blocking update banner, sub-44px targets, buried Results CTA) — without touching desktop/tablet.

**Architecture:** Static HTML/JS/CSS, no build step. Phone-only changes are scoped to `@media (max-width:620px)`; desktop bento (≥981px) and tablet (621–980px) stay byte-identical. Home re-layout uses CSS `order` on existing `.bento` grid cells (no DOM reordering). The sign-in gate fix is centralized in one helper so every gated entry point benefits. The update banner moves from a bottom overlay to a slim top strip.

**Tech Stack:** Vanilla JS (`app.js`), `index.html`, `dg-system.css` + `styles.css`, UAT regex suite (`tests/uat.js`), `scripts/bump-version.js`. Local serve: `python3 -m http.server`. Live-verify via Playwright/CDP at pinned viewports.

---

## Conventions for this plan (read first)

- **"Test" in this codebase = UAT assertion (regex over source in `tests/uat.js`) + live-measurement.** There is no unit runner for UI. Each task adds/updates a UAT assertion where it can meaningfully guard the change, and every task has a **live-verify** acceptance step (drive a local serve at a pinned viewport and read DOM rects — never eyeball).
- **Branch:** work on `fix/desktop-audit` (already holds the desktop v7.34.0 commit + this spec). Commit per task.
- **Phone breakpoint:** `@media (max-width:620px)` only, unless stated. After every visual task, confirm **1440×900 and 768×1024 are unchanged**.
- **Viewport pinning gotcha:** the test browser applies a ~1.5× page zoom and the SW caches CSS. When live-verifying: clear SW + caches on localhost, disable network cache, and pin device metrics via CDP `Emulation.setDeviceMetricsOverride {deviceScaleFactor:1}`, self-correcting until `innerWidth` equals the target. (Pattern proven during the desktop fix.)
- **localStorage on localhost is safe** to `clear()` to simulate a new user. NEVER on prod/*.vercel.app.
- **Version:** do NOT hand-edit version surfaces. Final `bump-version.js` runs in the last task.
- **Gates:** `node tests/uat.js` must end "ALL PASS"; `node tests/tech-debt.js` must not add new breaches (pre-existing app.js/styles.css/dead-fn warnings are tolerated, exit 0).
- **Node path:** `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"` before node commands.
- **Worktree root:** `/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz/.claude/worktrees/desktop-audit-fixes` (paths below are relative to it).

---

## File Structure

| File | Responsibility in this plan |
|---|---|
| `app.js` | New-user Start target; centralized in-view sign-in prompt (`_showSignInPrompt`); update-banner top-strip class; empty-Review copy; readiness phone-strip class hook (reuse `is-pending`) |
| `index.html` | Collapsible wrappers / disclosure markup for Practice/Exam/Drill/Custom (phone); any new container for the inline sign-in prompt + sticky Results bar |
| `dg-system.css` | Phone (`≤620px`) Home: cell `order`, readiness strip, collapsibles, status row; sticky Results CTA; banner top-strip; tap-target sizing |
| `styles.css` | Tap-target sizing for global chrome (top icons), `.sw-update-banner` reposition if its base style lives here |
| `tests/uat.js` | Assertions for: top-strip banner class, ≥44 tap-target rules, collapsible markup, readiness strip rule, sign-in prompt helper, sticky Results rule, reworded copy |

---

## PHASE 1 — Cross-cutting quick wins (lower risk; do first)

### Task 1: Reword the empty-Review copy

**Files:**
- Modify: `app.js:8958` (review filter empty-state title)
- Modify: `tests/uat.js` (assertion)

- [ ] **Step 1 — Recon:** Read `app.js` around 8950–8965 to see the empty-state block and the `label` variable values (All/Correct/Incorrect/Flagged/Skipped).

- [ ] **Step 2 — Change the copy.** Replace the awkward label-prefixed title. Current:
```js
'<div class="review-filter-empty-title">Nothing here — no ${escHtml(label)} answers</div>'
```
New (drop the ungrammatical "no {label} answers"; keep the filter name as context on a sub-line):
```js
'<div class="review-filter-empty-title">No answers to show yet</div>' +
'<div class="review-filter-empty-sub">Finish a quiz, then filter by ' + escHtml(label) + ' to review them here.</div>'
```
If a `.review-filter-empty-sub` style doesn't exist, add a minimal one near the existing empty-state CSS (muted, ~13px). Match the surrounding template's quoting/concatenation style exactly (recon first).

- [ ] **Step 3 — UAT assertion.** In `tests/uat.js`, near other review assertions, add:
```js
test('v7.x Review empty-state copy is grammatical (no "no all answers")',
  !/no \$\{[^}]*label[^}]*\} answers/.test(js) && /No answers to show yet/.test(js));
```

- [ ] **Step 4 — Run UAT:** `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node tests/uat.js 2>&1 | tail -3` → Expected: "ALL PASS".

- [ ] **Step 5 — Commit:**
```bash
git add app.js tests/uat.js
git commit -m "fix(review): grammatical empty-state copy"
```

---

### Task 2: Bring sub-44px tap targets up to ≥44×44 (touch only)

**Files:**
- Modify: `dg-system.css` and/or `styles.css` (add a touch-only block)
- Modify: `tests/uat.js`

- [ ] **Step 1 — Recon:** Find the current sizes/classes. Run:
```bash
grep -nE 'sb-mobile-toggle|diag-conf-tier|app-topbar .*iconbtn|topbar-bug-report|topbar-theme|pass-plan-weak-btn|sw-banner|a2hs-banner-dismiss' dg-system.css styles.css index.html | head -40
```
Identify the rules controlling: hamburger `.sb-mobile-toggle`, topbar icon buttons (settings/report/theme — likely `.app-topbar .iconbtn` or `#topbar-*`), confidence chips `#diag-quiz-confidence-tiers .diag-conf-tier`, results `.pass-plan-weak-btn`, banner close `.a2hs-banner-dismiss` / sw banner button.

- [ ] **Step 2 — Add a touch-only sizing block** (in `dg-system.css`, near other mobile rules). Use `@media (hover:none) and (pointer:coarse)` so desktop mouse UIs are untouched. Example (adjust selectors to recon):
```css
/* v7.x: >=44px tap targets on touch devices (audit 1.6) */
@media (hover:none) and (pointer:coarse){
  .sb-mobile-toggle{min-width:44px;min-height:44px}
  .app-topbar .iconbtn, #topbar-settings, #topbar-bug-report, #topbar-theme{min-width:44px;min-height:44px;padding:0}
  #diag-quiz-confidence-tiers .diag-conf-tier{min-height:44px}
  .pass-plan-weak-btn{min-height:44px;padding:11px 14px}
  .a2hs-banner-dismiss{min-width:44px;min-height:44px}
}
```
Use `min-height`/`min-width` (not fixed) so nothing else breaks. Add small gaps between the three top icons if they touch (e.g. `gap:6px` on their container).

- [ ] **Step 3 — UAT assertion:**
```js
test('v7.x Tap targets: coarse-pointer block bumps confidence + top controls to 44px',
  /@media \(hover:none\) and \(pointer:coarse\)/.test(css) && /diag-conf-tier\{min-height:44px/.test(css.replace(/\s/g,'')) === false ? /min-height:44px/.test(css) : true);
```
(Keep it simple: assert the coarse-pointer block exists and contains `44px`.) Prefer:
```js
test('v7.x Tap targets >=44px coarse-pointer block present',
  /@media\s*\(hover:none\)\s*and\s*\(pointer:coarse\)\{[\s\S]{0,600}44px/.test(css));
```

- [ ] **Step 4 — Live-verify.** Serve worktree on a fresh port; pin **428×926, deviceScaleFactor 1, mobile:true** (coarse pointer). Measure rects of `.sb-mobile-toggle`, the three topbar icons, and `#diag-quiz-confidence-tiers .diag-conf-tier`; assert every `w>=44 && h>=44`. Confirm 1440×900 (fine pointer) shows the icons unchanged.

- [ ] **Step 5 — Commit:**
```bash
git add dg-system.css styles.css tests/uat.js
git commit -m "fix(a11y): >=44px tap targets on touch (top icons, confidence chips, fix-this, banner close)"
```

---

### Task 3: Move the "New version available" banner to a slim top strip

**Files:**
- Modify: `app.js` ~1726–1755 (`_showSwUpdateBanner`)
- Modify: `dg-system.css` (new `.sw-update-banner` top-strip styles) — check `styles.css` first for existing `.sw-update-banner` rules
- Modify: `tests/uat.js`

- [ ] **Step 1 — Recon:** Read `app.js:1720–1760` (banner build + insert) and `grep -n 'sw-update-banner\|sw-banner' styles.css dg-system.css`. Note where it's appended (likely `document.body.appendChild`) and current bottom-fixed CSS.

- [ ] **Step 2 — Reposition.** Keep the element + refresh action; change placement so it can never overlap content:
  - In `_showSwUpdateBanner`, add a marker class for the top strip, e.g. `banner.className = 'sw-update-banner sw-update-strip';` and insert it at the top of the app chrome (e.g. `document.body.insertBefore(banner, document.body.firstChild)` or prepend to the main app container) rather than bottom.
  - CSS (replace bottom-fixed with top strip):
```css
/* v7.x: update banner as a slim non-overlapping top strip (audit 1.4/2.2/2A.2) */
.sw-update-strip{
  position:sticky; top:0; left:0; right:0; z-index:9980;
  display:flex; align-items:center; justify-content:center; gap:12px;
  padding:8px 14px; padding-top:max(8px,env(safe-area-inset-top));
  font-size:13px; background:color-mix(in oklab,var(--accent) 18%,var(--surface));
  border-bottom:1px solid var(--accent-line);
}
.sw-update-strip .sw-banner-title{font-weight:700}
.sw-update-strip button{min-height:36px}
```
  (If `position:sticky` fights the existing layout, use `position:fixed; top:0` plus a body padding-top while visible — decide at recon. The hard requirement: it overlaps **no** CTA.)

- [ ] **Step 3 — UAT assertion:**
```js
test('v7.x SW update banner mounts as a top strip, not a bottom overlay',
  /sw-update-strip/.test(js) && /\.sw-update-strip\{[\s\S]{0,200}(top:0|sticky|fixed)/.test(css));
```

- [ ] **Step 4 — Live-verify.** Hard to trigger the SW event on demand; instead temporarily call `_showSwUpdateBanner('test')` via the console on a local serve, then at **428×926** confirm: the strip sits at the top, the Home Start button and (in the quiz builder) "Generate Quiz" are fully visible and not overlapped (`banner.bottom <= cta.top`). Remove the temp call.

- [ ] **Step 5 — Commit:**
```bash
git add app.js dg-system.css tests/uat.js
git commit -m "fix(pwa): update banner as slim top strip so it never covers primary buttons"
```

---

### Task 4: Stop the inline Custom Quiz panel from intercepting taps

**Files:**
- Modify: `dg-system.css` (the `#custom-quiz-section[open]` rules) and/or `index.html`
- Modify: `tests/uat.js`

- [ ] **Step 1 — Recon/repro:** Read the `#custom-quiz-section` rules: `grep -n 'custom-quiz-section' dg-system.css index.html`. On a local serve at 428×926, open the section and confirm the control beneath (e.g. "Daily Challenge") is blocked (Playwright reported the open `<details>` "intercepts pointer events"). Identify the cause — typically the open panel has `position`/negative-margin/`overflow` or a `::after`/`::before` overlay extending past its box, or a sibling with a transform creating an overlay.

- [ ] **Step 2 — Fix the flow/stacking.** Make the expanded panel occupy normal flow and not cover siblings:
  - Ensure `#custom-quiz-section[open]` is not `position:absolute/fixed` over siblings; if a decorative `::before/::after` overlay extends beyond the card, add `pointer-events:none` to it.
  - Ensure no negative bottom margin pulls following content under it.
  - If a stacking-context/z-index puts it above siblings, normalize so following buttons are reachable.
  Apply the minimal rule that makes the below-control tappable (decide exactly at recon; e.g. `#custom-quiz-section::before{pointer-events:none}` and/or removing an overlay overflow).

- [ ] **Step 3 — UAT assertion** (guard the specific fix you applied), e.g.:
```js
test('v7.x Custom Quiz decorative overlay is pointer-events:none (no tap interception)',
  /custom-quiz-section[^{]*::(before|after)\{[^}]*pointer-events:none/.test(css.replace(/\s/g,'')) || /custom-quiz-section\[open\][\s\S]{0,200}pointer-events:none/.test(css));
```
(Adjust to match the actual fix.)

- [ ] **Step 4 — Live-verify.** At 428×926, open the section, then click the control directly beneath it via real coordinates; assert it fires (page/state changes) — i.e. no interception. Confirm desktop still fine.

- [ ] **Step 5 — Commit:**
```bash
git add dg-system.css index.html tests/uat.js
git commit -m "fix(home): custom-quiz panel no longer intercepts taps on buttons below it"
```

---

### Task 5: Show the signed-out sign-in prompt in view, under the tapped control

**Files:**
- Modify: `app.js` — add `_showSignInPrompt(anchorEl, message)`; harden `showSetupError()` (app.js:6187) to scroll into view as a fallback; wire primary gated entry points (Home Start `#primaryLaunch` handler, Quick Start items, quiz-builder Generate)
- Modify: `dg-system.css` — `.signin-inline` prompt styles
- Modify: `tests/uat.js`

- [ ] **Step 1 — Recon:** Read `showSetupError()` (app.js 6187–6210) and the gated entry handlers (`startQuiz` ~6592, `startDailyChallenge`, the Generate handler ~10845/11310, `startDiagnostic`). Note they all do: `errBox.textContent = keyErr; errBox.classList.remove('is-hidden'); showSetupError();`. Confirm the signed-out message text comes from `validateApiKey` ("Sign in to study free: 20 questions a day, no API key needed…").

- [ ] **Step 2 — Add the helper.** Near `showSetupError`, add:
```js
// v7.x: render the gate message in-view, anchored under the control the user
// tapped, with a one-tap sign-in. Falls back to top-of-active-page if no anchor.
function _showSignInPrompt(anchorEl, message) {
  document.querySelectorAll('.signin-inline').forEach(n => n.remove());
  const box = document.createElement('div');
  box.className = 'signin-inline';
  box.setAttribute('role', 'status');
  box.innerHTML = '<span class="signin-inline-msg"></span>' +
    '<button type="button" class="signin-inline-cta">Sign in to start free</button>';
  box.querySelector('.signin-inline-msg').textContent = message ||
    'Sign in to study free: 20 questions a day, no API key needed.';
  box.querySelector('.signin-inline-cta').addEventListener('click', () => {
    if (typeof openAuthSheet === 'function') openAuthSheet();        // confirm real fn at recon
    else if (typeof goSignIn === 'function') goSignIn();
    else { const p = document.querySelector('.account-pill, #sign-in, [data-auth=signin]'); if (p) p.click(); }
  });
  if (anchorEl && anchorEl.parentNode) anchorEl.insertAdjacentElement('afterend', box);
  else {
    const page = document.querySelector('.page.active') || document.body;
    page.insertBefore(box, page.firstChild);
  }
  box.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
```
(At recon, replace the auth-trigger with the app's real sign-in entry — check `auth-state.js` for the dropdown/sheet opener.)

- [ ] **Step 3 — Wire the primary entry points.** In the gated handlers, when `validateApiKey` returns the signed-out message (i.e. not signed in, empty key), call `_showSignInPrompt(<the tapped button>, keyErr)` instead of only the buried `#setup-err`. For the Home Start button use `document.getElementById('primaryLaunch')`; for Generate use its button; for Quick Start items use the clicked element (`event.currentTarget` where available). Keep `showSetupError()` as the fallback.

- [ ] **Step 4 — Harden the fallback.** In `showSetupError()`, after un-hiding `#setup-err`, add `errBox.scrollIntoView({block:'center'})` so no path ever leaves the message off-screen.

- [ ] **Step 5 — CSS:**
```css
.signin-inline{display:flex;flex-direction:column;gap:10px;margin:12px 0;padding:14px;border-radius:12px;
  background:color-mix(in oklab,var(--accent) 12%,var(--surface));border:1px solid var(--accent-line)}
.signin-inline-msg{font-size:13.5px;line-height:1.5;color:var(--text)}
.signin-inline-cta{min-height:44px;border-radius:10px;font-weight:700}
```

- [ ] **Step 6 — UAT assertions:**
```js
test('v7.x Signed-out gate shows an in-view sign-in prompt (helper present)',
  /function _showSignInPrompt\b/.test(js));
test('v7.x showSetupError scrolls the message into view (no off-screen gate)',
  /showSetupError[\s\S]{0,400}scrollIntoView/.test(js));
```

- [ ] **Step 7 — Live-verify.** On a local serve (signed-out, empty key) at 428×926: tap the Home Start button; assert a `.signin-inline` appears within the viewport directly after the button (`rect.top` between 0 and innerHeight), with a ≥44px CTA. Repeat for "Generate Quiz".

- [ ] **Step 8 — Commit:**
```bash
git add app.js dg-system.css tests/uat.js
git commit -m "fix(activation): signed-out sign-in prompt renders in-view under the tapped control"
```

---

### Task 6: Sticky primary CTA on the Pass Plan / Results screen + bigger "Fix this"

**Files:**
- Modify: `app.js` ~5120–5300 (pass-plan render: `.pass-plan-weak-btn`, "Start today's session →")
- Modify: `dg-system.css` (sticky bar on phone; `.pass-plan-weak-btn` size handled in Task 2)
- Modify: `tests/uat.js`

- [ ] **Step 1 — Recon:** Read `app.js` ~5120–5300 to see how the pass-plan completion screen and its "Start today's session →" CTA are rendered, and the container id/class of `#page-diagnostic-result`/pass-plan footer.

- [ ] **Step 2 — Make the CTA sticky on phones.** Wrap (or mark) the "Start today's session →" button in a footer bar and add phone-only sticky CSS:
```css
@media (max-width:620px){
  .passplan-cta-bar{position:sticky;bottom:0;z-index:50;display:flex;
    padding:12px 16px calc(12px + env(safe-area-inset-bottom));
    background:linear-gradient(180deg,transparent,var(--bg) 28%)}
  .passplan-cta-bar .btn-primary{width:100%;min-height:48px}
}
```
If adding a wrapper class is impractical in the template, target the existing CTA's parent. Keep desktop unchanged (rule is ≤620 only).

- [ ] **Step 3 — UAT assertion:**
```js
test('v7.x Pass Plan primary CTA is sticky on phones',
  /passplan-cta-bar|Start today.{0,3}s session/.test(js) && /@media\s*\(max-width:620px\)[\s\S]{0,400}position:sticky[\s\S]{0,200}bottom:0/.test(css));
```

- [ ] **Step 4 — Live-verify.** Reach the pass-plan screen via the no-key mock diagnostic (`startDiagnostic({mock:true,skipConfirm:true,count:5})`, answer through) at 428×926; assert the "Start today's session" button is pinned within the viewport (its `rect.bottom <= innerHeight`) before scrolling, and `.pass-plan-weak-btn` height ≥44. Confirm desktop unchanged.

- [ ] **Step 5 — Commit:**
```bash
git add app.js dg-system.css tests/uat.js
git commit -m "fix(results): sticky 'Start today's session' on phones + larger Fix-this"
```

---

## PHASE 2 — Phone Home redesign (Option A, ≤620px)

> All Phase-2 CSS lives under `@media (max-width:620px)`. The bento DOM order is unchanged; we reorder with `order`. Reference cells (from `index.html` ~320–380): `.cell-hero` (`#readiness-card-v2`), `.cell-recommend` (`#primaryLaunch`), `.cell-momentum`, `.cell-quick`, `.cell-practice`, `.cell-exam`, `.cell-domains`, `.cell-custom`.

### Task 7: Readiness → one-line strip on phones

**Files:**
- Modify: `dg-system.css` (phone strip styles, reuse `.is-pending` hook from v7.34.0)
- Modify: `app.js` — ensure the strip line shows score/pass summary when populated (it already sets `#rc-v2-num`, delta); add a compact summary string if needed
- Modify: `tests/uat.js`

- [ ] **Step 1 — Recon:** Read the readiness markup (`index.html` ~324–334) and `renderReadinessCardV2` (app.js ~18832). Confirm the child ids: `.readiness-eyebrow`, `.readiness-score #rc-v2-num`, `.readiness-bar-track`, `.readiness-range #rc-v2-delta`, `#rc-v2-prediction`.

- [ ] **Step 2 — Phone strip CSS.** Collapse the gauge to a single tappable line at ≤620:
```css
@media (max-width:620px){
  #page-setup .cell-hero .readiness-card{padding:12px 14px;min-height:0}
  /* hide the gauge guts on phone; keep eyebrow + a compact line */
  #page-setup .readiness-card .readiness-score .rc-v2-numwrap,
  #page-setup .readiness-card .readiness-bar-track,
  #page-setup .readiness-card .rc-v2-stamp{display:none}
  #page-setup .readiness-card .readiness-eyebrow{margin-bottom:6px}
  #page-setup .readiness-strip-line{display:flex;justify-content:space-between;align-items:baseline;font-size:13px}
  #page-setup .readiness-strip-line b{font-size:18px;font-family:'Fraunces',Georgia,serif}
}
```

- [ ] **Step 3 — Render a strip line.** In `renderReadinessCardV2`, build a compact line element `#readiness-strip-line` (created once) summarizing: populated → "Readiness **642**/900 · 78% pass ›"; empty (`is-pending`) → "Readiness — /900 · take a quiz to unlock". Make the readiness card a link/tap to Progress on phone (e.g. add an onclick when `matchMedia('(max-width:620px)').matches` → `showPage('progress')`). Keep the full gauge markup intact for ≥621px.

- [ ] **Step 4 — UAT assertions:**
```js
test('v7.x Readiness phone strip line rendered', /readiness-strip-line/.test(js) && /readiness-strip-line/.test(css));
test('v7.x Readiness gauge hidden on phones', /@media\s*\(max-width:620px\)[\s\S]{0,500}rc-v2-numwrap[\s\S]{0,40}display:none/.test(css.replace(/\n/g,'')) || /readiness-bar-track\{display:none/.test(css.replace(/\s/g,'')));
```

- [ ] **Step 5 — Live-verify.** At 428×926 (empty + populated via localStorage): assert `.readiness-bar-track` is `display:none`, the strip line is visible and one line, card height ≤ ~80px. At 1440×900 assert the full gauge still renders (numwrap visible, height ~ unchanged).

- [ ] **Step 6 — Commit:**
```bash
git add app.js dg-system.css tests/uat.js
git commit -m "feat(home): readiness as a one-line strip on phones (gauge stays on desktop/Progress)"
```

---

### Task 8: Reorder Home — Start first, then status strip, then Quick Start

**Files:**
- Modify: `dg-system.css` (phone `order` + status row)
- Modify: `tests/uat.js`

- [ ] **Step 1 — Recon:** Confirm `.bento` is single-column at ≤620 (`grid-column:1/-1` block, dg-system.css ~3016) and that `order` is currently unset.

- [ ] **Step 2 — Apply order at ≤620:**
```css
@media (max-width:620px){
  #page-setup .cell-recommend{order:1}   /* Start action first */
  #page-setup .cell-hero    {order:2}    /* readiness strip */
  #page-setup .cell-momentum{order:3}    /* today's momentum (compact) */
  #page-setup .cell-quick   {order:4}    /* Quick start (open) */
  #page-setup .cell-practice{order:5}
  #page-setup .cell-exam    {order:6}
  #page-setup .cell-domains {order:7}
  #page-setup .cell-custom  {order:8}
  /* compact momentum on phone */
  #page-setup .cell-momentum .mo-ring{transform:scale(.85);transform-origin:left center}
}
```

- [ ] **Step 3 — UAT assertion:**
```js
test('v7.x Phone Home leads with Start (cell-recommend order:1)',
  /@media\s*\(max-width:620px\)[\s\S]{0,800}cell-recommend\{order:1/.test(css.replace(/\n/g,'')));
```

- [ ] **Step 4 — Live-verify.** At 428×926: read the vertical order of `.cell-recommend`, `.cell-hero`, `.cell-quick` by `getBoundingClientRect().top` — assert recommend.top < hero.top < quick.top, and that the Start button (`#primaryLaunch`) is within the first screen (`rect.top < innerHeight` and ideally `rect.bottom <= innerHeight`). Confirm 1440×900 order unchanged (no `order` applied).

- [ ] **Step 5 — Commit:**
```bash
git add dg-system.css tests/uat.js
git commit -m "feat(home): phones lead with the Start action (reorder bento via order)"
```

---

### Task 9: Collapse Practice / Exam / Drill-by-Domain / Custom on phones

**Files:**
- Modify: `index.html` (wrap the four sections' bodies in `<details>`/disclosure, or add a collapse toggle) — **phone-only behavior**
- Modify: `dg-system.css` (collapsed styling + ≥44 header)
- Modify: `app.js` if a JS toggle is used instead of native `<details>`
- Modify: `tests/uat.js`

- [ ] **Step 1 — Recon:** Read the four cells' markup (`.cell-practice`, `.cell-exam`, `.cell-domains`, `.cell-custom`) in `index.html`. Decide mechanism: native `<details>` is simplest and a11y-friendly. The constraint: they must stay **fully expanded on ≥621px**. Approach: wrap each cell's body in `<details class="home-collapse"><summary>…</summary>…</details>` and use CSS to force-open on desktop:
```css
@media (min-width:621px){ #page-setup .home-collapse[open], #page-setup .home-collapse{ } /* native shows summary; instead: */ }
```
Cleaner: keep them plain on desktop, and **only** apply `<details>` semantics via a small JS that, at ≤620, moves each section body into a disclosure (or toggles a `.is-collapsed` class). To avoid DOM surgery, prefer: render `<details>` always, but at ≥621 CSS hides the `summary` marker and forces content visible:
```css
@media (min-width:621px){
  #page-setup .home-collapse{ } /* ensure content shown */
  #page-setup .home-collapse > summary{list-style:none}
}
#page-setup .home-collapse[open] > summary .chev{transform:rotate(90deg)}
```
At ≥621, set the `open` attribute on load (JS: if `min-width:621` matches, add `open` to all `.home-collapse`). At ≤620, default `open` only on Quick Start.
Decide the concrete mechanism at recon and implement ONE consistently. **Acceptance is behavioral, not mechanism-specific:** desktop shows everything expanded; phone shows collapsed rows with ≥44px tappable headers.

- [ ] **Step 2 — Implement** the chosen mechanism for the four sections. Header (summary) shows the section title + a chevron; min-height 44; tapping toggles. Quick Start stays open by default on phone.

- [ ] **Step 3 — UAT assertions:**
```js
test('v7.x Home sections are collapsible on phone', /home-collapse/.test(html) || /home-collapse/.test(js));
test('v7.x Home sections forced expanded on >=621px',
  /@media\s*\(min-width:621px\)[\s\S]{0,400}home-collapse/.test(css.replace(/\n/g,'')));
```

- [ ] **Step 4 — Live-verify.** At 428×926: assert Practice/Exam/Drill/Custom bodies are collapsed (their inner lists have height 0 / not visible) and each header is ≥44px and toggles on tap. Re-measure total Home height → target ≈ **1.4 screens** (`scrollHeight/innerHeight ≈ 1.4`). At 1440×900 and 768×1024: assert all four sections fully expanded (bodies visible) — **no regression**.

- [ ] **Step 5 — Commit:**
```bash
git add index.html dg-system.css app.js tests/uat.js
git commit -m "feat(home): collapse Practice/Exam/Drill/Custom on phones (expanded on desktop/tablet)"
```

---

### Task 10: New-user Start = 10-question mixed warm-up

**Files:**
- Modify: `app.js` (`#primaryLaunch` action / `applyPreset('focused')` path; `renderBentoRecommended`)
- Modify: `tests/uat.js`

- [ ] **Step 1 — Recon:** Read `renderBentoRecommended` and the `#primaryLaunch` onclick (`applyPreset('focused')`, index.html:341). Find how presets map to topic/diff/count (look for `applyPreset` and the warm-up/mixed preset, e.g. `5-min Warmup` = 5 mixed). Confirm `loadHistory()` is the "has data" signal (used in `renderReadinessCardV2`).

- [ ] **Step 2 — Branch the new-user action.** In `renderBentoRecommended` (or where the tile's label/action are set), when `loadHistory().length === 0`:
  - Set the tile label to **"Start your first quiz"** and sublabel "10 questions · mixed · ~10 min".
  - Set its action to launch a 10-question mixed quiz (reuse the existing mixed preset with count 10 — e.g. `applyPreset('warmup10')` if such exists, else set `topic=MIXED_TOPIC; diff=DEFAULT_DIFF; qCount=10;` then the normal start path). Do NOT use weak-spots (no data yet).
  Otherwise keep the current Recommended/Smart behavior unchanged.

- [ ] **Step 3 — UAT assertion:**
```js
test('v7.x New-user Start launches a 10-Q mixed warm-up, not weak-spots',
  /loadHistory\(\)\.length\s*===\s*0[\s\S]{0,400}(Start your first quiz|qCount\s*=\s*10)/.test(js));
```

- [ ] **Step 4 — Live-verify.** Local serve, fresh localStorage (no history), 428×926: assert the Start tile reads "Start your first quiz"; trigger it (signed-out → should now show the inline sign-in prompt from Task 5; if a key/signed-in test is available, assert it builds a 10-question mixed quiz). With history present, assert the tile reverts to the Recommended label.

- [ ] **Step 5 — Commit:**
```bash
git add app.js tests/uat.js
git commit -m "feat(home): new users start a 10-Q mixed warm-up (weak-spots needs data first)"
```

---

## PHASE 3 — Integrate, verify, ship-prep

### Task 11: Full-flow verification, regression, version bump, gates

**Files:**
- Modify: version surfaces via `scripts/bump-version.js` (app.js, sw.js, index.html, package.json, CLAUDE.md)
- Modify: `CHANGELOG.md` (full detail)

- [ ] **Step 1 — Full live-verify (phones).** Serve worktree; pin true viewports (deviceScaleFactor 1; clear SW+caches). At **428×926 (PWA)** and **428×745 (Safari)** walk: Home (new + returning) → Start within first screen → Quick Start open / others collapsed → tap a mode signed-out → inline prompt in view → quiz builder Generate not covered by banner → mock diagnostic → pass-plan sticky CTA. Record: Home `screens` (target ≈1.4 PWA / materially <4.6 Safari), no horizontal overflow, all measured tap targets ≥44.

- [ ] **Step 2 — Regression (desktop/tablet).** At **1440×900** and **768×1024**: confirm Home, readiness gauge, and the four sections render exactly as before this batch (full gauge visible, sections expanded, no `order`/collapse applied). Spot-check the v7.34.0 desktop readiness compaction still holds.

- [ ] **Step 3 — Gates.**
```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js 2>&1 | tail -3      # expect ALL PASS
node tests/tech-debt.js; echo "exit=$?" # expect exit 0, no NEW breaches
```
Fix any failures before continuing.

- [ ] **Step 4 — Version bump** (single combined version for desktop+mobile; supersedes the interim v7.34.0 stub — choose next minor, e.g. 7.35.0):
```bash
node scripts/bump-version.js 7.35.0 "Mobile home redesign (Start-first, collapsible sections, readiness strip) + signed-out prompt, top-strip update banner, 44px targets, sticky Results CTA; desktop readiness/PROD polish"
```
Re-read `CLAUDE.md` after (the script rewrites it). Add full detail to `CHANGELOG.md`.

- [ ] **Step 5 — Re-run gates** after bump (UAT asserts version consistency across the 4 surfaces): `node tests/uat.js 2>&1 | tail -3` → ALL PASS.

- [ ] **Step 6 — Commit:**
```bash
git add -A
git commit -m "chore(release): v7.35.0 — mobile UI/UX pass + desktop polish"
```

- [ ] **Step 7 — Handoff (do NOT push without user go-ahead).** Summarize measured before/after to the user and present ship options (push to main → CI → Vercel, or PR first). After deploy, cache-bust verify live per CLAUDE.md.

---

## Self-review notes
- **Spec coverage:** Home redesign §3 → Tasks 7–10; C →5; D →3; E →4; F →2; G →6; copy →1; verification §7 →11. All covered.
- **Type/name consistency:** `_showSignInPrompt` (Task 5) referenced in Task 10 verify; `.sw-update-strip` (Task 3); `.signin-inline` (Task 5); `.home-collapse` (Task 9); `.readiness-strip-line` (Task 7); `.passplan-cta-bar` (Task 6) — used consistently.
- **Open recon items (resolve at implement-time, not placeholders):** exact auth-sheet opener fn in Task 5; the mixed-warm-up preset id in Task 10; the collapse mechanism in Task 9; the exact selectors for topbar icons in Task 2. Each task's Step 1 reads the current source to ground these.
