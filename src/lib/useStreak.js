// src/lib/useStreak.js
// Streaks quotidiens avec protection hivernale
// 100% localStorage — zéro API — zéro latence

import { useState, useEffect, useCallback } from "react";
import { useSaison } from "./useSaison";

const KEY = "gk_streak";

function defaultState() {
  return {
    actuel:       0,    // jours consécutifs actuels
    record:       0,    // meilleur streak historique
    derniere_connexion: null, // timestamp
    protege_hiver: false,     // streak protégé cet hiver
    milestones_atteints: [],  // [7, 30, 100, 365]
  };
}

function getState() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || defaultState();
  } catch { return defaultState(); }
}

function saveState(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

// Vérifie si deux timestamps sont le même jour calendaire
function memejour(ts1, ts2) {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return d1.getFullYear() === d2.getFullYear()
      && d1.getMonth() === d2.getMonth()
      && d1.getDate() === d2.getDate();
}

// Vérifie si ts1 était hier par rapport à ts2
function etaitHier(ts1, ts2) {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  d1.setHours(0,0,0,0); d2.setHours(0,0,0,0);
  return d2.getTime() - d1.getTime() === 86400000;
}

// Vérifie si dans la même semaine calendaire
function memeSemaine(ts1, ts2) {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  d1.setHours(0,0,0,0); d2.setHours(0,0,0,0);
  const diff = Math.abs(d2.getTime() - d1.getTime());
  return diff < 7 * 86400000;
}

// Milestones avec messages
export const STREAK_MILESTONES = [
  { jours: 3,   label: "3 jours",    icone: "🌱", bonus: 50,    message: "Premier pas — continue !" },
  { jours: 7,   label: "1 semaine",  icone: "🔥", bonus: 200,   message: "Semaine verte — tu es lancé !" },
  { jours: 14,  label: "2 semaines", icone: "🌿", bonus: 400,   message: "2 semaines — l'habitude est prise !" },
  { jours: 30,  label: "1 mois",     icone: "🌳", bonus: 1000,  message: "1 mois — Gazon Maître débloqué !" },
  { jours: 60,  label: "2 mois",     icone: "🏆", bonus: 2000,  message: "60 jours — Champion de la régularité !" },
  { jours: 100, label: "100 jours",  icone: "💎", bonus: 5000,  message: "100 jours — Légende MG360 !" },
  { jours: 365, label: "1 an",       icone: "👑", bonus: 10000, message: "1 an — Statut Légendaire à vie !" },
];

export function useStreak() {
  const { isHivernal, isTransition, streakFrequenceHeures } = useSaison();
  const modeHiver = isHivernal || isTransition;

  const [state, setState] = useState(() => getState());

  // Vérifie et met à jour le streak à chaque chargement
  useEffect(() => {
    const current = getState();
    const now = Date.now();

    if (!current.derniere_connexion) return;

    if (modeHiver) {
      // ── MODE HIVERNAL : 1 connexion/semaine suffit ──────────────────────
      if (!memeSemaine(current.derniere_connexion, now)) {
        // Streak protégé en hiver — on ne casse pas
        const newState = {
          ...current,
          protege_hiver: true,
          derniere_connexion: now,
        };
        saveState(newState);
        setState(newState);
      }
    } else {
      // ── MODE ACTIF : 1 connexion/jour requise ───────────────────────────
      if (memejour(current.derniere_connexion, now)) {
        // Déjà connecté aujourd'hui — rien à faire
        return;
      }

      if (etaitHier(current.derniere_connexion, now)) {
        // Connexion hier → streak continue
        const newActuel = current.actuel + 1;
        const newRecord = Math.max(newActuel, current.record);

        // Vérifier milestones
        const newMilestones = [...current.milestones_atteints];
        STREAK_MILESTONES.forEach(m => {
          if (newActuel >= m.jours && !newMilestones.includes(m.jours)) {
            newMilestones.push(m.jours);
          }
        });

        const newState = {
          ...current,
          actuel:       newActuel,
          record:       newRecord,
          derniere_connexion: now,
          protege_hiver: false,
          milestones_atteints: newMilestones,
        };
        saveState(newState);
        setState(newState);
      } else {
        // Plus d'un jour sans connexion → streak cassé
        const newState = {
          ...current,
          actuel: 1, // repart à 1
          derniere_connexion: now,
          protege_hiver: false,
        };
        saveState(newState);
        setState(newState);
      }
    }
  }, []); // eslint-disable-line

  // Enregistrer une connexion manuelle
  const enregistrerConnexion = useCallback(() => {
    const current = getState();
    const now = Date.now();

    if (current.derniere_connexion && memejour(current.derniere_connexion, now)) {
      return { nouveau: false, actuel: current.actuel };
    }

    let newActuel = current.actuel;

    if (modeHiver) {
      // Hiver : le streak ne monte pas mais est protégé
      newActuel = current.actuel;
    } else if (!current.derniere_connexion || !etaitHier(current.derniere_connexion, now)) {
      newActuel = current.actuel > 0 && !etaitHier(current.derniere_connexion, now)
        ? 1
        : current.actuel + 1;
    } else {
      newActuel = current.actuel + 1;
    }

    const newRecord = Math.max(newActuel, current.record);

    // Milestones débloqués
    const nouveauxMilestones = [];
    STREAK_MILESTONES.forEach(m => {
      if (newActuel >= m.jours && !current.milestones_atteints.includes(m.jours)) {
        nouveauxMilestones.push(m);
      }
    });

    const newState = {
      ...current,
      actuel: newActuel,
      record: newRecord,
      derniere_connexion: now,
      protege_hiver: modeHiver,
      milestones_atteints: [
        ...current.milestones_atteints,
        ...nouveauxMilestones.map(m => m.jours)
      ],
    };

    saveState(newState);
    setState(newState);

    return {
      nouveau: true,
      actuel: newActuel,
      record: newRecord,
      milestones: nouveauxMilestones,
    };
  }, [modeHiver]);

  // Streak en danger ? (mode actif — pas connecté aujourd'hui)
  const streakEnDanger = useCallback(() => {
    if (modeHiver || state.actuel === 0) return false;
    const now = Date.now();
    if (!state.derniere_connexion) return false;
    if (memejour(state.derniere_connexion, now)) return false;
    // En danger si pas connecté aujourd'hui et streak > 2
    return state.actuel >= 2;
  }, [modeHiver, state]);

  // Prochain milestone
  const prochainMilestone = STREAK_MILESTONES.find(
    m => m.jours > state.actuel
  ) || null;

  // Flamme du streak
  const flammeCouleur = state.actuel >= 100 ? "#7b1fa2"
    : state.actuel >= 30  ? "#f9a825"
    : state.actuel >= 7   ? "#e65100"
    : "#ef5350";

  return {
    actuel:            state.actuel,
    record:            state.record,
    enDanger:          streakEnDanger(),
    protege:           state.protege_hiver || modeHiver,
    modeHiver,
    milestones:        state.milestones_atteints,
    prochainMilestone,
    flammeCouleur,
    enregistrerConnexion,

    // Message selon le contexte
    message: modeHiver
      ? `🛡️ Streak protégé cet hiver — ${state.actuel} jours`
      : state.actuel === 0
        ? "🌱 Commencez votre streak aujourd'hui !"
        : `🔥 ${state.actuel} jour${state.actuel > 1 ? "s" : ""} de streak`,
  };
}
