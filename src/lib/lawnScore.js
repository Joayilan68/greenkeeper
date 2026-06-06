// ─── LAWN HEALTH SCORE ENGINE v5 ─────────────────────────────────────────────
// REFACTOR juin 2026 : suppression de la lecture localStorage des diagnostics.
// Les diagnostics sont désormais passés en paramètre depuis le hook useDiagnostics
// qui les charge depuis Supabase (source de vérité unique multi-device).
// ─────────────────────────────────────────────────────────────────────────────
import { MONTHLY_PLAN } from "./lawn";

const DIAG_MAX_AGE = 7;

function daysSince(dateStr) {
  const parts = dateStr?.split('/');
  if (!parts || parts.length !== 3) return 999;
  const date = new Date(parts[2], parts[1]-1, parts[0]);
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function daysSinceISO(isoStr) {
  if (!isoStr) return 999;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / (1000 * 60 * 60 * 24));
}

function lastAction(history, keyword) {
  const found = history?.filter(h => h.action?.toLowerCase().includes(keyword.toLowerCase()));
  if (!found?.length) return 999;
  return Math.min(...found.map(h => daysSince(h.date)));
}

// ── Récupère le diagnostic récent valide depuis le tableau fourni ──────────
// `diagnostics` est attendu trié par date décroissante (le plus récent en [0])
// Format attendu : [{ date: ISO string, analysis: { score_visuel, emoji, etat_general, problemes } }, ...]
function pickLastDiagnostic(diagnostics) {
  if (!Array.isArray(diagnostics) || diagnostics.length === 0) return null;
  const last = diagnostics[0];
  if (!last?.date) return null;
  if (daysSinceISO(last.date) > DIAG_MAX_AGE) return null;
  return last;
}

