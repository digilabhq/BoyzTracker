const CACHE_NAME = 'boyz-tracker-v2.0.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/auth.js',
  './js/db.js',
  './js/calendar.js',
  './js/ui.js',
  './images/heroes/boyz-deck.png',
  './images/heroes/boyz-park.jpg',
  './images/heroes/benny-bed.jpg',
  './images/heroes/benny-yard.jpg',
  './images/heroes/leo-couch.jpg',
  './images/icons/paw-blue.png',
  './images/icons/paw-purple.png',
  './images/icons/icon-192.png',
  './images/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data?.action === 'skipWaiting') self.skipWaiting();
});
