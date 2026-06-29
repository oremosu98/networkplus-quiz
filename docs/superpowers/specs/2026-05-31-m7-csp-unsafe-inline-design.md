---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# M7 — Remove CSP `script-src 'unsafe-inline'`

**Date:** 2026-05-31
**Status:** Design approved, pending implementation plan
**Security roadmap item:** M7 (last deferred item after Phases 1–5 + L5 shipped)
**Lane:** Mostly fast lane; PR-1 and PR-6 touch gated files (`sw.js`, `vercel.json` CSP) → treat with gated-lane discipline (PR + preview smoke).

## Goal

Remove `'unsafe-inline'` from the **`script-src`** directive of the app's Content-Security-Policy so that an injected `<script>` or inline `on*=` handler can no longer execute. This is defence-in-depth on top of the M6 DOMPurify/escHtml layer shipped in v7.8.3 — even if escaping is bypassed somewhere, the browser refuses to run inline JS.

**In scope:** `script-src 'unsafe-inline'` only.
**Explicitly out of scope:** `style-src 'unsafe-inline'` (→ future **M7b**, separate spec), the `/mockups/(.*)` CSP block (dev artifacts), and any refactor of the global functions or `app.js` module structure (that's `saas-gated` #138).

## Current state (verified 2026-05-31)

- **CSP location:** `vercel.json` response header. Two blocks: the app block `source: "/(.*)"` (the target) and a separate `/mockups/(.*)` block (left alone). App block currently:
  `script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; …`
- **Inline handler inventory:**
  - `index.html` (static): **102** — 97 `onclick`, 4 `onchange`, 1 `oninput`. Almost all are zero-arg or simple-literal global calls (`goSetup()`, `setProgressFilter('weak')`, `pickSettingsDailyPreset(50)`). No `event`/`this` usage.
  - `app.js` (generated into template strings, then `innerHTML`'d): **73** — 71 `onclick`, 1 `onkeydown`, 1 `onchange`. Many carry runtime-interpolated args (`showReview(false, ${i})`, `jumpToQuestion(${i})`, `srMarkConfidence('…')`). A few use `event` (`event.stopPropagation();updateExamDate(…)`, `copyCmd(event, …)`). Two exotic: `${p.drillBtn.onclick}` and `__aclSidebarHandlers[…]` compose a handler string from data.
- **Inline `<script>` blocks in `index.html`:** ~3 real ones — bootstrap (~L43), `type="importmap"` (~L1554), tail (~L1627). Remainder counted earlier were comments.

## Architecture — central `data-action` delegation

New file **`event-actions.js`** (~80–120 lines), loaded via a `<script src>` tag **before** `app.js` (external → CSP-clean). It installs **three delegated listeners** on `document` (`click`, `change`, `input`). Each resolves the acting element via `event.target.closest('[data-action]')` and dispatches:

```js
function dispatch(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = window[el.dataset.action];   // existing globals stay global, unchanged
  if (typeof fn !== 'function') return;
  fn(decodeArgs(el.dataset), e, el);
}
```

Design principles:
- **Functions stay global and unchanged.** We only rewire *how* the DOM invokes them. Zero risk to the ~2 MB of app logic.
- **Args travel in `data-*` attributes.** Common case is a single `data-arg` (`data-action="setProgressFilter" data-arg="weak"`). Multi-arg / typed cases use a documented convention (`data-arg2`, or JSON in `data-args` with a type marker). `decodeArgs` normalizes these for the call.
- **`event` is passed as the 2nd param** to handlers that need it (`copyCmd`, `updateExamDate`). Those few get a small signature tweak or a named wrapper.
- **No re-binding after `innerHTML`.** Because dispatch is delegated on `document`, generated DOM is caught automatically — this is why delegation (not per-element `addEventListener`) is required for the app.js half.

### Converting the two halves
- **Static `index.html`:** mechanical attribute rewrite. `onclick="goSetup()"` → `data-action="goSetup"`; `onclick="setProgressFilter('weak')"` → `data-action="setProgressFilter" data-arg="weak"`.
- **app.js templates:** rewrite the emitted strings to `data-action="…" data-arg="${escAttr(x)}"` instead of `onclick="fn(${x})"`. Runtime args (`${i}`) become `data-arg="${i}"`.
- **Exotic (~3):** `event.stopPropagation();updateExamDate(…)` → named wrapper fn registered as an action; `${p.drillBtn.onclick}` and `__aclSidebarHandlers[…]` → change the data source to emit a `data-action` name rather than a code string. Handled in their owning slice.

### Inline `<script>` blocks
Decided per-block: **extract to external `.js`** where possible (fully CSP-clean), else **SHA-256 hash** into `script-src`. Lean: extract the bootstrap + tail blocks; hash the `importmap` (importmaps generally must stay inline).

## Rollout — staged PRs (each merges to `main` under unchanged CSP; nothing breaks until PR-6)

1. **PR-1 — Scaffold (gated: `sw.js`).** Add `event-actions.js` (delegation core + `decodeArgs`/`escAttr`), wire `<script src>` in `index.html`, add to `sw.js` precache + bump cache. Ships live doing nothing yet — proves plumbing + CSP-clean external load.
2. **PR-2 — Global chrome.** Sidebar, topbar, theme, nav toggles (every-page handlers).
3. **PR-3 — Quiz / exam flow.** Setup, quiz, exam, results, review.
4. **PR-4 — Activity sub-systems.** Diagnostic, SR review, drills, ACL PBQ, daily challenge, guided labs (mostly app.js-generated — hardest).
5. **PR-5 — Settings / data / progress / analytics.** Settings page, backup/export, progress filters, analytics tabs, GH-token, exotic cases.
6. **PR-6 — The flip (gated: `vercel.json` CSP).** Remove `'unsafe-inline'` from `script-src`; add SHA-256 hashes for any inline scripts that stayed. Tiny diff.

After each of PR-2…PR-5: grep-assert **zero remaining `on*=`** in that slice's surface, so PR-6 has nothing left to trip on.

## Testing

- **UAT (`tests/uat.js`) — add Sec-P7 guards:** count of inline `on*=` in `index.html` trends to **0** by PR-5; `event-actions.js` present in `sw.js` precache; after PR-6, the CSP string contains no `script-src 'unsafe-inline'`. Hold `MVP_BASELINE_FAILS ≤ 2700`, zero net-new (prove by diffing fail count vs `main`).
- **Playwright:** existing E2E clicks through the app — a dead button fails a test. Add targeted clicks for thin-coverage slices.
- **Per-slice live-verify:** local server (`python3 -m http.server 3131` → `localhost`) click-path before each push. **Never** write user-state localStorage on prod (hard rule).
- **PR-6 gate:** Vercel preview deploy → DevTools console open → walk full flow watching for `Refused to execute inline event handler` / `Refused to execute inline script` violations → flip prod only at **zero** violations. Then post-deploy live-verify on prod.

## Rollback

- PRs 2–5 are independently revertable; reverting restores that slice's inline handlers (still valid under the unchanged CSP).
- **PR-6 is the only risky step and is a one-line revert:** restore `'unsafe-inline'` in `vercel.json` `script-src`, redeploy → instant restore, because every handler works under both CSP regimes. This is the safety net that makes the flip low-stakes.

## Success criteria

- `script-src` no longer contains `'unsafe-inline'` on prod; app fully functional (all click-paths verified live).
- Zero inline `on*=` handlers remain in `index.html`; zero `onclick=`-string emission in `app.js`.
- Inline `<script>` blocks either externalized or hash-allowed.
- UAT + Playwright green; Sec-P7 guards passing; baseline ≤ 2700, zero net-new.
- `style-src 'unsafe-inline'` documented as the remaining M7b follow-up.
