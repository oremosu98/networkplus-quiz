---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# TB v3 Phase 6 — OSI mode design

**Status:** Locked design, ready for plan
**Date:** 2026-05-23
**Brainstorm:** 8 shape-of-solution decisions resolved
**Prior phase shipped:** v6.2.0 (Phase 5 Trace mode — per-hop step-through, autoplay, failure UX)

---

## §1 Goal

Phase 6 layers a per-hop OSI L1-L7 view on top of Phase 5's Trace substrate. Where Trace shows one OSI chip per hop (e.g. `L3 · Network`), OSI mode shows the full 7-layer stack — each layer carrying its protocol, real header data (IPs, mock MACs, ports), and an activity verb. Active layers per hop highlight; passive layers stay visible but dim. The packet visibly encapsulates at the source (L7 → L1), transits the wire (the existing inter-device glide IS the L1 phase), decapsulates and re-encapsulates at intermediate routers/switches (showing the L3-vs-L2 demarcation in real time), and decapsulates at the destination (L1 → L7). Failures pin to the OSI layer that owns them (no-route → L3, no-cable-path → L1, mac-not-found → L2).

The pedagogical target: the N10-009 OSI questions don't just test which layer protocols sit at — they test what each layer's header carries, what a router rewrites vs preserves, and where failures originate. OSI mode renders all three live.

---

## §2 Non-goals

- **TCP/UDP/L4 protocols.** Phase 6 ships ping-only (matches Phase 5). The L4 row reads `n/a — ICMP runs directly on IP` as an explicit teaching beat. TCP/HTTP add-on is deferred to Phase 6.x.
- **Multi-interface MACs.** A real router has different MACs per interface. Phase 6 simulates one mock MAC per device (deterministic from device ID). The pedagogical point is the L2-vs-L3 demarcation, not interface-level MAC accuracy.
- **Reply-path animation.** ICMP echo round-trip would have the destination generate a reply that walks back. Phase 6 ships the request path only (source → dest). Reply visualization is deferred.
- **Per-layer interactive controls.** OSI mode is read-only — students watch the cascade, they don't click into individual layers to inspect headers. Click-into-layer detail is deferred.
- **OSI mode without a Trace.** OSI pill click auto-enters Trace (decision §6); pure-reference OSI diagram view is out of scope.

---

## §3 Locked shape-of-solution decisions

Eight decisions resolved during brainstorming:

| # | Decision | Choice |
|---|---|---|
| §3.1 | OSI / Trace relationship | **View-toggle on Trace** (reuses `_traceState` + controls) |
| §3.2 | Layer scope per hop | **All 7 layers always rendered**, active/passive distinction via highlight |
| §3.3 | Panel surface placement | **Replace the annotation pane** (swap `_renderTraceAnnotation` for `_renderOSIPanel` when `state.mode === 'osi'`) |
| §3.4 | Static vs animated encap/decap | **Animated** (per-layer cascade, intermediate up/down, asymmetric easing) |
| §3.5 | Content per layer row | **Protocol + verb + per-hop data fields** (mock MACs for L2) |
| §3.6 | OSI pill activation flow | **Auto-enter Trace** (one-click entry, 5th mode value) |
| §3.7 | Intermediate hop choreography | **Decap-up + pause + re-encap-down** (visible router/switch examination) |
| §3.8 | Failure UX | **Layer-specific failure pin** (REACH_REASON mapped to OSI layer; failing layer flips to `.is-failure`) |

---

## §4 Architecture

**Surface**: `state.mode` adds a 5th value: `'osi'`. Full mode enum: `design | simulate | trace | osi | 3d`. The OSI modebar pill (currently locked per Phase 1) unlocks.

**State machine — zero new module-scope state**. OSI reuses Phase 5's `_traceState` verbatim. The only addition is one field:

```javascript
_traceState = {
  ...existing Phase 5 fields,
  osiAnimHandle: null,  // NEW — rAF handle for intra-hop encap/decap motion
};
```

This mirrors `rafHandle` (which captures the inter-device glide). Both get cancelled at the top of every `_stepTrace` for clean rapid-Next interruption.

