// Tableau de pilotage des articles Conseils (go de Jordan du 17/11/2026), mis à jour le 10 et le 25 de chaque mois.
// Page « Articles Conseils : pilotage » : https://claude.ai/artifact/RWuWiahy6irFrzCyVRFP8S (type Data, fichier du jeu « articles »).
// 1) requete.sql, dates remplacées, lue sur la base de production ; son résultat (objet par article) enregistré en .json ;
// 2) NODE_USE_ENV_PROXY=1 node scripts/tableau-articles/construire.mjs <dépôt> <résultat SQL .json> scripts/tableau-articles/requete.sql <début> <fin> <sortie.json>
// Search Console (clics, affichages, position par page) : compte de service du dépôt, api/searchConsole.cjs.
// Lectures et suites de visite : résultat de la requête SQL lue sur la base de production (voir « Requête »).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const [dossier, fichierSql, fichierRequete, debut, fin, sortie] = process.argv.slice(2);
const depot = path.resolve(dossier);
const { SITE, LECTURE, jeton } = createRequire(import.meta.url)(path.join(depot, "api/searchConsole.cjs"));

// Articles publiés : en-têtes des fichiers content/conseils/*.md
const articles = fs.readdirSync(path.join(depot, "content/conseils")).filter(f => f.endsWith(".md")).map(f => {
  const texte = fs.readFileSync(path.join(depot, "content/conseils", f), "utf8");
  const tete = Object.fromEntries(texte.split("---")[1].trim().split("\n").map(l => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  return { slug: f.slice(0, -3), titre: tete.title, saison: tete.saison, publie: tete.date, produits: tete.produits };
});

// Search Console, par page, sur la période
const access_token = await jeton(LECTURE);
const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
  method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ startDate: debut, endDate: fin, dimensions: ["page"], rowLimit: 1000 }) });
if (!res.ok) throw new Error(`Search Console : ${res.status}`);
const parPage = Object.fromEntries(((await res.json()).rows ?? []).map(r => [r.keys[0].replace(/\/$/, ""), r]));

const sql = JSON.parse(fs.readFileSync(fichierSql, "utf8"));
const rows = articles.map(a => {
  const g = parPage[`https://mongazon360.fr/conseils/${a.slug}`] ?? { clicks: 0, impressions: 0 };
  const [lectures, lectures_google, lectures_facebook, lectures_autres, passages_app, essais_diagnostic, inscriptions, clics_amazon = 0] =
    sql[a.slug] ?? [0, 0, 0, 0, 0, 0, 0, 0];
  return { slug: a.slug, article: a.titre, saison: a.saison, publie_le: a.publie,
    clics_google: g.clicks, affichages_google: g.impressions, position_google: g.position ? Math.round(g.position * 10) / 10 : null,
    lectures, lectures_google, lectures_facebook, lectures_autres, passages_app, essais_diagnostic, inscriptions,
    produits_amazon: Boolean(a.produits), clics_amazon };
}).sort((x, y) => y.clics_google - x.clics_google || y.lectures - x.lectures || x.slug.localeCompare(y.slug));

// Période en toutes lettres pour la page (« du 1er au 15 novembre 2026 »)
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const jourMois = (iso, avecMois) => { const [a, m, j] = iso.split("-").map(Number); return `${j === 1 ? "1er" : j}${avecMois ? ` ${MOIS[m - 1]} ${a}` : ""}`; };
const memeMois = debut.slice(0, 7) === fin.slice(0, 7);
const meta = [
  { label: "Période", value: `du ${jourMois(debut, !memeMois)} au ${jourMois(fin, true)}` },
  { label: "Dates (Search Console et base de production)", value: `${debut} → ${fin}` },
  { label: "Lectures de la rubrique Conseils (hors articles)", value: String((sql.rubrique ?? [0])[0]) },
  { label: "Requête (base de production)", value: fs.readFileSync(fichierRequete, "utf8"), type: "code", lang: "sql" },
  { label: "construire.mjs", value: fs.readFileSync(new URL(import.meta.url), "utf8"), type: "code", lang: "javascript" },
];
fs.writeFileSync(sortie, JSON.stringify({ rows, meta }, null, 1));
console.log(`${rows.length} articles ; clics Google ${rows.reduce((n, r) => n + r.clics_google, 0)} ; lectures ${rows.reduce((n, r) => n + r.lectures, 0)} ; passages ${rows.reduce((n, r) => n + r.passages_app, 0)} ; clics Amazon ${rows.reduce((n, r) => n + r.clics_amazon, 0)}`);
