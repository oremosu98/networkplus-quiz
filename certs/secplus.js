// ══════════════════════════════════════════════════════════════════════════
// CompTIA Security+ SY0-701 cert pack (v4.87.0 — content authoring)
// ══════════════════════════════════════════════════════════════════════════
// Loaded into window.CERT_PACKS.secplus at app boot. Active when:
//   1. localStorage 'nplus_dev_cert' === 'secplus' (dev override), OR
//   2. URL host starts with 'secplus-' (production deploy via Vercel)
// Otherwise inert (loaded but not used; Network+ stays default).
//
// Status (v4.87.0):
//   ✓ Cert metadata (name, code, exam pass mark 750)
//   ✓ Domain weights (CompTIA SY0-701 blueprint)
//   ✓ Domain labels (5 domains)
//   ✓ Topic catalog (32 topics across 5 domains)
//   ✓ Topic resources (Professor Messer SY0-701 URLs + objective numbers)
//   ☐ retentionGapConcepts (Phase 3 cycles after first practice test)
//   ☐ GT tables (Phase 2B audit — most Network+ ports + OSI transfer)
//   ☐ questionExemplars (Phase 2B audit + carry-over of ~60-100 cross-cert
//     Network+ exemplars with topics retagged + new authoring)
//
// AUDIENCE: builder only. User's private study tool through SY0-701 exam
// on 2026-07-29. Customers stay on Network+ deploy. Access control is URL
// obscurity (no Vercel Pro, no in-app password) per cert_saas_pivot_plan.md.
//
// LEGAL: every entry below originates from the public SY0-701 blueprint or
// publicly-known technical facts. Zero ingestion of paid-bank content
// (Jason Dion / CertMaster / Mike Myers / Kaplan) — same discipline that
// built the Network+ pack to a 767/900 pass.

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

  // ── PRIORITY RETENTION CONCEPTS (v4.88.3, Phase 3 Cycle 1) ────────────
  // Topics user has flagged as gaps while watching Professor Messer SY0-701
  // videos. Injected as a soft tiebreaker into every question-generation
  // prompt (custom quiz, Mixed, Daily Challenge, Marathon, Exam simulator).
  // Non-invasive: a preference, not a mandate. Same mechanism as the
  // Network+ retentionGapConcepts pattern.
  retentionGapConcepts: [
    { label: 'Security Control Categories', parentTopic: 'Security Controls',          objective: '1.1', keyword: 'Technical / Managerial / Operational / Physical — distinguishing examples in scenario stems' },
    { label: 'Security Control Types',      parentTopic: 'Security Controls',          objective: '1.1', keyword: 'Preventive / Deterrent / Detective / Corrective / Compensating / Directive — the six types and their distinguishing features' },
    { label: 'Non-repudiation',             parentTopic: 'CIA Triad & AAA',            objective: '1.2', keyword: 'Digital signatures: hashing + private-key sign + public-key verify; non-repudiation = signer cannot deny because only they hold the private key' },
    { label: 'PKI Hierarchy & CA Roles',    parentTopic: 'PKI & Certificate Management', objective: '1.4', keyword: 'Root CA (offline, self-signed top of trust) vs Intermediate CA (online, day-to-day issuance); cert-based client auth = signing a server challenge with the private key' },
    { label: 'Authorization Models',        parentTopic: 'Identity & Access Management', objective: '4.6', keyword: 'DAC (owner discretion) / MAC (system-enforced labels + clearances) / RBAC (role-based) / ABAC (attribute-based, dynamic) — distinguishing scenarios' },
    { label: 'Gap Analysis',                parentTopic: 'Security Governance',          objective: '5.1', keyword: 'Compare current control state to a target benchmark/framework (NIST CSF, ISO 27001, SOC 2, PCI DSS) — output is the coverage delta + remediation priorities. Distinguished from vulnerability assessment (CVE-focused), risk assessment (likelihood × impact), threat assessment (adversary profile), and pen test (active exploit).' },
    // ── Phase 3 Cycle 3 retention concepts (v4.99.25, 2026-05-10) ───────────
    // 3 entries covering Zero Trust sub-concepts that came up in user's
    // morning Messer session. Pair with the 8 Phase 3 Cycle 3 exemplars below.
    { label: 'Zero Trust Control Plane vs Data Plane', parentTopic: 'Zero Trust & SDN', objective: '3.2', keyword: 'Control Plane = decision-making (Policy Engine, Policy Administrator, adaptive identity, threat scope reduction, policy-driven access control). Data Plane = enforcement (Policy Enforcement Point on the actual data path between subject and resource). Decisions made in Control Plane, enforced in Data Plane — fundamental architectural split.' },
    { label: 'Zero Trust Policy Components',           parentTopic: 'Zero Trust & SDN', objective: '3.2', keyword: 'Policy Engine (PE) MAKES the access decision. Policy Administrator (PA) COMMUNICATES the decision and configures the access path. PE + PA together = Policy Decision Point (PDP, Control Plane). Policy Enforcement Point (PEP) = the gate on the data path that ENFORCES the decision. Memorize: PE decides, PA configures, PEP enforces.' },
    { label: 'Adaptive Identity & Threat Scope',       parentTopic: 'Zero Trust & SDN', objective: '3.2', keyword: 'Adaptive identity = authentication strength adjusts dynamically based on context (device posture, network location, time-of-day, behavioral risk score). Threat scope reduction = limiting access to need-to-know to shrink blast radius. Both replace legacy implicit trust zones (network-location-based grants) with dynamic, per-request decisions.' },
    // ── Phase 3 Cycle 4 retention concepts (v4.99.40, 2026-05-11) ───────────
    // 3 entries covering Physical Security sub-concepts that came up in user's
    // morning Messer session. Pair with the 10 Phase 3 Cycle 4 exemplars in
    // questionExemplars below (lines ~396-415).
    { label: 'Physical Security Control Categories',   parentTopic: 'Security Controls', objective: '1.2', keyword: 'DETERRENT (psychological barrier — lighting, signage, visible cameras), PREVENTIVE (physical barrier — bollards, locks, fences, mantraps), DETECTIVE (records or alerts after event — CCTV recording, tamper-evident seals, motion sensors, audit logs). Same 6-type taxonomy as logical controls (deterrent / preventive / detective / corrective / compensating / directive). Common SY0-701 trap: choosing a deterrent or detective when the question asks for prevention of a specific attack.' },
    { label: 'Access Control Vestibule (Mantrap)',     parentTopic: 'Security Controls', objective: '1.2', keyword: 'Modern CompTIA term is "access control vestibule" (older term: mantrap). Two interlocked doors with badge readers; only ONE door can be open at a time. Outer door must fully close before inner door will unlock. Addresses TAILGATING — an unauthorized person following an authorized employee through a single door without their own credential. Distinguished from a turnstile (single-person friction-only mechanism with no enclosure).' },
    { label: 'Air Gap vs DMZ vs VLAN Isolation',       parentTopic: 'Security Controls', objective: '1.2', keyword: 'AIR GAP = NO physical network connection (critical infrastructure, SCADA, classified systems). DMZ = controlled network segment between two firewalls with strict ingress/egress (public-facing services). VLAN segregation = LOGICAL separation on the SAME physical network (insufficient for critical systems — VLAN hopping). Strength ordering: air gap > DMZ > VLAN. SY0-701 trap: treating DMZ or VLAN as equivalent to air gap for control-system protection.' },
    // ── Phase 3 Cycle 5 retention concepts (v4.99.41, 2026-05-11) ───────────
    // 3 entries covering Deception & Disruption sub-concepts from user's
    // mid-morning Messer session. Pair with the 8 Phase 3 Cycle 5 exemplars.
    { label: 'Honey-X Scope Ladder',                  parentTopic: 'Security Controls', objective: '1.2', keyword: 'HONEYPOT = a whole DECOY SYSTEM (often vulnerable web/DB server). HONEYNET = a NETWORK of interconnected honeypots simulating a realistic environment so attackers can be observed doing lateral movement. HONEYFILE = a single FAKE FILE in a real production share (named to attract attackers; fires alert on access). HONEYTOKEN = the UMBRELLA term for any seeded fake data unit (fake DB records, fake API keys, fake credentials, fake email addresses, watermarked docs) — honeyfile is a subset. Scope ladder: honeypot (system) → honeynet (network of systems) → honeyfile (one file) → honeytoken (any data unit, broadest).' },
    { label: 'DNS Sinkhole',                          parentTopic: 'Security Controls', objective: '1.2', keyword: 'Recursive DNS resolver is configured with a list of known-bad domains (C2, phishing, malware-distribution). When a client queries one, the resolver returns a controlled response — typically a null IP, dedicated sinkhole VLAN address, or security-team-controlled honeypot — instead of the real DNS answer. Two simultaneous wins: (1) PREVENTS the infected client from reaching real C2 infrastructure, (2) DETECTS infected hosts via the resolver query logs. Limitation: hard-coded IPs (no DNS lookup) bypass it; still need firewall + IDS for those.' },
    { label: 'Deception vs Disruption',               parentTopic: 'Security Controls', objective: '1.2', keyword: 'DECEPTION = lure and observe (defender creates fake assets/data and waits for attackers to engage — honeypot, honeynet, honeyfile, honeytoken, fake telemetry). DISRUPTION = active interference with attacker operations (DNS sinkhole redirecting C2, RPZ poisoning, beacon jamming, exfiltration-path latency injection). Many controls bridge both — e.g., DNS sinkhole that redirects to a honeypot is BOTH disruption (real C2 fails) AND deception (attacker now talks to your decoy). Both are DEFENSIVE — active offensive counter-hacking is legally murky and not in SY0-701 Domain 1.2.' }
  ],

  // ── DOMAIN WEIGHTS (CompTIA SY0-701 blueprint) ────────────────────────
  // Sums to 1.00. Sourced from current public SY0-701 blueprint.
  domainWeights: {
    concepts:     0.12, // Domain 1.0 — General Security Concepts
    threats:      0.22, // Domain 2.0 — Threats, Vulnerabilities & Mitigations
    architecture: 0.18, // Domain 3.0 — Security Architecture
    operations:   0.28, // Domain 4.0 — Security Operations (largest)
    governance:   0.20  // Domain 5.0 — Program Management & Oversight
  },

  domainLabels: {
    concepts:     'General Security Concepts',
    threats:      'Threats, Vulnerabilities & Mitigations',
    architecture: 'Security Architecture',
    operations:   'Security Operations',
    governance:   'Program Management & Oversight'
  },

  // ── TOPIC → DOMAIN MAP (32 topics across 5 SY0-701 domains) ───────────
  // Drives weak-spot routing, exemplar bank picker, lottery, readiness
  // domain attribution. Topic name = primary key everywhere; domain key
  // is one of: concepts / threats / architecture / operations / governance.
  topicDomains: {
    // Domain 1.0 — General Security Concepts (12%)
    'Security Controls':                'concepts', // 1.1 — categories + types
    'CIA Triad & AAA':                  'concepts', // 1.2 — core principles
    'Change Management':                'concepts', // 1.3 — security-relevant change processes
    'Cryptography Fundamentals':        'concepts', // 1.4 — symmetric, asymmetric, hashing
    'PKI & Certificate Management':     'concepts', // 1.4 — public-key infrastructure

    // Domain 2.0 — Threats, Vulnerabilities & Mitigations (22%)
    'Threat Actors & Motivations':      'threats',  // 2.1 — nation-state, organized crime, hacktivist, insider, etc.
    'Attack Vectors & Surfaces':        'threats',  // 2.2 — message-based, image-based, file-based, voice
    'Application Vulnerabilities':      'threats',  // 2.3 — buffer overflow, race condition, XSS, SQLi
    'OS & Hardware Vulnerabilities':    'threats',  // 2.3 — firmware, EOL, legacy, virtualization escapes
    'Web & Cryptographic Attacks':      'threats',  // 2.4 — collision, downgrade, replay, on-path
    'Network Attacks':                  'threats',  // 2.4 — DDoS, DNS attacks, wireless, on-path
    'Malicious Activity Indicators':    'threats',  // 2.4 — IoCs, behavioral patterns
    'Mitigation Techniques':            'threats',  // 2.5 — segmentation, hardening, patching, ACLs
    'Social Engineering':               'threats',  // 2.2 — phishing, vishing, pretexting, BEC
    'Malware Types':                    'threats',  // 2.4 — ransomware, trojan, worm, rootkit, fileless

    // Domain 3.0 — Security Architecture (18%)
    'Architecture Models':              'architecture', // 3.1 — cloud, IaC, serverless, microservices, IoT, ICS/SCADA
    'Network Security Architecture':    'architecture', // 3.2 — segmentation, zero trust, SASE, IPS/IDS placement
    'Data Protection':                  'architecture', // 3.3 — classification, encryption, DLP, masking, tokenization
    'Resilience & Recovery':            'architecture', // 3.4 — HA, redundancy, backups, restore-testing, sites
    'Cloud Security & Shared Responsibility': 'architecture', // 3.1+3.2 — IaaS/PaaS/SaaS boundaries
    'Zero Trust & SDN':                 'architecture', // 3.2 — adaptive identity, threat scope reduction, policy engines

    // Domain 4.0 — Security Operations (28% — largest domain)
    'Endpoint & Server Hardening':      'operations',   // 4.1 — baselines, EDR, host firewalls, application allowlisting
    'Asset Management':                 'operations',   // 4.2 — acquisition, monitoring, decommissioning, sanitization
    'Vulnerability Management':         'operations',   // 4.3 — scanning, validation, prioritization, response
    'Security Monitoring & SIEM':       'operations',   // 4.4 — logs, alerts, correlation, SCAP, NetFlow
    'Email & Web Security':             'operations',   // 4.5 — DKIM, SPF, DMARC, gateways, sandboxing
    'Identity & Access Management':     'operations',   // 4.6 — provisioning, MFA, password mgmt, attestation
    'Authentication Methods (MFA/SSO)': 'operations',   // 4.6 — federation, SAML, OAuth, OIDC, biometrics
    'Automation & SOAR':                'operations',   // 4.7 — playbooks, scripts, ticketing, orchestration
    'Incident Response':                'operations',   // 4.8 — preparation, identification, containment, eradication, recovery, lessons
    'Forensics & Investigations':       'operations',   // 4.9 — log sources, chain of custody, packet captures, dashboards

    // Domain 5.0 — Program Management & Oversight (20%)
    'Security Governance':              'governance',  // 5.1 — policies, standards, procedures, GRC roles
    'Risk Management':                  'governance',  // 5.2 — register, appetite, tolerance, qualitative/quantitative analysis, treatment
    'Third-Party Risk Management':      'governance',  // 5.3 — vendor assessment, SLA, SLE, MOA, BPA
    'Compliance Frameworks':            'governance',  // 5.4 — PCI-DSS, HIPAA, GDPR, SOX, FERPA + privacy regs
    'Security Awareness & Training':    'governance',  // 5.5 — phishing simulation, anomalous behaviour, reporting
    'Audits & Assessments':             'governance'   // 5.4 — internal/external audits, attestation, pentesting categories
  },

  // ── TOPIC RESOURCES (Professor Messer YouTube search URLs + SY0-701 objectives) ──
  // Search format: 'professor+messer+SY0-701+<topic-keywords>' — opens YouTube
  // search results, first hit is usually the relevant Messer video.
  topicResources: {
    // Domain 1.0
    'Security Controls':                { obj: '1.1', title: 'Security Control Categories', search: 'professor+messer+SY0-701+security+control+categories' },
    'CIA Triad & AAA':                  { obj: '1.2', title: 'CIA + AAA + Non-repudiation', search: 'professor+messer+SY0-701+CIA+AAA' },
    'Change Management':                { obj: '1.3', title: 'Change Management', search: 'professor+messer+SY0-701+change+management' },
    'Cryptography Fundamentals':        { obj: '1.4', title: 'Cryptography Fundamentals', search: 'professor+messer+SY0-701+cryptography+symmetric+asymmetric' },
    'PKI & Certificate Management':     { obj: '1.4', title: 'PKI & Certificates', search: 'professor+messer+SY0-701+PKI+certificate' },

    // Domain 2.0
    'Threat Actors & Motivations':      { obj: '2.1', title: 'Threat Actors', search: 'professor+messer+SY0-701+threat+actors+motivations' },
    'Attack Vectors & Surfaces':        { obj: '2.2', title: 'Attack Vectors', search: 'professor+messer+SY0-701+attack+vectors+surfaces' },
    'Application Vulnerabilities':      { obj: '2.3', title: 'Application Vulnerabilities', search: 'professor+messer+SY0-701+application+vulnerabilities+buffer+overflow' },
    'OS & Hardware Vulnerabilities':    { obj: '2.3', title: 'OS & Hardware Vulnerabilities', search: 'professor+messer+SY0-701+operating+system+hardware+vulnerabilities' },
    'Web & Cryptographic Attacks':      { obj: '2.4', title: 'Web & Crypto Attacks', search: 'professor+messer+SY0-701+cryptographic+attacks' },
    'Network Attacks':                  { obj: '2.4', title: 'Network Attacks', search: 'professor+messer+SY0-701+network+attacks+DDoS' },
    'Malicious Activity Indicators':    { obj: '2.4', title: 'Indicators of Malicious Activity', search: 'professor+messer+SY0-701+indicators+malicious+activity' },
    'Mitigation Techniques':            { obj: '2.5', title: 'Mitigation Techniques', search: 'professor+messer+SY0-701+mitigation+techniques+segmentation+hardening' },
    'Social Engineering':               { obj: '2.2', title: 'Social Engineering', search: 'professor+messer+SY0-701+social+engineering+phishing' },
    'Malware Types':                    { obj: '2.4', title: 'Malware Types', search: 'professor+messer+SY0-701+malware+ransomware+trojan' },

    // Domain 3.0
    'Architecture Models':              { obj: '3.1', title: 'Architecture Models', search: 'professor+messer+SY0-701+architecture+cloud+IoT+ICS' },
    'Network Security Architecture':    { obj: '3.2', title: 'Network Security Architecture', search: 'professor+messer+SY0-701+network+security+architecture+segmentation' },
    'Data Protection':                  { obj: '3.3', title: 'Data Protection', search: 'professor+messer+SY0-701+data+protection+classification+encryption+DLP' },
    'Resilience & Recovery':            { obj: '3.4', title: 'Resilience & Recovery', search: 'professor+messer+SY0-701+resilience+recovery+backup+HA' },
    'Cloud Security & Shared Responsibility': { obj: '3.1', title: 'Cloud Security', search: 'professor+messer+SY0-701+cloud+security+shared+responsibility' },
    'Zero Trust & SDN':                 { obj: '3.2', title: 'Zero Trust & SDN', search: 'professor+messer+SY0-701+zero+trust+SDN' },

    // Domain 4.0
    'Endpoint & Server Hardening':      { obj: '4.1', title: 'Endpoint & Server Security', search: 'professor+messer+SY0-701+endpoint+EDR+hardening' },
    'Asset Management':                 { obj: '4.2', title: 'Asset Management', search: 'professor+messer+SY0-701+asset+management+sanitization' },
    'Vulnerability Management':         { obj: '4.3', title: 'Vulnerability Management', search: 'professor+messer+SY0-701+vulnerability+management+scanning' },
    'Security Monitoring & SIEM':       { obj: '4.4', title: 'Security Monitoring & SIEM', search: 'professor+messer+SY0-701+SIEM+monitoring+alerting' },
    'Email & Web Security':             { obj: '4.5', title: 'Email & Web Security', search: 'professor+messer+SY0-701+email+security+DKIM+SPF+DMARC' },
    'Identity & Access Management':     { obj: '4.6', title: 'Identity & Access Mgmt', search: 'professor+messer+SY0-701+identity+access+management+IAM' },
    'Authentication Methods (MFA/SSO)': { obj: '4.6', title: 'Authentication Methods', search: 'professor+messer+SY0-701+authentication+MFA+SSO+SAML+OAuth' },
    'Automation & SOAR':                { obj: '4.7', title: 'Automation & SOAR', search: 'professor+messer+SY0-701+automation+orchestration+SOAR' },
    'Incident Response':                { obj: '4.8', title: 'Incident Response', search: 'professor+messer+SY0-701+incident+response' },
    'Forensics & Investigations':       { obj: '4.9', title: 'Forensics & Investigations', search: 'professor+messer+SY0-701+forensics+investigation' },

    // Domain 5.0
    'Security Governance':              { obj: '5.1', title: 'Security Governance', search: 'professor+messer+SY0-701+security+governance+policies' },
    'Risk Management':                  { obj: '5.2', title: 'Risk Management', search: 'professor+messer+SY0-701+risk+management+register+treatment' },
    'Third-Party Risk Management':      { obj: '5.3', title: 'Third-Party Risk', search: 'professor+messer+SY0-701+third+party+risk+vendor' },
    'Compliance Frameworks':            { obj: '5.4', title: 'Compliance Frameworks', search: 'professor+messer+SY0-701+compliance+PCI+HIPAA+GDPR' },
    'Security Awareness & Training':    { obj: '5.5', title: 'Security Awareness', search: 'professor+messer+SY0-701+security+awareness+training' },
    'Audits & Assessments':             { obj: '5.4', title: 'Audits & Assessments', search: 'professor+messer+SY0-701+audits+assessments+pentest' }
  },

  // ── GROUND TRUTH TABLES ───────────────────────────────────────────────
  // Empty for now — Phase 2B audits which Network+ ground truths transfer
  // (most ports + OSI assignments + ethernet facts do; wifi facts likely
  // transfer too since wireless security is testable on both certs).
  gt: {
    ports: {},
    osi: {},
    wifiBroken: [],
    wifiDeprecated: [],
    ethernet: {},
    // v4.99.26 — Zero Trust principle vocabulary. Used by _buildGtHint to
    // inject canonical SY0-701 vocabulary into Haiku generation prompts when
    // topic = 'Zero Trust & SDN', and by _groundTruthOk to reject answers
    // that name off-vocabulary terms (like 'device posture assessment') as
    // Zero Trust principles. Device posture, behavior signals, etc. are
    // INPUTS that feed into adaptive identity decisions — they are NOT
    // top-level Zero Trust principles per the SY0-701 blueprint.
    // Origin: founder-flagged Haiku-generated question 2026-05-10 that
    // claimed "device posture assessment" was a Zero Trust principle when
    // the actual SY0-701 framework names different concepts.
    zeroTrust: {
      validPrinciples: [
        'adaptive identity',
        'threat scope reduction',
        'policy-driven access control',
        'policy enforcement point',
        'policy decision point',
        'policy engine',
        'policy administrator',
        'control plane',
        'data plane',
        'implicit trust zones',
        'pep',
        'pdp',
        'pe',
        'pa'
      ],
      // Off-vocabulary terms Haiku sometimes invents as principles. If a
      // question stem asks "what Zero Trust principle..." and the answer
      // text is anchored on one of these, the validator rejects.
      offVocabulary: [
        'device posture assessment',
        'continuous verification',
        'risk-based authentication',
        'context-aware authentication',
        'just-in-time access',
        'session risk evaluation',
        'continuous trust evaluation',
        'least privilege access',
        'micro-segmentation'
      ]
    }
  },

  // ── EXEMPLAR BANK (Phase 2B will populate) ────────────────────────────
  // Phase 2B audits the 320 Network+ exemplars and ports the ~60-100 that
  // genuinely transfer to Security+ (with topics retagged for SY0-701).
  // Then authors net-new Security+ exemplars to reach ~200 baseline over
  // 2-3 weekend Phase 2 sessions. Empty array = exemplar injection is a
  // no-op; Haiku falls back to blueprint + prompt quality alone.
  questionExemplars: [
    {"type":"mcq","question":"Which version of SNMP introduces encryption and authentication of management traffic to address the security weaknesses of earlier versions?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"SNMPv1","B":"SNMPv2c","C":"SNMPv3","D":"SNMPv4"},"answer":"C","explanation":"SNMPv3 adds authentication and encryption via the User-based Security Model (USM) and View-based Access Control Model (VACM). SNMPv1 and SNMPv2c both rely on community strings sent in plaintext, offering no real security. SNMPv4 does not exist; v3 is the current standard.","source":"curated-netplus-carryover","addedVersion":"4.58.3","addedDate":"2026-04-21","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"A network administrator is reviewing syslog messages and sees entries with a numeric severity level of 3 (Error). They want to filter the log to capture only messages indicating more urgent system conditions than Error-level. Which severity levels should they configure as their minimum threshold?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"Severity 0, 1, and 2 (Emergency, Alert, Critical)","B":"Severity 4, 5, and 6 (Warning, Notice, Informational)","C":"Severity 7 (Debug) only","D":"Severity 3, 4, and 5 (Error, Warning, Notice)"},"answer":"A","explanation":"Syslog severity levels run inversely to urgency: 0 (Emergency) is most severe, 7 (Debug) is least. Levels 0-2 (Emergency, Alert, Critical) are all more urgent than Error (level 3). Option B selects less-urgent levels. Option C is the least severe of all. Option D includes Error itself plus two less-urgent levels.","source":"curated-netplus-carryover","addedVersion":"4.58.3","addedDate":"2026-04-21","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"A company’s executive team has set the following disaster recovery targets for their order-processing database: data loss of no more than 5 minutes and total downtime of no more than 1 hour during any failure event. Which two DR metrics do these targets correspond to?","difficulty":"Hard","topic":"Resilience & Recovery","objective":"3.4","options":{"A":"RPO = 5 minutes, RTO = 1 hour","B":"RTO = 5 minutes, RPO = 1 hour","C":"MTBF = 5 minutes, MTTR = 1 hour","D":"SLA = 5 minutes, OLA = 1 hour"},"answer":"A","explanation":"Recovery Point Objective (RPO) measures acceptable data loss — the 5-minute target means the backup/replication strategy must keep data current to within 5 minutes of any failure. Recovery Time Objective (RTO) measures acceptable downtime — the 1-hour target defines how quickly the service must be restored. Option B reverses the two metrics. MTBF/MTTR (C) measure hardware reliability, not DR targets. SLA/OLA (D) are service-level agreements, unrelated to DR metric terminology.","source":"curated-netplus-carryover","addedVersion":"4.58.3","addedDate":"2026-04-21","originalTopic":"Business Continuity & Disaster Recovery","originalObjective":"3.3"},
    {"type":"mcq","question":"A network administrator wants to analyse which applications consume the most bandwidth on their internet link over a 24-hour period, including destination IP addresses, port numbers, and byte counts per flow — without capturing the actual packet payloads. Which technology best fits this requirement?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"Full packet capture (pcap)","B":"NetFlow / sFlow / IPFIX","C":"SNMP polling","D":"Syslog aggregation"},"answer":"B","explanation":"NetFlow (Cisco), sFlow, and IPFIX (RFC standard) collect flow metadata — source/destination IP, ports, protocol, byte counts — without capturing payloads. Ideal for bandwidth analysis at scale. Full packet capture (A) captures the entire payload, resource-intensive and privacy-sensitive. SNMP polling (C) provides device-level counters but not per-flow detail. Syslog (D) captures event messages, not traffic flow statistics.","source":"curated-netplus-carryover","addedVersion":"4.58.3","addedDate":"2026-04-21","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"A network administrator is establishing a baseline for their enterprise network. Which of the following metrics would be most useful to capture as part of that baseline?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"Average bandwidth utilisation per link during typical business hours","B":"Number of physical devices in each data centre rack","C":"Names of all network administrators with SSH access","D":"Operating system versions running on user workstations"},"answer":"A","explanation":"A network baseline captures normal operational metrics — bandwidth utilisation, latency, packet loss, CPU/memory on critical devices, error rates — so that deviations can be detected as incidents. Option A directly feeds this. Option B is physical inventory. Option C is access control documentation. Option D is endpoint inventory. All are valuable in their own right, but only A is a performance metric appropriate for a baseline.","source":"curated-netplus-carryover","addedVersion":"4.58.3","addedDate":"2026-04-21","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"Which three principles form the foundation of information security, often referred to by the acronym \"CIA\"?","difficulty":"Foundational","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Confidentiality, Integrity, Availability","B":"Compliance, Identification, Authentication","C":"Cryptography, Isolation, Authorisation","D":"Certification, Inspection, Auditing"},"answer":"A","explanation":"The CIA triad — Confidentiality (data is only accessible to authorised parties), Integrity (data is accurate and unmodified), and Availability (authorised users can access the data when needed) — is the foundational security model referenced throughout N10-009. Options B, C, and D are plausible-sounding distractors built from real security terms but not the canonical triad.","source":"curated-netplus-carryover","addedVersion":"4.58.4","addedDate":"2026-04-21","originalTopic":"Securing TCP/IP","originalObjective":"4.1"},
    {"type":"mcq","question":"A user logs into a corporate VPN using their credentials. The VPN appliance verifies the credentials against a central server, grants the user specific network access based on their role, and logs the session duration and bytes transferred. Which three AAA functions are demonstrated in this scenario, in order?","difficulty":"Exam Level","topic":"Identity & Access Management","objective":"4.6","options":{"A":"Auditing, Authorisation, Accounting","B":"Authentication, Authorisation, Accounting","C":"Authentication, Accreditation, Analytics","D":"Access, Assignment, Assessment"},"answer":"B","explanation":"AAA stands for Authentication (verifying identity), Authorisation (granting permissions based on identity/role), and Accounting (recording what was done, when, and how much). All three map exactly to the scenario. Option A swaps Authentication for Auditing (Auditing is not the first A). Options C and D use plausible-but-wrong terms not from the actual AAA framework.","source":"curated-netplus-carryover","addedVersion":"4.58.4","addedDate":"2026-04-21","originalTopic":"AAA & Authentication","originalObjective":"4.1"},
    {"type":"mcq","question":"A company implements multi-factor authentication (MFA) for their VPN. Users must enter a password AND provide a fingerprint scan AND input a code from a hardware token. How many distinct authentication factor CATEGORIES are being used in this configuration?","difficulty":"Exam Level","topic":"Identity & Access Management","objective":"4.6","options":{"A":"One factor","B":"Two factors","C":"Three factors","D":"Four factors"},"answer":"C","explanation":"MFA categories are based on distinct factor types: something you KNOW (password), something you HAVE (hardware token), and something you ARE (biometric fingerprint). Three distinct categories are in use, satisfying true 3-factor authentication. If the configuration used two passwords, that would still be single-factor (both are \"know\"). Using a password + token alone is 2FA. Adding biometrics makes it 3FA.","source":"curated-netplus-carryover","addedVersion":"4.58.4","addedDate":"2026-04-21","originalTopic":"AAA & Authentication","originalObjective":"4.4"},
    {"type":"mcq","question":"A company establishes a site-to-site IPsec VPN between two branch offices. They want the entire original IP packet — including the original source and destination IP addresses — to be encapsulated and encrypted, so that an attacker capturing traffic on the public internet cannot determine the internal private IP addresses of either branch. Which IPsec mode should they configure?","difficulty":"Hard","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Transport mode with ESP","B":"Tunnel mode with ESP","C":"Transport mode with AH only","D":"Tunnel mode with AH only"},"answer":"B","explanation":"IPsec Tunnel mode encapsulates the entire original IP packet (including original headers) inside a new outer IP packet, hiding internal addressing. ESP (Encapsulating Security Payload) provides both encryption and authentication of the payload. Transport mode (A, C) only protects the payload; the original IP header remains visible. AH (Authentication Header — C and D) provides integrity but NOT encryption — attackers could still read the packet contents. Tunnel mode + ESP is the standard site-to-site VPN configuration.","source":"curated-netplus-carryover","addedVersion":"4.58.4","addedDate":"2026-04-21","originalTopic":"IPsec & VPN Protocols","originalObjective":"4.4"},
    {"type":"mcq","question":"A user’s web browser displays a trusted lock icon when connecting to https://bank.com. Which component of the Public Key Infrastructure (PKI) did the browser rely on to verify that the certificate presented by the bank’s server is authentic?","difficulty":"Exam Level","topic":"PKI & Certificate Management","objective":"1.4","options":{"A":"The bank’s private key","B":"A trusted Root Certificate Authority (CA) that signed the certificate’s chain of trust","C":"A Certificate Revocation List (CRL) maintained by the bank","D":"The browser’s own self-signed certificate"},"answer":"B","explanation":"Every browser ships with a pre-installed bundle of trusted Root CA certificates. When the bank’s server presents its certificate, the browser walks the certificate’s chain — typically Server Cert → Intermediate CA → Root CA — and verifies each signature. If the chain terminates at a trusted Root CA, the certificate is considered authentic. The bank’s private key (A) is used to decrypt/sign, never shared publicly. CRLs (C) are checked for revoked certs but do not establish initial trust. Self-signed browser certificates (D) do not exist in this trust model.","source":"curated-netplus-carryover","addedVersion":"4.58.4","addedDate":"2026-04-21","originalTopic":"PKI & Certificate Management","originalObjective":"4.1"},
    {"type":"mcq","question":"A network administrator creates the following three firewall rules in order: (1) Permit TCP 443 from ANY to 10.0.0.50; (2) Deny ALL from ANY to 10.0.0.50; (3) Permit TCP 22 from 192.168.1.100 to 10.0.0.50. An SSH connection from 192.168.1.100 to 10.0.0.50 is attempted. What happens?","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"The connection is permitted, because rule 3 explicitly allows SSH from that source.","B":"The connection is denied, because rule 2 blocks it before rule 3 is evaluated.","C":"The connection is permitted, because the source is on the trusted internal network.","D":"The connection is denied, because there is no rule 0 permitting SSH."},"answer":"B","explanation":"Firewall rules are evaluated top-to-bottom with first-match-wins semantics. The SSH connection does not match rule 1 (port 443, not 22), but DOES match rule 2 (deny ALL). Evaluation stops there — rule 3 is never reached. To fix this, rule 3 must be placed ABOVE rule 2, or the deny rule needs to be more specific. This is the classic \"rule order matters\" principle — same pattern trained in the ACL Builder’s Fix-It scenarios.","source":"curated-netplus-carryover","addedVersion":"4.58.4","addedDate":"2026-04-21","originalTopic":"Firewalls, DMZ & Security Zones","originalObjective":"4.3"},
    {"type":"mcq","question":"An attacker on the same local network segment as their target sends a crafted ARP reply claiming to be the gateway router. The target host updates its ARP cache with the attacker’s MAC address and begins sending all outbound traffic to the attacker, who forwards it on to the real gateway. Which attack does this describe?","difficulty":"Exam Level","topic":"Network Attacks","objective":"2.4","options":{"A":"DNS cache poisoning","B":"ARP poisoning (man-in-the-middle)","C":"DDoS amplification","D":"SYN flood"},"answer":"B","explanation":"ARP poisoning (also called ARP spoofing) manipulates the target’s ARP cache so the target sends traffic intended for the gateway to the attacker instead. The attacker can then inspect, modify, or drop traffic — classic man-in-the-middle positioning. DNS cache poisoning (A) manipulates DNS resolver caches, not ARP. DDoS amplification (C) floods the target from many sources, a volumetric DoS attack. SYN flood (D) exhausts TCP connection state on the target, a DoS but not MITM.","source":"curated-netplus-carryover","addedVersion":"4.58.4","addedDate":"2026-04-21","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"Which of the following is an example of a physical security control rather than a logical security control?","difficulty":"Foundational","topic":"Security Controls","objective":"1.1","options":{"A":"Firewall rule permitting HTTPS from specific IP ranges","B":"Mantrap requiring badge scan to enter the server room","C":"Password complexity policy enforced by Active Directory","D":"Endpoint antivirus scanning disk reads"},"answer":"B","explanation":"Physical security controls protect against unauthorised physical access to network infrastructure — mantraps, badge readers, CCTV, biometric locks, secure enclosures. Option A is a logical network control. Option C is an administrative/logical policy control. Option D is a logical endpoint control. Only Option B is a physical barrier against human access.","source":"curated-netplus-carryover","addedVersion":"4.58.4","addedDate":"2026-04-21","originalTopic":"Physical Security Controls","originalObjective":"4.5"},
    {"type":"mcq","question":"A remote employee connects to their corporate VPN. Their VPN client is configured so that ALL traffic from their laptop — including traffic to Google, to streaming services, and to the corporate intranet — is routed through the corporate VPN gateway before exiting to the internet. Which VPN tunnel mode does this describe?","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Split tunnel","B":"Full tunnel","C":"Clientless VPN","D":"Point-to-point VPN"},"answer":"B","explanation":"Full tunnel VPN (also called \"forced tunnel\") routes ALL client traffic through the VPN gateway. This gives the corporate security team full visibility into the user’s internet activity and can enforce policies like DLP, web filtering, and malware inspection on all traffic. The trade-off is higher bandwidth consumption on the VPN link, and the user’s internet traffic appears to originate from the corporate network. Split tunnel (A) is the opposite — only corporate-destined traffic uses the VPN. Clientless VPN (C) is a browser-based model, not a tunnel mode. Point-to-point (D) refers to dedicated WAN links.","source":"curated-netplus-carryover","addedVersion":"4.59.0","addedDate":"2026-04-21","originalTopic":"IPsec & VPN Protocols","originalObjective":"4.4"},
    {"type":"mcq","question":"A company wants to reduce bandwidth usage on their corporate VPN while still allowing remote users to access internal resources. They configure the VPN so that only traffic destined for internal subnets (10.0.0.0/8) goes through the VPN, while all other traffic (Google, SaaS apps, personal browsing) uses the user’s local internet directly. Which VPN tunnel mode is in use?","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Full tunnel","B":"Split tunnel","C":"Site-to-site IPsec","D":"Clientless VPN"},"answer":"B","explanation":"Split tunnel VPN routes only specific traffic (typically destined for internal corporate subnets) through the VPN, while all other traffic uses the client’s normal internet connection. This reduces VPN bandwidth load and improves user experience for non-corporate traffic. Security trade-off: corporate security controls do not see the user’s non-VPN traffic. Full tunnel (A) forces ALL traffic through the VPN. Site-to-site (C) connects networks. Clientless (D) is a different architecture.","source":"curated-netplus-carryover","addedVersion":"4.59.0","addedDate":"2026-04-21","originalTopic":"IPsec & VPN Protocols","originalObjective":"4.4"},
    {"type":"mcq","question":"A contractor needs occasional access to a company’s internal web-based HR portal from their personal laptop while travelling. The company does not want to install any VPN client software on the contractor’s machine, but they also need encrypted access to the internal-only HR portal. Which VPN solution best fits this requirement?","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"IPsec site-to-site VPN","B":"Full-tunnel IPsec remote access VPN","C":"Clientless SSL/TLS VPN (web portal access)","D":"GRE tunneling"},"answer":"C","explanation":"Clientless SSL/TLS VPN provides encrypted remote access to specific internal web applications through the user’s standard HTTPS-capable browser — no client software installed on the endpoint. Users authenticate through a web portal, then access allowed applications through a reverse-proxy architecture. IPsec site-to-site (A) connects networks, not individual browsers. IPsec remote access (B) requires a client. GRE (D) is a tunneling protocol, not a remote-access VPN architecture.","source":"curated-netplus-carryover","addedVersion":"4.59.0","addedDate":"2026-04-21","originalTopic":"SSL/TLS VPN","originalObjective":"4.4"},
    {"type":"mcq","question":"Which VPN architecture establishes a persistent, encrypted tunnel between two physical sites (such as a headquarters and a branch office) so that users at both sites can communicate as if on the same network, without requiring any VPN client on individual user endpoints?","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Remote access VPN (full tunnel)","B":"Remote access VPN (split tunnel)","C":"Site-to-site VPN","D":"Clientless SSL VPN"},"answer":"C","explanation":"Site-to-site VPN connects two networks via VPN gateways at each end (typically routers or firewalls). Individual users at both sites are transparently part of the same logical network — no per-user VPN client needed. Remote access VPNs (A, B) are for individual users connecting from outside. Clientless (D) is for individual users accessing specific apps through a browser.","source":"curated-netplus-carryover","addedVersion":"4.59.0","addedDate":"2026-04-21","originalTopic":"IPsec & VPN Protocols","originalObjective":"4.4"},
    {"type":"mcq","question":"A data center is being designed to protect expensive equipment from fire damage while minimizing the risk of accidental water release causing damage if a single sprinkler head is triggered or a pipe leaks. Which fire suppression system requires both a detection event (smoke or heat) AND a second triggering event (such as sprinkler activation) before water is released?","difficulty":"Exam Level","topic":"Security Controls","objective":"1.1","options":{"A":"Wet pipe system","B":"Dry pipe system","C":"Pre-action system","D":"Clean agent system (FM-200 / Inergen)"},"answer":"C","explanation":"A pre-action fire suppression system keeps the pipes empty until BOTH a detection event occurs AND a sprinkler head is triggered. Only then does water enter the system and release at the triggered sprinkler. This prevents accidental water damage from leaks or a single sprinkler head activation. Wet pipe (A) has water in pipes at all times — single trigger releases water instantly. Dry pipe (B) uses pressurized air; water enters when a sprinkler activates. Clean agent (D) uses gas (no water) — different category for server rooms where water damage must be avoided entirely.","source":"curated-netplus-carryover","addedVersion":"4.59.0","addedDate":"2026-04-21","originalTopic":"Physical Security Controls","originalObjective":"4.5"},
    {"type":"mcq","question":"An organization wants to verify that every device connecting to the corporate network has up-to-date antivirus signatures, an active host firewall, and meets a minimum OS patch level before being allowed onto the production VLAN. Non-compliant devices should be placed into a quarantine VLAN with limited access. Which security technology enables this posture-based admission control?","difficulty":"Exam Level","topic":"Identity & Access Management","objective":"4.6","options":{"A":"Network Access Control (NAC)","B":"Stateful firewall","C":"Intrusion Detection System (IDS)","D":"Network Address Translation (NAT)"},"answer":"A","explanation":"Network Access Control (NAC) evaluates endpoint posture (AV status, patch level, host firewall, certificate presence) before granting network access. Non-compliant devices are placed in quarantine VLANs, given limited access, or denied entirely. NAC integrates with 802.1X for authentication and VLAN assignment. A stateful firewall (B) tracks connection state but does not evaluate endpoint posture. IDS (C) detects suspicious traffic post-admission, not posture pre-admission. NAT (D) translates addresses and is unrelated.","source":"curated-netplus-carryover","addedVersion":"4.59.0","addedDate":"2026-04-21","originalTopic":"AAA & Authentication","originalObjective":"4.3"},
    {"type":"mcq","question":"A database server uses a RAID configuration with four 1 TB drives. The configuration stripes data across three drives for performance and stores distributed parity across all four, tolerating the failure of exactly one drive. What RAID level is this?","difficulty":"Exam Level","topic":"Resilience & Recovery","objective":"3.4","options":{"A":"RAID 0 (striping, no redundancy)","B":"RAID 1 (mirroring)","C":"RAID 5 (striping with distributed parity)","D":"RAID 10 (striped mirrors)"},"answer":"C","explanation":"RAID 5 stripes data and distributes parity blocks across all drives. It tolerates the loss of exactly one drive and provides both read performance and capacity efficiency (N-1 drives usable). RAID 0 (A) has no parity — any drive loss destroys data. RAID 1 (B) mirrors drives — requires two drives minimum, tolerates one failure, 50% capacity-efficient. RAID 10 (D) combines mirroring and striping — tolerates drive failures but uses 50% capacity.","source":"curated-netplus-carryover","addedVersion":"4.59.0","addedDate":"2026-04-21","originalTopic":"Business Continuity & Disaster Recovery","originalObjective":"3.3"},
    {"type":"mcq","question":"A network administrator takes a full backup every Sunday night. On Monday through Saturday, they want backups to capture only the files that have changed since the MOST RECENT backup of any type (reducing each daily backup’s size). Which backup type achieves this?","difficulty":"Foundational","topic":"Resilience & Recovery","objective":"3.4","options":{"A":"Full backup","B":"Incremental backup","C":"Differential backup","D":"Snapshot"},"answer":"B","explanation":"Incremental backups only back up files changed since the last backup of any type (full or incremental). Smallest daily size but slowest restore (requires all incrementals back to the last full). Differential (C) backs up files changed since the last FULL backup — grows larger each day but faster restore. Full (A) backs up everything every time. Snapshots (D) are point-in-time copies.","source":"curated-netplus-carryover","addedVersion":"4.59.1","addedDate":"2026-04-21","originalTopic":"Business Continuity & Disaster Recovery","originalObjective":"3.3"},
    {"type":"mcq","question":"A company is planning disaster recovery for their primary data centre. They want a secondary facility that has identical hardware, pre-loaded data kept in near-real-time sync, and the ability to take over production within minutes of a primary-site failure. Which DR site type does this describe?","difficulty":"Exam Level","topic":"Resilience & Recovery","objective":"3.4","options":{"A":"Cold site","B":"Warm site","C":"Hot site","D":"Bunker site"},"answer":"C","explanation":"A hot site is fully equipped and actively synchronised with the primary — failover can occur in minutes. Most expensive option but provides the fastest recovery. Cold site (A) has space and utilities only; hardware must be installed after a disaster (days/weeks recovery). Warm site (B) has hardware but no live data; recovery in hours to a day. Bunker site (D) is not a standard N10-009 term.","source":"curated-netplus-carryover","addedVersion":"4.59.1","addedDate":"2026-04-21","originalTopic":"Business Continuity & Disaster Recovery","originalObjective":"3.3"},
    {"type":"mcq","question":"A network engineer is comparing RADIUS and TACACS+ for centralised authentication. Which statement accurately describes a key difference between them?","difficulty":"Exam Level","topic":"Identity & Access Management","objective":"4.6","options":{"A":"RADIUS encrypts the entire packet; TACACS+ encrypts only the password.","B":"RADIUS encrypts only the password; TACACS+ encrypts the entire packet body.","C":"RADIUS uses TCP; TACACS+ uses UDP.","D":"RADIUS is Cisco-proprietary; TACACS+ is an IETF standard."},"answer":"B","explanation":"RADIUS (RFC 2865, UDP 1812/1813) encrypts only the password field. TACACS+ (Cisco-originated, TCP 49) encrypts the entire packet body, making it more secure for device-admin access. The protocol types are opposite of what C states: RADIUS=UDP, TACACS+=TCP. The open-standard relationship is opposite of what D states: TACACS+ is Cisco-originated but now broadly supported, RADIUS is IETF-standard.","source":"curated-netplus-carryover","addedVersion":"4.59.1","addedDate":"2026-04-21","originalTopic":"AAA & Authentication","originalObjective":"4.1"},
    {"type":"mcq","question":"An attacker sets up a rogue wireless access point in a coffee shop broadcasting the same SSID as the legitimate shop Wi-Fi, at a stronger signal. Unsuspecting customers connect to the rogue AP thinking it is the real one, giving the attacker a position to intercept their traffic. Which attack does this describe?","difficulty":"Exam Level","topic":"Network Attacks","objective":"2.4","options":{"A":"Deauthentication attack","B":"Evil twin attack","C":"Rogue DHCP","D":"ARP spoofing"},"answer":"B","explanation":"An evil twin is a rogue AP that impersonates a legitimate SSID at stronger signal strength, inducing victims to associate with the attacker. Once associated, the attacker performs MITM attacks on the victim’s traffic. Deauthentication (A) forces clients off a network; often a preparatory step, not the evil-twin mechanism itself. Rogue DHCP (C) hands out malicious DHCP leases. ARP spoofing (D) is wired-LAN MITM, not wireless impersonation.","source":"curated-netplus-carryover","addedVersion":"4.59.1","addedDate":"2026-04-21","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"A security architect is designing access controls for a new internal application. Users should be granted ONLY the specific permissions needed to perform their job function — no broader access. If a user changes roles, their permissions should be re-evaluated. Which security principle does this describe?","difficulty":"Hard","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Defence in depth","B":"Principle of least privilege","C":"Zero-trust architecture (assume breach)","D":"Security through obscurity"},"answer":"B","explanation":"Least privilege grants each user/process the minimum access needed for its function — reducing attack blast radius if the account is compromised. Permissions are reviewed when roles change. Defence in depth (A) layers multiple security controls. Zero-trust (C) is the broader philosophy that \"no access is implicitly trusted\" — least privilege is one implementation of it. Security through obscurity (D) is the (flawed) idea of hiding rather than securing.","source":"curated-netplus-carryover","addedVersion":"4.59.1","addedDate":"2026-04-21","originalTopic":"Securing TCP/IP","originalObjective":"4.1"},
    {"type":"mcq","question":"A Syslog server is configured to receive logs from all network devices. Which port does Syslog use by default, and over which transport protocol?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"TCP port 514","B":"UDP port 514","C":"TCP port 443","D":"UDP port 161"},"answer":"B","explanation":"Syslog traditionally uses UDP port 514 — chosen because logging is high-volume and UDP’s lower overhead is acceptable (occasional log loss is tolerable). RFC 5424 introduced Syslog over TCP (also 514) for reliability, but UDP 514 is the default on virtually all network equipment. TCP 443 is HTTPS. UDP 161 is SNMP polls.","source":"curated-netplus-carryover","addedVersion":"4.59.2","addedDate":"2026-04-21","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"A security team deploys a SIEM platform that receives logs from firewalls, web servers, authentication systems, and switches. The SIEM is expected to correlate events across these sources to identify attack patterns. Which statement BEST describes SIEM’s core value?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"It replaces the need for individual security tools at each device","B":"It aggregates logs from multiple sources and correlates events to detect patterns that individual tools would miss","C":"It automatically blocks malicious traffic at the network perimeter","D":"It provides bandwidth analysis between devices"},"answer":"B","explanation":"A SIEM’s core value is log aggregation + correlation — combining signals from different sources (e.g., failed login + firewall block + suspicious file access) to identify patterns no single tool would catch. Option A is wrong — SIEM complements, not replaces, point security tools. Option C describes a firewall or IPS, not SIEM. Option D describes NetFlow.","source":"curated-netplus-carryover","addedVersion":"4.59.2","addedDate":"2026-04-21","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"A DR plan specifies that a database must be restorable to any point in time within the last 24 hours, not just to the most recent full backup. Which backup strategy achieves this requirement?","difficulty":"Hard","topic":"Resilience & Recovery","objective":"3.4","options":{"A":"Daily full backups only, retained for 7 days","B":"Daily full backups plus continuous transaction-log archiving (point-in-time recovery)","C":"Weekly full backups, retained for 4 weeks","D":"Daily differential backups without any full backups"},"answer":"B","explanation":"Point-in-time recovery requires a full backup (baseline) PLUS continuous capture of transaction logs (journal). To restore to any moment, you replay the full backup then apply log entries up to the target time. Option A can only restore to the moment of each full backup — not between. Option C has the same limitation. Option D is invalid — differentials require a full backup baseline to be meaningful.","source":"curated-netplus-carryover","addedVersion":"4.59.2","addedDate":"2026-04-21","originalTopic":"Business Continuity & Disaster Recovery","originalObjective":"3.3"},
    {"type":"mcq","question":"A company deploys internal web applications accessible only from specific trusted internal subnets. External threats keep trying to access these apps from the internet. Which network design principle best addresses this by isolating the applications from untrusted networks?","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Network segmentation with VLANs and firewall policies","B":"Implementing a strong password policy","C":"Enabling SNMPv3","D":"Deploying host-based antivirus"},"answer":"A","explanation":"Network segmentation isolates workloads into distinct VLANs/subnets, enforced by firewall rules, so untrusted networks simply cannot reach the restricted apps at all. Defence-in-depth principle: limit blast radius. Password policy (B) protects access but does not prevent network-level reachability. SNMPv3 (C) is management traffic security. Antivirus (D) protects endpoints, not network isolation.","source":"curated-netplus-carryover","addedVersion":"4.59.2","addedDate":"2026-04-21","originalTopic":"Protecting Networks","originalObjective":"4.3"},
    {"type":"mcq","question":"In the 802.1X authentication framework used by WPA-Enterprise wireless networks, which role is played by the device attempting to connect (such as a laptop)?","difficulty":"Exam Level","topic":"Authentication Methods (MFA/SSO)","objective":"4.6","options":{"A":"Supplicant","B":"Authenticator","C":"Authentication Server","D":"Certificate Authority"},"answer":"A","explanation":"802.1X defines three roles: Supplicant (the client device attempting access), Authenticator (the switch/AP that controls port access and relays credentials), and Authentication Server (typically RADIUS, which validates credentials). CA (D) issues certificates if EAP-TLS is used but is not itself an 802.1X role.","source":"curated-netplus-carryover","addedVersion":"4.59.2","addedDate":"2026-04-21","originalTopic":"WPA3 & EAP Authentication","originalObjective":"4.4"},
    {"type":"mcq","question":"A user visits https://example.com and their browser displays a warning that the certificate has been revoked. The browser determined this status by checking a specific PKI mechanism in real time. Which mechanism did the browser use?","difficulty":"Hard","topic":"PKI & Certificate Management","objective":"1.4","options":{"A":"Certificate chain validation","B":"Online Certificate Status Protocol (OCSP)","C":"Certificate pinning","D":"Self-signed certificate check"},"answer":"B","explanation":"OCSP lets a browser query a certificate authority’s OCSP responder in real time to check if a certificate has been revoked. The older alternative, CRL (Certificate Revocation List), is a downloaded list updated periodically. Chain validation (A) verifies certificate authenticity via signed chain, not revocation. Certificate pinning (C) hard-codes expected certs in client apps. Self-signed checks (D) are unrelated.","source":"curated-netplus-carryover","addedVersion":"4.59.2","addedDate":"2026-04-21","originalTopic":"PKI & Certificate Management","originalObjective":"4.1"},
    {"type":"mcq","question":"An attacker sends thousands of spoofed SYN packets to a web server without ever completing the TCP handshake. The server’s connection state table fills up, and legitimate users cannot establish new connections. Which attack is this?","difficulty":"Exam Level","topic":"Network Attacks","objective":"2.4","options":{"A":"ARP poisoning","B":"SYN flood (a type of DoS attack)","C":"Man-in-the-middle","D":"SQL injection"},"answer":"B","explanation":"A SYN flood exhausts the server’s half-open connection table by sending SYN packets and never responding to the SYN-ACK. With the table full, legitimate clients cannot initiate new connections. This is a denial-of-service (DoS) attack at the TCP layer. ARP poisoning (A) is MITM on the local LAN. MITM (C) intercepts traffic but does not necessarily DoS. SQL injection (D) targets application-layer database queries.","source":"curated-netplus-carryover","addedVersion":"4.59.2","addedDate":"2026-04-21","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"Which type of disaster recovery exercise involves team members walking through a scenario verbally in a conference room, without touching real systems?","difficulty":"Foundational","topic":"Resilience & Recovery","objective":"3.4","options":{"A":"Full interruption test","B":"Parallel test","C":"Tabletop exercise","D":"Simulation test with live failover"},"answer":"C","explanation":"A tabletop exercise is a discussion-based walkthrough of a DR scenario — no systems are touched, no failover occurs. It is the lowest-risk, lowest-cost way to validate that procedures, contact lists, and decision-making are sound. Parallel tests (B) run DR systems alongside prod. Full interruption (A) takes prod down and shifts to DR — highest fidelity, highest risk.","source":"curated-netplus-carryover","addedVersion":"4.59.3","addedDate":"2026-04-21","originalTopic":"Business Continuity & Disaster Recovery","originalObjective":"3.3"},
    {"type":"mcq","question":"Which authentication protocol uses tickets issued by a Key Distribution Center (KDC) with an Authentication Server (AS) and a Ticket Granting Server (TGS)?","difficulty":"Exam Level","topic":"Identity & Access Management","objective":"4.6","options":{"A":"RADIUS","B":"TACACS+","C":"Kerberos","D":"LDAP"},"answer":"C","explanation":"Kerberos is the ticket-based authentication protocol used in Active Directory and many UNIX single-sign-on environments. A KDC issues a Ticket Granting Ticket (TGT) via the AS on initial logon; the TGT is then presented to the TGS to get service tickets for specific resources. RADIUS/TACACS+ are AAA for network device access. LDAP is a directory lookup protocol, not a ticket-based auth protocol.","source":"curated-netplus-carryover","addedVersion":"4.59.3","addedDate":"2026-04-21","originalTopic":"AAA & Authentication","originalObjective":"4.4"},
    {"type":"mcq","question":"A CISO is migrating the company away from a flat internal network with a hardened perimeter to a model where every request — regardless of origin — is continuously verified. Which principle best summarises this approach?","scenario":"Historically, the corporate LAN was treated as trusted and the Internet as untrusted. The new model assumes the attacker may already be inside, so identity, device posture, and context must be validated for every resource access — even on the LAN.","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Defense in depth — layer security controls across the perimeter","B":"Zero trust — never trust, always verify, regardless of network location","C":"Least functionality — disable unused services on servers","D":"Implicit allow — default-permit with exception-based blocks"},"answer":"B","explanation":"Zero-trust architecture (ZTA) removes the implicit trust of network location. Every access request is authenticated, authorized, and encrypted — identity + device posture + context are all evaluated continuously, not just at the perimeter. Defense in depth (A) is a related but broader concept. Least functionality (C) is a hardening principle. Implicit allow (D) is the opposite of zero-trust.","source":"curated-netplus-carryover","addedVersion":"4.59.3","addedDate":"2026-04-21","originalTopic":"Securing TCP/IP","originalObjective":"4.1"},
    {"type":"mcq","question":"A security team wants a perimeter appliance that can identify traffic by application (not just by port), terminate TLS to inspect encrypted payloads, and integrate IPS signatures inline. Which appliance category is correct?","scenario":"The legacy stateful firewall only filters by 5-tuple, so malware tunneling over port 443 is invisible. The team wants a single device that can block traffic by app identity and scan content without buying a separate IPS appliance.","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Stateless packet filter","B":"Traditional stateful firewall","C":"Next-Generation Firewall (NGFW)","D":"Proxy server (forward proxy)"},"answer":"C","explanation":"NGFW is defined by app-aware filtering (identifying Facebook, BitTorrent, SSH-tunneled-over-443, etc., independent of port), integrated IPS, and TLS decryption for deep packet inspection. Stateless (A) and stateful (B) firewalls filter on 5-tuple only — they cannot see inside an HTTPS flow. A forward proxy (D) can inspect HTTP/HTTPS but is not a firewall appliance category.","source":"curated-netplus-carryover","addedVersion":"4.59.3","addedDate":"2026-04-21","originalTopic":"Firewalls, DMZ & Security Zones","originalObjective":"4.3"},
    {"type":"mcq","question":"A finance manager receives an email that appears to come from the CEO requesting an urgent $47,000 wire transfer to a new vendor. The email uses the CEOs actual name, references a real project, and arrives while the CEO is travelling. Which attack is this?","scenario":"The email is well-written, targets a specific person, references internal-sounding details, and pressures urgency. It is not a mass phishing blast to thousands of addresses.","difficulty":"Hard","topic":"Network Attacks","objective":"2.4","options":{"A":"Generic phishing (mass email)","B":"Spear phishing / Business Email Compromise (BEC)","C":"Smishing (SMS-based phishing)","D":"DNS cache poisoning"},"answer":"B","explanation":"Spear phishing targets a specific individual with researched personal details; Business Email Compromise (BEC) specifically impersonates executives to trigger wire transfers or gift-card purchases. Hallmarks: specific name, real project references, urgency, and a new vendor/payment destination. Generic phishing (A) is mass, not targeted. Smishing (C) is SMS-based. DNS poisoning (D) is a network-layer attack, not email content.","source":"curated-netplus-carryover","addedVersion":"4.59.3","addedDate":"2026-04-21","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"Which SNMP version adds authentication (MD5/SHA) and encryption (DES/AES) for message confidentiality and integrity?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"SNMPv1 — plaintext community strings","B":"SNMPv2c — plaintext community strings with 64-bit counters","C":"SNMPv3 — user-based security model with authNoPriv and authPriv modes","D":"All SNMP versions include encryption by default"},"answer":"C","explanation":"SNMPv3 introduced the User-based Security Model (USM) with three security levels: noAuthNoPriv (no security), authNoPriv (authentication only, no encryption), and authPriv (both). Auth uses MD5 or SHA HMACs; privacy uses DES or AES encryption. SNMPv1 and SNMPv2c send community strings in plaintext (A, B). D is factually wrong — v1/v2c are plaintext.","source":"curated-netplus-carryover","addedVersion":"4.59.4","addedDate":"2026-04-21","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"An organisation wants per-user authentication at every access switchport — users authenticate with credentials before getting a VLAN assignment and network access. Which technology provides this?","scenario":"Port-based MAC filtering is currently used but can be spoofed easily. The security team wants identity-based access with dynamic VLAN assignment based on who is logging in, not what MAC is plugged in.","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Port security (sticky MAC) — learns and locks MAC addresses per port","B":"802.1X (EAP-based port-based authentication) — client supplicant authenticates via RADIUS before port opens","C":"MAC ACLs — static MAC whitelist","D":"BPDU Guard — err-disables ports that receive BPDUs"},"answer":"B","explanation":"802.1X is the IEEE standard for identity-based port access control. The client (supplicant) sends credentials via EAP to the switch (authenticator), which forwards to a RADIUS server (authentication server). On success, the RADIUS server can assign a dynamic VLAN based on user identity or group. Port security (A) filters by MAC — easy to spoof. MAC ACLs (C) are static. BPDU Guard (D) is loop prevention on PortFast ports.","source":"curated-netplus-carryover","addedVersion":"4.59.4","addedDate":"2026-04-21","originalTopic":"Protecting Networks","originalObjective":"4.3"},
    {"type":"mcq","question":"An attacker calls the help desk claiming to be a new remote employee whose laptop has crashed, urgently requesting a password reset for the accounting VP. The attacker has researched the VP name and project details. Which social engineering technique is this?","scenario":"The attacker never physically enters the building. The attack is entirely by phone, relying on believable backstory and urgency to manipulate the help desk.","difficulty":"Exam Level","topic":"Network Attacks","objective":"2.4","options":{"A":"Tailgating — following an authorised person through a secured door","B":"Shoulder surfing — observing credentials over someone shoulder","C":"Pretexting — inventing a believable scenario to extract information or trigger an action","D":"Dumpster diving — recovering discarded documents"},"answer":"C","explanation":"Pretexting is the social-engineering technique of creating a fabricated scenario (pretext) to manipulate the target. Help-desk impersonation calls with researched details are the classic example. Tailgating (A) is physical. Shoulder surfing (B) is observational. Dumpster diving (D) is physical retrieval. Pretexting underlies most phone-based social engineering and BEC attacks.","source":"curated-netplus-carryover","addedVersion":"4.59.4","addedDate":"2026-04-21","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"Which certificate-revocation method provides real-time per-certificate status lookup rather than downloading a large periodic list?","difficulty":"Exam Level","topic":"PKI & Certificate Management","objective":"1.4","options":{"A":"Certificate Revocation List (CRL) — periodic signed list of revoked serial numbers","B":"Online Certificate Status Protocol (OCSP) — HTTP-based per-certificate status query returning \"good\", \"revoked\", or \"unknown\"","C":"Certificate transparency logs — append-only public log","D":"Perfect Forward Secrecy (PFS) — ephemeral key exchange"},"answer":"B","explanation":"OCSP (RFC 6960) queries the CA responder for a single certificate serial number and returns \"good\", \"revoked\", or \"unknown\" in real time. CRLs (A) are periodically-published lists that must be downloaded in full — slower and staler. CT logs (C) track issuance, not revocation. PFS (D) is a key-exchange property, unrelated to revocation. OCSP Stapling (RFC 6066) extends this further by having the server cache and present the OCSP response to avoid client-side lookups.","source":"curated-netplus-carryover","addedVersion":"4.59.4","addedDate":"2026-04-21","originalTopic":"PKI & Certificate Management","originalObjective":"4.4"},
    {"type":"mcq","question":"A very high-speed core switch (400 Gbps) is too fast for full-flow traffic accounting without overwhelming the collector. Which technology uses packet sampling to scale to line rates?","scenario":"NetFlow export on this switch would hit ~5 million flows/minute and saturate the collector. The team accepts statistical sampling rather than full-flow accuracy to keep visibility at 400G.","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"sFlow — statistical packet sampling (e.g., 1 in 2048), counter polling; designed for high-speed interfaces","B":"Full NetFlow v9 — record every flow","C":"SNMP walks of every MIB","D":"Syslog only"},"answer":"A","explanation":"sFlow (RFC 3176) samples packets at a configurable rate (typical 1-in-2048 or 1-in-1024) and exports the samples plus interface counters. That scales to 400G+ linerates because CPU cost is fixed per sample. Full NetFlow (B) tracks every flow and does not scale to very high linerates. SNMP walks (C) and syslog (D) give no flow visibility.","source":"curated-netplus-carryover","addedVersion":"4.59.5","addedDate":"2026-04-21","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"Which platform aggregates logs from firewalls, IDS/IPS, servers, switches, and authentication systems into one searchable store with correlation rules and alerting?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"Syslog server with flat file rotation only","B":"SNMP poller","C":"SIEM (Security Information and Event Management) — centralised log aggregation + correlation + alerting","D":"NetFlow collector"},"answer":"C","explanation":"A SIEM (Splunk, QRadar, Sentinel, Elastic Security, etc.) pulls logs from heterogeneous sources, normalises them, applies correlation rules (e.g., repeated auth failure + successful login from new geo), and produces alerts. A raw syslog server (A) stores logs but lacks correlation. SNMP (B) and NetFlow (D) handle different data types (device health / traffic flows).","source":"curated-netplus-carryover","addedVersion":"4.59.5","addedDate":"2026-04-21","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"A network team must decide whether to upgrade a WAN circuit from 500 Mbps to 1 Gbps. They have 12 months of SNMP + NetFlow data. Which analytical approach best informs the decision?","scenario":"Peak utilisation has been creeping upward month over month. The team wants to project when the current 500 Mbps will become insufficient, rather than reacting after the link is saturated.","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"Capacity planning / trend analysis — project utilisation growth, extrapolate to identify when capacity will be exhausted","B":"One-time ping test","C":"Vulnerability scan of the circuit","D":"Log retention policy review"},"answer":"A","explanation":"Capacity planning uses historical trend data (NetFlow, SNMP counters, baseline utilisation) to project future demand and identify the inflection point where current capacity will be insufficient. Typical approach: plot monthly peak + 95th-percentile utilisation over time, fit a trend line, cross the capacity threshold — that is the upgrade trigger. Ping (B), vulnerability scan (C), and log retention (D) do not address growth projection.","source":"curated-netplus-carryover","addedVersion":"4.59.6","addedDate":"2026-04-21","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"Which detection method flags traffic that deviates from a learned baseline of normal network behavior?","difficulty":"Foundational","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"Signature-based detection","B":"Anomaly-based detection","C":"Heuristic blacklist matching","D":"Static threshold alerting"},"answer":"B","explanation":"Anomaly-based detection establishes a baseline of normal behavior (traffic volume, protocol distribution, login patterns, etc.) and alerts when actual traffic deviates from that baseline. Signature-based (A) matches against known-bad patterns. Heuristic blacklists (C) check identifiers against known-bad lists. Static thresholds (D) trigger on fixed numbers regardless of normal — not anomaly-based.","source":"curated-netplus-carryover","addedVersion":"4.85.19","addedDate":"2026-05-02","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"multi-select","question":"(Choose TWO) Which statements correctly describe anomaly-based detection compared to signature-based detection?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"Anomaly-based detection can identify zero-day attacks because no prior signature is required","B":"Anomaly-based detection produces fewer false positives than signature-based","C":"Anomaly-based detection requires a learning/baseline period before becoming effective","D":"Anomaly-based detection cannot detect known malware","E":"Anomaly-based detection only works on encrypted traffic"},"answers":["A","C"],"explanation":"A and C correctly describe anomaly-based detection. The trade-off is that it can catch zero-days (A) but requires a baseline to be learned first (C). B is wrong — anomaly-based typically produces MORE false positives than signature-based, since \"different from baseline\" can mean legitimate change. D is wrong — anomaly-based can detect known malware too if its behavior deviates from baseline. E is fabricated.","source":"curated-netplus-carryover","addedVersion":"4.85.19","addedDate":"2026-05-02","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"A NIDS is configured with anomaly-based detection. After deployment, the system generates many alerts during the normal monthly billing run. What is the MOST LIKELY cause and the appropriate response?","difficulty":"Hard","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"The NIDS is malfunctioning — replace the appliance","B":"The baseline did not include the billing run's legitimate traffic spike — extend the learning period or whitelist the pattern","C":"The billing run is using outdated TLS — upgrade the application","D":"The signatures are out of date — apply the latest signature update"},"answer":"B","explanation":"Anomaly-based detection learns a baseline of normal behavior; if the baseline period missed a recurring legitimate spike (like a monthly billing run), that spike registers as an anomaly the first time it happens. The fix is to extend the learning period to cover full billing cycles or whitelist the known pattern. A is overreaction. C is unrelated. D applies to signature-based, not anomaly-based, detection.","source":"curated-netplus-carryover","addedVersion":"4.85.19","addedDate":"2026-05-02","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"Which security principle requires that no single individual can perform a critical task end-to-end without input or approval from another person?","difficulty":"Foundational","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Least privilege","B":"Defense in depth","C":"Separation of duties","D":"Implicit deny"},"answer":"C","explanation":"Separation of duties divides a critical task across multiple people so that no single individual can complete it alone, reducing fraud and error risk. Least privilege (A) is about minimum permissions per person, not splitting tasks across people. Defense in depth (B) is about layered controls. Implicit deny (D) is a firewall rule-set concept.","source":"curated-netplus-carryover","addedVersion":"4.85.19","addedDate":"2026-05-02","originalTopic":"Protecting Networks","originalObjective":"4.1"},
    {"type":"mcq","question":"A finance department requires that the person who APPROVES a wire transfer cannot also be the person who INITIATES it. Which security principle is this implementing?","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Separation of duties — splitting approval and initiation across two roles","B":"Least privilege — limiting each role to only required permissions","C":"Mandatory access control — labels enforce who can approve","D":"Need to know — restricting visibility of the transfer details"},"answer":"A","explanation":"Separation of duties is precisely the principle of splitting initiation and approval into two distinct roles to prevent a single person from completing a high-risk task alone. Least privilege (B) is related but addresses individual permissions, not task partitioning. MAC (C) governs access to labeled data. Need-to-know (D) restricts visibility, not workflow steps.","source":"curated-netplus-carryover","addedVersion":"4.85.19","addedDate":"2026-05-02","originalTopic":"Protecting Networks","originalObjective":"4.1"},
    {"type":"multi-select","question":"(Choose TWO) Which controls implement separation of duties in a typical IT environment?","difficulty":"Hard","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Requiring change-management approvals from a different person than the one who proposed the change","B":"Splitting password vault access from system administration access into separate roles","C":"Encrypting backup archives at rest with AES-256","D":"Installing a stateful firewall at the network edge","E":"Configuring account lockout after 5 failed logins"},"answers":["A","B"],"explanation":"A and B are workflow controls that split a sensitive task between two roles — change approval (A) and credentials management (B) — preventing a single individual from completing the entire chain. C, D, and E are valuable security controls but address different principles (data confidentiality, perimeter defense, and brute-force protection respectively), not separation of duties.","source":"curated-netplus-carryover","addedVersion":"4.85.19","addedDate":"2026-05-02","originalTopic":"Protecting Networks","originalObjective":"4.1"},
    {"type":"mcq","question":"In a NAC (Network Access Control) deployment, what distinguishes a NON-PERSISTENT agent from a persistent agent?","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"A non-persistent agent is downloaded for the session, runs the posture check, then is removed; a persistent agent is installed permanently","B":"A non-persistent agent only checks for malware; a persistent agent also checks patches","C":"A non-persistent agent uses certificates; a persistent agent uses passwords","D":"A non-persistent agent runs only on Windows; a persistent agent runs on any OS"},"answer":"A","explanation":"A non-persistent (sometimes \"dissolvable\") NAC agent is fetched at connection time (often via a captive portal), performs the posture/health check, then exits — leaving nothing behind on the host. A persistent agent is installed as a permanent service that monitors continuously and can re-evaluate posture without user action. B–D are fabricated distinctions.","source":"curated-netplus-carryover","addedVersion":"4.85.19","addedDate":"2026-05-02","originalTopic":"Protecting Networks","originalObjective":"4.3"},
    {"type":"mcq","question":"A consultancy firm allows visiting contractors' personal laptops to connect to the guest VLAN after passing a NAC posture check. The IT team prefers not to install permanent software on the contractor devices. Which NAC agent type best fits this scenario?","difficulty":"Exam Level","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Non-persistent (dissolvable) agent — downloads, runs the check, then removes itself","B":"Persistent agent — installed as a permanent service for ongoing posture monitoring","C":"Agentless NAC — relies entirely on network-side traffic inspection without any client-side check","D":"Hardware token — issued to each contractor for the visit"},"answer":"A","explanation":"A non-persistent agent is purpose-built for guest/contractor scenarios — it is fetched once, performs the posture check, then exits and can be removed without trace. A persistent agent (B) would require installation, which the IT team explicitly wants to avoid. Agentless (C) doesn't do client-side posture (no patch/AV/firewall checks). D is unrelated to NAC posture.","source":"curated-netplus-carryover","addedVersion":"4.85.19","addedDate":"2026-05-02","originalTopic":"Protecting Networks","originalObjective":"4.3"},
    {"type":"multi-select","question":"(Choose TWO) Which are accurate trade-offs of using a non-persistent NAC agent compared to a persistent agent?","difficulty":"Hard","topic":"Network Security Architecture","objective":"3.2","options":{"A":"Non-persistent leaves no permanent software footprint on the client","B":"Non-persistent only checks posture once at connection time; it cannot continuously monitor compliance during the session","C":"Non-persistent requires the user to provide root/admin credentials every time","D":"Non-persistent provides stronger encryption than persistent agents","E":"Non-persistent is mandated by 802.1X for all wireless authentication"},"answers":["A","B"],"explanation":"A and B are the correct trade-offs. The benefit (A) is no permanent footprint — ideal for guests/contractors. The cost (B) is one-time-only posture: if the host's compliance changes mid-session (AV gets disabled, an exploit lands), the non-persistent agent is gone and cannot detect it. C is fabricated. D is irrelevant — encryption strength is independent. E is wrong — 802.1X does not mandate any specific NAC agent type.","source":"curated-netplus-carryover","addedVersion":"4.85.19","addedDate":"2026-05-02","originalTopic":"Protecting Networks","originalObjective":"4.3"},
    {"type":"mcq","question":"Which of the following BEST defines bandwidth in a networking context?","difficulty":"Foundational","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"The maximum theoretical data-carrying capacity of a link, typically expressed in bits per second","B":"The actual measured rate of data successfully delivered over a link","C":"The delay between a packet leaving the source and arriving at the destination","D":"The variation in delay over time"},"answer":"A","explanation":"Bandwidth is the THEORETICAL max capacity of a link — e.g., 1 Gbps Ethernet has 1 Gbps of bandwidth. B is throughput (the actual measured rate, which is always ≤ bandwidth due to overhead, congestion, errors). C is latency. D is jitter. Confusing bandwidth with throughput is one of the most common networking mix-ups.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"A 1 Gbps Ethernet link consistently delivers 940 Mbps of useful data when transferring large files. How should this be characterized?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"The bandwidth is 1 Gbps; the throughput is 940 Mbps; the difference is normal protocol overhead (framing, headers, IFG, etc.)","B":"The bandwidth is 940 Mbps; the link is mislabeled","C":"The throughput is 1 Gbps; the bandwidth is 940 Mbps","D":"The link is failing and should be replaced — 1 Gbps should deliver exactly 1 Gbps of useful data"},"answer":"A","explanation":"Bandwidth = max theoretical (1 Gbps). Throughput = actual delivered useful data (940 Mbps). The ~6% gap is expected overhead: Ethernet framing, IP/TCP headers, inter-frame gap (12 bytes between frames), preamble. Achieving 940 Mbps on a 1 Gbps link is, in fact, exceptional throughput. B and C confuse the terms. D misunderstands that bandwidth is theoretical maximum, not guaranteed delivered useful payload.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"An ISP advertises \"up to 100 Mbps\" download speeds. A user runs a speed test and consistently sees 85-92 Mbps. Which statement BEST describes the situation?","difficulty":"Hard","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"The bandwidth is 100 Mbps (advertised theoretical max); the throughput is 85-92 Mbps (actual delivered, reduced by protocol overhead, ISP equipment, and contention)","B":"The user is being throttled — they should call the ISP for a refund","C":"The link is broken — 100 Mbps should always deliver exactly 100 Mbps","D":"The user has a malware infection consuming bandwidth"},"answer":"A","explanation":"\"Up to\" advertised speeds are bandwidth (theoretical maximum). Throughput is what actually arrives, and it's always less due to: protocol overhead, equipment processing, contention with other users on the same link, and Wi-Fi/cabling losses. 85-92% of advertised is normal performance for a residential broadband connection. B is a misunderstanding. C confuses bandwidth with throughput. D is unsupported by the data given.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"In networking, what does latency measure?","difficulty":"Foundational","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"The delay between a packet leaving the source and arriving at the destination","B":"The maximum theoretical data rate of a link","C":"The variation in arrival time of consecutive packets","D":"The percentage of packets lost during transmission"},"answer":"A","explanation":"Latency = delay from source to destination, typically measured in milliseconds. B is bandwidth. C is jitter (latency variation). D is packet loss. Round-trip latency (RTT) is what tools like ping measure — it's 2× one-way latency.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"A web application user complains of slow performance, specifically \"the page takes a long time to start loading even though it loads quickly once it starts.\" Which network metric is MOST LIKELY the issue?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"High latency — initial connection setup (DNS, TCP handshake, TLS) is delayed but then transfers fast once established","B":"Low bandwidth — transfers are slow throughout","C":"High jitter — would cause uneven streaming but not slow start","D":"High packet loss — would cause TCP retransmissions throughout"},"answer":"A","explanation":"High latency (typically RTT) primarily impacts CONNECTION SETUP — DNS lookup, TCP three-way handshake, TLS handshake all add multiple round-trips before any data flows. A user with high RTT but adequate bandwidth would see \"slow to start, fast once started.\" Low bandwidth (B) would cause slow throughout. Jitter (C) affects real-time streaming. Loss (D) would cause variability and retransmits, not specifically slow-start behavior.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"Which contributes MOST significantly to latency on a long-distance fiber link spanning thousands of kilometers?","difficulty":"Hard","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"Propagation delay — light travels at ~200,000 km/s in fiber, so each 1000 km adds ~5ms one-way regardless of bandwidth","B":"Serialization delay — large frames take time to clock out","C":"Processing delay at endpoints","D":"Wireless interference along the path"},"answer":"A","explanation":"For long-distance links, propagation delay dominates: light in fiber travels at roughly 200,000 km/s (about 2/3 c due to refractive index), so 1000 km of fiber adds ~5ms of one-way propagation latency, regardless of how fast the endpoints are. This is the fundamental physics floor — you cannot beat the speed of light in glass. Serialization (B), processing (C), and wireless interference (D) become relatively minor on long-distance high-speed links.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"In networking, what does jitter measure?","difficulty":"Foundational","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"The variation in delay between consecutive packets arriving at the destination","B":"The total round-trip delay between source and destination","C":"The percentage of packets that arrive out of order","D":"The percentage of packets that fail to arrive at all"},"answer":"A","explanation":"Jitter = variability in packet arrival timing. If packets sent at 20ms intervals arrive at 18ms, 22ms, 19ms, 25ms intervals, that variation IS jitter. B is latency (the delay itself, not its variation). C is reordering (different metric). D is packet loss.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"Which application is MOST sensitive to jitter, and why?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"Real-time voice (VoIP) and video conferencing — uneven packet arrival causes audio/video stutter and gaps in the playback buffer","B":"Email — slow delivery is acceptable","C":"Bulk file transfer — TCP automatically reorders out-of-order packets","D":"Web browsing — pages load asynchronously"},"answer":"A","explanation":"Real-time voice and video are extremely jitter-sensitive because they have a fixed-size playout buffer. If packets arrive too unevenly, the buffer either runs dry (causing audible/visible gaps) or overflows (causing dropped audio/video). Email (B) and file transfer (C) are buffered and order-tolerant — TCP retransmits and reassembles. Web (D) tolerates uneven page loads acceptably.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"multi-select","question":"(Choose TWO) Which network conditions can cause jitter?","difficulty":"Hard","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"Variable queueing delays at intermediate routers under fluctuating congestion","B":"Different packets taking different paths with different propagation latencies","C":"A perfectly stable high-bandwidth link with no contention","D":"A direct fiber connection between adjacent equipment racks","E":"Symmetric routing with low utilization"},"answers":["A","B"],"explanation":"A and B are common causes of jitter. Variable queueing (A) — when one packet sails through a router but the next finds a full queue and has to wait, that's jitter. Path variability (B) — load-balanced or asymmetric routing can send packets along different-length paths, producing varying latency. C, D, and E describe stable conditions that produce LOW jitter.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"In networking, what does throughput measure?","difficulty":"Foundational","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"The actual rate of useful data successfully delivered over a link in a given time period","B":"The maximum theoretical capacity of a link","C":"The variation in latency between packets","D":"The number of hops between source and destination"},"answer":"A","explanation":"Throughput = real-world delivered data rate, measured. B is bandwidth (theoretical max). C is jitter. D is hop count. Throughput is always ≤ bandwidth because of overhead (protocol headers, IFG), congestion, and errors that reduce useful payload below the theoretical maximum.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"A 10 Gbps fiber link is being benchmarked. The test reports 9.2 Gbps of measured useful data delivery. Which is the MOST ACCURATE description?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"The link's bandwidth is 10 Gbps; its throughput is 9.2 Gbps; the 8% gap is normal overhead and processing","B":"The link is failing — 10 Gbps should deliver 10 Gbps","C":"The link is over-provisioned — measured throughput exceeds bandwidth","D":"The benchmark tool is broken — single tests can't measure throughput"},"answer":"A","explanation":"Bandwidth = 10 Gbps theoretical. Throughput = 9.2 Gbps actual measured useful data. The 8% gap is normal protocol overhead (Ethernet framing, IP/TCP headers, IFG, NIC processing). On 10 Gigabit Ethernet, anything north of 9 Gbps is solid throughput. B misunderstands the bandwidth/throughput distinction. C is impossible — throughput cannot exceed bandwidth. D is unsupported.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"A user complains that their 1 Gbps office connection consistently delivers only ~400 Mbps when transferring files to a server, despite the link showing as 1 Gbps full-duplex on both ends. What is the MOST LIKELY cause to investigate FIRST?","difficulty":"Hard","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"A bottleneck somewhere in the path: TCP window-size limits, an intermediate slower link, server disk I/O cap, or overall path congestion","B":"The bandwidth is mislabeled — 1 Gbps was a typo for 400 Mbps","C":"Jitter — variable latency drops effective throughput","D":"The cable needs to be replaced"},"answer":"A","explanation":"When throughput on a 1 Gbps link is consistently sub-50%, the issue is almost always a bottleneck somewhere — small TCP window for the BDP (bandwidth-delay product), an intermediate link at lower capacity, server-side disk/CPU bottleneck, or congestion. Start with `iperf` to test pure network throughput end-to-end without server-side disk involvement. B is unrealistic. C — jitter affects real-time apps but bulk TCP transfer is jitter-tolerant. D is a guess; cable issues usually show as errors, not consistent capped throughput.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"In a security context, what is an EXPLOIT?","difficulty":"Foundational","topic":"Network Attacks","objective":"2.4","options":{"A":"A piece of code, technique, or sequence of actions that takes advantage of a vulnerability to compromise a system","B":"A flaw or weakness in software or configuration","C":"A defensive control that mitigates risk","D":"A security audit report"},"answer":"A","explanation":"An exploit is the WEAPON — code or technique that uses a vulnerability to actually compromise a target. B describes the vulnerability (the flaw being exploited). The relationship: a vulnerability is the unlocked door; an exploit is the act of walking through it. C is a control. D is documentation.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"Researchers discover a previously-unknown flaw in a popular web server. Within hours, attacker code circulates that uses that flaw to gain remote code execution. Which term BEST describes the attacker code?","difficulty":"Exam Level","topic":"Network Attacks","objective":"2.4","options":{"A":"Zero-day exploit — code that exploits a vulnerability before a patch is available","B":"Patch — corrects the vulnerability","C":"Vulnerability disclosure — describes the flaw responsibly","D":"Threat actor — the human or group behind the attack"},"answer":"A","explanation":"A zero-day exploit is attacker code targeting a vulnerability for which no patch exists yet (defenders have had \"zero days\" to fix). The flaw itself is the zero-day vulnerability; the attacker code is the zero-day exploit. B is the defensive fix. C is the public report describing the vulnerability. D is the human/group, not the code.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"multi-select","question":"(Choose TWO) Which are accurate statements about exploits?","difficulty":"Hard","topic":"Network Attacks","objective":"2.4","options":{"A":"An exploit requires an underlying vulnerability to target — without a flaw, there is nothing to exploit","B":"Exploit code is often shared on hacker forums and within penetration-testing toolkits like Metasploit","C":"An exploit is identical to the vulnerability it targets","D":"Exploits only work on Windows systems","E":"Once a vulnerability has a CVE assigned, no exploit is possible"},"answers":["A","B"],"explanation":"A and B are correct. Exploits chain to vulnerabilities (A) — no flaw, no exploit. Exploits are widely traded/published, including in legitimate pentest tools like Metasploit (B). C confuses two distinct concepts (vulnerability = flaw; exploit = the technique that uses it). D is fabricated. E is reversed — assigning a CVE means the vulnerability is now widely known and exploits become MORE common until patched.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"In a security context, what is a VULNERABILITY?","difficulty":"Foundational","topic":"Network Attacks","objective":"2.4","options":{"A":"A flaw, weakness, or misconfiguration in software, hardware, or process that could be exploited to compromise security","B":"A piece of attacker code","C":"A successful security breach","D":"An automated patching tool"},"answer":"A","explanation":"A vulnerability is the FLAW — a buffer overflow, an unpatched library, a default password, an open port. It is the condition that makes compromise possible. B is the exploit (the weapon). C is a breach (the outcome of successful exploitation). D is a defense.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"A scan of a corporate web server identifies that it is running an outdated version of OpenSSL with a known buffer-overflow flaw. The flaw could allow remote code execution if successfully targeted. What is this finding called?","difficulty":"Exam Level","topic":"Network Attacks","objective":"2.4","options":{"A":"A vulnerability — the flaw exists, but exploitation has not yet occurred (and may never if the system is patched in time)","B":"An exploit — by virtue of being identified","C":"A breach — the attacker has already compromised the server","D":"A patch — the scanner has automatically resolved the issue"},"answer":"A","explanation":"A vulnerability finding is \"the flaw exists\" — it has been IDENTIFIED but not necessarily EXPLOITED. Vulnerability scanners (Nessus, Qualys, OpenVAS) generate inventories of vulnerabilities so admins can prioritize patching. B confuses vulnerability with exploit. C confuses vulnerability with breach (the actual compromise). D is fabricated — scanners report, they don't auto-patch.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"Which best describes the relationship between THREAT, VULNERABILITY, EXPLOIT, and RISK?","difficulty":"Hard","topic":"Network Attacks","objective":"2.4","options":{"A":"A threat actor uses an exploit to take advantage of a vulnerability, creating risk; remediation requires patching the vulnerability or compensating with controls","B":"They are synonyms — the terms can be used interchangeably","C":"Vulnerabilities and exploits are the same thing; threats and risks are the same thing","D":"A risk is a piece of attacker code; a threat is a flaw in software"},"answer":"A","explanation":"The relationship: a threat actor (the human or group) uses an exploit (technique/code) to take advantage of a vulnerability (flaw), causing impact = risk to the organization. To reduce risk, you remove or remediate the vulnerability (patch, configuration change, compensating control). B and C confuse distinct concepts. D inverts the definitions.","source":"curated-netplus-carryover","addedVersion":"4.85.23","addedDate":"2026-05-03","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"What is the primary purpose of a PENETRATION TEST?","difficulty":"Foundational","topic":"Network Attacks","objective":"2.4","options":{"A":"An authorized simulated attack on a system to identify and exploit vulnerabilities before real adversaries do","B":"An automated scan that lists vulnerabilities without attempting to exploit them","C":"A formal audit of compliance documentation against a regulatory standard","D":"A backup test that restores data to verify recoverability"},"answer":"A","explanation":"A penetration test (pentest) is an authorized, simulated attack — testers actively exploit vulnerabilities to demonstrate real-world impact and find chains of weaknesses an attacker could use. B describes a vulnerability assessment (passive identification only — no exploitation). C describes a compliance audit. D is disaster-recovery testing. Pentest = \"we tried to break in and here's what we found.\"","source":"curated-netplus-carryover","addedVersion":"4.85.24","addedDate":"2026-05-04","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"What is the KEY DIFFERENCE between a vulnerability scan and a penetration test?","difficulty":"Exam Level","topic":"Network Attacks","objective":"2.4","options":{"A":"A vulnerability scan IDENTIFIES potential weaknesses but does not exploit them; a penetration test goes further by actively exploiting findings to confirm impact and chain together attack paths","B":"A vulnerability scan is unauthorized; a pentest is authorized","C":"A vulnerability scan tests web applications; a pentest tests networks","D":"A vulnerability scan is manual; a pentest is fully automated"},"answer":"A","explanation":"The defining difference is exploitation. Vulnerability scans (Nessus, Qualys, OpenVAS) automatically identify potential issues by signature matching but do NOT exploit them — they produce findings lists. Pentests authorized human testers (often using exploit tools like Metasploit + manual techniques) confirm exploitability, chain weaknesses together, and demonstrate real-world impact (e.g., \"we got domain admin starting from this misconfigured printer\"). Both are authorized when done legitimately (B is wrong). Both can target any asset class (C is wrong). Pentests are typically MORE manual than scans (D is reversed).","source":"curated-netplus-carryover","addedVersion":"4.85.24","addedDate":"2026-05-04","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"multi-select","question":"(Choose TWO) Which statements correctly describe penetration testing methodologies?","difficulty":"Hard","topic":"Network Attacks","objective":"2.4","options":{"A":"Black-box testing — the tester has no prior knowledge of the target environment, simulating an external attacker","B":"White-box testing — the tester has full information (network diagrams, source code, credentials), simulating an insider or advanced persistent threat","C":"Pentests must always be conducted without the system owner's permission to be valid","D":"Pentests cannot include social engineering — they are strictly technical","E":"Pentest reports omit findings the tester could not exploit, to keep the report concise"},"answers":["A","B"],"explanation":"A and B are correct definitions of standard pentest methodologies — black-box (no info, external attacker simulation), white-box (full info, insider/APT simulation), and gray-box (partial info, often as a compromised user). C is wrong AND illegal — pentests REQUIRE explicit written authorization from the system owner; without it the activity is unlawful intrusion. D is wrong — social engineering (phishing, pretexting) is a common authorized pentest component. E is wrong — pentest reports include all findings, exploitable or not, with severity ratings; unexploited findings are still vulnerabilities that defenders need to address.","source":"curated-netplus-carryover","addedVersion":"4.85.24","addedDate":"2026-05-04","originalTopic":"Network Attacks & Threats","originalObjective":"4.2"},
    {"type":"mcq","question":"What is a network TAP (Test/Traffic Access Point) used for?","difficulty":"Foundational","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"A passive hardware device installed inline on a network link that copies all traffic to a separate monitoring port for capture or IDS analysis without affecting the live link","B":"A wireless access point that authenticates VPN clients","C":"A managed switch port that aggregates 802.1Q trunks","D":"A test instrument that injects synthetic traffic to benchmark link capacity"},"answer":"A","explanation":"A TAP is a passive (or semi-passive) inline device that physically copies traffic from a network link to one or more monitoring ports without affecting the original flow. Wireshark/IDS/IPS attaches to the monitoring port and sees full-fidelity traffic. B is wrong (wireless AP). C is fabricated. D describes a traffic generator, not a TAP.","source":"curated-netplus-carryover","addedVersion":"4.85.25","addedDate":"2026-05-04","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"mcq","question":"What is the KEY advantage of a hardware TAP over a SPAN (port mirroring) port for traffic monitoring?","difficulty":"Exam Level","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"A TAP delivers a true unfiltered copy of every frame at full line rate, even under heavy load; a SPAN port can drop frames when oversubscribed and may not forward errored/runt frames","B":"A TAP is cheaper to deploy than a SPAN port","C":"A TAP requires no physical connection to the monitored link","D":"A TAP only captures unencrypted traffic, while SPAN handles all traffic"},"answer":"A","explanation":"TAPs are passive hardware copies — they reproduce every frame including errored frames, runts, oversized frames, and don't drop under load. SPAN ports run on the switch CPU/ASIC and can drop frames when the mirror buffer is overwhelmed (especially during incidents when monitoring matters most). They also typically filter out errored frames. B is reversed — TAPs are usually MORE expensive than configuring a SPAN port. C is wrong — TAPs are inline physical devices. D is fabricated.","source":"curated-netplus-carryover","addedVersion":"4.85.25","addedDate":"2026-05-04","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},
    {"type":"multi-select","question":"(Choose TWO) Which statements about hardware network TAPs are correct?","difficulty":"Hard","topic":"Security Monitoring & SIEM","objective":"4.4","options":{"A":"A passive optical TAP introduces no power requirement on the data path itself — the splitter is purely optical","B":"TAPs are typically deployed inline at strategic chokepoints (uplinks, datacenter edges) to feed IDS/IPS/SIEM/Wireshark","C":"TAPs require firmware updates to learn the network topology","D":"TAPs are always preferred over SPAN ports because they are cheaper","E":"TAPs work only on wireless links, not wired"},"answers":["A","B"],"explanation":"A and B are correct. Passive optical TAPs split light with no active electronics on the data path (A) — the data plane keeps working even if the TAP loses power. Strategic chokepoint placement (B) is the standard pattern: feed full-fidelity traffic from key links to IDS, IPS, or capture tools. C is fabricated. D is reversed (TAPs are usually MORE expensive than SPAN). E is wrong — most TAPs are wired (copper or fiber).","source":"curated-netplus-carryover","addedVersion":"4.85.25","addedDate":"2026-05-04","originalTopic":"Network Monitoring & Observability","originalObjective":"3.2"},

    // ── Phase 3 Cycle 1 (v4.88.3, 2026-05-06) — Professor Messer gap concepts ──
    // User flagged 5 concepts while watching SY0-701 video lessons:
    //   1. Security Control Categories (Technical / Managerial / Operational / Physical)
    //   2. Security Control Types (preventive / deterrent / detective / corrective / compensating / directive)
    //   3. Non-repudiation (hashing + proof of origin + public/private key)
    //   4. Authentication via digital certificates + CA hierarchy + Root vs signed CA
    //   5. Authorization Models (DAC / MAC / RBAC / ABAC)
    // 3 fresh exemplars per gap = 15 total. All original content from public
    // SY0-701 blueprint + RFC/NIST standards. Zero copy of Messer's stems.

    // Concept 1 — Security Control Categories
    {"type":"mcq","question":"Which of the following is the BEST example of a managerial security control?","difficulty":"Foundational","topic":"Security Controls","objective":"1.1","options":{"A":"AES-256 encryption applied to data at rest on the database server","B":"A written information-security policy that defines acceptable use of company resources","C":"A security guard verifying employee badges at the building entrance","D":"An intrusion-detection sensor monitoring traffic at the network perimeter"},"answer":"B","explanation":"Managerial controls are governance-level — policies, risk assessments, change-management procedures, training programs. Option B is a policy document, the canonical managerial example. Option A is technical (technology-enforced encryption). Option C is operational AND physical (a person performing daily activity at a physical access barrier). Option D is technical (technology-based detective control). The CompTIA SY0-701 blueprint divides controls into four categories: technical, managerial, operational, and physical.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},
    {"type":"mcq","question":"A company writes an acceptable-use policy that all employees must read and sign before being granted network access. The policy itself — as a document — falls into which security-control category?","difficulty":"Exam Level","topic":"Security Controls","objective":"1.1","options":{"A":"Operational","B":"Technical","C":"Managerial","D":"Physical"},"answer":"C","explanation":"The policy DOCUMENT is a managerial artifact — managerial controls cover governance items like policies, risk assessments, audits, and procedure documents. The act of employees actually reading and signing it on a daily/weekly basis would be operational (a human-driven recurring activity). Technical controls are technology-enforced (firewalls, encryption, ACLs). Physical controls are barriers against bodily access (locks, fences, guards). Pay attention to the question wording: when CompTIA asks about the policy itself versus the act of following it, the policy = managerial.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},
    {"type":"multi-select","question":"(Choose TWO) Which of the following are MANAGERIAL security controls?","difficulty":"Hard","topic":"Security Controls","objective":"1.1","options":{"A":"An annual penetration-testing program scheduled by the security committee","B":"Multi-factor authentication enforced at the application sign-in screen","C":"A formal risk-assessment policy approved by executive leadership","D":"A security guard reviewing visitor badges at the data-center entrance","E":"AES-256 encryption applied to backup tapes before they leave the building"},"answers":["A","C"],"explanation":"Managerial controls are policies, programs, and governance artifacts that DEFINE security activity at the program level. (A) The penetration-testing PROGRAM (the schedule, scope, frequency, sign-off authority) is managerial; the actual test execution would be operational. (C) A risk-assessment policy is governance — what gets assessed, by whom, how often. (B) Wrong — MFA enforcement is technical (technology-enforced authentication mechanism). (D) Wrong — a guard performing daily badge checks is operational AND physical. (E) Wrong — encryption itself is technical; tape transport could involve operational/physical aspects but the encryption mechanism is technical.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},

    // Concept 2 — Security Control Types
    {"type":"mcq","question":"Which of the following is BEST classified as a deterrent security control?","difficulty":"Foundational","topic":"Security Controls","objective":"1.1","options":{"A":"A login banner warning that all activity is monitored and unauthorized access will be prosecuted","B":"A SIEM correlation rule that alerts when failed logins exceed five attempts in one minute","C":"A backup tape used to restore data after a ransomware attack","D":"A firewall rule that blocks inbound connections from a known-bad IP range"},"answer":"A","explanation":"Deterrent controls discourage attackers without physically blocking them — warning banners, visible surveillance cameras, posted notices about prosecution. They work psychologically: making the attacker reconsider. (B) is detective — it alerts AFTER something has happened. (C) is corrective — it restores after damage occurred. (D) is preventive — it actively blocks the action. The six SY0-701 control types are: preventive, deterrent, detective, corrective, compensating, and directive.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},
    {"type":"mcq","question":"A company is unable to deploy multi-factor authentication on a legacy financial application because the vendor does not support it. As an alternative, security operations restrict the application to a specific allow-listed IP range and enforce session monitoring through a privileged-access-management tool. What type of security control are these alternative measures?","difficulty":"Exam Level","topic":"Security Controls","objective":"1.1","options":{"A":"Preventive","B":"Compensating","C":"Corrective","D":"Detective"},"answer":"B","explanation":"Compensating controls are deployed when the primary recommended control (MFA in this case) cannot be implemented for technical or business reasons. They must provide RISK REDUCTION at least equivalent to the original control. The IP allow-list and PAM session monitoring together substitute for the access-restriction effect of MFA. (A) — these compensating controls have a preventive EFFECT, but their classification when used as a substitute is 'compensating'. (C) and (D) describe different control lifecycle phases. The compensating-control pattern is a frequent SY0-701 exam scenario: 'cannot deploy X, what classification are the alternative measures?'","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},
    {"type":"multi-select","question":"(Choose TWO) Which of the following are DETECTIVE security controls?","difficulty":"Hard","topic":"Security Controls","objective":"1.1","options":{"A":"A SIEM correlation rule that flags unusual login patterns from a privileged account","B":"An incident-response plan defining escalation procedures for confirmed breaches","C":"A monthly review of system audit logs by the security operations team","D":"A network firewall blocking inbound TCP/22 and TCP/3389 from the public internet","E":"An air-gapped offline backup of critical databases stored in a secure vault"},"answers":["A","C"],"explanation":"Detective controls identify security events that have already occurred or are in progress. (A) SIEM correlation = detective — alerts on something that's currently happening, doesn't stop it. (C) Audit-log review = detective — discovers anomalies after the fact. (B) Wrong — IR plans are directive (mandate behavior) and parts are corrective; they do not detect. (D) Wrong — firewalls that block traffic are preventive. (E) Wrong — backups are corrective; they restore after damage.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},

    // Concept 3 — Non-repudiation (hashing + proof of origin + public/private key)
    {"type":"mcq","question":"Which cryptographic mechanism BEST provides non-repudiation for an email message?","difficulty":"Foundational","topic":"CIA Triad & AAA","objective":"1.2","options":{"A":"Encrypting the message body with the recipient's public key","B":"Hashing the message body with SHA-256 and attaching the hash","C":"Signing the message with the sender's private key (digital signature)","D":"Sending the message over a TLS-encrypted SMTP connection (STARTTLS)"},"answer":"C","explanation":"Non-repudiation requires the sender to perform an action that ONLY they could have performed — and that anyone can verify after the fact. Signing with the sender's private key produces a digital signature; the corresponding public key (which everyone has access to) verifies that ONLY the holder of the private key could have produced it. This proves both authorship AND integrity. (A) provides confidentiality only — anyone could have encrypted with a public key. (B) provides integrity but not authorship — anyone could compute the hash. (D) provides transport-layer protection but doesn't tie the message to a specific authoring identity at the message level.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},
    {"type":"mcq","question":"A digital signature provides which combination of security properties?","difficulty":"Exam Level","topic":"CIA Triad & AAA","objective":"1.2","options":{"A":"Confidentiality, integrity, and availability","B":"Authentication of the signer, integrity of the data, and non-repudiation","C":"Authorization, encryption, and key exchange","D":"Hashing, salting, and key stretching"},"answer":"B","explanation":"A digital signature is constructed by hashing the data and encrypting the hash with the signer's PRIVATE key. Verifying with the signer's public key produces three properties simultaneously: AUTHENTICATION (proves who signed it because only the private-key holder could have done so), INTEGRITY (the hash proves data wasn't altered), and NON-REPUDIATION (the signer cannot later deny having signed because the math is irrefutable). (A) Confidentiality requires encryption of the data itself, which a signature alone does NOT provide. (C) Authorization (who-can-do-what) is separate from authentication. (D) These are password-storage techniques, unrelated to signature properties.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},
    {"type":"multi-select","question":"(Choose TWO) Which of the following are REQUIRED for a digital signature to provide non-repudiation?","difficulty":"Hard","topic":"CIA Triad & AAA","objective":"1.2","options":{"A":"The signer's private key must remain known only to the signer (not shared, not compromised)","B":"The signer must use a 128-bit symmetric key for the signing operation","C":"The message must be encrypted with the recipient's public key before being sent","D":"The hash function used in signing must be a current, collision-resistant algorithm (SHA-256 or stronger)","E":"The message must be transmitted over a Wi-Fi network secured with WPA3"},"answers":["A","D"],"explanation":"Non-repudiation depends on the signature being mathematically unforgeable AND uniquely tied to the signer. (A) If the private key is compromised or shared, anyone with it could produce a valid signature, breaking the unique-signer guarantee. (D) A weak hash function (MD5, SHA-1 — both broken for collision resistance) lets an attacker craft a different message with the same hash, breaking the integrity link of the signature. (B) Wrong — digital signatures use ASYMMETRIC (public/private key) cryptography, never symmetric keys. (C) Wrong — encrypting for the recipient is for confidentiality, a separate property. (E) Wrong — transport-layer wireless security is unrelated to message-level signature properties.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},

    // Concept 4 — Authentication via Digital Certificates + CA hierarchy
    {"type":"mcq","question":"Which entity is responsible for issuing and digitally signing X.509 certificates within a Public Key Infrastructure (PKI)?","difficulty":"Foundational","topic":"PKI & Certificate Management","objective":"1.4","options":{"A":"The Domain Controller","B":"The Certificate Authority (CA)","C":"The Active Directory schema master","D":"The DNS resolver"},"answer":"B","explanation":"A Certificate Authority is the trusted entity that issues digital certificates by signing each one with its own private key. Verifiers trust the CA's public key (the root certificate, pre-installed in browsers/OSes), which lets them validate any certificate the CA has signed. The CA's role is the foundation of the PKI trust model. (A) Domain Controllers handle Windows authentication and may run an Active Directory Certificate Services role, but the role doing certificate issuance is functionally the CA. (C) The Schema Master manages the AD database schema, not certificates. (D) DNS resolves names; a CA is unrelated to DNS resolution.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},
    {"type":"mcq","question":"In a typical enterprise PKI deployment, why is the Root CA usually kept offline (powered down, in a secure vault, or stored on an offline HSM) after issuing the initial Intermediate CA certificates?","difficulty":"Exam Level","topic":"PKI & Certificate Management","objective":"1.4","options":{"A":"To meet a compliance requirement that all CAs must be air-gapped","B":"To reduce the attack surface — if the Root CA's private key is compromised, every certificate ever issued under it is no longer trusted and the entire trust hierarchy must be rebuilt","C":"To prevent the Root CA from issuing too many certificates and exhausting its serial-number pool","D":"To improve performance of certificate issuance for end-entity certificates"},"answer":"B","explanation":"The Root CA's private key signs the Intermediate CA certificates that handle day-to-day issuance. If the root key is compromised, EVERY certificate ever issued under that root chain is no longer trusted — every browser, every device, every service must rebuild its trust against a new root. Keeping the Root CA offline (powered down except during scheduled key ceremonies) drastically reduces the chance of compromise. Day-to-day issuance is delegated to Intermediate CAs which CAN be revoked and replaced without rebuilding the root. (A) Offline storage is best practice, not a hard compliance mandate. (C) Serial-number space is not the constraint. (D) Offline root has no performance impact on Intermediate-issued certs.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},
    {"type":"multi-select","question":"(Choose TWO) Which of the following are TRUE regarding certificate-based client authentication using X.509 certificates?","difficulty":"Hard","topic":"PKI & Certificate Management","objective":"1.4","options":{"A":"The client encrypts its certificate with the server's public key before transmission","B":"The client proves possession of the private key associated with its certificate, typically by signing a server-provided challenge","C":"The certificate's serial number must match the client's MAC address for authentication to succeed","D":"Certificate revocation status can be checked via OCSP (real-time query) or by downloading a CRL (revocation list)","E":"The server must store the client's private key in its trust store to verify authenticity"},"answers":["B","D"],"explanation":"Cert-based client auth requires both possession proof and revocation check. (B) The certificate itself is a public artifact — anyone can copy it. The client must sign a server-provided challenge (or perform an equivalent crypto operation) with the corresponding PRIVATE key to prove they actually hold the matching key. (D) A valid signed cert can be invalidated mid-lifetime (key compromise, employee departure). OCSP queries the CA in real time; CRLs are downloadable revocation lists updated periodically. (A) Wrong — certificates are public and don't need encryption for transmission. (C) Wrong — there is no cert-to-MAC binding requirement; serial numbers are CA-issued and unrelated to network hardware addresses. (E) Wrong AND DANGEROUS — the server NEVER stores the client's private key. The whole point of asymmetric crypto is that private keys never leave the holder.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},

    // Concept 5 — Authorization Models (DAC / MAC / RBAC / ABAC)
    {"type":"mcq","question":"In a Mandatory Access Control (MAC) authorization model, who determines a user's access level for a particular resource?","difficulty":"Foundational","topic":"Identity & Access Management","objective":"4.6","options":{"A":"The user themselves, based on what they need","B":"The resource owner, at their discretion","C":"The system enforces access based on classification labels and clearances assigned by a central security policy","D":"A separately deployed firewall rule engine"},"answer":"C","explanation":"MAC is system-enforced based on classification labels (Top Secret, Secret, Confidential, Unclassified) and matching user clearances assigned by a central security policy. The OS or system enforces the rules — owners CANNOT grant access at their discretion. MAC is common in military, intelligence, and regulated environments where data classification is rigorous. (A) and (B) describe DAC (Discretionary Access Control), where owners decide who has access. (D) Firewalls are network access controls, separate from system MAC.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},
    {"type":"mcq","question":"A healthcare organization wants new hires in the nursing role to automatically receive permissions to read patient charts and update vital signs, without an administrator manually granting permissions per individual user. When a nurse leaves the organization or changes departments, their access is removed by changing their role assignment. Which authorization model BEST fits these requirements?","difficulty":"Exam Level","topic":"Identity & Access Management","objective":"4.6","options":{"A":"Discretionary Access Control (DAC)","B":"Mandatory Access Control (MAC)","C":"Role-Based Access Control (RBAC)","D":"Attribute-Based Access Control (ABAC)"},"answer":"C","explanation":"RBAC defines permissions per ROLE — the 'Nurse' role has 'read patient chart' + 'update vital signs' permissions; users are assigned to roles. New hires placed in the Nurse role inherit those permissions automatically without per-user permission grants. When a user changes roles, their permissions are re-evaluated by changing their role. This is the canonical RBAC scenario. (A) DAC requires per-resource access decisions by owners — operationally cumbersome at scale. (B) MAC requires labels and clearances, more rigorous than this scenario needs. (D) ABAC could work but is more complex (uses dynamic attributes like time-of-day, location, device posture) and overkill for a straightforward role-based grant scheme.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},
    {"type":"multi-select","question":"(Choose TWO) Which of the following BEST distinguish Attribute-Based Access Control (ABAC) from Role-Based Access Control (RBAC)?","difficulty":"Hard","topic":"Identity & Access Management","objective":"4.6","options":{"A":"ABAC evaluates dynamic attributes such as time of day, geographic location, and device posture at the moment of access","B":"RBAC requires every user to be assigned a unique role per resource accessed","C":"ABAC allows fine-grained access policies expressed as rules over user, resource, and environment attributes","D":"RBAC cannot be combined with mandatory access control (MAC)","E":"ABAC requires the resource owner to manually approve each access request before granting it"},"answers":["A","C"],"explanation":"ABAC's defining feature is policy expressed over ATTRIBUTES, evaluated dynamically at access time. (A) ABAC uses environmental attributes — time, location, device-posture, network-zone — that can deny access even to users who would normally have it (e.g., 'Allow Cardiology nurses ONLY during business hours from on-network devices'). RBAC's role assignments are typically static. (C) ABAC policies can express complex Boolean rules across user, resource, and environment attributes — far more expressive than RBAC's simpler role-permission mapping. (B) Wrong — RBAC users have ONE role (or a small set), not a unique role per resource. (D) Wrong — RBAC and MAC are commonly combined (e.g., MAC labels + RBAC role grants). (E) Wrong — that describes DAC (owner-controlled), not ABAC.","source":"curated-secplus-phase3","addedVersion":"4.88.3","addedDate":"2026-05-06"},

    // ── Phase 3 Cycle 2 (v4.95.1, 2026-05-08) ───────────────────────────────
    // Concept 6 — Gap Analysis (5.1 Effective Security Governance)
    // Source: user flagged "Gap Analysis" as a recurring SY0-701 concept worth
    // dedicated bank coverage. 3 exemplars covering definition, distinguishing
    // gap analysis from related assessments, and the inputs+outputs of a real
    // gap-analysis exercise. All original from public SY0-701 blueprint + NIST
    // CSF / ISO 27001 standard practice.
    {"type":"mcq","question":"A security manager is preparing the organization for an upcoming SOC 2 audit. They want a structured comparison of the company's current security controls against the SOC 2 Trust Services Criteria so they can identify which controls are missing or insufficient before the audit begins. Which activity BEST describes what the security manager should perform?","difficulty":"Foundational","topic":"Security Governance","objective":"5.1","options":{"A":"Penetration test","B":"Vulnerability scan","C":"Gap analysis","D":"Business impact analysis"},"answer":"C","explanation":"Gap analysis is the structured comparison of CURRENT state (what controls the organization has today) against a DESIRED state (what a framework, regulation, or audit standard requires) to identify GAPS that need remediation. Output is a prioritized list of missing or insufficient controls plus recommended fixes. (A) A penetration test actively exploits to validate whether existing controls work — it doesn't compare against a framework. (B) A vulnerability scan identifies specific technical weaknesses (CVEs, misconfigurations) — narrower than gap analysis and doesn't tie to a standard. (D) Business impact analysis identifies critical processes and recovery objectives (RTO/RPO) — used in BCP/DRP, not control-coverage assessment. Gap analysis is the canonical pre-audit activity.","source":"curated-secplus-phase3","addedVersion":"4.95.1","addedDate":"2026-05-08"},
    {"type":"mcq","question":"A CISO wants to adopt the NIST Cybersecurity Framework (CSF) and needs to know which of the framework's required controls the organization has not yet implemented, so a multi-quarter remediation roadmap can be built. Which assessment activity BEST produces this specific output?","difficulty":"Exam Level","topic":"Security Governance","objective":"5.1","options":{"A":"Risk assessment, because it ranks threats by likelihood and impact","B":"Threat assessment, because it identifies adversary capabilities","C":"Gap analysis, because it compares current controls against the framework's required controls and lists what is missing","D":"Vulnerability assessment, because it identifies specific technical weaknesses on individual systems"},"answer":"C","explanation":"Gap analysis is uniquely suited to 'we want to adopt framework X — what don't we have yet?' Its output is a coverage delta: the list of framework-required controls the organization lacks (or has only partially implemented), prioritized for remediation. (A) Risk assessment evaluates likelihood × impact of identified threats and produces a risk register — different focus, different output. (B) Threat assessment profiles adversaries (motives, capabilities, TTPs) — irrelevant to control-coverage questions. (D) Vulnerability assessment identifies specific weaknesses on specific systems (e.g., 'this server has CVE-2024-1234') — too narrow for a framework-adoption decision. The pre-framework-adoption pattern is one of the most-tested gap-analysis scenarios on SY0-701.","source":"curated-secplus-phase3","addedVersion":"4.95.1","addedDate":"2026-05-08"},
    {"type":"multi-select","question":"(Choose TWO) Which of the following are TRUE regarding a security gap analysis?","difficulty":"Hard","topic":"Security Governance","objective":"5.1","options":{"A":"The output is a list of missing or insufficient controls compared to a target benchmark, framework, or regulation","B":"It actively exploits identified weaknesses to confirm they are reachable from the public internet","C":"It assigns CVSS scores to each technical vulnerability discovered on the network","D":"Common inputs include current control documentation plus a target standard (NIST CSF, ISO 27001, CIS Controls, PCI DSS, HIPAA)","E":"The result is a profile of likely threat actors, their motives, and their preferred tactics"},"answers":["A","D"],"explanation":"Gap analysis is a comparison-and-coverage exercise. (A) The deliverable is a coverage delta: which controls from the target benchmark are missing or insufficient, with remediation priorities. (D) Inputs are always two-sided — current state (what we have) plus desired state (what the standard requires). Without the target standard, there is nothing to measure the gap against. (B) Wrong — that describes penetration testing. Gap analysis is documentation- and interview-driven, not an active exploit. (C) Wrong — CVSS scoring is the output of a vulnerability assessment, focused on specific technical CVEs, not control-coverage gaps. (E) Wrong — that describes a threat assessment, which profiles adversaries, not a gap analysis. Common SY0-701 distractor: confusing gap analysis with vulnerability assessment because both produce a 'list of things to fix' — the difference is the lens (controls vs CVEs).","source":"curated-secplus-phase3","addedVersion":"4.95.1","addedDate":"2026-05-08"},

    // ── Phase 3 Cycle 3 (v4.99.25, 2026-05-10) ───────────────────────────────
    // Concept 7 — Zero Trust architecture (3.2 Network Security Architecture)
    // Source: user flagged Zero Trust as a recurring SY0-701 concept after
    // morning Professor Messer studying. 8 exemplars covering 3 clusters:
    // (A) Architecture overview — Control Plane vs Data Plane (3 exemplars)
    // (B) Policy components — PE/PA/PDP/PEP distinguishing (3 exemplars)
    // (C) Dynamic risk-based — adaptive identity, threat scope reduction,
    //     implicit-trust-zone replacement (2 exemplars)
    // Bank had ZERO Zero Trust exemplars pre-this cycle — fresh ground.
    // All content original from public SY0-701 blueprint; Messer's stems
    // /options/explanations not copied (legal-boundary discipline preserved).

    // Cluster A — Architecture overview (Control Plane vs Data Plane)
    {"type":"mcq","question":"Which statement BEST describes the foundational principle of a Zero Trust security architecture?","difficulty":"Foundational","topic":"Zero Trust & SDN","objective":"3.2","options":{"A":"The corporate network perimeter (firewall) is the primary trust boundary; everything inside is trusted, everything outside is untrusted","B":"No user, device, or request is implicitly trusted based on network location alone — every access request is verified before being granted, regardless of source","C":"Zero Trust eliminates the need for authentication and authorization by replacing them with continuous monitoring","D":"Zero Trust requires all internal network traffic to be unencrypted so monitoring tools can inspect contents in cleartext"},"answer":"B","explanation":"Zero Trust replaces the legacy 'castle and moat' model (option A) with 'never trust, always verify.' Every access request is authenticated, authorized, and continuously evaluated regardless of whether the user is on the corporate LAN or coming from the public internet. The location of the request grants no implicit trust. (A) describes the perimeter-based model that Zero Trust replaces. (C) is wrong — Zero Trust enhances authn/authz, not eliminates them; continuous monitoring is added on top. (D) is wrong — Zero Trust assumes traffic stays encrypted; inspection is done via TLS termination at PEPs, endpoint agents, or behavioral analytics, not by mandating cleartext.","source":"curated-secplus-phase3","addedVersion":"4.99.25","addedDate":"2026-05-10"},
    {"type":"mcq","question":"In a Zero Trust architecture, the Control Plane and the Data Plane have distinct responsibilities. Which of the following correctly describes WHERE access decisions are MADE versus where they are ENFORCED?","difficulty":"Exam Level","topic":"Zero Trust & SDN","objective":"3.2","options":{"A":"Both decisions and enforcement happen in the Control Plane; the Data Plane only carries packets","B":"The Data Plane makes decisions based on cached policy; the Control Plane enforces them at the network gateway","C":"The Control Plane makes the access decisions (Policy Engine, Policy Administrator); the Data Plane enforces them at the Policy Enforcement Point on the actual data path","D":"Decisions and enforcement both happen at the user's endpoint device through operating-system-level access controls"},"answer":"C","explanation":"The Control Plane is the brain — it decides whether to grant access. Components in the Control Plane include the Policy Engine (PE, makes the actual yes/no decision), the Policy Administrator (PA, communicates the decision and configures the access path), adaptive identity, threat scope reduction, and policy-driven access control. The Data Plane is the gate — it enforces the decision at the Policy Enforcement Point (PEP), which sits on the actual data path between the subject and the resource. The split is fundamental: separating 'who decides' from 'who enforces' enables centralized policy with distributed enforcement. (A), (B), and (D) misattribute the responsibilities.","source":"curated-secplus-phase3","addedVersion":"4.99.25","addedDate":"2026-05-10"},
    {"type":"multi-select","question":"(Choose TWO) Which of the following are components of the Zero Trust CONTROL PLANE?","difficulty":"Hard","topic":"Zero Trust & SDN","objective":"3.2","options":{"A":"Policy Enforcement Point (PEP)","B":"Adaptive identity (context-aware authentication that adjusts based on risk signals)","C":"Subject (the user or system requesting access)","D":"Threat scope reduction","E":"Implicit trust zones (legacy DMZ-style network segments granting access by location)"},"answers":["B","D"],"explanation":"The Control Plane houses decision-making and policy-management functions. (B) Adaptive identity adjusts authentication strength based on context (location, device posture, behavior) — a Control Plane function. (D) Threat scope reduction is the Control Plane principle of limiting access to need-to-know to minimize blast radius. (A) PEP is in the Data Plane — it enforces, not decides. (C) Subject is the entity REQUESTING access — neither Control nor Data Plane decision-maker; it sits on the data path as the originator. (E) Implicit trust zones are the legacy construct Zero Trust eliminates entirely — they are NOT a Zero Trust component, they are what Zero Trust replaces.","source":"curated-secplus-phase3","addedVersion":"4.99.25","addedDate":"2026-05-10"},

    // Cluster B — Policy components (PE / PA / PDP / PEP)
    {"type":"mcq","question":"In a Zero Trust architecture, which component is responsible for ENFORCING access decisions on the actual data path between the requesting subject and the protected resource?","difficulty":"Foundational","topic":"Zero Trust & SDN","objective":"3.2","options":{"A":"Policy Engine (PE)","B":"Policy Administrator (PA)","C":"Policy Decision Point (PDP)","D":"Policy Enforcement Point (PEP)"},"answer":"D","explanation":"The Policy Enforcement Point (PEP) sits on the data path and ENFORCES the access decision — it allows traffic through if approved, blocks it if denied. Examples: a reverse proxy in front of an application, a SASE gateway, an identity-aware proxy, or an in-line firewall configured per-session. (A) The Policy Engine MAKES the decision — it doesn't enforce. (B) The Policy Administrator COMMUNICATES the decision to the data path and configures the access (issues a session token, opens a tunnel, configures an ACL) — also a decision-side function, not enforcement. (C) The Policy Decision Point is the logical combination of PE + PA — the entire decision-making apparatus in the Control Plane. PEP = the gate; PE + PA + PDP = the decision committee. Memorize: PE decides, PA configures, PEP enforces.","source":"curated-secplus-phase3","addedVersion":"4.99.25","addedDate":"2026-05-10"},
    {"type":"mcq","question":"A user attempts to access a sensitive HR application through the company's Zero Trust gateway. The gateway evaluates the user's identity, device posture, time of day, and current risk score, then returns a 'permit with continuous monitoring' verdict. The gateway then opens the connection to the HR application. Which Zero Trust component MADE the access decision in this scenario?","difficulty":"Exam Level","topic":"Zero Trust & SDN","objective":"3.2","options":{"A":"Policy Enforcement Point (PEP)","B":"Policy Engine (PE)","C":"Subject","D":"Implicit trust zone"},"answer":"B","explanation":"The Policy Engine (PE) is the component that MAKES the actual access decision based on inputs (identity, device posture, time, risk score). The PE applies configured policy rules and produces a deny/allow/permit-with-conditions verdict. The decision is then communicated by the Policy Administrator (PA) and ENFORCED by the Policy Enforcement Point (PEP) at the data-path gateway. In the scenario the gateway as a whole performed all three functions but logically: PE made the decision, PA communicated it, PEP opened the connection. (A) PEP enforces but doesn't decide. (C) Subject is the user — the entity REQUESTING access, not deciding. (D) Implicit trust zones are the legacy construct Zero Trust replaces and have no decision role.","source":"curated-secplus-phase3","addedVersion":"4.99.25","addedDate":"2026-05-10"},
    {"type":"multi-select","question":"(Choose TWO) Which of the following correctly distinguish the Policy Engine (PE) from the Policy Administrator (PA) in a Zero Trust architecture?","difficulty":"Hard","topic":"Zero Trust & SDN","objective":"3.2","options":{"A":"The Policy Engine MAKES the access decision; the Policy Administrator COMMUNICATES the decision and configures the access path","B":"The Policy Engine and the Policy Administrator are the same component, just named differently","C":"The Policy Engine sits in the Data Plane; the Policy Administrator sits in the Control Plane","D":"Together, the Policy Engine and Policy Administrator form the Policy Decision Point (PDP) in the Control Plane","E":"The Policy Administrator enforces decisions on the data path; the Policy Engine queries adaptive identity providers"},"answers":["A","D"],"explanation":"PE and PA are distinct roles within the Control Plane. (A) PE is the decision-maker — it evaluates inputs (identity, device, context) against policy rules and produces the verdict. PA takes the verdict and acts on it — communicating it to the data-path enforcer (PEP) and configuring the access (issuing a session token, opening a tunnel, configuring an ACL). (D) Together they form the Policy Decision Point (PDP) — the logical decision-making layer of the Control Plane. (B) Wrong — they have distinct responsibilities. (C) Wrong — both PE and PA live in the Control Plane; only the PEP lives in the Data Plane. (E) Wrong — that swaps the roles. The PA does NOT enforce on the data path (that's the PEP). The 'PE decides, PA configures, PEP enforces' three-way split is the most common SY0-701 trap on Zero Trust.","source":"curated-secplus-phase3","addedVersion":"4.99.25","addedDate":"2026-05-10"},

    // Cluster C — Dynamic risk-based (adaptive identity + threat scope reduction)
    {"type":"mcq","question":"A company implements Zero Trust at their employee-facing applications. When a user signs in from their corporate-managed laptop on the office network, they are granted single-factor authentication and full access. When the SAME user signs in from a personal phone on a coffee-shop wifi, the system requires multi-factor authentication, blocks downloads, and limits the session to 30 minutes. Which Zero Trust concept is BEST illustrated by this behavior?","difficulty":"Exam Level","topic":"Zero Trust & SDN","objective":"3.2","options":{"A":"Implicit trust zone","B":"Adaptive identity","C":"Policy Decision Point","D":"Threat scope reduction"},"answer":"B","explanation":"Adaptive identity adjusts authentication strength and access permissions DYNAMICALLY based on context — device posture, network location, time of day, behavioral patterns, and risk score. Same user, same identity provider, but the trust signals (managed device + trusted network vs personal device + untrusted network) drive different access outcomes. This is the canonical adaptive-identity scenario. (A) Implicit trust zones are the legacy construct Zero Trust REPLACES — they grant access based purely on network location, which is exactly what adaptive identity moves away from. (C) PDP is the architectural component that houses decision-making, not the principle illustrated here. (D) Threat scope reduction is a related but different concept — limiting blast radius by restricting what an authenticated user can reach, not adjusting authentication strength based on risk.","source":"curated-secplus-phase3","addedVersion":"4.99.25","addedDate":"2026-05-10"},
    {"type":"multi-select","question":"(Choose TWO) An organization moves from a legacy network architecture (where any device on the corporate VLAN can reach any internal server on TCP/445 file shares) to a Zero Trust architecture. After migration, a single user on the corporate VLAN can ONLY reach the specific file shares their identity is explicitly authorized for, evaluated per-request. Which Zero Trust concepts are MOST directly illustrated by this transition?","difficulty":"Hard","topic":"Zero Trust & SDN","objective":"3.2","options":{"A":"Threat scope reduction (limiting access to need-to-know)","B":"Replacing implicit trust zones with explicit policy-driven access control","C":"Adopting adaptive identity (multi-factor based on context)","D":"Standing up a new Policy Engine while retaining the old perimeter firewall as a fallback","E":"Configuring split-tunnel VPN to reduce VPN bandwidth"},"answers":["A","B"],"explanation":"The legacy 'any device on VLAN → any server on TCP/445' model is the canonical implicit trust zone — network location alone grants access. The Zero Trust transition does two things directly: (B) replaces implicit trust zones (network-location-based grants) with explicit policy-driven access control (per-request authorization based on identity + context), and (A) reduces threat scope by limiting what each user can reach (need-to-know — only specific file shares for which they are authorized, not the whole TCP/445 reachable surface). Combined effect: smaller blast radius if any single account is compromised. (C) Adaptive identity is a different Zero Trust concept (varying authentication strength based on context); the scenario doesn't describe MFA changes. (D) Wrong — Zero Trust replaces the perimeter, doesn't run alongside it; that hybrid undermines Zero Trust. (E) Split-tunnel VPN is a separate concept entirely; the scenario isn't about VPN bandwidth.","source":"curated-secplus-phase3","addedVersion":"4.99.25","addedDate":"2026-05-10"},

    // ── Phase 3 Cycle 4 — Physical Security (v4.99.40, 2026-05-11) ──────────
    // 10 exemplars across 4 clusters covering all 11 sub-concepts from user's
    // morning Messer session: fencing/bollards, lighting, sensors, mantraps,
    // locks, badges, CCTV, tamper evidence, air gap vs DMZ, guards. Pair with
    // 3 Phase 3 Cycle 4 retention concepts above.
    //
    // Cluster A — Perimeter Deterrence & Detection
    {"type":"mcq","question":"A data center is concerned about vehicle-based attacks where an attacker drives a truck through the lobby to gain physical access to the IT room. Which physical security control is BEST suited to PREVENT this specific attack while still allowing pedestrian access to the building?","difficulty":"Exam Level","topic":"Security Controls","objective":"1.2","options":{"A":"6-foot chain-link fence around the perimeter","B":"Bollards installed at building entrances and approach roads","C":"Security camera with motion-activated recording","D":"Access-control vestibule with badge reader"},"answer":"B","explanation":"Bollards are short vertical posts (typically concrete-filled steel) specifically designed to stop vehicles while allowing pedestrians to walk through — the canonical control against vehicle-ramming attacks. (A) A chain-link fence deters pedestrians but is easily breached by a vehicle at speed — wrong threat model. (C) Cameras DETECT after the fact, they don't prevent. (D) Mantraps/vestibules control pedestrian access but assume the vehicle has been stopped before reaching the lobby door. SY0-701 trap: don't pick a deterrent or detective control when the question asks specifically about PREVENTION of a vehicle attack.","source":"curated-secplus-phase3","addedVersion":"4.99.40","addedDate":"2026-05-11"},
    {"type":"mcq","question":"A company installs high-intensity exterior lighting around the perimeter of its data center after dark. What is the PRIMARY security purpose of perimeter lighting?","difficulty":"Foundational","topic":"Security Controls","objective":"1.2","options":{"A":"To prevent unauthorized vehicles from approaching the building","B":"To serve as both a deterrent against intruders and an enabler for surveillance cameras to capture usable footage","C":"To replace the need for security guards during night-shift operations","D":"To provide compliance with cybersecurity insurance requirements"},"answer":"B","explanation":"Perimeter lighting plays a dual security role: DETERRENT — most opportunistic attackers prefer the cover of darkness; well-lit areas raise the perceived risk of being seen, lowering the likelihood of attempt. DETECTION ENABLER — security cameras need adequate lighting to capture usable footage of intruders. Modern IR-illuminated cameras reduce the second need but lighting still aids human observers + non-IR cameras. (A) Lighting does not prevent vehicles (bollards do). (C) Lighting supplements but does not replace guards or judgment-based controls. (D) Insurance frameworks may require certain controls but that's not the PRIMARY security purpose.","source":"curated-secplus-phase3","addedVersion":"4.99.40","addedDate":"2026-05-11"},
    {"type":"multi-select","question":"(Choose TWO) A facility has a long, dark corridor between the lobby and the server room. Management wants motion-triggered alerts whenever someone enters the corridor outside business hours. Which sensor types are BEST suited to detect movement in this scenario?","difficulty":"Hard","topic":"Security Controls","objective":"1.2","options":{"A":"Microwave sensors","B":"Pressure sensors (floor-mounted)","C":"Infrared (passive IR) sensors","D":"Ultrasonic sensors (high-frequency air-pressure waves)","E":"Acoustic sensors (sound-pattern recognition)"},"answers":["A","C"],"explanation":"For motion detection across a corridor, the canonical two choices: (A) MICROWAVE sensors — emit microwave radiation and detect Doppler shifts when the wave bounces off moving objects; good for larger areas and partial obstructions, well-suited to long corridors. (C) INFRARED (PIR) sensors — detect heat signatures of moving objects; the most common indoor motion detector. (B) Wrong — pressure/floor sensors detect someone STANDING on a specific spot (alarmed thresholds, floor mats), not motion across a corridor. (D) Ultrasonic sensors can detect motion but are less common in corporate corridors; mostly used in vehicle proximity + niche applications. (E) Acoustic sensors detect SOUND (glass break, gunshot recognition), not movement itself.","source":"curated-secplus-phase3","addedVersion":"4.99.40","addedDate":"2026-05-11"},

    // Cluster B — Access Control
    {"type":"mcq","question":"A company installs a small enclosed entryway between the lobby and the server room. The entryway has TWO doors that are interlocked — only ONE door can be open at a time. To enter the server room, an employee must scan their badge at the outer door, enter the vestibule, allow the outer door to fully close, then scan their badge a second time at the inner door. Which physical security control is BEST described, and what PRIMARY threat does it address?","difficulty":"Exam Level","topic":"Security Controls","objective":"1.2","options":{"A":"Bollard; prevents vehicle attacks","B":"Access control vestibule (mantrap); prevents tailgating","C":"Faraday cage; prevents wireless eavesdropping","D":"Air gap; prevents network-borne attacks"},"answer":"B","explanation":"The two-interlocked-doors construct with badge readers on each door is the definitional access control vestibule (informally 'mantrap'). It addresses TAILGATING — an unauthorized person following an authorized person through a single door without their own credential. With the vestibule, even if someone slips in behind an authorized employee through the outer door, the inner door won't open until the outer door has fully closed AND a valid badge is scanned again. (A) Bollards address vehicle attacks. (C) Faraday cages block radio signals (Wi-Fi, RFID, cellular), not physical access. (D) Air gaps isolate networks (no physical network connection); they don't address physical access to a room. Modern CompTIA terminology prefers 'access control vestibule' over the older 'mantrap.'","source":"curated-secplus-phase3","addedVersion":"4.99.40","addedDate":"2026-05-11"},
    {"type":"mcq","question":"A traveling consultant works from coffee shops and hotel rooms. They want to deter someone from grabbing their laptop while they're briefly away from the table. Which lock type is MOST appropriate for this use case?","difficulty":"Foundational","topic":"Security Controls","objective":"1.2","options":{"A":"Biometric fingerprint-recognition lock embedded in the laptop's BIOS","B":"Cable lock (Kensington-style) that loops the laptop chassis to a fixed object","C":"Electronic deadbolt with a 6-digit PIN","D":"Smart-card-reader lock requiring a CAC/PIV card"},"answer":"B","explanation":"A cable lock (Kensington / K-slot security lock) is purpose-built for the laptop-while-traveling scenario — it tethers the chassis to a fixed object (table leg, pipe) via a steel cable, deterring a snatch-and-run. The lock itself can be a key or combination type. (A) Biometric BIOS locks protect the DATA on the laptop if powered off but do not prevent the laptop from being physically carried away. (C) Electronic deadbolts are for doors, not portable equipment. (D) Smart-card door locks are for room/facility access, not equipment. SY0-701 trap: when the question specifies portable equipment + brief unattended periods, the answer is a CABLE lock — even though the other lock types are also 'real' locks.","source":"curated-secplus-phase3","addedVersion":"4.99.40","addedDate":"2026-05-11"},
    {"type":"mcq","question":"A federal agency requires employees to authenticate to internal IT systems using a smart-card-like badge that contains both a PUBLIC-KEY certificate (for digital signatures and encryption) AND a prominent photo + name printed on the card for visual identification by security guards. Which type of badge BEST matches this requirement?","difficulty":"Exam Level","topic":"Security Controls","objective":"1.2","options":{"A":"RFID proximity badge — short-range radio for door access","B":"Magnetic-stripe card — stores an account number in a magnetic strip","C":"PIV (Personal Identity Verification) card or CAC (Common Access Card) — embedded smart-card chip with PKI certificates plus printed visual identifiers","D":"Standard barcode badge — visual machine-readable identifier only"},"answer":"C","explanation":"PIV (federal civilian) and CAC (DoD military) cards are the dual-purpose badges used in U.S. federal/military environments. They embed a smart-card chip with PKI certificates (typically a signing cert, an encryption cert, and an authentication cert) for cryptographic authentication into IT systems, AND have a photo + name + barcode + magnetic stripe printed on the card for human visual identification by security guards. (A) RFID proximity badges are simpler — they emit a static identifier; no embedded PKI, no human-readable face. (B) Magnetic-stripe alone is a single-use legacy mechanism with no PKI capability. (D) Barcode is machine-readable but cryptographically weak. SY0-701: when the question mentions PKI + smart card + federal/military context, PIV/CAC is the answer.","source":"curated-secplus-phase3","addedVersion":"4.99.40","addedDate":"2026-05-11"},

    // Cluster C — Monitoring & Tamper Evidence
    {"type":"mcq","question":"After a server-room break-in is discovered the morning after, the security operations team pulls the previous night's CCTV footage and uses it to identify the intruder. Which control CATEGORY does CCTV PRIMARILY belong to, and what limitation does the above scenario illustrate?","difficulty":"Hard","topic":"Security Controls","objective":"1.2","options":{"A":"Preventive — and the limitation is that cameras can be physically disabled before an attack","B":"Detective — and the limitation is that cameras identify an event AFTER it has occurred, not in real-time, unless someone is actively monitoring the feed","C":"Deterrent — and the limitation is that cameras don't work at night without infrared illumination","D":"Corrective — and the limitation is that cameras don't restore stolen equipment"},"answer":"B","explanation":"CCTV is primarily a DETECTIVE control. The scenario in the question — pulling footage the morning AFTER the break-in to identify the intruder — exemplifies detective use: it identifies WHAT happened and WHO did it, after the event. Cameras do have a secondary deterrent effect (someone aware of recording may choose not to attempt the act) and a corrective effect (footage supports prosecution and recovery) but the canonical category in SY0-701 is detective. The key limitation: passive recording without an active observer doesn't STOP the event — only documents it. To shift CCTV toward preventive, you'd need real-time monitoring + immediate response (guards on standby). (A) Preventive controls actively BLOCK the action; cameras don't. (C) CCTV does have deterrent value but the scenario is detective use. (D) Corrective controls restore — cameras don't restore the stolen items.","source":"curated-secplus-phase3","addedVersion":"4.99.40","addedDate":"2026-05-11"},
    {"type":"mcq","question":"An IT auditor needs to verify that a tamper-resistant hardware security module (HSM) was not physically accessed between scheduled maintenance windows. Which physical-security control is MOST appropriate to ADD to the existing locked cabinet so that any unauthorized opening between maintenance windows leaves visible evidence?","difficulty":"Exam Level","topic":"Security Controls","objective":"1.2","options":{"A":"Additional biometric lock on the cabinet door","B":"Tamper-evident seal (signed serialized adhesive label) across the cabinet seam","C":"Increased CCTV camera resolution focused on the cabinet","D":"Relocate the HSM to a different building"},"answer":"B","explanation":"Tamper-EVIDENT seals (signed serialized adhesive labels, security tape, frangible glass markers) are specifically designed to LEAVE EVIDENCE of unauthorized access — the seal is destroyed when the cabinet is opened and cannot be cleanly reapplied without a fresh seal of the same serial number. An auditor checking the seal sees immediately whether the cabinet was accessed between maintenance windows. This is a DETECTIVE control. (A) Biometric locks add prevention but don't tell the auditor whether someone WHO HAS LEGITIMATE ACCESS opened the cabinet. (C) Higher camera resolution helps but is a separate control; not the most appropriate ADD specifically for tamper-evidence. (D) Moving location relocates risk but isn't a tamper-evidence control. Concept distinction: tamper-EVIDENT leaves evidence after the fact; tamper-RESISTANT slows but doesn't stop a determined attacker; tamper-PROOF is a marketing claim — nothing is truly proof.","source":"curated-secplus-phase3","addedVersion":"4.99.40","addedDate":"2026-05-11"},

    // Cluster D — Isolation
    {"type":"multi-select","question":"(Choose TWO) An organization has two sensitive workloads: a SCADA system controlling industrial equipment, and an internet-facing public-information website. The SCADA system must be PHYSICALLY isolated from any internet-reachable network at all times. The public website needs network connectivity but should be placed in a controlled zone with strict ingress/egress firewall policies. Which physical/network isolation strategies are CORRECT for each workload?","difficulty":"Hard","topic":"Security Controls","objective":"1.2","options":{"A":"Air gap for the SCADA system (no physical network connection)","B":"DMZ (demilitarized zone) for the public-facing website (network-segmented, controlled connectivity)","C":"Air gap for both — physical isolation is the only valid approach in modern security","D":"DMZ for both — network segmentation provides equivalent protection to physical isolation","E":"VLAN segregation alone for the SCADA system (logical isolation only)"},"answers":["A","B"],"explanation":"The two workloads have fundamentally different threat models, requiring different isolation strategies. (A) AIR GAP — SCADA control systems for critical infrastructure (power, water, manufacturing) are typically air-gapped: NO physical network connection to the corporate LAN or internet. Data transfer happens only via approved removable media or one-way data diodes. Air gap is the strongest form of network isolation. (B) DMZ — public-facing services (web servers, mail relays, DNS) are placed in a DMZ — a network segment between two firewalls, with controlled ingress/egress policies that allow public access while protecting the internal network behind the second firewall. (C) Wrong — public-facing services need connectivity to be useful; air-gapping them defeats their purpose. (D) Wrong — DMZ is strong but is NOT equivalent to air gap for protecting critical control systems that should never be internet-reachable under any circumstances. (E) Wrong — VLAN segregation is logical only and is insufficient for critical control systems; an attacker with VLAN-hopping capability could traverse the boundary. Trap: confusing air gap (NO network connection) with DMZ (controlled network connection) with VLAN (logical separation on the SAME physical network).","source":"curated-secplus-phase3","addedVersion":"4.99.40","addedDate":"2026-05-11"},
    {"type":"mcq","question":"A company is evaluating physical security controls for the main entrance of their corporate headquarters during business hours. Which security control is MOST appropriate to perform the following set of JUDGMENT-based tasks: verifying that visitor IDs match a pre-approved list, escalating unusual situations to management, and intervening with discretion when an employee forgets their badge?","difficulty":"Foundational","topic":"Security Controls","objective":"1.2","options":{"A":"Higher-resolution CCTV cameras","B":"A second access control vestibule (mantrap)","C":"Trained security guards (human personnel)","D":"Additional bollards at the building approach"},"answer":"C","explanation":"The tasks listed — verifying visitor IDs against an evolving approved list, escalating unusual situations, exercising discretion when employees forget their badges — require JUDGMENT and PEOPLE SKILLS. Trained security guards are uniquely suited because they can interpret context, make case-by-case decisions, and apply discretion. (A) Cameras detect/record but don't intervene or apply judgment. (B) Mantraps prevent tailgating but can't make case-by-case visitor decisions or escalate unusual situations. (D) Bollards prevent vehicle attacks but have no judgment role. Principle: when the security task requires HUMAN JUDGMENT + ad-hoc decision-making, human personnel are the right answer; when the task is deterministic (no judgment needed), automated controls are usually more reliable and cheaper.","source":"curated-secplus-phase3","addedVersion":"4.99.40","addedDate":"2026-05-11"},

    // ── Phase 3 Cycle 5 — Deception & Disruption (v4.99.41, 2026-05-11) ─────
    // 8 exemplars across 3 clusters covering all 7 sub-concepts from user's
    // mid-morning Messer session: disruption/deception umbrella, honeypot,
    // honeynet, honeyfile, honeytoken, DNS sinkhole, fake telemetry. Pair
    // with 3 Phase 3 Cycle 5 retention concepts above.
    //
    // Cluster A — Honey-systems scope ladder (honeypot → honeynet → honeyfile → honeytoken)
    {"type":"mcq","question":"A security team deploys an intentionally vulnerable web server at an internet-reachable IP address that is NOT advertised publicly and contains NO real production data. The server is heavily instrumented to log every connection attempt and command issued. What is the PRIMARY purpose of this deployment?","difficulty":"Foundational","topic":"Security Controls","objective":"1.2","options":{"A":"To handle overflow traffic when the main web server is overloaded","B":"To act as a decoy that lures and logs attacker activity, providing early-warning and threat intelligence","C":"To serve as a backup web server if the primary fails","D":"To provide a development sandbox for the application team"},"answer":"B","explanation":"This is a classic honeypot — a system deliberately deployed to lure attackers, log their methods, and produce threat intelligence. Key honeypot traits in the scenario: NOT advertised (legitimate users won't find it), contains NO real data (no business risk), heavily instrumented (the value IS the logs). Since the system has no legitimate use, ANY connection attempt is by definition suspicious — making it a high-fidelity detection source with minimal false positives. (A) Overflow handling is load-balancer / autoscaling, not deception. (C) Backup = warm standby. (D) Sandbox is a developer tool, not a security control. SY0-701 trap: don't confuse honeypot with sandbox (sandbox safely RUNS suspect code; honeypot LURES attackers to a decoy).","source":"curated-secplus-phase3","addedVersion":"4.99.41","addedDate":"2026-05-11"},
    {"type":"mcq","question":"A large enterprise security operations team wants to study not just isolated attacker behavior on one system, but the full LATERAL-MOVEMENT chain an attacker uses across multiple systems (e.g., initial foothold on a web server → pivot to a database server → escalate to a domain controller). Which deception technology BEST fits this requirement?","difficulty":"Exam Level","topic":"Security Controls","objective":"1.2","options":{"A":"A single honeypot configured as a vulnerable web server","B":"A honeynet — a network of multiple interconnected honeypots simulating a realistic environment with workstations, servers, and infrastructure","C":"A honeyfile placed on a production file share","D":"A DNS sinkhole pointed at known C2 domains"},"answer":"B","explanation":"A honeynet is a NETWORK of multiple interconnected honeypots — multiple systems with different roles (web servers, file servers, domain controllers, workstations) — so attackers can be observed performing realistic multi-stage attacks: initial foothold, lateral movement, privilege escalation, exfiltration. The defender learns the FULL kill chain. (A) A single honeypot captures attacker behavior on ONE machine, missing the lateral-movement story. (C) Honeyfiles are file-level lures inside real production systems. (D) DNS sinkhole redirects traffic but doesn't simulate a network to be explored. Memorable distinction: honeypot = ONE decoy system, honeynet = a NETWORK of decoy systems designed to be EXPLORED by the attacker.","source":"curated-secplus-phase3","addedVersion":"4.99.41","addedDate":"2026-05-11"},
    {"type":"mcq","question":"A security team wants to detect unauthorized access to sensitive areas of a production file share that legitimate users have no reason to access. They place a file named 'passwords_2026.txt' with realistic-looking but fake content in a corner of the share. The file system is configured to fire an immediate alert if any read, copy, or move operation occurs on this file. Which deception technology is BEST described?","difficulty":"Exam Level","topic":"Security Controls","objective":"1.2","options":{"A":"Honeypot","B":"Honeynet","C":"Honeyfile","D":"Tamper-evident seal"},"answer":"C","explanation":"A honeyfile is a single file placed in a real production environment, designed to look attractive to an attacker (often named to suggest credentials, financial data, or executive-only content) but containing only realistic-looking fake content. The file is wired to fire an alert on access. Since legitimate users have no reason to touch it, ANY access is by definition suspicious. The scenario is a textbook honeyfile deployment. (A) A honeypot is an entire SYSTEM, not a file. (B) A honeynet is a NETWORK of honeypots. (D) Tamper-evident seals are physical-security controls leaving visible evidence after access — different category entirely (and physical, not data-layer).","source":"curated-secplus-phase3","addedVersion":"4.99.41","addedDate":"2026-05-11"},
    {"type":"mcq","question":"An insurance company concerned about insider data theft seeds their production CRM database with 50 FICTITIOUS customer records (realistic-looking names, addresses, fake credit-card numbers using the IANA test-card range). They configure their data-loss-prevention (DLP) system to fire a CRITICAL alert if ANY of these specific records ever appears in an outbound email, file upload, or external API call. Which deception technology is BEST described?","difficulty":"Hard","topic":"Security Controls","objective":"1.2","options":{"A":"Honeypot","B":"Honeyfile","C":"Honeytoken","D":"Data-at-rest encryption"},"answer":"C","explanation":"Honeytoken is the UMBRELLA concept for any deliberately seeded fake data designed to fire an alert when accessed, copied, or exfiltrated. The scope is broader than a honeyfile (which is one file). Honeytokens include: fake database records (this scenario), fake API keys planted in code repos, fake credentials in password vaults, fake email addresses unique to one customer list (to detect data sharing), fake AWS access keys that trigger when used. The fictitious CRM records ARE honeytokens because their detection mechanism is 'this exact data should NEVER appear outside the source system.' (A) Honeypot = a whole decoy system. (B) Honeyfile = a single file (subset of honeytoken). (D) Encryption protects data at rest but doesn't DETECT exfiltration of seeded fakes. Memorize the concept ladder: honeyfile (one file) ⊂ honeytoken (any data unit) — both lure attackers at the data layer; honeypot/honeynet operate at the system/network layer.","source":"curated-secplus-phase3","addedVersion":"4.99.41","addedDate":"2026-05-11"},

    // Cluster B — Traffic redirection (DNS sinkhole)
    {"type":"mcq","question":"A threat-intelligence feed publishes a list of 47 domains used by a known malware family's command-and-control (C2) infrastructure. The security team wants to ensure that any internal device infected with this malware is unable to reach its C2 servers, AND wants to log every internal IP that attempts to resolve one of these domains so infected hosts can be identified and remediated. Which control BEST achieves BOTH goals simultaneously?","difficulty":"Exam Level","topic":"Security Controls","objective":"1.2","options":{"A":"Block the 47 domains at the web proxy with a 'deny' policy","B":"Configure the recursive DNS resolver to sinkhole the 47 domains — return a controlled IP (often null or a security-team-controlled honeypot) and log the requesting client","C":"Block outbound TCP/443 to all 47 domains at the perimeter firewall","D":"Deploy IDS signatures for the 47 domain names in the HTTPS SNI extension"},"answer":"B","explanation":"A DNS sinkhole is the canonical control for this exact scenario. The recursive DNS resolver is configured with the bad-domain list and returns a controlled response (typically a null IP, a dedicated sinkhole VLAN address, or a security-team-controlled honeypot) for any matching request. Two simultaneous benefits: (1) infected clients CANNOT reach the real C2 because they receive the sinkhole IP, and (2) the resolver LOGS every client that tried, which is exactly the list of likely-infected hosts needing remediation. (A) Web proxy denies cover only HTTP/HTTPS via the proxy — modern C2 uses many protocols. (C) Firewalls block IPs not domains; modern C2 uses fast-flux/DGA + the IPs rotate constantly. (D) IDS signature on SNI catches the connection AFTER DNS resolution has succeeded — too late for prevention.","source":"curated-secplus-phase3","addedVersion":"4.99.41","addedDate":"2026-05-11"},
    {"type":"multi-select","question":"(Choose TWO) A security analyst is asked to distinguish a DNS sinkhole from a sandbox. Which of the following correctly identify DIFFERENCES between the two technologies?","difficulty":"Hard","topic":"Security Controls","objective":"1.2","options":{"A":"A DNS sinkhole intercepts NAME RESOLUTION for known-bad domains; a sandbox executes suspect code in an isolated environment to observe behavior","B":"A DNS sinkhole and a sandbox are different terms for the same control","C":"A sandbox is a NETWORK-level control; a DNS sinkhole is a HOST-level control","D":"A DNS sinkhole is primarily a DETECTION + PREVENTION control (logs + blocks C2 at the DNS layer); a sandbox is primarily an ANALYSIS control (study malware behavior safely)","E":"Both technologies fire an alert whenever an internal user resolves a known-malicious domain"},"answers":["A","D"],"explanation":"The two technologies operate at different layers and serve different primary purposes. (A) DNS sinkhole = name-resolution layer — when a host tries to resolve a known-bad domain, the response is poisoned to a safe/controlled address. Sandbox = execution layer — suspect code is run in an isolated VM/container to observe behavior before it touches a real production host. (D) Purpose differs: sinkhole both prevents real C2 communication AND detects infected hosts (an active defensive control). Sandbox is an analysis tool — security teams submit samples and study what they do. (B) Wrong — they are distinct controls. (C) Wrong — DNS sinkhole is typically network-level (at the recursive resolver); sandboxes can be network or host. (E) Wrong — a sandbox doesn't watch DNS lookups; it executes suspect code.","source":"curated-secplus-phase3","addedVersion":"4.99.41","addedDate":"2026-05-11"},

    // Cluster C — Disinformation + umbrella (fake telemetry + deception vs disruption)
    {"type":"mcq","question":"A defense contractor's security team is concerned about a sophisticated adversary performing slow, low-noise reconnaissance against their network for months before any active attack. They want to MISLEAD the adversary's reconnaissance, causing the adversary to build an inaccurate map of the network and to make incorrect assumptions about deployed defenses and service versions. Which deception technique BEST addresses this need?","difficulty":"Exam Level","topic":"Security Controls","objective":"1.2","options":{"A":"Implementing a DNS sinkhole","B":"Generating FAKE TELEMETRY — feeding deliberately misleading network maps, service banners, version strings, and asset metadata to public-facing reconnaissance surfaces","C":"Increasing log retention from 30 days to 1 year","D":"Deploying additional endpoint detection-and-response (EDR) agents"},"answer":"B","explanation":"Fake telemetry is a deception technology where the defender deliberately injects FALSE signals into the channels an attacker uses for reconnaissance — fake service banners, fake DNS records pointing to non-existent infrastructure, fake version strings on exposed services, fake asset-inventory data accessible through deliberately-misconfigured-looking endpoints, fake employee directories. The goal: the attacker spends months building a model of the environment that is intentionally wrong. When they launch the actual attack, their exploit payloads target service versions that aren't really deployed, their phishing lists target non-existent employees, their lateral-movement assumptions break on contact. (A) DNS sinkhole defeats active C2, not reconnaissance. (C) Log retention is detective/forensic, not deceptive. (D) EDR detects active execution on endpoints, not reconnaissance deception against external attackers. Fake telemetry is the canonical 'lie to the attacker' control for SY0-701 Domain 1.2.","source":"curated-secplus-phase3","addedVersion":"4.99.41","addedDate":"2026-05-11"},
    {"type":"mcq","question":"SY0-701 groups 'deception' technologies and 'disruption' technologies under one objective. Which of the following BEST distinguishes DECEPTION technologies from DISRUPTION technologies?","difficulty":"Foundational","topic":"Security Controls","objective":"1.2","options":{"A":"Deception technologies LURE the attacker into engaging with fake assets so defenders can detect/study them; disruption technologies actively INTERFERE with attacker operations (e.g., sinkholing C2, blocking exfiltration channels)","B":"Deception is offensive; disruption is defensive","C":"Deception happens before an attack; disruption only happens after a breach is confirmed","D":"The two terms are synonymous — CompTIA uses both to avoid favoring one vendor's terminology"},"answer":"A","explanation":"DECEPTION and DISRUPTION are complementary but distinct categories of defensive technique. DECEPTION = lure-and-observe: the defender creates fake assets/data and waits for the attacker to engage with them (honeypot, honeynet, honeyfile, honeytoken, fake telemetry). DISRUPTION = active interference: the defender directly impedes attacker operations (DNS sinkhole redirecting C2, RPZ poisoning, beacon jamming, deliberate latency injection on exfiltration paths). Note that some technologies bridge both — e.g., a DNS sinkhole that redirects to a honeypot is BOTH disruption (real C2 fails) AND deception (the attacker now talks to your decoy). (B) Wrong — both are defensive; active offensive 'counter-hacking' is legally murky and not what CompTIA covers in Domain 1.2. (C) Wrong — both can be deployed proactively, before any specific attack. (D) Wrong — they are distinct concepts that often complement each other.","source":"curated-secplus-phase3","addedVersion":"4.99.41","addedDate":"2026-05-11"}
  ],

  // ── Acronym Blitz drill bank (v4.91.0) ───────────────────────────────────
  // SY0-701 acronym bank consumed by the Acronym Blitz drill scaffold when
  // CURRENT_CERT === 'secplus'. The scaffold auto-generates 3 distractors
  // per question by sampling other entries in this same array, so each
  // entry only needs the canonical {abbr, full, cat, obj, diff} fields.
  // Mnemonic field is optional — included on tricky/easily-confused pairs.
  // Total: 120 acronyms across 7 categories. Mockup signoff:
  // mockups/security-acronym-blitz-concept.html (zero-revision-round).
  acronymCategories: {
    threats:    { label: 'Threats & Attacks',     icon: '⚔️',     color: '#ef4444' },
    detection:  { label: 'Detection & Response',  icon: '🛡️', color: '#3b82f6' },
    identity:   { label: 'Identity & Access',     icon: '🔑',     color: '#8b5cf6' },
    crypto:     { label: 'Crypto & PKI',          icon: '🔐',     color: '#10b981' },
    network:    { label: 'Network Security',      icon: '🌐',     color: '#f59e0b' },
    compliance: { label: 'Compliance & Governance', icon: '📋',   color: '#6366f1' },
    operations: { label: 'Operations & Cloud',    icon: '⚙️',     color: '#06b6d4' }
  },

  acronymBank: [
    // ── Threats & Attacks (18) ─────────────────────────────────────────────
    {abbr:'APT',full:'Advanced Persistent Threat',cat:'threats',obj:'2.1',diff:'easy',mnemonic:'APT = patient, well-funded attackers (often nation-states)'},
    {abbr:'RAT',full:'Remote Access Trojan',cat:'threats',obj:'2.4',diff:'easy',mnemonic:'RAT = malware giving attacker remote control of host'},
    {abbr:'DDoS',full:'Distributed Denial of Service',cat:'threats',obj:'2.4',diff:'easy',mnemonic:'DDoS = many sources flood ONE target'},
    {abbr:'DoS',full:'Denial of Service',cat:'threats',obj:'2.4',diff:'easy'},
    {abbr:'MITM',full:'Man-in-the-Middle',cat:'threats',obj:'2.4',diff:'easy',mnemonic:'MITM = attacker intercepts comms between two parties'},
    {abbr:'MITB',full:'Man-in-the-Browser',cat:'threats',obj:'2.4',diff:'medium',mnemonic:'MITB = trojan modifies pages/transactions inside the browser'},
    {abbr:'SQLi',full:'SQL Injection',cat:'threats',obj:'2.3',diff:'easy'},
    {abbr:'XSS',full:'Cross-Site Scripting',cat:'threats',obj:'2.3',diff:'easy',mnemonic:'XSS = injects scripts into trusted sites (browser executes)'},
    {abbr:'CSRF',full:'Cross-Site Request Forgery',cat:'threats',obj:'2.3',diff:'medium',mnemonic:'CSRF = tricks browser into submitting authenticated request'},
    {abbr:'SSRF',full:'Server-Side Request Forgery',cat:'threats',obj:'2.3',diff:'medium',mnemonic:'SSRF = tricks SERVER to make requests to internal resources'},
    {abbr:'RCE',full:'Remote Code Execution',cat:'threats',obj:'2.3',diff:'medium'},
    {abbr:'LFI',full:'Local File Inclusion',cat:'threats',obj:'2.3',diff:'hard',mnemonic:'LFI = web app loads attacker-controlled local files via path traversal'},
    {abbr:'BEC',full:'Business Email Compromise',cat:'threats',obj:'2.2',diff:'easy',mnemonic:'BEC = spoof/compromise exec email to trick wire transfers'},
    {abbr:'OSINT',full:'Open-Source Intelligence',cat:'threats',obj:'2.4',diff:'medium',mnemonic:'OSINT = reconnaissance from publicly available sources'},
    {abbr:'IoC',full:'Indicators of Compromise',cat:'threats',obj:'2.5',diff:'easy',mnemonic:'IoC = forensic artifacts confirming intrusion (post-fact)'},
    {abbr:'IoA',full:'Indicators of Attack',cat:'threats',obj:'2.5',diff:'medium',mnemonic:'IoA = behavior patterns suggesting attack in progress (vs IoC)'},
    {abbr:'TTP',full:'Tactics, Techniques, and Procedures',cat:'threats',obj:'2.5',diff:'medium',mnemonic:'TTP = how a threat actor operates repeatably (MITRE ATT&CK)'},
    {abbr:'OWASP',full:'Open Worldwide Application Security Project',cat:'threats',obj:'2.3',diff:'medium',mnemonic:'OWASP = publishes the famous Top 10 web vulnerabilities list'},

    // ── Detection & Response (17) ──────────────────────────────────────────
    {abbr:'SIEM',full:'Security Information and Event Management',cat:'detection',obj:'4.4',diff:'easy',mnemonic:'SIEM = aggregates + correlates logs across the org'},
    {abbr:'SOAR',full:'Security Orchestration, Automation, and Response',cat:'detection',obj:'4.4',diff:'medium',mnemonic:'SOAR = automates analyst playbooks (block IP, quarantine, ticket)'},
    {abbr:'EDR',full:'Endpoint Detection and Response',cat:'detection',obj:'4.4',diff:'easy'},
    {abbr:'MDR',full:'Managed Detection and Response',cat:'detection',obj:'4.4',diff:'medium',mnemonic:'MDR = EDR + 24/7 outsourced SOC analysts'},
    {abbr:'XDR',full:'Extended Detection and Response',cat:'detection',obj:'4.4',diff:'medium',mnemonic:'XDR = cross-source correlation: endpoint + network + cloud + identity'},
    {abbr:'NDR',full:'Network Detection and Response',cat:'detection',obj:'4.4',diff:'hard'},
    {abbr:'UEBA',full:'User and Entity Behavior Analytics',cat:'detection',obj:'4.4',diff:'medium'},
    {abbr:'IDS',full:'Intrusion Detection System',cat:'detection',obj:'4.4',diff:'easy',mnemonic:'IDS = passive — alerts on suspicious traffic, doesn’t block'},
    {abbr:'IPS',full:'Intrusion Prevention System',cat:'detection',obj:'4.4',diff:'easy',mnemonic:'IPS = inline — alerts AND blocks suspicious traffic'},
    {abbr:'NIDS',full:'Network-based Intrusion Detection System',cat:'detection',obj:'4.4',diff:'medium'},
    {abbr:'NIPS',full:'Network-based Intrusion Prevention System',cat:'detection',obj:'4.4',diff:'medium'},
    {abbr:'HIDS',full:'Host-based Intrusion Detection System',cat:'detection',obj:'4.4',diff:'medium'},
    {abbr:'HIPS',full:'Host-based Intrusion Prevention System',cat:'detection',obj:'4.4',diff:'medium'},
    {abbr:'SOC',full:'Security Operations Center',cat:'detection',obj:'4.5',diff:'easy'},
    {abbr:'IRP',full:'Incident Response Plan',cat:'detection',obj:'4.8',diff:'easy'},
    {abbr:'RCA',full:'Root Cause Analysis',cat:'detection',obj:'4.8',diff:'easy'},
    {abbr:'TLP',full:'Traffic Light Protocol',cat:'detection',obj:'5.5',diff:'hard',mnemonic:'TLP = info-sharing classification (Red/Amber/Green/White)'},

    // ── Identity & Access (17) ─────────────────────────────────────────────
    {abbr:'IAM',full:'Identity and Access Management',cat:'identity',obj:'4.6',diff:'easy'},
    {abbr:'MFA',full:'Multi-Factor Authentication',cat:'identity',obj:'4.6',diff:'easy',mnemonic:'MFA = something you know + have + are (≥2 factors)'},
    {abbr:'2FA',full:'Two-Factor Authentication',cat:'identity',obj:'4.6',diff:'easy'},
    {abbr:'SSO',full:'Single Sign-On',cat:'identity',obj:'4.6',diff:'easy'},
    {abbr:'SAML',full:'Security Assertion Markup Language',cat:'identity',obj:'4.6',diff:'medium',mnemonic:'SAML = XML standard for SSO between IdP and SP'},
    {abbr:'OAuth',full:'Open Authorization',cat:'identity',obj:'4.6',diff:'medium',mnemonic:'OAuth = delegated authorization via tokens (not authentication!)'},
    {abbr:'OIDC',full:'OpenID Connect',cat:'identity',obj:'4.6',diff:'medium',mnemonic:'OIDC = authentication LAYER on top of OAuth 2.0'},
    {abbr:'FIDO',full:'Fast Identity Online',cat:'identity',obj:'4.6',diff:'hard',mnemonic:'FIDO = passwordless authentication standards'},
    {abbr:'RBAC',full:'Role-Based Access Control',cat:'identity',obj:'4.6',diff:'easy',mnemonic:'RBAC = permissions assigned via roles (admin/user/guest)'},
    {abbr:'ABAC',full:'Attribute-Based Access Control',cat:'identity',obj:'4.6',diff:'medium',mnemonic:'ABAC = permissions evaluated against attributes (time/location/device)'},
    {abbr:'DAC',full:'Discretionary Access Control',cat:'identity',obj:'4.6',diff:'medium',mnemonic:'DAC = resource OWNER decides access (file ACLs)'},
    {abbr:'MAC',full:'Mandatory Access Control',cat:'identity',obj:'4.6',diff:'medium',mnemonic:'MAC = SYSTEM enforces via labels/clearances (military)'},
    {abbr:'PAM',full:'Privileged Access Management',cat:'identity',obj:'4.6',diff:'medium',mnemonic:'PAM = securing + monitoring elevated/admin accounts'},
    {abbr:'JIT',full:'Just-In-Time access',cat:'identity',obj:'4.6',diff:'medium',mnemonic:'JIT = temporary elevation granted only when needed'},
    {abbr:'OTP',full:'One-Time Password',cat:'identity',obj:'4.6',diff:'easy'},
    {abbr:'TOTP',full:'Time-Based One-Time Password',cat:'identity',obj:'4.6',diff:'medium',mnemonic:'TOTP = OTP that changes on a TIME schedule (typically 30s)'},
    {abbr:'HOTP',full:'HMAC-Based One-Time Password',cat:'identity',obj:'4.6',diff:'hard',mnemonic:'HOTP = OTP generated via COUNTER + HMAC (not time-based)'},

    // ── Crypto & PKI (18) ──────────────────────────────────────────────────
    {abbr:'AES',full:'Advanced Encryption Standard',cat:'crypto',obj:'1.4',diff:'easy',mnemonic:'AES = symmetric block cipher (most modern encryption)'},
    {abbr:'RSA',full:'Rivest-Shamir-Adleman',cat:'crypto',obj:'1.4',diff:'easy',mnemonic:'RSA = asymmetric: encryption + digital signatures'},
    {abbr:'ECC',full:'Elliptic Curve Cryptography',cat:'crypto',obj:'1.4',diff:'medium',mnemonic:'ECC = asymmetric crypto with smaller keys vs RSA'},
    {abbr:'ECDSA',full:'Elliptic Curve Digital Signature Algorithm',cat:'crypto',obj:'1.4',diff:'hard'},
    {abbr:'ECDHE',full:'Elliptic Curve Diffie-Hellman Ephemeral',cat:'crypto',obj:'1.4',diff:'hard',mnemonic:'ECDHE = key exchange providing forward secrecy'},
    {abbr:'SHA',full:'Secure Hash Algorithm',cat:'crypto',obj:'1.4',diff:'easy',mnemonic:'SHA = family of cryptographic hashes (SHA-256, SHA-3)'},
    {abbr:'HMAC',full:'Hash-based Message Authentication Code',cat:'crypto',obj:'1.4',diff:'medium',mnemonic:'HMAC = hash function combined with secret key'},
    {abbr:'PBKDF2',full:'Password-Based Key Derivation Function 2',cat:'crypto',obj:'1.4',diff:'hard',mnemonic:'PBKDF2 = slow hash for password storage (with bcrypt, Argon2)'},
    {abbr:'MD5',full:'Message Digest 5',cat:'crypto',obj:'1.4',diff:'easy',mnemonic:'MD5 = BROKEN hash, not for security use anymore'},
    {abbr:'DES',full:'Data Encryption Standard',cat:'crypto',obj:'1.4',diff:'easy',mnemonic:'DES = OBSOLETE 56-bit symmetric cipher'},
    {abbr:'3DES',full:'Triple Data Encryption Standard',cat:'crypto',obj:'1.4',diff:'easy',mnemonic:'3DES = DES applied 3x (deprecated, use AES)'},
    {abbr:'CA',full:'Certificate Authority',cat:'crypto',obj:'1.4',diff:'easy',mnemonic:'CA = trusted entity that issues digital certificates'},
    {abbr:'RA',full:'Registration Authority',cat:'crypto',obj:'1.4',diff:'medium',mnemonic:'RA = verifies identity BEFORE CA issues a cert'},
    {abbr:'CRL',full:'Certificate Revocation List',cat:'crypto',obj:'1.4',diff:'medium',mnemonic:'CRL = list of certs revoked before expiration'},
    {abbr:'OCSP',full:'Online Certificate Status Protocol',cat:'crypto',obj:'1.4',diff:'medium',mnemonic:'OCSP = real-time cert validity check (replaces CRL polling)'},
    {abbr:'CSR',full:'Certificate Signing Request',cat:'crypto',obj:'1.4',diff:'easy',mnemonic:'CSR = application sent to CA to issue a certificate'},
    {abbr:'KMS',full:'Key Management Service',cat:'crypto',obj:'1.4',diff:'medium',mnemonic:'KMS = cloud service for managing encryption keys'},
    {abbr:'HSM',full:'Hardware Security Module',cat:'crypto',obj:'1.4',diff:'medium',mnemonic:'HSM = tamper-resistant device for storing crypto keys'},

    // ── Network Security (17) ──────────────────────────────────────────────
    {abbr:'VPN',full:'Virtual Private Network',cat:'network',obj:'3.2',diff:'easy',mnemonic:'VPN = encrypted tunnel over public network'},
    {abbr:'IPsec',full:'Internet Protocol Security',cat:'network',obj:'3.2',diff:'easy',mnemonic:'IPsec = suite of protocols for secure IP communication'},
    {abbr:'SSL',full:'Secure Sockets Layer',cat:'network',obj:'3.2',diff:'easy',mnemonic:'SSL = DEPRECATED predecessor to TLS'},
    {abbr:'TLS',full:'Transport Layer Security',cat:'network',obj:'3.2',diff:'easy',mnemonic:'TLS = modern protocol securing data over networks (HTTPS, etc.)'},
    {abbr:'mTLS',full:'Mutual Transport Layer Security',cat:'network',obj:'3.2',diff:'medium',mnemonic:'mTLS = BOTH client and server present certificates (zero-trust)'},
    {abbr:'NAT',full:'Network Address Translation',cat:'network',obj:'3.2',diff:'easy',mnemonic:'NAT = maps private IPs to public for internet traffic'},
    {abbr:'PAT',full:'Port Address Translation',cat:'network',obj:'3.2',diff:'medium',mnemonic:'PAT = NAT variant using ports to multiplex private IPs'},
    {abbr:'ACL',full:'Access Control List',cat:'network',obj:'3.2',diff:'easy',mnemonic:'ACL = ordered rules permit/deny traffic on a device'},
    {abbr:'NAC',full:'Network Access Control',cat:'network',obj:'3.2',diff:'medium',mnemonic:'NAC = enforces compliance BEFORE granting network access'},
    {abbr:'DMZ',full:'Demilitarized Zone',cat:'network',obj:'3.2',diff:'easy',mnemonic:'DMZ = network segment exposing public-facing services'},
    {abbr:'WAF',full:'Web Application Firewall',cat:'network',obj:'3.2',diff:'easy',mnemonic:'WAF = filters HTTP traffic to web apps (L7)'},
    {abbr:'NGFW',full:'Next-Generation Firewall',cat:'network',obj:'3.2',diff:'medium',mnemonic:'NGFW = firewall + deep packet inspection + app awareness'},
    {abbr:'UTM',full:'Unified Threat Management',cat:'network',obj:'3.2',diff:'medium',mnemonic:'UTM = all-in-one security appliance'},
    {abbr:'SD-WAN',full:'Software-Defined Wide Area Network',cat:'network',obj:'3.2',diff:'medium',mnemonic:'SD-WAN = WAN management abstracted by software'},
    {abbr:'ZTNA',full:'Zero Trust Network Access',cat:'network',obj:'3.2',diff:'medium',mnemonic:'ZTNA = verify-then-trust (never assume internal=safe)'},
    {abbr:'SASE',full:'Secure Access Service Edge',cat:'network',obj:'3.2',diff:'hard',mnemonic:'SASE = SD-WAN + ZTNA + CASB cloud-delivered'},
    {abbr:'EAP',full:'Extensible Authentication Protocol',cat:'network',obj:'3.2',diff:'medium',mnemonic:'EAP = authentication framework, esp. for wireless'},

    // ── Compliance & Governance (17) ───────────────────────────────────────
    {abbr:'GDPR',full:'General Data Protection Regulation',cat:'compliance',obj:'5.1',diff:'easy',mnemonic:'GDPR = EU privacy/data-protection regulation'},
    {abbr:'HIPAA',full:'Health Insurance Portability and Accountability Act',cat:'compliance',obj:'5.1',diff:'easy',mnemonic:'HIPAA = US healthcare privacy law (PHI)'},
    {abbr:'PCI-DSS',full:'Payment Card Industry Data Security Standard',cat:'compliance',obj:'5.1',diff:'easy',mnemonic:'PCI-DSS = credit card data protection'},
    {abbr:'SOX',full:'Sarbanes-Oxley Act',cat:'compliance',obj:'5.1',diff:'medium',mnemonic:'SOX = US corporate financial reporting / accountability'},
    {abbr:'GLBA',full:'Gramm-Leach-Bliley Act',cat:'compliance',obj:'5.1',diff:'hard',mnemonic:'GLBA = US financial info privacy'},
    {abbr:'FERPA',full:'Family Educational Rights and Privacy Act',cat:'compliance',obj:'5.1',diff:'hard',mnemonic:'FERPA = US student records privacy'},
    {abbr:'FISMA',full:'Federal Information Security Management Act',cat:'compliance',obj:'5.1',diff:'medium',mnemonic:'FISMA = US gov info security'},
    {abbr:'ISO',full:'International Organization for Standardization',cat:'compliance',obj:'5.1',diff:'easy'},
    {abbr:'NIST',full:'National Institute of Standards and Technology',cat:'compliance',obj:'5.1',diff:'easy'},
    {abbr:'CSF',full:'Cybersecurity Framework',cat:'compliance',obj:'5.1',diff:'medium',mnemonic:'CSF = NIST risk-based framework (Identify/Protect/Detect/Respond/Recover)'},
    {abbr:'RMF',full:'Risk Management Framework',cat:'compliance',obj:'5.1',diff:'medium',mnemonic:'RMF = NIST 7-step process for managing security risk'},
    {abbr:'CIS',full:'Center for Internet Security',cat:'compliance',obj:'5.1',diff:'easy',mnemonic:'CIS = publishes Controls + Benchmarks (hardening guides)'},
    {abbr:'COBIT',full:'Control Objectives for Information and Related Technologies',cat:'compliance',obj:'5.1',diff:'hard',mnemonic:'COBIT = IT governance framework'},
    {abbr:'SOC 2',full:'System and Organization Controls 2',cat:'compliance',obj:'5.1',diff:'medium',mnemonic:'SOC 2 = audit report on org’s security controls'},
    {abbr:'PII',full:'Personally Identifiable Information',cat:'compliance',obj:'5.1',diff:'easy'},
    {abbr:'PHI',full:'Protected Health Information',cat:'compliance',obj:'5.1',diff:'easy',mnemonic:'PHI = health data covered by HIPAA'},
    {abbr:'AUP',full:'Acceptable Use Policy',cat:'compliance',obj:'5.1',diff:'easy'},

    // ── Operations & Cloud (16) ────────────────────────────────────────────
    {abbr:'DLP',full:'Data Loss Prevention',cat:'operations',obj:'4.5',diff:'easy',mnemonic:'DLP = monitors + blocks sensitive data leaving the org'},
    {abbr:'CASB',full:'Cloud Access Security Broker',cat:'operations',obj:'3.1',diff:'medium',mnemonic:'CASB = sits between users + cloud apps (security/policy)'},
    {abbr:'CSPM',full:'Cloud Security Posture Management',cat:'operations',obj:'3.1',diff:'hard',mnemonic:'CSPM = identifies cloud misconfigs + compliance gaps'},
    {abbr:'CWPP',full:'Cloud Workload Protection Platform',cat:'operations',obj:'3.1',diff:'hard',mnemonic:'CWPP = protects cloud workloads (VMs, containers)'},
    {abbr:'SCAP',full:'Security Content Automation Protocol',cat:'operations',obj:'4.3',diff:'hard'},
    {abbr:'OVAL',full:'Open Vulnerability and Assessment Language',cat:'operations',obj:'4.3',diff:'hard'},
    {abbr:'FIM',full:'File Integrity Monitoring',cat:'operations',obj:'4.5',diff:'medium',mnemonic:'FIM = detects unauthorized changes to files'},
    {abbr:'MDM',full:'Mobile Device Management',cat:'operations',obj:'4.1',diff:'easy'},
    {abbr:'MAM',full:'Mobile Application Management',cat:'operations',obj:'4.1',diff:'medium'},
    {abbr:'EMM',full:'Enterprise Mobility Management',cat:'operations',obj:'4.1',diff:'medium',mnemonic:'EMM = MDM + MAM combined'},
    {abbr:'RPO',full:'Recovery Point Objective',cat:'operations',obj:'3.4',diff:'easy',mnemonic:'RPO = MAX acceptable DATA LOSS measured in time'},
    {abbr:'RTO',full:'Recovery Time Objective',cat:'operations',obj:'3.4',diff:'easy',mnemonic:'RTO = MAX acceptable TIME to restore service'},
    {abbr:'MTTR',full:'Mean Time To Recover',cat:'operations',obj:'3.4',diff:'medium'},
    {abbr:'MTBF',full:'Mean Time Between Failures',cat:'operations',obj:'3.4',diff:'medium'},
    {abbr:'BCP',full:'Business Continuity Plan',cat:'operations',obj:'3.4',diff:'easy',mnemonic:'BCP = keep org running DURING/AFTER disruption'},
    {abbr:'DRP',full:'Disaster Recovery Plan',cat:'operations',obj:'3.4',diff:'easy',mnemonic:'DRP = restore IT systems after major disruption'}
  ],

  // Lessons cheatsheet — one entry per category. Brief intro + auto-derived
  // table from the bank entries that share the catId. Lighter than Network+
  // AB lessons (which have 2-page theory blocks); revisit for v0.1 if the
  // user asks for deeper lesson content per category.
  acronymLessons: [
    { id: 'threats', catId: 'threats', title: 'Threats & Attacks', icon: '⚔️',
      desc: 'Attack vectors, attacker categories, and the indicators security teams use to recognize them.',
      theory: [
        'These acronyms cover the BAD STUFF on SY0-701: who attacks (APT, RAT operators), how they attack (DDoS, MITM, SQLi, XSS, CSRF, SSRF, RCE, BEC), what they leave behind (IoC = post-fact forensic artifacts), and what they’re doing in real time (IoA = behavior patterns suggesting an attack in progress).',
        '<strong>Confusion pair to lock down:</strong> IoC vs IoA — IoC is something already happened (a malicious file hash, a known-bad IP in your logs); IoA is something happening right now (a process spawning suspicious children, unusual outbound beacons). Both are tested directly on the exam.'
      ] },
    { id: 'detection', catId: 'detection', title: 'Detection & Response', icon: '🛡️',
      desc: 'The platforms and processes a SOC analyst uses every day.',
      theory: [
        'SY0-701 Domain 4 (Security Operations) is 28% of the exam — the LARGEST domain — and it’s built on the acronyms in this category. Master SIEM, SOAR, EDR/MDR/XDR, IDS/IPS variants, and the IR lifecycle terms.',
        '<strong>Confusion pair to lock down:</strong> SIEM vs SOAR — SIEM aggregates and correlates logs to alert analysts; SOAR is the layer ABOVE SIEM that automates response actions (block IP, quarantine endpoint, open ticket) via analyst-authored playbooks. Many shops have both.',
        '<strong>EDR vs MDR vs XDR:</strong> EDR is the technology on endpoints. MDR is EDR + 24/7 outsourced analysts. XDR extends correlation across endpoint + network + cloud + identity sources.'
      ] },
    { id: 'identity', catId: 'identity', title: 'Identity & Access', icon: '🔑',
      desc: 'Who is the user, what can they access, and how do we prove it?',
      theory: [
        'IAM is the fastest-changing area on SY0-701 — federation (SAML, OIDC), zero-trust principles, FIDO passwordless, and the four authorization models (DAC, MAC, RBAC, ABAC).',
        '<strong>Authorization model decision flow:</strong> Owner decides? → DAC. System decides via labels/clearances? → MAC. Permissions tied to a role/job function? → RBAC. Permissions evaluated dynamically against user/resource/environment attributes (time, location, device posture)? → ABAC.',
        '<strong>OAuth vs OIDC:</strong> OAuth is delegated AUTHORIZATION (giving an app access to your data). OIDC sits on top of OAuth and adds authentication (proving who you are). Many vendors say "OAuth login" when they really mean OIDC.'
      ] },
    { id: 'crypto', catId: 'crypto', title: 'Crypto & PKI', icon: '🔐',
      desc: 'The math + infrastructure that keeps data confidential and trustworthy.',
      theory: [
        'Symmetric (AES) vs asymmetric (RSA, ECC). Hashing (SHA-2, SHA-3, HMAC, PBKDF2) for integrity and password storage. PKI lifecycle: CA issues, CSR is the application, OCSP/CRL handle revocation.',
        '<strong>Always-deprecated set:</strong> MD5, SHA-1, DES, 3DES, RC4, SSL (any version). The exam will test whether you recognize these as broken/legacy.',
        '<strong>Forward secrecy:</strong> ECDHE provides session-key forward secrecy — even if the long-term private key is later compromised, past sessions stay confidential.'
      ] },
    { id: 'network', catId: 'network', title: 'Network Security', icon: '🌐',
      desc: 'Filtering, segmentation, encrypted transport, and the modern zero-trust replacements.',
      theory: [
        'Classical layered defense (DMZ, ACLs, NAT, WAF) is being replaced by zero-trust patterns (ZTNA, SASE) where every access request is verified rather than relying on network position.',
        '<strong>NGFW vs WAF:</strong> NGFW does L3-L7 inspection across all traffic. WAF specifically inspects HTTP traffic to web apps (SQLi, XSS protection at the request level).',
        '<strong>SASE = SD-WAN + ZTNA + CASB</strong> bundled into a cloud-delivered service. This is the trendy architecture pattern on SY0-701.'
      ] },
    { id: 'compliance', catId: 'compliance', title: 'Compliance & Governance', icon: '📋',
      desc: 'The laws, frameworks, and policies that shape what “security” actually means in your industry.',
      theory: [
        'Regulations apply by industry: HIPAA (healthcare), PCI-DSS (payment cards), SOX (publicly-traded financial reporting), GLBA (financial info), FERPA (education), GDPR (any org handling EU resident data), FISMA (US government).',
        'Frameworks are voluntary best-practices: NIST CSF (5 functions), NIST RMF (7 steps), ISO 27001 (audit-certifiable management system), CIS Controls (prioritized 18-control list), COBIT (governance).',
        '<strong>Data classifications:</strong> PII (any identifying info), PHI (health-specific), SPI (sensitive personal info, more restrictive than PII). The exam tests classification frequently.'
      ] },
    { id: 'operations', catId: 'operations', title: 'Operations & Cloud', icon: '⚙️',
      desc: 'Day-to-day security operations, mobile/cloud platforms, and business-continuity metrics.',
      theory: [
        'Cloud-specific security tools live here: CASB (cloud-app gateway), CSPM (cloud-config posture), CWPP (workload protection in containers/VMs).',
        '<strong>RPO vs RTO:</strong> RPO is the MAX DATA LOSS you can tolerate (measured in time, e.g., “we back up every 4 hours, so RPO = 4 hours”). RTO is the MAX TIME to restore service after a disruption. Both are critical inputs to BCP/DRP.',
        '<strong>MDM/MAM/EMM trio:</strong> MDM controls the whole device. MAM controls just the apps + their data. EMM is the modern umbrella that combines both.'
      ] }
  ],

  // ── ATTACK-TO-MITIGATION MATCH (v4.94.0, issue #301) ─────────────────────
  // 96 attack/mitigation pairs across 5 categories. Drill format: stem = attack
  // name + sub-line + objective tag, 4 MCQ options (1 correct + 3 plausible
  // distractors). All 4 options are real mitigations — the trap is picking a
  // less-correct one. Visual contract locked to mockup `mockups/security-
  // attack-mitigation-match-concept.html` State 3.
  attackMitigationCategories: {
    webapp:    { label: 'Web / App attacks',    icon: '🌐', color: '#dc2626' },
    socialeng: { label: 'Social engineering',   icon: '🎣', color: '#f59e0b' },
    network:   { label: 'Network attacks',      icon: '🛰', color: '#5b4fdb' },
    malware:   { label: 'Malware',              icon: '🦠', color: '#16a34a' },
    physical:  { label: 'Insider / Physical',   icon: '🚪', color: '#06b6d4' }
  },
  attackMitigationPairs: [
    // ── Web / App attacks (18) ─────────────────────────────────────────────
    { id: 'sql-inj', attack: 'SQL Injection', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 2,
      correct: { name: 'Parameterized queries', sub: 'Code-level prevention' },
      distractors: [
        { name: 'WAF rule', sub: 'Network-edge filter' },
        { name: 'Rate limiting', sub: 'Throttling defence' },
        { name: 'Network segmentation', sub: 'Lateral-movement control' }
      ],
      why: 'A WAF can detect known patterns at the edge but it\'s a signature game. Parameterized queries remove the vulnerability — user input is bound as data, never as SQL syntax. Root cause beats edge filter.' },
    { id: 'xss', attack: 'Cross-Site Scripting (XSS)', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 2,
      correct: { name: 'Output encoding + Content Security Policy', sub: 'Render-time prevention' },
      distractors: [
        { name: 'Input length limits', sub: 'Bounds checking' },
        { name: 'HTTPS everywhere', sub: 'Transport encryption' },
        { name: 'Anti-virus on the server', sub: 'Endpoint hygiene' }
      ],
      why: 'Output encoding stops user input from being interpreted as HTML/JS at render time. CSP adds defence-in-depth by restricting which scripts can run. Length limits + HTTPS don\'t address the injection itself.' },
    { id: 'csrf', attack: 'Cross-Site Request Forgery (CSRF)', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 2,
      correct: { name: 'Anti-CSRF tokens', sub: 'Synchroniser-token pattern' },
      distractors: [
        { name: 'Strong password policy', sub: 'Credential hygiene' },
        { name: 'Account lockout', sub: 'Brute-force defence' },
        { name: 'TLS pinning', sub: 'MITM prevention' }
      ],
      why: 'Anti-CSRF tokens are the canonical fix: a per-session unguessable token in forms that the attacker can\'t supply from a malicious site. Password policy + lockout target different attacks.' },
    { id: 'directory-traversal', attack: 'Directory traversal', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 2,
      correct: { name: 'Path canonicalisation + chroot', sub: 'Filesystem boundary enforcement' },
      distractors: [
        { name: 'Strong file permissions', sub: 'OS-level access control' },
        { name: 'Disk encryption', sub: 'Data-at-rest protection' },
        { name: 'Antivirus scan on uploads', sub: 'Malware filter' }
      ],
      why: 'Path canonicalisation resolves \'../\' and symlinks before access, preventing escape from the intended directory. chroot/jails enforce the boundary at the OS level. File permissions help but don\'t stop traversal within the user\'s permitted scope.' },
    { id: 'buffer-overflow', attack: 'Buffer overflow', icon: '⚔️', cat: 'webapp', obj: '2.3', diff: 3,
      correct: { name: 'ASLR + DEP / NX bit + bounds checking', sub: 'Memory-safety mitigations' },
      distractors: [
        { name: 'Code obfuscation', sub: 'Static-analysis defence' },
        { name: 'Multi-factor authentication', sub: 'Identity-side control' },
        { name: 'Network-level encryption', sub: 'Transit protection' }
      ],
      why: 'ASLR randomises memory layout, DEP/NX prevents code execution from data pages, and bounds checking prevents overflow at compile/runtime. These three together are the canonical defence-in-depth answer for buffer overflows.' },
    { id: 'xxe', attack: 'XML External Entity (XXE)', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 3,
      correct: { name: 'Disable external entity resolution in parser', sub: 'Parser hardening' },
      distractors: [
        { name: 'Block all XML uploads', sub: 'Content-type filter' },
        { name: 'Enable HTTPS for the API', sub: 'Transport encryption' },
        { name: 'Increase log retention', sub: 'Forensic capture' }
      ],
      why: 'XXE exploits XML parsers that resolve external entities. The fix is a parser config flag — disable external entities entirely. Blocking XML uploads is overkill and breaks legitimate use.' },
    { id: 'idor', attack: 'Insecure Direct Object Reference (IDOR)', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 2,
      correct: { name: 'Authorisation check on every object access', sub: 'Per-request authz enforcement' },
      distractors: [
        { name: 'GUID instead of integer IDs', sub: 'Obscurity-based defence' },
        { name: 'Encrypt the database', sub: 'Data-at-rest protection' },
        { name: 'Add a captcha to the URL', sub: 'Bot-detection control' }
      ],
      why: 'IDOR is an authorisation bug — the app trusts a URL parameter (e.g., /invoice/42) without checking whether THIS user can see THAT object. Random GUIDs delay discovery but don\'t fix the bug. Authz check is the answer.' },
    { id: 'ssrf', attack: 'Server-Side Request Forgery (SSRF)', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 3,
      correct: { name: 'Outbound URL allowlist + metadata-IP block', sub: 'Egress filtering at app layer' },
      distractors: [
        { name: 'Tighter input length limits', sub: 'Bounds checking' },
        { name: 'WAF rule on inbound traffic', sub: 'Edge filter' },
        { name: 'TLS for outbound calls', sub: 'Transport encryption' }
      ],
      why: 'SSRF tricks the server into requesting attacker-chosen URLs (often cloud metadata endpoints like 169.254.169.254). The fix is allowlisting which destinations the app is allowed to reach + blocking metadata IPs explicitly.' },
    { id: 'cmd-inj', attack: 'Command injection', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 2,
      correct: { name: 'Parameterised exec / no shell-out with user input', sub: 'API-level prevention' },
      distractors: [
        { name: 'Escape quotes in user input', sub: 'String sanitisation' },
        { name: 'Run as non-root', sub: 'Privilege reduction' },
        { name: 'AppArmor / SELinux profile', sub: 'Mandatory access control' }
      ],
      why: 'Just like SQL injection, escaping is brittle. Use APIs that pass arguments as a structured array (execve in C, subprocess.run([...]) in Python) so the shell never parses user input. Non-root + MAC are valuable defence-in-depth but don\'t stop the injection itself.' },
    { id: 'deserialization', attack: 'Insecure deserialization', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 3,
      correct: { name: 'Reject untrusted serialised data / use safe formats', sub: 'Trust-boundary enforcement' },
      distractors: [
        { name: 'Increase server memory', sub: 'Capacity tuning' },
        { name: 'Add rate limiting', sub: 'Throttling defence' },
        { name: 'Use HTTP/2', sub: 'Transport upgrade' }
      ],
      why: 'Deserialisation of attacker-controlled data lets them instantiate arbitrary classes — RCE. Either don\'t deserialise untrusted data at all, or use signed payloads, or migrate to data-only formats like JSON without polymorphic types.' },
    { id: 'race-condition', attack: 'Race condition (TOCTOU)', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 3,
      correct: { name: 'Atomic check-and-act / proper locking', sub: 'Concurrency control' },
      distractors: [
        { name: 'Increase the timeout', sub: 'Latency tolerance' },
        { name: 'Drop user privileges', sub: 'Authz reduction' },
        { name: 'Add input validation', sub: 'Boundary checks' }
      ],
      why: 'TOCTOU = Time of Check vs Time of Use. The fix is making the check + the action atomic — file locks, database transactions, or compare-and-swap operations. Timeouts/privileges don\'t address the race.' },
    { id: 'prototype-pollution', attack: 'Prototype pollution (JavaScript)', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 3,
      correct: { name: 'Object.freeze on prototypes / use Map for user data', sub: 'JS-specific hardening' },
      distractors: [
        { name: 'TLS for all connections', sub: 'Transport encryption' },
        { name: 'Stronger CSP headers', sub: 'Browser policy' },
        { name: 'JWT signature validation', sub: 'Token integrity' }
      ],
      why: 'Prototype pollution lets attacker-controlled JSON modify Object.prototype, affecting all objects. The fix is freezing prototypes and using Map (which doesn\'t inherit from Object) for arbitrary user-keyed data.' },
    { id: 'open-redirect', attack: 'Open redirect', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 1,
      correct: { name: 'Allowlist destination URLs', sub: 'Redirect-target validation' },
      distractors: [
        { name: 'Add a confirmation prompt', sub: 'User-side check' },
        { name: 'TLS pinning', sub: 'MITM prevention' },
        { name: 'Force lowercase URLs', sub: 'Normalisation' }
      ],
      why: 'Open redirect lets attackers craft URLs like /redirect?url=evil.com on a trusted domain — used in phishing. Fix is an allowlist of allowed destinations or relative-only redirects.' },
    { id: 'clickjacking', attack: 'Clickjacking', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 1,
      correct: { name: 'X-Frame-Options or CSP frame-ancestors', sub: 'Browser-side iframe block' },
      distractors: [
        { name: 'Stronger password policy', sub: 'Credential hygiene' },
        { name: 'Captcha on every form', sub: 'Bot detection' },
        { name: 'Disable JavaScript', sub: 'Feature reduction' }
      ],
      why: 'Clickjacking embeds your site in a hidden iframe and tricks users into clicking. X-Frame-Options:DENY or CSP frame-ancestors \'none\' tells the browser to refuse to render in a frame.' },
    { id: 'jwt-alg', attack: 'JWT algorithm confusion (alg:none)', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 3,
      correct: { name: 'Pin verification algorithm in the validator', sub: 'Library config hardening' },
      distractors: [
        { name: 'Encrypt JWTs', sub: 'Confidentiality protection' },
        { name: 'Shorter token lifetimes', sub: 'Exposure window reduction' },
        { name: 'Use HTTP-only cookies', sub: 'XSS-resistant storage' }
      ],
      why: 'Some JWT libraries trust the alg field in the header — attacker sends alg:none and skips signature check, or alg:HS256 with the public key as the secret. Pin the expected algorithm explicitly in your validator.' },
    { id: 'graphql-inj', attack: 'GraphQL injection / introspection abuse', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 3,
      correct: { name: 'Disable introspection in prod + query depth limits', sub: 'GraphQL-specific hardening' },
      distractors: [
        { name: 'TLS 1.3 for the endpoint', sub: 'Transport encryption' },
        { name: 'Increase server memory', sub: 'Capacity tuning' },
        { name: 'Move to REST', sub: 'Architecture change' }
      ],
      why: 'GraphQL introspection lets attackers map your schema. Plus deeply-nested queries cause N+1 explosion. Disable introspection in prod, enforce query depth + cost limits.' },
    { id: 'nosql-inj', attack: 'NoSQL injection', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 2,
      correct: { name: 'Type-strict queries + parameterised drivers', sub: 'Schema enforcement' },
      distractors: [
        { name: 'Escape single quotes', sub: 'String sanitisation' },
        { name: 'Encrypt the database', sub: 'Data-at-rest' },
        { name: 'Use newer database version', sub: 'Patch hygiene' }
      ],
      why: 'NoSQL injection abuses operator semantics (e.g., {$gt: \'\'}). Quote-escaping is a SQL-era reflex that doesn\'t apply. Use type-strict queries (assert input is a string, not an object) and parameterised drivers.' },
    { id: 'file-upload', attack: 'Malicious file upload', icon: '⚔️', cat: 'webapp', obj: '2.4', diff: 2,
      correct: { name: 'MIME validation + sandboxed storage outside webroot', sub: 'Defence in depth' },
      distractors: [
        { name: 'Scan files for viruses', sub: 'AV check' },
        { name: 'Limit file size', sub: 'Bounds enforcement' },
        { name: 'Require login to upload', sub: 'Authz gating' }
      ],
      why: 'AV scanning catches known signatures but misses unknown payloads. The defence-in-depth answer: validate MIME + extension, store outside webroot so files can\'t be executed, serve through a controller that doesn\'t honour client-supplied content-type.' },

    // ── Social engineering (20) ─────────────────────────────────────────────
    { id: 'phishing', attack: 'Phishing (generic email)', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 1,
      correct: { name: 'Security awareness training + DMARC', sub: 'User-side + email auth' },
      distractors: [
        { name: 'Stronger firewall rules', sub: 'Network filter' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'Account lockout', sub: 'Brute-force defence' }
      ],
      why: 'Phishing exploits humans, not networks. Awareness training reduces click-through rates; DMARC + DKIM + SPF stop spoofed-domain emails from reaching the inbox in the first place.' },
    { id: 'spear-phishing', attack: 'Spear phishing (targeted)', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 1,
      correct: { name: 'MFA + URL sandboxing in email gateway', sub: 'Layered email defence' },
      distractors: [
        { name: 'IDS/IPS at the perimeter', sub: 'Network-edge detection' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'Stronger password policy', sub: 'Credential hygiene' }
      ],
      why: 'Spear phishing targets specific people with personalised lures, often defeating awareness training. MFA limits damage if creds leak; URL sandboxing detonates links in a sandbox before delivery.' },
    { id: 'whaling', attack: 'Whaling (executive-targeted)', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 2,
      correct: { name: 'Out-of-band verification for high-value transactions', sub: 'Process control' },
      distractors: [
        { name: 'WAF rules', sub: 'Web filter' },
        { name: 'Encrypted email', sub: 'Confidentiality protection' },
        { name: 'Captcha on logins', sub: 'Bot detection' }
      ],
      why: 'Whaling targets execs to authorise wire transfers / contract changes via fake CEO emails. Best defence is a process: any transaction over $X requires phone-call confirmation to a known number — a person, not a reply-to.' },
    { id: 'vishing', attack: 'Vishing (voice phishing)', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 1,
      correct: { name: 'Caller-ID verification + callback to known numbers', sub: 'Out-of-band verification' },
      distractors: [
        { name: 'TLS for all calls', sub: 'Transport encryption' },
        { name: 'Stronger firewall', sub: 'Network filter' },
        { name: 'Patch all servers', sub: 'Vulnerability hygiene' }
      ],
      why: 'Vishing relies on voice + urgency to bypass the user\'s "stop and think" reflex. Caller ID is spoofable — the only reliable defence is hanging up and calling back via a number the user already knows.' },
    { id: 'smishing', attack: 'Smishing (SMS phishing)', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 1,
      correct: { name: 'User training + SMS link blocking on managed devices', sub: 'Endpoint + user defence' },
      distractors: [
        { name: 'Email filtering', sub: 'Inbox protection' },
        { name: 'Web Application Firewall', sub: 'Edge filter' },
        { name: 'Database encryption', sub: 'Data-at-rest' },
      ],
      why: 'Smishing arrives via SMS, bypassing email filters entirely. Train users to treat SMS links like email links; enterprise MDM can block SMS link rendering on managed devices.' },
    { id: 'pretexting', attack: 'Pretexting (fabricated scenario)', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 2,
      correct: { name: 'Identity verification policy for sensitive requests', sub: 'Process control' },
      distractors: [
        { name: 'Strong password policy', sub: 'Credential hygiene' },
        { name: 'Network segmentation', sub: 'Lateral-movement control' },
        { name: 'Captcha on web forms', sub: 'Bot detection' }
      ],
      why: 'Pretexting = a believable cover story (\"this is IT, your account is locked\"). The fix is a policy: sensitive actions (password resets, account lookups) require positive identity verification — multiple channels, not just \"sounds plausible\".' },
    { id: 'baiting', attack: 'Baiting (USB drop / free movie download)', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 1,
      correct: { name: 'USB autorun disabled + content-disarm gateway', sub: 'Endpoint + perimeter control' },
      distractors: [
        { name: 'TLS pinning', sub: 'MITM prevention' },
        { name: 'Strong password policy', sub: 'Credential hygiene' },
        { name: 'Account lockout', sub: 'Brute-force defence' }
      ],
      why: 'Baiting offers something tempting (free music, found USB) that triggers malware on insertion. Disable USB autorun, block USB ports on sensitive devices, and run downloads through a content-disarm-and-reconstruction gateway.' },
    { id: 'tailgating', attack: 'Tailgating (door piggyback)', icon: '🎣', cat: 'socialeng', obj: '4.1', diff: 1,
      correct: { name: 'Mantrap (security vestibule) + badge enforcement training', sub: 'Physical + behavioural control' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'IDS/IPS at the perimeter', sub: 'Network-edge detection' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'Tailgating relies on politeness — holding a door for the person behind. A mantrap (two doors, one at a time) prevents physical piggybacking; training reinforces the "always badge in" norm.' },
    { id: 'dumpster-diving', attack: 'Dumpster diving', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 1,
      correct: { name: 'Document shredding policy + secure disposal', sub: 'Information lifecycle control' },
      distractors: [
        { name: 'Stronger firewall', sub: 'Network filter' },
        { name: 'Multi-factor authentication', sub: 'Identity protection' },
        { name: 'Encrypted backups', sub: 'Data-at-rest' }
      ],
      why: 'Dumpster diving recovers documents, drives, and post-it notes from physical waste. Cross-cut shredders for paper, secure media destruction for drives — explicit retention/disposal policy.' },
    { id: 'shoulder-surfing', attack: 'Shoulder surfing', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 1,
      correct: { name: 'Privacy screen filters + clean-desk policy', sub: 'Visual disclosure control' },
      distractors: [
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'Stronger Wi-Fi', sub: 'Wireless security' },
        { name: 'Email filtering', sub: 'Inbox protection' }
      ],
      why: 'Shoulder surfing happens in coffee shops, airports, open offices. Privacy screen filters (anti-glare side-blocked films) restrict viewing angles; clean-desk policy reduces what\'s visible at all.' },
    { id: 'water-holing', attack: 'Watering hole attack', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 3,
      correct: { name: 'Network-egress filtering + endpoint EDR', sub: 'Layered detection' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Email DKIM/DMARC', sub: 'Email auth' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'Water holing compromises a SITE the target visits regularly (industry forum, vendor portal). Email defences don\'t apply. Egress filtering catches anomalous outbound; EDR catches the resulting payload on the endpoint.' },
    { id: 'bec', attack: 'Business Email Compromise (BEC)', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 2,
      correct: { name: 'DMARC + invoice change verification by phone', sub: 'Email auth + process' },
      distractors: [
        { name: 'TLS 1.3 for SMTP', sub: 'Transport encryption' },
        { name: 'WAF on the website', sub: 'Web filter' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'BEC = attacker poses as supplier asking for invoice payment to a new account. DMARC blocks domain spoofing; the policy catch is verifying ANY bank-detail change by phone to a known number.' },
    { id: 'typo-squat', attack: 'Typo-squatting / lookalike domain', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 2,
      correct: { name: 'Domain monitoring + employee link-hover training', sub: 'Detection + user awareness' },
      distractors: [
        { name: 'Encryption of all data', sub: 'Confidentiality control' },
        { name: 'Increase WAF rules', sub: 'Web filter' },
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' }
      ],
      why: 'Typo-squat = registering microsft.com (without the o), paypa1.com, etc. Domain monitoring services alert on lookalike registrations; users trained to hover before clicking spot the visual swap.' },
    { id: 'evil-twin', attack: 'Evil twin Wi-Fi AP', icon: '🎣', cat: 'socialeng', obj: '2.4', diff: 2,
      correct: { name: 'Always-on VPN for users on untrusted Wi-Fi', sub: 'Transport-layer assumption' },
      distractors: [
        { name: 'Stronger website passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'Disable USB ports', sub: 'Removable-media control' }
      ],
      why: 'Evil twin = rogue AP with same SSID as a trusted one. User auto-connects, attacker MITMs. Always-on VPN (mandatory tunnel for managed devices) makes the attacker see only encrypted traffic.' },
    { id: 'fake-portal', attack: 'Fake login portal (cred harvest)', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 1,
      correct: { name: 'FIDO2 / WebAuthn (phish-resistant MFA)', sub: 'Origin-bound credentials' },
      distractors: [
        { name: 'Captcha on logins', sub: 'Bot detection' },
        { name: 'TLS for the real site', sub: 'Transport encryption' },
        { name: 'Stronger password policy', sub: 'Credential hygiene' }
      ],
      why: 'Even if the user submits creds to a fake portal, FIDO2/WebAuthn keys won\'t sign for the wrong origin — phish-resistant. SMS-MFA can be relayed; FIDO2 can\'t.' },
    { id: 'scareware', attack: 'Scareware ("your PC is infected" popup)', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 1,
      correct: { name: 'Browser malvertising filter + user training', sub: 'Web hygiene + awareness' },
      distractors: [
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'Network segmentation', sub: 'Lateral-movement control' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Scareware is fake "your PC is infected, click here" pop-ups served via malvertising. Browser-level ad/tracker filters cut the delivery; training stops the click.' },
    { id: 'invoice-fraud', attack: 'Fake invoice fraud', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 2,
      correct: { name: 'Vendor allowlist + dual-approval for new payees', sub: 'Process control' },
      distractors: [
        { name: 'Encrypted email', sub: 'Confidentiality' },
        { name: 'IDS at perimeter', sub: 'Network-edge detection' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'Fake invoices target AP departments. Process control: new payees go through a vendor-onboarding workflow, payments to new accounts require two approvers. Tech alone doesn\'t fix this.' },
    { id: 'oauth-consent', attack: 'OAuth consent phishing', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 3,
      correct: { name: 'Admin-approved app allowlist + consent review', sub: 'Identity-platform policy' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'TLS pinning', sub: 'MITM prevention' },
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' }
      ],
      why: 'OAuth consent phishing tricks users into granting a malicious app access to their cloud account (Microsoft 365, Google). Tenant policy: only admin-approved apps can request consent; review the consent prompts.' },
    { id: 'voice-deepfake', attack: 'Voice deepfake (CEO impersonation)', icon: '🎣', cat: 'socialeng', obj: '2.2', diff: 3,
      correct: { name: 'Out-of-band callback verification + signed approval policy', sub: 'Process hardening' },
      distractors: [
        { name: 'TLS for VoIP', sub: 'Transport encryption' },
        { name: 'Stronger password policy', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'AI voice cloning can fake the CEO authorising a wire transfer in real-time. Tech can\'t reliably distinguish; process must — every transfer over $X requires a signed authorisation form, not just a phone call.' },
    { id: 'browser-exploit', attack: 'Drive-by-download (browser exploit)', icon: '🎣', cat: 'socialeng', obj: '2.5', diff: 2,
      correct: { name: 'Patch management + browser sandboxing', sub: 'Vulnerability hygiene + isolation' },
      distractors: [
        { name: 'Strong password policy', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Drive-by-downloads exploit unpatched browser vulns to install malware silently. Modern browsers run renderer in a sandbox; patches close the underlying CVE. Both are needed — sandbox limits damage, patches close the door.' },

    // ── Network attacks (19) ───────────────────────────────────────────────
    { id: 'ddos-volumetric', attack: 'Volumetric DDoS', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'Cloud DDoS scrubbing service', sub: 'Upstream capacity offload' },
      distractors: [
        { name: 'Stronger firewall rules', sub: 'On-prem filter' },
        { name: 'Faster CPUs in the load balancer', sub: 'Capacity tuning' },
        { name: 'Reduce TTL on DNS records', sub: 'Caching control' }
      ],
      why: 'Volumetric DDoS saturates the link itself — your firewall sees the traffic but can\'t do anything because the pipe is full. Cloud scrubbing absorbs traffic upstream of your link.' },
    { id: 'dns-poison', attack: 'DNS cache poisoning', icon: '🛰', cat: 'network', obj: '2.4', diff: 3,
      correct: { name: 'DNSSEC validation + DoH/DoT', sub: 'DNS integrity + transport encryption' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'DNSSEC signs records so the resolver verifies they came from the authoritative server. DoH/DoT encrypt the query so on-path attackers can\'t spoof responses. Together they prevent cache poisoning.' },
    { id: 'arp-spoof', attack: 'ARP spoofing', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'Dynamic ARP Inspection (DAI) + DHCP snooping', sub: 'Switch-level mitigations' },
      distractors: [
        { name: 'Strong website passwords', sub: 'Credential hygiene' },
        { name: 'Email filtering', sub: 'Inbox protection' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'ARP spoofing tricks LAN devices into sending traffic via the attacker. DAI validates ARP packets against the DHCP snooping binding table — switches drop spoofed ARP replies before they propagate.' },
    { id: 'mitm-tls', attack: 'MITM (TLS interception)', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'TLS 1.3 + certificate pinning', sub: 'Transport hardening' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'IDS/IPS at perimeter', sub: 'Network-edge detection' }
      ],
      why: 'MITM with rogue certs is foiled by pinning — the client refuses to talk to anything but a known-good public key, no matter what cert the network presents.' },
    { id: 'eavesdropping', attack: 'Eavesdropping on unencrypted traffic', icon: '🛰', cat: 'network', obj: '2.4', diff: 1,
      correct: { name: 'TLS / IPsec for all sensitive traffic', sub: 'Transport encryption' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'WAF rules', sub: 'Web filter' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'If the traffic isn\'t encrypted, anyone on the path can read it. TLS for application layer, IPsec for network layer — eliminates the threat entirely.' },
    { id: 'port-scan', attack: 'Port scanning', icon: '🛰', cat: 'network', obj: '2.4', diff: 1,
      correct: { name: 'Default-deny firewall + IDS alerting', sub: 'Surface reduction + detection' },
      distractors: [
        { name: 'Strong password policy', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'Email DMARC', sub: 'Email auth' }
      ],
      why: 'Port scans map your attack surface. Default-deny firewall rules close ports you\'re not using; IDS alerts on the scan pattern so you know someone\'s probing. You can\'t prevent scanning, only minimise what they find.' },
    { id: 'wireless-deauth', attack: 'Wireless deauthentication attack', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'WPA3 with Management Frame Protection (PMF)', sub: 'Wi-Fi protocol upgrade' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Credential strength' },
        { name: 'MAC address filtering', sub: 'Allowlist control' },
        { name: 'Hide the SSID', sub: 'Obscurity' }
      ],
      why: 'Deauth frames in WPA2 were unauthenticated — anyone could send them. WPA3\'s Protected Management Frames (PMF, mandatory in WPA3) authenticate management frames so attackers can\'t kick clients off.' },
    { id: 'rogue-ap', attack: 'Rogue access point', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'Wireless Intrusion Detection + 802.1X authentication', sub: 'Detection + access control' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Credential strength' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Rogue APs are unauthorised APs plugged into your network (employee-installed or attacker-installed). WIDS scans for unknown SSIDs/BSSIDs; 802.1X requires devices to authenticate to the wired port before getting an IP.' },
    { id: 'replay-attack', attack: 'Replay attack', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'Nonces + timestamps + sequence numbers', sub: 'Protocol freshness' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Replay attacks resubmit a captured legitimate request (e.g., a "transfer $100" request a second time). Nonces (one-time tokens) + timestamps + sequence numbers ensure each request is fresh.' },
    { id: 'syn-flood', attack: 'SYN flood', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'SYN cookies + connection rate limiting', sub: 'TCP-stack hardening' },
      distractors: [
        { name: 'Bigger TCP buffers', sub: 'Capacity tuning' },
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'SYN floods exhaust the server\'s half-open connection table. SYN cookies allow the server to validate ACK without holding state; rate limiting drops obvious flood patterns at the edge.' },
    { id: 'smurf-attack', attack: 'Smurf attack (ICMP amplification)', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'Disable directed broadcast + ingress filtering', sub: 'Router config hardening' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'WAF rules', sub: 'Web filter' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'Smurf sends ICMP echo to a network broadcast address with spoofed source = victim. Every host responds to victim. Mitigation is two-part: block directed broadcasts on routers + ingress-filter spoofed source IPs.' },
    { id: 'ip-spoof', attack: 'IP spoofing', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'BCP38 ingress filtering at network edges', sub: 'Anti-spoof routing policy' },
      distractors: [
        { name: 'Strong passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'IP spoofing requires the attacker to send packets with a forged source IP. BCP38 / RFC 2827 ingress filtering at every ISP edge drops packets whose source IP isn\'t in the expected range — kills the attack at the source.' },
    { id: 'session-hijack', attack: 'Session hijacking', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'TLS + secure cookies + short session timeouts', sub: 'Layered session protection' },
      distractors: [
        { name: 'Stronger password policy', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Session hijack steals the session cookie/token. TLS prevents network capture; HTTP-only + Secure flags prevent XSS theft + insecure-channel transmission; short timeouts limit damage if it does leak.' },
    { id: 'bgp-hijack', attack: 'BGP route hijacking', icon: '🛰', cat: 'network', obj: '2.4', diff: 3,
      correct: { name: 'RPKI route origin validation', sub: 'Cryptographic routing assertion' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'IDS at perimeter', sub: 'Network-edge detection' }
      ],
      why: 'BGP hijacks let an AS announce prefixes they don\'t own — traffic gets redirected. RPKI lets prefix owners cryptographically sign their announcements; receiving routers reject invalid origins.' },
    { id: 'dns-amp', attack: 'DNS amplification DDoS', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'Disable open recursion + response rate limiting', sub: 'DNS-server hardening' },
      distractors: [
        { name: 'TLS for the website', sub: 'Transport encryption' },
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'DNS amplification spoofs queries to open recursive resolvers, which respond with much larger answers to the victim. Don\'t run open resolvers; rate-limit responses to prevent your server being weaponised.' },
    { id: 'sniffing', attack: 'Packet sniffing on shared media', icon: '🛰', cat: 'network', obj: '2.4', diff: 1,
      correct: { name: 'Switched network + TLS for sensitive traffic', sub: 'Topology + encryption' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'Account lockout', sub: 'Brute-force defence' }
      ],
      why: 'Hubs broadcast every frame to every port — anyone with a sniffer sees everything. Switches send only to the destination port. TLS adds defence-in-depth even on switched networks (against rogue port mirroring).' },
    { id: 'ntp-amp', attack: 'NTP amplification', icon: '🛰', cat: 'network', obj: '2.4', diff: 3,
      correct: { name: 'Disable monlist + restrict NTP to allowed peers', sub: 'NTP-server hardening' },
      distractors: [
        { name: 'TLS for HTTPS', sub: 'Web encryption' },
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'NTP\'s monlist command returns up to 600 IPs — perfect amplifier. Disable monlist on every public NTP server; restrict NTP to known peers only.' },
    { id: 'icmp-flood', attack: 'ICMP flood (ping flood)', icon: '🛰', cat: 'network', obj: '2.4', diff: 1,
      correct: { name: 'Rate-limit ICMP at perimeter + cloud DDoS scrubbing', sub: 'Layered traffic control' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'ICMP floods saturate links with ping packets. Rate-limit ICMP at the edge router; scrubbing for volumetric loads beyond your link capacity.' },
    { id: 'on-path', attack: 'On-path / man-in-the-middle (general)', icon: '🛰', cat: 'network', obj: '2.4', diff: 2,
      correct: { name: 'TLS with cert pinning + IPsec for sensitive segments', sub: 'Layered encryption' },
      distractors: [
        { name: 'Strong passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'Account lockout', sub: 'Brute-force defence' }
      ],
      why: 'On-path attacks intercept and modify traffic. TLS with pinning prevents app-layer MITM; IPsec adds network-layer integrity for trusted-zone communications.' },

    // ── Malware (20) ───────────────────────────────────────────────────────
    { id: 'virus', attack: 'Virus (file infector)', icon: '🦠', cat: 'malware', obj: '2.5', diff: 1,
      correct: { name: 'Endpoint AV/EDR with real-time scanning', sub: 'Signature + behavioural detection' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Classic file-infector viruses are caught by AV signatures; modern variants need EDR\'s behavioural engine. Both layers are bundled in modern endpoint suites.' },
    { id: 'worm', attack: 'Worm (self-propagating)', icon: '🦠', cat: 'malware', obj: '2.5', diff: 2,
      correct: { name: 'Patch management + network segmentation', sub: 'Vulnerability + blast-radius control' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'Email filtering', sub: 'Inbox protection' }
      ],
      why: 'Worms spread by exploiting vulns (think WannaCry/EternalBlue). Patching closes the vuln; segmentation limits blast radius if patches lag.' },
    { id: 'trojan', attack: 'Trojan horse', icon: '🦠', cat: 'malware', obj: '2.5', diff: 1,
      correct: { name: 'App allowlist (only signed apps run)', sub: 'Execution control' },
      distractors: [
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'Strong Wi-Fi password', sub: 'Wireless credential' },
        { name: 'TLS for HTTPS', sub: 'Web encryption' }
      ],
      why: 'Trojans hide in seemingly-legit apps. App allowlisting (Windows AppLocker, macOS Gatekeeper) refuses to run unsigned/unknown executables — even if user double-clicks.' },
    { id: 'ransomware', attack: 'Ransomware', icon: '🦠', cat: 'malware', obj: '2.5', diff: 2,
      correct: { name: 'Immutable backups + EDR + segmentation', sub: 'Recovery + detection + containment' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'WAF rules', sub: 'Web filter' },
        { name: 'TLS pinning', sub: 'MITM prevention' }
      ],
      why: 'Ransomware encrypts files, demands payment. The "ransomware-proof recovery" answer is immutable backups (write-once, can\'t be deleted by attacker). EDR catches behaviour; segmentation limits spread.' },
    { id: 'rootkit', attack: 'Rootkit', icon: '🦠', cat: 'malware', obj: '2.5', diff: 3,
      correct: { name: 'Secure Boot + measured boot (TPM)', sub: 'Firmware-level integrity check' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Rootkits hide BELOW the OS — by the time AV runs, they\'re lying. Secure Boot validates the boot chain via cryptographic signatures; measured boot lets the TPM record what loaded so anomalies can be detected externally.' },
    { id: 'keylogger', attack: 'Keylogger', icon: '🦠', cat: 'malware', obj: '2.5', diff: 1,
      correct: { name: 'EDR + hardware MFA tokens', sub: 'Detection + phish-resistant credentials' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'Captcha on logins', sub: 'Bot detection' }
      ],
      why: 'Keyloggers capture keystrokes — even strong passwords leak. Hardware MFA (YubiKey, FIDO2) doesn\'t transmit a typed secret, so even with the password, attacker can\'t auth. EDR catches the keylogger itself.' },
    { id: 'spyware', attack: 'Spyware', icon: '🦠', cat: 'malware', obj: '2.5', diff: 1,
      correct: { name: 'EDR + browser permission audits', sub: 'Detection + privilege review' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Spyware monitors user activity, often arriving as browser extensions or bundled software. EDR detects behavioural patterns; periodic browser-extension audits catch the long tail of low-privilege spy tools.' },
    { id: 'adware', attack: 'Adware (PUP)', icon: '🦠', cat: 'malware', obj: '2.5', diff: 1,
      correct: { name: 'PUP detection in AV + scheduled software audits', sub: 'Endpoint hygiene' },
      distractors: [
        { name: 'Strong passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Adware/PUPs (Potentially Unwanted Programs) bundle with free downloads. Modern AV flags them as PUPs; quarterly software audits remove what slipped through.' },
    { id: 'fileless', attack: 'Fileless malware', icon: '🦠', cat: 'malware', obj: '2.5', diff: 3,
      correct: { name: 'EDR with PowerShell / WMI logging + script-block telemetry', sub: 'Behavioural detection' },
      distractors: [
        { name: 'Better signature-based AV', sub: 'Signature engine' },
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'Fileless malware lives in memory, uses LOLBins (PowerShell, WMI). Signatures don\'t apply. EDR with full PowerShell + WMI logging catches the behaviour patterns instead.' },
    { id: 'bootkit', attack: 'Bootkit', icon: '🦠', cat: 'malware', obj: '2.5', diff: 3,
      correct: { name: 'UEFI Secure Boot + measured boot integrity', sub: 'Firmware integrity' },
      distractors: [
        { name: 'Endpoint AV', sub: 'OS-level scanning' },
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'Bootkits live in firmware/MBR — they load before the OS. Same answer as rootkits: Secure Boot validates the chain, measured boot logs what loaded.' },
    { id: 'logic-bomb', attack: 'Logic bomb', icon: '🦠', cat: 'malware', obj: '2.5', diff: 2,
      correct: { name: 'Code review + version control with attribution', sub: 'Pre-deployment scrutiny' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Logic bombs trigger on a condition (date, missing username = the disgruntled dev was fired). Mandatory code review with multiple approvers + git blame + signed commits make planting one detectable.' },
    { id: 'rat', attack: 'Remote Access Trojan (RAT)', icon: '🦠', cat: 'malware', obj: '2.5', diff: 2,
      correct: { name: 'EDR + outbound network anomaly detection', sub: 'Endpoint + egress monitoring' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'TLS for HTTPS', sub: 'Web encryption' }
      ],
      why: 'RATs phone home to C2 servers. EDR catches the behaviour; outbound anomaly detection (uncommon destination, beaconing patterns) catches the phone-home channel.' },
    { id: 'cryptominer', attack: 'Cryptominer (cryptojacking)', icon: '🦠', cat: 'malware', obj: '2.5', diff: 2,
      correct: { name: 'CPU-anomaly detection + browser miner block', sub: 'Resource + browser hygiene' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'TLS pinning', sub: 'MITM prevention' }
      ],
      why: 'Cryptojacking spikes CPU. Endpoint EDR flags sustained high CPU on processes that shouldn\'t need it; browsers can block known mining JS at the DNS/url-filter layer.' },
    { id: 'polymorphic', attack: 'Polymorphic malware', icon: '🦠', cat: 'malware', obj: '2.5', diff: 3,
      correct: { name: 'EDR with behavioural / ML detection', sub: 'Beyond-signature detection' },
      distractors: [
        { name: 'Better signature-only AV', sub: 'Signature engine' },
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'Polymorphic malware mutates its code to evade signatures. Behavioural / ML models look at WHAT the malware does (API calls, network behaviour) rather than what it looks like — sees through the obfuscation.' },
    { id: 'metamorphic', attack: 'Metamorphic malware', icon: '🦠', cat: 'malware', obj: '2.5', diff: 3,
      correct: { name: 'EDR with behavioural detection + sandbox detonation', sub: 'Behavioural + dynamic analysis' },
      distractors: [
        { name: 'Better signatures', sub: 'Signature engine' },
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' }
      ],
      why: 'Metamorphic malware rewrites its own code each generation, defeating signatures even more aggressively than polymorphic. Same answer category — behaviour-based detection plus sandbox detonation in EDR/email gateways.' },
    { id: 'banking-trojan', attack: 'Banking trojan (form-grabber)', icon: '🦠', cat: 'malware', obj: '2.5', diff: 2,
      correct: { name: 'FIDO2 hardware MFA + EDR', sub: 'Phish-resistant auth + detection' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'TLS pinning', sub: 'MITM prevention' }
      ],
      why: 'Banking trojans (Zeus, Emotet) capture form data + session cookies. FIDO2 doesn\'t transmit a stealable secret; EDR catches the form-grabber injection patterns.' },
    { id: 'mobile-malware', attack: 'Mobile malware (sideloaded app)', icon: '🦠', cat: 'malware', obj: '2.5', diff: 2,
      correct: { name: 'MDM with app allowlist + sideload block', sub: 'Mobile platform control' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Mobile malware mostly arrives via sideloaded APKs or jailbroken iOS. MDM blocks sideloading on managed devices, restricts to a curated app catalog.' },
    { id: 'supply-chain-mw', attack: 'Supply-chain malware (compromised dependency)', icon: '🦠', cat: 'malware', obj: '2.3', diff: 3,
      correct: { name: 'Software Bill of Materials + signed dependencies', sub: 'Supply-chain assurance' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Supply-chain malware compromises a dependency you trust (npm package, Docker base image). SBOM tracks what you ship; signed dependencies + reproducible builds let you verify integrity end-to-end.' },
    { id: 'usb-malware', attack: 'USB-based malware (USB Rubber Ducky / BadUSB)', icon: '🦠', cat: 'malware', obj: '4.5', diff: 2,
      correct: { name: 'USB port disabling + USB device-class allowlist', sub: 'Removable-media control' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'BadUSB devices register as keyboards or network adapters and inject keystrokes/traffic. Disable unnecessary USB ports via Group Policy / MDM; allowlist only specific device classes (no HID from USB unless enrolled).' },
    { id: 'macro-virus', attack: 'Macro virus (Office)', icon: '🦠', cat: 'malware', obj: '2.5', diff: 1,
      correct: { name: 'Disable macros from internet by default + signed-only macros', sub: 'Office hardening' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Macro viruses ride in Word/Excel attachments. Modern Office defaults block macros from the internet; enterprise policy enforces signed-only macros — kills the attack surface.' },

    // ── Insider / Physical (19) ────────────────────────────────────────────
    { id: 'insider-threat', attack: 'Insider threat (malicious employee)', icon: '🚪', cat: 'physical', obj: '5.2', diff: 2,
      correct: { name: 'Data Loss Prevention + UEBA + separation of duties', sub: 'Detection + process control' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Insider threats already have legit access. DLP catches data leaving abnormally; UEBA spots behavioural deviation; separation of duties limits what one person can do unilaterally.' },
    { id: 'usb-drop', attack: 'USB drop attack', icon: '🚪', cat: 'physical', obj: '4.5', diff: 1,
      correct: { name: 'Disable USB autorun + user training', sub: 'Endpoint config + behaviour' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'USB drop = attacker leaves an infected USB in the parking lot, employee picks it up + plugs in. Disable autorun (frequently the only thing the malware needs) + train people to never plug in unknown USBs.' },
    { id: 'hw-keylogger', attack: 'Hardware keylogger (in-line)', icon: '🚪', cat: 'physical', obj: '4.1', diff: 2,
      correct: { name: 'Physical inspection + tamper-evident seals + USB-C only', sub: 'Physical access control' },
      distractors: [
        { name: 'Endpoint AV', sub: 'OS-level scanning' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'TLS pinning', sub: 'MITM prevention' }
      ],
      why: 'In-line hardware keyloggers slot between keyboard and PC. AV can\'t see them. Periodic physical inspection of high-value workstations; tamper-evident seals on cables; USB-C deters older keyloggers built for USB-A.' },
    { id: 'evil-maid', attack: 'Evil maid (laptop access while away)', icon: '🚪', cat: 'physical', obj: '4.1', diff: 3,
      correct: { name: 'Full-disk encryption with pre-boot auth + Secure Boot', sub: 'Boot-time integrity' },
      distractors: [
        { name: 'Strong login password', sub: 'OS credential' },
        { name: 'WAF rules', sub: 'Web filter' },
        { name: 'TLS pinning', sub: 'MITM prevention' }
      ],
      why: 'Evil-maid attacks gain physical access while you\'re away (hotel room, conference). Pre-boot auth (BitLocker w/PIN, FileVault) prevents tampering with boot chain; Secure Boot detects firmware modification.' },
    { id: 'lock-picking', attack: 'Lock picking', icon: '🚪', cat: 'physical', obj: '4.1', diff: 1,
      correct: { name: 'High-security locks + electronic access + audit log', sub: 'Physical + electronic gating' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'TLS for HTTPS', sub: 'Transport encryption' }
      ],
      why: 'Cheap locks open in seconds. High-security locks (Medeco, Mul-T-Lock) raise the bar; electronic access (badge readers) adds audit trail and rotation.' },
    { id: 'badge-cloning', attack: 'Badge cloning (RFID skimming)', icon: '🚪', cat: 'physical', obj: '4.1', diff: 2,
      correct: { name: 'Encrypted high-frequency badges (DESFire EV2/EV3)', sub: 'Modern badge protocol' },
      distractors: [
        { name: 'Stronger building Wi-Fi', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Older 125 kHz badges (HID Prox) clone trivially. Modern 13.56 MHz HF badges (DESFire EV2/EV3) use mutual authentication + encryption — clones fail to authenticate.' },
    { id: 'rfid-skim', attack: 'RFID skimming (credit card / badge)', icon: '🚪', cat: 'physical', obj: '4.1', diff: 1,
      correct: { name: 'RFID-blocking sleeves + EMV chip transactions', sub: 'Shielding + protocol upgrade' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'RFID skimmers read cards through clothing. RFID-blocking sleeves (Faraday cage) prevent the read; EMV chip transactions don\'t expose the magstripe equivalent the skimmer wants.' },
    { id: 'physical-shoulder', attack: 'Physical shoulder surfing (PIN entry)', icon: '🚪', cat: 'physical', obj: '4.1', diff: 1,
      correct: { name: 'Privacy filters on screens + opaque PIN pads', sub: 'Visual occlusion' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'PIN-entry shoulder-surfing happens at ATMs, POS terminals, secure-area keypads. Hooded PIN pads block side-views; privacy filters do the same for screens.' },
    { id: 'mantrap-bypass', attack: 'Mantrap bypass (forcing the second door)', icon: '🚪', cat: 'physical', obj: '4.1', diff: 2,
      correct: { name: 'Anti-passback + tailgate detection sensors', sub: 'Single-occupancy enforcement' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Mantraps are defeated by tailgating + force. Anti-passback rules (a badge can\'t enter twice without exiting first) and weight/IR tailgate sensors enforce single-occupancy.' },
    { id: 'social-tailgate', attack: 'Social tailgating (carrying boxes)', icon: '🚪', cat: 'physical', obj: '4.1', diff: 1,
      correct: { name: 'Mandatory badge presentation policy + training', sub: 'Behavioural enforcement' },
      distractors: [
        { name: 'Stronger door locks', sub: 'Physical hardening' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Tech locks fail when employees politely hold the door. Train + enforce a "no badge, no entry" culture; periodic walk-the-floor audits reinforce the norm.' },
    { id: 'fence-climb', attack: 'Perimeter fence climbing', icon: '🚪', cat: 'physical', obj: '4.1', diff: 1,
      correct: { name: 'Fence-line detection sensors + lighting + camera coverage', sub: 'Detection + deterrence' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Fences alone slow but don\'t stop. Fence-line vibration/break-detection sensors + lighting + cameras let security respond before the intruder reaches the building.' },
    { id: 'tool-drop', attack: 'Tool drop / penetration via dropped device', icon: '🚪', cat: 'physical', obj: '4.1', diff: 2,
      correct: { name: 'Network access control (802.1X) + DHCP fingerprinting', sub: 'Wired-port authentication' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Tool-drop = attacker plugs a Raspberry Pi into a wired port. 802.1X requires the device to authenticate before getting network access; DHCP fingerprinting flags unknown device types.' },
    { id: 'laptop-theft', attack: 'Laptop theft', icon: '🚪', cat: 'physical', obj: '4.1', diff: 1,
      correct: { name: 'Full-disk encryption + remote wipe via MDM', sub: 'Data + recovery control' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'WAF rules', sub: 'Web filter' },
        { name: 'TLS pinning', sub: 'MITM prevention' }
      ],
      why: 'Stolen laptops happen. FDE means the data is unreadable without the key; MDM remote-wipe destroys the data on first network connect.' },
    { id: 'hw-supply-chain', attack: 'Hardware supply-chain compromise', icon: '🚪', cat: 'physical', obj: '4.1', diff: 3,
      correct: { name: 'Trusted-hardware procurement + tamper-evident packaging', sub: 'Vendor + chain-of-custody' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Hardware can be tampered with before it ships (chip implants, modified firmware). Buy from trusted vendors with secure logistics chains; tamper-evident packaging detects in-transit modification.' },
    { id: 'badusb-charger', attack: 'BadUSB cable / charging-port attack', icon: '🚪', cat: 'physical', obj: '4.5', diff: 2,
      correct: { name: 'USB data-blocker dongles + organisation-issued cables only', sub: 'Travel-specific control' },
      distractors: [
        { name: 'Stronger passwords', sub: 'Credential hygiene' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Public USB chargers can deliver power AND data — "juice jacking". USB data-blockers (USB condoms) remove the data pins; org-issued cables prevent users buying compromised cables from sketchy retailers.' },
    { id: 'physical-bug', attack: 'Physical eavesdropping device (room bug)', icon: '🚪', cat: 'physical', obj: '4.1', diff: 3,
      correct: { name: 'TSCM (technical surveillance counter-measures) sweeps + acoustic shielding', sub: 'Counter-surveillance' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Listening devices in conference rooms / executive offices. Periodic TSCM sweeps detect transmitters and AC-line bugs; acoustic shielding (white-noise generators, sound-masking) defeats passive recordings.' },
    { id: 'doc-theft', attack: 'Sensitive document theft', icon: '🚪', cat: 'physical', obj: '4.1', diff: 1,
      correct: { name: 'Locked storage + clean-desk policy + audit', sub: 'Information lifecycle' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Paper documents leak by physical means. Locked filing cabinets, clean-desk policy enforced at end-of-day, periodic audit walks.' },
    { id: 'photo-leak', attack: 'Credential leak via photo (whiteboard / screen)', icon: '🚪', cat: 'physical', obj: '5.6', diff: 1,
      correct: { name: 'Awareness training + credential rotation policy', sub: 'Behavioural + recovery' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Background of social-media photos leaks whiteboards, screens, badges. Train people to scrub backgrounds; mandatory credential rotation when a leak is suspected limits damage.' },
    { id: 'sneaker-net', attack: 'Sneaker-net data exfil (USB walkout)', icon: '🚪', cat: 'physical', obj: '5.2', diff: 2,
      correct: { name: 'DLP for removable media + USB write blocker', sub: 'Egress control' },
      distractors: [
        { name: 'Stronger Wi-Fi password', sub: 'Wireless credential' },
        { name: 'Disk encryption', sub: 'Data-at-rest' },
        { name: 'WAF rules', sub: 'Web filter' }
      ],
      why: 'Insider walks out with USB full of data. DLP can block writes to removable media based on data classification; USB write blockers force read-only — combined, you stop the easy exfil channel.' }
  ],
  attackMitigationLessons: [
    { cat: 'webapp', title: 'Web / App attack tactics', summary: 'Code-level fixes beat perimeter filters. Root-cause beats signature.',
      keyPairs: [
        ['SQL Injection', 'Parameterized queries (NOT WAF rule)'],
        ['XSS', 'Output encoding + CSP'],
        ['CSRF', 'Anti-CSRF tokens (synchroniser pattern)'],
        ['IDOR', 'Authorisation check on every object access'],
        ['Buffer overflow', 'ASLR + DEP/NX + bounds checking']
      ] },
    { cat: 'socialeng', title: 'Social engineering tactics', summary: 'Human-factor attacks need human-factor defences. Tech alone won\'t fix it.',
      keyPairs: [
        ['Phishing (generic)', 'Awareness training + DMARC'],
        ['BEC', 'DMARC + invoice change verification by phone'],
        ['Vishing', 'Caller-ID verification + callback to known numbers'],
        ['Tailgating', 'Mantrap + badge enforcement training'],
        ['OAuth consent phishing', 'Admin-approved app allowlist']
      ] },
    { cat: 'network', title: 'Network attack tactics', summary: 'Most network attacks have a protocol-level fix. Encryption is the universal answer.',
      keyPairs: [
        ['DDoS (volumetric)', 'Cloud DDoS scrubbing service'],
        ['DNS poisoning', 'DNSSEC + DoH/DoT'],
        ['ARP spoofing', 'Dynamic ARP Inspection + DHCP snooping'],
        ['MITM', 'TLS 1.3 + cert pinning'],
        ['BGP hijack', 'RPKI route origin validation']
      ] },
    { cat: 'malware', title: 'Malware tactics', summary: 'Modern malware needs behavioural + ML detection. Signatures alone are dead.',
      keyPairs: [
        ['Ransomware', 'Immutable backups + EDR + segmentation'],
        ['Rootkit / Bootkit', 'Secure Boot + measured boot (TPM)'],
        ['Fileless malware', 'EDR with PowerShell/WMI logging'],
        ['Polymorphic', 'EDR with behavioural / ML detection'],
        ['Supply-chain', 'SBOM + signed dependencies']
      ] },
    { cat: 'physical', title: 'Insider / Physical', summary: 'When physical access is the threat, physical + process controls dominate.',
      keyPairs: [
        ['Insider threat', 'DLP + UEBA + separation of duties'],
        ['Evil maid', 'FDE with pre-boot auth + Secure Boot'],
        ['Tailgating', 'Mantrap + anti-passback + tailgate sensors'],
        ['Tool drop', '802.1X + DHCP fingerprinting'],
        ['Laptop theft', 'FDE + remote wipe via MDM']
      ] }
  ],

  // ── CONTROL TYPE SORTER (v4.95.0, issue #302) ────────────────────────────
  // CompTIA SY0-701 Domain 1.1 6×4 matrix: 6 types × 4 categories. Drill format
  // is dual-axis MCQ — pick TYPE (1-of-6) AND CATEGORY (1-of-4) for each
  // control. Submit only enabled when both axes locked in. Wrong on either
  // axis = wrong; right on both = right (advance box +1).
  // Visual contract locked to mockup `mockups/security-control-type-sorter-
  // concept.html` State 2 (MCQ mode is recommended for v1).
  controlTypes: {
    prev:  { label: 'Preventive',   icon: '🔒', color: '#5b4fdb', gloss: 'Stops attack before it happens' },
    det:   { label: 'Detective',    icon: '🔍', color: '#06b6d4', gloss: 'Finds attack in progress / after' },
    corr:  { label: 'Corrective',   icon: '🔧', color: '#16a34a', gloss: 'Fixes after attack succeeds' },
    deter: { label: 'Deterrent',    icon: '⚠',  color: '#f59e0b', gloss: 'Discourages attempt (warning)' },
    comp:  { label: 'Compensating', icon: '🔄', color: '#d946ef', gloss: 'Fills gap when primary control fails' },
    dir:   { label: 'Directive',    icon: '📋', color: '#6b6b90', gloss: 'Policy that directs other controls' }
  },
  controlCategories: {
    tech: { label: 'Technical',   gloss: 'Hardware / software / firmware' },
    mgmt: { label: 'Managerial',  gloss: 'Risk / policy / governance level' },
    ops:  { label: 'Operational', gloss: 'People / process at runtime' },
    phys: { label: 'Physical',    gloss: 'Tangible barriers / sensors' }
  },
  controls: [
    // ── PREVENTIVE × TECHNICAL (5) ──
    { id: 'firewall', name: 'Firewall', desc: 'Network device that blocks traffic based on rules.', type: 'prev', cat: 'tech', obj: '1.1', why: 'Blocks malicious traffic at the network edge before it reaches assets — classic preventive technical control.', trap: 'IDS' },
    { id: 'ips', name: 'Intrusion Prevention System (IPS)', desc: 'Inline device that blocks traffic matching attack signatures.', type: 'prev', cat: 'tech', obj: '1.1', why: 'IPS BLOCKS (preventive) — same hardware as IDS but operates inline. The "P" letter changes the type entirely.', trap: 'IDS' },
    { id: 'encryption-rest', name: 'Disk encryption (FDE)', desc: 'Encrypts data on disk so stolen drive is unreadable.', type: 'prev', cat: 'tech', obj: '1.1', why: 'Prevents disclosure of data-at-rest if device is stolen. Technical because it lives in software/firmware.', trap: null },
    { id: 'antivirus-sig', name: 'Anti-virus (signature-based)', desc: 'Scans files for known malware signatures, blocks/quarantines.', type: 'prev', cat: 'tech', obj: '1.1', why: 'Prevents known malware from running. Modern EDR is hybrid (preventive + detective) but signature-based AV is preventive technical.', trap: null },
    { id: 'mfa', name: 'Multi-factor authentication (MFA)', desc: 'Requires two or more credentials before granting access.', type: 'prev', cat: 'tech', obj: '1.1', why: 'Prevents unauthorised access even if password leaks. Technical because it\'s implemented in identity systems.', trap: null },

    // ── PREVENTIVE × MANAGERIAL (5) ──
    { id: 'onboarding-policy', name: 'Onboarding policy', desc: 'Mandatory checklist new hires must complete before getting system access.', type: 'prev', cat: 'mgmt', obj: '1.1', why: 'Prevents privilege creep + ensures security awareness from day one. Managerial because it\'s a policy/process.', trap: null },
    { id: 'background-check', name: 'Pre-employment background check', desc: 'Vetting hire history, criminal record, education before offer.', type: 'prev', cat: 'mgmt', obj: '1.1', why: 'Prevents hiring high-risk individuals. Managerial — owned by HR/security policy, not technical.', trap: null },
    { id: 'byod-policy', name: 'BYOD policy', desc: 'Written rules for personal-device access to corporate resources.', type: 'prev', cat: 'mgmt', obj: '1.1', why: 'Prevents data leakage by setting expectations + access boundaries before users plug in. Managerial because it\'s policy.', trap: null },
    { id: 'risk-assessment', name: 'Annual risk assessment', desc: 'Formal review of threats + likelihood + impact across the org.', type: 'prev', cat: 'mgmt', obj: '5.1', why: 'Prevents unmitigated risks by surfacing them for prioritisation. Pure management activity.', trap: null },
    { id: 'change-mgmt-policy', name: 'Change management policy', desc: 'Required approvals + review process for production changes.', type: 'prev', cat: 'mgmt', obj: '5.1', why: 'Prevents unreviewed changes from breaking prod or introducing vulns. Managerial because it directs the change process.', trap: 'directive' },

    // ── PREVENTIVE × OPERATIONAL (5) ──
    { id: 'job-rotation', name: 'Job rotation', desc: 'Periodically moving employees between roles.', type: 'prev', cat: 'ops', obj: '5.6', why: 'Prevents fraud + collusion + single points of knowledge. Operational because it\'s a runtime HR practice.', trap: null },
    { id: 'separation-of-duties', name: 'Separation of duties', desc: 'Splits sensitive tasks so no single person can complete them alone.', type: 'prev', cat: 'ops', obj: '5.6', why: 'Prevents unilateral fraud (e.g., one person both approving + paying invoices). Operational practice baked into workflows.', trap: null },
    { id: 'mandatory-leave', name: 'Mandatory leave / vacation', desc: 'Requires employees to take consecutive days off each year.', type: 'prev', cat: 'ops', obj: '5.6', why: 'Prevents long-running fraud schemes by forcing the perpetrator to be absent (catch via the substitute). Operational HR practice.', trap: null },
    { id: 'least-privilege', name: 'Least-privilege provisioning', desc: 'Default access = minimum needed for the role; expansion requires justification.', type: 'prev', cat: 'ops', obj: '4.6', why: 'Prevents over-privilege creep. Operational because it\'s a runtime access-management practice.', trap: null },
    { id: 'security-training', name: 'Annual security awareness training', desc: 'Mandatory yearly course on phishing, social eng, secure handling.', type: 'prev', cat: 'ops', obj: '5.6', why: 'Prevents user-side mistakes (clicking phishing, sharing creds). Operational because it\'s a recurring workforce activity.', trap: null },

    // ── PREVENTIVE × PHYSICAL (5) ──
    { id: 'mantrap', name: 'Mantrap (security vestibule)', desc: 'Two-door entry chamber, only one door open at a time.', type: 'prev', cat: 'phys', obj: '4.1', why: 'Prevents tailgating by enforcing single-occupancy entry. Tangible physical structure.', trap: null },
    { id: 'locked-server-room', name: 'Locked server room', desc: 'Physical lock on the door to the data centre or comms closet.', type: 'prev', cat: 'phys', obj: '4.1', why: 'Prevents unauthorised physical access to servers. Most basic physical preventive control.', trap: null },
    { id: 'cable-lock', name: 'Cable lock for laptops', desc: 'Wire lock attaches laptop to desk, deters opportunistic theft.', type: 'prev', cat: 'phys', obj: '4.1', why: 'Prevents physical theft. Physical technical control — sometimes ambiguous as deterrent, but CompTIA classifies as preventive.', trap: 'deter' },
    { id: 'fence', name: 'Perimeter fence', desc: 'Physical boundary around a facility.', type: 'prev', cat: 'phys', obj: '4.1', why: 'Prevents/slows unauthorised entry. Tangible barrier = preventive physical.', trap: 'deter' },
    { id: 'bollards', name: 'Bollards', desc: 'Concrete or steel posts blocking vehicle access to building entrances.', type: 'prev', cat: 'phys', obj: '4.1', why: 'Prevents vehicle ramming attacks. Physical structure that blocks (preventive, not just deterrent).', trap: 'deter' },

    // ── DETECTIVE × TECHNICAL (5) ──
    { id: 'ids', name: 'Intrusion Detection System (IDS)', desc: 'Network sensor that alerts on suspicious traffic patterns.', type: 'det', cat: 'tech', obj: '1.1', why: 'IDS DETECTS but doesn\'t block — alerts only. Same hardware as IPS but operates passively. The "I" letter is the only difference.', trap: 'IPS' },
    { id: 'siem', name: 'SIEM (Security Information & Event Mgmt)', desc: 'Aggregates logs across the org, alerts on suspicious patterns.', type: 'det', cat: 'tech', obj: '4.1', why: 'Detects attacks via log correlation across devices. Pure detective technical — gives visibility, doesn\'t prevent.', trap: null },
    { id: 'fim', name: 'File integrity monitoring (FIM)', desc: 'Hashes critical files + alerts on unauthorised changes.', type: 'det', cat: 'tech', obj: '4.1', why: 'Detects tampering with config files / system binaries after the fact. Technical software control.', trap: null },
    { id: 'log-analytics', name: 'Log analytics platform', desc: 'Real-time analysis of application + system logs for anomalies.', type: 'det', cat: 'tech', obj: '4.1', why: 'Detects attack patterns by examining logs. Technical because it\'s implemented in software.', trap: null },
    { id: 'edr-detect', name: 'EDR behavioural detection', desc: 'Endpoint agent that detects suspicious process behaviour (file-less malware, etc).', type: 'det', cat: 'tech', obj: '4.1', why: 'Detects what signature AV misses — behavioural patterns. Technical control on endpoints.', trap: null },

    // ── DETECTIVE × MANAGERIAL (5) ──
    { id: 'audit', name: 'Internal security audit', desc: 'Periodic formal review of security controls, gaps, and compliance.', type: 'det', cat: 'mgmt', obj: '5.5', why: 'Detects control failures + policy violations after the fact. Pure managerial activity — owned by audit/risk teams.', trap: null },
    { id: 'log-review', name: 'Log review process', desc: 'Documented process where security team reviews specific logs daily/weekly.', type: 'det', cat: 'mgmt', obj: '4.1', why: 'Detects issues by formal log examination. Managerial because it\'s a process/policy, not the tool itself.', trap: null },
    { id: 'compliance-audit', name: 'External compliance audit (SOC 2, ISO 27001)', desc: 'Third-party audit attesting to control effectiveness.', type: 'det', cat: 'mgmt', obj: '5.5', why: 'Detects gaps via independent review. Managerial — risk/compliance owns it.', trap: null },
    { id: 'access-review', name: 'Quarterly access review', desc: 'Manager certifies their team\'s system access is still appropriate.', type: 'det', cat: 'mgmt', obj: '4.6', why: 'Detects privilege creep + stale accounts. Managerial because it\'s a process, not a technical scan.', trap: null },
    { id: 'penetration-test', name: 'Penetration test', desc: 'Authorised attack simulation by external red team.', type: 'det', cat: 'mgmt', obj: '5.5', why: 'Detects exploitable vulns via simulated attack. Often classified as detective managerial because it\'s a scheduled program with a final report.', trap: null },

    // ── DETECTIVE × OPERATIONAL (5) ──
    { id: 'cctv-review', name: 'CCTV review (active monitoring)', desc: 'Security personnel actively watch camera feeds.', type: 'det', cat: 'ops', obj: '4.1', why: 'Detects in-progress events via human observation. Operational because it\'s a runtime human activity.', trap: 'phys' },
    { id: 'guard-active', name: 'Active patrolling security guard', desc: 'Guard physically walks rounds, observes anomalies.', type: 'det', cat: 'ops', obj: '4.1', why: 'Detects anomalies during patrol. Operational because it\'s a runtime activity (separate from a posted-deterrent presence).', trap: 'deter' },
    { id: 'help-desk-monitoring', name: 'Help-desk anomaly monitoring', desc: 'Help-desk staff trained to spot social-engineering attempts.', type: 'det', cat: 'ops', obj: '4.1', why: 'Detects social engineering at the support touchpoint. Operational human-monitoring practice.', trap: null },
    { id: 'walk-around', name: 'Periodic walk-around inspection', desc: 'Security walks the floor checking for unbadged visitors, unlocked screens.', type: 'det', cat: 'ops', obj: '4.1', why: 'Detects clean-desk + tailgating violations in real-time. Operational human activity.', trap: null },
    { id: 'shift-change-review', name: 'Shift-change handoff log', desc: 'Outgoing shift documents anomalies for incoming shift to review.', type: 'det', cat: 'ops', obj: '4.1', why: 'Detects ongoing situations across shifts. Operational because it\'s the routine handoff process.', trap: null },

    // ── DETECTIVE × PHYSICAL (5) ──
    { id: 'motion-sensor', name: 'Motion sensor', desc: 'PIR or IR sensor that triggers alarm on movement.', type: 'det', cat: 'phys', obj: '4.1', why: 'Detects intrusion when no one should be there. Tangible physical sensor.', trap: null },
    { id: 'cctv-cam', name: 'CCTV camera (recording only)', desc: 'Camera records footage for later review (not actively watched).', type: 'det', cat: 'phys', obj: '4.1', why: 'Detects events for forensic review. Physical because the camera is tangible. Note: live-monitored CCTV is operational; recording-only is physical.', trap: 'ops' },
    { id: 'door-sensor', name: 'Door open/close sensor', desc: 'Magnetic sensor alerts when a door opens outside hours.', type: 'det', cat: 'phys', obj: '4.1', why: 'Detects unauthorised entry attempts. Physical sensor.', trap: null },
    { id: 'glass-break', name: 'Glass-break sensor', desc: 'Acoustic sensor detects breaking glass.', type: 'det', cat: 'phys', obj: '4.1', why: 'Detects forced entry through windows. Physical sensor.', trap: null },
    { id: 'lighting-detect', name: 'Lighting (for camera coverage)', desc: 'Outdoor lighting that ensures cameras can capture identifiable footage.', type: 'det', cat: 'phys', obj: '4.1', why: 'The CompTIA trap: lighting LOOKS like a deterrent but classifies as DETECTIVE — it enables CCTV to detect intruders. Without light, cameras can\'t identify.', trap: 'deter' },

    // ── CORRECTIVE × TECHNICAL (5) ──
    { id: 'backup-restore', name: 'Backup restoration', desc: 'Restoring from backup after data loss / ransomware.', type: 'corr', cat: 'tech', obj: '5.4', why: 'Corrects the data-loss outcome by recovering. Technical because it\'s the backup software.', trap: null },
    { id: 'av-cleanup', name: 'AV malware removal', desc: 'Anti-virus quarantines and removes detected malware.', type: 'corr', cat: 'tech', obj: '2.5', why: 'Corrects the infection by removing the malware. Note: AV detecting is detective; AV removing is corrective.', trap: 'det' },
    { id: 'patch-mgmt', name: 'Emergency patch deployment', desc: 'Pushing critical patches after a CVE is disclosed.', type: 'corr', cat: 'tech', obj: '4.5', why: 'Corrects the vuln by closing the CVE. Technical (the patch itself) — note: scheduled patching is preventive, emergency patching is corrective.', trap: 'prev' },
    { id: 'isolation', name: 'Compromised host isolation (network)', desc: 'Auto-isolating an infected endpoint via NAC / firewall rule.', type: 'corr', cat: 'tech', obj: '4.4', why: 'Corrects ongoing damage by limiting lateral spread. Technical — usually NAC + firewall.', trap: null },
    { id: 'log-rollback', name: 'Database point-in-time recovery', desc: 'Rolling back DB to before a corruption / bad query.', type: 'corr', cat: 'tech', obj: '5.4', why: 'Corrects corrupted data by restoring to known-good. Technical (DB software feature).', trap: null },

    // ── CORRECTIVE × MANAGERIAL (5) ──
    { id: 'irp', name: 'Incident response plan (IRP)', desc: 'Documented procedures for handling security incidents.', type: 'corr', cat: 'mgmt', obj: '4.7', why: 'Corrects the incident by guiding response. Managerial because it\'s a documented plan.', trap: 'dir' },
    { id: 'bcp', name: 'Business continuity plan (BCP)', desc: 'Plan for keeping business running during disruption.', type: 'corr', cat: 'mgmt', obj: '5.5', why: 'Corrects business disruption. Managerial — formal documented plan.', trap: 'dir' },
    { id: 'drp', name: 'Disaster recovery plan (DRP)', desc: 'Plan for recovering IT systems after a disaster.', type: 'corr', cat: 'mgmt', obj: '5.5', why: 'Corrects technology outage. Managerial — formal documented plan with RTO/RPO.', trap: 'dir' },
    { id: 'lessons-learned', name: 'Post-incident lessons-learned review', desc: 'Formal review after every major incident to extract learnings.', type: 'corr', cat: 'mgmt', obj: '4.7', why: 'Corrects organisational gaps revealed by the incident. Managerial activity owned by security leadership.', trap: null },
    { id: 'crisis-comms', name: 'Crisis communication plan', desc: 'Pre-approved templates + channels for breach notification.', type: 'corr', cat: 'mgmt', obj: '5.5', why: 'Corrects reputational + legal damage by managing communication. Managerial — owned by legal/PR/IR.', trap: null },

    // ── CORRECTIVE × OPERATIONAL (5) ──
    { id: 'dr-drill', name: 'Annual DR drill', desc: 'Practice exercise simulating disaster + recovery.', type: 'corr', cat: 'ops', obj: '5.5', why: 'Corrects gaps in DR plan by exercising it. Operational because it\'s a hands-on activity.', trap: null },
    { id: 'tabletop-exercise', name: 'Tabletop incident exercise', desc: 'Discussion-based simulation of incident response.', type: 'corr', cat: 'ops', obj: '4.7', why: 'Corrects IR plan gaps via simulation. Operational team activity (not just paper plan).', trap: null },
    { id: 'restore-procedure', name: 'Documented restore procedure', desc: 'Step-by-step runbook executed by ops during recovery.', type: 'corr', cat: 'ops', obj: '5.5', why: 'Corrects via following a tested procedure. Operational because it\'s the runbook used at runtime.', trap: null },
    { id: 'rollback-procedure', name: 'Production rollback procedure', desc: 'Steps to roll back a bad deployment to last-known-good.', type: 'corr', cat: 'ops', obj: '4.7', why: 'Corrects a bad release. Operational because it\'s the on-call team\'s runtime procedure.', trap: null },
    { id: 'evidence-preservation', name: 'Forensic evidence preservation', desc: 'Operational handling of evidence after incident — chain of custody.', type: 'corr', cat: 'ops', obj: '4.8', why: 'Corrects future legal/compliance gap by preserving evidence. Operational activity.', trap: null },

    // ── CORRECTIVE × PHYSICAL (5) ──
    { id: 'fire-suppression', name: 'Fire suppression (post-trigger cleanup)', desc: 'After a fire-suppression system activates, drying / cleaning servers.', type: 'corr', cat: 'phys', obj: '4.1', why: 'Corrects damage after fire/water event. Physical activity on physical assets.', trap: 'prev' },
    { id: 'water-damage-cleanup', name: 'Water damage cleanup', desc: 'Drying / replacing equipment after pipe burst, flood.', type: 'corr', cat: 'phys', obj: '4.1', why: 'Corrects physical damage. Physical because it\'s tangible cleanup.', trap: null },
    { id: 'lock-rekey', name: 'Lock re-keying after compromise', desc: 'Re-keying locks after key/badge is lost or compromised.', type: 'corr', cat: 'phys', obj: '4.1', why: 'Corrects physical access compromise. Physical activity.', trap: null },
    { id: 'replacement-equipment', name: 'Hot-spare equipment swap', desc: 'Physically swapping in a hot-spare server after hardware failure.', type: 'corr', cat: 'phys', obj: '5.5', why: 'Corrects hardware failure by physical replacement. Physical activity.', trap: null },
    { id: 'evacuation-cleanup', name: 'Post-evacuation facility check', desc: 'Sweep + secure facility after emergency evacuation.', type: 'corr', cat: 'phys', obj: '4.1', why: 'Corrects security gaps left during emergency. Physical sweep.', trap: null },

    // ── DETERRENT × TECHNICAL (5) ──
    { id: 'login-banner', name: 'Login warning banner ("authorised use only")', desc: 'Pre-login banner warning of monitoring + unauthorised use prosecution.', type: 'deter', cat: 'tech', obj: '5.4', why: 'Deters unauthorised use by warning users they\'re monitored. Technical because it\'s an OS/app config.', trap: null },
    { id: 'screen-lock-warning', name: 'Locked-screen warning text', desc: 'Locked-screen banner showing "this device monitored" + ownership.', type: 'deter', cat: 'tech', obj: '5.4', why: 'Deters opportunistic access attempts. Technical configuration.', trap: null },
    { id: 'geofence-warning', name: 'MDM geofence warning', desc: 'Warning popup when user takes managed device outside permitted region.', type: 'deter', cat: 'tech', obj: '4.5', why: 'Deters out-of-policy use. Technical because it\'s MDM config.', trap: null },
    { id: 'ssl-warning', name: 'Browser HTTPS-mismatch warning', desc: 'Browser displays warning when cert doesn\'t match domain.', type: 'deter', cat: 'tech', obj: '1.4', why: 'Deters users from continuing to suspicious sites. Technical browser feature.', trap: null },
    { id: 'no-anonymous-access', name: '"Authentication required" prompt', desc: 'Prompt deters opportunistic anonymous access attempts.', type: 'deter', cat: 'tech', obj: '4.6', why: 'Deters opportunistic users from probing further. Technical configuration.', trap: 'prev' },

    // ── DETERRENT × MANAGERIAL (5) ──
    { id: 'disciplinary-policy', name: 'Posted disciplinary policy', desc: 'Published policy stating consequences for security violations.', type: 'deter', cat: 'mgmt', obj: '5.6', why: 'Deters violations by making consequences visible. Managerial — formal published policy.', trap: 'dir' },
    { id: 'aup-warning', name: 'AUP acknowledgement on hire', desc: 'Acceptable Use Policy signed at onboarding with violation penalties.', type: 'deter', cat: 'mgmt', obj: '5.6', why: 'Deters policy violations by making expectations + penalties known. Managerial.', trap: 'dir' },
    { id: 'whistleblower-policy', name: 'Whistleblower protection policy', desc: 'Policy protecting employees who report security violations.', type: 'deter', cat: 'mgmt', obj: '5.6', why: 'Deters retaliation against reporters, deters bad actors who fear being reported. Managerial.', trap: null },
    { id: 'monitoring-notice', name: 'Workplace monitoring notice', desc: 'Notice that all communications + systems are monitored.', type: 'deter', cat: 'mgmt', obj: '5.4', why: 'Deters misuse. Managerial — owned by HR/legal.', trap: null },
    { id: 'criminal-prosecution-policy', name: 'Posted prosecution policy', desc: 'Public statement that violations will be prosecuted.', type: 'deter', cat: 'mgmt', obj: '5.6', why: 'Deters by signaling consequences. Managerial.', trap: null },

    // ── DETERRENT × OPERATIONAL (5) ──
    { id: 'visible-guard', name: 'Visible security guard (presence)', desc: 'Stationed guard whose presence deters bad actors.', type: 'deter', cat: 'ops', obj: '4.1', why: 'Deters by presence — separate from active patrol (which is detective). Operational human role.', trap: 'det' },
    { id: 'security-uniform', name: 'Visible security uniforms', desc: 'Staff wearing security uniforms in public areas.', type: 'deter', cat: 'ops', obj: '4.1', why: 'Deters opportunistic bad actors. Operational because it\'s the staff visible at runtime.', trap: null },
    { id: 'badge-display', name: 'Visible badge display requirement', desc: 'All staff required to wear visible badges; missing badges challenged.', type: 'deter', cat: 'ops', obj: '4.1', why: 'Deters tailgaters who lack a badge. Operational practice.', trap: null },
    { id: 'public-incident-disclosure', name: 'Public incident reporting (transparency)', desc: 'Quick public disclosure of incidents deters re-targeting.', type: 'deter', cat: 'ops', obj: '5.4', why: 'Deters by signaling that attackers won\'t go undetected/undisclosed. Operational practice.', trap: null },
    { id: 'social-norm-enforcement', name: 'Active "no badge, no entry" enforcement', desc: 'Staff actively challenging unbadged visitors.', type: 'deter', cat: 'ops', obj: '4.1', why: 'Deters tailgating attempts via cultural norm. Operational practice.', trap: null },

    // ── DETERRENT × PHYSICAL (5) ──
    { id: 'beware-dog-sign', name: '"Beware of dog" sign', desc: 'Posted sign warning of guard dog (whether or not one exists).', type: 'deter', cat: 'phys', obj: '4.1', why: 'Deters by warning. Physical (the sign itself) but no actual barrier — pure deterrent.', trap: 'prev' },
    { id: 'dummy-camera', name: 'Dummy CCTV camera', desc: 'Fake camera that looks real but doesn\'t record.', type: 'deter', cat: 'phys', obj: '4.1', why: 'Deters but doesn\'t detect. Physical (the prop) but provides no detection capability — pure deterrent.', trap: 'det' },
    { id: 'warning-sign', name: '"No trespassing" sign', desc: 'Posted property warning sign.', type: 'deter', cat: 'phys', obj: '4.1', why: 'Deters by warning. Physical sign.', trap: null },
    { id: 'cctv-warning-sign', name: '"CCTV in operation" sign', desc: 'Sign indicating area under camera surveillance.', type: 'deter', cat: 'phys', obj: '4.1', why: 'Deters bad actors. The sign is a deterrent; the camera (if real) is detective. Physical sign = deterrent physical.', trap: 'det' },
    { id: 'visible-fence-deter', name: 'Highly visible perimeter fence', desc: 'Tall razor-wire fence whose primary purpose is to deter, not block.', type: 'deter', cat: 'phys', obj: '4.1', why: 'Visual height/razor-wire signals "high security". Note: a regular fence is preventive (blocks); a razor-wire fence is deterrent (warns).', trap: 'prev' },

    // ── COMPENSATING × TECHNICAL (5) ──
    { id: 'waf-legacy', name: 'WAF for unpatched legacy app', desc: 'Web Application Firewall placed in front of an app that can\'t be patched.', type: 'comp', cat: 'tech', obj: '4.4', why: 'COMPENSATES for the inability to fix the underlying app. WAF rules approximate a real fix. Technical control.', trap: 'prev' },
    { id: 'manual-code-review', name: 'Manual code review (no SAST tooling)', desc: 'Human reviewer examines code when automated SAST tooling unavailable.', type: 'comp', cat: 'tech', obj: '4.5', why: 'Compensates for missing SAST automation. Technical activity (review of source code).', trap: null },
    { id: 'air-gap', name: 'Air-gapped backup (when network backup compromised)', desc: 'Standalone backup not connected to compromised network.', type: 'comp', cat: 'tech', obj: '5.5', why: 'Compensates for the failure of network-based backups. Technical control filling the recovery gap.', trap: null },
    { id: 'vpn-instead-of-zerotrust', name: 'VPN where Zero Trust isn\'t deployed', desc: 'VPN protects remote access in absence of full Zero Trust architecture.', type: 'comp', cat: 'tech', obj: '4.4', why: 'Compensates for the gap between current state and target Zero Trust state. Technical control bridging architectures.', trap: 'prev' },
    { id: 'secondary-mfa-app', name: 'Email MFA when authenticator app unavailable', desc: 'OTP via email used when user can\'t use authenticator app.', type: 'comp', cat: 'tech', obj: '4.6', why: 'Compensates for primary MFA unavailability. Technical fallback control.', trap: null },

    // ── COMPENSATING × MANAGERIAL (5) ──
    { id: 'manual-approval-risky', name: 'Manual approval for risky transactions', desc: 'Human approver required when automated risk-engine threshold exceeded.', type: 'comp', cat: 'mgmt', obj: '5.1', why: 'Compensates for automated control gaps. Managerial because it\'s a process/policy.', trap: null },
    { id: 'extra-reviewer-policy', name: 'Two-person rule for sensitive actions', desc: 'Policy requiring two people approve sensitive change.', type: 'comp', cat: 'mgmt', obj: '5.6', why: 'Compensates for the absence of automated separation-of-duties controls. Managerial policy.', trap: 'prev' },
    { id: 'enhanced-vendor-review', name: 'Enhanced vendor review (after breach)', desc: 'Increased scrutiny of vendors after a supply-chain incident.', type: 'comp', cat: 'mgmt', obj: '5.3', why: 'Compensates for trust gap exposed by the breach. Managerial activity.', trap: null },
    { id: 'temporary-access-policy', name: 'Temporary elevated access policy', desc: 'Policy granting temporary admin rights for emergency work.', type: 'comp', cat: 'mgmt', obj: '4.6', why: 'Compensates for the inability to give permanent admin (least privilege) when an emergency requires it. Managerial.', trap: null },
    { id: 'budget-deferral-control', name: 'Budget deferral until upgrade', desc: 'Workaround security policy for systems waiting for funded replacement.', type: 'comp', cat: 'mgmt', obj: '5.1', why: 'Compensates for the inability to immediately replace. Managerial.', trap: null },

    // ── COMPENSATING × OPERATIONAL (5) ──
    { id: 'extra-reviewer-absence', name: 'Extra reviewer when primary unavailable', desc: 'Substitute approver brought in when primary on leave.', type: 'comp', cat: 'ops', obj: '5.6', why: 'Compensates for primary approver absence. Operational team activity.', trap: null },
    { id: 'manual-process-during-outage', name: 'Manual fallback process during outage', desc: 'Paper-based process during system outage.', type: 'comp', cat: 'ops', obj: '5.5', why: 'Compensates for system unavailability. Operational manual practice.', trap: null },
    { id: 'extra-monitoring-after-incident', name: 'Heightened monitoring after incident', desc: 'Increased operational monitoring of affected systems for X days post-incident.', type: 'comp', cat: 'ops', obj: '4.7', why: 'Compensates for residual risk after incident. Operational activity.', trap: null },
    { id: 'compensating-watchstand', name: 'Manual security watch (after sensor failure)', desc: 'Human guard watching area after motion sensor fails.', type: 'comp', cat: 'ops', obj: '4.1', why: 'Compensates for technical sensor outage. Operational human activity.', trap: null },
    { id: 'redundant-on-call', name: 'Redundant on-call rotation', desc: 'Two on-call engineers when system stability is uncertain.', type: 'comp', cat: 'ops', obj: '5.5', why: 'Compensates for primary on-call risk. Operational staffing.', trap: null },

    // ── COMPENSATING × PHYSICAL (5) ──
    { id: 'temp-lock', name: 'Temporary padlock + guard', desc: 'Padlock + posted guard at door whose biometric lock failed.', type: 'comp', cat: 'phys', obj: '4.1', why: 'Compensates for primary lock failure. Physical (the padlock + guard).', trap: null },
    { id: 'temp-fence', name: 'Temporary chain-link fence (during construction)', desc: 'Construction-grade fence around damaged perimeter.', type: 'comp', cat: 'phys', obj: '4.1', why: 'Compensates for primary fence damage. Physical structure.', trap: null },
    { id: 'temp-physical-barrier', name: 'Concrete barriers during permanent wall repair', desc: 'Jersey barriers around damaged building section.', type: 'comp', cat: 'phys', obj: '4.1', why: 'Compensates for primary structural integrity issue. Physical.', trap: null },
    { id: 'manual-key-lockout', name: 'Manual lock-and-key when card reader fails', desc: 'Mechanical lock + key during electronic access system outage.', type: 'comp', cat: 'phys', obj: '4.1', why: 'Compensates for electronic access system failure. Physical fallback.', trap: null },
    { id: 'temp-power-supply', name: 'Generator + UPS (during utility power loss)', desc: 'Backup power maintains physical security systems during outage.', type: 'comp', cat: 'phys', obj: '4.1', why: 'Compensates for utility power loss to maintain physical security operations. Physical equipment.', trap: null },

    // ── DIRECTIVE × TECHNICAL (5) ──
    { id: 'sso-config-requirement', name: 'SSO config requirement', desc: 'Documented requirement that all apps must integrate with corporate SSO.', type: 'dir', cat: 'tech', obj: '4.6', why: 'Directs technical implementation. Different from preventive (which would be the SSO system itself) — this is the directive saying "you must use SSO".', trap: 'prev' },
    { id: 'crypto-standard', name: 'Approved cryptographic algorithm list', desc: 'Documented list of approved algorithms (e.g., AES-256, RSA-2048+).', type: 'dir', cat: 'tech', obj: '1.4', why: 'Directs cryptographic implementation. Engineers must follow this when building.', trap: 'prev' },
    { id: 'tls-minimum-policy', name: 'TLS minimum version policy', desc: 'Policy mandating TLS 1.2+ for all internet-facing services.', type: 'dir', cat: 'tech', obj: '1.4', why: 'Directs technical implementation of transport security. Configuration requirement.', trap: 'prev' },
    { id: 'patch-cadence-policy', name: 'Patch cadence policy', desc: 'Policy mandating critical patches applied within 14 days.', type: 'dir', cat: 'tech', obj: '4.5', why: 'Directs the technical patching schedule. Note: the patches themselves are preventive; the policy directing the schedule is directive.', trap: 'prev' },
    { id: 'data-retention-config', name: 'Data retention configuration policy', desc: 'Policy directing how long technical systems retain data.', type: 'dir', cat: 'tech', obj: '5.4', why: 'Directs technical data lifecycle. Engineers configure retention to match.', trap: null },

    // ── DIRECTIVE × MANAGERIAL (5) ──
    { id: 'aup', name: 'Acceptable Use Policy (AUP)', desc: 'Top-level policy directing what users can/cannot do.', type: 'dir', cat: 'mgmt', obj: '5.6', why: 'Directs user behaviour at the policy level. Top-down managerial directive.', trap: 'deter' },
    { id: 'nist-csf', name: 'NIST Cybersecurity Framework adoption', desc: 'Org commits to NIST CSF as its security framework.', type: 'dir', cat: 'mgmt', obj: '5.5', why: 'Directs the entire security program direction. Managerial framework directive.', trap: null },
    { id: 'iso-27001', name: 'ISO 27001 ISMS', desc: 'Information Security Management System per ISO 27001.', type: 'dir', cat: 'mgmt', obj: '5.5', why: 'Directs how the security program is governed. Managerial directive.', trap: null },
    { id: 'data-classification-policy', name: 'Data classification policy', desc: 'Policy directing how data is classified (Public/Internal/Confidential/Restricted).', type: 'dir', cat: 'mgmt', obj: '5.4', why: 'Directs all subsequent data handling. Top-down managerial directive.', trap: null },
    { id: 'risk-tolerance-statement', name: 'Risk tolerance statement', desc: 'Board-approved statement of acceptable risk levels.', type: 'dir', cat: 'mgmt', obj: '5.1', why: 'Directs all subsequent risk decisions. Managerial directive.', trap: null },

    // ── DIRECTIVE × OPERATIONAL (5) ──
    { id: 'sop', name: 'Standard Operating Procedure (SOP)', desc: 'Step-by-step procedure directing how operational tasks are done.', type: 'dir', cat: 'ops', obj: '5.5', why: 'Directs how work is done at runtime. Operational because it lives in the day-to-day.', trap: null },
    { id: 'runbook', name: 'On-call runbook', desc: 'Documented runbook directing on-call response for common issues.', type: 'dir', cat: 'ops', obj: '5.5', why: 'Directs on-call team\'s actions. Operational directive.', trap: null },
    { id: 'change-window-schedule', name: 'Change window schedule', desc: 'Schedule directing when production changes are permitted.', type: 'dir', cat: 'ops', obj: '5.6', why: 'Directs operational change windows. Operational directive.', trap: null },
    { id: 'naming-convention', name: 'Server naming convention', desc: 'Required pattern for server hostnames (e.g., env-region-role-NN).', type: 'dir', cat: 'ops', obj: '5.5', why: 'Directs how operational artifacts are named. Operational directive.', trap: null },
    { id: 'rollback-policy-direct', name: 'Rollback procedure requirement', desc: 'Policy requiring every deployment to have a documented rollback.', type: 'dir', cat: 'ops', obj: '4.7', why: 'Directs how deployments are structured. Operational directive (the policy; the rollback itself is corrective).', trap: 'corr' },

    // ── DIRECTIVE × PHYSICAL (5) ──
    { id: 'evac-route', name: 'Posted evacuation route', desc: 'Floor diagram with marked evacuation paths.', type: 'dir', cat: 'phys', obj: '4.1', why: 'Directs physical action during emergency. Physical (the posted diagram).', trap: null },
    { id: 'fire-extinguisher-loc', name: 'Posted fire extinguisher locations', desc: 'Required posted signage showing extinguisher locations.', type: 'dir', cat: 'phys', obj: '4.1', why: 'Directs physical emergency response. Physical signage.', trap: null },
    { id: 'access-tier-signage', name: 'Posted security tier signage', desc: 'Signs marking restricted vs public areas of facility.', type: 'dir', cat: 'phys', obj: '4.1', why: 'Directs physical access decisions. Physical signage.', trap: 'deter' },
    { id: 'emergency-procedures-poster', name: 'Posted emergency procedures', desc: 'Required posted emergency procedures (fire, lockdown, etc.).', type: 'dir', cat: 'phys', obj: '4.1', why: 'Directs physical response procedures. Physical posted document.', trap: null },
    { id: 'safety-equipment-policy', name: 'Required safety equipment posting', desc: 'Posted requirements for hard hats, eye protection, etc. in restricted areas.', type: 'dir', cat: 'phys', obj: '4.1', why: 'Directs physical safety compliance. Physical posted requirements.', trap: null }
  ],
  controlMatrixLessons: [
    { type: 'prev', title: 'Preventive controls', summary: 'Stop the attack before it happens.',
      cells: {
        tech: ['Firewall, IPS, encryption', 'AV, MFA'],
        mgmt: ['Onboarding policy, BYOD', 'Background checks'],
        ops:  ['Job rotation, separation of duties', 'Mandatory leave'],
        phys: ['Mantrap, locked server room', 'Bollards, fence']
      } },
    { type: 'det', title: 'Detective controls', summary: 'Find the attack in progress or after.',
      cells: {
        tech: ['IDS, SIEM, FIM', 'EDR behavioural detection'],
        mgmt: ['Audit, log review', 'Pen test, compliance audit'],
        ops:  ['CCTV review, active patrol', 'Walk-around inspection'],
        phys: ['Motion sensors, lighting', 'CCTV cameras (recording)']
      } },
    { type: 'corr', title: 'Corrective controls', summary: 'Fix the damage after the attack.',
      cells: {
        tech: ['Backup restore, AV cleanup', 'Emergency patch, isolation'],
        mgmt: ['IR plan, BCP/DRP', 'Lessons learned, crisis comms'],
        ops:  ['DR drill, restore procedure', 'Tabletop exercise'],
        phys: ['Fire suppression cleanup', 'Lock re-keying, equipment swap']
      } },
    { type: 'deter', title: 'Deterrent controls', summary: 'Discourage the attempt with warning.',
      cells: {
        tech: ['Login banners, screen warnings', 'HTTPS-mismatch warning'],
        mgmt: ['Posted disciplinary policy', 'AUP, monitoring notice'],
        ops:  ['Visible guard presence', 'Security uniforms'],
        phys: ['"Beware of dog" sign', 'Dummy camera, warning signs']
      } },
    { type: 'comp', title: 'Compensating controls', summary: 'Fill the gap when primary control fails.',
      cells: {
        tech: ['WAF for legacy app', 'Manual code review, air-gap'],
        mgmt: ['Manual approval for risky txn', 'Two-person rule'],
        ops:  ['Extra reviewer in absence', 'Manual fallback during outage'],
        phys: ['Padlock + guard (lock failure)', 'Generator (power loss)']
      } },
    { type: 'dir', title: 'Directive controls', summary: 'Policy that directs other controls.',
      cells: {
        tech: ['SSO config requirement', 'Crypto standard, TLS policy'],
        mgmt: ['AUP, NIST CSF, ISO 27001', 'Data classification policy'],
        ops:  ['SOP, runbook', 'Change window schedule'],
        phys: ['Posted evacuation route', 'Emergency procedures poster']
      } }
  ],

  // ════════════════════════════════════════════════════════════════════
  // INCIDENT RESPONSE WAR ROOM — Flagship #1 (v4.97.0 / issue #312)
  // SY0-701 Domain 4 (Security Operations, 28%) flagship drill.
  // 6-phase SANS PICERL timeline (Preparation, Identification,
  // Containment, Eradication, Recovery, Lessons Learned).
  // 5 scenarios at v1; expands to 25 by v4.97.3.
  // Visual contract locked to mockups/security-incident-response-war-room-concept.html
  // ════════════════════════════════════════════════════════════════════
  incidentResponseVectors: {
    'ransomware':    { name: 'Ransomware', icon: '🦠', color: '#ef4444' },
    'insider':       { name: 'Insider threat', icon: '👤', color: '#a855f7' },
    'cloud':         { name: 'Cloud breach', icon: '☁️', color: '#06b6d4' },
    'phish-derived': { name: 'Phish-derived', icon: '🎣', color: '#f59e0b' },
    'supply-chain':  { name: 'Supply chain', icon: '🔗', color: '#22c55e' },
    'ddos':          { name: 'DDoS', icon: '🌐', color: '#3b82f6' }
  },
  incidentResponsePhases: [
    { id: 'preparation',    num: 1, name: 'Preparation',    color: '#3b82f6', goal: "You can't pause an incident to write a playbook. Build readiness BEFORE day-zero." },
    { id: 'identification', num: 2, name: 'Identification', color: '#06b6d4', goal: 'Is this an incident? What kind? How bad? Confirm and classify.' },
    { id: 'containment',    num: 3, name: 'Containment',    color: '#f59e0b', goal: 'Stop the spread. Preserve evidence. Don\'t make eradication harder.' },
    { id: 'eradication',    num: 4, name: 'Eradication',    color: '#ef4444', goal: 'Remove the malware AND the way it got in. If you only remove the malware, it\'ll come back.' },
    { id: 'recovery',       num: 5, name: 'Recovery',       color: '#22c55e', goal: 'Get back to business safely. Watch for recurrence. Restore + monitor + validate.' },
    { id: 'lessons',        num: 6, name: 'Lessons Learned',color: '#a855f7', goal: 'How do we make sure this never happens again — or at least costs less next time?' }
  ],
  incidentResponseScenarios: [
    // ──────────────────────────────────────────────────────────────────
    // 1) Ryuk on finance workstation — Ransomware ★★ Exam (the canonical PICERL scenario)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'ryuk-finance',
      title: 'Ryuk ransomware on finance workstation',
      icon: '🦠',
      vector: 'ransomware',
      difficulty: 2,
      unlockAfter: [],
      summary: 'Encrypted files appear on FIN-WS-08. SMB shares accessed cross-VLAN. C2 beacon to known TOR node. Walk the playbook.',
      context: 'At 09:14, file-server ABC-FS01 logged 3,400 SMB writes from FIN-WS-08 in 90 seconds. EDR on FIN-WS-08 flagged a process tree: cmd.exe → powershell.exe → ryuk.exe. CPU pinned at 100%. Files in C:\\Users\\jdoe\\Documents now have .ryk extension. User reports "ransom note popped up."',
      vertical: 'Corporate finance',
      severity: 'SEV-2',
      iocs: [
        { type: 'sha256', value: '4f3c8bc2a91d…b2e1', label: 'ryuk.exe' },
        { type: 'c2', value: '185.220.101.42:443', label: 'TOR exit node' },
        { type: 'mutex', value: 'RyukReadMe.txt', label: 'Ransom-note marker' },
        { type: 'host', value: 'FIN-WS-08 (10.4.12.18)', label: 'Affected host' },
        { type: 'user', value: 'CORP\\jdoe', label: 'Compromised account' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What pre-incident readiness already paid off?',
          promptStem: 'Pick the prep activities that made this response possible. (This is "is your house in order?" — done before day-zero.)',
          actions: [
            { id: 'p1a1', label: 'IR plan documented + reviewed last quarter', isCorrect: true, meta: 'Preparation · plan', why: 'You have a runbook to follow at 09:14 — without it, you improvise under pressure.' },
            { id: 'p1a2', label: 'EDR deployed across all corp endpoints with auto-isolation policy enabled', isCorrect: true, meta: 'Preparation · tooling', why: 'EDR is what surfaced the malicious process tree + lets you isolate without driving to the desk.' },
            { id: 'p1a3', label: 'Tabletop exercise on ransomware ran 6 months ago', isCorrect: true, meta: 'Preparation · practice', why: 'The team has rehearsed this exact playbook in the calm. Muscle memory matters.' },
            { id: 'p1a4', label: 'Buy more security tools right now', isCorrect: false, meta: 'Eradication-flavoured · wrong phase', why: 'Tools without playbook + practice don\'t help during an incident. Process > products. Buy more later, in the post-incident review.' },
            { id: 'p1a5', label: 'Restore from backup', isCorrect: false, meta: 'Recovery · wrong phase', why: 'Recovery comes after eradication. You don\'t restore at preparation time.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 3,
          promptTitle: 'What do you do RIGHT NOW to confirm and triage?',
          promptStem: 'Pick every action that\'s appropriate at this stage. Over-picking is a wrong-answer signal — pick only what is required to confirm scope and classify severity.',
          actions: [
            { id: 'p2a1', label: 'Open a ticket and assign severity SEV-2', isCorrect: true, meta: 'Identification · classify', why: 'Severity drives the scope of response. SEV-2 mobilises the IR team without the all-hands-on-deck of SEV-1.' },
            { id: 'p2a2', label: 'Pull EDR process tree + parent process for ryuk.exe', isCorrect: true, meta: 'Identification · confirm', why: 'Confirms this isn\'t a false positive AND shows how the malware launched (PowerShell → ransomware = post-exploitation).' },
            { id: 'p2a3', label: 'Cross-check C2 IP against threat intel feed', isCorrect: true, meta: 'Identification · enrich', why: 'TOR-exit confirmation classifies this as deliberate human-operated ransomware, not commodity drive-by.' },
            { id: 'p2a4', label: 'Power off FIN-WS-08 immediately', isCorrect: false, meta: 'Containment-flavoured · wrong phase', why: 'Containment comes next. AND power-off is the wrong containment move (see phase 3).' },
            { id: 'p2a5', label: 'Restore files from backup', isCorrect: false, meta: 'Recovery · wrong phase', why: 'Restoring during identification is way too early — you don\'t even know the scope yet.' },
            { id: 'p2a6', label: 'Wipe and re-image FIN-WS-08', isCorrect: false, meta: 'Eradication · wrong phase', why: 'Wiping destroys the evidence you\'d need for the rest of the response. Wait until eradication.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 5,
          promptTitle: 'Stop the spread without destroying evidence.',
          promptStem: '5 expected actions. Evidence preservation matters. Over-aggressive containment can cost the eradication phase later.',
          trapCallout: {
            title: 'The power-off trap',
            body: '"Powering off the infected host stops the encryption" sounds right — and it does stop encryption — but it destroys all volatile evidence in the process. RAM holds the running ransomware process state, the decryption key (sometimes), injected DLLs, the C2 session, and recently-accessed file tables. Network-isolate achieves the same containment goal (no more spread, no more C2) WHILE preserving everything forensics needs to attribute the attack and possibly recover keys. Memorize: isolate ≠ power off.'
          },
          actions: [
            { id: 'p3a1', label: 'Network-isolate FIN-WS-08 via EDR (keep powered on)', isCorrect: true, meta: 'Containment · evidence-preserving', why: 'Isolating via EDR cuts the host off from network spread + C2 callouts while keeping memory + running processes intact for forensics. Canonical containment move.' },
            { id: 'p3a2', label: 'Block C2 IP 185.220.101.42 at perimeter firewall', isCorrect: true, meta: 'Containment · network-level', why: 'Blocks command-and-control for any other infected host you haven\'t found yet — including the second host the AD sweep will surface.' },
            { id: 'p3a3', label: 'Disable CORP\\jdoe AD account + force re-auth across session', isCorrect: true, meta: 'Containment · identity-level', why: 'Stops the attacker pivoting with jdoe\'s credentials to other hosts. Pair with Kerberos golden-ticket invalidation if AD is on the table.' },
            { id: 'p3a4', label: 'Capture memory image (RAM dump) before any power state change', isCorrect: true, meta: 'Containment · forensic preservation', why: 'Order of volatility (RFC 3227): RAM > swap > network state > disk. Captured BEFORE any reboot/power-off, you preserve injected DLLs, decryption keys still resident, and C2 session state.' },
            { id: 'p3a5', label: 'Sweep AD for SMB sessions originating from 10.4.12.18', isCorrect: true, meta: 'Containment · scope expansion', why: 'Containment isn\'t just "stop the obvious thing" — it\'s "find the unknown spread." This is what surfaces HR-WS-04 (the second infected host).' },
            { id: 'p3a6', label: 'Power off FIN-WS-08 to stop encryption', isCorrect: false, meta: 'Eradication-flavoured · destroys evidence', why: 'TRAP. Power-off destroys all volatile evidence. Network-isolate first, RAM-dump second, only THEN power down if needed. The #1 SY0-701 IR trap.' },
            { id: 'p3a7', label: 'Re-image FIN-WS-08 from clean baseline', isCorrect: false, meta: 'Eradication · wrong phase', why: 'Re-imaging is eradication. Doing it now destroys evidence + hasn\'t confirmed scope yet.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 4,
          promptTitle: 'Remove the malware AND the way it got in.',
          promptStem: 'Containment is done. Both infected hosts are isolated. Now make sure trust is restored and the vulnerability is closed.',
          actions: [
            { id: 'p4a1', label: 'Wipe and re-image FIN-WS-08 + HR-WS-04 from clean Windows baseline', isCorrect: true, meta: 'Eradication · trust-restore', why: 'Disinfection isn\'t trust-restoring (you can never be sure you got 100%). Wipe + reimage is the only trustworthy option.' },
            { id: 'p4a2', label: 'Patch the initial-access vulnerability (Outlook macro exploit) fleet-wide', isCorrect: true, meta: 'Eradication · root-cause', why: 'Same vuln exists on every other host. If you only patch the affected hosts, the next phish hits a different host with the same gap.' },
            { id: 'p4a3', label: 'Rotate jdoe\'s passwords + any service-account creds touched on FIN-WS-08', isCorrect: true, meta: 'Eradication · credential rotation', why: 'Attackers exfiltrate credentials before encrypting. Rotate every credential the host had access to.' },
            { id: 'p4a4', label: 'Promote 185.220.101.42 from temporary block to permanent IOC blocklist', isCorrect: true, meta: 'Eradication · IOC promotion', why: 'Containment-time blocks expire. Make it permanent.' },
            { id: 'p4a5', label: 'Just run AV again on the infected hosts', isCorrect: false, meta: 'Eradication-flavoured · half-measure', why: 'Disinfection-only isn\'t trust-restoring. Wipe + reimage is the only safe path.' },
            { id: 'p4a6', label: 'Pay the ransom to get the decryption key', isCorrect: false, meta: 'Recovery-flavoured · trap', why: 'Pay-the-ransom funds future attacks + you may not get keys back + may violate OFAC sanctions if the crew is sanctioned. Almost never the right move.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 4,
          promptTitle: 'Get back to business safely. Watch for recurrence.',
          promptStem: 'Eradication is done. Hosts are clean, vuln is patched. Now bring service back up — carefully + monitored.',
          actions: [
            { id: 'p5a1', label: 'Restore user files from backup taken before 09:14 today', isCorrect: true, meta: 'Recovery · clean restore', why: 'Pre-incident-timestamp backups only. Verify backup hashes against known-good before restore.' },
            { id: 'p5a2', label: 'Hash-check restored files against pre-incident manifest', isCorrect: true, meta: 'Recovery · integrity validation', why: 'Hash-check verifies backup was clean + restored intact. Especially important if backup-server credentials were touched.' },
            { id: 'p5a3', label: 'Re-introduce hosts to network gradually + monitor for 30 days', isCorrect: true, meta: 'Recovery · staged + monitored', why: 'Heightened monitoring catches recurrence. Ransomware crews often try again 2-4 weeks later via the same initial-access path.' },
            { id: 'p5a4', label: 'Notify finance team about new SOPs for opening attachments', isCorrect: true, meta: 'Recovery · user comms', why: 'Macro-exploit was the initial vector. Affected users need to know what to watch for + new safe-handling procedures.' },
            { id: 'p5a5', label: 'Restore from yesterday\'s backup (last automated)', isCorrect: false, meta: 'Recovery · stale data', why: 'Yesterday loses today\'s pre-incident work. This morning\'s pre-9:14 snapshot is the right target.' },
            { id: 'p5a6', label: 'Restore directly to production without staging', isCorrect: false, meta: 'Recovery · risky', why: 'Direct restore = if you missed something during eradication, you\'re back in containment. Stage + verify first.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 4,
          promptTitle: 'Close the loop. Make sure this never happens again — or at least costs less next time.',
          promptStem: 'Recovery done. Now the post-incident review (within 2 weeks while details are fresh).',
          actions: [
            { id: 'p6a1', label: 'Write blameless post-mortem with timestamped action log', isCorrect: true, meta: 'Lessons · documentation', why: 'Blameless postmortems surface real gaps. Punitive ones surface lies. Timestamps reveal where the response slowed.' },
            { id: 'p6a2', label: 'Update IR playbook with "always isolate, never power off" guidance', isCorrect: true, meta: 'Lessons · playbook update', why: 'You almost made the power-off mistake. Codify the lesson so the next person doesn\'t.' },
            { id: 'p6a3', label: 'Block macros in Office by default fleet-wide', isCorrect: true, meta: 'Lessons · prevention upgrade', why: 'Closes the initial-access vector permanently for the whole org. Single biggest reduction in ransomware-attack surface.' },
            { id: 'p6a4', label: 'Share IOCs (185.220.101.42, ryuk.exe SHA256) with sector ISAC', isCorrect: true, meta: 'Lessons · intel sharing', why: 'Helps peer orgs detect the same crew. Information sharing is what makes ISACs valuable.' },
            { id: 'p6a5', label: 'Skip the post-mortem to ship more features', isCorrect: false, meta: 'Lessons · negligence', why: '"We\'re too busy" = next incident is the same incident. Always close the loop.' },
            { id: 'p6a6', label: 'Fire the user who clicked the macro', isCorrect: false, meta: 'Lessons · blame culture', why: 'Punitive blame breaks the trust that makes future incidents reportable. The user did what most users would do — train, don\'t fire.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 2) BEC wire-fraud — Phish-derived ★★ Exam (social-engineering canonical)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'bec-wire-fraud',
      title: 'CFO BEC → wire fraud almost executed',
      icon: '🎣',
      vector: 'phish-derived',
      difficulty: 2,
      unlockAfter: [],
      summary: 'Spoofed CFO email instructs treasury to wire $480K. Treasurer hesitates. You have 18 minutes before the bank cutoff.',
      context: 'At 14:02, treasurer Sarah received an email from "Sarah Chen, CFO" instructing an urgent confidential wire of $487,000 to an "M&A advisory escrow account" by EOD. The treasurer noticed the Reply-To was different from the From and called you. Wire is staged in the bank portal but not yet authorised. Bank cutoff: 16:00.',
      vertical: 'Corp finance / M&A',
      severity: 'SEV-3',
      iocs: [
        { type: 'email', value: 'sarah.chen.cfo@gmail.com', label: 'Spoofed sender (display-name spoof)' },
        { type: 'reply-to', value: 'treasury.processing@corp-finance-secure.com', label: 'Typosquat reply-to' },
        { type: 'amount', value: '$487,000', label: 'Requested wire' },
        { type: 'recipient', value: 'Account ending 4271 @ Citibank', label: 'Wire destination' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What pre-incident readiness mattered here?',
          promptStem: 'BEC succeeds when verification channels are weak. Pick the prep activities that gave the treasurer the confidence to pause.',
          actions: [
            { id: 'p1a1', label: 'Treasury training on out-of-band verification for any wire ≥ $50K', isCorrect: true, meta: 'Preparation · training', why: 'The treasurer knew to verify out-of-band. Without that training, the wire would be gone.' },
            { id: 'p1a2', label: 'Documented SOP requiring two-person approval for wires ≥ $100K', isCorrect: true, meta: 'Preparation · process', why: 'Two-person rule is the canonical BEC defense — even if the attacker fools one person, they must fool two.' },
            { id: 'p1a3', label: 'DMARC/DKIM/SPF on corp.com domain at quarantine policy', isCorrect: true, meta: 'Preparation · email security', why: 'DMARC quarantine prevents external-address spoofs of corp.com. The attacker had to use gmail.com because of this.' },
            { id: 'p1a4', label: 'Open a SOC ticket and triage', isCorrect: false, meta: 'Identification · wrong phase', why: 'Tickets come in identification, not preparation.' },
            { id: 'p1a5', label: 'Block the sender domain', isCorrect: false, meta: 'Containment · wrong phase', why: 'Containment, not preparation.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm + classify quickly — wire window is closing.',
          promptStem: 'Treasurer paused but bank cutoff is in 117 minutes. Confirm this is BEC, scope the damage, classify severity.',
          actions: [
            { id: 'p2a1', label: 'Call Sarah Chen on her known mobile number to verify the wire request', isCorrect: true, meta: 'Identification · out-of-band verify', why: 'Out-of-band verification breaks the BEC loop. If Sarah didn\'t send it, you\'ve confirmed BEC in 30 seconds.' },
            { id: 'p2a2', label: 'Pull email headers for SPF/DKIM/DMARC results', isCorrect: true, meta: 'Identification · technical verify', why: 'Headers show the email failed DMARC alignment — confirming spoof + giving you provenance for the SOC ticket.' },
            { id: 'p2a3', label: 'Check whether other staff received similar emails (campaign breadth)', isCorrect: true, meta: 'Identification · scope', why: 'BEC often targets multiple finance staff. If 3 people got it, the urgency goes up.' },
            { id: 'p2a4', label: 'Open SEV-3 ticket and notify CFO + legal counsel', isCorrect: true, meta: 'Identification · classify', why: 'Wire fraud crosses into legal/regulatory territory. Loop in legal early.' },
            { id: 'p2a5', label: 'Authorise the wire and ask questions later', isCorrect: false, meta: 'Recovery-flavoured · trap', why: 'Authorising the wire IS the breach. The whole point of identification is to prevent it.' },
            { id: 'p2a6', label: 'Reply to the email asking for more details', isCorrect: false, meta: 'Identification · trap', why: 'Replying confirms your address is monitored + may trigger additional pressure. Out-of-band only.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 4,
          promptTitle: 'Stop the wire + lock down the immediate risk.',
          promptStem: 'BEC is confirmed. Treasurer is fine. Now contain the attack so it can\'t pivot.',
          actions: [
            { id: 'p3a1', label: 'Cancel the staged wire in the bank portal', isCorrect: true, meta: 'Containment · stop the loss', why: 'The wire is the entire payload of this attack. Cancellation is containment.' },
            { id: 'p3a2', label: 'Block sender domain corp-finance-secure.com at email gateway', isCorrect: true, meta: 'Containment · email layer', why: 'Stops follow-up emails from the same crew + any other staff getting the same lure.' },
            { id: 'p3a3', label: 'Quarantine all emails from gmail.com matching "Sarah Chen" display name', isCorrect: true, meta: 'Containment · campaign halt', why: 'Catches the variants that are already in inboxes but not yet read.' },
            { id: 'p3a4', label: 'Notify CFO + bank fraud department (in case wire was sent + needs recall)', isCorrect: true, meta: 'Containment · external coord', why: 'Banks have fraud-recall windows. Notify within hours = better recall odds.' },
            { id: 'p3a5', label: 'Wipe Sarah\'s laptop', isCorrect: false, meta: 'Eradication · wrong target', why: 'Sarah\'s laptop wasn\'t compromised. The attacker spoofed her display name from gmail.com — there\'s nothing to wipe.' },
            { id: 'p3a6', label: 'Disable Sarah\'s AD account', isCorrect: false, meta: 'Containment · wrong target', why: 'Sarah\'s identity wasn\'t compromised. Disabling her account hurts ops without containing the threat.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 3,
          promptTitle: 'Close the windows the attacker exploited.',
          promptStem: 'Wire stopped. Now harden the ecosystem so the same attack can\'t succeed against the next person.',
          actions: [
            { id: 'p4a1', label: 'Roll out anti-spoof banner: "External email from CFO display name" warning', isCorrect: true, meta: 'Eradication · UI control', why: 'Visual warning on every external email claiming to be a senior exec. Trains the eye + adds friction.' },
            { id: 'p4a2', label: 'Tighten DMARC from quarantine to reject for corp.com', isCorrect: true, meta: 'Eradication · email policy', why: 'Reject is the strongest DMARC stance. Blocks 100% of spoofs claiming to be from corp.com.' },
            { id: 'p4a3', label: 'Mandate two-person rule for ALL wires ≥ $25K (was $100K)', isCorrect: true, meta: 'Eradication · process', why: 'Lowers the threshold so smaller BEC attempts also need 2-person sign-off.' },
            { id: 'p4a4', label: 'Block all gmail.com inbound', isCorrect: false, meta: 'Eradication · over-reach', why: 'Gmail is widely used by legitimate vendors + customers. Blanket-block breaks ops without proportionate benefit.' },
            { id: 'p4a5', label: 'Fire the treasurer for "almost falling for it"', isCorrect: false, meta: 'Eradication · blame culture', why: 'The treasurer paused and called you — that\'s exactly the right behaviour. Reward, don\'t punish.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Get treasury back to normal operations.',
          promptStem: 'Threat closed. Now reassure + re-establish workflow for legitimate wires.',
          actions: [
            { id: 'p5a1', label: 'Communicate to all finance staff about what happened + what to do if they see similar', isCorrect: true, meta: 'Recovery · awareness', why: 'Awareness multiplies vigilance. The next attempt may target a different staffer who doesn\'t know about today.' },
            { id: 'p5a2', label: 'Resume normal wire workflow with the new two-person + out-of-band rules', isCorrect: true, meta: 'Recovery · restored ops', why: 'Treasury operations need to keep running. New rules are the safety net.' },
            { id: 'p5a3', label: 'Schedule a sector-wide BEC awareness email next week', isCorrect: true, meta: 'Recovery · prevention', why: 'Wider org awareness reduces future attempts.' },
            { id: 'p5a4', label: 'Suspend all wire transfers indefinitely', isCorrect: false, meta: 'Recovery · over-reach', why: 'Legitimate wires must continue. New rules are the safety net, not a freeze.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Close the loop.',
          promptStem: 'Post-incident review within 2 weeks while details are fresh.',
          actions: [
            { id: 'p6a1', label: 'Document: "out-of-band call saved $487K" with timeline', isCorrect: true, meta: 'Lessons · win documentation', why: 'Documenting wins reinforces the behaviour + builds the case for security investment.' },
            { id: 'p6a2', label: 'Add BEC simulation to next quarterly phishing drill', isCorrect: true, meta: 'Lessons · training', why: 'Simulated BEC keeps the muscle memory fresh. Once-a-year training is forgotten.' },
            { id: 'p6a3', label: 'Brief the board on BEC trend + current org defenses', isCorrect: true, meta: 'Lessons · executive visibility', why: 'Board understanding of the threat = continued investment in defenses.' },
            { id: 'p6a4', label: 'Take credit on LinkedIn for "saving the company"', isCorrect: false, meta: 'Lessons · OPSEC fail', why: 'Public posts about your incident response give attackers playbook intel + may legally complicate the response.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 3) S3 PII exposure — Cloud breach ★★ Exam (cloud-shared-responsibility canonical)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 's3-pii-exposure',
      title: 'S3 bucket exposure — customer PII leaked',
      icon: '☁️',
      vector: 'cloud',
      difficulty: 2,
      unlockAfter: [],
      summary: 'Researcher reports public S3 bucket containing 2.1M customer records. CloudTrail shows 14 days of unauthorized GETs.',
      context: 'At 11:42, an external security researcher emailed report@corp.com with: "Your S3 bucket s3://corp-customer-archive/ is publicly readable and contains 2.1M customer PII records." CloudTrail review confirms 14 days of GET operations from 11 unique IPs. The bucket was made public by a deploy of new dev tooling 21 days ago via misconfigured CloudFormation template.',
      vertical: 'B2C SaaS',
      severity: 'SEV-1',
      iocs: [
        { type: 'bucket', value: 's3://corp-customer-archive/', label: 'Exposed bucket' },
        { type: 'data', value: '2.1M customer records', label: 'PII volume' },
        { type: 'ip', value: '11 unique source IPs over 14 days', label: 'Unauthorized GET sources' },
        { type: 'cause', value: 'CloudFormation template (deploy 21d ago)', label: 'Initial misconfiguration' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What cloud-readiness mattered?',
          promptStem: 'Cloud breaches succeed when guardrails are weak. Pick the prep that prevented this from being even worse.',
          actions: [
            { id: 'p1a1', label: 'AWS Config rule blocking public-read on PII-tagged buckets (in alert-only mode)', isCorrect: true, meta: 'Preparation · cloud guardrails', why: 'Even in alert-only, this generates the signal. In enforce mode, this would have prevented the breach entirely.' },
            { id: 'p1a2', label: 'CloudTrail enabled in all regions + sent to immutable bucket', isCorrect: true, meta: 'Preparation · audit logging', why: 'CloudTrail is what gives you the 14-day GET history. Without it, you\'re blind to scope.' },
            { id: 'p1a3', label: 'Bug-bounty / responsible-disclosure email monitored', isCorrect: true, meta: 'Preparation · external comms', why: 'The report came from an external researcher. report@corp.com being monitored = early notification.' },
            { id: 'p1a4', label: 'Run a vulnerability scan against the bucket', isCorrect: false, meta: 'Identification · wrong phase', why: 'Scans come during identification.' },
            { id: 'p1a5', label: 'Buy a CASB tool', isCorrect: false, meta: 'Lessons · wrong phase', why: 'Tooling decisions are lessons-learned territory.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm scope + classify breach + start the regulatory clock.',
          promptStem: 'PII exposure has legal consequences (GDPR 72h, state breach laws, SEC 4-day for material). Classify fast.',
          actions: [
            { id: 'p2a1', label: 'CloudTrail review for full GET history on the bucket (last 14 days)', isCorrect: true, meta: 'Identification · scope', why: 'Establishes who accessed, when, what. Critical for breach-disclosure scope.' },
            { id: 'p2a2', label: 'Compare bucket policy + IAM trust against last-known-good (config drift)', isCorrect: true, meta: 'Identification · root cause', why: 'Tells you what changed when. Surfaces the CloudFormation deploy as the root cause.' },
            { id: 'p2a3', label: 'Classify SEV-1 + open breach-counsel + privacy-counsel chatops channel', isCorrect: true, meta: 'Identification · classify + escalate', why: 'PII at this scale = SEV-1. Breach counsel + privacy counsel run in parallel; loop both in immediately.' },
            { id: 'p2a4', label: 'Verify the researcher\'s claim by attempting unauthenticated GET yourself', isCorrect: true, meta: 'Identification · confirm', why: 'Trust-but-verify. Don\'t take the researcher\'s word — confirm with your own test.' },
            { id: 'p2a5', label: 'Make a public statement immediately', isCorrect: false, meta: 'Recovery · wrong phase', why: 'Public comms come AFTER you\'ve scoped + contained. Speaking before you know is its own breach (SEC, customers, partners).' },
            { id: 'p2a6', label: 'Delete CloudTrail logs to "minimize exposure"', isCorrect: false, meta: 'Eradication · destruction of evidence', why: 'Destroying audit logs during a breach = legal nightmare + obstruction risk. Logs are evidence.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 4,
          promptTitle: 'Close the bucket and stop further exposure.',
          promptStem: 'Bucket is confirmed public. 14d of unauthorized GETs already happened. Stop the bleeding.',
          actions: [
            { id: 'p3a1', label: 'Make the bucket private + add explicit deny on s3:GetObject for principal "*"', isCorrect: true, meta: 'Containment · access lockdown', why: 'Belt-and-suspenders. Even if a subsequent IAM grant accidentally re-allows public-read, the explicit deny wins.' },
            { id: 'p3a2', label: 'Enable S3 access logs for the bucket (forward to SIEM)', isCorrect: true, meta: 'Containment · forensic', why: 'Captures any future access attempts, including from the same crew if they pivot. Different from CloudTrail (data-plane vs control-plane).' },
            { id: 'p3a3', label: 'Rotate any access keys / credentials that had read access to the bucket', isCorrect: true, meta: 'Containment · credential', why: 'Even though the breach was "no auth needed," any keys that ALSO had access need rotation in case the attacker exfil\'d via authenticated path too.' },
            { id: 'p3a4', label: 'Notify the security researcher you\'ve received the report + acted', isCorrect: true, meta: 'Containment · external relations', why: 'Maintains researcher goodwill + buys time before they tweet about it. Most researchers give 30-90d responsible-disclosure if you respond fast.' },
            { id: 'p3a5', label: 'Delete the bucket', isCorrect: false, meta: 'Containment · evidence destruction', why: 'Deleting destroys the data you need for breach scope analysis + may violate legal hold. Lock it down, don\'t destroy.' },
            { id: 'p3a6', label: 'Email all customers right now', isCorrect: false, meta: 'Recovery · wrong phase', why: 'Customer notification is regulatory comms, after legal-counsel + breach-counsel sign-off, after scope is verified. Not at containment.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 3,
          promptTitle: 'Make sure no other bucket is misconfigured the same way.',
          promptStem: 'One CF template caused this. Same template may be deployed elsewhere. Sweep.',
          actions: [
            { id: 'p4a1', label: 'Audit all S3 buckets in all AWS accounts for public-read on PII-tagged data', isCorrect: true, meta: 'Eradication · sweep', why: 'Same misconfig may exist elsewhere. AWS Config or scout-suite scan surfaces it.' },
            { id: 'p4a2', label: 'Patch the CloudFormation template that introduced the misconfig + redeploy', isCorrect: true, meta: 'Eradication · root cause', why: 'Without fixing the template, the next deploy reintroduces the issue.' },
            { id: 'p4a3', label: 'Move AWS Config rule from alert-only to enforce', isCorrect: true, meta: 'Eradication · prevention', why: 'Now it blocks the misconfig at deploy time instead of just alerting after the fact.' },
            { id: 'p4a4', label: 'Delete all S3 buckets and start fresh', isCorrect: false, meta: 'Eradication · over-reach', why: 'Legitimate buckets serve real workloads. Targeted fix only.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Customer + regulator notification + service continuity.',
          promptStem: 'Eradication done. Now meet legal disclosure requirements + restore customer trust.',
          actions: [
            { id: 'p5a1', label: 'Notify affected customers within statutory deadline (state-specific)', isCorrect: true, meta: 'Recovery · regulatory', why: 'State breach laws + GDPR 72h require timely notification. Counsel-approved notice template, then send.' },
            { id: 'p5a2', label: 'Offer credit monitoring for affected customers', isCorrect: true, meta: 'Recovery · customer trust', why: 'Standard remediation for PII breach. Buys customer goodwill + may reduce litigation risk.' },
            { id: 'p5a3', label: 'Publish post-incident summary (after counsel sign-off)', isCorrect: true, meta: 'Recovery · transparency', why: 'Public disclosure done well = trust restoration. Done badly = compounded reputational damage. Counsel sign-off matters.' },
            { id: 'p5a4', label: 'Hope the regulators don\'t notice', isCorrect: false, meta: 'Recovery · regulatory failure', why: 'Failure to notify = additional fines, criminal liability for officers, much worse outcome.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'How does the org never have a misconfigured-bucket breach again?',
          promptStem: 'Cloud-shared-responsibility means most config errors are your responsibility, not AWS\'s.',
          actions: [
            { id: 'p6a1', label: 'Mandatory IaC review for any change to bucket policy or IAM trust', isCorrect: true, meta: 'Lessons · process', why: 'Two-person review of IaC catches the misconfig in PR review instead of in production.' },
            { id: 'p6a2', label: 'Add cloud-misconfig drill to quarterly tabletop exercises', isCorrect: true, meta: 'Lessons · practice', why: 'Cloud breaches feel different from endpoint breaches. Practice the cloud-shaped response.' },
            { id: 'p6a3', label: 'Cross-train SOC team on AWS / GCP / Azure incident response', isCorrect: true, meta: 'Lessons · team capability', why: 'Cloud IR requires cloud-specific tooling knowledge. Build the muscle.' },
            { id: 'p6a4', label: 'Blame the developer who wrote the CF template', isCorrect: false, meta: 'Lessons · blame culture', why: 'The system allowed it through PR + deploy + 21 days of monitoring. The developer is one link in a long chain. Fix the system.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 4) Insider exfil — Insider threat ★★★ Real-world (HR + legal complexity)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'insider-exfil',
      title: 'Departing engineer · data exfil via personal cloud',
      icon: '👤',
      vector: 'insider',
      difficulty: 3,
      unlockAfter: ['ryuk-finance'],
      summary: 'DLP flags 4.2 GB upload to personal Dropbox 6h after resignation. HR not notified yet. Legal will be involved.',
      context: 'At 18:47, DLP flagged a 4.2 GB upload from engineer Marcus Lee\'s laptop to a personal dropbox.com account. Marcus submitted resignation at 12:30 today; last day is in 2 weeks. The uploaded data appears to include the source code for the proprietary recommendation engine + customer-clustering analysis. HR has not yet been notified. This intersects with employment law, IP protection, and forensic chain-of-custody.',
      vertical: 'Tech / SaaS',
      severity: 'SEV-2',
      iocs: [
        { type: 'user', value: 'CORP\\mlee (Marcus Lee, Sr Eng)', label: 'Insider' },
        { type: 'data', value: '4.2 GB to dropbox.com', label: 'Exfil destination' },
        { type: 'time', value: 'Resignation 12:30 → upload 18:47', label: 'Suspicious sequence' },
        { type: 'data', value: 'Recommendation engine source + customer clustering', label: 'Exfiltrated content' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What pre-incident readiness mattered?',
          promptStem: 'Insider threat is hard. Pick the prep that gave you visibility + the policy basis to act.',
          actions: [
            { id: 'p1a1', label: 'DLP deployed on endpoints + cloud egress with PII/IP-content tagging', isCorrect: true, meta: 'Preparation · detection', why: 'Without DLP this exfil is invisible. The 4.2 GB Dropbox upload only flagged because DLP fingerprinted the content as proprietary.' },
            { id: 'p1a2', label: 'Acceptable-use policy that explicitly prohibits personal cloud uploads of company data', isCorrect: true, meta: 'Preparation · policy basis', why: 'Without an AUP that prohibits this behaviour, HR + legal may struggle to justify action against the employee.' },
            { id: 'p1a3', label: 'Resignation-trigger workflow with HR + IT + legal sync', isCorrect: true, meta: 'Preparation · process', why: 'Resignation is the highest-risk insider event. Pre-built workflow reduces response time.' },
            { id: 'p1a4', label: 'Block Dropbox at the firewall', isCorrect: false, meta: 'Preparation · over-restriction', why: 'Many legitimate workflows use Dropbox. Blanket block creates more problems. DLP-based content filtering is the right control.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm + classify. This intersects HR + legal + forensics.',
          promptStem: 'Insider IR is unique: you can\'t move alone. HR + legal + forensic chain-of-custody all required.',
          actions: [
            { id: 'p2a1', label: 'Pull DLP event detail + content fingerprint match', isCorrect: true, meta: 'Identification · technical confirm', why: 'Confirms what was uploaded + why DLP flagged it. Foundation for everything that follows.' },
            { id: 'p2a2', label: 'Notify HR + General Counsel before taking any action against the employee', isCorrect: true, meta: 'Identification · cross-functional', why: 'Insider response without HR + legal can violate employment law + destroy the legal case. ALWAYS loop them in first.' },
            { id: 'p2a3', label: 'Preserve forensic image of the laptop with chain-of-custody documentation', isCorrect: true, meta: 'Identification · forensic preservation', why: 'If this becomes a lawsuit or criminal case, forensic chain-of-custody is the evidence backbone.' },
            { id: 'p2a4', label: 'Review last 60 days of Marcus\'s activity for prior exfil patterns', isCorrect: true, meta: 'Identification · scope', why: 'Today\'s 4.2 GB may not be the first event. Look back for smaller transfers that may have been a dry run.' },
            { id: 'p2a5', label: 'Confront Marcus directly via Slack', isCorrect: false, meta: 'Identification · trap', why: 'Direct confrontation without HR + legal violates process + alerts the employee to delete evidence. Never do this alone.' },
            { id: 'p2a6', label: 'Disable Marcus\'s account immediately without coordination', isCorrect: false, meta: 'Containment-flavoured · trap', why: 'Without HR + legal sign-off, account-disable can constitute wrongful action + loses legal options. Coordinate first.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 4,
          promptTitle: 'After HR + legal sign-off, contain access + preserve evidence.',
          promptStem: 'Assume HR + legal are now in the room. Coordinated containment.',
          actions: [
            { id: 'p3a1', label: 'Disable Marcus\'s AD + cloud-IDP account (post HR sign-off)', isCorrect: true, meta: 'Containment · identity', why: 'Stops further data egress. Post-sign-off, this is the right move.' },
            { id: 'p3a2', label: 'Revoke API tokens + SSH keys + cloud credentials Marcus had access to', isCorrect: true, meta: 'Containment · token rotation', why: 'API tokens persist beyond AD disable. Each one needs rotation.' },
            { id: 'p3a3', label: 'Send legal-drafted preservation notice to Dropbox requesting account hold', isCorrect: true, meta: 'Containment · external + legal', why: 'Dropbox may be willing to preserve the account contents pending subpoena. Legal-drafted request maximises chances.' },
            { id: 'p3a4', label: 'Network-isolate Marcus\'s laptop pending forensic image', isCorrect: true, meta: 'Containment · forensic', why: 'Stops further uploads + preserves machine state for forensic image.' },
            { id: 'p3a5', label: 'Wipe Marcus\'s laptop immediately', isCorrect: false, meta: 'Eradication · destroys evidence', why: 'WIPING = destroying the evidence you need for legal + HR action. Forensic image first, wipe never (until legal says so).' },
            { id: 'p3a6', label: 'Have HR call Marcus to "talk it out"', isCorrect: false, meta: 'Containment · trap', why: 'Pre-confrontation tip-off lets the employee delete cloud-side evidence + lawyer-up before you preserve.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 3,
          promptTitle: 'Close the gap that allowed this to happen.',
          promptStem: 'Same hole exists for the next departing engineer. Close it.',
          actions: [
            { id: 'p4a1', label: 'Tighten DLP rules to block (not just alert) on uploads ≥ 100MB to personal cloud', isCorrect: true, meta: 'Eradication · prevention', why: 'Now the next attempt fails at the file-egress moment, not after-the-fact.' },
            { id: 'p4a2', label: 'Auto-trigger DLP elevated-monitoring on all employees who submit resignation', isCorrect: true, meta: 'Eradication · process', why: 'Resignation = highest-risk insider window. Tag + monitor automatically.' },
            { id: 'p4a3', label: 'Update IP-protection language in employment agreements + exit interviews', isCorrect: true, meta: 'Eradication · legal protection', why: 'Tightens the legal basis for action against future incidents.' },
            { id: 'p4a4', label: 'Block ALL personal cloud accounts for ALL employees', isCorrect: false, meta: 'Eradication · over-reach', why: 'Many legitimate workflows. DLP content-filtering achieves the same goal without breaking legitimate work.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Determine business impact + legal posture.',
          promptStem: 'Code is out. Now what?',
          actions: [
            { id: 'p5a1', label: 'Engage IP counsel re: trade-secret protection + potential litigation', isCorrect: true, meta: 'Recovery · legal posture', why: 'Trade-secret status requires you to take "reasonable measures" to protect — your response itself is part of that defense.' },
            { id: 'p5a2', label: 'Audit which customers / projects the leaked data references', isCorrect: true, meta: 'Recovery · contract review', why: 'Customer contracts may have notification requirements re: their data being leaked.' },
            { id: 'p5a3', label: 'Brief execs on potential financial / competitive impact', isCorrect: true, meta: 'Recovery · executive comms', why: 'Execs need to make decisions about disclosure, litigation, customer comms. Brief them with facts.' },
            { id: 'p5a4', label: 'Tell the press', isCorrect: false, meta: 'Recovery · OPSEC fail', why: 'Press disclosure of insider IP theft = compromises legal posture + invites further leaks. Never go to press unilaterally.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Insider-threat lessons.',
          promptStem: 'Insider attacks succeed when monitoring is weak + processes are slow. Close both.',
          actions: [
            { id: 'p6a1', label: 'Build resignation-trigger SOP: HR + IT + legal sync within 24h of notice', isCorrect: true, meta: 'Lessons · process', why: 'Today the workflow was reactive. Make it proactive.' },
            { id: 'p6a2', label: 'Run insider-threat tabletop annually', isCorrect: true, meta: 'Lessons · practice', why: 'Insider IR is uniquely hard. Practice = readiness.' },
            { id: 'p6a3', label: 'Add insider-threat indicators to security-awareness training (mgr-targeted)', isCorrect: true, meta: 'Lessons · training', why: 'Managers see the early signs (resignation-after-disagreement, after-hours-access patterns). Train them.' },
            { id: 'p6a4', label: 'Implement universal employee surveillance', isCorrect: false, meta: 'Lessons · over-reach', why: 'Universal surveillance breaks trust + creates more insider risk than it prevents. Targeted, role-based, signal-based monitoring.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 5) LockBit multi-host — Ransomware ★★★ Real-world (advanced; locked behind ryuk-finance)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'lockbit-multihost',
      title: 'LockBit 3.0 — multi-host, double extortion',
      icon: '🦠',
      vector: 'ransomware',
      difficulty: 3,
      unlockAfter: ['ryuk-finance'],
      summary: '15 hosts encrypted across 3 VLANs. Attacker exfiltrated 380 GB before encryption. Public leak site countdown: 72h.',
      context: 'At 02:14 (overnight), 15 corp hosts across 3 VLANs (engineering, finance, HR) showed simultaneous mass-encryption events with ".lockbit" extensions. EDR forensics show 380 GB exfiltrated to an attacker-controlled MEGA.io account over the previous 6 days via SOCKS proxy. The LockBit leak site posted a countdown: 72h to pay or data goes public. Affected: customer contracts, employee records, source code, M&A docs.',
      vertical: 'Mid-size enterprise',
      severity: 'SEV-1',
      iocs: [
        { type: 'family', value: 'LockBit 3.0', label: 'Ransomware family' },
        { type: 'count', value: '15 hosts across 3 VLANs', label: 'Encryption blast radius' },
        { type: 'data', value: '380 GB to MEGA.io (6-day exfil)', label: 'Pre-encryption exfiltration' },
        { type: 'pressure', value: '72h leak-site countdown', label: 'Double-extortion lever' },
        { type: 'access', value: 'Initial: Citrix CVE-2023-3519 (unpatched VDI)', label: 'Root cause' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 4,
          promptTitle: 'Real-world ransomware: what readiness even matters at this scale?',
          promptStem: '15 hosts encrypted, leak site live, board panicking. Pick the prep that\'s actively saving the response right now.',
          actions: [
            { id: 'p1a1', label: 'Immutable, off-network backups stored 30+ days', isCorrect: true, meta: 'Preparation · 3-2-1 rule', why: 'Without immutable + off-network backups, paying the ransom may be the only option. With them, you\'re negotiating from strength.' },
            { id: 'p1a2', label: 'Cyber-insurance policy with ransomware-specific coverage', isCorrect: true, meta: 'Preparation · risk transfer', why: 'Cyber-insurance funds the response (legal, IR firm, ransom-broker, business interruption). At this scale, irreplaceable.' },
            { id: 'p1a3', label: 'Pre-engaged IR firm on retainer with go-now SLA', isCorrect: true, meta: 'Preparation · vendor', why: 'In-house team is overwhelmed at 15 hosts. Retainer means the IR firm is on-site within 24h, not RFP-shopping in week 2.' },
            { id: 'p1a4', label: 'Tabletop ransomware exercise within last 12 months', isCorrect: true, meta: 'Preparation · practice', why: 'Muscle memory at this scale = response speed. Without it, every decision becomes a debate.' },
            { id: 'p1a5', label: 'Board-level decision on "do we pay?" pre-decided in policy', isCorrect: false, meta: 'Preparation · over-rigid', why: 'Pre-deciding "we never pay" is good policy until it isn\'t. Pre-decided "we always pay" funds future attacks. Decision frameworks matter more than fixed answers.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 5,
          promptTitle: 'Confirm scope + classify SEV-1 + activate full-org response.',
          promptStem: 'This is the highest-severity scenario in the playbook. Mistakes during identification cost millions in dwell-time + business interruption.',
          actions: [
            { id: 'p2a1', label: 'Confirm strain (LockBit 3.0) via ransom note + file-extension fingerprint', isCorrect: true, meta: 'Identification · confirm', why: 'Strain identification drives playbook + decryptor availability + threat-actor profile.' },
            { id: 'p2a2', label: 'Map encryption blast radius via EDR + SMB + network traffic logs', isCorrect: true, meta: 'Identification · scope', why: 'You need to know "what\'s safe" before you can recover. The 15-host count is the start; lateral-spread paths reveal what else is exposed.' },
            { id: 'p2a3', label: 'Identify pre-encryption exfil scope via NetFlow + DLP + cloud egress logs', isCorrect: true, meta: 'Identification · double-extortion', why: 'LockBit\'s leverage isn\'t encryption — it\'s the leak site. Knowing what was exfiltrated before encryption defines the negotiation.' },
            { id: 'p2a4', label: 'Activate cyber-insurance + IR firm + breach counsel within 60 minutes', isCorrect: true, meta: 'Identification · escalate', why: 'Insurance often requires notification-within-hours to maintain coverage. IR firm + counsel run in parallel.' },
            { id: 'p2a5', label: 'Establish out-of-band comms channel (assume corp email is owned)', isCorrect: true, meta: 'Identification · OPSEC', why: 'Attackers often have email access. Use Signal / phone / out-of-band tooling for IR comms during the response.' },
            { id: 'p2a6', label: 'Read the ransom note out loud on the all-hands call', isCorrect: false, meta: 'Identification · OPSEC fail', why: 'Wide distribution of attacker comms = panic + leaks + media risk. Tight need-to-know circle.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 6,
          promptTitle: 'Stop spread + preserve evidence + protect uninfected.',
          promptStem: 'Maximum complexity. 15 hosts, 3 VLANs, ongoing C2, 6-day adversary dwell. Multi-axis containment.',
          trapCallout: {
            title: 'The "isolate everything" trap',
            body: 'When 15 hosts pop, the instinct is "shut down the network." But that breaks every legitimate workflow + tips off the adversary they\'re detected. Surgical containment: isolate the 15 known + sweep for unknowns + cut adversary access (C2, persistence, IAM) without breaking ops. Pace matters: you have hours, not seconds.'
          },
          actions: [
            { id: 'p3a1', label: 'Network-isolate all 15 confirmed-encrypted hosts via EDR', isCorrect: true, meta: 'Containment · primary', why: 'Stops further encryption + C2 callouts on the known-bad set.' },
            { id: 'p3a2', label: 'Block all C2 IPs + domains at perimeter + DNS sinkhole', isCorrect: true, meta: 'Containment · network', why: 'Cuts attacker\'s persistence + lateral-movement infrastructure even on hosts you haven\'t found yet.' },
            { id: 'p3a3', label: 'Disable all compromised user accounts + rotate Kerberos krbtgt password TWICE', isCorrect: true, meta: 'Containment · identity', why: 'krbtgt rotation invalidates golden tickets + persistence. Rotate twice within 10 hours per MSFT guidance.' },
            { id: 'p3a4', label: 'Preserve forensic images of 5 representative encrypted hosts', isCorrect: true, meta: 'Containment · forensic', why: 'Cyber-insurance + IR firm + law enforcement all want forensic image evidence. Preserve before any wiping.' },
            { id: 'p3a5', label: 'Patch the Citrix CVE-2023-3519 root cause across all VDI + perimeter', isCorrect: true, meta: 'Containment · root-cause', why: 'Patching during containment is unusual but here essential — leaving the entry-vector open invites re-entry mid-response.' },
            { id: 'p3a6', label: 'Sweep for additional infected hosts via IOC hunting (file extensions, hashes, mutex, beacon patterns)', isCorrect: true, meta: 'Containment · scope expansion', why: 'The 15-host count is the visible tip. Hunt finds the dormant hosts the attacker hasn\'t encrypted yet.' },
            { id: 'p3a7', label: 'Power off all 15 encrypted hosts immediately', isCorrect: false, meta: 'Eradication-flavoured · destroys evidence', why: 'Power-off destroys volatile evidence on every host. Network-isolate keeps the encryption-time RAM intact for possible decryption-key recovery.' },
            { id: 'p3a8', label: 'Pay the ransom now to stop the leak-site countdown', isCorrect: false, meta: 'Recovery · wrong phase + ethics', why: 'Pay decision belongs to executive + legal + insurance, AFTER scope is known + alternatives evaluated. Never on the IR analyst\'s call.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 4,
          promptTitle: 'Trust restoration across the entire affected estate.',
          promptStem: '6 days of attacker presence. Persistence may exist where you haven\'t looked. Comprehensive cleanup.',
          actions: [
            { id: 'p4a1', label: 'Wipe + reimage all 15 encrypted hosts from clean baseline', isCorrect: true, meta: 'Eradication · trust restore', why: 'Disinfection cannot prove zero residual presence. Wipe + reimage is the only trustworthy path.' },
            { id: 'p4a2', label: 'Hunt for persistence on every other host (scheduled tasks, registry, services, WMI)', isCorrect: true, meta: 'Eradication · sweep', why: '6-day dwell almost always means dormant persistence elsewhere. Hunt before declaring eradication done.' },
            { id: 'p4a3', label: 'Force password reset for ALL employees + rotate ALL service-account creds', isCorrect: true, meta: 'Eradication · credential', why: 'After 6-day dwell, assume credential exposure org-wide. Reset is the only safe baseline.' },
            { id: 'p4a4', label: 'Validate clean state via independent IR firm review', isCorrect: true, meta: 'Eradication · verification', why: 'Independent eyes catch what your team missed. IR firm signs off on "clean" before you re-introduce hosts.' },
            { id: 'p4a5', label: 'Trust your in-house team\'s verification', isCorrect: false, meta: 'Eradication · over-confidence', why: 'In-house team is exhausted + emotionally invested. Independent IR firm verification is the standard for SEV-1.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 4,
          promptTitle: 'Restore operations + decide on ransom + manage public disclosure.',
          promptStem: 'Final stretch. Restoration prioritised by business-criticality. Negotiation in parallel with restoration.',
          actions: [
            { id: 'p5a1', label: 'Restore from immutable off-network backups, hash-verified', isCorrect: true, meta: 'Recovery · clean restore', why: 'The whole reason you have immutable backups is this moment.' },
            { id: 'p5a2', label: 'Stage restoration: tier-1 ops → customer-facing → internal tools', isCorrect: true, meta: 'Recovery · prioritisation', why: 'Restore in priority order. Don\'t bring back the corporate wiki before the customer-facing services.' },
            { id: 'p5a3', label: 'Heightened monitoring for 90 days + threat-hunt cadence weekly', isCorrect: true, meta: 'Recovery · post-incident vigilance', why: 'LockBit affiliates often retry within months. Sustained vigilance.' },
            { id: 'p5a4', label: 'Coordinate disclosure: customers, regulators, employees, partners, public', isCorrect: true, meta: 'Recovery · external comms', why: 'Counsel-led, insurance-coordinated, sequenced. Different stakeholders need different timing + content.' },
            { id: 'p5a5', label: 'Pay the ransom even though you have backups', isCorrect: false, meta: 'Recovery · trap', why: 'If backups work, paying funds the next attack + rewards the crew + risks OFAC sanctions if attribution lands them on the list. Negotiate scope-down only.' },
            { id: 'p5a6', label: 'Hide the breach from customers', isCorrect: false, meta: 'Recovery · regulatory failure', why: 'Required disclosures (state breach laws, GDPR, SEC for material) are mandatory. Hiding compounds the legal damage.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 4,
          promptTitle: 'How does the org never have a SEV-1 ransomware again?',
          promptStem: 'This was preventable. Trace the chain of failures + close every link.',
          actions: [
            { id: 'p6a1', label: 'Mandate patching SLAs: critical CVEs within 48h, high within 14d', isCorrect: true, meta: 'Lessons · process', why: 'CVE-2023-3519 sat unpatched. Hard SLAs + dashboard accountability close that window.' },
            { id: 'p6a2', label: 'Adopt zero-trust segmentation: assume breach, limit blast radius', isCorrect: true, meta: 'Lessons · architecture', why: 'Today\'s 3-VLAN spread succeeded because trust-zone segmentation was weak. ZT principles cap future blast radius.' },
            { id: 'p6a3', label: 'Quarterly ransomware-specific tabletops at exec level', isCorrect: true, meta: 'Lessons · practice', why: 'Exec decisions today happened in panic mode. Practice = better decisions next time.' },
            { id: 'p6a4', label: 'Bug-bounty + external red-team annually', isCorrect: true, meta: 'Lessons · validation', why: 'External eyes find what internal eyes miss. Annual cadence keeps it fresh.' },
            { id: 'p6a5', label: 'Fire the security team', isCorrect: false, meta: 'Lessons · scapegoating', why: 'Security team responded as well as architecture allowed. Firing them loses the institutional knowledge from the incident. Fix the system.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 6) DDoS on web frontend — DDoS ★★ Exam (v4.97.1 Batch 2 expansion)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'ddos-frontend',
      title: 'L7 DDoS on public API — bot army at 50K rps',
      icon: '🌐',
      vector: 'ddos',
      difficulty: 2,
      unlockAfter: [],
      summary: 'Public API getting hammered with 50K req/s from a bot army. Customers complaining. CDN backend pegged.',
      context: 'At 13:18, monitoring alerted on 50,000 requests/second hitting the public-facing API endpoint /api/login (normal baseline: 200 rps). Origin server CPU pinned at 100%. Edge CDN cache miss rate spiked. Customers reporting timeouts on the mobile app. Source IP distribution: 15,000 unique IPs across 47 countries — classic botnet pattern. No clear bot signature in user-agent.',
      vertical: 'B2C SaaS',
      severity: 'SEV-2',
      iocs: [
        { type: 'metric', value: '50,000 rps (250× baseline)', label: 'Request volume' },
        { type: 'endpoint', value: '/api/login', label: 'Targeted endpoint' },
        { type: 'count', value: '15,000 unique source IPs', label: 'Distributed attack' },
        { type: 'geo', value: '47 countries · majority residential ISP', label: 'Botnet character' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What pre-incident DDoS readiness mattered?',
          promptStem: 'DDoS defense is mostly architecture, not response. Pick the prep that\'s saving you right now.',
          actions: [
            { id: 'p1a1', label: 'CDN with anycast + DDoS scrubbing in front of all public endpoints', isCorrect: true, meta: 'Preparation · architecture', why: 'CDN absorbs the attack at edge before it ever reaches origin. Without it, origin would be down already.' },
            { id: 'p1a2', label: 'WAF deployed with managed bot-mitigation rule sets enabled', isCorrect: true, meta: 'Preparation · WAF', why: 'WAF managed-rules catch known botnet signatures + provide rate-limiting primitives.' },
            { id: 'p1a3', label: 'Auto-scaling group on origin tier with CPU-based scale-out triggers', isCorrect: true, meta: 'Preparation · capacity', why: 'Auto-scale gives you headroom while you investigate. Without it, you\'re fighting capacity AND attacker.' },
            { id: 'p1a4', label: 'Buy more bandwidth from ISP', isCorrect: false, meta: 'Preparation · wrong scale', why: 'Bandwidth alone doesn\'t solve L7 attacks (which target application logic, not pipe). And reactive bandwidth-buying is expensive emergency procurement.' },
            { id: 'p1a5', label: 'Notify all customers in advance', isCorrect: false, meta: 'Preparation · wrong action', why: 'You can\'t notify customers about a future attack you don\'t know is coming. This is what monitoring + IR plans handle.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm + classify: is this a real DDoS or a flash crowd?',
          promptStem: 'Rapid classification matters — the response differs. Distinguish DDoS from legit traffic spike.',
          actions: [
            { id: 'p2a1', label: 'Pull source-IP geographic + ASN distribution', isCorrect: true, meta: 'Identification · pattern', why: '15K IPs across 47 countries on residential ISPs = botnet. Flash crowds cluster geographically + ASN-wise.' },
            { id: 'p2a2', label: 'Compare request shape vs. legitimate user behaviour (sessions, cookies, browser fingerprint)', isCorrect: true, meta: 'Identification · behavioural', why: 'Bots usually skip cookie/session establishment. Behaviour analytics surface the anomaly.' },
            { id: 'p2a3', label: 'Check if other endpoints are also affected (scope of attack)', isCorrect: true, meta: 'Identification · scope', why: '/api/login alone vs. all endpoints tells you targeted-credential-stuffing vs. generic outage attack.' },
            { id: 'p2a4', label: 'Open SEV-2 ticket + notify CDN provider + cyber-insurance', isCorrect: true, meta: 'Identification · escalate', why: 'CDN provider may have correlated intel from other tenants. Insurance may have business-interruption clause.' },
            { id: 'p2a5', label: 'Email all customers about an incident', isCorrect: false, meta: 'Identification · wrong phase', why: 'Customer comms come after triage. Without scope + ETA you\'re creating panic without information.' },
            { id: 'p2a6', label: 'Take the API offline immediately', isCorrect: false, meta: 'Containment-flavoured · drastic', why: 'Taking yourself offline = the attacker\'s goal achieved. Defend in place; only kill switch as last resort.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 4,
          promptTitle: 'Defend in place — keep legit users on, block the bots.',
          promptStem: 'Surgical containment. Don\'t kill legitimate users in the panic.',
          trapCallout: {
            title: 'The "block by IP" trap',
            body: 'Manual IP-block lists for botnets that span 15K IPs is a losing game — you can\'t block fast enough, and the IP set rotates. Modern DDoS defense uses behavioural rules + rate-limiting + bot-detection (TLS fingerprinting, browser challenges). Pattern-based defense scales; per-IP defense doesn\'t.'
          },
          actions: [
            { id: 'p3a1', label: 'Enable WAF rate-limiting on /api/login at 5 req/min/IP', isCorrect: true, meta: 'Containment · rate-limit', why: 'Botnet IPs typically each only have 1-3 hits across the campaign. Rate-limit catches the few that hammer one IP.' },
            { id: 'p3a2', label: 'Activate WAF challenge-mode (JS challenge / CAPTCHA) on suspicious traffic', isCorrect: true, meta: 'Containment · challenge', why: 'Challenges separate real browsers from headless bots without breaking real users (worst case: a CAPTCHA).' },
            { id: 'p3a3', label: 'Geo-block the top-3 highest-volume countries if they don\'t match user base', isCorrect: true, meta: 'Containment · geo', why: 'Targeted geo-block reduces volume without affecting most legit users. Only safe if the orgs business is geographically localised.' },
            { id: 'p3a4', label: 'Scale origin auto-scaling group to 3× normal capacity', isCorrect: true, meta: 'Containment · capacity', why: 'Headroom buys you time to tune the WAF rules without origin tipping over.' },
            { id: 'p3a5', label: 'Block all 15,000 source IPs at perimeter firewall', isCorrect: false, meta: 'Containment · wrong tool', why: 'Trap. 15K rules is unmanageable + bot IPs rotate. Behavioural rules at WAF/CDN tier scale; static IP blocks don\'t.' },
            { id: 'p3a6', label: 'Take /api/login offline temporarily', isCorrect: false, meta: 'Containment · drastic', why: 'Login is critical to product function. Killing it achieves the attacker\'s objective without a fight.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 3,
          promptTitle: 'Stop this attack from recurring — block the campaign, not just this round.',
          promptStem: 'Containment slowed the bots. Now make the next round harder.',
          actions: [
            { id: 'p4a1', label: 'Promote temporary WAF rules to permanent + tune false-positive rate', isCorrect: true, meta: 'Eradication · WAF perm', why: 'Temp rules expire. Permanent rules + tuning means the bot pattern is blocked even if attack returns weeks later.' },
            { id: 'p4a2', label: 'Enable account-lockout policies on /api/login (after 5 failed attempts)', isCorrect: true, meta: 'Eradication · auth', why: 'If this was credential-stuffing, lockout slows the brute-force component to near-zero.' },
            { id: 'p4a3', label: 'Subscribe to threat-intel feed + auto-block known botnet IP ranges', isCorrect: true, meta: 'Eradication · TI', why: 'Threat-intel feeds catch new variants of the same campaign + same crew\'s next attack.' },
            { id: 'p4a4', label: 'Disable login entirely', isCorrect: false, meta: 'Eradication · over-reach', why: 'Customers can\'t use the product without login. Wrong knob to turn.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Restore normal operations + monitor for recurrence.',
          promptStem: 'Attack is mitigated. Now wind down the elevated posture safely.',
          actions: [
            { id: 'p5a1', label: 'Gradually scale auto-scaling group back to normal as attack subsides', isCorrect: true, meta: 'Recovery · scale-down', why: 'Sudden scale-down can drop legit users mid-session. Gradual retains buffer for bot resurgence.' },
            { id: 'p5a2', label: 'Heightened monitoring for 48-72 hours post-attack', isCorrect: true, meta: 'Recovery · vigilance', why: 'Botnets often retry the next day — same bots, slightly different patterns.' },
            { id: 'p5a3', label: 'Communicate to customers via status page if there was visible degradation', isCorrect: true, meta: 'Recovery · comms', why: 'Public status-page transparency = trust restoration. Acknowledge, don\'t hide.' },
            { id: 'p5a4', label: 'Disable WAF temp rules immediately', isCorrect: false, meta: 'Recovery · premature', why: 'Bots may retry. Keep rules on for at least a week, then evaluate.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Lessons-learned for the next DDoS.',
          promptStem: 'DDoS is a cost-of-doing-business event for any public-facing service. Plan for next time.',
          actions: [
            { id: 'p6a1', label: 'Run a DDoS tabletop with the team using today\'s attack as the scenario', isCorrect: true, meta: 'Lessons · practice', why: 'Today\'s muscle memory + decision sequence becomes the playbook for next time.' },
            { id: 'p6a2', label: 'Document the WAF rule-set + thresholds that worked for sharing', isCorrect: true, meta: 'Lessons · knowledge', why: 'Operational documentation closes the loop — next person on-call has the playbook.' },
            { id: 'p6a3', label: 'Engage with sector ISAC / DDoS-defence partner about the attack profile', isCorrect: true, meta: 'Lessons · intel', why: 'Same crew may target peer orgs. Sharing the attack profile helps the ecosystem.' },
            { id: 'p6a4', label: 'Brag about defending the attack on social media', isCorrect: false, meta: 'Lessons · OPSEC fail', why: 'Bragging invites round 2. Discreet documentation > public victory laps.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 7) NPM tampered package — Supply chain ★★★ Real-world (v4.97.1)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'npm-supply-chain',
      title: 'Tampered NPM dependency · supply chain compromise',
      icon: '🔗',
      vector: 'supply-chain',
      difficulty: 3,
      unlockAfter: ['ryuk-finance'],
      summary: 'Dependency bot flags new version of a utility lib bundled with credential stealer. Lib used in 12 internal projects.',
      context: 'At 16:42, automated dependency-scanner alerted on `react-utils-extra@2.4.1` (released 18 hours ago) — security researcher published a write-up on the package containing a postinstall script that exfiltrates `~/.aws/credentials`, `~/.npmrc`, and `~/.ssh/*` to a remote endpoint. The original maintainer\'s account was compromised via session-token theft. The package is a transitive dependency in 12 of your internal projects. CI workflows ran `npm install` 47 times in the last 18 hours.',
      vertical: 'Tech / multi-product',
      severity: 'SEV-1',
      iocs: [
        { type: 'package', value: 'react-utils-extra@2.4.1', label: 'Tampered version' },
        { type: 'method', value: 'Compromised maintainer session', label: 'Initial vector' },
        { type: 'data', value: 'AWS creds + npm tokens + SSH keys', label: 'Targeted secrets' },
        { type: 'count', value: '12 internal projects · 47 CI runs in 18h', label: 'Blast radius' },
        { type: 'endpoint', value: 'exfil to https://registry-utils.dev/v', label: 'Lookalike domain' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What supply-chain readiness mattered?',
          promptStem: 'Supply chain attacks target the build pipeline. Pick the prep that gave visibility + restraint.',
          actions: [
            { id: 'p1a1', label: 'SBOM (software bill of materials) generated for every build', isCorrect: true, meta: 'Preparation · SBOM', why: 'Without SBOM, "what versions are deployed where" is unanswerable. With it, scope analysis is minutes not days.' },
            { id: 'p1a2', label: 'Dependency-pinning + lockfile commits enforced via pre-commit hook', isCorrect: true, meta: 'Preparation · pinning', why: 'Pinned versions prevent silent upgrades. Lockfile in git = reproducible builds.' },
            { id: 'p1a3', label: 'Dependency-scanner (Dependabot / Snyk / Socket.dev) on every repo', isCorrect: true, meta: 'Preparation · scanning', why: 'This is what surfaced the tampered package. Without it, the postinstall would have run silently for weeks.' },
            { id: 'p1a4', label: 'Block all NPM packages from external registry', isCorrect: false, meta: 'Preparation · over-restriction', why: 'Modern dev teams need NPM. Internal mirror with vetting (Artifactory, Nexus) is the right control, not blanket-block.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm scope + classify SEV. Secret exposure window matters.',
          promptStem: 'CI ran npm install 47 times. Every run on a CI host had host-level secrets potentially exfiltrated. Scope is critical.',
          actions: [
            { id: 'p2a1', label: 'Pull npm install logs from CI for the affected period to identify hosts', isCorrect: true, meta: 'Identification · log review', why: 'Each CI run = one potential exfil event. Identifies which hosts ran the malicious postinstall.' },
            { id: 'p2a2', label: 'Audit AWS CloudTrail for unusual access from the CI host IPs in the affected window', isCorrect: true, meta: 'Identification · cloud audit', why: 'If AWS creds were exfil\'d, attacker may already be using them. CloudTrail shows the abuse.' },
            { id: 'p2a3', label: 'Open SEV-1 + activate IR firm + breach counsel within 60 minutes', isCorrect: true, meta: 'Identification · escalate', why: 'Supply-chain attack with credential exposure = SEV-1. Speed of escalation = speed of containment.' },
            { id: 'p2a4', label: 'Identify all internal projects that include the tampered package (transitive included)', isCorrect: true, meta: 'Identification · scope', why: 'Direct deps are easy. Transitive deps (where the package was a sub-sub-dep) require SBOM walk. Both must be enumerated.' },
            { id: 'p2a5', label: 'Wait for the package maintainer to publish a fix', isCorrect: false, meta: 'Identification · passive', why: 'You don\'t wait. The maintainer may not even know yet. Active response = preserve credentials, stop the bleed.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 5,
          promptTitle: 'Stop the bleed + revoke everything that was exposed.',
          promptStem: 'Assume every secret on every CI host that ran npm install is compromised. Containment = revocation at scale.',
          actions: [
            { id: 'p3a1', label: 'Pin react-utils-extra to last-known-safe version (2.3.4) across all repos', isCorrect: true, meta: 'Containment · pinning', why: 'Stops the malicious version from being installed in any new build. First action — bleeding stops.' },
            { id: 'p3a2', label: 'Rotate all AWS access keys + IAM credentials touched by affected CI hosts', isCorrect: true, meta: 'Containment · cloud rotation', why: 'Assume exfiltrated. Rotate ALL — any credential on any affected host. CI hosts are blast radius.' },
            { id: 'p3a3', label: 'Rotate all NPM publish tokens across the org', isCorrect: true, meta: 'Containment · npm rotation', why: 'If npm tokens leaked, attacker can publish malicious updates AS YOU. Rotate immediately.' },
            { id: 'p3a4', label: 'Rotate all SSH keys on developer workstations + CI hosts', isCorrect: true, meta: 'Containment · ssh rotation', why: 'SSH keys grant cross-host access. Compromise = pivot risk. Rotate fleet-wide.' },
            { id: 'p3a5', label: 'Block exfil endpoint registry-utils.dev at perimeter DNS', isCorrect: true, meta: 'Containment · network', why: 'Stops any future exfil attempts even if the malicious code somehow runs again.' },
            { id: 'p3a6', label: 'Take all CI hosts offline indefinitely', isCorrect: false, meta: 'Containment · over-reach', why: 'Stops the org from shipping. Targeted rotation + isolation works without breaking everyone.' },
            { id: 'p3a7', label: 'Email the package maintainer angrily', isCorrect: false, meta: 'Containment · wrong action', why: 'The maintainer is also a victim (compromised account). Coordinate with them constructively, not aggressively.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 4,
          promptTitle: 'Make the org supply-chain-attack-resistant going forward.',
          promptStem: 'This will happen again — to a different package. Architecture-level changes.',
          actions: [
            { id: 'p4a1', label: 'Move all NPM dependencies to internal mirror with pre-publish vetting', isCorrect: true, meta: 'Eradication · mirror', why: 'Internal mirror with delayed-publish + scanning catches malicious packages before any project consumes them.' },
            { id: 'p4a2', label: 'Disable NPM postinstall scripts in CI by default (--ignore-scripts)', isCorrect: true, meta: 'Eradication · build hardening', why: 'Postinstall is the most common supply-chain payload vector. Disable by default; enable for known-safe packages only.' },
            { id: 'p4a3', label: 'Implement isolated build environments — no host-credential mounting', isCorrect: true, meta: 'Eradication · isolation', why: 'CI builds shouldn\'t have access to host AWS/npm/SSH credentials. Use ephemeral build credentials only.' },
            { id: 'p4a4', label: 'Adopt secret-scanning + commit-time secret detection', isCorrect: true, meta: 'Eradication · prevention', why: 'Catches accidental commits of secrets so the blast radius is smaller next time something does leak.' },
            { id: 'p4a5', label: 'Stop using NPM entirely — migrate to bundled internal libraries', isCorrect: false, meta: 'Eradication · over-reach', why: 'Modern dev requires NPM. The right control is mirror + vetting, not abandoning the ecosystem.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Resume normal dev velocity with new guardrails.',
          promptStem: 'Eradication done. Get the team back to shipping.',
          actions: [
            { id: 'p5a1', label: 'Communicate to dev team: what happened + what changed + what they need to do', isCorrect: true, meta: 'Recovery · comms', why: 'New guardrails (mirror, --ignore-scripts) require dev workflow changes. Without comms, devs work around them.' },
            { id: 'p5a2', label: 'Audit + restore productivity by un-pinning safe deps + restoring CI velocity', isCorrect: true, meta: 'Recovery · velocity', why: 'Pinning everything is necessary in containment but kills development velocity long-term. Selectively unpin known-safe.' },
            { id: 'p5a3', label: 'Submit case study to internal-eng wiki + sector ISAC', isCorrect: true, meta: 'Recovery · sharing', why: 'Closes the institutional-learning loop + helps peer orgs.' },
            { id: 'p5a4', label: 'Mandate every dev manually review every dep daily', isCorrect: false, meta: 'Recovery · unrealistic', why: 'Doesn\'t scale. Automation + tooling > human review for supply chain.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Long-term: how does the org survive the next supply chain attack?',
          promptStem: 'Supply chain is a 5-year defensive trend. Bake it in.',
          actions: [
            { id: 'p6a1', label: 'Add supply-chain attack to quarterly tabletop scenarios', isCorrect: true, meta: 'Lessons · practice', why: 'Each tabletop builds team intuition. SC attacks are different from endpoint/cloud — practice them specifically.' },
            { id: 'p6a2', label: 'Adopt SLSA framework for build provenance', isCorrect: true, meta: 'Lessons · framework', why: 'SLSA (Supply-chain Levels for Software Artifacts) is the maturity model. Adoption gives you a level-up roadmap.' },
            { id: 'p6a3', label: 'Sign + verify all internal builds (Sigstore / cosign)', isCorrect: true, meta: 'Lessons · attestation', why: 'Build attestation prevents downstream attacks where attacker swaps your binary for theirs.' },
            { id: 'p6a4', label: 'Forbid all open-source dependencies', isCorrect: false, meta: 'Lessons · over-reach', why: 'Open-source is foundational to modern software. The answer is supply-chain hygiene, not avoidance.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 8) AWS root key on GitHub — Cloud breach ★★ Exam (v4.97.1)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'aws-key-leak',
      title: 'AWS root access key leaked on public GitHub',
      icon: '☁️',
      vector: 'cloud',
      difficulty: 2,
      unlockAfter: [],
      summary: 'Bug-bounty researcher reports root account AWS_SECRET_ACCESS_KEY committed to a public repo 6 days ago.',
      context: 'At 10:14, security@corp.com received: "Your AWS root account access key is committed in https://github.com/corp/internal-tools/commit/abc123 — 6 days ago. Crypto miner spinning up 50 c5.18xlarge instances in your account in eu-central-1 right now. Bill projection: $14,000/day at this rate." CloudTrail confirms: 50 EC2 RunInstances calls in eu-central-1 from a non-corporate IP in the last 4 hours.',
      vertical: 'B2C SaaS',
      severity: 'SEV-1',
      iocs: [
        { type: 'creds', value: 'AKIA**********ROOT', label: 'Leaked AWS root access key' },
        { type: 'commit', value: 'github.com/corp/internal-tools/commit/abc123 (6d ago)', label: 'Source of leak' },
        { type: 'abuse', value: '50 × c5.18xlarge in eu-central-1', label: 'Crypto-mining cluster' },
        { type: 'cost', value: '$14,000/day projected', label: 'Financial impact' },
        { type: 'ip', value: 'Non-corp source IP for RunInstances calls', label: 'Attacker access' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What pre-incident readiness matters?',
          promptStem: 'Cloud-credential leaks are mostly preventable. Pick the prep that matters most.',
          actions: [
            { id: 'p1a1', label: 'GitHub secret scanning enabled on all repos (catches accidental commits)', isCorrect: true, meta: 'Preparation · scanning', why: 'Pre-commit secret scanning is the single highest-yield control. Catches the leak before it ever pushes.' },
            { id: 'p1a2', label: 'AWS root account locked with hardware MFA + no programmatic access keys', isCorrect: true, meta: 'Preparation · root hygiene', why: 'AWS\'s own #1 recommendation. Root account should never have access keys. The fact that this leak exists means this control wasn\'t in place.' },
            { id: 'p1a3', label: 'AWS Cost Anomaly Detection + budget alerts enabled', isCorrect: true, meta: 'Preparation · cost', why: 'Cost spike alert is what catches abuse-of-leaked-creds. Without it, you\'d find out at end-of-month billing.' },
            { id: 'p1a4', label: 'Block all internet access to AWS console', isCorrect: false, meta: 'Preparation · impractical', why: 'Cloud admin requires console access. The right control is MFA + IP allowlist, not blanket-block.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm scope quickly — money is leaving the building.',
          promptStem: 'Crypto miner is running. $580/hour burn rate. Identify scope rapidly so eradication can start.',
          actions: [
            { id: 'p2a1', label: 'CloudTrail review: enumerate every API call made with the leaked key in last 6 days', isCorrect: true, meta: 'Identification · audit', why: 'Establishes full abuse scope: what was created, what was accessed, what was modified. Foundation for cleanup.' },
            { id: 'p2a2', label: 'IAM Access Advisor / GuardDuty review for unusual access patterns', isCorrect: true, meta: 'Identification · enrichment', why: 'GuardDuty surfaces anomalies (impossible-travel, new-tool usage). Confirms abuse + characterises attacker.' },
            { id: 'p2a3', label: 'Identify the GitHub commit author + git history of the leaked file', isCorrect: true, meta: 'Identification · root cause', why: 'Determines who accidentally committed it + whether they have other secrets in commit history.' },
            { id: 'p2a4', label: 'Open SEV-1 + activate cyber-insurance + cloud-IR partner', isCorrect: true, meta: 'Identification · escalate', why: 'Active financial loss = SEV-1. Insurance often covers cloud-fraud expenses. Partner accelerates response.' },
            { id: 'p2a5', label: 'Make the GitHub repo private', isCorrect: false, meta: 'Identification · pointless', why: 'Trap. The credential is already on GitHub Archive, archive.org, search-engine caches, and possibly threat-actor databases. Private-toggling doesn\'t un-leak it. The credential is permanently compromised — focus on rotation.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 4,
          promptTitle: 'Revoke the credential + stop the bleed.',
          promptStem: 'Every minute = $9.66 of crypto-mining cost. Revoke fast.',
          actions: [
            { id: 'p3a1', label: 'Deactivate + delete the leaked AWS root access key immediately', isCorrect: true, meta: 'Containment · revocation', why: 'Stops the attacker\'s active access. Single most important action.' },
            { id: 'p3a2', label: 'Terminate all unauthorized resources (50 c5.18xlarge instances) in eu-central-1', isCorrect: true, meta: 'Containment · resource cleanup', why: 'Terminates the active crypto-miner + stops the bill from growing.' },
            { id: 'p3a3', label: 'Audit IAM for any new IAM users / access keys created by the attacker', isCorrect: true, meta: 'Containment · persistence check', why: 'Attackers often create persistence (new IAM users, new access keys) before doing visible bad things. Find + revoke them.' },
            { id: 'p3a4', label: 'Rotate ALL AWS access keys + IAM user passwords in the account', isCorrect: true, meta: 'Containment · full rotation', why: 'Assume any cred touched by the leaked key is also compromised. Full rotation closes that door.' },
            { id: 'p3a5', label: 'Just rotate the one leaked key', isCorrect: false, meta: 'Containment · partial', why: 'If the attacker had time to create persistence, rotating one key doesn\'t help. Full audit + rotation.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 4,
          promptTitle: 'Close the door on AWS-root-key-leak forever.',
          promptStem: 'This was preventable. Make sure it can\'t recur.',
          actions: [
            { id: 'p4a1', label: 'Lock the AWS root account: hardware MFA + remove all programmatic access keys', isCorrect: true, meta: 'Eradication · root hygiene', why: 'AWS root should never have access keys. Programmatic access goes through IAM users / SSO / roles.' },
            { id: 'p4a2', label: 'Migrate all programmatic access to IAM-Roles-for-EC2 or AWS SSO + role assumption', isCorrect: true, meta: 'Eradication · architecture', why: 'Role-based access has built-in expiration + scoped permissions. Long-lived access keys go away.' },
            { id: 'p4a3', label: 'Enable GitHub secret scanning push-protection org-wide', isCorrect: true, meta: 'Eradication · prevention', why: 'Push-protection rejects commits containing secrets at git-push time. Stops the leak before it\'s public.' },
            { id: 'p4a4', label: 'Implement AWS-IAM-permission-boundary on all IAM users (block IAM admin actions for non-admins)', isCorrect: true, meta: 'Eradication · IAM', why: 'Even if a non-admin user\'s creds leak, they can\'t create new admin users or escalate.' },
            { id: 'p4a5', label: 'Stop using AWS', isCorrect: false, meta: 'Eradication · over-reach', why: 'Cloud is core infrastructure. The fix is hygiene + architecture, not migration.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Restore normal operations + handle financial fallout.',
          promptStem: 'The bleed is stopped. Now the bill arrives.',
          actions: [
            { id: 'p5a1', label: 'Open AWS support case + request fraud charges credit', isCorrect: true, meta: 'Recovery · financial', why: 'AWS often credits documented fraudulent charges. Don\'t pay $14K just because the attacker spent it.' },
            { id: 'p5a2', label: 'Verify all production workloads still running correctly post-rotation', isCorrect: true, meta: 'Recovery · validation', why: 'Mass rotation can break legit services. Validate everything still works.' },
            { id: 'p5a3', label: 'Re-enable normal IAM workflows with new guardrails active', isCorrect: true, meta: 'Recovery · ops', why: 'Get the team back to productive work with the new architecture in place.' },
            { id: 'p5a4', label: 'Pay the $14K bill silently and move on', isCorrect: false, meta: 'Recovery · waste', why: 'AWS has a fraud-charge process. Use it.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Lessons-learned: cloud credential hygiene.',
          promptStem: 'Cloud credentials are the new attack surface. Bake the controls in.',
          actions: [
            { id: 'p6a1', label: 'Add credential-leak scenario to dev onboarding training', isCorrect: true, meta: 'Lessons · training', why: 'Most leaks are accidental commits by new devs. Onboarding training prevents the next one.' },
            { id: 'p6a2', label: 'Document this incident in internal eng wiki with anonymized details', isCorrect: true, meta: 'Lessons · documentation', why: 'Other engineers learn from real incident stories. Keeps the lesson alive.' },
            { id: 'p6a3', label: 'Quarterly audit of every IAM user + access key with usage age + last-used', isCorrect: true, meta: 'Lessons · governance', why: 'Stale credentials accumulate. Quarterly audits catch them.' },
            { id: 'p6a4', label: 'Fire the engineer who committed the key', isCorrect: false, meta: 'Lessons · blame culture', why: 'Engineer made an honest mistake. The system allowed it (no scanning, no push-protection). Fix the system.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 9) Spear phish → ransomware multi-stage — Phish-derived ★★★ (v4.97.1, locked)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'spear-to-ransomware',
      title: 'Spear phish → 3-week dwell → ransomware activation',
      icon: '🎣',
      vector: 'phish-derived',
      difficulty: 3,
      unlockAfter: ['bec-wire-fraud'],
      summary: 'Engineering laptop encrypted today. Forensics show attacker has been pivoting since a spear phish 3 weeks ago.',
      context: 'At 08:14, three engineering workstations encrypted simultaneously with .lockit extension. Initial EDR forensics show the attacker was inside since 21 days ago — a spear-phish on Jane (lead engineer) gave them initial access; they then created a service account, pivoted to the engineering CI/CD system, harvested credentials over 19 days, dumped the AD database 4 days ago, and triggered encryption today. Dwell-time: 21 days. The ransomware is the visible part of a much longer attack.',
      vertical: 'Tech / SaaS',
      severity: 'SEV-1',
      iocs: [
        { type: 'dwell', value: '21 days from phish to encryption', label: 'Initial-access window' },
        { type: 'access', value: 'Spear phish · Outlook macro to lead eng', label: 'Initial vector' },
        { type: 'persistence', value: 'svc_eng_ops (created day 2)', label: 'Attacker service account' },
        { type: 'pivot', value: 'CI/CD system + AD DC', label: 'Lateral targets' },
        { type: 'exfil', value: '180 GB before encryption', label: 'Pre-encryption theft' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What pre-incident readiness mattered (or failed) here?',
          promptStem: '21-day dwell means detection failed. Pick the prep that should have caught this earlier.',
          actions: [
            { id: 'p1a1', label: 'EDR on all endpoints with behavioural anomaly detection enabled', isCorrect: true, meta: 'Preparation · detection', why: 'Behavioural anomaly detection should have flagged the post-exploitation: PowerShell + persistence creation + CI access. Why it didn\'t = the question to investigate.' },
            { id: 'p1a2', label: 'Privileged-access workstations + just-in-time elevation for admin tasks', isCorrect: true, meta: 'Preparation · PAW', why: 'PAW + JIT prevents domain admin creds from being on regular endpoints — the technique attacker used.' },
            { id: 'p1a3', label: 'Quarterly purple-team exercises (red + blue together)', isCorrect: true, meta: 'Preparation · validation', why: 'Purple-teaming is what identifies the gaps in detection. Annual frequency is too slow.' },
            { id: 'p1a4', label: 'Patch all systems daily', isCorrect: false, meta: 'Preparation · misaligned', why: 'Patching is important but doesn\'t prevent phish-driven malware execution by the user. Different attack class.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 5,
          promptTitle: 'Scope is bigger than the visible ransomware. Find the dwell.',
          promptStem: 'Today\'s ransomware is the LAST step of a 21-day attack. Identification = uncovering the full timeline.',
          actions: [
            { id: 'p2a1', label: 'Pull EDR + endpoint logs back 30 days for the affected hosts', isCorrect: true, meta: 'Identification · timeline', why: 'Builds the full attack timeline. Surfaces the spear-phish + initial execution + persistence creation.' },
            { id: 'p2a2', label: 'Audit AD for new accounts created in last 30 days + their activity', isCorrect: true, meta: 'Identification · persistence hunt', why: 'svc_eng_ops account was created day 2. Audit catches it + similar persistence elsewhere.' },
            { id: 'p2a3', label: 'Review CI/CD audit logs + secret-access patterns last 30 days', isCorrect: true, meta: 'Identification · pivot tracking', why: 'CI/CD compromise = secrets harvest. Identifies which secrets were touched.' },
            { id: 'p2a4', label: 'Check egress logs for unusual data transfers in last 30 days', isCorrect: true, meta: 'Identification · exfil scope', why: '180 GB exfil happened over weeks. Egress logs reveal what was stolen + where it went.' },
            { id: 'p2a5', label: 'Open SEV-1 + IR firm + breach counsel + cyber insurance within 60 minutes', isCorrect: true, meta: 'Identification · escalate', why: 'Multi-stage ransomware with confirmed exfil = SEV-1. Speed matters.' },
            { id: 'p2a6', label: 'Treat this as just-the-ransomware (skip the dwell investigation)', isCorrect: false, meta: 'Identification · trap', why: 'Trap. If you just clean the ransomware, the attacker still has persistence + 180 GB of data. The full attack must be uncovered.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 5,
          promptTitle: 'Cut off the attacker — fully + everywhere.',
          promptStem: 'Multi-stage attack = multi-axis containment. Endpoints, accounts, CI/CD, AD, network.',
          actions: [
            { id: 'p3a1', label: 'Network-isolate the 3 encrypted hosts via EDR (preserve memory)', isCorrect: true, meta: 'Containment · endpoint', why: 'Standard containment. Isolate without power-off; capture RAM for forensics.' },
            { id: 'p3a2', label: 'Disable + delete attacker-created service accounts (svc_eng_ops + similar)', isCorrect: true, meta: 'Containment · identity', why: 'Removes persistence. Without this, attacker walks back in tomorrow.' },
            { id: 'p3a3', label: 'Force password reset for ALL employees (assume creds harvested)', isCorrect: true, meta: 'Containment · scale rotation', why: '21-day dwell + AD dump = assume every credential is exposed. Org-wide reset is the only safe baseline.' },
            { id: 'p3a4', label: 'Rotate krbtgt password TWICE (10h apart) to invalidate golden tickets', isCorrect: true, meta: 'Containment · Kerberos', why: 'AD dump = attacker has krbtgt hash = golden ticket potential. Double-rotate kills any in-flight tickets.' },
            { id: 'p3a5', label: 'Isolate CI/CD system from network until clean', isCorrect: true, meta: 'Containment · build pipeline', why: 'CI/CD compromise risk is high. Quarantine until forensic review confirms clean.' },
            { id: 'p3a6', label: 'Restore from yesterday\'s backup', isCorrect: false, meta: 'Containment · trap', why: 'Yesterday\'s backup may include the persistence (created 21d ago). Recovery from pre-day-2 backup is the only safe option, AND only AFTER eradication.' },
            { id: 'p3a7', label: 'Power off all 3 encrypted hosts immediately', isCorrect: false, meta: 'Containment · destroys evidence', why: 'Same trap as ryuk-finance. RAM dump first.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 4,
          promptTitle: 'Eradicate the 21-day-deep attacker presence.',
          promptStem: 'Long dwell = persistence everywhere. Comprehensive cleanup is mandatory.',
          actions: [
            { id: 'p4a1', label: 'Wipe + reimage every host the attacker touched (per CloudTrail / EDR / log evidence)', isCorrect: true, meta: 'Eradication · trust restore', why: 'You can never trust a host that was attacker-controlled. Wipe + reimage from clean.' },
            { id: 'p4a2', label: 'Hunt for ALL persistence patterns across the fleet (scheduled tasks, registry, services, WMI, GPO)', isCorrect: true, meta: 'Eradication · sweep', why: '21-day attacker had time to drop persistence in many places. Hunt fleet-wide.' },
            { id: 'p4a3', label: 'Validate clean state via independent IR firm review', isCorrect: true, meta: 'Eradication · external validation', why: 'In-house team can\'t verify itself. Independent IR firm signs off "we found everything."' },
            { id: 'p4a4', label: 'Patch the spear-phish initial-access vector (block Outlook macros + add user training)', isCorrect: true, meta: 'Eradication · root cause', why: 'Macro-exploit was the entry. Closing it stops the next attempt at entry-1.' },
            { id: 'p4a5', label: 'Just patch the affected hosts', isCorrect: false, meta: 'Eradication · half-measure', why: 'Persistence is fleet-wide. Affected-only is incomplete.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 4,
          promptTitle: 'Restore + monitor + handle the data-breach side.',
          promptStem: '180 GB exfiltration is its own data-breach incident. Manage in parallel with technical recovery.',
          actions: [
            { id: 'p5a1', label: 'Restore from immutable backups taken before day 2 (pre-attacker)', isCorrect: true, meta: 'Recovery · clean restore', why: 'Pre-attacker backups are the only verifiable-clean source. Hash-verify before restore.' },
            { id: 'p5a2', label: 'Heightened monitoring for 90+ days post-incident', isCorrect: true, meta: 'Recovery · vigilance', why: 'Long-dwell attackers often retry within months. Sustained monitoring catches the comeback.' },
            { id: 'p5a3', label: 'Coordinate disclosure: customers, regulators, employees per data-breach scope', isCorrect: true, meta: 'Recovery · regulatory', why: '180 GB exfil triggers GDPR / state breach laws / SEC depending on data. Counsel-led disclosure.' },
            { id: 'p5a4', label: 'Threat-hunt for similar TTPs across peer customers / partners', isCorrect: true, meta: 'Recovery · ecosystem', why: 'Same crew may target peers. Threat hunt with shared TTPs helps everyone.' },
            { id: 'p5a5', label: 'Skip data-breach disclosure to avoid bad press', isCorrect: false, meta: 'Recovery · regulatory failure', why: 'Failure-to-disclose is illegal in many jurisdictions. Disclose properly = controlled narrative; hide = much worse outcome when caught.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Lessons-learned: 21-day dwell-time means detection failed.',
          promptStem: 'The visible ransomware was the symptom. The detection gap is the disease.',
          actions: [
            { id: 'p6a1', label: 'Audit detection coverage: where did the 21d dwell happen + what should have caught it?', isCorrect: true, meta: 'Lessons · detection audit', why: 'Each missed signal is a detection-engineering opportunity. Document each + plan fixes.' },
            { id: 'p6a2', label: 'Implement dwell-time-reduction goals (target: <7 days mean dwell next year)', isCorrect: true, meta: 'Lessons · KPI', why: 'You manage what you measure. Dwell-time KPI drives detection investment.' },
            { id: 'p6a3', label: 'Adopt zero-trust + just-in-time access to limit blast radius next time', isCorrect: true, meta: 'Lessons · architecture', why: 'Even if attacker gets in, ZT + JIT cap how far they can pivot before being detected.' },
            { id: 'p6a4', label: 'Stop using email entirely', isCorrect: false, meta: 'Lessons · over-reach', why: 'Email is core to business. Defenses + training are the answer, not abandonment.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 10) Container escape on k8s — Cloud breach ★★★ Real-world (v4.97.1, locked)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'k8s-container-escape',
      title: 'Container escape → cluster compromise · k8s production',
      icon: '☁️',
      vector: 'cloud',
      difficulty: 3,
      unlockAfter: ['s3-pii-exposure'],
      summary: 'Privileged pod exploited. Attacker on the node. Cluster control plane access likely. 28 production services at risk.',
      context: 'At 14:32, GuardDuty fired on unusual API calls to k8s-apiserver from a worker node IP. Investigation: a customer-facing image-resize pod was running with hostPath mount + privileged: true. Attacker exploited a known image library CVE to break out of the container, gained host-level access, then accessed the kubelet credentials and pivoted to the API server. 28 production services run on this cluster. Service-account tokens for those services are stored on the compromised node.',
      vertical: 'B2C SaaS',
      severity: 'SEV-1',
      iocs: [
        { type: 'pod', value: 'image-resize-7c8b9 (privileged + hostPath)', label: 'Initial entry pod' },
        { type: 'cve', value: 'CVE-2024-NNNN (image library RCE)', label: 'Exploited vuln' },
        { type: 'node', value: 'worker-node-04', label: 'Compromised node' },
        { type: 'kubelet', value: 'Kubelet creds extracted', label: 'Persistence vector' },
        { type: 'scope', value: '28 production services on cluster', label: 'Blast radius' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What pre-incident k8s readiness mattered?',
          promptStem: 'Container security has many layers. Pick the prep that should have prevented this — and the one that\'s saving you now.',
          actions: [
            { id: 'p1a1', label: 'Pod Security Admission policies blocking privileged + hostPath pods by default', isCorrect: true, meta: 'Preparation · admission', why: 'PSA at restricted level would have blocked the privileged pod from ever scheduling. Without it, devs deploy pods that violate every defense-in-depth principle.' },
            { id: 'p1a2', label: 'Network policies enforcing pod-to-pod + pod-to-API-server segmentation', isCorrect: true, meta: 'Preparation · network', why: 'Without network policies, every pod can reach kube-apiserver. With them, only specific pods can — limiting blast radius.' },
            { id: 'p1a3', label: 'Image-scanning at build time + admission-time (block known-vulnerable)', isCorrect: true, meta: 'Preparation · image', why: 'Known CVE in the image library should have been caught at build OR admission. Both layers should have blocked.' },
            { id: 'p1a4', label: 'Run all pods as root', isCorrect: false, meta: 'Preparation · anti-pattern', why: 'Opposite of best practice. Pods should run as non-root with read-only filesystems.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm scope quickly — control plane compromise has cluster-wide implications.',
          promptStem: '28 services on this cluster. Attacker may have already pivoted. Speed matters.',
          actions: [
            { id: 'p2a1', label: 'Pull k8s audit logs + node-level logs for last 6 hours', isCorrect: true, meta: 'Identification · audit', why: 'Audit logs reveal what API calls were made + by whom. Foundation for scope analysis.' },
            { id: 'p2a2', label: 'Enumerate every service-account on the compromised node + their token usage', isCorrect: true, meta: 'Identification · scope', why: '28 services have SA tokens. Each one needs assessment for "did the attacker steal + use this token?"' },
            { id: 'p2a3', label: 'Check for new pods, deployments, or RBAC bindings created in last 6 hours', isCorrect: true, meta: 'Identification · persistence', why: 'Attackers often create persistence (rogue pods, RBAC for backdoor SAs). Find them now.' },
            { id: 'p2a4', label: 'Open SEV-1 + activate cloud-IR + breach counsel within 60 minutes', isCorrect: true, meta: 'Identification · escalate', why: 'Cluster-level compromise = SEV-1. Cloud-IR specialists needed.' },
            { id: 'p2a5', label: 'Reboot the entire cluster', isCorrect: false, meta: 'Containment · destructive + premature', why: 'Reboot before scope is known = lose the evidence + may not eradicate persistent threats.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 5,
          promptTitle: 'Surgical containment of compromised node + apiserver access.',
          promptStem: 'Multi-axis containment. Node, identity, network, RBAC.',
          actions: [
            { id: 'p3a1', label: 'Cordon + drain the compromised node (worker-node-04) — terminate it after evidence capture', isCorrect: true, meta: 'Containment · node', why: 'Cordon prevents new pods from scheduling. Drain moves running pods. Termination after capture removes the foothold.' },
            { id: 'p3a2', label: 'Rotate kubelet certificates for all nodes in the cluster', isCorrect: true, meta: 'Containment · kubelet', why: 'Kubelet creds give node-level access. Rotation invalidates the stolen cred.' },
            { id: 'p3a3', label: 'Revoke + rotate all service-account tokens on the compromised node', isCorrect: true, meta: 'Containment · SA tokens', why: 'SA tokens grant pod-level access. Each one was potentially stolen + needs rotation.' },
            { id: 'p3a4', label: 'Audit + rotate any cloud IAM roles linked to the compromised node (IRSA / Workload Identity)', isCorrect: true, meta: 'Containment · cloud IAM', why: 'Modern k8s uses cloud-IAM-via-SA-tokens. Compromised SA tokens may have granted cloud access.' },
            { id: 'p3a5', label: 'Enable network policies blocking pod-to-apiserver from non-essential namespaces', isCorrect: true, meta: 'Containment · segmentation', why: 'Stops further lateral pod-to-apiserver attacks while you investigate.' },
            { id: 'p3a6', label: 'Delete every pod in the cluster', isCorrect: false, meta: 'Containment · over-reach', why: 'Kills 28 production services. Surgical cleanup, not nuke-from-orbit.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 4,
          promptTitle: 'Trust restoration + close the door.',
          promptStem: 'Compromised cluster needs systematic verification + architectural fixes.',
          actions: [
            { id: 'p4a1', label: 'Rebuild the compromised node from clean image + reattach to cluster', isCorrect: true, meta: 'Eradication · trust restore', why: 'Wipe + reimage. Node-level compromise can\'t be cleaned in place.' },
            { id: 'p4a2', label: 'Patch the image library CVE in all images using it (rebuild + redeploy)', isCorrect: true, meta: 'Eradication · vuln close', why: 'Same CVE will be re-exploited otherwise. Find every image using the lib + rebuild.' },
            { id: 'p4a3', label: 'Enforce Pod Security Admission at restricted level cluster-wide', isCorrect: true, meta: 'Eradication · architecture', why: 'PSA-restricted blocks privileged pods, hostPath, hostNetwork. Architectural fix that prevents recurrence.' },
            { id: 'p4a4', label: 'Implement runtime security (Falco / Tetragon) for behavioral detection', isCorrect: true, meta: 'Eradication · runtime defense', why: 'Even if attacker breaks in again, runtime security catches container-escape attempts.' },
            { id: 'p4a5', label: 'Stop using k8s', isCorrect: false, meta: 'Eradication · over-reach', why: 'k8s is the platform. The fix is hardening, not migration.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Restore production safely + validate everything works.',
          promptStem: '28 services need to come back up cleanly.',
          actions: [
            { id: 'p5a1', label: 'Bring services back up gradually + verify each behaves normally', isCorrect: true, meta: 'Recovery · staged', why: 'Mass-up = mass-fail. One at a time + validate.' },
            { id: 'p5a2', label: 'Validate cloud IAM still works correctly after rotation (smoke tests)', isCorrect: true, meta: 'Recovery · IAM validation', why: 'Mass IAM rotation can break legit services. Smoke-test catches regressions.' },
            { id: 'p5a3', label: 'Heightened k8s monitoring for 30 days post-incident', isCorrect: true, meta: 'Recovery · vigilance', why: 'Sophisticated attackers often retry. Monitoring for the comeback.' },
            { id: 'p5a4', label: 'Take all services offline indefinitely', isCorrect: false, meta: 'Recovery · over-reach', why: 'Customers can\'t use the product. Bring back gradually.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'How does the org never have a container-escape again?',
          promptStem: 'Cloud-native security is its own discipline. Build the muscle.',
          actions: [
            { id: 'p6a1', label: 'Hire / contract a k8s-security specialist for a 90-day hardening engagement', isCorrect: true, meta: 'Lessons · expertise', why: 'k8s security has steep learning curve. Specialist closes gaps faster than generalist team.' },
            { id: 'p6a2', label: 'Add k8s-specific scenarios to quarterly tabletop exercises', isCorrect: true, meta: 'Lessons · practice', why: 'k8s incidents differ from VM/host incidents. Practice them specifically.' },
            { id: 'p6a3', label: 'Adopt CIS Kubernetes Benchmark + run kube-bench monthly', isCorrect: true, meta: 'Lessons · governance', why: 'CIS Benchmark is the maturity model. Monthly scans surface drift.' },
            { id: 'p6a4', label: 'Migrate everything off Kubernetes to bare metal', isCorrect: false, meta: 'Lessons · over-reach', why: 'k8s is the standard. The answer is harden it, not abandon it.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 11) MFA bombing → account takeover (v4.97.2 Batch 3)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'mfa-bombing',
      title: 'MFA push-fatigue → admin account takeover',
      icon: '📱',
      vector: 'phish-derived',
      difficulty: 2,
      unlockAfter: ['bec-wire-fraud'],
      summary: 'Admin user approved a malicious MFA push at 02:47am after 14 spam attempts. Attacker now has corp VPN access.',
      context: 'At 02:47, a senior admin received their 14th MFA push notification of the night and tapped "Approve" while half-asleep. SIEM logged 14 prior denials over 90 min from a non-corp IP attempting to log in to the corp SSO. The attacker now has valid SSO + VPN access. Forensics shows lateral movement attempts to AD + file servers in the last 30 minutes.',
      vertical: 'Tech / SaaS',
      severity: 'SEV-1',
      iocs: [
        { type: 'auth', value: '14 MFA push attempts then 1 approval', label: 'MFA-bombing pattern' },
        { type: 'user', value: 'CORP\\admin_jchen', label: 'Compromised admin' },
        { type: 'ip', value: 'Non-corp source IP (Russia ASN)', label: 'Attacker source' },
        { type: 'access', value: 'SSO + VPN session active', label: 'Current attacker access' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What pre-incident readiness mattered?',
          promptStem: 'MFA bombing succeeds when push-approval is the only factor. Pick the prep that should have caught it.',
          actions: [
            { id: 'p1a1', label: 'Number-matching MFA (typing a 2-digit code instead of "Approve")', isCorrect: true, meta: 'Preparation · MFA hardening', why: 'Number-matching defeats fatigue — you can\'t mistakenly tap "Approve" if you have to type a code that came from the legit login screen.' },
            { id: 'p1a2', label: 'Conditional-access policy: block logins from non-corp IPs without enhanced MFA', isCorrect: true, meta: 'Preparation · CA', why: 'Risk-based CA blocks the suspicious-source-IP login before MFA even fires. Defense-in-depth.' },
            { id: 'p1a3', label: 'User awareness training on MFA-fatigue attacks', isCorrect: true, meta: 'Preparation · training', why: 'Trained users decline unprompted pushes + report patterns. Untrained users tap to make notifications stop.' },
            { id: 'p1a4', label: 'Disable MFA entirely', isCorrect: false, meta: 'Preparation · anti-pattern', why: 'No MFA = vastly easier compromise. Better MFA, not no MFA.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm + scope the compromise.',
          promptStem: 'Admin approved a malicious MFA. Attacker has SSO + VPN. What\'s already compromised?',
          actions: [
            { id: 'p2a1', label: 'Pull SSO + VPN session logs for the compromised account in last 60 min', isCorrect: true, meta: 'Identification · session', why: 'Establishes what the attacker has touched since the approval — services accessed, downloads, lateral attempts.' },
            { id: 'p2a2', label: 'Pull SIEM auth-failure logs to confirm MFA bombing pattern', isCorrect: true, meta: 'Identification · pattern', why: 'Confirms it was MFA bombing (not normal login). 14 fails + 1 approve in 90 min is the signature.' },
            { id: 'p2a3', label: 'Check AD + file-server audit logs for lateral movement attempts', isCorrect: true, meta: 'Identification · scope', why: 'Admin account = high blast radius. Check the obvious next-targets.' },
            { id: 'p2a4', label: 'Open SEV-1 + alert IR team + breach counsel', isCorrect: true, meta: 'Identification · escalate', why: 'Active admin compromise = SEV-1. Team mobilises immediately.' },
            { id: 'p2a5', label: 'Wait until morning to investigate', isCorrect: false, meta: 'Identification · trap', why: 'Active session = active damage. Every minute the attacker is in is more compromise.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 4,
          promptTitle: 'Cut the attacker off — fast.',
          promptStem: 'Admin SSO + VPN session is live. Multi-axis containment.',
          actions: [
            { id: 'p3a1', label: 'Force logout admin from SSO + VPN + revoke all active session tokens', isCorrect: true, meta: 'Containment · session kill', why: 'Stops the attacker\'s active access. Most important first action.' },
            { id: 'p3a2', label: 'Reset admin password + MFA re-enrolment + lockout pending review', isCorrect: true, meta: 'Containment · identity', why: 'Prevents re-entry with stolen credential. Lockout stops the legit admin from re-using it until cleared.' },
            { id: 'p3a3', label: 'Review + revoke any privileged-access elevations granted in last 60 min', isCorrect: true, meta: 'Containment · privilege', why: 'Attacker may have requested privilege elevations during the session. Revoke them.' },
            { id: 'p3a4', label: 'Block source IP at perimeter + add to threat-intel watchlist', isCorrect: true, meta: 'Containment · network', why: 'Stops re-attempts from same IP + alerts on similar IPs.' },
            { id: 'p3a5', label: 'Disable MFA on the admin account so they can re-authenticate quickly', isCorrect: false, meta: 'Containment · anti-pattern', why: 'Removes the only remaining defense. Re-enrol MFA (with number-matching), don\'t disable.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 3,
          promptTitle: 'Close the MFA-bombing window.',
          promptStem: 'This worked because of MFA-fatigue. Architectural fix.',
          actions: [
            { id: 'p4a1', label: 'Roll out number-matching MFA org-wide (replace push-approval)', isCorrect: true, meta: 'Eradication · architecture', why: 'Number-matching defeats fatigue + bombing. The single highest-yield fix.' },
            { id: 'p4a2', label: 'Tighten conditional-access: require step-up MFA for non-corp IPs', isCorrect: true, meta: 'Eradication · CA', why: 'Risk-based step-up MFA = defense-in-depth. Suspicious-IP logins need more proof.' },
            { id: 'p4a3', label: 'Add MFA-fatigue scenario to all admin training', isCorrect: true, meta: 'Eradication · training', why: 'Admins are highest-value targets. Specific training on MFA-bombing helps them refuse the next attempt.' },
            { id: 'p4a4', label: 'Disable VPN + SSO entirely', isCorrect: false, meta: 'Eradication · over-reach', why: 'Legit work depends on these. Hardening, not removal.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Restore admin access safely.',
          promptStem: 'Eradication done. Admin needs to get back to work — but cleanly.',
          actions: [
            { id: 'p5a1', label: 'Re-enrol admin in MFA (number-matching) + restore access via verified channel', isCorrect: true, meta: 'Recovery · re-enrol', why: 'Verified re-enrol via in-person or known-secure channel ensures it\'s the real admin.' },
            { id: 'p5a2', label: 'Audit + validate all systems admin had access to (no attacker persistence)', isCorrect: true, meta: 'Recovery · validation', why: 'Confirm no backdoors, no new accounts, no GPO changes from the attacker session.' },
            { id: 'p5a3', label: 'Heightened monitoring on admin account + similar profiles for 30 days', isCorrect: true, meta: 'Recovery · vigilance', why: 'Same crew may try again with different admin. Monitoring for the comeback.' },
            { id: 'p5a4', label: 'Just give admin temporary access without re-MFA', isCorrect: false, meta: 'Recovery · sloppy', why: 'Defeats the purpose of the response. Re-enrol cleanly.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'MFA-bombing lessons.',
          promptStem: 'MFA was a feature, not a finished product. Maturity matters.',
          actions: [
            { id: 'p6a1', label: 'Document this incident as a why-we-need-number-matching case study', isCorrect: true, meta: 'Lessons · documentation', why: 'Real incident stories are how budget gets approved + skeptics get convinced. Document.' },
            { id: 'p6a2', label: 'Add MFA-bombing simulation to quarterly red-team exercises', isCorrect: true, meta: 'Lessons · practice', why: 'Simulated attacks keep the muscle memory fresh.' },
            { id: 'p6a3', label: 'Review + tighten conditional-access policies fleet-wide', isCorrect: true, meta: 'Lessons · architecture', why: 'CA is the layer above MFA. Tighter CA = fewer cases where MFA is the last line.' },
            { id: 'p6a4', label: 'Punish the admin for approving the push', isCorrect: false, meta: 'Lessons · blame culture', why: '14 push notifications at 2am = the system failed the admin, not the other way around. Fix the system.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 12) DNS registrar hijack (v4.97.2)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'dns-registrar-hijack',
      title: 'DNS registrar hijack → MX record swap → email interception',
      icon: '🌐',
      vector: 'cloud',
      difficulty: 3,
      unlockAfter: ['aws-key-leak'],
      summary: 'Attacker compromised the registrar account. Changed MX records 4 hours ago. Customer emails were intercepted.',
      context: 'At 09:14, customers reported password-reset emails not arriving. Investigation: registrar (GoDaddy) account was compromised at 05:00 — attacker changed corp.com MX records to point to attacker-controlled mail servers. 4 hours of email (~2,400 messages) was intercepted, including password resets, invoice copies, and partner contracts. Registrar account had no MFA + the attacker reset the password using a leaked admin email + security-question-guess.',
      vertical: 'B2C SaaS',
      severity: 'SEV-1',
      iocs: [
        { type: 'registrar', value: 'GoDaddy account corp-domains', label: 'Compromised registrar' },
        { type: 'mx', value: 'corp.com MX → mail.evil-redirect.io', label: 'Modified MX records' },
        { type: 'data', value: '~2,400 emails intercepted (4h window)', label: 'Compromised email volume' },
        { type: 'access', value: 'Registrar admin password reset via security questions', label: 'Initial vector' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What registrar/DNS readiness should have been in place?',
          promptStem: 'Registrar accounts are the foundation. Pick the prep that would have prevented this.',
          actions: [
            { id: 'p1a1', label: 'Hardware MFA on the registrar account (not just SMS)', isCorrect: true, meta: 'Preparation · registrar', why: 'Hardware MFA defeats credential-reset attacks via security questions. SMS MFA is bypassable; hardware is not.' },
            { id: 'p1a2', label: 'Registry lock / domain transfer lock enabled', isCorrect: true, meta: 'Preparation · registry lock', why: 'Registry lock prevents registrar-side changes without manual provider verification. Critical for high-value domains.' },
            { id: 'p1a3', label: 'DNS change monitoring (DNSSEC + external monitoring service)', isCorrect: true, meta: 'Preparation · monitoring', why: 'Surfaces unauthorised DNS changes within minutes — would have caught the MX swap immediately.' },
            { id: 'p1a4', label: 'Use multiple registrars for redundancy', isCorrect: false, meta: 'Preparation · misaligned', why: 'Multiple registrars = multiple attack surfaces. Single registrar with strong controls is better.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm scope of email interception + compromise.',
          promptStem: 'MX was wrong for 4 hours. Identify what was intercepted + classify regulatory exposure.',
          actions: [
            { id: 'p2a1', label: 'Pull mail-server logs to identify all emails routed via the malicious MX', isCorrect: true, meta: 'Identification · scope', why: 'Tells you exactly which emails went where + by sender/recipient. Foundation for breach scope.' },
            { id: 'p2a2', label: 'Audit registrar account login history + change logs', isCorrect: true, meta: 'Identification · root cause', why: 'Establishes how + when the registrar account was compromised. Critical for closing the door.' },
            { id: 'p2a3', label: 'Identify customer-facing emails affected (password resets, invoices, account changes)', isCorrect: true, meta: 'Identification · regulatory', why: 'Customer-facing email interception triggers breach notification laws. Scope = notification scope.' },
            { id: 'p2a4', label: 'Open SEV-1 + breach counsel + customer comms team', isCorrect: true, meta: 'Identification · escalate', why: '4-hour customer email exposure = SEV-1 with regulatory implications.' },
            { id: 'p2a5', label: 'Skip the email scope analysis to save time', isCorrect: false, meta: 'Identification · regulatory failure', why: 'Without scope, breach notifications can\'t be tailored. Required by GDPR / state laws.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 4,
          promptTitle: 'Restore correct DNS + lock down the registrar.',
          promptStem: 'Get DNS back to authoritative + prevent re-compromise.',
          actions: [
            { id: 'p3a1', label: 'Revert MX records to authoritative values via registrar emergency channel', isCorrect: true, meta: 'Containment · DNS restore', why: 'Stops the email interception ASAP. Use registrar\'s emergency support if normal access is locked.' },
            { id: 'p3a2', label: 'Lock the registrar account: hardware MFA + change all admin passwords', isCorrect: true, meta: 'Containment · registrar', why: 'Prevents the attacker from re-changing DNS while you investigate.' },
            { id: 'p3a3', label: 'Enable registry lock at the TLD registry level', isCorrect: true, meta: 'Containment · TLD', why: 'TLD-level lock requires manual registry verification for changes. Defense-in-depth.' },
            { id: 'p3a4', label: 'Force password reset for any account that received password-reset emails during the 4h window', isCorrect: true, meta: 'Containment · downstream', why: 'Attacker may have used intercepted reset links to take over customer accounts. Force reset assumes worst case.' },
            { id: 'p3a5', label: 'Migrate to a different registrar immediately', isCorrect: false, meta: 'Containment · panic', why: 'Migration during incident = increased risk + downtime. Stay + harden, migrate later if needed.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 3,
          promptTitle: 'Make registrar compromise impossible going forward.',
          promptStem: 'Architecture-level fix.',
          actions: [
            { id: 'p4a1', label: 'Mandatory hardware MFA on all registrar admin accounts', isCorrect: true, meta: 'Eradication · MFA', why: 'Hardware MFA defeats security-question-bypass + phishing. Standard for high-value accounts.' },
            { id: 'p4a2', label: 'Enable DNSSEC for the corp.com domain', isCorrect: true, meta: 'Eradication · DNSSEC', why: 'DNSSEC prevents DNS spoofing + makes future hijacks harder to use successfully.' },
            { id: 'p4a3', label: 'Implement DMARC + SPF + DKIM at strict policies', isCorrect: true, meta: 'Eradication · email', why: 'Even if MX is hijacked again, strict email auth makes the intercepted-emails-replay attack harder to monetise.' },
            { id: 'p4a4', label: 'Stop using DNS', isCorrect: false, meta: 'Eradication · over-reach', why: 'DNS is foundational. Hardening, not abandonment.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Customer + regulatory disclosure + email re-validation.',
          promptStem: 'Email content is leaked. Manage the regulatory + trust fallout.',
          actions: [
            { id: 'p5a1', label: 'Notify affected customers within statutory deadline + offer reset assistance', isCorrect: true, meta: 'Recovery · regulatory', why: 'Required by breach laws + restores customer trust through transparency.' },
            { id: 'p5a2', label: 'Validate email auth records (SPF/DKIM/DMARC) + monitor for spoofing campaigns', isCorrect: true, meta: 'Recovery · email auth', why: 'Attacker may use intercepted emails to craft convincing follow-on phishing. Tighten auth + monitor.' },
            { id: 'p5a3', label: 'Public post-incident summary (counsel-approved)', isCorrect: true, meta: 'Recovery · transparency', why: 'Public disclosure done well restores trust. Hidden = much worse outcome when discovered.' },
            { id: 'p5a4', label: 'Hide the breach from customers', isCorrect: false, meta: 'Recovery · regulatory failure', why: 'Failure to disclose breaks GDPR / state laws + makes legal outcome much worse.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Registrar lessons.',
          promptStem: 'Registrar accounts are tier-zero infrastructure. Treat accordingly.',
          actions: [
            { id: 'p6a1', label: 'Add registrar account to "tier-zero" inventory + audit quarterly', isCorrect: true, meta: 'Lessons · inventory', why: 'Tier-zero = highest privilege, audited frequently, hardest controls. Registrar belongs there.' },
            { id: 'p6a2', label: 'Document registrar incident + share with sector ISAC', isCorrect: true, meta: 'Lessons · sharing', why: 'DNS/registrar attacks affect peer orgs. Shared TTPs help everyone.' },
            { id: 'p6a3', label: 'Add registrar-compromise scenario to quarterly tabletop', isCorrect: true, meta: 'Lessons · practice', why: 'Different shape from typical IR — practice it specifically.' },
            { id: 'p6a4', label: 'Move all corp infrastructure to a single cloud provider', isCorrect: false, meta: 'Lessons · misaligned', why: 'Doesn\'t address the registrar issue. Single-provider lock-in has its own problems.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 13) Stolen laptop with FDE disabled (v4.97.2)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'stolen-laptop',
      title: 'Stolen laptop · full-disk encryption was disabled',
      icon: '💻',
      vector: 'insider',
      difficulty: 2,
      unlockAfter: [],
      summary: 'Engineer\'s laptop stolen at airport. FDE was disabled by user override 6 months ago. Cached creds + source code at risk.',
      context: 'At 14:22, engineer Alex emailed IT: "My laptop was stolen at LAX airport." MDM check reveals BitLocker was suspended via local-admin override 6 months ago by the user (during a Windows update issue) and never re-enabled. The laptop has cached AD credentials, SSH keys for production, an active VPN cert, and a clone of the main monorepo. No password on the BIOS. The laptop will likely be powered on by the thief.',
      vertical: 'Tech / SaaS',
      severity: 'SEV-2',
      iocs: [
        { type: 'asset', value: 'Dell XPS 15 · S/N FXY8923B', label: 'Stolen device' },
        { type: 'fde', value: 'BitLocker DISABLED (user-suspended 6mo ago)', label: 'Encryption status' },
        { type: 'creds', value: 'Cached AD + SSH + VPN cert', label: 'On-device credentials' },
        { type: 'data', value: 'Full monorepo clone (~12GB source)', label: 'On-device data' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What pre-incident readiness mattered (or failed)?',
          promptStem: 'Stolen-laptop response is mostly architectural prep. Pick the prep that should have prevented this from being a SEV-2.',
          actions: [
            { id: 'p1a1', label: 'BitLocker enforced via Group Policy + cannot be disabled by users', isCorrect: true, meta: 'Preparation · FDE policy', why: 'Hard-enforced FDE prevents user override entirely. Without this control, the device is plaintext now.' },
            { id: 'p1a2', label: 'MDM (Intune / Jamf) on every device with remote-wipe capability', isCorrect: true, meta: 'Preparation · MDM', why: 'MDM remote-wipe is the single most effective post-theft control. Without it, you can\'t wipe.' },
            { id: 'p1a3', label: 'Conditional access blocking VPN cert from non-MDM-checked-in devices', isCorrect: true, meta: 'Preparation · CA', why: 'Even if VPN cert is on the laptop, CA blocks unverified machines from establishing the tunnel.' },
            { id: 'p1a4', label: 'GPS tracking on every device', isCorrect: false, meta: 'Preparation · privacy', why: 'GPS tracking on employee devices is a privacy risk + most thieves remove SIM/disable WiFi. MDM remote-wipe is better than tracking.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm + classify the exposure.',
          promptStem: 'Need to scope: what credentials + data are at risk + what was the user doing?',
          actions: [
            { id: 'p2a1', label: 'Pull MDM check-in history + last-known location', isCorrect: true, meta: 'Identification · device', why: 'Establishes whether MDM has remote-wipe access + last-seen network details for forensics.' },
            { id: 'p2a2', label: 'Audit what credentials + data were on the device per asset register', isCorrect: true, meta: 'Identification · scope', why: 'Determines blast radius. Cached creds, SSH keys, VPN cert, source clone — each one becomes a containment task.' },
            { id: 'p2a3', label: 'File police report for the theft + cite asset serial number', isCorrect: true, meta: 'Identification · legal', why: 'Required for cyber-insurance + creates official record for any subsequent legal action.' },
            { id: 'p2a4', label: 'Open SEV-2 ticket + notify CISO + start scribe log', isCorrect: true, meta: 'Identification · classify', why: 'FDE-disabled stolen device with creds = SEV-2. Mobilises the response.' },
            { id: 'p2a5', label: 'Wait to see if the laptop is returned', isCorrect: false, meta: 'Identification · trap', why: '99% of stolen laptops aren\'t returned. Treat as compromised from minute zero.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 5,
          promptTitle: 'Revoke everything on the device — fast.',
          promptStem: 'Assume the device will be powered on + all on-device creds will be extracted.',
          actions: [
            { id: 'p3a1', label: 'Issue MDM remote-wipe command to the device (best-effort + logged)', isCorrect: true, meta: 'Containment · device wipe', why: 'If device comes online, it wipes. Even if it never comes online, the attempt is logged for compliance.' },
            { id: 'p3a2', label: 'Disable Alex\'s AD account + force re-auth across active sessions', isCorrect: true, meta: 'Containment · AD', why: 'Cached AD creds can be used offline against captured Kerberos / NTLM hashes. Disabling stops re-auth.' },
            { id: 'p3a3', label: 'Revoke all SSH keys associated with Alex (rotate corp-side authorized_keys)', isCorrect: true, meta: 'Containment · SSH', why: 'SSH keys grant cross-host access. Revoke at the corp side so the stolen private key is useless.' },
            { id: 'p3a4', label: 'Revoke VPN certificate via PKI; add to certificate revocation list', isCorrect: true, meta: 'Containment · VPN', why: 'Stops the laptop from establishing VPN even if it boots up + connects.' },
            { id: 'p3a5', label: 'Audit recent git activity on the monorepo from Alex\'s account', isCorrect: true, meta: 'Containment · code', why: 'If attacker gets in to git via cached creds, they may push malicious commits. Audit + watch.' },
            { id: 'p3a6', label: 'Hope the laptop battery dies before the thief boots it', isCorrect: false, meta: 'Containment · negligence', why: 'Trap. Hoping is not a control. Active revocation of every credential is the only path.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 3,
          promptTitle: 'Close the FDE-bypass + cred-on-device gaps.',
          promptStem: 'Same situation must not happen with the next stolen device.',
          actions: [
            { id: 'p4a1', label: 'Re-enable BitLocker enforcement org-wide + audit FDE status on all devices', isCorrect: true, meta: 'Eradication · FDE', why: 'The user-suspend was the root cause. Hard enforcement + audit catches all currently-non-compliant devices.' },
            { id: 'p4a2', label: 'Move SSH keys + VPN certs to hardware keys (YubiKey) where possible', isCorrect: true, meta: 'Eradication · hardware token', why: 'Hardware-token-bound creds can\'t be extracted from stolen devices. Architectural defense.' },
            { id: 'p4a3', label: 'Deploy MDM check-in compliance check before granting corp resources access', isCorrect: true, meta: 'Eradication · MDM enforcement', why: 'CA + MDM-compliance ensures lost devices can\'t access corp resources after MDM is removed.' },
            { id: 'p4a4', label: 'Remove laptops from all employees', isCorrect: false, meta: 'Eradication · over-reach', why: 'Engineers need laptops. Hardening, not removal.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Restore Alex to productivity + close out the ticket.',
          promptStem: 'New laptop + restored access + insurance handling.',
          actions: [
            { id: 'p5a1', label: 'Issue replacement laptop with FDE pre-enforced + verify before deployment', isCorrect: true, meta: 'Recovery · device', why: 'Alex needs to work. Pre-verified FDE prevents recurrence on the new device.' },
            { id: 'p5a2', label: 'Re-enrol Alex with new SSH keys + VPN cert (after MFA-verified identity check)', isCorrect: true, meta: 'Recovery · re-enrol', why: 'Identity verification before re-enrol ensures it\'s the real Alex (not the thief).' },
            { id: 'p5a3', label: 'Submit cyber-insurance claim + police report + asset write-off', isCorrect: true, meta: 'Recovery · financial', why: 'Insurance recovers laptop cost. Police report is required for the claim.' },
            { id: 'p5a4', label: 'Make Alex pay for the replacement laptop', isCorrect: false, meta: 'Recovery · blame', why: 'The user-suspend was a failure of policy enforcement, not malicious intent. Hostile.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Lessons-learned.',
          promptStem: 'Endpoint security gaps + user-bypass-able controls.',
          actions: [
            { id: 'p6a1', label: 'Document this as the case for hard-enforced FDE in the next exec briefing', isCorrect: true, meta: 'Lessons · advocacy', why: 'Real incidents get budget approved. Use this as the case for enforcement-only controls.' },
            { id: 'p6a2', label: 'Audit all "user-can-disable" security controls + escalate or remove', isCorrect: true, meta: 'Lessons · audit', why: 'Any control a user can disable will get disabled by some user. Find them all + harden.' },
            { id: 'p6a3', label: 'Add stolen-device drill to quarterly IR tabletop', isCorrect: true, meta: 'Lessons · practice', why: 'Stolen-device IR has unique components (MDM, PKI, AD). Practice them.' },
            { id: 'p6a4', label: 'Track Alex via GPS in case the laptop is recovered', isCorrect: false, meta: 'Lessons · privacy violation', why: 'Tracking employees is a privacy + legal nightmare. Police handle stolen property.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 14) Third-party SaaS breach (v4.97.2, locked behind npm-supply-chain)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'saas-vendor-breach',
      title: 'Third-party SaaS provider breached · downstream impact',
      icon: '🔗',
      vector: 'supply-chain',
      difficulty: 3,
      unlockAfter: ['npm-supply-chain'],
      summary: 'Your CRM vendor disclosed a breach. Customer + sales-pipeline data possibly exposed. You need to respond as if breached.',
      context: 'At 11:08, your CRM vendor "PipelineCRM" emailed CISOs about a breach: "Attacker gained read access to a subset of customer data via OAuth token theft on May 1-3. Affected customers being notified individually." 90 minutes later, PipelineCRM confirmed your tenant\'s data WAS in the affected scope: customer contacts (75K), sales pipeline values (~$240M ARR data), email exchanges with prospects, 4 OAuth tokens that have access to your other apps. The vendor is your responsibility, but the data is yours.',
      vertical: 'B2B SaaS',
      severity: 'SEV-2',
      iocs: [
        { type: 'vendor', value: 'PipelineCRM (3rd-party SaaS)', label: 'Breached provider' },
        { type: 'window', value: 'May 1-3 (3 days)', label: 'Exposure window' },
        { type: 'data', value: '75K customer contacts + $240M pipeline data', label: 'Your data exposed' },
        { type: 'tokens', value: '4 OAuth tokens (Slack, Gmail, Calendar, Salesforce)', label: 'Cross-app risk' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What vendor-risk readiness mattered?',
          promptStem: 'You can\'t prevent vendor breaches. You can prepare for them.',
          actions: [
            { id: 'p1a1', label: 'Vendor risk assessment (SOC2 + pen-test review) at vendor-onboarding + annually', isCorrect: true, meta: 'Preparation · vendor risk', why: 'Establishes baseline + identifies lower-maturity vendors. Higher-risk vendors get more granular monitoring.' },
            { id: 'p1a2', label: 'Data inventory per vendor (what data, what scope, what tokens)', isCorrect: true, meta: 'Preparation · inventory', why: 'When breach happens, you need to know in 5 minutes what was exposed. Inventory enables that.' },
            { id: 'p1a3', label: 'Contractual breach-notification clauses (vendor must notify within X hours)', isCorrect: true, meta: 'Preparation · contract', why: 'Legal SLA on breach notification = early warning + legal lever if vendor delays.' },
            { id: 'p1a4', label: 'Avoid using third-party SaaS entirely', isCorrect: false, meta: 'Preparation · over-reach', why: 'Modern business runs on SaaS. The right answer is vendor risk management, not avoidance.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Verify vendor claim + identify your specific exposure.',
          promptStem: 'Trust but verify. Vendor disclosure is the start, not the end of your investigation.',
          actions: [
            { id: 'p2a1', label: 'Request detailed breach report from vendor (data accessed, attacker capabilities, IOCs)', isCorrect: true, meta: 'Identification · vendor coord', why: 'Generic disclosure isn\'t enough. Specific IOCs help your downstream investigation.' },
            { id: 'p2a2', label: 'Audit vendor API logs from your tenant for the breach window', isCorrect: true, meta: 'Identification · own audit', why: 'Vendor logs may show what was accessed FROM YOUR account specifically.' },
            { id: 'p2a3', label: 'Identify which OAuth tokens vendor has into your other apps + scope of access', isCorrect: true, meta: 'Identification · cross-app', why: 'OAuth tokens granted to vendor mean attacker may have lateral access to your other apps.' },
            { id: 'p2a4', label: 'Open SEV-2 + activate vendor-management + breach counsel', isCorrect: true, meta: 'Identification · escalate', why: '75K customers + $240M data exposure = SEV-2. Vendor management + counsel coordinate response.' },
            { id: 'p2a5', label: 'Trust the vendor\'s disclosure and skip your own investigation', isCorrect: false, meta: 'Identification · negligence', why: 'Vendor breach disclosures are often incomplete. Your customers\' data is your responsibility.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 4,
          promptTitle: 'Limit downstream damage — revoke + isolate.',
          promptStem: 'You can\'t un-breach the vendor, but you can stop the cross-app spread.',
          actions: [
            { id: 'p3a1', label: 'Revoke + rotate all 4 OAuth tokens vendor had to your other apps', isCorrect: true, meta: 'Containment · token rotation', why: 'OAuth tokens grant cross-app access. Revoke prevents attacker pivoting from CRM to Slack/Gmail/Calendar/SFDC.' },
            { id: 'p3a2', label: 'Audit those apps for unusual access from vendor IPs in the breach window', isCorrect: true, meta: 'Containment · cross-app audit', why: 'Validate whether attacker actually pivoted via the OAuth tokens. Logs in each app surface this.' },
            { id: 'p3a3', label: 'Pause new data shares with vendor until they confirm remediation', isCorrect: true, meta: 'Containment · vendor pause', why: 'Don\'t add more data to a still-actively-investigating breach.' },
            { id: 'p3a4', label: 'Notify customers whose data was specifically exposed (per regulation)', isCorrect: true, meta: 'Containment · downstream', why: 'Required by GDPR + state laws. Counsel-led, vendor-coordinated comms.' },
            { id: 'p3a5', label: 'Take down all your products to prevent further damage', isCorrect: false, meta: 'Containment · over-reach', why: 'Your products are not breached. Vendor is. Targeted response.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 3,
          promptTitle: 'Reduce future vendor-breach blast radius.',
          promptStem: 'Architecture-level fix to vendor risk.',
          actions: [
            { id: 'p4a1', label: 'Adopt least-privilege OAuth scopes — revisit every vendor integration', isCorrect: true, meta: 'Eradication · scope', why: 'Tighter scopes = smaller blast radius when vendor is compromised. Frequently neglected at integration time.' },
            { id: 'p4a2', label: 'Add OAuth-token rotation on a schedule (not just on incident)', isCorrect: true, meta: 'Eradication · rotation', why: 'Routine rotation reduces window of token utility for any future leak.' },
            { id: 'p4a3', label: 'Require ongoing SOC2 + breach disclosure clauses from all vendors', isCorrect: true, meta: 'Eradication · contract', why: 'Codify vendor accountability + ongoing monitoring as part of contract.' },
            { id: 'p4a4', label: 'Replace vendor immediately', isCorrect: false, meta: 'Eradication · panic', why: 'Mid-incident vendor migration = increased risk. Evaluate post-incident with a clearer head.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Customer trust recovery + regulatory disclosure.',
          promptStem: 'Vendor breached you, but customers see YOUR brand.',
          actions: [
            { id: 'p5a1', label: 'Notify all affected customers per regulatory deadline + offer remediation (credit monitoring etc.)', isCorrect: true, meta: 'Recovery · regulatory', why: 'Required by breach laws. Customer trust restoration starts here.' },
            { id: 'p5a2', label: 'Public statement clarifying that this was a vendor breach + your response', isCorrect: true, meta: 'Recovery · transparency', why: 'Customers want to know it wasn\'t YOU + that you took action. Counsel-led statement.' },
            { id: 'p5a3', label: 'Coordinate with vendor on joint customer communication', isCorrect: true, meta: 'Recovery · coordination', why: 'Joint message reduces customer confusion + presents unified response.' },
            { id: 'p5a4', label: 'Blame the vendor publicly', isCorrect: false, meta: 'Recovery · OPSEC fail', why: 'Public blame games look defensive + don\'t help customers. Coordinated response is professional.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Vendor-risk lessons.',
          promptStem: 'Third-party risk is a permanent reality. Build the muscle.',
          actions: [
            { id: 'p6a1', label: 'Categorise vendors by risk tier + apply graduated controls', isCorrect: true, meta: 'Lessons · vendor mgmt', why: 'High-data vendors get tighter controls + monitoring than low-data ones. Graduated approach scales.' },
            { id: 'p6a2', label: 'Conduct vendor-breach tabletops annually', isCorrect: true, meta: 'Lessons · practice', why: 'Different shape from internal IR. Practice the vendor-coord aspect specifically.' },
            { id: 'p6a3', label: 'Establish a "trust score" + monitoring for each vendor', isCorrect: true, meta: 'Lessons · governance', why: 'Quarterly trust score + breach intelligence keeps vendor risk visible to leadership.' },
            { id: 'p6a4', label: 'Build everything in-house to avoid vendor risk', isCorrect: false, meta: 'Lessons · misaligned', why: 'In-house has its own security risk + opportunity cost. Manage vendor risk, don\'t avoid it.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 15) AD golden ticket (v4.97.2, locked behind ryuk-finance)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'golden-ticket',
      title: 'AD golden ticket attack · domain-wide persistence',
      icon: '🎫',
      vector: 'insider',
      difficulty: 3,
      unlockAfter: ['ryuk-finance'],
      summary: 'EDR flagged anomalous Kerberos activity. Attacker has the krbtgt hash. Forging tickets cluster-wide with admin permissions.',
      context: 'At 18:42, EDR + the SIEM Kerberos analytics flagged a cascade of unusual TGT requests — accounts logging in to systems they\'ve never touched, with privilege levels they shouldn\'t have. Investigation: the attacker dumped the krbtgt hash 3 days ago via DCSync attack. They\'ve been forging Kerberos tickets to impersonate any user in the domain at will, including domain admins. The blast radius is the entire AD forest.',
      vertical: 'Mid-size enterprise',
      severity: 'SEV-1',
      iocs: [
        { type: 'attack', value: 'Golden ticket (forged Kerberos TGT)', label: 'Attack technique' },
        { type: 'access', value: 'krbtgt hash extracted via DCSync (3 days ago)', label: 'Initial vector' },
        { type: 'scope', value: 'Entire AD forest', label: 'Blast radius' },
        { type: 'detection', value: 'Anomalous TGT request patterns from EDR + SIEM', label: 'Detection signal' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What AD-readiness mattered?',
          promptStem: 'Golden tickets succeed when AD hygiene is weak. Pick the prep that mattered (or didn\'t).',
          actions: [
            { id: 'p1a1', label: 'Tier 0 admin separation — domain admins use dedicated workstations only', isCorrect: true, meta: 'Preparation · tier 0', why: 'Tier-0 isolation prevents domain admin creds from being on regular workstations where they can be dumped.' },
            { id: 'p1a2', label: 'Routine krbtgt password rotation (twice per year minimum)', isCorrect: true, meta: 'Preparation · rotation', why: 'Routine rotation invalidates older golden tickets. Without it, an attacker with old krbtgt has indefinite persistence.' },
            { id: 'p1a3', label: 'EDR + SIEM Kerberos analytics for anomalous TGT patterns', isCorrect: true, meta: 'Preparation · detection', why: 'This is what surfaced the attack. Without it, the dwell would be open-ended.' },
            { id: 'p1a4', label: 'Disable AD entirely', isCorrect: false, meta: 'Preparation · impossible', why: 'AD is foundational for most enterprises. Hardening is the only path.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm + scope the krbtgt compromise.',
          promptStem: 'Golden ticket = total AD compromise. Identify the dwell window + what attacker has touched.',
          actions: [
            { id: 'p2a1', label: 'Pull DC + SIEM logs for last 7 days for unusual Kerberos activity', isCorrect: true, meta: 'Identification · timeline', why: 'Establishes when the krbtgt hash was first used. 3-day dwell is a baseline; could be longer.' },
            { id: 'p2a2', label: 'Audit DCSync events on every DC for last 30 days', isCorrect: true, meta: 'Identification · root cause', why: 'DCSync (replication abuse) is how the krbtgt was extracted. Find the source + path.' },
            { id: 'p2a3', label: 'Identify every host accessed via forged tickets (golden ticket usage)', isCorrect: true, meta: 'Identification · scope', why: 'Each accessed host is potentially compromised + needs forensic review.' },
            { id: 'p2a4', label: 'Activate IR firm + breach counsel + AD-recovery specialist', isCorrect: true, meta: 'Identification · escalate', why: 'AD-wide compromise needs specialist help. Don\'t go solo on this — recovery is hard.' },
            { id: 'p2a5', label: 'Just rotate the krbtgt password and call it done', isCorrect: false, meta: 'Identification · trap', why: 'Trap. Single rotation isn\'t enough — attacker may have other persistence (golden ticket may have created backdoor accounts, group memberships, GPOs).' }
          ]
        },
        {
          stage: 'containment', expectedCount: 5,
          promptTitle: 'Cut off the attacker AND invalidate forged tickets.',
          promptStem: 'Golden ticket containment is unique. Single rotation = insufficient.',
          trapCallout: {
            title: 'The "rotate krbtgt twice" requirement',
            body: 'krbtgt rotation invalidates current golden tickets. But if you only rotate once, any tickets issued in the brief window between attacker access and your rotation are still valid (and they could re-issue tickets via the previous-key check Microsoft built in for backwards compat). You MUST rotate krbtgt password TWICE, with at least 10 hours between rotations, to fully invalidate the attacker\'s capability. This is documented in Microsoft\'s AD recovery guidance + standard SY0-701-tested IR knowledge.'
          },
          actions: [
            { id: 'p3a1', label: 'Rotate krbtgt password TWICE (10+ hours apart) per Microsoft guidance', isCorrect: true, meta: 'Containment · krbtgt', why: 'Single rotation lets old tickets stay valid. Double rotation invalidates everything.' },
            { id: 'p3a2', label: 'Identify + reset compromised admin/service account passwords', isCorrect: true, meta: 'Containment · accounts', why: 'Attacker may have used golden tickets to alter admin credentials. Reset all that may have been touched.' },
            { id: 'p3a3', label: 'Identify + remove attacker-created admin accounts / group memberships', isCorrect: true, meta: 'Containment · persistence', why: 'Golden ticket users often add themselves or shadow accounts to Domain Admins. Remove them.' },
            { id: 'p3a4', label: 'Audit + revoke unusual service-account permissions from last 7 days', isCorrect: true, meta: 'Containment · service accounts', why: 'Service accounts often have over-broad rights. Attacker may have piggy-backed.' },
            { id: 'p3a5', label: 'Network-isolate any host where golden ticket usage was confirmed', isCorrect: true, meta: 'Containment · endpoint', why: 'Confirmed-touched hosts need quarantine until forensically cleaned.' },
            { id: 'p3a6', label: 'Wipe all DCs immediately', isCorrect: false, meta: 'Containment · over-destructive', why: 'Wipes destroy AD itself + the evidence you need. Recovery via krbtgt rotation, not nuke-from-orbit.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 4,
          promptTitle: 'Clean up + harden against re-occurrence.',
          promptStem: 'krbtgt is rotated. Now make sure attacker can never get back to this state.',
          actions: [
            { id: 'p4a1', label: 'Forensic image + wipe + rebuild every host the attacker touched', isCorrect: true, meta: 'Eradication · trust restore', why: 'Attacker-touched hosts can\'t be cleaned in place. Image, wipe, rebuild.' },
            { id: 'p4a2', label: 'Implement Privileged Access Workstations (PAW) for all tier-0 admin work', isCorrect: true, meta: 'Eradication · architecture', why: 'PAW prevents future krbtgt extraction by isolating tier-0 admin work to dedicated, hardened workstations.' },
            { id: 'p4a3', label: 'Enable Microsoft\'s Local Administrator Password Solution (LAPS)', isCorrect: true, meta: 'Eradication · LAPS', why: 'LAPS rotates local admin passwords automatically + per-machine, defeating pass-the-hash for local admin.' },
            { id: 'p4a4', label: 'Schedule routine krbtgt rotation (every 6 months minimum)', isCorrect: true, meta: 'Eradication · routine', why: 'Routine rotation invalidates undetected long-dwell golden tickets. Defense-in-depth via time.' },
            { id: 'p4a5', label: 'Migrate off Active Directory', isCorrect: false, meta: 'Eradication · over-reach', why: 'AD is foundational. Hardening, not abandonment.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Validate clean state + restore operations.',
          promptStem: 'AD recovery is delicate. Validate before declaring done.',
          actions: [
            { id: 'p5a1', label: 'Independent IR-firm validation of AD clean state before declaring resolved', isCorrect: true, meta: 'Recovery · validation', why: 'AD compromise is hard to fully verify. Independent eyes catch what your team missed.' },
            { id: 'p5a2', label: 'Heightened DC + Kerberos monitoring for 90+ days post-incident', isCorrect: true, meta: 'Recovery · vigilance', why: 'Attackers often retry with similar TTPs within months. Monitor for the comeback.' },
            { id: 'p5a3', label: 'Threat-hunt for similar TTPs across the environment monthly', isCorrect: true, meta: 'Recovery · hunting', why: 'Proactive hunting catches long-dwell threats before they activate.' },
            { id: 'p5a4', label: 'Skip validation to save IR firm cost', isCorrect: false, meta: 'Recovery · negligence', why: 'AD compromise without validation = false sense of security. Worth the cost.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Lessons-learned: AD security maturity.',
          promptStem: 'Golden tickets are an AD security maturity test. Build the muscle.',
          actions: [
            { id: 'p6a1', label: 'Adopt the AD security tiering model (Tier 0/1/2 separation)', isCorrect: true, meta: 'Lessons · architecture', why: 'Tiering prevents attacker pivot from low-value to high-value AD resources.' },
            { id: 'p6a2', label: 'Run quarterly purple-team exercises specifically targeting AD', isCorrect: true, meta: 'Lessons · practice', why: 'AD-focused purple team validates detection + response specifically for the AD attack surface.' },
            { id: 'p6a3', label: 'Document this incident as the case for AD-security investment', isCorrect: true, meta: 'Lessons · advocacy', why: 'AD security investment often gets deferred. Real incident data drives approval.' },
            { id: 'p6a4', label: 'Train every employee on Kerberos forging', isCorrect: false, meta: 'Lessons · misaligned', why: 'Kerberos is invisible to most users. Training devs/admins is right; training all employees is overkill.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 16) Vishing → data exfil (v4.97.3 Batch 4)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'vishing-exfil',
      title: 'Vishing call impersonating IT → helpdesk credential theft',
      icon: '📞',
      vector: 'phish-derived',
      difficulty: 2,
      unlockAfter: [],
      summary: 'Helpdesk agent gave creds + reset MFA over the phone for a "remote engineer locked out". Attacker drained sales pipeline.',
      context: 'At 16:14, helpdesk agent Nicole received a call from "remote engineer Tom" claiming he was locked out. Caller knew internal jargon, the org\'s ticketing system, and Tom\'s manager\'s name. Nicole reset Tom\'s SSO password + bypassed MFA via the documented "stuck-at-airport" exception. Within 12 minutes, the attacker logged in to Salesforce as Tom + downloaded the entire customer pipeline (~$340M ARR data) before logging off. Real Tom called 90 minutes later.',
      vertical: 'B2B SaaS',
      severity: 'SEV-2',
      iocs: [
        { type: 'method', value: 'Voice phish + helpdesk pretexting', label: 'Initial vector' },
        { type: 'caller-id', value: 'Spoofed corp internal number', label: 'Caller-ID deception' },
        { type: 'creds', value: 'Tom\'s SSO password reset + MFA bypass', label: 'Credentials issued to attacker' },
        { type: 'data', value: 'Salesforce pipeline dump (~$340M ARR)', label: 'Exfil scope' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What helpdesk readiness mattered?',
          promptStem: 'Vishing succeeds when helpdesk procedures rely on verbal verification. Pick the prep that should have prevented this.',
          actions: [
            { id: 'p1a1', label: 'Helpdesk training on social engineering + caller-ID spoofing', isCorrect: true, meta: 'Preparation · training', why: 'Trained helpdesk agents recognise the script + decline the bypass. Untrained agents help the attacker.' },
            { id: 'p1a2', label: 'Mandatory call-back via known number for password resets (not just verbal verification)', isCorrect: true, meta: 'Preparation · process', why: 'Call-back via the registered employee number defeats voice phishing. SY0-701 standard.' },
            { id: 'p1a3', label: 'Documented MFA-bypass procedure with manager-approval requirement', isCorrect: true, meta: 'Preparation · workflow', why: 'Manager approval = second human in the loop. Attacker would need to spoof two people, not one.' },
            { id: 'p1a4', label: 'Train helpdesk to never reset passwords', isCorrect: false, meta: 'Preparation · over-restriction', why: 'Helpdesk needs to handle legitimate lockouts. Process + verification, not blanket-block.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm scope when real Tom calls in 90 min later.',
          promptStem: 'Tom calls — "I just got an alert about my password change but I didn\'t do it." Trace what happened.',
          actions: [
            { id: 'p2a1', label: 'Pull SSO + Salesforce session logs for Tom\'s account in the last 2 hours', isCorrect: true, meta: 'Identification · timeline', why: 'Establishes the full attack timeline. Foundation for scope.' },
            { id: 'p2a2', label: 'Pull helpdesk call recording (if recorded) + agent\'s ticket notes', isCorrect: true, meta: 'Identification · root cause', why: 'Voice-evidence + agent\'s side of the story show how the social engineer got past procedure.' },
            { id: 'p2a3', label: 'Quantify what data the attacker accessed in Salesforce (pipeline export logs)', isCorrect: true, meta: 'Identification · scope', why: 'Salesforce logs every export. Quantifies the breach for regulatory purposes.' },
            { id: 'p2a4', label: 'Open SEV-2 + activate breach counsel + customer-success leadership', isCorrect: true, meta: 'Identification · escalate', why: '$340M pipeline data + customer-list exposure = SEV-2. Customer-success needs to know for downstream comms.' },
            { id: 'p2a5', label: 'Wait until Monday morning to investigate', isCorrect: false, meta: 'Identification · negligence', why: 'Active session compromise. Every minute is more risk + more exfil. Now, not later.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 4,
          promptTitle: 'Cut the attacker off + audit Tom\'s account.',
          promptStem: 'Stop active access + revoke session.',
          actions: [
            { id: 'p3a1', label: 'Force logout Tom from SSO + revoke all active session tokens', isCorrect: true, meta: 'Containment · session', why: 'Stops the attacker if they\'re still active. Most important first action.' },
            { id: 'p3a2', label: 'Reset Tom\'s password again + re-enrol MFA via verified channel', isCorrect: true, meta: 'Containment · identity', why: 'Re-establishes Tom\'s legitimate access while invalidating the attacker\'s.' },
            { id: 'p3a3', label: 'Audit + lock helpdesk agent Nicole\'s account pending review', isCorrect: true, meta: 'Containment · helpdesk', why: 'Not a punishment — protects against the helpdesk agent themselves being the attack vector + preserves evidence.' },
            { id: 'p3a4', label: 'Block attacker source IP at perimeter + add to threat-intel watchlist', isCorrect: true, meta: 'Containment · network', why: 'Stops re-attempts from same IP + flags similar TTPs.' },
            { id: 'p3a5', label: 'Disable Salesforce entirely', isCorrect: false, meta: 'Containment · over-reach', why: 'Sales team can\'t work. Targeted account containment + data audit, not platform shutdown.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 3,
          promptTitle: 'Close the helpdesk-bypass window.',
          promptStem: 'Architectural fix to prevent voice-vector account takeover.',
          actions: [
            { id: 'p4a1', label: 'Revise helpdesk procedure: mandatory call-back to registered number for resets', isCorrect: true, meta: 'Eradication · process', why: 'Call-back defeats voice phishing. Documented + auditable.' },
            { id: 'p4a2', label: 'Eliminate the "stuck-at-airport" MFA bypass exception', isCorrect: true, meta: 'Eradication · exception removal', why: 'Documented exceptions become attack vectors. Stuck-at-airport users use temporary SMS codes via verified channel.' },
            { id: 'p4a3', label: 'Roll out vishing simulation in next quarterly security training', isCorrect: true, meta: 'Eradication · training', why: 'Helpdesk-targeted simulation builds the muscle memory.' },
            { id: 'p4a4', label: 'Replace all helpdesk staff', isCorrect: false, meta: 'Eradication · blame', why: 'Process failed, not the agent. Fix the process.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Customer + regulatory comms + restore.',
          promptStem: 'Pipeline data exposure has customer + regulatory implications.',
          actions: [
            { id: 'p5a1', label: 'Notify affected customers per regulatory deadline (GDPR / state laws)', isCorrect: true, meta: 'Recovery · regulatory', why: 'Customer-list exposure triggers breach notification laws. Counsel-led, customer-success-coordinated.' },
            { id: 'p5a2', label: 'Restore Tom\'s normal Salesforce access with monitoring', isCorrect: true, meta: 'Recovery · ops', why: 'Tom needs to work. Heightened monitoring catches any residual attacker activity.' },
            { id: 'p5a3', label: 'Public statement + customer-success outreach to high-value affected customers', isCorrect: true, meta: 'Recovery · transparency', why: 'High-value customers expect direct outreach. Restores trust through proactive comms.' },
            { id: 'p5a4', label: 'Hide the breach from affected customers', isCorrect: false, meta: 'Recovery · regulatory failure', why: 'Required disclosure. Hiding = much worse legal outcome.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Helpdesk security maturity.',
          promptStem: 'Helpdesk = attack surface. Treat accordingly.',
          actions: [
            { id: 'p6a1', label: 'Add helpdesk-targeted vishing to quarterly social-eng simulation', isCorrect: true, meta: 'Lessons · training', why: 'Helpdesk-specific simulations build the right muscle memory.' },
            { id: 'p6a2', label: 'Document this incident as the case for call-back-mandate', isCorrect: true, meta: 'Lessons · advocacy', why: 'Real incident drives process change.' },
            { id: 'p6a3', label: 'Review all helpdesk exceptions + documented bypasses', isCorrect: true, meta: 'Lessons · process audit', why: 'Documented exceptions are attack vectors. Audit + minimise.' },
            { id: 'p6a4', label: 'Stop offering helpdesk service entirely', isCorrect: false, meta: 'Lessons · over-reach', why: 'Helpdesk is essential. Hardening, not removal.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 17) 0-day RCE on customer-facing web app (v4.97.3)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'zero-day-rce',
      title: '0-day RCE on customer-facing web app · live exploitation',
      icon: '💥',
      vector: 'cloud',
      difficulty: 3,
      unlockAfter: ['k8s-container-escape'],
      summary: 'Public-facing API exploited via 0-day in dependency. WAF logs show shell-spawn attempts. Patch not yet available.',
      context: 'At 03:42, EDR on app-server-prod-04 fired on suspicious child processes. Investigation: a 0-day RCE in a JSON parsing library (CVE-pending) is being exploited via crafted POST requests to /api/v1/orders. Attacker has spawned shells on 3 production app servers. No patch available yet from upstream. The vulnerability is being actively scanned across the internet — competitors + peers may be hit too. WAF custom rule needed within hours.',
      vertical: 'B2C SaaS',
      severity: 'SEV-1',
      iocs: [
        { type: 'cve', value: 'CVE-pending (vendor advisory in 6h)', label: '0-day vulnerability' },
        { type: 'vector', value: 'POST /api/v1/orders w/ crafted JSON payload', label: 'Exploit pattern' },
        { type: 'host', value: '3 production app servers (-04, -07, -09)', label: 'Compromised hosts' },
        { type: 'global', value: 'Active mass-scan across internet', label: 'Threat landscape' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What 0-day-readiness mattered?',
          promptStem: '0-days are unpredictable. Defense is mostly architectural.',
          actions: [
            { id: 'p1a1', label: 'WAF in front of all public APIs with custom-rule deployment capability', isCorrect: true, meta: 'Preparation · WAF', why: 'WAF is your only defense before the patch ships. Without it, you\'re completely exposed during the 0-day window.' },
            { id: 'p1a2', label: 'EDR on every production host with behavioural detection (shell-spawn anomaly)', isCorrect: true, meta: 'Preparation · EDR', why: 'EDR caught the shell-spawn here. Without it, the dwell would be open-ended.' },
            { id: 'p1a3', label: 'Defence-in-depth: app-tier separated from data-tier with strict network policies', isCorrect: true, meta: 'Preparation · segmentation', why: 'Even with RCE, segmentation limits attacker pivot to data tier. Architectural blast-radius cap.' },
            { id: 'p1a4', label: 'Patch all 0-days before they\'re published', isCorrect: false, meta: 'Preparation · impossible', why: '0-day = no patch exists yet. Definitionally impossible.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm + scope + classify.',
          promptStem: '3 hosts hit, library is widely used. Identify the exploit + estimate scope.',
          actions: [
            { id: 'p2a1', label: 'Capture exploit payload from WAF logs + reverse-engineer indicator', isCorrect: true, meta: 'Identification · payload', why: 'Captured payload = signature for WAF rule + threat-intel sharing.' },
            { id: 'p2a2', label: 'Forensic image one of the compromised hosts before any cleanup', isCorrect: true, meta: 'Identification · forensic', why: 'Live forensic image preserves attacker state for analysis + threat-intel + legal.' },
            { id: 'p2a3', label: 'Check threat-intel feeds for similar TTPs + early CVE identifier', isCorrect: true, meta: 'Identification · TI', why: 'Other orgs may be reporting. Coordinated TI accelerates everyone\'s response.' },
            { id: 'p2a4', label: 'Open SEV-1 + IR firm + breach counsel + cyber insurance + upstream library maintainer', isCorrect: true, meta: 'Identification · escalate', why: 'Active 0-day exploitation = SEV-1. Library maintainer needs to know to ship the patch fast.' },
            { id: 'p2a5', label: 'Take the entire app offline immediately', isCorrect: false, meta: 'Containment-flavoured · drastic', why: 'Customer-facing app offline = self-DDoS. WAF blocking is more surgical.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 5,
          promptTitle: 'Block the exploit at WAF + isolate compromised hosts.',
          promptStem: 'Patch isn\'t available. Block the pattern, contain the damage.',
          actions: [
            { id: 'p3a1', label: 'Deploy custom WAF rule blocking the captured exploit payload pattern', isCorrect: true, meta: 'Containment · WAF', why: 'Stops the active exploitation immediately. Buy time for patch.' },
            { id: 'p3a2', label: 'Network-isolate the 3 compromised app servers (route around them in load balancer)', isCorrect: true, meta: 'Containment · isolation', why: 'Compromised hosts get drained from the LB pool. Customer traffic shifts to clean hosts.' },
            { id: 'p3a3', label: 'Rotate any service-account credentials accessible from compromised hosts', isCorrect: true, meta: 'Containment · credential', why: 'Compromised host = compromised creds on it. Rotate to invalidate any attacker exfil.' },
            { id: 'p3a4', label: 'Monitor for exploit-pattern attempts that bypass the WAF rule (variants)', isCorrect: true, meta: 'Containment · vigilance', why: 'Sophisticated attackers craft variants. Active monitoring catches the iteration.' },
            { id: 'p3a5', label: 'Coordinate with library maintainer + share the captured payload', isCorrect: true, meta: 'Containment · upstream', why: 'Maintainer ships patch faster with concrete payload. Helps everyone.' },
            { id: 'p3a6', label: 'Reboot the compromised hosts to "clear the attack"', isCorrect: false, meta: 'Containment · destroys evidence', why: 'Reboot kills RAM + running processes + evidence. Same trap as ryuk-finance.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 4,
          promptTitle: 'Patch + clean + harden.',
          promptStem: 'When patch ships, eradicate. In meantime, harden.',
          actions: [
            { id: 'p4a1', label: 'Apply upstream patch as soon as released to all hosts', isCorrect: true, meta: 'Eradication · patch', why: 'The actual fix. Critical-CVE patches deploy via emergency-change process within hours.' },
            { id: 'p4a2', label: 'Wipe + rebuild all 3 compromised hosts (cannot trust)', isCorrect: true, meta: 'Eradication · trust', why: 'RCE compromise = rebuild required. Can\'t trust in-place cleanup.' },
            { id: 'p4a3', label: 'Audit similar libraries for related vulnerabilities', isCorrect: true, meta: 'Eradication · proactive', why: 'JSON parsing libraries often share architectural patterns. Audit related libs preemptively.' },
            { id: 'p4a4', label: 'Implement runtime protection (eBPF / RASP) on app servers', isCorrect: true, meta: 'Eradication · runtime', why: 'Runtime protection catches future RCE attempts at the syscall level — defense even when WAF + patch are bypassed.' },
            { id: 'p4a5', label: 'Roll back to the previous library version', isCorrect: false, meta: 'Eradication · trap', why: 'Previous version may have its own vulnerabilities. Patch + verify, not regress.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Resume normal traffic + monitor.',
          promptStem: 'Patched + cleaned. Restore at scale + watch for variants.',
          actions: [
            { id: 'p5a1', label: 'Gradually reintroduce rebuilt hosts to LB pool with monitoring', isCorrect: true, meta: 'Recovery · staged', why: 'Gradual reintroduction validates each host before full traffic. Catches any persisting issues.' },
            { id: 'p5a2', label: 'Maintain elevated WAF + EDR monitoring for 30+ days', isCorrect: true, meta: 'Recovery · vigilance', why: 'Variants + post-disclosure exploitation increases. Sustained monitoring matters.' },
            { id: 'p5a3', label: 'Coordinate disclosure with library maintainer + threat intel community', isCorrect: true, meta: 'Recovery · ecosystem', why: 'Coordinated disclosure helps the whole ecosystem patch + harden.' },
            { id: 'p5a4', label: 'Take credit for finding the 0-day on social media', isCorrect: false, meta: 'Recovery · OPSEC fail', why: 'Public credit-claim invites attacker retaliation + complicates legal coordination.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: '0-day-resilience lessons.',
          promptStem: 'Next 0-day will land. Build the muscle.',
          actions: [
            { id: 'p6a1', label: 'Add 0-day response to quarterly tabletop scenarios', isCorrect: true, meta: 'Lessons · practice', why: '0-day response is unique (no patch yet). Practice the WAF-buy-time pattern.' },
            { id: 'p6a2', label: 'Adopt SBOM + CVE-rapid-response pipeline for all libraries', isCorrect: true, meta: 'Lessons · SBOM', why: 'SBOM means you know which libraries you depend on. Fast CVE matching = fast patch deployment.' },
            { id: 'p6a3', label: 'Subscribe to CVE-Trends + library-specific advisory feeds', isCorrect: true, meta: 'Lessons · awareness', why: 'Early warning matters. Hours of head-start can be the difference.' },
            { id: 'p6a4', label: 'Stop using third-party libraries entirely', isCorrect: false, meta: 'Lessons · misaligned', why: 'Modern dev requires libraries. SBOM + rapid patch is the answer.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 18) Azure tenant compromise (v4.97.3, locked behind aws-key-leak)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'azure-tenant-compromise',
      title: 'Azure tenant compromise via Global Admin token theft',
      icon: '☁️',
      vector: 'cloud',
      difficulty: 3,
      unlockAfter: ['aws-key-leak'],
      summary: 'GuardDuty fired on unusual Microsoft Graph API calls. Attacker has Global Admin via stolen refresh token + has dumped 200 mailboxes.',
      context: 'At 12:08, Azure threat-detection flagged anomalous Microsoft Graph API enumeration. Investigation: attacker stole a Global Admin refresh token from a legacy admin laptop (employee\'s personal device, not corp-MDM-managed) 6 days ago. Token has been silently used since to enumerate users + groups + mailboxes. In the last 12 hours, attacker began bulk-downloading mailboxes — 200 of 4,800 done. GA token bypasses MFA on token refresh.',
      vertical: 'Mid-size enterprise',
      severity: 'SEV-1',
      iocs: [
        { type: 'token', value: 'Stolen Global Admin refresh token (6d old)', label: 'Auth artifact' },
        { type: 'source', value: 'Personal laptop · not MDM-managed', label: 'Initial vector' },
        { type: 'api', value: 'Microsoft Graph API · bulk mailbox enumeration', label: 'Attack pattern' },
        { type: 'data', value: '200 mailboxes downloaded · 4,600 remaining', label: 'Active exfil' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What Azure tenant readiness mattered?',
          promptStem: 'Cloud-tenant compromise has unique vectors. Pick the prep.',
          actions: [
            { id: 'p1a1', label: 'Conditional Access blocking GA logins from non-MDM-compliant devices', isCorrect: true, meta: 'Preparation · CA', why: 'CA + MDM-compliance check would have blocked the personal-laptop login. Single most effective control.' },
            { id: 'p1a2', label: 'Privileged Identity Management (PIM) — JIT elevation, no permanent GA', isCorrect: true, meta: 'Preparation · PIM', why: 'PIM means no one has standing GA. Token theft has shorter half-life because token expires faster.' },
            { id: 'p1a3', label: 'Microsoft Graph API audit logs streamed to SIEM', isCorrect: true, meta: 'Preparation · audit', why: 'GuardDuty caught the abuse via Graph API audit. Without streaming + alerting, the dwell is open-ended.' },
            { id: 'p1a4', label: 'Disable Microsoft Graph API for all admins', isCorrect: false, meta: 'Preparation · over-restriction', why: 'Graph is the management API. Disabling breaks all admin work.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Confirm scope of Graph API abuse.',
          promptStem: 'GA token = total tenant compromise. Identify what\'s been touched.',
          actions: [
            { id: 'p2a1', label: 'Pull Microsoft Graph API audit logs for the affected refresh token in last 7 days', isCorrect: true, meta: 'Identification · audit', why: 'Establishes full attack timeline + every Graph call made.' },
            { id: 'p2a2', label: 'Identify all mailboxes downloaded + groups enumerated + accounts modified', isCorrect: true, meta: 'Identification · scope', why: 'Mailbox content = data-breach scope. Tells you what to disclose to whom.' },
            { id: 'p2a3', label: 'Audit for any new GA / privileged accounts created in the dwell window', isCorrect: true, meta: 'Identification · persistence', why: 'Attacker likely created persistence backup accounts before exfil.' },
            { id: 'p2a4', label: 'Activate IR firm + breach counsel + Microsoft cloud-IR specialist', isCorrect: true, meta: 'Identification · escalate', why: 'Tenant-level compromise needs Microsoft cloud expertise. SEV-1.' },
            { id: 'p2a5', label: 'Just rotate the user\'s password and call it done', isCorrect: false, meta: 'Identification · trap', why: 'Refresh tokens persist past password change. Password rotation alone insufficient.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 5,
          promptTitle: 'Revoke + isolate at the tenant level.',
          promptStem: 'Multi-axis containment for cloud-tenant compromise.',
          actions: [
            { id: 'p3a1', label: 'Revoke ALL refresh tokens for the compromised admin (and similar)', isCorrect: true, meta: 'Containment · token', why: 'Refresh tokens are the persistent artifact. Revocation invalidates them. Critical first step.' },
            { id: 'p3a2', label: 'Disable the user\'s account + force password reset + re-enrol MFA', isCorrect: true, meta: 'Containment · identity', why: 'Stops new auth + invalidates the cred chain.' },
            { id: 'p3a3', label: 'Remove + audit all attacker-created accounts / role assignments', isCorrect: true, meta: 'Containment · persistence', why: 'Strip out backdoor accounts before they\'re used.' },
            { id: 'p3a4', label: 'Block bulk Graph API enumeration patterns at tenant policy level', isCorrect: true, meta: 'Containment · API', why: 'Stops similar attacks from succeeding even if other tokens leak.' },
            { id: 'p3a5', label: 'Enable forensic logging for all admin actions for next 90 days', isCorrect: true, meta: 'Containment · audit', why: 'Heightened logging catches any residual attacker presence.' },
            { id: 'p3a6', label: 'Delete the entire tenant', isCorrect: false, meta: 'Containment · over-destructive', why: 'Tenant deletion = company-wide outage. Targeted revocation, not nuke.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 4,
          promptTitle: 'Tenant hardening + persistence cleanup.',
          promptStem: 'Architectural fix to prevent recurrence.',
          actions: [
            { id: 'p4a1', label: 'Implement Conditional Access requiring MDM-compliance for all admin logins', isCorrect: true, meta: 'Eradication · CA', why: 'Closes the personal-laptop attack vector permanently.' },
            { id: 'p4a2', label: 'Move all Global Admin work to PIM with JIT elevation (no standing GA)', isCorrect: true, meta: 'Eradication · PIM', why: 'JIT GA means tokens expire fast. Stolen tokens have short half-life.' },
            { id: 'p4a3', label: 'Audit + remove unnecessary GA permissions from current admins', isCorrect: true, meta: 'Eradication · least-privilege', why: 'Many admins have standing GA they don\'t need. Reduce exposure.' },
            { id: 'p4a4', label: 'Implement Microsoft Defender for Identity for token-theft detection', isCorrect: true, meta: 'Eradication · detection', why: 'Token-anomaly detection catches similar attacks in real time.' },
            { id: 'p4a5', label: 'Migrate off Azure entirely', isCorrect: false, meta: 'Eradication · over-reach', why: 'Cloud is foundation. Hardening, not migration.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 4,
          promptTitle: 'Customer + employee comms + restore admin operations.',
          promptStem: 'Mailbox content includes employee + customer correspondence.',
          actions: [
            { id: 'p5a1', label: 'Notify employees whose mailboxes were downloaded + offer support', isCorrect: true, meta: 'Recovery · employee', why: 'Personal correspondence in employee mailboxes. Required + ethically necessary.' },
            { id: 'p5a2', label: 'Notify external parties whose communications were exposed in employee mailboxes', isCorrect: true, meta: 'Recovery · downstream', why: 'Mailbox content includes customer + partner communication. Notify based on regulatory requirements.' },
            { id: 'p5a3', label: 'Restore normal admin operations with new PIM workflows', isCorrect: true, meta: 'Recovery · ops', why: 'Admins need to work. New PIM workflows = new normal.' },
            { id: 'p5a4', label: 'Maintain heightened tenant monitoring 90+ days', isCorrect: true, meta: 'Recovery · vigilance', why: 'Sophisticated attackers retry. Sustained monitoring catches comeback.' },
            { id: 'p5a5', label: 'Hide the breach from affected parties', isCorrect: false, meta: 'Recovery · regulatory failure', why: 'Required disclosure under multiple regulations.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Cloud tenant security maturity.',
          promptStem: 'Cloud-tenant compromise is its own discipline.',
          actions: [
            { id: 'p6a1', label: 'Adopt zero-standing-privilege model org-wide', isCorrect: true, meta: 'Lessons · architecture', why: 'JIT + zero-standing-privilege caps blast radius for all future incidents.' },
            { id: 'p6a2', label: 'Quarterly cloud-tenant tabletop exercises', isCorrect: true, meta: 'Lessons · practice', why: 'Cloud IR differs from on-prem. Practice specifically.' },
            { id: 'p6a3', label: 'Mandate corp-managed devices for all admin work', isCorrect: true, meta: 'Lessons · policy', why: 'Closes the personal-device attack vector at policy level.' },
            { id: 'p6a4', label: 'Stop using cloud admin accounts', isCorrect: false, meta: 'Lessons · impossible', why: 'Cloud requires admin accounts. Hardening, not avoidance.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 19) CFO embezzlement insider (v4.97.3, locked behind insider-exfil)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'cfo-embezzlement',
      title: 'CFO embezzlement — financial insider with legitimate access',
      icon: '👤',
      vector: 'insider',
      difficulty: 3,
      unlockAfter: ['insider-exfil'],
      summary: 'Anonymous tip: CFO Sarah may have wired $1.2M to a shell company over 6 months. All transactions used legitimate authority.',
      context: 'At 16:14, an anonymous internal tip arrived at the audit committee: "CFO Sarah Chen has been wiring funds to ASCII-Holdings LLC, a shell company tied to her brother. Last 6 months, ~$1.2M total via 8 wires labeled as M&A advisory fees." All wires were legitimately authorised by CFO under existing SOPs. The transactions are real, the question is intent. This intersects fraud + insider threat + legal + HR + regulatory.',
      vertical: 'Mid-size enterprise',
      severity: 'SEV-3',
      iocs: [
        { type: 'allegation', value: 'CFO routing funds to shell company', label: 'Insider allegation' },
        { type: 'volume', value: '~$1.2M / 8 wires / 6 months', label: 'Suspect transactions' },
        { type: 'authority', value: 'All wires within CFO authority limits', label: 'Legitimate authorisation' },
        { type: 'connection', value: 'Shell company tied to CFO\'s brother', label: 'Relationship' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 3,
          promptTitle: 'What financial-insider readiness mattered?',
          promptStem: 'Embezzlement by senior finance is hardest IR. Procedural prep matters most.',
          actions: [
            { id: 'p1a1', label: 'Anonymous-tip channel + audit committee escalation path', isCorrect: true, meta: 'Preparation · whistleblower', why: 'Whistleblowers need a safe channel. Without one, reports go to wrong people or don\'t happen.' },
            { id: 'p1a2', label: 'Two-person rule for any wire over $50K (regardless of authoriser)', isCorrect: true, meta: 'Preparation · process', why: 'Two-person rule prevents single-actor fraud regardless of seniority. Codified, not exception-able.' },
            { id: 'p1a3', label: 'Vendor / counterparty due diligence + ownership disclosure', isCorrect: true, meta: 'Preparation · vendor risk', why: 'Required disclosure of beneficial ownership would have surfaced the brother connection.' },
            { id: 'p1a4', label: 'Trust the CFO completely', isCorrect: false, meta: 'Preparation · misaligned', why: 'Trust + verify is the security model. Trust without verification creates these incidents.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 4,
          promptTitle: 'Verify allegation discreetly + preserve evidence.',
          promptStem: 'Insider IR with senior leadership requires extreme discretion. Premature exposure = legal nightmare.',
          actions: [
            { id: 'p2a1', label: 'Audit committee + general counsel + outside forensic accountants engaged immediately', isCorrect: true, meta: 'Identification · governance', why: 'CFO investigation requires independent governance. Internal IT alone is insufficient + has conflict-of-interest risk.' },
            { id: 'p2a2', label: 'Preserve ERP + email + financial records under legal hold (no one notified)', isCorrect: true, meta: 'Identification · forensic', why: 'Legal hold preserves evidence. Notifying the subject = evidence destruction risk.' },
            { id: 'p2a3', label: 'Investigate ASCII-Holdings ownership via public records + subpoena prep', isCorrect: true, meta: 'Identification · forensic', why: 'Establishes whether the shell company link exists + builds the legal case.' },
            { id: 'p2a4', label: 'Document the audit-committee + counsel chain of decisions', isCorrect: true, meta: 'Identification · governance', why: 'Detailed governance log matters for any subsequent legal action + regulatory inquiry.' },
            { id: 'p2a5', label: 'Confront CFO directly to ask if it\'s true', isCorrect: false, meta: 'Identification · OPSEC fail', why: 'Premature confrontation alerts the subject + risks evidence destruction. Discretion is mandatory.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 4,
          promptTitle: 'Limit further potential damage without tipping off.',
          promptStem: 'Containment must be discreet until investigation is complete.',
          actions: [
            { id: 'p3a1', label: 'Quietly disable CFO\'s ability to authorise wires above a threshold (with cover story)', isCorrect: true, meta: 'Containment · authority', why: 'Stops further potential fraud while investigation proceeds. Cover story prevents tip-off.' },
            { id: 'p3a2', label: 'Implement two-person rule on all wires immediately org-wide', isCorrect: true, meta: 'Containment · policy', why: 'Org-wide rule looks like routine policy improvement (no specific suspect signal). Stops fraud universally.' },
            { id: 'p3a3', label: 'Audit + verify any other vendors with shareholder ties to executives', isCorrect: true, meta: 'Containment · scope', why: 'Other potentially-compromised vendor relationships need investigation. Same pattern may exist.' },
            { id: 'p3a4', label: 'Restrict CFO\'s access to sensitive financial systems (with legal-counsel approval)', isCorrect: true, meta: 'Containment · access', why: 'Reducing CFO access to financial systems requires counsel approval but is necessary to prevent further harm.' },
            { id: 'p3a5', label: 'Fire the CFO immediately', isCorrect: false, meta: 'Containment · trap', why: 'Premature termination without investigation = wrongful-termination lawsuit + evidence loss. Investigate, then act.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 3,
          promptTitle: 'Resolution + recovery via legal + governance process.',
          promptStem: 'IT side is largely complete. Legal + governance side takes over.',
          actions: [
            { id: 'p4a1', label: 'Outside forensic accountants complete investigation + report to audit committee', isCorrect: true, meta: 'Eradication · forensic', why: 'Independent forensic report is the foundation for any subsequent legal action.' },
            { id: 'p4a2', label: 'Audit committee + counsel decide on disciplinary + legal action', isCorrect: true, meta: 'Eradication · governance', why: 'Disciplinary + criminal referral decisions belong to governance + counsel, not IT.' },
            { id: 'p4a3', label: 'Implement permanent two-person rule + ownership disclosure controls', isCorrect: true, meta: 'Eradication · policy', why: 'Codified controls prevent the pattern from recurring with different actors.' },
            { id: 'p4a4', label: 'Bury the report to avoid bad press', isCorrect: false, meta: 'Eradication · regulatory failure', why: 'Cover-up is illegal + makes outcome much worse. Material financial fraud may require regulatory disclosure.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 3,
          promptTitle: 'Financial recovery + public disclosure + executive transition.',
          promptStem: 'Restore trust + meet regulatory obligations.',
          actions: [
            { id: 'p5a1', label: 'Pursue restitution via legal channels (civil + criminal as appropriate)', isCorrect: true, meta: 'Recovery · restitution', why: 'Recover the $1.2M via legal process. Sets precedent + deters future actors.' },
            { id: 'p5a2', label: 'Disclose to regulators + investors per material-event requirements', isCorrect: true, meta: 'Recovery · regulatory', why: 'Public companies have material-event disclosure obligations. Counsel-led disclosure.' },
            { id: 'p5a3', label: 'Communicate appropriately to employees + manage executive transition', isCorrect: true, meta: 'Recovery · org', why: 'Internal communication requires balance — transparency without violating ongoing legal action.' },
            { id: 'p5a4', label: 'Take credit on social media for catching the fraud', isCorrect: false, meta: 'Recovery · OPSEC fail', why: 'Public credit-claim violates ongoing-legal-process discretion + invites litigation.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 3,
          promptTitle: 'Insider-fraud lessons.',
          promptStem: 'Senior fraud is preventable with right controls.',
          actions: [
            { id: 'p6a1', label: 'Adopt segregation-of-duties + multi-party-approval as governance principles', isCorrect: true, meta: 'Lessons · governance', why: 'No single person should authorise + execute material financial actions. Codify in policy.' },
            { id: 'p6a2', label: 'Annual whistleblower-channel awareness campaign', isCorrect: true, meta: 'Lessons · culture', why: 'Active whistleblower culture catches fraud early. Awareness keeps it usable.' },
            { id: 'p6a3', label: 'External audit + forensic accounting cycle for senior-leadership-authorised transactions', isCorrect: true, meta: 'Lessons · audit', why: 'Senior transactions get independent review. Catches future patterns proactively.' },
            { id: 'p6a4', label: 'Stop having a CFO', isCorrect: false, meta: 'Lessons · misaligned', why: 'CFO role is essential. Controls + audit, not abolition.' }
          ]
        }
      ]
    },

    // ──────────────────────────────────────────────────────────────────
    // 20) APT-style nation-state intrusion (v4.97.3, apex, locked)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'apt-nation-state',
      title: 'APT-style nation-state intrusion · government-affiliated threat actor',
      icon: '🌍',
      vector: 'insider',
      difficulty: 3,
      unlockAfter: ['golden-ticket'],
      summary: 'CISA tipped you off: government-affiliated threat actor has been in your network for 90+ days. Cleared sophistication. Hunt mode.',
      context: 'At 09:14, CISA contacted your CISO confidentially: "We have intelligence that your network has been compromised by a government-affiliated APT group for 90+ days. We can\'t share specific TTPs but can confirm presence. Threat actor has stealth + patience. Recommend you engage your IR firm + threat-hunt actively." Your environment: 2,400 employees, multi-cloud, plus on-prem + AD + critical IP including defence-industry trade secrets. This is not a typical incident.',
      vertical: 'Defence-adjacent enterprise',
      severity: 'SEV-1',
      iocs: [
        { type: 'attribution', value: 'Government-affiliated APT (CISA confirmed)', label: 'Threat actor profile' },
        { type: 'dwell', value: '90+ days estimated', label: 'Estimated presence' },
        { type: 'capability', value: 'High sophistication · stealth · patient', label: 'Adversary capability' },
        { type: 'target', value: 'Defence-industry IP + AD + cloud + on-prem', label: 'Likely targets' }
      ],
      phases: [
        {
          stage: 'preparation', expectedCount: 4,
          promptTitle: 'What APT-readiness should be in place?',
          promptStem: 'APTs are different from commodity attackers. Pick the readiness that matters most.',
          actions: [
            { id: 'p1a1', label: 'Threat-hunting program with hypothesis-driven detection', isCorrect: true, meta: 'Preparation · threat hunting', why: 'APTs evade signature-based detection. Hypothesis-driven hunting is the only effective approach.' },
            { id: 'p1a2', label: 'Network segmentation aligned to data sensitivity (defence IP isolated)', isCorrect: true, meta: 'Preparation · segmentation', why: 'Limits APT lateral movement to highest-value targets. Architectural blast-radius control.' },
            { id: 'p1a3', label: 'CISA + sector-ISAC + IR firm relationships pre-established', isCorrect: true, meta: 'Preparation · partnerships', why: 'APTs require coordinated response. Pre-existing relationships = faster mobilisation.' },
            { id: 'p1a4', label: 'Cleared employees + tier-zero admin separation', isCorrect: true, meta: 'Preparation · personnel', why: 'Defence-industry context. Cleared personnel + tier-zero separation prevent some classes of compromise.' },
            { id: 'p1a5', label: 'Public bug-bounty program', isCorrect: false, meta: 'Preparation · misaligned', why: 'Bug bounties find scope-defined vulns. APTs don\'t care about your bounty rules.' }
          ]
        },
        {
          stage: 'identification', expectedCount: 5,
          promptTitle: 'Active threat-hunt mode. Find the adversary.',
          promptStem: 'CISA confirmed presence but won\'t share TTPs. You hunt blind.',
          actions: [
            { id: 'p2a1', label: 'Activate IR firm with APT specialisation + breach counsel + cyber insurance', isCorrect: true, meta: 'Identification · partner', why: 'APT IR requires specialists. Speed matters; partnership is force multiplier.' },
            { id: 'p2a2', label: 'Begin threat-hunt with focus on tier-0 (DCs, defence-IP servers)', isCorrect: true, meta: 'Identification · hunt', why: 'APTs target highest-value assets. Hunt where they\'d be.' },
            { id: 'p2a3', label: 'Audit AD for unusual delegation, GPO changes, krbtgt, service accounts in last 120 days', isCorrect: true, meta: 'Identification · AD', why: 'AD is the favoured APT persistence target. 120 days exceeds the 90-day dwell estimate.' },
            { id: 'p2a4', label: 'Audit cloud tenant for similar persistence patterns + Conditional Access bypasses', isCorrect: true, meta: 'Identification · cloud', why: 'Cloud is increasingly an APT target. Same hunt, cloud-specific TTPs.' },
            { id: 'p2a5', label: 'Establish out-of-band comms (assume corp email + Slack are owned)', isCorrect: true, meta: 'Identification · OPSEC', why: 'APT may be reading corp comms. Use Signal / phone / out-of-band.' },
            { id: 'p2a6', label: 'Announce the breach publicly to alert customers', isCorrect: false, meta: 'Identification · OPSEC fail', why: 'Premature public disclosure tips off the APT + ruins your hunt. CISA-coordinated disclosure later.' }
          ]
        },
        {
          stage: 'containment', expectedCount: 6,
          promptTitle: 'Maximum-care containment without tipping off the adversary.',
          promptStem: 'APTs detect and adapt to containment efforts. Move quietly + comprehensively.',
          trapCallout: {
            title: 'The "obvious containment" trap',
            body: 'Standard incident-response containment (visible isolation, mass password resets, public WAF rule changes) tips off APT adversaries. They\'ll burn their current infrastructure, move to backup persistence, and you lose visibility. APT containment requires discretion: closed-circle decision-making, out-of-band coordination, simultaneous multi-axis action (not sequential — sequential gives them time to react). When you contain, you contain everywhere at once. This is documented in MITRE D3FEND + CISA\'s APT response guidance.'
          },
          actions: [
            { id: 'p3a1', label: 'Closed-circle decision-making — only need-to-know personnel involved', isCorrect: true, meta: 'Containment · OPSEC', why: 'APT may have visibility into broad org comms. Tight circle prevents inadvertent tip-off.' },
            { id: 'p3a2', label: 'Coordinated multi-axis containment in single window (not sequential)', isCorrect: true, meta: 'Containment · simultaneous', why: 'Sequential containment lets adversary move to next persistence. Simultaneous closes all doors at once.' },
            { id: 'p3a3', label: 'krbtgt password rotated TWICE 10 hours apart per Microsoft guidance', isCorrect: true, meta: 'Containment · AD', why: 'Required for AD compromise. Same as golden-ticket scenario.' },
            { id: 'p3a4', label: 'Cloud tenant: rotate ALL refresh tokens + Conditional Access tightened', isCorrect: true, meta: 'Containment · cloud', why: 'Cloud persistence cleanup, parallel to AD.' },
            { id: 'p3a5', label: 'Network: block known C2 patterns + inspect all egress in real time', isCorrect: true, meta: 'Containment · network', why: 'Egress inspection catches exfiltration in progress.' },
            { id: 'p3a6', label: 'Engage US-CISA + sector ISAC for coordinated response', isCorrect: true, meta: 'Containment · external coord', why: 'CISA tipped you off; partner with them on coordinated response. Sector ISAC may have parallel intel.' },
            { id: 'p3a7', label: 'Visibly increase security tools on monitors visible to staff', isCorrect: false, meta: 'Containment · OPSEC fail', why: 'Visible escalation tips off APT. Discreet monitoring only.' }
          ]
        },
        {
          stage: 'eradication', expectedCount: 4,
          promptTitle: 'Eradication-grade APT removal.',
          promptStem: 'APTs require complete trust restoration. Half-measures fail.',
          actions: [
            { id: 'p4a1', label: 'Wipe + reimage every host where APT presence is confirmed (forensic image first)', isCorrect: true, meta: 'Eradication · trust', why: 'APT-touched hosts cannot be cleaned in place. Forensic image, then complete rebuild.' },
            { id: 'p4a2', label: 'Force credential rotation org-wide + force MFA re-enrolment for all admins', isCorrect: true, meta: 'Eradication · credential', why: '90+ day dwell = assume universal credential exposure. Org-wide reset is the safe baseline.' },
            { id: 'p4a3', label: 'Engage independent IR firm to validate clean state via documented procedures', isCorrect: true, meta: 'Eradication · validation', why: 'APT-clean validation requires expertise. Independent verification is mandatory.' },
            { id: 'p4a4', label: 'Adopt zero-trust architecture for sensitive assets going forward', isCorrect: true, meta: 'Eradication · architecture', why: 'ZT architecture caps blast radius for any future intrusion. Can\'t prevent APTs entirely; can limit damage.' },
            { id: 'p4a5', label: 'Just rotate the krbtgt password and call it eradicated', isCorrect: false, meta: 'Eradication · half-measure', why: 'APTs have multi-axis persistence. Single-tactic eradication fails.' }
          ]
        },
        {
          stage: 'recovery', expectedCount: 4,
          promptTitle: 'Coordinated disclosure + ongoing threat intel + sustained vigilance.',
          promptStem: 'APT recovery extends 12+ months. Plan for the long horizon.',
          actions: [
            { id: 'p5a1', label: 'Coordinate disclosure with CISA + counsel + customers + regulators', isCorrect: true, meta: 'Recovery · disclosure', why: 'Disclosure is sequenced + coordinated. CISA may have specific guidance on timing for ongoing investigation.' },
            { id: 'p5a2', label: 'Maintain elevated monitoring + threat-hunt cadence for 12+ months', isCorrect: true, meta: 'Recovery · sustained', why: 'APTs commonly retry. Year-long heightened posture is standard.' },
            { id: 'p5a3', label: 'Share TTPs + IOCs with CISA + sector ISAC for ecosystem benefit', isCorrect: true, meta: 'Recovery · sharing', why: 'Same crew likely targeting peer orgs. Sharing helps ecosystem defend.' },
            { id: 'p5a4', label: 'Brief board + executive team on the threat + ongoing posture', isCorrect: true, meta: 'Recovery · governance', why: 'Board needs to understand APT-tier risk + agree to sustained-investment posture.' },
            { id: 'p5a5', label: 'Skip the year of monitoring to save cost', isCorrect: false, meta: 'Recovery · negligence', why: 'APT comeback is highly likely. Year of monitoring is cost-of-doing-business.' }
          ]
        },
        {
          stage: 'lessons', expectedCount: 4,
          promptTitle: 'How does the org survive APT-tier threats long-term?',
          promptStem: 'APTs are the apex. Lessons here are foundational.',
          actions: [
            { id: 'p6a1', label: 'Adopt MITRE ATT&CK as the defensive framework + map detection coverage', isCorrect: true, meta: 'Lessons · framework', why: 'ATT&CK is the standard model for APT TTPs. Coverage map identifies gaps to close.' },
            { id: 'p6a2', label: 'Build a continuous threat-hunting team (not just reactive IR)', isCorrect: true, meta: 'Lessons · team', why: 'Reactive IR catches 50% at best. Continuous hunting catches stealthy APTs that evade detection.' },
            { id: 'p6a3', label: 'Establish ongoing relationship with CISA + sector ISAC + IR firm retainer', isCorrect: true, meta: 'Lessons · partnership', why: 'APT-tier threat requires coordinated ecosystem response. Pre-positioned relationships matter.' },
            { id: 'p6a4', label: 'Brief the board annually on APT-tier risk + ensure ongoing investment', isCorrect: true, meta: 'Lessons · governance', why: 'APT defence is expensive + ongoing. Board buy-in keeps the budget alive.' },
            { id: 'p6a5', label: 'Stop being a defence-industry-adjacent business', isCorrect: false, meta: 'Lessons · misaligned', why: 'Mission matters. Hardening, not retreat.' }
          ]
        }
      ]
    }
  ],

  // ════════════════════════════════════════════════════════════════════
  // INCIDENT RESPONSE LESSONS — 6 PICERL phase cheatsheets (v4.97.1)
  // Each card has: phase, goal, canonical actions, common traps.
  // Visual contract from mockup state 7.
  // ════════════════════════════════════════════════════════════════════
  incidentResponseLessons: [
    {
      phase: 'preparation',
      title: 'Preparation',
      goal: '"You can\'t pause an incident to write a playbook." Build readiness BEFORE day-zero.',
      actions: [
        '<strong>IR plan</strong> documented + reviewed annually',
        '<strong>IR team</strong> roles assigned (commander, scribe, comms, legal, forensics)',
        '<strong>Tooling</strong> staged (EDR, SIEM, NetFlow, write-blockers, RAM-capture)',
        '<strong>Tabletop exercises</strong> quarterly with realistic scenarios',
        '<strong>Backups + comms tree</strong> tested + out-of-band channel ready'
      ],
      traps: [
        '<strong>"Buy more tools."</strong> Tooling without playbook + practice doesn\'t help. Process &gt; products.'
      ]
    },
    {
      phase: 'identification',
      title: 'Identification',
      goal: '"Is this an incident? What kind? How bad?" Confirm and classify.',
      actions: [
        '<strong>Confirm</strong> via correlation across sources (EDR + FW + user report)',
        '<strong>Classify</strong> incident type (malware / data breach / DoS / etc.)',
        '<strong>Assign severity</strong> per the IR plan\'s matrix (impact × urgency)',
        '<strong>Open ticket</strong> + start the scribe log + start incident timer',
        '<strong>Stay broad</strong> — collect IOCs even if you\'re not sure they\'re related yet'
      ],
      traps: [
        '<strong>Jumping to containment too early.</strong> Without classification, you over-isolate or under-isolate. Classify first.'
      ]
    },
    {
      phase: 'containment',
      title: 'Containment',
      goal: '"Stop the spread. Preserve evidence. Don\'t make eradication harder."',
      actions: [
        '<strong>Network-isolate</strong> infected hosts via EDR (NOT power off)',
        '<strong>Block C2</strong> at perimeter / DNS sinkhole',
        '<strong>Identity-contain</strong> — disable compromised accounts + force re-auth',
        '<strong>RAM dump</strong> before any state-changing action (RFC 3227 order of volatility)',
        '<strong>Scope-expand</strong> — sweep for lateral movement (other hosts hit?)'
      ],
      traps: [
        '<strong>Power-off vs isolate.</strong> Power-off destroys RAM, swap, network state, decryption keys. Isolate keeps the host alive for forensics. <em>Never power off first.</em>',
        '<strong>Wipe-and-reimage too soon.</strong> That\'s eradication. Wiping pre-evidence-capture loses attribution + IOCs.'
      ]
    },
    {
      phase: 'eradication',
      title: 'Eradication',
      goal: '"Remove the malware AND the way it got in. If you only remove the malware, it\'ll come back."',
      actions: [
        '<strong>Wipe-and-reimage</strong> (preferred over disinfection — trust nothing)',
        '<strong>Patch</strong> the exploited vulnerability (not just the host you found)',
        '<strong>Rotate credentials</strong> for any account that touched the affected host',
        '<strong>Revoke certs</strong> if private keys were on the box',
        '<strong>Update IOC blocklists</strong> permanently — promote from temporary block'
      ],
      traps: [
        '<strong>"Just run AV again."</strong> Disinfection isn\'t trust-restoring. Reimage from clean baseline.',
        '<strong>Patching only the affected host.</strong> Same vuln exists on every other host. Patch fleet-wide.'
      ]
    },
    {
      phase: 'recovery',
      title: 'Recovery',
      goal: '"Get back to business safely. Watch for recurrence." Restore + monitor + validate.',
      actions: [
        '<strong>Restore from clean backup</strong> verified pre-incident timestamp',
        '<strong>Validate integrity</strong> — hash-check restored files vs known-good',
        '<strong>Stage re-introduction</strong> — bring services back gradually + monitored',
        '<strong>Heightened monitoring</strong> for ~30d post-recovery (recurrence risk)',
        '<strong>User communication</strong> — what was affected, what to watch for'
      ],
      traps: [
        '<strong>Restore before eradication.</strong> Restoring onto an unpatched host re-infects. Sequence matters.',
        '<strong>Restoring from compromised backup.</strong> Pre-incident timestamps only. Verify backup hashes.'
      ]
    },
    {
      phase: 'lessons',
      title: 'Lessons Learned',
      goal: '"How do we make sure this never happens again — or at least costs less next time?"',
      actions: [
        '<strong>Post-incident review</strong> within 2 weeks while details fresh',
        '<strong>Document timeline</strong> — every action + when + by whom',
        '<strong>Identify gaps</strong> in detection, response, comms, tooling',
        '<strong>Update playbook</strong> with new attack-pattern + better response',
        '<strong>Share intel</strong> with peer orgs / ISAC if appropriate'
      ],
      traps: [
        '<strong>Skipping it.</strong> "We\'re too busy" = next incident is the same incident. Always close the loop.',
        '<strong>Blame culture.</strong> Blameless postmortems surface real gaps. Punitive ones surface lies.'
      ]
    }
  ],

  // ════════════════════════════════════════════════════════════════════
  // PHISHING TRIAGE LAB — Flagship #2 (v4.98.0 / issue #313)
  // SY0-701 Domain 2 (22%) flagship. Click-the-flag inbox simulator.
  // 4 attack vectors at v1-final (email/sms/voice/qr); v4.98.0 ships
  // email-only — 6 phish + 4 lesson cards + click-flag UI.
  // Visual contract: mockups/security-phishing-email-triage-lab-concept.html
  // ════════════════════════════════════════════════════════════════════
  phishingVectors: {
    'email': { name: 'Email phish', icon: '📧', color: '#3b82f6' },
    'sms':   { name: 'Smishing',    icon: '💬', color: '#16a34a' },
    'voice': { name: 'Vishing',     icon: '📞', color: '#d946ef' },
    'qr':    { name: 'Quishing',    icon: '📱', color: '#f59e0b' }
  },
  phishingScenarios: [
    // ──────────────────────────────────────────────────────────────────
    // 1) CFO BEC wire fraud — the canonical (mockup state 2-4)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'cfo-bec-wire-fraud',
      title: '"CFO" wire-fraud BEC',
      vector: 'email',
      difficulty: 2,
      unlockAfter: [],
      category: 'bec',
      summary: 'Display-name spoof of CFO Sarah Chen. Reply-To mismatch. Urgency + secrecy + wire transfer. SY0-701 trap-rich.',
      sender: { name: 'Sarah Chen, CFO', email: 'sarah.chen.cfo@gmail.com', avatar: 'SC', avatarColor: '#3b82f6' },
      subject: '[URGENT] Wire transfer needed before close — CONFIDENTIAL',
      to: 'james.doe@corp.com',
      replyTo: 'treasury.processing@corp-finance-secure.com',
      time: '09:14',
      bodyHtml: '<p><span class="flag" data-fid="f1">Hi James,</span></p>' +
        '<p>I\'m currently in a confidential M&A discussion and need your immediate help. We need to wire <strong>$487,000</strong> to our advisory firm\'s escrow account by <span class="flag" data-fid="f2">end of business today</span> to lock in their engagement before our window closes.</p>' +
        '<p>Wire details are attached. <span class="flag" data-fid="f3">Please don\'t loop anyone else in</span> — this is highly sensitive until the deal is announced. If anyone asks, defer to me directly.</p>' +
        '<p>Account details + routing info here: <a href="#"><span class="flag" data-fid="f4">https://corp-finance-secure.com/wire-update.aspx?ref=Q3a82F</span></a></p>' +
        '<p>Confirm receipt as soon as you can. <span class="flag" data-fid="f5">I\'m unavailable by phone</span> the next 2 hours but please proceed with the wire — I trust your judgement.</p>' +
        '<p>Thanks,<br>Sarah</p>' +
        '<p style="color:#6b6b90; font-size:11px;"><em>Sent from my iPhone</em></p>',
      attachments: [{ name: 'wire-instructions-q4.zip', protected: true }],
      flags: [
        { id: 'f1', category: 'greeting', label: 'Generic greeting "Hi James"', why: 'A real CFO who works with you regularly would use a familiar nickname or simply your first name — generic "Hi [firstname]" is a template footprint indicating mass-personalisation.' },
        { id: 'f2', category: 'urgency', label: 'Urgency cue: "end of business today"', why: 'Time pressure designed to short-circuit verification. Real CFO requests rarely come with a 6-hour deadline. Urgency + secrecy + money-ask = BEC red flag triad.' },
        { id: 'f3', category: 'isolation', label: 'Isolation cue: "Please don\'t loop anyone else in"', why: 'Classic BEC tactic — secrecy stops the target asking the real CFO to verify in person/Slack. Defense: out-of-band verification mandatory for any wire request.' },
        { id: 'f4', category: 'lookalike-url', label: 'Lookalike URL: corp-finance-secure.com', why: 'Typosquat domain registered to look corporate. Real corp.com domain would not delegate finance to a separate "secure" subdomain. Domain-age check (WHOIS) would show recent registration.' },
        { id: 'f5', category: 'pre-empt-verify', label: '"I\'m unavailable by phone" pre-empts verification', why: 'Real BEC almost always includes a "don\'t call me" line — the attacker can\'t actually pick up. Pre-emptive friction-removal of the obvious verification step.' },
        { id: 'f6', category: 'sender-mismatch', label: 'Display-name spoof (gmail.com)', why: 'Display name says "Sarah Chen, CFO" but address is gmail.com, not corp.com. Display names can be set to anything. Always check the actual email address.' },
        { id: 'f7', category: 'reply-to-mismatch', label: 'Reply-To mismatch with From', why: 'From claims corp.com (via display); Reply-To routes to corp-finance-secure.com — a different typosquat domain. Replies go to attacker, not Sarah.' },
        { id: 'f8', category: 'attachment', label: 'Password-protected attachment', why: 'Password-protected zips bypass corporate AV/sandbox scanning. Combined with "password in email above" framing — designed to slip through automated inspection.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to security', why: 'Correct call. Security team can investigate, alert others on the team who may have received the same template, and start the BEC defense workflow. This is the canonical SY0-701 answer.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Deleting hides the evidence and means others may still get hit by the same template. Report first, then delete after security confirms.' },
        reply: { isCorrect: false, label: 'Reply to verify', why: 'Replying confirms your address is monitored + routes the response to the attacker via the Reply-To trap. Out-of-band only — call Sarah on her known number.' },
        click: { isCorrect: false, label: 'Click the link', why: 'Clicking is the entire point of the attack. The link likely captures credentials or deploys malware. Never click suspect links.' },
        spam: { isCorrect: false, label: 'Mark as spam', why: 'Spam flag is a partial answer but doesn\'t alert security or warn other recipients. BEC needs active escalation, not passive filtering.' }
      },
      patternName: 'BEC display-name spoof + wire-fraud',
      patternBlurb: 'SY0-701 Domain 2.2. Defense triad: <strong>(1)</strong> verify out-of-band (call CFO on known number), <strong>(2)</strong> bank-detail/wire requests must use a separate approval channel, <strong>(3)</strong> finance team training to question urgency + isolation cues.'
    },
    // ──────────────────────────────────────────────────────────────────
    // 2) Microsoft password expiry — credential harvest
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'ms-password-expiry',
      title: 'Microsoft password expiry credential phish',
      vector: 'email',
      difficulty: 1,
      unlockAfter: [],
      category: 'credential-harvest',
      summary: '"Your Microsoft 365 password expires in 24h." Spoofed sender domain, link to credential harvest.',
      sender: { name: 'Microsoft 365 Account Team', email: 'no-reply@m1crosoft-365-security.com', avatar: 'MS', avatarColor: '#0078d4' },
      subject: 'Action required: Your password expires in 24 hours',
      to: 'jane.smith@corp.com',
      time: '14:22',
      bodyHtml: '<p style="font-family:Arial,sans-serif;"><img src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'20\' viewBox=\'0 0 80 20\'><text x=\'0\' y=\'15\' font-family=\'Arial\' font-size=\'14\' font-weight=\'bold\' fill=\'%230078d4\'>Microsoft</text></svg>" alt="Microsoft" style="display:block;margin-bottom:10px;"></p>' +
        '<p><span class="flag" data-fid="f1">Dear Customer,</span></p>' +
        '<p>Your Microsoft 365 password will expire in <strong><span class="flag" data-fid="f2">24 hours</span></strong>. To continue using your email and Office apps without interruption, please verify your account immediately.</p>' +
        '<p>Click below to keep your current password:</p>' +
        '<p><a href="#" style="background:#0078d4;color:#fff;padding:8px 18px;text-decoration:none;border-radius:4px;display:inline-block;"><span class="flag" data-fid="f3">Keep My Password →</span></a></p>' +
        '<p style="font-size:11px;color:#888;">If you do not verify within 24 hours, your account will be <span class="flag" data-fid="f4">permanently disabled</span>.</p>' +
        '<p style="font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:8px;margin-top:14px;"><span class="flag" data-fid="f5">© 2024 Microsoft Corporation. All rights reserved.</span></p>',
      attachments: [],
      flags: [
        { id: 'f1', category: 'greeting', label: 'Generic greeting "Dear Customer"', why: 'Microsoft has your full name + email + tenant info. They never address you as "Dear Customer" — generic greetings indicate mass phish.' },
        { id: 'f2', category: 'urgency', label: 'Urgency cue: "24 hours"', why: 'Microsoft password-expiry warnings come 14+ days in advance, not 24 hours. Tight deadlines = panic engineering.' },
        { id: 'f3', category: 'lookalike-url', label: 'Hover URL different from visible link', why: 'The "Keep My Password" button visibly says it does that, but hovering reveals the actual destination (typosquat or credential-harvest URL). Always hover before clicking.' },
        { id: 'f4', category: 'urgency', label: 'Threat: "permanently disabled"', why: 'Microsoft never permanently disables for missed password-renewal. Threats of irreversible consequences = social engineering.' },
        { id: 'f5', category: 'branding', label: 'Outdated copyright year', why: 'Microsoft\'s official emails always use the current year. Stale year = template was reused from a previous campaign.' },
        { id: 'f6', category: 'sender-mismatch', label: 'Lookalike sender domain (m1crosoft)', why: 'Number "1" replacing letter "i" in m1crosoft-365-security.com. Real Microsoft uses microsoft.com / office.com — not third-party "security" subdomains.' },
        { id: 'f7', category: 'header-anomaly', label: 'No DKIM/SPF alignment with claimed brand', why: 'Real Microsoft email passes DMARC/DKIM with proper SPF alignment. This message would fail those checks (visible in headers).' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to security', why: 'Right call. Security team alerts other recipients + may detect a campaign hitting multiple users. Microsoft accepts phish reports too (junk@office365.microsoft.com).' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t alert security or other recipients who may also be targeted. Report first.' },
        reply: { isCorrect: false, label: 'Reply', why: 'Replies confirm your email is live + may trigger more phish to your address. Never reply to phish.' },
        click: { isCorrect: false, label: 'Click the link', why: 'Clicking is the attack. The link likely opens a fake Microsoft login page that captures your password.' },
        spam: { isCorrect: false, label: 'Mark as spam', why: 'Filters this message but doesn\'t protect colleagues. Report so security can mass-alert.' }
      },
      patternName: 'Credential-harvest phish (Microsoft brand impersonation)',
      patternBlurb: 'SY0-701 Domain 2.2. Always check sender address (not display name), hover links before clicking, verify password-expiry through your IT portal directly.'
    },
    // ──────────────────────────────────────────────────────────────────
    // 3) Vendor invoice update — sophisticated BEC variant
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'vendor-invoice-update',
      title: 'Vendor invoice "bank account update"',
      vector: 'email',
      difficulty: 3,
      unlockAfter: ['cfo-bec-wire-fraud'],
      category: 'bec',
      summary: 'Real vendor\'s account compromised; attacker emails from legit address requesting bank-detail change for next invoice cycle.',
      sender: { name: 'Patricia Wong (AcmeSupplies)', email: 'patricia.wong@acmesupplies.com', avatar: 'PW', avatarColor: '#22c55e' },
      subject: 'Updated payment instructions for upcoming invoices',
      to: 'accounts.payable@corp.com',
      time: '11:08',
      bodyHtml: '<p>Hi AP team,</p>' +
        '<p>Hope you\'re doing well. I\'m writing to let you know our finance team has <span class="flag" data-fid="f1">recently switched our banking provider</span> and updated payment instructions for AcmeSupplies invoices going forward.</p>' +
        '<p>For your records, please update our payment details to:</p>' +
        '<p style="background:#f7f8fc;padding:10px;border-radius:6px;font-family:monospace;">Account name: <span class="flag" data-fid="f2">AcmeSupplies International Holdings Ltd</span><br>IBAN: GB29 NWBK 6016 1331 9268 19<br>SWIFT: <span class="flag" data-fid="f3">NWBKGB2L</span><br>Bank: NatWest, London</p>' +
        '<p>This applies to <span class="flag" data-fid="f4">all invoices from this week onward</span> — please update your master records before processing the August batch.</p>' +
        '<p><span class="flag" data-fid="f5">No need to send written confirmation</span> — just update your system. If you have questions feel free to email me here.</p>' +
        '<p>Thanks,<br>Patricia<br>AcmeSupplies Accounts</p>',
      attachments: [{ name: 'updated-payment-instructions.pdf', protected: false }],
      flags: [
        { id: 'f1', category: 'process-bypass', label: 'Bank change with no advance notice', why: 'Legitimate vendor bank-detail changes follow contractual notification protocols (signed letter, 30+ days notice, finance-to-finance phone confirmation). Email-only request bypasses controls.' },
        { id: 'f2', category: 'entity-mismatch', label: 'Account name doesn\'t match vendor entity', why: '"AcmeSupplies International Holdings Ltd" vs your vendor record likely showing "AcmeSupplies Inc" or similar. Subtle entity-name mismatches are favoured for fraud (legitimate-sounding but routes to attacker).' },
        { id: 'f3', category: 'jurisdiction-mismatch', label: 'New jurisdiction (UK NatWest) for US/local vendor', why: 'Vendor in your domestic country suddenly switching to international bank = red flag. Cross-border bank changes require enhanced verification.' },
        { id: 'f4', category: 'urgency', label: 'Urgency: "all invoices from this week onward"', why: 'Urgency engineered to push the change through before AP can verify. Legit changes specify a future effective date with verification window.' },
        { id: 'f5', category: 'pre-empt-verify', label: '"No need to send written confirmation"', why: 'Bank-detail changes ALWAYS require written confirmation per any reasonable AP control framework. Pre-emptive removal of verification = fraud signal.' },
        { id: 'f6', category: 'sender-mismatch', label: 'Sender email is legitimate (compromised account)', why: 'The address is real — Patricia\'s real account was compromised (or she\'s been internally compromised). This is sophisticated BEC where the email looks 100% legitimate.' },
        { id: 'f7', category: 'absence-of-context', label: 'No reference to recent invoices or interactions', why: 'Real vendor messages reference recent purchase orders, conversations, project context. Generic "for upcoming invoices" suggests a templated attack rather than relationship-aware comms.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to security + verify out-of-band', why: 'Correct. Sender account is likely compromised — but the request must be confirmed via signed letter + phone-back to known number (not the one in any email). Security will coordinate.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Vendor account may genuinely be compromised affecting multiple AP processes — delete loses evidence + doesn\'t alert AcmeSupplies that they need to investigate.' },
        reply: { isCorrect: false, label: 'Reply to confirm', why: 'Replying to a possibly-compromised account routes your confirmation to the attacker. Out-of-band verification only.' },
        click: { isCorrect: false, label: 'Update the system as requested', why: 'Trap. This is the action the attacker wants. Bank-detail changes ALWAYS require enhanced verification. Refuse to act on email alone.' },
        spam: { isCorrect: false, label: 'Mark as spam', why: 'Sender address is legitimate — spam-flag will be undone or override company allowlist. Report + verify out-of-band.' }
      },
      patternName: 'Vendor BEC (compromised legitimate sender)',
      patternBlurb: 'SY0-701 Domain 2.2. Hardest phish to spot — sender address is legitimate. Defense: process-based, not email-based. Bank-detail changes require signed letter + phone-back to known number + AP supervisor approval.'
    },
    // ──────────────────────────────────────────────────────────────────
    // 4) IT helpdesk MFA reset — credential harvest
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'it-mfa-reset',
      title: 'IT helpdesk MFA reset request',
      vector: 'email',
      difficulty: 2,
      unlockAfter: [],
      category: 'credential-harvest',
      summary: '"IT" emailing about new MFA enrolment requirement. Lookalike helpdesk URL, urgency cues.',
      sender: { name: 'IT Helpdesk', email: 'helpdesk@corp-it-support.com', avatar: 'IT', avatarColor: '#06b6d4' },
      subject: 'Required: Re-enrol MFA before policy deadline',
      to: 'michael.chen@corp.com',
      time: '08:14',
      bodyHtml: '<p>Hello Michael,</p>' +
        '<p>As part of our <span class="flag" data-fid="f1">new corporate security policy rollout</span>, all employees must re-enrol their multi-factor authentication (MFA) before <strong><span class="flag" data-fid="f2">end of day Friday</span></strong>.</p>' +
        '<p>Please log in to the helpdesk portal to complete the re-enrolment:</p>' +
        '<p><a href="#"><span class="flag" data-fid="f3">https://corp-it-support.com/mfa-enrol/</span></a></p>' +
        '<p><span class="flag" data-fid="f4">Failure to comply will result in account suspension.</span></p>' +
        '<p>If you experience any difficulty, please reply to this email and our team will assist you directly.</p>' +
        '<p>Best regards,<br>IT Helpdesk Team<br><span class="flag" data-fid="f5">Corporate IT Support Services</span></p>',
      attachments: [],
      flags: [
        { id: 'f1', category: 'corp-policy-impersonation', label: '"New corporate security policy"', why: 'Real IT policy changes are announced through HR + town halls + the IT internal portal — not surprise emails. Verify any "new policy" via the official channels.' },
        { id: 'f2', category: 'urgency', label: 'Tight deadline: "end of day Friday"', why: 'Real IT policies give 30+ days for fleet-wide changes like MFA re-enrolment. Tight deadlines = engineered panic.' },
        { id: 'f3', category: 'lookalike-url', label: 'Lookalike helpdesk URL (corp-it-support.com)', why: 'Real corp helpdesk would be at helpdesk.corp.com or it.corp.com — internal subdomain, not external "support" domain. Always verify portal URLs against your bookmarks.' },
        { id: 'f4', category: 'urgency', label: 'Threat: "account suspension"', why: 'Real IT doesn\'t suspend accounts for missed MFA re-enrolment without escalation through HR + manager. Direct-to-suspension threats = social engineering.' },
        { id: 'f5', category: 'branding', label: 'Generic team name "Corporate IT Support Services"', why: 'Real corp IT identifies as the actual team name (e.g. "Information Security" or "Tech Operations"). Generic-sounding "Support Services" sounds plausible but matches a phishing template.' },
        { id: 'f6', category: 'sender-mismatch', label: 'External sender domain', why: 'corp-it-support.com is external — your real IT would email from corp.com or @corp-internal addresses. Domain-mismatch is the single biggest tell.' },
        { id: 'f7', category: 'reply-trap', label: '"Reply to this email" reply-loop', why: 'Asking the user to reply for help routes any concerns directly to the attacker — who can then social-engineer further (e.g. "OK send me your current password to reset for you").' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to security', why: 'Right call. Security can verify whether IT actually has any MFA re-enrolment campaign + alert other recipients. Verify via the official IT portal at corp.com/it.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t alert security to the campaign. Report first.' },
        reply: { isCorrect: false, label: 'Reply for help', why: 'Routes you to the attacker who will continue the social engineering. Always verify IT messages via known internal channels.' },
        click: { isCorrect: false, label: 'Click the enrolment link', why: 'Clicking exposes you to the credential-capture page mimicking your real corp login. Bookmark your real IT portal + only use that.' },
        spam: { isCorrect: false, label: 'Mark as spam', why: 'Filters this email but doesn\'t alert IT or other recipients. Report so security can confirm + warn org-wide.' }
      },
      patternName: 'IT helpdesk impersonation (credential harvest)',
      patternBlurb: 'SY0-701 Domain 2.2. IT impersonation is high-yield because users instinctively trust IT. Defense: bookmark official portals, never click IT links from email — type the URL directly.'
    },
    // ──────────────────────────────────────────────────────────────────
    // 5) Bank fraud alert — callback scam
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'bank-fraud-callback',
      title: 'Bank "fraud alert" with callback number',
      vector: 'email',
      difficulty: 2,
      unlockAfter: [],
      category: 'callback-scam',
      summary: '"Suspicious activity on your account." Provides callback number that routes to scammer call center.',
      sender: { name: 'Chase Online Banking', email: 'security-alert@chase-online-banking.com', avatar: 'CB', avatarColor: '#117ACA' },
      subject: '🚨 Suspicious activity detected on your account ending 4271',
      to: 'recipient@corp.com',
      time: '17:42',
      bodyHtml: '<p style="font-family:Arial,sans-serif;background:#117ACA;color:#fff;padding:8px 14px;font-weight:bold;">Chase Online Banking</p>' +
        '<p style="font-family:Arial,sans-serif;">Dear Valued Customer,</p>' +
        '<p>We detected a <span class="flag" data-fid="f1">suspicious charge of $487.32</span> on your debit card ending 4271 at <span class="flag" data-fid="f2">"BestBuy Canada"</span>.</p>' +
        '<p>If you authorized this transaction, no action is needed.</p>' +
        '<p>If <strong>you did NOT authorize this charge</strong>, please call us immediately:</p>' +
        '<p style="text-align:center;font-size:18px;font-weight:bold;color:#117ACA;"><span class="flag" data-fid="f3">📞 1-877-555-FAKE (3253)</span></p>' +
        '<p style="color:#dc2626;"><span class="flag" data-fid="f4">⚠ Failure to confirm within 30 minutes will result in your card being permanently locked.</span></p>' +
        '<p>For your security, do not click any links — call us using the number above.</p>',
      attachments: [],
      flags: [
        { id: 'f1', category: 'specific-amount', label: 'Specific transaction amount + merchant', why: 'Crafted to feel real ("$487.32 at BestBuy Canada" sounds plausible). Real bank fraud alerts come via the bank app, NOT email. Specific details create authenticity but the channel is wrong.' },
        { id: 'f2', category: 'jurisdiction-mismatch', label: 'Foreign-merchant tease', why: 'Cross-border charge ("BestBuy Canada") creates emotional response. Engineered to make you panic + want to act fast.' },
        { id: 'f3', category: 'callback-scam', label: 'Callback number not on physical card', why: 'Real bank fraud-alerts direct you to the number on the back of your physical card or to log in to the official app — never to a number printed in the email itself. Callback scam = pure social-engineering channel.' },
        { id: 'f4', category: 'urgency', label: 'Urgency: "30 minutes"', why: 'Real banks freeze your card automatically + give you weeks to dispute. 30-minute deadlines force panic-call to the scammer.' },
        { id: 'f5', category: 'sender-mismatch', label: 'Sender domain not chase.com', why: 'Real Chase emails come from chase.com or chase-services.com (their actual subdomain). "chase-online-banking.com" is a typosquat.' },
        { id: 'f6', category: 'preempt-link', label: '"Do not click any links" misdirection', why: 'Sounds responsible but is the social-engineering hook — pushes you to call the bad number instead. Real banks never redirect you to a phone number via email like this.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to security + verify via bank app', why: 'Correct. Report to security so they alert others. Verify any real card activity via your bank\'s official app or by calling the number on the back of your physical card.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t alert security. Could affect colleagues with the same bank.' },
        reply: { isCorrect: false, label: 'Reply', why: 'Confirms your email is live to the attacker.' },
        click: { isCorrect: false, label: 'Call the number', why: 'Routes you to the scam call center where they\'ll social-engineer your card details + verification info to drain your account.' },
        spam: { isCorrect: false, label: 'Mark as spam', why: 'Filters this but doesn\'t alert security or warn colleagues.' }
      },
      patternName: 'Callback scam (bank impersonation)',
      patternBlurb: 'SY0-701 Domain 2.2. Callback scams bypass email-link defenses by routing you through the phone. Defense: only use the phone number on the back of your physical card or in your bank\'s app.'
    },
    // ──────────────────────────────────────────────────────────────────
    // 6) CEO gift card request — BEC variant (low-cost test)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'ceo-gift-card',
      title: '"CEO" urgent gift card request',
      vector: 'email',
      difficulty: 2,
      unlockAfter: [],
      category: 'bec',
      summary: 'CEO display-name spoof requesting urgent gift card purchases for "client appreciation".',
      sender: { name: 'David Kim, CEO', email: 'david.k.ceo@gmail.com', avatar: 'DK', avatarColor: '#a855f7' },
      subject: 'Quick favor — need your help',
      to: 'sarah.johnson@corp.com',
      time: '15:33',
      bodyHtml: '<p><span class="flag" data-fid="f1">Hi Sarah,</span></p>' +
        '<p>Are you available right now? I need a quick favor and don\'t have time to explain over a call — <span class="flag" data-fid="f2">I\'m heading into a board meeting in 10 minutes</span>.</p>' +
        '<p>I need to send <span class="flag" data-fid="f3">$500 in Apple gift cards</span> to a key client as part of our appreciation program. Could you pick them up and email me the codes? I\'ll reimburse you on expense report.</p>' +
        '<p><span class="flag" data-fid="f4">Please don\'t mention this to anyone</span> — it\'s tied to a pending deal we haven\'t announced yet.</p>' +
        '<p>Thanks for jumping on this!<br>David</p>' +
        '<p style="color:#888;font-size:11px;"><em>Sent from my mobile</em></p>',
      attachments: [],
      flags: [
        { id: 'f1', category: 'sender-mismatch', label: 'Display-name spoof (gmail.com)', why: 'Display says CEO David Kim but address is david.k.ceo@gmail.com. Real CEO uses corp.com address. Display-name spoofing is trivial.' },
        { id: 'f2', category: 'urgency', label: 'Urgency: "board meeting in 10 minutes"', why: 'Time pressure designed to bypass verification. Real CEO would have someone else handle this if they\'re too busy.' },
        { id: 'f3', category: 'gift-card-redflag', label: 'Gift cards as the requested action', why: 'Gift cards are the #1 BEC indicator. Real corporate spending uses purchase orders + expense systems. CEO never asks employees to buy gift cards via email.' },
        { id: 'f4', category: 'isolation', label: 'Isolation: "Please don\'t mention this to anyone"', why: 'Classic BEC. Secrecy stops you asking the real CEO via in-person/Slack to verify. Defense: ALWAYS verify out-of-band before any unusual money movement.' },
        { id: 'f5', category: 'process-bypass', label: '"I\'ll reimburse on expense report"', why: 'Real corporate gifts go through marketing/sales budgets, not personal reimbursement. Expense-report-after framing bypasses procurement controls.' },
        { id: 'f6', category: 'mobile-pretext', label: '"Sent from my mobile" excuse for brevity/typos', why: 'Mobile signature creates plausible cover for unusual brevity, missing context, or typos. Pre-empts "this doesn\'t sound like the CEO" objections.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to security', why: 'Correct call. Gift card BEC is one of the most common BEC variants. Security alerts other recipients + the team can warn org-wide.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Misses the chance to alert security + warn colleagues. Report.' },
        reply: { isCorrect: false, label: 'Reply to ask', why: 'Replies route to the attacker. Verify out-of-band — find David\'s real number via the company directory and call.' },
        click: { isCorrect: false, label: 'Buy the gift cards', why: 'You\'ve handed $500 to the attacker. Gift cards are untraceable + unrecoverable. Never act on email alone.' },
        spam: { isCorrect: false, label: 'Mark as spam', why: 'Filters this but doesn\'t protect colleagues from the same template. Report.' }
      },
      patternName: 'Gift-card BEC (CEO impersonation)',
      patternBlurb: 'SY0-701 Domain 2.2. Gift-card BEC is the #1 most-attempted BEC variant globally. Defense: organisational policy that no exec ever requests gift cards via email + any unusual money movement requires out-of-band verification.'
    },
    // ──────────────────────────────────────────────────────────────────
    // 7) DocuSign contract — brand impersonation + malicious attachment (v4.98.1)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'docusign-contract',
      title: '"DocuSign" contract requires signature',
      vector: 'email',
      difficulty: 2,
      unlockAfter: [],
      category: 'credential-harvest',
      summary: 'Fake DocuSign envelope with "View Document" button leading to credential-harvest. Brand impersonation classic.',
      sender: { name: 'DocuSign', email: 'no-reply@docusign-electronic-services.net', avatar: 'DS', avatarColor: '#FFCC22' },
      subject: 'You have a document waiting for signature: Q4 Master Service Agreement',
      to: 'recipient@corp.com',
      time: '11:42',
      bodyHtml: '<div style="background:#FFCC22;color:#000;padding:8px 14px;font-weight:bold;">DocuSign</div>' +
        '<p><span class="flag" data-fid="f1">Hello,</span></p>' +
        '<p>You have received a document that requires your signature:</p>' +
        '<p style="background:#f7f8fc;padding:12px;border-radius:6px;font-family:monospace;">📄 Q4_Master_Service_Agreement_FINAL.docx<br>From: <span class="flag" data-fid="f2">Legal Team</span><br>Sent: today</p>' +
        '<p><a href="#" style="background:#0079D6;color:#fff;padding:10px 22px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;"><span class="flag" data-fid="f3">VIEW DOCUMENT</span></a></p>' +
        '<p style="font-size:11px;color:#888;"><span class="flag" data-fid="f4">This document expires in 24 hours.</span></p>' +
        '<p style="font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:8px;margin-top:14px;">DocuSign is the global leader in eSignature. <span class="flag" data-fid="f5">© 2023 DocuSign Inc.</span></p>',
      attachments: [{ name: 'Q4_Master_Service_Agreement.htm', protected: false }],
      flags: [
        { id: 'f1', category: 'greeting', label: 'Generic greeting "Hello"', why: 'Real DocuSign emails address you by name + the specific document title from the sender. Generic "Hello" = template footprint.' },
        { id: 'f2', category: 'sender-vague', label: 'Vague sender "Legal Team"', why: 'Real DocuSign envelopes show the actual sender\'s name + email. "Legal Team" is generic + unverifiable.' },
        { id: 'f3', category: 'lookalike-url', label: 'Hover URL ≠ DocuSign', why: 'The "VIEW DOCUMENT" button hover reveals the real destination — a typosquat or credential-harvest URL. Real DocuSign links go to docusign.com / docusign.net.' },
        { id: 'f4', category: 'urgency', label: '"Expires in 24 hours" urgency', why: 'Real DocuSign envelopes expire weeks out, not 24 hours. Tight deadlines = panic engineering.' },
        { id: 'f5', category: 'branding', label: 'Outdated copyright year', why: 'Real DocuSign emails show the current year. Stale year = template was reused.' },
        { id: 'f6', category: 'sender-mismatch', label: 'Lookalike domain (docusign-electronic-services.net)', why: 'Real DocuSign uses docusign.com / docusign.net. "Electronic-services" is a typosquat.' },
        { id: 'f7', category: 'attachment-format', label: 'HTM attachment (not PDF)', why: 'DocuSign delivers via secure portal, not attachments. An HTM file is suspicious — likely a credential-harvest landing page that opens locally to evade scanners.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to security', why: 'Correct call. DocuSign-themed phish is high-yield because employees expect contract emails. Security alerts org-wide + may detect a campaign.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t alert security. Same template likely hits other employees expecting contracts.' },
        reply: { isCorrect: false, label: 'Reply', why: 'Replies to phish lookalike domains often route to attacker for follow-on social engineering.' },
        click: { isCorrect: false, label: 'View the document', why: 'The "VIEW DOCUMENT" button opens a credential-harvest page mimicking the real DocuSign login. Always verify by logging in to docusign.com directly.' },
        spam: { isCorrect: false, label: 'Mark as spam', why: 'Filters this but doesn\'t alert security or warn colleagues. Report instead.' }
      },
      patternName: 'Brand-impersonation phish (DocuSign)',
      patternBlurb: 'SY0-701 Domain 2.2. Brand-impersonation phish exploits trust in known services. Defense: bookmark the real service URL + always log in via the bookmark to view documents — never via email links.'
    },
    // ──────────────────────────────────────────────────────────────────
    // 8) GitHub security alert — dev-targeted (v4.98.1)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'github-security-alert',
      title: '"GitHub" security alert · suspicious sign-in',
      vector: 'email',
      difficulty: 2,
      unlockAfter: [],
      category: 'credential-harvest',
      summary: 'Dev-targeted GitHub impersonation. "Sign-in attempt from new device" with link to fake login page.',
      sender: { name: 'GitHub Security', email: 'security-alerts@github-noreply.com', avatar: 'GH', avatarColor: '#24292f' },
      subject: '⚠ A sign-in to your account was attempted from a new device',
      to: 'developer@corp.com',
      time: '02:14',
      bodyHtml: '<p style="font-family:Arial,sans-serif;background:#24292f;color:#fff;padding:8px 14px;font-weight:bold;">GitHub</p>' +
        '<p><span class="flag" data-fid="f1">Hi developer,</span></p>' +
        '<p>We noticed a new sign-in to your GitHub account from an unrecognized device:</p>' +
        '<p style="background:#f7f8fc;padding:12px;border-radius:6px;font-family:monospace;">Device: <span class="flag" data-fid="f2">Linux · Chrome 89</span><br>Location: <span class="flag" data-fid="f3">Saint Petersburg, RU</span><br>IP: 5.61.32.108<br>Time: 02:08 UTC</p>' +
        '<p>If this was you, no action is required. If this <strong>was NOT you</strong>:</p>' +
        '<p><a href="#" style="background:#2da44e;color:#fff;padding:8px 16px;text-decoration:none;border-radius:6px;"><span class="flag" data-fid="f4">Secure my account →</span></a></p>' +
        '<p style="font-size:11px;color:#888;">If you ignore this message, <span class="flag" data-fid="f5">your account access may be revoked within 12 hours</span> as a security measure.</p>' +
        '<p style="font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:8px;margin-top:14px;">GitHub Inc. · 88 Colin P Kelly Jr St, San Francisco, CA</p>',
      attachments: [],
      flags: [
        { id: 'f1', category: 'greeting', label: 'Generic greeting "Hi developer"', why: 'Real GitHub emails use your username (e.g. "Hi @yourusername"). Generic "Hi developer" = template not pulling from actual account data.' },
        { id: 'f2', category: 'detail-vague', label: 'Generic device fingerprint', why: 'Real GitHub shows specific device fingerprints — Chrome 89 is intentionally outdated to look plausible without being precise.' },
        { id: 'f3', category: 'fear-appeal', label: 'Foreign location for fear', why: '"Saint Petersburg, RU" is engineered to trigger fear + click. Real GitHub shows the location but doesn\'t engineer it for emotional response.' },
        { id: 'f4', category: 'lookalike-url', label: '"Secure my account" link', why: 'Hover reveals destination is NOT github.com. Real GitHub security links go to github.com/settings/security.' },
        { id: 'f5', category: 'urgency', label: 'Threat: account access revoked in 12h', why: 'Real GitHub never threatens account revocation in this timeframe. Threats = social engineering.' },
        { id: 'f6', category: 'sender-mismatch', label: 'Lookalike domain (github-noreply.com)', why: 'Real GitHub emails come from noreply@github.com or @github.com subdomains. "Github-noreply.com" is a separate domain.' },
        { id: 'f7', category: 'header-anomaly', label: 'No DKIM/SPF alignment with github.com', why: 'Real GitHub email passes DMARC/DKIM. This message would fail those checks (visible in raw headers).' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to security', why: 'Correct. Dev-targeted phish often spreads laterally — security alerts the dev team + may correlate with other activity.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t alert security. Could miss a campaign hitting multiple devs.' },
        reply: { isCorrect: false, label: 'Reply', why: 'Confirms your address is live + monitored.' },
        click: { isCorrect: false, label: 'Click "Secure my account"', why: 'Routes you to the credential-harvest page mimicking github.com/login. Always verify by logging in to github.com directly via your bookmark.' },
        spam: { isCorrect: false, label: 'Mark as spam', why: 'Filters this but doesn\'t alert security. Report so dev team can be warned.' }
      },
      patternName: 'GitHub credential-harvest (dev-targeted)',
      patternBlurb: 'SY0-701 Domain 2.2. Developers are high-value targets — GitHub creds unlock source repos + secrets. Defense: hardware MFA on all dev accounts + always navigate to github.com directly.'
    },
    // ──────────────────────────────────────────────────────────────────
    // 9) AWS account suspended — cloud account takeover (v4.98.1)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'aws-account-suspended',
      title: '"AWS" account suspension warning',
      vector: 'email',
      difficulty: 2,
      unlockAfter: [],
      category: 'credential-harvest',
      summary: '"Your AWS account will be suspended" with link to fake AWS console. Targets cloud admins.',
      sender: { name: 'AWS Notifications', email: 'no-reply@aws-notifications-billing.com', avatar: 'AW', avatarColor: '#FF9900' },
      subject: '🚨 URGENT: Your AWS account will be suspended in 24 hours',
      to: 'cloud-admin@corp.com',
      time: '06:18',
      bodyHtml: '<div style="background:#232F3E;color:#FF9900;padding:8px 14px;font-weight:bold;">aws</div>' +
        '<p><span class="flag" data-fid="f1">Dear AWS Customer,</span></p>' +
        '<p>We were unable to process your most recent payment for AWS services. Due to <span class="flag" data-fid="f2">multiple failed payment attempts</span>, your account is scheduled for <strong>suspension in 24 hours</strong>.</p>' +
        '<p>Affected services include:</p>' +
        '<ul style="font-family:monospace;font-size:12px;"><li>EC2 instances</li><li>RDS databases</li><li>S3 buckets</li><li>Route 53 DNS</li></ul>' +
        '<p>To prevent service interruption, please update your billing details immediately:</p>' +
        '<p><a href="#" style="background:#FF9900;color:#000;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:bold;"><span class="flag" data-fid="f3">Update Payment Details →</span></a></p>' +
        '<p style="color:#dc2626;"><span class="flag" data-fid="f4">Failure to act will result in permanent data loss.</span></p>',
      attachments: [],
      flags: [
        { id: 'f1', category: 'greeting', label: 'Generic greeting "Dear AWS Customer"', why: 'Real AWS billing emails address you by AWS account name + ID. Generic "Customer" = mass phish template.' },
        { id: 'f2', category: 'fear-appeal', label: '"Multiple failed payment attempts"', why: 'Engineered to create panic. Real AWS billing failures send specific reason codes + the affected payment method, not vague "multiple attempts".' },
        { id: 'f3', category: 'lookalike-url', label: '"Update Payment Details" link', why: 'Hover reveals destination is NOT aws.amazon.com. Real AWS billing links go to console.aws.amazon.com/billing.' },
        { id: 'f4', category: 'fear-appeal', label: 'Threat: "permanent data loss"', why: 'Real AWS gives extensive notice before any suspension + data is preserved during dispute periods. "Permanent data loss" within 24h = social engineering.' },
        { id: 'f5', category: 'sender-mismatch', label: 'Lookalike domain (aws-notifications-billing.com)', why: 'Real AWS uses @amazon.com or @aws.amazon.com. "Aws-notifications-billing.com" is registered as a phish domain.' },
        { id: 'f6', category: 'urgency', label: '24-hour suspension threat', why: 'Real AWS suspensions involve longer timelines + multiple notification channels (console banner, email, billing dashboard).' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to security', why: 'Correct. AWS-themed phish is high-impact because cloud admin creds unlock entire infrastructure. Security alerts cloud team + verifies billing via the actual console.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t alert security. Cloud team may want to confirm there\'s no actual billing issue via the real AWS console.' },
        reply: { isCorrect: false, label: 'Reply', why: 'Confirms your address is monitored + may trigger more cloud-targeted phish.' },
        click: { isCorrect: false, label: 'Update payment details', why: 'Routes you to a fake AWS console that captures your AWS root or admin credentials. Always log in to console.aws.amazon.com directly to check billing.' },
        spam: { isCorrect: false, label: 'Mark as spam', why: 'Filters this but doesn\'t protect colleagues with cloud admin access.' }
      },
      patternName: 'AWS credential-harvest (cloud admin targeting)',
      patternBlurb: 'SY0-701 Domain 2.2. Cloud admins are tier-zero targets. Defense: never act on cloud-billing emails — log in to the actual provider console via your bookmark.'
    },
    // ──────────────────────────────────────────────────────────────────
    // 10) HR benefits enrolment — credential harvest (v4.98.1, foundational)
    // ──────────────────────────────────────────────────────────────────
    {
      id: 'hr-benefits-enrolment',
      title: '"HR" benefits enrolment closing reminder',
      vector: 'email',
      difficulty: 1,
      unlockAfter: [],
      category: 'credential-harvest',
      summary: 'Fake HR portal link to capture employee SSO credentials. Foundational phish — easy to spot if you check.',
      sender: { name: 'HR Benefits Team', email: 'benefits@corp-hr-portal.net', avatar: 'HR', avatarColor: '#22c55e' },
      subject: 'REMINDER: Benefits enrolment closes Friday — action required',
      to: 'employee@corp.com',
      time: '13:08',
      bodyHtml: '<p><span class="flag" data-fid="f1">Hi Team Member,</span></p>' +
        '<p>This is a friendly reminder that benefits enrolment for the upcoming year closes <strong>this Friday</strong>. Please log in to the HR portal to confirm your selections:</p>' +
        '<p><a href="#" style="background:#22c55e;color:#fff;padding:9px 18px;text-decoration:none;border-radius:6px;font-weight:bold;"><span class="flag" data-fid="f2">Open Benefits Portal →</span></a></p>' +
        '<p>If you don\'t complete enrolment by the deadline, your selections from last year will be carried over and <span class="flag" data-fid="f3">cannot be changed for 12 months</span>.</p>' +
        '<p>For questions, please <span class="flag" data-fid="f4">reply to this email</span> and our team will assist.</p>' +
        '<p>Best regards,<br>HR Benefits Team</p>',
      attachments: [],
      flags: [
        { id: 'f1', category: 'greeting', label: 'Generic greeting "Hi Team Member"', why: 'Real corp HR uses your full name + employee ID. "Team Member" = template not pulling from HR data.' },
        { id: 'f2', category: 'lookalike-url', label: 'Hover URL ≠ HR portal', why: 'The "Open Benefits Portal" button hover reveals a typosquat URL, not your real corp HR portal at hr.corp.com or similar.' },
        { id: 'f3', category: 'fear-appeal', label: 'Lock-in threat: 12 months', why: 'Real HR processes have grace periods + manager override. "Cannot be changed for 12 months" is engineered fear.' },
        { id: 'f4', category: 'reply-trap', label: '"Reply to this email" reply-loop', why: 'Routes responses to attacker who continues social engineering. Real HR has a portal ticket system + known phone number.' },
        { id: 'f5', category: 'sender-mismatch', label: 'External sender (corp-hr-portal.net)', why: 'Real corp HR emails come from corp.com domain. "Corp-hr-portal.net" is external + likely typosquat.' },
        { id: 'f6', category: 'urgency', label: 'Friday deadline pressure', why: 'Tight deadline + emotional benefits-loss = panic-click. Verify enrolment status via your real HR portal.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to security', why: 'Correct. HR-themed phish is widespread because everyone gets HR emails. Security alerts org-wide + correlates with any other HR activity.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t alert security. Colleagues may also be targeted with the same template.' },
        reply: { isCorrect: false, label: 'Reply for help', why: 'Routes to the attacker who will continue social engineering.' },
        click: { isCorrect: false, label: 'Open the portal', why: 'Routes to credential-harvest page mimicking your real HR portal. Always navigate to your real HR portal via the company directory or bookmark.' },
        spam: { isCorrect: false, label: 'Mark as spam', why: 'Partial — doesn\'t alert HR or security to the campaign.' }
      },
      patternName: 'HR-themed credential phish',
      patternBlurb: 'SY0-701 Domain 2.2. HR phish is mass-deployed because every employee gets HR emails. Defense: bookmark + always navigate to corp HR portal directly — never via email links.'
    },
    // ──────────────────────────────────────────────────────────────────
    // ════════════════════════ SMISHING (v4.98.1) ════════════════════
    // 6 SMS phish · vector: 'sms' · phone-frame UI in app.js
    // ──────────────────────────────────────────────────────────────────
    // 11) Bank fraud SMS — the canonical (mockup state 5)
    {
      id: 'bank-fraud-smish',
      title: 'Bank "fraud alert" smish',
      vector: 'sms',
      difficulty: 2,
      unlockAfter: [],
      category: 'callback-scam',
      summary: 'SMS impersonating bank with fake fraud alert + reply-keyword + short link.',
      senderId: 'BANK-ALERT',
      time: 'Today · 9:13 AM',
      bodyHtml: '<span class="flag" data-fid="f1">🚨 ALERT</span>: We detected a suspicious charge of <strong>$487.00</strong> on your debit card ending 4271. <span class="flag" data-fid="f2">Reply YES if authorized, NO if fraud.</span><br><br>Or visit: <span class="flag" data-fid="f3">bit.ly/cap-fraud-7K2x</span><br><br><span class="flag" data-fid="f4">Failure to respond within 30 min</span> will result in card lock. <span class="flag" data-fid="f5">Call back: 1-800-FAKE-BANK</span>',
      flags: [
        { id: 'f1', category: 'urgency', label: 'Visual alarm "🚨 ALERT"', why: 'Real bank fraud alerts come via the bank app, not SMS. Visual alarm + emoji is engineered for emotional response.' },
        { id: 'f2', category: 'reply-trap', label: 'Reply-keyword fishing', why: 'Replying YES/NO confirms your number is monitored + signals to scammer that you\'re reachable. Real banks never ask you to reply YES/NO via SMS for fraud.' },
        { id: 'f3', category: 'shortened-url', label: 'Shortened URL (bit.ly)', why: 'Hides the real destination. Banks never use third-party URL shorteners for fraud alerts.' },
        { id: 'f4', category: 'urgency', label: '30-minute deadline', why: 'Real banks freeze cards automatically + give days/weeks to dispute. 30 min = engineered panic.' },
        { id: 'f5', category: 'callback-scam', label: 'Callback number not on physical card', why: 'Real bank fraud-alerts direct you to the number on your physical card. The number in the SMS routes to the scam call center.' },
        { id: 'f6', category: 'sender-id-mismatch', label: 'Custom sender ID "BANK-ALERT"', why: 'Real banks send via your registered short code or actual bank phone number, not custom-branded sender IDs.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + forward as phish', why: 'Correct. Forward to 7726 (SPAM) + your security team. Verify any actual card activity via your bank\'s official app.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t alert security or carrier. Forward to 7726 instead.' },
        reply: { isCorrect: false, label: 'Reply YES', why: 'Confirms your number is live + reachable. Scammer escalates with follow-on calls/SMS.' },
        click: { isCorrect: false, label: 'Tap the link', why: 'Routes to credential-harvest page mimicking your bank login. Always log in via the bank\'s official app.' },
        spam: { isCorrect: false, label: 'Block sender', why: 'Step in the right direction but doesn\'t alert security or carrier. Forward to 7726 first, then block.' }
      },
      patternName: 'Smishing (callback scam)',
      patternBlurb: 'SY0-701 Domain 2.2. SMS-based phish bypass email defenses entirely. Defense: never act on SMS for financial/account changes — verify via the official app + the number on your physical card.'
    },
    // 12) Package delivery SMS
    {
      id: 'package-delivery-smish',
      title: 'USPS package delivery failure smish',
      vector: 'sms',
      difficulty: 1,
      unlockAfter: [],
      category: 'credential-harvest',
      summary: 'Fake package delivery failure with link to "reschedule" → credential capture.',
      senderId: '+1 (959) 555-0142',
      time: 'Today · 11:32 AM',
      bodyHtml: '<span class="flag" data-fid="f1">USPS</span>: Your package <strong>USPS9X3K-471</strong> could not be delivered due to <span class="flag" data-fid="f2">incomplete address</span>. To reschedule delivery, please update your details: <span class="flag" data-fid="f3">tinyurl.com/usps-resched-1471</span><br><br><span class="flag" data-fid="f4">Action required within 24 hours</span> to avoid return-to-sender.',
      flags: [
        { id: 'f1', category: 'sender-id-mismatch', label: 'Branded "USPS" from random number', why: 'Real USPS sends from registered shortcodes, not random 10-digit numbers. The brand-name in the message body is a sender-trust hack.' },
        { id: 'f2', category: 'detail-vague', label: 'Vague "incomplete address" reason', why: 'Real USPS gives specific reasons (apartment number missing, etc.). Vague reasons = generic phish template.' },
        { id: 'f3', category: 'shortened-url', label: 'Shortened URL (tinyurl)', why: 'Hides destination. Real USPS uses usps.com/redelivery — never URL shorteners.' },
        { id: 'f4', category: 'urgency', label: '24-hour return threat', why: 'Real USPS gives 5-15 business days. Tight deadline = panic engineering.' },
        { id: 'f5', category: 'unsolicited', label: 'You weren\'t expecting a package', why: 'If you didn\'t order anything, the SMS is for someone else (or it\'s phish). Mass-send = phish.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + forward to 7726', why: 'Correct. USPS-themed smishing is one of the most common SMS phish in the US. Forwarding to 7726 helps carriers block the campaign.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Forward to 7726 first so carrier can act.' },
        reply: { isCorrect: false, label: 'Reply for help', why: 'Confirms your number is monitored.' },
        click: { isCorrect: false, label: 'Reschedule via the link', why: 'Routes to credential-harvest page or installs malware on your phone.' },
        spam: { isCorrect: false, label: 'Block sender', why: 'Number rotates. Forward to 7726 first.' }
      },
      patternName: 'Smishing (package delivery scam)',
      patternBlurb: 'SY0-701 Domain 2.2. Package smishing exploits everyone\'s ambiguity ("did I order something?"). Defense: track packages via the carrier\'s official app, never via SMS links.'
    },
    // 13) IRS tax refund SMS
    {
      id: 'irs-refund-smish',
      title: '"IRS" tax refund SMS scam',
      vector: 'sms',
      difficulty: 1,
      unlockAfter: [],
      category: 'credential-harvest',
      summary: 'Fake IRS tax refund notice. Government impersonation always = scam.',
      senderId: '+1 (202) 555-0418',
      time: 'Today · 2:14 PM',
      bodyHtml: '<span class="flag" data-fid="f1">IRS</span>: You are eligible for a <strong>$1,247 tax refund</strong>. <span class="flag" data-fid="f2">Click below to claim:</span><br><br><span class="flag" data-fid="f3">irs-refund-claim.gov-services.com</span><br><br><span class="flag" data-fid="f4">Reference: REF-2024-X371</span>',
      flags: [
        { id: 'f1', category: 'sender-id-mismatch', label: 'Branded "IRS" from regular number', why: 'The IRS does NOT contact taxpayers via SMS — ever. Any "IRS" SMS is 100% phish.' },
        { id: 'f2', category: 'click-pressure', label: '"Click below to claim" pressure', why: 'Real refunds arrive via direct deposit or check, never via "click to claim" links.' },
        { id: 'f3', category: 'lookalike-url', label: 'Lookalike domain (gov-services.com)', why: 'Real IRS uses irs.gov ONLY. "Gov-services.com" is a typosquat designed to look official.' },
        { id: 'f4', category: 'fake-reference', label: 'Fake reference number', why: 'Specific-looking reference designed to feel official. Real IRS notices reference your specific tax year + filing.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + forward to 7726 + IRS', why: 'Correct. The IRS has a phishing report email (phishing@irs.gov). Forward AND alert security.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t help others. Report to 7726 + irs.gov phishing.' },
        reply: { isCorrect: false, label: 'Reply', why: 'Confirms your number is reachable.' },
        click: { isCorrect: false, label: 'Click to claim', why: 'Routes to credential-harvest. Real IRS uses postal mail; never SMS or email for refunds.' },
        spam: { isCorrect: false, label: 'Block sender', why: 'Number rotates daily. Report first.' }
      },
      patternName: 'Government-impersonation smishing',
      patternBlurb: 'SY0-701 Domain 2.2. Critical fact: <strong>The IRS NEVER contacts taxpayers via SMS or email about refunds.</strong> Any SMS claiming to be IRS = 100% phish.'
    },
    // 14) Microsoft 2FA code SMS
    {
      id: 'ms-2fa-smish',
      title: '"Microsoft" 2FA code request smish',
      vector: 'sms',
      difficulty: 2,
      unlockAfter: ['bank-fraud-smish'],
      category: 'mfa-fatigue',
      summary: 'Fake Microsoft 2FA notice asking you to forward your code. Critical: never share 2FA codes.',
      senderId: 'Microsoft',
      time: 'Today · 10:18 AM',
      bodyHtml: '<span class="flag" data-fid="f1">Microsoft</span>: Your verification code is <strong>738291</strong>. <span class="flag" data-fid="f2">If you did not request this, please reply with your code</span> so we can verify and block the request.<br><br>For your security, do not share this code with anyone.',
      flags: [
        { id: 'f1', category: 'sender-id-mismatch', label: 'Branded sender ID "Microsoft"', why: 'Real Microsoft 2FA codes come via the Authenticator app or registered short code. Sender ID can be spoofed.' },
        { id: 'f2', category: 'mfa-fatigue', label: 'Asking you to "reply with your code"', why: 'CRITICAL: Microsoft NEVER asks you to share 2FA codes — even with their support. The whole purpose of 2FA is that the code stays with you.' },
        { id: 'f3', category: 'self-contradiction', label: 'Self-contradicting message', why: '"Reply with your code" + "do not share with anyone" is internal contradiction designed to confuse + bypass critical thinking.' },
        { id: 'f4', category: 'social-engineering', label: '"Block the request" framing', why: 'Frames sharing the code as the secure action, when it\'s the opposite. Cognitive judo.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + change Microsoft password', why: 'Correct. The fact that you got a real Microsoft 2FA code means an attacker has your password. Report + change immediately + check sign-in history.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t address the underlying issue: an attacker has your password. Investigate first.' },
        reply: { isCorrect: false, label: 'Reply with the code', why: 'Hands the attacker your account. NEVER share 2FA codes. Microsoft never asks.' },
        click: { isCorrect: false, label: 'Click any link', why: 'No link in this one — but the trap is replying. The entire point is the reply-with-code social engineering.' },
        spam: { isCorrect: false, label: 'Block sender', why: 'Doesn\'t fix the underlying password compromise. Report + change password.' }
      },
      patternName: 'MFA-fatigue smishing (code-share scam)',
      patternBlurb: 'SY0-701 Domain 2.2. CRITICAL RULE: NEVER share 2FA codes with anyone — including support, IT, or the company itself. The purpose of 2FA is the code stays with you.'
    },
    // 15) Apple ID locked SMS
    {
      id: 'apple-id-locked-smish',
      title: '"Apple" ID locked smish',
      vector: 'sms',
      difficulty: 1,
      unlockAfter: [],
      category: 'credential-harvest',
      summary: '"Your Apple ID was locked" with link to fake Apple sign-in page.',
      senderId: '+1 (888) 555-0237',
      time: 'Today · 8:42 AM',
      bodyHtml: '<span class="flag" data-fid="f1">Apple</span>: Your Apple ID has been <span class="flag" data-fid="f2">locked due to suspicious activity</span>. To unlock, verify your identity at <span class="flag" data-fid="f3">apple-id-verify.com</span> within <span class="flag" data-fid="f4">12 hours</span> or your account will be permanently disabled.',
      flags: [
        { id: 'f1', category: 'sender-id-mismatch', label: 'Branded "Apple" from regular number', why: 'Real Apple sends ID-related notifications via push to your devices, not SMS from random numbers.' },
        { id: 'f2', category: 'fear-appeal', label: '"Suspicious activity" panic', why: 'Engineered fear. Real Apple security uses neutral language + provides specific device fingerprints.' },
        { id: 'f3', category: 'lookalike-url', label: 'Lookalike domain (apple-id-verify.com)', why: 'Real Apple uses apple.com / appleid.apple.com. "Apple-id-verify.com" is a typosquat.' },
        { id: 'f4', category: 'urgency', label: '12-hour permanent-disable threat', why: 'Real Apple gives 30+ days + multiple notification channels. Real ID locks are reversible via Apple Support.' },
        { id: 'f5', category: 'unsolicited', label: 'No corresponding alert in Apple ID page', why: 'If your Apple ID is actually locked, you\'ll see an alert in your Apple ID settings on your device. No alert = no real lock.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + forward to 7726', why: 'Correct. Apple-themed phish is widespread + Apple has a phish report (reportphishing@apple.com).' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t help carrier-level phish blocking. Forward to 7726 first.' },
        reply: { isCorrect: false, label: 'Reply', why: 'Confirms your number is reachable.' },
        click: { isCorrect: false, label: 'Verify identity', why: 'Routes to credential-harvest mimicking the real Apple ID sign-in page.' },
        spam: { isCorrect: false, label: 'Block sender', why: 'Number rotates. Report first.' }
      },
      patternName: 'Apple ID smishing (credential harvest)',
      patternBlurb: 'SY0-701 Domain 2.2. Apple ID smishing is high-yield because Apple IDs unlock email + iCloud + Find My + payment. Defense: check Apple ID status only via your device\'s Settings → Apple ID.'
    },
    // 16) Verizon billing dispute SMS
    {
      id: 'verizon-billing-smish',
      title: '"Verizon" billing dispute smish',
      vector: 'sms',
      difficulty: 2,
      unlockAfter: [],
      category: 'credential-harvest',
      summary: 'Fake Verizon overcharge dispute with link to "verify account". Telco impersonation classic.',
      senderId: 'Verizon',
      time: 'Today · 4:18 PM',
      bodyHtml: '<span class="flag" data-fid="f1">Verizon</span>: Your account has been <span class="flag" data-fid="f2">overcharged $147.53</span> on your latest billing cycle. To dispute and request a refund, please verify your account at <span class="flag" data-fid="f3">myverizon-billing-refund.com</span><br><br><span class="flag" data-fid="f4">Refund request expires in 48 hours.</span>',
      flags: [
        { id: 'f1', category: 'sender-id-mismatch', label: 'Branded sender "Verizon"', why: 'Real Verizon sends from VZW or VRZN registered short codes, not free-text sender IDs.' },
        { id: 'f2', category: 'specific-amount', label: 'Specific overcharge amount', why: 'Crafted to feel real ($147.53 sounds plausible). Real Verizon billing disputes happen via the My Verizon app, not SMS.' },
        { id: 'f3', category: 'lookalike-url', label: 'Lookalike domain (myverizon-billing-refund)', why: 'Real Verizon uses verizon.com / verizonwireless.com. "Myverizon-billing-refund.com" is a typosquat.' },
        { id: 'f4', category: 'urgency', label: '48-hour refund expiry', why: 'Real Verizon refunds don\'t expire that fast. Manufactured urgency.' },
        { id: 'f5', category: 'unsolicited', label: 'No corresponding alert in My Verizon app', why: 'Real billing issues show up in the carrier app first. No app alert = no real issue.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + forward to 7726', why: 'Correct. Telco-themed smishing affects every customer. Forwarding to 7726 helps the carrier block the campaign.' },
        delete: { isCorrect: false, label: 'Delete', why: 'Doesn\'t help carrier-level blocking. Forward to 7726.' },
        reply: { isCorrect: false, label: 'Reply', why: 'Confirms your number is reachable + signals attacker that you engage with SMS.' },
        click: { isCorrect: false, label: 'Verify account', why: 'Routes to credential-harvest mimicking your carrier\'s sign-in page. Always log in via the official My Verizon app.' },
        spam: { isCorrect: false, label: 'Block sender', why: 'Number rotates. Report first.' }
      },
      patternName: 'Telco-impersonation smishing',
      patternBlurb: 'SY0-701 Domain 2.2. Telco smishing exploits everyone-has-a-phone. Defense: check billing only via the carrier\'s official app — never via SMS links.'
    },
    // ──────────────────────────────────────────────────────────────────
    // ════════════════════════ VISHING (v4.98.2) ════════════════════════
    // 6 voice phish · vector: 'voice' · voicemail-player UI w/ transcript
    // ──────────────────────────────────────────────────────────────────
    // 17) Microsoft tech support vishing — canonical (mockup state 6)
    {
      id: 'ms-tech-support-vish',
      title: 'Fake "Microsoft Security Support" voicemail',
      vector: 'voice',
      difficulty: 2,
      unlockAfter: [],
      category: 'tech-support-scam',
      summary: 'Recorded voicemail claiming "your Microsoft account was hacked, call back urgently." Caller-ID spoofed.',
      callerId: '+1 (425) 555-0192',
      time: 'Today · 09:42 AM',
      voicemailLength: '0:38',
      transcript: '"This is <span class="flag" data-fid="f1">Microsoft Security Support</span>. We\'ve detected suspicious activity on your Microsoft 365 account. Your account will be <span class="flag" data-fid="f2">permanently locked in 24 hours</span> unless you call us back at <span class="flag" data-fid="f3">1-800-555-0192</span>. <span class="flag" data-fid="f4">Press 1 to speak with a security agent immediately</span>, or visit <span class="flag" data-fid="f5">microsoft-account-verify.com</span> to confirm your identity. This is your final warning."',
      flags: [
        { id: 'f1', category: 'unsolicited-claim', label: '"Microsoft Security Support" calling you', why: 'CRITICAL: Microsoft NEVER calls customers about account security. Any voicemail claiming to be from Microsoft = 100% scam.' },
        { id: 'f2', category: 'urgency', label: '"Permanently locked in 24 hours" threat', why: 'Real Microsoft never threatens permanent lockout via phone. Manufactured urgency = social engineering.' },
        { id: 'f3', category: 'callback-trap', label: 'Callback number not on Microsoft.com', why: 'Real Microsoft support contact is via support.microsoft.com — not a callback number left in voicemail. The number routes to scam call center.' },
        { id: 'f4', category: 'press-keypad-trap', label: '"Press 1" routing trap', why: 'Pressing 1 connects you to live scammers who escalate the social engineering (asking for credentials, remote access, payment info).' },
        { id: 'f5', category: 'lookalike-url', label: 'Lookalike domain "microsoft-account-verify.com"', why: 'Real Microsoft uses microsoft.com / outlook.com / live.com. Hyphenated subdomain = typosquat for credential harvest.' },
        { id: 'f6', category: 'caller-id-spoofing', label: 'Caller-ID can be spoofed', why: 'The "+1 (425)" Redmond, WA number looks like Microsoft\'s HQ — but caller-ID is trivially spoofable. Never trust caller-ID alone.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + delete voicemail', why: 'Correct. Forward to security so they can alert other employees + report to FCC at 1-888-CALL-FCC. Do NOT call back the number.' },
        delete: { isCorrect: false, label: 'Just delete', why: 'Doesn\'t alert security or help block the campaign. Report first.' },
        reply: { isCorrect: false, label: 'Call back to investigate', why: 'Routes you directly to the scam call center. NEVER call back numbers in unsolicited voicemails.' },
        click: { isCorrect: false, label: 'Visit the URL mentioned', why: 'Routes to credential-harvest mimicking Microsoft. Always navigate to microsoft.com directly.' },
        spam: { isCorrect: false, label: 'Block the number', why: 'Number rotates daily. Report first, then block.' }
      },
      patternName: 'Tech-support vishing (Microsoft impersonation)',
      patternBlurb: 'SY0-701 Domain 2.2. <strong>CRITICAL RULE: Microsoft + Apple + IRS + Social Security NEVER call you about account/tax/security issues.</strong> Any unsolicited call claiming to be these = 100% scam. Defense: hang up, look up the official number on the company\'s website, call them directly to verify.'
    },
    // 18) IRS back-tax demand vishing
    {
      id: 'irs-back-tax-vish',
      title: '"IRS" back-tax demand · arrest threat',
      vector: 'voice',
      difficulty: 1,
      unlockAfter: [],
      category: 'government-impersonation',
      summary: 'Aggressive voicemail demanding immediate payment for "back taxes" with arrest threat. Most common phone scam.',
      callerId: '+1 (202) 555-0834',
      time: 'Today · 11:08 AM',
      voicemailLength: '0:42',
      transcript: '"This is <span class="flag" data-fid="f1">Officer Michael Reeves from the Internal Revenue Service</span>. We are calling regarding an urgent matter pertaining to your tax filings. Our records indicate <span class="flag" data-fid="f2">you owe $4,892 in back taxes</span> dating from 2021. <span class="flag" data-fid="f3">An arrest warrant has been issued in your name</span> and local law enforcement will be at your address within 24 hours unless this matter is resolved. Please call back at <span class="flag" data-fid="f4">1-844-555-IRS-PAY (477-7297)</span> immediately to settle this debt. <span class="flag" data-fid="f5">Acceptable payment methods are gift cards or wire transfer only</span>. Failure to comply will result in immediate arrest."',
      flags: [
        { id: 'f1', category: 'fake-authority', label: '"Officer from IRS"', why: 'CRITICAL: The IRS does NOT have officers who call taxpayers. The IRS uses postal mail for first contact + has revenue officers (not "officers"). Any voicemail with "Officer + IRS" = 100% scam.' },
        { id: 'f2', category: 'specific-amount', label: 'Specific debt amount', why: 'Random-looking specific amount ($4,892) crafted to feel real. Real IRS notices arrive in writing via USPS with your taxpayer ID + filing details.' },
        { id: 'f3', category: 'arrest-threat', label: '"Arrest warrant has been issued"', why: 'CRITICAL: The IRS does NOT issue arrest warrants for taxes — that\'s a court process requiring due process. Threats of immediate arrest are 100% scam.' },
        { id: 'f4', category: 'callback-trap', label: 'Callback number to settle', why: 'Real IRS communications direct you to irs.gov or 1-800-829-1040 (the genuine line). Other numbers route to scammers.' },
        { id: 'f5', category: 'gift-cards-payment', label: '"Gift cards or wire transfer only"', why: 'CRITICAL: NO legitimate organization — IRS, court, business, charity — accepts payment in gift cards. Gift card payment demand = 100% scam.' },
        { id: 'f6', category: 'urgency', label: '24-hour arrest deadline', why: 'Real IRS gives extensive notice + appeal periods. Tight deadlines = panic engineering.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to FTC at reportfraud.ftc.gov', why: 'Correct. The FTC tracks IRS-impersonation scams. Real IRS questions: irs.gov or 1-800-829-1040. Forward voicemail to phishing@irs.gov.' },
        delete: { isCorrect: false, label: 'Just delete', why: 'Doesn\'t help others. Report so the FTC can track + block the campaign.' },
        reply: { isCorrect: false, label: 'Call back to verify', why: 'Routes directly to scammers. Verify any IRS contact via irs.gov ONLY.' },
        click: { isCorrect: false, label: 'Pay via gift cards', why: 'Hands the scammer your money — unrecoverable. NEVER pay with gift cards for any official-looking demand.' },
        spam: { isCorrect: false, label: 'Block the number', why: 'Number rotates daily. Report to FTC first.' }
      },
      patternName: 'IRS-impersonation vishing (gift-card scam)',
      patternBlurb: 'SY0-701 Domain 2.2. <strong>CRITICAL RULES: (1) The IRS never calls about tax debt — postal mail only. (2) The IRS never issues arrest warrants for taxes. (3) NO legitimate org accepts gift card payment.</strong> Any one of these = 100% scam.'
    },
    // 19) Bank fraud verification vishing
    {
      id: 'bank-fraud-verify-vish',
      title: 'Bank "fraud verification" callback',
      vector: 'voice',
      difficulty: 2,
      unlockAfter: ['bank-fraud-smish'],
      category: 'bank-impersonation',
      summary: 'Caller claims to be from your bank verifying a "suspicious charge" — asks you to confirm account details over the phone.',
      callerId: '+1 (800) 555-2222',
      time: 'Today · 2:14 PM',
      voicemailLength: '0:28',
      transcript: '"This is <span class="flag" data-fid="f1">Jennifer from Capital One Fraud Department</span>. We detected a <span class="flag" data-fid="f2">suspicious $487 charge</span> on your account ending in 4271 at a Best Buy in Toronto. To verify whether you authorized this transaction, please call us back at <span class="flag" data-fid="f3">1-800-555-2222</span>. <span class="flag" data-fid="f4">Have your full card number, CVV, and online banking password ready</span> for verification. Failure to respond within <span class="flag" data-fid="f5">1 hour</span> will result in your card being temporarily suspended."',
      flags: [
        { id: 'f1', category: 'unsolicited-bank-call', label: '"Capital One Fraud Department" calling you', why: 'Real banks may call about fraud — but they NEVER ask you to call BACK to a number they leave. Real bank fraud calls are followed up via the app or via the number on your physical card.' },
        { id: 'f2', category: 'specific-charge', label: 'Specific suspicious charge details', why: 'Crafted to feel real. Real fraud alerts come via the bank app first, with the charge visible in your transaction history.' },
        { id: 'f3', category: 'callback-trap', label: 'Callback number not on physical card', why: 'Real banks use the number on the back of your physical card. The number in the voicemail routes to the scam call center.' },
        { id: 'f4', category: 'critical-information-request', label: 'Asking for full card + CVV + password', why: 'CRITICAL: Real bank fraud verification NEVER asks for your full card number, CVV, or online banking password over the phone. They already have your account info — they ask security questions, not for credentials.' },
        { id: 'f5', category: 'urgency', label: '1-hour suspension threat', why: 'Real banks take days/weeks to suspend cards for unanswered fraud alerts. Tight deadlines = panic engineering.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + verify via card-back number', why: 'Correct. Hang up, call the number on the back of your card directly. Real fraud will still be there if it\'s real. Report this voicemail to your bank + FTC.' },
        delete: { isCorrect: false, label: 'Just delete', why: 'Misses the verification step. Real fraud might exist (rare but possible) — verify via the card-back number.' },
        reply: { isCorrect: false, label: 'Call back to verify', why: 'Routes to scam call center. They\'ll ask for credentials + drain your account.' },
        click: { isCorrect: false, label: 'Provide card details', why: 'Hands the scammer everything they need to drain your account.' },
        spam: { isCorrect: false, label: 'Block the number', why: 'Doesn\'t verify whether real fraud exists. Always verify via the card-back number first.' }
      },
      patternName: 'Bank-fraud-verification vishing',
      patternBlurb: 'SY0-701 Domain 2.2. <strong>CRITICAL RULE: Real banks never ask for full card number, CVV, or online banking password over the phone — they have your info already.</strong> Defense: hang up, call the number on the back of your physical card.'
    },
    // 20) Social Security number suspension vishing
    {
      id: 'ssn-suspension-vish',
      title: '"Social Security" SSN suspension scam',
      vector: 'voice',
      difficulty: 1,
      unlockAfter: [],
      category: 'government-impersonation',
      summary: 'Voicemail claims your Social Security number has been "suspended" for criminal activity. Aggressive scam pattern.',
      callerId: '+1 (800) 555-1213',
      time: 'Today · 10:18 AM',
      voicemailLength: '0:35',
      transcript: '"This is <span class="flag" data-fid="f1">Inspector Martinez from the Social Security Administration</span>. Your <span class="flag" data-fid="f2">Social Security number has been suspended</span> due to <span class="flag" data-fid="f3">suspicious activity linked to drug trafficking and money laundering in Texas</span>. To prevent legal action and unfreezing your benefits, please call us back at <span class="flag" data-fid="f4">1-800-555-1213</span> immediately. <span class="flag" data-fid="f5">Failure to respond will result in arrest and seizure of all your assets</span>. Press 1 for English, Press 2 for Spanish."',
      flags: [
        { id: 'f1', category: 'fake-authority', label: '"Inspector from SSA"', why: 'The SSA does NOT have "Inspectors" who call. The SSA uses postal mail for first contact + has Office of the Inspector General (which doesn\'t cold-call about benefits).' },
        { id: 'f2', category: 'impossible-action', label: '"SSN suspended"', why: 'CRITICAL: Social Security numbers are NEVER suspended. They are permanent. Any claim that your SSN has been suspended = 100% scam.' },
        { id: 'f3', category: 'fear-appeal', label: 'Drug trafficking + money laundering accusations', why: 'Designed for maximum fear. Real SSA never accuses you of crimes — that\'s a court process requiring due process.' },
        { id: 'f4', category: 'callback-trap', label: 'Callback number to "fix"', why: 'Real SSA contact is ssa.gov / 1-800-772-1213 (the genuine line). Other numbers route to scammers.' },
        { id: 'f5', category: 'arrest-threat', label: 'Arrest + asset seizure threat', why: 'CRITICAL: Threats of arrest + asset seizure for "SSN issues" are pure social engineering. Real legal action requires court orders + extensive notice.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to SSA OIG at oig.ssa.gov/report', why: 'Correct. The SSA Office of the Inspector General tracks SSN-impersonation scams. Reports help block + prosecute scammers.' },
        delete: { isCorrect: false, label: 'Just delete', why: 'Doesn\'t help others. Report to OIG.' },
        reply: { isCorrect: false, label: 'Call back to verify', why: 'Routes directly to scammers who will demand SSN verification + payment.' },
        click: { isCorrect: false, label: 'Provide SSN to "verify"', why: 'Hands the scammer the most sensitive piece of personal info you have.' },
        spam: { isCorrect: false, label: 'Block the number', why: 'Number rotates. Report to SSA OIG first.' }
      },
      patternName: 'SSN-suspension vishing (government impersonation)',
      patternBlurb: 'SY0-701 Domain 2.2. <strong>CRITICAL FACT: SSNs are never suspended. They are permanent.</strong> Any "your SSN has been suspended" claim = 100% scam.'
    },
    // 21) Tech support remote-access scam
    {
      id: 'tech-support-remote-vish',
      title: '"Tech support" remote-access scam',
      vector: 'voice',
      difficulty: 2,
      unlockAfter: ['ms-tech-support-vish'],
      category: 'tech-support-scam',
      summary: 'Caller claims your computer has a virus and offers to "fix" it via remote access — gateway to credential theft + ransomware.',
      callerId: '+1 (650) 555-7700',
      time: 'Today · 3:42 PM',
      voicemailLength: '0:48',
      transcript: '"Hello, this is <span class="flag" data-fid="f1">technical support from Apple Computer Services</span>. We\'ve been monitoring your computer remotely and have detected <span class="flag" data-fid="f2">multiple virus infections</span> originating from your IP address. To prevent <span class="flag" data-fid="f3">your personal data being stolen</span>, please call us back at <span class="flag" data-fid="f4">1-650-555-7700</span>. We will need to <span class="flag" data-fid="f5">install remote-access software</span> on your computer to remove the threats. There may be a <span class="flag" data-fid="f6">small fee of $299</span> for the security cleanup. Please call us within the hour."',
      flags: [
        { id: 'f1', category: 'fake-authority', label: '"Apple Computer Services" calling you', why: 'CRITICAL: Apple does NOT cold-call customers about computer issues. Any unsolicited "Apple/Microsoft/etc support" call = 100% scam.' },
        { id: 'f2', category: 'fake-claim', label: '"We\'ve been monitoring your computer"', why: 'Tech companies cannot remotely "monitor your computer" without your software + consent. This is impossible without active malware already installed.' },
        { id: 'f3', category: 'fear-appeal', label: 'Data-theft threat', why: 'Manufactured fear — designed to override critical thinking + push you to grant remote access.' },
        { id: 'f4', category: 'callback-trap', label: 'Callback number to "support"', why: 'Routes to scam call center. Real Apple support: support.apple.com / 1-800-MY-APPLE (1-800-692-7753).' },
        { id: 'f5', category: 'remote-access-trap', label: '"Install remote-access software"', why: 'CRITICAL: Granting remote access to anyone you don\'t know personally = handing them your computer. They install ransomware, steal credentials, drain accounts.' },
        { id: 'f6', category: 'fee-demand', label: '$299 "security cleanup fee"', why: 'Real Apple support is free for in-warranty issues + transparent for out-of-warranty. Surprise "cleanup fees" = scam.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + delete', why: 'Correct. Forward to security + report to FTC reportfraud.ftc.gov. Real Apple: support.apple.com.' },
        delete: { isCorrect: false, label: 'Just delete', why: 'Misses the chance to alert security + help block the campaign.' },
        reply: { isCorrect: false, label: 'Call back to fix', why: 'Routes to scammers. They\'ll request remote access + drain accounts.' },
        click: { isCorrect: false, label: 'Allow remote access', why: 'CATASTROPHIC. Hands the scammer full control of your computer. Never allow remote access to unsolicited callers.' },
        spam: { isCorrect: false, label: 'Block the number', why: 'Number rotates. Report first.' }
      },
      patternName: 'Tech-support remote-access scam',
      patternBlurb: 'SY0-701 Domain 2.2. <strong>CRITICAL RULES: (1) No tech company cold-calls about computer issues. (2) Never grant remote access to unsolicited callers. (3) Never pay "cleanup fees" by phone.</strong>'
    },
    // 22) Police "warrant" vishing
    {
      id: 'police-warrant-vish',
      title: '"Police" outstanding warrant scam',
      vector: 'voice',
      difficulty: 2,
      unlockAfter: [],
      category: 'law-enforcement-impersonation',
      summary: 'Caller claims to be local police with an outstanding warrant — demands immediate payment to "clear" it.',
      callerId: '+1 (415) 555-0100',
      time: 'Today · 1:18 PM',
      voicemailLength: '0:32',
      transcript: '"This is <span class="flag" data-fid="f1">Sergeant Thompson with the San Francisco Police Department</span>. We have an <span class="flag" data-fid="f2">outstanding warrant for your arrest</span> for failure to appear in court regarding jury duty notification. To clear this matter and avoid <span class="flag" data-fid="f3">immediate arrest</span>, please call us back at <span class="flag" data-fid="f4">1-415-555-0100</span>. The fine to clear the warrant is <span class="flag" data-fid="f5">$1,247 and must be paid via Apple gift cards or Bitcoin</span>. Failure to comply will result in officers being dispatched to your residence within 2 hours."',
      flags: [
        { id: 'f1', category: 'fake-authority', label: '"Sergeant from SFPD" calling you', why: 'Real police do NOT call about outstanding warrants. Real warrants are served in person by uniformed officers — not via phone with payment demands.' },
        { id: 'f2', category: 'impossible-action', label: '"Outstanding arrest warrant"', why: 'CRITICAL: Police never call to inform you of warrants and offer to "clear" them via payment. Real warrants are served in person.' },
        { id: 'f3', category: 'arrest-threat', label: 'Immediate arrest threat', why: 'Threats of imminent arrest in 2 hours = pure social engineering. Real police don\'t telegraph arrests.' },
        { id: 'f4', category: 'callback-trap', label: 'Callback number to "clear"', why: 'Routes to scam call center. Real police are reached via the non-emergency line of your local department, looked up on the official .gov website.' },
        { id: 'f5', category: 'gift-cards-payment', label: 'Payment in gift cards or Bitcoin', why: 'CRITICAL: NO law enforcement agency accepts payment in gift cards or Bitcoin for any reason. Any demand for these = 100% scam.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to FTC + local police non-emergency line', why: 'Correct. Report to reportfraud.ftc.gov + your local police via the non-emergency line (looked up on the official department website).' },
        delete: { isCorrect: false, label: 'Just delete', why: 'Doesn\'t help others. Report so the FTC can track + your local police can warn citizens.' },
        reply: { isCorrect: false, label: 'Call back to "clear" the warrant', why: 'Routes to scammers. They\'ll demand payment via gift cards + escalate threats.' },
        click: { isCorrect: false, label: 'Pay in gift cards', why: 'Hands the scammer money — unrecoverable. Never pay with gift cards for any official-looking demand.' },
        spam: { isCorrect: false, label: 'Block the number', why: 'Number rotates. Report first.' }
      },
      patternName: 'Police-impersonation vishing (warrant scam)',
      patternBlurb: 'SY0-701 Domain 2.2. <strong>CRITICAL: Police never call about warrants — they serve them in person. NO law enforcement accepts gift cards or Bitcoin.</strong> Any phone demand for these = 100% scam.'
    },
    // ──────────────────────────────────────────────────────────────────
    // ════════════════════════ QUISHING (v4.98.2) ════════════════════
    // 5 QR phish · vector: 'qr' · QR-image + decoded URL preview UI
    // ──────────────────────────────────────────────────────────────────
    // 23) Parking meter QR scam — canonical (mockup state 6)
    {
      id: 'parking-meter-qr',
      title: 'Parking meter QR sticker scam',
      vector: 'qr',
      difficulty: 2,
      unlockAfter: [],
      category: 'physical-overlay',
      summary: 'QR sticker pasted over the parking meter\'s official one. Decoded URL points to credential-harvest mimicking the city\'s parking app.',
      context: 'You\'ve parked downtown at a city meter. The QR sticker on the meter looks slightly raised — possibly pasted over an existing one. You scan it.',
      decodedUrl: 'https://park-now-pay.app/meter?id=4271&p=Q3a82F',
      realUrl: 'parkdc.dc.gov',
      domainAge: '4 days (registered 4 days ago)',
      flags: [
        { id: 'f1', category: 'physical-overlay', label: 'Sticker pasted over original (slightly raised)', why: 'CRITICAL: Physical attack pattern. Scammers print fake QR stickers + paste them over real meter QRs. Always check whether the sticker looks tampered.' },
        { id: 'f2', category: 'lookalike-domain', label: 'Lookalike domain (park-now-pay.app)', why: 'Real city parking app: parkdc.dc.gov (or your specific city .gov domain). "Park-now-pay.app" is a typosquat designed to look legitimate.' },
        { id: 'f3', category: 'recent-registration', label: 'Domain registered 4 days ago', why: 'Public WHOIS shows the domain age. Real city services have decades-old domains. Recent registration (< 30 days) = phish red flag.' },
        { id: 'f4', category: 'unusual-tld', label: 'Unusual TLD (.app instead of .gov)', why: 'Real city services use .gov TLD. Other TLDs (.app, .com, .io) for "official" services = scam.' },
        { id: 'f5', category: 'qr-only-payment', label: 'QR-only payment when official app + meter buttons exist', why: 'Real city meters accept payment via the official app (typically downloaded from App Store) OR coin/card via meter buttons. QR-only payment flow = scam.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + use official meter buttons or app', why: 'Correct. Report sticker to city via 311 or parking enforcement. Pay via the official app (downloaded from App Store) or via the meter buttons.' },
        delete: { isCorrect: false, label: 'Just walk away', why: 'Misses the chance to alert city + help next driver. Report to 311.' },
        reply: { isCorrect: false, label: 'Pay via the QR link anyway', why: 'Routes to credential-harvest mimicking your city\'s parking app. May install malware on your phone too.' },
        click: { isCorrect: false, label: 'Scan + ignore the URL', why: 'Even loading the URL may install drive-by malware. Don\'t scan suspicious QRs.' },
        spam: { isCorrect: false, label: 'Block the domain', why: 'Doesn\'t help — the next driver will hit the same sticker. Report to city.' }
      },
      patternName: 'Quishing (physical-overlay parking scam)',
      patternBlurb: 'SY0-701 Domain 2.2. Quishing exploits trust in QR codes + lack of URL preview before scan. Defense: <strong>(1) Check stickers for tampering. (2) Use official city apps from App Store. (3) Verify decoded URL before tapping. (4) Real city services use .gov TLD.</strong>'
    },
    // 24) MFA-update QR poster
    {
      id: 'mfa-update-qr',
      title: 'Corporate-themed "MFA update" QR poster',
      vector: 'qr',
      difficulty: 3,
      unlockAfter: ['parking-meter-qr'],
      category: 'corporate-impersonation',
      summary: 'Print-out poster looking like internal IT notice asking employees to scan QR for "MFA update". Lookalike-domain credential harvest.',
      context: 'A printed flier appeared in the breakroom: "IT NOTICE — MFA update required by Friday. Scan QR to enrol your new device." It looks corporate-internal but you don\'t recognize the formatting.',
      decodedUrl: 'https://mfa-corp-update.io/?u={username}',
      realUrl: 'helpdesk.corp.com (your real internal IT portal)',
      domainAge: '14 days (registered 2 weeks ago)',
      flags: [
        { id: 'f1', category: 'physical-corporate-impersonation', label: '"IT Notice" print-out in breakroom', why: 'Real IT communications come via email + intranet announcements. A printed flier asking everyone to scan a QR = mass-targeting attack.' },
        { id: 'f2', category: 'lookalike-domain', label: 'Lookalike domain (mfa-corp-update.io)', why: 'Real internal IT lives on corp.com / helpdesk.corp.com. External domains for "internal" services = phish.' },
        { id: 'f3', category: 'recent-registration', label: 'Domain registered 14 days ago', why: 'Real corp portals have permanent infrastructure. Recent registration (< 30 days) = phish red flag.' },
        { id: 'f4', category: 'urgency', label: '"By Friday" deadline', why: 'Real corp IT changes give weeks of notice. Tight deadlines = panic engineering.' },
        { id: 'f5', category: 'unusual-tld', label: 'Unusual TLD (.io for internal corp)', why: 'Real corp services use the company\'s domain (.com), not generic TLDs.' },
        { id: 'f6', category: 'unverified-source', label: 'No mentioned IT contact / ticket reference', why: 'Real IT notices include the contact (ticket portal, helpdesk number) for follow-up. Anonymous flier = phish.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report to security + remove flier', why: 'Correct. Report to security so they can confirm whether it\'s legitimate (it isn\'t) + check whether other employees scanned. Remove the flier so colleagues don\'t fall for it.' },
        delete: { isCorrect: false, label: 'Ignore + walk away', why: 'Other employees will see + scan the flier. Report to security.' },
        reply: { isCorrect: false, label: 'Scan + complete enrolment', why: 'Routes to credential-harvest mimicking your corp SSO. Hands the attacker your corp credentials.' },
        click: { isCorrect: false, label: 'Email the address on the flier', why: 'No legit address on a phish flier. Verify via your real corp IT portal directly.' },
        spam: { isCorrect: false, label: 'Take the flier down silently', why: 'Doesn\'t alert security or warn employees who already scanned. Report first.' }
      },
      patternName: 'Corporate-impersonation quishing (poster attack)',
      patternBlurb: 'SY0-701 Domain 2.2. Physical poster + QR is a high-yield targeted attack on enterprise. Defense: real corp IT communications come via email + intranet — never anonymous fliers asking you to scan QR.'
    },
    // 25) Restaurant menu QR scam
    {
      id: 'restaurant-menu-qr',
      title: 'Restaurant menu QR · credential harvest',
      vector: 'qr',
      difficulty: 1,
      unlockAfter: [],
      category: 'physical-overlay',
      summary: 'QR code on restaurant table for "menu" leads to credential-harvest page with fake login.',
      context: 'You\'re at a restaurant. The QR code on the table claims to lead to the digital menu. Scanning it loads a page that looks like the menu but asks you to "sign in for personalised recommendations."',
      decodedUrl: 'https://table-menu-direct.com/r/menu?t=42',
      realUrl: 'thelocaldiner.com (or no website needed)',
      domainAge: '8 days',
      flags: [
        { id: 'f1', category: 'lookalike-domain', label: 'Generic third-party domain (table-menu-direct.com)', why: 'Real restaurant menus are on the restaurant\'s own domain. Generic "menu service" domains = phish.' },
        { id: 'f2', category: 'login-trap', label: 'Asks for login for "personalised recommendations"', why: 'CRITICAL: Real restaurant menus do NOT require login. Login prompts = credential harvest.' },
        { id: 'f3', category: 'recent-registration', label: 'Domain registered 8 days ago', why: 'Real restaurant menus have stable infrastructure. Recent registration = phish.' },
        { id: 'f4', category: 'over-permission-request', label: 'Asks for email + password', why: 'A menu doesn\'t need your email or password. Any login form on a "menu" site = credential harvest.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + ask waiter for paper menu', why: 'Correct. Tell the waiter — they may not know about the swap. Many restaurants have paper menus + the official menu URL on the receipt.' },
        delete: { isCorrect: false, label: 'Just walk away from the link', why: 'Misses the chance to alert restaurant + help next customer.' },
        reply: { isCorrect: false, label: 'Sign in to see menu', why: 'Hands the scammer your email + password. They\'ll try those credentials at every major bank/email provider (credential stuffing).' },
        click: { isCorrect: false, label: 'Use the QR menu without login', why: 'Even if you don\'t login, the page may install malware + track you. Use the paper menu.' },
        spam: { isCorrect: false, label: 'Block the domain', why: 'Doesn\'t help next customer. Tell the waiter.' }
      },
      patternName: 'Quishing (restaurant menu credential harvest)',
      patternBlurb: 'SY0-701 Domain 2.2. CRITICAL RULE: <strong>A menu never requires login.</strong> Any QR-loaded "menu" asking for email + password = credential harvest.'
    },
    // 26) Charity donation QR scam
    {
      id: 'charity-donation-qr',
      title: 'Emotional charity donation QR scam',
      vector: 'qr',
      difficulty: 2,
      unlockAfter: [],
      category: 'social-engineering',
      summary: 'QR code on a charity flier with emotional fundraising language. Decoded URL captures payment details + diverts donations.',
      context: 'A flier on a community board: "Help victims of [recent disaster]. Every dollar counts. Scan to donate!" The QR loads a page asking for credit card details to make an "instant donation."',
      decodedUrl: 'https://disaster-relief-2024-helpnow.org/donate',
      realUrl: 'redcross.org (the real Red Cross domain)',
      domainAge: '2 days',
      flags: [
        { id: 'f1', category: 'lookalike-domain', label: 'Lookalike "disaster-relief" domain', why: 'Real charities use their established domains (redcross.org, savethechildren.org). Generic "disaster-relief-help" domains pop up after every disaster = scam.' },
        { id: 'f2', category: 'emotional-pressure', label: 'Emotional fundraising language', why: 'Disasters trigger immediate giving impulse. Scammers exploit this. Real charities don\'t need emotional manipulation.' },
        { id: 'f3', category: 'recent-registration', label: 'Domain registered 2 days ago', why: 'Real charities exist long before disasters. Domain registered after the disaster started = scam.' },
        { id: 'f4', category: 'urgency', label: '"Every dollar counts" + "Scan to donate"', why: 'Real charities don\'t use QR scan-to-donate without verifiable infrastructure. Real charity donation is via the charity\'s established website + phone line.' },
        { id: 'f5', category: 'no-charity-info', label: 'No EIN, no charity registration info', why: 'Real charities provide EIN (tax-exempt ID) for verification on Charity Navigator + GuideStar. Generic "help" with no verifiable info = scam.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + donate via verified charity', why: 'Correct. Verify charities at CharityNavigator.org + give via the official charity domain. Report fake disaster-relief scams to FTC + Charity Navigator.' },
        delete: { isCorrect: false, label: 'Just walk away', why: 'Doesn\'t help others. Report so legitimate charities aren\'t crowded out.' },
        reply: { isCorrect: false, label: 'Donate via the QR', why: 'Funds go to the scammer, not victims. Real victims need real donations to verified charities.' },
        click: { isCorrect: false, label: 'Verify the charity then donate', why: 'Verify FIRST via Charity Navigator. If the charity isn\'t there, don\'t donate.' },
        spam: { isCorrect: false, label: 'Block the domain', why: 'Doesn\'t help — disaster scammers spin up new domains. Report + donate to verified charities.' }
      },
      patternName: 'Disaster-relief charity quishing',
      patternBlurb: 'SY0-701 Domain 2.2. Disaster scams spike after every major event. Defense: <strong>verify charities at CharityNavigator.org before donating + give via the charity\'s established website only.</strong>'
    },
    // 27) Conference badge QR
    {
      id: 'conference-badge-qr',
      title: 'Conference badge QR · credential harvest',
      vector: 'qr',
      difficulty: 2,
      unlockAfter: [],
      category: 'event-targeted',
      summary: 'QR badge at conference networking event linked to "exclusive event app" — actually credential-harvest for LinkedIn-style accounts.',
      context: 'You\'re at a tech conference. Someone hands you their printed business card with a QR labelled "Connect with me on EventHub — exclusive networking app." The QR loads a sign-in page asking for your LinkedIn or Twitter credentials.',
      decodedUrl: 'https://eventhub-network-pro.com/connect',
      realUrl: 'linkedin.com or the conference\'s official app',
      domainAge: '21 days',
      flags: [
        { id: 'f1', category: 'lookalike-domain', label: 'Lookalike domain (eventhub-network-pro)', why: 'Real conference networking happens via LinkedIn or the conference\'s official app (Whova, Cvent, etc.). Generic "eventhub" domains = phish.' },
        { id: 'f2', category: 'social-account-request', label: 'Asks for LinkedIn or Twitter credentials', why: 'CRITICAL: No legitimate networking tool asks for your existing social account passwords. They use OAuth ("Sign in with LinkedIn") which never sends your password to the third party.' },
        { id: 'f3', category: 'recent-registration', label: 'Domain registered 21 days ago', why: 'Real event apps have permanent infrastructure. Recent registration timed to event = phish.' },
        { id: 'f4', category: 'no-event-affiliation', label: 'No connection to actual conference branding', why: 'Real event apps display the official conference logo + branding. Generic "EventHub" with no event-specific branding = scam.' },
        { id: 'f5', category: 'social-engineering', label: 'Social pressure (handed in person)', why: 'Being handed a card by someone friendly creates social pressure to scan. Conference scammers print cards + circulate them at networking events.' }
      ],
      correctAction: 'report',
      decisionReveal: {
        report: { isCorrect: true, label: 'Report + use LinkedIn directly', why: 'Correct. Report the person + URL to event security. Connect via LinkedIn directly using the person\'s profile (search by name).' },
        delete: { isCorrect: false, label: 'Politely decline + walk away', why: 'Misses the chance to alert event security. The "person" may be circulating the QR to many attendees.' },
        reply: { isCorrect: false, label: 'Sign in to "connect"', why: 'Hands the scammer your LinkedIn or Twitter credentials. They\'ll take over your account + spam your network.' },
        click: { isCorrect: false, label: 'Skip login + browse the app', why: 'Even without login, the page may install malware. Don\'t engage.' },
        spam: { isCorrect: false, label: 'Block the domain', why: 'Doesn\'t help other attendees. Report to event security.' }
      },
      patternName: 'Conference quishing (event-targeted credential harvest)',
      patternBlurb: 'SY0-701 Domain 2.2. Event-targeted phish exploits networking goodwill. Defense: <strong>connect via LinkedIn directly + only use the event\'s official app.</strong>'
    }
  ],
  phishingLessons: [
    {
      id: 'anatomy-of-phish',
      title: 'Anatomy of a phish — universal red flags',
      summary: '8 categories of red flag that show up across every vector (email, SMS, voice, QR).',
      flags: [
        { name: 'Sender mismatch', detail: 'Display-name says one thing, actual sender says another. <code>"Microsoft" &lt;noreply@suspicious.tk&gt;</code>' },
        { name: 'Urgency cue', detail: '"ACT NOW", "24 hours", "final notice." Designed to short-circuit verification.' },
        { name: 'Isolation / secrecy', detail: '"Don\'t tell anyone", "between us", "I\'m in a meeting." Stops you asking the real person.' },
        { name: 'Lookalike URL / domain', detail: 'Typosquat (<code>microsoft.com</code> vs <code>mlcrosoft.com</code>), recent registration, IP-instead-of-domain.' },
        { name: 'Generic greeting', detail: '"Dear Customer", "Hi User", or template-style first-name only. Templates beget mass-send.' },
        { name: 'Suspicious attachment / payload', detail: '<code>.zip</code> (often password-protected to bypass scanners), <code>.iso</code>, <code>.exe</code>, macros enabled.' },
        { name: 'Pre-empts verification', detail: '"I can\'t be reached by phone", "don\'t reply to this address", "use the form below." Closes alternative channels.' },
        { name: 'Money or credentials ask', detail: 'Wire transfer, gift card, password reset, MFA prompt. The point of the entire attack.' }
      ]
    },
    {
      id: 'bec-redflags',
      title: 'BEC red flags — the executive impersonation playbook',
      summary: 'Business Email Compromise is the #1 financial-loss phishing category. Specific tells.',
      flags: [
        { name: 'Display-name spoof', detail: 'Anyone can set "From" display name to "your CEO"; check the actual address.' },
        { name: 'Reply-To &ne; From', detail: 'Replies are routed to the attacker\'s inbox via Reply-To header mismatch.' },
        { name: 'Urgency + isolation pair', detail: 'Time pressure + "don\'t loop anyone in" — together they\'re BEC\'s signature.' },
        { name: 'Money + secrecy', detail: 'Wire transfer, gift cards, bank-detail change combined with "this is confidential" framing.' },
        { name: 'Pre-empts phone verification', detail: '"I\'m unavailable / in a meeting / on a flight" stops you calling to verify.' },
        { name: 'Out-of-band verification = the defense', detail: 'Always call the executive on their known number via the company directory before any unusual money movement.' }
      ]
    },
    {
      id: 'credential-harvest-redflags',
      title: 'Credential harvest red flags — fake login pages',
      summary: 'Phish that aims to capture your password by routing you to a fake login page.',
      flags: [
        { name: 'Hover URL ≠ visible link', detail: 'Link text says one thing, href says another. Always hover to verify destination before clicking.' },
        { name: 'Lookalike domain', detail: 'Typosquats (<code>m1crosoft</code>), homograph attacks (Cyrillic letters), unusual subdomains.' },
        { name: 'Generic greeting', detail: 'Real brand emails address you by full name + tenant — never "Dear Customer".' },
        { name: 'Brand impersonation tells', detail: 'Outdated copyright year, slightly-off logo, generic team-name signature.' },
        { name: 'Header anomalies', detail: 'SPF/DKIM/DMARC failures (advanced; usually behind-the-scenes — flagged by your mail provider).' },
        { name: 'Defense: bookmark + type, never click', detail: 'For any service, bookmark the real login page + always type the URL or use the bookmark — never click email links.' }
      ]
    },
    {
      id: 'callback-scam-redflags',
      title: 'Callback scams — bypass email defenses via phone',
      summary: 'Phish that routes you to a phone-based attack rather than a malicious link.',
      flags: [
        { name: 'Phone number embedded in email', detail: 'Real banks/brands direct you to the number on your physical card or in their app — never to a number printed in the email.' },
        { name: 'Tight deadline', detail: '"30 minutes", "1 hour" engineered to push panic-calls. Real services give days to weeks.' },
        { name: 'Authoritative impersonation', detail: 'Bank, Microsoft, IRS, Apple — institutions you instinctively trust + answer for.' },
        { name: '"Don\'t click any links" misdirection', detail: 'Sounds responsible but is the hook — drives you to phone the scammer instead.' },
        { name: 'Defense: verify via official channel only', detail: 'Bank: call the number on your card. SaaS: log in to the official app. IRS: never calls you. Trust nothing in the email\'s phone number.' }
      ]
    },
    {
      id: 'smishing-redflags',
      title: 'Smishing — vector-specific tells (SMS)',
      summary: 'SMS phish ("smishing") uses vector-unique tactics that don\'t apply to email. Specific defenses required.',
      flags: [
        { name: 'Custom sender ID for unsolicited contact', detail: 'Real banks/brands send from their registered short codes (e.g. 692-26 for Bank of America). Custom-branded sender names ("BANK-ALERT", "Apple") for unsolicited fraud-alerts = phish.' },
        { name: 'Shortened URLs (bit.ly, tinyurl, t.co)', detail: 'Hide the real destination. Legitimate orgs never use third-party URL shorteners for security-critical SMS.' },
        { name: 'Reply-keyword fishing (YES/NO)', detail: 'Replying confirms your number is monitored + reachable. Real banks never ask YES/NO replies for fraud.' },
        { name: 'Tight deadlines', detail: '"30 min", "12 hours", "24 hours" — much tighter than email phish (which uses days). Designed to force panic-action.' },
        { name: 'Callback number not on physical card', detail: 'Real bank fraud alerts direct you to the number on the back of your card. Numbers in SMS = scam call center.' },
        { name: '"IRS / government" via SMS = always phish', detail: 'CRITICAL: The IRS NEVER contacts taxpayers via SMS. Any "IRS" text = 100% phish. Same for SSA, Medicare, etc.' },
        { name: 'NEVER share 2FA codes via SMS', detail: 'CRITICAL: No legitimate company will ever ask you to share or forward a 2FA code — even Microsoft, Apple, your bank. The code stays with you.' },
        { name: 'Defense: forward to 7726 (SPAM) + use official app', detail: 'In the US, forward to 7726. Verify any account/financial issue via the official app — never via SMS links.' }
      ]
    },
    {
      id: 'vishing-redflags',
      title: 'Vishing — voice-call phish red flags',
      summary: 'Voice phish ("vishing") bypasses email + SMS defenses entirely. Phone-specific tells.',
      flags: [
        { name: 'Caller-ID spoofing is trivial', detail: 'Any number can be spoofed. Even a number that matches a real org\'s headquarters means nothing. Never trust caller-ID alone.' },
        { name: 'Microsoft / Apple / IRS / SSA NEVER call you', detail: 'CRITICAL: These orgs do not cold-call. Any unsolicited call claiming to be from these = 100% scam.' },
        { name: 'SSN / arrest / warrant threats', detail: 'CRITICAL FACTS: <strong>SSNs are never suspended.</strong> Police don\'t call about warrants — they serve them in person. Any of these claims = scam.' },
        { name: 'Gift card / Bitcoin / wire transfer payment', detail: 'CRITICAL: NO legitimate organization (IRS, court, charity, business) accepts payment in gift cards or Bitcoin. Demand for these = 100% scam.' },
        { name: 'Remote-access software request', detail: 'Granting remote access to unsolicited callers = handing them your computer. They install ransomware + steal credentials.' },
        { name: 'Press-keypad routing trap', detail: '"Press 1 to speak with..." routes you to live scammers who escalate the social engineering.' },
        { name: 'Tight deadlines (24-48h)', detail: 'Real legal/financial processes have weeks/months of due process. Tight deadlines = panic engineering.' },
        { name: 'Defense: hang up + call back via official channel', detail: 'Hang up. Look up the official phone number on the org\'s website. Call them directly to verify any claim.' }
      ]
    },
    {
      id: 'quishing-redflags',
      title: 'Quishing — QR code phish red flags',
      summary: 'QR phish ("quishing") exploits trust in QR codes + lack of URL preview. Physical + digital tells.',
      flags: [
        { name: 'Physical sticker over original (paper attack)', detail: 'CRITICAL: Scammers print fake QR stickers + paste them over real ones (parking meters, restaurants, posters). Always check whether stickers look tampered or raised.' },
        { name: 'Decode URL before tapping', detail: 'Most modern camera apps (iOS Camera, most Android) preview the URL after scanning. Read it before tapping.' },
        { name: 'Lookalike domain', detail: 'Typosquats (parkdc.dc.gov vs park-now-pay.app), unusual TLDs (.io / .app for "official" services), recent registrations. Always check the domain.' },
        { name: 'Recent domain registration', detail: 'Public WHOIS shows domain age. Real services have decades-old domains. Recent registration (< 30 days) = phish red flag.' },
        { name: 'Login prompt on QR-loaded "menu" or "info" page', detail: 'CRITICAL: Menus + info pages don\'t require login. Login forms on QR-loaded pages = credential harvest.' },
        { name: 'HTTPS doesn\'t mean trustworthy', detail: 'Let\'s Encrypt issues SSL certs for free — even scammers have HTTPS. The padlock means "encrypted in transit", not "legit destination".' },
        { name: 'Use official app instead of QR', detail: 'For city services, restaurants, charities: download the official app from the App Store rather than scanning fliers.' },
        { name: 'Defense: verify decoded URL + use known apps', detail: 'When in doubt, type the URL or use the org\'s official app. Don\'t trust anonymous QRs in public places.' }
      ]
    }
  ]
};
