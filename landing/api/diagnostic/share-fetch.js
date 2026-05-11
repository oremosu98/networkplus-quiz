// ══════════════════════════════════════════════════════════════════════════
// /api/diagnostic/share-fetch · v4.99.57 · D.6
// ══════════════════════════════════════════════════════════════════════════
// GET reads a diagnostic_share row by token and returns the saved results
// JSON. Used by results.html to hydrate when the user lands on
// /diagnostic/<cert>/results?token=… (typically arrived via the /r/{token}
// short URL after share-redirect.js bounced them here).
//
// Anon-readable — the diagnostic_share table has an open RLS SELECT policy
// because token uniqueness + entropy is the access gate. No service-role
// key needed for the read. We use the SUPABASE_PUBLISHABLE_KEY (anon key,
// same one the cert app uses) so this endpoint works even without
// SUPABASE_SERVICE_ROLE_KEY.
//
// Also fires increment_share_view(token) so the share-view counter ticks.
//
// Returns:
//   200 { ok: true, cert, results, viewCount, createdAt, expiresAt }
//   400 invalid_token
//   404 not_found / expired
//   503 service_unconfigured
// ══════════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL || '';
// Anon key — same one cert app + landing use client-side. NOT the service role.
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ||
                                 process.env.SUPABASE_ANON_KEY || '';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // CDN-cache friendly but short — share rows are immutable post-creation
      // but view_count is meant to be live, so we don't long-cache.
      'Cache-Control': 'no-store',
    },
  });
}

function checkEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_PUBLISHABLE_KEY) missing.push('SUPABASE_PUBLISHABLE_KEY');
  return { ok: missing.length === 0, missing };
}

function isValidToken(s) {
  if (typeof s !== 'string') return false;
  // 32 hex chars (16 bytes) — but accept 16+ to leave room for future formats
  return /^[a-f0-9]{16,64}$/i.test(s);
}

export default async function handler(req) {
  if (req.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const env = checkEnv();
  if (!env.ok) return json({ ok: false, error: 'service_unconfigured', missing: env.missing }, 503);

  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  if (!isValidToken(token)) return json({ ok: false, error: 'invalid_token' }, 400);

  // Fetch the share row via REST · anon key + open RLS = no service role needed
  const fetchUrl = SUPABASE_URL + '/rest/v1/diagnostic_share' +
    '?token=eq.' + encodeURIComponent(token) +
    '&select=token,cert,results,view_count,created_at,expires_at';
  const res = await fetch(fetchUrl, {
    headers: {
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!res.ok) return json({ ok: false, error: 'fetch_failed', status: res.status }, 500);
  const rows = await res.json().catch(() => null);
  if (!Array.isArray(rows) || rows.length === 0) {
    return json({ ok: false, error: 'not_found' }, 404);
  }
  const row = rows[0];
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (expiresAt && expiresAt < Date.now()) {
    return json({ ok: false, error: 'expired', expiresAt: row.expires_at }, 404);
  }

  // Fire-and-forget view-counter bump. Don't await — even a slow RPC
  // shouldn't slow down the page hydrate. The token has already been
  // validated by the SELECT above so the RPC is safe to call.
  fetch(SUPABASE_URL + '/rest/v1/rpc/increment_share_view', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_token: token }),
  }).catch(() => { /* silent — telemetry is best-effort */ });

  return json({
    ok: true,
    cert: row.cert,
    results: row.results,
    viewCount: row.view_count,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  });
}
