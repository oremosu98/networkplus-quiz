---
type: spec
status: shipped
cert: netplus
updated: 2026-06-29
tags: [spec, drill]
---
# Sim Lab Exam Mode (timing) — design spec (2026-06-25)

**Status:** approved in brainstorming (visual companion, 1 concept / 4 panels, all confirmed; 4-stage design pass applied — design-taste-frontend · emil-design-eng · humanizer · marketing-psychology).
**Completes:** Plan 2 "Exam mode" — the deferred timing half (whole-session countdown, flag-and-return, pacing report). Session mode (v7.56.0) brought the multi-round *session model* forward; this adds the *exam timing* layer on top of it.
**Builds on:** `docs/superpowers/specs/2026-06-24-sim-lab-session-mode-design.md` (session mode, shipped v7.56.0) and `docs/superpowers/specs/2026-06-23-sim-lab-pbq-drill-design.md` (Plan 1).

**Visual contract (HARD RULE):** `mockups/sim-lab-exam-mode-concept.html` IS the build, lifted pixel-for-pixel-intent — not inspiration to reinterpret. The four panels map to:
1. **Entry** — Practice/Exam mode toggle + exam-pace budget readout (extends `#page-sim-lab-entry`).
2. **Exam round** — whole-session countdown clock, numbered question palette (4 states), flag toggle, Prev/Next free navigation (state of `#page-sim-lab`).
3. **Review** — review-before-submit list with answered/flagged/unanswered counts (state of `#page-sim-lab`, clock still ticking).
4. **Verdict** — the existing summary with a new **Pace** block prepended above the per-round rows (extends `#page-sim-lab-result`).

