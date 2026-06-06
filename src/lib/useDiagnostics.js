// src/lib/useDiagnostics.js
// ════════════════════════════════════════════════════════════════════════════
// HOOK DIAGNOSTICS — Source de vérité Supabase
// ════════════════════════════════════════════════════════════════════════════
// Objectif : garantir que les diagnostics photo sont identiques entre tous les
// appareils d'un même utilisateur (PC, mobile, tablette).
//
// Stratégie :
//   1. Au mount : lecture Supabase pour récupérer tous les diagnostics de l'user
//   2. Mise en cache localStorage en arrière-plan (filet de sécurité si Supabase HS)
//   3. Renvoie diagnostics triés par date décroissante (plus récent en premier)
//   4. Si Supabase HS : fallback sur cache localStorage
//
// La clé localStorage utilisée est `mg360_diagnostics` (nouveau naming Mongazon360).
// L'ancienne clé `gk_diagnostics` n'est plus lue ni écrite (coupure nette).
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

const CACHE_KEY = "mg360_diagnostics";

// ── Lecture du cache localStorage (fallback uniquement) ──────────────────────
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

// ── Écriture en cache localStorage (filet de sécurité) ──────────────────────
function writeCache(diagnostics) {
  try {
    // On limite le cache à 20 diagnostics pour éviter de saturer localStorage
    const slim = (diagnostics || []).slice(0, 20);
    localStorage.setItem(CACHE_KEY, JSON.stringify(slim));
  } catch (e) {
    console.warn("[MG360] writeCache diagnostics échec:", e?.message);
  }
}

// ── Normalisation : format Supabase → format attendu par lawnScore.js ────────
// Le format attendu par lawnScore est :
// { date: ISO string, analysis: { score_visuel, emoji, etat_general, problemes: [...] } }
function normalizeDiagnostic(row) {
  return {
    id:        row.id,
    user_id:   row.user_id,
    image_url: row.image_url,
    date:      row.created_at, // ISO string pour daysSinceISO()
    analysis: {
      score_visuel:    row.score_visuel,
      emoji:           emojiFromEtat(row.etat_general),
      etat_general:    row.etat_general,
      resume:          row.resume,
      problemes:       row.problemes || [],
      points_positifs: row.points_positifs || [],
      actions_urgentes: row.actions_urgentes || [],
    },
  };
}

// Map état général → emoji (au cas où Supabase n'a pas le champ)
function emojiFromEtat(etat) {
  const map = {
    "excellent": "🌟",
    "bon":       "✅",
    "moyen":     "⚠️",
    "mauvais":   "🔴",
    "critique":  "🚨",
  };
  return map[etat?.toLowerCase()] || "📸";
}

// ────────────────────────────────────────────────────────────────────────────
// Hook principal
// ────────────────────────────────────────────────────────────────────────────
export function useDiagnostics() {
  const { userId, isSignedIn } = useAuth();
  const [diagnostics, setDiagnostics] = useState(() => readCache());
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  useEffect(() => {
    if (!isSignedIn || !userId) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // ── Lecture Supabase (source de vérité) ──────────────────────────
        const { data, error: supaError } = await supabase
          .from("diagnostics")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (cancelled) return;

        if (supaError) {
          // Fallback : on garde le cache local affiché
          console.warn("[MG360] Diagnostics Supabase fetch error, fallback cache:", supaError.message);
          setError(supaError.message);
          setDiagnostics(readCache());
        } else {
          const normalized = (data || []).map(normalizeDiagnostic);
          setDiagnostics(normalized);
          writeCache(normalized); // alimente le cache pour fallback futur
          setError(null);
        }
      } catch (e) {
        if (cancelled) return;
        console.warn("[MG360] Diagnostics fetch exception, fallback cache:", e?.message);
        setError(e?.message);
        setDiagnostics(readCache());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isSignedIn, userId]);

  return {
    diagnostics,
    loading,
    error,
    // Accès rapide au plus récent (souvent utile pour lawnScore)
    latest: diagnostics?.[0] || null,
  };
}
