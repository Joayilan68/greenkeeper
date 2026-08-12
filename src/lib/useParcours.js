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

// ── Helper CLIENT : phase courante d'un parcours actif, sans appel serveur ──
// Mêmes seuils que parcoursEngine.currentPhase (P-3), pour un usage synchrone
// dans l'UI (ex. Today, pour masquer les actions incompatibles).
// Retourne { phase (0-5), jour, nom } ou null.
const PHASES_SEUILS = [
  { phase: 1, min: -7,  max: 0,   nom: "Préparation",   arrosage: "Sol prêt, pas encore d'arrosage spécifique." },
  { phase: 2, min: 0,   max: 0,   nom: "Semis",         arrosage: "Premier arrosage copieux après le semis (contact graine/sol)." },
  { phase: 3, min: 1,   max: 21,  nom: "Germination",   arrosage: "Quotidien léger — garder le sol humide en surface sans détremper (phase critique)." },
  { phase: 4, min: 21,  max: 45,  nom: "Levée",         arrosage: "Arrosages progressivement espacés, un peu plus abondants à chaque fois." },
  { phase: 5, min: 45,  max: 60,  nom: "Consolidation", arrosage: "Retour au cycle d'arrosage normal." },
];
export function phaseParcours(parcours) {
  if (!parcours || parcours.statut !== "actif" || !parcours.date_semis) return null;
  const j0 = new Date(parcours.date_semis);
  if (isNaN(j0.getTime())) return null;
  const jour = Math.floor((Date.now() - j0.getTime()) / 86400000);
  if (jour > 60) return { phase: 5, jour, nom: "Terminé", termine: true, arrosage: "Retour au cycle d'arrosage normal." };
  if (jour < -7) return { phase: 0, jour, nom: "Fenêtre", arrosage: null };
  // Chercher la phase (la plus avancée sur chevauchement de bornes)
  let ph = { phase: 0, nom: "Fenêtre", arrosage: null };
  for (const p of PHASES_SEUILS) {
    if (jour >= p.min && jour <= p.max) ph = p;
  }
  return { phase: ph.phase, jour, nom: ph.nom, arrosage: ph.arrosage };
}

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

  // ── Démarrer un parcours en attente → passage en 'actif' (date_semis = aujourd'hui) ──
  const demarrerParcours = useCallback(async () => {
    if (!parcours || parcours.statut !== "en_attente_fenetre") return null;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("parcours")
      .update({ statut: "actif", date_semis: today, phase_courante: 2, updated_at: new Date().toISOString() })
      .eq("id", parcours.id)
      .select()
      .single();
    if (error) throw new Error("Démarrage: " + error.message);
    setParcours(data);
    return data;
  }, [parcours]);

  // ── Valider (cocher) un jalon ponctuel → stocké dans etapes_validees.jalons ──
  // Cocher = suivi/gamification ; ne change PAS la phase (gouvernée par le temps).
  const validerJalon = useCallback(async (cleJalon) => {
    if (!parcours) return;
    const today = new Date().toISOString().slice(0, 10);
    const ev = (parcours.etapes_validees && typeof parcours.etapes_validees === "object" && !Array.isArray(parcours.etapes_validees))
      ? parcours.etapes_validees : {};
    const jalons = { ...(ev.jalons || {}) };
    // Toggle : si déjà coché, on décoche ; sinon on coche avec la date du jour
    if (jalons[cleJalon]) delete jalons[cleJalon];
    else jalons[cleJalon] = today;
    const newEv = { ...ev, jalons };
    const { data, error } = await supabase
      .from("parcours")
      .update({ etapes_validees: newEv, updated_at: new Date().toISOString() })
      .eq("id", parcours.id)
      .select()
      .single();
    if (error) throw new Error("Validation jalon: " + error.message);
    setParcours(data);
    return data;
  }, [parcours]);

  // ── Appel moteur : phase courante d'un parcours actif (currentPhase) ────────
  const analyserPhase = useCallback(async ({ type, dateSemis }) => {
    const res = await fetch("/api/send?type=parcours-current", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parcoursType: type, dateSemis }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Analyse de phase impossible");
    return data.state; // { phase, cle, nom, jour, action, arrosage, blocages, termine }
  }, []);

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
    analyserPhase,      // appel moteur currentPhase (parcours actif)
    creerParcours,      // crée (et archive l'ancien si besoin)
    demarrerParcours,   // en_attente_fenetre → actif
    validerJalon,       // coche/décoche un jalon ponctuel
    abandonnerParcours, // archive le courant
    aUnParcoursActif: !!parcours,
  };
}
