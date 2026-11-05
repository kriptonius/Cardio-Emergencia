const CACHE_NAME = 'salvador-ce-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './rcp-manos.jpg',
  './rcp-verificar.mp4'
];

// INSTALAR: cachea los archivos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ACTIVAR: limpia caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// INTERCEPTAR: cache primero, red como respaldo
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.url.includes('openstreetmap')) return; // el mapa siempre necesita internet

  event.respondWith(
    caches.match(req).then(async cached => {
      if (cached) {
        const range = req.headers.get('range');
        if (range && cached.status === 200) {
          const buf = await cached.arrayBuffer();
          const m = /bytes=(\d*)-(\d*)/.exec(range);
          const start = m && m[1] ? parseInt(m[1], 10) : 0;
          const end = m && m[2] ? Math.min(parseInt(m[2], 10), buf.byteLength - 1) : buf.byteLength - 1;
          return new Response(buf.slice(start, end + 1), {
            status: 206,
            statusText: 'Partial Content',
            headers: {
              'Content-Type': cached.headers.get('Content-Type') || 'video/mp4',
              'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
              'Content-Length': String(end - start + 1)
            }
          });
        }
        return cached;
      }
      return fetch(req).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
