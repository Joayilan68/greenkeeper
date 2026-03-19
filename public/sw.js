// ─── SERVICE WORKER — GreenKeeper Push Notifications ─────────────────────────
const CACHE_NAME = 'greenkeeper-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// ── Réception d'une push notification ────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;

  let data;
  try { data = e.data.json(); }
  catch { data = { title: 'GreenKeeper', body: e.data.text(), icon: '/icon-192.png' }; }

  const options = {
    body: data.body || 'Nouvelle alerte pour votre gazon',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'greenkeeper-notif',
    renotify: true,
    data: { url: data.url || '/', actionRoute: data.actionRoute || '/' },
    actions: data.action ? [
      { action: 'open', title: data.action },
      { action: 'close', title: 'Ignorer' }
    ] : [],
  };

  e.waitUntil(self.registration.showNotification(data.title || '🌿 GreenKeeper', options));
});

// ── Clic sur la notification ──────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const url = e.notification.data?.actionRoute || '/';

  if (e.action === 'close') return;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(self.location.origin + url);
    })
  );
});
