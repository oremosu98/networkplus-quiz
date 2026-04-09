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

### Known gotcha
- Auto-add workflow does not fire for issues created via REST API (see #24) — add manually via GraphQL `addProjectV2ItemById` until fixed

## Infrastructure Template
A reusable infrastructure blueprint lives at `~/Desktop/Dev Projects/INFRASTRUCTURE-TEMPLATE.md`. Product vision and architecture visuals live at `~/Desktop/Dev Projects/product-vision/`. Update both when we refine the approach here.

## Common Gotchas
- The `pick()` function targets `#options .option` — CLI sim diagnosis MCQ must be inside `#options` div
- Topology scoring uses `correctPlacements` object mapping device→zone name (exact string match)
- Exam answers init must include `cliRan: [], topoState: {}` for PBQ types
- `hasAnswer` checks must include `Object.keys(a.topoState || {}).length > 0`
- Service worker cache name must be bumped on every deploy or users get stale files
- Vercel CLI requires nvm path export: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`
