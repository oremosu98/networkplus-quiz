// ══════════════════════════════════════════════════════════════════════════
// CertAnvil notify-me email handler · Vercel serverless function
// ══════════════════════════════════════════════════════════════════════════
// POSTs from the landing page (script.js) hit this endpoint when a user
// signs up to be notified when a "Coming soon" cert launches.
//
// Storage strategy (incremental):
//   1. Always: persist signup to Vercel KV / a webhook / a CSV — so signups
//      survive even if Resend isn't configured yet
//   2. Optional: fire a confirmation email via Resend so the user gets
//      a "we got you" receipt
//
// Required env vars (set in Vercel dashboard → certanvil-landing → Settings → Environment Variables):
//   - RESEND_API_KEY       — Resend account API key (re_...)
//   - NOTIFY_FROM_EMAIL    — verified sender (e.g., notify@certanvil.com)
//                            requires DNS verification at Resend dashboard
//   - NOTIFY_ADMIN_EMAIL   — (optional) where to forward signup notifications
//                            for the builder to see
//
// If RESEND_API_KEY is missing the endpoint still ACCEPTS the signup and
// returns 200 (graceful degrade) — the signup is logged to Vercel logs so
// nothing is lost. Re-process from logs once Resend is configured.
//
// Local-only signups (when this endpoint is unreachable, e.g., during
// landing dev) are kept in localStorage by script.js as a fallback.

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // CORS — same origin only is fine, but allow OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = (body && body.email || '').trim().toLowerCase();
  const cert  = (body && body.cert || '').trim();
  const source = (body && body.source || 'certanvil-landing').trim();

  // ── Validate ────────────────────────────────────────────────────────────
  if (!email || !email.includes('@') || email.length > 254) {
    return json({ error: 'Invalid email' }, 400);
  }
  if (!cert || cert.length > 100) {
    return json({ error: 'Cert label required' }, 400);
  }

  // Honeypot — basic anti-bot. If body includes 'website' field, bail.
  if (body.website) {
    return json({ ok: true }, 200); // pretend success, log nothing
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

  return json({ ok: true, message: 'Signed up successfully' }, 200);
}

// ── Helpers ──────────────────────────────────────────────────────────────

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
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
