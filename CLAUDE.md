# Network+ AI Quiz — Project Guide

## Architecture
- **Type**: Static HTML/JS/CSS single-page app (no framework, no build step)
- **AI**: Claude Haiku API (`claude-haiku-4-5-20251001`) via direct browser fetch with `anthropic-dangerous-direct-browser-access: true`
- **Storage**: All data in localStorage (history, wrong bank, streaks, port drill scores, reported questions)
- **Hosting**: Vercel (static deployment, `vercel.json` just has `{"version": 2}`)
- **Offline**: Service worker with stale-while-revalidate caching
- **PWA**: manifest.json, installable on mobile

## Files
| File | Purpose | Size |
|---|---|---|
| `index.html` | All page structures (setup, loading, quiz, results, review, exam, session, subnet, ports, analytics) | ~500 lines |
| `app.js` | All application logic — state, API calls, rendering, game logic, analytics | ~3200 lines |
| `styles.css` | Full styling with dark/light theme support | ~550 lines |
| `sw.js` | Service worker for offline caching | ~50 lines |
| `manifest.json` | PWA manifest | ~20 lines |
| `vercel.json` | Vercel config (minimal) | 3 lines |
| `tests/uat.js` | Reusable UAT test suite | ~150 lines |

## Key Patterns

### Page Navigation
Pages are `<div class="page">` elements. `showPage(name)` toggles `.active` class. All pages defined in index.html.

### Quiz Flow
`startQuiz()` → `fetchQuestions()` → `aiValidateQuestions()` → `validateQuestions()` → `injectPBQs()` → `render()`

### Question Types
| Type | Format | Scoring |
|---|---|---|
| `mcq` | 4 options, 1 correct | `pick()` checks answer |
| `multi-select` | 5 options, 2-3 correct | `submitMultiSelect()` checks answers array |
| `order` | 4-5 items, arrange in sequence | `submitOrder()` checks correctOrder array |
| `cli-sim` | Terminal UI + command buttons + diagnosis MCQ | Uses `pick()` for the MCQ part |
| `topology` | Device palette + zone placement (drag or click) | `submitTopology()` checks correctPlacements map |

### Exam Mode
90 questions, 5 batches of 18, timed (90 min), scaled scoring 100-900. Uses `examQuestions[]` and `examAnswers[]` arrays. Flag/unflag, question navigator grid.

### AI Enhancement Pipeline
1. **Prompt engineering**: 5-step self-verification protocol in fetchQuestions
2. **AI second-pass validation**: `aiValidateQuestions()` sends questions back to verify, fixes or removes bad ones
3. **Programmatic validation**: `validateQuestions()` checks for wrong-letter claims in explanations, keyword overlap, reported question exclusion
4. **Explain Further**: 6-section deep dive on demand (concept breakdown, analogy, wrong answer analysis, exam tips, memory trick, related concepts)

### Data Storage Keys (localStorage)
| Key | Content |
|---|---|
| `nplus_key` | Anthropic API key |
| `nplus_history` | Array of quiz results (max 200) |
| `nplus_streak` | Current/best streak data |
| `nplus_wrong_bank` | Wrong answers for drill mode |
| `nplus_theme` | `dark` or `light` |
| `nplus_reports` | Reported question counts |
| `nplus_port_best` | Port drill high score |

### Topic Resources
`topicResources` object maps all 40 topics to Professor Messer N10-009 YouTube search URLs with exam objective numbers.

## Deployment
```bash
# Requires nvm with node v20.20.2
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
npx vercel --prod --yes
```

Production URL: https://networkplus-quiz-sable.vercel.app

## Local Development
```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
python3 -m http.server 3131
# Open http://localhost:3131
```

## UAT
```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
node tests/uat.js
```

