# Topology Builder v3 — Phase 4: Simulate mode

| Field | Value |
|---|---|
| Date | 2026-05-22 |
| Branch (when implementation starts) | `feat/tb-v3-phase4` |
| Phase | 4 of the v3 strangler-fig (v5.7.0 Phase 1 → v5.8.0 Phase 2 → v5.9.0 Phase 2.x → v6.0.0 Phase 3 → **Phase 4**) |
| Status | Brainstormed + designed · ready for `writing-plans` |
| Author | Simi (with Claude Opus 4.7) |
| Skills used | superpowers:brainstorming · taste-skill · emil-design-eng · stop-slop |

## Summary

Phase 4 unlocks the Simulate pill on the TB v3 modebar and ships live packet animation for **ping**, **ARP**, and **DHCP** on the canvas. The mode has two surfaces in one right-rail panel: (1) a **Drill** picker that lets a student fire a free-form packet from any source to any destination over any of the three protocols — works in Free Build OR Lab; and (2) a **Validator Preview** button (Lab-only) that animates every required cable-type-pair in the active scenario sequentially, turning the GOALS MET / N TO GO verdict from Phase 3 into a literal moving picture. Both surfaces share one animation engine and one Wireshark-style timestamped log. Phase 3's reachability primitives (`computePath`, `computeReachability`, `REACH_REASON_TEMPLATES`) ship untouched — Phase 4 adds no new path-computation code.

Per-protocol motion is the lesson: **ping** glides as a round-trip dot, **ARP** explodes as a radial broadcast burst with simultaneous fan-out to every same-subnet device and a single unicast reply from the answering device, **DHCP** dances the four-stage DORA. Failures stop the packet at `failedAt`, shake the failing device, glow it red, and emit a red log entry using the exact same `REACH_REASON_TEMPLATES` copy Phase 3's diagnostic drawer already speaks. Every animation has a `prefers-reduced-motion` fallback that preserves the log content and lesson but kills the movement.

Fast-lane per `ENVIRONMENT_STRATEGY.md` — feature-module additive JS/CSS, no DB/auth/money/SW (only the universal `CACHE_NAME` bump from `bump-version.js`). Suggested ship: **v6.1.0** (minor — additive feature, no breaking changes).

## Locked decisions (the seven brainstorming Qs)

