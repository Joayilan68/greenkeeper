// scripts/gsc-stats.mjs
// Google Search Console de mongazon360.fr : clics, affichages, CTR et position, par page ou par requête ; état
// d'indexation de chaque page du plan du site (outil d'inspection d'URL) ; renvoi du plan du site à Google.
// Stats et indexation servent au point stats tous les 15 jours et à l'amélioration des articles Conseils ; le renvoi
// du plan du site est lancé par .github/workflows/indexnow.yml après chaque mise en prod d'articles. À la main :
//   NODE_USE_ENV_PROXY=1 node scripts/gsc-stats.mjs [jours=28] [page|query] [lignes=25]
//   NODE_USE_ENV_PROXY=1 node scripts/gsc-stats.mjs index
//   NODE_USE_ENV_PROXY=1 node scripts/gsc-stats.mjs plan
// Compte de service mongazon360-stats@mongazon360-seo.iam.gserviceaccount.com, utilisateur « Complète » de la propriété
// https://mongazon360.fr/ (nécessaire pour envoyer le plan du site ; stats et indexation se lisent en lecture seule) ;
// jeton et clé : api/searchConsole.cjs. Les 2 derniers jours, encore incomplets dans la Search Console, sont exclus.
import { SITE, LECTURE, ECRITURE, jeton } from "../api/searchConsole.cjs";

const args = process.argv.slice(2);
const access_token = await jeton(args[0] === "plan" ? ECRITURE : LECTURE);

const appel = async (url, corps) => {
  const res = await fetch(url, { method: "POST", body: JSON.stringify(corps),
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`[gsc] lecture refusée (${res.status}) : vérifier l'accès du compte de service à ${SITE}`);
  return res.json();
};

// Clics, affichages, CTR et position sur la période, puis détail par page ou par requête.
async function stats([jours = 28, dimension = "page", lignes = 25]) {
  const lire = async (corps) => (await appel(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, corps)).rows ?? [];
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
}

// État d'indexation de chaque adresse du plan du site en ligne (« Envoyée et indexée », « Google ne reconnaît pas
// cette URL »…), avec la date de la dernière exploration, puis le total par état.
async function indexation() {
  const plan = await (await fetch(`${SITE}sitemap.xml`)).text();
  const urls = [...plan.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const inspecter = async (url) => (await appel("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    { inspectionUrl: url, siteUrl: SITE, languageCode: "fr-FR" })).inspectionResult?.indexStatusResult ?? {};
  const etats = {};
  for (let i = 0; i < urls.length; i += 8) { // 8 inspections à la fois (quota Google : 600 par minute)
    const lot = urls.slice(i, i + 8);
    (await Promise.all(lot.map(inspecter))).forEach((r, j) => {
      const etat = r.coverageState || r.verdict || "inconnu";
      etats[etat] = (etats[etat] || 0) + 1;
      console.log(`  ${lot[j].replace(SITE, "/").padEnd(48)} ${etat}${r.lastCrawlTime ? ` (exploré le ${r.lastCrawlTime.slice(0, 10)})` : ""}`);
    });
  }
  console.log(Object.entries(etats).map(([etat, n]) => `${n} × ${etat}`).join(" · "));
}

// Renvoie le plan du site à Google (méthode officielle depuis la fin du « ping ») : Google le relit et découvre les
// pages nouvelles ou modifiées, puis décide seul de leur indexation.
async function envoiPlan() {
  const plan = `${SITE}sitemap.xml`;
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/sitemaps/${encodeURIComponent(plan)}`,
    { method: "PUT", headers: { Authorization: `Bearer ${access_token}` } });
  if (!res.ok) throw new Error(`[gsc] plan du site refusé (${res.status}) : le compte de service doit avoir l'autorisation « Complète »`);
  console.log(`[gsc] plan du site renvoyé à Google : ${plan}`);
}

await ({ index: indexation, plan: envoiPlan }[args[0]] ?? (() => stats(args.map(a => (isNaN(a) ? a : Number(a))))))();