## Version History
| Version | Features Added |
|---|---|
| v3.0 | Exam timer fix, batch retry, cache pruning, data export/import, service worker |
| v3.1 | PBQs (CLI sim, topology builder), wrong answers bank, dark/light theme |
| v3.2 | Question quality validator, resource/video links, report issue button, CLI sim PBQs, topology builder PBQs |
| v3.3 | AI second-pass validator, auto-exclude reported questions, stronger prompts, explanation-answer agreement check, Explain Further button |
| v3.4 | Subnetting Trainer, Port Number Speed Drill, Pre-Quiz Topic Brief, Performance Analytics Dashboard (8 sections) |
| v3.4.1 | Port drill wrong answer review, enhanced 6-section deep explanations, drag-and-drop topology builder |
| v3.5 | Tech debt: APP_VERSION constant, magic number extraction, port timer cleanup, wrong bank/reports/history caps, XSS cleanup in showExplanation, retryQuiz/session validation pipeline, touch events for mobile topology, E key multi-select, /31 subnet guard, ARIA labels, meta description, SW relative paths, shared spaced rep scoring, dead code removal, analytics difficulty field fix |
| v3.6 | Infrastructure: Playwright E2E (64 tests), GitHub Actions CI/CD, auto-versioning, pre-commit hooks, Topic Deep Dive panel, Dependabot, security headers (CSP/X-Frame/Referrer-Policy), Lighthouse CI with performance budgets, production error monitoring with GitHub Issues auto-reporter, keyboard accessibility (skip link, focus trap, focus management, ARIA roles, visible focus rings), branch protection on main, Kanban board |
| v3.7 | Page transitions (fade-out/fade-in with slide), confetti celebration on exam pass (720+ score) |
| v3.8 | UI polish: SVG progress ring animation, skeleton loading screens, micro-interactions (bounce/shake on answer), glassmorphism cards, animated score counters |
| v3.9 | Analytics animations: staggered bar chart grow, difficulty/topic bar slide-in, calendar cell pop-in, card fade-in cascade |
| v4.0 | Analytics interactivity: bar chart hover lift with tooltip (% + date), calendar hover scale + tooltips, hottest day pulsing glow |
| v4.1 | Enhanced spaced rep (Leitner decay, wrong bank boost, weighted random top-3), analytics theme fix (RGB CSS vars for light/dark), study activity tracks questions not sessions |
| v4.2 | Tech debt: magic strings → constants (MIXED_TOPIC, EXAM_TOPIC, DEFAULT_DIFF, CLAUDE_API_URL, CLAUDE_MODEL), STORAGE object for all localStorage keys, silent catch block audit with user-facing toasts, CI tech debt monitor |
| v4.3 | Tech debt #16 + #19: Merged 5 pairs of duplicated quiz/exam render functions into single unified functions (renderMCQ/MultiSelect/Order/CliSim/Topology each take optional `ans` param for exam mode). Accessibility pass: aria-label on icon/arrow-only buttons, aria-pressed on flag/chip toggle state, aria-live on score/streak/timer, aria-expanded on question navigator, focus management on showPage, descriptive aria-labels on nav grid squares, subnet input accessible name |
| v4.4 | Port Drill adaptive focus: weighted port selection based on per-port miss rate (prototype for issue #25 adaptive coverage). Pregame shows weakest ports + accuracy; reset stats button |
| v4.5 | Analytics v2: enhanced `getReadinessScore()` with CompTIA domain weighting + recency/exam boosts, exam date input with days-to-exam countdown, readiness forecast (linear regression → days-to-75%), study streak card, subtopic weak spots mined from wrong bank, difficulty×topic heatmap, question type breakdown, exam vs quiz mode compare, drills summary card, 13 milestones with unlock tracking |
| v4.5.1 | Removed Readiness Forecast card. Exam date is now a click-anywhere calendar picker (native `showPicker()`), surfaced on both the analytics hero and the setup-page readiness card with day-to-exam countdown |
| v4.6 | Setup-page polish: hero stats strip (Qs, Avg, Streak, Qs today, Best exam) merged into hero, daily goal ring card with editable target and SVG progress ring, 33 topic chips grouped into 5 collapsible CompTIA domain sections with weight badges, Advanced section (API key + Export/Import) collapsed behind `<details>` and auto-opens on first visit |
| v4.7 | Topic coverage audit: added 7 new topics to close N10-009 exam blueprint gaps — Network Attacks & Threats (4.2), Physical Security Controls (4.5), Business Continuity & Disaster Recovery (3.3), Network Monitoring & Observability (3.2), Network Appliances & Device Functions (1.2), Data Center Architectures (1.8 spine-leaf/three-tier), DNS Records & DNSSEC (1.6). Total topics: 33 → 40. Updated `TOPIC_DOMAINS` + `topicResources` (Messer video links) + chip buttons routed to correct domain group |
| v4.8 | N10-009 scope tightening: (1) every question must include an `objective` field matching `/^[1-5]\.[1-8]$/` — `validateQuestions()` drops questions without it. (2) Prompt updated with mandatory N10-009 objective tagging + valid objective ranges + reminder that anything outside the N10-009 blueprint must be rejected. Per-topic expected objective injected from `topicResources`. (3) Mixed mode now uses `computeDomainDistribution(n)` (largest-remainder) to split questions across the 5 domains per official CompTIA weights (23/20/19/14/24) — prompt tells AI exactly how many questions per domain. (4) `injectPBQs()` stamps objectives on injected PBQs from the static bank |
| v4.9 | Port Drill Endless Streak mode: new `setPortMode()` toggle on the pregame screen switches between Timed (30s countdown) and Endless (no timer, one wrong answer ends the run). New `STORAGE.PORT_STREAK_BEST` tracks the endless high score separately from timed. `beginPortDrill` skips the `setInterval` in endless mode; `pickPort` calls `endPortDrill()` immediately on the first wrong answer; `endPortDrill` branches the final-score label ("streak length" vs "ports matched"), best-score key, and milestone logic per mode. New `streak_port_25` milestone (14th total) unlocks on a 25+ endless streak. Analytics drill card now surfaces both Timed best and Endless streak stats. Timer block is hidden in endless mode and score label flips to "STREAK" |
| v4.10 | Front-page overhaul: (1) **Quiz Presets** — 3 one-click tiles (5-min Warmup / 15-min Focused / 30-min Grind) above the Generate button via `applyPreset()`. Focused mode auto-picks your weakest topic or falls back to spaced-rep. (2) **Today's Focus chip row** — conditional row under hero that surfaces top 2 weakest topics (wrong-bank weighted + low-accuracy history) as one-tap chips via `getTodaysFocusTopics()` + `focusTopic()`. (3) **Daily Challenge card** — date-seeded deterministic topic (hashed YYYY-MM-DD into `TOPIC_DOMAINS`), 1-question mini quiz, tracks own streak in `STORAGE.DAILY_CHALLENGE`, flips to "complete" state when done for the day. `dailyChallengeMode` state flag routes completion through existing results flow + `completeDailyChallenge()`. (4) **Streak Defender card** — conditional amber pulsing warning when `current streak ≥ 3` AND no study activity today, one-tap fires a 5-Q mixed quiz via `startStreakSave()`. (5) **15 new milestones** (14 → 29 total): `perfect_quiz`, `five_exams`, `ten_exams`, `first_subnet`, `subnet_50`, `first_port_drill`, `all_ports_seen`, `first_session`, `night_owl`, `early_bird`, `weekend_warrior`, `diversity_5`, `deep_dive_10` (new `STORAGE.DEEP_DIVE_USES` counter incremented in `explainFurther()`), `daily_challenge_7`, `daily_challenge_30`. All evaluated in `evaluateMilestones()`. History entries now tag `mode: 'daily'` for daily challenge runs |
| v4.11 | **Port Reference panel** — collapsible `<details>` cheatsheet on the Port Drill pregame screen showing all 40 ports for memorization. `portCategories` groups protocols into 12 learning buckets (Web, Email, File Transfer, Remote Access, Name/Time, Network Config, Directory & Auth, Management, Routing, Database, VoIP, VPN/Tunneling). Three sort modes via `setPortSortMode()`: by Category (default, grouped), by Number (ascending), by Name (A–Z). Live search filter via `filterPortReference()` matches on protocol name or port number and hides empty category groups. Cards show `port / protocol / transport` with accent-colored port number. `renderPortReference()` called from `startPortDrill()`. Responsive grid — 2-col on mobile, auto-fill on desktop with 440px max-height scroll. Also relabeled the two overlapping front-page cards: the `#todays-focus` chip row is now "🎯 Weak spots" (reactive wrong-bank drill, 1 tap) and the `#session-banner` card is now "📚 STUDY PLAN" / "Start Study Plan" (proactive 3-topic coverage plan) — removes the confusing today/today collision. Internal IDs, classes, and function names unchanged. Daily Challenge card now hides entirely once done for the day (previously showed a "complete" state that lingered until tomorrow). Study Plan banner now hides once addressed for the day — new `isStudyPlanDoneToday()` helper returns true if any history entry today has `mode: 'session'` OR if every topic in today's plan has been drilled individually today. Both banners come back automatically at the next day rollover. **Topic Progress v2** — rewrote the `#page-progress` page: summary strip at top with counts by bucket (Strong/Solid/Weak/Untouched) + coverage bar (`touched/40`), toolbar with search input + filter chips (All/Weak/Untouched/Strong) + sort select (Worst first/Most recent/Most studied/A–Z), topics now grouped into 5 collapsible N10-009 domain sections via `TOPIC_DOMAINS` showing the domain's exam weight + average % in the header, objective badges (e.g. `1.2`) pulled from `topicResources` on each row. New `progressState` object holds filter/sort/search + cached rows; new helpers `_buildProgressRows`, `_sortProgressRows`, `_progressRowMatches`, `_progressRowHtml`, `_renderProgressSummary`, `_renderProgressGrouped`, `_bucketOf`; new public fns `setProgressFilter`, `setProgressSort`, `filterProgressPage`. Topic rows on Topic Progress now render the **short chip label** (from the setup page chip `textContent`) instead of the canonical `data-v` id — previously users saw unfamiliar long names like "Integrating Networked Devices" that didn't match the "Networked Devices & IoT" chip on the setup page. Canonical id still used for history lookups/drilling/grouping; only the display text changed. **Explanation panel + Deep Dive panel restyled to forced white background + black text** (hardcoded `#ffffff` / `#111111`, bypassing theme vars) with a colored left-border accent (green/red/purple) to preserve correct/wrong/deep-dive signaling — user feedback that their brain reads white-on-black explanations better than the green/red tinted dark panels. `drillTopic()` now also opens the target chip's collapsed domain `<details>` accordion on the setup page, `scrollIntoView` centers it, and applies a temporary `.chip-flash` animation (1.3s pulse + scale) so you can see exactly where you landed — previously tapping a Topic Progress row would select a chip invisibly hidden inside a closed accordion. Extended the same click-through behavior to the analytics page's **Topic Mastery** and **Priority Study Areas** sections — both now render rows with `ana-row-clickable` class + `onclick="drillTopic(...)"` so tapping any row jumps straight to setup with the chip selected, accordion opened, scrolled, and flashing. **Tech debt #18 fixed**: split 3 long functions out of the >80-line bucket. Extracted `renderResultsDifficultyBreakdown()` from `finish()` (84 → ~65 lines), `buildTopicDivePrompt()` from `showTopicDeepDive()` (83 → ~60 lines), and `buildWeightedTopicMap(historyEntries, now)` from `getReadinessScore()` (86 → ~73 lines). Long-function count: **11 → 8** (under tightened threshold of 8). Remaining offenders for a future refactor session: `fetchQuestions` (120), `submitExam` (117), `evaluateMilestones` (89), `renderCliSim` (92), `renderTopology` (131), `aiValidateQuestions` (86), `explainFurther` (101), and the elephant `renderAnalytics` (482). **Tech debt #17 fixed**: bulk-replaced inline `.style.*` assignments with CSS utility classes — `.is-hidden { display: none !important; }` and `.is-dimmed { opacity: 0.5 }`. All 74 `style.display = 'none'/'block'/'flex'/''` toggles became `classList.add/remove/toggle('is-hidden', ...)`, all 7 `style.opacity = '0.5'/'1'` toggles became `classList.toggle('is-dimmed', ...)`. Inline `.style.*` count: **117 → 37** (-80). Tech-debt monitor threshold tightened from 105 to 50 to lock in the win. **Important follow-up**: 17 elements in `index.html` had `style="display:none"` baked into the markup; a `classList.remove('is-hidden')` from JS could not override that inline style, so Playwright tests waiting on `subnet-next-btn`, `port-game`, `weak-banner`, `stats-card`, etc. all failed. All 17 inline `display:none` HTML attributes were converted to `class="... is-hidden"` so JS toggling actually shows the elements. Lesson: when you migrate JS toggling to a CSS class, audit the matching HTML markup for inline styles that would shadow the class. **Tech debt #23 fixed**: dead code sweep — removed unreferenced `ipToArr()` helper (replaced long ago by `octetsFromIp()`-style usage) and the unused `N10_009_OBJECTIVE_RE` constant (the actual objective validation in `validateQuestions` uses an inline substring regex with capture group for "Obj 1.4" / "1.4 — Routing" extraction, so the anchored constant was a duplicate that drifted out of use). UAT swapped the `N10_009_OBJECTIVE_RE` symbol assertion for a regex-pattern presence check. **Tech debt #20 fixed**: service worker now hard-caps the runtime cache at `CACHE_MAX_ENTRIES = 60` and FIFO-evicts via a new `trimCache()` helper called after every `cache.put`. 5xx responses are no longer cached and now fall back to the cached copy when available, so a Vercel/origin outage no longer breaks the offline app. Cache bumped to `netplus-v4.11.7`. **Tech debt #24 fixed**: new `.github/workflows/auto-add-to-board.yml` listens for `issues.opened/labeled/reopened` and adds the issue to Board #1 (`tech-debt`/`bug`) or Board #2 (`feature-idea`) via GraphQL `addProjectV2ItemById`. Replaces the unreliable built-in GitHub Projects auto-add workflow that did not fire for REST-API-created issues. Project IDs are looked up at runtime by project number so they're never hardcoded. Both this workflow and the existing tech-debt issue-creation block in `ci.yml` now use `secrets.PROJECT_TOKEN || secrets.GITHUB_TOKEN` — `PROJECT_TOKEN` is a PAT with the `project` scope (the default `GITHUB_TOKEN` lacks it, which is why the existing inline GraphQL block in the tech-debt job had been silently failing) |

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
- Weekly cadence: Tuesdays for bugs, Thursdays for tech debt
- Tighten tech debt thresholds as debt is paid down

### Feature Ideas tracker
- [Board #2](https://github.com/users/oremosu98/projects/2) — future feature candidates only
- Label: `feature-idea` (purple)
- Priority field: 🔥 Must Have, ⭐ Should Have, 💡 Nice to Have, 🧊 Someday
- Effort field: XS / S / M / L / XL
- Tie-in field: Cert SaaS Vision / Quiz App Only / Both
- Tied to product vision doc at `~/Desktop/Dev Projects/product-vision/PRODUCT-VISION.md`
- No weekly cadence — this is a long-term idea backlog, not an active sprint queue
- Promote to Board #1 (as `tech-debt` or regular work) only when actually scheduled

### Routing rules
- Broken behavior / regression / crash → Board #1 with `bug`
- Code smell / duplication / architecture → Board #1 with `tech-debt`
- New capability / UX enhancement / product direction → Board #2 with `feature-idea`
- Every item is an individual issue — no master checklists

### Auto-add to boards
- `.github/workflows/auto-add-to-board.yml` listens for `issues.opened/labeled/reopened` and routes via GraphQL: `tech-debt`/`bug` → Board #1, `feature-idea` → Board #2
- Requires repo secret `PROJECT_TOKEN` (a PAT with `project` scope) — without it the GraphQL `addProjectV2ItemById` call fails because the default `GITHUB_TOKEN` does not carry the `project` scope

## Infrastructure Template
A reusable infrastructure blueprint lives at `~/Desktop/Dev Projects/INFRASTRUCTURE-TEMPLATE.md`. Product vision and architecture visuals live at `~/Desktop/Dev Projects/product-vision/`. Update both when we refine the approach here.

## Common Gotchas
- The `pick()` function targets `#options .option` — CLI sim diagnosis MCQ must be inside `#options` div
- Topology scoring uses `correctPlacements` object mapping device→zone name (exact string match)
- Exam answers init must include `cliRan: [], topoState: {}` for PBQ types
- `hasAnswer` checks must include `Object.keys(a.topoState || {}).length > 0`
- Service worker cache name must be bumped on every deploy or users get stale files
- Vercel CLI requires nvm path export: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`
