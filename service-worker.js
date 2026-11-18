// Bump this on every deploy that changes app files, so old caches get replaced.
const CACHE_NAME = 'kana-trainer-v1.22';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './fonts/MPLUS1p-Full-Regular.woff2',
  './fonts/MPLUS1p-Full-Medium.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // `cache: 'reload'` = always download fresh copies. GitHub Pages lets
      // phones reuse files for 10 minutes, so without it a new version could
      // be stored with the OLD files and stay stuck on them.
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-first, falling back to network, falling back to whatever's cached
// if the network fails (i.e. fully offline). Nothing here ever needs the
// network for this app, since it has no external dependencies.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Only cache good same-origin responses — caching a 404/500 would
          // keep serving the error even after the server recovers.
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => (event.request.mode === 'navigate'
          ? caches.match('./index.html')
          : Response.error()));
    })
  );
});
