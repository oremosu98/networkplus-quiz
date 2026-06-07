# Onboarding Rollout Gate + Activation Telemetry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-origin `?onb=1` localStorage gate with a global, server-driven `app_config` switch (instant kill-switch, fixes Bug A), and instrument first-run so per-cert activation is measurable.

**Architecture:** A single public-readable Supabase config row drives whether onboarding is on. Because the gate decision must be made *synchronously* at boot (to show the resolve skeleton before `app.js` renders, avoiding a home-flash), the client reads a **cached** value synchronously and refreshes the cache from Supabase asynchronously for the *next* load — which is exactly the documented kill-switch semantic ("every client reverts on next load"). Activation telemetry writes `metadata.activated.<certId>` through the existing cloud-store pipeline, mirroring the cert-scoped read-merge that `metadata.sr` already uses so one cert's flush never wipes another's.

**Tech Stack:** Vanilla JS (no build step), Supabase JS UMD client (`window.certanvilSupabase`), Postgres RLS, repo UAT (`tests/uat.js`) + live-verify via local server / Vercel preview.

**Lane:** GATED (touches `supabase/migrations/*` + `cloud-store.js`). Feature branch → PR (auto-spins Supabase branch DB + Vercel preview + CI) → run migration on branch DB → smoke + rollback test → squash-merge. Walk `SHIP_CHECKLIST.md` Phases 1, 2, 4, 5, 6.

**Testing note (repo reality):** This codebase has no per-function unit harness — it uses `tests/uat.js` (structural + behavioral regex/AST assertions over source) plus mandatory live-verify in a real browser. "Tests" below therefore mean UAT assertions where they fit + explicit live-verify steps, not red/green unit TDD. That is the established pattern here; do not introduce a new unit framework.

**Decisions locked (founder, 2026-06-07):**
- Scope = gate **+** activation telemetry in one PR.
- Ship with `onboarding_enabled = false`; verify on preview + manual `?onb=1`, then flip the row to `true` as a separate deliberate action.
- `app_config` is a key/value table (extensible for future flags), public SELECT only; writes are service-role (founder via Supabase dashboard).

---

## File Structure

| File | Create/Modify | Responsibility |
|---|---|---|
| `supabase/migrations/20260607_onboarding_config.sql` | **Create** | `app_config` table + public-read RLS + seed `onboarding_enabled=false` + ROLLBACK block. |
| `lib/onboarding-boot.js` | **Modify** (`guardOn`, ~21-30; add `refreshConfig`) | Cache-first gate decision + async config refresh. Keeps `?onb=` dev override. |
| `cloud-store.js` | **Modify** (USER_DATA_KEYS ~67; `buildJsonbFromLocalStorage` ~277; `applyJsonbToLocalStorage` ~304; `doFlush` merge ~415) | Carry `metadata.activated` + `metadata.onb_skips` as cert-scoped sub-objects, read-merged on flush (mirrors `sr`). |
| `lib/onboarding-firstrun.js` | **Modify** (`onCalibrationDone` ~193; `onMovementDone` ~212; skip action ~246) | Write per-cert activation (baseline at calibration, moved at movement) + skip record; flush to cloud. |
| `docs/planning/ONBOARDING_ROLLOUT_GATE_PLAN.md` | this file | Plan + metric query doc (Task 6). |
| `tests/uat.js` | **Modify** (append) | Structural assertions for the gate + telemetry wiring. |

**Shared shapes (use these exact names everywhere):**
- Config table: `app_config(key text pk, enabled boolean not null default false, updated_at timestamptz not null default now())`. Seed key = `'onboarding_enabled'`.
- localStorage keys: dev override `onb_router` (`'1'`|`'0'`|absent), server cache `onb_cfg` (`'1'`|`'0'`|absent), activation `nplus_activated` (this cert's object only), skips `nplus_onb_skips` (this cert's record only).
- Activation object: `metadata.activated[certId] = { at: <ms epoch>, baseline: <number>, moved: <number|null> }`.
- Skip record: `metadata.onb_skips[certId] = { at: <ms epoch> }`.

---

