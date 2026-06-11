// ══════════════════════════════════════════════════════════════════════════
// Phase E.1 + E.2 — Server-side AI proxy
// ══════════════════════════════════════════════════════════════════════════
// Vercel serverless function at https://networkplus.certanvil.com/api/ai/generate
// (and any other cert subdomain — cert-app is one Vercel deploy).
//
// What it does:
//   1. Verifies the request's Authorization Bearer token via Supabase's
//      /auth/v1/user endpoint. Rejects unauthenticated requests with 401.
//   2. If body opts in with `_metered: true`, calls consume_daily_quota()
//      on the user. Free over-quota → 429 with upgrade CTA. Pro → unlimited.
//      Validation/coaching/teacher calls SHOULD set _metered: false (or
//      omit it) since they're infrastructure, not user-facing questions.
//   3. Forwards the (sanitised) request body to Anthropic's /v1/messages
//      with the server-held ANTHROPIC_API_KEY. Pass-through response.
//
// Required Vercel env vars (set in the cert-app Vercel project):
//   - SUPABASE_URL                — your Supabase project URL
//   - SUPABASE_ANON_KEY           — publishable anon key (safe on server)
//   - ANTHROPIC_API_KEY           — server-held Claude key (NEVER on client)
//
// Zero runtime dependencies. Uses Node 18+ native fetch + Supabase REST API.
// ══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const ANTHROPIC_VERSION = '2023-06-01';
const FREE_DAILY_LIMIT = 20;  // mirrors consume_daily_quota's hardcoded limit

// ── Security Phase 1 (2026-05-29) — abuse hardening (audit C1/C2/H1/L1) ──
const crypto = require('crypto');
// C2: only the models the cert-app actually uses may be proxied.
const ALLOWED_MODELS = new Set([
  'claude-haiku-4-5-20251001',  // CLAUDE_MODEL (generation)
  'claude-sonnet-4-6'           // CLAUDE_VALIDATOR_MODEL / CLAUDE_TEACHER_MODEL
]);
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
// C2: hard ceiling — above the app's largest legit call (MAX_TOKENS_GENERATION=12000)
// with headroom, but well below the values an attacker wants for cheap relay.
const MAX_TOKENS_CAP = 16000;
const MAX_PROMPT_BYTES = 100 * 1024;  // C2: cap serialized messages+system at 100 KB
// H1: abuse ceilings (separate from the product 20/day question quota).
const USER_DAILY_LIMIT   = 500;    // ~20 full 90-Q exams/day — no human reaches it
const IP_HOURLY_LIMIT    = 200;
const GLOBAL_DAILY_LIMIT = 500;    // global kill-switch — matched to the $20/mo
                                   // Anthropic workspace cap (founder decision
                                   // 2026-06-11, testing phase). Equals one user's
                                   // daily ceiling; raise at go-live alongside the
                                   // workspace cap, after measuring per-session
                                   // cost from the simulator E2E run.
const RL_SALT = process.env.RL_SALT || 'certanvil-ai-rl-v1';

// ── Supabase helpers (REST, no SDK) ─────────────────────────────────────

async function verifyUser(token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY
    }
  });
  if (!r.ok) return null;
  const user = await r.json();
  return user && user.id ? user : null;
}

async function consumeQuota(token, userId, count) {
  // RPC call. Returns true (allowed) or false (quota exceeded). The function
  // is security-definer so it bypasses RLS — anon key is fine here.
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_daily_quota`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uid: userId, q_count: count })
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Quota RPC failed (${r.status}): ${detail}`);
  }
  return await r.json();  // true | false
}

// H1: SHA-256(salt+ip) truncated to 16 — never stores or sends the raw IP.
function _hashIp(ip) {
  return crypto.createHash('sha256').update(RL_SALT + (ip || 'unknown')).digest('hex').slice(0, 16);
}

// H1: one parameterised RPC (user / ip / global differ only by key+limit+window).
// Returns the row {allowed, current_count, resets_at}; throws on infra error.
async function rlCheck(token, key, limit, windowSql) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ai_rl_check_and_increment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_key: key, p_limit: limit, p_window: windowSql })
  });
  if (!r.ok) throw new Error(`ai_rl rpc ${r.status}`);
  const rows = await r.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

// ── Misc helpers ────────────────────────────────────────────────────────

function nextMidnightUtcIso() {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0
  )).toISOString();
}

