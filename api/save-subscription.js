// api/save-subscription.js
// Sauvegarde l'abonnement push d'un utilisateur

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { subscription, userId } = req.body;
    if (!subscription || !userId) throw new Error("Données manquantes");

    // Pour l'instant on log — à connecter à une DB plus tard
    // En production: sauvegarder dans Vercel KV, Supabase, ou autre DB
    console.log("Subscription saved for user:", userId, JSON.stringify(subscription));

    res.json({ success: true, message: "Abonnement enregistré" });
  } catch (e) {
    console.error("Save subscription error:", e.message);
    res.status(500).json({ error: e.message });
  }
};
