// ══════════════════════════════════════════════════════════════════════════
// /api/diagnostic/share-redirect · v4.99.57 · D.6
// ══════════════════════════════════════════════════════════════════════════
// Vercel rewrite target for /r/{token}. Looks up the cert from
// diagnostic_share and 302-redirects to /diagnostic/{cert}/results?token=…
// where results.html does the actual rendering (hydrates via share-fetch).
//
// Two reasons not to render HTML here directly:
//   1. We'd duplicate the full results.html rendering pipeline (~700 LOC)
//      server-side just for the share view. Single source of truth wins.
//   2. The rewrite + 302 pattern keeps the canonical results URL pointing
//      at /diagnostic/<cert>/results which is where the live diagnostic
//      ends users up. Symmetry.
//
// On unknown / expired token we 302 to /diagnostic with a soft error toast
// (?error=share-not-found) so the user lands somewhere useful.
//
// vercel.json rewrite: { "source": "/r/:token", "destination": "/api/diagnostic/share-redirect?token=:token" }
// ══════════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ||
                                 process.env.SUPABASE_ANON_KEY || '';

function redirect(location, status = 302) {
  return new Response(null, {
    status,
    headers: { Location: location, 'Cache-Control': 'no-store' },
  });
}

function notConfigured() {
  // Pre-config deploy: 302 to landing /diagnostic with a soft toast hint.
  return redirect('/diagnostic?error=share-not-configured');
}

function isValidToken(s) {
  return typeof s === 'string' && /^[a-f0-9]{16,64}$/i.test(s);
}

export default async function handler(req) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return notConfigured();

  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  if (!isValidToken(token)) return redirect('/diagnostic?error=share-invalid-token');

  // Look up cert by token via the token-scoped SECURITY DEFINER RPC. The open
  // RLS SELECT policy was dropped in 20260529_phase2_db_quick_wins.sql
  // (anti-enumeration); the RPC returns only the matching, non-expired row.
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/get_diagnostic_share', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_token: token }),
  });
  if (!res.ok) return redirect('/diagnostic?error=share-fetch-failed');
  const rows = await res.json().catch(() => null);
  if (!Array.isArray(rows) || rows.length === 0) {
    return redirect('/diagnostic?error=share-not-found');
  }

  const cert = rows[0].cert;
  const expiresAt = rows[0].expires_at ? new Date(rows[0].expires_at).getTime() : 0;
  if (expiresAt && expiresAt < Date.now()) {
    return redirect('/diagnostic?error=share-expired');
  }

  // Whitelist cert before composing the redirect URL — never compose user data
  // straight into a redirect path.
  const certPath = (cert === 'network-plus' || cert === 'security-plus') ? cert : 'network-plus';
  return redirect('/diagnostic/' + certPath + '/results?token=' + encodeURIComponent(token));
}
