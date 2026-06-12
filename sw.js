const CACHE_NAME = 'iselman-v2.6';

const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/Main_Logo.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for shell assets, network-first for API calls
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Don't intercept non-GET or cross-origin API calls that need fresh data
  if (event.request.method !== 'GET') return;

  // Network-first for Open-Meteo API calls (weather + tides)
  if (url.hostname.includes('open-meteo.com') || url.hostname.includes('marine-api.open-meteo.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache a fresh copy for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request)) // stale data if offline
    );
    return;
  }

  // Cache-first for everything else (shell, fonts, icons)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: serve index.html for document navigations
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
