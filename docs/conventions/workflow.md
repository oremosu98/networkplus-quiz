---
type: convention
status: active
cert: all
updated: 2026-06-29
tags: [convention]
---
# Project Boards, Cadence & External References

> Extracted from CLAUDE.md (v7.8.2 slim-down). Referenced by a one-line pointer there.

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

## Related
[[conventions]] · [[regression-tombstones]] · [[CLAUDE]] · [[SHIP_CHECKLIST]] · [[ENVIRONMENT_STRATEGY]]
