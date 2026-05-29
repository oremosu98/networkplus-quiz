// ══════════════════════════════════════════════════════════════════════════
// Microsoft SC-900 Security, Compliance & Identity Fundamentals cert pack
// (v7.7.0 — content authoring)
// ══════════════════════════════════════════════════════════════════════════
// Loaded into window.CERT_PACKS.sc900 at app boot. Active when:
//   1. URL host matches 'sc900.certanvil.com' (or 'sc900.' / 'sc900-' prefix
//      for Vercel preview branches) — Pattern A subdomain (LOCKED 2026-05-28
//      plan §9 #1: ship on sc900.certanvil.com now; revisit a shared
//      Microsoft-security family subdomain alias only if/when SC-200/300/400
//      land. Cert-code-named deliberately to AVOID collision with CompTIA
//      Security+ (secplus.certanvil.com).
//   2. localStorage 'nplus_dev_cert' === 'sc900' (dev override)
//   3. URL query '?cert=sc900' (one-shot entry-point handoff)
// Otherwise inert (loaded only when index.html inline IIFE document.writes
// <script src="certs/sc900.js"> after Pattern A resolves the host).
//
// Status (v7.7.0):
//   ✓ Cert metadata (name, code, exam pass 700/1000, 45-Q / 60-min)
//     — official PDF confirms pass 700; Q-count/time baked from blueprint
//     (~40-60 Q / 60 min) + VoC, defaulting to 45/60 (plan §2 #3 / §9 Q3).
//   ✓ Domain weights (Microsoft "Skills Measured" effective 2025-11-07) —
//     exact midpoints of the four official ranges, sum 1.00.
//   ✓ Domain labels (4 domains — same domain-count as A+ Core 2, reuses the
//     aplus-core2 dg-system.css 4-domain rule that hides data-domain-idx 5).
//   ✓ Topic catalog (53 topics across 4 domains).
//   ✓ Topic resources (Microsoft Learn SC-900 module URLs + objective numbers).
//   ✓ retentionGapConcepts (8 seed entries from the public SC-900 Skills
//     Measured doc + VoC research; the array stays open-ended, additive
//     forever via Phase 3 cycles — Sec+ grew 8 → 18 → 26 across 6 cycles).
//   ☐ GT tables — Security/Compliance/Identity has candidate enumerable
//     surfaces (the 6-Defender → workload map, the Entra license-tier →
//     feature gate) but defer until a clear pattern emerges. Empty object
//     means consumers fall back to defaults (gt-less calls are a no-op).
//   ☐ questionExemplars — populated in Stage 6 (Phase 6 of v7.7.0 ship):
//     200 hand-curated exemplars across 33-41 clusters. Empty array = the
//     exemplar-injection step in fetchQuestions is a no-op; Haiku falls
//     back to blueprint + prompt quality alone.
//
// AUDIENCE (v7.7.0 Pattern A): public Pro-tier surface on
// https://sc900.certanvil.com. Visible to all signed-in users in the cert
// switcher with a "PRO" badge; switching INTO sc900 requires Pro tier via
// tadSwitchCert's _gateProOnly('Microsoft SC-900 Security, Compliance &
// Identity Fundamentals') call. Anon visitors on the landing diagnostic at
// certanvil.com/diagnostic/sc900/ funnel into the Pro upgrade modal.
//
// LEGAL (non-negotiable, locked in plan §10): every entry below originates
// from the PUBLIC Microsoft SC-900 Skills Measured doc
// (https://learn.microsoft.com/credentials/certifications/resources/study-guides/sc-900)
// + PUBLIC Microsoft Learn modules ONLY. ZERO ingestion of paid-bank content.
// Skillcertpro is EXPLICITLY BANNED (VoC §6 flagged it as an active shill /
// exam-dump red zone on SC-900 threads — treat any "exam dump" / "91-question
// test" reference as an integrity violation) — plus MeasureUp, Whizlabs,
// Tutorials Dojo, A Cloud Guru, paid Pluralsight, paid LinkedIn Learning,
// O'Reilly, Udemy, and ExamTopics dumps. Video resources (John Savill SC-900
// Study Cram V2, Inside Cloud & Security, Microsoft Learn / Sarah Allali) are
// TERMINOLOGY direction-finders ONLY (which current names + topics to align
// with), never a content source. VoC research describes the exam-taker
// EXPERIENCE, not question content. NO KQL content — KQL is SC-200, explicitly
// NOT on SC-900 (VoC §10 rec #7). The Jason Dion Method applies for any future
// paid SC-900 practice test: share gap topics in OWN WORDS only → Claude
// authors new exemplars per gap → original content informed by gap, never
// reproductions.

