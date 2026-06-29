---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan, saas-gated]
---
# Free-Tier Cert Lock — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Hard-enforce "free = ONE cert, locked to the user's pick; other certs require Pro" across web, Safari, and native — replacing today's UI-only affordance.

**Architecture:** A new always-on `lib/cert-lock.js` runs at the auth-resolved hook (`window._onbRoute`, before its onboarding `ENABLED` guard). For a signed-in free user whose `profile.metadata.freeCertId` is set and ≠ `window.CURRENT_CERT`, it drops a full-screen upsell wall. The lock value is claimed at the onboarding cert-pick confirm (or, as a fallback, the single cert a free user already has study data on) and persisted in `profile.metadata.freeCertId` via cloud-store. Admin/Pro/anonymous/owned-cert pass through. Fails **open**.

**Tech Stack:** Vanilla JS (no build), `window.certanvilRouter` (tier), `window.certanvilSupabase` (via cloud-store), `dg-system.css` forged-bronze tokens, UAT (`tests/uat.js`) + live-verify.

**Spec:** `docs/superpowers/specs/2026-06-07-free-tier-cert-lock-design.md`. **Lane:** GATED (touches `cloud-store.js`). No DB migration (reuses `profiles.metadata`).

**Testing note (repo reality):** no unit harness — `tests/uat.js` does structural + VM-behavioral assertions over source, plus mandatory live-verify. "Tests" below mean that, not red/green TDD.

**HARD RULE — skill discipline (spec §Required skills):** the wall is a NEW UI surface → Task 6 runs `design-taste-frontend` → `emil-design-eng` → `humanizer` + the `onboarding` lens. Ship via `ship` + `SHIP_CHECKLIST.md`. Use `verification-before-completion` before done; `systematic-debugging` if anything misbehaves.

---

## Verified wiring points (file:line)

- **Cert id list (canonical):** `app.js:150-158` `detectCert()` — `netplus, secplus, az900, ai900, aplus-core1, aplus-core2, sc900, clfc02`. `window.CURRENT_CERT` set `app.js:161-173`.
- **Cert→host (existing, inline switch):** `auth-state.js:235-246` inside `tadSwitchCert` (`secplus→secplus`, `az900→azure`, `ai900→ai`, `sc900→sc900`, `clfc02→clfc02`, else `networkplus`). Canonical full list incl. aplus query-params lives in `landing/auth.js`. **Plan extracts a shared `certHost()` into `router.js`** so the wall and (optionally) the switcher share one map.
- **Auth-resolved hook:** `auth-state.js:536/576` call `window._onbRoute({isLoggedIn, profile})`; `_onbRoute` defined `onboarding-boot.js` with `if (!ENABLED) return;` inside. Profile shape `{ metadata, role, exam_date, display_name }` (`cloud-store.js:164`).
- **Firstrun confirm:** `lib/onboarding-firstrun.js` `onClick` `action==='confirm-cert'` → `goDiagnosticIntro()`; `state.certId` in module scope (`:31`).
- **Live Pro modal:** `app.js:785-810` `_showProOnlyUI({feature})` → card + `certanvil.com/pricing` CTA.
- **Script order:** `index.html` … `event-actions.js` → `lib/router.js` → `lib/onboarding-boot.js` → `lib/onboarding-firstrun.js` → `lib/onboarding-home.js` → `app.js`. Insert `lib/cert-lock.js` **after `lib/router.js`**.
- **SW precache:** `sw.js` `SHELL_ASSETS`. **Mirror the existing onboarding-module pattern** (Task 4 Step 4 checks whether `onboarding-boot.js` is precached and follows suit).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `lib/router.js` | Modify | Add pure `certHost(certId)` → full URL (all 8 certs). |
| `lib/cert-lock.js` | **Create** | The gate (`check`), `claimIfUnset`, and the wall (markup + show/hide). |
| `lib/onboarding-boot.js` | Modify | Call `_certLock.check(opts)` at top of `_onbRoute`, before the `ENABLED` guard. |
| `lib/onboarding-firstrun.js` | Modify | On `confirm-cert`: free users see a one-time lock confirmation; persist `freeCertId`. |
| `cloud-store.js` | Modify (gated) | Carry `nplus_freeCertId` → `metadata.freeCertId`; preserve it in `doFlush` so a non-hydrated subdomain flush can't drop it. |
| `dg-system.css` | Modify | `.cl-wall*` styles (forged-bronze, both themes, reduced-motion) — Task 6 design pass. |
| `index.html` | Modify | `<script defer src="lib/cert-lock.js">` after router. |
| `sw.js` | Modify (maybe gated) | Precache `lib/cert-lock.js` IFF onboarding modules are precached. |
| `tests/uat.js` | Modify | Structural + VM guards. |

