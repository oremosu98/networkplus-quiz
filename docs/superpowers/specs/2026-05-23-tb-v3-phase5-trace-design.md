# TB v3 Phase 5 — Trace mode: design spec

> Date: 2026-05-23 · Phase 5 design lock · branch `feat/tb-v3-phase5` · main currently at `181cd77` (v6.1.0).
> References: Phase 4 spec at [docs/superpowers/specs/2026-05-22-tb-v3-phase4-simulate-design.md](2026-05-22-tb-v3-phase4-simulate-design.md), Phase 3 spec at [docs/superpowers/specs/2026-05-20-tb-v3-phase3-design.md](2026-05-20-tb-v3-phase3-design.md), resume doc at [RESUME-TB-V3-PHASE5.md](../../../RESUME-TB-V3-PHASE5.md).

---

## 1. Goal

Per-hop packet-flow visualization over the same `computePath` substrate Phase 3 + 4 already use. Where Simulate mode (Phase 4) plays one continuous animation src→dst, Trace mode breaks the same path into per-hop frames the user can step through (or autoplay) with annotations on each hop.

Trace mode is the natural home for **mid-hop failure UX** (Phase 4's `_motionPing` only shakes the destination on failure — mid-hop failures aren't acknowledged in the animation), and the substrate the future Coach (Phase 8) and Grade (Phase 9) modes will lean on.

## 2. Non-goals (Phase 5.x / Phase 6+ deferred)

- **ARP / DHCP trace** — Phase 5 ships ping-only. ARP fan-out and DHCP DORA both have multi-stage motion signatures that would need trace-equivalent per-stage step controls; not trivial. Deferred to Phase 5.x.
- **Autoplay speed slider** — autoplay runs at a fixed 600ms-hop pace. Speed slider deferred to Phase 5.x.
- **"Trace this" from successful Simulate log rows** — only failed rows get the Sim→Trace handoff chevron in Phase 5. Successful rows are already explained.
- **Full OSI overlay** — Trace ships only a thin per-hop layer-name chip (`L2 · Data Link`, `L3 · Network`, `L7 · Application`). The full layer-by-layer drill, encapsulation visualization, and hover expansion are Phase 6's job.
- **Per-hop branching** (e.g., multipath ECMP, redundant route exploration) — Phase 5 traces the single path `computePath` returns. Branching is out of scope.

## 3. The 8 locked shape decisions

Locked via brainstorming skill + visual companion (Q3) on 2026-05-23. Each decision was the founder's pick from a 2–3 option fork.

### 3.1 Trigger — modebar pill only

Trace mode is entered via a dedicated `Trace` pill in the floating modebar, same row as `Simulate`. Single primary path; no global keyboard shortcut, no right-click context menu. Q3.8's Sim→Trace handoff is a separate affordance (failed-row chevron), not a Trace entry path.

### 3.2 Playback model — step-through default + autoplay toggle

Step-through is the protagonist: "Next hop" button advances one hop at a time. A separate "Play / Pause" toggle runs the whole trace at a fixed 600ms-per-hop pace. Speed slider deferred to Phase 5.x.

### 3.3 Per-hop annotation surface — hybrid (canvas badge + rail panel)

A small (14px) circular badge attached to the current hop on the canvas anchors the eye (number 1/2/3 in center, accent color when active, red when failedAt). The detailed annotation lives in the rail panel: hop label + thin OSI chip + action verb + reason copy. Mirrors Phase 4 (packet on canvas, log in rail) one level richer.

### 3.4 OSI overlay scope — thin per-hop layer label only

The annotation includes a small layer chip per hop:
- Workstation / server / endpoint device → `L7 · Application`
- Switch → `L2 · Data Link`
- Router / L3-switch / firewall / VPN → `L3 · Network`

One line, no expansion. Phase 6 OSI mode then ships the FULL drill on top (layer-by-layer encapsulation, hover/click expansion, byte-level header breakdown).

### 3.5 Failure-at-hop UX — full beat

