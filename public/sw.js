// Amazonia Service Worker — enables offline caching and PWA install
const CACHE_NAME = 'amazonia-v1'
const STATIC_ASSETS = ['/', '/login', '/products', '/cart', '/orders']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  // Network-first for API calls, cache-first for static assets
  if (e.request.url.includes('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'Offline' }), {
        headers: { 'Content-Type': 'application/json' },
      }))
    )
  } else {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    )
  }
})
