// api/diagnostics.js
// GET /api/diagnostics → historique des diagnostics de l'utilisateur connecté (jeton Clerk obligatoire)

const { createClient } = require("@supabase/supabase-js");
const { verifiedUserId } = require("./auth.cjs");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const userId = await verifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Connexion requise" });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase
      .from("diagnostics")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return res.json(data || []);

  } catch (e) {
    await require("./alerting.cjs").reportServerError("Historique des diagnostics en échec", e, { "Utilisateur": userId });
    return res.status(500).json({ error: e.message });
  }
};
