# Sim Lab — PBQ Drill Design Spec

**Date:** 2026-06-23
**Status:** Approved design, pre-implementation
**Research basis:** [docs/pbq-drill-voc-research.md](../../pbq-drill-voc-research.md) (verdict: BUILD, high confidence)
**Platforms:** Desktop web, Safari, and the iOS mobile app (PWA/wrapped webview). Every requirement below applies to all three.

---

## 1. Summary

Sim Lab is the third drill in CertAnvil, beside **Reword Gauntlet** and **Why-Not**. It drills **Performance-Based Questions (PBQs)** — the hands-on, multi-step part of the CompTIA exams that candidates fear most and that no competitor practices well. Candidates call PBQs "sims," hence the name.

**Scope of this MVP:** a lean, AI-generated PBQ drill covering five interaction types, two modes (Practice + Exam), built for Net+ first and rolled across all four CompTIA PBQ certs. It explicitly does **not** include full-fidelity simulators (live CLI, clickable router GUI, freeform topology canvas) — those are a later, conversion-earned tier.

**Cert applicability:** PBQs exist only on CompTIA Net+ (N10-008/009), Security+ (SY0-701), and A+ Core 1/2 (220-1101/1102). The four Microsoft/AWS certs (AZ-900, AI-900, SC-900, CLF-C02) have no PBQs; Sim Lab is **absent** in their context, never "coming soon."

---

## 2. Data structure — the PBQ Scenario (Model 1)

One PBQ = one **scenario** carrying 2–4 mixed sub-steps that each score independently. This mirrors the real exam ("each question entailing multiple steps") and makes partial credit natural.

```
Scenario {
  id:        string
  cert:      'netplus' | 'secplus' | 'aplus-core1' | 'aplus-core2'
  objective: string          // maps to the cert's objective map, e.g. '4.4'
  topic:     string          // e.g. 'SSL/TLS VPN'
  title:     string          // short scenario name
  scenario:  string          // prose setup the candidate reads first
  assets?: {                 // optional reference material the steps read
    logs?:     string[]      // monospace log/output lines
    table?:    { headers: string[], rows: string[][] }
    config?:   string        // monospace config/output block
    topology?: string        // text-described topology for MVP (no canvas)
  }
  estMinutes: number         // drives the Practice-mode pacing nudge threshold
  steps:      Step[]         // 2–4 steps
}

Step {
  id:          string
  type:        'order' | 'categorize' | 'match' | 'analyze' | 'fillin'
  prompt:      string
  payload:     <type-specific, see §3>
  answer:      <type-specific deterministic correct answer>
  explanation: string        // the "why" — hybrid-gated per §6
  points:      1             // MVP: every step worth 1
}
```

**Scoring rule (MVP):** each step is **all-or-nothing** — a step scores its point only if fully correct. Scenario score = `correctSteps / totalSteps` (e.g. 2/3 = 67%). This keeps scoring simple while delivering real partial credit across the scenario. Per-element partial credit within a step is a future enhancement, not MVP.

---

## 3. Interaction types (all five in MVP)

Each is AI-generatable as structured JSON and rides the existing engine. None require a freeform simulator.

**Input model (per-gesture):** the three drag-based types (`order`, `categorize`, `match`) decide per gesture from `pointerType` — a finger always taps-to-place, a mouse/pen can drag, and tap-to-place is the universal baseline (and keyboard path). No browser/OS detection. Both input layers write the same answer state; see §8. `analyze` (tap to select) and `fillin` (type) are identical on every platform.

| Type | Candidate does | `payload` | `answer` | Net+ archetype |
|---|---|---|---|---|
| `order` | Drag rows into correct order | `items[]` (shuffled) | `correctOrder[]` (ids) | ACL rule ordering, troubleshooting steps |
| `categorize` | Drag chips into buckets | `items[]`, `buckets[]` | `map { itemId: bucketId }` | media types, ports→zones, OSI layers |
| `match` | Connect left to right | `left[]`, `right[]` | `pairs { leftId: rightId }` | port→protocol, term→definition |
| `analyze` | Read a block, select line(s) meeting criteria | `lines[]` (ref `assets.logs/config`), `multi: bool` | `selected[]` (line ids) | log/output analysis, troubleshooting |
| `fillin` | Type the exact value | `fields[] { label, unit? }` | `accept[]` per field (normalized accepted strings/patterns) | subnetting (mask, usable hosts, ranges) |