## Task 1: Migration — `app_config` table + public-read RLS

**Files:**
- Create: `supabase/migrations/20260607_onboarding_config.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ══════════════════════════════════════════════════════════════════════════
-- CertAnvil — onboarding rollout gate config (Track A)
-- ══════════════════════════════════════════════════════════════════════════
-- WHAT: a tiny public-readable key/value config table. One seeded row,
--       'onboarding_enabled', drives whether the onboarding flow is live.
--       Replaces the per-origin localStorage `onb_router` flag so the switch
--       is global across all cert subdomains and instantly reversible.
-- WHY NOW: flips onboarding from manual ?onb=1 to a global, server-driven
--       gate with a kill-switch; also fixes Bug A (per-origin flag vanished
--       when switching cert subdomains — separate Vercel origins).
-- SECURITY: SELECT is public (anon + authenticated). There is NO insert/
--       update/delete policy, so writes are service-role only — the founder
--       flips `enabled` from the Supabase dashboard / SQL editor. Read-only
--       from the browser, so none of the RLS write-path gotchas (POSIX regex,
--       UPSERT→UPDATE policy, return=representation) apply here.
-- VERIFY AFTER APPLYING (run in SQL editor):
--   select key, enabled from public.app_config;            -- one row, enabled=false
--   set role anon; select enabled from public.app_config
--     where key='onboarding_enabled'; reset role;          -- returns the row (public read works)
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.app_config (
  key        text primary key,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists "app_config public read" on public.app_config;
create policy "app_config public read"
  on public.app_config
  for select
  to anon, authenticated
  using (true);

insert into public.app_config (key, enabled)
  values ('onboarding_enabled', false)
  on conflict (key) do nothing;

-- ROLLBACK:
-- drop policy if exists "app_config public read" on public.app_config;
-- drop table if exists public.app_config;
```

- [ ] **Step 2: Verify the file is well-formed**

Run: `grep -c 'create table if not exists public.app_config' supabase/migrations/20260607_onboarding_config.sql`
Expected: `1`

Run: `grep -c '^-- ROLLBACK:' supabase/migrations/20260607_onboarding_config.sql`
Expected: `1` (gated-lane rule: migrations dated ≥ 2026-05-12 MUST carry a tested ROLLBACK block)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260607_onboarding_config.sql
git commit -m "feat(onboarding): app_config rollout-gate table + public-read RLS

ACTION REQUIRED: paste supabase/migrations/20260607_onboarding_config.sql in
Supabase SQL Editor (project appmuaqwuethndvalarl) -> Run. Then on the PR
branch DB first; prod after merge. Seeded enabled=false (flip later)."
```

> **Branch-DB test (done during ship, Task 7 — noted here so it isn't forgotten):** run this migration on the PR's Supabase branch DB, confirm the verify queries, then test the ROLLBACK block (paste the two `drop` lines) and re-apply. Do NOT run it against prod until post-merge.

---

## Task 2: Boot read — cache-first gate + async refresh

**Files:**
- Modify: `lib/onboarding-boot.js:21-30` (replace `guardOn`), and add `refreshConfig()` + its call.

Context: `guardOn()` currently is the whole gate — `localStorage.getItem('onb_router') === '1'`, toggled by `?onb=1`/`?onb=0`. We keep `?onb=` as a **dev override** (now tri-state) and add the server-config cache as the default source. `lib/supabase.js` (script #2 in index.html) runs before this module (#11), so `window.certanvilSupabase` is already available; we still null-guard.

- [ ] **Step 1: Replace `guardOn` (currently lines 21-28)**

Replace:

```js
  function guardOn() {
    try {
      var s = location.search || '';
      if (s.indexOf('onb=1') !== -1) localStorage.setItem('onb_router', '1');
      if (s.indexOf('onb=0') !== -1) localStorage.removeItem('onb_router');
      return localStorage.getItem('onb_router') === '1';
    } catch (_) { return false; }
  }
