# Section-by-Section Design Playbook

Lock the system once. Ship sections small, scoped, and verified. Let the
shared system carry coherence, not heroic page-wide rewrites.

Built from taste-skill, emil-design-eng, stop-slop, and three real
mistakes (listed at the bottom).

---

## Phase 0 · Lock the system (once, before any section)

- Route the visual direction with taste-skill. Pick one style. Commit. Do not blend.
- Define tokens from the brand source of truth: `bg`, `surface`, `ink`, `muted`, `border`, one `accent`, `on-accent`. Include light and dark.
- Set the type pairing and motion curves: `ease-out: cubic-bezier(0.23,1,0.32,1)`, UI duration ceiling 300ms.
- Gate: no section starts until this exists.

## Phase 1 · Frame the section

- Name the user question this section answers. No answer means no section.
- Place it in the page arc. Its density and calm are relative to the sections above and below it.
- Surface shape-of-solution choices now: static vs generated, destructive vs not, where it lives. Not after the build.

## Phase 2 · Mockup first

- Build a standalone HTML mockup using the Phase 0 tokens and real content.
- Get the mockup approved before any production code. Mockup edits are cheap; production edits are not.

## Phase 3 · Build it scoped

- Namespace everything: a `#section-id` root plus `.prefix-*` classes.
- Section tokens live on the section, never on `:root`.
- Replace only the section block. Never touch nav, auth, scripts, or DOM contracts.
- If a JS contract forces you to reuse production class names (`.cert-tile`, etc.), a scoped override is not enough. The ID wins per-property, but every property you do not set still bleeds from `styles.css`. Add a complete scoped reset (`margin/padding/min-height` zeroed, explicit `flex-direction`) and kill production pseudo-accents (`#id .shared::before,::after{content:none!important}`), then re-apply your spacing. The mockup looked right only because it had no production sheet to fight.

## Phase 4 · Motion (emil)

- Ask first: how often will users see this? Frequent means less, or none.
- Custom easing only. Never `ease-in`. Never `scale(0)` (start at 0.96 with opacity).
- Animate transform and opacity only. Scoped trigger, not `body`/global. Always ship a `prefers-reduced-motion` path.

## Phase 5 · Copy (stop-slop)

- Cut filler openers, adverbs, em-dashes, and three-item lists.
- Put the reader in the sentence. Be specific. The CTA states what happens next.

## Phase 6 · Verify before ship

- Local: light and dark, reduced-motion, and scroll the neighbouring sections to prove zero CSS leak.
- After deploy, check the real domain, not localhost. The last break was invisible on localhost.
- Confirm links and auth DOM still resolve.

## Phase 7 · Ship safe

- Fast-lane vs gated per ENVIRONMENT_STRATEGY. An HTML/CSS section swap is fast-lane.
- Know the one-line rollback before you push.
- Re-review with fresh eyes the next day. You see what you missed.

---

## The three mistakes this came from

1. A whole-page swap broke the account/auth links. Fix: scope it, swap only the section.
2. The palette was not locked first, so the hero was recoloured twice. Fix: Phase 0.
3. It was verified only on localhost. Fix: Phase 6 real-domain check.
