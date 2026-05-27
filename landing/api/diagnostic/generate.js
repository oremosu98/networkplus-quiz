// ══════════════════════════════════════════════════════════════════════════
// CertAnvil · /api/diagnostic/generate · D.3 · v4.99.54
// ══════════════════════════════════════════════════════════════════════════
// Generates anonymous Network+ / Security+ baseline diagnostic questions
// via Anthropic Claude. Anti-abuse stack:
//   1. Turnstile invisible challenge — Cloudflare bot protection
//   2. Per-IP-hash 24h rate limit — 25 calls / window via Supabase RPC
//   3. Hard cap per request — count <= 25 (server-enforced)
//   4. Graceful fallback — if Anthropic 503s, endpoint returns a soft 503
//      and the client falls back to the inline question pool from D.2
//
// Required env vars (Vercel dashboard · landing project · Production+Preview):
//   - ANTHROPIC_API_KEY          — sk-ant-...        Anthropic API access
//   - TURNSTILE_SECRET_KEY       — 0x...             Cloudflare Turnstile secret
//   - SUPABASE_URL               — https://...co     Supabase project URL
//   - SUPABASE_SERVICE_ROLE_KEY  — eyJ...            service-role key for rate-limit RPC
//
// All env vars are OPTIONAL — if any is missing, the endpoint degrades
// gracefully (returns 503 with a clear error message) and the client falls
// back to the inline pool. This means D.3 ships safely BEFORE the founder
// sets the env vars; nothing breaks.
//
// Migration that backs this endpoint:
//   supabase/migrations/20260511_diagnostic_rate_limit.sql
//   (creates diagnostic_rate_limit table + diag_rl_check_and_increment RPC)
// ══════════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' };

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_MAX_TOKENS = 8000;
const HARD_QUESTION_CAP = 25;

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method-not-allowed', message: 'POST only' }, 405);
  }

  // ── 1. Parse body ──
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: 'bad-request', message: 'Invalid JSON body' }, 400);
  }

  const cert = (body && body.cert || '').trim();
  const requestedCount = parseInt(body && body.count, 10);
  const turnstileToken = (body && body.turnstileToken || '').trim();
  const intake = (body && typeof body.intake === 'object') ? body.intake : null;

  // ── 2. Validate input ──
  if (cert !== 'network-plus' && cert !== 'security-plus' && cert !== 'azure-fundamentals' && cert !== 'azure-ai-fundamentals') {
    return json({ error: 'bad-request', message: 'Invalid cert · must be "network-plus", "security-plus", "azure-fundamentals", or "azure-ai-fundamentals"' }, 400);
  }
  if (!Number.isFinite(requestedCount) || requestedCount < 1 || requestedCount > HARD_QUESTION_CAP) {
    return json({ error: 'bad-request', message: 'Invalid count · 1-' + HARD_QUESTION_CAP }, 400);
  }
  if (!turnstileToken) {
    return json({ error: 'turnstile-required', message: 'Bot-protection token required' }, 400);
  }

  // ── 3. Turnstile verify ──
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (!turnstileSecret) {
    console.error('[diagnostic-generate] TURNSTILE_SECRET_KEY env var missing');
    return json(
      { error: 'service-unavailable', message: 'Diagnostic generation not yet configured · fallback to local pool' },
      503
    );
  }
  const tsVerified = await verifyTurnstile(turnstileToken, turnstileSecret, req);
  if (!tsVerified.ok) {
    console.warn('[diagnostic-generate] Turnstile rejected:', tsVerified.codes);
    return json(
      { error: 'turnstile-failed', message: 'Bot check failed · please refresh and try again', codes: tsVerified.codes },
      403
    );
  }

  // ── 4. Rate limit ──
  const ipHash = await hashIp(extractIp(req));
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[diagnostic-generate] Supabase env vars missing · rate limit cannot run');
    return json(
      { error: 'service-unavailable', message: 'Rate-limit service offline · fallback to local pool' },
      503
    );
  }
  const rl = await checkRateLimit(supabaseUrl, supabaseServiceKey, ipHash, cert, requestedCount);
  if (!rl.ok) {
    return json({
      error: 'service-error',
      message: 'Could not verify your rate-limit allowance · please try again shortly',
      detail: rl.detail
    }, 503);
  }
  if (!rl.allowed) {
    return json({
      error: 'quota-exceeded',
      message: 'Daily diagnostic limit reached for this IP · come back tomorrow or sign in for unlimited',
      currentCount: rl.currentCount,
      dailyLimit: rl.dailyLimit,
      resetsAt: rl.resetsAt
    }, 429);
  }

  // ── 5. Anthropic call ──
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error('[diagnostic-generate] ANTHROPIC_API_KEY env var missing');
    return json(
      { error: 'service-unavailable', message: 'AI generation not yet configured · fallback to local pool' },
      503
    );
  }

  let questions;
  try {
    questions = await generateQuestions(anthropicKey, cert, requestedCount, intake);
  } catch (e) {
    console.error('[diagnostic-generate] Anthropic call failed:', e && e.message);
    return json(
      { error: 'ai-generation-failed', message: 'AI generation unavailable · using local fallback pool' },
      503
    );
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return json(
      { error: 'ai-empty-response', message: 'AI returned no usable questions · using local fallback pool' },
      503
    );
  }

  // ── 6. Success ──
  return json({
    ok: true,
    source: 'ai',
    generatedAt: Date.now(),
    cert,
    count: questions.length,
    rateLimit: { currentCount: rl.currentCount, dailyLimit: rl.dailyLimit, resetsAt: rl.resetsAt },
    questions
  }, 200);
}

