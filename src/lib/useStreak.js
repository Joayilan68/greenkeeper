// src/lib/useStreak.js
// ─────────────────────────────────────────────────────────────────────────────
// Cache-first : localStorage pour réactivité + Supabase pour persistance
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";
import { useSaison } from "./useSaison";

const KEY = "gk_streak";

function defaultState() {
  return { actuel: 0, record: 0, derniere_connexion: null, protege_hiver: false, milestones_atteints: [] };
}
function getLocal() {
  try { return JSON.parse(localStorage.getItem(KEY)) || defaultState(); } catch { return defaultState(); }
}
function saveLocal(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

function memejour(ts1, ts2) {
  const d1 = new Date(ts1), d2 = new Date(ts2);
  return d1.getFullYear()===d2.getFullYear() && d1.getMonth()===d2.getMonth() && d1.getDate()===d2.getDate();
}
function etaitHier(ts1, ts2) {
  const d1 = new Date(ts1), d2 = new Date(ts2);
  d1.setHours(0,0,0,0); d2.setHours(0,0,0,0);
  return d2.getTime() - d1.getTime() === 86400000;
}
function memeSemaine(ts1, ts2) {
  const d1 = new Date(ts1), d2 = new Date(ts2);
  d1.setHours(0,0,0,0); d2.setHours(0,0,0,0);
  return Math.abs(d2.getTime() - d1.getTime()) < 7 * 86400000;
}

export const STREAK_MILESTONES = [
  { jours: 3,   label: "3 jours",    icone: "🌱", bonus: 50,    message: "Premier pas — continue !" },
  { jours: 7,   label: "1 semaine",  icone: "🔥", bonus: 200,   message: "Semaine verte — tu es lancé !" },
  { jours: 14,  label: "2 semaines", icone: "🌿", bonus: 400,   message: "2 semaines — l'habitude est prise !" },
  { jours: 30,  label: "1 mois",     icone: "🌳", bonus: 1000,  message: "1 mois — Gazon Maître débloqué !" },
  { jours: 60,  label: "2 mois",     icone: "🏆", bonus: 2000,  message: "60 jours — Champion de la régularité !" },
  { jours: 100, label: "100 jours",  icone: "💎", bonus: 5000,  message: "100 jours — Légende MG360 !" },
  { jours: 365, label: "1 an",       icone: "👑", bonus: 10000, message: "1 an — Statut Légendaire à vie !" },
];

async function syncToSupabase(userId, state) {
  if (!userId) return;
  try {
    await supabase.from("streaks").upsert(
      {
        user_id:            userId,
        actuel:             state.actuel,
        record:             state.record,
        derniere_connexion: state.derniere_connexion,
        protege_hiver:      state.protege_hiver,
        milestones:         state.milestones_atteints,
        updated_at:         new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  } catch (e) {
    console.warn("[MG360] streaks sync:", e.message);
  }
}

export function useStreak() {
  const { userId, isSignedIn } = useAuth();
  const { isHivernal, isTransition } = useSaison();
  const modeHiver = isHivernal || isTransition;
  const [state, setState] = useState(getLocal);

  // ── Sync Supabase → local au montage ──────────────────────────────────────
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("streaks")
          .select("actuel, record, derniere_connexion, protege_hiver, milestones")
          .eq("user_id", userId)
          .single();

        if (!error && data) {
          const remote = {
            actuel:             data.actuel || 0,
            record:             data.record || 0,
            derniere_connexion: data.derniere_connexion,
            protege_hiver:      data.protege_hiver || false,
            milestones_atteints: data.milestones || [],
          };
          // Garder le streak le plus élevé
          const local = getLocal();
          const merged = remote.actuel >= local.actuel ? remote : local;
          setState(merged);
          saveLocal(merged);
        }
      } catch {}
    })();
  }, [isSignedIn, userId]); // eslint-disable-line

  // ── Calcul streak au chargement ───────────────────────────────────────────
  useEffect(() => {
    const current = getLocal();
    const now = Date.now();
    if (!current.derniere_connexion) return;

    if (modeHiver) {
      if (!memeSemaine(current.derniere_connexion, now)) {
        const newState = { ...current, protege_hiver: true, derniere_connexion: now };
        saveLocal(newState); setState(newState);
        syncToSupabase(userId, newState);
      }
    } else {
      if (memejour(current.derniere_connexion, now)) return;
      if (etaitHier(current.derniere_connexion, now)) {
        const newActuel = current.actuel + 1;
        const newRecord = Math.max(newActuel, current.record);
        const newMilestones = [...current.milestones_atteints];
        STREAK_MILESTONES.forEach(m => {
          if (newActuel >= m.jours && !newMilestones.includes(m.jours)) newMilestones.push(m.jours);
        });
        const newState = { ...current, actuel: newActuel, record: newRecord, derniere_connexion: now, protege_hiver: false, milestones_atteints: newMilestones };
        saveLocal(newState); setState(newState);
        syncToSupabase(userId, newState);
      } else {
        const newState = { ...current, actuel: 1, derniere_connexion: now, protege_hiver: false };
        saveLocal(newState); setState(newState);
        syncToSupabase(userId, newState);
      }
    }
  }, []); // eslint-disable-line

  // ── enregistrerConnexion ──────────────────────────────────────────────────
  const enregistrerConnexion = useCallback(() => {
    const current = getLocal();
    const now = Date.now();
    if (current.derniere_connexion && memejour(current.derniere_connexion, now)) {
      return { nouveau: false, actuel: current.actuel };
    }
    let newActuel = current.actuel;
    if (modeHiver) {
      newActuel = current.actuel;
    } else if (!current.derniere_connexion || !etaitHier(current.derniere_connexion, now)) {
      newActuel = current.actuel > 0 && !etaitHier(current.derniere_connexion, now) ? 1 : current.actuel + 1;
    } else {
      newActuel = current.actuel + 1;
    }
    const newRecord = Math.max(newActuel, current.record);
    const nouveauxMilestones = [];
    STREAK_MILESTONES.forEach(m => {
      if (newActuel >= m.jours && !current.milestones_atteints.includes(m.jours)) nouveauxMilestones.push(m);
    });
    const newState = {
      ...current, actuel: newActuel, record: newRecord,
      derniere_connexion: now, protege_hiver: modeHiver,
      milestones_atteints: [...current.milestones_atteints, ...nouveauxMilestones.map(m=>m.jours)],
    };
    saveLocal(newState); setState(newState);
    syncToSupabase(userId, newState);
    return { nouveau: true, actuel: newActuel, record: newRecord, milestones: nouveauxMilestones };
  }, [modeHiver, userId]); // eslint-disable-line

  const streakEnDanger = useCallback(() => {
    if (modeHiver || state.actuel === 0 || !state.derniere_connexion) return false;
    if (memejour(state.derniere_connexion, Date.now())) return false;
    return state.actuel >= 2;
  }, [modeHiver, state]);

  const prochainMilestone = STREAK_MILESTONES.find(m => m.jours > state.actuel) || null;
  const flammeCouleur = state.actuel >= 100 ? "#7b1fa2" : state.actuel >= 30 ? "#f9a825" : state.actuel >= 7 ? "#e65100" : "#ef5350";

  return {
    actuel: state.actuel, record: state.record,
    enDanger: streakEnDanger(), protege: state.protege_hiver || modeHiver,
    modeHiver, milestones: state.milestones_atteints,
    prochainMilestone, flammeCouleur,
    enregistrerConnexion,
    message: modeHiver
      ? `🛡️ Streak protégé cet hiver — ${state.actuel} jours`
      : state.actuel === 0 ? "🌱 Commencez votre streak aujourd'hui !"
      : `🔥 ${state.actuel} jour${state.actuel > 1 ? "s" : ""} de streak`,
  };
}
