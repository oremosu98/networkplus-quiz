---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# G-2: Apple + Google Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task. Each task is bite-sized and independently verifiable. Do NOT batch tasks. This is a GATED-lane change (touches `auth-state.js`, `lib/supabase.js`, `landing/auth.js`, landing modal markup, Supabase Auth config) · follow the feature-branch → PR → preview-smoke → squash-merge flow in `ENVIRONMENT_STRATEGY.md`. Run the founder-only Prerequisite gate FIRST; no code task can be tested until the providers exist in Supabase.

**Goal:** Add **"Continue with Apple"** and **"Continue with Google"** as additional doors into the *existing* single Supabase account, alongside the current email magic-link auth · without splitting Pro status or study history across login methods. Apple and Google ship **together** (see compliance note), each above the magic-link field in both auth modals (the cert app routes to the landing modal; the landing project owns the modal markup). Magic-link stays fully working.

**Architecture:** The cert app (`networkplus.certanvil.com` + per-cert subdomains) has **no sign-in modal of its own** · the "Sign in" pill in `auth-state.js` navigates to `https://certanvil.com/?action=signin&return=<thisURL>`, and the **landing project's** modal (`landing/index.html` + `landing/auth.js`) performs the actual sign-in. So all OAuth button wiring lives in the landing project; the cert app only needs to keep correctly handling the resulting `SIGNED_IN` session (it already does, via `auth-state.js` `onAuthStateChange`). Sessions are shared across `.certanvil.com` by the cookie-backed Supabase storage adapter in `lib/supabase.js` / `landing/lib/supabase.js`, so an OAuth sign-in on the apex lands on every subdomain automatically · exactly as magic-link does today. Entitlement (`provider_subscriptions` + `is_pro()`, from the G-1 hardening plan) is keyed on Supabase `user_id`, so account linking MUST keep **one Supabase user per human** or Pro splits. Linking follows the locked **account-linking priority** (PHASE-G decisions 9+10): **(1) session-link FIRST** (signed-in user adds a method via `supabase.auth.linkIdentity`), **(2) email-match SECOND** (a fresh sign-in whose *verified real* email already has an account lands on it · Supabase's automatic-linking behaviour for verified emails), **(3) manual-merge LAST** (Apple "Hide My Email" relay + no session may create a separate account → a "contact us to merge" support path; full auto-merge is OUT of scope pre-launch).

**Compliance note (drives the ship boundary):** Apple **App Store Guideline 4.8** makes *Sign in with Apple* **mandatory the moment a third-party social login (Google) exists** in the app. Because the cert app ships inside a Capacitor (WKWebView) iOS shell (G-3/G-4), Google-only would fail App Store review. Therefore **Apple and Google ship in the same change** · never Google first, never Google alone. This is a locked compliance fact (PHASE-G decision 4), not a preference.

**Tech Stack:** Supabase Auth (Google + Apple OAuth providers), Supabase JS UMD client (`signInWithOAuth`, `linkIdentity`), vanilla HTML/JS/CSS (no framework, no build step), Capacitor (WKWebView) for the native iOS shell. Hosting: Vercel (cert app + separate landing project).

---

## Dependencies

- **G-1 / G-1 hardening** does NOT block G-2 functionally · auth and entitlement are separable. But the *one-user-per-human* invariant below is what protects the `provider_subscriptions`/`is_pro(user_id)` entitlement model the hardening plan installs. Keep them consistent.
- This change must NOT alter `provider_subscriptions`, `is_pro()`, or any quota path. G-2 is auth-only.
- Existing markup already present and reused (do NOT rebuild): the disabled coming-soon **"Continue with Google"** `.auth-oauth-btn` in `landing/index.html` (~line 3603) and `landing/pricing.html` (~line 652); the `#auth-magic-only` wrapper + `.auth-divider`; `sendMagicLink()` → `signInWithOtp` + `buildRedirectUrl()` in `landing/auth.js`; the cert-app redirect `https://certanvil.com/?action=signin&return=…` in `auth-state.js`.

## Prerequisite gate (founder-only dashboard setup)

**No code task below can be smoke-tested until ALL of these exist.** These are guided founder sessions (bundle into the existing Apple-portal sitting noted in PHASE-G build-order, e.g. the `certanvil-api-key-setup-day` task). Mark each done before starting Task 3.

