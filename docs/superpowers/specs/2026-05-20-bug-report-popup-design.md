---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# Bug-Report Popup · Design Spec

| | |
|---|---|
| **Date** | 2026-05-20 |
| **Status** | Approved (design phase) · ready for plan |
| **Owner** | Founder (CertAnvil) |
| **Source** | Brainstorming session 83364-1779232215 |
| **Companion** | `.superpowers/brainstorm/83364-1779232215/content/*.html` (10 mockups) |

---

## 1. Motivation

Real users will need a way to report bugs without leaving the app or opening GitHub. The founder also wants the same surface during dogfood passes. Current state: bad-quiz-question reports work via `reportIssue()` at `app.js:13008`; no general bug-report path exists. Both audiences land in the same GitHub Issues backlog tagged differently.

## 2. Scope

**In:**
- Drawer popup triggered from topbar bug icon and Settings → Reports → New
- Auto-attached context snapshot (version, page, cert, theme, viewport, last-quiz, wrong-bank size)
- GitHub Issues POST via existing `STORAGE.GH_TOKEN` (user-entered PAT, BYOK)
- Local retry queue in `localStorage.nplus_reports`, drained once per page load
- Settings → Reports recovery surface for failed sends

**Deferred (not in this spec):**
- Anonymous reporting (no token) via Vercel function proxy — Phase 2 if usage data justifies it
- Reporter persona attachment for the AI user agent (separate plan)
- In-app reply thread / GitHub Issue comment surfacing back to user

**Out:**
- Email-based fallback channel
- Screenshot capture (browser security + native-app friction not worth the build for n=1 founder)

## 3. Architecture

Three layers and one retry loop.

```
┌─ DRAWER UI ─────────────────────────────┐
│  topbar icon / Settings → opens drawer  │
│  portal-to-body, role=dialog            │
└─────────────────┬───────────────────────┘
                  │
┌─ REPORT MODULE (lazy-loaded) ───────────┐
│  buildPayload()  → JSON                 │
│  renderIssueBody() → markdown           │
│  classifyError() → routing decision     │
│  enqueueReport() → localStorage         │
└─────────────────┬───────────────────────┘
                  │
┌─ DESTINATION ───────────────────────────┐
│  fetch GitHub Issues API                │
│  POST /repos/{owner}/{repo}/issues      │
│  Authorization: Bearer STORAGE.GH_TOKEN │
└─────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
   200/201               fail (any)
       │                     │
  toast green +         enqueue +
  clear queue           toast amber/red
                             │
                  ┌──────────┴──────────┐
                  │ DOMContentLoaded     │
                  │ next page load:      │
                  │ drain queue (1 try)  │
                  └──────────────────────┘
```

Module loads via the established `_loadFeature('reports')` shell helper. IIFE pattern, window-exposed, filename matches feature key (`reports.js` → `_loadFeature('reports')`). Lazy-load contract proven 4× in v4.99.41+ extractions.

## 4. Components

Light + dark theme variants. Single drawer mockup carries forward to both.

**Drawer (right-anchored, content-anchored height):**
- Position: `top:14px; right:14px; width: 49%; max-height: calc(100% - 28px)`
- Height behaves as `flex: 0 1 auto` on the body — only as tall as the form needs, scrolls if a long description exceeds the cap
- Header: `§ Report` eyebrow (bronze accent with decorative rule) · Fraunces 20px title "Report an issue" · close × (top-right)
- Body fields: Title (required, single-line) · Description (required, textarea, min-height 78px) · quiet text-link "+ Add steps to reproduce" (expander, optional)
- Auto-context strip: tinted bronze block · "Auto-attached" header · monospace one-liner with bolded key fields
- Footer: asymmetric · Cancel as text-link (left) · Send report as bronze primary button (right) · sits directly below auto-context (no whitespace void)

**Toast (success state):**
- Position: `bottom:18px; left:18px; max-width:280px`
- Surface tone: green-accented `border` + green-tinted icon chip
- Content: "Report filed" + "Issue #142 · tap to open" (clickable, opens GitHub in new tab)

