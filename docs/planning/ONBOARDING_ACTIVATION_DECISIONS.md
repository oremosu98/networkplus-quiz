# Onboarding / Activation / Routing · LOCKED DECISIONS

> **Status:** Strategy LOCKED 2026-06-07. No code written yet. This is the source of truth for the App Store first-run / returning-user UX layer (routing + guided first action + coachmarks + feedback). Supersedes the open questions in `HANDOFF-app-entry-routing-and-feedback-2026-06-06.md` and the memory file `planning_app_entry_routing.md`.
>
> **Visual source of truth:** `~/Desktop/CertAnvil-launch-routing-diagram.html` (v0.3, tier-aware, forged-bronze, light/dark toggle). The diagram is canonical for the flow; this doc is canonical for the rationale + the build rules.

---

## 0 · The build workflow — HARD RULE (do not deviate)

Every build step in this onboarding flow MUST run, in order:

1. **`/design-taste-frontend`** — design pass (first).
2. **`/emil-design-eng`** — polish / interaction pass (second).
3. **`/humanizer`** — copy pass (third), so all user-facing text reads human, not AI.

And **`/onboarding`** is invoked **throughout the entire build** — it is the activation lens that every routing / tour / empty-state / feedback decision is checked against. This is the founder's explicit, non-negotiable instruction (2026-06-07). Any agent picking up this work follows this sequence on every surface; do not skip a pass, do not reorder.

Plus the existing project discipline still applies: forged-bronze (`design/brand/BRAND.md`), concept-mockup-first, the Ship checklist, and the gated-lane PR flow (see §7).

---

## 1 · Activation definition + metric

- **Aha moment:** NOT a static readiness score. The aha is the readiness number **moving in response to the user's own effort**, delivered **in the first session** (never split to a day-2 return — that is where anxious users are lost).
- **Activation event:** a new account, in session one, (1) establishes a readiness baseline AND (2) sees that number move after answering its own questions.
- **Per-cert:** activation is tracked per cert (`activated[certId]`), same shape as the shipped `metadata.sr.<certId>` cert-keying — NOT a per-account flag.
- **Single activation metric:** **% of new accounts that reach a *moved* readiness score in their first session.**
  - Leading proxy to instrument first (cheaper): % completing the diagnostic and hitting the score screen.
  - Supporting: time-to-first-score (target < ~3 min), D1 return to Daily Review.
- Pre-scale today, so these are hypotheses to **instrument from day one**, not yet validated. Wire the activation event before launch so the funnel exists when real users arrive.

---

## 2 · First-session flow (one goal: "a number that moves when I study")

Minimal path, everything else deferred:

1. **(Pro only) Pick your exam.** Free auto-assigns the user's single locked cert, so free users skip this step.
2. **Exam date?** Optional, skippable, default "not sure yet."
3. **Diagnostic ~15Q** — framed as calibration, not a test: "Answer ~15 questions so we can calibrate where you stand. No studying needed — wrong answers just become your first review set." **FREE and uncounted** (does NOT draw from the daily cap; one-time per cert). Seeds the Daily Review deck.
4. **Readiness score reveal** — the number, the pass mark, the gap, honest framing ("estimates where you are today, not a guarantee").
5. **+5 targeted practice → watch the score move** ← the ACTIVATION EVENT, in-session. These 5 draw from the 15 new-practice bucket (see §4).
6. **Habit hook** — "5 review cards ready tomorrow" (the deck was seeded by the diagnostic, so the day-2 promise is real).

**Skip in session 1:** exam mode, paywall, full feature tour, analytics deep-dives, settings, multi-cert concepts.

**Diagnostic is SKIPPABLE (LOCKED 2026-06-07).** It is the default and the activation event, but NOT a hard gate. Offer "Skip for now, take it later." This matters most for a confident user (often Pro) adding a new cert who wants to dive straight into quizzes. Skipping drops them into the cert home with readiness showing "Take the diagnostic to unlock your score" until they do (an empty-state CTA, see §5). Do not force calibration on someone who is paying to study a cert they already know.

