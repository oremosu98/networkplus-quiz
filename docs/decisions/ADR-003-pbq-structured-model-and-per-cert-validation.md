---
up: "[[Decisions MOC]]"
type: decision
status: active
cert: netplus, secplus
updated: 2026-06-30
tags: [decision]
---
# ADR-003 — Diagram/IR PBQs: structured model + per-cert validation strategy

- **Status:** Accepted
- **Date:** 2026-06-30
- **Decider:** Founder (grilled via grill-with-docs)
- **Design ref:** [[2026-06-30-diagram-and-incident-response-pbq-design]]
- **Extends:** [[2026-06-23-sim-lab-pbq-drill-design]]

## Context

A real Net+ exam PBQ (diagram → diagnose → reconfigure) was identified as the missing PBQ archetype, with a Sec+ Incident Response analog wanted alongside it. The core risk (Sim Lab spec §11) is a scenario with a wrong/ambiguous answer punishing the student for the *generator's* error. The design had to choose how the diagram is represented and how answers are guaranteed correct — across two certs with very different validatability.

## Decision

**1. The visual is rendered from a structured model, never hand-drawn.**
A `network` (and `timeline`) **model** is the source of truth; the engine renders the diagram from it. The diagram therefore *cannot* disagree with the data — fidelity collapses to "is the model sound?"

**2. Validation strategy is per-cert, because the two certs differ in kind:**
- **Net+ = math.** A deterministic **fidelity validator** (subnetting/CIDR/VLAN) auto-rejects any logically-wrong scenario and verifies the "correct" answer actually fixes the flagged fault. This unlocks **parametric, infinitely-scalable** generation later.
- **Sec+ IR = doctrine.** No math validator is possible. Correctness rests on a **curated, human/expert-authored bank** gated by **two agents that must agree** — a *network engineer* (technical correctness) and a *CompTIA examiner* (exam fidelity). This two-agent consensus gate also runs on Net+, on top of the math validator.

**3. Ship on a curated bank; architect for parametric.**
Net+ launches with ~15–20 validated seeds then auto-scales; IR launches with ≥20 coverage-matrixed scenarios growing to ~30–40 and stays curated.

**4. One shared engine, two archetypes.**
Both certs are new **Sim Lab** scenario types sharing a `configure` step (per-slot scored dropdowns) and a pluggable visual reference; the network diagram is a **shared** visual (Net+ fixes it; Sec+ shows it under attack).

## Consequences

- The data model + validator are a foundational, **hard-to-reverse** commitment — everything (rendering, dropdown binding, parametric generation, scoring) depends on the network being structured data.
- Content production **diverges by cert**: Net+ is cheap and scalable; IR is deliberately handcrafted and capped by authoring throughput. Roadmap and effort estimates must reflect this asymmetry.
- The two-agent consensus gate becomes a **standing authoring requirement** (see memory rule; mirrors the `review-feature` multi-agent pattern).
- Per-slot partial credit for `configure` is a scoped deviation from the Sim Lab spec's all-or-nothing scoring.

## Rejected alternatives

- **Pre-drawn static images** — not AI-generatable, can't bind dropdowns to regions, doesn't scale or reflow on mobile.
- **Live runtime AI generation for both certs** — too high a blast radius; for IR, uncheckable.
- **Net+ first, IR as a later fast-follow** — rejected in favour of co-designing the shared engine so IR drops in without a rebuild.
- **All-or-nothing scoring on `configure`** — punishing and less instructive for multi-device steps.

## Revisit trigger

Revisit if (a) a math-like validator for some IR sub-domain becomes feasible (allowing IR parametric scaling), or (b) the parametric Net+ generator proves so reliable that the per-scenario two-agent gate can be sampled rather than exhaustive.

## Related
[[2026-06-30-diagram-and-incident-response-pbq-design]] · [[ADR-001-m5-supabase-session-cookies]] · [[ADR-002-rbac-admin-surface]] · [[Decisions MOC]]