// ══════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
    },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
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
  // SHA-256 truncated to first 16 hex chars · raw IP never stored
  const enc = new TextEncoder().encode(ip + '::certanvil-diagnostic-salt-v1');
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyTurnstile(token, secret, req) {
  try {
    const ip = extractIp(req);
    const form = new URLSearchParams();
    form.set('secret', secret);
    form.set('response', token);
    if (ip && ip !== '0.0.0.0') form.set('remoteip', ip);
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = await resp.json();
    return { ok: !!data.success, codes: data['error-codes'] || [] };
  } catch (e) {
    console.error('[diagnostic-generate] Turnstile verify threw:', e && e.message);
    return { ok: false, codes: ['network-error'] };
  }
}

async function checkRateLimit(supabaseUrl, serviceKey, ipHash, cert, increment) {
  try {
    const resp = await fetch(
      supabaseUrl + '/rest/v1/rpc/diag_rl_check_and_increment',
      {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': 'Bearer ' + serviceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_ip_hash: ipHash,
          p_cert: cert,
          p_increment: increment,
        }),
      }
    );
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[diagnostic-generate] Rate-limit RPC failed:', resp.status, text);
      return { ok: false, detail: 'rpc-' + resp.status };
    }
    const data = await resp.json();
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      console.error('[diagnostic-generate] Rate-limit RPC returned empty');
      return { ok: false, detail: 'empty-rpc-response' };
    }
    return {
      ok: true,
      allowed: !!row.allowed,
      currentCount: row.current_count,
      dailyLimit: row.daily_limit,
      resetsAt: row.resets_at,
    };
  } catch (e) {
    console.error('[diagnostic-generate] Rate-limit RPC threw:', e && e.message);
    return { ok: false, detail: 'rpc-threw' };
  }
}

// ── Anthropic generation ──

async function generateQuestions(apiKey, cert, count, intake) {
  const prompt = buildDiagnosticPrompt(cert, count, intake);
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error('Anthropic ' + resp.status + ': ' + errBody.slice(0, 200));
  }

  const data = await resp.json();
  const text = (data.content && data.content[0] && data.content[0].text) || '';

  // Strip ```json fences if present
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Try to find a JSON array inside the text
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch (_) {}
    }
  }

  if (!Array.isArray(parsed)) return [];

  // Shape-validate each question
  return parsed
    .map(normalizeQuestion)
    .filter(q => q !== null)
    .slice(0, count);
}

function normalizeQuestion(q) {
  if (!q || typeof q !== 'object') return null;
  if (typeof q.question !== 'string' || q.question.length < 20) return null;
  if (typeof q.answer !== 'string' || q.answer.length !== 1) return null;
  if (!'ABCD'.includes(q.answer)) return null;
  if (!q.options || typeof q.options !== 'object') return null;
  if (typeof q.options.A !== 'string' || typeof q.options.B !== 'string'
      || typeof q.options.C !== 'string' || typeof q.options.D !== 'string') return null;
  return {
    id: q.id || (Math.random().toString(36).slice(2, 10)),
    domain: String(q.domain || '').slice(0, 80),
    topic: String(q.topic || '').slice(0, 80),
    objective: String(q.objective || '').slice(0, 16),
    difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
    question: q.question,
    options: {
      A: q.options.A,
      B: q.options.B,
      C: q.options.C,
      D: q.options.D,
    },
    answer: q.answer,
    explanation: String(q.explanation || '').slice(0, 600),
  };
}

