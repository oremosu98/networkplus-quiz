---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# Topology Builder v3 — Phase 3: subnet-aware reachability validator

> **For agentic workers:** REQUIRED SUB-SKILL — `superpowers:subagent-driven-development` for the implementation plan that follows. This spec is the design source; the plan derives from it.

**Goal:** Give the Phase 2 completion validator real teeth. Replace the cable-shape-only check with a subnet-aware L3 reachability engine that answers "do packets actually reach where they're supposed to?". When the answer is no, surface why via a right-anchored diagnostic drawer that lets the user click straight to the device that needs fixing.

**One-line outcome:** the `GOALS MET` pill is the editorial promise that the network actually works, not just that the cables are shaped right.

**Architecture:** additive to `features/topology-builder-v3.js`. Five new pure functions, one extended state field (`device.config` / `device.interfaces`), one new UI panel (the diagnostic drawer in the right rail), updated Inspector with IP/Mask/Gateway fields, and an IP-backfill data migration across all 25 scenarios. No new feature modules.

**Source skills used in the design phase:** brainstorming (process gate), taste-skill router → editorial-premium (the locked TB v3 style), emil-design-eng (drawer motion + micro-interactions), stop-slop (failure-reason prose discipline), using-superpowers (meta).

---

## In scope (Phase 3)

1. **Reachability engine** — 5 pure functions in `features/topology-builder-v3.js`, TDD'd via vm-sandbox before implementation.
2. **State schema extension** — `device.config` (endpoints) and `device.interfaces[]` (routers / L3 switches / firewalls / VPN gateways) carry IP/Mask/Gateway. Round-tripped by `serialiseState` + `parseState`.
3. **Inspector IP/Mask/Gateway fields** — appear when the selected device is L3-eligible. Validate on blur via `parseCidr`. Inline error caption + accent border on invalid (Phase 1 error-state pattern).
4. **Free Build auto-fill** — dropping a device populates a sensible default IP based on the existing canvas subnets. User can override any field.
5. **Validator integration** — `checkCompletion` runs `computeReachability` whenever `intent === 'lab'` and `scenario.completion.requiredCables` is non-empty. The `complete` boolean ANDs cable-shape AND reachability. The return shape gains a `reachabilityFailures: []` array.
6. **Diagnostic drawer** — 320px right-anchored slide-out, mutually exclusive with the picker + Inspector via `.tb3-body.diagnostic-open` (the existing one-rail-panel-at-a-time pattern). Lists each failed reachability check with a one-sentence reason. Rows click-jump to the failing device. Empty state when reachable.
7. **Scenario IP back-fill** — every scenario in `TB_V3_SCENARIOS` gets IP/Mask/Gateway baked into its `startingState.devices`. Loading the scenario yields `GOALS MET` immediately.

## Out of scope (Phase 3b / Phase 4)

- Simulate modebar pill unlock (still locked).
- Interactive ping/ARP/DHCP modal.
- Packet-flow animation along cables.
- MAC tables, ARP cache, broadcast/flooding semantics.
- DHCP simulation (DHCP discover packet flow, lease tracking).
- Per-scenario AI Coach contextualisation against the reachability state.

---

## Reachability engine — pure functions

All five live in `features/topology-builder-v3.js`, exposed on `window._certanvilFeatures['topology-builder-v3']` for vm-sandbox + Playwright.

### `parseCidr(input)` → `{ip: [a,b,c,d], mask: int} | null`

Strict CIDR parser. Accepts `192.168.10.5/24`. Returns `null` on any malformed input (out-of-range octet, missing mask, invalid mask `<0` or `>32`). Caller decides what to do with `null`.

### `inSameSubnet(ipA, ipB, mask)` → `boolean`

Bitwise AND of `ip & mask` for both arguments. Compare. The atomic L3 reachability primitive.

### `routeNextHop(srcIp, dstIp, device)` → `{via: 'direct'} | {via: 'gateway', gateway: ip} | null`

For an endpoint:
- Same subnet as destination → `{via: 'direct'}`
- Different subnet AND has gateway → `{via: 'gateway', gateway}`
- Different subnet AND no gateway → `null` (will surface as `no-gateway` failure)

