---
type: audit
status: active
cert: all
updated: 2026-06-29
tags: [audit, design]
---
# Motion & Animation Audit

Evaluated against Emil Kowalski's design engineering principles (`.agents/skills/emil-design-eng/SKILL.md`).
Three scopes: existing animation violations, missing motion in the cert app, missing motion on the landing site.

**Stats:** 67 total findings across 3 categories, 7 ship releases.

---

## Ship Order

| Release | Scope | Items | Effort |
|---------|-------|-------|--------|
| M-1 | `transition: all` sweep (styles.css) | ~42 declarations | 30 min bulk find/replace |
| M-2 | `@media (hover: hover)` gate (styles.css) | ~25 hover transforms | 20 min single wrapper block |
| M-3 | Landing must-haves (scroll reveals + hero + auth modal + CTA press) | 4 items | 1-2 hr |
| M-4 | Cert-app must-haves (`:active` press + modal entrances + sidebar slide) | 4 items | 1-2 hr |
| M-5 | Duration + easing corrections | ~14 over-duration + ~5 wrong easing | 30 min |
| M-6 | Landing should-haves (tab crossfade + FAQ accordion + pricing stagger) | 6 items | 1-2 hr |
| M-7 | Cert-app should-haves + nice-to-haves (stagger + morph + banner) | 10 items | 2 hr |

---

## Part A: Existing Animation Violations

### A.1 `transition: all` (Rule 1 - specify exact properties)

File: `styles.css`

| # | Line | Selector | Fix |
|---|------|----------|-----|
| - [x] 1 | 33 | `.btn-danger` | `transition: background .15s, color .15s` |
| - [x] 2 | 123 | `.btn` | `transition: background .15s, color .15s, box-shadow .15s, transform .15s` |
| - [x] 3 | 152 | `.chip` | `transition: border-color .15s, color .15s` |
| - [x] 4 | 169 | `.theme-toggle` | `transition: background .2s, border-color .2s, transform .2s` |
| - [x] 5 | 373 | `.back-btn` | `transition: background .15s, color .15s` |
| - [x] 6 | 380 | `.flag-btn` | `transition: border-color .15s, color .15s` |
| - [x] 7 | 406 | `.option` | `transition: border-color .15s, background .15s, transform .15s` |
| - [x] 8 | 444 | `.ms-checkbox` | `transition: border-color .15s, background .15s` |
| - [x] 9 | 451 | `.order-item` | `transition: border-color .15s, background .15s` |
| - [x] 10 | 479 | `.btn-next` | `transition: background .15s, transform .15s` |
| - [x] 11 | 695 | `.exam-flag-btn` | `transition: border-color .15s, color .15s` |
| - [x] 12 | 699 | `.end-exam-btn` | `transition: background .15s` |
| - [x] 13 | 703 | `.qnav-toggle` | `transition: background .15s, color .15s` |
| - [x] 14 | 707 | `.qnav-sq` | `transition: border-color .1s, background .1s, color .1s` |
| - [x] 15 | 1137 | (sidebar item) | Specify exact property (transform) |
| - [x] 16 | 1318 | `.cli-cmd-btn` | `transition: border-color .15s, background .15s` |
| - [x] 17 | 1328 | `.topo-device` | `transition: border-color .15s, background .15s` |
| - [x] 18 | 1333 | `.topo-zone` | `transition: border-color .2s, background .2s` |
| - [x] 19 | 1343 | `.report-btn` | `transition: border-color .15s, color .15s, background .15s` |
| - [x] 20 | 1349 | `.resource-link a` | `transition: background .15s, border-color .15s` |
| - [x] 21 | 1352 | `.resource-dive-btn` | `transition: background .2s, border-color .2s, transform .2s, box-shadow .2s` |
| - [x] 22 | 1357 | `.explain-btn` | `transition: background .15s, border-color .15s` |
| - [x] 23 | 1472 | `.port-mode-btn` | `transition: background .15s, color .15s` |
| - [x] 24 | 1496 | `.port-ref-card` | `transition: border-color .15s, transform .15s` |
| - [x] 25 | 1510 | `.port-opt` | `transition: border-color .12s, background .12s, transform .12s` |
| - [x] 26 | 1518 | `.port-submit-family` | `transition: filter .12s, transform .12s` |
| - [x] 27 | 1756 | `.setup-nav-btn` | `transition: background .15s, border-color .15s, color .15s, transform .15s` |
| - [x] 28 | 1771 | `.preset-tile` | `transition: border-color .15s, transform .15s, box-shadow .15s` |
| - [x] 29 | 1787 | `.drills-tile` | `transition: border-color .15s, transform .15s, box-shadow .15s` |
| - [x] 30 | 1848 | (sub-feature) | Specify exact props |
| - [x] 31 | 1909 | `.modes-domain-tile` | `transition: background .15s, border-color .15s, transform .15s` |
| - [x] 32 | 1931 | `.tdp-pill` | `transition: background .15s, border-color .15s, transform .15s` |
| - [x] 33 | 2035 | (important override) | Specify exact props, remove `!important` |
| - [x] 34 | 2090 | `.dg-edit-btn` | `transition: background .2s, border-color .2s, color .2s` |
| - [x] 35 | 2149 | (sub-feature) | Specify exact props |
| - [x] 36 | 2236 | (sub-feature) | Specify exact props |
| - [x] 37 | 2258 | (sub-feature) | Specify exact props |
| - [x] 38 | 2389 | (sub-feature) | Specify exact props |
| - [x] 39 | 2528 | `.ana-nav-pill` | `transition: background .15s, color .15s, border-color .15s` |
| - [x] 40 | 2559 | (sub-feature) | Specify exact props |

