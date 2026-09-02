// src/lib/inapp.js
// Détection des navigateurs "in-app" (WebViews Instagram, Facebook, TikTok…).
// Ces navigateurs internes limitent l'authentification (Clerk) et le PWA.
// → On laisse la landing s'afficher normalement dedans (pour vendre la valeur),
//   et on ne redirige vers un vrai navigateur QU'À l'étape de création de compte.
export function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|LinkedInApp|TikTok|Twitter|Line\/|MicroMessenger|WhatsApp|Snapchat|Pinterest/i.test(ua);
}
