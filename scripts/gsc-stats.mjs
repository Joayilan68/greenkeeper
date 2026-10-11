// scripts/gsc-stats.mjs
// Stats Google de mongazon360.fr (Search Console) : clics, affichages, CTR et position, par page ou par requête.
// Sert au point stats tous les 15 jours et à l'amélioration des articles Conseils ; à la main :
//   NODE_USE_ENV_PROXY=1 node scripts/gsc-stats.mjs [jours=28] [page|query] [lignes=25]
// Lecture seule : compte de service mongazon360-stats@mongazon360-seo.iam.gserviceaccount.com, utilisateur
// « Accès limité » de la propriété https://mongazon360.fr/. Sa clé JSON est dans la variable GSC_SERVICE_ACCOUNT_JSON
// de l'environnement cloud de Claude : jamais dans le dépôt, jamais affichée.
// Les 2 derniers jours, encore incomplets dans la Search Console, sont exclus.
import { createSign } from "node:crypto";

const SITE = "https://mongazon360.fr/";
const [jours = 28, dimension = "page", lignes = 25] = process.argv.slice(2).map(a => (isNaN(a) ? a : Number(a)));

let cle;
try { cle = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON); } catch { cle = null; }
if (!cle?.private_key || !cle?.client_email) throw new Error("[gsc] variable GSC_SERVICE_ACCOUNT_JSON absente ou invalide");

const b64url = (objet) => Buffer.from(JSON.stringify(objet)).toString("base64url");
const maintenant = Math.floor(Date.now() / 1000);
const entete = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({
  iss: cle.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly",
  aud: "https://oauth2.googleapis.com/token", iat: maintenant, exp: maintenant + 3600 })}`;
const assertion = `${entete}.${createSign("RSA-SHA256").update(entete).sign(cle.private_key, "base64url")}`;
const reponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
  body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
const { access_token } = await reponse.json();
if (!access_token) throw new Error(`[gsc] jeton refusé par Google (${reponse.status})`);

async function lire(corps) {
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
    method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(corps) });
  if (!res.ok) throw new Error(`[gsc] lecture refusée (${res.status}) : vérifier l'accès du compte de service à ${SITE}`);
  return (await res.json()).rows ?? [];
}

const jour = (decalage) => new Date(Date.now() - decalage * 86400000).toISOString().slice(0, 10);
const periode = { startDate: jour(jours + 2), endDate: jour(2) };
const pct = (x) => `${(100 * x).toFixed(1)} %`;
const [total = { clicks: 0, impressions: 0, ctr: 0, position: 0 }] = await lire(periode);
console.log(`${SITE} du ${periode.startDate} au ${periode.endDate} : ${total.clicks} clics, ${total.impressions} affichages, `
  + `CTR ${pct(total.ctr)}, position ${total.position.toFixed(1)}`);
// Google trie par clics seulement : on départage par affichages (requêtes vues mais pas encore cliquées = pistes d'amélioration).
const detail = (await lire({ ...periode, dimensions: [dimension], rowLimit: 1000 }))
  .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, lignes);
for (const l of detail)
  console.log(`  ${l.keys[0].slice(0, 80).padEnd(80)} clics ${String(l.clicks).padStart(4)} · affichages `
    + `${String(l.impressions).padStart(5)} · CTR ${pct(l.ctr).padStart(7)} · position ${l.position.toFixed(1).padStart(5)}`);
