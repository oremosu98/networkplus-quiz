# Rebrand Ship Plan — dg-system → production

> Status doc for porting the locked dg-system concept mockups into prod.
> Drafted at founder's request to batch the rollout. Mirrors the
> risk-tiered model in `ENVIRONMENT_STRATEGY.md` and the 6-phase
> `SHIP_CHECKLIST.md`. This file is docs-only (fast-lane, no UAT gate).

## 0. The core reframe (read first)

The mockups de-risked the **design**. They did NOT do the port. Each
mockup is a self-contained HTML file with its own inline dg-system; the
real surfaces are a 485 KB `styles.css`, a ~115 KB `index.html`, a ~2 MB
`app.js`, and a separate `landing/` project with its own ~120 KB
`styles.css`. **Porting = careful re-implementation behind the existing
class/JS contract, not copy-paste.** The proven recipe already exists:
the v4.99.60–63 diagnostic reskin (shared `*-system.css` with NAMESPACED
`--dg-*` tokens beating the old token layer via `html:root` specificity,
de-card rules layered over the existing class contract → **zero render-JS
change**, inline `<style>` → one cache-busted `<link>`, flash-free theme
bootstrap, verified on a Vercel **preview** not just localhost). We
repeat that recipe; we do not invent a new one.

## 1. Lock checkpoint (GATE — founder confirm before any prod file is touched)

Concept-mockup-first rule: nothing ports until the founder says the word.
"I think we're ready" + "start tonight" = strong intent; this plan still
treats an explicit **"locked, start Batch N"** as the trigger per surface
batch. Locked set (~30 surfaces):

- Landing: homepage · pricing · privacy · terms · logo
- App-chrome: account-menu · account-page · admin-dashboard · my-certs · cross-cert-analytics
- Cert-app twins (Net+ & Sec+): home · progress · analytics · quiz-loading · quiz · quiz-results
- Net+: network-builder · 3d-view · concept-labs · toolbar+how-to · ACL picker · ACL builder
- Sec+: ir-war-room · phishing-triage · attack-mitigation · control-type-sorter · acronym-blitz · account+cert-switcher

## 2. Lane split (apply the ENVIRONMENT_STRATEGY decision rule per surface)

Decision rule: *touches DB schema, money, auth, or service worker → gated.*

| Lane | Surfaces | Files touched | Flow |
|---|---|---|---|
| **A · Landing fast-lane** | homepage, pricing, privacy, terms, logo | `landing/*.html`, new shared `landing/dg-system.css`, `landing/favicon.svg` + OG/icons | commit → push → certanvil.com Vercel project → **preview-verify** → prod. Separate Vercel project, isolated blast radius. **Startable tonight.** |
| **B · Cert-app visual reskin** | home, progress, analytics, quiz×3, builders, drills, my-certs, cross-cert, admin, account-page | `index.html` (structure), `styles.css` (dg-system cascade) — NOT auth/DB/SW | fast-lane per strict rule, BUT large UAT-lockstep + structural risk → SHIP_CHECKLIST every push; `/review-feature` before starting |
| **C · Gated** | account-menu / cert-switcher dropdown | `auth-state.js` (on the gated list) | feature branch → PR → Vercel preview ⇄ Supabase branch DB → smoke → squash-merge |

## 3. Prerequisites (clear before the lane that needs them)

