// ══════════════════════════════════════════════════════════════════════════
// CertAnvil notify-me email handler · Vercel serverless function
// ══════════════════════════════════════════════════════════════════════════
// POSTs from the landing page (script.js) hit this endpoint when a user
// signs up to be notified when a "Coming soon" cert launches.
//
// Storage strategy (3 layers of redundancy as of v4.99.10):
//   1. ALWAYS — write to Supabase notify_signups table (queryable persistence,
//      survives device changes + log rotation). UPSERT on (email, cert) so
//      double-clicks don't error. Soft-fail if Supabase unreachable so signup
//      continues through the other paths.
//   2. ALWAYS — log to Vercel logs (debugging trail; useful when Supabase
//      reports a write that doesn't show up in the dashboard).
//   3. OPTIONAL — fire confirmation email via Resend if RESEND_API_KEY is
//      present. Without the key, the signup is still SAVED — just no email.
//   4. CLIENT FALLBACK — landing/script.js keeps a localStorage backup
//      ('certanvil_notify_signups') in case the API is unreachable entirely.
//
// Required env vars (set in Vercel dashboard → certanvil-landing → Settings → Environment Variables):
//   - RESEND_API_KEY              — Resend account API key (re_...)
//   - NOTIFY_FROM_EMAIL           — verified sender (e.g., notify@certanvil.com)
//                                   requires DNS verification at Resend dashboard
//   - NOTIFY_ADMIN_EMAIL          — (optional) where to forward signup notifications
//                                   for the builder to see
//   - SUPABASE_URL                — (optional) override; defaults to certanvil project
//   - SUPABASE_PUBLISHABLE_KEY    — (optional) override; defaults to certanvil pub key
//   - SUPABASE_SERVICE_ROLE_KEY   — (optional) service-role key for the per-IP-hash
//                                   rate-limit RPC. If absent, the rate limit is
//                                   skipped (fail-OPEN) and signups continue —
//                                   so this ships safely BEFORE the env var is set.
//
// CORS (Security Phase 3 · M3b): the real signup is a same-origin POST from the
// certanvil.com landing page (script.js → fetch('/api/notify')), so CORS is only
// relevant to cross-origin callers. We allowlist the certanvil.com origins and
// echo the matching Origin back — no more `Access-Control-Allow-Origin: *`, which
// let any site on the web spam-insert waitlist rows.
//
// Rate limiting (Security Phase 3 · M3a): per-IP-hash, 10 POSTs / 1h rolling
// window, enforced via a Supabase SECURITY DEFINER RPC. Fails OPEN on any infra
// error (missing key / RPC down / throw) so a Supabase blip never blocks a real
// signup — the abuse it stops (bulk row spam) is lower-stakes than losing a lead.
//
// Migrations to apply BEFORE this code is useful:
//   supabase/migrations/20260509_notify_signups.sql
//     (creates the table + RLS policy that lets anon insert)
//   supabase/migrations/20260529_phase3_notify_rate_limit.sql
//     (creates notify_rate_limit + notify_rl_check_and_increment RPC — deploy
//      this migration together with this code change)
//
// Reading the signups (admin-only):
//   Open Supabase SQL editor → run:
//     select email, cert, created_at from notify_signups
//     where cert = 'Security+' order by created_at desc;

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // CORS (M3b) — allowlist the certanvil.com origins; echo the matching Origin.
  // The real signup is same-origin, so this never blocks legit traffic; it just
  // stops cross-origin sites from POSTing waitlist rows. OPTIONS preflight gets
  // the same headers (no ACAO when the Origin isn't allowed → browser blocks it).
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req),
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, req);
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: 'Invalid JSON body' }, 400, req);
  }

  const email = (body && body.email || '').trim().toLowerCase();
  const cert  = (body && body.cert || '').trim();
  const source = (body && body.source || 'certanvil-landing').trim();

  // ── Validate ────────────────────────────────────────────────────────────
  if (!email || !email.includes('@') || email.length > 254) {
    return json({ error: 'Invalid email' }, 400, req);
  }
  if (!cert || cert.length > 100) {
    return json({ error: 'Cert label required' }, 400, req);
  }

  // Honeypot — basic anti-bot. If body includes 'website' field, bail.
  // Kept BEFORE the rate limit so a tripped bot doesn't spend a real IP's
  // rate-limit budget (and we still "pretend success" with no side effects).
  if (body.website) {
    return json({ ok: true }, 200, req); // pretend success, log nothing
  }

  // ── Rate limit (M3a) — per-IP-hash, 10 / 1h, fail-OPEN ───────────────────
  // Gates row spam from a single IP. Fails OPEN: a missing service-role key or
  // any RPC error lets the signup through (a Supabase blip must never cost a
  // real lead). Only an explicit allowed:false from the RPC returns 429.
  const rl = await checkNotifyRateLimit(req);
  if (rl.limited) {
    return json({
      error: 'rate-limited',
      message: 'Too many signups from your network · please try again shortly',
      hourlyLimit: rl.hourlyLimit,
      currentCount: rl.currentCount,
      resetsAt: rl.resetsAt,
    }, 429, req);
  }

  // Log the signup (always, even when email service is unconfigured) —
  // shows up in Vercel logs and can be re-processed manually if needed.
  console.log('[certanvil-notify]', JSON.stringify({
    email,
    cert,
    source,
    at: new Date().toISOString(),
    ua: req.headers.get('user-agent') || '',
  }));

  // ── Persist to Supabase (waitlist table) — v4.99.10 ────────────────────
  // Soft-fail: if the table doesn't exist yet, or RLS rejects, or Supabase
  // is unreachable, we still continue through the rest of the flow. Vercel
  // logs + localStorage backup keep the signup alive in those cases.
  const supabaseUrl = process.env.SUPABASE_URL || 'https://appmuaqwuethndvalarl.supabase.co';
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY
    || 'sb_publishable_ZjmrS-j7ci6oSlsqu5gRJg_GDm4f4u0';
  let persistedToSupabase = false;
  if (supabaseUrl && supabaseKey) {
    try {
      // v4.99.14: switched from merge-duplicates → ignore-duplicates. The
      // merge-duplicates mode triggers Postgres' INSERT...ON CONFLICT DO UPDATE
      // path which evaluates BOTH the INSERT and UPDATE RLS policies upfront,
      // regardless of whether a conflict actually occurs. Our policy only
      // covers INSERT, so even brand-new rows were rejected with 42501.
      // ignore-duplicates → INSERT...ON CONFLICT DO NOTHING — no UPDATE path,
      // no UPDATE policy needed. Same UX from the user's perspective: clicking
      // Notify twice on the same cert silently no-ops (existing row stays).
      const sbResp = await fetch(supabaseUrl + '/rest/v1/notify_signups?on_conflict=email,cert', {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify({
          email: email,
          cert: cert,
          source: source,
          user_agent: req.headers.get('user-agent') || null,
        }),
      });
      if (sbResp.ok) {
        persistedToSupabase = true;
      } else {
        const errText = await sbResp.text();
        console.error('[certanvil-notify] Supabase insert failed:', sbResp.status, errText);
      }
    } catch (e) {
      console.error('[certanvil-notify] Supabase call threw:', e.message || String(e));
    }
  }
  console.log('[certanvil-notify] persisted_to_supabase:', persistedToSupabase);

  // ── Send via Resend if configured ──────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL || 'notify@certanvil.com';
  const adminEmail = process.env.NOTIFY_ADMIN_EMAIL;

  if (resendKey) {
    try {
      // 1. Send confirmation email to the user
      const userResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + resendKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CertAnvil <' + fromEmail + '>',
          to: [email],
          subject: 'You\'re on the list — ' + cert + ' alerts',
          html: buildUserHtml(cert),
          text: buildUserText(cert),
        }),
      });
      if (!userResp.ok) {
        const err = await userResp.text();
        console.error('[certanvil-notify] Resend user email failed:', userResp.status, err);
      }

      // 2. (Optional) ping the admin so the builder knows about the signup
      if (adminEmail) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + resendKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CertAnvil <' + fromEmail + '>',
            to: [adminEmail],
            reply_to: email,
            subject: 'New CertAnvil signup: ' + cert + ' (' + email + ')',
            html: buildAdminHtml(email, cert, source),
            text: buildAdminText(email, cert, source),
          }),
        });
      }
    } catch (e) {
      console.error('[certanvil-notify] Resend call threw:', e.message || String(e));
      // Don't fail the request — the signup is logged.
    }
  }

  return json({
    ok: true,
    message: 'Signed up successfully',
    // v4.99.10 — surface persistence outcome for client-side UX (script.js can
    // tweak the modal copy when persisted_to_supabase: true vs false). Default
    // copy still works for both.
    persisted_to_supabase: persistedToSupabase,
  }, 200, req);
}

