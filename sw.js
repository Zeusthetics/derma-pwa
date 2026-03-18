const CACHE = 'derm-v1';
const ASSETS = ['./','./index.html','./app.js','./style.css','./manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    if (list.length) return list[0].focus();
    return clients.openWindow('./');
  }));
});

self.addEventListener('notificationclose', e => {
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'NOTIFY') {
    const { title, body, tag } = e.data;
    self.registration.showNotification(title, {
      body,
      tag,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 600],
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      actions: [{ action: 'open', title: 'Mark done' }]
    });
  }
});
