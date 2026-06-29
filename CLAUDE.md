# CertAnvil — Project Guide

> **This file reloads on every tool call — keep it lean.** Hard cap: **~200 lines / ~25KB** — CI (`tests/uat.js`) fails the build past **250 lines or 30KB**. Deep or task-specific detail lives in `docs/` and `CHANGELOG.md` behind the one-line pointers below; rule of thumb — if it's only needed for *some* tasks, it doesn't belong in this always-loaded file. Version History: inline only the **last 3 ships**, one terse line each.

## Context
- **Single-user app currently** (the user is the student prepping for real N10-009). Explains why items like per-user API cost telemetry are deferred.
- **Future pivot**: paid multi-cert SaaS. Anything tagged `saas-gated` is **frozen** until that trigger fires (see Decision rules).
- **⏳ PENDING GO-LIVE — onboarding flow**: built + deployed (v7.32.0) but gated **OFF** via Supabase `app_config.onboarding_enabled=false`. The ONLY thing that turns it on for real users is a manual SQL flip in Supabase (easy to forget). At launch / Apple submission, run the flip per [docs/mobile/APP_STORE_DISTRIBUTION.md](docs/mobile/APP_STORE_DISTRIBUTION.md) (§GO-LIVE). Kill-switch = set it back to false. **If the user mentions launching / going live / Apple submission, remind them of this flip.**
- **Origin**: Notion-native flashcard quiz (2026-03-28) → standalone web app (2026-04-02). **Notion sync is not on the roadmap — do not re-propose.**
- **External reviewer**: user periodically pastes OpenAI Codex feedback as a product-review signal.

## Architecture
- **Type**: Static HTML/JS/CSS single-page app — no framework, no build step.
- **AI**: three-way Claude split, direct browser fetch (`anthropic-dangerous-direct-browser-access: true`); user supplies their own API key (`STORAGE.KEY`). Haiku 4.5 `CLAUDE_MODEL` = bulk generation (`fetchQuestions`, `tbGenerateAiTopology`); Sonnet 4.6 `CLAUDE_VALIDATOR_MODEL` = semantic second-pass (`aiValidateQuestions`); Sonnet 4.6 `CLAUDE_TEACHER_MODEL` = authoritative teacher content (Tier A/B/C — see key-patterns doc).
- **Storage** (Phase C′): cloud-canonical, localStorage as ephemeral session cache. Source of truth = Supabase (`profiles.metadata` jsonb + `quiz_history`). Write path: localStorage → `_cloudFlush(STORAGE.X)` → 1500ms debounced cloud write. Hydrate: SIGNED_IN → `cloudStore.hydrate()`. Anonymous users get the full app via localStorage only. Cross-subdomain session via cookie-backed Supabase adapter on `Domain=.certanvil.com`.
- **Hosting**: Vercel — `networkplus.certanvil.com` (+ per-cert subdomains, "Pattern A") + `certanvil.com` (separate landing project).
- **Offline/PWA**: service worker (stale-while-revalidate + Supabase API pass-through + auto-reload-on-update). **Cache name MUST bump every deploy — use `bump-version.js`, never hand-edit.** Installable via `manifest.json`.
- **Code map (graphify) — for HOW the code works; CONSULT BEFORE grepping/reading `app.js`**: `graphify-out/` holds a local *who-calls-what* graph of all JS/SQL/CSS (gitignored; **auto-rebuilt every commit** via `.githooks/post-commit`, no API key). To trace logic or "what depends on X", **query the graph first** — much faster and far cheaper on tokens than reading the ~19K-line `app.js`. Artifacts: `graph.json` (parse/query directly), `graphify-out/GRAPH_REPORT.md` (~113 named-cluster overview), `graph.html` (visual). Cluster *names* refresh rarely via the **claude backend** (the Gemini path fails on new `AQ`-format keys): `ANTHROPIC_API_KEY=… graphify label . --backend claude --model claude-sonnet-4-6` (needs the `anthropic` extra: `uv tool install ~/graphify --with openai --with anthropic --force`). If `graphify-out/` is missing, rebuild: `graphify .`.
- **Decision map (Obsidian vault) — for WHY/what-was-decided**: the repo root is an Obsidian vault; for constraints, conventions, prior specs, ADRs, or rejected approaches, start at [[Home]] or a topic MOC ([[Drills MOC]], [[Mobile MOC]], [[Design MOC]], [[Decisions MOC]]) and follow each doc's `## Related` `[[wikilink]]` footer — faster than blind-grepping `docs/` (120 files), and surfaces connected decisions. Pairs with graphify: graphify = how the code runs, vault = why it's built this way.

