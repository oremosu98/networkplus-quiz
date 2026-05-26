// ════════════════════════════════════════════════════════════════════
// TB v3 Phase 9 — PBQ Catalog
// Performance-Based Question lessons authored from each of the 42
// existing TB v3 walkthroughs as a 42→42 mapping. PBQs add the
// exam-format layer (Coach pedagogy mechanic) on top of the walkthrough
// catalog. v1 MVP authors only `soho-network-converged`; the remaining
// 41 ship in later phases.
//
// PBQ shape: { id, certPack, objective, difficulty, task, steps[] }
// Step shape: { id, instruction, check(state)=>bool, hints[3], aiPromptSeed }
//
// Spec: docs/superpowers/specs/2026-05-26-tb-v3-coach-design.md §3.1
// Pattern matches features/topology-builder-v3-walkthroughs.js (plain var).
// ════════════════════════════════════════════════════════════════════

var PBQ_VERSION = '1.0.0';

var TB_V3_PBQS = [
  // soho-network-converged populated in Task 2.
];
