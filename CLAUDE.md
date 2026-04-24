# Network+ AI Quiz — Project Guide

## Context
- **Single-user app currently** (the user is the student prepping for real N10-009). Explains why items like per-user API cost telemetry are deferred.
- **Future pivot**: paid multi-cert SaaS. Anything tagged `saas-gated` on either board is **frozen** until that trigger fires (see Conventions).
- **Origin**: started as a Notion-native flashcard quiz (2026-03-28), pivoted to standalone web app on 2026-04-02. **Notion sync is not on the roadmap** — do not re-propose.
- **External reviewer**: user periodically pastes OpenAI Codex feedback as a product-review signal — drove v4.40.0 label clarity and v4.41.0 homepage density.

## Architecture
- **Type**: Static HTML/JS/CSS single-page app, no framework, no build step
- **AI**: Three-way Claude model split, direct browser fetch with `anthropic-dangerous-direct-browser-access: true`. User supplies their own API key via Settings (stored under `STORAGE.KEY`).

  | Model | Constant | Used for |
  |---|---|---|
  | Haiku 4.5 (`claude-haiku-4-5-20251001`) | `CLAUDE_MODEL` | Bulk generation: `fetchQuestions`, `tbGenerateAiTopology` |
  | Sonnet 4.6 (`claude-sonnet-4-6`) | `CLAUDE_VALIDATOR_MODEL` | Semantic second-pass: `aiValidateQuestions` |
  | Sonnet 4.6 | `CLAUDE_TEACHER_MODEL` | Authoritative teacher content (Tier A/B/C — see Key Patterns) |

- **Storage**: All data in localStorage via the `STORAGE.*` namespace object (38 keys — see below)
- **Hosting**: Vercel static deployment, prod URL https://networkplus-quiz-sable.vercel.app
- **Offline**: Service worker with stale-while-revalidate caching. **Cache name MUST bump every deploy** — use `bump-version.js`, never hand-edit partial.
- **PWA**: `manifest.json`, installable on mobile

## Files
| File | Purpose | Size |
|---|---|---|
| `index.html` | All page structures (30+ pages: setup, quiz, exam, results, review, subnet, ports, drills launcher, topology, analytics, progress, guided labs, …) | ~113 KB / 1,907 lines |
| `app.js` | All app logic — state, AI calls, rendering, game loops, analytics, 5 activity sub-systems | **~1.8 MB / 31,738 lines** |
| `styles.css` | Full dark/light theme styling + `@media (prefers-reduced-motion)` gate | ~480 KB / 11,661 lines |
| `sw.js` | Service worker (stale-while-revalidate, shell-asset precache, 60-entry LRU cap) | 73 lines |
| `manifest.json` | PWA manifest | 646 B |
| `vercel.json` | Vercel config (minimal) | 806 B |
| `tests/uat.js` | UAT suite — **3,887 assertions** as of v4.62.5, embeds validation-audit gate | 8,677 lines |
| `tests/tech-debt.js` | CI thresholds: long-function count, LOC, global count, etc. | 131 lines |
| `tests/validation-audit.js` | 23-Q broken-corpus regression fixture (60% catch floor, 0 FP ceiling) | 589 lines |
| `tests/deploy-verify.js` | Post-deploy smoke against prod | 335 lines |
| `tests/e2e/app.spec.js` | Playwright E2E | — |

