// api/suiviDiagnostic.cjs
// Diagnostic de suivi pour la notification du matin (api/send.js → notificationEngine) : même règle que l'app
// (src/lib/suiviDiagnostic.js, délais de src/lib/suiviDiagnostic.json). Une nouvelle photo est proposée au bout du
// délai d'une action importante, pendant fenetreJours, si un diagnostic a été fait avant l'action et pas depuis.
const SUIVI = require("../src/lib/suiviDiagnostic.json");

const JOUR = 86400000;
const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// « jj/mm/aaaa » (historique), date ISO (diagnostic) ou horodatage → numéro du jour du calendrier
function jour(d) {
  const m = typeof d === "string" && d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const t = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(d);
  return isNaN(t) ? null : Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / JOUR;
}

// history : [{ action, date }] ; diagnostics : [{ date, score }] (score null = photo inexploitable, ignorée)
function suiviAProposer({ history, diagnostics, maintenant = Date.now() }) {
  const auj = jour(maintenant), fenetre = SUIVI.fenetreJours;
  const diags = (diagnostics || []).map(d => ({ t: jour(d.date), score: d.score })).filter(d => d.t && typeof d.score === "number");
  const actions = (history || []).map(h => {
    const regle = SUIVI.actions.find(a => a.mots.some(m => norm(h.action).includes(m)));
    const t = regle ? jour(h.date) : null;
    return t ? { ...regle, t } : null;
  }).filter(Boolean).sort((a, b) => b.t - a.t);
  for (const a of actions) {
    const echeance = a.t + a.jours;
    if (auj < echeance || auj > echeance + fenetre) continue;
    const avant = diags.some(d => d.t <= a.t && d.t >= a.t - SUIVI.avantJours);
    if (!avant || diags.some(d => d.t > echeance - fenetre)) continue;
    return { libelle: a.libelle, jours: auj - a.t };
  }
  return null;
}

module.exports = { suiviAProposer };
