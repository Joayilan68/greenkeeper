// src/lib/useGreenPoints.js
// ─────────────────────────────────────────────────────────────────────────────
// Cache-first : calculs locaux instantanés + sync Supabase
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";
import { useSaison } from "./useSaison";

const KEY = "mg360_greenpoints";

// ── Règles de points ──────────────────────────────────────────────────────────
export const GP_REGLES = {
  connexion_quotidienne: { points: 10,  label: "Connexion du jour",                    icone: "🌿", plafond: { type: "jour",    max: 1 }, cooldown_jours: 0   },
  tonte:                 { points: 50,  label: "Tonte enregistrée",                    icone: "✂️", plafond: { type: "semaine", max: 2 }, cooldown_jours: 3   },
  arrosage:              { points: 20,  label: "Arrosage enregistré",                  icone: "💧", plafond: { type: "jour",    max: 1 }, cooldown_jours: 1   },
  engrais:               { points: 80,  label: "Engrais appliqué",                     icone: "🌱", plafond: { type: "mois",    max: 1 }, cooldown_jours: 30  },
  desherbage:            { points: 40,  label: "Désherbage effectué",                  icone: "🪴", plafond: { type: "semaine", max: 1 }, cooldown_jours: 14  },
  aeration:              { points: 100, label: "Aération réalisée",                    icone: "🌀", plafond: { type: "an",      max: 2 }, cooldown_jours: 90  },
  scarification:         { points: 100, label: "Scarification réalisée",               icone: "🔧", plafond: { type: "an",      max: 1 }, cooldown_jours: 365 },
  anti_mousse:           { points: 60,  label: "Traitement anti-mousse / fongicide",   icone: "🌿", plafond: { type: "an",      max: 2 }, cooldown_jours: 21  },
  semences:              { points: 80,  label: "Regarnissage / semis",                 icone: "🌾", plafond: { type: "an",      max: 2 }, cooldown_jours: 60  },
  partage_score:         { points: 75,  label: "Score partagé",                        icone: "📤", plafond: { type: "semaine", max: 1 }, cooldown_jours: 7   },
  diagnostic_photo:      { points: 100, label: "Diagnostic photo",                     icone: "📸", plafond: { type: "semaine", max: 1 }, cooldown_jours: 7   },
  profil_complet:        { points: 200, label: "Profil complété",                      icone: "👤", plafond: { type: "total",   max: 1 }, cooldown_jours: 0   },
  streak_7j:             { points: 200, label: "Streak 7 jours",                       icone: "🔥", plafond: { type: "semaine", max: 1 }, cooldown_jours: 7   },
  streak_30j:            { points: 1000,label: "Streak 30 jours",                      icone: "🔥", plafond: { type: "mois",    max: 1 }, cooldown_jours: 30  },
};

export const GP_PALIERS = [
  { id: "semis",    label: "Semis",    icone: "🌱", min: 0,     couleur: "#81c784" },
  { id: "pousse",   label: "Pousse",   icone: "🌿", min: 500,   couleur: "#43a047" },
  { id: "gazon",    label: "Gazon",    icone: "🌳", min: 2000,  couleur: "#2e7d32" },
  { id: "champion", label: "Champion", icone: "🏆", min: 6000,  couleur: "#f9a825" },
  { id: "legende",  label: "Légende",  icone: "💎", min: 15000, couleur: "#7b1fa2" },
];

