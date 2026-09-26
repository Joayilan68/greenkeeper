// api/notificationEngine.cjs
// ─────────────────────────────────────────────────────────────────────────────
// MOTEUR DE DÉCISION DES NOTIFICATIONS (serveur) — source unique des notifications
//
// Règles issues de la KB "Règles Notifications". CommonJS pur : AUCUN appel réseau,
// AUCUN effet de bord → testable unitairement. send.js gère les I/O (météo, envoi, DB).
//
// Décisions actées : 2 notifs/jour max (matin priorité haute + soir arrosage N10),
// hiérarchie 6 priorités, N08 (regroupement), N10 (arrosage quantitatif ET₀).
// Itération 2b : type de gazon (synthétique, bermuda en dormance, rustique), risques
// de maladie, astuces de saison, anti-fatigue selon les jours sans visite.
// ─────────────────────────────────────────────────────────────────────────────

// Intervalles d'entretien (jours) — alignés sur send.js / useReminders KB v4
const INTERVALLES = { tonte: 5, arrosage: 3, engrais: 45, fongicide: 14, aeration: 90, desherbage: 21 };

const LABELS = {
  tonte:      { icon: "✂️", label: "Tonte" },
  arrosage:   { icon: "💧", label: "Arrosage" },
  engrais:    { icon: "🌱", label: "Engrais" },
  fongicide:  { icon: "🦠", label: "Prévention maladies" },
  aeration:   { icon: "🌀", label: "Aération" },
  desherbage: { icon: "🪴", label: "Désherbage" },
};

// Corps spécifiques (sinon « Il est temps de faire votre … »)
const CORPS = {
  fongicide: "Surveillez les taches (fil rouge, rouille, plaques rondes) et évitez d'arroser le soir. Un doute ? Faites un diagnostic photo.",
  desherbage: "Arrachez pissenlits et plantains avec leur racine, sur sol souple, puis regarnissez les trous.",
};

// ── Type de gazon (profil) ─────────────────────────────────────────────────────
const aType = (p, t) => p?.pelouse === t || (Array.isArray(p?.gazons) && p.gazons.includes(t));
const isGazonSynth    = (p) => p?.isSynthetique === true || aType(p, "synthetique");
const isGazonBermuda  = (p) => aType(p, "bermuda");
const isGazonRustique = (p) => aType(p, "rustique");
const isGazonOmbre    = (p) => aType(p, "ombre");
const isGazonSport    = (p) => aType(p, "sport");

