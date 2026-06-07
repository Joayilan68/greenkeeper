// src/lib/useClassement.js
// ════════════════════════════════════════════════════════════════════════════
// CLASSEMENT MONGAZON360 — LIGUES MENSUELLES (Phase 2 — Refactor Supabase)
// ════════════════════════════════════════════════════════════════════════════
// Source de vérité : table Supabase `classement` (1 ligne par user)
// Cache local : sessionStorage uniquement pour réactivité UI (filet de sécurité)
//
// Architecture HYBRIDE :
//   • Calcul du score affiché : CÔTÉ CLIENT (réactif, instantané)
//   • Stockage : SUPABASE (vérité, multi-device)
//   • Reset mensuel : POSTGRES SCHEDULED FUNCTION (cycle_mensuel_ligues — pg_cron)
//
// Bots côté client : 100% déterministes (seed depuis Supabase), donc identiques
// entre tous les appareils sans avoir à les stocker en DB.
//
// Garanties Phase 2 :
//   ✅ Cohérence multi-device : ligue actuelle, connexions du mois, score
//   ✅ Promotion/Relégation automatique le 1er de chaque mois (pg_cron côté serveur)
//   ✅ Reprise saison février : ligue conservée, GreenPoints totaux intacts
//   ✅ Pas de perte de données en cas de cache vidé navigateur
//   ✅ Tolérant aux pannes : fallback sessionStorage si Supabase HS
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";
import { useSaison } from "./useSaison";

const CACHE_KEY = "mg360_classement_cache"; // sessionStorage uniquement (réactivité)

// ── Définition des ligues ────────────────────────────────────────────────────
export const LIGUES = [
  { id:"semis",    label:"Semis",    icone:"🌱", couleur:"#81c784", couleurBg:"#e8f5e9", description:"Bienvenue dans le classement !", taille:30, scoreRange:[10,150]  },
  { id:"pousse",   label:"Pousse",   icone:"🌿", couleur:"#43a047", couleurBg:"#c8e6c9", description:"Tu progresses bien !",           taille:30, scoreRange:[80,280]  },
  { id:"gazon",    label:"Gazon",    icone:"🌳", couleur:"#2e7d32", couleurBg:"#a5d6a7", description:"Le niveau des vrais jardiniers !",taille:25, scoreRange:[150,450] },
  { id:"champion", label:"Champion", icone:"🏆", couleur:"#f9a825", couleurBg:"#fff9c4", description:"L'élite du gazon !",             taille:20, scoreRange:[300,700] },
  { id:"legende",  label:"Légende",  icone:"💎", couleur:"#7b1fa2", couleurBg:"#f3e5f5", description:"Le sommet absolu !",             taille:10, scoreRange:[500,1200]},
];

const PRENOMS = ["Thomas","Lucas","Emma","Léa","Nicolas","Julie","Maxime","Sophie","Pierre","Marie","Antoine","Laura","Julien","Camille","François","Céline","David","Isabelle","Romain","Nathalie","Florent","Aurélie","Sébastien","Virginie","Christophe","Sandrine","Guillaume","Valérie","Alexandre","Stéphanie"];

// ── Coefficient de complétude profil ─────────────────────────────────────────
export function getCoeffProfil(completion) {
  return Math.min(1, Math.max(0.40, (completion || 40) / 100));
}

// ── Calcul score mensuel ──────────────────────────────────────────────────────
export function calcScoreMensuel(gpDuMois, completion, joursConnexion) {
  const coeff = getCoeffProfil(completion);
  return Math.round((gpDuMois * coeff) + joursConnexion);
}

// ── Générateur pseudo-aléatoire déterministe (bots identiques multi-device) ──
function makeRand(seed) {
  let r = seed;
  return () => { r = (r * 1664525 + 1013904223) & 0xffffffff; return Math.abs(r) / 0xffffffff; };
}

