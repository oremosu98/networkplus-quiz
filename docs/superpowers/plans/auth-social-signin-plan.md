---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# Social Sign-In Plan — Google + Apple (Supabase OAuth)

> **Status:** PLANNED — not started. Target implementation: **July 2026**.
> **Decision date:** 2026-06-03.
> **Owner:** Simi.
> **Scope:** Add Google + Apple sign-in to the existing Supabase auth, alongside
> the current magic-link + playtest-password flows. **No new backend.** No Better Auth.

---

## 0. TL;DR / the decision

We evaluated **Better Auth** (better-auth.com) for the auth work. Verdict: **don't adopt it.**

- Better Auth is a *backend* library — it needs a Node server runtime + a SQL DB and an
  `/api` route layer. Our app is a **static HTML/JS site on Vercel** with **no Node backend**.
  Adopting it means standing up infrastructure we don't have and rewriting every
  `supabase.auth.*` call into HTTP calls to Better Auth endpoints. That's a sideways
  migration that *adds* complexity and buys **no extra security** over what we already have
  (Supabase Auth + Postgres RLS).
- What we actually want — **per-user accounts + cloud-synced progress** (already done),
  **gated admin** (already done via `profiles.role` + `is_admin()` + RLS), **social login**
  (the real gap), and **keep it simple/cheap** (Supabase free tier, zero servers).
- **Google + Apple sign-in are a config + small-JS task on the auth stack we already run.**
  That's this plan.

**Why both Google AND Apple (not just Google):** App Store Review Guideline **4.8**. Once the
iOS app offers *any* third-party social login (Google), Apple **requires** a login option that
meets their privacy bar (collect only name + email, allow hide-my-email, no tracking without
consent). Google does not meet that bar; **Sign in with Apple does.** They ship as a pair.
Since iOS is the eventual goal, we build both now so the web flow is ready to carry into the
native wrap later.

---

## 1. Current auth — what exists today (so we extend, not replace)

Source of truth: `landing/auth.js` (the sign-in modal lives on `landing/index.html`).

- **Magic link** (public default): `sendMagicLink(email)` → `supabase.auth.signInWithOtp(...)`
  with `emailRedirectTo: buildRedirectUrl()` (`landing/auth.js:371`).
- **Playtest password** (5 tester accounts, hidden): `supabase.auth.signInWithPassword(...)`,
  gated by `?auth=password` URL param or `certanvil_auth_mode` localStorage flag
  (`landing/auth.js:210`, `:263`).
- **Session model:** Supabase JS client (`window.certanvilSupabase`, set by `landing/lib/supabase.js`)
  with a **cookie-backed storage adapter on `Domain=.certanvil.com`** so the session is shared
  across `certanvil.com` + all `*.certanvil.com` cert subdomains.
- **Return-URL plumbing (Phase C′):** cert apps route users to landing with
  `?action=signin&return=<url>`; `pendingReturnUrl` (`landing/auth.js:326`) +
  `buildRedirectUrl()` (`:363`) make the resulting session land on the right origin.
  **The OAuth flow must reuse this exact plumbing** (see §4.3).
- **State machine:** `onAuthStateChange` (`landing/auth.js:981`) handles `SIGNED_IN` /
  `TOKEN_REFRESHED` / `SIGNED_OUT`, renders the topbar pill, and does the post-sign-in bounce.
  OAuth sign-ins fire `SIGNED_IN` through this same listener — **no new state handling needed.**
- **Cert app side:** `auth-state.js` + `cloud-store.js` (cloud sync, `migrateLocalToCloud()`).
  Untouched by this work — OAuth produces the same Supabase session those modules already consume.

**Implication:** we add OAuth *buttons + two handlers* to the landing modal and *config* in the
Supabase + Google + Apple dashboards. Everything downstream (sync, RLS, admin gate, cert
personalization) already works off the resulting session.

---

## 2. Gated lane — this is a gated-lane change, not fast lane

Per `CLAUDE.md` → "Branching Strategy — Risk-Tiered": **auth changes go the gated lane.**
`lib/supabase.js`, `auth-state.js`, `cloud-store.js`, `sw.js` are explicitly gated; treat
`landing/auth.js` the same because it's auth.