## Files
| File | Purpose | Size |
|---|---|---|
| `index.html` | All page structures (30+ pages: setup, quiz, exam, results, review, subnet, ports, drills launcher, topology, topology-builder-v3, analytics, progress, guided labs, …) + global chrome (sidebar + topbar incl. `#topbar-bug-report` iconbtn that lazy-loads `features/reports.js`) | ~115 KB |
| `app.js` | All app logic — state, AI calls, rendering, game loops, analytics, 5 activity sub-systems, cloud-flush hooks. Exposes `window.CURRENT_CERT` + `window.CERT_PACK` for lazy-loaded feature modules. | **~964 KB / ~19K lines** |
| `styles.css` | Full dark/light theme styling + account pill + cert switcher + `@media (prefers-reduced-motion)` gate | ~540 KB / ~14.5K lines |
| `dg-system.css` | Editorial design-system overrides — forged-bronze tokens, scoped page reskins, `.br-*` bug-report drawer block (incl. scoped `[hidden]{display:none!important}` since component `display:flex` rules otherwise override the attribute) | growing |
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
| `tests/uat.js` | UAT suite — **~4,005 checks** as of v7.19.4, embeds validation-audit gate | ~19.7K lines |
| `tests/tech-debt.js` | CI thresholds: long-function count, LOC, global count, etc. | 131 lines |
| `tests/validation-audit.js` | 23-Q broken-corpus regression fixture (60% catch floor, 0 FP ceiling) | 589 lines |
| `tests/deploy-verify.js` | Post-deploy smoke against prod (comment-strip fix v4.89.9 / dc844a2) | 335 lines |
| `tests/e2e/app.spec.js` | Playwright E2E (99 tests as of v4.89.x) | — |

