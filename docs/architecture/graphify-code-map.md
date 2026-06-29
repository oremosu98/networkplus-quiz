---
type: architecture
status: active
cert: all
updated: 2026-06-29
tags: [architecture, convention]
---
# Graphify Code Map — Tooling & Lessons

<!-- graphify:touches getMilestones evaluateMilestones -->

> HOW the code runs (pairs with the Obsidian vault = WHY). The graphify code map is a local
> who-calls-what graph of all JS/SQL/CSS, auto-rebuilt every commit. This doc is the durable
> reference for the **query tooling** built on top of it, plus the **lessons** that were paid for
> in blood getting it reliable.

## What exists (all in gitignored `graphify-out/`, regenerated each commit)

| Artifact | What it is | Built by |
|---|---|---|
| `graph.json` | node-link graph: `calls`/`contains`/`rationale_for` edges | `graphify .` (post-commit hook) |
| **`scripts/graphq.js`** | **primary query CLI** — see below | committed |
| `scripts/graphify-enhance.js` | post-build enricher (runs after `graphify .` in the hook) | committed |
| `graph-plus.html` | interactive impact-explorer (search, impact mode, URL deep-links) | enhancer |
| `CHANGE_IMPACT.md` | diff vs last build + affected hubs + suggested tests | enhancer |
| `FRESHNESS.md` | structure + label freshness | enhancer |
| `obsidian/_COMMUNITY_*.md` | one navigable note per community | enhancer |
| `decision-links.json` | code↔decision bridge from `graphify:touches` doc tags | enhancer |
| `.graphq-label-cache.json` | per-node-id name cache (powers label persistence) | enhancer |

## Query interface — consult BEFORE grepping app.js

```bash
node scripts/graphq.js find <q>                 # fuzzy-match nodes
node scripts/graphq.js inspect <fn>             # callers/callees/rationale/tests panel
node scripts/graphq.js impact <fn> [--depth N]  # what breaks if you edit <fn> (upstream callers)
node scripts/graphq.js callers|callees <fn>
node scripts/graphq.js community <name|id>      # a community's files + hubs
node scripts/graphq.js file <path> | path <a> <b> | stale
# add --json for machine output. graph-plus.html mirrors this visually.
```

## Decision bridge (dogfood it)
Add `<!-- graphify:touches fnName otherFn -->` to any doc → the enhancer links that doc to those
code nodes. Surfaces in `graph-plus.html`'s **Why** tab and the community notes' "Related decisions".
This file tags `getMilestones`/`evaluateMilestones` as a live example.

## Label durability (the mechanism)
`graphify .` re-clusters and **renumbers** communities every commit, dropping names. The enhancer
caches each descriptive name **by node-id** (stable across re-clustering) and, after each rebuild,
restores every generic community by **majority-voting** its name from members' cached names — **zero
API calls**. A keyed `graphify label` is only needed when genuinely NEW code forms a community with
no cached members; `graphq stale` / `FRESHNESS.md` flag exactly that.

## Lessons (hard-won 2026-06-29)

1. **`graphify label` fails SILENTLY without `ANTHROPIC_API_KEY` in the shell.** It does not error
   out — it prints `using Community N placeholders` and exits 0, looking like success. The key is NOT
   in the shell profile; it must be `export`ed in the **same shell** as the command. This burned
   multiple round-trips. Always: `export ANTHROPIC_API_KEY=…; graphify label …` and grep the output
   for "placeholders".

2. **Two-clock freshness is real and silent.** Structure rebuilds free every commit; labels need an
   LLM pass. They desync on every rebuild, so a fresh-looking `graph.html` (frozen at the last label
   run) can mask a 58%-unlabeled live `graph.json`. Judge label freshness by **actual name presence
   (% unlabeled)**, never by a "built from commit" string. The per-node-id cache (above) is the
   durable fix — names now survive rebuilds automatically.

3. **Debugging process: capture the actual command output BEFORE proposing fixes.** The thrash here
   came from sending the user to re-run a command blindly across several turns instead of capturing
   its full stdout/stderr once — which immediately revealed the "No API key … using placeholders"
   line. When a CLI "succeeds" but produces wrong output, the warning is usually right there. Don't
   guess across round-trips; get the output.

4. **Never run a MUTATING command to "reproduce" a bug on the live artifact.** Running `graphify label`
   keyless during diagnosis re-clustered the real graph. Repro mutating commands on a copy, or use a
   read-only probe.

5. **Generated files need a committed generator, not a hand-edit.** `graph.html` is overwritten every
   commit; the enhanced viewer had to be a generator (`graphify-enhance.js`) wired into the hook, not
   a hand-edited file.

6. **When `Edit` won't match a line that looks identical, inspect raw bytes** (`od -c`). A `\x01`
   control char had been injected into a template's empty-string literal — invisible in normal view,
   fatal to exact-match editing (and a real runtime bug).

## Related
[[CLAUDE]] · [[structure-overview]] · [[key-patterns]] · [[Home]]
