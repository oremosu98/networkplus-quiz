---
type: plan
status: shipped
cert: all
updated: 2026-06-29
tags: [plan]
---
# Progress Page Redesign v2 · Implementation Plan

**Date:** 2026-05-26
**Spec:** `docs/superpowers/specs/2026-05-26-progress-redesign-design.md`
**Scope:** `#page-progress` across BOTH Network+ + Security+
**Lane:** Fast lane per ENVIRONMENT_STRATEGY (HTML/CSS/JS additive; no DB/auth/money/SW-fetch-logic)
**Branch:** `feature/progress-page-redesign-v2`

---

## Pre-flight (founder approval gate)

**Cannot start Stage 0 until:**
1. Founder reviews the spec (`docs/superpowers/specs/2026-05-26-progress-redesign-design.md`)
2. Founder answers the 6 open shape-of-solution questions in §7 of the spec
3. Each Q lock saved as a one-liner in spec §7 with date + answer

**If any Q changes the locked design contract (§3 of spec) substantially, this plan re-scopes before Stage 0.**

---

## Stage 0 · Worktree + branch setup

**Tasks:**
1. Create worktree: `git worktree add ../netplus-progress-v2 -b feature/progress-page-redesign-v2`
2. `cd ../netplus-progress-v2` — all subsequent stages execute in the worktree
3. Confirm clean tree: `git status` shows no uncommitted changes
4. Bump dev `dg-system.css?v` token to `dg-dev-progress-v2` so CSS edits cache-bust during iteration (the v4.99.65 stale-CSS lesson)

**Deliverable:** clean worktree on the v2 branch, ready for edits.

**Exit:** worktree exists, branch created, `git log` shows main HEAD.

---

## Stage 1 · Build N+ mockup v2 (`mockups/netplus-progress-concept-v2.html`)

**Tasks:**
1. Author the new mockup from the locked spec §3 architecture
2. Self-contained HTML (inline `<style>` + `<script>`), no external deps
3. Faithful to the spec — no embellishments, no extra sections
4. Both light + dark themes, OKLCH tokens (carryover from v4.99.66 base)
5. 50 N+ topics across 5 domains with honest stub data (2 studied: Network Models 100%, PKI 76%; 48 untouched)
6. Apply all 4-skill rules:
   - **dashboards:** work-first, instrument-as-hero, diagram present, one instrument surface
   - **ui-ux-pro-max:** 44×44 touch targets (whole row is button), `cursor-pointer`, ARIA labels, reduced-motion gate, no emoji icons
   - **emil-design-eng:** `:active{scale(0.97)}` on CTA, `(hover:hover)` media gate, custom ease-out curve, no entry animation
   - **stop-slop:** locked copy strings from spec §4.2
7. Include the empty-state variant as a comment-toggled `<div data-state="empty">` block so founder can compare states
8. Self-audit pass: 0 emoji, 0 hardcoded hex, 0 em-dash, all touch targets ≥44

**Deliverable:** `mockups/netplus-progress-concept-v2.html`

**Exit:** file authored, opens cleanly in browser, both themes faithful, hands to founder for review.

---

## Stage 2 · Build Sec+ mockup v2 (`mockups/secplus-progress-concept-v2.html`)

