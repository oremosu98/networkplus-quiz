# Decision Lab — seed authoring contract (2026-06-26)

Single source of truth for the 4 Decision Lab seed banks. Authors AND reviewers read this.
Derived from `2026-06-25-decision-lab-design.md` §3.3/§3.4/§6 + the VOC brief
`docs/research/2026-06-25-cloud-certs-drill-voc.md`. Template = `features/sim-lab-seed-secplus.js`
and `features/sim-lab-seed-aplus-core1.js` (mirror their shape exactly, plus the additions below).

---

## 1 · The four banks

| Cert | File | Global | Pack name · code (verified live) |
|---|---|---|---|
| AZ-900 | `features/decision-lab-seed-az900.js` | `window.DECISION_LAB_SEED_AZ900` | Microsoft Azure Fundamentals · AZ-900 |
| AI-900 | `features/decision-lab-seed-ai900.js` | `window.DECISION_LAB_SEED_AI900` | Microsoft Azure AI Fundamentals · AI-900 |
| SC-900 | `features/decision-lab-seed-sc900.js` | `window.DECISION_LAB_SEED_SC900` | Microsoft SC-900 · SC-900 |
| CLF-C02 | `features/decision-lab-seed-clfc02.js` | `window.DECISION_LAB_SEED_CLFC02` | AWS Cloud Practitioner · CLF-C02 |

`cert` field value per scenario: `'az900'` / `'ai900'` / `'sc900'` / `'clfc02'` (lowercase, matches `_DL_CERTS`).
**~50 scenarios per bank.** File header comment: `/* DRAFT <cert> Decision Lab seed scenarios — answers NOT yet founder-verified. Review before ship. */`

---

## 2 · Scenario object (every scenario)

```js
{
  id: '<cert>-dl-<topic>-<n>',     // e.g. 'az900-dl-cost-1' — unique across the bank, kebab-case
  cert: 'az900',                    // lowercase cert key
  objective: '3.2',                 // skills-measured domain ref (vendor outline)
  topic: 'Cost management',         // short human topic label
  title: 'Pick the right cost tool',
  estMinutes: 3,
  scenario: 'A finance team wants to know how much they will save before moving ...',
  pair: 'Pricing Calculator vs TCO Calculator',   // OPTIONAL display label — see §4
  family: 'Cost & pricing tools',                  // OPTIONAL display label — see §4
  steps: [ /* usually ONE step */ ]
}
```

- IDs unique within a bank. `pair`/`family` are plain display strings (no id→label map anywhere).
- Most scenarios are single-step. Multi-step is allowed (e.g. service-pick then a shared-responsibility follow-up) but keep it rare and purposeful.

---

## 3 · Step types (reuse the Sim Lab engine — do not invent new types)

### 3a · `analyze` (the majority — scenario→pick, with the NEW per-option `why`)
```js
{ id: 's1', type: 'analyze', points: 1,
  prompt: 'Pick the best service',
  explanation: 'TCO Calculator compares an existing on-prem footprint against Azure BEFORE migrating — that is exactly this ask. "The tell" = "before moving" + "how much they will save vs today".',
  payload: {
    multi: false,
    lines: [
      { id: 'l1', text: 'Pricing Calculator', why: 'Estimates the cost of NEW Azure services you are about to build — it has no on-prem baseline to compare against.' },
      { id: 'l2', text: 'TCO Calculator' },   // correct line: omit `why` (or it may carry a short confirming note; prefer omit)
      { id: 'l3', text: 'Microsoft Cost Management', why: 'Monitors and analyses spend on resources you ALREADY run in Azure — nothing to migrate yet.' },
      { id: 'l4', text: 'Azure Advisor', why: 'Recommends optimisations on deployed resources; it does not model a pre-migration comparison.' }
    ]
  },
  answer: { selected: ['l2'] } }
```
- **NEW vs PBQ seeds:** each WRONG line carries `why` = *why that look-alike is wrong* (the differentiator). The correct line omits `why`. `explanation` = "the tell" (the buried-constraint reasoning, shown on the correct line on grade). This is backward-compatible: the engine renders lines without `why` exactly as today.
- 4 options standard. `multi:false`, single correct id. Where the exam removes the giveaway keyword, do the same and let the constraint carry it; `<mark>` the constraint keyword in the `scenario` prose where natural.

### 3b · `match` (look-alike face-off / concept-pair)
```js
{ id:'s1', type:'match', points:1, prompt:'...', explanation:'...',
  payload:{ left:[{id,label}...], right:[{id,label}...] },
  answer:{ pairs:{ leftId:'rightId', ... } } }
```

### 3c · `categorize` (service-family sorter; shared-responsibility for AZ/SC/CLF)
```js
{ id:'s1', type:'categorize', points:1, prompt:'...', explanation:'...',
  payload:{ items:[{id,label}...], buckets:[{id,label}...] },
  answer:{ map:{ itemId:'bucketId', ... } } }
```

