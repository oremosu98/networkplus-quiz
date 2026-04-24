# Mockups

Standalone interactive HTML mockups — design reference for features before they land in-app. Part of the *concept-mockup-first* workflow (see `feedback_concept_mockup_first.md` in the user's memory).

**Why in the repo**: once committed, Vercel auto-deploys these alongside the app, so each mockup has a public interactive URL linkable from its feature-idea issue. Reviewers click the link, drag the 3D scene, watch the animation — no clone, no build, no localhost server.

## Current mockups

| File | Issue | What it previews |
|---|---|---|
| `tb-3d-view-concept.html` | [#199](https://github.com/oremosu98/networkplus-quiz/issues/199) | Network Builder 3D view — VLAN floor plates, flat-shaded device primitives, bezier cables, packet-trace animation, compass + camera rail + inspector panel |

## Rules

- **Frozen at concept time.** Once a mockup has validated the feature scope, don't keep editing it — the real implementation replaces it. Old mockups stay as historical design record.
- **No shared dependencies.** Each mockup is a single HTML file with inline CSS + JS. External deps load from CDN (Three.js, etc.). Keeps them individually openable forever without build hell.
- **Service worker ignores them.** `sw.js` caches the app shell only. Mockups live outside the cache on purpose so they don't consume shell cache slots.