// ── Génération des joueurs simulés (bots 🤖) — 100% déterministe ────────────
// Le `seed_mois` venant de Supabase garantit que tous les appareils voient les
// mêmes bots avec les mêmes scores. Les bots disparaîtront naturellement quand
// la ligue atteindra 100 users réels actifs (à gérer côté Postgres ultérieurement).
function genererJoueurs(ligueId, seed) {
  const ligue = LIGUES.find(l => l.id === ligueId);
  if (!ligue) return [];
  const rand = makeRand(seed);
  const [min, max] = ligue.scoreRange;
  const joueurs = [];
  for (let i = 0; i < ligue.taille - 1; i++) {
    const prenom    = PRENOMS[Math.floor(rand() * PRENOMS.length)];
    const score     = Math.max(0, Math.round(min + rand() * (max - min)));
    const isPaid    = rand() > 0.55;
    const createdAt = Date.now() - Math.floor(rand() * 365 * 86400000);
    joueurs.push({ id:`bot_${i}`, prenom, score, isUser:false, isBot:true, isPaid, createdAt });
  }
  return joueurs;
}

// ── Tri avec départage : score / Premium / ancienneté ────────────────────────
function trierClassement(joueurs) {
  return [...joueurs].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (!!b.isPaid !== !!a.isPaid) return b.isPaid ? 1 : -1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

// ── Helpers dates ─────────────────────────────────────────────────────────────
function debutMoisActuel() {
  const d = new Date(); d.setUTCHours(0,0,0,0); d.setUTCDate(1); return d.getTime();
}
function finMoisActuel() {
  const d = new Date(); d.setUTCHours(23,59,59,999); d.setUTCMonth(d.getUTCMonth()+1,0); return d.getTime();
}
function joursRestantsMois() { return Math.ceil((finMoisActuel() - Date.now()) / 86400000); }
function dateJourKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
}

// ── État par défaut (nouveau user, ou Supabase vide / hors-ligne) ────────────
function defaultState() {
  return {
    ligueActuelle:       "semis",
    connexionsDuMois:    [],
    historique_ligues:   [],
    seed_mois:           debutMoisActuel(),
    dernier_mois:        null,
    meilleur_classement: null,
    score_mensuel_final: 0,
    createdAt:           Date.now(),
  };
}

// ── Cache sessionStorage (réactivité UI) ─────────────────────────────────────
function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function writeCache(state) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch {}
}

