# Onboarding Sandbox — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A single installable phone-framed page (`mockups/onboarding-sandbox.html`) that lets the founder tap through the live cert-lock wall + live first-run flow + the six design mockups on their iPhone 13 Pro Max, no accounts or flags.

**Architecture:** One self-contained static HTML file under `mockups/` (deploy-served). It loads the *real shipped* `../dg-system.css` + `../lib/{router,cert-lock,onboarding-firstrun}.js`, drives them with stub data, and iframes the static design mockups. Installable-app meta tags + safe-area CSS make Add-to-Home-Screen launch full-screen.

**Tech Stack:** Vanilla HTML/CSS/JS, the project's `dg-system.css` forged-bronze tokens, the live onboarding modules.

**Spec:** `docs/superpowers/specs/2026-06-07-onboarding-sandbox-design.md`. **Lane:** FAST (static `mockups/` only). No version bump. No UAT (UAT covers app source, not `mockups/` demos — verification is the browser walk).

**Grounded facts (verified):**
- First-run container: `<div id="onb-firstrun" class="onb-fr" hidden></div>`; `show()` just sets `hidden=false`; launched via `window.onbFirstRun.start(decision)`.
- Only global needing a stub: `window.showPage` (no-op). `CERT_PACK`/`EXAM_PASS_SCORE`/`cloudStore`/`startDiagnostic` are all guarded or intentionally absent (no-engine fallback → jumps to reveal screens with placeholder data).
- Cert-lock: `window._certLock.check({isLoggedIn,profile})` reads `window.CURRENT_CERT` + `profile.metadata.freeCertId`; renders `#cl-wall`.
- 7 design mockups live on `origin/worktree-onboarding-admin-tier` (not on `main`).
- Cert ids: `netplus, secplus, az900, ai900, aplus-core1, aplus-core2, sc900, clfc02`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `mockups/onboarding-{native-welcome,signup-signin,upgrade-sheet,free-capped-home,pro-welcome,my-certs-pro,rollout-flow}.html` | **Bring from old branch** | The 6 design screens (+rollout map) the sandbox iframes. |
| `mockups/onboarding-sandbox.html` | **Create** | The whole sandbox: app-shell meta, menu, theme toggle, live cert-lock control, live first-run launcher, mockup iframes. |

---

## Task 1: Bring the 7 design mockups into the branch

**Files:** 7 `mockups/onboarding-*.html` (from `origin/worktree-onboarding-admin-tier`).

- [ ] **Step 1: Check them out**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz/.claude/worktrees/onboarding-admin-tier"
git fetch origin --quiet
git checkout origin/worktree-onboarding-admin-tier -- \
  mockups/onboarding-native-welcome.html \
  mockups/onboarding-signup-signin.html \
  mockups/onboarding-upgrade-sheet.html \
  mockups/onboarding-free-capped-home.html \
  mockups/onboarding-pro-welcome.html \
  mockups/onboarding-my-certs-pro.html \
  mockups/onboarding-rollout-flow.html
