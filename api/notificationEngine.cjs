// api/notificationEngine.cjs
// ─────────────────────────────────────────────────────────────────────────────
// MOTEUR DE DÉCISION DES NOTIFICATIONS — Itération 2a (serveur)
//
// Porté depuis la KB "Règles Notifications" + notifications.js (front).
// CommonJS pur : AUCUN import ESM, AUCUN appel réseau, AUCUN effet de bord.
// → 100% testable unitairement. send.js l'appelle et gère les I/O (météo, envoi, DB).
//
// ⚠️ LIEN DE COHÉRENCE : la logique agronomique ici doit rester alignée avec
//    src/lib/notifications.js (front). Si une règle change là-bas, répercuter ici
//    (et inversement). Migration vers module partagé prévue en itération 2b.
//
// Décisions actées : 2 notifs/jour max (matin priorité haute + soir arrosage N10),
// hiérarchie 6 priorités, N08 (regroupement), N10 (arrosage quantitatif ET₀).
// Anti-fatigue (ignored_streak) : champ présent mais NON utilisé en 2a.
// ─────────────────────────────────────────────────────────────────────────────

// Intervalles d'entretien (jours) — alignés sur send.js / useReminders KB v4
const INTERVALLES = { tonte: 5, arrosage: 3, engrais: 45, fongicide: 14, aeration: 90, desherbage: 21 };

const LABELS = {
  tonte:      { icon: "✂️", label: "Tonte" },
  arrosage:   { icon: "💧", label: "Arrosage" },
  engrais:    { icon: "🌱", label: "Engrais" },
  fongicide:  { icon: "💊", label: "Traitement fongicide" },
  aeration:   { icon: "🌀", label: "Aération" },
  desherbage: { icon: "🪴", label: "Désherbage" },
};

// ── Helpers date (parse "DD/MM/YYYY" de l'historique) ────────────────────────
function daysSinceFr(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return 999;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return 999;
  const [d, m, y] = parts;
  const t = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  if (isNaN(t)) return 999;
  return Math.floor((Date.now() - t) / 86400000);
}

function lastActionDays(history, keyword) {
  if (!Array.isArray(history)) return 999;
  const found = history.filter(h => (h.action || "").toLowerCase().includes(keyword.toLowerCase()));
  if (!found.length) return 999;
  return Math.min(...found.map(h => daysSinceFr(h.date)));
}

