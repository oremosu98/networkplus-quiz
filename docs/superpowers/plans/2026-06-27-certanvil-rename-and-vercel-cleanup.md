# CertAnvil Rename + Vercel Cleanup Implementation Plan

> **For agentic workers:** this is an **ops/migration plan**, not a code-feature plan. Steps use checkbox (`- [ ]`) syntax. Each phase has a **Risk** and **Rollback** block — read them before executing. Execute phases **one at a time, verifying between**, ideally in a dedicated maintenance window with no other risky work (Phase G builds) in flight.

**Goal:** Rename the project's identity from "networkplus-quiz" to "CertAnvil" across the GitHub repo, the local folder, the `package.json`/docs, and the Vercel project — and delete stale orphan Vercel projects — so the naming reflects reality (one app serving all certs) without breaking production, CI, or auth.

**Architecture (current state — verified 2026-06-27):** The CertAnvil web app is **one Vercel project** (`networkplus-quiz`, `prj_OJ7lwAietRTJol2MHjB4zl1jQxHY`) that serves **all seven cert subdomains** (`networkplus`, `secplus`, `aplus`, `azure`, `ai`, `sc900`, `clfc02` `.certanvil.com`); the cert is detected at runtime from the hostname (`auth-state.js`). The landing site is a **separate** Vercel project (`certanvil-landing`, `prj_7Gat…`) serving `certanvil.com` + `www`. This "one project, many domains" model (a.k.a. "Pattern A") is **already the clean architecture** — this plan does NOT split it per-cert; it only fixes the misleading *name* and removes cruft.

**Tech Stack / surfaces touched:** GitHub (repo rename), Vercel (project rename + project deletes, via dashboard or `vercel` CLI/MCP), local filesystem (folder rename), `package.json`, `CLAUDE.md`, CI workflows, the `ship`/`review-feature` skills, docs.

---

## ⚠️ Decisions to confirm BEFORE executing (primary grill targets)

These are proposals — confirm/adjust in the `/grill-with-docs` pass. The whole plan keys off them.

1. **New GitHub repo name** → proposed **`certanvil`** (short, brand-true). Alt: `certanvil-app`.
2. **New local folder name** → proposed **`certanvil`** (match the repo).
3. **New Vercel app-project name** → proposed **`certanvil-app`** (distinguishes from the existing `certanvil-landing`; "certanvil" alone is ambiguous with the landing).
4. **`package.json` `name`** → proposed **`certanvil`**.
5. **Delete the two orphan Vercel projects?** → proposed **YES**: `secplus-quiz-sable` (`prj_CyuAuP…`) and `network-plus-quiz` (`prj_0sGuHQ…`). Both have **only `*.vercel.app` domains, no `certanvil.com` custom domain** → not in the production path. *(Caveat in Phase 1 — one of them lends its name to a CI smoke URL; resolve that first.)*
6. **`care-leader-prep` (`prj_rrRst…`)** → proposed **LEAVE UNTOUCHED**. It has no `certanvil.com` domain and looks like a *separate* product, not CertAnvil. **Confirm it is unrelated** before ignoring it.

**Scope guardrail:** unrelated Vercel projects (`trne-www`, `peptide-tracker`, `weighttrack`, `simi-dashboard`, `simi-tasks`, `project-82xw2`, `project-499wd`) are **out of scope** — do not touch.

---

## The hidden dependency that makes this risky (READ FIRST)

CI and the ship runbook smoke-test production via the **auto-alias `networkplus-quiz-sable.vercel.app`** (an old-name alias currently attached to the main app project):
- `.github/workflows/vercel-incident-recovery.yml:33` → `PROD_URL: https://networkplus-quiz-sable.vercel.app`
- `.claude/skills/ship/SKILL.md:113` → `curl … networkplus-quiz-sable.vercel.app …` (post-deploy version check)
- `.github/workflows/ci.yml:181` → comment referencing the same host

**Renaming the Vercel project can drop that `*.vercel.app` auto-alias and silently break CI/ship.** Therefore **Phase 1 retargets these to a stable custom domain (`networkplus.certanvil.com`) BEFORE the project is renamed.** This is the #1 sequencing constraint.

---

## Recommended execution order (low-risk → higher-risk, each independently reversible)

