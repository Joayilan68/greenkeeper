// api/objets.js
// Équipements connectés de l'utilisateur connecté (écran « Mes équipements », robot dans « Aujourd'hui ») :
//   GET                                       → équipements (sans les clés), mesures de la station, état du robot
//   GET ?code=…&state=…                       → retour de la connexion Husqvarna (adresse de retour déclarée chez Husqvarna)
//   POST { action: "stations", applicationKey, apiKey }        → stations du compte Ecowitt
//   POST { action: "ajouter", applicationKey, apiKey, mac, nom } → connexion de la station (clés chiffrées)
//   POST { action: "husqvarna" }              → adresse de connexion au compte Husqvarna
//   POST { action: "robot", commande }        → commande validée par l'utilisateur (repos_journee, repos_long, reprendre)
//   POST { action: "gardena" }                → adresse de connexion au compte Husqvarna Group pour l'arrosage Gardena
//   POST { action: "rachio_programmateurs", apiKey } → programmateurs du compte Rachio
//   POST { action: "rachio", apiKey, programmateur }  → connexion du programmateur Rachio (clé chiffrée)
//   POST { action: "arrosage", commande, zone, minutes } → commande validée (arroser, suspendre, veille, reprendre)
//   POST { action: "retirer", id }            → déconnexion (clés effacées)

const { createClient } = require("@supabase/supabase-js");
const { verifiedUserId } = require("./auth.cjs");
const E = require("./equipements.cjs");

const COLONNES = "id, type, marque, nom, statut, erreur, mesures, mesures_at, created_at";
const retourHusqvarna = (req) => `https://${req.headers["x-forwarded-host"] || req.headers.host}/api/objets`;

