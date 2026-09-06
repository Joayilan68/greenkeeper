// src/lib/cookieConsent.js
// ────────────────────────────────────────────────────────────────────────────
// Consentement cookies de mesure (Meta Pixel) — RGPD/CNIL.
// "granted" = accepté · "denied" = refusé · null = pas encore choisi (→ bandeau).
// ────────────────────────────────────────────────────────────────────────────

const KEY = "mg360_cookie_consent";
export const CONSENT_EVENT = "mg360-cookie-consent";

export function getCookieConsent() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setCookieConsent(value) {
  try { localStorage.setItem(KEY, value); } catch { /* non bloquant */ }
  try { window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value })); } catch {}
}
