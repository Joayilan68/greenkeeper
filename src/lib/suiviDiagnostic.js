// src/lib/suiviDiagnostic.js
// Diagnostic de suivi (avant / après) : après une action importante de l'historique (regarnissage, scarification,
// anti-mousse, désherbage), une nouvelle photo est proposée au bout du délai de suiviDiagnostic.json, pendant
// fenetreJours, puis comparée au dernier diagnostic fait avant l'action (au plus avantJours avant).
// Même règle pour la notification du matin : api/suiviDiagnostic.cjs.
// Diagnostics attendus sous la forme { date, score, imageUrl, problemes } (score null = photo inexploitable, ignorée).
import SUIVI from "./suiviDiagnostic.json";

const JOUR = 86400000;
const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// « jj/mm/aaaa » (historique), date ISO (diagnostic) ou horodatage → numéro du jour du calendrier (sans effet du
// changement d'heure)
function jour(d) {
  const m = typeof d === "string" && d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const t = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(d);
  return isNaN(t) ? null : Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / JOUR;
}
// Numéro de jour → date à afficher (toLocaleDateString avec timeZone « UTC »)
export const dateDuJour = (n) => new Date(n * JOUR);

// Actions suivies de l'historique, de la plus récente à la plus ancienne
function actionsSuivies(history) {
  return (history || []).map(h => {
    const regle = SUIVI.actions.find(a => a.mots.some(m => norm(h.action).includes(m)));
    const t = regle ? jour(h.date) : null;
    return t ? { ...regle, t } : null;
  }).filter(Boolean).sort((a, b) => b.t - a.t);
}

const diagsDates = (diagnostics) => (diagnostics || [])
  .map(d => ({ ...d, t: jour(d.date) }))
  .filter(d => d.t && typeof d.score === "number");

// Dernier diagnostic fait avant l'action (ou le jour même), au plus avantJours avant
const diagnosticAvant = (action, diags) => diags
  .filter(d => d.t <= action.t && d.t >= action.t - SUIVI.avantJours)
  .sort((a, b) => b.t - a.t)[0] || null;

// Suivi à proposer aujourd'hui : délai atteint depuis moins de fenetreJours, diagnostic d'avant disponible et pas
// encore de photo de suivi (aucun diagnostic depuis l'échéance moins fenetreJours)
export function suiviAProposer({ history, diagnostics, maintenant = Date.now() }) {
  const auj = jour(maintenant), diags = diagsDates(diagnostics), fenetre = SUIVI.fenetreJours;
  for (const a of actionsSuivies(history)) {
    const echeance = a.t + a.jours;
    if (auj < echeance || auj > echeance + fenetre) continue;
    const avant = diagnosticAvant(a, diags);
    if (!avant || diags.some(d => d.t > echeance - fenetre)) continue;
    return { libelle: a.libelle, dateAction: a.t, jours: auj - a.t, avant };
  }
  return null;
}

// Problèmes comparés par leurs mots significatifs (racine de 6 lettres) : « Mousse » = « Présence de mousse »
const MOTS_VIDES = new Set(["gazon", "pelouse", "zones", "presence", "probleme", "legere", "forte", "localise", "localisee"]);
const racines = (p) => new Set(norm(`${p.nom || ""} ${p.id || ""}`).split(/[^a-z]+/)
  .filter(m => m.length >= 5 && !MOTS_VIDES.has(m)).map(m => m.slice(0, 6)));
const memeProbleme = (a, b) => { const ra = racines(a); return [...racines(b)].some(r => ra.has(r)); };

// Comparaison d'un nouveau diagnostic avec celui d'avant la dernière action suivie, si la photo est prise entre
// l'échéance moins fenetreJours et l'échéance plus apresJours ; null sinon
export function comparaisonSuivi({ history, diagnostics, apres, maintenant = Date.now() }) {
  if (typeof apres?.score !== "number") return null;
  const auj = jour(maintenant), diags = diagsDates(diagnostics);
  for (const a of actionsSuivies(history)) {
    const age = auj - a.t;
    if (age < a.jours - SUIVI.fenetreJours || age > a.jours + SUIVI.apresJours) continue;
    const avant = diagnosticAvant(a, diags);
    if (!avant) continue;
    const pa = avant.problemes || [], pb = apres.problemes || [];
    return {
      libelle: a.libelle, dateAction: a.t, jours: age, avant, ecart: apres.score - avant.score,
      regles:   pa.filter(p => !pb.some(q => memeProbleme(p, q))).map(p => p.nom),
      restants: pa.filter(p => pb.some(q => memeProbleme(p, q))).map(p => p.nom),
      nouveaux: pb.filter(q => !pa.some(p => memeProbleme(p, q))).map(q => q.nom),
    };
  }
  return null;
}