// Retour de Husqvarna : jetons obtenus, robot (ou jardin Gardena) enregistré, puis retour à « Mes équipements »
async function connexionHusqvarna(req, res, supabase) {
  const etat = E.verifierEtat(req.query.state);
  const fin = (resultat) => res.redirect(302, `/equipements?${etat?.objet === "gardena" ? "gardena" : "husqvarna"}=${resultat}`);
  if (!etat) return fin("expire");
  const { userId } = etat;
  try {
    const jetons = await E.jetonsHusqvarna({ grant_type: "authorization_code", code: String(req.query.code), redirect_uri: retourHusqvarna(req) });
    if (etat.objet === "gardena") {
      const jardins = (await E.jardinsGardena(jetons.access)).filter(j => j.zones.length);
      if (!jardins.length) return fin("aucun");
      const j = jardins[0]; // un arrosage par compte dans l'app pour l'instant
      const { error } = await supabase.from("equipements").upsert({
        user_id: userId, type: "arrosage", marque: "gardena", appareil: j.id, nom: j.nom.slice(0, 60),
        secret: E.chiffrer(jetons), statut: "connecte", erreur: null, mesures: { ...j, suspendu: null }, mesures_at: new Date().toISOString(),
      }, { onConflict: "user_id,type" });
      if (error) throw error;
      return fin("ok");
    }
    const robots = await E.robotsHusqvarna(jetons.access);
    if (!robots.length) return fin("aucun");
    const robot = robots[0]; // un robot par compte dans l'app pour l'instant
    const { error } = await supabase.from("equipements").upsert({
      user_id: userId, type: "robot", marque: "husqvarna", appareil: robot.id, nom: robot.nom.slice(0, 60),
      secret: E.chiffrer(jetons), statut: "connecte", erreur: null, mesures: robot, mesures_at: new Date().toISOString(),
    }, { onConflict: "user_id,type" });
    if (error) throw error;
    return fin("ok");
  } catch (e) {
    await require("./alerting.cjs").reportServerError(`Connexion ${etat.objet === "gardena" ? "Gardena" : "Husqvarna"} en échec`, e, { "Utilisateur": userId });
    return fin("erreur");
  }
}

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).end();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  if (req.method === "GET" && req.query.code && req.query.state) return connexionHusqvarna(req, res, supabase);

  const userId = await verifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Connexion requise" });

  try {
    if (req.method === "GET") {
      const [station, robot, arrosage] = await Promise.all([ // relus si besoin
        E.mesuresStation(supabase, userId), E.etatRobot(supabase, userId), E.etatArrosage(supabase, userId)]);
      const { data, error } = await supabase.from("equipements").select(COLONNES).eq("user_id", userId);
      if (error) throw error;
      return res.json({ equipements: data || [], station, robot, arrosage });
    }

    const { action, applicationKey, apiKey, mac, nom, id, commande, programmateur, zone, minutes } = req.body || {};
    const cles = { applicationKey: String(applicationKey || "").trim(), apiKey: String(apiKey || "").trim() };

    if (action === "stations") {
      if (!cles.applicationKey || !cles.apiKey) return res.status(400).json({ error: "Application Key et API Key requises" });
      try {
        return res.json({ stations: await E.stationsEcowitt(cles) });
      } catch (e) { return res.status(400).json({ error: e.message }); }
    }

    if (action === "ajouter") {
      if (!cles.applicationKey || !cles.apiKey || !mac) return res.status(400).json({ error: "Clés et station requises" });
      let mesures;
      try {
        mesures = await E.mesuresEcowitt({ ...cles, mac }); // vérifie l'accès avant d'enregistrer
      } catch (e) { return res.status(400).json({ error: e.message }); }
      const { data, error } = await supabase.from("equipements").upsert({
        user_id: userId, type: "station", marque: "ecowitt", appareil: String(mac), nom: String(nom || "Ma station").slice(0, 60),
        secret: E.chiffrer(cles), statut: "connecte", erreur: null, mesures, mesures_at: new Date().toISOString(),
      }, { onConflict: "user_id,type" }).select(COLONNES).single();
      if (error) throw error;
      return res.json({ equipement: data });
    }

    if (action === "husqvarna" || action === "gardena") {
      if (!process.env.HUSQVARNA_CLIENT_ID) return res.status(503).json({ error: "Connexion pas encore disponible" });
      return res.json({ url: E.urlConnexionHusqvarna(userId, retourHusqvarna(req), action === "gardena" ? "gardena" : "robot") });
    }

    if (action === "rachio_programmateurs" || action === "rachio") {
      const cle = String(apiKey || "").trim();
      if (!cle) return res.status(400).json({ error: "Clé API Rachio requise" });
      let liste;
      try {
        liste = await E.programmateursRachio(cle);
      } catch (e) { return res.status(400).json({ error: e.message }); }
      if (action === "rachio_programmateurs") return res.json({ programmateurs: liste.map(({ id, nom }) => ({ id, nom })) });
      const d = liste.find(x => x.id === programmateur);
      if (!d) return res.status(400).json({ error: "Programmateur introuvable" });
      const { error } = await supabase.from("equipements").upsert({
        user_id: userId, type: "arrosage", marque: "rachio", appareil: d.id, nom: d.nom.slice(0, 60),
        secret: E.chiffrer({ apiKey: cle }), statut: "connecte", erreur: null, mesures: { ...d, suspendu: null }, mesures_at: new Date().toISOString(),
      }, { onConflict: "user_id,type" });
      if (error) throw error;
      return res.json({ ok: true });
    }

    if (action === "arrosage") {
      try {
        await E.commandeArrosage(supabase, userId, { commande, zone, minutes: Number(minutes) });
      } catch (e) { return res.status(400).json({ error: e.message }); }
      return res.json({ arrosage: await E.etatArrosage(supabase, userId) });
    }

    if (action === "robot") {
      try {
        await E.commandeRobot(supabase, userId, commande);
      } catch (e) { return res.status(400).json({ error: e.message }); }
      return res.json({ robot: await E.etatRobot(supabase, userId) });
    }

    if (action === "retirer") {
      const { data: eq } = await supabase.from("equipements").select("id, marque, secret").eq("user_id", userId).eq("id", id).maybeSingle();
      if (eq?.marque === "husqvarna" || eq?.marque === "gardena") await E.revoquerHusqvarna(eq);
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