Tokens come from live `dg-system.css` at build time (not the mockup's inline block); **both light and dark must be verified** (the v4.99.63 dark-only-miss lesson — the mockup previews dark only).

---

## 1 · Problem

Practice/session mode teaches the PBQ *format* with a relaxed count-up timer. It does not reproduce the thing candidates actually fear: a **timed** exam where you must budget across questions, defer a hard one, and come back. Exam mode is the Pro layer that makes a session feel like the real N10-009 PBQ section, and gives an honest **pacing read** at the end so the user knows whether they're test-day ready on speed, not just accuracy.

---

## 2 · Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Access tier | **Pro-only.** Practice stays free + unchanged. Exam mode (toggle or 10-round) routes through `_gateProOnly` (IAP-safe). Pro = unlimited exam sessions (no daily cap; the 1/day cap is a Practice-free concept only). |
| 2 | Timer model | **One whole-session countdown.** Budget = Σ(round `estMinutes`) **× 0.9** (tightened to bite like the real exam), in seconds. |
| 3 | Navigation | **Free navigation + review screen.** Answer rounds in any order, flag any round, jump via the palette, Prev/Next, then a Review screen before final submit. |
| 4 | Pacing report | **New Pace block in the verdict** (`#page-sim-lab-result`), measured vs par. |

### 2.1 Countdown behavior
- **Display** turns **amber** when remaining ≤ **10%** of budget; **one-way latch** (stays amber once tripped).
- **Time-up** (remaining hits 0): auto-submit whatever is answered (unanswered → 0), route to verdict with a "Time's up" note. No grace.
- **No pause.** The exam clock is authentic; leaving ends the exam (see §3.7).

### 2.2 Pace block (verdict)
- Headline: identity-affirming verdict + figure — **"On exam pace ✓"** (under par) with "`Δ` to spare" sub; over par → **"`Δ` over exam pace"** with a coaching, non-punishing line.
- Par instrument: hairline track, fill = your-time, fixed tick at the budget ("Target mm:ss"). Fill never overruns the tick visually past 100% (cap the bar; the over-pace figure carries the overflow).
- Per-round rows: bar per round, green when under that round's par (`estMinutes × 0.9`), amber when over, with a signed `±m:ss` delta. A fixed per-round par tick on each bar.
- Sits **above** the existing per-round ✓/✗ rows + weak-spot cluster (both unchanged).

---

## 3 · Architecture

Extend the session machine; do **not** fork a parallel one. Exam mode is `_slSession.mode === 'exam'` with extra fields; practice/session paths are untouched when `mode === 'practice'`.

### 3.1 Session object (additions in **bold**)
```
_slSession = {
  mode: 'practice' | 'exam',     // 'exam' enables everything below
  rounds, idx, pro, cert,
  results: [],                   // practice: filled per round on submit
  usedSeedIds: Set,
  timer: <handle>,               // practice per-round count-up (unchanged)

  // ── exam-only ──
  scenarios: [scn0..scnN-1],     // ALL rounds pre-generated up front (free nav needs them ready)
  answers:  [a0..aN-1],          // per-round in-flight answer state, editable until submit
  visited:  Set, flagged: Set,   // round indices
  deadlineMs: <epoch ms>,        // start + budgetMs  (countdown is derived from this, NOT decremented)
  budgetMs:  <ms>,               // Σ estMinutes × 0.9 × 60_000
  roundMs:   [t0..tN-1],         // accrued active time per round (for the per-round pace bars)
  view: 'round' | 'review',      // body state of #page-sim-lab
  clock: <handle>, amber: bool   // countdown handle + latched amber flag
}
```

### 3.2 Pages (index.html)
- **Extend `#page-sim-lab-entry`** — add the Practice/Exam **mode toggle** (`.seg`) above the rounds picker + an **exam-pace budget** readout in the target block. Exam carries a `Pro` tag; tapping it on free fires the gate (anticipated, not sprung).
- **Extend `#page-sim-lab`** (the runner) — exam variant of the topbar: **countdown clock** (replaces the count-up timer), `Exam` badge; the **question palette** (numbered squares, 4 states) replaces the thin dots in exam mode; `#sl-body` gains the **flag toggle + Prev/Next** footer and the **review** body-state. The review screen is a body-state (not a new page) so the countdown stays visible in the topbar (matches mockup panel 3).
- **Extend `#page-sim-lab-result`** — prepend the **Pace** block above the existing summary content.

### 3.3 Flow
```
Entry → mode = Exam (Pro; free → _gateProOnly) → pick rounds → "Start exam sim"
  → _slExamStart():
       show #page-sim-lab + "Building your exam…" loader (once)
       → _slExamGenerateAll(): generate ALL N rounds (AI → seed fallback, no-repeat) in parallel-ish
       → compute budgetMs = Σ estMinutes × 0.9 × 60_000; deadlineMs = now + budgetMs
       → start countdown (wall-clock, §6) → render round 0
  → free loop: Prev/Next/jump (palette) · flag toggle · answers persist per round (editable)
       (countdown runs continuously; amber at ≤10%; time-up → auto-submit)
  → "Review →" (from last round or any time) → review body-state (counts + jump list)
  → "Submit exam" (confirm if unanswered) → _slExamSubmit(): score all rounds, stop clock
  → #page-sim-lab-result with Pace block → "Back to Practice" → Home
```

### 3.4 Reused as-is
`simLabRenderStep`, `simLabScoreScenario`, `_slRenderFeedback` (verdict), `_slGenerateScenario` / `_slPickSeedFresh` (per round, in the batch generate), `_slBank(cert)` (the cert resolver), the seed bank, `_gateProOnly`, the `.reveal` entrance IntersectionObserver.

### 3.5 New/changed helpers (features/sim-lab.js)
- `_slExamStart(opts)`, `_slExamGenerateAll(cert, rounds)` — batch pre-generation with the loader; each round AI→seed fallback, no-repeat across the batch.
- `_slStartCountdown(deadlineMs)` / `_slStopCountdown()` — **wall-clock derived** (§6.1); recomputes on tick + on `visibilitychange`/`focus`; latches amber; fires time-up auto-submit.
- `_slExamNav(toIdx)` (prev/next/jump), `_slToggleFlag(idx)`, `_slRenderPalette()`, `_slRenderReview()`, `_slExamSubmit()`.
- `_slComputePace(results, roundMs, budgetMs, elapsedMs)` → `{ totalMs, deltaMs, onPace:bool, perRound:[{deltaMs, over}] }`; `_slRenderPaceBlock(host, pace)`.
  - **`totalMs` (the headline "your time") = `elapsedMs` = `budgetMs − remaining` at submit** (whole-session wall-clock). `deltaMs = budgetMs − totalMs` (positive = under par = "to spare"). `onPace = deltaMs >= 0`.
  - **Per-round bars** use `roundMs[i]` (active solving time on round i) vs that round's par (`estMinutes[i] × 0.9`). Time on the **review** screen and idle gaps are not attributed to any round, so `Σ roundMs ≤ totalMs` — that's expected; the headline figure is the source of truth for the pass/over verdict, the per-round bars are diagnostic only.
- Step render reused; exam footer (flag + Prev/Next) wraps it.

### 3.6 Pre-generation (NOT prefetch)
Exam mode **pre-generates all N rounds before the clock starts** — the two reasons practice's per-round prefetch is wrong here: (a) free navigation means any round can be opened first, and (b) the countdown must never be consumed by a mid-exam generation wait. One "Building your exam…" loader up front; the seed bank makes the fallback fast, so a slow/failed AI round degrades to a seed silently. If generation can't fill N rounds even from seeds (won't happen: 50 ≫ 10), start with the rounds available and log.

### 3.7 Session lifecycle
- **No cap** (Pro, unlimited) — exam mode never calls `_bumpPbqFreeRun`.
- **Leaving mid-exam** (topbar Leave / Back) → confirm once: *"Leave? Your exam ends and won't be scored."* → discard, Home. No resume in MVP.
- **No mid-session save/restore.**

---

## 4 · Free / Pro gating

| Surface | Free | Pro |
|---|---|---|
| Practice mode | full (1 session/day, 3/5 rounds) | full (unlimited, 3/5/10) |
| **Exam mode** | **locked → gate** | **unlimited, all round counts, full timing** |
| Pace report + flag-and-return | — | included with Exam |

**Pro gate copy** (the revenue tap; `_gateProOnly('Sim Lab', …)`, fired by tapping Exam toggle OR 10-round on free):
> **Title:** The real exam is timed. Practice that way.
> **Body:** Exam mode runs one clock across the whole session. Flag a PBQ, move on, come back, then review before you submit, just like the N10-009 PBQ section. Practice mode stays free and unlimited. Unlock Exam mode with Pro to train under real pressure.
> **Primary:** Unlock Exam mode · **Secondary:** Keep practicing (free)

**#4 paywall follow-up:** add one Pro bullet to the existing Sim Lab paywall — *"Exam mode · a real timed PBQ simulation with a pacing report"* — once built (the v7.55.1 paywall leads with the 3 working drills; this is the timed addition that the trifecta note flagged).

---

## 5 · Copy (ships verbatim; 4-stage-passed)
- Entry lede: "Practice to learn the format. Switch to Exam to feel the clock the way test day will."
- Mode toggle: Practice = "Relaxed · count-up timer"; Exam = "One clock · flag & return" + `Pro` tag.
- Budget readout: "Exam-pace budget · mm:ss" + note "Pro · one clock for all N rounds · budget mm:ss (tightened to exam pace)".
- Palette key: This round / Answered / Not yet / Flagged.
- Review: "Review before you submit" · "Tap any round to jump back. Flagged rounds are highlighted." · counts · "Back to flagged" / "Submit exam".
- Unanswered confirm: "N round(s) unanswered. Submit anyway?"
- Pace verdict (under par): "On exam pace ✓" + "m:ss to spare. On the real exam that leaves room to revisit a hard PBQ."
- Pace verdict (over par): "m:ss over exam pace" + "Round X ran long. On test day that's the round to triage: flag it and move."
- No em-dashes (middle-dot ·); no fabricated stats; semantic ✓/✗/→ only.

---

## 6 · Cross-platform (Desktop · Safari · iOS / iPad) — first-class

Exam mode raises the bar over practice mode because a **countdown** is timing-critical and the navigation is touch-heavy.

### 6.1 Countdown integrity (the crux — iOS/Safari)
- **Derive remaining from a wall-clock deadline, never decrement a counter.** `remaining = deadlineMs − Date.now()`, recomputed on every tick. iOS Safari throttles/suspends `setInterval` when the tab backgrounds or the device locks; a decrement-per-tick clock would freeze or drift. A deadline-derived clock is correct the instant the tab resumes.
- **Re-sync on resume.** Recompute remaining on `visibilitychange` (visible) and `focus`. If the deadline passed while backgrounded → run the time-up auto-submit immediately on return (authentic: the exam clock keeps running in the background, mirroring real test conditions).
- **Display cadence** is cosmetic (`setInterval` 1s or rAF) — only the *displayed* string is driven by it; the *truth* is always `deadlineMs`.
- **Throttled-tab note:** a backgrounded display may update coarsely; that's fine — the value is recomputed, not accumulated.

### 6.2 Touch targets & input
- **Palette squares** render at the mocked ~30px but MUST carry a **≥44×44pt hit area** (transparent padding) on touch; spacing must keep adjacent squares from mis-taps. Same for the **flag toggle**, **Prev/Next**, **review rows**, and **mode-toggle** segments (min 44×44pt).
- Rounds reuse the shipped per-gesture controller (`_slBindMovable`): **touch = tap-to-place, mouse/pen = drag**. Do not add drag-on-touch. iPad trackpad → pointer (drag); Apple Pencil → pen (drag).
- `fillin` keeps `inputmode="numeric"` (iOS number pad); focused inputs scroll above the keyboard; the countdown stays visible (sticky topbar) when the keyboard is up.

### 6.3 Layout / responsive
- Runner + review + verdict are narrow-centered `gnt-shell` — single column on phones; the palette wraps. Use `100dvh` + `env(safe-area-inset-*)` from the app shell; the sticky exam topbar (clock + palette) must respect the safe-area inset and not overlap the notch.
- iPad **portrait** → stacked; **landscape** → the shell stays centered (no 2-col needed for the runner).

### 6.4 Apple IAP gate (must-not-miss)
The Exam-mode gate (toggle + 10-round) MUST route through `_gateProOnly('Sim Lab', …)` so iOS shows the **IAP** CTA, not web Stripe. Reuse, never re-implement.

### 6.5 Motion (emil pass) — theme- and motion-safe
- Clock amber: `transition: color/border-color 220ms var(--ease)`; **no pulse/throb**; reduced-motion → instant swap. Verify light-theme `--warn` contrast (light warn is darker than dark).
- Ticking digits: **never** transition (changes every second).
- Palette square `:active { scale(0.94) }`; flag-dot appears `scale(0.6→1)` + opacity 150ms (never `scale(0)`).
- Round-to-round content: direction-aware cross-fade + ≤6px micro-slide, 200–220ms `var(--ease)`; reduced-motion → opacity only.
- Pace bars: animate `transform: scaleX()` (GPU, not `width`), 800–1100ms `var(--ease)`, stagger ~70ms, fire once via IntersectionObserver; the par tick is **fixed** (never animates); reduced-motion → final state instant.
- Entry rides the existing `.reveal` stagger. No `transition: all`. `:active scale(0.97)` on all other clickables; hover gated `(hover:hover) and (pointer:fine)`.

### 6.6 Verification
e2e across **chromium + webkit + mobile-safari**. The **real-device manual pass** (iPhone + iPad, portrait + landscape; lock the device mid-exam to confirm the clock kept time on resume; confirm the IAP CTA) is the founder-only check required before ship.

---

## 7 · Out of scope (deferred)
- Mid-exam resume / save-restore.
- Per-round time-limit variant (the model is whole-session only).
- Sec+/A+ exam-mode content (rides Plan 3 seed banks; the timing engine is cert-agnostic and works the moment a cert has a bank).
- Analytics beyond the Pace block + existing weak-spot persistence.

---

## 8 · Testing
- **e2e (`tests/e2e/sim-lab.spec.js`)**: free taps Exam → gated to Pro; Pro selects Exam → pre-generates all rounds (seed fallback) → clock starts; countdown derived from `deadlineMs` (mock `Date.now` forward → remaining recomputes; jump `Date.now` past deadline → auto-submit); flag toggles + palette reflects state; Prev/Next/jump persists per-round answers (edit, navigate away, return, answer retained); review lists answered/flagged/unanswered + counts; Submit scores all + verdict shows Pace; under-par → "On exam pace", over-par → coaching copy; unanswered confirm. Practice mode unchanged (regression).
- **UAT structural**: entry mode toggle present; `#page-sim-lab-result` pace markers; exam topbar clock + palette elements; `_slSession.mode === 'exam'` path; no `_bumpPbqFreeRun` in exam.
- **Wall-clock**: a `visibilitychange`/resume recompute test (simulate background by advancing `Date.now`).
- Copy carried verbatim from `mockups/sim-lab-exam-mode-concept.html`; layout lifted from it.

---

## 9 · Ship
Fast lane (drills JS + copy). `dg-system.css?v=` bump (new exam-mode classes). Cross-platform verify (chromium/webkit/mobile-safari) + the founder real-device pass (§6.6). Version bump via `scripts/bump-version.js`. Update the Sim Lab paywall bullet (§4) in the same ship.