// ── notif_log : combien de notifs déjà envoyées aujourd'hui, et quelles priorités
function sentTodayInfo(notifLog, today) {
  const history = (notifLog && Array.isArray(notifLog.history)) ? notifLog.history : [];
  const todays = history.filter(h => h.date === today);
  return {
    count: todays.length,
    priorities: todays.map(h => h.priority),
    slots: todays.map(h => h.slot),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NIVEAU 1 — Urgence météo (gel / canicule / pluie forte). Matin ET soir.
// Seuils alignés sur computeAlerts (lawn.js).
// ─────────────────────────────────────────────────────────────────────────────
function checkUrgenceMeteo(weather) {
  if (!weather) return null;
  const { temp_min, temp_max, precip, wind } = weather;
  if (typeof temp_min === "number" && temp_min <= 2) {
    return { priority: 1, type: "urgence_gel",
      title: "❄️ Gel cette nuit",
      body: "Ne tondez pas et protégez les jeunes semis. Évitez de marcher sur le gazon gelé." };
  }
  if (typeof temp_max === "number" && temp_max >= 33) {
    return { priority: 1, type: "urgence_canicule",
      title: "🔥 Canicule aujourd'hui",
      body: `${temp_max}°C prévus : arrosage renforcé tôt le matin, évitez la tonte.` };
  }
  if (typeof precip === "number" && precip >= 20) {
    return { priority: 1, type: "urgence_pluie",
      title: "🌧️ Fortes pluies",
      body: "Reportez tonte et traitements. Surveillez le drainage." };
  }
  if (typeof wind === "number" && wind >= 40) {
    return { priority: 1, type: "urgence_vent",
      title: "💨 Vents forts",
      body: "Reportez la tonte et les traitements (dérive)." };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// NIVEAU 2 — Action parcours actif (semis en cours).
// Branché sur l'état RÉEL du parcours (table `parcours` via parcoursEngine.currentPhase,
// calculé par send.js et transmis dans ctx.parcours) — MÊME source de vérité que
// phaseParcours()/Today.jsx côté front. Ne dépend plus de profile.objectif (ancien
// système, dormant) : ce champ n'est pas mis à jour par la création d'un parcours.
// ─────────────────────────────────────────────────────────────────────────────
function checkParcoursActif(parcoursState, weather, slot) {
  if (!parcoursState) return null;

  // Au créneau soir, l'arrosage prime. Phase < 5 : le parcours pilote l'arrosage —
  // même texte que la carte "Arrosage recommandé" de Today.jsx (phaseP.arrosage).
  if (slot === "soir") {
    if (parcoursState.phase < 5 && parcoursState.arrosage) {
      return { priority: 2, type: "parcours_arrosage",
        title: "💧 Arrosage — " + parcoursState.nom,
        body: parcoursState.arrosage };
    }
    return null; // phase 5 (consolidation) : cycle normal, pas de spécificité parcours
  }
  // Le matin : rappel de la phase + action du jour — même texte que currentPhase()/le suivi parcours.
  return { priority: 2, type: "parcours_actif",
    title: `🌱 Parcours en cours — ${parcoursState.nom}`,
    body: parcoursState.action || "Suivez votre programme du jour dans l'app pour réussir votre gazon." };
}

// ─────────────────────────────────────────────────────────────────────────────
// N10 — Décision arrosage quantitative (bilan hydrique ET₀ vs pluie). Créneau soir.
// besoin = et0 du jour ; pluie = precip 24h. ratio = pluie/besoin.
//   >=0.80 → annulé (message positif)   ; 0.20-0.80 → complément ; <0.20 → arrosage
// Si pas d'ET₀ (free ou météo indispo) → fallback simple sur precip.
// ─────────────────────────────────────────────────────────────────────────────
function decideArrosageSoir(weather) {
  if (!weather) return null;
  const et0 = weather.et0;      // mm/j (premium)
  const pluie = weather.precip; // mm 24h

  // Cas premium : bilan hydrique quantitatif
  if (typeof et0 === "number" && et0 > 0) {
    const p = typeof pluie === "number" ? pluie : 0;
    const ratio = p / et0;
    if (ratio >= 0.80) {
      return { title: "✓ Pas d'arrosage ce soir",
        body: `Il a plu ~${p.toFixed(1)} mm, suffisant pour le besoin du jour (${et0.toFixed(1)} mm). Économisez l'eau.` };
    }
    if (ratio >= 0.20) {
      const manque = Math.max(0, et0 - p);
      return { title: "💧 Complétez l'arrosage",
        body: `Pluie partielle (${p.toFixed(1)} mm). Complétez d'environ ${manque.toFixed(1)} mm ce soir.` };
    }
    return { title: "💧 Arrosez ce soir",
      body: `Besoin du jour ~${et0.toFixed(1)} mm, peu de pluie. Arrosez tôt le soir pour limiter l'évaporation.` };
  }

  // Fallback sans ET₀ : logique simple sur la pluie
  if (typeof pluie === "number" && pluie >= 8) return null; // assez plu → pas de notif
  return { title: "💧 Pensez à arroser",
    body: "Peu de pluie prévue : un arrosage ce soir aidera votre gazon." };
}

// ─────────────────────────────────────────────────────────────────────────────
// NIVEAU 3 — Rappels entretien dus (intervalles KB). N08 : regroupement. Matin.
// ─────────────────────────────────────────────────────────────────────────────
function checkEntretienDu(profile, reminderPrefs, history, month) {
  const prefs = reminderPrefs || {};
  const dus = [];

  for (const [id, r] of Object.entries(prefs)) {
    if (!r || typeof r !== "object" || !r.enabled) continue;
    // Ne pas rappeler l'arrosage ici (géré au créneau soir avec N10)
    if (id === "arrosage") continue;
    const lastSent = r.lastSent ? new Date(r.lastSent) : null;
    const daysSince = lastSent ? Math.floor((Date.now() - lastSent.getTime()) / 86400000) : 999;
    const interval = INTERVALLES[id] || 7;
    if (daysSince >= interval) {
      const info = LABELS[id] || { icon: "🌿", label: id };
      dus.push({ id, ...info });
    }
  }

  if (!dus.length) return null;

  // N08 — regroupement : 1 notif listant jusqu'à 3 actions, sinon "et autres"
  if (dus.length === 1) {
    const a = dus[0];
    return { priority: 3, type: `entretien_${a.id}`,
      title: `${a.icon} ${a.label}`,
      body: `Il est temps de faire votre ${a.label.toLowerCase()}.` };
  }
  const noms = dus.slice(0, 3).map(a => a.label.toLowerCase());
  const reste = dus.length > 3 ? ` et ${dus.length - 3} autre(s)` : "";
  return { priority: 3, type: "entretien_groupe",
    title: "🌿 Plusieurs entretiens à prévoir",
    body: `Aujourd'hui : ${noms.join(", ")}${reste}. Ouvrez l'app pour le détail.` };
}

// ─────────────────────────────────────────────────────────────────────────────
// NIVEAU 4 — Conseil météo du jour. Matin. (pertinent seulement si météo dispo)
// ─────────────────────────────────────────────────────────────────────────────
function checkConseilMeteo(weather) {
  if (!weather) return null;
  const { temp_max, soil_temp } = weather;
  if (typeof temp_max === "number" && temp_max >= 26) {
    return { priority: 4, type: "conseil_chaleur",
      title: `☀️ ${temp_max}°C aujourd'hui`,
      body: "Arrosez tôt le matin ou en soirée pour limiter l'évaporation." };
  }
  if (typeof soil_temp === "number" && soil_temp >= 10 && soil_temp <= 14) {
    return { priority: 4, type: "conseil_sol_semis",
      title: "🌱 Sol favorable au semis",
      body: `Température du sol ~${soil_temp.toFixed(0)}°C : conditions idéales pour semer ou regarnir.` };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// NIVEAU 5 — Gamification (filet rétention jours creux). Matin.
// ─────────────────────────────────────────────────────────────────────────────
function checkGamification(gami) {
  if (!gami) return null;
  if (typeof gami.streak === "number" && gami.streak >= 2) {
    return { priority: 5, type: "gami_streak",
      title: `🔥 Série de ${gami.streak} jours !`,
      body: "Ouvrez l'app aujourd'hui pour maintenir votre série." };
  }
  if (typeof gami.leagueRank === "number" && gami.leagueRank <= 5) {
    return { priority: 5, type: "gami_league",
      title: `⬆️ ${gami.leagueRank}e de votre ligue`,
      body: "Gagnez des GreenPoints pour grimper au classement." };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// NIVEAU 6 — Éducatif (dernier filet). Matin, 2-3x/sem max (géré via notif_log).
// ─────────────────────────────────────────────────────────────────────────────
const TIPS = [
  "En été, tondez haut (7-8 cm) : le gazon résiste mieux à la sécheresse.",
  "Un arrosage rare mais copieux enracine mieux qu'un arrosage quotidien léger.",
  "Laissez l'herbe coupée fine sur place (mulching) : elle nourrit le sol.",
  "Alternez le sens de tonte pour éviter que l'herbe ne se couche.",
  "En hiver, évitez de marcher sur un gazon gelé : les brins cassent.",
];
function checkEducatif(today) {
  // Rotation déterministe par jour (pas de random pour rester testable)
  const seed = today ? today.split("-").reduce((a, b) => a + Number(b), 0) : 0;
  const tip = TIPS[seed % TIPS.length];
  return { priority: 6, type: "educatif",
    title: "💡 Le saviez-vous ?", body: tip };
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION PRINCIPALE — decideNotification
// Renvoie UNE notif (la plus prioritaire dispo, non déjà servie) ou null.
// ─────────────────────────────────────────────────────────────────────────────
function decideNotification(ctx) {
  const {
    profile = {}, weather = null, reminderPrefs = {}, history = [],
    notifLog = null, month = null, slot = "matin", today = null,
    gami = null, parcours: parcoursState = null,
  } = ctx || {};

  const sent = sentTodayInfo(notifLog, today);

  // ── Plafond 2/jour (hors urgence niveau 1) ────────────────────────────────
  // L'urgence niveau 1 peut s'ajouter même si le plafond est atteint.
  const urgence = checkUrgenceMeteo(weather);
  if (urgence) {
    // éviter de renvoyer la même urgence 2x le même jour
    if (!sent.priorities.includes(1) || !sameTypeSentToday(notifLog, today, urgence.type)) {
      return finalize(urgence, slot);
    }
  }

  // Si déjà 2 notifs aujourd'hui (hors urgence) → stop
  const nonUrgentSent = sent.count - countUrgentToday(notifLog, today);
  if (nonUrgentSent >= 2) return null;

  // ── Créneau SOIR : dédié à l'arrosage (N10) ───────────────────────────────
  if (slot === "soir") {
    // déjà envoyé au soir aujourd'hui ?
    if (sent.slots.includes("soir")) return null;
    // parcours actif d'abord (germination), sinon arrosage entretien
    const parcours = checkParcoursActif(parcoursState, weather, "soir");
    if (parcours) return finalize(parcours, "soir");
    const ars = decideArrosageSoir(weather);
    if (ars) return finalize({ priority: 2, type: "arrosage_soir", title: ars.title, body: ars.body }, "soir");
    return null; // rien de pertinent le soir → on n'envoie pas pour envoyer
  }

  // ── Créneau MATIN : la priorité la plus haute disponible (2 → 6) ──────────
  if (sent.slots.includes("matin")) return null;

  const candidates = [
    checkParcoursActif(parcoursState, weather, "matin"),   // 2
    checkEntretienDu(profile, reminderPrefs, history, month), // 3 (N08)
    checkConseilMeteo(weather),                       // 4
    checkGamification(gami),                          // 5
    checkEducatif(today),                             // 6 (toujours dispo = filet ultime)
  ].filter(Boolean);

  if (!candidates.length) return null;
  // la plus prioritaire (priority la plus basse en nombre)
  candidates.sort((a, b) => a.priority - b.priority);
  return finalize(candidates[0], "matin");
}

// ── Helpers internes ──────────────────────────────────────────────────────
function finalize(notif, slot) {
  return {
    priority: notif.priority,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    tag: `mg360-${notif.type}`,
    url: "/today",
    slot,
  };
}

function countUrgentToday(notifLog, today) {
  const h = (notifLog && Array.isArray(notifLog.history)) ? notifLog.history : [];
  return h.filter(x => x.date === today && x.priority === 1).length;
}

function sameTypeSentToday(notifLog, today, type) {
  const h = (notifLog && Array.isArray(notifLog.history)) ? notifLog.history : [];
  return h.some(x => x.date === today && x.type === type);
}

// ── Mise à jour du notif_log (appelée par send.js après envoi réussi) ────────
function appendNotifLog(notifLog, entry) {
  const base = (notifLog && typeof notifLog === "object") ? notifLog : { history: [], ignored_streak: 0 };
  const history = Array.isArray(base.history) ? base.history.slice() : [];
  // Conserve tous les champs fournis (date, priority, type, slot, et channel si présent)
  history.push({ ...entry });
  // borne : ne garder que les 14 derniers jours
  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const pruned = history.filter(h => h.date >= cutoff);
  return { history: pruned, ignored_streak: base.ignored_streak || 0 };
}

module.exports = { decideNotification, appendNotifLog, INTERVALLES, LABELS };
