// ─── LAWN HEALTH SCORE ENGINE v2 ─────────────────────────────────────────────
// Score basé sur : météo + profil + respect du plan d'entretien conseillé
// Les émojis visuels seront intégrés en Phase 2 (diagnostic photo)

import { MONTHLY_PLAN } from "./lawn";

function daysSince(dateStr) {
  const parts = dateStr?.split('/');
  if (!parts || parts.length !== 3) return 999;
  const date = new Date(parts[2], parts[1]-1, parts[0]);
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function lastAction(history, keyword) {
  const found = history?.filter(h => h.action.toLowerCase().includes(keyword.toLowerCase()));
  if (!found?.length) return 999;
  return Math.min(...found.map(h => daysSince(h.date)));
}

export function calcLawnScore({ weather, profile, history = [], month }) {
  const plan = MONTHLY_PLAN[month];
  const issues = [];
  const strengths = [];
  let score = 100;

  // ── 1. RESPECT DU PLAN D'ENTRETIEN (40 pts) ──────────────────────────────
  // Tonte
  const tonteFreq = month >= 4 && month <= 9 ? 5 : 14;
  const derniereTonte = lastAction(history, "tonte");
  if (derniereTonte > tonteFreq * 2) {
    score -= 15;
    issues.push({ icon:"✂️", label:`Tonte non effectuée depuis ${derniereTonte}j`, impact:-15 });
  } else if (derniereTonte > tonteFreq) {
    score -= 7;
    issues.push({ icon:"✂️", label:"Tonte en retard", impact:-7 });
  } else if (derniereTonte <= tonteFreq) {
    strengths.push({ icon:"✂️", label:"Tonte régulière ✓" });
  }

  // Engrais (si plan du mois le recommande)
  if (plan?.engrais) {
    const dernierEngrais = lastAction(history, "engrais");
    if (dernierEngrais > 45) {
      score -= 10;
      issues.push({ icon:"🌱", label:"Engrais du mois non appliqué", impact:-10 });
    } else {
      strengths.push({ icon:"🌱", label:"Engrais appliqué ✓" });
    }
  }

  // Aération (si plan le recommande)
  if (plan?.aeration) {
    const derniereAeration = lastAction(history, "aération");
    if (derniereAeration > 60) {
      score -= 8;
      issues.push({ icon:"🌀", label:"Aération recommandée ce mois", impact:-8 });
    } else {
      strengths.push({ icon:"🌀", label:"Aération effectuée ✓" });
    }
  }

  // Verticut (si plan le recommande)
  if (plan?.verticut) {
    const dernierVerticut = lastAction(history, "verticut");
    if (dernierVerticut > 90) {
      score -= 5;
      issues.push({ icon:"🔧", label:"Verticut recommandé ce mois", impact:-5 });
    } else {
      strengths.push({ icon:"🔧", label:"Verticut effectué ✓" });
    }
  }

  // Arrosage (mois chauds)
  if (plan?.arrosage_base > 0) {
    const dernierArrosage = lastAction(history, "arrosage");
    if (dernierArrosage > 7) {
      score -= 8;
      issues.push({ icon:"💧", label:"Arrosage insuffisant", impact:-8 });
    } else if (dernierArrosage <= 3) {
      strengths.push({ icon:"💧", label:"Arrosage régulier ✓" });
    }
  }

  // ── 2. MÉTÉO (35 pts) ─────────────────────────────────────────────────────
  if (weather) {
    // Canicule
    if (weather.temp_max >= 33) {
      score -= 12;
      issues.push({ icon:"🔥", label:`Canicule ${weather.temp_max}°C`, impact:-12 });
    } else if (weather.temp_max >= 28) {
      score -= 5;
      issues.push({ icon:"☀️", label:"Chaleur élevée", impact:-5 });
    }

    // Gel
    if (weather.temp_min <= 0) {
      score -= 10;
      issues.push({ icon:"❄️", label:"Gel — stress racinaire", impact:-10 });
    } else if (weather.temp_min <= 3) {
      score -= 4;
      issues.push({ icon:"🌡️", label:"Risque de gel", impact:-4 });
    }

    // Sécheresse
    if (weather.precip === 0 && weather.temp_max > 22 && lastAction(history, "arrosage") > 3) {
      score -= 8;
      issues.push({ icon:"🌵", label:"Sécheresse sans arrosage", impact:-8 });
    }

    // Risque fongique
    if (weather.humidity > 75 && weather.temp_max > 18) {
      score -= 8;
      issues.push({ icon:"🦠", label:"Risque fongique élevé", impact:-8 });
    } else if (weather.humidity > 65 && weather.temp_max > 15) {
      score -= 3;
      issues.push({ icon:"🦠", label:"Risque fongique modéré", impact:-3 });
    }

    // Traitement fongicide récent = bonus
    if (lastAction(history, "fongicide") <= 14) {
      score += 5;
      strengths.push({ icon:"💊", label:"Traitement fongicide récent ✓" });
    }

    // Conditions idéales
    if (weather.temp_max >= 15 && weather.temp_max <= 22 && weather.humidity >= 50 && weather.humidity <= 70) {
      strengths.push({ icon:"🌤️", label:"Conditions météo idéales ✓" });
    }
  }

  // ── 3. PROFIL SOL (15 pts) ────────────────────────────────────────────────
  if (profile?.sol) {
    if (profile.sol === "argileux" && month >= 6 && month <= 8) {
      score -= 5;
      issues.push({ icon:"🏔️", label:"Sol argileux — risque compaction estivale", impact:-5 });
      if (lastAction(history, "aération") <= 30) {
        score += 5;
        strengths.push({ icon:"🌀", label:"Aération récente — compaction évitée ✓" });
      }
    }
    if (profile.sol === "sableux" && weather?.temp_max > 25) {
      score -= 4;
      issues.push({ icon:"🏖️", label:"Sol sableux — sèche rapidement", impact:-4 });
    }
    if (profile.sol === "calcaire") {
      score -= 2;
      issues.push({ icon:"🪨", label:"Sol calcaire — surveiller le pH", impact:-2 });
    }
  }

  // ── 4. ACTIVITÉ GÉNÉRALE (10 pts) ─────────────────────────────────────────
  const actionsRecentes = history.filter(h => daysSince(h.date) <= 14).length;
  if (actionsRecentes === 0) {
    score -= 8;
    issues.push({ icon:"📋", label:"Aucune intervention depuis 2 semaines", impact:-8 });
  } else if (actionsRecentes >= 4) {
    strengths.push({ icon:"✅", label:"Entretien très régulier ✓" });
  } else if (actionsRecentes >= 2) {
    strengths.push({ icon:"✅", label:"Entretien régulier ✓" });
  }

  // Score final
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // Potentiel (toujours supérieur pour créer la motivation)
  const potential = Math.min(100, finalScore + 10 + Math.min(15, issues.reduce((a, i) => a + Math.abs(i.impact), 0) / 2));

  // Label et couleur
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
    issues: issues.slice(0, 5),
    strengths: strengths.slice(0, 4),
  };
}