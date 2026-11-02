// src/lib/conseilsApp.js
// Conseils en mode app (chantier du 22/11, demandes de Jordan des 29 et 30/10/2026) : les articles de content/conseils lus
// dans l'app, chargés à la demande (dist/conseils-app, écrit par scripts/seo-build.mjs), sans poids en plus au premier
// chargement ; les pages web /conseils restent celles de Google, Pinterest et Facebook. Aussi : le conseil de la semaine
// de l'accueil connecté et l'article de chaque action du plan (« Lire l'article » d'Aujourd'hui).
import ARTICLES_ACTIONS from "./articlesActions.json";

const memoire = new Map();
function charger(url) {
  if (!memoire.has(url)) {
    memoire.set(url, fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch(e => { memoire.delete(url); throw e; }));
  }
  return memoire.get(url);
}
export const chargerListe = () => charger("/conseils-app/index.json");
export const chargerArticle = (slug) => charger(`/conseils-app/${encodeURIComponent(slug)}.json`);

// Date du jour à Paris (AAAA-MM-JJ) et saison de cette date
export const jourParis = (d = new Date()) => d.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
export function saisonDe(jour) {
  const m = Number(jour.slice(5, 7));
  return m === 12 || m <= 2 ? "hiver" : m <= 5 ? "printemps" : m <= 8 ? "ete" : "automne";
}
export const NOMS_SAISONS = { hiver: "Hiver", printemps: "Printemps", ete: "Été", automne: "Automne" };
export const dateLongue = (jour) => new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// « Nouveau » : article publié depuis 7 jours au plus
const jours = (de, a) => Math.round((Date.parse(a) - Date.parse(de)) / 864e5);
export const estNouveau = (article, jour = jourParis()) => article.date <= jour && jours(article.date, jour) <= 7;

// Liste : articles de la saison d'abord, puis les autres ; les plus récemment mis à jour d'abord
export function trier(liste, jour = jourParis()) {
  const saison = saisonDe(jour);
  return [...liste].sort((a, b) => (b.saison === saison) - (a.saison === saison) || b.maj.localeCompare(a.maj));
}

// Le conseil de la semaine : le dernier article sorti s'il a 7 jours au plus (badge « Nouveau »), sinon un article de la
// saison qui change chaque lundi
export function conseilDeLaSemaine(liste, jour = jourParis()) {
  const recent = [...liste].sort((a, b) => b.date.localeCompare(a.date)).find(a => estNouveau(a, jour));
  if (recent) return { article: recent, nouveau: true };
  const saison = saisonDe(jour);
  const deSaison = liste.filter(a => a.saison === saison).sort((a, b) => a.slug.localeCompare(b.slug));
  if (!deSaison.length) return null;
  const semaine = Math.floor((Date.parse(jour) / 864e5 + 3) / 7); // le 1/1/1970 était un jeudi : +3 fait changer le lundi
  return { article: deSaison[semaine % deSaison.length], nouveau: false };
}

// Article d'une action du plan d'entretien (mois de 1 à 12), d'après src/lib/articlesActions.json
export function articleDeLAction(actionId, mois) {
  const r = ARTICLES_ACTIONS.actions[actionId];
  return r ? r.mois?.[String(mois)] || r.article : null;
}