### A.2 Missing `@media (hover: hover)` gate (Rule 7)

File: `styles.css` - zero hover media queries exist. Every `:hover` transform fires on touch devices.

| # | Line | Selector | Transform |
|---|------|----------|-----------|
| - [x] 1 | 129 | `.btn-primary:hover` | `translateY(-1px)` |
| - [x] 2 | 170 | `.theme-toggle:hover` | `scale(1.1)` |
| - [x] 3 | 562 | `.review-filter-chip:hover` | `translateY(-1px)` |
| - [x] 4 | 1353 | `.resource-dive-btn:hover` | `translateY(-1px)` |
| - [x] 5 | 1497 | `.port-ref-card:hover` | `translateY(-1px)` |
| - [x] 6 | 1511 | `.port-opt:hover` | `translateY(-1px)` |
| - [x] 7 | 1543 | `.ana-bar:hover` | `scaleY(1) translateY(-4px)` |
| - [x] 8 | 1579 | `.ana-cal-day:hover` | `scale(1.15)` |
| - [x] 9 | 1651 | `.sd-btn:hover` | `translateY(-1px)` |
| - [x] 10 | 1683 | `.tplan-chip:hover` | `translateY(-1px)` |
| - [x] 11 | 1757 | `.setup-nav-btn:hover` | `translateY(-1px)` |
| - [x] 12 | 1772 | `.preset-tile:hover` | `translateY(-2px)` |
| - [x] 13 | 1788 | `.drills-tile:hover` | `translateY(-2px)` |
| - [x] 14 | 1910 | `.modes-domain-tile:hover` | `translateY(-1px)` |
| - [x] 15 | 1932 | `.tdp-pill:hover` | `translateY(-1px)` |

**Fix:** Add a single `@media (hover: hover) { ... }` block at end of file containing all `:hover` transform rules. Remaining ~10 hover rules (color/background only) can stay ungated.

### A.3 Duration > 300ms (Rule 6)

| # | Line | Selector | Current | Fix |
|---|------|----------|---------|-----|
| - [x] 1 | 111 | `.page.active` (pageFadeIn) | 350ms | 250ms |
| - [x] 2 | 414 | `.option.correct` (optGlowPulse) | 900ms | 500ms |
| - [x] 3 | 417 | `.option.wrong` (optShake) | 400ms | 300ms |
| - [x] 4 | 432 | `.option-stagger-in` | 340ms | 250ms |
| - [x] 5 | 463 | `.order-placed-item` (orderSlideIn) | 400ms | 250ms |
| - [x] 6 | 1525 | `.ana-card` (anaCardIn) | 500ms | 250ms |
| - [x] 7 | 1578 | `.ana-cal-day` (anaCalPop) | 400ms | 250ms |
| - [x] 8 | 5308 | `.streak-pulse` (streakPulse) | 900ms | 500ms |
| - [x] 9 | 6054 | stBlockMatchPop | 600ms | 350ms |
| - [x] 10 | 9432 | tbInspRowFlash | 1800ms | 600ms |
| - [x] 11 | 10287 | tbStpRethink | 800ms | 400ms |
| - [x] 12 | 19506 | `.playtest-welcome-toast` (pwtSlideIn) | 420ms | 250ms |

**Exempt (data-viz, deliberate pacing):** `.ana-bar` 800ms, `.ana-diff-fill` 900ms.