```

- [ ] **Step 2: Verify all 7 present**

Run: `ls mockups/onboarding-{native-welcome,signup-signin,upgrade-sheet,free-capped-home,pro-welcome,my-certs-pro,rollout-flow}.html`
Expected: all 7 listed, no "No such file".

- [ ] **Step 3: Commit**

```bash
git add mockups/onboarding-native-welcome.html mockups/onboarding-signup-signin.html mockups/onboarding-upgrade-sheet.html mockups/onboarding-free-capped-home.html mockups/onboarding-pro-welcome.html mockups/onboarding-my-certs-pro.html mockups/onboarding-rollout-flow.html
git commit -m "docs(mockups): bring the 7 onboarding design mockups onto main (for the sandbox)"
```

---

## Task 2: Create the sandbox page (full file)

**Files:** Create `mockups/onboarding-sandbox.html`.

- [ ] **Step 1: Write the complete file**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CertAnvil Lab</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<!-- Installable app shell (iPhone 13 Pro Max: 428x926, notch + home-indicator safe areas) -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="CertAnvil Lab">
<meta name="theme-color" content="#1a1714">
<!-- monogram touch icon (forged-bronze tile) -->
<link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'%3E%3Crect width='180' height='180' rx='40' fill='%231a1714'/%3E%3Cg fill='none' stroke='%23c98a3c' stroke-width='12' stroke-linecap='round'%3E%3Cpath d='M104 38 C76 26, 34 42, 30 70 C26 98, 44 116, 78 118'/%3E%3Cline x1='58' y1='150' x2='126' y2='32' stroke='%238a8a8a'/%3E%3Cpath d='M82 156 L116 86 L150 156 M95 130 L137 130'/%3E%3C/g%3E%3C/svg%3E">
<link rel="stylesheet" href="../dg-system.css?v=sandbox">
<style>
  :root { color-scheme: light dark; }
  html, body { margin: 0; height: 100%; background: var(--bg, #111); }
  body { font-family: Inter, system-ui, sans-serif; color: var(--text, #eee); }
  /* phone frame: full-bleed on device, centered 428-wide column on desktop */
  .sbx-frame {
    position: relative; width: 100%; max-width: 428px; min-height: 100dvh;
    margin: 0 auto; background: var(--bg); overflow: hidden;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    box-sizing: border-box;
  }
  @media (min-width: 480px) { .sbx-frame { min-height: 926px; max-height: 96vh; margin-top: 2vh; border-radius: 44px; box-shadow: 0 30px 90px rgba(0,0,0,.4); border: 1px solid var(--border, #333); overflow-y: auto; } }
  .sbx-bar { display:flex; align-items:center; justify-content:space-between; padding:16px 18px 10px; }
  .sbx-brand { display:flex; align-items:center; gap:9px; font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:18px; color:var(--text); }
  .sbx-brand svg { width:26px; height:26px; }
  .sbx-theme { font:600 13px Inter,sans-serif; color:var(--accent); background:transparent; border:1px solid color-mix(in oklab,var(--accent) 30%,var(--border)); border-radius:999px; padding:7px 13px; cursor:pointer; }
  .sbx-intro { padding:4px 18px 14px; color:var(--text-dim); font-size:13.5px; line-height:1.5; }
  .sbx-group { padding:10px 18px 4px; font:700 11px Inter,sans-serif; letter-spacing:.08em; text-transform:uppercase; color:var(--text-dim); }
  .sbx-cards { display:flex; flex-direction:column; gap:9px; padding:4px 14px 18px; }
  .sbx-card { display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:var(--surface); border:1px solid var(--border); border-radius:15px; padding:15px 16px; cursor:pointer; color:var(--text); font:inherit; transition:transform .15s cubic-bezier(0.16,1,0.3,1); }
  .sbx-card:active { transform:scale(0.985); }
  .sbx-tag { margin-left:auto; font:600 10px Inter,sans-serif; padding:3px 8px; border-radius:999px; }
  .sbx-tag.live { color:#1c7a47; background:color-mix(in oklab,#1c7a47 16%,transparent); }
  .sbx-tag.design { color:var(--text-dim); background:color-mix(in oklab,var(--text) 10%,transparent); }
  .sbx-card-t { font-weight:600; font-size:15px; }
  .sbx-card-s { font-size:12.5px; color:var(--text-dim); margin-top:2px; }
  /* panels (full-frame overlays) */
  .sbx-panel { position:absolute; inset:0; background:var(--bg); display:none; flex-direction:column; z-index:50; }
  .sbx-panel.open { display:flex; }
  .sbx-panel-bar { display:flex; align-items:center; gap:10px; padding:calc(env(safe-area-inset-top) + 12px) 16px 12px; border-bottom:1px solid var(--border); }
  .sbx-back { font:600 14px Inter,sans-serif; color:var(--accent); background:none; border:none; cursor:pointer; padding:6px 4px; }
  .sbx-panel-title { font-weight:600; font-size:14px; color:var(--text); }
  .sbx-panel-body { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .sbx-panel-body iframe { width:100%; height:100%; border:0; display:block; }
  /* cert-lock control */
  .sbx-ctl { padding:22px 18px; display:flex; flex-direction:column; gap:14px; }
  .sbx-ctl label { font:600 12px Inter,sans-serif; color:var(--text-dim); display:block; margin-bottom:6px; }
  .sbx-ctl select { width:100%; font:500 15px Inter,sans-serif; color:var(--text); background:var(--surface); border:1px solid var(--border); border-radius:11px; padding:13px 12px; }
  .sbx-ctl .sbx-go { background:var(--accent); color:var(--bg); border:none; border-radius:13px; padding:15px; font:700 15px Inter,sans-serif; cursor:pointer; }
  .sbx-ctl .sbx-hint { font-size:12.5px; color:var(--text-dim); line-height:1.5; }
  #onb-firstrun.onb-fr[hidden] { display:none; }
</style>
</head>
<body>
<div class="sbx-frame" id="sbx-menu-frame">
  <div class="sbx-bar">
    <div class="sbx-brand">
      <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <path d="M58 12 C42 6, 16 16, 14 34 C12 52, 22 62, 42 64" class="sb-brand-c" stroke-width="7" stroke-linecap="round"/>
        <line x1="30" y1="84" x2="70" y2="16" class="sb-brand-slash" stroke-width="5" stroke-linecap="round"/>
        <path d="M46 88 L64 50 L82 88 M53 74 L75 74" class="sb-brand-a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      CertAnvil Lab
    </div>
    <button class="sbx-theme" id="sbx-theme">Dark</button>
  </div>
  <p class="sbx-intro">A sandbox to walk the onboarding flow. Green items are the real shipped code; tan items are the approved design mockups. Nothing here touches a real account.</p>

  <div class="sbx-group">Live &amp; interactive</div>
  <div class="sbx-cards">
    <button class="sbx-card" data-act="certlock"><span><span class="sbx-card-t">Cert-lock wall</span><span class="sbx-card-s">The free-tier lock. Pick a cert pairing.</span></span><span class="sbx-tag live">live</span></button>
    <button class="sbx-card" data-act="firstrun"><span><span class="sbx-card-t">First-run flow</span><span class="sbx-card-s">Lobby, diagnostic, the +movement aha, home.</span></span><span class="sbx-tag live">live</span></button>
  </div>

  <div class="sbx-group">Design mockups</div>
  <div class="sbx-cards" id="sbx-mock-cards"><!-- filled by JS --></div>

  <div class="sbx-group">The real app</div>
  <div class="sbx-cards">
    <button class="sbx-card" data-act="realapp"><span><span class="sbx-card-t">Open the live app</span><span class="sbx-card-s">The actual home chrome, with ?onb=1.</span></span><span class="sbx-tag design">link</span></button>
  </div>

  <!-- cert-lock control panel -->
  <div class="sbx-panel" id="sbx-panel-certlock">
    <div class="sbx-panel-bar"><button class="sbx-back" data-back>&larr; Menu</button><span class="sbx-panel-title">Cert-lock wall (live)</span></div>
    <div class="sbx-panel-body">
      <div class="sbx-ctl">
        <div><label for="sbx-owned">Free user is locked to</label><select id="sbx-owned"></select></div>
        <div><label for="sbx-visiting">and is now visiting</label><select id="sbx-visiting"></select></div>
        <button class="sbx-go" id="sbx-show-wall">Show the wall</button>
        <p class="sbx-hint">Pick two different certs to see the lock. Pick the same cert (their owned one) to confirm no wall appears. This calls the real <code>_certLock.check</code>.</p>
      </div>
    </div>
  </div>

  <!-- first-run panel (the module renders into #onb-firstrun) -->
  <div class="sbx-panel" id="sbx-panel-firstrun">
    <div class="sbx-panel-bar"><button class="sbx-back" data-back data-fr-close>&larr; Menu</button><span class="sbx-panel-title">First-run flow (live, placeholder data)</span></div>
    <div class="sbx-panel-body"><div id="onb-firstrun" class="onb-fr" hidden></div></div>
  </div>

  <!-- mockup iframe panel -->
  <div class="sbx-panel" id="sbx-panel-mock">
    <div class="sbx-panel-bar"><button class="sbx-back" data-back>&larr; Menu</button><span class="sbx-panel-title" id="sbx-mock-title">Design</span><span class="sbx-tag design" style="margin-left:auto">design</span></div>
    <div class="sbx-panel-body"><iframe id="sbx-mock-frame" title="design mockup"></iframe></div>
  </div>
</div>

<!-- real shipped modules (order: router -> cert-lock -> firstrun) -->
<script src="../lib/router.js"></script>
<script src="../lib/cert-lock.js"></script>
<script>window.showPage = function () {};  /* no-op stub: firstrun calls window.showPage('setup'); the sandbox has no app pages */</script>
<script src="../lib/onboarding-firstrun.js"></script>
<script>
(function () {
  'use strict';
  var CERTS = [
    ['netplus','Network+'],['secplus','Security+'],['az900','Azure AZ-900'],['ai900','Azure AI-900'],
    ['aplus-core1','A+ Core 1'],['aplus-core2','A+ Core 2'],['sc900','Security SC-900'],['clfc02','AWS CLF-C02']
  ];
  var MOCKS = [
    ['onboarding-native-welcome.html','Welcome','First screen on launch.'],
    ['onboarding-signup-signin.html','Sign up / Sign in','Account step.'],
    ['onboarding-upgrade-sheet.html','Pro upgrade sheet','The payment moment.'],
    ['onboarding-free-capped-home.html','Done for today','After declining Pro.'],
    ['onboarding-pro-welcome.html',"You're Pro",'Post-purchase celebration.'],
    ['onboarding-my-certs-pro.html','My Certs (Pro)','Every exam unlocked.'],
    ['onboarding-rollout-flow.html','Rollout flow map','Reference: the whole flow.']
  ];
  function $(id){ return document.getElementById(id); }

  // theme toggle
  var themeBtn = $('sbx-theme');
  function applyTheme(t){ document.documentElement.setAttribute('data-theme', t); try{ localStorage.setItem('sbx_theme', t); }catch(_){} themeBtn.textContent = t === 'light' ? 'Light' : 'Dark'; }
  themeBtn.addEventListener('click', function(){ var cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; applyTheme(cur); });
  try { applyTheme(localStorage.getItem('sbx_theme') || 'light'); } catch(_) { applyTheme('light'); }

  // populate cert dropdowns
  function fill(sel, def){ CERTS.forEach(function(c){ var o=document.createElement('option'); o.value=c[0]; o.textContent=c[1]; if(c[0]===def)o.selected=true; sel.appendChild(o); }); }
  fill($('sbx-owned'),'netplus'); fill($('sbx-visiting'),'secplus');

  // mockup cards
  var wrap = $('sbx-mock-cards');
  MOCKS.forEach(function(m){
    var b=document.createElement('button'); b.className='sbx-card'; b.setAttribute('data-mock', m[0]); b.setAttribute('data-mock-title', m[1]);
    b.innerHTML='<span><span class="sbx-card-t">'+m[1]+'</span><span class="sbx-card-s">'+m[2]+'</span></span><span class="sbx-tag design">design</span>';
    wrap.appendChild(b);
  });

  function openPanel(id){ var p=$(id); if(p) p.classList.add('open'); }
  function closePanels(){ ['sbx-panel-certlock','sbx-panel-firstrun','sbx-panel-mock'].forEach(function(id){ $(id).classList.remove('open'); }); }

  // delegated clicks
  document.addEventListener('click', function(e){
    var card = e.target.closest('[data-act]');
    if (card){
      var act = card.getAttribute('data-act');
      if (act==='certlock') openPanel('sbx-panel-certlock');
      else if (act==='firstrun') startFirstRun();
      else if (act==='realapp') window.open('/?onb=1','_blank');
      return;
    }
    var mock = e.target.closest('[data-mock]');
    if (mock){ $('sbx-mock-frame').src = mock.getAttribute('data-mock'); $('sbx-mock-title').textContent = mock.getAttribute('data-mock-title'); openPanel('sbx-panel-mock'); return; }
    if (e.target.closest('[data-back]')){ if (e.target.closest('[data-fr-close]') && window.onbFirstRun && window.onbFirstRun.close) { try{ window.onbFirstRun.close(); }catch(_){} } var f=$('sbx-mock-frame'); if(f) f.removeAttribute('src'); closePanels(); }
  });

  // cert-lock: drive the real module
  $('sbx-show-wall').addEventListener('click', function(){
    var owned=$('sbx-owned').value, visiting=$('sbx-visiting').value;
    var ex=document.getElementById('cl-wall'); if(ex) ex.remove(); document.documentElement.classList.remove('cl-locked');
    window.CURRENT_CERT = visiting;
    try { window._certLock.check({ isLoggedIn:true, profile:{ role:'user', metadata:{ freeCertId: owned } } }); } catch(_){}
    if (!document.getElementById('cl-wall')) { alert(owned===visiting ? 'No wall: this is their owned cert (correct).' : 'No wall rendered.'); }
  });

  // first-run: stub already set (window.showPage); start in mock mode
  function startFirstRun(){
    try { localStorage.setItem('onb_mock','1'); } catch(_){}
    openPanel('sbx-panel-firstrun');
    try { if (window.onbFirstRun && window.onbFirstRun.start) window.onbFirstRun.start({ certId:null, tier:'free', reason:'no-cert' }); } catch(_){}
  }
})();
</script>
</body>
</html>
```

