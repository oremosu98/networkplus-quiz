---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# Design Spec — Minify-on-Deploy Build Step

**Date:** 2026-06-01
**Status:** Approved (design); pending implementation plan
**Lane:** Gated (changes deploy mechanism; minifies `auth-state.js` / `cloud-store.js`)
**Branch:** `feature/perf-minify-build` (off `main`)

---

## Background — how we got here

The trigger was a TikTok ("Why your vibe coded app is slow") listing 5 backend
performance "sins": N+1 queries, missing indexes, `SELECT *`, no pagination, and
blocking/synchronous work. We investigated whether any applied to CertAnvil
before committing to work.

**Finding: the database is already optimal for this app.** Grounding each sin in
the actual code:

| Sin | Verdict for CertAnvil |
|-----|-----------------------|
| N+1 / JOIN | N/A — per-user app, no query-in-loop pattern |
| Missing indexes | Already done — `quiz_history_user_cert_created_idx (user_id, cert, created_at DESC)` + PKs + `UNIQUE (user_id, cert)` cover every hot path |
| `SELECT *` | Both live instances are *needed* (`cloud-store.js` round-trips `metadata` jsonb via `rowToHistoryItem`) or *intentional* (`account.js` full data export). Win ≈ 35 KB once per login |
| No pagination | Only the admin profiles list is unbounded — admin-only, tiny table |
| Async + workers | N/A — AI calls are already async `fetch`; the proxy is already serverless |

Implementing the video's advice would be busywork on gated-lane files for no
measurable gain. So we measured the *real* critical path instead.

## The real bottleneck — measured

Critical-path cold load (netplus subdomain, gzipped = what ships over the wire):

| Asset | Raw | Gzip | Notes |
|-------|-----|------|-------|
| `app.js` | 866 KB | 265 KB | deferred |
| `certs/netplus.js` | 518 KB | 147 KB | one cert pack precached |
| `styles.css` | 545 KB | 100 KB | render-blocking |
| `dg-system.css` | 238 KB | 40 KB | render-blocking |
| `lib/supabase-umd.min.js` | 197 KB | 50 KB | already minified |
| index.html + small JS | ~180 KB | ~50 KB | — |
| **Total** | ~2.5 MB | **~650 KB** | — |

The load *strategy* is already good: everything is `defer`, inline critical CSS,
preload hints, lazy-loaded feature modules, and a service worker that caches the
shell so repeat visits are fast.

**The one unexploited lever: nothing is minified.** `app.js`, `certs/*.js`,
`styles.css`, and `dg-system.css` all ship as readable source. The `app.js`
3.3× gzip ratio (866 → 265 KB) is the tell — minified code starts smaller.

## Goal

Add a minification step to production output, cutting cold-load transfer and
mobile parse time, **without** mutating readable source or breaking the careful
defer order / cross-file global contract.

**Expected impact:** cold load ~650 KB → **~370 KB gzip (~43%)**, plus ~50% less
main-thread JS parse time on mobile. Because the SW cache name bumps every
deploy (forcing a full re-download for active users on each ship), the win lands
on every deploy, not only first visit.

## Non-goals (YAGNI)

- **The DB "fixes."** Already optimal — see Background.
- **Bundling / concatenation.** Would break the cross-file global contract
  (`certs/*.js` set `window.CERT_PACK`, `app.js` reads it) and the deliberate
  defer order. Each file is minified independently.
- **HTML minification.** index.html is 27 KB gzip — not worth the tooling.
- **terser.** esbuild is sufficient; terser is a future ~5% squeeze if wanted.
- **Source mutation.** Source files stay readable and git-diffable.

## Architecture — "source stays readable, `dist/` ships minified"

Vercel switches from zero-config static (serving the repo root) to running a
build that emits a minified `dist/`. Source files are untouched; local
`npm run serve` keeps serving readable source; only production serves minified
bytes.

```
source (repo root, readable)
        │
        │  npm run build  (Vercel build step)
        ▼
   dist/  (copy of served surface, JS+CSS minified)
        │
        ▼
   Vercel serves dist/   →   SW precaches dist/ assets (relative paths unchanged)
```

### Components

1. **`scripts/build.js`** — the build orchestrator:
   - Clean + recreate `dist/`.
   - Copy the *served surface* into `dist/`: `index.html`, `manifest.json`,
     `favicon.svg`, `sw.js`, `lib/`, `certs/`, `features/`, `vendor/`, all
     root `*.css` and `*.js`, SVG/image assets.
   - **Exclude** from copy: `node_modules/`, `.git/`, `tests/`, `scripts/`,
     `docs/`, `.planning/`, `.claude/`, `*.md`, dotfiles, `landing/`
     (separate Vercel project).
   - Minify each JS file **independently via esbuild's `transform` API**
     (NOT `build`/bundle) so top-level globals (`window.CERT_PACK`,
     `window.CURRENT_CERT`, etc.) are preserved.
   - Minify `styles.css` + `dg-system.css` via esbuild CSS transform.
   - **Skip** already-minified files (`*.min.js`) and pass-through assets
     (`vendor/three/**` — large, served outside the SW cache anyway).