**Flow:** feature branch → PR (auto-spins a Supabase branch DB + Vercel preview + CI) →
**smoke-test the preview** (OAuth round-trips against the preview URL) → squash-merge → prod.
Then run the post-deploy live-verify in `CLAUDE.md` (§"Post-deploy verification").

**Do NOT** local-quick-ship (`vercel --prod`) auth changes — they need the preview + Supabase
branch to test the OAuth redirect round-trip safely.

---

## 3. Phase G1 — Google sign-in (do this first; it's the simpler one)

### 3.1 Google Cloud Console (Simi — needs your Google account)
1. Create / select a project at <https://console.cloud.google.com>.
2. **APIs & Services → OAuth consent screen**: External, app name "CertAnvil", support email,
   logo, app domain `certanvil.com`, privacy-policy + ToS URLs. Add scopes `email`, `profile`,
   `openid`. Publish (or keep testing + add test users for now).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.**
   - **Authorized JavaScript origins:** `https://certanvil.com` (+ each cert subdomain you
     want the button to live on; at minimum the landing apex, since the modal is there).
   - **Authorized redirect URI:** the **Supabase callback** —
     `https://<PROJECT-REF>.supabase.co/auth/v1/callback`. (Get `<PROJECT-REF>` from the
     Supabase dashboard URL.)
   - Save the **Client ID** + **Client secret**.

### 3.2 Supabase dashboard
1. **Authentication → Providers → Google** → enable, paste Client ID + Client secret, save.
2. **Authentication → URL Configuration → Redirect URLs** — allow-list every origin a user can
   land back on. **This is the #1 thing people forget and it silently breaks the redirect.**
   Add, at minimum:
   - `https://certanvil.com/**`
   - `https://*.certanvil.com/**` (covers networkplus, secplus, azure, ai, aplus, sc900, clfc02)
   - `https://*.vercel.app/**` (so PR-preview round-trips work — required to test in the gated lane)
   - `http://localhost:3131/**` (local dev server from `CLAUDE.md`)

### 3.3 Code — `landing/index.html` (add the button to the modal)
Add inside the modal's `#auth-main` block (the magic-link form lives there), styled like the
existing CTAs. A divider ("or") between social buttons and the email form reads best.
```html
<!-- inside #auth-main, above or below #auth-form -->
<button type="button" id="auth-google" class="auth-social-btn">
  <!-- Google "G" SVG --> Continue with Google
</button>
```

### 3.4 Code — `landing/auth.js` (one handler, reusing existing plumbing)
Add near the other DOM refs + listeners. **Reuse `buildRedirectUrl()`** so the
`?action=signin&return=…` cross-origin plumbing keeps working:
```js
var authGoogleBtn = document.getElementById('auth-google');
if (authGoogleBtn) {
  authGoogleBtn.addEventListener('click', function () {
    clearAuthError();
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildRedirectUrl(),      // same return-URL logic as magic link
        queryParams: { prompt: 'select_account' }
      }
    }).then(function (r) {
      if (r && r.error) showAuthError(r.error.message || 'Google sign-in failed. Try again.');
      // success → browser redirects to Google, comes back, onAuthStateChange fires SIGNED_IN
    }).catch(function (err) {
      console.error('[certanvil-auth] google oauth threw:', err);
      showAuthError('Network error starting Google sign-in.');
    });
  });
}
```
- No change needed in `onAuthStateChange` — the return-from-Google fires `SIGNED_IN`, the
  existing listener renders the pill + does the `pendingReturnUrl` bounce.
- Verify `landing/lib/supabase.js` uses the **PKCE flow** (default in supabase-js v2) so the
  `?code=` round-trip is detected automatically. If `detectSessionInUrl` was disabled, re-enable
  for OAuth.

### 3.5 Service worker check (`sw.js`)
v7.13.1 already added cross-origin pass-through. **Confirm** the OAuth redirect hops
(`accounts.google.com`, the `*.supabase.co/auth/v1/callback`, and the `?code=` return) are not
intercepted/cached by the SW. If they are, pass them straight to network (mirror the Google
Fonts cross-origin fix). Re-test after any SW edit because cache name must bump.

### 3.6 G1 acceptance
- [ ] Google button on the landing modal starts the Google consent flow.
- [ ] After consent, user lands back signed in; topbar pill renders.
- [ ] `?action=signin&return=<cert-app-url>` round-trips: Google sign-in from a cert app bounces
      back to that cert app signed in.
