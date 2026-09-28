// api/equipements.cjs
// Équipements connectés (table equipements, accès serveur uniquement) : clés d'accès chiffrées,
// connecteur Ecowitt (station météo) et application des mesures du jardin à la météo du jour.
// Utilisé par api/objets.js (écran « Mes équipements »), api/weather.js (app), api/send.js
// (notifications) et api/bobContext.cjs (Bob). Aucune donnée n'est gardée au-delà de la dernière mesure.

const crypto = require("crypto");

const FRAICHEUR_MS = 10 * 60 * 1000;   // mesure relue au plus toutes les 10 minutes
const VALIDITE_MS = 3 * 3600 * 1000;   // au-delà de 3 h, une mesure ne décrit plus la journée en cours

// ── Chiffrement des clés d'accès (AES-256-GCM, clé dérivée de EQUIPEMENTS_SECRET) ────────────
function cle() {
  const secret = process.env.EQUIPEMENTS_SECRET;
  if (!secret) throw new Error("EQUIPEMENTS_SECRET non configuré");
  return crypto.createHash("sha256").update(secret).digest();
}

function chiffrer(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", cle(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map(b => b.toString("base64")).join(".");
}

function dechiffrer(texte) {
  const [iv, tag, data] = String(texte).split(".").map(s => Buffer.from(s, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", cle(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString("utf8"));
}

// ── Ecowitt (API v3, doc.ecowitt.net) : clés créées par le propriétaire de la station ─────────
const ECOWITT = "https://api.ecowitt.net/api/v3/device";
const ERREURS_ECOWITT = {
  40010: "Application Key invalide", 40011: "API Key invalide", 40012: "Station introuvable sur ce compte",
  45001: "Limite de requêtes Ecowitt atteinte, réessaie dans quelques minutes", 48001: "Accès refusé par Ecowitt",
};

async function appelEcowitt(chemin, params) {
  const r = await fetch(`${ECOWITT}/${chemin}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(8000) });
  const d = await r.json().catch(() => null);
  if (!d) throw new Error("Réponse Ecowitt illisible");
  if (d.code !== 0) throw new Error(ERREURS_ECOWITT[d.code] || `Ecowitt : ${d.msg || "erreur"}`);
  return d.data;
}

// Stations météo du compte Ecowitt (type 1 ; les caméras Ecowitt sont de type 2)
async function stationsEcowitt({ applicationKey, apiKey }) {
  const data = await appelEcowitt("list", { application_key: applicationKey, api_key: apiKey, limit: 50 });
  return (data?.list || []).filter(s => s.type === 1 && s.mac).map(s => ({ mac: s.mac, nom: s.name || s.mac }));
}

async function mesuresEcowitt({ applicationKey, apiKey, mac }) {
  const d = await appelEcowitt("real_time", {
    application_key: applicationKey, api_key: apiKey, mac, call_back: "all",
    temp_unitid: 1, rainfall_unitid: 12, wind_speed_unitid: 7, // °C, mm, km/h
  });
  const val = (o) => { const v = parseFloat(o?.value); return Number.isFinite(v) ? v : null; };
  const pluie = d?.rainfall ? d.rainfall : d?.rainfall_piezo; // pluviomètre à auget, sinon piézo
  const m = {
    temp: val(d?.outdoor?.temperature),
    humidite: val(d?.outdoor?.humidity),
    pluie_jour: val(pluie?.daily),
    vent: val(d?.wind?.wind_speed),
    rafale: val(d?.wind?.wind_gust),
    sol_humidite: val(d?.soil_ch1?.soilmoisture),
  };
  if (m.temp === null && m.pluie_jour === null) throw new Error("La station n'envoie ni température ni pluie à Ecowitt");
  return m;
}

// ── Station de l'utilisateur : dernière mesure (relue si elle a plus de 10 minutes) ───────────
async function mesuresStation(supabase, userId) {
  const { data: eq } = await supabase.from("equipements").select("*")
    .eq("user_id", userId).eq("type", "station").maybeSingle();
  if (!eq) return null;
  const age = eq.mesures_at ? Date.now() - Date.parse(eq.mesures_at) : Infinity;
  if (eq.mesures && age < FRAICHEUR_MS) return { ...eq.mesures, at: eq.mesures_at, nom: eq.nom, marque: eq.marque };
  try {
    const mesures = await mesuresEcowitt({ ...dechiffrer(eq.secret), mac: eq.appareil });
    const at = new Date().toISOString();
    await supabase.from("equipements").update({ mesures, mesures_at: at, statut: "connecte", erreur: null }).eq("id", eq.id);
    return { ...mesures, at, nom: eq.nom, marque: eq.marque };
  } catch (e) {
    await supabase.from("equipements").update({ statut: "erreur", erreur: e.message.slice(0, 200) }).eq("id", eq.id);
    // Dernière mesure encore valable pour la journée : on la garde
    return eq.mesures && age < VALIDITE_MS ? { ...eq.mesures, at: eq.mesures_at, nom: eq.nom, marque: eq.marque } : null;
  }
}

// ── Mesures du jardin appliquées au jour 0 des séries Open-Meteo (daily) ─────────────────────
// La pluie tombée, la température et le vent mesurés bornent la journée ; les prévisions restent
// celles d'Open-Meteo. Renvoie une copie ; séries inchangées si la mesure a plus de 3 h.
function appliquerStation(daily, m) {
  if (!daily || !m?.at || Date.now() - Date.parse(m.at) > VALIDITE_MS) return daily;
  const d = { ...daily };
  const borne = (cle, valeur, f) => {
    if (typeof valeur !== "number" || !Array.isArray(d[cle])) return;
    d[cle] = [...d[cle]];
    d[cle][0] = typeof d[cle][0] === "number" ? f(d[cle][0], valeur) : valeur;
  };
  borne("precipitation_sum", m.pluie_jour, Math.max);
  borne("temperature_2m_min", m.temp, Math.min);
  borne("temperature_2m_max", m.temp, Math.max);
  borne("windspeed_10m_max", m.vent, Math.max);
  return d;
}

module.exports = { chiffrer, dechiffrer, stationsEcowitt, mesuresEcowitt, mesuresStation, appliquerStation };