---

## 3 · Do-don't-show vs coachmarks

- **Guided first action wins across the entire value spine** (diagnostic → score → movement). Don't explain the readiness score in a tooltip; let the user earn one and feel it move. The session-1 flow IS the "do, don't show."
- **Light coachmarks annotate navigation only, never explain value.** Allowed: the cert switcher (Pro, first time owning 2+), a persistent "?" replay-help affordance, one just-in-time note on the readiness gauge.
- **Rules:** one coachmark at a time, anchored, dismissible, fired by first-arrival-to-surface (not a time delay), stored per-surface (`metadata.tours.<surfaceId>`), global "skip all tips" in Settings. **Never fire mid-redirect** — only after a surface settles.

---

## 4 · Tier model (LOCKED 2026-06-07)

- **Free = ONE cert, locked to the user's pick** (any cert: Network+, Security+, AZ-900, etc. — NOT Network+ only). They study that one cert fully. No switching.
- **Free daily budget = 20 = 5 Daily-Review (hard cap) + 15 AI new-practice.** The diagnostic is excluded (free, one-time). The activation "+5 practice" draws from the 15 new-practice bucket.
- **Pro = all 7 certs + cert switching + unlimited questions.**
- **Switcher renders for Pro only.** In the free user's switcher slot, show a quiet "＋ Add a cert · Pro" upsell — absence becomes discovery, not a nag.
- **Upgrade prompts fire only AFTER the aha**, on triggers the free user already cares about: (a) out of the 15 new questions ("Pro = unlimited"), (b) wanting a 2nd cert ("Pro = all 7 + switching"). Honest framing — access and volume, never a pass guarantee.
- **WATCH the 5/day review cap.** SR backlogs grow; a committed free user could have 25 cards due but clear only 5/day. Strong upgrade lever ("Pro clears your full review queue") but instrument it so it does not starve the retention habit that drives conversion.

---

## 5 · Empty states (brand-new account)

- **0 certs:** the empty "My Certs" IS the front door — render the cert picker framed as the goal: "Pick your exam to get your readiness score."
- **0 history in a chosen cert:** never a dashboard of zeros (reads as failure to an anxious user). Single primary CTA over a ghosted preview of the populated dashboard: "Take your 15-question diagnostic to unlock your readiness score."
- **Empty Daily Review:** "Your review deck builds as you study. Take the diagnostic to seed your first cards."
- **Tone:** honest, calm. "Where you stand today," not "your score." "Estimate," not "prediction." The gap is closeable, never a verdict. No "you'll pass."

---

## 6 · Returning users + routing (never nag daily users)

**Native shell = Option B (the "lobby" / thin router) — LOCKED.** The Capacitor app opens to ONE controlled entry point that runs the routing; it does NOT deep-link straight into a cert subdomain. Reasons: simpler, more reliable, safe for Apple review (opens into "the app," not a website), and it is the single place the routing logic lives. Cost (one tiny redirect) is hidden behind the neutral loading skeleton.

**Routing order (the lobby):**

```
Launch → native shell loads start URL → fast auth resolve (neutral skeleton, NO flash of landing)
  → Logged in?
      No  → marketing landing (strangers only)
      Yes → Tier?
          Free → current cert = their one locked cert
          Pro  → current cert = last-active cert
        → Activated for THIS cert?
            No  → first-run diagnostic FOR that cert (resumable — jump to first incomplete step)
            Yes → cert home
                   Free: quota meter (5 review + 15 new), no switcher, "＋ Add a cert · Pro"
                   Pro:  switcher 1 tap, My Certs hub, unlimited
        → surface settled → coachmarks may fire
```

- **Pro switching to an undiagnosed cert re-enters first-run** for that cert (per-cert activation). The switcher is an activation surface, not just navigation.
- **Gate first-run on activation STATE, not on "is this a new session."** This is what stops onboarding from nagging daily users. The one returning user who *should* see onboarding is "returning + never activated" — resume their first-run.
- **Last-active cert lives in profile/cloud** (`metadata.lastActiveCertId`), cross-device, same shape as the shipped cert-keying.

