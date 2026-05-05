// ══════════════════════════════════════════════════════════════════════════
// CompTIA Security+ SY0-701 cert pack (v4.86.0 Phase 1A engine refactor)
// ══════════════════════════════════════════════════════════════════════════
// Loaded into window.CERT_PACKS.secplus at app boot. Active when the URL
// host starts with 'secplus-' OR when localStorage 'nplus_dev_cert' is
// 'secplus' (dev override).
//
// Phase 1A (this ship): cert metadata + empty content stubs. Pack is
// loaded but inert until Network+ stays the default cert. Spinning up
// secplus-quiz-sable.vercel.app comes in Phase 2 (Week 3).
//
// Phase 2 — Week 3 (target v4.87.0):
//   - Populate Security+ blueprint topics (~30 topics across 5 domains)
//   - Domain weights from current SY0-701 blueprint (sourced at build time
//     to avoid stale weights in this stub)
//   - Per-cert prompts (security threat actors, mitigations, frameworks)
//   - Audit + carry-over ~60-100 Network+ exemplars that genuinely apply
//     (firewalls, ACLs, crypto, network attacks, IDS/IPS, port security,
//     wireless security, VPN concepts) with topics retagged for Security+
//   - Begin authoring net-new Security+ exemplars
//
// AUDIENCE: builder only. Private — for the user studying for SY0-701 on
// 2026-07-29. Customers stay on the Network+ deploy. Access control is
// URL obscurity only (no Vercel Pro, no in-app password) per the
// cert_saas_pivot_plan.md decision.
//
// LEGAL: same discipline as Network+ — content sourced from public CompTIA
// blueprint + RFC/IEEE/NIST/vendor docs. Zero ingestion of paid-bank
// content. See CLAUDE.md.

window.CERT_PACKS = window.CERT_PACKS || {};
window.CERT_PACKS.secplus = {
  meta: {
    id: 'secplus',
    name: 'CompTIA Security+',
    code: 'SY0-701',
    blueprintUrl: 'https://www.comptia.org/certifications/security',
    examPassScore: 750,        // Security+ scaled-score pass threshold (CompTIA official)
    examMaxScore: 900,         // scaled-score ceiling
    examQuestionCount: 90,     // full exam length (same as Network+)
    examTimeSeconds: 5400,     // 90-minute timer
  },

  // Empty stubs — populated in Phase 2 (Week 3 target v4.87.0).
  retentionGapConcepts: [],

  // ── DOMAIN WEIGHTS (CompTIA SY0-701 blueprint) ────────────────────────
  // Phase 2 will source actual weights from current CompTIA blueprint.
  // For Phase 1B these are placeholders so the pack structure is parallel
  // to Network+ — not used until secplus deploy goes live.
  // SY0-701 has 5 domains; placeholder weights below are educated guesses
  // pending blueprint confirmation: confirm before authoring exemplars.
  domainWeights: {
    concepts:        0.12, // Domain 1.0 — General Security Concepts
    threats:         0.22, // Domain 2.0 — Threats, Vulnerabilities, Mitigations
    architecture:    0.18, // Domain 3.0 — Security Architecture
    operations:      0.28, // Domain 4.0 — Security Operations
    governance:      0.20  // Domain 5.0 — Program Management & Oversight
  },

  domainLabels: {
    concepts:     'General Security Concepts',
    threats:      'Threats, Vulnerabilities & Mitigations',
    architecture: 'Security Architecture',
    operations:   'Security Operations',
    governance:   'Program Management & Oversight'
  },

  // Empty topic-domain map — Phase 2 populates SY0-701 topics.
  topicDomains: {},

  // Empty topic resources — Phase 2 populates Professor Messer SY0-701 URLs.
  topicResources: {},

  // Empty GT tables — Phase 2 audits which Network+ ground truths transfer
  // (most ports, OSI assignments, ethernet facts do; wifi facts likely do
  // too — wireless security is covered on both certs).
  gt: {
    ports: {},
    osi: {},
    wifiBroken: [],
    wifiDeprecated: [],
    ethernet: {}
  },

  // ── EXEMPLAR BANK (Phase 2B will populate) ────────────────────────────
  // Empty for now. Phase 2B audits the 320 Network+ exemplars and ports
  // the ~60-100 that genuinely transfer to Security+ (with topics retagged
  // for SY0-701). Pure-network-only exemplars (subnetting math, OSPF
  // depth, cabling specs, STP) stay Network+ only.
  //
  // Empty array = exemplar injection is a no-op. Haiku falls back to
  // blueprint + prompt quality alone — same baseline as pre-v4.59.0
  // Network+. Quality compounds as exemplars land.
  questionExemplars: []
};
