// ══════════════════════════════════════════════════════════════════════════
// /api/diagnostic/email-report · v4.99.57 · D.6
// ══════════════════════════════════════════════════════════════════════════
// POST sends a diagnostic score report to the user's email via Resend.
// Optionally creates a shareable /r/{token} URL first (or accepts one the
// client created via /api/diagnostic/share) and embeds it in the email.
//
// Body:
//   email              · required
//   cert               · 'network-plus' | 'security-plus'
//   diagnosticResults  · full envelope
//   shareToken         · optional · if present, reuses the token rather
//                        than creating a fresh share row
//
// Returns:
//   200 { ok: true, shareUrl }
//   400 invalid_email / invalid_cert / invalid_results / incomplete_results
//   429 rate_limited
//   500 send_failed / share_write_failed
//   503 service_unconfigured
//
// Email service: Resend (same provider notify.js uses · same RESEND_API_KEY
// env var). NOTIFY_FROM_EMAIL is reused as the sender; defaults to
// notify@certanvil.com.
// ══════════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || 'notify@certanvil.com';
const IP_HASH_SALT = 'certanvil-diagnostic-salt-v1';
const ALLOWED_CERTS = ['network-plus', 'security-plus'];
const PUBLIC_BASE_URL = 'https://certanvil.com';

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
  if (!RESEND_API_KEY) missing.push('RESEND_API_KEY');
  return { ok: missing.length === 0, missing };
}

