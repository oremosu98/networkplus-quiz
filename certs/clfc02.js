// ══════════════════════════════════════════════════════════════════════════
// AWS Certified Cloud Practitioner (CLF-C02) cert pack
// (v7.8.0 — content authoring)
// ══════════════════════════════════════════════════════════════════════════
// Loaded into window.CERT_PACKS.clfc02 at app boot. Active when:
//   1. URL host matches 'clfc02.certanvil.com' (or 'clfc02.' / 'clfc02-' prefix
//      for Vercel preview branches) — Pattern A subdomain. Cert-code-named
//      'clfc02' to match the az900/ai900/sc900 single-vendor convention (no
//      hyphen — only A+ uses hyphens). Displayed exam code stays 'CLF-C02'.
//   2. localStorage 'nplus_dev_cert' === 'clfc02' (dev override)
//   3. URL query '?cert=clfc02' (one-shot entry-point handoff)
// Otherwise inert (loaded only when index.html inline IIFE document.writes
// <script src="certs/clfc02.js"> after Pattern A resolves the host).
//
// Status (v7.8.0):
//   ✓ Cert metadata (name, code, exam pass 700/1000, 65-Q / 90-min)
//     — official AWS CLF-C02 Exam Guide: 65 questions, 90 minutes, pass 700.
//   ✓ Domain weights (official CLF-C02 blueprint, exact percentages, sum 1.00).
//   ✓ Domain labels (4 domains — reuses the 4-domain dg-system.css rule that
//     hides data-domain-idx 5, same as sc900 / aplus-core2).
//   ✓ Topic catalog (54 topics across 4 domains).
//   ✓ retentionGapConcepts (8 seed entries from the official CLF-C02 Exam
//     Guide + VoC research; additive forever via Phase 3 cycles).
//   ☐ GT tables — deferred (empty object → gt-less calls are a no-op).
//   ☐ questionExemplars — 200 hand-curated exemplars, blueprint-weighted
//     (D1 48 / D2 60 / D3 68 / D4 24), authored in Stage 6.
//
// AUDIENCE (v7.8.0 Pattern A): public Pro-tier surface on
// https://clfc02.certanvil.com. Visible to all signed-in users in the cert
// switcher with a "PRO" badge; switching INTO clfc02 requires Pro tier via
// tadSwitchCert's _gateProOnly('AWS Certified Cloud Practitioner (CLF-C02)')
// call.
//
// LEGAL (non-negotiable): every entry below originates from the PUBLIC AWS
// Certified Cloud Practitioner (CLF-C02) Exam Guide + PUBLIC AWS documentation
// ONLY. ZERO ingestion of paid-bank content. Tutorials Dojo (Jon Bonso),
// Stephane Maarek's Udemy course/practice exams, A Cloud Guru, Whizlabs,
// MeasureUp, Skillcertpro, and ExamTopics dumps are EXPLICITLY BANNED as
// content sources. VoC research (Reddit r/AWSCertifications) describes the
// exam-taker EXPERIENCE (which clusters to emphasize, which traps to cover),
// never question content. Current AWS service names in stems; legacy names
// (e.g. "AWS SSO") cited parenthetically in explanations only.

