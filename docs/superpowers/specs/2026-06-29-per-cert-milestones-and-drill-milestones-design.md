# Per-Cert Milestones + Drill Milestones — Design Spec

**Date:** 2026-06-29
**Status:** Approved (brainstorm) — pending implementation plan
**Author:** brainstorm session (CertAnvil)

> **Amendment (2026-06-29, during implementation):** "Packet Trace" was found to be a **deleted drill** (no page, no feature file, no completion handler — only a leftover `PT_MASTERY` storage constant). It was dropped from scope. Final scope = **4 live drills** (Sim Lab, Decision Lab, Why-Not, Gauntlet) = **12 drill milestones**, not 5/15. ACL PBQ (also live) was considered for the 5th slot but the user chose to drop to 4. Everything below referencing Packet Trace / 5 drills / 15 milestones is superseded by this.

## 1. Goal

Two outcomes in one coherent change to the milestone system:

1. **Add milestones for the 5 flagship drills** that currently have none — Sim Lab (PBQ), Decision Lab, Why-Not, Packet Trace, Gauntlet — including the in-session celebration pop-up and analytics display.
2. **Make all milestones per-certification** (hard rule), and **remove orphaned milestones** left behind by drills that were deleted long ago.

## 2. Hard rules / constraints

- **MILESTONES ARE PER-CERT.** Earning a milestone in one cert (Network+) must NOT transfer to another (Security+, A+, Azure, …). Sharing milestone progress across certs is disallowed. This applies to **all** milestones, not just the new drill ones. *(Recorded in Forge + memory.)*
- **No data loss on migration.** Existing earned milestones (currently global) must be grandfathered, not wiped.
- **Reuse existing machinery.** The celebration pop-up (`showMilestoneCelebration`) and analytics renderer (`_renderAnaMilestones`) already exist and already fire for quizzes/exams — extend, don't rebuild.
- **Cross-platform: must work on Desktop browsers, Safari/WebKit, AND the iOS Capacitor wrap** — storage, cert detection, and the celebration pop-up all behave identically across the three. See §4.H.
- **End-user visual surfaces follow the visual workflow** (see §4.I): mockup-first (`mockups/*-concept.html`, shown + approved before build), the 4-stage skill pass (`/design-taste-frontend` → `/emil-design-eng` → `/humanizer` → `/marketing-psychology`), and full **BRAND.md** compliance (forged-bronze, editorial, no purple/emoji/em-dash/left-border-callout/card-spam; `dg-system.css` overrides only — never `styles.css`; bump `dg-system.css?v=`).
- Additive + cleanup only — no unrelated refactors.

## 3. Current state (verified via the graphify code map + targeted reads)

- Milestone engine lives in `app.js`: `MILESTONE_DEFS` (defs), `MILESTONE_CHECKS` / `evaluateMilestones()` (evaluation), `unlockMilestone()` / `getMilestones()` (storage), `MILESTONE_PROGRESS` (numeric progress), `_buildMilestoneCtx()` / `_buildMilestoneDrillCtx()` (context).
- **Storage is a single flat GLOBAL map:** `STORAGE.MILESTONES = 'nplus_milestones'`, shape `{milestoneId: ISOTimestamp}`. Cloud-synced via `_cloudFlush(STORAGE.MILESTONES)`. **This violates the per-cert rule.**
- **In-session pop-up already fires** for quiz completion (`finish()`, ~app.js:10100) and exam completion (exam-results, ~app.js:10589), staggered. Drills do NOT call `evaluateMilestones()` at completion.
- **The 5 flagship drills have zero milestone defs.**
- **Orphaned milestones exist** for removed drills (no page entry, no feature): Acronym Blitz (`ab_*` ×4), OSI Sorter (`os_*` ×4), Cable ID (`cb_*` ×4), Fix This Network (`fix_*` ×3) = **15 dead milestones**. Topology/Guided Labs (`page-guided-lab`) and ACL PBQ (`page-acl-pbq`) are **still live** — keep.

## 4. Design

### A. Per-cert storage + migration (Approach ①: nested map under existing key)
- Change `STORAGE.MILESTONES` value shape: `{id: ts}` → **`{cert: {id: ts}}`**.
- Add a current-cert resolver from `window.CURRENT_CERT` (canonical cert key, e.g. `netplus`/`secplus`).
- `getMilestones()` returns the **current cert's** submap; `unlockMilestone()` / `evaluateMilestones()` read/write only the current cert.
- **Migration-on-read:** if the stored value is the old flat shape (values are strings, not objects), wrap it as `{ netplus: <oldMap> }` (grandfather existing unlocks to Network+, the legacy cert). One-time, lossless.
- Same storage key ⇒ **no change to `cloud-store.js` / hydrate** (one flush key).

