---
name: deploy-health
description: >
  Cheap deploy-hygiene check for CertAnvil. Bundles two checks: (1) a local
  cache-bump / version-quad guard, and (2) a read-only prod version-drift ping
  across every cert subdomain. Designed for /loop — one deterministic command,
  terse "OK" on the happy path, only investigates when something is red.
  Use before a deploy, or on an interval (e.g. /loop 30m /deploy-health).
---

# Deploy Health

Two bundled, low-token checks for CertAnvil's push-to-prod workflow:

- **A — Cache-bump guard (local, instant, no network):** catches the #1 deploy
  gotcha — shippable assets changed but `APP_VERSION` / `CACHE_NAME` not bumped,
  or the version "quad" gone divergent. (SW cache must bump every deploy or users
  get stale files.)
- **B — Prod version-drift ping (network, read-only):** each cert subdomain is its
  **own** Vercel deployment, so one can go stale independently. Pings each, compares
  the live version to source, and reports HTTP status + latency.

## Hard rules (do not violate)
- **Read-only on prod.** Only HTTP GETs. NEVER run JS against prod / `*.vercel.app`
  or touch `localStorage` (documented data-loss rule).
- **Stay cheap.** On the all-green path, reply with the compact summary and STOP.
  Do **not** read large files (app.js, uat.js) — everything below is grep/regex.
  Only fetch logs / dig deeper for a line marked ✗.

## When invoked
Run the single block below from the repo root, then relay its output as a terse
summary (see Output). If `/deploy-health` was typed with an arg like `local` run
only Check A (skip the network ping); with `prod` run only Check B.

```bash
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

# ── A. CACHE-BUMP GUARD (local) ────────────────────────────────
SRC=$(grep -oE "const APP_VERSION = '[^']+'" app.js | grep -oE "[0-9][0-9.]+" | head -1)
CACHE=$(grep -oE "CACHE_NAME = 'netplus-v[^']+'" sw.js | grep -oE "[0-9][0-9.]+" | head -1)
PKG=$(grep -oE '"version": *"[^"]+"' package.json | grep -oE "[0-9][0-9.]+" | head -1)
BADGE=$(grep -oE 'id="version-badge"[^>]*>v[0-9.]+' index.html | grep -oE "[0-9][0-9.]+$" | head -1)

echo "QUAD app=$SRC sw=$CACHE pkg=$PKG badge=$BADGE"
if [ "$SRC" = "$CACHE" ] && [ "$SRC" = "$PKG" ] && [ "$SRC" = "$BADGE" ]; then
  echo "QUAD: OK"
else
  echo "QUAD: ✗ DIVERGENT — fix with: node scripts/bump-version.js <v> \"<desc>\" (never hand-edit)"
fi

git fetch -q origin main 2>/dev/null || true
MAINVER=$(git show origin/main:app.js 2>/dev/null | grep -oE "const APP_VERSION = '[^']+'" | grep -oE "[0-9][0-9.]+" | head -1)
CHANGED=$( { git diff --name-only origin/main...HEAD 2>/dev/null; git status --porcelain | awk '{print $2}'; } | sort -u )
SHELL_HIT=$(printf '%s\n' "$CHANGED" | grep -E '^(app\.js|styles\.css|dg-system\.css|dg-depurple\.css|sw\.js|index\.html|certs/|lib/)' | head -6)
if [ -n "$SHELL_HIT" ] && [ "$SRC" = "$MAINVER" ]; then
  echo "BUMP: ✗ shell assets changed but APP_VERSION still $SRC (== main $MAINVER) — bump before deploy:"
  printf '%s\n' "$SHELL_HIT" | sed 's/^/   /'
else
  echo "BUMP: OK (main=$MAINVER head=$SRC; no un-bumped shell changes)"
fi

# ── B. PROD VERSION-DRIFT PING (read-only) ─────────────────────
echo "PING (live vs source v$SRC):"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
ok=0; blocked=0; reached=0
for sub in networkplus secplus aplus azure ai sc900 clfc02; do
  cb=$(date +%s%N); tmp=$(mktemp)
  meta=$(curl -s -m 12 -A "$UA" -o "$tmp" -w '%{http_code} %{time_total}' \
        "https://$sub.certanvil.com/index.html?nocache=$cb" 2>/dev/null || echo "ERR -")
  code=$(echo "$meta" | awk '{print $1}'); t=$(echo "$meta" | awk '{print $2}')
  live=$(grep -oE 'id="version-badge"[^>]*>v[0-9.]+' "$tmp" 2>/dev/null | grep -oE "[0-9][0-9.]+$" | head -1)
  rm -f "$tmp"
  if [ "$code" = "200" ] && [ "$live" = "$SRC" ]; then
    reached=$((reached+1)); ok=$((ok+1)); printf "  OK  %-12s v%s  %ss\n" "$sub" "$live" "$t"
  elif [ "$code" = "401" ] || [ "$code" = "403" ]; then
    blocked=$((blocked+1)); printf "  ··  %-12s http=%s (auth/bot wall)\n" "$sub" "$code"
  else
    reached=$((reached+1)); printf "  ✗   %-12s live=v%s src=v%s http=%s %ss\n" "$sub" "${live:-?}" "$SRC" "${code:-ERR}" "${t:-?}"
  fi
done
# Verdict: uniform 401/403 with nothing reached = this network is firewalled, NOT an outage.
if [ "$reached" = 0 ] && [ "$blocked" -gt 0 ]; then
  echo "PING: BLOCKED — all certs returned 401/403 and none were reachable. This is egress"
  echo "      filtering (cloud/CI IPs are walled by Vercel), NOT a prod outage. INCONCLUSIVE:"
  echo "      run from your own machine, or trust deploy-verification.yml (GitHub Actions)."
elif [ "$ok" = 7 ]; then
  echo "PING: OK (all 7 certs live on v$SRC)"
else
  echo "PING: ✗ real drift/outage on $((7-ok-blocked)) cert(s) — investigate the ✗ lines above"
fi
```

