// ─── SERVICE WORKER — Mongazon360 ────────────────────────────────────────────
const CACHE_NAME = 'mg360-v3'; // ← incrémenté pour forcer le remplacement

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', () => {
  // skipWaiting() est OBLIGATOIRE :
  // Sans lui, l'ancien SW (qui cachait l'ancien bundle) reste actif indéfiniment.
  // L'utilisateur doit fermer TOUS ses onglets pour que le nouveau SW prenne effet.
  // Avec skipWaiting(), le nouveau SW s'active immédiatement après l'installation.
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      // clients.claim() est OBLIGATOIRE :
      // Prend le contrôle de tous les onglets ouverts immédiatement.
      // Sans lui, les onglets existants continuent avec l'ancien SW.
      self.clients.claim(),

      // Supprime tous les anciens caches (dont celui qui contenait l'ancien bundle)
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
    ])
  );
});

// ── Fetch — network-first pour HTML, cache-first pour assets hashés ───────────
// OBLIGATOIRE : sans fetch handler, l'ancien SW interceptait les requêtes.
// Maintenant c'est ce SW qui contrôle — avec la bonne stratégie.
self.addEventListener('fetch', (e) => {
  const { request } = e;

  // Ignorer les non-GET et le cross-origin (Clerk, Supabase, Stripe…)
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  const url = new URL(request.url);

  // API : network-only, jamais de cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(request));
    return;
  }

  // Assets Vite hashés (/assets/index-HASH.js) : cache-first
  // Sûr : si le contenu change, Vite change le nom du fichier
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // index.html et navigation : network-first TOUJOURS
  // Règle critique — on va chercher le HTML frais sur Vercel
  // pour obtenir les bons hashes de bundle.
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match('/') || caches.match(request))
    );
    return;
  }

  // Reste (icons, manifest…) : network-first avec fallback cache
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});

// ── Message depuis main.jsx → activation immédiate ───────────────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
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
