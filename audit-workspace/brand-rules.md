# Brand rules extracted — CertAnvil BRAND.md (v5.5.12, 2026-05-19)

Source: `design/brand/BRAND.md`. Live token ground truth cross-checked against `dg-system.css` lines 20–81 (matches BRAND.md §3 exactly).

| # | Rule | Source | Confidence |
|---|------|--------|------------|
| R1 | All color tokens are OKLCH; never hardcode hex for chrome (gradients/borders/shadows/tints). Hex only for brand-illustrative SVG fills. | §3 | Explicit |
| R2 | Dark accent = oklch(0.80 0.155 64); light accent = oklch(0.50 0.155 55); accent-deep darker than accent; pass/warn greens per token table. Dark theme is cool hue-275; light theme warm hue-85. | §3 + dg-system.css | Explicit |
| R3 | Tints via color-mix(in oklab, var(--accent) N%, transparent); shadows theme-adaptive via color-mix with var(--text) — never rgba()/hex shadows on chrome. | §3, §5 | Explicit |
| R4 | Fraunces 600 for display; Inter for all UI; UPPERCASE eyebrows = Inter 10–11px / 800 / 0.08–0.14em tracking, never Fraunces. | §4 | Explicit |
| R5 | Any Fraunces hero number must set `font-variant-numeric: lining-nums tabular-nums` + `font-feature-settings: "lnum","tnum"`. Stacked display numerals: line-height ≥ 1.0. | §4 (v5.5.11–12) | Explicit |
| R6 | Radius: cards 14–20px, chips/buttons 7–11px, pills 999px. NOTE: live dg-system.css sets `--radius:12px` for buttons — toolkit/live inconsistency, treat 12px as acceptable. | §5 + dg-system.css | Explicit (with noted conflict) |
| R7 | Easing = cubic-bezier(0.16, 1, 0.3, 1) (literal on body-portaled elements). transform+opacity only. Entrances start scale(0.96–0.98), never scale(0). :active scale(0.97). Hover gated `(hover:hover) and (pointer:fine)`. Reduced-motion → fade-only. | §6 | Explicit |
| R8 | Duration table: hover 150–160ms, lifts 200–220ms, toasts 340–380ms, card reveals 520–560ms, bar/chart sweeps 800–1100ms; UI motion ≤ ~600ms. | §6 | Explicit |
| R9 | Icons: monoline stroke currentColor (UI) or brand-illustrative set (sparingly). No emoji as decoration; only semantic ✓/✗/→ survive. Streak flame = 07_study_streak.svg (brand-illustrative). | §7, §9 | Explicit |
| R10 | No em dashes in copy ("Go Pro — unlimited" is the one approved verbatim survivor). No throat-clearing, no vague declaratives. | §9 + handoff | Explicit |
| R11 | No purple; no card-spam; no gradient backgrounds on chrome; single focal bronze action per surface; cards = surface + hairline border. | §8, §9 | Explicit |
| R12 | Both themes verified on every ship (v4.99.63 lesson). | §3 | Explicit |

Ambiguities noted:
- BRAND.md light `--surface` = oklch(0.992 0.004 85) but dg-system.css app override uses 0.945 — both are "brand"; mockups may use either.
- Button radius 7–11px (toolkit) vs --radius:12px (live) — live wins for app surfaces.
- The mockups' "cert-ios lift grammar" token set is NOT a documented brand token set; treated as approximation, not authority.
