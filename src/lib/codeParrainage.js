// src/lib/codeParrainage.js
// Code de parrainage ou créateur reçu par lien (https://mongazon360.fr/?p=CODE) : gardé 30 jours sur l'appareil,
// proposé à l'inscription (Register), puis appliqué par le serveur (api/parrainage.cjs).
const CLE = "mg360_code";
const DUREE_MS = 30 * 86400000;

export const normCode = (c) => String(c || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);

// À l'arrivée sur le site : un nouveau lien remplace l'ancien code
export function capturerCode() {
  try {
    const code = normCode(new URLSearchParams(window.location.search).get("p"));
    if (code.length >= 3) localStorage.setItem(CLE, JSON.stringify({ code, at: Date.now() }));
  } catch { /* stockage indisponible : le code peut toujours être saisi */ }
}

export function codeRecu() {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) || "null");
    if (v?.code && Date.now() - v.at < DUREE_MS) return v.code;
  } catch { /* stockage indisponible */ }
  return null;
}

export function oublierCode() {
  try { localStorage.removeItem(CLE); } catch { /* stockage indisponible */ }
}

// Appel serveur (Bearer Clerk) : { action: "mon-code" } ou { action: "utiliser", code }
export async function appelParrainage(getToken, body) {
  const r = await fetch("/api/send?type=parrainage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Service indisponible");
  return d;
}
