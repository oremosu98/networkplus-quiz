---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan, mobile]
---
# G-3 — iOS Pro via RevenueCat + the Go-Pro Purchase Coordinator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an iPhone user buy CertAnvil Pro through Apple's payment sheet (via RevenueCat), and route EVERY "Go Pro" button through one platform-aware coordinator so the app stops linking to the web pricing page on iOS — the fix that clears the App Store rejection risk (Guideline 3.1.1).

**Architecture:** One client chokepoint, `startProUpgrade()`, replaces all hardcoded `certanvil.com/pricing` links and branches by platform: **web → Stripe** (the G-1 flow), **native iOS → RevenueCat purchase**, **already-Pro → "You're already Pro"**, **signed-out → sign-in**. RevenueCat is the managed layer over Apple StoreKit; its webhook projects the purchase into Supabase by reusing the hardening plan's atomic `apply_provider_subscription_event` RPC with `provider='apple'`. So web (Stripe) and iOS (Apple) land in the SAME `provider_subscriptions` table, and `is_pro()` aggregates across both.

**Tech Stack:** Capacitor (WKWebView shell, bundle `com.certanvil.app`), `@revenuecat/purchases-capacitor` SDK, RevenueCat dashboard (entitlement + offering), App Store Connect auto-renewable subscriptions, Vercel Node serverless (RevenueCat webhook), Supabase (`provider_subscriptions` + the atomic RPC).

---

## Dependencies (this plan is inert until these exist)

