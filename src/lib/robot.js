// src/lib/robot.js
// Robot tondeuse connecté (Husqvarna Automower) : état lisible et proposition du mode « Proposition ».
// La proposition suit la tonte telle que la calcule « Aujourd'hui » (calendrier unique, météo, 1re tonte de la
// zone, parcours de semis) : le robot n'est jamais invité à tondre quand l'app le déconseille.

const ACTIVITES = {
  mowing: "tond", going_home: "rentre à sa base", charging: "en charge à sa base", leaving: "part tondre",
  parked_in_cs: "garé à sa base", stopped_in_garden: "arrêté sur la pelouse",
};

export function etatRobot(r) {
  if (!r.connecte) return "hors ligne (pas de réseau)";
  if (r.erreur || ["error", "fatal_error", "error_at_power_up"].includes(r.etat)) return `⚠️ en erreur (code ${r.erreur}) : voir l'app Husqvarna`;
  if (r.etat === "off") return "éteint";
  if (r.etat === "paused") return "en pause";
  return ACTIVITES[r.activite] || "état inconnu";
}

const auRepos = (r) => r.force === "force_park" || r.restriction === "park_override";

// tonte = statut de l'action « tonte » de buildActions (après adaptation au parcours dans Today)
export function propositionRobot(r, tonte) {
  if (!r || !tonte || !r.connecte || r.erreur || r.etat === "off") return null;
  const interdite = tonte.status === "off_season" || tonte.status === "blocked";
  if (interdite && !auRepos(r)) {
    const long = tonte.status === "off_season" || tonte.parcoursBloque || String(tonte.blockedReason || "").startsWith("Trop tôt");
    return {
      commande: long ? "repos_long" : "repos_journee",
      bouton: long ? "⏸️ Mettre au repos jusqu'à nouvel ordre" : "⏸️ Mettre au repos jusqu'à demain 7 h",
      raison: tonte.blockedReason || "Hors saison de tonte dans ta zone",
    };
  }
  if (!interdite && auRepos(r)) return { commande: "reprendre", bouton: "▶️ Relancer son planning", raison: "Rien n'empêche la tonte aujourd'hui" };
  return null;
}
