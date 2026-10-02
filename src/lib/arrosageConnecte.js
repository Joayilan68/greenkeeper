// src/lib/arrosageConnecte.js
// Arrosage connecté (Gardena, Rachio) : propositions du mode « Proposition », toutes issues du calcul d'arrosage du
// jour (lawn.js calcArrosage : dose, durée, pluie déduite) et du calendrier unique. Lancement manuel seulement le
// matin, dans les heures de la base (onglet « Arrosage Précis » : 5 h-8 h, 6 h-8 h en sol argileux ou compacté).
import ARROSAGE from "./arrosageSol.json";

const fenetreMatin = (sol) => ({ debut: ["argileux", "compacte"].includes(sol) ? 6 : 5, fin: 8 });

// eq = état de l'arrosage (api/objets.js) ; arros / arrosSkip = calcArrosage du jour ; horsSaison = hors des mois d'arrosage
export function propositionsArrosage(eq, { arros, arrosSkip, horsSaison, sol, heure = new Date().getHours() }) {
  if (!eq || !eq.zones?.length) return null;
  const gardena = eq.marque === "gardena";
  const pluie = ["precip", "precip_partial"].includes(arrosSkip?.reason);
  if (horsSaison) return eq.suspendu === "veille" ? null
    : { message: "Hors saison d'arrosage dans ta zone.", boutons: [{ commande: "veille", label: "💤 Mettre l'arrosage en veille pour l'hiver" }] };
  if (eq.suspendu === "veille" || (gardena && eq.suspendu && !pluie)) return {
    message: eq.suspendu === "veille" ? "La saison d'arrosage a repris." : "La pluie est passée : les programmes peuvent reprendre.",
    boutons: [{ commande: "reprendre", label: "▶️ Reprendre les programmes" }],
  };
  if (pluie) return eq.suspendu ? null : {
    message: "La pluie suffit aujourd'hui : inutile que les programmes arrosent.",
    boutons: [{ commande: "suspendre", label: gardena ? "⏸️ Suspendre les programmes" : "⏸️ Suspendre 24 h (pluie)" }],
  };
  if (!arros?.minutes) return null;
  const { debut, fin } = fenetreMatin(sol);
  // Au-delà d'une heure par zone, la dose est donnée en 2 passages (aussi la règle des sols argileux et compactés)
  const passages = arros.minutes > 60 || ["argileux", "compacte"].includes(sol) ? 2 : 1;
  const minutes = Math.min(60, Math.ceil(arros.minutes / passages));
  const dose = `${String(arros.mm).replace(".", ",")} mm, soit ${passages > 1 ? `2 passages de ${minutes} min` : `${minutes} min`} par zone`;
  if (heure < debut || heure >= fin) return {
    message: `Arrosage conseillé demain matin entre ${debut} h et ${fin} h : ${dose}. Ton programmateur peut s'en charger, ou valide-le ici à ce moment-là.`,
    boutons: [],
  };
  return {
    message: `Besoin du jour : ${dose}${ARROSAGE[sol] ? ` (repère pour ton sol : ${ARROSAGE[sol].split(",")[0]})` : ""}. Lance une zone à la fois${passages > 1 ? ", puis relance-la une 2e fois avant 8 h" : ""}.`,
    boutons: eq.zones.map(z => ({ commande: "arroser", zone: z.id, minutes, label: `▶️ ${z.nom} : ${minutes} min` })),
  };
}
