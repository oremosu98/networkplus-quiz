# Sim Lab Session Mode — design spec (2026-06-24)

**Status:** approved in brainstorming (visual companion, 4 screens, all confirmed).
**Supersedes scope of:** part of Plan 2 "Exam mode" — brings the multi-round *session* model forward into the free/Practice tier, but keeps exam-timing (flag-and-return, pacing report) out of scope.
**Builds on:** `docs/superpowers/specs/2026-06-23-sim-lab-pbq-drill-design.md` (Plan 1, shipped v7.55.0–v7.55.2).

---

## 1 · Problem

Sim Lab today is **one scenario then "Back to Practice."** Its siblings run multiples — Reword Gauntlet is five rungs, Why-Not scores four reasons — so a single PBQ feels thin and breaks the drill rhythm. Two concrete defects, both observed live by the founder:

1. **One-and-done.** No sense of a "run"; the user wanted to *choose how many rounds*.
2. **Dead click.** Launch lazy-loads the module then generates via AI (6–7s) with **zero feedback** — the page only switches after the scenario is ready, so it looks frozen.

Plus a product gap: the landing site showcases the two flagship drills with live demos, but **PBQs have no representation there.**

---

## 2 · Locked decisions

### 2.1 Round model (option A)
| Tier | Session |
|---|---|
| **Free** | Pick **3 or 5** rounds. **One session per day** — the session is the daily free sim. |
| **Pro** | **Unlimited** sessions, **exam-length up to 10** rounds, **cross-session weak-spot tracking**. |

- A **round = one scenario** (1–4 mixed steps, scored exactly as today via `simLabScoreScenario`).
- **Daily-cap reframe:** `STORAGE.PBQ_FREE_COUNT` changes semantics from *scenarios started* to **sessions started**. `_bumpPbqFreeRun` fires **once per session start**, not per round. Paywall copy ("one free sim a day") reads as "one free session a day."
- Picker default = **5**. The **10-round** chip is Pro-locked (selecting it on free fires the Pro gate).

### 2.2 Entry screen (seamless with siblings)
Sim Lab gains a real **entry screen** in the shared `gnt-shell` anatomy (today it launches straight into generation):
- Header (back + "Sim Lab" + Pro pill) · brand mark · Fraunces title ("Practice the hands-on *PBQs*") · lede · **Today's target** (cert/objective) · **rounds picker** (chips: `3` · `5` · `10 · exam length`🔒) where Gauntlet's rung-preview sits · primary CTA "Start the sim →".
- The Home → Practice "Sim Lab" tile (shipped v7.55.2) now opens **this entry**, instantly — no generation on click.

### 2.3 In-session chrome + loader
- Topbar: `Sim Lab` · **round pill "Round N of M"** · timer · Leave. Progress **dots** under the bar (done = `--pass`, current = `--accent`).
- **Loader (the fix):** clicking "Start" transitions to the session page **immediately** and shows a loader; a loader also renders **between rounds** ("Building round N…", brand spinner). The 6–7s generation never looks dead.
- Each round renders via the existing step renderers (`simLabRenderStep`) and is submitted/scored as today.

### 2.4 End-of-session summary
Verdict screen in the sibling `gnt-shell-result` style:
- **Fraunces score figure** (lining-nums + tabular-nums per BRAND §4) — e.g. `82% · 4 of 5 sims passed · 11 of 13 steps`.
- **Per-round hairline rows**: ✓/✗ mark, topic, per-round step score, and the "why". **Free reveals the "why" on missed rounds only**; passed rounds show the Pro lock ("Pro shows the why on the ones you got right too") — consistent with the in-drill feedback lock.
- **"Where you slipped"** — a **full tinted-hairline** note (NOT a left-accent-border, per anti-slop §9) clustering misses by domain; teases Pro cross-session tracking.
- CTAs: **Back to Practice** (primary; returns to Home) + **Go Pro · exam-length + weak-spot tracking**.