**`fillin` normalization:** answers are normalized before comparison (trim, lowercase where safe, collapse whitespace, accept equivalent forms e.g. `255.255.255.192` and `/26` when both are valid for the field). Each field carries an explicit `accept[]` list/patterns from generation; never free-judge.

---

## 4. Two modes (both in MVP)

### Practice mode (free taster lives here)
- One scenario at a time.
- **Count-up timer** + **one soft pacing nudge** when elapsed crosses `estMinutes` ("You've spent N min here. Partial credit counts — lock in your best answer and move on.").
- Full hybrid feedback at end of scenario (§6).
- No flag-and-return (single scenario, nothing to return to).

### Exam mode (Pro)
- A timed **block of N scenarios** (default **N = 5**, configurable).
- One **block timer** (budget = sum of `estMinutes` + a small buffer; exact formula set in implementation).
- **Flag-and-return**: a tab strip across the block; candidate can flag a scenario, move on, and return — the rehearsal of the universal real-exam coping strategy.
- Feedback + an **end-of-block pacing report** (time per scenario, where time was lost) after submitting the block.

---

## 5. Engine integration

Reuses the Why-Not session pattern (`app.js`):
- A `simLabMode` flag riding the shared quiz engine (parallel to `whyNotMode`), so bank/spaced-review/Gauntlet/Why-Not contracts are unaffected (no penalty on quit, parallel to daily limits, etc.).
- A `_slSession` session object (mode, scenarios, current index, per-step answers, timers, flags).
- Reuses session chrome: topic strip, progress, end verdict screen.
- **Content generation:** an AI prompt keyed to the cert's objective map (e.g. `netplus.js`), returning the Scenario JSON, **validated client-side against the schema** before render. Same generation/metering model as Why-Not (`whyNotStart` → `_canMakeMeteredCall`). Invalid generations are rejected and retried, never rendered half-formed.

**The genuinely new code is the step renderer** for the five interaction types, plus the scenario/block orchestration and the pacing report. Everything else leans on existing plumbing.

---

## 6. Free / Pro gating

- **Free:** 1 Practice scenario per day — full fidelity, timed, scored. Metered via `STORAGE.PBQ_FREE_COUNT` + `_canMakeMeteredCall('Sim Lab')`, mirroring the free Gauntlet run. The daily count syncs through the existing cloud-store so it holds across devices (web + iOS).
- **Pro:** unlimited Practice, all of Exam mode, the pacing analytics, weak-spot tracking across scenarios. Gated via `_gateProOnly('Sim Lab', …)`.
- **Hybrid feedback (decided):** the free taster reveals the `explanation` **only for steps the user got wrong** (learn from your own miss). Full per-step teaching across unlimited scenarios + analytics is Pro.

**Gate copy** (draft, to be finalised with humanizer + marketing-psychology at build time): the Pro wall fires at peak motivation — right after the free scenario, when the candidate has just felt the gap. Frame it as "do this again, on every cert, until it's muscle memory," not "you can't see the answer."

---

## 7. Entry point

Third card on the **Drills page**, beside Reword Gauntlet and Why-Not, using the pattern already shipped for the Gauntlet card (v7.54.x): a **free-tier daily state pill** ("1 free PBQ today" / "done today") + the Pro upsell CTA. No new navigation.

---

## 8. Cross-platform requirements (Desktop · Safari · iOS app)

These are first-class, not an afterthought — three of five interactions are drag-based.

1. **Per-gesture input model over one shared answer state** — decided by `pointerType`, not by device/OS/browser. The three drag types (`order`, `categorize`, `match`) expose two input layers on top of a single answer-state model, and which one fires is decided **per gesture** from the Pointer Event:
   - **`pointerType === 'touch'`** → **tap-to-place only**: tap an item to pick it up, tap a target to drop it. A finger never initiates a drag, so the WebKit touch-drag bug class (touch-drag-vs-scroll, long-press selection/callout/loupe, momentum interference) is avoided by construction.
   - **`pointerType === 'mouse'` or `'pen'`** → **drag enabled** (Pointer Events + `setPointerCapture`, with a small movement threshold to distinguish a drag from a click). Emil-design-eng drag guidance applies (capture on drag start, pressed/active state, restrained settle motion).
   - **Tap-to-place is the universal baseline** — always available on every pointer type, and it is the same code path as keyboard operation.
   - **No browser/OS detection, no Safari special-case.** Safari spans the full pointer spectrum (desktop Safari = mouse, Mobile Safari = touch, iPad = touch *and/or* trackpad/pencil); keying on `pointerType` handles every case for free, including the iPad-with-trackpad device that a one-time media query would mis-bucket. On a device with both pointer types (iPad + trackpad, touchscreen laptop) the user can tap *or* drag interchangeably — neither is locked out.
   - Both layers write the same answer state, so scoring, validation, and feedback are written once — only the input layer differs.
