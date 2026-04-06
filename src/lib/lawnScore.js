// ─── LAWN HEALTH SCORE ENGINE v3 ─────────────────────────────────────────────
// Score basé sur : météo + profil + respect du plan d'entretien + diagnostic photo
// Phase 2 : le score visuel du dernier diagnostic influence le score final (70/30)

import { MONTHLY_PLAN } from "./lawn";

const DIAG_KEY     = "gk_diagnostics";
const DIAG_MAX_AGE = 7; // jours max d'influence

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
  const found = history?.filter(h => h.action.toLowerCase().includes(keyword.toLowerCase()));
  if (!found?.length) return 999;
  return Math.min(...found.map(h => daysSince(h.date)));
}

function getLastDiagnostic() {
  try {
    const saved = localStorage.getItem(DIAG_KEY);
    if (!saved) return null;
    const diags = JSON.parse(saved);
    if (!diags?.length) return null;
    const last = diags[0];
    if (daysSinceISO(last.date) > DIAG_MAX_AGE) return null;
    return last;
  } catch {
    return null;
  }
}

export function calcLawnScore({ weather, profile, history = [], month }) {
  const plan = MONTHLY_PLAN[month];
  const issues = [];
  const strengths = [];
  let score = 100;

  // Tracking déductions par catégorie pour les sous-scores
  let deductEntretien  = 0;
  let deductNutriments = 0;
  let deductMeteo      = 0;
  let deductSol        = 0;

  // ── 1. RESPECT DU PLAN D'ENTRETIEN (40 pts) ──────────────────────────────
  const tonteFreq = month >= 4 && month <= 9 ? 5 : 14;
  const derniereTonte = lastAction(history, "tonte");
  if (derniereTonte > tonteFreq * 2) {
    score -= 15; deductEntretien += 15;
    issues.push({ icon:"✂️", label:`Tonte non effectuée depuis ${derniereTonte}j`, impact:-15 });
  } else if (derniereTonte > tonteFreq) {
    score -= 7; deductEntretien += 7;
    issues.push({ icon:"✂️", label:"Tonte en retard", impact:-7 });
  } else if (derniereTonte <= tonteFreq) {
    strengths.push({ icon:"✂️", label:"Tonte régulière ✓" });
  }

  if (plan?.engrais) {
    const dernierEngrais = lastAction(history, "engrais");
    if (dernierEngrais > 45) {
      score -= 10; deductNutriments += 10;
      issues.push({ icon:"🌱", label:"Engrais du mois non appliqué", impact:-10 });
    } else {
      strengths.push({ icon:"🌱", label:"Engrais appliqué ✓" });
    }
  }

  if (plan?.aeration) {
    const derniereAeration = lastAction(history, "aération");
    if (derniereAeration > 60) {
      score -= 8; deductEntretien += 8;
      issues.push({ icon:"🌀", label:"Aération recommandée ce mois", impact:-8 });
    } else {
      strengths.push({ icon:"🌀", label:"Aération effectuée ✓" });
    }
  }

  if (plan?.verticut) {
    const dernierVerticut = lastAction(history, "verticut");
    if (dernierVerticut > 90) {
      score -= 5; deductEntretien += 5;
      issues.push({ icon:"🔧", label:"Verticut recommandé ce mois", impact:-5 });
    } else {
      strengths.push({ icon:"🔧", label:"Verticut effectué ✓" });
    }
  }

  if (plan?.arrosage_base > 0) {
    const dernierArrosage = lastAction(history, "arrosage");
    if (dernierArrosage > 7) {
      score -= 8; deductEntretien += 8;
      issues.push({ icon:"💧", label:"Arrosage insuffisant", impact:-8 });
    } else if (dernierArrosage <= 3) {
      strengths.push({ icon:"💧", label:"Arrosage régulier ✓" });
    }
  }

  // ── 2. MÉTÉO (35 pts) ─────────────────────────────────────────────────────
  if (weather) {
    if (weather.temp_max >= 33) {
      score -= 12; deductMeteo += 12;
      issues.push({ icon:"🔥", label:`Canicule ${weather.temp_max}°C`, impact:-12 });
    } else if (weather.temp_max >= 28) {
      score -= 5; deductMeteo += 5;
      issues.push({ icon:"☀️", label:"Chaleur élevée", impact:-5 });
    }

    if (weather.temp_min <= 0) {
      score -= 10; deductMeteo += 10;
      issues.push({ icon:"❄️", label:"Gel — stress racinaire", impact:-10 });
    } else if (weather.temp_min <= 3) {
      score -= 4; deductMeteo += 4;
      issues.push({ icon:"🌡️", label:"Risque de gel", impact:-4 });
    }

    if (weather.precip === 0 && weather.temp_max > 22 && lastAction(history, "arrosage") > 3) {
      score -= 8; deductMeteo += 8;
      issues.push({ icon:"🌵", label:"Sécheresse sans arrosage", impact:-8 });
    }

    if (weather.humidity > 75 && weather.temp_max > 18) {
      score -= 8; deductMeteo += 8;
      issues.push({ icon:"🦠", label:"Risque fongique élevé", impact:-8 });
    } else if (weather.humidity > 65 && weather.temp_max > 15) {
      score -= 3; deductMeteo += 3;
      issues.push({ icon:"🦠", label:"Risque fongique modéré", impact:-3 });
    }

    if (lastAction(history, "fongicide") <= 14) {
      score += 5;
      strengths.push({ icon:"💊", label:"Traitement fongicide récent ✓" });
    }

    if (weather.temp_max >= 15 && weather.temp_max <= 22 && weather.humidity >= 50 && weather.humidity <= 70) {
      strengths.push({ icon:"🌤️", label:"Conditions météo idéales ✓" });
    }
  }

  // ── 3. PROFIL SOL (15 pts) ────────────────────────────────────────────────
  if (profile?.sol) {
    if (profile.sol === "argileux" && month >= 6 && month <= 8) {
      score -= 5; deductSol += 5;
      issues.push({ icon:"🏔️", label:"Sol argileux — risque compaction estivale", impact:-5 });
      if (lastAction(history, "aération") <= 30) {
        score += 5;
        strengths.push({ icon:"🌀", label:"Aération récente — compaction évitée ✓" });
      }
    }
    if (profile.sol === "sableux" && weather?.temp_max > 25) {
      score -= 4; deductSol += 4;
      issues.push({ icon:"🏖️", label:"Sol sableux — sèche rapidement", impact:-4 });
    }
    if (profile.sol === "calcaire") {
      score -= 2; deductSol += 2;
      issues.push({ icon:"🪨", label:"Sol calcaire — surveiller le pH", impact:-2 });
    }
  }

  // ── 4. ACTIVITÉ GÉNÉRALE (10 pts) ─────────────────────────────────────────
  const actionsRecentes = history.filter(h => daysSince(h.date) <= 14).length;
  if (actionsRecentes === 0) {
    score -= 8; deductEntretien += 8;
    issues.push({ icon:"📋", label:"Aucune intervention depuis 2 semaines", impact:-8 });
  } else if (actionsRecentes >= 4) {
    strengths.push({ icon:"✅", label:"Entretien très régulier ✓" });
  } else if (actionsRecentes >= 2) {
    strengths.push({ icon:"✅", label:"Entretien régulier ✓" });
  }

  // ── 5. DIAGNOSTIC PHOTO — PONDÉRATION 70/30 ──────────────────────────────
  const lastDiag    = getLastDiagnostic();
  let diagScore     = null;
  let diagEmoji     = null;
  let diagAge       = null;
  let diagInfluence = 0;

  if (lastDiag?.analysis?.score_visuel !== undefined) {
    const scoreVisuel  = lastDiag.analysis.score_visuel;
    diagAge            = daysSinceISO(lastDiag.date);
    diagEmoji          = lastDiag.analysis.emoji;

    const poids        = Math.max(0, 1 - diagAge / DIAG_MAX_AGE);
    const scoreCalcule = Math.max(0, Math.min(100, Math.round(score)));
    const scoreCombine = Math.round(
      scoreCalcule * (1 - 0.3 * poids) + scoreVisuel * 0.3 * poids
    );

    diagScore     = scoreVisuel;
    diagInfluence = scoreCombine - scoreCalcule;
    score         = scoreCombine;

    lastDiag.analysis.problemes
      ?.filter(p => p.severite === "elevee" || p.severite === "critique")
      .slice(0, 2)
      .forEach(p => {
        issues.push({ icon:"🔬", label:`[Photo] ${p.nom}`, impact: p.impact_score || -5 });
      });

    if (scoreVisuel >= 70) {
      strengths.push({ icon:"📸", label:`Diagnostic photo : ${lastDiag.analysis.etat_general} ✓` });
    }
  }

  // ── SCORE FINAL ───────────────────────────────────────────────────────────
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const potential  = Math.min(
    100,
    finalScore + 10 + Math.min(15, issues.reduce((a, i) => a + Math.abs(i.impact), 0) / 2)
  );

  let labelText, color;
  if (finalScore >= 85)      { labelText = "Excellent 🏆"; color = "#43a047"; }
  else if (finalScore >= 70) { labelText = "Bon";          color = "#7cb342"; }
  else if (finalScore >= 55) { labelText = "Moyen";        color = "#f9a825"; }
  else if (finalScore >= 40) { labelText = "Faible";       color = "#ef6c00"; }
  else                       { labelText = "Critique";     color = "#c62828"; }

  // ── SOUS-SCORES cohérents (0-100) ─────────────────────────────────────────
  // Budgets max par catégorie (somme max des déductions possibles)
  const composantes = {
    entretien:  Math.max(0, Math.round(100 - (deductEntretien  / 38) * 100)),
    nutriments: Math.max(0, Math.round(100 - (deductNutriments / 10) * 100)),
    hydratation:Math.max(0, Math.round(100 - (deductMeteo      / 43) * 100)),
    sol:        Math.max(0, Math.round(100 - (deductSol        / 11) * 100)),
  };

  return {
    score:    finalScore,
    potential: Math.round(potential),
    label:    labelText,
    color,
    issues:   issues.slice(0, 6),
    strengths: strengths.slice(0, 4),
    composantes,
    // Données diagnostic pour affichage dans Dashboard
    diagScore,
    diagEmoji,
    diagAge,
    diagInfluence,
    hasDiag: lastDiag !== null,
  };
}
