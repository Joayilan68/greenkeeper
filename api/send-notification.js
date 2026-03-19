// api/send-notification.js
// Envoie une push notification à un utilisateur

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { subscription, notification } = req.body;
    if (!subscription || !notification) throw new Error("Données manquantes");

    const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail      = process.env.VAPID_EMAIL || "mailto:contact@greenkeeper.fr";

    if (!vapidPublicKey || !vapidPrivateKey) throw new Error("Clés VAPID manquantes");

    // Appel Web Push manuel (sans librairie)
    const payload = JSON.stringify({
      title:       notification.title || "🌿 GreenKeeper",
      body:        notification.body  || "Nouvelle alerte pour votre gazon",
      icon:        "/icon-192.png",
      tag:         notification.tag   || "gk-alert",
      action:      notification.action,
      actionRoute: notification.actionRoute || "/",
      url:         notification.actionRoute || "/",
    });

    // Utilise web-push si disponible
    const webpush = require("web-push");
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    await webpush.sendNotification(subscription, payload);

    res.json({ success: true });
  } catch (e) {
    console.error("Send notification error:", e.message);
    res.status(500).json({ error: e.message });
  }
};
