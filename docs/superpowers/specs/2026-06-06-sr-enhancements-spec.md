---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# Spaced Repetition · 8 Enhancements · Build-Ready Spec

> Status: ready to build · Date: 2026-06-06 · Lane: FAST (localStorage only, no schema/auth/sw-fetch)
> Concept mockup: [`mockups/sr-enhancements-concept.html`](../../../mockups/sr-enhancements-concept.html)
> Design passes baked in: design-taste-frontend (design) · emil-design-eng (motion) · humanizer (copy)
> Grounded against v7.19.4 source. No em-dashes anywhere (brand rule); use `·` or `,`.

---

## 0 · Summary

Eight additive enhancements to the existing SM-2 spaced-repetition feature. Every one layers on the current queue → confidence-marking → interval/streak → results loop. Nothing replaces the engine. The two thin spots (what happens on a wrong answer, and the end screen) get the most attention, plus a forward-looking forecast that adapts to a booked exam date, and right-sized sessions.

**Ships for every cert.** This applies to all certs (Net+, Sec+, A+ Core 1/2, AZ-900, AI-900, SC-900, CLF-C02), not just Net+. SR state and exam dates are cert-scoped (see §2.4). All open decisions are resolved (see §11).

| # | Enhancement | Primary surface | Effort |
|---|---|---|---|
| 1 | Same-session retry of wrong cards | in-session card | S |
| 2 | Missed-card recap on results | results screen | M |
| 3 | Lapse-aware partial reset | scheduler | M |
| 4 | Review feeds the daily streak | results screen | S |
| 5 | Why-it's-due microcopy | in-session meta-row | S |
| 6 | Review forecast (next 7 days) | new surface + home tile | M |
| 7 | Exam-aware scheduling (continuous) | scheduler + settings | L |
| 8 | Right-sized sessions + top-up | settings + session build | M |

Suggested build order: **1 + 5** (instant, render/marking only) → **2** (results) → **4** → **8** → **6** → **3** → **7** (last; only one that changes persisted scheduling).

---

## 1 · Current state (grounding)

All references are app.js v7.19.4 unless noted.

- **Storage:** `STORAGE.SR_QUEUE = 'nplus_sr_queue'` (app.js:864). `loadSrQueue()` / `saveSrQueue()` (app.js:3405-3415); save calls `_cloudFlush(STORAGE.SR_QUEUE)` (1500ms debounced cloud write, Phase C′).
- **Constants** (app.js:3399-3404): `SR_QUEUE_CAP = 500`, `SR_SESSION_CAP = 20`, `SR_GRADUATION_STREAK = 3`, `SR_GRADUATION_EASE = 2.5`, `SR_GRADUATION_INTERVAL = 30`. Max interval hard-capped 180d.
- **Scheduler** `_srSchedule(entry, outcome)` (app.js:3423-3454): wrong → interval 1, ease `max(1.3, ease-0.20)`, streak 0; correct-uncertain → `max(1, base×1.5)`, streak++; correct-confident → `max(1, base×ease)`, ease `min(2.8, ease+0.10)`, streak++. Then cap 180, `nextReview = now + interval×86400000`, graduation check.
- **Entry fields** (app.js:3516-3535): `qHash, question, options, answer, answers, items, correctOrder, type, topic, difficulty, explanation, createdAt, lastSeen, intervalDays, easeFactor, attempts, correctStreak, graduated, nextReview`.
- **Due filter** `getSrDueEntries(limit)` / `getSrDueCount()` (app.js:3557-3573): `!graduated && nextReview <= now`, sorted oldest-first.
- **Session** `startSrReview()` (app.js:3655-3695): scrub → cap to `SR_SESSION_CAP` → `_srSession = { cards, totalDueCount, index, answersGiven, correctConfident, correctUncertain, wrong, pickedLetter, pickedLetters, revealed }`.
- **Card render** `_renderSrCard()` (app.js:3700-3850): progress text + bar, meta-row (topic · interval label), three modes (MCQ auto / multi auto / commit-then-self-grade), confidence buttons after `revealed`.
- **Mark** `srMarkConfidence(outcome)` (app.js:3851+): tally, `updateSrEntry(qHash, outcome)` → `_srSchedule`, `index++`, re-render.
- **Results** `_srEndReview()` (app.js:4050+): tally + remaining-due estimate + Continue + Back-to-home.
- **Home tile** `renderSrReviewCard()` (app.js:3582-3622): shows when `getSrStats().due > 0`; hidden via `.is-hidden`.
- **Readiness** `getReadinessScore()` (app.js:8820-8960): 40/25/20/15 composite, predicted 420-870, pass-prob logistic at 720. `DOMAIN_WEIGHTS = CERT_PACK.domainWeights` (app.js:8668); per-cert weights e.g. certs/netplus.js:108-114. Per-topic accuracy via `buildWeightedTopicMap()`.
- **DOM** `#page-sr-review` with `#sr-empty`, `#sr-complete`, `#sr-card-host`, `#sr-progress-row` (index.html). No dedicated SR mobile CSS exists today (gap; see §11).
- **Editorial overlay:** `dg-system.css?v=X.X.X` (index.html:35), loaded after styles.css. Never edit styles.css for reskins; add scoped `html[data-theme] body ...` overrides in dg-system.css. Cache-bust query bumped on every dg-system change.

