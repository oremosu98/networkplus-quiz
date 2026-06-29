---
type: architecture
status: active
cert: all
updated: 2026-06-29
tags: [architecture]
---
# CertAnvil — Project & Folder Structure

> Snapshot after the 2026-06-27 rename (everything is now **`certanvil`**) and deep cleanup.
> Companion to [key-patterns.md](key-patterns.md) (how the app works) and [feature-subsystems.md](feature-subsystems.md) (per-feature internals). This doc is the **map**: where things live and how they deploy.

## Live infrastructure — how it deploys

```
GitHub: oremosu98/certanvil
        │  push to main
        ▼
CI (UAT + Playwright) ──► Vercel CLI (single deploy job, token + project ID)
        │
        ├──► ▲ certanvil-app      (prj_OJ7…)  — ONE project, serves ALL 7 certs:
        │        networkplus · secplus · aplus · azure · ai · sc900 · clfc02   (·.certanvil.com)
        │        cert is detected at runtime from the hostname (auth-state.js)
        │
        └──► ▲ certanvil-landing  (prj_7Gat…) — certanvil.com + www  (built from landing/)
```

- **One app project, many domains** ("Pattern A") — do **not** split per-cert; a single deploy updates every cert.
- Deploys run via the **Vercel CLI + token + project ID** (not GitHub auto-deploy), so the repo name is decoupled from the deploy.
- The redundant second Security+ deploy was removed in the cleanup; there is now exactly one production deploy job.

## Repo folders — `certanvil/`

```
certanvil/
├── App core (root)
│   ├── app.js · index.html · styles.css · sw.js
│   ├── auth-state.js · cloud-store.js · migration.js · lift-shell.js
│   ├── dg-system.css · dg-depurple.css · lift-*.css · analytics.js · event-actions.js
│   └── manifest.json · vercel.json · package.json · CLAUDE.md + pinned root docs
│       (IOS_TESTING.md · SHIP_CHECKLIST.md · ENVIRONMENT_STRATEGY.md · CHANGELOG.md)
│
├── Data & features
│   ├── certs/        cert packs (netplus, secplus, …)
│   ├── features/     lazy-loaded feature modules
│   ├── lib/          Supabase client (cookie-backed, cross-subdomain)
│   ├── api/
│   └── supabase/     migrations
│
├── Design & content
│   ├── mockups/                ★ source-of-truth design view — every feature is a faithful
│   │                            lift of its mockup; kept DEPLOY-SERVED for on-device preview
│   ├── design/svg-icons/       ★ 132 bespoke CertAnvil SVGs — the curated icon library
│   ├── design/brand/           brand kit / tokens
│   ├── design/{hallmark-mockups, experiments}/
│   └── dogfood/                documented smoke-test path
│
├── Docs & tooling
│   ├── docs/architecture · conventions · audits · mobile · planning · research · decisions
│   ├── docs/superpowers/plans/   ← single home for ALL build & Phase-G plans
│   ├── scripts/ · tests/
│   └── landing/                  certanvil.com source (its OWN Vercel project)
│
└── (git-ignored, regenerated — not committed)
    dist/ · node_modules/ · playwright-report/ · test-results/
```

**★ Active key assets — do not archive:** `mockups/` and `design/svg-icons/`.

## Sibling archive (outside the repo, recoverable)

Dead/superseded material was moved to **`~/Desktop/Dev Projects/_certanvil-archive/`** — kept on disk **and** in git history (two safety nets), not in the working repo:

| Archived | Why |
|---|---|
| `_parked-mobile-fit2/` (93M) | abandoned WIP, zero references |
| `tablet-audit/` (40M) | regenerable screenshot output (`scripts/tablet-audit.js`) |
| `audit-workspace/` | superseded; only a stale doc-comment referenced it |
| `design-svg-icons-pngs/` (38M) | PNG previews of the SVGs — the SVGs themselves stayed |
| `docs-handoffs/` | completed `RESUME-TB-V3-PHASE3/4/5` notes |
| `root-docs/` | old `AI_QUIZ_HANDOFF.md` |

~171M off the tracked repo. The empty root `SVG ICONS/` folder (only `.DS_Store`) was deleted outright. The archive folder can be deleted entirely once you're confident none of it is needed — git history still has everything.

## Related
[[key-patterns]] · [[feature-subsystems]] · [[CLAUDE]] · [[conventions]] · [[ENVIRONMENT_STRATEGY]]
