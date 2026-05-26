# Progress Page Redesign · Design Spec

**Date:** 2026-05-26
**Scope:** `#page-progress` across BOTH Network+ (N10-009) and Security+ (SY0-701)
**Supersedes:** v4.99.66 editorial rebuild (`mockups/netplus-progress-concept.html` + `mockups/secplus-progress-concept.html`)
**Founder direction:** "doesnt look up to my standard yet"
**Design skills loaded:** design-taste-dashboards (style routing) · ui-ux-pro-max (priority rubric) · emil-design-eng (motion craft) · stop-slop (copy rubric)

---

## 1. Style routing decision (LOCKED)

**Style:** `dashboards` (design-taste-skill-pack route)
**Typography support:** editorial-premium (Fraunces display + Inter body, the locked forged-bronze system)
**Why:** Progress is an operator instrument — 50 N+ topics × 5 domains × mastery percentages × prescriptive drill CTAs. Metrics-led admin surface, not editorial story. Per skill spec: "Dashboard metrics should feel like one instrument surface, not detached pricing cards."

**Dial baselines (overriding the design-taste defaults for this surface):**
- `DESIGN_VARIANCE = 3` (calmer than baseline 4 — Progress is scanned, not celebrated; the emil frequency rule)
- `MOTION_INTENSITY = 2` (lower than baseline 4 — no scroll reveals, no fills, no entry stagger; static bars only)
- `VISUAL_DENSITY = 7` (baseline — cockpit-adjacent; 50+ rows of data on N+ side)

---

## 2. Audit of v4.99.66 — what didn't hit standard

The existing mockups got the EDITORIAL DISCIPLINE right (0 emoji, 0 hex, 0 em-dash, OKLCH tokens, hairline rules, semantic colors only, static bars, typographic verdicts, tabular nums, prefers-reduced-motion gated). They fail on **7 specific points** when measured against the 4 design skills:

### 2.1 Hero strategy is marketing-led, not work-led (dashboards violation)
Current: opens with eyebrow "Coverage · 50 topics" + 42px display heading "Topic progress." — a hero in the editorial sense.
Skill brief: "The hero must be useful UI: overview strip, command bar, queue, board, live slab, or operator split. The page must start with work, not with a marketing headline or intro paragraph."
**Fix:** demote the headline to a 14px eyebrow + topic count chip; promote the mastery instrument to the hero slot.

### 2.2 Stat tiles read as 4 detached numbers, not one instrument (dashboards violation)
Current: 4 separated number tiles (`Strong 1` · `Solid 1` · `Weak 0` · `Untouched 48`) sitting in a flex row.
Skill brief: "Dashboard metrics should feel like one instrument surface. Prefer bands, rails, tables, split panes, maps, timeline strips, and dense slabs over KPI-card rows."
**Fix:** replace the 4-tile strip with a **single horizontal stacked bar** (one bar, 4 semantic segments) plus a tight tabular ledger underneath. One instrument, not four.

### 2.3 No domain-weighted aggregate view (dashboards "diagram by default" rule)
Current: 5 domain sections stacked vertically with identical visual treatment. No way to see "where am I weakest by exam weight" at a glance.
Skill brief (current production priorities): "Use charts, diagrams, process visuals, maps, timelines, and system graphics by default instead of relying only on cards and tables."
**Fix:** add a **domain readiness strip** below the mastery instrument — 5 mini bar segments, width proportional to domain exam weight (23/20/19/14/24 for N+; 12/22/18/28/20 for Sec+), fill proportional to studied %, color semantic (pass/warn/dim). Diagrammatic, not card-based. Doubles as a jump nav.

### 2.4 Touch targets violate 44×44 floor (ui-ux-pro-max CRITICAL)
Current: `.tgo` drill button is `width:26px;height:26px` — well below the 44×44 minimum.
Skill rule: "Minimum 44x44px touch targets" (CRITICAL priority tier).
**Fix:** expand the row's interactive surface — either grow `.tgo` to 44×44, OR make the entire `.t-row` a clickable region with the chevron as visual affordance. Latter is cleaner (row IS the click target).

