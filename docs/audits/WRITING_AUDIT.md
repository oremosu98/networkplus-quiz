---
type: audit
status: active
cert: all
updated: 2026-06-29
tags: [audit]
---
# Writing Audit — Stop-Slop E2E Report

> Generated 2026-05-18 using the `stop-slop` skill (Hardik Pandya).
> Covers every user-facing string across cert-app + landing site + diagnostic flow.
> Tick items off as they ship. Group into releases alongside the EDITORIAL_AUDIT.md visual fixes.

---

## Pattern Legend

| Code | Pattern | Rule |
|---|---|---|
| EM | Em-dash | Replace with colon, semicolon, period, or comma. No em-dashes. |
| FL | Filler/adverb | Kill "actually", "just", "really", "honestly", "simply", "literally", "fundamentally" |
| BC | Binary contrast | "Not X. Y." / "not just X" / "rather X than Y" — state Y directly |
| FA | False agency | Inanimate things doing human verbs — name the actor or use "you" |
| VD | Vague declarative | Claims without specifics — name the specific thing |
| DF | Dramatic fragmentation | Staccato "[Noun]. That's it." / "X. Y. Z." — complete sentences |
| TC | Throat-clearing | "Here's the thing:", "It turns out", "Here's the real X" — cut to the point |
| BJ | Business jargon | "Navigate", "Deep dive", "Lean into", "Highest-leverage", "Low-friction" |
| PV | Passive voice | "was built", "is designed to", "are curated" — name who did it |
| RS | Rhetorical setup | "What if?", "Think about it:", "The whole point:" — state the point |
| LE | Lazy extreme | "every", "always", "never" doing vague work (not when factually accurate) |
| PE | Performative emphasis | "I promise", "Let that sink in", "because it's the right thing to do" |

---

## Priority 1 — Landing Homepage (21 findings)

The main marketing page. Highest traffic, first impression.

| # | Line | Text | Pattern | Fix |
|---|---|---|---|---|
| 1.1 | `index.html:170` | "Built and used by an exam-passer, not a textbook publisher." | BC | "Built and used by an exam-passer who scored 767/900." |
| 1.2 | `index.html:222` | "Master networking from the ground up." | FL | "Cover all 5 N10-009 domains." |
| 1.3 | `index.html:259` | "...retuned for the SecOps domain — with the IR War Room and Phishing Triage drills you won't find anywhere else." | EM, LE | "...retuned for SecOps. Includes the IR War Room and Phishing Triage drills." |
| 1.4 | `index.html:274` | "...retuned for Azure — with first-party Microsoft Learn references in every explanation." | EM, LE | "...retuned for Azure. First-party Microsoft Learn references in explanations." |
| 1.5 | `index.html:289` | "...for engineers who want to actually configure gear, not just memorise it." | EM(x2), FL, BC | "...for engineers who want to configure gear, not memorise it." |
| 1.6 | `index.html:304` | "...the services you'll actually be tested on — not toy examples." | EM, FL, BC | "...the services on the exam." |
| 1.7 | `index.html:319` | "...networking, compute — exactly what you need to run Azure in production." | EM | "...networking, compute: what you need to run Azure in production." |
| 1.8 | `index.html:345` | "Not just a quiz with a fancy intro — you get a topology lab..." | BC, EM, FL | "A topology lab, packet-trace simulator, and drill engine that run in your browser." |
| 1.9 | `index.html:387` | "...The same kind of lab you'll see on the exam — but you can mess it up..." | EM | "...The same kind of lab on the exam, except you can mess it up..." |
| 1.10 | `index.html:429` | "...to actually see how layers map to your devices." | FL | "...to see how layers map to your devices." |
| 1.11 | `index.html:462` | "The 'show me what's happening' tool you wished you had in class." | RS | "A visual frame-by-frame debugger." |
| 1.12 | `index.html:545` | "...with Microsoft Learn references baked into every explanation." | EM, LE, PV | "...with Microsoft Learn references in explanations." |
| 1.13 | `index.html:597` | "We'd rather over-deliver on a few cases than under-deliver on the brand promise." | BC | "If you're on the fence, reach out and we'll work with you." |
| 1.14 | `index.html:611` | "Every cert here was studied for, sat for, and passed." | PV | "I studied for, sat, and passed every cert on this platform." |
| 1.15 | `index.html:611` | "...not the kind a generic study app would spit at you." | EM, BC | "...closer to the real thing than a generic study app." |
| 1.16 | `index.html:620` | "Questions actually get checked" | FL | "Questions get checked before you see them" |
| 1.17 | `index.html:621` | "...it goes through seven separate checks — including a second AI pass..." | EM, DF | "Every question goes through seven checks, including a second AI pass and a factual-correctness gate." |
| 1.18 | `index.html:626` | "'Feeling ready' is a terrible predictor." | RS | "Subjective readiness is unreliable." |
| 1.19 | `index.html:640` | "Got questions? Here's the honest answers." | TC, FL | "Questions and answers" |
| 1.20 | `index.html:680` | "Honestly, a static bank isn't a bad thing..." | FL | "A static bank isn't a bad thing..." |
| 1.21 | `index.html:838` | "Same form &mdash; your account gets created automatically." | EM | "Same form; your account gets created automatically." |

