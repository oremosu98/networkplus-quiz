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
  questionExemplars: []
};