**Topbar bug icon:**
- 30px boxed iconbtn matching v4.99.86 sidebar/topbar editorial language
- Slots next to theme toggle
- Hairline border, hover accent, single bronze accent square in mocked preview

Motion (per `emil-design-eng`):
- Slide-in from right · `transform: translateX(100%) → 0` · `220ms cubic-bezier(0.16, 1, 0.3, 1)`
- Backdrop fade · `opacity 0 → 0.4` · same easing, same duration
- Reduced-motion gate: skip transitions, snap to final state
- Drawer reparents to `<body>` on open to escape `#page-setup`'s transform-based containing block (v5.5.4 portal pattern)

## 5. Data flow

### 5.1 Payload shape (sent to `buildPayload`)

```json
{
  "id": "rpt_2026-05-20T14-32-07_a3f9",
  "title": "Streak number doesn't update after I finish a quiz",
  "description": "I just finished a 10-question session on Subnetting & got 7/10. The streak in the sidebar still shows the old number; only refreshes when I navigate to Home and back.",
  "steps": null,
  "context": {
    "version": "v5.5.12",
    "page": "#page-setup",
    "cert": "netplus-N10-009",
    "theme": "light",
    "viewport": "1440x900",
    "last_quiz": { "topic": "subnetting", "score": "7/10", "minutes_ago": 2 },
    "wrong_bank_size": 4
  },
  "submitted_at": "2026-05-20T14:32:07Z",
  "attempt_count": 1
}
```

`id` format: `rpt_<ISO-no-colons>_<4-char-hex>`. Stable across retries.

`context` reads from runtime — never from server, never from cookies. No email, no display name, no PII. Cross-cert leak filter applies: `last_quiz.topic` filtered by `_isCurrentCertTopic()` against active cert's `TOPIC_DOMAINS`.

### 5.2 GitHub Issue body (returned from `renderIssueBody`)

Title prefix: `[user-report]`. (A `[founder-report]` variant gated by a Settings toggle is listed as an open question below.)

Body markdown:
```
## What happened

{description}

## Steps to reproduce

{steps OR "_not provided_"}

<details>
<summary>Auto-attached context</summary>

| field | value |
|---|---|
| version | v5.5.12 |
| page | #page-setup |
| cert | netplus-N10-009 |
| theme | light |
| viewport | 1440x900 |
| last quiz | subnetting · 7/10 · 2m ago |
| wrong-bank | 4 |

</details>

---
_Filed via in-app reporter · id: rpt_2026-05-20T14-32-07_a3f9_
```

Issue labels: `bug-report` + `cert:netplus-N10-009` + `version:v5.5.12`.

### 5.3 Retry queue (`STORAGE.REPORTS`)

```js
// localStorage key: "nplus_reports"
[
  {
    id: "rpt_...",
    payload: { /* full payload */ },
    attempts: 1,
    last_try: "2026-05-20T14:32:07Z",
    next_try: null,           // set only for rate-limit case
    terminal: false           // true means do-not-auto-retry
  },
  // ... up to 25 entries, LRU eviction
]
```

Drain semantics:
- One `DOMContentLoaded` listener, one fetch per non-terminal entry
- No `setInterval`, no service worker, no background tab waking
- Max 1 attempt per page load per entry
- Capped at 25 entries · LRU evicts oldest non-terminal first

## 6. Error handling

### 6.1 Before submit (client-side)

| State | Send button | What the user sees |
|---|---|---|
| Title empty | disabled | red border + "Title is required" caption |
| Description empty | disabled | red border + caption |
| Description 4,000–4,999 chars | enabled | amber counter "X / 5,000" appears |
| Description = 5,000 chars | enabled | hard cap, further keystrokes rejected |
| No `STORAGE.GH_TOKEN` configured | locked | red banner with deep-link to Settings → Integrations |

### 6.2 After submit (API response matrix)