function isValidEmail(s) {
  if (typeof s !== 'string' || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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

async function ensureShareToken({ providedToken, cert, results }) {
  if (providedToken && /^[a-f0-9]{16,64}$/i.test(providedToken)) {
    // Optional sanity: confirm the token row exists so the email link
    // doesn't 404. Cheap: anon SELECT.
    const checkUrl = SUPABASE_URL + '/rest/v1/diagnostic_share' +
      '?token=eq.' + encodeURIComponent(providedToken) + '&select=token';
    const r = await fetch(checkUrl, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    if (r.ok) {
      const rows = await r.json().catch(() => null);
      if (Array.isArray(rows) && rows.length > 0) return providedToken;
    }
    // Token didn't exist · fall through to create a fresh one
  }

  // Create a new share row
  const token = generateToken();
  const writeRes = await fetch(SUPABASE_URL + '/rest/v1/diagnostic_share', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ token, cert, results }),
  });
  if (!writeRes.ok) return null;
  return token;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function buildEmail({ email, cert, results, shareUrl }) {
  const certLabel = cert === 'network-plus' ? 'Network+' : (cert === 'security-plus' ? 'Security+' : cert);
  const passVerdict = results.isPassing
    ? 'above the ' + results.passThreshold + ' pass threshold'
    : 'below the ' + results.passThreshold + ' pass threshold';
  const weakest = (results.domainBreakdown && results.domainBreakdown[0]) || null;
  const accuracyPct = Math.round((results.accuracy || 0) * 100);

  const subject = 'Your CertAnvil ' + certLabel + ' baseline · ' + results.scaledScore + '/900';

  // Domain breakdown HTML (top 5)
  const domainRows = (results.domainBreakdown || []).slice(0, 5).map((d) => {
    const pct = Math.round((d.accuracy || 0) * 100);
    const colour = d.accuracy < 0.5 ? '#b91c1c' : (d.accuracy < 0.8 ? '#b45309' : '#15803d');
    return '<tr>' +
      '<td style="padding:6px 12px 6px 0;color:#1a1a26;font-size:14px;">' + escapeHtml(d.domain) +
        ' <span style="color:#8a8b9c;font-size:12px;">(' + d.correct + '/' + d.total + ')</span></td>' +
      '<td style="padding:6px 0;text-align:right;font-weight:700;color:' + colour + ';font-size:14px;">' + pct + '%</td>' +
    '</tr>';
  }).join('');

  const html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
    '<body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f5f6f9;color:#1a1a26;">' +
    '<div style="max-width:560px;margin:0 auto;padding:32px 24px;">' +
      '<h1 style="font-size:24px;font-weight:800;letter-spacing:-.02em;margin:0 0 6px;">Your ' + escapeHtml(certLabel) + ' baseline</h1>' +
      '<p style="margin:0 0 24px;font-size:14px;color:#6c6d80;">A snapshot of where you stand on the CompTIA ' + escapeHtml(certLabel) + ' exam today.</p>' +

      // Score block
      '<div style="background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:24px;text-align:center;margin-bottom:18px;">' +
        '<div style="font-size:48px;font-weight:800;color:#1a1a26;line-height:1;">' + results.scaledScore + '</div>' +
        '<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8a8b9c;font-weight:700;margin-top:4px;">/ 900 · pass 720</div>' +
        '<div style="margin-top:12px;font-size:13px;color:#4a4b5e;">' +
          results.correctCount + ' / ' + results.totalQuestions + ' correct · <strong>' + escapeHtml(passVerdict) + '</strong> · ' + accuracyPct + '% accuracy' +
        '</div>' +
      '</div>' +

      // Domain breakdown table
      '<div style="background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:18px 22px;margin-bottom:18px;">' +
        '<p style="margin:0 0 8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a8b9c;font-weight:700;">By domain · weakest first</p>' +
        '<table style="width:100%;border-collapse:collapse;">' + domainRows + '</table>' +
      '</div>' +

      // Weak-domain spotlight + Pass Plan link
      (weakest ? (
        '<div style="background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:18px 22px;margin-bottom:18px;">' +
          '<p style="margin:0 0 6px;font-size:13px;color:#4a4b5e;line-height:1.55;">' +
            '<strong>Start here:</strong> Your weakest domain is ' +
            '<strong style="color:#b91c1c;">' + escapeHtml(weakest.domain) + '</strong> ' +
            '(' + Math.round((weakest.accuracy || 0) * 100) + '%). The full Pass Plan and per-domain drill suggestions live on the shareable link below.' +
          '</p>' +
        '</div>'
      ) : '') +

      // CTA — view full report
      '<div style="text-align:center;margin:28px 0 24px;">' +
        '<a href="' + escapeHtml(shareUrl) + '" style="display:inline-block;background:#7c6ff7;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">View full Pass Plan →</a>' +
        '<p style="margin:10px 0 0;font-size:11px;color:#8a8b9c;">Shareable link · valid 90 days · ' + escapeHtml(shareUrl) + '</p>' +
      '</div>' +

      // Footer
      '<p style="margin:32px 0 0;font-size:11px;color:#8a8b9c;line-height:1.55;border-top:1px solid rgba(0,0,0,.08);padding-top:18px;">' +
        'You requested this report from your diagnostic results page on certanvil.com.<br>' +
        'You\'ll only receive email from us when you ask for it. <a href="https://certanvil.com/privacy" style="color:#7c6ff7;">Privacy policy</a>.' +
      '</p>' +
    '</div></body></html>';

  // Plain-text fallback
  const text = 'Your CertAnvil ' + certLabel + ' baseline\n\n' +
    'Score: ' + results.scaledScore + ' / 900 (pass = ' + results.passThreshold + ')\n' +
    'Correct: ' + results.correctCount + ' / ' + results.totalQuestions + ' (' + accuracyPct + '% accuracy)\n' +
    'Verdict: ' + passVerdict + '\n\n' +
    (weakest ? 'Weakest domain: ' + weakest.domain + ' (' + Math.round((weakest.accuracy || 0) * 100) + '%)\n\n' : '') +
    'View the full Pass Plan + per-domain drill suggestions:\n' + shareUrl + '\n\n' +
    'You requested this report from certanvil.com. Privacy policy: https://certanvil.com/privacy\n';

  return { subject, html, text };
}

async function sendViaResend({ to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'CertAnvil <' + FROM_EMAIL + '>',
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: err };
  }
  const body = await res.json().catch(() => ({}));
  return { ok: true, id: body.id };
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const env = checkEnv();
  if (!env.ok) return json({ ok: false, error: 'service_unconfigured', missing: env.missing }, 503);

  let body;
  try { body = await req.json(); }
  catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }

  const { email, cert, diagnosticResults, shareToken } = body || {};
  if (!isValidEmail(email)) return json({ ok: false, error: 'invalid_email' }, 400);
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

  // Always create or reuse a share token so the email contains a permalink
  const token = await ensureShareToken({
    providedToken: shareToken,
    cert,
    results: diagnosticResults,
  });
  if (!token) return json({ ok: false, error: 'share_write_failed' }, 500);
  const shareUrl = PUBLIC_BASE_URL + '/r/' + token;

  // Build + send
  const { subject, html, text } = buildEmail({
    email: email.toLowerCase().trim(),
    cert,
    results: diagnosticResults,
    shareUrl,
  });

  const sendResult = await sendViaResend({
    to: email.toLowerCase().trim(),
    subject, html, text,
  });
  if (!sendResult.ok) {
    return json({
      ok: false,
      error: 'send_failed',
      detail: sendResult.error || ('status ' + sendResult.status),
    }, 500);
  }

  return json({
    ok: true,
    token,
    shareUrl,
    messageId: sendResult.id || null,
  });
}
