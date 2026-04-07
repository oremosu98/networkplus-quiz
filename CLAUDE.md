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
`topicResources` object maps all 33 topics to Professor Messer N10-009 YouTube search URLs with exam objective numbers.

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

## CSS Theme System
Dark theme in `:root`, light theme in `[data-theme="light"]`. Key variables: `--bg`, `--surface`, `--accent`, `--text`, `--green`, `--red`, `--yellow`. Toggle via `toggleTheme()`.

## Common Gotchas
- The `pick()` function targets `#options .option` — CLI sim diagnosis MCQ must be inside `#options` div
- Topology scoring uses `correctPlacements` object mapping device→zone name (exact string match)
- Exam answers init must include `cliRan: [], topoState: {}` for PBQ types
- `hasAnswer` checks must include `Object.keys(a.topoState || {}).length > 0`
- Service worker cache name must be bumped on every deploy or users get stale files
- Vercel CLI requires nvm path export: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`