1. **Hardening plan is live** — `docs/superpowers/plans/2026-06-26-g1-hardening-webhook-and-multiprovider-schema.md` (the `provider_subscriptions` table + `apply_provider_subscription_event` RPC, which this plan's webhook calls with `provider='apple'`). **Hard dependency.**
2. **Capacitor shell exists** — `docs/mobile/APP_STORE_DISTRIBUTION.md` Phase B (`npx cap init CertAnvil com.certanvil.app`, `ios/` dir, ≥1 native plugin). This plan adds the RevenueCat plugin to that shell.
3. **G-2 Apple sign-in is live** — users must be signed in *before* purchase so the RevenueCat app-user-id can be set to the Supabase user id (the whole web↔iOS shared-account model, PHASE-G decisions 2/9).
4. **G-1 Stripe is live** — the coordinator's `web` branch calls the existing `startProCheckout()`.

## ⛔ PREREQUISITE GATE — founder-only setup (cannot be coded)

- [ ] **R0.1** Create a **RevenueCat** account; create a Project; add the iOS app (bundle `com.certanvil.app`).
- [ ] **R0.2** In **App Store Connect**, create two **auto-renewable subscription** products in one subscription group: `pro_monthly` ($9.99/mo) and `pro_annual` ($89/yr) — same sticker price as web (PHASE-G decision 7). Fill metadata + a review screenshot (Apple requires these before approval).
- [ ] **R0.3** In RevenueCat: create an **Entitlement** with identifier **`pro`**; attach both App Store products to it; create an **Offering** (`default`) with a monthly + annual **Package**.
- [ ] **R0.4** Copy the **iOS public SDK key** (`appl_…`) and create a **webhook Authorization header** secret (RevenueCat → Project → Webhooks → set an `Authorization` value you choose).
- [ ] **R0.5** Connect App Store Connect to RevenueCat (App Store Connect **App-Specific Shared Secret** + the **In-App Purchase key**) so RevenueCat can validate receipts + receive App Store Server Notifications. (This is what makes restore + renewals + refunds flow without you writing receipt validation.)
- [ ] **R0.6** Set Vercel env on **certanvil-landing**: `REVENUECAT_WEBHOOK_AUTH` (the R0.4 secret). The client SDK key (R0.4 `appl_…`) is a **public** key and ships in the app config.

**STOP CONDITION:** R0.1–R0.6 done, and Dependencies 1–4 live, before Task 2 onward. Task 1 (the coordinator, web-only branch) can be built and tested earlier since it only needs G-1.

---

## File structure

- Modify: `app.js` — add `startProUpgrade(billingPeriod)` (the coordinator) + `_isNativeIOS()` helper; replace the three hardcoded `certanvil.com/pricing` CTAs (~`app.js:611`, `:682`, `:939`) with coordinator calls.
- Create: `app-iap.js` (new lazy-loaded module, loaded only inside the native shell) — RevenueCat init/identify/purchase/restore. Keeps the RC SDK out of the web bundle.
- Modify: `index.html` — conditionally load `app-iap.js` + the RevenueCat plugin only when running natively.
- Create: `landing/api/revenuecat/webhook.js` — receives RevenueCat events, maps → `apply_provider_subscription_event(provider='apple')`.
- Modify: `landing/api/stripe/create-checkout-session.js` — add the server-side "already Pro" guard (PHASE-G decision 8) shared with the coordinator.
- Modify: iOS Settings surface — add the **Restore Purchases** button (Apple requirement) wired to the RC restore.

---

## Task 1: The purchase coordinator (replaces all web-pricing CTAs)

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add the platform helper + coordinator near the existing checkout code (`app.js`, by `startProCheckout`)**

```js
// --- G-3: one chokepoint for every "Go Pro" CTA -----------------------------
// Branches by platform so iOS never links out to web payment (App Store 3.1.1).
//   signed-out  -> route to sign-in
//   already-Pro -> "You're already Pro" (PHASE-G decision 8, server-confirmed)
//   native iOS  -> RevenueCat purchase (app-iap.js)
//   web         -> Stripe hosted checkout (G-1 startProCheckout)
function _isNativeIOS() {
  return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function'
            && window.Capacitor.isNativePlatform()
            && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'ios');
}

async function startProUpgrade(billingPeriod) {
  var period = billingPeriod === 'annual' ? 'annual' : 'monthly';
  // 1) must be signed in (RC app-user-id = Supabase id; web checkout needs the token too)
  var sess = window.certanvilSupabase
    ? (await window.certanvilSupabase.auth.getSession()).data.session : null;
  if (!sess) { if (typeof openAuthModal === 'function') openAuthModal('upgrade'); return; }

  // 2) already Pro? (read the live flag — never charge twice; PHASE-G decision 8)
  try {
    if (typeof refreshQuotaState === 'function') await refreshQuotaState();
    if (typeof _quotaState !== 'undefined' && _quotaState &&
        (_quotaState.tier === 'pro' || _quotaState.tier === 'admin')) {
      if (typeof showToast === 'function') showToast("You're already Pro ✓", 'success');
      return;
    }
  } catch (_) { /* fall through to purchase on a transient read error */ }

  // 3) platform branch
  if (_isNativeIOS()) {
    if (window._iapPurchase) { return window._iapPurchase(period); }     // app-iap.js (Task 2)
    if (typeof showToast === 'function') showToast('In-app purchase is unavailable right now.', 'info');
    return;
  }
  return startProCheckout(period);                                       // G-1 web path
}
window.startProUpgrade = startProUpgrade;
```

- [ ] **Step 2: Replace the three hardcoded web-pricing CTAs**

In each of these, the current markup is an `<a href="https://certanvil.com/pricing" target="_blank">…</a>`. Replace the anchor with a `<button type="button">` that calls the coordinator (so iOS never sees an external purchase link):

- `app.js` ~`611` (quota-chip tooltip CTA): replace the `<a …>Upgrade to Pro …</a>` with
  `'<button type="button" class="quota-chip-tooltip-cta" onclick="startProUpgrade(\'annual\')">Upgrade to Pro · unlimited →</button>'`
- `app.js` ~`682` (quota-exceeded CTA): replace with
  `'<button type="button" class="quota-exceeded-cta" onclick="startProUpgrade(\'annual\')">Upgrade to Pro →</button>'`
- `app.js` ~`939` (`_showProOnlyUI` modal CTA — the one every drill gate uses): replace with
  `'<button type="button" class="dlpb-cta" onclick="startProUpgrade(\'annual\')">Go Pro · unlimited</button>'`

> Keep the same CSS classes so styling is unchanged. The only behavioural change: the button now routes through `startProUpgrade` instead of opening a web URL.

- [ ] **Step 3: Verify on web (no native shell needed yet)**

On a Vercel preview, signed in as a **free** user, click each upgraded CTA → it calls `startProUpgrade('annual')` → (web branch) → Stripe checkout opens. Signed in as **Pro** → it shows "You're already Pro ✓" and does NOT open checkout. Signed **out** → it opens the sign-in modal. (iOS branch is exercised in Task 2.)

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat(g3): startProUpgrade coordinator + replace hardcoded web-pricing CTAs (App Store 3.1.1)"
```

---

## Task 2: RevenueCat purchase flow (native iOS only)

**Files:**
- Create: `app-iap.js`
- Modify: `index.html`

- [ ] **Step 1: Add the RevenueCat plugin to the Capacitor shell (founder/CLI)**

```bash
npm install @revenuecat/purchases-capacitor
npx cap sync ios
```

- [ ] **Step 2: Write `app-iap.js` (loaded only inside the native shell)**

```js
// app-iap.js — RevenueCat (Apple IAP) wiring. Loaded ONLY in the native iOS
// shell (see index.html guard), so the RC SDK never bloats the web bundle.
// RC app-user-id is set to the Supabase user id, so the purchase lands on the
// shared account and the RC webhook can map it back (Task 3).
(function () {
  var RC_IOS_KEY = 'appl_REPLACE_WITH_PUBLIC_KEY';   // R0.4 public SDK key (safe to ship)
  var ENTITLEMENT = 'pro';

  async function _rc() { return (await import('@revenuecat/purchases-capacitor')).Purchases; }

  async function iapInit() {
    var Purchases = await _rc();
    await Purchases.configure({ apiKey: RC_IOS_KEY });
    // identify: tie RC to the Supabase user so web+iOS share one account
    var sess = window.certanvilSupabase
      ? (await window.certanvilSupabase.auth.getSession()).data.session : null;
    if (sess && sess.user && sess.user.id) { await Purchases.logIn({ appUserID: sess.user.id }); }
  }

  // billingPeriod: 'monthly' | 'annual' -> pick the matching RC package
  async function iapPurchase(billingPeriod) {
    try {
      var Purchases = await _rc();
      var offerings = await Purchases.getOfferings();
      var current = offerings && offerings.current;
      if (!current) { if (window.showToast) showToast('Plans are unavailable right now.', 'info'); return; }
      var pkg = (billingPeriod === 'annual') ? current.annual : current.monthly;
      if (!pkg) pkg = (current.availablePackages || [])[0];
      var result = await Purchases.purchasePackage({ aPackage: pkg });
      var active = result && result.customerInfo && result.customerInfo.entitlements
        && result.customerInfo.entitlements.active && result.customerInfo.entitlements.active[ENTITLEMENT];
      if (active) {
        // RC webhook is the durable writer; refresh the local flag so the UI flips now.
        if (typeof refreshQuotaState === 'function') { await refreshQuotaState(); }
        if (window.showToast) showToast("You're Pro now — everything's unlocked ✓", 'success');
      }
    } catch (e) {
      // user-cancelled is not an error worth surfacing
      if (e && e.code === 'PURCHASE_CANCELLED') return;
      console.error('[iap] purchase failed', e);
      if (window.showToast) showToast('That purchase didn’t go through. No charge was made.', 'info');
    }
  }

  async function iapRestore() {
    try {
      var Purchases = await _rc();
      var info = await Purchases.restorePurchases();
      var active = info && info.customerInfo && info.customerInfo.entitlements
        && info.customerInfo.entitlements.active && info.customerInfo.entitlements.active[ENTITLEMENT];
      if (typeof refreshQuotaState === 'function') { await refreshQuotaState(); }
      if (window.showToast) showToast(active ? 'Pro restored ✓' : 'No previous purchase found on this Apple ID.', active ? 'success' : 'info');
    } catch (e) {
      console.error('[iap] restore failed', e);
      if (window.showToast) showToast('Couldn’t reach the App Store. Check your connection and try again.', 'info');
    }
  }

  window._iapPurchase = iapPurchase;
  window._iapRestore = iapRestore;
  // init after auth is ready so logIn has the user id
  if (window.certanvilSupabase) { iapInit(); }
  else { window.addEventListener('certanvil-auth-ready', iapInit, { once: true }); }
})();
```

> **Verify against current RevenueCat Capacitor docs at build time** — the SDK's exact method shapes (`configure`, `logIn`, `getOfferings`, `purchasePackage({aPackage})`, `restorePurchases`) and the error code for user-cancel can shift between major versions. The structure above is correct; confirm spellings.

- [ ] **Step 3: Load it only in the native shell (`index.html`)**

Near the end of `index.html` (after `app.js`), add a guarded loader so web users never download the IAP module:

```html
<script>
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
    var s = document.createElement('script'); s.src = 'app-iap.js'; s.defer = true;
    document.head.appendChild(s);
  }
