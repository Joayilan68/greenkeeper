// src/lib/usePilotage.js
// Hook de détection automatique des bugs et envoi d'alertes

import { useEffect, useRef } from "react";

const ALERT_KEY    = "gk_pilotage_alerts";
const COOLDOWN_MS  = 5 * 60 * 1000; // 5 min entre 2 alertes du même type

// ✅ FIX 29/05/2026 — clé pour tracker les tentatives de reload (éviter boucle infinie)
const RELOAD_KEY      = "gk_chunk_reload_attempt";
const RELOAD_MAX_AGE  = 30 * 1000; // 30s : au-delà, on considère que le précédent reload a réussi

function safeGet(key, fallback = []) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

function safeSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// Vérifie si une alerte du même type a déjà été envoyée récemment
function shouldSendAlert(type) {
  const alerts = safeGet(ALERT_KEY, {});
  const last   = alerts[type];
  if (!last) return true;
  return Date.now() - last > COOLDOWN_MS;
}

function markAlertSent(type) {
  const alerts   = safeGet(ALERT_KEY, {});
  alerts[type]   = Date.now();
  safeSet(ALERT_KEY, alerts);
}

// ✅ FIX 29/05/2026 — détecte les erreurs de chunk loading (réseau / cache désynchronisé)
// Ces erreurs ne sont PAS des bugs de notre code : elles viennent de coupures réseau,
// déploiements en cours, bloqueurs de pub, ou caches navigateurs périmés.
// La bonne pratique côté front est de NE PAS alerter et de tenter un reload automatique.
function isChunkLoadError(message, stack) {
  const haystack = `${message || ""} ${stack || ""}`.toLowerCase();
  return (
    haystack.includes("loading chunk") ||
    haystack.includes("loading css chunk") ||
    haystack.includes("failed to fetch dynamically imported module") ||
    haystack.includes("importing a module script failed") ||
    haystack.includes("dynamically imported module") ||
    /chunk\s+\d+\s+failed/i.test(haystack)
  );
}

// ✅ FIX 29/05/2026 — auto-recovery : recharge la page une fois pour récupérer le chunk
// Protection anti-boucle : si un reload a déjà été tenté il y a moins de 30s,
// on n'en relance pas un autre (sinon l'utilisateur serait coincé dans une boucle).
function attemptChunkReload() {
  try {
    const last = parseInt(localStorage.getItem(RELOAD_KEY) || "0", 10);
    const now  = Date.now();

    if (last && (now - last) < RELOAD_MAX_AGE) {
      // Un reload a déjà eu lieu récemment → ne pas en refaire un
      // L'utilisateur verra l'erreur, mais au moins l'app ne tourne pas en rond
      console.warn("[MG360] Chunk reload déjà tenté récemment, abandon");
      return false;
    }

    localStorage.setItem(RELOAD_KEY, String(now));
    console.warn("[MG360] Chunk failed → reload automatique dans 1s");
    setTimeout(() => { window.location.reload(); }, 1000);
    return true;
  } catch {
    return false;
  }
}

// Envoi de l'alerte email + push
async function sendBugAlert(type, message, details = {}, severity = "error") {
  if (!shouldSendAlert(type)) return; // cooldown actif

  try {
    await fetch("/api/send?type=alert", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, message, details, severity })
    });
    markAlertSent(type);

    // Log local pour le dashboard Pilotage
    logAlertLocally({ type, message, details, severity, date: new Date().toISOString() });

  } catch (e) {
    console.warn("Impossible d envoyer l alerte:", e.message);
  }
}

// Sauvegarde l'alerte dans localStorage pour affichage dans le dashboard
function logAlertLocally(alert) {
  const logs = safeGet("gk_pilotage_logs", []);
  logs.unshift(alert);
  safeSet("gk_pilotage_logs", logs.slice(0, 50)); // max 50 entrées
}

// ── Hook principal ──────────────────────────────────────────────────────────
export function usePilotage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ✅ FIX 29/05/2026 — au montage réussi, on nettoie le compteur reload si expiré
    // Si l'app a réussi à monter, c'est que le précédent reload a fonctionné
    try {
      const last = parseInt(localStorage.getItem(RELOAD_KEY) || "0", 10);
      if (last && (Date.now() - last) > RELOAD_MAX_AGE) {
        localStorage.removeItem(RELOAD_KEY);
      }
    } catch {}

    // 1. Intercepte les erreurs JavaScript globales
    const handleError = (event) => {
      const message = event.message || "Erreur JavaScript inconnue";
      const stack   = event.error?.stack || "";

      // ✅ FIX 29/05/2026 — chunk errors : ne PAS alerter, juste reload
      if (isChunkLoadError(message, stack)) {
        attemptChunkReload();
        return;
      }

      const details = {
        "Fichier":     event.filename || "inconnu",
        "Ligne":       event.lineno || "?",
        "Colonne":     event.colno || "?",
        "URL":         window.location.pathname,
        // user-agent complet + plateforme pour identifier iOS/Android/Desktop
        "User-Agent":  navigator.userAgent,
        "Plateforme":  navigator.platform || "inconnue",
        "Langue":      navigator.language || "inconnue",
      };
      sendBugAlert("Erreur JavaScript", message, details, "error");
    };

    // 2. Intercepte les promesses rejetées non gérées
    const handleUnhandledRejection = (event) => {
      const message = event.reason?.message || String(event.reason) || "Promesse rejetée";
      const stack   = event.reason?.stack || "non disponible";

      // ✅ FIX 29/05/2026 — chunk errors : ne PAS alerter, juste reload
      // C'est ici que tomberait l'erreur "Loading chunk 344 failed" du 29/05
      if (isChunkLoadError(message, stack)) {
        attemptChunkReload();
        return;
      }

      const details = {
        "Type":        "Promise rejection",
        "URL":         window.location.pathname,
        "Raison":      message.substring(0, 200),
        "Stack":       stack.substring(0, 500),
        "User-Agent":  navigator.userAgent,
        "Plateforme":  navigator.platform || "inconnue",
      };
      sendBugAlert("Promesse rejetée", message, details, "error");
    };

    window.addEventListener("error",              handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error",              handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Fonction manuelle pour signaler un bug depuis n'importe quel composant
  const reportBug = (type, message, details = {}, severity = "error") => {
    sendBugAlert(type, message, details, severity);
  };

  // Fonction pour signaler une erreur API
  const reportAPIError = (apiName, errorMessage, details = {}) => {
    sendBugAlert(
      `Erreur API — ${apiName}`,
      `L'API ${apiName} a retourné une erreur : ${errorMessage}`,
      { "API": apiName, "Erreur": errorMessage, ...details },
      "error"
    );
  };

  // Fonction pour signaler un diagnostic échoué
  const reportDiagnosticError = (errorMessage) => {
    sendBugAlert(
      "Diagnostic photo échoué",
      `Le diagnostic IA a échoué : ${errorMessage}`,
      { "Service": "Groq Vision / Cloudinary", "Erreur": errorMessage },
      "error"
    );
  };

  // Fonction pour signaler un paiement échoué
  const reportPaymentError = (errorMessage) => {
    sendBugAlert(
      "Paiement échoué",
      `Un paiement Stripe a échoué : ${errorMessage}`,
      { "Service": "Stripe", "Erreur": errorMessage },
      "error"
    );
  };

  return { reportBug, reportAPIError, reportDiagnosticError, reportPaymentError };
}

// Export des fonctions utilitaires pour les composants qui n'utilisent pas le hook
export { sendBugAlert, logAlertLocally };
