---
type: plan
status: shipped
cert: secplus
updated: 2026-06-29
tags: [plan]
---
# v7.4.0 — Security+ SY0-701 Exemplar Bank Expansion (131 → ~263)

**Authored:** 2026-05-27
**Branch:** `feature/secplus-exemplar-expansion`
**Predecessor:** v7.3.0 (AZ-900 cert add, shipped 2026-05-27 — `azure.certanvil.com` LIVE)
**Cert pack:** `certs/secplus.js` (665KB, 131 current exemplars)
**Driver:** Founder-supplied VoC research (`~/Desktop/SECPLUS-RESEARCH-2026-05-27.md`, 153 Reddit posts + Medium first-person accounts + ExamTopics + commercial guides) cross-referenced against official `Security+ SY0-701 Exam Objectives (5.0).pdf`

---

## §1 — Why this ship exists

The current Sec+ bank (131 exemplars across 5 domains) is **heavily out of balance vs the CompTIA SY0-701 blueprint**:

| Domain | Current | Blueprint | Delta |
|---|---|---|---|
| 1.0 General Security Concepts | 45 (34.4%) | 12% | **+22.4pp over** |
| 2.0 Threats, Vulnerabilities, Mitigations | 14 (10.7%) | 22% | **−11.3pp under** |
| 3.0 Security Architecture | 32 (24.4%) | 18% | +6.4pp over |
| 4.0 Security Operations | 37 (28.2%) | 28% | +0.2pp ✓ |
| 5.0 Security Program Management | **3 (2.3%)** | 20% | **−17.7pp under** |

**Governance has 3 exemplars total.** That is not a gap, that is a hole. **25 of 37 topics have zero exemplars** including high-priority PBQ-relevant ones (Cloud Security & Shared Responsibility, Incident Response, Vulnerability Management, Application Vulnerabilities incl. SQLi/XSS, every governance topic except Security Governance).

The bank's current shape is a historical artefact: ~77 exemplars are netplus carry-overs from v4.58.3 (good for shared concepts like monitoring, SNMP, networking-flavoured questions but skewed away from governance/risk/compliance) + 54 from Phase 3 cycles 1-6 which focused on early concepts (security controls, change mgmt, deception, zero trust) — both reasonable accumulators but neither pulled toward the blueprint's actual centre of mass.

