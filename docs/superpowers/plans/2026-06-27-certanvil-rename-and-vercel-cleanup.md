# CertAnvil Rename + Vercel Cleanup Implementation Plan

> ## ✅ STATUS: EXECUTED — 2026-06-27 (all 4 phases complete, verified)
> - **Phase 1 (Vercel):** removed the redundant Security+ deploy (Job 4b); renamed app project `networkplus-quiz` → **`certanvil-app`**; deleted orphans `secplus-quiz-sable` + `network-plus-quiz`; smoke/PROD URLs retargeted to `networkplus.certanvil.com`; Security+ signup redirect → `secplus.certanvil.com`. (PR [#468](https://github.com/oremosu98/certanvil/pull/468), merged.)
> - **Phase 2 (GitHub):** repo renamed `networkplus-quiz` → **`certanvil`**; local remote re-pointed; pipeline re-verified.
> - **Phase 3 (in-repo identity):** `package.json` name, `CLAUDE.md` title/path/URLs, review-feature skill paths → `certanvil`.
> - **Phase 4 (local folder):** `~/Desktop/Dev Projects/networkplus-quiz` → **`…/certanvil`**; `~/.claude` launch + scheduled-task paths re-pointed.
> - **Verified at every step:** all 7 cert subdomains + landing returned 200; CI `success`; no production behaviour change. `care-leader-prep` (separate app) left untouched.
> - **Grill value:** caught the duplicate Security+ deploy (would have broken every ship if deleted naively); execution caught the live Security+ signup redirect pointing at the deleted project.
>
> _The phase/step checkboxes below are retained as the historical record of what was run._

> **For agentic workers:** this is an **ops/migration plan**, not a code-feature plan. Steps use checkbox (`- [ ]`) syntax. Each phase has a **Risk** and **Rollback** block — read them before executing. Execute phases **one at a time, verifying between**, ideally in a dedicated maintenance window with no other risky work (Phase G builds) in flight.

**Goal:** Rename the project's identity from "networkplus-quiz" to "CertAnvil" across the GitHub repo, the local folder, the `package.json`/docs, and the Vercel project — and delete stale orphan Vercel projects — so the naming reflects reality (one app serving all certs) without breaking production, CI, or auth.

**Architecture (current state — verified 2026-06-27):** The CertAnvil web app is **one Vercel project** (`networkplus-quiz`, `prj_OJ7lwAietRTJol2MHjB4zl1jQxHY`) that serves **all seven cert subdomains** (`networkplus`, `secplus`, `aplus`, `azure`, `ai`, `sc900`, `clfc02` `.certanvil.com`); the cert is detected at runtime from the hostname (`auth-state.js`). The landing site is a **separate** Vercel project (`certanvil-landing`, `prj_7Gat…`) serving `certanvil.com` + `www`. This "one project, many domains" model (a.k.a. "Pattern A") is **already the clean architecture** — this plan does NOT split it per-cert; it only fixes the misleading *name* and removes cruft.

**Deploy mechanism (verified — corrects an earlier assumption):** deploys do **NOT** use Vercel's GitHub auto-deploy. CI deploys via the **Vercel CLI** (`vercel --prod --token=$VERCEL_TOKEN`) keyed on `VERCEL_PROJECT_ID` (a repo secret for the main project) — see `.github/workflows/ci.yml`. Consequence: **renaming the GitHub repo cannot break deploys** (no git-integration link involved), and **renaming the Vercel project is safe** because the CLI targets the project by **ID**, which a rename does not change.

**The dual-deploy reality (the key finding):** CI runs **two** production deploy jobs on every push to `main`: **Job 4a** (`deploy-production`) → the main project via the `VERCEL_PROJECT_ID` secret; **Job 4b** (`deploy-production-secplus`, `ci.yml:214`) → a **hardcoded** `prj_CyuAuPobazxHgrHMYWR0em9gKJeU` (= `secplus-quiz-sable`). This is leftover from v4.87 when Security+ was a standalone project, *before* `secplus.certanvil.com` was moved onto the main project. Real Security+ users now hit `secplus.certanvil.com` (main project, Job 4a); the Job-4b copy to `secplus-quiz-sable.vercel.app` is **redundant**. So `secplus-quiz-sable` is wired into CI by hardcoded ID — it must be **unwired (Job 4b removed) before deletion**, or every future ship fails.

**Tech Stack / surfaces touched:** GitHub (repo rename), Vercel (project rename + project deletes, via dashboard or `vercel` CLI/MCP), local filesystem (folder rename), `package.json`, `CLAUDE.md`, CI workflows, the `ship`/`review-feature` skills, docs.

---

## ✅ Decisions — CONFIRMED (grill-with-docs, 2026-06-27)

1. **Timing:** do the rename **before Phase G**, as its own focused task. **Never interleave** with the Stripe/payments work — finish + verify the rename, then start Phase G. (Lowest blast radius now: no paying customers, no live webhooks.)
2. **Names:** GitHub repo **`certanvil`** · local folder **`certanvil`** · `package.json` name **`certanvil`** · Vercel app project **`certanvil-app`** · Vercel landing **`certanvil-landing`** (unchanged). The repo/folder/Vercel-app name mismatch is fine — Vercel links by internal project ID, not name.
3. **Orphan deletes:** delete **`network-plus-quiz`** (`prj_0sGuHQ…`, a truly-dead old duplicate) and **`secplus-quiz-sable`** (`prj_CyuAuP…`) — **but `secplus-quiz-sable` is NOT a simple orphan** (see Decision 4 + the dual-deploy finding below): it must be **unwired from CI first**.
4. **Deploy consolidation:** CI currently double-deploys (Job 4a → main project; Job 4b → `secplus-quiz-sable`). **Consolidate to one deploy / one project / all seven certs:** remove CI Job 4b, verify `secplus.certanvil.com` (served by the main project) still works, then delete `secplus-quiz-sable`. `secplus-quiz-sable.vercel.app` is treated as dead (verify on-device that nothing external relies on it).
5. **`care-leader-prep` (`prj_rrRst…`) — LEAVE FULLY UNTOUCHED.** Confirmed: it is a **separate app the founder is building (for his mum)**, not CertAnvil. Out of scope.
6. **Execution split:** the assistant prepares **all code/file changes on a branch** (CI edits, `package.json`, `CLAUDE.md`, docs, remote re-point, folder `mv`); the **founder performs the 4 dashboard-only actions** (rename GitHub repo · rename Vercel app project · delete the 2 projects) at the marked points, each with an exact click-path + a verify command after.

**Scope guardrail:** unrelated Vercel projects (`care-leader-prep`, `trne-www`, `peptide-tracker`, `weighttrack`, `simi-dashboard`, `simi-tasks`, `project-82xw2`, `project-499wd`) are **out of scope** — do not touch.

---

## The hidden dependency that makes this risky (READ FIRST)

CI, the post-deploy smoke test, and the ship runbook all hit the **auto-alias `networkplus-quiz-sable.vercel.app`** (an old-name alias on the main app project):
- `tests/deploy-verify.js:23` → `const PROD_URL = 'https://networkplus-quiz-sable.vercel.app';` (the post-deploy smoke target)
- `.github/workflows/vercel-incident-recovery.yml:33` → `PROD_URL: https://networkplus-quiz-sable.vercel.app`
- `.claude/skills/ship/SKILL.md:113` → `curl … networkplus-quiz-sable.vercel.app …` (post-deploy version check)
- `.github/workflows/ci.yml:181` → comment referencing the same host

**Renaming the Vercel project can drop that `*.vercel.app` auto-alias and silently break CI/ship/smoke.** Therefore **Phase 1 retargets ALL of these to the stable custom domain `networkplus.certanvil.com` BEFORE the project is renamed.** This is the #1 sequencing constraint. *(Cosmetic, optional: `scripts/stage.js:61` sets a `'networkplus-quiz-stage'` User-Agent string — harmless, update only if doing a thorough sweep.)*

---

## Recommended execution order (low-risk → higher-risk, each independently reversible)

1. **Phase 1 — Vercel: retarget smoke URLs → remove the duplicate Security+ deploy (Job 4b) → rename app project → delete the 2 unwired projects.** (Production-adjacent; do first and verify hard.)
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

## Phase 1: Vercel — retarget smoke URLs, drop duplicate Security+ deploy, rename app project, delete unwired projects

> **Risk:** HIGH (production-adjacent). Custom domains ride along on a project rename, but auto `*.vercel.app` aliases change, which can break CI/ship (see hidden dependency above).
> **Rollback:** a Vercel project rename is instantly reversible (rename back to `networkplus-quiz`). A project **delete is NOT reversible** — only delete orphans, only after the guard checks pass.

### 1A — Retarget the smoke / PROD URLs off the auto-alias (do this FIRST) — *assistant prepares*

**Files:**
- Modify: `tests/deploy-verify.js:23`
- Modify: `.github/workflows/vercel-incident-recovery.yml:33`
- Modify: `.claude/skills/ship/SKILL.md:113`
- Modify: `.github/workflows/ci.yml:181` (comment)

- [ ] **Step 1: Repoint the post-deploy smoke target**

In `tests/deploy-verify.js`, change:
```js
const PROD_URL = 'https://networkplus-quiz-sable.vercel.app';
```
to:
```js
const PROD_URL = 'https://networkplus.certanvil.com';
```

- [ ] **Step 2: Repoint `PROD_URL` in the incident-recovery workflow**

In `.github/workflows/vercel-incident-recovery.yml`, change `PROD_URL: https://networkplus-quiz-sable.vercel.app` → `PROD_URL: https://networkplus.certanvil.com`.

- [ ] **Step 3: Repoint the ship-runbook smoke curl**

In `.claude/skills/ship/SKILL.md` line ~113, change the host to `networkplus.certanvil.com`:
```bash
curl -sS "https://networkplus.certanvil.com/?nocache=$(date +%s)" | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1
```

- [ ] **Step 4: Update the stale comment in `ci.yml:181`** to reference `networkplus.certanvil.com`. Comment only — no behaviour change.

- [ ] **Step 5: Verify nothing else depends on the old `*-sable` auto-alias**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
git grep -n "networkplus-quiz-sable" -- '*.js' '*.yml' '*.json' '*.md' ':!package-lock.json'
```

Expected: only the four files above (now updated). Repoint anything else to `networkplus.certanvil.com`.

### 1B — Remove the redundant Security+ deploy (Job 4b) — *assistant prepares* ⚠️ NEW (grill finding)

> Why: CI Job 4b double-deploys the same code to `secplus-quiz-sable` (hardcoded `prj_CyuAuP…`). Security+ users actually use `secplus.certanvil.com` on the **main** project (Job 4a). This step ends the duplication and is the prerequisite for safely deleting `secplus-quiz-sable` in 1D.

**Files:**
- Modify: `.github/workflows/ci.yml` (delete the `deploy-production-secplus` job, ~lines 204–234)

- [ ] **Step 1: Confirm `secplus.certanvil.com` is served by the MAIN project (not the -sable project)**

```bash
curl -s -o /dev/null -w "secplus.certanvil.com -> %{http_code}\n" "https://secplus.certanvil.com/?_cb=$(date +%s)"
```

Expected `200`. (Vercel's API already lists `secplus.certanvil.com` under the main project — this just confirms it serves.)

- [ ] **Step 2: Delete the entire `deploy-production-secplus` job** from `.github/workflows/ci.yml` (the `# ── JOB 4b …` block through its final `vercel --prod …` line). Leave Job 4a (`deploy-production`) untouched.

- [ ] **Step 3: Commit 1A + 1B together and let CI prove green BEFORE any rename/delete**

```bash
git add tests/deploy-verify.js .github/workflows/vercel-incident-recovery.yml .claude/skills/ship/SKILL.md .github/workflows/ci.yml
git commit -m "chore(ci): retarget smoke URLs + drop redundant Security+ deploy (pre-rename)"
git push -u origin chore/certanvil-rename
```

Open a PR; confirm CI is green with only the single (Job 4a) production deploy and the new smoke URL. **Do not proceed until this passes** — it proves CI no longer depends on the `-sable` alias OR the second project.

### 1C — Rename the app Vercel project — 🖱️ *FOUNDER dashboard action*

- [ ] **Step 1: Rename `networkplus-quiz` → `certanvil-app`** (Vercel dashboard → the `networkplus-quiz` project → Settings → General → Project Name → `certanvil-app` → Save).
  - Safe because: CLI deploy targets the project by **ID** (`VERCEL_PROJECT_ID` secret), unchanged by a rename; and all seven `*.certanvil.com` custom domains are explicit domains that stay attached.

- [ ] **Step 2: Verify ALL seven cert subdomains still serve (safety check)** — *assistant runs*

```bash
for h in networkplus secplus aplus azure ai sc900 clfc02; do
  printf "%s -> " "$h.certanvil.com"; curl -s -o /dev/null -w "%{http_code}\n" "https://$h.certanvil.com/?_cb=$(date +%s)";
done
```

Expected: every host `200`. If any fails → **rename the project back to `networkplus-quiz`** (instant rollback) and investigate.

- [ ] **Step 3: Confirm a fresh deploy still lands** — push an empty commit, confirm CI deploy + the seven hosts stay `200`.

### 1D — Delete the two now-unwired projects — 🖱️ *FOUNDER dashboard action* (irreversible — guard first)

- [ ] **Step 1: Guard check — no inbound reference remains (name AND hardcoded ID)**

```bash
git grep -n "secplus-quiz-sable\|network-plus-quiz\|prj_CyuAuPobazxHgrHMYWR0em9gKJeU\|prj_0sGuHQCd3kpnI00k8yAGZ8pkO1la" -- '*.js' '*.yml' '*.json' '*.md' ':!package-lock.json'
```

Expected: **no matches** (Job 4b removed in 1B; smoke URLs retargeted in 1A). If anything appears — STOP and repoint/remove it first. *(This guard checks the hardcoded project IDs too, not just the names — the original plan's name-only guard would have missed `ci.yml:221`.)*

- [ ] **Step 2: Re-confirm in the Vercel dashboard** that `secplus-quiz-sable` and `network-plus-quiz` list only `*.vercel.app` domains (no `certanvil.com`).

- [ ] **Step 3: Delete `secplus-quiz-sable` and `network-plus-quiz`** (each: Vercel dashboard → project → Settings → Advanced → Delete Project → type the name).
  - **Do NOT** touch `care-leader-prep` (founder's separate app) or any unrelated project.

- [ ] **Step 4: Final Phase-1 verification** — re-run the seven-subdomain curl loop (1C Step 2) + `certanvil.com`; all `200`. One more push to `main` to confirm CI ships cleanly with the single deploy job.

---

## Phase 2: GitHub repo rename + remote re-point

> **Risk:** LOW (corrected from MEDIUM after the grill). Deploys run via the Vercel **CLI + token + project ID** inside GitHub Actions — there is **no Vercel GitHub auto-deploy integration to break**. GitHub auto-redirects the old repo URL (git, web, API) so existing clones/links/issue-links keep working. Actions read the repo from the runtime `github` context (not a hardcoded name), so workflows are unaffected.
> **Rollback:** rename the repo back on GitHub; redirects re-establish.

- [ ] **Step 1: Rename on GitHub** — 🖱️ *FOUNDER dashboard action*: repo Settings → Rename `networkplus-quiz` → `certanvil` (per Decision 2). Branch protection, Actions secrets (`VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`, `PROJECT_TOKEN`), and workflows are all unaffected by a rename.

- [ ] **Step 2: Re-point the local remote** — *assistant runs*

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
git remote set-url origin https://github.com/oremosu98/certanvil.git
git remote -v          # confirm origin → certanvil.git
git fetch origin       # confirm it resolves (GitHub redirect also keeps the old URL working)
```

- [ ] **Step 3: (Only if a Git integration is shown) confirm it followed the rename** — Deploys do NOT depend on it, but if the Vercel project happens to show a connected Git repo under Settings → Git, confirm it reads `oremosu98/certanvil`. If absent or stale, no action needed — CLI deploys are unaffected.

- [ ] **Step 4: Push a no-op commit and confirm the full pipeline** — `git commit --allow-empty -m "chore: verify pipeline post repo rename" && git push`; CI runs, the single deploy job ships, the seven hosts stay `200`.

- [ ] **Step 5 (optional cleanup): update in-repo GitHub URLs.** Internal markdown issue links (`github.com/oremosu98/networkplus-quiz/...`, incl. those in `CLAUDE.md`) auto-redirect, but can be updated for cleanliness in Phase 3.

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

- [ ] **Smoke URLs retargeted (1A) AND duplicate Security+ deploy removed (1B) BEFORE any rename/delete** — CI proven green with a single deploy job against `networkplus.certanvil.com` first.
- [ ] **Delete guard checks hardcoded project IDs, not just names** (1D Step 1) — catches `ci.yml:221`'s `prj_CyuAuP…`, which a name-only grep would miss.
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