- [x] Ship: bundle with landing copy sweep

---

## Priority 2 — Diagnostic Results Pass Plan (12 findings)

The densest cluster. Every student reads this after their diagnostic.

| # | Line | Text | Pattern | Fix |
|---|---|---|---|---|
| 2.1 | `results.html:149` | "Ask the sender to share a fresh link, or take your own diagnostic to see your baseline." | FL | "Ask the sender for a fresh link, or take the diagnostic yourself." |
| 2.2 | `results.html:150` | "Take the diagnostic yourself to see what an honest baseline looks like." | VD | "Take the diagnostic to see your baseline." |
| 2.3 | `results.html:183` | "It looks like you haven't taken the Network+ baseline diagnostic in this browser session." | TC | "No results in this browser session." |
| 2.4 | `results.html:232` | "Closer than you think." | RS | "Close to pass." |
| 2.5 | `results.html:233` | "Honest baseline." | DF | "Starting baseline." |
| 2.6 | `results.html:232` | "You're 1-2 weak domains away from pass. Drill those topics deliberately..." | FL | "1-2 weak domains separate you from pass. Drill those topics for 2-4 weeks." |
| 2.7 | `results.html:233` | "...most students start here and reach pass in 6-8 weeks of focused study." | VD | "6-8 weeks of focused study typically closes the gap." |
| 2.8 | `results.html:302` | "Even strong baselines have asymmetry · your real exam will too." | BC | "Strong baselines still have weak corners. Your exam tests all domains." |
| 2.9 | `results.html:329` | "Don't let cold-start decay erode the lead." | BJ | "Don't lose momentum by waiting too long." |
| 2.10 | `results.html:327` | "...it just rehearses the wrong answers." | FL, FA | "You'll rehearse wrong answers." |
| 2.11 | `results.html:332` | "You're at the right band to start pressure-testing with full-length simulations." | BJ | "You're ready for full-length simulations." |
| 2.12 | `results.html:752` | "...your diagnostic results will land in your profile automatically." | FA | "Your diagnostic results transfer to your profile on sign-in." |

- [x] Ship: bundle with diagnostic copy sweep

---

## Priority 3 — Cert-App Recommendations + Toasts (14 findings)

The Today's Plan engine, recommendation cards, and toast messages users see daily.

