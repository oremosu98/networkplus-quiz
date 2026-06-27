# CertAnvil Ship Checklist

Pre-flight before every `git push`. Codifies the cert-app's conventions from CLAUDE.md so nothing slips between code → push. ~5 min if you've been disciplined throughout the session; longer if you've drifted.

**How to use**: walk the phases in order. Each phase has a STOP CONDITION — don't move to the next until the current one is green. If you're skipping a phase (e.g., docs-only ship, no UI change), call it out explicitly: "Skipping Phase 3 — no UI change."

---

## Phase 0 — Pre-flight: was this reviewed? (non-trivial features only)

For ANY change touching 3+ files, introducing a new sub-system, modifying schema, or adding a multi-step user flow: **run `/review-feature` BEFORE writing code.** The skill at [`.claude/skills/review-feature/SKILL.md`](./.claude/skills/review-feature/SKILL.md) fires 4 parallel agents (Architect, Engineer, Reviewer, Optimizer) and synthesizes a recommendation. ~2-3 min wall-clock; saves hours of misdirected coding.

For trivial ships (single file, < 30 LOC, no schema/auth surface): skip Phase 0. Multi-engineer review is overhead at small scope.

**STOP CONDITION**: either reviewed via `/review-feature` and synthesis approved, OR explicitly determined small enough to skip review.

---

## Phase 0.5 — Risk-tier gate: fast lane or gated lane? (decide BEFORE writing code)

Full spec: [`ENVIRONMENT_STRATEGY.md`](./ENVIRONMENT_STRATEGY.md). The one question:

> **Does this change touch the database schema, money, auth, or the service worker?**

**Gated-lane triggers** (any one → gated lane):
- Any file in `supabase/migrations/`
- `landing/api/stripe/*` · `landing/api/{ai,diagnostic}/*` server endpoints
- `auth-state.js` · `cloud-store.js` · `lib/supabase.js`
- `sw.js` (service worker)
- RLS policies · entitlements · `is_pro()` / quota RPCs

**If GATED lane:**
1. Work on a **feature branch**, not direct-to-`main`.
2. Open a **PR** — this auto-spins the Supabase branch DB + Vercel preview + CI.
3. **Smoke-test the preview URL against the branch DB.** Run the migration there FIRST.
4. Migration files dated ≥ 2026-05-12 MUST carry a tested `-- ROLLBACK:` block (UAT-guarded). Test the rollback on the branch DB.
5. Self-sign-off (the PR template checklist), then **squash-merge** → prod.
6. Post-merge: confirm Supabase applied the migration to prod + run pre-prod activation (env vars + redeploy if needed).

**If FAST lane:** proceed trunk-based as normal (commit → `main` → push). The rest of this checklist applies unchanged.

**STOP CONDITION**: lane explicitly chosen. If gated, you are on a branch with a PR open before any further phase — do not direct-push gated changes to `main`.

---

## Phase 1 — Automated checks (must pass)

