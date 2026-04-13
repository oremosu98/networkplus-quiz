// Service Worker v4.31.1 — Network+ Quiz App
const CACHE_NAME = 'netplus-v4.31.1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
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

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
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

// Fetch: network-first for API calls, stale-while-revalidate for app shell.
// 5xx responses (#20) are treated as failures: we never cache them, and we
// fall back to whatever is already cached so the user keeps a working app
// during a Vercel/origin outage.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API calls
  if (url.hostname === 'api.anthropic.com') return;

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