export const GP_RECOMPENSES = [
  { id: "badge_expert",    label: "Badge Gazon Expert",       cout: 500,   type: "badge",      icone: "🏅" },
  { id: "titre_pro",       label: "Titre Pro du Gazon",       cout: 1000,  type: "titre",      icone: "🎖️" },
  { id: "theme_ete",       label: "Thème Été",                cout: 2000,  type: "cosmetique", icone: "☀️" },
  { id: "theme_automne",   label: "Thème Automne",            cout: 2000,  type: "cosmetique", icone: "🍂" },
  { id: "early_features",  label: "Accès Early Features",     cout: 5000,  type: "acces",      icone: "⭐" },
  { id: "rapport_pdf",     label: "Rapport PDF personnalisé", cout: 3000,  type: "contenu",    icone: "📄" },
  { id: "semaine_premium", label: "7 jours Premium offerts",  cout: 8000,  type: "premium",    icone: "🌿", max_par_an: 1 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getLocal() {
  try { return JSON.parse(localStorage.getItem(KEY)) || defaultState(); } catch { return defaultState(); }
}
function defaultState() {
  return { total: 0, historique: [], derniere_action: {}, recompenses_obtenues: [] };
}
function saveLocal(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
function maintenant() { return Date.now(); }
function debutJour()    { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); }
function debutSemaine() { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return d.getTime(); }
function debutMois()    { const d = new Date(); d.setHours(0,0,0,0); d.setDate(1); return d.getTime(); }
function debutAnnee()   { const d = new Date(); d.setHours(0,0,0,0); d.setMonth(0,1); return d.getTime(); }

function getDebutPeriode(type) {
  switch(type) {
    case "jour": return debutJour(); case "semaine": return debutSemaine();
    case "mois": return debutMois(); case "an":      return debutAnnee();
    default: return 0;
  }
}

function peutGagnerPoints(action, state) {
  const regle = GP_REGLES[action];
  if (!regle) return false;
  const { plafond, cooldown_jours } = regle;
  if (cooldown_jours > 0) {
    const derniere = [...state.historique].filter(h => h.action === action).sort((a,b)=>b.date-a.date)[0];
    if (derniere && (maintenant() - derniere.date) / 86400000 < cooldown_jours) return false;
  }
  if (plafond.type === "total") return state.historique.filter(h=>h.action===action).length < plafond.max;
  return state.historique.filter(h=>h.action===action && h.date>=getDebutPeriode(plafond.type)).length < plafond.max;
}

export function getPalier(total) {
  return [...GP_PALIERS].reverse().find(p => total >= p.min) || GP_PALIERS[0];
}
export function getProchaingPalier(total) {
  return GP_PALIERS.find(p => p.min > total) || null;
}

// ── Sync Supabase ─────────────────────────────────────────────────────────────
async function syncToSupabase(userId, state) {
  if (!userId) return;
  try {
    await supabase.from("greenpoints").upsert(
      {
        user_id:    userId,
        total:      state.total,
        historique: state.historique.slice(-200),
        recompenses: state.recompenses_obtenues,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  } catch (e) {
    console.warn("[MG360] greenpoints sync:", e.message);
  }
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useGreenPoints() {
  const { userId, isSignedIn } = useAuth();
  const { isHivernal, isTransition } = useSaison();
  const [state, setState] = useState(getLocal);

  // Sync Supabase → local au montage
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("greenpoints")
          .select("total, historique, recompenses")
          .eq("user_id", userId)
          .single();

        const local = getLocal();
        if (!error && data && data.total > 0) {
          // Supabase a des données → garder le total le plus élevé
          const remote = {
            total:                data.total || 0,
            historique:           data.historique || [],
            recompenses_obtenues: data.recompenses || [],
            derniere_action:      {},
          };
          const merged = remote.total >= local.total ? remote : local;
          setState(merged);
          saveLocal(merged);
          // Si local a plus de points → resync
          if (local.total > remote.total) syncToSupabase(userId, local);
        } else if (local.total > 0) {
          // Supabase vide mais localStorage a des données → migration initiale
          syncToSupabase(userId, local);
        }
      } catch {}
    })();
  }, [isSignedIn, userId]); // eslint-disable-line

  const gagnerPoints = useCallback((action) => {
    if ((isHivernal || isTransition) && action !== "connexion_quotidienne") {
      return { succes: false, raison: "hiver", points: 0 };
    }
    const regle = GP_REGLES[action];
    if (!regle) return { succes: false, raison: "action_inconnue", points: 0 };
    const current = getLocal();
    if (!peutGagnerPoints(action, current)) {
      return { succes: false, raison: "plafond_atteint", points: 0, label: regle.label };
    }
    const nouvelleEntree = { action, points: regle.points, date: maintenant(), label: regle.label, icone: regle.icone };
    const newState = {
      ...current,
      total:      current.total + regle.points,
      historique: [...current.historique, nouvelleEntree].slice(-200),
      derniere_action: { ...current.derniere_action, [action]: maintenant() },
    };
    saveLocal(newState);
    setState(newState);
    syncToSupabase(userId, newState);
    return { succes: true, points: regle.points, total: newState.total, label: regle.label, icone: regle.icone, palier: getPalier(newState.total) };
  }, [isHivernal, isTransition, userId]); // eslint-disable-line

  const depenser = useCallback((recompenseId) => {
    const recompense = GP_RECOMPENSES.find(r => r.id === recompenseId);
    if (!recompense) return { succes: false };
    const current = getLocal();
    if (current.total < recompense.cout) return { succes: false, raison: "points_insuffisants" };
    if (recompense.max_par_an) {
      const cetteAnnee = current.recompenses_obtenues.filter(r => r.id===recompenseId && r.date>=debutAnnee()).length;
      if (cetteAnnee >= recompense.max_par_an) return { succes: false, raison: "limite_annuelle" };
    }
    const newState = {
      ...current,
      total: current.total - recompense.cout,
      recompenses_obtenues: [...current.recompenses_obtenues, { id: recompenseId, date: maintenant(), label: recompense.label }],
    };
    saveLocal(newState);
    setState(newState);
    syncToSupabase(userId, newState);
    return { succes: true, recompense, total: newState.total };
  }, [userId]); // eslint-disable-line

  const palierActuel   = getPalier(state.total);
  const prochainPalier = getProchaingPalier(state.total);
  const progressPalier = prochainPalier
    ? Math.round(((state.total - palierActuel.min) / (prochainPalier.min - palierActuel.min)) * 100)
    : 100;

  return {
    total: state.total, historique: state.historique,
    palier: palierActuel, prochainPalier, progressPalier,
    gagnerPoints, depenser,
    peutGagner: (action) => peutGagnerPoints(action, state),
    recompensesObtenues: state.recompenses_obtenues,
  };
}