function buildDiagnosticPrompt(cert, count, intake) {
  let certMeta;
  if (cert === 'security-plus') {
    certMeta = {
      name: 'CompTIA Security+',
      code: 'SY0-701',
      vendor: 'CompTIA',
      domains: [
        { id: 1, label: 'General Security Concepts', weight: 12 },
        { id: 2, label: 'Threats, Vulnerabilities, and Mitigations', weight: 22 },
        { id: 3, label: 'Security Architecture', weight: 18 },
        { id: 4, label: 'Security Operations', weight: 28 },
        { id: 5, label: 'Security Program Management', weight: 20 },
      ],
      passMark: 750,
      maxScore: 900,
    };
  } else if (cert === 'azure-fundamentals') {
    certMeta = {
      name: 'Microsoft Azure Fundamentals',
      code: 'AZ-900',
      vendor: 'Microsoft',
      domains: [
        { id: 1, label: 'Cloud Concepts', weight: 28 },
        { id: 2, label: 'Azure Architecture & Services', weight: 38 },
        { id: 3, label: 'Azure Management & Governance', weight: 34 },
      ],
      passMark: 700,
      maxScore: 1000,
      // Public Microsoft Skills Measured objective ranges per domain
      objectiveRanges: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '3.3', '3.4'],
    };
  } else if (cert === 'azure-ai-fundamentals') {
    // v7.5.0 — AI-900 cert branch. May 2025 Skills Measured refresh added
    // Domain 5 (Generative AI workloads) + renamed Azure AI Studio → Azure AI
    // Foundry. Bias prompt toward service-identification scenarios per VoC §3.
    certMeta = {
      name: 'Microsoft Azure AI Fundamentals',
      code: 'AI-900',
      vendor: 'Microsoft',
      domains: [
        { id: 1, label: 'AI Workloads & Considerations', weight: 18 },
        { id: 2, label: 'Machine Learning Fundamentals', weight: 22 },
        { id: 3, label: 'Computer Vision Workloads', weight: 18 },
        { id: 4, label: 'NLP Workloads', weight: 17 },
        { id: 5, label: 'Generative AI Workloads', weight: 25 },
      ],
      passMark: 700,
      maxScore: 1000,
      // Public Microsoft Skills Measured (effective 2025-05-02) objective ranges
      objectiveRanges: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '2.4', '2.5', '3.1', '3.2', '4.1', '4.2', '4.3', '5.1', '5.2', '5.3', '5.4'],
    };
  } else {
    certMeta = {
      name: 'CompTIA Network+',
      code: 'N10-009',
      vendor: 'CompTIA',
      domains: [
        { id: 1, label: 'Networking Concepts', weight: 23 },
        { id: 2, label: 'Network Implementation', weight: 20 },
        { id: 3, label: 'Network Operations', weight: 19 },
        { id: 4, label: 'Network Security', weight: 14 },
        { id: 5, label: 'Network Troubleshooting', weight: 24 },
      ],
      passMark: 720,
      maxScore: 900,
    };
  }

  const targetCounts = certMeta.domains
    .map(d => '  • Domain ' + d.id + '.0 ' + d.label + ' (' + d.weight + '% of exam) → ' + Math.max(1, Math.round(count * (d.weight / 100))) + ' Q')
    .join('\n');

  const vendor = certMeta.vendor || 'CompTIA';
  const domainCount = certMeta.domains.length;
  const blueprintLabel = vendor === 'Microsoft' ? 'Microsoft Skills Measured' : (vendor + ' blueprint');
  // Vendor-specific list of paid prep banks to exclude from training context
  const bannedSources = vendor === 'Microsoft'
    ? 'MeasureUp, Whizlabs, Skillcertpro, ExamTopics, Tutorials Dojo, ITExams, or any commercial prep bank'
    : 'CompTIA, Jason Dion, Professor Messer, CertMaster, or any commercial prep bank';
  // Optional objective-range hint (AZ-900 ships one; CompTIA branches don't)
  const objectiveHint = certMeta.objectiveRanges && certMeta.objectiveRanges.length
    ? '\nObjective numbers must come from this set: ' + certMeta.objectiveRanges.join(', ') + '.'
    : '';
  // First-domain example for the JSON shape — keeps the prompt cert-agnostic
  const exampleDomain = certMeta.domains[0].label;

  return [
    'You are a senior exam-content author for ' + certMeta.name + ' (' + certMeta.code + '), authored against the official ' + vendor + ' ' + blueprintLabel + '.',
    '',
    'Generate exactly ' + count + ' baseline-diagnostic MCQs spread across the ' + domainCount + ' domains as per the official ' + blueprintLabel + ' weights:',
    '',
    targetCounts,
    objectiveHint,
    '',
    'Each question MUST:',
    '  • Test real ' + certMeta.code + ' objectives only (no off-blueprint content)',
    '  • Have exactly 4 options labeled A, B, C, D — exactly ONE is correct',
    '  • Be plausible: distractors should be the kind of mistake a student would make',
    '  • Include an explanation that names the correct answer and explains WHY the others are wrong',
    '  • Be authored from public ' + certMeta.code + ' objectives — no copying from prep-book content',
    '  • Be ORIGINAL — do not reproduce questions from ' + bannedSources,
    '',
    'Difficulty distribution: approximately 25% Easy, 50% Medium, 25% Hard.',
    '',
    'Return ONLY a JSON array · no prose, no markdown fences, no commentary. Each array element MUST be a JSON object with this exact shape:',
    '',
    '{',
    '  "id": 1,                                  // integer 1..' + count,
    '  "domain": "' + exampleDomain + '",          // exact domain label (no number prefix)',
    '  "topic": "<narrow topic within the domain>",',
    '  "objective": "1.1",                       // ' + vendor + ' objective number',
    '  "difficulty": "Easy" | "Medium" | "Hard",',
    '  "question": "<stem · 30-300 chars · ends in \\"?\\">",',
    '  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },',
    '  "answer": "B",                            // letter of correct option',
    '  "explanation": "<1-3 sentences explaining the right answer + key distractor traps>"',
    '}',
    '',
    'No PBQs, no multi-select, no drag-and-drop — pure 4-option MCQ only.',
    '',
    'Output: the JSON array. Nothing else.',
  ].join('\n');
}
