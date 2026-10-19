// src/lib/suiviDiagnostic.js
// Diagnostic de suivi (avant / après), entièrement sur la page Diagnostic : après un diagnostic, l'utilisateur y
// indique les travaux faits (regarnissage, scarification, anti-mousse, désherbage) et leur date ; au bout du délai de
// suiviDiagnostic.json (le plus long des travaux indiqués), une nouvelle photo est proposée pendant fenetreJours, puis
// comparée à ce diagnostic.
// Diagnostics attendus sous la forme { id, date, score, imageUrl, problemes, travaux } (score null = photo
// inexploitable, ignorée ; travaux = { actions: [id], date: "AAAA-MM-JJ" } ou null, enregistré par api/diagnostics.js).
import SUIVI from "./suiviDiagnostic.json";

const JOUR = 86400000;

// « AAAA-MM-JJ » (date des travaux), date ISO (diagnostic) ou horodatage → numéro du jour du calendrier (sans effet du
// changement d'heure)
function jour(d) {
  const m = typeof d === "string" && d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) / JOUR;
  const t = new Date(d);
  return isNaN(t) ? null : Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / JOUR;
}
// Numéro de jour → date à afficher (toLocaleDateString avec timeZone « UTC ») ou à saisir (« AAAA-MM-JJ »)
export const dateDuJour = (n) => new Date(n * JOUR);
export const saisieDuJour = (n) => dateDuJour(n).toISOString().slice(0, 10);
export const aujourdhui = (maintenant = Date.now()) => jour(maintenant);

export const ACTIONS_SUIVIES = SUIVI.actions;
export const AVANT_JOURS = SUIVI.avantJours;

// Travaux indiqués sur un diagnostic : date, délai (le plus long des travaux) et libellé (« ta scarification et ton
// regarnissage »)
export function travauxDe(d) {
  const actions = SUIVI.actions.filter(a => d?.travaux?.actions?.includes(a.id));
  const t = actions.length ? jour(d.travaux.date) : null;
  if (!t) return null;
  const jours = Math.max(...actions.map(a => a.jours));
  return { t, jours, echeance: t + jours, fin: t + jours + SUIVI.fenetreJours, pluriel: actions.length > 1,
    libelle: actions.map(a => a.libelle).join(", ").replace(/, ([^,]*)$/, " et $1") };
}

const diagsDates = (diagnostics) => (diagnostics || [])
  .map(d => ({ ...d, t: jour(d.date) }))
  .filter(d => d.t && typeof d.score === "number")
  .sort((a, b) => b.t - a.t);

// Diagnostics portant des travaux, des travaux les plus récents aux plus anciens
const suivis = (diags) => diags.map(d => ({ ...travauxDe(d), avant: d })).filter(s => s.t).sort((a, b) => b.t - a.t);

// Suivi à proposer aujourd'hui : délai atteint depuis moins de fenetreJours et pas encore de photo de suivi (aucun
// diagnostic depuis l'échéance moins fenetreJours)
export function suiviAProposer({ diagnostics, maintenant = Date.now() }) {
  const auj = jour(maintenant), diags = diagsDates(diagnostics);
  for (const s of suivis(diags)) {
    if (auj < s.echeance || auj > s.fin) continue;
    if (diags.some(d => d.t > s.echeance - SUIVI.fenetreJours)) continue;
    return { libelle: s.libelle, pluriel: s.pluriel, dateAction: s.t, jours: auj - s.t, avant: s.avant };
  }
  return null;
}

// Dernier diagnostic (photo exploitable) : travaux à indiquer s'il a moins de avantJours et n'en porte pas encore,
// travaux notés tant que la photo de suivi n'est pas proposée
export function travauxDuDernier({ diagnostics, maintenant = Date.now() }) {
  const dernier = diagsDates(diagnostics)[0], auj = jour(maintenant);
  if (!dernier) return null;
  const travaux = travauxDe(dernier);
  if (travaux) return auj < travaux.echeance ? { diagnostic: dernier, travaux } : null;
  return auj - dernier.t <= SUIVI.avantJours ? { diagnostic: dernier, travaux: null } : null;
}

// Problèmes comparés par leurs mots significatifs (racine de 6 lettres) : « Mousse » = « Présence de mousse »
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MOTS_VIDES = new Set(["gazon", "pelouse", "zones", "presence", "probleme", "legere", "forte", "localise", "localisee"]);
const racines = (p) => new Set(norm(`${p.nom || ""} ${p.id || ""}`).split(/[^a-z]+/)
  .filter(m => m.length >= 5 && !MOTS_VIDES.has(m)).map(m => m.slice(0, 6)));
const memeProbleme = (a, b) => { const ra = racines(a); return [...racines(b)].some(r => ra.has(r)); };

// Comparaison d'un nouveau diagnostic avec celui des derniers travaux indiqués, si la photo est prise entre
// l'échéance moins fenetreJours et l'échéance plus apresJours ; null sinon
export function comparaisonSuivi({ diagnostics, apres, maintenant = Date.now() }) {
  if (typeof apres?.score !== "number") return null;
  const auj = jour(maintenant);
  for (const s of suivis(diagsDates(diagnostics))) {
    const age = auj - s.t;
    if (age < s.jours - SUIVI.fenetreJours || age > s.jours + SUIVI.apresJours) continue;
    const pa = s.avant.problemes || [], pb = apres.problemes || [];
    return {
      libelle: s.libelle, dateAction: s.t, jours: age, avant: s.avant, ecart: apres.score - s.avant.score,
      regles:   pa.filter(p => !pb.some(q => memeProbleme(p, q))).map(p => p.nom),
      restants: pa.filter(p => pb.some(q => memeProbleme(p, q))).map(p => p.nom),
      nouveaux: pb.filter(q => !pa.some(p => memeProbleme(p, q))).map(q => q.nom),
    };
  }
  return null;
}
