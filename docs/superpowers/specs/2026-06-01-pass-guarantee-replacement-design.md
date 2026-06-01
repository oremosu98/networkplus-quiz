# Pass-guarantee replacement + site-wide scrub · design

**Date:** 2026-06-01
**Scope:** Landing site (`certanvil.com`) + two cert-app touchpoints. Brand: forged-bronze editorial (locked, see `brand/BRAND.md`).
**Status:** Approved direction. Next step: implementation plan (`writing-plans`).

---

## 1 · Why this exists

The founder has decided **not to honor a pass-guarantee**. The pricing page redesign already removed it from that surface. But the guarantee was doing **two** psychological jobs at once:

1. **Risk-reversal** ("you won't lose money") — now owned by the live **14-day money-back guarantee**.
2. **Efficacy signal** ("this actually gets you to a pass") — currently **orphaned**. This is the gap the replacement hook must fill.

It also still lives across **8 files** including the **legal Terms of Service**, creating a liability mismatch: marketing says no guarantee, the contract still promises one. This spec covers both the new hook and the full scrub.

### Locked facts (confirmed with founder this session)
- Founder passed **N10-009 at 767/900** — true; use the fact but **stay anonymous** (no personal byline).
- Social proof: **a handful, anecdotal** — not quotable yet. Reserve the slot; do not fabricate numbers.
- **14-day money-back is real and staying** — so the new hook must NOT duplicate risk-reversal.
- **Full Exam Simulator (90Q timed) is real and shipped** (`startExam()` at `app.js:6054`, timer at `:6189`, launcher at `index.html:472`). Pricing line is accurate; **no "Coming soon" pill needed**. PBQs already correctly carry the pill.

---

## 2 · The chosen hook: a 3-part stack

The homepage `#pass-guarantee` section is a full section (headline + supporting panel + CTA), so it carries the stack. Pricing gets one compact line.

