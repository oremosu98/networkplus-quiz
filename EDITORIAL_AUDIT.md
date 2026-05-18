# Editorial Audit — Full E2E Taste-Skill Report

> Generated 2026-05-18 after the v4.99.64–v4.99.93 editorial rebrand sprint.
> Use this as a punch list for next week. Tick items off as they ship.

---

## Priority 1 — Global Primitives (affects every page)

These are structural patterns in `styles.css` that bleed through on ALL pages because they use hardcoded hex/rgba instead of `var()` tokens, and the dg-system.css overrides are page-scoped.

| # | Issue | File:Line | Fix |
|---|---|---|---|
| 1.1 | Focus-visible ring is purple `rgba(124,111,247,.2)` | `styles.css:18,21` | Add global `html[data-theme] body *:focus-visible{box-shadow:0 0 0 4px color-mix(in oklab,var(--accent) 20%,transparent)!important}` to dg-system.css |
| 1.2 | `.chip.on` background purple `rgba(124,111,247,.18)` | `styles.css:155` | Add global `html[data-theme] body .chip.on{background:color-mix(in oklab,var(--accent) 18%,transparent)}` |
| 1.3 | `@keyframes chipFlash` purple glow `rgba(124,111,247,.35)` | `styles.css:157` | Override with `@keyframes chipFlash{0%{box-shadow:0 0 0 6px color-mix(in oklab,var(--accent) 35%,transparent)}...}` in dg-system.css |
| 1.4 | `.chip-smart.on` purple `rgba(124,111,247,.25)` | `styles.css:758` | Same as 1.2 pattern — global `.chip-smart.on` override |

- [x] Ship: **v4.99.94** — Global primitives de-purple

---

## Priority 2 — Uncovered Cert-App Pages (5 pages with no dg-system.css scoped rules)

| # | Page | Visible emoji | Other issues | Fix scope |
|---|---|---|---|---|
| 2.1 | `#page-session-transition` | `&#9989;` (checkmark) in `.session-emoji` | Soft-card? | Scoped CSS hide + de-card |
| 2.2 | `#page-session-complete` | `&#127881;` (party), `&#9889;` (lightning) in button | Soft-card? | Scoped CSS hide + de-card |
| 2.3 | `#page-diagnostic-quiz` | `✅` `🤔` `🎲` confidence tier icons | Purple from styles.css diagnostic section (~40 lines) | Scoped CSS override |
| 2.4 | `#page-diagnostic-result` | `🎯` `📭` `📅` `🧪` `🔧` Pass Plan icons | Purple gradients + soft cards | Scoped CSS override |
| 2.5 | `#page-monitor` | `&#128737;` `&#128203;` `&#128229;` `&#128465;` | Admin-only production monitor | Scoped CSS hide + de-card |

- [x] Ship: **v4.99.95** — Session transition + complete editorial
- [x] Ship: **v4.99.96** — Diagnostic quiz + result editorial (cert-app side)
- [x] Ship: **v4.99.97** — Production Monitor editorial

---

## Priority 3 — Cert-App Visible Emoji (in JS render paths, not CSS-hideable)

| # | Issue | File:Line | Context | Fix |
|---|---|---|---|---|
| 3.1 | 47 milestone `.ana-milestone-icon` emoji | `app.js:15730` | Analytics milestones grid | CSS `display:none` on `.ana-milestone-icon` + optional SVG replacement |
| 3.2 | Milestone celebration toast emoji | `app.js:8344` | `def.icon + ' ' + def.label` → `.celebration-toast-title` | Strip `def.icon +` from the concat |
| 3.3 | Desktop-only nudge `🖥️` + buttons `📨`/`📋` | `app.js:1025-1031` | `.donudge-icon` + button innerHTML | CSS hide `.donudge-icon` + strip emoji from button text |
| 3.4 | ACL Coach modal robot `&#129302;` | `index.html:2741` | Text-baked in `<h3>` | Strip from HTML |
| 3.5 | Topic Deep Dive error `⚠️` | `app.js:13601,13642` | Error state innerHTML | Strip emoji prefix |
| 3.6 | GitHub status `🟢`/`⚪` | `app.js:1229` | Settings/Monitor admin UI | Strip to bare text |
| 3.7 | SW banner `📦` / A2HS banner `📲` | `app.js:1606,1787` | Banner icon spans | CSS hide (check if already `aria-hidden`) |

- [x] Ship: **v4.99.98** — Milestone + toast + nudge + misc emoji strips