### 2.5 No press feedback on CTAs (emil-design-eng violation)
Current: `.cta` only has `filter:brightness(1.05)` on hover. No `:active` press feedback.
Skill rule: "Buttons must feel responsive. Add `transform: scale(0.97)` on `:active`."
**Fix:** add `:active{transform:scale(0.97)}` + `transition:transform 160ms ease-out` to `.cta` and the row CTAs.

### 2.6 Hover states not media-gated (emil-design-eng violation)
Current: `.cta:hover` and `.tgo:hover` fire on touch devices via tap = false positives.
Skill rule: "Gate hover animations behind `@media (hover: hover) and (pointer: fine)`."
**Fix:** wrap all `:hover` rules in the media query.

### 2.7 Order is prescription-before-status (dashboards reading order)
Current: Focus band (prescription) → Mastery numbers (status) → Controls → Data.
Operator logic: "where am I" before "what to do." In a real instrument, status reads first, prescription reads second.
**Fix:** reorder to Status (mastery instrument) → Prescription (focus band) → Controls → Data.

### 2.8 BONUS — `renderProgressRecommendation` surface absent from mockup
The app.js render contract includes `renderProgressRecommendation()` → shared `_pageRecCard` → `#progress-rec-host`. The v4.99.66 mockup ignored this surface entirely. v2 must model it: the prescription band IS the recommendation card.

---

## 3. Design contract for v2 (LOCKED unless founder rejects)

### 3.1 Page architecture (top to bottom)

```
EYEBROW · Topic progress · 50 topics tracked              ← 10px uppercase dim
─────────────────────────────────────────────────────────
MASTERY INSTRUMENT (the new hero — answers "where am I")

6 of 37 studied · 16% covered                             ← 18/800 + tabular nums
[▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] ← single stacked bar
STRONG · SOLID · WEAK · UNTOUCHED                         ← legend ledger
  5  ·  1   ·   0  ·   31

─────────────────────────────────────────────────────────
DOMAIN READINESS STRIP (the new diagram — answers
"which domains are pulling weight")

General · 12% weight  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░ 95%           ← width=weight
Threats · 22% weight  ▓▓▓░░░░░░░░░░░░░░░░░░ 0%           ← fill=studied
Architecture · 18%    ▓▓▓▓▓▓▓░░░░░░░░░░░░░░ 90%
Operations · 28%      ░░░░░░░░░░░░░░░░░░░░░ 0%           ← row jumps to section
Governance · 20%      ░░░░░░░░░░░░░░░░░░░░░ 0%

─────────────────────────────────────────────────────────
PRESCRIPTION (the recommendation card — what to do)

WHERE TO DRILL NEXT
Drill PKI & Certificate Management
Your weakest studied topic. Drilling here moves
readiness furthest per minute.
                                      [ Drill PKI → ]

─────────────────────────────────────────────────────────
CONTROLS · search + filter segments
─────────────────────────────────────────────────────────
DOMAIN SECTIONS (the data)

## General Security Concepts
SY0-701 · 1.0 · 12% of exam · 5/5 studied · 95%

Security Controls    Strong · 4d ago    ▓▓▓▓▓▓ 100%  →   ← whole row is target
PKI & Certificate    Solid · 4d ago     ▓▓▓▓░░  75%  →
...
```

### 3.2 Mastery instrument (replaces 4-tile strip)

A single horizontal stacked bar showing the 4 mastery tiers as semantic segments:
- **Width:** 100% of container, height 8px
- **Segments:** Strong (pass green) · Solid (accent bronze) · Weak (warn yellow) · Untouched (rule dim)
- **Order:** left-to-right strongest-to-weakest (so "filled = good")
- **Below the bar:** a 4-column tabular ledger with COUNT + LABEL stacked, hairline-divided
- **Headline above:** `{N} of {total} studied · {pct}% covered` in 18px/800 + tabular nums; secondary line `{N} left to start` if Untouched > 0

