---
name: ship
description: Walk the CertAnvil ship flow end-to-end — lane decision, automated checks, version bump, push, and post-deploy verification. Use when the user says "ship it", "/ship", "release this", "push to prod", or asks to deploy a change. The runbook that drives SHIP_CHECKLIST.md instead of re-explaining it every time.
---

# /ship — CertAnvil release runbook

This is the **agent runbook** for shipping. [`SHIP_CHECKLIST.md`](../../../SHIP_CHECKLIST.md) is the source of truth for *what* each phase requires; this skill is *how the agent walks it* — deciding the lane, running the right scripts, and not skipping a STOP CONDITION silently.

**Use when**: a change is code-complete and the user wants it live (`/ship`, "ship it", "release", "push to prod").

**Don't use for**: work that isn't finished, exploratory edits, or a change the user explicitly wants to keep local. If nothing is staged/committed and there's no diff, stop and ask what to ship.

Required PATH for every node/gh/vercel command this session:
```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$HOME/.local/bin:$PATH"
```

---

## Step 0 — Read the diff, pick the lane

```bash
git status -sb && git diff --stat HEAD
```

First, **isolation check** — is the working tree carrying unrelated WIP? If `git status` shows modified files you didn't touch for this ship (e.g. someone's in-flight `app.js`/`index.html` work), do NOT ship over it — a version bump writes into `app.js` + `index.html` and will smear their WIP into your commit. Ship from a **clean worktree off `origin/main`** instead (EnterWorktree, or `git worktree add … origin/main`).

Then decide **fast lane vs gated lane** (SHIP_CHECKLIST Phase 0.5). Gated if the diff touches ANY of:
`supabase/migrations/*` · `landing/api/{stripe,ai,diagnostic}/*` · `auth-state.js` · `cloud-store.js` · `lib/supabase.js` · `sw.js` · RLS / entitlements / quota.

- **Gated** → feature branch + PR (`npm run stage -- "<desc>"` spins the branch DB + Vercel preview), smoke the preview against the branch DB, then squash-merge. Migrations dated ≥ 2026-05-12 need a tested `-- ROLLBACK:` block. Do **not** direct-push gated changes to `main`.
- **Fast** (~90% of ships) → trunk-based, continue below.

Also apply Phase 0: if the change touches 3+ files / a new sub-system / schema / a multi-step flow **and hasn't been reviewed**, run `/review-feature` before shipping.

**STOP** until the lane is explicitly chosen and announced ("Fast lane — UI/CSS only" / "Gated — sw.js change, going via PR").

## Step 1 — Automated checks (SHIP_CHECKLIST Phase 1)

```bash
node tests/uat.js          # must end: NNNN/NNNN ALL PASS ✓
node tests/tech-debt.js    # no NEW breach above baseline
```
Run `node tests/validation-audit.js` **only if** `validateQuestions()` or the GT tables were touched (≥60% catch / 0 FP). If the change touches `scripts/build.js`, also `node scripts/build.js && node tests/build.test.js`.

**STOP** until every applicable check is green. A real regression gets fixed; a stale guard from a superseded version gets updated.

## Step 2 — Version + cache (SHIP_CHECKLIST Phase 2) — only if the change is meaningful

```bash
node scripts/bump-version.js <new-version> "<one-line description>"
```
This rewrites 5 surfaces atomically (`app.js` `APP_VERSION`, `sw.js` `CACHE_NAME`, `index.html` badge, `styles.css` header, `package.json`) and prepends a one-line stub to the CLAUDE.md version table. **Never hand-edit one surface alone** — UAT asserts consistency.

After bumping:
- Update the two UAT version pins (`grep -nE "APP_VERSION is|SW cache bumped" tests/uat.js`) and re-run UAT.
- **Re-Read CLAUDE.md fresh** (the bump script just rewrote it — any earlier snapshot is stale). The new row **stays a one-line stub** — per CLAUDE.md's own rule (Version bumps §), never expand it inline; full ship detail goes in the commit message + CHANGELOG.md (inline expansion is exactly what bloated the file). Keep the inline table to the **last 3 ships**; migrate older rows into CHANGELOG.md first (confirm they're actually there before deleting).

Skip this whole step for docs-only or test-pin-only ships.

## Step 3 — Live-verify (SHIP_CHECKLIST Phase 3) — only if UI / render / auth / CSS changed

```bash
python3 -m http.server 3131   # → localhost:3131
```
🚨 **HARD RULE**: never run `localStorage.setItem/removeItem/clear` against a prod or `*.vercel.app` host (the v4.81.x data-loss incident). Smoke on `localhost` or a Vercel preview. Walk the happy path + one edge case via Chrome MCP; zero red in console; pixel-match any locked mockup.

## Step 4 — Schema + RLS (SHIP_CHECKLIST Phase 4) — only if migrations were touched

Migration file named `YYYYMMDD_<purpose>.sql` with a header + tested `-- ROLLBACK:` block. Re-check the RLS battle scars in the checklist (POSIX regex, UPSERT→UPDATE policy, `return=representation` SELECT trap). Add `ACTION REQUIRED: paste supabase/migrations/<file>.sql in Supabase SQL Editor → Run.` to the commit message — migrations don't self-apply on prod.

## Step 5 — Commit + push (SHIP_CHECKLIST Phase 5)

```bash
git diff --cached --stat   # ONLY intended files — no .env, creds, node_modules, >1MB binaries
```
Commit with the HEREDOC + co-author trailer:
```bash
git commit -m "$(cat <<'EOF'
v<version> — <one-line summary>

<what + why + lessons>

ACTION REQUIRED: <if any>

UAT NNNN → NNNN PASS.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```
The pre-commit githook re-runs UAT and blocks on failure — don't `--no-verify` unless it's a genuine fire (and say so in the message).

**Push — mind the branch (this bit cost real time in a past ship):**
```bash
git branch --show-current        # confirm where you actually are
```
- On `main`: `git push origin main`
- On a feature/worktree branch but shipping fast-lane to prod: **`git push origin <branch>:main`** — pushing the *current branch* to the *remote main*. Plain `git push origin main` from a feature branch pushes the wrong (stale) main and silently no-ops your work. Verify the branch first, every time.

**After a squash-merge (§9 lesson):** the feature branch's pre-squash commits linger on the remote and diverge from the squashed `main`. Don't reuse that branch for follow-up work — its stale commits force `--force-with-lease` ceremony (this bit us with two force-pushes once). **Start follow-up work from a fresh branch off the updated `main`** (or a fresh worktree).

## Step 6 — Post-push smoke (SHIP_CHECKLIST Phase 6) — production-impacting changes

```bash
gh run list --limit 3 --branch main   # "Test & Deploy" + "Deploy Verification" in_progress within ~30s
```
If CI didn't start, the GitHub→Vercel webhook missed the push — manual deploy: `npx vercel --prod --yes` (then commit/push immediately so git↔prod don't drift — that cost 6 versions once).

Confirm prod is serving the new version (and `certanvil.com` landing too, if touched — separate Vercel project):
```bash
curl -sS "https://networkplus.certanvil.com/?nocache=$(date +%s)" | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1
```
If a live endpoint changed (`/api/notify`, AI, Stripe webhook), run a real request against prod — "logged-as-success-but-actually-broken" is the failure this catches.

## Sign-off

Report: new version + UAT count, any user TODOs (migrations to apply, env vars), what was deferred and why, and **every phase you deliberately skipped** ("Skipped Step 3 — no UI change"). The checklist's value is that skips are explicit, not silent.
