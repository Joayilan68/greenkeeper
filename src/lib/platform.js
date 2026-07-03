// ════════════════════════════════════════════════════════════════════════════
// PLATFORM — Détection du contexte d'exécution
// ════════════════════════════════════════════════════════════════════════════
// Sert notamment à savoir si l'app tourne à l'intérieur du TWA Android
// (application installée depuis le Google Play Store).
//
// Contexte : les règles Google Play imposent que les achats de biens numériques
// consommés DANS l'app Android passent par Google Play Billing. Tant que ce
// n'est pas intégré, on NE propose PAS l'achat Stripe à l'intérieur du TWA.
// L'abonnement reste disponible sur le web (navigateur classique).
// ════════════════════════════════════════════════════════════════════════════

/**
 * Détecte si l'application s'exécute dans le TWA Android (packagée pour le
 * Google Play Store), par opposition à un navigateur web classique.
 *
 * Deux signaux combinés :
 *  1. document.referrer commence par "android-app://" — c'est la signature
 *     laissée par un TWA lançant le contenu web.
 *  2. Mode "standalone" (app installée / plein écran) + user-agent Android,
 *     comme filet de sécurité.
 *
 * @returns {boolean} true si on est dans le TWA Android
 */
export function isAndroidTWA() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  // Signal principal : le TWA laisse "android-app://<package>" dans le referrer.
  const ref = document.referrer || "";
  const isTWAReferrer = ref.startsWith("android-app://");

  // Filet de sécurité : app installée (standalone) sur Android.
  let isStandalone = false;
  try {
    isStandalone =
      window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    isStandalone = false;
  }
  const isAndroidUA = /Android/i.test(navigator.userAgent || "");

  return isTWAReferrer || (isStandalone && isAndroidUA);
}
