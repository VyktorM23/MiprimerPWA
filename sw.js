const CACHE_NAME = 'pwa-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon-72x72.png',
    './icon-96x96.png',
    './icon-128x128.png',
    './icon-144x144.png',
    './icon-152x152.png',
    './icon-192x192.png',
    './icon-384x384.png',
    './icon-512x512.png'
];

self.addEventListener('install', event => {
    console.log('Service Worker instalándose');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Archivos cacheados');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker activado');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Cache antiguo eliminado:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then(response => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    });
            })
    );
});
