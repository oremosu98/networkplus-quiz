// ══════════════════════════════════════════════════════════════════════════
// CertAnvil — Cross-cert skill overlap data table
// ══════════════════════════════════════════════════════════════════════════
// Hand-authored cert-pair overlap data, used by /analytics Panel 2.
// Loaded before lib/cross-cert-analytics.js so it can be referenced as
// window.CROSS_CERT_OVERLAP. Pure data — no logic.
//
// Authoring discipline:
//   • Each entry encodes a DIRECTIONAL relationship: "if you know <from>,
//     here's what carries forward into <to>." Both directions can exist
//     as separate entries if the inverse is meaningfully different.
//   • Overlap percentages are anchored to public exam blueprints — read
//     CompTIA / Cisco / AWS / Microsoft objectives side-by-side and count
//     shared topic clusters. These numbers will not be precise to within
//     ±5% but they MUST be honest about which pairs are high vs low.
//   • Hours-saved estimates assume an average prep volume of ~120-160
//     hours per cert from scratch. Saved hours = pct × baseline × 0.5
//     (the 0.5 is "you still have to refresh, not totally skip"). Numbers
//     intentionally conservative — under-promise / over-deliver.
//   • Topic names are authored to be readable to a student, not lifted
//     verbatim from the blueprint. They communicate the concept, not the
//     objective number.
//
// What this is NOT:
//   • A live mastery map. Per-topic accuracy data lives in cert-app
//     quiz_history; surfacing it on landing requires a snapshot pipeline
//     similar to v4.99.0 readiness snapshots. Possible Phase B.5 work.
//   • A study sequence recommender. That's Panel 3 (deterministic ranker).
//
// Total entries: 26 directional pairs (incl. aspirational future-cert rows
// like CCNA / AWS-SAA / AZ-104) covering the meaningfully-overlapping
// subset of cert combinations. Pairs with <20% overlap (e.g. AZ-900 ↔ CCNA,
// A+ Core 1 ↔ Sec+, A+ Core 2 ↔ Net+, A+ ↔ AI-900) are deliberately omitted —
// they exist mathematically but don't earn a row. v7.6.0 added 6 A+ pairs
// (Core 1 ↔ Core 2 both directions; Core 1 ↔ Net+ both; Core 2 ↔ Sec+ both).
// ══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  window.CROSS_CERT_OVERLAP = [
    // ── N+ → Sec+ — the canonical CompTIA progression ───────────────────
    {
      from: 'netplus',
      to: 'secplus',
      pct: 65,
      sharedCount: 8,
      totalTargetCount: 12,
      headline: 'Strong feed into Sec+',
      sharedTopics: [
        'TCP/IP fundamentals',
        'Subnetting & IP addressing',
        'OSI model & layered security',
        'Common ports & protocols',
        'Firewalls & ACL fundamentals',
        'Network attacks (basic)',
        'Wireless security basics',
        'VPN protocols (intro)'
      ],
      refresherTopics: [
        'Wireless security goes deeper — WPA3, EAP variants, RADIUS',
        'VPN protocols expand to IPsec/IKEv2 internals + tunnel modes'
      ],
      newTopics: [
        'Cryptography & PKI',
        'Risk management & governance (Domain 5)',
        'Identity & access management',
        'Cloud security architecture',
        'Incident response (PICERL)',
        'Threat intelligence & threat modelling'
      ],
      hoursSaved: 28,
      daysSaved: 6,
      callout: 'Most Sec+ Domain 1.1 + 1.2 networking content is review for you. Focus your prep on Domains 4 (operations) + 5 (governance) which are largely new territory.'
    },

    // ── N+ → CCNA — fast-track candidate ────────────────────────────────
    {
      from: 'netplus',
      to: 'ccna',
      pct: 85,
      sharedCount: 17,
      totalTargetCount: 20,
      headline: 'CCNA fast-track candidate',
      sharedTopics: [
        'OSI model & TCP/IP stack',
        'Subnetting & VLSM',
        'Switch operation & MAC tables',
        'VLAN basics & 802.1Q tagging',
        'Static routing fundamentals',
        'NAT/PAT & overload',
        'DHCP & DNS',
        'Common cabling & connectors',
        'IPv4/IPv6 addressing'
      ],
      refresherTopics: [
        'Wireless 802.11 standards expand to Cisco-specific extensions',
        'QoS gets significantly deeper than N+ surface-level coverage'
      ],
      newTopics: [
        'OSPF inter-area routing',
        'BGP path selection',
        'EtherChannel & Spanning Tree variants (RSTP, MST)',
        'Cisco IOS CLI mastery',
        'SD-WAN architecture concepts',
        'Network programmability (REST APIs, JSON)'
      ],
      hoursSaved: 30,
      daysSaved: 7,
      callout: 'Skip ~30 hours of N+ overlap. Real CCNA prep is OSPF/BGP depth + IOS CLI fluency — that\'s where the new study time should go.'
    },

    // ── N+ → AWS SAA — networking foundation in cloud ───────────────────
    {
      from: 'netplus',
      to: 'aws-saa',
      pct: 40,
      sharedCount: 6,
      totalTargetCount: 15,
      headline: 'Networking foundation transfers',
      sharedTopics: [
        'TCP/IP fundamentals',
        'Subnetting & CIDR (critical for VPC design)',
        'DNS resolution',
        'Routing concepts',
        'Firewall & ACL fundamentals',
        'Public vs private addressing'
      ],
      refresherTopics: [
        'Subnetting/CIDR calculation gets used heavily in VPC sizing'
      ],
      newTopics: [
        'AWS service catalog (50+ services)',
        'IAM users, roles, policies, permission boundaries',
        'S3 storage classes & lifecycle',
        'EC2 instance families & pricing models',
        'High availability + multi-AZ patterns',
        'Cost optimisation strategies'
      ],
      hoursSaved: 18,
      daysSaved: 4,
      callout: 'Networking is ~20% of SAA-C03. Your N+ knowledge directly applies to VPC + subnet design. The other 80% (services, IAM, architecture patterns) is new territory.'
    },

    // ── N+ → AZ-104 — networking concepts in Azure ──────────────────────
    {
      from: 'netplus',
      to: 'az104',
      pct: 35,
      sharedCount: 5,
      totalTargetCount: 14,
      headline: 'Networking transfers to Azure',
      sharedTopics: [
        'TCP/IP fundamentals',
        'Subnetting & IP address planning',
        'DNS concepts',
        'Routing fundamentals',
        'Firewall concepts (translates to NSGs)'
      ],
      newTopics: [
        'Azure service catalog & resource groups',
        'Microsoft Entra ID (formerly AAD)',
        'Azure RBAC & conditional access',
        'Storage accounts, managed disks, file shares',
        'VM deployment & scale sets',
        'Azure Monitor + Log Analytics'
      ],
      hoursSaved: 14,
      daysSaved: 3,
      callout: 'Subnetting + DNS knowledge directly applies to VNet design. Identity, governance, and Azure-specific tooling are all new.'
    },

    // ── N+ → AZ-900 — light, ~15-20% (networking primitives transfer) ──
    {
      from: 'netplus',
      to: 'az900',
      pct: 18,
      sharedCount: 4,
      totalTargetCount: 12,
      headline: 'Networking foundation helps with Azure infra',
      sharedTopics: [
        'TCP/IP fundamentals & subnetting (translates to VNet + subnet design)',
        'Firewalls & ACL fundamentals (translates to NSG + Azure Firewall)',
        'Load balancing concepts (translates to Azure LB + Application Gateway)',
        'Dedicated WAN + site-to-site VPN (translates to ExpressRoute + VPN Gateway)'
      ],
      refresherTopics: [
        'IP design vocabulary stays the same, but cloud uses CIDR-by-default with no classful assumptions'
      ],
      newTopics: [
        'Cloud business model (CapEx vs OpEx, consumption-based pricing)',
        'Shared responsibility split across IaaS/PaaS/SaaS',
        'Identity (Microsoft Entra ID, RBAC, Conditional Access)',
        'Cloud governance (Azure Policy, Resource Locks, Purview)',
        'Azure-specific compute (VM, AKS, Functions, App Service)',
        'Azure-specific storage (Blob, Files, redundancy variants)',
        'Management tools (Portal, CLI, PowerShell, ARM templates, Azure Arc)',
        'Cost management (Pricing Calculator, TCO, budgets, tags)'
      ],
      hoursSaved: 12,
      daysSaved: 3,
      callout: 'Networking primitives map cleanly — VNets are subnets with cloud-shaped APIs, NSGs are port-based ACLs. But cloud adds an entire identity + governance + cost layer that has no Net+ analog. Budget time for AZ-900 Domains 1 (cloud concepts) + 3 (governance).'
    },

    // ── Sec+ → AWS SAA — security in cloud ──────────────────────────────
    {
      from: 'secplus',
      to: 'aws-saa',
      pct: 35,
      sharedCount: 5,
      totalTargetCount: 14,
      headline: 'Security concepts carry into cloud',
      sharedTopics: [
        'IAM principles & least privilege',
        'Encryption (in transit + at rest)',
        'Key management concepts',
        'Threat models & defence-in-depth',
        'Security logging & monitoring'
      ],
      newTopics: [
        'AWS-specific IAM (roles vs users vs federation)',
        'KMS, Secrets Manager, Parameter Store',
        'AWS Config + CloudTrail audit pipeline',
        'WAF + Shield for L7/L3 attacks',
        'GuardDuty, Security Hub, Inspector'
      ],
      hoursSaved: 12,
      daysSaved: 3,
      callout: 'Sec+ gives you the conceptual scaffolding. AWS layer is "how does AWS specifically implement these concepts" — bounded learning.'
    },

    // ── Sec+ → AZ-104 — security in Azure ───────────────────────────────
    {
      from: 'secplus',
      to: 'az104',
      pct: 30,
      sharedCount: 4,
      totalTargetCount: 13,
      headline: 'Security & identity transfers',
      sharedTopics: [
        'Identity fundamentals (SSO, MFA, federation)',
        'RBAC & least privilege',
        'Encryption at rest + in transit',
        'Audit & logging discipline'
      ],
      newTopics: [
        'Microsoft Entra ID specifics',
        'Conditional Access policies',
        'Privileged Identity Management (PIM)',
        'Azure Policy + Blueprints',
        'Azure Defender & Security Center'
      ],
      hoursSaved: 10,
      daysSaved: 2,
      callout: 'Identity and access concepts are nearly 1:1 transferable. The Microsoft-specific tooling (Entra, PIM, Conditional Access) is what needs the focused study time.'
    },

    // ── Sec+ → AZ-900 — medium-high, ~38-45% (security + governance carry) ──
    {
      from: 'secplus',
      to: 'az900',
      pct: 40,
      sharedCount: 7,
      totalTargetCount: 12,
      headline: 'Security foundation transfers — Azure adds the platform',
      sharedTopics: [
        'Identity & access management (Sec+ Domain 4.6 ↔ Microsoft Entra ID + RBAC)',
        'Zero Trust architecture (Sec+ Domain 3.2 ↔ Azure Zero Trust model)',
        'MFA & Conditional Access (Sec+ Domain 4.6 ↔ Azure Conditional Access policies)',
        'Defense in Depth (Sec+ Domain 3.1 ↔ Azure security layers)',
        'Shared Responsibility Model (Sec+ Domain 3.1 ↔ Azure SRM)',
        'Network security (NSG + Azure Firewall ↔ Sec+ Domain 3.2)',
        'Compliance frameworks (Sec+ Domain 5.4 ↔ Microsoft Purview + Compliance Manager)'
      ],
      refresherTopics: [
        'Zero Trust principles get Microsoft-flavoured — Entra ID + Conditional Access + Defender for Cloud as the canonical stack',
        'IAM expands beyond DAC/MAC/RBAC/ABAC into Azure role assignments + scope inheritance (management group → subscription → resource group)'
      ],
      newTopics: [
        'Azure infrastructure (regions, availability zones, subscriptions, resource groups, management groups)',
        'Azure compute services (VM, AKS, Functions, App Service, Virtual Desktop)',
        'Azure storage services (Blob, Files, redundancy: LRS/ZRS/GRS/GZRS)',
        'Cloud business model (CapEx vs OpEx, consumption-based pricing)',
        'Cost management (Pricing Calculator, TCO, budgets, tags)',
        'Management & deployment tools (Portal, CLI, PowerShell, ARM, Bicep, Arc)',
        'Monitoring stack (Azure Monitor, Log Analytics, Service Health, Advisor)'
      ],
      hoursSaved: 24,
      daysSaved: 6,
      callout: 'AZ-900\'s security + governance topics are largely Sec+ content in a Microsoft frame. The new material is Azure platform mechanics (compute / storage / networking / cost / management) — about 60% of the AZ-900 blueprint. Time-budget those domains; coast through the security + IAM overlap.'
    },

    // ── AZ-900 → N+ — light inverse, ~15% (cloud knowledge → Net+) ──────
    {
      from: 'az900',
      to: 'netplus',
      pct: 15,
      sharedCount: 3,
      totalTargetCount: 14,
      headline: 'Cloud knowledge gives a sliver of Net+',
      sharedTopics: [
        'Basic IP networking vocab (CIDR, subnets) from VNet design',
        'Allow/deny port filtering (NSG → ACL mental model)',
        'Load balancer concepts (Azure LB → L4 LB primer)'
      ],
      refresherTopics: [
        'CIDR-by-default in cloud maps to CompTIA\'s classless mode, but Net+ exam still asks about classful boundaries (Class A/B/C/D/E)'
      ],
      newTopics: [
        'OSI model (7 layers — Net+ Domain 1)',
        'Detailed L1 cabling, connectors, ethernet standards (Net+ Domain 1)',
        'Switching internals (MAC tables, VLANs, STP, port aggregation — Net+ Domain 2)',
        'Routing internals (RIP, OSPF, BGP, EIGRP — Net+ Domain 2)',
        'Wireless internals (802.11 standards, encryption, deployment — Net+ Domain 2)',
        'Network services (DHCP, DNS internals, NTP, SNMP, Syslog — Net+ Domain 3)',
        'Network security (firewall types, IDS/IPS, threats — Net+ Domain 4)',
        'Troubleshooting methodology + tools (Net+ Domain 5)',
        'On-premises network architecture (3-tier, spine-leaf — Net+ Domain 1)'
      ],
      hoursSaved: 8,
      daysSaved: 2,
      callout: 'AZ-900 stays high-level on networking — Net+ goes deep into the physical, link, and transport layer mechanics that cloud abstracts away. Expect roughly 90% new material across Domains 1, 2, and 5.'
    },

    // ── AZ-900 → Sec+ — medium-high inverse, ~35% (security overlap) ────
    {
      from: 'az900',
      to: 'secplus',
      pct: 35,
      sharedCount: 6,
      totalTargetCount: 12,
      headline: 'Azure security + governance carry into Sec+',
      sharedTopics: [
        'Identity & access management (Entra ID + RBAC → Sec+ Domain 4.6)',
        'Zero Trust architecture (Azure ZT model → Sec+ Domain 3.2)',
        'Shared Responsibility Model (Azure SRM → Sec+ Domain 3.1)',
        'Cloud security architecture concepts (Azure security → Sec+ Domain 3.1)',
        'MFA & Conditional Access fundamentals (Azure CA → Sec+ Domain 4.6)',
        'Compliance frameworks (Purview + Compliance Manager → Sec+ Domain 5.4)'
      ],
      refresherTopics: [
        'Sec+ adds vendor-neutral framing of the same concepts — Microsoft-specific names (Entra ID, NSG) become CompTIA-generic (IDP, ACL)'
      ],
      newTopics: [
        'Cryptography fundamentals & PKI (Sec+ Domain 1.4)',
        'Threat actors, attack vectors, vulnerabilities (Sec+ Domain 2)',
        'Web & cryptographic attacks (Sec+ Domain 2.4)',
        'Malware types & analysis (Sec+ Domain 2.4)',
        'Incident Response (PICERL — Sec+ Domain 4.8)',
        'Forensics & investigations (Sec+ Domain 4.9)',
        'Risk management & governance (Sec+ Domain 5.1, 5.2)',
        'Third-party risk + supply chain (Sec+ Domain 5.3)',
        'Security awareness & training (Sec+ Domain 5.5)'
      ],
      hoursSaved: 22,
      daysSaved: 5,
      callout: 'AZ-900\'s identity + Zero Trust + governance content gives you a strong start on Sec+ Domain 3 (architecture) and Domain 4 (operations). Domains 1 (cryptography), 2 (threats), and 5 (governance frameworks) need fresh study.'
    },

    // ── AZ-900 → AZ-104 — same family, ~90% overlap ─────────────────────
    {
      from: 'az900',
      to: 'az104',
      pct: 90,
      sharedCount: 12,
      totalTargetCount: 13,
      headline: 'Same family — direct progression',
      sharedTopics: [
        'Azure architecture & geography',
        'Resource groups & subscriptions',
        'Microsoft Entra ID basics',
        'Azure pricing models',
        'Azure compliance & governance basics',
        'Azure storage (intro level)',
        'Azure compute (intro level)',
        'Azure networking (intro level)'
      ],
      refresherTopics: [
        'AZ-900 covers everything at concept level — AZ-104 expects you to actually configure these via portal + CLI + ARM/Bicep'
      ],
      newTopics: [
        'PowerShell + Azure CLI hands-on',
        'ARM templates & Bicep',
        'Storage account configuration depth',
        'VM deployment + extensions',
        'VNet peering, VPN gateway, ExpressRoute',
        'Azure Backup, Site Recovery, Monitor'
      ],
      hoursSaved: 35,
      daysSaved: 8,
      callout: 'AZ-900 is the "what" — AZ-104 is the "how to actually configure it." If you\'ve passed AZ-900, the foundation is locked in. Focus on hands-on portal + PowerShell time.'
    },

    // ── AZ-900 → AWS SAA — cloud fundamentals translate ─────────────────
    {
      from: 'az900',
      to: 'aws-saa',
      pct: 25,
      sharedCount: 4,
      totalTargetCount: 15,
      headline: 'Cloud concepts transfer at high level',
      sharedTopics: [
        'Cloud computing fundamentals (IaaS, PaaS, SaaS)',
        'Shared responsibility model',
        'Regions, availability zones, edge locations',
        'Pay-as-you-go pricing concepts'
      ],
      newTopics: [
        'AWS service catalog (very different from Azure)',
        'IAM model (different from Microsoft Entra)',
        'AWS networking primitives (VPC, subnets, NACLs, SGs)',
        'AWS compute, storage, database services',
        'Architecture patterns (Well-Architected Framework)'
      ],
      hoursSaved: 8,
      daysSaved: 2,
      callout: 'Conceptual cloud knowledge transfers. Service mappings (Azure → AWS) help you orient quickly, but the AWS specifics need dedicated study.'
    },

    // ── AZ-104 → AWS SAA — cross-cloud admin overlap ────────────────────
    {
      from: 'az104',
      to: 'aws-saa',
      pct: 40,
      sharedCount: 6,
      totalTargetCount: 15,
      headline: 'Cross-cloud admin patterns',
      sharedTopics: [
        'Cloud architecture patterns (HA, scaling, redundancy)',
        'Identity & access management concepts',
        'Networking (VNet → VPC mental model)',
        'Storage tiering concepts',
        'Monitoring & logging discipline',
        'Backup & disaster recovery'
      ],
      newTopics: [
        'AWS-specific service names + configuration',
        'AWS Well-Architected Framework',
        'Region/AZ deployment patterns (different from Azure paired regions)',
        'AWS pricing optimization (Reserved + Spot + Savings Plans)'
      ],
      hoursSaved: 16,
      daysSaved: 4,
      callout: 'You already know how to think about cloud admin. AWS prep becomes "translate Azure concepts to AWS service names" + AWS-specific architecture patterns.'
    },

    // ── CCNA → AWS SAA — networking expertise into cloud networking ─────
    {
      from: 'ccna',
      to: 'aws-saa',
      pct: 25,
      sharedCount: 4,
      totalTargetCount: 15,
      headline: 'Networking expertise into VPC design',
      sharedTopics: [
        'Subnetting & CIDR calculation (critical for VPC sizing)',
        'Routing concepts (transfers to VPC route tables)',
        'NAT (transfers to NAT Gateway behavior)',
        'Network ACLs vs Security Groups (similar mental model to Cisco ACLs)'
      ],
      newTopics: [
        'AWS service catalog beyond networking',
        'IAM model',
        'Storage, compute, database services',
        'High-availability architecture patterns'
      ],
      hoursSaved: 10,
      daysSaved: 2,
      callout: 'Your networking depth is gold for VPC design questions. The other 75% of SAA (services, IAM, architecture) is new territory.'
    },

    // ── v7.5.0 AI-900 quartet overlap (Net+/Sec+/AZ-900 ↔ AI-900) ───────────

    // ── Net+ → AI-900 — very light, generic cloud concepts only ───────────
    {
      from: 'netplus',
      to: 'ai900',
      pct: 8,
      sharedCount: 2,
      totalTargetCount: 22,
      headline: 'Minimal overlap — different role family',
      sharedTopics: [
        'Generic cloud service awareness (IaaS/PaaS/SaaS)',
        'Public/private/hybrid cloud at concept level'
      ],
      newTopics: [
        'AI workload types (predictive, generative, agentic)',
        'Responsible AI principles (fairness, reliability, privacy, inclusiveness, transparency, accountability)',
        'Machine learning fundamentals (classification, regression, clustering)',
        'Computer vision workloads (image classification, OCR, object detection)',
        'NLP workloads (sentiment, entity recognition, translation, speech)',
        'Generative AI (foundation models, Azure OpenAI, Azure AI Foundry)'
      ],
      hoursSaved: 2,
      daysSaved: 1,
      callout: 'Net+ and AI-900 are different role families. The only meaningful carry-over is generic cloud-service literacy — start fresh on AI/ML content.'
    },

    // ── AI-900 → Net+ — reverse direction, same low overlap ───────────────
    {
      from: 'ai900',
      to: 'netplus',
      pct: 5,
      sharedCount: 1,
      totalTargetCount: 22,
      headline: 'Different role family — start fresh',
      sharedTopics: [
        'Generic cloud service literacy (IaaS/PaaS/SaaS terminology)'
      ],
      newTopics: [
        'OSI model, TCP/IP, ports + protocols',
        'Subnetting + CIDR calculation',
        'Switching, routing, VLANs',
        'Network security (firewalls, ACLs, VPNs)',
        'Network operations + troubleshooting methodology'
      ],
      hoursSaved: 1,
      daysSaved: 0,
      callout: 'AI-900 doesn\'t prepare you for Net+. Networking foundations are net-new — plan a full Net+ study cycle.'
    },

    // ── Sec+ → AI-900 — medium, Responsible AI + governance + data protection ──
    {
      from: 'secplus',
      to: 'ai900',
      pct: 28,
      sharedCount: 5,
      totalTargetCount: 18,
      headline: 'AI governance + data protection carry over',
      sharedTopics: [
        'Data classification + privacy (Sec+ Domain 5 ↔ AI-900 Responsible AI privacy)',
        'Risk management framing (carries to AI risk + bias mitigation)',
        'Compliance posture (GDPR/HIPAA/SOX governance vocabulary)',
        'Audit + accountability (carries to Responsible AI accountability principle)',
        'Content moderation + DLP awareness (carries to Azure AI Content Safety)'
      ],
      refresherTopics: [
        'Sec+ teaches data protection at policy level; AI-900 reframes for AI/ML pipelines'
      ],
      newTopics: [
        'AI workload types (predictive vs generative vs agentic)',
        'Machine learning fundamentals (regression / classification / clustering)',
        'Confusion matrix + model evaluation (precision/recall/accuracy)',
        'Computer vision sub-types (image classification / object detection / OCR / face)',
        'NLP workloads (sentiment, entity, translation, speech)',
        'Generative AI (foundation models, Azure OpenAI, Azure AI Foundry, Copilot)',
        'Azure AI Services umbrella (Speech / Language / Vision / Document Intelligence / Content Safety)'
      ],
      hoursSaved: 6,
      daysSaved: 1,
      callout: 'Your Sec+ governance + data-protection mental models translate directly to Responsible AI principles + Azure AI Content Safety. Most of AI-900 is still new content — ML + CV + NLP + GenAI.'
    },

    // ── AI-900 → Sec+ — reverse direction ─────────────────────────────────
    {
      from: 'ai900',
      to: 'secplus',
      pct: 18,
      sharedCount: 3,
      totalTargetCount: 17,
      headline: 'Responsible AI + governance literacy transfers',
      sharedTopics: [
        'Responsible AI principles (privacy, accountability, transparency carry to Sec+ governance)',
        'Data classification awareness (carries to Sec+ Domain 5)',
        'Azure AI Content Safety (carries to Sec+ data protection + DLP)'
      ],
      newTopics: [
        'Threat actors + attack vectors (Sec+ Domain 2 — net-new)',
        'Cryptography fundamentals + PKI (Sec+ Domain 1 — net-new)',
        'Network security architecture (segmentation, zero trust, IDS/IPS)',
        'Identity + access management depth (RBAC, MFA, federation)',
        'Incident response + forensics + SIEM',
        'Compliance frameworks (PCI-DSS, HIPAA, GDPR depth)'
      ],
      hoursSaved: 4,
      daysSaved: 1,
      callout: 'AI-900\'s Responsible AI literacy gives you a slight edge on Sec+ governance. The other 82% — threats, crypto, IR, network security — is new study.'
    },

    // ── AZ-900 → AI-900 — medium-high, shared Azure foundations ───────────
    {
      from: 'az900',
      to: 'ai900',
      pct: 38,
      sharedCount: 6,
      totalTargetCount: 16,
      headline: 'Shared Azure platform foundation — strong transfer',
      sharedTopics: [
        'Azure platform fundamentals (regions, availability zones, subscriptions)',
        'Resource Groups + cost management',
        'Microsoft Entra ID + RBAC (identity layer reused by AI services)',
        'Azure Machine Learning compute infrastructure (sits on Azure VMs + storage)',
        'Pricing models (consumption-based for AI services too)',
        'Shared Responsibility Model (carries to AI service deployment)'
      ],
      refresherTopics: [
        'AZ-900 covers Azure platform; AI-900 reuses the platform layer beneath the AI services'
      ],
      newTopics: [
        'AI workload types + Responsible AI principles (Domain 1)',
        'Machine learning fundamentals — classification / regression / clustering / confusion matrix (Domain 2)',
        'Computer vision workloads — Azure AI Vision + Custom Vision (Domain 3)',
        'NLP workloads — Azure AI Language + Speech + Translator (Domain 4)',
        'Generative AI — Azure OpenAI, Azure AI Foundry, Microsoft Copilot, Content Safety (Domain 5 — largest, 25%)',
        'Azure AI Foundry model catalog (post-Nov-2024 rebrand from Azure AI Studio)'
      ],
      hoursSaved: 12,
      daysSaved: 3,
      callout: 'AZ-900 → AI-900 is the strongest 4-cert pair. Azure platform foundations (regions, RG hierarchy, Entra, pricing) carry over directly. Focus your AI-900 prep on the 5 AI-specific domains — especially Domain 5 Generative AI (Foundry + OpenAI + Copilot, the May 2025 refresh content).'
    },

    // ── AI-900 → AZ-900 — reverse direction ───────────────────────────────
    {
      from: 'ai900',
      to: 'az900',
      pct: 32,
      sharedCount: 5,
      totalTargetCount: 13,
      headline: 'Azure platform layer transfers in reverse',
      sharedTopics: [
        'Azure platform fundamentals (regions, AZs, subscriptions)',
        'Microsoft Entra ID + RBAC',
        'Pricing models (consumption-based)',
        'Shared Responsibility Model',
        'Cloud service models (IaaS/PaaS/SaaS) at concept level'
      ],
      newTopics: [
        'Azure compute services depth (VMs, Containers/AKS, Functions, App Service)',
        'Azure networking (VNets, peering, ExpressRoute, VPN Gateway)',
        'Azure storage tiers + redundancy (LRS/ZRS/GRS/GZRS)',
        'Azure governance (Policy, Blueprints, Initiatives, Tags, Resource Locks)',
        'Azure cost management + TCO calculator',
        'Azure monitoring (Monitor, Log Analytics, Service Health, Advisor)',
        'Azure CLI + PowerShell + ARM templates'
      ],
      hoursSaved: 8,
      daysSaved: 2,
      callout: 'AI-900 teaches the Azure platform layer just enough to host AI services. AZ-900 expects depth on compute, networking, storage, governance — most of that is net-new study.'
    },

    // ── A+ Core 1 → A+ Core 2 — same cert family, complementary halves ──────
    {
      from: 'aplus-core1',
      to: 'aplus-core2',
      pct: 42,
      sharedCount: 6,
      totalTargetCount: 14,
      headline: 'Same A+ cert family — shared terminology + workflow',
      sharedTopics: [
        'CompTIA troubleshooting mindset + scenario framing',
        'Networking fundamentals (ports, IP, DNS) reused in OS networking config',
        'Mobile device concepts carry into mobile OS + security',
        'BEST / NEXT / FIRST qualifier-style reasoning',
        'Hardware awareness feeding OS install + boot troubleshooting',
        'SOHO networking basics'
      ],
      newTopics: [
        'Operating systems depth (Windows editions, command line, macOS, Linux)',
        'Security domain (social engineering, malware removal, MFA, encryption)',
        'Software troubleshooting (BSOD, boot, malware symptoms)',
        'Operational procedures (change management, backups, scripting, AI basics)'
      ],
      hoursSaved: 14,
      daysSaved: 3,
      callout: 'You must pass BOTH exams to earn A+. Core 1 builds the hardware/networking foundation; Core 2 is the software/security/operations half. The CompTIA framing transfers, but Core 2 content is largely new — budget full prep for OS + Security.'
    },

    // ── A+ Core 2 → A+ Core 1 — reverse direction ───────────────────────────
    {
      from: 'aplus-core2',
      to: 'aplus-core1',
      pct: 42,
      sharedCount: 6,
      totalTargetCount: 14,
      headline: 'Same A+ cert family — finish the pair',
      sharedTopics: [
        'CompTIA troubleshooting methodology + scenario stems',
        'OS networking config maps onto Core 1 networking',
        'Security awareness underpins SOHO + wireless security',
        'Mobile OS knowledge reused in mobile hardware',
        'Command-line familiarity helps network diagnostics',
        'Documentation + safety discipline'
      ],
      newTopics: [
        'Mobile + laptop hardware + replacement',
        'Networking depth (cabling, wireless standards, hardware devices)',
        'PC hardware (RAM, storage, RAID, motherboards, CPUs, power)',
        'Virtualization + cloud models',
        'Hardware/network troubleshooting (RAID repair, printers, displays)'
      ],
      hoursSaved: 14,
      daysSaved: 3,
      callout: 'If you passed Core 2 first, Core 1 is the hardware-heavy half. The shared CompTIA framing helps, but RAID configuration/repair, printers, and physical hardware are net-new — those are the highest-yield Core 1 study areas.'
    },

    // ── Net+ → A+ Core 1 — networking foundation feeds the A+ networking domain ──
    {
      from: 'netplus',
      to: 'aplus-core1',
      pct: 35,
      sharedCount: 5,
      totalTargetCount: 14,
      headline: 'Net+ networking carries into A+ Core 1',
      sharedTopics: [
        'TCP/UDP ports & protocols',
        'DNS records (incl. SPF/DKIM/DMARC) + DHCP',
        'IP addressing, subnetting, SOHO config',
        'Wireless standards + frequencies',
        'Cabling, connectors, networking hardware + tools'
      ],
      newTopics: [
        'Mobile devices (hardware, MDM, sync, connectivity)',
        'PC hardware depth (RAM, storage, RAID, motherboards, CPUs, power)',
        'Printers — deploy, configure, maintain, troubleshoot',
        'Virtualization + cloud service/deployment models + characteristics',
        'Hardware troubleshooting (POST, drives/RAID repair, displays)'
      ],
      hoursSaved: 12,
      daysSaved: 3,
      callout: 'A+ Core 1 networking (23%) is largely review for a Net+ holder. Spend your Core 1 prep on Hardware (25%) + Troubleshooting (28%) — RAID config/repair + printers are the surprise-heavy areas.'
    },

    // ── A+ Core 1 → Net+ — reverse: A+ networking is a head start on Net+ ───
    {
      from: 'aplus-core1',
      to: 'netplus',
      pct: 38,
      sharedCount: 6,
      totalTargetCount: 16,
      headline: 'A+ Core 1 networking is a Net+ head start',
      sharedTopics: [
        'Ports & protocols + TCP vs UDP',
        'DNS + DHCP fundamentals',
        'IP addressing + SOHO configuration',
        'Wireless standards + frequencies/channels',
        'Cabling types + connectors',
        'Networking hardware devices + tools'
      ],
      refresherTopics: [
        'Routing goes far deeper — OSPF, BGP, route selection',
        'Switching expands to STP, VLAN trunking, port security'
      ],
      newTopics: [
        'Routing protocols depth (OSPF/BGP/EIGRP)',
        'Advanced switching (STP, EtherChannel, 802.1Q)',
        'Network operations (SNMP, monitoring, documentation)',
        'Network security depth (Zero Trust, NAC, posture)',
        'Network troubleshooting methodology at scale'
      ],
      hoursSaved: 13,
      daysSaved: 3,
      callout: 'A+ Core 1 gives you the networking vocabulary; Net+ N10-009 expands every networking topic to far greater depth (routing, switching, operations, security). Treat A+ networking as the on-ramp, not the destination.'
    },

    // ── Sec+ → A+ Core 2 — security knowledge feeds the A+ Core 2 security domain ──
    {
      from: 'secplus',
      to: 'aplus-core2',
      pct: 32,
      sharedCount: 5,
      totalTargetCount: 16,
      headline: 'Sec+ security feeds A+ Core 2 Security (28%)',
      sharedTopics: [
        'Social engineering family (phishing/vishing/smishing/tailgating)',
        'Malware types + identification',
        'MFA factors + authentication concepts',
        'Encryption + hashing basics (BitLocker, AES, TPM)',
        'SOHO + wireless security (WPA2/WPA3)'
      ],
      newTopics: [
        'Operating systems depth (Windows editions, command line, macOS, Linux)',
        'Windows OS security settings (NTFS vs share permissions, UAC)',
        'SOHO malware removal — the 10-step ordered procedure',
        'Software troubleshooting (BSOD, boot, malware symptoms)',
        'Operational procedures (change management, backups, scripting, AI basics)'
      ],
      hoursSaved: 11,
      daysSaved: 3,
      callout: 'A Sec+ holder finds A+ Core 2 Security (28%) largely familiar at a foundational level. Focus Core 2 prep on Operating Systems (28%) + Software Troubleshooting + Operational Procedures, which are A+-specific.'
    },

    // ── A+ Core 2 → Sec+ — reverse: A+ Core 2 security is a Sec+ on-ramp ────
    {
      from: 'aplus-core2',
      to: 'secplus',
      pct: 30,
      sharedCount: 5,
      totalTargetCount: 16,
      headline: 'A+ Core 2 security is a Sec+ on-ramp',
      sharedTopics: [
        'Social engineering attack distinctions',
        'Malware types + removal basics',
        'MFA factor categories + authentication',
        'Encryption + hashing fundamentals',
        'SOHO + wireless security hardening'
      ],
      refresherTopics: [
        'Cryptography + PKI go much deeper (cert formats, key management)',
        'IAM expands to federation, SSO, SAML, conditional access'
      ],
      newTopics: [
        'Risk management + governance (Sec+ Domain 5)',
        'Security architecture + Zero Trust models',
        'Incident response (PICERL) + digital forensics',
        'Threat intelligence + threat modelling',
        'Security operations + SIEM + automation'
      ],
      hoursSaved: 10,
      daysSaved: 2,
      callout: 'A+ Core 2 gives you the security vocabulary; Sec+ SY0-701 expands it into governance, architecture, operations, and risk. The shared concepts are real but Sec+ is far broader — budget full prep for Domains 4 + 5.'
    },

    // ── v7.7.0 SC-900 pairs (AZ-900 ↔ SC-900 + Sec+ ↔ SC-900, both directions) ──
    // SC-900 ↔ AI-900 (~10-15%) and SC-900 ↔ Net+ (~15%) omitted per the <20% convention.

    // ── AZ-900 → CLF-C02 (v7.8.0) — strong cross-cloud fundamentals overlap ──
    // The Microsoft-fundamentals graduate is a major CLF-C02 buyer (VoC §11).
    {
      from: 'az900',
      to: 'clfc02',
      pct: 38,
      sharedCount: 6,
      totalTargetCount: 16,
      headline: 'Cloud fundamentals transfer across AWS and Azure',
      sharedTopics: [
        'Shared Responsibility Model (AZ-900 ↔ CLF-C02 Domain 2 — same concept, different services)',
        'Global infrastructure — Regions + Availability Zones + edge (AZ-900 ↔ CLF-C02 Domain 3)',
        'Core compute / storage / database concepts (Azure VM/Blob/SQL ↔ EC2/S3/RDS)',
        'Cloud economics — CapEx vs OpEx, consumption pricing, TCO (AZ-900 ↔ CLF-C02 Domain 1 + 4)',
        'Identity & access fundamentals (Entra ID/RBAC ↔ AWS IAM)',
        'Support + cost management concepts (budgets, pricing calculators, support tiers)'
      ],
      refresherTopics: [
        'Every Azure service name maps to a different AWS name — relearn the catalog',
        'Pricing models restructure: Azure reservations ↔ AWS Reserved Instances vs Savings Plans vs Spot'
      ],
      newTopics: [
        'The AWS service-discrimination catalog — SQS/SNS/EventBridge, EC2/Lambda/Fargate, RDS/DynamoDB/Redshift, CloudWatch/CloudTrail/Config',
        'Well-Architected Framework — the SIX pillars including Sustainability',
        'AWS pricing depth — Savings Plans vs Reserved Instances vs Spot vs Dedicated Hosts',
        'AWS Support plan matrix — Basic/Developer/Business/Enterprise On-Ramp/Enterprise (the named-vs-pool TAM trap)',
        'AWS governance — Organizations + Control Tower + SCPs; security services (GuardDuty/Inspector/Macie)'
      ],
      hoursSaved: 14,
      daysSaved: 4,
      callout: 'AZ-900 → CLF-C02 is the dominant cross-cloud journey. The shared-responsibility + global-infra + cloud-economics foundation carries directly — spend your CLF-C02 prep on the AWS service catalog (Domain 3, 34%) and the AWS-specific pricing + support matrix (Domain 4).'
    },

    // ── CLF-C02 → AZ-900 — reverse, the Azure service catalog is mostly new ──
    {
      from: 'clfc02',
      to: 'az900',
      pct: 35,
      sharedCount: 6,
      totalTargetCount: 13,
      headline: 'AWS fundamentals transfer in reverse',
      sharedTopics: [
        'Shared Responsibility Model',
        'Global infrastructure — Regions + Availability Zones',
        'Core compute / storage / database concepts',
        'Cloud economics — CapEx vs OpEx, consumption pricing, TCO',
        'Identity & access fundamentals (AWS IAM ↔ Entra ID)',
        'Cost management + support concepts'
      ],
      newTopics: [
        'Azure service catalog (VM, AKS, Functions, App Service, Blob tiers LRS/ZRS/GRS)',
        'Microsoft Entra ID + Conditional Access + RBAC specifics',
        'Azure governance — Management Groups, Azure Policy, Blueprints',
        'Azure-specific pricing — reservations, Azure Hybrid Benefit, Cost Management + Pricing Calculator'
      ],
      hoursSaved: 12,
      daysSaved: 3,
      callout: 'CLF-C02 → AZ-900 reuses the same cloud-fundamentals spine. Focus AZ-900 prep on the Azure service names + the Microsoft governance/identity stack.'
    },

    // ── Security+ → CLF-C02 (v7.8.0) — security & compliance overlap (~25%) ──
    {
      from: 'secplus',
      to: 'clfc02',
      pct: 24,
      sharedCount: 4,
      totalTargetCount: 16,
      headline: 'Security fundamentals map onto AWS security services',
      sharedTopics: [
        'Shared Responsibility Model + cloud security concepts (Sec+ ↔ CLF-C02 Domain 2)',
        'IAM — least privilege, MFA, roles vs users (Sec+ IAM ↔ CLF-C02 Domain 2.3)',
        'Encryption at rest / in transit + key management (Sec+ crypto ↔ AWS KMS)',
        'Compliance frameworks awareness — SOC, ISO, PCI, GDPR (Sec+ governance ↔ AWS Artifact)'
      ],
      newTopics: [
        'AWS-specific security services — GuardDuty / Inspector / Macie / Shield / WAF discrimination',
        'AWS-specific cloud breadth — compute / storage / database / networking service catalog',
        'Well-Architected Framework + cloud economics + pricing/support (non-security domains)'
      ],
      hoursSaved: 8,
      daysSaved: 2,
      callout: 'Security+ → CLF-C02 transfers the security-concept layer (shared responsibility, IAM, encryption, compliance), but most of CLF-C02 is breadth-of-service knowledge across all 4 domains, not depth in security.'
    },

    // ── AZ-900 → SC-900 — strongest SC-900 pair, shared Azure platform + identity ──
    {
      from: 'az900',
      to: 'sc900',
      pct: 40,
      sharedCount: 7,
      totalTargetCount: 16,
      headline: 'Azure platform + identity foundation transfers',
      sharedTopics: [
        'Microsoft Entra ID + RBAC (AZ-900 identity layer ↔ SC-900 Domain 2)',
        'Shared Responsibility Model (AZ-900 ↔ SC-900 Domain 1)',
        'Zero Trust model (AZ-900 security ↔ SC-900 Domain 1)',
        'Microsoft Defender for Cloud awareness (AZ-900 governance ↔ SC-900 Domain 3.2)',
        'Conditional Access fundamentals (AZ-900 ↔ SC-900 Entra)',
        'Azure network security primitives — NSG, Azure Firewall (AZ-900 ↔ SC-900 Domain 3.1)',
        'Microsoft Purview governance basics (AZ-900 governance ↔ SC-900 Domain 4)'
      ],
      refresherTopics: [
        'Entra ID expands from "the identity service" into Conditional Access vs Identity Protection vs PIM as distinct tools',
        'Defender for Cloud awareness deepens into the full Microsoft Defender XDR family'
      ],
      newTopics: [
        'The "many Defenders" product map — Defender XDR / Endpoint / Identity / Office 365 / Cloud Apps / for Cloud',
        'Microsoft Sentinel (SIEM + SOAR, Playbook vs Workbook)',
        'Identity Protection vs PIM vs Conditional Access distinctions',
        'Microsoft Purview compliance depth — sensitivity vs retention labels vs DLP, Compliance Manager, eDiscovery, insider risk',
        'SCI concepts — defense in depth layers, encryption vs hashing, preventive/detective/corrective controls'
      ],
      hoursSaved: 16,
      daysSaved: 4,
      callout: 'AZ-900 → SC-900 is the strongest SC-900 pair and the dominant buyer journey. The Azure platform + Entra + shared-responsibility foundation carries directly. Spend your SC-900 prep on the security solutions (Domain 3, 37% — the Defender family + Sentinel) and Purview compliance (Domain 4).'
    },

    // ── SC-900 → AZ-900 — reverse, the Azure platform layer is mostly new ──
    {
      from: 'sc900',
      to: 'az900',
      pct: 32,
      sharedCount: 5,
      totalTargetCount: 13,
      headline: 'Identity + security foundation transfers in reverse',
      sharedTopics: [
        'Microsoft Entra ID + RBAC',
        'Shared Responsibility Model',
        'Zero Trust model + defense in depth',
        'Azure infrastructure security (NSG, Azure Firewall, Bastion, Key Vault)',
        'Microsoft Defender for Cloud awareness'
      ],
      newTopics: [
        'Azure compute services (VM, AKS, Functions, App Service)',
        'Azure storage tiers + redundancy (LRS/ZRS/GRS/GZRS)',
        'Cloud business model (CapEx vs OpEx, consumption-based pricing)',
        'Cost management (Pricing Calculator, TCO, budgets, tags)',
        'Azure governance (Policy, Blueprints, Resource Locks)',
        'Management + monitoring tools (CLI, PowerShell, ARM/Bicep, Azure Monitor, Log Analytics)'
      ],
      hoursSaved: 10,
      daysSaved: 2,
      callout: 'SC-900 teaches the Azure identity + security layer; AZ-900 expects breadth on compute, storage, networking, cost, and governance. Your identity + Defender foundation helps, but most of AZ-900\'s platform mechanics are new study.'
    },

    // ── Sec+ → SC-900 — vendor-neutral security concepts into the Microsoft frame ──
    {
      from: 'secplus',
      to: 'sc900',
      pct: 35,
      sharedCount: 6,
      totalTargetCount: 14,
      headline: 'Security concepts carry into the Microsoft stack',
      sharedTopics: [
        'Zero Trust architecture (Sec+ Domain 3.2 ↔ SC-900 Domain 1)',
        'Identity & access management — MFA, SSO, federation (Sec+ Domain 4.6 ↔ SC-900 Entra)',
        'Defense in depth + shared responsibility (Sec+ Domain 3.1 ↔ SC-900 Domain 1)',
        'Encryption + hashing fundamentals (Sec+ Domain 1.4 ↔ SC-900 Domain 1)',
        'Incident response + SIEM/SOAR concepts (Sec+ Domain 4 ↔ SC-900 Microsoft Sentinel)',
        'Data protection + DLP + compliance frameworks (Sec+ Domain 5 ↔ Microsoft Purview)'
      ],
      refresherTopics: [
        'Vendor-neutral names become Microsoft-specific — IDP → Microsoft Entra ID, generic SIEM/SOAR → Microsoft Sentinel, generic CASB → Defender for Cloud Apps'
      ],
      newTopics: [
        'The "many Defenders" product identification (which Defender protects which workload)',
        'Microsoft Entra specifics — Conditional Access vs Identity Protection vs PIM',
        'Azure infrastructure security services (DDoS Protection, Azure Firewall, WAF, NSGs, Bastion, Key Vault)',
        'Microsoft Purview suite — sensitivity vs retention labels vs DLP, Service Trust Portal vs Compliance Manager, eDiscovery, insider risk'
      ],
      hoursSaved: 18,
      daysSaved: 4,
      callout: 'Sec+ gives you the conceptual scaffolding — Zero Trust, IAM, defense in depth, IR, compliance. SC-900 is largely "how Microsoft names + implements these," plus the product-identification layer (the Defender family + Purview suite) that is the real SC-900 study target.'
    },

    // ── SC-900 → Sec+ — reverse, vendor-neutral depth is mostly new ──
    {
      from: 'sc900',
      to: 'secplus',
      pct: 30,
      sharedCount: 5,
      totalTargetCount: 16,
      headline: 'Microsoft security literacy is a Sec+ on-ramp',
      sharedTopics: [
        'Zero Trust principles + defense in depth',
        'Identity & access management — MFA, Conditional Access concepts',
        'Encryption + hashing fundamentals',
        'Shared responsibility model',
        'Compliance + governance literacy (Purview → frameworks)'
      ],
      refresherTopics: [
        'Microsoft-specific names become vendor-neutral — Microsoft Entra ID → IDP, Microsoft Sentinel → generic SIEM/SOAR'
      ],
      newTopics: [
        'Cryptography + PKI depth (cert formats, key management)',
        'Threat actors, attack vectors, vulnerabilities (Sec+ Domain 2)',
        'Malware types + analysis + social engineering',
        'Network security architecture depth (segmentation, IDS/IPS, NAC)',
        'Incident response (PICERL) + digital forensics',
        'Risk management, third-party risk + governance frameworks (Sec+ Domain 5)'
      ],
      hoursSaved: 12,
      daysSaved: 3,
      callout: 'SC-900\'s Zero Trust + identity + compliance literacy gives you a head start on Sec+ Domains 3 + 4. The bulk of Sec+ — cryptography, threats, malware, IR/forensics, risk governance — is net-new study at far greater depth.'
    }
  ];
})();
