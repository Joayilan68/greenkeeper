// src/lib/anonId.js
// Identité « invité » pour le diagnostic sans inscription. UUID stocké en local,
// sert de clé anti-abus côté serveur et de lien pour rattacher le diagnostic au
// compte à l'inscription.

const KEY     = "mg360_anon_id";
const PENDING = "mg360_anon_pending"; // "1" = un diagnostic anonyme attend d'être rattaché

export function getAnonId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function getAnonIdIfAny() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setAnonPending(v) {
  try { v ? localStorage.setItem(PENDING, "1") : localStorage.removeItem(PENDING); } catch { /* noop */ }
}

export function isAnonPending() {
  try { return localStorage.getItem(PENDING) === "1"; } catch { return false; }
}