function badJson(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

// ── Handler ─────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  // Defensive: env vars must be set
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ANTHROPIC_API_KEY) {
    return badJson(res, 500, {
      error: 'server_misconfigured',
      message: 'Required env vars missing on the server. Contact support.'
    });
  }

  if (req.method !== 'POST') {
    return badJson(res, 405, { error: 'method_not_allowed' });
  }

  // ── 1. Verify JWT ───────────────────────────────────────────────────
  const authHeader = (req.headers && req.headers.authorization) || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return badJson(res, 401, {
      error: 'missing_auth',
      message: 'No Authorization header. You need to be signed in.'
    });
  }

  let user;
  try {
    user = await verifyUser(token);
  } catch (e) {
    const errId = crypto.randomBytes(6).toString('hex');
    console.error(`[ai-proxy] auth check failed err_id=${errId}:`, e && e.message);
    return badJson(res, 502, {
      error: 'auth_check_failed',
      message: 'Could not verify your session. Please try again.',
      error_id: errId
    });
  }
  if (!user) {
    return badJson(res, 401, {
      error: 'invalid_auth',
      message: 'Your session has expired. Sign in again.'
    });
  }
  const userId = user.id;

  // ── 1b. Abuse rate limits (H1) — apply to EVERY call, metered or not. ─
  // These are the real cost ceiling; the _metered quota below is product-only.
  // Fail OPEN on RL infra error so a not-yet-applied migration can't take the
  // proxy down — C2 input allowlisting still closes the relay exploit regardless.
  const ipHash = _hashIp((((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0] || '').trim());
  try {
    const checks = await Promise.all([
      rlCheck(token, `user:${userId}`, USER_DAILY_LIMIT, '1 day'),
      rlCheck(token, `ip:${ipHash}`, IP_HOURLY_LIMIT, '1 hour'),
      rlCheck(token, 'global:daily', GLOBAL_DAILY_LIMIT, '1 day')
    ]);
    if (checks.some(c => c && c.allowed === false)) {
      return badJson(res, 429, {
        error: 'rate_limited',
        message: 'Too many requests. Please slow down and try again shortly.'
      });
    }
  } catch (e) {
    console.error('[ai-proxy] rate-limit check failed (failing open):', e && e.message);
  }

  // ── 2. Quota check (only if metered) ─────────────────────────────────
  // Convention: the client sets _metered: true for fetchQuestions calls
  // (the user-facing "I want a new question" flow). Validation, coaching,
  // and teacher calls leave it false/absent — they're infra costs.
  const isMetered = req && req.body && req.body._metered === true;

  if (isMetered) {
    let allowed;
    try {
      allowed = await consumeQuota(token, userId, 1);
    } catch (e) {
      const errId = crypto.randomBytes(6).toString('hex');
      console.error(`[ai-proxy] quota check failed err_id=${errId}:`, e && e.message);
      return badJson(res, 500, {
        error: 'quota_check_failed',
        message: 'Could not check your daily quota. Please try again.',
        error_id: errId
      });
    }
    if (allowed === false) {
      return badJson(res, 429, {
        error: 'quota_exceeded',
        message: 'You\'ve used your ' + FREE_DAILY_LIMIT + ' free questions today. Resets at midnight UTC, or upgrade to Pro for unlimited.',
        upgrade_url: 'https://certanvil.com/pricing',
        reset_at: nextMidnightUtcIso(),
        daily_limit: FREE_DAILY_LIMIT
      });
    }
  }

  // ── 3. Build the upstream request from ALLOWLISTED fields ONLY (C2). ──
  // Never spread req.body — that let a caller pick any model / max_tokens /
  // prompt and use this endpoint as a free general-purpose Claude relay.
  const inBody = (req && req.body) || {};
  const model = inBody.model || DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(model)) {
    return badJson(res, 400, { error: 'invalid_model', message: 'Unsupported model.' });
  }
  if (!Array.isArray(inBody.messages) || inBody.messages.length === 0) {
    return badJson(res, 400, { error: 'invalid_request', message: 'messages[] is required.' });
  }
  let maxTokens = parseInt(inBody.max_tokens, 10);
  if (!Number.isFinite(maxTokens) || maxTokens <= 0) maxTokens = MAX_TOKENS_CAP;
  if (maxTokens > MAX_TOKENS_CAP) maxTokens = MAX_TOKENS_CAP;  // clamp, don't reject
  const upstream = { model, max_tokens: maxTokens, messages: inBody.messages };
  if (typeof inBody.system === 'string') upstream.system = inBody.system;
  if (typeof inBody.temperature === 'number') upstream.temperature = inBody.temperature;
  // Cap total prompt size.
  const promptBytes = Buffer.byteLength(
    JSON.stringify({ messages: upstream.messages, system: upstream.system || '' }), 'utf8'
  );
  if (promptBytes > MAX_PROMPT_BYTES) {
    return badJson(res, 413, { error: 'prompt_too_large', message: 'Request too large.' });
  }

  let upstreamRes;
  try {
    upstreamRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify(upstream)
    });
  } catch (e) {
    const errId = crypto.randomBytes(6).toString('hex');
    console.error(`[ai-proxy] upstream fetch failed err_id=${errId}:`, e && e.message);
    return badJson(res, 502, {
      error: 'upstream_failure',
      message: 'The AI service is unreachable. Please try again.',
      error_id: errId
    });
  }

  // Success path: pass Anthropic's body through as-is (the cert-app parses the
  // completion shape from the BYOK era). On an upstream ERROR, do NOT leak
  // Anthropic's raw error body — log it server-side, return a generic error (L1).
  const text = await upstreamRes.text();
  if (!upstreamRes.ok) {
    const errId = crypto.randomBytes(6).toString('hex');
    console.error(`[ai-proxy] upstream ${upstreamRes.status} err_id=${errId}:`, String(text).slice(0, 500));
    return badJson(res, 502, {
      error: 'upstream_error',
      message: 'The AI service returned an error. Please try again.',
      error_id: errId
    });
  }
  res.status(upstreamRes.status);
  res.setHeader('Content-Type', 'application/json');
  res.send(text);
};
