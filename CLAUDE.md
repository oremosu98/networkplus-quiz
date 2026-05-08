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

- **Storage** (Phase C′ post-v4.89.0): cloud-canonical with localStorage as ephemeral session cache.
  - **Source of truth** = Supabase (`profiles.metadata` jsonb + `quiz_history` table). Survives device wipes, browser changes, localStorage corruption.
  - **Session cache** = localStorage via `STORAGE.*` namespace (existing 186 read sites unchanged — reads stay synchronous + fast).
  - **Write path**: localStorage write → `_cloudFlush(STORAGE.X)` → 1500ms debounced batch write to cloud.
  - **Hydrate path**: SIGNED_IN → `cloudStore.hydrate()` → cloud → localStorage → app proceeds normally.
  - **Anonymous users** still get the full app via localStorage only (cloud-store no-ops).
  - **Cross-subdomain session** = cookie-backed Supabase storage adapter writes to `Domain=.certanvil.com` (v4.89.8) so any `*.certanvil.com` subdomain sees the same session automatically.
  - See [memory: Phase C′ Cloud-First](~/.claude/projects/-Users-simioremosu-Desktop/memory/reference_phase_c_prime_cloud_first.md) for full architecture + cross-project lessons.
- **Hosting**: Vercel — `networkplus.certanvil.com` (Network+ prod) + `secplus-quiz-sable.vercel.app` (Security+ private builder) + `certanvil.com` (landing, separate Vercel project).
- **Offline**: Service worker with stale-while-revalidate caching + Supabase API hostname pass-through (v4.89.3) + auto-reload-on-update plumbing (v4.89.2 — controllerchange + postMessage broadcast + 60s update poll, no more manual cache-clear after deploys). **Cache name MUST bump every deploy** — use `bump-version.js`, never hand-edit partial.
- **PWA**: `manifest.json`, installable on mobile

## Files
| File | Purpose | Size |
|---|---|---|
| `index.html` | All page structures (30+ pages: setup, quiz, exam, results, review, subnet, ports, drills launcher, topology, analytics, progress, guided labs, …) | ~115 KB |
| `app.js` | All app logic — state, AI calls, rendering, game loops, analytics, 5 activity sub-systems, cloud-flush hooks | **~2.0 MB / ~32K lines** |
| `styles.css` | Full dark/light theme styling + account pill + cert switcher + `@media (prefers-reduced-motion)` gate | ~485 KB |
| `sw.js` | Service worker — stale-while-revalidate, shell-asset precache, 60-entry LRU cap, Supabase API pass-through, auto-update broadcast | ~120 lines |
| **`lib/supabase.js`** | **Phase C′** — Supabase client init with cookie-backed storage adapter (cross-subdomain session sharing) | ~150 lines |
| **`lib/supabase-umd.min.js`** | **v4.89.1** — vendored Supabase UMD bundle (was cdn.jsdelivr; vendored after intermittent 503 broke auth) | 197 KB |
| **`cloud-store.js`** | **Phase C′** — debounced cloud flush queue + `hydrate()` + `clearLocalCache()` + `migrateLocalToCloud()` + status-listener API | ~440 lines |
| **`auth-state.js`** | **Phase C′** — account pill + dropdown + auth state machine + sync-status updater + cert switcher | ~390 lines |
| **`migration.js`** | **Phase C′** — one-time builder import banner (reads localStorage stats, bulk-uploads to cloud, sets `migration_v1_at` flag) | ~290 lines |
| **`certs/netplus.js`** + **`certs/secplus.js`** | **v4.86–4.87** — cert pack data (topic catalog, GT tables, exemplars, Phase 3 retention concepts). Loaded before app.js per script-tag order in index.html | netplus ~400 KB, secplus growing |
| **`landing/`** (separate Vercel project) | certanvil.com landing — `index.html` + `auth.js` + `script.js` + `lib/supabase.js` + `sw.js` (kill-switch) + `og-image.svg` + `pricing.html` + `api/notify.js` (Resend) | — |
| **`supabase/migrations/`** | Schema migrations — `20260506_phase_c_prime.sql` adds `profiles.role` + `is_admin()` + RLS updates | — |
| `manifest.json` | PWA manifest | 646 B |
| `vercel.json` | Vercel config (minimal) | 806 B |
| `tests/uat.js` | UAT suite — **5,100 assertions** as of v4.89.8, embeds validation-audit gate | ~16K lines |
| `tests/tech-debt.js` | CI thresholds: long-function count, LOC, global count, etc. | 131 lines |
| `tests/validation-audit.js` | 23-Q broken-corpus regression fixture (60% catch floor, 0 FP ceiling) | 589 lines |
| `tests/deploy-verify.js` | Post-deploy smoke against prod (comment-strip fix v4.89.9 / dc844a2) | 335 lines |
| `tests/e2e/app.spec.js` | Playwright E2E (99 tests as of v4.89.x) | — |

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

> **Older releases** (v3.0 through v4.92.0 — 241 rows) live in [CHANGELOG.md](./CHANGELOG.md). Inline here: just the **last 3 ships**. Most recent trim during the **v4.95.0 memory + docs consolidation** (2026-05-08) — 6 rows moved to CHANGELOG (v4.90.0 → v4.92.0) and the v4.89.0-8 Phase C′ cluster summary row dropped (per-version detail already in CHANGELOG; architecture + lessons in [memory](~/.claude/projects/-Users-simioremosu-Desktop/memory/reference_phase_c_prime_cloud_first.md)).