// ── Helpers ──────────────────────────────────────────────────────────────

// CORS allowlist (M3b). The notify form is served from certanvil.com (apex) —
// www is included defensively in case a visitor lands there. Per-cert subdomains
// (networkplus.certanvil.com, …) live in separate Vercel projects and never call
// this endpoint, so they're intentionally NOT here.
const ALLOWED_ORIGINS = new Set([
  'https://certanvil.com',
  'https://www.certanvil.com',
]);

function corsHeaders(req) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  const origin = req && req.headers && req.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(payload, status, req) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}

// ── Rate limit (M3a) ───────────────────────────────────────────────────────
// Per-IP-hash, 10 POSTs / 1h, via the notify_rl_check_and_increment SECURITY
// DEFINER RPC (service-role key). FAIL-OPEN on every infra error path: a missing
// key, a non-2xx RPC response, an empty body, or a thrown fetch all return
// { limited: false } so the signup proceeds. Only an explicit allowed:false from
// the RPC returns { limited: true } → 429.
async function checkNotifyRateLimit(req) {
  const PASS = { limited: false };
  const supabaseUrl = process.env.SUPABASE_URL || 'https://appmuaqwuethndvalarl.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // No service-role key configured → skip the limit (graceful pre-config; same
  // soft-degrade philosophy as the rest of this endpoint).
  if (!supabaseUrl || !serviceKey) {
    console.warn('[certanvil-notify] SUPABASE_SERVICE_ROLE_KEY missing · rate limit skipped (fail-open)');
    return PASS;
  }
  try {
    const ipHash = await hashIp(extractIp(req));
    const resp = await fetch(supabaseUrl + '/rest/v1/rpc/notify_rl_check_and_increment', {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_ip_hash: ipHash }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[certanvil-notify] Rate-limit RPC failed (fail-open):', resp.status, text);
      return PASS; // fail-OPEN
    }
    const data = await resp.json();
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      console.error('[certanvil-notify] Rate-limit RPC returned empty (fail-open)');
      return PASS; // fail-OPEN
    }
    if (row.allowed === false) {
      return {
        limited: true,
        hourlyLimit: row.hourly_limit,
        currentCount: row.current_count,
        resetsAt: row.resets_at,
      };
    }
    return PASS;
  } catch (e) {
    console.error('[certanvil-notify] Rate-limit RPC threw (fail-open):', e && (e.message || String(e)));
    return PASS; // fail-OPEN
  }
}