**Reality check:** `app.js` size is the driver for [#138](https://github.com/oremosu98/networkplus-quiz/issues/138) (module split) — `saas-gated`, don't start without pivot trigger. `styles.css` growth drove [#55](https://github.com/oremosu98/networkplus-quiz/issues/55) — same gate.

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
| Core | `KEY`, `THEME`, `HISTORY`, `STREAK`, `WRONG_BANK`, `REPORTS`, `ERROR_LOG` |
| Exam | `HARDCORE_EXAM`, `EXAM_DATE` |
| Ports | `PORT_BEST`, `PORT_STREAK_BEST`, `PORT_FAMILY_BEST`, `PORT_PAIRS_BEST`, `PORT_STATS`, `PORT_MASTERY`, `PORT_LESSONS` |
| Subnet | `SUBNET_STATS`, `SUBNET_MASTERY`, `SUBNET_LESSONS` |
| Other drills | `AB_MASTERY`/`AB_LESSONS` (Acronym Blitz), `OS_MASTERY`/`OS_LESSONS` (OSI Sorter), `CB_MASTERY`/`CB_LESSONS` (Cable ID) |
| Topology | `TOPOLOGIES`, `TOPOLOGY_DRAFT`, `TB_COACH_CACHE`, `LAB_COMPLETIONS`, `FIX_CHALLENGES` |
| Goals + analytics | `TYPE_STATS`, `DAILY_GOAL`, `DAILY_CHALLENGE`, `MILESTONES`, `DEEP_DIVE_USES` |
| AI | `AI_CACHE` (Tier A LRU) |
| Monitoring | `GH_TOKEN`, `GH_REPORTED` |

**Convention**: always access through `STORAGE.*`; never inline `localStorage.getItem('nplus_…')`. Export/Import Data (under Settings) walks the namespace.

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

## Feature Sub-Architectures

### Topology Builder (~4,500 LOC in app.js)
Canvas: `TB_CANVAS_W = 1800`, `TB_CANVAS_H = 1100` (v4.39.0 bump for AI-generated topologies). Key pieces:
- `TB_LAB_CATEGORIES` at `app.js:13570` — groups the lab catalog by concept (Fundamentals / Switching / Routing / Services / Security / Cloud & WAN / Wireless & QoS / Troubleshooting). **29 concept labs + 35 auto-generated config variants** (honest count; previously inflated to "65 labs").
- `tbActiveLab` state drives Coach context: when a lab is active, `tbCoachTopology()` prompts Claude as tutor with step N of M + step goal + hint. Cache key differentiated by lab+step.
- `tbDeepValidateAndFix(state, scenario)` — AI-output guard, runs after every AI generation to catch malformed JSON, missing fields, bunched positioning.
- `tbAutoLayout(state)` — force-directed post-pass. Detects clustered seeds (spread <250px), grid-seeds, runs 260 iterations (`REPULSE = 9000/dist²`, `SPRING = 0.06`, `IDEAL_LINK = 200`, velocity damping 0.85, cap 30), final hard-separation pass to `MIN_SEP = 150`.
- `tbProcessCliCommand(dev, cmd)` — 8-line dispatcher over the declarative `_TB_CLI_COMMANDS` table (~37 entries). Each CLI command maps to an isolated `_cli<Name>(dev, cmd)` handler. Match spec: `string | string[] | (cmd)=>bool`. Refactored from a 452-line if/else chain in v4.62.4 / #126 — see *Regression-Guard Tombstones*.
- L2/L3 simulation engine, packet-flow animation, "Fix This Network" challenges, PNG export, AI Generate v2, AI Coach.
- **Scenarios (v4.47.0)**: `TB_SCENARIOS` array at `app.js:7358` holds **16 scenarios** (Free Build + 8 legacy + 7 new). Each has `{id, title, description, requirements, ruleIds, requires, explanation}`. The `explanation` field powers a collapsible "Learn more about this network" `<details>` panel below the requirements list — 5 sub-sections (Overview / How it routes data / Key devices / Key concepts / Exam relevance) keyed to N10-009 objectives. Grouped in the dropdown via `<optgroup>` (Campus & Enterprise / WAN Architectures / Cloud Networking). Light grading convention: new scenarios reuse `min-devices` + `no-orphans` + device-count requirements rather than authoring brand-new rule functions — educational value comes from the shape + explanation. `tbRenderScenarioPanel` at `app.js:7527` builds the UI conditionally on `scen.explanation` so a scenario without the field still renders cleanly (backward-compatible).
- **Consumer endpoint devices (v4.47.0)**: `laptop`, `smartphone`, `game-console`, `smart-tv` added to `TB_DEVICE_TYPES` + `TB_PALETTE_GROUPS.Endpoints` + `TB_IFACE_DEFAULTS`. All are single-interface client devices (smartphone uses `wlan0`, others `eth0`). The `isEndpoint` family check (3 sites: health check at `app.js:6661`, overlay at `app.js:8127`, gateway-UI at `app.js:8199`) was expanded to include all 4 — so they accept `gateway` config + render correct health color + show the gateway field in the overlay.

### Subnet Trainer
- 21 granular question types (CIDR, VLSM, usable hosts, broadcast, gateway placement, NAT boundary, …). Adaptive difficulty, step-by-step feedback.
- `stRenderDashboard()` shows 3 prescriptive callouts: **Weakest Categories** (<75% acc, ≥5 attempts), **Stale Categories** (>7 days), **Weakest Question Types** (<70% acc, ≥3 attempts). Each click-through jumps to `stDashJumpToCategory(catId)` = Practice tab + Focus mode + category pre-selected.
- `stAskCoach()` — Tier B. Computes deterministic binary breakdown (IP / mask / IP AND mask) and stuffs into prompt as AUTHORITATIVE FACTS before asking Sonnet. AI can't hallucinate the math.
- `WEAK_SPOT_DRILL_BRIDGES` at `app.js:3780` — main-app weak topics that route into Subnet Trainer (`Subnetting & IP Addressing`, `IPv6`, `NAT & IP Services`). Deduped. **Topology Builder deliberately excluded** — it's a standalone activity, not a reactive drill target.

### Drills Launcher
`#page-drills` wraps 4 drills consolidated from what was a 4-tile nav row (v4.41.0):
1. **Port Drill** — `startPortDrill()` — 4 modes (Timed / Endless / Family / Secure Pairs)
2. **Acronym Blitz** — `startAcronymBlitz()` — 130+ N10-009 acronyms
3. **OSI Sorter** — `startOsiSorter()` — drag/click protocols onto correct OSI layer
4. **Cable & Connector ID** — `startCableId()` — cable image → name

Shared `createDrillScaffold(cfg)` at `app.js:17766` syncs `.active` / `aria-selected` / `aria-pressed` states across tabs + modes. All 3 newer drills (AB/OS/CB) have full ARIA coverage matching quiz/exam pages post-v4.42.5. Each drill has its own `*_MASTERY` + `*_LESSONS` localStorage keys.

## Conventions

> **Before building, name the shape-of-solution.** If the user is "on the fence" or the ask is ambiguous, don't produce a full spec — produce the shape-of-solution question(s) first and get an answer. See *Scope Disambiguation (v4.48.0)*.

### Testing Philosophy
`tests/uat.js` preference order (baked into header comment post-v4.42.3-audit):
1. **Behavioral smoke** — extract function bodies via `Function()` or `vm.runInNewContext`, feed fixtures, assert output
2. **Structural regex** — assert a specific pattern exists or doesn't
3. **Regression guards** — after deleting code, assert the deleted thing stays deleted
4. **Dynamic consistency** — cross-check across surfaces (e.g. all `MILESTONE_CHECKS` IDs appear in `MILESTONE_DEFS`)
5. **AVOID** pure function-name-presence (`js.includes('function foo(')`) — proves nothing beyond what downstream assertions already do
6. **AVOID** hardcoding versions in 3+ places

**Search before adding tests.** Suite is at 3,887 assertions; duplicates slip in easily.

### Regression-Guard Tombstones
After deleting dead code, add a UAT assertion that fails if it reappears. Keeps 3–4 versions, then retires. Currently guarded:
- `function _renderAnaTopics` — must not reappear (v4.42.2)
- `pctSum += pct; count++` readiness aggregation — must not come back (v4.42.4)
- `#weak-banner` HTML — must not reappear (v4.41.0)
- `renderTodaysFocus()` must NOT be called from `finish()`/`submitExam()` (FLIP guard, v4.42.0)
- Bare `max_tokens: <literal>` — must not reappear (v4.42.5 magic-number extraction)
- `openGuidedLab` whitelist array — must not reappear (v4.42.5 whitelist trap fix)
- Scattered `let _tbTraceState`, `let _tbInspPrev*`, `let _tbStpState`, `let _tbStpPrevRoles`, `let _tbInspectorKeydownBound`, `let _tbTracePanelDragBound`, `let _tbInspectorPopDragBound`, `let _tbConfigPopDragBound` — consolidated into `_tbUiState` (v4.62.4 Thursday tech-debt sweep). New TB UI transients should be added as nested fields on `_tbUiState`, not new top-level `let` declarations.
- Per-overlay `tbRenderCanvas` re-wraps (trace + STP used to each `const orig = tbRenderCanvas; tbRenderCanvas = function() {...}`) — collapsed into the single `_tbOverlayRegistry` + `tbRegisterOverlay(fn)` pattern (v4.62.4 Thursday tech-debt sweep). New canvas overlays should call `tbRegisterOverlay(overlayFn)` once; they automatically run after every `tbRenderCanvas()` call. Do not re-introduce self-wrapping.
- 8 dead functions removed v4.62.4 (grep-audited to zero callers across app.js + index.html + tests/ + sw.js): `classOfIp`, `wildcardToMask`, `setPortMode`, `nextPortQ`, `nextPortFamilyQ`, `pickPort`, `renderPortFocusInfo`, `tbOpenArpDialog`. If you find yourself "reintroducing" any of these by name, check first whether the real need is a legitimate new function or a resurrection — legacy stubs without callers tend to accumulate indefinitely.
- `tbProcessCliCommand` 452-line if/else chain (v4.62.4 Thursday tech-debt sweep, issue #126) — refactored to a declarative `_TB_CLI_COMMANDS` dispatch table + ~37 isolated handler functions (`_cliShowArp`, `_cliPing`, `_cliIpconfig`, `_cliHelp`, etc.). Each handler is 3-20 lines and receives `(dev, cmd)`. New function body is 8 lines — iterate the table, call `_tbCliMatches(entry.match, cmd)`, return `entry.handler(dev, cmd)`. Match spec can be `string | string[] | (cmd)=>bool`; arrow matchers MUST use `cmd` as the parameter name (not `c`) because UAT structural regex checks like `/cmd\.startsWith\('ping '\)/` and `/cmd === 'ipconfig'/` depend on the literal parameter text. Critical ordering: `dig +dnssec` entry must precede generic `dig`/`nslookup` entry (more-specific-first wins). When adding a new CLI command: write an `_cli<Name>(dev, cmd)` handler, append one line to `_TB_CLI_COMMANDS` — do NOT reintroduce if/else chains in `tbProcessCliCommand`.
- TB 3D View dynamic-import contract (v4.63.0, issue #199 Phase 1) — `tb3d.js` + `vendor/three/*` MUST load lazily on first 🧭 3D View click, never at app init. Violating this ships 1.3 MB of Three.js to every user regardless of whether they ever open 3D. UAT guards three angles: `index.html` must not contain `<script src="tb3d.js">`, `app.js` must not contain a top-level `import './tb3d.js'`, and `sw.js` SHELL_ASSETS must not precache `/vendor/*`. Playwright verifies behaviorally that zero `/vendor/three/*` fetches fire on initial page load; only the 3D View pill click triggers them. When adding new 3D-related code, prefer extending `tb3d.js` over creating new sibling modules so the single dynamic-import boundary remains the contract surface. If a new heavy dependency is needed, add it as a separate lazy-loaded module with its own regression guard — never import from `app.js` top-level.
- TB 3D View render-only contract (v4.64.0, issue #199 Phase 2) — `tb3d.js` MUST NOT mutate `_tbUiState` or any other app.js state directly. It receives trace state through the exported `setTraceState(traceState)` function only, called from app.js inside `tbRenderTraceCanvasState()`. Playback buttons in the 3D chrome (`tb3dTracePlay/Pause/Step/End/Speed`) are thin wrappers in app.js that delegate to the v4.61.0 globals (`tbTracePlay`, `tbTracePause`, `tbTraceStep`, `tbEndTrace`); they MUST NOT move state ownership into tb3d.js. UAT guards: `tb3d.js` source must not contain `_tbUiState.X =` assignments; `tbRenderTraceCanvasState` must still exist (2D trace path stays independent); `#tb-trace-panel` must not be removed from index.html. Rationale: state duplication between 2D and 3D would desync on every edge case (reduced-motion, Back-to-2D mid-trace, speed changes) and triple the surface area. The render-only discipline is what keeps the 2D + 3D views in lockstep for free.

### Progressive Disclosure
- Marathon Mode (30 / 45 / 60-Q bulk presets) hidden until `loadHistory().length > 0`
- 4 drills collapsed into a single `#page-drills` launcher (+1 click, cleaner first-visit)
- Settings `<details>` houses Clear Wrong Answers + Export/Import (off-path for casual use)

`is-hidden` is the standard CSS class for conditional visibility.

### `saas-gated` Label
Items tagged `saas-gated` on either board are **frozen** until paid-user SaaS pivot triggers. Do NOT pull without explicit pivot direction. Currently gated:
- [#21](https://github.com/oremosu98/networkplus-quiz/issues/21) — Wrap 78 global variables into state objects
- [#55](https://github.com/oremosu98/networkplus-quiz/issues/55) — Split `styles.css` monolith
- [#123](https://github.com/oremosu98/networkplus-quiz/issues/123) — Social proof counter (needs real users)
- [#135](https://github.com/oremosu98/networkplus-quiz/issues/135) — Per-user API cost telemetry (pointless at n=1)
- [#136](https://github.com/oremosu98/networkplus-quiz/issues/136) — Entitlements + pricing-tier quotas
- [#137](https://github.com/oremosu98/networkplus-quiz/issues/137) — Cost-floor model + usage distribution
- [#138](https://github.com/oremosu98/networkplus-quiz/issues/138) — Module-split `app.js` (v5.0 trigger)
- [#139](https://github.com/oremosu98/networkplus-quiz/issues/139) — Readiness-algorithm tuning

### Magic-Number Constants (v4.42.5)
11 named constants at `app.js:22–43`:
- `EXAM_PASS_SCORE = 720`, `EXAM_QUESTION_COUNT = 90`, `EXAM_MAX_SCORE = 900`
- `DOUBLE_CLICK_MS = 400` (topology canvas)
- `VXLAN_VNI_MAX = 16777215` (RFC 7348)
- `MAX_TOKENS_{GENERATION, VALIDATION, TEACHER_DEFAULT, TEACHER_LONG, TEACHER_COACH, TEACHER_BRIEF}`

**UAT regression guard** `!/max_tokens:\s*\d+/.test(js)` fails loud if bare literals reappear in any AI call site.

### Tier-Threshold Anchoring (v4.45.1 lesson)
When picking thresholds for user-visible tier labels (Domain Mastery badges, tier multipliers, "you're ready" signals), **anchor to domain reality, not even quartiles**. The v4.45.0 Domain Mastery card originally used 60 / 75 / 85 (clean 15-pt bands above Novice) because it felt "mathematically clean" — but that put users at 70% (who would likely pass the real CompTIA exam) into "Developing," which is pedagogically wrong. Real N10-009 raw-accuracy pass is ~70–75% per form. Corrected to 55 / 70 / 85 in v4.45.1.

**Principle**: a tier labeled "Proficient" must mean something operationally true ("you'd pass the real exam today"). If your threshold contradicts domain reality, users will catch it and the label erodes trust.

### Analytics: Prescriptive over Descriptive (v4.45.0 / v4.45.2 lesson)
Analytics cards that just *show data* without telling you what to do are low-value. Two cards were deleted in v4.45.0–v4.45.2 for being descriptive-only:
- **Difficulty × Topic Heatmap** — sparse matrix, no action tied to cells
- **Question Type Breakdown** — 3 of 5 rows had sample sizes too small to act on
- **Subtopic Weak Spots** — keyword frequency duplicated the homepage `#todays-focus` chip row with less actionable output
- **Practice Drills stats card** — each drill has its own in-drill dashboard

Replacements (v4.45.0) follow the **prescriptive** principle — every card tells you what to do next:
- **Domain Mastery** — 5 rows with drill buttons that fire `focusTopic()` on the domain's weakest topic
- **Wrong-Answer Patterns** — clusters by CAUSE (negation / domain / PBQ-type / Hard-difficulty) with coaching copy + drill buttons

Criterion for any future Analytics card: *"What does the user do with this?"* If there's no clear action, it belongs in the Progress page (reflective) or doesn't belong at all.

### Learn-Tab Lesson Authoring (v4.43.6 / v4.43.7)
Subnet Trainer lessons use a **stepped pedagogical format** — one step per theory card, visible example ranges with a ✅ on the correct answer, worked example + "bigger example" to force generalization, cheat-sheet table, and a pro-tip card. See Lesson 4 (Block Size Method) and Lesson 5 (Network & Broadcast) as reference. When adding new lessons, follow this structure — one theory card per logical step rather than dense paragraphs.

### Feedback Goes Where The Eye Is Looking (v4.47.2 lesson)
When confirming a state change, put the feedback **in the user's line of sight**, not above or below it. v4.47.0/4.47.1 tried toast (bottom) + requirements panel (above toolbar, above the fold when user scrolled down to the canvas) + scroll-into-view with `block: 'nearest'` — all technically happened, all invisible to a user looking at the canvas. v4.47.2 fixed it by replacing the canvas empty-state content with a scenario card IN the canvas — where the user's eye lands after a modal closes. **Principle:** on big tall canvases / long pages, "rendered somewhere" is not the same as "noticed." Before shipping UI feedback, ask: *if the user is looking at location X when they click, what do they see change at location X?*

### Scope Disambiguation — Surface the Right Question Up Front (v4.48.0 lesson)
When planning a feature, enumerate the decisions that could radically change the shape of the ship. In the scenario-expansion work (v4.47.0 → v4.48.0), I surfaced "light vs strict grading" but never "static requirements vs auto-populate canvas" — which was the user's actual mental model all along. Cost: three release iterations (v4.47.0 text requirements → v4.47.1 picker → v4.47.2 in-canvas card → v4.48.0 auto-build) before we landed at the thing that was asked for on day one. **Fix**: when drafting the ship plan, list *shape-of-solution* decisions separately from *polish* decisions. Ask the user "how do you want this to feel?" not just "which rules do you want?". Examples of shape-of-solution questions to ask up front:
- Static data vs. generated?
- Is this additive to existing content, or replacing it?
- Does this live on the canvas or on the toolbar or in a modal?
- Do they expect the feature to be destructive (replace state) or non-destructive (layer on)?

### Live-Verify UX Changes via Chrome MCP Before Declaring Done (v4.47.2 / v4.48.0 discipline)
Big UX changes (canvas rendering, multi-step flows, modal → canvas interactions) should be tested live in Chrome before being called done. UAT catches structural regressions but not "does this actually feel right when I pick a scenario." The Claude-in-Chrome MCP (`mcp__Claude_in_Chrome__*`) runs fine against local `python3 -m http.server 3131` and prod — use it to navigate + click + screenshot. Twice this session UAT was green but the real UX was broken: (1) v4.47.2 picker-flow "worked" per UAT but feedback was invisible to a user looking at the canvas; (2) v4.48.0 scenarios built devices but cables silently failed for complex topologies because `_tbMkCable` didn't auto-provision interfaces — caught only by running all 15 scenarios live and seeing "cables: 0" in the diagnostics. **Routine**: any release that touches render paths, empty-states, or multi-step flows → Chrome-verify the happy path before commit. UAT alone isn't enough.

### Scenario `autoBuild(state)` + Auto-provisioning Helpers (v4.48.0)
Scenarios seed the canvas via a two-helper pattern that hides the 13-field device-object boilerplate:
- `_tbMkDev({ type, x, y, hostname, ip?, gateway?, iface? })` — one interface by default.
- `_tbMkCable(a, b, type='cat6', aIdx=0, bIdx=0)` — **auto-provisions additional interfaces** on either endpoint if the requested index doesn't exist yet. A hub device (MPLS-Core, TGW, firewall) can be connected via `_tbMkCable(hub, x, 'fiber', 0)`, `_tbMkCable(hub, y, 'fiber', 1)`, `_tbMkCable(hub, z, 'fiber', 2)` without pre-declaring 3 interfaces on `hub`.

**Without the auto-provision, cables silently throw** inside the `tbLoadScenarioWithBuild` try/catch, leaving scenarios with 0 cables while the device list looks fine — a very misleading failure mode. When authoring new scenarios, iterate in a Chrome session and verify `tbState.cables.length === expected` after each scenario select.

## Deployment

### Two paths — prefer push
1. **Canonical (preferred)** — `git push origin main` → GitHub Actions runs UAT + Playwright + `tech-debt.js` → Vercel auto-deploys → `deploy-verification.yml` smoke-tests prod. **Branch protection requires the "UAT + Playwright" status check** before merge; admin bypass only for emergencies.
2. **Local quick-ship (bypasses CI gates)**:
   ```bash
   export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
   cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
   npx vercel --prod --yes
   ```
   **Do NOT use without committing first (or immediately after).** Git↔prod drift cost us 6 versions (v4.39→v4.43.1) before being caught in catchup commit `415cab6` on 2026-04-16. If circumstances force a local deploy, schedule a catchup commit before session ends.

Production URL: https://networkplus-quiz-sable.vercel.app

### Version bumps
Use `node scripts/bump-version.js <new> "<description>"` — updates `APP_VERSION` in `app.js` + `CACHE_NAME` in `sw.js` + version badge in `index.html` + `package.json` + **prepends a stub row at the top of the CLAUDE.md version history table** in one shot. **Do NOT hand-edit partial** — UAT has consistency assertions across all 4 code surfaces.

**Release flow discipline (learned the hard way):**
1. Run `bump-version.js` first — it writes CLAUDE.md.
2. **Read CLAUDE.md again before expanding the stub row** — the bump script mutated it, any prior Read snapshot is stale and the next Edit will hit a file-state race.
3. Expand the stub into a full detailed row in-place (it's already at the top — no move needed).
4. Run UAT → commit → push. The CLAUDE.md history stays consolidated inside the same commit as the code change, not in a trailing docs-only follow-up.

Pre-v4.43.9 the script appended to the bottom of the table and every release required a "move row to top" Edit that repeatedly hit the race above. Fixed to prepend correctly.

### Preview deployments
Every feature branch auto-builds a preview at `https://networkplus-quiz-sable-git-<branch>-oremosu98.vercel.app`. Use for risky changes (SW rewrites, API contract changes, large refactors). Squash-merge to main auto-deletes the branch.

## Branching Strategy
**Trunk-based** — direct commits to `main`, no `stage`/`preprod` branch. Local UAT (`node tests/uat.js`) gates every push.

**Add a `stage` branch only when one of these fires:**
1. Paying users on the cert SaaS pivot (a broken deploy starts costing real money)
2. A backend with DB migrations (need a non-prod target to run them against)
3. A second person joins (contractor, partner, beta team needs a non-prod URL)

Until then, stage is pure overhead — Vercel preview deploys give 90% of its value at 0% of the friction.

## Local Development
```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
python3 -m http.server 3131
# Open http://localhost:3131
```

### Pre-commit hook (v4.62.4 / issue #194)
`.githooks/pre-commit` runs `node tests/uat.js` locally before every commit and blocks the commit on failure. Skips when only docs-type files (CLAUDE.md, CHANGELOG.md, memory files) are staged so trivial docs touches stay fast. Also runs the pre-existing CLAUDE.md-freshness check. Hook is wired via the `prepare` script in `package.json` setting `core.hooksPath` to `.githooks`, so `npm install` activates it automatically on clone.

- **UAT failure** → commit blocked; hook tails the last 25 lines of UAT output so you see what broke without re-running.
- **node not in PATH** → UAT skipped with a warning; CI still enforces on push.
- **Bypass** (docs-only / emergency): `git commit --no-verify`.

## Test Suite
```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"

node tests/uat.js                # UAT (3,887 assertions; embeds validation-audit gate)
node tests/tech-debt.js          # CI thresholds — long-function count, LOC, globals
node tests/validation-audit.js   # 20-Q broken-corpus fixture, ≥60% catch / 0 FP
node tests/deploy-verify.js      # Post-deploy smoke against prod
npx playwright test              # E2E (tests/e2e/app.spec.js)
```

`tests/tech-debt.js` runs in CI on every push — breaches auto-file issues on [Board #1](https://github.com/users/oremosu98/projects/1) with `tech-debt` + `priority: medium` labels. Scheduled weekly sweep on Thursdays.

## Version History

> **Older releases** (v3.0 through v4.60.1 — 126 rows) live in [CHANGELOG.md](./CHANGELOG.md). The last 11 releases stay inline here for quick reference. Reorg established during the v4.42.3 maintenance pass; re-trimmed in the v4.52.0, v4.54.1, v4.54.13, v4.56.0-morning, v4.59.6 Road-to-200, v4.62.3 TB-v2-roadmap, v4.62.5 Thursday-tech-debt, v4.63.0 3D-View Phase 1, v4.64.0 3D-View Phase 2, v4.65.0 3D-View Phase 3, v4.65.1 OSI UX patch, and v4.66.0 3D-View Phase 4 consolidations when inline grew past 11.

| Version | Features Added |
|---|---|
| v4.66.0 | **Network Builder 3D View Mode — Phase 4: Scenario Tours** (issue [#199](https://github.com/oremosu98/networkplus-quiz/issues/199) Phase 4). Each scenario can now carry a `tour: [...]` field that the 3D view plays as a choreographed camera + narrative sequence. First tour authored: **Home Network** (4-step freeform narrative — Welcome → The internet edge → Wi-Fi and endpoints → Private IPs + NAT). Click **▶ Play Tour** in the 3D chrome → camera tweens through authored waypoints, captions fade in bottom-center, specific devices get accent-pulse rings on their labels. **Render-only architecture**: `tb3d.js` exports two new primitives — `tweenCameraTo(position, target, durationMs)` (plain arrays so tour data is serializable) + `highlightDevices(hostnames)` (resolves by hostname since device IDs are runtime-generated). app.js owns all tour state (`_tbTourState` with active/tour/currentStep/playing/advanceTimer) + auto-advance timing. tb3d never mutates tour state. **Step shape**: `{title, body, camera:{position,target,durationMs}, highlight:[hostname...], durationMs}`. **Playback controls** in the chrome bar: ▶ Play Tour (visible only when scenario has an authored `tour`); during playback swaps to ⏸ Pause / ▶ Resume / ⏭ Skip / × Exit. Exit clears highlights + resets camera to INITIAL_CAM. **Caption card** bottom-center (680px max, pointer-events:none so orbit still works) with tour eyebrow + step title + step body + step-dot progress indicator. Fade-in animation per step change via forced `animation: none` + rAF trick. **Highlights** reuse Phase-2 packet-trace visual vocabulary but green-tinted (`.tb-3d-tour-highlight` + `@keyframes tb3dTourHighlightPulse`). Reduced-motion gate snaps camera instantly + kills caption fade + kills highlight pulse. **Home Network narrative** (6-9s per step) teaches the SOHO fundamentals: wide iso intro → pan to ISP+router for internet-edge concept → pan wider to show Wi-Fi + 4 endpoints → zoom out + highlight router alone for NAT takeaway. **UAT**: **24 new v4.66.0 assertions** — 4 tb3d exports, 8 app.js wiring (state + 5 button delegates + step render + advance timer + exit cleanup + open/close hooks), 3 tour data checks, 3 HTML + 3 CSS, 2 regression guards (tb3d never touches `_tbTourState`, `Array.isArray(scen.tour)` invariant). Total UAT: 4009 → **4032** passing. Playwright: **79/79** still passing — all 11 existing 3D E2E tests stay green under the extended state model. Cache: `netplus-v4.66.0`. ~550 LOC across `index.html` + `styles.css` + `tb3d.js` + `app.js` + `tests/uat.js`. **62nd ship** (v4.66.0 reuse — the reverted polish pass freed this number). Closes Phase 4 of issue #199 for Home Network; additional tours (DMZ / Enterprise / Load Balancer) are authorable incrementally by adding `tour` fields to other `TB_SCENARIOS` entries. Phase 5 (3D drag/drop editing) remains deferred indefinitely. |
| v4.65.1 | **OSI Stack button UX patch** — user reported the button stayed greyed out after loading a Home Network scenario in 3D view. v4.65.0 design required clicking a device in the 3D scene first (which selected it and enabled the OSI button) but there was no visible hint about that — the disabled button just looked broken. **Three-part fix**: (1) removed `disabled` attribute from the OSI button in `index.html` so it's always clickable, (2) `tb3dEnterOsiView` now auto-picks a sensible device when nothing's selected — preference: endpoint (pc/laptop/smartphone) → router → any non-cloud/isp-router → first device, (3) auto-picked device gets programmatically selected via `tbSelectDeviceForInspector` so the Live Inspector popup + OSI view open consistently. Tooltip rewritten from *"Show the selected device's 7-layer OSI stack"* → *"Explode a device into 7 OSI layers (clicks a device for you if none selected)"*. `_tb3dUpdateOsiButtonEnabled` kept as a safety no-op (only removes `disabled`, never adds it). `tbClose3DView` no longer re-adds disabled on 3D exit. **Lesson**: disabled-at-rest UX with no visible hint is a dead-UX trap — if the remedy is "click something specific first", either auto-do the specific thing or make the hint unmissable. UAT assertion flipped: `v4.65.1 HTML: OSI button ships enabled` + `v4.65.1 REGRESSION: tb3dEnterOsiView auto-picks a device when none selected`. Playwright test now asserts first-click works with no prior selection. Total UAT: **4009 passing** (same count, updated names). Playwright: **79** passing. Cache: `netplus-v4.65.1`. ~30 LOC across `index.html` + `app.js` + `tests/uat.js` + `tests/e2e/app.spec.js`. **62nd ship**. Fourth same-day Friday ship. |
| v4.65.0 | **Network Builder 3D View Mode — Phase 3** (issue [#199](https://github.com/oremosu98/networkplus-quiz/issues/199) Phase 3). Third feature ship of Friday, after Phase 1 (read-only explorer) + Phase 2 (packet trace). Adds the **OSI Layer Stack view** — select any device, click 📶 OSI Stack, and the device "lifts" into a 7-plane exploded view showing every OSI layer (L1 Physical → L7 Application) with its PDU (Bits/Frame/Packet/Segment/Data) and typical protocols (Ethernet / IP / TCP / HTTP / etc.). This is the 2D-impossible teaching moment — you cannot show the OSI stack spatially in a flat diagram. **Render-only architecture continues**: `tb3d.js` exports `enterOsiView(deviceId)` + `exitOsiView()`; app.js chrome buttons delegate; no new state owned by tb3d. **7 layered planes** — translucent colored PlaneGeometry (L1 red → L7 purple matching CompTIA visual convention), stacked vertically 3.2 units apart above the focused device. Each plane has a CSS2DObject label attached to a dedicated anchor Object3D. **Anchor pattern discovered after 30-min debug**: directly attaching labels to the plane's rotated coordinate frame caused CSS2DRenderer's clip-space visibility check to silently fail on the first frame post-camera-tween; dedicated anchor with no rotation + `updateMatrixWorld(true)` + a 50ms post-creation forced `labelRenderer.render()` ensures the 7 label divs land in the DOM reliably. Vertical riser lines connect consecutive planes for stack continuity. **Non-focus devices dim to 20% opacity** (direct material.opacity mutation on every mesh in their group), cables drop to 18% so focus stays unambiguous. **Camera tween** frames the stack from an off-right angle; camera position + target backed up on enter, restored on exit. **OSI title card** (absolute-positioned top-center of chrome) shows device hostname + type + "click Exit OSI to return". **Chrome state machine**: OSI Stack button starts disabled (no selection); `tbSelectDeviceForInspector` fires `_tb3dUpdateOsiButtonEnabled` which flips `disabled`; entering OSI hides Trace + OSI Stack and reveals Exit OSI; exit reverses. `tbClose3DView` resets this state on 3D↔2D toggle so a second entry starts clean. **Resource cleanup** — exitOsiView removes each label from its parent anchor BEFORE removing the anchor meshes, so the CSS2DObject `removed` event fires and its DOM element is properly detached. `tb3d.exit()` lifecycle defensively invokes `exitOsiView()` first if still active. **Layer colors**: L1 #ef6a7a · L2 #f97316 · L3 #f4c664 · L4 #3fd28b · L5 #2dd4bf · L6 #6aa9f0 · L7 #a99cff — border-left on each label matching the plane's fill. **Reduced-motion gate** + **light-theme overrides**. **UAT**: **32 new v4.65.0 assertions** — 13 tb3d module shape, 7 app.js wiring, 4 HTML, 5 CSS, 3 regression guards (OSI starts disabled, render-only invariant, exit() cleanup). Total UAT: 3977 → **4009** passing. Playwright: 75 → **79** passing (4 new: button enables on selection, 7 layers render on enter, Exit returns + tears down, Back-to-2D cleans up). Cache: `netplus-v4.65.0`. ~680 LOC across `tb3d.js` + `app.js` + `index.html` + `styles.css` + `tests/uat.js` + `tests/e2e/app.spec.js`. **61st ship**. **Third Friday feature ship** — three 3D-view phases in one day. Closes Phase 3 of issue #199. Phase 4 (scenario 3D tours with camera choreography) queued. Phase 5 (3D drag/drop editing) remains deferred indefinitely. |
| v4.64.0 | **Network Builder 3D View Mode — Phase 2** (issue [#199](https://github.com/oremosu98/networkplus-quiz/issues/199) Phase 2). Same-day Friday ship following Phase 1 from this morning. Brings the 3D view from read-only explorer to fully-narrative packet-trace playground — click 🔍 Trace, animate a glowing packet along real bezier cable curves hop-by-hop, watch MAC rewrites + TTL decrements happen in 3D space. **Render-only architecture**: all trace state stays in `_tbUiState.trace` (owned by `app.js` via existing v4.61.0 `tbStartTrace`/`tbTracePlay`/etc.); `tb3d.js` exports a new `setTraceState(traceState)` that app.js fires from a single hook-point inside `tbRenderTraceCanvasState()`. Zero state duplication, zero new mutation pathways, the 2D trace continues unchanged. Entering 3D mid-trace is continuous — the HUD + hop strip pick up the existing state on `enter()`. **Glowing-packet animation**: yellow emissive SphereGeometry (0.28) + translucent glow sphere, animates along the `tbComputeTrace`-computed path using the Phase-1 cable bezier curves via `CubicBezierCurve3.getPoint(t)`. For hops with no physical cable between endpoints, falls back to `lerpVectors` straight-line animation. Reduced-motion gate jumps to destination. **Bottom hop-card strip** (160px, horizontal-scroll for long traces) — one card per hop showing step number, color-coded layer chip (ARP/L3/DELIVER/FAIL), from→to device, IP + interface + TTL detail, status pill (OK / BLOCKED / DELIVERED / PERMIT / FAIL). Cards flip from pending → current (accent-pulse + translate -3px) → done (green/red tint) as the packet moves. CSS `.tb-3d-host:has(.tb-3d-hop-strip:not([hidden]))` shrinks the canvas to make room — matches the mockup. **Persistent trace HUD pill** top-right of chrome, animated accent-glow dot + `Packet Trace: ${srcHostname} → ${dstIp}`. **In-flight frame badge** — CSS2DObject floating with the packet, shows layer + IPs + MAC rewrites + TTL before/after. Red variant for fail hops. **Playback controls** (hidden when no trace): ▶ Play / ⏸ Pause auto-swap, ⏭ Step, 1× speed cycles 1× / 2× / 0.5×, × End. Buttons delegate to v4.61.0 `tbTracePlay/Pause/Step/EndTrace` via new `tb3dTrace*` wrapper fns. **Device-label ring states** — visited green glow, current accent-pulse, pending dim 50%. Visited cables boost emissive 0.35 → 0.85. **2D trace panel auto-hide**: `tbOpen3DView` hides `#tb-trace-panel`; `tbClose3DView` restores it if trace still active — prevents overlap. **UAT**: **33 new v4.64.0 assertions** — 10 tb3d module shape, 9 app.js wiring, 4 HTML, 5 CSS, 1 reduced-motion gate, 3 regression guards (tbRenderTraceCanvasState persists, #tb-trace-panel persists, tb3d.js never mutates `_tbUiState` — render-only contract locked). Total UAT: 3944 → **3977** passing. Playwright: 71 → **75** passing (4 new: DOM elements exist + hidden at rest, trace reveals HUD/strip/controls, trace state persists across 3D↔2D toggle, 2D panel hidden when 3D active). Cache: `netplus-v4.64.0`. ~720 LOC across `tb3d.js` + `app.js` + `index.html` + `styles.css` + `tests/uat.js` + `tests/e2e/app.spec.js`. **60th ship**. Closes Phase 2 of issue #199. Phases 3 (OSI layer stack) + 4 (scenario 3D tours) still queued. Phase 5 (3D drag/drop editing) remains deferred indefinitely. |
| v4.63.0 | **Network Builder 3D View Mode — Phase 1** (issue [#199](https://github.com/oremosu98/networkplus-quiz/issues/199)). User-approved via concept-mockup-first workflow: drafted an interactive Three.js mockup at [`mockups/tb-3d-view-concept.html`](./mockups/tb-3d-view-concept.html), user validated pedagogically at n=1 (*"it's helping me learn this stuff right on the spot"*), then green-lit a same-day Phase 1 build despite the issue being `saas-gated`. **Shipped 🧭 3D View pill** on the Network Builder's canvas toolbar that swaps the SVG canvas for a Three.js scene — read-only explorer, 2D stays source of truth for editing. **New module `tb3d.js`** (~580 LOC) dynamic-imported on first click so users who never open 3D pay zero bandwidth. Exports `enter(tbState, opts)` / `exit()` / `resetCamera()` / `topDown()` lifecycle. **35 bespoke flat-shaded device primitives** covering every entry in `TB_DEVICE_TYPES` — routers as octahedrons, switches as flat boxes with glowing port dots, firewalls as slabs with red accent stripes, APs as cylinders with antenna-ball tips, servers as rack boxes with U-slot lines + status LEDs, clouds as 3-sphere clusters, VPCs as translucent boundary cubes with edge lines, TGWs as multi-pronged hub shapes, satellites with dish + solar panels, cell towers with antenna triad, load-balancers as double-box pairs with bridge cable, onprem-dc as windowed buildings, SASE-edge as hex-node, etc. Lookup map `DEVICE_COLORS` mirrors `TB_DEVICE_TYPES` palette 1:1; `_makeDevicePrimitive(type, color)` factory has a case for each type with a sensible box fallback for future additions. **VLAN floor plates auto-derived** by scanning `dev.interfaces[0].vlan` and grouping devices by VLAN ID; clusters with <2 devices skip plates (avoids ugly single-device islands); VLAN 1 (default/everywhere) never gets a plate. Zone plates (Internet, DMZ) derived from device role (`cloud`/`isp-router`/`onprem-dc` → Internet; `public-*` → DMZ). Deterministic color-per-VLAN via hashed VLAN ID into an 8-color palette so VLAN 10 is always green, VLAN 20 always yellow, etc. Subnet string inferred from first interface IP (→ /24). **Bezier cable factory** computes cubic Bezier curves between device anchor points with per-type Y offsets, rendered as `TubeGeometry` with `MeshStandardMaterial` emissive glow. **Click-to-inspect** via raycaster on the WebGL canvas → on hit, calls the existing `tbSelectDeviceForInspector(deviceId)` function from v4.60.0 which opens the floating Live Inspector popup unchanged — zero new inspector UI, Routing Table / ARP Cache / MAC Address Table / DHCP Config tabs all work against the clicked device's live state. **Three.js vendored locally** under `vendor/three/` (r0.160 + OrbitControls + CSS2DRenderer + MIT LICENSE) — zero external CDN dependency, production CSP stays strict (no `cdn.jsdelivr.net` whitelist on the main app). `<script type="importmap">` in `index.html` maps bare `three` + `three/addons/*` specifiers to vendored paths so `OrbitControls.js`' own `from 'three'` import resolves. **Service worker** updated to pass `/vendor/*` + `/mockups/*` through without caching (Three.js bundle ~1.3 MB would evict legit shell entries under the 60-entry cap). **UI chrome** mirrors the approved mockup 1:1 — chrome bar with "← 2D Design" Back button + "3D VIEW · NETWORK EXPLORER" monospace eyebrow + "⟲ Reset Camera" + "□ Top" preset buttons, bottom-left compass rose with dashed ring + N/S/E/W ordinal letters + accent center dot, floating per-device labels showing hostname + IP, larger VLAN/zone plate labels with colored left border + subnet sub-text, fullscreen loading overlay with spinner covering the first-entry bundle fetch, mobile nudge card for <768px viewports. **Accessibility**: full `@media (prefers-reduced-motion: reduce)` gate (kills spinner keyframe + label transition; OrbitControls damping disabled). Light-theme overrides for host background, chrome bar, labels, compass, loading + nudge backdrops. **Dynamic-import contract regression-guarded**: UAT asserts `index.html` has no static `<script src="tb3d.js">`, `app.js` has no top-level `import './tb3d.js'`, and SHELL_ASSETS excludes `/vendor/*`. Playwright verifies on first page load that zero `/vendor/three/*` requests fire (lazy-load contract) and only fires after the 3D View pill is clicked. **UAT**: **45 new v4.63.0 assertions** — 4 vendored files present + LICENSE, 6 module-shape (tb3d.js exports + import shape), 1 color-mapping completeness (all 35 types), 19 per-primitive case checks (representative subset of bespoke factories), 5 app.js wiring, 10 HTML wiring, 6 CSS wiring, 3 SW wiring, 3 static-import regression guards. Total UAT: 3887 → **3944** passing. Playwright: 68 → **71** passing (3 new: zero-vendor-fetch on page load, full open + mount + close lifecycle, pill wiring). Cache: `netplus-v4.63.0`. ~1100 LOC across `tb3d.js` + `app.js` + `index.html` + `styles.css` + `sw.js` + `tests/uat.js` + `tests/e2e/app.spec.js`. **59th ship**. Closes Phase 1 of issue #199. Phases 2-4 (packet trace animation, OSI layer stack, scenario 3D tours) remain queued on the issue for future unlocks. |
| v4.62.5 | **TB right-pane collapse chevron moved to outer top-right corner** — user UX ask on the Network Builder's Scenarios pane: the v4.60.1 collapse chevron was positioned at `left: 8px` (inner edge, toward the canvas) which crowded the "Scenarios" heading. Moved to `right: 8px` so the chevron now sits in the pane's outer top-right corner — the conventional location for close/collapse affordances, matches the mental model of "click the corner to tuck the pane away". No markup changes, no JS changes, no behaviour changes — purely a 1-line CSS shift (plus explanatory comment). The 180° rotation on collapsed state still reads correctly (`›` when open = "push the pane right / off-screen"; `‹` when collapsed = "pull the pane back from the right"). Left pane chevron unchanged — it was already at the sensible `right: 8px` position (its outer-right corner is the one touching the canvas; v4.62.5 brings the right pane into symmetry with it where "outer" is read from the pane's own perspective). Total UAT: **3887 passing**. Cache: `netplus-v4.62.5`. ~4 LOC in `styles.css`. **58th ship**. |
| v4.62.3 | **Priority Retention Concepts woven into every quiz + exam prompt** — user asked for the 14 Dion-practice-test gap topics from v4.59.0 (Powerload / NTS / NAC / Preaction / WAP Channels / NMAP / Teredo / Full tunnel / Split tunnel / Site-to-site / Clientless / Class of Service / RAID / PCAP) to be tested across ALL flows after finishing Messer-based study of them — explicitly *"not a standalone drill"*, embedded into normal quiz + exam generation. **Design**: new top-level `RETENTION_GAP_CONCEPTS` array (14 entries with `{label, parentTopic, objective, keyword}` — e.g., `{label: 'Powerload', parentTopic: 'Ethernet Standards', objective: '2.3', keyword: '802.3bt PoE++ Type 3/4 power classification'}`) seeded with the Cycle-1 gaps; new `_formatRetentionConceptsForPrompt()` helper emits a `PRIORITY RETENTION CONCEPTS` prompt block listing all 14 with keyword descriptions. **Injection site**: block appended to the Haiku generation prompt in `_fetchQuestionsBatch` immediately after the curated-exemplar block (`${exemplarBlock}${retentionBlock}` interpolation in `buildPrompt`). **Prompt framing** is deliberately soft: block instructs Haiku to treat the list as a **tiebreaker, not a mandate** — *"When the current topic/difficulty/scenario PERMITS, prefer testing one of these explicitly over alternatives. Do NOT force these into unrelated topics (e.g., do not inject NAC into a Port Numbers question)."* **Scope of effect**: because `_fetchQuestionsBatch` is the single funnel for ALL question generation (Custom Quiz, Mixed, Smart, Exam Simulator's 5 batches of 18, Daily Challenge, Marathon Mode, Follow-up drill on wrong answers), this one change propagates coverage improvements to every study surface simultaneously — zero per-surface wiring needed. **No-op safety**: helper returns empty string if `RETENTION_GAP_CONCEPTS` is empty, null, or non-array so future cycles that clear the list produce zero prompt bloat. **Future flexibility**: the const lives at module top next to `QUESTION_EXEMPLARS` so Phase 3 Cycle 2/3/N can append new gap concepts; when a concept reaches sustained 85%+ accuracy in weak-spot scoring, retire it from this list. **UAT**: **15 new v4.62.3 assertions** — 8 structural (const defined + seeded with all 14 labels incl. Powerload/NTS/NAC/Preaction/PCAP sentinel checks, formatter helper defined, no-op empty-array guard, `PRIORITY RETENTION CONCEPTS` header in source, tiebreaker-not-mandate framing, `retentionBlock` declared in `_fetchQuestionsBatch`, `buildPrompt` interpolates both blocks) + **7 behavioural vm-sandbox fixtures** running the extracted helper against: real const (non-empty → emits block with "Powerload" + "PCAP File" + tiebreaker framing), empty const (`[]` → returns `''`), null const (defensive → returns `''`). Total UAT: 3872 → **3887** passing. Playwright: **64/64** green. Cache: `netplus-v4.62.3`. ~70 LOC across `app.js` + `tests/uat.js`. **57th ship**. **Seventh ship of today's Wednesday session** — the record for this project. Pattern worth noting for future Phase 3 cycles: the `topicHints` pattern (v4.57.3) handles sub-concept nudges within a single parent topic, while this new pattern handles cross-topic retention nudges over a rolling 10–20-concept horizon. Both play nicely in parallel. |
| v4.62.2 | **Bug fix: CompTIA troubleshooting-methodology order guard** — user screenshotted an `order`-type question asking to arrange the 5-step CompTIA Network+ methodology where the green correct-order list placed **"Document findings, actions taken, and outcomes"** at position **3** instead of the final position. User: *"another bug. this is categorically incorrect."* Classic AI inconsistency: the explanation text at the bottom of the card actually described the CORRECT order (Identify → Theory → Implement → Test → Document), but the `correctOrder` array Haiku emitted contradicted its own explanation. **Root cause**: the validation stack (Sonnet conceptual-coherence check, programmatic `_groundTruthOk` for port/OSI/WiFi, interrogative-stem guard, numeric-option + smallest-subnet guards) has strong MCQ coverage but **no guard for `order`-type correctness**. Order questions slipped past programmatic validation because item-text varies so much. **Fix**: new `_tbTroubleshootingOrderOk(q)` targets the CompTIA troubleshooting methodology ordering — heavily tested on N10-009 Domain 5 (24% of exam). Enforces two hard invariants from the 7-step methodology: "Identify the problem" is ALWAYS position 0; "Document findings/actions/outcomes" is ALWAYS the last position. Secondary rule: "Establish a theory" cannot come before "Identify". Items matched by keyword regex (not exact phrasing) so Haiku's linguistic variation doesn't break detection. **Conservative by design** — only rejects hard violations of fixed positions, not judgment calls like test-before-implement vs implement-before-test (both valid interpretations depending on whether "test" means theory-testing or solution-verification). Stem-gated: only runs when question mentions CompTIA + troubleshooting/methodology so unrelated order questions (OSI layers, etc.) pass through untouched. Wired into `validateQuestions`; `tests/validation-audit.js` subprocess sandbox updated to include the new helper. **UAT**: **13 new v4.62.2 assertions** — 3 structural (helper defined, validateQuestions routes order questions, validation-audit.js extracts + injects the helper) + **9 behavioural vm-sandbox fixtures**: (1) reconstructs user's exact bug with `correctOrder: [1,4,0,3,2]` → rejected, (2) correct order `[1,4,3,2,0]` → accepted, (3) alt-valid test-before-implement → accepted, (4) Identify not at position 0 → rejected, (5) Theory before Identify → rejected, (6) unrelated OSI order question → passes through, (7) MCQ type → skips entirely, (8) malformed question missing correctOrder → no throw, (9) CompTIA stem but no Document item present → passes (guard only enforces invariants on items that exist). Total UAT: 3859 → **3872** passing. Playwright: **64/64** green. Validation-audit regression gate still green. Cache: `netplus-v4.62.2`. ~80 LOC across `app.js` + `tests/uat.js` + `tests/validation-audit.js`. **56th ship**. **Sixth ship of today's Wednesday session**. The pattern of adding targeted programmatic guards for canonical-fact questions (alongside the Sonnet semantic validator) continues to catch bugs the AI layer misses. |
| v4.62.1 | **Per-Hop Trace panel draggable by its head** — user screenshotted the v4.61.0 Trace panel sitting over their topology covering some devices, said *"this panel should be draggable by the way. other than that we are good to go"*. Tiny polish ship (~15 min). New `tbBindTracePanelDrag()` function using the same pattern as `tbBindInspectorPopDrag` (v4.54.6) and `tbBindConfigPanelDrag` (v4.54.7): idempotent `_tbTracePanelDragBound` flag, delegated `mousedown` on the panel listening for `.tb-trace-head` via `closest()` so re-renders of the panel's innerHTML don't break the binding, `.tb-trace-close` clicks short-circuit to preserve close-button behaviour, position clamped so the panel can't be dragged off-screen (handle always visible). CSS: `.tb-trace-head { cursor: grab; user-select: none; }` + `.tb-trace-head:active { cursor: grabbing; }`. Wired into `openTopologyBuilder` alongside the other drag bindings. **UAT**: **7 new v4.62.1 assertions** — tbBindTracePanelDrag defined, idempotent bound-flag, drag only starts in `.tb-trace-head`, drag ignores `.tb-trace-close` clicks, openTopologyBuilder wires the binding, CSS cursor grab + grabbing. Total UAT: 3852 → **3859** passing. Playwright: **64/64** green. Cache: `netplus-v4.62.1`. ~60 LOC. **55th ship**. Second polish chain of the day (v4.60.1 pane collapse + v4.62.1 trace drag). Closes out the Wednesday session: **5 feature/polish ships total**, all CI-green, TB v2 roadmap 100% shipped + polished. |
| v4.62.0 | **Topology Builder — Spanning Tree Protocol Visualisation** (issue [#186](https://github.com/oremosu98/networkplus-quiz/issues/186), **Phase 3 of TB v2 roadmap — FINAL**). Concept-mockup-first again: drafted `~/Desktop/Dev Projects/tb-stp-viz-concept.html`; user *"perfect, lets build it"* → shipped same-day as the **4th feature of Wednesday**. STP auto-enables on every L2 switch — no toggle. Add 2 switches + 2 cables between them → STP converges immediately, one port blocks automatically, no broadcast storm. **Pure function `tbComputeStpState(state)`** elects a root bridge by lowest bridge-ID (priority.MAC, default priority 32768), runs BFS over switch-to-switch cables to establish cost-to-root, then assigns port roles per cable endpoint: tree cables get `root` (child side) + `designated` (parent side); non-tree cables (would loop) get `designated` on the lower-bridge-ID side + `blocked` on the other. Non-switch endpoints get `null` role (hosts/routers don't participate). **Canvas overlay** (`tbRenderStpOverlay`): appends a `#tb-stp-layer` SVG group with (a) floating **👑 crown** + "Root" label above the root bridge with gold pill background + tooltip, (b) **port-role dots** at every switch-to-switch cable endpoint — gold root / green designated / red blocked, each with pedagogy tooltip, (c) **✗ badge** above blocked port dots, (d) **red dashed cable override** via `.tb-cable-stp-blocked` class on the conductor path — `stroke-dasharray: 8 6` so the cable visibly fades to red-dashed while still being rendered (the "up but not forwarding" STP distinction). **Reconvergence pulse**: `tbRefreshStpState` diffs previous vs current port roles; switches whose role changed get a `.tb-stp-rethink` class for 800ms firing `tbStpRethink` keyframe (accent drop-shadow pulse), then the class clears. Root-change pulses ALL switches. **Hook into `tbSaveDraft()`**: every state mutation auto-recomputes + re-renders + pulses. `tbRenderCanvas` wrapped (composes with the v4.61.0 trace wrap via preserved wrapper flags). **MAC handling**: `_tbStpBridgeMac` uses first interface with a MAC, synthetic fallback from device id if none. **Scope OUT**: RSTP/MST, TCN, PortFast/BPDU Guard/Root Guard, PVST+, editable STP timers, dedicated build-a-loop scenarios (users can test on any topology with 2+ switches + redundant link), bridge-priority UI field (users can set `dev.stpPriority` via console or scenario seed — proper UI field is v4.62.1 polish). **UAT**: **30 new v4.62.0 assertions** — 8 structural, 8 CSS, and **14 behavioural vm-sandbox fixtures** on a 3-switch triangle asserting: converged flag true, SW-A elected root by lowest MAC tiebreaker, cost-to-root 0 for root / 1 for others, exactly 1 blocked port, tree cables forwarding (root/designated), non-tree cable blocks on lower-bridge-ID side (SW-B designated, SW-C blocked), priority override (`stpPriority = 4096` on SW-C) flips root to SW-C, empty topology returns converged+no-root, host-only topology has no STP election, mixed switch-host topology elects the single switch as root + cable gets null role on host-side. Total UAT: 3822 → **3852** passing. Playwright: **64/64** green. Validation-audit regression gate still green. Cache: `netplus-v4.62.0`. ~700 LOC across `app.js` + `styles.css` + `tests/uat.js`. Closes Issue #186. **54th ship**. **🎉 TB v2 roadmap COMPLETE**: Phase 1 (v4.60.0 Live Inspector) + Phase 2 (v4.61.0 Per-Hop Trace) + Phase 3 (v4.62.0 STP) all shipped. The Topology Builder now teaches four layers: what goes where → what each device knows → what happens as packets flow → how L2 protects itself from loops. **FOUR feature ships in a single Wednesday** (v4.60.0 + v4.60.1 + v4.61.0 + v4.62.0) — the most in any day of this project's history. |
| v4.61.0 | **Topology Builder — Per-Hop Packet Trace** (issue [#185](https://github.com/oremosu98/networkplus-quiz/issues/185), **Phase 2 of TB v2 roadmap**). Concept-mockup-first again: drafted `~/Desktop/Dev Projects/tb-per-hop-trace-concept.html`; user *"amazing. you are on the money, lets build it based on the mockup"* → shipped same-day as the 3rd feature of Wednesday. Clicking the new **🔍 Trace** pill opens a prompt for source device + destination IP; a pure `tbComputeTrace(state, srcId, dstIp, ttl)` function computes the full hop-by-hop decision trail (ARP → L3 → L3 → DELIVER, or any hop → FAIL) without mutating real ARP caches; a floating trace panel auto-plays the replay at 1500ms/hop. **Hop shape**: `{ layer: 'ARP'|'L3'|'DELIVER'|'FAIL', device, deviceId, decision, meta: { srcIp, dstIp, srcMac, dstMac, ttlBefore, ttlAfter, outIface, nextHopIp, arpCached, routeMatched, directDelivery }, status: 'ok'|'fail' }`. **Decision copy**: each hop reads in plain-English but shows real lookup values — *"Route lookup: matched 10.0.2.0/24 via next-hop 10.0.254.2 on eth1. MACs rewritten, TTL decremented. ARP cache hit."* MAC rewrites are shown with an arrow (`aa:bb:cc:00:01:01 → aa:bb:cc:fe:00:01`) so the user sees exactly what changed. TTL is shown as `64 → 63` at every L3 hop — the single most pedagogically valuable element. **Canvas overlay**: `tbRenderTraceCanvasState` walks the SVG and applies `.tb-trace-visited` (green ring + glow) to devices at hops `0..current-1`, `.tb-trace-current` (accent ring + `tbTraceNodeCurrentPulse` keyframe animation) to the active hop's device, `.tb-trace-pending` (`opacity: 0.45`) to un-visited. A yellow pulsing packet pill is absolutely-positioned at the current device; above it a dark-glass **in-flight frame badge** renders as a dynamically-sized SVG group showing `LAYER`, `SRC MAC`, `DST MAC`, `SRC IP` + `DST IP` (dimmed — unchanged end-to-end), and `TTL` with before/after. For `FAIL` hops the badge stroke flips to red and the head reads `✗ FAILURE`. **Playback state machine**: `tbTracePlay()` / `tbTracePause()` / `tbTraceStep()` / `tbTraceReset()` / `tbTraceSpeedToggle()` dispatch from `_tbTraceState` and re-render the log + canvas. Speed cycles 1500ms → 750ms (2×) → 3000ms (0.5×). `prefers-reduced-motion` suppresses auto-play on trace start so keyboard-stepping is the default for those users. **Canvas-render hook**: `tbRenderCanvas` is wrapped once (idempotent via `_tbTraceWrapped` sentinel) so any re-render (device drag, scenario load) preserves trace decorations by re-calling `tbRenderTraceCanvasState`. **Reuses existing state**: `dev.routingTable`, `dev.arpTable`, `dev.interfaces`, `dev.mac` on each interface — no new data fields. **Scope OUT (deferred to v4.61.1)**: L2 switch hops as separate log rows (switches today visible as visited-ring nodes but no dedicated row — pedagogy mostly intact; explicit L2 rows with *"SW-A flooded"* / *"forwarded out Gi0/3"* copy is v4.61.1 polish), click-on-flowing-packet trigger (Trace pill + prompt simpler for v1), multi-packet parallel trace, CSV export, full Wireshark-style L7 inspection. **UAT**: **34 new v4.61.0 assertions** — 11 structural (pure function defined, state-machine functions, lifecycle functions, dialog prompt, log-renderer with layer chips, playback controls, canvas-state renderer, data-tb-device selector match, canvas-render wrap sentinel, reduced-motion gate), 13 HTML + CSS (Trace pill, floating panel, accordion timeline, layer-chip L2/L3/ARP/FAIL colour variants, current-hop pulse keyframe, packet pulse keyframe, badge elements + fail variant, device visited/current/pending states, reduced-motion neutraliser, light-theme overrides), and **10 behavioural vm-sandbox fixtures** that extract the `tbComputeTrace` function body + inline minimal IP-math stubs + run it against a 3-device Host-A / Router-A / Host-B topology with pre-populated ARP caches, asserting: trace returns hops array + success flag; first hop is `ARP` at source with `TTL=64`; middle hop is `L3` at Router-A with TTL decrement `64 → 63`; L3 meta shows src/dst MAC rewrite arrows; final hop is `DELIVER` at Host-B; path array matches `['hA', 'rA', 'hB']`; unreachable destination produces a `FAIL` hop + `success: false`; missing source device produces a single `FAIL` hop. Total UAT: 3788 → **3822** passing. Playwright: **64/64** green. Validation-audit regression gate still green. Cache: `netplus-v4.61.0`. ~900 LOC across `app.js` + `styles.css` + `index.html` + `tests/uat.js`. Closes Issue #185. **53rd ship**. **Wednesday cadence end-state**: THREE feature ships in a single day (v4.60.0 Live Protocol Inspector + v4.60.1 pane collapse + v4.61.0 Per-Hop Trace). TB v2 Phase 1 + Phase 2 both complete; only Phase 3 (STP Visualisation) still queued as a future feature-idea issue. |

> **Older releases** (v3.0 through v4.60.1, 126 rows) live in [CHANGELOG.md](./CHANGELOG.md). The last 11 releases stay inline here for quick reference.


## CSS Theme System
Dark theme in `:root`, light theme in `[data-theme="light"]`. Key variables: `--bg`, `--surface`, `--accent`, `--text`, `--green`, `--red`, `--yellow`. Toggle via `toggleTheme()`.

## Project Boards (two separate trackers)
Two Kanban boards, each with distinct purpose — never mix them.

### Bug / Tech Debt tracker
- [Board #1](https://github.com/users/oremosu98/projects/1) — bugs and tech debt only
- Labels: `bug`, `tech-debt`
- Priority field: 🔴 High, 🟡 Medium, 🟢 Low / Quick Win
- `tests/tech-debt.js` runs in CI on every push — breaches auto-create issues with `tech-debt` + `priority: medium` labels, added to board in Backlog
- Auto-reported bugs get `bug` + `priority: high` labels, added to board in Backlog
- Weekly cadence (post-2026-04-18 Option A): **Tuesdays** for bugs, **Thursdays** for tech debt
- Tighten tech debt thresholds as debt is paid down

### Feature Ideas tracker
- [Board #2](https://github.com/users/oremosu98/projects/2) — future feature candidates only
- Label: `feature-idea` (purple)
- Priority field: 🔥 Must Have, ⭐ Should Have, 💡 Nice to Have, 🧊 Someday
- Effort field: XS / S / M / L / XL
- Tie-in field: Cert SaaS Vision / Quiz App Only / Both
- Tied to product vision doc at `~/Desktop/Dev Projects/product-vision/PRODUCT-VISION.md`
- Weekly cadence (post-2026-04-18 Option A): **Mondays + Wednesdays + Fridays** for shipping features — pull a `🔥 Must Have` or `⭐ Should Have`, ship end-to-end same day (code → UAT → Chrome MCP verify → version bump → CLAUDE.md row → push → CI green). Don't start anything that can't realistically ship the same day; split larger ideas across multiple feature-day slots.
- Promote to Board #1 (as `tech-debt` or regular work) only when actually scheduled

### Routing rules
- Broken behavior / regression / crash → Board #1 with `bug`
- Code smell / duplication / architecture → Board #1 with `tech-debt`
- New capability / UX enhancement / product direction → Board #2 with `feature-idea`
- Every item is an individual issue — no master checklists

### `saas-gated` convention
A cross-board label marking items **frozen until the SaaS pivot triggers**. Exists on both Board #1 (tech-debt items that only pay off at scale, e.g. module split) and Board #2 (features that assume paid users, e.g. entitlements). **Do not pull a `saas-gated` issue without explicit pivot direction.** Full current list: see the *Conventions → `saas-gated` Label* section above.

### Auto-add to boards
- `.github/workflows/auto-add-to-board.yml` listens for `issues.opened/labeled/reopened` and routes via GraphQL: `tech-debt`/`bug` → Board #1, `feature-idea` → Board #2
- Requires repo secret `PROJECT_TOKEN` (a PAT with `project` scope) — without it the GraphQL `addProjectV2ItemById` call fails because the default `GITHUB_TOKEN` does not carry the `project` scope

### Auto-archive closed issues (JIRA-style "done disappears")
- `.github/workflows/auto-archive-done.yml` listens for `issues.closed` and calls `archiveProjectV2Item` on every board that contains the issue
- Uses the `issue.projectItems` reverse-lookup so it works for any board the issue is on (not hardcoded to Board #1 or #2)
- Archived items still exist in the board's **Archive** section — nothing is deleted, just hidden from the default view
- Same `PROJECT_TOKEN` secret as auto-add; falls back to `GITHUB_TOKEN` if unset (which will fail with insufficient scopes — that's intentional so the issue surfaces loudly)

### Board #2 (Feature Ideas) custom fields
- **Epic** (single-select, 6 options): 🟣 Study Technique · 🔵 Focus & ADHD · 🟠 Exam Day · 🟢 Memorization · 🟡 Port Drill · 🩷 UX Polish — use board Group-by to get JIRA-style swimlanes
- **Priority** (4 tiers): 🔥 Must Have · ⭐ Should Have · 💡 Nice to Have · 🧊 Someday
- **Effort** (5 tiers): XS (<1 day) · S · M · L · XL
- **Tie-in**: Cert SaaS Vision · Quiz App Only · Both
- Every feature-idea issue also carries a matching `epic:*` label for list-view filtering (redundant by design — the label survives even if the board is rebuilt)

## External References

Files outside the repo that shape decisions here. Update the relevant one when the approach evolves.

| Path | Purpose |
|---|---|
| `~/Desktop/Dev Projects/INFRASTRUCTURE-TEMPLATE.md` | Reusable infra blueprint (CI/CD, UAT, boards, cadence) — the template extracted from this repo for other projects |
| `~/Desktop/Dev Projects/product-vision/PRODUCT-VISION.md` | Cert-prep SaaS vision — multi-cert platform plan, market positioning, tier structure |
| `~/Desktop/Dev Projects/product-vision/FINANCIAL-PROJECTIONS.md` | SaaS revenue model, pricing scenarios, cost-floor math |
| `~/Desktop/Dev Projects/managed-agents-architecture.html` | Visual: how Managed Agents would plug into this app (Anthropic feature, captured for future) |
| `~/Desktop/Dev Projects/ai-user-agent-architecture.html` | Visual: deferred AI-user-agent plan (bot personas that file feature requests, triggered at 20-30 real users post-launch) |

Also worth knowing — user maintains cross-project memory at `~/.claude/projects/-Users-simioremosu-Desktop/memory/MEMORY.md` with auto-surfacing notes (weekly cadence, cert-SaaS pivot plan, gh CLI setup, platform hygiene audit). These inject into relevant sessions automatically.

## Weekly Cadence

**Option A** — adopted 2026-04-18 when roadmap queue hit 8 phases (ACL v2 + TB v2). Three feature-days + two hygiene days so the codebase stays shippable.

| Day | Lane |
|---|---|
| **Mon** | Feature ship (Board #2). Fresh-week energy → fits bigger scopes |
| **Tue** | Bug fixes (Board #1, `bug`) |
| **Wed** | Feature ship (Board #2) |
| **Thu** | Tech debt (Board #1, `tech-debt`; auto-sweep scheduled) |
| **Fri** | Feature ship (Board #2). Traditionally the signature ship |

Each feature-day is end-to-end: code → UAT → Chrome MCP verify → bump → CLAUDE.md row → push → CI green. Don't start anything that can't ship the same day. Weekend stays off — rest + N10-009 study.

**Scaling rules**: drop Wed back to rest when queue <4. Consider a 4th feature-day (Option B) only if queue >12 AND bandwidth is genuinely there. Pre-2026-04-18 cadence was Fri-only — fine through v4.52.0, compressed when the pipeline grew.

## Common Gotchas

**Code shape**
- The `pick()` function targets `#options .option` — CLI sim diagnosis MCQ must be inside `#options` div
- Topology scoring uses `correctPlacements` object mapping device→zone name (exact string match)
- Exam answers init must include `cliRan: [], topoState: {}` for PBQ types
- `hasAnswer` checks must include `Object.keys(a.topoState || {}).length > 0`
- `setQuestionText(el, raw)` order is **escape-THEN-highlight** (`escHtml` → `highlightExamKeywords` → `innerHTML`). Reversing it is an XSS hole since question text is AI-generated.
- The `_fnBody(src, name)` helper used by UAT extracts function bodies via brace-depth walking. **Prefix-match trap**: `tbShowCoach` will match `tbShowCoachModalLoading`. When writing UAT for a function, pick a name that's either unique or specify the exact suffix.

**Testing**
- Don't tune `validateQuestions()` without running `node tests/validation-audit.js` first — the `MIN_CATCH_RATE = 60` / `MAX_FP_RATE = 0` floor is CI-enforced inside UAT
- Don't pull `saas-gated` items (see Conventions list) without explicit pivot direction
- `tests/uat.js` prefers behavioral smoke over structural; see Testing Philosophy

**Deploy**
- Service worker cache name must be bumped on every deploy or users get stale files — use `scripts/bump-version.js`, never hand-edit partial
- Vercel CLI requires nvm path export: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`
- If you're tempted to `vercel --prod` without committing, **commit and push immediately after** — git↔prod drift cost us 6 versions (v4.39→v4.43.1) before it got caught
- Branch protection on `main` requires the "UAT + Playwright" status check; admin bypass works but defeats the point — only use for real emergencies

**Infra**
- `PROJECT_TOKEN` repo secret is a PAT with `project` scope (not the default `GITHUB_TOKEN`). Powers both `auto-add-to-board.yml` and `auto-archive-done.yml`. If rotated, update in GitHub repo secrets or both workflows fail loud.
- `deploy-verification.yml` runs post-deploy against the public URL — legit failures mean prod is broken; stale-cache failures mean give CDN a minute and re-run.
- When UAT fails mid-session, check `tests/validation-audit.js` first — a change to `validateQuestions()`, the GT tables, or the prompt can trip the regression gate without any UAT-level error being obvious.