```

with:

```js
  // The gate decision is SYNCHRONOUS (must run before app.js renders, to show
  // the resolve skeleton without a home-flash). So we read a CACHED value here
  // and refresh that cache from Supabase async (refreshConfig) for the next
  // load — which is exactly the kill-switch semantic: "reverts on next load".
  //
  // Precedence: dev override (?onb=) > server-config cache > off.
  //   ?onb=1    -> dev force ON   (sets onb_router='1')
  //   ?onb=0    -> dev force OFF  (sets onb_router='0')
  //   ?onb=auto -> clear override (removes onb_router; falls back to server cfg)
  function guardOn() {
    try {
      var s = location.search || '';
      if (s.indexOf('onb=auto') !== -1) localStorage.removeItem('onb_router');
      else if (s.indexOf('onb=1') !== -1) localStorage.setItem('onb_router', '1');
      else if (s.indexOf('onb=0') !== -1) localStorage.setItem('onb_router', '0');
      var dev = localStorage.getItem('onb_router');
      if (dev === '1') return true;
      if (dev === '0') return false;
      return localStorage.getItem('onb_cfg') === '1';   // server-config cache; default off
    } catch (_) { return false; }
  }

  // Fire-and-forget: read the global gate from Supabase and cache it for the
  // NEXT load. Runs regardless of the current ENABLED value, so flipping the
  // server row propagates to every client on their next load. On read failure
  // we keep whatever was cached (never clobber to off on a transient error).
  function refreshConfig() {
    try {
      var sb = window.certanvilSupabase;
      if (!sb || !sb.from) return;
      sb.from('app_config').select('enabled').eq('key', 'onboarding_enabled').single()
        .then(function (res) {
          if (res && res.data && typeof res.data.enabled === 'boolean') {
            try { localStorage.setItem('onb_cfg', res.data.enabled ? '1' : '0'); } catch (_) {}
          }
        }, function () { /* read failed — keep cached value */ });
    } catch (_) {}
  }
```

- [ ] **Step 2: Call `refreshConfig()` right after `ENABLED` is computed**

Find (line ~30): `var ENABLED = guardOn();`
Immediately after it, add:

```js
  refreshConfig();   // update the cache for next load (independent of ENABLED)
```

- [ ] **Step 3: Live-verify the gate locally (no prod writes)**

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz/.claude/worktrees/onboarding-admin-tier"
python3 -m http.server 3131
```

In a browser at `http://localhost:3131`:
- Expected: `?onb=1` → onboarding skeleton/flow shows; `?onb=0` → off and stays off on reload; `?onb=auto` then reload → off (no override, server cache empty/false).
- In console: `localStorage.getItem('onb_cfg')` becomes `'0'` after a load once the (local) Supabase read resolves against the dev DB — or stays `null` if the table isn't on the dev DB yet (that's fine; default off). **Localhost only — never run setItem against prod (data-loss rule).**

- [ ] **Step 4: Commit**

```bash
git add lib/onboarding-boot.js
git commit -m "feat(onboarding): server-driven rollout gate (cache-first + async refresh)

guardOn() now reads onb_cfg cache (default off); refreshConfig() updates it
from app_config for next load. ?onb= stays as tri-state dev override
(1/0/auto). Fixes Bug A: global gate persists across cert origins."
```

---

## Task 3: cloud-store — carry cert-scoped `activated` + `onb_skips`

**Files:**
- Modify: `cloud-store.js` — `USER_DATA_KEYS` (~67-113), `buildJsonbFromLocalStorage` (~277-301), `applyJsonbToLocalStorage` (~304-337), `doFlush` read-merge (~415-428).

**Why this is the careful one:** `doFlush` does a **full-metadata column replace** built from localStorage (`update = { metadata: jsonb }`). Any metadata key the build step doesn't produce is **dropped on every flush**. And cert-scoped maps (keyed by certId) get wiped for *other* certs unless `doFlush` re-reads cloud and merges — which is exactly why `sr` has the select-then-merge at lines 415-428. `activated` and `onb_skips` are cert-scoped the same way, so they must (a) be produced by the build step and (b) be merge-preserved in `doFlush`. We extend the existing single `select('metadata')` round-trip to preserve all three.

- [ ] **Step 1: Register the two new keys in `USER_DATA_KEYS`**

