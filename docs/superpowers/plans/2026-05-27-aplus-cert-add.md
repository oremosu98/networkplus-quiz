---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# CompTIA A+ — Fifth Cert (Dual-Exam) Add to CertAnvil

**Plan date:** 2026-05-27 (post-v7.5.0 AI-900 ship)
**Target ship:** v7.6.0 (minor bump — new cert family is a feature, not a hotfix)
**Precedent:** v7.5.0 AI-900 ship (fourth cert; Pattern A subdomain, Pro-tier gate, 200-exemplar bank, VoC integration)
**Cert sources:**
- CompTIA A+ 220-1201 Core 1 Exam Objectives v4.0 (`~/Desktop/Course guides/CompTIA A+ 220-1201 Exam Objectives (4.0).pdf`)
- CompTIA A+ 220-1202 Core 2 Exam Objectives v4.0 (`~/Desktop/Course guides/CompTIA A+ 220-1202 Exam Objectives (4.0).pdf`)
**VoC research:**
- `~/Desktop/APLUS-CORE1-RESEARCH-2026-05-27.md` (53 r/CompTIA threads, 986 posts/comments)
- `~/Desktop/APLUS-CORE2-RESEARCH-2026-05-27.md` (199 threads, 378 parsed comments, 65k chars verbatim text)

---

## 1 — Spec (what + why)

### What
Add **CompTIA A+** as the fifth cert family in CertAnvil. **A+ is unique among the prior 4 certs: it requires passing BOTH 220-1201 (Core 1) AND 220-1202 (Core 2) to earn the certification.** This drives a new architectural pattern within the existing Pattern A subdomain strategy:

- **Single subdomain**: `aplus.certanvil.com` shared between Core 1 and Core 2 (cert family precedent — AZ-900 §9 #2 lock applies cleanly here since Core 1 + Core 2 are the same cert family by CompTIA's own definition).
- **Two cert packs**: `certs/aplus-core1.js` + `certs/aplus-core2.js` — each treated as a distinct entry in `getAvailableCerts()` so the cert switcher can show BOTH exams as selectable options.
- **Internal exam switcher**: when the user is on `aplus.certanvil.com`, the cert switcher dropdown shows TWO A+ entries (Core 1, Core 2) plus the other 4 certs. Switching between Core 1 ↔ Core 2 stays in-app (no subdomain navigation needed — same host).
- **Pro tier** for both exams.

### Why
- **Fifth cert validates the cert-family pattern** — A+ is one certification with two exams. Proves the cert pack abstraction handles compound cert families (precedent for future Microsoft tracks like AZ-104/204/305 sharing `azure.` per the §9 #2 lock).
- **A+ is the largest entry-point cert by volume** — by far the most-attempted IT cert globally (CompTIA reports 300K+ takers/year per cert family). High Pro-tier upgrade-driver potential.
- **Personal goal**: founder taking A+ after Net+/Sec+/AZ-900/AI-900 to broaden the multi-cert dogfood.
- **Competitor differentiator**: VoC Core 1 §13 + Core 2 §11 confirm Tutorial Dojo + CertMaster Learn have known gaps; Dion is over-tuned (harder than real exam). CertAnvil's pack with VoC-informed difficulty calibration + the dual-exam unified UX fills the gap legally.

### Non-goals
- **No new app architecture** — every cert-aware surface reads `CERT_PACK` + `CURRENT_CERT` + `TOPIC_DOMAINS` + `DOMAIN_WEIGHTS` at runtime. Adding two A+ cert packs follows the same pattern as adding any single cert. Zero render-LOGIC change. The v7.3.0 / v7.5.0 ships proved this; v7.6.0 proves it scales to dual-exam families.
- **No exam-format changes** — Core 1 has 80 Q / 90 min / 675 pass / 900 max. Core 2 has 80 Q / 90 min / 700 pass / 900 max. Both per CompTIA + VoC verification. `CERT_PACK.meta` already handles per-cert exam shape.
- **No new monetization mechanics** — Pro-tier gate behaviour identical to v7.5.0 AI-900 (visible in switcher, gated at switch time via `tadSwitchCert`).
- **No paid-bank content ingestion** — original exemplar authoring from public CompTIA A+ Exam Objectives PDFs + the founder's VoC research only. Same legal discipline as Net+/Sec+/AZ-900/AI-900 banks.

### Out-of-scope (deferred follow-ups)
- A+ Phase 3 retention concept seeding beyond initial — defer until founder hits gaps in real study.
- A+ GT tables (deterministic-fact tables) — A+ has potential candidates (well-known TCP/UDP ports table, RAID levels enum, malware-removal-step ordering, MFA factor categories) but defer until a clear pattern emerges.
- Cross-exam achievement tracking ("Earn full A+ by passing both") — not in scope; users see per-exam readiness independently. Future v7.6.x can add a "Full A+" dashboard.
- Custom Quiz mode for "mixed Core 1 + Core 2 questions" — defer; current v7.5.0 architecture doesn't support cross-cert quizzes.

---

## 2 — Locked decisions

| # | Decision | Locked value | Rationale |
|---|---|---|---|
| 1 | Cert IDs | `aplus-core1` + `aplus-core2` | Descriptive prefix matches CompTIA's "Core 1 / Core 2" naming. Two distinct IDs because each exam has its own blueprint + exemplar bank. |
| 2 | Pattern A subdomain | **`aplus.certanvil.com`** (LOCKED — shared between both exams per AZ-900 §9 #2 cert-family precedent; A+ is ONE certification with TWO exams) | Single CompTIA cert family. Cert switcher dropdown shows BOTH exams as selectable rows. Future CompTIA add-ons under A+ umbrella (if CompTIA ever splits further) co-exist on same subdomain. |
| 3 | Exam metadata Core 1 — VoC baked upfront | `examPassScore: 675` / `examMaxScore: 900` / `examQuestionCount: 80` / `examTimeSeconds: 5400` (90 min) | Per VoC §7 + Core 1 PDF objectives. Multiple independent recall reports cluster at 75-80 Q (modal 80); 90-min timer; 675/900 passing. |
| 4 | Exam metadata Core 2 — VoC baked upfront | `examPassScore: 700` / `examMaxScore: 900` / `examQuestionCount: 80` / `examTimeSeconds: 5400` (90 min) | Core 2 passing score is **700 (NOT 675 like Core 1)** per VoC §7 + CompTIA spec. Same Q count + time as Core 1. |
| 5 | Domain weight encoding Core 1 | Mobile 9% / Networking 20% / Hardware 25% / Virt+Cloud 11% / Troubleshooting 29% (sums ~94% — CompTIA exact ranges; trailing 6% absorbed by Hardware/Troubleshooting per actual blueprint) | Per Core 1 PDF blueprint + VoC §10 "220-1101 vs 220-1201 shift signals" (Virt+Cloud up from 7% → 11%; Mobile down from 15% → 9%). |
| 6 | Domain weight encoding Core 2 | Operating Systems 28% / Security 28% / Software Troubleshooting 22% / Operational Procedures 22% (sums to 100%) | Per Core 2 PDF blueprint. Domains 1+2 dominate; both at 28%. |
| 7 | Domain count per exam | **4 for Core 2** (vs 5 for Core 1) | Per CompTIA blueprint. Core 1 has 5 domains; Core 2 has 4. Need to handle both in `_renderTopicChipsForActiveCert` — likely add a 6-way ternary (Net+/Sec+/AZ-900/AI-900/aplus-core1/aplus-core2 with `_CANONICAL_APLUS_CORE1` + `_CANONICAL_APLUS_CORE2` constants). |
| 8 | Domain IDs Core 1 | `mobile-devices`, `networking`, `hardware`, `virt-cloud`, `troubleshooting-hw-net` | Lowercase, hyphen-separated, descriptive. Mirrors prior cert short-token convention. |
| 9 | Domain IDs Core 2 | `operating-systems`, `security`, `software-troubleshooting`, `operational-procedures` | Same convention. |
| 10 | Tier (Free vs Pro) | Both Pro | Per v7.1.0 + v7.3.0 + v7.5.0 founder lock for paid-feature certs. |
| 11 | Topic count target | ~45 per exam (90 total) | Net+ has 50, Sec+ has 37, AZ-900 has 41, AI-900 has 40. A+ Core 1 (5 domains × ~9 topics) + Core 2 (4 domains × ~11 topics) ≈ 45 each. Both exams have rich topic surfaces. |
| 12 | Exemplar count target | **200 per exam = 400 total** | Same per-exam baseline as Net+/Sec+/AZ-900/AI-900 (200). Total is double because A+ is dual-exam. VoC requires per-exam VoC-informed bias (Core 1: RAID config+repair, printers, cloud-model depth, DNS TXT records; Core 2: social engineering distinctions, command-line cross-OS, malware-symptom diagnosis, "5 ways to access a tool"). |
| 13 | Legal boundary | Original content from PUBLIC CompTIA A+ Exam Objectives v4.0 PDFs (Core 1 + Core 2) + the founder's VoC research as DIRECTION-FINDER only | **Zero ingestion of paid-bank content**: Jason Dion (Udemy + practice tests) · Mike Meyers (Pearson book) · Exam Cram (Pearson) · CertMaster (CompTIA's own paid) · Skillcertpro · BurningIceTech Patreon · Crucial Exams · MeasureUp · Whizlabs · TutorialDojo · paid Pluralsight · paid LinkedIn Learning · O'Reilly · Udemy · ExamTopics dumps. VoC research = direction-finder only. |
| 14 | Question-format note | Core 1: 5-6 PBQs (modal) / 75-80 total Qs. Core 2: 3-5 PBQs (modal 4) / 77-90 Qs. Both: 90 minutes. Mostly MCQ + multi-select; drag-and-drop reported on Core 2 ("phishing/vishing matching") | CertAnvil engine emits 5 question types. For A+ both exams: bulk into `mcq` (85%) + `multi-select` (10%) + `order` (5% — for malware-removal-step ordering + cloud-deployment ordering scenarios). |
| 15 | Cert-switcher copy | "CompTIA A+ Core 1" + "220-1201" short code; "CompTIA A+ Core 2" + "220-1202" short code; same bronze accent | Editorial consistency. CompTIA prefix matches Net+/Sec+ pattern (CompTIA-named certs prefix with vendor). |
| 16 | Ship cadence | **Single comprehensive v7.6.0 ship** OR split (v7.6.0 Core 1 first + v7.7.0 Core 2 second) | Founder choice. Default: single v7.6.0. Split available if cost/time pressure becomes acute. See §9 Q4. |

---

## 3 — Files affected (full inventory)

### Cert-app side

| File | Change | Why |
|---|---|---|
| `certs/aplus-core1.js` | **NEW** | Cert pack data for Core 1. Modeled on `certs/ai900.js`. Estimated 4-6K lines after exemplar authoring. |
| `certs/aplus-core2.js` | **NEW** | Cert pack data for Core 2. Same shape, 4 domains. Estimated 4-6K lines after exemplar authoring. |
| `index.html` | MODIFY | (a) Inline IIFE Pattern A check (lines 59-94) — add `aplus.` / `aplus-` / `aplus.certanvil.com` patterns mapping to **default `'aplus-core1'`** (Core 1 is the natural entry; user can switch to Core 2 via in-app cert switcher). (b) Add localStorage `nplus_dev_cert` override branch for both `'aplus-core1'` and `'aplus-core2'`. (c) Document.title branches for both exams. (d) `data-cert` accepts both. |
| `app.js` | MODIFY | (a) `detectCert()` Pattern A block — same `aplus.` patterns mapping to default `'aplus-core1'`. (b) Add localStorage whitelist entries for both. (c) Class-of-bug-grep audit for any hardcoded 4-cert literals via grep sweep (Appendix A). (d) Add `_CANONICAL_APLUS_CORE1` + `_CANONICAL_APLUS_CORE2` consts. (e) Extend `CANONICAL_DOMAIN_TOPICS` ternary to **6-way** (Net+/Sec+/AZ-900/AI-900/Core1/Core2). (f) Add `_renderCertAwareCopy` handling for compound name "CompTIA A+ Core 1" / "CompTIA A+ Core 2". |
| `auth-state.js` | MODIFY | (a) `getAvailableCerts(role)` adds BOTH A+ Core 1 + A+ Core 2 entries. (b) `getActiveCertId()` host detection — `aplus.certanvil.com` branch defaulting to `'aplus-core1'` but respecting localStorage override for in-app switching. (c) `tadSwitchCert(certId)` Pro-gate for both. (d) Add target-host branch for both — both navigate to `aplus.certanvil.com` (same host) but write localStorage to differentiate the active exam. **Critical: this is the FIRST cert switch that doesn't change subdomain — needs careful navigation logic.** (e) `buildCertSwitcherHtml` auto-picks up via iteration. |
| `tests/uat.js` | MODIFY | Add ~12 v7.6.0 tombstones (each cert pack declaration ×2 + detection 3-file mirror + iteration + count + weights ×2 + topics ×2 + exemplar consistency ×2 + within-subdomain Core 1/Core 2 switching behavior). Load both cert pack sources at module scope: `certAplusCore1 = read('certs/aplus-core1.js')` + `certAplusCore2 = read('certs/aplus-core2.js')`. |
| Version triad | MODIFY | `node scripts/bump-version.js 7.6.0 "..."` updates `package.json`/`sw.js`/`styles.css`/`index.html`/`app.js APP_VERSION`/CLAUDE.md stub row. |
| `CLAUDE.md` | MODIFY | New v7.6.0 row at top, expand stub into comprehensive narrative (post-bump). |
| `dg-system.css` | MODIFY (possibly no-op) | No domain-count CSS rule needed (Core 1 = 5 domains matching Net+/Sec+/AI-900; Core 2 = 4 domains — check if any rule needs to hide domain-idx 5 for Core 2 only). |

### Landing site (`landing/`)

| File | Change | Why |
|---|---|---|
| `landing/index.html` | MODIFY | TWO new `#cert-tile-aplus-core1` + `#cert-tile-aplus-core2` blocks. Both link to `https://aplus.certanvil.com/` with `?exam=` query param for the cert switcher to honor on arrival. Status pill "Live · Pro" on each. Meta description mentions all 6 (or "Network+, Security+, AZ-900, AI-900, A+ Core 1 + Core 2"). |
| `landing/auth.js` | MODIFY | Confirm cert tile visibility iterates `getAvailableCerts()` cleanly at 6 certs (4 prior + 2 A+). |
| `landing/diagnostic/index.html` | MODIFY | Add TWO A+ diagnostic tiles (Core 1 + Core 2) entries. |
| `landing/diagnostic/aplus-core1/` | **NEW** | New flow: `index.html` (intake) + `quiz.html` (20-Q diagnostic) + `results.html` (rich results). Cloned from `azure-ai-fundamentals/` template. |
| `landing/diagnostic/aplus-core2/` | **NEW** | Same shape; cloned + cert-aware swap. |
| `landing/api/diagnostic/generate.js` | MODIFY | Add TWO new cert branches (`aplus-core1` + `aplus-core2`) with vendor-aware CompTIA prompts. Same 5-domain (Core 1) + 4-domain (Core 2) blueprint. |
| `landing/script.js` | MODIFY | Any A+ tile-reveal logic + cert-iteration code. |
| `landing/dg-system.css` | MODIFY (possibly no-op) | A+ tile styling if diverges from `.cert-tile` shared rules. |
| `landing/lib/cross-cert-analytics.js` | MODIFY | Verify constellation visualisation handles 6 certs cleanly (currently 4). |
| `landing/lib/cross-cert-overlap.js` | MODIFY | Add 10 new directional overlap entries: **Core 1 ↔ Core 2 (high — ~40% shared cert family)** + Core 1 ↔ Net+ (medium-high — networking overlap) + Core 1 ↔ Sec+ (low) + Core 1 ↔ AZ-900 (low — basic cloud) + Core 2 ↔ Sec+ (medium — security overlap) + Core 2 ↔ Net+ (low). Plus reverse directionals. |

### Founder manual

| Action | Where |
|---|---|
| DNS: `CNAME aplus → cname.vercel-dns.com` | certanvil.com DNS provider (mirror existing `networkplus`/`secplus`/`azure`/`ai` CNAMEs) |
| Vercel: add `aplus.certanvil.com` as domain alias | `networkplus-quiz` Vercel project → Settings → Domains |

---

## 4 — Stage-by-stage plan

### Stage 0 — Pre-flight + branch
1. `cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"`
2. `git checkout main && git pull` (current main: v7.5.0 squash commit `ab4f519`)
3. `git checkout -b feature/aplus-cert`
4. Run `node tests/uat.js` baseline — capture pass/fail count.
5. Read both PDFs (Core 1 + Core 2 Exam Objectives) for topic catalog accuracy. **Skip Mike Meyers + Pearson + CertMaster + paid-bank materials entirely** per §10 legal boundary.

### Stage 1 — Cert pack scaffolds (×2)

**1a — `certs/aplus-core1.js`** scaffold per `certs/ai900.js`:
- meta: id `aplus-core1`, name "CompTIA A+ Core 1", code "220-1201", 80 Q / 90 min / 675 pass / 900 max
- 5 domains × ~9 topics each (~45 topics)
- 8 retention concepts pre-seeded from VoC:
  1. RAID Configuration vs Naming (RAID 0/1/5/10 properties + how to configure + how to repair failed disk)
  2. Cloud Service Models depth (IaaS vs PaaS vs SaaS scenario mapping)
  3. Cloud Deployment Models (Public vs Private vs Hybrid vs Community scenarios)
  4. Cloud Characteristics (Rapid elasticity vs On-demand self-service vs Measured service vs Resource pooling)
  5. DNS Record Types incl. SPF/DKIM/DMARC (TXT-record sub-types — surprising for Core 1)
  6. Wi-Fi Standards + Generations (802.11a/b/g/n/ac/ax/be + Wi-Fi 4/5/6/6E/7)
  7. Cellular Generations (3G/4G LTE/5G NR + bands)
  8. Mobile Troubleshooting (Screen burn-in / Swollen battery / Battery swap procedure)

**1b — `certs/aplus-core2.js`** scaffold:
- meta: id `aplus-core2`, name "CompTIA A+ Core 2", code "220-1202", 80 Q / 90 min / 700 pass / 900 max
- 4 domains × ~11 topics each (~45 topics)
- 8 retention concepts pre-seeded from VoC:
  1. Social Engineering Family (Phishing / Spear / Whaling / Vishing / Smishing / Pretexting / Tailgating / Piggybacking — distinct distinctions)
  2. Malware 7-Step Removal Procedure (Identify → Quarantine → Disable System Restore → Remediate → Schedule scans → Enable Restore → Educate user)
  3. Windows Editions Feature Matrix (Home vs Pro vs Pro for Workstations vs Enterprise vs Education — BitLocker / Group Policy / Hyper-V / RDP host / Domain Join availability)
  4. Multi-Path Tool Access (5 ways to reach Disk Management / Event Viewer / Services / Task Manager: Settings vs Control Panel vs Run/mmc vs context menu vs CLI)
  5. NTFS vs Share Permissions (precedence rules + Principle of Least Privilege)
  6. Cross-OS Command Set (Windows ipconfig/netstat/sfc/chkdsk + Linux apt/sudo/chmod/grep + macOS Time Machine/Keychain — distinct purposes per OS family)
  7. Backup Methodology + 3-2-1 Rule (Full vs Incremental vs Differential vs Synthetic — restore order)
  8. MFA Factor Categories (Knowledge / Possession / Inherence / Behavior / Location — categorize examples)

Commits:
- `feat(aplus): cert pack scaffolds — Core 1 (5 domains, 45 topics) + Core 2 (4 domains, 45 topics)` (one commit for both pack files)

### Stage 2 — Cert detection (3-file mirror)

Per the v7.2.2 / v7.3.0 / v7.5.0 class-of-bug-grep lesson — same-commit lockstep across all 3 detection surfaces.

**2a — `app.js detectCert()`** — add `aplus.` Pattern A block:
```javascript
if (host.indexOf('aplus.') === 0
    || host.indexOf('aplus-') === 0
    || host === 'aplus.certanvil.com') {
  // Both Core 1 + Core 2 share aplus. subdomain. Default to Core 1 on cold
  // subdomain entry; localStorage override differentiates the two for
  // returning users + in-app cert switcher.
  try {
    var dev = localStorage.getItem('nplus_dev_cert');
    if (dev === 'aplus-core1' || dev === 'aplus-core2') return dev;
  } catch (e) {}
  return 'aplus-core1';
}
```

**2b — `index.html` inline IIFE** — equivalent block + document.title branches for both exams.

**2c — `auth-state.js getActiveCertId()`** — equivalent host detection.

**2d — `app.js` localStorage whitelist** — extend to accept both `'aplus-core1'` AND `'aplus-core2'` as valid dev override values.

**2e — Single commit** per class-of-bug-grep discipline.

Commit: `feat(aplus): cert detection — Pattern A subdomain wiring with Core 1/Core 2 dual-exam routing`

### Stage 3 — Cert switcher + Pro gate + render-LOGIC

**3a — `auth-state.js getAvailableCerts(role)`** — add BOTH entries:
```javascript
{ id: 'aplus-core1', name: 'CompTIA A+ Core 1', code: '220-1201', tier: 'pro' },
{ id: 'aplus-core2', name: 'CompTIA A+ Core 2', code: '220-1202', tier: 'pro' }
```

**3b — `auth-state.js tadSwitchCert(certId)`** — add Pro-gate branches for both `'aplus-core1'` and `'aplus-core2'`. **Critical: tadSwitchCert target-host branch must handle within-subdomain switching** — when switching from Core 1 → Core 2 (or vice versa), DON'T navigate to a different host; just write the new cert ID to `nplus_dev_cert` localStorage + reload. This is the FIRST cert switch that stays within the same subdomain.

**3c — `buildCertSwitcherHtml`** — should auto-populate via iteration at 6 certs.

**3d — Home page domain grid cert-aware render** — extend the 4-way ternary to 6-way:
```javascript
const _CANONICAL_APLUS_CORE1 = { /* 5 domains × 5 topics each */ };
const _CANONICAL_APLUS_CORE2 = { /* 4 domains × 5 topics each */ };
const CANONICAL_DOMAIN_TOPICS =
  (CURRENT_CERT === 'secplus')       ? _CANONICAL_SECPLUS
: (CURRENT_CERT === 'az900')         ? _CANONICAL_AZ900
: (CURRENT_CERT === 'ai900')         ? _CANONICAL_AI900
: (CURRENT_CERT === 'aplus-core1')   ? _CANONICAL_APLUS_CORE1
: (CURRENT_CERT === 'aplus-core2')   ? _CANONICAL_APLUS_CORE2
:                                       _CANONICAL_NETPLUS;
```

**3e — Vendor-aware cert-aware copy** — `_renderCertAwareCopy` reads `meta.name.split(' ')[0]` for vendor extraction. For "CompTIA A+ Core 1" this yields "CompTIA" (same as Net+/Sec+, free reuse).

**3f — dg-system.css scoped rule** — Core 1 has 5 domains (matches Net+/Sec+); Core 2 has 4 domains — verify no inadvertent domain-idx-5 leak for Core 2. May need `html[data-cert="aplus-core2"]` rule to hide domain-idx 5 (similar to AZ-900 §9 pattern but for 4-domain case).

Commit: `feat(aplus): cert switcher + Pro gate + render-LOGIC fixes (Core 1/Core 2 dual-cert, 6-way canonical ternary, within-subdomain switching)`

### Stage 4 — Landing site cert tile + diagnostic flow

**4a — `landing/index.html`** — TWO new tiles:
- `#cert-tile-aplus-core1` (CompTIA A+ Core 1 / 220-1201 / IT generalist entry-point / 5 domains · 45 topics / Live · Pro / link to `https://aplus.certanvil.com/?exam=core1`)
- `#cert-tile-aplus-core2` (CompTIA A+ Core 2 / 220-1202 / IT generalist entry-point / 4 domains · 45 topics / Live · Pro / link to `https://aplus.certanvil.com/?exam=core2`)

Meta description updated to mention all 6 certs.

**4b — `landing/diagnostic/index.html`** — two new tiles linking to `/diagnostic/aplus-core1/` and `/diagnostic/aplus-core2/`.

**4c — `landing/diagnostic/aplus-core1/`** — NEW directory, cloned from `azure-ai-fundamentals/`. Seed pool: 5-7 questions per Core 1 domain (25-35 total) from public A+ Exam Objectives PDF. Heavy bias toward RAID + cloud + printers + DNS per VoC §1 + §4.

**4d — `landing/diagnostic/aplus-core2/`** — same structure. Seed pool biased toward social engineering + malware + command-line + Windows editions per VoC §1 + §4.

**4e — `landing/api/diagnostic/generate.js`** — TWO new cert branches:
- `aplus-core1` with vendor-aware CompTIA prompt + 5-domain weights (Mobile 9% / Networking 20% / Hardware 25% / Virt+Cloud 11% / Troubleshooting 29%)
- `aplus-core2` with vendor-aware CompTIA prompt + 4-domain weights (Operating Systems 28% / Security 28% / Software Troubleshooting 22% / Operational Procedures 22%)
- Both: bias prompt toward scenario stems + "BEST" / "NEXT" / "FIRST" qualifier patterns per VoC §2.9.
- Both: **add Dion Training, Mike Meyers, Exam Cram, BurningIceTech Patreon, Crucial Exams, Skillcertpro** to banned-sources list for CompTIA prompts.

**4f — `landing/auth.js` 6-cert My-certs modal** — verify iteration handles 6 certs cleanly.

Commit: `feat(aplus): landing — 2 cert tiles + 2 diagnostic intake/quiz/results flows + generate.js branches`

### Stage 5 — Cross-cert analytics + overlap

**5a — `landing/lib/cross-cert-overlap.js`** — 10 new directional overlap entries:
- **Core 1 ↔ Core 2 (very-high, ~40-45%)** — same cert family, shared CompTIA terminology, complementary content. Bidirectional pair.
- **Core 1 ↔ Net+ (medium-high, ~30-35%)** — Networking domain (20%) of Core 1 deeply overlaps with Net+; OSI / TCP/UDP ports / DNS / DHCP / cabling all shared. Reverse directional.
- **Core 1 ↔ Sec+ (low, ~10-15%)** — Mobile MDM + basic cloud security only. Reverse directional.
- **Core 1 ↔ AZ-900 (low, ~10%)** — Cloud Concepts overlap only (IaaS/PaaS/SaaS at fundamentals level). Reverse directional.
- **Core 2 ↔ Sec+ (medium-high, ~30-35%)** — Security domain (28%) of Core 2 overlaps with Sec+ Domain 1+2; social engineering / MFA / encryption / malware all shared. Reverse directional.
- **Core 2 ↔ Net+ (low, ~10%)** — minimal overlap (SOHO security only). Reverse directional.
- **Core 2 ↔ AI-900 (very low, ~5%)** — minimal overlap (data privacy concepts). Reverse directional.
- **Core 1 ↔ AI-900 (very low, ~5%)** — minimal overlap.

**5b — `landing/lib/cross-cert-analytics.js`** — verify constellation visualization accepts 6 certs (currently 4 per v7.5.0). Standings chart cutoff marker supports 6.

Commit: `feat(aplus): cross-cert analytics + overlap (6-cert quintet expansion)`

### Stage 6 — Exemplar banks (200 per exam = 400 total) — the largest stage

~6-10 hours of focused authoring. The biggest cost driver yet.

**6a — Core 1 distribution (VoC-informed)**

| Domain | Weight | Target | Clusters | VoC bias |
|---|---|---|---|---|
| 1 Mobile Devices | 9% | ~18 | 4-5 | Mobile screen burn-in + swollen battery + battery swap procedures (VoC §2.5); MDM basics; laptop hardware; smartphone vs tablet |
| 2 Networking | 20% | ~40 | 7-9 | **Heavy ports + protocols** (well-known TCP/UDP — VoC §1 #2); **DNS records incl. SPF/DKIM/DMARC** (VoC §2.3 surprise topic — 4-6 exemplars); Wi-Fi standards/generations; cellular generations; cable types (Cat 5e/6/6a/7/8 + fiber); cable termination (T568A/B + STP/UTP per VoC §2.8) |
| 3 Hardware | 25% | ~50 | 9-11 | **RAID configure + repair** (VoC §2.1 + §4 #3 — 8-10 exemplars, top-tier weight); **Printer troubleshooting** (VoC §4 #1 — 8-10 exemplars, top-tier weight; toner / fuser / spooler / paper jam / 3D / impact / thermal); storage form-factors (SSD vs HDD scenarios per VoC §5 #9); motherboards + CPU + RAM + power supplies; expansion cards |
| 4 Virtualization & Cloud | 11% | ~22 | 4-5 | **Cloud service models depth (IaaS vs PaaS vs SaaS)** (VoC §2.2 + §4 #2 — 5-7 exemplars); **Cloud deployment models (public/private/hybrid/community)** (3-4 exemplars); **Cloud characteristics** (rapid elasticity / on-demand / measured / pooling — 3-4 exemplars); virtualization concepts beyond hypervisor type (VoC §5 #4) |
| 5 Hw/Net Troubleshooting | 29% | ~58 | 10-12 | **Heavy scenario stems** ("what should you do NEXT" / "what is the BEST"); troubleshooting methodology (6 steps); network troubleshooting deep flows (VoC §2.7); cable/port troubleshooting; mobile device troubleshooting (burn-in / swollen battery scenarios); printer troubleshooting troubleshooting steps |
| **Total** | **94%** | **~188** | **34-42** | |

Round to exactly 200 by adding 12 cross-cutting scenario exemplars.

**6b — Core 2 distribution (VoC-informed)**

| Domain | Weight | Target | Clusters | VoC bias |
|---|---|---|---|---|
| 1 Operating Systems | 28% | ~56 | 10-12 | **Windows command line** (ipconfig/netstat/sfc/chkdsk/dism/net user/net use/tasklist/robocopy/diskpart/nslookup/tracert — 12-15 exemplars per VoC §4 #1); **Linux + macOS commands** (apt/sudo/chmod/chown/grep — 5-6 exemplars per VoC §5 — the "cross-OS command list" frustration); **Windows editions feature matrix** (BitLocker/GPO/Hyper-V/RDP/Domain Join availability — 5-7 exemplars per VoC §5 #2); **Multi-path tool access** ("5 ways to access Disk Management/Event Viewer/Services/Task Manager" — 5-6 exemplars per VoC §2 S2 — the highest-impact VoC surprise); File system permissions (NTFS vs share) |
| 2 Security | 28% | ~56 | 10-12 | **Social engineering family** (phishing/spear/whaling/vishing/smishing/pretexting/tailgating/piggybacking — 10-12 exemplars per VoC §4 #3 + §5 #1); **MFA factor categorization** (knowledge/possession/inherence/behavior/location — 6-8 exemplars per VoC §4 #8 + §5 #5); **Malware 7-step removal** (5-6 exemplars per VoC §4 #4); **Encryption + hashing** (BitLocker / FileVault / AES / SHA / TPM — 6-8 exemplars per VoC §1.2); **SOHO security** (router hardening / WPA3 / MAC filtering / port forwarding / IoT segmentation — 4-5 exemplars per VoC §2 S4); workstation security + browser security + mobile security |
| 3 Software Troubleshooting | 22% | ~44 | 8-10 | **Malware symptom diagnosis** (VoC §2 S3 — 8-10 exemplars; symptom-recognition → treatment ordering); Windows OS troubleshooting (boot issues + BSOD + slow performance + crashes); Mobile OS troubleshooting; application troubleshooting; profile/account troubleshooting |
| 4 Operational Procedures | 22% | ~44 | 8-10 | Documentation + ticket procedures; **Change management process** (RFC → impact analysis → CAB approval → implementation → rollback → documentation — 4-5 exemplars per VoC §4 #7); **Backup methodology + 3-2-1 rule** (full vs incremental vs differential vs synthetic + restore order — 4-5 exemplars per VoC §4 #6); environmental impacts + safety; incident response; communication / professionalism / privacy; **Scripting language identification** (.ps1 / .sh / .py / .js / .vbs / .bat — 4-5 exemplars per VoC §10 #2 — the new 220-1202 emphasis) |
| **Total** | **100%** | **200** | **36-44** | |

**6c — Cluster pattern** — Each cluster covers a coherent sub-concept with 4-6 exemplars (MCQ + multi-select + scenario variant). Total 70-86 clusters across both exams.

**6d — Authoring discipline** — Original content from PUBLIC CompTIA A+ Exam Objectives v4.0 PDFs + VoC research as DIRECTION-FINDER. Zero paid-bank ingestion. Each exemplar: realistic stem (30-60 words; A+ is less wordy than Dion's tests per VoC §2.9), 4 options (MCQ) or 5 options (multi-select with 2-3 correct), one correct answer, brief explanation referencing official CompTIA term. Topic names match topicDomains keys exactly (v7.4.0 lesson).

**6e — Sample shape (Core 1)**:
```javascript
{
  topic: 'Cloud Service Models',
  difficulty: 'Exam Level',
  type: 'mcq',
  question: 'A company wants Microsoft to fully manage the operating system + database + application runtime while the company manages only its application code + data. Which cloud service model fits BEST?',
  options: {
    A: 'IaaS',
    B: 'PaaS',
    C: 'SaaS',
    D: 'On-premises'
  },
  answer: 'B',
  explanation: 'PaaS fits this split exactly: Microsoft (the cloud provider) manages the OS + runtime + middleware; the customer manages only application code + data. IaaS leaves OS management to the customer. SaaS hides everything below the application UI from the customer. On-premises = customer manages everything.',
  source: 'Original — public CompTIA A+ 220-1201 Exam Objectives v4.0',
  addedVersion: '7.6.0',
  addedDate: '2026-05-27'
}
```

**6f — Cluster order** — Core 1 first (Mobile → Networking → Hardware → Virt+Cloud → Troubleshooting), then Core 2 (Operating Systems → Security → Software Troubleshooting → Operational Procedures).

**6g — Per-cluster validation** — Topic names match keys exactly. Difficulty distribution reasonable (mostly Foundational + Exam Level with some Hard). No paid-bank language patterns. Explanations cite official CompTIA terms.

**6h — VoC-mandated cluster floors**:
- **Core 1**: ≥8 RAID config+repair · ≥8 printer troubleshooting · ≥5 cloud service model scenarios (IaaS/PaaS/SaaS) · ≥4 DNS TXT records (SPF/DKIM/DMARC) · ≥4 mobile burn-in/swollen battery
- **Core 2**: ≥10 social engineering distinctions · ≥10 Windows command line · ≥8 malware symptom+removal · ≥5 multi-path tool access · ≥5 Windows editions matrix · ≥4 cross-OS commands · ≥4 MFA factor categorization · ≥4 backup methodology · ≥4 change management

**Commit cadence**: ~4 commits per exam (one per domain group). Final commits: `feat(aplus): Core 1 exemplar bank (200)` + `feat(aplus): Core 2 exemplar bank (200)`.

### Stage 7 — UAT regression guards

Add 12-14 v7.6.0 tombstones to `tests/uat.js`:

| Guard | Asserts |
|---|---|
| `v7.6.0 CertPack: certs/aplus-core1.js declares window.CERT_PACKS["aplus-core1"]` | Regex against `certAplusCore1` source |
| `v7.6.0 CertPack: certs/aplus-core2.js declares window.CERT_PACKS["aplus-core2"]` | Regex against `certAplusCore2` source |
| `v7.6.0 CertPack: app.js detectCert handles aplus. + aplus- + aplus.certanvil.com` | Regex against `js` |
| `v7.6.0 CertPack: index.html inline IIFE maps aplus.certanvil.com to aplus-core1 (default)` | Regex against `html` |
| `v7.6.0 CertPack: auth-state.js getAvailableCerts returns 6 certs` | Regex check all 6 IDs present |
| `v7.6.0 CertPack: tadSwitchCert handles within-subdomain Core 1 ↔ Core 2 switching` | Regex check the same-host branch logic |
| `v7.6.0 CertPack: Core 1 domain weights sum within tolerance (>= 0.90 && <= 1.10)` | Behavioral fixture (Core 1 sums to 94 — slightly under 1.00) |
| `v7.6.0 CertPack: Core 2 domain weights sum within tolerance (>= 0.95 && <= 1.05)` | Behavioral fixture (Core 2 sums to 1.00) |
| `v7.6.0 CertPack: Core 1 exemplar bank >= 195 entries` | Behavioral fixture |
| `v7.6.0 CertPack: Core 2 exemplar bank >= 195 entries` | Behavioral fixture |
| `v7.6.0 CertPack: Core 1 topic catalog has >= 40 topics` | `Object.keys(topicDomains).length >= 40` |
| `v7.6.0 CertPack: Core 2 topic catalog has >= 40 topics` | Same |
| `v7.6.0 CertPack: every Core 1 exemplar topic exists in topicDomains` | Behavioral fixture |
| `v7.6.0 CertPack: every Core 2 exemplar topic exists in topicDomains` | Behavioral fixture |

Load both cert pack sources at `tests/uat.js` module scope:
```javascript
const certAplusCore1 = read('certs/aplus-core1.js');
const certAplusCore2 = read('certs/aplus-core2.js');
```

Commit: `test(uat): A+ Core 1 + Core 2 cert pack regression guards (14 new tombstones)`

### Stage 8 — Pro-gate UI + cert switcher CSS

Visual confirm in Chrome MCP / curl: dropdown shows 6 certs with right tier pills. Both A+ entries show "PRO" badge for Free users. Verify within-subdomain switching works (Core 1 → Core 2 stays on `aplus.certanvil.com`, just reloads with new active cert).

If dropdown height needs adjustment for 6 rows, tweak `dg-system.css .topbar-account-dropdown` max-height.

### Stage 9 — Version bump + CLAUDE.md row

1. `node scripts/bump-version.js 7.6.0 "CompTIA A+ cert family added — fifth cert (Pattern A aplus.certanvil.com, Pro-tier; Core 1 + Core 2 dual-exam; 400-exemplar bank from public CompTIA A+ Exam Objectives + VoC research)"`
2. Read CLAUDE.md (post-bump) and expand stub row into comprehensive narrative.
3. Verify CLAUDE.md still parses cleanly.

Commit: `chore(release): v7.6.0 — A+ cert family add (fifth cert: CompTIA A+ Core 1 + Core 2 dual-exam)`

### Stage 10 — Local verification + Chrome MCP smoke

1. `node tests/uat.js` — all v7.6.0 guards green, no regressions from v7.5.0 baseline.
2. Skip full Playwright (TB v3 + drill baseline noise per pattern).
3. Local `python3 -m http.server 3131` + curl/Chrome MCP at `localhost:3131?cert=aplus-core1` and `?cert=aplus-core2` — verify CURRENT_CERT, CERT_PACK loaded, home page renders correct domain grid (5 for Core 1, 4 for Core 2).
4. Spot-check cert switcher dropdown — 6 certs visible, both A+ entries with "PRO" badge for Free users, within-subdomain switching works.

### Stage 11 — Push + Vercel deploy

1. `git push origin feature/aplus-cert` — Vercel auto-builds preview.
2. `gh pr create` + `gh pr merge --squash --delete-branch --admin` to land on main + trigger CI.
3. `npx vercel --prod --yes` per disconnected-Vercel pattern (founder manual).

### Stage 12 — Founder DNS + Vercel alias

Founder action (~5-10 min):
1. **DNS**: Add `CNAME aplus → cname.vercel-dns.com` (mirror existing CNAMEs).
2. **Vercel**: `networkplus-quiz` project → Settings → Domains → Add `aplus.certanvil.com`.
3. Wait ~5-30 min for DNS propagation + cert issuance.

### Stage 13 — Post-deploy production verification

| Host | `CURRENT_CERT` (default) | `CERT_PACK.meta.code` | Sidebar | Loaded |
|---|---|---|---|---|
| `aplus.certanvil.com` | `'aplus-core1'` (default) | `'220-1201'` | `CompTIA A+ Core 1 220-1201` | `certs/aplus-core1.js` |
| `aplus.certanvil.com` after switcher → Core 2 | `'aplus-core2'` | `'220-1202'` | `CompTIA A+ Core 2 220-1202` | `certs/aplus-core2.js` |
| `ai.certanvil.com` | `'ai900'` | `'AI-900'` | (unchanged) | `certs/ai900.js` |
| `azure.certanvil.com` | `'az900'` | `'AZ-900'` | (unchanged) | `certs/az900.js` |
| `secplus.certanvil.com` | `'secplus'` | `'SY0-701'` | (unchanged) | `certs/secplus.js` |
| `networkplus.certanvil.com` | `'netplus'` | `'N10-009'` | (unchanged) | `certs/netplus.js` |

Verify cert switcher dropdown shows 6 certs on all 6 subdomains. Verify within-subdomain Core 1 ↔ Core 2 switching works on `aplus.certanvil.com`.

### Stage 14 — Smoke quiz on both A+ exams

Take 1-2 short quizzes on EACH A+ exam to confirm:
1. Question generation works for both
2. Exemplars pulled from correct cert pack
3. Pass marks: 675 (Core 1) + 700 (Core 2)
4. Progress page tracks Core 1 + Core 2 topics independently
5. Core 1 surfaces RAID + Cloud + Printers questions; Core 2 surfaces Social Engineering + Commands + Malware

---

## 5 — Verification gates

| Gate | Pass criterion | Triggered at |
|---|---|---|
| UAT | 14 new v7.6.0 guards pass + no regressions from v7.5.0 baseline | Stage 7 + Stage 9 + Stage 10 |
| Pre-commit hook | UAT clean on every commit | Every `git commit` |
| Local Chrome MCP / curl smoke | Both A+ home pages render, switcher shows 6 certs, within-subdomain switching works | Stage 10 |
| CI (post-push) | UAT + Playwright green (baseline noise acceptable) | After Stage 11 |
| Production curl + Chrome MCP | All 6 subdomains resolve, both A+ cert packs load, domain grids render per exam | Stage 13 |
| Smoke quiz | Question gen works for both, exemplars from correct pack, pass marks 675/700 | Stage 14 |

---

## 6 — Founder hand-off

After Stage 11 push, exactly two manual actions:

1. **DNS**: Add `CNAME aplus → cname.vercel-dns.com` (~2 min)
2. **Vercel domain alias**: Add `aplus.certanvil.com` to `networkplus-quiz` project (~3 min)

DNS prop + TLS cert: ~5-30 min. Then `https://aplus.certanvil.com` serves the cert app with both A+ exams accessible via the cert switcher.

---

## 7 — Estimated cost + time

| Phase | Time | Cost (Claude tokens) |
|---|---|---|
| Stage 0 (pre-flight + PDFs read) | 30 min | ~$10-15 |
| Stage 1 (2 cert pack scaffolds) | 1 hour | ~$15-25 |
| Stage 2-3 (cert detection + switcher + 6-way ternary + within-subdomain) | 1 hour | ~$25-40 |
| Stage 4 (landing 2 cert tiles + 2 diagnostic flows) | 1 hour | ~$25-40 |
| Stage 5 (cross-cert overlap × 10 entries) | 30 min | ~$15-20 |
| **Stage 6 (exemplar banks — 400 total: 200 Core 1 + 200 Core 2)** | **6-10 hours** | **~$200-350** (the dominant cost driver — twice the AI-900 exemplar count) |
| Stage 7 (UAT guards × 14) | 30 min | ~$10-15 |
| Stage 8-9 (UI verify + bump + CLAUDE.md row) | 45 min | ~$20-30 |
| Stage 10-11 (verification + push + PR + merge) | 45 min | ~$20-30 |
| Stage 12 (founder DNS + Vercel) | 5-10 min | $0 |
| Stage 13-14 (prod verify + smoke quizzes × 2) | 45 min | ~$15-25 |
| **Total** | **~12-18 hours** | **~$355-590** |

Exemplar authoring is the cost driver. Founder authorized "cost is of no issue" — single comprehensive ship is the default.

**If cost-pressure escalates mid-ship**: split into v7.6.0 (Core 1 only — full Stages 0-14 for Core 1, deferred Core 2) + v7.7.0 (Core 2 separately). See §9 Q4.

---

## 8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Within-subdomain Core 1 ↔ Core 2 switching breaks navigation (this is a new pattern) | Medium | High | Test thoroughly in Stage 3 + Stage 10 + Stage 13. localStorage-based + reload pattern is the safest. |
| Hardcoded 4-cert literals surface (e.g. `if (cert === 'netplus' \|\| cert === 'secplus' \|\| cert === 'az900' \|\| cert === 'ai900')`) | Medium | Medium — hotfix needed | Pre-Stage 2 grep sweep (Appendix A); 5th-cert + 6-way ternary class-of-bug-grep proof point |
| 400-exemplar authoring drags into v7.7.0 | High | Low — incremental shipping is fine | UAT count guards (≥195 per cert pack) catch the ship boundary |
| Core 1 + Core 2 cross-contamination in topics (e.g. networking topic in Core 2) | Medium | Low — content is per-cert, no mix | Each cert pack has its own topicDomains; cross-cert isn't possible by architecture |
| Cross-cert overlap table feels arbitrary | Medium | Low (cosmetic) | Author conservatively; refine in v7.6.x follow-up |
| Vercel + DNS hiccup for the 5th subdomain | Low | Medium | `npx vercel --prod` manual works; DNS prop ~30 min worst case |
| Pre-existing v7.0.0 Playwright failures mask new failure | Low | Medium | Skip full Playwright; rely on UAT + Chrome MCP smoke |
| BurningIceTech / Skillcertpro / Dion contamination via reverse lookalike | Low | High (legal — IP audit) | Authors NEVER reference these sources; §10 legal boundary explicitly prohibits all of them |
| 6-cert dropdown layout breaks on small viewports | Low | Low | Confirm at Stage 8; v7.1.1 dropdown max-height auto-grows |
| Domain weights sum mismatch for Core 1 (sums to 94%, not 100%) | Low | Low | UAT tolerance widened to ±10% (vs ±5% for prior certs); Core 1 official blueprint doesn't sum to 100% |

---

## 9 — Founder-confirmed decisions (TO BE LOCKED 2026-05-27 — see open questions below)

All decisions resolved with sensible defaults — flagging the ones that need explicit founder confirmation before Stage 0.

### Question 1 (CRITICAL — locks before Stage 0): Subdomain choice

**Locked default: `aplus.certanvil.com` shared between Core 1 + Core 2.**

CompTIA A+ is ONE certification with TWO exams. The AZ-900 §9 #2 lock ("future Azure certs share azure.certanvil.com via cert-switcher") applies cleanly here: same cert family = same subdomain. Within-subdomain Core 1 ↔ Core 2 switching is the new architectural pattern.

Alternative considered + rejected:
- `aplus-core1.certanvil.com` + `aplus-core2.certanvil.com` — would split a single cert family across two subdomains, fragmenting the brand. Rejected.
- `aplus.certanvil.com/core1` + `aplus.certanvil.com/core2` (path-based) — would require Vercel routing rules; the existing detectCert architecture is host-based, not path-based. Rejected for v7.6.0 (can revisit if cert switcher UX is unclear).

**Confirmation request**: founder approves single `aplus.certanvil.com` with internal Core 1/Core 2 switcher.

### Question 2: Cert pack architecture (one file vs two)

**Locked default: TWO cert pack files (`certs/aplus-core1.js` + `certs/aplus-core2.js`)** treated as distinct entries in `getAvailableCerts()`.

Each cert pack is independently authored, validated, and shipped. The cert switcher shows BOTH as selectable. This matches the existing architecture (one CERT_PACK per cert ID) and avoids introducing a sub-cert structure.

Alternative considered + rejected:
- ONE cert pack file `certs/aplus.js` with `subExams: { core1, core2 }` — would require schema changes to `CERT_PACK.meta` + introduce a "sub-exam selector" in render-LOGIC. High architectural cost; minimal benefit. Rejected.

**Confirmation request**: founder approves two cert pack files + distinct cert IDs.

### Question 3: Exemplar count per exam

**Locked default: 200 per exam = 400 total.** Same per-exam baseline as Net+/Sec+/AZ-900/AI-900.

Alternatives:
- **150 per exam = 300 total** — lighter ship, faster authoring (~$150 less cost). Acceptable if cost-pressure caps the budget.
- **250 per exam = 500 total** — heavier coverage, more topic depth. Acceptable if founder wants maximal coverage; adds ~$100 cost.

Per founder "cost is of no issue", the 200/200 default holds. The Phase 3 cycle pattern lets each exam grow over time post-real-practice.

**Confirmation request**: founder approves 200 per exam (400 total) OR specifies a different target.

### Question 4: Single ship vs split (v7.6.0 = both vs v7.6.0 Core 1 first)

**Locked default: SINGLE v7.6.0 ship covering both Core 1 + Core 2.**

Per founder "cost is of no issue" + the comprehensive plan + the v7.5.0 precedent of shipping the full AI-900 cert in one ship, the default is single comprehensive v7.6.0.

Alternative (if cost/time becomes acute mid-ship):
- **v7.6.0 Core 1 ship first** (cert pack + detection + landing + 200 Core 1 exemplars + 7 Core 1 UAT tombstones + version bump + CLAUDE.md row) — ~$200-300, 7-9 hours.
- **v7.7.0 Core 2 ship later** (Core 2 cert pack + 200 exemplars + 7 Core 2 UAT tombstones + within-subdomain switcher activation + version bump + CLAUDE.md row) — ~$200-300, 6-8 hours.

**Confirmation request**: founder approves single v7.6.0 ship OR locks the split fallback as Plan B if cost-pressure mid-ship.

### Question 5: Retention concepts pre-seed scope

**Locked default: 8 pre-seeded concepts per exam = 16 total** (matches AI-900 §9 #5 lock of 8 concepts).

Pre-seed concepts already authored in §4 Stage 1 retentionGapConcepts comment block:
- **Core 1**: RAID Config + Cloud Service Models + Cloud Deployment Models + Cloud Characteristics + DNS Records (incl. SPF/DKIM/DMARC) + Wi-Fi Standards + Cellular Generations + Mobile Troubleshooting
- **Core 2**: Social Engineering Family + Malware 7-Step Removal + Windows Editions Feature Matrix + Multi-Path Tool Access + NTFS vs Share + Cross-OS Commands + Backup Methodology + MFA Factor Categories

Phase 3 cycle pattern: array stays open-ended for both. Founder appends as real-study gaps emerge.

**Confirmation request**: founder approves 8 per exam, or specifies a different count.

### Question 6: Default cert on cold `aplus.certanvil.com` entry

**Locked default: `'aplus-core1'`** (Core 1 is the natural first exam in the A+ sequence; users typically take Core 1 then Core 2).

Alternative: parse `?exam=core1` or `?exam=core2` query param to override the default. Simple addition; flagging for confirmation.

**Confirmation request**: founder approves Core 1 default + optional `?exam=` query param for landing page deep-links.

### Question 7: Within-subdomain cert switching behavior

**Locked default: `tadSwitchCert` writes `nplus_dev_cert` to localStorage + page reload** when switching Core 1 ↔ Core 2 within `aplus.certanvil.com`.

Alternative: switch via JS state mutation without reload (would require re-rendering all cert-aware surfaces dynamically — high complexity).

Default is the safest pattern — guaranteed cert pack swap with no edge cases.

**Confirmation request**: founder approves localStorage + reload pattern.

---

## 10 — Legal boundary (locked, non-negotiable)

Per CLAUDE.md "Curated Exemplar Bank" + Sec+ cert pack header + AZ-900 + AI-900 plan §10 + v4.99.x authoring discipline:

- **All A+ cert pack content (exemplars, retention concepts, topic resources, explanations) for BOTH Core 1 and Core 2 MUST originate from PUBLIC CompTIA A+ Exam Objectives v4.0 PDFs (`220-1201` + `220-1202`) ONLY.**
- **Zero ingestion of paid-bank content**: Jason Dion (Udemy + practice tests) · Mike Meyers (Pearson book) · Pearson Exam Cram · CompTIA CertMaster Learn/Practice (CompTIA's own paid offering) · Skillcertpro · BurningIceTech Patreon · Crucial Exams · MeasureUp · Whizlabs · TutorialDojo · paid Pluralsight · paid LinkedIn Learning · O'Reilly · Udemy · ExamTopics dumps.
- **Public CompTIA Exam Objectives PDFs are the ONLY allowed authoritative reference** — the same source the founder bought directly from CompTIA via the certification page.
- **VoC research is DIRECTION-FINDER only.** Topic frequency, exam recall vocabulary, surprise topics, and confusable-pair clusters from the VoC corpus inform WHICH topics get more exemplars — never WHAT to write. Quote topics; never reproduce or paraphrase any specific exam question.
- **Jason Dion Method applies** if/when founder takes a paid A+ practice test (Dion / Crucial / Mike Meyers practice): share gap topics in OWN WORDS only → Claude authors new exemplars per gap → original content informed by gap, never reproductions.
- Document the legal boundary at top of BOTH `certs/aplus-core1.js` AND `certs/aplus-core2.js` matching Sec+/AZ-900/AI-900 header comment style verbatim, with the explicit Dion + Mike Meyers + CertMaster + BurningIceTech + Skillcertpro callouts for clarity.

---

## 11 — Ship signal

When Stage 13 production verification passes on all 6 subdomains AND Stage 14 smoke quizzes confirm AI generation works for BOTH A+ exams + pass marks 675/700 + progress tracking is per-exam, v7.6.0 is shipped.

Fifth cert family live + Pattern A playbook proven at 5-cert/6-exam scale across **2 vendors + 3 role families** (CompTIA Net+ + Sec+ + A+ on networkplus./secplus./aplus. + Microsoft Azure infra AZ-900 on azure. + Microsoft AI/Data AI-900 on ai.) + dual-exam cert family pattern proven + cert pack abstraction validated across single-cert (Net+/Sec+/AZ-900/AI-900) AND dual-cert (A+) shapes. The CertAnvil platform is now a multi-vendor multi-track multi-shape cert-prep product.

---

## Appendix A — Class-of-bug-grep checklist (pre-Stage 11)

Before pushing v7.6.0:

```bash
# 1. Direct 4-cert OR literals
grep -nE "['\"]netplus['\"]\s*\|\|\s*['\"]secplus['\"]\s*\|\|\s*['\"]az900['\"]\s*\|\|\s*['\"]ai900['\"]" app.js auth-state.js index.html

# 2. 4-cert switch statements
grep -nE "case\s+['\"](netplus|secplus|az900|ai900)['\"]" app.js auth-state.js

# 3. 4-cert ternaries
grep -nE "===\s*['\"](netplus|secplus|az900|ai900)['\"]\s*\?" app.js auth-state.js index.html

# 4. Hardcoded display strings outside cert-aware render fns
grep -nE "(Network\+|Security\+|Azure Fundamentals|AI-900|AZ-900)" landing/index.html landing/script.js landing/auth.js | grep -v cert-tile

# 5. Cert pack iteration sites
grep -nE "CERT_PACKS\.(netplus|secplus|az900|ai900)" app.js

# 6. CANONICAL_DOMAIN_TOPICS 4-way ternary (Stage 3d will turn this 6-way)
grep -nE "_CANONICAL_(NETPLUS|SECPLUS|AZ900|AI900)" app.js

# 7. Within-subdomain switching — NEW pattern for v7.6.0
grep -nE "aplus.certanvil.com" app.js auth-state.js index.html
```

Any hit that isn't inside a cert-specific code path is a v7.6.0 prerequisite fix.

---

## Appendix B — File creation list

| Path | Status | Approx size |
|---|---|---|
| `certs/aplus-core1.js` | NEW | 4-6K lines after exemplar authoring |
| `certs/aplus-core2.js` | NEW | 4-6K lines after exemplar authoring |
| `landing/diagnostic/aplus-core1/intake.html` | NEW | ~200 lines |
| `landing/diagnostic/aplus-core1/quiz.html` | NEW | ~300 lines |
| `landing/diagnostic/aplus-core2/intake.html` | NEW | ~200 lines |
| `landing/diagnostic/aplus-core2/quiz.html` | NEW | ~300 lines |
| `docs/superpowers/plans/2026-05-27-aplus-cert-add.md` | NEW (this file) | ~750 lines |

All other touched files are MODIFY (additive + cert-detection wiring + render-LOGIC ternary expansion).

---

## Appendix C — Voice-of-Customer Research integration

**Source corpora:**
- **Core 1**: `~/Desktop/APLUS-CORE1-RESEARCH-2026-05-27.md` — 53 r/CompTIA threads (986 posts/comments) tagged 220-1201.
- **Core 2**: `~/Desktop/APLUS-CORE2-RESEARCH-2026-05-27.md` — 199 unique threads, 187 220-1202/Core-2 relevant, 133 substantive selftexts, 374 entries / 151k chars of verbatim test-taker text + 18-thread retry pass adding 65k chars / 348 comments.

**Purpose:** Real-exam intel to inform Stage 6 (exemplar bank authoring) per exam + bake correct cert metadata into Stage 1 upfront (vs the AZ-900 post-research correction pattern).

### C.1 — Cert pack metadata baked from VoC upfront

Both exam metadata baked from VoC §7 + Core 1 §1 / Core 2 §7 upfront:

| Field | Core 1 (220-1201) | Core 2 (220-1202) |
|---|---|---|
| `examQuestionCount` | 80 (range 75-80) | 80 (range 77-90, modal 75-77) |
| `examTimeSeconds` | 5400 (90 min) | 5400 (90 min) |
| `examPassScore` | **675** | **700** (note: different from Core 1) |
| `examMaxScore` | 900 | 900 |

### C.2 — Top topics per exam (Reddit recall frequency)

**Core 1 — Top 8 by frequency** (from VoC §1):
| Rank | Topic | Threads | Domain |
|---|---|---|---|
| 1 | PBQs (any mention) | 33 | All five domains |
| 2 | Ports & protocols | 37 | 2.0 Networking |
| 3 | Cloud models (SaaS/IaaS/PaaS/public/private/hybrid/elasticity) | 8 | 4.0 Virt+Cloud |
| 4 | RAID levels (config + repair) | 11 | 3.0 Hardware / 5.0 Troubleshooting (PBQ) |
| 5 | Troubleshooting methodology | 18+11 | 5.0 Troubleshooting |
| 6 | Printers (toner/fuser/spooler/3D/impact/thermal/paper jam) | High frequency | 3.0 Hardware |
| 7 | Networking — broad | 40 | 2.0 Networking |
| 8 | Mobile devices | 2+ | 1.0 Mobile / 5.0 Troubleshooting |

**Core 2 — Top 9 by frequency** (from Core 2 VoC §1):
| Rank | Topic | Matches | Domain |
|---|---|---|---|
| 1 | Group Policy / AD / Domain | 71 | 1.0 OS, partly 2.0 Security |
| 2 | Encryption / Hashing / BitLocker | 44 | 2.0 Security |
| 3 | PBQs | 54 | All domains |
| 4 | Command-line utilities | 17 | 1.0 OS, 3.0 Software Troubleshooting |
| 5 | Malware identification + removal | 3 explicit + high intensity | 2.0 Security |
| 6 | Linux + macOS commands | 11 | 1.0 OS |
| 7 | Social engineering distinctions | recurring | 2.0 Security |
| 8 | SOHO security | recurring | 2.0 Security |
| 9 | Windows feature/edition differences | 7 | 1.0 OS |

### C.3 — HIGH-VALUE SURPRISE TOPICS (the competitor-gap goldmine)

Per Core 1 VoC §2 + Core 2 VoC §2 — topics test-takers explicitly flagged as **not in their study guide / unexpected**. Stage 6 authoring disproportionately invests here.

**Core 1 surprises (S1.x)**:
| # | Surprise | Exemplar target |
|---|---|---|
| S1.1 | RAID *configure + repair* (not just naming) | 8-10 in Hardware/Troubleshooting (top-priority) |
| S1.2 | Cloud service-model + characteristic depth (IaaS/PaaS not just SaaS) | 5-7 in Virt+Cloud |
| S1.3 | DNS TXT-record sub-types (SPF/DKIM/DMARC) | 4-5 in Networking — VoC §2.3 surprise |
| S1.4 | Hardware-level repair beyond board-swap (component-level) | 2-3 in Hardware/Troubleshooting |
| S1.5 | Mobile burn-in + swollen battery scenarios | 3-4 in Mobile/Troubleshooting |
| S1.6 | PBQ wording vs MCQ wording mismatch (parsing difficulty) | Format bias across all PBQ-style exemplars |
| S1.7 | Network troubleshooting deep multi-step flow | 3-4 in Troubleshooting (Domain 5) |
| S1.8 | STP vs UTP in work-environment scenarios | 2-3 in Networking |
| S1.9 | "BEST" / "NEXT" / "FIRST" qualifier traps | Distractor design across all exemplars |
| S1.10 | Counter-evidence: ports overstudied / 802.11 undertested | DOWNGRADE port-memorization isolation |

**Core 2 surprises (S2.x)**:
| # | Surprise | Exemplar target |
|---|---|---|
| S2.1 | "Things not in Exam Objectives, especially in PBQs" | PBQ broader topic sampling |
| S2.2 | "Access a tool 5 different ways with different permissions" | 5-6 multi-path tool access exemplars in OS — VoC §2 S2 highest-impact surprise |
| S2.3 | Heavy malware-symptom diagnosis (vs identification) | 8-10 in Software Troubleshooting |
| S2.4 | SOHO security as distinct topic block | 4-5 in Security |
| S2.5 | Command coverage across all 3 OS families | 5-6 cross-OS commands in OS |
| S2.6 | Core 2 harder than Core 1 calibration | Difficulty bias toward Hard tier on Security + OS |
| S2.7 | PBQ form variability (easy ↔ hard per form) | Author both easy + hard PBQ exemplars |
| S2.8 | Dion's practice exams over-tuned | Don't mirror Dion exact difficulty |
| S2.9 | CertMaster Learn weak for actual exam | CertMaster is on the prohibited list anyway per §10 |
| S2.10 | BurningIceTech Patreon close to real PBQs | Prohibited per §10 — but signal: PBQ format coverage is the highest leverage |

### C.4 — Confusable-services / distinguisher clusters

**Core 1 clusters**:
1. **RAID 0/1/5/10** distinction (striping/mirroring/parity/nested)
2. **IaaS vs PaaS vs SaaS** scenario classification
3. **Public vs Private vs Hybrid vs Community** cloud deployment
4. **Cloud characteristics** (rapid elasticity ↔ on-demand ↔ measured ↔ pooling)
5. **DNS records** (A vs AAAA vs CNAME vs MX vs TXT incl. SPF/DKIM/DMARC)
6. **Wi-Fi standards** (802.11 generations + bands)
7. **Cable types** (Cat 5e/6/6a/7/8 + fiber)
8. **Mobile vs laptop** screen technology + troubleshooting

**Core 2 clusters**:
1. **Phishing family** (phishing/spear/whaling/vishing/smishing/pretexting + tailgating/piggybacking/dumpster diving/shoulder surfing)
2. **MFA factors** (knowledge/possession/inherence/behavior/location)
3. **Encryption algorithms** (AES vs SHA vs RSA + when each applies)
4. **Hashing vs encryption** scenario classification
5. **Windows editions** (Home/Pro/Pro Workstations/Enterprise/Education feature matrix)
6. **Multi-path tool access** (Disk Management/Event Viewer/Services etc. via 5+ different paths)
7. **NTFS vs Share permissions** + precedence
8. **Backup methodology** (Full/Incremental/Differential/Synthetic + restore order + 3-2-1)
9. **Cross-OS commands** (Win/Linux/macOS — distinct purposes per OS)
10. **Malware types** (Virus/Worm/Trojan/Ransomware/Spyware/Rootkit/RAT + symptoms)

### C.5 — Stage 6 authoring guidance

1. **Format mix** (per VoC §7 for both):
   - ~85% MCQ
   - ~10% multi-select
   - ~5% order (malware-removal step ordering + cloud deployment ordering — Core 2 specifically)
   - **PBQ format simulation**: not all 5 question types can replicate the exam's drag-and-drop / matching PBQs; the Custom Quiz mode + AI generation can lean on multi-step scenario stems that approximate PBQ depth.

2. **Wording discipline** (per VoC §4):
   - Stem 30-60 words; less wordy than Dion's tests; CompTIA-style
   - Every exemplar's distractor set includes ≥1 plausible-but-wrong option that mirrors a competing concept (the §C.4 clusters)
   - "BEST" / "NEXT" / "FIRST" qualifier-rich distractors per VoC §2.9
   - Bias toward scenario application; don't ship pure definition-recall

3. **VoC-mandated cluster floors per exam** (per §6h):

   **Core 1**:
   - ≥8 RAID configure+repair exemplars
   - ≥8 printer troubleshooting exemplars
   - ≥5 cloud service model scenarios (IaaS/PaaS/SaaS)
   - ≥4 DNS TXT records (SPF/DKIM/DMARC)
   - ≥4 mobile burn-in/swollen battery
   - ≥3 STP vs UTP environment scenarios
   - ≥3 hardware component-level repair (S1.4)

   **Core 2**:
   - ≥10 social engineering distinctions (phishing family + tailgating + piggybacking)
   - ≥10 Windows command line exemplars
   - ≥8 malware symptom + removal step exemplars
   - ≥5 multi-path tool access exemplars (S2.2)
   - ≥5 Windows editions feature matrix exemplars
   - ≥4 cross-OS command exemplars (Win/Linux/macOS)
   - ≥4 MFA factor categorization exemplars
   - ≥4 backup methodology + 3-2-1 exemplars
   - ≥4 change management process exemplars
   - ≥3 scripting language identification exemplars (S10 — modest dial)

4. **Practice-test calibration discipline** — VoC §6 + §13.7 confirm Dion is over-tuned (harder than real); CertMaster Learn weak; BurningIceTech Patreon close to real PBQs (but on prohibited list per §10). Our 7-layer validation pipeline + the public-CompTIA-only source = the answer. Author the 400 exemplars THEN let Haiku generate against them with the validation stack on top.

5. **DOWNGRADE areas** (per VoC counter-evidence):
   - Raw port-number memorization isolation (VoC Core 1 §4 #4 counter-evidence: candidates over-prepare on ports + see few isolated port questions; bias toward port-in-scenario stems)
   - Cable termination (T568A/B) PBQs (VoC Core 1 §2.8: less common than expected)

6. **Legal boundary (unchanged from §10)** — every exemplar still authored from PUBLIC CompTIA A+ Exam Objectives v4.0 PDFs (Core 1 + Core 2) ONLY. ZERO ingestion from Dion / Mike Meyers / CertMaster / Pearson / Skillcertpro / BurningIceTech / Crucial / Whizlabs / MeasureUp / TutorialDojo / paid Pluralsight / paid LinkedIn Learning / O'Reilly / Udemy / ExamTopics. The VoC quotes are about EXAM-TAKER experience, not question content — quoting topics is fine; reproducing or paraphrasing any specific question is NOT.

### C.6 — Verbatim founder-VoC quote bank

The 30+ quotes in Core 1 VoC §8 + 28+ quotes in Core 2 VoC §8 are the authoring reference for exemplar voice + scenario framing. When in doubt on whether a stem is testing the right thing, cross-reference the VoC quote bank.

### C.7 — Confidence labels

| Finding integrated to plan | Confidence | Action taken |
|---|---|---|
| 80 Q / 90 min / 675 Core 1 / 700 Core 2 | High | Applied to both cert pack meta upfront |
| PBQ count 3-6 (modal 4-5 per exam) | High | Bank biased toward scenario-style stems for PBQ approximation |
| RAID configure+repair PBQ topic | High | 8+ exemplars in Core 1 Hardware/Troubleshooting |
| Cloud service-model depth | High | 5+ scenario exemplars in Core 1 Virt+Cloud |
| Social engineering distinctions tested | High | 10+ exemplars in Core 2 Security |
| Windows command line heavy | High | 10+ exemplars in Core 2 OS |
| Malware symptom + removal heavy | High | 8+ exemplars in Core 2 Software Troubleshooting |
| Multi-path tool access tested | Medium-High | 5+ exemplars in Core 2 OS |
| Cross-OS commands (Win/Linux/macOS) expanded | Medium-High | 4-5 exemplars in Core 2 OS |
| DNS TXT records (SPF/DKIM/DMARC) on Core 1 | Medium | 4+ exemplars in Core 1 Networking |
| Scripting language identification expanded in 220-1202 | Low (modest dial) | 3-4 exemplars in Core 2 Operational Procedures |
| Dion + CertMaster + BurningIceTech as banned sources | High | Added to §10 prohibited list |
| Within-subdomain Core 1 ↔ Core 2 switching (new pattern) | NEW architecture | Tested thoroughly in Stage 3 + 10 + 13 |

### C.8 — Post-ship Phase 3 cycle plan

After founder takes either A+ exam (or a paid practice test), apply the Jason Dion Method per exam:
1. Founder shares gap topics in own words only (never reproduces question text)
2. Claude authors 3-5 new exemplars per gap
3. Append to the appropriate `questionExemplars[]` + add 1-2 retention concepts per gap to `retentionGapConcepts[]`
4. Ship as Phase 3 Cycle 1 per exam (v7.6.x patch release)

Per the Sec+ Phase 3 precedent (Cycles 1-6 grew retention concepts from 8 → 18 → 26), expect both A+ exams to grow similarly post-real-practice-test.

---

**End of plan.**
