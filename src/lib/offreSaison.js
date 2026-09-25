// src/lib/offreSaison.js
// Offre saisonnière : abonnement annuel à 19,99 € la 1re année (au lieu de 39,99 €) pendant les
// périodes creuses — 1/12 → 25/02 et 1/07 → 15/08, chaque année. Règles et prix : offreSaison.json,
// partagé avec le serveur (api/create-checkout.js applique la remise, api/send.js envoie les emails).
import config from "./offreSaison.json";

export const OFFRE = config;

// Fenêtre en cours à la date donnée (heure de Paris), ou null
export function offreEnCours(date = new Date()) {
  const md  = date.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }).slice(5); // "MM-JJ"
  const fen = config.fenetres.find(f => f.debut <= f.fin
    ? md >= f.debut && md <= f.fin
    : md >= f.debut || md <= f.fin); // fenêtre à cheval sur deux années (hiver)
  if (!fen) return null;
  const [m, j] = fen.fin.split("-");
  return { ...fen, finLabel: `${j}/${m}` };
}
