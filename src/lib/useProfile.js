// src/lib/useProfile.js
import { useState, useEffect } from "react";

const KEY_NEW = "mg360_profile_v1";
const KEY_OLD = "gk_profile_v1"; // rétrocompat anciens utilisateurs

// ── Chargement avec migration automatique ─────────────────────────────────────
function loadProfile() {
  try {
    // 1. Essayer la nouvelle clé
    const fresh = localStorage.getItem(KEY_NEW);
    if (fresh) return JSON.parse(fresh);

    // 2. Fallback ancienne clé → migrer silencieusement
    const legacy = localStorage.getItem(KEY_OLD);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      localStorage.setItem(KEY_NEW, legacy);   // copier vers nouvelle clé
      localStorage.removeItem(KEY_OLD);         // supprimer l'ancienne
      return parsed;
    }

    return null;
  } catch { return null; }
}

// ── Géocodage silencieux en arrière-plan ──────────────────────────────────────
async function verifierVilleEnLigne(profile, saveProfile) {
  if (!profile?.ville || profile.cityVerified || !navigator.onLine) return;

  try {
    const res  = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(profile.ville)}&count=1&language=fr&format=json`
    );
    const data = await res.json();
    const result = data.results?.[0];

    if (result) {
      // Ville trouvée → mise à jour silencieuse lat/lon + flag
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
      // Ville introuvable → on marque pour alerter l'utilisateur
      saveProfile({ ...profile, cityVerified: false, cityNotFound: true });
    }
  } catch {
    // Réseau coupé pendant la vérification → on réessaiera au prochain lancement
  }
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useProfile() {
  const [profile, setProfile] = useState(loadProfile);

  const saveProfile = (p) => {
    setProfile(p);
    try {
      localStorage.setItem(KEY_NEW, JSON.stringify(p));
    } catch {}
  };

  // Vérification ville au montage si nécessaire
  useEffect(() => {
    if (!profile) return;
    verifierVilleEnLigne(profile, saveProfile);
  }, []); // eslint-disable-line

  // Re-vérification quand l'utilisateur revient en ligne
  useEffect(() => {
    const handleOnline = () => verifierVilleEnLigne(profile, saveProfile);
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [profile]);

  return { profile, saveProfile };
}