function extractIp(req) {
  // Vercel forwards client IP via x-forwarded-for · x-real-ip · cf-connecting-ip
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    '0.0.0.0'
  );
}

async function hashIp(ip) {
  // SHA-256 truncated to first 16 hex chars · raw IP never stored. Distinct salt
  // from the diagnostic endpoints so the same IP's hashes don't correlate across
  // tables.
  const enc = new TextEncoder().encode(ip + '::certanvil-notify-salt-v1');
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildUserHtml(cert) {
  return `
<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;background:#fafbff;padding:32px 24px;max-width:560px;margin:0 auto;">
<div style="background:#fff;border:1px solid #e5e7f0;border-radius:14px;padding:32px;">
  <div style="font-size:24px;font-weight:800;color:#1a1a2e;margin-bottom:8px;letter-spacing:-0.02em;">🔨 You're on the list.</div>
  <div style="color:#4a4a6e;font-size:15px;line-height:1.55;margin-bottom:20px;">
    Thanks for signing up for <strong style="color:#1a1a2e;">${escapeHtml(cert)}</strong> alerts. The moment we ship that cert pack on CertAnvil, you'll get one short email — link to the live tool, no spam, no follow-up sequences.
  </div>
  <div style="background:#fafbff;border:1px solid #e5e7f0;border-radius:10px;padding:14px 16px;font-size:13px;color:#4a4a6e;line-height:1.55;margin-bottom:20px;">
    <strong style="color:#1a1a2e;">In the meantime:</strong> Network+ is already live at <a href="https://certanvil.com" style="color:#5b4fdb;text-decoration:none;font-weight:600;">certanvil.com</a> — same engine, same quality bar, same author.
  </div>
  <div style="font-size:12px;color:#8a8aac;line-height:1.55;">
    You can unsubscribe from this list at any time by replying to a future email and saying "unsubscribe."
  </div>
</div>
<div style="text-align:center;margin-top:20px;font-size:11px;color:#8a8aac;font-family:'SF Mono','Monaco',monospace;">
  certanvil.com · forged in code
</div>
</body></html>`;
}

function buildUserText(cert) {
  return [
    "🔨 You're on the list.",
    '',
    'Thanks for signing up for ' + cert + ' alerts. The moment we ship that cert pack on CertAnvil, you\'ll get one short email — link to the live tool, no spam, no follow-up sequences.',
    '',
    'In the meantime: Network+ is already live at https://certanvil.com — same engine, same quality bar, same author.',
    '',
    'You can unsubscribe from this list at any time by replying to a future email and saying "unsubscribe."',
    '',
    '— certanvil.com · forged in code',
  ].join('\n');
}

function buildAdminHtml(email, cert, source) {
  return [
    '<p>New CertAnvil signup:</p>',
    '<ul>',
    '<li><strong>Email:</strong> ' + escapeHtml(email) + '</li>',
    '<li><strong>Cert:</strong> ' + escapeHtml(cert) + '</li>',
    '<li><strong>Source:</strong> ' + escapeHtml(source) + '</li>',
    '<li><strong>At:</strong> ' + new Date().toISOString() + '</li>',
    '</ul>',
  ].join('');
}

function buildAdminText(email, cert, source) {
  return [
    'New CertAnvil signup',
    'Email: ' + email,
    'Cert: ' + cert,
    'Source: ' + source,
    'At: ' + new Date().toISOString(),
  ].join('\n');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
