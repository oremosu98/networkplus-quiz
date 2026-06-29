---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# Topology Builder Revamp · Design Spec

| | |
|---|---|
| **Date** | 2026-05-20 |
| **Status** | Approved (design phase) · ready for plan |
| **Owner** | Founder (CertAnvil) |
| **Source** | Brainstorming session 17327-1779282193 |
| **Companion** | `.superpowers/brainstorm/17327-1779282193/content/*.html` (5 mockups: welcome, canvas-options, mode-organization, phase-rollout, phase1-mockup, osi-mode) |
| **Supporting skills** | taste-skill (routed to **dashboards**), emil-design-eng, stop-slop |

---

## 1. Motivation

v1 of the Topology Builder grew to ~14,600 LOC in `features/topology-builder.js` over a year of feature accumulation. v2 (the strangler-fig started at v5.0.3) shipped 8 modes through v5.3.0 but never reached parity. Both surfaces are currently live in the Net+ sidebar, splitting users between an over-stuffed v1 and an under-finished v2. Founder pain points: **ease of use** (discoverability suffered in v1; v2 felt incomplete) and **canvas size** (fixed 1800×1100 dims don't scale to modern displays; complex topologies hit walls).

This revamp scraps both v1 and v2 from the frontend and ships a fresh **v3** that earns the title of "true flagship drill" for Network+ exam prep. Built incrementally over 9 phases. Phase 9 retires the old code.

## 2. Scope

**In:**
- New feature module `features/topology-builder-v3.js` lazy-loaded via `_loadFeature('topology-builder-v3')`
- New page `#page-topology-builder-v3` with sidebar entry "Network Builder"
- Infinite canvas with pan / zoom / minimap (Figma-class)
- Three coexisting intents: **Free Build** · **Lab** (guided scenario) · **PBQ Practice** — selected via intent chip top-left, never a separate hub
- Five action modes in the modebar: **Design** · **Simulate** · **Trace** · **OSI** · **3D** (+ Export pinned right)
- Full lift-and-shift of v1's device palette catalog (Routers / Switches / Endpoints / Wireless / Security / Cloud-WAN)
- Scenarios catalog of ~20-25 topologies mapped to the N10-009 blueprint
- Forged-bronze editorial brand applied throughout (OKLCH tokens, Fraunces + Inter, hairlines, anti-slop)
- Removal of v1 + v2 in Phase 9

**Deferred (future phases beyond this spec):**
- Mobile drawer behavior — keeps the existing v4.99.48 desktop-only nudge pattern; revisit when mobile dogfood demands it
- Multi-user collaboration on the canvas
- Custom user-saved scenarios with cloud sync (current scope: local-only saves; cloud-store wiring is a Phase-9+ follow-up)
- Animated cable-routing optimisation pass beyond the v1 force-directed auto-layout

**Out:**
- **Security+ support — permanently.** Sec+ gets its own dedicated builder (a separate future spec, founder's call), NOT a multi-cert mode of v3. v3 is Network+ only, forever. Sidebar entry will be gated by `CURRENT_CERT === 'netplus'`.
- Real-time packet capture from a physical network (this is a teaching tool, not a sniffer)

## 3. Architecture

Three layers + the modebar lens.

```
┌─ PAGE SHELL ────────────────────────────────────────────┐
│  #page-topology-builder-v3 (lazy-loaded)               │
│  full-viewport takeover via                             │
│  html:has(#page-topology-builder-v3.page.active)        │
│  → hides #app-sidebar + #app-topbar                     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─ FEATURE MODULE features/topology-builder-v3.js ────────┐
│  IIFE, registers on window._certanvilFeatures.tb-v3     │
│  Exposes: openTopologyBuilderV3()                       │
│  State: tbv3State { devices, cables, viewport,          │
│                     intent, mode, zoom, pan }           │
│  Renders: workspace (strip / modebar / palette /        │
│           canvas / right-rail / status)                 │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─ MODES (lenses on the same canvas state) ───────────────┐
│  Design  → place / move / cable / configure             │
│  Simulate→ ping / ARP / DHCP packet animation           │
│  Trace   → per-hop OSI breakdown of a path              │
│  OSI     → reorganise canvas into 7 horizontal layer    │
│            bands; devices snap to layer they operate on │
│  3D      → Three.js render of the topology + OSI floors │
│  Export  → PNG / JSON / share link (Phase 1 includes    │
│            PNG only; JSON + share later)                │
└─────────────────────────────────────────────────────────┘
```

**Lazy-load pattern (proven 8× in v4.99.41+ extractions):** IIFE + window-exposure + `_loadFeature` shell helper. File at `features/topology-builder-v3.js`. Filename = feature key.

**State storage:** `STORAGE.TB_V3_DRAFT` (localStorage, namespace `nplus_tb_v3_draft`). Cloud-store sync follows the established Phase C′ pattern when added later.

## 4. Workspace layout

```
┌──────────────────────────────────────────────────────────┐
│ STRIP HEADER · 44px                                       │
│ § Net+ · N10-009  ·  Network builder.   2 devices │ ⚙    │
├──────────────────────────────────────────────────────────┤
│ MODE BAR · 40px                                           │
│ [● intent chip · Free Build ▼]  Design│Sim│Trace│OSI│3D ◀▶ Export │
├──────────┬──────────────────────────────────────┬────────┤
│          │                                      │        │
│ PALETTE  │              CANVAS                  │ R RAIL │
│ 200px    │              (infinite)              │  56px  │
│          │                                      │        │
│ Routers  │   ┌─────┐                            │  🔍    │
│ Switches │   │ R1  │──┐                         │  ▭     │
│ Endpts   │   └─────┘  └──┐                      │  ★     │
│ Wireless │              ┌─────┐                 │        │
│ Security │              │ SW1 │                 │        │
│ Cloud    │              └─────┘                 │        │
│          │                                      │        │
│          │  [zoom −][100%][+]    [minimap ▭]    │        │
│          │                                      │        │
├──────────┴──────────────────────────────────────┴────────┤
│ STATUS BAR · 28px                                         │
│ Free Build │ Design mode │ saved 2s ago │ space+drag·pan │
└──────────────────────────────────────────────────────────┘
```

- **Strip header**: `§ Net+ · N10-009` eyebrow (bronze) + Fraunces title `Network builder.` (period in bronze) + right-side meta (device count, settings)
- **Mode bar**: intent chip on the left in its own segment (180px min-width) + 5 action modes + Export pinned right. Active mode has a 2px bronze underline + faint accent tint background.
- **Palette** (200px, left): vertical scroll, v1's full device catalog grouped by category (Routers / Switches / Endpoints / Wireless / Security / Cloud-WAN). Drag to canvas. In OSI mode this becomes a layer-legend panel.
- **Canvas** (flex 1, infinite logical space): pan with `space + drag`, zoom with `scroll`, devices snap to a 40px grid, cables route as smooth Bezier paths.
- **Right rail** (56px, right): icon-only utility rail for Inspector / Scenarios picker / Coach. Phase 1 ships all locked except Inspector hook stub.
- **Status bar** (28px, bottom): current intent + mode + save state on the left, keyboard hints on the right (mono).

## 5. Intent system

Three intents, one always active. Selected via the chip top-left of the modebar. Switching intent prompts confirmation if the current canvas has unsaved changes.

| Intent | When | Canvas behaviour | UI surface |
|---|---|---|---|
| **Free Build** | Default on first open | Empty canvas. User drags any device. | Chip shows "Free Build" (no goal label). |
| **Lab** | Picked from scenarios catalog (Phase 2) | Canvas pre-loaded with scenario starting state. Devices + cables present. Goal panel pinned. | Chip shows "Lab · {scenario name}". Goal status pill (incomplete / passed) in right rail. |
| **PBQ Practice** | Picked from PBQ catalog (Phase 8) | Canvas pre-loaded with PBQ initial state + zones + timer. | Chip shows "PBQ · {N min remaining}". Submit button visible. |

Intent + mode are orthogonal. A user can be in a **Lab + Simulate** state (simulating packets through the lab's pre-built topology), or in **Free Build + OSI** (free-building while viewing the layer lens).

## 6. The 5 action modes

### 6.1 Design
The default. Place devices from the palette, move them on the canvas, draw cables between ports, configure individual device properties via an inspector drawer (right rail expands to ~340px when configuring).

### 6.2 Simulate
Animate live packet flow. Includes:
- **Ping** — ICMP request + reply, hop-by-hop animation
- **ARP** — broadcast request + unicast reply
- **DHCP** — full DORA (Discover / Offer / Request / Acknowledge) sequence
- Path auto-detection via routing tables + spanning tree topology
- Failures visualised inline (no route → red X at the device that drops; bad VLAN → ACL block animation)

### 6.3 Trace
Per-hop OSI breakdown of a chosen device-to-device path. User clicks source then destination. Trace mode walks the user through each hop with the OSI layers active at that hop called out (e.g., "Hop 2: SW1 — Layer 2 forwarding via MAC table"). Educational anchor for the cert exam.

### 6.4 OSI (NEW — see §10 for full detail)
Reorganises the canvas into 7 horizontal layer bands. Devices snap to the layer(s) they operate on. The single most-tested concept in N10-009 made visually concrete.

### 6.5 3D
Three.js render. Read-only camera around the topology. Includes the v1-favourite **OSI layer floors** (each layer rendered as a horizontal floor in 3D space, devices stacked on their layer), **VLAN floors**, and **subnet floors**. Lazy-imports Three.js on first 3D click (per the established TB v4.63.0 dynamic-import contract).

### Export (utility, pinned right)
PNG export day-one (Phase 1). JSON export + shareable link follow in Phase 6+.

## 7. Canvas system

**Infinite logical canvas** with **pan + zoom** + **minimap**.

| Property | Behaviour |
|---|---|
| Pan | `space + drag` from anywhere on the canvas |
| Zoom | `scroll` wheel (50% to 400%); zoom controls bottom-left of canvas (`−` / `pct` / `+`) |
| Grid | 40px snap, visible at all zoom levels; lines tinted `color-mix(in oklab, var(--text) 6%, transparent)` |
| Minimap | Bottom-right of canvas, 160×100px, shows viewport position + all device dots |
| Default zoom | 100% (1:1 logical to screen pixels) |
| Default viewport | Centred on `(0, 0)` of logical space |
| Origin marker | None — the canvas is featureless and infinite by design (Figma pattern) |
| Cable rendering | SVG Bezier paths with 2px stroke at the bronze accent |
| Device snap | 40px grid (matches gridline) |

Device coordinates are stored in logical-canvas space, never viewport-relative.

## 8. Device palette — lift-and-shift from v1

Phase 1 ships v1's full `TB_DEVICE_TYPES` catalog verbatim. Categories preserved:

- **Routers** · router, layer 3 router
- **Switches** · switch, layer 3 switch, hub
- **Endpoints** · desktop, laptop, server, smartphone, smart-tv, game-console
- **Wireless** · access point, wireless controller
- **Security** · firewall, IDS/IPS
- **Cloud & WAN** · cloud, internet, ISP modem, MPLS core, VPN gateway, load balancer

Each item drags from the palette to the canvas. Default device size: 76×76px. Each device exposes a single primary interface by default; additional interfaces auto-provision when cables are connected (the v4.48.0 `_tbMkCable` pattern, lifted from v1).

**OSI mode adaptation:** in OSI mode the palette becomes an info-panel listing what operates at which layer. Devices don't drag — they auto-snap based on their type.

## 9. Scenarios catalog (Phase 2 detail)

~20-25 topologies mapped to the N10-009 blueprint. Categories:

| Category | Sample scenarios |
|---|---|
| **Topology types** | Star · Mesh (full + partial) · Bus · Ring · Hybrid |
| **Architectures** | 3-tier hierarchical (core / distribution / access) · Collapsed core · Spine-leaf · SDN overlay |
| **WAN** | Site-to-site VPN (HQ + branch with IPsec) · Hub-and-spoke (multi-branch) · MPLS · SD-WAN · Full mesh WAN |
| **Cloud** | Single public-cloud VPC + on-prem · Multi-cloud (AWS + Azure) · Hybrid (on-prem + cloud) · CDN edge |
| **Wireless** | Infrastructure (BSS + ESS) · Wireless mesh · Ad-hoc · Roaming with controller |
| **Security** | DMZ / screened subnet · Screened host · Zero-trust segmented · Defense-in-depth layered |
| **VLAN / routing** | VLAN inter-routing (router-on-a-stick) · L3-switch inter-VLAN · OSPF area design · BGP multi-AS |

Each scenario carries:
- `id` (slug)
- `title` (e.g. "Hub-and-spoke WAN with branch routers")
- `category` (one of the 7 above)
- `objectiveRefs` (array of N10-009 objective numbers, e.g. `['1.6', '2.1']`)
- `startingState` (devices + cables + initial config)
- `brief` (1-paragraph why-this-matters)
- `examRelevance` (5-section: Overview / How it routes / Key devices / Key concepts / Exam relevance — following the v4.47.0 pattern)
- `completion` (Lab intent goal — what counts as "done"; verified by a v3 validator that lifts the v1 `tbDeepValidate` logic into the new schema)

Clicking a scenario in the catalog (right rail panel in Phase 2) loads its `startingState` onto the canvas and switches the intent chip to "Lab · {title}". Free Build remains accessible via the chip.

## 10. OSI mode — the new lens

Educational anchor for Network+ exam prep. Reorganises the canvas vertically into 7 layer bands (top to bottom: L7 → L1).

```
┌──────────────────────────────────────────────────────────┐
│  7  Application      data       │ [Web1]                  │
├──────────────────────────────────────────────────────────┤
│  6  Presentation     data       │                          │
├──────────────────────────────────────────────────────────┤
│  5  Session          data       │                          │
├──────────────────────────────────────────────────────────┤
│  4  Transport        segment    │ [LB1]                    │
├──────────────────────────────────────────────────────────┤
│  3  Network          packet     │ [R1]●  [FW1]    ← active │
├──────────────────────────────────────────────────────────┤
│  2  Data Link        frame      │ [SW1] [AP1]              │
├──────────────────────────────────────────────────────────┤
│  1  Physical         bits       │ [Cable]                  │
└──────────────────────────────────────────────────────────┘
```

**Band structure** (per layer):
- 88px-wide label column (left): layer number in Fraunces 22px (bronze) + layer name (Inter 800/uppercase, 9.5px) + PDU label (mono dim)
- Right: device floor with 40px snap grid (faint), devices auto-arranged horizontally on their layer

**Multi-layer devices** (router L3, firewall L3-L7, etc.) show a vertical bronze strap spanning their range. The primary card sits on the device's "lowest" operating layer.

**Active band**: when a device is selected, its layer band tints with `color-mix(in oklab, var(--accent) 6%, transparent)`. The label column tints stronger.

**Click to highlight**: clicking a device in OSI mode highlights its band(s); double-clicking opens the inspector with the layer pre-explained.

**Single accent (no rainbow)**: the bands themselves carry the structure. Per brand discipline, no rainbow OSI colour-coding. The layer number's typographic weight + the active-band tint do the work.

## 11. Brand application

**Style routing (via taste-skill):** `dashboards` primary + `editorial-premium` typographic layer. Configuration: DESIGN_VARIANCE 4 · MOTION_INTENSITY 4 · VISUAL_DENSITY 7 (the dashboards baseline).

**Tokens (locked, OKLCH, from `brand/BRAND.md`):**

| Role | Light | Dark |
|---|---|---|
| `--bg` | `oklch(0.975 0.007 85)` warm ivory | `oklch(0.16 0.009 275)` deep charcoal-blue |
| `--surface` | `oklch(0.992 0.004 85)` | `oklch(0.20 0.009 275)` |
| `--text` | `oklch(0.22 0.015 280)` ink | `oklch(0.96 0.012 85)` |
| `--accent` | `oklch(0.50 0.155 55)` deep bronze | `oklch(0.80 0.155 64)` bright bronze |
| `--pass` | `oklch(0.52 0.13 150)` | `oklch(0.74 0.150 152)` |
| `--warn` | `oklch(0.62 0.14 70)` | `oklch(0.78 0.140 75)` |
| `--border` | `oklch(0.86 0.008 85)` | `oklch(0.30 0.010 280)` |

**Tinting:** `color-mix(in oklab, var(--accent) 9%, transparent)` — never hardcoded rgba.

**Typography:**
- **Fraunces** (display, opsz 9..144 · wght 600 locked · letter-spacing -0.01 to -0.03em) — strip title, OSI layer numbers, layer names, scenario titles
- **Inter** (UI, wght 400-800) — every other UI element, uppercase eyebrows at 10-11px / 800 / 0.08-0.14em letter-spacing
- **Mono** (ui-monospace, Menlo) — keyboard hints, device IDs, timestamps, OSI PDU labels (data / segment / packet / frame / bits)
- Type scale: `--t-1:12, --t0:14, --t1:18, --t2:23, --t3:30, --t4:42`

**Motion (emil-design-eng compliant):**
- Easing: literal `cubic-bezier(0.16, 1, 0.3, 1)` (NOT a CSS var because the page is portaled — see v5.5.4 lesson)
- Mode-switch transition: 220ms
- Pan / zoom: 0ms (direct manipulation, no easing)
- Device select highlight: 160ms
- Cable draw-in: 320ms
- OSI band tint on selection: 200ms
- Reduced-motion gate: `@media (prefers-reduced-motion: reduce)` neutralises all timed transitions
- Press feedback: `:active { transform: scale(0.97); }` on every interactive button

**Anti-slop discipline (stop-slop, locked from `brand/BRAND.md`):**
- ✗ No emoji decoration
- ✗ No purple (`#5b4fdb` / `#7c6ff7` dead)
- ✗ No card-spam (no 4+ identical soft-shadow tiles)
- ✗ No em-dashes (use `·` for separators)
- ✗ No throat-clearing prose
- ✗ No vague declaratives
- ✗ No gradient backgrounds on chrome
- ✗ No hardcoded hex
- ✗ No descriptive-only cards — every card tells the user what to do next
- ✗ No animation on data without a data role

## 12. Phase rollout

Nine phases. Each independently shippable. Phase 1 is the MVP. Phase 9 retires v1 + v2.

| Phase | Title | Goal |
|---|---|---|
| **1** | Canvas foundation (MVP) | Infinite canvas + pan/zoom/minimap + Design mode + full palette + Free Build intent + save state + PNG export. **No scenarios, no other modes.** |
| **2** | Scenarios catalog | ~20-25 N10-009 topologies. Lab intent introduced. Right-rail scenarios picker live. |
| **3** | Simulate mode | Ping + ARP + DHCP packet animation. |
| **4** | Trace mode | Per-hop OSI breakdown of a chosen path. |
| **5** | OSI mode | 7 horizontal layer bands. Devices snap to layer. The new educational lens. |
| **6** | 3D View | Three.js read-only render with OSI / VLAN / subnet floors. Lazy-import contract from v1. |
| **7** | AI Coach | Tier C teacher (claude-sonnet-4-6). Lab-aware feedback. Cached per cert+lab+step. |
| **8** | PBQ intent | Timed exam-style drills. ~5-8 curated PBQs to start. Auto-grading + review. |
| **9** | Cutover · retire v1 + v2 | Delete sidebar entries, delete `features/topology-builder.js` (~14.6K LOC) and `features/topology-builder-v2.*` (~3.5K LOC). UAT tombstones lock the deletion. Migration tool converts old saved topologies if any users have them. |

**Phase ordering rationale:** Phase 1 is the spine — everything else depends on the canvas + palette + Design working. Phase 2 (scenarios) is next because it unlocks the Lab intent and immediately makes v3 feel content-rich. Phases 3-5 (Simulate / Trace / OSI) build the educational depth. Phase 6 (3D) is visually impressive but depends on the topology already feeling stable. Phase 7 (Coach) needs labs (Phase 2) to scope feedback. Phase 8 (PBQ) is the highest-effort intent and benefits from everything else being in place. Phase 9 cleans up.

## 13. Testing

Each phase ships with:
- **Behavioural fixtures** for the pure functions (vm-sandbox pattern proven on the bug-report popup ship)
- **Playwright DOM tests** for the interactive surfaces (open / close / mode switch / canvas pan-zoom / palette drag / etc.)
- **UAT structural guards** (tombstones for the old v1 + v2 surfaces — strengthen as Phase 9 approaches)
- **Manual dogfood smoke** before each phase ships (8 steps minimum, founder-run on localhost)

Cross-cutting test concerns (per `feedback_data_safety_discipline.md`):
- All localStorage writes during testing happen on `localhost:3131` only — NEVER on prod (the v4.81.x rule)
- Cross-cert leak filter: `_isCurrentCertTopic()` applied throughout (per v5.5.7 pattern)

## 14. Open questions — all resolved 2026-05-20

| # | Question | Resolution |
|---|---|---|
| Q1 | Right-rail width in Phase 1 — 56px (icon-only) or 200px (icon + label list)? | **56px icon-only collapsed default + contextual expand.** Inspector slides out to 340px on device select. Scenarios picker (Phase 2) slides out to 320px panel. Coach (Phase 7) slides out to 380px. Gives the canvas the most pixels by default and the rail's content the most room when it matters. |
| Q2 | Save state per-cert or global? | **Global single key** `STORAGE.TB_V3_DRAFT` → `nplus_tb_v3_draft`. v3 is Net+ only (see §2 Out). No cert namespace needed. |
| Q3 | Cable routing algorithm — auto-Bezier (Phase 1) vs orthogonal? | **Auto-Bezier locked.** Smooth curves match the dashboards aesthetic, work at any zoom, and read more natural than right-angle routing for organic network layouts. Orthogonal is a Phase 6+ polish if dogfood ever asks for it. |
| Q4 | OSI mode interaction — read-only view OR editable on bands? | **Read-only.** Edits go back to Design mode. Keeps OSI mode focused on its job (the layer lens) without overloading. |
| Q5 | 3D View — keep all v1 OSI/VLAN/subnet floors OR start with just OSI? | **All three floors kept.** OSI / VLAN / subnet — founder-stated favourites from v1. Ships in Phase 6. |
| Q6 | Migrate v1 saved data in Phase 9? | Two things to clarify: (a) the **preloaded scenarios catalog** (v1's `TB_SCENARIOS` array — 16 baked-into-code scenarios) is **not migrated** — Phase 2 authors new ones aligned to the N10-009 blueprint with the 7-category structure; (b) any **user-saved free-build topologies** (`STORAGE.TOPOLOGIES` localStorage key) get a one-time migration tool that reads them, translates to v3 schema, offers import. If the key is empty/missing at Phase 9, skip the migration entirely. |

All resolutions are locked. Plan author treats these as decided.

## 15. Acceptance criteria

Each phase has its own acceptance gate. Across the whole revamp:

- [ ] Page `#page-topology-builder-v3` renders cleanly for Network+. Sec+ users see no Network Builder sidebar entry (gated by `CURRENT_CERT === 'netplus'`). Their builder is a separate future spec.
- [ ] Lazy-load via `_loadFeature('topology-builder-v3')` works on cold session + hot session
- [ ] Full-viewport takeover hides `#app-sidebar` + `#app-topbar` when `#page-topology-builder-v3.page.active`
- [ ] All 5 action modes switch cleanly (no state loss, no flicker, no console errors)
- [ ] All 3 intents work (Free Build day-one, Lab Phase 2, PBQ Phase 8)
- [ ] Canvas pan + zoom + minimap behave as specified at every zoom level 50% → 400%
- [ ] Device palette ships v1's full catalog day-one
- [ ] Reduced-motion gate honoured (`prefers-reduced-motion: reduce`)
- [ ] Brand discipline: zero emoji decoration, zero hardcoded hex, zero em-dashes, zero purple, single bronze accent
- [ ] No `STORAGE.GH_TOKEN` regression — existing bad-quiz reporter + bug-report popup still work
- [ ] Phase 9: `features/topology-builder.js` + `features/topology-builder-v2.*` removed. Sidebar entries removed. UAT tombstones lock the removals. Old `STORAGE.TOPOLOGIES` migrated.
- [ ] No secrets in source. localStorage-only state. No DB / auth / money / SW change (fast-lane per ENVIRONMENT_STRATEGY)

## 16. Implementation handoff notes

For the plan author (writing-plans skill):

- **Feature module pattern**: lazy-load via `_loadFeature('topology-builder-v3')`. File at `features/topology-builder-v3.js`. IIFE + `window._certanvilFeatures['topology-builder-v3']`. Filename matches feature key. Same contract proven 8× in v4.99.41+ extractions.
- **CSS**: scope all new styles to `#page-topology-builder-v3` in a new `features/topology-builder-v3.css` (loaded via `_ensureCss()` from the feature module — matches the v2 pattern). DO NOT touch `styles.css`. DO NOT touch `dg-system.css` unless adding global tokens that don't exist yet.
- **Pre-commit hook**: `app.js` / `index.html` / `styles.css` edits trigger UAT + CLAUDE.md freshness check. v3 page entry in `index.html` will need a same-commit CLAUDE.md row update (the bug-report ship established this pattern).
- **Concept mockups**: phase 1 + OSI mode mockups under `.superpowers/brainstorm/17327-1779282193/content/`. Implementation should be visually identical at the brand-token level.
- **Strangler-fig discipline**: ship v3 cleanly alongside v1 + v2 until ALL of Phases 1-8 are shipped + dogfooded. Phase 9 is the cutover (delete v1 + v2 files + sidebar entries). Don't delete v1 / v2 mid-build — they remain live in the sidebar throughout the rollout so users always have a fallback.
- **Branch discipline**: feature branch only (`feat/tb-v3`). No version-bump, no PR, no main push until founder gives the ship signal per phase.
- **Data-safety**: ALL localStorage testing on `localhost:3131`. NEVER prod via MCP `javascript_tool`. The v4.81.x rule is non-negotiable.
- **Per-phase UAT**: each phase adds structural guards (topbar entry, lazy-load contract, mode/intent enums, etc.) without breaking earlier phases' guards. Phase 9 tombstones the v1 + v2 functions.
- **Dogfood discipline**: 8-step manual smoke before each phase commit. Live Chrome session, real device drag, real packet animation, no shortcuts.
