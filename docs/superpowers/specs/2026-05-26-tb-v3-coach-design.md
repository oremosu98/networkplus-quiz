---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# TB v3 Phase 9 — Coach v1 MVP Design Spec

**Date:** 2026-05-26
**Status:** Design lock (brainstorming complete; pending plan + implementation)
**Surface:** Topology Builder v3 right-rail panel, alongside Inspector / Picker / Trace / OSI
**Cert scope:** Network+ (N10-009), with Sec+ awareness via `CURRENT_CERT` + `CERT_PACK`

---

## 1. Context

Phase 9 of Topology Builder v3. Tier C AI tutor using Claude Sonnet 4.6 (`CLAUDE_TEACHER_MODEL`) via the existing BYOK + server-proxy infrastructure. Builds on shipped Phases 1–8: canvas, scenarios catalog, reachability validator, Simulate / Trace / OSI modes, 3D lightbox, and the 42-walkthrough guided-tour catalog (43 in the source file; minor count diff).

The Coach is the **explain-layer on top of substrate TB v3 already computes**. It serves two question types:

- **Anticipatable** — "why did this trace fail at L3?", "explain this walkthrough step further", "what does this scenario test?"
- **Free-form** — "why a /24 here?", "when would OSPF beat static routes?"

It is NOT a chatbot. It is cert-scoped, topic-scoped, persona-locked, and bounded by cost discipline.

---

## 2. Scope — Slice A (6 items)

Drawn from `/Users/simioremosu/Desktop/topology-builder-coach-scope.md` via `/expand-and-contract`. Sliced per the scope doc's watch-out #1 recommendation (5–6 of 17 Core for v1; rest demoted to ship 2+).

### Included in v1 MVP

1. **Hybrid engine** — scripts + AI fallback
2. **Linear lessons** — no branching
3. **Free Build action narration** — scripted templates respond to canvas events
4. **PBQ stuck-escape** — Socratic + scripted hint cascade + AI as the final rung
5. **Persistent side panel** — right rail, ~360px wide
6. **Tied to 1 of 42 walkthroughs** — `soho-network-converged`

### Implicitly kept (free wins)

- **#2 BOTH modes** — covered by #3 (FB) + #4 (PBQ)
- **#12 "Always show the why"** — embodied in scripted lesson copy
- **#13 Free answers in Free Build** — covered by #1's AI fallback

### Demoted to ship 2+

#4 Branching scenarios · #5 PBQ timer · #6 PBQ scoring · #9 Real-time validation · #10 Best-practice nudges · #11 Quiz-me-on-build · #14 CompTIA objective tagging · #15 B/I/A difficulty tracks · Remaining 41 PBQs · Resume-after-reload · Hard cost cap · Voice narration (also OUT per scope doc) · Cross-session memory (also OUT)

---

## 3. Architecture

### 3.1 PBQ Subsystem

New file: `features/topology-builder-v3-pbqs.js`

- Sibling to `features/topology-builder-v3-walkthroughs.js`
- 42→42 mapping: each existing walkthrough has a 1:1 PBQ counterpart, authored from its scripted tour
- For v1, only `soho-network-converged` is authored; the other 41 ship in later phases

PBQ data shape (per scenario):

```js
{
  id: 'soho-network-converged',          // matches the walkthrough id
  certPack: 'netplus',
  objective: '1.6 Common SOHO network',  // N10-009 reference (reserved; not surfaced in MVP UI)
  difficulty: 'beginner',                // reserved for B/I/A in ship 2+
  task: 'Build a SOHO topology…',
  steps: [
    {
      id: 's1',
      instruction: 'Place the SOHO router at the centre.',
      check: (state) => /* validator returns true when met */,
      hints: [
        'Look in the device palette for a router.',
        'Drag the router into the centre of the canvas.',
        "You don't need a separate switch — the SOHO router is converged.",
      ],
      aiPromptSeed: 'Student is on step "place SOHO router" and stuck after 3 hints. Their canvas: {{state}}. Help them place a single router and explain SOHO convergence in 1–2 short paragraphs.',
    },
    // …more steps
  ],
}
```

### 3.2 Coach Module

New file: `features/topology-builder-v3-coach.js`

Responsibilities:

- Render the side panel in the right rail
- Subscribe to canvas state via TB v3 `_getState()`
- Detect mode: PBQ active (PBQ loaded, current step incomplete) vs Free Build (anything else)
- Route between scripted templates and AI calls per §3.4
- Manage in-session UI state (current step, stuck counter, panel collapsed flag)
- Read/write the AI cache via `STORAGE.TB_COACH_CACHE`
- Render the AI session counter (per-day, top-right of header)

### 3.3 Side Panel UI

Design-locked by `mockups/tb-v3-coach-side-panel.html`.