2. **Tap-to-place doubles as the keyboard/accessibility path.** Map it to keys (focus item → Enter to pick up → focus target → Enter to drop), so a11y comes for free from the same adapter on every platform.
3. **Viewport stability.** Use `min-h-[100dvh]` (never `h-screen`) for full-height drill surfaces to avoid iOS Safari address-bar jump. Timers and the Exam-mode tab strip must stay visible without layout shift when the iOS keyboard opens for `fillin` fields.
4. **`fillin` on iOS.** Use appropriate `inputmode`/`type` (e.g. numeric/decimal for masks and host counts) so the right keyboard appears; never trap focus; the pacing nudge must not steal focus mid-typing.
5. **Touch hover.** Gate any hover affordance behind `@media (hover: hover) and (pointer: fine)`; provide an explicit pressed/active state on touch (`scale(0.97)`) for every interactive element (emil).
6. **iOS Pro gate compliance.** In the iOS app the Pro upsell must route through the **existing entitlement / IAP plumbing** (RevenueCat / Apple IAP), not a web Stripe checkout shown inside the app. Reuse the current Pro-gate component; do not introduce a new web-purchase CTA on the iOS surface.
7. **Reduced motion.** Honour `prefers-reduced-motion`: drag still works, but decorative entrance/settle animations collapse to instant. Any step-transition or feedback animation degrades gracefully.
8. **Reflow.** Two-column interactions (`match`, side-by-side buckets in `categorize`) reflow to a single column under ~`md`; the Exam-mode tab strip wraps/scrolls horizontally rather than overflowing.

---

## 9. Cert rollout

1. **Net+ first** — full engine, schema, all five interaction types, both modes, content keyed to `netplus.js` objectives.
2. Add **Sec+, A+ Core 1, A+ Core 2** as content/prompts against the same engine and schema. (Note: A+ PBQ archetypes have no first-person VOC yet — backfill that research before authoring the A+ banks; see research doc residual gaps.)
3. Microsoft/AWS certs: Sim Lab card **not rendered** (cert-aware gate).

---

## 10. Out of scope (this MVP)

- Live CLI terminal the candidate types commands into.
- Clickable SOHO/router GUI with tabs.
- Freeform drag-canvas topology builder.
- Per-element partial credit within a step.
- Willingness-to-pay validation (the 1/day cadence and Pro split are inferred from pain intensity; validate with a pricing/landing test post-launch).

These are the expensive, deterministic, per-cert "full-fidelity" tier, deliberately deferred until Sim Lab proves conversion.

---

## 11. Risks & open items

- **Generation quality is the core risk.** A PBQ scenario with a wrong/ambiguous `answer` is worse than no PBQ. Client-side schema validation catches malformed JSON, but not a logically-wrong answer. Mitigation: constrain generation tightly per type, prefer deterministic answer formats, and consider a seed bank of hand-reviewed scenarios per cert for the free taster rotation so the *first* impression is always correct.
- **Exam-mode timer budget formula** to be set in implementation (sum of `estMinutes` + buffer, vs a fixed budget).
- **A+ content** needs the VOC backfill before authoring.
- **Gate/taster copy** to be finalised through humanizer + marketing-psychology at build time.

---

## 12. Testing

- Unit: scoring (all-or-nothing per step, scenario aggregate), `fillin` normalization, schema validation rejects malformed scenarios.
- Interaction: shared answer state correct from both input layers for `order`/`categorize`/`match` — `pointerType: 'touch'` → tap-to-place; `'mouse'`/`'pen'` → drag (with click-vs-drag movement threshold); keyboard path works. `analyze`/`fillin` identical across platforms.
- Cross-platform: drag verified with mouse on desktop (Chromium + WebKit); tap-to-place verified on Mobile Safari / iOS app (`npm run test:ios`); a both-pointer case (simulated touch + mouse) confirms neither path is locked out; `fillin` keyboard behaviour on iOS; no layout shift on keyboard open; `100dvh` stability.
- Gating: free 1/day cap enforced and synced cross-device; Pro gate fires correctly; iOS gate uses IAP path.
- Modes: Practice pacing nudge fires at threshold; Exam mode flag-and-return + pacing report correct.
