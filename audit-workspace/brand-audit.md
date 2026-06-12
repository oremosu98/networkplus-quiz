# Brand Audit — Reword Gauntlet mockups

**Audited:** `mockups/reword-gauntlet.html` + `mockups/landing-gauntlet-section.html` (feat/reword-gauntlet worktree)
**Against:** `design/brand/BRAND.md` (v5.5.12), cross-checked with live `dg-system.css` tokens
**Date:** 2026-06-12
**Method:** static source read + numeric hex→OKLCH conversion. No rendered screenshots in this pass (verification screenshots taken after fixes, on the 4182 preview).

---

## Executive summary

The mockups are structurally and editorially on-brand — Fraunces/Inter split, hairline cards, single focal bronze action per screen, color-mix tints, reduced-motion handling, no purple, no em dashes, no card-spam. The drift is concentrated in one root cause: **both files invent their own hardcoded-hex token blocks instead of using the brand OKLCH tokens**, and those eyeballed hexes are measurably off (accent pulled 9–19° toward flat gold, landing accent 35% under-saturated, pass/fail greens are Tailwind defaults). Add a wrong easing curve, one decorative emoji, rgba shadows, and a Fraunces numeral missing lining-nums (the exact bug v5.5.12 was shipped to kill). This is a token-level cleanup, not a redesign — if the mockups were lifted 1:1 as-is, the app would visibly run two bronzes.

**Top 3 issues to fix first:**
1. Replace both hex token blocks with brand OKLCH values (F-001/F-002/F-003)
2. Swap the easing curve to the locked system curve (F-005)
3. Replace the ⚡ emoji with a monoline flame SVG (F-006)

**Finding count by severity:** Critical 0 · Major 6 · Minor 5

**Categories covered:** Color, Typography, Iconography, Motion, Components, Voice & tone, Style coherence
**Categories not covered:** Logo (neither mockup renders the monogram); Imagery (no photography/illustration in scope)

---

## Findings

Full structured detail in `findings.json`. Summary:

### Color
- **F-001 · Hardcoded-hex token blocks instead of brand OKLCH · major** — both files. Fix: swap to BRAND.md §3 / dg-system values; at lift time use the app's real tokens.
- **F-002 · Accent bronze drifted to flat gold · major** — dark `#e8a33d` → oklch(0.765 0.140 **72.9**) vs brand oklch(0.80 0.155 **64**); light `#a8741f` is +0.10 lighter and -0.04 chroma vs oklch(0.50 0.155 55); landing `#8a5a14` chroma 0.102 vs 0.155.
- **F-003 · Tailwind pass/fail colors · major** — `#4ade80`/`#f87171` are Tailwind green-400/red-400, not brand `--green`/`--red`.
- **F-007 · rgba() shadows on product chrome + CTA accent glow · major** — landing `.demo` card shadow is rgba; app CTA has a 75% accent glow (live `.btn-primary` ships shadow-free).

### Typography
- **F-008 · Fraunces "Cracked 4 of 5" missing lining-nums · major** — the v5.5.12 regression, verbatim.
- **F-010 · Tracking over 0.14em / labels under 10px / Inter 750 · minor** — `.seal-k` 0.22em, `.kicker` 0.16em, `.pill` 9px, `.rung-name` 8.5px, mark weight 750.

### Iconography
- **F-006 · ⚡ emoji in streak pill · major** — BRAND §9 bans decorative emoji; replace with monoline currentColor flame.

### Motion
- **F-005 · Easing cubic-bezier(0.23,1,0.32,1) vs locked (0.16,1,0.3,1) · major** — both files.
- **F-009 · Entrance scales 0.7 / 0.92 below the 0.96–0.98 floor · minor** — seal stamp raised to 0.9 (keeps the stamp read via rotation+overshoot), demo-seal to 0.96.
- **F-011 · Landing hover missing pointer:fine gate · minor**

### Components
- **F-004 · dark --accent-deep lighter than --accent (role inversion) · minor** — remap to the accent-light value (0.86 0.135 64) in dark, true accent-deep (0.42 0.150 52) in light.

### Voice & tone
No violations. Copy is direct, names mechanisms ("The hinge: NOT"), no throat-clearing, no em dashes besides the approved "Go Pro — unlimited". (Voice passed the four formal audits last session; re-confirmed here.)

### Style coherence
| Dial | Brand intent | Mockups read as | Evidence |
|---|---:|---:|---|
| DESIGN_VARIANCE | mid (editorial, restrained) | mid | hairline cards, one accent, asymmetric ladder spine |
| MOTION_INTENSITY | low-mid (motion earns its place) | low-mid | rung fills + seal stamp carry data; nothing ambient |
| VISUAL_DENSITY | mid | mid | one concept per screen, no filler cards |

Reads as the brand's forged-bronze editorial world. No dial drift, no section-grammar repetition, no templated tells beyond the Tailwind palette colors (covered in F-003).

---

## What's not in your brand toolkit
- **Mobile/app-shell label scale** — BRAND.md's 10–11px eyebrow floor was written for desktop surfaces; the "cert-ios lift grammar" used across v7.36–7.39 runs smaller labels on 390px screens. Worth a one-paragraph addendum so future mockups don't have to guess.
- **Celebration motion** — the seal stamp is a new motion class (reward stamp); BRAND §6 has no entry for it. Suggest documenting an allowed overshoot range.
- **Button radius conflict** — toolkit says 7–11px; live `--radius` is 12px. One line in BRAND.md would settle it.

## Quick wins (all applied in this session)
- Brand OKLCH token blocks in both mockups — fixes F-001/002/003/004
- Easing swap — F-005 · Flame SVG — F-006 · color-mix shadows / drop CTA glow — F-007
- lining-nums on .miss-score — F-008 · entrance floors — F-009 · tracking/size/weight caps — F-010 · pointer:fine — F-011

## Systemic issue
Mockups keep being authored with freehand hex token blocks. Add a canonical "mockup token block" snippet (OKLCH, both themes) to BRAND.md or `design/brand/` so every future mockup starts from the real palette.

---

## Pre-flight checklist
| # | Question | Y/N/NA |
|--:|---|:--:|
| 1 | Hero a complete first scene? | Y |
| 2 | Headlines avoid weak line breaks? | Y |
| 3 | Navigation fits cleanly? | NA (screens, not site nav) |
| 4 | Cards earn their place? | Y |
| 5 | Loading/empty/error states designed? | Y (loading copy specified; near-miss = the "error" state) |
| 6 | Real media/diagram weight? | Y (ladder spine + looping demo) |
| 7 | Specific without the logo? | Y |
| 8 | Motion matches style? | Y after F-005/F-009 fixes |
| 9 | Code semantically clean/responsive? | Y |
| 10 | Feels expensive without trying? | Y |
| 11 | Materials doing real work? | Y |
| 12 | Restraint intentional? | Y |
| 13 | Premium without accent? | Y |

**Synthesis:** token-level cleanup, applied same-session. The design itself is on-brand.