</script>
```

- [ ] **Step 4: Verify in the iOS simulator / TestFlight (sandbox)**

Build the iOS app (`npx cap run ios`), sign in with a **sandbox Apple ID**, tap a Go-Pro CTA → Apple's sheet appears → buy → entitlement `pro` active → the quota chip flips to Pro. (Sandbox subscriptions renew on an accelerated schedule — expected.)

- [ ] **Step 5: Commit**

```bash
git add app-iap.js index.html
git commit -m "feat(g3): RevenueCat purchase + restore wiring (native-only load, RC app-user-id = Supabase id)"
```

---

## Task 3: RevenueCat → Supabase webhook (reuses the atomic RPC)

**Files:**
- Create: `landing/api/revenuecat/webhook.js`

- [ ] **Step 1: Write the webhook**

```js
// landing/api/revenuecat/webhook.js
// Receives RevenueCat events and projects them into Supabase by reusing the
// hardening plan's atomic RPC with provider='apple'. RevenueCat already did the
// receipt validation, so we trust a signature-checked RC event.
const { callRpc } = require('../stripe/_supabase');

export const config = { runtime: 'nodejs' };

module.exports.default = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected) return res.status(503).end();                       // graceful-503 (gated-lane rule)
  if ((req.headers.authorization || '') !== expected) return res.status(401).end();

  const body = req.body && req.body.event ? req.body.event : req.body;
  if (!body || !body.id) return res.status(400).end();

  // Map RC event -> entitlement row. (Verify field names against current RC webhook docs.)
  const type = body.type;                                            // INITIAL_PURCHASE | RENEWAL | UNCANCELLATION | CANCELLATION | EXPIRATION | PRODUCT_CHANGE | BILLING_ISSUE
  const active = ['INITIAL_PURCHASE','RENEWAL','UNCANCELLATION','PRODUCT_CHANGE','NON_RENEWING_PURCHASE'].includes(type);
  const revoked = (type === 'CANCELLATION' && body.cancel_reason === 'CUSTOMER_SUPPORT') /* refund */;
  const row = {
    user_id: body.app_user_id,
    provider: 'apple',
    original_transaction_id: body.original_transaction_id || body.transaction_id || null,
    provider_subscription_id: body.transaction_id || body.original_transaction_id || null,
    product_id: body.product_id || null,
    tier: active ? 'pro' : 'free',
    status: active ? 'active' : (type === 'EXPIRATION' ? 'expired' : (revoked ? 'revoked' : 'canceled')),
    current_period_end: body.expiration_at_ms ? new Date(body.expiration_at_ms).toISOString() : null,
    environment: (body.environment === 'SANDBOX') ? 'sandbox' : 'production',
    revoked_at: revoked ? new Date(body.event_timestamp_ms || Date.now()).toISOString() : null,
    last_event_at: new Date(body.event_timestamp_ms || Date.now()).toISOString(),
  };
  if (!row.user_id) return res.status(200).json({ received: true, skipped: 'no app_user_id' });

  try {
    const result = await callRpc('apply_provider_subscription_event',
      { p_event_id: 'rc_' + body.id, p_event_type: 'rc.' + type, p_row: row });
    return res.status(200).json({ received: true, result });
  } catch (e) {
    console.error('[rc-webhook] apply failed:', e && (e.message || String(e)));
    return res.status(500).end();                                    // RC retries; nothing committed
  }
};
```

> The RPC uses the `stripe_events` table for idempotency — treat it as the generic provider-event log (RC event ids are namespaced `rc_…`). If you prefer, rename that table `provider_events` in the hardening migration; not required for correctness.

- [ ] **Step 2: Point RevenueCat at the webhook (founder)**

RevenueCat → Project → Webhooks → URL `https://certanvil.com/api/revenuecat/webhook`, Authorization header = the R0.4 secret. Send a test event.