1. **Phase 1 — Vercel: retarget smoke URLs, then rename app project, then delete orphans.** (Production-adjacent; do first and verify hard.)
2. **Phase 2 — GitHub repo rename + remote re-point.** (GitHub auto-redirects; Vercel git integration follows.)
3. **Phase 3 — In-repo identity (`package.json`, `CLAUDE.md`, CI, skills, docs).**
4. **Phase 4 — Local folder rename + tooling re-point.** (Local-only; zero production risk; do last.)

Phases are deliberately decoupled: you can stop after any phase and the system is consistent.

---

## Phase 0: Snapshot the current state (so rollback is possible)

**Files:** none (records only)

- [ ] **Step 1: Record the Vercel identifiers**

```
TEAM:           team_sMccBMoZCNJQ3WH4XUuzBN35
APP project:    networkplus-quiz   = prj_OJ7lwAietRTJol2MHjB4zl1jQxHY  (KEEP, rename)
LANDING:        certanvil-landing  = prj_7GatDO51SK9QtDFekOAPe1XG6kGt  (no change)
ORPHAN 1:       secplus-quiz-sable = prj_CyuAuPobazxHgrHMYWR0em9gKJeU  (delete candidate)
ORPHAN 2:       network-plus-quiz  = prj_0sGuHQCd3kpnI00k8yAGZ8pkO1la  (delete candidate)
AMBIGUOUS:      care-leader-prep   = prj_rrRstzGus8Jyf4yvfAKfvX9L9OeU  (confirm unrelated; leave)
```

- [ ] **Step 2: Record the app project's domains (the safety-critical list)**

The app project currently serves these custom domains — ALL must still resolve after Phase 1:
`networkplus.certanvil.com`, `secplus.certanvil.com`, `aplus.certanvil.com`, `azure.certanvil.com`, `ai.certanvil.com`, `sc900.certanvil.com`, `clfc02.certanvil.com`.

- [ ] **Step 3: Confirm clean git state on a fresh branch**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
git checkout main && git pull && git status   # clean
git checkout -b chore/certanvil-rename
```

---

## Phase 1: Vercel — retarget smoke URLs, rename app project, delete orphans

> **Risk:** HIGH (production-adjacent). Custom domains ride along on a project rename, but auto `*.vercel.app` aliases change, which can break CI/ship (see hidden dependency above).
> **Rollback:** a Vercel project rename is instantly reversible (rename back to `networkplus-quiz`). A project **delete is NOT reversible** — only delete orphans, only after the guard checks pass.

### 1A — Retarget CI/ship smoke URLs to a stable custom domain (do this FIRST)

**Files:**
- Modify: `.github/workflows/vercel-incident-recovery.yml:33`
- Modify: `.claude/skills/ship/SKILL.md:113`
- Modify: `.github/workflows/ci.yml:181` (comment)

- [ ] **Step 1: Repoint `PROD_URL` to the stable custom domain**

In `.github/workflows/vercel-incident-recovery.yml`, change:

```yaml
      PROD_URL: https://networkplus-quiz-sable.vercel.app
```
to:
```yaml
      PROD_URL: https://networkplus.certanvil.com
```

- [ ] **Step 2: Repoint the ship-runbook smoke curl**

In `.claude/skills/ship/SKILL.md` line ~113, change `networkplus-quiz-sable.vercel.app` to `networkplus.certanvil.com`:

```bash
curl -sS "https://networkplus.certanvil.com/?nocache=$(date +%s)" | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1
```

- [ ] **Step 3: Update the stale comment in `ci.yml:181`**

Change the comment `# Customer-facing cert deploy — networkplus-quiz-sable.vercel.app` to reference `networkplus.certanvil.com` (the stable custom domain). No behaviour change — comment only.

- [ ] **Step 4: Verify no other code/CI reference depends on the old auto-alias**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
git grep -n "networkplus-quiz-sable\|networkplus-quiz-.*\.vercel\.app" -- '*.js' '*.yml' '*.json' '*.md' ':!package-lock.json' ':!dist/*'
```

Expected: only the three files above (now updated). If anything else appears, repoint it to `networkplus.certanvil.com` too.

- [ ] **Step 5: Commit 1A and let CI prove the new smoke URL works BEFORE renaming the project**

```bash
git add .github/workflows/vercel-incident-recovery.yml .claude/skills/ship/SKILL.md .github/workflows/ci.yml
git commit -m "chore(ci): retarget prod smoke URL to networkplus.certanvil.com (pre-rename)"
git push -u origin chore/certanvil-rename
```

Open a PR and confirm CI green against the new URL. **Do not proceed to 1B until this passes** — this proves CI no longer depends on the soon-to-change auto-alias.

### 1B — Rename the app Vercel project

- [ ] **Step 1: Rename `networkplus-quiz` → `certanvil-app`** (Vercel dashboard → Project → Settings → Name; or `vercel projects rename`).
  - The `.vercel/project.json` `projectId` is unchanged, so CLI `vercel --prod` keeps working.
  - All seven `*.certanvil.com` custom domains stay attached (they are explicit custom domains, not auto-aliases).

- [ ] **Step 2: Verify ALL seven cert subdomains still serve (the safety check)**

```bash
for h in networkplus secplus aplus azure ai sc900 clfc02; do
  printf "%s -> " "$h.certanvil.com"; curl -s -o /dev/null -w "%{http_code}\n" "https://$h.certanvil.com/?_cb=$(date +%s)";