- [ ] New Google user gets a `profiles` row (confirm the signup trigger fires for OAuth users,
      not just magic-link — check `supabase/migrations` signup trigger covers all providers).
- [ ] Existing magic-link user who signs in with Google on the **same email** is the **same
      account** (Supabase identity linking — verify it doesn't create a duplicate).
- [ ] Cloud progress (`cert_results`) shows for the Google-signed-in user.
- [ ] Admin still gated (sign in with a non-admin Google account → 403 on admin page).

---

## 4. Phase G2 — Apple sign-in (web flow now; native carries over later)

Apple is fiddlier than Google. Budget more time. The web OAuth flow is what we build now; the
native iOS button (§5) reuses the same Supabase provider config.

### 4.1 Apple Developer Portal (Simi — needs **Apple Developer Program, $99/yr**)
You'll need this membership for the App Store anyway, so it's not extra cost.
1. **Certificates, IDs & Profiles → Identifiers → App ID** — create (or reuse) an App ID for the
   app; enable the **Sign in with Apple** capability.
2. **Identifiers → Services ID** — create one (e.g. `com.certanvil.web`). This is the OAuth
   `client_id` for the **web** flow. Enable Sign in with Apple on it; configure:
   - **Domains:** `certanvil.com` (+ subdomains as needed).
   - **Return URLs:** the Supabase callback `https://<PROJECT-REF>.supabase.co/auth/v1/callback`.
3. **Keys → create a Sign in with Apple key** — download the **`.p8`** file (you can only
   download it once — store it safely). Note the **Key ID** and your **Team ID**.

### 4.2 The client secret is a signed, EXPIRING JWT — the big gotcha
Unlike Google's static secret, Apple's "client secret" is a **JWT you sign with the `.p8` key**,
and it **expires after at most 6 months**. Supabase can manage this for you in newer dashboards
(you give it Team ID, Key ID, Services ID, and the `.p8`), but **confirm whether Supabase
auto-rotates or whether you must regenerate**. If manual:
- Generate the JWT (Apple's algo: ES256, `iss`=Team ID, `sub`=Services ID, `aud`=`https://appleid.apple.com`).
- **Set a calendar reminder to rotate every ~5 months** — when it expires, Apple sign-in silently
  breaks for everyone. Consider a tiny script in `scripts/` to mint a fresh secret.
- **→ See §7 for the rotation reminder this plan should schedule.**

### 4.3 Supabase dashboard
- **Authentication → Providers → Apple** → enable. Enter Services ID (as client ID),
  Team ID, Key ID, and the `.p8` secret key (or the pre-minted JWT, per the dashboard's fields).
- Redirect URLs allow-list from §3.2 already covers Apple (same callback + origins). No change.

### 4.4 Code — mirror the Google button
`landing/index.html`: add `#auth-apple` button (Apple wordmark + Apple-logo SVG; follow Apple's
[Human Interface Guidelines for the button](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple) —
black or white, correct corner radius, "Continue with Apple").

`landing/auth.js`: identical handler, `provider: 'apple'`:
```js
var authAppleBtn = document.getElementById('auth-apple');
if (authAppleBtn) {
  authAppleBtn.addEventListener('click', function () {
    clearAuthError();
    supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: buildRedirectUrl() }
    }).then(function (r) {
      if (r && r.error) showAuthError(r.error.message || 'Apple sign-in failed. Try again.');
    }).catch(function (err) {
      console.error('[certanvil-auth] apple oauth threw:', err);
      showAuthError('Network error starting Apple sign-in.');
    });
  });
}
```

### 4.5 Apple-specific data gotchas
- **Hide My Email:** Apple may return a relay address `xxxxx@privaterelay.appleid.com`. Treat it
  as a **valid, permanent email**. Don't validate against a domain allow-list, don't choke on it,
  don't try to "fix" it. The user's `profiles` row + `cert_results` key off the Supabase user id,
  not the email, so this is mostly cosmetic — but the topbar email display + any "email a copy"
  features must handle a relay address gracefully.
- **Name is only sent ONCE:** Apple returns the user's name (if shared) **only on first
  authorization**, not on subsequent sign-ins. If we ever capture display name, capture it on the
  first sign-in or it's gone. (We currently derive the avatar initial from email, so low impact.)
- **Email may be absent** if the user de-selected it (rare with our scopes) — handle a null email.

### 4.6 G2 acceptance
- [ ] Apple button starts the Apple sign-in flow (web popup/redirect).
- [ ] Round-trips back signed in; pill renders; `?return=` bounce works.
- [ ] Relay-email user works end-to-end (sign in, see progress, sign out, sign back in → same account).
- [ ] Same-email account linking behaves (Apple email == existing email → same account, not dup).
- [ ] Client-secret expiry reminder is set (§7).

---

## 5. Phase G3 — iOS / App Store path (LATER, bigger, separate effort)

> This is its own project, not part of the July web-OAuth work. Captured here so the web flow is
> built in a way that carries over.

- **Wrapping approach:** the app is a static web app, so the realistic App Store path is a native
  shell — **Capacitor** (<https://capacitorjs.com>) is the standard choice: keep the existing
  web codebase, add a native iOS wrapper. (Alternatives considered: PWA — not App-Store-distributable;
  full native rewrite — overkill.)
- **Native Sign in with Apple:** in the wrapped app, use the **native** Apple button
  (`@capacitor-community/apple-sign-in` or the official plugin) which returns an **identity
  token**, then hand it to Supabase via:
  ```js
  supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken })
  ```
  This is cleaner UX than a web popup inside the app and is what Apple prefers for review.
- **Native Google:** similarly use a native Google sign-in plugin → `signInWithIdToken` with
  `provider: 'google'`, OR keep the web OAuth flow in the webview (simpler, may be acceptable).
- **Reuses §4.1–4.3 Apple config** (same Services ID / key / Supabase provider). The App ID's
  Sign in with Apple capability is the native side.
- **App Store review checklist (4.8):** both Apple + a non-Apple option present; Apple privacy
  requirements met; account-deletion path available in-app (Apple requires apps with account
  creation to offer in-app account deletion — note for the iOS milestone).
- **Other 4.x items** to scope at iOS time: in-app purchase rules if Pro tier is sold inside the
  app (Apple's 30% — may affect whether Pro is sold in-app vs web), privacy nutrition labels,
  ATT if any tracking.

---

## 6. Risks & gotchas (consolidated)

| Risk | Mitigation |
|---|---|
| Redirect URL not allow-listed in Supabase → silent redirect failure | Add all origins incl. `*.vercel.app` + `localhost` before testing (§3.2) |
| Apple client secret JWT expires (≤6 mo) → Apple login breaks for all | Calendar reminder + optional mint script (§4.2, §7) |
| Service worker caches OAuth redirect hops → broken round-trip | Confirm cross-origin pass-through covers Google/Apple/Supabase callback (§3.5) |
| Duplicate accounts (same email via magic-link + Google/Apple) | Verify Supabase identity linking; test same-email path (§3.6, §4.6) |
| Signup trigger only fires for some providers → OAuth user has no `profiles` row | Confirm trigger covers all providers (§3.6) |
| Apple relay email breaks email-display / email features | Treat relay as valid permanent email (§4.5) |
| Shipped via fast lane → no preview to test OAuth round-trip | Force gated lane: PR + Supabase branch + preview (§2) |
| Cross-subdomain session not shared after OAuth | Cookie adapter on `.certanvil.com` already handles it — verify with a cert-subdomain round-trip |

---

## 7. Suggested schedule items (set when work starts in July)

- **Apple client-secret rotation reminder** — recurring, ~every 5 months from the day the Apple
  secret is created. Title e.g. "Rotate Apple Sign in with Apple client secret (CertAnvil)".
  *(Set this only once the secret actually exists — there's no concrete date yet.)*

---

## 8. Sequencing summary

1. **G1 Google** (smaller, faster) — dashboards → code → gated-lane PR → preview smoke → ship → live-verify.
2. **G2 Apple** (web flow) — Apple Dev Portal → Supabase → code → PR → preview smoke (incl. relay
   email) → ship → live-verify → set rotation reminder.
3. **G3 iOS** (separate later milestone) — Capacitor wrap + native Apple/Google + App Store 4.8
   compliance + in-app account deletion.

**Definition of done for July (web):** Google + Apple buttons live on the landing sign-in modal,
both round-trip on prod across landing + at least one cert subdomain, no duplicate accounts,
admin still gated, cloud progress intact, Apple secret rotation reminder set.