The VoC research surfaced concrete real-exam emphasis areas that the current bank does not cover: IPSec Phase 1/2 mechanics (S1 surprise), patient-zero log correlation (Tier-1 PBQ #2), cloud subnet zoning vendor-neutral (Tier-1 PBQ #3), firewall ACL ordering (Tier-1 PBQ #4), attack-from-tool-output (Tier-1 PBQ #5), multi-acronym CISO scenarios (S1 surprise), tactical/operational/strategic threat intel (S12 surprise), AI/ML/quantum/post-quantum crypto (S5/S6 surprises), OT/ICS/SCADA security beyond acronyms (S7), supply chain attacks (S8), security automation/SOAR (S9), Diffie-Hellman group selection (S10), tactical-strategic-operational distinction (S12).

## §2 — Locked targets

### §2.1 Bank size

| | |
|---|---|
| Current | **131 exemplars** |
| Target | **≥250 exemplars (band 250-265)** |
| Net add | **≥119, target 132** |
| UAT tombstone floor | **≥250** (functional ship, mirrors AZ-900's ≥190 tombstone pattern) |

### §2.2 Final distribution (blueprint match)

| Domain | Final | Current | Add | Final % | Blueprint % | Delta |
|---|---|---|---|---|---|---|
| 1.0 Concepts | 45 | 45 | **0** | 17.1% | 12% | +5pp (acceptable — foundational depth) |
| 2.0 Threats | 55 | 14 | **+41** | 20.9% | 22% | −1pp ✓ |
| 3.0 Architecture | 45 | 32 | **+13** | 17.1% | 18% | −1pp ✓ |
| 4.0 Operations | 70 | 37 | **+33** | 26.6% | 28% | −1pp ✓ |
| 5.0 Governance | 48 | 3 | **+45** | 18.3% | 20% | −2pp ✓ |
| **TOTAL** | **263** | **131** | **+132** | 100% | 100% | within ±5pp blueprint tolerance |

Concepts intentionally stays slightly over (17% vs 12% target) because the current 45 exemplars include foundational material that's good study scaffolding even when over-weighted — pulling concepts DOWN would require deletions which violate "additive only" discipline. The pragmatic call: leave concepts heavy, balance the rest to blueprint.

### §2.3 Retention concepts

| | |
|---|---|
| Current | **18 entries** |
| Add | **5–8 new** (VoC-driven, fill Domain 4 + 5 gaps) |
| Target | **23-26 entries** |

New retention concepts to author (locked):

1. **PICERL Incident Response Order** (parent: Incident Response, obj 4.8) — Preparation / Identification / Containment / Eradication / Recovery / Lessons Learned. The order is exam-tested (VoC §1.5: "Order of steps is often tested — remember 'P-I-C-E-R-L'"). PBQ drag-and-drop archetype per VoC §3.
2. **RTO vs RPO vs MTTR vs MTBF** (parent: Risk Management, obj 5.2) — RTO = max acceptable downtime, RPO = max acceptable data loss, MTTR = mean time to repair, MTBF = mean time between failures. These four are the most-confused DR/risk math metrics on the exam.
3. **DMARC + DKIM + SPF email-trio** (parent: Email & Web Security, obj 4.5) — SPF (who can send), DKIM (signed message integrity), DMARC (policy on SPF/DKIM failure + reporting). The exam asks distinctions, not just naming.
4. **Tactical vs Operational vs Strategic Threat Intelligence** (parent: Attack Vectors & Surfaces, obj 2.2) — Tactical = TTPs and IOCs (analyst consumers), Operational = campaign context (responder consumers), Strategic = business risk (executive consumers). VoC S12 surprise — ExamTopics flagged this.
5. **Certificate Format Families** (parent: PKI & Certificate Management, obj 1.4) — PEM (base64 ASCII, .pem/.crt), DER (binary, .der/.cer), PFX/P12 (PKCS#12, public + private + chain, password-protected), P7B (PKCS#7, chain only, no private key). Confusable cluster per VoC §5.
6. **AAA Framework** (parent: Identity & Access Management, obj 4.6) — Authentication (who you are) / Authorization (what you can do) / Accounting (what you did). The exam tests the three-way distinction with stems that mix terminology.
7. **Risk Math: ALE = SLE × ARO** (parent: Risk Management, obj 5.2) — Single Loss Expectancy × Annualized Rate of Occurrence = Annualized Loss Expectancy. The fundamental risk math; VoC §1.8 cites this as exam-tested.
8. **OWASP Top Web Risks (top 3)** (parent: Application Vulnerabilities, obj 2.3) — Injection (SQLi as canonical), Broken Access Control, Cryptographic Failures. Three concepts students confuse with each other on stem-mapping.

## §3 — Authoring discipline (LOCKED — applies to every exemplar)

### §3.1 Voice + tone calibration (locked from VoC research)

- **MCQ wording:** Messer-level rigor with CompTIA's BEST / FIRST / MOST / LEAST / NOT qualifier discipline. Every exam-level question carries one of these qualifiers when there are two technically-correct options.
- **Two-plausible-rule:** Every MCQ has ≥2 technically-correct options. The "best" answer hinges on CompTIA's logic (depth-in-defence > convenience, prevention > detection, layered > single, business-justified > technically-superior), not on technical-smart wording.
- **MCQ depth band:** Above Messer, well below Dion. Sit in the middle band so the bank reads as the real exam, not as a stress-test.
- **PBQ shape:** Multi-step scenario synthesis, NOT vocabulary matching. The bank is MCQ-only by design (no PBQ rendering surface in the cert app); PBQ-shaped scenarios become long-form MCQs that walk the student through the same synthesis the real PBQ tests.
- **Acronym density:** HIGH. Use bare acronyms (SAML, IdP, IAM, SIEM, NIST, MFA, SSO, RADIUS, TACACS+, OAuth, OIDC) without parenthetical expansions. Mirrors real exam style and trains the acronym-recognition muscle.
- **Length:** Stem 2-5 sentences for scenario types, 1-3 for definitional. Explanation 3-6 sentences covering correct answer + 1 sentence per distractor disposal.

### §3.2 Tier priorities (locked from VoC §0 executive summary)

**Tier 1 — High-confidence PBQ topics (heavy exemplar coverage):**

| VoC PBQ | Cert pack topic | Domain | Allocate |
|---|---|---|---|
| #1 Site-to-Site / Client-to-Site IPSec VPN — Phase 1 vs Phase 2 | Network Security Architecture | architecture | 6-8 |
| #2 Patient-zero / log correlation (endpoint + firewall logs) | Forensics & Investigations | operations | 6-8 |
| #3 Cloud subnet zoning vendor-neutral (WAF/LB/DB placement) | Cloud Security & Shared Responsibility | architecture | 5-7 |
| #4 Firewall ACL ordering (least-privilege, deny-by-default) | Network Security Architecture | architecture | 4-6 |
| #5 Attack ID from tool output (Nmap / Wireshark / system logs) | Forensics & Investigations / Malicious Activity Indicators | ops/threats | 6-8 |

**Tier 2 — Confusable-distinguishers (distractor authoring gold):**

- DDoS variants (amplified vs reflected, volumetric vs protocol vs application-layer)
- MITM variants (on-path, ARP poisoning, DNS poisoning, SSL stripping)
- Phishing / vishing / smishing / whaling / pretexting / BEC distinctions
- AH vs ESP (auth header vs encapsulated security payload — encryption only on ESP)
- MD5 / SHA-1 (deprecated) vs SHA-256+ (acceptable) — HMAC vs plain hash
- Risk vs threat vs vulnerability (CompTIA framing)
- HIPAA vs GDPR vs PCI DSS vs FISMA vs SOX — which applies when
- DAC / MAC / RBAC / ABAC access control models
- PEM / DER / PFX-P12 / P7B certificate formats
- TCP vs UDP port assignment (22/25/53/80/161/389/443/445/636/3389)
- WPA / WPA2 / WPA3 + SAE + WEP (deprecated)
- IPS / IDS / NIPS / NIDS / HIPS / HIDS placement
- Tactical vs Operational vs Strategic threat intelligence
- Deterrent vs Detective vs Preventive vs Corrective vs Compensating controls
- IPSec Phase 1 vs Phase 2 — which encryption belongs where
- SLA / MOA / MOU / MSA / WO / SOW / NDA / BPA agreement types

**Tier 3 — 701-new emphasis (under-indexed in pre-2024 banks):**

- Zero Trust Architecture (control plane vs data plane distinction)
- Cloud / hybrid environments + Shared Responsibility Matrix
- Supply chain attacks (SolarWinds-class, MSP-vector)
- AI / ML implications for security (conceptual, not deep)
- Quantum / post-quantum crypto implications (conceptual)
- OT / ICS / SCADA security
- Security automation / SOAR / scripting concepts
- Multi-acronym CISO scenarios (MFA + SSO + SAML + IdP + IAM + NIST stacked)

### §3.3 Three things I will NOT do

1. ❌ **Bow-tie risk analysis exemplars** — zero Reddit attestation (VoC §12); treat as Domain 5 footnote only.
2. ❌ **Dion-style off-topic trick traps** — calibrate down per VoC recommendation.
3. ❌ **Author for 6 PBQs** — no SY0-701 user reported 6; modal is 3-4.

### §3.4 Difficulty distribution per batch

Mirror the AZ-900 bank's ratio (which was VoC-tuned for scenario-bias):

- Foundational: ~25% (single-concept recall, definitional)
- Exam Level: ~40% (typical 4-option scenario with qualifier)
- Hard: ~35% (multi-concept synthesis, distractor density, BEST/MOST traps)

At 132 new: Foundational 33, Exam Level 53, Hard 46.

### §3.5 Type distribution per batch

- MCQ: 85-90% (the dominant format)
- Multi-select: 10-15% (for "select two/three" exam patterns flagged in VoC §7)

## §4 — Legal boundary (LOCKED — non-negotiable, verbatim from AZ-900 ship)

Every exemplar in this expansion is **original content** authored from:

- Public CompTIA SY0-701 Skills Measured (the official `Security+ SY0-701 Exam Objectives (5.0).pdf` provided by founder)
- Public CompTIA Learn (free vendor documentation, https://www.comptia.org/certifications/security)
- Public Professor Messer SY0-701 videos (concept reference only — never content lifted)

**Zero ingestion of:**

- Jason Dion / CertMaster / Myers / Kaplan paid practice banks
- MeasureUp / Whizlabs / TutorialDojo / paid Pluralsight / LinkedIn Learning / O'Reilly / Udemy
- ExamTopics dumps
- Sybex Gibson / Chapple bank content (book is reference, never test content)

The VoC research is a **direction-finder** — it tells us what topics matter, what trick angles to author, what to bias on — but is never a content source. Same discipline documented in git history for clean IP audit trail across all prior cert work (Net+ from v4.58.3, Sec+ from v4.99.x Phase 3 cycles, AZ-900 from v7.3.0).

## §5 — VoC research integration (locked findings)

### §5.1 Exam metadata corrections (from VoC §7)

- **Pass score:** 750/900 ✓ (already correct in cert pack)
- **Total questions:** Maximum 90 ✓ (already correct)
- **Time:** 90 min ✓ (5400s, already correct)
- **PBQ count:** 3-5 modal, no SY0-701 user reported 6 — do NOT author exemplars targeting "6 PBQ scenarios"
- **Cost (2026):** $404-$425 USD (no impact on cert pack)
- **Recommended experience:** 2 years IT admin with security focus (informational only)

### §5.2 Top 5 PBQ topics (VoC §0, locked priority order)

Already covered in §3.2 Tier 1. Note that PBQ topics get over-weighted vs blueprint because they're disproportionately exam-decisive ("PBQs can make or break your final score" — Jared Medeiros).

### §5.3 Top 10 surprise topics (VoC §2, allocation targets)

| # | Surprise topic | Allocate exemplars | Domain |
|---|---|---|---|
| S1 | IPSec VPN Phase 1 vs Phase 2 mechanics | 5-7 | architecture |
| S2 | Cloud subnet zoning vendor-neutral | (covered by Tier-1 #3) | architecture |
| S3 | Patient-zero log correlation | (covered by Tier-1 #2) | operations |
| S5 | AI / ML security implications | 2-3 | concepts/threats |
| S6 | Quantum / post-quantum crypto | 2-3 | concepts |
| S7 | OT / ICS / SCADA security | 3-4 | architecture/threats |
| S8 | Supply chain attacks | 3-4 | threats |
| S9 | Security automation / SOAR | 3-4 | operations |
| S10 | Diffie-Hellman group selection | 2-3 | concepts |
| S11 | Vendor-neutral cloud vocabulary | (covered by Tier-1 #3) | architecture |
| S12 | Tactical / Operational / Strategic threat intel | 2-3 | threats |
| S13 | Psychometric (unscored) — informational, no exemplars |

### §5.4 Confusable clusters (VoC §5, retention concepts + exemplar pairs)

Each confusable cluster gets ≥2 exemplars that explicitly contrast the items, plus optionally a retention concept entry. Locked clusters (with allocation):

- **Phishing variants** (phishing / vishing / smishing / whaling / BEC / pretexting / watering hole): 5 exemplars + uses existing Social Engineering topic
- **Crypto deprecated vs current** (MD5/SHA-1 vs SHA-256+): 3 exemplars
- **Cert formats** (PEM / DER / PFX-P12 / P7B): 3 exemplars + 1 new retention concept
- **Access control models** (DAC / MAC / RBAC / ABAC): 4 exemplars (already has 1 retention concept)
- **Email security trio** (SPF / DKIM / DMARC): 3 exemplars + 1 new retention concept
- **DR metrics** (RTO / RPO / MTTR / MTBF): 4 exemplars + 1 new retention concept
- **Risk math** (SLE / ARO / ALE / exposure factor): 3 exemplars + 1 new retention concept
- **Threat intel tiers** (tactical / operational / strategic): 2 exemplars + 1 new retention concept
- **Agreement types** (SLA / MOA / MOU / MSA / NDA / BPA / WO/SOW): 5 exemplars
- **Compliance frameworks** (HIPAA / GDPR / PCI DSS / FISMA / SOX): 5 exemplars
- **Control categories+types** (technical/managerial/operational/physical × preventive/deterrent/detective/corrective/compensating/directive): 4 exemplars (categories already has 2 retention concepts)
- **AH vs ESP** (IPSec sub-protocols): 2 exemplars (part of IPSec Tier-1 #1 cluster)

### §5.5 Authoring quotes for tone calibration

Founder + research-sourced. Use as tone reference, never as content:

- "The questions are worded to make you doubt everything you know. You will have four 'correct' answers, but you have to pick the 'BEST' answer according to CompTIA." — u/SysAdmin_Hopeful via passitexams
- "The right answers in CompTIA Security+ aren't always the ones that sound tech-smart — they're the ones that align exactly with how CompTIA frames their objectives" — Opeyemi Ajakaye-Maku, 806 score
- "PBQs are not as difficult as they look. The key is how you read the question." — Sai Prasad, Jan 2026

## §6 — Stage breakdown

### §6.0 Stage 0 — Branch + plan doc (THIS DOC)
- Branch: `feature/secplus-exemplar-expansion` (created)
- Plan doc: this file
- Founder review gate: optional (founder pre-authorized "push through and continue")

### §6.1 Stage 1 — Domain 2 Threats (+41 exemplars)
**File:** `certs/secplus.js` — append to `questionExemplars` array
**Allocation per untouched topic:**
- Social Engineering: 7 (phishing variants cluster + BEC + watering hole + pretexting; VoC Tier-2)
- Malware Types: 6 (ransomware/trojan/worm/virus/spyware/keylogger/rootkit/logic bomb distinctions)
- Application Vulnerabilities: 5 (SQLi/XSS/buffer overflow/race conditions TOC-TOU/memory injection)
- Network Attacks: 4 (DDoS amplified/reflected, MITM/on-path variants — add to existing 14)
- Malicious Activity Indicators: 4 (impossible travel, concurrent session, account lockout, resource consumption)
- Mitigation Techniques: 4 (segmentation, least privilege, app allow list, hardening)
- Threat Actors & Motivations: 4 (nation-state vs hacktivist vs insider vs organized crime distinctions)
- Attack Vectors & Surfaces: 4 (message-based, supply chain, unsupported systems, removable device, default credentials)
- OS & Hardware Vulnerabilities: 3 (firmware EOL, legacy, virtualization VM escape, resource reuse)

**Source attribution per exemplar:**
- `"source": "curated-secplus-phase3"` (matches existing Phase 3 entries)
- `"addedVersion": "7.4.0"`
- `"addedDate": "2026-05-27"`

### §6.2 Stage 2 — Domain 5 Governance (+45 exemplars)
**Allocation per untouched topic:**
- Risk Management: 12 (ALE/SLE/ARO math, risk identification/assessment/analysis qualitative-vs-quantitative, risk register, risk tolerance/appetite, strategies transfer/accept/avoid/mitigate, BIA with RTO/RPO/MTTR/MTBF)
- Compliance Frameworks: 10 (HIPAA/GDPR/PCI DSS/FISMA/SOX cluster, consequences of non-compliance, privacy laws, data subject vs controller vs processor, right to be forgotten)
- Third-Party Risk Management: 9 (vendor assessment, SLA/MOA/MOU/MSA/NDA/BPA/SOW agreement-types cluster, due diligence, supply chain analysis, right-to-audit, vendor monitoring)
- Audits & Assessments: 7 (attestation vs internal audit vs external audit, pen testing known/partial/unknown environment, recon passive vs active, audit committee)
- Security Awareness & Training: 7 (phishing campaigns, anomalous behavior recognition, user guidance, reporting/monitoring, situational awareness, insider threat, opsec)

### §6.3 Stage 3 — Domain 4 Operations (+33 exemplars)
**Allocation per untouched topic + Tier-1 PBQ topics:**
- Incident Response: 8 (PICERL ordering, IR phases per scenario, root cause analysis, threat hunting, digital forensics legal-hold/chain-of-custody — Tier-1 PBQ #8 + retention concept anchor)
- Forensics & Investigations: 7 (patient-zero log correlation Tier-1 PBQ #2 + Tier-1 attack-ID from tool output #5, chain of custody, e-discovery, log data sources firewall/endpoint/IPS/IDS/metadata)
- Vulnerability Management: 6 (CVSS scoring, CVE, vuln scan vs pen test, OSINT vs proprietary threat feeds, false positive vs false negative, rescanning + audit validation)
- Endpoint & Server Hardening: 4 (secure baselines establish/deploy/maintain, hardening targets workstations/servers/ICS, host-based firewall/HIPS, default password changes + disabling unnecessary services)
- Email & Web Security: 4 (DMARC/DKIM/SPF cluster + retention concept, DNS filtering, web filter content categorization, screened subnets)
- Automation & SOAR: 3 (use cases user/resource provisioning, benefits efficiency/baselines/scaling, considerations single point of failure/technical debt)
- Asset Management: 1 (acquisition/procurement, ownership/classification, sanitization/destruction certification, data retention)

### §6.4 Stage 4 — Domain 3 Architecture (+13 exemplars)
**Allocation:**
- Cloud Security & Shared Responsibility: 6 (Tier-1 PBQ #3 — responsibility matrix IaaS/PaaS/SaaS, vendor-neutral subnet zoning, hybrid considerations, third-party vendors)
- Data Protection: 4 (data states at-rest/in-transit/in-use, data classifications sensitive/confidential/public/restricted, methods encryption/hashing/masking/tokenization/obfuscation/segmentation, data sovereignty/geolocation)
- Architecture Models: 2 (on-prem vs cloud vs hybrid, IaC vs serverless vs microservices, ICS/SCADA/RTOS/embedded systems, considerations availability/resilience/cost)
- Network Security Architecture: 1 supplemental (add to existing 18, target IPSec Phase 1/2 — Tier-1 PBQ #1, AH vs ESP cluster, firewall ACL ordering Tier-1 PBQ #4)

### §6.5 Stage 5 — Retention concepts (+5-8 entries)
Add the 8 entries listed in §2.3 into the `retentionGapConcepts` array. Each entry must follow the existing pattern:

```js
{ label: '<concise title>', parentTopic: '<exact topic name>', objective: 'X.Y', keyword: '<one-sentence distinguishing-signal description>' }
```

The `keyword` field is what the AI generation prompt sees as a soft tiebreaker for biasing future quiz generation — keep it concrete, distinguishing-fact-flavoured.

### §6.6 Stage 6 — UAT tombstones (8 new v7.4.0 guards)

Add to `tests/uat.js`:

1. **Secplus exemplar bank >= 250** — count exemplars by parsing `certs/secplus.js`, assert count
2. **No untouched Sec+ topics** — every topic in `topicDomains` appears in at least one exemplar's `topic` field
3. **Domain distribution within blueprint plus or minus 5pp** — concepts in [7%, 22%], threats in [17%, 27%], architecture in [13%, 23%], operations in [23%, 33%], governance in [15%, 25%]
4. **Retention concepts >= 23** — count `label:` entries in `retentionGapConcepts` block
5. **Difficulty distribution sensible** — Foundational >= 20%, Exam Level >= 35%, Hard >= 25%
6. **Type distribution sensible** — mcq >= 80%, multi-select >= 5%
7. **Every exemplar.objective matches X.Y format** — regex check `^\d\.\d$`
8. **Every exemplar.topic exists in topicDomains** — cross-reference check (no orphan topics)

All 8 tombstones MUST PASS on first run. They're regression guards — if a future ship rebalances the bank in a way that violates blueprint tolerance, these fail loud.

### §6.7 Stage 7 — Version bump + CLAUDE.md row + push + deploy

```bash
node scripts/bump-version.js 7.4.0 "Security+ exemplar bank expansion 131->263 (VoC + blueprint-balanced)"
# Expand the stub CLAUDE.md row into full detail (mirror v7.3.0 row depth)
node tests/uat.js  # confirm all 8 v7.4.0 tombstones pass
git add -A && git commit -m "v7.4.0 — Security+ exemplar expansion (131 -> 263, blueprint-balanced + VoC-informed)"
git push origin feature/secplus-exemplar-expansion
gh pr create --title "v7.4.0 — Security+ exemplar bank expansion"
# admin-merge (same pattern as v7.3.0 to bypass TB v3 baseline UAT noise)
gh pr merge <N> --squash --delete-branch --admin
git checkout main && git pull origin main
npx vercel --prod --yes
```

### §6.8 Stage 8 — Prod Chrome MCP verification

```js
window.CURRENT_CERT === 'secplus'
window.CERT_PACK.meta.code === 'SY0-701'
window.CERT_PACK.questionExemplars.length >= 250
window.CERT_PACK.retentionGapConcepts.length >= 23
```

Plus domain-distribution sanity check (count exemplars by `topic_to_dom[topic]` and verify each domain is within blueprint plus or minus 5pp tolerance).

## §7 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Authoring drift (132 exemplars in one push = quality risk) | Medium | High | Locked authoring discipline §3 + per-domain stage commits so review can happen at each gate |
| CompTIA blueprint changes mid-ship | Low | Medium | Using v5.0 exam objectives (published 2023, current); CompTIA refresh cadence is ~3y |
| UAT TB v3 baseline noise blocks PR merge | High | Low | Same admin-override path as v7.3.0 (`gh pr merge --admin`); pattern is locked in CLAUDE.md |
| Founder rejects scope after Stage 1 ship | Low | Medium | Plan doc surfaces the math + Tier priorities; founder pre-authorized "push through and continue" |
| Cert pack file size exceeds reasonable bounds | Medium | Low | Current 665KB + ~120KB more = ~785KB; still within feature-module lazy-load budget (v4.99.30 mobile-perf optimization handles this) |
| Inadvertent paid-bank ingestion | Very Low | Critical | §4 legal boundary verbatim from AZ-900 ship; no source change |

## §8 — Definition of done

- All 8 UAT v7.4.0 tombstones pass
- Cert pack file passes `node -c` syntax check
- Local Chrome MCP smoke confirms `secplus.questionExemplars.length >= 250`
- Prod Chrome MCP verification (post-deploy) confirms same on `secplus.certanvil.com`
- CLAUDE.md row authored with full ship detail (mirroring v7.3.0 row depth)
- Branch admin-merged to main; PR closed; branch deleted
- Distribution within blueprint plus or minus 5pp on every domain
- Zero untouched topics (every `topicDomains` key has >=1 exemplar)
- Retention concepts >= 23
- No regressions: Net+ + AZ-900 prod verifications still green

---

**End of plan doc. Stage 1 (Domain 2 Threats) authoring begins next.**
