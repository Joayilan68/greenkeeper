// ─── SYSTÈME DE NOTIFICATIONS INTELLIGENTES ──────────────────────────────────
// Génère des alertes proactives basées sur le score, météo, historique et saison
// Synchronisé avec KB v3 — planEntretien.js est la source de vérité unique

import { MONTHLY_PLAN } from "./lawn";
import { detecterMaladie } from "./planEntretien";

// ── Helpers type de gazon (identiques à planEntretien.js) ─────────────────────
const isGazonSynth    = (p) => p?.isSynthetique || p?.pelouse === "synthetique" ||
  (Array.isArray(p?.gazons) && p.gazons.includes("synthetique"));
const isGazonBermuda  = (p) => p?.pelouse === "bermuda" ||
  (Array.isArray(p?.gazons) && p.gazons.includes("bermuda"));
const isGazonOmbre    = (p) => p?.pelouse === "ombre" ||
  (Array.isArray(p?.gazons) && p.gazons.includes("ombre"));
const isGazonRustique = (p) => p?.pelouse === "rustique" ||
  (Array.isArray(p?.gazons) && p.gazons.includes("rustique"));
const isGazonSport    = (p) => p?.pelouse === "sport" ||
  (Array.isArray(p?.gazons) && p.gazons.includes("sport"));
const isObjectifNaturel = (p) => p?.objectif === "naturel";
const isObjectifCreer   = (p) => p?.objectif === "creer";
const isObjectifRenover = (p) => p?.objectif === "renover";

// ── Bermuda en dormance (nov-mars) ────────────────────────────────────────────
const isBermudaDormant = (p, month) => isGazonBermuda(p) && [11,12,1,2,3].includes(month);