### 3.3 Domain readiness strip (new — diagram)

5-row strip below the mastery instrument:
- Each row: `{domain name}` + `· {weight}% of exam` (10px uppercase dim) + bar + `{pct}` value
- **Bar width relative to the container is fixed at 100%; the fill % is studied/total within that domain**
- A small inline weight token (`·12%` etc) tells the reader why this domain matters
- Row is clickable — jumps to the domain section below (scroll-into-view)
- Color logic: pass (≥80%), accent (≥50%), warn (>0%), dim (0%)

### 3.4 Prescription card (modeled after `renderProgressRecommendation`)

A single hairline-bordered band (de-carded, no soft glass, no gradient):
- Eyebrow: `WHERE TO DRILL NEXT` (10px/800 accent uppercase)
- Headline: `Drill {weakest studied topic}` (23px/800)
- Sub: 1 sentence, ≤120 chars, stop-slop reviewed
- CTA: solid accent bronze button with `transform:scale(0.97)` on `:active`
- **Fallback when no studied topics exist:** prescription is "Start with {highest-weight untouched topic}"

### 3.5 Domain section header

Each domain section gets a denser header than v4.99.66:
- Row 1: `## {Domain name}` (18px/800) on the left + `{N}/{total} studied · {pct}%` (12px tabular) on the right
- Row 2: `{cert code} · {N.0} · {weight}% of exam` (10px uppercase dim) — small subtitle
- Hairline below

### 3.6 Topic row (the t-row, the most-repeated unit)

Grid: `1fr 132px 92px 14px` (was `1fr 132px 92px 30px` — chevron column narrows because the WHOLE ROW is the click target now)
- **Whole row is `<button class="t-row">`** (not a div) — `cursor:pointer`, hover state on row not chevron, 44×44 minimum effective via row height ≥48px
- Name + verdict (Strong/Solid/Weak/Untouched · timestamp) on the left
- Static 4px bar in the middle column
- Tabular % on the right
- Right-most chevron is visual affordance only (no separate button — saves DOM, removes touch-target violation)
- Mobile (<680px): hide the bar column, keep name + % + chevron

### 3.7 Visual rhythm