// ── Équipement déclaré (profil) — adapte les rappels ──────────────────────────
// Robot tondeuse → pas de rappel tonte. Arrosage auto/programmateur → on parle
// de "régler le programmateur" plutôt que "d'arroser".
function hasRobotTondeuse(p) {
  return Array.isArray(p?.tondeuse) && p.tondeuse.includes("robot");
}
function hasArrosageAuto(p) {
  return p?.arrosage === "automatique" ||
    (Array.isArray(p?.materiel) && p.materiel.includes("arroseur"));
}

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
function decideArrosageSoir(weather, profile) {
  if (!weather) return null;
  const et0 = weather.et0;      // mm/j (premium)
  const pluie = weather.precip; // mm 24h
  // Arrosage automatique/programmateur déclaré → on parle de RÉGLER, pas d'arroser.
  const auto = hasArrosageAuto(profile);

  // Cas premium : bilan hydrique quantitatif
  if (typeof et0 === "number" && et0 > 0) {
    const p = typeof pluie === "number" ? pluie : 0;
    const ratio = p / et0;
    if (ratio >= 0.80) {
      return { title: "✓ Pas d'arrosage demain matin",
        body: `Il a plu ~${p.toFixed(1)} mm, suffisant pour le besoin du jour (${et0.toFixed(1)} mm). Économisez l'eau.` };
    }
    if (ratio >= 0.20) {
      const manque = Math.max(0, et0 - p);
      return auto
        ? { title: "💧 Ajustez votre programmateur",
            body: `Pluie partielle (${p.toFixed(1)} mm). Réglez votre programmateur pour compléter ~${manque.toFixed(1)} mm demain matin, tôt.` }
        : { title: "💧 Complétez l'arrosage",
            body: `Pluie partielle (${p.toFixed(1)} mm). Complétez d'environ ${manque.toFixed(1)} mm demain matin, tôt.` };
    }
    return auto
      ? { title: "💧 Ajustez votre programmateur",
          body: `Besoin du jour ~${et0.toFixed(1)} mm, peu de pluie. Programmez l'arrosage pour demain matin tôt : moins d'évaporation et de maladies.` }
      : { title: "💧 Arrosage demain matin",
          body: `Besoin du jour ~${et0.toFixed(1)} mm, peu de pluie. Arrosez demain matin tôt : moins d'évaporation et de maladies.` };
  }

  // Fallback sans ET₀ : logique simple sur la pluie
  if (typeof pluie === "number" && pluie >= 8) return null; // assez plu → pas de notif
  return auto
    ? { title: "💧 Vérifiez votre programmateur",
        body: "Peu de pluie prévue : assurez-vous que votre programmateur arrose demain matin tôt." }
    : { title: "💧 Pensez à arroser",
        body: "Peu de pluie prévue : un arrosage demain matin tôt aidera votre gazon." };
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
    // Gazon rustique : trèfle et fleurs font partie du gazon → pas de désherbage
    if (id === "desherbage" && isGazonRustique(profile)) continue;
    // Robot déclaré → on ne rappelle pas "tondez" mais une SUPERVISION espacée (14j) :
    // filet de sécurité si le robot ne tond pas (panne / débranché / non connecté).
    const robotTonte = id === "tonte" && hasRobotTondeuse(profile);
    const lastSent = r.lastSent ? new Date(r.lastSent) : null;
    const daysSince = lastSent ? Math.floor((Date.now() - lastSent.getTime()) / 86400000) : 999;
    const interval = robotTonte ? 14 : (INTERVALLES[id] || 7);
    if (daysSince >= interval) {
      const info = robotTonte
        ? { id, icon: "🤖", label: "Vérifier le robot", supervision: true }
        : { id, ...(LABELS[id] || { icon: "🌿", label: id }) };
      dus.push(info);
    }
  }

  if (!dus.length) return null;

  // N08 — regroupement : 1 notif listant jusqu'à 3 actions, sinon "et autres"
  if (dus.length === 1) {
    const a = dus[0];
    const body = a.supervision
      ? "Votre robot tondeuse a-t-il bien tondu ? Vérifiez la lame et la hauteur de coupe."
      : CORPS[a.id] || `Il est temps de faire votre ${a.label.toLowerCase()}.`;
    return { priority: 3, type: `entretien_${a.id}`,
      title: `${a.icon} ${a.label}`, body };
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
// NIVEAU 3 bis — Risque de maladie selon la météo (au plus 1 fois par semaine et par maladie).
// Mesures préventives uniquement : les fongicides de synthèse sont interdits aux particuliers.
// ─────────────────────────────────────────────────────────────────────────────
function checkMaladie(weather, profile, month, notifLog, today) {
  if (!weather) return null;
  const { temp_min, temp_max, humidity, precip } = weather;
  let m = null;
  if (typeof temp_min === "number" && temp_min < 5 && (humidity || 0) > 85 && [10, 11, 2, 3, 4].includes(month))
    m = { type: "maladie_fusariose", title: "🦠 Risque de fusariose",
      body: "Froid humide : ramassez les feuilles, évitez l'engrais azoté et ne marchez pas sur le gazon mouillé. Plaques rondes beige-rosé ? Faites un diagnostic photo." };
  else if ((temp_max || 0) > 30 && (precip || 0) > 3 && [6, 7, 8].includes(month))
    m = { type: "maladie_pythium", title: "🦠 Risque de pythium",
      body: "Chaleur et pluie : n'arrosez pas le soir et évitez l'engrais. Taches grasses gris-vert ? Faites un diagnostic photo." };
  else if (isGazonOmbre(profile) && (temp_max || 0) >= 18 && (temp_max || 0) <= 24 && (humidity || 0) >= 70 && [4, 5, 9, 10].includes(month))
    m = { type: "maladie_oidium", title: "🦠 Risque d'oïdium",
      body: "Temps doux et humide à l'ombre : surveillez une poudre blanche sur les brins. Tondez un peu plus haut et aérez." };
  else if (isGazonSport(profile) && (temp_max || 0) > 25 && (precip || 0) < 2 && [5, 6, 7, 8, 9].includes(month))
    m = { type: "maladie_helmintho", title: "🦠 Risque d'helminthosporiose",
      body: "Chaleur et sécheresse : arrosez tôt le matin, en profondeur. Taches brun-noir ? Faites un diagnostic photo." };
  if (!m) return null;
  const h = (notifLog && Array.isArray(notifLog.history)) ? notifLog.history : [];
  const semaine = new Date(Date.parse(today || new Date().toISOString().slice(0, 10)) - 7 * 86400000).toISOString().slice(0, 10);
  if (h.some(x => x.type === m.type && x.date > semaine)) return null;
  return { priority: 3, ...m };
}

// ─────────────────────────────────────────────────────────────────────────────
// NIVEAU 6 — Éducatif (dernier filet) et socle quotidien de send.js : astuces de Bob,
// filtrées par saison (mois), rotation déterministe par jour.
// ─────────────────────────────────────────────────────────────────────────────
const PRINTEMPS = [3, 4, 5], ETE = [6, 7, 8], AUTOMNE = [9, 10, 11], HIVER = [12, 1, 2];
const CONSEILS_QUOTIDIENS = [
  { title:"✂️ Le conseil de Bob",     body:"Ne tonds jamais plus d'un tiers de la hauteur d'un coup : ton gazon reste dense et résiste mieux." },
  { title:"💧 Astuce arrosage",       body:"Arrose tôt le matin plutôt que le soir : moins d'évaporation, moins de maladies.", mois:[...PRINTEMPS, ...ETE, 9] },
  { title:"🌱 Bob te souffle",         body:"Une lame de tonte bien affûtée coupe net ; une lame émoussée déchire et jaunit les pointes." },
  { title:"☀️ Le saviez-vous",         body:"En période chaude, remonte la hauteur de tonte : une herbe plus haute garde le sol frais.", mois:[5, ...ETE] },
  { title:"🍂 Conseil du jour",        body:"Ramasse les feuilles mortes : sous un tapis de feuilles, le gazon s'asphyxie et la mousse s'installe.", mois:[10, 11, 12] },
  { title:"🌿 Bob rappelle",           body:"Laisse parfois les tontes fines sur place (mulching) : elles nourrissent ton sol gratuitement.", mois:[...PRINTEMPS, ...ETE, 9, 10] },
  { title:"💪 Astuce racines",         body:"Arrose moins souvent mais plus abondamment : les racines plongent et ton gazon devient plus résistant.", mois:[...PRINTEMPS, ...ETE, 9] },
  { title:"🔍 L'œil de Bob",           body:"Des taches jaunes qui s'étendent ? Prends-les en photo dans l'app, je te dis ce que c'est." },
  { title:"🌾 Conseil semis",          body:"Un sol bien griffé avant de semer, c'est deux fois plus de graines qui lèvent.", mois:[3, 4, 5, 9, 10] },
  { title:"🪱 Bob t'explique",         body:"Des vers de terre, c'est bon signe : ils aèrent ton sol mieux qu'aucun outil." },
  { title:"🌡️ Astuce saison",         body:"Le gazon pousse surtout quand le sol est entre 10 et 25 °C : c'est là qu'il faut le chouchouter." },
  { title:"🚫 Erreur fréquente",       body:"Trop d'engrais brûle le gazon. Mieux vaut peu, mais au bon moment.", mois:[...PRINTEMPS, ...AUTOMNE] },
  { title:"🌧️ Bob observe le ciel",   body:"Pluie annoncée ? Reporte l'arrosage : inutile de doubler ce que fait la nature.", mois:[...PRINTEMPS, ...ETE, 9] },
  { title:"🏆 Motivation du jour",     body:"Un beau gazon, c'est de la régularité, pas de l'effort intense. Un petit geste vaut mieux qu'un grand coup." },
  { title:"🌱 Conseil densité",        body:"Un gazon dense étouffe les mauvaises herbes tout seul : vise l'épaisseur avant tout." },
  { title:"✂️ Bob insiste",           body:"Varie le sens de tonte à chaque passage : l'herbe se redresse mieux et pousse plus droite.", mois:[...PRINTEMPS, ...ETE, ...AUTOMNE] },
  { title:"💚 Astuce couleur",         body:"Un gazon qui vire au bleu-gris a soif : c'est le tout premier signe, avant le jaune.", mois:[...PRINTEMPS, ...ETE, 9] },
  { title:"🌍 Le mot de Bob",          body:"Un gazon en bonne santé, c'est aussi de la fraîcheur, de l'oxygène et de la biodiversité chez toi." },
  { title:"❄️ Conseil d'hiver",        body:"Gazon gelé ou givré ? N'y marche pas : les brins cassent et laissent des traces brunes.", mois:[11, ...HIVER, 3] },
  { title:"🧪 Bob te conseille",       body:"L'hiver est le bon moment pour mesurer le pH et chauler si ton sol est acide (pH sous 6).", mois:[11, ...HIVER] },
  { title:"🔧 Astuce matériel",        body:"Profite de la pause d'hiver pour faire affûter la lame et réviser ta tondeuse.", mois:[11, ...HIVER] },
];

// Astuce du jour pour le mois donné (rotation déterministe par jour)
function conseilDuJour(today, month) {
  const liste = CONSEILS_QUOTIDIENS.filter(c => !c.mois || c.mois.includes(month));
  const jour = Math.floor(Date.parse(today || new Date().toISOString().slice(0, 10)) / 86400000);
  return liste[jour % liste.length];
}

function checkEducatif(today, month) {
  const c = conseilDuJour(today, month);
  return { priority: 6, type: "educatif", title: c.title, body: c.body };
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION PRINCIPALE — decideNotification
// Renvoie UNE notif (la plus prioritaire dispo, non déjà servie) ou null.
// ─────────────────────────────────────────────────────────────────────────────
function decideNotification(ctx) {
  const {
    profile = {}, weather = null, reminderPrefs = {}, history = [],
    notifLog = null, month = null, slot = "matin", today = null,
    gami = null, parcours: parcoursState = null, joursInactif = 0,
  } = ctx || {};

  const sent = sentTodayInfo(notifLog, today);

  // ── Type de gazon : synthétique (pas de tonte, d'engrais ni d'arrosage) et bermuda en
  //    dormance hivernale (nov-mars : brun normal, aucune intervention) ─────────────────
  const synth   = isGazonSynth(profile);
  const dormant = isGazonBermuda(profile) && [11, 12, 1, 2, 3].includes(month);

  // ── Plafond 2/jour (hors urgence niveau 1) ────────────────────────────────
  // L'urgence niveau 1 peut s'ajouter même si le plafond est atteint.
  let urgence = checkUrgenceMeteo(weather);
  if (urgence && synth && urgence.type !== "urgence_canicule") urgence = null;
  if (urgence && dormant && urgence.type === "urgence_gel") urgence = null;
  if (urgence) {
    // éviter de renvoyer la même urgence 2x le même jour
    if (!sent.priorities.includes(1) || !sameTypeSentToday(notifLog, today, urgence.type)) {
      return finalize(urgence, slot);
    }
  }

  if (synth || dormant) return null;

  // Si déjà 2 notifs aujourd'hui (hors urgence) → stop
  const nonUrgentSent = sent.count - countUrgentToday(notifLog, today);
  if (nonUrgentSent >= 2) return null;

  // ── Anti-fatigue selon les jours sans visite dans l'app (urgences et parcours exemptés) :
  //    ≥ 7 j → 1 notification par jour (matin), sans gamification ni astuce ;
  //    ≥ 21 j → en plus, au plus une tous les 3 jours (2 à 3 par semaine).
  const fatigue = joursInactif >= 21 ? 2 : joursInactif >= 7 ? 1 : 0;
  const recentNonUrgent = (notifLog?.history || []).some(x => x.priority !== 1 && x.priority !== 2 &&
    x.date > new Date(Date.parse(today || new Date().toISOString().slice(0, 10)) - 3 * 86400000).toISOString().slice(0, 10));

  // ── Créneau SOIR : dédié à l'arrosage (N10) ───────────────────────────────
  if (slot === "soir") {
    // déjà envoyé au soir aujourd'hui ?
    if (sent.slots.includes("soir")) return null;
    // parcours actif d'abord (germination), sinon arrosage entretien
    const parcours = checkParcoursActif(parcoursState, weather, "soir");
    if (parcours) return finalize(parcours, "soir");
    if (fatigue) return null;
    const ars = decideArrosageSoir(weather, profile);
    if (ars) return finalize({ priority: 2, type: "arrosage_soir", title: ars.title, body: ars.body }, "soir");
    return null; // rien de pertinent le soir → on n'envoie pas pour envoyer
  }

  // ── Créneau MATIN : la priorité la plus haute disponible (2 → 6) ──────────
  if (sent.slots.includes("matin")) return null;

  const parcoursMatin = checkParcoursActif(parcoursState, weather, "matin");  // 2 (exempté d'anti-fatigue)
  if (parcoursMatin) return finalize(parcoursMatin, "matin");
  if (fatigue === 2 && recentNonUrgent) return null;

  const candidates = [
    checkEntretienDu(profile, reminderPrefs, history, month), // 3 (N08)
    checkMaladie(weather, profile, month, notifLog, today),   // 3 bis
    checkConseilMeteo(weather),                       // 4
    ...(fatigue ? [] : [
      checkGamification(gami),                        // 5
      checkEducatif(today, month),                    // 6 (toujours dispo = filet ultime)
    ]),
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

module.exports = { decideNotification, appendNotifLog, conseilDuJour, INTERVALLES, LABELS };
