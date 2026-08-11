// src/lib/useParcours.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook du PARCOURS (Création / Regarnissage)
// - Lit/écrit la table `parcours` via Supabase (RLS parcours_own = user_id)
// - Appelle le moteur via l'endpoint /api/send?type=parcours-* (analyse, échéancier, phase)
// Règle métier : UN SEUL parcours actif/en_attente par user (garanti par l'index
// unique partiel en base). Le remplacement archive l'ancien en statut 'abandonne'.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

const STATUTS_ACTIFS = ["actif", "en_attente_fenetre"];

export function useParcours() {
  const { userId, isSignedIn } = useAuth();
  const [parcours, setParcours] = useState(null);   // le parcours actif courant (ou null)
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // ── Charger le parcours actif du user ──────────────────────────────────────
  const reload = useCallback(async () => {
    if (!isSignedIn || !userId) { setParcours(null); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("parcours")
        .select("*")
        .eq("user_id", userId)
        .in("statut", STATUTS_ACTIFS)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      setParcours(data && data.length ? data[0] : null);
      setError(null);
    } catch (e) {
      console.warn("[MG360] useParcours reload:", e.message);
      setError(e.message);
      setParcours(null);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, userId]);

  useEffect(() => { reload(); }, [reload]);

  // ── Appel moteur : analyse de fenêtre (canSow) ─────────────────────────────
  // profile fournit lat/lon ; soilTemp/month/dateSemis optionnels selon dispo.
  const analyserFenetre = useCallback(async ({ lat, lon, zoneKey, soilTemp, month, dateSemis, soilTempSource }) => {
    const res = await fetch("/api/send?type=parcours-cansow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lon, zoneKey, soilTemp, month, dateSemis, soilTempSource }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Analyse de fenêtre impossible");
    return data.verdict; // { verdict, zone, raison, prochaineFenetre?, peutForcer }
  }, []);

  // ── Créer un parcours ──────────────────────────────────────────────────────
  // type: "creation" | "regarnissage" ; champs issus du profil + choix user.
  // statutInitial: "actif" (feu vert / laissez-passer) ou "en_attente_fenetre" (bloqué → RDV).
  const creerParcours = useCallback(async ({ type, surface_m2, type_gazon, date_prevue, date_semis, statut = "actif" }) => {
    if (!isSignedIn || !userId) throw new Error("Non connecté");

    // 1. Archiver tout parcours actif/en_attente existant → 'abandonne'
    const { error: archErr } = await supabase
      .from("parcours")
      .update({ statut: "abandonne", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("statut", STATUTS_ACTIFS);
    if (archErr) throw new Error("Archivage ancien parcours: " + archErr.message);

    // 2. Créer le nouveau
    const row = {
      user_id: userId,
      type: type === "regarnissage" ? "regarnissage" : "creation",
      surface_m2: surface_m2 ?? null,
      type_gazon: type_gazon ?? null,
      date_prevue: date_prevue ?? null,
      date_semis: date_semis ?? null,
      phase_courante: 0,
      statut,
      etapes_validees: [],
    };
    const { data, error } = await supabase
      .from("parcours")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error("Création parcours: " + error.message);

    setParcours(data);
    return data;
  }, [isSignedIn, userId]);

  // ── Abandonner le parcours courant (sans en créer un nouveau) ──────────────
  const abandonnerParcours = useCallback(async () => {
    if (!parcours) return;
    const { error } = await supabase
      .from("parcours")
      .update({ statut: "abandonne", updated_at: new Date().toISOString() })
      .eq("id", parcours.id);
    if (error) throw new Error("Abandon: " + error.message);
    setParcours(null);
  }, [parcours]);

  return {
    parcours,           // parcours actif courant (ou null)
    loading,
    error,
    reload,
    analyserFenetre,    // appel moteur canSow
    creerParcours,      // crée (et archive l'ancien si besoin)
    abandonnerParcours, // archive le courant
    aUnParcoursActif: !!parcours,
  };
}