### 1.1 UAT

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js
```

Pass = `5XXX/5XXX ALL PASS ✓`. If FAIL: read the failed test, decide if it's a real regression (fix it) or a stale guard from a superseded version (update the guard).

### 1.2 Tech debt scanner

```bash
node tests/tech-debt.js
```

Pass = no NEW breaches above the existing baseline. Existing breaches (app.js LOC, globals, etc.) are saas-gated and acceptable; treat them as a fixed floor. If a NEW threshold is breached, the change introduced regressions — fix or document why it's acceptable in the commit message.

### 1.3 Validation audit (only if `validateQuestions()` or GT tables were touched)

```bash
node tests/validation-audit.js
```

Pass = `MIN_CATCH_RATE >= 60` AND `MAX_FP_RATE = 0`. The validation pipeline is the quality engine; tuning needs a separate dedicated check-in.

**STOP CONDITION**: all applicable automated checks pass before Phase 2.

---

## Phase 2 — Version + cache discipline

### 2.1 Version bumped via the script (not hand-edited)

If the change is meaningful (user-facing, contract-changing, or test-affecting), version must bump.

```bash
node scripts/bump-version.js <new-version> "<one-line description>"
```

Script updates 5 surfaces atomically: `app.js APP_VERSION`, `sw.js CACHE_NAME`, `index.html` version badge, `styles.css` header, `package.json`. **Never hand-edit any one alone** — UAT has consistency assertions.

### 2.2 UAT version pins updated

Two pins in `tests/uat.js` (around lines 308, 322):

```bash
grep -nE "APP_VERSION is 4\.|SW cache bumped to v4\." tests/uat.js
```

Update both. Re-run UAT (1.1) to confirm pass.

### 2.3 CLAUDE.md row expanded

The bump script writes a one-liner stub at the top of the version history table. **Re-Read CLAUDE.md fresh** (don't trust an in-memory snapshot from before the bump — the bump script just rewrote the file, your snapshot is stale, the next Edit will hit a race) and expand the stub to a detailed row covering:

- What shipped + why
- Files touched (1-line list)
- UAT delta (e.g., 5589 → 5593 PASS)
- What's NOT in this version (so future-me knows what was deliberately deferred)
- Gotchas / lessons learned (so future-me doesn't re-encounter them)

**STOP CONDITION**: version consistent across all 5 surfaces; CLAUDE.md row is detailed (not the stub).

---

## Phase 3 — Live-verify (only if UI/render/auth/CSS changed)

Trigger this phase if ANY of: UI render path changed · CSS rule added · auth flow touched · interaction path modified · cert-aware gating altered.

### 3.1 Local server (NEVER prod)

```bash
python3 -m http.server 3131
```

🚨 **HARD RULE**: NEVER run `mcp__Claude_in_Chrome__javascript_tool` writes (`localStorage.setItem`, `removeItem`, `clear`) against the prod URL. Use local server (`localhost:3131`) or a Vercel preview deploy. The v4.81.x incident corrupted ~51 days of real user data; the rule is permanent. See *Testing Discipline* in CLAUDE.md for full context.

### 3.2 Chrome MCP smoke

Walk the happy path AND at least one edge case (e.g., locked-out path, anonymous-user path, both Network+ and Sec+ if cert-aware). Take a `screenshot` if visual contract is locked from a mockup — verify pixel-level fidelity.

### 3.3 Console errors

Open DevTools, look for red. Common offenders that have bitten the cert-app:

| Symptom | Likely cause | Fix |
|---|---|---|
| `escAttr is not defined` | helper used in render path but never defined | add helper definition (v4.98.4 lesson) |
| `Refused to connect because it violates the document's CSP` | new endpoint host missing from `connect-src` | update `vercel.json` CSP (v4.99.x Phase E lesson) |
| `Failed to fetch dynamically imported module` | service worker cache miss | verify cache name bumped (Phase 2.1) |
| `Uncaught (in promise)` | async path missing `.catch()` | wrap in try/catch with silent fallback |

**STOP CONDITION**: zero console errors on the happy path AND visual contract matches mockup if applicable.

---

## Phase 4 — Schema + RLS (only if migrations were touched)

### 4.1 Migration file exists

```bash
ls supabase/migrations/ | tail -5
```

New file follows naming `YYYYMMDD_<purpose>.sql`. Header comment block explains: what the migration does, why now, what to verify after applying, and any rollback notes.

### 4.2 RLS gotchas (cert-app battle scars)

If a new policy was added or modified:

- **Postgres POSIX regex** does NOT support Perl-style escapes. `\s`, `\d`, `\w`, `\b` are interpreted as the literal characters `s`, `d`, `w`, `b`. Use POSIX bracket syntax (`[[:space:]]`, `[[:digit:]]`) or stick to character-class basics. (v4.99.12 lesson — emails containing the letter "s" were silently rejected for hours before the smoke test caught it.)
- **UPSERT triggers UPDATE policy evaluation**, even with no actual conflict. If the edge function uses `Prefer: resolution=merge-duplicates`, you ALSO need an UPDATE policy on the table. Easier: use `resolution=ignore-duplicates` instead, which translates to `INSERT...ON CONFLICT DO NOTHING` — no UPDATE path, no UPDATE policy needed. (v4.99.14 lesson — chased this bug for 4 hotfixes before bisecting the Prefer header.)
- **`Prefer: return=representation`** triggers an implicit SELECT after INSERT to return the row. If you don't have a SELECT policy, this fails AFTER the insert succeeds with a 42501 RLS violation that masks the real issue. Use `return=minimal` unless you actually need the row back.
- **`with check (true)`** is fine if you have application-layer validation upstream. Don't write defence-in-depth checks that block real users. (v4.99.13 lesson.)

### 4.3 User-applied migrations are noted

Migrations don't apply themselves on prod. Add to commit message:

```
ACTION REQUIRED: paste supabase/migrations/<file>.sql in Supabase SQL Editor → Run.
```

**STOP CONDITION**: migration file exists, RLS gotchas verified, user-action noted.

---

## Phase 5 — Final pre-push gate

### 5.1 Staged files

```bash
git diff --cached --stat
```

Verify: ONLY intended files. No `.env`, no credentials, no `node_modules`, no large binaries (>1MB), no editor dotfiles.

### 5.2 Commit message format

Use HEREDOC pattern. Co-author trailer required (cert-app convention):

```bash
git commit -m "$(cat <<'EOF'
v<version> — <one-line summary>

<body explaining what + why + lessons>

ACTION REQUIRED: <if any>

UAT 5XXX → 5YYY PASS.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

### 5.3 Pre-commit hook will run UAT

`.githooks/pre-commit` auto-runs `node tests/uat.js` and blocks on failure. Don't bypass with `--no-verify` unless genuine emergency. If you're tempted, you're probably skipping a real failure.

### 5.4 Push

```bash
git push origin main
```

If "UAT + Playwright" status check is required and you're admin-bypassing, you're skipping the cert-app's most important gate. Only do this for emergencies AND mention it in the commit message.

**STOP CONDITION**: clean push, no remote rejections.

---

## Phase 6 — Post-push smoke (production-impacting changes only)

### 6.1 CI started

```bash
export PATH="$HOME/.local/bin:$PATH"
gh run list --limit 3 --branch main
```

`CI/CD — Test & Deploy` and `Deploy Verification` should both be `in_progress` within 30 seconds. If they don't start, the GitHub→Vercel webhook missed the push (known issue — see CLAUDE.md "Deployment" section). Manual deploy:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
npx vercel --prod --yes
```

### 6.2 Vercel deploy landed

```bash
curl -sS "https://networkplus.certanvil.com/?nocache=$(date +%s)" \
  | grep -oE 'v4\.99\.[0-9]+' | head -1
```

Returns the new version when the deploy is live (~2-5 min after CI passes). Both the cert-app prod URL AND `certanvil.com` (landing — separate Vercel project) need to land for full ship.

### 6.3 End-to-end smoke (if a live endpoint changed)

If `/api/notify`, `/api/ai/generate`, Stripe webhook, or any other live endpoint was touched: run a real POST/GET against prod.

```bash
# Example: notify-me smoke
curl -sS -X POST "https://certanvil.com/api/notify" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"smoke-$(date +%s)@certanvil.com\",\"cert\":\"Security+\",\"source\":\"ship-check\"}"
```

Expect the success signal for that endpoint (e.g., `persisted_to_supabase: true` for notify-me). **The smoke-test-before-bed habit is what catches "logged-as-success-but-actually-broken" failures** (v4.99.10 → v4.99.14 debugging arc — the endpoint returned 200 for hours while RLS was rejecting all writes).

**STOP CONDITION**: prod serving the new version AND endpoint smoke tests pass.

---

## Sign-off

If you got here without skipping a STOP CONDITION, the ship is clean. Note in your handover summary:

- New version + UAT count
- Any user TODOs (migrations to apply, env vars to set, etc.)
- What got deferred and why

If you skipped phases, say so explicitly. The checklist's value is the discipline of going through it; not every change needs every phase, but every skip should be deliberate.

---

## Quick reference — when to skip what

| Change type | Skip... | Run... |
|---|---|---|
| Docs only (CLAUDE.md, README) | Phase 2.1 (no version bump), Phase 3, Phase 4, Phase 6 | Phase 1.1 (UAT), Phase 5 |
| Test-only ship (UAT guards added, no code change) | Phase 3, Phase 4, Phase 6 | Phase 1, Phase 2, Phase 5 |
| UAT pin update only (after bump) | Phase 3, Phase 4 | Phase 1, Phase 2, Phase 5, Phase 6 |
| Production code change | NONE — run all 6 phases | All |
| Migration-only change | Phase 3 if no UI touched | Phase 1, Phase 2, Phase 4, Phase 5, (Phase 6 if endpoint affected) |
| Hotfix in fire (everything else broken) | Document the skip in commit message | Phase 1.1 + Phase 5 minimum |

---

*Living document — update when the cert-app teaches you a new lesson.*
*Last revised: v4.99.15 (2026-05-09) — initial codification post the v4.99.7-14 deep-E2E-sweep + RLS-debugging arc.*
