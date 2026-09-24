// src/lib/roadmap.js
// Lecture du Google Sheet « Suivi de Projet » et préparation des vues de l'onglet Roadmap (Pilotage).
// Le Sheet est la source unique : colonnes A→H = Phase | Étape | Description | Statut | Priorité | Date cible | Notes | % Avancement.
// Lu en UNFORMATTED_VALUE : les % arrivent en fraction (0.5), les dates saisies en numéro de série.

export const SHEET_ID        = "1RzCsdKNeBtYjWkAUXPm7X7Xg1nA1dufq6ka2jzhMJBM";
export const SHEETS_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
export const OBJECTIF_PCT    = 80;   // seuil d'avancement global à ne pas franchir vers le bas
export const HORIZON_JOURS   = 90;   // fenêtre « Échéances à venir »

const DAY = 86400000;
const MOIS = {
  janv:0, janvier:0, fev:1, fevr:1, fevrier:1, mars:2, avr:3, avril:3, mai:4, juin:5,
  juil:6, juillet:6, aout:7, sept:8, septembre:8, oct:9, octobre:9, nov:10, novembre:10, dec:11, decembre:11,
  ete:7, // « Été 2026 » → fin août
};

const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const endOfMonth = (y, m) => new Date(y, m + 1, 0);

// Numéro de série Sheets/Excel → Date. Les cellules datées du fichier sont affichées en « mmm-yy » :
// on les lit comme « ce mois-là » → échéance = fin du mois.
function serialToDate(n) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * DAY);
  return endOfMonth(d.getUTCFullYear(), d.getUTCMonth());
}

// Date cible libre → date d'échéance (ou null si non datée : « Avant lancement », « J1-J30 », « À arbitrer »…)
export function parseEcheance(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return serialToDate(raw);
  const s = norm(raw);

  // Plage « Sept 2026 → Mai 2027 » : on retient la fin
  const part = s.includes("→") ? s.split("→").pop().trim() : s;

  // jj/mm/aaaa (éventuellement « ~16/08/2026 » ou « 06-07/08/2026 ») → dernière date trouvée
  const days = [...part.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)];
  if (days.length) { const [, d, m, y] = days[days.length - 1]; return new Date(+y, +m - 1, +d); }

  // aaaa-mm-jj (valeur formatée éventuelle) → fin du mois, comme les cellules « mmm-yy »
  const iso = part.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return endOfMonth(+iso[1], +iso[2] - 1);

  // « T4 2026 » → fin du trimestre
  const q = part.match(/t([1-4])\s*(\d{4})/);
  if (q) return endOfMonth(+q[2], +q[1] * 3 - 1);

  // « Sept 2026 », « Août 2026 », « Été 2026 »
  const my = part.match(/([a-z]+)\.?\s*(\d{4})/);
  if (my && MOIS[my[1]] !== undefined) return endOfMonth(+my[2], MOIS[my[1]]);

  return null;
}

export function formatEcheance(raw) {
  if (typeof raw === "number") {
    const d = serialToDate(raw);
    return d.toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
  }
  return String(raw ?? "").trim();
}

// % : fraction (0.5), nombre (50) ou texte (« 50% ») → 0-100 ; null si non chiffré (« N/A »)
export function parsePct(raw) {
  if (typeof raw === "number") return Math.round(raw <= 1 ? raw * 100 : raw);
  const m = String(raw ?? "").replace(",", ".").match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Math.round(v <= 1 && !String(raw).includes("%") ? v * 100 : v);
}

export function statutKind(statut) {
  const s = norm(statut);
  if (s.includes("termine")) return "done";
  if (s.includes("en cours")) return "doing";
  if (s.includes("report")) return "paused";
  if (s.includes("verifier")) return "check";
  return "todo";
}

export function prioriteRank(p) {
  const s = String(p ?? "");
  if (s.includes("🔴")) return 0;
  if (s.includes("🟠")) return 1;
  if (s.includes("🟡")) return 2;
  if (s.includes("🟢")) return 3;
  return 4;
}

