// ══════════════════════════════════════════════════════════════════════════
// /api/diagnostic/share · v4.99.57 · D.6
// ══════════════════════════════════════════════════════════════════════════
// POST creates a public shareable URL for an anonymous diagnostic result.
// Server-side: validate, rate-limit per IP, write to diagnostic_share, return
// { token, shareUrl } so the client can copy the /r/{token} link.
//
// Body:
//   cert               · 'network-plus' | 'security-plus'
//   diagnosticResults  · full envelope (scaledScore + totalQuestions + …)
//
// Returns:
//   { ok: true, token, shareUrl: 'https://certanvil.com/r/<token>' }
//
// Errors:
//   400 invalid_cert / invalid_results / incomplete_results
//   429 rate_limited (resetsAt in body)
//   500 write_failed
//   503 service_unconfigured (env vars missing)
// ══════════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const IP_HASH_SALT = 'certanvil-diagnostic-salt-v1';
const ALLOWED_CERTS = ['network-plus', 'security-plus'];
const PUBLIC_BASE_URL = 'https://certanvil.com';  // /r/{token} short URL

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function checkEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  return { ok: missing.length === 0, missing };
}

function getClientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '0.0.0.0';
}

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashIp(ip) {
  return (await sha256Hex(IP_HASH_SALT + ':' + ip)).slice(0, 16);
}

function generateToken() {
  // 32 hex chars = 16 random bytes (WebCrypto · edge runtime)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function checkRateLimit(ipHash) {
  const url = SUPABASE_URL + '/rest/v1/rpc/diag_email_check_and_increment';
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
  if (!res.ok) return { allowed: false, error: 'rate_limit_rpc_failed', hourlyLimit: 10 };
  const data = await res.json().catch(() => null);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { allowed: false, error: 'rate_limit_no_row', hourlyLimit: 10 };
  return {
    allowed: Boolean(row.allowed),
    currentCount: row.current_count,
    hourlyLimit: row.hourly_limit,
    resetsAt: row.resets_at,
  };
}

async function writeShareRow({ token, cert, results }) {
  const url = SUPABASE_URL + '/rest/v1/diagnostic_share';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ token, cert, results }),
  });
  return res.ok;
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const env = checkEnv();
  if (!env.ok) return json({ ok: false, error: 'service_unconfigured', missing: env.missing }, 503);

  let body;
  try { body = await req.json(); }
  catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }

  const { cert, diagnosticResults } = body || {};
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

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);
  const rl = await checkRateLimit(ipHash);
  if (!rl.allowed) {
    return json({
      ok: false, error: 'rate_limited',
      hourlyLimit: rl.hourlyLimit || 10,
      currentCount: rl.currentCount || null,
      resetsAt: rl.resetsAt || null,
    }, 429);
  }

  const token = generateToken();
  const writeOk = await writeShareRow({ token, cert, results: diagnosticResults });
  if (!writeOk) return json({ ok: false, error: 'write_failed' }, 500);

  return json({
    ok: true,
    token,
    shareUrl: PUBLIC_BASE_URL + '/r/' + token,
    rateLimit: {
      currentCount: rl.currentCount,
      hourlyLimit: rl.hourlyLimit,
      resetsAt: rl.resetsAt,
    },
  });
}