**Reality check:** `app.js` size is the driver for [#138](https://github.com/oremosu98/certanvil/issues/138) (module split) — `saas-gated`, don't start without pivot trigger. `styles.css` growth drove [#55](https://github.com/oremosu98/certanvil/issues/55) — same gate.

## Deep reference (read on demand)
- **Project & folder map** — where everything lives + how it deploys (1 repo → certanvil-app serving all 7 certs + certanvil-landing) + the sibling archive → [docs/architecture/structure-overview.md](docs/architecture/structure-overview.md)
- **Key patterns** — quiz flow, question types, exam mode, AI teacher tiers, ground-truth tables, curated exemplar bank, 7-layer validation pipeline, weak-spots, readiness, milestones, keyword highlighting, animation inventory → [docs/architecture/key-patterns.md](docs/architecture/key-patterns.md)
- **Feature sub-architectures** — Topology Builder, Subnet Trainer, Drills launcher → [docs/architecture/feature-subsystems.md](docs/architecture/feature-subsystems.md)
- **Conventions & lessons** — testing philosophy, progressive disclosure, magic-number constants, tier-threshold anchoring, prescriptive analytics, lesson authoring, scope disambiguation, live-verify, scenario `autoBuild` → [docs/conventions/conventions.md](docs/conventions/conventions.md)
- **Regression-Guard Tombstones** — deleted code that must stay deleted → [docs/conventions/regression-tombstones.md](docs/conventions/regression-tombstones.md)
- **Project boards, weekly cadence, external references** → [docs/conventions/workflow.md](docs/conventions/workflow.md)
- **Audits / planning / mobile docs** — coverage/editorial/writing/motion/security audits → `docs/audits/`; rebrand + social planning → `docs/planning/`; mobile/iOS baseline + optimization + app-store + Phase-11B → `docs/mobile/`; all build/monetization plans → `docs/superpowers/plans/`. (Only `IOS_TESTING.md`, `SHIP_CHECKLIST.md`, `ENVIRONMENT_STRATEGY.md`, `CHANGELOG.md` stay at repo root — pinned by `tests/uat.js` / tooling.)
- **Design assets** — `design/` (`brand/` kit; **`svg-icons/`** = the curated bespoke CertAnvil icon set — reach for it, or generate themeable `currentColor` variants from it, when building UI; `hallmark-mockups/`, `experiments/`). **`mockups/` (repo root) is the source-of-truth design view — every feature is built as a faithful lift of its mockup; kept deploy-served (`vercel.json`) so mockups can be previewed on-device.** `dogfood/` (root) is a documented smoke-test path.

## Decision rules

### `saas-gated` label
Items tagged `saas-gated` on either board are **frozen until the paid-SaaS pivot triggers — do NOT pull one without explicit pivot direction.** Currently gated: [#21](https://github.com/oremosu98/certanvil/issues/21) (wrap globals into state objects), [#55](https://github.com/oremosu98/certanvil/issues/55) (split `styles.css`), [#123](https://github.com/oremosu98/certanvil/issues/123) (social-proof counter), [#135](https://github.com/oremosu98/certanvil/issues/135) (per-user API cost telemetry), [#136](https://github.com/oremosu98/certanvil/issues/136) (entitlements + tier quotas), [#137](https://github.com/oremosu98/certanvil/issues/137) (cost-floor model), [#138](https://github.com/oremosu98/certanvil/issues/138) (module-split `app.js`, v5.0 trigger), [#139](https://github.com/oremosu98/certanvil/issues/139) (readiness-algorithm tuning).

### Testing Discipline — NEVER write to user-state localStorage on prod
**Hard rule, no exceptions.** When using the Chrome MCP `javascript_tool` (or anything that runs JS in the user's connected browser), NEVER call `localStorage.setItem/removeItem/clear` on a prod or `*.vercel.app` host — it overwrites the user's real `nplus_*` progress with no undo (this rule was bought with a real v4.81.x data-loss incident). Use one of: a **local server** (`python3 -m http.server 3131` → `localhost`), a **Vercel preview deploy**, or a fresh **incognito window**. Read-only evals on prod are fine. Full incident write-up + the shipped recovery layers live in [docs/conventions/conventions.md](docs/conventions/conventions.md).

## Deployment

### Ship checklist
[`SHIP_CHECKLIST.md`](./SHIP_CHECKLIST.md) codifies the pre-push discipline in 6 phases (automated checks → version+cache → live-verify → schema/RLS → final pre-push gate → post-push smoke). **Walk the Ship checklist before every meaningful push;** skip phases deliberately, not implicitly.

### Multi-engineer feature review
[`.claude/skills/review-feature/SKILL.md`](./.claude/skills/review-feature/SKILL.md) fires 4 parallel agents (Architect/Engineer/Reviewer/Optimizer) for non-trivial proposals (3+ files / new subsystem / schema change / multi-step flow). For trivial ships, just walk the Ship checklist.

### Two paths — prefer push
1. **Canonical**: `git push origin main` → GitHub Actions (UAT + Playwright + `tech-debt.js`) → Vercel auto-deploy → post-deploy smoke. Branch protection requires the "UAT + Playwright" check; admin bypass for emergencies only.
2. **Local quick-ship** (bypasses CI): `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"` then `npx vercel --prod --yes`. **Commit immediately before/after** — git↔prod drift once cost 6 versions (v4.39→v4.43.1).

### Version bumps
`node scripts/bump-version.js <new> "<desc>"` updates `APP_VERSION` (app.js) + `CACHE_NAME` (sw.js) + version badge (index.html) + `package.json` + **prepends a 1-line stub row to the Version History table below**. Do NOT hand-edit partial — UAT asserts consistency across all 4 code surfaces. **The stub STAYS a one-line stub here — never expand it inline; full ship detail goes in the commit message + CHANGELOG.md (expanding rows inline is exactly what bloated this file).** The script writes CLAUDE.md, so re-read it before any follow-up edit (any prior snapshot is stale).

## Branching Strategy — Risk-Tiered (adopted 2026-05-12)

> **Full spec: [`ENVIRONMENT_STRATEGY.md`](./ENVIRONMENT_STRATEGY.md)** — read it before any DB/auth/payments/SW change.

**The decision rule: does the change touch the database schema, money, auth, or the service worker? YES → gated lane. NO → fast lane.**

| Lane | Triggers | Flow |
|---|---|---|
| **Fast** (~90%) | exemplars, retention concepts, UI/CSS, copy, non-schema JS, docs, drills | commit → `main` → push → CI → Vercel prod |
| **Gated** (~10%) | `supabase/migrations/*` · `landing/api/{stripe,ai,diagnostic}/*` · `auth-state.js` · `cloud-store.js` · `lib/supabase.js` · `sw.js` · RLS/entitlements/quota | feature branch → PR (auto-spins Supabase branch DB + Vercel preview + CI) → smoke-test preview → squash-merge → prod |

**Gated-lane migration rule**: every `supabase/migrations/*` file dated ≥ 2026-05-12 MUST carry a tested `-- ROLLBACK:` block (pre-cutoff grandfathered → PITR). Gated ships also need migration-applied + env-vars-set + redeploy, and endpoints must graceful-503 on missing env vars.

## Local Development
```bash
cd "/Users/simioremosu/Desktop/Dev Projects/certanvil"
python3 -m http.server 3131   # → http://localhost:3131
```
Pre-commit hook (`.githooks/pre-commit`, wired via the `package.json` `prepare` script): runs `node tests/uat.js` + the CLAUDE.md-freshness check + a data-safety scan; skips UAT for docs-only commits. Bypass with `git commit --no-verify`.

**Moving/renaming files:** use `git mv old new` (never raw `mv`) so `git blame`/history follows — confirm the staged diff reads `renamed:`. Full lesson → [docs/conventions/conventions.md](docs/conventions/conventions.md).

## Test Suite
```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js                # UAT (embeds the validation-audit gate)
node tests/tech-debt.js          # CI thresholds — LOC, globals, long-function count
node tests/validation-audit.js   # broken-corpus fixture, ≥60% catch / 0 FP
npx playwright test              # E2E (tests/e2e/app.spec.js)
```
**Don't tune `validateQuestions()` without running `validation-audit.js` first** — the `MIN_CATCH_RATE = 60` / `MAX_FP_RATE = 0` floor is CI-enforced inside UAT.

## Version History

> **Older releases live in [CHANGELOG.md](./CHANGELOG.md).** Inline only the **last 3 ships**, **one line each (version + a one-line summary — never multi-paragraph)**. `bump-version.js` prepends a 1-line stub below; it **stays a stub** — full detail goes to the commit message + CHANGELOG.md. Trim back to 3 at the next consolidation.

| Version | Features Added |
|---|---|
| v7.60.0 | Per-cert milestones + 12 drill milestones (Sim Lab/Decision Lab/Why-Not/Gauntlet) + orphan cleanup + bronze celebration toast |
| v7.59.0 | Decision Lab: cloud-cert scenario decision drill (engine + 4 seed banks) |
| v7.58.0 | Sim Lab: A+ Core 1 (220-1201) + Core 2 (220-1202) PBQ seed banks live (cert rollout) |

_Older releases (v7.55.0 and back) live in [CHANGELOG.md](./CHANGELOG.md) — v7.55.0 + v7.54.1 + v7.54.0 ported during the 2026-06-25 v7.56.0 night-end consolidation (Sim Lab session-mode marathon)._

## CSS Theme System
Dark theme in `:root`, light theme in `[data-theme="light"]`. Key variables: `--bg`, `--surface`, `--accent`, `--text`, `--green`, `--red`, `--yellow`. Toggle via `toggleTheme()`.

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

---

## Post-deploy verification (always run after ship)

Headless UAT + Playwright can pass while real users see broken UI — it happened repeatedly across the v6.5.x run. After any feature/fix lands on `main` and Deploy Verification reports success, **drive the live prod URL in a real browser before claiming done**:

1. **Cache-bust navigate** to the prod URL with a `?_cb=<version>` query (bypass the SW cache) using the Chrome MCP tools.
2. **Reproduce the user's exact click path** — don't shortcut via JS calls; click through mode pills / pickers as a user would.
3. **Measure DOM rects + computed styles**, not just internal state (canvas/panel sizes, theme-token colors, new-panel `position`/`transform`/`display`, viewport visibility).
4. **Walk the full flow** end-to-end (first interaction → advance → completion → exit → reload).
5. **Only then claim "shipped + verified".** Ship a hotfix before signing off if anything's off.

## Related
[[structure-overview]] · [[key-patterns]] · [[conventions]] · [[ENVIRONMENT_STRATEGY]] · [[SHIP_CHECKLIST]] · [[BRAND]]

**Skip only when** the change is purely backend/data/docs with no user-facing surface, or behind a flag that's off in prod. Reason this rule exists: UAT regex-tests source strings and Playwright runs fresh navigations — both miss live-interaction layout bugs, theme-mismatched colors, viewport carry-over, and CSS-grid collisions.
