---
type: architecture
status: active
cert: all
updated: 2026-06-29
tags: [architecture]
---
# Key Patterns

> Extracted from CLAUDE.md (v7.8.2 slim-down). Referenced by a one-line pointer there.

## Key Patterns

### Page Navigation
Pages are `<div class="page">` elements. `showPage(name)` toggles `.active`. All pages live in `index.html`.

### Quiz Flow
`startQuiz()` → `fetchQuestions()` (Haiku) → `aiValidateQuestions()` (Sonnet) → `validateQuestions()` (programmatic) → `injectPBQs()` → `render()`

### Question Types
| Type | Format | Scoring |
|---|---|---|
| `mcq` | 4 options, 1 correct | `pick()` |
| `multi-select` | 5 options, 2–3 correct | `submitMultiSelect()` |
| `order` | 4–5 items, arrange in sequence | `submitOrder()` |
| `cli-sim` | Terminal UI + command buttons + diagnosis MCQ | `pick()` for the MCQ part |
| `topology` | Device palette + zone placement | `submitTopology()` |

### Exam Mode
`EXAM_QUESTION_COUNT = 90`, 5 batches of 18, 90-min timer, scaled 100–900 (`EXAM_PASS_SCORE = 720`, `EXAM_MAX_SCORE = 900`). Uses `examQuestions[]` + `examAnswers[]`. Flag/unflag, navigator grid. **Strict Mode** (`STORAGE.HARDCORE_EXAM`) hides flag + prev + navigator for realistic simulation.

### AI Teacher Tiers
Every Claude call site is tiered. Tier determines model, caching, and ground-truth injection.

| Tier | Purpose | Sites | Model | Cache | GT injection |
|---|---|---|---|---|---|
| **A** | Authoritative study content (user trusts as truth) | `explainFurther()`, `showTopicDeepDive()` / `buildTopicDivePrompt()`, `fetchTopicBrief()` | Sonnet | `_aiCacheGet`/`Set`, djb2 hash, 20-entry LRU via `STORAGE.AI_CACHE` | `_buildGtHint(text, topicName)` prepends AUTHORITATIVE FACTS block |
| **B** | Math-must-be-exact coach | `stAskCoach()` (subnet), `ptAskCoach()` (port drill) | Sonnet | None | Deterministic facts computed + stuffed into prompt (IP binary breakdown, proto→port) |
| **C** | Topology coach | `tbCoachTopology()`, `tbExplainDevice()` | Sonnet | `STORAGE.TB_COACH_CACHE` (lab+step keyed) | None |
| **Gen** | Bulk generation (cost-optimized) | `fetchQuestions()`, `tbGenerateAiTopology()` | Haiku | None | Via `aiValidateQuestions()` → `validateQuestions()` post-pass |

### Ground Truth Tables
Static N10-009 facts. **Dual-layer pattern**: used both for prompt injection (Tier A) AND programmatic reject in `validateQuestions()`.

| Table | Entries | Covers |
|---|---|---|
| `GT_PORTS` | 27 | protocol → port number |
| `GT_OSI` | 30 | protocol → OSI layer |
| `GT_WIFI_BROKEN` | 1 | `['wep']` — broken auth |
| `GT_WIFI_DEPRECATED` | 1 | `['wpa']` — original WPA |
| `GT_ETHERNET` | 6 | auto-negotiation, auto-MDIX, MDI/MDIX, crossover/straight-through, duplex, PoE 802.3af/at/bt |

- `_buildGtHint(text, topicName)` — scans question/topic for protocol keywords, prepends AUTHORITATIVE FACTS block to Tier A prompts.
- `_groundTruthOk(q)` — programmatic guard called from `validateQuestions()`. Rejects questions with deterministically wrong answers before they reach the quiz UI.
- **Adding a new fact**: update the GT table AND extend the corresponding regex in both `_buildGtHint` and `_groundTruthOk`. Both layers must know.

### Curated Exemplar Bank (v4.58–4.59 — the quality engine)

`QUESTION_EXEMPLARS` is a const array at the top of `app.js` holding **200 hand-curated MCQ exemplars** spanning all 5 CompTIA N10-009 domains. It is **NOT the exam question pool** — it's a **few-shot style reference** that gets injected into Haiku's system prompt every time a question is generated.

**Final distribution (v4.59.6 — aligned to CompTIA blueprint weights):**

