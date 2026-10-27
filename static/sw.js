const CACHE = 'gruas-v16';
const PRECACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/css/style.css',
  '/manifest.json',
  '/js/firebase-config.js',
  '/js/catalogo-inicial.js',
  '/js/mapping.js',
  '/js/db.js',
  '/js/auth.js',
  '/js/gruas.js',
  '/js/mantenciones.js',
  '/js/baterias.js',
  '/js/importar.js',
  '/js/exportar.js',
  '/js/compartir.js',
  '/js/qrcode.min.js',
  '/js/app.js',
  '/img/logo.png',
  '/img/app-icon-192.png',
  '/img/app-icon-512.png'
];

self.addEventListener('install', ev => {
  self.skipWaiting();
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys().then(claves =>
      Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first: siempre intenta la version mas reciente; sin conexion usa cache
self.addEventListener('fetch', ev => {
  const url = new URL(ev.request.url);
  if (url.origin !== location.origin || ev.request.method !== 'GET') return;

  ev.respondWith(
    // 'no-cache' fuerza revalidacion con el servidor (no usa la caché HTTP
    // del navegador). Sin esto, si el navegador tiene gruas.js cacheado
    // (max-age=1h) sirve el JS viejo aunque ya exista una version nueva.
    // Si no hay red, fetch rechaza y cae al cache offline de abajo.
    fetch(ev.request, { cache: 'no-cache' })
      .then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(ev.request, copia));
        return res;
      })
      .catch(() =>
        caches.match(ev.request)
          .then(r => r || (ev.request.mode === 'navigate' ? caches.match('/index.html') : undefined))
      )
  );
});
