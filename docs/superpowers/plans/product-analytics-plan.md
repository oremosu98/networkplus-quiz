---
type: plan
status: active
cert: all
updated: 2026-06-29
tags: [plan]
---
# Certanvil — Product Analytics Plan

**Purpose:** Turn real user activity into business decisions. Decisions first, metrics second.
**Stack assumed:** vanilla-JS PWA (service worker, offline-capable) · Supabase (Postgres + Auth + RLS) · Vercel + GitHub Actions · solo/small team, budget-conscious.

> Working assumptions (stated, not blocking): Certanvil is pre/early-revenue, mostly free with a paid tier coming; first cert is CompTIA Network+; you have low hundreds-to-thousands of users, not millions; "success" for a user = passing their exam.

---

## Part 1 — Strategy (decisions first)

### The business decisions analytics must inform

1. **Is the product actually helping people pass?** — the only decision that protects the brand. If users churn *and* fail, nothing else matters.
2. **Which topics/domains cause study drop-off?** — tells you where to invest content and UX effort next.
3. **Where do new users fall out before they get value?** — fix the leak before pouring traffic in.
4. **What turns a one-time visitor into a returning studier?** — defines what onboarding and reminders should push toward.
5. **Is the paid tier worth building/expanding?** — which behaviors correlate with willingness to pay.
6. **Where should I (solo) spend the next two weeks of dev time?** — every metric should be able to lose this argument.

If a metric can't change one of these six, don't build it yet.

### North Star metric

**Weekly Active Studiers who completed ≥1 quiz** — *not* signups, *not* pageviews, *not* "active users."

Defend: a cert-prep app creates value only when someone *practices*. Logins and pageviews are vanity — they go up when you spam emails and tell you nothing about exam readiness. Quiz completion is the unit of real value; doing it *weekly* captures the habit that actually leads to passing. The vanity trap here is "total registered users" — it only ever goes up, it survives even as the product rots, and it lets you feel good while everyone silently churns.

**Secondary (outcome) star, once you can measure it:** *self-reported exam pass rate.* Harder to capture (it happens off-platform) but it's the truth metric. Prompt for it via a post-exam survey (see Part 2).

### Core funnel

| Stage | The one metric that matters | Healthy-ish early benchmark* |
|---|---|---|
| Acquisition | Signups / unique visitors (landing → account) | 2–5% visitor→signup |
| **Activation** | % of signups who **complete their first quiz** (see definition below) | 30–50% |
| Engagement / habit | % of activated users who return & study in week 2 (WAU/MAU style) | WAU/MAU 20%+ is decent for study apps |
| Outcome | % who reach "exam-ready" signal (e.g. ≥80% rolling score across all domains) | track trend, not absolute, early |
| Retention / referral | Week-4 retention; referral/share rate | 20–30% W4 retention is strong for the category |

*Benchmarks are rough orientation for an early learning app, not targets to game. Trend matters more than the absolute number at your stage.

### Activation = the aha moment

**Activation = signup → completes first full quiz AND views at least one answer explanation, in the first session.**

Justify: the value promise of Certanvil isn't "answer questions," it's "find out what you don't know and learn it." Completing a quiz proves they engaged with practice; viewing an explanation proves they hit the *learning* loop, not just a score screen. A user who does both has experienced the actual product. One who only sees a score bounced off the surface.

### Leading indicators

**Predict they'll keep studying (good):**
- Returned within 48h of signup (single strongest signal in most study apps).
- Completed ≥2 quizzes in week 1.
- Viewed explanations on wrong answers (learning intent, not just score-chasing).
- Set/has an exam date (commitment).
- Installed the PWA.

