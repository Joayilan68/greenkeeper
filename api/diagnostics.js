// api/diagnostics.js
// GET  /api/diagnostics → historique des diagnostics de l'utilisateur connecté (jeton Clerk obligatoire)
// POST /api/diagnostics { id, actions, date } → travaux faits après ce diagnostic, indiqués sur la page Diagnostic
//      (diagnostic de suivi, src/lib/suiviDiagnostic.js) ; actions vides = travaux effacés

const { createClient } = require("@supabase/supabase-js");
const { verifiedUserId } = require("./auth.cjs");
const SUIVI = require("../src/lib/suiviDiagnostic.json");

const JOUR = 86400000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const midiDu = (jour) => Date.parse(`${jour}T12:00:00Z`);
const jourParis = (iso) => new Date(iso).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

// Travaux à enregistrer : actions connues (ordre de suiviDiagnostic.json), date « AAAA-MM-JJ » entre le jour du
// diagnostic et avantJours après, pas dans le futur (à un jour près : fuseau de l'appareil) ; null = effacer
function travauxValides(body, diagnostic) {
  const demandees = Array.isArray(body.actions) ? body.actions : [];
  const actions = SUIVI.actions.map(a => a.id).filter(id => demandees.includes(id));
  if (actions.length !== new Set(demandees).size) return { erreur: "Travaux inconnus" };
  if (!actions.length) return { travaux: null };
  const t = /^\d{4}-\d{2}-\d{2}$/.test(body.date || "") ? midiDu(body.date) : NaN;
  const debut = midiDu(jourParis(diagnostic.created_at));
  if (isNaN(t) || t < debut - JOUR || t > debut + SUIVI.avantJours * JOUR || t > Date.now() + JOUR) {
    return { erreur: "Date des travaux invalide" };
  }
  return { travaux: { actions, date: body.date } };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const userId = await verifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Connexion requise" });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    if (req.method === "POST") {
      const body = req.body || {};
      if (!UUID.test(String(body.id || ""))) return res.status(404).json({ error: "Diagnostic introuvable" });
      const { data: diagnostic, error: erreurLecture } = await supabase
        .from("diagnostics")
        .select("id, created_at")
        .eq("id", body.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (erreurLecture) throw new Error(erreurLecture.message);
      if (!diagnostic) return res.status(404).json({ error: "Diagnostic introuvable" });

      const { travaux, erreur } = travauxValides(body, diagnostic);
      if (erreur) return res.status(400).json({ error: erreur });

      const { data: row, error } = await supabase
        .from("diagnostics")
        .update({ travaux })
        .eq("id", diagnostic.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return res.json(row);
    }

    const { data, error } = await supabase
      .from("diagnostics")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return res.json(data || []);

  } catch (e) {
    const kind = req.method === "POST" ? "Travaux du diagnostic de suivi non enregistrés" : "Historique des diagnostics en échec";
    await require("./alerting.cjs").reportServerError(kind, e, { "Utilisateur": userId });
    return res.status(500).json({ error: e.message });
  }
};