---

## Priority 4 — Landing Site Emoji (visible, not CSS-hidden)

| # | Issue | File:Line | Context | Fix |
|---|---|---|---|---|
| 4.1 | Proof of Product section ~12 emoji | `landing/index.html:485-591` | `📚` `🔥` `🟢` `⚔️` `⏳`×2 `🔨`×2 `🛡` `💪` `📜` `🎁` in Security+ tiles + pass guarantee | Strip or CSS-hide |
| 4.2 | FAQ eyebrow `💬` | `landing/index.html:639` | `.faq-eyebrow` heading text | Strip |
| 4.3 | Auth modal emoji `⚡`×2 `📦` `📬` | `landing/index.html:823,841,867,895` | Playtest pill, migration banner, CTA icon, sent icon | Strip or CSS-hide |
| 4.4 | Builder pill `🔒` | `landing/index.html:108`, `pricing.html:66` | Admin-visible builder mode | Strip |
| 4.5 | Dropdown icons (⚙️ 🎓 📊) still in HTML | Multiple files | `.dropdown-link-icon` spans | Already CSS-hidden via `display:none` — **NO ACTION** (confirmed handled) |

- [x] Ship: **v4.99.99** — Landing homepage emoji sweep

---

## Priority 5 — Landing Site Purple (inline SVG + legal pages)

| # | Issue | File:Lines | Fix |
|---|---|---|---|
| 5.1 | Proof of Product SVG illustrations use `#7c6ff7`/`#3d3870`/`#a99df9` | `landing/index.html:367-446` (~14 sites) | Replace hex in SVG attributes with bronze equivalents (`#b8860b`/`#8b6914`/`#d4a574`) |
| 5.2 | Privacy page inline `<style>` has ~10 hardcoded `#7c6ff7` | `landing/privacy.html:39-194` | Replace all `#7c6ff7` → `var(--dg-accent, #b8860b)` or add dg-system.css overrides for `.legal-*` classes |
| 5.3 | Terms page inline `<style>` has ~10 hardcoded `#7c6ff7` | `landing/terms.html:34-208` | Same as 5.2 |
| 5.4 | Legal pages `.legal-tldr` purple gradient bg | `privacy.html:137`, `terms.html:132` | Replace `rgba(124,111,247,.06)` → `color-mix(in oklab,var(--dg-accent) 6%,transparent)` |

- [x] Ship: **v5.0.0** — Landing illustration + legal page de-purple

---

## Priority 6 — Em-dashes (3 instances)

| # | File:Line | Text | Fix |
|---|---|---|---|
| 6.1 | `landing/index.html:838` | `Same form &mdash; your account...` | → `Same form · your account...` |
| 6.2 | `landing/pricing.html:259` | Same text duplicated | → middot |
| 6.3 | `landing/script.js:171` | `'✓ Got it — confirmation sent...'` | → `'✓ Got it · confirmation sent...'` |

- [x] Ship: already fixed in WRITING_AUDIT pass (P9.7 + P9.8)

---

## Priority 7 — Cert-App Purple in JS Inline Styles

| # | Issue | File:Line | Fix |
|---|---|---|---|
| 7.1 | `DOMAIN_COLOURS.concepts = '#7c6ff7'` → visible purple dot | `app.js:2286` | Change to `'var(--accent)'` or the bronze hex `#b8860b` |
| 7.2 | PHT sender avatar fallback `#7c6ff7` | `features/phishing-triage.js:248` | Change to `'#b8860b'` |
| 7.3 | Quiz `.deep-explain` border-left `#7c6ff7` | `styles.css:1362` | Add `html[data-theme] body .deep-explain{border-left-color:var(--accent)}` to dg-system.css |
| 7.4 | `.qnav-sq.current/.answered` purple bg | `styles.css:709-710` | Add `html[data-theme] body .qnav-sq.current{background:color-mix(...)}` |

- [x] Ship: **v5.0.1** — Inline purple cleanup

---

## Priority 8 — Topology Builder (DEFERRED)

The TB has ~80+ lines of hardcoded purple in `styles.css` (device borders, scenario cards, inspector panels, config overlays) + ~28 inline `rgba(124,111,247,*)` in `features/topology-builder.js` + ~15 emoji in JS render paths.

**Status:** Founder explicitly deferred this to a dedicated TB revision pass once the whole-site rebrand is complete. The v4.99.74 ship note reads: "explicitly not fully satisfied with TB — directed to ship now and queue a dedicated TB revision pass."