- [ ] **Google Cloud Console → OAuth client.** Create an OAuth 2.0 **Web application** client. Authorised redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`. Authorised JavaScript origins = `https://certanvil.com` (the apex that owns the modal). Copy **Client ID** + **Client secret**.
- [ ] **Supabase → Authentication → Providers → Google.** Enable; paste Client ID + secret. Leave "Skip nonce check" OFF.
- [ ] **Apple Developer → Identifiers → App ID.** Ensure the iOS app's App ID has the **Sign in with Apple** capability enabled (needed for the native flow in Task 5).
- [ ] **Apple Developer → Identifiers → Services ID.** Create a Services ID (e.g. `com.certanvil.web`) for the *web* OAuth flow. Configure "Sign in with Apple" on it: Web Domain = `certanvil.com`; Return URL = `https://<project-ref>.supabase.co/auth/v1/callback`.
- [ ] **Apple Developer → Keys.** Create a **Sign in with Apple** key (.p8). Note Key ID + Team ID. Generate the client secret (JWT) per Supabase's Apple provider instructions.
- [ ] **Supabase → Authentication → Providers → Apple.** Enable; set Client ID = the **Services ID** (for web) and add the **App ID bundle identifier** to the "Authorized Client IDs" list (for the native iOS token flow); paste the generated secret.
- [ ] **Supabase → Authentication → URL Configuration.** Confirm `https://certanvil.com` and the per-cert subdomains are in **Redirect URLs** (the OAuth `redirectTo` must be allow-listed, same as magic-link today). Add `capacitor://localhost` and the app's custom scheme (Task 5) here too.
- [ ] **Supabase → Authentication → Providers → "Allow manual linking" / automatic linking.** Confirm verified-email automatic linking is enabled so decision 9's email-match path (priority #2) works without custom code.

Verification of the gate: in Supabase dashboard, Google and Apple both show **Enabled**; the magic-link (Email) provider is still Enabled and untouched.

---

## Task 1: Enable the existing Google button + add Apple button in the landing home modal

**Files:** `landing/index.html`

The `#auth-magic-only` block already contains a *disabled, coming-soon* "Continue with Google" button and the `.auth-divider`. Reuse that block: remove the disabled/coming-soon state from Google and add an Apple button **above** it (Apple first, per Apple HIG ordering convention, both above the magic-link CTA which lives above the divider).

- [ ] In `landing/index.html`, locate the `#auth-magic-only` wrapper (~line 3600). Replace the existing disabled Google `<button>` (the one with `disabled aria-disabled="true" title="Coming soon · Google OAuth"` and the `<span class="coming-soon-pill">Soon</span>`) with two live buttons, Apple first:
```html
<div id="auth-magic-only">
  <div class="auth-divider"><span class="auth-divider-text">or</span></div>

  <button type="button" class="auth-oauth-btn" id="auth-apple" data-provider="apple">
    <svg class="auth-oauth-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M16.36 12.78c-.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.75 2.28-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.65zM14.13 6.04c.64-.78 1.07-1.86.95-2.94-.92.04-2.03.61-2.69 1.39-.59.69-1.11 1.79-.97 2.85 1.02.08 2.07-.52 2.71-1.3z" fill="currentColor"/>
    </svg>
    <span>Continue with Apple</span>
  </button>

  <button type="button" class="auth-oauth-btn" id="auth-google" data-provider="google">
    <svg class="auth-oauth-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
    <span>Continue with Google</span>
  </button>

  <div class="auth-foot">
    By continuing you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy</a>. We use magic links because <em>passwords break, and password resets break more</em>.
  </div>
</div>
```
- [ ] Confirm the buttons sit INSIDE `#auth-magic-only` so they hide in playtest/password mode exactly like the old Google button did (no new toggle logic needed · `setAuthMode('password')` already hides this wrapper).
- [ ] Verify the button labels are EXACTLY "Continue with Apple" and "Continue with Google" (no trailing arrow, matching the existing OAuth-button convention · only the magic-link CTA uses "→").

