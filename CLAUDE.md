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
| `app.js` | All app logic — state, AI calls, rendering, game loops, analytics, 5 activity sub-systems | **~1.54 MB / 26,127 lines** |
| `styles.css` | Full dark/light theme styling + `@media (prefers-reduced-motion)` gate | ~455 KB / 10,878 lines |
| `sw.js` | Service worker (stale-while-revalidate, shell-asset precache, 60-entry LRU cap) | 73 lines |
| `manifest.json` | PWA manifest | 646 B |
| `vercel.json` | Vercel config (minimal) | 806 B |
| `tests/uat.js` | UAT suite — **3,502 assertions** as of v4.56.0, embeds validation-audit gate | 6,674 lines |
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

**Jason Dion Method (recalibration loop)**: when user takes a legally-purchased practice test, they share gap topics **in their own words only** → Claude authors 3–5 new exemplars per gap → ships as Phase 3 Cycle N. Quarterly cadence, ~3 hrs per cycle. Never ingest paid content. See `~/.claude/projects/-Users-simioremosu-Desktop/memory/reference_jason_dion_method.md` for the full process.

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
- `tbProcessCliCommand(dev, cmd)` — 452-line if/else chain, flagged in [#126](https://github.com/oremosu98/networkplus-quiz/issues/126).
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

**Search before adding tests.** Suite is at 3,502 assertions; duplicates slip in easily.

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

## Test Suite
```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"

node tests/uat.js                # UAT (3,502 assertions; embeds validation-audit gate)
node tests/tech-debt.js          # CI thresholds — long-function count, LOC, globals
node tests/validation-audit.js   # 20-Q broken-corpus fixture, ≥60% catch / 0 FP
node tests/deploy-verify.js      # Post-deploy smoke against prod
npx playwright test              # E2E (tests/e2e/app.spec.js)
```

`tests/tech-debt.js` runs in CI on every push — breaches auto-file issues on [Board #1](https://github.com/users/oremosu98/projects/1) with `tech-debt` + `priority: medium` labels. Scheduled weekly sweep on Thursdays.

## Version History

> **Older releases** (v3.0 through v4.58.1 — 112 rows) live in [CHANGELOG.md](./CHANGELOG.md). The last 11 releases stay inline here for quick reference. Reorg established during the v4.42.3 maintenance pass; re-trimmed in the v4.52.0, v4.54.1, v4.54.13, v4.56.0-morning, and v4.59.6 Road-to-200 consolidations when inline grew past 11.

| Version | Features Added |
|---|---|
| v4.59.6 | **🏁 ROAD TO 200 COMPLETE — curated exemplar bank at 200/200** — final batch of the user-sequenced expansion (v4.59.4/5/6 = +66 exemplars across 3 ships). Bank grows 178 → 200, and the domain distribution now aligns with CompTIA N10-009 blueprint weights: **D1 46 (23%) / D2 40 (20%) / D3 38 (19%) / D4 28 (14%) / D5 48 (24%) = 200**. Batch 6 spread: **D1 +6, D2 +4, D3 +4, D4 +0, D5 +8**. **D1 (+6)**: DoH vs DoT (DNS privacy over HTTPS/443 vs dedicated 853), SNMP ports 161/162 pairing, Telnet 23 vs SSH 22 cleartext/encrypted contrast, VXLAN overlay (24-bit VNI, L2-over-L3 for DC fabric), SPF+DKIM+DMARC TXT-record email-auth triad, container networking via Linux network namespaces + veth pairs. **D2 (+4)**: OSPF stub areas (block Type 5 LSAs, ABR injects default route), Q-in-Q 802.1ad double-tagging for SP Ethernet, Root Guard vs BPDU Guard distinction (allow BPDUs but block root-takeover), WPA2-PSK vs WPA2-Enterprise (shared passphrase vs per-user 802.1X/EAP). **D3 (+4)**: ITIL change categories (standard/normal/emergency), SLA uptime math (99.9% = 8.76 hrs/yr, each extra 9 shrinks by 10x), vulnerability scan vs pen test vs red team vs audit, capacity planning / trend analysis for growth projection. **D5 (+8)**: MAC flap / table thrashing as L2-loop fingerprint, rogue DHCP server defended by DHCP Snooping, duplicate IP address conflict from manual static-IP reuse, NIC teaming LACP failover masked by intermediate device, dirty fiber connector as #1 cause of patch-panel loss spikes, iperf/iperf3 as the standard bandwidth-test tool, interface counter input-drops vs CRC errors dual-root-cause diagnosis, Wi-Fi SNR ≥25 dB threshold for reliable high-throughput operation. **Distribution across 22**: 2 Foundational / 17 Exam Level / 3 Hard. Split: 7 recall / 15 scenario (32/68). **Legal boundary preserved throughout all 200**: every exemplar original content authored from the public N10-009 blueprint; zero paid-bank (Jason Dion / CertMaster / Myers / Kaplan) ingestion across the entire marathon. **UAT**: bumped count 178→200, updated all 5 per-domain count assertions (D1 40→46, D2 36→40, D3 34→38, D4 28 unchanged, D5 40→48), sum invariant →200 with ROAD TO 200 COMPLETE callout, version strings 4.59.5→4.59.6. Total UAT: **3698 passing**. Playwright: **64/64** green. Validation-audit regression gate still green. Cache: `netplus-v4.59.6`. ~600 LOC (all content). **49th ship**. **Cumulative 3-batch arc (v4.59.4/5/6)**: 66 new exemplars shipped in one session, bank 134 → 200 = +49%. **Cumulative since Phase 2 start (v4.58.1)**: 186 curated exemplars across 49 ships, bank 14 → 200. Every single question Haiku now generates is anchored against 3 exemplars drawn from this 200-bank as style targets. Final state covers all 5 CompTIA domains + every major sub-objective 1.1 through 5.5. **Lesson captured**: Path B per-batch review workflow scales well — same-day delivery across 6 batches of 20-22 each, never a quality regression, user approved every batch after brief topic preview. Per-batch Chrome verification not necessary for pure-content additions; UAT + Playwright sufficient when the change is additive data. Resting now. |
| v4.59.5 | **Road-to-200 Batch 5 of 3 — bank 156 → 178 (+22)** — middle batch of the 3-ship expansion to 200. D4 sits out this round (already at target 28); extra weight goes to D5 where 24% of the N10-009 exam lives. Batch 5 spread: **D1 +5, D2 +5, D3 +5, D4 +0, D5 +7**. **D1 (+5)**: DNSSEC chain validation (root trust anchor → DS → DNSKEY → RRSIG), CIDR aggregation (four contiguous /24s → /22), MTU vs MSS (1500 − 40 = 1460 on std Ethernet+IPv4+TCP), DHCP T1/T2 renewal timers (50% → 87.5% → full expiry), CIDR-to-dotted-decimal conversion (/27 = 255.255.255.224). **D2 (+5)**: Cat5e/6/6A cable categories (Cat6A is min for 100m 10GBASE-T), fiber connectors (LC is modern duplex SFF), SFP+ vs QSFP+ vs QSFP28 transceivers (40G/100G in one port), physical topologies (star is dominant LAN), predictive wireless site survey with RF modelling software. **D3 (+5)**: sFlow statistical sampling for high-speed (400G+) interfaces vs full NetFlow, jump server / bastion host for centralised admin access, SIEM log aggregation + correlation + alerting, NFS vs SMB file shares, IPAM platform for centralised subnet/DHCP/DNS tracking. **D5 (+7)**: cable certifier vs qualifier vs verifier tier, OTDR fiber fault localisation over long distance, dig vs nslookup tooling, `route print`/`ip route`/`netstat -rn` routing-table inspection, duplex mismatch (late collisions as the fingerprint), asymmetric routing breaking stateful firewalls, MTU black hole from filtered ICMP Type 3 Code 4. **Distribution across 22**: 2 Foundational / 17 Exam Level / 3 Hard. Split: 8 recall / 14 scenario (36/64). **Legal boundary preserved**: all original content from public N10-009 blueprint; zero paid-bank ingestion. **UAT**: bumped count 156→178, updated all 5 per-domain count assertions (D1 35→40, D2 31→36, D3 29→34, D4 28 unchanged, D5 33→40), sum invariant →178, version strings 4.59.4→4.59.5. Total UAT: **3698 passing**. Playwright: **64/64** green. Cache: `netplus-v4.59.5`. ~600 LOC (all content). **48th ship**. One batch left: Batch 6 brings bank to 200, hits CompTIA-weight target distribution. |
| v4.59.4 | **Road-to-200 Batch 4 of 3 — bank 134 → 156 (+22)** — user asked to push the curated bank to 200 as the final round. Planned 3 batches of 22, distribution chosen to align the final 200-exemplar bank with CompTIA blueprint weights (23/20/19/14/24). Batch 4 spread: **D1 +5, D2 +5, D3 +4, D4 +3, D5 +5**. **D1 (+5)**: anycast vs multicast/broadcast/unicast, DHCP relay (ip helper-address), RFC 1918 private ranges, NAT64 + DNS64 IPv6 transition, Infrastructure as Code. **D2 (+5)**: Rapid PVST+ vs MSTP CPU tradeoff, EIGRP unequal-cost load balancing via variance, Wi-Fi 6E 6 GHz band, switch stacking (StackWise/IRF), FHRP (HSRP/VRRP/GLBP). **D3 (+4)**: SNMPv3 USM auth/priv, traffic shaping vs policing at edge, change management rollback plan, CMDB asset inventory. **D4 (+3)**: 802.1X EAP port-based auth vs port security, pretexting social engineering, CRL vs OCSP certificate revocation. **D5 (+5)**: EMI vs attenuation vs crosstalk root-cause, bandwidth/throughput/goodput distinction, co-channel interference with strong RSSI, broadcast storm from L2 loop, split-horizon routing loop. **Distribution across 22**: 1 Foundational / 17 Exam Level / 4 Hard. Split: 5 recall / 17 scenario (23/77 — most scenario-heavy batch yet). **Legal boundary preserved**: all original content from public N10-009 blueprint. **UAT**: bumped count 134→156, updated all 5 per-domain count assertions (D1 30→35, D2 26→31, D3 25→29, D4 25→28, D5 28→33), sum invariant →156, version strings 4.59.3→4.59.4. Total UAT: **3698 passing**. Playwright: **64/64** green. Cache: `netplus-v4.59.4`. ~600 LOC (all content). **47th ship**. Batches 5 + 6 queued: target end state D1 46 / D2 40 / D3 38 / D4 28 / D5 48 = 200 total, aligned to CompTIA weights. |
| v4.59.3 | **Path B Volume Expansion — Batch 3 of 3 (FINAL) shipped (bank 114 → 134)** — closes out the user-approved 60-exemplar volume expansion that started with v4.59.1. Final 20 exemplars spanning all 5 domains equally (+4 each). **Content highlights**: D1 adds **TCP vs UDP, TCP/IP model-to-OSI mapping, /23 subnet math for 450 hosts, IoT VLAN segmentation with egress ACLs**. D2 adds **native VLAN mismatch symptoms, BPDU Guard err-disable, BGP Local Preference for outbound path selection, voice VLAN/auxiliary VLAN with daisy-chained phone + PC**. D3 adds **physical vs logical network diagrams, ASHRAE TC 9.9 environmental monitoring, tabletop DR exercise, SASE convergence (SD-WAN + SWG + CASB + ZTNA)**. D4 adds **Kerberos KDC + AS + TGS ticket flow, zero-trust never-trust-always-verify, NGFW app-aware + TLS-inspection + integrated IPS, spear phishing / BEC executive impersonation**. D5 adds **telnet/nc port test vs ping, TDR cable fault localisation, TLS 1.3 inspection breaking pinned-cert legacy apps, QoS/LLQ vs link upgrade for bursty VoIP jitter**. **Distribution across 20**: 2 Foundational / 14 Exam Level / 4 Hard. Split: 5 recall / 15 scenario (25/75 — most scenario-heavy batch yet, deliberately tilted toward the real N10-009 question style). **Legal boundary preserved**: all original content authored from the public N10-009 blueprint; zero paid-bank content ingested. **UAT**: bumped count 114→134, updated all 5 per-domain count assertions (D1 26→30, D2 22→26, D3 21→25, D4 21→25, D5 24→28), sum invariant →134, version strings 4.59.2→4.59.3. Total UAT: **3698 passing**. Playwright: **64/64** green. Cache: `netplus-v4.59.3`. ~600 LOC (all content). **46th ship**. **Cumulative Path B expansion**: 60 new exemplars across 3 ships (v4.59.1/2/3) grew the bank from 74 → 134 = +81%. Final distribution: D1 30 / D2 26 / D3 25 / D4 25 / D5 28 — hits user's target ratio very closely to CompTIA domain weights (23/20/19/14/24). Every Haiku generation from this point forward pulls from a 134-exemplar bank. Lesson: Path B's per-batch review cadence (20 at a time, ~10 min per review) was the right friction level — enough quality control to catch drift early, light enough to keep momentum across same-day shipping. |
| v4.59.2 | Volume Expansion Batch 2 — 20 new exemplars (bank 94 → 114) |
| v4.59.1 | **Path B Volume Expansion \u2014 Batch 1 of 3 shipped (bank 74 \u2192 94)** \u2014 user opted to grow the bank further with lightweight-review workflow after I pushed back against unreviewed bulk generation. Delivered 20 new exemplars spanning all 5 domains (5/4/4/3/4). **Content highlights**: D1 adds **DNS A vs AAAA, DHCP options 66/67 for VoIP/PXE, IPv6 SLAAC, load balancer least-connections, hybrid cloud deployment**. D2 adds **OSPF DR/BDR election, port security sticky MAC, SMF vs MMF fibre selection, WPA2 vs WPA3 SAE difference**. D3 adds **LLQ strict-priority queuing, incremental vs differential backups, hot/warm/cold DR sites, UPS+generator power protection**. D4 adds **RADIUS vs TACACS+ differences, evil twin wireless attack, principle of least privilege**. D5 adds **tone generator + inductive probe, top-down vs bottom-up troubleshooting, Wi-Fi dBm signal strength thresholds, Cisco `show interfaces`**. **Distribution across 20**: 3 Foundational / 13 Exam Level / 4 Hard. Split: 7 recall / 13 scenario (35/65). **Legal boundary preserved**: all original content. **UAT whitelist fix**: 3 Domain 2 topics (`Cabling & Topology`, `Ethernet Basics`, `Integrating Networked Devices`) were in TOPIC_DOMAINS but missing from the UAT whitelist; added in this ship so the fibre-type exemplar validates cleanly. **UAT**: bumped count 74\u219294, extended D2 topic whitelist, updated all 5 per-domain count assertions (D1 16\u219221, D2 14\u219218, D3 13\u219217, D4 14\u219217, D5 17\u219221), sum invariant \u219294. Total UAT: **3698 passing**. Playwright: **64/64** green. Cache: `netplus-v4.59.1`. ~400 LOC (all content). **45th ship**. Batches 2 + 3 still to come (20 each). Final target: 134. |
| v4.59.0 | **Phase 3 Recalibration Cycle 1 \u2014 gap-coverage from real practice test** \u2014 same-day kickoff of Phase 3 right after completing Phase 2. User took their first full Jason Dion N10-009 practice exam (67/90 = 74.44%) and shared the domain breakdown: **Domain 1 Concepts 90%, Domain 3 Ops 82%, Domain 4 Security 75%, Domain 2 Implementation 67%, Domain 5 Troubleshooting 64%** \u2014 plus 14 specific topics they had never seen before. Per the Phase 3 plan in #193 (quarterly recalibration against legally-purchased practice tests), these gaps become Cycle 1\u2019s targeted exemplar additions. **Legal boundary preserved**: user described gap topics in their own words only (Powerload / NTS / NAC / Preaction / WAP channels / NMAP / Tored / Full tunnel / Split tunnel / Direct tunnel / Clientless / Class of service / RAID / PCAP) \u2014 zero Dion question content ingested. Every gap-coverage exemplar is original, authored from the public N10-009 blueprint. **14 new exemplars in 3 clusters**: **Cluster 1 VPN types (4)**: Full tunnel, Split tunnel, Clientless SSL VPN, Site-to-site. **Cluster 2 Rare N10-009 niche (5)**: NTS RFC 8915, Teredo RFC 4380, Nmap, PCAP file format, Pre-action fire suppression. **Cluster 3 Blueprint coverage gaps (5)**: NAC posture assessment, CoS (802.1p Layer 2 QoS), RAID 5 level identification, 2.4 GHz channels 1/6/11, 802.3bt PoE++ Type 3/4 power classification. **Per-domain adds**: D1 +2 (NTS, Teredo) \u2192 16, D2 +2 (WAP channels, 802.3bt) \u2192 14, D3 +2 (CoS, RAID) \u2192 13, D4 +6 (4 VPN types + Pre-action + NAC) \u2192 14, D5 +2 (Nmap, PCAP) \u2192 17. **Bank grows 60 \u2192 74**. Distribution across 14: 1 Foundational / 10 Exam Level / 3 Hard. Split: 6 recall / 8 scenario (43/57). **Integration**: `_pickExemplarsForTopic` now returns exemplars that directly target these real exam gaps. When the user selects "IPsec & VPN Protocols" or "SSL/TLS VPN" on the home page, every generation call pulls from a pool that includes the 4 VPN-type exemplars as quality references. **UAT**: bumped count check 60\u219274, updated all 5 per-domain count assertions to new values, updated sum invariant to 74. Legacy topic whitelist + field validation still pass unchanged. Updated 2 version strings. Total UAT: **3698 passing** (count unchanged because structural checks scale with the bank). Playwright: **64/64** green. Validation-audit regression gate still green. Cache: `netplus-v4.59.0`. ~400 LOC (all content). **44th ship**. **Lesson captured for future Phase 3 cycles**: real-test gap data \u2192 targeted exemplar cluster authoring is repeatable and effective. Quarterly cadence = sustainable. Next Phase 3 cycle: when user takes their second practice test. |
| v4.58.5 | **\ud83c\udf89 CURATED EXEMPLAR BANK COMPLETE (60/60)** \u2014 Domain 5.0 Network Troubleshooting shipped (15 new exemplars), completing the Phase 2 target from issue #193 in a same-day marathon. Bank now **100% of target + 100% exam-weight coverage**. **Domain 5.0 content**: 7-step methodology (step 1 + step 4) / cable fault substitution-test / DNS resolution diagnosis / TCP window + BDP on high-latency WAN / service-specific HTTP crash / traceroute path tool / Wireshark packet capture / ipconfig /all / duplex mismatch + CRC errors / APIPA diagnosis / ICMP Echo Request Type 8 / VoIP jitter 30 ms tolerance / DHCP scope exhaustion / T568A/B crossover pinout / plan-of-action step. **Distribution**: 2 Foundational / 11 Exam Level / 2 Hard. Split: **5 recall / 10 scenario (33/67 \u2014 scenario-heavy by design)** since Troubleshooting is inherently about reading symptoms and diagnosing. User approved full 15-exemplar batch in single review pass. **Integration**: `_pickExemplarsForTopic` now returns real exemplars for every CompTIA domain without any fallback gaps. Same-domain fallback covers 100% of N10-009 exam content. **Final cumulative bank stats**: 60 exemplars across 31 distinct topics spanning all 5 CompTIA domains + sub-objectives 1.1-5.5. Distribution across 60: **8 Foundational + 35 Exam Level + 17 Hard**. Split: **33 recall / 27 scenario** (55/45 overall). **Legal boundary preserved throughout all 5 domains** \u2014 every exemplar original content authored from the public N10-009 blueprint; zero paid-bank content ingested. User fact-checked every answer across all 60 before commit. **UAT**: bumped count check 45\u219260, extended topic whitelist with 6 Domain 5 topics, added `Domain 5.0 count === 15` sanity + `sum === 60` invariant, raised topic-coverage floor \u226528 \u2192 \u226530. Updated 2 version strings. Total UAT: 3696 \u2192 **3698** passing. Playwright: **64/64** green. Validation-audit regression gate still green. Cache: `netplus-v4.58.5`. ~400 LOC (all content). **43rd ship**. **Phase 2 complete.** Next: Phase 3 recalibration (quarterly, ~3 hrs each cycle) when user takes real practice tests and identifies coverage gaps. **Cumulative 4-day achievement**: started v4.56.0 Sunday with the prototype scenario field, ended Monday night with a 60-exemplar curated bank backing every question Haiku generates. |
| v4.58.4 | **Curated exemplar bank: Domain 4.0 Network Security shipped (8 new, bank now 45/60 = 75%)** \u2014 8 exemplars covering CIA triad / AAA framework / MFA factor categories / IPsec Tunnel+ESP / PKI chain of trust / firewall rule order / ARP poisoning MITM / physical security controls. User approved the full batch in a single review pass. **Content coverage** spans all 5 Domain 4 sub-objectives (4.1 security concepts, 4.2 attacks, 4.3 hardening, 4.4 VPN/MFA, 4.5 physical). **Distribution**: 2 Foundational / 5 Exam Level / 1 Hard. Split: 4 recall / 4 scenario (50/50). **Legal boundary preserved**. **Integration**: `_pickExemplarsForTopic` now returns exemplars for every Domain 4 topic. **Cumulative bank impact**: 45/60 = 75% of target, covering 76% of the exam by CompTIA weight (Domains 1+2+3+4 = 23+20+19+14 = 76%). Remaining: Domain 5.0 Troubleshooting (15 exemplars, 24% weight) \u2014 drafting next, shipping same session. **UAT**: bumped count check 37\u219245, extended topic whitelist with 11 Domain 4 topics (including unused ones like SSL/TLS VPN + IPsec VPN + Protecting Networks kept in whitelist for future-proofing), added `Domain 4.0 count === 8` sanity, raised topic-coverage floor \u226522 \u2192 \u226528. Updated 2 version strings. Total UAT: 3695 \u2192 **3696** passing. Playwright: **64/64** green. Validation-audit regression gate still green. Cache: `netplus-v4.58.4`. ~210 LOC (all content). **42nd ship**. Next: Domain 5.0 Troubleshooting immediately. |
| v4.58.3 | **Curated exemplar bank: Domain 3.0 Network Operations shipped (11 new, bank now 37/60 = 62%)** \u2014 same-session continuation after user shared first Jason Dion practice test result (67/90 = 74.44%, borderline pass territory, good signal). Path B workflow: 4 calibration exemplars (SNMPv3 / Syslog severity scale / RPO vs RTO / SD-WAN vs MPLS) then single batch of 7 covering NetFlow vs packet capture / HA active-active / MPLS WAN / out-of-band management / change management / MTBF-MTTR / network baseline. **Content coverage** (11 exemplars across 5 Domain 3 topics + sub-objectives 3.1/3.2/3.3/3.5): **3.1 Organizational processes** (HA model + change management), **3.2 Monitoring** (SNMP versions + syslog severity + NetFlow + baseline), **3.3 Disaster recovery** (RPO vs RTO + MTBF vs MTTR), **3.5 Access/management methods** (SD-WAN + MPLS + out-of-band). **Distribution**: 2 Foundational / 7 Exam Level / 2 Hard. Split: 7 recall / 4 scenario (64/36 \u2014 right on target). **Legal boundary preserved throughout**. Every exemplar original; user fact-checked every answer (explicit callouts on syslog-severity-inversion, RPO/RTO direction, active-active vs hot-standby, MTBF/MTTR distinction). **Integration**: `_pickExemplarsForTopic` now returns exemplars for every Domain 3 topic. **Cumulative bank impact**: 37/60 exemplars = 62% of target, covering 62% of the exam by CompTIA weight (Domain 1 at 23% + Domain 2 at 20% + Domain 3 at 19%). Haiku generation across these three domains now anchored against a curated style bar. Remaining: Domain 4 Security (8, 14% weight) + Domain 5 Troubleshooting (15, 24% weight). **UAT**: bumped count check 26\u219237, extended topic whitelist with 7 Domain 3 topics, added `Domain 3.0 count === 11` sanity assertion, raised topic-coverage floor \u226518 \u2192 \u226522. Updated 2 version strings. Total UAT: 3694 \u2192 **3695** passing. Playwright: **64/64** green. Validation-audit regression gate still green. Cache: `netplus-v4.58.3`. ~280 LOC (all content). **41st ship**. Next: Domain 4.0 Security (8 exemplars) when ready. |
| v4.58.2 | **Curated exemplar bank: Domain 2.0 Network Implementation shipped (12 new, bank now 26/60)** \u2014 user + assistant continued the Phase 2 authoring session same day as v4.58.1. Same Path B workflow: 4 calibration exemplars (VLAN Trunking / STP port states / OSPF backbone / Ethernet Standards) for style alignment, then a single larger batch of 8 after full approval covering LACP link aggregation / PoE standards / 802.11ax Wi-Fi 6 / WPA3 SAE / static-vs-dynamic routing / BGP multihomed peering / spine-leaf data centers / SDN control-data plane separation. **Content coverage** (12 exemplars, 10 distinct topics across all 4 Domain 2 sub-objectives + SDN-1.8): **2.1 Switching** (VLAN Trunking + STP + LACP + spine-leaf), **2.2 Routing** (OSPF backbone + static-vs-dynamic + BGP multihomed), **2.3 Ethernet devices** (1000BASE-T + PoE 802.3at), **2.4 Wireless** (Wi-Fi 6 + WPA3 SAE), **1.8 Modern environments** (SDN control/data plane). **Distribution matches plan**: 2 Foundational / 7 Exam Level / 3 Hard. Split: 6 short-recall / 6 scenario-framed (50/50 \u2014 slightly more scenario-heavy than Domain 1's 57/43, appropriate for an Implementation-focused domain where configuration scenarios are the natural default). **Legal boundary preserved**: zero paid-bank content ingested. All 12 exemplars original content, authored from the public N10-009 blueprint. User fact-checked every answer. **Integration**: `_pickExemplarsForTopic` now returns exemplars for any Domain 2 topic (OSPF, BGP, VLAN Trunking, STP, Wireless, Ethernet, etc.) in addition to Domain 1. Same-domain fallback now covers both the concepts and implementation domains, meaningfully raising the quality bar on Haiku's generation for ~43% of the exam by domain weight (23% + 20%). **UAT**: bumped count check 14\u219226, loosened `addedVersion` from literal `'4.58.1'` to valid-semver regex (`/^\\d+\\.\\d+\\.\\d+$/`) so the bank keeps passing as later ships add exemplars, generalised the topic whitelist to cover both Domain 1.0 and 2.0 (20 topics total), added 2 Domain-split sanity assertions (`Domain 1.0 count === 14`, `Domain 2.0 count === 12`). Topic-coverage assertion raised from \u226510 to \u226518. Updated 2 version strings. Total UAT: 3692 \u2192 **3694** passing. Playwright: **64/64** green. Validation-audit regression gate still green. Cache: `netplus-v4.58.2`. ~350 LOC (almost all content). **40th ship**. **Progress**: 26/60 exemplars (43%), representing 43% of exam weight (Domain 1 at 23% + Domain 2 at 20%). Next: Domain 3.0 Operations (11 exemplars, 19% weight) when user is ready. |

> **Older releases** (v3.0 through v4.58.1, 112 rows) live in [CHANGELOG.md](./CHANGELOG.md). The last 11 releases stay inline here for quick reference.


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
