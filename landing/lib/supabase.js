// ══════════════════════════════════════════════════════════════════════════
// CertAnvil — Supabase client init
// ══════════════════════════════════════════════════════════════════════════
// Loaded AFTER the Supabase UMD CDN bundle (which sets window.supabase).
// Exposes window.certanvilSupabase for auth.js + future cert-app integration.
//
// The publishable key + project URL are PUBLIC-SAFE — they're meant to be
// exposed to the browser. Row-Level Security (RLS) policies in the database
// enforce that users can only read/write their own data. The service-role
// key (which bypasses RLS) is server-only and never ships to the browser.
//
// Cross-subdomain session: when running on certanvil.com (apex or any
// subdomain), the auth cookie is set on `.certanvil.com` so it inherits
// across networkplus.certanvil.com, secplus.certanvil.com, future certs.
// On localhost or vercel preview, default per-host cookies apply.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  // Public-safe config (NOT secrets — see header comment).
  var SUPABASE_URL = 'https://appmuaqwuethndvalarl.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZjmrS-j7ci6oSlsqu5gRJg_GDm4f4u0';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.warn('[certanvil] Supabase UMD bundle not loaded — auth disabled');
    return;
  }

  // Determine cookie domain for cross-subdomain session sharing.
  var cookieDomain;
  try {
    var host = window.location.hostname;
    if (host === 'certanvil.com' || (host && host.endsWith('.certanvil.com'))) {
      cookieDomain = '.certanvil.com';
    }
  } catch (e) {
    // ignore
  }

  var authOptions = {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,  // critical: picks up magic-link tokens from URL hash
    flowType: 'pkce',          // PKCE for SPA security
  };
  if (cookieDomain) {
    authOptions.cookieOptions = { domain: cookieDomain };
  }

  var client;
  try {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: authOptions,
    });
  } catch (err) {
    console.error('[certanvil] Failed to init Supabase client:', err);
    return;
  }

  window.certanvilSupabase = client;
  // Expose config so auth.js can build redirect URLs without re-deriving
  window.certanvilSupabaseConfig = {
    url: SUPABASE_URL,
    cookieDomain: cookieDomain || null,
  };
})();
