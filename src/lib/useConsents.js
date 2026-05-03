// src/lib/useConsents.js
// ─────────────────────────────────────────────────────────────────────────────
// Source de vérité unique pour les consentements utilisateur
// Supabase (table user_consents) = source de vérité multi-appareil
// localStorage = cache uniquement pour CGU/confidentialité (obligations légales)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { supabase } from "./supabase";

const LOCAL_KEY   = "mg360_consents";
const LEGAL_KEYS  = ["cgu", "confidentialite"]; // backup localStorage obligatoire

const DEFAULT_CONSENTS = {
  cgu:             false,
  confidentialite: false,
  notifications:   false,
  marketing:       false,
  data_resale:     false,
  cookies:         false,
  push_active:     false, // au moins 1 rappel avec Push actif
  email_active:    false, // au moins 1 rappel avec Email actif
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadLocal() {
  try {
    const s = localStorage.getItem(LOCAL_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function saveLocal(c) {
  try {
    // Sauvegarder uniquement les champs légaux en localStorage
    const legal = {};
    LEGAL_KEYS.forEach(k => { if (c[k] !== undefined) legal[k] = c[k]; });
    const existing = loadLocal() || {};
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...existing, ...legal }));
  } catch {}
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useConsents() {
  const { userId, isSignedIn } = useAuth();
  const [consents, setConsents] = useState(() => ({
    ...DEFAULT_CONSENTS,
    ...(loadLocal() || {}), // cache local pour affichage instantané CGU
  }));
  const [loading, setLoading]   = useState(true);
  const [synced,  setSynced]    = useState(false);

  // ── Charger depuis Supabase au montage ──────────────────────────────────
  useEffect(() => {
    if (!isSignedIn || !userId) { setLoading(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_consents")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (!error && data) {
          const remote = {
            cgu:             data.cgu             ?? false,
            confidentialite: data.confidentialite ?? false,
            notifications:   data.notifications   ?? false,
            marketing:       data.marketing        ?? false,
            data_resale:     data.data_resale      ?? false,
            cookies:         data.cookies          ?? false,
            push_active:     data.push_active      ?? false,
            email_active:    data.email_active     ?? false,
          };
          setConsents(remote);
          saveLocal(remote); // mettre à jour le cache légal
        } else {
          // Pas encore de ligne → migrer depuis localStorage si possible
          const local = loadLocal();
          if (local) {
            const migrated = { ...DEFAULT_CONSENTS, ...local };
            setConsents(migrated);
            await supabase.from("user_consents").upsert(
              { user_id: userId, ...migrated, updated_at: new Date().toISOString() },
              { onConflict: "user_id" }
            );
          }
        }
      } catch {}
      finally { setLoading(false); setSynced(true); }
    })();
  }, [isSignedIn, userId]); // eslint-disable-line

  // ── Sauvegarder un consentement ──────────────────────────────────────────
  const updateConsent = useCallback(async (key, value) => {
    const updated = { ...consents, [key]: value };
    setConsents(updated);
    saveLocal(updated);

    if (!isSignedIn || !userId) return;
    try {
      await supabase.from("user_consents").upsert(
        { user_id: userId, [key]: value, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    } catch {}
  }, [consents, isSignedIn, userId]);

  // ── Sauvegarder plusieurs consentements en une fois ──────────────────────
  const updateConsents = useCallback(async (patch) => {
    const updated = { ...consents, ...patch };
    setConsents(updated);
    saveLocal(updated);

    if (!isSignedIn || !userId) return;
    try {
      await supabase.from("user_consents").upsert(
        { user_id: userId, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    } catch {}
  }, [consents, isSignedIn, userId]);

  // ── Sync push_active / email_active depuis les rappels ───────────────────
  // Appelé par useReminders après chaque changement de canal
  const syncFromReminders = useCallback(async (reminders) => {
    const pushActive  = Object.values(reminders).some(r => r.enabled && r.push);
    const emailActive = Object.values(reminders).some(r => r.enabled && r.email);

    const patch = {
      push_active:   pushActive,
      email_active:  emailActive,
      // Si aucun rappel push actif → désactiver notifications
      notifications: pushActive ? consents.notifications : false,
      // Si aucun rappel email actif → désactiver marketing
      marketing:     emailActive ? consents.marketing : false,
    };

    await updateConsents(patch);
  }, [consents, updateConsents]);

  // ── showPushBanner : doit-on afficher la tuile "Activez les alertes" ? ──
  const showPushBanner = synced && !loading && (
    typeof Notification !== "undefined"
      ? Notification.permission !== "granted" || !consents.push_active
      : !consents.push_active
  );

  return {
    consents,
    loading,
    synced,
    updateConsent,
    updateConsents,
    syncFromReminders,
    showPushBanner,
  };
}