export function generateNotifications({ weather, profile, history, month, score, location }) {
  const notifications = [];

  const isSynth   = isGazonSynth(profile);
  const isBermuda = isGazonBermuda(profile);
  const isOmbre   = isGazonOmbre(profile);
  const isRustiq  = isGazonRustique(profile);
  const isSport   = isGazonSport(profile);
  const isNaturel = isObjectifNaturel(profile);
  const isCreer   = isObjectifCreer(profile);
  const isRenover = isObjectifRenover(profile);
  const dormant   = isBermudaDormant(profile, month);
  const solArg    = profile?.sol === "argileux" || profile?.sol === "compacte";
  const solSable  = profile?.sol === "sableux";
  const solCalc   = profile?.sol === "calcaire";

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

  // ── 0. NOTIFICATIONS UNIVERSELLES ────────────────────────────────────────

  if (!location) {
    notifications.push({
      id: "no_location", type: "warning", icon: "📍",
      title: "Géolocalisation inactive",
      message: "Activez la géolocalisation pour recevoir des alertes météo personnalisées et un score précis.",
      action: "Activer", actionRoute: "/", impact: -10, priority: 1,
    });
  }

  if (!history || history.length === 0) {
    notifications.push({
      id: "no_history", type: "info", icon: "📋",
      title: "Commencez à journaliser !",
      message: "Enregistrez vos interventions (tonte, arrosage, engrais...) pour que Mongazon360 calcule votre score avec précision.",
      action: "Journaliser maintenant", actionRoute: "/today", impact: -8, priority: 2,
    });
  }

  if (!profile) {
    notifications.push({
      id: "no_profile", type: "info", icon: "👤",
      title: "Profil gazon incomplet",
      message: "Configurez votre profil (type de pelouse, sol, surface) pour des recommandations personnalisées.",
      action: "Configurer mon profil", actionRoute: "/setup", impact: -5, priority: 2,
    });
    return notifications.sort((a, b) => a.priority - b.priority).slice(0, 5);
  }

  // ── SYNTHÉTIQUE — court-circuit total ────────────────────────────────────
  if (isSynth) {
    notifications.push({
      id: "synth_info", type: "info", icon: "🔵",
      title: "Gazon synthétique",
      message: "Aucun entretien agronomique nécessaire. Pensez au nettoyage, brossage et contrôle des granulats tous les 6 mois.",
      action: "Voir les conseils", actionRoute: "/today", impact: 0, priority: 3,
    });
    if (weather?.temp_max >= 35) {
      notifications.push({
        id: "synth_heat", type: "warning", icon: "🔥",
        title: "Chaleur extrême — Gazon synthétique",
        message: `${weather.temp_max}°C prévus. Surface synthétique peut atteindre 60-70°C. Évitez de marcher dessus aux heures chaudes.`,
        action: "Voir les conseils", actionRoute: "/today", impact: 0, priority: 2,
      });
    }
    return notifications.sort((a, b) => a.priority - b.priority).slice(0, 5);
  }

  // ── BERMUDA DORMANT — court-circuit total ─────────────────────────────────
  if (dormant) {
    notifications.push({
      id: "bermuda_dormant", type: "info", icon: "💤",
      title: "Bermuda en dormance hivernale",
      message: "Votre gazon Bermuda est brun en hiver — c'est tout à fait normal. Reprise de la croissance en mars-avril. Aucune intervention nécessaire.",
      action: "Voir les conseils", actionRoute: "/today", impact: 0, priority: 2,
    });
    return notifications.sort((a, b) => a.priority - b.priority).slice(0, 5);
  }

  // ── OBJECTIF CRÉER — programme spécifique, bloquer alertes standard ───────
  if (isCreer) {
    notifications.push({
      id: "creer_arrosage", type: "danger", icon: "💧",
      title: "Arrosage quotidien obligatoire",
      message: "Création de pelouse : arrosez chaque jour les 60 premiers jours pour assurer la germination. C'est la règle n°1.",
      action: "Journaliser", actionRoute: "/today", impact: 0, priority: 1,
    });
    if (lastAction("semences") > 7 && [3,4,5,8,9].includes(month)) {
      notifications.push({
        id: "creer_semences", type: "warning", icon: "🌱",
        title: "Semences — Priorité absolue",
        message: "Objectif Création : commencez par préparer le sol et semer. Pas d'engrais standard, pas de désherbant avant J45.",
        action: "Voir le programme", actionRoute: "/today", impact: 0, priority: 2,
      });
    }
    return notifications.sort((a, b) => a.priority - b.priority).slice(0, 5);
  }

  // ── OBJECTIF RÉNOVER — programme spécifique ───────────────────────────────
  if (isRenover) {
    notifications.push({
      id: "renover_program", type: "info", icon: "🔧",
      title: "Programme rénovation actif",
      message: "Rénovation : scarification profonde → aération → semences + starter → arrosage intensif 30j. Pas d'engrais été avant J60.",
      action: "Voir le programme", actionRoute: "/today", impact: 0, priority: 2,
    });
    if (lastAction("aération") > 90 && [3,4,9].includes(month)) {
      notifications.push({
        id: "renover_aeration", type: "warning", icon: "🌀",
        title: "Aération prioritaire — Rénovation",
        message: "Étape clé de la rénovation : aérez avant de semer pour améliorer la prise racinaire des nouvelles semences.",
        action: "Planifier", actionRoute: "/today", impact: -8, priority: 1,
      });
    }
  }

  // ── 1. ALERTES MÉTÉO IMMINENTES ──────────────────────────────────────────
  if (weather) {

    // Canicule + arrosage en retard
    if (weather.temp_max >= 30 && lastAction("arrosage") > 2) {
      const msgSol = solSable
        ? "Sol sableux sèche très rapidement — arrosez 15-20mm dès ce matin (5h-8h)."
        : solArg
        ? "Sol argileux : 2 passages de 5-6mm valent mieux qu'un seul long arrosage."
        : `${weather.temp_max}°C prévus — arrosez tôt le matin (5h-8h), jamais le soir.`;
      notifications.push({
        id: "heat_water", type: "danger", icon: "🔥",
        title: `Canicule — Arrosage urgent`,
        message: msgSol + ` Aucun arrosage depuis ${lastAction("arrosage")} jours.`,
        action: "Arroser maintenant", actionRoute: "/today", impact: -15, priority: 1,
      });
    }

    // Canicule + sol sableux — alerte renforcée
    if (weather.temp_max >= 28 && solSable && lastAction("arrosage") > 1) {
      notifications.push({
        id: "heat_sandy", type: "danger", icon: "🏜️",
        title: "Sol sableux + chaleur — Urgence hydrique",
        message: `Sol sableux + ${weather.temp_max}°C = dessèchement en moins de 24h. Arrosage quotidien obligatoire en canicule.`,
        action: "Arroser maintenant", actionRoute: "/today", impact: -18, priority: 1,
      });
    }

    // Gel + tonte récente
    if (weather.temp_min <= 2 && lastAction("tonte") < 2) {
      notifications.push({
        id: "frost_mow", type: "warning", icon: "❄️",
        title: "Gel prévu — Évitez la tonte",
        message: "Tondre sur gazon gelé endommage les brins et fait chuter le score de -10 pts.",
        action: "Voir les conseils", actionRoute: "/today", impact: -10, priority: 2,
      });
    }

    // Maladies fongiques — détection précise KB v3
    const maladie = detecterMaladie(weather, profile, month);
    if (maladie) {
      notifications.push({
        id: `maladie_${maladie.id}`,
        type: maladie.urgence === "haute" ? "danger" : "warning",
        icon: "🦠",
        title: maladie.label,
        message: `${maladie.message} Traitement conseillé : ${maladie.traitement}.`,
        action: "Traiter maintenant", actionRoute: "/today",
        impact: -10, priority: maladie.urgence === "haute" ? 1 : 2,
      });
    } else if (weather.humidity > 75 && weather.temp_max > 18) {
      // Alerte générique fongique si pas de maladie précise
      notifications.push({
        id: "fungal_risk", type: "warning", icon: "🦠",
        title: "Risque fongique élevé",
        message: `Humidité ${weather.humidity}% + chaleur = conditions favorables aux maladies. Évitez d'arroser le soir.`,
        action: "Traiter maintenant", actionRoute: "/today", impact: -10, priority: 2,
      });
    }

    // Gazon Sport + stress piétinement + chaleur
    if (isSport && weather.temp_max >= 28 && lastAction("arrosage") > 1) {
      notifications.push({
        id: "sport_heat", type: "danger", icon: "🏟️",
        title: "Gazon Sport — Stress hydrique élevé",
        message: `${weather.temp_max}°C + gazon sport = besoin de 25-30mm/sem. Arrosez tôt le matin. Évitez toute tonte sous la barre des 3cm.`,
        action: "Arroser maintenant", actionRoute: "/today", impact: -15, priority: 1,
      });
    }

    // Sol calcaire — alerte carence fer si chaleur
    if (solCalc && weather.temp_max >= 20 && month >= 4 && month <= 9) {
      notifications.push({
        id: "calc_carence", type: "warning", icon: "🟡",
        title: "Sol calcaire — Risque chlorose",
        message: "Sol calcaire + chaleur = carence en fer possible (jaunissement). Utilisez un engrais chélaté, pas d'engrais acide.",
        action: "Voir les produits", actionRoute: "/products", impact: -6, priority: 3,
      });
    }
  }

  // ── 2. ALERTES ENTRETIEN EN RETARD ───────────────────────────────────────

  // Tonte — fréquence adaptée par type de gazon
  const tonteFreq = isOmbre   ? (month >= 4 && month <= 9 ? 12 : 999)
                  : isRustiq  ? (month >= 4 && month <= 9 ? 18 : 999)
                  : isSport   ? (month >= 4 && month <= 9 ? 5  : 14)
                  : isBermuda ? (month >= 4 && month <= 10 ? 5 : 999)
                  : (month >= 4 && month <= 9 ? 5 : 12);

  if (tonteFreq < 999 && lastAction("tonte") > tonteFreq) {
    const retard = lastAction("tonte") - tonteFreq;
    const msgTonte = isOmbre   ? "Gazon ombre : tonte tous les 10-14j, hauteur 6-8cm minimum obligatoire."
                   : isRustiq  ? "Gazon rustique : tonte haute (7-10cm), fréquence 14-21j. Ne jamais couper ras."
                   : isSport   ? `Gazon sport : tonte tous les 4-5j été. Hauteur 3-4cm, jamais <2.5cm.`
                   : `Une pelouse non tondue perd en densité. Chaque semaine de retard = -5 pts.`;
    notifications.push({
      id: "mow_late",
      type: retard > 7 ? "danger" : "warning",
      icon: "✂️",
      title: `Tonte en retard de ${retard} jours`,
      message: msgTonte,
      action: "Planifier la tonte", actionRoute: "/today",
      impact: -Math.min(20, retard), priority: retard > 7 ? 1 : 3,
    });
  }

  // Engrais — bloqué pour Naturel (→ bio), Créer déjà géré
  if (plan?.engrais && !isNaturel) {
    if (lastAction("engrais") > 45) {
      notifications.push({
        id: "fert_late", type: "warning", icon: "🌱",
        title: "Engrais recommandé ce mois",
        message: `${plan.engrais}. Sans apport, votre gazon manquera de nutriments — risque de -8 pts.`,
        action: "Épandre l'engrais", actionRoute: "/today", impact: -8, priority: 3,
      });
    }
  }

  // Engrais bio — objectif Naturel uniquement
  if (isNaturel && plan?.engrais && lastAction("engrais") > 45) {
    notifications.push({
      id: "fert_bio", type: "info", icon: "🌿",
      title: "Engrais organique recommandé",
      message: "Objectif Naturel : farine de corne, guano ou compost. Libération lente, respectueux du sol et de la biodiversité.",
      action: "Voir les produits", actionRoute: "/products", impact: -6, priority: 3,
    });
  }

  // Aération — priorité élevée si sol argileux/compacté
  if (plan?.aeration && lastAction("aération") > 180) {
    notifications.push({
      id: "aeration_due", type: solArg ? "warning" : "info", icon: "🌀",
      title: solArg ? "Aération urgente — Sol compacté" : "Aération recommandée",
      message: solArg
        ? "Sol argileux/compacté : l'aération est prioritaire. Sans elle, l'eau et les engrais n'atteignent pas les racines (-8 pts)."
        : "C'est la période idéale pour aérer votre sol. Sans aération annuelle, le gazon s'étouffe progressivement (-6 pts).",
      action: "Planifier l'aération", actionRoute: "/today",
      impact: solArg ? -8 : -6, priority: solArg ? 2 : 3,
    });
  }

  // Verticut — bloqué pour ombre
  if (plan?.verticut && !isOmbre && lastAction("verticut") > 90) {
    notifications.push({
      id: "verticut_due", type: "info", icon: "🔧",
      title: "Verticut conseillé",
      message: "Le feutre s'accumule et étouffe votre gazon. Un verticut améliorerait votre score de +5 pts.",
      action: "Planifier le verticut", actionRoute: "/today", impact: -5, priority: 4,
    });
  }

  // Désherbage — bloqué pour Naturel, Rustique, Ombre
  if (!isNaturel && !isRustiq && !isOmbre && lastAction("désherbage") > 30 && month >= 3 && month <= 9) {
    notifications.push({
      id: "weed_due", type: "info", icon: "🪴",
      title: "Désherbage recommandé",
      message: "Les mauvaises herbes concurrencent votre gazon en cette saison. Un désherbage sélectif préserverait votre score actuel.",
      action: "Désherber", actionRoute: "/today", impact: -4, priority: 4,
    });
  }

  // Désherbage manuel — objectif Naturel ou Rustique
  if ((isNaturel || isRustiq) && lastAction("désherbage") > 45 && month >= 3 && month <= 9) {
    notifications.push({
      id: "weed_naturel", type: "info", icon: "🌿",
      title: isRustiq ? "Désherbage — Protégez le trèfle" : "Désherbage manuel recommandé",
      message: isRustiq
        ? "Gazon rustique : le trèfle est bénéfique. Éliminez uniquement les plantes envahissantes par arrachage manuel."
        : "Objectif Naturel : désherbage à la main ou à la vapeur uniquement. Pas de produits chimiques sélectifs.",
      action: "Voir les conseils", actionRoute: "/today", impact: -3, priority: 4,
    });
  }

  // Bermuda actif (avr-oct) — besoins spécifiques été
  if (isBermuda && !dormant && weather?.temp_max >= 22 && [4,5,6,7,8,9,10].includes(month)) {
    if (lastAction("arrosage") > 2) {
      notifications.push({
        id: "bermuda_water", type: "warning", icon: "🔵",
        title: "Bermuda — Arrosage intensif requis",
        message: `Bermuda en croissance active : 20-25mm/sem minimum. ${weather.temp_max}°C prévus — arrosez tôt le matin.`,
        action: "Arroser maintenant", actionRoute: "/today", impact: -10, priority: 2,
      });
    }
    if (lastAction("engrais") > 35 && [5,6,7].includes(month) && !isNaturel) {
      notifications.push({
        id: "bermuda_fert", type: "warning", icon: "🔵",
        title: "Bermuda — Engrais fréquent nécessaire",
        message: "Bermuda en saison chaude : engrais azoté toutes les 4 semaines. Ajoutez du fer pour maintenir la couleur verte.",
        action: "Épandre l'engrais", actionRoute: "/today", impact: -8, priority: 2,
      });
    }
  }

  // Sol argileux — rappel aération prioritaire hors plan mensuel
  if (solArg && lastAction("aération") > 270 && ![3,4,9,10].includes(month)) {
    notifications.push({
      id: "clay_compact", type: "warning", icon: "🏔️",
      title: "Sol argileux — Compaction en cours",
      message: "Sol argileux non aéré depuis longtemps. Prévoyez une aération dès mars ou septembre — priorité absolue.",
      action: "Voir le calendrier", actionRoute: "/today", impact: -6, priority: 3,
    });
  }

  // pH calcaire — alerte amendement
  if (solCalc && lastAction("chaux") > 180 && lastAction("amendement") > 180) {
    notifications.push({
      id: "calc_amend", type: "info", icon: "🧪",
      title: "Sol calcaire — Amendement recommandé",
      message: "Sol calcaire : ajoutez du soufre élémentaire pour abaisser le pH et améliorer la disponibilité du fer et du manganèse.",
      action: "Voir les produits", actionRoute: "/products", impact: -5, priority: 4,
    });
  }

  // ── 3. ALERTES SCORE EN BAISSE ───────────────────────────────────────────
  if (score <= 40) {
    notifications.push({
      id: "score_critical", type: "danger", icon: "🚨",
      title: "Score critique — Action urgente",
      message: "Votre gazon est en mauvais état. Sans intervention rapide, la situation va se dégrader. Consultez le plan du jour.",
      action: "Plan d'urgence", actionRoute: "/today", impact: -20, priority: 1,
    });
  } else if (score <= 55) {
    notifications.push({
      id: "score_low", type: "warning", icon: "⚠️",
      title: "Score en baisse",
      message: "Plusieurs facteurs dégradent votre gazon. Suivez les recommandations du jour pour remonter votre score.",
      action: "Voir les actions", actionRoute: "/today", impact: -10, priority: 2,
    });
  }

  // ── 4. ALERTES SAISONNIÈRES ──────────────────────────────────────────────

  // Engrais automne — bloqué pour Naturel
  if (month === 10 && !isNaturel && lastAction("engrais") > 30) {
    notifications.push({
      id: "winter_prep", type: "info", icon: "🍂",
      title: "Préparez votre gazon pour l'hiver",
      message: "Octobre = dernière chance d'appliquer un engrais automne riche en potassium. Sans cet apport, votre gazon hivernera affaibli (-8 pts au printemps).",
      action: "Appliquer l'engrais", actionRoute: "/today", impact: -8, priority: 2,
    });
  }

  // Engrais automne bio — Naturel uniquement
  if (month === 10 && isNaturel && lastAction("engrais") > 30) {
    notifications.push({
      id: "winter_prep_bio", type: "info", icon: "🌿",
      title: "Préparez l'hiver — Version naturelle",
      message: "Octobre : apportez du compost ou un engrais organique riche en potasse (cendres de bois, algues). Protège les racines naturellement.",
      action: "Voir les produits", actionRoute: "/products", impact: -6, priority: 2,
    });
  }

  // Regarnissage septembre — bloqué pour synthétique (déjà géré) et bermuda dormant
  if (month === 9 && lastAction("regarnissage") > 180) {
    notifications.push({
      id: "sept_renovation", type: "info", icon: "🌾",
      title: "C'est le moment de rénover !",
      message: "Septembre est LA période idéale pour un regarnissage. Sol encore chaud + humidité naturelle = germination optimale (+15 pts potentiels).",
      action: "Planifier la rénovation", actionRoute: "/today", impact: 15, priority: 2,
    });
  }

  // Bermuda — rappel reprise printanière
  if (isBermuda && month === 3) {
    notifications.push({
      id: "bermuda_spring", type: "info", icon: "🔵",
      title: "Bermuda — Reprise en cours",
      message: "Votre Bermuda sort de dormance. Attendez que la température dépasse 15°C avant de tondre et d'appliquer le premier engrais.",
      action: "Voir les conseils", actionRoute: "/today", impact: 0, priority: 3,
    });
  }

  // ── TRIER par priorité ───────────────────────────────────────────────────
  return notifications
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);
}