### 2.5 Landing section (its own, not folded in)
A **dedicated Sim Lab section** on `certanvil.com` (the "two tricks, two drills" symmetry doesn't extend to PBQs). Copy-left / demo-right, light theme, **bronze tokens scoped to the section id** (lift-safety — landing `:root` still defines legacy purple `--accent`). Demo mirrors the `gx-demo` vocabulary: a PBQ being solved (DHCP-order example) with a "Round 2 / 5" counter and a "✓ Sim cleared" seal; animates the rows into order in the real build. Copy was run through the 4-stage pass (contrast + regret + vividness; no fabricated stats; no em-dashes).

---

## 3 · Architecture

Mirror the **Why-Not session pattern** (the Plan-1 spec already named `_slSession`).

### 3.1 Session object
```
_slSession = {
  mode: 'practice',        // exam-mode timing deferred
  rounds: 5,               // 3 | 5 (free) | 10 (pro)
  idx: 0,                  // current round (0-based)
  pro: bool,
  cert: 'netplus',
  results: [],             // per round: { scenario, score, perStep }
  usedSeedIds: Set,        // no-repeat seed picks within a session
  timer: <handle>          // existing per-round practice timer
}
```

### 3.2 Pages (index.html)
- **New** `#page-sim-lab-entry` — `gnt-shell` entry + rounds picker (lift the mockup look; reuse `gnt-*` classes for seamlessness).
- **Reuse** `#page-sim-lab` — the round runner (existing topbar + `#sl-body`); add the round pill + dots to the topbar, loader states into `#sl-body`.
- **New** `#page-sim-lab-result` — `gnt-shell gnt-shell-result`, rendered from `_slSession.results`.

### 3.3 Flow
```
Home tile → startSimLabHome() → _ensureSimLabLoaded → show #page-sim-lab-entry (instant)
  → pick rounds (gate 10 → Pro) → "Start"
  → _slSessionStart(): cap-check (free: 1/day) → bump once → show #page-sim-lab + loader
  → round loop (idx 0..N-1):
        loader → _slGenerateScenario(cert, obj) [no-repeat seed] → render round
        → submit → score → push result → loader → next
  → after last round → render #page-sim-lab-result (summary)
  → "Back to Practice" → showPage('setup')  (renderSimLabHomeEntry refreshes the "done today" state)
```

### 3.4 Reused as-is
`_slGenerateScenario` (AI → seed fallback, with the v7.55.1 few-shot prompt), `simLabRenderStep`, `simLabScoreScenario`, `_slRenderFeedback` (per-round, aggregated in summary), `_slStartPracticeTimer` (per round), the 50-seed bank.

### 3.5 New/changed helpers
- `_slPickSeedFresh(cert, usedIds)` — seed picker that excludes session-used ids (replaces the minute-rotation for sessions; 50 seeds ≫ 10 max, so no exhaustion).
- `_slSessionStart`, `_slSessionAdvance`, `_slRenderLoader`, `_slRenderSummary`.
- `_bumpPbqFreeRun` semantics → **once per session** (move the call from per-scenario start to `_slSessionStart`).
- Weak-spot: within-session cluster computed for everyone (cheap, from `results`); **cross-session persistence + auto-pull is Pro** (store under `STORAGE`, gate read/write to `_quotaState.tier`).

### 3.6 Generation latency (known)
A 5-round AI session = 5 × ~6–7s, each behind a loader. MVP = **per-round generation**. *Enhancement (not MVP):* pre-fetch round N+1 during round N to hide latency — note in plan, build only if the per-round wait feels heavy in testing.

---

## 4 · Free / Pro gating summary
| Surface | Free | Pro |
|---|---|---|
| Sessions/day | 1 | unlimited |
| Rounds | 3 or 5 | 3 / 5 / 10 |
| Per-step "why" | misses only | every step |
| Weak-spot tracking | within-session cluster shown (tease) | persisted + auto-pulled across sessions |

Pro gate (`_gateProOnly('Sim Lab', …)`) fires on: selecting 10 rounds, or starting a 2nd session same day.

---

## 5 · Out of scope (deferred)
- Exam-mode timing: flag-and-return, exam pacing report (the rest of Plan 2).
- Full analytics dashboard beyond the summary cluster + Pro persistence.
- Sec+/A+ seed banks + rollout (Plan 3).
- Pre-generation/caching (noted as a latency enhancement only).

---

## 6 · Testing
- **e2e (`tests/e2e/sim-lab.spec.js`)**: entry renders + picker; Start begins a session; round 1 renders via seed fallback; submit advances (loader) to round 2; after N rounds the summary shows the aggregate; Back to Practice → Home. Free cap → 2nd same-day session is gated. Pro → 10-round chip unlocked. No-repeat seeds within a session.
- **Seed self-validation**: unchanged (50/50 valid + score 100%).
- **UAT structural**: `#page-sim-lab-entry` + `#page-sim-lab-result` exist; round pill; session object; `_bumpPbqFreeRun` fires once/session.
- **4-stage copy** carried verbatim from the approved mockups.

---

## 7 · Ship
Fast lane (drills JS + copy + landing). `dg-system.css?v=` bump if any dg-system change. Landing section deploys via the separate "Deploy Landing Page" workflow. Cross-platform verify (chromium/webkit/mobile-safari) — Sim Lab is a touch+mouse drill.
