// sw.js — INFINICUS Engine v3 Service Worker
// Bump CACHE_VERSION when deploying significant updates to force re-cache
// Deployed: 2026-07-03 rev5
const CACHE_VERSION = 'v9';
const CACHE = 'infinicus-' + CACHE_VERSION;

// Core shell assets — cached on install
const SHELL = [
  '/index.html',
  '/landing.html',
  '/account.html',
  '/legal.html',
  '/manifest.json',
  '/infinicus-mark.svg',
  '/og-image.svg',
  '/infinicus logo.jpeg',
];

// Fonts are cached at runtime (cross-origin, can't pre-cache reliably)
const FONT_ORIGINS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // Don't let missing optional assets block install
  );
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: strategy by request type ──────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Never intercept API calls — always go to network
  if (url.pathname.startsWith('/api/')) return;

  // External analytics — don't intercept
  if (url.hostname.includes('cloudflareinsights.com')) return;

  // Fonts — cache on first fetch, serve from cache thereafter
  if (FONT_ORIGINS.some(h => url.hostname.includes(h))) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(resp => {
            if (resp && resp.status === 200) cache.put(request, resp.clone());
            return resp;
          }).catch(() => cached); // silent fail — fonts not critical offline
        })
      )
    );
    return;
  }

  // HTML pages — network-first so users get fresh content when online,
  // but fall back to cached version when offline
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then(resp => {
          if (resp && resp.status === 200) {
            caches.open(CACHE).then(c => c.put(request, resp.clone()));
          }
          return resp;
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // Everything else (JS/CSS inline, SVGs, images) — cache-first
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(resp => {
        if (resp && resp.status === 200) {
          caches.open(CACHE).then(c => c.put(request, resp.clone()));
        }
        return resp;
      });
    })
  );
});

// ── Background sync: notify clients of SW update ─────────────────────────────
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
