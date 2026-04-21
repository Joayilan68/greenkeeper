// ─── LAWN HEALTH SCORE ENGINE v4 ─────────────────────────────────────────────
// Score basé sur : météo + profil + respect du plan d'entretien + diagnostic photo
// v4 : score plus difficile à atteindre — nécessite un entretien continu multi-catégories
//
// PRINCIPES CLÉS v4 :
//   • Score max sans diagnostic photo = 88 (les 12 derniers pts nécessitent une photo récente)
//   • Score max avec profil incomplet = 80
//   • Chaque catégorie a une déduction de base qui n'est annulée que par des actions récentes
//   • Les conditions météo idéales sont la norme, pas un bonus

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
  const plan    = MONTHLY_PLAN[month];
  const issues  = [];
  const strengths = [];

  // Saisir si le gazon est synthétique — score simplifié
  const isSynth = profile?.isSynthetique || profile?.pelouse === "synthetique";

  let score = 100;

  // Tracking déductions par catégorie pour les sous-scores
  let deductEntretien  = 0;
  let deductNutriments = 0;
  let deductMeteo      = 0;
  let deductSol        = 0;

  // ── GAZON SYNTHÉTIQUE — score simplifié ───────────────────────────────────
  if (isSynth) {
    // Score fixe basé sur l'entretien de surface uniquement
    const actionsRecentes = history.filter(h => daysSince(h.date) <= 30).length;
    const scoreBase = actionsRecentes >= 3 ? 78 : actionsRecentes >= 1 ? 68 : 55;

    if (weather?.temp_max >= 35) {
      issues.push({ icon:"🔥", label:"Chaleur extrême — protéger les fibres", impact:-5 });
    }
    if (actionsRecentes === 0) {
      issues.push({ icon:"🧹", label:"Aucun entretien ces 30 derniers jours", impact:-13 });
    } else if (actionsRecentes >= 2) {
      strengths.push({ icon:"✅", label:"Entretien régulier ✓" });
    }

    const finalScore = Math.max(0, Math.min(100, scoreBase));
    let labelText, color;
    if (finalScore >= 80)      { labelText = "Bon état";   color = "#7cb342"; }
    else if (finalScore >= 65) { labelText = "Entretien conseillé"; color = "#f9a825"; }
    else                       { labelText = "Nettoyage nécessaire"; color = "#ef6c00"; }

    return {
      score: finalScore, potential: Math.min(88, finalScore + 10),
      label: labelText, color,
      issues: issues.slice(0, 4), strengths: strengths.slice(0, 3),
      composantes: { entretien: scoreBase, nutriments: 100, hydratation: 100, sol: 100 },
      diagScore: null, diagEmoji: null, diagAge: null, diagInfluence: 0, hasDiag: false,
    };
  }

  // ── 1. TONTE — catégorie la plus fréquente (max -25 pts) ─────────────────
  // Intervalles : été 4-5j, printemps/automne 7j, hiver 14j
  const tonteFreq = month >= 5 && month <= 8 ? 5 : month >= 3 && month <= 10 ? 7 : 14;
  const derniereTonte = lastAction(history, "tonte");

  if (derniereTonte > tonteFreq * 3) {
    score -= 25; deductEntretien += 25;
    issues.push({ icon:"✂️", label:`Tonte abandonnée depuis ${derniereTonte}j`, impact:-25 });
  } else if (derniereTonte > tonteFreq * 2) {
    score -= 18; deductEntretien += 18;
    issues.push({ icon:"✂️", label:`Tonte très en retard (${derniereTonte}j)`, impact:-18 });
  } else if (derniereTonte > tonteFreq + 2) {
    score -= 10; deductEntretien += 10;
    issues.push({ icon:"✂️", label:"Tonte en retard", impact:-10 });
  } else if (derniereTonte <= tonteFreq) {
    strengths.push({ icon:"✂️", label:"Tonte régulière ✓" });
  }

  // ── 2. ENGRAIS (max -15 pts) ──────────────────────────────────────────────
  // Pénalité si le mois en cours recommande un engrais ET qu'il n'a pas été appliqué
  if (plan?.engrais) {
    const dernierEngrais = lastAction(history, "engrais");
    if (dernierEngrais > 60) {
      score -= 15; deductNutriments += 15;
      issues.push({ icon:"🌱", label:"Engrais du mois non appliqué depuis 60j+", impact:-15 });
    } else if (dernierEngrais > 45) {
      score -= 8; deductNutriments += 8;
      issues.push({ icon:"🌱", label:"Engrais en retard", impact:-8 });
    } else {
      strengths.push({ icon:"🌱", label:"Fertilisation à jour ✓" });
    }
  } else {
    // Hors saison engrais — vérifier quand même le dernier (>90j = carence)
    const dernierEngrais = lastAction(history, "engrais");
    if (dernierEngrais > 90 && month >= 3 && month <= 10) {
      score -= 6; deductNutriments += 6;
      issues.push({ icon:"🌱", label:`Aucun engrais depuis ${dernierEngrais}j`, impact:-6 });
    }
  }

  // ── 3. AÉRATION (max -10 pts) ─────────────────────────────────────────────
  if (plan?.aeration) {
    const derniereAeration = lastAction(history, "aération");
    if (derniereAeration > 90) {
      score -= 10; deductEntretien += 10;
      issues.push({ icon:"🌀", label:"Aération recommandée — sol compacté", impact:-10 });
    } else if (derniereAeration > 60) {
      score -= 5; deductEntretien += 5;
      issues.push({ icon:"🌀", label:"Aération à prévoir", impact:-5 });
    } else {
      strengths.push({ icon:"🌀", label:"Aération effectuée ✓" });
    }
  }

  // ── 4. VERTICUT / SCARIFICATION (max -7 pts) ──────────────────────────────
  if (plan?.verticut) {
    const dernierVerticut = lastAction(history, "verticut");
    if (dernierVerticut > 120) {
      score -= 7; deductEntretien += 7;
      issues.push({ icon:"🔧", label:"Verticut recommandé ce mois", impact:-7 });
    } else if (dernierVerticut > 90) {
      score -= 3; deductEntretien += 3;
      issues.push({ icon:"🔧", label:"Verticut à prévoir", impact:-3 });
    } else {
      strengths.push({ icon:"🔧", label:"Verticut effectué ✓" });
    }
  }

  // ── 5. ARROSAGE (max -12 pts) ─────────────────────────────────────────────
  if (plan?.arrosage_base > 0) {
    const dernierArrosage = lastAction(history, "arrosage");
    if (dernierArrosage > 10 && (!weather || weather.precip < 5)) {
      score -= 12; deductEntretien += 12;
      issues.push({ icon:"💧", label:"Arrosage insuffisant", impact:-12 });
    } else if (dernierArrosage > 5 && (!weather || weather.precip < 3)) {
      score -= 5; deductEntretien += 5;
      issues.push({ icon:"💧", label:"Arrosage en retard", impact:-5 });
    } else if (dernierArrosage <= 3) {
      strengths.push({ icon:"💧", label:"Arrosage régulier ✓" });
    }
  }

  // ── 6. MÉTÉO (max -35 pts) ────────────────────────────────────────────────
  if (weather) {
    // Canicule
    if (weather.temp_max >= 35) {
      score -= 15; deductMeteo += 15;
      issues.push({ icon:"🔥", label:`Canicule ${weather.temp_max}°C — stress hydrique sévère`, impact:-15 });
    } else if (weather.temp_max >= 30) {
      score -= 8; deductMeteo += 8;
      issues.push({ icon:"☀️", label:`Forte chaleur ${weather.temp_max}°C`, impact:-8 });
    } else if (weather.temp_max >= 26) {
      score -= 3; deductMeteo += 3;
      issues.push({ icon:"☀️", label:"Chaleur modérée", impact:-3 });
    }

    // Gel
    if (weather.temp_min <= -2) {
      score -= 12; deductMeteo += 12;
      issues.push({ icon:"❄️", label:"Gel — stress racinaire sévère", impact:-12 });
    } else if (weather.temp_min <= 2) {
      score -= 6; deductMeteo += 6;
      issues.push({ icon:"🌡️", label:"Risque de gel", impact:-6 });
    }

    // Sécheresse sans arrosage
    if (weather.precip < 1 && weather.temp_max > 20 && lastAction(history, "arrosage") > 4) {
      score -= 10; deductMeteo += 10;
      issues.push({ icon:"🌵", label:"Sécheresse sans arrosage", impact:-10 });
    }

    // Risque fongique (conditions humides + chaleur)
    if (weather.humidity > 80 && weather.temp_max > 18) {
      score -= 10; deductMeteo += 10;
      issues.push({ icon:"🦠", label:"Conditions fongiques critiques", impact:-10 });
    } else if (weather.humidity > 70 && weather.temp_max > 15) {
      score -= 5; deductMeteo += 5;
      issues.push({ icon:"🦠", label:"Risque fongique modéré", impact:-5 });
    }

    // Traitement fongicide récent = atténuation
    if (lastAction(history, "fongicide") <= 14) {
      score += 3;
      strengths.push({ icon:"💊", label:"Traitement fongicide récent ✓" });
    }
  }

  // ── 7. PROFIL SOL (max -12 pts) ───────────────────────────────────────────
  if (profile?.sol) {
    if (profile.sol === "argileux") {
      // Déduction permanente sauf si aération récente
      const aerRecente = lastAction(history, "aération") <= 60;
      if (!aerRecente) {
        score -= 8; deductSol += 8;
        issues.push({ icon:"🏔️", label:"Sol argileux — compaction sans aération récente", impact:-8 });
      } else {
        strengths.push({ icon:"🌀", label:"Aération récente — compaction compensée ✓" });
      }
    }
    if (profile.sol === "compacte") {
      const aerRecente = lastAction(history, "aération") <= 45;
      if (!aerRecente) {
        score -= 10; deductSol += 10;
        issues.push({ icon:"🧱", label:"Sol compacté — aération urgente", impact:-10 });
      } else {
        strengths.push({ icon:"🌀", label:"Aération récente sur sol compacté ✓" });
      }
    }
    if (profile.sol === "sableux" && weather?.temp_max > 22) {
      score -= 5; deductSol += 5;
      issues.push({ icon:"🏖️", label:"Sol sableux — sèche rapidement par chaleur", impact:-5 });
    }
    if (profile.sol === "calcaire") {
      score -= 4; deductSol += 4;
      issues.push({ icon:"🪨", label:"Sol calcaire — surveiller pH et carence Fe", impact:-4 });
    }
  }

  // ── 8. ACTIVITÉ GÉNÉRALE (max -12 pts) ────────────────────────────────────
  const actions7j  = history.filter(h => daysSince(h.date) <= 7).length;
  const actions14j = history.filter(h => daysSince(h.date) <= 14).length;
  const actions30j = history.filter(h => daysSince(h.date) <= 30).length;

  if (actions30j === 0) {
    score -= 12; deductEntretien += 12;
    issues.push({ icon:"📋", label:"Aucune intervention ce mois", impact:-12 });
  } else if (actions14j === 0) {
    score -= 6; deductEntretien += 6;
    issues.push({ icon:"📋", label:"Aucune intervention ces 14 derniers jours", impact:-6 });
  } else if (actions7j >= 3) {
    strengths.push({ icon:"✅", label:"Entretien très régulier cette semaine ✓" });
  } else if (actions14j >= 3) {
    strengths.push({ icon:"✅", label:"Entretien régulier ✓" });
  }

  // ── 9. PLAFOND PROFIL INCOMPLET ───────────────────────────────────────────
  // Un profil incomplet limite le score à 80 (impossible de savoir si le gazon va bien)
  const profilComplet = profile?.pelouse && profile?.sol && profile?.surface && profile?.ville;
  if (!profilComplet) {
    const plafond = 80;
    if (score > plafond) {
      const diff = score - plafond;
      score = plafond;
      issues.push({ icon:"📝", label:"Profil incomplet — score plafonné", impact:-diff });
    }
  }

  // ── 10. DIAGNOSTIC PHOTO — PONDÉRATION 70/30 + PLAFOND 88 SANS PHOTO ─────
  const lastDiag    = getLastDiagnostic();
  let diagScore     = null;
  let diagEmoji     = null;
  let diagAge       = null;
  let diagInfluence = 0;

  // Sans diagnostic récent, plafonner à 88
  const SCORE_MAX_SANS_DIAG = 88;
  let scoreAvantDiag = Math.max(0, Math.min(100, Math.round(score)));

  if (lastDiag?.analysis?.score_visuel !== undefined) {
    const scoreVisuel  = lastDiag.analysis.score_visuel;
    diagAge            = daysSinceISO(lastDiag.date);
    diagEmoji          = lastDiag.analysis.emoji;

    const poids            = Math.max(0, 1 - diagAge / DIAG_MAX_AGE);
    const scoreCombineBrut = Math.round(
      scoreAvantDiag * (1 - 0.3 * poids) + scoreVisuel * 0.3 * poids
    );

    // ── Garde-fous : la photo ne peut pas tout effacer ni tout sauver ────────
    // Une belle photo ne compense pas un mauvais entretien : +10 pts max
    // Une mauvaise photo ne détruit pas un bon entretien : -20 pts max
    const MAX_HAUSSE   = 10;
    const MAX_BAISSE   = 20;
    const delta        = scoreCombineBrut - scoreAvantDiag;
    const deltaClamped = Math.max(-MAX_BAISSE, Math.min(MAX_HAUSSE, delta));
    const scoreCombine = scoreAvantDiag + deltaClamped;

    diagScore     = scoreVisuel;
    diagInfluence = deltaClamped;
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
  } else {
    // Aucun diagnostic récent → plafonner à 88
    if (score > SCORE_MAX_SANS_DIAG) {
      score = SCORE_MAX_SANS_DIAG;
    }
    issues.push({ icon:"📸", label:"Diagnostic photo recommandé (+12 pts possibles)", impact:0 });
  }

  // ── SCORE FINAL ───────────────────────────────────────────────────────────
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const potential  = Math.min(
    100,
    finalScore + 10 + Math.min(20, issues.filter(i => i.impact < 0).reduce((a, i) => a + Math.abs(i.impact), 0) / 2)
  );

  let labelText, color;
  if (finalScore >= 85)      { labelText = "Excellent 🏆"; color = "#43a047"; }
  else if (finalScore >= 70) { labelText = "Bon";          color = "#7cb342"; }
  else if (finalScore >= 55) { labelText = "Moyen";        color = "#f9a825"; }
  else if (finalScore >= 40) { labelText = "Faible";       color = "#ef6c00"; }
  else                       { labelText = "Critique";     color = "#c62828"; }

  // ── SOUS-SCORES (0-100) ────────────────────────────────────────────────────
  const composantes = {
    entretien:   Math.max(0, Math.round(100 - (deductEntretien  / 54) * 100)),
    nutriments:  Math.max(0, Math.round(100 - (deductNutriments / 15) * 100)),
    hydratation: Math.max(0, Math.round(100 - (deductMeteo      / 50) * 100)),
    sol:         Math.max(0, Math.round(100 - (deductSol        / 12) * 100)),
  };

  return {
    score:    finalScore,
    potential: Math.round(potential),
    label:    labelText,
    color,
    issues:   issues.filter(i => i.impact < 0).slice(0, 6),
    strengths: strengths.slice(0, 4),
    composantes,
    diagScore,
    diagEmoji,
    diagAge,
    diagInfluence,
    hasDiag: lastDiag !== null,
  };
}
