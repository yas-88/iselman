const CACHE = 'iselman-v2.9';
const FONTS = 'iselman-fonts-v1';
const SPECIES = ['anchois','anguille','barbeau','bass','carpe','daurade','espadon','loup','maquereau','merou',
  'perche','poulpe','raie','requin','rouget','sardine','seiche','silure','thon','truite'];
const ASSETS = ['/', '/index.html', '/manifest.json', '/icons/Main_Logo.png', '/icons/icon-192.png', '/icons/icon-512.png',
  ...SPECIES.map(id => '/species/' + id + '.jpg')];

self.addEventListener('install', e => {
  // Precache shell + species photos so the guide is complete offline from first install.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname.endsWith('open-meteo.com')) return; // always live; app caches its own copy
  // Google Fonts: cache first, kept across app versions, so text renders correctly offline.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
  if (url.origin !== location.origin) return;           // beehiiv etc: let the browser handle

  // Pages: network first so updates arrive without waiting on a cache bump; cache as offline fallback.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put('/index.html', clone)); }
      return res;
    }).catch(() => caches.match('/index.html')));
    return;
  }

  // Static assets: cache first.
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
      return res;
    }))
  );
});