| Trigger | HTTP / signal | Toast | Queue action | Tone |
|---|---|---|---|---|
| Success | 201 Created | "Report filed · Issue #N · tap to open" | none · clear if was retrying | green |
| Offline | no response | "Saved offline · retries on next visit" | enqueue, attempts:1 | amber |
| Server error | 500 / 502 / 503 | "GitHub error · retries on next visit" | enqueue, attempts++ | amber |
| Rate-limited | 403 + `x-ratelimit-remaining:0` | "Rate-limited · retries in {N} min" | enqueue, `next_try` = reset header | amber |
| Token rejected | 401 | "Token rejected · open Settings" | enqueue, `terminal:true` | red |
| Scope missing | 403 (no rate-limit headers) | "Token lacks scope · update in Settings" | enqueue, `terminal:true` | red |
| Payload rejected | 422 | "Couldn't send · check console" | enqueue, `terminal:true` + `console.error(reason)` | red |

### 6.3 Recovery surface (Settings → Reports panel)

- Header: "Pending reports (N)" + "Retry all now" button
- Per-row: status pill (Pending amber / Failed red / Sent green) · title preview · `rpt_` id + attempts + failure reason in monospace · timestamp · Retry / Delete actions
- Footer: storage key reference (`nplus_reports`) + LRU cap reminder + count summary

Three rules:
1. **Never silently drop a report.** Every fail enqueues. Auto-retry behavior varies, but the entry is always recoverable.
2. **Hard fail = user can fix it.** 401 and scope-missing both surface in toast + Settings.
3. **Console logging is for the founder.** 422 dumps response JSON to `console.error` for the next dogfood pass.

## 7. Testing

### 7.1 Behavioral fixtures (4 · pure functions · vm-sandbox)

- `buildPayload(form, ctx)` — asserts 7 top-level keys in order, ID regex match, trimmed strings, no PII in context
- `renderIssueBody(payload)` — asserts markdown sections (`## What happened`, `## Steps to reproduce`, `<details>` block, table rows for all 7 context fields, footer id)
- `classifyError(resp)` — 7 input cases → `{type, queueAction, toast, terminal}` · asserts `terminal:true` for 401, 403-scope, 422 only
- `enqueueReport(rpt, store)` — empty / in-place update / LRU at cap 25 · asserts length + presence + dropped-id absence

### 7.2 DOM tests (9 · jsdom + Playwright)

| # | Scenario | Stack |
|---|---|---|
| 01 | Opens from topbar bug icon | Playwright |
| 02 | Opens from Settings deep-link | Playwright |
| 03 | Closes via ESC, ×, Cancel, backdrop (all 4 paths restore focus, leave draft in `SESSION.DRAFT`) | Playwright |
| 04 | Send button gated by required fields + token presence | jsdom |
| 05 | Char counter activates at 4,000 / hard-caps at 5,000 | jsdom |
| 06 | Steps-to-reproduce expander toggles | jsdom |
| 07 | Toast appears, auto-dismisses at 5s, tap opens issue URL | Playwright |
| 08 | Retry queue drains once on `DOMContentLoaded` (seed 3 entries, observe 1 fetch per non-terminal) | Playwright |
| 09 | Cross-cert leak filter: switch to Sec+, `ctx.cert` reads `secplus-SY0-701`, no Net+ topic leak | Playwright |

### 7.3 Dogfood smoke (8 steps · manual · ~5–7 min · pre-merge)

1. Open drawer from topbar on local. Bronze icon visible, click opens with motion, title input focused.
2. File real issue from local dev. Toast shows #N, click opens GH tab, auto-context table populated.
3. Throttle network to offline in devtools. File another. Toast: "Saved offline". Inspect `localStorage.nplus_reports` → entry present, attempts:1.
4. Restore network, reload. Queue drains within 1s. Toast: "Filed offline report · #N". Queue back to empty.
5. Break token (edit to garbage), retry. Toast: "Token rejected · open Settings". Settings → Reports shows red Failed pill, terminal flag. Restore token, Retry button → success.
6. Switch cert Net+ → Sec+, open drawer. Auto-context shows `secplus-SY0-701`. Last quiz reflects current cert only. **No Net+ topic leak.**
7. Toggle to dark theme, repeat step 2. Drawer + toast adapt. No light-mode artifacts.
8. Resize to 375×667 (mobile), repeat step 2. Drawer becomes full-width bottom sheet. Tap targets ≥ 44px. Send visible without scrolling on empty form.

