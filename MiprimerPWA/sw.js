const CACHE_NAME = 'pwa-cache-v1';
const FILES_TO_CACHE = [
    '/MiprimerPWA/',
    '/MiprimerPWA/index.html',
    '/MiprimerPWA/style.css',
    '/MiprimerPWA/app.js',
    '/MiprimerPWA/manifest.json'
];

self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...', 'Scope:', self.registration.scope);
    self.skipWaiting();
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
    // Solo procesar peticiones dentro de nuestro scope
    if (event.request.url.includes('/MiprimerPWA/')) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request);
                })
        );
    }
});