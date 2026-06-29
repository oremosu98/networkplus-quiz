---
type: decision
status: active
cert: all
updated: 2026-06-29
tags: [decision]
---
# ADR-001 — Supabase session tokens in non-HttpOnly cookies (audit M5)

- **Status:** Accepted
- **Date:** 2026-05-31
- **Decider:** Founder
- **Audit ref:** `SECURITY-AUDIT-2026-05-29.md` → M5
- **Affected code:** `lib/supabase.js:79`, `landing/lib/supabase.js:79`

## Context

CertAnvil is a **thick client + Supabase** app: the browser talks directly to
Supabase using the public anon key plus the signed-in user's JWT. The Supabase
JS SDK manages the session (access + refresh tokens) and attaches the bearer
token to every request it makes from the browser.

To share one session across `networkplus.certanvil.com`, `certanvil.com`, and the
other per-cert subdomains (Pattern A), the session is persisted via a
cookie-backed storage adapter on `Domain=.certanvil.com`. Those cookies are
**not** `HttpOnly` — they cannot be, because the client-side SDK has to read the
token out of storage to attach it to outbound requests.

**The risk (M5):** because the token store is JS-readable, **any** successful XSS
on any `*.certanvil.com` page can exfiltrate the session → full account takeover
across every subdomain. This is *inherent* to the client-direct Supabase model,
not a coding mistake in our adapter.

## Decision

**Accept the non-HttpOnly token storage as an inherent property of the chosen
architecture.** Do **not** build a server-side/BFF session layer at this time.

The risk is mitigated by attacking its precondition — XSS — in depth, which is
what the Phase 4 ship already delivered:

- **Primary:** always-on `escHtml` / `escapeHtml` discipline on every innerHTML
  sink (escape-then-highlight order is a hard rule — see CLAUDE.md gotchas).
- **Backstop:** vendored DOMPurify (M6, v7.8.3) over the untrusted sinks (AI
  output + cross-user/remote admin rows), failing open to the escape layer.
- **Defence-in-depth (deferred):** CSP `'unsafe-inline'` removal (M7) would add a
  browser-level backstop, but is high-effort and lower-ROI than M6; tracked
  separately, not a precondition of this decision.

## Alternatives considered

| Option | Why not (now) |
|---|---|
| **BFF / server-side session with HttpOnly cookies** | Correct end-state for a multi-tenant SaaS holding many users' PII, but it is a **multi-week architectural rewrite**: stand up a session service, proxy every Supabase call through it, and re-do auth on both the cert app and the landing project. Unjustified for a **currently single-user, pre-pivot** app whose data-at-risk is one person's quiz progress. |
| **`@supabase/ssr` cookie chunking** | Improves cookie handling but the access token is still JS-reachable for the browser SDK — does not remove the M5 class of risk. Cosmetic for this threat. |
| **Drop cross-subdomain session sharing** | Would let cookies be tighter-scoped but breaks the Pattern-A single-sign-on UX across cert subdomains. Not worth it. |

## Consequences

- **Accepted:** a single XSS anywhere on `*.certanvil.com` = account takeover.
  This is why XSS prevention (escHtml + DOMPurify) is treated as a P0-class
  invariant in this codebase, and why M7 remains on the roadmap as additional
  depth.
- **Bounded blast radius today:** single-user app; the account at risk is the
  founder's own. No third-party PII is exposed by a takeover.
- M5 is now **closed as a documented, accepted decision** rather than an open
  audit finding.

## Revisit trigger (when this decision flips)

Re-open and implement the BFF / HttpOnly-session option **when** the app crosses
into **paid multi-tenant SaaS holding other users' PII at scale** — i.e. the
moment a session-takeover would compromise *someone else's* data, not just the
operator's. At that point the weeks-of-rewrite cost is justified by the changed
threat model. Until that trigger fires, this ADR stands.

## Related
[[ADR-002-rbac-admin-surface]] · [[structure-overview]] · [[conventions]] · [[ENVIRONMENT_STRATEGY]]