// Les lignes « Sem xx/xx » ou « [Sem xx] » sont des sprints hebdo : regroupées sous « Sprints »
export function themeOf(phase) {
  const p = String(phase ?? "").trim();
  if (!p) return "Divers";
  if (/^\[?\s*sem\b/i.test(p)) return "Sprints";
  return p;
}

// values = tableau de lignes renvoyé par l'API Sheets (valeurs non formatées)
export function parseRoadmap(values) {
  const rows = values || [];
  const dateLine  = String(rows.slice(0, 4).map(r => r?.[0] ?? "").join(" "));
  const dateMatch = dateLine.match(/Mis à jour le (\d{2}\/\d{2}\/\d{4})/);
  const headerIdx = rows.findIndex(r => String(r?.[0] ?? "").trim() === "Phase");
  if (headerIdx < 0) throw new Error("Format inattendu — colonne Phase introuvable");

  const tasks = [];
  let pctGlobal = null;
  for (const cols of rows.slice(headerIdx + 1)) {
    const [phase = "", etape = "", desc = "", statut = "", priorite = "", dateCible = "", notes = "", pctRaw = ""] = cols || [];
    if (String(phase).includes("TOTAL")) { const p = parsePct(pctRaw); pctGlobal = p; continue; }
    if (!String(etape).trim()) continue;
    const horsCalcul = norm(phase).includes("hors calcul");
    tasks.push({
      phase:     String(phase).trim(),
      theme:     themeOf(phase),
      etape:     String(etape).trim(),
      desc:      String(desc).trim(),
      statut:    String(statut).trim(),
      kind:      statutKind(statut),
      priorite:  String(priorite).trim(),
      prio:      prioriteRank(priorite),
      dateLabel: formatEcheance(dateCible),
      echeance:  parseEcheance(dateCible),
      notes:     String(notes).trim(),
      pct:       parsePct(pctRaw),
      horsCalcul,
    });
  }

  // Filet de sécurité si la cellule TOTAL est vide : même calcul que la formule du Sheet (moyenne des %)
  if (pctGlobal === null) {
    const pcts = tasks.filter(t => !t.horsCalcul && t.pct !== null).map(t => t.pct);
    pctGlobal = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  }
  return { tasks, pctGlobal, majDate: dateMatch ? dateMatch[1] : null };
}

const byPrioThenDate = (a, b) =>
  a.prio - b.prio || (a.echeance?.getTime() ?? Infinity) - (b.echeance?.getTime() ?? Infinity);
const byDateThenPrio = (a, b) =>
  (a.echeance?.getTime() ?? Infinity) - (b.echeance?.getTime() ?? Infinity) || a.prio - b.prio;

export function buildRoadmapView(tasks, today = new Date()) {
  const t0      = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Horizon = fin du mois atteint à +90 j (inclut ainsi les échéances « T4 » au 31/12)
  const h       = new Date(t0.getTime() + HORIZON_JOURS * DAY);
  const horizon = endOfMonth(h.getFullYear(), h.getMonth());
  const actives = tasks.filter(t => !t.horsCalcul);
  const open    = actives.filter(t => t.kind !== "done" && t.kind !== "paused");

  const retard  = open.filter(t => t.echeance && t.echeance < t0).sort(byPrioThenDate);
  const aVenir  = open.filter(t => t.echeance && t.echeance >= t0 && t.echeance <= horizon).sort(byDateThenPrio);
  const enCours = actives.filter(t => t.kind === "doing").sort((a, b) => a.prio - b.prio || (b.pct ?? 0) - (a.pct ?? 0));
  const plusTard = open.filter(t => t.echeance && t.echeance > horizon).sort(byDateThenPrio);
  const sansDate = open.filter(t => !t.echeance).sort(byPrioThenDate);
  const reportes = tasks.filter(t => t.kind === "paused");

  // Échéances à venir regroupées par mois
  const aVenirParMois = [];
  for (const t of aVenir) {
    const label = t.echeance.toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
    const last  = aVenirParMois[aVenirParMois.length - 1];
    if (last?.label === label) last.tasks.push(t); else aVenirParMois.push({ label, tasks:[t] });
  }

  // Avancement par thème, calculé depuis le fichier (moyenne des %, comme le total)
  const themes = new Map();
  for (const t of actives) {
    if (!themes.has(t.theme)) themes.set(t.theme, []);
    themes.get(t.theme).push(t);
  }
  const parTheme = [...themes.entries()].map(([theme, list]) => {
    const pcts = list.filter(t => t.pct !== null).map(t => t.pct);
    return {
      theme,
      tasks: list,
      done:  list.filter(t => t.kind === "done").length,
      total: list.length,
      pct:   pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
      open:  list.filter(t => t.kind !== "done").length,
    };
  }).sort((a, b) => a.pct - b.pct || b.open - a.open);

  const counts = {
    done:  actives.filter(t => t.kind === "done").length,
    doing: actives.filter(t => t.kind === "doing").length,
    todo:  actives.filter(t => t.kind === "todo" || t.kind === "check").length,
  };

  return { retard, aVenirParMois, aVenirCount: aVenir.length, enCours, plusTard, sansDate, reportes, parTheme, counts };
}
