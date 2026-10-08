/* Service worker: precache the app shell (cache-first), network-first for navigations, never touch /api/ */
const VER = 'speedy-list-v11';
const SHELL = ['./','index.html','manifest.webmanifest','config.js','css/styles.css','js/core.js','js/vision.js','js/ai.js','js/data.js','js/protocol.js','js/sell.js','js/export.js','js/buy.js','js/bulk.js','js/app.js',
  'assets/logo.jpg','assets/logo-icon.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/favicon-32.png',
  'assets/brand/roadrunner-tile-64.png','assets/brand/roadrunner-icon-192.png','assets/brand/roadrunner-icon-512.png','assets/brand/roadrunner-maskable-512.png','assets/brand/roadrunner-apple-touch-180.png','assets/brand/roadrunner-favicon-32.png','assets/brand/roadrunner-buy-tile-64.png','assets/brand/roadrunner-buy-tile-192.png','assets/brand/roadrunner-buy-tile.png','assets/fonts/RacingSansOne-Regular.woff2',
  'fonts/Barlow-Medium.woff2','fonts/Barlow-SemiBold.woff2','fonts/Barlow-Bold.woff2','fonts/Barlow-ExtraBold.woff2','fonts/OpenSans-var.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/') || url.pathname.includes('/.netlify/')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VER).then(c => c.put('index.html', cp)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); } return r; })));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.openWindow('./index.html#/alerts')); });