### A.4 Wrong easing (Rule 9)

| # | Line | Selector | Current | Fix |
|---|------|----------|---------|-----|
| - [x] 1 | 414 | optBounce | `ease` | `ease-in-out` (on-screen movement) |
| - [x] 2 | 417 | optShake | `ease` | `ease-in-out` (on-screen movement) |
| - [x] 3 | 463 | orderSlideIn | `ease` | `ease-out` (element entering) |
| - [x] 4 | 4197 | tbLabCelebrate | `ease` | `ease-out` (entry/celebration) |
| - [x] 5 | 4350 | tbAttackBlocked | `ease` | `ease-out` (entry) |

### A.5 `scale(0)` entry (Rule 2)

| # | Line | Selector | Current | Fix |
|---|------|----------|---------|-----|
| - [x] 1 | 1586 | `@keyframes anaCalPop` | `from { scale(0) }` | `from { scale(0.9) }` |
| - [x] 2 | 3661 | `@keyframes confettiBurstPop` (landing) | `scale(0) rotate(-10deg)` | `scale(0.85) rotate(-10deg)` (celebration exempt - keep dramatic) |

### A.6 Layout property animation (Rule 12)

| # | Line | Selector | Property | Fix |
|---|------|----------|----------|-----|
| - [x] 1 | 13 | `.skip-link` | `top` | Use `transform: translateY()` |
| - [x] 2 | 6920 | `body.has-sidebar` | `padding-left` | Use `transform: translateX(240px)` on content container |
| - [x] 3 | 13844 | (bottom position) | `bottom` | Use `transform: translateY()` |

**Exempt:** Progress bar `width` animations (standard pattern, acceptable).

### A.7 Default browser easing (Rule 13)

| # | Line | Selector | Current | Fix |
|---|------|----------|---------|-----|
| - [x] 1 | 1290 | readiness bar | `ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| - [x] 2 | 6638 | aclModalFadeIn | `ease` | `ease-out` |

---

## Part B: Missing Motion - Cert App

### B.1 Must-Have

| # | Element | Current State | Recommended | Duration/Easing |
|---|---------|---------------|-------------|-----------------|
| - [x] 1 | `.btn` / `.chip` `:active` press feedback | No `:active` state anywhere | `transform: scale(0.97)` on `:active` | 100ms, ease |
| - [x] 2 | Modal/overlay entrance | Overlays appear via `display:block` with no entrance | `opacity: 0; transform: scale(0.95) translateY(8px)` -> visible state | 200ms, `cubic-bezier(0.23, 1, 0.32, 1)` |
| - [x] 3 | Explanation box reveal | `.explain-box` toggles `hidden` with no transition | Fade + slideY from 0,8px to 1,0 | 200ms, ease-out |
| - [x] 4 | Sidebar mobile drawer | No slide-in on mobile (binary show/hide) | `transform: translateX(-100%)` -> `translateX(0)` | 250ms, `cubic-bezier(0.23, 1, 0.32, 1)` |

### B.2 Should-Have

| # | Element | Current State | Recommended | Duration/Easing |
|---|---------|---------------|-------------|-----------------|
| - [x] 5 | Question navigator grid | `.qnav-sq` items appear with no stagger | Add stagger 40ms per item, fade+scale(0.95)->1 | 150ms per item, ease-out |
| - [x] 6 | `.btn-next` appearance | Button shown/hidden with no transition | Fade in opacity 0->1 | 150ms, ease-out |
| - [x] 7 | Chip selection feedback | Selected chip gets border color, no morph | Add brief scale pulse (1 -> 1.03 -> 1) on select | 150ms, ease-out |
| - [x] 8 | Deep explain panel | Panel appears via DOM toggle | Slide down + fade in | 250ms, ease-out |
| - [x] 9 | Review items stagger | All review items appear at once | Stagger 30ms between items on page load | 200ms per item, ease-out |
| - [x] 10 | Connectivity/offline banner | Banner appears with no motion | SlideY from -100% to 0 | 200ms, ease-out |

### B.3 Nice-to-Have

| # | Element | Current State | Recommended | Duration/Easing |
|---|---------|---------------|-------------|-----------------|
| - [x] 11 | Theme toggle icon | Sun/moon swaps with no morph | Rotate + crossfade between icons | 250ms, ease-in-out |
| - [x] 12 | Exam timer danger state | Timer turns red with no motion | Pulse scale(1.02) once on danger threshold | 200ms, ease-out |
| - [x] 13 | Readiness bar initial fill | Bar width set on render with no animation | Animate width from 0 on first paint | 600ms, `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| - [x] 14 | Port drill flash-wrong exit | Wrong answer flash has no exit transition | Fade out the red state over 200ms | 200ms, ease-in |

