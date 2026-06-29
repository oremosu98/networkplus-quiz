---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec, drill]
---
# Decision Lab — design spec (2026-06-25)

**Status:** approved in brainstorming (VOC-research-led; visual companion, 1 concept / 4 panels, signed off; 4-stage design pass applied — design-taste-frontend · emil-design-eng · humanizer · marketing-psychology).
**What it is:** a NEW interactive drill for the cloud-fundamentals certs (Azure **AZ-900**, **AI-900**, **SC-900**, AWS **CLF-C02**) — a **sibling** to the CompTIA "Sim Lab" PBQ drill, reusing its engine. Closes the gap where CompTIA certs get a hands-on drill and the cloud certs get only the MCQ quiz.
**Grounded in:** `docs/research/2026-06-25-cloud-certs-drill-voc.md` (the VOC brief: the #1 pain across all four certs is "scenario → pick the right service/tool under a buried constraint when 3 of 4 options look right").
**Builds on:** the shipped Sim Lab engine — `features/sim-lab.js` (step renderers, scoring, session machine, wall-clock countdown), the cert→seed-bank scaffold pattern, and `docs/superpowers/specs/2026-06-25-sim-lab-exam-mode-design.md`.

**Visual contract (HARD RULE):** `mockups/decision-lab-concept.html` IS the build, lifted markup/classes/copy, not reinterpreted. Four panels: (1) entry (mode toggle + cert target + decisions picker), (2) the hero scenario→pick card graded with **per-distractor reasoning**, (3) a shared-responsibility sorter (a different round type), (4) the verdict with the "look-alikes you still confuse" read. Tokens come from live `dg-system.css` (`--surface2`/`--surface3`/`--text`/`--text-dim`/`--accent`/`--green`/`--yellow` — NOT `--surface-2`/`--ink`; that's the documented trap). **Both light and dark verified** (BRAND.md §3).

**Brand guardrails:** forged-bronze tokens only (no hardcoded hex on chrome); Fraunces display + Inter UI; eyebrows Inter 800 10-11px; easing `cubic-bezier(0.16,1,0.3,1)`; entrances `scale(0.96-0.98)`; `:active scale(0.97)`; hover gated `@media (hover:hover) and (pointer:fine)`; reduced-motion respected; **no em-dashes** (`·`); no left-accent-border callouts (full tinted hairline); semantic ✓/✗/→ only. `dg-system.css?v=` bump on any dg edit. **Honesty-first: never call this a "PBQ" or "hands-on"** — these exams have neither; nothing is simulated.

---

## 1 · Problem

CompTIA certs (Net+/Sec+/A+) get the hands-on Sim Lab PBQ drill; the cloud-fundamentals certs (AZ-900/AI-900/SC-900/CLF-C02) get only the generic MCQ quiz — lopsided. But those exams have no PBQs. VOC research (4 certs, web-verified, dual-checked) found one dominant, durable pain shared by all four: **read a constrained scenario, classify it, eliminate plausible look-alikes, choose the single best service/tool, and know why the runner-up is wrong.** No competitor fills the "missing middle" between passive MCQ banks and off-target live-cloud labs; AI-900 and SC-900 have almost no hands-on option anywhere.

---

## 2 · Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Relationship to Sim Lab | **Sibling drill, reuse the engine.** Own name/entry/branding/registry/seed banks; reuse Sim Lab's step renderers + scoring + session machine + countdown. Honest split: Sim Lab = CompTIA PBQ, Decision Lab = cloud scenarios. |
| 2 | Cert scope at launch | **All four** (AZ-900, AI-900, SC-900, CLF-C02). |
| 3 | Modes | **Practice** (per-distractor reasoning shown each round) + **Exam-style** (timed, no feedback until the verdict). Free = 1 set/day practice; Pro = unlimited + exam-style + cross-session weak-spots. |
| 4 | Name | **Decision Lab.** |
| 5 | Differentiator | **Per-distractor reasoning on every practice round** (why each wrong option is wrong) — the thing plain MCQ banks lack. |
| 6 | Verdict signature | **"Look-alikes you still confuse"** (missed look-alike pairs) + weak service-families + "drill these" action. |

---

## 3 · Architecture

Decision Lab is a sibling that **reuses the Sim Lab engine internals** and **mirrors its scaffold pattern** with its own registry. Do not fork the step renderers or the session/countdown machine; parameterize/share them.

### 3.1 Reused as-is (from `features/sim-lab.js`)
`simLabRenderStep` + the 5 step renderers (`_slRenderAnalyze/Match/Categorize/Order/Fillin`), `simLabScoreScenario`, the round-loop + verdict shape, the wall-clock countdown (`_slStartCountdown` etc. from exam mode), `_gateProOnly`, the `.reveal` IO stagger. Decision Lab calls these; it does not duplicate them.

### 3.2 New: cloud cert allowlist + seed registry (mirror the Sim Lab scaffold)
- `_DL_CERTS = ['az900', 'ai900', 'sc900', 'clfc02']` (Decision Lab's own allowlist; distinct from `_SL_PBQ_CERTS`).
- `_DL_SEED_GLOBALS = { az900:'DECISION_LAB_SEED_AZ900', ai900:'…AI900', sc900:'…SC900', clfc02:'…CLFC02' }` + `_dlBank(cert)` resolver (mirror `_slBank`).
- `app.js` loader gains `_DL_SEED_FILES` (cert→`features/decision-lab-seed-<cert>.js`) and a `_ensureDecisionLabLoaded` lazy-loader mirroring `_ensureSimLabLoaded`.
- **Refactor opportunity:** `_slBank` and `_dlBank` are identical except for the registry — extract a shared `_seedBank(registry, cert)` helper to avoid duplication (targeted, in-scope).

### 3.3 New: the per-option reasoning schema (the differentiator)
The hero is a scenario→pick **analyze** step, but the current `analyze` schema only has one `explanation` per step. Decision Lab scenarios carry **per-option rationale**. Extend the `analyze` payload, backward-compatibly:
```
{ type:'analyze', points:1, prompt, explanation,
  payload: { multi:false, lines:[ { id, text, why } ] },   // `why` = "why this option is wrong" (optional; absent on the correct line or omittable)
  answer: { selected:[id] } }
```
- `_slRenderAnalyze` extends to render each line's `why` **on grade** (correct line shows a ✓ "Best" + the `explanation` as "the tell"; wrong lines reveal their `why`). PBQ analyze seeds without `why` render exactly as today (backward-compatible).
- The mockup's "the tell" teach block = the step `explanation`; the per-option "why wrong" = the line `why`.

### 3.4 New: look-alike clustering for the verdict
Seeds tag scenarios with a `pair` field carrying the **display label** (e.g. `pair:'Pricing Calculator vs TCO Calculator'`) and a `family` display label (e.g. `family:'Cost & pricing tools'`), so the verdict can cluster **missed** scenarios by look-alike pair ("Pricing Calculator vs TCO Calculator · missed ×2") and by service family with no separate id→label map. Both are optional (a scenario without a `pair` just doesn't contribute to that cluster). A `_dlVerdictClusters(results)` helper aggregates misses → pairs + families. Pro persists these across sessions (mirror `_slRecordWeakSpots`); free shows the current set only.

### 3.5 Pages (index.html)
Dedicated Decision Lab pages mirroring the Sim Lab page structure (its own branding/eyebrow/mark, but the same shell + step-body chrome):
- `#page-decision-lab-entry` — mode toggle (`.seg` Practice/Exam-style) + cert target + decisions picker (5 / 10 / 20·full set).
- `#page-decision-lab` — the runner: topbar (Decision Lab strip + round pill + countdown in exam-style) + progress dots + step body + footer (Flag + Next). Review/verdict reuse the session shape.
- `#page-decision-lab-result` — verdict: score figure + "look-alikes you still confuse" + weak families + "Drill your 3 look-alikes".
- Home: a **Decision Lab tile** in Home → Practice (mirrors the Sim Lab tile), shown only when `CURRENT_CERT ∈ _DL_CERTS`.

### 3.6 Modes / session
- **Practice:** per-round grade reveal with per-option reasoning (the hero behavior). Free = 1 set/day (`_dlBumpFreeRun`, independent counter); Pro = unlimited.
- **Exam-style (Pro):** reuse the exam-mode wall-clock countdown; **suppress per-round feedback**, defer all reasoning to a retro-reveal in the verdict. Whole-set countdown (budget = Σ per-decision estSeconds, or a fixed per-decision allowance — pick Σ est × 1.0 for v1, no tightening). Time-up → auto-submit → verdict.
- All Pro gates route through `_gateProOnly` (IAP-safe).

---

## 4 · Free / Pro gating + gate copy

| Surface | Free | Pro |
|---|---|---|
| Practice sets/day | 1 | unlimited |
| Decisions per set | 5 / 10 | 5 / 10 / 20 (full set) |
| Per-distractor reasoning | every miss (full) | every option, every round |
| Exam-style timed mode | locked → gate | included |
| Look-alike weak-spots | current set only | persisted + resurfaced across sessions |

**Gate copy (verbatim, `_gateProOnly('Decision Lab', …)`):**
> **Exam-style tap:** title `Exam-style mode is Pro` · body `The real exam never explains why your pick was wrong, and never gives you the clock back. Exam-style runs a timed, no-feedback set so the first time you feel that pressure isn't on test day. Pro unlocks it, plus unlimited sets and weak-spots that follow you across sessions.` · primary `Go Pro` · secondary `Keep practicing`
> **20-decision set tap:** title `The full 20-decision set is Pro` · body `Short sets warm you up; the real exam is a marathon of back-to-back calls. The 20-set rehearses that stamina. Pro removes the cap.`
> **2nd set/day:** title `That's today's free set` · body `Come back tomorrow free, or go Pro to keep drilling now while the misses are fresh. Same-day re-drill on the services you just confused is where the look-alikes stick.` · primary `Continue with Pro` · secondary `Remind me tomorrow`

---

## 5 · Copy (ships verbatim; 4-stage-passed — lift from the mockup)
- Entry lede: "Stop getting blindsided by look-alike service questions. Three of four options look right; the buried constraint picks the winner. Practice shows the why; exam-style hides it and starts the clock."
- Mode toggle: Practice = "Why each wrong option is wrong"; Exam-style = "Timed · no feedback till the end" + Pro tag.
- Free/Pro note: "Free · 1 set a day, full reasoning on every miss. Pro · unlimited sets, exam-style timing, and weak-spots that follow you across sessions."
- Scenario prompt: "Pick the best service"; constraint pill: "Constraint · …"; the constraint keyword is `<mark>`-highlighted in the scenario.
- Verdict: score "Right calls"; caption "Solid · your 3 misses are the same trap: two look-alike pairs. Fix those and you're at 10."; sections "Look-alikes you still confuse" + "Weak service families"; CTAs "Drill your 3 look-alikes →" (primary) + "Back to Practice".
- No em-dashes; no fabricated stats; semantic marks only.

---

## 6 · Seed banks (the content track — the bulk of the work)

Four banks, **~50 decision-scenarios each (~200 total)**, in `features/decision-lab-seed-<cert>.js`, exporting `window.DECISION_LAB_SEED_<CERT>`. Same step schema as the Sim Lab seeds **plus** the §3.3 per-option `why` and §3.4 `pair`/`family` tags. Authored from the VOC pains per cert (`docs/research/2026-06-25-cloud-certs-drill-voc.md` §2), weighted to each exam's skills-measured domains.

**Round-type mix per bank** (from the VOC pain→interaction map):
- scenario→pick (the through-line) → **analyze** with per-option `why` (the majority).
- look-alike face-off → **match** or **analyze**.
- categorize-before-choosing + shared-responsibility sorter → **categorize** (shared-responsibility for AZ/SC/CLF; service-family for all).
- workflows (ML lifecycle, Conditional Access, knowledge-mining) → **order**.
- composite-SLA / quantitative (AZ-900) → **fillin**.

**Authoring playbook (same as Sec+/A+):** author from blueprint + VOC → **dual-expert review** (a cloud SME for the vendor + a cert examiner per exam) → **founder verification** → register in `_DL_SEED_GLOBALS` + `_DL_SEED_FILES` → ship. Deterministic, verifiable answers only; honesty-first (no fabricated content). Cert exam codes/names come from the live cert packs (`certs/az900.js` etc.) via `CERT_PACK.meta`.

---

## 7 · Motion & interaction (emil pass — for the build)
- **Grade reveal:** correct option border/bg crossfade 180ms `var(--ease)` + one-shot settle `scale(1→1.015→1)`; per-option `why` lines reveal via `grid-rows 0fr→1fr` + opacity + 2px rise, **staggered 40ms** top→bottom (≤160ms total); verdict marks (✓/✗) `opacity+scale(0.8→1)` 160ms after the tint; "the tell" block enters last (`opacity+translateY` 220ms). Picked-wrong marks first (no shake — teaching, not punishing).
- **Option press:** `:active scale(0.97)` 150ms, only pre-grade.
- **Sorter:** tap-to-place + drag (pointer); token travels to its column via FLIP 220ms; drop-zone dashed→solid accent on hover/over; **boundary-shift re-grade (the signature)** — on service-selector change, moved tokens animate across columns via FLIP 260ms staggered 50ms with an accent tint pulse (the motion IS the lesson). Grade on Submit.
- **Round transitions:** outgoing `opacity+translateX(-12px)` 180ms / incoming `+translateX(12px→0)` 200ms; dots recolor 200ms. Interruptible (users click Next fast).
- **Score figure:** count-up 0→N over 800ms ease-out (data-sweep), tabular-nums; reduced-motion renders final instantly.
- **Constraint highlight:** `<mark>` wipe-in via clip-path 240ms on card enter (draws the eye to the buried constraint).
- **a11y:** options are `role=radio` in a `radiogroup`; A–D hotkeys + Up/Down; Enter/Space select; separate Submit; on grade → `aria-disabled`, focus to teach block, `aria-describedby` → each line's `why`, `aria-live=polite` result; `:focus-visible` 2px accent ring. **≥44pt** hit areas on options, `.srv`, `.tok`, flag, nav, chips, segments.
- **Reduced-motion:** opacity-only crossfades, no stagger, no count-up, tokens jump (no travel).

---

## 8 · Cross-platform (Desktop · Safari · iOS / iPad)
- **Both themes** verified (light is primary). The graded correct/wrong tints must read on ivory and charcoal.
- **Touch:** ≥44pt everywhere; the sorter reuses the shipped per-gesture controller (touch = tap-to-place, mouse/pen = drag). Inputs (`fillin`) keep `inputmode`.
- **Exam-style countdown:** reuse the exam-mode **wall-clock/deadline-derived** countdown (iOS background-safe; visibilitychange/focus re-sync; background-expiry auto-submit).
- **IAP gate:** all Pro gates via `_gateProOnly` so iOS shows IAP, not Stripe.
- **Tall graded card (mobile):** when a scenario→pick grades, four per-option `why` lines + the teach block expand the card a lot. On phones the card must scroll cleanly and the primary "Next decision" CTA must stay reachable (sticky footer or scroll-to it after grade); the grade-reveal stagger must not push the CTA off-screen unannounced.
- **Responsive:** narrow-centered `gnt`-style shell, single column on phones; `100dvh` + `env(safe-area-inset-*)` via the app shell; iPad portrait stacks, landscape stays centered.
- **Verification:** e2e across chromium + webkit + mobile-safari; founder real-device pass before ship.

---

## 9 · Out of scope (v1)
- Non-cloud / non-MCQ certs (Decision Lab is for the cloud-fundamentals family; CompTIA stays on Sim Lab).
- Adaptive difficulty, spaced-repetition scheduling of look-alikes (the verdict surfaces them; auto-scheduling is later).
- Live-cloud sandbox / real console (deliberately — these exams never deploy anything).

---

## 10 · Testing
- **e2e (`tests/e2e/decision-lab.spec.js`)**: entry mode toggle + cert target + gate (free taps Exam-style/20-set → `_gateProOnly`); set builds from seed bank; scenario→pick grades with per-option `why` revealed; sorter places + the boundary-shift re-grade; exam-style suppresses per-round feedback + countdown drives time-up; verdict clusters missed look-alike pairs + weak families; practice 1/day cap; Pro unlimited. Cross-cert (az900 + one other). No Sim Lab regression (shared engine untouched in behavior).
- **UAT structural pins**: `#page-decision-lab-entry`/`-result` exist; `_DL_CERTS`; `_dlBank`; per-option `why` render path; no `_bumpPbqFreeRun`/uses `_dlBumpFreeRun`; gate copy present; Decision Lab Home tile gated to `_DL_CERTS`.
- **Seed self-validation**: each of the 4 banks 50/50 structurally valid + cross-refs resolve (the node validator used for the cert seeds).
- Both-theme + the founder real-device pass.

---

## 11 · Ship
Fast lane (drills JS/CSS/copy + seed content + landing bullet). `dg-system.css?v=` bump. Version bump via `scripts/bump-version.js`. The engine/UI lands first; the 4 seed banks land as content (author → dual-review → verify) and register cert-by-cert. Add a Decision Lab Pro bullet to `landing/pricing.html`. Cross-platform verify + founder real-device pass.
