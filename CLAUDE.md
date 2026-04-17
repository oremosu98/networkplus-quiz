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
| `index.html` | All page structures (30+ pages: setup, quiz, exam, results, review, subnet, ports, drills launcher, topology, analytics, progress, guided labs, …) | ~85 KB / 1,358 lines |
| `app.js` | All app logic — state, AI calls, rendering, game loops, analytics, 5 activity sub-systems | **~1.17 MB / 19,649 lines** |
| `styles.css` | Full dark/light theme styling + `@media (prefers-reduced-motion)` gate | ~246 KB / 4,245 lines |
| `sw.js` | Service worker (stale-while-revalidate, shell-asset precache, 60-entry LRU cap) | 73 lines |
| `manifest.json` | PWA manifest | 646 B |
| `vercel.json` | Vercel config (minimal) | 806 B |
| `tests/uat.js` | UAT suite — **2,624 assertions** as of v4.46.0, embeds validation-audit gate | 4,277 lines |
| `tests/tech-debt.js` | CI thresholds: long-function count, LOC, global count, etc. | 131 lines |
| `tests/validation-audit.js` | 20-Q broken-corpus regression fixture (60% catch floor, 0 FP ceiling) | 533 lines |
| `tests/deploy-verify.js` | Post-deploy smoke against prod | 300 lines |
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

### Validation Pipeline (4 layers)
1. **Prompt self-verification** — 5-step check baked into the `fetchQuestions` system prompt
2. **AI second-pass** — `aiValidateQuestions()` on Sonnet; fixes or removes semantically broken questions
3. **Programmatic validator** — `validateQuestions()`:
   - Unique-word scoring with negation guard (skips on NOT/EXCEPT/"which not"): tokenizes distractors minus stopwords, if any distractor beats marked answer in explanation keyword match → drop
   - `_groundTruthOk(q)` against GT tables
   - `_numericOptionOk(q)` for all-numeric options (subnet math, host counts, port numbers)
   - `_smallestSubnetOk(q)` — v4.43.8 — for "needs N hosts, which mask" questions, the correct answer must be the smallest-satisfying subnet (largest CIDR that meets host + subnet-count constraints). CompTIA convention: smallest-satisfying wins, minimises waste.
   - Reported-question exclusion (`STORAGE.REPORTS`)
