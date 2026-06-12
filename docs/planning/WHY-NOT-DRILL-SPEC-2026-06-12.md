# Why-Not — Design Spec (second flagship drill)
**Approved by Simi 2026-06-12 ("im happy to build this out"). Mockups four-pass audited same day.**
**Research base:** `FLAGSHIP-DRILL-RESEARCH-2026-06-11.md` (Desktop), pain point 4 + drill #5. Deep dive: `~/.agent/diagrams/why-not-drill-deep-dive.html`.

## Product decisions (locked)
1. **A round = 1 question + 3 interrogations.** Phase one: a normal 4-option MCQ (existing quiz screens, untouched). Phase two: each wrong option returns one at a time and the user picks WHY it loses.
2. **Reasons are a menu, never free text.** Per wrong option: 1 true reason + 2 plausible fakes, all generated in the same AI call. Scoring is exact-match: instant, free, never argues. (The Gauntlet trick: AI in generation, dumb scoring.)
3. **Score is out of 4** — answer + 3 reasons. Verdict names the exact miss ("You knew the answer. You misdiagnosed why port 80 loses.").
4. **Fake-reason rule:** fakes must be factually FALSE about the option, not merely weaker arguments. Generation prompt rule + Report button covers the rest.
5. **Reason taxonomy (for coaching, Phase B):** different job · missing the must-have · wrong scope · true-but-not-BEST · wrong layer · overkill/overspend. The blind-spot chip surfaces the user's most-misdiagnosed type.
6. **Session shape: 3 rounds, fixed in v1 (locked with Simi, 2026-06-12).** A round = 4 scored decisions (answer + 3 reasons), so a session is 12 decisions, already 2.4x a Gauntlet run, at ~5-7 minutes. Rationale: end before fatigue (peak-end), depth-per-question IS the product, and the single-call generation stays small enough to validate reliably. "Next target" is the opt-in continuation. A session-length setting waits for proven demand (the SR session-size playbook). Symmetry: Gauntlet = 5 rungs deep on one concept; Why-Not = 3 rounds wide across one topic.
7. **Gating:** Pro-only at Start, same `_gateProOnly` pattern. Entry: Drills page flagship card (under the Gauntlet) + Home Practice option.
8. **Generation:** one metered `CLAUDE_MODEL` call per round; Gauntlet-style whole-round shape validation (malformed = friendly retry, nothing consumed). **Letterize option arrays at the boundary** (the v7.48.1 contract, UAT-pinned).
9. **Parallel to bank/SR** in v1, like the Gauntlet (no addToWrongBank writes during rounds).

## Full flow (locked with Simi, 2026-06-12 evening)
1. **Entry screen mirrors the Gauntlet's**: "Today's target: <weakest TOPIC>" via the same weak-spot data, "Pick a different topic" reuses the same topic list, Start carries the Pro gate. Same code paths (`getWeakTopic`, the gnt topic-picker pattern).
2. **Topic-level targeting, NOT concept-level** (the deliberate difference): the Gauntlet = one concept, five wordings (depth). Why-Not = 3 different questions inside the topic, wrong answers interrogated (breadth). No overlap between the flagships; matches the landing story.
3. Start → loading page → ONE metered call generates the whole session (3 questions + per-wrong-option reason sets), Gauntlet-style validation.
4. **Topic strip throughout** (reuse the v7.49 strip): "WHY-NOT · <TOPIC> · ROUND n OF 3".
5. Round = answer normally → 3 reason picks → round verdict ("You earned 3 of 4").
6. After round 3: session summary (x of 12 + blind-spot chip in Phase B) → "Next target" (next weakest topic) / "Different topic" / Home.
7. **No "Run it again"** retry: Why-Not has no crack condition; "Next round/target" always generates fresh questions.

## Build phases
- **Phase A (shippable alone):** generation + validation, reason-picker card (visual cousin of the Gauntlet verdict card), round scoring + verdict screen, entries, Pro gate, history/streak/goal hooks.
- **Phase B:** reason-type accuracy stat (the only new stored number) + blind-spot chip + weak-spot feed.
- **Phase C:** cross-pollination with the Gauntlet (blind spots steer topic picks; Why-Not as maintenance on cracked concepts).

## Mockups (four-pass audited, they ARE the pages)
- `mockups/why-not-drill.html` — ① reason picker (post-pick verdict, 4-segment round progress), ② round verdict (Fraunces "3 of 4", per-option rows, blind-spot chip), ③ Drills page with both flagship cards.
- `mockups/landing-flagship-drills.html` — **REPLACES the v7.48 #gauntlet landing section 1:1.** Simi's call: ONE Pro section for both flagships, not two. Shared headline ("The exam has two tricks. Now you have two drills."), two demo panels (condensed Gauntlet loop + Why-Not reason-pick loop, staggered), one CTA ("Go Pro — unlimited", the approved verbatim survivor).
- **Lift rules:** landing tokens MUST be scoped to the section id + dark block (landing :root is legacy purple); app screens use the starter-token values which match dg-system live tokens.

## Out of scope v1
Free-text reasons, per-option timers, Why-Not on PBQ types, multi-select questions (MCQ-only rounds), readiness integration.
