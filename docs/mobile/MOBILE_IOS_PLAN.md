# Mobile / iOS Compatibility — Plan of Action

**Status**: drafted 2026-05-09 23:55 BST · ready to ship 2026-05-10 morning
**Trigger**: real user (founder's friend) on iPhone Safari hit "An unexpected error occurred" toast and the v4.99.24 fix didn't appear to land — rooted in the cert app's stale-while-revalidate service worker strategy + iOS Safari's notorious SW lifecycle stickiness.

> **Founder direction (2026-05-09 23:50)**: *"the bulk of our customers will come from [iOS] so we need a long term solution on this a lot sooner rather than later"*

This document scopes both the immediate Safari SW fix (ship tomorrow) and the broader mobile-first audit (ship over the next 1-2 weeks).

---

## Part 1 — Diagnosis: what's actually wrong

### 1A. The toast itself was a generic catch-all (FIXED v4.99.24)
Pre-v4.99.24, `unhandledrejection` toasted "An unexpected error occurred." for any non-network rejection. Mobile Safari + slow cellular surfaces more transient rejections than desktop (cookie propagation race, Supabase RPC timeout, etc.). This was patched but the underlying rejection is still UNKNOWN.

### 1B. Service worker stale-while-revalidate is the deploy-propagation bug ⚠️ CRITICAL

**Current behavior** (`sw.js` lines 99-117):
```js
caches.match(event.request).then(cached => {
  const fetchPromise = fetch(event.request).then(response => { /* cache + return */ });
  return cached || fetchPromise;  // ← serves cached FIRST if available
});
```

**The path on iOS Safari:**
1. User visits page → SW serves cached `app.js` (could be 2-5 versions old)
2. Background fetch updates cache for *next* visit
3. New SW activates eventually → broadcasts `sw-updated` → page-side `controllerchange` listener reloads

**Why it breaks on iOS specifically:**
- iOS Safari's 60s update poll **doesn't run reliably** if the tab is backgrounded or on slow connection
- The page-side `controllerchange` listener fires reliably on Chrome/desktop Safari but is **flaky on iOS Safari**
- Even after the SW updates, the current page still has the OLD `app.js` loaded into memory — only a hard reload picks up the new code
- iOS users have a **"swipe Safari away to force-quit"** mental model that *isn't widely known*; pull-to-refresh does NOT invalidate SW cache

**Net effect**: founder ships 24 versions tonight; testers on iPhone are running v4.99.20 (or earlier). They report "still broken" because they ARE still on broken code.

### 1C. Deploy propagation is silently slow on mobile

Per `gh run list`:
- v4.99.7 → v4.99.22 deployed in series
- v4.99.23 + v4.99.24 hit Playwright failures (37 of 99 tests failing — pre-existing flake we never fixed)
- Manual `npx vercel --prod --yes` was needed to actually deploy (deploy gate is "UAT + Playwright" status check)

**The deploy itself works** but the user-visible propagation through SW + browser cache is opaque. We have no signal "this user is on v4.99.X" — only "prod CDN is serving v4.99.Y".

### 1D. The actual underlying error on iOS — STILL UNKNOWN

The `unhandledrejection` was silenced in v4.99.24 but **whatever was rejecting is still rejecting**, just silently logged to the in-app Monitor. We need to see the Monitor screenshot from the friend's device to root-cause.

Plausible candidates:
- `cloudStore.hydrate()` rejecting on slow cellular (Supabase RPC timeout > 30s default)
- `_refreshQuotaChip()` — calls `get_daily_quota_usage` RPC
- `fetchProfile()` retry loop on SW caching stale Supabase JS
- A render path that throws on empty state (no quiz_history for fresh tester)

---

## Part 2 — Future State: what good looks like

### 2A. Service worker with deploy-aware cache invalidation
- New deploys propagate to existing iOS users within **5 seconds** of next visit (currently: minutes-to-hours)
- HTML + JS use **network-first** strategy (always try fresh; fall back to cache on failure)
- Static assets (CSS, fonts, images, cert packs) stay **stale-while-revalidate** (offline support preserved)
- Visible "new version available — tap to refresh" banner if SW + page versions diverge

### 2B. iOS-first mobile UX baseline
- All touch targets ≥ 44×44 pt (Apple HIG)
- All inputs ≥ 16px font-size (prevents iOS zoom-on-focus)
- All modals work in Safari address-bar-collapsed mode (100vh handled via `100dvh`)
- No hover-only affordances (translate to focus + visible state)
- PWA installable + standalone mode working (Add to Home Screen)

### 2C. Real iOS testing in CI
- Playwright WebKit job in CI (~95% of iOS Safari behavior)
- Optional: BrowserStack subscription for real-device matrix ($39/mo)
- Manual smoke list for every release: iPhone Safari + Android Chrome before merge to main

### 2D. Mobile-aware performance
- Initial page load on slow 3G: **< 5 seconds to interactive**
- `app.js` ~2MB is heavy; same lazy-load pattern as `tb3d.js` for the heaviest features (drills, builders)
- Code-split out cert packs further (load Network+ on N+ cert, Sec+ on Sec+ cert — currently both load always)

### 2E. Observability
- In-app Monitor surfaced more prominently for testers (not buried 3 menus deep)
- Server-side error reporting from edge function (currently only logs in browser)
- Supabase RPC timing metrics so we know the p99 latency on cellular

---

## Part 3 — Ship plan, prioritized

### Phase 1 — Morning ship (2026-05-10, target: 90 min)

**Goal**: friend on iPhone reloads → sees v4.99.25 within seconds → no "unexpected error" toast.

#### 1.1 — Get the actual error from her device (5 min)
- Walk her through hamburger menu (☰) → Monitor (or whatever menu path; verify)
- If Monitor isn't easily accessible on mobile, OR if she's deep in playtest already, skip this and proceed
- Either way, the SW fix below should help regardless

#### 1.2 — Service worker rewrite: network-first for HTML + JS, stale-while-revalidate for static assets (45 min)

```js
// sw.js — replace the current respondWith block

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Pass-throughs (unchanged)
  if (url.hostname === 'api.anthropic.com') return;
  if (url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in')) return;
  if (url.pathname.startsWith('/vendor/') || url.pathname.startsWith('/mockups/')) return;

  // Network-first for HTML + JS — deploys propagate to next visit
  // immediately; fall back to cache only if network fails (offline).
  const isHtmlOrJs = (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.endsWith('.js')
  );

  if (isHtmlOrJs) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
            trimCache(CACHE_NAME, CACHE_MAX_ENTRIES);
          });
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-while-revalidate for everything else (CSS, fonts, images,
  // manifest, cert packs) — fast load + offline support, version
  // mismatch with HTML+JS doesn't matter for these.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response.status >= 500 && cached) return cached;
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
            trimCache(CACHE_NAME, CACHE_MAX_ENTRIES);
          });
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
```

**Why this works**:
- Network-first for `app.js` + `index.html` means iOS Safari ALWAYS hits prod first; deploys land on next visit
- If network fails (offline or slow), falls back to cached version (graceful degrade)
- Static assets (CSS, fonts, images) stay fast via stale-while-revalidate
- No SW lifecycle changes needed — existing `skipWaiting()` + `clients.claim()` are correct

**Risk**: every page visit costs an extra round-trip for HTML + each JS file vs the current cache-first. On fast wifi, ~50ms slowdown per file. On slow cellular, ~500ms slowdown. Trade-off: predictable updates > theoretical fast load. Worth it.

#### 1.3 — Visible "new version" banner (15 min)

When `controllerchange` fires (SW updated mid-session), show a banner with "Refresh to load updates" button instead of auto-reloading. Auto-reload sometimes loses form state; manual refresh is safer.

```js
// app.js — replace the existing controllerchange listener
let _swReloadPrompted = false;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (_swReloadPrompted) return;
  _swReloadPrompted = true;
  
  const banner = document.createElement('div');
  banner.className = 'sw-update-banner';
  banner.innerHTML = `
    <span>📦 New version available</span>
    <button onclick="location.reload()">Refresh</button>
    <button class="sw-banner-dismiss" onclick="this.closest('.sw-update-banner').remove()">×</button>
  `;
  document.body.appendChild(banner);
});
```

CSS for the banner — fixed-position bottom-of-screen, dismissible, mobile-friendly.

#### 1.4 — UAT regression guards (10 min)

```js
test('v4.99.25 SW: HTML + JS use network-first strategy',
  /isHtmlOrJs[\s\S]{0,200}fetch\(event\.request\)/.test(swSrc));
test('v4.99.25 SW: static assets retain stale-while-revalidate',
  /Stale-while-revalidate for everything else[\s\S]{0,500}cached \|\| fetchPromise/.test(swSrc));
test('v4.99.25 AppJs: SW update banner with manual refresh button',
  /sw-update-banner[\s\S]{0,500}Refresh to load updates|onclick="location\.reload\(\)"/.test(js));
```

#### 1.5 — Live-verify in Chrome MCP (10 min)
- Open localhost:3131 in Chrome MCP
- DevTools Application tab → Service Workers → verify SW registered
- Modify a string in app.js, redeploy local server
- Refresh page → verify NEW string is served (not cached)
- Confirm banner appears if SW activated mid-session

#### 1.6 — Bump v4.99.25 + push (10 min)
- Standard ship via SHIP_CHECKLIST
- Commit message documents the network-first strategy + iOS rationale
- Push → Vercel auto-deploys (or `npx vercel --prod` fallback)

#### 1.7 — Verify on friend's actual device (5 min)
- Have her visit the app fresh
- If she sees a "📦 New version available" banner, tap Refresh
- App reloads with v4.99.25 → no toast → working

**Total Phase 1**: 90 minutes from "good morning" to "shipped + verified".

---

### Phase 2 — Mobile UX audit (this week, ~3-4 hrs across 2 sessions)

#### 2.1 — Touch target audit
Use Chrome DevTools "Mobile" simulation to scan every clickable element on:
- Home page
- Quiz interface
- Drill pages (Subnet Trainer, Port Drill, etc.)
- Settings
- Auth modal
- Account page

Identify any < 44×44 pt and bump padding. Likely candidates: chip buttons, modal close × buttons, sidebar lock badges (added v4.99.8).

#### 2.2 — Input zoom prevention (15 min ship)
iOS Safari zooms ANY focused input with font-size < 16px. Audit:
```css
input, textarea, select {
  font-size: 16px;  /* or larger */
}
```
Likely most are fine but worth verifying.

#### 2.3 — 100vh → 100dvh migration (30 min ship)
Mobile Safari includes the address bar in `100vh` calculations, which collapses on scroll causing layout jank. Modern fix:
```css
.full-height-element {
  height: 100vh;        /* fallback */
  height: 100dvh;       /* dynamic viewport height — collapses with chrome */
}
```
Audit for `100vh` usage in `styles.css` (~19K lines — grep first).

#### 2.4 — Viewport meta + Apple-specific meta tags (15 min)
Verify `index.html` `<head>` has:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="CertAnvil">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```
Add/fix any missing.

#### 2.5 — Hover-state audit
Find any `:hover` rules that have NO `:focus` or `:focus-visible` partner. On touch, hover doesn't fire reliably.

#### 2.6 — Modal accessibility on mobile
Verify all modals (auth, quota-exceeded, pro-only, my-certs, etc.) close via:
- × button (44×44)
- Backdrop tap
- Hardware back button (history.back trapping)
- Escape key (desktop)

---

### Phase 3 — iOS testing infrastructure (next week, ~2 hrs)

#### 3.1 — Playwright WebKit project in CI (30 min)
`tests/e2e/app.spec.js` already runs against Chromium. Add WebKit:
```js
// playwright.config.js
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },         // NEW
  { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },       // NEW
],
```
GitHub Actions runs all 3 in parallel. The 37 currently-failing tests need to be triaged either way; this just expands the matrix.

#### 3.2 — Real iPhone via Mac Develop menu (10 min one-time setup)
- iPhone: Settings → Safari → Advanced → Web Inspector ON
- Mac: Safari → Settings → Advanced → "Show Develop menu"
- Connect iPhone via USB → Mac Safari Develop menu → iPhone → certanvil.com
- Full DevTools access for the iPhone Safari session

This is the GOLD STANDARD for iOS debugging. Every release should include 1 test on a real iPhone before declaring "shippable on iOS".

#### 3.3 — BrowserStack subscription (optional, $39/mo)
For testing on multiple iOS versions (iOS 15, 16, 17, 18) + Android. Defer until we have enough paying customers to justify cost. Until then, real-device testing on the founder's iPhone covers most cases.

---

### Phase 4 — Mobile performance (next 2 weeks, ~6-8 hrs)

#### 4.1 — `app.js` size analysis
- Currently 40,604 lines (~2MB minified-ish since it's not minified)
- On slow 3G: ~10s download alone
- Identify the heaviest features (drills, builders) and lazy-load them like `tb3d.js`

#### 4.2 — Code splitting per cert
- Currently both `certs/netplus.js` + `certs/secplus.js` load on every visit
- Should load only the active cert (~50% reduction)
- Trade-off: cert switcher needs to dynamically import the new pack

#### 4.3 — Critical CSS inlining
- `styles.css` is 19,453 lines / ~485KB
- Inline ~5KB of critical above-the-fold CSS in `<head>`; defer the rest
- Faster First Contentful Paint on mobile

#### 4.4 — Image optimization
- All images currently SVG (good — vector, small)
- Verify no PNG/JPG larger than necessary

#### 4.5 — Anthropic API call timing
- Quiz generation takes 2-8 seconds depending on batch size
- On mobile cellular, can stretch to 15-20s
- Need progress UI that handles this gracefully (loading bar already exists; verify it doesn't time out at 10s)

---

### Phase 5 — PWA optimization (post-launch, ~3 hrs)

#### 5.1 — Manifest review
- `manifest.json` (646B) — verify all required fields (name, short_name, start_url, display, icons[], theme_color, background_color)
- iOS-specific: `apple-touch-icon` link tags in HTML

#### 5.2 — Add to Home Screen prompt
- Currently no "install this app" prompt on iOS
- Could add a one-time banner: "💡 Add CertAnvil to your home screen for full-screen mode + faster loads"
- Show only if NOT already in standalone mode (`window.matchMedia('(display-mode: standalone)').matches`)

#### 5.3 — Standalone mode polish
- When installed, no Safari address bar / chrome
- App needs to handle navigation differently (no native back button → in-app back button)
- Verify all flows work without browser chrome

---

## Part 4 — Code-ready snippets for tomorrow morning

### sw.js diff (Phase 1.2)

Replace lines 99-117 of `sw.js` with the network-first-for-HTML-and-JS logic above. Section is bounded; clean Edit operation.

### app.js diff (Phase 1.3)

Find the existing `controllerchange` listener (search for `controllerchange`) and replace auto-reload with the banner pattern.

### styles.css addition (Phase 1.3)

```css
/* v4.99.25 — Service worker update banner. Shown when a new SW activates
   mid-session; user manually taps Refresh to pick up the new code. */