// ── Sync vers Supabase (best-effort, debouncé côté caller) ───────────────────
async function syncToSupabase(userId, state) {
  if (!userId) return;
  try {
    await supabase.from("classement").upsert({
      user_id:              userId,
      ligue_actuelle:       state.ligueActuelle,
      connexions_du_mois:   state.connexionsDuMois,
      historique_ligues:    state.historique_ligues,
      seed_mois:            state.seed_mois,
      dernier_mois:         state.dernier_mois,
      meilleur_classement:  state.meilleur_classement,
      score_mensuel_final:  state.score_mensuel_final || 0,
    }, { onConflict: "user_id" });
  } catch (e) {
    console.warn("[MG360] classement sync échec (fallback cache):", e?.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export function useClassement(gpHistorique = [], profile = null, isPaid = false) {
  const { userId, isSignedIn } = useAuth();
  const { classementActif } = useSaison();
  const [state, setState] = useState(() => readCache() || defaultState());
  const [loaded, setLoaded] = useState(false);
  const lastSyncedScore = useRef(null);

  // ── 1. CHARGEMENT INITIAL DEPUIS SUPABASE ────────────────────────────────
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("classement")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn("[MG360] classement load error, fallback cache:", error.message);
          setLoaded(true);
          return;
        }

        if (data) {
          // ✅ Donnée existante dans Supabase → source de vérité
          const supaState = {
            ligueActuelle:       data.ligue_actuelle || "semis",
            connexionsDuMois:    data.connexions_du_mois || [],
            historique_ligues:   data.historique_ligues || [],
            seed_mois:           Number(data.seed_mois) || debutMoisActuel(),
            dernier_mois:        data.dernier_mois ? Number(data.dernier_mois) : null,
            meilleur_classement: data.meilleur_classement,
            score_mensuel_final: data.score_mensuel_final || 0,
            createdAt:           new Date(data.created_at).getTime(),
          };
          setState(supaState);
          writeCache(supaState);
        } else {
          // ⚪ Nouveau user → création initiale dans Supabase
          const initial = defaultState();
          await syncToSupabase(userId, initial);
          setState(initial);
          writeCache(initial);
        }
        setLoaded(true);
      } catch (e) {
        console.warn("[MG360] classement load exception:", e?.message);
        setLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [isSignedIn, userId]);

  // ── 2. CALCULS RÉACTIFS (côté client, instantané) ────────────────────────
  const debutMois = debutMoisActuel();
  const gpDuMois  = gpHistorique.filter(h => h.date >= debutMois).reduce((s, h) => s + (h.points || 0), 0);
  const completion     = profile?.profileCompletion || 40;
  const joursConnexion = (state.connexionsDuMois || []).length;
  const scoreUser      = calcScoreMensuel(gpDuMois, completion, joursConnexion);

  // ── 3. SYNC SCORE MENSUEL → SUPABASE (debouncé : seulement si change) ────
  // Le score_mensuel_final est utilisé par la fonction pg_cron du 1er du mois
  // pour calculer les promotions/relégations. Il doit donc rester à jour.
  useEffect(() => {
    if (!loaded || !userId) return;
    if (scoreUser === lastSyncedScore.current) return;

    const timer = setTimeout(() => {
      lastSyncedScore.current = scoreUser;
      const newState = { ...state, score_mensuel_final: scoreUser };
      syncToSupabase(userId, newState);
      writeCache(newState);
    }, 1500); // debounce 1.5s pour éviter spam d'écritures

    return () => clearTimeout(timer);
  }, [scoreUser, loaded, userId]); // eslint-disable-line

  // ── 4. ENREGISTRER CONNEXION DU JOUR ─────────────────────────────────────
  const enregistrerConnexionJour = useCallback(() => {
    if (!loaded) return;
    const key = dateJourKey();
    const connexions = state.connexionsDuMois || [];
    if (connexions.includes(key)) return;

    const newState = { ...state, connexionsDuMois: [...connexions, key] };
    setState(newState);
    writeCache(newState);
    syncToSupabase(userId, newState);
  }, [state, loaded, userId]);

  // ── 4b. AUTO-DÉCLENCHEMENT DE LA CONNEXION DU JOUR AU MOUNT ──────────────
  // Une fois les données chargées depuis Supabase, on enregistre automatiquement
  // la connexion du jour. Garantit que la tuile "connexions" affiche le bon nombre
  // sans devoir attendre une action explicite.
  useEffect(() => {
    if (!loaded || !classementActif) return;
    const key = dateJourKey();
    if ((state.connexionsDuMois || []).includes(key)) return;
    enregistrerConnexionJour();
  }, [loaded, classementActif]); // eslint-disable-line

  // ── 5. CALCUL DU CLASSEMENT AFFICHÉ (bots + user) ────────────────────────
  const ligueActuelle = LIGUES.find(l => l.id === state.ligueActuelle) || LIGUES[0];
  const bots          = genererJoueurs(state.ligueActuelle, state.seed_mois);
  const tousJoueurs   = trierClassement([
    ...bots,
    { id:"user", prenom:"Vous", score:scoreUser, isUser:true, isBot:false, isPaid, createdAt:state.createdAt },
  ]);

  const positionUser         = tousJoueurs.findIndex(j => j.isUser) + 1;
  const totalJoueurs         = tousJoueurs.length;
  const enZonePromotion      = positionUser <= Math.ceil(totalJoueurs * 0.50);
  const enZoneRetrogradation = positionUser > Math.floor(totalJoueurs * 0.75);
  const joursRestants        = joursRestantsMois();

  const messageClassement = !classementActif
    ? "😴 Classement en pause — reprend en février !"
    : enZonePromotion
      ? `🚀 Zone de promotion ! ${joursRestants} jour${joursRestants > 1 ? "s" : ""} restant${joursRestants > 1 ? "s" : ""}`
      : enZoneRetrogradation
        ? "⚠️ Zone de rétrogradation — remonte vite !"
        : `📊 ${positionUser}ème sur ${totalJoueurs} — continue !`;

  return {
    // Données ligue
    ligueActuelle, ligues: LIGUES, classementActif,
    classement: tousJoueurs, position: positionUser, totalJoueurs,

    // Scores
    scoreUser, gpDuMois,
    coeff: getCoeffProfil(completion),
    completion, joursConnexion,

    // États
    enZonePromotion, enZoneRetrogradation, joursRestants,
    meilleurClassement: state.meilleur_classement,
    historiqueLigues:   state.historique_ligues || [],

    // Actions
    enregistrerConnexionJour,

    // UI
    messageClassement,

    // Debug
    loaded,
  };
}
