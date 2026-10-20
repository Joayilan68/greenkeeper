// src/lib/ligueHiver.js
// Ligue d'hiver (ligueHiver.json) : semaines du dimanche au samedi à l'heure de Paris. Le serveur (api/ligueHiver.cjs) fait
// foi pour la semaine en cours et les participations ; ces dates servent à l'affichage (annonce, cartes, page d'accueil).
// Hors de mongazon360.fr (STA, préversions), la ligue démarre à debutTest pour pouvoir la tester avant le 1er novembre.
import L from "./ligueHiver.json";

export const LIGUE = L;

const JOUR = 86400000;
const num = (jour) => Date.parse(`${jour}T00:00:00Z`) / JOUR;
const saisie = (n) => new Date(n * JOUR).toISOString().slice(0, 10);
const PROD = ["mongazon360.fr", "www.mongazon360.fr"];
const debut = () => (typeof location !== "undefined" && PROD.includes(location.hostname) ? L.debut : L.debutTest);
export const jourParis = (d = new Date()) => d.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });

// Période affichée : « annonce » les 7 jours avant le départ, « en_cours » (semaine 1 à 13), « terminee » la semaine qui
// suit la fin ; null le reste de l'année
export function periodeLigue(jour = jourParis()) {
  const d = num(debut()), j = num(jour), n = Math.floor((j - d) / 7) + 1;
  if (j < d) return j >= d - 7 ? { statut: "annonce", debut: debut() } : null;
  if (n <= L.semaines) return { statut: "en_cours", semaine: n, debut: debut() };
  return n === L.semaines + 1 ? { statut: "terminee", debut: debut() } : null;
}

// Premier et dernier jour de la semaine n (« AAAA-MM-JJ »)
export function datesSemaine(n, deb = debut()) {
  const a = num(deb) + 7 * (n - 1);
  return { debut: saisie(a), fin: saisie(a + 6) };
}

// « 1er novembre », « 7 décembre »
export function dateLongue(jour) {
  const d = new Date(`${jour}T12:00:00Z`);
  const j = d.getUTCDate();
  return `${j === 1 ? "1er" : j} ${d.toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" })}`;
}