| # | Line | Text | Pattern | Fix |
|---|---|---|---|---|
| 3.1 | `app.js:4842` | `reason: 'Highest-leverage minute of study you can do today'` | BJ | `'Re-encounter forgotten material before it fades further'` |
| 3.2 | `app.js:4997` | `'% → 80% · highest-leverage gap'` | BJ | `'% → 80% · biggest gap'` |
| 3.3 | `app.js:5155` | `eyebrow: 'Highest-leverage focus'` | BJ | `eyebrow: 'Biggest gap'` |
| 3.4 | `app.js:4216` | `'...ACL ordering is the most-confused firewall concept — build the muscle now.'` | EM | `'...ACL ordering is the most-confused firewall concept. Build the muscle now.'` |
| 3.5 | `app.js:4818` | `reason: 'Calibrated baseline before you start drilling — biggest single signal'` | EM | `'Calibrated baseline before you start drilling. Biggest single signal.'` |
| 3.6 | `app.js:5104` | `reason: 'You\'ve mastered the drills — try the exam-format PBQ'` | EM | `'You\'ve mastered the drills. Try the exam-format PBQ.'` |
| 3.7 | `app.js:5400` | `reason: 'Layer placement is a constant on N10-009 — start at the bottom'` | EM | `'Layer placement is a constant on N10-009. Start at the bottom.'` |
| 3.8 | `app.js:5453` | `reason: 'Cabling is N10-009 1.5 — pure rote that becomes muscle memory'` | EM | `'Cabling is N10-009 1.5. Pure rote that becomes muscle memory.'` |
| 3.9 | `app.js:1066` | `showSuccessToast('Link copied — paste it in a desktop browser')` | EM | `'Link copied. Paste it in a desktop browser.'` |
| 3.10 | `app.js:1068` | `showErrorToast('Copy failed — link is: ' + url)` | EM | `'Copy failed. Link is: ' + url` |
| 3.11 | `app.js:5525` | `sub: 'Targets your weak area: '` | FA | `sub: 'Focused on your weak area: '` |
| 3.12 | `app.js:15650` | `'Clustered by cause — fix the pattern, not just the topic.'` | EM, FL, BC | `'Clustered by cause. Fix the pattern, not only the topic.'` |
| 3.13 | `app.js:2423` | `'Almost there — push through!'` | EM | `'Almost there. Push through.'` |
| 3.14 | `app.js:18021` | `'${PT_DATA.length} curated scenarios...'` | PV, BJ | `'${PT_DATA.length} scenarios...'` |

- [x] Ship: bundle with cert-app copy sweep

---

## Priority 4 — Cert-App Page Descriptions (index.html) (13 findings)

Static page subtitles, section descriptions, settings copy.

| # | Line | Text | Pattern | Fix |
|---|---|---|---|---|
| 4.1 | `index.html:211` | "Fifteen focused minutes now compounds more than an hour tomorrow." | BC, VD | "Start with fifteen minutes today." |
| 4.2 | `index.html:296` | "Items resurface on a growing schedule until they stick." | FA | "Each card comes back on a growing interval." |
| 4.3 | `index.html:319` | "Complete your first quiz to activate your readiness score." | FA | "Complete your first quiz to see your readiness score." |
| 4.4 | `index.html:382` | "Daily-habit fuel · low-friction wins" | BJ | "Daily habit · quick wins" |
| 4.5 | `index.html:957` | "...items reschedule based on your last review and resurface when due." | EM, FA | "Each card is rescheduled based on your last review and reappears when due." |
| 4.6 | `index.html:1281` | "Drills for the rote parts of Network+ — muscle memory and tool-recognition." | EM | "Drills for the rote parts of Network+: muscle memory and tool recognition." |
| 4.7 | `index.html:1346` | "The tools that trip people up most." | FA, LE | "The tools people find hardest." |
| 4.8 | `index.html:1665` | "Walk a real incident through PICERL — Preparation..." | EM | "Walk a real incident through PICERL: Preparation..." |
| 4.9 | `index.html:1699` | "...voice, and QR — every form Sec+ tests." | EM, LE | "...voice, and QR: the forms Sec+ tests." |
| 4.10 | `index.html:1889` | "Goals, exam date, and at-a-glance status — the inputs that shape your daily study cadence." | EM, FA | "Goals, exam date, and at-a-glance status. These set your daily study cadence." |
| 4.11 | `index.html:1905` | "Powers the days until exam countdown...Set it — keep your study pressure honest." | EM, FA | "Drives the days-until-exam countdown...Set it to keep your study pressure honest." |
| 4.12 | `index.html:1957` | "...current state is auto-snapshotted first — so you can roll forward again." | EM | "...current state is auto-snapshotted first, so you can roll forward again." |
| 4.13 | `index.html:1974` | "Cannot be undone via Edit menu — only via Automatic Backups in S 02." | EM | "Cannot be undone via Edit menu. Use Automatic Backups in S 02 to recover." |

