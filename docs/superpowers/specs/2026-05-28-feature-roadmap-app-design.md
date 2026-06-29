---
type: spec
status: shipped
cert: all
updated: 2026-06-29
tags: [spec]
---
# Feature Roadmap App — Design Spec

**Date:** 2026-05-28
**Status:** Design approved, awaiting spec review → implementation plan
**Type:** Standalone personal tool (separate from the CertAnvil app)

## Purpose

A minimalist, local-only app for capturing CertAnvil feature ideas, having an AI agent
reason about their value and priority (MoSCoW), ranking them, handing a chosen feature
off to a Claude planning session, and manually closing it once shipped. Single user
(the founder), runs locally, no cloud.

## Goals

- Generate candidate feature ideas (AI brainstorm) **and** log ideas typed manually.
- AI scores each idea on transparent sub-factors + a rationale, suggests a MoSCoW bucket.
- Founder ranks/overrides; board sorts by computed value.
- One-click handoff: build a planning brief, copy to clipboard and/or save into the repo.
- One-click "Shipped" to archive a delivered feature.

## Non-Goals (YAGNI)

- Version polling / automatic deploy detection (explicitly chose manual "Shipped").
- Cloud sync, multi-user, auth, accounts.
- Drag-and-drop reordering (cards auto-sort by value score).
- Mobile / responsive beyond "usable on a laptop".
- A backend or proxy server.

## Architecture (Option A — single static app, no build)

Three co-located files, zero build step:

- `index.html`
- `styles.css`
- `app.js`

Launch via a trivial static server on `localhost` (e.g. `python3 -m http.server`), **not**
`file://` — the Clipboard API and File-System-Access API require a secure context to work
reliably, and `file://` is unreliable for both across browsers.

The app calls the Anthropic Messages API **directly from the browser** using the
`anthropic-dangerous-direct-browser-access: true` header. No backend, no proxy.

All state persists in `localStorage`. The API key is stored in `localStorage` as well —
acceptable for a personal, local-only tool on the founder's own machine.

## Data Model (`localStorage`)

Single JSON blob under one key (e.g. `certanvil-roadmap-v1`):

```
{
  version: 1,
  apiKey: "sk-ant-...",
  model: "claude-opus-4-...",            // configurable in Settings
  projectContext: "editable CertAnvil summary; sent with every AI call",
  ideas: [
    {
      id: "uuid",
      title: "string",
      description: "string",
      notes: "string",                   // founder's own thoughts
      moscow: "must" | "should" | "could" | "wont",   // AI-suggested, user can override
      value: {
        reach: 1..5,
        impact: 1..5,
        confidence: 1..5,
        effort: 1..5,
        score: 0..100,                   // computed, see below
        rationale: "one-line AI explanation"
      },
      status: "backlog" | "building" | "shipped",
      source: "manual" | "ai",
      createdAt: ISO8601,
      updatedAt: ISO8601,
      shippedAt: ISO8601 | null
    }
  ]
}
```

## Value & Priority Model

For each idea the AI returns four 1–5 sub-scores plus a one-line rationale:

- **Reach** — how many users the feature touches
- **Impact** — how much it moves the needle for those users
- **Confidence** — how sure we are about reach/impact
- **Effort** — relative build cost

Computed value (pure function, unit-tested):

```
rawValue = (reach * impact * confidence) / effort     // range: 0.2 .. 125
score    = round(min(100, rawValue / 125 * 100))      // normalized 0..100
```

The AI also **suggests** a MoSCoW bucket derived from the score. The founder always has
final say and can override the bucket or any sub-score by hand (recomputes score on edit).
This keeps the AI's judgment transparent (numbers + rationale) rather than a black-box label.

## UI

Minimalist, single-screen board.

- **Board:** four MoSCoW columns — Must / Should / Could / Won't. Cards auto-sorted by
  value score (descending) within each column.
- **Card:** title (Fraunces), value-score chip, compact R/I/C/E stats, status badge.
  Expandable to reveal AI rationale + full description. Actions: **Develop** (→ handoff),
  **Edit**, **Shipped**, **Delete**.
- **Header bar:** "Brainstorm ideas", "Add idea", filter toggle (show/hide Shipped),
  Settings (gear).
- **Modals:**
  - *Add/Edit* — title, description, notes, manual R/I/C/E override, MoSCoW override.
  - *Brainstorm* — AI-proposed candidates rendered as an accept/reject checklist; accepted
    items drop into Backlog (status `backlog`).
  - *Settings* — API key, model selection, Project Context textarea.
- Shipped items are hidden by default; surfaced via the filter toggle.

## AI Flows

Two API calls, both instructed to return **strict JSON**, validated client-side.

1. **Score** (on add / on demand): sends Project Context + idea title/description →
   `{ reach, impact, confidence, effort, rationale, suggestedMoscow }`.
2. **Brainstorm:** sends Project Context + existing idea titles (for dedupe) →
   array of `{ title, description, reach, impact, confidence, effort, rationale, suggestedMoscow }`.

## Handoff (Develop button)

Builds a markdown planning brief containing: title, description, founder notes, AI
sub-scores + rationale, MoSCoW bucket, and a kickoff line
(e.g. "Plan this feature for CertAnvil (v7.6.0). Context below. Let's plan it."). Then:

- **Copy to clipboard** (default), and
- **Save to repo** (optional) — writes `feature-brief-<slug>.md` into CertAnvil's `docs/`
  via the File-System-Access API, once folder access has been granted for the session.

Triggering Develop sets the idea's status to `building`.

## Error Handling

- **No API key** → AI actions are blocked with a prompt to open Settings.
- **API failure** (401 / network / rate limit) → toast with the error + Retry. The idea is
  still saved and can be scored manually.
- **Malformed model JSON** → one automatic retry, then fall back to manual scoring with a
  notice.
- **Clipboard / File-System-Access unavailable** → fall back to showing the brief in a
  selectable textarea for manual copy.
- **localStorage write failure** (quota) → non-blocking warning toast.

## Visual Design

- **Palette: pure black & white only.** Background white (`#ffffff`), text black (`#000000`),
  grey hairlines/dividers for structure. **No color accent** — hierarchy comes from weight,
  size, and the Fraunces display face, not hue. Value chips and status badges use
  black/white/grey with outlines, never color.
- **Typography matches CertAnvil exactly:**
  - Headings, card titles, value score: `'Fraunces', Georgia, serif` (Google Fonts, 500/600/700)
  - Body, labels, buttons, stats: `Inter, -apple-system, sans-serif`
  - Both loaded from Google Fonts (`preconnect` + `display=swap`), mirroring CertAnvil.

## Testing

Proportional to a personal static tool:

- Pure functions (`computeValueScore`, JSON-parse/validate for AI responses) extracted and
  unit-tested.
- UI verified manually in-browser (capture → score → rank → handoff → ship golden path,
  plus the error fallbacks).

## Design Skills to Invoke During Build

To be invoked in the implementation phase (not during planning):

- `ui-ux-pro-max`
- `taste-skill` (the design-taste skill pack)
- `stop-slop`
- `emil-design-eng`

## Open Questions / Defaults

- Project Context is maintained by hand in Settings (paste CertAnvil's `CLAUDE.md` or a
  summary). The app does not read the repo for context. (Default — confirm during build.)
- Default model set in Settings; spec assumes a current Claude Opus model.