**Predict churn (bad):**
- Score screen viewed but no explanation opened (surface bounce).
- First quiz abandoned mid-way.
- No return within 7 days of signup.
- Studies only one domain then stops (hit a wall, didn't push through).
- Long gap (>14 days) after previously being active — re-engagement window closing.

---

## Part 2 — Event tracking spec

### Naming convention

`object_action`, `snake_case`, past tense for the action where natural. Example: `quiz_completed`, `explanation_viewed`, `topic_progress_changed`. One vocabulary, no synonyms (never both `quiz_finished` and `quiz_completed`). Properties are `snake_case` nouns. This keeps the event list grep-able, prevents the "is it `signup` or `sign_up`?" rot, and makes dashboards self-documenting.

### Identity & session model

- **Anonymous → authenticated stitching:** generate an `anon_id` (UUID) on first visit, store in `localStorage`. On signup/login, alias `anon_id → user_id` so pre-signup landing/quiz-preview activity attaches to the eventual account.
- **`user_id`** = the Supabase `auth.users.id` (UUID). This is the canonical analytics identity. Never send email/name as the identity or as a property.
- **`session_id`** = new UUID per session; a session ends after 30 min idle or on app close. Lets you measure "first session" activation.
- **PWA / offline:** events fired offline are queued in `IndexedDB` with their real client-side `event_ts`, then flushed on reconnect. Always stamp `event_ts` at fire-time, not send-time, or your funnels lie. Mark flushed-late events with `was_offline: true`.

### User properties (stable, set once / updated rarely)

| Property | Type | Notes |
|---|---|---|
| `cert_track` | string | e.g. `network_plus` (future-proofs for more certs) |
| `signup_date` | date | cohort anchor |
| `plan` | enum | `free` / `paid` |
| `exam_date` | date \| null | if user provided; strong commitment signal |
| `pwa_installed` | bool | |
| `referral_source` | string \| null | how they arrived |

### Session properties

`session_id`, `device_type` (mobile/desktop), `is_pwa` (standalone vs browser tab), `app_version` (your semver — lets you tie metric shifts to releases).

### Event taxonomy

| Event | Fires when | Key properties (type) | Serves |
|---|---|---|---|
| `account_signed_up` | account created | `method` (email/google/apple), `referral_source` | Acquisition funnel |
| `session_started` | new session begins | `is_pwa`, `device_type`, `app_version` | Engagement, version impact |
| `onboarding_completed` | finishes any first-run setup | `set_exam_date` (bool), `chosen_domain` (str) | Activation, commitment |
| `quiz_started` | quiz begins | `domain` (str), `topic` (str), `difficulty` (enum), `question_count` (int), `quiz_mode` (practice/exam) | Engagement, drop-off |
| `question_answered` | each answer submitted | `domain`, `topic`, `difficulty`, `is_correct` (bool), `time_to_answer_ms` (int), `question_id` (str) | Topic difficulty, drop-off (Decision 2) |
| `quiz_completed` | quiz finished | `domain`, `topic`, `score_pct` (num), `question_count`, `quiz_mode`, `duration_ms` | **North Star, activation, outcome** |
| `quiz_abandoned` | left mid-quiz | `domain`, `topic`, `questions_answered` (int), `questions_remaining` (int) | Churn signal, friction |
| `explanation_viewed` | opens an answer explanation | `domain`, `topic`, `was_incorrect` (bool), `question_id` | **Activation (learning loop)** |
| `topic_progress_changed` | mastery/progress crosses a threshold | `domain`, `topic`, `new_mastery_pct` (num) | Outcome / exam-readiness |
| `analytics_viewed` | opens performance/analytics screen | `surface` (str) | Engagement depth |
| `pwa_installed` | install accepted | `device_type` | Retention leading indicator |
| `session_returned` | session starts >24h after previous | `days_since_last` (int) | Retention, re-engagement |
| `exam_outcome_reported` | post-exam survey answered | `passed` (bool), `score` (num\|null), `cert_track` | **Outcome truth metric** |

### Naming/scope discipline — do NOT track yet

1. **Every button click / hover / scroll** — noise, no decision attached. Add specific ones only when a real question arises.
2. **Generic `page_viewed` for every screen** — let Vercel/Supabase basic traffic cover gross pageviews; track *meaningful* surfaces only (`analytics_viewed`).
3. **Per-keystroke or per-millisecond engagement timers** — vanity precision; `duration_ms` per quiz is enough.
4. **A/B-test scaffolding** — you have no traffic to power tests yet. Add when activation is instrumented and you have volume.
5. **Social/share micro-events** — no referral loop live yet; instrument when you build one.
6. **Feature-flag exposure events** — premature; revisit with the paid tier.
7. **Granular settings/preferences changes** — low decision value early.

Every event above earns its place by mapping to a Part-1 decision. If you can't name the decision, don't add the event.

### Privacy / PII (Supabase + RLS + exam data)

- **Never** send email, name, or free-text answers to the analytics layer. Identity is the opaque `auth.users.id` UUID only.
- `question_id` is fine (it's content metadata); a user's *specific wrong answers* tied to identity are sensitive learning data — keep aggregate scoring in analytics, keep the detailed per-user answer history in Postgres under RLS where it's already protected.
- If you adopt a hosted analytics tool, confirm it's GDPR-friendly and EU-region-capable (certanvil.com / UK-EU users). Prefer a cookieless or first-party setup; a PWA doesn't need third-party cookies.
- Add analytics consent to your existing privacy/terms pages before launch to real users.

---

## Part 3 — Implementation architecture & rollout

### Tooling recommendation

**Primary: PostHog (free/open-source tier, EU cloud or self-hosted).**

Rationale: it combines product analytics (events, funnels, retention, cohorts) *and* session/feature tooling in one, has a generous free tier (~1M events/month), a clean JS SDK that fits a vanilla-JS PWA, EU hosting for GDPR, and is self-hostable later if cost/control demands it. For a solo founder it collapses three tools into one. **Main trade-off:** at high volume PostHog Cloud pricing climbs, and self-hosting adds ops burden — but you're nowhere near that, and you can move to self-host before it bites.

**Complement: Supabase Postgres as your source-of-truth warehouse.** Your richest data (per-question history, mastery, scores) *already lives* in Postgres under RLS. Don't duplicate it into the event layer. Use PostHog for behavioral funnels/retention; use SQL on Postgres (via Supabase's SQL editor or a lightweight scheduled query) for outcome/mastery analysis. This split keeps sensitive learning data in your controlled DB and behavioral data in the tool built for it.

**Explicitly not recommended now:** Amplitude/Mixpanel (great, but free tiers and pricing are less founder-friendly than PostHog for this use case); a full warehouse + dbt + BI stack (massive overkill at your stage — revisit past ~50k MAU).

### Data flow

```
                 ┌─────────────────────────────────────┐
   User (PWA) ─► │ analytics.js wrapper (single module) │
                 │  • anon_id / user_id / session_id     │
                 │  • event_ts stamped at fire time      │
                 │  • offline queue in IndexedDB         │
                 └───────────────┬──────────────────────┘
                                 │ flush on reconnect
            ┌────────────────────┴───────────────────┐
            ▼ (behavioral events)                     ▼ (already happening)
      PostHog (EU)                            Supabase Postgres (RLS)
   funnels · retention · cohorts          per-question history · scores · mastery
            │                                          │
            └──────────────┬───────────────────────────┘
                           ▼
                 Dashboards (Part-1 decisions)
```

- **Client-side (PostHog JS):** all UI-driven behavioral events (`quiz_started`, `explanation_viewed`, etc.). Wrap the SDK in **one** `analytics.js` module — never call PostHog directly from feature code. This gives you a single place to enforce naming, attach identity, and handle the offline queue.
- **Server-side (Supabase Edge Function / Vercel function):** fire trust-sensitive or verifiable events server-side where possible — e.g. `account_signed_up` on the auth webhook, `exam_outcome_reported` on survey submit. Server-side events can't be blocked by ad-blockers and can't be spoofed by the client.
- **Postgres complements, doesn't duplicate:** mastery/score truth stays in your tables; analytics references it by aggregate, not by copying raw answer rows.

### First dashboards to build (each answers one Part-1 decision)

1. **Activation funnel** — signup → first `quiz_completed` → first `explanation_viewed`, by weekly cohort. *Answers: where do new users fall out before getting value? (Decision 3)*
2. **Topic difficulty / drop-off heatmap** — `question_answered` correct-rate and `quiz_abandoned` by `domain`/`topic`. *Answers: which topics cause drop-off and need content work? (Decision 2)*
3. **Retention curve** — classic cohort retention off `quiz_completed`, weekly. *Answers: what turns visitors into returning studiers, and is it improving? (Decision 4)*
4. **North Star trend** — Weekly Active Studiers (≥1 quiz), with `app_version` annotations. *Answers: is the product healthy week over week, and did a release help or hurt?*
5. **Outcome view (SQL on Postgres)** — mastery distribution + `exam_outcome_reported` pass rate. *Answers: is the product actually helping people pass? (Decision 1)*

Build #1 and #4 first. The rest follow once events flow.

### Phased rollout (critical path first; earn complexity)

**Phase 0 — Instrument the spine (½–1 day).**
Add `analytics.js` wrapper + PostHog. Fire only: `account_signed_up`, `session_started`, `quiz_started`, `quiz_completed`, `explanation_viewed`. Identity stitching + `event_ts`. → You can build the activation funnel and North Star immediately. *Resist adding more until these are verified clean.*

**Phase 1 — Depth & friction (1–2 days).**
Add `question_answered` (with topic/domain/difficulty/is_correct), `quiz_abandoned`, `topic_progress_changed`, `analytics_viewed`, `session_returned`, `pwa_installed`. Offline-queue flush. → Unlocks the topic heatmap and retention curve.

**Phase 2 — Outcome & growth (when you have volume / paid tier).**
Add `exam_outcome_reported` survey, server-side critical events, paid-plan properties, and *only then* consider A/B scaffolding and referral events. → Unlocks the truth metric and willingness-to-pay analysis.

### Top 3 ways this goes wrong for a solo founder (and the fix)

1. **Event bloat — tracking everything, deciding nothing.** You drown in events and still can't answer a single decision. *Fix: the "name the decision or don't add it" rule. Start with 5 events (Phase 0).* 
2. **Tracking scattered through feature code.** Six months in, naming has rotted, identity is inconsistent, and nobody trusts the numbers. *Fix: the single `analytics.js` wrapper — one chokepoint for naming, identity, and the offline queue.*
3. **Measuring activity, never outcome.** Dashboards look busy, but you never learn if anyone actually passed. *Fix: commit to the `exam_outcome_reported` survey early — the off-platform outcome is the one number that validates the whole product.*

---

## If you do only one thing this week

Ship **Phase 0**: the `analytics.js` wrapper with PostHog and five events (`account_signed_up`, `session_started`, `quiz_started`, `quiz_completed`, `explanation_viewed`), then build the **activation funnel**. That single funnel — signup → first quiz → first explanation — is the highest-leverage thing you can know before real users arrive, and everything else builds on the wrapper you write to get it.
