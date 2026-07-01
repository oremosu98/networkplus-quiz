---
up: "[[Drills MOC]]"
type: spec
status: active
cert: netplus, secplus
updated: 2026-06-30
tags: [spec, drill, pbq]
---
# Diagram + Incident Response + Defense in Depth — Sim Lab PBQ Design Spec

**Date:** 2026-06-30
**Status:** Approved design (grilled via grill-with-docs), pre-implementation
**Builds on:** [[2026-06-23-sim-lab-pbq-drill-design]] (the Sim Lab PBQ engine this extends)
**Platforms:** Desktop web · Safari/WebKit · iOS Capacitor — every requirement applies to all three.
**Origin:** A real Network+ exam PBQ the founder sat — a drawn office network (devices, VLAN placements, given Network ID + subnet mask + CLI) where you (1) diagnose what's wrong via MCQ dropdowns, then (2) reconfigure each device via dropdowns. Identified as the missing PBQ archetype.

---

## 1. Summary

Three new **Sim Lab scenario archetypes** built on **one shared engine**:

- **Diagram PBQ (Net+):** read a *given* network diagram, **diagnose** the misconfiguration and **reconfigure** the devices — all by **selecting from dropdowns** (no freeform canvas, no live CLI).
- **Incident Response PBQ (Sec+):** read a **visual** incident (attack timeline and/or the network "under attack"), then **sequence the response** and **pick the correct action per phase**.
- **Defense in Depth PBQ (Net+ AND Sec+):** read a **layered-defense diagram** (nested frames = layers around the core, gap layers flagged), **diagnose** the missing/weak layer and **add the correct control at each layer** by dropdown. Cross-cert: Net+ is network-layer focused (DMZ, segmentation, IDS/IPS); Sec+ is deeper (endpoint, data, identity layers + a control-type classification).

The engine is identical; only the **reference asset** (the thing you look at) and the **content** differ. This is a *co-designed* set — none is a fast-follow afterthought; the engine is built generic from day one.

**Explicitly NOT this build** (still deferred per the Sim Lab spec §10): a live CLI terminal, a clickable router GUI, or a freeform drag-canvas topology builder. The candidate **reads** a rendered diagram and **answers by selection**.

---

## 2. The shared engine (what's genuinely new)

A Diagram/IR PBQ = one Sim Lab **Scenario** (reuses scenario/modes/gating/session chrome) with exactly three new pieces of surface area:

1. **A pluggable visual `reference` asset** — rendered from structured data, not hand-drawn:
   - `network` — the network diagram (devices, VLAN/zone placement, given IPs/masks/gateways, links). **Shared by both certs.**
   - `network` + **incident overlay** — same renderer, plus per-device `state: clean | affected | compromised` and attacker-path arrows (Sec+).
   - `timeline` — a visual **attack timeline**: a horizontal strip of stages (icon + label + severity), e.g. phishing → malware → lateral movement → exfiltration (Sec+).
   - `layered` — a **defense-in-depth diagram**: nested frames (perimeter → inner layers → core/data) rendered from a layer list; each layer carries its control or is flagged as a missing/weak layer (Net+ and Sec+).
2. **One new step type — `configure`** — N labelled slots, each with its own dropdown of options and its own correct answer.
   - **1 slot** = the **Diagnose** phase ("What's wrong?").
   - **N slots** = the **Reconfigure** phase (one dropdown per device) / IR "correct action per phase."
3. **The fidelity validator + two-agent authoring gate** (§6).

Reused unchanged from Sim Lab: Practice/Exam modes, free 1/day + Pro gating & metering, session UI, the `order` step (sequence the IR response) and the `analyze` step (spot the clue in logs).

---

## 3. Data model

```
Scenario {
  ...existing Sim Lab Scenario fields...
  assets: {
    reference: NetworkModel | TimelineModel      // NEW — the visual the candidate reads
    logs?, table?, config?                        // existing supporting evidence
  }
  steps: Step[]                                   // diagnose (configure×1) + reconfigure (configure×N)
                                                  // IR may use order + configure + analyze
}

NetworkModel {                                    // rendered to a themed SVG diagram
  devices: { id, label, type, zone/vlan, ip?, mask?, gateway?, x, y,
             state?: 'clean'|'affected'|'compromised' }[]   // state = IR overlay
  links:   { from, to, kind?: 'normal'|'attack-path' }[]
  given:   { networkId?, mask?, cli?: string[] }            // READ-ONLY reference
}

TimelineModel {                                   // rendered to a visual attack strip
  stages: { id, icon, label, time?, severity }[]
}

ConfigureStep {
  type: 'configure'
  slots: { id, deviceId?, label, options[], answer }[]      // each slot scored independently
}
```

