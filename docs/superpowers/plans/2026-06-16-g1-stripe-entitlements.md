---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan, saas-gated]
---
# G1 — Stripe Web Payments + Entitlement Activation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user buy CertAnvil Pro (web/Stripe), and flip their entitlement to `tier=pro` so existing Pro gating (`is_pro()`, quota chip, drill unlocks) activates — using the DB foundation that already exists.

**Architecture:** Three Vercel serverless endpoints under `landing/api/stripe/` — **create-checkout-session** (hosted Stripe Checkout), **webhook** (the *only* writer to `subscriptions`, idempotent via `stripe_events`), **create-portal-session** (Stripe Customer Portal for manage/cancel). The client "Go Pro" CTA calls checkout → Stripe-hosted page → redirect back → re-hydrate quota so the UI flips. **No new DB migration** — `subscriptions`, `stripe_events`, `is_pro()`, `get_daily_quota_usage()` already exist (`20260509_phase_e_subscriptions.sql`).

**Tech Stack:** Vercel serverless (Node runtime for Stripe endpoints — see Decision 2), Stripe Node SDK + Checkout + Customer Portal + Webhooks, Supabase REST (service-role) for the `subscriptions` upsert, existing vanilla-JS client.

**Lane:** GATED (money + auth + entitlements). Feature branch → PR (auto-spins branch DB + Vercel preview) → smoke-test on the preview with Stripe **test mode** → squash-merge → set live env vars → prod. Per `ENVIRONMENT_STRATEGY.md`.

---

## Key decisions (made before tasks)

**Decision 1 — Hosted Stripe Checkout, not embedded/custom.** Lowest PCI + code surface for a solo founder; Stripe hosts the card form. We pass `client_reference_id = supabase user_id` so the webhook can map payment → user.

**Decision 2 — Stripe endpoints run on the Node runtime, NOT edge.** Your other `landing/api/*` endpoints are edge (`runtime: 'edge'`), but Stripe webhook signature verification is far simpler with the standard Node SDK + raw body (`stripe.webhooks.constructEvent`). Edge requires `constructEventAsync` + SubtleCrypto provider — more moving parts on the highest-stakes endpoint. So these three files set `export const config = { runtime: 'nodejs' }` (or `api: { bodyParser: false }` on the webhook to preserve the raw body).

**Decision 3 — The webhook is the single source of truth.** Client never writes tier. On `checkout.session.completed` + `customer.subscription.*`, the webhook upserts `subscriptions`. Client just re-reads `get_daily_quota_usage` after returning from Checkout.

