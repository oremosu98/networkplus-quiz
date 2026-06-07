# Free-Tier Cert Lock — Design Spec (2026-06-07)

**Goal:** Hard-enforce the locked monetization boundary "free = ONE cert, locked to the user's pick; switching/other certs require Pro" across **web, Safari, and native** — replacing today's UI-only affordance that a free user can bypass by navigating directly to another cert's subdomain.

**Why now:** Founder direction (2026-06-07) — the onboarding flow's whole upsell premise ("Pro unlocks all exams + switching") is only real if the free limit is actually enforced. This unfreezes the **cert-access** slice of the `saas-gated` entitlements item [#136](https://github.com/oremosu98/networkplus-quiz/issues/136). Quota enforcement (the 15-new/5-review daily caps) stays frozen — separate follow-up.

---

## Locked decisions (founder, 2026-06-07)

1. **Scope:** cert-access lock only. Daily quota (15 new / 5 review) is **out of scope** today.
2. **Enforcement depth:** **app-level gate** (each cert app blocks on load). The lock value is stored **server-side** in the profile so it's authoritative across devices/subdomains and survives clearing browser data. Database-level RLS enforcement is **out of scope** (documented future hardening — the AI is BYOK, so there is no server cost to leak; the realistic threat is "free user studies a 2nd cert," which an app-level gate stops for all normal users).
3. **Lock-in moment:** on the onboarding cert-pick **confirm** (one-time "X will be your free exam — you study one exam at a time; Pro unlocks all. Continue?"). **Fallback** for users who never go through the onboarding pick: the first cert they have study data for claims the lock.
4. **Block UX:** an **upsell wall** — block the app on the non-owned cert; offer [Back to <owned cert>] + [Unlock all exams · Pro] (opens the existing upgrade-sheet surface). The wall IS the "wanting a 2nd cert" conversion moment named in `ONBOARDING_ACTIVATION_DECISIONS.md §4`.
5. **Anonymous users:** **not locked.** The lock is an account/tier concept needing a profile. Native launch is account-first; an anonymous web visitor has no account to monetize. Signing up is what locks them in.
6. **Timing:** **always-on as soon as it ships** — independent of the onboarding on/off flag. Harmless today (the only account is admin = exempt; no free users exist yet), and it gets real-world soak before the Apple launch instead of going live untested.