done
```

Expected: every host returns `200`. If any fails, **rename the project back immediately** (rollback) and investigate.

- [ ] **Step 3: Confirm a fresh production deploy still targets the right project**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
git commit --allow-empty -m "chore: trigger deploy post project rename"
git push   # CI → Vercel; confirm Deploy Verification + the seven hosts stay 200
```

### 1C — Delete the orphan projects (irreversible — guard first)

- [ ] **Step 1: Guard check — confirm each orphan has NO custom domain and NO inbound reference**

```bash
git grep -n "secplus-quiz-sable\|network-plus-quiz" -- '*.js' '*.yml' '*.json' '*.md' ':!package-lock.json' ':!dist/*'
```

Expected: **no matches** (the only `-sable` references were the CI/ship ones fixed in 1A). If anything still references them, STOP and repoint it first.
Re-confirm in the Vercel dashboard that `secplus-quiz-sable` and `network-plus-quiz` list only `*.vercel.app` domains (no `certanvil.com`).

- [ ] **Step 2: Delete `secplus-quiz-sable` and `network-plus-quiz`** (Vercel dashboard → Settings → Delete Project; type the name to confirm).
  - **Do NOT** delete `care-leader-prep` or any unrelated project.

- [ ] **Step 3: Final Phase-1 verification** — re-run the seven-subdomain curl loop (1B Step 2) + `certanvil.com` itself; all `200`.

---

## Phase 2: GitHub repo rename + remote re-point

> **Risk:** MEDIUM. GitHub auto-redirects the old repo URL (git, web, API) so existing clones/links keep working. Vercel's GitHub integration tracks the repo by ID and follows the rename.
> **Rollback:** rename the repo back on GitHub; redirects re-establish.

- [ ] **Step 1: Rename on GitHub** — repo Settings → Rename `networkplus-quiz` → `certanvil` (per Decision 1). Branch protection, Actions secrets (incl. `PROJECT_TOKEN`), and workflows are unaffected by a rename.

- [ ] **Step 2: Re-point the local remote**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
git remote set-url origin https://github.com/oremosu98/certanvil.git
git remote -v          # confirm origin → certanvil.git
git fetch origin       # confirm it resolves
```

- [ ] **Step 3: Verify the Vercel ↔ GitHub link followed the rename** — Vercel app project → Settings → Git: confirm it shows `oremosu98/certanvil`. If it still shows the old name, disconnect + reconnect the Git repo (no redeploy needed; existing domains stay).

- [ ] **Step 4: Push a no-op commit and confirm the full pipeline** — `git commit --allow-empty -m "chore: verify pipeline post repo rename" && git push`; CI runs, Vercel deploys, the seven hosts stay `200`.

- [ ] **Step 5 (optional cleanup): update in-repo GitHub URLs.** Internal markdown issue links (`github.com/oremosu98/networkplus-quiz/...`) auto-redirect, but can be updated for cleanliness in Phase 3.

---

## Phase 3: In-repo identity (package.json, CLAUDE.md, CI, skills, docs)

> **Risk:** LOW–MEDIUM. Mostly text. The one behavioural item is `package.json` `name` — check UAT doesn't assert on it.
> **Rollback:** revert the commit.

**Files:**
- Modify: `package.json` (`name`)
- Modify: `CLAUDE.md` (local-dev paths + project-name references)
- Modify: `.claude/skills/review-feature/SKILL.md` (absolute paths)
- Modify: docs carrying the absolute path / old repo URL

- [ ] **Step 1: Check whether UAT/tooling asserts the package name**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
git grep -n '"networkplus-quiz"\|name.*networkplus-quiz' -- tests/ scripts/
```