The **diagram is rendered from the model** — there is no separate hand-drawn image that could disagree with the data (this is what makes fidelity tractable, §6).

---

## 4. Interaction & scoring

- **Diagnose** = `configure` with one slot. **Reconfigure** = `configure` with N slots.
- **Per-slot partial credit** (deliberate, scoped deviation from the Sim Lab spec's all-or-nothing rule): for the `configure` type the natural scored unit is the **slot**, so each slot scores independently and the step score is the slot average. This matches real CompTIA partial credit and is far more instructive. Diagnose (1 slot) is all-or-nothing by definition. (Other Sim Lab step types keep their existing all-or-nothing scoring.)
- **IR** additionally reuses `order` (sequence the response: contain → eradicate → recover) and optionally `analyze` (tap the suspicious log line).

---

## 5. Visuals & cross-platform (the biggest feasibility risk — resolved)

**Decouple the picture from the answer surface.**
- The **reference visual is read-only** — a zoomable/pannable themed SVG. The candidate never operates controls *on* it.
- **Answers live in a separate list** — each row labelled by its device ("Switch SW1 → [▾]"), with a "locate on diagram" affordance that highlights that device.
- **Desktop:** diagram + dropdown list **side-by-side**. **Mobile:** **stacked** (diagram on top, collapsible/zoomable; list below).

Two things this buys us:
1. **Native `<select>` dropdowns** → the iOS native wheel picker → accessible, and it **dodges the WebKit touch-drag bug class** the drag-based types had to fight.
2. The diagram is **non-interactive**, so there is no "drag tiny things on a phone" problem.

**Accepted trade-off:** the diagram is a **clean logical layout** (clear, themed, reflowable) — **not** a pixel-faithful reproduction of CompTIA's exact drawing. Good enough to diagnose from.

Inherit the Sim Lab cross-platform rules: `min-h-[100dvh]`, no layout shift on keyboard open, single-column reflow under `md`, `prefers-reduced-motion`, iOS Pro gate via IAP.

---

## 5b. Defense in Depth archetype (Net+ + Sec+)

Defense in depth is a cross-cert objective (Net+ N10-009 Domain 4 · Sec+ SY0-701 Domain 3) and rides the engine with **no new interaction type** — it reuses `diagnose` + `configure` over the new `layered` reference asset.

- **Visual (`layered`):** nested rounded frames = layers around the core (perimeter → … → data). Present layers carry their control; a missing/weak layer is flagged with a red dashed marker; exposed assets are flagged red. Reads on mobile; the gap is obvious.
- **Net+ version:** network-layer focused — one missing layer (e.g. a public server on a flat LAN with no DMZ); ~3 configure slots (DMZ placement, VLAN segmentation, IDS/IPS).
- **Sec+ version (deeper):** the "hard shell, soft center" failure — a strong perimeter around a hollow interior; 4 configure slots (endpoint EDR/hardening, data encryption+DLP, identity MFA+least-privilege) **plus a control-type classification slot** (technical/managerial/operational/physical · preventive/detective/compensating).
- **Validation:** doctrine, not math (like IR) — a few deterministic checks (is every layer covered?), but correctness rests on the **two-agent authoring gate** + curated bank.
- **Concept mockups (approved):** `mockups/defense-in-depth-netplus-concept.html` · `mockups/defense-in-depth-secplus-concept.html`.

---

## 6. Fidelity & validation — the trust model

A PBQ with a wrong/ambiguous answer is worse than no PBQ (Sim Lab spec §11). The two certs sit at **different points on the auto-validatable spectrum**, so the engine is shared but the **content pipelines diverge**:

### Layer 1 — Deterministic fidelity validator (Net+ only; math)
Network correctness is computable. Code checks, *before* any scenario reaches a candidate, that: IP ∈ its VLAN's subnet for the mask, gateway ∈ subnet, no duplicate IPs, no overlapping subnets, mask large enough for host count, VLAN membership consistent, and that the **"correct" reconfigure answer actually fixes the flagged problem** (re-run the checker on the fixed state). Any logically-wrong scenario is auto-rejected. **IR is doctrine, not math** — this layer mostly does not apply (except the fixed IR lifecycle order, which *is* checkable).

### Layer 2 — Two-agent authoring consensus gate (BOTH certs — HARD RULE)
Every authored scenario (Net+ and Sec+) must be validated by **two agents that must AGREE**:
- **Agent A — Network Engineer / network professional:** technical correctness (network realistic, misconfig real, fix correct, IR response technically sound).
- **Agent B — CompTIA Examiner:** exam fidelity (maps to the CompTIA objective/blueprint, exam-realistic, the marked-correct answer is what CompTIA would accept, plausible distractors, appropriate difficulty).

They must agree on the **authoring** and on any **edits/fixes** when a scenario is wrong. A scenario only enters the bank after **both agree**. This is the primary correctness gate for IR (where there is no math validator) and an extra gate on top of Layer 1 for Net+.

### Layer 3 — Human spot-check
Founder review of the seed banks before launch (first impression must be correct).

---

## 7. Generation strategy & bank sizes

**Ship on a curated bank; architect for parametric** (Net+ only).

- **Net+:** launch with **~15–20 hand-checked seed scenarios** (Layer 1 + Layer 2 validated). Then scale via **parametric templates** — hand-authored skeletons with constraints, instantiated to concrete IPs/VLANs at runtime, where the deterministic validator **guarantees every instance is correct** → infinite variety, zero fidelity risk. Build the data model + validator so this is a drop-in upgrade.
- **Sec+ IR:** **≥ 20 hand-checked scenarios at launch**, authored as a **coverage matrix** (≈6–8 attack archetypes — phishing→malware, ransomware, insider, exfiltration, lateral movement, DDoS, web-app, compromised creds — × IR lifecycle emphasis), **growing to ~30–40**. IR does **not** auto-scale (doctrine, not math); the bank grows by authoring through the two-agent gate. Do not live-generate IR.

---

## 8. Build hard rules (non-negotiable for this build)

1. **Mockups ARE the build.** Every visual surface (the diagram, the timeline, the dropdown list, the result screen) is built as a **faithful lift** of an approved `mockups/*-concept.html`. Mockups come first and are the build target.
2. **4-stage visual pass — load and run all four, in order**, for every end-user visual: **(1) /design-taste-frontend → (2) /emil-design-eng → (3) /humanizer → (4) /marketing-psychology.**
3. **Two-agent authoring consensus** (§6 Layer 2) — network-engineer + CompTIA-examiner must agree on every scenario and every edit.
4. **Cross-platform parity** — Desktop, Safari/WebKit, iOS Capacitor, identical (§5).

---

## 9. Placement, gating, rollout

- **Placement:** new scenario archetypes **inside Sim Lab** — not a new top-level drill. Entry via the existing Sim Lab card on the Drills page.
- **Gating:** reuse Sim Lab's free 1/day + Pro-unlimited model and metering as-is.
- **Cert rollout:** Net+ Diagram PBQ first (concrete, math-validatable). Sec+ IR PBQ co-designed and built on the same engine. A+ later (no VOC yet). Microsoft/AWS certs: not rendered (no PBQs).

---

## 10. Open implementation items

- The exact `NetworkModel` device-type set + SVG rendering (reuse/extend the still-live `renderTopology()` where useful).
- Exam-mode timer budget for diagram scenarios (they read slower than text PBQs).
- Icon set for `timeline` stages (reuse `design/svg-icons/`).
- Parametric-template constraint language (Net+ phase 2).
- The two-agent gate's operational form (parallel agents → consensus, mirroring the `review-feature` pattern) and where the authored banks live per cert.

---

## 11. Related
[[2026-06-23-sim-lab-pbq-drill-design]] · [[2026-06-25-decision-lab-seed-authoring-contract]] · [[Drills MOC]] · [[CONTEXT|Domain glossary]]