**Decision 4 — Graceful-503 on missing env vars** (matches the repo's fail-soft convention + the gated-lane rule). If `STRIPE_SECRET_KEY` is absent, endpoints return 503 so a pre-config deploy never throws.

**Decision 5 — Pricing from the built mockup:** Pro Annual **$89/yr**, Pro Monthly **$9.99/mo**. The `pass_guarantee_extended_at` column + pass-guarantee logic is **out of scope for G1** (deferred — see §Out of scope).

---

## ⛔ PREREQUISITE GATE — founder-only manual setup (cannot be coded)

These are **your** dashboard actions. The code tasks below are inert until these exist. Do them in **test mode** first; repeat in live mode at launch (`ENVIRONMENT_STRATEGY.md` §"Stripe environment hygiene").

- [ ] **G0.1** Create a Stripe account; complete business profile.
- [ ] **G0.2** Create two **Products** with recurring **Prices**: "CertAnvil Pro — Annual" ($89/yr) and "CertAnvil Pro — Monthly" ($9.99/mo). Copy both **Price IDs** (`price_…`).
- [ ] **G0.3** Enable the **Customer Portal** (Stripe Dashboard → Settings → Billing → Customer portal) and configure allowed actions (cancel, switch plan, update card).
- [ ] **G0.4** Grab **test-mode** keys: `sk_test_…` (secret), `pk_test_…` (publishable — not strictly needed for hosted Checkout but copy it).
- [ ] **G0.5** After the webhook endpoint deploys to a Preview URL (Task 2), create a **Webhook endpoint** in Stripe pointing at `https://<preview>/api/stripe/webhook`, subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy the **signing secret** (`whsec_…`).
- [ ] **G0.6** Install the **Stripe CLI** locally (`brew install stripe/stripe-cli/stripe`; `stripe login`) — used to forward + trigger events during local testing.
- [ ] **G0.7** Set env vars in the **certanvil-landing** Vercel project (Preview scope = test keys; Production scope = live keys, set later): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_MONTHLY`, and confirm `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are present.

**STOP CONDITION:** G0.1–G0.4, G0.6, G0.7 done before Task 1; G0.5 done after Task 2 deploys a preview. Never put live keys in Preview scope or test keys in Production scope.

---

## Pre-flight

- [ ] **P.1** Run `/review-feature` on this plan (3+ files, money, auth, schema-adjacent → multi-engineer review is mandatory per CLAUDE.md). Apply synthesis before coding.
- [ ] **P.2** Create the feature branch (gated lane):

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
git checkout main && git pull
git checkout -b feat/g1-stripe-entitlements
```

- [ ] **P.3** Add the Stripe SDK to the landing project deps:

```bash
cd landing && npm install stripe   # (if landing has no package.json yet, npm init -y first, matching Vercel project root)
```

Expected: `stripe` appears in `landing/package.json` dependencies.

---

## File structure

- Create: `landing/api/stripe/create-checkout-session.js` — starts a hosted Checkout Session for a signed-in user.
- Create: `landing/api/stripe/webhook.js` — verifies signature, dedupes via `stripe_events`, upserts `subscriptions`.
- Create: `landing/api/stripe/create-portal-session.js` — opens the Stripe Customer Portal for an existing customer.
- Create: `landing/api/stripe/_supabase.js` — tiny shared helper: service-role upsert/select against Supabase REST (so the three endpoints don't duplicate fetch boilerplate).
- Modify: `app.js` — add `startProCheckout(billingPeriod)` + `openBillingPortal()`; wire to the existing `.pro-lock-pill` upsell; on return-from-Checkout (`?checkout=success`), call the existing quota refresh so the chip flips.
- Modify: `landing/package.json` — add `stripe` dep.

---

## Task 1: Checkout session endpoint

**Files:**
- Create: `landing/api/stripe/_supabase.js`
- Create: `landing/api/stripe/create-checkout-session.js`

- [ ] **Step 1: Write the shared Supabase helper**

```js
// landing/api/stripe/_supabase.js
// Service-role Supabase REST helpers for the Stripe endpoints. The webhook is
// the only writer to `subscriptions`; these run server-side with the service
// role key (never shipped to the client).
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://appmuaqwuethndvalarl.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function svcHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: 'Bearer ' + SERVICE_KEY,
    'Content-Type': 'application/json',
  };
}

// Upsert a subscriptions row (webhook is the only caller). Conflict target = user_id (PK).
async function upsertSubscription(row) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/subscriptions?on_conflict=user_id', {
    method: 'POST',
    headers: { ...svcHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  });
  if (!resp.ok) throw new Error('subscriptions upsert ' + resp.status + ': ' + (await resp.text()));
}

// Idempotency: insert event_id; if it already exists, Postgres returns 409 → already processed.
async function markEventProcessed(eventId, eventType) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/stripe_events', {
    method: 'POST',
    headers: { ...svcHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ event_id: eventId, event_type: eventType }),
  });
  if (resp.status === 409) return false; // duplicate — already handled
  if (!resp.ok) throw new Error('stripe_events insert ' + resp.status + ': ' + (await resp.text()));
  return true;
}

// Look up an existing stripe_customer_id for a user (so we reuse customers).
async function getCustomerId(userId) {
  const resp = await fetch(
    SUPABASE_URL + '/rest/v1/subscriptions?user_id=eq.' + userId + '&select=stripe_customer_id',
    { headers: svcHeaders() }
  );
  if (!resp.ok) return null;
  const rows = await resp.json();
  return (rows[0] && rows[0].stripe_customer_id) || null;
}

module.exports = { upsertSubscription, markEventProcessed, getCustomerId, SUPABASE_URL, svcHeaders };
```

- [ ] **Step 2: Write the checkout endpoint**

```js
// landing/api/stripe/create-checkout-session.js
// Starts a hosted Stripe Checkout Session for a signed-in user. The client
// passes the user's Supabase access token (Authorization: Bearer) + the desired
// billing period; we resolve the user, then create the session with
// client_reference_id = user_id so the webhook can map payment → user.
const Stripe = require('stripe');
const { getCustomerId, SUPABASE_URL, svcHeaders } = require('./_supabase');

export const config = { runtime: 'nodejs' };

const ORIGIN_ALLOW = new Set(['https://certanvil.com', 'https://networkplus.certanvil.com']);