---

## 2 · Data model changes

All additive and backward-compatible (old entries lacking a field fall back to a default at read time).

### 2.1 New SR entry field (for #3)
- `lapses` (number, default 0). Increments on each wrong outcome. Read with `entry.lapses || 0` so existing queues need no migration.

### 2.2 New SR preferences (for #6, #7, #8) · global prefs + per-cert exam dates
New key `STORAGE.SR_PREFS = 'sr_prefs'`, JSON, cloud-flushed on write like the queue:
```js
{
  sessionSize: 30,            // 10 | 20 | 30 | 'all'  (global; default 30)
  topUp: true,                // global; offer extra practice on light days
  examDates: {                // PER-CERT, keyed by cert id (decision #6)
    netplus: '2026-05-27',    // 'YYYY-MM-DD', or absent/null = open-ended for that cert
    secplus: null
  }
}
```
- Session size + top-up are personal study prefs, **global** across certs. **Exam dates are per-cert** (one date cannot cover all certs).
- Helpers: `loadSrPrefs()` (defaults merged over stored), `saveSrPrefs(prefs)` (writes + `_cloudFlush`), `getExamDate(certId)` / `setExamDate(certId, date)`.
- Cloud: `profiles.metadata.sr_prefs`. No new endpoint, no migration.

### 2.3 Constant change (for #8)
- `SR_SESSION_CAP: 20 → 30`. The actual per-session cap is `min(prefs.sessionSize===' all' ? Infinity : prefs.sessionSize, SR_SESSION_CAP)`; the constant becomes the hard ceiling, prefs choose within it.

