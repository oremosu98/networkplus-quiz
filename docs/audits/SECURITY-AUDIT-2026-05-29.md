---
type: audit
status: active
cert: all
updated: 2026-06-29
tags: [audit]
---
# CertAnvil — Security Audit (Phase 0)

**Date:** 2026-05-29
**Type:** Read-only assessment. No production changes made.
**Method:** 4 parallel audit passes — Supabase RLS/entitlement, git-history secrets, serverless endpoints, client-side XSS/CSP.
**Architecture context:** Thick client (static HTML/JS on Vercel) + Supabase (auth + data, browser talks to it directly with the public anon key) + 2 serverless functions. Data security therefore rests almost entirely on Supabase RLS; cost/abuse security rests on the 2 functions.

---

## Executive summary

The assessment **inverted the pre-audit risk ranking.** Data-layer security (RLS, Pro-entitlement, secrets, XSS) is in good shape. The acute, live risk is the **AI proxy**, which is currently a free, authenticated, uncapped Anthropic relay on the billing key.

**What's solid (no action needed):**
- ✅ **No secrets ever leaked.** No `service_role` key or Anthropic key in client code or git history. Nothing requires rotation.
- ✅ **RLS is broadly ON and correctly scoped** on all important tables (`profiles`, `quiz_history`, `subscriptions`, `ai_usage`, `cert_entitlements`). Users cannot read/write other users' data.
- ✅ **Pro-entitlement is enforced server-side at the DB.** `subscriptions` is RLS-locked to self-read with no client write policy; only the Stripe service-role webhook writes tier. `is_pro()` / `consume_daily_quota()` are hardened `SECURITY DEFINER` functions. A user cannot fake their tier.
- ✅ **Realistic XSS exposure is LOW.** Consistent escaping discipline (`escHtml`/`escapeHtml`); the cross-user surface (admin dashboard rendering other users' rows) escapes every field.

---

## Findings (prioritized)

### 🔴 CRITICAL — AI proxy abuse (actively exploitable today)

**C1. Metered quota is client-controlled → unlimited free LLM**
`api/ai/generate.js:129`. The 20/day free quota (`consume_daily_quota`) only runs when the **caller** sends `_metered: true`. An attacker simply omits the flag → unlimited unmetered Anthropic calls on any signed-in (self-serve free) account.
*Fix:* enforce quota server-side on **every** authenticated call; never let a client flag decide billing.

**C2. No input validation → open general-purpose Claude relay**
`api/ai/generate.js:154–167`. The request body is forwarded to Anthropic verbatim. Attacker chooses any model, any `max_tokens`, any prompt. The endpoint is a free Claude API on your key.
*Fix:* build the upstream request from known fields only — allowlist `model`, hard-cap `max_tokens`, cap prompt length, reject unknown top-level fields. Don't spread the client body.

> **Combined impact:** a single script looping on one free JWT can run the Anthropic bill up without limit. The JWT auth gate is real but does nothing to cap cost.

### 🟠 HIGH

**H1. No per-IP / global spend ceiling on the AI proxy**
`api/ai/generate.js` (whole handler). Even with C1/C2 fixed, many free accounts or one compromised JWT can hammer it. No circuit breaker on spend.
*Fix:* per-IP + per-user throttle (edge KV / Upstash) + a global daily spend kill-switch that hard-fails when exceeded.

### 🟡 MEDIUM

**M1. `stripe_events` has RLS disabled** — `supabase/migrations/20260509_phase_e_subscriptions.sql:89`. The table is created but never gets `ENABLE ROW LEVEL SECURITY` (unlike its 6 siblings). Anon/authenticated can read the webhook idempotency log and potentially write rows to poison Stripe dedup.
*Fix:* `alter table stripe_events enable row level security;` with no client policies (service-role-only).

**M2. `diagnostic_share` is world-readable** — `20260511_diagnostic_share.sql:80` (`for select using (true)`). Any anon caller can `SELECT *` and enumerate **all** shared diagnostic results, not just one token's. Token-as-gate is defeated by an open SELECT. (No PII — score data only — which bounds impact.)
*Fix:* drop the open SELECT policy; serve reads through a `SECURITY DEFINER` fn filtering `WHERE token = p_token AND expires_at > now()`.

**M3. Open CORS `*` + no rate limit on notify endpoint** — `landing/api/notify.js:45,203`. Any website can submit signups; no per-IP throttle → waitlist/DB spam + Resend send-volume abuse (cost + sender reputation).
*Fix:* lock `Access-Control-Allow-Origin` to `certanvil.com`; add per-IP rate limit (reuse the diagnostic rate-limit RPC pattern).

**M4. Open INSERT on `notify_signups` / `waitlist`** — `20260509_notify_signups_permissive.sql:39`, `schema.sql:188` (`WITH CHECK (true)`). Anyone with the public anon key can insert unlimited spam rows; DB-level validation was deliberately dropped.
*Fix:* restore a lightweight `WITH CHECK` (the regex from `20260509_notify_signups_regex_fix.sql:35` + length bounds) as defence-in-depth.

**M5. Auth tokens in JS-readable cookies (non-HttpOnly)** — `landing/lib/supabase.js:79`, `lib/supabase.js:79`. Supabase session (access + refresh) stored via `document.cookie` on `.certanvil.com`, readable by any JS → exfiltratable if any XSS lands (= full account takeover across all subdomains). Inherent to the client-side Supabase SDK.
*Fix:* accept as inherent OR move to a server-side/BFF session with HttpOnly cookies; meanwhile harden against XSS (M6 + C-fixes).

**M6. No HTML sanitizer (DOMPurify absent)** — repo-wide. ~200 `innerHTML` sinks rely entirely on hand-rolled `escHtml`. One missed escape = XSS, and M5 means XSS = account takeover.
*Fix:* add DOMPurify; `sanitize()` any path carrying remote/AI/user data.

**M7. CSP allows `'unsafe-inline'` scripts** — `vercel.json:14`. Removes CSP as an XSS backstop.
*Fix:* remove `'unsafe-inline'` via nonces/hashes. **Effort: HIGH** — 102 inline `on*=` handlers in `index.html`, 8 inline `<script>` blocks, and ~71 runtime-generated `onclick` handlers in `app.js` would need refactoring to `addEventListener`. Lower-ROI than M6 short-term.

**M8. Publishable key hardcoded as fallback** — `landing/api/notify.js:95`, `landing/lib/supabase.js:29`. It's the public anon/publishable key (low risk, RLS-protected) but shouldn't be baked into the repo.
*Fix:* read from `process.env` only; drop the literal fallback.

### 🟢 LOW

- **L1. AI proxy leaks internal/upstream error detail** — `api/ai/generate.js:112–116,168–180`. `detail: String(e.message)` + raw Anthropic body passthrough. *Fix:* log server-side, return generic error id.
- **L2. Unescaped AI `guide.diagram` into innerHTML** — `app.js ~13578`. Self-XSS only (own key/prompt), no cross-user path. *Fix:* run through `escHtml`/DOMPurify.
- **L3. `claim_diagnostic_results` has no email-match check** — `20260511_diagnostic_pending.sql:172`. Authenticated user with a valid unclaimed token can claim someone else's diagnostic. Low impact, documented.
- **L4. Admin = blanket Pro bypass** — `20260509_phase_e_admin_bypass.sql:42`. By design; note that any future admin-role grant also grants unlimited paid features.
- **L5. `.gitignore` missing `.env` / `*.key` / `*.pem` / `secrets/`** — no secrets leaked today, but no guard against a future accidental commit. *Fix:* add the patterns.
- **L6. PII (email + UA) in Vercel logs on signup** — `landing/api/notify.js:82–88`. Acceptable for a waitlist; note in privacy policy.

---

## Revised remediation roadmap

Phase 0 evidence re-scopes the original plan. **The AI proxy fixes jump to the front** — they're the only acute, live risk.

| Phase | Contents | Why this order |
|---|---|---|
| **1 — Stop the bleed (AI proxy)** | C1, C2, H1, L1 | Live financial exploit. Highest urgency. Contained to one file + a throttle store. |
| **2 — DB hardening (quick wins)** | M1, M2, M4, L3 | Small, surgical SQL migrations. High value, low effort/risk. |
| **3 — Endpoint + spam hardening** | M3, M8, L6 | Notify endpoint CORS + rate limit + key cleanup. |
| **4 — XSS defence-in-depth** | M6 (DOMPurify), L2, then M5 decision, then M7 (CSP) | M6 first (high ROI). M7 is high-effort, schedule deliberately. |
| **5 — Hygiene + maturity** | L5 (.gitignore), L4 note, RBAC formalization, audit logs | Lower urgency; maturity layer. |
| **Parallel — Product Analytics** | (unchanged) | Independent track, no security dependency. |

**Items confirmed NOT needed:** secret rotation (nothing leaked), broad RLS remediation (already correct), Pro-entitlement enforcement (already server-side).