module.exports.default = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return res.status(503).json({ error: 'payments not configured' }); // Decision 4

  // Resolve the user from their Supabase access token (sent by the client).
  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'sign in required' });

  const userResp = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + token },
  });
  if (!userResp.ok) return res.status(401).json({ error: 'invalid session' });
  const user = await userResp.json();
  if (!user || !user.id) return res.status(401).json({ error: 'invalid session' });

  const period = (req.body && req.body.billingPeriod) === 'annual' ? 'annual' : 'monthly';
  const priceId = period === 'annual' ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;
  if (!priceId) return res.status(503).json({ error: 'price not configured' });

  const origin = req.headers.origin && ORIGIN_ALLOW.has(req.headers.origin)
    ? req.headers.origin : 'https://networkplus.certanvil.com';

  const stripe = new Stripe(secret);
  try {
    const existingCustomer = await getCustomerId(user.id);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer: existingCustomer || undefined,
      customer_email: existingCustomer ? undefined : user.email,
      metadata: { supabase_user_id: user.id, billing_period: period },
      subscription_data: { metadata: { supabase_user_id: user.id } },
      success_url: origin + '/?checkout=success',
      cancel_url: origin + '/?checkout=cancel',
      allow_promotion_codes: true,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('[stripe-checkout]', e && (e.message || String(e)));
    return res.status(500).json({ error: 'checkout failed' });
  }
};
```

- [ ] **Step 3: Verify locally with the Stripe CLI**

Run (after `vercel dev` or a preview deploy, with test env vars set):

```bash
# From a browser console on the preview, signed in, grab the access token:
#   (await window.certanvilSupabase.auth.getSession()).data.session.access_token
curl -s -X POST https://<preview>/api/stripe/create-checkout-session \
  -H "Authorization: Bearer <ACCESS_TOKEN>" -H "Content-Type: application/json" \
  -d '{"billingPeriod":"monthly"}'
```

Expected: JSON `{ "url": "https://checkout.stripe.com/c/pay/cs_test_…" }`. Opening that URL shows the hosted Checkout for $9.99/mo. With no `STRIPE_SECRET_KEY` set: `503 {"error":"payments not configured"}`.

- [ ] **Step 4: Commit**

```bash
git add landing/api/stripe/_supabase.js landing/api/stripe/create-checkout-session.js landing/package.json
git commit -m "feat(g1): Stripe hosted-checkout session endpoint + service-role helper"
```

---

## Task 2: Webhook handler (the only writer to `subscriptions`)

**Files:**
- Create: `landing/api/stripe/webhook.js`

- [ ] **Step 1: Write the webhook**

```js
// landing/api/stripe/webhook.js
// The ONLY writer to `subscriptions`. Verifies the Stripe signature against the
// raw body, dedupes by event_id (stripe_events), and upserts tier/status.
const Stripe = require('stripe');
const { upsertSubscription, markEventProcessed } = require('./_supabase');

// Node runtime + raw body required for signature verification.
export const config = { runtime: 'nodejs', api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports.default = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) return res.status(503).end(); // Decision 4

  const stripe = new Stripe(secret);
  const raw = await readRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (e) {
    console.error('[stripe-webhook] bad signature:', e && e.message);
    return res.status(400).send('bad signature'); // do NOT 200 a forged event
  }

  // Idempotency — if we've seen this event_id, ack and stop.
  try {
    const fresh = await markEventProcessed(event.id, event.type);
    if (!fresh) return res.status(200).json({ received: true, duplicate: true });
  } catch (e) {
    console.error('[stripe-webhook] idempotency write failed:', e && e.message);
    return res.status(500).end(); // let Stripe retry rather than silently drop
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const userId = s.client_reference_id || (s.metadata && s.metadata.supabase_user_id);
      const period = (s.metadata && s.metadata.billing_period) || null;
      if (userId && s.subscription) {
        const sub = await stripe.subscriptions.retrieve(s.subscription);
        await upsertSubscription({
          user_id: userId,
          stripe_customer_id: s.customer,
          stripe_subscription_id: s.subscription,
          tier: 'pro',
          status: sub.status,
          billing_period: period,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        });
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const userId = sub.metadata && sub.metadata.supabase_user_id;
      if (userId) {
        const active = ['active', 'trialing'].includes(sub.status);
        await upsertSubscription({
          user_id: userId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          tier: active ? 'pro' : 'free',  // is_pro() also checks status, but keep tier coherent
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        });
      }
    }
    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('[stripe-webhook] handler error:', e && (e.message || String(e)));
    return res.status(500).end(); // Stripe will retry
  }
};
```

- [ ] **Step 2: Deploy a preview, then register the webhook (founder step G0.5)**

Push the branch; the PR auto-spins a Vercel preview. Create the Stripe webhook pointing at `https://<preview>/api/stripe/webhook` and copy `whsec_…` into the Preview env (`STRIPE_WEBHOOK_SECRET`). Redeploy so the var is picked up.