**Non-negotiable exemptions:** `router.getTier(profile) === 'pro'` (admin today via `role==='admin'`; real Pro later via #136) is **never** locked. Only `'free'` is locked.

---

## Architecture

### Data model
- **`profile.metadata.freeCertId`** = the free user's one locked cert id (e.g. `'netplus'`). Cloud-synced (same value on every subdomain + device). **Today it is never written** — `lib/router.js:74` only reads it. This build adds the write.
- Mirror key `localStorage 'nplus_freeCertId'` carried by cloud-store so it round-trips to `metadata.freeCertId` (it is a single global value, NOT cert-scoped — no per-cert merge needed, unlike `sr`/`activated`).

### Components (one responsibility each)

**1. `lib/cert-lock.js` (NEW) — the always-on gate + wall.**
- Exposes `window._certLock = { check(opts), claimIfUnset(certId, profile) }`.
- `check({ isLoggedIn, profile })` runs at the auth-resolved hook. Decision:
  ```
  if (!isLoggedIn) return;                          // anonymous: not locked (decision 5)
  var tier = certanvilRouter.getTier(profile);
  if (tier !== 'free') return;                      // pro/admin exempt
  var locked = (profile.metadata && profile.metadata.freeCertId) || null;
  if (!locked) { _certLock.claimIfUnset(window.CURRENT_CERT, profile); return; }
  if (window.CURRENT_CERT && window.CURRENT_CERT !== locked) showWall(locked);  // wrong cert -> wall
  ```
- `claimIfUnset(certId, profile)` (the **fallback** claim): only claims when `freeCertId` is unset AND this cert has prior study data for the user (a `metadata.readiness_snapshots[certId]`, `metadata.sr[certId]`, or quiz history for `certId`) AND no *other* cert has study data (legacy multi-cert users are grandfathered = left unlocked; practically nonexistent in a single-user app). Claiming writes `freeCertId` via the same persist path as the onboarding pick.
- Independent of the onboarding `ENABLED` flag — `cert-lock.js` is loaded and `check()` is called unconditionally (decision 6).

**2. `lib/onboarding-firstrun.js` (MODIFY) — primary claim + confirm.**
- At the cert-pick **confirm** action, before proceeding: show the one-time confirmation copy; on confirm, persist `freeCertId = state.certId` (localStorage `nplus_freeCertId` + `cloudStore.flush`), then continue the existing flow.

**3. `auth-state.js` (MODIFY, gated) — invoke the gate.**
- At the two auth-resolved points that already call `_onbRoute` (`:536` signed-in, `:576` anon), also call `window._certLock.check(...)`. The cert-lock check runs **first / independently** of onboarding routing: if it walls, onboarding routing for this cert is moot. (Anon path: `_certLock.check({isLoggedIn:false})` is a no-op.)

**4. `cloud-store.js` (MODIFY, gated) — carry `freeCertId`.**
- Add `'nplus_freeCertId'` to `USER_DATA_KEYS`. It is a plain string value → `buildJsonbFromLocalStorage` maps `nplus_freeCertId` → `metadata.freeCertId` with no special-casing (not cert-scoped). `applyJsonbToLocalStorage` writes it back on hydrate via the generic path.

**5. The wall (in `cert-lock.js` + `dg-system.css`).**
- Full-viewport block element injected over the cert app (forged-bronze tokens, light + dark, `prefers-reduced-motion` gated, real CertAnvil monogram). Copy: *"<BlockedCert> is part of Pro. You're studying <OwnedCert> on the free plan."*
- **[Back to <OwnedCert>]** → cross-subdomain navigation to the owned cert's URL. Reuses the **existing cert→subdomain map** the Pro cert switcher already uses for cross-origin nav (do NOT invent a new mapping — locate and reuse it during planning).
- **[Unlock all exams · Pro]** → opens the upgrade-sheet surface (informational; live purchase is Track B / payments, out of scope).

### Data flow
- **Claim (onboarding):** pick → confirm → `localStorage.nplus_freeCertId = certId` → `cloudStore.flush('nplus_freeCertId')` → debounced write to `profile.metadata.freeCertId`.
- **Claim (fallback):** authed free user, no `freeCertId`, lands on a cert they already have data for → `claimIfUnset` writes it.
- **Enforce:** auth resolves → `auth-state` passes `profile` to `_certLock.check` → reads `profile.metadata.freeCertId` (authoritative, just-fetched — no hydration race) → compares to `window.CURRENT_CERT` → wall if mismatch.

### Load order
`lib/router.js` → `lib/cert-lock.js` (new) → `lib/onboarding-boot.js` → … → `app.js`. `cert-lock.js` needs `certanvilRouter` (for `getTier`) so it loads after `router.js`. `window.CURRENT_CERT` (set in `app.js:171`) is available by the time the auth-resolved hook fires (well after boot). Add `cert-lock.js` to `index.html` script order **and** `sw.js` SHELL_ASSETS precache.

---

## Error handling / safety
- Every `_certLock` path is wrapped in try/catch and fails **open** (no wall) on any error — a bug must never lock a paying/again user out of the app. (Contrast with the gate's "fail closed = onboarding off"; here the safe failure is "don't wall.")
- The wall reads `profile` passed in, not localStorage, so a cleared cache cannot unlock a free user mid-session (re-hydrate restores `freeCertId`).
- Admin/Pro short-circuit is the first check after `isLoggedIn`.

## Edge cases
- **No `freeCertId` yet:** no wall (nothing claimed). Onboarding pick or the data-based fallback sets it.
- **Legacy free user with data on multiple certs:** grandfathered — not auto-locked (ambiguous which is "theirs"). Practically nonexistent (single-user admin app today).
- **Owned cert:** never walled.
- **Native (Capacitor lobby):** no URL bar → other subdomains are unreachable anyway; the wall is belt-and-suspenders there. The web/Safari direct-navigation hole is the real target.

## Out of scope (explicit)
- Daily quota enforcement (15 new / 5 review) — separate follow-up.
- Database/RLS-level cert gating — documented future hardening.
- Live Pro purchase/checkout — Track B (payments). The wall's Pro CTA is informational.
- Changing a free user's locked cert (no self-serve "switch my free cert" — that's the Pro upsell). Manual reset (founder, SQL) is the only change path for now.

## Surfaces touched + lane
- NEW: `lib/cert-lock.js`, wall styles in `dg-system.css`.
- MODIFY: `lib/onboarding-firstrun.js` (confirm + claim), `auth-state.js` (2 call lines — **gated**), `cloud-store.js` (1 key — **gated**), `index.html` (script tag + nothing else), `sw.js` (precache — **gated**).
- **GATED LANE** (touches `auth-state.js` + `cloud-store.js` + `sw.js`): feature branch → PR (branch DB + preview + CI) → smoke → squash-merge. Walk `SHIP_CHECKLIST.md`. No migration needed (uses existing `profiles.metadata`).

## Testing
- **UAT structural** (`tests/uat.js`): `cert-lock.js` exports `check`/`claimIfUnset`; admin/pro exemption present; `auth-state` calls `_certLock.check`; `cloud-store` carries `nplus_freeCertId`; `index.html` + `sw.js` include `cert-lock.js`.
- **UAT VM behavioral:** extract and run the `check` decision logic — assert: free+wrong-cert → wall; free+owned → no wall; admin/pro → no wall; anon → no wall; unset → no wall.
- **Live smoke (localhost / preview, never prod writes):** as a free stub (`metadata.tier` unset, `freeCertId='netplus'`) load a `secplus`-simulated context → wall; load `netplus` → no wall; admin → no wall.

## Success criteria
A signed-in free user with `freeCertId` set who opens any other cert (web/Safari/native) is blocked by the upsell wall and cannot study it; their owned cert and all Pro/admin users are unaffected; the lock survives cache-clear and works across subdomains and devices.