To break the metronomic "every section looks identical" failure:
- Studied-rows-only sections (where studied = total) get a subtle pass-tint left edge (1px) on each row
- Untouched-only sections (where studied = 0) get muted name color + reduced row padding (the row visually "compresses" because it's not earning weight)
- Section headers in untouched-only domains show `Not started` mono chip next to the count

### 3.8 Empty state (CRITICAL — not modeled in v4.99.66)

When `loadHistory().length === 0` (true fresh user):
- Mastery instrument shows the bar 100% dim with `0 of {total} studied` + sub `Take any quiz to start tracking`
- Domain readiness strip shows 5 dim rows + a CTA `Take a diagnostic →`
- Prescription card swaps to `Start with the diagnostic` (no weakest-studied topic to recommend)
- Domain sections still render (the topic catalog is the value here for orienting)

---

## 4. Stop-slop copy pass (from skill rubric)

### 4.1 v4.99.66 copy verdict
Scored against the 5-dimension rubric (Directness / Rhythm / Trust / Authenticity / Density):
- "Your weakest studied topic. One focused session here moves your readiness more than anything else right now." → **36/50** (the "more than anything else right now" is filler; the trailing "right now" is the AI-tell hand-holding pattern)
- "Topic mastery" → **30/50** (generic-y; "Your mastery" puts the reader in the scene)
- "Coverage · 50 topics" → **42/50** (specific, direct, calm)
- "Strong · 1 week ago" → **44/50** (tight ledger format, no slop)

### 4.2 v2 locked copy

| Surface | v4.99.66 | v2 (stop-slop pass) | Why |
|---|---|---|---|
| Eyebrow | `Coverage · 50 topics` | `Topic progress · 50 tracked` | Page-level eyebrow names the page |
| Mastery headline | `Topic mastery` | `Your mastery` | Puts reader in scene |
| Mastery line | `2 of 50 studied · 4% coverage` | `{N} of {total} studied · {pct}% covered` | Active verb |
| Prescription eyebrow | `HIGHEST-LEVERAGE FOCUS` | `WHERE TO DRILL NEXT` | Direct, removes jargon |
| Prescription sub | `Your weakest studied topic. One focused session here moves your readiness more than anything else right now.` | `Your weakest studied topic. Drilling here moves readiness furthest per minute.` | Cuts filler, names the unit (per minute), removes "right now" hand-holding |
| Empty-state line | (none — not modeled) | `Take any quiz to start tracking your mastery.` | Direct imperative, names the trigger |
| Section subtitle | `N10-009 · 1.0 · 23% of exam` | (unchanged) | Already optimal |
| Domain dv | `1 / 13 studied` | (unchanged) | Already optimal |
| Topic verdict | `Strong · 1 week ago` | (unchanged) | Already optimal |
| Untouched verdict | `Not studied yet` | `Untouched` | Tighter; "yet" implies guilt, calmer to drop |

### 4.3 Banned in v2 (stop-slop rules locked)
- No "right now" / "today" / "currently" filler unless time-specific
- No "Get started" / "Learn more" generic CTAs — every CTA names the specific action
- No exclamation marks anywhere
- No em-dashes (carryover discipline)
- No emojis (carryover discipline)

---

## 5. Motion budget (emil-design-eng locked)

**Frequency rule applied:** Progress is opened many times per day → motion stays minimal.

| Element | Motion | Curve | Duration |
|---|---|---|---|
| `.t-row` hover (gated `(hover:hover)`) | `background-color` shift | `ease` | 120ms |
| `.cta` hover (gated) | `filter:brightness(1.05)` | `ease` | 160ms |
| `.cta` press | `transform:scale(0.97)` | `cubic-bezier(0.23,1,0.32,1)` | 160ms ease-out |
| `.t-row` press | `transform:scale(0.995)` | `cubic-bezier(0.23,1,0.32,1)` | 160ms |
| Filter chip change | `background` + `color` shift | `ease` | 120ms |
| `prefers-reduced-motion:reduce` | All transitions neutralized to `0.01ms linear` | — | — |

**Banned:**
- No scroll-reveal stagger
- No bar-fill animations (the mastery bar is painted static; CSS `width:N%` declared once, no transition)
- No entry animation on any element
- No hover-scale on rows or buttons
- No perpetual motion

**Rationale:** dashboards skill's motion profile says "Use motion for sorting, filtering, live-state change, drawer movement, queue arrival, status emphasis, and layout continuity. Avoid theatrical scroll reveals, generic fade-up on every block, and purposeless perpetual loops." Progress has no live-state change, no queue, no drawer. The only legitimate motion is interaction feedback (hover + press).

---

## 6. Cert-aware integration (Net+ ↔ Sec+ parity)

The page is RENDER-PAINTED (not static markup) — the redesign is delivered as scoped CSS over the existing render contract. Both certs share the same render functions:

- `_renderProgressSummary(rows)` → `#progress-summary` host (app.js:2535)
- `_renderProgressGrouped(rows)` → `#progress-topic-grid` host (app.js:2631)
- `_progressRowHtml(row)` → per-row HTML (app.js:2477)
- `renderProgressRecommendation()` → `#progress-rec-host` via `_pageRecCard` (app.js:5061)

**The redesign must accommodate BOTH cert packs without code-branching:**
- N+ topic count = 50, 5 domains, weights 23/20/19/14/24
- Sec+ topic count = 37, 5 domains, weights 12/22/18/28/20
- `CERT_PACK.domainWeights` + `CERT_PACK.domainLabels` drive both
- Topic catalog comes from `TOPIC_DOMAINS` + `CANONICAL_DOMAIN_TOPICS` (cert-split into `_CANONICAL_NETPLUS` + `_CANONICAL_SECPLUS` per v4.99.80)

**Render-contract changes required:**
1. `_renderProgressSummary` must emit the new mastery-instrument-bar markup (was 4 detached `.ps2-stat-*` tiles → one `.pm-bar` + `.pm-ledger`)
2. `_renderProgressSummary` must emit the new domain-readiness-strip markup (was absent → 5 `.dr-row` elements)
3. `_progressRowHtml` must emit `<button class="t-row">` instead of `<div class="t-row">` + remove the inner `.tgo` button (chevron becomes pseudo-element)
4. `renderProgressRecommendation` host markup unchanged — only scoped CSS changes
5. Empty-state branch must be added (v4.99.66 had no empty state)

These ARE render-logic changes, not pure CSS reskin. Distinct from prior v4.99.66 ship (pure CSS over existing markup). Plan must call this out.

---

## 7. Open shape-of-solution questions for founder

Per the scope-disambiguation lesson, answer these BEFORE the mockup build. Each is a real fork that changes the shape of v2:

### Q1 · Mastery instrument: stacked bar vs ledger-only?
- **A** (recommended): horizontal stacked bar + tabular ledger below (locked spec above)
- **B**: ledger only (no bar) — calmer, more typographic
- **C**: bar on left + ledger on right in a 2-col layout — denser

### Q2 · Domain readiness strip: separate section or fold into mastery instrument?
- **A** (recommended): separate section between mastery instrument and prescription
- **B**: fold the domain strip into the mastery instrument as a single "system view"
- **C**: skip the strip; domain headers carry the info inline (less work, less data viz)

### Q3 · Topic row click target — whole-row button OR keep separate `.tgo`?
- **A** (recommended): whole `.t-row` is a `<button>` (fixes touch-target violation cleanly)
- **B**: grow `.tgo` to 44×44 (minimal markup change, less elegant)
- **C**: keep current 26×26 (don't fix the accessibility issue — not recommended)

### Q4 · Empty state — diagnostic CTA primary?
- **A** (recommended): empty state primary CTA = "Take the diagnostic" (matches landing PLG funnel)
- **B**: empty state primary CTA = "Start any quiz" (less specific)
- **C**: skip empty state design (don't model fresh user — not recommended)

### Q5 · Sec+ vs Net+ visual parity — identical or differentiated?
- **A** (recommended): structurally IDENTICAL (cert-pack drives data; design is one system)
- **B**: subtly differentiated (Sec+ slightly denser given 37 topics vs 50)

### Q6 · Off-by-one display bug from v4.99.66 ("1 of 50" vs "2 of 50") — fix in this ship?
- **A** (recommended): fix as part of v2 — _renderProgressSummary counts re-derived from rows array
- **B**: file as separate bug, ship v2 visual first
- The v4.99.66 mockup explicitly noted this bug; v2 should close it.

---

## 8. Verification gates (locked from founder pattern)

Before integration ships:
1. **Concept-mockup-first** — both v2 mockups (`mockups/netplus-progress-concept-v2.html` + `mockups/secplus-progress-concept-v2.html`) authored against this spec, light + dark themes, BOTH founder-approved before any code touches app.js or dg-system.css
2. **Render-contract changes verified in code** — the 4 changes to `_renderProgressSummary` / `_progressRowHtml` / `renderProgressRecommendation` / empty-state branch enumerated in §6 are written + behaviorally smoke-tested
3. **UAT regression guards** — existing v4.99.66 guards (Batch 4b in tests/uat.js) MIGRATED, not bypassed, to assert the new structure with equal regression strength
4. **Touch-target verification** — every interactive element measured ≥44×44 effective hit area
5. **Reduced-motion verification** — `@media (prefers-reduced-motion:reduce)` neutralizes every transition
6. **Cert-parity smoke** — both certs verified live on localhost (the SW-cache-bust gotcha) before push

---

## 9. What this spec is NOT

- Not the mockup HTML — that's the next ship (post-founder-approval of this spec)
- Not the integration code — that's after the mockup
- Not a touch of sidebar / topbar / cert switcher / global chrome
- Not a change to `TOPIC_DOMAINS` or `CANONICAL_DOMAIN_TOPICS` (catalog data unchanged)
- Not a Tier-A AI surface change (no new prompts)
- Not a service-worker fetch-logic change (fast lane per ENVIRONMENT_STRATEGY)

---

## 10. Cross-refs

- v4.99.66 row in CLAUDE.md — the rebuild this supersedes
- `mockups/netplus-progress-concept.html` + `mockups/secplus-progress-concept.html` — the v4.99.66 mockups (NOT deleted; kept as historical reference)
- `dg-system.css` Batch 4b block starting at line 652 — the scoped CSS the v2 rebuild replaces
- `app.js` lines 2477 / 2535 / 2631 / 5061 — the render functions affected
- `feedback_concept_mockup_first.md` — the locked founder pattern this follows
- Companion plan: `docs/superpowers/plans/2026-05-26-progress-redesign-v2.md`

---

## 11. Additions discovered during build (locked 2026-05-26)

Pre-mockup-build sweep — 8 specifics the §3 contract left vague or absent. Each now locked as a recommended-default decision (founder can revise at mockup review). All 6 §7 Qs default-locked to **option A** to enable the build to proceed.

### 11.1 · Filter chip behaviors (LOCKED)
- `All` (default): every row visible
- `Weak only`: rows where mastery >0% AND <70% (must be studied — untouched is not "weak")
- `Not started`: untouched rows only (renamed from `Unstudied` per stop-slop pass — removes "un-" prefix slop)
- `Strong`: rows where mastery ≥85%
- `Stale`: rows where mastery >0% AND `last_studied > 14 days ago` AND NOT already in Weak
- Filter chips are mutually exclusive (segmented control behavior)
- The mastery instrument + domain readiness strip do NOT change with filter — they show the full picture so the user can see where they are while drilling into a subset

### 11.2 · Sort orders (LOCKED)
- `Worst first` (default): mastery ASC, untouched at the bottom
- `Alphabetical`: name ASC within each domain
- `By weight`: domain weight DESC, then mastery ASC within domain
- Single segmented control; defaults to Worst first

### 11.3 · Stale tier (NEW — was implicit only)
- A topic is `stale` when `mastery > 0` AND `last_studied > 14 days ago` AND NOT already weak
- The mastery instrument bar STAYS 4-segment (Strong/Solid/Weak/Untouched) — 5th segment hurts bar legibility at 10px height
- Stale rendered as: small accent-dot suffix on the topic name (`Topic Name ·`) + timestamp in `var(--dg-warn)` instead of `var(--dg-text-dim)`
- Filter chip `Stale` exposes this tier explicitly
- The 14-day threshold matches the Analytics weak-spot scoring `WEAK_STALENESS_DAYS = 14`

### 11.4 · Focus ring contract (LOCKED)
- All interactive elements get `:focus-visible { outline: 2px solid var(--dg-accent); outline-offset: 3px; border-radius: 4px; }`
- `:focus:not(:focus-visible) { outline: none; }` — no ring on mouse click
- Applies to: `.t-row`, `.dr-row`, `.cta`, `.seg button`, `.search input`, `.tt`
- Per ui-ux-pro-max CRITICAL: visible focus on every interactive element

### 11.5 · Skeleton loading state (NEW)
- While `cloudStore.isHydrating === true`, show skeleton mode:
- Mastery instrument: bar = subtle horizontal shimmer over `var(--dg-rule-soft)` (1.2s linear infinite), ledger numbers = 14px hairline placeholders
- Domain readiness strip: 5 placeholder rows
- Prescription card: title = 60% width hairline bar, CTA hidden
- Domain sections: hidden (don't show partial data — clean swap)
- Reduced-motion: skeleton shimmer becomes static dim fill
- Hydration completes → swap to full render in single repaint (no fade)

### 11.6 · Mobile breakpoints (LOCKED)
- ≥1024px: full layout, sidebar pinned (handled by global chrome)
- 768-1023px (tablet portrait): full layout, sidebar drawers (global chrome)
- 481-767px: domain readiness strip bars hidden (show name + weight + % only), topic row bar column hidden
- ≤480px: controls bar wraps to 2 lines (search top, filters bottom), prescription card stacks vertically, CTA becomes full-width
- Topic row height stays ≥48px at all breakpoints (touch target floor)

### 11.7 · URL anchor links (LOCKED)
- Each domain section: `id="domain-<slug>"` (e.g. `domain-networking-concepts`)
- Slugs derived from kebab-case of domain key (matches `Object.keys(DOMAIN_WEIGHTS)` lowercased)
- Domain readiness strip rows: `data-domain-jump="<slug>"` + click handler updates `window.location.hash`
- On page load with hash, scroll-into-view that section + highlight the weakest studied topic within for 2s
- Enables direct sharing of a study target via URL

### 11.8 · Weakest-topic highlight after domain-strip click (LOCKED)
- When user clicks `.dr-row[data-domain-jump]`:
  - `window.location.hash = '#domain-<slug>'`
  - `target.scrollIntoView({behavior:'smooth', block:'start'})`
  - Find weakest STUDIED topic in that domain (lowest mastery%, NOT untouched)
  - Add `data-highlight="true"` to that `.t-row` for 2000ms
  - CSS: `.t-row[data-highlight]` gets `background:var(--dg-accent-tint); box-shadow:inset 2px 0 0 0 var(--dg-accent);`
  - Reduced-motion: skip scroll animation, just apply highlight for 2s
- Fallback: if domain has no studied topics, highlight the first untouched

### 11.9 · Stop-slop rename pass (LOCKED)
- `Unstudied` → `Not started` (removes "un-" prefix; more direct imperative inverse)
- `HIGHEST-LEVERAGE FOCUS` → `WHERE TO DRILL NEXT` (already in §4.2, restating)
- `Topic mastery` → `Your mastery` (already in §4.2)
- `Not studied yet` → `Untouched` (single word, no implied guilt — already in §4.2)
- All filter chip labels score ≥40/50 on stop-slop rubric

### 11.10 · §7 Qs locked to defaults (founder may revise at mockup review)
- Q1: **A** — stacked bar + tabular ledger (the dashboards instrument shape)
- Q2: **A** — separate domain readiness strip section
- Q3: **A** — whole-row button (fixes 44×44 violation cleanly)
- Q4: **A** — empty state primary CTA = "Take the diagnostic"
- Q5: **A** — structurally identical N+ ↔ Sec+, data swaps only
- Q6: **A** — fix the off-by-one display bug as part of v2

If founder rejects any default, mockup re-spins per §3 (the v2 design contract).

### 11.11 · New Open Qs (Q7, Q8) — defer/include decisions
- **Q7**: Add a "Recent activity" feed (last 5 quizzes with score + topic + time)?
  - **A** (recommended): defer — Analytics owns the activity log; Progress stays focused on topic-mastery
  - **B**: include — 5-row strip below the prescription card
- **Q8**: Add a "this week" delta (e.g. "+3 topics studied this week")?
  - **A** (recommended): defer — adds emotional weight that may be off-key; dashboards style says "operational clarity matters more than branding theater"
  - **B**: include — small chip in the mastery instrument header
