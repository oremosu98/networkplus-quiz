---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec, mobile]
---
# Mobile UI/UX Pass — Design Spec

**Date:** 2026-06-08
**Status:** Approved (brainstorming complete) → ready for implementation plan
**Branch:** `fix/desktop-audit` (folds in alongside the held desktop v7.34.0 commit; one combined ship)
**Lens:** onboarding (activation / clarity / time-to-value)
**Source:** `~/Desktop/CERT-PAGE-AUDIT-2026-06-07.md` (Part 1 + Part 2)

---

## 1. Context & goals

The cert-page audit found the **phone** experience is the weak spot: the first screen a new user
sees is an empty Exam-Readiness gauge with the "Start" action below the fold, the whole Home is
3.7 screens (4.6 in Safari), and several cross-cutting issues (an update banner that covers/blocks
primary buttons, a signed-out dead-end whose message renders ~2,675px off-screen, sub-44px tap
targets, and a buried Results CTA).

Desktop is already in good shape and got a separate polish (v7.34.0: empty readiness card compressed
+ PROD badge hidden). **This pass is mobile-first and must not regress desktop or the existing
mobile-fit work.**

**Primary goals**
1. New user's first phone screen leads with a clear **Start** action, not an empty gauge.
2. Cut phone Home from ~3.7 → ~1.4 screens.
3. Kill the signed-out dead-end, the banner overlap, the sub-44px targets, and the buried Results CTA.

---

## 2. Scope

**In scope (this batch)**
- Phone Home redesign (Option A) — phones only, ≤620px.
- Signed-out dead-end fix (inline prompt).
- Update banner → slim top strip.
- Custom Quiz panel tap-interception fix.
- Tap targets ≥44×44.
- Results: sticky primary CTA + larger "Fix this".
- Empty-Review copy fix.

**Out of scope (explicit)**
- Tablet (621–980px) Home redesign — roomier; revisit later.
- Desktop layout — untouched (only the already-shipped v7.34.0 readiness/PROD changes stand).
- Question-generation / per-question feedback track — the Correct/Incorrect + "Explain further"
  flow already exists; verifying it needs a real-generator harness, handled separately.
- Onboarding go-live flip — separate manual step; this pass improves the pre-onboarding state.

**Risk lane:** Fast lane (UI/CSS + non-schema JS). No DB/auth/SW/payments. → commit → main → CI → Vercel.

---

## 3. Design — Phone Home redesign (Option A)

**Applies only at `@media (max-width:620px)`** (the existing phone breakpoint where `.bento` is already
single-column). Desktop bento (≥981px) and tablet (621–980px) are unchanged.

### 3.1 Target order (top → bottom)
1. **Compact header** — cert id + streak/days-to-exam (existing `.cmd-bar`, kept compact).
2. **Start action** (`.cell-recommend` / `#primaryLaunch`) — moved to the top.
   - New user (no quiz history): label **"Start your first quiz"**, launches a **10-question mixed
     warm-up** (no weak-spot data exists yet).
   - Returning user: existing **Recommended / Smart pick** ("15-min Weak Spots" etc.) unchanged.
3. **Status strip** — readiness as a **single tappable line** ("Readiness 642/900 · 78% pass · ▸"
   → taps through to Progress/Analytics; "Readiness —/900 · take a quiz to unlock" when empty),
   plus the compact **Today's momentum** figure. Full readiness gauge does **not** render on phone Home.
4. **Quick Start** (`.cell-quick`) — **expanded** (Warmup / Daily Challenge / Drill mistakes).
5. **Practice** (`.cell-practice`) — **collapsed**, tap-to-expand.
6. **Exam Simulation** (`.cell-exam`) — **collapsed**.
7. **Drill by Domain** (`.cell-domains`) — **collapsed**.
8. **Custom Quiz** (`#custom-quiz-section`) — collapsed row (and fixed per §4.3).

### 3.2 Mechanism
- **Reorder** the existing bento cells on phones via CSS `order` on the grid items (no DOM move →
  desktop/tablet DOM and order untouched). Document the order values.
- **Readiness strip:** on phones, restyle `.cell-hero` / `#readiness-card-v2` into a one-line strip
  (hide the gauge/ring/bar/number block; show a compact summary line). Reuse the `is-pending` hook
  from v7.34.0 for the empty wording. The full card markup stays in the DOM for desktop.
- **Collapsible sections:** wrap each of Practice / Exam / Drill-by-Domain / Custom in a
  disclosure (native `<details>` or an existing accordion pattern) that is **only collapsible on
  phones** — on desktop/tablet they remain fully expanded as today. Default state on phone:
  Quick Start open; Practice/Exam/Drill/Custom closed. Chevron affordance + ≥44px tap header.
- **New-user Start target:** `#primaryLaunch` action resolves to the 10-Q mixed warm-up when
  `loadHistory().length === 0`; otherwise the current recommended/smart behaviour. (Confirm the
  exact preset id during planning.)

