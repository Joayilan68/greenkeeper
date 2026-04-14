// ─── SERVICE WORKER — Mongazon360 Push Notifications ─────────────────────────
const CACHE_NAME = 'mg360-v2';

self.addEventListener('install', () => {
  // skipWaiting supprimé intentionnellement — laisse la page en cours terminer
});

self.addEventListener('activate', (e) => {
  // Nettoyer les anciens caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
    // clients.claim() supprimé intentionnellement — évite d'interrompre le render React
  );
});

// ── Pas de listener fetch — l'app est une SPA ────────────────────────────────
// Le cache navigateur et Vercel CDN gèrent la mise en cache statique.
// Un listener fetch vide cause un warning "no-op" dans Chrome — on le supprime.

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
      { action: 'close', title: 'Ignorer' }
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
