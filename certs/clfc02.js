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
  {
    type: "mcq",
    question: "A startup wants to build a web application but is concerned about accurately forecasting the compute capacity it will need over the next 12 months. Which cloud benefit most directly addresses this challenge?",
    difficulty: "Foundational",
    topic: "Benefits of the AWS Cloud",
    objective: "1.1",
    options: { A: "Trade fixed expense for variable expense", B: "Stop spending money on running and maintaining data centers", C: "Stop guessing about capacity needs", D: "Benefit from massive economies of scale" },
    answer: "C",
    explanation: "The core benefit here is eliminating the need to guess capacity in advance. Cloud elasticity allows the startup to scale compute up or down based on actual demand, avoiding both over-provisioning (wasted cost) and under-provisioning (poor performance). A describes the CapEx-to-OpEx shift, which is a real benefit but not the most direct solution to forecasting risk. B addresses data center elimination, which is relevant but a broader operational benefit. D refers to pricing advantages from AWS's scale, not the capacity uncertainty problem.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A retail company currently purchases servers every three years to handle peak holiday traffic. During off-peak months the servers sit mostly idle. Moving to the cloud would most directly replace which type of expenditure model?",
    difficulty: "Foundational",
    topic: "Cloud vs On-Premises (CapEx vs OpEx)",
    objective: "1.4",
    options: { A: "Variable expense paid only when infrastructure is consumed", B: "Capital expenditure for fixed assets acquired upfront", C: "Operational expenditure spread evenly across fiscal quarters", D: "Depreciation expense recognized over a multi-year schedule" },
    answer: "B",
    explanation: "Buying physical servers on a three-year cycle is a textbook capital expenditure (CapEx) — a large upfront investment in fixed assets. The cloud converts this to operational expenditure (OpEx), where the company pays only for the resources it actually uses. A is what the cloud model looks like after migration, not a description of the current on-premises model. C is incorrect because on-premises costs are lumpy, not evenly spread. D describes an accounting treatment, not the spending model being replaced.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A global financial services firm wants to launch a new trading platform for customers in three new countries within two weeks. On-premises infrastructure procurement would take four to six months. Which AWS benefit makes the rapid launch possible?",
    difficulty: "Foundational",
    topic: "Benefits of the AWS Cloud",
    objective: "1.1",
    options: { A: "Economies of scale reduce per-unit infrastructure costs", B: "The ability to go global in minutes using AWS Regions", C: "Managed services eliminate operational overhead", D: "Elasticity allows automatic resource scaling under load" },
    answer: "B",
    explanation: "AWS operates Regions across the globe, allowing companies to deploy infrastructure in new geographies almost immediately through the console or API — without hardware procurement. This 'go global in minutes' benefit directly solves the speed-to-market problem described. A is about cost savings, not speed to new geographies. C (managed services) reduces ops burden but does not specifically address global deployment speed. D (elasticity) handles load variation, not geographic expansion.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company is evaluating whether to migrate from its on-premises data center to AWS. Which TWO of the following are direct benefits of the AWS Cloud that support this decision? (Select TWO.)",
    difficulty: "Foundational",
    topic: "Benefits of the AWS Cloud",
    objective: "1.1",
    options: { A: "Increased speed and agility to experiment and innovate", B: "Guaranteed elimination of all security vulnerabilities", C: "Trade upfront capital expense for variable operational expense", D: "Full ownership of all physical hardware used to run workloads", E: "Fixed monthly billing regardless of actual resource consumption" },
    answer: ["A", "C"],
    explanation: "A is correct: cloud agility lets teams spin up new environments in minutes rather than weeks, accelerating experimentation. C is correct: the CapEx-to-OpEx shift means no large upfront hardware investment — you pay only for what you use. B is wrong: AWS operates on a shared responsibility model; security vulnerabilities in customer code or misconfigured services remain the customer's responsibility. D is wrong: AWS owns the physical hardware; customers access virtualized resources. E is wrong: cloud billing is variable by design, not fixed.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "AWS is able to offer lower pay-as-you-go prices than most companies can achieve running their own data centers. Which concept best explains why AWS can offer these lower prices?",
    difficulty: "Foundational",
    topic: "Economies of Scale",
    objective: "1.1",
    options: { A: "Geographic distribution of AWS Regions and Availability Zones", B: "Achieving higher economies of scale by aggregating usage from hundreds of thousands of customers", C: "Providing managed services that reduce customer operational overhead", D: "Offering Reserved Instance pricing for long-term committed workloads" },
    answer: "B",
    explanation: "AWS pools the purchasing power and usage of hundreds of thousands of customers, allowing it to negotiate better hardware prices, optimize data center construction, and drive down per-unit costs — savings it passes on as lower variable pricing. This is the definition of economies of scale in the cloud context. A describes availability architecture, not pricing drivers. C describes a service model benefit, not the root cause of lower prices. D is a specific discount mechanism, not the underlying economic principle.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company needs to run a mission-critical workload that cannot tolerate downtime. The workload must continue operating even if an entire AWS data center loses power. Which cloud deployment approach should the solutions architect recommend?",
    difficulty: "Exam Level",
    topic: "Benefits of the AWS Cloud",
    objective: "1.1",
    options: { A: "Deploy the workload across multiple AWS Regions", B: "Deploy the workload across multiple Availability Zones within a single Region", C: "Use a dedicated host to ensure physical isolation of the workload", D: "Enable AWS Auto Scaling to replace failed instances automatically" },
    answer: "B",
    explanation: "Each AWS Availability Zone (AZ) is one or more discrete data centers with redundant power, networking, and connectivity. By deploying across multiple AZs, a workload survives the failure of any single data center. This is the standard high-availability pattern for same-Region durability. A (multi-Region) is higher resilience but introduces significantly more complexity and cost — it's appropriate for disaster recovery against full-Region outages, not single data center failures. C (dedicated host) is about compliance and licensing, not high availability. D (Auto Scaling) replaces failed instances but requires a functioning AZ — it doesn't protect against AZ-level failure by itself.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An organization runs all of its workloads on AWS and has decommissioned its on-premises data center entirely. Which cloud deployment model does this represent?",
    difficulty: "Foundational",
    topic: "Cloud Deployment Models",
    objective: "1.1",
    options: { A: "Hybrid cloud", B: "Private cloud", C: "Cloud (public cloud)", D: "On-premises deployment" },
    answer: "C",
    explanation: "When all resources and workloads run on a public cloud provider such as AWS and there is no on-premises infrastructure, the deployment model is simply 'cloud' (also called public cloud). Hybrid cloud combines on-premises or private cloud infrastructure with a public cloud — the organization must use both for this classification. Private cloud means the cloud infrastructure is operated solely for a single organization, typically on-premises or in a co-location. On-premises means the infrastructure is not cloud-based at all.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A healthcare organization must keep patient records on infrastructure it controls due to regulatory requirements, but it also wants to use AWS for less-sensitive analytics workloads. Which deployment model describes this architecture?",
    difficulty: "Foundational",
    topic: "Cloud Deployment Models",
    objective: "1.1",
    options: { A: "Multi-cloud deployment", B: "Serverless deployment", C: "Hybrid deployment", D: "Full cloud deployment" },
    answer: "C",
    explanation: "A hybrid deployment connects on-premises (or private) infrastructure with cloud resources. Here the organization keeps sensitive records on-premises for compliance while using AWS for analytics — a textbook hybrid model. Multi-cloud means using multiple public cloud providers (e.g., AWS and Azure), with no mention of on-premises. Serverless describes a compute execution model, not a deployment topology. Full cloud means everything is in the cloud, which contradicts the requirement to keep records on controlled infrastructure.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "According to the AWS Well-Architected Framework, which pillar focuses on the ability of a workload to recover from infrastructure failures and dynamically acquire computing resources to meet demand?",
    difficulty: "Foundational",
    topic: "Reliability Pillar",
    objective: "1.2",
    options: { A: "Performance Efficiency", B: "Operational Excellence", C: "Reliability", D: "Cost Optimization" },
    answer: "C",
    explanation: "The Reliability pillar addresses the ability of a workload to perform its intended function correctly and consistently when expected. Key design principles include automatically recovering from failure, scaling horizontally to increase aggregate availability, and stopping guessing capacity. Performance Efficiency is about using resources efficiently at scale. Operational Excellence covers running and monitoring systems to deliver business value. Cost Optimization focuses on avoiding unnecessary spend.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A team is deploying a new microservices application on AWS. To follow the Operational Excellence pillar of the Well-Architected Framework, which practice should they adopt?",
    difficulty: "Exam Level",
    topic: "Operational Excellence Pillar",
    objective: "1.2",
    options: { A: "Use the cheapest available EC2 instance types to minimize cost", B: "Perform operations as code and make small, reversible changes", C: "Encrypt all data at rest and in transit", D: "Use Spot Instances for all stateless compute workloads" },
    answer: "B",
    explanation: "The Operational Excellence pillar design principles include performing operations as code (Infrastructure as Code, automated runbooks), making frequent small reversible changes rather than infrequent large ones, anticipating failure, and learning from operational events. A is a Cost Optimization behavior. C (encrypting data) is a Security pillar practice. D (Spot Instances) is a Cost Optimization pricing strategy, not an operational excellence principle.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company is designing an architecture for a globally distributed e-commerce platform. They want to ensure they use the right resource type and size based on workload requirements, and measure efficiency as their business grows. Which Well-Architected Framework pillar guides these decisions?",
    difficulty: "Exam Level",
    topic: "Performance Efficiency Pillar",
    objective: "1.2",
    options: { A: "Cost Optimization", B: "Performance Efficiency", C: "Reliability", D: "Sustainability" },
    answer: "B",
    explanation: "The Performance Efficiency pillar focuses on using computing resources efficiently to meet system requirements and maintaining that efficiency as demand changes and technologies evolve. Key areas include selecting the right resource types and sizes, monitoring performance, and making informed decisions to maintain efficiency as business needs grow. Cost Optimization focuses on eliminating unnecessary spend, not on efficiency of resource use per se. Reliability is about recovering from failures. Sustainability is about minimizing environmental impact.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A cloud architect wants to identify and eliminate over-provisioned EC2 instances and unused Elastic IP addresses to reduce unnecessary AWS spend. Which pillar of the AWS Well-Architected Framework is being applied?",
    difficulty: "Foundational",
    topic: "Cost Optimization Pillar",
    objective: "1.2",
    options: { A: "Security", B: "Reliability", C: "Performance Efficiency", D: "Cost Optimization" },
    answer: "D",
    explanation: "The Cost Optimization pillar focuses on avoiding unnecessary costs, which includes understanding and controlling expenditure, selecting the most appropriate resource types, and eliminating waste such as over-provisioned or idle resources. Security protects data and systems. Reliability ensures workloads recover from failure. Performance Efficiency ensures resources are used efficiently — right-sizing is a shared concept, but the primary driver of 'eliminate waste to reduce spend' maps to Cost Optimization.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A Well-Architected Framework review revealed that a company's data analytics pipeline runs GPU-intensive jobs on EC2 instances 24 hours a day, consuming far more energy than necessary because the jobs only run for four hours each night. Which pillar's design principles most directly address reducing the environmental impact of this workload?",
    difficulty: "Exam Level",
    topic: "Sustainability Pillar",
    objective: "1.2",
    options: { A: "Reliability", B: "Cost Optimization", C: "Sustainability", D: "Operational Excellence" },
    answer: "C",
    explanation: "The Sustainability pillar was added to the Well-Architected Framework in 2021 and focuses specifically on minimizing the environmental impact of running cloud workloads. Design principles include right-sizing to avoid over-provisioning, using managed services to reduce the infrastructure footprint, maximizing utilization of provisioned resources, and using the latest, more efficient hardware available. Running idle instances 20 hours per day wastes energy — Sustainability guidance would prescribe scheduling, right-sizing, or using event-driven/serverless patterns. Cost Optimization would also flag the waste financially, but the question targets environmental impact, which maps to Sustainability.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A cloud architect is conducting a Well-Architected review and discovers that the application has no automated backups, no defined recovery procedures, and relies on a single database instance. Which TWO Well-Architected Framework pillars are MOST relevant to addressing these gaps? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Well-Architected Framework",
    objective: "1.2",
    options: { A: "Reliability", B: "Cost Optimization", C: "Sustainability", D: "Operational Excellence", E: "Security" },
    answer: ["A", "D"],
    explanation: "A is correct: Reliability addresses the ability to recover from failures, including automated backups, cross-AZ replication, and defined recovery procedures. A single database instance with no backups directly violates Reliability best practices. D is correct: Operational Excellence covers defining and testing procedures for recovery, runbooks, and making operations observable — the lack of defined recovery procedures is an Operational Excellence gap as much as a Reliability one. B (Cost Optimization) and C (Sustainability) are about spending and environmental impact, not recovery. E (Security) is about protecting data and access, not about backup and recovery procedures.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An exam question lists the following pillars of the AWS Well-Architected Framework: Operational Excellence, Security, Reliability, Performance Efficiency, and Cost Optimization. What is MISSING from this list?",
    difficulty: "Foundational",
    topic: "Well-Architected Framework",
    objective: "1.2",
    options: { A: "Governance", B: "Availability", C: "Sustainability", D: "Scalability" },
    answer: "C",
    explanation: "The AWS Well-Architected Framework has SIX pillars. The sixth pillar, Sustainability, was added in 2021 to address the environmental impact of cloud workloads. A common trap on the CLF-C02 exam is questions or answer choices that list only five pillars — candidates who studied pre-2021 material may miss Sustainability. Governance, Availability, and Scalability are not Well-Architected Framework pillars; they are general cloud concepts addressed within the existing pillars.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to protect all of its workloads and data on AWS by implementing least-privilege access, enabling encryption at rest and in transit, and automating security event response. Which Well-Architected Framework pillar encompasses these practices?",
    difficulty: "Foundational",
    topic: "Well-Architected Framework",
    objective: "1.2",
    options: { A: "Operational Excellence", B: "Reliability", C: "Security", D: "Cost Optimization" },
    answer: "C",
    explanation: "The Security pillar of the Well-Architected Framework focuses on protecting information, systems, and assets. Its key areas include identity and access management (least privilege), detective controls, infrastructure protection, data protection (encryption at rest and in transit), and incident response. Operational Excellence is about running and monitoring systems. Reliability is about recovering from failures. Cost Optimization is about eliminating unnecessary spend.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to migrate its on-premises ERP application to AWS with minimal code changes. The team lifts the application onto EC2 instances and re-configures it to use Amazon RDS instead of a self-managed database server. Which migration strategy does this represent?",
    difficulty: "Exam Level",
    topic: "Cloud Migration Strategies (7 Rs)",
    objective: "1.3",
    options: { A: "Rehost (lift and shift)", B: "Replatform (lift, tinker, and shift)", C: "Refactor (re-architect)", D: "Repurchase (drop and shop)" },
    answer: "B",
    explanation: "Replatform (also called 'lift, tinker, and shift') involves moving to the cloud with a small number of optimizations — in this case, swapping the self-managed database for a managed RDS service — without changing the core architecture or business logic. Rehost (A) is a pure lift-and-shift with NO changes; the application moves as-is to EC2 (or equivalent). Refactor (C) is a significant re-architecture to take full advantage of cloud-native features (e.g., breaking a monolith into microservices). Repurchase (D) means moving to a different product — typically a SaaS solution — rather than migrating the existing application.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company is migrating a legacy monolithic application to AWS and plans to decompose it into microservices using AWS Lambda and Amazon SQS to take full advantage of cloud-native capabilities. Which of the 7 Rs migration strategies best describes this approach?",
    difficulty: "Exam Level",
    topic: "Cloud Migration Strategies (7 Rs)",
    objective: "1.3",
    options: { A: "Rehost", B: "Replatform", C: "Retire", D: "Refactor" },
    answer: "D",
    explanation: "Refactor (also called re-architect) means reimagining how the application is designed and developed by taking full advantage of cloud-native features. Decomposing a monolith into microservices with Lambda and SQS is a fundamental architectural change — the highest-investment and highest-benefit migration strategy. Rehost moves the application as-is. Replatform makes modest optimizations (like swapping the database) without changing the architecture. Retire means the application is decommissioned and not migrated.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "During a migration planning exercise, a team identifies a group of internal applications that are redundant, rarely used, and will reach end-of-life within six months. The team recommends simply shutting these down rather than migrating them. Which migration strategy applies?",
    difficulty: "Foundational",
    topic: "Cloud Migration Strategies (7 Rs)",
    objective: "1.3",
    options: { A: "Retain", B: "Retire", C: "Repurchase", D: "Rehost" },
    answer: "B",
    explanation: "Retire means decommissioning applications that are no longer needed. Identifying that roughly 10-20% of an application portfolio can simply be turned off is a common and cost-effective migration outcome — no cloud migration needed at all. Retain (A) means keeping the application where it is for now (often because migration cannot be justified yet or the application requires major changes before moving). Repurchase (C) means replacing with a SaaS product. Rehost (D) means migrating as-is to the cloud.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company's CRM system is tightly integrated with custom plugins and a vendor lock-in contract that expires in two years. The migration team decides to leave this system on-premises until the contract ends and a better cloud path can be planned. Which migration strategy applies?",
    difficulty: "Exam Level",
    topic: "Cloud Migration Strategies (7 Rs)",
    objective: "1.3",
    options: { A: "Retire", B: "Rehost", C: "Retain", D: "Relocate" },
    answer: "C",
    explanation: "Retain (sometimes called revisit) means keeping the application in its current environment — typically because migration is not yet technically feasible, economically justified, or contractually possible. The team is deferring migration, not abandoning it. Retire means shutting the application down entirely. Rehost means moving the application as-is to the cloud now. Relocate is a seventh strategy that involves moving infrastructure to the cloud (e.g., using VMware Cloud on AWS) with no changes to the operating model.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company replaces its on-premises HR software with a subscription to Workday (a SaaS HR platform) instead of migrating the legacy system to AWS. Which migration strategy does this represent?",
    difficulty: "Foundational",
    topic: "Cloud Migration Strategies (7 Rs)",
    objective: "1.3",
    options: { A: "Refactor", B: "Replatform", C: "Repurchase", D: "Rehost" },
    answer: "C",
    explanation: "Repurchase (also called 'drop and shop') means moving to a different product — commonly replacing a self-managed or on-premises application with a SaaS equivalent. Switching from on-premises HR software to Workday is the classic example. Refactor means re-architecting the existing application. Replatform means migrating the existing application with modest optimizations. Rehost means moving the application as-is to cloud infrastructure.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company's migration team is categorizing its application portfolio. Some applications will be moved as-is to EC2. Others will be discontinued. One mission-critical system will stay on-premises temporarily. Which TWO of the 7 Rs migration strategies are being applied? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Cloud Migration Strategies (7 Rs)",
    objective: "1.3",
    options: { A: "Rehost", B: "Refactor", C: "Retire", D: "Repurchase", E: "Replatform" },
    answer: ["A", "C"],
    explanation: "A is correct: Moving applications as-is to EC2 (no code changes, no architecture changes) is Rehost — the lift-and-shift strategy. C is correct: Discontinuing applications that are no longer needed is the Retire strategy. The mission-critical system staying on-premises temporarily would be Retain, which is not among the choices. Refactor (B) involves architectural changes. Repurchase (D) means switching to a SaaS product. Replatform (E) involves modest optimizations during migration.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which perspective of the AWS Cloud Adoption Framework (AWS CAF) focuses on managing IT assets, change management, and ensuring that cloud investments align with business outcomes?",
    difficulty: "Exam Level",
    topic: "Cloud Adoption Framework (CAF)",
    objective: "1.3",
    options: { A: "Platform perspective", B: "Security perspective", C: "Governance perspective", D: "Operations perspective" },
    answer: "C",
    explanation: "The Governance perspective of the AWS CAF focuses on aligning IT strategy with business strategy, managing IT portfolios, financial management of cloud investments, and ensuring compliance and change management processes. The Platform perspective covers the architecture, provisioning, and management of cloud technology. The Security perspective addresses confidentiality, integrity, and availability of data and systems. The Operations perspective covers monitoring, incident management, and business continuity.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company's cloud migration has stalled because employees lack the cloud skills to build and operate new infrastructure, and existing HR processes were not designed for cloud-native roles. Which AWS CAF perspective should the company focus on?",
    difficulty: "Exam Level",
    topic: "Cloud Adoption Framework (CAF)",
    objective: "1.3",
    options: { A: "Business perspective", B: "People perspective", C: "Platform perspective", D: "Operations perspective" },
    answer: "B",
    explanation: "The People perspective of the AWS CAF addresses organizational change management, cloud fluency, workforce transformation, and culture evolution. When the human and organizational factors — skills gaps, role changes, HR processes — are blocking cloud adoption, the People perspective provides the framework to address them. The Business perspective focuses on strategy, outcomes, and investment priorities. The Platform perspective covers technology architecture. The Operations perspective covers running and monitoring cloud workloads.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A large enterprise wants to make sure its cloud adoption generates measurable business value, tracks cloud investments against financial goals, and ensures stakeholder expectations are met. Which AWS CAF perspective provides this guidance?",
    difficulty: "Exam Level",
    topic: "Cloud Adoption Framework (CAF)",
    objective: "1.3",
    options: { A: "Security perspective", B: "Governance perspective", C: "Business perspective", D: "Operations perspective" },
    answer: "C",
    explanation: "The Business perspective of the AWS CAF ensures cloud investments accelerate business outcomes. It helps create a strong business case for the cloud, aligns cloud strategy to business strategy, and establishes mechanisms to measure business value from cloud adoption. The Governance perspective manages IT portfolios and change management but is more internally IT-focused than outcomes-focused. The Security perspective is about protecting data and systems. The Operations perspective is about managing workloads day-to-day.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "The AWS Cloud Adoption Framework (CAF) organizes its perspectives into two groups. Which TWO of the following are CAF perspectives that belong to the technical capability group? (Select TWO.)",
    difficulty: "Hard",
    topic: "Cloud Adoption Framework (CAF)",
    objective: "1.3",
    options: { A: "Business", B: "Platform", C: "People", D: "Security", E: "Governance" },
    answer: ["B", "D"],
    explanation: "The AWS CAF groups its six perspectives into two capability groups. Technical capabilities: Platform, Security, and Operations. Business capabilities: Business, People, and Governance. Platform (B) covers cloud architecture, provisioning, and technology management — clearly technical. Security (D) addresses protecting data and systems through technical controls — also technical. Business (A), People (C), and Governance (E) all belong to the business capabilities group, addressing strategy, workforce, and management processes rather than technology implementation.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company is building a business case for migrating to AWS. The CFO wants to understand the total cost of running the current on-premises environment compared to running equivalent workloads on AWS. Which AWS tool or concept helps with this analysis?",
    difficulty: "Foundational",
    topic: "Cloud Economics",
    objective: "1.4",
    options: { A: "AWS Budgets", B: "Total Cost of Ownership (TCO) analysis using the AWS Pricing Calculator", C: "AWS Cost Explorer", D: "AWS Trusted Advisor" },
    answer: "B",
    explanation: "A Total Cost of Ownership (TCO) analysis compares the full costs of on-premises infrastructure (servers, power, cooling, facilities, staff, depreciation) against equivalent AWS spend. The AWS Pricing Calculator helps model the AWS cost side of that comparison. AWS Budgets alerts when spending exceeds defined thresholds — it is a cost management tool, not a migration business case tool. AWS Cost Explorer analyzes existing AWS spend over time but requires an active AWS deployment. Trusted Advisor provides best-practice recommendations for active AWS environments, not on-premises comparisons.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A solutions architect is designing a new application on AWS. Following the Reliability pillar's design principle of 'test recovery procedures,' what should the team do?",
    difficulty: "Hard",
    topic: "Reliability Pillar",
    objective: "1.2",
    options: { A: "Configure AWS Backup to copy snapshots to a second Region quarterly", B: "Simulate failures in a production-like environment to validate that recovery processes actually work", C: "Enable Multi-AZ on Amazon RDS to provide automatic failover capability", D: "Set CloudWatch alarms to alert the on-call team when instances become unhealthy" },
    answer: "B",
    explanation: "The 'test recovery procedures' design principle under Reliability states that recovery procedures should be tested — not assumed to work. In traditional on-premises environments, companies often only discover their recovery processes fail when they actually need them. Cloud environments allow teams to simulate failures regularly (e.g., using chaos engineering) to validate that recovery mechanisms function correctly. A (cross-Region backups) builds backup capability but does not test recovery. C (Multi-AZ) is infrastructure-level redundancy, not a test of recovery procedures. D (alarms) helps detect failure but does not test whether recovery works.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A development team wants to deploy a new feature to a single AWS Region first to reduce the blast radius of any problems before rolling it out globally. Which Operational Excellence design principle does this align with?",
    difficulty: "Hard",
    topic: "Operational Excellence Pillar",
    objective: "1.2",
    options: { A: "Learn from all operational failures", B: "Make frequent, small, reversible changes", C: "Anticipate failure", D: "Refine operations procedures frequently" },
    answer: "B",
    explanation: "Deploying to a single Region first is a small, incremental, reversible change strategy — rather than a large, infrequent, hard-to-rollback release. This is the 'make frequent, small, reversible changes' Operational Excellence principle. It reduces the blast radius of any issues. 'Learn from all operational failures' (A) is a post-event retrospective principle. 'Anticipate failure' (C) involves designing with the assumption that components will fail, such as removing single points of failure. 'Refine operations procedures frequently' (D) is about continuously improving runbooks and processes.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company is reviewing its AWS architecture. The team discovers it is running large, expensive On-Demand instances for workloads that only need to run two hours each day. Which Cost Optimization design principle should guide their next action?",
    difficulty: "Exam Level",
    topic: "Cost Optimization Pillar",
    objective: "1.2",
    options: { A: "Implement cloud financial management practices", B: "Measure overall efficiency and eliminate unneeded expense", C: "Adopt a consumption model and pay only for what you use", D: "Stop spending money on undifferentiated heavy lifting" },
    answer: "C",
    explanation: "Adopting a consumption model means provisioning resources only when needed and de-provisioning when the work is done — rather than running instances 24/7 for jobs that only run two hours daily. This could involve scheduled stop/start automation or serverless/event-driven compute. 'Measure overall efficiency' (B) is about tracking the output produced per dollar spent — relevant but less specific to this pattern. 'Implement cloud financial management' (A) is a broader organizational capability. 'Stop spending on undifferentiated heavy lifting' (D) is about moving from commodity infrastructure tasks to managed services, not about scheduling.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A media company is designing a new video transcoding service on AWS. The architect recommends using AWS Lambda for the transcoding jobs instead of always-on EC2 instances, citing reduced power consumption and lower resource waste as key benefits. Which Well-Architected pillar most directly supports this recommendation?",
    difficulty: "Hard",
    topic: "Sustainability Pillar",
    objective: "1.2",
    options: { A: "Performance Efficiency", B: "Cost Optimization", C: "Reliability", D: "Sustainability" },
    answer: "D",
    explanation: "The Sustainability pillar guidance recommends using managed and serverless services to reduce the infrastructure needed, and maximizing utilization rather than running idle resources. Lambda runs only during actual invocations — eliminating idle EC2 capacity and reducing energy consumption. While Cost Optimization (B) would also benefit from this change, the question specifically frames the recommendation around reduced power consumption and resource waste, which are environmental impact concerns squarely in the Sustainability pillar.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company wants to ensure its cloud workloads are designed with the Security pillar of the AWS Well-Architected Framework in mind. Which TWO of the following practices align with the Security pillar? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Well-Architected Framework",
    objective: "1.2",
    options: { A: "Enable all users to have administrator access for maximum flexibility", B: "Apply the principle of least privilege to all IAM identities", C: "Encrypt sensitive data at rest and in transit", D: "Use the largest available EC2 instances to prevent performance bottlenecks", E: "Schedule workloads to run only during business hours to reduce cost" },
    answer: ["B", "C"],
    explanation: "B is correct: Least-privilege access is a foundational Security pillar principle — grant only the permissions necessary to perform a task, and no more. C is correct: Encrypting data at rest and in transit is a key Security pillar data protection practice. A contradicts least privilege and is explicitly against Security guidance. D is a Performance Efficiency concern (right-sizing), not a Security concern. E is a Cost Optimization or Sustainability scheduling pattern, not a security practice.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company is analyzing whether to purchase new on-premises servers or migrate to AWS. A key factor in the decision is that the company currently employs five full-time server administrators whose primary job is patching hardware and maintaining the data center. Which cloud benefit addresses this factor?",
    difficulty: "Foundational",
    topic: "Benefits of the AWS Cloud",
    objective: "1.1",
    options: { A: "Increase speed and agility", B: "Go global in minutes", C: "Stop spending money on running and maintaining data centers", D: "Benefit from massive economies of scale" },
    answer: "C",
    explanation: "The cost of data center staff who perform undifferentiated heavy lifting — hardware patching, facilities management, physical security — is a direct operational expense of running on-premises infrastructure. 'Stop spending money on running and maintaining data centers' captures this benefit: AWS takes over the physical infrastructure layer, potentially freeing those staff to work on higher-value activities. 'Increase speed and agility' (A) addresses development velocity. 'Go global in minutes' (B) is about geographic expansion. 'Economies of scale' (D) is about AWS's purchasing power reducing per-unit costs.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company is building its cloud migration business case. Which TWO factors are typically included in an on-premises Total Cost of Ownership (TCO) analysis that are ELIMINATED when migrating to AWS? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Cloud Economics",
    objective: "1.4",
    options: { A: "Data transfer costs for moving data between AWS services", B: "Server hardware purchase, refresh, and depreciation costs", C: "Physical data center facility costs such as power and cooling", D: "AWS IAM user management and access control configuration", E: "Network bandwidth costs within the AWS backbone" },
    answer: ["B", "C"],
    explanation: "B is correct: On-premises TCO includes the capital and ongoing cost of purchasing, refreshing, and depreciating physical server hardware — costs that disappear when migrating to AWS. C is correct: Physical data center costs including real estate, power, cooling, and facilities staff are on-premises overheads that are eliminated when AWS manages the physical layer. A (data transfer costs) can still apply when moving data between AWS services or out to the internet. D (IAM management) is a new AWS task that the company takes on — not an eliminated cost. E (intra-AWS backbone bandwidth) is managed by AWS but the customer does pay for some data transfer costs.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company running workloads on AWS wants to reduce costs by ensuring that none of its EC2 instances are over-provisioned. The team reviews CPU and memory utilization metrics and downsizes underutilized instances to the smallest size that still meets performance requirements. This practice is known as what?",
    difficulty: "Exam Level",
    topic: "Cloud Economics",
    objective: "1.4",
    options: { A: "Reserved Instance matching", B: "Right-sizing", C: "Spot Instance adoption", D: "Savings Plans enrollment" },
    answer: "B",
    explanation: "Right-sizing is the process of matching EC2 instance types and sizes to actual workload requirements based on performance metrics. It is one of the most effective cost optimization techniques because it directly eliminates waste from over-provisioned resources. Reserved Instance matching (A) is about applying reserved capacity to running instances. Spot Instance adoption (C) is about using spare capacity at a discount. Savings Plans enrollment (D) is a commitment-based discount model. None of these three specifically describe the analysis and resizing process.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which AWS CAF perspective provides guidance on building a cloud-capable technology platform, managing hybrid environments, and implementing architecture patterns aligned with business requirements?",
    difficulty: "Exam Level",
    topic: "Cloud Adoption Framework (CAF)",
    objective: "1.3",
    options: { A: "Business perspective", B: "Operations perspective", C: "Platform perspective", D: "Governance perspective" },
    answer: "C",
    explanation: "The Platform perspective of the AWS CAF focuses on building an enterprise-grade hybrid cloud platform, implementing cloud architecture patterns, and managing the technology stack. It covers topics like provisioning, architectural standards, and data architecture. The Business perspective is about strategy and outcomes. The Operations perspective is about running and managing cloud workloads. The Governance perspective is about aligning IT with business goals and managing change.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A migration team is moving a self-managed MySQL database server to AWS. The team wants to minimize code changes to the application but decides to switch from self-managing the database engine on EC2 to using Amazon RDS for MySQL, gaining automated backups and patching. Which migration strategy does this represent?",
    difficulty: "Exam Level",
    topic: "Cloud Migration Strategies (7 Rs)",
    objective: "1.3",
    options: { A: "Rehost", B: "Refactor", C: "Repurchase", D: "Replatform" },
    answer: "D",
    explanation: "Replatform (also called 'lift, tinker, and shift') involves migrating to the cloud with a small number of targeted optimizations — in this case swapping a self-managed database engine for Amazon RDS — without changing the core application architecture or business logic. The application code is largely unchanged, but the team takes advantage of a managed service. Rehost (A) is a pure lift-and-shift with no optimizations at all — the database would remain self-managed on EC2. Refactor (B) means fundamentally re-architecting the application (e.g., breaking a monolith into microservices). Repurchase (C) means replacing the existing application with a different commercial product entirely.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An enterprise's CFO observes that their AWS bill increases every month as the company grows. The finance team is struggling to predict cloud costs three months in advance. Which cloud economic characteristic does this challenge reflect?",
    difficulty: "Hard",
    topic: "Cloud vs On-Premises (CapEx vs OpEx)",
    objective: "1.4",
    options: { A: "The inability of AWS to offer volume discounts", B: "The variable nature of operational expenditure in the cloud", C: "The high capital expenditure associated with reserved instances", D: "The fixed cost structure of cloud billing" },
    answer: "B",
    explanation: "Cloud billing is fundamentally variable (OpEx) — costs scale with consumption. This is a benefit for new workloads (no upfront investment) but creates forecasting complexity for finance teams accustomed to fixed, predictable CapEx budgets. The challenge described is the classic transition pain of cloud financial management: consumption-based billing requires new forecasting and governance practices. A is wrong: AWS offers significant volume discounts. C is wrong: Reserved Instances reduce variable cost but are not capital expenditure in the traditional sense. D is wrong: cloud billing is variable, not fixed.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A software startup has no physical data centers and builds all of its products entirely on AWS, using AWS services for compute, storage, databases, and networking. There is no self-managed infrastructure of any kind. Which cloud deployment model does this describe?",
    difficulty: "Foundational",
    topic: "Cloud Deployment Models",
    objective: "1.1",
    options: { A: "Hybrid deployment", B: "On-premises deployment", C: "Cloud deployment", D: "Private cloud deployment" },
    answer: "C",
    explanation: "A cloud deployment (also called a fully cloud-based or public cloud deployment) means all components of the application run in the cloud — no on-premises or private data center infrastructure is involved. AWS explicitly defines this model as one of the three main cloud deployment models. Hybrid deployment combines cloud resources with on-premises infrastructure. On-premises deployment keeps everything in the organization's own data center without using cloud services. Private cloud means cloud infrastructure operated solely for one organization, typically on-premises.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company wants to optimize its AWS spending by ensuring it pays only for what it uses and avoids over-provisioning. Which TWO cloud economic concepts or benefits directly support this goal? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Cloud Economics",
    objective: "1.4",
    options: { A: "Trade capital expenditure for variable operational expenditure", B: "Adopting a consumption-based pricing model", C: "Purchasing Reserved Instances in three-year terms for all workloads", D: "Deploying workloads across multiple AWS Regions for redundancy", E: "Purchasing Dedicated Hosts to comply with licensing requirements" },
    answer: ["A", "B"],
    explanation: "A is correct: Trading CapEx for variable OpEx means spending correlates with actual usage rather than capacity purchased in advance — directly eliminating waste from over-provisioning. B is correct: A consumption-based pricing model charges only for what is consumed, so an idle resource incurs no cost (or minimal cost) — this is the core mechanism that prevents over-provisioning waste. C (three-year Reserved Instances for all workloads) commits spend upfront and could create new over-provisioning problems for variable workloads. D (multi-Region redundancy) increases reliability and cost, not efficiency. E (Dedicated Hosts) is a compliance and licensing tool, not a cost optimization mechanism.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A manufacturer wants to migrate its factory automation software to AWS. The software is tightly coupled to a legacy operating system that will reach end-of-support in 18 months. The team decides to fully modernize the application to be cloud-native, using containers and a serverless orchestration layer. Which 7 Rs strategy are they pursuing?",
    difficulty: "Hard",
    topic: "Cloud Migration Strategies (7 Rs)",
    objective: "1.3",
    options: { A: "Replatform", B: "Relocate", C: "Refactor", D: "Rehost" },
    answer: "C",
    explanation: "Refactor (re-architect) involves fundamentally redesigning and reimplementing the application to take full advantage of cloud-native capabilities — in this case moving to containers and serverless. It is the most expensive and time-consuming migration strategy but delivers the greatest long-term cloud benefit. Replatform (A) involves modest optimizations, not full re-architecture. Relocate (B) moves infrastructure to AWS with minimal changes (e.g., VMware Cloud on AWS). Rehost (D) is a lift-and-shift with no changes at all.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "According to the AWS Well-Architected Framework, which of the following is a design principle of the Performance Efficiency pillar?",
    difficulty: "Exam Level",
    topic: "Performance Efficiency Pillar",
    objective: "1.2",
    options: { A: "Protect data in transit and at rest", B: "Democratize advanced technologies by consuming them as services", C: "Perform operations as code", D: "Identify and eliminate unused resources" },
    answer: "B",
    explanation: "'Democratize advanced technologies' is a Performance Efficiency pillar design principle. The idea is that cloud providers offer advanced technologies — such as machine learning, data processing, and media transcoding — as managed services, so teams can consume them without building and maintaining the underlying infrastructure themselves. This lets teams focus on differentiation rather than commodity technology. 'Protect data in transit and at rest' (A) is a Security pillar concept. 'Perform operations as code' (C) is an Operational Excellence principle. 'Identify and eliminate unused resources' (D) aligns with Cost Optimization.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company is reviewing the six pillars of the AWS Well-Architected Framework to assess which one most directly addresses the question: 'How do we reduce the carbon footprint of our cloud workloads?'",
    difficulty: "Foundational",
    topic: "Sustainability Pillar",
    objective: "1.2",
    options: { A: "Operational Excellence", B: "Cost Optimization", C: "Sustainability", D: "Reliability" },
    answer: "C",
    explanation: "The Sustainability pillar was added specifically to address the environmental impact of cloud workloads, including carbon footprint, energy consumption, and efficient resource usage. The pillar's design principles include maximizing utilization, using managed and serverless services to reduce waste, selecting efficient hardware, and minimizing data movement. Cost Optimization (B) reduces financial waste and often overlaps with sustainability improvements, but the carbon footprint question maps directly to the Sustainability pillar.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company's cloud team is performing a Well-Architected Review and identifies that their architecture has no defined process for continuous improvement of operational procedures. Which pillar's design principle is most directly violated?",
    difficulty: "Hard",
    topic: "Operational Excellence Pillar",
    objective: "1.2",
    options: { A: "Reliability — scale horizontally to increase aggregate workload availability", B: "Security — automate security best practices", C: "Operational Excellence — refine operations procedures frequently", D: "Cost Optimization — implement cloud financial management" },
    answer: "C",
    explanation: "'Refine operations procedures frequently' is an Operational Excellence pillar design principle. Teams should look for opportunities to improve their operational procedures as the workload evolves, holding regular retrospectives after failures and incorporating lessons learned into updated runbooks. The absence of this process is an Operational Excellence gap. Reliability (A) is about recovering from failure. Security (B) is about protection. Cost Optimization (D) is about spending efficiency.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "The AWS CAF includes six perspectives. Which perspective is MOST focused on ensuring that identity, access management, vulnerability management, and data protection controls are in place across the cloud environment?",
    difficulty: "Exam Level",
    topic: "Cloud Adoption Framework (CAF)",
    objective: "1.3",
    options: { A: "Governance perspective", B: "Operations perspective", C: "Security perspective", D: "Platform perspective" },
    answer: "C",
    explanation: "The Security perspective of the AWS CAF focuses on confidentiality, integrity, and availability of data and cloud workloads. Its capability areas include identity and access management, detective controls, infrastructure protection, data protection (encryption and key management), and incident response. Governance is about aligning IT with business and managing change. Operations is about running and managing workloads. Platform is about architecture and technology infrastructure.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A large enterprise with hundreds of AWS accounts wants a structured approach to cloud adoption that includes a landing zone, account vending, and pre-built governance guardrails. Which AWS service provides this capability, and which AWS CAF perspective does it primarily support?",
    difficulty: "Hard",
    topic: "Cloud Adoption Framework (CAF)",
    objective: "1.3",
    options: { A: "AWS Organizations — Governance perspective", B: "AWS Control Tower — Governance perspective", C: "AWS Config — Security perspective", D: "AWS Service Catalog — Platform perspective" },
    answer: "B",
    explanation: "AWS Control Tower automates the setup of a secure, multi-account AWS environment (landing zone) with pre-configured governance guardrails — aligning directly with the Governance perspective's focus on managing IT portfolios, enforcing policies, and automating compliance. AWS Organizations (A) is the underlying multi-account container used by Control Tower but provides fewer opinionated guardrails. AWS Config (C) records resource configurations and assesses compliance rules — primarily a Security/Operations tool. AWS Service Catalog (D) manages portfolios of approved IT products — a Platform/Governance tool but not the landing zone solution.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company's Well-Architected review identifies two gaps: (1) workloads crash during traffic spikes because capacity was fixed at design time, and (2) there is no automated mechanism to replace failed components. Which TWO Reliability pillar design principles address these gaps? (Select TWO.)",
    difficulty: "Hard",
    topic: "Reliability Pillar",
    objective: "1.2",
    options: { A: "Stop guessing capacity — use Auto Scaling to provision dynamically", B: "Perform operations as code", C: "Automatically recover from failure", D: "Use managed services to reduce operational burden", E: "Democratize advanced technologies" },
    answer: ["A", "C"],
    explanation: "A is correct: The Reliability pillar principle of not guessing capacity means using Auto Scaling and elastic services so capacity adjusts dynamically with demand rather than being fixed — directly solving the traffic spike crash problem. C is correct: Automatically recovering from failure is a Reliability principle that requires designing workloads to detect and replace failed components without human intervention — directly solving the second gap. B (perform operations as code) is an Operational Excellence principle. D (managed services) is relevant but is not a specific Reliability design principle. E (democratize advanced technologies) is a Performance Efficiency principle.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which statement BEST describes the 'Relocate' strategy in the AWS 7 Rs migration framework?",
    difficulty: "Hard",
    topic: "Cloud Migration Strategies (7 Rs)",
    objective: "1.3",
    options: { A: "Move an application to a different SaaS provider without modifying functionality", B: "Transfer existing virtualized infrastructure to the cloud using VMware Cloud on AWS without re-architecting", C: "Move an application as-is from on-premises to EC2 without any changes", D: "Shut down and decommission an application that is no longer needed" },
    answer: "B",
    explanation: "Relocate is the seventh 'R' (sometimes excluded from older five-R or six-R frameworks). It means transferring existing VMware-based infrastructure to VMware Cloud on AWS — moving at the hypervisor level without changing the operating model, applications, or tools. It is often confused with Rehost, but the key distinction is that Relocate preserves the VMware environment rather than converting VMs to native EC2. A describes Repurchase. C describes Rehost. D describes Retire.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company runs its web application on Amazon EC2 instances. The security team wants to know who is responsible for patching the operating system on those instances. Which statement correctly describes this responsibility under the AWS Shared Responsibility Model?",
    difficulty: "Exam Level",
    topic: "Shared Responsibility Model",
    objective: "2.1",
    options: { A: "AWS patches the OS because the instances run on AWS infrastructure.", B: "The customer is responsible for patching the OS on EC2 instances.", C: "AWS and the customer share OS patching duties on a weekly rotation.", D: "The AMI vendor is always responsible for OS patches regardless of instance type." },
    answer: "B",
    explanation: "With EC2 (IaaS), the customer controls the OS and therefore owns OS patching — this is 'security IN the cloud.' AWS is responsible for 'security OF the cloud,' meaning the physical hardware, hypervisor, and underlying infrastructure. Option A is wrong because AWS's responsibility stops at the hypervisor layer. Option C is wrong because there is no shared rotation for OS patching. Option D is wrong because the AMI vendor provides the base image but post-launch patching belongs to the customer.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An organization migrates its relational database to Amazon RDS. After migration, the database administrator asks whether they still need to patch the database engine. What does the AWS Shared Responsibility Model say about this?",
    difficulty: "Exam Level",
    topic: "Shared Responsibility Model",
    objective: "2.1",
    options: { A: "The customer must patch the RDS database engine just as they would on-premises.", B: "AWS manages database engine patches for RDS because it is a managed service.", C: "The customer patches the engine but AWS patches the underlying OS.", D: "Patching is shared equally between AWS and the customer for RDS." },
    answer: "B",
    explanation: "RDS is a managed (PaaS-style) service. AWS patches the database engine and the underlying OS for RDS. This is the boundary shift compared to EC2: with EC2 the customer patches the OS and DB engine; with RDS the customer's responsibility shifts up to data, schema, access control, and application logic. Option A describes the EC2 model, not RDS. Option C is partly right about the OS but wrong that the customer patches the engine. Option D incorrectly implies equal sharing.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A developer stores customer records in an Amazon S3 bucket and configures a bucket policy to allow public read access. A data breach later exposes those records. Which party bears responsibility for the misconfigured bucket policy?",
    difficulty: "Hard",
    topic: "Shared Responsibility Model",
    objective: "2.1",
    options: { A: "AWS, because S3 is a managed service and AWS controls access settings.", B: "AWS, because S3 durability guarantees imply security guarantees.", C: "The customer, because bucket policies and data classification are customer responsibilities.", D: "Both AWS and the customer equally, because S3 is a shared service." },
    answer: "C",
    explanation: "Regardless of the service model, customers always own their data and the access controls they configure on that data. S3 bucket policies, ACLs, encryption configuration, and data classification are explicitly customer responsibilities under the Shared Responsibility Model. AWS is responsible for S3 durability, availability, and the underlying infrastructure — not for how customers configure access. Option A is wrong: 'managed' refers to infrastructure management, not access policy. Option B confuses durability (data integrity) with security (access control). Option D incorrectly distributes responsibility for a customer-controlled configuration.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which of the following is ALWAYS the customer's responsibility, regardless of whether the workload runs on EC2, RDS, or AWS Lambda?",
    difficulty: "Exam Level",
    topic: "Shared Responsibility Model",
    objective: "2.1",
    options: { A: "Patching the underlying hypervisor.", B: "Managing Identity and Access Management (IAM) permissions and user data.", C: "Maintaining physical security of the data center.", D: "Patching the managed database engine." },
    answer: "B",
    explanation: "IAM permissions and data are always the customer's responsibility regardless of service type. Even with fully serverless Lambda, the customer controls who can invoke functions, what data the function processes, and how that data is classified. Options A and C are always AWS responsibilities. Option D applies only to self-managed databases on EC2 — for RDS it shifts to AWS.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Under the AWS Shared Responsibility Model, which layer represents AWS's responsibility described as 'security OF the cloud'?",
    difficulty: "Foundational",
    topic: "Shared Responsibility Model",
    objective: "2.1",
    options: { A: "Customer IAM policies and multi-factor authentication settings.", B: "Encryption of data stored by the customer in S3.", C: "Physical facilities, network infrastructure, hardware, and the virtualization layer.", D: "Operating system patches on Amazon EC2 instances." },
    answer: "C",
    explanation: "'Security OF the cloud' is AWS's responsibility: the physical data centers, global network infrastructure, hardware, and the virtualization/hypervisor layer that runs all services. Option A (IAM), Option B (customer-configured S3 encryption), and Option D (EC2 OS patches) are all 'security IN the cloud' — the customer's side of the model.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A startup runs all workloads using AWS Lambda functions with no EC2 instances. Compared to using EC2, which customer security responsibility is ELIMINATED when using only Lambda?",
    difficulty: "Hard",
    topic: "Shared Responsibility Model",
    objective: "2.1",
    options: { A: "Protecting customer data stored in the function's environment variables.", B: "Managing IAM execution roles attached to the Lambda functions.", C: "Patching and maintaining the underlying compute operating system.", D: "Encrypting sensitive data before passing it to the Lambda function." },
    answer: "C",
    explanation: "Lambda is a fully managed serverless compute service. AWS manages the underlying OS, runtime patches, and server infrastructure — customers never access or patch the OS. This is the responsibility boundary shift for serverless (PaaS/FaaS) vs IaaS. Options A, B, and D remain the customer's responsibility regardless: data protection, IAM roles, and encryption of sensitive inputs are always customer duties.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company is evaluating the AWS Shared Responsibility Model before migrating workloads. Which TWO items are ALWAYS the customer's responsibility, regardless of the AWS service used? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Shared Responsibility Model",
    objective: "2.1",
    options: { A: "Patching the guest operating system on EC2 instances.", B: "Classifying the data stored in AWS services.", C: "Maintaining the physical security of AWS Availability Zones.", D: "Managing AWS Lambda runtime patch levels.", E: "Configuring IAM policies and granting access to AWS resources." },
    answer: ["B", "E"],
    explanation: "Data classification (B) and IAM configuration (E) are always the customer's responsibility across all service models — IaaS, PaaS, and SaaS. Option A (OS patching) applies only to EC2, not managed services. Option C (physical security) is always AWS. Option D (Lambda runtime patches) is AWS's responsibility in the serverless model.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An auditor asks which AWS service allows a company to download AWS compliance reports such as SOC 2 Type II and ISO 27001 certifications for their own audits. Which service fulfills this requirement?",
    difficulty: "Foundational",
    topic: "AWS Artifact",
    objective: "2.2",
    options: { A: "AWS Config", B: "AWS Audit Manager", C: "AWS Artifact", D: "AWS Security Hub" },
    answer: "C",
    explanation: "AWS Artifact is the self-service portal for on-demand access to AWS compliance reports (SOC 1/2/3, ISO certifications, PCI DSS, FedRAMP, and more) and AWS agreements. Config tracks resource configuration compliance. Audit Manager automates evidence collection for internal assessments. Security Hub aggregates security findings — it does not provide downloadable AWS compliance certificates.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A healthcare company needs to ensure its use of AWS meets HIPAA requirements. Which AWS resource provides an overview of which services are covered under the AWS HIPAA Business Associate Addendum (BAA)?",
    difficulty: "Exam Level",
    topic: "AWS Compliance Programs",
    objective: "2.2",
    options: { A: "AWS Shield Advanced compliance dashboard.", B: "AWS Compliance Programs documentation and the AWS Artifact agreement section.", C: "Amazon GuardDuty threat intelligence reports.", D: "AWS Trusted Advisor security checks." },
    answer: "B",
    explanation: "AWS Compliance Programs documentation describes which services are in scope for HIPAA, PCI DSS, FedRAMP, GDPR, and other frameworks. AWS Artifact also lets customers sign and download the HIPAA BAA. Shield Advanced is a DDoS protection service with no HIPAA scope documentation. GuardDuty provides threat intelligence. Trusted Advisor surfaces security best-practice checks, not regulatory framework scope.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company's AWS environment spans multiple accounts. A security engineer needs to monitor configuration changes to resources — such as detecting when an S3 bucket's public-access block is disabled — and evaluate those changes against company compliance rules. Which AWS service is best suited for this task?",
    difficulty: "Exam Level",
    topic: "AWS Config",
    objective: "2.2",
    options: { A: "Amazon GuardDuty", B: "AWS CloudTrail", C: "AWS Config", D: "Amazon Macie" },
    answer: "C",
    explanation: "AWS Config records configuration changes to AWS resources and evaluates those changes against Config Rules to determine compliance. It is the correct tool for 'has this resource been configured correctly?' questions. GuardDuty detects threats from log analysis but does not evaluate resource configuration. CloudTrail logs API calls (who did what, when) but does not evaluate ongoing resource compliance posture. Macie discovers PII in S3 but does not evaluate general resource configuration.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company uses multiple AWS accounts managed under AWS Organizations. The central security team wants to prevent any account in the organization from disabling AWS CloudTrail. Which Organizations feature enforces this restriction?",
    difficulty: "Hard",
    topic: "AWS Organizations",
    objective: "2.2",
    options: { A: "Permission boundaries on IAM roles in each account.", B: "Service Control Policies (SCPs) applied at the organizational unit level.", C: "AWS Config rules that auto-remediate CloudTrail when disabled.", D: "AWS Control Tower's mandatory guardrails dashboard." },
    answer: "B",
    explanation: "Service Control Policies (SCPs) are the mechanism within AWS Organizations to set maximum permission boundaries across accounts. An SCP can explicitly deny cloudtrail:StopLogging or cloudtrail:DeleteTrail, preventing any IAM principal in affected accounts from disabling CloudTrail — regardless of their IAM permissions. SCPs never grant permissions; they only restrict what is allowed. Permission boundaries (A) apply to individual IAM entities, not organization-wide. Config rules (C) can detect and remediate after the fact but cannot prevent the action. Control Tower mandatory guardrails (D) are built on SCPs and Config, but the mechanism itself is SCPs.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A large enterprise has 50 AWS accounts. The cloud governance team wants a single consolidated bill and the ability to group accounts by business unit to apply different guardrails. Which AWS service provides account grouping into Organizational Units (OUs) with policy-based controls?",
    difficulty: "Foundational",
    topic: "AWS Organizations",
    objective: "2.2",
    options: { A: "AWS Control Tower", B: "AWS Organizations", C: "AWS Service Catalog", D: "AWS Config" },
    answer: "B",
    explanation: "AWS Organizations is the foundational service for managing multiple AWS accounts. It provides consolidated billing, account grouping into Organizational Units (OUs), and Service Control Policies (SCPs). Control Tower is built on Organizations and provides a guided landing zone setup with pre-configured guardrails — but the underlying OU structure and SCPs are Organizations constructs. Service Catalog manages approved product portfolios. Config evaluates resource compliance.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to set up a new multi-account AWS environment following best practices with automated guardrails, a pre-configured landing zone, and centralized logging from the start. Which AWS service is specifically designed for this guided setup experience?",
    difficulty: "Exam Level",
    topic: "AWS Control Tower",
    objective: "2.2",
    options: { A: "AWS Organizations with manually authored SCPs.", B: "AWS Control Tower.", C: "AWS CloudFormation StackSets.", D: "AWS Security Hub with CIS Benchmark standards." },
    answer: "B",
    explanation: "AWS Control Tower orchestrates a well-architected multi-account landing zone on top of AWS Organizations. It automates account provisioning, enables mandatory guardrails (SCPs + Config rules), and sets up a Log Archive account and Audit account. Organizations alone requires manual configuration. CloudFormation StackSets can deploy resources across accounts but does not provide the guided landing zone experience. Security Hub aggregates findings but does not provision a multi-account structure.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A solutions architect is explaining AWS Organizations to a new team. Which TWO statements accurately describe Service Control Policies (SCPs)? (Select TWO.)",
    difficulty: "Hard",
    topic: "AWS Organizations",
    objective: "2.2",
    options: { A: "An SCP can grant permissions to IAM users that exceed what is defined in their IAM policies.", B: "SCPs set the maximum permissions boundary for accounts in an organizational unit.", C: "Even if an SCP allows an action, the IAM policy in the account must also allow it for the action to succeed.", D: "SCPs apply only to the root account and do not affect member accounts.", E: "An SCP that denies an action overrides any IAM policy that allows the same action." },
    answer: ["B", "C"],
    explanation: "SCPs define the maximum permissions ceiling (B) — they do not grant permissions by themselves; both the SCP and the IAM policy must allow an action for it to succeed (C). Option A is wrong because SCPs never grant permissions. Option D is wrong because SCPs apply to member accounts within the OU or organization, not just the root. Option E is a partial truth — an SCP deny does override an IAM allow, but the question says 'any IAM policy,' which could include Service Control Policies themselves; the core point is Option C captures the AND relationship correctly.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company needs to collect evidence automatically for an upcoming PCI DSS audit, mapping AWS resource configurations and API activities to specific PCI requirements. Which AWS service is designed to automate this evidence collection?",
    difficulty: "Hard",
    topic: "AWS Compliance Programs",
    objective: "2.2",
    options: { A: "AWS Artifact", B: "AWS Audit Manager", C: "AWS Config", D: "AWS Security Hub" },
    answer: "B",
    explanation: "AWS Audit Manager continuously collects evidence from AWS services and maps it to compliance frameworks like PCI DSS, HIPAA, and SOC 2. Artifact provides downloadable AWS compliance reports but does not collect evidence about the customer's own environment. Config evaluates resource configuration compliance but does not map to audit frameworks. Security Hub aggregates security findings across accounts but is not an audit evidence collector.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company's IAM administrator needs to create a temporary privileged access mechanism so that an EC2 instance can write objects to an S3 bucket without embedding long-term credentials in the instance. What is the recommended approach?",
    difficulty: "Exam Level",
    topic: "IAM Users, Groups & Roles",
    objective: "2.3",
    options: { A: "Create an IAM user with programmatic access and store the access key on the instance.", B: "Attach an IAM role to the EC2 instance with the necessary S3 permissions.", C: "Hardcode the root account credentials in the application configuration file.", D: "Create an IAM group for EC2 instances and add the instance to it." },
    answer: "B",
    explanation: "IAM roles are the correct mechanism for granting AWS services (like EC2) temporary credentials to interact with other services. The role's temporary credentials are automatically rotated by the AWS Security Token Service and are accessible via the EC2 instance metadata. Long-term access keys (A) should never be embedded in instances — they are hard to rotate and create security risks. Root credentials (C) should never be used programmatically. IAM groups (D) only apply to IAM users, not AWS services.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An IAM administrator wants to grant a development team access to Amazon EC2 but ensure they cannot provision instances larger than t3.medium to control costs. They also want to ensure that permissions are as narrow as possible. Which IAM concept best describes configuring only the minimum permissions required?",
    difficulty: "Foundational",
    topic: "IAM Policies & Least Privilege",
    objective: "2.3",
    options: { A: "Separation of duties.", B: "Least privilege.", C: "Defense in depth.", D: "Zero trust." },
    answer: "B",
    explanation: "Least privilege means granting only the minimum permissions required for a user or system to perform their job. In IAM, this means writing policies that allow only the specific actions on specific resources needed. Separation of duties (A) is about distributing tasks to prevent fraud. Defense in depth (C) is a multi-layered security strategy. Zero trust (D) is a network architecture principle — while related, it is not the IAM policy concept described.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company has 200 developers who all need identical read-only access to Amazon S3. What is the most efficient and maintainable IAM approach to grant this access?",
    difficulty: "Foundational",
    topic: "IAM Users, Groups & Roles",
    objective: "2.3",
    options: { A: "Create 200 individual IAM policies, one per developer, each granting S3 read access.", B: "Attach an S3 read policy to an IAM group and add all 200 developers to the group.", C: "Share a single IAM user account with S3 read access among all 200 developers.", D: "Grant each developer root account access restricted to S3 read operations." },
    answer: "B",
    explanation: "IAM groups are designed for this pattern: attach a policy to the group once and all members inherit those permissions. Adding or removing access is done by group membership. Option A is inefficient and unmanageable at scale. Option C violates the principle of individual accountability (no audit trail per person). Option D misuses the root account and is a security anti-pattern.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company uses a third-party application that needs to access objects in their S3 bucket for a limited time. The security team wants to avoid creating long-term credentials for this third party. Which IAM feature provides temporary, time-limited access?",
    difficulty: "Exam Level",
    topic: "IAM Users, Groups & Roles",
    objective: "2.3",
    options: { A: "IAM user access keys with a 90-day rotation policy.", B: "An IAM role with a trust policy allowing the third party to assume it via AWS STS.", C: "An S3 bucket policy that permanently allows the third-party's AWS account.", D: "An IAM group that the third party's IAM user is added to temporarily." },
    answer: "B",
    explanation: "IAM roles with cross-account trust policies and AWS Security Token Service (STS) AssumeRole provide temporary credentials with a configurable expiration (minutes to hours). This is the recommended pattern for third-party and cross-account access. Long-term access keys (A) are permanent until manually rotated. A permanent bucket policy (C) is not time-limited. Adding a third party's user to a group (D) is for users within the same account, and requires remembering to remove them.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An IAM policy is attached to an IAM user. The policy grants s3:PutObject on a specific bucket. However, the user reports they cannot upload objects to that bucket. An administrator finds a resource-based policy on the bucket that has an explicit Deny for the user. What is the result of this configuration?",
    difficulty: "Hard",
    topic: "IAM Policies & Least Privilege",
    objective: "2.3",
    options: { A: "The IAM policy Allow overrides the bucket Deny because identity-based policies take precedence.", B: "The explicit Deny on the bucket policy overrides the Allow in the IAM policy.", C: "The user can still upload because both policies must agree to deny access.", D: "The conflict causes an error, and AWS defaults to allowing access." },
    answer: "B",
    explanation: "In AWS, an explicit Deny always overrides any Allow, regardless of which policy type contains it. The IAM policy evaluation logic is: if there is an explicit Deny anywhere in the evaluated policies, the action is denied. Options A and C are wrong because explicit Denies win over Allows. Option D is wrong because the AWS default is to deny (implicit deny), and explicit denies compound that restriction.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company with 500 employees uses Microsoft Active Directory on-premises. They want to enable employees to sign into the AWS Management Console using their existing Active Directory credentials without creating individual IAM users. Which AWS service enables this federation?",
    difficulty: "Exam Level",
    topic: "IAM Identity Center",
    objective: "2.3",
    options: { A: "AWS Organizations with consolidated billing.", B: "AWS IAM Identity Center (formerly AWS Single Sign-On).", C: "Amazon Cognito user pools.", D: "AWS Directory Service with IAM users mirrored for each employee." },
    answer: "B",
    explanation: "AWS IAM Identity Center (formerly AWS SSO) enables centralized, federated access to AWS accounts and applications using existing identity providers like Microsoft Active Directory. Users sign in once and get access to their permitted AWS accounts. Organizations provides multi-account management but not SSO federation. Cognito is for customer-facing applications (app users), not employee SSO. Mirroring Active Directory users as IAM users (D) defeats the purpose of federation and creates a management burden.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A security audit finds that the AWS root account for a production environment has been used to perform routine administrative tasks. The auditor flags this as a critical finding. What TWO actions should the company take FIRST to remediate this issue?",
    difficulty: "Hard",
    topic: "Root User Protection & MFA",
    objective: "2.3",
    options: { A: "Enable multi-factor authentication (MFA) on the root account and stop using it for daily tasks.", B: "Delete the root account and create a new master IAM user.", C: "Rotate the root account password and create IAM users with administrative permissions for daily tasks.", D: "Share root credentials with the security team for oversight." },
    answer: "A",
    explanation: "AWS best practices require enabling MFA on the root account and reserving root access for tasks that only the root can perform (such as changing the account email address or closing the account). Daily administrative tasks should use IAM users or roles with least-privilege permissions. Option B is wrong because the root account cannot be deleted. Option C correctly rotates the password but the question asks for the FIRST remediation priorities — MFA on root is more critical than just rotation alone. Option D sharing root credentials is a major security violation.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A cloud engineer wants to enforce that all new IAM users in an account must create passwords of at least 14 characters and change their passwords every 90 days. Which IAM feature enforces these requirements?",
    difficulty: "Foundational",
    topic: "IAM Users, Groups & Roles",
    objective: "2.3",
    options: { A: "IAM permission boundaries.", B: "AWS Config rule for password complexity.", C: "IAM account password policy.", D: "AWS Secrets Manager rotation." },
    answer: "C",
    explanation: "The IAM account password policy lets administrators configure minimum password length, complexity requirements (numbers, symbols, uppercase), and maximum password age (expiration) for all IAM users in an account. Permission boundaries control the maximum permissions a role can have, not password rules. Config rules can detect non-compliance but cannot enforce the policy at creation time. Secrets Manager handles application secrets rotation, not IAM user passwords.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A security consultant is reviewing an AWS account. Which TWO actions are tasks that should ONLY be performed using the AWS root account user? (Select TWO.)",
    difficulty: "Hard",
    topic: "Root User Protection & MFA",
    objective: "2.3",
    options: { A: "Creating IAM users for the development team.", B: "Changing the AWS account email address or account name.", C: "Activating IAM access to the Billing and Cost Management console.", D: "Deploying an EC2 instance in a production VPC.", E: "Configuring an S3 bucket policy." },
    answer: ["B", "C"],
    explanation: "Tasks that only root can perform include: changing the account email address or account name (B), activating IAM access to billing (C), closing the account, restoring IAM user permissions to billing, and subscribing/unsubscribing from certain AWS services. Creating IAM users (A), deploying EC2 (D), and configuring S3 bucket policies (E) are all tasks that should be done with appropriately privileged IAM users or roles — not root.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An organization is concerned about unauthorized API calls being made in their AWS environment. They want a service that automatically analyzes CloudTrail logs, VPC Flow Logs, and DNS logs to detect threats like cryptocurrency mining, credential compromise, and communication with known malicious IP addresses. Which service provides this capability?",
    difficulty: "Exam Level",
    topic: "Amazon GuardDuty",
    objective: "2.4",
    options: { A: "AWS Config", B: "Amazon Inspector", C: "Amazon GuardDuty", D: "Amazon Macie" },
    answer: "C",
    explanation: "Amazon GuardDuty is a threat detection service that continuously analyzes CloudTrail management events, CloudTrail S3 data events, VPC Flow Logs, and DNS logs using machine learning and threat intelligence to identify malicious activity. Config evaluates resource configuration compliance. Inspector scans EC2 instances and container images for software vulnerabilities. Macie identifies sensitive data (PII) in S3 buckets.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A security team needs to identify whether EC2 instances in their environment have unpatched CVEs (Common Vulnerabilities and Exposures) or software packages with known security issues. Which AWS service performs this vulnerability assessment?",
    difficulty: "Exam Level",
    topic: "Amazon Inspector",
    objective: "2.4",
    options: { A: "Amazon GuardDuty", B: "Amazon Inspector", C: "AWS Shield Advanced", D: "Amazon Detective" },
    answer: "B",
    explanation: "Amazon Inspector automatically scans EC2 instances and Amazon ECR container images for software vulnerabilities (CVEs) and unintended network exposure. GuardDuty detects active threats and anomalous behavior from log analysis — it does not scan for software vulnerabilities. Shield Advanced protects against DDoS attacks. Detective investigates and analyzes security findings but does not perform vulnerability scanning.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A compliance officer needs to determine if any S3 buckets in the company's AWS account contain personally identifiable information (PII) such as Social Security numbers or credit card numbers. Which AWS service is specifically designed to discover and report on sensitive data in S3?",
    difficulty: "Exam Level",
    topic: "Amazon Macie",
    objective: "2.4",
    options: { A: "Amazon GuardDuty", B: "AWS Config", C: "Amazon Macie", D: "Amazon Inspector" },
    answer: "C",
    explanation: "Amazon Macie uses machine learning to automatically discover, classify, and protect sensitive data stored in S3. It identifies PII, financial data, and credentials and generates findings for buckets with excessive permissions or unencrypted sensitive data. GuardDuty detects threats from log analysis, not PII in stored data. Config evaluates resource configuration. Inspector scans for software vulnerabilities, not data classification.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A security architect is selecting services for a new AWS environment. Which TWO services work together to first DETECT active threats and then INVESTIGATE the root cause of those findings? (Select TWO.)",
    difficulty: "Hard",
    topic: "Amazon GuardDuty",
    objective: "2.4",
    options: { A: "Amazon GuardDuty", B: "Amazon Inspector", C: "Amazon Macie", D: "Amazon Detective", E: "AWS Security Hub" },
    answer: ["A", "D"],
    explanation: "GuardDuty (A) continuously monitors CloudTrail, VPC Flow Logs, and DNS logs to detect active threats and malicious behavior. Amazon Detective (D) ingests those GuardDuty findings and builds interactive visualizations to investigate root causes — who was involved, what resources were accessed, and over what time window. Together they form a detect-then-investigate pairing. Inspector (B) scans for software vulnerabilities, not active threats. Macie (C) discovers sensitive data in S3. Security Hub (E) aggregates findings across services but does not perform detection or investigation itself.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company's web application experiences a sudden spike of malicious traffic attempting to overwhelm the infrastructure with millions of requests per second. This is a classic volumetric DDoS attack. Which AWS service provides AUTOMATIC protection against this type of attack at no additional charge for all AWS customers?",
    difficulty: "Foundational",
    topic: "AWS Shield & WAF",
    objective: "2.4",
    options: { A: "AWS Shield Advanced", B: "AWS WAF", C: "AWS Shield Standard", D: "Amazon GuardDuty" },
    answer: "C",
    explanation: "AWS Shield Standard is automatically enabled for all AWS customers at no extra charge and protects against the most common Layer 3 and Layer 4 DDoS attacks (volumetric and protocol attacks). Shield Advanced is a paid service providing enhanced DDoS protection, cost protection, and access to the AWS DDoS Response Team. WAF protects against Layer 7 (application layer) web attacks like SQL injection. GuardDuty provides threat intelligence from logs but does not mitigate DDoS traffic.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A retail company's web application is being targeted by automated bots that are attempting SQL injection attacks through the login form. The security team wants to create custom rules to block these requests before they reach the application. Which AWS service should they use?",
    difficulty: "Exam Level",
    topic: "AWS Shield & WAF",
    objective: "2.4",
    options: { A: "AWS Shield Standard", B: "Amazon GuardDuty", C: "AWS WAF", D: "AWS Shield Advanced" },
    answer: "C",
    explanation: "AWS WAF (Web Application Firewall) operates at Layer 7 (the application layer) and allows creation of custom rules and managed rule groups to block common web exploits such as SQL injection, cross-site scripting, and bot traffic. Shield Standard protects against Layer 3/4 DDoS attacks, not application-layer exploits. GuardDuty is a threat detection service that analyzes logs — it does not block traffic. Shield Advanced offers enhanced DDoS protection but not application-layer filtering rules.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company stores sensitive database credentials and API keys used by its applications running on EC2. The security team wants these secrets to be automatically rotated on a schedule and accessed programmatically without hardcoding them in application code. Which AWS service is best suited for this purpose?",
    difficulty: "Exam Level",
    topic: "AWS KMS & Encryption",
    objective: "2.4",
    options: { A: "AWS Key Management Service (KMS).", B: "AWS Secrets Manager.", C: "AWS Systems Manager Parameter Store.", D: "AWS Certificate Manager." },
    answer: "B",
    explanation: "AWS Secrets Manager is specifically designed to store, manage, and automatically rotate secrets like database credentials, API keys, and OAuth tokens. It integrates with RDS to automatically rotate database passwords. KMS manages cryptographic keys for encryption operations — it is not a secret storage service. Systems Manager Parameter Store can store secrets but does not natively provide automatic rotation. Certificate Manager manages SSL/TLS certificates, not application secrets.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to encrypt data stored in Amazon S3 using a customer-managed key (CMK) so they retain control over the key policy and can audit key usage. Which AWS service manages the creation and control of these cryptographic keys?",
    difficulty: "Foundational",
    topic: "AWS KMS & Encryption",
    objective: "2.4",
    options: { A: "AWS Secrets Manager", B: "AWS Certificate Manager", C: "AWS CloudHSM", D: "AWS Key Management Service (KMS)" },
    answer: "D",
    explanation: "AWS KMS is the service for creating and managing customer master keys (CMKs) used to encrypt data across AWS services like S3, EBS, RDS, and Lambda. KMS integrates natively with these services. Secrets Manager stores secrets, not cryptographic keys for encryption. Certificate Manager manages SSL/TLS certificates (public key infrastructure for TLS, not data encryption keys). CloudHSM is a dedicated Hardware Security Module for high-compliance environments requiring single-tenant HSMs — it is a specialized, more expensive option compared to KMS for most workloads.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company needs to encrypt data 'at rest' in an Amazon EBS volume attached to an EC2 instance and also protect data 'in transit' between the EC2 instance and an Amazon RDS database. Which combination correctly addresses both requirements?",
    difficulty: "Hard",
    topic: "AWS KMS & Encryption",
    objective: "2.4",
    options: { A: "Enable EBS volume encryption using KMS for at-rest data; use SSL/TLS connections for the RDS communication.", B: "Use AWS Shield to encrypt EBS volumes; use WAF to encrypt RDS traffic.", C: "Store the encryption key in Secrets Manager for both use cases.", D: "Enable encryption only on the RDS instance; EBS volumes are always encrypted by default." },
    answer: "A",
    explanation: "Encryption at rest for EBS uses KMS-managed keys, enabled at volume creation (or subsequently). Encryption in transit requires SSL/TLS connections — RDS supports SSL/TLS connections that the application must use. Shield and WAF are security services, not encryption services (B is wrong). Secrets Manager stores credentials — it does not encrypt storage volumes or network traffic (C is wrong). EBS volumes are NOT encrypted by default (D is wrong); encryption must be explicitly enabled.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A startup wants to quickly check if their AWS account follows basic security best practices such as enabling MFA on the root account, ensuring S3 buckets are not publicly accessible, and verifying that IAM policies do not allow full administrative access. Which AWS service provides these automated security checks for free?",
    difficulty: "Foundational",
    topic: "Security Support Resources",
    objective: "2.4",
    options: { A: "Amazon GuardDuty", B: "AWS Trusted Advisor", C: "Amazon Inspector", D: "AWS Security Hub" },
    answer: "B",
    explanation: "AWS Trusted Advisor includes free security checks covering root MFA, S3 bucket permissions, security groups with unrestricted access, and IAM use. Some checks require a Business or Enterprise support plan. GuardDuty is a continuous threat detection service. Inspector scans for software vulnerabilities. Security Hub requires configuration and incurs costs based on checks and findings evaluated.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A developer encounters an unexpected behavior when using an AWS service and wants to find official community answers, troubleshooting steps, and technical explanations written by AWS engineers and experienced users. Which resource should they consult first?",
    difficulty: "Foundational",
    topic: "Security Support Resources",
    objective: "2.4",
    options: { A: "AWS Artifact", B: "AWS Personal Health Dashboard", C: "AWS Knowledge Center", D: "AWS Config" },
    answer: "C",
    explanation: "The AWS Knowledge Center contains frequently asked questions and answers written by AWS support engineers and technical staff covering common issues and best practices. Artifact provides compliance reports. The Personal Health Dashboard shows service events affecting the customer's account. Config tracks resource configuration history.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An AWS customer needs to sign a Business Associate Agreement (BAA) with AWS to process protected health information (PHI) under HIPAA compliance requirements. Where in AWS can a customer access and sign this agreement?",
    difficulty: "Exam Level",
    topic: "AWS Artifact",
    objective: "2.2",
    options: { A: "AWS Compliance Programs website external documentation.", B: "AWS Artifact Agreements section.", C: "AWS Config compliance dashboard.", D: "AWS Security Hub compliance standards section." },
    answer: "B",
    explanation: "AWS Artifact has two sections: Reports (downloadable compliance documents) and Agreements (where customers can review and accept agreements such as the HIPAA BAA and GDPR DPA). The external Compliance Programs documentation describes which services are in scope but does not allow signing agreements. Config and Security Hub are operational compliance services, not agreement portals.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A security engineer reviews IAM policies and discovers that a developer role has the policy action 's3:*' on resource '*', which grants full S3 access across all buckets. The engineer wants to restrict this role to only list and get objects from a single specific bucket. Which IAM principle is being applied by making this change?",
    difficulty: "Exam Level",
    topic: "IAM Policies & Least Privilege",
    objective: "2.3",
    options: { A: "Defense in depth.", B: "Separation of duties.", C: "Least privilege.", D: "Rotation of credentials." },
    answer: "C",
    explanation: "Restricting a broad wildcard permission (s3:* on *) to only the specific actions (s3:ListBucket, s3:GetObject) on only the necessary resource (a single bucket ARN) exemplifies the principle of least privilege. The developer should have only what they need, nothing more. Defense in depth is a multi-layer security strategy. Separation of duties divides tasks to prevent fraud. Credential rotation is about periodically changing credentials.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A new team member asks what differentiates AWS Organizations from AWS Control Tower. Which TWO statements correctly distinguish these two services? (Select TWO.)",
    difficulty: "Hard",
    topic: "AWS Control Tower",
    objective: "2.2",
    options: { A: "AWS Organizations is the foundational account management service; Control Tower builds a guided landing zone on top of Organizations.", B: "AWS Control Tower can be used independently without AWS Organizations.", C: "Control Tower provides a pre-configured landing zone with mandatory guardrails and automated account provisioning.", D: "AWS Organizations provides all the same landing zone automation as Control Tower.", E: "SCPs in AWS Organizations can be managed directly or through Control Tower guardrails." },
    answer: ["A", "C"],
    explanation: "Organizations is the foundational service providing account management, OUs, and SCPs (A). Control Tower orchestrates a best-practice landing zone on top of Organizations, with automated account provisioning, guardrails, and centralized logging (C). Control Tower requires Organizations — it cannot operate independently (B is wrong). Organizations alone does not provide the automated landing zone setup (D is wrong). Option E is true as a statement but is not a distinguishing factor between the two services.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company processes payment card transactions and must comply with PCI DSS. Their compliance officer wants documentation proving AWS's infrastructure meets PCI DSS requirements. Which AWS service provides this documentation?",
    difficulty: "Exam Level",
    topic: "AWS Artifact",
    objective: "2.2",
    options: { A: "Amazon GuardDuty threat reports.", B: "AWS Trusted Advisor PCI check results.", C: "AWS Artifact Reports section containing the AWS PCI DSS Attestation of Compliance.", D: "AWS Config PCI DSS conformance pack evaluation results." },
    answer: "C",
    explanation: "AWS Artifact provides downloadable compliance documents including the AWS PCI DSS Attestation of Compliance (AOC) and Responsibility Summary. These are official documents proving AWS's PCI DSS compliance posture. GuardDuty provides threat intelligence. Trusted Advisor PCI checks evaluate the customer's resource configuration, not AWS's own compliance. Config conformance packs evaluate the customer's configuration against PCI rules — not AWS's infrastructure compliance.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A solutions architect is explaining IAM to a junior engineer. The junior engineer asks: 'Can I add an EC2 instance directly to an IAM group to give it permissions?' What is the correct answer?",
    difficulty: "Foundational",
    topic: "IAM Users, Groups & Roles",
    objective: "2.3",
    options: { A: "Yes, IAM groups accept EC2 instances as members.", B: "No, IAM groups only contain IAM users. EC2 instances use IAM roles for permissions.", C: "Yes, but only if the EC2 instance has an IAM user attached.", D: "No, EC2 instances cannot use IAM at all." },
    answer: "B",
    explanation: "IAM groups are collections of IAM users only. AWS services like EC2 instances use IAM roles to obtain temporary credentials via the instance profile mechanism. There is no concept of adding an EC2 instance to an IAM group. Option A is incorrect by definition. Option C is wrong because EC2 instances do not have IAM users attached. Option D is wrong because EC2 can absolutely use IAM — via roles, not groups.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company's security team discovers unusual API calls from an IAM user that suggest the user's access keys may have been compromised. As an immediate first step, which action best limits damage while the investigation continues?",
    difficulty: "Exam Level",
    topic: "IAM Policies & Least Privilege",
    objective: "2.3",
    options: { A: "Delete the IAM user account immediately.", B: "Disable or delete the compromised access keys and add an explicit Deny policy to the IAM user.", C: "Rotate the IAM user's password.", D: "Enable MFA on the IAM user going forward." },
    answer: "B",
    explanation: "Disabling or deleting the compromised access keys immediately stops any ongoing unauthorized activity. Attaching an explicit Deny policy to the user as a belt-and-suspenders measure ensures even if new keys were issued, they cannot be used. Deleting the user (A) should be investigated first before destructive actions. Rotating the password (C) does not affect access keys (they are separate credentials). Enabling MFA going forward (D) does not stop the current compromise.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An organization wants to provide its employees single-sign-on access to multiple AWS accounts and business applications such as Salesforce and Microsoft 365 using their corporate identity. Which AWS service provides this centralized access management capability?",
    difficulty: "Exam Level",
    topic: "IAM Identity Center",
    objective: "2.3",
    options: { A: "IAM roles with cross-account trust policies for each application.", B: "AWS IAM Identity Center.", C: "Amazon Cognito identity pools.", D: "AWS Organizations with consolidated billing." },
    answer: "B",
    explanation: "AWS IAM Identity Center provides a centralized SSO portal where employees authenticate once and gain access to all their assigned AWS accounts and cloud applications (SAML 2.0 compatible apps like Salesforce, Microsoft 365, etc.). Cross-account IAM roles (A) are for programmatic access, not human SSO. Cognito identity pools are for mobile/web application end-users (customers), not employees. Organizations with consolidated billing provides account management, not SSO.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A cloud security team is performing an IAM best-practices review. Which THREE actions should they recommend to reduce risk associated with the AWS root account? (Select THREE.)",
    difficulty: "Hard",
    topic: "Root User Protection & MFA",
    objective: "2.3",
    options: { A: "Enable multi-factor authentication (MFA) on the root account.", B: "Delete all root account access keys if they exist.", C: "Use the root account for all administrative tasks to maintain a single audit trail.", D: "Store root account credentials securely and avoid day-to-day use.", E: "Create IAM users or roles with appropriate permissions for all regular tasks." },
    answer: ["A", "B", "D"],
    explanation: "AWS best practices specifically for the root account are: enable MFA (A), delete root access keys if they exist since the root should never be accessed programmatically (B), and store credentials securely while reserving root only for the small set of tasks only root can perform (D). Option C is the anti-pattern — root should NOT be used for regular tasks. Option E (create IAM users/roles for regular tasks) is a general IAM best practice, not a root-account-specific protection action — it describes what to do instead of using root, which is implied by D. The three most direct root-account protection measures are A, B, and D.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A GuardDuty finding reports 'UnauthorizedAccess:EC2/SSHBruteForce' — indicating an EC2 instance is being targeted by repeated SSH login attempts from an external IP address. Which GuardDuty data source detected this activity?",
    difficulty: "Hard",
    topic: "Amazon GuardDuty",
    objective: "2.4",
    options: { A: "AWS CloudTrail management events.", B: "Amazon S3 data events.", C: "VPC Flow Logs.", D: "AWS Config configuration history." },
    answer: "C",
    explanation: "VPC Flow Logs capture information about IP traffic flowing to and from network interfaces in a VPC, including source/destination IPs and ports. Brute-force SSH attempts are detected by analyzing patterns in VPC Flow Logs (many connection attempts to port 22 from a single IP). CloudTrail captures AWS API calls, not EC2 network traffic. S3 data events capture S3 object-level operations. Config tracks resource configuration changes.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company's security team receives an Amazon Inspector finding that identifies a critical CVE in a specific package on an EC2 instance. The instance runs Amazon Linux 2 and the package can be updated via the OS package manager. Who is responsible for remediating this vulnerability?",
    difficulty: "Exam Level",
    topic: "Amazon Inspector",
    objective: "2.4",
    options: { A: "AWS, because Inspector is an AWS service and found the vulnerability.", B: "The customer, because patching the OS and software on EC2 is the customer's responsibility.", C: "AWS, because the package is from the Amazon Linux 2 repository.", D: "The EC2 instance's AMI vendor, regardless of who manages the instance." },
    answer: "B",
    explanation: "EC2 is an IaaS service. Under the Shared Responsibility Model, the customer owns the OS and all software running on EC2 instances — including applying patches for identified vulnerabilities. Inspector finds the vulnerabilities; the customer must remediate them. AWS provides Inspector as a tool to help but does not patch customer EC2 instances. The AMI vendor provides the base image; post-launch patching is the customer's responsibility.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company's data governance team wants to identify all S3 buckets that store customer email addresses and social security numbers across a 20-account AWS Organization. Which AWS service automates the discovery and classification of this sensitive data?",
    difficulty: "Exam Level",
    topic: "Amazon Macie",
    objective: "2.4",
    options: { A: "Amazon GuardDuty", B: "AWS Config with S3 conformance packs.", C: "Amazon Macie", D: "Amazon Inspector" },
    answer: "C",
    explanation: "Amazon Macie uses machine learning to automatically discover, classify, and protect sensitive data in S3. It identifies PII (email addresses, Social Security numbers, credit card numbers), generates findings, and integrates with AWS Organizations for multi-account coverage. GuardDuty detects security threats from log analysis — not data classification. Config evaluates resource configuration compliance. Inspector scans for software vulnerabilities, not data content.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An e-commerce company's website is being targeted by a sophisticated Layer 7 DDoS attack that sends HTTP flood requests mimicking legitimate browser behavior. The company needs application-layer protection beyond what Shield Standard offers. Which service combination is most appropriate?",
    difficulty: "Hard",
    topic: "AWS Shield & WAF",
    objective: "2.4",
    options: { A: "AWS Config and Amazon Inspector.", B: "AWS Shield Advanced and AWS WAF.", C: "AWS Shield Standard and Amazon GuardDuty.", D: "Amazon Macie and AWS Trusted Advisor." },
    answer: "B",
    explanation: "AWS Shield Advanced provides enhanced DDoS protection at Layers 3, 4, and 7, and includes access to the AWS DDoS Response Team (DRT) who can help write WAF rules during active attacks. AWS WAF provides Layer 7 filtering capabilities to block HTTP flood attacks and suspicious patterns. Shield Standard (C) covers only Layers 3/4. Config and Inspector (A) are compliance/vulnerability services. Macie and Trusted Advisor (D) are unrelated to DDoS protection.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company is building an application that encrypts sensitive database passwords using a customer-managed KMS key. The security policy requires that the company can prove no one — including AWS — can access the plaintext key material. Which key management option meets this requirement?",
    difficulty: "Hard",
    topic: "AWS KMS & Encryption",
    objective: "2.4",
    options: { A: "AWS managed keys (aws/service keys) in KMS.", B: "Customer managed keys (CMKs) in AWS KMS with default key policy.", C: "AWS CloudHSM with customer-provided key material on a single-tenant HSM.", D: "Storing the encryption key in AWS Secrets Manager." },
    answer: "C",
    explanation: "AWS CloudHSM provides a single-tenant, dedicated Hardware Security Module where the customer retains exclusive control of the key material. AWS does not have access to the HSM or the keys. Standard KMS (even customer-managed keys) involves AWS managing the hardware and software — while they cannot easily access key material, some trust in AWS is required. AWS managed keys offer even less customer control. Secrets Manager stores secrets, not cryptographic key material for HSM-level isolation.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A security engineer needs to choose between AWS KMS and AWS CloudHSM. Which TWO statements correctly distinguish these two services? (Select TWO.)",
    difficulty: "Hard",
    topic: "AWS KMS & Encryption",
    objective: "2.4",
    options: { A: "KMS is a shared, managed service; CloudHSM uses dedicated single-tenant hardware.", B: "CloudHSM integrates natively with S3, EBS, and RDS in the same way KMS does.", C: "With CloudHSM, the customer manages the HSM and retains exclusive control of key material.", D: "KMS does not support customer-managed keys and always uses AWS-managed keys.", E: "Both KMS and CloudHSM support automatic key rotation with identical configuration." },
    answer: ["A", "C"],
    explanation: "KMS is a shared multi-tenant managed service where AWS manages the underlying hardware (A). CloudHSM provides dedicated single-tenant HSMs where the customer manages the appliance and retains sole control of key material (C). CloudHSM does not have the same native AWS service integrations as KMS (B is wrong — fewer services integrate natively). KMS fully supports customer-managed keys (D is wrong). Automatic key rotation is a KMS feature; CloudHSM does not offer automatic rotation (E is wrong).",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An AWS customer notices that their application is running slowly and suspects an AWS infrastructure issue. They want to check if AWS has reported any service events or disruptions that are specifically affecting their account and resources. Which AWS service provides a personalized view of AWS service health events relevant to their account?",
    difficulty: "Foundational",
    topic: "Security Support Resources",
    objective: "2.4",
    options: { A: "AWS Service Health Dashboard (status.aws.amazon.com).", B: "Amazon CloudWatch metrics.", C: "AWS Personal Health Dashboard.", D: "AWS Trusted Advisor." },
    answer: "C",
    explanation: "The AWS Personal Health Dashboard (now part of AWS Health) provides a personalized view of health events and scheduled maintenance that affect the customer's specific resources and account. The public Service Health Dashboard (A) shows general AWS service status globally but is not account-specific. CloudWatch shows application metrics. Trusted Advisor provides best-practice checks, not service health events.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A startup running a production workload on AWS encounters a critical bug that is causing widespread outages. The team needs to reach an AWS Cloud Support Engineer within one hour and receive guidance on architectural decisions at any time. Which AWS Support plan provides 24/7 access to Cloud Support Engineers with a one-hour response time for production system-down cases?",
    difficulty: "Foundational",
    topic: "Security Support Resources",
    objective: "2.4",
    options: { A: "AWS Basic Support", B: "AWS Developer Support", C: "AWS Business Support", D: "AWS Enterprise Support" },
    answer: "C",
    explanation: "AWS Business Support provides 24/7 access to Cloud Support Engineers via phone, email, and chat, with a one-hour response time for production system-down cases and access to all Trusted Advisor checks. Basic Support (A) includes only service health checks and documentation access — no technical support cases. Developer Support (B) provides business-hours access to Cloud Support Associates with a 12-hour response time — no phone support and no one-hour SLA. Enterprise Support (D) offers even faster response times (15 minutes for business-critical systems) and a dedicated Technical Account Manager, but the one-hour production SLA is the Business plan minimum.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An organization wants to aggregate security findings from Amazon GuardDuty, Amazon Inspector, Amazon Macie, and AWS Firewall Manager into a single, centralized dashboard across multiple AWS accounts. Which AWS service is designed for this purpose?",
    difficulty: "Exam Level",
    topic: "Security Support Resources",
    objective: "2.4",
    options: { A: "Amazon Detective", B: "AWS Security Hub", C: "AWS Config", D: "AWS CloudTrail" },
    answer: "B",
    explanation: "AWS Security Hub aggregates security findings from multiple AWS security services (GuardDuty, Inspector, Macie, Firewall Manager, and others) and third-party tools into a centralized dashboard. It also runs automated security checks against CIS Benchmarks and AWS Foundational Security Best Practices. Detective investigates the root cause of findings — it is a forensic analysis tool, not an aggregation hub. Config evaluates resource compliance. CloudTrail logs API activity.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company's security team needs to investigate how a compromised IAM credential was used over the past two weeks, mapping the relationships between the credential, the resources accessed, and the IP addresses involved. Which AWS service is specifically designed for this security investigation and visualization?",
    difficulty: "Hard",
    topic: "Security Support Resources",
    objective: "2.4",
    options: { A: "Amazon GuardDuty", B: "AWS CloudTrail", C: "Amazon Detective", D: "AWS Security Hub" },
    answer: "C",
    explanation: "Amazon Detective is designed for security investigation. It automatically collects and analyzes log data from CloudTrail, VPC Flow Logs, and GuardDuty to build interactive visualizations showing relationships between entities (IAM principals, IP addresses, resources) over time. GuardDuty detects the initial finding. CloudTrail stores the raw API logs but does not provide relationship visualization. Security Hub aggregates findings but is not an investigation tool.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A cloud security architect needs to select the right services for a defense-in-depth strategy. Which TWO services would be most appropriate for protecting a public-facing web application from both DDoS attacks and application-layer exploits? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "AWS Shield & WAF",
    objective: "2.4",
    options: { A: "AWS WAF to filter Layer 7 HTTP/HTTPS traffic with custom rules.", B: "Amazon Macie to detect sensitive data in web request payloads.", C: "AWS Shield Advanced for enhanced Layer 3, 4, and 7 DDoS protection.", D: "Amazon Inspector to scan the web server for CVEs.", E: "AWS Config to evaluate web application configuration compliance." },
    answer: ["A", "C"],
    explanation: "WAF (A) provides Layer 7 filtering — blocking SQL injection, XSS, and malicious bots. Shield Advanced (C) provides enhanced DDoS protection and 24/7 access to the DRT for active attack mitigation. Macie (B) discovers sensitive data in S3 storage — not web request payloads. Inspector (D) scans EC2 and container images for CVEs, which is important but not a direct protection mechanism. Config (E) evaluates configuration compliance, not active traffic filtering.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An AWS administrator needs to allow a Lambda function in Account A to read from a DynamoDB table in Account B. No long-term credentials should be used. What is the correct IAM approach?",
    difficulty: "Hard",
    topic: "IAM Users, Groups & Roles",
    objective: "2.3",
    options: { A: "Create an IAM user in Account B with DynamoDB access and pass its access keys to Account A's Lambda function.", B: "Create an IAM role in Account B with DynamoDB permissions and a trust policy allowing Account A's Lambda function to assume it.", C: "Create an IAM group in Account A that includes Account B's IAM users.", D: "Enable resource-based policies on DynamoDB so Account A can access it without any IAM role." },
    answer: "B",
    explanation: "Cross-account access uses IAM roles. An IAM role in Account B includes a trust policy that allows the Lambda execution role ARN in Account A to call sts:AssumeRole. The Lambda function assumes this role to get temporary credentials for DynamoDB. Using long-term access keys (A) is an anti-pattern and against least-privilege. IAM groups only contain IAM users within a single account (C). DynamoDB resource-based policies exist but the IAM role approach is the standard cross-account mechanism (D oversimplifies and is incomplete).",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Under the AWS Shared Responsibility Model, which statement best describes the customer's responsibility when using Amazon DynamoDB?",
    difficulty: "Exam Level",
    topic: "Shared Responsibility Model",
    objective: "2.1",
    options: { A: "The customer must manage the DynamoDB server operating system and apply patches.", B: "The customer is responsible for the data stored in DynamoDB, managing access through IAM, and enabling encryption options.", C: "AWS is responsible for data stored in DynamoDB because it is a fully managed service.", D: "The customer and AWS share equal responsibility for all DynamoDB data and access." },
    answer: "B",
    explanation: "With fully managed services like DynamoDB (PaaS), AWS manages the infrastructure, servers, OS patches, and the service software. However, the customer ALWAYS retains responsibility for: the data they put into the service, IAM policies controlling who can access the data, and enabling encryption options (at-rest and in-transit). Option A describes EC2 responsibilities, not DynamoDB. Option C is wrong because data ownership never transfers to AWS. Option D incorrectly suggests equal sharing of data responsibility.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company's CISO asks: 'What does AWS guarantee regarding physical security of data centers where our workloads run?' Which Shared Responsibility Model concept correctly addresses this?",
    difficulty: "Foundational",
    topic: "Shared Responsibility Model",
    objective: "2.1",
    options: { A: "AWS and the customer share physical security responsibilities 50/50.", B: "The customer is responsible for physical security of the servers their instances run on.", C: "AWS is responsible for physical security of all infrastructure as part of security OF the cloud.", D: "Physical security is the responsibility of the data center co-location provider, not AWS." },
    answer: "C",
    explanation: "Physical security of data centers — including perimeter security, access controls, environmental controls, and hardware destruction — is entirely AWS's responsibility as part of 'security OF the cloud.' Customers never have physical access to AWS infrastructure. Options A and B contradict this by suggesting customer involvement. Option D is wrong because AWS owns and operates its own data centers (not co-location facilities).",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A newly hired cloud architect is reviewing security services. Which TWO services specifically perform VULNERABILITY SCANNING to find software weaknesses in compute resources? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Amazon Inspector",
    objective: "2.4",
    options: { A: "Amazon Inspector scanning EC2 instances for known CVEs.", B: "Amazon GuardDuty analyzing VPC Flow Logs for threat patterns.", C: "Amazon Inspector scanning Amazon ECR container images for vulnerabilities.", D: "Amazon Macie scanning S3 for personally identifiable information.", E: "AWS Shield Advanced monitoring for DDoS traffic patterns." },
    answer: ["A", "C"],
    explanation: "Amazon Inspector performs vulnerability scanning on EC2 instances (A) and Amazon ECR (Elastic Container Registry) container images (C) for known CVEs and software vulnerabilities. GuardDuty (B) analyzes logs for active threat detection — it is not a vulnerability scanner. Macie (D) classifies sensitive data in S3. Shield Advanced (E) protects against DDoS attacks. Inspector is the AWS service specifically designed for CVE/vulnerability scanning.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company has a strict compliance requirement to ensure no S3 bucket in their AWS account ever has public access enabled. They want continuous compliance enforcement — automatically notified any time a bucket is modified to allow public access. Which AWS service provides this continuous compliance monitoring for resource configuration?",
    difficulty: "Exam Level",
    topic: "AWS Config",
    objective: "2.2",
    options: { A: "Amazon Macie", B: "Amazon GuardDuty", C: "AWS Config with a managed rule for S3 public access.", D: "AWS Trusted Advisor security checks." },
    answer: "C",
    explanation: "AWS Config provides continuous monitoring of resource configurations and evaluates them against Config Rules. The managed rule 's3-bucket-public-read-prohibited' (and write equivalent) detects when S3 buckets have public access enabled and marks the resource as non-compliant, triggering notifications. Macie discovers sensitive data in S3 content but does not enforce access configuration rules. GuardDuty detects threats from logs. Trusted Advisor provides periodic best-practice checks but does not offer continuous, automated rule-based compliance evaluation.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to ensure that IAM users in their account can only perform actions within the us-east-1 and us-west-2 regions and are blocked from taking any action in all other regions. Which AWS Organizations mechanism enforces this restriction across all users and roles in the account?",
    difficulty: "Hard",
    topic: "AWS Organizations",
    objective: "2.2",
    options: { A: "An IAM user permission boundary attached to each user individually.", B: "A Service Control Policy (SCP) applied at the AWS Organizations account level denying actions outside the allowed regions.", C: "An IAM password policy that includes a region restriction field.", D: "An Amazon GuardDuty rule that alerts when actions occur outside approved regions." },
    answer: "B",
    explanation: "Service Control Policies (SCPs) applied at the AWS Organizations account or OU level can include a condition using 'aws:RequestedRegion' to deny all actions outside specified regions. This enforces the restriction for every IAM principal in the account, regardless of their individual IAM policies. Permission boundaries (A) apply per-entity and must be set on each user/role individually — they do not apply organization-wide automatically. IAM password policies (C) govern password rules only; there is no region restriction field. GuardDuty (D) detects and alerts on suspicious activity but does not block IAM actions.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A developer needs to run a small script that processes uploaded images whenever a new object is placed in an S3 bucket. The script takes less than 30 seconds and runs infrequently. Which compute option is MOST cost-effective?",
    difficulty: "Exam Level",
    topic: "AWS Lambda",
    objective: "3.3",
    options: { A: "Launch a dedicated EC2 On-Demand instance that polls the bucket", B: "Deploy the script on AWS Fargate with a scheduled task", C: "Run the script on an EC2 Spot Instance with Auto Scaling", D: "Use AWS Lambda triggered by an S3 event notification" },
    answer: "D",
    explanation: "AWS Lambda is event-driven and serverless; you pay only for the milliseconds the function runs, making it ideal for infrequent, short-duration tasks triggered by S3 events. A — EC2 On-Demand runs 24/7 and incurs cost even when idle. B — Fargate requires a container definition and task scheduler, adding overhead for a simple script. D — Spot Instances can be interrupted and still require EC2 management overhead.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A startup wants to deploy a web application without managing servers, operating systems, or runtime patches. They need automatic scaling and built-in load balancing. Which AWS service handles this automatically?",
    difficulty: "Foundational",
    topic: "Elastic Beanstalk & Lightsail",
    objective: "3.3",
    options: { A: "AWS Elastic Beanstalk", B: "AWS CloudFormation", C: "Amazon EC2 with manual configuration", D: "AWS Step Functions" },
    answer: "A",
    explanation: "AWS Elastic Beanstalk is a PaaS that automatically handles capacity provisioning, load balancing, scaling, and application health monitoring. Developers upload code and Beanstalk manages the environment. A — CloudFormation is infrastructure-as-code, not a PaaS runtime. C — EC2 requires manual OS and runtime management. D — Step Functions orchestrates workflows, not web hosting.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company runs a containerized microservices application on AWS and wants Kubernetes-compatible orchestration managed by AWS, without administering the control plane. Which service should they use?",
    difficulty: "Exam Level",
    topic: "Containers (ECS/EKS/Fargate)",
    objective: "3.3",
    options: { A: "Amazon Elastic Kubernetes Service (EKS)", B: "AWS Fargate", C: "Amazon Elastic Container Service (ECS)", D: "AWS Lambda" },
    answer: "A",
    explanation: "Amazon EKS provides managed Kubernetes, eliminating the need to install, operate, or maintain the Kubernetes control plane. A — Fargate is a serverless compute engine for containers (used with ECS or EKS) but is not a Kubernetes orchestrator itself. C — ECS is AWS-native container orchestration, not Kubernetes-compatible. D — Lambda is serverless functions, not container orchestration.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An online retailer needs to run containers without managing EC2 instances or clusters. They want to pay only for the vCPU and memory consumed while the containers run. Which compute model meets this requirement?",
    difficulty: "Exam Level",
    topic: "Containers (ECS/EKS/Fargate)",
    objective: "3.3",
    options: { A: "AWS Fargate with Amazon ECS", B: "Amazon EC2 with a manually configured Docker host", C: "Amazon Lightsail containers", D: "AWS Elastic Beanstalk with a Docker platform" },
    answer: "A",
    explanation: "AWS Fargate is a serverless compute engine for containers. When used with ECS (or EKS), you do not provision or manage EC2 instances; you pay only for vCPU and memory resources consumed. A — EC2 with Docker requires cluster and OS management. C — Lightsail containers are simpler VPS-style deployments with less granular billing. D — Elastic Beanstalk with Docker manages EC2 instances underneath.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company has a batch processing job that can be interrupted and restarted without data loss. The job runs for 6 hours each night. Which EC2 purchasing option minimizes cost?",
    difficulty: "Exam Level",
    topic: "Amazon EC2 & Instance Types",
    objective: "3.3",
    options: { A: "On-Demand Instances", B: "Reserved Instances (1-year, no upfront)", C: "Dedicated Hosts", D: "Spot Instances" },
    answer: "D",
    explanation: "EC2 Spot Instances use spare AWS capacity and offer discounts of up to 90% compared to On-Demand pricing. They can be interrupted with a 2-minute warning, making them ideal for fault-tolerant batch jobs that can checkpoint and restart. A — On-Demand is more expensive and has no interruption risk but is unnecessary here. B — Reserved Instances are best for steady-state workloads with 24/7 usage. C — Dedicated Hosts are the most expensive option, used for licensing compliance.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company wants to automatically handle a sudden 10x spike in web traffic to their EC2-based application. Which TWO AWS features should they implement? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Auto Scaling & Elastic Load Balancing",
    objective: "3.3",
    options: { A: "AWS Auto Scaling to add or remove EC2 instances based on demand", B: "Amazon CloudFront to cache static content at edge locations", C: "An Application Load Balancer to distribute traffic across instances", D: "AWS CloudTrail to monitor API calls during the spike", E: "Amazon Route 53 with a latency routing policy" },
    answer: ["A", "C"],
    explanation: "Auto Scaling automatically adjusts the number of EC2 instances in response to load, ensuring capacity meets demand. An Application Load Balancer distributes incoming traffic evenly across the scaled instances. B — CloudFront helps with static content caching but does not scale compute. D — CloudTrail is an audit log service, not a scaling mechanism. E — Route 53 latency routing helps with geographic routing, not instance-level scaling.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A Lambda function needs to handle real-time financial transactions. Execution time is under 5 minutes but must never exceed 15 minutes. Which Lambda constraint is relevant here?",
    difficulty: "Hard",
    topic: "AWS Lambda",
    objective: "3.3",
    options: { A: "Lambda has a maximum execution timeout of 15 minutes per invocation", B: "Lambda functions time out after 5 minutes by default with no configurable limit", C: "Lambda imposes a 10-minute hard limit on all invocations", D: "Lambda can run indefinitely as long as memory is not exhausted" },
    answer: "A",
    explanation: "AWS Lambda has a configurable timeout with a maximum of 15 minutes (900 seconds) per invocation. This is a hard limit. A — The default is 3 seconds, but it can be increased; there is no 5-minute ceiling. C — There is no 10-minute limit; 15 minutes is the hard cap. D — Lambda invocations always terminate at the configured timeout regardless of memory.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A solutions architect needs to select compute services for two separate workloads: (1) a stateless REST API handling 1,000 requests per day, each completing in under 1 second; and (2) a containerized application requiring persistent state and custom networking. Which TWO services are correctly matched to these workloads? (Select TWO.)",
    difficulty: "Hard",
    topic: "AWS Lambda",
    objective: "3.3",
    options: { A: "AWS Lambda for the stateless REST API", B: "Amazon Lightsail for the stateless REST API", C: "AWS Fargate with Amazon ECS for the containerized application", D: "AWS Lambda for the containerized application requiring custom networking", E: "Amazon EC2 Auto Scaling groups for the stateless REST API" },
    answer: ["A", "C"],
    explanation: "A is correct: Lambda is ideal for stateless, event-driven functions with short execution times and low request volume; the serverless model is highly cost-effective at 1,000 requests/day. C is correct: Fargate with ECS manages containerized applications without provisioning EC2 instances while supporting persistent state and custom VPC networking. B — Lightsail is a simple VPS, not optimized for serverless APIs. D — Lambda cannot run containers with persistent state or full custom networking. E — EC2 Auto Scaling is viable but adds unnecessary operational overhead for a simple low-traffic API.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company is reviewing AWS compute services. Which TWO statements accurately describe differences between AWS Lambda and Amazon EC2? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Amazon EC2 & Instance Types",
    objective: "3.3",
    options: { A: "Lambda abstracts server management; EC2 requires you to manage the underlying virtual machine", B: "Lambda has a maximum execution duration of 15 minutes; EC2 instances can run indefinitely", C: "EC2 is billed per millisecond of execution; Lambda is billed per hour of instance run time", D: "Lambda functions can only be triggered manually; EC2 supports event-driven invocation", E: "Lambda supports all operating systems, while EC2 only supports Amazon Linux" },
    answer: ["A", "B"],
    explanation: "A is correct: Lambda is serverless — AWS manages all infrastructure; EC2 requires you to manage OS patches, networking, and capacity. B is correct: Lambda has a hard 15-minute maximum execution timeout; EC2 instances run continuously until stopped. C is incorrect: Lambda is billed per 1ms of execution time; EC2 is billed per second or per hour. D is incorrect: Lambda is event-driven and supports many triggers. E is incorrect: EC2 supports many OS options including Windows, Ubuntu, Red Hat, and Amazon Linux.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A load balancer must route traffic based on Layer 7 HTTP request content (paths, hostnames, headers) for a web application. A separate workload requires load balancing of raw TCP traffic with ultra-low latency. Which TWO Elastic Load Balancer types are correctly matched? (Select TWO.)",
    difficulty: "Hard",
    topic: "Auto Scaling & Elastic Load Balancing",
    objective: "3.3",
    options: { A: "Application Load Balancer (ALB) for HTTP/HTTPS routing based on request content", B: "Classic Load Balancer (CLB) for HTTP/HTTPS content-based routing", C: "Network Load Balancer (NLB) for ultra-low-latency TCP/UDP traffic", D: "Gateway Load Balancer (GWLB) for HTTP/HTTPS path-based routing", E: "Network Load Balancer (NLB) for HTTP cookie-based session affinity" },
    answer: ["A", "C"],
    explanation: "A is correct: ALBs operate at Layer 7, supporting content-based routing rules using paths, hostnames, and headers for HTTP/HTTPS traffic. C is correct: NLBs operate at Layer 4 (TCP/UDP/TLS) with extreme performance and ultra-low latency, suitable for non-HTTP protocols. B — CLB is a legacy load balancer with limited features; modern content-based routing uses ALB. D — GWLB is for deploying third-party virtual appliances like firewalls, not HTTP routing. E — NLBs do not support HTTP cookie-based session stickiness; that is an ALB feature.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A media company stores video files that are accessed frequently during the first 30 days after upload, then rarely accessed. They want to minimize storage cost automatically. Which S3 storage class should they use?",
    difficulty: "Exam Level",
    topic: "Amazon S3 Storage Classes",
    objective: "3.6",
    options: { A: "S3 Intelligent-Tiering", B: "S3 Standard for all files", C: "S3 Glacier Deep Archive", D: "S3 One Zone-Infrequent Access" },
    answer: "A",
    explanation: "S3 Intelligent-Tiering automatically moves objects between access tiers based on changing access patterns, with no retrieval fees for accessed objects. It is ideal when access patterns are unknown or changing. A — S3 Standard charges for storage regardless of access frequency, costing more for rarely accessed data. C — Glacier Deep Archive has a 12-hour retrieval time, unsuitable for occasional access. D — One Zone-IA stores data in a single AZ, increasing risk, and requires known infrequent access.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A healthcare company must retain patient records for 10 years for compliance. The records will never be accessed after archiving. Cost minimization is the top priority. Which S3 storage class is MOST appropriate?",
    difficulty: "Exam Level",
    topic: "Amazon S3 Storage Classes",
    objective: "3.6",
    options: { A: "S3 Standard-Infrequent Access (S3 Standard-IA)", B: "S3 Glacier Flexible Retrieval", C: "S3 Glacier Instant Retrieval", D: "S3 Glacier Deep Archive" },
    answer: "D",
    explanation: "S3 Glacier Deep Archive is the lowest-cost AWS storage class, designed for data that is retained for 7–10+ years and rarely if ever accessed. Retrieval time is up to 12 hours. Minimum storage duration is 180 days. A — Standard-IA has higher cost than Glacier classes for long-term archival. B — Glacier Flexible Retrieval costs more than Deep Archive. D — Glacier Instant Retrieval provides millisecond access and is priced higher than Deep Archive.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A data analytics team accesses archived reports once a month. Retrieval time of a few minutes to several hours is acceptable, but millisecond access is not required. Which S3 storage class minimizes cost while meeting these requirements?",
    difficulty: "Exam Level",
    topic: "Amazon S3 Storage Classes",
    objective: "3.6",
    options: { A: "S3 Standard", B: "S3 Glacier Instant Retrieval", C: "S3 Glacier Deep Archive", D: "S3 Glacier Flexible Retrieval" },
    answer: "D",
    explanation: "S3 Glacier Flexible Retrieval offers retrieval options from minutes (Expedited) to hours (Standard/Bulk) and is less expensive than Standard or Glacier Instant Retrieval. Minimum storage duration is 90 days. A — S3 Standard is the most expensive for infrequently accessed data. B — Glacier Instant Retrieval costs more and is designed for millisecond access needs. D — Deep Archive has up to 12-hour retrieval and a 180-day minimum storage duration.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An application requires immediate millisecond access to archived objects that are retrieved about once per quarter. The objects must remain durable. Which S3 storage class is the right balance of cost and retrieval performance?",
    difficulty: "Hard",
    topic: "Amazon S3 Storage Classes",
    objective: "3.6",
    options: { A: "S3 Standard-Infrequent Access", B: "S3 Glacier Deep Archive", C: "S3 One Zone-Infrequent Access", D: "S3 Glacier Instant Retrieval" },
    answer: "D",
    explanation: "S3 Glacier Instant Retrieval delivers millisecond access for data that is rarely accessed (quarterly or less) and requires immediate retrieval. It has a 90-day minimum storage duration and lower cost than S3 Standard-IA for true archive-frequency access. A — Standard-IA also provides millisecond access but is more expensive for quarterly access patterns. B — Deep Archive has 12-hour retrieval, unsuitable for millisecond access. D — One Zone-IA lacks multi-AZ durability and is not an archive class.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company stores backup data in S3 that must be retained for at least 30 days. They want the lowest-cost option that still provides multi-AZ durability for infrequently accessed data with millisecond retrieval. Which class should they choose?",
    difficulty: "Exam Level",
    topic: "Amazon S3 Storage Classes",
    objective: "3.6",
    options: { A: "S3 Standard-Infrequent Access", B: "S3 One Zone-Infrequent Access", C: "S3 Intelligent-Tiering", D: "S3 Glacier Flexible Retrieval" },
    answer: "A",
    explanation: "S3 Standard-Infrequent Access (Standard-IA) stores data across multiple AZs for 99.9% availability with a 30-day minimum storage duration. It provides millisecond retrieval at lower storage cost than S3 Standard, but with a per-GB retrieval fee. A — One Zone-IA stores data in a single AZ (cheaper but lower durability). C — Intelligent-Tiering has a per-object monitoring fee and is optimal when access patterns are unknown. D — Glacier Flexible Retrieval has multi-hour retrieval times and a 90-day minimum.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company is selecting an S3 storage class for objects. Which TWO statements about S3 storage classes are accurate? (Select TWO.)",
    difficulty: "Hard",
    topic: "Amazon S3 Storage Classes",
    objective: "3.6",
    options: { A: "S3 Standard-IA has a minimum storage duration charge of 30 days", B: "S3 Glacier Deep Archive has a minimum storage duration of 90 days", C: "S3 One Zone-IA stores data redundantly across multiple Availability Zones", D: "S3 Glacier Instant Retrieval provides millisecond access to archived data", E: "S3 Intelligent-Tiering charges a per-GB retrieval fee when objects are accessed" },
    answer: ["A", "D"],
    explanation: "A is correct: S3 Standard-IA and One Zone-IA both have a 30-day minimum storage duration charge. D is correct: S3 Glacier Instant Retrieval provides millisecond retrieval latency for archival data accessed quarterly. B is incorrect: Deep Archive has a 180-day minimum storage duration, not 90 days. C is incorrect: One Zone-IA stores data in only ONE Availability Zone. E is incorrect: Intelligent-Tiering has no retrieval fees for accessed objects (it charges a small per-object monitoring fee instead).",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A software team needs a high-performance block storage volume attached to a single EC2 instance to run a relational database. The data must persist if the instance stops. Which storage service should they use?",
    difficulty: "Foundational",
    topic: "Block & File Storage (EBS/EFS/FSx)",
    objective: "3.6",
    options: { A: "Amazon S3", B: "Amazon Elastic File System (EFS)", C: "AWS Storage Gateway", D: "Amazon Elastic Block Store (EBS)" },
    answer: "D",
    explanation: "Amazon EBS provides persistent block storage volumes attached to EC2 instances. Data persists independently of the instance lifecycle and is suitable for databases requiring low-latency block I/O. A — S3 is object storage, not block storage, and cannot be mounted as a filesystem for database block I/O. B — EFS is a shared NFS file system, not block storage; databases prefer block storage for performance. D — Storage Gateway bridges on-premises environments to AWS cloud storage, not primary EC2 block storage.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Multiple EC2 instances running a web application need to share a common file system that scales automatically and is accessible simultaneously from all instances across multiple Availability Zones. Which service provides this?",
    difficulty: "Exam Level",
    topic: "Block & File Storage (EBS/EFS/FSx)",
    objective: "3.6",
    options: { A: "Amazon Elastic Block Store (EBS)", B: "Amazon S3 mounted via S3FS", C: "AWS Snowball Edge", D: "Amazon Elastic File System (EFS)" },
    answer: "D",
    explanation: "Amazon EFS is a managed NFS file system that can be simultaneously mounted by thousands of EC2 instances across multiple AZs. It scales automatically and is multi-AZ by default. A — EBS volumes can only be attached to a single EC2 instance at a time (EBS Multi-Attach is limited to Nitro instances in the same AZ). B — S3FS is not an AWS-native service and has significant performance limitations. D — Snowball Edge is a physical device for data transfer and edge computing.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An enterprise has a Windows-based application that requires a shared file system with support for SMB protocol and Windows ACLs. Which AWS service should they use?",
    difficulty: "Hard",
    topic: "Block & File Storage (EBS/EFS/FSx)",
    objective: "3.6",
    options: { A: "Amazon FSx for Windows File Server", B: "Amazon EFS", C: "Amazon EBS Multi-Attach", D: "AWS Storage Gateway File Gateway" },
    answer: "A",
    explanation: "Amazon FSx for Windows File Server provides a fully managed Windows-native shared file system built on Windows Server, supporting SMB protocol, NTFS, and Windows Active Directory integration. A — EFS uses NFS protocol, not SMB, and does not support Windows ACLs natively. C — EBS Multi-Attach is for block storage and limited to specific use cases within a single AZ. D — Storage Gateway File Gateway caches on-premises files in S3 but is not a direct replacement for Windows file servers.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company needs to migrate 80 TB of on-premises backup tapes to AWS for long-term archival. Network bandwidth is insufficient for online transfer. Which AWS service should they use?",
    difficulty: "Exam Level",
    topic: "Storage Gateway & Snow Family",
    objective: "3.6",
    options: { A: "AWS Snowball Edge Storage Optimized", B: "AWS Direct Connect", C: "AWS Storage Gateway Tape Gateway", D: "Amazon S3 Transfer Acceleration" },
    answer: "A",
    explanation: "AWS Snowball Edge Storage Optimized is a physical petabyte-scale data transfer device. For large datasets where network transfer is impractical, Snowball Edge allows secure offline data migration at scale. A — Direct Connect is a dedicated network connection to AWS; it does not help if bandwidth itself is the bottleneck. C — Storage Gateway Tape Gateway virtualizes tape libraries but still requires network connectivity for data transfer. D — S3 Transfer Acceleration improves online transfer speeds but cannot overcome fundamental bandwidth limitations.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An on-premises application writes data to a local NFS mount, but the company wants all files stored durably in Amazon S3 while maintaining a cached copy locally. Which AWS Storage Gateway mode supports this?",
    difficulty: "Hard",
    topic: "Storage Gateway & Snow Family",
    objective: "3.6",
    options: { A: "File Gateway", B: "Volume Gateway — Cached mode", C: "Tape Gateway", D: "Volume Gateway — Stored mode" },
    answer: "A",
    explanation: "AWS Storage Gateway File Gateway presents an NFS (or SMB) interface to on-premises applications while storing files durably in Amazon S3. Frequently accessed files are cached locally. A — Volume Gateway Cached mode stores primary data in S3 and caches frequently accessed data on-premises, but presents block storage (iSCSI), not NFS. C — Tape Gateway virtualizes physical tape libraries for backup software. D — Volume Gateway Stored mode keeps primary data on-premises and asynchronously backs up to S3 as EBS snapshots.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company is migrating a legacy tape backup system to AWS. Their backup software uses a VTL interface and they want to store virtual tapes in Amazon S3 Glacier. Which AWS service provides a virtual tape library (VTL) interface?",
    difficulty: "Hard",
    topic: "Storage Gateway & Snow Family",
    objective: "3.6",
    options: { A: "AWS Storage Gateway File Gateway", B: "AWS Storage Gateway Volume Gateway", C: "AWS Snowball Edge", D: "AWS Storage Gateway Tape Gateway" },
    answer: "D",
    explanation: "AWS Storage Gateway Tape Gateway presents a virtual tape library (VTL) interface to existing backup software, storing virtual tapes durably in Amazon S3 and archiving them to S3 Glacier. A — File Gateway provides an NFS/SMB interface to S3 object storage, not VTL. B — Volume Gateway provides block storage (iSCSI), not tape library emulation. D — Snowball Edge is a physical device for data transfer and edge computing, not a VTL interface.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An e-commerce company needs a fully managed relational database that automatically scales storage up to 128 TB, supports MySQL-compatible queries, and provides up to 5x better performance than standard MySQL. Which AWS service should they choose?",
    difficulty: "Exam Level",
    topic: "Relational Databases (RDS/Aurora)",
    objective: "3.4",
    options: { A: "Amazon Aurora", B: "Amazon RDS for MySQL", C: "Amazon DynamoDB", D: "Amazon Redshift" },
    answer: "A",
    explanation: "Amazon Aurora is a MySQL- and PostgreSQL-compatible relational database that delivers up to 5x the throughput of standard MySQL, automatically scales storage, and provides built-in high availability. A — RDS for MySQL is managed but does not offer the same performance improvements or automatic storage scaling as Aurora. C — DynamoDB is a NoSQL key-value/document database, not relational. D — Redshift is an OLAP data warehouse, not suited for transactional e-commerce workloads.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A gaming company needs a database that delivers single-digit millisecond latency at any scale for storing player session data, with no schema to manage and automatic scaling. Which AWS service is MOST appropriate?",
    difficulty: "Exam Level",
    topic: "NoSQL & Specialized Databases (DynamoDB/Redshift/ElastiCache)",
    objective: "3.4",
    options: { A: "Amazon DynamoDB", B: "Amazon RDS for PostgreSQL", C: "Amazon ElastiCache", D: "Amazon Redshift" },
    answer: "A",
    explanation: "Amazon DynamoDB is a fully managed, serverless NoSQL key-value and document database that delivers single-digit millisecond performance at any scale with automatic scaling. A — RDS for PostgreSQL is relational and requires schema management; latency is higher. C — ElastiCache provides sub-millisecond in-memory caching but is not a primary persistent data store. D — Redshift is an OLAP data warehouse optimized for analytical queries, not low-latency session storage.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A data team needs to run complex SQL analytics on petabytes of structured data from multiple sources, with results delivered to a BI tool. Which AWS service is designed for this use case?",
    difficulty: "Exam Level",
    topic: "NoSQL & Specialized Databases (DynamoDB/Redshift/ElastiCache)",
    objective: "3.4",
    options: { A: "Amazon DynamoDB", B: "Amazon Aurora", C: "Amazon ElastiCache for Redis", D: "Amazon Redshift" },
    answer: "D",
    explanation: "Amazon Redshift is a fully managed cloud data warehouse optimized for OLAP queries against petabytes of data. It integrates natively with BI tools. A — DynamoDB is a NoSQL database optimized for OLTP, not complex analytical SQL. B — Aurora is a relational OLTP database; it can run analytics but is not optimized for petabyte-scale OLAP. D — ElastiCache is an in-memory caching service, not an analytical data store.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A web application experiences database bottlenecks during peak traffic because the same product catalog queries are executed thousands of times per second. The underlying data rarely changes. Which AWS service reduces database load with in-memory caching?",
    difficulty: "Exam Level",
    topic: "NoSQL & Specialized Databases (DynamoDB/Redshift/ElastiCache)",
    objective: "3.4",
    options: { A: "Amazon ElastiCache", B: "Amazon DynamoDB DAX", C: "Amazon RDS Read Replicas", D: "Amazon Redshift Spectrum" },
    answer: "A",
    explanation: "Amazon ElastiCache (Redis or Memcached) is a fully managed in-memory caching service that reduces database load by caching frequent read queries in memory with sub-millisecond latency. A — DynamoDB DAX is an in-memory cache specifically for DynamoDB, not for RDS/MySQL databases. C — RDS Read Replicas distribute read traffic but still execute SQL queries against a database engine, not purely in-memory. D — Redshift Spectrum queries data in S3, which is unrelated to reducing OLTP database load.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A social network application stores user relationships and needs to find all friends-of-friends within three degrees of connection. Which AWS database service is purpose-built for this type of traversal query?",
    difficulty: "Hard",
    topic: "NoSQL & Specialized Databases (DynamoDB/Redshift/ElastiCache)",
    objective: "3.4",
    options: { A: "Amazon DynamoDB", B: "Amazon RDS for MySQL", C: "Amazon DocumentDB", D: "Amazon Neptune" },
    answer: "D",
    explanation: "Amazon Neptune is a fully managed graph database service optimized for storing and querying highly connected data sets such as social networks, fraud detection, and knowledge graphs. It supports Apache TinkerPop Gremlin and W3C SPARQL. A — DynamoDB is a key-value/document NoSQL store; relationship traversals require complex application-level logic. B — RDS for MySQL stores relational data; graph traversals require inefficient self-joins. D — DocumentDB is a document-oriented database compatible with MongoDB, not optimized for graph traversals.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company is migrating from an on-premises Oracle database to AWS. They want a managed relational database service with managed patching and backups. Which TWO AWS services support relational, OLTP workloads? (Select TWO.)",
    difficulty: "Foundational",
    topic: "Relational Databases (RDS/Aurora)",
    objective: "3.4",
    options: { A: "Amazon Redshift", B: "Amazon RDS", C: "Amazon DynamoDB", D: "Amazon Aurora", E: "Amazon ElastiCache" },
    answer: ["B", "D"],
    explanation: "Amazon RDS supports multiple relational database engines (MySQL, PostgreSQL, Oracle, SQL Server, MariaDB) with automated backups and patching. Amazon Aurora is also a fully managed relational database (MySQL/PostgreSQL-compatible) with automated operations. B — Redshift is an OLAP data warehouse, not OLTP. D — DynamoDB is NoSQL. E — ElastiCache is an in-memory cache, not a relational database.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company has a global web application with static assets (images, CSS, JavaScript). Users in Asia are experiencing high latency fetching assets from the US-East origin. Which AWS service reduces latency by serving content from locations closer to users?",
    difficulty: "Foundational",
    topic: "Networking (VPC/Route 53/CloudFront)",
    objective: "3.5",
    options: { A: "Amazon Route 53 latency routing", B: "AWS Global Accelerator", C: "AWS Direct Connect", D: "Amazon CloudFront" },
    answer: "D",
    explanation: "Amazon CloudFront is a content delivery network (CDN) that caches content at edge locations worldwide. Static assets are served from the nearest edge location, dramatically reducing latency for global users. A — Route 53 latency routing routes DNS queries to the nearest AWS Region but does not cache content. B — Global Accelerator routes TCP/UDP traffic to optimal AWS endpoints using Anycast IPs but does not cache content. D — Direct Connect is a dedicated network link, not a CDN.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company needs static IP addresses for their global application endpoint. Traffic should be routed to the nearest healthy AWS Region over the AWS global backbone, bypassing the public internet. Which service provides this?",
    difficulty: "Hard",
    topic: "Networking (VPC/Route 53/CloudFront)",
    objective: "3.5",
    options: { A: "Amazon CloudFront", B: "Amazon Route 53 with geolocation routing", C: "Elastic Load Balancing with cross-zone routing", D: "AWS Global Accelerator" },
    answer: "D",
    explanation: "AWS Global Accelerator provides two static Anycast IP addresses and routes user traffic over the AWS global network backbone to the optimal AWS endpoint, improving availability and performance. A — CloudFront is a CDN for HTTP/HTTPS caching; it does not provide static IPs or route non-HTTP traffic over the backbone. B — Route 53 geolocation routing is DNS-based; it does not keep traffic on the AWS backbone. D — ELB distributes traffic within a Region; it does not provide static global IPs.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A security engineer needs to control inbound traffic to EC2 instances in a VPC. Which TWO statements correctly describe the difference between Security Groups and Network ACLs? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Networking (VPC/Route 53/CloudFront)",
    objective: "3.5",
    options: { A: "Network ACLs are stateful; outbound rules are automatically generated from inbound rules", B: "Security Groups are stateful; return traffic is automatically allowed without an explicit outbound rule", C: "Security Groups operate at the subnet level; Network ACLs operate at the instance level", D: "Network ACLs are stateless; both inbound and outbound rules must be explicitly configured", E: "Network ACLs and Security Groups both allow and deny rules with equal precedence" },
    answer: ["B", "D"],
    explanation: "A is correct: Security Groups are stateful — if inbound traffic is permitted, the return traffic is automatically allowed. C is correct: Network ACLs are stateless — both inbound AND outbound rules must be explicitly configured for traffic to flow in both directions. B is incorrect: NACLs are stateless, not stateful. D is incorrect: Security Groups operate at the instance level; NACLs operate at the subnet level. E is incorrect: Security Groups only allow traffic (no explicit deny rules per entry); NACLs support both allow and deny rules processed in number order.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company needs private, dedicated connectivity from their on-premises data center to AWS, as well as an encrypted fallback option over the public internet. Which TWO AWS connectivity options address these needs? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Networking (VPC/Route 53/CloudFront)",
    objective: "3.5",
    options: { A: "Amazon CloudFront for private origin connectivity", B: "AWS Direct Connect for private dedicated connectivity bypassing the public internet", C: "Amazon VPC Peering for on-premises to cloud connectivity", D: "AWS Site-to-Site VPN for encrypted connectivity over the public internet", E: "AWS Transit Gateway for direct physical network connections" },
    answer: ["B", "D"],
    explanation: "A is correct: AWS Direct Connect provides a dedicated private network connection from on-premises to AWS, bypassing the public internet for consistent bandwidth and low latency. C is correct: AWS Site-to-Site VPN creates an encrypted IPsec tunnel between on-premises and AWS over the public internet, serving as a cost-effective backup or primary connection. B — CloudFront is a CDN; it does not provide private on-premises connectivity. D — VPC Peering connects two VPCs, not an on-premises data center to AWS. E — Transit Gateway connects VPCs and on-premises networks through a hub, but requires Direct Connect or VPN as the physical underlay.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to register a new domain name and route user traffic to their AWS resources with failover capability. Which AWS service handles both DNS registration and routing policies?",
    difficulty: "Foundational",
    topic: "Networking (VPC/Route 53/CloudFront)",
    objective: "3.5",
    options: { A: "AWS Certificate Manager", B: "Amazon CloudFront", C: "AWS Global Accelerator", D: "Amazon Route 53" },
    answer: "D",
    explanation: "Amazon Route 53 is AWS's scalable DNS web service that supports domain registration, DNS routing policies (including failover, latency, geolocation, weighted), and health checks. A — AWS Certificate Manager provisions SSL/TLS certificates, not DNS. B — CloudFront is a CDN; it does not register domains or manage DNS routing policies. D — Global Accelerator routes traffic using Anycast IPs but does not provide DNS registration.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A cloud architect is designing a highly available three-tier web application within a VPC. Which TWO practices improve network-level security and isolation? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Networking (VPC/Route 53/CloudFront)",
    objective: "3.5",
    options: { A: "Assign public IP addresses to all database instances for management access", B: "Place database instances in private subnets with no internet gateway route", C: "Use Security Groups to allow only necessary traffic between application tiers", D: "Store all data in a single public subnet for simplified routing", E: "Disable all VPC Flow Logs to reduce cost" },
    answer: ["B", "C"],
    explanation: "A is correct: placing databases in private subnets without internet gateway routes prevents direct internet access, enforcing the principle of least privilege at the network level. C is correct: Security Groups act as stateful instance-level firewalls, restricting traffic to only what is required between application tiers. B — Assigning public IPs to databases exposes them to the internet, which is a security risk. D — A single public subnet removes network segmentation. E — Disabling Flow Logs removes visibility and auditability.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An order processing system must ensure that each order message is processed exactly once and in order, even if the consumer application fails and restarts. Which AWS messaging service supports FIFO ordering and exactly-once processing?",
    difficulty: "Exam Level",
    topic: "Messaging & Integration (SQS/SNS/EventBridge)",
    objective: "3.3",
    options: { A: "Amazon SNS Standard topic", B: "Amazon SQS Standard queue", C: "Amazon EventBridge event bus", D: "Amazon SQS FIFO queue" },
    answer: "D",
    explanation: "Amazon SQS FIFO queues guarantee that messages are processed in the order they are sent and deliver each message exactly once. A — SNS Standard topics are for pub/sub fan-out; they do not guarantee ordering. B — SQS Standard queues provide at-least-once delivery with best-effort ordering, not strict FIFO. D — EventBridge is an event bus for routing events between services; it does not provide FIFO ordering guarantees.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company publishes a news alert and needs to immediately notify 50,000 mobile app users, send an email to a distribution list, and trigger a Lambda function — all simultaneously from a single publish action. Which AWS service enables this fan-out pattern?",
    difficulty: "Exam Level",
    topic: "Messaging & Integration (SQS/SNS/EventBridge)",
    objective: "3.3",
    options: { A: "Amazon SQS", B: "Amazon SNS", C: "AWS Step Functions", D: "Amazon Kinesis Data Streams" },
    answer: "B",
    explanation: "Amazon SNS is a pub/sub messaging service that delivers a single message to multiple subscribers simultaneously (push model). It supports email, SMS, Lambda, HTTP/S, and SQS endpoints. A — SQS is a pull-based queue; a single message goes to a single consumer, not multiple. C — Step Functions orchestrates workflows but does not natively fan out to thousands of push subscribers. D — Kinesis Data Streams is for high-throughput data streaming, not pub/sub notification fan-out.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to trigger automated remediation workflows when specific AWS resource configuration changes occur across their AWS account, based on events from multiple AWS services. Which service should be used as the event routing hub?",
    difficulty: "Hard",
    topic: "Messaging & Integration (SQS/SNS/EventBridge)",
    objective: "3.3",
    options: { A: "Amazon SQS", B: "AWS Step Functions", C: "Amazon EventBridge", D: "Amazon SNS" },
    answer: "C",
    explanation: "Amazon EventBridge is a serverless event bus that ingests events from AWS services, custom applications, and SaaS partners, then routes them to targets (Lambda, Step Functions, SQS, etc.) based on rules. A — SQS is a queue that decouples producers and consumers but is not designed as a multi-source event routing bus. B — Step Functions orchestrates multi-step workflows but does not route events from multiple AWS services. D — SNS is a pub/sub push notification service, not an event bus with source-filtering rules.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A solutions architect is designing a multi-tier application and wants to decouple the front-end tier from the back-end processing tier. Which TWO AWS messaging services can help decouple application components? (Select TWO.)",
    difficulty: "Foundational",
    topic: "Messaging & Integration (SQS/SNS/EventBridge)",
    objective: "3.3",
    options: { A: "Amazon RDS for storing inter-service messages", B: "Amazon SQS for buffering and decoupling asynchronous processing", C: "Amazon SNS for broadcasting events to multiple downstream consumers", D: "Amazon EBS for sharing data between tiers", E: "AWS Direct Connect for inter-service communication" },
    answer: ["B", "C"],
    explanation: "A is correct: SQS buffers messages between producers and consumers, enabling asynchronous decoupling so that front-end and back-end tiers operate independently. C is correct: SNS fan-out enables an event to be published once and delivered to multiple subscribers simultaneously, decoupling producers from consumers. B — RDS is a relational database, not a messaging service. D — EBS is block storage attached to EC2; it cannot be used for inter-service messaging. E — Direct Connect is a network link to AWS from on-premises, not inter-service messaging.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A security team needs an immutable audit trail showing which IAM user called the DeleteBucket API action, from which IP address, and at what time. Which AWS service provides this?",
    difficulty: "Foundational",
    topic: "Monitoring (CloudWatch/CloudTrail)",
    objective: "3.1",
    options: { A: "Amazon CloudWatch Logs", B: "AWS CloudTrail", C: "AWS Config", D: "Amazon GuardDuty" },
    answer: "B",
    explanation: "AWS CloudTrail records all API calls made in an AWS account, including the caller identity, time, source IP, and parameters. It is the primary service for API-level audit logging. A — CloudWatch Logs captures application and infrastructure logs; it does not natively record AWS API calls. C — AWS Config records resource configuration states and changes but focuses on compliance, not API call attribution. D — GuardDuty is a threat detection service that uses CloudTrail events as a data source but does not itself provide the raw API audit trail.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "An operations team wants to receive an email alert when an EC2 instance's CPU utilization exceeds 80% for more than 5 minutes, and also maintain an audit log of all API actions. Which TWO AWS services address these needs? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "Monitoring (CloudWatch/CloudTrail)",
    objective: "3.1",
    options: { A: "Amazon CloudWatch Alarms with Amazon SNS for the CPU metric alert", B: "AWS CloudTrail for the CPU utilization threshold alert", C: "Amazon Inspector for monitoring CPU metrics", D: "AWS CloudTrail for the API activity audit log", E: "AWS Config for real-time CPU performance alerting" },
    answer: ["A", "D"],
    explanation: "A is correct: CloudWatch Alarms monitor metrics (such as CPU utilization) and trigger actions — like sending an SNS notification — when thresholds are breached. C is correct: AWS CloudTrail records all API calls in the account, providing an immutable audit log of who did what and when. B is incorrect: CloudTrail tracks API calls, not performance metrics. D is incorrect: Inspector assesses security vulnerabilities, not CPU metrics. E is incorrect: Config monitors resource configurations for compliance, not real-time performance metrics.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A DevOps team wants to track whether any S3 buckets in their account have had public access enabled, and receive a notification whenever a bucket becomes non-compliant with their internal policy. Which AWS service continuously monitors resource configurations for compliance?",
    difficulty: "Exam Level",
    topic: "Monitoring (CloudWatch/CloudTrail)",
    objective: "3.1",
    options: { A: "AWS CloudTrail", B: "Amazon CloudWatch", C: "AWS Config", D: "Amazon Macie" },
    answer: "C",
    explanation: "AWS Config continuously records AWS resource configurations and evaluates them against desired-state rules. Non-compliant resources can trigger SNS notifications or auto-remediation. A — CloudTrail records API calls but does not continuously evaluate resource configuration compliance. B — CloudWatch monitors metrics and logs; it does not evaluate resource configuration rules. D — Amazon Macie uses ML to discover and protect sensitive data in S3 but does not evaluate general configuration compliance.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A developer wants to understand the end-to-end path of a request through a distributed microservices application to identify which service is causing latency. Which AWS service provides distributed request tracing?",
    difficulty: "Hard",
    topic: "Monitoring (CloudWatch/CloudTrail)",
    objective: "3.1",
    options: { A: "AWS CloudTrail", B: "Amazon CloudWatch Container Insights", C: "AWS X-Ray", D: "AWS Config" },
    answer: "C",
    explanation: "AWS X-Ray provides distributed tracing for applications, enabling developers to analyze and debug production and distributed applications by mapping request flows across services and identifying bottlenecks. A — CloudTrail records AWS API calls, not application-level request traces. B — CloudWatch Container Insights collects metrics and logs from containerized workloads but does not provide distributed request tracing. D — Config tracks resource configurations, not application request traces.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to ensure their AWS infrastructure configuration always matches an approved baseline and automatically remediates drift. Which AWS service provides continuous compliance evaluation with auto-remediation?",
    difficulty: "Hard",
    topic: "Monitoring (CloudWatch/CloudTrail)",
    objective: "3.1",
    options: { A: "Amazon CloudWatch Events", B: "AWS Trusted Advisor", C: "AWS Config with remediation actions", D: "AWS CloudTrail with S3 log archiving" },
    answer: "C",
    explanation: "AWS Config continuously evaluates resource configurations against defined rules and can trigger automatic remediation actions (via Systems Manager Automation documents or Lambda) when non-compliance is detected. A — CloudWatch Events (now EventBridge) routes events but does not natively evaluate resource compliance rules. B — Trusted Advisor provides best-practice recommendations but does not continuously enforce compliance with auto-remediation. D — CloudTrail archives API logs; it records what happened but does not evaluate or remediate configuration drift.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company is choosing an AWS Region for a new application. Their primary driver is regulatory compliance requiring all customer data to remain within Australia. Which factor should drive Region selection?",
    difficulty: "Foundational",
    topic: "AWS Global Infrastructure",
    objective: "3.2",
    options: { A: "Selecting the Region with the lowest per-GB S3 storage price", B: "Choosing the Region closest to the development team's headquarters", C: "Selecting an AWS Region located in Australia to meet data residency requirements", D: "Deploying in the Region with the most Availability Zones for highest resiliency" },
    answer: "C",
    explanation: "Data residency and regulatory compliance are primary drivers for Region selection. AWS does not move customer data outside the selected Region without consent, so choosing ap-southeast-2 (Sydney, Australia) ensures data remains in Australia. A — Cost is a factor but does not override compliance requirements. B — The development team location is irrelevant to data residency. D — Number of AZs is a factor for high availability, but compliance takes precedence.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An AWS Region consists of multiple isolated locations to enable fault-tolerant, highly available deployments. What are these isolated locations called?",
    difficulty: "Foundational",
    topic: "AWS Global Infrastructure",
    objective: "3.2",
    options: { A: "Edge Locations", B: "Data Centers", C: "Availability Zones", D: "Local Zones" },
    answer: "C",
    explanation: "Availability Zones (AZs) are physically separate data centers within a Region, each with independent power, cooling, and networking. Deploying across multiple AZs provides high availability and fault tolerance. A — Edge Locations are used by CloudFront for content caching, not for deploying applications. B — Data centers exist within AZs; the AZ is the isolated location abstraction. D — Local Zones are AWS infrastructure extensions to metropolitan areas, not the standard sub-Region isolation unit.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A cloud architect wants to design an application that remains available if one AWS Availability Zone experiences an outage. Which TWO design choices directly support high availability across AZs? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "AWS Global Infrastructure",
    objective: "3.2",
    options: { A: "Deploy EC2 instances in at least two Availability Zones behind a load balancer", B: "Use a single large EC2 instance type to consolidate workload", C: "Enable Multi-AZ deployment for Amazon RDS", D: "Store all data on an EBS volume attached to one instance", E: "Use a single Availability Zone with Spot Instances for cost savings" },
    answer: ["A", "C"],
    explanation: "A is correct: distributing EC2 instances across multiple AZs behind an ELB ensures the application continues to serve traffic if one AZ fails. C is correct: RDS Multi-AZ creates a synchronous standby replica in a different AZ, enabling automatic failover. B — A single large instance is a single point of failure. D — EBS volumes are AZ-specific; a single EBS volume does not provide cross-AZ redundancy. E — A single AZ removes fault isolation.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A streaming company needs to deploy its application within a specific metropolitan area not covered by a full AWS Region, to provide single-digit millisecond latency to end users in that city. Which AWS infrastructure extension should they use?",
    difficulty: "Hard",
    topic: "Edge Locations & Hybrid (Outposts/Local Zones/Wavelength)",
    objective: "3.2",
    options: { A: "AWS Outposts", B: "Amazon CloudFront Edge Location", C: "AWS Local Zones", D: "AWS Wavelength" },
    answer: "C",
    explanation: "AWS Local Zones place compute, storage, and database services closer to large population centers that are not served by a full AWS Region, enabling single-digit millisecond latency for applications that require geographic proximity. A — Outposts extends AWS infrastructure to the customer's own on-premises data center. B — CloudFront Edge Locations cache content but do not run full compute workloads. D — Wavelength embeds AWS compute at the edge of 5G networks, specifically for ultra-low latency 5G mobile use cases.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A telecommunications company wants to run AWS compute workloads at the edge of their 5G network to support ultra-low latency mobile gaming with latency under 10 milliseconds. Which AWS service enables this?",
    difficulty: "Hard",
    topic: "Edge Locations & Hybrid (Outposts/Local Zones/Wavelength)",
    objective: "3.2",
    options: { A: "AWS Local Zones", B: "AWS Wavelength", C: "Amazon CloudFront", D: "AWS Outposts" },
    answer: "B",
    explanation: "AWS Wavelength embeds AWS compute and storage services within telecommunications providers' 5G networks, enabling developers to build applications that serve mobile end-users with single-digit millisecond latency over 5G. A — Local Zones are for specific metro areas, not embedded within 5G carrier networks. C — CloudFront is a CDN for content caching, not a 5G edge compute platform. D — Outposts places AWS infrastructure on-premises in a customer's facility, not within a carrier's 5G network.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A manufacturing plant has applications that must run locally with near-zero latency due to network disconnection risks, but the team wants to use the same AWS APIs and tools they use in the cloud. Which offering extends AWS infrastructure to on-premises environments?",
    difficulty: "Exam Level",
    topic: "Edge Locations & Hybrid (Outposts/Local Zones/Wavelength)",
    objective: "3.2",
    options: { A: "AWS Local Zones", B: "AWS Snowball Edge", C: "AWS Outposts", D: "Amazon CloudFront with origin shield" },
    answer: "C",
    explanation: "AWS Outposts delivers fully managed AWS infrastructure, services, APIs, and tools to customer on-premises locations, enabling consistent hybrid experiences using the same AWS hardware and software in the data center or factory floor. A — Local Zones are extensions to metro areas, not a customer's own facility. B — Snowball Edge is for data transfer and edge computing at disconnected sites but is a temporary device, not a permanent infrastructure extension. D — CloudFront Origin Shield adds a centralized caching layer, not on-premises compute.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A sysadmin wants to automate the deployment of identical AWS infrastructure across 10 different AWS accounts using a template that can be version-controlled. Which approach is MOST appropriate?",
    difficulty: "Exam Level",
    topic: "Infrastructure as Code (CloudFormation)",
    objective: "3.1",
    options: { A: "Manually configure resources in each account using the AWS Management Console", B: "Use AWS CloudFormation templates deployed with StackSets", C: "Write individual AWS CLI commands in a shell script", D: "Use the AWS SDK to call each API directly" },
    answer: "B",
    explanation: "AWS CloudFormation StackSets allow you to deploy a CloudFormation template (infrastructure as code) across multiple AWS accounts and Regions in a single operation, ensuring consistency and enabling version control. A — Manual console configuration is error-prone and not scalable across 10 accounts. C — Shell scripts with CLI commands can work but are fragile, not idempotent, and harder to maintain than declarative templates. D — SDK calls require significant custom code and drift management logic.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An application team needs CloudFormation to provision an S3 bucket, a Lambda function, and an IAM role together, and be able to roll back all resources if any one fails. What is the unit of management in CloudFormation that groups these resources?",
    difficulty: "Foundational",
    topic: "Infrastructure as Code (CloudFormation)",
    objective: "3.1",
    options: { A: "CloudFormation Template", B: "CloudFormation StackSet", C: "CloudFormation Stack", D: "CloudFormation Change Set" },
    answer: "C",
    explanation: "A CloudFormation Stack is a collection of AWS resources defined in a template that are provisioned, updated, and deleted as a single unit. If any resource fails, the stack rolls back. A — A Template is the JSON/YAML definition file; it must be deployed as a Stack to create resources. B — A StackSet deploys the same Stack across multiple accounts/Regions. D — A Change Set previews proposed changes to an existing Stack before applying them.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company wants to use AWS infrastructure-as-code. Which THREE statements accurately describe AWS CloudFormation? (Select THREE.)",
    difficulty: "Exam Level",
    topic: "Infrastructure as Code (CloudFormation)",
    objective: "3.1",
    options: { A: "CloudFormation templates can be written in JSON or YAML", B: "CloudFormation automatically monitors application performance metrics after deployment", C: "A CloudFormation stack represents a collection of AWS resources managed as a single unit", D: "CloudFormation can deploy the same template across multiple Regions using StackSets", E: "CloudFormation requires manual resource deletion before a stack can be updated" },
    answer: ["A", "C", "D"],
    explanation: "A is correct: CloudFormation supports both JSON and YAML template formats. C is correct: a CloudFormation Stack groups related AWS resources so they can be created, updated, and deleted together. D is correct: CloudFormation StackSets enable deploying stacks across multiple AWS accounts and Regions from a single operation. B is incorrect: CloudFormation handles provisioning; application performance monitoring is done by CloudWatch. E is incorrect: CloudFormation supports in-place updates and change sets without requiring manual deletion of resources.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A developer needs to programmatically upload files to Amazon S3 from within a Python application. Which AWS interface should they use?",
    difficulty: "Foundational",
    topic: "Ways to Interact with AWS (Console/CLI/SDK)",
    objective: "3.1",
    options: { A: "AWS Management Console", B: "AWS Command Line Interface (CLI)", C: "AWS Software Development Kit (SDK) for Python (Boto3)", D: "AWS CloudFormation" },
    answer: "C",
    explanation: "The AWS SDK for Python (Boto3) allows developers to integrate AWS service calls directly into Python application code. It is the correct choice for programmatic, application-level interaction with AWS services. A — The Console is a browser-based GUI; it cannot be embedded in application code. B — The CLI is for command-line/scripting use, not for embedding service calls in Python application logic. D — CloudFormation provisions infrastructure declaratively; it does not perform runtime application operations like file uploads.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A DevOps engineer wants to script repetitive AWS operations, such as creating VPCs and tagging resources, in a shell environment for use in CI/CD pipelines. Which AWS tool is BEST suited?",
    difficulty: "Foundational",
    topic: "Ways to Interact with AWS (Console/CLI/SDK)",
    objective: "3.1",
    options: { A: "AWS CloudFormation", B: "AWS Command Line Interface (CLI)", C: "AWS Management Console", D: "AWS Trusted Advisor" },
    answer: "B",
    explanation: "The AWS CLI is a unified command-line tool for controlling AWS services from the command line. It is ideal for scripting repetitive operations and integrating with CI/CD pipelines. A — CloudFormation declaratively provisions infrastructure from templates; it is not a scripting tool for arbitrary operational commands. C — The Console is GUI-based and cannot be scripted in CI/CD pipelines. D — Trusted Advisor provides best-practice recommendations; it is not a scripting interface.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to extract structured data (names, dates, amounts) from thousands of scanned PDF invoices automatically, without building a custom ML model. Which AWS service provides this capability?",
    difficulty: "Exam Level",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "Amazon Rekognition", B: "Amazon Textract", C: "Amazon Comprehend", D: "Amazon Transcribe" },
    answer: "B",
    explanation: "Amazon Textract automatically extracts text and structured data (forms, tables, key-value pairs) from scanned documents using ML, with no ML expertise required. A — Rekognition analyzes images and videos for objects, faces, and scenes; it does not extract structured document data. C — Comprehend performs NLP tasks on text (sentiment, entities, key phrases) but does not extract data from image-based documents. D — Transcribe converts speech to text from audio files, not document images.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A retail company wants to add a conversational chatbot to their website to handle customer service inquiries using natural language understanding and intent recognition. Which AWS service should they use?",
    difficulty: "Exam Level",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "Amazon Polly", B: "Amazon Lex", C: "Amazon Translate", D: "Amazon Comprehend" },
    answer: "B",
    explanation: "Amazon Lex provides automatic speech recognition (ASR) and natural language understanding (NLU) to build conversational chatbots and voice interfaces. It powers Amazon Alexa. A — Polly converts text to lifelike speech (TTS); it does not understand conversational intent. C — Translate is a machine translation service; it translates text between languages, not a chatbot builder. D — Comprehend performs NLP analysis on text but does not provide a conversational bot interface.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A security team needs to automatically detect suspicious objects and weapons in video streams from security cameras in real time. Which AWS service provides this video analysis capability?",
    difficulty: "Exam Level",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "Amazon Textract", B: "Amazon Rekognition", C: "Amazon Comprehend", D: "Amazon Kendra" },
    answer: "B",
    explanation: "Amazon Rekognition provides image and video analysis, including object detection, scene recognition, facial analysis, and unsafe content detection — including analyzing video streams in real time. A — Textract extracts data from documents, not video streams. C — Comprehend performs NLP on text, not video analysis. D — Kendra is an intelligent enterprise search service, not a computer vision service.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A data engineering team needs to discover, catalog, and run ETL jobs on raw data stored in Amazon S3 before loading it into Redshift. Which AWS service automates ETL with a serverless, code-generated approach?",
    difficulty: "Exam Level",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "Amazon Kinesis Data Firehose", B: "Amazon Athena", C: "AWS Glue", D: "Amazon QuickSight" },
    answer: "C",
    explanation: "AWS Glue is a fully managed ETL service that discovers and catalogs data from various sources, generates ETL code, and runs jobs to transform and load data. A — Kinesis Data Firehose is for streaming data delivery, not batch ETL transformation. B — Athena queries data in S3 using SQL but does not transform and load data. D — QuickSight is a BI visualization tool, not an ETL service.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A business intelligence team wants to run SQL queries directly on log files stored in Amazon S3 without loading the data into a database first. Which AWS service supports this?",
    difficulty: "Exam Level",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "Amazon Redshift", B: "AWS Glue", C: "Amazon Athena", D: "Amazon EMR" },
    answer: "C",
    explanation: "Amazon Athena is a serverless interactive query service that runs standard SQL queries directly on data stored in Amazon S3. There is no need to load data into a database; you pay per query. A — Redshift requires loading data into a data warehouse first. B — Glue is for ETL; it can catalog data for Athena but does not itself run interactive SQL queries on S3. D — EMR is a big data platform for complex processing frameworks like Spark and Hadoop, requiring more setup than Athena.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to build, train, and deploy custom machine learning models at scale without managing the underlying infrastructure. Which AWS service provides a fully managed ML platform for the complete model lifecycle?",
    difficulty: "Exam Level",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "AWS Lambda", B: "Amazon SageMaker", C: "Amazon Bedrock", D: "Amazon Comprehend" },
    answer: "B",
    explanation: "Amazon SageMaker is a fully managed platform that covers the complete ML lifecycle: data labeling, model training, tuning, deployment, and monitoring, all without managing infrastructure. A — Lambda runs event-driven functions; it is not an ML training platform. C — Bedrock provides access to pre-trained foundation models (generative AI); it is not for training custom ML models from scratch. D — Comprehend is a pre-built NLP service; it does not provide a platform for custom model training.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to integrate large language model (LLM) capabilities into their application using foundation models from providers such as Anthropic, Amazon, and Meta, without managing any ML infrastructure. Which AWS service provides this access?",
    difficulty: "Hard",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "Amazon SageMaker", B: "Amazon Bedrock", C: "Amazon Comprehend", D: "AWS DeepLens" },
    answer: "B",
    explanation: "Amazon Bedrock is a fully managed service that provides access to a variety of foundation models (FMs) from Amazon and leading AI companies via an API, enabling generative AI application development without managing infrastructure. A — SageMaker is for building, training, and deploying custom ML models; it does not provide ready-to-use foundation models through a simple API. C — Comprehend is a purpose-built NLP service, not a generative AI platform. D — DeepLens is a deep learning-enabled video camera for developers, unrelated to LLM APIs.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A call center wants to automatically convert recorded customer support calls (audio files) into searchable text transcripts. Which AWS service provides this speech-to-text capability?",
    difficulty: "Foundational",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "Amazon Polly", B: "Amazon Translate", C: "Amazon Transcribe", D: "Amazon Lex" },
    answer: "C",
    explanation: "Amazon Transcribe is an automatic speech recognition (ASR) service that converts audio into text. It supports speaker identification and custom vocabulary. A — Polly converts text to lifelike speech (TTS), which is the opposite function. B — Translate converts text between languages; it does not process audio. D — Lex builds conversational interfaces; it includes speech recognition as part of a chatbot but is not designed for batch transcription of recorded calls.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A media company wants to add a narration feature that converts written article text into spoken audio in multiple languages. Which AWS service provides high-quality text-to-speech conversion?",
    difficulty: "Foundational",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "Amazon Transcribe", B: "Amazon Polly", C: "Amazon Lex", D: "Amazon Kendra" },
    answer: "B",
    explanation: "Amazon Polly is a text-to-speech (TTS) service that converts text into lifelike speech using deep learning in multiple languages and voices. A — Transcribe is speech-to-text (the reverse function). C — Lex builds conversational chatbots and includes speech input; it is not a TTS service. D — Kendra is an enterprise search service powered by ML, not TTS.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company is evaluating AWS AI services for their customer experience platform. Which TWO services are correctly matched to their primary function? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "Amazon Translate — converts text from one language to another", B: "Amazon Rekognition — converts speech audio files into text transcripts", C: "Amazon Comprehend — analyzes text to detect sentiment and key phrases", D: "Amazon Polly — detects objects and faces in images and videos", E: "Amazon Transcribe — translates documents between languages in real time" },
    answer: ["A", "C"],
    explanation: "A is correct: Amazon Translate is a neural machine translation service that converts text between supported languages. C is correct: Amazon Comprehend performs NLP to detect entities, key phrases, sentiment, and language in text. B is incorrect: Rekognition analyzes images and videos (not speech-to-text; that is Transcribe). D is incorrect: Polly converts text to speech (TTS), not image/video analysis (that is Rekognition). E is incorrect: Transcribe converts speech to text (not document translation; that is Translate).",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company needs to ingest and process millions of IoT sensor events per second in real time for anomaly detection. Which AWS service is designed for high-throughput real-time data streaming?",
    difficulty: "Hard",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "Amazon SQS", B: "Amazon Kinesis Data Streams", C: "AWS Glue", D: "Amazon Athena" },
    answer: "B",
    explanation: "Amazon Kinesis Data Streams is designed for real-time, high-throughput data streaming, capable of ingesting and processing hundreds of thousands of records per second with low latency. A — SQS is a message queue for decoupling services; while it can handle high throughput, it is not optimized for streaming analytics use cases with continuous consumer processing. C — Glue is a batch ETL service, not real-time streaming. D — Athena queries data at rest in S3; it is not suitable for real-time stream processing.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company stores user-facing application logs in Amazon S3. The security team needs to search and analyze these logs immediately after ingestion with full-text search and near-real-time analytics dashboards, without loading data into a warehouse. Which AWS service is MOST suitable?",
    difficulty: "Hard",
    topic: "AI/ML & Analytics Services",
    objective: "3.3",
    options: { A: "Amazon Athena", B: "Amazon OpenSearch Service", C: "Amazon Redshift", D: "AWS Glue" },
    answer: "B",
    explanation: "Amazon OpenSearch Service (formerly Amazon Elasticsearch Service) provides full-text search, near-real-time log analytics, and Kibana-based dashboards, making it ideal for log search and analysis. A — Athena queries data in S3 with SQL but is not optimized for full-text search or near-real-time log dashboards. C — Redshift is an OLAP warehouse with higher query latency for ad-hoc log searches. D — Glue is an ETL service, not a search/analytics platform.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An e-commerce site notices that reading product inventory from the primary RDS database is causing high load during flash sales. Which cost-effective solution reduces read load on the primary database without changing the application architecture significantly?",
    difficulty: "Exam Level",
    topic: "Relational Databases (RDS/Aurora)",
    objective: "3.4",
    options: { A: "Create an RDS Read Replica and point read queries to it", B: "Enable Multi-AZ on the primary RDS instance", C: "Migrate the inventory table to Amazon Redshift", D: "Enable automatic backups on the RDS instance" },
    answer: "A",
    explanation: "RDS Read Replicas accept read traffic, offloading SELECT queries from the primary instance and reducing its load. The application points read queries to the replica's endpoint. B — Multi-AZ creates a standby for failover, not for serving read traffic. C — Redshift is an OLAP warehouse; routing OLTP reads there would require significant architecture changes. D — Automatic backups protect data but do not reduce read load.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A solutions architect is comparing AWS compute services for application hosting. Which TWO statements correctly distinguish Amazon Lightsail from AWS Elastic Beanstalk? (Select TWO.)",
    difficulty: "Hard",
    topic: "Elastic Beanstalk & Lightsail",
    objective: "3.3",
    options: { A: "Lightsail offers predictable flat-rate pricing targeted at simple websites and non-technical users; Elastic Beanstalk uses variable AWS resource pricing", B: "Elastic Beanstalk automatically handles capacity provisioning, load balancing, and scaling for application code; Lightsail requires manual scaling configuration", C: "Lightsail is designed for enterprise microservices with auto-scaling and custom VPC networking", D: "Elastic Beanstalk is a physical appliance deployed on-premises; Lightsail is a cloud-only service", E: "Both Lightsail and Elastic Beanstalk require the user to manage the underlying operating system patches" },
    answer: ["A", "B"],
    explanation: "A is correct: Lightsail provides simple, flat-rate monthly pricing suitable for small websites, blogs, and non-technical users who want predictable costs. B is correct: Elastic Beanstalk is a PaaS that automatically manages capacity, load balancing, and auto-scaling when developers deploy application code — Lightsail requires the user to manually resize instances for scaling. C is incorrect: Lightsail is designed for simple, low-traffic applications, not enterprise microservices. D is incorrect: Elastic Beanstalk is a cloud-managed PaaS on AWS, not a physical appliance. E is incorrect: Elastic Beanstalk manages OS patches automatically; Lightsail gives users root access and requires them to manage patching.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A startup runs a web application with unpredictable traffic spikes. The team wants the lowest possible hourly rate for EC2 instances when traffic is high but cannot tolerate any interruptions. Which pricing model best fits this requirement?",
    difficulty: "Exam Level",
    topic: "EC2 Pricing Models",
    objective: "4.1",
    options: { A: "Spot Instances", B: "On-Demand Instances", C: "Convertible Reserved Instances", D: "Dedicated Hosts" },
    answer: "B",
    explanation: "On-Demand Instances provide pay-per-use pricing with no interruptions, making them suitable for unpredictable workloads where uptime is critical. Spot Instances (A) offer up to 90% savings but can be interrupted with a 2-minute warning, which violates the no-interruption requirement. Convertible Reserved Instances (C) require a 1- or 3-year commitment, which is unsuitable for unpredictable usage patterns. Dedicated Hosts (D) are physical servers for compliance/BYOL scenarios and are the most expensive option.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A data analytics company runs large-scale batch processing jobs that are fault-tolerant and can be restarted if interrupted. The jobs run for several hours at a time. Which EC2 pricing option provides the GREATEST cost savings for these workloads?",
    difficulty: "Exam Level",
    topic: "EC2 Pricing Models",
    objective: "4.1",
    options: { A: "On-Demand Instances", B: "Standard Reserved Instances with All Upfront payment", C: "Spot Instances", D: "Compute Savings Plans" },
    answer: "C",
    explanation: "Spot Instances offer up to 90% discount compared to On-Demand pricing and are ideal for fault-tolerant, interruptible batch workloads that can be restarted. On-Demand (A) is the most expensive pay-as-you-go option. Standard Reserved Instances with All Upfront (B) provide up to ~72% savings on steady-state workloads but require a 1- or 3-year commitment; they do not offer higher discounts than Spot for batch jobs. Compute Savings Plans (D) provide flexibility but only up to ~66% savings — less than Spot.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to commit to a consistent amount of compute spend (measured in $/hour) over 3 years. They anticipate changing instance families, sizes, and AWS Regions as their architecture evolves. Which pricing option provides the LARGEST discount while preserving that flexibility?",
    difficulty: "Hard",
    topic: "EC2 Pricing Models",
    objective: "4.1",
    options: { A: "EC2 Instance Savings Plans", B: "Standard Reserved Instances", C: "Compute Savings Plans", D: "Convertible Reserved Instances" },
    answer: "C",
    explanation: "Compute Savings Plans commit to a $/hour spend and apply automatically across EC2 instance families, sizes, Regions, OS types, and even AWS Fargate and Lambda — providing the most flexibility among commitment-based options with up to ~66% savings. EC2 Instance Savings Plans (A) lock the instance family and Region for a bigger discount than Compute SPs but less flexibility. Standard Reserved Instances (B) provide the largest absolute discount (up to ~72%) but lock instance type, Region, OS, and tenancy — no flexibility. Convertible Reserved Instances (D) allow attribute changes but still require a 1/3-year RI commitment to a specific Region and offer lower discounts than Standard RIs.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A financial services company must host its trading application on hardware that no other AWS customer shares, due to strict regulatory requirements. The company also wants to use its existing per-socket server software licenses. Which EC2 option should the company choose?",
    difficulty: "Exam Level",
    topic: "EC2 Pricing Models",
    objective: "4.1",
    options: { A: "Dedicated Instances", B: "Dedicated Hosts", C: "Standard Reserved Instances", D: "On-Demand Instances in a VPC" },
    answer: "B",
    explanation: "Dedicated Hosts provide a physical server dedicated to a single customer, giving visibility into physical cores and sockets required for Bring Your Own License (BYOL) scenarios. Dedicated Instances (A) also run on single-tenant hardware but do not expose socket/core counts, so per-socket licenses cannot be applied. Standard Reserved Instances (C) provide a billing discount but do not guarantee dedicated hardware by default. On-Demand Instances in a VPC (D) run on shared hardware and do not address BYOL or compliance requirements.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which combination achieves the MAXIMUM possible discount on EC2 instance usage compared to On-Demand pricing?",
    difficulty: "Hard",
    topic: "EC2 Pricing Models",
    objective: "4.1",
    options: { A: "Compute Savings Plans with a 1-year term", B: "Convertible Reserved Instances with a 3-year term and Partial Upfront payment", C: "Standard Reserved Instances with a 3-year term and All Upfront payment", D: "EC2 Instance Savings Plans with a 3-year term and No Upfront payment" },
    answer: "C",
    explanation: "Standard Reserved Instances with a 3-year term and All Upfront payment provide the highest possible discount — up to approximately 72% off On-Demand rates. The three levers that increase discount are: Standard (not Convertible) RI type, 3-year (not 1-year) term, and All Upfront (not Partial or No Upfront) payment. Compute Savings Plans with 1-year (A) offer ~66% max and a shorter term yields less discount. Convertible RIs with Partial Upfront (B) offer a smaller discount than Standard RIs and less than All Upfront. EC2 Instance Savings Plans with No Upfront (D) provide flexibility but No Upfront yields the lowest savings within Savings Plans.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A company is evaluating EC2 pricing options for a new environment. Which TWO statements about Spot Instances are accurate? (Select TWO.)",
    difficulty: "Exam Level",
    topic: "EC2 Pricing Models",
    objective: "4.1",
    options: { A: "Spot Instances can be interrupted by AWS with a 2-minute notification when AWS needs the capacity back.", B: "Spot Instances are best suited for stateful databases that require continuous availability.", C: "Spot Instances can provide discounts of up to 90% compared to On-Demand pricing.", D: "Spot Instances require a minimum 1-year commitment to receive the discounted rate.", E: "Spot Instances automatically launch in a Dedicated Host tenancy." },
    answer: ["A", "C"],
    explanation: "A is correct: AWS can reclaim Spot capacity with a 2-minute interruption notice, making Spot suitable only for fault-tolerant workloads. C is correct: Spot Instances offer up to 90% savings vs On-Demand, the largest discount of any EC2 pricing model. B is wrong: Spot Instances are unsuitable for stateful databases due to interruption risk. D is wrong: Spot Instances have no term commitment; pricing fluctuates with supply/demand. E is wrong: Spot Instances run on shared tenancy hardware, not Dedicated Hosts.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A developer at a startup wants to estimate the monthly AWS bill for a new three-tier web application before any resources are deployed. Which AWS tool should the developer use?",
    difficulty: "Foundational",
    topic: "AWS Free Tier & Pricing Calculator",
    objective: "4.1",
    options: { A: "AWS Cost Explorer", B: "AWS Pricing Calculator", C: "AWS Budgets", D: "AWS Cost and Usage Report" },
    answer: "B",
    explanation: "AWS Pricing Calculator is designed to model and estimate AWS costs before deploying resources. It lets users configure services and see estimated monthly costs. AWS Cost Explorer (A) visualizes and analyzes historical and current spending — it cannot estimate costs for resources that do not yet exist. AWS Budgets (C) sets spending alerts and thresholds on active AWS usage, not pre-deployment estimates. AWS Cost and Usage Report (D) provides detailed billing data for already-incurred costs.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A new AWS account holder wants to experiment with Amazon S3 and Amazon EC2 at no cost. Which AWS Free Tier offering type provides 5 GB of Amazon S3 Standard Storage for 12 months at no charge?",
    difficulty: "Foundational",
    topic: "AWS Free Tier & Pricing Calculator",
    objective: "4.1",
    options: { A: "Always Free", B: "12-Month Free Tier", C: "Free Trial", D: "Spot Free Tier" },
    answer: "B",
    explanation: "The 12-Month Free Tier provides certain service allowances (such as 5 GB S3 Standard Storage and 750 hours/month of EC2 t2.micro/t3.micro) free for the first 12 months after account creation. Always Free (A) offers services that are free indefinitely regardless of account age, such as AWS Lambda (1 million free requests/month). Free Trial (C) covers short-term trials of specific services (e.g., Amazon SageMaker). Spot Free Tier (D) does not exist as an AWS Free Tier category.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company manages 15 separate AWS accounts for different departments. Finance wants a single monthly invoice and the ability to benefit from volume pricing discounts across all accounts. Which AWS feature should the company implement?",
    difficulty: "Exam Level",
    topic: "Consolidated Billing & Budgets",
    objective: "4.2",
    options: { A: "AWS Cost Allocation Tags on every account", B: "Consolidated Billing through AWS Organizations", C: "AWS Budgets with cross-account sharing", D: "AWS Cost and Usage Report delivered to a central S3 bucket" },
    answer: "B",
    explanation: "Consolidated Billing through AWS Organizations combines all member accounts under a management account to receive a single invoice. It also pools usage across accounts, allowing the organization to reach higher-volume tiers for services like Amazon S3 and AWS Data Transfer, thus reducing per-unit costs. Cost Allocation Tags (A) help categorize costs but do not consolidate billing or provide volume discounts. AWS Budgets (C) sets spending alerts but does not consolidate invoices or pool volume discounts. The Cost and Usage Report (D) provides detailed data delivery to S3 but is a reporting tool, not a billing consolidation mechanism.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A cloud architect notices an unexpected increase in AWS spending and wants to visualize cost trends over the past six months, broken down by AWS service. Which tool provides this capability?",
    difficulty: "Foundational",
    topic: "Cost Explorer & Cost Allocation Tags",
    objective: "4.2",
    options: { A: "AWS Budgets", B: "AWS Pricing Calculator", C: "AWS Cost Explorer", D: "AWS Trusted Advisor" },
    answer: "C",
    explanation: "AWS Cost Explorer provides interactive charts and graphs for visualizing historical and current AWS spending, filterable and groupable by service, account, tag, Region, and other dimensions. AWS Budgets (A) sends proactive alerts when spending approaches or exceeds defined thresholds — it does not visualize historical trends. AWS Pricing Calculator (B) estimates future costs for new architectures. AWS Trusted Advisor (D) provides recommendations across cost optimization, security, performance, fault tolerance, and service limits, but does not visualize spend trends over time.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A DevOps team wants to receive an email alert when their monthly AWS bill is projected to exceed $500. Which AWS service should they configure?",
    difficulty: "Foundational",
    topic: "Consolidated Billing & Budgets",
    objective: "4.2",
    options: { A: "AWS Cost Explorer with a custom report", B: "AWS Budgets with a cost budget and alert threshold", C: "Amazon CloudWatch billing alarm with an SNS topic", D: "AWS Cost and Usage Report with an S3 event notification" },
    answer: "B",
    explanation: "AWS Budgets allows users to define cost, usage, reservation, or Savings Plans budgets and configure alerts via email or SNS when actual or forecasted spend crosses a defined threshold. It directly supports the described scenario. AWS Cost Explorer (A) visualizes historical data but cannot send proactive spend alerts. Amazon CloudWatch billing alarms (C) can also trigger alerts on estimated charges, but AWS Budgets is the primary purpose-built tool for this and is explicitly covered in the CLF-C02 blueprint. AWS Cost and Usage Report with S3 event notifications (D) delivers raw billing data and is not designed for threshold-based alerting.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company uses AWS Organizations with 20 member accounts. Consolidated Billing is enabled. How does pooled usage benefit the organization regarding Amazon S3 data storage costs?",
    difficulty: "Exam Level",
    topic: "Consolidated Billing & Budgets",
    objective: "4.2",
    options: { A: "Each account receives a separate Free Tier allowance, doubling total free storage.", B: "Total S3 usage across all accounts is combined, enabling the organization to reach lower per-GB pricing tiers sooner.", C: "All accounts share a single S3 bucket, reducing storage overhead.", D: "AWS automatically converts S3 Standard objects to S3 Glacier to reduce costs." },
    answer: "B",
    explanation: "With Consolidated Billing, AWS aggregates usage across all member accounts when calculating volume-based pricing tiers. For S3, storage pricing decreases at higher usage thresholds (e.g., first 50 TB, next 450 TB). Pooling usage lets the organization reach those lower tiers faster than any single account could alone. A is a distractor: while each member account does receive its own independent Free Tier allowance, that per-account Free Tier benefit is separate from the question's topic of volume pricing discounts — and the option's claim about 'doubling total free storage' misframes this as the mechanism for reducing S3 data storage costs, which it is not. C is wrong: Consolidated Billing does not merge S3 buckets or data; accounts remain separate. D is wrong: AWS does not automatically move objects to Glacier; lifecycle policies must be configured explicitly.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company wants to categorize AWS costs by project and cost center to allocate charges back to individual business units. Which feature enables this?",
    difficulty: "Exam Level",
    topic: "Cost Explorer & Cost Allocation Tags",
    objective: "4.2",
    options: { A: "AWS Service Control Policies (SCPs)", B: "AWS Config rules", C: "Cost Allocation Tags activated in the Billing console", D: "AWS Organizations account grouping" },
    answer: "C",
    explanation: "Cost Allocation Tags allow organizations to label AWS resources (e.g., Project=Alpha, CostCenter=Finance). Once tags are activated in the AWS Billing and Cost Management console, they appear as filterable dimensions in Cost Explorer and the Cost and Usage Report, enabling chargeback and showback to business units. Service Control Policies (A) set permission guardrails in AWS Organizations — they do not categorize costs. AWS Config rules (B) evaluate resource compliance against configurations and are unrelated to cost allocation. AWS Organizations account grouping (D) can organize accounts by OU but does not generate per-project cost breakdowns without tagging.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company with the AWS Basic Support plan wants to know which AWS Support features are included at no additional cost. Which of the following is available under the Basic Support plan?",
    difficulty: "Foundational",
    topic: "AWS Support Plans",
    objective: "4.3",
    options: { A: "24/7 phone and chat access to cloud support engineers", B: "Access to the AWS Personal Health Dashboard and 7 core Trusted Advisor checks", C: "A designated Technical Account Manager (TAM)", D: "Full access to all AWS Trusted Advisor checks" },
    answer: "B",
    explanation: "The AWS Basic Support plan (free for all accounts) includes access to documentation, whitepapers, AWS re:Post community forums, AWS Personal Health Dashboard, and 7 core Trusted Advisor checks covering foundational security and service limits. 24/7 phone and chat access (A) is available at the Business support tier and above. A designated TAM (C) is exclusive to the Enterprise support plan. Full Trusted Advisor access (D) is available starting at the Business support plan.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A mid-sized company experiences a production EC2 instance failure that is causing complete application downtime. Their AWS Business Support plan is active. What is the maximum response time AWS guarantees for this production-down case?",
    difficulty: "Exam Level",
    topic: "AWS Support Plans",
    objective: "4.3",
    options: { A: "Less than 15 minutes", B: "Less than 30 minutes", C: "Less than 1 hour", D: "Less than 4 hours" },
    answer: "C",
    explanation: "AWS Business Support guarantees a response time of less than 1 hour for production system down (business-critical system impaired/down) cases. Less than 15 minutes (A) is the response SLA for the Enterprise support plan for business-critical system down cases. Less than 30 minutes (B) is the response SLA for the Enterprise On-Ramp support plan for business-critical system down. Less than 4 hours (D) is the Business Support SLA for production system impaired cases (not down).",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A large enterprise requires a dedicated, named Technical Account Manager (TAM) who proactively monitors their environment and assists with architectural guidance. Which AWS Support plan provides a DESIGNATED TAM?",
    difficulty: "Exam Level",
    topic: "AWS Support Plans",
    objective: "4.3",
    options: { A: "AWS Developer Support", B: "AWS Business Support", C: "AWS Enterprise On-Ramp Support", D: "AWS Enterprise Support" },
    answer: "D",
    explanation: "Only the AWS Enterprise Support plan provides a designated (named) Technical Account Manager who serves as a primary technical point of contact and proactively engages with the customer. AWS Developer Support (A) provides business-hours email support with no TAM. AWS Business Support (B) includes full Trusted Advisor and 24/7 support but no TAM. AWS Enterprise On-Ramp Support (C) provides access to a POOL of TAMs (not a designated individual) along with Concierge support and a <30-minute response for business-critical cases.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company is choosing between the Enterprise On-Ramp and Enterprise AWS Support plans. Which feature is available ONLY in the Enterprise plan and NOT in the Enterprise On-Ramp plan?",
    difficulty: "Hard",
    topic: "AWS Support Plans",
    objective: "4.3",
    options: { A: "Access to AWS Concierge Support team", B: "A designated (named) Technical Account Manager", C: "24/7 phone, email, and chat access to support engineers", D: "Full access to all AWS Trusted Advisor checks" },
    answer: "B",
    explanation: "A designated (named) TAM is exclusive to the AWS Enterprise Support plan. The Enterprise On-Ramp plan provides access to a pool of TAMs rather than assigning one specific individual. AWS Concierge Support (A) is available in both Enterprise On-Ramp and Enterprise plans. 24/7 phone, email, and chat access (C) is available starting at the Business plan and is included in both Enterprise On-Ramp and Enterprise. Full Trusted Advisor access (D) is available starting at the Business plan and is included in all four paid plans.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company needs 24/7 access to AWS Cloud support engineers by phone, chat, and email. What is the MINIMUM AWS Support plan that provides this capability?",
    difficulty: "Exam Level",
    topic: "AWS Support Plans",
    objective: "4.3",
    options: { A: "AWS Basic Support", B: "AWS Developer Support", C: "AWS Business Support", D: "AWS Enterprise On-Ramp Support" },
    answer: "C",
    explanation: "AWS Business Support is the minimum tier that provides 24/7 phone, chat, and email access to AWS Cloud support engineers. AWS Basic Support (A) includes only documentation, whitepapers, and the AWS re:Post community forum — no direct engineer access. AWS Developer Support (B) provides business-hours email access only (no 24/7 coverage, no phone or chat). AWS Enterprise On-Ramp Support (D) also includes 24/7 access, but it is not the minimum — Business Support is the first plan where this capability becomes available.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "Which AWS Support plan is the MINIMUM tier that provides access to the full set of AWS Trusted Advisor checks, including all cost optimization and performance recommendations?",
    difficulty: "Exam Level",
    topic: "AWS Support Plans",
    objective: "4.3",
    options: { A: "Basic", B: "Developer", C: "Business", D: "Enterprise On-Ramp" },
    answer: "C",
    explanation: "The AWS Business Support plan is the minimum tier that unlocks the full suite of AWS Trusted Advisor checks across all five categories: cost optimization, performance, security, fault tolerance, and service limits. Basic (A) and Developer (B) plans provide only 7 core Trusted Advisor checks, covering foundational security and service limit items. Enterprise On-Ramp (D) also includes full Trusted Advisor access, but it is not the minimum — Business is.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "An AWS architect wants to identify EC2 instances that are over-provisioned and receive specific right-sizing recommendations to reduce costs. Which AWS service provides machine-learning-based right-sizing recommendations for EC2?",
    difficulty: "Exam Level",
    topic: "AWS Trusted Advisor & Compute Optimizer",
    objective: "4.3",
    options: { A: "AWS Trusted Advisor", B: "AWS Compute Optimizer", C: "AWS Cost Explorer", D: "AWS Systems Manager" },
    answer: "B",
    explanation: "AWS Compute Optimizer uses machine learning to analyze CloudWatch utilization metrics and recommends optimal EC2 instance types, Auto Scaling group configurations, EBS volume types, and Lambda function memory settings for right-sizing. AWS Trusted Advisor (A) provides cost optimization checks (e.g., idle EC2 instances, underutilized RIs) but does not use ML-based analysis to recommend specific replacement instance types. AWS Cost Explorer (C) can show Reserved Instance utilization and coverage but does not provide per-instance right-sizing recommendations. AWS Systems Manager (D) is an operations management platform unrelated to right-sizing recommendations.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "multi-select",
    question: "A cloud operations team wants to use AWS Trusted Advisor to improve their environment. Which THREE categories of checks does AWS Trusted Advisor provide? (Select THREE.)",
    difficulty: "Foundational",
    topic: "AWS Trusted Advisor & Compute Optimizer",
    objective: "4.3",
    options: { A: "Cost Optimization", B: "Incident Response Playbooks", C: "Security", D: "Fault Tolerance", E: "Penetration Testing Approvals" },
    answer: ["A", "C", "D"],
    explanation: "AWS Trusted Advisor provides checks across five categories: Cost Optimization (A), Performance, Security (C), Fault Tolerance (D), and Service Limits. Incident Response Playbooks (B) are not a Trusted Advisor category; those are managed through AWS Systems Manager Incident Manager or custom runbooks. Penetration Testing Approvals (E) are handled through the AWS Penetration Testing policy, not Trusted Advisor.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A developer needs to find answers to common AWS technical questions and wants to search a community-driven knowledge base maintained and moderated by AWS. Which resource should the developer use?",
    difficulty: "Foundational",
    topic: "Technical Support Resources",
    objective: "4.3",
    options: { A: "AWS Personal Health Dashboard", B: "AWS re:Post", C: "AWS Knowledge Center", D: "AWS Support Center" },
    answer: "B",
    explanation: "AWS re:Post is a community Q&A platform where developers can ask and answer technical questions about AWS services, moderated and supported by AWS subject matter experts. It replaces the original AWS Forums. AWS Personal Health Dashboard (A) provides personalized notifications about AWS service events that may affect the customer's specific resources. AWS Knowledge Center (C) is a curated library of frequently asked questions and answers written by AWS, not a community discussion platform. AWS Support Center (D) is where customers submit and manage support cases — it is not a community forum.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A company receives an alert that an EC2 instance in us-east-1 may be affected by a degraded hardware host. Where can a cloud administrator find personalized, account-specific information about this event and its impact on their resources?",
    difficulty: "Exam Level",
    topic: "Technical Support Resources",
    objective: "4.3",
    options: { A: "AWS Service Health Dashboard (status.aws.amazon.com)", B: "AWS re:Post community forum", C: "AWS Personal Health Dashboard (AWS Health)", D: "Amazon CloudWatch Service Quotas console" },
    answer: "C",
    explanation: "AWS Personal Health Dashboard (now called AWS Health) provides personalized, account-specific information about AWS events and planned maintenance that may affect specific resources in the customer's account. It is the right tool for knowing which of YOUR resources are impacted. The AWS Service Health Dashboard (A) shows general, public-facing AWS service health status for all customers, not account-specific impact. AWS re:Post (B) is a community Q&A forum with no account-specific event data. Amazon CloudWatch Service Quotas (D) tracks service limit utilization and is unrelated to hardware health events.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  },

  {
    type: "mcq",
    question: "A DevOps team wants to programmatically manage AWS Support cases and retrieve AWS Trusted Advisor check results without logging into the console. What is the MINIMUM AWS Support plan that provides access to the AWS Support API?",
    difficulty: "Hard",
    topic: "AWS Support Plans",
    objective: "4.3",
    options: { A: "AWS Basic Support", B: "AWS Developer Support", C: "AWS Business Support", D: "AWS Enterprise On-Ramp Support" },
    answer: "C",
    explanation: "The AWS Support API, which allows programmatic management of support cases and retrieval of Trusted Advisor check results, is available starting at the AWS Business Support plan. Basic Support (A) and Developer Support (B) do not include Support API access; customers on these plans must use the AWS Support Center console to manage cases. Enterprise On-Ramp (D) also provides Support API access, but it is not the minimum tier — Business Support is where this capability first becomes available.",
    source: "Original — public AWS CLF-C02 Exam Guide + AWS documentation",
    addedVersion: "7.8.0",
    addedDate: "2026-05-29"
  }
  ]
};
