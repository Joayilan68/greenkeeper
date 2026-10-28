// src/lib/offreSaison.js
// Prix de Premium (mensuel, annuel) et offre saisonnière : abonnement annuel à prixOffre la 1re année au lieu de
// prixAnnuel pendant les périodes creuses de chaque année (« fenetres »). Source unique : offreSaison.json,
// partagé avec le serveur (api/create-checkout.js vérifie le prix Stripe et applique la remise, api/send.js envoie les
// emails) ; les prix Stripe correspondants sont dans les variables STRIPE_PRICE_MONTHLY et STRIPE_PRICE_YEARLY.
import config from "./offreSaison.json";

export const OFFRE = config;

// Prix affiché à la française : « 2,99 € »
export const enEuros = (n) => `${n.toFixed(2).replace(".", ",")} €`;

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
