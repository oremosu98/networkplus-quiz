# Reword Gauntlet — Design Spec
**Approved by Simi, 2026-06-11 (late evening). Build: 2026-06-12.**
**Research base:** `FLAGSHIP-DRILL-RESEARCH-2026-06-11.md` (Desktop) — deep-research verified the #1 cross-cert failure mode: candidates memorize questions, real exams re-word concepts. The Gauntlet is the flagship answer.

## Product decisions (locked tonight)
1. **Run size:** ONE concept per run, 5 questions (rungs).
2. **Rung recipe:** Plain → Scenario → Best-of (BEST/MOST qualifier) → Not-trap (negation) → Twisted. Rung labels are visible — the user learns the trap taxonomy by name.
3. **Miss rule:** the run always finishes all 5 rungs (max learning). Concept **cracks only on 5/5**. Miss verdict names the rung type that got them ("the Not-trap got you") + one-tap **Run it again** which generates five FRESH wordings. The retry IS the anti-memorization demo.
4. **Concept selection:** app picks one testable concept from the user's weakest topic (existing weak-spot scores); entry shows "Today's target" + a "pick a different topic" link (topic list reuse). The AI picks the concept inside the topic during generation.
5. **Reward:** Cracked-concepts collection — `STORAGE.GAUNTLET_CRACKED` (array of {concept, topic, certId, date, attempts}), cloud-flushed like all progress (syncs iOS/Safari/desktop). Entry screen shows the count ("14 cracked"); cracking counts toward the daily streak; answered questions count toward Today's goal.
6. **Placement:** TOP hero card on the Drills page + Home bento tile in the Practice area (PRO pill) + landing-page section after the pricing teaser.
7. **Gating:** Pro-only, standard `_gateProOnly` card: "The Reword Gauntlet is a Pro feature". Free users see the locked tile/entry (funnel tease).

## Generation (Approach A — one call per run, approved)
- One `_claudeFetch` metered call (`CLAUDE_MODEL`, `_metered: true`) at Start:
  prompt = weakest topic + the cert's exemplar bank slice (style grounding) + the 5-rung recipe + "pick ONE precise testable concept inside the topic, then write the 5 rungs about THAT concept."
- Response: JSON `{ concept: "...", rungs: [5 × {question, options[4], answer, explanation, hinge}] }` — `hinge` is the word/phrase the rung pivots on, shown highlighted in feedback.
- Per-rung shape validation (same pattern as `_fetchRewordedVariants`); a malformed run → friendly error + retry, **nothing consumed/recorded**.
- Cert-agnostic guarantee: inputs are CERT_PACK topics + exemplars only. Every current and future cert has both ⇒ zero per-cert build.

## Screens (mockups tonight; lift pattern — mockups ARE the pages)
1. **Entry** — "Today's target: <weakest TOPIC>" (the precise concept is chosen by the AI at generation and revealed when the run starts), cracked-count, Start CTA, "pick a different topic" link, Pro pill context for free viewers.
2. **In-rung** — rung ladder (5 segments, current glowing), rung-type label, question via existing quiz components; post-answer feedback: right/wrong + explanation + hinge word highlighted.
3. **Cracked** — 5/5 celebration: seal stamp animation, concept added to collection, streak credit line, next-target CTA.
4. **Near-miss verdict** — "Cracked 4 of 5 — the Not-trap got you", rung breakdown, **Run it again** (fresh wordings) + "different concept" secondary.
5. **Landing section** (certanvil.com index, after pricing teaser) — headline family: "Memorized the practice test? The real exam re-words everything." + mini animated ladder demo + Pro CTA.

## Process hard rule (Simi)
Every surface — mockups AND build — goes through the four passes:
`/design-taste-frontend` (1) → `/emil-design-eng` motion/animation (2) → `/humanizer` (3) → `/marketing-psychology` (4).

## Platform + integration
- Single codebase; mobile lift design language <900px, classic desktop ≥900px (locked viewport-gate decision). New-surface rule applies: centered ~560px column allowed where no classic version exists.
- Entry points wired like existing drills (Drills page card = hero position; Home tile in Practice cell with PRO pill via `tier-free-only`).
- Quota: the run's generation call is metered (Pro = unlimited; global kill-switch applies).

## Edge cases
- Generation failure → error card + retry, nothing charged/recorded.
- Double-tap Start → in-flight guard.
- Anonymous/free → Pro gate card at every entry.
- Offline → entry gate with "needs a connection" note.
- Quit mid-run → no crack, no penalty; bank/SR untouched (Gauntlet is parallel to, not part of, the wrong-bank loop in v1).

## Out of scope for v1 (explicitly)
- Multi-concept chains, lives/sudden-death modes, readiness-score integration (#139 frozen), PBQ-style rungs, sharing the seal, free-tier teaser runs.

## Build-day checklist seed (2026-06-12)
Branch `feat/reword-gauntlet` (this one). Mockups in `mockups/reword-gauntlet*.html`. Fast lane unless quota/api files get touched. UAT pins to watch: drills-page shape tests, bento tile tests. Version target: v7.48.0.