- **Vercel committer-email gotcha** — CLI deploys fail *silently* unless git committer email is `simi_oremosu@hotmail.com`. Verify once, globally, before any deploy. (`reference_vercel_deploy_gotchas.md`.)
- **cleanUrls blind spot (v4.99.62)** — localhost verification cannot see Vercel URL-rewrite behaviour. Every landing page MUST be verified on a real Vercel **preview** deploy, not just `python3 -m http.server`. Non-negotiable for Lane A.
- **Supabase branching + Vercel preview infra** — required ONLY for Lane C (auth-state). Lane A + B do not need it. If not set up, Lane A + B proceed; Lane C waits for the founder-weekend infra.
- **Data-safety** — never write `nplus_*` localStorage on a prod URL from Chrome MCP. Verify reskins on local server / preview / incognito only.
- **UAT structural lockstep** — `tests/uat.js` (5,100 assertions) has moved-rule guards + tombstones. A reskin that renames classes / restructures markup WILL trip them. Each Lane B surface = reskin + UAT-guard migration in the SAME commit (the v4.99.60/61 pattern), or the pre-commit hook + CI block the push.
- **Version + cache** — `node scripts/bump-version.js <v> "<desc>"` every deploy (bumps APP_VERSION + CACHE_NAME + index badge + package.json + prepends CLAUDE.md stub). Never hand-edit partial. Re-read CLAUDE.md AFTER the bump before expanding the row (the script mutates it).

## 4. Batch order (by blast radius + dependency)

**Batch 1 — Landing legal pair (lowest risk, tonight).** pricing +
privacy + terms. New shared `landing/dg-system.css`; swap each page's
inline/old styling for the cascade; flash-free theme bootstrap; legal
text already verbatim in the mockups. Preview-verify (cleanUrls). One
commit per page or one combined — these are static, no JS contract.

**Batch 2 — Landing homepage + logo.** Bigger (hero, sample-question
widget, FAQ, pass-guarantee, cert grid). Reuse Batch-1 CSS. Logo:
favicon.svg ×2 + OG + PWA/app-store icons + email header (REBRAND EXEC 2).
Preview-verify. Landing fast-lane complete after this.

**Batch 3 — Cert-app dg-system foundation.** Extract the 4-block OKLCH
cascade + reconciled accent into `styles.css` as the canonical token
layer, de-card rules over the EXISTING class contract (diagnostic
precedent). No per-page markup change yet. This is the dependency root
for every Lane B surface. Heaviest UAT-guard migration. `/review-feature`
first (3+ files, big surface).

**Batches 4…N — per-surface Lane B reskins.** One coherent surface per
commit (home, then progress, then analytics, then quiz flow, then
builders, then drills, then app-chrome). Each: reskin → UAT guards
migrated same commit → Chrome-verify happy path → bump → CLAUDE.md row →
push → CI green. Net+/Sec+ twins ship together (shared markup).

**Batch G — Gated account chrome.** account-menu + cert-switcher into
`auth-state.js`. Feature branch → PR → preview → squash-merge. Only when
Lane C infra is confirmed.

## 5. Parked bugs — DO NOT bundle into the reskin

Found while mocking; they are *data/logic* bugs, not visual. Bundling
them into reskin commits muddies the diff + rollback story. Recommend a
separate bug pass (Tuesday cadence) in `app.js`/cert-packs:

a. Sec+ Analytics "Domain Mastery" shows Net+ domain names (cert-pack-aware catalog)
b. Acronym Blitz Net+/Sec+ copy mismatch (fold into a)
c. CLAUDE.md `TB_LAB_CATEGORIES` doc-drift: docs 29+35 vs live 30+37
d. ACL picker "Free Build" copy has an em-dash
e. Suggested-scenario billboard double-escapes `&amp;`
f. Progress "1 of 50 studied" off-by-one vs 4%/2-touched
g. Sec+ home nudge cross-cert contamination ("Network Models & OSI")
h. Sec+ pass mark shown as 720 (Net+ value); SY0-701 = 750. Affects real app + the secplus-home/analytics mockups

## 6. Open decisions for founder (answer to start)

1. **Lock confirmed?** Whole set, or surfaces still to review?
2. **Lane C infra** — is Supabase-branching + Vercel-preview set up? (If no: Lane A + B proceed tonight; Lane C waits.)
3. **Bugs** — separate pass (recommended) or bundle into the port?
4. **Start Batch 1 tonight** (landing pricing/privacy/terms)? That's the safe first move and needs only the committer-email check + a reachable certanvil.com Vercel project for preview-verify.
