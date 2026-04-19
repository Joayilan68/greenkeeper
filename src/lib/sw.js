// public/sw.js
// ═══════════════════════════════════════════════════════════════════════════════
// Service Worker MG360 — Stratégie de cache intelligente pour Vite + Vercel
// ═══════════════════════════════════════════════════════════════════════════════
//
// STRATÉGIE PAR TYPE DE RESSOURCE :
//
//   /api/*              → Network-only    (jamais mis en cache)
//   /assets/*.js|css    → Cache-first     (sûr : Vite hash le nom à chaque build)
//   index.html          → Network-first   (CRITIQUE : garantit les bons hashes de bundle)
//   Reste               → Network-first   (icons, manifest, images)
//
// POURQUOI NETWORK-FIRST POUR INDEX.HTML :
// Vite génère index.html avec <script src="/assets/index-HASH.js">.
// En allant toujours chercher index.html sur le réseau, on obtient les bons hashes.
// Chrome ne peut plus "servir l'ancien bundle" — il n'est plus référencé.
// L'ancien fichier reste en cache mais n'est jamais demandé → éviction automatique.
//
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_NAME = "mg360-v1";

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  // skipWaiting() est LA décision critique :
  // Le nouveau SW s'active IMMÉDIATEMENT sans attendre la fermeture des onglets.
  // Sans ça, l'utilisateur doit fermer et rouvrir Chrome pour voir la mise à jour.
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/"]).catch(() => {
        // Pas bloquant si on est hors-ligne au moment de l'installation
      });
    })
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Prend le contrôle de tous les onglets ouverts immédiatement
      // (sans ça, les onglets existants gardent l'ancien SW)
      self.clients.claim(),

      // Supprime TOUS les anciens caches (mg360-v0, workbox-xxxx, etc.)
      // C'est ce qui nettoie définitivement "index-4Sdt9Jen.js" du cache Chrome
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      ),
    ])
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignorer les requêtes non-GET (POST vers /api, etc.)
  if (request.method !== "GET") return;

  // Ignorer les requêtes cross-origin (Clerk, Supabase, Stripe, Groq…)
  if (!request.url.startsWith(self.location.origin)) return;

  const url = new URL(request.url);

  // ── 1. API MG360 → Network-only ────────────────────────────────────────────
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // ── 2. Assets Vite hashés → Cache-first ────────────────────────────────────
  // /assets/index-CqkwsBvO.js, /assets/index-BXyz.css, etc.
  // Le hash dans le nom garantit l'unicité : si le contenu change, le nom change.
  // → On peut mettre en cache indéfiniment sans risque de servir du contenu périmé.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── 3. Navigation HTML → Network-first (LE POINT CRITIQUE) ─────────────────
  // Toujours aller chercher index.html sur le réseau.
  // Le nouvel index.html contient les balises <script> avec les nouveaux hashes.
  // Chrome demande alors les nouveaux fichiers /assets/index-NOUVEAU_HASH.js
  // → Les anciens bundles ne sont jamais référencés → bug "vieux bundle" résolu.
  if (
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Hors-ligne : fallback sur la version en cache (mode dégradé)
          return caches.match("/") || caches.match(request);
        })
    );
    return;
  }

  // ── 4. Tout le reste (icons, manifest.json, images…) → Network-first ────────
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ── Message de main.jsx → activation immédiate ───────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
