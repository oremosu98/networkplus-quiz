// ══════════════════════════════════════════════════════════════════════════
// /api/diagnostic/signup-magic-link · v4.99.56 · D.5
// ══════════════════════════════════════════════════════════════════════════
// Persists an anonymous diagnostic result in `diagnostic_pending` keyed by
// a random token, then hands the token back to the client so it can fire a
// Supabase magic-link sign-in with `emailRedirectTo` pointing to the cert
// app at networkplus.certanvil.com/?action=claim-diagnostic&token=…
//
// The client (not this endpoint) calls supabase.auth.signInWithOtp — that
// way Supabase auto-sends the magic link from its configured email provider
// using a familiar template. This endpoint's job is server-side concerns:
// validation, rate-limiting, and the privileged write to diagnostic_pending.
//
// Inputs (JSON body):
//   email              · required · string
//   cert               · required · 'network-plus' | 'security-plus'
//   diagnosticResults  · required · the full results envelope from D.4
//                        (scaledScore + totalQuestions + correctCount +
//                         domainBreakdown + …)
//   turnstileToken     · optional · re-check defense-in-depth if present
//
// Returns:
//   { ok: true, token: '<32-hex>', redirectTo: '<cert-app-claim-url>' }
//
// Error codes (HTTP status + JSON body):
//   400 invalid_email / invalid_cert / invalid_results / incomplete_results
//   403 turnstile_failed
//   429 rate_limited (body includes resetsAt)
//   500 write_failed
//   503 service_unconfigured (any env var missing → graceful pre-config)
// ══════════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const IP_HASH_SALT = 'certanvil-diagnostic-salt-v1';

const ALLOWED_CERTS = ['network-plus', 'security-plus'];
const CERT_TO_CLAIM_HOST = {
  'network-plus': 'https://networkplus.certanvil.com',
  'security-plus': 'https://secplus.certanvil.com',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function checkEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  // TURNSTILE_SECRET_KEY is optional here — we only verify if a token is
  // sent. D.3 already gated the quiz with Turnstile, so re-checking is
  // defense in depth, not the primary guard.
  return { ok: missing.length === 0, missing };
}

function isValidEmail(s) {
  if (typeof s !== 'string') return false;
  if (s.length > 254) return false;
  // Minimal RFC-5322 sanity. We don't validate domain reachability here —
  // Supabase magic-link auth will fail silently if the email is undeliverable,
  // and that failure surfaces to the user on their next sign-in attempt.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function getClientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const xreal = req.headers.get('x-real-ip');
  if (xreal) return xreal.trim();
  return '0.0.0.0';
}

async function sha256Hex(s) {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashIp(ip) {
  const full = await sha256Hex(IP_HASH_SALT + ':' + ip);
  return full.slice(0, 16);
}

function generateToken() {
  // 32 hex chars = 16 random bytes. Crypto-random via WebCrypto (edge runtime
  // has it). Avoids Math.random for security-critical token generation.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyTurnstile(token, ip) {
  if (!TURNSTILE_SECRET_KEY) return true;  // not configured = skip check
  try {
    const body = new URLSearchParams();
    body.set('secret', TURNSTILE_SECRET_KEY);
    body.set('response', token);
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data && data.success);
  } catch (_) {
    return false;
  }
}

async function checkRateLimit(ipHash) {
  const url = SUPABASE_URL + '/rest/v1/rpc/diag_signup_check_and_increment';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ p_ip_hash: ipHash }),
  });
  if (!res.ok) {
    // Supabase RPC failure — fail closed (block the request) rather than
    // letting unlimited magic-link sends through.
    return { allowed: false, error: 'rate_limit_rpc_failed', currentCount: null, hourlyLimit: 5, resetsAt: null };
  }
  const data = await res.json().catch(() => null);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { allowed: false, error: 'rate_limit_no_row', hourlyLimit: 5 };
  return {
    allowed: Boolean(row.allowed),
    currentCount: row.current_count,
    hourlyLimit: row.hourly_limit,
    resetsAt: row.resets_at,
  };
}

async function writePendingRow({ token, email, cert, results }) {
  // Service-role INSERT into diagnostic_pending. RLS bypassed via service-role key.
  const url = SUPABASE_URL + '/rest/v1/diagnostic_pending';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      token,
      email: email.toLowerCase().trim(),
      cert,
      results,
    }),
  });
  return res.ok;
}

function buildRedirectUrl(cert, token) {
  const host = CERT_TO_CLAIM_HOST[cert] || CERT_TO_CLAIM_HOST['network-plus'];
  // The action+token round-trip through the magic link; the cert app's
  // claim hook parses them back out post-SIGNED_IN.
  return host + '/?action=claim-diagnostic&token=' + encodeURIComponent(token);
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  const env = checkEnv();
  if (!env.ok) {
    // Graceful: pre-config deploys return 503; the client falls back to a
    // "magic-link signup coming in next ship" inline panel.
    return json({ ok: false, error: 'service_unconfigured', missing: env.missing }, 503);
  }

  let body;
  try { body = await req.json(); }
  catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }

  const { email, cert, diagnosticResults, turnstileToken } = (body || {});

  if (!isValidEmail(email)) {
    return json({ ok: false, error: 'invalid_email' }, 400);
  }
  if (typeof cert !== 'string' || !ALLOWED_CERTS.includes(cert)) {
    return json({ ok: false, error: 'invalid_cert' }, 400);
  }
  if (!diagnosticResults || typeof diagnosticResults !== 'object') {
    return json({ ok: false, error: 'invalid_results' }, 400);
  }
  if (typeof diagnosticResults.scaledScore !== 'number' ||
      typeof diagnosticResults.totalQuestions !== 'number' ||
      typeof diagnosticResults.correctCount !== 'number') {
    return json({ ok: false, error: 'incomplete_results' }, 400);
  }

  // Optional defense-in-depth Turnstile re-check
  if (turnstileToken && TURNSTILE_SECRET_KEY) {
    const ip = getClientIp(req);
    const tsOk = await verifyTurnstile(turnstileToken, ip);
    if (!tsOk) {
      return json({ ok: false, error: 'turnstile_failed' }, 403);
    }
  }

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);

  const rl = await checkRateLimit(ipHash);
  if (!rl.allowed) {
    return json({
      ok: false,
      error: 'rate_limited',
      detail: rl.error || null,
      hourlyLimit: rl.hourlyLimit || 5,
      currentCount: rl.currentCount || null,
      resetsAt: rl.resetsAt || null,
    }, 429);
  }

  const token = generateToken();
  const writeOk = await writePendingRow({ token, email, cert, results: diagnosticResults });
  if (!writeOk) {
    return json({ ok: false, error: 'write_failed' }, 500);
  }

  return json({
    ok: true,
    token,
    redirectTo: buildRedirectUrl(cert, token),
    rateLimit: {
      currentCount: rl.currentCount,
      hourlyLimit: rl.hourlyLimit,
      resetsAt: rl.resetsAt,
    },
  });
}