- [ ] **Step 2: Lint the HTML (no broken script paths / unclosed tags)**

Run: `grep -c 'sbx-frame\|onb-firstrun\|_certLock' mockups/onboarding-sandbox.html`
Expected: ≥ 3 (sanity that the key hooks are present).

- [ ] **Step 3: Commit**

```bash
git add mockups/onboarding-sandbox.html
git commit -m "feat(sandbox): installable iOS onboarding sandbox (live lock + first-run + design mockups)"
```

---

## Task 3: Live-verify at iPhone 13 Pro Max size

**Files:** none.

- [ ] **Step 1: Serve + open at 428x926.** Use the worktree preview (or `python3 -m http.server 3131`). Resize the preview viewport to 428x926. Navigate to `mockups/onboarding-sandbox.html`.
- [ ] **Step 2: Walk each bucket (console must stay clean):**
  - Theme toggle flips light/dark; the menu + live wall recolor.
  - Cert-lock: owned=Network+, visiting=Security+ → Show wall → real `#cl-wall` appears ("Security+ is part of Pro", Back to Network+). Owned=visiting → alert "owned cert (correct)", no wall.
  - First-run: Start → walk lobby → pick a cert → diagnostic intro → (no-engine fallback) score reveal → +movement → habit → home. Back to Menu closes it.
  - Each design card opens its mockup in the iframe; Back returns.
  - "Open the live app" opens `/?onb=1` in a new tab.