window.CERT_PACKS = window.CERT_PACKS || {};
window.CERT_PACKS.sc900 = {
  meta: {
    id: 'sc900',
    name: 'Microsoft SC-900',
    code: 'SC-900',
    blueprintUrl: 'https://learn.microsoft.com/credentials/certifications/resources/study-guides/sc-900',
    examPassScore: 700,         // SC-900 official pass: 700/1000 (scaled). "A score of 700 or
                                // greater is required to pass" — confirmed by the official PDF
                                // + universal across VoC reports.
    examMaxScore: 1000,         // scaled-score ceiling
    examQuestionCount: 45,      // Blueprint range ~40-60 Q. Default 45 (mirrors AI-900's
                                // fundamentals shape). One low-confidence VoC report of 44 Q;
                                // cosmetic if slightly off (plan §9 Q3, founder-confirmed 45).
    examTimeSeconds: 3600,      // 60-minute timer (one low-confidence VoC report of 45 min;
                                // default 60 per blueprint, founder-confirmed).
  },

  // ── PRIORITY RETENTION CONCEPTS (v7.7.0 seed, 8 entries, additive forever) ─
  // Eight concepts seeded from the public Microsoft SC-900 Skills Measured doc
  // (effective 2025-11-07) + VoC research (77 Reddit posts, 349 quotes across
  // 16 high-comment threads + John Savill SC-900 Study Cram V2 comments).
  // Injected as a soft tiebreaker into every question-generation prompt — same
  // mechanism as Net+/Sec+/AZ-900/AI-900 retentionGapConcepts. Non-invasive:
  // a preference, not a mandate. The array stays open-ended; the founder will
  // append new concepts via Phase 3 cycles after each practice-test gap.
  retentionGapConcepts: [
    { label: 'The "Many Defenders" Disambiguation', parentTopic: 'Microsoft Defender XDR', objective: '3.4', keyword: 'The #1 SC-900 pain point (VoC §1.1 #1 / §10 rec #3) — memorize WHICH Defender protects WHICH workload. MICROSOFT DEFENDER FOR CLOUD = multicloud + hybrid CSPM + cloud workload protection (servers, storage, SQL, containers across Azure + AWS + GCP); secure score; NOT an EDR. MICROSOFT DEFENDER XDR = the unified SOC PORTAL (security.microsoft.com) that correlates signals across endpoints, identities, email, apps into incidents; the umbrella, not a single sensor (formerly Microsoft 365 Defender). MICROSOFT DEFENDER FOR ENDPOINT = EDR for devices/endpoints (Windows, macOS, Linux, mobile) — threat + vulnerability management, attack-surface reduction, EDR. MICROSOFT DEFENDER FOR IDENTITY = protects ON-PREMISES Active Directory by analyzing AD signals + lateral-movement (formerly Azure ATP); hybrid — activates with Entra ID. MICROSOFT DEFENDER FOR OFFICE 365 = protects email + collaboration (Teams, SharePoint, OneDrive) from phishing, malware, business email compromise. MICROSOFT DEFENDER FOR CLOUD APPS = the CASB — discovers + governs SaaS/cloud app usage (shadow IT, session controls). Quick test: workload in the stem → which protects it? On-prem AD = Identity; email = O365; devices = Endpoint; multicloud servers/CSPM = Cloud; SaaS app governance = Cloud Apps; the unified portal/incidents = XDR.' },
    { label: 'Conditional Access vs Identity Protection vs PIM', parentTopic: 'Conditional Access', objective: '2.4', keyword: 'The Entra access-control trio VoC §3.3 confirms as the dominant trip-up. CONDITIONAL ACCESS = the POLICY ENGINE that gates sign-ins on signals (user, device, location, app, real-time risk) and enforces controls (require MFA, require compliant device, block) — "if THESE conditions, THEN require THIS." Implements Zero Trust at sign-in. IDENTITY PROTECTION (Entra ID Protection) = RISK DETECTION — detects + reports sign-in risk (impossible travel, anonymous IP, leaked credentials) + user risk; feeds risk signals INTO Conditional Access (e.g. "block high sign-in risk"). It detects; CA acts. PRIVILEGED IDENTITY MANAGEMENT (PIM) = JUST-IN-TIME privileged-role elevation — eligible (not permanent) admin roles, time-bound activation, approval workflows, justification, access reviews for admins. Memorize: CA = gate sign-ins on conditions; Identity Protection = detect risky sign-ins/users; PIM = time-limited admin elevation. Scenario test: "limit how long someone holds Global Admin" = PIM; "require MFA when sign-in looks risky" = CA consuming Identity Protection risk.' },
    { label: 'Sensitivity Labels vs Retention Labels vs DLP', parentTopic: 'Sensitivity Labels & Policies', objective: '4.3', keyword: 'The Purview confusable cluster VoC §3.6 flags. SENSITIVITY LABELS (Information Protection, formerly Azure Information Protection / AIP) = CLASSIFY + PROTECT content by sensitivity (Public/Confidential/Highly Confidential) — apply encryption, watermarks, access restrictions that travel WITH the file. RETENTION LABELS / RETENTION POLICIES (Data Lifecycle Management) = control HOW LONG content is KEPT and when it is DELETED (retain for 7 years, then delete) for compliance/records. DATA LOSS PREVENTION (DLP) = PREVENT the unauthorized SHARING/EGRESS of sensitive data (block emailing a credit-card number externally, warn on oversharing). Memorize: Sensitivity = protect by classification; Retention = keep/delete on a schedule; DLP = stop sensitive data leaving. They compose — a doc can carry a sensitivity label AND a retention label AND be covered by a DLP policy. Scenario test: "stop users emailing SSNs outside the org" = DLP; "encrypt + restrict who opens Confidential docs" = Sensitivity labels; "auto-delete after 5 years" = Retention.' },
    { label: 'Service Trust Portal vs Compliance Manager vs Trust Center', parentTopic: 'Service Trust Portal', objective: '4.2', keyword: 'VoC §5.9 + §1.6 (heavier than expected). SERVICE TRUST PORTAL (STP) = the public-facing library of Microsoft\'s AUDIT REPORTS, certifications, and compliance DOCUMENTS (SOC, ISO, FedRAMP reports) — proof of Microsoft\'s own compliance you download for your auditors. COMPLIANCE MANAGER (in the Microsoft Purview portal) = a workflow tool that ASSESSES YOUR organization\'s compliance posture against regulations/standards via templates + improvement actions, producing a COMPLIANCE SCORE (a risk-based measure of YOUR progress). TRUST CENTER = the public Microsoft marketing/information site (microsoft.com/trust-center) describing Microsoft\'s privacy, security, and compliance principles. Memorize: STP = download Microsoft\'s audit reports; Compliance Manager = assess + score YOUR compliance with actions; Trust Center = read about Microsoft\'s trust principles. The "compliance score" belongs to Compliance Manager, NOT the STP.' },
    { label: 'Zero Trust + Defense-in-Depth + Shared Responsibility + control taxonomy', parentTopic: 'Zero Trust Model', objective: '1.1', keyword: 'The Domain 1 principle cluster that "shows up often" (VoC §1.4 / §1.7). ZERO TRUST = "never trust, always verify" — three principles: verify explicitly (authenticate + authorize on all signals), use least-privilege access (JIT/JEA, risk-based), assume breach (segment, encrypt, monitor). Identity is the new perimeter. DEFENSE IN DEPTH = LAYERED controls so no single failure is fatal (physical → identity & access → perimeter → network → compute → application → data). SHARED RESPONSIBILITY MODEL = security duties split between Microsoft + customer by service model: on-prem (customer owns all), IaaS (customer owns OS/apps/data/network controls/identity), PaaS (shared), SaaS (Microsoft owns most; customer always owns DATA, DEVICES, ACCOUNTS/IDENTITIES). CONTROL TAXONOMY (VoC surprise #7): PREVENTIVE controls stop an incident (MFA, firewall rules), DETECTIVE controls find one in progress (logging, SIEM alerts, audits), CORRECTIVE controls restore after one (backups, incident response, patching). Scenario test: "responsibility for data classification" = always the customer regardless of model; "MFA" = preventive; "SIEM alert" = detective; "restore from backup" = corrective.' },
    { label: 'Defender for Identity scope nuance (on-prem AD + Entra activation)', parentTopic: 'Defender for Identity', objective: '3.4', keyword: 'VoC surprise #4 — a non-obvious rename consequence. MICROSOFT DEFENDER FOR IDENTITY (formerly Azure Advanced Threat Protection / Azure ATP) protects ON-PREMISES Active Directory Domain Services by analyzing AD signals to detect compromised identities, lateral movement, and domain-dominance attacks (Pass-the-Hash, Pass-the-Ticket, DCSync). The nuance students miss: it is part of the Microsoft Defender XDR suite and ACTIVATES/integrates THROUGH Entra ID — it bridges on-prem AD AND the cloud (hybrid). Contrast: ENTRA ID PROTECTION protects CLOUD identities (Entra ID sign-in/user risk); DEFENDER FOR IDENTITY protects ON-PREM AD identities. Scenario test: "detect lateral movement against on-premises Active Directory" = Defender for Identity (NOT Identity Protection, which is cloud sign-in risk; NOT Defender for Endpoint, which is device EDR).' },
    { label: 'Microsoft Sentinel: SIEM vs SOAR + Playbook vs Workbook', parentTopic: 'Microsoft Sentinel', objective: '3.3', keyword: 'VoC surprise #6 + §1.8. MICROSOFT SENTINEL = the cloud-native SIEM + SOAR platform. SIEM (Security Information and Event Management) = COLLECT + correlate + ANALYZE logs/signals at cloud scale to DETECT threats (the visibility + alerting half). SOAR (Security Orchestration, Automation, and Response) = AUTOMATE the RESPONSE to those threats (the action half). Within Sentinel: a PLAYBOOK = an automated response workflow built on Azure Logic Apps (the SOAR mechanism — e.g. "on this alert, disable the user + open a ticket"). A WORKBOOK = an interactive DASHBOARD / visualization for monitoring + reporting (the SIEM visibility surface). Memorize: SIEM detects, SOAR responds; Playbook = automation (Logic Apps), Workbook = dashboard. Sentinel is cloud-native (no on-prem collectors required) — contrast with traditional on-prem SIEMs. Scenario test: "automatically disable a compromised account when an alert fires" = Playbook (SOAR); "visualize incident trends on a dashboard" = Workbook.' },
    { label: 'The Rebrand Map (current names in stems, legacy in parentheses)', parentTopic: 'Entra ID Function & Identity Types', objective: '2.1', keyword: 'VoC §10 — competitor prep lags the rename; this IS the SC-900 differentiator. Memorize current → legacy: MICROSOFT ENTRA ID (formerly Azure Active Directory / Azure AD) — Microsoft\'s cloud identity & access management service; the directory in the cloud. MICROSOFT DEFENDER XDR (formerly Microsoft 365 Defender) — the unified SOC portal. MICROSOFT PURVIEW (formerly Microsoft 365 Compliance Center / Office 365 Security & Compliance) — the compliance + data governance suite. MICROSOFT DEFENDER FOR CLOUD APPS (formerly Microsoft Cloud App Security / MCAS) — the CASB. MICROSOFT DEFENDER FOR IDENTITY (formerly Azure Advanced Threat Protection / Azure ATP) — on-prem AD protection. Also: Azure Information Protection (AIP) capabilities now live in Microsoft Purview Information Protection (sensitivity labels). If a question lists BOTH the current and legacy name as options, the CURRENT name is correct — the legacy name is a distractor. Use current names in question stems; cite the legacy name parenthetically on first reference in the explanation.' }
  ],

  // ── DOMAIN WEIGHTS (Microsoft "Skills Measured" SC-900 blueprint) ────────
  // Sums to 1.00 — exact midpoints of the four official MS percentage ranges
  // per the 2025-11-07 Skills Measured (10-15% / 25-30% / 35-40% / 20-25%).
  // Same midpoint approximation AZ-900/AI-900 use.
  domainWeights: {
    'sci-concepts':         0.125, // Domain 1 — Security, Compliance & Identity Concepts (10-15%)
    'entra':                0.275, // Domain 2 — Microsoft Entra (25-30%)
    'security-solutions':   0.375, // Domain 3 — Microsoft Security Solutions (35-40%, largest)
    'compliance-solutions': 0.225  // Domain 4 — Microsoft Compliance Solutions (20-25%)
  },

  domainLabels: {
    'sci-concepts':         'Security, Compliance & Identity Concepts',
    'entra':                'Microsoft Entra',
    'security-solutions':   'Microsoft Security Solutions',
    'compliance-solutions': 'Microsoft Compliance Solutions'
  },

  // ── TOPIC → DOMAIN MAP (53 topics across 4 SC-900 domains) ───────────────
  // Drives weak-spot routing, exemplar bank picker, lottery, readiness domain
  // attribution. Topic name = primary key everywhere; domain key is one of:
  // sci-concepts / entra / security-solutions / compliance-solutions.
  // Derived verbatim from the official SC-900 subdomain bullets (2025-11-07).
  topicDomains: {
    // ── Domain 1 — Security, Compliance & Identity Concepts (10-15%, 9 topics) ──
    'Shared Responsibility Model':                    'sci-concepts',   // 1.1
    'Defense in Depth':                               'sci-concepts',   // 1.1
    'Zero Trust Model':                               'sci-concepts',   // 1.1
    'Encryption & Hashing':                           'sci-concepts',   // 1.1
    'Governance, Risk & Compliance (GRC)':            'sci-concepts',   // 1.1
    'Authentication vs Authorization':                'sci-concepts',   // 1.2
    'Identity Providers & Directory Services (AD)':   'sci-concepts',   // 1.2
    'Federation & Identity-as-Perimeter':             'sci-concepts',   // 1.2
    'Authentication Methods & MFA':                   'sci-concepts',   // 1.2

    // ── Domain 2 — Microsoft Entra (25-30%, 12 topics) ──────────────────
    'Entra ID Function & Identity Types':             'entra',          // 2.1
    'Hybrid Identity':                                'entra',          // 2.1
    'External Identities (B2B/B2C)':                  'entra',          // 2.1
    'Entra Authentication Capabilities':              'entra',          // 2.2
    'Password Protection & Management':               'entra',          // 2.2
    'Multifactor Authentication (Entra)':             'entra',          // 2.2
    'Conditional Access':                             'entra',          // 2.3
    'Entra Roles & RBAC':                             'entra',          // 2.3
    'Entra ID Governance':                            'entra',          // 2.4
    'Access Reviews':                                 'entra',          // 2.4
    'Privileged Identity Management (PIM)':           'entra',          // 2.4
    'Entra ID Protection':                            'entra',          // 2.4

    // ── Domain 3 — Microsoft Security Solutions (35-40%, 19 topics — largest) ──
    'Azure DDoS Protection':                          'security-solutions', // 3.1
    'Azure Firewall':                                 'security-solutions', // 3.1
    'Web Application Firewall (WAF)':                 'security-solutions', // 3.1
    'Network Segmentation (VNets)':                   'security-solutions', // 3.1
    'Network Security Groups (NSGs)':                 'security-solutions', // 3.1
    'Azure Bastion':                                  'security-solutions', // 3.1
    'Azure Key Vault':                                'security-solutions', // 3.1
    'Microsoft Defender for Cloud':                   'security-solutions', // 3.2
    'Cloud Security Posture Management (CSPM)':       'security-solutions', // 3.2
    'Security Policies & Cloud Workload Protection':  'security-solutions', // 3.2
    'SIEM & SOAR Concepts':                           'security-solutions', // 3.3
    'Microsoft Sentinel':                             'security-solutions', // 3.3
    'Microsoft Defender XDR':                         'security-solutions', // 3.4
    'Defender for Office 365':                        'security-solutions', // 3.4
    'Defender for Endpoint':                          'security-solutions', // 3.4
    'Defender for Cloud Apps':                        'security-solutions', // 3.4
    'Defender for Identity':                          'security-solutions', // 3.4
    'Defender Vulnerability Management & Threat Intelligence': 'security-solutions', // 3.4
    'Microsoft Defender Portal':                      'security-solutions', // 3.4

    // ── Domain 4 — Microsoft Compliance Solutions (20-25%, 13 topics) ────
    'Service Trust Portal':                           'compliance-solutions', // 4.1
    'Microsoft Privacy Principles':                   'compliance-solutions', // 4.1
    'Microsoft Priva':                                'compliance-solutions', // 4.1
    'Microsoft Purview Portal':                       'compliance-solutions', // 4.2
    'Compliance Manager & Compliance Score':          'compliance-solutions', // 4.2
    'Data Classification':                            'compliance-solutions', // 4.3
    'Content & Activity Explorer':                    'compliance-solutions', // 4.3
    'Sensitivity Labels & Policies':                  'compliance-solutions', // 4.3
    'Data Loss Prevention (DLP)':                     'compliance-solutions', // 4.3
    'Records Management':                             'compliance-solutions', // 4.3
    'Retention Policies & Labels':                    'compliance-solutions', // 4.3
    'Insider Risk Management':                        'compliance-solutions', // 4.4
    'eDiscovery & Audit':                             'compliance-solutions'  // 4.4
  },

  // ── TOPIC RESOURCES (Microsoft Learn SC-900 module URLs + objectives) ────
  // Per-topic Microsoft Learn module URL + objective number + label. Source:
  // the public SC-900 learning paths (Describe SCI concepts / Describe the
  // capabilities of Microsoft Entra / Describe the capabilities of Microsoft
  // security solutions / Describe the capabilities of Microsoft compliance
  // solutions). Used by showTopicDeepDive + per-row Progress-page play buttons.
  topicResources: {
    // Domain 1 — Security, Compliance & Identity Concepts
    'Shared Responsibility Model':                    { url: 'https://learn.microsoft.com/training/modules/describe-security-concepts-methodologies/', obj: '1.1', label: 'Shared responsibility model' },
    'Defense in Depth':                               { url: 'https://learn.microsoft.com/training/modules/describe-security-concepts-methodologies/', obj: '1.1', label: 'Defense in depth' },
    'Zero Trust Model':                               { url: 'https://learn.microsoft.com/training/modules/describe-security-concepts-methodologies/', obj: '1.1', label: 'Zero Trust model' },
    'Encryption & Hashing':                           { url: 'https://learn.microsoft.com/training/modules/describe-security-concepts-methodologies/', obj: '1.1', label: 'Encryption & hashing' },
    'Governance, Risk & Compliance (GRC)':            { url: 'https://learn.microsoft.com/training/modules/describe-security-concepts-methodologies/', obj: '1.1', label: 'Governance, risk & compliance' },
    'Authentication vs Authorization':                { url: 'https://learn.microsoft.com/training/modules/describe-identity-principles-concepts/', obj: '1.2', label: 'Authentication vs authorization' },
    'Identity Providers & Directory Services (AD)':   { url: 'https://learn.microsoft.com/training/modules/describe-identity-principles-concepts/', obj: '1.2', label: 'Identity providers & directory services' },
    'Federation & Identity-as-Perimeter':             { url: 'https://learn.microsoft.com/training/modules/describe-identity-principles-concepts/', obj: '1.2', label: 'Federation & identity as perimeter' },
    'Authentication Methods & MFA':                   { url: 'https://learn.microsoft.com/training/modules/describe-identity-principles-concepts/', obj: '1.2', label: 'Authentication methods & MFA' },

    // Domain 2 — Microsoft Entra
    'Entra ID Function & Identity Types':             { url: 'https://learn.microsoft.com/training/modules/explore-basic-services-identity-types/', obj: '2.1', label: 'Entra ID function & identity types' },
    'Hybrid Identity':                                { url: 'https://learn.microsoft.com/training/modules/explore-basic-services-identity-types/', obj: '2.1', label: 'Hybrid identity' },
    'External Identities (B2B/B2C)':                  { url: 'https://learn.microsoft.com/training/modules/explore-basic-services-identity-types/', obj: '2.1', label: 'External identities (B2B/B2C)' },
    'Entra Authentication Capabilities':              { url: 'https://learn.microsoft.com/training/modules/explore-authentication-capabilities/', obj: '2.2', label: 'Entra authentication capabilities' },
    'Password Protection & Management':               { url: 'https://learn.microsoft.com/training/modules/explore-authentication-capabilities/', obj: '2.2', label: 'Password protection & management' },
    'Multifactor Authentication (Entra)':             { url: 'https://learn.microsoft.com/training/modules/explore-authentication-capabilities/', obj: '2.2', label: 'Multifactor authentication' },
    'Conditional Access':                             { url: 'https://learn.microsoft.com/training/modules/explore-access-management-capabilities/', obj: '2.3', label: 'Conditional Access' },
    'Entra Roles & RBAC':                             { url: 'https://learn.microsoft.com/training/modules/explore-access-management-capabilities/', obj: '2.3', label: 'Entra roles & RBAC' },
    'Entra ID Governance':                            { url: 'https://learn.microsoft.com/training/modules/describe-identity-protection-governance-capabilities/', obj: '2.4', label: 'Entra ID Governance' },
    'Access Reviews':                                 { url: 'https://learn.microsoft.com/training/modules/describe-identity-protection-governance-capabilities/', obj: '2.4', label: 'Access reviews' },
    'Privileged Identity Management (PIM)':           { url: 'https://learn.microsoft.com/training/modules/describe-identity-protection-governance-capabilities/', obj: '2.4', label: 'Privileged Identity Management' },
    'Entra ID Protection':                            { url: 'https://learn.microsoft.com/training/modules/describe-identity-protection-governance-capabilities/', obj: '2.4', label: 'Entra ID Protection' },

    // Domain 3 — Microsoft Security Solutions
    'Azure DDoS Protection':                          { url: 'https://learn.microsoft.com/training/modules/describe-basic-security-capabilities-azure/', obj: '3.1', label: 'Azure DDoS Protection' },
    'Azure Firewall':                                 { url: 'https://learn.microsoft.com/training/modules/describe-basic-security-capabilities-azure/', obj: '3.1', label: 'Azure Firewall' },
    'Web Application Firewall (WAF)':                 { url: 'https://learn.microsoft.com/training/modules/describe-basic-security-capabilities-azure/', obj: '3.1', label: 'Web Application Firewall' },
    'Network Segmentation (VNets)':                   { url: 'https://learn.microsoft.com/training/modules/describe-basic-security-capabilities-azure/', obj: '3.1', label: 'Network segmentation (VNets)' },
    'Network Security Groups (NSGs)':                 { url: 'https://learn.microsoft.com/training/modules/describe-basic-security-capabilities-azure/', obj: '3.1', label: 'Network security groups' },
    'Azure Bastion':                                  { url: 'https://learn.microsoft.com/training/modules/describe-basic-security-capabilities-azure/', obj: '3.1', label: 'Azure Bastion' },
    'Azure Key Vault':                                { url: 'https://learn.microsoft.com/training/modules/describe-basic-security-capabilities-azure/', obj: '3.1', label: 'Azure Key Vault' },
    'Microsoft Defender for Cloud':                   { url: 'https://learn.microsoft.com/training/modules/describe-security-management-capabilities-of-azure/', obj: '3.2', label: 'Microsoft Defender for Cloud' },
    'Cloud Security Posture Management (CSPM)':       { url: 'https://learn.microsoft.com/training/modules/describe-security-management-capabilities-of-azure/', obj: '3.2', label: 'Cloud Security Posture Management' },
    'Security Policies & Cloud Workload Protection':  { url: 'https://learn.microsoft.com/training/modules/describe-security-management-capabilities-of-azure/', obj: '3.2', label: 'Security policies & cloud workload protection' },
    'SIEM & SOAR Concepts':                           { url: 'https://learn.microsoft.com/training/modules/describe-security-capabilities-of-microsoft-sentinel/', obj: '3.3', label: 'SIEM & SOAR concepts' },
    'Microsoft Sentinel':                             { url: 'https://learn.microsoft.com/training/modules/describe-security-capabilities-of-microsoft-sentinel/', obj: '3.3', label: 'Microsoft Sentinel' },
    'Microsoft Defender XDR':                         { url: 'https://learn.microsoft.com/training/modules/describe-threat-protection-with-microsoft-defender-xdr/', obj: '3.4', label: 'Microsoft Defender XDR' },
    'Defender for Office 365':                        { url: 'https://learn.microsoft.com/training/modules/describe-threat-protection-with-microsoft-defender-xdr/', obj: '3.4', label: 'Defender for Office 365' },
    'Defender for Endpoint':                          { url: 'https://learn.microsoft.com/training/modules/describe-threat-protection-with-microsoft-defender-xdr/', obj: '3.4', label: 'Defender for Endpoint' },
    'Defender for Cloud Apps':                        { url: 'https://learn.microsoft.com/training/modules/describe-threat-protection-with-microsoft-defender-xdr/', obj: '3.4', label: 'Defender for Cloud Apps' },
    'Defender for Identity':                          { url: 'https://learn.microsoft.com/training/modules/describe-threat-protection-with-microsoft-defender-xdr/', obj: '3.4', label: 'Defender for Identity' },
    'Defender Vulnerability Management & Threat Intelligence': { url: 'https://learn.microsoft.com/training/modules/describe-threat-protection-with-microsoft-defender-xdr/', obj: '3.4', label: 'Defender vulnerability management & threat intelligence' },
    'Microsoft Defender Portal':                      { url: 'https://learn.microsoft.com/training/modules/describe-threat-protection-with-microsoft-defender-xdr/', obj: '3.4', label: 'Microsoft Defender portal' },

    // Domain 4 — Microsoft Compliance Solutions
    'Service Trust Portal':                           { url: 'https://learn.microsoft.com/training/modules/describe-compliance-management-capabilities-of-microsoft-purview/', obj: '4.1', label: 'Service Trust Portal' },
    'Microsoft Privacy Principles':                   { url: 'https://learn.microsoft.com/training/modules/describe-compliance-management-capabilities-of-microsoft-purview/', obj: '4.1', label: 'Microsoft privacy principles' },
    'Microsoft Priva':                                { url: 'https://learn.microsoft.com/training/modules/describe-compliance-management-capabilities-of-microsoft-purview/', obj: '4.1', label: 'Microsoft Priva' },
    'Microsoft Purview Portal':                       { url: 'https://learn.microsoft.com/training/modules/describe-compliance-management-capabilities-of-microsoft-purview/', obj: '4.2', label: 'Microsoft Purview portal' },
    'Compliance Manager & Compliance Score':          { url: 'https://learn.microsoft.com/training/modules/describe-compliance-management-capabilities-of-microsoft-purview/', obj: '4.2', label: 'Compliance Manager & compliance score' },
    'Data Classification':                            { url: 'https://learn.microsoft.com/training/modules/describe-information-protection-data-lifecycle-management-capabilities-of-microsoft-purview/', obj: '4.3', label: 'Data classification' },
    'Content & Activity Explorer':                    { url: 'https://learn.microsoft.com/training/modules/describe-information-protection-data-lifecycle-management-capabilities-of-microsoft-purview/', obj: '4.3', label: 'Content & activity explorer' },
    'Sensitivity Labels & Policies':                  { url: 'https://learn.microsoft.com/training/modules/describe-information-protection-data-lifecycle-management-capabilities-of-microsoft-purview/', obj: '4.3', label: 'Sensitivity labels & policies' },
    'Data Loss Prevention (DLP)':                     { url: 'https://learn.microsoft.com/training/modules/describe-information-protection-data-lifecycle-management-capabilities-of-microsoft-purview/', obj: '4.3', label: 'Data loss prevention' },
    'Records Management':                             { url: 'https://learn.microsoft.com/training/modules/describe-information-protection-data-lifecycle-management-capabilities-of-microsoft-purview/', obj: '4.3', label: 'Records management' },
    'Retention Policies & Labels':                    { url: 'https://learn.microsoft.com/training/modules/describe-information-protection-data-lifecycle-management-capabilities-of-microsoft-purview/', obj: '4.3', label: 'Retention policies & labels' },
    'Insider Risk Management':                        { url: 'https://learn.microsoft.com/training/modules/describe-insider-risk-ediscovery-audit-capabilities-of-microsoft-purview/', obj: '4.4', label: 'Insider risk management' },
    'eDiscovery & Audit':                             { url: 'https://learn.microsoft.com/training/modules/describe-insider-risk-ediscovery-audit-capabilities-of-microsoft-purview/', obj: '4.4', label: 'eDiscovery & audit' }
  },

  // ── QUESTION EXEMPLARS (200 hand-curated, v7.7.0 Stage 6) ────────────────
  // 200 hand-curated exemplars across 4 domains (D1 25 / D2 55 / D3 75 /
  // D4 45), weight-proportional. VoC-mandated cluster floors (plan §6b):
  // ≥6 "many Defenders" disambiguation · ≥5 CA-vs-IDP-vs-PIM · ≥4
  // sensitivity-vs-retention-vs-DLP · ≥4 Zero Trust/defense-in-depth/shared
  // responsibility · ≥4 Entra ID core · ≥4 Entra authn/MFA/SSPR/passwordless
  // · ≥3 STP-vs-Compliance-Manager · ≥3 Purview compliance depth · ≥3
  // corrective/preventive/detective controls · ≥2 Sentinel SIEM/SOAR/
  // Playbook-vs-Workbook · ≥2 Yes/No "does this solution meet the
  // requirements" chained-stem pairs · ≥2 Defender-for-Identity scope nuance
  // · ZERO KQL. Bias Domain 3 toward scenario-application + product-distinction
  // stems (VoC: harder than a typical fundamentals). Current names in stems,
  // legacy parenthetically in the explanation first reference (plan §10).
  // Topic names match topicDomains keys exactly (UAT tombstone "every
  // exemplar.topic ∈ topicDomains" must stay green).
  // Legal: every exemplar original from PUBLIC Microsoft SC-900 Skills
  // Measured + public MS Learn modules; ZERO ingestion from paid banks.
  questionExemplars: [


  // ── Shared Responsibility Model ─────────────────────────────────────────
  {
    type: "mcq",
    question: "A company moves its email platform to a Software as a Service (SaaS) solution. Which responsibility does the customer ALWAYS retain, regardless of the cloud service model?",
    difficulty: "Foundational",
    topic: "Shared Responsibility Model",
    objective: "1.1",
    options: {
      A: "Patching the underlying operating system",
      B: "Managing the physical datacenter infrastructure",
      C: "Protecting the data stored in the service",
      D: "Configuring the network fabric between availability zones"
    },
    answer: "C",
    explanation: "Under the shared responsibility model, the customer ALWAYS retains responsibility for their DATA, their user ACCOUNTS/IDENTITIES, and their DEVICES — across every cloud service model (IaaS, PaaS, SaaS). In a SaaS model, Microsoft manages nearly everything else (OS, network, runtime), but the customer is still accountable for the data they place into the service and for managing who has access to it.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An organization deploys virtual machines in an Infrastructure as a Service (IaaS) environment. According to the shared responsibility model, which of the following is the CLOUD PROVIDER'S responsibility?",
    difficulty: "Hard",
    topic: "Shared Responsibility Model",
    objective: "1.1",
    options: {
      A: "Installing and patching the guest operating system",
      B: "Configuring the firewall rules for the virtual machine",
      C: "Securing the physical host hardware and datacenter facilities",
      D: "Managing user accounts and access permissions within the VM"
    },
    answer: "C",
    explanation: "In IaaS, the cloud provider is responsible for the physical layer: hardware, datacenters, physical networking, and the host hypervisor. The customer takes on responsibility for the guest OS (patching, hardening), applications, firewall/network configuration, and identity/access management within their workloads. Data and accounts are always the customer's responsibility.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A development team uses an Azure Platform as a Service (PaaS) database. The provider manages the OS and runtime. Which of the following remains the CUSTOMER'S responsibility?",
    difficulty: "Hard",
    topic: "Shared Responsibility Model",
    objective: "1.1",
    options: {
      A: "Patching the database engine version",
      B: "Replacing failed physical storage drives",
      C: "Classifying and protecting the data stored in the database",
      D: "Maintaining the physical network between availability zones"
    },
    answer: "C",
    explanation: "In a PaaS model the cloud provider manages infrastructure, OS, and runtime, including database engine patching. However, the customer ALWAYS owns data classification, data protection (encryption choices, sensitivity labels), and identity/access governance. Replacing physical hardware and maintaining the datacenter network fabric are provider responsibilities in all cloud models.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Defense in Depth ────────────────────────────────────────────────────
  {
    type: "mcq",
    question: "Which defense-in-depth layer is PRIMARILY protected by applying role-based access control (RBAC) and multi-factor authentication (MFA)?",
    difficulty: "Foundational",
    topic: "Defense in Depth",
    objective: "1.1",
    options: {
      A: "Perimeter layer",
      B: "Network layer",
      C: "Identity and access layer",
      D: "Physical layer"
    },
    answer: "C",
    explanation: "Microsoft's defense-in-depth model defines seven layers: physical → identity & access → perimeter → network → compute → application → data. MFA and RBAC operate at the Identity and Access layer, ensuring that only verified, authorized users and services can interact with resources. The perimeter layer deals with DDoS protection and firewalls; the network layer covers network segmentation and filtering.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A security team implements encryption for data stored in Azure Blob Storage. Which defense-in-depth layer does this control PRIMARILY address?",
    difficulty: "Exam Level",
    topic: "Defense in Depth",
    objective: "1.1",
    options: {
      A: "Compute layer",
      B: "Application layer",
      C: "Data layer",
      D: "Network layer"
    },
    answer: "C",
    explanation: "Encrypting data at rest targets the Data layer — the innermost layer of the defense-in-depth model. The goal at this layer is to ensure that even if all outer layers are breached, the data itself is unreadable without the encryption key. Compute-layer controls address OS hardening and endpoint protection; application-layer controls cover secure coding practices and WAFs.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A security architect is mapping controls to defense-in-depth layers. Which TWO controls belong to the NETWORK layer? (Select TWO.)",
    difficulty: "Hard",
    topic: "Defense in Depth",
    objective: "1.1",
    options: {
      A: "Configuring network segmentation with subnets",
      B: "Requiring smart-card authentication to enter a server room",
      C: "Filtering traffic with network security groups (NSGs)",
      D: "Encrypting files stored on a blob container",
      E: "Enforcing HTTPS on a web application"
    },
    answer: ["A", "C"],
    explanation: "Network-layer controls in defense in depth focus on limiting lateral movement and controlling traffic flow: network segmentation (subnets, VLANs) and traffic filtering (NSGs, firewall rules) are canonical examples. Smart-card access to a server room is a Physical layer control. Encrypting blob storage addresses the Data layer. Enforcing HTTPS belongs to the Application or Perimeter layer.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Governance, Risk & Compliance (GRC) — control taxonomy cluster ──────
  {
    type: "mcq",
    question: "An organization deploys a security information and event management (SIEM) solution to generate real-time alerts when suspicious sign-in patterns are detected. This is an example of which type of security control?",
    difficulty: "Exam Level",
    topic: "Governance, Risk & Compliance (GRC)",
    objective: "1.1",
    options: {
      A: "Preventive control",
      B: "Detective control",
      C: "Corrective control",
      D: "Physical control"
    },
    answer: "B",
    explanation: "A SIEM that generates alerts when anomalous events occur is a DETECTIVE control — it identifies and surfaces incidents that are in progress or have already occurred. A PREVENTIVE control (e.g., MFA, firewall rule) stops an incident from happening in the first place. A CORRECTIVE control (e.g., restoring from backup, applying a patch after exploitation) restores normal operations after an incident.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "After a ransomware attack encrypts production data, the security team restores systems from an offsite backup. This action is BEST described as which type of security control?",
    difficulty: "Exam Level",
    topic: "Governance, Risk & Compliance (GRC)",
    objective: "1.1",
    options: {
      A: "Preventive",
      B: "Detective",
      C: "Corrective",
      D: "Deterrent"
    },
    answer: "C",
    explanation: "A CORRECTIVE control is applied AFTER an incident to minimize damage and restore systems to normal operation. Restoring from backup is the classic corrective example. A PREVENTIVE control (e.g., endpoint protection, MFA) would have attempted to stop the attack before it succeeded. A DETECTIVE control (e.g., an audit log alert, SIEM rule) would have identified the attack as it occurred.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An organization enforces multi-factor authentication (MFA) on all privileged administrator accounts. This is BEST classified as which type of security control?",
    difficulty: "Exam Level",
    topic: "Governance, Risk & Compliance (GRC)",
    objective: "1.1",
    options: {
      A: "Corrective",
      B: "Detective",
      C: "Preventive",
      D: "Compensating"
    },
    answer: "C",
    explanation: "MFA is a PREVENTIVE control because it is designed to stop unauthorized access from occurring in the first place. It acts as a gate before a resource is reached. Detective controls (e.g., audit logs, SIEM alerts) surface events after they occur or while occurring. Corrective controls restore state after an incident. Compensating controls are alternative controls used when primary controls cannot be implemented.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An organization defines policies that set the direction for information security, assesses potential threats and their likelihood, and maps its practices to industry frameworks such as ISO 27001. Which discipline does this BEST describe?",
    difficulty: "Exam Level",
    topic: "Governance, Risk & Compliance (GRC)",
    objective: "1.1",
    options: {
      A: "Incident response",
      B: "Governance, Risk, and Compliance (GRC)",
      C: "Penetration testing",
      D: "Security operations"
    },
    answer: "B",
    explanation: "GRC encompasses three complementary disciplines: Governance (policies, direction-setting, accountability), Risk Management (identifying, assessing, and treating threats and vulnerabilities), and Compliance (adhering to laws, regulations, and industry frameworks such as ISO 27001, NIST, or GDPR). Incident response and security operations are operational functions that sit within a GRC-governed program.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Zero Trust Model ─────────────────────────────────────────────────────
  {
    type: "mcq",
    question: "Which of the following BEST describes the Zero Trust principle of 'assume breach'?",
    difficulty: "Foundational",
    topic: "Zero Trust Model",
    objective: "1.1",
    options: {
      A: "Grant broad access to all users inside the corporate network perimeter",
      B: "Design systems so that a compromise of one component does not cascade to others",
      C: "Require users to authenticate only when accessing resources from outside the office",
      D: "Trust all traffic that originates from a domain-joined device"
    },
    answer: "B",
    explanation: "Microsoft Zero Trust is built on three guiding principles: verify explicitly, use least-privilege access, and assume breach. 'Assume breach' means designing systems and access policies on the presumption that an attacker is already present — minimising blast radius through segmentation, encrypting all traffic end-to-end, and using analytics to detect anomalies. It explicitly rejects the idea that anything inside the network perimeter is safe.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company adopts a Zero Trust security strategy. Which combination of principles forms the foundation of this model?",
    difficulty: "Hard",
    topic: "Zero Trust Model",
    objective: "1.1",
    options: {
      A: "Trust but verify, least privilege, and network segmentation",
      B: "Verify explicitly, use least-privilege access, and assume breach",
      C: "Defense in depth, perimeter security, and continuous monitoring",
      D: "Identity federation, single sign-on, and multi-factor authentication"
    },
    answer: "B",
    explanation: "Microsoft defines Zero Trust around three core principles: (1) Verify explicitly — always authenticate and authorize based on all available data points (identity, location, device health, service/workload, data classification, anomalies); (2) Use least-privilege access — limit user access with just-in-time and just-enough-access; (3) Assume breach — minimise blast radius and segment access. The other options mix related concepts but do not represent the formal three-pillar definition.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "In the Zero Trust model, identity is described as the new security perimeter. What does this mean in practice?",
    difficulty: "Exam Level",
    topic: "Zero Trust Model",
    objective: "1.1",
    options: {
      A: "Physical network boundaries are no longer needed",
      B: "Access decisions are based primarily on verified identity and device context rather than network location",
      C: "Users inside the office LAN receive automatic full trust",
      D: "VPN connections replace the need for authentication"
    },
    answer: "B",
    explanation: "Zero Trust treats identity as the primary control plane. Rather than granting trust based on where a request originates (e.g., inside the corporate network), every access request is evaluated against verified identity, device compliance status, and contextual signals — regardless of location. This shift is captured in the phrase 'identity is the new perimeter.' Physical network boundaries and VPNs still exist but are no longer sufficient to establish trust.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A security team is applying Zero Trust principles to a cloud environment. Which TWO practices directly implement Zero Trust? (Select TWO.)",
    difficulty: "Hard",
    topic: "Zero Trust Model",
    objective: "1.1",
    options: {
      A: "Granting permanent admin rights to all senior engineers",
      B: "Requiring step-up authentication when a user accesses highly sensitive data",
      C: "Trusting all traffic from devices joined to the corporate domain without further checks",
      D: "Using just-in-time (JIT) privileged access for administrative tasks",
      E: "Opening all firewall ports between internal network segments to improve productivity"
    },
    answer: ["B", "D"],
    explanation: "Step-up (contextual) authentication implements 'verify explicitly' — re-evaluating identity and risk at the moment of accessing sensitive resources. JIT privileged access implements 'use least-privilege access' — granting elevated rights only for the duration needed. Permanent admin rights, implicit trust for domain-joined devices, and wide-open firewall rules all contradict Zero Trust by assuming internal trust and over-provisioning access.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Encryption & Hashing ─────────────────────────────────────────────────
  {
    type: "mcq",
    question: "A developer stores user passwords as bcrypt hashes rather than in plaintext. Which property of hashing makes this an effective protection mechanism?",
    difficulty: "Foundational",
    topic: "Encryption & Hashing",
    objective: "1.1",
    options: {
      A: "Hashes can be reversed with the original key to recover the password",
      B: "Hashing is a one-way function — the original value cannot be derived from the hash",
      C: "Symmetric encryption ensures the same hash is produced on any system",
      D: "Asymmetric hashing lets the server decrypt the hash at login time"
    },
    answer: "B",
    explanation: "Hashing is a one-way, deterministic function: the same input always produces the same hash output, but the original input cannot be mathematically derived from the hash. This makes it suitable for storing passwords — at login, the entered password is hashed and compared to the stored hash, without ever storing the plaintext. Encryption (both symmetric and asymmetric) is reversible with a key; hashing is not.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company uses TLS to protect data transmitted between a client browser and its web servers. Which type of encryption does TLS use for the bulk data transfer phase?",
    difficulty: "Exam Level",
    topic: "Encryption & Hashing",
    objective: "1.1",
    options: {
      A: "Asymmetric encryption using a public/private key pair",
      B: "Hashing using SHA-256",
      C: "Symmetric encryption using a shared session key",
      D: "One-way encryption to produce a message digest"
    },
    answer: "C",
    explanation: "TLS performs a handshake using asymmetric encryption (public/private keys) to securely negotiate and exchange a session key, then switches to symmetric encryption for bulk data transfer. Symmetric encryption is significantly faster than asymmetric and uses a single shared key for both encryption and decryption. Hashing (e.g., SHA-256) is used for integrity verification within TLS, not for bulk data confidentiality.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which statement BEST differentiates encryption from hashing?",
    difficulty: "Exam Level",
    topic: "Encryption & Hashing",
    objective: "1.1",
    options: {
      A: "Encryption is one-way and cannot be reversed; hashing requires a key to reverse",
      B: "Encryption is reversible with a key and protects confidentiality; hashing is one-way and verifies integrity",
      C: "Both encryption and hashing are one-way functions used exclusively for authentication",
      D: "Hashing uses public and private keys; encryption uses a single shared secret"
    },
    answer: "B",
    explanation: "Encryption transforms plaintext into ciphertext using a key; the process is reversible — ciphertext can be decrypted back to plaintext by an authorized party holding the correct key. Encryption protects CONFIDENTIALITY. Hashing produces a fixed-length digest from input data; the process is NOT reversible — the original data cannot be recovered from the hash. Hashing protects INTEGRITY (you can verify data hasn't changed by re-hashing and comparing).",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Authentication vs Authorization ──────────────────────────────────────
  {
    type: "mcq",
    question: "A user provides a username, password, and an authenticator app code to sign into Microsoft 365. Which security process is being performed?",
    difficulty: "Foundational",
    topic: "Authentication vs Authorization",
    objective: "1.2",
    options: {
      A: "Authorization",
      B: "Authentication",
      C: "Federation",
      D: "Provisioning"
    },
    answer: "B",
    explanation: "Authentication (AuthN) is the process of proving identity — establishing WHO you are. Providing credentials (username/password) and an MFA code are authentication steps. Authorization (AuthZ) occurs AFTER successful authentication and determines WHAT the authenticated identity is allowed to do (e.g., which files they can read or which APIs they can call). Federation enables identity assertions to be trusted across organizations. Provisioning creates accounts.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "After signing in, a user attempts to open a confidential SharePoint site and receives a 'You do not have permission to access this resource' message. Which process generated this outcome?",
    difficulty: "Exam Level",
    topic: "Authentication vs Authorization",
    objective: "1.2",
    options: {
      A: "Authentication failed because the user's credentials were incorrect",
      B: "Authorization determined that the user's identity does not have the required permissions",
      C: "Federation rejected the cross-tenant identity claim",
      D: "The identity provider could not issue a token for the resource"
    },
    answer: "B",
    explanation: "The user successfully authenticated (they were already signed in). The permission denial at the SharePoint site is an AUTHORIZATION (AuthZ) decision — the system evaluated the user's identity against the resource's access policy and determined the user lacks the required permissions. Authentication answers 'who are you?'; authorization answers 'what are you allowed to do?' These are sequential but distinct processes.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Identity Providers & Directory Services ──────────────────────────────
  {
    type: "mcq",
    question: "A company uses Microsoft Entra ID as its cloud identity provider. What is the PRIMARY function of an identity provider (IdP)?",
    difficulty: "Foundational",
    topic: "Identity Providers & Directory Services (AD)",
    objective: "1.2",
    options: {
      A: "Storing encrypted copies of files in cloud storage",
      B: "Creating and managing user identities and issuing security tokens for authentication",
      C: "Scanning endpoints for malware signatures",
      D: "Routing network traffic between on-premises and cloud environments"
    },
    answer: "B",
    explanation: "An Identity Provider (IdP) is a system that creates, manages, and stores digital identities, and issues security tokens (e.g., SAML assertions, OAuth 2.0 access tokens, OpenID Connect ID tokens) that relying-party applications use to verify a user's identity. Microsoft Entra ID (formerly Azure Active Directory) is Microsoft's cloud-based IdP. It does not handle file storage, endpoint scanning, or network routing.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An enterprise runs Windows Server with Active Directory Domain Services (AD DS) on-premises. What role does Active Directory Domain Services play in the identity architecture?",
    difficulty: "Exam Level",
    topic: "Identity Providers & Directory Services (AD)",
    objective: "1.2",
    options: {
      A: "It is a cloud-native identity service that issues OAuth 2.0 tokens",
      B: "It is an on-premises directory service that stores user and computer objects and authenticates them using Kerberos and NTLM",
      C: "It provides identity federation exclusively for SaaS applications",
      D: "It replaces Microsoft Entra ID in hybrid environments"
    },
    answer: "B",
    explanation: "Active Directory Domain Services (AD DS) is Microsoft's on-premises directory service. It stores objects (users, computers, groups, policies) in a hierarchical database and uses Kerberos and NTLM protocols for authentication within the domain. It is not cloud-native and does not natively issue OAuth 2.0 or OpenID Connect tokens. In hybrid environments, Microsoft Entra Connect can synchronize on-premises AD DS identities to Microsoft Entra ID — the two services are complementary, not replacements for each other.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Authentication Methods & MFA ─────────────────────────────────────────
  {
    type: "mcq",
    question: "Which authentication factor category does a fingerprint scan belong to?",
    difficulty: "Foundational",
    topic: "Authentication Methods & MFA",
    objective: "1.2",
    options: {
      A: "Something you know",
      B: "Something you have",
      C: "Something you are",
      D: "Somewhere you are"
    },
    answer: "C",
    explanation: "Authentication factors are categorized as: Something you KNOW (password, PIN, security question); Something you HAVE (hardware token, smart card, authenticator app on a registered phone); Something you ARE (biometrics — fingerprint, facial recognition, iris scan). Multi-factor authentication (MFA) combines at least two different categories. Location ('somewhere you are') is sometimes cited as a fourth factor but is not part of the classic three-factor taxonomy on the SC-900 exam.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A user signs in with only their username and password. The IT team wants to add a second factor. Which option would satisfy a 'something you have' requirement?",
    difficulty: "Exam Level",
    topic: "Authentication Methods & MFA",
    objective: "1.2",
    options: {
      A: "Requiring a longer, more complex password",
      B: "Adding a fingerprint scan",
      C: "Sending a one-time passcode to a registered mobile device",
      D: "Requiring the user to answer a security question"
    },
    answer: "C",
    explanation: "A one-time passcode (OTP) sent to a registered mobile device falls into the 'something you HAVE' category because possession of the registered device is required to receive the code. A longer password is still 'something you know.' A fingerprint is 'something you are' (biometric). A security question is also 'something you know.' MFA requires factors from at least two DIFFERENT categories.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Federation & Identity-as-Perimeter ───────────────────────────────────
  {
    type: "mcq",
    question: "A company establishes a trust relationship with a partner organization so that partner employees can access its SharePoint sites using their own corporate credentials without creating separate accounts. This scenario BEST describes:",
    difficulty: "Exam Level",
    topic: "Federation & Identity-as-Perimeter",
    objective: "1.2",
    options: {
      A: "Active Directory Domain Services replication",
      B: "Identity federation",
      C: "Password hash synchronization",
      D: "Role-based access control (RBAC)"
    },
    answer: "B",
    explanation: "Identity federation establishes a trust relationship between two identity providers (or between a service provider and an IdP) so that users authenticated by one provider can access resources governed by another — without maintaining separate accounts in each directory. Common federation protocols include SAML 2.0 and WS-Federation. This differs from password hash synchronization, which copies credential hashes into a single directory rather than bridging two independent ones.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "Which TWO statements correctly describe identity federation? (Select TWO.)",
    difficulty: "Hard",
    topic: "Federation & Identity-as-Perimeter",
    objective: "1.2",
    options: {
      A: "Federation allows users to authenticate once with their home identity provider and access resources at a trusted partner organization",
      B: "Federation requires the partner organization to store copies of all user passwords",
      C: "SAML 2.0 is a protocol commonly used to implement federation between identity providers",
      D: "Federation eliminates the need for any authentication mechanism",
      E: "Federation is only possible between two on-premises Active Directory forests"
    },
    answer: ["A", "C"],
    explanation: "Federation enables cross-organizational SSO: a user authenticates with their home IdP and receives a security token (e.g., SAML assertion) that a relying-party (partner) trusts — no password is shared or copied. SAML 2.0 is one of the primary open standards used to implement federation; WS-Federation and OpenID Connect are also used. Passwords are never shared across federated organizations. Federation is not limited to on-premises AD — cloud services like Microsoft Entra ID fully support federation.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },


  // ── Entra ID Function & Identity Types ─────────────────────────────────────

  {
    type: "mcq",
    question: "A developer needs an application to access Azure Key Vault secrets without storing any credentials in the application code. Which identity type in Microsoft Entra ID is specifically designed for this scenario?",
    difficulty: "Exam Level",
    topic: "Entra ID Function & Identity Types",
    objective: "2.1",
    options: {
      A: "Guest user account",
      B: "System-assigned managed identity",
      C: "B2C local account",
      D: "Security group"
    },
    answer: "B",
    explanation: "A system-assigned managed identity is tied to an Azure resource (such as a VM or App Service) and automatically provides that resource with an identity in Microsoft Entra ID. The managed identity can be granted permissions to Azure Key Vault, eliminating the need to store credentials in code. The identity is created and deleted alongside the resource.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which statement best describes the difference between authentication and authorization in Microsoft Entra ID?",
    difficulty: "Foundational",
    topic: "Entra ID Function & Identity Types",
    objective: "2.1",
    options: {
      A: "Authentication determines what a user is allowed to do; authorization verifies who the user is.",
      B: "Authentication verifies the identity of a user or application; authorization determines what that identity is allowed to access.",
      C: "Authentication is only used for human users; authorization applies to applications and service principals.",
      D: "Both authentication and authorization refer to the process of issuing an access token."
    },
    answer: "B",
    explanation: "Authentication (AuthN) is the process of proving you are who you claim to be — validating credentials such as passwords, certificates, or biometrics. Authorization (AuthZ) comes after successful authentication and determines what resources and actions the verified identity is permitted to access. Microsoft Entra ID handles both as part of the identity and access management lifecycle.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Your organization registers an application in Microsoft Entra ID so that it can call the Microsoft Graph API on behalf of users. What identity object is automatically created in the tenant to represent this application's permissions and authentication settings?",
    difficulty: "Exam Level",
    topic: "Entra ID Function & Identity Types",
    objective: "2.1",
    options: {
      A: "Managed identity",
      B: "Guest user",
      C: "Service principal",
      D: "Administrative unit"
    },
    answer: "C",
    explanation: "When an application is registered in Microsoft Entra ID, a service principal object is created in the tenant. The service principal is the local representation of the application and defines what the application can do in that tenant, including which API permissions it holds. Managed identities are a special type of service principal for Azure resources that do not require credential management.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which Microsoft Entra ID identity type represents a physical or virtual device that has been registered or joined to the directory, allowing device-based Conditional Access policies to be applied?",
    difficulty: "Foundational",
    topic: "Entra ID Function & Identity Types",
    objective: "2.1",
    options: {
      A: "Service principal",
      B: "Managed identity",
      C: "Device identity",
      D: "Guest user"
    },
    answer: "C",
    explanation: "Microsoft Entra ID supports device identities for registered, joined, and hybrid-joined devices. A device identity allows administrators to apply Conditional Access policies that require a compliant or Entra-joined device as a condition for granting access. Service principals and managed identities represent applications and Azure resources, not physical or virtual machines registered for device-based policies.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "Which TWO identity objects can be members of a Microsoft Entra ID security group? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Entra ID Function & Identity Types",
    objective: "2.1",
    options: {
      A: "Administrative units",
      B: "User accounts",
      C: "Tenant root management groups",
      D: "Service principals (applications)",
      E: "Microsoft Entra ID tenants"
    },
    answer: ["B", "D"],
    explanation: "Microsoft Entra ID security groups can have user accounts, other groups, devices, and service principals (applications) as members. Administrative units are management containers used to delegate administration, not group membership objects. Tenants and management groups are not membership objects for security groups.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Hybrid Identity ─────────────────────────────────────────────────────────

  {
    type: "mcq",
    question: "Contoso has an on-premises Active Directory domain. They want employees to use the same username and password for both on-premises resources and Microsoft 365. Which Microsoft tool synchronises on-premises AD identities to Microsoft Entra ID?",
    difficulty: "Foundational",
    topic: "Hybrid Identity",
    objective: "2.1",
    options: {
      A: "Microsoft Entra Application Proxy",
      B: "Microsoft Entra Connect",
      C: "Microsoft Entra External ID",
      D: "Microsoft Endpoint Manager"
    },
    answer: "B",
    explanation: "Microsoft Entra Connect (formerly Azure AD Connect) is the Microsoft tool that synchronises on-premises Active Directory identities to Microsoft Entra ID, enabling hybrid identity. It supports password hash synchronisation, pass-through authentication, and federation with AD FS. Entra Application Proxy publishes on-premises web apps, not directory synchronisation.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An organisation uses Microsoft Entra Connect with Password Hash Synchronisation (PHS). When a user changes their password in on-premises Active Directory, what happens to the corresponding Entra ID account?",
    difficulty: "Exam Level",
    topic: "Hybrid Identity",
    objective: "2.1",
    options: {
      A: "The user must manually reset their Entra ID password separately via the My Account portal.",
      B: "Microsoft Entra Connect synchronises the hashed password to Entra ID so the user can sign in to cloud services with the new password.",
      C: "The on-premises password change is blocked until the Entra ID password is updated first.",
      D: "A new guest account is created in Entra ID for the cloud identity."
    },
    answer: "B",
    explanation: "With Password Hash Synchronisation, Microsoft Entra Connect periodically synchronises a hash of the user's on-premises password hash to Microsoft Entra ID. When a password change occurs on-premises, the updated hash is synchronised, allowing users to authenticate to cloud services with the same password. The user does not need to take any manual action in the cloud directory.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which hybrid identity authentication method keeps all password validation on-premises and does NOT synchronise password hashes to Microsoft Entra ID?",
    difficulty: "Hard",
    topic: "Hybrid Identity",
    objective: "2.1",
    options: {
      A: "Password Hash Synchronisation",
      B: "Pass-Through Authentication",
      C: "Seamless Single Sign-On only",
      D: "Microsoft Entra Application Proxy"
    },
    answer: "B",
    explanation: "Pass-Through Authentication (PTA) validates passwords directly against on-premises Active Directory in real time using a lightweight agent. No password hashes are stored in Microsoft Entra ID, which satisfies compliance requirements that prohibit cloud storage of credential data. With Password Hash Synchronisation (option A), a hash of the password hash is stored in Entra ID.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A device that is both domain-joined to an on-premises Active Directory and registered with Microsoft Entra ID is described as which type?",
    difficulty: "Exam Level",
    topic: "Hybrid Identity",
    objective: "2.1",
    options: {
      A: "Entra ID registered",
      B: "Entra ID joined",
      C: "Hybrid Entra ID joined",
      D: "Workplace joined"
    },
    answer: "C",
    explanation: "A Hybrid Entra ID joined device is joined to an on-premises Active Directory domain AND registered with Microsoft Entra ID simultaneously. This is common in organisations that have existing on-premises infrastructure but are moving to the cloud. 'Entra ID joined' devices are cloud-only and not joined to on-premises AD. 'Entra ID registered' is typically for personal BYOD devices.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── External Identities (B2B/B2C) ──────────────────────────────────────────

  {
    type: "mcq",
    question: "Fabrikam wants to allow employees of its partner company Contoso to collaborate on shared SharePoint sites without creating separate Fabrikam accounts for each Contoso employee. Which Microsoft Entra capability should Fabrikam use?",
    difficulty: "Foundational",
    topic: "External Identities (B2B/B2C)",
    objective: "2.1",
    options: {
      A: "Microsoft Entra External ID for B2C",
      B: "Microsoft Entra B2B collaboration (guest invitations)",
      C: "Microsoft Entra Domain Services",
      D: "Microsoft Entra Permissions Management"
    },
    answer: "B",
    explanation: "Microsoft Entra B2B collaboration lets organisations invite external users (such as partner employees) as guests using their own credentials from their home organisation. Guest users appear in the inviting organisation's directory and can be granted access to resources without the organisation creating and managing separate accounts for them. B2C is designed for customer-facing applications, not business partner collaboration.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A software company is building a consumer app where customers should be able to sign in with their Google or Facebook accounts. Which Microsoft Entra capability supports this customer-facing identity scenario?",
    difficulty: "Exam Level",
    topic: "External Identities (B2B/B2C)",
    objective: "2.1",
    options: {
      A: "Microsoft Entra B2B collaboration",
      B: "Microsoft Entra Verified ID",
      C: "Microsoft Entra External ID for customers (formerly Azure AD B2C)",
      D: "Microsoft Entra Domain Services"
    },
    answer: "C",
    explanation: "Microsoft Entra External ID for customers (which includes the capabilities formerly known as Azure Active Directory B2C) is the solution for customer-facing (consumer) applications. It allows customers to register and sign in using social identity providers such as Google, Facebook, Apple, or a local email address. Entra B2B collaboration is for business partner scenarios, not consumer sign-in flows.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "When an external user is invited via Microsoft Entra B2B collaboration, how does that user authenticate when accessing the inviting organisation's resources?",
    difficulty: "Exam Level",
    topic: "External Identities (B2B/B2C)",
    objective: "2.1",
    options: {
      A: "They must create a new account in the inviting organisation's tenant and use that account's password.",
      B: "They authenticate with their own home organisation's identity provider and are then represented as a guest in the inviting tenant.",
      C: "They can only authenticate using a Microsoft Authenticator one-time passcode sent to their mobile device.",
      D: "They must be assigned a Microsoft Entra ID P2 licence in the inviting tenant before authentication is permitted."
    },
    answer: "B",
    explanation: "B2B guest users authenticate with their own identity — either through their home organisation's identity provider (federated) or through a one-time passcode if they have no Azure AD/Microsoft account. They are then represented as a guest object in the inviting tenant, allowing the inviting organisation to control their access to resources without managing their credentials.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Entra Authentication Capabilities ──────────────────────────────────────

  {
    type: "mcq",
    question: "Which Microsoft Entra authentication feature allows users to reset their own passwords without contacting the IT helpdesk, using pre-registered verification methods such as an authenticator app or email?",
    difficulty: "Foundational",
    topic: "Entra Authentication Capabilities",
    objective: "2.2",
    options: {
      A: "Smart lockout",
      B: "Self-Service Password Reset (SSPR)",
      C: "Pass-Through Authentication",
      D: "Seamless Single Sign-On"
    },
    answer: "B",
    explanation: "Self-Service Password Reset (SSPR) enables users to reset or unlock their accounts using pre-registered methods (such as Microsoft Authenticator, email, phone, or security questions) without helpdesk involvement. SSPR reduces support costs and gives users immediate access when they forget their password. Smart lockout is a protection mechanism against brute-force attacks, not a self-service reset feature.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A user is signing in to Microsoft 365 and is presented with a number-matching prompt in the Microsoft Authenticator app instead of being asked for a password. Which authentication method is being used?",
    difficulty: "Exam Level",
    topic: "Entra Authentication Capabilities",
    objective: "2.2",
    options: {
      A: "FIDO2 security key",
      B: "Windows Hello for Business",
      C: "Passwordless sign-in via Microsoft Authenticator",
      D: "Hardware OTP token"
    },
    answer: "C",
    explanation: "Microsoft Authenticator supports passwordless sign-in using a number-matching notification. The user enters their username, receives a push notification in the Authenticator app showing a number that matches what is displayed on the sign-in screen, and approves — no password is entered. This is one of three Microsoft passwordless options alongside FIDO2 security keys and Windows Hello for Business.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Windows Hello for Business replaces passwords on Windows devices with which type of cryptographic authentication?",
    difficulty: "Exam Level",
    topic: "Entra Authentication Capabilities",
    objective: "2.2",
    options: {
      A: "A shared symmetric key stored in Microsoft Entra ID",
      B: "A certificate or key pair bound to the device, unlocked by biometrics or PIN",
      C: "An SMS one-time passcode delivered to the user's registered mobile number",
      D: "An OATH TOTP code generated by the Microsoft Authenticator app"
    },
    answer: "B",
    explanation: "Windows Hello for Business uses asymmetric (public/private key) cryptography. A key pair or certificate is created and the private key is stored in the device's TPM chip. The user unlocks the private key with a biometric gesture (fingerprint, face) or PIN — credentials that never leave the device. This eliminates the risks associated with passwords being transmitted or stored on servers.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "FIDO2 security keys are considered a strong passwordless authentication method because they rely on which security characteristic?",
    difficulty: "Hard",
    topic: "Entra Authentication Capabilities",
    objective: "2.2",
    options: {
      A: "A server-side secret shared between the key and Microsoft Entra ID that is periodically rotated",
      B: "Device-bound cryptographic credentials that are phishing-resistant because the private key never leaves the hardware token",
      C: "One-time passcodes generated using the HMAC-based OTP algorithm and synchronized every 30 seconds",
      D: "A PIN that is transmitted to Microsoft Entra ID for validation during each authentication"
    },
    answer: "B",
    explanation: "FIDO2 security keys (such as YubiKeys) store a device-bound private key that cannot be exported. Authentication is performed using a challenge-response mechanism where the private key signs a server challenge — the private key never leaves the hardware. Because authentication is bound to the origin (the specific website), FIDO2 is inherently phishing-resistant. PINs used with FIDO2 unlock the key locally and are not transmitted to the server.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Password Protection & Management ───────────────────────────────────────

  {
    type: "mcq",
    question: "Microsoft Entra ID's global banned-password list protects against which type of attack?",
    difficulty: "Foundational",
    topic: "Password Protection & Management",
    objective: "2.2",
    options: {
      A: "Pass-the-hash attacks where an attacker reuses stolen NTLM hashes",
      B: "Password spray attacks where attackers try commonly used passwords against many accounts",
      C: "Phishing attacks that trick users into revealing passwords on fake websites",
      D: "Man-in-the-middle attacks that intercept authentication tokens in transit"
    },
    answer: "B",
    explanation: "The Microsoft Entra ID global banned-password list blocks users from setting passwords that appear on a dynamically updated list of commonly used, easily guessed passwords. This directly counters password spray attacks, in which attackers try a small number of common passwords against a large number of accounts to avoid account lockout. Organizations can also add custom entries to the banned-password list.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An administrator wants to prevent users in the on-premises Active Directory from choosing passwords that are in Microsoft's global banned-password list. Which component enables this for on-premises AD?",
    difficulty: "Exam Level",
    topic: "Password Protection & Management",
    objective: "2.2",
    options: {
      A: "Microsoft Entra Connect password writeback",
      B: "Microsoft Entra ID Protection",
      C: "Microsoft Entra Password Protection proxy service and DC agent",
      D: "Microsoft Entra Application Proxy"
    },
    answer: "C",
    explanation: "Microsoft Entra Password Protection can extend cloud-based banned-password enforcement to on-premises Active Directory by installing a proxy service and a Domain Controller agent. The DC agent intercepts password set operations on the domain controller and evaluates them against the banned-password policy downloaded from Microsoft Entra ID. Password writeback (option A) allows cloud password resets to write back to on-premises AD, which is different.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Microsoft Entra Smart Lockout automatically locks an account after a number of failed sign-in attempts. Which statement accurately describes Smart Lockout's behaviour?",
    difficulty: "Hard",
    topic: "Password Protection & Management",
    objective: "2.2",
    options: {
      A: "Smart Lockout uses a single global lockout counter that affects both cloud and on-premises sign-in simultaneously.",
      B: "Smart Lockout tracks familiar and unfamiliar locations separately so that a brute-force attack from an unknown IP does not lock out the user from their familiar location.",
      C: "Smart Lockout permanently disables an account after 10 failed attempts, requiring an administrator to re-enable it.",
      D: "Smart Lockout only applies to accounts using Password Hash Synchronisation and not to cloud-only accounts."
    },
    answer: "B",
    explanation: "Microsoft Entra Smart Lockout maintains separate lockout counters for familiar (previously seen) and unfamiliar IP addresses. This means an attacker attempting a brute-force attack from an unknown IP can trigger lockout for that location without locking the legitimate user out from their usual device and location. Lockout is temporary and automatically lifts after the lockout duration expires; accounts are not permanently disabled.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Multifactor Authentication (Entra) ──────────────────────────────────────

  {
    type: "mcq",
    question: "Which of the following is the LEAST secure MFA method available in Microsoft Entra ID according to Microsoft's guidance?",
    difficulty: "Exam Level",
    topic: "Multifactor Authentication (Entra)",
    objective: "2.2",
    options: {
      A: "Microsoft Authenticator app push notification with number matching",
      B: "FIDO2 hardware security key",
      C: "SMS (text message) one-time passcode",
      D: "Certificate-based authentication"
    },
    answer: "C",
    explanation: "Microsoft's guidance identifies SMS-based one-time passcodes as the weakest MFA method among those listed, because SMS messages are vulnerable to SIM-swapping attacks, SS7 protocol vulnerabilities, and social-engineering attacks against mobile carriers. Microsoft Authenticator with number matching, FIDO2 keys, and certificate-based authentication all provide stronger security guarantees.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An organisation enables Microsoft Entra MFA. A user has registered both the Microsoft Authenticator app and a phone number for SMS codes. When the user signs in, what typically determines which method is presented first?",
    difficulty: "Exam Level",
    topic: "Multifactor Authentication (Entra)",
    objective: "2.2",
    options: {
      A: "The method that was registered most recently is always presented first.",
      B: "The administrator manually specifies the method order for each individual user.",
      C: "The user's default verification method, which can be changed in the My Security Info portal.",
      D: "Microsoft Entra ID randomly selects a method from the user's registered methods at each sign-in."
    },
    answer: "C",
    explanation: "Each user has a default MFA verification method that is presented first at sign-in. Users can update their default method via the My Security Info portal (mysignins.microsoft.com). Administrators can also configure authentication method policies at the tenant level to encourage stronger methods, but the default method per user is manageable by the user within those policies.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "Which TWO methods are considered fully passwordless authentication options supported by Microsoft Entra ID? (Select TWO.)",
    difficulty: "Foundational",
    topic: "Multifactor Authentication (Entra)",
    objective: "2.2",
    options: {
      A: "FIDO2 security key",
      B: "SMS one-time passcode",
      C: "OATH hardware token (TOTP)",
      D: "Windows Hello for Business",
      E: "Voice call approval"
    },
    answer: ["A", "D"],
    explanation: "Microsoft Entra ID supports three fully passwordless authentication methods: FIDO2 security keys, Windows Hello for Business, and the Microsoft Authenticator app passwordless sign-in. SMS OTPs and OATH TOTP tokens are additional verification factors (MFA) used alongside a password, not passwordless solutions by themselves. Voice call approval similarly supplements a password.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Conditional Access ──────────────────────────────────────────────────────

  {
    type: "mcq",
    question: "A Conditional Access policy is configured with the signal 'User risk: High' and the access control 'Require password change'. What service provides the user-risk signal consumed by this policy?",
    difficulty: "Hard",
    topic: "Conditional Access",
    objective: "2.3",
    options: {
      A: "Microsoft Defender for Endpoint",
      B: "Microsoft Entra ID Protection",
      C: "Microsoft Sentinel",
      D: "Microsoft Defender for Cloud Apps"
    },
    answer: "B",
    explanation: "Microsoft Entra ID Protection detects anomalies and potential compromises, producing user-risk and sign-in risk scores. These risk signals are surfaced to Conditional Access as conditions. A Conditional Access policy can act on a 'High user risk' signal — produced by Entra ID Protection — by requiring a password change before granting access. Conditional Access is the policy engine; Entra ID Protection provides the risk intelligence.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An administrator creates a Conditional Access policy that requires MFA for all users accessing the Azure portal from any location. Which component enforces this requirement at sign-in time?",
    difficulty: "Foundational",
    topic: "Conditional Access",
    objective: "2.3",
    options: {
      A: "Microsoft Entra ID Protection, which blocks risky sign-ins",
      B: "Privileged Identity Management, which requires approval before activating roles",
      C: "The Conditional Access policy engine, which evaluates signals and applies the grant control",
      D: "The user's home Active Directory domain controller"
    },
    answer: "C",
    explanation: "Conditional Access is Microsoft Entra ID's Zero Trust policy engine. It evaluates signals (user, location, device, application, risk) and applies grant controls (allow, block, require MFA, require compliant device, etc.) at sign-in time. Entra ID Protection detects risk but does not directly enforce MFA — it feeds risk scores to Conditional Access. PIM manages privileged role elevation, not sign-in access policies.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which Conditional Access grant control satisfies the requirement that a device must have a compliant configuration as validated by Microsoft Intune before access is granted?",
    difficulty: "Exam Level",
    topic: "Conditional Access",
    objective: "2.3",
    options: {
      A: "Require multi-factor authentication",
      B: "Require device to be marked as compliant",
      C: "Require hybrid Entra ID joined device",
      D: "Require approved client app"
    },
    answer: "B",
    explanation: "'Require device to be marked as compliant' is the Conditional Access grant control that works with Microsoft Intune to verify the device meets organisational compliance policies (e.g., encryption enabled, OS patched, PIN configured) before allowing access. 'Require hybrid Entra ID joined device' checks domain-join status but does not validate Intune compliance posture.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An administrator needs to BLOCK all sign-in attempts to Microsoft 365 from a specific country. Which feature is the most direct way to implement this with Conditional Access?",
    difficulty: "Exam Level",
    topic: "Conditional Access",
    objective: "2.3",
    options: {
      A: "Create an Entra ID Protection user-risk policy targeting that country's IP ranges",
      B: "Create a Conditional Access policy with a Named Location condition for that country and a Block access control",
      C: "Enable Smart Lockout and set the threshold to zero for foreign IP addresses",
      D: "Revoke all refresh tokens for users who sign in from that country using PowerShell"
    },
    answer: "B",
    explanation: "Conditional Access supports Named Locations based on IP address ranges or countries/regions. An administrator can create a Named Location for a specific country and then create a Conditional Access policy that blocks access when the sign-in originates from that location. This is applied in real time at sign-in for the targeted apps and users. Smart lockout and token revocation are not geographic access controls.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Before enabling a new Conditional Access policy broadly, an administrator wants to see which users would be affected without actually blocking or requiring MFA. Which Conditional Access feature supports this?",
    difficulty: "Exam Level",
    topic: "Conditional Access",
    objective: "2.3",
    options: {
      A: "Identity Secure Score",
      B: "Report-only mode",
      C: "Access reviews",
      D: "Sign-in diagnostic"
    },
    answer: "B",
    explanation: "Conditional Access report-only mode allows administrators to evaluate the impact of a policy without enforcing it. Sign-in logs show what the policy would have done (grant, block, require MFA) for each sign-in attempt. This lets teams validate policy scope and catch unintended consequences before switching the policy to 'On'. Identity Secure Score assesses overall security posture but does not simulate specific policy outcomes.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A Conditional Access policy is set to: Users = All users; Cloud apps = All cloud apps; Conditions = Sign-in risk: Medium or above; Grant = Block access. What is the effect when Entra ID Protection detects a medium-risk sign-in for a user?",
    difficulty: "Hard",
    topic: "Conditional Access",
    objective: "2.3",
    options: {
      A: "Entra ID Protection independently blocks the sign-in before Conditional Access evaluates the session.",
      B: "The Conditional Access policy denies the sign-in because the risk signal meets the policy condition.",
      C: "PIM triggers a role deactivation for the user because of the elevated risk level.",
      D: "The sign-in is allowed but a high-severity alert is raised in Microsoft Sentinel."
    },
    answer: "B",
    explanation: "Entra ID Protection produces the sign-in risk signal (e.g., Medium), which is consumed by the Conditional Access policy as a condition. When the condition 'Sign-in risk: Medium or above' is met, the configured grant control — in this case, Block access — is enforced by Conditional Access. Entra ID Protection is the detection layer; Conditional Access is the enforcement layer. PIM is unrelated to sign-in risk.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "Which TWO are valid signals that a Conditional Access policy can use as conditions? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Conditional Access",
    objective: "2.3",
    options: {
      A: "User or group membership",
      B: "The number of failed MFA attempts in the past 24 hours",
      C: "Device compliance state",
      D: "The user's Microsoft 365 licence SKU",
      E: "Time since the user last changed their password"
    },
    answer: ["A", "C"],
    explanation: "Conditional Access policies evaluate signals including users/groups, cloud app or action, conditions (device platform, location, sign-in risk, user risk, client apps, device state/compliance). User or group membership determines who the policy applies to, and device compliance state (from Intune) is a supported condition and grant control. Licence SKU and password-change age are not native CA signals. Failed MFA attempt counts are tracked by Smart Lockout, not CA conditions.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Entra Roles & RBAC ──────────────────────────────────────────────────────

  {
    type: "mcq",
    question: "An administrator must be able to create and manage users and reset passwords in Microsoft Entra ID, but should NOT have access to billing information or be able to change global settings. Which built-in Entra ID role is most appropriate?",
    difficulty: "Foundational",
    topic: "Entra Roles & RBAC",
    objective: "2.3",
    options: {
      A: "Global Administrator",
      B: "User Administrator",
      C: "Security Administrator",
      D: "Billing Administrator"
    },
    answer: "B",
    explanation: "The User Administrator role grants permission to create, read, update, and delete user accounts, manage group memberships, and reset passwords for non-administrator users. It does not provide access to billing settings or tenant-wide global configurations. The Global Administrator has the highest privilege and would violate least-privilege principles here. Security Administrator focuses on security features, not user lifecycle management.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "In Microsoft Entra ID's role-based access control model, what is the difference between an Entra ID directory role and an Azure RBAC role?",
    difficulty: "Hard",
    topic: "Entra Roles & RBAC",
    objective: "2.3",
    options: {
      A: "Entra ID directory roles control access to Microsoft Entra ID and Microsoft 365 services; Azure RBAC roles control access to Azure resource management plane resources such as virtual machines and storage accounts.",
      B: "Both types of roles are interchangeable and can be assigned at either the tenant level or an Azure subscription level.",
      C: "Entra ID directory roles are for guest users only; Azure RBAC roles apply to internal (member) users.",
      D: "Azure RBAC roles are managed in the Microsoft Entra admin centre; Entra ID directory roles are managed in the Azure portal."
    },
    answer: "A",
    explanation: "Microsoft Entra ID directory roles (such as Global Administrator, User Administrator) govern access to Microsoft Entra ID objects and Microsoft 365 services. Azure RBAC roles (such as Contributor, Virtual Machine Contributor) are scoped to Azure subscriptions, resource groups, or individual resources in the Azure Resource Manager plane. The two role systems are separate; a Global Administrator does not automatically have Azure subscription access and vice versa.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which Microsoft Entra concept allows an administrator to delegate user and group management within a specific subset of the organisation, such as a regional division, without giving that administrator directory-wide permissions?",
    difficulty: "Exam Level",
    topic: "Entra Roles & RBAC",
    objective: "2.3",
    options: {
      A: "Conditional Access named locations",
      B: "Administrative units",
      C: "Access packages",
      D: "Management groups"
    },
    answer: "B",
    explanation: "Administrative units let administrators scope role assignments to a subset of the directory. For example, a Helpdesk Administrator role can be assigned scoped to an administrative unit that contains only the users of a specific regional office — that admin can manage only those users' passwords and group memberships, not the entire directory. Management groups are an Azure resource hierarchy concept, not an Entra ID scoping mechanism.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which principle does assigning the most restrictive Entra ID role that still allows the required tasks exemplify?",
    difficulty: "Foundational",
    topic: "Entra Roles & RBAC",
    objective: "2.3",
    options: {
      A: "Defense in depth",
      B: "Separation of duties",
      C: "Least privilege",
      D: "Zero Trust network access"
    },
    answer: "C",
    explanation: "The principle of least privilege states that identities should be granted only the minimum permissions required to perform their work — no more. Assigning the narrowest role that enables the required tasks (e.g., User Administrator instead of Global Administrator) reduces the blast radius if the account is compromised. Separation of duties and defense in depth are related but distinct security principles.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Entra ID Governance ─────────────────────────────────────────────────────

  {
    type: "mcq",
    question: "Which Microsoft Entra ID Governance feature automates the lifecycle of user access to groups, applications, and SharePoint sites by using policies that define who can request access, who approves, and when access expires?",
    difficulty: "Exam Level",
    topic: "Entra ID Governance",
    objective: "2.4",
    options: {
      A: "Access reviews",
      B: "Privileged Identity Management",
      C: "Entitlement management (access packages)",
      D: "Lifecycle workflows"
    },
    answer: "C",
    explanation: "Entitlement management uses access packages to bundle related resource access (groups, apps, SharePoint sites) and define policies for who can request them, who approves, how long access lasts, and what happens when it expires. This automates the access request-and-approval lifecycle. Access reviews periodically check whether existing access is still appropriate. PIM manages privileged role elevation. Lifecycle workflows automate onboarding/offboarding tasks.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which Microsoft Entra ID Governance component automates joiner, mover, and leaver tasks — such as sending a welcome email on day one or disabling an account when HR records an employee's last day?",
    difficulty: "Exam Level",
    topic: "Entra ID Governance",
    objective: "2.4",
    options: {
      A: "Access reviews",
      B: "Entitlement management",
      C: "Lifecycle workflows",
      D: "Conditional Access"
    },
    answer: "C",
    explanation: "Lifecycle workflows are a Microsoft Entra ID Governance feature that automates identity lifecycle tasks triggered by HR events or time-based rules. Common use cases include automatically sending a welcome email and providing temporary access credentials before a new employee's first day, or disabling and removing account access when an employee leaves the organisation. Access reviews and entitlement management address access certification and self-service access requests, respectively.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "Which THREE capabilities are part of Microsoft Entra ID Governance? (Select THREE.)",
    difficulty: "Hard",
    topic: "Entra ID Governance",
    objective: "2.4",
    options: {
      A: "Access reviews",
      B: "Privileged Identity Management (PIM)",
      C: "Smart Lockout",
      D: "Entitlement management",
      E: "Conditional Access policies"
    },
    answer: ["A", "B", "D"],
    explanation: "Microsoft Entra ID Governance includes: Access reviews (periodic certification of access rights), Privileged Identity Management (just-in-time privileged role activation), and Entitlement management (access packages and lifecycle for resource access). Smart Lockout is part of the Password Protection feature, and Conditional Access is the Zero Trust policy engine — neither is categorised under Entra ID Governance.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Access Reviews ──────────────────────────────────────────────────────────

  {
    type: "mcq",
    question: "An organisation must periodically certify that all members of a privileged Entra ID group still require membership. Which Microsoft Entra ID Governance feature is most appropriate?",
    difficulty: "Foundational",
    topic: "Access Reviews",
    objective: "2.4",
    options: {
      A: "Privileged Identity Management",
      B: "Access reviews",
      C: "Entitlement management",
      D: "Identity Secure Score"
    },
    answer: "B",
    explanation: "Access reviews allow administrators or designated reviewers to periodically certify whether users still need their current access — such as membership in a security group or assignment to an application. If a reviewer denies access, the membership or assignment can be automatically removed. PIM handles time-bound role elevation, not group-membership certification. Entitlement management handles the initial access request-and-approval flow.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "When configuring a Microsoft Entra access review, the administrator sets 'If reviewers don't respond' to 'Remove access'. What happens to a user whose reviewer does not submit a decision before the review period ends?",
    difficulty: "Exam Level",
    topic: "Access Reviews",
    objective: "2.4",
    options: {
      A: "The user's access remains unchanged until the next review period.",
      B: "The user's access is automatically removed at the end of the review period.",
      C: "The user receives an email asking them to self-certify their access need.",
      D: "An alert is raised in Microsoft Sentinel and the access decision is escalated."
    },
    answer: "B",
    explanation: "The 'If reviewers don't respond' setting determines the automatic outcome for users with no reviewer decision. When set to 'Remove access', any user whose reviewer fails to respond by the review deadline has their access (group membership, app assignment, or role) automatically removed upon completion of the review. This enforces access hygiene even when reviewers are non-responsive.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A compliance team needs assurance that guest users who were invited two years ago and have not signed in recently no longer have access to company resources. Which automated action in access reviews supports this requirement?",
    difficulty: "Hard",
    topic: "Access Reviews",
    objective: "2.4",
    options: {
      A: "Configure PIM to deactivate guest user roles after 90 days of inactivity",
      B: "Enable the access review setting to apply recommendations, which flags users with no recent sign-in activity as 'Deny' by default",
      C: "Create a Conditional Access policy that blocks sign-in for accounts older than two years",
      D: "Use Lifecycle workflows to delete accounts with a creation date more than two years in the past"
    },
    answer: "B",
    explanation: "Access reviews support machine learning-based recommendations that automatically suggest 'Deny' for users who have not signed in recently or who have not used the resource. Reviewers can accept these recommendations in bulk to efficiently remove stale guest access. This is specifically useful for guest user hygiene. PIM manages privileged roles, not guest access. Conditional Access policies filter by account age is not a supported CA condition.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "Which TWO actions can be automatically applied when a Microsoft Entra access review is completed with an 'Auto-apply results to resource' configuration? (Select TWO.)",
    difficulty: "Hard",
    topic: "Access Reviews",
    objective: "2.4",
    options: {
      A: "Remove denied users from the reviewed group or application assignment",
      B: "Force denied users to re-enrol their MFA methods",
      C: "Keep access unchanged for users who were approved",
      D: "Reset passwords for all users who were denied",
      E: "Send a daily report of denied users to Microsoft Sentinel"
    },
    answer: ["A", "C"],
    explanation: "When auto-apply results is enabled, a completed access review automatically removes access for users whose access was denied (A) and keeps access in place for those who were approved (C). The feature does not force MFA re-enrolment, reset passwords, or send reports to Sentinel — those would require separate workflow configurations.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Privileged Identity Management (PIM) ────────────────────────────────────

  {
    type: "mcq",
    question: "A user is a Global Administrator who uses their highly privileged account for everyday tasks. The security team wants to reduce the risk of the account being misused. Which Microsoft Entra capability should be implemented?",
    difficulty: "Foundational",
    topic: "Privileged Identity Management (PIM)",
    objective: "2.4",
    options: {
      A: "Assign the user a Conditional Access policy requiring MFA from their home location",
      B: "Enable Entra ID Protection to monitor the account for risky sign-ins",
      C: "Make the user eligible for the Global Administrator role in PIM and remove their permanent assignment",
      D: "Place the account in an administrative unit to restrict its scope"
    },
    answer: "C",
    explanation: "Privileged Identity Management (PIM) enables just-in-time (JIT) role activation. By making the user 'eligible' for Global Administrator instead of permanently assigned, the role is only active when explicitly activated (for a limited time, with optional MFA or approval). This dramatically reduces the window of exposure compared to a standing permanent assignment. Conditional Access and ID Protection are complementary controls but do not eliminate the standing privilege.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "In Microsoft Entra Privileged Identity Management, what is the difference between an 'eligible' role assignment and an 'active' role assignment?",
    difficulty: "Exam Level",
    topic: "Privileged Identity Management (PIM)",
    objective: "2.4",
    options: {
      A: "Eligible assignments grant permanent role permissions; active assignments expire after 8 hours.",
      B: "Eligible assignments allow a user to activate the role when needed; active assignments mean the role permissions are always on.",
      C: "Eligible assignments require a Global Administrator to activate them; active assignments can be self-activated.",
      D: "Eligible and active assignments are identical — the distinction only affects audit log labelling."
    },
    answer: "B",
    explanation: "In PIM, an 'eligible' assignment means the user has the right to activate the role but the permissions are not currently in effect. To use the role, the user must explicitly activate it (potentially completing MFA, providing a justification, or waiting for approval). An 'active' assignment means role permissions are currently in effect without any activation step — they may be permanent or time-bound. PIM encourages eligible over active to minimise standing privilege.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A security policy requires that no one can hold the Exchange Administrator role for longer than four hours without going through re-approval. Which PIM capability enforces this?",
    difficulty: "Exam Level",
    topic: "Privileged Identity Management (PIM)",
    objective: "2.4",
    options: {
      A: "Conditional Access sign-in frequency session control",
      B: "PIM role activation maximum duration and approval workflow",
      C: "Entra ID Protection requiring MFA after four hours",
      D: "Access review scheduled every four hours"
    },
    answer: "B",
    explanation: "PIM allows administrators to configure role settings including the maximum activation duration (e.g., four hours) and whether activation requires approval. When the activation period expires, the role is automatically deactivated and the user loses the elevated permissions. If they need to continue, they must go through the activation (and approval) process again. Conditional Access sign-in frequency controls session re-authentication, not role duration. Access reviews run on a periodic schedule (daily/weekly/monthly), not in real time.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which PIM feature periodically reviews who holds eligible or active privileged role assignments and can automatically remove assignments for reviewers who deny access?",
    difficulty: "Exam Level",
    topic: "Privileged Identity Management (PIM)",
    objective: "2.4",
    options: {
      A: "PIM activation audit log",
      B: "PIM access reviews for roles",
      C: "Conditional Access for privileged roles",
      D: "Identity Secure Score recommendations"
    },
    answer: "B",
    explanation: "PIM access reviews for roles (a PIM-specific type of access review) allow periodic certification of privileged role assignments. A reviewer (or the role holder themselves) can confirm whether the assignment is still needed. If access is denied and auto-apply is enabled, the eligible or active assignment is removed. This combines the access review and PIM capabilities within Microsoft Entra ID Governance.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An organisation needs to ensure that activating the Global Administrator role in PIM always requires a second person's approval, even when the requestor is the IT Director. Which PIM setting achieves this?",
    difficulty: "Hard",
    topic: "Privileged Identity Management (PIM)",
    objective: "2.4",
    options: {
      A: "Set the role activation maximum duration to one hour",
      B: "Enable the 'Require justification on activation' setting for the role",
      C: "Configure an approval workflow requiring at least one approver for role activation",
      D: "Create a Conditional Access policy requiring MFA for Global Administrators"
    },
    answer: "C",
    explanation: "PIM role settings allow configuring an approval workflow for activations. When at least one approver is required, no one — including high-ranking individuals — can activate the role without an approver explicitly approving the request. This enforces separation of duties for the most sensitive roles. Requiring justification (option B) captures a business reason but does not prevent self-activation. MFA verifies identity but does not require a second person's decision.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "Which TWO capabilities does Microsoft Entra Privileged Identity Management provide that Conditional Access does NOT? (Select TWO.)",
    difficulty: "Hard",
    topic: "Privileged Identity Management (PIM)",
    objective: "2.4",
    options: {
      A: "Just-in-time activation of privileged roles that expire after a configurable duration",
      B: "Blocking sign-ins from risky locations",
      C: "Requiring approval from a designated approver before a user can activate a privileged role",
      D: "Detecting compromised credentials using machine-learning risk signals",
      E: "Requiring MFA for all users accessing the Azure portal"
    },
    answer: ["A", "C"],
    explanation: "PIM uniquely provides just-in-time role activation with configurable time limits (A) and an approval workflow that requires a human approver before a privileged role becomes active (C). Blocking sign-ins from risky locations (B) and requiring MFA for portal access (E) are Conditional Access controls. Detecting risk signals from compromised credentials (D) is Entra ID Protection.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Entra ID Protection ─────────────────────────────────────────────────────

  {
    type: "mcq",
    question: "Microsoft Entra ID Protection detected that a user's credentials appear in a public breach database. Which risk classification does this generate?",
    difficulty: "Foundational",
    topic: "Entra ID Protection",
    objective: "2.4",
    options: {
      A: "Sign-in risk: High",
      B: "User risk: High (leaked credentials detection)",
      C: "Conditional Access: Block",
      D: "PIM alert: Suspicious activation"
    },
    answer: "B",
    explanation: "Microsoft Entra ID Protection (formerly Azure AD Identity Protection) includes a leaked credentials detection that monitors databases of username/password pairs exposed in public breaches and compares them against Microsoft Entra accounts. A match elevates the user's user-risk level to High. This is a user-risk signal (persistent compromise indicator), not a sign-in risk (transient sign-in anomaly). Conditional Access can then act on this elevated user risk.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "What is the primary difference between sign-in risk and user risk in Microsoft Entra ID Protection?",
    difficulty: "Exam Level",
    topic: "Entra ID Protection",
    objective: "2.4",
    options: {
      A: "Sign-in risk applies only to guest users; user risk applies only to member users.",
      B: "Sign-in risk is the probability that a specific authentication attempt is not authorised by the user; user risk is the probability that a user identity has been compromised.",
      C: "Sign-in risk is evaluated by Conditional Access; user risk is evaluated by Privileged Identity Management.",
      D: "Sign-in risk and user risk are identical concepts described by different terms in different portals."
    },
    answer: "B",
    explanation: "In Microsoft Entra ID Protection, sign-in risk reflects the probability that a specific sign-in event was not performed by the legitimate user (e.g., unfamiliar sign-in properties, atypical travel). User risk reflects the probability that a user's identity or account has been compromised over time (e.g., leaked credentials, anomalous behaviour patterns). Both types of risk scores can be consumed by Conditional Access policies as conditions.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An attacker who stole credentials for an account in New York signs in from a location in London two hours after the legitimate user last signed in from New York. Which Microsoft Entra ID Protection detection would most likely flag this event?",
    difficulty: "Exam Level",
    topic: "Entra ID Protection",
    objective: "2.4",
    options: {
      A: "Password spray detection",
      B: "Impossible travel detection",
      C: "Leaked credentials detection",
      D: "Anomalous token detection"
    },
    answer: "B",
    explanation: "Impossible travel detection flags sign-ins from geographically distant locations within a time window that would be physically impossible to travel. Two sign-ins from New York and London within two hours would be flagged as it is physically impossible to travel between them in that time. This is a sign-in risk detection. Leaked credentials detection applies to breach-database matches, not travel anomalies.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An administrator reviews a risky user report in Microsoft Entra ID Protection and determines that the risk was triggered by a false-positive VPN detection. What action should the administrator take to clear the risk without requiring the user to reset their password?",
    difficulty: "Hard",
    topic: "Entra ID Protection",
    objective: "2.4",
    options: {
      A: "Activate the user's PIM eligible role to clear the risk event automatically",
      B: "Dismiss the user risk, marking it as a false positive",
      C: "Delete the Conditional Access policy that detected the risk",
      D: "Remove the user's MFA registration to reset the risk score to Low"
    },
    answer: "B",
    explanation: "In Microsoft Entra ID Protection, an administrator can dismiss (confirm safe user) a user risk when they determine the detection was a false positive. This resets the user's risk level without requiring a password change. If the risk were genuine, the appropriate remediation would be to require the user to change their password or perform MFA to self-remediate. Conditional Access policies do not detect risk — they consume risk signals from ID Protection.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A security architect wants to automatically require users to change their password when Entra ID Protection flags their user risk as High. What must be configured to enforce this automatically?",
    difficulty: "Hard",
    topic: "Entra ID Protection",
    objective: "2.4",
    options: {
      A: "A PIM policy that deactivates the user's role when their user risk is High",
      B: "A Conditional Access policy with user risk condition set to High and grant control set to Require password change",
      C: "An access review scheduled to run every time a user's risk level changes",
      D: "An Entra ID Protection alert rule that sends an email to the helpdesk, who then manually resets the password"
    },
    answer: "B",
    explanation: "The automated enforcement path is: Entra ID Protection detects user risk (High) → Conditional Access policy evaluates the user-risk signal as a condition → the grant control 'Require password change' is enforced at the next sign-in. This is the recommended automated remediation for high user risk. PIM does not respond to identity risk signals. Access reviews run on schedules, not event triggers.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "Which TWO statements accurately distinguish Microsoft Entra ID Protection from Conditional Access? (Select TWO.)",
    difficulty: "Hard",
    topic: "Entra ID Protection",
    objective: "2.4",
    options: {
      A: "Entra ID Protection detects risk events such as impossible travel and leaked credentials; Conditional Access enforces policy actions in response to those risks.",
      B: "Conditional Access can block access or require MFA on its own based on non-risk signals such as location or device compliance.",
      C: "Entra ID Protection is the policy enforcement engine; Conditional Access is the risk detection engine.",
      D: "Both Entra ID Protection and Conditional Access require Microsoft Entra ID P2 licences for all features.",
      E: "Entra ID Protection can block a sign-in directly without needing Conditional Access."
    },
    answer: ["A", "B"],
    explanation: "A is correct: Entra ID Protection is the risk-detection layer producing sign-in and user risk scores; Conditional Access is the policy enforcement engine that acts on those scores. B is correct: Conditional Access can enforce policies independently of risk signals — for example, requiring a compliant device or MFA from any location, regardless of risk level. C reverses the roles of the two services. D is partially misleading — some CA features are included in free Entra ID. E is incorrect: Entra ID Protection raises risk but does not directly block access; that is CA's responsibility.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Additional covering the mandatory cluster distinction ───────────────────

  {
    type: "mcq",
    question: "Which Microsoft Entra feature should an organisation implement if its goal is to ensure that a contractor's access to a specific project team automatically expires at the end of the contract period?",
    difficulty: "Exam Level",
    topic: "Entra ID Governance",
    objective: "2.4",
    options: {
      A: "Conditional Access time-based session controls",
      B: "An access package with an expiration policy in Entitlement management",
      C: "PIM eligible role assignment with a one-time activation",
      D: "A Smart Lockout policy applied to external accounts"
    },
    answer: "B",
    explanation: "Entitlement management access packages support expiration policies that automatically remove access when a specified date is reached or after a duration elapses. For a contractor engagement, the access package can be configured with an expiry matching the contract end date. When the expiry is reached, the contractor's group memberships and application assignments from that package are automatically removed. Conditional Access session controls manage re-authentication frequency, not access expiry.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A new employee joins the company. Which TWO tasks can Microsoft Entra Lifecycle Workflows automate on the user's first day? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Entra ID Governance",
    objective: "2.4",
    options: {
      A: "Generate a temporary access pass for the user to complete their MFA registration",
      B: "Assign an Azure subscription to the user's department",
      C: "Send the user's manager a welcome notification email",
      D: "Create the user's on-premises Active Directory account",
      E: "Configure the user's physical workstation hardware"
    },
    answer: ["A", "C"],
    explanation: "Lifecycle workflows support joiner tasks including generating a Temporary Access Pass (TAP) for passwordless onboarding and MFA registration (A), and sending email notifications to the user or their manager (C). Assigning Azure subscriptions is an Azure RBAC task not automated by Lifecycle Workflows. Creating on-premises AD accounts and provisioning physical hardware are outside the scope of Lifecycle Workflows.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which Microsoft Entra feature can require that a user registers at least two authentication methods before self-service password reset is enabled for their account?",
    difficulty: "Exam Level",
    topic: "Entra Authentication Capabilities",
    objective: "2.2",
    options: {
      A: "Conditional Access authentication strength",
      B: "SSPR authentication method configuration (number of methods required to reset)",
      C: "Entra ID Protection registration policy",
      D: "PIM activation policy"
    },
    answer: "B",
    explanation: "In the Self-Service Password Reset configuration in the Microsoft Entra admin centre, administrators set the 'Number of methods required to reset' to 1 or 2. Setting it to 2 means a user must verify their identity using two different registered methods (e.g., mobile app code AND email) before completing a password reset. The Entra ID Protection combined registration policy ensures users register for both SSPR and MFA, but the method-count requirement is a specific SSPR setting.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ─── Q1 — Azure DDoS Protection (Foundational) ───────────────────────────
  {
    type: "mcq",
    question: "A company hosts a public-facing web application on Azure. The security team wants to protect it against volumetric network attacks that flood the application with traffic. Which Azure service is MOST appropriate?",
    difficulty: "Foundational",
    topic: "Azure DDoS Protection",
    objective: "3.1",
    options: {
      A: "Azure Firewall",
      B: "Azure DDoS Protection",
      C: "Network Security Groups (NSGs)",
      D: "Azure Bastion"
    },
    answer: "B",
    explanation: "Azure DDoS Protection is designed specifically to mitigate volumetric DDoS attacks that flood resources with traffic. Azure Firewall controls network traffic flow but does not absorb volumetric flood attacks. NSGs are stateless packet filters at the subnet/NIC level. Azure Bastion provides secure RDP/SSH access and is unrelated to DDoS mitigation.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q2 — Azure DDoS Protection (Exam Level) ─────────────────────────────
  {
    type: "mcq",
    question: "Azure DDoS Protection Standard continuously monitors network traffic and applies which mechanism to neutralize an attack when detected?",
    difficulty: "Exam Level",
    topic: "Azure DDoS Protection",
    objective: "3.1",
    options: {
      A: "Packet inspection at the application layer using OWASP rule sets",
      B: "Adaptive real-time tuning that automatically scrubs malicious traffic",
      C: "Blocking all inbound UDP traffic at the virtual network gateway",
      D: "Creating deny rules in the associated Network Security Group"
    },
    answer: "B",
    explanation: "Azure DDoS Protection Standard uses adaptive real-time tuning — it learns normal traffic patterns and automatically scrubs (drops) malicious traffic while allowing legitimate traffic to pass. It does not use OWASP rule sets (that is WAF), does not blanket-block UDP, and does not write NSG rules.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q3 — Azure Firewall (Foundational) ──────────────────────────────────
  {
    type: "mcq",
    question: "An organization wants a managed, cloud-based network security service that can enforce network and application-level rules centrally across all its Azure virtual networks. Which service should they use?",
    difficulty: "Foundational",
    topic: "Azure Firewall",
    objective: "3.1",
    options: {
      A: "Network Security Groups (NSGs)",
      B: "Azure Firewall",
      C: "Azure DDoS Protection",
      D: "Web Application Firewall (WAF)"
    },
    answer: "B",
    explanation: "Azure Firewall is a managed, stateful network firewall service that can centrally enforce network and application-level rules. NSGs operate at the subnet/NIC level and are not centrally managed as a single service. Azure DDoS Protection handles volumetric attacks. WAF protects HTTP/HTTPS web apps from OWASP-style attacks.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q4 — Azure Firewall (Exam Level) ────────────────────────────────────
  {
    type: "mcq",
    question: "Which of the following correctly describes a capability that Azure Firewall provides that Network Security Groups (NSGs) do NOT provide?",
    difficulty: "Exam Level",
    topic: "Azure Firewall",
    objective: "3.1",
    options: {
      A: "Blocking or allowing traffic between subnets within the same virtual network",
      B: "Fully qualified domain name (FQDN) filtering in application rules",
      C: "Applying inbound and outbound rules at the network interface level",
      D: "Integration with Azure virtual networks at no additional cost"
    },
    answer: "B",
    explanation: "Azure Firewall supports FQDN filtering in application rules, allowing or denying traffic based on domain names. NSGs work at Layer 3/4 with IP addresses and port ranges; they cannot filter by FQDN. Both services can control inter-subnet traffic. NSGs operate at the NIC/subnet level. Azure Firewall is a paid service.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q5 — Web Application Firewall (WAF) (Foundational) ──────────────────
  {
    type: "mcq",
    question: "A developer wants to protect a web application hosted on Azure from SQL injection and cross-site scripting (XSS) attacks. Which Azure service is specifically designed for this purpose?",
    difficulty: "Foundational",
    topic: "Web Application Firewall (WAF)",
    objective: "3.1",
    options: {
      A: "Azure DDoS Protection",
      B: "Azure Firewall",
      C: "Web Application Firewall (WAF)",
      D: "Network Security Groups (NSGs)"
    },
    answer: "C",
    explanation: "Web Application Firewall (WAF) protects web applications from common OWASP threats including SQL injection and cross-site scripting (XSS). Azure DDoS Protection handles volumetric traffic floods. Azure Firewall enforces Layer 3–7 network rules but is not specialized for OWASP attack patterns. NSGs are Layer 3/4 packet filters.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q6 — Web Application Firewall (WAF) (Exam Level) ────────────────────
  {
    type: "multi-select",
    question: "Azure WAF can be deployed on which TWO Azure services to protect web applications? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Web Application Firewall (WAF)",
    objective: "3.1",
    options: {
      A: "Azure Application Gateway",
      B: "Azure Virtual Machine Scale Sets",
      C: "Azure Front Door",
      D: "Azure Bastion",
      E: "Azure DNS"
    },
    answer: ["A", "C"],
    explanation: "Azure WAF integrates with Azure Application Gateway (for regional deployments) and Azure Front Door (for global, edge-based protection). It can also integrate with Azure CDN. Virtual Machine Scale Sets, Azure Bastion, and Azure DNS are not WAF integration points.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q7 — Network Segmentation (VNets) (Foundational) ────────────────────
  {
    type: "mcq",
    question: "An architect wants to isolate a production workload from a development workload in Azure so that the two cannot communicate by default. What is the BEST approach?",
    difficulty: "Foundational",
    topic: "Network Segmentation (VNets)",
    objective: "3.1",
    options: {
      A: "Place both workloads in the same VNet and use tags to identify them",
      B: "Deploy each workload in a separate Azure Virtual Network (VNet)",
      C: "Apply a single NSG rule denying all traffic between the two workloads",
      D: "Enable Azure DDoS Protection on the shared VNet"
    },
    answer: "B",
    explanation: "Virtual Networks (VNets) provide isolation boundaries in Azure — resources in separate VNets cannot communicate by default without explicit VNet peering or a VPN gateway. Placing both in the same VNet with tags does not prevent communication. A single NSG rule would need continuous maintenance. DDoS Protection is unrelated to segmentation.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q8 — Network Segmentation (VNets) (Exam Level) ──────────────────────
  {
    type: "mcq",
    question: "Which statement BEST describes how Azure Virtual Networks support the defense-in-depth security principle?",
    difficulty: "Exam Level",
    topic: "Network Segmentation (VNets)",
    objective: "3.1",
    options: {
      A: "They encrypt all data in transit between virtual machines automatically",
      B: "They create logical network isolation boundaries that limit lateral movement of threats",
      C: "They replace the need for NSGs by providing built-in packet filtering",
      D: "They automatically block all inbound internet traffic to attached resources"
    },
    answer: "B",
    explanation: "Azure VNets create logical isolation that limits how far an attacker can move laterally — a core defense-in-depth layer. VNets do not automatically encrypt traffic, do not replace NSGs, and do not block all inbound internet traffic by default.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q9 — Network Security Groups (NSGs) (Foundational) ──────────────────
  {
    type: "mcq",
    question: "A security administrator needs to allow HTTPS traffic (port 443) inbound from the internet to a web server VM and deny all other inbound traffic. Which Azure feature should they configure?",
    difficulty: "Foundational",
    topic: "Network Security Groups (NSGs)",
    objective: "3.1",
    options: {
      A: "Azure Firewall application rule collection",
      B: "Network Security Group (NSG) inbound security rules",
      C: "Azure DDoS Protection policy",
      D: "Azure Key Vault network ACLs"
    },
    answer: "B",
    explanation: "NSGs contain inbound and outbound security rules that allow or deny network traffic based on source/destination IP, port, and protocol. They can be applied to subnets or individual NICs. Azure Firewall is a more advanced centralized firewall. DDoS Protection handles volumetric attacks. Key Vault ACLs control access to the vault, not VM traffic.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q10 — Network Security Groups (NSGs) (Exam Level) ───────────────────
  {
    type: "mcq",
    question: "An NSG rule has priority 200 allowing TCP port 22 inbound, and another rule has priority 300 denying all inbound traffic. What will happen when an SSH connection is attempted?",
    difficulty: "Exam Level",
    topic: "Network Security Groups (NSGs)",
    objective: "3.1",
    options: {
      A: "The connection will be denied because deny rules always take precedence",
      B: "The connection will be allowed because lower priority numbers are processed first",
      C: "Both rules cancel each other out, and traffic is blocked by default",
      D: "Azure will alert the security team before processing the rules"
    },
    answer: "B",
    explanation: "NSG rules are processed in ascending priority order — lower numbers first. Priority 200 (allow TCP 22) is processed before priority 300 (deny all), so the SSH connection is allowed. NSGs do not have a concept of deny-always overriding; priority order determines outcome.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q11 — Azure Bastion (Foundational) ──────────────────────────────────
  {
    type: "mcq",
    question: "A company wants to enable administrators to connect to Azure VMs via RDP and SSH without exposing those VMs to the public internet. Which service should they deploy?",
    difficulty: "Foundational",
    topic: "Azure Bastion",
    objective: "3.1",
    options: {
      A: "A site-to-site VPN gateway",
      B: "Azure Bastion",
      C: "An NSG rule allowing port 3389 from the internet",
      D: "Azure Active Directory Application Proxy"
    },
    answer: "B",
    explanation: "Azure Bastion provides secure, browser-based RDP and SSH access to Azure VMs through the Azure portal without requiring a public IP on the VM or opening RDP/SSH ports to the internet. A VPN gateway enables network-level connectivity but requires client-side configuration. Opening port 3389 to the internet is a security risk. App Proxy is for on-premises web apps.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q12 — Azure Bastion (Exam Level) ────────────────────────────────────
  {
    type: "mcq",
    question: "Which of the following is a security benefit of using Azure Bastion compared to a jump server with a public IP address?",
    difficulty: "Exam Level",
    topic: "Azure Bastion",
    objective: "3.1",
    options: {
      A: "Azure Bastion eliminates the need for Azure Active Directory authentication",
      B: "Azure Bastion sessions are rendered in the browser over TLS, and the VM requires no public IP",
      C: "Azure Bastion provides end-to-end encryption for data stored on the VM's disk",
      D: "Azure Bastion automatically patches the operating system of the target VM"
    },
    answer: "B",
    explanation: "Azure Bastion streams RDP/SSH sessions as HTML5 over TLS (port 443) directly in the browser. The target VM requires no public IP address, removing it from direct internet exposure. Azure Bastion does not bypass Azure AD authentication, does not encrypt disk data, and does not patch VMs.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q13 — Azure Key Vault (Foundational) ────────────────────────────────
  {
    type: "mcq",
    question: "A development team hard-codes database connection strings in their application source code. What Azure service would eliminate this security risk by providing a centralized, access-controlled store for secrets?",
    difficulty: "Foundational",
    topic: "Azure Key Vault",
    objective: "3.1",
    options: {
      A: "Azure Storage with private endpoints",
      B: "Azure Key Vault",
      C: "Azure DDoS Protection",
      D: "Microsoft Defender for Cloud"
    },
    answer: "B",
    explanation: "Azure Key Vault is a cloud service for securely storing and accessing secrets, keys, and certificates. Applications retrieve secrets at runtime through the Key Vault API, eliminating hard-coded credentials. Azure Storage stores blobs/files but is not a secrets management service. DDoS Protection and Defender for Cloud do not manage application secrets.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q14 — Azure Key Vault (Exam Level) ──────────────────────────────────
  {
    type: "multi-select",
    question: "Azure Key Vault can store which THREE types of objects? (Select THREE.)",
    difficulty: "Exam Level",
    topic: "Azure Key Vault",
    objective: "3.1",
    options: {
      A: "Secrets (passwords and connection strings)",
      B: "Cryptographic keys",
      C: "SSL/TLS certificates",
      D: "Virtual machine disk images",
      E: "Azure Resource Manager templates"
    },
    answer: ["A", "B", "C"],
    explanation: "Azure Key Vault stores three categories of objects: Secrets (arbitrary text values such as passwords and connection strings), Keys (cryptographic keys for encryption operations), and Certificates (X.509/SSL/TLS certificates). VM disk images are stored in Azure Managed Disks or Storage. ARM templates are stored in Storage or deployed through Azure Resource Manager.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q15 — Microsoft Defender for Cloud (Foundational) ───────────────────
  {
    type: "mcq",
    question: "Which Azure service provides a unified view of an organization's security posture across Azure, AWS, and Google Cloud Platform workloads?",
    difficulty: "Foundational",
    topic: "Microsoft Defender for Cloud",
    objective: "3.2",
    options: {
      A: "Microsoft Sentinel",
      B: "Microsoft Defender for Cloud",
      C: "Microsoft Defender XDR",
      D: "Azure Monitor"
    },
    answer: "B",
    explanation: "Microsoft Defender for Cloud provides Cloud Security Posture Management (CSPM) and Cloud Workload Protection Plans (CWPPs) across Azure, AWS, and GCP — giving a unified multicloud security posture view. Sentinel is a SIEM/SOAR for collecting and analyzing security signals. Defender XDR focuses on endpoint/email/identity/SaaS signals. Azure Monitor is an observability service.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q16 — Microsoft Defender for Cloud (Exam Level) ─────────────────────
  {
    type: "mcq",
    question: "A security architect needs to protect an on-premises SQL Server and an Azure VM running Linux using a single Microsoft security service that also provides regulatory compliance assessments. Which service meets ALL of these requirements?",
    difficulty: "Exam Level",
    topic: "Microsoft Defender for Cloud",
    objective: "3.2",
    options: {
      A: "Microsoft Defender for Endpoint",
      B: "Microsoft Defender for Identity",
      C: "Microsoft Defender for Cloud",
      D: "Microsoft Sentinel"
    },
    answer: "C",
    explanation: "Microsoft Defender for Cloud supports hybrid and multicloud environments — it can protect Azure VMs, on-premises servers, SQL databases, and containers. It also provides regulatory compliance dashboards mapping your posture to frameworks such as CIS, NIST, and PCI DSS. Defender for Endpoint covers device EDR but does not provide compliance assessments for SQL or cloud posture. Defender for Identity protects on-premises AD. Sentinel is a SIEM.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q17 — Microsoft Defender for Cloud (Hard) ───────────────────────────
  {
    type: "mcq",
    question: "Contoso connects its AWS account to Microsoft Defender for Cloud. Which capability of Defender for Cloud applies specifically to the AWS resources?",
    difficulty: "Hard",
    topic: "Microsoft Defender for Cloud",
    objective: "3.2",
    options: {
      A: "Applying NSG rules to AWS EC2 instances",
      B: "Assessing AWS resource configurations against security recommendations and providing a Secure Score",
      C: "Deploying Microsoft Sentinel data connectors into the AWS account",
      D: "Synchronizing AWS IAM roles with Microsoft Entra ID groups"
    },
    answer: "B",
    explanation: "When an AWS account is connected, Defender for Cloud uses the Cloud Security Posture Management (CSPM) capability to assess AWS resource configurations, surface security recommendations, and contribute them to the Secure Score. NSG rules are an Azure-only concept. Sentinel connectors are configured separately in Sentinel, not Defender for Cloud. AWS IAM sync with Entra ID is an identity management task, not a Defender for Cloud function.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q18 — Cloud Security Posture Management (CSPM) (Foundational) ───────
  {
    type: "mcq",
    question: "What does the Secure Score in Microsoft Defender for Cloud represent?",
    difficulty: "Foundational",
    topic: "Cloud Security Posture Management (CSPM)",
    objective: "3.2",
    options: {
      A: "The number of active security alerts across all subscriptions",
      B: "A numerical measure of an organization's overall security posture based on implemented recommendations",
      C: "The percentage of VMs covered by Defender for Endpoint",
      D: "The compliance percentage against a specific regulatory framework"
    },
    answer: "B",
    explanation: "The Secure Score is a numerical value (expressed as a percentage) representing how well the organization's current security configuration aligns with Microsoft's security recommendations. Implementing recommendations increases the score. It is not a count of alerts, not an endpoint coverage metric, and not a compliance framework percentage (though a separate regulatory compliance dashboard exists).",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q19 — Cloud Security Posture Management (CSPM) (Exam Level) ─────────
  {
    type: "mcq",
    question: "Which Defender for Cloud feature maps your Azure resources' configurations to specific controls within frameworks such as CIS, NIST SP 800-53, and PCI DSS?",
    difficulty: "Exam Level",
    topic: "Cloud Security Posture Management (CSPM)",
    objective: "3.2",
    options: {
      A: "Secure Score",
      B: "Regulatory compliance dashboard",
      C: "Cloud workload protection plans",
      D: "Microsoft Defender for DNS"
    },
    answer: "B",
    explanation: "The Regulatory compliance dashboard in Defender for Cloud automatically assesses resource configurations against the controls in selected compliance frameworks and shows passing/failing assessments. Secure Score measures overall posture. Cloud workload protection plans (CWPPs) add threat detection to specific workload types. Microsoft Defender for DNS is a workload protection plan, not a compliance mapping tool.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q20 — Security Policies & Cloud Workload Protection (Foundational) ───
  {
    type: "mcq",
    question: "An organization enables the 'Defender for Servers' plan in Microsoft Defender for Cloud. What additional protection does this provide beyond CSPM recommendations?",
    difficulty: "Foundational",
    topic: "Security Policies & Cloud Workload Protection",
    objective: "3.2",
    options: {
      A: "Automatic deployment of Azure Firewall to protect the servers",
      B: "Threat detection and advanced alerts for suspicious activity on the protected servers",
      C: "Automatic OS patching and vulnerability remediation",
      D: "Network traffic encryption between server VMs"
    },
    answer: "B",
    explanation: "Cloud Workload Protection Plans (CWPPs) such as Defender for Servers add threat detection — generating security alerts when suspicious activity is detected on the servers. CSPM alone only identifies misconfigurations. CWPPs do not deploy Azure Firewall, patch operating systems automatically, or encrypt network traffic.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q21 — Security Policies & Cloud Workload Protection (Exam Level) ─────
  {
    type: "multi-select",
    question: "Which of the following workload types does Microsoft Defender for Cloud offer dedicated Cloud Workload Protection Plans (CWPPs) for? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Security Policies & Cloud Workload Protection",
    objective: "3.2",
    options: {
      A: "Containers",
      B: "Azure Active Directory users",
      C: "Azure SQL databases",
      D: "Microsoft Teams channels",
      E: "Azure DevOps pipelines"
    },
    answer: ["A", "C"],
    explanation: "Microsoft Defender for Cloud provides dedicated CWPPs for Containers (Defender for Containers) and Azure SQL databases (Defender for Azure SQL). Azure AD user protection is handled by Microsoft Entra ID Protection. Teams protection is part of Defender for Office 365. DevOps security has its own Defender for DevOps plan, which is separate from the traditional CWPP lineup.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q22 — SIEM & SOAR Concepts (Foundational) ───────────────────────────
  {
    type: "mcq",
    question: "What is the primary purpose of a Security Information and Event Management (SIEM) solution?",
    difficulty: "Foundational",
    topic: "SIEM & SOAR Concepts",
    objective: "3.3",
    options: {
      A: "To automatically remediate security incidents without human involvement",
      B: "To collect, aggregate, and analyze security log data to detect threats",
      C: "To block network traffic from known malicious IP addresses in real time",
      D: "To manage user identities and enforce multi-factor authentication"
    },
    answer: "B",
    explanation: "A SIEM collects and aggregates security event data from across the environment and uses analytics and correlation to detect potential threats. Automated remediation is the function of SOAR. Real-time IP blocking is done by network controls such as firewalls. Identity management is handled by identity platforms like Microsoft Entra ID.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q23 — SIEM & SOAR Concepts (Exam Level) ─────────────────────────────
  {
    type: "mcq",
    question: "How does Security Orchestration, Automation, and Response (SOAR) complement a SIEM solution?",
    difficulty: "Exam Level",
    topic: "SIEM & SOAR Concepts",
    objective: "3.3",
    options: {
      A: "SOAR stores raw security logs and replaces the need for a SIEM",
      B: "SOAR automates response actions on the alerts and incidents that the SIEM detects",
      C: "SOAR enforces conditional access policies based on SIEM risk scores",
      D: "SOAR replaces the security operations center (SOC) analyst entirely"
    },
    answer: "B",
    explanation: "SOAR automation capabilities act on the detections surfaced by the SIEM — executing playbooks to contain threats, notify stakeholders, or open tickets automatically. SOAR does not store raw logs (that is the SIEM's role). Conditional access is an identity control. SOAR augments analysts rather than replacing them.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q24 — Microsoft Sentinel (Foundational) ─────────────────────────────
  {
    type: "mcq",
    question: "Microsoft Sentinel is described as a cloud-native solution that combines which two capabilities?",
    difficulty: "Foundational",
    topic: "Microsoft Sentinel",
    objective: "3.3",
    options: {
      A: "Identity governance and privileged access management",
      B: "SIEM (Security Information and Event Management) and SOAR (Security Orchestration, Automation, and Response)",
      C: "Cloud Security Posture Management (CSPM) and Cloud Workload Protection",
      D: "Endpoint detection and response (EDR) and mobile device management (MDM)"
    },
    answer: "B",
    explanation: "Microsoft Sentinel is Microsoft's cloud-native SIEM + SOAR solution. It collects data at cloud scale (SIEM), detects threats using analytics, and responds automatically using playbooks (SOAR). CSPM + CWPP describes Defender for Cloud. EDR describes Defender for Endpoint. Identity governance is a Microsoft Entra capability.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q25 — Microsoft Sentinel (Exam Level) — Playbook vs Workbook ────────
  {
    type: "mcq",
    question: "A SOC analyst wants to automatically disable a compromised user account in Microsoft Entra ID whenever Microsoft Sentinel raises a high-severity alert. Which Sentinel component should they configure?",
    difficulty: "Exam Level",
    topic: "Microsoft Sentinel",
    objective: "3.3",
    options: {
      A: "A Sentinel Workbook",
      B: "A Sentinel Analytics rule with a Playbook",
      C: "A Sentinel Data Connector",
      D: "A Sentinel Hunting query"
    },
    answer: "B",
    explanation: "A Sentinel Playbook (built on Azure Logic Apps) is the SOAR automation component — it executes automated response actions such as disabling an account when triggered by an analytics alert. Workbooks are interactive dashboards for visualization. Data connectors ingest data into Sentinel. Hunting queries are used for proactive threat searching, not automated response.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q26 — Microsoft Sentinel (Exam Level) — Workbook vs Playbook ─────────
  {
    type: "mcq",
    question: "A security manager wants a visual dashboard in Microsoft Sentinel showing incident trends, alert volumes by severity, and mean-time-to-respond metrics over the past 30 days. Which Sentinel feature should they use?",
    difficulty: "Exam Level",
    topic: "Microsoft Sentinel",
    objective: "3.3",
    options: {
      A: "Sentinel Playbook",
      B: "Sentinel Workbook",
      C: "Sentinel Hunting query",
      D: "Sentinel Analytics rule"
    },
    answer: "B",
    explanation: "Sentinel Workbooks are the visualization and dashboard component — they display interactive charts and metrics from the data stored in the Sentinel workspace. Playbooks automate responses. Hunting queries proactively search for threats. Analytics rules define detection logic that creates alerts and incidents.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q27 — Microsoft Sentinel (Hard) ─────────────────────────────────────
  {
    type: "mcq",
    question: "Which statement BEST explains the relationship between Microsoft Sentinel and Microsoft Defender XDR?",
    difficulty: "Hard",
    topic: "Microsoft Sentinel",
    objective: "3.3",
    options: {
      A: "Defender XDR replaces Sentinel and provides all SIEM and SOAR capabilities",
      B: "Sentinel ingests signals from Defender XDR as one of many data sources to provide broad enterprise SIEM coverage",
      C: "Sentinel and Defender XDR are identical products sold under different names",
      D: "Defender XDR manages the Sentinel workspace configuration and pricing"
    },
    answer: "B",
    explanation: "Microsoft Defender XDR signals (incidents and alerts from Endpoint, Office 365, Identity, and Cloud Apps) can be ingested into Microsoft Sentinel through a data connector, enriching Sentinel's cross-domain visibility. Sentinel is the broader SIEM covering any data source; Defender XDR is a specialized XDR platform. They are complementary, not redundant.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q28 — Microsoft Sentinel (Hard) ─────────────────────────────────────
  {
    type: "mcq",
    question: "In Microsoft Sentinel, what is the underlying Azure service that powers Playbook automation?",
    difficulty: "Hard",
    topic: "Microsoft Sentinel",
    objective: "3.3",
    options: {
      A: "Azure Functions",
      B: "Azure Logic Apps",
      C: "Azure Automation",
      D: "Azure Event Hubs"
    },
    answer: "B",
    explanation: "Sentinel Playbooks are built on Azure Logic Apps — a low-code workflow automation platform that provides connectors to hundreds of services including Microsoft Entra ID, ServiceNow, and Slack. Azure Functions can run code but is not the engine behind Sentinel Playbooks. Azure Automation handles VM patching tasks. Azure Event Hubs is a data streaming service used for log ingestion.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q29 — Microsoft Defender XDR (Foundational) — disambiguation ─────────
  {
    type: "mcq",
    question: "A security operations team needs a single unified portal that correlates alerts from endpoints, email, identities, and cloud applications into unified incidents. Which Microsoft solution provides this capability?",
    difficulty: "Foundational",
    topic: "Microsoft Defender XDR",
    objective: "3.4",
    options: {
      A: "Microsoft Defender for Cloud",
      B: "Microsoft Sentinel",
      C: "Microsoft Defender XDR",
      D: "Microsoft Entra ID Protection"
    },
    answer: "C",
    explanation: "Microsoft Defender XDR (formerly Microsoft 365 Defender) is the unified extended detection and response platform accessible via the Microsoft Defender portal. It correlates signals across endpoint, email, identity, and cloud app workloads into unified incidents, enabling a full attack-chain view. Defender for Cloud focuses on cloud infrastructure posture. Sentinel is a broader SIEM. Entra ID Protection handles cloud sign-in risk only.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q30 — Microsoft Defender XDR (Exam Level) — disambiguation ──────────
  {
    type: "mcq",
    question: "Which Microsoft Defender XDR capability automatically groups related alerts across multiple workloads into a single incident, reducing alert fatigue for SOC analysts?",
    difficulty: "Exam Level",
    topic: "Microsoft Defender XDR",
    objective: "3.4",
    options: {
      A: "Automatic attack disruption",
      B: "Cross-product incident correlation",
      C: "Threat analytics reports",
      D: "Device compliance policies"
    },
    answer: "B",
    explanation: "Defender XDR's cross-product incident correlation aggregates alerts from Defender for Endpoint, Defender for Office 365, Defender for Identity, and Defender for Cloud Apps into a single incident, providing a unified attack story. Automatic attack disruption takes containment action, but the question specifically asks about grouping alerts. Threat analytics provides intelligence reports. Device compliance is a Microsoft Intune function.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q31 — Microsoft Defender XDR (Hard) — disambiguation ────────────────
  {
    type: "mcq",
    question: "Northwind Traders' SOC observes a complex attack that started with a phishing email, moved laterally to endpoints, and exfiltrated data via a cloud app. Which Microsoft product provides the unified incident view that correlates all three attack stages?",
    difficulty: "Hard",
    topic: "Microsoft Defender XDR",
    objective: "3.4",
    options: {
      A: "Microsoft Defender for Cloud (CSPM plan)",
      B: "Microsoft Defender XDR via the Microsoft Defender portal",
      C: "Microsoft Defender for Identity only",
      D: "Microsoft Entra ID Conditional Access"
    },
    answer: "B",
    explanation: "Microsoft Defender XDR correlates signals from all three stages: the phishing email (Defender for Office 365), lateral movement on endpoints (Defender for Endpoint), and cloud-app exfiltration (Defender for Cloud Apps) into one incident in the Microsoft Defender portal. Defender for Cloud focuses on cloud infrastructure. Defender for Identity focuses on on-prem AD. Conditional Access is a preventive identity control, not a detection platform.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q32 — Defender for Office 365 (Foundational) — disambiguation ────────
  {
    type: "mcq",
    question: "An organization receives frequent phishing emails impersonating its own executive team. Which Microsoft Defender product is MOST appropriate to detect and block these attacks?",
    difficulty: "Foundational",
    topic: "Defender for Office 365",
    objective: "3.4",
    options: {
      A: "Microsoft Defender for Endpoint",
      B: "Microsoft Defender for Identity",
      C: "Microsoft Defender for Office 365",
      D: "Microsoft Defender for Cloud Apps"
    },
    answer: "C",
    explanation: "Defender for Office 365 protects email, Teams, SharePoint, and OneDrive from phishing, malware, and business email compromise. Anti-phishing policies in Defender for Office 365 detect impersonation attacks. Defender for Endpoint secures devices. Defender for Identity protects on-premises Active Directory. Defender for Cloud Apps governs SaaS application usage.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q33 — Defender for Office 365 (Exam Level) ──────────────────────────
  {
    type: "mcq",
    question: "Microsoft Defender for Office 365 Safe Attachments opens email attachments in a virtual environment before delivery. What is this technique called?",
    difficulty: "Exam Level",
    topic: "Defender for Office 365",
    objective: "3.4",
    options: {
      A: "Signature-based detection",
      B: "Detonation / sandboxing",
      C: "SSL/TLS inspection",
      D: "Data Loss Prevention (DLP) scanning"
    },
    answer: "B",
    explanation: "Defender for Office 365 Safe Attachments uses a detonation (sandbox) environment to open and analyze attachments in a controlled virtual environment before delivering them to the recipient. This detects previously unknown malware. Signature-based detection identifies known malware hashes. TLS inspection decrypts encrypted traffic. DLP scanning looks for sensitive data patterns.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q34 — Defender for Office 365 (Hard) ────────────────────────────────
  {
    type: "mcq",
    question: "A link in a received email points to a website that was benign at delivery time but was later compromised. Which Defender for Office 365 feature retroactively protects users who click the link after it becomes malicious?",
    difficulty: "Hard",
    topic: "Defender for Office 365",
    objective: "3.4",
    options: {
      A: "Safe Attachments detonation",
      B: "Safe Links time-of-click protection",
      C: "Anti-spam filtering",
      D: "Zero-hour Auto Purge (ZAP)"
    },
    answer: "B",
    explanation: "Safe Links rewrites URLs and checks them at the time the user clicks, not just at delivery. If the destination has become malicious after delivery, Safe Links blocks access. Safe Attachments inspects file attachments, not URLs. Anti-spam filtering applies at delivery time. ZAP retroactively removes malicious emails from mailboxes but does not block link clicks.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q35 — Defender for Endpoint (Foundational) — disambiguation ──────────
  {
    type: "mcq",
    question: "A company wants to deploy endpoint detection and response (EDR) capabilities to all Windows, macOS, and Linux laptops used by its employees. Which Microsoft product should they deploy?",
    difficulty: "Foundational",
    topic: "Defender for Endpoint",
    objective: "3.4",
    options: {
      A: "Microsoft Defender for Cloud",
      B: "Microsoft Defender for Office 365",
      C: "Microsoft Defender for Endpoint",
      D: "Microsoft Defender for Identity"
    },
    answer: "C",
    explanation: "Microsoft Defender for Endpoint is the EDR platform for devices — Windows, macOS, Linux, iOS, and Android. It provides threat detection, behavioral analytics, and incident response capabilities on endpoint devices. Defender for Cloud secures cloud infrastructure. Defender for Office 365 protects email and collaboration. Defender for Identity protects on-premises Active Directory.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q36 — Defender for Endpoint (Exam Level) — disambiguation ───────────
  {
    type: "mcq",
    question: "Which capability is unique to Microsoft Defender for Endpoint and NOT provided by Microsoft Defender for Office 365?",
    difficulty: "Exam Level",
    topic: "Defender for Endpoint",
    objective: "3.4",
    options: {
      A: "Protection against phishing emails",
      B: "Behavioral-based endpoint detection with the ability to isolate a compromised device",
      C: "Safe attachments analysis for OneDrive files",
      D: "Anti-spam filtering for Exchange Online"
    },
    answer: "B",
    explanation: "Defender for Endpoint provides behavioral-based threat detection on devices and can isolate a compromised device from the network while keeping it connected for investigation — a core EDR capability. Options A, C, and D are capabilities specific to Defender for Office 365, which focuses on email and collaboration protection.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q37 — Defender for Endpoint (Hard) ──────────────────────────────────
  {
    type: "mcq",
    question: "During an active ransomware incident, a SOC analyst wants to immediately stop further spread from an infected Windows laptop without losing connectivity needed for forensic investigation. Which Defender for Endpoint action achieves this?",
    difficulty: "Hard",
    topic: "Defender for Endpoint",
    objective: "3.4",
    options: {
      A: "Trigger a Sentinel Playbook to disable the user account",
      B: "Isolate the device using Defender for Endpoint's device isolation feature",
      C: "Apply an NSG deny-all rule to the subnet containing the laptop",
      D: "Enable Microsoft Entra ID Conditional Access for the affected user"
    },
    answer: "B",
    explanation: "Defender for Endpoint's device isolation feature cuts off the device from all network traffic except the Defender for Endpoint management channel, stopping lateral spread while maintaining the analyst's ability to investigate the device remotely. A Sentinel Playbook disables accounts, not devices. NSG rules apply to Azure VMs, not corporate laptops. Conditional Access controls sign-in, not device network traffic.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q38 — Defender for Cloud Apps (Foundational) — disambiguation ─────────
  {
    type: "mcq",
    question: "An organization is concerned about employees using unauthorized SaaS applications to store company data (shadow IT). Which Microsoft Defender product is designed to discover and govern SaaS application usage?",
    difficulty: "Foundational",
    topic: "Defender for Cloud Apps",
    objective: "3.4",
    options: {
      A: "Microsoft Defender for Endpoint",
      B: "Microsoft Defender for Identity",
      C: "Microsoft Defender for Office 365",
      D: "Microsoft Defender for Cloud Apps"
    },
    answer: "D",
    explanation: "Microsoft Defender for Cloud Apps is a Cloud Access Security Broker (CASB) that discovers shadow IT, assesses the risk of cloud apps, and can enforce policies to sanction or block app usage. Defender for Endpoint protects devices. Defender for Identity protects on-prem AD. Defender for Office 365 protects Microsoft 365 email and collaboration.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q39 — Defender for Cloud Apps (Exam Level) — disambiguation ──────────
  {
    type: "mcq",
    question: "Microsoft Defender for Cloud Apps (formerly Microsoft Cloud App Security) functions primarily as which type of security control?",
    difficulty: "Exam Level",
    topic: "Defender for Cloud Apps",
    objective: "3.4",
    options: {
      A: "Endpoint Detection and Response (EDR)",
      B: "Cloud Access Security Broker (CASB)",
      C: "Security Information and Event Management (SIEM)",
      D: "Web Application Firewall (WAF)"
    },
    answer: "B",
    explanation: "Defender for Cloud Apps is a CASB — it sits between users and cloud services to provide visibility into cloud app usage, enforce data security policies, detect threats, and assess app compliance. EDR is Defender for Endpoint. SIEM is Microsoft Sentinel. WAF protects web applications from OWASP attacks.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q40 — Defender for Cloud Apps (Hard) — CASB pillars ─────────────────
  {
    type: "mcq",
    question: "A compliance officer wants to prevent sensitive financial data from being uploaded to personal Dropbox accounts from managed devices. Which Defender for Cloud Apps capability addresses this requirement?",
    difficulty: "Hard",
    topic: "Defender for Cloud Apps",
    objective: "3.4",
    options: {
      A: "Cloud discovery (shadow IT risk scoring)",
      B: "Session control policies with real-time inline protection",
      C: "Defender for Endpoint device isolation",
      D: "Sentinel analytics rules"
    },
    answer: "B",
    explanation: "Defender for Cloud Apps session controls use Conditional Access App Control to inspect and block specific activities (such as uploads to personal storage) in real time — without blocking the app entirely. Cloud discovery identifies app usage but does not block data transfers. Device isolation is a Defender for Endpoint action. Sentinel analytics rules detect threats but do not enforce inline session policies.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q41 — Defender for Identity (Foundational) — disambiguation ──────────
  {
    type: "mcq",
    question: "An attacker is performing a Pass-the-Hash attack against an on-premises Active Directory domain. Which Microsoft Defender product monitors on-premises AD for such identity-based attacks?",
    difficulty: "Foundational",
    topic: "Defender for Identity",
    objective: "3.4",
    options: {
      A: "Microsoft Entra ID Protection",
      B: "Microsoft Defender for Identity",
      C: "Microsoft Defender for Endpoint",
      D: "Microsoft Defender for Cloud Apps"
    },
    answer: "B",
    explanation: "Microsoft Defender for Identity (formerly Azure Advanced Threat Protection / Azure ATP) monitors on-premises Active Directory domain controllers for identity-based attacks such as Pass-the-Hash, Pass-the-Ticket, Kerberoasting, and lateral movement. Entra ID Protection monitors cloud sign-in risk, not on-premises AD. Defender for Endpoint covers device EDR. Defender for Cloud Apps is a CASB.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q42 — Defender for Identity (Exam Level) — on-prem vs cloud scope ────
  {
    type: "mcq",
    question: "A security engineer must choose between Microsoft Defender for Identity and Microsoft Entra ID Protection. Which statement CORRECTLY describes when to use Defender for Identity?",
    difficulty: "Exam Level",
    topic: "Defender for Identity",
    objective: "3.4",
    options: {
      A: "Use Defender for Identity to detect risky cloud sign-ins from impossible travel locations",
      B: "Use Defender for Identity to protect on-premises Active Directory by monitoring domain controller traffic",
      C: "Use Defender for Identity to block unauthorized SaaS application usage",
      D: "Use Defender for Identity to assess the security posture of Azure virtual machines"
    },
    answer: "B",
    explanation: "Defender for Identity is purpose-built to protect on-premises Active Directory environments. It installs sensors on domain controllers to monitor AD traffic and detects attacks such as lateral movement, credential theft, and domain dominance. Detecting risky cloud sign-ins is Entra ID Protection's role. Blocking SaaS usage is Defender for Cloud Apps. VM posture assessment is Defender for Cloud.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q43 — Defender for Identity (Hard) — hybrid scope nuance ─────────────
  {
    type: "multi-select",
    question: "Contoso has a hybrid identity environment with on-premises AD synced to Microsoft Entra ID. An attacker gains access to on-premises AD and performs reconnaissance using LDAP queries against domain controllers. Which TWO products provide the most relevant detection in this scenario? (Select TWO.)",
    difficulty: "Hard",
    topic: "Defender for Identity",
    objective: "3.4",
    options: {
      A: "Microsoft Defender for Identity",
      B: "Microsoft Entra ID Protection",
      C: "Microsoft Defender for Cloud (CSPM)",
      D: "Microsoft Defender XDR",
      E: "Azure DDoS Protection"
    },
    answer: ["A", "D"],
    explanation: "Defender for Identity monitors on-premises domain controller traffic and would detect LDAP reconnaissance. Microsoft Defender XDR correlates the Defender for Identity alerts with other signals into a unified incident, giving the SOC a complete attack picture. Entra ID Protection monitors cloud sign-in risk, not on-premises AD attacks. Defender for Cloud (CSPM) assesses cloud resource configurations. Azure DDoS Protection handles volumetric network flooding.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q44 — Defender for Identity (Hard) — Entra ID Protection contrast ────
  {
    type: "mcq",
    question: "An organization syncs its on-premises AD with Microsoft Entra ID. A compromised account is used to make suspicious Kerberos ticket requests on-premises AND performs a sign-in from an anonymous proxy in the cloud. Which products would detect EACH threat respectively?",
    difficulty: "Hard",
    topic: "Defender for Identity",
    objective: "3.4",
    options: {
      A: "Defender for Identity detects the Kerberos attack; Entra ID Protection detects the anonymous proxy sign-in",
      B: "Entra ID Protection detects both; Defender for Identity is not needed in a hybrid scenario",
      C: "Defender for Identity detects both on-premises and cloud threats",
      D: "Defender for Cloud detects the Kerberos attack; Defender for Identity detects the anonymous proxy sign-in"
    },
    answer: "A",
    explanation: "Defender for Identity monitors on-premises AD domain controller traffic and is purpose-built to detect Kerberos-based attacks such as Kerberoasting and Golden Ticket. Microsoft Entra ID Protection evaluates the risk of cloud-based sign-ins — including sign-ins from anonymous proxies (Tor nodes) — and assigns a risk level. The two products are complementary in hybrid environments.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q45 — Defender Vulnerability Management & Threat Intelligence (Foundational)
  {
    type: "mcq",
    question: "Microsoft Defender Vulnerability Management continuously discovers and prioritizes vulnerabilities on enrolled devices. What is the primary input that determines prioritization?",
    difficulty: "Foundational",
    topic: "Defender Vulnerability Management & Threat Intelligence",
    objective: "3.4",
    options: {
      A: "The device's geographic location",
      B: "A risk-based score combining vulnerability severity, asset criticality, and active exploitation in the wild",
      C: "The vendor's announced patch release date",
      D: "The number of users logged on to the affected device"
    },
    answer: "B",
    explanation: "Defender Vulnerability Management uses a risk-based approach — combining CVE severity (CVSS), asset value/criticality, and real-world threat intelligence on whether the vulnerability is actively exploited — to prioritize which vulnerabilities to address first. Geographic location, patch release dates, and user count are not the primary prioritization factors.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q46 — Defender Vulnerability Management & Threat Intelligence (Exam Level)
  {
    type: "mcq",
    question: "Microsoft Threat Intelligence provides security teams with context about threat actors and their tactics. Where within the Microsoft Defender ecosystem is this intelligence surfaced natively to help SOC analysts understand active campaigns?",
    difficulty: "Exam Level",
    topic: "Defender Vulnerability Management & Threat Intelligence",
    objective: "3.4",
    options: {
      A: "Azure Cost Management dashboards",
      B: "Threat analytics in the Microsoft Defender portal",
      C: "The Azure Service Health blade",
      D: "Microsoft Purview Audit logs"
    },
    answer: "B",
    explanation: "Threat analytics in the Microsoft Defender portal delivers curated threat intelligence reports authored by Microsoft security researchers, covering active threat actors, campaigns, and vulnerabilities with organizational impact metrics. Azure Cost Management is for billing. Azure Service Health tracks service outages. Purview Audit logs track user and admin activities.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q47 — Microsoft Defender Portal (Foundational) ──────────────────────
  {
    type: "mcq",
    question: "The Microsoft Defender portal (defender.microsoft.com) serves as the unified interface for which set of Microsoft security products?",
    difficulty: "Foundational",
    topic: "Microsoft Defender Portal",
    objective: "3.4",
    options: {
      A: "Azure Cost Management, Azure Monitor, and Azure Advisor",
      B: "Microsoft Defender XDR, Defender for Endpoint, Defender for Office 365, Defender for Identity, and Defender for Cloud Apps",
      C: "Microsoft Entra ID, Microsoft Intune, and Microsoft Purview",
      D: "Microsoft Sentinel, Azure Firewall Manager, and Azure Policy"
    },
    answer: "B",
    explanation: "The Microsoft Defender portal (defender.microsoft.com) is the unified console for the Defender XDR family: Defender for Endpoint, Defender for Office 365, Defender for Identity, Defender for Cloud Apps, and the overall XDR incident view. Azure Monitor/Cost Management tools are in the Azure portal. Entra/Intune/Purview have their own admin centers. Sentinel is at portal.azure.com.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q48 — Microsoft Defender Portal (Exam Level) ────────────────────────
  {
    type: "mcq",
    question: "A SOC analyst opens the Microsoft Defender portal and sees an incident linking a malicious email, three device alerts, and a suspicious cloud-app session under one attack story. What Defender XDR capability created this unified view?",
    difficulty: "Exam Level",
    topic: "Microsoft Defender Portal",
    objective: "3.4",
    options: {
      A: "Azure Sentinel workspace analytics",
      B: "Automatic incident correlation across Defender workloads",
      C: "Manual alert grouping by the SOC analyst",
      D: "Microsoft Purview insider risk management"
    },
    answer: "B",
    explanation: "Defender XDR automatically correlates related alerts from multiple Defender workloads (email from Defender for Office 365, device from Defender for Endpoint, cloud app from Defender for Cloud Apps) into a single incident using AI and behavioral analytics. This reduces investigation time. Sentinel analytics are separate. The portal does not require manual grouping. Purview insider risk management handles insider threats.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q49 — Defender Disambiguation: Chained Yes/No Pair — Pair 1A (Yes) ───
  {
    type: "mcq",
    question: "SCENARIO: Fabrikam's security team discovers that an attacker is using a stolen Kerberos ticket to move laterally between on-premises Windows servers in their Active Directory domain.\n\nProposed solution: Deploy Microsoft Defender for Identity with sensors on the domain controllers.\n\nDoes this solution meet the requirement?",
    difficulty: "Hard",
    topic: "Defender for Identity",
    objective: "3.4",
    options: {
      A: "Yes",
      B: "No"
    },
    answer: "A",
    explanation: "Yes — Microsoft Defender for Identity monitors domain controller traffic and is specifically designed to detect Pass-the-Ticket, Golden Ticket, and other Kerberos-based lateral movement attacks in on-premises Active Directory. Deploying sensors on domain controllers is the correct deployment model.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q50 — Defender Disambiguation: Chained Yes/No Pair — Pair 1B (No) ────
  {
    type: "mcq",
    question: "SCENARIO: Fabrikam's security team discovers that an attacker is using a stolen Kerberos ticket to move laterally between on-premises Windows servers in their Active Directory domain.\n\nProposed solution: Enable Microsoft Entra ID Protection to detect the lateral movement.\n\nDoes this solution meet the requirement?",
    difficulty: "Hard",
    topic: "Defender for Identity",
    objective: "3.4",
    options: {
      A: "Yes",
      B: "No"
    },
    answer: "B",
    explanation: "No — Microsoft Entra ID Protection evaluates risk related to cloud-based sign-in events (such as sign-ins from unfamiliar locations or leaked credentials). It does not monitor on-premises Active Directory domain controller traffic and therefore cannot detect on-premises Kerberos ticket abuse or lateral movement in AD.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q51 — Defender Disambiguation: Chained Yes/No Pair — Pair 2A (Yes) ───
  {
    type: "mcq",
    question: "SCENARIO: Adventure Works needs to discover which unsanctioned cloud applications employees are accessing and block uploads of customer data to those apps.\n\nProposed solution: Deploy Microsoft Defender for Cloud Apps as a CASB with session control policies.\n\nDoes this solution meet the requirement?",
    difficulty: "Hard",
    topic: "Defender for Cloud Apps",
    objective: "3.4",
    options: {
      A: "Yes",
      B: "No"
    },
    answer: "A",
    explanation: "Yes — Defender for Cloud Apps is Microsoft's CASB and provides exactly these capabilities: cloud app discovery (identifying shadow IT) and session control policies that can block specific activities such as uploading sensitive data to unsanctioned applications.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q52 — Defender Disambiguation: Chained Yes/No Pair — Pair 2B (No) ────
  {
    type: "mcq",
    question: "SCENARIO: Adventure Works needs to discover which unsanctioned cloud applications employees are accessing and block uploads of customer data to those apps.\n\nProposed solution: Deploy Microsoft Defender for Endpoint to discover and block access to unsanctioned cloud applications.\n\nDoes this solution meet the requirement?",
    difficulty: "Hard",
    topic: "Defender for Cloud Apps",
    objective: "3.4",
    options: {
      A: "Yes",
      B: "No"
    },
    answer: "B",
    explanation: "No — Microsoft Defender for Endpoint is an EDR platform for devices. While it can feed cloud app discovery data into Defender for Cloud Apps, it cannot independently govern SaaS application access or enforce session-level policies to block data uploads to specific cloud apps. The CASB functions require Defender for Cloud Apps.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q53 — Multi-select: Defender Disambiguation (Hard) ──────────────────
  {
    type: "multi-select",
    question: "A security architect is assigning the correct Microsoft Defender products to protect different workloads. Which TWO statements correctly match a Defender product to its primary workload? (Select TWO.)",
    difficulty: "Hard",
    topic: "Microsoft Defender XDR",
    objective: "3.4",
    options: {
      A: "Defender for Office 365 — protects Exchange Online, SharePoint, and Teams from phishing and malware",
      B: "Defender for Endpoint — monitors on-premises Active Directory domain controllers",
      C: "Defender for Cloud Apps — governs SaaS application access as a Cloud Access Security Broker (CASB)",
      D: "Defender for Identity — provides EDR for Windows and macOS laptops",
      E: "Defender for Cloud — protects email from business email compromise"
    },
    answer: ["A", "C"],
    explanation: "Option A is correct: Defender for Office 365 protects Microsoft 365 collaboration services (Exchange, SharePoint, Teams) from email-based threats. Option C is correct: Defender for Cloud Apps is Microsoft's CASB for SaaS app governance. Option B is wrong — monitoring on-premises AD is Defender for Identity. Option D is wrong — EDR for devices is Defender for Endpoint. Option E is wrong — email protection is Defender for Office 365.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q54 — Multi-select: Azure Infrastructure Security 3.1 (Exam Level) ───
  {
    type: "multi-select",
    question: "A company is deploying a public-facing web application in Azure and wants to implement multiple layers of network security. Which THREE services should they combine to address DDoS attacks, web application exploits, and unauthorized VM access? (Select THREE.)",
    difficulty: "Exam Level",
    topic: "Azure DDoS Protection",
    objective: "3.1",
    options: {
      A: "Azure DDoS Protection",
      B: "Web Application Firewall (WAF)",
      C: "Azure Bastion",
      D: "Microsoft Sentinel",
      E: "Azure Cost Management"
    },
    answer: ["A", "B", "C"],
    explanation: "Azure DDoS Protection mitigates volumetric flood attacks against the public endpoint. WAF on Application Gateway or Front Door blocks web application exploits (SQLi, XSS). Azure Bastion provides secure administrative access to VMs without exposing RDP/SSH ports. Sentinel is a SIEM, not a network control. Azure Cost Management is a financial tool.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q55 — Multi-select: Sentinel capabilities (Exam Level) ──────────────
  {
    type: "multi-select",
    question: "Which TWO of the following actions can Microsoft Sentinel perform WITHOUT requiring human intervention after initial configuration? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Microsoft Sentinel",
    objective: "3.3",
    options: {
      A: "Automatically execute a Playbook to block a malicious IP when an alert fires",
      B: "Manually investigate and close incidents through the Azure portal",
      C: "Automatically create and assign an incident ticket in an external ITSM system via a Playbook",
      D: "Physically replace compromised hardware in a data center",
      E: "Reconfigure NSG rules through Azure Policy"
    },
    answer: ["A", "C"],
    explanation: "Sentinel Playbooks (Azure Logic Apps) can automatically block IPs (A) and create ITSM tickets (C) without human intervention when triggered by alerts. Manual investigation (B) requires analyst input. Physical hardware replacement (D) is outside any software's scope. NSG reconfiguration via Azure Policy (E) is outside Sentinel's direct capability.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q56 — Multi-select: Defender for Cloud capabilities (Exam Level) ─────
  {
    type: "multi-select",
    question: "Which TWO capabilities does Microsoft Defender for Cloud provide that help an organization improve its cloud security posture? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Microsoft Defender for Cloud",
    objective: "3.2",
    options: {
      A: "A Secure Score that quantifies the current security posture",
      B: "EDR protection for end-user laptops running Windows",
      C: "Security recommendations for misconfigured cloud resources",
      D: "Email spam filtering for Microsoft 365 mailboxes",
      E: "Browser-based RDP access to Azure VMs"
    },
    answer: ["A", "C"],
    explanation: "Defender for Cloud provides a Secure Score (A) and actionable security recommendations for misconfigured resources (C) as part of its CSPM capability. EDR for laptops (B) is Defender for Endpoint. Email spam filtering (D) is Defender for Office 365. Browser-based RDP (E) is Azure Bastion.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q57 — Multi-select: Key Vault use cases (Foundational) ──────────────
  {
    type: "multi-select",
    question: "Which TWO use cases are BEST addressed by Azure Key Vault? (Select TWO.)",
    difficulty: "Foundational",
    topic: "Azure Key Vault",
    objective: "3.1",
    options: {
      A: "Storing API keys so they are not hard-coded in application source code",
      B: "Managing SSL/TLS certificates for Azure-hosted web applications",
      C: "Monitoring user sign-in risk and enforcing MFA for risky sign-ins",
      D: "Performing vulnerability scans on Azure virtual machines",
      E: "Detecting lateral movement in on-premises Active Directory"
    },
    answer: ["A", "B"],
    explanation: "Azure Key Vault stores secrets such as API keys (A) and manages SSL/TLS certificates (B), including automatic renewal when integrated with Certificate Authorities. Sign-in risk and MFA enforcement (C) are Microsoft Entra ID capabilities. Vulnerability scanning (D) is a Defender for Cloud / Defender Vulnerability Management function. Lateral movement detection in AD (E) is Defender for Identity.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q58 — Multi-select: NSG vs Azure Firewall (Hard) ────────────────────
  {
    type: "multi-select",
    question: "When comparing Network Security Groups (NSGs) and Azure Firewall, which TWO statements are correct? (Select TWO.)",
    difficulty: "Hard",
    topic: "Azure Firewall",
    objective: "3.1",
    options: {
      A: "NSGs are stateless and operate at Layer 3/4 using IP, port, and protocol rules",
      B: "Azure Firewall is stateful and supports FQDN filtering and threat-intelligence-based filtering",
      C: "NSGs can filter traffic based on fully qualified domain names (FQDNs)",
      D: "Azure Firewall is a free feature included with every Azure subscription",
      E: "Both NSGs and Azure Firewall provide identical Layer 7 inspection capabilities"
    },
    answer: ["A", "B"],
    explanation: "NSGs are stateless (they evaluate each packet independently) and work at Layer 3/4 using IP/port/protocol — this is option A. Azure Firewall is a stateful managed firewall with Layer 7 capabilities including FQDN filtering and threat-intelligence-based blocking — this is option B. NSGs cannot filter by FQDN (C is false). Azure Firewall is a paid service (D is false). They do not have identical capabilities (E is false).",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q59 — Multi-select: Defender XDR workloads (Hard) ───────────────────
  {
    type: "multi-select",
    question: "Microsoft Defender XDR correlates signals across multiple Defender products into unified incidents. Which THREE Defender products feed signals into Defender XDR? (Select THREE.)",
    difficulty: "Hard",
    topic: "Microsoft Defender XDR",
    objective: "3.4",
    options: {
      A: "Microsoft Defender for Endpoint",
      B: "Microsoft Defender for Office 365",
      C: "Azure DDoS Protection",
      D: "Microsoft Defender for Identity",
      E: "Azure Key Vault"
    },
    answer: ["A", "B", "D"],
    explanation: "Defender XDR ingests signals from Defender for Endpoint (device alerts), Defender for Office 365 (email/collaboration alerts), and Defender for Identity (on-premises AD alerts). Azure DDoS Protection (C) is a network-layer service that does not feed into Defender XDR incidents. Azure Key Vault (E) is a secrets management service with no XDR integration.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q60 — Multi-select: CSPM vs CWPP (Hard) ─────────────────────────────
  {
    type: "multi-select",
    question: "Microsoft Defender for Cloud operates in two modes. Which TWO statements correctly describe the difference between CSPM and Cloud Workload Protection Plans (CWPPs)? (Select TWO.)",
    difficulty: "Hard",
    topic: "Cloud Security Posture Management (CSPM)",
    objective: "3.2",
    options: {
      A: "CSPM identifies misconfigurations and provides security recommendations to improve posture",
      B: "CWPPs add workload-specific threat detection and generate security alerts",
      C: "CSPM actively blocks network attacks against virtual machines",
      D: "CWPPs replace Azure Firewall for network-level protection",
      E: "CSPM and CWPPs are identical — they provide the same features"
    },
    answer: ["A", "B"],
    explanation: "CSPM (A) continuously assesses resource configurations against security baselines and provides prioritized recommendations to close gaps. CWPPs (B) add active threat detection for specific workload types (servers, containers, SQL, etc.) and generate alerts when suspicious activity is detected. CSPM does not block network attacks (C). CWPPs do not replace Azure Firewall (D). They serve distinct purposes (E is false).",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q61 — Multi-select: Sentinel data sources (Exam Level) ──────────────
  {
    type: "multi-select",
    question: "Microsoft Sentinel can ingest data from which TWO source types using built-in data connectors? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Microsoft Sentinel",
    objective: "3.3",
    options: {
      A: "Microsoft Entra ID sign-in and audit logs",
      B: "Third-party firewalls via Syslog/CEF",
      C: "Physical access control badge swipe events from a building security system with no connector",
      D: "Azure Managed Disk snapshots",
      E: "Azure Blob Storage file content"
    },
    answer: ["A", "B"],
    explanation: "Sentinel has built-in connectors for Microsoft Entra ID logs (A) and supports Syslog/CEF-format logs from third-party firewalls and appliances (B). Physical badge swipe events (C) have no native connector — custom ingestion would be needed. Azure Managed Disk snapshots (D) and Blob Storage content (E) are not security log sources ingested by Sentinel.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q62 — Multi-select: Azure 3.1 defense in depth layers (Exam Level) ───
  {
    type: "multi-select",
    question: "Which TWO Azure services specifically address the 'network perimeter' layer in Azure's defense-in-depth model? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Azure Firewall",
    objective: "3.1",
    options: {
      A: "Azure Firewall",
      B: "Azure DDoS Protection",
      C: "Azure Key Vault",
      D: "Microsoft Defender for Identity",
      E: "Microsoft Purview"
    },
    answer: ["A", "B"],
    explanation: "Azure Firewall provides stateful network perimeter control, filtering traffic at the network boundary. Azure DDoS Protection protects the network perimeter from volumetric flood attacks. Azure Key Vault operates at the data layer (protecting secrets). Defender for Identity operates at the identity layer. Purview operates at the compliance/data layer.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q63 — Defender for Identity scope nuance (Hard) ─────────────────────
  {
    type: "mcq",
    question: "Defender for Identity sensors are installed on which infrastructure component to monitor an organization's on-premises identity environment?",
    difficulty: "Hard",
    topic: "Defender for Identity",
    objective: "3.4",
    options: {
      A: "Azure virtual network gateways",
      B: "On-premises Active Directory domain controllers and AD FS servers",
      C: "Microsoft Exchange Online mail transport rules",
      D: "Microsoft Entra ID tenant sign-in endpoints"
    },
    answer: "B",
    explanation: "Defender for Identity installs lightweight sensors directly on on-premises AD domain controllers (and optionally AD FS servers). The sensors capture domain controller traffic and event logs to detect identity attacks without requiring port mirroring in most configurations. It does not operate at Azure VPN gateways, Exchange Online, or Entra ID endpoints — those are cloud services outside the on-prem AD boundary.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q64 — Defender for Identity scope nuance (Hard) ─────────────────────
  {
    type: "mcq",
    question: "After deploying Defender for Identity in a hybrid environment, an organization notices alerts about suspicious lateral movement activity in the Microsoft Defender portal. What does this indicate about the Defender portal's role?",
    difficulty: "Hard",
    topic: "Defender for Identity",
    objective: "3.4",
    options: {
      A: "The Defender portal is replacing the on-premises domain controller security logs",
      B: "Defender for Identity alerts are surfaced in the Microsoft Defender portal as part of Defender XDR's unified incident view",
      C: "The Defender portal is running the Defender for Identity sensors inside Azure",
      D: "Defender for Identity is using Microsoft Entra ID sign-in data to detect lateral movement"
    },
    answer: "B",
    explanation: "Defender for Identity integrates with the Microsoft Defender XDR platform, surfacing its on-premises AD alerts in the Microsoft Defender portal alongside alerts from Defender for Endpoint, Office 365, and Cloud Apps. This enables correlated incidents across the full attack chain. The portal does not replace domain controller logs, does not host the sensors, and does not use Entra ID sign-in data for on-prem lateral movement detection.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q65 — Azure Firewall vs NSG scenario (Hard) ─────────────────────────
  {
    type: "mcq",
    question: "An organization needs to centrally enforce an outbound rule that prevents ALL virtual machines across three Azure virtual networks from communicating with any domain in the '.xyz' top-level domain. Which approach is MOST appropriate?",
    difficulty: "Hard",
    topic: "Azure Firewall",
    objective: "3.1",
    options: {
      A: "Create an NSG rule denying outbound traffic on port 80 and 443 on each VM's NIC",
      B: "Create an Azure Firewall application rule that denies FQDNs matching '*.xyz' and route all VNet traffic through Azure Firewall",
      C: "Enable Azure DDoS Protection Standard on all three VNets",
      D: "Use Azure Key Vault access policies to block requests to .xyz domains"
    },
    answer: "B",
    explanation: "Azure Firewall application rules support FQDN pattern matching (including wildcards like *.xyz), providing centralized enforcement across multiple VNets when traffic is routed through the firewall hub. NSG rules cannot filter by domain name. DDoS Protection handles volumetric attacks, not URL/FQDN filtering. Key Vault manages secrets and cannot block outbound application traffic.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q66 — WAF vs Azure Firewall (Hard) ──────────────────────────────────
  {
    type: "mcq",
    question: "A web application hosted behind Azure Application Gateway is being targeted by a SQL injection campaign. The security team wants to block the attacks automatically using OWASP Core Rule Set protections. Which service should they enable on the Application Gateway?",
    difficulty: "Hard",
    topic: "Web Application Firewall (WAF)",
    objective: "3.1",
    options: {
      A: "Azure DDoS Protection on the Application Gateway's public IP",
      B: "Web Application Firewall (WAF) on the Application Gateway",
      C: "Azure Firewall Premium with TLS inspection",
      D: "Network Security Group rule blocking source IPs"
    },
    answer: "B",
    explanation: "WAF on Azure Application Gateway uses the OWASP Core Rule Set (CRS) to detect and block web application attacks including SQL injection. Azure DDoS Protection handles volumetric flooding, not Layer 7 exploit patterns. Azure Firewall Premium with TLS inspection can inspect encrypted traffic but WAF is the purpose-built solution for OWASP rule enforcement on a web application. NSG rules block by IP/port and cannot detect SQL injection payloads.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q67 — Sentinel Playbook automation use case (Hard) ───────────────────
  {
    type: "mcq",
    question: "A Microsoft Sentinel analytics rule generates a high-severity incident whenever a user account signs in from more than three countries within one hour. The security team wants to automatically suspend the user account in Microsoft Entra ID as soon as the incident is created. What is the CORRECT configuration?",
    difficulty: "Hard",
    topic: "Microsoft Sentinel",
    objective: "3.3",
    options: {
      A: "Configure a Sentinel Workbook to display the incident and notify the analyst",
      B: "Attach a Sentinel Playbook (Logic App) to the analytics rule to call the Microsoft Entra ID 'disable user' action",
      C: "Enable a Defender for Identity sensor on the Entra ID tenant",
      D: "Create a Defender for Cloud policy initiative that disables users on sign-in anomalies"
    },
    answer: "B",
    explanation: "A Sentinel Playbook (built on Azure Logic Apps) is the SOAR mechanism for automated response. Attaching a Playbook to an analytics rule triggers the Playbook automatically when an incident is created — the Playbook can then call the Microsoft Entra ID API to disable the user account. Workbooks are dashboards, not automation. Defender for Identity sensors monitor on-prem AD, not cloud-side response. Defender for Cloud policy initiatives address resource configurations, not user account actions.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q68 — CSPM Secure Score scenario (Exam Level) ────────────────────────
  {
    type: "mcq",
    question: "Contoso's Defender for Cloud Secure Score drops from 78% to 62% overnight. Which action is MOST likely to raise the Secure Score?",
    difficulty: "Exam Level",
    topic: "Cloud Security Posture Management (CSPM)",
    objective: "3.2",
    options: {
      A: "Purchasing a higher-tier Azure support plan",
      B: "Reviewing and remediating the new security recommendations surfaced in Defender for Cloud",
      C: "Enabling Azure Monitor alerts for all VMs",
      D: "Increasing the size of all Azure virtual machines"
    },
    answer: "B",
    explanation: "The Secure Score decreases when resources fail security recommendations. Remediating those recommendations (enabling encryption, applying least-privilege access, patching vulnerabilities, etc.) increases the score. Purchasing a support plan, enabling Azure Monitor, or resizing VMs do not affect the Secure Score.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q69 — VNet Segmentation + NSG layering (Exam Level) ─────────────────
  {
    type: "mcq",
    question: "A three-tier web application runs in Azure with web, application, and database tiers. The security team wants to ensure the database tier is ONLY reachable from the application tier, not from the web tier or the internet. Which combination BEST achieves this?",
    difficulty: "Exam Level",
    topic: "Network Security Groups (NSGs)",
    objective: "3.1",
    options: {
      A: "Place all three tiers in separate VNets with no peering",
      B: "Use separate subnets for each tier and apply an NSG on the database subnet that allows inbound traffic only from the application subnet's IP range",
      C: "Enable Azure DDoS Protection on the database subnet",
      D: "Configure Azure Bastion to restrict database connections"
    },
    answer: "B",
    explanation: "Subnet segmentation combined with NSG rules is the standard pattern for tier isolation. The database subnet's NSG inbound rule permits traffic only from the application subnet's address range and denies everything else. Separate VNets with no peering (A) would prevent all inter-tier communication, breaking the application. DDoS Protection (C) handles external flood attacks, not internal tier access control. Azure Bastion (D) provides admin RDP/SSH access, not application-tier traffic control.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q70 — Defender for Cloud Apps vs Defender for Office 365 (Hard) ──────
  {
    type: "mcq",
    question: "A user at Fabrikam is uploading confidential files to a personal Google Drive account from their corporate laptop. Which product should the security team use to detect and block this behavior without blocking all Google services?",
    difficulty: "Hard",
    topic: "Defender for Cloud Apps",
    objective: "3.4",
    options: {
      A: "Microsoft Defender for Office 365 — add Google Drive to the blocked sender list",
      B: "Microsoft Defender for Cloud Apps — create a session policy to block uploads to personal Google Drive",
      C: "Azure Firewall — create an application rule denying drive.google.com",
      D: "Microsoft Defender for Endpoint — enable network protection to block Google Drive"
    },
    answer: "B",
    explanation: "Defender for Cloud Apps session policies use Conditional Access App Control to granularly control activities within an app — for example, blocking file uploads to a personal Google Drive instance while allowing corporate Google Workspace usage. Defender for Office 365 handles Microsoft 365 email threats, not Google Drive. Azure Firewall would block the entire domain indiscriminately. Defender for Endpoint network protection blocks categories of sites, not specific in-app activities.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q71 — Azure Key Vault + managed identity (Hard) ─────────────────────
  {
    type: "mcq",
    question: "A developer wants an Azure App Service to retrieve a database connection string from Azure Key Vault without storing any credentials in the application's configuration files. Which identity mechanism enables this secure access pattern?",
    difficulty: "Hard",
    topic: "Azure Key Vault",
    objective: "3.1",
    options: {
      A: "A shared access signature (SAS) token stored in the app's environment variables",
      B: "A managed identity assigned to the App Service, granted Key Vault Secrets User role",
      C: "A service principal with a client secret hard-coded in appsettings.json",
      D: "An NSG rule allowing the App Service's IP to access Key Vault's management endpoint"
    },
    answer: "B",
    explanation: "A managed identity (system-assigned or user-assigned) allows the App Service to authenticate to Azure Key Vault using its Azure AD identity — no credentials to manage or store. Granting the managed identity the Key Vault Secrets User (or legacy 'Get' secret permission) enables it to retrieve secrets. SAS tokens are for Azure Storage. Hard-coded service principal secrets are the anti-pattern Key Vault is designed to replace. NSG rules control network access but do not provide identity-based authorization.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q72 — Defender for Cloud multicloud (Hard) ───────────────────────────
  {
    type: "mcq",
    question: "An organization runs workloads in Azure, AWS, and GCP. They want a single security solution that assesses posture, provides a unified Secure Score, and offers threat detection for cloud servers across all three cloud providers. Which Microsoft service meets this requirement?",
    difficulty: "Hard",
    topic: "Microsoft Defender for Cloud",
    objective: "3.2",
    options: {
      A: "Microsoft Defender XDR",
      B: "Microsoft Sentinel with three separate workspace connectors",
      C: "Microsoft Defender for Cloud with multicloud connectors",
      D: "Azure Monitor with cross-cloud Log Analytics agents"
    },
    answer: "C",
    explanation: "Microsoft Defender for Cloud natively supports multicloud environments through connectors for AWS and GCP, providing unified CSPM (including a combined Secure Score) and CWPP threat detection across all three cloud providers. Defender XDR focuses on endpoint/email/identity/SaaS. Sentinel is a SIEM that collects logs but does not provide CSPM recommendations or a Secure Score. Azure Monitor collects metrics and logs but is not a security posture management tool.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q73 — Defender for Office 365 vs Defender for Cloud Apps (Hard) ──────
  {
    type: "mcq",
    question: "A security analyst needs to investigate whether a phishing email was delivered to a group of users in Microsoft 365 and, separately, whether those same users have been accessing risky third-party OAuth apps. Which products should they use for EACH investigation respectively?",
    difficulty: "Hard",
    topic: "Defender for Office 365",
    objective: "3.4",
    options: {
      A: "Defender for Identity for both investigations",
      B: "Defender for Office 365 for the phishing email investigation; Defender for Cloud Apps for the OAuth app investigation",
      C: "Defender for Cloud for both investigations",
      D: "Microsoft Sentinel for the phishing investigation; Azure Key Vault for the OAuth investigation"
    },
    answer: "B",
    explanation: "Defender for Office 365 provides Threat Explorer and email delivery reports to investigate phishing email campaigns and affected recipients. Defender for Cloud Apps provides OAuth app visibility — it can enumerate which third-party OAuth apps users have granted permissions to and flag risky apps. These are distinct tools for distinct workloads. Defender for Identity covers on-premises AD. Defender for Cloud focuses on cloud infrastructure. Sentinel is a SIEM (can aggregate both signals but is not the primary investigation tool for each). Key Vault is unrelated.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q74 — Defender Vulnerability Management scenario (Hard) ──────────────
  {
    type: "mcq",
    question: "A CISO wants to understand which unpatched vulnerabilities on company devices are most likely to be exploited by current threat actors in active campaigns. Which Microsoft capability provides this contextualized, prioritized view?",
    difficulty: "Hard",
    topic: "Defender Vulnerability Management & Threat Intelligence",
    objective: "3.4",
    options: {
      A: "Microsoft Sentinel Workbook showing all CVEs in the environment",
      B: "Defender Vulnerability Management's risk-based prioritization with threat context from Microsoft Threat Intelligence",
      C: "Defender for Cloud's Secure Score recommendations",
      D: "Azure Advisor security recommendations"
    },
    answer: "B",
    explanation: "Defender Vulnerability Management combines CVE severity data with real-world threat intelligence — including whether a vulnerability has a known exploit kit or is under active exploitation — to prioritize remediation efforts. A Sentinel Workbook shows data but does not prioritize by threat context. Defender for Cloud's Secure Score covers cloud resource configurations, not device-level CVEs. Azure Advisor provides general best-practice recommendations.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  // ─── Q75 — Comprehensive Defender disambiguation (Hard) ───────────────────
  {
    type: "mcq",
    question: "Match the attack scenario to the MOST appropriate Microsoft Defender product: An attacker steals valid credentials and uses them to sign in to Microsoft Teams, exfiltrate files from SharePoint, and send malicious links to internal colleagues. Which Defender product is the PRIMARY detection tool for this Microsoft 365-focused attack?",
    difficulty: "Hard",
    topic: "Defender for Office 365",
    objective: "3.4",
    options: {
      A: "Microsoft Defender for Identity",
      B: "Microsoft Defender for Endpoint",
      C: "Microsoft Defender for Office 365",
      D: "Microsoft Defender for Cloud"
    },
    answer: "C",
    explanation: "The attack involves Teams, SharePoint, and internal email/link distribution — all Microsoft 365 collaboration workloads protected by Defender for Office 365. Defender for Office 365 detects malicious links (Safe Links), suspicious file access in SharePoint (Safe Attachments for SharePoint), and anomalous Teams activity. Defender for Identity covers on-premises AD attacks. Defender for Endpoint covers device-level threats. Defender for Cloud covers cloud infrastructure posture.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },


  // ── 1. Service Trust Portal ────────────────────────────────────────────────
  {
    type: "mcq",
    question: "A compliance officer needs to download Microsoft's SOC 2 Type II audit report to share with an external auditor. Which resource provides this?",
    difficulty: "Foundational",
    topic: "Service Trust Portal",
    objective: "4.1",
    options: {
      A: "Microsoft Defender for Cloud",
      B: "Service Trust Portal",
      C: "Compliance Manager",
      D: "Microsoft Purview Portal"
    },
    answer: "B",
    explanation: "The Service Trust Portal (STP) at servicetrust.microsoft.com is the single location where Microsoft publishes its third-party audit reports (SOC 1, SOC 2, ISO 27001, FedRAMP, etc.) along with whitepapers and compliance guides. Compliance Manager holds your organisation's own compliance score and improvement actions, not Microsoft's audit evidence.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "Which statement BEST describes the Service Trust Portal?",
    difficulty: "Exam Level",
    topic: "Service Trust Portal",
    objective: "4.1",
    options: {
      A: "It calculates your organisation's compliance score against regulatory frameworks.",
      B: "It is a library of Microsoft's own audit reports, compliance guides, and trust documents.",
      C: "It monitors sensitive data movement across Microsoft 365 services.",
      D: "It provides a dashboard for configuring data loss prevention policies."
    },
    answer: "B",
    explanation: "The Service Trust Portal is a public-facing repository of Microsoft-produced compliance documentation — not a tool for assessing your own environment. Your organisation's compliance posture and score live in Compliance Manager inside the Microsoft Purview portal.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "A security analyst signs in to the Service Trust Portal and selects 'Audit Reports'. What will the analyst find there?",
    difficulty: "Exam Level",
    topic: "Service Trust Portal",
    objective: "4.1",
    options: {
      A: "The analyst's own organisation's improvement actions for GDPR.",
      B: "Third-party audit reports produced by external auditors attesting to Microsoft cloud service compliance.",
      C: "A real-time feed of tenant security alerts from Microsoft Defender.",
      D: "Configuration options for Microsoft Priva subject rights requests."
    },
    answer: "B",
    explanation: "The Audit Reports section of the STP hosts reports from independent third-party auditors that verify Microsoft's controls for standards such as SOC, ISO/IEC 27001, HIPAA/HITECH, FedRAMP, and GDPR. These are Microsoft's attestation documents, not the tenant's own data.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 2. Microsoft Privacy Principles ───────────────────────────────────────
  {
    type: "mcq",
    question: "An executive wants to understand Microsoft's commitment to transparency and user control over personal data. Which resource should they consult?",
    difficulty: "Foundational",
    topic: "Microsoft Privacy Principles",
    objective: "4.1",
    options: {
      A: "Compliance Manager",
      B: "Microsoft Priva",
      C: "Microsoft Trust Center",
      D: "Data Classification dashboard"
    },
    answer: "C",
    explanation: "The Microsoft Trust Center (microsoft.com/trustcenter) publishes Microsoft's privacy principles: control, transparency, security, strong legal protections, no content-based targeting, and customer benefit. It is the place to read about Microsoft's commitment to privacy and data stewardship, not a configuration tool.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "Microsoft's six privacy principles include all of the following EXCEPT:",
    difficulty: "Exam Level",
    topic: "Microsoft Privacy Principles",
    objective: "4.1",
    options: {
      A: "Control — customers own their data.",
      B: "Transparency — Microsoft tells customers what data it collects and why.",
      C: "Monetisation — Microsoft may sell anonymised customer data to third parties.",
      D: "Strong legal protections — Microsoft defends customer data against government access."
    },
    answer: "C",
    explanation: "Microsoft's published privacy principles are: Control, Transparency, Security, Strong legal protections, No content-based targeting, and Benefits to customers. Microsoft does NOT sell customer data or use it for advertising targeting — monetisation of customer data is explicitly contrary to these principles.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 3. Microsoft Priva ─────────────────────────────────────────────────────
  {
    type: "mcq",
    question: "Your organisation receives a data subject request (DSR) from an EU citizen asking you to delete their personal data stored across Microsoft 365. Which solution is designed to manage this process?",
    difficulty: "Exam Level",
    topic: "Microsoft Priva",
    objective: "4.1",
    options: {
      A: "Microsoft Purview Compliance Manager",
      B: "Microsoft Priva Subject Rights Requests",
      C: "Microsoft Purview eDiscovery (Standard)",
      D: "Insider Risk Management"
    },
    answer: "B",
    explanation: "Microsoft Priva Subject Rights Requests automates the discovery, review, and fulfilment of data subject requests (access, deletion, export, correction) under GDPR and similar privacy laws. eDiscovery is a legal hold/litigation tool, not a privacy-rights workflow tool.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "Microsoft Priva Privacy Risk Management identifies which of the following?",
    difficulty: "Exam Level",
    topic: "Microsoft Priva",
    objective: "4.1",
    options: {
      A: "Malware infections on endpoint devices.",
      B: "Risks such as personal data overexposure, data transfers, and personal data minimisation issues within Microsoft 365.",
      C: "Unauthorised access to Azure virtual machines.",
      D: "Phishing emails targeting employees."
    },
    answer: "B",
    explanation: "Microsoft Priva Privacy Risk Management surfaces privacy risks in your Microsoft 365 data estate — such as data overexposure (personal data visible to too many users), personal data transfers out of approved regions, and data minimisation problems (keeping more data than needed). It does not address endpoint malware or email threats.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "multi-select",
    question: "Which two capabilities are included in Microsoft Priva? (Select TWO.)",
    difficulty: "Hard",
    topic: "Microsoft Priva",
    objective: "4.1",
    options: {
      A: "Privacy Risk Management",
      B: "Subject Rights Requests",
      C: "Compliance Score calculation",
      D: "Data Loss Prevention policy authoring",
      E: "Sensitivity label publishing"
    },
    answer: ["A", "B"],
    explanation: "Microsoft Priva has two main pillars: (1) Privacy Risk Management — identifies and remediates privacy risks in M365 data; (2) Subject Rights Requests — manages GDPR/CCPA data subject access, deletion, and export requests. Compliance Score is part of Compliance Manager; DLP policies and sensitivity labels are part of Microsoft Purview Information Protection.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 4. Microsoft Purview Portal ───────────────────────────────────────────
  {
    type: "mcq",
    question: "A data governance administrator needs a single portal to manage data classification, retention policies, DLP, and eDiscovery for a Microsoft 365 tenant. Which portal should they use?",
    difficulty: "Foundational",
    topic: "Microsoft Purview Portal",
    objective: "4.2",
    options: {
      A: "Microsoft Defender portal (security.microsoft.com)",
      B: "Azure portal (portal.azure.com)",
      C: "Microsoft Purview portal (purview.microsoft.com)",
      D: "Service Trust Portal (servicetrust.microsoft.com)"
    },
    answer: "C",
    explanation: "The Microsoft Purview portal (purview.microsoft.com) — formerly the Microsoft 365 Compliance Center — is the unified hub for all compliance, data governance, and information protection capabilities including Data Classification, Sensitivity Labels, DLP, Retention, eDiscovery, Insider Risk Management, Audit, and Compliance Manager.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "Which of the following is NOT a solution found within the Microsoft Purview portal?",
    difficulty: "Exam Level",
    topic: "Microsoft Purview Portal",
    objective: "4.2",
    options: {
      A: "Insider Risk Management",
      B: "eDiscovery",
      C: "Microsoft Sentinel SIEM workspace",
      D: "Records Management"
    },
    answer: "C",
    explanation: "Microsoft Sentinel is a cloud-native SIEM/SOAR managed in the Azure portal or the Microsoft Defender portal, not in the Microsoft Purview portal. Insider Risk Management, eDiscovery, and Records Management are all compliance solutions housed within the Purview portal.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 5. Compliance Manager & Compliance Score ──────────────────────────────
  {
    type: "mcq",
    question: "A compliance team wants to measure how well their organisation meets the requirements of ISO 27001 and see recommended actions to close gaps. Which tool provides this?",
    difficulty: "Foundational",
    topic: "Compliance Manager & Compliance Score",
    objective: "4.2",
    options: {
      A: "Service Trust Portal",
      B: "Microsoft Compliance Manager",
      C: "Activity Explorer",
      D: "Microsoft Defender for Cloud Apps"
    },
    answer: "B",
    explanation: "Compliance Manager (inside the Purview portal) assesses your organisation's compliance against regulatory frameworks such as ISO 27001, GDPR, NIST, and HIPAA. It generates a Compliance Score — a percentage reflecting how many recommended improvement actions have been completed — and tracks both Microsoft-managed and customer-managed controls.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "What does the Compliance Score in Microsoft Compliance Manager represent?",
    difficulty: "Exam Level",
    topic: "Compliance Manager & Compliance Score",
    objective: "4.2",
    options: {
      A: "A risk score calculated from security alerts in Microsoft Defender.",
      B: "A measure of how completely your organisation has implemented compliance improvement actions across selected regulatory frameworks.",
      C: "The percentage of Microsoft's own controls that have passed third-party audit.",
      D: "The number of sensitive data items detected by Data Classification."
    },
    answer: "B",
    explanation: "The Compliance Score is a point-based measure of progress implementing improvement actions in Compliance Manager. Higher scores indicate more controls are in place. It is tenant-specific and reflects both Microsoft-managed actions (which Microsoft handles on its side) and customer-managed actions (which your team must implement). It does NOT reflect Microsoft's internal audit results — those live on the Service Trust Portal.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "Which statement about improvement actions in Compliance Manager is correct?",
    difficulty: "Hard",
    topic: "Compliance Manager & Compliance Score",
    objective: "4.2",
    options: {
      A: "All improvement actions are automatically completed by Microsoft without customer involvement.",
      B: "Some improvement actions are completed by Microsoft (Microsoft-managed controls), while others must be implemented by the customer.",
      C: "Improvement actions apply only to Azure workloads and not to Microsoft 365.",
      D: "Completing improvement actions requires purchasing a separate Compliance Manager add-on licence."
    },
    answer: "B",
    explanation: "Compliance Manager uses a shared responsibility model. Microsoft-managed controls are actions Microsoft has already taken (e.g., physical datacentre security) and their points are automatically credited. Customer-managed controls are actions the tenant must implement themselves (e.g., configuring MFA or DLP policies), and points are awarded when the customer completes them.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 6. Data Classification ─────────────────────────────────────────────────
  {
    type: "mcq",
    question: "Which Microsoft Purview capability allows administrators to discover what types of sensitive information exist across Exchange, SharePoint, and OneDrive BEFORE creating policies?",
    difficulty: "Foundational",
    topic: "Data Classification",
    objective: "4.3",
    options: {
      A: "Retention Policies",
      B: "Data Classification (sensitive information types and trainable classifiers)",
      C: "Insider Risk Management",
      D: "eDiscovery"
    },
    answer: "B",
    explanation: "Data Classification in Microsoft Purview lets administrators scan for and identify sensitive content using built-in sensitive information types (e.g., credit card numbers, SSNs), exact data match, and trainable classifiers. This discovery step precedes policy creation — you must understand what data you have before deciding how to protect it.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "A trainable classifier in Microsoft Purview is best described as:",
    difficulty: "Exam Level",
    topic: "Data Classification",
    objective: "4.3",
    options: {
      A: "A regex pattern that matches specific text strings such as credit card numbers.",
      B: "A machine-learning model trained on samples of content to recognise a category of documents such as 'resumes' or 'contracts'.",
      C: "A keyword list imported from an external CSV file.",
      D: "A fingerprint of a specific document template used for exact document matching."
    },
    answer: "B",
    explanation: "Trainable classifiers use machine learning. You provide positive and negative content samples, and the classifier learns to identify that content category across your data estate. This is distinct from sensitive information types (regex/keyword/evidence-based patterns) and exact data match (hash-based fingerprinting of structured data).",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "multi-select",
    question: "Which two of the following are methods Microsoft Purview Data Classification uses to identify sensitive content? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Data Classification",
    objective: "4.3",
    options: {
      A: "Sensitive information types (regex/keyword/checksum patterns for data such as credit card numbers)",
      B: "Trainable classifiers (machine-learning models for document categories such as contracts or resumes)",
      C: "Network packet inspection of outbound traffic",
      D: "Azure Policy compliance rules",
      E: "Service principal role assignments"
    },
    answer: ["A", "B"],
    explanation: "Microsoft Purview Data Classification identifies sensitive content using: (1) Sensitive information types — rule-based patterns combining regex, keywords, and checksums to detect regulated data like SSNs or credit card numbers; (2) Trainable classifiers — ML models trained on content samples to recognise document categories. Exact data match (EDM) is a third method (hash-based). Network packet inspection, Azure Policy, and role assignments are unrelated to content classification.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 7. Content & Activity Explorer ───────────────────────────────────────
  {
    type: "mcq",
    question: "A compliance administrator wants to see all files across SharePoint and OneDrive that have been automatically labelled as 'Highly Confidential'. Which tool provides this view?",
    difficulty: "Exam Level",
    topic: "Content & Activity Explorer",
    objective: "4.3",
    options: {
      A: "Activity Explorer",
      B: "Content Explorer",
      C: "Compliance Manager",
      D: "Audit log search"
    },
    answer: "B",
    explanation: "Content Explorer (within Data Classification in the Purview portal) provides an inventory of all labelled and sensitive content across Microsoft 365 locations — Exchange, SharePoint, OneDrive, and Teams. It shows what content exists and where it lives. Activity Explorer, by contrast, shows what labelling or DLP actions have been taken on that content over time.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "A security analyst needs to investigate whether any users have downgraded a sensitivity label on a file in the last 30 days. Which tool should they use?",
    difficulty: "Exam Level",
    topic: "Content & Activity Explorer",
    objective: "4.3",
    options: {
      A: "Content Explorer",
      B: "Activity Explorer",
      C: "Records Management disposition review",
      D: "Data Loss Prevention reports"
    },
    answer: "B",
    explanation: "Activity Explorer tracks label-related events over time — including label applied, changed, downgraded, or removed — and DLP policy matches. It answers the 'what happened' question. Content Explorer answers the 'what exists and where' question. For label downgrade forensics, Activity Explorer is the correct tool.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "multi-select",
    question: "Which two tasks can be performed using the Data Classification section of the Microsoft Purview portal? (Select TWO.)",
    difficulty: "Hard",
    topic: "Content & Activity Explorer",
    objective: "4.3",
    options: {
      A: "View a list of all items in SharePoint labelled as 'Confidential' using Content Explorer.",
      B: "Review a timeline of label downgrade events using Activity Explorer.",
      C: "Create and publish a new sensitivity label policy.",
      D: "Configure a data loss prevention policy.",
      E: "Set up a retention policy for Exchange mailboxes."
    },
    answer: ["A", "B"],
    explanation: "The Data Classification section of the Purview portal contains Content Explorer (view what content exists and what labels it carries) and Activity Explorer (view label and DLP events over time). Creating sensitivity label policies, DLP policies, and retention policies are configured in their respective sections — Information Protection and Data Lifecycle Management — not within Data Classification.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 8. Sensitivity Labels & Policies ─────────────────────────────────────
  {
    type: "mcq",
    question: "A user emails a document labelled 'Confidential' to an external partner. The sensitivity label applies encryption and an access policy that restricts opening to @contoso.com accounts only. What happens when the external partner tries to open the file?",
    difficulty: "Exam Level",
    topic: "Sensitivity Labels & Policies",
    objective: "4.3",
    options: {
      A: "The file opens normally because it has already left the organisation.",
      B: "The file cannot be opened because the encryption and access restriction travel with the file.",
      C: "The label is automatically removed when the file is attached to an email.",
      D: "The external user is prompted to apply a new label."
    },
    answer: "B",
    explanation: "Sensitivity labels that apply encryption (via Azure Information Protection, now part of Microsoft Purview Information Protection) embed the protection policy inside the file itself. The restriction travels with the file regardless of where it is stored or transmitted. Because the external partner's account is outside @contoso.com, the Rights Management Service will deny decryption.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "What is the purpose of a sensitivity LABEL POLICY in Microsoft Purview?",
    difficulty: "Foundational",
    topic: "Sensitivity Labels & Policies",
    objective: "4.3",
    options: {
      A: "To define what encryption algorithm is applied to data at rest in Azure Storage.",
      B: "To publish sensitivity labels to specific users or groups so they can apply them in Office apps.",
      C: "To automatically delete content after a specified retention period.",
      D: "To block users from sending credit card numbers via email."
    },
    answer: "B",
    explanation: "Sensitivity labels are created in the Purview portal but must be published via a label policy to become visible to users in Office apps (Word, Excel, Outlook, etc.) and other supported services. The policy specifies which users/groups receive which labels and can set a default label or require labelling. Retention and DLP are separate policy types.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "multi-select",
    question: "Which of the following protections can a sensitivity label directly apply to a file? (Select THREE.)",
    difficulty: "Hard",
    topic: "Sensitivity Labels & Policies",
    objective: "4.3",
    options: {
      A: "Content encryption",
      B: "Visual markings such as headers, footers, and watermarks",
      C: "Automatic deletion after 90 days",
      D: "Access restrictions (who can open, edit, or print)",
      E: "Network firewall rule creation"
    },
    answer: ["A", "B", "D"],
    explanation: "Sensitivity labels can apply three classes of protection: (1) Encryption — restricts access and usage rights via Microsoft Purview Information Protection (formerly AIP/Azure Rights Management); (2) Content marking — visual headers, footers, and watermarks; (3) Access control — rights such as view-only, edit, print, copy. Automatic deletion is a retention label feature. Firewall rules are outside sensitivity label scope.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "multi-select",
    question: "Which two statements correctly describe sensitivity label POLICIES in Microsoft Purview? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Sensitivity Labels & Policies",
    objective: "4.3",
    options: {
      A: "A label policy publishes sensitivity labels to specific users or groups so the labels appear in Office apps.",
      B: "A label policy can configure a default label that is automatically applied when no label is chosen.",
      C: "A label policy encrypts email content sent to external recipients.",
      D: "A label policy deletes content that has not been labelled after 30 days.",
      E: "A label policy blocks all outbound email unless a label is present."
    },
    answer: ["A", "B"],
    explanation: "Sensitivity label policies do two key things: (A) they publish labels to specified users/groups so those labels are visible in Office apps and other supported services; (B) they can set a default label (applied automatically when users create or edit content without choosing a label) and can mandate labelling. Encryption is a label setting, not a policy setting. Content deletion is a retention label/policy feature. Blocking unlabelled email is not a label policy function.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 9. Data Loss Prevention (DLP) ─────────────────────────────────────────
  {
    type: "mcq",
    question: "The Contoso compliance team wants to PREVENT employees from emailing files containing Social Security Numbers to external recipients. Which Microsoft Purview solution should they configure?",
    difficulty: "Foundational",
    topic: "Data Loss Prevention (DLP)",
    objective: "4.3",
    options: {
      A: "Sensitivity Labels",
      B: "Retention Policies",
      C: "Data Loss Prevention (DLP) policy",
      D: "eDiscovery hold"
    },
    answer: "C",
    explanation: "Data Loss Prevention (DLP) policies detect and block (or alert on) the transmission of sensitive information — such as SSNs, credit card numbers, health data — across channels including Exchange email, Teams chat, SharePoint, OneDrive, and endpoint devices. Sensitivity labels classify and protect content but do not actively intercept email flow. Retention policies govern data lifecycle, not data exfiltration.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "multi-select",
    question: "Which two actions can a Microsoft Purview DLP policy take when it detects sensitive content being shared externally? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Data Loss Prevention (DLP)",
    objective: "4.3",
    options: {
      A: "Block the sharing action and display a policy tip to the user",
      B: "Allow the user to override the block with a business justification",
      C: "Apply a sensitivity label to the content automatically",
      D: "Declare the item as a regulatory record",
      E: "Initiate an eDiscovery hold on the sender's mailbox"
    },
    answer: ["A", "B"],
    explanation: "A DLP policy can block the action (preventing external sharing) and simultaneously display a policy tip notifying the user. It can also be configured to allow the user to override the block by providing a business justification — this combination supports education-first compliance. Sensitivity label auto-application is a separate auto-labelling feature; declaring records is a Records Management function; eDiscovery holds are a separate legal process.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "Contoso needs a DLP policy that covers not only Exchange and SharePoint but also Windows 10/11 endpoints to prevent users from copying sensitive files to USB drives. Which DLP capability enables this?",
    difficulty: "Hard",
    topic: "Data Loss Prevention (DLP)",
    objective: "4.3",
    options: {
      A: "Microsoft Purview DLP for endpoints, requiring Microsoft Defender for Endpoint onboarding.",
      B: "Microsoft Intune device compliance policy.",
      C: "Microsoft Entra Conditional Access.",
      D: "Microsoft Defender for Cloud Apps session policy."
    },
    answer: "A",
    explanation: "Endpoint DLP extends Microsoft Purview DLP policies to Windows 10/11 devices that are onboarded to Microsoft Defender for Endpoint. It can prevent actions such as copying sensitive content to USB removable media, printing, uploading to cloud services, or opening in unallowed apps. Intune and Conditional Access manage device/app access, not file-level sensitive data egress.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "multi-select",
    question: "Which two locations can be protected by a Microsoft Purview DLP policy? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Data Loss Prevention (DLP)",
    objective: "4.3",
    options: {
      A: "Exchange email",
      B: "Azure Virtual Machine disks",
      C: "Microsoft Teams chat and channel messages",
      D: "Azure Key Vault secrets",
      E: "Azure DevOps repositories"
    },
    answer: ["A", "C"],
    explanation: "Microsoft Purview DLP policies can be scoped to Exchange email, SharePoint sites, OneDrive accounts, Microsoft Teams chat and channel messages, and Windows/macOS endpoints (via Endpoint DLP). Azure VM disks, Azure Key Vault, and Azure DevOps are not locations supported by Purview DLP policies.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 10. Records Management ─────────────────────────────────────────────────
  {
    type: "mcq",
    question: "What happens to a document that has been declared a RECORD in Microsoft Purview Records Management?",
    difficulty: "Exam Level",
    topic: "Records Management",
    objective: "4.3",
    options: {
      A: "It is encrypted automatically and moved to a locked archive mailbox.",
      B: "It is locked against editing or deletion for the duration of the record's retention period.",
      C: "It is immediately deleted after 90 days to free storage.",
      D: "It is copied to the Service Trust Portal for audit purposes."
    },
    answer: "B",
    explanation: "When a retention label declares content as a record (or regulatory record), it becomes immutable — users cannot edit or delete it, and in many cases even administrators cannot delete it ahead of schedule. This is used for regulatory or legal compliance requirements where an unchanged copy must be preserved for a defined period.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "A file-plan in Microsoft Purview Records Management is used to:",
    difficulty: "Hard",
    topic: "Records Management",
    objective: "4.3",
    options: {
      A: "Define sensitivity label policies and publish them to users.",
      B: "Organise and manage retention labels at scale, including importing labels and attaching descriptors such as reference IDs, business function, and provision/authority.",
      C: "Configure endpoint DLP rules for USB device control.",
      D: "Generate the compliance score by mapping controls to regulatory frameworks."
    },
    answer: "B",
    explanation: "The file plan in Records Management is a structured way to manage retention labels beyond what the basic label interface provides. Administrators can bulk-import labels, add metadata descriptors (e.g., regulatory authority, business function, provision), and export the plan. It does not manage sensitivity labels or DLP — those have separate configuration areas.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "Which Microsoft Purview feature requires a human reviewer to approve the disposal of content at the end of a retention period before it is permanently deleted?",
    difficulty: "Exam Level",
    topic: "Records Management",
    objective: "4.3",
    options: {
      A: "eDiscovery preservation hold",
      B: "Disposition review",
      C: "Auto-apply retention label policy",
      D: "Compliance Manager improvement action"
    },
    answer: "B",
    explanation: "Disposition review is a Records Management feature that pauses content deletion at the end of its configured retention period and sends a notification to designated reviewers. Reviewers can approve deletion, extend the retention, or relabel the item. This is required for high-value or legally significant records where human sign-off on disposal is mandatory.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 11. Retention Policies & Labels ───────────────────────────────────────
  {
    type: "mcq",
    question: "Contoso must keep all Exchange email for a minimum of 7 years due to a regulatory requirement, then delete it automatically. Which Microsoft Purview solution should they use?",
    difficulty: "Foundational",
    topic: "Retention Policies & Labels",
    objective: "4.3",
    options: {
      A: "Sensitivity label with encryption",
      B: "Data Loss Prevention policy",
      C: "Retention policy configured to retain for 7 years then delete",
      D: "Insider Risk Management policy"
    },
    answer: "C",
    explanation: "Retention policies in Microsoft Purview (Data Lifecycle Management) keep content for a specified period and can then automatically delete it. A 'retain then delete' retention policy scoped to Exchange mailboxes meets this regulatory requirement. Sensitivity labels protect content but do not schedule deletion; DLP prevents exfiltration; Insider Risk detects malicious behaviour.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "How does a RETENTION LABEL differ from a RETENTION POLICY in Microsoft Purview?",
    difficulty: "Exam Level",
    topic: "Retention Policies & Labels",
    objective: "4.3",
    options: {
      A: "Retention labels apply to entire services (all Exchange mailboxes), while retention policies apply to individual items.",
      B: "Retention policies apply across an entire service or location, while retention labels are applied to individual items and can travel with the content.",
      C: "Retention labels encrypt data; retention policies do not.",
      D: "There is no difference — both terms refer to the same feature."
    },
    answer: "B",
    explanation: "Retention policies are broad — they apply a single retention setting to all content within a location (e.g., all Exchange mailboxes in the tenant). Retention labels are granular — they are applied to individual items (emails, files) and move with the content. Labels also enable item-level record declaration and disposition review, which policies cannot do.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "multi-select",
    question: "Which two capabilities distinguish a retention LABEL from a retention POLICY in Microsoft Purview? (Select TWO.)",
    difficulty: "Hard",
    topic: "Retention Policies & Labels",
    objective: "4.3",
    options: {
      A: "Retention labels can be applied to individual items and travel with the content.",
      B: "Retention labels can declare an item as a record, triggering immutability.",
      C: "Retention policies can encrypt content that falls outside the retention period.",
      D: "Retention policies apply sensitivity markings to unlabelled content.",
      E: "Retention labels require Microsoft Defender for Endpoint to function."
    },
    answer: ["A", "B"],
    explanation: "Retention labels have two capabilities that retention policies lack: (A) granular item-level application — a label is stamped on an individual email or file and moves with it wherever it goes; (B) record declaration — only a retention label (not a policy) can mark an item as a record or regulatory record, making it immutable. Retention policies cannot encrypt content, apply sensitivity markings, or depend on Defender for Endpoint.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "multi-select",
    question: "Which two statements correctly distinguish sensitivity labels from retention labels in Microsoft Purview? (Select TWO.)",
    difficulty: "Hard",
    topic: "Retention Policies & Labels",
    objective: "4.3",
    options: {
      A: "Sensitivity labels classify and protect content (encryption, access restrictions, visual markings); retention labels govern how long content is kept or when it is deleted.",
      B: "Retention labels can declare an item as a record; sensitivity labels cannot.",
      C: "Sensitivity labels can be set to automatically delete content after a set period; retention labels cannot.",
      D: "Both sensitivity labels and retention labels require Microsoft Defender for Endpoint.",
      E: "Retention labels apply only to emails; sensitivity labels apply only to documents."
    },
    answer: ["A", "B"],
    explanation: "The key distinctions: (A) Sensitivity labels = classify + protect (encryption, access, markings that travel with the file); Retention labels = keep/delete lifecycle management. (B) Only retention labels have the 'mark as record' or 'mark as regulatory record' capability, triggering immutability and potential disposition review. Sensitivity labels do not schedule deletion; Defender for Endpoint is not required for either label type; both label types work across Exchange and SharePoint/OneDrive.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 12. Insider Risk Management ───────────────────────────────────────────
  {
    type: "mcq",
    question: "A company is concerned about employees who are about to resign potentially exfiltrating sensitive intellectual property. Which Microsoft Purview solution is specifically designed to detect and manage this risk?",
    difficulty: "Foundational",
    topic: "Insider Risk Management",
    objective: "4.4",
    options: {
      A: "Microsoft Purview eDiscovery",
      B: "Microsoft Purview Insider Risk Management",
      C: "Microsoft Entra Identity Protection",
      D: "Microsoft Defender for Cloud Apps"
    },
    answer: "B",
    explanation: "Microsoft Purview Insider Risk Management uses signals from Microsoft 365, HR connectors, and endpoint telemetry to detect risky internal activities such as data theft by departing employees, confidentiality policy violations, and security policy violations. It generates risk scores and alerts for investigation. eDiscovery is for legal discovery of existing content; Identity Protection handles compromised credentials.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "Which feature of Microsoft Purview Insider Risk Management is designed to protect employee privacy while still enabling risk investigation?",
    difficulty: "Exam Level",
    topic: "Insider Risk Management",
    objective: "4.4",
    options: {
      A: "All employee activities are visible to all administrators by default.",
      B: "User identities are pseudonymised by default — names are replaced with anonymised aliases until an investigator with the appropriate role de-anonymises a specific alert.",
      C: "Insider risk alerts are only visible to the user's direct manager.",
      D: "Investigation data is stored outside the tenant in a Microsoft-managed vault."
    },
    answer: "B",
    explanation: "Insider Risk Management uses pseudonymisation (built-in privacy) to show anonymised user aliases in alerts and cases. An investigator needs the 'Insider Risk Management Investigators' role to de-anonymise and view the actual user identity. This balances the need for risk investigation with employee privacy protections.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "Which of the following activities can an Insider Risk Management policy detect?",
    difficulty: "Exam Level",
    topic: "Insider Risk Management",
    objective: "4.4",
    options: {
      A: "External phishing emails targeting an employee.",
      B: "An employee downloading large volumes of files from SharePoint shortly before their resignation date (based on an HR connector signal).",
      C: "An external attacker brute-forcing the organisation's VPN.",
      D: "A misconfigured Azure storage account exposed to the public internet."
    },
    answer: "B",
    explanation: "Insider Risk Management correlates HR connector signals (e.g., resignation dates, performance improvement plan status) with activity signals (bulk downloads, email forwards to personal accounts, removable media transfers) to surface elevated-risk behaviour. It focuses on internal/trusted users, not external attackers or cloud misconfigurations.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── 13. eDiscovery & Audit ─────────────────────────────────────────────────
  {
    type: "mcq",
    question: "Contoso's legal team receives a court order to preserve all emails related to an ongoing litigation matter. Which Microsoft Purview solution should they use to place a hold on the relevant content?",
    difficulty: "Foundational",
    topic: "eDiscovery & Audit",
    objective: "4.4",
    options: {
      A: "Retention policy",
      B: "Microsoft Purview eDiscovery (Standard or Premium)",
      C: "Insider Risk Management",
      D: "Compliance Manager"
    },
    answer: "B",
    explanation: "Microsoft Purview eDiscovery (Standard and Premium) allows legal teams to place litigation holds on custodian mailboxes and SharePoint sites to preserve content for legal proceedings. Content placed on eDiscovery hold cannot be permanently deleted even if a conflicting retention policy would otherwise allow deletion. Retention policies serve data lifecycle purposes, not targeted legal holds.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "multi-select",
    question: "Which two capabilities are available in Microsoft Purview eDiscovery (Standard) but NOT in a basic Audit log search? (Select TWO.)",
    difficulty: "Hard",
    topic: "eDiscovery & Audit",
    objective: "4.4",
    options: {
      A: "Placing a litigation hold to preserve content and prevent deletion",
      B: "Searching for and exporting content across Exchange, SharePoint, and Teams",
      C: "Searching the audit log to see who signed in to the tenant",
      D: "Configuring audit log retention for up to 10 years",
      E: "Generating a Compliance Score for a regulatory framework"
    },
    answer: ["A", "B"],
    explanation: "eDiscovery (Standard) adds two capabilities beyond basic audit log search: (A) litigation holds — placing a legal preservation hold on custodian mailboxes and SharePoint sites so content cannot be deleted; (B) content search and export — locating relevant content across M365 services and exporting it for attorney review. Audit log search is a separate tool for reviewing user and admin activity. 10-year log retention is an Audit Premium feature. Compliance Score is Compliance Manager.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "An administrator needs to determine who deleted a file from a SharePoint document library yesterday. Which Microsoft Purview tool provides this information?",
    difficulty: "Exam Level",
    topic: "eDiscovery & Audit",
    objective: "4.4",
    options: {
      A: "Content Explorer",
      B: "Activity Explorer",
      C: "Audit log search",
      D: "Insider Risk Management alert queue"
    },
    answer: "C",
    explanation: "The Microsoft Purview Audit solution (formerly the Office 365 Audit Log) records thousands of user and admin activities across Microsoft 365 services. An administrator can search audit logs to find who performed a specific action — such as deleting a file from SharePoint — along with the timestamp, IP address, and device. Activity Explorer shows label and DLP events, not general user activities.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "What is the primary difference between Microsoft Purview Audit (Standard) and Audit (Premium)?",
    difficulty: "Hard",
    topic: "eDiscovery & Audit",
    objective: "4.4",
    options: {
      A: "Audit Standard records Exchange activities; Audit Premium records SharePoint activities.",
      B: "Audit Standard retains logs for 90 days; Audit Premium extends log retention up to 1 year (or 10 years with the add-on) and provides high-value audit events for investigations.",
      C: "Audit Standard is available only to Global Administrators.",
      D: "Audit Premium requires Microsoft Defender for Endpoint to be deployed."
    },
    answer: "B",
    explanation: "Audit Standard (included in M365 E3 and below) retains logs for 90 days. Audit Premium (M365 E5 or add-on) extends retention to 1 year by default (10 years with the 10-year retention add-on), adds crucial investigative events such as MailItemsAccessed (for compromised account forensics), Send, and SearchQueryInitiated, and enables bandwidth-throttling exceptions for high-volume audit queries.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "multi-select",
    question: "Which two Microsoft Purview solutions are used for investigating legal and compliance incidents involving internal users? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "eDiscovery & Audit",
    objective: "4.4",
    options: {
      A: "eDiscovery (to search, hold, and export content for legal matters)",
      B: "Audit log search (to review who did what, when, across Microsoft 365 services)",
      C: "Data Loss Prevention (to block sensitive data from leaving the organisation)",
      D: "Compliance Manager (to assess control implementation against regulatory frameworks)",
      E: "Sensitivity labels (to encrypt files with access restrictions)"
    },
    answer: ["A", "B"],
    explanation: "eDiscovery and Audit are the two Purview solutions in the 'eDiscovery & Audit' category designed for incident investigation. eDiscovery places holds and collects content for legal proceedings; Audit logs provide a forensic record of user and admin activities. DLP, Compliance Manager, and Sensitivity Labels serve different purposes (prevention, posture, and protection respectively).",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },

  // ── Reinforcement / Cross-topic distinguisher questions ───────────────────
  {
    type: "mcq",
    question: "Litware must ensure employees CANNOT send files containing EU passport numbers outside the company via Teams. Which solution directly prevents this?",
    difficulty: "Exam Level",
    topic: "Data Loss Prevention (DLP)",
    objective: "4.3",
    options: {
      A: "Sensitivity label that encrypts files with the EU passport number SIT",
      B: "DLP policy scoped to Microsoft Teams with a block action on the EU passport number sensitive information type",
      C: "Retention policy that deletes files containing EU passport numbers after 30 days",
      D: "Insider Risk Management policy for data theft by departing employees"
    },
    answer: "B",
    explanation: "To PREVENT transmission (block the action in real time), a DLP policy is required. A sensitivity label encrypts a file but doesn't stop a user from sending it — the recipient simply cannot decrypt it. A retention policy governs lifecycle (keep/delete), not transmission prevention. Insider Risk Management detects and investigates risk after the fact but does not block the action inline.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "Northwind Traders needs all documents in a shared legal drive to carry a watermark reading 'LEGAL CONFIDENTIAL', be encrypted, and restrict printing to members of the Legal team only. Which solution achieves this?",
    difficulty: "Exam Level",
    topic: "Sensitivity Labels & Policies",
    objective: "4.3",
    options: {
      A: "DLP policy with a 'block' action on the SharePoint site",
      B: "Sensitivity label configured with a watermark, encryption, and user rights that allow only the Legal group to print",
      C: "Retention label that marks documents as records",
      D: "Insider Risk Management policy scoped to the Legal department"
    },
    answer: "B",
    explanation: "Sensitivity labels deliver all three requirements: (1) visual watermarks are a content marking option; (2) encryption via Microsoft Purview Information Protection (formerly AIP) is a label protection option; (3) usage rights (view, edit, print, copy) can be scoped to specific AAD groups. DLP blocks data movement but cannot add watermarks or encryption to files. Retention labels govern lifecycle, not protection.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  },
  {
    type: "mcq",
    question: "Alpine Ski House must automatically delete all Microsoft Teams chat messages after 3 years for data minimisation purposes. Which solution achieves this?",
    difficulty: "Exam Level",
    topic: "Retention Policies & Labels",
    objective: "4.3",
    options: {
      A: "Sensitivity label with a 3-year expiry applied to Teams messages",
      B: "Retention policy scoped to Microsoft Teams with a 'delete after 3 years' setting",
      C: "DLP policy that blocks Teams messages after 3 years",
      D: "Insider Risk Management with a data minimisation policy template"
    },
    answer: "B",
    explanation: "Retention policies in Microsoft Purview Data Lifecycle Management can be scoped to Microsoft Teams chat messages (and channel messages separately). Configuring the policy to 'delete content older than 3 years' satisfies the data minimisation requirement. Sensitivity labels apply classification/protection, not deletion schedules. DLP operates on active content transmission, not timed deletion.",
    source: "Original — public Microsoft SC-900 Skills Measured (Nov 2025)",
    addedVersion: "7.7.0",
    addedDate: "2026-05-29"
  }
  ]
};