### B. Per-drill, per-cert completion tracking
- New `STORAGE.DRILL_STATS = 'nplus_drill_stats'`, same nested shape: `{cert: {simlab:{done,perfect}, decision:{…}, whynot:{…}, packettrace:{…}, gauntlet:{…}}}`.
- Incremented at each drill's completion point. Where a counter already exists (e.g. `PT_MASTERY` for Packet Trace perfection), read it rather than duplicate.

### C. New milestone definitions (~3 per drill, ~15 total)
Mirrors existing voice/scale (threshold 25 matches `streak_port_25`). Labels/thresholds tunable in the plan.

| Drill | First | Volume (25) | Mastery |
|---|---|---|---|
| Sim Lab (PBQ) | Sim initiate | Sim regular | Sim ace (perfect run) |
| Decision Lab | Decision rookie | Decision regular | Flawless call (perfect set) |
| Why-Not | Why-Not novice | Why-Not regular | Reasoned master (perfect) |
| Packet Trace | Trace tenderfoot | Trace tactician | Trace master (perfect → reuse `PT_MASTERY`) |
| Gauntlet | Gauntlet runner | Gauntlet regular | Gauntlet survivor (full perfect run) |

Each gets a `MILESTONE_DEFS` entry, a `MILESTONE_CHECKS` condition (reads DRILL_STATS for current cert), and a `MILESTONE_PROGRESS` entry for "n/25" display.

### D. Trigger + celebration wiring
At each drill's completion point — Sim Lab (`_slRenderExamResult` / `_slRenderSummary`), Decision Lab (`_dlRenderResult`), Why-Not (verdict/finish), Packet Trace (finish), Gauntlet (`_finishGauntlet`) — after recording the result: increment the per-cert DRILL_STATS counter → call `evaluateMilestones()` → celebrate newly-unlocked using the **existing** staggered `showMilestoneCelebration` pattern from `finish()`.

