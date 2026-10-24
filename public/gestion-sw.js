// Service worker de la app de gestión. Siempre pide los datos frescos al servidor:
// solo guarda la pantalla para que la app abra aunque el servidor tarde o no haya señal.
const CACHE = 'tecnoriv-gestion-v1';
const PANTALLA = ['/gestion', '/gestion.js', '/app/icono-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PANTALLA)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Primero la red (versión nueva); si falla, la copia guardada.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok && PANTALLA.includes(url.pathname)) {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