**Tasks:**
1. Structurally MIRROR the N+ v2 mockup (cert-parity per spec Q5-A locked decision)
2. Swap data: 37 Sec+ topics across 5 domains with honest stub data (6 studied per v4.99.66 mockup's data)
3. Swap weights: 12/22/18/28/20
4. Swap headers: SY0-701 instead of N10-009
5. Same 4-skill discipline applied

**Deliverable:** `mockups/secplus-progress-concept-v2.html`

**Exit:** file authored, cert-parity confirmed via diff (only data swaps differ).

---

## Stage 3 · Founder mockup review + lock

**Gate:** founder opens both v2 mockups in browser (light + dark), confirms direction.

**Possible outcomes:**
- **PASS** → proceed to Stage 4
- **CHANGE direction** → revise mockups; re-loop Stage 3
- **REJECT** → escalate to a deeper rethink; pause plan

**Capture:** founder approval note in spec §3 (date + verbatim quote).

---

## Stage 4 · Audit + migrate UAT guards for v4.99.66 Batch 4b

**Tasks:**
1. Locate every UAT guard touching `#page-progress` (grep `tests/uat.js` for `progress`, `#page-progress`, `ps2-`, `progress-card`, `dg-rule`, `progress-rec-host`)
2. Categorize each guard:
   - **MIGRATE:** asserts structural fact still true in v2 (e.g. `#progress-summary` exists) — keep
   - **MIGRATE-CHANGED:** asserts a structural fact that v2 changes (e.g. `ps2-stat-strong` class) — update to assert the NEW structure with equal regression strength
   - **DEAD:** asserts something v2 removes entirely (e.g. `.dg-bar-col` already display:none from v4.99.80) — keep as tombstone OR remove
   - **NEW:** structural fact unique to v2 (mastery bar exists, domain readiness strip exists, whole row is button) — add as new guard
3. Write the migration as one commit BEFORE any code change so UAT defines what shipping looks like

**Deliverable:** `tests/uat.js` updated, all guards green against v4.99.66 (still passing because no code changed yet — guards still assert the OLD structure)

**Exit:** `node tests/uat.js` exits 0 against unchanged code.

---

## Stage 5 · Bump `dg-system.css?v` query for cache-bust

**Tasks:**
1. Pre-commit, bump `<link href="dg-system.css?v=X">` in `index.html` to `v=progress-v2-wip` so iteration during Stages 6-9 doesn't fight the SW cache (the localhost stale-cache gotcha per v4.99.65 lesson)
2. Will normalize to final semver at version-bump time (Stage 13)

**Deliverable:** index.html `?v` token incremented.

---

## Stage 6 · Implement v2 render-contract changes in `app.js`

The 4 render changes flagged in spec §6:

### 6.1 `_renderProgressSummary(rows)` — mastery instrument emission
- Replace the existing `<div class="ps2-stat-*">` markup with new `.pm-*` elements:
  - `.pm-headline` — `{N} of {total} studied · {pct}% covered`
  - `.pm-bar` — single track with 4 segment children (strong/solid/weak/untouched), widths set via inline `style="width:N%"` from the row counts
  - `.pm-ledger` — 4-column tabular ledger underneath
- DO NOT remove the old `#progress-summary` host id — re-paint it

### 6.2 `_renderProgressSummary` — domain readiness strip emission
- After the mastery instrument, emit `<div class="dr-strip">` containing 5 `.dr-row` elements
- Each `.dr-row`:
  - `.dr-name` (domain label)
  - `.dr-weight` (`· N% of exam`)
  - `.dr-bar` (track + fill width = studied/total ratio)
  - `.dr-pct` (tabular %)
- Each row is a `<button>` with `data-domain-jump="<domain-key>"` so it scrolls to the matching section

### 6.3 `_progressRowHtml(row)` — whole-row button + chevron pseudo
- Change root element from `<div class="t-row">` to `<button class="t-row" type="button">`
- Remove the inner `.tgo` button (the chevron becomes a `::after` pseudo on the row, no separate clickable element)
- Add `aria-label` derived from `{name} · {verdict} · drill this topic`
- Touch target: row height ≥48px (44px effective + visual padding)
- Add `data-topic="<topic-name>"` for the click handler to dispatch to `drillTopic({name})`

### 6.4 `renderProgressRecommendation()` — host markup unchanged
- The shared `_pageRecCard` already emits the contract the v2 scoped CSS targets
- No JS change here — only scoped CSS in Stage 7

### 6.5 Empty-state branch in `_renderProgressSummary`
- New conditional: when `rows.every(r => !r.studied)`, emit the empty-state variant
- Mastery instrument: `0 of {total} studied · 0% covered` + sub `Take any quiz to start tracking your mastery.`
- Domain readiness strip: 5 rows at 0% with the same diagnostic CTA
- Prescription card swap: `Start with the diagnostic` (handled in `renderProgressRecommendation`)

### 6.6 Add click delegation
- Single delegated handler on `#progress-topic-grid` that catches clicks on `.t-row[data-topic]` and dispatches to `drillTopic({name: dataset.topic})`
- Mirror handler on `.dr-row[data-domain-jump]` for the readiness-strip scroll behavior

**Deliverable:** `app.js` changes at lines 2477 / 2535 / 2631 / 5061 (estimated +60-90 LOC, -30-40 LOC).

**Exit:** functions compile (`node -c app.js` clean), UAT migrated-guards pass against the new structure (Stage 4's MIGRATE-CHANGED guards now turn green).

---

## Stage 7 · Build the scoped CSS in `dg-system.css`

**Tasks:**
1. Locate the v4.99.66 Batch 4b block starting at line 652
2. **Surgical replace** — keep the block's framing comment, replace the rule set entirely with the v2 system:
   - `#page-progress` page-level (max-width, padding)
   - `.ed-pagehead` — eyebrow + h1 (carryover styling, reduced visual weight)
   - `.pm-*` — mastery instrument (headline + bar + ledger)
   - `.dr-*` — domain readiness strip
   - `#progress-rec-host` + its `.focus-*` interior — prescription card de-carded
   - `.controls` — search + segment chips
   - `.dom` + `.dh` + `.t-row` — domain sections + row-as-button
   - `:hover` rules all gated behind `@media (hover: hover) and (pointer: fine)`
   - `:active` rules with `transform:scale(0.97)` for `.cta` and `.t-row`
   - `@media (max-width: 680px)` mobile responsive (bar column hidden on mobile)
   - `@media (prefers-reduced-motion: reduce)` neutralizer
3. Scoped to `#page-progress` exclusively — no bleed to other surfaces

**Deliverable:** `dg-system.css` Batch 4b block replaced (~+200 LOC, -110 LOC net).

**Exit:** braces balanced (`node -c` not applicable to CSS; manual count or PostCSS check), no `:root` writes, no global overrides.

---

## Stage 8 · Local Chrome MCP verification (the locked discipline)

**Tasks:**
1. Start local server: `python3 -m http.server 3131` from worktree root
2. SW unregister to avoid stale CSS (the v4.99.74 lesson)
3. Open Chrome MCP at `http://localhost:3131/?cert=netplus`
4. Verify v2 mockup matches prod rendering pixel-for-pixel in BOTH themes
5. Switch to `?cert=secplus`, verify Sec+ parity
6. Verify empty state by clearing `localStorage.nplus_history` (LOCALHOST ONLY — never on prod per the v4.81.x data-safety rule)
7. Touch-target verification — measure `.t-row` bounding rect ≥44×44 effective
8. Reduced-motion verification — emulate `prefers-reduced-motion:reduce` in DevTools, confirm all transitions neutralized
9. Keyboard nav — Tab through the page, confirm focus rings visible, focus order matches visual order

**Deliverable:** Chrome MCP verification log (screenshots + computed-style readouts captured to comments in this plan doc).

**Exit:** all 9 checks pass; OR fix-then-retry loop until pass.

---

## Stage 9 · Cross-cert smoke test

**Tasks:**
1. Toggle `localStorage.nplus_active_cert_id` between `netplus` and `secplus` (LOCALHOST ONLY)
2. Verify topic counts match cert packs (50 N+ / 37 Sec+)
3. Verify domain weights match cert packs
4. Verify cert-aware copy swaps (`_renderCertAwareCopy` if it touches progress page)
5. Verify Sec+ Pro-gate doesn't fire on `#page-progress` for Free users (Progress is not Pro-gated; only Sec+ ACCESS is)

**Deliverable:** cross-cert smoke notes in the commit message body.

**Exit:** both certs render correctly, no cross-cert leak.

---

## Stage 10 · UAT + Playwright full local run (the locked pre-push gate)

**Tasks:**
1. `node tests/uat.js` — must exit 0
2. `npx playwright test` — chromium full suite, must exit 0 (the v4.99.74 lesson: pipe-masked exits don't count, capture `$?` directly)
3. If any test fails, fix-then-retry; do not push with failures

**Deliverable:** clean UAT (current baseline 6297/6297 + any v2-specific new guards), clean Playwright (99/99 chromium).

**Exit:** both green, ready for commit.

---

## Stage 11 · Stop-slop final pass on every emitted string

**Tasks:**
1. Re-load the `/stop-slop` skill rubric
2. Grep all new strings emitted by `_renderProgressSummary` / `_progressRowHtml` / `renderProgressRecommendation` / the empty-state branch
3. Audit each against the 5-dimension scorecard (Directness / Rhythm / Trust / Authenticity / Density)
4. Target ≥35/50 per string
5. Migrate any string failing the audit

**Deliverable:** copy audit notes in the commit body.

**Exit:** every emitted string passes ≥35/50.

---

## Stage 12 · Commit + CLAUDE.md row + bump-version

**Tasks:**
1. Stage all changes (`app.js`, `dg-system.css`, `index.html`, `mockups/*-v2.html`, `tests/uat.js`, `docs/superpowers/specs/...`, `docs/superpowers/plans/...`)
2. Run `node scripts/bump-version.js 7.2.0 "Progress page v2 redesign — work-first dashboard"` (or the next appropriate semver)
3. bump-version writes:
   - `APP_VERSION` in `app.js`
   - `CACHE_NAME` in `sw.js`
   - version badge in `index.html`
   - `package.json` version
   - Prepended stub row in the CLAUDE.md history table
4. Re-read CLAUDE.md (mandatory — bump-version mutated it, prior reads are stale)
5. Expand the stub row into a full detailed row in-place — what changed, why, founder lessons preserved
6. Normalize `dg-system.css?v` from dev-token → final version string
7. Run `node tests/uat.js` one more time (the version assertions across 4 surfaces are CI-enforced)
8. Commit with HEREDOC capturing the consolidated ship summary

**Deliverable:** clean commit on `feature/progress-page-redesign-v2`.

**Exit:** `git log` shows the commit, UAT still green post-commit.

---

## Stage 13 · Push + CI green + manual Vercel deploy

**Tasks:**
1. Rebase against latest `main` (in case other ships landed) — `git fetch origin && git rebase origin/main`
2. Resolve any merge conflicts (CLAUDE.md top-of-table is the likely site)
3. Run `node tests/uat.js` one more time after rebase
4. Push: `git push origin feature/progress-page-redesign-v2`
5. Open PR OR merge directly to main per the founder's lane preference (fast lane → direct merge OK)
6. CI runs UAT + Playwright + tech-debt (must go green)
7. **Manual Vercel deploy** — the v7.0.0-era GitHub auto-deploy disconnect lesson: `npx vercel --prod` from the main worktree after merge (until founder reconnects the integration)

**Deliverable:** v7.2.0 in prod at `networkplus.certanvil.com` + `secplus.certanvil.com`.

**Exit:** prod URL serves the v2 page; CACHE_NAME bump invalidates SW.

---

## Stage 14 · Post-deploy live verification (the locked rule)

**Tasks:** per the CLAUDE.md "Post-deploy verification (always run after ship)" section:
1. Cache-bust navigate to each prod URL with `?cert=<id>&_cb=7.2.0`
2. Reproduce the user's exact click path — hover row, click row, drill topic, navigate back, scroll domain strip, click domain strip row → confirm scroll-into-view fires
3. Measure DOM rects + computed styles in real Chrome — not just internal state
4. Walk through empty state via a fresh incognito profile (the localStorage-clear shortcut is LOCAL ONLY — never on prod)
5. Verify both certs in both themes
6. Verify mobile breakpoint at 375 / 768 / 1024 / 1440

**Deliverable:** post-deploy verification log (paste back to founder).

**Exit:** founder confirms standard hit; OR fix-then-redeploy.

---

## Failure modes + recovery

| Mode | Symptom | Recovery |
|---|---|---|
| Mockup looks wrong in dark theme | OKLCH tokens render off | Use Chrome MCP canvas-pixel sampling — don't trust DevTools serialization for `oklab()`; sample with `color(srgb ...)` (the v5.5.12 lesson) |
| UAT migration over-tightens | Stage 4 guards trip when they shouldn't | Loosen window range OR shift to behavioral fixture (the proven v5.5.7 class-of-bug pattern) |
| Render-contract change breaks an existing call site | `_renderProgressSummary` called from somewhere unexpected | Grep all callers BEFORE the edit; add fallback branch if needed |
| Stale CSS during localhost iteration | Edits don't reflect in browser | Bump `dg-system.css?v` token (Stage 5 already handles this); SW unregister if needed |
| Vercel auto-deploy still disconnected at push | Push lands, no deploy fires | Manual `npx vercel --prod` per the v7.0.0 lesson |
| Cert-parity drift | Sec+ looks different from N+ | Diff the two mockups; data swaps only — no structural divergence |
| Touch target somehow still <44 | Lighthouse a11y audit fails | Measure with `getBoundingClientRect()`; ensure row height + padding = ≥44px effective |

---

## What this plan is NOT

- Not the spec — that's `docs/superpowers/specs/2026-05-26-progress-redesign-design.md` (read it first)
- Not concept exploration — the design contract is LOCKED at the spec level
- Not a multi-week project — estimated 1-2 days end-to-end with founder loops on Stages 3 + 14
- Not a touch of global chrome / sidebar / topbar / cert switcher
- Not a touch of the cert pack data (`certs/*.js`) — topic catalog unchanged
- Not a service-worker fetch-logic change — fast lane

---

## Definition of done

- [ ] Spec founder-approved (§7 questions answered, locked in spec)
- [ ] Both v2 mockups authored + founder-approved
- [ ] Render-contract changes shipped in `app.js`
- [ ] Scoped CSS shipped in `dg-system.css`
- [ ] UAT guards migrated + green
- [ ] Playwright chromium 99/99 green
- [ ] Local Chrome MCP verification log captured
- [ ] Touch targets ≥44×44 verified
- [ ] Reduced-motion verified
- [ ] Both certs verified
- [ ] CLAUDE.md row prepended with full detail
- [ ] Version bumped (v7.2.0 or next)
- [ ] Pushed + CI green + manual `vercel --prod` ran
- [ ] Post-deploy live verification passed in both prod browsers
- [ ] Founder confirms "standard hit"

When all 14 boxes are ticked, the redesign ships.