- [ ] **Step 3: Verify on the branch/preview**

After a sandbox purchase (Task 2), confirm in the branch DB: a `provider_subscriptions` row with `provider='apple'`, `tier='pro'`, `status='active'`, `environment='sandbox'`; `is_pro(user)` true. Trigger a sandbox cancellation/expiration → row flips and `is_pro` false. Re-send the same RC event → `{result:'duplicate'}`, no second row.

- [ ] **Step 4: Commit**

```bash
git add landing/api/revenuecat/webhook.js
git commit -m "feat(g3): RevenueCat webhook -> apply_provider_subscription_event (provider=apple)"
```

---

## Task 4: Restore Purchases button (Apple requirement) + server-side already-Pro guard

**Files:**
- Modify: iOS Settings surface in `index.html` / `app.js` (wherever the account/settings list renders)
- Modify: `landing/api/stripe/create-checkout-session.js`

- [ ] **Step 1: Add the Restore button (native only)**

In the Settings/account list, render a "Restore Purchases" row **only when `_isNativeIOS()`**, wired to `window._iapRestore()`:

```js
if (_isNativeIOS()) {
  // append a settings row: label "Restore Purchases", onclick -> window._iapRestore()
  // (match the existing settings-row markup/classes)
}
```

> Apple commonly rejects subscription apps that lack a visible Restore Purchases control. It is required even though re-login already restores Pro from the shared account.

