// src/lib/useProfile.js
// ─────────────────────────────────────────────────────────────────────────────
// Supabase = source de vérité
// localStorage = cache lecture instantanée uniquement
// Au merge : Supabase est prioritaire, les résidus synthétiques sont purgés
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

const KEY_NEW = "mg360_profile_v1";
const KEY_OLD = "gk_profile_v1";

// ── Champs résiduels à purger — gazon synthétique supprimé de l'app ──────────
const CHAMPS_RESIDUELS = ["isSynthetique", "diagnosticPhoto", "lastDiagnosticDate"];

function purgerResidus(p) {
  if (!p) return p;
  const clean = { ...p };
  // Purger les flags synthétiques
  CHAMPS_RESIDUELS.forEach(k => delete clean[k]);
  // Si pelouse = "synthetique" → réinitialiser (gazon non supporté)
  if (clean.pelouse === "synthetique") delete clean.pelouse;
  // Si gazons[] contient "synthetique" → le retirer
  if (Array.isArray(clean.gazons)) {
    clean.gazons = clean.gazons.filter(g => g !== "synthetique");
    if (clean.gazons.length === 0) delete clean.gazons;
  }
  return clean;
}

function loadLocal() {
  try {
    const fresh = localStorage.getItem(KEY_NEW);
    if (fresh) return purgerResidus(JSON.parse(fresh));
    const legacy = localStorage.getItem(KEY_OLD);
    if (legacy) {
      const parsed = purgerResidus(JSON.parse(legacy));
      localStorage.setItem(KEY_NEW, JSON.stringify(parsed));
      localStorage.removeItem(KEY_OLD);
      return parsed;
    }
    return null;
  } catch { return null; }
}

function saveLocal(p) {
  try { localStorage.setItem(KEY_NEW, JSON.stringify(purgerResidus(p))); } catch {}
}

// ── Géocodage silencieux ──────────────────────────────────────────────────────
async function verifierVilleEnLigne(profile, saveProfile) {
  if (!profile?.ville || profile.cityVerified || !navigator.onLine) return;
  try {
    const res  = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(profile.ville)}&count=1&language=fr&format=json`
    );
    const data = await res.json();
    const result = data.results?.[0];
    if (result) {
      const updated = {
        ...profile,
        ville:        `${result.name}${result.admin1 ? `, ${result.admin1}` : ""}, ${result.country}`,
        lat:          result.latitude,
        lon:          result.longitude,
        cityVerified: true,
      };
      saveProfile(updated);
      localStorage.setItem("mg360_location_name", updated.ville);
      localStorage.setItem("mg360_lat",           String(result.latitude));
      localStorage.setItem("mg360_lon",           String(result.longitude));
    } else {
      saveProfile({ ...profile, cityVerified: false, cityNotFound: true });
    }
  } catch {}
}

// ── Helper démarrage programme Rénover/Créer ─────────────────────────────────
// Appeler depuis Setup.jsx ou onboarding quand l'objectif est sélectionné
// profile.date_debut_programme = new Date().toISOString()
// saveProfile({ ...profile, date_debut_programme: new Date().toISOString() })

// ── Hook principal ────────────────────────────────────────────────────────────
export function useProfile() {
  const { userId, isSignedIn } = useAuth();
  const [profile, setProfile]  = useState(loadLocal); // cache instantané
  const [synced, setSynced]    = useState(false);

  // ── Sync Supabase → local au montage ──────────────────────────────────────
  useEffect(() => {
    if (!isSignedIn || !userId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("data")
          .eq("user_id", userId)
          .single();

        const local = loadLocal();

        if (!error && data?.data && Object.keys(data.data).length > 0) {
          // ✅ Supabase prioritaire — purger les résidus des deux côtés
          const remote = purgerResidus(data.data);
          // Seules les coordonnées GPS vérifiées localement sont conservées
          // car elles peuvent être plus fraîches que Supabase
          const merged = {
            ...remote,
            ...(local?.cityVerified && local?.lat && local?.lon
              ? { lat: local.lat, lon: local.lon, ville: local.ville, cityVerified: true }
              : {}
            ),
          };
          const clean = purgerResidus(merged);
          setProfile(clean);
          saveLocal(clean);
          // Remonter le profil purgé vers Supabase si des résidus existaient
          if (JSON.stringify(remote) !== JSON.stringify(data.data)) {
            supabase.from("profiles").upsert(
              { user_id: userId, data: clean, updated_at: new Date().toISOString() },
              { onConflict: "user_id" }
            ).catch(() => {});
          }
        } else if (local && Object.keys(local).length > 0) {
          // Supabase vide → migration initiale depuis localStorage (purgé)
          const clean = purgerResidus(local);
          setProfile(clean);
          saveLocal(clean);
          supabase.from("profiles").upsert(
            { user_id: userId, data: clean, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          ).catch(() => {});
        }
        setSynced(true);
      } catch {
        setSynced(true); // pas bloquant
      }
    })();
  }, [isSignedIn, userId]); // eslint-disable-line

  // ── saveProfile : local immédiat + Supabase async ─────────────────────────
  const saveProfile = (p) => {
    const clean = purgerResidus(p);
    setProfile(clean);
    saveLocal(clean);

    if (isSignedIn && userId) {
      supabase.from("profiles").upsert(
        { user_id: userId, data: clean, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      ).then(({ error }) => {
        if (error) console.warn("[MG360] profiles upsert:", error.message);
      });
    }
  };

  // Géocodage ville
  useEffect(() => {
    if (!profile || !synced) return;
    verifierVilleEnLigne(profile, saveProfile);
  }, [synced]); // eslint-disable-line

  useEffect(() => {
    const handleOnline = () => verifierVilleEnLigne(profile, saveProfile);
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [profile]); // eslint-disable-line

  return { profile, saveProfile, synced };
}
