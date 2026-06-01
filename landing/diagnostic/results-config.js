// ══════════════════════════════════════════════════════════════════════════
// Diagnostic results · per-cert config  ·  v1 (shared-core extraction)
// ══════════════════════════════════════════════════════════════════════════
// Single source of truth for everything the shared renderer (results-core.js)
// needs that ISN'T already in the quiz's results payload. The payload supplies
// scaledScore / passThreshold / accuracy / domainBreakdown / etc; this supplies
// the cert's identity, score scale (for the ring), band cut-points, and the
// optional per-domain drill hints.
//
// Domain-drill keys MUST match the exact `domain` strings each cert's quiz.html
// emits. A miss degrades gracefully (the hint line just doesn't render).
//
// Adding a cert later = add one entry here + a ~50-line thin results.html shell.
// No renderer changes needed.
// ══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  window.CERT_RESULTS_CONFIG = {
    'network-plus': {
      name: 'Network+',
      examCode: 'N10-009',
      slug: 'network-plus',
      scoreMin: 100,
      scoreMax: 900,
      bands: { ready: 800, onPace: 720, nearPass: 600 },
      domainDrills: {
        'Networking Concepts':     'Subnetting · IPv6 · ports & protocols · OSI/TCP-IP layers',
        'Network Implementation':  'VLANs · routing · switching · wireless standards',
        'Network Operations':      'SNMP · change management · backups · documentation',
        'Network Security':        'Firewalls · VPNs · 802.1X / AAA · zero trust',
        'Network Troubleshooting': 'CompTIA methodology · DNS issues · cabling tools · performance baselines'
      }
    },

    'azure-fundamentals': {
      name: 'Azure Fundamentals',
      examCode: 'AZ-900',
      slug: 'azure-fundamentals',
      scoreMin: 0,
      scoreMax: 1000,
      bands: { ready: 820, onPace: 700, nearPass: 560 },
      domainDrills: {
        'Cloud Concepts':                'IaaS/PaaS/SaaS · public vs private vs hybrid · CapEx vs OpEx · shared responsibility',
        'Azure Architecture & Services': 'regions & availability zones · compute & storage options · VNets · resource hierarchy',
        'Azure Management & Governance': 'cost management · Azure Policy · RBAC · resource locks & tags'
      }
    },

    'azure-ai-fundamentals': {
      name: 'Azure AI Fundamentals',
      examCode: 'AI-900',
      slug: 'azure-ai-fundamentals',
      scoreMin: 0,
      scoreMax: 1000,
      bands: { ready: 820, onPace: 700, nearPass: 560 },
      domainDrills: {
        'AI Workloads':                  'workload types · responsible-AI principles · vision / NLP / generative scenarios',
        'Azure Architecture & Services': 'Azure AI services · Vision · Language · Azure OpenAI',
        'Azure Management & Governance': 'provisioning AI resources · keys & endpoints · cost & access control'
      }
    },

    'aplus-core1': {
      name: 'A+ Core 1',
      examCode: '220-1201',
      slug: 'aplus-core1',
      scoreMin: 0,
      scoreMax: 900,
      bands: { ready: 780, onPace: 675, nearPass: 540 },
      domainDrills: {
        'Mobile Devices':                       'laptop hardware · display components · mobile connectivity · accessories',
        'Networking':                           'ports & protocols · network hardware · wireless standards · SOHO setup',
        'Hardware':                             'RAM & storage · motherboards & CPUs · power supplies · peripherals & cables',
        'Virtualization & Cloud':               'cloud models · client-side virtualization · resource requirements',
        'Hardware & Network Troubleshooting':   'troubleshooting methodology · boot & display issues · network connectivity'
      }
    },

    'aplus-core2': {
      name: 'A+ Core 2',
      examCode: '220-1202',
      slug: 'aplus-core2',
      scoreMin: 0,
      scoreMax: 900,
      bands: { ready: 800, onPace: 700, nearPass: 560 },
      domainDrills: {
        'Operating Systems':       'Windows install & config · command line · macOS/Linux · file systems',
        'Security':                'malware · social engineering · authentication · workstation hardening',
        'Software Troubleshooting':'OS & app issues · malware removal · mobile & security symptoms',
        'Operational Procedures':  'documentation · change management · safety · communication & professionalism'
      }
    },

    'sc900': {
      name: 'SC-900',
      examCode: 'SC-900',
      slug: 'sc900',
      scoreMin: 0,
      scoreMax: 1000,
      bands: { ready: 820, onPace: 700, nearPass: 560 },
      domainDrills: {
        'Security, Compliance & Identity Concepts': 'shared responsibility · zero trust · encryption & hashing · compliance basics',
        'Microsoft Entra':                          'identities & authentication · MFA & conditional access · identity governance',
        'Microsoft Security Solutions':             'Defender suite · Sentinel (SIEM/SOAR) · Microsoft Secure Score',
        'Microsoft Compliance Solutions':           'Purview · data classification & DLP · insider risk · eDiscovery'
      }
    },

    'clfc02': {
      name: 'AWS Cloud Practitioner',
      examCode: 'CLF-C02',
      slug: 'clfc02',
      scoreMin: 0,
      scoreMax: 1000,
      bands: { ready: 820, onPace: 700, nearPass: 560 },
      domainDrills: {
        'Cloud Concepts':            'cloud value proposition · AWS Well-Architected · migration & economics',
        'Security & Compliance':     'shared responsibility · IAM · data protection · compliance programs',
        'Cloud Technology & Services':'compute & storage · networking · databases · global infrastructure',
        'Billing, Pricing & Support':'pricing models · cost-management tools · support plans · billing'
      }
    }
  };
})();