window.CERT_PACKS = window.CERT_PACKS || {};
window.CERT_PACKS.clfc02 = {
  meta: {
    id: 'clfc02',
    name: 'AWS Cloud Practitioner',
    code: 'CLF-C02',
    blueprintUrl: 'https://d1.awsstatic.com/training-and-certification/docs-cloud-practitioner/AWS-Certified-Cloud-Practitioner_Exam-Guide.pdf',
    examPassScore: 700,         // CLF-C02 official pass: 700/1000 (scaled).
    examMaxScore: 1000,         // scaled-score ceiling
    examQuestionCount: 65,      // 65 questions (50 scored + 15 unscored).
    examTimeSeconds: 5400,      // 90-minute timer.
  },

  // ── PRIORITY RETENTION CONCEPTS (v7.8.0 seed, 8 entries, additive forever) ─
  // Seeded from the public AWS CLF-C02 Exam Guide + VoC research
  // (r/AWSCertifications, 2025-2026). Injected as a soft tiebreaker into every
  // question-generation prompt — same mechanism as Net+/Sec+/AZ-900/AI-900/
  // SC-900 retentionGapConcepts. The array stays open-ended; the founder will
  // append new concepts via Phase 3 cycles after each practice-test gap.
  retentionGapConcepts: [
    { label: 'The Shared Responsibility Model boundary', parentTopic: 'Shared Responsibility Model', objective: '2.1', keyword: 'The single most-tested CLF-C02 concept (VoC §1 / §4). Split: AWS = security OF the cloud (physical security, hardware, virtualization hypervisor, host OS for managed services, global infrastructure). CUSTOMER = security IN the cloud (data classification + encryption, IAM users/roles/policies, OS patching on EC2, network/firewall config inside the VPC, application-layer security). The line MOVES by service model: on EC2 (IaaS) the customer patches the guest OS; on RDS/Lambda (managed/PaaS) AWS patches the OS/runtime but the customer still owns data, access control, and the firewall/SG rules; on S3 (managed) the customer owns bucket policies + encryption CONFIGURATION while AWS owns durability. INVARIANT: the customer ALWAYS owns their data, their IAM/identities, and their access management — regardless of model. Trap: questions move the boundary between IaaS/PaaS/managed to test whether you know who patches the OS.' },
    { label: 'Well-Architected Framework — SIX pillars (incl. Sustainability)', parentTopic: 'Well-Architected Framework', objective: '1.2', keyword: 'The "five pillars" muscle-memory trap (VoC §S6). CLF-C02 expects SIX pillars: Operational Excellence (run + monitor + improve), Security (protect data/systems/assets), Reliability (recover from failure, scale to meet demand), Performance Efficiency (use resources efficiently, right-size), Cost Optimization (avoid unnecessary cost), and SUSTAINABILITY (added 2021 — minimize environmental impact of cloud workloads). Pre-2023 study guides ship five; if a question lists "five pillars" or omits Sustainability it is testing the trap. Scenario test: "minimize the environmental impact of running workloads" = Sustainability pillar; "recover automatically from an AZ failure" = Reliability.' },
    { label: 'Pricing models: Savings Plans vs Reserved Instances vs Spot', parentTopic: 'EC2 Pricing Models', objective: '4.1', keyword: 'The Domain 4 trap cluster (VoC §5c). ON-DEMAND = pay per second/hour, no commitment, highest rate — for short/unpredictable workloads. RESERVED INSTANCES (RI) = 1- or 3-year commitment to a SPECIFIC instance config (Standard RI = locked attributes, biggest discount; Convertible RI = can change family/OS, smaller discount), three payment options (All Upfront / Partial / No Upfront). SAVINGS PLANS = commit to a $/hour spend for 1 or 3 years, applied FLEXIBLY across EC2/Fargate/Lambda — Compute Savings Plan (most flexible, any region/family/compute) > EC2 Instance Savings Plan (locked to a family+region, bigger discount). SPOT = up to 90% off spare capacity, can be interrupted with 2-min notice — for fault-tolerant/batch/stateless work. DEDICATED HOST = physical server dedicated to you (BYOL / compliance). Trap: "biggest discount AND most flexibility" — the answer depends on which the question prioritizes; Compute Savings Plan is the usual "flexibility" answer, Standard 3-yr All-Upfront RI the "max discount" answer.' },
    { label: 'Support plans: Enterprise On-Ramp vs Enterprise vs Business', parentTopic: 'AWS Support Plans', objective: '4.3', keyword: 'The support-matrix gotcha (VoC §5a). BASIC (free) = docs + whitepapers + Trusted Advisor 7 core checks + Personal Health Dashboard. DEVELOPER = business-hours email to Cloud Support Associates, 24h general / next-business-day system-impaired response. BUSINESS = 24/7 phone+chat+email to Cloud Support Engineers, FULL Trusted Advisor check set, <1h production-down, infrastructure-event support, AWS Support API. ENTERPRISE ON-RAMP = adds a POOL of Technical Account Managers (not a named TAM), <30 min business-critical response, Concierge support, proactive reviews. ENTERPRISE = a DESIGNATED (named) TAM, <15 min business-critical response, full Concierge, Infrastructure Event Management, well-architected reviews. Traps: 24/7 phone = Business-and-up; named TAM = Enterprise ONLY (On-Ramp gets a pool); <15 min = Enterprise, <30 min = On-Ramp; full Trusted Advisor = Business-and-up.' },
    { label: 'S3 storage classes + transition/min-duration rules', parentTopic: 'Amazon S3 Storage Classes', objective: '3.6', keyword: 'Heavily tested (VoC §3 / §5g). S3 STANDARD = frequent access, no retrieval fee, highest storage cost. STANDARD-IA / ONE ZONE-IA = infrequent access, lower storage + retrieval fee, 30-day minimum (One Zone-IA = single AZ, cheaper, less resilient). GLACIER INSTANT RETRIEVAL = archive with millisecond access, 90-day min. GLACIER FLEXIBLE RETRIEVAL = minutes-to-hours retrieval, 90-day min. GLACIER DEEP ARCHIVE = cheapest, 12-hour retrieval, 180-day min. INTELLIGENT-TIERING = auto-moves objects between tiers based on access pattern, NO retrieval fees, small monitoring fee — the "I do not know the access pattern" answer. Scenario test: "rarely accessed, must restore within milliseconds" = Glacier Instant; "lowest cost, can wait 12 hours" = Deep Archive; "unknown/changing access pattern" = Intelligent-Tiering.' },
    { label: 'Governance: Organizations vs Control Tower vs SCPs', parentTopic: 'AWS Organizations', objective: '2.2', keyword: 'The multi-account governance triad (VoC §S5 / §5d). AWS ORGANIZATIONS = the account container — central management of multiple accounts, CONSOLIDATED BILLING (one bill, volume discounts pooled), organizational units (OUs), and the HOME of Service Control Policies. SERVICE CONTROL POLICIES (SCPs) = guardrails that set the MAXIMUM available permissions for accounts/OUs — they DENY or allow but NEVER GRANT permissions (an SCP plus an IAM policy must both allow an action). AWS CONTROL TOWER = opinionated, guided multi-account SETUP and governance built ON TOP OF Organizations + IAM Identity Center + Config + CloudTrail — a "landing zone" with pre-configured guardrails and an account factory. Scenario test: "set the maximum permissions an account can have" = SCP; "one consolidated bill across accounts" = Organizations; "automated, governed multi-account landing zone with best-practice guardrails" = Control Tower.' },
    { label: 'Service discrimination — same-keyword clusters', parentTopic: 'AWS Service Identification', objective: '3.3', keyword: 'CLF-C02 is fundamentally a SERVICE-DISCRIMINATION exam (VoC §3, the #1 product insight). The highest-ROI skill is distinguishing same-keyword services by use case. MESSAGING: SQS (queue, decoupling, pull) vs SNS (pub/sub, push, fan-out) vs EventBridge (event routing/bus) vs Step Functions (workflow orchestration). DATABASES: RDS/Aurora (relational) vs DynamoDB (NoSQL key-value) vs Redshift (data warehouse/analytics) vs ElastiCache (in-memory cache) vs Neptune (graph) vs DocumentDB (document). COMPUTE: EC2 (managed VMs) vs Lambda (serverless functions) vs Fargate (serverless containers) vs ECS/EKS (container orchestration) vs Lightsail (simple VPS) vs Elastic Beanstalk (PaaS). OBSERVABILITY: CloudWatch (metrics/logs/alarms) vs CloudTrail (API audit log) vs Config (resource-config compliance) vs X-Ray (distributed tracing). EDGE: CloudFront (CDN/HTTP caching) vs Global Accelerator (anycast static-IP TCP/UDP acceleration) vs Route 53 (DNS). Trap: distractors are same-cluster plausible services — pick by the workload described, not by keyword overlap.' },
    { label: 'Compliance & cost tooling disambiguation', parentTopic: 'AWS Compliance Tools', objective: '2.4', keyword: 'Two confusable clusters (VoC §S4 / §5e). COMPLIANCE: AWS ARTIFACT = self-service download of AWS compliance REPORTS/attestations (SOC, ISO, PCI) — the "where do I get the SOC 2 report" answer; AWS CONFIG = continuous recording of resource CONFIGURATION + compliance rules; AWS AUDIT MANAGER = automated EVIDENCE collection mapped to audit frameworks. SECURITY DETECTION: GuardDuty (threat detection from logs) vs Inspector (vulnerability/CVE scanning of EC2/containers) vs Macie (PII/sensitive-data discovery in S3) vs Detective (investigation/root-cause graph) vs Security Hub (aggregated findings dashboard). COST: Cost Explorer (visualize/analyze past spend) vs AWS Budgets (set alerts/limits on future spend) vs Trusted Advisor (best-practice + cost-optimization checks) vs Compute Optimizer (right-sizing recommendations). Scenario test: "download our auditor the ISO report" = Artifact; "alert me when spend exceeds $500" = Budgets; "find which resources are over-provisioned" = Compute Optimizer.' }
  ],

  // ── DOMAIN WEIGHTS (official AWS CLF-C02 Exam Guide) ─────────────────────
  // Sums to 1.00 — exact official CLF-C02 percentages.
  domainWeights: {
    'cloud-concepts':          0.24, // Domain 1 — Cloud Concepts (24%)
    'security-compliance':     0.30, // Domain 2 — Security and Compliance (30%)
    'cloud-tech-services':     0.34, // Domain 3 — Cloud Technology and Services (34%, largest)
    'billing-pricing-support': 0.12  // Domain 4 — Billing, Pricing, and Support (12%)
  },

  domainLabels: {
    'cloud-concepts':          'Cloud Concepts',
    'security-compliance':     'Security & Compliance',
    'cloud-tech-services':     'Cloud Technology & Services',
    'billing-pricing-support': 'Billing, Pricing & Support'
  },

  // ── TOPIC → DOMAIN MAP (54 topics across 4 CLF-C02 domains) ──────────────
  // Drives weak-spot routing, exemplar bank picker, lottery, readiness domain
  // attribution. Topic name = primary key everywhere; domain key is one of:
  // cloud-concepts / security-compliance / cloud-tech-services /
  // billing-pricing-support. Derived from the official CLF-C02 task statements.
  topicDomains: {
    // ── Domain 1 — Cloud Concepts (24%, 13 topics) ──
    'Benefits of the AWS Cloud':                 'cloud-concepts',   // 1.1
    'Cloud vs On-Premises (CapEx vs OpEx)':      'cloud-concepts',   // 1.1
    'Economies of Scale':                        'cloud-concepts',   // 1.1
    'Cloud Deployment Models':                   'cloud-concepts',   // 1.1
    'Well-Architected Framework':                'cloud-concepts',   // 1.2
    'Operational Excellence Pillar':             'cloud-concepts',   // 1.2
    'Reliability Pillar':                        'cloud-concepts',   // 1.2
    'Performance Efficiency Pillar':             'cloud-concepts',   // 1.2
    'Cost Optimization Pillar':                  'cloud-concepts',   // 1.2
    'Sustainability Pillar':                     'cloud-concepts',   // 1.2
    'Cloud Adoption Framework (CAF)':            'cloud-concepts',   // 1.3
    'Cloud Migration Strategies (7 Rs)':         'cloud-concepts',   // 1.3
    'Cloud Economics':                           'cloud-concepts',   // 1.4

    // ── Domain 2 — Security & Compliance (30%, 16 topics) ──
    'Shared Responsibility Model':               'security-compliance', // 2.1
    'AWS Compliance Programs':                   'security-compliance', // 2.2
    'AWS Artifact':                              'security-compliance', // 2.2
    'AWS Organizations':                         'security-compliance', // 2.2
    'AWS Control Tower':                         'security-compliance', // 2.2
    'AWS Config':                                'security-compliance', // 2.2
    'IAM Users, Groups & Roles':                 'security-compliance', // 2.3
    'IAM Policies & Least Privilege':            'security-compliance', // 2.3
    'IAM Identity Center':                       'security-compliance', // 2.3
    'Root User Protection & MFA':                'security-compliance', // 2.3
    'Amazon GuardDuty':                          'security-compliance', // 2.4
    'Amazon Inspector':                          'security-compliance', // 2.4
    'Amazon Macie':                              'security-compliance', // 2.4
    'AWS Shield & WAF':                          'security-compliance', // 2.4
    'AWS KMS & Encryption':                      'security-compliance', // 2.4
    'Security Support Resources':                'security-compliance', // 2.4

    // ── Domain 3 — Cloud Technology & Services (34%, 18 topics) ──
    'AWS Global Infrastructure':                 'cloud-tech-services', // 3.2
    'Edge Locations & Hybrid (Outposts/Local Zones/Wavelength)': 'cloud-tech-services', // 3.2
    'Ways to Interact with AWS (Console/CLI/SDK)': 'cloud-tech-services', // 3.1
    'Infrastructure as Code (CloudFormation)':   'cloud-tech-services', // 3.1
    'Amazon EC2 & Instance Types':               'cloud-tech-services', // 3.3
    'AWS Lambda':                                'cloud-tech-services', // 3.3
    'Containers (ECS/EKS/Fargate)':              'cloud-tech-services', // 3.3
    'Elastic Beanstalk & Lightsail':             'cloud-tech-services', // 3.3
    'Auto Scaling & Elastic Load Balancing':     'cloud-tech-services', // 3.3
    'Amazon S3 Storage Classes':                 'cloud-tech-services', // 3.6
    'Block & File Storage (EBS/EFS/FSx)':        'cloud-tech-services', // 3.6
    'Storage Gateway & Snow Family':             'cloud-tech-services', // 3.6
    'Relational Databases (RDS/Aurora)':         'cloud-tech-services', // 3.4
    'NoSQL & Specialized Databases (DynamoDB/Redshift/ElastiCache)': 'cloud-tech-services', // 3.4
    'Networking (VPC/Route 53/CloudFront)':      'cloud-tech-services', // 3.5
    'Messaging & Integration (SQS/SNS/EventBridge)': 'cloud-tech-services', // 3.3
    'AI/ML & Analytics Services':                'cloud-tech-services', // 3.3
    'Monitoring (CloudWatch/CloudTrail)':        'cloud-tech-services', // 3.1

    // ── Domain 4 — Billing, Pricing & Support (12%, 7 topics) ──
    'EC2 Pricing Models':                        'billing-pricing-support', // 4.1
    'AWS Free Tier & Pricing Calculator':        'billing-pricing-support', // 4.1
    'Consolidated Billing & Budgets':            'billing-pricing-support', // 4.2
    'Cost Explorer & Cost Allocation Tags':      'billing-pricing-support', // 4.2
    'AWS Support Plans':                         'billing-pricing-support', // 4.3
    'AWS Trusted Advisor & Compute Optimizer':   'billing-pricing-support', // 4.3
    'Technical Support Resources':               'billing-pricing-support'  // 4.3
  },

  // ── GROUND-TRUTH TABLES (deferred) ──────────────────────────────────────
  gtTables: {},

  // ── QUESTION EXEMPLARS (200, blueprint-weighted; authored in Stage 6) ────
  // D1 cloud-concepts 48 / D2 security-compliance 60 / D3 cloud-tech-services
  // 68 / D4 billing-pricing-support 24. Empty until authoring lands.
  questionExemplars: [
  ]
};
