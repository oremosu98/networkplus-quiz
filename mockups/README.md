# Mockups

Standalone interactive HTML mockups — design reference for features before they land in-app. Part of the *concept-mockup-first* workflow (see `feedback_concept_mockup_first.md` in the user's memory).

**Why in the repo**: once committed, Vercel auto-deploys these alongside the app, so each mockup has a public interactive URL linkable from its feature-idea issue. Reviewers click the link, drag the 3D scene, watch the animation — no clone, no build, no localhost server.

## Rules

- **Frozen at concept time.** Once a mockup has validated the feature scope, don't keep editing it — the real implementation replaces it. Old mockups stay as historical design record.
- **No shared dependencies.** Each mockup is a single HTML file with inline CSS + JS. External deps load from CDN (Three.js, etc.). Keeps them individually openable forever without build hell.
- **Service worker ignores them.** `sw.js` caches the app shell only. Mockups live outside the cache on purpose so they don't consume shell cache slots.
- **Visual contract**: when a mockup has been approved verbatim, the screenshot inside it becomes a hard rule for the implementing ship. The actual feature must match pixel-correct (see #301 / #303 / #305 issues for examples — visual contracts locked in issue body).

## Current mockups (30 files)

### Cert app — drills + question types
- `security-acronym-blitz-concept.html` — Security+ Acronym Blitz drill (shipped v4.91.0)
- `security-attack-mitigation-match-concept.html` — Attack-to-Mitigation Match (shipped v4.94.0, #301)
- `security-control-type-sorter-concept.html` — Control Type Sorter dual-axis MCQ (shipped v4.95.0, #302)
- `network-packet-trace-drill-concept.html` — Packet Trace Drill (#305, queued)
- `network-analysis-drill-concept.html` — Network Analysis drill (shipped earlier)
- `diagnostic-pbq-concept.html` — first PBQ format
- `hot-area-concept.html` — Hot Area PBQ format
- `quiz-revisit-concept.html` — quiz review surface
- `exam-review-filters-concept.html` — exam-results review filters
- `readiness-why-card-concept.html` — readiness card "why" expand
- `today-consolidation-concept.html` + `today-plan-prod-preview.html` — Today's Plan card

### Cert app — Topology Builder + 3D View
- `tb-3d-view-concept.html` — TB 3D View core ([#199](https://github.com/oremosu98/networkplus-quiz/issues/199), shipped Phases 1-4)
- `tb-3d-encapsulation-concept.html` — packet encapsulation 3D explorer (#202)
- `tb-3d-subnet-concept.html` — subnet visualizer (#203)
- `tb-3d-vlan-floors-concept.html` — VLAN floors (#204)

### Cert app — diagnostic + pass plan
- `diagnostic-pass-plan-concept.html` — Baseline Diagnostic + Pass Plan (shipped v4.81.0)

### Account + admin
- `account-settings-concept.html` — `/account` page (shipped v4.90.0)
- `cert-pass-tracking-concept.html` — Exam results section + cert-tile data-driven swap (shipped v4.93.0)

### Landing site
- `certanvil-landing-cert-picker.html` — landing cert picker
- `certanvil-logo-concepts.html` + `certanvil-minimalist-concepts.html` + `certanvil-minimalist-icon-set.html` — brand identity / logo iterations
- `certanvil-auth-flow-concept.html` — magic-link auth UX
- `landing-cert-mode-quick-wins-concept.html` — landing cert-mode quick wins
- `landing-cert-preview-panel-concept.html` — "What you'll actually use" panel (shipped v4.92.0)
- `landing-pricing-and-faq-concept.html` — pricing + FAQ section

### Cert app — cloud-first migration architecture
- `cert-app-cloud-first-c-prime-concept.html` — Phase C′ architecture mockup (shipped v4.89.0-8)
- `cert-app-cloud-sync-bundle-c-d-f-concept.html` — sync bundle architecture
- `cert-app-supabase-integration-concept.html` — Supabase integration spec
