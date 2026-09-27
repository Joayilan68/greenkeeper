// src/lib/printemps.js
// Compte à rebours du printemps (tableau de bord, du 1er novembre à la 1re tonte) : dates indicatives de
// la zone climatique (src/lib/zonesGazon.json, partagé avec le moteur des parcours) ; la température
// réelle du sol (Premium) permet de voir si la pousse repart plus tôt.
import ZONES from "./zonesGazon.json";
import { zoneClimatique } from "./planEntretien";

const JOUR = 86400000;
const minuit = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function compteARebours(profile, today = new Date()) {
  const mois = today.getMonth() + 1;
  if (mois >= 6 && mois <= 10) return null; // saison en cours : le plan d'entretien suffit
  const z = ZONES[zoneClimatique(profile)] || ZONES.centre;
  const an = mois >= 11 ? today.getFullYear() + 1 : today.getFullYear();
  const date = ([m, j], decalage = 0) => new Date(an, m - 1, j + decalage);

  const tonte = date(z.premiereTonte);
  const scarif = date(z.premiereTonte, 14);
  // Regarnir juste après la scarification, jamais avant l'ouverture de la fenêtre de semis
  const regarnissage = new Date(Math.max(date(z.printemps.debutOptimal), scarif.getTime() + 2 * JOUR));
  const jours = Math.round((tonte - minuit(today)) / JOUR);
  if (jours < -7) return null; // printemps lancé : le plan d'entretien prend le relais

  const jalons = [
    { icone: "🔧", label: "Révision de la tondeuse, lame affûtée", date: date(z.premiereTonte, -21) },
    { icone: "✂️", label: "Première tonte (6 cm pour un gazon universel)", date: tonte },
    { icone: "🧹", label: "Scarification si feutre ou mousse", date: scarif },
    { icone: "🌾", label: "Regarnissage et engrais de démarrage", date: regarnissage },
  ].filter(j => j.date >= minuit(today)).sort((a, b) => a.date - b.date).slice(0, 3);

  const debut = new Date(an - 1, 10, 1); // 1er novembre
  const progression = Math.min(1, Math.max(0, (today - debut) / (tonte - debut)));
  return { zone: z.label, soilMin: z.soilMin, jours, tonte, jalons, progression };
}