### 7.4 Cross-concerns

- **Data-safety rule:** all tests + dogfood run on localhost. Never seed `nplus_*` on prod from MCP `javascript_tool` (origin: v4.81.x corruption incident).
- **Theme parity:** dogfood step 7. Snapshots stored under `tests/snapshots/bug-report/`.
- **Mobile-primary:** dogfood step 8 hits the launch surface. Bottom-sheet variant is an implementation requirement (decision below).
- **A11y baseline:** `role=dialog`, focus trap, ESC closes, `aria-labelledby` points to title. Verified in DOM tests 01 + 03.

## 8. Open questions and deferred decisions

| # | Question | Default if not raised |
|---|---|---|
| Q1 | Mobile drawer variant: full-width bottom sheet vs full-screen modal at viewport < 768px? | Bottom sheet (slides up from bottom, height: auto, max 85vh) |
| Q2 | Topbar bug icon: show count badge when retry queue non-empty? | Yes, small bronze dot (no number) when count > 0 |
| Q3 | Keyboard shortcut to open drawer? | `Cmd/Ctrl + ?` (matches help-modal convention if used elsewhere; otherwise skip) |
| Q4 | Issue body: include `User-Agent` string? | No (privacy + GitHub already records it on issue creation) |
| Q5 | Retry queue: alert user via toast on next visit when a queued report finally lands? | Yes, single non-blocking green toast on success |
| Q6 | `[founder-report]` title prefix variant gated by a Settings toggle? | No (skip) — keep one prefix until usage data shows the founder filing enough to want filtering |

Defaults are what the plan will assume unless the founder overrides during plan review.

## 9. Acceptance criteria

This is shippable when:

- [ ] All 4 behavioral fixtures pass
- [ ] All 9 DOM tests pass (local + CI)
- [ ] 8-step dogfood smoke completes cleanly on local
- [ ] Drawer renders correctly in light + dark theme without flicker
- [ ] Mobile viewport (375×667) renders drawer as bottom sheet, all controls reachable
- [ ] Cross-cert leak filter test (DOM test 09) passes on both Net+ and Sec+
- [ ] No `STORAGE.GH_TOKEN` regression — existing `reportIssue()` for bad-quiz-questions still works
- [ ] `.superpowers/brainstorm/*` and any localhost-only seed scripts excluded from git
- [ ] No secrets in source (token reads from localStorage only)
- [ ] Reduced-motion gate honored (`prefers-reduced-motion: reduce`)
- [ ] Module gates behind `_loadFeature('reports')` — no eager-load on app boot

## 10. Implementation handoff notes

For the plan author (writing-plans skill):

- **Feature module pattern:** lazy-load via `_loadFeature('reports')`. File at `js/features/reports.js`. IIFE + window-exposure. Filename matches feature key.
- **Storage namespace:** use `STORAGE` wrapper (existing). New key `nplus_reports`. Add to TS types if applicable.
- **Topbar entry:** new iconbtn slots next to theme toggle. Match v4.99.86 sidebar/topbar editorial language (30px boxed, hairline border, hover accent).
- **Settings entry:** new section "Reports" under Integrations. Renders the list + retry/delete actions.
- **Existing `reportIssue()` at `app.js:13008`** — keep working for bad-quiz reports. New code is additive, not a replacement.
- **CI:** existing Playwright config covers it. New tests go under `tests/e2e/bug-report.spec.ts`.
- **Concept mockup is the v4 light + v1 dark drawer mockups** under `.superpowers/brainstorm/83364-1779232215/content/`. Implementation should be visually identical at the design-token level.
- **Ship discipline:** branch only. No version-bump, no PR open, no CI push until the founder gives the ship signal.
