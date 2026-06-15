# Free-Gauntlet Reconciliation Spec
**Date:** 2026-06-15
**Goal:** Make every surface (landing + app) accurately reflect: **Free gets 1 Reword Gauntlet run per day as a bonus**, separate from the 15-question daily quota. Why-Not stays Pro-only.

> Source: audit + canonical model + code-gating map produced by the `gauntlet-free-taste-reconcile` workflow (113 surfaces audited). Copy-drafting stage was rate-limited; drafting is being completed manually against this canon.

---

## 1. Canonical model (single source of truth — all copy must match)

| Feature | Free (daily, no card) | Pro ($9.99/mo · $89/yr) |
|---|---|---|
| AI questions | 15 / day, one cert you pick | Unlimited, every cert |
| Spaced-review cards | 5 / day | Unlimited |
| **Reword Gauntlet** | **1 bonus run/day, separate from the 15; you pick the topic on your first run** | Unlimited runs, any cert |
| **Why-Not drill** | Not included; Pro gate fires on Start | Included |
| Full Exam Simulator (90q timed) | Not included | Included |
| Baseline Diagnostic + Pass Plan | Both included (Pass Plan as study map) | Both + Pass Plan coaching |
| Analytics | Basic | Advanced |
| Certs | One of your choice | Every cert |

**Free line:** "Free forever, no card: 15 fresh AI-generated questions plus 5 spaced-review cards every day, on one cert you choose, with one bonus Reword Gauntlet run on top. You also get the Baseline Diagnostic, your Pass Plan, the streak tracker, and basic analytics."

**Pro line:** "Pro is $9.99 a month or $89 a year: unlimited questions across every cert, unlimited Reword Gauntlet, the Why-Not drill, the Full Exam Simulator (90 questions, timed), advanced analytics, and Pass Plan coaching. 14-day money-back, cancel anytime."

**Gauntlet free rule:** "Free gets 1 Reword Gauntlet run a day: one concept asked five ways, five rungs to clear. It's a bonus that sits on top of your 15 daily questions, so running it never eats into those 15. New here? You pick the topic for your first run. After your one free run, more runs are a Pro thing."

**Why-Not rule:** Pro-only. Free users can see the entry; the Pro gate fires on Start. (Already matches live code.)

### Approved reusable phrasings
- "Free forever, no card. Properly free, not a 7-day trial."
- "15 fresh questions plus 5 review cards every day, on one cert you pick."
- "1 bonus Reword Gauntlet run a day, separate from your 15 questions."
- "One concept, asked five ways. Crack all five and you own it in any wording."
- "Pro is $9.99/mo or $89/yr: unlimited questions across every cert, with 14-day money-back."
- "Why-Not is a Pro drill. Free users see the door; Pro opens it."

### Forbidden claims (would mislead — never ship)
1. Implying free users get **Why-Not**.
2. Implying the daily Gauntlet run **comes out of the 15** ("15 questions including a Gauntlet").
3. Saying free gets **"unlimited Gauntlet"** / "as many runs as you want". Free is exactly 1/day.
4. **Claiming the free Gauntlet is live today** — it is NOT until the code gate changes (see §2). Copy and code must ship together.
5. Implying free covers **more than one cert** / "all certs" / "every cert".
6. Implying free includes the **Full Exam Simulator, advanced analytics, or Pass Plan coaching**.
7. Calling the free tier a **trial** or anything time-limited.
8. Saying free has **"no daily cap" / "unlimited questions"** (those describe Pro only).
9. Describing the **Diagnostic or Pass Plan as Pro-gated** (both are free; only deeper coaching is Pro).

---

## 2. Code-gate change (REQUIRED — copy is only honest once this ships)

**Today:** the Reword Gauntlet is gated **Pro-only** (`app.js` ~7047 via `_gateProOnly`). Free users cannot run it at all. Why-Not is also Pro-only and stays that way.

### Change points

**a. New STORAGE key (`app.js` ~1037, beside `GAUNTLET_CRACKED`):**
```js
GAUNTLET_FREE_COUNT: 'nplus_gauntlet_free_count', // {date, count} — free 1/day, separate from the 15-question quota
```

**b. Swap the gate (`app.js` ~7047):**
```js
// was: if (typeof _gateProOnly === 'function' && !_gateProOnly('Reword Gauntlet', {...})) return;
if (!_gateGauntletDaily()) return;
```

**c. New helper (after `_gateProOnly`, ~901):**
```js
function _gateGauntletDaily() {
  // Free: 1 run/day. Pro/admin/anon: always allow.
  if (_quotaState && _quotaState.tier === 'free') {
    var today = new Date().toISOString().slice(0, 10);
    var count = 0;
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE.GAUNTLET_FREE_COUNT) || 'null');
      if (raw && raw.date === today) count = raw.count || 0;
    } catch (_) {}
    if (count >= 1) {
      if (typeof _showProOnlyUI === 'function') {
        _showProOnlyUI({
          title: "That's today's free Gauntlet done",
          body: "Free includes one Reword Gauntlet run a day. Go Pro for unlimited runs, every day, on every cert."
        });
      }
      return false;
    }
  }
  return true;
}
```
> Note: corrected the apostrophe-in-single-quote bug from the raw spec (used double-quoted strings).

**d. Increment after a completed run** — add `_bumpGauntletFreeCount()` called from `gauntletCompleted()` once the run is saved.

**e. Keep the free run off the 15-question quota.** Two options:
- **Pattern B (recommended, server-side):** mark the call `{ _metered: true, _category: 'gauntlet' }`; the proxy exempts `'gauntlet'` from `daily_limit` and counts it in a separate `gauntlet_used_today`. The 15-question counter stays clean.
- **Pattern A (client-side, simpler):** for free tier, strip `_metered` before `_fetchGauntletRun`. Risk: a stale offline tier state could accidentally meter a free run.

**Why-Not:** no change. Stays Pro-only at ~7404.

---

## 3. Surfaces to reconcile (focused set — the ~12 that actually touch the free tier / Gauntlet)

### Landing
- `pricing.html` — meta description (~10), og:description (~25), twitter:description (~36)
- `pricing.html` — Free plan-card feature list (~544 "15 questions + 5 review cards a day")
- `pricing.html` — Free tagline / hero subheader
- `index.html` — free-tier FAQ answer (~3037-3038)
- `index.html` — `#gauntlet` marketing section: confirm it doesn't imply free OR add the honest "1 free a day" note

### App
- `index.html` — settings daily-allowance copy (~1578-1581 "Free is fixed at 15 questions a day")
- `app.js` — quota chip tooltip, esp. the Pro tooltip (~582 "Drills... are all yours" — now stale/contradictory)
- `app.js` — quota-exceeded modal (~673)
- `app.js` — the Pro-only modal that fires for the Gauntlet → becomes the "today's free run done" modal (from §2c)
- `index.html` — Gauntlet drill entry + card: add the free-state ("1 free today") vs spent-state vs Pro framing

### Out of scope (audit captured them but they're not about the free Gauntlet)
Exam Simulator entries, Deep Scan, 30/45/60-question marathons, Drill Mistakes, onboarding Pro hints — these are correctly Pro and need no change.

---

## 4. Sequencing (non-negotiable)
Copy + code-gate change **ship in the same release**. Putting "1 free Gauntlet a day" on the live pricing page while the app still Pro-gates it is a bait-and-switch (forbidden claim #4). Mockup of the app's free-Gauntlet entry (3 states) to follow.