4. **Regression gate** — `tests/validation-audit.js` runs a 23-Q broken-corpus fixture on every UAT run. `MIN_CATCH_RATE = 60`, `MAX_FP_RATE = 0`. UAT fails loud if either breached. Current catch rate: **64.7%** (11/17 broken, 6/6 good kept). **Do NOT tune `validateQuestions()` without running the audit first.**

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
- `tbProcessCliCommand(dev, cmd)` — 452-line if/else chain, flagged in [#126](https://github.com/oremosu98/networkplus-quiz/issues/126).
- L2/L3 simulation engine, packet-flow animation, "Fix This Network" challenges, PNG export, AI Generate v2, AI Coach.

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

### Testing Philosophy
`tests/uat.js` preference order (baked into header comment post-v4.42.3-audit):
1. **Behavioral smoke** — extract function bodies via `Function()` or `vm.runInNewContext`, feed fixtures, assert output
2. **Structural regex** — assert a specific pattern exists or doesn't
3. **Regression guards** — after deleting code, assert the deleted thing stays deleted
4. **Dynamic consistency** — cross-check across surfaces (e.g. all `MILESTONE_CHECKS` IDs appear in `MILESTONE_DEFS`)
5. **AVOID** pure function-name-presence (`js.includes('function foo(')`) — proves nothing beyond what downstream assertions already do
6. **AVOID** hardcoding versions in 3+ places

**Search before adding tests.** Suite is at 2,458 assertions; duplicates slip in easily.

### Regression-Guard Tombstones
After deleting dead code, add a UAT assertion that fails if it reappears. Keeps 3–4 versions, then retires. Currently guarded:
- `function _renderAnaTopics` — must not reappear (v4.42.2)
- `pctSum += pct; count++` readiness aggregation — must not come back (v4.42.4)
- `#weak-banner` HTML — must not reappear (v4.41.0)
- `renderTodaysFocus()` must NOT be called from `finish()`/`submitExam()` (FLIP guard, v4.42.0)
- Bare `max_tokens: <literal>` — must not reappear (v4.42.5 magic-number extraction)
- `openGuidedLab` whitelist array — must not reappear (v4.42.5 whitelist trap fix)

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

## Test Suite
```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"

node tests/uat.js                # UAT (2,458 assertions; embeds validation-audit gate)
node tests/tech-debt.js          # CI thresholds — long-function count, LOC, globals
node tests/validation-audit.js   # 20-Q broken-corpus fixture, ≥60% catch / 0 FP
node tests/deploy-verify.js      # Post-deploy smoke against prod
npx playwright test              # E2E (tests/e2e/app.spec.js)
```

`tests/tech-debt.js` runs in CI on every push — breaches auto-file issues on [Board #1](https://github.com/users/oremosu98/projects/1) with `tech-debt` + `priority: medium` labels. Scheduled weekly sweep on Thursdays.

## Version History

> **Older releases** (v3.0 through v4.38.3 — 58 rows) live in [CHANGELOG.md](./CHANGELOG.md). The last 11 releases stay inline here for quick reference. Reorg done during the v4.42.3 maintenance pass when this table hit 69 rows and became hard to scan.

| Version | Features Added |
|---|---|
| v4.46.0 | **Exam Readiness hero — polished branding pass** — user flagged the Analytics Exam Readiness hero card for a polish + branding pass (screenshot review): *"i want a more polished UI here. nice clean and polished branding. high quality as always."* Audit found 5 issues: (a) three separate pills stacked (tier badge / countdown / date picker) each with its own visual weight — busy; (b) 5 domain bars all rendered as the same blue because all 5 accuracies fell in 71\u201377% (`pct >= 80 ? green : pct >= 60 ? blue : red`) \u2014 visually uniform, no differentiation between "strongest" and "weakest"; (c) no `720 = pass` tick on the main readiness bar despite the subtitle calling it the key reference; (d) stats row was 4 numbers floating with no dividers/icons \u2014 utilitarian not branded; (e) exam-date row tacked on at bottom like a form control, disconnected from the countdown shown above it. **(1) Consolidated header row**: title + "CompTIA-domain-weighted \u00b7 720 = pass" subtitle sit on the left, merged date-chip pill on the right. One element replaces three \u2014 it\u2019s the date picker AND shows the countdown AND shows the formatted date, click anywhere on it to re-pick. Chip has three color states: `ana-ready-datechip-urgent` (red border + red day-count, \u2264 7 days or exam-day), `ana-ready-datechip-soon` (yellow, \u2264 30 days), `ana-ready-datechip-past` (75% opacity, exam already happened). Placeholder state when unset says "\ud83c\udfaf Set your exam date". Clear (\u00d7) button is a small circle on the right side of the chip, uses `event.stopPropagation()` so it doesn\u2019t re-open the picker when you click to clear. Keyboard accessible (Enter/Space handler on the clear button). **(2) Hero row with 720 PASS tick**: big score (56px, -3% letter-spacing) + `/ 900` denom + tier badge sit as a unit on the left; long readiness bar on the right. Bar gets a vertical `720 PASS` tick mark positioned by formula `passTickPct = ((EXAM_PASS_SCORE - 420) / 450) * 100` \u2014 resolves to 66.67%. Pedagogically important: users can see at a glance "I\u2019m this far past the pass mark" or "I\u2019m this close to it." Bar is 14px tall (was 10px), cubic-bezier transition (0.2, 0.8, 0.2, 1) over 800ms. Below the bar: tiny `420 / 870` scale labels so you know what the range means. **(3) Domain rows tier-anchored to 55/70/85** (matches Domain Mastery card v4.45.1 thresholds so the two surfaces never disagree): each row now has a **colored dot** (green \u2265 85%, brand-purple \u2265 70%, yellow \u2265 55%, red > 0%, grey empty) with a soft 3px halo shadow, domain name in 13px, "23% of exam" as subtle 10.5px subtext underneath (replaces the cryptic weight column), domain accuracy bar (switched from always-blue to tier-color \u2014 so now the strongest domains visibly look stronger), with a faint **85% target tick** overlay on each bar (matches Domain Mastery card convention), and the accuracy % on the right in tier-color bold. Row class includes `ana-domain-row-${tier}` for future styling hooks. Rows separated by hairline `rgba(var(--accent-rgb),.05)` borders. **(4) Stats strip with icons + hairline dividers**: each of the 4 tiles (Sessions \ud83d\udcda, Questions \ud83d\udcdd, Accuracy \ud83c\udfaf, Study Days \ud83d\udd25) gets an emoji icon above the number + hairline vertical divider between tiles (`\.ana-hero-stat + \.ana-hero-stat::before` pseudo-element, 1px wide, inset 20% top/bottom so it doesn\u2019t run the full height). Numbers 22px (was 20px), tabular-nums for clean column alignment, labels tightened to .08em letter-spacing. **(5) Card-level polish**: added a second gradient layer on the hero card \u2014 `radial-gradient(120% 140% at 0% 0%, rgba(var(--accent-rgb),.12), transparent 55%)` stacked above the existing linear gradient \u2014 gives a subtle "glow from the top-left" feel that reads as premium without being garish. Double-layer shadow (`0 1px 2px rgba(0,0,0,.04), 0 8px 24px -12px rgba(var(--accent-rgb),.25)`) for soft depth. Padding tightened to 22/22/18. **Responsive**: new `@media (max-width: 560px)` block stacks the hero row vertically, drops the scale labels, shrinks the domain row + stats tile font sizes so nothing cramps on mobile. **Accessibility**: all 4 new animations neutralised in the extended `prefers-reduced-motion: reduce` block (`.ana-ready-bar-fill`, `.ana-domain-fill` transitions disabled; `.ana-ready-datechip` transition + hover-translate killed). Date-chip clear has `role="button"` + `tabindex="0"` + Enter/Space key handler for full keyboard support. **UAT**: 34 new v4.46.0 assertions \u2014 **HTML structure** (6): `.ana-ready-head` header wrapper, merged datechip class combo `ana-exam-date-btn ana-ready-datechip`, `.ana-ready-hero-row` wrapper, `/ 900` denom rendered, `passTickPct` formula exact, PASS tick + label elements, 420/870 scale. **Domain rows** (5): tier-colored dot class, "% of exam" subtext, `ana-domain-row-${tier}` dynamic class, 55/70/85 tier cutoffs present in order (mastered/proficient/developing), 85% `.ana-domain-target` tick. **Stats** (1): `.ana-hero-stat-icon` layer. **Date chip** (3): urgent/past literal states + dynamic ${urgency}, 7/30/ok urgency ladder, clear button uses `event.stopPropagation()`. **CSS** (9): `.ana-ready-head`, `.ana-ready-hero-row` grid, passtick absolute position, `.ana-domain-dot`, `.ana-domain-target` at 85%, `.ana-ready-datechip`, hairline `::before` dividers between stats, narrow-viewport responsive block, reduced-motion neutralisation. **Regression guards** (6): old `.ana-ready-top`, `.ana-ready-countdown`, `.ana-exam-date-row`, `.ana-exam-date-lbl`, `.ana-exam-date-clear`, old grid-template `1fr 36px 2fr 40px` all gone. Also **updated 1 legacy CSS test** \u2014 `CSS: .ana-exam-date-btn` renamed to `CSS: .ana-ready-datechip` since that\u2019s the new primary selector for the chip (the old class name is kept on the element for JS hook compatibility but styling lives under the new name). Version-string assertions updated (4.45.3 \u2192 4.46.0). Total UAT: 2593 \u2192 **2624** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.46.0`. |
| v4.45.3 | **Marathon Mode presets — 30/60/100 → 30/45/60 (better pacing ladder)** — user flagged the old 30/60/100 ladder had too big a jump at the top: *"30, 45 and 60 is better than 30, 60 and 100."* The 100-Q preset was a psychological cliff — once you're past 60 mixed-level questions in one sitting, fatigue tanks retention anyway (exam-day mirrors hit this in the 90-Q simulator, where diminishing-returns shows after ~60 even for well-rested takers). 45 gives a cleaner mid-rung: longer than a standard 30-Q session but still inside the 45-minute sustained-focus window that matches the real exam experience. **HTML changes**: third Marathon tile renamed from "100 Questions" → "45 Questions" (with its `applyPreset('bulk100')` onclick rewired to `applyPreset('bulk45')`), second tile swapped positions so order reads 30 → 45 → 60 ascending. **JS**: `applyPreset()` mapping at `app.js:4031` updated from `{ bulk30: 30, bulk60: 60, bulk100: 100 }` → `{ bulk30: 30, bulk45: 45, bulk60: 60 }`. The downstream `startBulkQuiz(count)` is count-agnostic (18-Q batch size, `Math.ceil(count/BATCH_SIZE)` batches) so no other code needed to change \u2014 45 correctly runs as 3 batches of 15 or 2×18+1×9 after the final truncate. **Milestone `hundred_qs` ("Century", 100 questions cumulative) unchanged** \u2014 that counts total questions answered across ALL sessions, not a single preset, so it\u2019s untouched and still hits at the 100-question cumulative mark. **UAT**: 4 new v4.45.3 assertions \u2014 `applyPreset('bulk45')` onclick present, `45 Questions` title rendered, new `bulk30: 30, bulk45: 45, bulk60: 60` mapping string, Tier1 marathon-preset-wired 45-Q check. **5 regression guards** \u2014 `applyPreset('bulk100')` gone from HTML, `100 Questions` title gone from HTML, `bulk100:` gone from `applyPreset` mapping, plus the 2 previously-existing `bulk100`/`100 Questions` assertions inverted to NOT-includes. Also updated the 2 existing version-string assertions (4.45.2 \u2192 4.45.3). Total UAT: 2590 \u2192 **2593** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.45.3`. |
| v4.45.2 | **Analytics cleanup — 4 targeted fixes from user screenshot review** — user audited the Analytics page and flagged 4 issues: (1) Wrong-Answer Patterns card was vertical, wasting horizontal space; (2) Practice Drills stats card felt redundant since drills have their own in-drill dashboards; (3) Milestones was a long wall of 49 tiles in one grid with no hierarchy; (4) Subtopic Weak Spots keyword list was redundant with the homepage `#todays-focus` chip row + Wrong-Answer Patterns. All 4 shipped as one cleanup release. **(1) Wrong-patterns horizontal**: changed `.wp-list` from `display: flex; flex-direction: column; gap: 12px` to `display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; align-items: start`. Auto-fit gives 2 columns on wide viewports (patterns side-by-side) and collapses to 1 column under ~560px. No media queries needed. **(2) Practice Drills stats card removed**: `_renderAnaDrills()` function deleted entirely from `app.js` (was ~80 lines rendering port/subnet/acronym/OSI/cable card with per-drill stats). Call removed from `renderAnalytics`. The Drills pill in `_renderAnaNav` also removed (4 pills now: Readiness / Trend / Activity / Milestones). Underlying storage (`PORT_BEST`, `SUBNET_STATS`, `AB_MASTERY`, `OS_MASTERY`, `CB_MASTERY`) completely untouched \u2014 the milestones (`perfect_port`, `streak_port_25`, `subnet_initiate`, `port_pioneer`, etc.) still read from these keys and still unlock on achievement. **(3) Milestones reworked**: `_renderAnaMilestones()` rewritten. Old: single flat grid of 49 tiles in MILESTONE_DEFS order, unlocked and locked interleaved. New structure: **(a) Header strip** with count (19 / 49 format), a thin gradient progress bar filled to the unlocked %, and numeric % on the right \u2014 at-a-glance "how far along"; **(b) "Recently unlocked" section** with the 4 most-recently-unlocked milestones as tiles, sorted by unlock date desc from `getMilestones()` ISO strings; **(c) Collapsible `<details>` containing the full 49-tile grid** \u2014 closed by default, "Show all 49 milestones" summary with a rotating \u25B6 chevron. All 49 tiles still available on one click for users who want to browse. New CSS: `.ana-card-ms` (full-width grid-column span), `.ana-ms-head`, `.ana-ms-progress` (flex row with count / bar / pct), `.ana-ms-bar-fill` with 800ms cubic-bezier width transition matching v4.45.0 Domain Mastery aesthetic, `.ana-ms-section-title`, `.ana-ms-recent` (auto-fit grid, 140px minmax), `.ana-ms-details` + `-summary` (custom chevron, no native marker). If user has 0 unlocks yet, shows a neutral empty-state instead of the recently-unlocked row. **(4) Subtopic Weak Spots removed**: `_renderAnaWeakSpots()` function + `ana-weak-list` rendering deleted. Call removed from `renderAnalytics`. `mineSubtopicWeakSpots()` (the underlying keyword-frequency analyzer) preserved in case a future feature wants it \u2014 the v4.38.7 Weak Spots v2 algorithm on the homepage is the primary weak-surface signal now, plus the new Wrong-Answer Patterns card from v4.45.0 covers the "what\u2019s tripping me up lately" angle with more actionable signal. **Grid layout after this pass**: `ana-grid-2col` now holds 3 cards \u2014 Streak / Wrong-Answer Patterns / Exam-vs-Quiz. Clean, no empty slots. **UAT**: 14 new v4.45.2 assertions \u2014 `.wp-list` grid layout + `auto-fit minmax(260px, 1fr)` formula; regression guard on the old `flex-direction: column`; `_renderAnaDrills` + `_renderAnaWeakSpots` functions gone; `renderAnalytics` no longer calls them; Drills nav pill removed (`ana-s-drills` anchor gone); `.ana-card-ms` wrapper present; `.ana-ms-bar-track` + `-fill` CSS; "Recently unlocked" string in source; full grid wrapped in `<details>`; `unlockedMap[b.id] - unlockedMap[a.id]` date-sort for recent strip; `Show all ${totalMilestones} milestones` template. Also repurposed 4 pre-existing assertions (`Weak spots card rendered` / `Drills grid card rendered` / `Analytics: nav has Drills link` / `v4.42.2: Drills pill still present`) into `v4.45.2` regression guards (inverted to NOT-includes). Also updated the 2 existing version-string assertions (4.45.1 \u2192 4.45.2). Total UAT: 2577 \u2192 **2590** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.45.2`. |
| v4.45.1 | **Domain Mastery tier thresholds — grounded in real CompTIA pass math** — user disputed the v4.45.0 tier labels: at 70% they were marked "Developing" which they argued should be "Proficient." Analysis confirmed the dispute was right. **Why the original 60/75/85 was wrong**: picked for "clean even quartiles" and anchored to our linear scaled-score formula (`100 + raw × 800 = 720` gives 77.5% raw as pass). But real CompTIA N10-009 scoring is non-linear and form-specific; actual raw-accuracy pass equivalent is consistently cited at **~70–75%**. So a user at 70% is already in the "probably passes today" zone \u2014 calling that "Developing" is both psychologically wrong (70% isn\u2019t still-learning-fundamentals, it\u2019s refining) and factually misaligned with the real exam. **New thresholds 55 / 70 / 85**: Novice <55% (was <60%) \u2014 "still learning fundamentals"; Developing 55\u201369% (was 60\u201374%); Proficient 70\u201384% (was 75\u201384%) \u2014 "you\u2019d likely pass the exam today"; Mastered \u226585% (unchanged, aspirational). Inline code comment in `tierInfo()` documents the dispute + reasoning so a future session doesn\u2019t revert without context. **Not changed**: the Readiness algorithm (separate composite of accuracy / coverage / recency / volume, still 420\u2013870 scaled) is untouched \u2014 this is a labeling refinement on the Domain Mastery card only. 85% mastery target-tick on the progress bar is also unchanged, so the aspirational ceiling still reads the same. **Snapshot effect on user\u2019s dashboard**: 4 of 5 domains flip from Developing \u2192 Proficient (1.0 at 70%, 2.0 at 71%, 4.0 at 74%, 5.0 at 75%). 3.0 at 78% stays Proficient. Only \u2264 54% would read as Novice under the new thresholds (user has no domain that low). **UAT**: 5 new v4.45.1 assertions \u2014 Proficient threshold now at 70% (regex against `pct >= 70) return { label: 'Proficient'`), Developing starts at 55%, Mastered still 85%, **regression guards** on the old 75% Proficient and 60% Developing cutoffs (must stay gone). Behavioural vm-sandbox smoke was drafted but dropped because the non-greedy `};\n` extraction regex truncated at the first return statement inside the arrow function; the 5 structural regex tests above give sufficient coverage without the brace-depth extraction gymnastics. Also updated the 2 existing version-string assertions (4.45.0 \u2192 4.45.1). Total UAT: 2572 \u2192 **2577** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.45.1`. |
| v4.45.0 | **Analytics revamp — Domain Mastery + Wrong-Answer Patterns replace Heatmap + Type Breakdown** — user called out the old Difficulty × Topic Heatmap and Question Type Breakdown cards as low-value: *"these two statistics dont show me much value."* Analysis confirmed both were **descriptive without being prescriptive** (showed data but didn\u2019t drive action): the heatmap was a sparse matrix (most cells empty because you don\u2019t drill every topic at every difficulty) and the type breakdown had 3 of 5 rows with too-small sample sizes to mean anything (CLI Sim 4 attempts, Topology PBQ 1 attempt). Proposed 4 replacement candidates with an ROI analysis (A: Domain Mastery Ladder, B: Exam Pace Tracker, C: Wrong-Answer Patterns, D: Objective Coverage) \u2014 user picked **A + C**. **(1) Domain Mastery Ladder** (`_renderAnaDomainMastery`, full-width above the 2-col grid): 5 rows, one per N10-009 domain (Concepts 23% / Implementation 20% / Operations 19% / Security 14% / Troubleshooting 24%), each with a progress bar toward the 85% mastery threshold, a tier badge (Novice <60% / Developing 60-75% / Proficient 75-85% / Mastered 85%+), and a drill button. Progress bar includes a vertical 85% target tick so you can see at a glance how close each domain is. Each row has a left-border accent color matching the domain. Unstudied domains get a "Not started" state with a "Start drilling \u2192" button. Drill button fires new `drillDomain(domainName)` helper which finds the weakest topic in that domain (unstudied topics get priority via -1 sentinel) and pipes it into the existing `focusTopic()` flow \u2014 one click \u2192 targeted quiz starts. Data aggregates from `loadHistory()` via `TOPIC_DOMAINS` mapping, not from the weighted readiness computation \u2014 raw accuracy is the right metric for the "how close to 85%" question. **(2) Wrong-Answer Patterns** (`_renderAnaWrongPatterns`, inside the 2-col grid replacing Question Type Breakdown): clusters the last 20 entries from `loadWrongBank()` by signal and surfaces top 3\u20134 patterns: (a) **Negation traps** \u2014 stems containing NOT / EXCEPT / CANNOT / NEVER / LEAST / WORST; if \u22653 of last 20, flag "you're reading past the trap word"; (b) **Dominant domain cluster** \u2014 the N10-009 domain with the most wrongs, if \u22653; gets a drill button to jump into that domain; (c) **PBQ structure issues** \u2014 multi-select or order wrongs combined \u22652; tailored coaching depending on which dominates ("Choose TWO" miss vs sequence misread); (d) **Hard-difficulty concentration** \u2014 if \u22654 of last 20 are Hard-tier, suggests dropping back to Exam-Level until solid. Each pattern renders as a card with: numbered rank badge, icon, title, count \u00b7 pct, coaching copy, and a drill button where applicable. If no pattern meets its threshold the card renders a positive empty state ("your recent wrongs are scattered \u2014 no single failure mode dominates"). **Layout change**: Domain Mastery is promoted OUT of the 2-col grid to full-width because it\u2019s the most prescriptive card on the page and deserves the space. Wrong-Answer Patterns takes the grid slot where the heatmap used to live. The grid now holds: Streak, Weak Spots, Wrong-Answer Patterns, Exam-vs-Quiz. **What\u2019s NOT in this ship** (deferred from the 4-candidate menu): B (Exam Pace Tracker \u2014 most novel but requires new time-tracking aggregation) and D (Objective Coverage \u2014 very granular, can tuck inside Domain Mastery as an expandable later). Could slot into v4.46 if you want them. **CSS**: brand-new `.dm-*` rule set (27 declarations) and `.wp-*` rule set (14 declarations); old `.ana-heatmap`, `.ana-heat-*`, `.ana-type-*` rules deleted. Light-theme overrides added for both new cards. Progress bar uses `transition: width 800ms cubic-bezier(0.2, 0.8, 0.2, 1)` for smooth initial fill. 85% target line is a 2px absolute-positioned div with `transform: translateX(-50%)` for pixel-perfect centering on the threshold. **UAT**: 19 new v4.45.0 assertions \u2014 both new functions defined, `drillDomain` wires to `focusTopic(target)`, `renderAnalytics` call sites updated, **regression guards** on the old `_renderAnaHeatmap` + `_renderAnaQuestionTypes` functions (must stay gone) AND the old call sites in `renderAnalytics`, all 4 tier-badge CSS classes present, `.dm-bar-fill` 800ms cubic-bezier transition, `.dm-bar-target` positioned at 85%, `.wp-pattern` + rank/count CSS present, old `.ana-heatmap` + `.ana-type-list` CSS gone (regression guards), all 5 N10-009 domain IDs referenced in the Domain Mastery data, Wrong-Pattern classifier covers all 4 pattern categories. Also repurposed 2 pre-existing assertions (`Heatmap card rendered` / `Type breakdown card rendered`) into `Domain Mastery card rendered` + `Wrong-answer patterns card rendered`. Also updated the 2 existing version-string assertions (4.44.0 \u2192 4.45.0). Total UAT: 2552 \u2192 **2572** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.45.0`. |
| v4.44.0 | **Animation pass — quiz-feel polish + block-match \u2705 + keyword simplification** — 5-item animation ship after the ROI analysis accepted Tier 1 (items 2, 3, 4, 7 from the 7-item menu) plus a user-added simplification to the keyword highlighter. Analysis called out pure "page transitions" (#1) and "TB dropped packets" (#6) as lower-ROI \u2014 deferred to v4.45 / Board #2 respectively. **(1) Keyword highlighter simplified** (user: *"much more cleaner"*): `.exam-keyword` had a pill background (`rgba(124,111,247,.10)`), 4px padding, 3px border-radius, and inset box-shadow underline since v4.43.0. On dense stems with 2+ highlighted words the chip styling fought the sentence. Stripped back to bold + purple text only (`var(--accent-light)` on dark, `var(--accent)` on light). One rule, two lines, cleaner reading experience. **(2) Answer-pick feedback upgrade** (Item 3 from the menu \u2014 highest pedagogical ROI): added a new `optGlowPulse` keyframe that layers on top of the existing `optBounce` for correct answers. 0-70% pulse expands a green `box-shadow` ripple from 0 to 16px then fades to 0 opacity. 0.9s cubic-bezier, `.25s` delay so it fires AFTER the bounce settles. Subtle celebration, zero layout thrash. Wrong answers keep the existing `optShake` \u2014 the shake is already iconic and adding more would feel cartoonish. **(3) Question reveal + option stagger** (Item 2): new `qTextReveal` and `optionStaggerIn` keyframes (both gentle `translateY(8-10px) + opacity` over 300-340ms with `cubic-bezier(0.2, 0.8, 0.2, 1)`). `render()` re-triggers them on every new question by `classList.remove` \u2192 forced reflow via `void el.offsetWidth` \u2192 `classList.add`. Options get a per-index `animationDelay = (i * 80) + 'ms'` so they glide in one after the other rather than all-at-once. Every new question now feels fresh, not a tab-swap. **(4) Progress bar smoothing** (Item 4): `.progress-fill` transition upgraded from `width .4s ease` to `width .6s cubic-bezier(0.2, 0.8, 0.2, 1)`. Bar glides between % values instead of the old abrupt ease-out. Trivial change, compounds with the question reveal to make the quiz-to-quiz transitions feel intentional. **(5) Subnet block-match \u2705 pop** (Item 7 \u2014 pedagogical): wrapped the \u2705 in Lesson 4 Step 4 (`64\u2013127 \u2705`), Lesson 4 bigger example Step 4 (`160\u2013175 \u2705`), and Lesson 5\u2019s put-it-all-together visual (`.65 First usable \u2705` + `.126 Last usable \u2705`) in `<span class="st-block-match">`. Default state is `opacity:0 + scale(0.3)`; adding `.st-block-match-active` fires a 600ms `stBlockMatchPop` keyframe with overshoot (`cubic-bezier(0.34, 1.56, 0.64, 1)`, 60% point at scale(1.3) before settling to scale(1)). New `_stSetupBlockMatchObserver()` helper wired from `stOpenLesson()` uses IntersectionObserver (threshold: 0.5) to trigger the animation when the card scrolls into view. One-shot per element (`observer.unobserve(entry.target)`) so scrolling back doesn\u2019t replay. Graceful fallback: if `IntersectionObserver` is undefined, all `.st-block-match` elements get the active class immediately (visible but no animation). **Accessibility**: extended the `@media (prefers-reduced-motion: reduce)` block with `animation: none !important` for the 4 new animation classes + neutralised `progress-fill` width transition + immediate final state for `.st-block-match`. Motion-sensitive users see all content, no motion. **What\u2019s NOT in this ship**: page transitions (#1, deferred \u2014 touches 30+ pages, high risk, mostly polish not pedagogy); TB dropped-packet visualization (#6, backlog on Board #2 \u2014 niche, ~3hr effort for a small surface). **UAT**: 12 new v4.44.0 assertions \u2014 4 keyframes present (`optGlowPulse`, `qTextReveal`, `optionStaggerIn`, `stBlockMatchPop`), `.option.correct` animation chains bounce + glow, `.exam-keyword` has NO background/box-shadow (regression guards on the old chip styling), `.progress-fill` uses the new `cubic-bezier` transition, `render()` has the `void el.offsetWidth` reflow + per-index `animationDelay` pattern, `.st-block-match` wrappers exist in 4 places (Lesson 4 Step 4 + bigger example + Lesson 5 two usable marks), `_stSetupBlockMatchObserver` function + IntersectionObserver call present, `stOpenLesson` calls the observer setup, reduced-motion block covers all 4 new classes. Also updated the 2 existing version-string assertions (4.43.9 \u2192 4.44.0). Total UAT: 2534 \u2192 **2546** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.44.0`. |
| v4.43.9 | **Release-flow hygiene — `bump-version.js` now prepends to CLAUDE.md top (eliminates Read/Edit race)** — user flagged repeated CLAUDE.md hiccups over the session: *"make sure that stays regularly updated. I dont want any excuses or hiccups there. High quality always."* The root cause was a flaw in `scripts/bump-version.js`: it was scanning for the LAST version row and inserting AFTER it (bottom of the table). The convention, established in the v4.42.3-audit reorg, is newest-first. So every release required a manual "move stub row from bottom to top, expand into full detail" Edit after running the bump script. That Edit consistently hit `"File has been modified since read"` errors because the bump script had mutated CLAUDE.md between my earlier Read and the later Edit. Work-around was a docs-only follow-up commit per release, which is sloppy and leaves the code+docs commit incomplete. **Fix — `scripts/bump-version.js` now prepends** by finding the FIRST version row and inserting immediately before it. That puts the new row right under the `|---|---|` header (the correct position for newest-first). No "move row" Edit needed anymore — the stub is already at the top; a single in-place expansion Edit is all that\u2019s required, and that Edit is against a file state freshly re-Read after the bump (not a stale pre-bump snapshot). **Release-flow discipline documented in CLAUDE.md** under the Deployment > Version bumps section: (1) run `bump-version.js` first, (2) **Read CLAUDE.md again** before the stub-expansion Edit (the bump script mutated it; any pre-bump Read snapshot is stale), (3) expand in place \u2014 no move required, (4) UAT \u2192 commit \u2192 push, all in one commit, no trailing docs-only follow-up. **UAT**: 6 new v4.43.9 regression guards \u2014 script\u2019s new comment header *"prepend to version history table"* present (pins the intent), script looks for FIRST `/^\| v\d/` match (not last), uses `lines.splice(firstVersionIdx, 0, newRow)` (prepend not append), success log says *"added at top"*, **regression guards** that the old "Find the last version row and insert after it" comment is gone AND the old `lastVersionIdx + 1` splice pattern is gone. Also updated the 2 existing version-string assertions (4.43.8 \u2192 4.43.9). This release itself is the proof \u2014 the stub landed at line 308 (top of table) automatically; this expansion Edit ran cleanly with zero file-state errors; single commit shipping both tooling fix and docs update. **No production code changes \u2014 tooling + docs only.** UAT: 2528 \u2192 **2534** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.43.9`. |
| v4.43.8 | **Smallest-satisfying-subnet guard — rejects wasteful subnet-sizing answers** — user hit a Hard subnet-sizing question: *"assigns 10.50.0.0/16 \u2014 5 subnets with at least 4,000 usable hosts each \u2014 which mask?"* Options: /19 (8190 usable, 8 subnets) · /20 (4094 usable, 16 subnets) · /21 (2046) · /18 (only 4 subnets). Haiku marked **/19** claiming "more headroom is better." User correctly disputed: **/20 is the right answer** \u2014 it satisfies both constraints (\u22654,000 hosts, \u22655 subnets) with minimum waste. CompTIA convention is *smallest-satisfying-subnet wins* \u2014 this class of question tests whether you pick the efficient mask, not the most spacious one. Neither `_groundTruthOk` nor the unique-word check rejected it because nothing is factually wrong \u2014 /19 is valid, just sub-optimal. **Fix \u2014 new `_smallestSubnetOk(q)` guard at `app.js:4817`** (~70 lines, wired into `validateQuestions` alongside `_numericOptionOk`): **(1) Activation gate** \u2014 only triggers on MCQ questions whose stem contains a sizing phrase (`at\s+least` / `minimum` / `requires` / `needs` / `must\s+support`) paired with `hosts?|devices?|endpoints?|users?|addresses?`, AND explicitly asks for a subnet mask / CIDR / prefix. Anything else short-circuits to `true` (don\u2019t interfere). **(2) Constraint extraction** \u2014 pulls host-count requirement (numeric, comma-tolerant: `4,000` \u2192 4000), optional subnet-count requirement (`5 subnets|departments|networks|sites|vlans|offices|branches|segments`), and optional parent CIDR gated by assignment language (`assigns?|allocated?|assigned|receives?|given|uses?|has|owns?`) to avoid capturing a random `/N` that appears mid-stem as an example. **(3) Option parsing** \u2014 each A/B/C/D option parsed as a CIDR: prefer explicit `/N`, fall back to dotted-quad mask by counting 1-bits (valid range 0-32). If ANY option can\u2019t be parsed, the guard bails (`return true`) rather than producing a false positive. **(4) Satisfaction check** \u2014 an option satisfies if `usable = 2^(32-cidr) - 2 >= hostReq` AND (when parent + subnet-count constraints are both present and parent is a valid ancestor) `2^(cidr - parentCidr) >= subnetReq`. **(5) Decision**: 0 satisfying \u2192 return true (premise is broken, let other layers catch); 1 satisfying \u2192 must equal the marked answer; 2+ satisfying \u2192 the marked answer must be the one with the largest CIDR value (= smallest subnet, least waste). **Regression fixtures (`tests/validation-audit.js`)**: corpus expanded 20 \u2192 23 with 3 new cases pinning the behavior. **#21** is the exact user bug (parent /16, 5 subnets, 4,000 hosts, marked /19 when /20 is smallest-satisfying) \u2014 `shouldBeCaught: true`, **guard catches it**. **#22** is a single-satisfying control (only /19 provides \u22658,000 hosts; marked /19) \u2014 `shouldBeCaught: false`, guard activates and passes. **#23** is a non-sizing subnet question (*"what is the network address for X/26"*) \u2014 `shouldBeCaught: false`, guard\u2019s sizingRe short-circuits, no-op. Audit result: catch rate **62.5% \u2192 64.7%** (11/17 broken caught), false-positive rate **still 0%** (6/6 good kept). Regression gate (`MIN_CATCH_RATE = 60`, `MAX_FP_RATE = 0`) passed. **UAT**: 11 new v4.43.8 assertions \u2014 `_smallestSubnetOk` defined at module scope, body extracted for scoping, sizingRe covers all 5 host-synonyms, usable-host formula uses `Math.pow(2, 32 - cidr) - 2` exactly, subnet-count constraint applies `Math.pow(2, cidr - parentCidr)` only when `parentCidr < cidr`, option parsing supports both `/N` and dotted-mask fallback (`toString(2).match(/1/g)`), largest-CIDR selection via `cidrs[L] > cidrs[bestLetter]`, guard wired into `validateQuestions` with the exact `if (!_smallestSubnetOk(q)) return false` call, validation-audit stub includes `smallestSubnetSrc` extraction. Plus **2 behavioural smoke tests** \u2014 extract the helper into a `vm` sandbox, feed the user\u2019s exact fixture with `answer: 'A'` (expects `false` = reject) then with `answer: 'B'` (expects `true` = pass). Also updated the 2 existing version-string assertions (4.43.7 \u2192 4.43.8). Total UAT: 2517 \u2192 **2528** passing. Validation-audit regression gate green at 64.7%. Cache bumped to `netplus-v4.43.8`. |
| v4.43.7 | **Subnet Trainer Lesson 5 rewrite + fix beginner-level question-pool bug** — user flagged two issues on Lesson 5 ("Network & Broadcast"): (1) theory was terse — 6 compact bullets that didn\u2019t explain how to *calculate* broadcast and usable addresses from block size; (2) the Practice Gate only ever served *"What is the network address for X?"* questions, never broadcast or usable — practice didn\u2019t match what the lesson was teaching. **Root cause of #2 (real bug)**: `stPickType()` at `app.js:15281` had a miscategorized question-type tier. `easyTypes` listed only `find_subnet`; `find_broadcast` / `usable_first` / `usable_last` were classified as `medTypes`. At beginner level the pool gets filtered to only easyTypes \u2014 so the addressing category (which lists all 4 types) collapsed to just network-address questions. All 4 are equally easy once the block-size method clicks (broadcast = next start \u2212 1; usable = network+1 to broadcast\u22121). **Fix #1 \u2014 tiering correction**: moved `find_broadcast`, `usable_first`, `usable_last` from `medTypes` to `easyTypes`. Beginner-level addressing drills now round-robin across all 4 types. **Fix #2 \u2014 Lesson 5 full rewrite**, same stepped format as Lesson 4. 12 theory cards (was 6): (1) intro recalling Lesson 4 and pitching "the other 2 addresses come out of block size for free"; (2) the 3 key addresses (network / broadcast / usable) with notes on which are reserved vs assignable; (3) example setup reusing 192.168.1.100 /26 from Lesson 4 (block = 64, network = 192.168.1.64); (4) **Step 1 \u2014 Broadcast = next network start \u2212 1** (next = 64+64 = 128, broadcast = 128\u22121 = 127 \u2192 192.168.1.127); (5) **Step 2 \u2014 First usable = Network + 1** (64+1 = 65 \u2192 192.168.1.65); (6) **Step 3 \u2014 Last usable = Broadcast \u2212 1** (127\u22121 = 126 \u2192 192.168.1.126); (7) put-it-all-together visual showing the full /26 block with reserved (.64 Network \u2705 / .127 Broadcast \u2705) bookending the usable .65\u2013.126 range; (8) *Why subtract 2?* explanation \u2014 network address identifies the subnet, broadcast address reaches every host, so 2 addresses are reserved. `62 = 126\u221265+1 \u2705` arithmetic check included; (9) bigger example 10.50.173.45 /20 walking all 3 steps \u2192 broadcast 10.50.175.255, usable 10.50.160.1\u201310.50.175.254, host count 2<sup>12</sup>\u22122 = 4094; (10) extended cheat-sheet table with 5 columns (CIDR / Block size / Total IPs / Usable hosts / Reserved) for /24\u2013/30; (11) exam-pressure 6-step recall recipe (block size \u2192 network \u2192 broadcast \u2192 first usable \u2192 last usable \u2192 hosts); (12) edge cases for the exam \u2014 /31 point-to-point (RFC 3021 \u2014 both IPs usable, no reserved) and /32 single host, with note that `2^n \u2212 2` formula applies /24\u2013/30 only. **UAT**: 13 new v4.43.7 assertions \u2014 `stPickType` body extracted for scoping, `easyTypes` now contains all 3 previously-med types (`find_broadcast`/`usable_first`/`usable_last`), **regression guards** that `medTypes` no longer contains any of the 3 (prevents double-classification), Lesson 5 desc updated to "3 quick steps", lesson body contains step labels for Broadcast/First-usable/Last-usable derivation, "Why subtract 2 from host count" explanation present, /31 RFC 3021 + /32 edge-case section present, cheat-sheet table has the new 5-column format with "Reserved" column, **regression guard** on the old terse single-line `'Every subnet has 3 key addresses:'` theory string (must stay gone). Also updated the 2 existing version-string assertions (4.43.6 \u2192 4.43.7). Total UAT: 2504 \u2192 **2517** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.43.7`. |
| v4.43.6 | **Subnet Trainer Lesson 4 rewritten — AND Operation replaced with Block Size Method (user preference)** — user opened Lesson 4 ("The AND Operation") and flagged that the block size method is *"a better method that i understand and i need that method explained in full."* Also specified the pedagogical format: one step per card with visible subnet-range blocks and a ✅ on the correct answer. **What changed**: the 4th entry in `SUBNET_LESSONS` at `app.js:15438` was replaced entirely. Old id `and_operation` → new id `block_size`, old title "The AND Operation" → "The Block Size Method", new icon 🧱. 11 theory cards (was 7) walking through the 5-step method in the user-specified format: (1) intro card pitching block size as the fastest way vs binary ANDing; (2) the worked example setup (IP: 192.168.1.100 /26, goal: find network address); (3) **Step 1 — Find the mask** (/26 → 255.255.255.192, interesting octet = 4th); (4) **Step 2 — Find the block size** (256 − 192 = 64); (5) **Step 3 — Count the subnet starts** (0, 64, 128, 192 as a stacked `<code>` block); (6) **Step 4 — Find where 100 belongs** (0–63 / 64–127 ✅ / 128–191 / 192–255 as visible ranges with ✅ on the correct block); (7) **Step 5 — Take the starting number** → network = 192.168.1.64, with the "octets before copy, octets after become 0" rule explained; (8) bonus derivation of broadcast (next start − 1) + usable range; (9) a second worked example with the interesting octet in the 3rd position (10.50.173.45 /20 → 10.50.160.0) to force generalization beyond /26; (10) cheat-sheet `<table class="subnet-table">` with /24 through /30 mapped to mask last octet / block size / usable hosts (7 rows); (11) pro tip + mention that binary ANDing is the underlying operation but block size lets you skip it. **Prereq chain repair**: Lesson 5 (`net_broadcast`) previously chained off `and_operation`; its `prereq` field was updated to `block_size` so the Learn-tab sequencing is preserved. **Practice gate unchanged**: lesson keeps `practice: 'addressing'` so the 5-question gate still generates `find_subnet` / `find_broadcast` / `usable_first` / `usable_last` questions via `genSubnetQuestion('addressing', 'beginner')` — exactly the drill targets for the block size method. **AND Operation concept preserved elsewhere**: binary AND is still accessible inside the Practice-mode feedback for addressing questions via `stRenderBinaryBreakdown` (toggled by a `<details class="st-binary-details">` summary) — users who want to see the binary working can still get it on demand, just not as a Learn-tab lesson. **Minor data-loss note**: lesson progress is keyed by lesson id in `localStorage` (`SUBNET_LESSONS` key), so any existing completion of the old `and_operation` lesson becomes orphaned on upgrade — new lesson reads as "not yet completed." Acceptable because the new lesson is fundamentally different content. **UAT**: 8 new v4.43.6 assertions — new lesson id + title + `prereq: 'masks_cidr'` correctly declared, Lesson 5 (`net_broadcast`) now has `prereq: 'block_size'`, **regression guards** on old `"The AND Operation"` title and `id: 'and_operation',` in SUBNET_LESSONS (must stay gone), all 5 step labels present, worked-example numbers present (192.168.1.100 → 192.168.1.64), cheat-sheet table with /30 row present. Also updated the 2 existing version-string assertions (4.43.5 → 4.43.6). Total UAT: 2496 → **2504** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.43.6`. |
| v4.43.5 | **Exam-mode validation parity — same 4-layer pipeline + graceful degradation banner** — user-raised follow-up to v4.43.4 after noting the quiz-mode validation fix didn't apply to the 90-question exam simulator. Code audit confirmed: `startExam()` was shipping raw Haiku output concatenated across 5 batches of 18 with **zero validation** — no Sonnet semantic pass, no programmatic `validateQuestions` (with GT tables / keyword / numeric-option / reported-question guards). At 10–40% typical validation dropout, 9–36 of 90 exam questions could carry quality issues into the real simulator, poisoning (a) exam score (wrong-marked broken questions), (b) Readiness Score (exam attempts weighted 1.3×), (c) trust in the simulator vs the real CompTIA. **Fix — same pipeline as startQuiz, scaled to exam batches**: **(1) Constants**: `EXAM_BATCH_BASE = 18`, `EXAM_BATCH_BUFFER = 5` (~28% per-batch buffer). Initial generation: (18+5) × 5 = 115 for 90 delivered. **(2) Per-batch validation**: each batch runs through `aiValidateQuestions(key, rawBatch)` (Sonnet) then `validateQuestions(aiValidated)` (programmatic GT/keyword/numeric). Same 62.5% programmatic catch + Sonnet's semantic catch as quiz mode, regression-gated by `tests/validation-audit.js`. **(3) Per-batch retry-to-fill**: if `batch.length < EXAM_BATCH_BASE` after validation, fetch `deficit + EXAM_BATCH_BUFFER` more, validate, concat. ONE retry per batch (not a loop — cost-bounded). Wrapped in try/catch with `console.warn` so a transient API blip doesn't kill the whole exam. **(4) Slice + defensive final slice**: `batch.slice(0, EXAM_BATCH_BASE)` before concat; defensive `examQuestions.slice(0, EXAM_QUESTION_COUNT)` after injectPBQs. **(5) Graceful degradation banner (user direction: Option B)**: if final count < 90 after all batches + retries (rare — both rounds dropped heavily), exam still ships. New `showExamShortfallBanner(actualCount)` helper prepends a dismissible amber info banner to `#page-exam`: *"This exam has N of 90 questions — M were filtered out by the quality validator. Your score scales against the actual count, so the 720 pass mark stays accurate."* Scaling formula `Math.round(100 + (correct/total) × 800)` uses `total = examQuestions.length`, so 68/85 ≈ 740 same as 72/90. **UX during load**: per-batch labels show 3 states — "Batch 3 / 5 — generating…" → "Batch 3 / 5 — verifying…" → (if retry) "Batch 3 / 5 — filling 4 more…". Progress bar stays at 20% per completed batch. **Cost + time tradeoffs (user-approved: *"3 Mins is fine as the sonnet validator is what we need"*)**: load time ~60-90s → ~120-180s. Haiku tokens +30-60%, new Sonnet tokens ~$0.12. Total cost ~$0.22 → ~$0.42-$0.60 per exam. **Telemetry deferred to SaaS pivot** (user: *"Skip for now and wait for when we go SAAS Mode"*). **Not touched**: `injectPBQs` path (predefined bank, already good), `MAX_RETRIES = 2` fetch-on-throw retry (orthogonal, for network errors), scoring/scaling math (already correct for variable total). **UAT**: 16 new v4.43.5 assertions — constants declared in startExam body, over-request uses `EXAM_BATCH_BASE + EXAM_BATCH_BUFFER`, Sonnet `aiValidateQuestions(key, rawBatch)` called per batch, `validateQuestions(aiValidated)` per batch, retry-to-fill `if (batch.length < EXAM_BATCH_BASE)` block exists, retry fetches `deficit + EXAM_BATCH_BUFFER`, retry in try/catch with `retryErr`, `batch.slice(0, EXAM_BATCH_BASE)` truncates overage, defensive final `slice(0, EXAM_QUESTION_COUNT)`, banner wired via `if (examShortfall)`, helper function defined, `.exam-shortfall-banner` CSS + light-theme override present, **regression guards** on old `examQuestions.concat(batch)` (must stay gone) and old bare `BATCH_SIZE = 18`. All scoped via `_startExamBody` extraction. Also updated the 2 existing version-string assertions (4.43.4 → 4.43.5). Total UAT: 2479 → **2496** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.43.5`. |
| v4.43.4 | **Question-count bug fix — quizzes now always ship the qCount you picked** — user-reported bug via Recent Performance screenshot showing consistent under-delivery: a 10-question selection yielded 7/9, 4/8, 5/9, 4/7 across recent sessions (total ≠ 10). Root cause was in `startQuiz()` around line 1407: the pipeline asked Haiku for *exactly* `qCount` questions, then the 4-layer validation stack (prompt self-check → `aiValidateQuestions` → `validateQuestions` → `_groundTruthOk`) typically dropped 10–40%, and the retry logic **silently accepted the shortfall** as long as it was ≥ qCount/2 (comment: `// Acceptable shortfall — validation removed some; continue with what we have`). Only if dropout was severe (>50%) did it retry. That was wrong — the user explicitly picked 10, should always get 10. **Fix**: replaced the accept-shortfall branch with an **over-request + retry-to-fill** pattern. **(1) Over-request at initial fetch**: new `DROPOUT_BUFFER = Math.max(3, Math.ceil(qCount * 0.3))` — 30% buffer with a min of 3 to cover small-N cases (qCount=5 → +3, qCount=10 → +3, qCount=20 → +6). Initial `fetchQuestions(key, topic, diff, qCount + DROPOUT_BUFFER)` pulls 13 from Haiku for a 10-q quiz; after Sonnet validator + programmatic `validateQuestions`, typical landing is 10–12 remaining. **(2) Retry-to-fill if still short**: if `questions.length < qCount` after validation, compute `deficit = qCount - questions.length` and fetch `deficit + DROPOUT_BUFFER` more from Haiku, run through the same validation pipeline, concat. This is ONE retry, not a loop — keeps cost bounded even in pathological cases. **(3) Retry wrapped in try/catch**: if the retry fetch fails (API hiccup, network blip), ship what we have rather than erroring out — partial quiz is always better than a hard failure. `console.warn` logs the retry failure for observability. **(4) Final slice**: truncates any overage down to exact `qCount`. If still short after retry (both generations dropped heavily — rare on niche topics), ship what we have. **User-facing behavior**: loading message on retry is *"Generating N more to complete your qCount-question set…"* so the user sees the pipeline is actively filling. **Cost impact**: ~30% more Haiku tokens per quiz in the normal case (13 for a 10-q quiz). On the Haiku 4.5 pricing tier this is sub-cent per quiz — worth it for "user gets what they selected". **Exam mode NOT touched** — `startExam()` ships all 18 per batch × 5 = 90 without running through `validateQuestions` (separate known gap; exam has no validation pass). **`injectPBQs` also unaffected** — splices 1-for-1 so doesn't change count. **UAT**: 8 new v4.43.4 assertions — startQuiz body extractable (sanity), `DROPOUT_BUFFER` uses the exact `Math.max(3, Math.ceil(qCount * 0.3))` formula, initial fetch passes `qCount + DROPOUT_BUFFER`, retry-to-fill block exists, retry passes `deficit + DROPOUT_BUFFER`, retry wraps in try/catch with `retryErr`, **regression guard** on the old `// Acceptable shortfall` comment, **regression guard** on the old `length < Math.ceil(qCount / 2)` branch. All scoped via function-body extraction (`_startQuizBody`) so they don't accidentally match elsewhere. Also updated the 2 existing version-string assertions (4.43.3 → 4.43.4). Total UAT: 2471 → **2479** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.43.4`. |
| v4.43.3 | **Topology Builder toolbar polish — grid layout + Actions label + status row** — morning follow-up to v4.43.2 after user screenshot flagged the Topology Builder toolbar as bunched/uneven. Three symptoms: (1) Primary group (Grade / Coach / AI Generate) was the only one of 6 groups missing a `.tb-tool-group-label` — SIMULATE / PRACTICE / FILE / SCENARIO / UTILITY all had uppercase labels above their buttons, Primary didn't, causing vertical height mismatch with siblings. (2) `.tb-toolbar-v2` used `display: flex; flex-wrap: wrap` with `gap: 14px`. Each group has a different intrinsic width (Scenario's 9-option dropdown ≠ Simulate's 2 buttons ≠ Utility's 4 buttons), so wrap points were unpredictable; at common viewport widths the user saw 4 groups on top row + 2 groups on bottom row with an orphan-looking status strip. (3) Status text (`#tb-status`, "Drag a device from the palette →") used `margin-left: auto; align-self: center` which worked for single-row but when the toolbar wrapped the status landed on the bottom row with auto-margin pushing it to the right edge — visually disconnected. **Fixes**: **(a) HTML — added `<span class="tb-tool-group-label">Actions</span>` as the first child of Primary group** so all 6 groups share the same "label + buttons" structure. **(b) CSS — switched `.tb-toolbar-v2` from `flex-wrap` to `display: grid` with `grid-template-columns: repeat(auto-fit, minmax(150px, max-content))`, `column-gap: 24px`, `row-gap: 16px`, `align-items: start`**. Columns size by content but sit in a predictable grid; wraps cleanly at narrow viewports without orphan items. **(c) Dropped `border-right: 1px solid var(--surface3)` dividers on `.tb-tool-group`.** The old `:last-of-type { border-right: none }` rule worked for a single row, but at wrap boundaries the visually-last-in-row group kept its border, showing as an orphan stroke mid-layout. CSS can't target "last in visual row" with `auto-fit`, so the fix was to remove the dividers entirely and rely on `column-gap` for separation — cleaner anyway. **(d) HTML — moved `#tb-status` out of `.tb-toolbar-v2` into its own `.tb-toolbar-meta` strip** rendered below the toolbar. New `.tb-toolbar-meta` styles: `display: flex; align-items: center; padding: 0 14px 10px; min-height: 20px`. Status always has its own breathing room, never crowded against a button group regardless of wrap state. `tbUpdateStatus(msg)` is position-independent (just writes `.textContent` on the `#tb-status` element by ID) so no JS change needed. Primary group keeps its compact `.tb-tool-btn { height: 34px; font-weight: 600 }` rule to signal highest-impact. **UAT**: 7 new v4.43.3 assertions — Primary group has "Actions" label (regex scoped to the primary class), `.tb-toolbar-v2` uses `display: grid`, uses the exact `auto-fit minmax(150px, max-content)` column formula, **regression guard** on `border-right: 1px` inside `.tb-tool-group` (must stay gone — dividers caused the orphan-stroke issue), `.tb-toolbar-meta` wrapper div exists with `#tb-status` inside, `.tb-toolbar-meta` CSS is defined, **regression guard** on the old `.tb-toolbar-v2 .tb-status { margin-left: auto }` positioning (must stay gone). Also updated the 2 existing version-string assertions (4.43.2 → 4.43.3). Total UAT: 2464 → **2471** passing. Validation-audit regression gate still green. Cache bumped to `netplus-v4.43.3`. CI is currently broken on Playwright E2E timeouts (pre-existing, filed as [#152](https://github.com/oremosu98/networkplus-quiz/issues/152)) so this ship went via local `vercel --prod --yes` — same pattern as v4.43.2. Git push still happens so commit history stays in sync; prod auto-promotes. |

> **Older releases:** v4.38.3 and earlier (58 releases from v3.0 through v4.38.3) live in [CHANGELOG.md](./CHANGELOG.md) — archived during the v4.42.3 reorg when this table hit 69 rows and became hard to scan. The last 11 releases stay inline here for quick reference.


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
- Weekly cadence: **Tuesdays** for bugs, **Thursdays** for tech debt
- Tighten tech debt thresholds as debt is paid down

### Feature Ideas tracker
- [Board #2](https://github.com/users/oremosu98/projects/2) — future feature candidates only
- Label: `feature-idea` (purple)
- Priority field: 🔥 Must Have, ⭐ Should Have, 💡 Nice to Have, 🧊 Someday
- Effort field: XS / S / M / L / XL
- Tie-in field: Cert SaaS Vision / Quiz App Only / Both
- Tied to product vision doc at `~/Desktop/Dev Projects/product-vision/PRODUCT-VISION.md`
- Weekly cadence: **Fridays** for shipping features — pull a `🔥 Must Have` or `⭐ Should Have`, ship end-to-end same day (code → UAT → version bump → CLAUDE.md row → push → green-light verify). Don't start anything that can't realistically ship the same Friday; split larger ideas across multiple Fridays.
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
- **Tuesdays** — bug fixes (Board #1, `bug` label)
- **Thursdays** — tech debt (Board #1, `tech-debt` label; automated sweep also scheduled)
- **Fridays** — features (Board #2, pull a `🔥 Must Have` or `⭐ Should Have`, ship end-to-end same day). **Don't start anything that can't realistically ship the same Friday** — split larger ideas across multiple Fridays.

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
