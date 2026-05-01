// api/diagnostics.js
// GET /api/diagnostics?userId=xxx → historique des diagnostics d'un utilisateur

const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId manquant" });

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
    console.error("diagnostics:", e.message);
    return res.status(500).json({ error: e.message });
  }
};
