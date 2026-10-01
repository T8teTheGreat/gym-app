// 1. Change version name whenever you edit app files
const CACHE_NAME = 'gym-app-v2'; 

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/navigation.js',
  '/store.js',
  '/utils.js',
  '/pages/history.js',
  '/pages/library.js',
  '/pages/logger.js',
  '/data/exercises.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event: Cache files and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forces waiting SW to activate without waiting for tabs to close
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate event: Clean up old caches ('gym-app-v1') and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name); // Deletes 'gym-app-v1'
          }
        })
      );
    }).then(() => self.clients.claim()) // Takes control of open tabs immediately
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});