**Verification:** Load `https://certanvil.com/?action=signin` on the preview deploy; both buttons render BELOW the "or" divider and the email CTA (the divider separates the magic-link field above from OAuth below, matching today's layout). Confirm Apple appears above Google, no "Soon" pill, and the password-mode toggle (`setAuthMode('password')`) still hides both.

## Task 2: Mirror the same two buttons into the pricing-page modal

**Files:** `landing/pricing.html`

`landing/pricing.html` carries a second copy of the auth modal with the same disabled Google button (~line 652).

- [ ] Apply the identical replacement from Task 1 to the modal block in `landing/pricing.html` (same Apple-then-Google markup, same `id="auth-apple"` / `id="auth-google"` / `data-provider` attributes). Note this modal's structure differs slightly (it has a separate `#auth-otp-form`); insert the two OAuth buttons in the same relative position the disabled Google button occupied, after the `.auth-divider`.
- [ ] Keep IDs identical across both pages so `landing/auth.js` (Task 3) can wire them with a single `data-provider` delegated handler rather than per-page code.

**Verification:** Load `https://certanvil.com/pricing` on the preview; both buttons render, Apple above Google, no "Soon" pill.

## Task 3: Wire the OAuth buttons to `signInWithOAuth` in `landing/auth.js`

**Files:** `landing/auth.js`

`landing/auth.js` already owns the modal wiring and has `sendMagicLink()` + `buildRedirectUrl()`. Add an OAuth handler that reuses `buildRedirectUrl()` so OAuth lands on the same `return=` origin as magic-link does today.

- [ ] Near the existing `sendMagicLink` definition (~line 371), add a provider sign-in helper that reuses the same redirect target so the cert app's `return=` URL is honoured:
```js
// G-2: OAuth sign-in (Apple / Google). Reuses buildRedirectUrl() so the
// session lands on the same origin the magic-link flow targets (honours the
// cert app's ?return= param). Linking priority #2 (verified-email match) is
// handled automatically by Supabase when the provider returns a real email.
function signInWithOAuth(provider) {
  return supabase.auth.signInWithOAuth({
    provider: provider, // 'apple' | 'google'
    options: { redirectTo: buildRedirectUrl() }
  });
}
```
- [ ] In the modal-wiring section (where `authForm`/`authSubmit` listeners are attached), add a delegated click handler bound to `[data-provider]` so it covers both buttons on both pages:
```js
document.querySelectorAll('.auth-oauth-btn[data-provider]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var provider = btn.getAttribute('data-provider');
    if (!supabase) return;
    btn.disabled = true; // prevent double-tap; page navigates away on success
    signInWithOAuth(provider).then(function (res) {
      if (res && res.error) {
        btn.disabled = false;
        if (authError) { authError.hidden = false; authError.textContent = 'Could not start ' + (provider === 'apple' ? 'Apple' : 'Google') + ' sign-in. Try the email link instead.'; }
      }
      // success path: browser redirects to the provider; nothing else to do.
    });
  });
});
```
- [ ] Do NOT touch `sendMagicLink`, `signInWithPlaytestPassword`, `setAuthMode`, or `buildRedirectUrl` · the OAuth path is purely additive.
- [ ] Confirm the existing `detectSessionInUrl: true` + `flowType: 'pkce'` in `landing/lib/supabase.js` handles the OAuth callback the same way it handles magic-link callbacks (it does · Supabase routes both through `/auth/v1/callback` then back to `redirectTo`). No client-config change needed.

**Verification:** On the preview, click "Continue with Google" → redirected to Google consent → back to the modal's `return=` origin → `onAuthStateChange` fires `SIGNED_IN` → account pill shows the user. Repeat for Apple (real-email test account). Confirm magic-link still works unchanged.

## Task 4: Session-link path (priority #1) · signed-in user adds a method

**Files:** `landing/auth.js`

Decision 10's primary path: a user already signed in (e.g. via magic-link) adds Apple/Google **from inside the session**, which links by current session via `linkIdentity` and lands on the correct Supabase user regardless of the relay address Apple returns. The account dropdown's aspirational "Linked Accounts" row is where this surfaces.

- [ ] Add a link helper that uses `linkIdentity` (NOT `signInWithOAuth`) so the new identity attaches to the *current* user rather than starting a fresh sign-in:
```js
// G-2 linking priority #1 (session-link): attach a provider to the CURRENT
// signed-in user. This is the safe path for Apple "Hide My Email" · it lands
// on the existing account by session, not by the relay email. Used by the
// account-dropdown "Linked Accounts" actions, NOT the signed-out modal.
function linkProvider(provider) {
  return supabase.auth.linkIdentity({
    provider: provider,
    options: { redirectTo: buildRedirectUrl() }
  });
}
```
- [ ] Surface two "Link" actions in the account dropdown's Linked Accounts row (the currently-aspirational row) that call `linkProvider('apple')` / `linkProvider('google')`. Reflect linked state by reading `supabase.auth.getUserIdentities()` (or `user.identities`) and showing "Linked" vs a "Link" button per provider. Keep this strictly additive to the existing dropdown render.
- [ ] Add a guard: only show the link actions when a session exists; in the signed-out modal the buttons use `signInWithOAuth` (Task 3), never `linkIdentity`.

**Verification:** Sign in via magic-link on the preview. Open account dropdown → "Linked Accounts" → click "Link Google" → consent → returns. Then run the SQL check in Task 7 to confirm STILL ONE `auth.users` row (the identity attached, no new user created).

## Task 5: Capacitor / native iOS (WKWebView) consideration

**Files:** `landing/auth.js` (provider call site), plus native config noted inline (no native code written here · flag for G-3/G-4 shell work)

How Apple/Google sign-in behaves inside the Capacitor WKWebView shell differs from desktop/mobile web, and must be flagged so the native shell handles it:

- [ ] **Google in WKWebView:** Google blocks its OAuth consent screen inside embedded/`UIWebView`-style web views (`disallowed_useragent`). The cert app inside Capacitor must open the Google OAuth URL in an **external system browser / `ASWebAuthenticationSession`** (e.g. the Capacitor Browser plugin or a native OAuth bridge), then deep-link the callback back into the app via a custom URL scheme. Document that the web `signInWithOAuth('google')` path works in *Mobile Safari* but NOT inside the raw WKWebView · the native shell must intercept and route it out.
- [ ] **Apple in WKWebView:** prefer the **native Sign in with Apple** flow (`ASAuthorizationController` / `@capacitor-community/apple-sign-in`) on iOS, which returns an identity token; pass that token to Supabase via `supabase.auth.signInWithIdToken({ provider: 'apple', token })` rather than the web redirect. This is also why the Prerequisite gate adds the **App ID bundle identifier** to Supabase's Apple "Authorized Client IDs" (web Services ID alone is insufficient for the native token).
- [ ] **Redirect/deep-link allow-list:** the custom scheme + `capacitor://localhost` must be in Supabase URL Configuration (Prerequisite gate) so the native callback is accepted.
- [ ] **Decision boundary:** the *web* buttons (Tasks 1–4) are the deliverable now and work in desktop + Mobile Safari. The native-flow wiring (id-token for Apple, external-browser for Google) is a **G-3/G-4 shell task** · this plan only specifies the contract so the shell can implement it without re-deciding. Flag it; do not block G-2 web ship on it.

**Verification:** No native build in this plan. Confirmation = Mobile Safari (not the app shell) on a real device completes both OAuth flows against the preview. Add a tracked task chip for the native id-token/external-browser wiring in G-3.

## Task 6: Manual-merge fallback path (priority #3) · Apple Hide-My-Email split

**Files:** `landing/index.html` (or a static support/help anchor), copy only · no auto-merge code

Decision 10: the rare case · a fresh Apple "Hide My Email" sign-up by someone who *also* has a pre-existing magic-link account, with no active session · is accepted as a rare split and handled by a manual support path. **Full auto-merge is explicitly OUT of scope pre-launch** (rejected as overkill before there are users).

- [ ] Ensure a discoverable "Wrong account? / Two accounts? **Contact us to merge**" support path exists (e.g. a mailto or the existing support/contact link) reachable from the account dropdown. No automated merging.
- [ ] State plainly in this plan and in the support copy: auto-merge of hidden-email duplicates is deferred; the lookup tool that would move entitlement + history (by Apple `original_transaction_id` / Stripe customer / relay email) is a separate pre-launch tooling task (already tracked in the G-1 hardening notes), NOT part of G-2.

**Verification:** The "contact us to merge" path is reachable in two clicks from a signed-in dropdown. No code attempts an automatic merge.

## Task 7: Single-Supabase-user verification (entitlement-safety gate)

**Files:** none (verification SQL)

The entitlement model keys on `user_id`; the whole point of the linking priority is one Supabase user per human. Verify it directly.

- [ ] After exercising Task 3 (fresh OAuth sign-in with a verified email matching an existing magic-link account) and Task 4 (session-link), run in the Supabase branch DB SQL editor:
```sql
-- Expect exactly ONE row for the test human's real email.
select id, email, created_at
from auth.users
where email = '<test-real-email>';

-- Expect the linked providers to share that single user id.
select user_id, provider, identity_data->>'email' as provider_email, created_at
from auth.identities
where user_id = (select id from auth.users where email = '<test-real-email>')
order by created_at;
```
- [ ] Confirm: one `auth.users` row; multiple `auth.identities` rows (email/magic + google + apple) all sharing that one `user_id`. If a SECOND `auth.users` row appeared for the same real email, automatic verified-email linking is misconfigured · fix the Prerequisite gate's linking setting before merging.
- [ ] Confirm `is_pro(user_id)` and the quota path are untouched (no migration in this plan; this is a read-only sanity check).

**Verification:** The SQL returns one user, N identities. Screenshot/paste into the PR.

---

## Gated-lane workflow

This change touches `auth-state.js` (dropdown link actions), `lib/supabase.js` (read-only confirmation · no edit expected), `landing/auth.js`, and the landing modal markup, plus Supabase Auth config → **gated lane**:

1. Feature branch `g2-apple-google-signin` off `main`.
2. Open PR → auto-spins Supabase branch DB + Vercel preview + CI.
3. Run the Prerequisite gate against the **branch** Supabase project (or a dedicated staging project) so preview OAuth works.
4. Smoke-test the preview: both OAuth flows (real-email Apple test account), magic-link still works, session-link path, the Task 7 SQL one-user check.
5. Squash-merge → prod. Apply the same Prerequisite gate provider config to the **prod** Supabase project + confirm prod Redirect URLs include all subdomains + the native scheme.
6. Post-deploy: drive the live prod modal in a real browser per CLAUDE.md "Post-deploy verification" · click both buttons, confirm the account pill resolves on a cert subdomain.

**Migrations:** none. This is an auth-config + client-wiring change; no `supabase/migrations/*` file is added, so no `-- ROLLBACK:` block applies. (Rollback = disable the two providers in the Supabase dashboard + revert the branch; magic-link is unaffected.) If a future iteration adds a `provider_links` audit table, it MUST carry a tested `-- ROLLBACK:` block per the gated-lane rule.

---

## Self-review

**Spec coverage**
- Enable Apple + Google in Supabase Auth (founder dashboard) → Prerequisite gate (Google Cloud OAuth client; Apple App ID + Services ID + key; Supabase provider enable; URL allow-list). ✓
- "Continue with Apple" / "Continue with Google" above the magic-link field in BOTH modals (cert app via the landing modal it redirects to; `landing/auth.js`) with magic-link kept → Tasks 1, 2, 3. ✓
- Account-linking priority (decisions 9+10): **(1) session-link FIRST** via `linkIdentity` (Task 4), **(2) email-match SECOND** via Supabase verified-email automatic linking (Task 3 + Prerequisite gate setting + Task 7 verification), **(3) manual-merge LAST** with auto-merge explicitly OUT of scope (Task 6). ✓ Order stated session → email → manual in Architecture and reflected in task numbering.
- Capacitor/native consideration: Google blocked in raw WKWebView → external browser / `ASWebAuthenticationSession`; Apple native flow → `signInWithIdToken`; deep-link allow-list; flagged as G-3/G-4 shell work → Task 5. ✓
- Apple 4.8 compliance (Apple REQUIRED once Google exists → ship together) → stated in Goal/Architecture compliance note. ✓

**Account-linking priority + 4.8 compliance** are both called out explicitly above and are not buried · priority is in the Architecture paragraph and Tasks 3/4/6; 4.8 is its own bolded compliance note that sets the ship boundary.

**Placeholder scan:** no "TBD", no "add validation", no "…": every task shows actual markup/JS (the two button blocks, `signInWithOAuth`, `linkIdentity`, the delegated handler, the verification SQL). The one deliberately deferred item (native id-token wiring) is scoped to G-3 with a tracked chip, not left as a placeholder in G-2.

**Name consistency:** `signInWithOAuth` / `linkIdentity` / `signInWithIdToken` (Supabase JS), `provider_subscriptions` / `is_pro(user_id)` (hardening schema), `buildRedirectUrl` / `sendMagicLink` / `setAuthMode` / `#auth-magic-only` / `.auth-oauth-btn` / `.auth-divider` (existing `landing/auth.js` + modal markup), `?action=signin&return=` (cert-app redirect in `auth-state.js`) · all match the source files read for this plan.

**Reused, not rebuilt:** extends the *existing* disabled "Continue with Google" coming-soon button (`landing/index.html` ~3603, `landing/pricing.html` ~652) and the `#auth-magic-only` / `.auth-divider` structure; reuses `buildRedirectUrl()` for OAuth `redirectTo`; relies on the existing `onAuthStateChange` + cookie-backed cross-subdomain storage adapter so no new session-sync system is introduced. The cert app gets NO new modal · it keeps redirecting to the landing modal, which is the single place OAuth buttons live.

**No em-dashes used anywhere in this document (· used where a separator was needed). Button labels are exactly "Continue with Apple" and "Continue with Google".**
