# Skill Reference

Every skill currently available to me in this chat, grouped by what it does. Updated 2026-05-19.

The harness auto-fires skills based on their `description:` field matching what you're saying / what I'm about to do. You can also force one with **"use X"** in chat (e.g. *"use brainstorming"*).

---

## Core · used most weeks

| Group | Skill | Purpose |
|---|---|---|
| **Voice** | `stop-slop` | Kill AI writing patterns (filler, binary contrasts, false agency, adverbs, em-dashes) |
| **Voice** | `humanizer` | Tone + voice; broader signs-of-AI sweep (inflated symbolism, rule-of-three, vague attributions) |
| **Design** | `taste-skill` | Editorial-premium UI direction (bronze / hairline / 0-emoji); routes to a style sub-pack |
| **Design** | `emil-design-eng` | Motion, micro-interactions, polish — the invisible details |
| **Design** | `impeccable` | Design quality bar — visual hierarchy, IA, tokens, anti-patterns, hand-tuned details |
| **Spec/Plan** | `brainstorming` | **Before any code**: extracts the real spec via dialogue. Pushes back on vague briefs |
| **Spec/Plan** | `writing-plans` | Writes an implementation plan a junior could follow (TDD, YAGNI, DRY) |
| **Execution** | `subagent-driven-development` | Dispatches a fresh subagent per task with 2-stage review (spec then quality) |
| **Execution** | `dispatching-parallel-agents` | Fires multiple subagents in parallel for genuinely independent tasks |
| **Execution** | `using-git-worktrees` | Isolated worktree for feature work before plan execution |
| **Quality** | `test-driven-development` | Red/green TDD — no implementation code before a failing test |
| **Quality** | `verification-before-completion` | **Run the verification command and show output BEFORE claiming "done"** |
| **Debug** | `systematic-debugging` | **Root cause first**; no symptom patches. 4-phase scientific-method debugging |
| **Review** | `requesting-code-review` | Dispatches a code-reviewer subagent with crafted context |
| **Review** | `receiving-code-review` | Apply review feedback with rigor; question questionable suggestions |
| **Review** | `review-feature` | YOUR existing 4-agent review (Architect / Engineer / Reviewer / Optimizer) for big features |
| **Review** | `review` | Review a pull request |
| **Review** | `security-review` | Security review of pending changes on the current branch |
| **Wrap-up** | `finishing-a-development-branch` | Decide how to merge / PR / clean up once tests pass |

## Code & repo utilities

| Skill | Purpose |
|---|---|
| `simplify` | Review changed code for reuse, quality, efficiency; fix what it finds |
| `init` | Initialize a new `CLAUDE.md` from scratch (codebase docs) |
| `claude-api` | Build / debug / migrate Claude API / SDK apps with prompt caching |
| `writing-skills` | Create / edit / verify SKILL.md files themselves |
| `anthropic-skills:skill-creator` | Anthropic's official skill-builder + eval / variance / triggering optimization |

## Files & deliverables

| Skill | Purpose |
|---|---|
| `anthropic-skills:pdf` | Read / merge / split / fill / OCR / extract from PDFs |
| `anthropic-skills:docx` | Create / edit Word documents (reports, memos, letters, templates) |
| `anthropic-skills:xlsx` | Create / clean / chart spreadsheets (.xlsx / .csv) |
| `anthropic-skills:pptx` | Create / edit slide decks |

## Harness config & automation

| Skill | Purpose |
|---|---|
| `update-config` | Edit `settings.json` (permissions, env vars, hooks, automated behaviors) |
| `keybindings-help` | Customize `~/.claude/keybindings.json` |
| `fewer-permission-prompts` | Scan transcripts → allowlist common read-only Bash/MCP in `.claude/settings.json` |
| `loop` | Run a prompt / slash command on an interval (e.g. `/loop 5m /foo`) |
| `schedule` | Cron-style scheduled remote agents (routines) |
| `anthropic-skills:consolidate-memory` | Reflective pass over `~/.claude/.../memory/MEMORY.md` — merge duplicates, prune index |

