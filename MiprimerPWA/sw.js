const CACHE_NAME = 'pwa-cache-v1';
const FILES_TO_CACHE = [
    '/MiprimerPWA/',
    '/MiprimerPWA/index.html',
    '/MiprimerPWA/style.css',
    '/MiprimerPWA/app.js',
    '/MiprimerPWA/manifest.json'
];

self.addEventListener('install', event => {
    console.log('Service Worker instalándose...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker activado');
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});