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
    { label: 'Gap Analysis',                parentTopic: 'Security Governance',          objective: '5.1', keyword: 'Compare current control state to a target benchmark/framework (NIST CSF, ISO 27001, SOC 2, PCI DSS) — output is the coverage delta + remediation priorities. Distinguished from vulnerability assessment (CVE-focused), risk assessment (likelihood × impact), threat assessment (adversary profile), and pen test (active exploit).' }
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
    ethernet: {}
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
    {"type":"multi-select","question":"(Choose TWO) Which of the following are TRUE regarding a security gap analysis?","difficulty":"Hard","topic":"Security Governance","objective":"5.1","options":{"A":"The output is a list of missing or insufficient controls compared to a target benchmark, framework, or regulation","B":"It actively exploits identified weaknesses to confirm they are reachable from the public internet","C":"It assigns CVSS scores to each technical vulnerability discovered on the network","D":"Common inputs include current control documentation plus a target standard (NIST CSF, ISO 27001, CIS Controls, PCI DSS, HIPAA)","E":"The result is a profile of likely threat actors, their motives, and their preferred tactics"},"answers":["A","D"],"explanation":"Gap analysis is a comparison-and-coverage exercise. (A) The deliverable is a coverage delta: which controls from the target benchmark are missing or insufficient, with remediation priorities. (D) Inputs are always two-sided — current state (what we have) plus desired state (what the standard requires). Without the target standard, there is nothing to measure the gap against. (B) Wrong — that describes penetration testing. Gap analysis is documentation- and interview-driven, not an active exploit. (C) Wrong — CVSS scoring is the output of a vulnerability assessment, focused on specific technical CVEs, not control-coverage gaps. (E) Wrong — that describes a threat assessment, which profiles adversaries, not a gap analysis. Common SY0-701 distractor: confusing gap analysis with vulnerability assessment because both produce a 'list of things to fix' — the difference is the lens (controls vs CVEs).","source":"curated-secplus-phase3","addedVersion":"4.95.1","addedDate":"2026-05-08"}
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
  ]
};