- [ ] **Step 3: Screenshot** the menu (both themes) + the live wall + a first-run screen for the record.
- [ ] **Step 4: Confirm app-shell meta present**

Run: `grep -c 'apple-mobile-web-app-capable\|viewport-fit=cover\|apple-touch-icon' mockups/onboarding-sandbox.html`
Expected: `3`.

---

## Task 4: Ship (fast lane) + send the link

**Files:** none (push only).

- [ ] **Step 1: Push to main** (fast lane — static mockups only, no gated files, no version bump):

```bash
git push origin feat/onboarding-sandbox:main
```
(Pushes the current branch to remote `main`. Confirm branch first with `git branch --show-current`.)

- [ ] **Step 2: Confirm CI/deploy** — `gh run list --branch main --limit 2`; wait for "CI/CD — Test & Deploy" success.
- [ ] **Step 3: Smoke prod** — fetch `https://networkplus.certanvil.com/mockups/onboarding-sandbox.html` (via the code path, curl is sandboxed) and confirm it returns the sandbox HTML (contains `CertAnvil Lab` + `onb-firstrun`).
- [ ] **Step 4: Send the founder the URL:** `https://networkplus.certanvil.com/mockups/onboarding-sandbox.html` with the "Add to Home Screen" note.

---

## Self-Review