After the last entry (`'nplus_lab_completions',` ~line 112), add:

```js
    'nplus_activated',   // onboarding: per-cert activation (metadata.activated.<certId>)
    'nplus_onb_skips',   // onboarding: per-cert diagnostic-skip record (metadata.onb_skips.<certId>)
```

- [ ] **Step 2: Cert-scope them on the BUILD side (`buildJsonbFromLocalStorage`)**

In `buildJsonbFromLocalStorage`, the `sr_queue` special-case is at ~291-297. Immediately AFTER that `if (cloudKey === 'sr_queue') {...}` block, add:

```js
      // Cert-scope onboarding activation + skip: metadata.<key>.<certId>.
      // localStorage holds only THIS subdomain's cert entry; doFlush re-reads
      // cloud and merges so sibling certs are preserved.
      if (cloudKey === 'activated' || cloudKey === 'onb_skips') {
        var aCert = _ccCert();
        if (!out[cloudKey]) out[cloudKey] = {};
        out[cloudKey][aCert] = parsed;
        return;
      }
```

- [ ] **Step 3: Cert-scope them on the APPLY side (`applyJsonbToLocalStorage`)**

In `applyJsonbToLocalStorage`, after the `sr_queue` backward-compat block (~320-325) and before the generic `var localKey = ...` line (~326), add:

```js
      // Onboarding cert-scoped maps: pull only THIS cert's entry down to local.
      if (cloudKey === 'activated' || cloudKey === 'onb_skips') {
        var mine = (meta[cloudKey] && meta[cloudKey][cert]) ? meta[cloudKey][cert] : null;
        if (mine != null) {
          try { localStorage.setItem('nplus_' + cloudKey, JSON.stringify(mine)); } catch (e) {}
        }
        return;
      }
```

(`cert` is already in scope — declared `var cert = _ccCert();` at the top of `applyJsonbToLocalStorage`.)

- [ ] **Step 4: Preserve sibling certs in `doFlush` (extend the existing merge)**

The current merge (lines ~415-428) only handles `sr`. Replace the `writeProfile` + `ops.push(...)` block:

```js
      var writeProfile = function (mergedSr) {
        if (mergedSr && Object.keys(mergedSr).length) jsonb.sr = mergedSr;
        var update = { metadata: jsonb };
        if (examDate) update.exam_date = examDate;
        return sb.from('profiles').update(update).eq('id', userId);
      };
      ops.push(
        sb.from('profiles').select('metadata').eq('id', userId).single().then(function (res) {
          var existingSr = (res && res.data && res.data.metadata && res.data.metadata.sr) || {};
          var merged = Object.assign({}, existingSr, (jsonb.sr || {}));   // our cert overrides, others preserved
          return writeProfile(merged);
        }, function () {
          return writeProfile(jsonb.sr);   // read failed — write our cert's sr only
        })
      );
```

with (generalised to merge all three cert-scoped maps in the one round-trip):

```js
      // All three of sr / activated / onb_skips are cert-scoped maps. We only
      // know THIS subdomain's cert locally, so re-read cloud and merge ours
      // over the existing per-cert entries — otherwise flushing one cert wipes
      // the others' sub-objects on the full-metadata column replace.
      var CERT_SCOPED = ['sr', 'activated', 'onb_skips'];
      var writeProfile = function (existingMeta) {
        CERT_SCOPED.forEach(function (k) {
          var existing = (existingMeta && existingMeta[k]) || {};
          var ours = jsonb[k] || {};
          var merged = Object.assign({}, existing, ours);   // our cert overrides, siblings preserved
          if (Object.keys(merged).length) jsonb[k] = merged;
        });
        var update = { metadata: jsonb };
        if (examDate) update.exam_date = examDate;
        return sb.from('profiles').update(update).eq('id', userId);
      };
      ops.push(
        sb.from('profiles').select('metadata').eq('id', userId).single().then(function (res) {
          return writeProfile(res && res.data && res.data.metadata);
        }, function () {
          return writeProfile(null);   // read failed — write our cert's slices only
        })
      );
```