Expected: ideally no assertions. If `tests/uat.js` or `scripts/bump-version.js` asserts `name === "networkplus-quiz"`, update that assertion in the same commit as the rename.

- [ ] **Step 2: Rename the package**

In `package.json`, change `"name": "networkplus-quiz"` → `"name": "certanvil"` (per Decision 4).

- [ ] **Step 3: Update `CLAUDE.md` paths** — the "Local Development" `cd` path, the "Test Suite" paths, and any "networkplus-quiz" *project-identity* references. **Do NOT touch "Network+" / "N10-009" content** — that's the cert subject, not the repo name. (If Phase 4 will rename the folder, write the *new* folder path here now and land both in the same window.)

- [ ] **Step 4: Update the `review-feature` skill absolute paths** — `.claude/skills/review-feature/SKILL.md` references `/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz/...` (lines ~32, 66, 67, 98, 132). Update to the new folder path (Phase 4 target).

- [ ] **Step 5: Run the suite to confirm nothing broke**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js && node tests/tech-debt.js
```

Expected: green.

- [ ] **Step 6: Commit**

```bash
git add package.json CLAUDE.md .claude/skills/review-feature/SKILL.md docs
git commit -m "chore: rename project identity networkplus-quiz -> certanvil (in-repo refs)"
git push
```

---

## Phase 4: Local folder rename + tooling re-point

> **Risk:** MEDIUM for *local tooling continuity*, ZERO for production (prod never sees the local folder name). Absolute-path references break: CLAUDE.md (done in Phase 3), the `review-feature` skill (done), `~/.claude` session/scheduled-task references, and **this Claude session's `cwd`**.
> **Rollback:** `mv` the folder back to the old name.

- [ ] **Step 1: Close anything holding the folder open** — editors, terminals, and **this CLI session** (the rename should be done when not mid-session, or you reopen afterward). The `.vercel/project.json`, `.git`, and `.githooks` are all folder-relative and survive the move.

- [ ] **Step 2: Rename the folder**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects"
mv networkplus-quiz certanvil
cd certanvil && git status   # confirm repo intact
```

- [ ] **Step 3: Re-point any absolute-path references in `~/.claude`**

```bash
grep -rl "Desktop/Dev Projects/networkplus-quiz" ~/.claude/scheduled-tasks ~/.claude/settings.json ~/.claude/hooks 2>/dev/null
```

Update any hits to `Desktop/Dev Projects/certanvil` (notably the `certanvil-api-key-setup-day` scheduled task if it pins the path, and any hook in `settings.json`).

- [ ] **Step 4: Reopen the project from the new path and sanity-check the pipeline**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/certanvil"
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js
git commit --allow-empty -m "chore: verify pipeline post folder rename" && git push
```

Expected: UAT green; CI + Vercel deploy; seven hosts `200`.

> **Note on Claude tooling state:** the `~/.claude/projects` session dir, context-mode KB, and claude-mem store are keyed off the old path and will start fresh under the new path. This is cosmetic (history isn't lost, just not auto-surfaced under the new path). Forge is project-named ("CertAnvil iOS E2E App"), not path-keyed, so Forge memory is unaffected.

---

## Self-Review checklist (run before the grill, and again before executing)

- [ ] **Smoke URL retargeted before project rename** (Phase 1A precedes 1B) — CI proven green against `networkplus.certanvil.com` first.
- [ ] **All seven cert subdomains verified `200`** after the project rename (and again after folder rename).
- [ ] **Only orphans deleted** — `secplus-quiz-sable` + `network-plus-quiz`; `care-leader-prep` and unrelated projects untouched; deletes gated behind the no-inbound-reference grep.
- [ ] **Architecture unchanged** — still one app project, many domains; no per-cert split introduced.
- [ ] **No "Network+" *content* renamed** — only repo/project/folder *identity*, never the cert subject matter.
- [ ] **Each phase independently reversible**; deletes (irreversible) are last within Phase 1 and guarded.
- [ ] **Decisions 1–6 confirmed** with the founder in the grill before any irreversible step.

---

## What this plan deliberately does NOT do
- It does **not** split the app into per-cert Vercel projects (that would add deploy drift; the single-project model is the clean one).
- It does **not** touch auth, the Supabase cookie domain (`.certanvil.com`), or any `certanvil.com` custom domain mapping — those are correct and out of scope.
- It does **not** rename the user-facing "Network+"/cert content — only the repo/project/folder identity.
- It does **not** run during a Phase G build window — it's a discrete maintenance task.
