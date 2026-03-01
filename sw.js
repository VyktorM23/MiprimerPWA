const CACHE_NAME = 'pwa-cache-v1';
const FILES_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    self.skipWaiting(); // Activar inmediatamente
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Archivos guardados en caché');
                return cache.addAll(FILES_TO_CACHE);
            })
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activado');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Eliminando caché antiguo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Tomando control');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', event => {
    console.log('Interceptando:', event.request.url);
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('Sirviendo desde caché:', event.request.url);
                    return response;
                }
                console.log('Buscando en red:', event.request.url);
                return fetch(event.request);
            })
    );
});