When `computePath` returns `failedAt` for any hop in the path:
- **Visual**: failing device shakes + glows red (re-uses Phase 4's `_failDevice(devId, reasonText)`).
- **Behavioral**: step-through and autoplay both AUTO-PAUSE on that hop. `_traceState.mode` transitions to `'paused'`.
- **Content**: rail panel annotation re-renders with the templated `REACH_REASON_TEMPLATES` copy ("Router-1 has no route to 192.168.30.0/24", "Workstation-1 has no default gateway", etc.).

### 3.6 State scope — new `_traceState` module-scope object

`_simState` stays for Simulate only. `_traceState` is the new module-scope object for Trace only. Each mode owns its own state lifecycle: `_closeSimulate` teardowns Simulate; `_closeTrace` teardowns Trace. Future mode systems (OSI/Coach/Grade) follow the same one-state-per-mode pattern. Handoff (3.8 Sim→Trace) passes a small `{srcId, dstId, protocol}` payload — trivially small.

### 3.7 Animation engine — re-use Phase 4 primitives with calibrated durations

`_movePacket`, `_spawnPacketSvg`, `_devCenter` are re-used verbatim. Step-through calls `_movePacket(packet, currentPt, nextPt, 250, onDone)` for snappy 250ms cubic-bezier ease. Autoplay uses 600ms (Phase 4's hop pace). One new CSS keyframe added: `tb3TraceSettle` — an 80ms accent-glow ramp on the arriving hop (visual rest beat between hops). Zero new motion primitives.

### 3.8 Simulate → Trace re-entry — failed rows only

Failed Simulate log rows (`entry.failure` truthy) get a small "Trace →" chevron at the end of the row. Click → `_openTrace({srcId, dstId, protocol})` closes Simulate, opens Trace, calls `_startTrace()` immediately with the pre-populated pair. Success rows do NOT get the chevron (already explained).

## 4. Architecture

### 4.1 Module impact

| File | Change | Estimate |
|---|---|---|
| `features/topology-builder-v3.js` | Phase 5 additive (new state + handlers + render + motion calibration) | ~+500–650 LOC |
| `features/topology-builder-v3.css` | Phase 5 scoped CSS (panel + canvas badge + settle keyframe + reduced-motion gate) | ~+150 LOC |
| `tests/uat.js` | New `_tbv3Phase5Fixtures` IIFE block (~12–15 structural guards) | ~+80 LOC |
| `tests/e2e/app.spec.js` | New Playwright tests 36–45 (~8–10 tests) | ~+120 LOC |
| `.superpowers/brainstorm/.../content/phase5-dogfood.html` | Founder dogfood HTML (10-step smoke) | new file |

TB v3 feature module is ~4280 LOC after Phase 4 (Phase 1 baseline ~900 LOC + Phase 2 +726 + Phase 2.x +652 + Phase 3 +1200 + Phase 4 +800). Phase 5 brings it to ~4800–4900 LOC. The single-IIFE pattern still serves: every render path needs the shared `state` + `tbDeviceIcon` + `_devCenter` + `_movePacket` + cross-rail mutex, and splitting the IIFE multiplies the import-coordination surface without paying for itself. The post-Phase 5 module size will be re-evaluated at the start of Phase 6 — if Phase 6's OSI overlay adds another ~800 LOC, a structural split (e.g., extract motion + reachability into sibling modules) becomes worth weighing.

### 4.2 CSS rev bump

`TB3_CSS_REV` is currently `r9`. Stage 0 bumps to `r10` — the dev-cache-bust handshake documented in CLAUDE.md.

### 4.3 Mutual exclusion across rail panels

Phase 4 wired five mutually-exclusive rail panels: Inspector, Picker, Diagnostic, Simulate. Phase 5 adds Trace as the sixth. Opening any one closes the other four/five:

```
_openInspector / _selectDevice → closes Picker, Diagnostic, Simulate, Trace
_openPicker                    → closes Inspector, Diagnostic, Simulate, Trace
_openDiagnostic                → closes Inspector, Picker, Simulate, Trace
_openSimulate                  → closes Inspector, Picker, Diagnostic, Trace
_openTrace                     → closes Inspector, Picker, Diagnostic, Simulate
```

The Phase 4 guards on the other four open-fns are extended to also call `_closeTrace()`.

### 4.4 Feature module exposures

Phase 4 exposed `_renderCanvas`, `_closeSimulate`, `_openPicker`, `_getState`, `_setState`, `_deleteSelected`, `_loadScenario` on the registered feature object. Phase 5 adds:

```
_openTrace(payload?)   → for Playwright test reach + Sim→Trace handoff debugging
_stepTrace             → for Playwright (page.keyboard might not reach window keys)
_closeTrace            → same reason as _closeSimulate (Esc guard on page-active class)
```

## 5. `_traceState` schema

```javascript
let _traceState = null;

function _initTraceState(payload = null) {
  _traceState = {
    // pair identity
    srcId: payload?.srcId || null,
    dstId: payload?.dstId || null,
    protocol: payload?.protocol || 'ping',

    // computed path
    hops: [],          // array of device-id strings, [srcId, ...intermediates, dstId]
    reasons: {},       // hopIdx → REACH_REASON_TEMPLATES copy (populated on failure only)
    failedAt: null,    // index into hops where computePath failed; null if path OK

    // playback
    currentHopIdx: 0,                  // 0 = at src, len-1 = at dst (or failedAt)
    mode: 'idle',                      // 'idle' | 'step' | 'play' | 'paused' | 'done'
    autoplayTimer: null,               // setTimeout handle for next autoplay step

    // visuals
    packet: null,                      // current packet SVG element (from _spawnPacketSvg)

    // handoff bookkeeping
    lastPayload: payload || null       // for diagnostics / future recall
  };
}

function _resetTraceState() {
  if (_traceState?.autoplayTimer) clearTimeout(_traceState.autoplayTimer);
  if (_traceState?.packet) _despawnPacket(_traceState.packet);
  _traceState = null;
}
```

**Schema discipline**: zero localStorage writes. Transient like `_simState`. UAT guard asserts no `STORAGE.*` namespace key contains `_traceState` or `nplus_tb_v3_trace`.

## 6. Handlers — full signature + behavior

### 6.1 Lifecycle

```
_openTrace(payload?)        Opens Trace panel; closes other rail panels; calls _initTraceState(payload).
                            If payload truthy, immediately calls _startTrace() (Sim→Trace handoff path).
                            Adds `body.trace-open` class. Renders panel.

_closeTrace()               Removes `body.trace-open`; clears _traceState (via _resetTraceState); removes
                            panel DOM. Idempotent: safe to call when already closed.
```

### 6.2 Path computation

```
_startTrace()               Pre-conditions: _traceState.srcId + dstId set, not same device.
                            Calls computePath(srcId, dstId, state) — returns {ok, hops, reason?, failedAt?}.
                            Populates _traceState.hops; sets failedAt (null if path OK, otherwise the hop
                            index where reachability broke) and reasons[failedAt] from REACH_REASON_TEMPLATES.
                            Sets currentHopIdx = 0, mode = 'step'.
                            Calls _spawnPacketSvg('amber') → _traceState.packet, positioned at srcId.
                            Renders hop list + annotation.
```

### 6.3 Stepping

```
_stepTrace()                Advances currentHopIdx by 1. If next hop is failedAt, calls _failHop(failedAt, reason).
                            Otherwise: _movePacket(packet, _devCenter(prevHopId), _devCenter(nextHopId), 250, () => {
                              _renderSettlePulse(nextHopId);  // 80ms accent glow
                              _renderTraceAnnotation();        // rail panel updates to new hop
                              _updateHopBadge();               // canvas badge follows
                            });
                            Disables Next button when currentHopIdx === hops.length - 1 OR mode === 'paused'.
```

### 6.4 Autoplay

```
_playTrace()                Sets mode = 'play'. Recursive autoplay:
                              function tick() {
                                if (mode !== 'play') return;  // paused/failed/done
                                if (currentHopIdx >= hops.length - 1) { mode = 'done'; return; }
                                _stepTraceWithDuration(600);  // longer ease
                                _traceState.autoplayTimer = setTimeout(tick, 600 + 120);  // hop + gap
                              }
                            Phase 4 DORA-pacing reused (600ms hop + 120ms gap).

_pauseTrace()               Sets mode = 'paused'. Clears autoplayTimer.

_endTrace()                 Sets mode = 'done'. Despawns packet. Annotation continues to show the final
                            hop (or failure hop). User can re-Start to replay.
```

### 6.5 Failure handling

```
_failHop(hopIdx, reasonText)  Calls _failDevice(_traceState.hops[hopIdx], reasonText) — re-uses Phase 4:
                                - 200ms shake (translateX ±3px × 4 cycles)
                                - 1.2s red drop-shadow glow with fade-out
                                - Reduced-motion path: 1.5s static red glow only.
                              Sets _traceState.mode = 'paused' (auto-pause).
                              Re-renders annotation with reasonText.
                              Updates canvas hop badge to red.
```

### 6.6 Render

```
_renderTracePanel()         Builds full rail panel DOM (header + controls + hop list + annotation).
                            Called on _openTrace + after every state-mutating handler.

_renderTraceControls()      Sub-render: src/dst <select> dropdowns + protocol pill + Start/Next/End buttons
                            + Play/Pause toggle. Idempotent .onclick assignment (Phase 4 pattern).

_renderHopList()            Sub-render: ordered hop chips (1·WS-1 / 2·RTR-1 / 3·SRV-1).
                            Chip classes: .is-current (accent border), .is-failed (red border + red dot),
                            .is-done (muted checkmark), default (dim).

_renderTraceAnnotation()    Sub-render: hop label + OSI chip + action + reason copy in focal pane.

_updateHopBadge()           Updates the 14px canvas badge attached to current hop device. SVG <circle> +
                            <text> appended to device <g> via existing tbDeviceIcon pattern (read-only;
                            does NOT mutate state.devices).
```

### 6.7 Cross-rail mutual exclusion

```
_openInspector / _selectDevice / _openPicker / _openDiagnostic / _openSimulate
                            All updated to call _closeTrace() before their own work.
```

## 7. Visual surfaces

### 7.1 Visual language lock (taste-skill pass — dashboards within editorial-premium shell)

**Routing**: per the taste-skill master router, Trace mode routes to `dashboards`. The per-hop annotations + step controls + ordered hop list are an information-layout problem, not a poster. The dashboards skill's "queue + detail panel" archetype maps 1:1 onto hop list + annotation pane.

**Shell**: Trace lives inside the cert-app's existing editorial-premium global system (forged-bronze accents, hairline borders, OKLCH palette, Fraunces + Inter typography). The dashboards style is applied THROUGH that shell, not as a separate identity. Phase 4 Simulate panel set the precedent — Trace extends it one level richer.

**Calibrated dials** (per dashboards skill baseline + this surface):

| Dial | Value | Reasoning |
|---|---|---|
| DESIGN_VARIANCE | 3 | Disciplined, calm, predictable. Trace is a tool. |
| MOTION_INTENSITY | 4 | Utility motion + live-state. No theatrical reveals. |
| VISUAL_DENSITY | 7 | Cockpit mode. Tight typography, hairline dividers, mono for IPs, no card chrome. |

**Component vocabulary (locked)**:
- **Hop list = queue pattern** (dashboards canon): hairline-divided ordered list, no per-row card; current-row accent left-bar; failed-row red dot; done-row muted check.
- **Annotation pane = detail panel** (dashboards canon): paired with the hop-list queue — the exact archetype named in the skill.
- **Canvas badge = breathing status dot**: 14px filled circle on the active hop device, hop number inside.
- **Controls = utility command rail**: Start / Next / Play / End as task-first buttons, NOT pill spam.
- **Rail panel chrome**: thin left-edge hairline border + flat surface tone. NO box-in-box.

**Anti-slop bans (locked for Phase 5)** — combined dashboards "Style-Specific Avoidances" + the cert-app editorial-premium global system:
- NO soft cards, drop shadows, `rounded-2xl` decoration.
- NO purple / indigo accents — bronze (`var(--tb3-accent)`) is the only accent.
- NO emoji icons (hop list, controls, annotation, badge) — geometric/text only.
- NO gradient overlays anywhere (the cert-app killed these globally; reaffirmed here).
- NO marketing copy — task-first, operational verbs (stop-slop pass will lock the strings).
- NO three equal feature boxes (no temptation in this surface — flagged for completeness).
- NO theatrical scroll reveals — motion serves state, not entrance.
- NO nested scrollbars — annotation pane may scroll if reason copy is long, but never a scroll inside a scroll.

**Color tokens** (cert-app system, reaffirmed for Phase 5):
- Accent (bronze): `var(--tb3-accent)`
- Failure red: `var(--tb3-pkt-failure)` — used ONLY for failed hops + reason copy emphasis
- Success green: `var(--tb3-success)` — used ONLY for done-row checks + final path-OK state
- Hairline: `var(--tb3-border)`
- Surface: `var(--tb3-surface)`
- Text dim: `var(--tb3-text-dim)`
- Mono: `'SF Mono', monospace` for IPs / MAC / hop indices

**Typography roles**:
- Eyebrow ("TRACE", "Hop 2 of 3") — 10px / 700 / uppercase / 0.06em letter-spacing
- Title ("Trace mode", device hostname) — 14px / 600 — heading subordinate to work surface per dashboards rule
- Annotation action + reason — 12.5px / 400
- OSI chip — 10.5px / 600 / mono accent
- Button labels — 12px / 600 (utility, not promotional)

**Motion profile** (full timing in §8; this section just locks the family):
- Step glide + settle pulse + failure shake = utility motion + status emphasis (dashboards canon).
- No theatrical entry choreography. The panel slides in (Phase 4 pattern), not animates on every hop change.

**Verification anchor**: when Phase 5 ships, Trace's rail panel must read as the same calm operator surface as Phase 4's Simulate panel, one level richer (step controls + per-hop detail). If it reads as darker, busier, or more decorative, we've drifted into AI-slop.

### 7.2 Rail panel DOM

```html
<aside id="tb3-trace-panel" class="tb3-rail-panel" data-mode="trace">
  <header class="tb3-trace-head">
    <span class="tb3-trace-eyebrow">TRACE</span>
    <h3 class="tb3-trace-title">Trace mode</h3>
    <button class="tb3-trace-close" aria-label="Close Trace">×</button>
  </header>

  <section class="tb3-trace-controls">
    <div class="tb3-trace-pair">
      <label>Source <select id="tb3-trace-src">…</select></label>
      <label>Destination <select id="tb3-trace-dst">…</select></label>
    </div>
    <div class="tb3-trace-protocol-row">
      <button class="tb3-trace-proto on" data-proto="ping">ping</button>
      <!-- ARP/DHCP buttons disabled in Phase 5; reserved for Phase 5.x -->
    </div>
    <div class="tb3-trace-controls-row">
      <button id="tb3-trace-start" class="tb3-trace-btn primary">Start trace</button>
      <button id="tb3-trace-next" class="tb3-trace-btn" disabled>Next hop ›</button>
      <button id="tb3-trace-play" class="tb3-trace-btn-icon" aria-label="Play">▶</button>
      <button id="tb3-trace-end" class="tb3-trace-btn ghost" disabled>End</button>
    </div>
  </section>

  <ol class="tb3-trace-hops">
    <li class="tb3-trace-hop is-current" data-hop-idx="0">
      <span class="tb3-trace-hop-num">1</span>
      <span class="tb3-trace-hop-label">WS-1</span>
    </li>
    <li class="tb3-trace-hop" data-hop-idx="1">
      <span class="tb3-trace-hop-num">2</span>
      <span class="tb3-trace-hop-label">RTR-1</span>
    </li>
    <li class="tb3-trace-hop" data-hop-idx="2">
      <span class="tb3-trace-hop-num">3</span>
      <span class="tb3-trace-hop-label">SRV-1</span>
    </li>
  </ol>

  <section class="tb3-trace-annotation">
    <div class="tb3-trace-anno-eyebrow">Hop 1 of 3</div>
    <div class="tb3-trace-anno-title">Workstation-1</div>
    <div class="tb3-trace-anno-osi">L7 · Application</div>
    <div class="tb3-trace-anno-action">Originates ICMP echo request</div>
    <div class="tb3-trace-anno-reason">Targets 10.0.0.20 via default gateway 192.168.10.1</div>
  </section>
</aside>
```

Width: 320px right-anchored. Same `position:absolute + transform:translateX(100%)→0` overlay mechanism as Simulate panel — read-heavy, no canvas reflow needed.

### 7.3 Canvas badge

```svg
<g class="tb3-trace-badge" data-hop-idx="1" transform="translate(<devX + 32>, <devY - 6>)">
  <circle r="7" fill="var(--tb3-accent)" stroke="var(--tb3-bg)" stroke-width="1.5"/>
  <text x="0" y="3" text-anchor="middle" font-size="9" font-weight="700" fill="var(--tb3-bg)">2</text>
</g>
```

Rendered onto the current hop device's `<g class="tb3-dev">` group. One badge at a time (removed on hop change, re-added at new hop). Red variant: `fill="var(--tb3-pkt-failure)"` when `hopIdx === failedAt`.

### 7.4 Annotation copy templates

| Device type | OSI chip | Action | Reason source |
|---|---|---|---|
| `workstation` / `laptop` / `smartphone` / `server` (as src) | `L7 · Application` | "Originates {protocol} {verb}" | "Targets {dstIp} via default gateway {gateway}" |
| `switch` | `L2 · Data Link` | "Forwards via MAC table" | "Egress port toward {nextHopMAC}" |
| `router` / `l3-switch` | `L3 · Network` | "Forwards via routing table" | "Egress to {nextHopIp}" |
| `firewall` / `vpn` | `L3 · Network` | "Inspects + forwards" | "Permits per policy → {nextHopIp}" |
| destination (`workstation` / `server` / etc.) | `L7 · Application` | "Receives {protocol} {verb}" | "Replies to {srcIp}" |

For failed hops, the action remains the device's action verb but the reason switches to the `REACH_REASON_TEMPLATES` copy. The templates are already in Phase 3's `_reachReasonText(failedAt, reason, srcId, dstId)`; Phase 5 calls into the same helper.

## 8. Motion choreography + timing

### 8.1 Step-through

```
T=0     User clicks "Next hop"
T=0     _stepTrace() called
T=0     _movePacket(packet, currentHopCenter, nextHopCenter, 250, onDone) fires
T=250   onDone fires:
         - settle-pulse keyframe starts on next hop (80ms accent-glow ramp)
         - canvas badge updates (removes from prev hop, adds to next hop)
         - rail panel annotation re-renders with next hop's content
         - rail panel hop chip .is-current moves to next chip
T=330   settle-pulse keyframe done. Idle until next click.
```

### 8.2 Autoplay

```
T=0      _playTrace() called, mode = 'play'
T=0      First _stepTrace call (600ms duration variant)
T=600    Hop 1 → Hop 2 arrival. Settle pulse.
T=680    Settle pulse done.
T=720    setTimeout fires: _stepTrace again (600+120 gap)
T=1320   Hop 2 → Hop 3 arrival. Settle pulse.
...
On Pause: timer cleared, mode = 'paused', packet halts.
On Failure: _failHop fires, mode = 'paused', packet halts at failed hop's predecessor position.
```

### 8.3 Failure beat

```
T=0      Step or autoplay reaches the failedAt hop
T=0      _failHop(failedAtIdx, reasonText) called
T=0      _failDevice(failingDevId, reasonText) — Phase 4 reuse:
          - 0–200ms: shake (translateX ±3px × 4)
          - 0–1200ms: red drop-shadow glow ramps up, holds, fades
T=0      Annotation re-renders: reason copy from REACH_REASON_TEMPLATES
T=0      Canvas badge color flips to var(--tb3-pkt-failure)
T=0      Autoplay timer cleared (if playing). mode = 'paused'.
T=1200   Glow fully fades. UI rests at the paused state. User can re-Start or close.
```

### 8.4 Reduced-motion gate

`_reducedMotion()` returns true → all motion paths fall back:
- Step / autoplay: no `_movePacket` call; packet teleports to next hop's center with a 1.5s static accent glow on arrival (instead of the settle-pulse keyframe).
- Failure: 1.5s static red glow only (no shake).
- All annotation/badge updates still fire (these are content, not motion).

### 8.5 CSS keyframes

```css
@keyframes tb3TraceSettle {
  0%   { filter: drop-shadow(0 0 0 transparent); }
  40%  { filter: drop-shadow(0 0 8px var(--tb3-accent)); }
  100% { filter: drop-shadow(0 0 0 transparent); }
}
.tb3-trace-current-hop {
  animation: tb3TraceSettle 80ms ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .tb3-trace-current-hop {
    animation: none;
    filter: drop-shadow(0 0 6px var(--tb3-accent));
  }
}
```

## 9. Simulate → Trace handoff protocol

### 9.1 Payload shape

```javascript
{
  srcId: string,        // device id
  dstId: string,        // device id
  protocol: 'ping'      // Phase 5: ping only (Phase 5.x: arp / dhcp)
}
```

### 9.2 Phase 4 log-entry adapt

Phase 4 `_simState.log` entries already carry:
```javascript
{
  ts: number,
  protocol: 'ping' | 'arp' | 'dhcp',
  text: string,
  failure: boolean,        // truthy on failed pings
  pair: {                  // present on Validator Preview re-play entries
    path: [srcId, ...intermediates, dstId],
    protocol: string,
    failedAt: number,
    failReason: string
  }
}
```

For Sim→Trace handoff:
- `entry.pair.path[0]` → `srcId`
- `entry.pair.path[entry.pair.path.length - 1]` → `dstId`
- `entry.protocol` → `protocol`

**Schema discipline**: only Validator Preview re-play entries currently carry `pair`. Drill-mode ping entries (the bulk of Simulate logs) do NOT have `pair`. To make every failed entry handoff-able, drill-mode `_appendLogEntry` calls in `_motionPing` etc. must include `pair: {path, protocol, failedAt, failReason}` on failure entries.

This is one new field on Phase 4 log entries' failure path — additive, no migration concern (Simulate state is transient, no localStorage).

### 9.3 Chevron render

In `_renderSimLog`, the row template gets a conditional suffix:

```javascript
const traceChevron = entry.failure && entry.pair
  ? `<button class="tb3-sim-log-trace-this" data-log-idx="${idx}" aria-label="Trace this">→ Trace</button>`
  : '';
```

Click handler (delegated on log container):
```javascript
host.onclick = function(e) {
  const traceBtn = e.target.closest('.tb3-sim-log-trace-this');
  if (traceBtn) {
    const idx = parseInt(traceBtn.dataset.logIdx, 10);
    const entry = _simState.log[idx];
    if (!entry || !entry.pair) return;
    const payload = {
      srcId: entry.pair.path[0],
      dstId: entry.pair.path[entry.pair.path.length - 1],
      protocol: entry.protocol
    };
    _openTrace(payload);  // _openTrace will close Simulate automatically (cross-rail mutex)
    return;
  }
  // existing re-play handler stays
  …
};
```

## 10. Schema field-name notes (Phase 3 surfaces Phase 5 inherits)

Phase 4 had to adapt to three Phase 3 schema realities. Phase 5 inherits the same; documenting up-front:

1. `computePath(srcId, dstId, state)` returns `{ok, hops, reason?, failedAt?}` — field is **`hops`** (NOT `path`).
2. `computeReachability(state, completion)` returns `{complete, failures}` — success flag is **`complete`** (NOT `ok`); failure list is **`failures`** (NOT `gaps`). (Phase 5 doesn't call `computeReachability` directly, but Phase 5.x ARP/DHCP trace might.)
3. `requiredCables` schema uses **`from`/`to`** (NOT `fromType`/`toType`). (Not relevant to Phase 5; flagged for completeness.)

`REACH_REASON_TEMPLATES` is a function-valued map at the Phase 3 module level. Phase 4's `_reachReasonText(failedAt, reason, srcId, dstId)` wraps it; Phase 5 calls into the same wrapper, not the raw map.

## 11. 15-stage implementation plan (overview)

Full bite-by-bite breakdown lives in the writing-plans output. This section is the spec-level overview.

| Stage | Title | Output |
|---|---|---|
| 0 | CSS rev bump + prep | `TB3_CSS_REV` r9 → r10; commit a one-line bump. |
| 1 | Pure-fn stubs + TDD UAT | `_initTraceState` / `_resetTraceState` + 4–6 vm-sandbox fixtures in `_tbv3Phase5Fixtures`. |
| 2 | Modebar pill + lifecycle | New "Trace" pill in modebar; `_openTrace` / `_closeTrace` wire; `body.trace-open` class; cross-rail mutex updates. |
| 3 | Panel render: header + controls | `_renderTracePanel` + `_renderTraceControls` (src/dst dropdowns + Start button + idempotent wiring). |
| 4 | `_startTrace` + `computePath` integration | Populates `_traceState.hops` + `failedAt` + `reasons`. |
| 5 | `_renderHopList` | Ordered chip list in rail panel. |
| 6 | Step motion | `_stepTrace` + Next button + `_movePacket` at 250ms + settle pulse + `_updateHopBadge`. |
| 7 | `_renderTraceAnnotation` | Focal pane content per §7.3 templates. |
| 8 | Autoplay | `_playTrace` / `_pauseTrace` + 600ms ease + 120ms gap + Play/Pause toggle UI. |
| 9 | Failure beat | `_failHop` + auto-pause + canvas badge red + reason copy. |
| 10 | Per-hop canvas badge | 14px SVG circle + number; follows current hop. |
| 11 | Sim → Trace handoff | Failed-row chevron + payload + `_openTrace(payload)` accepts entry args + adds `pair` to drill-mode failure log entries. |
| 12 | Cross-rail mutex finalization | Verify all 6 panel-open fns close the other 5 cleanly. |
| 13 | UAT guards | 12–15 structural guards in `_tbv3Phase5Fixtures`. |
| 14 | Playwright tests 36–45 | 8–10 DOM-level tests covering open/step/play/pause/end/fail/handoff/badge/Esc-close/mutex. |
| 15 | Founder dogfood HTML | 10-step smoke at `.superpowers/brainstorm/<session>/content/phase5-dogfood.html`. |

## 12. Test surfaces

### 12.1 UAT structural guards (target: 12–15)

- `_initTraceState` shape (9 keys, transient)
- `_resetTraceState` clears packet + timer + state
- `_traceState` not in `STORAGE.*` namespace (tombstone)
- `_renderTracePanel` exists + emits `#tb3-trace-panel`
- `_renderTraceControls` emits src/dst dropdowns + Start/Next/Play/End buttons
- `_renderHopList` emits `<ol class="tb3-trace-hops">` with `.is-current` / `.is-failed` / `.is-done` states
- `_renderTraceAnnotation` emits OSI chip + action + reason
- `_stepTrace` advances `currentHopIdx` + calls `_movePacket(*,*,*,250,*)`
- `_playTrace` sets autoplayTimer + uses 600ms + 120ms gap
- `_pauseTrace` clears autoplayTimer + sets `mode='paused'`
- `_failHop` calls `_failDevice` + sets `mode='paused'`
- `_openTrace` accepts payload + closes other rail panels (cross-rail mutex)
- `_closeTrace` removes `body.trace-open` + clears state
- Sim→Trace chevron only on `entry.failure && entry.pair` (regression: success rows don't get it)
- Reduced-motion gate present (JS + CSS)

### 12.2 Playwright tests 36–45 (target: 8–10)

- **36**: Trace pill opens panel
- **37**: src/dst dropdowns populate from `state.devices`
- **38**: Start enables Next, populates hop list
- **39**: Next advances hop chip + canvas badge follows
- **40**: Play / Pause toggle works; autoplay advances 600ms + pauses on click
- **41**: Failure path: scenario with broken gateway → failed hop shakes, mode=paused, reason copy visible
- **42**: Sim → Trace handoff: failed Simulate row → Trace opens with src/dst pre-populated
- **43**: Esc closes Trace (via exposed `_closeTrace` — same pattern as Phase 4 test 33)
- **44**: Cross-rail mutex: opening Picker while Trace open closes Trace
- **45**: Reduced-motion: emulate `prefers-reduced-motion: reduce`, verify packet skips `_movePacket` path (only log/state changes)

## 13. Known limitations (shipped with v6.2.0)

- **Ping-only Trace**: ARP and DHCP have multi-stage motion (broadcast + reply + DORA). A trace equivalent would need per-stage step controls (e.g., DHCP = 4-stage trace: Discover/Offer/Request/Ack). Deferred to Phase 5.x.
- **Autoplay fixed at 600ms-per-hop**: speed slider deferred to Phase 5.x.
- **Only failed Simulate rows are handoff-able**: a curious student tracing a successful path must use the modebar pill + manual src/dst pick.
- **OSI chip is a label, not an expansion**: hover/click does nothing. Phase 6 ships the full OSI drill.
- **Single path per Trace**: if the topology has multiple paths (ECMP, multipath), Phase 5 traces only the one `computePath` returns. Multi-path exploration is out of scope.
- **No "Coach this trace" affordance**: Phase 8 Coach mode will add an AI explanation button to the annotation; Phase 5 ships the substrate, not the UI.

## 14. Phase 6+ implications

Trace mode is the substrate the future mode systems build on:

- **Phase 6 (OSI mode)**: each hop's annotation already carries a layer chip. Phase 6 expands the chip into a full encapsulation visualization (Application → Transport → Network → Data Link → Physical, with header/payload byte breakdown per layer). The thin chip stays as the entry point.
- **Phase 7 (3D mode)**: Trace's step-through + per-hop annotation translates directly to a 3D camera-flight metaphor. The state machine (`_traceState.mode`) is portable; only the renderer differs.
- **Phase 8 (Coach mode, Tier C AI)**: per-hop annotation is the natural prompt context for Coach ("explain what happens at hop 2"). The annotation pane's structure feeds the prompt; Coach replies in a new chat-style sub-pane.
- **Phase 9 (Grade mode, PBQ-style scoring)**: a graded scenario shows the user the failing hop + asks "fix this". Trace mode is how the user replays the broken path post-fix to confirm the route is now correct.

Phase 10 retires v1 + v2 TB; by then Trace + OSI + Coach + Grade are all riding the same Phase 1 canvas + Phase 3 reachability substrate.

---

**Status**: spec locked 2026-05-23. Next: writing-plans skill produces the bite-by-bite implementation plan from this spec.
