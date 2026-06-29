# CertAnvil — Knowledge Vault

> Obsidian home / map-of-content for the CertAnvil project. Open this folder as a vault (`Open folder as vault` → select the repo root). Code folders are excluded via `.obsidian/`. Use the graph view + search; this note is just the curated entry point.

## Dashboard (Dataview)
```dataview
TABLE status, type, updated FROM "docs" WHERE status = "active" SORT updated DESC LIMIT 15
```
```dataview
LIST FROM #decision SORT updated DESC
```

## Start Here
- [[CLAUDE]] — the always-loaded project guide (architecture, files, decision rules, deploy)
- [[CHANGELOG]] — full release history
- [[SHIP_CHECKLIST]] — the 6-phase pre-push discipline
- [[ENVIRONMENT_STRATEGY]] — risk-tiered branching (fast lane vs gated lane)
- [[IOS_TESTING]] — iOS / Capacitor testing

## Architecture
- [[structure-overview]] — where everything lives + how it deploys
- [[key-patterns]] — quiz flow, exam mode, AI teacher tiers, validation pipeline
- [[feature-subsystems]] — Topology Builder, Subnet Trainer, Drills launcher
- [[graphify-code-map]] — code-map query tooling (`graphq`) + hard-won lessons

## Conventions & Decisions
- [[conventions]] — testing philosophy, lessons, magic-number constants
- [[workflow]] — boards, cadence, references
- [[regression-tombstones]] — deleted code that must stay deleted
- [[ADR-001-m5-supabase-session-cookies]]
- [[ADR-002-rbac-admin-surface]]

## Design System
- [[BRAND]] — forged-bronze editorial design system (source of truth)
- [[DESIGN_PLAYBOOK]]
- Audits: [[EDITORIAL_AUDIT]] · [[MOTION_AUDIT]] · [[WRITING_AUDIT]] · [[SECURITY-AUDIT-2026-05-29]]

## Planning & Specs
- [[PHASE-G-PLAN-2026-06-11]] · [[REBRAND_SHIP_PLAN]]
- Drills: [[WHY-NOT-DRILL-SPEC-2026-06-12]] · [[REWORD-GAUNTLET-SPEC-2026-06-11]]
- Onboarding: [[ONBOARDING_ACTIVATION_DECISIONS]] · [[ONBOARDING_ROLLOUT_GATE_PLAN]] · [[ONBOARDING_ROUTING_BUILD_PLAN]]
- **Per-cert milestones (latest):** [[2026-06-29-per-cert-milestones-and-drill-milestones-design]] · [[2026-06-29-per-cert-milestones-and-drill-milestones]]

## Mobile / iOS
- [[MOBILE_IOS_PLAN]] · [[MOBILE_BASELINE]] · [[MOBILE_OPTIMIZATION_PLAN]]
- [[APP_STORE_DISTRIBUTION]] · [[2026-06-26-capacitor-prewrap-review]] · [[PHASE_11B_CUT_POINTS]]

## Research / Voice-of-Customer
- [[pbq-drill-voc-research]] · [[2026-06-25-cloud-certs-drill-voc]] · [[i-passed-story]]

## Maps
- [[Drills MOC]] — drill specs, plans, and feature architecture
- [[Mobile MOC]] — all iOS / mobile docs
- [[Design MOC]] — brand, design system, and audits
- [[Decisions MOC]] — ADRs, conventions, regression guards
- [[Decision Log]] — running log of all project decisions (Dataview + manual fallback)

---
*Tip: everything not linked here is still searchable + shows in the graph view. Add new specs/plans/decisions as notes and they'll appear automatically.*
*Daily driver: prefer **Local Graph** (open a note → "Open local graph", depth 1–2) over the global hairball — it shows what connects to THIS doc. New decisions get captured at ship time (the `/ship` runbook's Step 7), so the map stays current.*
