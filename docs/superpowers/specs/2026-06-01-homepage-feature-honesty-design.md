---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# Homepage feature-honesty overhaul · design

**Date:** 2026-06-01
**Scope:** `landing/index.html` (+ minimal `landing/script.js`). Brand: forged-bronze editorial (locked, `brand/BRAND.md`).
**Status:** Approved direction. Next: implementation plan (`writing-plans`).
**Predecessor:** ships on top of the pass-guarantee scrub (already merged to `main`).

---

## 1 · Problem

The homepage advertises a catalog of features that **no longer exist** in the quiz-only MVP, including a prominent `#proof-of-product` showcase with live **"Try it →"** buttons. This is live on prod and actively misleading.

### Ground truth (verified this session)
**Real / live MVP:** AI-generated questions (Free 20/day · Pro unlimited) with AI teaching explanations; Baseline Diagnostic; Pass Plan; readiness score + weak-spot analytics; spaced-repetition review; streak; **Full Exam Simulator (90Q timed, scored 100-900)** — across **8 live certs**: Network+ (N10-009), Security+ (SY0-701), A+ Core 1, A+ Core 2, AZ-900 (Azure Fundamentals), AI-900 (Azure AI Fundamentals), SC-900, CLF-C02 (AWS Cloud Practitioner). Confirmed by `landing/diagnostic/*/` dirs + `certs/*.js` packs + the live pricing page.

**Gone (do not claim as live):** Topology Builder, 3D Explorer, Packet Trace, CLI sim, ACL Lab/builder, Subnet Trainer, Network Builder, Acronym Blitz, Port Drill, OSI Sorter, Cable ID, Attack-to-Mitigation Match, IR Phase Sorter, Sec+ IR War Room, Phishing Triage.

**Coming soon (the ONLY roadmap items allowed on the homepage):**
- **PBQs** (CLI sim, topology builder, ACL builder) — already publicly committed on the live pricing page.
- **CCNA** — genuinely planned cert; keep ONE honest teaser, but drop the fabricated "~10 weeks / IOS CLI lab" specifics.