### Hook #1 — "Walk in knowing" (efficacy / readiness) · PRIMARY
Reframes the guarantee's implicit promise into something 100% honorable: we show you *when you're ready*, you book on green instead of on a guess. Grounded in the real, unique, already-built readiness instrument. Psychology: Jobs-to-be-Done + Framing + Authority-via-instrument; quiet loss-aversion (don't waste a ~$369 voucher unready).

### Hook #2 — Founder-built credibility (anonymous, 767/900) · STACK
767 is barely over the 720 cut — that is an asset (Pratfall Effect): relatable, not intimidating. Psychology: Authority + Liking/Similarity + Pratfall. Used as a trust line under the headline and as the pricing trust element.

### Hook #3 — Free baseline diagnostic CTA · STACK
The section's single focal action. Psychology: Reciprocity + Zero-Price + Foot-in-the-Door + Endowment. Real value before payment, lowers activation energy.

### Parked / unchanged
- **Value anchor** ("less than one exam voucher") stays on pricing as-is — complements, doesn't replace.
- **Social proof** — slot reserved in the section design so a testimonial/number drops in later with no redesign. Not filled now.
- **Money-back badge** stays on pricing (risk-reversal). Not duplicated by the new hook.

---

## 3 · Proposed copy (brand-compliant: no em-dashes, `·` separators, Fraunces display / Inter UI, no emoji decoration)

> Copy is "proposed final" so the plan can implement directly. Run through `stop-slop` + `copy-editing` at implementation; wording may tighten but the substance is locked.

### Homepage section (replaces `#pass-guarantee`)
- **Section id rename:** `#pass-guarantee` → `#why-ready`. Every CSS selector currently prefixed `#pass-guarantee ...` must be rewritten to `#why-ready ...` (the `.pgx-*` class names themselves can stay unchanged). Also retarget the JS observer (`:1923`) and the `.pass-guarantee` class on the `<section>` element. Removing the literal `pass-guarantee` token from markup also clears any UAT regex risk.
- **Eyebrow:** `WHY CERTANVIL`
- **Headline (Fraunces, italic accent on 2nd line, reusing `.pgx-em` pattern):** `Walk in knowing.` / *`Not hoping.`*
- **Prose:** "Most people book the exam on a gut feeling. CertAnvil tracks every objective on the blueprint until it's closed, then gives you one honest readiness score. You book the test when it reads green, not when nerves say maybe."
- **Trust line:** "Built by someone who sat N10-009 and passed at 767/900, then built the prep they wish they'd had."
- **Right panel (repurpose the existing 3-numbered-step panel):**
  1. **Diagnose** — "A free baseline diagnostic maps your weak spots across the full blueprint."
  2. **Close the gaps** — "Targeted questions and an AI teacher work each weak objective until it holds."
  3. **Know you're ready** — "One readiness score tracks coverage to green, including a timed mock exam."
- **CTA (ghost / outline — no second bronze fill on the surface):** `Take the free baseline diagnostic →`
- **Panel foot (replaces guarantee fine print):** "No guesswork. The blueprint, closed."

### Comparison table (`landing/index.html`)
- Feature row label `Pass guarantee` → `Blueprint readiness score`
- "is-us" cell "We extend your Pro access until you pass" → "Tracks every objective to green before you book"
- Competitor cells unchanged (still the differentiator gap in our favor).

### FAQ (`landing/index.html`, replaces the guarantee FAQ)
- **Q:** "How do I know when I'm actually ready for the exam?"
- **A:** "Your readiness score tracks coverage and accuracy across every exam objective, including a full timed mock exam. When it reads green you've shown consistent mastery of the whole blueprint. That is your signal to book, instead of guessing."
- Remove the `assets/faq/pass-guarantee-badge.svg` reference; use an existing monoline/brand icon or drop the badge.

### Diagnostic results Pro pitch (`landing/diagnostic/results-core.js`)
- `:410` sub: replace `pass guarantee` with `14-day money-back` → "Unlimited AI · all certs · 14-day money-back · $9.99/mo or $89/yr"
- `:443` prose: drop "a pass guarantee," → "Pro launches soon with unlimited AI question generation, every cert, the full Exam Simulator, and advanced readiness analytics."

### Diagnostic landing bullet (`landing/diagnostic/index.html:182`)
- `✓ Pass guarantee` → `✓ 14-day money-back` (match sibling-bullet tone at implementation).

### Account page copy (`landing/account.html:452`)
- Remove the guarantee clause: "...unlocks the Passed badge on your cert tile + powers Pass-Guarantee eligibility. Always editable." → "...unlocks the Passed badge on your cert tile. Always editable."

### Account eligibility flow (`landing/lib/account.js:571-573`) — FUNCTIONAL
- Remove the entire eligibility banner branch: the `🛡 You're eligible for the Pass Guarantee...` div **and** the `Apply for Pass Guarantee →` button (which links to the now-deleted `/pricing.html#pass-guarantee` anchor — a dead link + broken promise + emoji violation). Read the surrounding template-string conditional and excise cleanly; ensure no dangling markup or empty conditional.

### Legal — Terms (`landing/terms.html`)
- **§05 "Pass guarantee"** clause → **replace** with a clean **"Refunds and money-back"** clause matching the live 14-day money-back offer on pricing.
- Anchor `#pass-guarantee` → `#refunds`; update the TOC entry (`:261`) and the in-text link from the billing section (`:306`).
- Billing description (`:306`): "...and the Pass Guarantee described in § 05." → "...with refunds covered in § 05." (Keep the accurate "Exam Simulator (90-Q timed)" mention.)
- Meta description (`:10`): remove "pass guarantee,".
- Acceptable-use clauses (`:404`, `:439`): "fraudulent pass-guarantee claims" → "fraudulent refund claims".

### Legal — Privacy (`landing/privacy.html:302`)
- Remove the "Pass-guarantee extension timestamp" data-field bullet (the field no longer exists after the account.js removal).

### Pricing trust element (`landing/pricing.html`) — ADD
- Add the founder trust line near the Pro CTA / footer: "Built by someone who passed N10-009 (767/900)." (small, muted). Money-back line and voucher anchor stay.

### Already consistent (no change)
- Cert-app `index.html:12` meta already says "Built by an exam-passer." — aligns with the founder hook.

---

## 4 · Brand + engineering constraints
- **Never edit `styles.css`.** The homepage section styles are inline-scoped in `landing/index.html` (selectors under the section id) — edit there. No `dg-system.css` change ⇒ **no `?v=` cache-bump needed.**
- OKLCH tokens, both themes verified. Fraunces (display) + Inter (UI). No em-dashes (`·`). No emoji decoration (the `🛡` goes). One bronze fill per surface — the section CTA is ghost/outline, not a second fill.
- Hero/figure numerals (none new here, but the "767/900" is inline body, not a hero figure — no lining-nums rule triggered).
- Reuse the section's existing reveal/IntersectionObserver wiring (`:1923`); just retarget the id.

## 5 · Verification (both themes, every surface)
ecc Playwright MCP is connected this session. Verify light + dark on: homepage new `#why-ready` section, comparison table + FAQ, pricing trust line, diagnostic results pitch, diagnostic landing bullet, account page, terms §05. Fallback: local `python3 -m http.server` in `landing/` + throwaway screenshot script (see handoff). Confirm zero console errors and no remaining `pass.?guarantee` string in rendered DOM via regex scan.

## 6 · Ship decision (deferred to founder — step 3)
Landing is fast-lane (UI/copy only; no schema/auth/money/SW). `dg-system.css` untouched ⇒ no cache bump. Push to `main` redeploys both Vercel projects; `landing/404.html` auto-serves on static 404s. **Do not push without explicit founder go.** The 404 + pricing redesign + this scrub can ship together or separately — founder decides after review.

---

## 7 · Out of scope
- No new social-proof content (parked until real traction).
- No pricing structure / price changes.
- No changes to `styles.css`, `dg-system.css`, or any gated-lane file (auth, supabase, cloud-store, sw, migrations).
- No cert-app UI changes beyond confirming the already-consistent meta line.