export function calcLawnScore({ weather, profile, history = [], month, diagnostics = [] }) {
  const plan      = MONTHLY_PLAN[month];
  const issues    = [];
  const strengths = [];
  // Gazon synthétique supprimé de l'app — aucune branche spéciale nécessaire

  let deductEntretien  = 0;
  let deductNutriments = 0;
  let deductMeteo      = 0;
  let deductSol        = 0;

  // ── 1. TONTE — KB v4 : été=4j, printemps=5j, hiver=14j ─────────────────
  const tonteFreq     = month >= 5 && month <= 8 ? 4 : month >= 3 && month <= 10 ? 5 : 14;
  const derniereTonte = lastAction(history, "tonte");
  if (derniereTonte > tonteFreq * 3)      { deductEntretien += 25; issues.push({ icon:"✂️", label:`Tonte abandonnée depuis ${derniereTonte}j`, impact:-25 }); }
  else if (derniereTonte > tonteFreq * 2) { deductEntretien += 18; issues.push({ icon:"✂️", label:`Tonte très en retard (${derniereTonte}j)`, impact:-18 }); }
  else if (derniereTonte > tonteFreq + 2) { deductEntretien += 10; issues.push({ icon:"✂️", label:"Tonte en retard", impact:-10 }); }
  else if (derniereTonte <= tonteFreq)    { strengths.push({ icon:"✂️", label:"Tonte régulière ✓" }); }

  // ── 2. ENGRAIS — KB v4 : bloqué >90j, alerte >45j ──────────────────────
  if (plan?.engrais) {
    const dernierEngrais = lastAction(history, "engrais");
    if (dernierEngrais > 90)      { deductNutriments += 15; issues.push({ icon:"🌱", label:`Aucun engrais depuis ${dernierEngrais}j`, impact:-15 }); }
    else if (dernierEngrais > 45) { deductNutriments += 8;  issues.push({ icon:"🌱", label:"Engrais en retard (délai 45j min)", impact:-8 }); }
    else                          { strengths.push({ icon:"🌱", label:"Fertilisation à jour ✓" }); }
  }

  // ── 3. AÉRATION — KB v4 : délai min 90j ─────────────────────────────────
  if (plan?.aeration) {
    const derniereAeration = lastAction(history, "aération");
    if (derniereAeration > 90)      { deductEntretien += 10; issues.push({ icon:"🌀", label:"Aération recommandée — sol compacté", impact:-10 }); }
    else if (derniereAeration > 60) { deductEntretien += 5;  issues.push({ icon:"🌀", label:"Aération à prévoir", impact:-5 }); }
    else                            { strengths.push({ icon:"🌀", label:"Aération effectuée ✓" }); }
  }

  // ── 4. VERTICUT — KB v4 ──────────────────────────────────────────────────
  if (plan?.verticut) {
    const dernierVerticut = lastAction(history, "verticut");
    if (dernierVerticut > 120)      { deductEntretien += 7; issues.push({ icon:"🔧", label:"Verticut recommandé ce mois", impact:-7 }); }
    else if (dernierVerticut > 90)  { deductEntretien += 3; issues.push({ icon:"🔧", label:"Verticut à prévoir", impact:-3 }); }
    else                            { strengths.push({ icon:"🔧", label:"Verticut effectué ✓" }); }
  }

  // ── 5. ARROSAGE ──────────────────────────────────────────────────────────
  // Ne pas pénaliser si l'utilisateur a déclaré ne pas arroser (choix assumé)
  if (plan?.arrosage_base > 0) {
    const skipArrosage = profile?.arrosage === "aucun" || profile?.arrosage === "rarement";
    if (!skipArrosage) {
      const dernierArrosage = lastAction(history, "arrosage");
      if (dernierArrosage > 10 && (!weather || weather.precip < 5))      { deductEntretien += 12; issues.push({ icon:"💧", label:"Arrosage insuffisant", impact:-12 }); }
      else if (dernierArrosage > 5 && (!weather || weather.precip < 3))  { deductEntretien += 5;  issues.push({ icon:"💧", label:"Arrosage en retard", impact:-5 }); }
      else if (dernierArrosage <= 3)                                      { strengths.push({ icon:"💧", label:"Arrosage régulier ✓" }); }
    }
  }

  // ── 6. MÉTÉO ─────────────────────────────────────────────────────────────
  if (weather) {
    if (weather.temp_max >= 35)      { deductMeteo += 15; issues.push({ icon:"🔥", label:`Canicule ${weather.temp_max}°C`, impact:-15 }); }
    else if (weather.temp_max >= 30) { deductMeteo += 8;  issues.push({ icon:"☀️", label:`Forte chaleur ${weather.temp_max}°C`, impact:-8 }); }
    else if (weather.temp_max >= 26) { deductMeteo += 3;  issues.push({ icon:"☀️", label:"Chaleur modérée", impact:-3 }); }
    if (weather.temp_min <= -2)      { deductMeteo += 12; issues.push({ icon:"❄️", label:"Gel — stress racinaire sévère", impact:-12 }); }
    else if (weather.temp_min <= 2)  { deductMeteo += 6;  issues.push({ icon:"🌡️", label:"Risque de gel", impact:-6 }); }
    if (weather.precip < 1 && weather.temp_max > 20 && lastAction(history, "arrosage") > 4) { deductMeteo += 10; issues.push({ icon:"🌵", label:"Sécheresse sans arrosage", impact:-10 }); }
    if (weather.humidity > 80 && weather.temp_max > 18)      { deductMeteo += 10; issues.push({ icon:"🦠", label:"Conditions fongiques critiques", impact:-10 }); }
    else if (weather.humidity > 70 && weather.temp_max > 15) { deductMeteo += 5;  issues.push({ icon:"🦠", label:"Risque fongique modéré", impact:-5 }); }
    if (lastAction(history, "fongicide") <= 14) strengths.push({ icon:"💊", label:"Traitement fongicide récent ✓" });
  }

  // ── 7. SOL ───────────────────────────────────────────────────────────────
  if (profile?.sol) {
    if (profile.sol === "argileux") {
      if (lastAction(history, "aération") > 60) { deductSol += 8;  issues.push({ icon:"🏔️", label:"Sol argileux — compaction sans aération récente", impact:-8 }); }
      else strengths.push({ icon:"🌀", label:"Aération récente — compaction compensée ✓" });
    }
    if (profile.sol === "compacte") {
      if (lastAction(history, "aération") > 45) { deductSol += 10; issues.push({ icon:"🧱", label:"Sol compacté — aération urgente", impact:-10 }); }
      else strengths.push({ icon:"🌀", label:"Aération récente sur sol compacté ✓" });
    }
    if (profile.sol === "sableux" && weather?.temp_max > 22) { deductSol += 5; issues.push({ icon:"🏖️", label:"Sol sableux — sèche rapidement par chaleur", impact:-5 }); }
    if (profile.sol === "calcaire")                          { deductSol += 4; issues.push({ icon:"🪨", label:"Sol calcaire — surveiller pH et carence Fe", impact:-4 }); }
  }

  // ── 8. ACTIVITÉ GÉNÉRALE ─────────────────────────────────────────────────
  const actions30j = (Array.isArray(history) ? history : []).filter(h => daysSince(h.date) <= 30).length;
  const actions14j = (Array.isArray(history) ? history : []).filter(h => daysSince(h.date) <= 14).length;
  const actions7j  = (Array.isArray(history) ? history : []).filter(h => daysSince(h.date) <= 7).length;
  if (actions30j === 0)     { deductEntretien += 12; issues.push({ icon:"📋", label:"Aucune intervention ce mois", impact:-12 }); }
  else if (actions14j === 0){ deductEntretien += 6;  issues.push({ icon:"📋", label:"Aucune intervention ces 14 derniers jours", impact:-6 }); }
  else if (actions7j >= 3)  strengths.push({ icon:"✅", label:"Entretien très régulier cette semaine ✓" });
  else if (actions14j >= 3) strengths.push({ icon:"✅", label:"Entretien régulier ✓" });

  // ── SOUS-SCORES (0-100) ───────────────────────────────────────────────────
  const composantes = {
    entretien:   Math.max(0, Math.round(100 - (deductEntretien  / 54) * 100)),
    nutriments:  Math.max(0, Math.round(100 - (deductNutriments / 15) * 100)),
    hydratation: Math.max(0, Math.round(100 - (deductMeteo      / 50) * 100)),
    sol:         Math.max(0, Math.round(100 - (deductSol        / 12) * 100)),
  };

  // ── SCORE GLOBAL = MOYENNE PONDÉRÉE 40/30/20/10 ──────────────────────────
  let score = Math.round(
    composantes.entretien   * 0.40 +
    composantes.hydratation * 0.30 +
    composantes.nutriments  * 0.20 +
    composantes.sol         * 0.10
  );

  // ── PLAFOND PROFIL INCOMPLET ──────────────────────────────────────────────
  // Supporte les deux formats : profile.pelouse (string) et profile.gazons[] (multi-select)
  const hasPelouse = profile?.pelouse || (Array.isArray(profile?.gazons) && profile.gazons.length > 0);
  const profilComplet = hasPelouse && profile?.sol && profile?.surface && profile?.ville;
  if (!profilComplet && score > 80) score = 80;

  // ── DIAGNOSTIC PHOTO ─────────────────────────────────────────────────────
  // Source de vérité : tableau `diagnostics` fourni par le caller (depuis Supabase via useDiagnostics)
  const lastDiag    = pickLastDiagnostic(diagnostics);
  let diagScore     = null;
  let diagEmoji     = null;
  let diagAge       = null;
  let diagInfluence = 0;
  const SCORE_MAX_SANS_DIAG = 88;
  const scoreAvantDiag = Math.max(0, Math.min(100, score));

  if (lastDiag?.analysis?.score_visuel !== undefined) {
    const scoreVisuel  = lastDiag.analysis.score_visuel;
    diagAge            = daysSinceISO(lastDiag.date);
    diagEmoji          = lastDiag.analysis.emoji;
    const poids        = Math.max(0, 1 - diagAge / DIAG_MAX_AGE);
    const scoreCombine = Math.round(scoreAvantDiag * (1 - 0.3 * poids) + scoreVisuel * 0.3 * poids);
    const deltaClamped = Math.max(-20, Math.min(10, scoreCombine - scoreAvantDiag));
    diagScore     = scoreVisuel;
    diagInfluence = deltaClamped;
    score         = scoreAvantDiag + deltaClamped;
    lastDiag.analysis.problemes?.filter(p => p.severite === "elevee" || p.severite === "critique").slice(0, 2)
      .forEach(p => issues.push({ icon:"🔬", label:`[Photo] ${p.nom}`, impact: p.impact_score || -5 }));
    if (scoreVisuel >= 70) strengths.push({ icon:"📸", label:`Diagnostic photo : ${lastDiag.analysis.etat_general} ✓` });
  } else {
    if (score > SCORE_MAX_SANS_DIAG) score = SCORE_MAX_SANS_DIAG;
    issues.push({ icon:"📸", label:"Diagnostic photo recommandé (+12 pts possibles)", impact:0 });
  }

  // ── SCORE FINAL ───────────────────────────────────────────────────────────
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const potential  = Math.min(100, finalScore + 10 + Math.min(20,
    issues.filter(i => i.impact < 0).reduce((a, i) => a + Math.abs(i.impact), 0) / 2
  ));

  let labelText, color;
  if (finalScore >= 85)      { labelText = "Excellent 🏆"; color = "#43a047"; }
  else if (finalScore >= 70) { labelText = "Bon";          color = "#7cb342"; }
  else if (finalScore >= 55) { labelText = "Moyen";        color = "#f9a825"; }
  else if (finalScore >= 40) { labelText = "Faible";       color = "#ef6c00"; }
  else                       { labelText = "Critique";     color = "#c62828"; }

  return {
    score: finalScore,
    potential: Math.round(potential),
    label: labelText,
    color,
    issues: issues.filter(i => i.impact < 0).slice(0, 6),
    strengths: strengths.slice(0, 4),
    composantes,
    diagScore,
    diagEmoji,
    diagAge,
    diagInfluence,
    hasDiag: lastDiag !== null,
  };
}
