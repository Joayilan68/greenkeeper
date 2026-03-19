// ─── SYSTÈME DE NOTIFICATIONS INTELLIGENTES ──────────────────────────────────
// Génère des alertes proactives basées sur le score, météo, historique et saison

import { MONTHLY_PLAN } from "./lawn";

export function generateNotifications({ weather, profile, history, month, score }) {
  const notifications = [];
  const now = new Date();

  // ── HELPERS ──────────────────────────────────────────────────────────────
  const daysSince = (dateStr) => {
    const parts = dateStr?.split('/');
    if (!parts || parts.length !== 3) return 999;
    const date = new Date(parts[2], parts[1]-1, parts[0]);
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const lastAction = (keyword) => {
    const found = history?.filter(h => h.action.toLowerCase().includes(keyword.toLowerCase()));
    if (!found?.length) return 999;
    return Math.min(...found.map(h => daysSince(h.date)));
  };

  const plan = MONTHLY_PLAN[month];

  // ── 1. ALERTES MÉTÉO IMMINENTES ──────────────────────────────────────────
  if (weather) {
    if (weather.temp_max >= 30 && lastAction("arrosage") > 2) {
      notifications.push({
        id: "heat_water",
        type: "danger",
        icon: "🔥",
        title: "Canicule — Score en danger",
        message: `${weather.temp_max}°C prévus et aucun arrosage depuis ${lastAction("arrosage")} jours. Votre score risque de chuter de -15 pts.`,
        action: "Arroser maintenant",
        actionRoute: "/today",
        impact: -15,
        priority: 1,
      });
    }

    if (weather.temp_min <= 2 && lastAction("tonte") < 2) {
      notifications.push({
        id: "frost_mow",
        type: "warning",
        icon: "❄️",
        title: "Gel prévu — Évitez la tonte",
        message: "Température proche de 0°C. Tondre sur gazon gelé peut endommager les brins et faire chuter le score de -10 pts.",
        action: "Voir les conseils",
        actionRoute: "/today",
        impact: -10,
        priority: 2,
      });
    }

    if (weather.humidity > 75 && weather.temp_max > 18) {
      notifications.push({
        id: "fungal_risk",
        type: "warning",
        icon: "🦠",
        title: "Risque fongique élevé",
        message: `Humidité ${weather.humidity}% + chaleur = conditions idéales pour les maladies. Sans traitement, -10 pts sur votre score.`,
        action: "Traiter maintenant",
        actionRoute: "/today",
        impact: -10,
        priority: 2,
      });
    }
  }

  // ── 2. ALERTES ENTRETIEN EN RETARD ───────────────────────────────────────
  // Tonte
  const tonteFreq = month >= 4 && month <= 9 ? 4 : 10; // jours entre tontes
  if (lastAction("tonte") > tonteFreq) {
    const retard = lastAction("tonte") - tonteFreq;
    notifications.push({
      id: "mow_late",
      type: retard > 7 ? "danger" : "warning",
      icon: "✂️",
      title: `Tonte en retard de ${retard} jours`,
      message: `Une pelouse non tondue perd en densité. Chaque semaine de retard = -5 pts sur votre score.`,
      action: "Planifier la tonte",
      actionRoute: "/today",
      impact: -Math.min(20, retard),
      priority: retard > 7 ? 1 : 3,
    });
  }

  // Engrais
  if (plan?.engrais && lastAction("engrais") > 45) {
    notifications.push({
      id: "fert_late",
      type: "warning",
      icon: "🌱",
      title: "Engrais recommandé ce mois",
      message: `${plan.engrais}. Sans apport, votre gazon manquera de nutriments — risque de -8 pts.`,
      action: "Épandre l'engrais",
      actionRoute: "/today",
      impact: -8,
      priority: 3,
    });
  }

  // Aération (recommandée en mars et septembre)
  if (plan?.aeration && lastAction("aération") > 180) {
    notifications.push({
      id: "aeration_due",
      type: "info",
      icon: "🌀",
      title: "Aération recommandée",
      message: "C'est la période idéale pour aérer votre sol. Sans aération annuelle, le gazon s'étouffe progressivement (-6 pts).",
      action: "Planifier l'aération",
      actionRoute: "/today",
      impact: -6,
      priority: 3,
    });
  }

  // Verticut
  if (plan?.verticut && lastAction("verticut") > 90) {
    notifications.push({
      id: "verticut_due",
      type: "info",
      icon: "🔧",
      title: "Verticut conseillé",
      message: "Le feutre s'accumule et étouffe votre gazon. Un verticut améliorerait votre score de +5 pts.",
      action: "Planifier le verticut",
      actionRoute: "/today",
      impact: -5,
      priority: 4,
    });
  }

  // Désherbage
  if (lastAction("désherbage") > 30 && month >= 3 && month <= 9) {
    notifications.push({
      id: "weed_due",
      type: "info",
      icon: "🪴",
      title: "Désherbage recommandé",
      message: "Les mauvaises herbes concurrencent votre gazon en cette saison. Un désherbage préserverait votre score actuel.",
      action: "Désherber",
      actionRoute: "/today",
      impact: -4,
      priority: 4,
    });
  }

  // ── 3. ALERTES SCORE EN BAISSE ───────────────────────────────────────────
  if (score <= 40) {
    notifications.push({
      id: "score_critical",
      type: "danger",
      icon: "🚨",
      title: "Score critique — Action urgente",
      message: "Votre gazon est en mauvais état. Sans intervention rapide, la situation va se dégrader. Consultez le plan du jour.",
      action: "Plan d'urgence",
      actionRoute: "/today",
      impact: -20,
      priority: 1,
    });
  } else if (score <= 55) {
    notifications.push({
      id: "score_low",
      type: "warning",
      icon: "⚠️",
      title: "Score en baisse",
      message: "Plusieurs facteurs dégradent votre gazon. Suivez les recommandations du jour pour remonter votre score.",
      action: "Voir les actions",
      actionRoute: "/today",
      impact: -10,
      priority: 2,
    });
  }

  // ── 4. ALERTES SAISONNIÈRES ──────────────────────────────────────────────
  // Préparation hiver (octobre)
  if (month === 10 && lastAction("engrais") > 30) {
    notifications.push({
      id: "winter_prep",
      type: "info",
      icon: "🍂",
      title: "Préparez votre gazon pour l'hiver",
      message: "Octobre = dernière chance d'appliquer un engrais automne. Sans cet apport, votre gazon hivernera affaibli (-8 pts au printemps).",
      action: "Appliquer l'engrais",
      actionRoute: "/today",
      impact: -8,
      priority: 2,
    });
  }

  // Rénovation septembre
  if (month === 9 && lastAction("regarnissage") > 180) {
    notifications.push({
      id: "sept_renovation",
      type: "info",
      icon: "🌾",
      title: "C'est le moment de rénover !",
      message: "Septembre est LA période idéale pour un regarnissage. Le sol est encore chaud et l'humidité naturelle favorise la germination (+15 pts potentiels).",
      action: "Planifier la rénovation",
      actionRoute: "/today",
      impact: 15,
      priority: 2,
    });
  }

  // ── TRIER par priorité ───────────────────────────────────────────────────
  return notifications
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5); // max 5 notifications
}