| Domain | Count | Weight |
|---|---|---|
| 1.0 Networking Concepts | 46 | 23% |
| 2.0 Network Implementation | 40 | 20% |
| 3.0 Network Operations | 38 | 19% |
| 4.0 Network Security | 28 | 14% |
| 5.0 Network Troubleshooting | 48 | 24% |
| **Total** | **200** | **100%** |

**Injection mechanism (in `_fetchQuestionsBatch`):**
1. `_pickExemplarsForTopic(qTopic, 3)` — tiered selection: exact topic match → same-domain fallback (via `TOPIC_DOMAINS`) → any exemplar. Strips `"Multi: "` sentinel. Caps at 5. Returns `[]` if bank empty (no-op).
2. `_formatExemplarsForPrompt(exemplars)` — wraps in `QUALITY REFERENCE` block framed as **"style references only — DO NOT copy these exemplars"**.
3. Injected into the generation prompt after the Difficulty line.

**3 exemplars per batch**. A 90-Q exam = 5 batches × 3 = max 15 exemplar-slots per run. With 200 in the pool, same 3 rarely appear twice in one session.

**Scope (everything that calls `fetchQuestions`):** Custom Quiz, Exam Simulator (all 5 batches), Daily Challenge, Marathon Mode, Topic Brief generation, Follow-up drill on wrong answers. Topology Builder does NOT use the bank — it generates diagrams, not questions.

**Legal boundary (invariant)**: every exemplar is original content authored from the public N10-009 blueprint. Zero paid-bank (Jason Dion / CertMaster / Myers / Kaplan) content ingested. Not stems, not options, not explanations. Documented in git history for clean IP audit trail.

**Jason Dion Method (recalibration loop)**: when user takes a legally-purchased practice test, they share gap topics **in their own words only** → Claude authors 3–5 new exemplars per gap → ships as Phase 3 Cycle N → user studies → concepts get appended to `RETENTION_GAP_CONCEPTS` (v4.62.3) so they surface in every future quiz + exam generation as a soft tiebreaker. Quarterly cadence, ~3 hrs per cycle. Never ingest paid content. See memory files `reference_jason_dion_method.md`, `reference_retention_concepts_pattern.md`, and `feedback_concept_mockup_first.md` for the full process + related workflow patterns.

**Cert-agnostic**: the pattern scales across certs. Security+ / CCNA / AWS SAA / Azure AZ-104 each get their own `QUESTION_EXEMPLARS_<CERT>` array + topic whitelist + objective regex. The 7-layer validation stack, prompt structure, batching, Sonnet escalation — NONE of it changes per cert, only content. This is what makes multi-cert SaaS scalable. See `cert_saas_pivot_plan.md`.

### Validation Pipeline (7 layers — hardened v4.57–4.59)
1. **Prompt self-verification** — 5-step check baked into the `fetchQuestions` system prompt
2. **Curated exemplar bank** (v4.58.0 infrastructure, v4.59.6 200-exemplar content) — few-shot quality reference injected per batch
3. **AI second-pass** — `aiValidateQuestions()` on Sonnet. 6 conceptual checks (v4.57.0 expansion): factual correctness, premise↔answer consistency, explanation match, **conceptual coherence** (stem asks about X but answer tests Y), **framing match** (abstraction level alignment), **distractor quality** (≥2 plausible tempters)
4. **Interrogative-stem gate** (v4.57.2) — `_stemHasInterrogative()` rejects stems missing "?" or interrogative words (which/what/when/etc.)
5. **Programmatic validator** — `validateQuestions()`:
   - Unique-word scoring with negation guard (skips on NOT/EXCEPT/"which not")
   - `_groundTruthOk(q)` against GT tables (27 ports, 30 OSI, WiFi broken/deprecated, Ethernet facts)
   - `_numericOptionOk(q)` for all-numeric options
   - `_smallestSubnetOk(q)` — v4.43.8 smallest-satisfying-subnet rule
   - Reported-question exclusion (`STORAGE.REPORTS`)
6. **Regression gate** — `tests/validation-audit.js` runs a 23-Q broken-corpus fixture on every UAT run. `MIN_CATCH_RATE = 60`, `MAX_FP_RATE = 0`. Current: **64.7%** catch / **0%** FP. **Do NOT tune `validateQuestions()` without running the audit first.**
7. **Sonnet escalation tier** (v4.56.2) — when both Haiku attempts (full + stripped prompt) fail on a batch, retry on Sonnet before surfacing error to user. Silent on success. Batching coordinator (v4.56.1) keeps per-batch prompts in Haiku's comfort zone.

