// src/lib/cookieConsent.js
// ────────────────────────────────────────────────────────────────────────────
// Consentement cookies de mesure (Meta Pixel) — RGPD/CNIL.
// "granted" = accepté · "denied" = refusé · null = pas encore choisi (→ bandeau).
// Le choix (acceptation OU refus) est conservé 6 mois, puis redemandé (recommandation CNIL).
// ────────────────────────────────────────────────────────────────────────────

const KEY = "mg360_cookie_consent";
const MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000; // ~6 mois
export const CONSENT_EVENT = "mg360-cookie-consent";

function write(value, ts) {
  try { localStorage.setItem(KEY, JSON.stringify({ value, ts })); } catch { /* non bloquant */ }
}

export function getCookieConsent() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    // Ancien format (valeur brute, avant horodatage) → horodaté à partir d'aujourd'hui
    if (raw === "granted" || raw === "denied") { write(raw, Date.now()); return raw; }
    const { value, ts } = JSON.parse(raw);
    if (!ts || Date.now() - ts > MAX_AGE_MS) { localStorage.removeItem(KEY); return null; }
    return value === "granted" || value === "denied" ? value : null;
  } catch { return null; }
}

export function setCookieConsent(value) {
  write(value, Date.now());
  try { window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value })); } catch {}
}