| Version | Features Added |
|---|---|
| v4.98.1 | **🎣 Phishing Triage Lab — Sec+ flagship #2 · Batch 2 of 4.** Bank grows to 16 phish (6 → 16); smishing variant ships with native-feeling phone-frame UI. **4 new email phish** — `docusign-contract` (★★) brand-impersonation classic with HTM attachment trap · `github-security-alert` (★★) dev-targeted credential harvest with foreign-location fear cue · `aws-account-suspended` (★★) cloud-admin targeting with permanent-data-loss threat · `hr-benefits-enrolment` (★ Foundational) HR portal credential phish, the easy entry-point. **6 new SMS phish (smishing variant)** — `bank-fraud-smish` (★★, the canonical from mockup state 5) with reply-keyword + bit.ly + 30-min deadline · `package-delivery-smish` (★) USPS impersonation with vague-reason + tinyurl · `irs-refund-smish` (★) government-impersonation phish with the absolute-rule callout (**IRS NEVER contacts via SMS** — any SMS = 100% phish) · `ms-2fa-smish` (★★, locked behind bank-fraud-smish) MFA-fatigue scam asking user to forward 2FA code with self-contradicting "for your security, do not share" framing — critical "**NEVER share 2FA codes**" rule · `apple-id-locked-smish` (★) lookalike-domain credential harvest · `verizon-billing-smish` (★★) telco-impersonation with specific overcharge amount. **Bank growth**: 6 → 16 phish (+10) · 41 → 96 flags (+55) · 4 → 5 lesson cards (+1 smishing). **Smishing UI** — native-feeling phone-frame mock with iPhone-style status bar (9:14 AM · 5G), app header showing sender ID (which is itself a click-tagged flag), SMS bubble with click-to-tag flag spans, and a separate Decision panel + smishing-flags-to-watch reference panel on the right. Click-to-tag works on phone-frame flags (different selector path: `.pht-phone-msg-bubble .flag` + `.pht-phone-app-h-name .flag`). New `phtRenderSmsClient()` function dispatches from `phtStartScenario()` via `if (scen.vector === 'sms')`. Vector filter on the home screen now shows email + SMS as live (not "soon") via `liveVectors = ['email', 'sms']` array. Vishing + quishing land v4.98.2. **Smishing lesson card** — 8 vector-specific tells (custom sender ID, shortened URLs, reply-keyword fishing, tight deadlines, callback-number-not-on-card, IRS-never-SMSes rule, NEVER-share-2FA rule, defense via 7726 + official app). Different shape from email anatomy — these tells don\'t apply to email phish. **Files**: `certs/secplus.js` (+~640 LOC for 4 email + 6 SMS phish + smishing lesson) · `app.js` (+~95 LOC for `phtRenderSmsClient` function + vector dispatcher in phtStartScenario + liveVectors array) · `styles.css` (+~110 LOC for `.pht-phone-frame` + `.pht-phone-screen` + `.pht-phone-statusbar` + `.pht-phone-app-h` + `.pht-phone-msg-bubble` with flag click-to-tag + `.pht-sms-side` panel + `.pht-sms-decision-card` + `.pht-sms-tips` reference + reduced-motion gate updated) · `tests/uat.js` (+19 regression guards). **Tests**: 5395/5395 PASS (5375 → 5395, +20 v4.98.1 guards including 16-phish count, 6-SMS-vector check, all 10 new phish IDs, ms-2fa unlockAfter chain, 5 lessons total, phtRenderSmsClient existence, SMS vector dispatcher, phone-frame CSS regression, 80+ flags total, IRS-never-SMSes pattern blurb, NEVER-share-2FA pattern blurb). **Visual contract** preserved from mockup state 5 (smishing UI) — phone-frame ships pixel-correct. **Architectural alignment**: vector-aware rendering via dispatcher in `phtStartScenario` keeps the vector-specific UI clean — vishing + quishing in v4.98.2 add their own renderers (`phtRenderVoiceClient`, `phtRenderQrClient`) without touching email/SMS code paths. **What\'s NOT in v4.98.1**: Vishing voicemail UI + 8 voice phish (v4.98.2) · Quishing QR UI + 7 QR phish (v4.98.2) · AI generator + 7-layer validator (v4.98.3) · Full prescriptive dashboard (v4.98.3). 50% complete on PHT ship plan; bank has 2.7×\'d from launch with the smishing layer now functional. |
| v4.98.0 | **🎣 Phishing Triage Lab — Sec+ flagship #2 (issue #313, Batch 1 of 4).** SY0-701 Domain 2 (Threats, 22%) flagship drill. Click-the-flag inbox simulator. Architectural twin to IR War Room: same cert-aware module-load pattern, same per-scenario mastery model, same 4-batch ship plan. v4.98.0 ships email-only foundation (smishing/vishing/quishing variants land in v4.98.1+). **6 hand-curated email phish at v1**: `cfo-bec-wire-fraud` (★★ Exam, BEC) the canonical from mockup state 2 — display-name spoof + Reply-To typosquat + urgency + isolation + "I\'m unavailable by phone" pre-empt + password-protected zip + 8 flags · `ms-password-expiry` (★ Foundational, credential harvest) Microsoft brand impersonation with lookalike sender domain (m1crosoft) + outdated copyright year + 7 flags · `vendor-invoice-update` (★★★ Hard, locked behind cfo-bec) sophisticated BEC where vendor account is genuinely compromised — sender address is real, jurisdiction-mismatch + bank-detail change + entity-name mismatch + 7 flags · `it-mfa-reset` (★★ Exam, credential harvest) IT helpdesk impersonation with lookalike helpdesk URL + reply-trap + corp policy impersonation + 7 flags · `bank-fraud-callback` (★★ Exam, callback scam) Chase brand impersonation with embedded fake callback number + 30-min urgency + "don\'t click any links" misdirection + 6 flags · `ceo-gift-card` (★★ Exam, BEC variant) gift card BEC — the #1 most-attempted BEC globally — with mobile-pretext brevity cover + 6 flags. **Total**: 6 phish · 41 red flags · 5 categories (BEC × 3, credential harvest × 2, callback scam × 1). **Click-the-flag interaction** — body HTML contains `<span class="flag" data-fid="fN">` markers; clicking toggles `is-tagged` state; submit-decision triggers reveal where missed flags get `is-revealed-missed` styling. Wrong-tags (clicks on non-flag text) tracked separately as over-tag penalty. **5 decision actions** per phish (Report / Delete / Reply / Click / Spam) with per-action `decisionReveal` text explaining why each is right or wrong — every decision is teaching, not just gating. **Per-scenario mastery model**: pip earned only when ≥80% flag-catch AND correct decision. 3 pips = mastery. Mirrors IRW progression model. **Storage**: `STORAGE.PHT_MASTERY` + `STORAGE.PHT_LESSONS` (cloud-flushed via piggyback). **4 lesson cheatsheets**: anatomy of a phish (8 universal flag categories), BEC red flags (executive impersonation playbook), credential harvest (fake login pages), callback scam (phone-bypass). All 4 rendered as data-driven cards. **Email reading pane** — Gmail-style light-theme rendering with avatar + sender email + Reply-To meta line + body HTML + attachments section. Sender-email + Reply-To rendered as click-tagged flags too. **Files**: `certs/secplus.js` (+~620 LOC for 6 phish + 4 lessons + 4 vector definitions) · `app.js` (+~480 LOC for PHT cert-aware constants + 13 drill functions + sidebar/launcher wiring) · `index.html` (+`#page-pht` markup with 3 tabs · 24 LOC) · `styles.css` (+~360 LOC for `.pht-tab-bar` + `.pht-scen-card` + `.pht-triage-bar` + `.pht-reading` light pane + `.pht-rd-body .flag` click-to-tag with hover/tagged/revealed-missed states + `.pht-decision-btn` × 5 + `.pht-reveal-card` + `.pht-lesson-card` + `.pht-dash-row` + reduced-motion gate) · `cloud-store.js` (+2 USER_DATA_KEYS) · `tests/uat.js` (+27 regression guards). **Tests**: 5375/5375 PASS (5345 → 5375, +30 v4.98.0 guards including 6-phish count, all 6 phish IDs, vendor-invoice unlockAfter chain, cert-aware module-load, STORAGE keys, sidebar wiring, click-flag UI assertions, 5-action decision reveal, 35+ flags total, 4 lesson IDs, CSS regression). **Sec+ launcher**: PHT tile is now LIVE (replaces v4.97.0 SOON tile). Lede updated: "All 5 are live" mentions both flagships explicitly. **Mockup contract** preserved across states 1-4 + 8-9 (email-only states); states 5-7 (smishing/vishing/quishing/AI gen) ship in v4.98.1-3. **Cert-aware**: `_USE_SECPLUS_PHT = CURRENT_CERT === 'secplus' && CERT_PACK.phishingScenarios.length > 0`. Network+ users don\'t see this drill. **What\'s NOT in v4.98.0**: 4 more email phish (v4.98.1) · Smishing SMS UI (v4.98.1) · Vishing voicemail UI (v4.98.2) · Quishing QR UI (v4.98.2) · AI phish generator + 7-layer validator (v4.98.3) · Full prescriptive dashboard (v4.98.3). |
| v4.97.3 | **🚨 IR War Room — Sec+ flagship #1 · Batch 4 of 4 · FINAL · ISSUE #312 CLOSES.** 4 batches over same-day ships. Bank quadrupled from launch (5 → 20 scenarios). **5 final scenarios** — `vishing-exfil` (★★ Phish-derived) helpdesk pretexting → SSO + MFA bypass → $340M Salesforce pipeline dump · `zero-day-rce` (★★★ Cloud, locked behind k8s-container-escape) live exploitation in dependency JSON parser, no patch yet, WAF-buy-time pattern · `azure-tenant-compromise` (★★★ Cloud, locked behind aws-key-leak) Global Admin refresh-token theft via personal-laptop, 200 mailboxes downloaded, refresh-token revocation + PIM JIT eradication · `cfo-embezzlement` (★★★ Insider, locked behind insider-exfil) financial-insider with legitimate authority routing $1.2M to brother\'s shell company over 6 months, audit-committee + counsel + forensic-accountants + discretion discipline · `apt-nation-state` (★★★ Apex, locked behind golden-ticket) CISA-tipped 90-day APT presence, defence-industry IP target, **"obvious containment" trap callout** (sequential containment tips off APT — must do simultaneous multi-axis closed-circle decision-making per MITRE D3FEND + CISA guidance). **Bank growth final**: 15 → 20 scenarios (+5); 435 → 577 actions (+142). 4 unlock chains create natural progression (ryuk-finance → npm/lockbit/golden-ticket → apt-nation-state apex; bec-wire-fraud → spear-to-ransomware; aws-key-leak → dns-registrar-hijack/azure-tenant-compromise; s3-pii-exposure → k8s-container-escape → zero-day-rce; insider-exfil → cfo-embezzlement). **Full prescriptive dashboard** (replaces v4.97.0 stub): hero stats (mastered / completed / total runs) · per-vector mastery bars (color-coded, animated 800ms cubic-bezier fill) · per-scenario mastery list with 3-pip indicator + best accuracy + run count · prescriptive callouts (drill weakest vector / replay weakest scenario / try AI gen if <5 completed / unlock-prerequisite if 1 pip away) — every callout has a one-click CTA that fires the recommended action. Same Subnet-Trainer prescriptive philosophy ("descriptive without action is low-value"). **AI-gen scenario persistence** — `_irwLoadGeneratedScenarios()` + `_irwSaveGeneratedScenario(scen)` save validated AI-generated scenarios to `STORAGE.IRW_LESSONS + \'_aigen\'` localStorage namespace. Hydration IIFE on app boot pushes saved scenarios into `IRW_DATA` so they appear in the catalog like static scenarios. Dashboard surfaces them in a separate "AI-generated scenarios" section. Cloud-flush hooks via piggyback on IRW_LESSONS key (no new STORAGE key needed). **Files**: `certs/secplus.js` (+~870 LOC for 5 final scenarios) · `app.js` (+~250 LOC for irwRenderDashboard rewrite + persistence helpers + hydration IIFE) · `styles.css` (+~75 LOC for `.irw-dash-stat-grid` + `.irw-dash-grid` + `.irw-dash-vec-row` + `.irw-dash-callout` + `.irw-dash-callout-cta` + reduced-motion gate updated) · `tests/uat.js` (+14 regression guards). **Tests**: 5345/5345 PASS (5331 → 5345, +14 v4.97.3 guards including 20-scenario count, 550+ action count, all 5 new scenario IDs, apt-nation-state trapCallout, 2 new unlockAfter chains, dashboard rewrite assertions, persistence helpers, hydration IIFE, dashboard CSS regression). **Issue #312 closes** — Sec+ flagship #1 (IR War Room) is complete: 20 hand-curated scenarios + 6 PICERL phases + 6 lesson cheatsheets + Practice mode + Pressure mode (with timer + over-budget penalty) + AI scenario generator (Sonnet 4.6, 7-layer validator, persistence to localStorage + cloud sync) + full prescriptive dashboard + per-scenario + per-vector mastery analytics. **Architectural alignment**: cert-aware module-load gating identical to AMM/CTS/PT pattern; AI gen identical to TB pattern; dashboard prescriptive philosophy identical to Subnet Trainer; user-supplied API key + direct-browser-access identical to fetchQuestions. **Mockup contract maintained** across all 4 batches — every state from `mockups/security-incident-response-war-room-concept.html` is now live in production. **Next**: v4.98.0 begins Phishing Triage Lab (Sec+ flagship #2, issue #313) — 4-batch ship plan starts. |
| v4.97.2 | **🚨 IR War Room — Sec+ flagship #1 · Batch 3 of 4.** AI scenario generator goes live + 5 more curated scenarios (15 total · 435 actions). **5 new scenarios** — `mfa-bombing` (★★ Phish-derived, locked behind bec-wire-fraud) push-fatigue → admin account takeover with number-matching MFA fix · `dns-registrar-hijack` (★★★ Cloud, locked behind aws-key-leak) GoDaddy account compromise + MX record swap + 4h email interception, registry-lock + DNSSEC fix · `stolen-laptop` (★★ Insider) FDE disabled by user override 6mo ago, MDM remote-wipe + cred rotation containment, hard-enforced FDE eradication · `saas-vendor-breach` (★★★ Supply-chain, locked behind npm-supply-chain) PipelineCRM breached affecting 75K customer contacts + 4 OAuth tokens to your other apps, downstream cross-app token rotation · `golden-ticket` (★★★ Insider, locked behind ryuk-finance) Kerberos krbtgt hash extracted via DCSync, golden-ticket-forging detected by EDR, **TWICE krbtgt rotation** trap callout (single rotation isn't enough — Microsoft's documented requirement). **AI scenario generator** — modal opens from Practice tab, 4 input pickers (vector / difficulty / weak-phase bias / sector context), Sonnet 4.6 (CLAUDE_TEACHER_MODEL, MAX_TOKENS_IRW_AIGEN=4000) authors fresh scenarios, output passes through 7-layer validator, `Load + start scenario` button gates on all-7-pass. Same direct-browser-access pattern as fetchQuestions; user supplies their own API key via Settings; STORAGE.KEY only. **7-layer validator** (`_irwValidateAiScenario`, modeled on tbDeepValidateAndFix): (1) PICERL stage ordering — exact 6-phase canonical order · (2) Action realism — every action has label + isCorrect + meta + why · (3) IOC plausibility — rejects famously real public IPs (8.8.8.8, 1.1.1.1) + real-registered domains (google.com, microsoft.com, etc.) · (4) Per-phase action count — 4-8 per phase · (5) Distractor quality — ≥1 wrong-but-plausible action per phase · (6) Trap presence — at least 1 trap-flagged wrong action in containment OR eradication phase · (7) Citation grounding — ≥30% of `why` explanations cite NIST SP 800-61 / SANS / PICERL / SY0 / RFC / MITRE. Each layer renders pass/warn/fail icon inline in the validator panel. **Bank growth**: 10 → 15 scenarios (+5); 302 → 435 actions (+133). Generated scenarios are added to `IRW_DATA` for the active session (persistence to localStorage in v4.97.3). **Files**: `certs/secplus.js` (+~720 LOC for 5 new scenarios) · `app.js` (+~390 LOC for `_irwAiGenState` + `irwOpenAiGenerator` + `_irwRenderAiGenModal` + `irwGenerateScenario` async + `_irwBuildAiGenPrompt` + `_irwValidateAiScenario` 7-layer + `_irwLoadGeneratedScenario`; new `MAX_TOKENS_IRW_AIGEN` constant + magic-number guard preserved) · `styles.css` (+~150 LOC for `.irw-aigen-modal` + `.irw-aigen-card` + `.irw-aigen-validator-shell` + `.irw-aigen-pill` + `.irw-aigen-check-icon` 3-state + `.irw-aigen-output` success card + reduced-motion gate) · `tests/uat.js` (+18 regression guards). **Tests**: 5331/5331 PASS (5313 → 5331, +18 v4.97.2 guards including all 5 new scenario IDs, action count ≥ 400, golden-ticket trapCallout, AI gen state object, Anthropic API call wiring with CLAUDE_TEACHER_MODEL, STORAGE.KEY-from-localStorage gating, validator function with all 7 layer labels, PICERL canonical-order check, real-IP rejection, all-7-pass gating before load). **Visual contract** preserved from mockup state 6 (AI Generator + 7-layer validator panel) — full pixel correctness. **Architectural alignment** with TB pattern: same user-supplied API key model, same Sonnet teacher model, same direct-browser-access flag, same validator-rejects-malformed-output discipline. **What's NOT in v4.97.2**: Final 10 scenarios + per-phase dashboard analytics + prescriptive callouts + AI-gen scenario persistence to STORAGE (arrives v4.97.3 — final batch). 75% complete on the IR War Room ship plan; AI generation now matches Topology Builder's quality discipline. |
| v4.97.1 | **🚨 IR War Room — Sec+ flagship #1 · Batch 2 of 4.** Doubles the scenario bank + ships Pressure mode + lands all 6 PICERL lesson cheatsheets. **5 new scenarios** — `ddos-frontend` (★★ DDoS) 50K rps L7 attack with WAF rate-limiting + challenge-mode + behavioural-rules-not-IP-blocks trap · `npm-supply-chain` (★★★ Real-world, locked behind ryuk-finance) tampered react-utils-extra@2.4.1 with credential-stealer postinstall, 12 internal projects + 47 CI runs blast radius, full-fleet rotation containment · `aws-key-leak` (★★ Cloud) public-GitHub root access key + crypto-mining at $14K/day, with the "make repo private won't un-leak" trap · `spear-to-ransomware` (★★★, locked behind bec-wire-fraud) 21-day dwell-time multi-stage attack from spear-phish to AD dump to encryption, dwell-investigation discipline · `k8s-container-escape` (★★★ Real-world, locked behind s3-pii-exposure) privileged pod → host → kubelet → API server compromise, surgical node-cordon containment. **Bank growth**: 5 → 10 scenarios (+5); 158 → 302 actions (+144); 110 → 219 correct picks (+109). **Pressure mode**: live timer counts down per scenario (foundational 30 min · exam 25 min · real-world 35 min budget) with header gradient escalating from neutral → warn → critical (animated pulse). Going over budget triggers a 5%/min accuracy penalty (capped at 30%). Mode picker on the setup screen toggles Practice ↔ Pressure. Per-scenario mastery pips still need 85%+ accuracy regardless of mode. **6 PICERL lesson cards** (full content — replaces the v4.97.0 stub) — each card has phase goal · 5 canonical actions · 1-2 SY0-701-canonical traps. Containment card includes the famous "isolate ≠ power off" trap; Recovery card includes "restore-before-eradicate" trap; Lessons card calls out blame-culture vs blameless-postmortem. Cards rendered from `incidentResponseLessons` data array — fully data-driven, no hardcoded content. **Files**: `certs/secplus.js` (+~720 LOC for 5 new scenarios + 6 lesson cards) · `app.js` (+~120 LOC for pressure-mode helpers + mode-picker + lesson rendering rewrite) · `styles.css` (+~120 LOC for `.irw-mode-picker` + `.irw-pressure-bar` w/ 3-state gradient + `.irw-lesson-card` + `.irw-eos-pressure-warn`/`good` + reduced-motion gate updated) · `tests/uat.js` (+25 regression guards). **Tests**: 5313/5313 PASS (5288 → 5313, +25 v4.97.1 guards including scenario count = 10, action count ≥ 250, IRW_PRESSURE_BUDGETS table, pressure timer state machine, irwSetMode toggle, irwEndScenario over-budget penalty, lesson-card rendering, CSS regression checks). **Visual contract** preserved from mockup states 4 (pressure mode), 7 (lessons tab) — both ship pixel-correct. **What's NOT in v4.97.1**: AI scenario generator + 7-layer validator (arrives v4.97.2) · Final 10 scenarios + per-phase dashboard analytics + prescriptive callouts (arrives v4.97.3). Halfway through the ship plan; bank has doubled and the SOC-realism layer (timer + escalating UI) is live. |
| v4.97.0 | **🚨 Incident Response War Room — Sec+ flagship #1 (issue #312, Batch 1 of 4).** SY0-701 Domain 4 (Security Operations, 28%) flagship drill. 6-phase SANS PICERL walkthrough (Preparation → Identification → Containment → Eradication → Recovery → Lessons Learned). **5 hand-curated scenarios at v1**: `ryuk-finance` (★★ Exam, ransomware) with the canonical "power-off vs network-isolate" trap callout · `bec-wire-fraud` (★★, phish-derived) — CFO BEC with Reply-To typosquat + 2-person rule + out-of-band verify · `s3-pii-exposure` (★★, cloud) — public bucket, 14d unauthorised GETs, GDPR/breach-counsel coordination · `insider-exfil` (★★★ Real-world, locked behind ryuk-finance) — departing engineer + DLP flag + HR/legal/forensics intersection · `lockbit-multihost` (★★★, locked) — 15 hosts, 3 VLANs, 380GB exfil, 72h leak-site countdown. **158 actions total · 110 correct picks** across 30 phases (avg 31.6 actions/scenario, hits the mockup spec ~22 target). Multi-select decisions per phase with **over-pick penalty** (real SOC noise discipline) + **per-phase scoring** + **per-scenario mastery pips** (3 per scenario, 85%+ run earns a pip). Visual contract from `mockups/security-incident-response-war-room-concept.html` (8 states): 3-column war-room layout (incident context · PICERL timeline + decision deck · live evidence feed) + reveal mode with color-coded action cards (green=correct-picked, red=wrong-picked, dashed-green=missed-required) + trap callouts on critical phases (e.g. "isolate ≠ power off" for Containment) + end-of-scenario summary card. **Cert-aware gating** via `_USE_SECPLUS_IRW = CURRENT_CERT === 'secplus' && CERT_PACK.incidentResponseScenarios.length > 0`; Network+ users don't see this drill. **Hide TB + ACL on Sec+** verified — sidebar already cert-conditional via `APP_SIDEBAR_DRILLS` vs `APP_SIDEBAR_DRILLS_SECPLUS` ternary at `app.js:37253`, drills launcher already cert-replaced via `_renderSecPlusDrillsLauncher`. IRW slots cleanly into both. **Storage**: `STORAGE.IRW_MASTERY` + `STORAGE.IRW_LESSONS` (cloud-flushed) · sidebar entry · TOPBAR_CRUMBS · Sec+ launcher tile (FLAGSHIP · NEW badge with red→amber gradient). **Files**: `certs/secplus.js` (+~580 LOC for 5 scenarios + 6 phase definitions + 6 vector definitions) · `app.js` (+~430 LOC for IRW cert-aware constants + 14 drill functions + sidebar/launcher wiring) · `index.html` (+`#page-irw` markup with 3 tabs · 30 LOC) · `styles.css` (+~430 LOC for `.irw-warroom` 3-column grid + `.irw-timeline` PICERL timeline + `.irw-action-card` states + `.irw-trap-callout` + `.irw-eos-card` + flagship launcher tile + reduced-motion gate) · `cloud-store.js` (+2 USER_DATA_KEYS) · `tests/uat.js` (+30 regression guards). **Tests**: 5288/5288 PASS (5256 → 5288, +32 IRW guards including scenario count, action count ≥ 100, PICERL ordering, cert-aware module-load constants, sidebar wiring, hide-TB-on-Sec+ guard, ryuk-finance trapCallout presence, lockbit-multihost unlockAfter chain). **Mockup approved verbatim 2026-05-08, zero revision rounds** (15th consecutive concept-mockup-first ship). **What's NOT in v4.97.0**: Pressure mode (alert injection + timer · arrives v4.97.1) · Lesson cheatsheets (6 PICERL phase cards · arrives v4.97.1) · AI scenario generator + 7-layer validator (arrives v4.97.2) · Final 10 scenarios + dashboard with prescriptive callouts (arrives v4.97.3). v4.97.0 is the foundation — engine, data schema, UI, mastery model, all proven shippable end-to-end before adding the depth layers. |
| v4.96.4 | **📦 Packet Trace expansion · Batch C (5 scenarios) — final batch of the user-requested "10 more scenarios" expansion.** N10-009 Domain 1.5 (TCP/IP) + 4.4 (security/VPN) + 2.4 (wireless) + 5.4 (troubleshooting). **5 scenarios shipped**: `tcp-handshake` (5 hops, ★★, obj 1.5) — three-way handshake with random ISNs (defends against blind-injection attacks), receive-window flow control, FIN/ACK teardown is independent each direction; distinguishes SYN/SYN-ACK/ACK roles · `tls-handshake` (5 hops, ★★★, obj 4.4) — TLS 1.3 ClientHello includes `key_share` so ECDH starts in round 1, server cert is encrypted (1.3 improvement over 1.2), AEAD ciphers (AES-GCM/ChaCha20-Poly1305) protect both confidentiality + integrity in one operation · `ipsec-vpn` (5 hops, ★★★, obj 4.4) — IKE Phase 1 (auth + IKE SA) → Phase 2 (negotiate IPsec SAs, ONE PER DIRECTION), ESP encapsulates+encrypts the original packet, NAT-T wraps ESP in UDP/4500 because NAT can't translate ESP (no port field) · `wpa2-eapol` (5 hops, ★★★, obj 2.4) — 4-way handshake derives PTK from PMK + ANonce + SNonce + MACs (PMK never traverses the air), MIC verifies handshake integrity, GTK distributed in msg 3 for multicast/broadcast, CCMP (AES) used for unicast · `traceroute-ttl` (5 hops, ★★, obj 5.4) — TTL=1 → first router responds with ICMP Time Exceeded revealing its IP, TTL=2 → second router, etc; multi-probe RTTs catch jitter; final hop replies with destination-specific type (ICMP Echo Reply for `ping`-style traceroute, ICMP Port Unreachable for `traceroute -U`). **Bank growth**: 10 scenarios → 15 (+5); step-questions 46 → 71 (+25). UAT scenario-count assertion auto-grew from 10 → 15. UAT 5256/5256 still passing. **All 3 batches complete** — bank tripled from launch (5→15 scenarios) over 3 same-day ships. The drill now spans every major exam-relevant protocol exchange in N10-009. Pure data-additive across all 3 batches; zero code changes after v4.96.0/v4.96.1 since the scenario schema + shared SVG renderer + dispatcher were correct from the mockup contract. **Lessons unchanged** at 5 (TCP/TLS/IPsec/WPA2/Traceroute concepts already implicit in existing L2-vs-L3 + ARP + DHCP DORA + DNS recursion cheatsheets; if user feedback shows dedicated TCP/TLS lessons are wanted, can add in v4.97.0). **Issue #305 (Packet Trace Drill) → CLOSED** in v4.96.0; this is post-launch dogfooding-driven expansion. |
| v4.96.3 | **📦 Packet Trace expansion · Batch B (2 scenarios)** — N10-009 Domain 1.4-1.5 (advanced routing). `hsrp-failover` (5 hops, ★★★) — virtual IP/MAC shared by 2 routers, active/standby Hello+Hold timers, gratuitous ARP on failover updates every host's ARP cache + every switch's MAC table without config change, preempt OFF by default · `ospf-inter-area` (5 hops, ★★★) — areas exist to bound LSDB + SPF recalc scope, ABRs are members of multiple areas + generate Type-3 Summary LSAs that hide intra-area detail, OSPF cost = reference-bandwidth/interface-bandwidth (not hop count). **Bank growth**: 8 scenarios → 10 (+2); step-questions 36 → 46 (+10). UAT scenario-count assertion auto-grew from 8 → 10. UAT 5256/5256 still passing. **Next**: Batch C (TCP/TLS/IPsec/WPA2/Traceroute = 5 scenarios) → v4.96.4. |
| v4.96.2 | **📦 Packet Trace expansion · Batch A (3 scenarios)** — N10-009 Domain 2.3 (Layer 2). User dogfooded v4.96.0+v4.96.1 and asked for "10 more scenarios" to make the drill exam-useful. Shipping in 3 batches over 3 commits. **This batch (Batch A)**: `stp-convergence` (5 hops, ★★★) — root bridge election by lowest BID + path-cost tiebreaker + designated/blocked port roles + topology re-convergence on link failure · `vlan-trunk` (5 hops, ★★) — access port → trunk port adds 802.1Q tag, trunk port → access port strips it, hosts unaware of VLANs · `inter-vlan-routing` (5 hops, ★★★) — router-on-a-stick with sub-interfaces (Gi0/0.10, Gi0/0.20), VID flips at the router, L3 source IP preserved end-to-end. **Bank growth**: 5 scenarios → 8 (+3); step-questions 21 → 36 (+15). Pure data-additive (no code change) — adding scenarios is just appending JSON to `packetTraceScenarios` in `certs/netplus.js`. UAT scenario-count assertion auto-grew from 5 → 8 (counts `unlockAfter:` occurrences). **Lessons unchanged** at 5 (existing cheatsheets cover these new scenarios well). UAT 5256/5256 still passing. **Next**: Batch B (HSRP + OSPF) → v4.96.3, Batch C (TCP/TLS/IPsec/WPA2/Traceroute) → v4.96.4. |
| v4.96.1 | **📦 Packet Trace polish — slide packet across cable between hops (user-requested enhancement).** Same-day follow-up after user dogfooded v4.96.0: *"does it show the packet moving through the devices yesh?"* — pulse-and-teleport behaviour matched the locked mockup contract but felt jarring in practice. **What ships**: when user clicks "Next hop →", the orange-amber SVG packet circle now slides from the current device to the next device along the cable path over **650ms** with cubic-bezier easing, then the new step's caption + question render. **Implementation**: SVG `<circle>` gets a `.ptr-packet` class hook + the step indicator text gets `.ptr-packet-here`; `_renderTraceSvg` emits both with class attributes. CSS adds `.ptr-packet { transition: cx 0.65s cubic-bezier(0.4, 0, 0.2, 1), cy 0.65s ... }` — modern Chrome (76+) treats `cx`/`cy` as CSS-animatable SVG presentation attributes, so updating the attribute via `setAttribute` triggers a browser-tweened slide automatically. `ptrAdvance` reads from-device + to-device coords from the scenario JSON, hides the "⬇ packet here" indicator during the slide, updates the circle's cx/cy attrs to the next device's center, then `setTimeout(finalize, 700ms)` re-renders the new step (650ms tween + 50ms safety buffer). **Reduced-motion gate**: `prefers-reduced-motion` users skip the slide entirely (instant teleport, original v4.96.0 behaviour) — both the JS-level check and CSS `@media (prefers-reduced-motion: reduce) { .ptr-packet { transition: none; } }`. **Files**: `app.js` (~50 LOC for slide logic in ptrAdvance + class hooks in _renderTraceSvg) · `styles.css` (+~12 LOC for `.ptr-packet` transition + reduced-motion gate). **Tests**: 8 new v4.96.1 UAT regression guards (class hooks present, ptrAdvance reads from/to step coords, cx/cy setAttribute calls, prefers-reduced-motion check, 700ms setTimeout duration, CSS transition + reduced-motion `@media`). **Live-verified** — packet at PC-A (cx=84) → click Next hop → cx attribute updates to 241 → CSS transition tweens over 0.65s → visual: smooth slide along the cable to SW-1 → 700ms later, full re-render with caption card showing Step 2 details. UAT 5248 → 5256 passing. **Mockup-vs-real-feel calibration lesson**: shipped UX polish that wasn't in the locked mockup contract because mockups capture single moments, not transitions. Pattern worth repeating on future drill ships — verify perceived dynamics on top of the static visual contract. |
| v4.96.0 | **📦 Packet Trace Drill (#305) — Network+ Domain 1.4-1.6 drill, third + final ship from the 3-drill mockup batch.** Walk a packet through curated networks hop-by-hop with an MCQ at each step. Distinct from the Topology Builder's free-form packet trace — this is **curated scenarios** with mastery tracking + lesson cheatsheets + progressive disclosure (later scenarios unlock when earlier ones are mastered). **5 scenarios at v1**: same-subnet ARP (3 hops), cross-subnet routing (5), NAT boundary (4), DHCP DORA (4), DNS recursive (5) = **21 step-questions** total across N10-009 Domain 1.4 (routing) + 1.6 (DHCP/DNS). 5 more queued for v4.96.1+ (Spanning Tree, VLAN Trunk, HSRP, OSPF area boundary, Inter-VLAN routing). 5 lesson cheatsheets (L2 vs L3 boundary, ARP, NAT/PAT, DHCP DORA, DNS recursion). **Schema**: `packetTraceScenarios` array with each scenario having `network` (devices+cables+subnets) and `steps` (each step pins packet to a device, shows caption card, asks MCQ). **Shared SVG renderer** `_renderTraceSvg(network, packetAtId)` + `_renderDeviceGlyph(device)` reads JSON network description and emits SVG with subnet boxes + cables + device glyphs (PC/laptop/switch/router/server) + animated packet circle. Adding more scenarios is pure data, no code change. **Cert-aware** via `_USE_NETPLUS_PT` (Network+ only). **Mastery model**: per-scenario, mastered ONLY if user gets ALL hops correct in a single run (stricter than AB/CTS box-progression). Wrong on a hop reveals explanation but the scenario still completes — teaching moment, no soft-fail. **Resume support** via `STORAGE.PT_RESUME` so closing the tab mid-scenario doesn't lose progress; dashboard shows "Resume where you left off" card. **Storage**: `STORAGE.PT_MASTERY` + `PT_LESSONS` + `PT_RESUME` (3 keys) + cloud-store sync. **Naming-collision fix during smoke test**: initial v4.96.0 used `pt-` prefix for HTML/CSS/JS but Port Drill (existing v4.0+) already owns `pt-` prefix. ID collision meant `getElementById('pt-tab-dashboard')` returned Port Drill's panel. **Renamed everything to `ptr-` prefix** during live-verify (HTML IDs, CSS classes, page name 'pt' → 'ptr', JS function names like `ptStartScenario` → `ptrStartScenario`). Lesson: **always grep existing prefixes before naming a new drill**. **Files**: `certs/netplus.js` (+~600 LOC for 5 scenarios + 5 lessons) · `app.js` (+~480 LOC for PT cert-aware constants + 16 drill functions + shared SVG renderer + sidebar/launcher/breadcrumb wiring) · `index.html` (+`#page-ptr` markup with 3 tabs + drills launcher tile) · `styles.css` (+~390 LOC for `.trace-stage` + `.trace-canvas-wrap` + `.trace-caption` + `.trace-question` + `.ptr-opt` + `.dash-scenario-row` + reduced-motion gate) · `cloud-store.js` (+3 USER_DATA_KEYS) · `tests/uat.js` (+40 regression guards). **Mockup**: `mockups/network-packet-trace-drill-concept.html` shipped + approved verbatim 2026-05-07 (6 states), zero revision rounds (14th consecutive concept-mockup-first ship). **Live-verified** in Network+ mode via Chrome MCP — visual contract pixel-correct (yellow gradient stage, animated orange-amber packet, subnet boxes, device glyphs, caption card, MCQ panel with letter-pilled options + correct-answer highlighting + reveal `why` explanation), all 3 tabs functional, progressive disclosure works (4 scenarios show 🔒 unlock until prereq mastered). UAT 5207 → 5248 passing. **All 3 mockup-approved drills shipped**: #301 AMM (v4.94.0) · #302 CTS (v4.95.0) · **#305 Packet Trace (v4.96.0)**. Issue #305 closes. |
| v4.95.1 | **🎯 Security+ Phase 3 Cycle 2 — Gap Analysis exemplars (3) + retention concept.** First post-Network+-pass exemplar curation cycle on the Security+ pack. User flagged "Gap Analysis" as a recurring SY0-701 concept worth dedicated bank coverage (Domain 5.1 — Effective Security Governance). 3 fresh exemplars authored across the standard difficulty mix: **Foundational** (definition — distinguish gap analysis from pen test / vuln scan / BIA in a SOC 2 prep scenario), **Exam Level** (NIST CSF adoption scenario — distinguish gap analysis from risk / threat / vulnerability assessment), **Hard multi-select** (which of 5 statements about gap analysis are true — distinguish from CVSS scoring + active exploitation + threat actor profiling). All content original from public SY0-701 blueprint + NIST CSF / ISO 27001 standard practice. Zero copy from paid practice banks (legal-boundary discipline preserved per `reference_jason_dion_method.md`). **Bank growth**: 92 → 95 exemplars (+3, all source-tagged `curated-secplus-phase3` + `addedVersion: '4.95.1'`). **Retention concept appended** to `retentionGapConcepts` — "Gap Analysis" with parentTopic Security Governance + the canonical distinguishing-from list (vulnerability assessment / risk assessment / threat assessment / pen test) — so Haiku gets nudged toward this concept whenever Domain 5 governance topics are sampled in any Mixed quiz / Daily Challenge / Marathon / exam batch. Cumulative Phase 3 total: 18 exemplars across 6 concepts (Cycle 1 = 5 concepts × 3 exemplars from Messer gaps; Cycle 2 = 1 concept × 3 exemplars). **Files**: `certs/secplus.js` (+3 exemplars + 1 retention concept entry, ~5 LOC). **Tests**: 4 new v4.95.1 UAT assertions (cumulative Phase 3 count = 18, total bank = 95, 3 exemplars tagged v4.95.1, retention concept present). 3 v4.88.3 stale assertions retargeted (15→18, 92→95). UAT 5205 → 5207 passing. **Phase 3 is now a multi-cert proven pattern** — Network+ Cycles 1+2 (29 gaps from Dion tests), Security+ Cycle 1 (5 gaps from Messer videos), Security+ Cycle 2 (1 user-flagged concept). Sec+ exam booked 2026-07-29 — bank will keep growing as study surfaces more gaps. |
| v4.95.0 | **🛡 Control Type Sorter drill (#302) — second SY0-701 Domain 1.1 drill.** First **dual-axis MCQ** in the platform: pick TYPE (1-of-6) AND CATEGORY (1-of-4) for each control. Submit gated on both axes locked. Wrong on either axis = wrong; right on both = right. **120 controls** authored across the **full CompTIA 6×4 matrix** with 5 controls per cell — every cell covered (Preventive × Technical/Managerial/Operational/Physical, Detective × 4, Corrective × 4, Deterrent × 4, Compensating × 4, Directive × 4). **Trap-focused content**: each control has a `why` explanation + optional `trap` field (the easy-to-confuse alternative). Examples: IDS is Detective+Technical (trap: IPS = Preventive); Lighting is Detective+Physical (trap: Deterrent — light enables CCTV to detect); Recording-only CCTV is Detective+Physical (trap: Operational — that's live-monitored CCTV). **6 matrix lessons** with example controls per cell + summary lines. **3-tab layout** (Practice / 6×4 matrix / Dashboard) on dedicated `#page-cts`. **Mode toggle**: MCQ mode active, Sort mode disabled with "soon" pill — explicitly deferred to v2 per mockup decision. **Standalone drill engine** — ~440 LOC of dual-axis-aware drill code with `ctsPickType` + `ctsPickCat` + `ctsUpdateSubmitButton` (gating logic). **Cert-aware** via `_USE_SECPLUS_CTS`. **Mastery model**: per-control + per-type + per-category counts; box 1-5; wrong on either axis decrements box. Weighted picker favours weakest types + un-mastered controls. **Storage**: `STORAGE.CTS_MASTERY` + `STORAGE.CTS_LESSONS` + cloud-store sync. **Sidebar + launcher + breadcrumbs wired**. Drills launcher tile becomes live (was is-coming-soon), launcher lede updated to "Acronym Blitz, Attack-to-Mitigation, and Control Type Sorter are live; 2 more drills queued". **Files**: `certs/secplus.js` (+~840 LOC for 120 controls + 6 types + 4 categories + 6 matrix lessons) · `app.js` (+~440 LOC for CTS cert-aware constants + 13 drill functions + dual-axis state machine + sidebar/launcher wiring) · `index.html` (+`#page-cts` markup with 3 tabs + mode toggle ~46 LOC) · `styles.css` (+~440 LOC for `.cts-question-card` + 6-button TYPE grid with 6 color variants + 4-pill CATEGORY row + `.cts-lesson-matrix` 6×4 grid + `.cts-eos-card` + `.cts-dash-*` + reduced-motion gate) · `cloud-store.js` (+2 USER_DATA_KEYS) · `tests/uat.js` (+38 regression guards including dual-axis gating assertions). **Mockup**: `mockups/security-control-type-sorter-concept.html` shipped + approved verbatim (7 states), zero revision rounds (13th consecutive concept-mockup-first ship). **Live-verified** in Security+ mode via Chrome MCP — visual contract pixel-correct, dual-axis gating works (Submit disabled until both axes locked), correct-answer reveal flow works, 6×4 matrix lessons render with 24 color-coded cells, all 3 tabs functional. UAT 5165 → 5205 passing. **Second of 3 drill ships approved this session** (next: #305 Packet Trace Drill v4.96.0). Issue #302 closes. |
| v4.94.0 | **⚔️ Attack-to-Mitigation Match drill (#301) — first SY0-701 Domain 2 drill.** Visual contract locked from preview-panel mockup. 96 attack/mitigation pairs across 5 categories (Web/App attacks 18 · Social engineering 20 · Network attacks 19 · Malware 20 · Insider/Physical 19) — each with 1 correct + 3 plausible distractors (the trap is picking a less-correct mitigation, e.g. WAF rule for SQL injection vs parameterised queries). 5 lesson cheatsheets ("Code-level beats perimeter; root-cause beats signature"; "Human-factor attacks need human-factor defences"; etc) with key-pair reference tables. **3-tab layout** (Practice / Lessons / Dashboard) on dedicated `#page-amm`. **Standalone drill engine** — not via `createDrillScaffold` because the question shape (attack-card with icon + name+sub options + reveal panel with `why`) differs from acronym/protocol drills. ~330 LOC of drill code. **Cert-aware module-load aliases** mirror v4.91.0 SAB pattern: `_USE_SECPLUS_AMM` switch on `CURRENT_CERT === 'secplus' && CERT_PACK.attackMitigationPairs.length > 0`. Network+ users don't see this drill. **Mastery model**: per-pair box (1-5) advancing on correct, decrementing on wrong; per-category seen/correct counts; weighted picker favours weakest categories + un-mastered pairs (`box < 3`). **Storage**: `STORAGE.AMM_MASTERY` + `STORAGE.AMM_LESSONS` + cloud-store sync via `_cloudFlush`. **Sidebar wiring**: `APP_SIDEBAR_DRILLS_SECPLUS` extended; `SIDEBAR_ACTIVE_MAP['amm']='amm'`; `TOPBAR_CRUMBS['amm']='Attack-to-Mitigation'`. **Drills launcher**: AMM tile becomes live (was is-coming-soon), launcher lede updated. **Files**: `certs/secplus.js` (+~700 LOC for 96 pairs + 5 categories + 5 lessons) · `app.js` (+~330 LOC for AMM cert-aware constants + 10 drill functions + sidebar/launcher wiring) · `index.html` (+`#page-amm` markup with 3 tabs ~38 LOC) · `styles.css` (+~280 LOC for `.amm-question-card` + `.amm-q-attack-card` + `.amm-q-grid` + `.amm-reveal` + `.amm-eos-card` + `.amm-lesson-pair-table` + `.amm-dash-*` + reduced-motion gate) · `cloud-store.js` (+2 USER_DATA_KEYS) · `tests/uat.js` (+30 regression guards). **Mockup**: `mockups/security-attack-mitigation-match-concept.html` shipped + approved verbatim (6 states), zero revision rounds (12th consecutive concept-mockup-first ship). **Live-verified** in Security+ mode via Chrome MCP — visual contract from preview panel renders pixel-correct, correct-answer reveal flow works, all 3 tabs functional. UAT 5130 → 5165 passing. **First of 3 drill ships approved this session** (next: #302 Control Type Sorter v4.95.0, then #305 Packet Trace Drill v4.96.0). Issue #301 closes. |
| v4.93.0 | **🎓 Pass tracking — replace hardcoded 767/900 with data-driven cert results.** New §03 **Exam results** section on /account between Subscription and Security (everything below renumbered §04-§07). Users mark "I passed" or "I attempted" per cert, enter score + date + optional centre; save fires confetti modal (Passed) or encouragement modal (Attempted) with Pass-Guarantee CTA pre-filled (`?attempt=<cert>&score=<n>`). **Schema**: `profiles.metadata.cert_results.<cert>` jsonb (`{status, score, max_score, pass_score, date, centre, created_at, updated_at}`) — no new table, no migration friction. Sanity-check guard: marking "passed" with score below cutoff auto-prompts to switch to "attempted." **Cert-tile + My-certs modal now data-driven** — previously hardcoded "✓ 767/900 · keep practicing →" in `landing/auth.js:262` for any signed-in user; now reads `profile.metadata.cert_results.netplus` and falls back to "Active · Resume studying →" when no result on file. Cert-tile pill swaps green ("✓ X/Y · keep practicing") or orange ("X/Y · keep going") or default Active. **Subscription entitlement list** also reflects results — passed certs show ✓ pill + "Passed YYYY-MM-DD" meta. **Per-cert exam format** lives in module-load `EXAM_FORMATS` const (N+ 720/900, S+ 750/900, future certs hardcoded) — single score/max-score/pass-score triple works for CompTIA scaled, AWS scaled, Cisco percent. **Confetti modal** is purely CSS-animated (8 falling sprinkles + cubic-bezier pop on burst emoji) with reduced-motion gate — not a dep on the cert-app `launchConfetti()` since this lives on landing. **Files**: `landing/account.html` (+1 new §03 section, renumber §04-§07 eyebrows) · `landing/lib/account.js` (+~330 LOC: `renderExamResultsList` + `renderExamResultRow` + `expandExamForm` + `handleSaveExamResult` + `openExamResultModal` + `wireExamResultButtons` + `EXAM_FORMATS` table + entitlements row override for passed/attempted) · `landing/auth.js` (replaced hardcoded swap with `applyTileState(certId, defaultStatus, defaultCta)` helper that reads `profile.metadata.cert_results`; `renderMyCertsList` similarly data-driven; `fetchProfileRole` now selects `metadata` too) · `landing/styles.css` (+~280 LOC for `.er-list/.er-row/.er-form/.erm-backdrop/.erm-modal/.confetti-*` + `.status-attempted` + `.my-cert-status-attempted`). **Mockup**: `mockups/cert-pass-tracking-concept.html` shipped + approved verbatim (5 states: /account list, inline form, confetti modal Passed, modal Attempted, three cert-tile reflections), zero revision rounds (11th consecutive concept-mockup-first ship). **Out of scope**: Cert-passed email via Resend (deferred — modal celebration is enough); Pass Guarantee enforcement logic (eligibility check + manual review queue ships separately); multi-attempt history (current schema is single-attempt; extending to `attempts: []` is a follow-up). UAT 5130/5130 still passing (landing changes don't touch cert-app surface). |

> **Older releases** (v3.0 through v4.76.0, 235 rows) live in [CHANGELOG.md](./CHANGELOG.md). Inline here is the Phase C′ cluster only — see CHANGELOG for per-version detail across all 235 prior releases.


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
| `~/Desktop/Dev Projects/product-vision/ONBOARDING-ROADMAP.md` | **🧊 saas-gated** Cert SaaS user funnel — 11-step onboarding flow (landing → diagnostic → first win → paywall day 7 → retention). Revised from Codex draft (payment moved step 2 → step 8, pass guarantee added, PBQs featured, server-side keys). Revisit when pass-Network+ trigger fires |
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