### E. Analytics page (per-cert)
`_renderAnaMilestones()` already renders `MILESTONE_DEFS` against `getMilestones()` — now per-cert automatically (it reads the current cert's submap). New drill milestones appear with "n/25" progress. **Optional polish:** a "Drills" subheading grouping the drill milestones.

### F. Orphan cleanup
- **Audit:** confirm each milestone has a live backing feature (page entry or live lazy feature). Verify the ambiguous lazy ones (Port Drill, Subnet, Guided Labs) are live before touching them.
- **Remove** the 15 confirmed-dead defs (Acronym Blitz, OSI Sorter, Cable ID, Fix This Network) **plus** their `MILESTONE_CHECKS` and `MILESTONE_PROGRESS` entries and any dead context/helper code.
- **Prune earned-orphan storage:** during the per-cert migration, drop any earned milestone ids that no longer exist in `MILESTONE_DEFS` so they don't linger in `nplus_milestones`.

### G. Testing
- Update UAT `EXPECTED_MILESTONES` / `newMilestones` for the new ids + revised count (−15 orphans, +15 drill milestones).
- New tests: **per-cert isolation** (unlock on Network+ not visible on Security+); **migration** (old flat map → `{netplus: …}`, orphans pruned); **each drill** increments its counter, fires its milestone, and triggers the celebration; **orphan defs gone**.
- `validation-audit.js` unaffected.

### H. Cross-platform (Desktop browsers / Safari-WebKit / iOS Capacitor)
Must work identically on Desktop, Safari, and the iOS Capacitor wrap (all confirmed in play).
- **Storage durability (Safari/iOS ITP):** WebKit can purge localStorage (~7-day ITP), so milestones stay **cloud-canonical** (Supabase) with localStorage as cache — which this design already preserves (same `STORAGE.MILESTONES` key + `_cloudFlush`). **CRITICAL:** the per-cert migration-on-read MUST run only **after** `cloudStore.hydrate()` (SIGNED_IN), be idempotent, and **never flush a pre-hydrate / empty wrap** — otherwise a purged-localStorage device would clobber other certs' submaps in the cloud. Anonymous/offline users stay localStorage-only, as today.
- **Cert key inside the wrapper:** namespacing key = `detectCert()` (hostname/subdomain at boot, `app.js:161`; falls back to session/profile cert preference for root/localhost). Confirm `detectCert()` returns the correct cert key inside the iOS Capacitor wrap (loads the real origin). If the wrap ever loads root instead of a per-cert subdomain, the profile cert-preference fallback must be set so milestones namespace correctly. **Verify before namespacing.**
- **Celebration pop-up rendering:** `showMilestoneCelebration` must render in WKWebView (iOS) + Safari, not just Chromium — CSS-only animation, honor the existing `prefers-reduced-motion` gate, respect safe-area/narrow viewport (the Capacitor wrap is always narrow). No desktop-only APIs.
- **Cloud round-trip:** the nested `{cert:{id:ts}}` blob must serialize + hydrate through Supabase identically on all platforms.
- **Lane:** if changes stay in `app.js` (+ `features/*`) → fast-lane. If the hydrate-ordering fix needs `cloud-store.js` / `auth-state.js` → **gated-lane** (PR + preview + smoke) per `ENVIRONMENT_STRATEGY.md`.

Cross-platform testing:
- Run milestone E2E across existing Playwright projects: `test:webkit` + `test:mobile-safari` (not just Chromium).
- Manual iOS Capacitor smoke: earn a drill milestone in the wrapped app → pop-up renders + unlock persists across relaunch (cloud round-trip).
- Safari ITP scenario: simulate localStorage purge → milestones rehydrate per-cert from cloud; migration doesn't double-wrap or clobber.

### I. Visual workflow for end-user surfaces (BRAND.md + mockup-first + 4-stage pass)
Applies to the **visual** surfaces only — the milestone **labels/descriptions copy**, the **celebration moment**, and the **analytics drill-milestone display / "Drills" grouping**. NOT the engine/storage/migration/cleanup.

1. **Mockup-first** (BRAND.md §10): build each new visual surface as a `mockups/*-concept.html` first, seeded from `brand/mockup-starter-tokens.css` (never freehand hex). Deploy-served at `/mockups/` → user previews on-device + approves **before** real implementation. The existing `showMilestoneCelebration` pop-up is reused (already brand-compliant) — a mockup is needed only if we alter it; the **new** analytics "Drills" grouping needs its own concept mockup.
2. **4-stage skill pass, in order:** `/design-taste-frontend` (visual treatment) → `/emil-design-eng` (polish, motion, micro-interactions) → `/humanizer` (strip AI-tells from milestone copy) → `/marketing-psychology` (achievement framing / motivation).
3. **BRAND.md compliance (hard):** forged-bronze accent (no purple), editorial hairlines (no card-spam, no left-accent-border callouts), Fraunces display + Inter UI with the `lining-nums tabular-nums` rule on any hero figure, motion per §6 (transform+opacity only, `cubic-bezier(0.16,1,0.3,1)`, reduced-motion fade-only, ≤600ms UI), no emoji-as-icons, no em-dashes (use `·`). **Implement in `dg-system.css` scoped overrides — NEVER edit `styles.css` — and hand-bump `dg-system.css?v=` (SW cache-bust).**

## 5. Key integration points (files)
- `app.js`: `MILESTONE_DEFS`, `MILESTONE_CHECKS`, `MILESTONE_PROGRESS`, `getMilestones`/`unlockMilestone`/`evaluateMilestones`, `STORAGE` keys, the 5 drill completion functions, `_renderAnaMilestones`.
- `features/sim-lab.js`: Sim Lab + Decision Lab completion hooks (`_slRenderExamResult`, `_dlRenderResult`, etc.).
- Packet Trace + Why-Not + Gauntlet completion paths (locate exact hooks during planning).
- `tests/uat.js`: milestone assertions.

## 6. Risks / edge cases
- **Cert key canonicalization** — `window.CURRENT_CERT` must yield a stable key per cert; confirm format before namespacing.
- **Migration idempotency** — running the read-guard twice must not double-wrap.
- **Cloud merge** — ensure the nested shape round-trips through `_cloudFlush` + hydrate without clobbering other certs' submaps.
- **Time/streak milestones** (night_owl, streak_7, etc.) also become per-cert under the hard rule — confirm that's intended (it is, per the rule).

## 7. Out of scope
- New drills or new milestone *types* beyond the per-drill first/volume/mastery pattern.
- Per-cert leaderboards or cross-cert aggregate views.
- Reworking the celebration animation itself (reused as-is).

## Related
[[2026-06-29-per-cert-milestones-and-drill-milestones]] · [[key-patterns]] · [[ENVIRONMENT_STRATEGY]] · [[feature-subsystems]] · [[SHIP_CHECKLIST]]
