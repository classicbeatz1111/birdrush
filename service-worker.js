
const CACHE_NAME = 'friend-birds-v1';
const ASSETS = [
  './',
  './index.html',
  './game.js',
  './styles.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon.png',
  './assets/background.png',
  './assets/bird.png',
  './assets/friend.png',
  './assets/pipe.png',
  './assets/cloud.png',
  './assets/power_heart.png',
  './assets/power_bolt.png',
  './assets/music.wav'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(res => res || fetch(e.request).then(networkRes => {
        const copy = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return networkRes;
      }))
    );
  } else {
    e.respondWith(fetch(e.request));
  }
});
