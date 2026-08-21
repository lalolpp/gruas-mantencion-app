const CACHE = 'gruas-v1';
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
  '/js/importar.js',
  '/js/app.js',
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

self.addEventListener('fetch', ev => {
  const url = new URL(ev.request.url);
  if (url.origin !== location.origin) return;

  if (ev.request.mode === 'navigate') {
    ev.respondWith(
      fetch(ev.request)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(ev.request, copia));
          return res;
        })
        .catch(() => caches.match(ev.request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  ev.respondWith(
    caches.match(ev.request).then(r => r || fetch(ev.request))
  );
});
