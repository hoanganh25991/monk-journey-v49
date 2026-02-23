/**
 * Monk Journey PWA Service Worker
 * Minimal caching: entry point + manifest. No progress tracking.
 * Loading screen uses pwa/initial-loading-progress.js (10s dummy progress).
 */

const CACHE_NAME = 'monk-journey-cache';
const CACHE_VERSION = '67';
const CACHE_KEY = CACHE_NAME + '-v' + CACHE_VERSION;

// Minimal assets to pre-cache (entry + manifest only; rest loaded on demand)
const ASSETS_TO_CACHE = ['', 'manifest.json'];

// Install: cache minimal set, then activate
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_KEY)
      .then(cache => {
        return Promise.all(
          ASSETS_TO_CACHE.map(url => {
            const fetchUrl = url === '' ? './' : url;
            return fetch(fetchUrl).then(res => {
              if (res.ok) cache.put(url, res);
              return res.ok;
            }).catch(() => false);
          })
        );
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('SW install failed:', err))
  );
});

// Activate: remove old caches, claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names
          .filter(n => n.startsWith(CACHE_NAME) && n !== CACHE_KEY)
          .map(n => caches.delete(n))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const path = new URL(event.request.url).pathname;
  const cacheKey = path === '/' ? '' : path;

  event.respondWith(
    caches.match(cacheKey)
      .then(cached => cached || fetch(event.request))
      .catch(() => fetch(event.request))
  );
});
