// Simple service worker to enable PWA installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first or cache-first strategies could be added here
  // For now, just a pass-through to satisfy PWA requirements
  event.respondWith(fetch(event.request));
});
