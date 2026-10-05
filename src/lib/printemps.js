// src/lib/printemps.js
// Printemps : compte à rebours (tableau de bord, du 1er novembre à la 1re tonte) et plan de printemps
// (page /printemps : calendrier de la zone et liste d'achats). Dates indicatives de la zone climatique
// (src/lib/zonesGazon.json, partagé avec le moteur des parcours), mois des actions du plan d'entretien
// (alignés sur la matrice « Zones x Mois » de la base de connaissances), hauteurs de tonte de l'onglet
// « Tonte Précise » (src/lib/tonteGazon.json) ; la température réelle du sol (Premium) permet de voir si
// la pousse repart plus tôt.
import ZONES from "./zonesGazon.json";
import TONTE from "./tonteGazon.json";
import AMAZON_PRODUCTS from "./amazonProducts";
import { ACTIONS_PLAN, zoneClimatique, hasRobotTondeuse } from "./planEntretien";
import { selectProduit, quantiteKit } from "./selectionProduits";

const JOUR = 86400000;
const minuit = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Dates indicatives du printemps à venir : celui de l'année en cours jusqu'en mai, sinon le suivant
function datesPrintemps(profile, today) {
  const cle = ZONES[zoneClimatique(profile)] ? zoneClimatique(profile) : "centre";
  const z = ZONES[cle];
  const an = today.getMonth() >= 5 ? today.getFullYear() + 1 : today.getFullYear();
  const date = ([m, j], decalage = 0) => new Date(an, m - 1, j + decalage);
  const tonte = date(z.premiereTonte);
  const scarif = date(z.premiereTonte, 14);
  // Regarnir juste après la scarification, jamais avant l'ouverture de la fenêtre de semis
  const regarnissage = new Date(Math.max(date(z.printemps.debutOptimal), scarif.getTime() + 2 * JOUR));
  return { cle, z, an, revision: date(z.premiereTonte, -21), tonte, scarif, regarnissage };
}

// Mois de printemps (février → mai) d'une action du plan d'entretien pour ce profil
const moisAction = (id, zone, profile) =>
  (ACTIONS_PLAN.find(a => a.id === id)?.getMois(zone, profile?.sol, false, profile) || []).filter(m => m >= 2 && m <= 5);

export function compteARebours(profile, today = new Date()) {
  const mois = today.getMonth() + 1;
  if (mois >= 6 && mois <= 10) return null; // saison en cours : le plan d'entretien suffit
  const d = datesPrintemps(profile, today);
  const jours = Math.round((d.tonte - minuit(today)) / JOUR);
  if (jours < -7) return null; // printemps lancé : le plan d'entretien prend le relais

  // L'engrais de démarrage n'accompagne le regarnissage que s'il tombe dans ses mois (mars seul au Nord)
  const avecEngrais = moisAction("engrais_starter", d.cle, profile).includes(d.regarnissage.getMonth() + 1);
  const jalons = [
    { icone: "🔧", label: "Révision de la tondeuse, lame affûtée", date: d.revision },
    { icone: "✂️", label: "Première tonte (6 cm pour un gazon universel)", date: d.tonte },
    { icone: "🧹", label: "Scarification si feutre ou mousse", date: d.scarif },
    { icone: "🌾", label: avecEngrais ? "Regarnissage et engrais de démarrage" : "Regarnissage des zones clairsemées", date: d.regarnissage },
  ].filter(j => j.date >= minuit(today)).sort((a, b) => a.date - b.date).slice(0, 3);

  const debut = new Date(d.an - 1, 10, 1); // 1er novembre
  const progression = Math.min(1, Math.max(0, (today - debut) / (d.tonte - debut)));
  return { zone: d.z.label, solPousse: d.z.solPousse, jours, tonte: d.tonte, jalons, progression };
}

// ─── Plan de printemps ─────────────────────────────────────────────────────────
const ENGRAIS = ["engraisStarter", "engraisEte"];

// Ligne de la liste d'achats : produit du catalogue (ou accessoire), quantité pour la surface, prix indicatif
function ligneAchat(cle, profile, tier, surface, options = {}) {
  const cat = AMAZON_PRODUCTS[cle];
  // Objectif naturel : gamme « qualité » = engrais organiques (base : NPK de synthèse bloqué)
  const produit = selectProduit(cle, profile?.objectif === "naturel" && ENGRAIS.includes(cle) ? "qualite" : tier, profile);
  if (!cat || !produit) return null;
  const { quantite, zones } = options.materiel ? { quantite: 1, zones: false } : quantiteKit(cle, cat, surface);
  return { cle, label: cat.label, produit, quantite, zones, ...options, prix: Math.round((produit.prix || 0) * quantite * 100) / 100 };
}

function accessoire(cle, label, produit, options) {
  return produit ? { cle, label, produit, quantite: 1, zones: false, materiel: true, ...options, prix: produit.prix || 0 } : null;
}

