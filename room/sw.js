/* Phrase Room service worker — cache-first shell so the room opens offline. */
const CACHE = 'phrase-room-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/data/store.js',
  './js/data/indexedDbAdapter.js',
  './js/data/categories.js',
  './js/data/seed.js',
  './js/scene/room.js',
  './js/scene/build.js',
  './js/scene/furniture.js',
  './js/scene/mascot.js',
  './js/scene/fish.js',
  './js/scene/controls.js',
  './js/scene/palette.js',
  './js/ui/dom.js',
  './js/ui/icons.js',
  './js/ui/sheet.js',
  './js/ui/editor.js',
  './js/ui/detail.js',
  './js/ui/toast.js',
  './js/ui/phraseView.js',
  './js/ui/wordPopup.js',
  './vendor/three.module.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
