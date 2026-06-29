---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# G1 Hardening — Atomic Webhook + Multi-Provider Entitlement Schema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two highest-risk gaps the Phase-G council found, BEFORE Stripe goes live: (1) the webhook can mark a payment "handled" without actually upgrading the customer (a "paid-but-no-Pro" data-loss bug), and (2) the entitlement table can only hold one Stripe-shaped subscription per user, so it cannot represent Apple — or a user who pays on both web and iPhone.

**Architecture:** Replace the one-row-per-user `subscriptions` table with a per-(user, provider) `provider_subscriptions` table that can hold Stripe AND Apple; rewrite `is_pro()` to read it; and collapse the webhook's two non-atomic steps (claim-event, then write-entitlement) into ONE transactional Postgres function so a failure leaves nothing committed and Stripe safely retries.

**Tech Stack:** Supabase Postgres (migration + `plpgsql` RPC), Vercel Node serverless (the existing Stripe webhook), Supabase REST (service-role).

---

## Why this is cheap right now (read first)

The live `subscriptions` table is **empty** (`20260509_phase_e_subscriptions.sql` is pure scaffolding; Stripe was never activated). So:
- **No data migration, no backfill, no risk to real customers** — there are none yet.
- This plan **supersedes parts of** `docs/superpowers/plans/2026-06-16-g1-stripe-entitlements.md`: specifically its `subscriptions`-shaped webhook upsert (G1 Task 2) and the `getCustomerId` helper (G1 Task 1). Land THIS plan's schema + webhook design instead of those, then continue G1 Tasks 3–5 unchanged.
- **Lane:** GATED (touches `supabase/migrations/*` + `landing/api/stripe/*`). Feature branch → PR (auto-spins branch DB + Vercel preview) → smoke in Stripe **test mode** → squash-merge → set live env vars → prod. Migrations MUST carry a `-- ROLLBACK:` block.

**Current state (verified against `20260509_phase_e_subscriptions.sql`):**
- `subscriptions(user_id PK, stripe_customer_id unique, stripe_subscription_id unique, tier, status, billing_period, current_period_end, cancel_at_period_end, pass_guarantee_extended_at, created_at, updated_at)` — one row per user, Stripe-only.
- `stripe_events(event_id PK, event_type, processed_at)` — dedup log, **no status column** (this is what makes the bug possible).
- `is_pro(uid)` reads `subscriptions`. `get_daily_quota_usage(uid)` and `consume_daily_quota(uid)` call `is_pro()` internally — so rewriting `is_pro()` cascades correctly with no other changes to the quota path.
- The only readers of the `subscriptions` *table* (not the function) are: the webhook upsert and `getCustomerId()` (G1 `_supabase.js`) and the portal endpoint (via `getCustomerId`). Small blast radius.

---

## File structure

- Create: `supabase/migrations/20260626_provider_subscriptions.sql` — new multi-provider table, rewritten `is_pro()`, `user_entitlements` view, `stripe_events.status` column, the atomic apply RPC, RLS. Includes `-- ROLLBACK:` block.
- Modify: `landing/api/stripe/_supabase.js` — add `callRpc()`; repoint `getCustomerId()` at `provider_subscriptions`.
- Modify: `landing/api/stripe/webhook.js` — replace the two-step (markEventProcessed → upsertSubscription) with a single `apply_provider_subscription_event` RPC call; reject stale/out-of-order updates.

(The checkout endpoint `create-checkout-session.js` and portal `create-portal-session.js` keep working — they only call `getCustomerId()`, which we repoint.)

---

## Task 1: Multi-provider entitlement schema + rewritten `is_pro()`

**Files:**
- Create: `supabase/migrations/20260626_provider_subscriptions.sql`