export function planPrintemps(profile, tier, today = new Date()) {
  const d = datesPrintemps(profile, today);
  const mois = (id) => moisAction(id, d.cle, profile);
  const naturel = profile?.objectif === "naturel";
  const robot = hasRobotTondeuse(profile);
  const hauteur = TONTE.types[TONTE.alias[profile?.pelouse] || "universel"].printemps;
  const starter = mois("engrais_starter"), antimousse = mois("antimousse"), desherbage = mois("desherbage"), ete = mois("engrais_ete");
  const scarif = mois("scarification").length > 0; // gazon d'ombre : pas de scarification, aération à la place
  const nord = d.cle === "nord" || d.cle === "nord_est";

  const etapes = [
    { cle: "revision", icone: robot ? "🤖" : "🔧", date: d.revision,
      label: robot ? "Remise en route du robot" : "Révision de la tondeuse",
      detail: robot ? "Nettoyage, lames neuves, mise à jour, hauteur de coupe haute." : "Lame affûtée et tondeuse révisée avant le rush du printemps." },
    starter.length && { cle: "starter", icone: "🌱", mois: starter,
      label: naturel ? "Engrais organique de printemps" : "Engrais de démarrage",
      detail: `${naturel ? "Farine de corne ou guano" : "NPK 12-5-5 organo-minéral, 30-40 g/m²"}, par temps doux (au moins ${nord ? 10 : 8} °C) et sans gel.` },
    { cle: "tonte", icone: "✂️", date: d.tonte, label: "Première tonte",
      detail: `En haut de la fourchette de printemps de ton gazon (${hauteur} cm${naturel ? ", +1 cm en objectif naturel" : ""}), sans couper plus d'un tiers.` },
    antimousse.length && { cle: "antimousse", icone: "💊", mois: antimousse, label: "Anti-mousse, si mousse",
      detail: "Sur les zones moussues seulement, puis ratisser la mousse morte avant de regarnir." },
    scarif
      ? { cle: "scarification", icone: "🧹", date: d.scarif, label: "Scarification, si feutre ou mousse",
          detail: "Sinon, une aération suffit : jamais les deux en même temps." }
      : { cle: "aeration", icone: "🌀", mois: mois("aeration"), label: "Aération",
          detail: "Gazon d'ombre : aération plutôt que scarification." },
    { cle: "regarnissage", icone: "🌾", date: d.regarnissage, label: "Regarnissage des zones clairsemées",
      detail: "Sol griffé, ~25 g/m² de semences, puis sol gardé humide jusqu'à la levée : le parcours Regarnissage te guide jour par jour." },
    desherbage.length && { cle: "desherbage", icone: "🪴", mois: desherbage, label: "Désherbage manuel",
      detail: "Pissenlits et plantains arrachés avec leur racine, sol souple après une pluie." },
    ete.length && { cle: "ete", icone: "☀️", mois: ete, label: naturel ? "Engrais organique d'été" : "Engrais d'été",
      detail: "Bien espacé de l'engrais de démarrage, jamais sur sol détrempé." },
  ].filter(Boolean).map(e => {
    const debut = e.date || new Date(d.an, e.mois[0] - 1, 1);
    const fin = e.date || new Date(d.an, e.mois[e.mois.length - 1], 0); // dernier jour du dernier mois
    return { ...e, debut, passee: fin < minuit(today) };
  }).sort((a, b) => a.debut - b.debut);

  const surface = profile?.surface || 100;
  const acc = (cle) => AMAZON_PRODUCTS[cle]?.accessoires || {};
  const achats = [
    starter.length && ligneAchat("engraisStarter", profile, tier, surface),
    ligneAchat("regarnissage", profile, tier, surface),
    antimousse.length && ligneAchat("antiMousse", profile, tier, surface, { optionnel: "si mousse", phyto: true }),
    ete.length && ligneAchat("engraisEte", profile, tier, surface),
    scarif
      ? ligneAchat("verticut", profile, tier, surface, { materiel: true, optionnel: "si feutre ou mousse" })
      : ligneAchat("aeration", profile, tier, surface, { materiel: true, label: "Aérateur" }),
    starter.length && accessoire("epandeur", "Épandeur", acc("engraisStarter").epandeur),
    accessoire("rateau", "Râteau à gazon", ["eco", "standard"].includes(tier) ? acc("regarnissage").rateauEco : acc("regarnissage").rateauStandard),
    desherbage.length && ligneAchat("desherbage", profile, tier, surface, { materiel: true }),
  ].filter(Boolean);

  return { annee: d.an, zone: d.z.label, surface, etapes, achats };
}

// Suivi de la liste d'achats (profile.planPrintemps) : { annee, faits: { cle: { statut: "achete" | "deja", achat? } } }
export const faitsPlan = (profile, annee) =>
  profile?.planPrintemps?.annee === annee ? (profile.planPrintemps.faits || {}) : {};

export function marquerPlan(profile, annee, cle, fait) {
  const faits = { ...faitsPlan(profile, annee) };
  if (fait) faits[cle] = fait; else delete faits[cle];
  return { ...profile, planPrintemps: { annee, faits } };
}
