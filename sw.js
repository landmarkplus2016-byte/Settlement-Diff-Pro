// Simple service worker to enable PWA installation
const CACHE_NAME = 'settle-diff-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      ))
    ])
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