- [ ] **Step 5: Sanity-check no other `sr`-merge call site broke**

Run: `grep -n "writeProfile\|CERT_SCOPED\|existingSr" cloud-store.js`
Expected: only the one `writeProfile` definition + its single `ops.push` caller above; no stray `existingSr` left behind.

- [ ] **Step 6: Commit**

```bash
git add cloud-store.js
git commit -m "feat(onboarding): cloud-sync per-cert activated + onb_skips (cert-scoped merge)

Mirrors metadata.sr handling: build nests under metadata.<key>.<certId>,
apply pulls this cert's slice, doFlush re-reads + merges so flushing one
cert never wipes siblings. Prevents cross-cert activation data loss."
```

---

## Task 4: first-run — write activation (baseline + moved) and skips

**Files:**
- Modify: `lib/onboarding-firstrun.js` — `onCalibrationDone` (~193-210), `onMovementDone` (~212-223), skip-diagnostic action (~246-248).

We write the per-cert activation object as soon as the calibration produces a baseline, update `moved` after the movement leg, and record a skip when the user skips the diagnostic. Each write goes to localStorage then flushes via cloud-store. All writes are guarded so the design-review / engine-absent fallbacks never throw.

- [ ] **Step 1: Add a small helper near the top of the IIFE (after the `PH`/`real` declarations, before the screen builders)**

```js
  // ── activation telemetry ─────────────────────────────────────────────────
  // Persist per-cert activation so the activation metric is queryable and the
  // router's explicit-flag path (metadata.activated.<certId>) is populated.
  // localStorage is this subdomain's cert only; cloud-store cert-scopes + merges.
  function writeActivation(patch) {
    try {
      if (!state.certId) return;
      var prev = {};
      try { prev = JSON.parse(localStorage.getItem('nplus_activated') || '{}') || {}; } catch (_) { prev = {}; }
      var next = Object.assign({}, prev, patch);
      localStorage.setItem('nplus_activated', JSON.stringify(next));
      if (window.cloudStore && window.cloudStore.flush) window.cloudStore.flush('nplus_activated');
    } catch (_) {}
  }
  function recordSkip() {
    try {
      if (!state.certId) return;
      localStorage.setItem('nplus_onb_skips', JSON.stringify({ at: Date.now() }));
      if (window.cloudStore && window.cloudStore.flush) window.cloudStore.flush('nplus_onb_skips');
    } catch (_) {}
  }
```

(Use `Date.now()` for `at`; this runs in the live browser, not the workflow sandbox — `Date.now()` is fine in app code.)

- [ ] **Step 2: Write the baseline at calibration**

In `onCalibrationDone(res)`, after `real = { ... };` is fully assigned (after line ~207, before `showPage`/`goScoreReveal`), add:

```js
    writeActivation({ at: Date.now(), baseline: real.calibScore, moved: null });
```

- [ ] **Step 3: Record the movement delta at the aha**

In `onMovementDone(res)`, after `real.score = to;` (line ~218), add:

```js
    writeActivation({ moved: (typeof real.moveFrom === 'number') ? (real.moveTo - real.moveFrom) : null });
```

- [ ] **Step 4: Record a skip when the diagnostic is skipped**

In `onClick`, the `skip-diagnostic` branch (~246-248) currently logs + `handToHome()`. Add `recordSkip();` before `handToHome();`:

```js
    } else if (action === 'skip-diagnostic') {
      try { console.info('[onb] first-run: skipped diagnostic for', state.certId); } catch (_) {}
      recordSkip();
      handToHome();
    }
```

- [ ] **Step 5: Live-verify the writes (localhost only)**

With `python3 -m http.server 3131` running, at `http://localhost:3131?onb=1`, walk first-run in mock mode (the existing `mockMode` path drives calibration → movement without a real API key). After calibration: `JSON.parse(localStorage.nplus_activated)` shows `{at, baseline, moved:null}`; after movement: `moved` is a number. Run the skip path on a fresh cert: `localStorage.nplus_onb_skips` is set. **Localhost only.**

- [ ] **Step 6: Commit**