---

## Part C: Missing Motion - Landing Site

### C.1 Must-Have

| # | Element | Current State | Recommended | Effort |
|---|---------|---------------|-------------|--------|
| - [x] 1 | Scroll-triggered section reveals | No IntersectionObserver. Sections appear static. | `.reveal { opacity:0; transform:translateY(24px); transition: opacity 500ms, transform 500ms cubic-bezier(0.23,1,0.32,1); } .reveal.is-visible { opacity:1; transform:translateY(0); }` + single IO in JS | ~20 lines JS + ~8 lines CSS |
| - [x] 2 | Hero staggered entrance | Content loads instantly, no motion | Stagger 80-100ms: eyebrow -> h1 -> subtitle -> pass-pill -> CTAs. Each `opacity:0; translateY(20px)` -> visible | ~15 lines CSS |
| - [x] 3 | Auth modal card entrance | Overlay fades but card appears instantly | `scale(0.95) translateY(8px)` -> `scale(1) translateY(0)` on `.auth-modal-card` | ~8 lines CSS |
| - [x] 4 | CTA button `:active` press state | Has hover lift but no press feedback | `:active { transform: translateY(0) scale(0.98); transition-duration: 100ms; }` | ~5 lines CSS |

### C.2 Should-Have

| # | Element | Current State | Recommended | Effort |
|---|---------|---------------|-------------|--------|
| - [x] 5 | Proof-of-product tab crossfade | `display:none/block` swap, instant | Crossfade: outgoing opacity->0 (200ms), incoming opacity 0->1 (300ms) | ~15 lines CSS + minor JS |
| - [x] 6 | FAQ accordion height | Chevron rotates but content snaps open | `grid-template-rows: 0fr -> 1fr` with 300ms transition (or max-height fallback) | ~12 lines CSS |
| - [x] 7 | Auth state form->inbox crossfade | `hidden` attribute toggle, instant | Form fades out (150ms), success fades in + translateY(250ms) | ~10 lines CSS + minor JS |
| - [x] 8 | Proof-of-product tile hover | No hover feedback on `.pp-tile` | `border-color + translateY(-2px)` on hover, 200ms ease | ~4 lines CSS |
| - [x] 9 | Pricing tier card stagger | Static render, no scroll animation | Reuse `.reveal` from C.1, stagger 100ms between 3 cards | Reuses #1 system |
| - [x] 10 | Sample question feedback glow | Correct/wrong reveal may lack transition | 300ms `box-shadow` glow on `.sq-option.is-correct` | ~6 lines CSS |

### C.3 Nice-to-Have

| # | Element | Current State | Recommended | Effort |
|---|---------|---------------|-------------|--------|
| - [x] 11 | Notify modal card entrance | Overlay fades, card instant | Same pattern as C.3 auth modal | ~4 lines CSS |

---

## Already Working Well (No Changes Needed)

- **Cert tiles hover** (landing) - good 200ms `cubic-bezier(0.16, 1, 0.3, 1)` timing
- **Theme toggle rotation** (landing) - satisfying cross-rotate between sun/moon
- **Nav link hover** - appropriate 150ms
- **Status dot pulse** (`livePulse`) - communicates "live" status
- **Page transitions** (pageFadeIn/Out) - correct enter/exit speed ratio
- **Playtest toast** (enter/exit) - exit faster than enter (correct)
- **`dg-system.css` animation kills** - correctly suppresses gratuitous keyframes
- **`prefers-reduced-motion` gate** (landing line 2228) - all animations already respect this
- **"Coming soon" tile suppression** - correctly disables interaction affordance
- **Account dropdown** (`dg-system.css` line 94) - correct `transform-origin: top right`

---

## Global Standards (apply to all new animations)

```css
/* Shared easing tokens */
--ease-out-smooth: cubic-bezier(0.23, 1, 0.32, 1);
--ease-out-bounce: cubic-bezier(0.2, 0.8, 0.2, 1);

/* Duration tokens */
--dur-press: 100ms;
--dur-tooltip: 150ms;
--dur-dropdown: 200ms;
--dur-modal: 250ms;
--dur-scroll-reveal: 500ms;

/* All new hover transforms must be inside: */
@media (hover: hover) { }

/* All new animations must respect: */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
