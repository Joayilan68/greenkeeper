// api/equipements.cjs
// Équipements connectés (table equipements, accès serveur uniquement) : clés d'accès chiffrées,
// connecteurs Ecowitt (station météo) et Husqvarna Automower (robot tondeuse), application des mesures
// du jardin à la météo du jour.
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

// ── Husqvarna Automower Connect (developer.husqvarnagroup.cloud) ─────────────────────────────
// Connexion OAuth « Authorization Code » : l'utilisateur se connecte chez Husqvarna, qui renvoie vers
// /api/objets avec un code ; jetons (accès + renouvellement) chiffrés dans equipements.secret.
const HQ_AUTH = "https://api.authentication.husqvarnagroup.dev/v1/oauth2";
const HQ_API = "https://api.amc.husqvarna.dev/v1";
const ETAT_ROBOT_MS = 5 * 60 * 1000; // état du robot relu au plus toutes les 5 minutes

// Paramètre « state » signé : identifie l'utilisateur au retour de Husqvarna (valable 15 minutes)
function etatSigne(userId) {
  const corps = Buffer.from(JSON.stringify({ u: userId, e: Date.now() + 15 * 60 * 1000 })).toString("base64url");
  return `${corps}.${crypto.createHmac("sha256", cle()).update(corps).digest("base64url")}`;
}
function verifierEtat(etat) {
  const [corps, sig] = String(etat || "").split(".");
  if (!corps || !sig) return null;
  const attendu = crypto.createHmac("sha256", cle()).update(corps).digest("base64url");
  if (sig.length !== attendu.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(attendu))) return null;
  const { u, e } = JSON.parse(Buffer.from(corps, "base64url").toString("utf8"));
  return e > Date.now() ? u : null;
}

function urlConnexionHusqvarna(userId, redirectUri) {
  return `${HQ_AUTH}/authorize?${new URLSearchParams({
    client_id: process.env.HUSQVARNA_CLIENT_ID, redirect_uri: redirectUri, response_type: "code", state: etatSigne(userId),
  })}`;
}