Items for the TB revision pass:
- [ ] De-purple all `rgba(124,111,247,*)` inline borders in device config panels (~28 sites)
- [ ] De-purple canvas node colours (`router.color: '#7c6ff7'` etc.)
- [ ] Strip remaining TB emoji (~15 in features/topology-builder.js)
- [ ] De-purple styles.css TB section (~80 lines, lines 2846-5900)
- [ ] Address TB 3D View internal chrome
- [ ] Address the deprecated full-toolbar `<select>` ~30 native-`<option>` emoji
- [ ] Cable token tuning
- [ ] Canvas representative-state improvements

---

## Priority 9 — Styles.css Structural Purple (low urgency, high volume)

These are ~200-250 lines of hardcoded purple in `styles.css` that are NOT beaten by page-scoped dg-system.css rules. Most are in the TB section (covered by P8) but some are in:

- Diagnostic/Pass-Plan sections (lines 14350-16100) — ~40 lines
- Light-mode TB selectors `[data-theme="light"] .tb-*` — ~70 lines  
- Quiz navigator elements — ~5 lines
- Session-related elements — ~10 lines

**Strategy:** These get fixed incrementally as each page/feature gets its scoped dg-system.css treatment (P2 covers diagnostic, P8 covers TB, etc.). No separate ship needed.

---

## Already Handled (confirmed clean)

These areas have been verified as fully editorial:

- [x] Sidebar + TopBar (v4.99.86)
- [x] Home page Net+ & Sec+ (v4.99.65, v4.99.80)
- [x] Progress (v4.99.66)
- [x] Analytics (v4.99.67)
- [x] Quiz + Loading + Results (v4.99.68-70)
- [x] ACL Builder + Scenario Picker (v4.99.71, v4.99.73)
- [x] Paywall/Pro-gate modal (v4.99.72)
- [x] Network Builder structure (v4.99.74)
- [x] Concept/Topology Labs picker (v4.99.75)
- [x] Settings (v4.99.76)
- [x] Control Type Sorter (v4.99.77, v4.99.79)
- [x] IR War Room (v4.99.78)
- [x] Phishing Triage (v4.99.81)
- [x] Sec+ Quiz cert-aware pass-mark (v4.99.82)
- [x] Net+ Quiz E2E (v4.99.83)
- [x] Attack-to-Mitigation (v4.99.84)
- [x] Acronym Blitz (v4.99.85)
- [x] Subnet Trainer + Port Drill (v4.99.87)
- [x] OSI Sorter + Cable ID (v4.99.88)
- [x] Network Analysis + Packet Trace (v4.99.89)
- [x] Exam Mode + Exam Results + Review + Drills Launcher (v4.99.90)
- [x] Account Dropdown + Web Vitals (v4.99.91)
- [x] Landing Account + Admin + My-Certs (v4.99.92)
- [x] Landing Cross-cert Analytics (v4.99.93)

---

## Suggested Ship Order (next week)

| Day | Ship | Scope | Est. time |
|---|---|---|---|
| Mon | v4.99.94 | P1 global primitives (focus ring + chip.on + chipFlash) | 30 min |
| Mon | v4.99.95 | P2.1+2.2 session-transition + session-complete | 45 min |
| Tue | v4.99.96 | P2.3+2.4 diagnostic quiz + result (cert-app) | 1 hr |
| Tue | v4.99.97 | P2.5 production monitor | 30 min |
| Wed | v4.99.98 | P3 milestone + toast + nudge + misc emoji | 1 hr |
| Wed | v4.99.99 | P4 landing homepage emoji sweep | 45 min |
| Thu | v5.0.0 | P5 landing SVG + legal de-purple + P6 em-dashes | 1 hr |
| Fri | v5.0.1 | P7 cert-app inline purple cleanup | 45 min |
| Weekend | — | P8 TB revision pass (founder-directed, larger scope) | 3-4 hrs |

---

## Metrics

| Category | Count |
|---|---|
| Total remaining visible emoji (cert app) | ~65 |
| Total remaining visible emoji (landing) | ~20 |
| Total hardcoded purple lines in styles.css | ~737 |
| Purple lines already beaten by dg-system.css | ~500 |
| Purple lines still visible (needs fix) | ~200-250 |
| Pages with full editorial coverage | 24/29 |
| Pages missing coverage | 5 |
| Em-dashes remaining | 3 |