**Shared names (use verbatim):** `window._certLock = { check, claimIfUnset }`; `certHost(certId)`; localStorage `nplus_freeCertId`; `profile.metadata.freeCertId`; CSS prefix `.cl-wall`.

---

## Task 1: `router.certHost()` — canonical cert→URL map

**Files:** Modify `lib/router.js` (add to the `api` object near `:109`).

- [ ] **Step 1: Add the helper inside the IIFE (before `var api = {`)**

```js
  // --- cert -> canonical URL (single source of truth for cross-subdomain nav) -
  // Mirrors the subdomain layout used by the Pro switcher (auth-state tadSwitchCert)
  // + landing/auth.js. Used by the cert-lock wall's "Back to your cert" button.
  var CERT_HOST = {
    netplus: 'https://networkplus.certanvil.com/',
    secplus: 'https://secplus.certanvil.com/',
    az900: 'https://azure.certanvil.com/',
    ai900: 'https://ai.certanvil.com/',
    sc900: 'https://sc900.certanvil.com/',
    clfc02: 'https://clfc02.certanvil.com/',
    'aplus-core1': 'https://aplus.certanvil.com/?exam=core1',
    'aplus-core2': 'https://aplus.certanvil.com/?exam=core2'
  };
  function certHost(certId) { return CERT_HOST[certId] || CERT_HOST.netplus; }
```

- [ ] **Step 2: Export it** — add `certHost: certHost,` to the `var api = { ... }` object.

- [ ] **Step 3: Verify + commit**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node --check lib/router.js && node -e "global.window={};require('./lib/router.js');console.log(window.certanvilRouter.certHost('secplus'), window.certanvilRouter.certHost('aplus-core2'), window.certanvilRouter.certHost('bogus'))"`
Expected: `https://secplus.certanvil.com/ https://aplus.certanvil.com/?exam=core2 https://networkplus.certanvil.com/`

```bash
git add lib/router.js && git commit -m "feat(cert-lock): router.certHost() canonical cert->URL map"
```

---

## Task 2: cloud-store carries `freeCertId` (gated)

**Files:** Modify `cloud-store.js` — `USER_DATA_KEYS` (~:67-113) and the `doFlush` merge (the `writeProfile`/`CERT_SCOPED` block).

Context: `freeCertId` is a single GLOBAL string (not cert-scoped). Adding the key makes `buildJsonbFromLocalStorage` map `nplus_freeCertId` → `metadata.freeCertId` via its generic path, and `applyJsonbToLocalStorage` writes it back via its generic path (the key is in `USER_DATA_KEYS`, not `TABLE_BACKED_KEYS`). The one hazard: `doFlush` does a full-metadata column replace from localStorage — if a subdomain flushes before hydrating `freeCertId`, the rebuilt jsonb omits it and the column write would DROP it. So we preserve it from the just-read existing metadata.

- [ ] **Step 1: Register the key** — after `'nplus_onb_skips',` (added in the prior onboarding ship; if absent, after `'nplus_lab_completions',`) add:

```js
    'nplus_freeCertId',  // free-tier cert lock: metadata.freeCertId (single global value)
```

- [ ] **Step 2: Preserve `freeCertId` in `doFlush`** — in the `writeProfile = function (existingMeta) {` block (the one with `CERT_SCOPED`), after the `CERT_SCOPED.forEach(...)` loop and before `var update = { metadata: jsonb };`, add:

```js
        // freeCertId is a single global value (not cert-scoped). If THIS flush's
        // localStorage didn't carry it (e.g. a subdomain that hasn't hydrated it),
        // keep the cloud value so the full-metadata replace can't drop the lock.
        if (jsonb.freeCertId == null && existingMeta && existingMeta.freeCertId != null) {
          jsonb.freeCertId = existingMeta.freeCertId;
        }
```

- [ ] **Step 3: Verify + commit**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node --check cloud-store.js && grep -c "nplus_freeCertId\|jsonb.freeCertId == null" cloud-store.js`
Expected: syntax OK; count `2`.

```bash
git add cloud-store.js && git commit -m "feat(cert-lock): cloud-sync freeCertId + preserve it on flush (no clobber)"
```

---

## Task 3: `lib/cert-lock.js` — the gate + claim + wall

**Files:** Create `lib/cert-lock.js`.

The wall markup here is FUNCTIONAL/minimal; Task 6 applies the 3-pass visual design. Reads tier via `certanvilRouter.getTier`, freeCertId from the passed profile, current cert from `window.CURRENT_CERT`. Fails open everywhere.

- [ ] **Step 1: Create the module**

```js
// lib/cert-lock.js — Free-tier cert lock (always-on; independent of the onboarding flag).
//
// A signed-in FREE user is locked to one cert (profile.metadata.freeCertId). If they
// open any other cert (cross-subdomain nav on web/Safari; native is account-first +
// has no URL bar), we drop a full-screen upsell wall. Admin/Pro/anonymous/owned-cert
// pass through. FAILS OPEN — a bug must never lock a real user OUT of the app.
//
// Spec: docs/superpowers/specs/2026-06-07-free-tier-cert-lock-design.md
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  function meta(profile) { return (profile && profile.metadata) || {}; }

  // Which certs does this user already have study data for? (readiness snapshot,
  // SR queue, or cert_results). Used by the fallback claim.
  function certsWithData(m) {
    var out = {};
    try {
      ['readiness_snapshots', 'readinessSnapshots', 'sr', 'cert_results', 'certResults', 'activated'].forEach(function (k) {
        var o = m[k];
        if (o && typeof o === 'object') { for (var c in o) { if (Object.prototype.hasOwnProperty.call(o, c)) out[c] = true; } }
      });
    } catch (_) {}
    return out;
  }

  function persistFreeCert(certId) {
    try {
      localStorage.setItem('nplus_freeCertId', certId);
      if (window.cloudStore && window.cloudStore.flush) window.cloudStore.flush('nplus_freeCertId');
    } catch (_) {}
  }

  // Fallback claim: a free user with NO freeCertId, whose ONLY cert-with-data is the
  // current one, claims it. (Multiple certs with data -> grandfathered, left unlocked.)
  function claimIfUnset(certId, profile) {
    try {
      if (!certId) return;
      var m = meta(profile);
      if (m.freeCertId) return;
      var data = certsWithData(m);
      var keys = Object.keys(data);
      if (keys.length === 1 && data[certId]) persistFreeCert(certId);
    } catch (_) {}
  }

  function check(opts) {
    try {
      opts = opts || {};
      if (!opts.isLoggedIn) return;                       // anonymous: not locked (spec §5)
      var R = window.certanvilRouter;
      if (!R || R.getTier(opts.profile) !== 'free') return; // pro/admin exempt
      var locked = meta(opts.profile).freeCertId || null;
      var here = window.CURRENT_CERT || null;
      if (!locked) { claimIfUnset(here, opts.profile); return; }
      if (here && here !== locked) showWall(locked);       // wrong cert -> wall
    } catch (_) { /* fail open */ }
  }

  // ── the wall ───────────────────────────────────────────────────────────────
  function certLabel(certId) {
    var L = { netplus: 'Network+', secplus: 'Security+', az900: 'Azure AZ-900', ai900: 'Azure AI-900',
      sc900: 'Security SC-900', clfc02: 'AWS CLF-C02', 'aplus-core1': 'A+ Core 1', 'aplus-core2': 'A+ Core 2' };
    return L[certId] || certId;
  }
  function showWall(ownedCert) {
    try {
      if (document.getElementById('cl-wall')) return;
      var R = window.certanvilRouter;
      var backUrl = (R && R.certHost) ? R.certHost(ownedCert) : '/';
      var hereLabel = certLabel(window.CURRENT_CERT);
      var ownedLabel = certLabel(ownedCert);
      var w = document.createElement('div');
      w.id = 'cl-wall';
      w.className = 'cl-wall';
      w.setAttribute('role', 'dialog');
      w.setAttribute('aria-modal', 'true');
      w.setAttribute('aria-label', ownedLabel + ' is part of Pro');
      w.innerHTML =
        '<div class="cl-wall-card">' +
          '<div class="cl-wall-mark" aria-hidden="true"></div>' +
          '<h2 class="cl-wall-title">' + hereLabel + ' is part of Pro</h2>' +
          '<p class="cl-wall-sub">You’re studying <strong>' + ownedLabel + '</strong> on the free plan. ' +
            'Free covers one exam at a time. Pro unlocks every exam and lets you switch anytime.</p>' +
          '<div class="cl-wall-actions">' +
            '<a class="cl-wall-cta" href="' + backUrl + '">Back to ' + ownedLabel + '</a>' +
            '<a class="cl-wall-pro" href="https://certanvil.com/pricing" target="_blank" rel="noopener">Unlock all exams · Pro</a>' +
          '</div>' +
        '</div>';
      document.body.appendChild(w);
      document.documentElement.classList.add('cl-locked');  // scroll-lock hook
    } catch (_) {}
  }

  window._certLock = { check: check, claimIfUnset: claimIfUnset };
})();
```

- [ ] **Step 2: Verify syntax + commit**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node --check lib/cert-lock.js && echo OK`
Expected: `OK`

