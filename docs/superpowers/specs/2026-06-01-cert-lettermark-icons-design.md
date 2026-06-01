# Cert lettermark icon system (Phase 1: landing) · design

**Date:** 2026-06-01
**Scope:** Landing site only (`landing/`). Cert-app rollout is **Phase 2** (separate effort, UAT-gated). Brand: forged-bronze editorial (locked).
**Status:** Visual approved via mockup (`mockups/cert-icons-concept.html`). Next: implementation plan.

---

## 1 · What we're building

A typographic **cert lettermark** badge system, replacing the current raster PNG cert glyphs (which only exist for 2 of 8 certs; the rest render blank). Each cert is shown as its abbreviation in **Fraunces**, on the existing fixed-cream tile (`#FFFBF3`, both themes), with a **two-tone treatment**: prefix in ink, the last glyph in brand bronze.

**Approved look** (from the mockup): N**+**, S**+**, A**Z**, A**I**, S**C**, AW**S**, and A**+** with a small bronze superscript ¹/² to split A+ Core 1 / Core 2. Roster certs: C**C** (CCNA), A**W** (AWS SAA), A**Z** (AZ-104).

**Why typographic, not image:** the glyph divs already contain the text; styling it needs **zero asset files**, is crisp at any size, theme-independent (cream tile), and removes the 5 stale PNGs. There is no longer anything to keep in sync.

---

## 2 · The lettermark grammar (locked)

- **Font:** Fraunces, weight 600, `letter-spacing: -0.02em`.
- **Color:** prefix `oklch(0.24 0.018 280)` (ink); accent (last glyph) `oklch(0.50 0.155 55)` (brand bronze). On the cream tile both read in light + dark.
- **Two-tone rule (generic):** render the abbreviation with its **final character wrapped** in `<span class="cg-ac">` (bronze). Works for every cert: N`+`, S`+`, A`Z`, A`I`, S`C`, AW`S`, A`+`.
- **A+ Core 1/2 differentiator:** after the `A+`, append `<span class="cg-sup">1</span>` or `2` (bronze, small, raised) — chosen from `glyphClass` (`aplus-core1` → 1, `aplus-core2` → 2). This is the only per-cert special case.
- **Sizes:** ~34px on the 84px live tile; ~19px on the 46px roster tile; scale to each surface's existing glyph box. Three-letter marks (AWS) drop ~20% to fit.
- **Container unchanged:** the cream rounded-square tile + hairline + soft shadow stays exactly as-is per surface; only the glyph *content* changes from PNG/blank to the styled lettermark.

### Shared helper (single source for data-driven surfaces)
Introduce one helper, `certGlyphHTML(glyph, glyphClass)`, returning the two-tone markup (last-char accent span + A+ superscript). Define it once and reuse across the JS render sites so the rule lives in one place. (The hardcoded cert-library tiles get the equivalent markup inline.)

---

## 3 · Surfaces in scope (4 real cert-icon badges, all landing)

1. **Cert-library tiles** — `landing/index.html` `#certs` (8 live + 3 roster, hardcoded markup ~1172-1333; CSS ~1097-1122).
   - Edit each `.cert-glyph` div's inner text to the two-tone markup (wrap last char; add superscript for the two A+ tiles).
   - Replace the glyph CSS: remove `font-size:0` + all `background-image:url(...png)` rules; add the `.cg`/`.cg-ac`/`.cg-sup` Fraunces treatment scoped under `#certs`.
   - **Delete** the 5 PNGs (`landing/assets/certs/cert-{netplus,secplus,az,ccna,aws}.png`) and their CSS mappings.
2. **My Certs modal** — `#my-certs-modal` in `landing/index.html`; rows injected by JS (in `landing/lib/account.js`, which holds the cert array with `glyph`/`glyphClass`). Render the glyph via `certGlyphHTML(...)`; add the `.cg*` treatment to the `#my-certs-modal` scope.
3. **Exam-result modal** — `landing/lib/account.js` (`.er-glyph` / `.confetti-cert-glyph`, uses `cert.glyph`/`cert.glyphClass`). Same helper; add the `.cg*` treatment to that modal's scope.
4. **Cross-cert analytics** — `landing/lib/cross-cert-analytics.js` (own cert array with `glyph`/`glyphClass`). Same helper; add the `.cg*` treatment to that surface's scope.

> The metadata is duplicated (account.js + cross-cert-analytics.js). This spec does NOT consolidate it (out of scope); each render site uses the shared `certGlyphHTML` helper so the *rendering* rule is single-sourced even though the *data* arrays remain separate.

### Explicitly OUT of scope
- **Diagnostic intake "pills"** (`.dx-cert-pill`) — these are uppercase text eyebrows, not icon badges. Nothing to convert; excluded.
- **Cert app** (root `index.html`/`app.js`/`auth-state.js`, `CERT_PACK`) — **Phase 2**. Needs `CERT_PACK` metadata extension + its own discovery + the UAT/Playwright ship-checklist. Not touched here.
- No metadata de-duplication; no `styles.css` edits.

---

## 4 · Constraints
- Never edit `styles.css`. Landing glyph CSS lives in index.html scoped `<style>` blocks (cert library + modals) and the cross-cert-analytics surface's styles. Prefer keeping the `.cg*` rules in those existing scoped blocks to avoid a `landing/dg-system.css` change (which would force a `?v=` cache-bump). If a shared location is cleaner, `landing/dg-system.css` is allowed **with** the documented `?v=` bump on every referencing page.
- OKLCH tokens, both themes verified. Fraunces. No em-dashes. No emoji. The cream tile is the container (not a bronze fill); the bronze is only the accent glyph.
- A11y: the glyph is decorative-adjacent but readable; the cert name/code sits beside it, so no extra aria needed. Ensure the lettermark text is real text (selectable, not an image) — it already is.

## 5 · Verification
- Grep: no remaining `background-image:url('assets/certs/...png')`; the 5 PNGs deleted; no `cert-glyph-*` PNG mappings remain.
- Both-theme Playwright on: the cert library (all 8 live tiles show a lettermark, none blank; 3 roster tiles; A+ Core 1 vs Core 2 show ¹/²), the My Certs modal, an exam-result modal state, and cross-cert analytics. 0 console errors.
- Confirm the lettermark renders identically (cream tile) in light + dark, and at both 84px and 46px sizes.

## 6 · Phase 2 (noted, not now)
Cert-app rollout: extend `CERT_PACK.meta` (or `certs/*.js`) with `glyph` data, add a shared lettermark render in the cert switcher / sidebar / account pill / app My Certs, style via `dg-system.css` (cache-bump), and run the full UAT + Playwright + ship checklist. Requires a dedicated discovery pass (the switcher/sidebar render code wasn't fully mapped).