- [x] Ship: bundle with cert-app page copy sweep

---

## Priority 5 — Landing Secondary Pages (8 findings)

Pricing, privacy, terms, account, analytics pages.

| # | Line | Text | Pattern | Fix |
|---|---|---|---|---|
| 5.1 | `pricing.html:150` | "Everything unlimited. Pass guarantee. The full prep stack." | DF | "Unlimited questions, pass guarantee, and the full prep stack" |
| 5.2 | `pricing.html:215` | "We'd rather over-deliver...than under-deliver on the brand promise." | BC | "If you're unsure, reach out and we'll work with you." |
| 5.3 | `pricing.html:259` | "Same form &mdash; your account gets created automatically." | EM | "Same form; your account gets created automatically." |
| 5.4 | `privacy.html:236` | "Email, quiz history, billing state, and real-user performance metrics. That's it." | DF | "Email, quiz history, billing state, and real-user performance metrics. Nothing else." |
| 5.5 | `privacy.html:406` | "...because it's the right thing to do." | PE | "...because consistent data rights are simpler to maintain." |
| 5.6 | `terms.html:250` | "...the boring-but-real legal bits at the bottom." | FL | "...and the legal framework at the bottom." |
| 5.7 | `account.html:135` | "Profile, billing, security, and data — across every cert you study." | EM, LE | "Profile, billing, security, and data for all your active certs." |
| 5.8 | `analytics.html:132` | "One dashboard for every cert you're studying..." | LE | "One dashboard for all your active certs..." |

- [x] Ship: bundle with landing secondary sweep

---

## Priority 6 — Guided Labs Pedagogical Text (10 findings)

Terminal lab intro/wrap prose in app.js. Seen once per lab visit.

| # | Line | Text | Pattern | Fix |
|---|---|---|---|---|
| 6.1 | `app.js:13781` | "Here's the real magic. +trace makes dig walk the full recursive chain live..." | TC | "+trace makes dig walk the full recursive chain live..." |
| 6.2 | `app.js:13790` | "The whole point: hop 1 of every traceroute from your machine is literally the router on your desk." | RS, FL | "Hop 1 of every traceroute from your machine is the router on your desk." |
| 6.3 | `app.js:13790` | "We'll trace how packets actually leave your machine..." | FL | "We'll trace how packets leave your machine..." |
| 6.4 | `app.js:13814` | "...you've just seen a bunch of these ports actually DO something..." | FL(x2) | "...you've seen these ports DO something..." |
| 6.5 | `app.js:13820` | "We'll peel back HTTPS and watch the TLS handshake actually happen..." | FL | "We'll peel back HTTPS and watch the TLS handshake happen..." |
| 6.6 | `app.js:13835` | "ARP is how Layer 3 (IP) actually reaches Layer 2 (MAC)." | FL | "ARP is how Layer 3 (IP) reaches Layer 2 (MAC)." |
| 6.7 | `app.js:13805` | "This is the lab that makes 'port 443 = HTTPS' stop being a flashcard and start being muscle memory." | FA | "After this lab, 'port 443 = HTTPS' is muscle memory, not a flashcard." |
| 6.8 | `app.js:13820` | "This is the lab that turns 'PKI' from a textbook acronym into something you've seen with your own eyes." | FA | "After this lab, 'PKI' is something you've seen, not a textbook acronym." |
| 6.9 | `app.js:9173` | `label: 'Deep diver'` (milestone) | BJ | `label: 'Curious mind'` |
| 6.10 | `app.js:2890` | "This is what most offices below ~30 people actually run." | FL | "This is what most offices below ~30 people run." |

- [x] Ship: bundle with cert-app copy sweep

---

## Priority 7 — Feature Module Copy (10 findings)

