// api/searchConsole.cjs — Google Search Console de mongazon360.fr (compte de service « mongazon360-stats »)
// Clé JSON du compte de service : variable GSC_SERVICE_ACCOUNT_JSON (Vercel Production et Preview, secret GitHub,
// environnement cloud de Claude), jamais affichée. Utilisé par api/stats.js (Pilotage) et scripts/gsc-stats.mjs.
const { createSign } = require("node:crypto");

const SITE = "https://mongazon360.fr/";
const LECTURE  = "https://www.googleapis.com/auth/webmasters.readonly";
const ECRITURE = "https://www.googleapis.com/auth/webmasters"; // envoi du plan du site (autorisation « Complète »)

const cleDisponible = () => !!process.env.GSC_SERVICE_ACCOUNT_JSON;

// Jeton d'accès Google (JWT RS256 signé avec la clé du compte de service, valable 1 h)
async function jeton(portee = LECTURE) {
  let cle;
  try { cle = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON); } catch { cle = null; }
  if (!cle?.private_key || !cle?.client_email) throw new Error("[gsc] variable GSC_SERVICE_ACCOUNT_JSON absente ou invalide");
  const b64url = (objet) => Buffer.from(JSON.stringify(objet)).toString("base64url");
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({ iss: cle.client_email, scope: portee,
    aud: "https://oauth2.googleapis.com/token", iat: maintenant, exp: maintenant + 3600 })}`;
  const assertion = `${entete}.${createSign("RSA-SHA256").update(entete).sign(cle.private_key, "base64url")}`;
  const reponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  const { access_token } = await reponse.json();
  if (!access_token) throw new Error(`[gsc] jeton refusé par Google (${reponse.status})`);
  return access_token;
}

// Position moyenne, clics et affichages de toutes nos pages, par mois, sur les 16 derniers mois (limite de la
// Search Console). La position du mois est la moyenne des positions quotidiennes pondérée par les affichages,
// comme le calcule la Search Console ; les 2 derniers jours, encore incomplets, sont exclus.
async function positionsParMois() {
  const token = await jeton();
  const jour = (d) => d.toISOString().slice(0, 10);
  const fin = new Date(Date.now() - 2 * 86400000);
  const debut = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() - 15, 1));
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: jour(debut), endDate: jour(fin), dimensions: ["date"], rowLimit: 1000 }) });
  if (!res.ok) throw new Error(`[gsc] lecture refusée (${res.status})`);
  const parMois = {};
  for (const { keys: [date], clicks, impressions, position } of (await res.json()).rows ?? []) {
    const m = (parMois[date.slice(0, 7)] ??= { clics: 0, affichages: 0, positions: 0 });
    m.clics += clicks; m.affichages += impressions; m.positions += position * impressions;
  }
  return Object.entries(parMois).sort(([a], [b]) => a.localeCompare(b)).map(([mois, m]) => ({
    mois, clics: m.clics, affichages: m.affichages, position: Math.round((m.positions / m.affichages) * 10) / 10 }));
}

module.exports = { SITE, LECTURE, ECRITURE, cleDisponible, jeton, positionsParMois };