---

## 6b · Integration with the existing app (ON-RAMP, NOT A REBUILD)

This is the most important framing for the build: **the onboarding flow wraps the entry to the product that already exists. It does NOT replace the quiz engine, My Certs, the cert switcher, readiness, the cert home (`#page-setup`), or Daily Review.** Almost everything the flow shows is existing data and engines, re-sequenced and re-framed for the first run.

| Already exists (reuse as-is) | New thin layer this project adds |
|---|---|
| Quiz / exam engine | The lobby router (Option B entry) |
| My Certs + cert switcher | Per-cert activation gate (`activated[certId]`) |
| Readiness score + cert home (`#page-setup`) | First-run orchestration (diagnostic → score → +5 movement) |
| Daily Review (spaced repetition) | Tier chrome (quota meter, upgrade sheets, "Add a cert", coachmark) |
| Diagnostic questions | — |

- **The "free home" and "Pro home" mockups ARE the existing cert home** (`#page-setup`) with tier chrome added. The "Start Daily Review" / "Practice new questions" buttons wire into the existing engine, not new screens.
- **The switcher sheet ("Your exams")** is the existing My Certs, promoted into the app topbar.
- **Activated users skip the on-ramp entirely.** A Pro user already activated on their certs: lobby → straight into the cert home → switch/pick cert → quizzes, exactly as the app works today. The "pick it up and go" experience is preserved. The on-ramp (and the skippable diagnostic) only fires once per cert, for a cert not yet diagnosed.

**Net new code is small and bounded:** the router, the activation gate + flag, the first-run sequence, and the tier chrome. The quizzes/readiness/Daily Review/My Certs are reused.

---

## 7 · Build sequencing + constraints

- **Gated lane:** routing touches `auth-state.js` / `cloud-store.js` / `lib/supabase.js` (and possibly `sw.js`), so it goes feature branch → PR → Supabase preview + Vercel preview → smoke test → squash-merge. NOT a fast-lane push. See `ENVIRONMENT_STRATEGY.md`.
- **Tier/entitlements are `saas-gated` (#136).** The routing skeleton (lobby + auth + cert resolution + per-cert activation gate) can be built now; the *real* tier/quota checks (free vs Pro, 5+15 budget, upgrade walls) may need to stub until the paid-SaaS pivot triggers. Confirm with founder before wiring live entitlements.
- **Stack:** vanilla static HTML/JS, no React. Forged-bronze via scoped `dg-system.css` overrides (never edit `styles.css`). Sec-P7: no inline `on*=` handlers.
- **In-app feedback / App Store review prompt** (Topic 2 from the handoff) is a sibling workstream, not blocking this one. Extends the existing bug-report drawer (type selector: bug / suggestion / praise) + native `SKStoreReviewController` timed after a pass/streak. Design later under the same skill discipline.

---

## 8 · Confirmed assumptions (founder, 2026-06-07)

1. Diagnostic stays **free / uncounted** even though Daily Review now counts toward the cap. ✅
2. Free signup **auto-assigns the single cert** → most first-runs skip the "pick which exam" step; the picker only matters for Pro. ✅
3. Free cert model = **any one cert, locked to their pick** (not Network+ only). ✅
4. Cap accounting = **5 Daily-Review + 15 new-practice = 20/day**; diagnostic excluded. ✅
5. Native shell = **Option B (lobby / thin router)**. ✅
6. Diagnostic is **skippable** (default + activation event, not a hard gate); skippers land in the cert home with a "take the diagnostic to unlock your score" empty state. ✅
7. The flow is an **on-ramp, not a rebuild** (see §6b): it wraps entry to the existing app; activated users go straight to quizzes. ✅

---

**Next step after capture:** build the routing skeleton on a feature branch (tier checks stubbed per §7), following the §0 skill sequence on every surface.