## Meta · the bootstrap

| Skill | Purpose |
|---|---|
| `using-superpowers` | Bootstrap that says "invoke skills BEFORE any response" (chat-start trigger; mostly fires automatically) |

## Cowork (only if you use Cowork mode)

| Skill | Purpose |
|---|---|
| `anthropic-skills:setup-cowork` | Guided Cowork setup |
| `cowork-plugin-management:cowork-plugin-customizer` | Tailor a plugin for org workflows / tools |
| `cowork-plugin-management:create-cowork-plugin` | Build a new plugin from scratch in a Cowork session |

---

## Filesystem locations

| Where | What lives there |
|---|---|
| `~/.claude/skills/` | **Standalone skills** (hot-discovered mid-chat) — currently 18 folders: the 4 hand-installed (`taste-skill`, `stop-slop`, `humanizer`, `emil-design-eng`) + the 14 Superpowers skills I copied here on 2026-05-19 so they'd activate in this long-running chat |
| `~/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/` | The Superpowers plugin install (will auto-attach to NEW chats; not active in this one) |
| `~/.claude/plugins/cache/claude-plugins-official/anthropic-skills/...` | The `anthropic-skills:*` plugin (already attached) |
| `~/.claude/plugins/cache/claude-plugins-official/cowork-plugin-management/...` | Cowork plugin (already attached) |
| `~/.claude/plugins/mcpmarket-my-toolkit/` | MCPmarket gateway (attaches to NEW chats — not active in this one) |
| Built into the harness | `update-config`, `keybindings-help`, `simplify`, `fewer-permission-prompts`, `loop`, `schedule`, `claude-api`, `review-feature`, `impeccable`, `init`, `review`, `security-review` |

---

## Known duplicates (this chat only)

Because I copied Superpowers' 14 skills into `~/.claude/skills/` to make them work in this long-running thread, several skills now appear **twice** — once bare and once as `superpowers:<name>`:

`brainstorming` + `superpowers:brainstorming` · `writing-plans` + `superpowers:writing-plans` · `subagent-driven-development` + `superpowers:subagent-driven-development` · `dispatching-parallel-agents` + `superpowers:dispatching-parallel-agents` · `executing-plans` + `superpowers:executing-plans` · `test-driven-development` + `superpowers:test-driven-development` · `systematic-debugging` + `superpowers:systematic-debugging` · `verification-before-completion` + `superpowers:verification-before-completion` · `requesting-code-review` + `superpowers:requesting-code-review` · `receiving-code-review` + `superpowers:receiving-code-review` · `finishing-a-development-branch` + `superpowers:finishing-a-development-branch` · `using-git-worktrees` + `superpowers:using-git-worktrees` · `using-superpowers` + `superpowers:using-superpowers` · `writing-skills` + `superpowers:writing-skills`

**Same content** — either invocation works. In a *fresh* chat after the next session start, only the `superpowers:*` versions will appear (because the plugin reactivates and I won't need the standalone-copy workaround). At that point you can delete the 14 bare folders in `~/.claude/skills/` if you want to tidy up.

---

## How a skill fires

1. **Auto-trigger** — the harness watches your messages + my pending actions; when a skill's `description:` matches the cue (e.g. "build / add / create" → `brainstorming`; "fix the bug" → `systematic-debugging`; "verify it" → `verification-before-completion`), it loads.
2. **Force it** — say *"use brainstorming"* / *"use the systematic-debugging skill"* and I'll load it on the next turn.
3. **Skip it** — say *"skip [name] on this"* and I won't fire it for that turn.

Your `CLAUDE.md` overrides any skill behavior that conflicts with it.

---

**Last updated**: 2026-05-19 · v5.5.12 ship cycle
