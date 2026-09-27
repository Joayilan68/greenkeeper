// src/lib/kitSaison.js
// Kit de saison (onglet Produits) : les produits dont l'action est de saison ce mois-ci dans la zone de
// l'utilisateur (mois du plan d'entretien, alignés sur la matrice « Zones x Mois » de la base de
// connaissances), dans la gamme du budget et en quantité pour la surface. Si rien n'est de saison
// (cœur de l'hiver), le kit prépare le premier mois qui en a.
import AMAZON_PRODUCTS from "./amazonProducts";
import { ACTIONS_PLAN, zoneClimatique } from "./planEntretien";
import { selectProduit, quantitePour } from "./selectionProduits";

// Produit du catalogue → action du plan d'entretien, dans l'ordre d'affichage
const PRODUIT_ACTION = [
  ["engraisStarter", "engrais_starter"], ["engraisEte", "engrais_ete"], ["engraisAutomne", "engrais_automne"],
  ["engraisHiver", "engrais_hiver"], ["regarnissage", "regarnissage"], ["antiMousse", "antimousse"],
  ["verticut", "scarification"], ["aeration", "aeration"], ["desherbage", "desherbage"], ["biostimulant", "biostimulant"],
];
const MAX_PRODUITS = 4;
const ENGRAIS_SYNTHESE = ["engraisStarter", "engraisEte", "engraisAutomne"];
// Produits appliqués seulement sur les zones abîmées (regarnissage, mousse) : ~30 % de la surface
const ZONES_A_TRAITER = { regarnissage: 0.3, antiMousse: 0.3 };

const SAISONS = {
  printemps: { icone: "🌱", titre: "Kit de printemps" }, ete: { icone: "☀️", titre: "Kit d'été" },
  automne: { icone: "🍂", titre: "Kit d'automne" }, hiver: { icone: "❄️", titre: "Kit d'hiver" },
};
const saisonDuMois = (m) => m >= 3 && m <= 5 ? "printemps" : m >= 6 && m <= 8 ? "ete" : m >= 9 && m <= 11 ? "automne" : "hiver";
const MOIS = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function produitsDuMois(profile, zone, mois) {
  return PRODUIT_ACTION.filter(([cle, id]) => {
    if (profile?.objectif === "naturel" && ENGRAIS_SYNTHESE.includes(cle)) return false; // base : NPK de synthèse bloqué
    if (cle === "engraisHiver" && profile?.sol === "calcaire") return false; // base : pas de chaux en sol calcaire
    const action = ACTIONS_PLAN.find(a => a.id === id);
    return action?.getMois(zone, profile?.sol, false, profile).includes(mois);
  }).map(([cle]) => cle)
    .filter((cle, _, liste) => !(cle === "aeration" && liste.includes("verticut"))) // base : scarification OU aération
    .slice(0, MAX_PRODUITS);
}

export function kitDuMois(profile, tier, month = new Date().getMonth() + 1) {
  const zone = zoneClimatique(profile);
  let mois = month, cles = produitsDuMois(profile, zone, mois);
  for (let n = 1; !cles.length && n < 12; n++) { mois = (month + n - 1) % 12 + 1; cles = produitsDuMois(profile, zone, mois); }
  const saison = saisonDuMois(mois);
  const surface = profile?.surface || 100;
  const items = cles.map(cle => {
    const cat = AMAZON_PRODUCTS[cle];
    const produit = selectProduit(cle, tier, profile);
    if (!cat || !produit) return null;
    const part = ZONES_A_TRAITER[cle];
    const quantite = quantitePour(cat, Math.round(surface * (part || 1)));
    return { cle, cat, produit, quantite, zones: !!part, prix: Math.round((produit.prix || 0) * quantite * 100) / 100 };
  }).filter(Boolean);
  const total = Math.round(items.reduce((t, i) => t + i.prix, 0) * 100) / 100;
  return {
    saison: `${saison}-${mois}`, ...SAISONS[saison], surface, items, total,
    sousTitre: mois === month ? `Les produits de saison en ${MOIS[mois]} dans votre zone` : `À préparer pour ${MOIS[mois]}`,
  };
}