### The current homepage's specific lies
1. `#proof-of-product` (index.html ~1596-1735): a 4-cert-tab showcase selling Topology Builder / 3D Explorer / Packet Trace (N+) and Acronym Blitz + "shipping next" drills (S+) as live, with "Try the topology lab →" / "Try Acronym Blitz →" CTAs. Also labels **AZ-900 "being built"** (it's live) and shows only 4 certs (8 are live).
2. cert-desc (~1177): "interactive topology lab, a packet-trace simulator".
3. Two stale comment blocks (~1364-1389) describing `#proof-of-product` (TB/3D/packet/Acronym, "6s auto-rotate", "az900|ccna being forged", visual-contract refs). Confirmed: there is NO separate hero preview — these comments belong to `#proof-of-product` and get reworded as part of the section rebuild.
4. Comparison table rows: the vs-competitor "Hands-on questions (PBQs)" row (~2359) claiming "Real CLI sim, topology builder, ACL lab"; Free/Pro rows for "Drills…" (~2425), "Subnet Trainer + Network Builder + ACL Lab" (~2430), "Sec+ flagships (IR War Room, Phishing Triage)" (~2435).
5. FAQs: "Can I really study for free?" (~2391, lists drills/labs/war room as Pro) and "What's a PBQ?" (~2455, "we bake them in with a real CLI sim, a topology builder, and an ACL lab").

---

## 2 · Decisions (locked with founder)
- **Showcase:** Approach A — rebuild `#proof-of-product` around the **real engine + 8-cert breadth**.
- **Coming-soon policy:** PBQs only (feature) + CCNA (cert). Strip every other speculative feature. No fabricated dates/specifics.
- Honest framing is a net win: the product is **stronger on cert breadth** (8, not 4) and is a **serious AI question engine**, not a lab playground. It reinforces the just-shipped "Walk in knowing" readiness hook.

---

## 3 · The rebuilt `#proof-of-product` (Approach A)

**Keep:** the section `id="proof-of-product"` (the scoped CSS, the IntersectionObserver, and the `.pp-*` class system are reused). **Change:** the per-cert feature-tab model no longer makes sense (the engine is uniform across certs), so the 4 cert tabs + 4 per-cert content panels are replaced by: (a) a single real-engine feature showcase, and (b) a cert-coverage strip showing all 8 live + CCNA-soon.

### Information architecture
- **Eyebrow:** "Proof of product" (keep)
- **Title:** "What you'll actually use" (keep — now true)
- **Sub:** rewrite to "The diagnostic runs free in your browser, no signup. The same engine, across every cert we cover."

**Hero feature card (the engine):**
- Label: "The engine"
- Name: "AI questions that adapt to you"
- Desc: "Fresh questions generated every session across the full blueprint, never a recycled bank. Every answer comes with an explanation that teaches the why, not just the right letter."
- Foot prose: "Free: 20 a day, no card. Pro: unlimited." · CTA: "Start the free diagnostic →" → `/diagnostic` (a real, no-signup destination)

**Roster ("Also in every workspace"):** three real surfaces (reuse `.pp-roster` / `.pp-row`):
1. **Readiness score** — "One number tracks coverage and accuracy across the blueprint, so you know when you're ready to book." (ties to the readiness hook)
2. **Full Exam Simulator** — "A 90-question, 90-minute timed exam scored 100-900, mirroring the real CompTIA test." (Pro)
3. **Weak-spots + spaced repetition** — "The app maps your weak objectives and resurfaces them on a spaced-repetition schedule until they hold."

**Cert-coverage strip (replaces the cert tabs):** "Eight certs live, one engine." List the 8 live certs (Network+, Security+, A+ Core 1, A+ Core 2, AZ-900, AI-900, SC-900, CLF-C02). Then a single muted **"CCNA · in development"** teaser (no date/lab specifics) and a **"PBQs · coming soon"** feature note. Reuse `.pp-tab` dot styling (live/soon) or a compact chip grid; keep `[data-cert-notify]` only if a notify flow is desired for CCNA (else drop it).

**JS:** `initProofOfProductPanel()` (`landing/script.js:218-292`) is a content-agnostic tab machine. With the cert tabs removed it will find no `.pp-tab`/`.pp-content` and no-op safely, but to avoid dead code the plan should trim it to just the IntersectionObserver/reveal (or remove the tab/auto-rotate logic). Preserve `#proof-of-product` and `.pp-in`. Brand-illustrative `<symbol>`s that no longer map (pp-ic-tb topology, pp-ic-trace packet, pp-ic-fw, pp-ic-map) may be removed; reuse pp-ic-quiz / pp-ic-brain / pp-ic-badge for the new cards.

---

## 4 · The scrub (rest of the homepage)

- **cert-desc (~1177):** → "All five N10-009 domains. AI-generated questions with teaching explanations, a baseline diagnostic, weak-spot tracking, and an exam mode that mirrors the real 90-question test." (drop topology lab + packet-trace)
- **Section comment blocks (~1364-1389):** reword both to match the rebuilt section (drop TB/3D/packet/Acronym/"being forged"/visual-contract references and the cert-tab contract description). No separate hero preview exists.
- **vs-competitor PBQ row (~2358-2361):** REMOVE (cannot claim a not-built feature as a competitive edge). Optionally replace with a true differentiator row (e.g. "Explanations" — them: "right answer only" / us: "every answer teaches the why").
- **Free/Pro comparison table:** REMOVE the three fake-feature rows ("Drills…", "Subnet Trainer + Network Builder + ACL Lab", "Sec+ flagships"). ADD a real Pro differentiator row: **"Full Exam Simulator (90Q)"** — Free: No · Pro: Yes. (The table must match the live pricing Free/Pro split: Free = 20 q/day, diagnostic, Pass Plan, streak, spaced-repetition; Pro = unlimited, Exam Simulator, advanced analytics, PBQs-soon.)
- **"Can I really study for free?" FAQ (~2389-2391):** rewrite the second paragraph to the real split: Free is 20 fresh questions/day + diagnostic + Pass Plan + streak + spaced-repetition + analytics; Pro unlocks unlimited questions, the Full Exam Simulator, and advanced analytics. No drills/labs/war room.
- **"What's a PBQ?" FAQ (~2451-2456):** reframe to honest roadmap: PBQs are the hands-on exam parts (worth ~40%); they're the next thing being built (CLI sim, topology builder, ACL builder) and will land in Pro; for now the question engine + explanations cover the conceptual ground. Keep `pbq-simulator.svg` icon.

---

## 5 · Constraints
- Never edit `styles.css`. Section styles live in the scoped `.pp-*` block inside `landing/index.html`; `landing/script.js` and `landing/dg-system.css` are editable (no `?v=` bump needed unless `dg-system.css` changes — it won't here).
- OKLCH tokens both themes; Fraunces + Inter; no em-dashes (`·`); no emoji decoration; one bronze fill per surface (the hero feature card or its CTA is the focal accent, not multiple fills).
- Reuse the section's IntersectionObserver reveal + `.pp-*` scoped CSS where possible; don't introduce a parallel system.

## 6 · Implementation skills (founder standing request)
Route the rebuild through **ui-ux-pro-max** + **emil-design-eng** (the showcase layout/motion) and **copywriting** + **stop-slop** + **copy-editing** (all new copy). Verify **both themes** via the ecc Playwright MCP; rendered-DOM scan confirming none of the dead-feature names appear.

## 7 · Verification
- Grep: none of the dead-feature names (topology|packet|acronym|subnet|war room|phishing|3d explorer|CLI sim|ACL lab|port drill|OSI sorter|cable id) remain as **live-feature claims** in `landing/index.html` (PBQ + CCNA may remain only as explicitly-labelled "coming soon").
- Both-theme Playwright on the homepage: rebuilt showcase renders, cert strip shows 8 live + CCNA-soon, no "Try the topology lab" / "Try Acronym Blitz" CTAs, 0 console errors, tab machine doesn't error with tabs removed.
- Rendered-DOM: the showcase contains no present-tense claim of a non-existent feature.

## 8 · Out of scope
- No new feature development. No pricing changes. No changes to the cert app itself. No `styles.css`.
- The 71 pre-existing em-dashes elsewhere in `index.html` (separate consistency follow-up).
- Deeper cert-page / diagnostic copy beyond what's needed for accuracy here.
