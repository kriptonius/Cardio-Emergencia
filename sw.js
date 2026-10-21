const CACHE_NAME = 'salvador-ce-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// INSTALAR: cachea los archivos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cacheando archivos esenciales...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVAR: limpia caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// INTERCEPTAR: si no hay internet, sirve desde el caché
self.addEventListener('fetch', (event) => {
  // El mapa de OpenStreetMap siempre requiere internet, no lo cacheamos
  if (event.request.url.includes('openstreetmap')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).catch(() => {
          // Si falla la red y no está en caché, devuelve el index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});