### 2.4 All-cert scoping (this enhancement ships for every cert)
The 8 enhancements apply to all certs (Net+, Sec+, A+ Core 1/2, AZ-900, AI-900, SC-900, CLF-C02), not just Net+.
- **Origin isolation today:** each cert runs on its own Pattern-A subdomain, so localStorage (including the `nplus_sr_queue` key) is already isolated per cert. The legacy `nplus_` prefix is harmless locally but misleading; new keys drop it (`sr_prefs`), and entries are tagged with `cert`.
- **Tag entries:** every SR entry gets a `cert` field (default = active `CURRENT_CERT` at enroll; legacy untagged entries adopt the subdomain's cert on first load). Due / forecast / session build filter by `entry.cert === CURRENT_CERT`, so a cert only ever reviews its own cards (also covers A+ Core 1 vs Core 2 sharing one subdomain).
- **Cloud keying (must-verify, see §11):** SR cloud state MUST be keyed per cert so subdomains do not overwrite each other in `profiles.metadata`. Use `metadata.sr.<certId>.{queue,prefs}` (or cert-suffixed fields). The current `_cloudFlush` writes a single `metadata.sr_queue`; confirm + migrate to per-cert keys before shipping multi-cert, or cross-cert overwrite will silently wipe queues.
- **Exam dates per cert:** resolved via `getExamDate(CURRENT_CERT)`.

---

## 3 · The eight enhancements

### #1 · Same-session retry of wrong cards (effort S)
**What:** when a card is marked wrong, re-append it once to the tail of the current session so it is attempted again before the results screen.
**Where:** `srMarkConfidence` (app.js:3851+).
**Logic:** on `outcome === 'wrong'`, if the card has not already been retried this session, push a shallow clone to `_srSession.cards` with `_retry = true`. The persisted `_srSchedule` (reset to tomorrow) is unchanged.
**Edge cases (required):** (a) cap to one retry per card per session via `_retry` flag, so no infinite loop; (b) a `_retry` card must NOT re-increment the tally counters (it already counted as wrong on first pass); (c) `totalDueCount` and the progress denominator must account for the appended card so "x of y" stays correct.
**Test guards:** retried card increments `cards.length` by exactly 1; second wrong on same card does not re-append; counters unchanged by the retry pass.

### #5 · Why-it's-due microcopy (effort S)
**What:** one computed line under the meta-row explaining why the card resurfaced.
**Where:** `_renderSrCard` meta-row (app.js:3700-3850).
**Logic (read-only from the entry):**
- `correctStreak === 0 && (entry.lapses||0) > 0` → "Rebuilding · you missed this one last time"
- else if `intervalDays >= 7` → "Last seen {intervalDays}d ago"
- else (new/young) → "First few reviews"
Render as a small line in `--warn` (rebuilding) or `--text-dim` (neutral). Reuse the brand `↻` line-icon (stroke `currentColor`).
**Edge cases:** never show a negative or NaN interval; treat missing `lapses` as 0.

### #2 · Missed-card recap on results (effort M)
**What:** a collapsible "Review what you missed" block on the results screen listing each wrong/uncertain card.
**Where:** `_srEndReview` (app.js:4050+), reading `_srSession.cards` + the per-card recorded outcome before the session object is discarded.
**Logic:** filter the session's cards to wrong + uncertain; render rows of `topic · truncated stem · correct answer (✓) · one-line why · reschedule chip`. The "why" uses the card's `explanation` (truncated) with graceful fallback to a generic line when unauthored. Default collapsed on phones, expanded on tablet/desktop.
**Edge cases:** zero misses → hide the block entirely (clean all-correct state); long stems clamp to 2 lines; the recap reads existing in-memory state only, no new persistence.
**Test guards:** recap row count === wrong+uncertain count; absent when all correct.

### #3 · Lapse-aware partial reset (effort M)
**What:** on a wrong answer, reset interval to a fraction of its prior value instead of a hard reset to 1 day, so mature lapses relearn faster than fresh failures.
**Where:** the wrong branch of `_srSchedule` (app.js:3423-3454) + `lapses` field (§2.1) + default in `addToSrQueue` (app.js:3516-3535).
**Logic:**
```
// wrong branch
entry.lapses = (entry.lapses || 0) + 1;
const prior = entry.intervalDays || 1;
entry.intervalDays = Math.max(1, Math.round(prior * 0.30));  // partial reset, floor 1
entry.easeFactor = Math.max(1.3, entry.easeFactor - 0.20);   // unchanged penalty
entry.correctStreak = 0;
// nextReview, 180 cap unchanged
```
A young card (interval 1-3) still effectively returns next day, so the downside is bounded. Keep the 0.30 factor a named constant `SR_LAPSE_FACTOR` for tuning.
**Edge cases:** never exceed the prior interval; never below 1; do not change graduation logic.
**Risk:** only enhancement that alters persisted scheduling. Ship last, behind the others, so it can be validated in isolation. Keep the factor conservative.
**Test guards:** wrong on a 30d card yields ~9d not 1d; wrong on a 2d card yields 1d; `lapses` increments.

### #4 · Review feeds the daily streak (effort S)
**What:** finishing a review session credits the existing fire-emoji day streak (`STORAGE.STREAK`), gated and idempotent per day.
**Where:** end of `_srEndReview` (app.js:4050+), reusing the quiz path's existing "already counted today" guard.
**Logic:** if at least one card was marked this session and the streak has not been credited today, increment via the existing streak mechanism. No new storage key, no new streak system.
**Edge cases:** opening and bailing with zero marks must NOT earn the streak; multiple sessions in one day must not double-count (reuse the existing daily idempotency guard).
**Test guards:** streak credited once per day on completion; not credited on zero-mark exit.

### #6 · Review forecast, next 7 days (effort M)
**What:** a forward view of due cards bucketed by day, plus a compact version on the home SR tile.
**Where:** new render `renderSrForecast(container)`; called from `renderSrReviewCard` (home, compact) and a new forecast surface within `#page-sr-review` settings/empty area.
**Logic (pure read of `nextReview`):** for each of the next 7 days, count non-graduated cards whose `nextReview` falls on that day (today = due now). Render a bar per day (height encodes count) + count label + Today highlighted. A short agenda of the next non-empty days with topics.
**Edge cases:** empty days render a flat 0 bar; a card reviewed right now also appears on its future due-day (forecast is a projection, mock simplifies this); cap displayed counts sensibly.
**Test guards:** bucket sums equal the count of due-within-7-days entries; today's bucket equals `getSrDueCount()`.

### #7 · Exam-aware scheduling, continuous (effort L)
**What:** when an exam date is set, the same engine works backward from it; the closer the date, the harder it compresses. One continuous dial, no modes.
**Where:** `_srSchedule` (cap), session ordering in `startSrReview` (front-load), `_srEndReview`/forecast (taper + countdown), settings (§8). Exam date is per-cert: `getExamDate(CURRENT_CERT)` (decision #6).
**Logic:**
1. **Interval cap (the core lever):**
   ```
   const days = daysUntil(getExamDate(CURRENT_CERT)); // null when no exam for this cert
   if (days != null) {
     const buffer = Math.max(1, Math.round(days * 0.15));   // leave room for a final pass
     entry.intervalDays = Math.min(entry.intervalDays, Math.max(1, days - buffer));
     entry.nextReview = now + entry.intervalDays * 86400000;
   }
   ```
   This alone produces the continuous scaling: a 2-week date caps hard, a 2-month date barely bites.
2. **Front-load (ordering, not interval):** within the due set, sort weak + high-blueprint-weight cards earlier. Weakness from `correctStreak`, `easeFactor`, and per-topic accuracy (`buildWeightedTopicMap`); blueprint weight from `CERT_PACK.domainWeights` mapped via `topicDomains`.
3. **Coverage:** every in-scope non-graduated card lands on or before exam day (guaranteed by the cap).
4. **Taper:** in the final ~20% of days, reduce new introductions; surface a light final sweep of the weakest cards. Surface a countdown ("21 days to exam") and a readiness delta on the forecast + results.
**Edge cases:** exam very close (<= ~3 days) collapses to "drill weak cards now" (cap pins to 1, no spacing possible); that is correct, surface a gentle note. Exam in the past or cleared reverts to open-ended (treat `days <= 0` or null as no cap). Per-cert exam dates (key prefs by active cert if multi-cert later; for now single active cert).
**Test guards:** with examDate +14d, no scheduled `nextReview` exceeds exam day minus buffer; with examDate null, scheduler output identical to today's; closer date yields smaller average interval.

### #8 · Right-sized sessions + top-up (effort M)
**What:** a session is what is due, capped at the chosen size (default 30, ~15 min), with a "keep going" pass for heavy days and an optional top-up on light days.
**Where:** `startSrReview` (cap from prefs), `_srEndReview` (Continue + light-day top-up), settings (§8 UI).
**Logic:**
- Session cap = `prefs.sessionSize === 'all' ? totalDue : min(prefs.sessionSize, SR_SESSION_CAP)` where `SR_SESSION_CAP = 30`.
- Heavy day: overflow stays queued; results screen shows "keep going · N still due".
- Light day (due < 8, decision #4) AND `prefs.topUp`: offer "Top up · extra practice on weak topics". Source (decision #3): **prefer ahead-of-schedule weak SR cards for this cert; if too few, generate fresh questions on the weakest topics.** Rendered as a clearly separate "extra practice" block. Top-up answers do NOT reschedule due cards early (spacing stays pure); they are practice only.
**Edge cases:** top-up must never pull a not-yet-due card into the due path (no early review of real SR cards); the extra-practice block is visually + semantically distinct from due reviews.
**Test guards:** session length <= chosen cap; overflow preserved; top-up block only appears when due < threshold and prefs.topUp true.

---

## 4 · Design spec (design-taste-frontend + BRAND.md)

Forged-bronze editorial. Single bronze accent. Hairlines over soft-shadow card spam. Fraunces (wght 600, lining-nums + tabular-nums on any hero number) for display; Inter for all UI; UPPERCASE eyebrows (Inter 800, 10-11px, 0.12-0.14em). Functional marks only (`✓ ✗ →`); brand-illustrative orange flame allowed for the streak. No purple, no em-dashes, no gradient backgrounds on chrome, no descriptive-only cards.

Components (all new UI ships as scoped overrides in `dg-system.css`, never styles.css; bump `dg-system.css?v`):
- **Why-due line (#5):** small line under meta-row, `↻` monoline icon + text, `--warn` or `--text-dim`.
- **Retry pill (#1):** accent-tinted pill (`color-mix(in oklab, var(--accent) 9%, transparent)`, accent border), `↻` icon.
- **Recap rows (#2):** hairline-separated rows; topic eyebrow (accent), stem (text, 2-line clamp), correct answer with green `✓`, italic dim "why", reschedule chip (neutral; bronze-tinted for the lapse-aware "back in ~Nd").
- **Streak (#4):** bronze-illustrative flame SVG (namespaced gradient id), tinted `--warn` panel, Fraunces "+1".
- **Forecast (#6):** 7 day-cards, thin vertical bronze bars (`linear-gradient(180deg, var(--accent), var(--accent-deep))`), Today highlighted accent-tint. Bars are the one allowed data-instrument.
- **Settings group (#7/#8):** labelled group header "DAILY REVIEW · SPACED REPETITION" (accent eyebrow) + sub clarifying it is separate from standard quiz/exam setup; rows with `set-row` hairline dividers; segmented control (10 · 20 · 30 · All due, accent-tinted active); pill for exam date; brand toggle switch for top-up.
- Radius: cards 14-20, chips/buttons 7-11, pills 999. Shadows theme-adaptive via `color-mix`.

Reference implementation of every component already exists in the concept mockup; lift tokens and structure from there.

---

## 5 · Motion spec (emil-design-eng)

System easing `cubic-bezier(0.16, 1, 0.3, 1)`. transform + opacity only for entrances; never `scale(0)` (start 0.97-0.99). Press `:active{ transform: scale(0.97) }`. Hover gated to `@media (hover:hover) and (pointer:fine)`. Everything below collapses to fade-only (or instant) under `@media (prefers-reduced-motion: reduce)`.

| Element | Motion | Duration / curve |
|---|---|---|
| Card / section entrance | translateY(14px)+scale(.99)→none, opacity | 550ms system, stagger 60-70ms |
| Retry pill (#1) | arrives a beat after the wrong card settles, translateY(7px)+scale(.97)→none | 460ms, delay ~450ms |
| Streak +1 (#4) | subtle overshoot scale .6→1.12→1 | 500ms, delay ~620ms |
| Recap rows (#2) | sequential reveal, translateY(8px)→none | 500ms, stagger 70ms |
| Progress bar + forecast bars | width/height sweep (data-instrument exception) | 900-1000ms system, left-to-right stagger 45ms |
| Buttons / toggle | press scale(0.97); toggle knob slide | 150-200ms |
| Theme + value crossfades | bg/color `ease` | ~450ms |

Press feedback on every clickable. No animation on keyboard-repeated actions. Bars are the only motion that earns a >600ms duration (they carry data).

---

## 6 · Copy spec (humanizer)

Direct, concrete, no throat-clearing, no em-dashes (use `·` or a comma), no tailing-negation slogans, no forced rule-of-three. Final strings (lifted from the mockup, post-humanizer pass):

- #5 why-due: "Rebuilding · you missed this one last time" / "Last seen 5d ago"
- #1 retry pill: "We'll bring this back once more before you finish"
- #2 recap header: "Review what you missed"; row why example: "You picked the handshake signature · that authenticates, it doesn't encrypt."
- #4 streak: "Today's review counts." / "6-day streak · today's review keeps it going."
- #6 forecast caption (open-ended): "Intervals expand freely: a few days, then a couple of weeks, then a month. The load stays light and gaps are fine."
- #7 exam caption: "Intervals are capped to land before exam day, so the closer the exam the harder it works: two weeks out runs intensive, a month is steadier, two months barely changes anything."
- #8 settings group sub: "These only affect your review sessions, separate from the standard quiz and exam setup."
- #8 session-size sub: "How many due review cards per session, about 30 seconds each. Up to 30; anything over waits for a second pass."

---

## 7 · Mobile iOS + Tablet spec (REQUIRED, net-new for SR)

The SR surface has no dedicated responsive CSS today. All of it ships as scoped overrides in `dg-system.css` (bump `?v`), single codebase to all viewports (locked v7.19.x policy: touch-only adjustments, no DOM rebuilds). Verify on real iPhone + iPad before sign-off (IPHONE_SMOKE.md).

### 7.1 Breakpoints (match existing conventions)
- Phone: `@media (max-width: 600px)` (and tighter at 520 / 420 for ultra-compact).
- Tablet: 601-1024px (the in-between; iPad portrait ~768, landscape ~1024).
- Desktop: `@media (min-width: 1024px)`.
- Touch gating: `@media (hover:none) and (pointer:coarse)` for touch-only styles; hover effects only under `@media (hover:hover) and (pointer:fine)`.

### 7.2 iOS-specific (non-negotiable)
- **Input zoom guard:** any SR input (exam-date picker, any text field) `font-size: 16px` minimum (iOS auto-zooms < 16px on focus). Matches styles.css:164 pattern.
- **Safe-area:** `#page-sr-review` honors `env(safe-area-inset-top/bottom)` so cards and the bottom action row clear the notch + home indicator.
- **Dynamic viewport:** use `100dvh` (not `100vh`) for any full-height SR layout so the iOS address bar does not cause jump/clipping.
- **Tap targets:** every interactive element (options, confidence buttons, retry, segmented control, toggle, day-cards, recap rows if tappable) >= 44x44px hit area.
- **Momentum scroll:** `-webkit-overflow-scrolling: touch` on the forecast strip and any scroll container.

### 7.3 Per-surface responsive behavior
- **In-session card (#1, #5):** options stack full-width on phone; stem >= 16px; confidence buttons become a full-width row (>= 44px), thumb-reachable near the bottom; meta-row + why-due line wrap cleanly. Tablet: comfortable max-width (~640px) centered, not edge-to-edge.
- **Results + recap (#2, #4):** tally chips wrap; recap **collapsed by default on phone** (tap to expand), expanded on tablet/desktop; streak panel full-width; primary action (Keep going) full-width on phone, inline on tablet+.
- **Forecast (#6):** phone = horizontal scroll-snap strip (`scroll-snap-type: x mandatory`, day cards `scroll-snap-align: start`, ~100px each) so 7 days are swipeable without cramming; tablet/desktop = all 7 days fit in one row (grid, no scroll). Home tile shows a compact 5-7 day mini-forecast that never causes horizontal page overflow.
- **Settings group (#7/#8):** `set-row` becomes label-on-top, control-below stack on phone (control no longer floats right); segmented control full-width with >= 44px buttons; toggle and exam-date pill remain thumb-sized. Tablet+: label left / control right.
- **Exam forecast (#7):** countdown pill + readiness delta wrap above the strip on phone.

### 7.4 Orientation + overflow
- Landscape phone: cap card width, keep the bottom action row visible (dvh).
- Hard rule: zero horizontal overflow at 320px, 360px, 390px, 768px, 1024px. Verify `scrollWidth === clientWidth` at each.
- Reduced-motion: forecast bars and reveals collapse to instant; toggles still function.

### 7.5 Verification matrix (before ship)
iPhone SE (375), iPhone 15 (393), iPad portrait (768), iPad landscape (1024), desktop (1280). Check: no overflow, 44px targets, no input zoom, safe-area clearance, forecast swipe on phone vs full week on tablet, recap collapse on phone, both themes.

---

## 8 · Settings UI (home for #7 + #8)

Bake into the existing Settings page as a labelled group, not a separate page:
- Group header: "DAILY REVIEW · SPACED REPETITION" + sub (separate from standard setup).
- Row 1 Exam date: date input (16px, native picker) → writes `prefs.examDate`. Empty = open-ended.
- Row 2 Session size: segmented 10 / 20 / 30 / All due → writes `prefs.sessionSize` (default 30).
- Row 3 Top up on light days: toggle → writes `prefs.topUp` (default on) + sub explaining the threshold.
- All three persist via `saveSrPrefs` (+ cloud flush). Changing them takes effect on the next session build / next schedule.

---

## 9 · Test + UAT plan

Match existing SR tombstone style in tests/uat.js (~line 7201+): regex/presence guards on names + structural checks. Add:
- Constants: `SR_SESSION_CAP === 30`, `SR_LAPSE_FACTOR` defined, `STORAGE.SR_PREFS` defined.
- Helpers: `loadSrPrefs` / `saveSrPrefs`, `renderSrForecast`, `daysUntil`.
- Behavioral (where extractable): lapse-aware reset math (30d→~9d, 2d→1d); exam cap (no nextReview past examDate-buffer); retry appends once; recap count equals misses; session cap honors prefs; streak idempotency.
- DOM: forecast container, settings group, recap block exist.
- Run `node tests/validation-audit.js` is NOT required (no `validateQuestions` change).
- Live-verify (Chrome MCP on localhost or preview, never prod localStorage): walk a full review on iPhone + iPad viewport, exam-date set vs unset, light-day top-up, both themes.

---

## 10 · Ship lane + sequencing

- **Lane: FAST.** SR is localStorage only (+ existing `_cloudFlush`). No `supabase/migrations`, `auth-state.js`, `cloud-store.js`, `lib/supabase.js`, or `sw.js` fetch-logic change. Commit → main → push → CI → Vercel. (If the SaaS pivot later makes SR per-user server-side with quotas, it moves to the gated lane.)
- **dg-system.css `?v` bump** required on every CSS change (manual, with `bump-version.js`).
- **Version bump** per ship via `scripts/bump-version.js`; keep CLAUDE.md row a one-line stub; detail to commit + CHANGELOG.
- **Suggested phasing (each its own ship or grouped):**
  1. #1 + #5 (render/marking only, no schema)
  2. #2 + #4 (results screen)
  3. #8 + settings scaffold + `SR_PREFS` + cap 30
  4. #6 forecast (home + surface) + responsive
  5. #7 exam-aware (cap, front-load, taper) + countdown
  6. #3 lapse-aware reset (last; persisted-scheduling change, validate in isolation)

---

## 11 · Decisions (all resolved 2026-06-06)

1. **Lapse factor** `SR_LAPSE_FACTOR = 0.30` (a 30d card returns in ~9d). Named constant; tune with real data later.
2. **Exam buffer + taper:** buffer = 15% of days-to-exam (floor 1 day); taper is **proportional** (final ~20% of the window eases off new cards + runs a light final sweep), so it scales whether the exam is 2 weeks or 2 months out. No rigid "last N days" rule.
3. **Top-up source:** prefer ahead-of-schedule weak SR cards for the active cert; if too few, generate fresh questions on the weakest topics. Always a separate "extra practice" block; never reschedules real due cards.
4. **Light-day threshold:** due < 8 triggers the top-up offer.
5. **Forecast:** build the **true projection** (a card reviewed today also appears on its future due-day), not the simplified mock view.
6. **Exam date scope:** **per-cert.** One date cannot cover all certs; stored in `prefs.examDates[certId]`, read via `getExamDate(CURRENT_CERT)`. Session size + top-up stay global.

### Must-verify during build (implementation check, not a design decision)
- **Cloud keying for all-cert SR (§2.4):** confirm `_cloudFlush` SR state is keyed per cert in `profiles.metadata` before shipping multi-cert. The current single `metadata.sr_queue` field would let one cert's cloud sync overwrite another's. Migrate to `metadata.sr.<certId>.{queue,prefs}` (or equivalent).

---

*Living spec. Update as decisions land. Concept reference: `mockups/sr-enhancements-concept.html`.*
