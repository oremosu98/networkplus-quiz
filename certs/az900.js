// ══════════════════════════════════════════════════════════════════════════
// Microsoft AZ-900 Azure Fundamentals cert pack (v7.3.0 — content authoring)
// ══════════════════════════════════════════════════════════════════════════
// Loaded into window.CERT_PACKS.az900 at app boot. Active when:
//   1. URL host matches 'azure.certanvil.com' (or 'azure.' / 'azure-' prefix
//      for Vercel preview branches) — the v7.1.0 Pattern A subdomain pattern
//      established for Sec+ on secplus.certanvil.com
//   2. localStorage 'nplus_dev_cert' === 'az900' (dev override)
//   3. URL query '?cert=az900' (one-shot entry-point handoff)
// Otherwise inert (loaded only when index.html inline IIFE document.writes
// <script src="certs/az900.js"> after Pattern A resolves the host).
//
// Status (v7.3.0):
//   ✓ Cert metadata (name, code, exam pass mark 700/1000, 50-Q / 60-min)
//   ✓ Domain weights (Microsoft "Skills Measured" effective 2026-01-14)
//   ✓ Domain labels (3 domains)
//   ✓ Topic catalog (41 topics across 3 domains)
//   ✓ Topic resources (Microsoft Learn module objective numbers + titles)
//   ✓ retentionGapConcepts (6 seed entries from the AZ-900 study guide; the
//     array stays open-ended, additive forever via Phase 3 cycles)
//   ☐ GT tables — Azure doesn't have a comparable enumerable-facts surface
//     to GT_PORTS / GT_OSI yet. Defer until a pattern emerges (RBAC built-in
//     roles? Region-pair table? Storage redundancy variants?). Empty object
//     means consumers fall back to defaults (gt-less calls are a no-op).
//   ☐ questionExemplars — populated in Stage 6 (Phase 3 of v7.3.0 ship):
//     200 hand-curated exemplars across 30-36 clusters. Empty array = the
//     exemplar-injection step in fetchQuestions is a no-op; Haiku falls
//     back to blueprint + prompt quality alone.
//
// AUDIENCE (v7.1.0 Pattern A, locked 2026-05-26): public Pro-tier surface
// on https://azure.certanvil.com. Visible to all signed-in users in the
// cert switcher with a "PRO" badge; switching INTO az900 requires Pro tier
// via tadSwitchCert's _gateProOnly('Azure Fundamentals (AZ-900)') call.
// Anon visitors on the landing diagnostic at certanvil.com/diagnostic/
// azure-fundamentals/ funnel into the Pro upgrade modal.
//
// LEGAL (non-negotiable, locked in plan §10): every entry below originates
// from the PUBLIC Microsoft AZ-900 Skills Measured doc + PUBLIC Microsoft
// Learn modules ONLY. ZERO ingestion of paid-bank content — no MeasureUp,
// Whizlabs, paid Pluralsight, paid LinkedIn Learning, O'Reilly, Udemy, or
// commercial practice-exam vendors. Same discipline that built the Net+
// pack to a 767/900 pass and the Sec+ pack to a public Pro launch. The
// Jason Dion Method applies for any future paid AZ-900 practice test the
// founder takes: share gap topics in OWN WORDS only → Claude authors new
// exemplars per gap → original content informed by gap, never reproductions.