**Activation handlers**:

```javascript
function _openOSI(payload) {
  _openTrace(payload || null);          // cross-rail mutex sweep + lifecycle
  state.mode = 'osi';                   // override mode set by _openTrace
  document.body.classList.add('osi-open');
  _renderTracePanel();                  // dispatches to OSI render via mode check
  _renderModeBar();                     // OSI pill highlights
}

function _closeOSI() {
  document.body.classList.remove('osi-open');
  _closeTrace();                        // shares teardown with Trace
}
```

**Render dispatch** — `_renderTracePanel` currently emits annotation unconditionally. Phase 6 adds one branch:

```javascript
const annotationHtml = (state.mode === 'osi')
  ? _renderOSIPanel()
  : _renderTraceAnnotation();
```

**Step-through pipeline** — `_stepTrace`'s onDone callback (Stage 6 from Phase 5) currently fires settle pulse + badge update + failure-hop guard. Phase 6 adds an OSI-mode branch:

```javascript
if (state.mode === 'osi') {
  const role = _hopRole(_traceState.currentHopIdx);  // 'source' | 'intermediate' | 'dest'
  if (role === 'source')       _animateEncap(hopId, activeLayers, settle);
  else if (role === 'dest')    _animateDecap(hopId, activeLayers, settle);
  else                         _animateIntermediate(hopId, deviceType, settle);
}
```

The existing settle pulse + badge update still fire. OSI animation runs in parallel with (not replacing) Phase 5's choreography.