```bash
git add lib/onboarding-firstrun.js
git commit -m "feat(onboarding): write per-cert activation (baseline+moved) and skip record

Calibration sets baseline+at; movement records the readiness delta; skipping
the diagnostic records onb_skips. Flushed via cloud-store (cert-scoped)."
```

---

## Task 5: UAT structural assertions

**Files:**
- Modify: `tests/uat.js` (append a small block near the other onboarding/boot assertions — grep for an existing `onb_router` or `onboarding-boot` assertion to find the neighbourhood).

These are source-level smoke assertions in the repo's existing style (string/AST presence), guarding that the wiring isn't silently removed.

- [ ] **Step 1: Add assertions**

```js
  // ── Onboarding rollout gate + activation telemetry (Track A) ──────────────
  assert(
    /app_config/.test(read('lib/onboarding-boot.js')) && /refreshConfig/.test(read('lib/onboarding-boot.js')),
    'onboarding-boot reads app_config via refreshConfig'
  );
  assert(
    /onb_cfg/.test(read('lib/onboarding-boot.js')),
    'onboarding-boot uses the onb_cfg server-config cache'
  );
  assert(
    /nplus_activated/.test(read('cloud-store.js')) && /onb_skips/.test(read('cloud-store.js')),
    'cloud-store carries activated + onb_skips keys'
  );
  assert(
    /CERT_SCOPED/.test(read('cloud-store.js')),
    'cloud-store merges cert-scoped maps (sr/activated/onb_skips) on flush'
  );
  assert(
    /writeActivation/.test(read('lib/onboarding-firstrun.js')) && /recordSkip/.test(read('lib/onboarding-firstrun.js')),
    'firstrun writes activation + skip records'
  );
```

(Match `read(...)`/`assert(...)` to the actual helper names used in `tests/uat.js` — grep first; adjust if the helpers are named differently, e.g. `srcOf`/`ok`.)

- [ ] **Step 2: Run UAT**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node tests/uat.js
```
Expected: PASS (new assertions green; no regressions). If `validation-audit` trips, that's unrelated to this change — investigate separately per CLAUDE.md.

- [ ] **Step 3: Commit**

```bash
git add tests/uat.js
git commit -m "test(onboarding): UAT guards for rollout gate + activation telemetry wiring"
```

---

## Task 6: Activation metric query (doc only)

**Files:**
- Modify: this file (append below). No app code.

- [ ] **Step 1: Record the metric query**

The single activation metric is **readiness movement in session 1**, now backed by `metadata.activated.<certId>.at`. While N is small, run periodically in the Supabase SQL editor:

```sql
-- New accounts in a window, and what fraction activated a cert within ~session 1
-- (activation timestamp within 24h of account creation). Adjust the interval to
-- your definition of "session 1".
with new_accounts as (
  select id, created_at
  from public.profiles
  where created_at >= now() - interval '30 days'
),
activations as (
  select na.id,
         na.created_at,
         min((v.value->>'at')::bigint) as first_activation_ms
  from new_accounts na
  cross join lateral jsonb_each(coalesce(na.* , '{}'::jsonb)) -- placeholder; see note
  -- NOTE: activated lives in profiles.metadata->'activated' as {certId: {at,...}}.
  -- Use jsonb_each on the metadata->'activated' object:
  -- from new_accounts na, jsonb_each(p.metadata->'activated') v  (join profiles p on p.id=na.id)
  group by na.id, na.created_at
)
select count(*) filter (where first_activation_ms is not null
         and first_activation_ms <= extract(epoch from created_at)*1000 + 24*3600*1000) as activated_session1,
       count(*) as total_new,
       round(100.0 * count(*) filter (where first_activation_ms is not null
         and first_activation_ms <= extract(epoch from created_at)*1000 + 24*3600*1000) / nullif(count(*),0), 1) as pct