**Exam-mode parity (v4.43.5):** `startExam()` runs the SAME 4-layer pipeline per batch of 18, with `EXAM_BATCH_BUFFER = 5` over-request + retry-to-fill + graceful degradation banner if the final exam ships with <90 questions. Pre-v4.43.5 exam mode shipped raw Haiku output with zero validation — ~9–36 of 90 questions could carry quality issues into the real simulator.

**Quiz-count guarantee (v4.43.4):** `startQuiz()` uses `DROPOUT_BUFFER = Math.max(3, Math.ceil(qCount * 0.3))` over-request + retry-to-fill so `questions.length === qCount` always (unless two consecutive generations drop heavily, in which case ship what we have). Fixes the "requested 10, got 7" bug where the old pipeline silently accepted shortfalls ≥ qCount/2.

### Data Storage (localStorage)
All keys centralized in the `STORAGE` namespace at `app.js:64–103`. 38 keys, all prefixed `nplus_`:

| Category | Keys |
|---|---|
| Core | `KEY`, `THEME`, `HISTORY`, `STREAK`, `WRONG_BANK`, `REPORTS`, `BUG_REPORTS`, `TB_V3_DRAFT`, `TB_V3_FREEBUILD_BACKUP`, `ERROR_LOG` |
| Exam | `HARDCORE_EXAM`, `EXAM_DATE` |
| Ports | `PORT_BEST`, `PORT_STREAK_BEST`, `PORT_FAMILY_BEST`, `PORT_PAIRS_BEST`, `PORT_STATS`, `PORT_MASTERY`, `PORT_LESSONS` |
| Subnet | `SUBNET_STATS`, `SUBNET_MASTERY`, `SUBNET_LESSONS` |
| Other drills | `AB_MASTERY`/`AB_LESSONS` (Acronym Blitz), `OS_MASTERY`/`OS_LESSONS` (OSI Sorter), `CB_MASTERY`/`CB_LESSONS` (Cable ID) |
| Topology | `TOPOLOGIES`, `TOPOLOGY_DRAFT`, `TB_COACH_CACHE`, `LAB_COMPLETIONS`, `FIX_CHALLENGES` |
| Goals + analytics | `TYPE_STATS`, `DAILY_GOAL`, `DAILY_CHALLENGE`, `MILESTONES`, `DEEP_DIVE_USES` |
| AI | `AI_CACHE` (Tier A LRU) |
| Monitoring | `GH_TOKEN`, `GH_REPORTED` |

**Convention**: always access through `STORAGE.*`; never inline `localStorage.getItem('nplus_…')`. Export/Import Data (under Settings) walks the namespace.

**`BUG_REPORTS` queue drain**: failed bug-report submissions are queued under `STORAGE.BUG_REPORTS` and drained once per `DOMContentLoaded` via a 2s-delayed `_loadFeature('reports').then(m => m.drainQueue())` hook at the bottom of `app.js`. Skips terminal entries + rate-limited entries (`next_try`); landed reports surface a green "Filed offline N reports" toast. Settings → `#settings-reports-section` (appended by `renderSettingsPage()` after § 03 Danger Zone, lazy-loaded via `_loadFeature('reports').renderSettingsReportsPanel`) surfaces queued reports with per-row Retry/Delete actions for manual recovery.

### Weak Spots v2 — `computeWeakSpotScores()`
At `app.js:3672`. Drives the homepage `🎯 Weak spots` chip row + Subnet Trainer dashboard callouts. 4 combined signals:

1. **Recency-decayed wrong-bank count** — exp decay with 7-day half-life (`WEAK_HALF_LIFE_WRONGS_MS`), `diffWeight()`-weighted (Hard 2.0× / Exam 1.5× / Found 1.0×), half-credit when `rightCount >= 1` (partial graduation)
2. **Bayesian posterior accuracy gap** — recency-decayed weighted correct/total (14-day half-life via `WEAK_HALF_LIFE_HIST_MS`, 1.3× exam boost), Beta(2,2) prior: `posterior = (wCorrect + 2) / (wTotal + 4)`. Gap = `max(0, WEAK_TARGET_ACC - posterior)` where `WEAK_TARGET_ACC = 0.85`
3. **Staleness** — after `WEAK_STALENESS_DAYS = 14` untouched, up to `WEAK_STALENESS_CAP = 2.0` multiplier
4. **Domain importance** — `_weakDomainMultiplier(topic)` = `DOMAIN_WEIGHTS[dom] / WEAK_AVG_DOMAIN_WEIGHT` (0.7× security ↔ 1.2× troubleshooting)

