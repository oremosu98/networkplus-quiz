// ══════════════════════════════════════════════════════════════════════════
// CertAnvil cert app — Supabase client init (Phase C′)
// ══════════════════════════════════════════════════════════════════════════
// Loaded after the Supabase UMD CDN bundle. Exposes window.certanvilSupabase
// for cloud-store, auth-state, and migration modules.
//
// Mirrors landing/lib/supabase.js — same publishable key, same apex cookie
// domain config so the session set on certanvil.com is visible here at
// networkplus.certanvil.com (and future cert subdomains).
//
// The publishable key is PUBLIC-SAFE — RLS policies in the database enforce
// that users only see/modify their own data. Service-role key (which bypasses
// RLS) is server-only and never ships to the browser.
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  var SUPABASE_URL = 'https://appmuaqwuethndvalarl.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZjmrS-j7ci6oSlsqu5gRJg_GDm4f4u0';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.warn('[certanvil] Supabase UMD bundle not loaded — cloud features disabled');
    return;
  }

  // Apex cookie domain for cross-subdomain session sharing.
  // Production:    .certanvil.com (cookie shared apex + all subdomains)
  // Localhost dev: undefined     (default per-host cookies)
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
    detectSessionInUrl: true,  // picks up magic-link tokens from URL on landing redirects
    flowType: 'pkce',
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
  window.certanvilSupabaseConfig = {
    url: SUPABASE_URL,
    cookieDomain: cookieDomain || null,
  };
})();
