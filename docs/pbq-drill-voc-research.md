# PBQ Drill — Voice-of-Customer Research

**Date:** 2026-06-23
**Purpose:** Validate whether to build a dedicated "PBQ drill" (a third drill beside Reword Gauntlet + Why-Not) for CertAnvil, and define what it must do.
**Verdict:** **BUILD** — high confidence. Lean MVP first, Net+ built first, rolling across all four CompTIA PBQ certs.

> Scope constraint: PBQs exist **only** on the CompTIA exams — **Network+ (N10-008/009), Security+ (SY0-701), A+ Core 1 (220-1101) & Core 2 (220-1102)**. The four Microsoft/AWS certs (AZ-900, AI-900, SC-900, CLF-C02) have **no PBQs** on the real exam, so the drill must be simply **absent** in their context — never "coming soon."

---

## Method & evidence quality

Two-pass research. Pass 1 established direction across 5 slices (per-cert pain, exam-day write-ups, practice-tool gap). Pass 2 re-gathered **verifiable first-person quotes** because Reddit bot-walled the first pass.

- **31 confirmed-live quotes** (agent reached the page and saw the text verbatim); 13 promoted to copy-safe.
- **Access paths that worked:** Wayback snapshots of InfosecInstitute/TechExams forum threads, CompTIA CIN forums, YouTube "how I passed" comments (innertube API), one Medium Sec+ write-up. **Reddit stayed blocked** (didn't matter — other sources filled it).
- **Sourcing durability:** forum quotes live on `web.archive.org` (canonical threads are 410/closed). **Cite the exact Wayback URL** if a quote reaches public copy.

---

## The seven validated themes (by frequency × intensity)

1. **PBQs are the scariest, highest-stakes part — and feel nothing like the MCQs people studied.** Universal across Net+/Sec+/A+. The core emotional hook.
2. **Time pressure is the actual pass/fail lever, not knowledge.** PBQs load first, eat 5–15 min each; "ran out of time" is the classic failure.
3. **Underprepared because study teaches recall, PBQs demand hands-on application.** Mid-80s on MCQ practice, still fail PBQs.
4. **Named market hole** — free tools / Messer / Dion / CompTIA don't simulate PBQs well. *(Thinnest post-exam evidence; fine for internal direction, weak for a public claim.)*
5. **Hard archetypes are well-mapped per cert** — Net+: speed subnetting, topology/VLAN/ACL fault-finding. Sec+: firewall/ACL ordering, noisy log analysis, drag-drop zoning. A+: exact CLI syntax, SOHO config, Disk/RAID.
6. **Mechanical gotchas & ambiguity cost points independent of knowledge** — wording is the trap; the config itself is often easy.
7. **Partial credit + flag-and-return are the community-rallied coping strategies.**

### Key product insight
Multiple candidates say the *config itself is easy* — it's **parsing the question + learning the UI + the clock** that sinks them. This tilts the lean MVP toward **exposure / timing / wording** over deep config-fidelity simulation.

---

## Copy-safe quote bank (fetched & verified verbatim)

| Cert | Quote | Source |
|---|---|---|
| Sec+ | "the Performance-Based Questions (PBQs) were easily the hardest part of the exam… nothing like most of the multiple-choice practice questions I'd found online. If I had gone in blind to these formats, I might not have passed at all." | [Medium — Jared Medeiros](https://medium.com/@jaredpmedeiros/breaking-down-my-comptia-security-pbqs-what-actually-showed-up-on-test-day-37a63d4719ad) |
| Net+ | "I just failed my net+ exam because I spent way too much time on the PBQs at first. I had 8 pbqs, 80 questions total." | [YouTube](https://www.youtube.com/watch?v=RIlB57o86Uw) |
| Sec+ | "I'm network + certified and I remember I struggled thru performance based questions that time and that is the reason for my anxiety about simulations." | [InfosecInstitute (Wayback)](http://web.archive.org/web/20251116161930/https://community.infosecinstitute.com/discussion/133779/sy0-501-performance-based-questions) |
| Net+ | "the performance based questions are definitely odd and the real problem is trying to figure out what they are asking. With that said, the technology commands or changes you have to make are easy." | [InfosecInstitute (Wayback)](http://web.archive.org/web/20240421074251/https://community.infosecinstitute.com/discussion/118942/net-performance-base-question) |
| Sec+ | "some of the questions are really poorly written and I had to read them a couple times to even figure out what they meant. I think at one point I even said out loud 'what the heck are they talking about'." | [InfosecInstitute (Wayback)](http://web.archive.org/web/20260219104423/https://community.infosecinstitute.com/discussion/85812/performance-based-questions) |
| Sec+ | "My test… I had 3 performance based questions at the start… I didn't get a command line question, 2 were dragging items to a list and the last was looking at some log files and then selecting the one that met a certain criteria." | [InfosecInstitute (Wayback)](http://web.archive.org/web/20260219104423/https://community.infosecinstitute.com/discussion/85812/performance-based-questions) |
| Sec+ | "I passed with an 825 on Friday. I flagged all the performance questions for last. I made it through the normal multiple choice questions in like 30 minutes, and left myself an hour to do the six performance based questions. It took me 30 minutes on those six." | [InfosecInstitute (Wayback)](http://web.archive.org/web/20260219011635/https://community.infosecinstitute.com/discussion/99058/performance-based-questions) |
| Sec+ | "Remember to flag and move on if you aren't quite sure what the answer is. I remember flagging almost 20 questions. Don't be surprised if you ended up flagging many." | [InfosecInstitute (Wayback)](http://web.archive.org/web/20260219011635/https://community.infosecinstitute.com/discussion/99058/performance-based-questions) |
| Sec+ | "I had about five performance based questions right away, but decided to work through them because they were fairly simple. I believe that partial credit is awarded for these questions." | [InfosecInstitute (Wayback)](http://web.archive.org/web/20260219104423/https://community.infosecinstitute.com/discussion/85812/performance-based-questions) |
| Net+ | "I truly suggest you get familiar with the switching and routing commands that are on the objectives as you will almost definitely get a PBQ question that will have you use them. I only had 4 PBQs luckily but I recommend to skip them and knock out the multiple choice first." | [YouTube](https://www.youtube.com/watch?v=RIlB57o86Uw) |
| Sec+ | "took today passed with a 789 and this is with having to skip a pbq test was difficult high stress but God is good" | [YouTube](https://www.youtube.com/watch?v=usRjKBwhLjI) |
| Sec+ | "CompTIA really sucks at how they phrase their questions. I took the SEC+ exam and was pissed at how dumb they word them… which had me wondering what the question was actually asking. I did pass though." | [YouTube](https://www.youtube.com/watch?v=OHNbdxYQTpk) |
| Sec+ | "What Made It Hard: Noise. There were tons of irrelevant log lines. You had to filter the signal from the noise quickly." | [Medium — Jared Medeiros](https://medium.com/@jaredpmedeiros/breaking-down-my-comptia-security-pbqs-what-actually-showed-up-on-test-day-37a63d4719ad) |

---

## Drill requirements (derived from the pain)

**Lean MVP (cheap, AI-generatable — build first):**
- Format **exposure** — kill "first PBQ on test day."
- **Timed mode** that replicates PBQs-load-first ordering + per-question time burn, with **flag-and-skip-and-return** mechanics and pacing coaching.
- Drag/match/categorize/order + **log-analysis** item types.
- **Partial-credit-aware feedback** that scores each sub-step and explains *why* each placement/config is right or wrong.
- **Ambiguity / mechanics training** — terse scenario wording, read-the-last-line, Submit-not-Next reminders.

**Full-fidelity (expensive, deterministic, per-cert — earn it with conversion data):**
- Live CLI you type into (A+, Net+), clickable SOHO router GUI, firewall/ACL rule tables, subnetting speed-trainer, Disk/RAID, static-IP correction.

**Free vs Pro:** 1/day **full-fidelity timed single PBQ taster** (not watered down — the taster *is* the aha moment), rest gated to Pro (volume, exam-mode blocks, the why-feedback, the speed/CLI/log trainers).

---

## Residual gaps to backfill before relying on them

- **A+ has ZERO first-person evidence.** All verified quotes are Net+/Sec+. A+ Core 1/2 archetypes (CLI/RAID) are still assumption-based — **targeted backfill before building the A+ banks.**
- **"Submit-not-Next"/answer-locking** mechanic not directly attested — keep as a feature, don't quote it.
- **Named Messer/Dion call-outs** not verbatim-confirmed — don't make that a public claim.
- **No willingness-to-pay / conversion data** — the free/Pro split and 1/day cadence are inferred from pain intensity, not tested. Validate with a pricing/landing test.
