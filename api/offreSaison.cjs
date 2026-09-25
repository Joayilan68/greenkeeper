// api/offreSaison.cjs
// Offre saisonnière côté serveur — mêmes règles que src/lib/offreSaison.js (config partagée
// src/lib/offreSaison.json) : annuel à 19,99 € la 1re année pendant les périodes creuses.
const config = require("../src/lib/offreSaison.json");

function offreEnCours(date = new Date()) {
  const md  = date.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }).slice(5); // "MM-JJ"
  const fen = config.fenetres.find(f => f.debut <= f.fin
    ? md >= f.debut && md <= f.fin
    : md >= f.debut || md <= f.fin); // fenêtre à cheval sur deux années (hiver)
  if (!fen) return null;
  const [m, j] = fen.fin.split("-");
  return { ...fen, finLabel: `${j}/${m}` };
}

// Bon de réduction Stripe de la 1re année (créé à la première utilisation)
async function couponSaison(stripe) {
  try {
    return (await stripe.coupons.retrieve(config.couponStripe)).id;
  } catch {
    return (await stripe.coupons.create({
      id: config.couponStripe, amount_off: config.remiseCentimes, currency: "eur", duration: "once",
      name: `Offre saison — 1re année à ${String(config.prixOffre).replace(".", ",")} €`,
    })).id;
  }
}

module.exports = { OFFRE: config, offreEnCours, couponSaison };
