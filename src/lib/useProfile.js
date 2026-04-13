// src/lib/useProfile.js
// ─────────────────────────────────────────────────────────────────────────────
// Cache-first : localStorage pour la réactivité immédiate
//               Supabase comme source de vérité persistante
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

const KEY_NEW = "mg360_profile_v1";
const KEY_OLD = "gk_profile_v1";

// ── Chargement local (cache instantané) ──────────────────────────────────────
function loadLocal() {
  try {
    const fresh = localStorage.getItem(KEY_NEW);
    if (fresh) return JSON.parse(fresh);
    const legacy = localStorage.getItem(KEY_OLD);
    if (legacy) {
      localStorage.setItem(KEY_NEW, legacy);
      localStorage.removeItem(KEY_OLD);
      return JSON.parse(legacy);
    }
    return null;
  } catch { return null; }
}

function saveLocal(p) {
  try { localStorage.setItem(KEY_NEW, JSON.stringify(p)); } catch {}
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

        if (!error && data?.data) {
          // Supabase a une version → l'utiliser si plus récente
          const remote = data.data;
          const local  = loadLocal();
          // Préférer Supabase (source de vérité) sauf si local a cityVerified récent
          const merged = { ...remote, ...(local?.cityVerified ? { lat: local.lat, lon: local.lon, ville: local.ville, cityVerified: true } : {}) };
          setProfile(merged);
          saveLocal(merged);
        }
        setSynced(true);
      } catch {
        setSynced(true); // pas bloquant
      }
    })();
  }, [isSignedIn, userId]); // eslint-disable-line

  // ── saveProfile : local immédiat + Supabase async ─────────────────────────
  const saveProfile = (p) => {
    setProfile(p);
    saveLocal(p);

    if (isSignedIn && userId) {
      supabase.from("profiles").upsert(
        { user_id: userId, data: p, updated_at: new Date().toISOString() },
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
