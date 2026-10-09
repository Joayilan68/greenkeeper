// src/lib/robot.js
// Robot tondeuse connecté (Husqvarna Automower, Gardena SILENO) : état lisible et proposition du mode « Proposition ».
// La proposition suit la tonte telle que la calcule « Aujourd'hui » (calendrier unique, météo, 1re tonte de la
// zone, parcours de semis) : le robot n'est jamais invité à tondre quand l'app le déconseille. Les jours où il peut
// tondre, l'app propose d'ajuster sa hauteur de coupe à celle de la saison (base, « Tonte Précise »).
import HAUTEURS from "./automowerHauteurs.json";
import { hauteurSaison } from "./planEntretien";

const ACTIVITES = {
  mowing: "tond", going_home: "rentre à sa base", charging: "en charge à sa base", leaving: "part tondre",
  parked_in_cs: "garé à sa base", stopped_in_garden: "arrêté sur la pelouse",
};

export function etatRobot(r) {
  if (!r.connecte) return "hors ligne (pas de réseau)";
  if (r.erreur || ["error", "fatal_error", "error_at_power_up"].includes(r.etat)) return `⚠️ en erreur (code ${r.erreur}) : voir l'app ${r.marque === "gardena" ? "Gardena smart" : "Husqvarna"}`;
  if (r.etat === "off") return "éteint";
  if (r.etat === "paused") return "en pause";
  return ACTIVITES[r.activite] || "état inconnu";
}

const auRepos = (r) => r.force === "force_park" || r.restriction === "park_override";
const cmTexte = (cm) => String(cm).replace(".", ",");

// Plage de hauteur du modèle (cm) pour un Automower à réglage électrique, sinon null (automowerHauteurs.json)
export function plageRobot(r) {
  const modele = String(r?.modele || "").toUpperCase();
  if (r?.marque === "gardena" || !modele || new RegExp(HAUTEURS.manuels).test(modele)) return null;
  return HAUTEURS.modeles.find(m => new RegExp(m.motif).test(modele)) || null;
}
// Niveau de coupe 1-9 de l'API ↔ centimètres, réparti sur la plage du modèle, arrondi au demi-centimètre
export const cmDuNiveau = (niveau, p) => Math.round((p.min + (p.max - p.min) * (niveau - 1) / 8) * 2) / 2;
const niveauPourCm = (cm, p) => Math.min(9, Math.max(1, Math.round((cm - p.min) / ((p.max - p.min) / 8)) + 1));

// Réglage proposé : milieu de la hauteur de la saison (+1 cm en objectif naturel), borné à la plage du robot
function propositionHauteur(r, profile, month) {
  const p = plageRobot(r);
  if (!p || typeof r.hauteur !== "number") return null;
  const saison = hauteurSaison(profile, month);
  const [bas, haut = bas] = saison.split("-").map(v => parseFloat(v.replace(",", ".")));
  const naturel = profile?.objectif === "naturel";
  const vise = (bas + haut) / 2 + (naturel ? 1 : 0);
  const niveau = niveauPourCm(vise, p);
  if (niveau === r.hauteur) return null;
  const cm = cmDuNiveau(niveau, p);
  const nomSaison = month >= 6 && month <= 8 ? "en été" : month >= 9 ? "en automne" : "au printemps";
  const borne = vise > p.max ? ` Ton robot ne monte pas au-delà de ${cmTexte(p.max)} cm.` : vise < p.min ? ` Ton robot ne descend pas sous ${cmTexte(p.min)} cm.` : "";
  return {
    commande: "hauteur", niveau,
    bouton: `📏 Régler la coupe sur ${cmTexte(cm)} cm`,
    raison: `Hauteur conseillée ${nomSaison} pour ton gazon : ${saison} cm${naturel ? " (+1 cm, objectif naturel)" : ""}. Ton robot coupe à ${cmTexte(cmDuNiveau(r.hauteur, p))} cm.${borne}`,
  };
}

// tonte = statut de l'action « tonte » de buildActions (après adaptation au parcours dans Today) ;
// repos ou relance d'abord, sinon réglage de la hauteur de coupe
export function propositionRobot(r, tonte, { profile, month } = {}) {
  if (!r || !tonte || !r.connecte || r.erreur || r.etat === "off") return null;
  const interdite = tonte.status === "off_season" || tonte.status === "blocked";
  if (interdite && !auRepos(r)) {
    const long = tonte.status === "off_season" || tonte.parcoursBloque || String(tonte.blockedReason || "").startsWith("Trop tôt");
    return {
      commande: long ? "repos_long" : "repos_journee",
      bouton: long ? "⏸️ Mettre au repos jusqu'à nouvel ordre" : `⏸️ Mettre au repos jusqu'à demain ${r.marque === "gardena" ? "matin" : "7 h"}`,
      raison: tonte.blockedReason || "Hors saison de tonte dans ta zone",
    };
  }
  if (!interdite && auRepos(r)) return { commande: "reprendre", bouton: "▶️ Relancer son planning", raison: "Rien n'empêche la tonte aujourd'hui" };
  return interdite ? null : propositionHauteur(r, profile, month);
}
