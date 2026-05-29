# Conventions & Lessons

> Extracted from CLAUDE.md (v7.8.2 slim-down). Referenced by a one-line pointer there.

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