- **Spec coverage:** installable shell + safe areas (Task 2 meta + CSS) ✓; loads real shipped files (Task 2 script srcs) ✓; live cert-lock with cert pickers (Task 2 control + handler) ✓; live first-run via no-engine fallback + `showPage` stub (Task 2) ✓; 6 design mockups + rollout map iframed (Task 2 MOCKS) ✓; open-real-app button ✓; theme toggle ✓; unlinked + noindex ✓; bring 7 mockups to main (Task 1) ✓; fast lane, no bump (Task 4) ✓; 428x926 verify (Task 3) ✓.
- **Placeholder scan:** none — full file provided. The touch icon is an inline SVG data-URI (no external asset needed). The first-run app.js-coupling risk is handled by the `showPage` no-op stub + the verified no-engine fallback; if a leg still misbehaves, Task 3 catches it and the fix is another small stub.
- **Name consistency:** `#onb-firstrun.onb-fr`, `window.onbFirstRun.start/close`, `window._certLock.check`, `window.CURRENT_CERT`, `#cl-wall`, `data-act`/`data-mock`/`data-back`, `sbx-*` — consistent throughout.
- **Risk:** zero impact on the real app (separate unlinked static file; loads but does not mutate app state; writes only `onb_mock`/`sbx_theme` to the sandbox origin's localStorage, never `nplus_*`).