Subnet trainer, port drill, topology builder, phishing triage, diagnostic quiz.

| # | Line | Text | Pattern | Fix |
|---|---|---|---|---|
| 7.1 | `subnet-trainer.js:823` | "Your weakest categories — drill these now" | EM | "Your weakest categories. Drill these now." |
| 7.2 | `subnet-trainer.js:837` | "Haven't touched in a while — refresh these" | EM | "Haven't touched in a while. Refresh these." |
| 7.3 | `port-drill.js:117` | "HTTP and HTTPS — the foundation of the modern internet." | EM, VD | "HTTP (port 80) and HTTPS (port 443)." |
| 7.4 | `port-drill.js:181` | "BGP — the protocol that runs the internet." | EM, VD | "BGP: the routing protocol between autonomous systems." |
| 7.5 | `phishing-triage.js:445` | "Caller-ID can be spoofed — never trust alone" | EM | "Caller-ID can be spoofed. Never trust it alone." |
| 7.6 | `topology-builder.js:2586` | "...should be connected to at least one cable — orphan devices look like mistakes." | EM | "...should be connected to at least one cable. Orphan devices look like mistakes." |
| 7.7 | `topology-builder.js:2600` | "...must connect through a firewall — never directly to a switch or endpoint." | EM | "...must connect through a firewall. Never directly to a switch or endpoint." |
| 7.8 | `topology-builder.js:2649` | "...should never wire straight to the cloud — put a firewall or router in the path." | EM | "...should never wire straight to the cloud. Put a firewall or router in the path." |
| 7.9 | `quiz.html:699` | "Same quality, same scoring." | VD | "Scoring is identical." |
| 7.10 | `quiz.html:777` | "Generating your questions..." | FA | "Building your question set..." |

- [x] Ship: bundle with feature module copy sweep

---

## Priority 8 — Diagnostic Quiz + Intake (6 findings)

| # | Line | Text | Pattern | Fix |
|---|---|---|---|---|
| 8.1 | `diagnostic/index.html:76` | "We'll map your weak spots and build a Pass Plan." | FA | "You get a weak-domain map and a Pass Plan." |
| 8.2 | `diagnostic/quiz.html:75` | "Preparing your diagnostic..." | FA | "Loading questions..." |
| 8.3 | `diagnostic/quiz.html:76` | "Generating 20 fresh questions across the 5 Network+ domains." | FA | "20 questions across the 5 Network+ domains." |
| 8.4 | `diagnostic/quiz.html:805` | "...so you can still take the diagnostic." | FL | "Using the local pool for this attempt." |
| 8.5 | `diagnostic/results.html:857` | "...and your spam folder, just in case" | FL | "...and spam folder" |
| 8.6 | `diagnostic/results.html:231` | "full-load confidence" | BJ | "to confirm" |

- [x] Ship: bundle with diagnostic copy sweep

---

## Priority 9 — Cross-Cert Analytics JS + Landing Libs (8 findings)

| # | Line | Text | Pattern | Fix |
|---|---|---|---|---|
| 9.1 | `cross-cert-analytics.js:95` | "Foundation cert — opens the door to CCNA, AWS networking, and beyond." | EM, VD | "Foundation cert. Leads to CCNA, AWS networking, and cloud tracks." |
| 9.2 | `cross-cert-analytics.js:111` | "Builds on N+ — 65% knowledge transfer from Network+." | EM | "Builds on N+. 65% knowledge transfer from Network+." |
| 9.3 | `cross-cert-analytics.js:232` | "Maintenance practice — keep your knowledge sharp for related certs" | EM | "Maintenance practice. Keep your knowledge sharp for related certs." |
| 9.4 | `cross-cert-analytics.js:394` | "Upgrade to Pro to unlock — 65% transfers from Network+" | EM | "Upgrade to Pro to unlock. 65% transfers from Network+." |
| 9.5 | `account.js:365` | "Backdate fine — we believe you" | EM | "Backdate fine. We trust your date." |
| 9.6 | `account.js:283` | "No certs unlocked yet — pick a cert and start studying first." | EM | "No certs unlocked yet. Pick a cert and start studying." |
| 9.7 | `script.js:171` | "'Got it — confirmation sent.'" | EM | "'Got it. Confirmation sent.'" |
| 9.8 | `auth.js:234` | "Same form — your account gets created automatically." | EM | "Same form; your account gets created automatically." |

