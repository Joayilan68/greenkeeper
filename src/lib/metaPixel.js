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
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (loaded) { // consentement redonné dans la même session après un retrait
    try { window.fbq?.("consent", "grant"); } catch { /* non bloquant */ }
    return;
  }
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

// Retrait du consentement : stoppe les envois du pixel déjà chargé et efface ses cookies.
export function revokeMetaPixel() {
  try { if (typeof window !== "undefined") window.fbq?.("consent", "revoke"); } catch { /* non bloquant */ }
  try {
    const host = window.location.hostname;
    const domains = ["", host, "." + host, "." + host.split(".").slice(-2).join(".")];
    for (const name of ["_fbp", "_fbc"]) {
      for (const d of domains) {
        document.cookie = `${name}=; Max-Age=0; path=/${d ? "; domain=" + d : ""}`;
      }
    }
  } catch { /* non bloquant */ }
}
