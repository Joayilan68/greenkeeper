// ─── LAWN HEALTH SCORE ENGINE ────────────────────────────────────────────────
// Score sur 100 basé sur météo, profil, historique et état visuel

export function calcLawnScore({ weather, profile, history, month, visualScore = null }) {
  let score = 100;
  const issues = [];
  const strengths = [];

  // ── 1. STRESS HYDRIQUE (25 pts) ──────────────────────────────────────────
  let hydroScore = 25;
  if (weather) {
    if (weather.temp_max >= 33) {
      hydroScore -= 12;
      issues.push({ icon: "🔥", label: "Canicule détectée", impact: -12 });
    } else if (weather.temp_max >= 28) {
      hydroScore -= 6;
      issues.push({ icon: "☀️", label: "Chaleur élevée", impact: -6 });
    }
    if (weather.humidity < 40) {
      hydroScore -= 8;
      issues.push({ icon: "💧", label: "Air très sec", impact: -8 });
    } else if (weather.humidity < 55) {
      hydroScore -= 4;
      issues.push({ icon: "💧", label: "Humidité faible", impact: -4 });
    }
    if (weather.precip === 0 && weather.temp_max > 20) {
      hydroScore -= 5;
      issues.push({ icon: "🌵", label: "Aucune pluie aujourd'hui", impact: -5 });
    }
    // Arrosages récents dans l'historique
    const recentWatering = history?.filter(h =>
      h.action.includes("Arrosage") &&
      daysSince(h.date) <= 3
    ).length || 0;
    if (recentWatering > 0) {
      hydroScore = Math.min(25, hydroScore + recentWatering * 4);
      strengths.push({ icon: "💧", label: "Arrosage récent ✓" });
    }
  }
  score = score - 25 + Math.max(0, hydroScore);

  // ── 2. RISQUE MALADIE (20 pts) ───────────────────────────────────────────
  let diseaseScore = 20;
  if (weather) {
    // Conditions favorables aux champignons : chaud + humide
    if (weather.temp_max > 20 && weather.humidity > 75) {
      diseaseScore -= 10;
      issues.push({ icon: "🦠", label: "Risque fongique élevé", impact: -10 });
    } else if (weather.temp_max > 18 && weather.humidity > 65) {
      diseaseScore -= 5;
      issues.push({ icon: "🦠", label: "Risque fongique modéré", impact: -5 });
    }
    // Gel
    if (weather.temp_min <= 0) {
      diseaseScore -= 8;
      issues.push({ icon: "❄️", label: "Gel — stress racinaire", impact: -8 });
    }
    // Traitement récent
    const recentTreatment = history?.filter(h =>
      h.action.includes("fongicide") && daysSince(h.date) <= 14
    ).length || 0;
    if (recentTreatment > 0) {
      diseaseScore = Math.min(20, diseaseScore + 8);
      strengths.push({ icon: "💊", label: "Traitement récent ✓" });
    }
  }
  score = score - 20 + Math.max(0, diseaseScore);

  // ── 3. TYPE DE SOL (15 pts) ──────────────────────────────────────────────
  let soilScore = 15;
  if (profile?.sol) {
    // Sol argileux en été = risque compaction
    if (profile.sol === "argileux" && month >= 6 && month <= 8) {
      soilScore -= 5;
      issues.push({ icon: "🏔️", label: "Sol argileux — risque compaction", impact: -5 });
    }
    // Sol sableux = sèche vite
    if (profile.sol === "sableux" && weather?.temp_max > 25) {
      soilScore -= 6;
      issues.push({ icon: "🏖️", label: "Sol sableux — sèche rapidement", impact: -6 });
    }
    // Aération récente = bonus
    const recentAeration = history?.filter(h =>
      (h.action.includes("Aération") || h.action.includes("carottage")) &&
      daysSince(h.date) <= 30
    ).length || 0;
    if (recentAeration > 0) {
      soilScore = Math.min(15, soilScore + 5);
      strengths.push({ icon: "🌀", label: "Aération récente ✓" });
    }
  }
  score = score - 15 + Math.max(0, soilScore);

  // ── 4. HISTORIQUE INTERVENTIONS (10 pts) ────────────────────────────────
  let histScore = 10;
  if (history?.length > 0) {
    const recentActions = history.filter(h => daysSince(h.date) <= 14).length;
    if (recentActions === 0) {
      histScore -= 8;
      issues.push({ icon: "📋", label: "Aucune intervention récente", impact: -8 });
    } else if (recentActions >= 3) {
      strengths.push({ icon: "✅", label: "Entretien régulier ✓" });
    }
    // Engrais récent
    const recentFert = history.filter(h =>
      h.action.includes("Engrais") && daysSince(h.date) <= 30
    ).length;
    if (recentFert > 0) {
      strengths.push({ icon: "🌱", label: "Engrais récent ✓" });
    } else if (month >= 3 && month <= 9) {
      histScore -= 3;
      issues.push({ icon: "🌱", label: "Engrais recommandé", impact: -3 });
    }
  } else {
    histScore -= 8;
    issues.push({ icon: "📋", label: "Commencez à journaliser", impact: -8 });
  }
  score = score - 10 + Math.max(0, histScore);

  // ── 5. ÉTAT VISUEL (30 pts) ──────────────────────────────────────────────
  let visualPts = 0;
  if (visualScore !== null) {
    visualPts = Math.round((visualScore / 5) * 30);
    if (visualScore <= 2) issues.push({ icon: "🌿", label: "État visuel dégradé", impact: -(30 - visualPts) });
    else if (visualScore >= 4) strengths.push({ icon: "🌿", label: "Bel aspect visuel ✓" });
  } else {
    // Sans évaluation visuelle, score neutre (15/30)
    visualPts = 15;
  }
  score = score - (visualScore !== null ? 0 : 0) + 0;
  // Recalcul propre avec visual
  score = Math.max(0, Math.min(100, score));
  if (visualScore !== null) {
    score = Math.round(score * 0.7 + visualPts * (70/100));
  }

  // Score final
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // Potentiel (toujours plus élevé pour créer la frustration)
  const potential = Math.min(100, finalScore + 15 + Math.floor(Math.random() * 10));

  // Label
  let label, color;
  if (finalScore >= 80) { label = "Excellent"; color = "#43a047"; }
  else if (finalScore >= 65) { label = "Bon"; color = "#7cb342"; }
  else if (finalScore >= 50) { label = "Moyen"; color = "#f9a825"; }
  else if (finalScore >= 35) { label = "Faible"; color = "#ef6c00"; }
  else { label = "Critique"; color = "#c62828"; }

  return { score: finalScore, potential, label, color, issues, strengths };
}

function daysSince(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return 999;
  const date = new Date(parts[2], parts[1]-1, parts[0]);
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}
