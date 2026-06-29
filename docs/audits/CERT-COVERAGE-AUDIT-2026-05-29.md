---
type: audit
status: active
cert: all
updated: 2026-06-29
tags: [audit]
---
# CertAnvil — MVP Cert-Coverage Audit

**Date:** 2026-05-29
**Scope:** End-to-end audit of cert-coverage consistency across 4 surfaces (Home, Account Settings, My Certs, Cross-Cert Analytics).
**Method:** 4 parallel read-only sub-agents + 2 direct verifications by the orchestrator.
**Canonical set (ground truth — 8 exams / 7 certs / 3 vendors):**

| Vendor | Exams | Cert file |
|---|---|---|
| CompTIA | Network+ (N10-009), Security+ (SY0-701), A+ Core 1 (220-1201), A+ Core 2 (220-1202) | `certs/netplus.js`, `secplus.js`, `aplus-core1.js`, `aplus-core2.js` |
| Microsoft | AZ-900, AI-900, SC-900 | `certs/az900.js`, `ai900.js`, `sc900.js` |
| AWS | CLF-C02 | `certs/clfc02.js` |

---

## PART A — Coverage Matrix

Legend: ✓ present & correct · ✗ missing · ⚠ present but inconsistent

| Exam | Home | Account Settings | My Certs | Cross-Cert Analytics |
|---|:---:|:---:|:---:|:---:|
| Network+ (N10-009) | ✓ | ✓ | ✓ | ✓ |
| Security+ (SY0-701) | ✓ | ✓ | ✓ | ✓ |
| A+ Core 1 (220-1201) | ✓ | ✗ | ✓ | ✗ |
| A+ Core 2 (220-1202) | ✓ | ✗ | ✓ | ✗ |
| AZ-900 | ✓ | ✗ | ✓ | ⚠ (marked "soon, ~6 wks") |
| AI-900 | ✓ | ✗ | ✗ | ✗ |
| SC-900 | ✓ | ✗ | ✓ | ✗ |
| CLF-C02 | ✓ | ✗ | ✓ | ✗ (replaced by SAA-C03) |
| **Correct / 8** | **8** | **2** | **7** | **2** |
| **Phantom non-canonical certs** | 0 | 3 | 0 | 3 |

**Phantom certs** (present but NOT in the MVP set): Cisco CCNA (200-301), AWS SAA-C03, Azure AZ-104 — appear in **both** Account Settings and Cross-Cert Analytics.

---

## PART B — Findings (severity-ranked)

### CRITICAL

**C1 — Account Settings loads only 2 of 8 certs**
- Page: Account Settings
- What's wrong: `getCertEntitlements(role)` hardcodes only Network+ and Security+. The other 6 canonical exams never render in the entitlements list / exam-results section.
- Evidence: `landing/lib/account.js:~107` — `function getCertEntitlements(role)` returns `[{id:'netplus'...}]` + pushes only `secplus`.
- Fix: extend the returned array to all 8 canonical certs (or, better, source it from the same registry the My Certs modal uses — see H1).

**C2 — Account Settings `EXAM_FORMATS` defines 3 non-canonical (phantom) certs and omits 3 canonical ones**
- Page: Account Settings
- What's wrong: `EXAM_FORMATS` contains `ccna`, `aws-saa`, `az104` (none in MVP) and is missing CLF-C02, A+ Core 1, A+ Core 2.
- Evidence: `landing/lib/account.js:~126` — `var EXAM_FORMATS = { netplus:{...}, secplus:{...}, az900:{...}, ccna:{...}, 'aws-saa':{...}, az104:{...} };`
- Fix: remove `ccna`, `aws-saa`, `az104`; add `clfc02`, `aplus-core1`, `aplus-core2`.

**C3 — Cross-Cert Analytics catalog carries 3 phantom certs and is missing 5 canonical ones**
- Page: Cross-Cert Analytics
- What's wrong: `getCertCatalog(role)` returns 6 entries — netplus, secplus, az900 (canonical) plus ccna, aws-saa, az104 (phantom). A+ Core 1, A+ Core 2, AI-900, SC-900, CLF-C02 are absent entirely; AWS is represented by SAA-C03 instead of CLF-C02.
- Evidence: `landing/lib/cross-cert-analytics.js:~80` (`getCertCatalog`, lines ~96–172). `aws-saa` entry: `{ id:'aws-saa', name:'AWS Solutions Architect', code:'SAA-C03', ... }`.
- Note: This is a **known, documented** staleness — the v7.7.0 ship log (Stage 5b) flagged `getCertCatalog` as "stale across ALL recent ships … flagged for a separate analytics-catalog refresh." This audit confirms it was never done.
- Fix: replace the catalog with the canonical 8 (drop ccna/az104/aws-saa, add aplus-core1, aplus-core2, ai900, sc900, clfc02).