2. **`esbuild`** — single new dev dependency. Minifies JS + CSS; whole surface
   in ~50 ms.

3. **`vercel.json`** — add `"buildCommand": "npm run build"` and
   `"outputDirectory": "dist"`. Vercel runs `npm install` → `npm run build` →
   serves `dist/`. Existing headers/CSP block unchanged.

4. **`package.json`** — add `"build": "node scripts/build.js"` script and
   `esbuild` to `devDependencies`. Optional `"serve:dist": "npx serve dist -l 3132 -s"`
   for local minified preview.

### What does NOT change

- **`sw.js`** — relative precache paths (`./app.js`) resolve against `dist/`
  root identically. No edit.
- **`index.html`** — same filenames, same script/link tags. Copied verbatim,
  not edited.
- **`scripts/bump-version.js`** — operates on source pre-build; build copies the
  bumped source. No edit.
- **`.gitignore`** — add `dist/` (build artifact, never committed).

## The critical constraint — independent, non-bundling minification

The app shares state across `<script>` tags through globals. esbuild's
`transform` API minifies a single file in isolation and **does not mangle
top-level identifiers** (only locals inside function scopes), so cross-file
globals survive. Bundling (`esbuild.build` with multiple entry points) WOULD
rename/scope-hoist these and break the contract. The build script must use
`transform` per file, never `build`.

**Safety default:** run esbuild with `keepNames: true` initially. This preserves
`Function.prototype.name` / `.toString`-derived names (cheap insurance against
any code that introspects function names — e.g. error reporting, web-vitals).
We can drop it later for the extra few KB once UAT confirms nothing relies on it.

## Data flow — a deploy

1. `npm run bump` updates `CACHE_NAME` + version pills in **source**.
2. Commit + push to the feature branch / merge to `main`.
3. Vercel runs `npm install` → `npm run build` → minified `dist/`.
4. Vercel serves `dist/`.
5. SW is network-first for HTML/JS → new minified JS lands next visit; static
   assets stale-while-revalidate.
6. Version pill in the topbar confirms the live version.

## Error handling

- **Build failure** (esbuild throws on a malformed file): `build.js` exits
  non-zero → Vercel fails the deploy → previous deploy stays live. No partial
  `dist/` ships.
- **Minify-induced runtime breakage:** caught by the preview smoke test before
  merge (see Testing). Production never sees unverified minified output because
  this is gated-lane.
- **esbuild dependency unavailable in CI:** `npm install` fails → deploy fails
  → previous deploy stays live.

## Testing

- **UAT (5,100 assertions)** + Playwright run against *source* on local
  `npm run serve` — unchanged, still the primary gate.
- **New: minified-output smoke gate.** After build, run a Playwright pass
  against the Vercel **preview** (which serves minified `dist/`) covering the
  highest-risk minified files: auth/sign-in flow (`auth-state.js`,
  `cloud-store.js`, `lib/supabase.js`), a quiz session, and cert-pack load
  (`certs/netplus.js` → `window.CERT_PACK`). This is the gate that catches any
  minify regression in behavior.
- **Build determinism check:** `npm run build` twice → identical `dist/` output
  (no nondeterministic ordering).

## Rollback

Revert the two `vercel.json` keys (`buildCommand`, `outputDirectory`). Vercel
returns to serving the repo root as readable source. One-commit revert, zero
data risk, no SW/migration involvement.

## Rollout — gated lane

`feature/perf-minify-build` → PR → Vercel preview auto-spins → smoke-test the
**minified** preview (not just that it loads — verify auth + quiz + cert load) →
squash-merge to `main` → prod.

## Sequencing vs M7 (CSP unsafe-inline removal)

**Decision: proceed in parallel, no hard dependency on M7.**

- Conflict surface is near-zero: minify *adds* `build.js` + `vercel.json` keys +
  `package.json` deps and *copies* (never edits) `index.html`. M7 *edits*
  `index.html` inline handlers + `app.js` source + `event-actions.js`. Git
  merges cleanly.
- Complementary, not conflicting: minifying *external* JS files needs no
  `'unsafe-inline'`, so it does not undermine M7's CSP goal.
- Operational guard only: verify/merge one gated preview at a time so a
  smoke-test failure is attributable to the right change. Branch minify off
  `main`, not off PR #413.

## Open questions

None blocking. Optional follow-ups after this ships:
- External source maps for prod debugging (adds `.map` files; weigh against
  not exposing source).
- CSS dead-code audit (`styles.css` is large; risky, separate effort).
- terser pass for the extra ~5% JS squeeze.
