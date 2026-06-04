# Phase 1 — Stop the bleed: AI proxy hardening

**Date:** 2026-05-29
**Source:** [SECURITY-AUDIT-2026-05-29.md](../../audits/SECURITY-AUDIT-2026-05-29.md) findings C1, C2, H1, L1
**Risk addressed:** 🔴 Live, actively-exploitable financial exploit — any signed-in (free, self-serve) user can use `api/ai/generate.js` as an uncapped, general-purpose Claude relay on the billing key.
**Lane:** **GATED** (touches `api/ai/*` + a Supabase migration) → feature branch → PR → Vercel preview ⇄ Supabase branch DB → smoke-test → squash-merge. Per `ENVIRONMENT_STRATEGY.md`.
**Throttle store decision (locked):** Supabase table, reusing the `diagnostic_rate_limit` RPC pattern. No new infra/deps/secrets.

---

## Goal (goal-backward)

After this phase, the AI proxy must satisfy ALL of:
1. A signed-in user **cannot** exceed a hard server-side daily AI-call ceiling, regardless of any client flag.
2. A caller **cannot** choose an arbitrary model, arbitrary `max_tokens`, or send an arbitrarily large prompt — the endpoint only does what the app needs.
3. Per-user **and** per-IP request rate limits apply to **every** call (metered or not), plus a global daily kill-switch.
4. Error responses leak **no** internal/upstream detail.
5. The legitimate app flows (quiz generation, validation, teacher, coach) still work end-to-end on the preview deploy.

---

## The four fixes

### C2 — Input allowlist (do this first; biggest single win)
**File:** `api/ai/generate.js` (the forward step, lines ~152–167).
Currently: `const body = Object.assign({}, req.body); delete body._metered;` → whole body forwarded.
Change to: **build the upstream request from known fields only.**
- **Model allowlist:** accept only the three models the app actually uses (`CLAUDE_MODEL` Haiku, `CLAUDE_VALIDATOR_MODEL`/`CLAUDE_TEACHER_MODEL` Sonnet). Reject anything else → 400 `invalid_model`.
- **`max_tokens` hard cap:** clamp to the app's real ceiling (mirror `MAX_TOKENS_*` constants — highest is the teacher-long path; pick that as the cap). Reject/clamp above it.
- **Prompt size cap:** cap total serialized `messages` + `system` length (e.g. 100 KB). Reject above → 413.
- **Field allowlist:** construct the Anthropic request from `{ model, max_tokens, messages, system, temperature }` only. Drop everything else (incl. `_metered`). Never spread `req.body`.

### H1 — Rate limiting + global spend ceiling (the real cost cap)
**New migration:** `supabase/migrations/20260529_ai_proxy_rate_limit.sql` — mirror `20260511_diagnostic_rate_limit.sql`:
- Table `ai_proxy_rate_limit (key text PK, call_count int, window_start timestamptz, last_at timestamptz)` — `key` is `user:<uid>`, `ip:<sha256-16>`, or `global:daily`.
- `SECURITY DEFINER` fn `ai_rl_check_and_increment(p_key text, p_limit int, p_window interval)` returns `(allowed, current_count, resets_at)` — **parameterized** limit/window so one fn serves per-user, per-IP, and global checks (the diagnostic version hardcodes 25/24h; generalize it).
- RLS: `ENABLE` + admin-only SELECT, service-role/anon-key writes via the DEFINER fn only (exactly like `diag_rl_*`). Add `-- ROLLBACK:` block (gated-lane rule, files ≥ 2026-05-12).
- Cleanup helper `ai_rl_purge_old()` (mirror `diag_rl_purge_old`).

**File:** `api/ai/generate.js` (new step, after JWT verify ~line 123, before quota):
- Hash the caller IP (SHA-256 truncated to 16, salted — reuse the diagnostic convention; **never store raw IP**).
- Call `ai_rl_check_and_increment` three times — **CONFIRMED thresholds:** `user:<uid>` = **500/day** (~20 full exams; a 90-Q exam ≈ 25 calls, a 30-Q quiz ≈ 5–10), `ip:<hash>` = **200/hour**, `global:daily` = a ceiling that bounds worst-case daily Anthropic spend (set once founder gives the budget figure; until then default high enough not to block legit traffic but log when approached). Any `allowed === false` → **429** with generic retry copy.
- **Note:** these are the *abuse* ceilings, entirely separate from the free-tier 20/day question quota (which stays as-is). No legit studier approaches 500/day; a scripted attacker does thousands → stopped cold.
- Because `max_tokens` is capped (C2), call-count is a sound spend proxy for the global kill-switch in Phase 1.

### C1 — Server-side metering ceiling (don't trust the client)
**File:** `api/ai/generate.js` (the quota step, lines ~125–150).
- **Keep** the existing `_metered` → `consume_daily_quota` path for the *product* model (free 20/day user-facing questions, Pro unlimited) — this is correct UX and the DB enforcement is sound.
- **Add** a hard, non-bypassable server ceiling: the H1 `user:<uid>` daily limit (300) already bounds *total* AI calls per user regardless of `_metered`. Document explicitly in the handler comment that the abuse ceiling is H1 (server-controlled), and `_metered` is *only* a product-UX signal, never the security boundary.
- Net: omitting `_metered` skips the *product* quota but **cannot** exceed the 300/day server ceiling → exploit closed.

### L1 — Sanitize error responses
**File:** `api/ai/generate.js` (lines ~112–116, 135–139, 168–180).
- Replace `detail: String(e.message)` and the raw Anthropic body passthrough with: log full detail server-side (`console.error` with a generated error id), return generic `{ error, message, error_id }` to the client. Don't forward Anthropic's raw error body.

---

## Files touched
| File | Change |
|---|---|
| `supabase/migrations/20260529_ai_proxy_rate_limit.sql` | **NEW** — table + `ai_rl_check_and_increment` + `ai_rl_purge_old` + RLS + ROLLBACK block |
| `api/ai/generate.js` | C1 (ceiling comment + keep quota), C2 (input allowlist), H1 (3 rate-limit calls + IP hash), L1 (error sanitize) |
| `tests/uat.js` | Guards: no `Object.assign({}, req.body)` spread to Anthropic; model allowlist present; `max_tokens` clamp present; rate-limit RPC called; error responses don't include `e.message` |

---

## Verification (preview deploy — gated lane)
1. Apply the migration to the Supabase **branch** DB (PR auto-provisions).
2. **Exploit re-test (must now fail):** signed-in free JWT, POST without `_metered`, arbitrary `model: 'claude-opus-...'`, `max_tokens: 64000` → expect **400 invalid_model** (and clamp/413 on size). Loop the call → expect **429** after the per-user/IP ceiling.
3. **Legit flow (must still pass):** real quiz generation (fetch → validate → render) end-to-end on preview; teacher/coach calls succeed; free quota still trips at 20 user-facing questions.
4. UAT green; `node tests/uat.js`.
5. Founder smoke on preview before squash-merge.

## Open items to confirm with founder before merge
- ✅ Per-user (500/day) and per-IP (200/hr) ceilings — **CONFIRMED 2026-05-29.**
- ⬜ `global:daily` ceiling number — needs a target Anthropic daily-spend figure to set precisely; default high + log-on-approach until provided.
- ⬜ Whether to also emit a lightweight alert when `global:daily` trips (Phase 1.x).

## Explicitly out of scope (later phases)
- Per-token (vs per-call) spend accounting — Phase 1.x if call-count proxy proves too coarse.
- M1/M2/M4 DB hardening — Phase 2.
- Notify endpoint CORS/rate limit — Phase 3.