- [ ] **Step 3: Verify with a real test purchase + CLI forwarding**

```bash
stripe listen --forward-to https://<preview>/api/stripe/webhook   # or test against the registered endpoint
stripe trigger checkout.session.completed
```

Then do a real **test-mode** checkout via the Task-1 URL with Stripe's test card `4242 4242 4242 4242`. Verify in the **branch DB** (Supabase branch → SQL editor):

```sql
select user_id, tier, status, billing_period, current_period_end from subscriptions;
-- expect one row: tier=pro, status=active
select is_pro('<that-user-id>');  -- expect true
```

Re-send the same event from the Stripe dashboard → confirm the second delivery returns `{duplicate:true}` and does NOT create a second row.

- [ ] **Step 4: Commit**

```bash
git add landing/api/stripe/webhook.js
git commit -m "feat(g1): Stripe webhook — signature verify, idempotent subscriptions upsert"
```

---

## Task 3: Customer Portal endpoint (manage/cancel)

**Files:**
- Create: `landing/api/stripe/create-portal-session.js`

- [ ] **Step 1: Write the portal endpoint**

```js
// landing/api/stripe/create-portal-session.js
// Opens the Stripe Customer Portal so a Pro user can switch plan / update card /
// cancel. Backs the manage-subscription screen's "manage with Apple/Stripe" handoff.
const Stripe = require('stripe');
const { getCustomerId, SUPABASE_URL } = require('./_supabase');

export const config = { runtime: 'nodejs' };

module.exports.default = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return res.status(503).json({ error: 'payments not configured' });

  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'sign in required' });

  const userResp = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + token },
  });
  if (!userResp.ok) return res.status(401).json({ error: 'invalid session' });
  const user = await userResp.json();

  const customerId = await getCustomerId(user.id);
  if (!customerId) return res.status(404).json({ error: 'no subscription' });

  const origin = req.headers.origin || 'https://networkplus.certanvil.com';
  const stripe = new Stripe(secret);
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: origin + '/?from=portal',
    });
    return res.status(200).json({ url: portal.url });
  } catch (e) {
    console.error('[stripe-portal]', e && (e.message || String(e)));
    return res.status(500).json({ error: 'portal failed' });
  }
};
```

- [ ] **Step 2: Verify** — POST with a Pro user's token returns a `billing.stripe.com` URL; a free user (no customer) returns `404 {"error":"no subscription"}`.

- [ ] **Step 3: Commit**

```bash
git add landing/api/stripe/create-portal-session.js
git commit -m "feat(g1): Stripe customer-portal session endpoint"
```

---

## Task 4: Client wiring — Go Pro + return-from-checkout refresh

**Files:**
- Modify: `app.js` (add two functions near the quota-chip code around `app.js:453-568`; wire the existing `.pro-lock-pill`)

- [ ] **Step 1: Add the checkout + portal client functions**

```js
// --- G1: Stripe checkout entry points -------------------------------------
// startProCheckout posts the user's access token to the checkout endpoint and
// redirects to Stripe's hosted page. openBillingPortal does the same for manage.
async function startProCheckout(billingPeriod) {
  try {
    var sess = (await window.certanvilSupabase.auth.getSession()).data.session;
    if (!sess) { /* not signed in — route to sign-in */ return; }
    var resp = await fetch('https://certanvil.com/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + sess.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ billingPeriod: billingPeriod === 'annual' ? 'annual' : 'monthly' }),
    });
    var data = await resp.json();
    if (data && data.url) { window.location.href = data.url; }
  } catch (e) { console.error('[g1] checkout start failed', e); }
}

async function openBillingPortal() {
  try {
    var sess = (await window.certanvilSupabase.auth.getSession()).data.session;
    if (!sess) return;
    var resp = await fetch('https://certanvil.com/api/stripe/create-portal-session', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + sess.access_token, 'Content-Type': 'application/json' },
    });
    var data = await resp.json();
    if (data && data.url) { window.location.href = data.url; }
  } catch (e) { console.error('[g1] portal open failed', e); }
}
```

