# RFC: IndexedDB Tier-3 Backup

**Status:** Draft (2026-04-25, post-v4.81.x incident)
**Target ship:** v4.82.0 (next Monday — Cadence feature day)
**Closes:** the localStorage-clear hole left by v4.81.2's same-namespace backups
**Risk:** Medium — async API + transaction semantics + concurrent-tab handling. Not a same-day ship.

---

## 1. Problem statement

The v4.81.2 auto-backup module snapshots every `nplus_*` localStorage key to a date-suffixed key (`nplus_autobackup_2026-04-25`) and keeps a rolling 7-day window. This protects against:

- ✅ Single-key corruption (any code or console call that overwrites one key)
- ✅ Multi-key corruption (the v4.81.x test-injection pattern)
- ✅ User discovery + recovery within 7 days

It does **not** protect against:

- ❌ `localStorage.clear()` — wipes everything in scope, including the snapshots themselves
- ❌ Browser "Clear site data" / "Clear storage" — same scope
- ❌ Service worker bug that wipes the localStorage cache
- ❌ Browser bug that corrupts the localStorage namespace

The snapshots live in the same namespace they're trying to protect. **That's a circular dependency.** A genuine recovery layer needs to live in a storage tier that survives wholesale localStorage loss.

---

## 2. Storage-tier comparison

| Tier | Cleared by `localStorage.clear()` | Cleared by "Clear site data" | Survives device switch | Quota | API |
|---|---|---|---|---|---|
| **localStorage** (current) | ❌ Lost | ❌ Lost | ❌ No | 5-10 MB | Sync |
| **IndexedDB** | ✅ **Survives** | ❌ Lost | ❌ No | ~50 MB+ | Async, well-trodden |
| **OPFS** (Origin Private File System) | ✅ Survives | ❌ Lost | ❌ No | Large | Async, newer (2022+) |
| **File System Access API** (user picks file) | ✅ Survives | ✅ **Survives** | ⚠ if synced via iCloud/OneDrive | Disk | Requires user gesture per save |
| **Cloud sync** (Vercel KV / Supabase) | ✅ Survives | ✅ Survives | ✅ Yes | Server | Backend + auth required |

