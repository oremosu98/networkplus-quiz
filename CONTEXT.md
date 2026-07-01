# CertAnvil — Domain Glossary

Canonical language for the CertAnvil cert-study app. This file is a glossary only — no implementation detail. Add terms as they are resolved in design discussions.

## Drills & PBQs

**Sim Lab**:
The PBQ (Performance-Based Question) drill — an engine of AI-generated multi-step "scenarios" covering several interaction types, in Practice and Exam modes. The home for all PBQ practice.
_Avoid_: "the sim", "PBQ drill" (use Sim Lab)

**Decision Lab**:
The cloud-cert scenario decision drill. Still live in prod.

**Diagram PBQ** _(provisional name — concept under design 2026-06-30)_:
A Sim Lab PBQ where the candidate reads a **static, given** network diagram and answers **entirely by selection** (dropdowns) — never by dragging devices, drawing cables, or typing CLI. Has two answer phases: a **Diagnose** phase (identify the misconfiguration) and a **Reconfigure** phase (choose the correct configuration per device). The CLI / Network ID / subnet mask shown are read-only reference, not a live terminal.
_Avoid_: "topology builder" (removed drill), "network sim", "CLI sim"

**Diagnose phase**:
The step of a Diagram PBQ where the candidate identifies what is *wrong* with the shown network by selecting from option(s).

**Reconfigure phase**:
The step of a Diagram PBQ where the candidate selects the *correct* configuration for each relevant device from per-device options.

**Network model**:
The structured JSON description of a Diagram PBQ's network (devices, VLAN/zone assignments, given IPs/masks/gateways, links). The visual diagram is **rendered from** this model, so the diagram cannot disagree with the data.

**Fidelity validator**:
Deterministic code (subnetting/CIDR/VLAN math + best-practice rules) that checks a Network model is logically sound — the flagged misconfiguration is real, and the "correct" answer actually fixes it — *before* a scenario reaches a candidate. The safeguard that makes AI-drafted scenarios trustworthy.

**Configure step**:
A Sim Lab step type of N labelled slots, each with its own dropdown of options and its own correct answer. One slot = the Diagnose phase ("what's wrong?"); N slots = the Reconfigure phase (one dropdown per device). The shared new interaction type for both Diagram and Incident Response PBQs.

**Incident Response PBQ** _(Security+ application of the same engine — concept under design 2026-06-30)_:
A Sim Lab PBQ for IR/recovery. Reference is **visual**: an **Attack timeline** and/or the **Network model rendered "under attack"** (compromised/affected device states + attacker-path arrows — same renderer as Diagram PBQ, different state). Answered with the existing `order` step (sequence the response) + `configure` step (correct action per phase) + optional `analyze` (spot the clue). No new interaction type.

**Attack timeline**:
The signature visual IR reference — a rendered horizontal strip of attack stages (icon + label + severity), e.g. phishing → malware → lateral movement → exfiltration. The IR analog of the network diagram.

**Defense in Depth PBQ** _(third archetype on the same engine — Net+ AND Sec+, concept approved 2026-06-30)_:
A Sim Lab PBQ where the candidate reads a **layered-defense diagram** (the `layered` reference: nested frames = layers around the core, with missing/weak layers flagged), then **diagnoses** the gap and **adds the correct control at each layer** by dropdown. Reuses `diagnose` + `configure` (no new interaction type). Net+ = network-layer focused (DMZ, segmentation, IDS/IPS); Sec+ = deeper (endpoint/data/identity layers + a control-type classification). Doctrine-curated like the IR PBQ.

**Network model (shared visual)**:
The structured network is used by BOTH certs — Net+ renders it to *fix a misconfig*; Sec+ renders it *mid-attack* (incident overlay) to *respond*. One renderer, different state.

## Removed (tombstones — do not reintroduce as live without explicit decision)

**Topology Builder** · **Subnet Trainer** · **ACL PBQ**:
Former standalone drills, removed from prod. Some orphaned code/markup may remain (e.g. `page-acl-pbq`, `submitTopology()`); these are dead, not live features.
