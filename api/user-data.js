// api/user-data.js
// RGPD — Export (Art. 20) + Suppression (Art. 17) des données utilisateur
// GET  → export toutes les données Supabase
// DELETE → supprime toutes les données Supabase

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Vérification token Clerk ──────────────────────────────────────────────────
async function verifyClerkToken(token) {
  const res = await fetch("https://api.clerk.com/v1/tokens/verify", {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Token invalide");
  const data = await res.json();
  const userId = data.sub || data.user_id;
  if (!userId) throw new Error("user_id introuvable");
  return userId;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── Authentification ───────────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }

  let userId;
  try {
    userId = await verifyClerkToken(authHeader.replace("Bearer ", ""));
  } catch (e) {
    return res.status(401).json({ error: "Authentification échouée : " + e.message });
  }

  // ── GET — Export RGPD Art. 20 ─────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const [profileRes, historyRes, greenRes, streakRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("histories").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("greenpoints").select("*").eq("user_id", userId).single(),
        supabase.from("streaks").select("*").eq("user_id", userId).single(),
      ]);

      return res.status(200).json({
        export_date:  new Date().toISOString(),
        droits_rgpd:  "Données exportées conformément au RGPD — Article 20 (droit à la portabilité)",
        responsable:  "Mongazon360 — contact@mongazon360.fr",
        user_id:      userId,
        profil:       profileRes.data?.data || null,
        historique:   historyRes.data || [],
        greenpoints: {
          total:       greenRes.data?.total || 0,
          historique:  greenRes.data?.historique || [],
          recompenses: greenRes.data?.recompenses || [],
        },
        streak: {
          actuel:             streakRes.data?.actuel || 0,
          record:             streakRes.data?.record || 0,
          derniere_connexion: streakRes.data?.derniere_connexion || null,
        },
      });
    } catch (e) {
      console.error("user-data GET:", e.message);
      return res.status(500).json({ error: "Erreur export : " + e.message });
    }
  }

  // ── DELETE — Suppression RGPD Art. 17 ────────────────────────────────────
  if (req.method === "DELETE") {
    try {
      const results = await Promise.allSettled([
        supabase.from("profiles").delete().eq("user_id", userId),
        supabase.from("histories").delete().eq("user_id", userId),
        supabase.from("greenpoints").delete().eq("user_id", userId),
        supabase.from("streaks").delete().eq("user_id", userId),
      ]);

      const errors = results
        .filter(r => r.status === "rejected" || r.value?.error)
        .map(r => r.reason?.message || r.value?.error?.message);

      return res.status(200).json({
        success: true,
        message: "Données Supabase supprimées",
        tables:  ["profiles", "histories", "greenpoints", "streaks"],
        errors:  errors.length > 0 ? errors : null,
      });
    } catch (e) {
      console.error("user-data DELETE:", e.message);
      return res.status(500).json({ error: "Erreur suppression : " + e.message });
    }
  }

  return res.status(405).json({ error: "Méthode non autorisée" });
};