async function jetonsHusqvarna(params) {
  const r = await fetch(`${HQ_AUTH}/token`, {
    method: "POST", signal: AbortSignal.timeout(8000),
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: process.env.HUSQVARNA_CLIENT_ID, client_secret: process.env.HUSQVARNA_CLIENT_SECRET, ...params }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(`Husqvarna : connexion refusée (${d.error_description || d.error || r.status})`);
  return { access: d.access_token, refresh: d.refresh_token, expire: Date.now() + (Number(d.expires_in) || 3600) * 1000 };
}

// Jeton d'accès valable (renouvelé et réenregistré s'il expire dans moins de 2 minutes)
async function accesHusqvarna(supabase, eq) {
  const j = dechiffrer(eq.secret);
  if (j.expire - Date.now() > 120000) return j.access;
  if (!j.refresh) throw new Error("Connexion Husqvarna expirée : reconnecte ton robot");
  const neuf = await jetonsHusqvarna({ grant_type: "refresh_token", refresh_token: j.refresh });
  neuf.refresh = neuf.refresh || j.refresh;
  await supabase.from("equipements").update({ secret: chiffrer(neuf) }).eq("id", eq.id);
  return neuf.access;
}

async function appelHusqvarna(acces, chemin, corps) {
  const r = await fetch(`${HQ_API}/${chemin}`, {
    method: corps ? "POST" : "GET", signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${acces}`, "Authorization-Provider": "husqvarna", "X-Api-Key": process.env.HUSQVARNA_CLIENT_ID,
      "Content-Type": "application/vnd.api+json" },
    ...(corps ? { body: JSON.stringify(corps) } : {}),
  });
  if (r.status === 401 || r.status === 403) throw new Error("Husqvarna refuse l'accès au robot : reconnecte-le");
  if (r.status === 429) throw new Error("Trop de demandes envoyées à Husqvarna, réessaie dans quelques minutes");
  if (!r.ok) throw new Error(`Husqvarna : erreur ${r.status}`);
  return r.status === 202 || r.status === 204 ? null : r.json().catch(() => null);
}

// Robot ramené à l'essentiel (valeurs de l'API en minuscules)
function robotLisible(m) {
  const a = m?.attributes || {};
  const bas = (v) => typeof v === "string" ? v.toLowerCase() : null;
  return {
    id: m.id, nom: a.system?.name || a.system?.model || "Automower", modele: a.system?.model || null,
    activite: bas(a.mower?.activity), etat: bas(a.mower?.state), batterie: a.battery?.batteryPercent ?? null,
    erreur: a.mower?.errorCode || 0, force: bas(a.planner?.override?.action), restriction: bas(a.planner?.restrictedReason),
    prochaine_tonte: a.planner?.nextStartTimestamp || null, hauteur: a.settings?.cuttingHeight ?? null,
    connecte: a.metadata?.connected !== false,
  };
}

async function robotsHusqvarna(acces) {
  return ((await appelHusqvarna(acces, "mowers"))?.data || []).map(robotLisible);
}

// Robot de l'utilisateur : état (relu s'il a plus de 5 minutes)
async function etatRobot(supabase, userId) {
  const { data: eq } = await supabase.from("equipements").select("*").eq("user_id", userId).eq("type", "robot").maybeSingle();
  if (!eq) return null;
  const age = eq.mesures_at ? Date.now() - Date.parse(eq.mesures_at) : Infinity;
  if (eq.mesures && age < ETAT_ROBOT_MS) return { ...eq.mesures, at: eq.mesures_at };
  try {
    const robot = (await robotsHusqvarna(await accesHusqvarna(supabase, eq))).find(r => r.id === eq.appareil);
    if (!robot) throw new Error("Robot introuvable sur le compte Husqvarna");
    const at = new Date().toISOString();
    await supabase.from("equipements").update({ mesures: robot, mesures_at: at, statut: "connecte", erreur: null }).eq("id", eq.id);
    return { ...robot, at };
  } catch (e) {
    await supabase.from("equipements").update({ statut: "erreur", erreur: e.message.slice(0, 200) }).eq("id", eq.id);
    return null;
  }
}

// Minutes jusqu'à demain 7 h (heure de Paris) : repos du robot pour le reste de la journée
function minutesJusquaDemain7h(now = new Date()) {
  const paris = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const cible = new Date(paris); cible.setDate(cible.getDate() + 1); cible.setHours(7, 0, 0, 0);
  return Math.round((cible - paris) / 60000);
}

// Commandes validées par l'utilisateur (mode Proposition)
const COMMANDES = {
  repos_journee: () => ({ data: { type: "Park", attributes: { duration: minutesJusquaDemain7h() } } }),
  repos_long: () => ({ data: { type: "ParkUntilFurtherNotice" } }),
  reprendre: () => ({ data: { type: "ResumeSchedule" } }),
};

async function commandeRobot(supabase, userId, commande) {
  if (!COMMANDES[commande]) throw new Error("Commande inconnue");
  const { data: eq } = await supabase.from("equipements").select("*").eq("user_id", userId).eq("type", "robot").maybeSingle();
  if (!eq) throw new Error("Aucun robot connecté");
  await appelHusqvarna(await accesHusqvarna(supabase, eq), `mowers/${eq.appareil}/actions`, COMMANDES[commande]());
  await supabase.from("equipements").update({ mesures_at: null }).eq("id", eq.id); // état relu au prochain affichage
}

async function revoquerHusqvarna(eq) {
  try {
    await fetch(`${HQ_AUTH}/revoke`, { method: "POST", signal: AbortSignal.timeout(5000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: dechiffrer(eq.secret).refresh || "", client_id: process.env.HUSQVARNA_CLIENT_ID }) });
  } catch { /* la suppression des jetons chez nous suffit */ }
}

module.exports = {
  chiffrer, dechiffrer, stationsEcowitt, mesuresEcowitt, mesuresStation, appliquerStation,
  urlConnexionHusqvarna, verifierEtat, jetonsHusqvarna, robotsHusqvarna, etatRobot, commandeRobot, revoquerHusqvarna,
  minutesJusquaDemain7h,
};
