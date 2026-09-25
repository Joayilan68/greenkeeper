// src/lib/usePushNotifications.js
// ─────────────────────────────────────────────────────────────────────────────
// Guards défensifs sur TOUTES les APIs non universelles :
//   - Notification       → absent sur Safari iOS, tous les WebViews in-app
//   - PushManager        → absent sur Safari < 16.4, tous les WebViews
//   - ServiceWorker      → absent sur certains WebViews et navigateurs anciens
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { sendBugAlert } from "./usePilotage";
import { isIOS, isStandalone } from "./platform";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// ── Détection des capacités — jamais d'accès direct sans vérification ─────────
const isNotificationSupported = () => {
  try { return typeof window !== "undefined" && "Notification" in window; }
  catch { return false; }
};

const isPushSupported = () => {
  try { return "serviceWorker" in navigator && "PushManager" in window; }
  catch { return false; }
};

const isSWSupported = () => {
  try { return "serviceWorker" in navigator; }
  catch { return false; }
};

// Enregistre l'abonnement côté serveur — l'utilisateur est identifié par son jeton Clerk
async function saveSubscription(sub) {
  const token = await window.Clerk?.session?.getToken();
  if (!token) throw new Error("session absente");
  const res = await fetch("/api/send?type=save-sub", {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!res.ok) throw new Error(`save-sub HTTP ${res.status}`);
}

// Échec d'activation → Pilotage → Bugs (sévérité info : mesure, sans email)
function reportActivationFailure(reason, detail) {
  sendBugAlert("Notifications — activation impossible", `${reason}${detail ? ` : ${detail}` : ""}`, {}, "info");
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output  = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

export function usePushNotifications(userId) {
  // ── Permission : lecture sécurisée — Notification peut être undefined ────────
  const [permission, setPermission] = useState(() => {
    if (!isNotificationSupported()) return "denied"; // unsupported = traité comme refusé
    try { return Notification.permission; }
    catch { return "denied"; }
  });

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  // ── Enregistrement SW + RAFRAÎCHISSEMENT de l'abonnement au montage ──────────
  // Anti-péremption : si la permission est accordée, on ré-enregistre l'abonnement
  // en base À CHAQUE OUVERTURE. Ainsi l'endpoint reste toujours frais (les endpoints
  // FCM expirent après quelques semaines → sinon l'utilisateur cesse de recevoir
  // ses notifications sans le savoir). Si l'abonnement a disparu mais la permission
  // reste accordée, on en recrée un automatiquement.
  useEffect(() => {
    if (!isSWSupported() || !isPushSupported()) return;
    let cancelled = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        let sub = await reg.pushManager.getSubscription();

        // Permission accordée mais plus d'abonnement → on le recrée
        if (!sub && isNotificationSupported() && Notification.permission === "granted" && VAPID_PUBLIC_KEY) {
          try {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly:      true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
          } catch { /* recréation impossible — on ne bloque pas */ }
        }

        if (cancelled || !sub) return;

        // Ré-enregistrement en base (upsert) → updated_at + endpoint rafraîchis
        if (userId && isNotificationSupported() && Notification.permission === "granted") {
          try { await saveSubscription(sub); } catch { /* réseau indisponible — non bloquant */ }
        }
      } catch (err) {
        console.warn("[MG360] SW init/refresh:", err.message);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  // ── Demander permission + s'abonner ──────────────────────────────────────────
  // Renvoie true si l'abonnement est actif ET enregistré côté serveur ; sinon false
  // et `error` contient un message affichable. À appeler depuis un clic (geste utilisateur).
  const subscribe = async () => {
    const fail = (message, reason, detail) => {
      setError(message);
      setLoading(false);
      reportActivationFailure(reason, detail);
      return false;
    };
    if (isIOS() && !isStandalone()) {
      // Sur iPhone, les notifications web n'existent que pour l'app ajoutée à l'écran d'accueil
      setError("Sur iPhone, installe d'abord l'app : bouton Partager ⬆️ puis « Sur l'écran d'accueil ». Ouvre-la ensuite depuis l'icône pour activer les notifications.");
      return false;
    }
    if (!isNotificationSupported() || !isPushSupported()) {
      return fail("Les notifications ne sont pas disponibles sur cet appareil ou ce navigateur.", "non supporté", navigator.userAgent);
    }
    if (!VAPID_PUBLIC_KEY) return fail("Configuration manquante.", "clé VAPID absente");

    setLoading(true);
    setError(null);
    try {
      let perm = Notification.permission;
      if (perm !== "granted") {
        perm = await Notification.requestPermission();
        setPermission(perm);
      }
      if (perm !== "granted") {
        return fail(
          "Les notifications sont bloquées. Autorise-les dans les réglages de ton téléphone (Paramètres → Applications → Mongazon360 → Notifications) ou de ton navigateur, puis réessaie.",
          perm === "denied" ? "autorisation refusée" : "autorisation non accordée", navigator.userAgent);
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      await saveSubscription(sub);
      setLoading(false);
      return true;
    } catch (e) {
      return fail("L'activation a échoué. Réessaie dans quelques instants.", "erreur technique", e?.message);
    }
  };

  // ── Notification de test (envoyée par le serveur sur l'abonnement de l'utilisateur) ──
  const sendTestNotification = async () => {
    try {
      const token = await window.Clerk?.session?.getToken();
      if (!token) return;
      await fetch("/api/send?type=notification-test", {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.warn("[MG360] Test notif:", e.message);
    }
  };

  return {
    permission,
    loading,
    error,
    isSupported: isNotificationSupported() && isPushSupported(),
    subscribe,
    sendTestNotification,
  };
}
