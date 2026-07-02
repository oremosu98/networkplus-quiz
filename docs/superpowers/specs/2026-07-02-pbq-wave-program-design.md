---
up: "[[Drills MOC]]"
type: spec
status: active
cert: netplus, aplus-core1
updated: 2026-07-02
tags: [spec, drill, pbq, design]
---
# PBQ Archetype Expansion — Wave Program + Wave 1 Design

> Successor to the shipped v7.61.0 archetypes (Diagram, Incident Response, Defense in Depth — [[2026-06-30-diagram-and-incident-response-pbq-design]]). Source research: [[../planning/2026-07-01-pbq-archetype-research-REPORT|PBQ archetype market research]] (Net+ + A+ Core 1 complete; Sec+ + A+ Core 2 pending — see the Desktop handoff).

**Decision basis (founder, 2026-07-02):** build ALL 11 researched archetypes — the Net+ five PLUS the Firewall Rule Table (adjudicated IN alongside Cable-Test), and the A+ Core 1 five. Slice by renderer family into 4 sequential waves; each wave is a complete lifecycle (mockups → spec → plan → build → gate → ship) and is LIVE before the next starts. Start Wave 1 immediately; the pending Sec+/A+ Core 2 research folds into later waves.

## The wave map

| Wave | Archetypes | New plumbing |
|---|---|---|
| **1** | Wireless Deployment Panel (Net+) · Firewall Rule Table (Net+) · SOHO Router Setup Console (A+ C1) | none — existing network renderer + configure/order/analyze |
| **2** | Guided CLI Fault Isolation (Net+) · Network Discovery Audit (Net+) · Command-Output Evidence Triage (A+ C1) | ONE terminal/output-excerpt panel (+ progressive reveal); design must anticipate future Sec+ log-analysis reuse |
| **3** | Switch Port-Map Grid (Net+) · Cable-Test Wiremap (Net+) · Two-Client PC Build Spec-Off (A+ C1) · RAID Workbench (A+ C1) | port/faceplate panel · wiremap panel · parts/slots panel (RAID reuses slots if possible) |
| **4** | Laser Print Defect Clinic (A+ C1) | defect-swatch renderer (most novel; isolated on purpose) |

Sec+ / A+ Core 2 top-5s (pending research) slot into waves 2-4+ by renderer family when they land.

## Wave 1 — full design

**Scope:** 3 archetypes, 10-12 two-agent-gated scenarios each (~33 total), ZERO new renderers. Branch: `feat/sim-lab-pbq-wave1`. Ships as one release.

### 1. Wireless Deployment Panel — `archetype:'wireless'` (netplus bank)
- **Reference:** existing `network` renderer. APs as devices; the interfering neighbor AP drawn via the existing attack-link overlay with channel labels.
- **Steps:** `configure` per-AP (slots: band, channel, width, security, SSID/guest-VLAN as applicable) + `analyze` (why the neighbor forces the channel choice).
- **Validator `simLabValidateWirelessFidelity(ref, step)`:** channel legal for band; 2.4 GHz picks from the non-overlapping set {1,6,11} excluding the neighbor's channel; band vs stated client constraint; security mode vs requirement card; SSID/VLAN exact match. Same `{ok, errors}` contract as `simLabValidateNetworkFidelity`.

### 2. Firewall Rule Table — `archetype:'firewall'` (netplus bank)
- **Reference:** existing `network` renderer (zones + firewall device). The rule table lives in the answer steps, not the reference.
- **Steps:** `configure` rows as rule tuples (action/protocol/src/dst/port dropdowns), `order` (top-down precedence), `analyze` (shadow-rule identification).
- **Validator `simLabValidateFirewallFidelity(seed)`:** execute the seed's traffic flows through the keyed ordered rule list with first-match-wins semantics; assert every requirement-card outcome (allow/deny) is produced; assert the designated shadowed rule is genuinely unreachable. This "run the rules" property is the archetype's differentiator — preserve it.
- **Graveyard note:** consciously supersedes the removed standalone ACL-ordering drill — scenario-chained build→order→diagnose with simulated-traffic scoring vs. the dead drill's context-free line-shuffling. Capture as a `#decision` note at ship.

### 3. SOHO Router Setup Console — `archetype:'soho'` (aplus-core1 bank — FIRST archetype content in an A+ bank)
- **Reference:** existing `network` renderer (small office diagram). The "console" is the configure step styled per its mockup — no new reference kind.
- **Steps:** `configure` (slots: SSID, security mode, channel, DHCP scope start/end or CIDR, port-forward rule) + optional `analyze`.
- **Validator `simLabValidateSohoFidelity(seed)`:** DHCP scope arithmetic via the existing `_ipToInt`/`_inSubnet` helpers (scope inside subnet, covers required device count, excludes static assignments/gateway), channel/security legality, port-forward tuple exactness.
- **Examiner lens for the content gate judges against 220-1201 objectives (2.5/2.6), NOT Net+.**

### Engine deltas (complete list)
- Accept `'wireless' | 'firewall' | 'soho'` in the archetype validation set.
- Add the three fidelity validators above (pure logic, alongside the Task-9 validator).
- NOTHING else: `_slMountScenario`, scoring, free/Pro gating, cert entry (`_SL_PBQ_CERTS_HOME` already includes A+ cores), Exam mode, milestones are archetype-agnostic (proven by the v7.61.0 Tasks 15-17 tests).

## Process per wave (hard rules restated)
1. Concept mockup per archetype (`mockups/<archetype>-concept.html`), each through the 4-stage visual pass IN ORDER: /design-taste-frontend → /emil-design-eng → /humanizer → /marketing-psychology. **Mockups ARE the build (faithful lift).**
2. `superpowers:writing-plans` → task-by-task TDD plan (Task-1-style exactness: contracts, test snippets, commit messages).
3. `superpowers:subagent-driven-development` execution with per-task spec+quality reviews and a progress ledger.
4. Content gate: EVERY scenario passes its deterministic validator AND two-agent consensus (domain engineer + CompTIA examiner for the correct exam), revise-until-both-approve.
5. Ship: final whole-branch review → LIVE browser verify (computed styles, not just Node — the v7.61.0 `--fail` black-box lesson) → bump-version → PR → deploy → decision notes.

## Testing & guards
- Per-archetype UAT bank tests mirroring the v7.61.0 pattern: vm-extract the REAL validators, filter bank by archetype, assert min count (≥10) and that every scenario passes scenario+fidelity validation. Non-vacuous by construction (mutation-check in review).
- CSS: dg-system.css only, tokens only; the plan MUST include an explicit check that every `var(--*)` used is defined (the `--fail`/`--pass` lesson).
- Dev-fixture rule carries over: mockup-embedded scenarios are labeled fixtures until they clear the gate.

## Out of scope (Wave 1)
New renderers of any kind; Sec+/A+ Core 2 archetypes; changes to the three shipped archetypes; bank depth beyond 10-12/archetype; stacked/nested layout changes.

## Related
[[Drills MOC]] · [[2026-06-30-diagram-and-incident-response-pbq-design]] · [[ADR-003-pbq-structured-model-and-per-cert-validation]] · [[2026-07-01-per-cert-layered-did-layout]]