For a router or L3 switch (carries `interfaces[]`):
- Destination matches a directly-connected interface subnet → `{via: 'direct'}` (router can deliver locally)
- Otherwise → consult per-device static routes if present, else `null` (will surface as `no-route` failure)

### `computePath(srcId, dstId, state)` → `{ok: true, hops: [...]} | {ok: false, reason, failedAt}`

The core function. Walks the actual topology graph (state.devices + state.cables) honouring L3 semantics:

1. Look up source device. No `config.ip` → fail `no-ip` (`failedAt: srcId`).
2. Compute `routeNextHop(src.config.ip, dst.config.ip, src)`.
3. If `null`: fail `no-gateway` (endpoint case) or `no-route` (router case).
4. If `direct`: BFS through cables to the destination. Switches/hubs/APs are transparent (zero-cost L2 hops). If destination unreachable through cables, fail `no-cable-path`.
5. If `gateway`: BFS to find a device whose IP matches the gateway. If not reachable, fail `no-cable-path`. If found and the device is NOT a router/L3-switch/firewall (carrying `interfaces[]`), fail `no-router-between` (e.g. gateway points at a workstation IP). If found and is a router: recurse from the router with the same destination, tracking visited routers to prevent loops.
6. On success: `{ok: true, hops: [srcId, ...intermediateIds, dstId]}`.

### `computeReachability(state, completion)` → `{complete, failures: [{from, to, reason, failedAt}]}`

