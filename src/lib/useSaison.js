// src/lib/useSaison.js
// Chef d'orchestre saisonnier — détermine le mode actuel de l'app
// Aucun appel API — 100% local — zéro latence

export const SAISONS = {
  // ── MODE ACTIF (Février → Octobre) ──────────────────────────────────────
  2:  { mode: "actif",      classement: true,  notifs_semaine: 4, label: "Février",   emoji: "🌱" },
  3:  { mode: "actif",      classement: true,  notifs_semaine: 4, label: "Mars",      emoji: "🌱" },
  4:  { mode: "actif",      classement: true,  notifs_semaine: 4, label: "Avril",     emoji: "🌸" },
  5:  { mode: "actif",      classement: true,  notifs_semaine: 4, label: "Mai",       emoji: "🌿" },
  6:  { mode: "actif",      classement: true,  notifs_semaine: 3, label: "Juin",      emoji: "☀️" },
  7:  { mode: "actif",      classement: true,  notifs_semaine: 3, label: "Juillet",   emoji: "☀️" },
  8:  { mode: "actif",      classement: true,  notifs_semaine: 3, label: "Août",      emoji: "☀️" },
  9:  { mode: "actif",      classement: true,  notifs_semaine: 4, label: "Septembre", emoji: "🍂" },
  10: { mode: "actif",      classement: true,  notifs_semaine: 3, label: "Octobre",   emoji: "🍂" },
  // ── MODE TRANSITION (Novembre) ──────────────────────────────────────────
  11: { mode: "transition", classement: false, notifs_semaine: 2, label: "Novembre",  emoji: "🍁" },
  // ── MODE HIVERNAL (Décembre → Janvier) ──────────────────────────────────
  12: { mode: "hivernal",   classement: false, notifs_semaine: 1, label: "Décembre",  emoji: "❄️" },
  1:  { mode: "hivernal",   classement: false, notifs_semaine: 1, label: "Janvier",   emoji: "❄️" },
};

// Messages selon la saison
export const SAISON_MESSAGES = {
  actif: {
    accueil:      "🌿 C'est la saison — prenez soin de votre gazon !",
    classement:   "🏆 Le classement est actif — grimpez dans les ligues !",
    streak:       "🔥 Maintenez votre streak quotidien !",
  },
  transition: {
    accueil:      "🍁 Votre gazon entre en période de repos.",
    classement:   "Le classement reprend en février — préparez votre retour !",
    streak:       "🛡️ Streak protégé — 1 connexion/semaine suffit cet hiver.",
    fin_saison:   "🏆 Bravo pour cette saison ! Votre classement final est sauvegardé.",
  },
  hivernal: {
    accueil:      "❄️ Votre gazon se repose. Profitez-en pour préparer le printemps !",
    classement:   "😴 Classement en pause — reprend en février.",
    streak:       "🛡️ Streak protégé cet hiver — revenez 1x/semaine pour le garder.",
    conseil:      "📚 Découvrez nos guides pour préparer une saison parfaite.",
  },
};

// Compte à rebours vers le retour de la saison active
function joursAvantSaison(moisActuel) {
  if (moisActuel === 12) return 31 + 31; // Jan + Feb
  if (moisActuel === 1)  return 31;      // Feb seulement
  if (moisActuel === 11) return 61;      // Dec + Jan + Feb
  return 0;
}

// Compte à rebours vers la fin de saison
function joursAvantHiver(moisActuel) {
  if (moisActuel === 10) return 30;
  if (moisActuel === 9)  return 60;
  return 0;
}

export function useSaison() {
  const mois = new Date().getMonth() + 1; // 1-12
  const saison = SAISONS[mois];
  const messages = SAISON_MESSAGES[saison.mode];

  const isActif      = saison.mode === "actif";
  const isHivernal   = saison.mode === "hivernal";
  const isTransition = saison.mode === "transition";

  // Alertes de transition
  const finSaisonImminente = mois === 10; // Octobre = dernier mois actif
  const retourSaisonProche = mois === 1;  // Janvier = bientôt le retour

  // Nombre de jours avant changement de mode
  const joursAvantRetour = joursAvantSaison(mois);
  const joursAvantFin    = joursAvantHiver(mois);

  return {
    mois,
    saison,
    mode:      saison.mode,
    label:     saison.label,
    emoji:     saison.emoji,
    messages,

    // Booleans pratiques
    isActif,
    isHivernal,
    isTransition,
    classementActif:     saison.classement,
    notifsParSemaine:    saison.notifs_semaine,

    // Transitions
    finSaisonImminente,
    retourSaisonProche,
    joursAvantRetour,
    joursAvantFin,

    // Streak : en hiver 1x/semaine suffit, en actif 1x/jour
    streakFrequenceHeures: isHivernal || isTransition ? 168 : 24,

    // Intensité de la gamification (0 à 1)
    intensiteGamification: isActif ? 1 : isTransition ? 0.5 : 0.2,
  };
}
