# I passed Network+ — using a tool I built

> **STATUS**: Draft template · 2026-05-05 · fill in the prose voice, then publish as a blog post / X thread / LinkedIn post / Reddit r/CompTIA post on launch day. The launch checklist (`cert_mode_launch_checklist.md`) calls this out as **the single hardest piece of social proof to manufacture later** — write within 24 hours while feelings are vivid.

---

## The headline

**767/900 on Network+ N10-009 · sat 2026-05-05 · pass mark is 720**

47 points over the line. Not a squeaker.

---

## The 30-second version (for X / LinkedIn / hero copy)

> Just passed CompTIA Network+ N10-009 with 767/900 — built my own AI-generated practice quiz to study with. 320 hand-curated exemplars. 29 weak topics closed in the final week via real practice-test recalibration. Starting Security+ next, same tool. 🚀

(Hook: the tool exists, you used it on yourself, it worked. Not "I built a tool, here's why you should buy it.")

---

## The 3-minute version (blog post / Reddit r/CompTIA)

### What I built

> A static web app called **CertAnvil** — single HTML file, vanilla JS, AI-generated MCQs via Anthropic's API. No build step. No framework. Lives at [certanvil.com](https://certanvil.com). Question quality is what matters; everything else is plumbing.

### The numbers behind the pass

> - **320 hand-curated exemplars** in the few-shot quality bank, mapped to the N10-009 blueprint domain weights (23/20/19/14/24)
> - **7-layer validation pipeline** so AI-generated questions don't make stuff up — prompt self-verification, exemplar bank, AI second-pass on Sonnet, interrogative-stem gate, programmatic ground-truth, regression audit, Sonnet escalation
> - **29 weak topics closed** in the final week via Phase 3 Cycle recalibration (Jason Dion practice tests → I named gaps in my own words → app authored 3 fresh original exemplars per gap from the public blueprint)
> - **Daily Dion practice tests** in the final 8 days, each one feeding the next ship cycle
> - **51 ship cycles** in the cluster between v4.81.x and v4.85.27

### What worked

> 1. **Dogfooding > scanners.** I was the only user. Every UX failure surfaced from my own study sessions, not from synthetic tests. Users catch what scanners miss.
> 2. **Mockup-first.** 9 ships proven on the pattern: draft a standalone HTML mockup BEFORE touching feature code. 0 revision rounds across all 9. Mockup revision is cheap; code revision is expensive.
> 3. **Phase 3 recalibration cadence.** Quarterly was the original design. Pre-exam week became daily — the method scaled to "this morning's gap → shipped before lunch" loops.
> 4. **Legal discipline on content.** Zero paid-bank content (Jason Dion / CertMaster / Mike Myers / Kaplan) ever ingested. Every exemplar derived from the public CompTIA blueprint with documented authorship in git history.

### What I'd tell someone studying for Network+ N10-009

> [FILL IN: 2-3 sentences from your own experience. Things to consider:
> - The exam format surprises (3 of 9 PBQs were broken-topology diagnostic — keep talking about this, it's underdiscussed)
> - The single highest-impact study habit (Phase 3 cadence after each Dion test)
> - The "I almost gave up" moment if there was one
> - The specific topic that you struggled with longest]

### What's next

> **Security+ pack** — same engine, same method. The tool will host two certs: Network+ for whoever wants to use it, Security+ as my own study companion until I sit that exam.

---

## Choose your launch surface

Pick the platform(s) that feel right. Don't post the same copy verbatim across all of them — each has its own voice.

| Platform | Format | Vibe | Worth posting? |
|---|---|---|---|
| **X / Twitter** | Thread (5-8 tweets) | Builder voice, screenshots, score + journey | Yes — cert-prep founders cluster here |
| **LinkedIn** | Single post + image | Professional, accomplishment-framed, less "indie hacker" | Yes — cert credibility audience |
| **r/CompTIA** | Self-post, "I built a tool, passed using it" | Genuine builder share, NOT sales pitch | **Critical** — biggest cert-prep audience, hates selling, rewards genuine builds |
| **r/NetworkingStudents** | Same as r/CompTIA | Slightly more technical | Yes |
| **Personal blog / Substack** | Long-form (500-1500 words) | Write like you'd want to read it | Yes — owned audience, evergreen |
| **Hacker News** | "Show HN: I built X" | Builder-tools framing | Optional — different audience |

---

## Screenshots to capture (cheapest social proof)

- [ ] **The score itself** — phone photo of the result printout / Pearson VUE confirmation page
- [ ] **The app's readiness curve over the last 8 days** — Analytics page screenshot showing the climb
- [ ] **The 320-exemplar bank distribution** — Analytics → Domain Mastery card
- [ ] **The 29-gap Phase 3 ledger** — copy-paste of the relevant `reference_jason_dion_method.md` table rows
- [ ] **The pass-proof banner on the homepage** — proves the tool itself acknowledges the result publicly
- [ ] **Optional: a screen recording of the Diagnostic PBQ mockup** — show the broken-topology format you saw on the real exam

---

## Things to avoid

- "Buy my tool" framing — Reddit + HN will reject it. The "I built it for myself, it worked, here it is" framing is the trust path.
- Vague claims ("scored really high"). Cite the actual number. 767/900 is concrete.
- Underselling the engineering. The 7-layer validation pipeline + the Phase 3 method are genuinely interesting to a builder audience.
- Overselling future features. Don't promise Security+ will land in 2 weeks — say it's the next cert without a date.
- Anything that sounds AI-generated. This is your story; the prose should be yours.

---

## Suggested first publish

Target: **today or tomorrow** (within 24-36 hours of the pass while the feeling is vivid). Order:

1. **r/CompTIA self-post** (the linchpin — biggest cert-prep audience, rewards genuine builds)
2. **X thread** (builder audience, founders, dev twitter)
3. **LinkedIn post** (longer half-life, professional surface)
4. **Personal blog / Substack** (evergreen — drives organic traffic for months)

Each one a few hours apart so the day doesn't feel spammy.

---

*Template scaffolded by Claude · 2026-05-05 · refine the prose, hit publish, watch the trust signal compound*