Final score = `(wrongsRecent * 3.0 + accGap * 25.0 + staleness * 2.0) * domainMul`. **Low-signal filter** excludes `wTotal < 1 && wrongsRecent < 0.5` (untouched, not weak). `renderTodaysFocus()` is refreshed in real time via hooks in `finish()`/`submitExam()`.

### Readiness Score — `getReadinessScore()`
At `app.js:3066`. Composite 420–870 scaled score.
- **Signals (weighted 40 / 25 / 20 / 15)**: accuracy / coverage / recency / volume
- **Accuracy** — within-domain question-count weighted (v4.42.4 fix — do NOT revert to `pctSum/count`), CompTIA domain weights 23/20/19/14/24 (`DOMAIN_WEIGHTS`), difficulty multipliers, exam-mode boost 1.3×
- **Coverage** — studied topics / total (50), × 0.5 penalty under 5 topics
- **Recency** — topics touched in last 14 days, 7-day boost 2×
- **Volume** — total Qs answered, capped at 500

Deferred tuning ([#139](https://github.com/oremosu98/networkplus-quiz/issues/139), `saas-gated`): recency denominator redundancy with coverage signal, no PBQ weighting, triple coverage-penalty. Revisit with real SaaS user data.

### Catalog & Domain Weights
- `TOPIC_DOMAINS` at `app.js:2979` — 50 topics → domain mapping (v4.42.3 expanded from 40)
- `DOMAIN_WEIGHTS` at `app.js:2950` — 5 N10-009 domains: Fundamentals 0.23 / Implementation 0.20 / Operations 0.19 / Security 0.14 / Troubleshooting 0.24
- `topicResources` — per-topic Professor Messer YouTube search URLs + N10-009 objective numbers
- **Convention**: when splitting a topic (e.g. `Routing Protocols` → add `OSPF`, `BGP`), **keep the parent umbrella** in all 3 surfaces (`TOPIC_DOMAINS`, `topicResources`, HTML chip list) so old history entries aren't orphaned. UAT locks this.

### Milestones
- `MILESTONE_DEFS` at `app.js:3234` — 47 entries with `{id, icon, label, desc, ...}`
- `MILESTONE_CHECKS` at `app.js:3392` — 47-entry declarative table: `{id, check: (ctx) => boolean}`
- `_buildMilestoneCtx()` — gathers context once (history, exam stats, readiness, streak, per-activity mastery, day/time bookkeeping) with defensive try/catch
- `evaluateMilestones()` — 10-line loop, calls `unlockMilestone(id)` on matching checks, returns newly-unlocked IDs
- **Hook**: called from `finish()` AND `submitExam()` (not lazy — was a latent bug pre-v4.42.0 where milestones only unlocked if user opened Analytics). Newly-unlocked IDs fire `showMilestoneCelebration(id)` = toast + `launchMiniConfetti()`
- **Adding a milestone**: one entry in `MILESTONE_DEFS`, one in `MILESTONE_CHECKS`. UAT regression-guards all 47 IDs.

### Keyword Highlighting
14-word exam-trap dictionary at `app.js:19269` (`EXAM_KEYWORDS`): NOT / EXCEPT / CANNOT / MOST / LEAST / BEST / WORST / PRIMARY / FIRST / LAST / NEXT / ALWAYS / NEVER / ONLY. **Deliberately excludes**: all / none / any / could / should / would / which (too common in prose). `setQuestionText(el, raw)` is the **single entry point** for all 5 question-stem render paths. **XSS-critical order**: `escHtml(raw)` → `highlightExamKeywords(escaped)` → `el.innerHTML`. Never reverse.

### Animation Inventory
| Pattern | Helper / keyframe | Used for |
|---|---|---|
| Count-up | `animateCount(id, from, to, ms, suffix='')` | Readiness number, Daily Goal counters |
| Rainbow confetti | `launchConfetti()` (150 particles, 8 colors) | Exam pass |
| Gold mini-confetti | `launchMiniConfetti()` (40 particles, radial) | Milestone unlock — subtler celebration |
| Celebration toast | `showCelebrationToast(title, sub)` → `showMilestoneCelebration(id)` | Milestone toasts, purple/gold gradient |
| Streak pulse | `_pendingStreakPulse` flag set in `finish()`/`submitExam()`, consumed in `renderStreakBadge()` | `@keyframes streakPulse` scale 1→1.12→1 + orange ripple |
| FLIP rerank | `renderTodaysFocus()` captures `oldRects` map keyed by `data-topic`, computes dx/dy, applies inverse transform, releases w/ `transition: transform 420ms cubic-bezier` | Weak-spots reranking after a quiz |
| Intro fill | `_readinessIntroArmed` / `_dailyGoalIntroArmed` module flags, once-per-session | Landing-page reveal |
| Answer-pick glow (v4.44.0) | `@keyframes optGlowPulse` — layered on `optBounce` via comma-anim; 0.9s cubic-bezier, 0.25s delay so it fires after the bounce settles | `.option.correct` — green `box-shadow` ripple 0 → 16px → 0 opacity |
| Question reveal + option stagger (v4.44.0) | `@keyframes qTextReveal` + `optionStaggerIn`; `render()` toggles class off→reflow→on, sets per-index `animationDelay = (i * 80) + 'ms'` | New-question pacing — stem fades up, options glide in 80ms apart |
| Block-match ✅ pop (v4.44.0) | `@keyframes stBlockMatchPop` with overshoot cubic-bezier; `_stSetupBlockMatchObserver()` uses `IntersectionObserver` (threshold 0.5, one-shot unobserve) to trigger when the lesson card scrolls into view | Subnet Lesson 4 Step 4 + Lesson 5 put-it-all-together visual — the ✅ on the matching block |
| Progress bar smooth fill (v4.44.0) | `.progress-fill` uses `transition: width .6s cubic-bezier(0.2, 0.8, 0.2, 1)` | Quiz/exam question-to-question progress |
| Domain Mastery bar fill (v4.45.0) | `.dm-bar-fill` uses `transition: width 800ms cubic-bezier(0.2, 0.8, 0.2, 1)` | Domain bars animate to target % on first render |
| Milestones progress bar (v4.45.2) | `.ana-ms-bar-fill` same cubic-bezier as Domain Mastery | Total unlocked % in Milestones header |
| Readiness bar smooth fill (v4.46.0) | `.ana-ready-bar-fill` uses `transition: width .8s cubic-bezier(0.2, 0.8, 0.2, 1)` | Exam Readiness hero score bar — smoother than old `.6s ease` after a quiz roll-up |
| Domain-row bar fill (v4.46.0) | `.ana-domain-fill` uses `transition: width .7s cubic-bezier(0.2, 0.8, 0.2, 1)` | Hero-card domain breakdown bars — matches Domain Mastery card aesthetic |
| Date-chip hover lift (v4.46.0) | `.ana-ready-datechip:hover` → `translateY(-1px)` + shadow bloom, `transition: all .2s ease` | Subtle interactive affordance on the merged date picker chip |
| Streak flame pulse (v4.46.1) | `@keyframes streakFlamePulse` — `scale(1) ↔ scale(1.1)` + `drop-shadow` bloom; 2.4s infinite on warm/hot tiers, 1.6s on blazing | `.ana-streak-flame` when tier ≥ warm (3+ day streak); reduced-motion gated |
| TB scenario Learn-more fade-in (v4.47.0) | `@keyframes tbScenarioLearnFade` — `opacity:0 → 1` + `translateY(-4px → 0)` 0.4s cubic-bezier; chevron rotates 90° on `[open]` via `transition: transform .25s cubic-bezier(0.2, 0.8, 0.2, 1)` | `.tb-scenario-learn-body` when user expands the `<details>` in scenario panel |
| TB scenario-loaded card fade-in (v4.47.2) | `@keyframes tbScLoadedIn` — `opacity:0 → 1` + `translateY(6px → 0)` 0.45s cubic-bezier | `.tb-sc-loaded` when rendered by `tbRenderEmptyHint()` as in-canvas scenario card |

**Accessibility gate**: all wrapped by `@media (prefers-reduced-motion: reduce)` in `styles.css` — transitions neutralized to `.01ms linear`, pulse animations killed, final state painted without motion.

**FLIP guard**: `finish()` / `submitExam()` do NOT call `renderTodaysFocus()` directly. Only `goSetup()` does — so FLIP gets a real old→new delta to animate. UAT regression-guards this (see Conventions).

### Topic Resources
`topicResources` object maps all 50 topics to Professor Messer N10-009 YouTube search URLs + objective numbers. Used by `showTopicDeepDive`, `getWeakTopic` fallback, and per-row Progress-page play buttons.

## Related
[[structure-overview]] · [[feature-subsystems]] · [[CLAUDE]] · [[conventions]] · [[2026-06-29-per-cert-milestones-and-drill-milestones-design]]
