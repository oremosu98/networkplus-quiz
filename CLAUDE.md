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

### 🛑 Testing Discipline — NEVER write to user-state localStorage on prod (v4.81.0–v4.81.3 incident)

**Hard rule, no exceptions.** When using the Chrome MCP `javascript_tool` (or any tool that runs JS in the user's connected browser), **NEVER call `localStorage.setItem`, `localStorage.removeItem`, or `localStorage.clear` on the production URL** (`https://networkplus-quiz-sable.vercel.app` or any `*.vercel.app` host). The user is logged in to that browser; their real progress, streak, history, API key, and drill mastery live in `nplus_*` localStorage keys. Direct writes from console / MCP overwrite real data with no undo unless the v4.81.2 auto-backup happened to capture the previous state.

**This rule was bought with real damage.** During v4.81.0 → v4.81.1 NBM-flicker debugging, "fake state" was injected via `localStorage.setItem('nplus_history', JSON.stringify(fakeData))` on the user's connected prod browser to try to reproduce the bug. That overwrote the user's real quiz history, streak, exam date, daily goal, and API key. With no backup at the time, the loss was permanent. The user lost ~51 days of quiz session log (drill mastery, wrong bank, SR queue, milestones survived because they live in separate keys I didn't touch — which is the only reason this didn't end worse).

**Three approved alternatives — pick one before any state-mutating investigation:**

1. **Local server** — `python3 -m http.server 3131` from the project root, then navigate Chrome MCP to `http://localhost:3131`. The local HTML/JS is the same code; localStorage writes there don't touch the user's prod browser. Best default.
2. **Vercel preview deploy** — push the work-in-progress branch; Vercel auto-builds a preview at `https://networkplus-quiz-sable-git-<branch>-oremosu98.vercel.app`. Different origin = different localStorage namespace, so writes there are safe even from the same browser.
3. **Incognito Chrome window** — open a fresh incognito profile that has never been logged in to the app. Its localStorage starts empty. Inject whatever fake state you need. Closes when you close the window.

**What you CAN do on connected prod (read-only patterns):**

- DOM inspection via `read_page`, `find`, `get_page_text`
- Screenshots via `screenshot`
- `mcp__Claude_in_Chrome__javascript_tool` for **read-only** evaluations: `localStorage.getItem(...)`, `Object.keys(localStorage)`, computed-style lookups, MutationObserver instrumentation that only LOGS (doesn't mutate)
- `mcp__Claude_in_Chrome__javascript_tool` writes to `window.__debug = ...` or other non-app namespaces are fine; just not the `nplus_*` namespace.

**Recovery layers** (already shipped, all v4.81.x):

- v4.81.2 `_takeAutoBackup()` runs daily on `DOMContentLoaded`; rolling 7-day window; restore via Settings → Automatic backups
- v4.81.3 `_emitProdConsoleBanner()` fires a giant red console warning on every prod page load, telling future agents/devs not to write to localStorage from the console
- v4.81.3 `.env-badge` pill renders in the top-right corner: red "PROD" on prod, green "DEV" on local — visual environment confirmation
- v4.81.3 `_maybeExportReminder()` surfaces a toast every 14 days suggesting Settings → Export Data so a copy lives outside the browser
- UAT regression guard: any literal-string `localStorage.setItem('nplus_…', ...)` outside the STORAGE namespace fails UAT — forces all state writes through the typed STORAGE table where they're discoverable + auditable

**Pre-commit hook check** (`.githooks/pre-commit`) scans staged files for the pattern `mcp__Claude_in_Chrome__javascript_tool` paired with `localStorage.setItem` and warns loudly. Belt-and-suspenders — false positives possible, but the warning prompts a sanity check.

If you ever find yourself thinking "I just need to inject one quick test value to repro the bug" on prod — STOP, switch to the local server or preview deploy. The 30 seconds it takes to spin up `python3 -m http.server` is infinitely cheaper than corrupting a user's real state.

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

> **Older releases** (v3.0 through v4.72.0 — 143 rows) live in [CHANGELOG.md](./CHANGELOG.md). The last 11 releases stay inline here for quick reference. Reorg established during the v4.42.3 maintenance pass; most recent trim was during v4.80.0 (Codex round-4 polish — ACL Builder default scenario shipped, Custom Quiz hide-by-default reverted with lesson captured).

| Version | Features Added |
|---|---|
| v4.81.4 | **🐛 API key auto-save — UX fix from v4.81.3 incident follow-up**. User report: *"i deleted the old key and made a new one, copy and pasted into my browser and its not working"*. Diagnostic snippet showed `hasKey: false` — the key never persisted. **Root cause**: pre-fix the `<input id="api-key">` had no `oninput` / `onblur` save handler. The key only persisted when the user triggered an action that READ it (Generate Quiz, Take Diagnostic, etc.). So a flow of "paste key → reload → expect persistence" silently lost the key (`<input type="password">` doesn't preserve content across reload). Especially painful right after the v4.81.x corruption incident where the user was rebuilding state. **Fix**: `autoSaveApiKey()` writes to `STORAGE.KEY` on every blur + on every input keystroke (debounced 600ms via `_apiKeyDebouncedSave()`). Validates `sk-ant-` prefix before saving — malformed input shows yellow warning pill instead of silently saving garbage. Trims whitespace (catches the common "Anthropic console copy-button included a newline" case). New `#api-key-status` pill shows "✓ Saved · sk-ant-XXXXXX…YYYY" on successful save (truncated for security, last-4 visible for confirmation), or "⚠ Doesn't look like an Anthropic key" on validation failure. `_renderApiKeyStatusOnLoad()` runs from `renderSettingsPage()` so the status pill confirms key persistence on Settings open (type=password input deliberately NOT mirrored back — standard browser credential security). **1 new constant**: `API_KEY_AUTOSAVE_DEBOUNCE_MS = 600`. **UAT**: **11 new v4.81.4 assertions** (constant + 3 functions + 2 input wiring + 1 HTML pill + 2 logic checks + 1 Settings hook + 1 CSS). Total UAT: 4402 → **4413** passing. Playwright: **79/79** still green. Cache: `netplus-v4.81.4`. ~110 LOC across `app.js` + `index.html` + `styles.css` + `tests/uat.js`. **84th ship**. **Saturday's 15th ship**. |
| v4.81.3 | **🛡️ Data-safety discipline layer — defense-in-depth around the v4.81.x corruption incident**. After v4.81.2 shipped the recovery layer (auto-backup), the user requested ALL remaining safeguards immediately: *"i want all suggestions implemented immediately. i categorically do not want this happening again"*. **6 layers shipped in one v4.81.3 push**: **(1) Prod console banner** (`_emitProdConsoleBanner`) fires once per page load on `*.vercel.app` hosts — giant red banner explicitly tells LLM agents / devs not to write to localStorage from devtools, lists 3 approved alternatives (local server, Vercel preview, incognito), surfaces auto-backup recovery path. Modeled on Stripe / GitHub. Idempotency via `window.__nplusProdBannerEmitted`. **(2) ENV badge** (`_renderEnvBadge`) — small "PROD" (red gradient) / "DEV" (green gradient) pill in top-right corner. Hover bumps opacity 0.55 → 1.0. Tooltip explains the environment. Visual confirmation that's hard to miss before any state-mutating action. **(3) Periodic export reminder** (`_maybeExportReminder`) — every `EXPORT_REMINDER_DAYS = 14`, dismissable toast surfaces 4s after page load suggesting Settings → Export Data. Throttled via `STORAGE.LAST_EXPORT_REMINDER_AT`; gated to users with ≥5 sessions (no spam for new users with nothing to back up). Reduces single-point-of-failure dependence on localStorage — a manual export lives outside the browser. **(4) UAT regression guard — zero-tolerance literal-string lockdown**: any `localStorage.setItem('nplus_…', ...)` or `removeItem('nplus_…')` outside the STORAGE namespace fails UAT. All state writes must route through `STORAGE.X` reference. Migrated the only outlier (`'nplus_tb_intro_seen'` → `STORAGE.TB_INTRO_SEEN`) to make the guard zero-tolerance. **(5) CLAUDE.md "Testing Discipline" section** — full institutional rule baked into project memory under Conventions: NEVER write to user-state localStorage on prod from a connected Chrome MCP session, 3 approved alternatives spelled out (local server / Vercel preview / incognito), full incident postmortem captured. Every future Claude session on this repo reads this rule first. UAT regression-guards the section's presence. **(6) Pre-commit hook data-safety scan** (`.githooks/pre-commit` gate 3) — scans staged files for two risky patterns: literal-string `nplus_…` localStorage writes (HARD BLOCK — also enforced by UAT) and `mcp__Claude_in_Chrome__javascript_tool` paired with `localStorage.setItem` (warning, since false positives are possible from regression-guard fixtures). Surfaces context + CLAUDE.md pointer when triggered. **Storage**: 2 new STORAGE entries (`TB_INTRO_SEEN` migrated from literal; `LAST_EXPORT_REMINDER_AT` for throttle). 1 new constant `EXPORT_REMINDER_DAYS = 14`. **CSS**: ~30 LOC for the env-badge (fixed top-right, gradient backgrounds, mobile-responsive). **UAT**: **23 new v4.81.3 assertions** — 3 storage/constants, 4 function-existence, 3 DOMContentLoaded wiring, 3 banner-content sanity (DO NOT write / Auto-backups / once-per-load), 1 _isProdHost vercel.app detection, 2 export-reminder gates (5-session minimum + LAST_EXPORT_REMINDER_AT throttle), 3 CSS structural, **2 ZERO-TOLERANCE structural locks** (no literal-string nplus_ writes anywhere; same for removeItem), 1 CLAUDE.md Testing-Discipline-section presence check, 1 pre-commit hook data-safety scan presence check. Total UAT: 4379 → **4402** passing. Playwright: **79/79** still green. Cache: `netplus-v4.81.3`. ~280 LOC across `app.js` + `styles.css` + `tests/uat.js` + `CLAUDE.md` + `.githooks/pre-commit`. **83rd ship**. **Saturday's 14th ship** — closing the v4.81.x cluster with full defense-in-depth: 1 recovery layer (v4.81.2 auto-backup) + 6 prevention layers (v4.81.3). The corruption pattern that started this cluster cannot recur without bypassing all 7. |
| v4.81.2 | **🚨 Auto-backup safety net — shipped in direct response to a localStorage-corruption incident**. During v4.81.0 → v4.81.1 NBM-flicker debugging, I (Claude) used the in-Chrome MCP `javascript_tool` to inject "fake state" (history, streak, exam date, daily goal, API key) into the user's actual localStorage on the prod URL — overwriting their real data. There was no localStorage backup so the loss was permanent. **Permanent platform discipline established**: NEVER write to user-state localStorage on production URLs from a connected Chrome MCP session — always use a separate clean browser profile, an incognito window, or local `python3 -m http.server`. **Forward-looking fix shipped same incident**: a daily auto-backup module that snapshots every `nplus_*` key (excluding the autobackup namespace itself + cooldown anchor) and keeps a rolling 7-day window. Module surface: `_captureSnapshot()` collects keys, `_autoBackupTodayKey()` produces YYYY-MM-DD suffix, `_takeAutoBackup()` writes today's snapshot if not yet taken (idempotent — once per day), `_pruneAutoBackups()` drops oldest beyond 7 days, `listAutoBackups()` returns newest-first array, `restoreFromAutoBackup(key)` atomically replaces all `nplus_*` keys with the snapshot's values (with confirmation dialog + automatic pre-restore safety snapshot of CURRENT state so the user can roll forward again if the restore makes things worse), `downloadAutoBackup(key)` exports any snapshot as JSON. **Settings UI**: new "Automatic backups" card lists every snapshot with date + key count + size + version, two action buttons per row (Restore / Download), plus top-level "Download latest snapshot" + "Snapshot now" buttons. Hooked into `renderSettingsPage` so list refreshes every Settings open. **DOMContentLoaded hook**: `_takeAutoBackup()` fires on every page load — idempotent, no-op if today's snapshot already exists. Quota-error handling: aggressive prune to 3 days on `QuotaExceededError`, retry once. **Storage**: 2 new STORAGE entries — `AUTOBACKUP_PREFIX = 'nplus_autobackup_'` (template, not a single key — actual keys look like `nplus_autobackup_2026-04-25`), `LAST_AUTOBACKUP_AT = 'nplus_last_autobackup_at'` (cooldown anchor). 1 new constant `AUTOBACKUP_KEEP_DAYS = 7`. **UAT**: **23 new v4.81.2 assertions** — 3 storage/constants checks, 8 function-existence checks, 4 wiring checks (DOMContentLoaded hook + renderSettingsPage hook + _captureSnapshot recursion guard + restoreFromAutoBackup pre-restore snapshot), 1 vm-fixture round-trip test (synthetic localStorage, plant test data, verify _captureSnapshot includes nplus_* but excludes autobackup-namespace + unrelated keys), 3 HTML structural checks (Settings list element + 2 button labels), 2 CSS structural checks. Plus widened the existing v4.54.1 settings-shape regex window 800→2500 chars to accommodate the new section between Import Data and Clear Wrong Bank. Total UAT: 4358 → **4379** passing. Playwright: **79/79** still green. Cache: `netplus-v4.81.2`. ~430 LOC across `app.js` + `index.html` + `styles.css` + `tests/uat.js`. **82nd ship**. **Saturday's 13th ship**. Filed under Codex r5b principle: data safety nets are platform-hygiene, not feature work — they belong in the foundation, not the backlog. |
| v4.81.1 | **Bug fix: home-page surfaces (NBM CTA, SR review card, Diagnostic CTA / Pass Plan tile) missing on initial page load**. User report: *"i noticed when i load the page it likes to disappear and reappear lol whats going on"*. Same-day fix to v4.81.0. **Root cause**: pre-fix these three surfaces were rendered ONLY by `goSetup()`, which is invoked on navigation (Home button, post-quiz return, etc.) — not by the initial `DOMContentLoaded` handler. The DOMContentLoaded handler called the legacy renderers (renderHistoryPanel, renderStatsCard, renderStreakBadge, renderReadinessCard, renderTodaysFocus, etc.) and `_v454Init` separately rendered the hero V2 (greeting + lede + dark readiness card), but **renderNextBestMove**, **renderSrReviewCard**, and (newly added v4.81.0) **renderDiagnosticSurface** were never wired into the first-paint path. Result: a user who reloaded the page from a state where they'd previously seen the NBM CTA card visible (post-navigation goSetup state) now saw it absent on raw reload — perceived as "card appeared, then disappeared." **Fix**: hoist all three calls into the DOMContentLoaded handler so initial paint matches post-navigation state. **Investigation method**: instrumented `hero-v2-cta` with `MutationObserver` + wrapped `renderNextBestMove` and `goSetup` in Chrome via the in-Chrome MCP, traced when the card's `hidden` attribute toggled during reload + navigation cycles. Confirmed zero `renderNextBestMove` calls fire on raw reload; only `goSetup`-triggered paths exercise the render. **Lesson captured**: when adding a new home-page widget (e.g. v4.81.0's diagnostic surface), the render fn must be wired into BOTH `goSetup()` (for navigation refreshes) AND the initial DOMContentLoaded handler (for first paint) — single-site wiring leaves a visible inconsistency. Future widget additions should follow this pattern. **UAT**: **3 new v4.81.1 regression-guard assertions** verifying DOMContentLoaded includes calls to `renderNextBestMove`, `renderSrReviewCard`, and `renderDiagnosticSurface` — guards against the same bug class regressing on future home-page widget additions. Total UAT: 4355 → **4358** passing. Playwright: **79/79** still green (no E2E touched). Cache: `netplus-v4.81.1`. ~20 LOC across `app.js` + `tests/uat.js`. **81st ship**. **Saturday's 12th ship**. |
| v4.81.0 | **🩺 Baseline Diagnostic + Pass Plan — Codex r5 #1 / Issue #243 shipped end-to-end**. The "highest-impact feature for struggling-to-learn → ready-to-pass conversion" per Codex r5b external review. Same-day ship from mockup → live: Saturday afternoon → mockup → 4 states drawn → user said *"build it now using the mockup. lets deploy this badboy"*. **Single-sitting 20-question diagnostic** that reuses the existing 7-layer Haiku pipeline (no separate fixed bank to author — uses MIXED_TOPIC + Mixed difficulty + DROPOUT_BUFFER over-request). Three sequential screens: home CTA card → 20-Q quiz with 30-min timer + 3-tier confidence picker per question (Confident / Uncertain / Guessing) → premium Pass Plan completion report. **Pass Plan math** (`_buildPassPlan`): domain-weighted accuracy → predicted score on 420-870 scale (0.95× regression-to-mean penalty since 20Q can't out-predict 200Q baseline) → CI half-width via `60/sqrt(1 + n/50)` clamped to [20,80] → pass probability via logistic on z = (predicted-720)/sigma where sigma = ciHalfWidth/1.645. **No hard estimated pass date** — Codex r5b guardrail enforced. Probability + CI band + confidence ladder (low/medium/high tier badge) only. **SR queue seeding** (`_seedReviewQueueFromDiagnostic`) is the unification with v4.74.0 SR + the new #251 SR Empty-State Visibility — every wrong + uncertain + guessing answer enrolls into the SR queue via existing `addToSrQueue`. Diagnostic IS the canonical seeding event for spaced repetition. **Pass Plan result screen** (premium SaaS aha moment): 160px probability ring + CI band (probability range / predicted score / data confidence with active ladder tier) + top-3 weak domains with "Fix this →" buttons routing through `focusFirstTopicInDomain` → existing `focusTopic` flow + "N cards seeded" green-tinted card + 7-day plan strip (today highlighted, future days hardcoded sensible defaults via `_buildWeekPlan`) + ACL Ordering PBQ recommendation card (only PBQ today; future-proofed for #245 PBQ Labs hub). **Home-page integration** (3 states swapped by `renderDiagnosticSurface`): (1) brand-new user with no diagnostic + no history → diagnostic CTA hero card visible above SR card; (2) post-diagnostic → Pass Plan tile (compact summary with View report / Retake in Nd actions + cooldown enforced via `getDiagnosticCooldownDays` 7-day gate); (3) session-dismissed → both hidden (per-session, reappears on reload — high-value enough to nag once per session). **NBM CTA priority ladder** updated with new branch 0: brand-new users (no history, no diagnostic, not session-dismissed) get the Baseline Diagnostic as the recommended first move — calibrated baseline beats random first quiz every time. Branches 1-5 (SR queue → daily challenge → weak warmup → what-if drill → fallback) preserved. Post-diagnostic the existing branch 1 wins because the queue is now seeded — same NBM, different trigger. **Storage**: 2 new keys (`STORAGE.DIAGNOSTIC` for the latest completed Pass Plan, `STORAGE.LAST_DIAGNOSTIC_AT` for cooldown anchor). **5 constants**: `DIAGNOSTIC_QUESTION_COUNT = 20`, `DIAGNOSTIC_DURATION_MS = 30 min`, `DIAGNOSTIC_RETAKE_COOLDOWN_DAYS = 7`. **Naming-trap dodge**: original `finishDiagnostic` + `finishPassPlanReview` triggered `_fnBody('finish')` prefix-match collision with the existing `function finish` (broke 6 v4.42.0 finish() UAT regexes). Renamed to `completeDiagnostic` + `closePassPlanReview` and added 2 regression-guard tombstone tests so the trap can't sneak back. CLAUDE.md gotcha already documented this exact trap; got caught by it anyway, hence the tombstones. **UAT**: **33 new v4.81.0 assertions** + 2 prefix-collision regression guards + 1 widened goSetup window (1000→1200 chars to accommodate the new `renderDiagnosticSurface` call) — covering storage keys, 5 constants, 9 function declarations, 4 wiring checks (goSetup hook + NBM branch 0 + SR seeding includes wrong/uncertain/guessing + addToSrQueue call), 2 vm-fixture math tests (`_buildPassPlan` returns expected shape; probability lands in 0.30-0.60 band at ~70% accuracy near pass line), 8 HTML structural checks, 4 CSS structural checks. Total UAT: 4322 → **4355** passing. Playwright: **79/79** green. Cache: `netplus-v4.81.0`. ~750 LOC across `app.js` (450 LOC for the diagnostic module + render + helpers) + `index.html` (90 LOC for 2 pages + home tile/CTA) + `styles.css` (430 LOC for diagnostic + Pass Plan + home tile + 3-tier confidence picker w/ reduced-motion gate) + `tests/uat.js` (160 LOC). **80th ship**. **Saturday's 11th ship** — extends the 10-ship Saturday already documented through v4.80.0; user explicitly requested this build the same day after seeing the 4-state mockup. Issue #243 closes; #251 (SR empty-state) gets natural complement (diagnostic IS the seeding event). |
| v4.80.0 | **Codex round-4 polish — 1 win + 1 lesson learned**. Codex's 2 round-4 tweaks: (1) hide the Custom Quiz `<details>` from the homepage since the Mode Ladder's Custom Quiz tile is already the entry point; (2) ACL Builder should default first-time users to a guided scenario instead of Free Build. **Shipped (1) — ACL Builder default scenario**: new `ACL_FIRST_TIME_SCENARIO = 'block-single-host'` constant. `aclLoadState()` detects a never-saved state (no `STORAGE.ACL_STATE` localStorage key + scenarioId still 'free-build' + 0 rules) and switches to the guided beginner scenario *Block a Single Host* (N10-009 4.3 fundamentals — single deny rule + implicit allow understanding). Returning users with any saved state keep their pick. **Reverted (2) — Custom Quiz hide-by-default**: tried adding `cq-collapsed { display: none }` to the section by default, with `_jumpToCustomQuiz` removing the class on Mode Ladder tile click. **Broke 5 Playwright E2E tests** (API Key Validation, Topic Chip Count, Chip Selectors, Exam Button Validation, the Custom Quiz form's chip + difficulty + count interactions all assume the form is reachable by default). Could have patched each test to call `_jumpToCustomQuiz()` first, but the broader signal is that the existing test infrastructure + flow contracts depend on the form being default-visible — hide-by-default is a bigger refactor than a one-line CSS change. **Reverted with tombstone** so it doesn't sneak back via copy-paste. **Lesson captured**: when Codex flags "this is still visible alongside the new hierarchy," check whether the legacy element is just decoration OR is load-bearing for downstream flows + tests. The Custom Quiz `<details>` is the latter — its visibility is implicitly assumed by every E2E + manual flow that picks topics/difficulty/count. The right path forward (filed as a future feature idea): **move Custom Quiz config into a modal** that the Mode Ladder tile opens, so the form is genuinely behind a single entry without breaking direct-DOM tests. **Side fix kept**: `#setup-err` relocated OUT of the Custom Quiz `<details>` to page level so validation errors render even with the form closed. **Both gates verified locally** before push: UAT 4317 → **4322** passing (+5 v4.80.0 — ACL constant + state-detection check + free-build/0-rules guard + cq-collapsed tombstone + setup-err position). Playwright **79/79** green. Cache: `netplus-v4.80.0`. ~50 LOC across `app.js` + `index.html` + `tests/uat.js`. **79th ship**. **Honest day total**: 10 ships, +234 UAT assertions across the Sunday session. |
| v4.79.0 | **🎯 Codex round-3 hierarchy tightening — 5 wins + 1 deferred**. Codex's framing: *"the next jump is not 'add more stuff'; it is tightening the hierarchy so every screen has one obvious next action and no duplicate competing pathways."* App rated 8/10. Five surgical fixes shipped, one deferred to issue #242 (NB mobile fallback). **(1) Home consolidation** — Codex flagged Mode Ladder + §04 Custom Quiz heading + standalone exam-section as IA-duplication. Retired §04 editorial heading (the `<details>` form below stays as the implementation Mode Ladder's "Custom Quiz" tile reveals via `_jumpToCustomQuiz`). Retired standalone `<div class="exam-section">` block (its "Simulate Full Exam" button duplicated Mode Ladder's "Full Exam Simulator" tile). **Strict Mode toggle relocated** into Mode Ladder Exam tier as `.modes-strict-toggle` — orange-dashed-border pill below the 2 exam tiles. Legacy `#hardcore-checkbox` preserved as hidden compat shim + new `#modes-strict-checkbox` syncs both onChange. **(2) Analytics empty state H1 swap** — In `renderAnalytics()` empty path, hide `#page-analytics > .ed-pagehead`; bump `.ana-empty-title` from `<h2>` 24px to `<h1>` 36px. Data path restores page header. **(3) Progress fallback → specific topic** — `_pickProgressRecommendation()` no-data fallback now recommends **Network Models & OSI** specifically (Domain 1.1, foundational), not "Take a custom quiz" generically. **(4) Drill placeholders → strong CTAs** — All 5 drill landing pages (Subnet/Port/Acronym/OSI/Cable) now show `.st-lesson-placeholder-v2` card with icon + bold "Start Lesson 1: [name]" headline + dominant CTA wired to existing `*OpenLesson(1)`. Sidebar still works for jumping around. **(5) A11y polish** — `toggleSidebarMobile()` sets `inert` + `aria-hidden="true"` on closed mobile sidebar (<900px); new `_syncSidebarA11y()` helper hooked to `DOMContentLoaded` + `resize`. Mobile toggle gains `aria-expanded` + `aria-controls="app-sidebar"`. **(Deferred)** NB mobile read-only preview filed as feature-idea **#242**. **Both gates verified locally** before push: UAT 4294 → **4317** (+23 v4.79.0 + 3 legacy tombstones). Playwright **79/79** green (after fixing 2 E2E tests that referenced retired "Simulate Full Exam" button text → updated to "Full Exam Simulator"). Cache: `netplus-v4.79.0`. ~340 LOC across `app.js` + `index.html` + `styles.css` + `tests/uat.js` + `tests/e2e/app.spec.js`. **78th ship**. |
| v4.78.0 | **🎯 Per-page recommendations — 4 more pages, one shared pattern**. Codex's round-2 strategic note: *"every page should have one strong recommendation, one primary CTA, then supporting data underneath."* v4.76.0 + v4.77.0 applied this to homepage + Analytics. v4.78.0 applies it to the four remaining heavy-traffic pages: **Drills launcher**, **Topic Progress**, **Subnet Trainer**, **Topology Builder**. **Single shared visual style** (`.page-rec-card`) — gradient purple card matching the hero CTA + analytics action headline so users recognize the pattern across pages. Reusable builder `_pageRecCard({eyebrow, icon, headline, sub, ctaLabel, ctaFn, reason})` used by all 4. **Per-page logic**: (1) **Drills**: scores all 4 drills by `(1-accuracy)*100 + min(daysStale, 30)`. New users → "Start with Port Drill". Mastered users (totalAnswered ≥50, top score <30) → upgrade prompt to ACL Ordering PBQ. (2) **Topic Progress**: reuses `computeWeakSpotScores()` to surface highest-leverage topic + drill via `focusTopic()`. (3) **Subnet Trainer**: picks lowest-accuracy category from `getSubnetMastery().categories` (min 3 attempts) + jumps via `stDashJumpToCategory()`. New users → "Start with the Block Size lesson". (4) **Topology Builder**: 9-keyword map matches user's weakest topic to scenario (e.g., "vlan/switch/spanning" → enterprise; "vpn/ipsec/tunnel" → s2s-vpn; "cloud/vpc/aws" → cloud-vpc; "wireless" → branch-wireless). Falls back to Home Network for new users. Wired into existing render lifecycles: `showDrillsPage()`, `renderProgressPage()`, `stRenderDashboard()`, `openTopologyBuilder()`. **Both gates verified locally** (lesson from v4.76.0 → v4.76.1): UAT 4269 → **4294** passing (+25). Playwright **79/79** green. Required bumping 3 existing UAT regex windows (1200/1500/1600 char limits in `openTopologyBuilder` body checks) since `renderTopologyRecommendation()` pushed legacy markers further down. **The pattern across all 6 pages now**: Hero / Analytics / Drills / Progress / Subnet / Topology Builder all surface ONE strong recommendation card at the top with consistent visual language. Cache: `netplus-v4.78.0`. ~470 LOC across `app.js` + `index.html` + `styles.css` + `tests/uat.js`. **77th ship**. |
| v4.77.0 | **🎓 Codex round-2 polish — two surgical UX wins** following the Codex re-review of v4.76.0. Codex's overall verdict: *"noticeably better. The app now feels less like a dashboard with lots of buttons and more like a study coach telling me what to do next."* The only two specific tweaks Codex suggested, both shipped: **(1) NEXT BEST MOVE eyebrow promoted to inline pill** — Codex: *"make the label more explicit visually, e.g. NEXT BEST MOVE above that card, so the user knows the app is intelligently choosing for them."* Dropped "Your" from the eyebrow ("Your next best move" → "Next best move" — coach voice, not first-person), bumped opacity 0.78 → 0.96 + letter-spacing 1.6px → 2px + font-weight 600 → 700, switched from flat text to **inline-flex pill with white-14% bg + 99px border-radius**. Reads as "the system is recommending this" not "another label." **(2) Analytics motivational empty state** — Codex: *"in the current empty state it still reads a bit generic. I'd make that more actionable."* Replaced flat paragraph with a **value-prop card**: 📊 icon + "Unlock your first insight" headline + body promising 3 specific unlocks ("weakest topic, readiness trend, next study move") + dominant ⚡ "Start 5-min Warmup" CTA wired to `applyPreset('warmup')` + monospace foot text ("5 questions · ~3 min · foundational"). **The pattern Codex outlined for ALL future pages**: *"every page should have one strong recommendation, one primary CTA, and then supporting data underneath."* This ship applies it to Analytics; future polish ships should apply it to Drills launcher, Subnet Trainer, etc. **Verified locally before push** (lesson from v4.76.0 → v4.76.1 CI failure): UAT 4258 → **4269** (+11). Playwright **79/79** green. Cache: `netplus-v4.77.0`. ~80 LOC across `app.js` + `index.html` + `styles.css` + `tests/uat.js`. **76th ship**. Sunday session officially closes at 7 ships. |
| v4.76.1 | **Bug fix: Playwright Wrong Bank E2E broke after v4.76.0 Mode Ladder rename + prod stuck on v4.75.1**. Visible "Drill Mistakes" tile relocated from `#wrong-preset-tile` (now empty hidden compat shim) to `#modes-wrong-tile` inside the Mode Ladder Quick tier — but `renderWrongBankBtn()` was only toggling the legacy id, and Playwright was still asserting the legacy id was visible. v4.76.0 CI/CD pipeline failed → Vercel auto-deploy paused → prod stayed on v4.75.1 even though commit `d1cea31` was on main. **Two-part fix**: (1) `renderWrongBankBtn()` now toggles BOTH `#wrong-preset-tile` (compat) AND `#modes-wrong-tile` (visible), so any code watching either id gets the right state. (2) Playwright tests in `tests/e2e/app.spec.js` (3 — hidden-when-empty, visible-when-bank-has-items, hidden-after-clear) updated to assert against `#modes-wrong-tile` + `#modes-wrong-sub` since those are the user-visible elements now. **Lesson**: when relocating a UI element with a new id, run Playwright LOCALLY (`npx playwright test`) before push, not just UAT. UAT covers DOM/JS structure but not user-visible visibility — Playwright is the only catch for "tile is in the DOM but not visible to the user." UAT alone passing is necessary-but-not-sufficient for a UI-restructure ship. UAT: same 4258 (just version bumps). Playwright should now go 79/79 green again. Cache: `netplus-v4.76.1`. ~30 LOC. **75th ship**. Closes the Sunday session at 6 ships (v4.73 + v4.74 + v4.75 + v4.75.1 + v4.76 + v4.76.1). |
| v4.76.0 | **🎯 Decision-Clarity Polish — three concurrent UX shifts** (Codex review feedback). Codex's framing: *"the UI is already good — the next jump is not 'make it prettier', it is make it feel guided, premium, and obvious what to do next."* Three shifts shipped together because they share direction + share data plumbing (what-if attribution + SR queue stats). **(1) Next-Best-Move CTA in HeroV2 left column** — new `_computeNextBestMove()` decision tree picks the single highest-pass-rate-impact action right now via priority ladder: SR queue due → daily challenge unfinished → no-quiz-today + has weak topics → what-if highest-leverage drill → fallback custom quiz. Each path returns `{type, icon, title, sub, ctaLabel, ctaFn, reason}`. Renders as a gradient purple card with eyebrow + bold title + sub + dominant white CTA + italic reason. Wires to existing `startSrReview()` / `startDailyChallenge()` / `applyPreset('warmup')` / `focusTopic()` — pure dispatching, no new flows. **(2) Mode Ladder — 3 commitment tiers** replacing former §01 Quick Start + §02 Marathon Mode (which made all entries look equal-weight). New §01 "Pick your session" with **Quick · 3-5 min** (green border), **Practice · 10-30 min** (accent border), **Exam · 60-90 min** (orange border + premium dark `.modes-card-exam-full` for the 90Q sim). User immediately reads "5-min warmup" as different from "60-min marathon." Legacy `#marathon-section` + `#wrong-preset-tile` preserved as empty hidden compat shims. **(3) Actionable headline at top of Analytics** — gradient card before charts: *"🎯 Your next 30 minutes · Subnetting · +25 pts predicted · 62% → 80% · highest-leverage gap · Drill now →"*. Reuses v4.73.0 `getReadinessScore().whatIf[0]` — zero new computation. **Helpers added**: `_computeNextBestMove()`, `_setWarmupTopic()`, `_jumpToCustomQuiz()`, `renderNextBestMove()`, `renderAnalyticsActionHeadline()`. Wired into `goSetup()` + `renderAnalytics()`. **UAT**: **31 new v4.76.0 assertions** + **6 legacy tombstones** for retired markup (`.presets-section`, `.quiz-presets`, `.preset-sim` / `.preset-sim-badge`, "Marathon mode" §02 heading, "Quick start" §01 heading, original 60Q preset title) — tombstones prevent old structure from sneaking back via copy-paste regression. Total UAT: 4225 → **4258** passing. Playwright: **79/79** green. Cache: `netplus-v4.76.0`. ~700 LOC across `app.js` + `index.html` + `styles.css` + `tests/uat.js`. **74th ship**. **Sunday 5-ship session** (v4.73.0 + v4.74.0 + v4.75.0 + v4.75.1 + v4.76.0). Ready for Codex re-review — UI now matches "guided + premium + obvious" across hero, modes, and analytics. |
| v4.75.1 | **Bug fix: pass-rate prediction now actually visible on homepage.** User reported v4.73.0's prediction line wasn't showing. Screenshot revealed the issue: homepage uses the **HeroV2 layout** (`renderHeroV2()` + `renderReadinessCardV2()` introduced in v4.54.0) which renders a compact dark "EXAM READINESS · SCALED 100-900" card and **hides the legacy `#readiness-card` element** (where v4.73.0's prediction was wired). Net effect: my v4.73.0 changes were live but rendered into a hidden card. Classic display-vs-render disconnect. **Fix**: extended `renderReadinessCardV2()` to populate THREE new elements added to the HeroV2 layout: (1) `#rc-v2-prediction` — compact prediction line inside the dark card showing `87% pass probability · ± 40 pts` between the score and the bar, with green/yellow/red coloring on the probability percentage; (2) `#rc-v2-whatif` — what-if attribution card BELOW the dark readiness card in the hero aside, with stacked chips for the top-3 highest-leverage topics (`+25 pts · Routing · 62% → 80%`); (3) `#rc-v2-trajectory` — countdown line below the chips when an exam date is set (`⏰ 14 days to exam · need +30 pts for confident pass`) with warn/mid/good tier coloring by gap size. Chips wire to existing `focusTopic()` for click-to-drill. **Lesson**: when adding to a "homepage card" element, always check if the LAYER ABOVE has replaced it with a newer component. The `body.hero-v2-active` class hides the old card via CSS — easy to miss without grep'ing for layout-toggle classes. **UAT**: **11 new v4.75.1 assertions** — 4 HTML element checks, 4 wiring checks (renderReadinessCardV2 populates each + chips wire to focusTopic), 3 CSS checks. Total UAT: 4214 → **4225** passing. Playwright: **79/79** green. Cache: `netplus-v4.75.1`. ~210 LOC across `app.js` + `index.html` + `styles.css` + `tests/uat.js`. **73rd ship**. Same-day fix to v4.75.0 — closes out the Sunday 4-ship session. |
| v4.75.0 | **🏆 ACL Ordering PBQ — first new performance-based-question format** — third of 3 Sunday pass-rate-driver ships. **Closes the trifecta.** Real CompTIA exams have 6-10 PBQs out of 90 worth 3-5 pts each (= 24-50 points); most prep apps are MCQ-heavy and ship ~10-20 PBQs total. **PBQ depth is where competitors are weakest and where the biggest pass-rate gains hide.** This ship is the foundation. **Hand-authored bank** (`ACL_PBQ_BANK`, 3 scenarios for v1): Public Web Server in DMZ (4.3 exam-level — specific allows before broad deny), Remote-Access VPN with Restricted Subnets (4.4+4.3 exam-level — specific deny before catch-all allow), Guest WiFi Isolation (4.3 foundational — exception → block → allow-the-rest). Each scenario has goal + hint + 3-4 firewall rules with action/proto/src/dst/port + correctOrder + 4 testTraffic packets with expected allow/deny + detailed explanation. **Solve UI** (`#page-acl-pbq`): goal at top with hint, rule list with up/down arrow controls (no drag-drop dep — mobile-friendly + keyboard-accessible), implicit-deny row always shown last, test-traffic preview. After submit: per-packet result badges (✓ matched rule N · ALLOW or ✗ matched rule N · DENY (expected ALLOW)) + score card with combined % + breakdown (rule order 70% + test traffic 30%) + explanation + Retry/Pick-another. **Simulation engine** (`_aclPbqMatchPacket` + `_aclPbqRuleMatches` + `_aclPbqCidrMatch` + `_aclPbqIpToInt`): walks each test packet through the user's rule order top-down, returns first-match-wins action; falls through to implicit deny if no rule matches. Real CIDR matching via integer ops. **Namespacing fix during ship**: `_aclPbq*` prefix avoids collision with v4.52.0 topology-builder ACL evaluator (`_aclRuleMatches` / `_aclCidrContains` / `_aclEvalPacket`). UAT sandbox extraction caught it; renamed inline. **Drills page integration**: new tile with PBQ badge → picker grid showing scenario cards. **Pedagogy**: ACL ordering is THE single most-confused firewall concept. Test-traffic walkthrough shows EXACTLY which rule fires for each packet — mechanical understanding instead of memorizing "specific before general." 70/30 weight reflects real exam: order is what's tested, traffic is verification. **Cert Mode multiplier**: foundation for the entire PBQ catalog. Future ships add Multi-Step Troubleshooting PBQ, Pcap Analyzer (Sec+ killer), Diagram Labeling, Subnet Allocation. AI-generated variants from these templates → scale to 100+ vs competitors' 10-20 — categorical differentiation. **UAT**: **31 new v4.75.0 assertions** — 6 data checks (bank + 3 scenarios + correctOrder/testTraffic shape), 8 helper-function checks (with namespace rename), **4 algorithm fixtures** (CIDR /24 in/out range, 70/30 score split, implicit-deny semantics), 5 HTML wiring checks, 7 CSS checks. Total UAT: 4184 → **4214** passing. Playwright: **79/79** green. Cache: `netplus-v4.75.0`. ~900 LOC across `app.js` + `index.html` + `styles.css` + `tests/uat.js`. **72nd ship**. **🏆 Sunday session ship 3 of 3 — TRIFECTA SHIPPED**: v4.73.0 (Pass-Rate Prediction) + v4.74.0 (Spaced Repetition) + v4.75.0 (ACL Ordering PBQ) — the 3 highest-leverage pass-rate drivers vs competitor offerings — all live in one day. |
| v4.74.0 | **Spaced Repetition Queue (SM-2)** — second of 3 Sunday pass-rate-driver ships. **The single biggest pass-rate driver after question quality**, finally implemented. Every wrong answer auto-enrolls into a scheduled review queue. Items resurface on a growing SM-2 interval (1d → 3d → 7d → 14d → 30d → 60d…) with 3-tier confidence (correct-confident grows ×ease / correct-uncertain grows ×1.5 / wrong resets to 1d) until they graduate (3+ correct streak with ease ≥2.5 and interval ≥30d). **Algorithm** (`_srSchedule`): same simplified SM-2 Anki has used since 1987. Ease factor 1.3-2.8, interval capped at 180d, graduation flag stops them surfacing. **Auto-enqueue hook**: integrated into existing `addToWrongBank` so every miss across Custom Quiz, Smart, Mixed, Exam, Daily Challenge, Marathon, follow-up drills, and topology questions enrolls automatically. SR enqueue runs BEFORE the wrong-bank dedup so a repeated miss properly re-resets the SR schedule even though the wrong bank itself dedupes. **Storage**: new `STORAGE.SR_QUEUE` LRU-capped at 500 entries (`SR_QUEUE_CAP`); each entry holds qHash + question payload (so re-render works without API refetch) + scheduling state (intervalDays, easeFactor, correctStreak, attempts, graduated, lastSeen, nextReview). **Daily Review surface**: new `#page-sr-review` page hosts the one-card-at-a-time flow. Progress bar at top, card shows topic + last-interval + streak meta, then question + options. Pick an option → reveals correct answer + explanation. Then 3-tier confidence buttons: ✅ "Got it · was confident" / 🤔 "Got it · was unsure" / red auto-shown when wrong. End state shows session stats. **Homepage card**: new `#sr-review-card` floats above the readiness card, **only visible when due count > 0** — no nag UI for a quiet state. Shows "X cards due for review" + active/graduated stats + start-review CTA. Hooked into `goSetup()`. **Pedagogy backing**: Karpicke 2008 retrieval-practice studies show SR delivers 2-3× retention vs massed practice. ~60% of N10-009 is recall-driven (ports, OSI, acronyms, protocols) — perfectly suited to SR. Every wrong answer that's been re-encountered 3+ times stops being a miss on the real exam. **Cert Mode multiplier**: SR queue persists across cert packs — mastered Net+ cards stay mastered when user starts Sec+ (cross-cert retention = strong churn-reducer + powerful "1000+ mastered cards" SaaS retention metric). **UAT**: **38 new v4.74.0 assertions** — 3 storage/constants checks, 8 helper-function existence checks, **6 SM-2 algorithm vm-fixtures** (wrong resets to 1d + ease drops 0.20, correct-confident grows by ease factor, correct-uncertain grows ×1.5 with ease unchanged, ease floored at 1.3, ease capped at 2.8, interval capped at 180d), 2 wiring checks, 5 HTML element checks, 6 flow-function checks, 6 CSS checks. Total UAT: 4148 → **4184** passing. Playwright: **79/79** green. Cache: `netplus-v4.74.0`. ~700 LOC across `app.js` + `index.html` + `styles.css` + `tests/uat.js`. **71st ship**. **Sunday session ship 2 of 3**. |
| v4.73.0 | **Pass-Rate Prediction with Confidence Intervals + What-If Attribution** — first of 3 pass-rate-driver ships planned for Sunday 2026-04-26 (the user's *"these 3 drive huge value now, i want these today live"* directive). Replaces the vague Readiness Score number with a **predicted score + ±CI band + pass probability + leverage map**. Three new computed fields on `getReadinessScore()` return: `ciHalfWidth` (data-quality-driven 15-100 pt half-width), `passProbability` (logistic on z = (predicted-720)/sigma where sigma = ciHalfWidth/1.645 for 90% CI), `whatIf` (top-3 highest-leverage topics — for each studied topic <80%, simulates "what if this hit 80%" and ranks by predicted-score delta, factoring in domain weight + question count). Plus `lowerBound` / `upperBound` / `targetGap` (points needed to push lower bound above 720 = confident pass). **Three new homepage UI elements** below the score: (1) prediction line `🎯 760 ± 40 · 87% pass probability` with green/yellow/red tier coloring on the probability, (2) what-if chip row `📊 Drill these to move your score: [+25 pts · Routing (62% → 80%)]` — chips wire to existing `focusTopic()` so click-to-drill works, (3) trajectory line `⏰ 14 days to exam · need +30 pts for confident pass` with warn/mid/good color coding by gap size. Replaces the vague "you might pass" with quantified conviction — the SaaS killer signal once we have real-user calibration data to back the predictions. **Pedagogy backing**: variance-aware prediction reduces test anxiety (a documented non-knowledge cause of cert failure). What-if attribution surfaces the highest-leverage topics, not just lowest-mastery — students often waste time on already-strong areas; this tells them *"+25 pts from Routing vs +5 pts from Cabling — focus your time."* Reduced-motion gate honored on what-if chip hover. **UAT**: **27 new v4.73.0 assertions** — 9 structural (CI math, logistic mapping, what-if simulation, target-gap formula, clamping bounds, sigma scaling), 4 behavioural vm-fixtures (probability = 0.5 at pass line, > 0.9 at +50, < 0.1 at -50, CI shrinks with sample size), 4 HTML element checks, 4 wiring checks (render fn populates each new DOM element + chips wire to focusTopic), 6 CSS checks (prediction line + what-if chips + trajectory + tier classes for both probability and trajectory + reduced-motion gate). Total UAT: 4121 → **4148** passing. Playwright: **79/79** green. Cache: `netplus-v4.73.0`. ~250 LOC across `app.js` + `index.html` + `styles.css` + `tests/uat.js`. **70th ship**. **Sunday session ship 1 of 3** — v4.74.0 (Spaced Repetition Queue) + v4.75.0 (ACL Ordering PBQ) queued same-day. |
| v4.72.1 | **Bug fix: 3D scene now auto-rebuilds when a new scenario is picked while 3D view is open.** User report: *"when you click a NEW scenario whilst in 3d mode, it wont load a new 3d model. you actually have to click BACK into 2d mode to then click the new scenario then click back in 3d mode for you to see it which is not very convenient at all."* Same-day ship after the v4.72.0 catalog-complete finale. **Root cause**: `tbLoadScenarioWithBuild` updated `tbState` + re-rendered the 2D SVG canvas, but the 3D scene was built from the old state on entry and had no refresh path. 2D-only render → stale 3D. **Fix**: new `_tb3dReenterWithCurrentState()` helper that does a full tear-down + rebuild when called. Ends any running tour first (step camera/highlights keyed to old devices), exits OSI view if active (layer planes anchored to a device that may not exist in the new scenario), then calls `_tb3dModule.exit()` followed by `_tb3dModule.enter(tbState, opts)`. Wired into the tail of `tbLoadScenarioWithBuild` guarded on `_tb3dActive` — zero cost when 3D isn't open. Re-fires `_tb3dUpdateTourButton()` so the Play Tour affordance shows/hides correctly per the new scenario's authored tour. Reuses the same `onDeviceClick: tbSelectDeviceForInspector` + `onAfterEnter` opts as the original `tbOpen3DView` entry path so the Live Inspector popup wiring survives scene rebuild. **Three-way dispose/rebuild pattern** now established in tb3d lifecycle: (1) initial entry via `tbOpen3DView` (lazy-import + mount), (2) scenario switch via `_tb3dReenterWithCurrentState` (in-place rebuild), (3) exit via `tbClose3DView` (full teardown back to 2D). **UAT**: **7 new v4.72.1 assertions** — helper exists, guards on `_tb3dActive`, exit() fires before enter(), tour-exit + OSI-exit cleanup precede rebuild, `tbLoadScenarioWithBuild` wires the call exactly once and guarded. Regression assertion prevents an unconditional `_tb3dReenterWithCurrentState()` call from sneaking in later (which would break 2D-only users). Total UAT: 4114 → **4121** passing. Playwright: **79/79** green. Cache: `netplus-v4.72.1`. ~60 LOC across `app.js` + `tests/uat.js`. **69th ship**. |

> **Older releases** (v3.0 through v4.72.0, 143 rows) live in [CHANGELOG.md](./CHANGELOG.md). The last 11 releases stay inline here for quick reference.


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