1. **Lens** — `C · Hybrid`. Two surfaces, one engine: Drill (free-form, educational) and Validator Preview (Lab-only, animates Phase 3's reachability verdict).
2. **Protocols** — `B · ping + ARP + DHCP`. The pre-committed N10-009 textbook trio. DNS/HTTP/Traceroute deferred to a future phase or never. Each protocol gets a distinct motion shape AND a distinct color.
3. **Layout** — `A · Right-rail Simulate panel`. Slides in from the right at 320 px, mutually exclusive with Inspector / Picker / Diagnostic drawer. Same `body.simulate-open` CSS-class pattern Phase 1–3 established.
4. **Drill initiation** — `B · Dropdown panel + click shortcut`. Two `<select>` dropdowns + protocol toggle + Send button in the rail panel. Clicking a device on the canvas while Simulate is active populates the next-empty dropdown: src first, then dst. Once both are filled, additional canvas clicks replace `dst` only (use the dropdown to change `src`).
5. **Animation strategy** — `B · Per-protocol signatures`. Motion *is* the lesson. Generic dots fail the N10-009 study angle; per-protocol shapes cement broadcast vs unicast vs four-way DORA hard.
6. **Teaching layer** — `A · Live log in rail panel`. Wireshark-style timestamped entries fill the log section of the rail panel as the packet moves. Canvas stays uncrowded. Failure entries are red and carry the templated reason from Phase 3.
7. **Validator Preview playback** — `A · Sequenced playback`. Required pairs fire one at a time, ~600 ms apart, in scenario order. Bonus: any log row is clickable to re-play just that pair.

## Architecture

### Mode upgrade
The locked `simulate` entry in `_renderModeBar` at `features/topology-builder-v3.js` becomes unlocked. The mode enum stays `'design' | 'simulate' | 'trace' | 'osi' | '3d'`; Phase 4 wires only `'design'` and `'simulate'`. The other three remain locked phase-hints.

### Rail panel joins the family
A new Simulate rail panel slides in from the right at 320 px, mutually exclusive with Inspector / Picker / Diagnostic drawer. CSS pattern: `body.simulate-open` reveals `#tb3-simulate-panel`, identical to how Phase 1–3 manage their rail panels. Opens on Simulate-pill click. Closes on Esc, on × button, or on another mode pill being clicked. Opening Inspector / Picker / Diagnostic drawer exits Simulate mode (cancels in-flight, drains queue, returns to `state.mode = 'design'`).

### Reachability re-use
Phase 4 ships **zero new path-computation code**. Three Phase 3 primitives carry the load:
- `computePath(srcId, dstId, state)` returns `{ok, path?, reason?, failedAt?}` — used by every Drill Send and every Validator Preview pair.
- `computeReachability(state, completion)` returns the full pair-result table — Validator Preview reads it to build its queue.
- `REACH_REASON_TEMPLATES` provides templated copy for every failure mode — the exact same copy the diagnostic drawer renders, so failure language is consistent across surfaces.

### Z-order on canvas
Packets are SVG elements appended to `#tb3-canvas-svg` after devices, so they paint on top of cables AND devices. Glow uses `filter: drop-shadow` with the per-protocol color. Removed from the DOM after each animation's `onComplete` callback fires. No persistent state on canvas — packets are ephemeral overlays.

## Components

Functions added to the existing `features/topology-builder-v3.js` IIFE:

| Function | Responsibility |
|---|---|
| `_renderSimulatePanel()` | Paints rail panel HTML — header + Validator Preview CTA (Lab-only) + Drill section (2 dropdowns + protocol toggle + Send) + Log section. |
| `_wireSimulate()` | Binds dropdown change, click-on-device shortcut, protocol toggle, Send / Replay / Stop / × close, log-row click (replay-just-this-one). |
| `_openSimulate()` | Mode entry. Add `simulate-open` body class. Close any other rail panel. Render panel. |
| `_closeSimulate()` | Mode exit. Cancel in-flight packet, drain queue, clear log + `_simState`, remove body class. |
| `_renderSimLog()` | Render the log section. Each entry: timestamp + source + protocol + message. Failure rows styled red. All entries clickable to re-play. |
| `_appendLogEntry(entry)` | Push a new entry to `_simState.log`, trim to 200 max, re-render the log section. |
| `_animatePacket(spec)` | Core motion engine. Spec = `{ path, protocol, onComplete, onFailedAt, onLog }`. Picks the per-protocol motion function. Drives SVG via `requestAnimationFrame`. Cancellable. |
| `_motionPing(spec)` | Round-trip motion implementation. |
| `_motionArp(spec)` | Radial burst + fan-out + unicast reply implementation. |
| `_motionDhcp(spec)` | Four-stage DORA implementation. |
| `_runValidatorPreview()` | Reads active scenario's `requiredCables` + `computeReachability` result. Builds queue. Animates sequentially with 600 ms gap. Stop button cancels queue. |

Approximate size: **+600 LOC JS, +80 LOC CSS** in the feature module. `TB3_CSS_REV` bumps `r8 → r9`.

## Data flow

### Drill flow (works in Lab and Free Build)
1. User clicks the `simulate` pill on the modebar.
2. `state.mode = 'simulate'`; `_openSimulate()` adds the body class, renders the panel, closes any other rail panel.
3. User picks src + dst via dropdown OR canvas click-shortcut; picks protocol (default `ping`).
4. User clicks **Send**. Button is disabled until `src && dst && src !== dst && protocol`.
5. `computePath(src, dst, state)` runs. Returns `{ok, path?, reason?, failedAt?}`.
6. `_animatePacket({ path: result.path, protocol, onComplete, onFailedAt, onLog })` dispatches to the per-protocol motion function.
   - **ok**: motion runs to completion; log entries append per hop; final entry "`<dst> received <protocol>`".
   - **fail**: packet stops at `failedAt` device; red shake + glow; red log entry with `REACH_REASON_TEMPLATES` copy.
7. Control returns to user; selections persist; another Send fires another packet. Log accumulates until mode exit.

### Validator Preview flow (Lab-only)
1. Button visible only when `state.intent === 'lab' && state.activeScenarioId`. Hidden in Free Build — no scenario, no required pairs.
2. User clicks **Replay validator paths**.
3. `_runValidatorPreview()` reads `scen.completion.requiredCables` and `computeReachability(state, scen.completion)` result. Builds queue `[{ pair, expected: 'ok'|'fail', failedAt? }, …]` in scenario order.
4. Header swaps to `Replay validator paths · running 1 / N`. **Stop** button replaces the CTA.
5. For each queue entry: smart-pick a representative `(src, dst)` of each type (same smart-pick logic Phase 3 already uses); call `_animatePacket`; log result; wait 600 ms; advance to next.
6. On **Stop**: drain queue; cancel in-flight; header reverts. Log entries that ran remain visible.
7. On completion: header reverts to `Replay validator paths`. Log persists.
8. **Bonus**: any log row in the panel (Drill or Validator Preview) is clickable to re-play just that one pair via the same `_animatePacket` path.

## Mode-owns-clicks pattern

Cable mode (Phase 3) established this pattern. Phase 4 extends it. The device-drag mousedown handler at `features/topology-builder-v3.js:2167` and the pan handler at `:1885` each check the mode and bail in any mode that owns clicks:

```js
canvas.addEventListener('mousedown', function (e) {
  if (e.button !== 0) return;
  if (canvas.style.cursor === 'crosshair') return;        // cable mode (Phase 3)
  if (state.mode === 'simulate') return;                  // Simulate mode (Phase 4)
  // …existing drag init…
});
```

The canvas click handler in Simulate mode reads `e.target.closest('.tb3-dev')`; if a device is found, populate the next-empty dropdown — `src` first, then `dst`; once both are filled, subsequent canvas clicks replace `dst` only (`src` is changed via the dropdown). Clicking empty canvas does nothing in Simulate mode. Simulate does NOT change the cursor (its affordance is the rail panel, not a cursor mode — cable mode owns the crosshair).

## State schema

Phase 4 adds **nothing** to `state` proper — every Simulate value is ephemeral. `state.mode` already exists (Phase 1) but stays unpersisted; resets to `'design'` on reload, consistent with how the modebar already behaves.

```js
let _simState = {
  drillSrcId: null,          // device id
  drillDstId: null,          // device id
  drillProtocol: 'ping',     // 'ping' | 'arp' | 'dhcp'
  previewQueue: [],          // validator-preview pairs waiting
  currentPacket: null,       // in-flight animation handle for cancel
  log: [],                   // entries (max 200, FIFO trim)
  playing: false,            // true while Validator Preview queue is running
};
```

On mode exit (`_closeSimulate`): cancel `currentPacket`, drain `previewQueue`, clear `log`, reset all selections. Clean slate next time Simulate opens. **No `localStorage` writes** — Phase 4 must not introduce any `STORAGE.*` key.

## Mutual exclusion

Simulate is a mode, not a coexisting panel. Clicking a scenario in the Picker, double-clicking a device (opens Inspector), or clicking the completion pill (opens Diagnostic drawer) all **exit Simulate**: cancel in-flight packets, drain queue, return to `state.mode = 'design'`, render the requested panel. Predictable, single-track UX; no orphaned animations.

## Color palette

| Protocol | Token | Color | Rationale |
|---|---|---|---|
| Ping | `--tb3-pkt-ping` | `oklch(0.74 0.13 65)` (accent bronze) | The "default" protocol, the most-fired; inherits the canvas accent. |
| ARP | `--tb3-pkt-arp` | `oklch(0.7 0.15 145)` (green) | L2 broadcast / discovery semantic. |
| DHCP | `--tb3-pkt-dhcp` | `oklch(0.62 0.16 250)` (blue) | Network services / DORA. |
| Failure | `--tb3-pkt-failure` | `oklch(0.6 0.2 25)` (red) | System red — same as existing TB v3 danger. |

Tokens are scoped CSS custom properties inside `features/topology-builder-v3.css`. No global theme additions.

## Drill semantics by protocol

What the user's `src` and `dst` selections mean per protocol:

| Protocol | `src` | `dst` |
|---|---|---|
| Ping | device firing the ICMP echo | device being pinged |
| ARP | device firing the ARP request | device whose IP is being resolved (the "answering device" in the motion spec below) |
| DHCP | DHCP client | DHCP server (explicit — pedagogical convenience; real DHCP broadcasts and any server responds, but the Drill picker requires a `dst`) |

The Send button is disabled until `src && dst && src !== dst`. (`protocol` always has a value — defaults to `ping`.)

## Per-protocol motion specs

### Ping — round-trip
- **Shape**: 12 px circle with `filter: drop-shadow(0 0 6px var(--tb3-pkt-ping))`.
- **Timing**: 600 ms per hop outbound · 80 ms settle pulse at dst · 600 ms per hop return.
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (per emil-design-eng — physical, not linear).
- **Dst settle**: peak glow scales `1 → 1.4 → 1` over 80 ms; signals "echo received, reply forming".
- **Log emit**: one entry per hop ingress + final "`<dst> reply received in N ms`".
- **3-hop round-trip total**: ≈ 3.7 s.

### ARP — broadcast + unicast reply
- **Phase 1 — burst**: 200 ms · radial ring scales `12 → 200 px`, opacity `1 → 0`, on src device.
- **Phase 2 — fan-out**: 300 ms · 8 px dots fire from src to every same-subnet device simultaneously.
- **Phase 3 — settle**: 100 ms · receiver devices pulse opacity `1 → 0.6 → 1`.
- **Phase 4 — reply**: 300 ms · single 9 px dot from the answering device unicast back to src.
- **Log emit**: "`<src> ARPs for <target-ip>`" on broadcast + "`<responder> replies: <target-ip> is at <mac>`" on reply.
- **Total**: ≈ 900 ms — fast on purpose; ARP is a quick broadcast and the motion should feel that way.
- **Subnet membership**: comes from existing Phase 3 device IP / mask resolution. Devices with no IP on the relevant subnet are skipped in the fan-out.

### DHCP — four-way DORA
- **D · Discover**: 500 ms · broadcast burst from client (matches ARP phase-1 shape, dhcp blue).
- **O · Offer**: 500 ms · unicast dot from server back to client.
- **R · Request**: 500 ms · broadcast burst again from client.
- **A · Ack**: 500 ms · unicast dot from server back to client · brief settle pulse at client.
- **Stage gap**: 120 ms pause between stages — eye anchors on each step.
- **Log emit**: one log line per stage (`DISCOVER broadcast`, `OFFER 192.168.10.20/24 from <server>`, `REQUEST`, `ACK · lease 24 h`).
- **Total**: ≈ 2.5 s.

## Failure UX

| Effect | Spec |
|---|---|
| Motion halts | `requestAnimationFrame` queue cancelled at the failing hop; in-flight dot stops dead at the device's edge. |
| Device shake | 3 horizontal jitters over 200 ms (`translateX` ±3 px) on the failing device's `<g>`. |
| Red glow | `filter: drop-shadow(0 0 10px var(--tb3-pkt-failure))` on the failing device, 400 ms ease-in / 1.2 s ease-out. Glow auto-clears. |
| Log row | Prefix `✗`, message from `REACH_REASON_TEMPLATES` with the same `srcLabel` / `dstLabel` / `failedLabel` tokens Phase 3 uses. |
| Diagnostic drawer | Does NOT auto-open. The founder's eye is on canvas + log; the pill remains clickable to open the drawer on demand. |
| Validator Preview queue | A failed pair does NOT abort the sequence — the next pair fires after the standard 600 ms gap. Stop button is still the way to halt the whole sequence. |

## Reduced-motion gate

The cert app's `@media (prefers-reduced-motion: reduce)` contract: motion neutralised to `.01ms linear`, pulses killed, final state painted without movement. Phase 4's per-protocol motions collapse:

| Surface | No-motion fallback |
|---|---|
| Ping | Static `src → dst` faint dotted line drawn for 1.2 s; src and dst flash opacity briefly; log fills normally. |
| ARP | No burst ring. Brief opacity flash on each same-subnet target device; brief opacity flash on the responder. Log fills with both broadcast and reply lines. |
| DHCP | Each stage = one log line + one brief opacity flash on the relevant device (client for D/R, server for O/A). |
| Failure | Failing device gets a static red color tint for 1.5 s (no shake, no glow animation). Log row is red. |
| Validator Preview gap | 200 ms between pairs instead of 600 ms — still steps through but without arbitrary motion delay. |

## Testing surface

### UAT structural guards (~12 new asserts)
- `_renderSimulatePanel` / `_animatePacket` / `_motionPing` / `_motionArp` / `_motionDhcp` / `_runValidatorPreview` all defined.
- Simulate pill in `_renderModeBar` no longer has `locked: true`.
- Mode-owns-clicks: device-drag mousedown handler tests for `state.mode === 'simulate'` alongside the existing crosshair guard.
- Reachability tombstones: `computePath`, `computeReachability`, `REACH_REASON_TEMPLATES` referenced from Phase 4 code, never re-implemented.
- State schema: `_simState` declared with all 7 expected keys.
- No `STORAGE.*` write for Simulate (ephemeral-state tombstone — guards against accidental localStorage usage).
- Per-protocol palette tokens scoped in CSS: `--tb3-pkt-ping`, `--tb3-pkt-arp`, `--tb3-pkt-dhcp`, `--tb3-pkt-failure`.
- Reduced-motion gate covers the four motion categories (ping glide, ARP burst, DHCP DORA, failure shake / glow).

### Playwright DOM tests (~10 new)
1. Modebar Simulate pill rendered without `.locked` class.
2. Click Simulate → `body.simulate-open` set, rail panel renders.
3. Drill panel: src dropdown · dst dropdown · protocol toggle · Send button all present.
4. Send button disabled until `src && dst && src !== dst && protocol`.
5. Click a device while Simulate active → first empty dropdown populates (src then dst).
6. Click Send → `.tb3-packet` element present on canvas during animation, removed on completion.
7. Validator Preview button hidden in Free Build, visible in Lab.
8. Click Validator Preview in a Lab → log entries append, queue runs through all pairs.
9. Click a log row → re-plays just that pair (assert new packet element after a passing earlier completion).
10. Esc / × / another mode pill → Simulate exits, panel closes, body class removed.

## Files

| Action | Path | Notes |
|---|---|---|
| MOD | `features/topology-builder-v3.js` | +~600 LOC: panel · wire · animation engine · 3 motion fns · `_runValidatorPreview` · click-shortcut wire · mode-exit cancel. |
| MOD | `features/topology-builder-v3.css` | +~80 LOC: panel layout · log style · 4 palette tokens · reduced-motion gate. `TB3_CSS_REV` r8 → r9. |
| MOD | `tests/uat.js` | +~12 structural guards. |
| MOD | `tests/e2e/app.spec.js` | +~10 Playwright DOM tests. |
| NEW | `.superpowers/brainstorm/93179-1779476357/content/phase4-dogfood.html` | 10-step founder smoke. |
| NEW | `docs/superpowers/specs/2026-05-22-tb-v3-phase4-simulate-design.md` | This spec — committed at end of brainstorming. |
| NEW | `docs/superpowers/plans/2026-05-22-tb-v3-phase4.md` | Created by the `writing-plans` skill next. |

## Scope discipline

### In Phase 4
- Simulate pill unlocks; mode wired.
- Rail Simulate panel (Drill · Validator Preview · Log).
- Per-protocol signature motion (ping · ARP · DHCP).
- Click-shortcut device → drill dropdown.
- Live timestamped log; failure rows red with `REACH_REASON_TEMPLATES` copy.
- Failure UX (shake · glow · red log · drawer NOT auto-opening).
- Validator Preview sequenced playback (Lab-only).
- Log-row click → re-play single pair.
- Reduced-motion gate across all four motion categories.
- Mutual exclusion with Inspector / Picker / Drawer.
- Mode exit cancels in-flight + drains queue + clears log.

### Deferred / YAGNI (explicit)
- DNS / HTTP / TCP / UDP / Traceroute protocols (a future phase or never).
- Coach-mode integration (Phase 8).
- Speed-control slider (one fixed speed per protocol; can be added as Phase 4a polish if dogfood asks for it).
- Pause per individual packet (Stop is queue-only, applies to Validator Preview only).
- Persistent log across mode exit (cleared on close — clean slate next entry).
- Persistent Drill selections across reload (mode resets to design, selections clear).
- Security attack sims (ARP spoof · VLAN hopping · rogue DHCP — these exist in TB v1 and are not part of Phase 4).
- PCAP / packet-capture replay.
- Multi-packet simultaneous Drill (one packet at a time per Send).
- Free Build Validator Preview (no scenario = no required pairs = button hidden).
- Auto-opening diagnostic drawer on failure (intentional UX call — would be intrusive).

## Dogfood gate — 10-step founder smoke

1. Open Network Builder; mode pill **Simulate** is now unlocked and clickable.
2. In Free Build with empty canvas, click Simulate; the panel opens; Validator Preview button is hidden; Send button is disabled.
3. Drop a router + workstation, set their IPs; enter Simulate; click each device — dropdowns auto-fill, Send button enables.
4. Send **ping** → round-trip motion completes; log fills with "`ping reached`" entry.
5. Send **ARP** → burst pulse + fan-out to subnet members + unicast reply; log fills with broadcast and reply lines.
6. Send **DHCP** → four-stage DORA dance; one log line per stage.
7. Clear the workstation's gateway → Send ping → packet stops at the workstation, red shake + glow, red log row "`WS-01 has no default gateway.`"
8. Load the Star-topology scenario → Validator Preview button appears; click → sequence runs, all green; log shows N pairs reached.
9. Clear a workstation's gateway in the scenario → click Validator Preview → sequence runs; failing pair shows red, others green; click the red row → re-plays just that pair.
10. Press Esc mid-Validator-Preview → queue drains, panel closes, mode returns to Design.

When all 10 pass: ship per the Ship Tier section below.

## Ship tier

- **Fast-lane** per `ENVIRONMENT_STRATEGY.md` — feature-module additive JS/CSS, no DB, no auth, no money, `sw.js` = universal `CACHE_NAME` bump from `bump-version.js`. Canonical trunk push, CI-gated.
- **Branch**: feature branch `feat/tb-v3-phase4` off `main`; merge fast-forward into `main` after the 10-step dogfood passes (same pattern as Phase 2 / 2.x / 3).
- **Version**: suggested **v6.1.0** (minor — additive feature, no breaking changes). Could go `v7.0.0` if the founder wants the major bump to signal "the simulator is real now" — decided at ship time.

## Phase 5+ — what comes next (out of scope here)

- **Phase 5 = Trace mode** — per-hop visualization, packet-flow detail beyond the protocol signature. Uses the same `computePath` paths Phase 4 already animates.
- **Phase 6 = OSI mode** — per-layer overlay; packets carry layer annotations.
- **Phase 7 = 3D mode** — immersive topology view; packets animate in 3-space.
- **Phase 8 = Coach mode** — Tier C AI tutor with reachability + simulation awareness; can suggest "try ping from X to Y to see what happens".
- **Phase 9 = Grade mode** — PBQ-style scoring against scenario completion + simulation behavior.
- **Phase 10 = Retire v1 + v2** — the strangler-fig payoff.

## References

- Phase 3 spec: `docs/superpowers/specs/2026-05-20-tb-v3-phase3-design.md`
- Phase 3 plan: `docs/superpowers/plans/2026-05-20-tb-v3-phase3.md`
- v6.0.0 release entry in `CLAUDE.md` Version History
- TB v1 simulation patterns (for reference, not direct re-use): `tbSimPing` / `tbSimARP` / `tbSimDHCP` / `tbAnimatePacket` in `features/topology-builder.js`