### 3d · `order` (workflows — ML lifecycle, Conditional Access, knowledge-mining)
```js
{ id:'s1', type:'order', points:1, prompt:'...', explanation:'...',
  payload:{ items:[{id,label}...] },
  answer:{ correctOrder:['id1','id2',...] } }
```

### 3e · `fillin` (composite-SLA / quantitative — AZ-900 mainly)
```js
{ id:'s1', type:'fillin', points:1, prompt:'...', explanation:'...',
  payload:{ fields:[{id,label,inputmode:'text'|'numeric'}] },
  answer:{ <fieldId>:['accepted','answer','variants'] } }   // array of accepted string forms
```

---

## 4 · Look-alike clustering tags (`pair` + `family`)

The verdict clusters MISSED scenarios by look-alike `pair` and by service `family` (both display labels).
- Add `pair` to any scenario built around a genuine look-alike confusion (the two services people swap). Use a stable, human label: `'CloudWatch vs CloudTrail'`, `'Sensitivity vs Retention labels'`, `'Policy vs RBAC vs Locks'`.
- Add `family` for the service grouping: `'Cost & pricing tools'`, `'Defender family'`, `'Governance tools'`, `'AWS monitoring & audit'`.
- Reuse identical `pair`/`family` strings across scenarios that share the confusion (so the verdict aggregates them). Exact-string match — be consistent.
- Both optional. A scenario with no real look-alike (e.g. a pure definition match) can omit them.

---

## 5 · Per-cert domain weighting (~50 each)

Weight to the vendor skills outline. Lead with scenario→pick `analyze` (the through-line, ~55-65% of each bank).

- **AZ-900:** Cloud concepts (~25%), Architecture & services — compute/storage/network/identity service-pick (~35-40%), Management & governance — Policy vs RBAC vs Locks vs Blueprints, cost tools, composite-SLA `fillin`, shared-responsibility `categorize` (~30-35%). Include the cost-tool trio + the series-SLA calc.
- **AI-900:** AI workloads & Responsible AI (~20%, apply-don't-recite "which principle is violated" `match`), Vision/Document Intelligence/Language/Speech/OpenAI service-pick at overlapping boundaries (~40%), ML fundamentals vocab — regression vs classification vs clustering, features vs labels (~25%), Generative AI (~15%). ML-lifecycle `order`. **No shared-responsibility for AI-900.**
- **SC-900:** Security/compliance/identity concepts (~25%), Entra identity — authN/authZ, MFA vs Conditional Access, PIM (~25%), Microsoft security solutions — the Defender family name-soup, Sentinel vs Defender for Cloud (~30%), Purview/compliance — sensitivity vs retention labels, DLP, Compliance vs Secure Score (~20%). Conditional-Access `order`; shared-responsibility `categorize` allowed.
- **CLF-C02:** Cloud concepts & CAF (~24%), Security & compliance — shared-responsibility boundary shifts with managed services (EC2 vs RDS vs Lambda), IAM (~30%), Technology & services — CloudWatch/CloudTrail, Inspector/Macie/GuardDuty, EBS/EFS/S3, AI/ML abstraction-layer gate (~34%), Billing/pricing/support — the cost-tool quartet (~12%). Shared-responsibility `categorize` with a service that shifts the boundary.

---

## 6 · Honesty & quality rules (hard)

1. **Deterministic, verifiably-correct answers only.** Every correct answer must be unambiguous against the current vendor service definitions. No "it depends" items.
2. **Never call this a "PBQ", "hands-on", "lab", or "simulation."** These exams have none. Scenarios are decision questions, not simulated consoles.
3. **No fabricated stats, quotes, or invented product names.** Use real, current service names (verify against general knowledge of the vendor portfolio; flag any you are unsure are current). Respect the VOC §6 fabrication flags (the SC-900 "74%" stat and named-person quotes are OUT; do not reference them).
4. **No em-dashes anywhere** — use `·` or restructure. (Brand rule.)
5. Every `analyze` wrong line gets a `why` that teaches the discrimination (what question that look-alike actually answers), not a generic "this is wrong."
6. `explanation` ("the tell") names the buried constraint that picks the winner.
7. Plain ASCII in JS string values where possible; if a real product name needs a special char, keep it accurate.

---

## 7 · Self-validation (author runs before returning)

Load the bank under a `window = {}` shim, eval the file, then assert:
- exactly ~50 scenarios (48-52 acceptable);
- all `id` unique within the bank;
- every scenario `cert` === the bank's cert key;
- every step `type` ∈ {analyze, match, categorize, order, fillin};
- `analyze`: `answer.selected` ids all exist in `payload.lines`; every NON-selected line has a non-empty `why`; `multi:false`;
- `match`: `answer.pairs` keys ⊆ left ids, values ⊆ right ids, bijective;
- `categorize`: `answer.map` keys === item ids, values ⊆ bucket ids;
- `order`: `answer.correctOrder` is a permutation of item ids;
- `fillin`: each answer key matches a `payload.fields[].id`, value is a non-empty string array;
- no em-dash (`—`) anywhere in the file.

Return the validator output (counts + PASS/FAIL per check) with the file.
