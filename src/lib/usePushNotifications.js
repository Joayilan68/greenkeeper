// src/lib/usePushNotifications.js
// ─────────────────────────────────────────────────────────────────────────────
// Guards défensifs sur TOUTES les APIs non universelles :
//   - Notification       → absent sur Safari iOS, tous les WebViews in-app
//   - PushManager        → absent sur Safari < 16.4, tous les WebViews
//   - ServiceWorker      → absent sur certains WebViews et navigateurs anciens
//   - localStorage       → vide en Safari navigation privée (ne crash pas mais vide)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";

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

// ── Lecture sécurisée du localStorage ────────────────────────────────────────
const safeLocalStorage = {
  get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, val); } catch {} },
};

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

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  // ── Enregistrement SW au montage — uniquement si supporté ────────────────────
  useEffect(() => {
    if (!isSWSupported() || !isPushSupported()) return;

    navigator.serviceWorker.register("/sw.js")
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (sub) setSubscription(sub); })
      .catch(err => console.warn("[MG360] SW init:", err.message));
  }, []);

  // ── Demander permission + s'abonner ──────────────────────────────────────────
  const subscribe = async () => {
    if (!isNotificationSupported()) {
      setError("Notifications non supportées sur ce navigateur ou appareil");
      return false;
    }
    if (!isPushSupported()) {
      setError("Push notifications non supportées sur ce navigateur");
      return false;
    }
    if (!VAPID_PUBLIC_KEY) {
      setError("Configuration manquante");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("Permission refusée");
        setLoading(false);
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:   true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      setSubscription(sub);
      safeLocalStorage.set("gk_push_sub", JSON.stringify(sub));

      // Sauvegarder dans Supabase via API (non bloquant)
      try {
        await fetch("/api/send?type=save-sub", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ subscription: sub, userId }),
        });
      } catch {} // Echec silencieux — localStorage suffit

      setLoading(false);
      return true;
    } catch (e) {
      setError(e.message);
      setLoading(false);
      return false;
    }
  };

  // ── Notification de test ──────────────────────────────────────────────────────
  const sendTestNotification = async () => {
    if (!subscription) return;
    try {
      await fetch("/api/send?type=notification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          subscription,
          notification: {
            title: "🌿 Mongazon360",
            body:  "Vos notifications sont activées !",
            actionRoute: "/",
            tag:   "test",
          },
        }),
      });
    } catch (e) {
      console.warn("[MG360] Test notif:", e.message);
    }
  };

  // ── Alerte basée sur les rappels ──────────────────────────────────────────────
  const sendAlert = async (notif) => {
    const subRaw = subscription
      ? JSON.stringify(subscription)
      : safeLocalStorage.get("gk_push_sub");
    const sub = subRaw ? JSON.parse(subRaw) : null;
    if (!sub) return;

    // Max 1 fois par semaine par type
    const lastKey  = `gk_notif_last_${notif.id}`;
    const last     = safeLocalStorage.get(lastKey);
    if (last) {
      const daysSince = (Date.now() - parseInt(last)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    try {
      await fetch("/api/send?type=notification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          subscription: sub,
          notification: {
            title:       `🌿 Mongazon360 — ${notif.title}`,
            body:        notif.message,
            actionRoute: notif.actionRoute,
            action:      notif.action,
            tag:         notif.id,
          },
        }),
      });
      safeLocalStorage.set(lastKey, Date.now().toString());
    } catch (e) {
      console.warn("[MG360] sendAlert:", e.message);
    }
  };

  return {
    permission,
    subscription,
    loading,
    error,
    isSupported: isNotificationSupported() && isPushSupported(),
    subscribe,
    sendTestNotification,
    sendAlert,
  };
}