## Output
- **All green:** one line, e.g.
  `✅ deploy-health: quad OK · no un-bumped changes · all 7 certs live on v7.13.5 (<1s each)`
  Then stop.
- **Any ✗:** name the failing check(s) and the one-line fix:
  - `QUAD ✗` → run `node scripts/bump-version.js` (never hand-edit partial).
  - `BUMP ✗` → bump version+cache before deploying or users get a stale SW cache.
  - `PING BLOCKED` → **not an alarm.** All certs returned 401/403 because the current
    network's egress IP is walled by Vercel (common on cloud/CI runners). Report it as
    "prod check inconclusive from here" and point to `deploy-verification.yml` or a local run.
  - `PING ✗ <cert>` (mixed — some certs reachable, one isn't / version-mismatched) → THIS
    is a real signal. `http≠200`: possible Vercel incident — check `vercel-incident-recovery.yml`
    / redeploy. `live<src`: that cert's deploy didn't flip; give the CDN a minute, then re-ping.

## Notes
- **Where Check B actually works:** Vercel walls cloud/CI egress IPs, so from a remote
  Claude Code container the ping returns a uniform 401/403 (`PING: BLOCKED`) — that's
  expected and inconclusive, not an outage. It works from your **own machine** (residential
  IP). For the authoritative automated live check, `deploy-verification.yml` already runs
  post-deploy from GitHub Actions. So: run `/deploy-health` **locally** for the real ping;
  on a remote/loop runner it still gives you the (most valuable) local cache-bump guard.
- `www.certanvil.com` is the **separate landing project** (own version scheme) — not
  pinged here on purpose.
- Token budget: the curls transfer real bytes but only the parsed version/status/time
  reach the model, so each iteration is cheap regardless of page size.