For each `requiredCables: [{from: type, to: type}]` in `completion`:
- Pick a representative source device (first device of `type === from`).
- Pick a representative destination device (first device of `type === to` that's not the source).
- Run `computePath(srcId, dstId, state)`.
- If `ok: false`, push `{from: srcId, to: dstId, reason, failedAt}` to failures.

`complete = failures.length === 0`. Empty `requiredCables` → empty failures → complete.

**Performance budget:** ≤25 scenarios × ≤8 requiredCable pairs × ≤15 devices BFS = sub-millisecond per call. Re-runs on every `_saveState()` (the 11 existing v5.8.0 hook sites). No memoisation needed for Phase 3.

---

## Device IP configuration model

### State extension

```js
{
  id: 'sc_star_2',
  type: 'server',
  x: 360, y: 200, label: 'SRV-01',
  config: {                       // NEW — endpoints only
    ip: '192.168.10.10',
    mask: 24,
    gateway: '192.168.10.1',
  },
}
```

For routers / L3-switches / firewalls / VPN gateways:

```js
{
  id: 'sc_dmz_outerfw',
  type: 'firewall',
  x: 600, y: 260, label: 'OUTER-FW',
  interfaces: [                   // NEW — multi-interface devices
    { ip: '203.0.113.2',  mask: 24 },  // outside (internet-facing)
    { ip: '192.168.30.1', mask: 24 },  // dmz
    { ip: '192.168.10.254', mask: 24 }, // inner side
  ],
}
```

Switches / hubs / APs / WLC / cloud / internet stubs get no IP field at all (cloud and internet carry a single representative IP injected by the engine, not stored on the device).

### Serialisation

`serialiseState` writes `config` + `interfaces` if present. `parseState` reads them back, defaulting to absent if not in the JSON. Backward compatible — devices saved before Phase 3 round-trip cleanly (engine treats them as `no-ip`).

### Inspector

When a device with `config` is selected, the Inspector renders three text inputs: **IP**, **Mask** (a dropdown of common prefixes: 8, 16, 24, 25, 26, 27, 28, 29, 30), and **Gateway**.

When a multi-interface device is selected, the Inspector renders one block per existing interface, each with an IP + Mask field. A "+ Interface" button appends a new empty interface (capped at the device's cable count + 1).

Each text field validates on blur via `parseCidr` (IP fields require an octet-only value; Mask is the dropdown). Invalid input gets `border-color: var(--tb3-danger)` + an inline 11px red caption below the field naming the problem. The existing Phase 1 label-field error pattern is the model.

For L2 devices (switch / hub / AP / WLC) the Inspector shows a small dim caption: "Layer-2 device — no IP configuration."

### Auto-fill on drop (Free Build)

When the user drops a device on the canvas via the palette, the auto-fill rules:

1. Inspect existing canvas devices. Find the first router that has an IP. Adopt its subnet.
2. If no router exists, use `192.168.10.0/24` as the default subnet.
3. For the new device:
   - Endpoint → IP = next available `.10+` in the chosen subnet, gateway = router's IP (if a router exists), mask = 24.
   - Router → IP `192.168.10.1` (or next free `.1` in a new `192.168.X0.0/24` subnet).
   - L3 switch → start with one SVI on the chosen subnet.
   - Switch / hub / AP / WLC → no config.

The user can immediately edit any value in the Inspector. Auto-fill is a starting point, not a constraint.

---

## Validator integration

`checkCompletion(state, completion)` updated. New return shape:

```js
{
  complete,                  // cableShapeOk AND reachabilityFailures.length === 0
  missingDevices,            // unchanged
  deviceCountMismatch,       // unchanged
  missingCables,             // unchanged (cable-shape, kept for back-compat)
  reachabilityFailures,      // NEW
}
```

`_renderCompletionPill` adjusts its display only by including `reachabilityFailures.length` in the "N TO GO" count. Pill DOM is otherwise unchanged. Pill becomes clickable (cursor: pointer, accent border on hover) — click opens the diagnostic drawer.

The 11 existing `_saveState()` + `_renderCompletionPill()` hook sites pick up reachability automatically because the engine runs inside `_renderCompletionPill`.

---

## Diagnostic drawer UI

**Taste-skill routing:** editorial-premium (locked for TB v3). All scoped CSS lives in `features/topology-builder-v3.css` and reuses the existing `--tb3-*` token system.

**DOM** (rendered by new `_renderDiagnosticDrawer()` function alongside `_renderPickerPanel()`):

```html
<aside class="tb3-diagnostic" id="tb3-diagnostic" role="dialog"
       aria-labelledby="tb3-diagnostic-title">
  <div class="tb3-diagnostic-head">
    <div>
      <div class="tb3-diagnostic-eyebrow">Diagnostics</div>
      <h2 class="tb3-diagnostic-title" id="tb3-diagnostic-title">Why goals aren't met</h2>
    </div>
    <button type="button" id="tb3-diagnostic-close" aria-label="Close">&times;</button>
  </div>
  <div class="tb3-diagnostic-rule"></div>
  <div class="tb3-diagnostic-list" id="tb3-diagnostic-list">
    <!-- one button per failure -->
  </div>
  <div class="tb3-diagnostic-foot">Updated live as you edit</div>
</aside>
```

**Layout** — grid integration:

```css
#page-topology-builder-v3 .tb3-body.diagnostic-open {
  grid-template-columns: 200px 1fr 320px;
}
#page-topology-builder-v3 .tb3-body.diagnostic-open .tb3-rrail { display: none; }
#page-topology-builder-v3 .tb3-body.diagnostic-open .tb3-diagnostic { display: flex; }
#page-topology-builder-v3 .tb3-body.diagnostic-open.picker-open .tb3-picker,
#page-topology-builder-v3 .tb3-body.diagnostic-open.inspector-open .tb3-inspector { display: none; }
/* Scroll constraints — the v5.9.1 lesson, applied preemptively */
#page-topology-builder-v3 .tb3-diagnostic { min-height: 0; overflow: hidden; }
#page-topology-builder-v3 .tb3-diagnostic-list { min-height: 0; overflow-y: auto; }
```

**Motion (emil)** — all tokens from the locked TB v3 set:

| Surface | Motion | Notes |
|---|---|---|
| Drawer enter | `translateX(100%) → 0`, 220ms `cubic-bezier(0.23, 1, 0.32, 1)` | Custom ease-out, not stock `ease` |
| Drawer exit | Same easing, 150ms | Exit faster than enter |
| Pill press | `transform: scale(0.97)`, 100ms | Existing Phase 2 pattern |
| Row hover | `background: color-mix(in oklab, var(--tb3-accent) 6%, transparent)`, 150ms ease | `(hover: hover) and (pointer: fine)` gated |
| Row press | `transform: scale(0.98)`, 100ms | Tactile press feedback |
| Live update (row removed) | Opacity 1 → 0, 200ms then DOM remove | Avoid jarring instant removal |
| Reduced-motion gate | Slide + transforms killed; opacity-only fade preserved | Matches Phase 2 reduced-motion discipline |

**Failure row content** (stop-slop applied):

```html
<button class="tb3-diagnostic-row" data-device-id="<failedAt>">
  <div class="tb3-diagnostic-row-t">SRV-01 → WS-01</div>
  <div class="tb3-diagnostic-row-r">WS-01 has no default gateway.</div>
</button>
```

Reason strings — one sentence, names the device, names the problem. Never em-dash overload, never rule-of-three slop. The failure-reason taxonomy locks the prose:

| `reason` | Template |
|---|---|
| `no-ip` | "`<deviceLabel>` has no IP. Set one in the Inspector." |
| `no-gateway` | "`<deviceLabel>` has no default gateway." |
| `no-route` | "`<routerLabel>` has no route to `<dstSubnet>`." |
| `no-cable-path` | "No cable path reaches `<dstLabel>` from `<srcLabel>`." |
| `no-router-between` | "`<srcLabel>` IP `<srcCidr>` is on a different subnet from `<dstLabel>` (`<dstCidr>`). No router between them." |

**Click behaviour**: each row is a `<button>`. Click → `_selectDevice(row.dataset.deviceId)`. The existing Inspector wire takes over (slides Inspector out, pre-fills fields). Drawer stays open in parallel? **No** — Inspector and Diagnostic are mutually exclusive (the grid CSS enforces it). Clicking a row closes the drawer and opens Inspector for the failed device. Once the user fixes the IP and clicks back to the canvas (or hits Esc), they can re-open the drawer to see which failures remain.

**Wire-up**:
- `_renderCompletionPill()` adds a click handler on the pill that opens the drawer when `state.intent === 'lab'` and there are failures.
- New `_wireDiagnosticDrawer()` (called from `_renderWorkspace`): close button, ESC key (extends `_wireGlobalKeys`), row click.
- New exposures on the registration object: `_openDiagnostic`, `_closeDiagnostic`, `_renderDiagnosticDrawer`, all five pure functions (parseCidr, inSameSubnet, routeNextHop, computePath, computeReachability).

---

## Scenario IP back-fill

All 25 scenarios in `TB_V3_SCENARIOS` get config baked in so that loading them yields `GOALS MET` immediately.

**Subnet plan (locked):**

| Purpose | Range | Convention |
|---|---|---|
| Default LAN (single-subnet scenarios) | `192.168.10.0/24` | Gateway `.1`, endpoints `.10+` |
| Server subnet (when separated) | `192.168.20.0/24` | Same pattern |
| DMZ | `192.168.30.0/24` | Outer FW `.1`, inner FW `.254`, DMZ hosts `.10+` |
| VLAN 10 (router-on-stick, l3-svi) | `192.168.10.0/24` | Hosts `.10+` |
| VLAN 20 (router-on-stick, l3-svi) | `192.168.20.0/24` | Hosts `.10+` |
| Internet / ISP | `203.0.113.0/24` | RFC 5737 test-net |
| Cloud (VPC representative) | `10.100.0.0/24` | `.1` gateway, hosts `.10+` |
| P2P / Direct-Connect | `10.0.0.0/30` per link | Each link its own /30 |
| MPLS PE side | `10.0.X.0/30` per branch | One /30 per branch router |
| Multi-cloud transit | `10.200.0.0/30` | VPN gateway pair |

**Per-scenario authoring**: I (the controller, not a subagent) author each scenario's IPs inline. Verify after each category via `computeReachability(state, completion)` returns `complete: true` for the loaded state. Same 7-commits-per-category pattern as Phase 2.x. Stop at any scenario where reachability fails on first load — that means the auto-IPs are wrong, fix before committing.

**Validator scenario** (intentional broken-state, optional, Phase 3b candidate): a future scenario could intentionally ship with one config error to teach diagnostics. Not in Phase 3 scope.

---

## Testing strategy

| Layer | Surface | Approx count |
|---|---|---|
| Pure-fn fixtures (vm-sandbox) | parseCidr, inSameSubnet, routeNextHop, computePath, computeReachability | ~44 asserts |
| UAT structural guards | Scenarios carry IPs, switches have no IP, drawer DOM scoped, registration exposes pure fns, drawer scroll constraints present (v5.9.1 lesson tombstoned) | ~10 asserts |
| Playwright DOM tests | (18) drawer opens from pill click · (19) close button restores rail · (20) ESC closes drawer · (21) row click selects device + opens Inspector · (22) goals-met empty state · (23) live update — Inspector edit drops a failure row · (24) drawer scroll engages with many failures · (25) reduced-motion gate | 8 |
| Dogfood smoke HTML | `phase3-dogfood.html` — 10-step founder run covering open Free Build → drop device → set IP → break gateway → observe drawer → fix → goals met → load scenario → observe pre-filled config | 1 |

UAT delta: 6500 → ~6554 (≈+54). Playwright chromium 125 → 133.

**TDD discipline**: every pure-fn fixture is written BEFORE the implementation (Phase 2 Stage 1 pattern). The fixture fails first; the implementation makes it pass.

**Stop-slop applied to:** failure-reason templates (5 strings, locked above), drawer prose (eyebrow + title + foot copy), Inspector caption strings ("Layer-2 device — no IP configuration").

---

## Phase 1 / 2 / 2.x lessons folded in

1. **CSS Grid scroll gotcha** — diagnostic drawer applies `min-height: 0 + overflow: hidden` on the grid item AND `min-height: 0` on the inner scrollable list. Tombstoned: if either is missing, the drawer scroll regresses (the v5.9.1 founder-caught bug).
2. **CSS rev counter** — `TB3_CSS_REV` will bump `r7 → r8` for dev cache-bust.
3. **`_deleteSelected` exposure pattern** — `_openDiagnostic` / `_closeDiagnostic` exposed on the registration object preemptively so Playwright test 21 can drive the row-click → Inspector flow without simulating browser-native click bubbling.
4. **Live-verify before declaring done** — every drawer state change verified in the preview before commit (the v5.5.6 / v4.99.74 locked lesson).
5. **Dogfood-html as gate** — Stage 9 creates `phase3-dogfood.html` parallel to `phase1-dogfood.html` + `phase2-dogfood.html`.
6. **Picker auto-close pattern** — diagnostic drawer does NOT auto-close when a row is clicked, because clicking a row opens the Inspector which is mutually exclusive with the drawer anyway. The grid swap handles the transition.

---

## Ship strategy

Single feature branch `feat/tb-v3-phase3`. Stage commits per the implementation plan (deriving from this spec). Ship as **v6.0.0** — major version bump because the validator semantics change (cable-shape-only → cable-shape AND reachability), which is a behaviour change visible to existing Lab users on the 25-scenario catalog.

Fast-lane per ENVIRONMENT_STRATEGY (feature-module modification + scoped CSS + scenario data; no DB/auth/money; sw.js = universal CACHE_NAME bump from bump-version.js).

---

## Open questions resolved during brainstorming

| Decision | Locked value |
|---|---|
| Outcome | Validator with teeth (no interactive sim UI in Phase 3) |
| Reachability model | Subnet-aware (L3) — no MAC tables, no ARP cache, no DHCP |
| Config source | Hybrid — scenarios pre-fill, Inspector exposes for edit, Free Build auto-fills |
| Diagnostics surface | Drawer from completion pill (same slide-out mechanism as picker) |
| Scope cutoff | Engine + validator + Inspector IP fields + drawer + scenario back-fill. No Simulate modebar UI, no packet animation. |

---

## Self-review

- [x] **Placeholder scan** — no TBDs, no "decide later", no vague requirements.
- [x] **Internal consistency** — architecture, components, data flow, and validator integration line up. Drawer + Inspector mutual exclusion is consistent across both Sections (UI + click behaviour). The scenario back-fill subnet plan and the Inspector auto-fill rules agree.
- [x] **Scope check** — single feature branch, fits one implementation plan. Phase 3b items (Simulate UI, packet animation) explicitly carved out.
- [x] **Ambiguity check** — failure-reason taxonomy locked to 5 templates with stop-slop strings. Per-device IP assignment rule explicit. Validator return-shape extension named.

Spec is ready for user review.