- [x] Ship: bundle with landing JS copy sweep

---

## Priority 10 — Cert-App Mobile Nudge Copy (3 findings)

| # | Line | Text | Pattern | Fix |
|---|---|---|---|---|
| 10.1 | `index.html:2053` | "...for the best experience." | LE | "Use a laptop or external monitor." |
| 10.2 | `index.html:2419` | "...for the full effect." | LE | "Use a laptop or external monitor." |
| 10.3 | `index.html:750` | "PBQs are weighted 3-4x on the real exam. Build the muscle now." | PV, DF | "PBQs carry 3-4x weight on the real exam. Start practising now." |

- [x] Ship: bundle with cert-app copy sweep

---

## Metrics

| Category | Count |
|---|---|
| Em-dashes (EM) | ~48 |
| Filler/adverbs (FL) | ~18 |
| False agency (FA) | ~14 |
| Binary contrasts (BC) | ~8 |
| Vague declaratives (VD) | ~7 |
| Business jargon (BJ) | ~7 |
| Dramatic fragmentation (DF) | ~5 |
| Passive voice (PV) | ~4 |
| Lazy extremes (LE) | ~7 |
| Throat-clearing (TC) | ~3 |
| Rhetorical setups (RS) | ~3 |
| Performative emphasis (PE) | ~1 |
| **Total unique findings** | **~105** |

---

## Suggested Ship Order

| Ship | Scope | Est. time | Pairs with |
|---|---|---|---|
| Copy sweep 1 | P1 landing homepage (21 fixes) | 30 min | EDITORIAL_AUDIT P4 (landing emoji) |
| Copy sweep 2 | P2 diagnostic results Pass Plan (12 fixes) | 20 min | — |
| Copy sweep 3 | P3 cert-app recommendations + toasts (14 fixes) | 20 min | EDITORIAL_AUDIT P1 (global primitives) |
| Copy sweep 4 | P4 cert-app page descriptions (13 fixes) | 20 min | EDITORIAL_AUDIT P2 (uncovered pages) |
| Copy sweep 5 | P5 landing secondary pages (8 fixes) | 15 min | EDITORIAL_AUDIT P5 (landing de-purple) |
| Copy sweep 6 | P6 + P7 guided labs + feature modules (20 fixes) | 25 min | EDITORIAL_AUDIT P3 (cert-app emoji) |
| Copy sweep 7 | P8 + P9 + P10 diagnostic + analytics + mobile (17 fixes) | 20 min | — |

---

## Already Clean (confirmed)

These areas had zero slop findings:
- [x] `landing/admin.html` — terse, functional
- [x] `auth-state.js` — no user-facing prose
- [x] `cloud-store.js` — no user-facing prose
- [x] `features/incident-response.js` — clean technical feedback
- [x] `features/acl-builder.js` — clean pedagogical copy
- [x] CSS files — no `content:` pseudo-element text with slop

---

## Not Flagged (deliberate style decisions)

These patterns were considered and ruled acceptable:

- **Port mnemonics** (`port-drill.js` lines 78-113): ~30 em-dashes used as structural separators in memory-aid text. These are pedagogical devices, not marketing prose. Recommend a blanket style decision (convert all to colons, or accept as mnemonic style).
- **En-dashes for ranges**: `100-900`, `A-Z` — correct typographic use, not flagged.
- **"you"/"your"** throughout — the stop-slop skill recommends second-person. The app already uses it well.
- **Functional checkmarks** (tick/cross in verdict displays) — semantic, not decorative.
- **Lab terminal text** em-dashes (~40 instances in guided-lab narrations): these are long-form teaching prose in a terminal context. Listed the worst offenders in P6; the rest are a style call.