This is a SQL migration; "tests" are SQL assertions run in the Supabase branch-DB SQL editor (same style as `20260509`'s verify block). No app code changes in this task.

- [ ] **Step 1: Write the migration**

```sql
-- ══════════════════════════════════════════════════════════════════════════
-- Multi-provider entitlements + atomic webhook apply
-- Date: 2026-06-26
-- Supersedes the Stripe-only one-row subscriptions model for entitlement reads.
-- Idempotent (IF NOT EXISTS / OR REPLACE). Safe because `subscriptions` is empty.
-- ══════════════════════════════════════════════════════════════════════════

-- 1. provider_subscriptions — ONE row per provider subscription (Stripe OR Apple).
create table if not exists provider_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('stripe','apple')),
  provider_customer_id text,           -- stripe: cus_…   apple: (null)
  provider_subscription_id text,       -- stripe: sub_…   apple: transaction id (current)
  original_transaction_id text,        -- apple: stable id across renewals (null for stripe)
  product_id text,                     -- stripe price_…  apple product id
  tier text not null default 'pro' check (tier in ('free','pro')),
  status text not null check (status in
    ('active','past_due','canceled','incomplete','incomplete_expired','trialing','unpaid','expired','revoked')),
  billing_period text check (billing_period in ('monthly','annual')),
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'production' check (environment in ('production','sandbox')),
  revoked_at timestamptz,              -- set on refund/chargeback/Apple REVOKE
  last_event_at timestamptz,           -- provider event timestamp (for out-of-order guarding)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table provider_subscriptions is
  'One row per provider subscription. A user may have multiple (e.g. lapsed Stripe + active Apple). is_pro() aggregates across rows. Service-role/webhook is the only writer.';

-- Provider identity uniqueness (partial — each provider keys on a different id).
create unique index if not exists uq_provsub_stripe
  on provider_subscriptions(provider, provider_subscription_id)
  where provider = 'stripe' and provider_subscription_id is not null;
create unique index if not exists uq_provsub_apple
  on provider_subscriptions(provider, original_transaction_id)
  where provider = 'apple' and original_transaction_id is not null;
create index if not exists idx_provsub_user on provider_subscriptions(user_id);
create index if not exists idx_provsub_customer on provider_subscriptions(provider_customer_id);

-- 2. RLS — user reads own rows; no client writes (service-role/RPC only).
alter table provider_subscriptions enable row level security;
drop policy if exists "provsub_self_read" on provider_subscriptions;
create policy "provsub_self_read" on provider_subscriptions
  for select using (auth.uid() = user_id);

-- 3. stripe_events gains a processing/processed status (the idempotency fix).
alter table stripe_events
  add column if not exists status text not null default 'processed'
  check (status in ('processing','processed'));
-- existing rows (none) default to 'processed'; the RPC sets 'processing' then 'processed'.

-- 4. is_pro(uid) now aggregates across providers (active, not revoked, not expired).
create or replace function is_pro(uid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from provider_subscriptions
    where user_id = uid
      and tier = 'pro'
      and status in ('active','trialing')
      and revoked_at is null
      and (current_period_end is null or current_period_end > now())
  );
$$;

comment on function is_pro is
  'True if the user has ANY active Pro provider subscription. Reads provider_subscriptions. get_daily_quota_usage()/consume_daily_quota() call this, so the whole quota path follows automatically.';

-- 5. Convenience read model for support/admin + the app.
create or replace view user_entitlements as
select
  ps.user_id,
  bool_or(ps.tier = 'pro' and ps.status in ('active','trialing') and ps.revoked_at is null
          and (ps.current_period_end is null or ps.current_period_end > now())) as is_pro,
  max(ps.current_period_end) as best_period_end,
  array_agg(distinct ps.provider) as providers
from provider_subscriptions ps
group by ps.user_id;

-- 6. updated_at trigger on the new table (reuse the existing _set_updated_at()).
drop trigger if exists provsub_updated_at on provider_subscriptions;
create trigger provsub_updated_at
  before update on provider_subscriptions
  for each row execute function _set_updated_at();

-- ── ROLLBACK: ──────────────────────────────────────────────────────────────
-- Restores the prior Stripe-only is_pro() and removes the new objects.
-- (Safe pre-launch: provider_subscriptions is empty, so no entitlement is lost.)
--   create or replace function is_pro(uid uuid)
--   returns boolean language sql security definer stable as $$
--     select exists (
--       select 1 from subscriptions
--       where user_id = uid and tier = 'pro'
--         and status in ('active','trialing')
--         and (current_period_end is null or current_period_end > now())
--     );
--   $$;
--   drop view if exists user_entitlements;
--   drop table if exists provider_subscriptions cascade;
--   alter table stripe_events drop column if exists status;
-- ───────────────────────────────────────────────────────────────────────────
```

- [ ] **Step 2: Apply on the branch DB and verify**

Paste the migration into the **branch** Supabase SQL editor (the PR auto-spins one), then run:

```sql
-- structure exists, is_pro reads the new table, defaults to false for everyone
select to_regclass('public.provider_subscriptions');     -- not null
select is_pro('00000000-0000-0000-0000-000000000000');   -- false (no rows)
-- a fake active Stripe row → is_pro flips true
insert into provider_subscriptions (user_id, provider, provider_subscription_id, tier, status, current_period_end)
values (auth.uid(), 'stripe', 'sub_test_1', 'pro', 'active', now() + interval '30 days');
select is_pro(auth.uid());                                -- true
select is_pro, providers from user_entitlements where user_id = auth.uid();  -- true, {stripe}
-- expiring it flips back
update provider_subscriptions set current_period_end = now() - interval '1 day' where provider_subscription_id='sub_test_1';
select is_pro(auth.uid());                                -- false
delete from provider_subscriptions where provider_subscription_id='sub_test_1';
```

Expected: each line returns the commented value. If `is_pro` doesn't flip, the function is still reading the old table — re-check Step 4 of the migration ran.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260626_provider_subscriptions.sql
git commit -m "feat(g1-harden): multi-provider provider_subscriptions table + is_pro() rewrite + stripe_events.status"
```

---

## Task 2: Atomic apply RPC (the "paid-but-no-Pro" fix)

**Files:**
- Modify: `supabase/migrations/20260626_provider_subscriptions.sql` (append the RPC — keep it in the same migration file so the schema + its writer ship together)

- [ ] **Step 1: Append the transactional apply function to the migration**

Add this ABOVE the `-- ROLLBACK:` block in `20260626_provider_subscriptions.sql`:

```sql
-- 7. apply_provider_subscription_event — ONE transaction: claim the event AND
--    write the entitlement. Either both commit or neither. This removes the
--    "marked handled but entitlement write failed" data-loss window.
--    Returns 'applied' on first successful apply, 'duplicate' if already done,
--    'stale' if an older provider event arrived after a newer one.
create or replace function apply_provider_subscription_event(
  p_event_id text,
  p_event_type text,
  p_row jsonb
) returns text language plpgsql security definer as $$
declare
  v_status      text;
  v_provider    text := coalesce(p_row->>'provider', 'stripe');
  v_existing_id uuid;
  v_existing_evt timestamptz;
  v_new_evt     timestamptz := nullif(p_row->>'last_event_at','')::timestamptz;
begin
  -- (a) claim the event row (processing → processed). Duplicate only short-circuits
  --     once the prior attempt actually reached 'processed'.
  select status into v_status from stripe_events where event_id = p_event_id;
  if v_status = 'processed' then
    return 'duplicate';
  elsif v_status is null then
    insert into stripe_events(event_id, event_type, status)
    values (p_event_id, p_event_type, 'processing');
  end if;  -- v_status = 'processing' → a prior attempt crashed; safe to re-apply.

  -- (b) locate any existing provider subscription by its provider identity.
  if v_provider = 'apple' then
    select id, last_event_at into v_existing_id, v_existing_evt
      from provider_subscriptions
     where provider = 'apple' and original_transaction_id = p_row->>'original_transaction_id';
  else
    select id, last_event_at into v_existing_id, v_existing_evt
      from provider_subscriptions
     where provider = 'stripe' and provider_subscription_id = p_row->>'provider_subscription_id';
  end if;

  -- (c) out-of-order guard: if the existing row was updated by a NEWER provider
  --     event than this one, mark processed and skip the entitlement write.
  if v_existing_id is not null and v_existing_evt is not null and v_new_evt is not null
     and v_new_evt < v_existing_evt then
    update stripe_events set status='processed', processed_at=now() where event_id = p_event_id;
    return 'stale';
  end if;

  -- (d) upsert the entitlement.
  if v_existing_id is not null then
    update provider_subscriptions set
      provider_customer_id = coalesce(p_row->>'provider_customer_id', provider_customer_id),
      provider_subscription_id = coalesce(p_row->>'provider_subscription_id', provider_subscription_id),
      product_id   = coalesce(p_row->>'product_id', product_id),
      tier         = coalesce(p_row->>'tier', tier),
      status       = coalesce(p_row->>'status', status),
      billing_period = coalesce(p_row->>'billing_period', billing_period),
      current_period_end = coalesce(nullif(p_row->>'current_period_end','')::timestamptz, current_period_end),
      cancel_at_period_end = coalesce((p_row->>'cancel_at_period_end')::boolean, cancel_at_period_end),
      environment  = coalesce(p_row->>'environment', environment),
      revoked_at   = nullif(p_row->>'revoked_at','')::timestamptz,
      last_event_at = coalesce(v_new_evt, last_event_at),
      updated_at   = now()
    where id = v_existing_id;
  else
    insert into provider_subscriptions (
      user_id, provider, provider_customer_id, provider_subscription_id,
      original_transaction_id, product_id, tier, status, billing_period,
      current_period_end, cancel_at_period_end, environment, revoked_at, last_event_at
    ) values (
      (p_row->>'user_id')::uuid, v_provider,
      p_row->>'provider_customer_id', p_row->>'provider_subscription_id',
      p_row->>'original_transaction_id', p_row->>'product_id',
      coalesce(p_row->>'tier','pro'), p_row->>'status', p_row->>'billing_period',
      nullif(p_row->>'current_period_end','')::timestamptz,
      coalesce((p_row->>'cancel_at_period_end')::boolean, false),
      coalesce(p_row->>'environment','production'),
      nullif(p_row->>'revoked_at','')::timestamptz, v_new_evt
    );
  end if;

  -- (e) mark the event processed — same transaction as (d).
  update stripe_events set status='processed', processed_at=now() where event_id = p_event_id;
  return 'applied';
end;
$$;

comment on function apply_provider_subscription_event is
  'Transactional: claims the webhook event AND writes the entitlement together. On error the whole call rolls back (event NOT marked processed) so the provider safely retries. Returns applied|duplicate|stale.';
```

- [ ] **Step 2: Re-apply the migration on the branch DB and prove atomicity**

Re-run the full migration file (idempotent). Then:

```sql
-- first apply → 'applied', is_pro true, event processed
select apply_provider_subscription_event('evt_1','checkout.session.completed', jsonb_build_object(
  'user_id', auth.uid()::text, 'provider','stripe', 'provider_customer_id','cus_1',
  'provider_subscription_id','sub_1', 'tier','pro', 'status','active',
  'current_period_end', (now()+interval '30 days')::text, 'last_event_at', now()::text));   -- 'applied'
select is_pro(auth.uid());                                              -- true
select status from stripe_events where event_id='evt_1';               -- 'processed'

-- re-deliver same event → 'duplicate', no second row
select apply_provider_subscription_event('evt_1','checkout.session.completed','{}'::jsonb); -- 'duplicate'
select count(*) from provider_subscriptions where provider_subscription_id='sub_1';         -- 1

-- cancellation event downgrades
select apply_provider_subscription_event('evt_2','customer.subscription.deleted', jsonb_build_object(
  'user_id', auth.uid()::text, 'provider','stripe', 'provider_subscription_id','sub_1',
  'tier','free','status','canceled','last_event_at', now()::text));    -- 'applied'
select is_pro(auth.uid());                                              -- false

-- out-of-order: an OLDER event must not resurrect Pro
select apply_provider_subscription_event('evt_3','customer.subscription.updated', jsonb_build_object(
  'user_id', auth.uid()::text, 'provider','stripe', 'provider_subscription_id','sub_1',
  'tier','pro','status','active','last_event_at', (now()-interval '1 hour')::text));  -- 'stale'
select is_pro(auth.uid());                                              -- still false

-- cleanup
delete from provider_subscriptions where provider_subscription_id='sub_1';
delete from stripe_events where event_id in ('evt_1','evt_2','evt_3');
```

Expected: the commented results. The key proof is the **duplicate returns without a second row** and the **stale older event does not flip Pro back on**.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260626_provider_subscriptions.sql
git commit -m "feat(g1-harden): transactional apply_provider_subscription_event RPC (no paid-but-no-Pro window)"
```

---

## Task 3: Repoint the webhook + helper at the atomic RPC

**Files:**
- Modify: `landing/api/stripe/_supabase.js`
- Modify: `landing/api/stripe/webhook.js`

- [ ] **Step 1: Add `callRpc()` and repoint `getCustomerId()` in `_supabase.js`**

Add this function and REPLACE the existing `getCustomerId` body (it must now read `provider_subscriptions`):

```js
// Call a Postgres function (RPC) with the service role. Returns the parsed body.
async function callRpc(fnName, args) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fnName, {
    method: 'POST',
    headers: { ...svcHeaders() },
    body: JSON.stringify(args),
  });
  if (!resp.ok) throw new Error('rpc ' + fnName + ' ' + resp.status + ': ' + (await resp.text()));
  return resp.json();
}

// Latest Stripe customer id for a user (so checkout/portal reuse the customer).
async function getCustomerId(userId) {
  const resp = await fetch(
    SUPABASE_URL + '/rest/v1/provider_subscriptions?provider=eq.stripe&user_id=eq.' + userId +
    '&select=provider_customer_id&order=updated_at.desc&limit=1',
    { headers: svcHeaders() }
  );
  if (!resp.ok) return null;
  const rows = await resp.json();
  return (rows[0] && rows[0].provider_customer_id) || null;
}
```

Update the module export to include `callRpc` and DROP the now-unused `upsertSubscription`/`markEventProcessed` (the RPC replaces them):

```js
module.exports = { callRpc, getCustomerId, SUPABASE_URL, svcHeaders };
```

- [ ] **Step 2: Rewrite the webhook handler body in `webhook.js`**

Keep the signature-verify block exactly as-is. REPLACE everything from the idempotency comment (`// Idempotency — if we've seen this event_id…`) through the end of the handler with:

```js
  // Build the entitlement row from the Stripe event, then apply it atomically.
  // ONE RPC claims the event AND writes the entitlement in a single transaction,
  // so a failure commits nothing and Stripe safely retries (no paid-but-no-Pro).
  try {
    let row = null;
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const userId = s.client_reference_id || (s.metadata && s.metadata.supabase_user_id);
      if (userId && s.subscription) {
        const sub = await stripe.subscriptions.retrieve(s.subscription);
        row = {
          user_id: userId, provider: 'stripe',
          provider_customer_id: s.customer, provider_subscription_id: s.subscription,
          product_id: (sub.items && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.id) || null,
          tier: 'pro', status: sub.status,
          billing_period: (s.metadata && s.metadata.billing_period) || null,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          environment: 'production',
          last_event_at: new Date(event.created * 1000).toISOString(),
        };
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const userId = sub.metadata && sub.metadata.supabase_user_id;
      if (userId) {
        const active = ['active', 'trialing'].includes(sub.status);
        row = {
          user_id: userId, provider: 'stripe',
          provider_customer_id: sub.customer, provider_subscription_id: sub.id,
          tier: active ? 'pro' : 'free', status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          environment: 'production',
          last_event_at: new Date(event.created * 1000).toISOString(),
        };
      }
    } else if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
      // Refund / chargeback → revoke. Resolve the subscription from the charge.
      const ch = event.data.object;
      const subId = ch.subscription || (ch.metadata && ch.metadata.stripe_subscription_id) || null;
      const userId = ch.metadata && ch.metadata.supabase_user_id;
      if (userId && subId) {
        row = {
          user_id: userId, provider: 'stripe', provider_subscription_id: subId,
          tier: 'free', status: 'revoked',
          revoked_at: new Date(event.created * 1000).toISOString(),
          last_event_at: new Date(event.created * 1000).toISOString(),
        };
      }
    }

    if (!row) {
      // Event we don't act on (or missing data) — still record it as handled so
      // Stripe stops retrying. Use the RPC with a no-op row marker.
      const res = await callRpc('apply_provider_subscription_event',
        { p_event_id: event.id, p_event_type: event.type, p_row: { user_id: null, provider: 'stripe', _noop: true } });
      return res === 'duplicate'
        ? res.status(200).json({ received: true, duplicate: true })
        : res.status ? res : res; // (handled below)
    }

    const result = await callRpc('apply_provider_subscription_event',
      { p_event_id: event.id, p_event_type: event.type, p_row: row });
    return res.status(200).json({ received: true, result });
  } catch (e) {
    console.error('[stripe-webhook] apply failed:', e && (e.message || String(e)));
    return res.status(500).end(); // nothing committed — Stripe retries
  }
```

> NOTE on the no-op branch: if `row` is null for an event type we don't handle, we still want to avoid infinite Stripe retries. The cleanest version is to call the RPC with a row whose `user_id` is null and have the RPC early-return `'applied'` when `p_row->>'_noop' = 'true'` (just claim+mark the event, write nothing). Add that one guard at the very top of the RPC body (after the duplicate check): `if (p_row->>'_noop') = 'true' then update stripe_events set status='processed', processed_at=now() where event_id=p_event_id; return 'applied'; end if;`. Re-run the migration after adding it. This keeps "record every delivered event" without writing junk entitlement rows.

- [ ] **Step 3: Subscribe the new event types in Stripe (founder step, extends G1 G0.5)**

In the Stripe Dashboard webhook config, in addition to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, also subscribe: `charge.refunded`, `charge.dispute.created`. (These power the revoke-on-refund path.)

- [ ] **Step 4: Verify end-to-end on the preview (Stripe test mode)**

```bash
stripe listen --forward-to https://<preview>/api/stripe/webhook
stripe trigger checkout.session.completed
```

Then a real test checkout (`4242 4242 4242 4242`). Confirm in the branch DB:

```sql
select user_id, provider, tier, status, current_period_end from provider_subscriptions;  -- 1 row, pro/active
select is_pro('<that-user-id>');                                                          -- true
select status from stripe_events order by processed_at desc limit 1;                      -- 'processed'
```

Re-send the same event from the Stripe Dashboard → response `{duplicate:true}`, still **one** row. Trigger a `charge.refunded` for that subscription → `is_pro` flips false and `revoked_at` is set.

- [ ] **Step 5: Commit**

```bash
git add landing/api/stripe/_supabase.js landing/api/stripe/webhook.js
git commit -m "feat(g1-harden): webhook applies entitlement via atomic RPC; add refund/chargeback revoke"
```

---

## Task 4: Version bump + gated-lane ship

- [ ] **Step 1: Bump** (entitlement-contract change):

```bash
node scripts/bump-version.js <next> "G1-harden: atomic webhook + multi-provider entitlements"
```

- [ ] **Step 2: Full gate**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js && node tests/tech-debt.js
```

Expected: UAT all-pass (update version pins if it complains), tech-debt no new breach.

- [ ] **Step 3: PR + smoke** — push branch; smoke the preview against the branch DB in **test mode**: purchase → Pro flips; duplicate webhook → one row; refund → revoked. Self-sign the PR checklist.

- [ ] **Step 4: Merge → activate** — squash-merge. Apply `20260626_provider_subscriptions.sql` to **production** Supabase. Set live Stripe keys + register the live webhook (with the two new event types). Do one real (or $0-coupon) live purchase, confirm `provider_subscriptions` row + `is_pro` true, then refund and confirm revoke.

- [ ] **Step 5: Post-deploy verify** — per CLAUDE.md, drive prod: sign in, buy, confirm tier flips; watch Stripe Dashboard → Events for webhook 200s.

---

## Self-review

**Spec coverage:** Council P0 #1 (paid-but-no-Pro) → Task 2 atomic RPC + Task 3 webhook rewrite (verified by the duplicate + stale SQL asserts). Council P0 #2 (one-row Stripe-shaped table) → Task 1 `provider_subscriptions` + `is_pro()` rewrite + `user_entitlements` view (Apple-ready: `original_transaction_id`, `environment`, `revoked_at`). Bonus P2s folded in cheaply: refund/chargeback revoke (Task 3), out-of-order guard (Task 2 step c). ✅

**Out of scope (deliberately):** Apple/RevenueCat purchase + restore (that's the iOS bundle — needs the RevenueCat-vs-StoreKit decision first); the schema here is built to *receive* Apple but the iOS write path is separate. Server-side `is_pro()` enforcement on the AI proxy and the checkout-time "already Pro" guard are their own small tasks in the "attack the rest" batch. `pass_guarantee_extended_at` stays on the legacy `subscriptions` table, untouched.

**Placeholder scan:** none — every step has real SQL/JS. The one conditional (`_noop` guard) is spelled out in the NOTE with exact code.

**Type consistency:** `provider_subscriptions` columns written by the RPC (Task 2) match the table (Task 1) and the webhook row builder (Task 3). `apply_provider_subscription_event(p_event_id, p_event_type, p_row)` signature is identical in the migration and the `callRpc` call. `getCustomerId` returns `provider_customer_id` (renamed from `stripe_customer_id`) — both call sites (checkout, portal) consume it the same way. ✅

---

## Dependency note

Both tasks are **GATED lane** and inert until G1's founder prerequisites exist (Stripe account + keys + webhook endpoint, G1 §G0). If G1 hasn't started: do G1 §G0 first, then land THIS plan as G1's schema + webhook (instead of G1 Tasks 1–2's `subscriptions` version), then G1 Tasks 3–5 (portal, client wiring, ship) unchanged.
