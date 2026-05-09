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
// Total entries: 10 directional pairs covering the meaningfully-overlapping
// subset of C(6,2)=15 possible cert combinations. Pairs with <20% overlap
// (e.g. AZ-900 ↔ CCNA) are deliberately omitted — they exist mathematically
// but don't earn a row.
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
    }
  ];
})();
