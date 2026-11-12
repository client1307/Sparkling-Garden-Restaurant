// Lightweight Service Worker for Sparkling POS PWA Installability
const CACHE_NAME = 'sparkling-pos-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through network requests, with fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