from activations;
```

Skips (separate cohort, not part of the activation metric):

```sql
select count(*) as accounts_with_a_skip
from public.profiles
where metadata ? 'onb_skips' and jsonb_typeof(metadata->'onb_skips') = 'object';
```

- [ ] **Step 2: Commit**

```bash
git add docs/planning/ONBOARDING_ROLLOUT_GATE_PLAN.md
git commit -m "docs(onboarding): activation + skip metric queries"
```

---

## Task 7: Ship (gated lane) — PR, branch-DB migration, verify, merge

Walk `SHIP_CHECKLIST.md`. Do NOT flip the config to `true` here.

- [ ] **Step 1: Branch + PR**

Build on a focused feature branch off `origin/main` (so the PR diff is the gate + telemetry, not the mockup commits which are already on `origin/worktree-onboarding-admin-tier`). Push and open a PR — this auto-spins a Supabase branch DB + Vercel preview + CI.

- [ ] **Step 2: Version bump (5 surfaces)**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
node scripts/bump-version.js 7.32.0 "Onboarding rollout gate (app_config) + activation telemetry — shipped OFF"
```
Then manually bump `dg-system.css?v=` in `index.html` (the script misses it). Re-read CLAUDE.md after (the script rewrites it).

- [ ] **Step 3: Run the migration on the BRANCH DB first**

In the PR's Supabase branch project: paste `supabase/migrations/20260607_onboarding_config.sql` → Run. Confirm the two verify queries in the migration header. Then test ROLLBACK (paste the two `drop` lines) and re-apply. Never touch prod here.

- [ ] **Step 4: Smoke the preview**

On the Vercel preview URL: `?onb=1` shows the flow; default (no param) stays OFF because the seeded row is `false`; walk first-run in mock mode and confirm `metadata.activated` lands in the branch DB profile. Drive it in a real browser per CLAUDE.md "Post-deploy verification".

- [ ] **Step 5: Squash-merge → prod, then apply migration to prod**

After CI green + self-sign-off: squash-merge. Post-merge, apply the migration to the **prod** Supabase project (still `enabled=false`). Run `tests/deploy-verify.js` / smoke prod.

- [ ] **Step 6: STOP — hand back for the flip decision**

Report: merged, prod migrated, onboarding still OFF. The flip is a separate deliberate action (below).

---

## Task 8: Flip ON (separate, deliberate, reversible) — after verify

Not part of the PR. When the founder is ready to roll onboarding out to real users:

- [ ] **Step 1:** In the **prod** Supabase SQL editor:

```sql
update public.app_config set enabled = true, updated_at = now() where key = 'onboarding_enabled';
```

- [ ] **Step 2:** Reload the prod app (no param). Onboarding should engage for non-activated users within one load (cache refresh). Verify in a real browser.

- [ ] **Kill-switch:** set `enabled = false` again → every client reverts on next load. No redeploy.

---

## Self-Review

- **Spec coverage (handoff §4 build pieces):** 1 Migration → Task 1 ✓. 2 Boot read → Task 2 ✓. 3 Activation-write → Tasks 3+4 ✓. 4 Skip-tracking → Tasks 3+4 ✓. 5 Metric query (doc) → Task 6 ✓. Audience decision (global on; per-cert activation gates first-run-vs-skip) → satisfied by the existing router (unchanged) + the global gate ✓. Kill-switch → Task 8 ✓. Bug A fix → Task 2 (global cross-origin gate) ✓.
- **Placeholder scan:** the metric SQL in Task 6 intentionally shows the corrected `jsonb_each(metadata->'activated')` form in a NOTE because the activation map is keyed by certId — the worker must use that join form, not the placeholder cross-join. Flagged inline, not a silent gap.
- **Type/name consistency:** `onb_router` (dev override), `onb_cfg` (cache), `nplus_activated`, `nplus_onb_skips`, `metadata.activated.<certId>={at,baseline,moved}`, `metadata.onb_skips.<certId>={at}`, `app_config(key,enabled,updated_at)`, `refreshConfig`, `writeActivation`, `recordSkip`, `CERT_SCOPED` — used identically across Tasks 1-6 ✓.
- **Risk note:** the only data-loss-class change is `cloud-store.js` Task 3; mitigated by mirroring the proven `sr` cert-scoped read-merge and by Step 5's grep + Task 7 branch-DB smoke before prod.