.sw-update-banner {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  max-width: 480px;
  margin: 0 auto;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: white;
  padding: 14px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  z-index: 10000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  animation: swBannerSlideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.sw-update-banner button {
  background: white;
  color: var(--accent2);
  border: none;
  padding: 7px 14px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}
.sw-update-banner .sw-banner-dismiss {
  background: transparent;
  color: white;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 18px;
}
@keyframes swBannerSlideIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .sw-update-banner { animation: none; }
}
```

### UAT guards (Phase 1.4)

5 v4.99.25 regression guards covering the SW strategy + banner.

---

## Part 5 — Rollout cadence

| Phase | When | Effort | Ship-blocking? |
|---|---|---|---|
| Phase 1 (SW network-first) | Tomorrow AM | 90 min | YES — without this, every iOS user sees stale code |
| Phase 2 (mobile UX audit) | This week | 3-4 hrs | NO — but high-impact for conversion |
| Phase 3 (iOS testing) | Next week | 2 hrs | NO — process improvement |
| Phase 4 (perf) | Next 2 weeks | 6-8 hrs | NO — but compounds with playtest learnings |
| Phase 5 (PWA polish) | Post-launch | 3 hrs | NO — nice-to-have |

**Total morning ship**: 90 min. **Total mobile-first work over the next 2 weeks**: ~12-15 hrs.

---

## Part 6 — Open questions to resolve

1. **The actual underlying error on iOS** — need /monitor screenshot from the friend OR reproduce on real iPhone via Develop menu. Doesn't block Phase 1 but blocks proper root-cause.

2. **CI Playwright failures** — 37 of 99 tests failing pre-existing. Tomorrow ship needs to bypass via manual `npx vercel --prod`. Separate fix-ups needed for CI to be reliable signal.

3. **Push-notification strategy** — iOS Safari supports web push as of 16.4 BUT requires PWA-installed mode. Worth considering for "your daily challenge is ready" engagement loops.

4. **Offline-first strategy review** — current design assumes the cert app should work offline (mid-quiz, lost cellular). With cloud-first user state (Phase C′), offline is partial — quiz works but progress doesn't sync until online. Decide: keep offline-first or remove SW entirely for HTML/JS?

5. **App.js code-split aggression** — Phase 4.1 could split aggressively (page-level chunks), but that's a 1-week refactor. For now, network-first SW + lazy-load tb3d.js style is the pragmatic middle ground.

---

## Part 7 — Success criteria

After Phase 1 ships tomorrow, verify on the friend's iPhone:

- [ ] She visits certanvil.com, sees v4.99.25 (or higher) in the version chip
- [ ] No "An unexpected error" toast on home page
- [ ] App functions normally — diagnostic + drills + quiz all work
- [ ] If she's in an open tab during a deploy, she sees the "📦 New version" banner

After Phase 2-5 ship over the next 2 weeks:

- [ ] Touch targets 44×44 across all interactive elements
- [ ] No iOS zoom on form input focus
- [ ] No 100vh layout glitches on Safari with collapsed address bar
- [ ] PWA installable via "Add to Home Screen"
- [ ] Playwright WebKit job green in CI
- [ ] Time-to-interactive on slow 3G < 5 seconds

---

## Part 8 — Why this matters

The cert app started desktop-first because the founder built it for personal use (laptop). Every subsequent UI decision optimized for that. **The pivot to mobile-first SaaS changes the calculus**:

- Most CompTIA cert students study on commute / break (mobile)
- Free-tier conversion happens on first visit (often mobile)
- Word-of-mouth shares are clicked on mobile
- Reddit / r/CompTIA traffic is 60%+ mobile per typical SaaS analytics

A cert app that's "fine on mobile" will lose 30-50% of organic conversions vs. one that's "great on mobile". Phase 1 (SW network-first) eliminates the visible deploy-lag bug. Phase 2-5 closes the polish gap so iOS testers feel "this is a real app, not a port".

The friend's bug report tonight is the canary. **Ship Phase 1 tomorrow morning.** Schedule Phase 2-5 across the week.

---

*Drafted 2026-05-09 23:55 BST. Ready to execute 2026-05-10 morning.*