- [ ] **Step 2: Add the server-side already-Pro guard to web checkout (PHASE-G decision 8)**

In `create-checkout-session.js`, after resolving `user`, before creating the session, refuse to start checkout for an already-Pro account:

```js
  // PHASE-G decision 8 — never start a charge for an already-Pro account.
  const proCheck = await callRpc('is_pro', { uid: user.id });   // returns boolean
  if (proCheck === true) return res.status(409).json({ error: 'already_pro' });
```

(The client coordinator already does a UX-level check; this is the authoritative server stop. Add `callRpc` to the import from `./_supabase`.)

- [ ] **Step 3: Verify** — native: the Restore row appears only on iOS and re-grants Pro from Apple's record. Web: starting checkout as a Pro user returns `409 already_pro` and the coordinator shows "You're already Pro ✓".

- [ ] **Step 4: Commit**

```bash
git add index.html app.js landing/api/stripe/create-checkout-session.js
git commit -m "feat(g3): Restore Purchases (iOS) + server-side already-Pro guard on checkout"
```

---

## Task 5: Ship + App Store review checklist

- [ ] **Step 1: Bump + gate**

```bash
node scripts/bump-version.js <next> "G3: iOS Pro via RevenueCat + Go-Pro purchase coordinator"
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js && node tests/tech-debt.js
```

Add a UAT structural pin asserting **no `https://certanvil.com/pricing` anchor remains as a purchase CTA** in `app.js` (grep the source) — the regression guard for the 3.1.1 fix.

- [ ] **Step 2: PR + preview smoke** (gated lane) — web purchase + already-Pro 409 + (TestFlight) iOS purchase + restore + RC webhook 200s + duplicate dedupe.

- [ ] **Step 3: App Store submission checklist** (verify BEFORE submitting):
  - No external purchase links anywhere in the native app (Step 1 grep pin).
  - Restore Purchases control visible (Task 4).
  - Sign in with Apple present (G-2; required by Guideline 4.8 once Google login exists).
  - Account deletion present (shipped v7.45.0).
  - Subscription products + screenshots filled in App Store Connect (R0.2).
  - Run the GO-LIVE Supabase flip (`app_config.onboarding_enabled=true`) per `docs/mobile/APP_STORE_DISTRIBUTION.md` §GO-LIVE.

- [ ] **Step 4: Merge → live** — squash-merge; set live RevenueCat + App Store Connect production config; submit the build for review.

---

## Self-review

**Spec coverage:** App Store 3.1.1 blocker → Task 1 coordinator + CTA replacement (+ Step-1 grep pin). iOS purchase → Task 2 RevenueCat. Entitlement into shared account → Task 3 webhook reusing `apply_provider_subscription_event(provider='apple')`. Restore (Apple requirement, PHASE-G D12) → Task 4. Already-Pro guard (PHASE-G D8) → Task 4 Step 2, server-side. RevenueCat decision (2026-06-26) honoured throughout. ✅

**Honesty flags (not placeholders):** RevenueCat SDK method shapes (Task 2) and webhook field names (Task 3) are marked "verify against current RC docs" because those exact spellings/version-specifics must be confirmed at build time; the control flow and mapping are concrete. The Capacitor shell + RC dashboard config are founder prerequisites (R0), not code.

**Type/name consistency:** `startProUpgrade(billingPeriod)`, `_isNativeIOS()`, `window._iapPurchase`/`window._iapRestore`, entitlement id `pro`, RC app-user-id = Supabase `user.id`, webhook → `apply_provider_subscription_event` with the same row keys the hardening RPC reads (`user_id, provider, original_transaction_id, provider_subscription_id, product_id, tier, status, current_period_end, environment, revoked_at, last_event_at`). ✅

**Reused, not rebuilt:** the G-1 `startProCheckout` (web branch), the hardening `apply_provider_subscription_event` RPC + `callRpc` helper + `provider_subscriptions` schema, the existing `_quotaState`/`refreshQuotaState` + `_showProOnlyUI` gate surfaces. iOS adds a branch and a webhook; it does not fork the entitlement model.