### HIGH

**H1 — My Certs modal is missing AI-900**
- Page: My Certs (`renderMyCertsList()` in `landing/auth.js:416`)
- What's wrong: the modal pushes 7 rows — netplus, secplus, az900, aplus-core1, aplus-core2, sc900, clfc02 — but **no AI-900 row**. A signed-in user never sees AI-900 in their cert list.
- Evidence: `landing/auth.js:456–530` — sequential `rows.push(rowForCert({...}))` calls; no `id:'ai900'` entry. (AZ-900 added v7.3.0, A+ v7.6.0, SC-900 v7.7.0, CLF-C02 v7.8.0 — AI-900's row, shipped v7.5.0, was never added here.)
- Fix: insert an `ai900` row (glyph `AI`, `cert-glyph-ai900`, name "Microsoft Azure AI Fundamentals", code "AI-900", href `https://ai.certanvil.com/`) — between az900 and aplus-core1 to match vendor grouping.

**H2 — Analytics `DOMAIN_WEIGHTS_BY_CERT` only weights 2 of the catalog's certs**
- Page: Cross-Cert Analytics
- What's wrong: the pass-readiness panel's domain-weight map has entries for only `netplus` and `secplus`; az900 and every future cert have no domain breakdown, so Panel 1 renders empty/broken for them.
- Evidence: `landing/lib/cross-cert-analytics.js:~1015+` — `DOMAIN_WEIGHTS_BY_CERT = { netplus:{...}, secplus:{...} }` with comment "AZ-900 / CCNA / AWS / AZ-104 added when those certs ship".
- Fix: populate domain weights for all 8 canonical certs (the data exists in each `certs/*.js` `domainWeights`).

**H3 — Account Settings AWS entry uses the wrong exam (SAA-C03 vs CLF-C02)**
- Page: Account Settings
- What's wrong: `EXAM_FORMATS['aws-saa']` has `examName: 'AWS SAA-C03'`. The MVP AWS cert is Cloud Practitioner CLF-C02.
- Evidence: `landing/lib/account.js:~130`.
- Fix: replace with `clfc02` / "AWS Cloud Practitioner CLF-C02".

### MEDIUM

**M1 — Cross-Cert overlap map omits A+ ×2, AI-900, SC-900 pairs**
- Page: Cross-Cert Analytics (Panel 2, skill-overlap)
- What's wrong: `cross-cert-overlap.js` hand-authored pairs cover only the older certs; pairs involving A+ Core 1/2, AI-900 (and most SC-900 combinations) are absent, so the transfer map can't render those rows.
- Evidence: `landing/lib/cross-cert-overlap.js` (directional pair list).
- Fix: author overlap entries for the missing certs once they're in the catalog (C3).

---

## PART C — Summary

**Overall coverage health: mixed — two surfaces are correct, two are materially stale.**

- **Home (8/8) and My Certs (7/8) are healthy** — Home is fully correct; My Certs needs one row (AI-900).
- **Account Settings (2/8) and Cross-Cert Analytics (2/8) are the problem surfaces.** Both were built against an early pre-MVP roadmap config and never updated: each loads only netplus+secplus(+az900 in analytics) of the canonical set **and** carries the same 3 phantom certs (CCNA, SAA-C03, AZ-104) that are not part of the MVP. This shared stale trio strongly suggests both files were cloned from one outdated source.

**Top 3 fixes, in order:**
1. **C3 + H2 — Rebuild the Cross-Cert Analytics catalog + domain weights** to the canonical 8 (highest blast radius: drives charts, overlap map, and pass-readiness).
2. **C1 + C2 + H3 — Fix Account Settings `getCertEntitlements` + `EXAM_FORMATS`**: add the 6 missing canonical certs, remove the 3 phantom certs, correct the AWS code.
3. **H1 — Add the AI-900 row to the My Certs modal** (`landing/auth.js`).

**Process note:** This audit was read-only; no files were changed. One sub-agent (Home) returned a false "3 missing tiles" critical finding caused by reading only a partial line range — corrected by direct `grep` verification (all 8 tiles confirmed present at `landing/index.html` lines 1170–1290). Recommend the same direct verification before acting on any single-agent claim.