```bash
git add lib/cert-lock.js && git commit -m "feat(cert-lock): cert-lock module — gate, fallback claim, upsell wall (functional)"
```

---

## Task 4: Wire-in — boot hook + script tag + precache

**Files:** Modify `lib/onboarding-boot.js`, `index.html`, `sw.js`.

- [ ] **Step 1: Call the gate at the top of `_onbRoute`** — in `lib/onboarding-boot.js`, find `window._onbRoute = function (opts) {` and its `if (!ENABLED) return;`. Insert the cert-lock call BEFORE that guard:

```js
  window._onbRoute = function (opts) {
    opts = opts || {};
    try { if (window._certLock) window._certLock.check(opts); } catch (_) {}  // always-on, pre-gate
    if (!ENABLED) return;
```

(If the existing first line already is `opts = opts || {};` below the guard, move the cert-lock call above the guard exactly as shown.)

- [ ] **Step 2: Add the script tag** — in `index.html`, immediately after the `lib/router.js` script line, add:

```html
<script defer src="lib/cert-lock.js"></script>
```

- [ ] **Step 3: Verify script order**

Run: `grep -noE '<script[^>]*src="lib/(router|cert-lock|onboarding-boot)\.js"' index.html`
Expected order: `lib/router.js` then `lib/cert-lock.js` then `lib/onboarding-boot.js`.

- [ ] **Step 4: Precache IFF the pattern matches** — check whether onboarding modules are precached:

Run: `grep -nE "onboarding-boot|lib/router" sw.js`
- If `lib/onboarding-boot.js`/`lib/router.js` ARE in `SHELL_ASSETS`: add `'./lib/cert-lock.js',` alongside them.
- If they are NOT precached: do nothing to `sw.js` (match the pattern — the file loads via stale-while-revalidate; the per-deploy `CACHE_NAME` bump busts it). Note the choice in the commit message.