window.CERT_PACKS = window.CERT_PACKS || {};
window.CERT_PACKS.az900 = {
  meta: {
    id: 'az900',
    name: 'Microsoft Azure Fundamentals',
    code: 'AZ-900',
    blueprintUrl: 'https://learn.microsoft.com/credentials/certifications/azure-fundamentals/',
    examPassScore: 700,         // AZ-900 official pass: 700/1000 (scaled)
    examMaxScore: 1000,         // scaled-score ceiling (different from CompTIA's 100-900 range)
    examQuestionCount: 50,      // Microsoft official: 40-60 Q; 50 = sane middle (CertAnvil exam-simulator length)
    examTimeSeconds: 3600,      // 60-minute timer (Microsoft official)
  },

  // ── PRIORITY RETENTION CONCEPTS (v7.3.0 seed, additive forever) ───────
  // Six concepts seeded from the AZ-900 Official Course Study Guide v2.0
  // (Scott Duffy / Sean Xie, mapped against the public Microsoft Skills
  // Measured blueprint effective 2026-01-14). Injected as a soft tiebreaker
  // into every question-generation prompt — same mechanism as Net+ and
  // Sec+ retentionGapConcepts. Non-invasive: a preference, not a mandate.
  // The array stays open-ended; the founder will append new concepts via
  // Phase 3 cycles after each AZ-900 practice test gap (Sec+ pack pattern,
  // currently at 18 entries across 6 cycles).
  retentionGapConcepts: [
    { label: 'IaaS vs PaaS vs SaaS Shared Responsibility', parentTopic: 'Shared Responsibility Model', objective: '1.1', keyword: 'IaaS = customer patches OS + manages app + data (Azure manages physical host, hypervisor, network). PaaS = Microsoft patches OS + manages runtime (customer manages app code + data). SaaS = Microsoft manages everything below the application UI (customer manages identities + data). The split is the most common AZ-900 exam trap — questions name a maintenance task and ask who owns it under each model.' },
    { label: 'Region Pair vs Availability Zone Scope',     parentTopic: 'Azure Regions & Region Pairs',  objective: '2.1', keyword: 'REGION PAIR = two regions ~hundreds of miles apart (geographic redundancy) that Azure platform updates roll out to one-at-a-time so both never go down at once. AVAILABILITY ZONE = one of 3+ physically separate datacenter clusters WITHIN a single region (datacenter redundancy). Same-region failover uses AZs; cross-region disaster recovery uses region pairs. Distinct geographic scope — confusing them is a common AZ-900 trap.' },
    { label: 'Subscription vs Resource Group vs Management Group Hierarchy', parentTopic: 'Resource Groups & Subscriptions', objective: '2.1', keyword: 'Top-down: MANAGEMENT GROUP (hierarchy of subscriptions, inherits policy + RBAC down) → SUBSCRIPTION (billing boundary, one owner) → RESOURCE GROUP (folder for related resources, lifecycle boundary). Resources go in resource groups, resource groups go in subscriptions, subscriptions go in management groups. Policy + RBAC inherit DOWN; billing rolls UP. Memorize the directional inheritance.' },
    { label: 'CapEx vs OpEx (Consumption-Based Pricing)',  parentTopic: 'Consumption-Based Pricing',      objective: '1.1', keyword: 'CapEx (Capital Expenditure) = large upfront purchase of an asset (datacenter, server hardware), depreciated over years for tax. OpEx (Operating Expenditure) = ongoing monthly cost deducted immediately. Cloud consumption = OpEx (pay-as-you-go, no upfront commitment). The shift from CapEx to OpEx is the financial pillar of cloud value proposition. AZ-900 frames this as "why cloud" in §1.' },
    { label: 'Public vs Private vs Hybrid Cloud Scenarios', parentTopic: 'Cloud Deployment Models',       objective: '1.1', keyword: 'PUBLIC = Microsoft owns the hardware on their network (Azure, AWS, GCP). PRIVATE = customer owns or has exclusive use of the hardware (often called "internal cloud"). HYBRID = mix of private + public, typically using public for elastic growth + private for sensitive workloads. Distinguishing question: who owns the hardware + who has access. AZ-900 tests scenario fit — pick public for cost-elastic, private for sovereignty, hybrid for migration paths.' },
    { label: 'Entra ID vs RBAC vs Conditional Access',     parentTopic: 'Microsoft Entra ID & Authentication', objective: '2.4', keyword: 'ENTRA ID (formerly Azure AD) = the IDENTITY directory (who the user is — users, groups, applications). RBAC (Role-Based Access Control) = the AUTHORIZATION model (what permissions a user holds via role assignments). CONDITIONAL ACCESS = the POLICY ENGINE that decides whether to allow/block/MFA-challenge a sign-in based on signals (device state, location, risk, app). Memorize the layer split: Entra IDENTIFIES, RBAC AUTHORIZES, Conditional Access GATES the session.' }
  ],

  // ── DOMAIN WEIGHTS (Microsoft "Skills Measured" AZ-900 blueprint) ─────
  // Sums to 0.975 — exact midpoints of the official MS percentage ranges
  // (25-30% / 35-40% / 30-35%). Same approximation Net+ uses with
  // 23+20+19+14+24=100. The remaining 0.025 is statistical slack; the
  // domain-weighted readiness math handles small sum deviations cleanly.
  domainWeights: {
    'cloud-concepts':     0.275, // Domain 1 — Cloud Concepts (25-30%)
    'azure-architecture': 0.375, // Domain 2 — Azure Architecture & Services (35-40%, largest)
    'azure-management':   0.325  // Domain 3 — Azure Management & Governance (30-35%)
  },

  domainLabels: {
    'cloud-concepts':     'Cloud Concepts',
    'azure-architecture': 'Azure Architecture & Services',
    'azure-management':   'Azure Management & Governance'
  },

  // ── TOPIC → DOMAIN MAP (41 topics across 3 AZ-900 domains) ────────────
  // Drives weak-spot routing, exemplar bank picker, lottery, readiness
  // domain attribution. Topic name = primary key everywhere; domain key
  // is one of: cloud-concepts / azure-architecture / azure-management.
  topicDomains: {
    // ── Domain 1 — Cloud Concepts (25-30%, 10 topics) ───────────────────
    'Cloud Computing Basics':                'cloud-concepts', // 1.1 — definition, rent vs own
    'Shared Responsibility Model':           'cloud-concepts', // 1.1 — IaaS/PaaS/SaaS responsibility split
    'Cloud Deployment Models':               'cloud-concepts', // 1.1 — public, private, hybrid
    'Cloud Service Models':                  'cloud-concepts', // 1.3 — IaaS, PaaS, SaaS scenarios
    'Consumption-Based Pricing':             'cloud-concepts', // 1.1 — CapEx vs OpEx, pay-as-you-go
    'Serverless Computing':                  'cloud-concepts', // 1.3 — Functions, Logic Apps, abstraction layer
    'High Availability & Reliability':       'cloud-concepts', // 1.2 — uptime %, redundancy, DR
    'Scalability':                           'cloud-concepts', // 1.2 — vertical vs horizontal, elasticity
    'Cloud Security & Governance':           'cloud-concepts', // 1.2 — defense-in-depth at the platform layer
    'Manageability':                         'cloud-concepts', // 1.2 — agility, portal/CLI/API/PowerShell

    // ── Domain 2 — Azure Architecture & Services (35-40%, 18 topics) ────
    'Azure Regions & Region Pairs':          'azure-architecture', // 2.1 — geographic redundancy
    'Availability Zones':                    'azure-architecture', // 2.1 — within-region datacenter redundancy
    'Resource Groups & Subscriptions':       'azure-architecture', // 2.1 — folder + billing boundaries
    'Management Groups':                     'azure-architecture', // 2.1 — hierarchy of subscriptions
    'Azure Virtual Machines':                'azure-architecture', // 2.2 — IaaS compute, Windows + Linux
    'Containers & AKS':                      'azure-architecture', // 2.2 — ACI quick-start, AKS for production
    'Azure Functions':                       'azure-architecture', // 2.2 — serverless compute
    'Azure App Service':                     'azure-architecture', // 2.2 — PaaS web/mobile/API hosting
    'Azure Virtual Desktop':                 'azure-architecture', // 2.2 — Windows in the cloud (formerly WVD)
    'Virtual Networks & Subnets':            'azure-architecture', // 2.2 — VNet + subnet model
    'VNet Peering & VPN Gateway':            'azure-architecture', // 2.2 — VNet-to-VNet + site-to-site
    'ExpressRoute & DNS':                    'azure-architecture', // 2.2 — private circuit + Azure DNS
    'Azure Storage Accounts':                'azure-architecture', // 2.3 — the storage account container
    'Blob Storage & Files':                  'azure-architecture', // 2.3 — object + SMB/NFS file shares
    'Storage Redundancy & Tiers':            'azure-architecture', // 2.3 — LRS/ZRS/GRS/GZRS + hot/cool/archive
    'Microsoft Entra ID & Authentication':   'azure-architecture', // 2.4 — identity, MFA, SSO, passwordless
    'RBAC & Zero Trust':                     'azure-architecture', // 2.4 — role-based access + ZT model
    'Microsoft Defender for Cloud':          'azure-architecture', // 2.4 — CSPM + cloud workload protection

    // ── Domain 3 — Azure Management & Governance (30-35%, 13 topics) ────
    'Azure Cost Management':                 'azure-management', // 3.1 — cost analysis + budgets + recommendations
    'Pricing Calculator & TCO':              'azure-management', // 3.1 — pre-deploy estimates + on-prem comparison
    'Tags & Resource Organization':          'azure-management', // 3.1 — metadata for billing + governance
    'Microsoft Purview':                     'azure-management', // 3.2 — unified data governance
    'Azure Policy':                          'azure-management', // 3.2 — policy enforcement at scale
    'Resource Locks':                        'azure-management', // 3.2 — accidental-deletion prevention
    'Azure Portal & Cloud Shell':            'azure-management', // 3.3 — web GUI + browser-based CLI
    'Azure CLI & PowerShell':                'azure-management', // 3.3 — command-line management
    'Azure Arc':                             'azure-management', // 3.3 — multi-cloud + hybrid management
    'ARM Templates & IaC':                   'azure-management', // 3.3 — JSON declarative deployment
    'Azure Advisor':                         'azure-management', // 3.4 — personalized best-practice recommendations
    'Azure Service Health':                  'azure-management', // 3.4 — Azure platform health dashboard
    'Azure Monitor & Log Analytics':         'azure-management'  // 3.4 — telemetry + log queries + alerts
  },

  // ── TOPIC RESOURCES (Microsoft Learn module anchors + objectives) ─────
  // Per-topic { obj, title, search } where:
  //   obj   — official Microsoft Skills Measured objective number (1.x/2.x/3.x)
  //   title — display label for the Study button in the wrong-answer panel
  //   search — search anchor for Microsoft Learn modules (legacy field; not
  //            currently read by showTopicDeepDive consumer at app.js, kept
  //            for schema parity with netplus.js + secplus.js and future
  //            value if any consumer ever rewires a search URL builder)
  topicResources: {
    // Domain 1 — Cloud Concepts
    'Cloud Computing Basics':                { obj: '1.1', title: 'Cloud Computing',                      search: 'microsoft+learn+az-900+cloud+computing+definition' },
    'Shared Responsibility Model':           { obj: '1.1', title: 'Shared Responsibility',                search: 'microsoft+learn+az-900+shared+responsibility' },
    'Cloud Deployment Models':               { obj: '1.1', title: 'Public, Private & Hybrid',            search: 'microsoft+learn+az-900+cloud+deployment+models' },
    'Cloud Service Models':                  { obj: '1.3', title: 'IaaS, PaaS & SaaS',                   search: 'microsoft+learn+az-900+cloud+service+types+iaas+paas+saas' },
    'Consumption-Based Pricing':             { obj: '1.1', title: 'Consumption-Based Pricing',           search: 'microsoft+learn+az-900+capex+opex+consumption' },
    'Serverless Computing':                  { obj: '1.3', title: 'Serverless Compute',                  search: 'microsoft+learn+az-900+serverless' },
    'High Availability & Reliability':       { obj: '1.2', title: 'High Availability',                   search: 'microsoft+learn+az-900+high+availability+reliability' },
    'Scalability':                           { obj: '1.2', title: 'Scalability & Elasticity',            search: 'microsoft+learn+az-900+scalability+elasticity' },
    'Cloud Security & Governance':           { obj: '1.2', title: 'Cloud Security',                      search: 'microsoft+learn+az-900+cloud+security+governance' },
    'Manageability':                         { obj: '1.2', title: 'Cloud Manageability',                 search: 'microsoft+learn+az-900+manageability+portal+cli' },

    // Domain 2 — Azure Architecture & Services
    'Azure Regions & Region Pairs':          { obj: '2.1', title: 'Regions & Region Pairs',              search: 'microsoft+learn+az-900+regions+region+pairs' },
    'Availability Zones':                    { obj: '2.1', title: 'Availability Zones',                  search: 'microsoft+learn+az-900+availability+zones' },
    'Resource Groups & Subscriptions':       { obj: '2.1', title: 'Resource Groups & Subscriptions',     search: 'microsoft+learn+az-900+resource+groups+subscriptions' },
    'Management Groups':                     { obj: '2.1', title: 'Management Groups',                   search: 'microsoft+learn+az-900+management+groups+hierarchy' },
    'Azure Virtual Machines':                { obj: '2.2', title: 'Azure VMs',                           search: 'microsoft+learn+az-900+virtual+machines' },
    'Containers & AKS':                      { obj: '2.2', title: 'Containers & AKS',                    search: 'microsoft+learn+az-900+containers+aks+aci' },
    'Azure Functions':                       { obj: '2.2', title: 'Azure Functions',                     search: 'microsoft+learn+az-900+azure+functions+serverless' },
    'Azure App Service':                     { obj: '2.2', title: 'App Service',                         search: 'microsoft+learn+az-900+app+service+web+apps' },
    'Azure Virtual Desktop':                 { obj: '2.2', title: 'Azure Virtual Desktop',               search: 'microsoft+learn+az-900+azure+virtual+desktop+wvd' },
    'Virtual Networks & Subnets':            { obj: '2.2', title: 'Virtual Networks & Subnets',          search: 'microsoft+learn+az-900+virtual+networks+subnets' },
    'VNet Peering & VPN Gateway':            { obj: '2.2', title: 'VNet Peering & VPN Gateway',          search: 'microsoft+learn+az-900+vnet+peering+vpn+gateway' },
    'ExpressRoute & DNS':                    { obj: '2.2', title: 'ExpressRoute & Azure DNS',            search: 'microsoft+learn+az-900+expressroute+dns' },
    'Azure Storage Accounts':                { obj: '2.3', title: 'Storage Accounts',                    search: 'microsoft+learn+az-900+storage+accounts' },
    'Blob Storage & Files':                  { obj: '2.3', title: 'Blob & File Storage',                 search: 'microsoft+learn+az-900+blob+storage+azure+files' },
    'Storage Redundancy & Tiers':            { obj: '2.3', title: 'Redundancy & Tiers',                  search: 'microsoft+learn+az-900+storage+redundancy+lrs+zrs+grs' },
    'Microsoft Entra ID & Authentication':   { obj: '2.4', title: 'Entra ID & Authentication',           search: 'microsoft+learn+az-900+entra+id+authentication' },
    'RBAC & Zero Trust':                     { obj: '2.4', title: 'RBAC & Zero Trust',                   search: 'microsoft+learn+az-900+rbac+zero+trust' },
    'Microsoft Defender for Cloud':          { obj: '2.4', title: 'Defender for Cloud',                  search: 'microsoft+learn+az-900+defender+for+cloud' },

    // Domain 3 — Azure Management & Governance
    'Azure Cost Management':                 { obj: '3.1', title: 'Cost Management',                     search: 'microsoft+learn+az-900+cost+management+billing' },
    'Pricing Calculator & TCO':              { obj: '3.1', title: 'Pricing Calculator & TCO',            search: 'microsoft+learn+az-900+pricing+calculator+tco' },
    'Tags & Resource Organization':          { obj: '3.1', title: 'Tags',                                search: 'microsoft+learn+az-900+tags+resource+organization' },
    'Microsoft Purview':                     { obj: '3.2', title: 'Microsoft Purview',                   search: 'microsoft+learn+az-900+purview+data+governance' },
    'Azure Policy':                          { obj: '3.2', title: 'Azure Policy',                        search: 'microsoft+learn+az-900+azure+policy' },
    'Resource Locks':                        { obj: '3.2', title: 'Resource Locks',                      search: 'microsoft+learn+az-900+resource+locks' },
    'Azure Portal & Cloud Shell':            { obj: '3.3', title: 'Azure Portal & Cloud Shell',          search: 'microsoft+learn+az-900+portal+cloud+shell' },
    'Azure CLI & PowerShell':                { obj: '3.3', title: 'Azure CLI & PowerShell',              search: 'microsoft+learn+az-900+cli+powershell' },
    'Azure Arc':                             { obj: '3.3', title: 'Azure Arc',                           search: 'microsoft+learn+az-900+azure+arc+hybrid' },
    'ARM Templates & IaC':                   { obj: '3.3', title: 'ARM Templates & IaC',                 search: 'microsoft+learn+az-900+arm+templates+infrastructure+as+code' },
    'Azure Advisor':                         { obj: '3.4', title: 'Azure Advisor',                       search: 'microsoft+learn+az-900+azure+advisor' },
    'Azure Service Health':                  { obj: '3.4', title: 'Azure Service Health',                search: 'microsoft+learn+az-900+service+health' },
    'Azure Monitor & Log Analytics':         { obj: '3.4', title: 'Azure Monitor & Log Analytics',       search: 'microsoft+learn+az-900+azure+monitor+log+analytics' }
  },

  // ── GROUND TRUTH TABLES ───────────────────────────────────────────────
  // Azure doesn't have a comparable enumerable-facts set to Net+ GT_PORTS
  // (27 entries) or GT_OSI (30 entries). Deferred per plan §1 non-goals
  // until a clear AZ-900-specific pattern emerges — possibly region-pair
  // table, RBAC built-in role table, or storage redundancy variants.
  //
  // Consumers in app.js use `(CERT_PACK && CERT_PACK.gt && CERT_PACK.gt.X)
  // || defaultValue` so omitting `gt` entirely is safe — they fall back to
  // empty defaults and the validator gracefully no-ops. Kept commented for
  // future expansion clarity.
  //
  // gt: { /* Phase 2B+ when enumerable Azure facts surface */ },

  // ── EXEMPLAR BANK (Stage 6 will populate) ─────────────────────────────
  // Stage 6 of the v7.3.0 plan authors 200 hand-curated AZ-900 exemplars
  // across 30-36 clusters following the proven Net+ (200) + Sec+ (131)
  // pattern. Distribution per plan §6a: ~55 Cloud Concepts (27.5%), ~75
  // Azure Architecture (37.5%), ~65 Azure Management (32.5%). Round to
  // 200 with 5 extra in Domain 2. Empty array = the exemplar-injection
  // step at app.js:_fetchQuestionsBatch is a no-op (early-return when
  // bank empty); Haiku falls back to blueprint + prompt quality alone,
  // which still works but loses the +6-8 percentage-point quality lift
  // documented in the v4.59.6 exemplar-bank ship for Net+.
  questionExemplars: []
};