This RFC scopes only the **IndexedDB** tier (Tier 3). File System Access (Tier 4) is filed separately as v4.83.0; cloud sync (Tier 5) is gated behind the SaaS pivot (issue #136 entitlements work).

---

## 3. Design

### 3.1 Database schema

```
Database:    nplus_safety
Version:     1
Object store: snapshots
  Key:       string  e.g. "2026-04-25" or "weekly-2026-W17"
  Value:     {
    capturedAt: ISO timestamp,
    version:    APP_VERSION at capture time,
    keyCount:   number of keys in snapshot,
    snapshot:   { [storageKey: string]: string }  // raw localStorage values
  }
```

Single object store, keyed by date string. Mirrors the v4.81.2 localStorage snapshot shape exactly so the restore logic can be shared.

### 3.2 Retention strategy

**Hybrid: daily mirror + weekly extension.**

- **Daily snapshots (mirror):** every page load, write today's snapshot to IDB if not already there. Keep the **last 7 daily** snapshots.
- **Weekly snapshots (extension):** every Sunday (or first page load after Sunday boundary), write a weekly snapshot under key `weekly-YYYY-Www`. Keep the **last 4 weekly** snapshots.

This gives a 5-week recovery window with daily granularity for the past week and weekly granularity beyond. localStorage stays at 7 daily (no extension — quota is tight there).

**Total IDB storage:** 7 daily × ~50 KB + 4 weekly × ~50 KB = ~550 KB. Way under quota.

### 3.3 Restore semantics

**Atomic replace**, matching v4.81.2 behaviour:

1. Read snapshot from IDB
2. Take a `pre-restore` safety snapshot of CURRENT localStorage state (also written to IDB so it survives if the restore goes wrong)
3. Confirm with user via dialog (with snapshot date + key count)
4. Wipe all `nplus_*` keys from localStorage (excluding `nplus_autobackup_*` and `nplus_last_autobackup_at` — preserve the localStorage Tier 2 history)
5. Write snapshot's keys back to localStorage
6. `location.reload()`

**No merge mode.** Merge semantics are error-prone (e.g. how do you merge two competing `nplus_history` arrays?). Atomic replace + pre-restore safety snapshot covers the rollback path.

### 3.4 Module shape

New file: `idb-backup.js` (or inline in `app.js` if size is small enough — TBD).

Public API:

```js
// All async — return Promises
_idbOpen()                  // opens db, runs schema migration if needed
_idbSnapshot()              // takes today's snapshot (idempotent — once per day)
_idbWeeklySnapshot()        // takes this week's snapshot (idempotent — once per week)
_idbList()                  // returns sorted array of {key, date, capturedAt, keyCount, version, bytes, tier: 'daily'|'weekly'|'pre-restore'}
_idbRestore(key)            // atomic restore — confirm + pre-restore safety + replace + reload
_idbDownload(key)           // export snapshot as JSON file
_idbPrune()                 // drop oldest beyond retention windows
```

Internal:

```js
_idbCapture()               // builds snapshot object from current localStorage (excludes autobackup namespace)
_idbWeekKey(date)           // returns 'weekly-YYYY-Www' string for a given Date
```

### 3.5 DOMContentLoaded hook

After the existing v4.81.2 `_takeAutoBackup()` call, add:

```js
if (typeof _idbSnapshot === 'function') {
  _idbSnapshot().catch(e => console.warn('[idb-backup]', e?.message));
  _idbWeeklySnapshot().catch(e => console.warn('[idb-backup]', e?.message));
}
```

**Async-aware fail-safe:** the IDB tier is a *bonus* layer. Any IDB failure must NOT block app render or break the localStorage tier. Catch all IDB errors, log to console, continue.

### 3.6 Settings UI integration

Modify the existing `#autobackup-list` rendering in `renderAutoBackupList()` to:

- Read snapshots from BOTH localStorage AND IDB
- Display as a unified list with a **tier badge** column:
  - 🔵 **Local** (Tier 2 — localStorage daily)
  - 🟣 **Resilient** (Tier 3 — IDB, survives `localStorage.clear()`)
  - 🟠 **Pre-restore** (safety snapshot from a previous restore)
- Sort: newest first, with tier as secondary sort (Resilient before Local on the same date)
- Per-row: same Restore + Download buttons; restore handler dispatches to localStorage vs IDB based on tier

### 3.7 Failure modes + handling

| Failure | Handling |
|---|---|
| IDB open fails (private browsing on some Safari versions) | Catch, log, fall back to localStorage-only behaviour |
| Quota exceeded | Aggressive prune — drop weekly retention to 2 weeks + retry |
| Schema version mismatch | Wipe + recreate object store. Log to console. localStorage backups still intact. |
| Concurrent tabs both writing today's snapshot | IDB transactions are atomic — last-write-wins on the same key. Both tabs end up writing the same date so duplicate doesn't matter. |
| Restore reads valid JSON but writes fail mid-way | Pre-restore safety snapshot lets user roll forward via the same restore flow |
| User has IDB disabled (rare browser config) | Same as private-browsing path: log, fall back to localStorage-only |

### 3.8 What we explicitly do NOT do

- **No real-time mirroring on every localStorage write.** That would mean wrapping `localStorage.setItem` globally, which is fragile (third-party code, edge cases) and adds latency to every write. Daily snapshots are sufficient for the threat model.
- **No automatic restore on detected corruption.** Restore is destructive — it wipes current state. User must explicitly confirm. The detection-and-prompt flow is also fragile (false positives are bad).
- **No cross-origin sync.** That's the SaaS-pivot cloud-sync work, gated behind issue #136.

---

## 4. UAT plan

The v4.81.0 ship taught me that structural assertions miss schema bugs. This RFC's UAT must include **behavioural fixtures** that simulate real IDB ops:

1. **Storage / function-existence checks** — standard structural (1 db name + 1 object store name + 7 functions = 9 assertions)
2. **Schema migration test** — open db version 0, upgrade to version 1, verify object store created
3. **Snapshot round-trip fixture** — vm-sandbox with stubbed IDB; capture a synthetic state, verify roundtrip preserves keys
4. **Idempotency test** — call `_idbSnapshot()` twice in same day, verify only one entry written
5. **Pruning test** — write 10 daily snapshots, run `_idbPrune()`, verify only 7 most recent remain
6. **Weekly cadence test** — fake `Date` to multiple Sundays, verify each writes one weekly entry, verify 4-week prune
7. **Restore atomicity test** — corrupt current state, restore from snapshot, verify pre-restore safety snapshot exists
8. **Quota fallback test** — mock quota error, verify aggressive prune + retry
9. **Concurrent-write test** — fire two `_idbSnapshot()` calls in parallel, verify both succeed (idempotent)

**Live Chrome verification before commit** (per the v4.47.2 routine I bypassed during v4.81.x):

- Open `python3 -m http.server 3131` localhost
- Navigate to local app
- Run `_idbSnapshot()` from console; verify entry in IDB inspector
- Run `localStorage.clear()` → reload → verify Settings shows IDB backup → restore it → verify state recovered
- Repeat with weekly cadence by mocking `Date`

**E2E test** (Playwright):
- Add a test that wipes localStorage and verifies IDB restore actually recovers the state end-to-end. This is the test that would have caught the v4.81.2 hole.

---

## 5. Rollout plan

1. **Monday morning:** read this RFC with fresh eyes, decide on any design changes
2. **Monday afternoon:** implement `idb-backup.js` (or inline in app.js)
3. **Monday afternoon:** UAT (~250 LOC of fixtures)
4. **Monday afternoon:** local Chrome verification
5. **Monday afternoon:** Playwright E2E
6. **Monday evening:** commit + push as v4.82.0
7. **Tuesday morning (cadence: bug-fix day):** monitor for any user-reported issues; fix any bugs surfaced

**Estimated total LOC:** ~400 (250 module + 50 UI integration + 100 UAT + a few E2E lines)
**Estimated time:** 4-6 hours focused work
**Risk profile:** Medium — async APIs + multiple edge cases. Lower risk if RFC is followed; higher if rushed.

---

## 6. Open questions for review

1. **Inline in app.js or separate file?** App.js is already 1.8 MB; this is ~250 more LOC. Marginal. Probably inline for now (defer the module-split to issue #138 SaaS-pivot work).
2. **Tier badge labels** — proposed "Local / Resilient / Pre-restore" but open to better wording.
3. **Should v4.82.0 also add a "Restore from .json file" feature** for users who downloaded an Export Data backup before the device switched? Adjacent but useful. Could go in same ship or v4.83.0.
4. **Detection-and-warn UX** — should the app proactively detect "your localStorage looks empty but IDB has data, want to restore?" Same arguments against automatic restore apply, but a passive notification on Settings might be useful.

---

## 7. Decision log

- **2026-04-25:** RFC drafted post-v4.81.x incident. User explicitly chose the careful-design path over rushing a same-night ship. Filed for Monday's feature day.
- *(Future entries: Monday review notes, scope changes, ship outcome)*

---

## 8. Related work

- v4.81.2 — Tier 1+2 auto-backup (localStorage daily snapshots)
- v4.81.3 — 6 prevention layers (banner, env badge, export reminder, UAT lock, CLAUDE.md rule, pre-commit scan)
- Issue #83 (TBD — to be filed) — v4.82.0 IDB Tier 3
- Issue #84 (TBD — to be filed) — v4.83.0 File System Access API Tier 4
- Issue #136 — Entitlements + pricing-tier quotas (SaaS-pivot — enables Tier 5 cloud sync)