(NOTE on endpoint host: the Stripe endpoints live in the **certanvil-landing** Vercel project, served at `certanvil.com/api/stripe/*`. The quiz app calls them cross-origin — add `networkplus.certanvil.com` to each endpoint's CORS/allow set if the browser blocks it; hosted-Checkout redirects are top-level navigations so the POST is the only cross-origin call.)

- [ ] **Step 2: Wire the existing pro-lock upsell to checkout**

Find the `.pro-lock-pill` click handler (near `_renderQuotaChip`, ~`app.js:551-568`). On click, instead of (or in addition to) the current tooltip, surface the upgrade choice and call `startProCheckout('annual'|'monthly')`. (Full paywall UI is Task 5's dependency — see Out of scope; minimum viable: a two-button confirm.)

- [ ] **Step 3: Refresh entitlement on return from Checkout**

At the existing post-auth hydrate point, add: if `new URLSearchParams(location.search).get('checkout') === 'success'`, call the existing quota refresh (the function that calls `get_daily_quota_usage` and repaints the chip — around `app.js:456-465`), then strip the query param. The webhook may land a beat after redirect, so retry the refresh once after ~2.5s.

```js
if (new URLSearchParams(location.search).get('checkout') === 'success') {
  await refreshQuotaChip();                 // existing function near app.js:456
  setTimeout(refreshQuotaChip, 2500);       // webhook race cushion
  history.replaceState({}, '', location.pathname);
}
```

- [ ] **Step 4: Verify on the preview** — sign in, click the pro-lock pill, complete a **test** checkout (`4242…`), land back on `/?checkout=success`. The quota chip flips from "Free" to Pro (unlimited) within ~3s without a manual reload. Confirm `is_pro()` true in the branch DB.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat(g1): client checkout/portal entry points + return-from-checkout quota refresh"
```

---

## Task 5: Version bump + gated-lane ship

- [ ] **Step 1: Bump version** (entitlement activation is contract-changing):

```bash
node scripts/bump-version.js <next> "G1: Stripe web payments activate Pro entitlement"
```

- [ ] **Step 2: Run the full gate**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js && node tests/tech-debt.js
```

Expected: UAT all-pass (update version pins per SHIP_CHECKLIST §2.2 if it complains), tech-debt no new breach.

- [ ] **Step 3: PR + smoke** — push branch, open PR, smoke-test the preview against the branch DB in **test mode** (full purchase + cancel-via-portal + duplicate-webhook). Self-sign the PR checklist.

- [ ] **Step 4: Merge → activate live** — squash-merge. Then in Vercel **Production** scope set the **live** keys (`sk_live_…`, live `whsec_…`, live price IDs), register the **live** webhook at `https://certanvil.com/api/stripe/webhook`, redeploy. Do a single real (or $0 coupon) live purchase to confirm, then refund.

- [ ] **Step 5: Post-deploy verify** — per CLAUDE.md, drive prod in a real browser: sign in, buy (test card if still test, else real), confirm tier flips. Watch Stripe Dashboard → Events for webhook 200s.

---

## Self-review

**Spec coverage:** G1 from the Phase G decomposition = "Stripe web payments + entitlement system (#136)". Covered: checkout (T1), webhook→subscriptions (T2), portal/manage (T3), client wiring + UI flip (T4), ship (T5). The DB layer pre-exists (no migration). ✅

**Placeholder scan:** No TBD/TODO. Two explicit deferrals called out (paywall UI lift, pass-guarantee) in Out of scope, not hidden as placeholders. ✅

**Type/name consistency:** `subscriptions` columns used in the webhook upsert (`user_id, stripe_customer_id, stripe_subscription_id, tier, status, billing_period, current_period_end, cancel_at_period_end`) all match `20260509_phase_e_subscriptions.sql`. `is_pro()` / `get_daily_quota_usage()` signatures match. `client_reference_id` set in T1 is read in T2. ✅

**Known gap to resolve during execution:** Task 4 Step 2 assumes a `.pro-lock-pill` click handler exists to hook; if the live upsell entry is thinner than expected, the **paywall UI lift becomes a hard dependency** (see Out of scope) — surface it at that step rather than faking a hook.

---

## Out of scope (G1) — explicit deferrals

- **Paywall / upgrade-sheet UI lift** (`onboarding-upgrade-sheet.html` → live app). G1 ships a minimal two-button upgrade trigger; the full designed paywall is a sibling task. If the `.pro-lock-pill` hook is too thin, this gets pulled forward.
- **Pass-guarantee** logic (`pass_guarantee_extended_at`) — the "pass your cert or money back" flow from the manage-subscription mockup.
- **Apple IAP / restore-purchases** — that's G5/G6 (RevenueCat), gated behind this.
- **Proration / plan-switch UI** beyond what the Stripe Customer Portal provides out of the box.
- **Dunning / past_due email flows** — Stripe handles retries; custom comms deferred.
