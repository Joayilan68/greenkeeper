// src/lib/actionsDuJour.js
// Actions d'entretien du jour : statuts de planEntretien.buildActions, alignés sur le parcours de semis en cours.
// Source unique de l'onglet « Aujourd'hui » et du résumé de l'accueil.
import { calcArrosage, getDebitMmH } from "./lawn";
import { buildActions } from "./planEntretien";
import { calcLawnScore } from "./lawnScore";

// Actions déconseillées sur un jeune gazon, jusqu'à la consolidation (phase 5 du parcours)
const AGRESSIVES_PH5 = ["desherbage", "antimousse", "aeration", "scarification", "verticut"];

export function actionsDuJour({ profile, weather, history, diagnostics, parcours, phaseP, month }) {
  // Débit d'arrosage : Supabase (profile.debit_arrosage_mmh) prioritaire sur localStorage
  const debitMmH = profile?.debit_arrosage_mmh || getDebitMmH();
  const arrosRaw = profile && weather ? calcArrosage(month, profile, weather, history, debitMmH) : null;
  const score = profile ? calcLawnScore({ weather, profile, history, month, diagnostics }).score : 70;
  const bruts = buildActions(profile, weather, history, score, month, arrosRaw) || [];

  // Parcours de semis ou de regarnissage en cours : il est la source de vérité, les actions incompatibles avec sa phase
  // sont bloquées (matrice agronomique) sans toucher à la logique d'entretien.
  //   - Tonte : bloquée avant la levée (phase 4)
  //   - Engrais et actions agressives : bloqués avant la consolidation (phase 5)
  //   - Biostimulant, arrosage, regarnissage : jamais bloqués (bénéfiques ou vitaux)
  const etapes = parcours?.etapes_validees;
  const premiereTonteFaite = !!(etapes && typeof etapes === "object" && !Array.isArray(etapes) && etapes.jalons?.premiere_tonte);
  const actionStatuses = !phaseP ? bruts : bruts.map((a) => {
    const id = a?.action?.id;
    const estTonte = id === "tonte";
    if (estTonte && phaseP.phase < 4) {
      return { ...a, status: "blocked", daysLeft: null,
        blockedReason: "🌱 Parcours semis — première tonte après la levée (~3 semaines)", parcoursBloque: true };
    }
    // Première tonte (phase 4, tant que le jalon n'est pas coché) : consigne adaptée « haute »
    if (estTonte && phaseP.phase === 4 && !premiereTonteFaite) {
      return { ...a,
        parcoursLabel: "Première tonte (haute)",
        parcoursDetail: "Coupez juste les pointes (~1/3 de la hauteur), lame bien affûtée, gazon sec. Les jeunes plants sont encore fragiles.",
      };
    }
    if (((typeof id === "string" && id.startsWith("engrais")) || AGRESSIVES_PH5.includes(id)) && phaseP.phase < 5) {
      return { ...a, status: "blocked", daysLeft: null,
        blockedReason: "🌱 Parcours semis — action déconseillée sur jeune gazon (après consolidation)", parcoursBloque: true };
    }
    // Arrosage pendant le parcours : piloté par la carte « Arrosage recommandé » du parcours ; le bouton reste pour
    // journaliser, sans le détail d'entretien classique (chiffres contradictoires avec la consigne de semis)
    if (id === "arrosage" && phaseP.phase < 5) {
      return { ...a, parcoursDetail: "Arrosez selon la consigne de votre parcours, puis journalisez ici." };
    }
    return a;
  });

  const recommended = actionStatuses.filter(a => a?.status === "recommended");
  // À prévoir : fait aujourd'hui d'abord, puis par délai croissant (sans délai en dernier)
  const rang = (a) => a.status === "done_today" ? -1 : a.daysLeft != null ? a.daysLeft : 9999;
  const prevoyez = actionStatuses
    .filter(a => ["done_today", "too_soon", "blocked", "exclusive"].includes(a?.status))
    .sort((a, b) => rang(a) - rang(b));
  const pasPrevu = actionStatuses.filter(a => a?.status === "off_season");

  return { debitMmH, arrosRaw, score, actionStatuses, recommended, prevoyez, pasPrevu };
}
