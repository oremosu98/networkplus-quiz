// Service Worker v7.6.0 — Network+ Quiz App (Phase C′ cloud-first)
const CACHE_NAME = 'netplus-v7.6.0';
const SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './dg-system.css',
  './app.js',
  './manifest.json',
  // v4.87.4: CertAnvil M14 logo. Single SVG = favicon + apple-touch-icon
  // + PWA manifest icon. Modern browsers handle all sizes from one source.
  './favicon.svg',
  // v4.86.0: cert packs precached. Both load on every visit (~3KB combined
  // at Phase 1A; will grow as TOPIC_DOMAINS/exemplars migrate). Active cert
  // is resolved at runtime by detectCert() in app.js.
  './certs/netplus.js',
  './certs/secplus.js',
  // v4.89.0 (Phase C′): cloud-first modules. Order in index.html matters
  // (Supabase UMD → lib/supabase.js → cloud-store.js → auth-state.js →
  // migration.js → app.js).
  // v4.89.1: vendored Supabase UMD bundle locally (was cdn.jsdelivr.net, but
  // the CDN 503'd intermittently and broke auth flow — auth.js bails out
  // when window.supabase is missing). Local copy is precached for offline.
  './lib/supabase-umd.min.js',
  './lib/supabase.js',
  './cloud-store.js',
  './auth-state.js',
  './migration.js',
  // v4.99.56 (D.5): landing-diagnostic claim hook. Fires on URL action
  // `?action=claim-diagnostic&token=...` post magic-link sign-in.
  './diagnostic-claim.js'
];
// Hard cap on cached entries to prevent unbounded cache growth (#20).
// The shell counts toward this; everything beyond it (icons, fonts, runtime
// fetches) is FIFO-evicted once the cap is exceeded.
const CACHE_MAX_ENTRIES = 60;

// Install: cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches + broadcast update notice to all open tabs.
// v4.89.2: the page-side controllerchange listener handles auto-reload,
// but we also broadcast a postMessage as a redundant signal — controllerchange
// can occasionally not fire if the new SW activates before the page registers
// its listener. Either signal triggers the page reload.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()).then(() => {
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          try { client.postMessage({ type: 'sw-updated', cache: CACHE_NAME }); } catch (_) {}
        });
      });
    })
  );
});

// Trim a cache to at most `maxEntries` items, evicting oldest first.
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const overflow = keys.length - maxEntries;
  for (let i = 0; i < overflow; i++) {
    await cache.delete(keys[i]);
  }
}

// Fetch: NETWORK-FIRST for HTML + JS (v4.99.27 iOS-fix), stale-while-revalidate
// for static assets. Pre-v4.99.27 the entire shell used stale-while-revalidate
// which served cached JS first + fetched fresh in the background — fine on
// desktop where SW updates land within seconds, but iOS Safari's flaky SW
// lifecycle meant deploys took multiple visits + sometimes a force-quit to
// land on iPhone. Network-first for HTML + JS guarantees deploys propagate
// to the next visit immediately on every browser including iOS Safari.
// 5xx responses (#20) are treated as failures: we never cache them, and we
// fall back to whatever is already cached so the user keeps a working app
// during a Vercel/origin outage.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API calls
  if (url.hostname === 'api.anthropic.com') return;

  // v4.89.3: pass-through Supabase API calls (auth, REST, storage,
  // realtime). Caching auth tokens / REST mutations is wrong + dangerous,
  // and the Cache API can't store POST/PUT/DELETE responses anyway —
  // intercepting them just produced "Failed to fetch" errors when the
  // SW returned null after cache.put rejected. Pass-through preserves
  // the browser's normal CORS + credential handling.
  if (url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in')) return;

  // v4.63.0 — pass /vendor/ and /mockups/ through untouched. The vendored
  // Three.js bundle (~1.3 MB) would evict legitimate shell entries under
  // the 60-entry cap. Mockups are non-production prototypes that
  // shouldn't clutter the cache either. Browser HTTP cache still applies,
  // so repeat fetches are still fast.
  if (url.pathname.startsWith('/vendor/') || url.pathname.startsWith('/mockups/')) {
    return; // let the network handle it
  }

  // v4.99.27 — network-first for HTML + JS. iOS Safari's stale-while-revalidate
  // path was serving 2-5-version-old code on first visit after a deploy, with
  // background updates not landing until force-quit. Now: try network first,
  // fall back to cache only if network fails (offline support preserved).
  // ~50ms slowdown per file on fast wifi is the trade-off for predictable
  // updates. Static assets (CSS, fonts, images, manifest, cert packs) keep
  // stale-while-revalidate below — version-mismatch with HTML+JS is harmless
  // for those (they don't reference each other).
  const isHtmlOrJs = (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js')
  );

  if (isHtmlOrJs) {
    event.respondWith(
      fetch(event.request).then(response => {
        // 5xx soft-fail — prefer cached copy if we have one
        if (response.status >= 500) {
          return caches.match(event.request).then(cached => cached || response);
        }
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
            trimCache(CACHE_NAME, CACHE_MAX_ENTRIES);
          });
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-while-revalidate for everything else (CSS, fonts, images, manifest,
  // cert packs) — fast load + offline support, version mismatch with HTML+JS
  // doesn't matter for these.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        // Treat 5xx as a soft failure — prefer the cached copy if we have one.
        if (response.status >= 500 && cached) return cached;

        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
            trimCache(CACHE_NAME, CACHE_MAX_ENTRIES);
          });
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// ════════════════════════════════════════════════════════════════════
// v4.99.31 (iOS Plan Phase 5 — PWA push scaffolding)
//
// SW-side handlers for web push. Today: client-side subscribe is
// deferred (no VAPID keys + server backend yet — that's a feature-day
// decision once founder + paying users want daily-nudge nudges). When
// the day comes, app.js gets a `_requestPushPermission()` flow that
// calls `reg.pushManager.subscribe({ applicationServerKey, ... })` and
// POSTs the subscription to a server endpoint. THESE handlers, however,
// already fire correctly the moment any push payload reaches the SW.
//
// iOS 16.4+ supports web push but ONLY for apps installed via Add to
// Home Screen (display-mode: standalone). Android Chrome supports it
// from any context. Hence the A2HS banner work earlier in this Phase 5
// is a precondition for iOS push delivery.
//
// Payload contract (server-side, when wired):
//   { title, body, url?, tag? }
// Title + body fall back to safe defaults if the server sends a malformed
// payload (defensive — push payloads cross trust boundaries).
// ════════════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  if (!event || !event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch (_) {
    payload = { title: 'CertAnvil', body: event.data.text() || 'Time to study!' };
  }
  const title = (payload && payload.title) || 'CertAnvil';
  const options = {
    body: (payload && payload.body) || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: (payload && payload.url) || '/' },
    tag: (payload && payload.tag) || 'certanvil-default',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — focus an existing tab if open, else spawn a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    try {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url && client.url.indexOf(targetUrl) !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    } catch (_) { /* fall through silently */ }
  })());
});
