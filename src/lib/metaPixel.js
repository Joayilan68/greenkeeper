// src/lib/metaPixel.js
// ────────────────────────────────────────────────────────────────────────────
// Meta (Facebook) Pixel — Mongazon360
// Chargé UNIQUEMENT après consentement cookies (RGPD/CNIL). Ne jamais coller le
// snippet dans index.html : il se déclencherait avant le consentement.
// ────────────────────────────────────────────────────────────────────────────

export const META_PIXEL_ID = "1079041751278810";

let loaded = false;

// Injecte le code de base Meta puis init + PageView. Idempotent.
export function loadMetaPixel() {
  if (loaded || typeof window === "undefined" || typeof document === "undefined") return;
  loaded = true;
  if (window.fbq) return; // déjà présent
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  try {
    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");
  } catch { /* non bloquant */ }
}

// Déclenche un événement standard Meta (si le pixel est chargé — sinon no-op).
export function pixelTrack(event, params) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", event, params || undefined);
    }
  } catch { /* non bloquant */ }
}
