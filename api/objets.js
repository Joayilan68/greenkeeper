// api/objets.js
// Équipements connectés de l'utilisateur connecté (écran « Mes équipements ») :
//   GET                                       → équipements (sans les clés) et mesures de la station
//   POST { action: "stations", applicationKey, apiKey }        → stations du compte Ecowitt
//   POST { action: "ajouter", applicationKey, apiKey, mac, nom } → connexion de la station (clés chiffrées)
//   POST { action: "retirer", id }            → déconnexion (clés effacées)

const { createClient } = require("@supabase/supabase-js");
const { verifiedUserId } = require("./auth.cjs");
const { chiffrer, stationsEcowitt, mesuresEcowitt, mesuresStation } = require("./equipements.cjs");

const COLONNES = "id, type, marque, nom, statut, erreur, mesures, mesures_at, created_at";

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).end();
  const userId = await verifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Connexion requise" });
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    if (req.method === "GET") {
      const station = await mesuresStation(supabase, userId); // relit la station si besoin
      const { data, error } = await supabase.from("equipements").select(COLONNES).eq("user_id", userId);
      if (error) throw error;
      return res.json({ equipements: data || [], station });
    }

    const { action, applicationKey, apiKey, mac, nom, id } = req.body || {};
    const cles = { applicationKey: String(applicationKey || "").trim(), apiKey: String(apiKey || "").trim() };

    if (action === "stations") {
      if (!cles.applicationKey || !cles.apiKey) return res.status(400).json({ error: "Application Key et API Key requises" });
      try {
        return res.json({ stations: await stationsEcowitt(cles) });
      } catch (e) { return res.status(400).json({ error: e.message }); }
    }

    if (action === "ajouter") {
      if (!cles.applicationKey || !cles.apiKey || !mac) return res.status(400).json({ error: "Clés et station requises" });
      let mesures;
      try {
        mesures = await mesuresEcowitt({ ...cles, mac }); // vérifie l'accès avant d'enregistrer
      } catch (e) { return res.status(400).json({ error: e.message }); }
      const { data, error } = await supabase.from("equipements").upsert({
        user_id: userId, type: "station", marque: "ecowitt", appareil: String(mac), nom: String(nom || "Ma station").slice(0, 60),
        secret: chiffrer(cles), statut: "connecte", erreur: null, mesures, mesures_at: new Date().toISOString(),
      }, { onConflict: "user_id,type" }).select(COLONNES).single();
      if (error) throw error;
      return res.json({ equipement: data });
    }

    if (action === "retirer") {
      const { error } = await supabase.from("equipements").delete().eq("user_id", userId).eq("id", id);
      if (error) throw error;
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: "Action inconnue" });
  } catch (e) {
    await require("./alerting.cjs").reportServerError("Équipements connectés en échec", e, { "Utilisateur": userId });
    return res.status(500).json({ error: "Erreur serveur, réessaie plus tard" });
  }
};
