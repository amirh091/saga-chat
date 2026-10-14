// Service Worker basique pour rendre l'application installable
const CACHE_NAME = 'saga-chat-v1';

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installé.');
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('Service Worker activé.');
});

// Stratégie de réseau (on essaie toujours d'avoir la version la plus fraîche)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});