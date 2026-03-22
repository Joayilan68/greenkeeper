// src/lib/usePilotage.js
// Hook de détection automatique des bugs et envoi d'alertes

import { useEffect, useRef } from "react";

const ALERT_KEY    = "gk_pilotage_alerts";
const COOLDOWN_MS  = 5 * 60 * 1000; // 5 min entre 2 alertes du même type

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

// Envoi de l'alerte email + push
async function sendBugAlert(type, message, details = {}, severity = "error") {
  if (!shouldSendAlert(type)) return; // cooldown actif

  try {
    await fetch("/api/send-alert", {
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

    // 1. Intercepte les erreurs JavaScript globales
    const handleError = (event) => {
      const message = event.message || "Erreur JavaScript inconnue";
      const details = {
        "Fichier":  event.filename || "inconnu",
        "Ligne":    event.lineno || "?",
        "Colonne":  event.colno || "?",
        "URL":      window.location.pathname,
        "Navigateur": navigator.userAgent.split(" ").pop(),
      };
      sendBugAlert("Erreur JavaScript", message, details, "error");
    };

    // 2. Intercepte les promesses rejetées non gérées
    const handleUnhandledRejection = (event) => {
      const message = event.reason?.message || String(event.reason) || "Promesse rejetée";
      const details = {
        "Type":   "Promise rejection",
        "URL":    window.location.pathname,
        "Raison": message.substring(0, 200),
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