- Position: right rail, persistent, ~360px wide. Slots in like Inspector / Picker / Trace / OSI.
- Mode determined by canvas state. No toggle, no tabs.
- Shell: header (Coach badge + AI counter) → mode strip → body → footer.

**PBQ body:** lesson title + task + step checklist + hint rail (3 scripted pips + AI rung).
**PBQ footer:** "I'm stuck" (ghost) + "Next step" (primary). No free-form input.

**Free Build body:** time-ordered message feed; scripted narration (◯) and AI replies (★) visually distinct, AI in violet wash.
**Free Build footer:** text input + Send.

**Type voice:** Fraunces serif for Coach branding + lesson titles; Inter for body. Matches the TB v3 editorial tokens already used by the Phase 3 diagnostic drawer.

**Motion (per `/emil-design-eng`):**

| Element | Rule |
| --- | --- |
| All buttons | `:active { transform: scale(0.97) }`, 160ms ease-out |
| Pip fill on hint use | `transition: background 180ms ease-out` |
| Mode dot on mode switch | `transition: background 180ms ease` |
| Lesson list done state | `transition: color 220ms ease, text-decoration-color 220ms ease` |
| AI message entry (FB) | `@starting-style { opacity: 0; transform: translateY(8px) }`, 220ms ease-out |
| Hint slide-in (PBQ) | scale(0.97) + opacity(0) → 1.0, 200ms ease-out, transform-origin: top |
| AI counter increment | brief 150ms opacity blink, no movement |
| `prefers-reduced-motion` | All transforms removed; opacity transitions only |

### 3.4 Hybrid Routing Rule (mode-aware)

**Free Build mode:**

- Canvas action event (device added, cable drawn, device deleted, etc.) → look up scripted template by event type → render narration message in the feed
- No template match → silent (no message rendered)
- Student types into input + presses Send → AI call (Sonnet 4.6) → render AI response

**PBQ mode:**

- Lesson step content from PBQ definition → scripted only
- Student presses "I'm stuck" → reveal next scripted hint, fill the next pip
- After 3 scripted hints used, "I'm stuck" → AI call with full context → render AI hint, fill the AI pip
- No free-form input in PBQ; escape only via the cascade

### 3.5 AI Call Shape

- **Provider:** Claude Sonnet 4.6 via `CLAUDE_TEACHER_MODEL`
- **Infrastructure:** BYOK + existing server proxy (no new infra)
- **Context injection:**
  - Canvas state via `_getState()` (devices + cables + viewport)
  - Mode: `pbq:{scenarioId}` or `fb`
  - PBQ-specific: `currentStepId`, `hintsUsed`, `aiPromptSeed` from the step definition
  - Cert pack: `CURRENT_CERT` + `CERT_PACK`
  - Scenario `examRelevance` block if available
- **Persona prompt:** "You are a Network+ (N10-009) tutor. Keep responses under 500 tokens. Do not spoiler the PBQ answer when one is active. Stay on TB v3 topics."
- **Response shape:** plain text. No tool calls. Markdown allowed.

### 3.6 Cache (Memory Level A)

- Storage: `localStorage` under `STORAGE.TB_COACH_CACHE` (matches the v1 precedent key)
- Cache key: `sha1(topologyHash + questionText + mode + scenarioId + stepId)` using the existing `tbTopologyHash` helper
- TTL: 24 hours from write
- Hit → return cached response, skip AI call, do not increment counter
- Miss → AI call, store response, increment counter
- Invalidation: bump a `PBQ_VERSION` constant in the PBQ file to drop stale cache for that PBQ

### 3.7 UI State

- In-memory only; wipes on reload (Memory Level A)
- Shape: `{ activePbqId, currentStepIndex, hintsUsed, panelCollapsed }`
- Refresh = restart the PBQ lesson. Intentional — mirrors real-exam PBQ behaviour
- AI counter is the only non-cache persistence: `{ date: 'YYYY-MM-DD', count: N }` in localStorage, reset daily

---

## 4. Data Flow

### PBQ flow

1. Student clicks "Start PBQ" in the scenarios catalog (a new filter/tab alongside walkthroughs) → Coach loads PBQ definition for `soho-network-converged`
2. Mode strip switches to PBQ; lesson title + step 1 instruction render in the panel body
3. Student builds topology on canvas → step `check(state)` re-runs on each canvas mutation
4. Step `check` returns true → "Next step" enables → click advances the step, the completed list-item transitions to its done state
5. Student stuck → clicks "I'm stuck" → first scripted hint pip fills, hint slides into the hint rail
6. Stuck again → second pip + hint
7. Stuck again → third pip + hint
8. Stuck again → AI rung activates, AI call fires with full context, AI hint slides in
9. All steps complete → lesson-complete state ("Lesson complete · return to Free Build"). No scoring in MVP.

### Free Build flow

