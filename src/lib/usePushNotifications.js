// src/lib/usePushNotifications.js
// Hook pour gérer les push notifications PWA

import { useState, useEffect } from "react";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId) {
  const [permission, setPermission] = useState(Notification.permission);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Enregistrer le service worker au montage
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SW enregistré:', reg.scope);
        return reg.pushManager.getSubscription();
      })
      .then(sub => {
        if (sub) setSubscription(sub);
      })
      .catch(err => console.error('SW erreur:', err));
  }, []);

  // Demander permission + s'abonner
  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError("Push notifications non supportées sur ce navigateur");
      return false;
    }
    if (!VAPID_PUBLIC_KEY) {
      setError("Clé VAPID manquante");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Demander permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError("Permission refusée");
        setLoading(false);
        return false;
      }

      // S'abonner
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      setSubscription(sub);

      // Sauvegarder côté serveur
      await fetch('/api/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, userId }),
      });

      // Sauvegarder localement
      localStorage.setItem('gk_push_sub', JSON.stringify(sub));
      setLoading(false);
      return true;
    } catch (e) {
      setError(e.message);
      setLoading(false);
      return false;
    }
  };

  // Envoyer une notification de test
  const sendTestNotification = async () => {
    if (!subscription) return;
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        notification: {
          title: "🌿 GreenKeeper",
          body: "Vos notifications sont activées !",
          actionRoute: "/",
          tag: "test",
        }
      }),
    });
  };

  // Envoyer une alerte basée sur les notifications générées
  const sendAlert = async (notif) => {
    const sub = subscription || JSON.parse(localStorage.getItem('gk_push_sub') || 'null');
    if (!sub) return;

    // Vérifier fréquence (max 1 fois par semaine par type)
    const lastKey = `gk_notif_last_${notif.id}`;
    const last = localStorage.getItem(lastKey);
    if (last) {
      const daysSince = (Date.now() - parseInt(last)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return; // Max 1 fois par semaine
    }

    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub,
        notification: {
          title: `🌿 GreenKeeper — ${notif.title}`,
          body: notif.message,
          actionRoute: notif.actionRoute,
          action: notif.action,
          tag: notif.id,
        }
      }),
    });

    // Mémoriser l'envoi
    localStorage.setItem(lastKey, Date.now().toString());
  };

  return {
    permission,
    subscription,
    loading,
    error,
    isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
    subscribe,
    sendTestNotification,
    sendAlert,
  };
}
