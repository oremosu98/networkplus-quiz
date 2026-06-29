---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# Server-Side AI Quota + Entitlement Enforcement (Metered AI Proxy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan one task at a time, committing after each green verification. This is a **gated-lane** change (`landing/api/ai/*` + `supabase/migrations/*`): feature branch → PR (auto-spins Supabase branch DB + Vercel preview + CI) → smoke-test preview → squash-merge → prod. Every migration here carries a tested `-- ROLLBACK:` block. Do NOT push straight to `main`.

**Goal:** Stand up the `/api/ai/generate` serverless proxy so every signed-in AI call is authenticated, quota-checked server-side via `consume_daily_quota()`, and forwarded to Anthropic with CertAnvil's own server-held key — closing the bill-protection gap that client gates (`_gateProOnly`, `_quotaState`) leave wide open.

**Architecture:** The client already funnels all 13 Anthropic call sites through one `_claudeFetch()` chokepoint that, for signed-in users, POSTs to `/api/ai/generate` with the Supabase access token; that endpoint does not yet exist. This plan ships the endpoint (Vercel Edge, env-var graceful-503), which validates the JWT, calls the existing `consume_daily_quota(uid, q_count)` RPC BEFORE forwarding, returns **429 + upgrade-CTA** on `false`, and on success forwards to Anthropic with the server `ANTHROPIC_API_KEY` and returns the raw Anthropic JSON unchanged. It also adds the Pro **soft 150/day fair-use cap** (Phase-G decision 6) as a friendly non-error signal inside a `consume_daily_quota_v2()` RPC.

**Tech Stack:** Vercel Edge Functions (`export const config = { runtime: 'edge' }`), Supabase Postgres (security-definer RPCs over PostgREST `/rest/v1/rpc`), Supabase Auth (JWT verify via `/auth/v1/user`), Anthropic Messages API. No build step; vanilla JS client (`app.js`).

---

## Dependencies

- **Reuses, does NOT rebuild:** `consume_daily_quota(uid, q_count)`, `get_daily_quota_usage(uid)`, `is_pro(uid)`, and the `ai_usage` / `subscriptions` tables — all already shipped in `supabase/migrations/20260509_phase_e_subscriptions.sql`.
- **Reuses, does NOT rebuild:** the client `_claudeFetch()` wrapper in `app.js` (~line 365) — it already routes signed-in users to `/api/ai/generate`, already strips `_metered`, already surfaces `_showQuotaExceededUI()` on 429, and already refreshes the quota chip after metered calls. The client switch is therefore **mostly already done**; this plan supplies the missing server half and verifies the wiring.
- **Entitlement source of truth:** `is_pro()` (read by `consume_daily_quota`). Per `docs/superpowers/plans/2026-06-26-g1-hardening-webhook-and-multiprovider-schema.md`, `is_pro()` is being repointed at `provider_subscriptions`. Enforcement here calls `is_pro()` / `consume_daily_quota()` only — it never reads localStorage tier — so it follows that cascade automatically with zero changes.
- **Pattern reference:** `landing/api/diagnostic/generate.js` is the canonical CertAnvil Edge-proxy shape (edge runtime, env-var graceful-503, Supabase RPC over REST, Anthropic forward, JSON helpers). Mirror its structure.

## Prerequisite gate (founder-only)

These are **manual** steps outside the codebase — the endpoint graceful-503s until they are done, so it ships safely first:

- [ ] In Vercel → **landing project** → Settings → Environment Variables (Production + Preview), confirm/set:
  - `ANTHROPIC_API_KEY` = `sk-ant-...` (CertAnvil's own key — set during the **Sat 20 June `certanvil-api-key-setup-day`** session per `docs/planning/PHASE-G-PLAN-2026-06-11.md`; $20/mo workspace cap).
  - `SUPABASE_URL` = `https://<ref>.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY` = `eyJ...` (service-role; used for the RPC call and JWT verification).
- [ ] These already exist for `landing/api/diagnostic/*`; the AI proxy reuses the same three. No new secrets.

---

## Task 1: Soft 150/day Pro fair-use cap — `consume_daily_quota_v2()`

`consume_daily_quota()` today returns `true` unconditionally for Pro (still logs). Phase-G decision 6 wants a **soft** 150/day cap: friendly message, never an error, Pro still marketed "unlimited". We add a NEW `consume_daily_quota_v2()` that returns a small JSON verdict instead of a bare boolean, leaving the original function untouched (other callers, if any, keep working). The proxy calls v2.

**Files:**
- Create: `supabase/migrations/20260626_quota_v2_soft_pro_cap.sql`

- [ ] Write the migration. Note the soft-cap branch returns `allowed: true` only up to 150; at 150 it returns `allowed: false, soft: true` so the proxy can answer 200-with-friendly-payload (NOT 429). Free over-cap returns `allowed: false, soft: false` (proxy → 429 upgrade CTA).

```sql
-- ══════════════════════════════════════════════════════════════════════════
-- consume_daily_quota_v2 — verdict-returning quota check for the AI proxy
-- Date: 2026-06-26 · Gated lane
-- ══════════════════════════════════════════════════════════════════════════
-- Why v2 (not edit v1): v1 returns boolean and Pro is unconditional-true.
-- Decision 6 (PHASE-G-PLAN-2026-06-11) adds a SOFT 150/day Pro fair-use cap:
-- a friendly "studied hard today" signal, never an error. v2 returns a JSON
-- verdict so the proxy can distinguish three cases:
--   • allowed=true                          → forward to Anthropic
--   • allowed=false, soft=true  (Pro @150)  → 200 + friendly soft-limit body
--   • allowed=false, soft=false (Free @cap) → 429 + upgrade CTA
-- v1 (consume_daily_quota) is LEFT INTACT for any existing caller.
-- Idempotent: create or replace.
-- ══════════════════════════════════════════════════════════════════════════

create or replace function consume_daily_quota_v2(uid uuid, q_count int default 1)
returns jsonb
language plpgsql
security definer
as $$
declare
  is_pro_user boolean;
  today_count int;
  free_limit constant int := 20;
  pro_soft_limit constant int := 150;
begin
  is_pro_user := is_pro(uid);

  select coalesce(call_count, 0)
    into today_count
    from ai_usage
    where user_id = uid and call_date = current_date;
  today_count := coalesce(today_count, 0);

  if is_pro_user then
    if (today_count + q_count) > pro_soft_limit then
      -- Soft cap: do NOT increment, do NOT error. Friendly stop.
      return jsonb_build_object(
        'allowed', false, 'soft', true, 'tier', 'pro',
        'used_today', today_count, 'limit', pro_soft_limit);
    end if;
    insert into ai_usage (user_id, call_date, call_count)
    values (uid, current_date, q_count)
    on conflict (user_id, call_date)
    do update set call_count = ai_usage.call_count + q_count;
    return jsonb_build_object(
      'allowed', true, 'soft', false, 'tier', 'pro',
      'used_today', today_count + q_count, 'limit', pro_soft_limit);
  end if;

  -- Free tier: hard cap at free_limit.
  if (today_count + q_count) > free_limit then
    return jsonb_build_object(
      'allowed', false, 'soft', false, 'tier', 'free',
      'used_today', today_count, 'limit', free_limit);
  end if;

  insert into ai_usage (user_id, call_date, call_count)
  values (uid, current_date, q_count)
  on conflict (user_id, call_date)
  do update set call_count = ai_usage.call_count + q_count;
  return jsonb_build_object(
    'allowed', true, 'soft', false, 'tier', 'free',
    'used_today', today_count + q_count, 'limit', free_limit);
end;
$$;

comment on function consume_daily_quota_v2 is
  'Verdict-returning quota check for the AI proxy. Returns jsonb {allowed, soft, tier, used_today, limit}. Free hard-caps at 20 (allowed=false,soft=false → 429). Pro soft-caps at 150 (allowed=false,soft=true → friendly 200). Pre-Stripe everyone is Free. Supersedes consume_daily_quota() for the proxy; v1 retained for back-compat.';

-- ══════════════════════════════════════════════════════════════════════════
-- ROLLBACK: (safe — v1 untouched, no caller depends on v2 until the proxy
--           ships in the same PR; dropping v2 reverts the proxy to a 503 it
--           already graceful-handles)
--   drop function if exists consume_daily_quota_v2(uuid, int);
-- ══════════════════════════════════════════════════════════════════════════
```

- [ ] Apply the migration on the PR's Supabase branch DB (Dashboard → SQL Editor on the preview branch, or `supabase db push`). Verify v1 is untouched and v2 returns the right shape:

```sql
-- Free path (no rows yet → allowed true, used 1/20):
select consume_daily_quota_v2('00000000-0000-0000-0000-000000000000', 1);
-- expect: {"soft": false, "tier": "free", "limit": 20, "allowed": true, "used_today": 1}

-- v1 still present and boolean:
select consume_daily_quota('00000000-0000-0000-0000-000000000000', 1);
-- expect: true
```

- [ ] Verify the Free hard-cap → 429 branch by forcing the counter to the limit, then asserting `allowed=false, soft=false`:

```sql
insert into ai_usage (user_id, call_date, call_count)
values ('00000000-0000-0000-0000-000000000001', current_date, 20)
on conflict (user_id, call_date) do update set call_count = 20;
select consume_daily_quota_v2('00000000-0000-0000-0000-000000000001', 1);
-- expect: {"soft": false, "tier": "free", "limit": 20, "allowed": false, "used_today": 20}
```

- [ ] Verify the Pro soft-cap branch. Insert a fake active Pro subscription + a 150-count usage row, assert `allowed=false, soft=true`, then clean up:

```sql
insert into subscriptions (user_id, tier, status)
values ('00000000-0000-0000-0000-000000000002', 'pro', 'active')
on conflict (user_id) do update set tier = 'pro', status = 'active';
insert into ai_usage (user_id, call_date, call_count)
values ('00000000-0000-0000-0000-000000000002', current_date, 150)
on conflict (user_id, call_date) do update set call_count = 150;
select consume_daily_quota_v2('00000000-0000-0000-0000-000000000002', 1);
-- expect: {"soft": true, "tier": "pro", "limit": 150, "allowed": false, "used_today": 150}
delete from ai_usage where user_id like '00000000-0000-0000-0000-00000000000%';
delete from subscriptions where user_id = '00000000-0000-0000-0000-000000000002';
```

- [ ] Commit: `git add supabase/migrations/20260626_quota_v2_soft_pro_cap.sql && git commit -m "feat(quota): consume_daily_quota_v2 with soft 150/day Pro fair-use cap (decision 6)"`

---

## Task 2: The AI proxy endpoint — `/api/ai/generate`

Mirror `landing/api/diagnostic/generate.js`: Edge runtime, env-var graceful-503, Supabase service-role RPC over REST. Difference: auth is a **Supabase JWT** (not Turnstile), the quota call is **`consume_daily_quota_v2`**, and the forwarded body is the **client-supplied Anthropic message body** (passthrough), with `_metered` stripped server-side.

**Files:**
- Create: `landing/api/ai/generate.js`

- [ ] Write the endpoint top matter + handler skeleton (CORS, method guard, body parse, auth-header extract):

```js
// ══════════════════════════════════════════════════════════════════════════
// CertAnvil · /api/ai/generate · Phase E.4 · metered AI proxy
// ══════════════════════════════════════════════════════════════════════════
// Server-side line that protects CertAnvil's Anthropic bill. Client gates
// (_gateProOnly, _quotaState) are UX only and bypassable — THIS is the gate
// that actually holds. Every signed-in AI call lands here (app.js _claudeFetch
// routes signed-in users to POST /api/ai/generate with their Supabase JWT).
//
// Flow:
//   1. Verify Supabase access token  → 401 if absent/invalid.
//   2. consume_daily_quota_v2(uid, q) BEFORE forwarding:
//        • allowed=false, soft=false → 429 + upgrade CTA  (Free over cap)
//        • allowed=false, soft=true  → 200 + friendly soft-limit body (Pro @150)
//        • allowed=true              → forward.
//   3. Forward the client's Anthropic body (minus _metered) to Anthropic with
//      the SERVER key. Return the raw Anthropic JSON unchanged so _claudeFetch
//      callers (.json() → data.content[0].text) keep working verbatim.
//
// Required env (landing project · Prod+Preview) — ALL optional; any missing
// → graceful 503 (the client BYOK/fallback paths already handle 503/non-ok):
//   - ANTHROPIC_API_KEY          sk-ant-...   server-held Anthropic key
//   - SUPABASE_URL               https://...co
//   - SUPABASE_SERVICE_ROLE_KEY  eyJ...        JWT verify + quota RPC
//
// Backs onto: supabase/migrations/20260626_quota_v2_soft_pro_cap.sql
// ══════════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' };

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_FORWARD_TOKENS = 8000; // ceiling — client max_tokens clamped to this

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method-not-allowed', message: 'POST only' }, 405);
  }

  // ── 1. Env gate (graceful 503 if not configured) ──
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!anthropicKey || !supabaseUrl || !serviceKey) {
    console.error('[ai-generate] missing env var(s) · degrading to 503');
    return json({ error: 'service-unavailable', message: 'AI service not yet configured' }, 503);
  }

  // ── 2. Parse client body ──
  let body;
  try { body = await req.json(); } catch (e) {
    return json({ error: 'bad-request', message: 'Invalid JSON body' }, 400);
  }
  if (!body || !Array.isArray(body.messages)) {
    return json({ error: 'bad-request', message: 'Body must include an Anthropic messages array' }, 400);
  }

  // ── 3. Authenticate the Supabase user ──
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return json({ error: 'unauthorized', message: 'Sign in to use AI generation' }, 401);
  }
  const uid = await resolveUserId(supabaseUrl, serviceKey, token);
  if (!uid) {
    return json({ error: 'unauthorized', message: 'Session expired · sign in again' }, 401);
  }

  // ── 4. Quota check BEFORE forwarding (the bill-protection line) ──
  const metered = body._metered === true;
  const qCount = metered ? 1 : 0; // only canonical generation meters; infra calls cost 0 quota
  const verdict = await consumeQuota(supabaseUrl, serviceKey, uid, qCount);
  if (!verdict.ok) {
    return json({ error: 'service-error', message: 'Could not verify your quota · try again shortly' }, 503);
  }
  if (!verdict.allowed) {
    if (verdict.soft) {
      // Pro fair-use soft cap (decision 6) — friendly, NOT an error.
      return json({
        ok: false, softLimit: true, tier: 'pro',
        usedToday: verdict.usedToday, limit: verdict.limit,
        message: "You've studied hard today — fresh questions unlock at midnight UTC."
      }, 200);
    }
    // Free hard cap — 429 with upgrade CTA (never silent).
    return json({
      error: 'quota_exceeded', tier: 'free',
      usedToday: verdict.usedToday, limit: verdict.limit,
      message: 'You’ve used your ' + verdict.limit + ' free questions today.',
      cta: { label: 'Upgrade to Pro', href: 'https://certanvil.com/pricing.html' }
    }, 429);
  }

  // ── 5. Forward to Anthropic with the SERVER key ──
  const forward = sanitizeForward(body);
  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(forward)
    });
  } catch (e) {
    console.error('[ai-generate] Anthropic fetch threw:', e && e.message);
    return json({ error: 'ai-upstream-error', message: 'AI generation temporarily unavailable' }, 503);
  }

  // ── 6. Pass the raw Anthropic response straight back (status + body) ──
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.ok ? 200 : upstream.status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
  });
}
```

- [ ] Append the helpers — `resolveUserId` (JWT → uid via `/auth/v1/user`), `consumeQuota` (RPC over REST), `sanitizeForward` (strip `_metered`, clamp `max_tokens`), and the shared `json` / `corsHeaders`:

```js
// ── Supabase JWT → user id ──
async function resolveUserId(supabaseUrl, serviceKey, token) {
  try {
    const resp = await fetch(supabaseUrl + '/auth/v1/user', {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + token
      }
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    return (user && user.id) || null;
  } catch (e) {
    console.error('[ai-generate] user resolve threw:', e && e.message);
    return null;
  }
}

// ── consume_daily_quota_v2 over PostgREST ──
async function consumeQuota(supabaseUrl, serviceKey, uid, qCount) {
  try {
    const resp = await fetch(supabaseUrl + '/rest/v1/rpc/consume_daily_quota_v2', {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uid: uid, q_count: qCount })
    });
    if (!resp.ok) {
      console.error('[ai-generate] quota RPC failed:', resp.status, await resp.text());
      return { ok: false };
    }
    const v = await resp.json(); // jsonb → object
    return {
      ok: true,
      allowed: !!v.allowed,
      soft: !!v.soft,
      tier: v.tier,
      usedToday: v.used_today,
      limit: v.limit
    };
  } catch (e) {
    console.error('[ai-generate] quota RPC threw:', e && e.message);
    return { ok: false };
  }
}

// ── Strip _metered (Anthropic rejects unknown fields) + clamp max_tokens ──
function sanitizeForward(body) {
  const out = {};
  for (const k of Object.keys(body)) {
    if (k === '_metered') continue;
    out[k] = body[k];
  }
  if (typeof out.max_tokens !== 'number' || out.max_tokens > MAX_FORWARD_TOKENS) {
    out.max_tokens = MAX_FORWARD_TOKENS;
  }
  return out;
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}
```

- [ ] Verify graceful-503 locally before env is set (curl the preview before founder sets the AI key, or temporarily unset). Assert 503, not a crash:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  https://<preview-url>/api/ai/generate \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer faketoken' \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":100,"messages":[{"role":"user","content":"hi"}]}'
# expect: 503  (env not yet set)  OR 401 (env set, fake token rejected) — both prove the endpoint is live
```

- [ ] Verify the 401 path (env set, no/invalid token):

```bash
curl -s -X POST https://<preview-url>/api/ai/generate \
  -H 'Content-Type: application/json' \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":100,"messages":[{"role":"user","content":"hi"}]}'
# expect: {"error":"unauthorized","message":"Sign in to use AI generation"}  (HTTP 401)
```

- [ ] Commit: `git add landing/api/ai/generate.js && git commit -m "feat(ai-proxy): /api/ai/generate · JWT auth + server quota + Anthropic forward"`

---

## Task 3: Client switch — confirm + finalize the move off BYO-key

The hard part is **already done**: `_claudeFetch()` (`app.js` ~line 365) routes signed-in users to `/api/ai/generate` with `Authorization: Bearer <access_token>`, strips `_metered` only on the BYOK branch, handles 429 via `_showQuotaExceededUI()`, and refreshes the quota chip. All call sites already pass through it. This task verifies that end-to-end and decides the fate of the BYOK fallback.

**Call sites (from grep — all already on `_claudeFetch`, no per-site change needed):**

| Site | `app.js` line | Metered? |
|---|---|---|
| `_fetchQuestionsBatch` (canonical generation) | ~9056 | `_metered: true` |
| `aiValidateQuestions` (Sonnet validator) | ~15869 | infra (no flag) |
| Teacher / coach calls | ~16059, ~16183, ~16606 | infra |
| `_fetchWhyNotSession` (drill reword) | ~6850 | `_metered: true` |
| `_slMeteredGenerate` (Sim Lab) | ~7212 | `_metered: true` |
| Topology / misc AI | ~7316, ~7676 | infra |

**Before/after (representative — `_fetchQuestionsBatch`, ~line 9056):** no code change. It already reads:

```js
// BEFORE === AFTER (already migrated in Phase E.3):
const res = await _claudeFetch({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': key,
             'anthropic-version': '2023-06-01',
             'anthropic-dangerous-direct-browser-access': 'true' },
  body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: MAX_TOKENS_GENERATION,
                         messages: [{ role: 'user', content: prompt }], _metered: true })
});
```

The `x-api-key` / `anthropic-dangerous-direct-browser-access` headers are now **inert for signed-in users** — `_claudeFetch`'s proxy branch ignores `init.headers` and sends only `Authorization` + `Content-Type` to `/api/ai/generate`. They are still consumed by the BYOK fallback branch. This is the intended design; no edit required.

**Files:**
- Modify: `app.js` (BYOK-fallback decision only)

- [ ] **Decision (record in the plan, per CLAUDE.md):** CLAUDE.md still documents AI as "direct browser fetch; user supplies their own API key (`STORAGE.KEY`)" — the OLD single-user mode. With CertAnvil's server key now live, the BYOK path is **retired as the default but kept as a dormant fallback** for two reasons: (1) it is the documented anonymous/offline-dev escape hatch, and (2) removing it touches 13 inert header blocks for no functional gain. The minimal, reversible change is to make the BYOK branch **opt-in** behind a flag so it cannot silently bill a stray user key in production, while signed-in users (the 100% prod path) always use the proxy. Edit only the BYOK branch in `_claudeFetch`:

```js
  // Route 2: BYOK fallback — DORMANT by default (Phase E.4).
  // Signed-in users always take Route 1 above. This branch only fires for an
  // anonymous user who has BOTH a stored key AND the explicit dev opt-in flag.
  // Retained (not deleted) as the documented offline/dev escape hatch; see
  // CLAUDE.md "AI" line. Never the prod path.
  var key = null;
  try { key = localStorage.getItem(STORAGE.KEY); } catch (_) {}
  var byokOptIn = false;
  try { byokOptIn = localStorage.getItem('nplus_byok_optin') === '1'; } catch (_) {}
  if (key && byokOptIn) {
```

- [ ] Verify the end-to-end signed-in path on the preview deploy with a real session (sign in on the preview, run a quiz generation, watch the network tab):
  - Request goes to `POST /api/ai/generate` with `Authorization: Bearer ...` (NOT to `api.anthropic.com`).
  - Response is raw Anthropic JSON; questions render.
  - The quota chip increments by 1 after a metered generation (`get_daily_quota_usage` reflects it).

- [ ] Verify the 429 path end-to-end: as a Free preview user, force `ai_usage.call_count = 20` for today in the branch DB, trigger one more generation, confirm `_showQuotaExceededUI()` renders the upgrade modal (not a silent failure, not a console error).

```sql
-- run on the preview branch DB with your real preview uid:
insert into ai_usage (user_id, call_date, call_count)
values ('<your-preview-uid>', current_date, 20)
on conflict (user_id, call_date) do update set call_count = 20;
```

- [ ] Run the suite (no behavioral regressions; UAT asserts the wrapper + version surfaces):

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js && node tests/tech-debt.js
```

- [ ] Commit: `git add app.js && git commit -m "feat(ai): gate BYOK fallback behind dev opt-in; proxy is the only prod AI path"`

---

## Task 4: Gated-lane ship

**Files:** (none — process)

- [ ] Push the feature branch and open the PR (`gh pr create`). Confirm CI auto-spins the Supabase branch DB + Vercel preview.
- [ ] On the preview: re-run the Task 2 + Task 3 curl/SQL smokes against the preview URL (graceful-503, 401, signed-in success, 429 upgrade, Pro soft-limit friendly 200).
- [ ] Confirm the founder env-var gate (ANTHROPIC_API_KEY etc.) is set on Production+Preview before merge.
- [ ] Squash-merge to `main`. Post-merge: re-run the prod smoke once (`tests/deploy-verify.js` if it covers `/api/ai/*`, else a manual signed-in generation on prod).
- [ ] Bump version: `node scripts/bump-version.js <new> "AI proxy: server-side quota enforcement + soft 150/day Pro cap"`. Re-read CLAUDE.md after (the script rewrites it).
- [ ] Update CLAUDE.md's "AI" architecture line from "direct browser fetch; user supplies their own API key" to "**signed-in → `/api/ai/generate` proxy (server-held key, server quota); BYOK is a dormant dev-only fallback**". (One-line edit; keeps the file lean.)

---

## Self-review

- **Spec coverage:**
  - Vercel serverless AI proxy at `landing/api/ai/generate.js`, gated lane → Task 2. ✓
  - Authenticates via Supabase access token (`/auth/v1/user`) → Task 2 `resolveUserId`. ✓
  - Calls `consume_daily_quota`(_v2) BEFORE forwarding → Task 2 step 4 (quota before the Anthropic fetch). ✓
  - 429 + upgrade-CTA payload on Free over-cap, never silent → Task 2 (`quota_exceeded` + `cta`). ✓
  - Forwards with CertAnvil's server key from env, graceful-503 if missing → Task 2 step 1 + step 5. ✓
  - Returns parsed/raw Anthropic result unchanged → Task 2 step 6 passthrough. ✓
  - Soft 150/day Pro fair-use cap, friendly not error → Task 1 (`consume_daily_quota_v2`, `soft=true`) + Task 2 (200 + "studied hard" body). ✓
  - Minimal-change with `-- ROLLBACK:` → Task 1 (new v2, v1 intact, rollback block). ✓
  - Client switch with before/after + each call site → Task 3 table + representative diff. ✓
  - BYOK fate stated + why, referencing CLAUDE.md → Task 3 decision (kept as dormant dev fallback). ✓
  - Goal states this is the server line; client gates are UX-only/bypassable → Goal + Task 2 header. ✓
- **Placeholder scan:** no "TBD" / "add error handling" / "...". Every code block is complete; every verify step is a runnable curl or SQL assert with an expected result.
- **Type/name consistency:** RPC name `consume_daily_quota_v2` matches between migration, `consumeQuota` REST call, and verify SQL. JSON keys (`allowed`, `soft`, `tier`, `used_today`, `limit`) match between the SQL `jsonb_build_object` and the JS reads (`v.allowed`, `v.soft`, `v.used_today`, `v.limit`). Endpoint path `/api/ai/generate` matches `_claudeFetch`'s existing target.
- **Reused-not-rebuilt:** `ai_usage`, `subscriptions`, `is_pro()`, `get_daily_quota_usage()`, the `_claudeFetch` wrapper, `_showQuotaExceededUI()`, the quota chip, and the diagnostic-endpoint pattern are all reused. New objects are exactly two: `consume_daily_quota_v2()` and `landing/api/ai/generate.js`. `is_pro()` migration to `provider_subscriptions` is handled by the hardening plan and inherited for free.
