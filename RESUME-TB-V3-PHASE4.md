# Resume TB v3 Phase 4 — Simulate mode build

> **Stages 0–12 complete on `feat/tb-v3-phase4`. Awaiting founder dogfood walk-through (Stage 13) before version bump + merge + ship.** All code, tests, and the dogfood HTML are pushed.

## Current state (2026-05-22)

| Field | Value |
|---|---|
| Branch | `feat/tb-v3-phase4` (pushed to `origin`, 30 commits ahead of v6.0.0) |
| Last commit | `22f0502 docs(tb-v3-phase4): 10-step founder dogfood smoke html` |
| Tests | UAT **6570/6570** (+12 from v6.0.0 baseline) · Playwright chromium **143/143 expected** (138 pre-Stage-11 + 5 new) |
| Tech-debt | Clean — no new breaches; 2 pre-existing saas-gated breaches (#138 app.js LOC, #55 styles.css LOC) unchanged |
| Spec | `docs/superpowers/specs/2026-05-22-tb-v3-phase4-simulate-design.md` |
| Plan | `docs/superpowers/plans/2026-05-22-tb-v3-phase4.md` |
| Production | v6.0.0 (TB v3 Phase 3) — live at networkplus.certanvil.com |
| Dogfood HTML | `.superpowers/brainstorm/93179-1779476357/content/phase4-dogfood.html` (10 steps) |

## What's shipped on branch

- ✅ **Stage 0** — `_simState` (8 keys: `currentPacket` / `previewQueue` / `playing` / `log` / `drillSrcId` / `drillDstId` / `drillProtocol:'ping'` / `lastReport`), `TB3_CSS_REV` r8 → r9, Simulate pill unlocked
- ✅ **Stage 1** — Panel CSS + HTML scaffold + `_openSimulate`/`_closeSimulate`/`_renderSimulatePanel`/`_wireSimulate` + pill click + Esc + × + UAT guards + Playwright 26/27
- ✅ **Stage 2** — Device-drag bails on Simulate + cross-rail exit guards on `_openPicker`/`_openDiagnostic`/`_selectDevice`
- ✅ **Polish** — `_wireSimulate` switched to `.onclick =` direct assignment (idempotent on re-render); CSS architecture comment; test 27 panel-hidden assertion; locked-tooltip table cleaned
- ✅ **Stage 3** — Real `_renderDrillControls` (src/dst dropdowns, protocol toggle, Send) + `_wireSimulate` extended (direct-assignment idempotent wires) + `_onDrillSend` placeholder + canvas click branch + Playwright 28/29/30. `_renderCanvas` exposed on registration.
- ✅ **Stage 4** — Motion primitives (`_devCenter` / `_spawnPacketSvg` / `_movePacket` / `_despawnPacket` / `_reducedMotion`) + real `_appendLogEntry` (cap 200) + real `_renderSimLog` (timestamps, fail rows, `data-log-idx`) + `_animatePacket` orchestrator + `_onDrillSend` real impl calling `computePath`. **Discovery:** `computePath` returns `result.hops`, not `result.path` — adapted at the call site.
- ✅ **Stage 5** — `_motionPing` round-trip (src → hops → dst → settle pulse → hops → src) with reduced-motion log-only path
- ✅ **Stage 6** — `_sameSubnet` / `_sameSubnetDevices` helpers + `_motionArp` 4-phase (burst ring → fan-out dots → settle flash → unicast reply)
- ✅ **Stage 7** — `_motionDhcp` four-stage DORA (Discover broadcast → Offer unicast → Request broadcast → Ack unicast)
- ✅ **Stage 8** — Failure UX: `_failDevice` (shake + red glow with reduced-motion glow-only fallback) + `_reachReasonText` wrapping Phase 3 `REACH_REASON_TEMPLATES` (function-valued map) + wired into all 3 motion fns
- ✅ **Stage 9** — Validator Preview: section visible only in Lab; `_runValidatorPreview` + `_runNextPreviewPair` sequenced playback; Stop button toggles play/stop; log-row click re-plays via `pair` payload. **Discovery:** `requiredCables` schema uses `from`/`to` not `fromType`/`toType` — adapted; `computeReachability` returns `{complete, failures}`.
- ✅ **Stage 10** — 4 new UAT guards: JS `_reducedMotion()` use + CSS `@media (prefers-reduced-motion: reduce)` covers packet/dev-failing/panel + `_simState` schema + no-localStorage tombstone
- ✅ **Stage 11** — Playwright tests 31–35 (Validator-Preview Lab-only / sequenced playback / Esc exits / packet element appears / Picker exits Simulate). **Adaptations:** Esc test calls exposed `_closeSimulate` directly (Esc handler guards on page-active class — Playwright can't trigger it cleanly); Picker test calls exposed `_openPicker` (`#tb3-rrail-scenarios` is `display:none` when simulate-open). Both `_closeSimulate` and `_openPicker` exposed on registration.
- ✅ **Stage 12** — 10-step founder dogfood HTML

## What's left (Stage 13 — founder in the loop)

Stage 13 is the founder-driven ship sequence — your turn now:

1. **Walk the 10-step dogfood** — open the file in browser:
   ```bash
   open "http://localhost:3131/.superpowers/brainstorm/93179-1779476357/content/phase4-dogfood.html"
   ```
   (Dev server is already running on :3131. If not, start: `python3 -m http.server 3131 >/dev/null 2>&1 &`)

2. **Fix any caught regressions** on `feat/tb-v3-phase4` (systematic-debugging → minimal fix → UAT + Playwright green → commit).

3. **Version bump call** — v6.1.0 (minor, additive) by default. Major bump (v7.0.0) if the founder wants to signal "the simulator is real now":
   ```bash
   export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
   node scripts/bump-version.js 6.1.0 "TB v3 Phase 4 — Simulate mode with per-protocol motion + Validator Preview"
   ```
   Then expand the CLAUDE.md stub row into a full v5.x-style row.

4. **Pre-push gate**: `node tests/uat.js` + `npx playwright test --project=chromium` — both green.

5. **Merge + push**:
   ```bash
   git checkout main && git pull origin main
   git merge --ff-only feat/tb-v3-phase4
   git push origin main
   ```

6. **Monitor CI + prod smoke**:
   ```bash
   gh run list --limit 5
   gh run watch <ci-cd-id> --exit-status
   gh run watch <deploy-verify-id> --exit-status
   curl -s https://networkplus.certanvil.com/app.js | grep -m1 "APP_VERSION\s*="
   curl -s https://networkplus.certanvil.com/sw.js  | grep -m1 "CACHE_NAME\s*="
   ```
   Expected: both show `6.1.0` / `netplus-v6.1.0`.

## Plan notes worth carrying into the dogfood

- **Failure-at-intermediate-hops gap (known limitation)**: `_motionPing` only handles failure when `spec.failedAt === path[path.length - 1]`. Mid-path failures (e.g. router with no route) still run the full round-trip without acknowledgment in the UI. The static log line is still red via `REACH_REASON_TEMPLATES`. Not in scope for Phase 4; Phase 5/8 (Trace + Coach) will surface mid-hop failures more clearly.
- **Test 33 (Esc exit)**: Now drives via exposed `_closeSimulate`, not the real keypress, because `_wireGlobalKeys` guards on the page-active class which Playwright can't satisfy cleanly. Real Esc-key behavior is still covered manually in dogfood step 10.
- **`_loadScenario` / `_renderCanvas` / `_closeSimulate` / `_openPicker` exposures** were ADDED to the feature registration object for test reach — same pattern as Phase 2's `_getState` / `_setState` / `_deleteSelected`.

## Quick verify commands

```bash
cd "/Users/simioremosu/Desktop/Dev Projects/networkplus-quiz"
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
git checkout feat/tb-v3-phase4
git log --oneline -10                    # should top with 22f0502
node tests/uat.js 2>&1 | tail -3         # expect 6570/6570
npx playwright test --project=chromium 2>&1 | tail -3   # expect 143 passed
```

## Subagent discipline (locked lesson)

**Do NOT use Haiku for any subagent on this codebase.** Sonnet for mechanical stages; Opus was used for Stages 5/6/7 (motion engine).

Each task in the plan ended in a TDD cycle (test → fail → implement → pass → commit). 30 commits across 12 stages.

## Visual companion (brainstorm session)

```bash
ls .superpowers/brainstorm/93179-1779476357/content/
```

## Phase 5+ (out of scope for this resume)

Trace · OSI · 3D · Coach (Tier C AI) · Grade · Retire v1+v2. Each gets its own brainstorm → spec → plan cycle after Phase 4 ships.