**Cross-rail mutex (5 panels now)**: every `_open*` that already calls `_closeTrace()` (per Stage 12's forEach audit) ALSO calls `_closeOSI()`. New UAT forEach lock asserts `_selectDevice` / `_openPicker` / `_openDiagnostic` / `_openSimulate` all call both. `_openTrace` itself does NOT call `_closeOSI()` (they share state — switching between is a mode flip, not a close).

---

## §5 `_traceState` schema extension

```javascript
function _initTraceState(payload) {
  return {
    srcId: (payload && payload.srcId) || null,
    dstId: (payload && payload.dstId) || null,
    protocol: (payload && payload.protocol) || 'ping',
    hops: [],
    currentHopIdx: 0,
    failedAt: null,
    reasons: {},
    mode: 'idle',
    packet: null,
    rafHandle: null,
    autoplayTimer: null,
    osiAnimHandle: null,   // NEW for Phase 6 — intra-hop encap/decap rAF
  };
}
```

The 11th field. `_resetTraceState()` clears it via `cancelAnimationFrame(_traceState.osiAnimHandle)` mirroring the `rafHandle` cancel.

---

## §6 Handlers

| Handler | Purpose |
|---|---|
| `_openOSI(payload?)` | Wrap `_openTrace`, set `state.mode = 'osi'`, add `osi-open` body class |
| `_closeOSI()` | Remove `osi-open`, delegate to `_closeTrace` for teardown |
| `_renderOSIPanel()` | Replaces `_renderTraceAnnotation` when `state.mode === 'osi'`. Emits the 7-row layer stack for the current hop. **Empty state** (no trace running — `_traceState.hops.length === 0`): renders the 7-row stack with all rows passive + each row's proto = `n/a` and verb = `Pick a source + destination, then Start to populate this layer`. Same DOM shape as the active view — only the content varies. |
| `_buildLayerStackForHop(hop, role, ctx)` | Pure fn. Returns array of 7 `{num, name, proto, verb, active, failure}` rows. Inputs: hop device, role (source/router/switch/firewall/dest), context (srcIp, dstIp, mock MACs, cable type from neighbors). |
| `_activeLayersForDev(dev)` | Pure fn. Returns array of active layer numbers per device type (endpoint = `[1,2,3,4,7]` for ICMP = `[1,2,3,7]`; switch = `[1,2]`; router/firewall/vpn = `[1,2,3]`). |
| `_hopRole(hopIdx)` | Returns `'source'` (idx 0), `'dest'` (idx hops.length - 1), or `'intermediate'` (anywhere between). |
| `_genMockMac(devId)` | Pure fn. djb2 hash of devId → 3-byte hex → `02:00:00:XX:XX:XX`. Locally-administered MAC range, deterministic. |
| `_failedReasonToLayer(reason)` | Pure fn. Maps Phase 3's REACH_REASON code to the OSI layer that owns the fault (table in §8 below). |
| `_animateEncap(srcHopId, activeLayers, onDone)` | Motion fn. Per-layer cascade L7 → L1 (top-down), 80ms per active layer, asymmetric easing `cubic-bezier(0.5, 0, 0.5, 1)`. Captures rAF on `_traceState.osiAnimHandle`. |
| `_animateIntermediate(hopId, deviceType, onDone)` | Motion fn. Decap-up cascade to relevant layer (L2 switch, L3 router) → 100ms pause → re-encap-down cascade to L1. Asymmetric easing per direction (§7.4). |
| `_animateDecap(dstHopId, activeLayers, onDone)` | Motion fn. Per-layer cascade L1 → L7 (bottom-up), 80ms per active layer, mirror easing of `_animateEncap`. |
| `_setOSILayerFiring(layerNum)` | DOM helper. Adds `.tb3-osi-layer-firing` class to the row, triggers 80ms `tb3OSILayerSettle` keyframe, removes class on animation end. Reduced-motion path: no animation, single `filter:drop-shadow` static highlight for 1200ms. |

---

## §7 Visual language + motion choreography

### §7.1 Visual language (taste-skill → dashboards)

- Hairline borders only (1px `var(--tb3-border)`) between layer rows. No card stacking, no soft shadows.
- Mono only for `L{n}` numbers + protocol fields (IPs, MACs, ports). Inter for everything else.
- Accent (bronze) for active state. Red (`--tb3-pkt-failure`) for failure. No other color.
- Active layer: 2px accent left-bar (`::before`), ink text, accent number + name, roman verb.
- Passive layer: dim text (`var(--tb3-text-dim)`), italic verb.
- Failure layer: 2px red left-bar, red text, 6% red-tinted background, inline reason text below verb.

### §7.2 DOM structure

```html
<section class="tb3-osi-panel">
  <div class="tb3-osi-eyebrow">HOP {idx+1} OF {total}</div>
  <div class="tb3-osi-title">{dev.hostname}</div>
  <ol class="tb3-osi-stack">
    <li class="tb3-osi-layer is-active" data-layer="7">
      <span class="tb3-osi-num">L7</span>
      <div>
        <span class="tb3-osi-name">Application</span>
        <span class="tb3-osi-proto">ICMP echo request · type=8 code=0</span>
        <span class="tb3-osi-verb">Originates ICMP echo request</span>
      </div>
    </li>
    <!-- L6 through L1 rows -->
  </ol>
</section>
```

Failure layer adds `<span class="tb3-osi-layer-reason">{reasonText}</span>` inside the row.

### §7.3 Active layers per device role

| Device type | Active layers (for ping) |
|---|---|
| workstation, server, laptop, smartphone, game-console, smart-tv (endpoints) | L1, L2, L3, L7 (L4 = `n/a` for ICMP) |
| switch, ap, wlc | L1, L2 |
| router, l3-switch | L1, L2, L3 |
| firewall, vpn | L1, L2, L3 (L3 verb includes policy mention) |
| cloud, internet | L1, L2, L3 (treated as routers) |

### §7.4 Locked stop-slop verb templates

Per spec §7.4 (extending Phase 5's `_actionForDevice` discipline to layer level):

| Layer × Role | Verb |
|---|---|
| L7 source | `Originates ICMP echo request` |
| L7 dest | `Receives ICMP echo, sends reply` |
| L7 intermediate | `n/a — device does not examine application data` |
| L4 (all roles, ICMP) | `n/a — ICMP runs directly on IP` |
| L3 source | `Wraps payload with source/dest IP` |
| L3 router / l3-switch | `Forwards via routing table` |
| L3 firewall / vpn | `Filters per policy. Forwards via routing table` |
| L3 dest | `Accepts packet for own IP` |
| L3 switch (passive) | `n/a — switch does not examine IP` |
| L2 source | `Frames with source/next-hop MAC` |
| L2 switch | `Forwards via MAC table` |
| L2 router / l3-switch / firewall / vpn | `Rewrites frame with own MAC + next-hop MAC` |
| L2 dest | `Accepts frame for own MAC` |
| L1 source / intermediate | `Encodes frame as electrical signal` |
| L1 dest | `Receives signal` |

The period after "policy" in `Filters per policy. Forwards via routing table` is load-bearing — UAT inherits the §7.4 rule from Phase 5 ("period breaks the chain"). Bare variants tombstoned: `'Wraps with IP'` / `'Rewrites MAC'` must not return.

### §7.5 Per-hop data fields

All 7 layer rows always render per hop (per §3.2 — locked). L5 (Session) and L6 (Presentation) stay passive with `n/a` proto + `n/a — not engaged by ping` verb across every role. L4 is passive for ICMP across every role (`n/a — ICMP runs directly on IP`). The table below covers only the layers that carry role-varying content.

For each active layer at each role, what fields render:

| Active row | Source | Intermediate (router) | Intermediate (switch) | Dest |
|---|---|---|---|---|
| L7 proto | `ICMP echo request · type=8 code=0` | — | — | `ICMP echo reply queued` |
| L3 proto | `IP · src={srcIp} · dst={dstIp}` | `IP · src={srcIp} · dst={dstIp} · TTL decrements` | — | `IP · dst={dstIp} matches` |
| L2 proto | `Ethernet · src={srcMac} · dst={nextHopMac}` | `Ethernet · src={routerMacOut} · dst={nextHopMac}` | `Ethernet · forwarding table lookup` | `Ethernet · dst={dstMac} matches` |
| L1 proto | `{cableType} · electrical signal` | `{cableType} · electrical signal` | `{cableType} · electrical signal` | `{cableType} · signal received` |

`{cableType}` reads from the cable's `type` field (defaults to `cat6`). Mock MACs from `_genMockMac(devId)`. The visible L2 MAC swap between source (`src={srcMac}`) and intermediate router (`src={routerMacOut}`) is the entire L2-vs-L3 demarcation lesson rendered in two adjacent panel views.

---

## §8 REACH_REASON → OSI layer mapping

`_failedReasonToLayer(reason)` returns the OSI layer number that owns each Phase 3 REACH_REASON code:

| Phase 3 reason | OSI layer | Rationale |
|---|---|---|
| `no-link` | 1 | Physical link missing |
| `no-cable-path` | 1 | No L1/L2 path between src and intended next-hop |
| `mac-not-found` | 2 | Frame can't be forwarded — MAC not in table |
| `no-l2-path` | 2 | L2 forwarding broke (loop / blocked / segmented) |
| `no-ip` | 3 | Device has no IP — can't participate in routing |
| `no-gateway` | 3 | Endpoint has no default gateway |
| `gateway-not-found` | 3 | Gateway IP doesn't match any L3 device's interface |
| `different-subnet` | 3 | Intermediate hop's interface isn't on expected subnet |
| `not-l3` | 3 | Gateway position is an L2 switch |
| `no-route` | 3 | Router has no route to destination |
| `no-router-between` | 3 | Multi-hop routing required, no L3 device sits between |
| (any unknown reason) | 3 | Default fallback — L3 is the most common N+ diagnostic fault domain |

---

## §9 Motion choreography

### §9.1 Per-click motion sequence

| Click context | Sequence | Step mode | Autoplay |
|---|---|---|---|
| **Start** | Spawn packet at source → encap cascade L7 → L1 → settle pulse | ~400ms | ~400ms |
| **Next: source → intermediate** | Inter-device glide → arrival → decap-up cascade → 100ms pause → re-encap-down cascade → settle pulse | ~670ms (switch) / ~830ms (router) | ~1020ms / ~1180ms |
| **Next: intermediate → intermediate** | Glide → decap-up → pause → re-encap-down → settle | Same | Same |
| **Next: → dest** | Glide → arrival → decap cascade L1 → L7 → settle. Mode = `'done'` | ~650ms | ~1000ms |

A 3-hop trace (source → switch → dest) total in step mode: ~1.72s. In autoplay: ~2.42s.

### §9.2 Per-layer cascade timing

- Each layer's `.tb3-osi-layer-firing` class fires for 80ms.
- Cascade interval: 80ms (next layer fires when prior completes — no overlap).
- For 4 active layers (endpoint ICMP): 320ms total cascade. Conservative budget 400ms accounts for the settle pulse overlap.

### §9.3 Asymmetric easing tokens

Per emil §8.6:

| Motion | Easing | Feel |
|---|---|---|
| Encap (source) | `cubic-bezier(0.5, 0, 0.5, 1)` | Slow in, settled out — "thoughtful build" |
| Decap-up (intermediate) | `cubic-bezier(0.25, 0, 0.5, 1)` | Quick rise — "quick examination" |
| Re-encap-down (intermediate) | `cubic-bezier(0.5, 0, 0.25, 1)` | Quick fall — "decisive forward" |
| Decap (dest) | `cubic-bezier(0.5, 0, 0.5, 1)` | Mirror of source encap |

### §9.4 rAF discipline

`_traceState.osiAnimHandle` captures the rAF handle inside `_animateEncap` / `_animateIntermediate` / `_animateDecap`. Every `_stepTrace` call top-of-function block cancels both `rafHandle` AND `osiAnimHandle`:

```javascript
if (_traceState.rafHandle) {
  cancelAnimationFrame(_traceState.rafHandle);
  _traceState.rafHandle = null;
}
if (_traceState.osiAnimHandle) {
  cancelAnimationFrame(_traceState.osiAnimHandle);
  _traceState.osiAnimHandle = null;
}
```

Same emil §8.6 interruptibility discipline. `_pauseTrace` and `_endTrace` also clear `osiAnimHandle`.

### §9.5 Reduced-motion fallback

`@media (prefers-reduced-motion: reduce)`:
- Per-layer cascade dropped. When a hop becomes current in OSI mode, all active layer rows light up at once (single static state change).
- Inter-device glide kept (250ms — spatial context).
- Per-layer firing pulse: replaced by single 1200ms `filter:drop-shadow` ease (kept subtle so the active state is still visible).
- Failure layer pin: appears instantly, no animated up-to-failing-layer.
- Phase 5's device shake at failure: already reduced-motion gated (glow only, no shake) — Phase 6 inherits.

### §9.6 Failure motion

1. Glide to failing hop (existing 250ms / 600ms).
2. Decap-up cascade fires UP TO the failing layer (visible step-by-step — students see which layer is reached before stopping).
3. At the failing layer: cascade STOPS. Layer gets `.is-failure`. No further motion.
4. Phase 5's `_failHop(hopIdx, reasonText)` fires in parallel (device shake + red glow).
5. `_traceState.mode = 'paused'` if autoplay was running.
6. Reason text renders inline in the failing layer row.

---

## §10 Schema field-name notes

Inherited from Phase 5:
- `computePath` returns `hops` not `path` (spec §10 from Phase 5).
- `computePath` returns `failedAt` as a **device-ID string** (NOT a numeric index). Phase 5's `_startTrace` normalizes via `_traceState.hops.indexOf(failedAt)`.

Phase 6 specific:
- `_failedReasonToLayer(reason)` is the bridge between Phase 3's reason strings and the OSI mode's layer-number expectations. Defaults to L3 on unknown reason.
- Cable shape per `state.cables[]`: `{id, fromId, fromPort, toId, toPort, type}`. NOT the plan-example shape `{from: {devId, ifIdx}, ...}` (Phase 5 Stage 14 caught this; Phase 6 test fixtures inherit the correct shape).
- Mask in `device.config.mask` is a **number** (e.g. `24`), not a string. Phase 5 Stage 14 caught this too.

---

## §11 Stage breakdown (preview — full plan in writing-plans output)

Approximately 15 stages. Sonnet default; Opus for the motion-engine cluster (Stages 8, 9, 10).

| Stage | Goal | Subagent |
|---|---|---|
| 0 | CSS rev bump r10 → r11 + branch hygiene | Sonnet |
| 1 | `_osiAnimHandle` state field + `'osi'` mode value + UAT fixtures | Sonnet |
| 2 | Modebar OSI pill unlock + `_openOSI` / `_closeOSI` lifecycle + cross-rail mutex extension | Sonnet |
| 3 | `_genMockMac` helper + UAT | Sonnet |
| 4 | `_buildLayerStackForHop` + `_activeLayersForDev` + locked verb templates + UAT | Sonnet |
| 5 | `_renderOSIPanel` + render dispatch in `_renderTracePanel` | Sonnet |
| 6 | Scoped CSS — layer stack styling + active/passive/failure variants | Sonnet |
| 7 | `_failedReasonToLayer` mapping + failure render path | Sonnet |
| 8 | Motion engine — `_animateEncap` + cascade + per-layer firing keyframe | **Opus** |
| 9 | Motion engine — `_animateIntermediate` (decap-up + pause + re-encap-down) | **Opus** |
| 10 | Motion engine — `_animateDecap` + reduced-motion fallback | **Opus** |
| 11 | Cross-rail mutex audit + forEach lock for `_closeOSI` | Sonnet |
| 12 | UAT structural guards consolidation (~35 new across all stages) | Sonnet |
| 13 | Playwright DOM tests 46-53 | Sonnet |
| 14 | Founder dogfood HTML (10-step smoke) | Sonnet |
| 15 | Ship — UAT/Playwright final + version bump v6.3.0 + CLAUDE.md row + push | Sonnet |

---

## §12 Test surface

### §12.1 UAT structural guards (target ~35 new; brings 6664 → ~6700)

- State schema: `_osiAnimHandle` field, `'osi'` valid in `state.mode`
- Lifecycle: `_openOSI` defined / calls `_openTrace` / sets mode='osi' / adds 'osi-open'; OSI modebar pill no longer locked
- Mock MAC: format `02:00:00:XX:XX:XX`, deterministic (vm-sandbox fixture)
- Layer builder: 7 rows, `_activeLayersForDev` correct per role
- Locked verbs: 12 templates asserted verbatim + tombstones for bare variants
- Failure mapping: full table tested via vm-sandbox fixture
- Motion fns: `_animateEncap` / `_animateIntermediate` / `_animateDecap` defined; rAF capture on `osiAnimHandle`
- Cross-rail forEach: 4 inspector-opener paths call `_closeOSI()`
- §12.1 consolidation: `_renderTracePanel` dispatches to `_renderOSIPanel`; reduced-motion gate on `.tb3-osi-layer-firing`

### §12.2 Playwright DOM tests 46-53 (target 8 new; brings 153 → ~161 chromium)

| Test | Verifies |
|---|---|
| 46 | OSI pill click auto-enters Trace + sets `body.osi-open` |
| 47 | OSI panel renders 7 `.tb3-osi-layer` rows |
| 48 | Active layers per device role — workstation 4, switch 2, router 3 |
| 49 | `_genMockMac('d1')` returns same MAC across two calls |
| 50 | Failure case (empty gateway) marks L3 row `.is-failure` + shows reason |
| 51 | `prefers-reduced-motion: reduce` bypasses cascade, trace still advances |
| 52 | Trace ↔ OSI mid-trace toggle preserves `_traceState.currentHopIdx` |
| 53 | Cross-rail — `_openPicker()` from OSI removes both `trace-open` AND `osi-open` |

Test pattern: `page.evaluate` state-injection + `_openOSI` exposure on the registration object. Cable shape `{fromId, fromPort, toId, toPort}` and mask as number (not string) — both inherited from Phase 5 Stage 14 corrections.

### §12.3 Founder dogfood smoke

`.superpowers/brainstorm/{session-id}/content/phase6-dogfood.html` — 10 steps parallel to Phase 5:

1. Build star topology (1 switch + 1 server + 3 workstations + 4 cables)
2. Configure IPs (reuse Phase 5 dogfood setup)
3. Click OSI pill → Trace auto-enters, empty-state layer placeholder
4. Pick src/dst, click Start → encap cascade at source (L7 → L1, ~400ms, per-layer firing pulse)
5. Click Next → glide + intermediate motion at switch (decap-up to L2 + pause + re-encap to L1)
6. Click Next → glide + decap at dest (L1 → L7)
7. End trace, toggle Trace view → same trace, standard annotation; toggle back to OSI → resumes at current hop
8. Break WS-1 gateway, restart → encap stops at L3, L3 row red, WS-1 shakes red, auto-pause
9. Restore gateway, run autoplay through 3-hop path
10. Esc closes OSI. Open Picker → cross-rail mutex closes Trace + OSI cleanly. No console errors.

---

## §13 Known limitations

- **L4-L7 stays passive for ICMP.** The L4 row is honest (`n/a — ICMP runs directly on IP`) but visually the upper layers feel underutilized. TCP/HTTP support (Phase 6.x) populates L4-L7 fully.
- **One mock MAC per device.** Real routers have per-interface MACs. The mock simulates a single MAC across all interfaces — incorrect in practice but the L2-vs-L3 demarcation lesson lands without per-interface accuracy. Multi-interface MACs queued for Phase 6.x or Phase 7.
- **No reply-path animation.** The destination shows decap + a `ICMP echo reply queued` cue at L7, but doesn't animate the reply walking back. Reply-round-trip is a Phase 6.x candidate.
- **Same `_failedReasonToLayer` defaults to L3 on unknown reasons.** If Phase 3 adds new reason codes that don't map cleanly, OSI mode pins them to L3 silently. A future Phase 3 reason should add its own mapping in this table.
- **OSI panel scrolls on dense hops.** A full endpoint hop renders 4 active rows (~62px each) + 3 passive rows (~32px each) = ~344px, plus header. On 900px viewport with strip + controls + hop list above, ~280-360px of vertical remains — scroll kicks in. Acceptable; the protagonist hop is always visible.

---

## §14 Phase 7+ implications

Phase 6's per-layer rendering substrate becomes the foundation for:

- **Phase 7 (3D mode)**: 3D visualizes the wire-traversal more dramatically; could reuse OSI's per-layer cascade as the encap/decap motion inside the 3D scene's source/dest devices.
- **Phase 8 (Coach mode)**: Tier C AI tutor can reference specific OSI layers in feedback (`"the failure is at L3 — your workstation has no gateway"`). Coach reads `_failedReasonToLayer` output for the layer-anchored explanation.
- **Phase 9 (Grade mode)**: PBQ-style scoring can include OSI-layer questions (`"which layer does the router rewrite?"`) — the answer key is the active-layers list per role.

The locked stop-slop verbs from §7.4 + the layer activity model (`_activeLayersForDev`) are reusable references for any future mode that needs per-layer language.

---

## §15 Skills locked for execution

- **Superpowers** drives the brainstorm → spec → plan → execute loop.
- **Taste-skill (dashboards)** routes the panel/layer-stack visual treatment — hairline rows, no card stacking, single accent.
- **Stop-slop** locks the layer verb templates (§7.4) and any user-facing copy.
- **emil-design-eng** drives motion choreography (asymmetric easing per encap/intermediate/decap, 80ms per-layer cascade, rAF discipline, reduced-motion fallback).

---

## Self-review checklist

- ✓ No "TBD" / "TODO" / "implement later" / "fill in details"
- ✓ Every code-changing decision has an explicit handler name + signature
- ✓ Every locked-copy verb template is verbatim (12 in §7.4)
- ✓ Schema discipline notes (§10) carry forward Phase 5's lessons (cable shape, mask type, failedAt normalization)
- ✓ Motion timing budget is explicit (§9.1 table)
- ✓ Reduced-motion fallback is explicit (§9.5)
- ✓ REACH_REASON → OSI layer table is exhaustive (§8)
- ✓ Test surface targets numeric counts (35 UAT, 8 Playwright, 10 dogfood)
- ✓ Phase 7+ implications named (§14)
- ✓ Skills locked (§15)

All sections covered. Ready for plan.