- [ ] **Step 5: Syntax + commit**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node --check lib/onboarding-boot.js && (grep -q cert-lock sw.js && node --check sw.js; true)`

```bash
git add lib/onboarding-boot.js index.html sw.js 2>/dev/null; git commit -m "feat(cert-lock): wire gate into _onbRoute (pre-ENABLED, always-on) + load order"
```

---

## Task 5: Firstrun — claim `freeCertId` + one-time confirmation

**Files:** Modify `lib/onboarding-firstrun.js` — `onClick` `confirm-cert` branch (~:263).

For a FREE user, `confirm-cert` shows a one-time confirmation, then persists `freeCertId` and proceeds. Pro users (not locked) skip the confirmation and just proceed.

- [ ] **Step 1: Add a persist helper** near the other helpers (e.g. beside `writeActivation` from the prior ship):

```js
  function persistFreeCert(certId) {
    try {
      if (!certId) return;
      localStorage.setItem('nplus_freeCertId', certId);
      if (window.cloudStore && window.cloudStore.flush) window.cloudStore.flush('nplus_freeCertId');
    } catch (_) {}
  }
```

- [ ] **Step 2: Update the `confirm-cert` branch** — replace:

```js
    } else if (action === 'confirm-cert') {
      goDiagnosticIntro();
```

with:

```js
    } else if (action === 'confirm-cert') {
      // Free tier locks to this cert. Pro is not locked -> proceed straight through.
      var isFree = (state.tier !== 'pro');
      if (isFree && !t.getAttribute('data-fr-confirmed')) {
        if (!window.confirm(certName(state.certId) + ' will be your free exam. On the free plan you study one exam at a time — Pro unlocks all of them and lets you switch. Continue with ' + certName(state.certId) + '?')) return;
        persistFreeCert(state.certId);
      }
      goDiagnosticIntro();
```

(`certName(certId)` — reuse the existing cert-name lookup in firstrun if present; otherwise add a tiny local map mirroring `certLabel` in cert-lock.js. Confirm during implementation which exists.)

- [ ] **Step 3: Syntax + commit**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node --check lib/onboarding-firstrun.js`

```bash
git add lib/onboarding-firstrun.js && git commit -m "feat(cert-lock): firstrun claims freeCertId on confirm (free only) + one-time confirm"
```

> Note: `window.confirm` is a placeholder for the commitment beat; Task 6 may replace it with an in-flow themed confirm card if the design pass prefers. The persist call is the load-bearing part.

---

## Task 6: The wall — mandatory 3-pass design (HARD RULE)

**Files:** Modify `dg-system.css` (`.cl-wall*`), and refine the wall markup in `lib/cert-lock.js` as the passes dictate.

The wall must match the existing onboarding surfaces: forged-bronze, Fraunces + Inter, light-primary + dark, reduced-motion gated, real CertAnvil monogram (`design/brand/logo.svg`), zero em-dashes.

- [ ] **Step 1: Invoke `design-taste-frontend`** on the wall — establish the visual direction (layout, type scale, the monogram mark, the two-button hierarchy: primary = Back to your cert, secondary = Pro), grounded in `dg-system.css` tokens + the existing `onboarding-*` mockups.
- [ ] **Step 2: Invoke `emil-design-eng`** — polish: entrance motion (reduced-motion-gated), focus management (trap focus in the dialog, return on dismiss), backdrop, scroll-lock via `.cl-locked`, button states, dark-theme parity.
- [ ] **Step 3: Invoke `humanizer`** on all wall copy — remove AI tells, zero em-dashes, honest framing ("Pro unlocks every exam," never a pass guarantee).
- [ ] **Step 4: Invoke the `onboarding` lens** — verify the wall reads as the "wanting a 2nd cert" conversion moment (not a punitive dead-end): clear path back to their cert, honest Pro value.
- [ ] **Step 5: Live-verify the wall visually** (localhost — see Task 8): both themes, reduced-motion, mobile width; screenshot.
- [ ] **Step 6: Commit**

```bash
git add dg-system.css lib/cert-lock.js && git commit -m "feat(cert-lock): wall 3-pass design (taste -> emil -> humanizer) + onboarding lens"
```

---

## Task 7: UAT guards (structural + VM behavioral)

**Files:** Modify `tests/uat.js` — add near the onboarding/cloud cert-keying section (grep `onb gate` / `cloud cert-keying`).

- [ ] **Step 1: Add assertions**

```js
  // ── Free-tier cert lock ───────────────────────────────────────────────────
  test('cert-lock: router.certHost maps all 8 certs + defaults to networkplus',
    (() => { const r = read('lib/router.js'); return /CERT_HOST\s*=/.test(r) && /aplus\.certanvil\.com\/\?exam=core2/.test(r) && /certHost:\s*certHost/.test(r); })());
  test('cert-lock: module exposes _certLock.check + claimIfUnset, fails open (try/catch)',
    (() => { const c = read('lib/cert-lock.js'); return /window\._certLock\s*=\s*\{\s*check/.test(c) && /claimIfUnset/.test(c) && /fail open/i.test(c); })());
  test('cert-lock: gate exempts pro/admin + anonymous, walls wrong cert',
    (() => { const c = read('lib/cert-lock.js'); return /getTier\(opts\.profile\)\s*!==\s*'free'/.test(c) && /!opts\.isLoggedIn/.test(c) && /here\s*!==\s*locked/.test(c); })());
  test('cert-lock: _onbRoute calls _certLock.check BEFORE the ENABLED guard (always-on)',
    (() => { const b = read('lib/onboarding-boot.js'); const i = b.indexOf('_certLock'); const g = b.indexOf('if (!ENABLED) return;'); return i > -1 && g > -1 && i < g; })());
  test('cert-lock: cloud-store carries nplus_freeCertId + preserves it on flush',
    (() => { const c = read('cloud-store.js'); return /'nplus_freeCertId'/.test(c) && /jsonb\.freeCertId == null && existingMeta && existingMeta\.freeCertId/.test(c); })());
  test('cert-lock: firstrun persists freeCertId on confirm-cert for free users',
    (() => { const f = read('lib/onboarding-firstrun.js'); return /persistFreeCert/.test(f) && /nplus_freeCertId/.test(f); })());
  test('cert-lock: index.html loads cert-lock.js after router.js, before app.js',
    (() => { const h = read('index.html'); return h.indexOf('lib/router.js') < h.indexOf('lib/cert-lock.js') && h.indexOf('lib/cert-lock.js') < h.indexOf('src="app.js"'); })());
  // VM behavioral: the gate decision
  test('cert-lock: vm — free+wrong cert walls; owned/pro/anon/unset do not',
    (() => {
      try {
        const c = read('lib/cert-lock.js');
        const vm = require('vm');
        const walls = [];
        const router = { getTier: (p) => (p && p.role === 'admin') || (p && p.metadata && p.metadata.tier === 'pro') ? 'pro' : 'free', certHost: () => 'x' };
        const mkCtx = (cert) => ({ window: { certanvilRouter: router, CURRENT_CERT: cert, cloudStore: { flush(){} }, _certLock: null },
          document: { getElementById: () => null, createElement: () => ({ setAttribute(){}, classList:{add(){}} , style:{} }), body: { appendChild: (el) => walls.push(el) }, documentElement: { classList: { add(){} } } },
          localStorage: { setItem(){} }, Object: Object });
        function run(cert, opts) { const ctx = mkCtx(cert); ctx.window._certLockTest = opts; vm.createContext(ctx);
          vm.runInContext(c + '\nwindow._certLock.check(_certLockTest);', ctx); }
        const before = walls.length;
        run('secplus', { isLoggedIn: true, profile: { role: 'user', metadata: { freeCertId: 'netplus' } } });   // free, wrong -> WALL
        const afterWrong = walls.length;
        run('netplus', { isLoggedIn: true, profile: { role: 'user', metadata: { freeCertId: 'netplus' } } });   // owned -> no wall
        run('secplus', { isLoggedIn: true, profile: { role: 'admin', metadata: {} } });                          // admin -> no wall
        run('secplus', { isLoggedIn: false });                                                                    // anon -> no wall
        run('secplus', { isLoggedIn: true, profile: { role: 'user', metadata: {} } });                           // unset -> no wall
        return (afterWrong === before + 1) && (walls.length === afterWrong);
      } catch (e) { return false; }
    })());
```

(Match `read`/`test` to the file's actual helpers — confirmed present from the prior onboarding ship.)

- [ ] **Step 2: Run UAT**

Run: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" && node tests/uat.js 2>&1 | tail -4`
Expected: ALL PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/uat.js && git commit -m "test(cert-lock): structural + VM behavioral guards for the gate"
```

---

## Task 8: Live-verify (localhost — never prod writes)

**Files:** none.

- [ ] **Step 1: Serve the worktree** — `python3 -m http.server 3131` (or the existing preview server on this worktree). All localStorage writes below are localhost-only (data-safety rule).
- [ ] **Step 2: Gate behavior** via preview/eval, simulating each case by setting `window.CURRENT_CERT` + calling `window._certLock.check(...)` with a stub profile (do NOT walk real signed-in flows on prod):
  - free + `freeCertId:'netplus'` + `CURRENT_CERT='secplus'` → `#cl-wall` appears.
  - free + owned (`secplus`==`freeCertId`) → no wall.
  - `role:'admin'` → no wall. `isLoggedIn:false` → no wall. `freeCertId` unset → no wall.
- [ ] **Step 3: Wall UX** — confirm [Back to <cert>] href = `certHost(ownedCert)`, [Unlock all exams · Pro] → pricing; both themes; reduced-motion; mobile width; screenshot for the record.
- [ ] **Step 4: `verification-before-completion`** — confirm each spec success-criterion is demonstrably met before calling it done.

---

## Task 9: Ship (gated lane) — `ship` + SHIP_CHECKLIST

**Files:** version bump surfaces.

- [ ] **Step 1: Invoke the `ship` skill** and walk `SHIP_CHECKLIST.md` (gated lane: `cloud-store.js`).
- [ ] **Step 2: Version bump** — `node scripts/bump-version.js 7.33.0 "Free-tier cert lock — locked to one cert until Pro (web + native)"`; then manually bump `dg-system.css?v=` in `index.html`; re-read CLAUDE.md.
- [ ] **Step 3: UAT green** after bump (version consistency).
- [ ] **Step 4: PR** off `feat/free-cert-lock` → CI + Vercel preview (no DB migration to run). Smoke the preview in a real browser (both themes, the gate, the wall). 
- [ ] **Step 5: Squash-merge** after CI green + self-sign-off → prod deploy. Post-deploy: confirm a free stub is walled on a non-owned cert via `?onb=1`-independent path (the lock is always-on); confirm admin (you) is unaffected.

---

## Self-Review

- **Spec coverage:** lock value in metadata (Task 2) ✓; always-on gate independent of onboarding flag (Task 4 Step 1 — pre-ENABLED) ✓; claim on pick + confirm (Task 5) ✓; fallback claim = single cert-with-data (Task 3 `claimIfUnset`) ✓; wall + back + Pro (Task 3 + 6) ✓; anonymous/pro/admin exempt (Task 3 `check`) ✓; fails open (try/catch throughout) ✓; gated lane, no migration (Task 9) ✓; **3-pass design hard rule (Task 6)** ✓; superpowers process + ship + debugging (header + Tasks 6/9) ✓.
- **Placeholder scan:** `window.confirm` in Task 5 is explicitly flagged as a replaceable commitment-beat placeholder (the persist is the real part); `certName`/`certLabel` reuse is a confirm-during-impl note, not a gap. sw.js precache is a conditional (match existing pattern), not a TODO.
- **Name consistency:** `_certLock.check/claimIfUnset`, `certHost`, `nplus_freeCertId`, `metadata.freeCertId`, `.cl-wall`, `CURRENT_CERT` — identical across Tasks 1-8 ✓.
- **Risk:** only data-loss-adjacent change is `cloud-store.js` (Task 2); mitigated by the `freeCertId` preservation in `doFlush` + UAT assertion + preview smoke. The gate fails open, so a logic bug degrades to "no wall," never "locked out."
