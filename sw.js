// Service worker : permet d'installer le site comme une application et de l'ouvrir hors connexion.
// Stratégie : réseau d'abord (tu vois toujours la dernière version), cache en secours si pas de réseau.
// Les données Firebase et les ressources d'autres sites ne passent jamais par ce cache.
const CACHE = 'portfolio-v1';
const SHELL = [
  './', 'index.html', 'projet.html', 'admin.html', 'editeur.html', 'manifest.webmanifest',
  'css/base.css', 'css/themes.css', 'css/site.css', 'css/admin.css',
  'js/admin.js', 'js/analyze.js', 'js/common.js', 'js/defaults.js', 'js/dom.js', 'js/editor.js', 'js/errors.js',
  'js/firebase-config.js', 'js/image.js', 'js/markdown.js', 'js/media.js', 'js/model.js', 'js/project.js', 'js/pwa.js',
  'js/render.js', 'js/runner.js', 'js/site.js', 'js/store.js', 'js/theme.js', 'js/ui.js',
  'assets/favicon.svg', 'assets/icon-192.png', 'assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, polices, Pyodide : on ne touche pas
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
