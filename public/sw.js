// ─── SERVICE WORKER — Mongazon360 ────────────────────────────────────────────
// Stratégie : SW minimal — pas de cache, pas de fetch handler.
// Vercel + Chrome gèrent le cache HTTP via les headers Cache-Control.
// Le SW ne fait qu'une chose : gérer les push notifications.

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', () => {
  self.skipWaiting(); // Activation immédiate sans attendre la fermeture des onglets
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(), // Prend le contrôle de tous les onglets immédiatement
      caches.keys().then(keys => // Supprime tous les anciens caches
        Promise.all(keys.map(k => caches.delete(k)))
      ),
    ])
  );
});

// ── Réception d'une push notification ────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;

  let data;
  try { data = e.data.json(); }
  catch { data = { title: 'Mongazon360', body: e.data.text(), icon: '/icon-192.png' }; }

  const options = {
    body:     data.body || 'Nouvelle alerte pour votre gazon',
    icon:     '/icon-192.png',
    badge:    '/icon-192.png',
    vibrate:  [200, 100, 200],
    tag:      data.tag || 'mg360-notif',
    renotify: true,
    data:     { url: data.url || '/', actionRoute: data.actionRoute || '/' },
    actions:  data.action ? [
      { action: 'open',  title: data.action },
      { action: 'close', title: 'Ignorer' },
    ] : [],
  };

  e.waitUntil(self.registration.showNotification(data.title || '🌿 Mongazon360', options));
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