1. Student on canvas with no active PBQ → mode strip shows "Free Build"
2. Student adds a router → Coach renders scripted narration via template lookup
3. Student types "What is NAT?" + Send → Coach checks cache → miss → AI call → render response with star icon and violet wash → counter increments
4. Student asks the same question later → cache hit → render cached response without incrementing the counter

---

## 5. Error Handling

| Failure mode | Behaviour |
| --- | --- |
| AI call timeout (>10s) | Inline fallback: *"I couldn't reach the tutor — try rephrasing, or check your connection."* Counter does not increment. |
| AI rate limit / 429 | Inline message: *"BYOK quota reached for today."* Counter blocks further AI calls until tomorrow. |
| AI returns malformed response | Same as timeout. Cache only validated responses. |
| Free Build template miss | Silent — no message rendered. No visible error. |
| PBQ definition fails to load | Toast: *"Couldn't load this PBQ — try another scenario."* Panel falls back to Free Build mode. |
| `_getState()` throws | Panel disabled with a small "Coach unavailable" state, surfaced via the existing diagnostic drawer. |

---

## 6. Testing

- **Unit tests** for the routing logic (`script-vs-ai` decision), cache hit/miss, PBQ step progression, stuck-cascade indexing, mode-detection from canvas state.
- **AI prompt construction** — snapshot test the full prompt (persona + injected context). Any change to the prompt is deliberate, not accidental.
- **Integration test** with a stubbed AI provider: full PBQ run through all steps including the 4th-hint AI escape.
- **UAT scripts**: PBQ open / FB narration / FB question / cache reuse / stuck-escape cascade / counter visibility / refresh-resets-PBQ.
- **Playwright E2E**: full PBQ flow end-to-end against a deterministic stub.
- **Post-deploy live verification** in prod browser per the locked v6.5.x rule.
- Target ≥80% coverage on the new Coach module per `/superpowers` TDD discipline.

---

## 7. Out of scope (explicit)

Scoped into ship 2 or later, in priority order:

1. Author the remaining 41 PBQs
2. PBQ timer + end-of-lesson scoring
3. Branching scenarios
4. Real-time validation (live correctness signals on partial topologies)
5. Best-practice nudges (proactive design tips in Free Build)
6. Quiz-me-on-my-build (Coach generates questions from the student's topology)
7. CompTIA objective tagging surfaced in the UI
8. B / I / A difficulty tracks per lesson
9. Resume-after-reload (Memory Level B)
10. Hard cost cap (per-user daily token budget)
11. Voice / TTS — confirmed OUT per scope doc
12. Cross-session memory — confirmed OUT per scope doc

---

## 8. Skill orchestration applied

Per the v6.5.8 lesson (skills "applied in principle" without formal invocation is what tripped that ship), all skills below were invoked via the Skill tool during this brainstorming pass:

- `/superpowers` (brainstorming) — process discipline, HARD-GATE on implementation, this spec is its terminal output
- `/taste-skill` — routed to editorial-premium for visual coherence with TB v3
- `/ui-ux-pro-max` — accessibility, touch targets, focus states, hover, cursor, contrast checks
- `/emil-design-eng` — `:active` states, ease-out for entry, transitions on state-changing elements, mandatory Before/After review format
- `/stop-slop` — to be applied as a final pass on user-facing strings + system prompts before commit
- `/ecc:code-review` — to be applied after implementation, before commit

---

## 9. Implementation notes

- Brainstorming → spec (this doc) → plan → TDD → ship, per superpowers
- Worktree-based isolation per `/using-git-worktrees`
- File targets:
  - `features/topology-builder-v3-coach.js` — new module (engine, routing, panel render)
  - `features/topology-builder-v3-pbqs.js` — new data file (PBQ definitions)
  - `features/topology-builder-v3.js` — integrate Coach panel into the right rail; expose canvas state via existing `_getState()`
  - `dg-system.css` or a Coach-scoped stylesheet — styles from the locked mockup
- Fast-lane per `ENVIRONMENT_STRATEGY.md` — feature-module JS + CSS only, no DB / auth / money / SW-fetch-logic. Trunk-based direct-to-main is fine.
- Strangler-fig: v1 `tbCoachTopology` and v2 `tbV2CoachTopology` stay live for the canvases that still use them. Phase 10 retires both alongside v1 + v2 canvases.

---

## 10. Visual artifacts

- `mockups/tb-v3-coach-side-panel.html` — side panel design lock, both modes side-by-side, polish applied across all three skill lenses
- `mockups/tb-v3-coach-slicing.html` — scope decision visual (Slice A vs C, free wins, demoted items)
- `/Users/simioremosu/Desktop/topology-builder-coach-scope.md` — full scope doc from `/expand-and-contract`

---

*Spec ready for plan-doc generation via `/superpowers` writing-plans.*