### 3.3 Success criteria
- First phone screen (428×926 PWA) shows header + Start + status strip + Quick Start, **no scroll**
  needed to reach Start.
- Home total ≈ **1.4 screens** at 428×926 (down from 3.69); materially shorter in Safari (428×745) too.
- Populated (has-score) and empty (no-score) states both correct.
- Desktop (1440×900) and tablet (768×1024) **pixel-unchanged** vs current.

---

## 4. Design — cross-cutting fixes

### 4.1 Signed-out dead-end (C)
When a signed-out user triggers a quiz start, render the existing "Sign in to study free: 20
questions a day, no API key needed" message **inline, directly under the control they tapped**, with
a one-tap **"Sign in to start free"** button — instead of writing it to `#setup-err` far down the
page. Applies wherever the start path is gated (Home Start, Quick Start items, quiz builder
"Generate Quiz"). No off-screen state.

### 4.2 Update banner → slim top strip (D)
Move the service-worker "New version available" banner from a bottom overlay to a **slim strip
directly under the header** ("Update available — tap to refresh"). It must not overlap or intercept
any content/CTA. This single change resolves the Home, quiz-builder, and Results-score overlaps
(audit 1.4 / 2.2 / 2A.2). Keep manual dismiss; keep the refresh action.

### 4.3 Custom Quiz panel tap interception (E)
The inline `#custom-quiz-section` disclosure, when open, overlaps and intercepts taps on the
control(s) beneath it. Fix so the expanded panel takes layout flow (pushes siblings down) and/or has
correct stacking — no invisible overlay catching taps. Verify the previously-blocked control is
tappable when the panel is open.

### 4.4 Tap targets ≥44×44 (F)
Pad to ≥44×44 (and add spacing where cramped):
- Top-row icon buttons (hamburger 33×33; settings/report/theme 37×33).
- Quiz confidence chips (39px tall).
- Results "Fix this →" buttons (36px).
- Banner/close "×" (31×31) — moot if §4.2 reshapes it, but ensure any close control is ≥44.
Touch-only where possible (don't bloat desktop controls unnecessarily).

### 4.5 Results — sticky CTA + bigger Fix-this (G)
On the Results screen (phone): pin the primary **"Start today's session →"** to a **sticky bottom
bar** so it's always reachable (it currently sits ~2 screens down), respecting the iOS home-indicator
safe-area inset. Enlarge the "Fix this →" buttons to ≥44px.

### 4.6 Empty-Review copy
Replace "Nothing here — no all answers." with **"No answers to show yet — finish a quiz to review it
here."** (and audit the other filter empty-states for the same broken pattern).

---

## 5. Constraints & conventions
- **Desktop & tablet unchanged** — every Home change scoped to `@media (max-width:620px)`; verify no
  diff at 1440×900 and 768×1024.
- **Preserve mobile-fit work** (v7.19.x) — no horizontal overflow; keep safe-area insets.
- **Version:** re-bump via `node scripts/bump-version.js` at ship time to cover the combined
  desktop+mobile scope (supersedes the interim v7.34.0 stub). Never hand-edit version surfaces.
- **Gates:** `node tests/uat.js` green; `tech-debt.js` no new breaches; pre-commit hook passes.
- **No new dead code / no new globals** beyond what the features need.

## 6. Files likely touched
- `index.html` — disclosure wrappers / strip markup (phone), banner strip container, Results CTA bar.
- `dg-system.css` and/or `styles.css` — phone `order`, readiness strip, collapsible sections, tap
  targets, sticky Results bar, top-strip banner.
- `app.js` — new-user Start target, inline sign-in prompt, banner mount position, copy string,
  Custom Quiz panel flow/stacking.
- `tests/uat.js` — add/adjust assertions for the new structures (strip, collapsibles, banner strip,
  inline prompt, sticky CTA, copy).

## 7. Verification plan (measure, don't eyeball)
Drive locally (worktree on a fresh port) at true, un-zoomed viewports (pin device metrics via CDP):
- **428×926 (PWA)** and **428×745 (Safari)**: Home screens-count before/after; Start within first
  screen; no horizontal overflow; tap-target rects ≥44; banner not overlapping; signed-out tap shows
  inline prompt in viewport; Results sticky CTA visible; collapsibles open/close.
- **Empty vs populated** Home states both correct (clear localStorage on localhost to simulate new).
- **Regression:** 1440×900 desktop and 768×1024 tablet visually identical to pre-change.
- UAT + tech-debt green; then (after ship) live cache-bust verify per CLAUDE.md.

## 8. Risks
- Reordering grid items with `order` can desync from any JS that assumes DOM order — verify scroll/
  focus and any "scroll to section" behaviour.
- Collapsibles must not hide content from desktop/tablet — scope the collapse strictly to ≤620px.
- Readiness strip must not break the populated gauge on larger screens (markup stays; only phone
  styling changes).

## 9. Out of scope (reminder)
Tablet Home redesign · desktop layout · question-generation/feedback verification · onboarding flip.
